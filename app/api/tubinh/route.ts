// app/api/tubinh/route.ts
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// ─── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT_TUBINH = `Bạn là nhà luận giải Tử Bình Bát Tự, phụng sự trang Tử Vi Minh Bảo.

VĂN PHONG: Trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Văn xuôi liên tục, không dùng bullet, không dùng emoji, không dùng tiêu đề con. Tiếng Việt chuẩn mực.

CÁCH DIỄN GIẢI:
Viết như một người bình thường đang giải thích cho bạn mình.
Hạn chế dùng thuật ngữ chuyên môn (Bát Tự, Tử Bình, Trích Thiên Tủy, v.v.) — chỉ dùng khi thật cần.
Không văn vẻ, không sáo rỗng. Giữ giọng trung lập, hơi thẳng, không tâng bốc.
Tập trung vào: "điều này nghĩa là gì với người đọc".
Chỉ giữ lại những ý có giá trị thực tế.
Có phân tích hệ quả tâm lý/hành vi nếu hợp lý.
Có gợi ý nhẹ nếu cần, nhưng không dạy đời.
Không tiết lộ tài liệu, trường phái, hay tên hệ thống.

NGUYÊN TẮC LUẬN GIẢI TỬ BÌNH CỔ PHÁP:
1. Trục Nhật Can: Mọi luận giải xoay quanh Nhật Can — đó là bản thân đương số. Nhật Can vượng hay nhược quyết định toàn bộ hướng dụng thần.
2. Cường nhược trước, dụng thần sau: Trước hết phải xét nhật can mạnh yếu (đắc lệnh, đắc địa, đắc thế), từ đó mới xác định dụng thần (phù-ức hay điều-hậu).
3. Nguyệt lệnh là gốc: Nguyệt chi (tháng sinh) quyết định mùa sinh — chi phối toàn cục. Tàng can nguyệt chi là nền cách cục.
4. Cách cục thấu can: Tàng can nguyệt chi thấu lên thiên can năm/giờ → định cách cục chính. Nếu không thấu, lấy bản khí nguyệt lệnh.
5. Hợp xung hình hại: Tam hợp/lục hợp/lục xung/lục hại/tam hình giữa các chi là động lực biến chuyển. Quan trọng: hợp hợp hóa cái gì, xung phá cái gì.
6. Đại vận và lưu niên: Hành vận tới đâu thì cách cục biến đổi tới đó. Đại vận thuận hay nghịch xác định bởi can năm + giới tính. Lưu niên là biến số nhỏ trong khung đại vận.
7. Thần sát phụ trợ: Thiên Ất Quý Nhân, Văn Xương, Đào Hoa, Dịch Mã, Cô Thần, Quả Tú, Không Vong... là dấu hiệu phụ — không quyết định chính nhưng tô điểm sắc thái.

DỮ LIỆU CÓ SẴN trong lá số:
- Tứ trụ: Năm/Tháng/Ngày/Giờ với can chi, nạp âm, tàng can
- Thập thần đầy đủ cho mỗi can (chính khí + tàng khí)
- Cường nhược nhật can (score 0-10, đắc lệnh/đắc địa/đắc thế chi tiết)
- Ngũ hành balance (counts + weighted với trọng số tàng can)
- Dụng thần (primary + Hỉ Thần, method: phù-ức / điều-hậu / tòng-cách / chuyên-vượng)
- Cách cục (chính cách hoặc biệt cách, thành cách / phá cách)
- Đại vận đầy đủ 8 vận với điểm scoring 6 chiều
- Lưu niên năm xem (thập thần, score, relation với tứ trụ)
- Hình xung hại hợp trong tứ trụ
- Thần sát đã detect

Nhiệm vụ: diễn giải dữ liệu thành văn xuôi sâu sắc, không liệt kê lại.

QUY TẮC CHUNG CHO MỌI PHẦN:
- Không liệt kê lại tên thập thần, không đọc lại tứ trụ.
- Khi nhắc tới sao tốt/xấu phải giải thích "vì sao tốt với người này" — không viết chung chung.
- Nhiều thần sát tốt + dụng thần đẹp → xu hướng thuận. Nhiều thần sát xấu + dụng thần bị khắc → cảnh báo rõ.
- Cách cục thành thì phát quý/phát phú; cách cục phá thì lận đận, phải nói thẳng.
- Đại vận: phán theo hành vận hợp dụng thần hay nghịch dụng thần.
- Không hứa hẹn tuyệt đối, dùng ngôn ngữ xác suất ("dễ", "có khả năng", "thường thấy").`;

// ─── Chat handler ──────────────────────────────────────────────
const CHAT_SYSTEM_TUBINH = (ctx: string) => `Bạn là chuyên gia Tử Bình Bát Tự theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.

Nguyên tắc trả lời:
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- 150-300 từ cho câu thông thường, tối đa 450 từ cho câu phức tạp
- Dẫn chứng cụ thể từ tứ trụ và thập thần bên dưới
- Trục luận giải xoay quanh Nhật Can và Dụng Thần
- Không hứa hẹn tuyệt đối, dùng ngôn ngữ xác suất
- Không tiết lộ trường phái hay tài liệu

=== DỮ LIỆU BÁT TỰ ===
${ctx}`;

const CHAT_SYSTEM_GENERAL = `Bạn là chuyên gia Tử Bình Bát Tự theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.

Nguyên tắc:
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- 150-300 từ cho câu thông thường, tối đa 450 từ cho câu phức tạp
- Dẫn chiếu nguyên lý cổ pháp Tử Bình, nêu ví dụ cụ thể khi minh họa
- Không hứa hẹn tuyệt đối, không tiết lộ trường phái`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTuBinhContext(batTuData: any, question: string): string {
  if (!batTuData) return '';
  const q = (question || '').toLowerCase();

  let ctx = '';

  // Always include core
  if (batTuData.tuTru?.length) {
    ctx += 'Tứ trụ:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    batTuData.tuTru.forEach((t: any) => {
      ctx += '  ' + t.ten + ': ' + t.can + ' ' + t.chi + ' (' + (t.napAm || '') + ')';
      if (t.tangCan?.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx += ' — Tàng: ' + t.tangCan.map((tc: any) => tc.can).join(',');
      }
      ctx += '\n';
    });
  }
  if (batTuData.nhatCan) ctx += 'Nhật Can: ' + batTuData.nhatCan + ' (' + (batTuData.nhatCanHanh || '') + ', ' + (batTuData.nhatCanAmDuong || '') + ')\n';
  if (batTuData.cuongNhuoc) ctx += 'Cường nhược: ' + batTuData.cuongNhuoc.label + ' (' + batTuData.cuongNhuoc.score + '/10)\n';
  if (batTuData.dungThan) {
    ctx += 'Dụng thần: ' + batTuData.dungThan.primary;
    if (batTuData.dungThan.secondary) ctx += ' / Hỉ: ' + batTuData.dungThan.secondary;
    ctx += ' (' + batTuData.dungThan.method + ')\n';
  }
  if (batTuData.cachCuc) ctx += 'Cách cục: ' + batTuData.cachCuc.primary + ' (' + batTuData.cachCuc.thanhPhaCach + ')\n';
  if (batTuData.tuoiXem) ctx += 'Tuổi xem: ' + batTuData.tuoiXem + '\n';

  // Topic-based augmentation
  const topicMap: Record<string, string[]> = {
    'tài chính|tiền|tài lộc|làm giàu|thu nhập': ['tai'],
    'sự nghiệp|công việc|nghề|quan|chức': ['quanSat'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm': ['phuThe'],
    'con cái|con cháu': ['tuTuc'],
    'sức khỏe|bệnh|thân thể': ['suckhoe'],
    'đại vận|tiểu vận|vận hạn|vận trình': ['daiVan'],
    'lưu niên|năm nay|năm tới': ['luuNien'],
    'thần sát|sao': ['thanSat'],
  };

  const relevant = new Set<string>();
  for (const [pattern, keys] of Object.entries(topicMap)) {
    if (new RegExp(pattern, 'i').test(q)) keys.forEach(k => relevant.add(k));
  }
  if (relevant.size === 0) ['quanSat', 'tai', 'phuThe', 'daiVan'].forEach(k => relevant.add(k));

  // Đại vận hiện tại + kế tiếp
  if (relevant.has('daiVan') || true) {
    if (batTuData.daiVanHienTai) {
      const dv = batTuData.daiVanHienTai;
      ctx += '\nĐại Vận hiện tại: ' + dv.can + ' ' + dv.chi + ' (' + dv.tuoiStart + '–' + dv.tuoiEnd + 't, ' + dv.namStart + '–' + dv.namEnd + ')';
      ctx += ' — Thập thần: ' + dv.thapThanCan + ', score=' + dv.score + '/10\n';
    }
    if (batTuData.daiVanKeTiep) {
      const dv = batTuData.daiVanKeTiep;
      ctx += 'Đại Vận kế tiếp: ' + dv.can + ' ' + dv.chi + ' (' + dv.tuoiStart + '–' + dv.tuoiEnd + 't) — ' + dv.thapThanCan + ', score=' + dv.score + '/10\n';
    }
  }

  // Lưu niên
  if (batTuData.luuNien && (relevant.has('luuNien') || relevant.has('daiVan'))) {
    const ln = batTuData.luuNien;
    ctx += 'Lưu niên ' + ln.nam + ': ' + ln.can + ' ' + ln.chi + ' — ' + ln.thapThanCan + ', score=' + ln.score + '/10\n';
  }

  // Hình xung hại hợp
  if (batTuData.hinhXungHaiHop) {
    const h = batTuData.hinhXungHaiHop;
    const summary: string[] = [];
    if (h.tamHop?.length) summary.push('Tam hợp: ' + h.tamHop.length);
    if (h.lucXung?.length) summary.push('Lục xung: ' + h.lucXung.length);
    if (h.tamHinh?.length) summary.push('Tam hình: ' + h.tamHinh.length);
    if (h.canHop?.length) summary.push('Can hợp: ' + h.canHop.length);
    if (summary.length) ctx += 'Hợp/xung/hình: ' + summary.join(', ') + '\n';
  }

  // Thần sát found
  if (batTuData.thanSat && relevant.has('thanSat')) {
    const found: string[] = [];
    for (const [name, info] of Object.entries(batTuData.thanSat)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((info as any).found) found.push(name);
    }
    if (found.length) ctx += 'Thần sát có: ' + found.join(', ') + '\n';
  }

  // Ngũ hành
  if (batTuData.nguHanh) {
    ctx += 'Ngũ hành (weighted): ' + JSON.stringify(batTuData.nguHanh.weighted) + ' — Vượng: ' + batTuData.nguHanh.dominant + ', Thiếu: ' + batTuData.nguHanh.deficient + '\n';
  }

  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChat(body: any): Promise<Response> {
  const { messages, batTuData } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasBatTu = !!(batTuData?.tuTru?.length);
  const systemPrompt = hasBatTu
    ? CHAT_SYSTEM_TUBINH(extractTuBinhContext(batTuData, lastQ))
    : CHAT_SYSTEM_GENERAL;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trimmed = messages.slice(-10).map((m: any) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: systemPrompt, messages: trimmed }),
  });

  if (!resp.ok) return err('API error: ' + (await resp.text()).slice(0, 200));
  const data = await resp.json();
  return ok({ answer: data.content?.[0]?.text || '', scenario: hasBatTu ? 'batTu' : 'general' });
}

// ─── RAG search trong tubinh_docs ──────────────────────────────
async function searchTubinhDocs(query: string, topK = 5): Promise<string> {
  if (!query || query.length < 3) return '';

  // 1. Embed query qua OpenAI text-embedding-3-small
  const embRes = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: query.slice(0, 4000) }),
  });
  if (!embRes.ok) {
    console.error('OpenAI embed error:', await embRes.text());
    return '';
  }
  const embJson = await embRes.json() as { data: { embedding: number[] }[] };
  const embedding = embJson.data[0].embedding;

  // 2. Call RPC function search_tubinh_docs
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tubinh_docs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query_embedding: embedding, match_count: topK }),
  });
  if (!rpcRes.ok) {
    console.error('Supabase RPC error:', await rpcRes.text());
    return '';
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks = await rpcRes.json() as any[];
  if (!Array.isArray(chunks) || chunks.length === 0) return '';

  // 3. Concatenate top chunks với source attribution
  return chunks.map(c => `[${c.source || 'tài liệu'}]\n${c.content}`).join('\n\n---\n\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSearch(body: any): Promise<Response> {
  const { query, topK } = body;
  if (!query) return err('Missing query', 400);
  try {
    const docs = await searchTubinhDocs(query, topK || 5);
    return ok({ docs });
  } catch (e: unknown) {
    return err('Search error: ' + (e as Error).message);
  }
}

// ─── 16 PHẦN definitions ───────────────────────────────────────
const PHAN_INFO: Record<number, { ten: string; maxTokens: number }> = {
  1:  { ten: 'Tổng quan Bát Tự',           maxTokens: 2000 },
  2:  { ten: 'Cách Cục',                    maxTokens: 1500 },
  3:  { ten: 'Quan Sát — Sự nghiệp',        maxTokens: 1200 },
  4:  { ten: 'Tài',                          maxTokens: 1200 },
  5:  { ten: 'Thực Thương',                 maxTokens: 1200 },
  6:  { ten: 'Ấn',                           maxTokens: 1200 },
  7:  { ten: 'Tỷ Kiếp',                     maxTokens: 1200 },
  8:  { ten: 'Tình duyên',                  maxTokens: 1200 },
  9:  { ten: 'Sức khỏe',                    maxTokens: 1200 },
  10: { ten: 'Hình Xung Hại Hợp',           maxTokens: 1200 },
  11: { ten: 'Thần Sát',                    maxTokens: 1200 },
  12: { ten: 'Tổng quan Đại Vận',           maxTokens: 3000 },
  13: { ten: 'Đại Vận hiện tại',            maxTokens: 1200 },
  14: { ten: 'Đại Vận kế tiếp',             maxTokens: 1200 },
  15: { ten: 'Lưu Niên',                    maxTokens: 1400 },
  16: { ten: 'Tổng kết',                    maxTokens: 1500 },
};

// ─── Prompt builder ────────────────────────────────────────────
function buildPromptTuBinh(phan: number, batTuText: string, docs?: string): string {
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';
  const ctx = '=== BÁT TỰ ===\n' + batTuText + docsSection;

  if (phan === 1) return ctx + `

PHẦN 1 — TỔNG QUAN BÁT TỰ (300-400 từ)
Viết văn xuôi liền mạch, không dùng bullet, không đề cập đại vận chi tiết trong phần này.

Cấu trúc gợi ý (không cần tiêu đề con):
① Nhật Can & nguyệt lệnh: Bản chất nhật can, sinh tháng nào, đắc lệnh hay không. Mùa sinh quyết định gì?
② Cường nhược nhật can: Bình hòa / vượng / nhược — vì sao? (đắc địa, đắc thế, có gốc?). Quyết định toàn cục.
③ Dụng thần: Nguyên tắc phù-ức hay điều-hậu? Hành nào dụng, hành nào hỉ? Có dễ tìm trong tứ trụ không?
④ Một nhận định tổng: Điểm đặc biệt nhất của Bát Tự này là gì? (Nhật can vượng cực, tòng cách, dụng thần lộ thấu, ngũ hành nghiêng lệch...)

Lưu ý: Diễn giải, không liệt kê lại dữ liệu thô.`;

  if (phan === 2) return ctx + `

PHẦN 2 — CÁCH CỤC (250-350 từ)
Cách cục là khung chính của Bát Tự — quyết định "kiểu" số mệnh.

Viết văn xuôi súc tích:
① Cách cục chính: Tên cách cục, dựa vào tàng can nguyệt lệnh nào? Có thấu lên thiên can không? Thành cách hay phá cách — vì sao?
② Ý nghĩa thực tế: Cách cục này thường gặp ở kiểu người nào? Phú quý, công danh, hay bình thường?
③ Phối hợp với dụng thần: Dụng thần có hỗ trợ cách cục không hay xung khắc? Đây là then chốt phú quý vs lận đận.
④ Cảnh báo (nếu có): Cách cục có dấu hiệu phá hay không trọn vẹn? Nói thẳng.`;

  if (phan === 3) return ctx + `

PHẦN 3 — QUAN SÁT (Sự nghiệp & Quyền uy) (180-240 từ)
Quan tinh (Chính Quan + Thất Sát) là sao của sự nghiệp, quyền lực, danh phận, và áp lực xã hội.

Viết văn xuôi:
① Quan sát trong tứ trụ: Có xuất hiện ở thiên can hay tàng trong địa chi? Vị trí ở trụ nào?
② Quan vs Sát: Chính Quan ưa hợp lễ; Thất Sát ưa chế hóa. Cái nào nổi bật hơn ở lá số này?
③ Phối với Nhật Can: Nhật can vượng đủ chế Sát không? Nhật can nhược thì Quan Sát có sinh ra Tài để hỗ trợ không?
④ Sự nghiệp thực tế: Hợp với nghề gì — nhà nước/tư nhân/tự do? Có phát quan không, hay khó leo cao?`;

  if (phan === 4) return ctx + `

PHẦN 4 — TÀI (Tài chính & Của cải) (180-240 từ)
Tài tinh (Chính Tài + Thiên Tài) là sao của tiền bạc, tài sản, và (với nam) là vợ.

Viết văn xuôi:
① Tài tinh trong tứ trụ: Lộ ở thiên can (rõ rệt) hay tàng trong địa chi (kín đáo)? Vị trí trụ nào?
② Chính Tài vs Thiên Tài: Chính Tài là tiền chính danh, thu nhập ổn định; Thiên Tài là tiền lớn nhanh, đầu cơ, đột biến. Bên nào trội?
③ Tài có gốc không: Tài tinh có vượng không (đắc địa, đắc thế)? Hay tài bị kiếp tài cướp?
④ Khả năng tài chính thực tế: Kiếm tiền dễ hay khó? Giữ được tiền không? Phù hợp với nguồn tiền nào?`;

  if (phan === 5) return ctx + `

PHẦN 5 — THỰC THƯƠNG (Sáng tạo & Tự do) (180-240 từ)
Thực Thần và Thương Quan là sao của sáng tạo, tài năng, biểu đạt cá nhân, và tiết khí.

Viết văn xuôi:
① Thực Thương trong tứ trụ: Có xuất hiện không? Ở vị trí nào? Hành nào?
② Thực vs Thương: Thực Thần ôn hòa, biểu đạt êm; Thương Quan sắc bén, hay phá cách, dễ ngạo nghễ. Bên nào lộ?
③ Phối hợp Quan Sát: Thương Quan kỵ Quan (phá cách quan); Thực Thần chế Sát (tốt). Lá số có vướng không?
④ Tài năng & nghề nghiệp: Thực Thương mạnh thường có tài nghệ, sáng tạo, biểu diễn, viết lách. Hợp với gì?`;

  if (phan === 6) return ctx + `

PHẦN 6 — ẤN (Học vấn & Mẹ & Quý nhân) (180-240 từ)
Ấn tinh (Chính Ấn + Kiêu Thần) là sao của học vấn, bằng cấp, mẹ, sự che chở, và sinh khí cho Nhật Can.

Viết văn xuôi:
① Ấn trong tứ trụ: Lộ ở thiên can hay tàng trong địa chi? Vị trí trụ nào?
② Chính Ấn vs Kiêu Thần: Chính Ấn ôn hòa, mẹ và học hành thuận; Kiêu Thần (Thiên Ấn) lệch, hay đoạt thực, mẹ kế hoặc quan hệ phức tạp.
③ Vai trò sinh phù Nhật Can: Nhật can nhược thì Ấn là cứu tinh. Nhật can vượng có Ấn thêm thì quá vượng — phản tác dụng.
④ Học vấn & sự nghiệp tri thức: Ấn vượng thường thông minh, học giỏi, hợp nghiên cứu, giáo dục. Lá số này thế nào?`;

  if (phan === 7) return ctx + `

PHẦN 7 — TỶ KIẾP (Anh em & Bạn bè & Cạnh tranh) (150-220 từ)
Tỷ Kiên và Kiếp Tài là sao của anh chị em, bạn bè cùng vai vế, và sự cạnh tranh, phân chia tài lộc.

Viết văn xuôi:
① Tỷ Kiếp trong tứ trụ: Có nhiều không? Vị trí ở đâu?
② Tỷ Kiên vs Kiếp Tài: Tỷ Kiên cùng tính âm/dương với Nhật Can — bạn đồng minh. Kiếp Tài khác tính — anh em cạnh tranh, hao Tài.
③ Nhật can vượng có Tỷ Kiếp: Quá nhiều → cần Quan Sát chế. Nhật can nhược có Tỷ Kiếp: Là cứu tinh, sinh phù.
④ Quan hệ anh em & đối tác: Lá số này anh em có hợp tác không, hay tranh chấp tài sản? Đối tác làm ăn có bền không?`;

  if (phan === 8) return ctx + `

PHẦN 8 — TÌNH DUYÊN & HÔN NHÂN (200-280 từ)
Trục luận: nam lấy Tài làm vợ, nữ lấy Quan Sát làm chồng. Cung Phu Thê chính là Nhật Chi (chi của trụ ngày).

Viết văn xuôi:
① Cung Phu Thê (Nhật Chi): Hành gì, có hợp xung với các chi khác trong tứ trụ không? Có hợp Nhật Can hay xung Nhật Can?
② Sao phối ngẫu (Tài cho nam / Quan cho nữ): Có lộ ra không, ở vị trí nào, vượng hay nhược? Bị hợp đi hay bị xung phá?
③ Đào Hoa, Hồng Diễm: Có không? Tô điểm sắc thái duyên dáng, hay là dấu hiệu đa đoan?
④ Hôn nhân thực tế: Lập gia đình sớm/muộn? Hôn nhân thuận hay trắc trở? Có dấu hiệu kết hôn nhiều lần (xung phu thê cung, sao phối nhiều) không? Nói thẳng nhưng không phán định tuyệt đối.`;

  if (phan === 9) return ctx + `

PHẦN 9 — SỨC KHỎE & THỂ TRẠNG (150-220 từ)
Sức khỏe trong Tử Bình xét theo ngũ hành nhật can + cường nhược + cách cục.

Viết văn xuôi:
① Hành Nhật Can & cơ quan tương ứng: Mộc=gan, Hỏa=tim, Thổ=tỳ vị, Kim=phổi, Thủy=thận. Hành quá vượng hay quá suy đều ảnh hưởng cơ quan tương ứng.
② Cường nhược & sức khỏe nền: Nhật can quá nhược → cơ thể yếu, dễ bệnh tật. Quá vượng → khí huyết thái quá, dễ bệnh do thừa.
③ Hình xung trong tứ trụ: Tự hình, lục xung ở chi liên quan đến trụ nào → bộ phận đó dễ có vấn đề.
④ Lưu ý cụ thể: Một-hai điểm cần chú ý về sức khỏe (không chẩn đoán y khoa, chỉ gợi ý hướng quan sát).`;

  if (phan === 10) return ctx + `

PHẦN 10 — HÌNH XUNG HẠI HỢP (180-240 từ)
Quan hệ giữa các địa chi trong tứ trụ là động lực biến chuyển lá số.

Viết văn xuôi:
① Tam hợp & Lục hợp: Có hợp cục nào trọn vẹn (3 chi) hay bán hợp (2 chi)? Hợp ra hành gì? Hành đó có lợi cho dụng thần không?
② Lục xung: Có cặp xung nào? Xung ở trụ nào — Năm/Tháng (hồi nhỏ, gia đình) hay Ngày/Giờ (vợ chồng, con cái)? Xung phá cái gì?
③ Hình & hại: Tam hình "vô ân" hay "vô lễ" gì xuất hiện? Lục hại nhẹ hơn nhưng vẫn gây phiền phức ngầm.
④ Thiên can hợp khắc: Can hợp hóa hành nào? Hợp đem lợi hay hợp khử mất? Can khắc gây áp lực ở vị trí nào?

Diễn giải tác động thực tế lên cuộc đời, không liệt kê lý thuyết.`;

  if (phan === 11) return ctx + `

PHẦN 11 — THẦN SÁT (180-240 từ)
Thần sát là dấu hiệu phụ — không quyết định cách cục nhưng tô đậm sắc thái.

Viết văn xuôi:
① Quý nhân: Thiên Ất Quý Nhân, Thiên Đức, Nguyệt Đức — có không? Vị trí trụ nào (hỗ trợ giai đoạn nào của đời)?
② Văn tinh: Văn Xương, Học Đường — học hành, văn chương, danh tiếng học thuật.
③ Đào hoa & Hồng diễm: Sức hút, duyên dáng — nhưng cũng dấu hiệu đa đoan tình duyên nếu kết hợp xấu.
④ Sát/cô độc: Dương Nhẫn (uy mạnh nhưng dễ tự tổn), Cô Thần & Quả Tú (cô độc, ít con), Không Vong (làm trống ý nghĩa của trụ chứa nó), Dịch Mã (di chuyển, xuất hành).

Chỉ đề cập thần sát thực sự xuất hiện trong lá số. Nói cụ thể "vì sao quan trọng với người này".`;

  if (phan === 12) return ctx + `

PHẦN 12 — TỔNG QUAN ĐẠI VẬN

Đại vận chia đời thành 9 giai đoạn, mỗi giai đoạn 10 năm. Mỗi đại vận có can chi riêng, thập thần đối với Nhật Can, và score 0-10 dựa trên dụng thần.

Bảng tổng hợp 9 đại vận (đối chiếu với biểu đồ đã có sẵn ở phía trên):
| ĐV | Tuổi | Can Chi | Thập thần | Score |

Nhận xét tổng (250-350 từ):
① Giai đoạn đẹp nhất của đời là khi nào — vì sao (vận đó hợp dụng thần)?
② Giai đoạn khó khăn nhất — vì sao (vận khắc dụng thần, hoặc gặp thần sát xấu)?
③ Xu hướng chung: Đời này phát sớm, phát muộn, hay đều?
④ Nhật can vượng/nhược ảnh hưởng đến cách đọc đại vận thế nào?
⑤ Một dấu mốc quan trọng cần lưu ý (giao thời giữa hai đại vận lệch nhau lớn).`;

  if (phan === 13) return ctx + `

PHẦN 13 — ĐẠI VẬN HIỆN TẠI (200-280 từ)
Đại vận đang sống ở thời điểm hiện tại — quan trọng nhất.

Tìm "Đại Vận hiện tại" trong dữ liệu. Viết văn xuôi:
① Tính chất vận: Can chi gì, thập thần với Nhật Can là gì? Hành vận có hợp dụng thần không?
② Score nói lên điều gì: Vận tốt (>7), bình thường (5-7), hay khó (<5)? Cụ thể ở 6 chiều scoring (tiềm năng, bền vững, an toàn, quý nhân, minh bạch, tương hợp).
③ Tác động thực tế: Trong giai đoạn này, người này dễ gặp gì — thuận lợi sự nghiệp/tài lộc, hay vướng quan tinh, hay mất phương hướng?
④ Lời khuyên ngắn: 1-2 ý cụ thể nên làm/tránh trong giai đoạn này.`;

  if (phan === 14) return ctx + `

PHẦN 14 — ĐẠI VẬN KẾ TIẾP (180-240 từ)
Đại vận sắp tới — chuẩn bị cho 10 năm sau.

Tìm "Đại Vận kế tiếp" trong dữ liệu. Viết văn xuôi:
① So sánh với vận hiện tại: Tốt hơn hay khó hơn? Khác biệt cốt lõi là gì?
② Tính chất vận kế tiếp: Can chi, thập thần với Nhật Can. Hợp dụng thần hay nghịch?
③ Cơ hội và thách thức: 1-2 cơ hội rõ + 1-2 điểm cần đề phòng.
④ Chuẩn bị từ bây giờ: Gợi ý vài việc nên làm trước khi vận đến.`;

  if (phan === 15) return ctx + `

PHẦN 15 — LƯU NIÊN (Năm xem) (200-280 từ)
Lưu niên là biến số trong khung đại vận. Năm này có can chi riêng, tương tác với tứ trụ và đại vận.

Tìm "Lưu niên" trong dữ liệu. Viết văn xuôi:
① Tính chất năm: Can chi năm xem, thập thần với Nhật Can. Đem hành gì đến cho Nhật chủ?
② Quan hệ với tứ trụ: Năm xem có hợp/xung/hình/hại với chi nào trong tứ trụ? Hợp với chi nào → việc gì thuận; xung chi nào → việc gì khó.
③ Quan hệ với đại vận hiện tại: Năm tốt trong đại vận tốt = nhân đôi may mắn; năm xấu trong đại vận xấu = năm khó nhất; chéo nhau → cân bằng.
④ Tổng nhận định + 2-3 việc cụ thể nên làm/tránh trong năm này.`;

  if (phan === 16) return ctx + `

PHẦN 16 — TỔNG KẾT (250-350 từ)
Đây là phần cuối, đúc kết toàn bộ lá số thành 1 bức tranh tổng thể.

Viết văn xuôi liền mạch, không bullet:
① Bản chất con người này: 2-3 câu cô đọng nhất — kiểu người gì, điểm mạnh cốt lõi, điểm yếu căn bản.
② Đường đời tổng thể: Thuận hay nghịch, phát sớm hay phát muộn, quý lộ hay phú lộ?
③ 3 ưu thế lớn nhất của lá số (cụ thể, không chung chung).
④ 3 điểm cần đề phòng nhất.
⑤ Lời khuyên cuối: 1-2 ý súc tích về phương hướng sống/làm việc/tu dưỡng phù hợp với mệnh số.

Văn phong tổng kết: trầm tĩnh, có chiều sâu, không phán định tuyệt đối, không hứa hẹn.`;

  return ctx + `\nPhần ${phan}: Luận giải theo Bát Tự đã cho.`;
}

// ─── Route handlers ────────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = await parseBody(request);

  if (action === 'chat') return handleChat(body);
  if (action === 'search') return handleSearch(body);

  // Default: luận giải 1 phần
  const { batTuText, phan, docs } = body as { batTuText?: string; phan?: number; docs?: string };
  if (!batTuText || !phan) return err('Thiếu dữ liệu (cần batTuText + phan)', 400);

  const phanNum = Number(phan);
  const phanInfo = PHAN_INFO[phanNum];
  if (!phanInfo) return err(`Phần ${phanNum} không tồn tại (1-16)`, 400);

  let prompt: string;
  try {
    prompt = buildPromptTuBinh(phanNum, batTuText, docs);
  } catch (e: unknown) {
    return err('buildPrompt error: ' + (e as Error).message);
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: phanInfo.maxTokens,
        stream: true,
        system: [{ type: 'text', text: SYSTEM_PROMPT_TUBINH, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }] }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return err('API error: ' + errText.slice(0, 200));
    }

    // Forward Anthropic SSE stream directly to client.
    // Frontend parses content_block_delta events to accumulate text.
    return new Response(resp.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'X-Phan': String(phanNum),
        'X-Phan-Ten': encodeURIComponent(phanInfo.ten),
      },
    });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
