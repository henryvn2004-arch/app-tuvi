// lib/og/font.ts — NGUỒN DUY NHẤT nạp font cho 4 route OG (Satori/ImageResponse).
//
// 🔴 VÌ SAO CÓ FILE NÀY: prod đo được 108 lượt / 30 người trong 7 ngày ném
//    "No fonts are loaded. At least one font is required to calculate the layout."
//    trên /api/og và /api/og/laso (Vercel runtime errors).
//
// 🔑 CĂN NGUYÊN KHÔNG PHẢI REGEX — đã loại trừ: /api/og gửi UA cũ (MSIE) và dò
//    đúng `.ttf`, tức UA và regex KHỚP nhau hoàn hảo, mà vẫn ném. Chỗ hỏng nằm ở
//    nhánh `const fonts = fontData ? [...] : []` mà cả 4 route đều chép: hễ lượt
//    fetch ra Google Fonts hỏng (mạng edge chớp, rate-limit, timeout) là mảng font
//    RỖNG, và Satori luôn ném đúng câu trên khi không có font nào.
//    ⇒ Nới regex chỉ giảm TẦN SUẤT, không bịt được lỗi. Chốt chặn thật là:
//       nạp hỏng ⇒ ĐỪNG gọi Satori, trả ảnh tĩnh (xem `ogFallbackRedirect`).
//
// ⚠️ CẤM cache giá trị null: /api/og/social trước đây ghi `fontCache[w] = null` khi
//    hỏng ⇒ MỘT lượt mạng chớp là edge isolate đó KHÔNG BAO GIỜ có font nữa, mọi
//    lượt sau đều 500 cho tới khi isolate bị thu hồi. Chỉ cache khi THÀNH CÔNG.

export type OgFontWeight = 400 | 700;

const fontCache = new Map<OgFontWeight, ArrayBuffer>();

// Hai User-Agent CỐ Ý khác nhau: Google Fonts trả định dạng theo UA (UA hiện đại
// → woff2, UA cũ → ttf). Thử lần lượt nên một bên đổi hành vi vẫn còn đường kia.
const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
];

// Satori đọc được cả ba định dạng ⇒ nhận hết, đừng ghim một cái.
const FONT_URL_RE = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.(?:woff2|ttf|otf))\)/;

const FETCH_TIMEOUT_MS = 3000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

/** Nạp Be Vietnam Pro theo độ đậm. Trả null khi không nạp được — KHÔNG ném. */
export async function loadOgFont(weight: OgFontWeight): Promise<ArrayBuffer | null> {
  const cached = fontCache.get(weight);
  if (cached) return cached;

  for (const ua of UA_LIST) {
    try {
      const css = await fetchWithTimeout(
        `https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&subset=vietnamese`,
        { headers: { 'User-Agent': ua } },
      ).then((r) => r.text());

      const m = css.match(FONT_URL_RE);
      if (!m) continue; // UA này trả định dạng lạ → thử UA kia

      const buf = await fetchWithTimeout(m[1]).then((r) => r.arrayBuffer());
      if (!buf || buf.byteLength === 0) continue;

      fontCache.set(weight, buf); // chỉ cache khi THÀNH CÔNG
      return buf;
    } catch {
      // nuốt rồi thử UA kế tiếp; hết UA thì trả null cho phía gọi quyết định
    }
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
export async function loadOgFonts(weights: OgFontWeight[]): Promise<SatoriFont[]> {
  const loaded = await Promise.all(weights.map((w) => loadOgFont(w)));
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
