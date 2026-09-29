// lib/ban-tin.ts
// ============================================================
// BẢN TIN KINH TẾ – ĐỜI SỐNG HẰNG NGÀY cho thầy (Henry 2026-09-29).
//
// 🔴 Vì sao cần: kiến thức của model dừng ở mốc cắt dữ liệu huấn luyện — nó
// không biết giá vàng, lãi suất, thị trường nhà đất TUẦN NÀY, và lúc bí dễ bịa
// một con số "nghe hợp lý". Câu "năm nay có nên mua nhà?" cần bối cảnh thật.
//
// Cách làm: MỖI SÁNG một cron (`/api/cron/ban-tin`) gọi Gemini KÈM Google Search
// (grounding) tóm 6–8 dòng, lưu vào `ban_tin_ngay`. Rail chat chỉ ĐỌC bản đã lưu và
// chèn vào CUỐI tin user (không đụng system ⇒ prompt cache không vỡ) khi câu hỏi
// dính tiền bạc / công việc / nhà đất.
//
// 🔴 KHÔNG fallback sang provider khác khi tạo bản tin: Opus/Kimi không tra mạng ⇒
// "tóm tin hôm nay" từ trí nhớ = bịa tin. Gemini lỗi thì GIỮ bản hôm trước
// (`docBanTin` đọc bản mới nhất trong `HAN_NGAY` ngày), không ghi đè.
//
// Chi phí (đo 2026-09-29, giá tra ai.google.dev/gemini-api/docs/pricing):
// grounding tính theo TỪNG truy vấn tìm kiếm model chạy, 5.000 lượt/tháng miễn
// phí (chung mọi Gemini 3.x) ⇒ ~10 truy vấn/ngày là $0; token ~8,5k đ/tháng;
// chèn vào chat ~14k đ/tháng (trần: mọi lượt). Tổng ~20–25k đ/tháng.
// Chỉ lấy KINH TẾ – ĐỜI SỐNG, không chính trị: thầy tử vi bàn chính sự vừa lệch
// vai vừa có rủi ro.
// ============================================================

import { GEMINI_MODEL } from '@/lib/agent/providers/gemini';
import { logLlmUsage } from '@/lib/agent/usage';
import { chuanHoaDauThanh } from '@/lib/vn-text';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Bản tin cũ hơn bấy nhiêu ngày thì thôi không chèn (thà không có còn hơn tin cũ). */
const HAN_NGAY = 3;
const TRAN_KY_TU = 2500;

const sbHeaders = () => ({ apikey: SB_KEY || '', Authorization: `Bearer ${SB_KEY || ''}`, 'Content-Type': 'application/json' });

/** Ngày hôm nay giờ VN dạng YYYY-MM-DD. */
export function homNayVN(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

const PROMPT = (ngay: string) => `Hôm nay là ${ngay.split('-').reverse().join('/')}. Dùng Google Search, tổng hợp BỐI CẢNH KINH TẾ – ĐỜI SỐNG Việt Nam mới nhất (ưu tiên 7 ngày gần đây) để một thầy tử vi khuyên khách sát thực tế.

Chọn 6–8 mục trong các mảng: giá vàng (SJC, nhẫn) · lãi suất tiết kiệm/cho vay · tỷ giá USD · thị trường nhà đất · chứng khoán (VN-Index) · giá xăng · việc làm, lương, thị trường lao động · tiêu dùng, buôn bán nhỏ.

Luật:
- Mỗi mục MỘT dòng bắt đầu bằng "- ", tối đa 30 từ, có con số và mốc ngày nếu có.
- CHỈ viết điều có trong kết quả tìm kiếm; không chắc thì bỏ mục đó, không đoán.
- KHÔNG chính trị, nhân sự lãnh đạo, đối ngoại, tội phạm, tai nạn.
- Không lời dẫn, không kết luận, không nêu tên báo.`;

interface KetQuaTao {
  noiDung: string;
  nguon: { uri: string; title: string }[];
  soTruyVan: number;
}

/** Gọi Gemini + Google Search. Ném lỗi nếu không ra bản dùng được — caller GIỮ bản cũ. */
export async function taoBanTin(ngay = homNayVN()): Promise<KetQuaTao> {
  if (!GEMINI_KEY) throw new Error('ban-tin: thiếu GEMINI_API_KEY');
  const t0 = Date.now();
  const r = await fetch(`${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT(ngay) }] }],
      tools: [{ google_search: {} }],
      // Trần RỘNG có chủ ý: Gemini 3.x vẫn "nghĩ" và token nghĩ ăn CHUNG trần này — đo
      // 2026-09-29 với trần 1500: nghĩ 1.443 token, chữ còn 53 ⇒ bản tin cụt giữa câu
      // (finishReason=MAX_TOKENS). Cùng họ bẫy "max_tokens KHÔNG phải trần cho phần CHỮ".
      generationConfig: { maxOutputTokens: 8000, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`ban-tin: gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const c = j?.candidates?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = ((c?.content?.parts as any[] | undefined) || []).map((p) => p?.text || '').join('').trim();
  const u = j?.usageMetadata || {};
  void logLlmUsage(
    'ban-tin',
    GEMINI_MODEL,
    {
      input_tokens: u.promptTokenCount || 0,
      output_tokens: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0),
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    Date.now() - t0,
  );
  if (c?.finishReason === 'MAX_TOKENS') throw new Error(`ban-tin: bị cắt ở trần token (nghĩ ${u.thoughtsTokenCount ?? 0})`);
  const dong = text
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.startsWith('- ') && l.length > 4);
  // Không grounding (0 truy vấn) = model viết từ trí nhớ ⇒ không dùng được.
  const truyVan: string[] = c?.groundingMetadata?.webSearchQueries || [];
  if (dong.length < 3) throw new Error(`ban-tin: chỉ ra ${dong.length} dòng hợp lệ`);
  if (!truyVan.length) throw new Error('ban-tin: model không tra Google (0 truy vấn) — bỏ, không lưu tin từ trí nhớ');
  const nguon = ((c?.groundingMetadata?.groundingChunks as { web?: { uri?: string; title?: string } }[] | undefined) || [])
    .map((g) => ({ uri: String(g.web?.uri || ''), title: String(g.web?.title || '') }))
    .filter((g) => g.uri)
    .slice(0, 20);
  return { noiDung: dong.join('\n').slice(0, TRAN_KY_TU), nguon, soTruyVan: truyVan.length };
}

/** Lưu (ghi đè bản cùng ngày). Trả false khi lỗi. */
export async function luuBanTin(ngay: string, kq: KetQuaTao): Promise<boolean> {
  if (!SB_URL || !SB_KEY) return false;
  const res = await fetch(`${SB_URL}/rest/v1/ban_tin_ngay`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ngay, noi_dung: kq.noiDung, nguon: kq.nguon, so_truy_van: kq.soTruyVan }),
  });
  if (!res.ok) console.error('[ban-tin] lưu lỗi', res.status, await res.text().catch(() => ''));
  return res.ok;
}

// Đọc: nhớ trong process 10 phút — mỗi lượt chat không cần một GET Supabase.
let nho: { luc: number; ban: { ngay: string; noiDung: string } | null } | null = null;
const NHO_MS = 10 * 60_000;

export async function docBanTin(now = new Date()): Promise<{ ngay: string; noiDung: string } | null> {
  if (nho && now.getTime() - nho.luc < NHO_MS) return nho.ban;
  let ban: { ngay: string; noiDung: string } | null = null;
  if (SB_URL && SB_KEY) {
    try {
      const tu = homNayVN(new Date(now.getTime() - HAN_NGAY * 24 * 3600_000));
      const res = await fetch(
        `${SB_URL}/rest/v1/ban_tin_ngay?ngay=gte.${tu}&select=ngay,noi_dung&order=ngay.desc&limit=1`,
        { headers: sbHeaders(), cache: 'no-store' },
      );
      if (res.ok) {
        const r = ((await res.json()) as { ngay: string; noi_dung: string }[])[0];
        if (r?.noi_dung) ban = { ngay: r.ngay, noiDung: r.noi_dung };
      } else console.error('[ban-tin] đọc lỗi', res.status);
    } catch (e) {
      console.error('[ban-tin] đọc lỗi mạng', e);
    }
  }
  nho = { luc: now.getTime(), ban };
  return ban;
}

// Câu hỏi nào cần bối cảnh: chủ đề tiền / việc / nhà đất (cacChuDe) hoặc cụm kinh tế.
const CHU_DE_KINH_TE = ['tai-chinh', 'su-nghiep', 'nha-dat'];
const norm = (x: string) => chuanHoaDauThanh(String(x || '').toLowerCase().normalize('NFC'));
const CUM_KINH_TE = [
  'kinh tế', 'giá vàng', 'mua vàng', 'lãi suất', 'tỷ giá', 'đầu tư', 'chứng khoán', 'cổ phiếu', 'bất động sản',
  'mua nhà', 'mua đất', 'lạm phát', 'thị trường', 'kinh doanh', 'buôn bán', 'mở quán', 'khởi nghiệp', 'việc làm',
  'thất nghiệp', 'xin việc', 'tăng lương', 'giá xăng', 'vay ngân hàng', 'gửi tiết kiệm',
].map(norm);

export function canBanTin(cauHoi: string, chuDe: string[] = []): boolean {
  if (chuDe.some((c) => CHU_DE_KINH_TE.includes(c))) return true;
  const q = norm(cauHoi);
  return CUM_KINH_TE.some((c) => q.includes(c));
}

/** Khối chèn vào CUỐI tin user, hoặc '' (câu không liên quan / chưa có bản tin). */
export async function khoiBanTin(cauHoi: string, chuDe: string[] = []): Promise<string> {
  if (!canBanTin(cauHoi, chuDe)) return '';
  const b = await docBanTin();
  if (!b) return '';
  const ngay = b.ngay.split('-').reverse().slice(0, 2).join('/');
  return (
    `[BỐI CẢNH KINH TẾ – ĐỜI SỐNG (tổng hợp ${ngay}, có thể trễ vài ngày). Dùng khi hợp câu hỏi để lời khuyên sát thực tế; ` +
    `KHÔNG đọc lại như bản tin, KHÔNG thay dữ liệu lá số, không bàn chính trị, không bịa số ngoài danh sách này:\n${b.noiDung}]`
  );
}
