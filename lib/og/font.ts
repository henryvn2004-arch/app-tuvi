// lib/og/font.ts — NGUỒN DUY NHẤT nạp font cho 4 route OG (Satori/ImageResponse).
//
// 🔴 LỊCH SỬ HAI VÒNG CHẨN, ĐỌC TRƯỚC KHI SỬA:
//    Vòng 1 (#557) đo prod thấy 108 lượt/tuần ném "No fonts are loaded…" trên
//    /api/og và /api/og/laso. Tôi kết luận nguyên nhân là nhánh `: []` (fetch
//    Google Fonts hỏng ⇒ mảng font rỗng) và NỚI regex nhận cả `woff2`.
//    ⇒ SAI, và bản vá đó đẻ ra lỗi MỚI ngay khi deploy:
//       "Unsupported OpenType signature wOF2" trên CẢ BỐN route.
//
// 🔑 CĂN NGUYÊN THẬT — đo bằng cách hỏi thẳng Google Fonts với từng User-Agent:
//    | UA gửi đi            | Google trả về                       | Satori |
//    |----------------------|-------------------------------------|--------|
//    | Chrome hiện đại      | …/xxx.woff2                         | ❌ ném |
//    | MSIE (UA cũ)         | …/l/font?kit=… (EOT, KHÔNG có đuôi) | ❌      |
//    | KHÔNG gửi UA         | …/xxx.ttf                           | ✅      |
//    ⇒ Satori CHỈ đọc được TTF/OTF. Mọi UA mà 4 route từng gửi đều KHÔNG ra TTF:
//      UA hiện đại ra woff2 (ném Unsupported), UA cũ ra URL KHÔNG CÓ ĐUÔI nên
//      regex `\.ttf` trượt ⇒ mảng rỗng ⇒ đúng câu "No fonts are loaded" của 108
//      lượt kia. Tức chẩn đoán vòng 1 nhìn nhầm triệu chứng của cùng một gốc.
//
// ✅ CÁCH VÁ: TỰ HOST file TTF trong `public/fonts/` và nạp qua CÙNG ORIGIN.
//    Bỏ hẳn Google Fonts khỏi đường chính — hành vi của họ đổi theo UA là thứ
//    mình không kiểm được, và đó chính là chỗ đã hỏng hai lần.
//
// 🔑 CHỐT CHẶN THẬT LÀ CHỮ KÝ NHỊ PHÂN, KHÔNG PHẢI ĐUÔI FILE: `looksLikeSfnt`
//    đọc 4 byte đầu. Đuôi `.ttf` không chứng minh nội dung là TTF (Google từng
//    trả EOT qua một URL không đuôi), còn chữ ký thì có. Nhờ nó, đường dự phòng
//    Google KHÔNG THỂ nhét woff2/EOT vào Satori dù regex có lỏng tới đâu.
//
// ⚠️ CẤM cache giá trị null: /api/og/social trước đây ghi `fontCache[w] = null`
//    khi hỏng ⇒ MỘT lượt mạng chớp là edge isolate đó KHÔNG BAO GIỜ có font nữa.
//    Chỉ cache khi THÀNH CÔNG.

export type OgFontWeight = 400 | 700;

const fontCache = new Map<OgFontWeight, ArrayBuffer>();

const FETCH_TIMEOUT_MS = 3000;

/**
 * Satori/OpenType chỉ nhận sfnt: TTF (`\x00\x01\x00\x00`, `true`, `ttcf`) và
 * OTF (`OTTO`). Từ chối `wOF2`/`wOFF`/EOT ngay tại đây thay vì để Satori ném.
 */
function looksLikeSfnt(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const b = new Uint8Array(buf, 0, 4);
  const tag = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (tag === 'OTTO' || tag === 'true' || tag === 'ttcf') return true;
  return b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00;
}

async function fetchBuf(url: string, init?: RequestInit): Promise<ArrayBuffer | null> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return buf.byteLength > 0 ? buf : null;
}

/** Đường CHÍNH: file nằm trong `public/fonts/`, cùng origin, không phụ thuộc ai. */
async function loadSelfHosted(weight: OgFontWeight, origin: string): Promise<ArrayBuffer | null> {
  try {
    const buf = await fetchBuf(new URL(`/fonts/be-vietnam-pro-${weight}.ttf`, origin).toString());
    return buf && looksLikeSfnt(buf) ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Đường DỰ PHÒNG: chỉ chạy khi file tự host không tới được (deploy hụt asset).
 * CỐ Ý không gửi User-Agent — đo được đó là cách DUY NHẤT Google trả `.ttf`.
 */
async function loadFromGoogle(weight: OgFontWeight): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      `https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&subset=vietnamese`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const css = await res.text();
    const m = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.(?:ttf|otf))\)/);
    if (!m) return null;
    const buf = await fetchBuf(m[1]);
    return buf && looksLikeSfnt(buf) ? buf : null;
  } catch {
    return null;
  }
}

/** Nạp Be Vietnam Pro theo độ đậm. Trả null khi không nạp được — KHÔNG ném. */
export async function loadOgFont(weight: OgFontWeight, origin: string): Promise<ArrayBuffer | null> {
  const cached = fontCache.get(weight);
  if (cached) return cached;

  const buf = (await loadSelfHosted(weight, origin)) ?? (await loadFromGoogle(weight));
  if (buf) {
    fontCache.set(weight, buf); // chỉ cache khi THÀNH CÔNG
    return buf;
  }
  console.warn(`[og-font] không nạp được Be Vietnam Pro ${weight} — sẽ trả ảnh tĩnh`);
  return null;
}

export type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: OgFontWeight;
  style: 'normal';
};

/** Dựng mảng font cho ImageResponse. Mảng RỖNG = phải đi đường `ogFallbackRedirect`. */
export async function loadOgFonts(weights: OgFontWeight[], req: Request): Promise<SatoriFont[]> {
  const origin = new URL(req.url).origin;
  const loaded = await Promise.all(weights.map((w) => loadOgFont(w, origin)));
  return weights.flatMap((w, i) => {
    const data = loaded[i];
    return data ? [{ name: 'BeVN', data, weight: w, style: 'normal' as const }] : [];
  });
}

/**
 * Không có font nào ⇒ ĐỪNG gọi Satori (nó sẽ ném 500 và mạng xã hội không có
 * preview NÀO). Trả 302 về ảnh thương hiệu tĩnh — vẫn ra một tấm ảnh.
 * 🔑 Cache NGẮN (5 phút): lượt hỏng chỉ là nhất thời, đừng để CDN ghim ảnh tĩnh lâu.
 */
export function ogFallbackRedirect(req: Request): Response {
  const url = new URL('/seal.webp', new URL(req.url).origin);
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), 'Cache-Control': 'public, max-age=300' },
  });
}
