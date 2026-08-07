// lib/marketing/content-pack.ts
// ============================================================
// V4 (track Viral Loop) — "mồi phân phối". Viral là bộ KHUẾCH ĐẠI, không phải
// nguồn: 80 visit/ngày thì vòng lặp V2 không tự khởi động, phải có người đẩy
// lượt đầu. Cron tuần gom 5 chân dung đáng đăng nhất tuần rồi nhờ LLM viết
// sẵn script TikTok 30–60 giây cho từng cái, gửi Telegram admin. Henry đăng
// tay — phần này CHỈ soạn sẵn chất liệu, KHÔNG tự đăng đi đâu.
//
// NGUỒN DỮ LIỆU = `shared_results`, CÓ CHỦ ĐÍCH, vì hai lẽ trùng nhau:
//  1. Riêng tư: đây là những kết quả mà CHÍNH CHỦ đã bấm chia sẻ, tức đã tự
//     công khai. Bảng `past_life_portraits`/`spouse_portraits` chứa cả những
//     lượt vẽ riêng tư chưa ai cho phép đem đăng — không đụng tới.
//  2. Chất liệu: `blocks` của bản chia sẻ lưu TRỌN phần chữ (tên nhân vật,
//     danh xưng, mô tả, 5 hồi, Lời Kết), trong khi 2 bảng portrait chỉ giữ
//     vài cột meta. Kho được phép đăng cũng chính là kho giàu nhất.
//
// Xếp hạng theo `view_count` — số người THẬT đã mở link, chứ không phải máy
// tự chấm ảnh nào đẹp. Không có tín hiệu nào nói được "đẹp"; nói mình xếp
// theo lượt xem thì Henry biết đúng cái mình đang đọc.
// ============================================================

import { llmText } from '@/lib/llm/complete';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const SITE = 'https://www.tuviminhbao.com';
/** Chỉ 2 tool chân dung — V4 là mồi cho ĐÚNG vòng lặp viral của chúng. */
const PORTRAIT_TOOLS = ['chan-dung-tien-kiep', 'chan-dung-vo-chong'];
const TOOL_LABEL: Record<string, string> = {
  'chan-dung-tien-kiep': 'Chân Dung Tiền Kiếp',
  'chan-dung-vo-chong': 'Chân Dung Vợ Chồng',
};

/** Chất liệu đưa cho LLM — cắt ngắn để 5 mục không thổi prompt lên quá cỡ. */
const EXCERPT_MAX = 700;

interface ShareRow {
  id: string;
  tool_id: string;
  title: string | null;
  image_url: string | null;
  text_content: string | null;
  blocks: { header?: string; image?: string; text?: string }[] | null;
  view_count: number | null;
  created_at: string;
}

export interface PackItem {
  shareId: string;
  url: string;
  toolId: string;
  toolLabel: string;
  title: string;
  imageUrl: string | null;
  views: number;
  createdAt: string;
  excerpt: string;
}

function excerptFrom(row: ShareRow): string {
  const parts: string[] = [];
  for (const b of row.blocks || []) {
    const t = (b.text || '').trim();
    if (t) parts.push((b.header ? b.header + ': ' : '') + t);
  }
  if (!parts.length && row.text_content) parts.push(row.text_content.trim());
  const joined = parts.join('\n\n').replace(/\s+\n/g, '\n').trim();
  return joined.length > EXCERPT_MAX ? joined.slice(0, EXCERPT_MAX).replace(/\s*\S+$/, '') + '…' : joined;
}

/**
 * Gom các bản chia sẻ công khai của 2 tool chân dung trong `days` ngày gần đây,
 * xếp theo lượt xem giảm dần. Trả mảng RỖNG (không ném lỗi) khi chưa có gì —
 * "tuần này chưa ai chia sẻ" là một kết quả hợp lệ, không phải sự cố.
 */
export async function collectPackItems(days = 7, limit = 5): Promise<PackItem[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const qs =
    `?tool_id=in.(${PORTRAIT_TOOLS.join(',')})` +
    `&revoked=eq.false` +
    `&created_at=gte.${since}` +
    `&select=id,tool_id,title,image_url,text_content,blocks,view_count,created_at` +
    `&order=view_count.desc,created_at.desc&limit=${limit}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shared_results${qs}`, { cache: 'no-store', headers: SB_HEADERS });
  if (!res.ok) throw new Error(`shared_results: ${await res.text()}`);
  const rows = (await res.json()) as ShareRow[];

  return rows.map((r) => ({
    shareId: r.id,
    url: `${SITE}/ket-qua/${r.id}`,
    toolId: r.tool_id,
    toolLabel: TOOL_LABEL[r.tool_id] || r.tool_id,
    title: (r.title || '').trim() || 'Kết quả Luận Đường',
    imageUrl: r.image_url,
    views: r.view_count || 0,
    createdAt: r.created_at,
    excerpt: excerptFrom(r),
  }));
}

const SYSTEM_PROMPT = `Bạn viết kịch bản video ngắn (TikTok/Reels/Shorts) cho tuviminhbao.com — app Tử Vi Đẩu Số của người Việt.
Bạn nhận danh sách các kết quả chân dung mà người dùng đã tự chia sẻ công khai. Với MỖI mục, viết 1 kịch bản 30–60 giây.

Định dạng MỖI mục (đúng thứ tự, không thêm mục lạ):
━━━ <số>. <tên tool> — <tiêu đề kết quả>
🔗 <link>
🎣 HOOK (0–3s): 1–2 câu nói thẳng thứ gây tò mò nhất. Người xem lướt qua trong 1 giây — câu đầu phải đánh trúng ngay, tuyệt đối không mở bài vòng vo kiểu "hôm nay mình sẽ...".
🎬 THÂN (3–45s): 3–5 gạch đầu dòng, mỗi dòng là 1 câu thoại đọc thành tiếng được. Ghi rõ chỗ nào nên để ảnh chân dung xuất hiện.
🎯 CHỐT (45–60s): 1 câu kêu gọi tự nhiên, dẫn về việc tự thử lá số của mình.
#️⃣ 5 hashtag tiếng Việt, cách nhau bằng dấu cách.

LUẬT CỨNG:
- CHỈ dùng chi tiết CÓ trong dữ liệu được đưa. TUYỆT ĐỐI không bịa thêm tên riêng, sự kiện, con số, hay chi tiết đời nhân vật.
- KHÔNG hứa hẹn bói toán chính xác, không nói "vận mệnh của bạn chắc chắn là...". Đây là phác hoạ từ lá số, giữ đúng giọng đó.
- KHÔNG nhắc tới người dùng cụ thể nào, không nêu ngày sinh, không nói "của một khách hàng".
- Tiếng Việt đời thường, nói được thành tiếng. Tránh văn viết trang trọng, tránh thuật ngữ tử vi nặng trong phần HOOK.
- Mỗi kịch bản là một góc kể KHÁC nhau; không lặp lại cùng một công thức mở đầu.

Sau tất cả các mục, kết bằng đúng 2 dòng:
📌 GỢI Ý SEED: 1 câu gợi ý cách mồi ở 3–5 group Facebook tử vi/tarot (đăng gì, tránh gì để không bị coi là spam).
⏱️ Nhắc: đăng tay, mỗi ngày 1 kịch bản, 10–15 phút.`;

/**
 * Dựng nguyên văn bản pack để gửi Telegram. Không có mục nào thì trả lời
 * THẲNG là chưa có gì và chỉ ra việc cần làm, thay vì nhờ LLM viết vo cho có.
 */
export async function generateContentPackText(days = 7, limit = 5): Promise<string> {
  const items = await collectPackItems(days, limit);
  if (!items.length) {
    return (
      `Tuần qua chưa có bản chân dung nào được chia sẻ công khai, nên chưa có chất liệu để soạn kịch bản.\n\n` +
      `Pack này chỉ lấy từ những kết quả mà chính chủ đã bấm Chia sẻ (đã tự công khai) — cố ý không đụng vào các lượt vẽ riêng tư.\n\n` +
      `Muốn có pack tuần sau: vào /app/chan-dung-tien-kiep hoặc /app/chan-dung-vo-chong, vẽ vài lá rồi bấm Chia sẻ.`
    );
  }

  const payload = items.map((it, i) => ({
    stt: i + 1,
    tool: it.toolLabel,
    tieu_de: it.title,
    link: it.url,
    luot_xem: it.views,
    noi_dung: it.excerpt,
  }));

  const body = await llmText({
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(payload),
    maxTokens: 3000,
  });

  const header =
    `${items.length} bản được chia sẻ nhiều lượt xem nhất ${days} ngày qua ` +
    `(xếp theo lượt mở link, không phải máy chấm ảnh đẹp).\n\n`;
  return header + body;
}
