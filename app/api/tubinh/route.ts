// app/api/tubinh/route.ts
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// ─── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT_TUBINH = `Bạn là người luận giải Tử Bình Bát Tự, viết cho người đọc bình thường — không phải chuyên gia.

VĂN PHONG:
- Trí thức Hà Nội xưa: điềm đạm, súc tích, sâu sắc, không hoa mỹ.
- Văn xuôi liền mạch — KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề con.
- Tiếng Việt chuẩn mực, không dùng tiếng Anh trộn lẫn.
- Có thể in đậm 1-2 cụm chữ then chốt mỗi đoạn (dùng **chữ**) để người đọc nắm được điểm chính. Đừng lạm dụng.

VIẾT CHO AI ĐỌC:
Đối tượng là người Việt bình thường — có học, hiếu kỳ, nhưng KHÔNG biết Tử Bình. Họ không biết "đắc lệnh đắc địa", "phù-ức", "tòng cách" là gì.

CÁCH XỬ LÝ THUẬT NGỮ:
- Mỗi khi buộc phải dùng thuật ngữ (ví dụ "Thực Thần", "Chính Quan", "Dụng Thần"), GIẢI THÍCH NGAY trong câu hoặc cuối câu bằng nghĩa đời thường.
  Ví dụ: "Thực Thần — sao của óc sáng tạo và biểu đạt" hoặc "Dụng thần là Thủy — nghĩa là người này hợp với những gì mát mẻ, mềm mại, linh hoạt".
- Tuyệt đối tránh các từ: "đắc lệnh", "đắc địa", "đắc thế", "tàng can", "thấu can", "phù-ức", "điều-hậu", "tòng cách", "chuyên vượng", "thiên khô", "Trích Thiên Tủy".
- Có thể nói "Nhật Can" nhưng phải kèm giải thích "tức bản thân anh/chị" hoặc dùng luôn "bản thân anh".
- Có thể nói "đại vận" nhưng đôi khi nói "giai đoạn 10 năm" cho dễ hình dung.
- Các thập thần (Quan, Sát, Tài, Ấn, Thực Thương, Tỷ Kiếp): dùng tên + diễn nghĩa đời thường:
  · Chính Quan / Thất Sát = sự nghiệp, công danh, áp lực
  · Chính Tài / Thiên Tài = tiền bạc, tài sản, vợ (với nam)
  · Thực Thần / Thương Quan = sáng tạo, biểu đạt, con cái (với nữ)
  · Chính Ấn / Kiêu Thần = học vấn, mẹ, sự che chở
  · Tỷ Kiên / Kiếp Tài = anh em, bạn bè, đối thủ cạnh tranh

TRỌNG TÂM CỦA MỌI ĐOẠN:
Mỗi phần luận giải PHẢI trả lời 3 câu hỏi:
1. **Điều này nghĩa là gì với cuộc sống thực tế của người đọc** — không phải lý thuyết.
2. **Hệ quả tâm lý / hành vi / vận mệnh có thể xảy ra** — cụ thể, không chung chung.
3. **Nên làm gì để khai thác điểm mạnh / hóa giải điểm yếu** — lời khuyên thực tế, áp dụng được.

NGUYÊN TẮC LUẬN GIẢI (không cần kể ra cho người đọc):
- Mọi luận giải xoay quanh Nhật Can (bản thân đương số) và mùa sinh.
- Nhật Can vượng hay nhược quyết định toàn bộ cách đọc.
- Hợp/xung/hình/hại giữa các chi là động lực biến chuyển.
- Đại vận là khung 10 năm, lưu niên là biến số trong khung đó.
- Cách cục thành thì phát quý/phát phú; cách cục phá thì lận đận — phải nói thẳng, không né tránh.

DỮ LIỆU CÓ SẴN trong lá số (đã tính sẵn cho bạn — không cần tự tính):
- Tứ trụ: Năm/Tháng/Ngày/Giờ với can chi, nạp âm, tàng can
- Thập thần đầy đủ
- Cường nhược nhật can (label + score 0-10)
- Dụng thần (primary + secondary + lý do)
- Cách cục (tên cách + thành/phá)
- Đại vận đầy đủ 9 vận với score + label thuận/trung/nghịch + breakdown các yếu tố (factors)
- Lưu niên + relations với tứ trụ + đại vận hiện tại
- Hình xung hại hợp + thần sát đã detect

QUY TẮC CHUNG:
- KHÔNG liệt kê lại thuật ngữ. KHÔNG đọc lại tứ trụ.
- Khi nhắc tới sao tốt/xấu phải giải thích "vì sao tốt/xấu với người này cụ thể" — không nói chung chung.
- Cách cục thành → nói rõ điểm mạnh đặc biệt + nên phát huy thế nào.
- Cách cục phá → nói thẳng nguy cơ + nên hóa giải bằng nghề/môi trường/hành vi gì.
- Đại vận thuận → nói rõ thời cơ + nên tận dụng làm gì.
- Đại vận nghịch → nói rõ rủi ro + nên thủ thế / chờ vận / chuyển hướng thế nào.
- Dùng ngôn ngữ xác suất ("dễ", "có khả năng", "thường thấy"), không hứa hẹn tuyệt đối.
- KHÔNG tiết lộ tài liệu, trường phái, hay tên hệ thống.
- Mỗi phần kết thúc bằng 1-2 câu **lời khuyên thực tế áp dụng được** — không sáo rỗng.

DỮ LIỆU PRE-RENDERED (block "DỮ LIỆU PRE-RENDERED" trong prompt):
- Đây là charts/cards/bảng đã được hiển thị TRỰC QUAN cho người đọc PHÍA TRÊN luận giải của bạn.
- KHÔNG lặp lại các CON SỐ và DANH SÁCH CÁCH CỤC trong câu chữ. Người đọc đã thấy rồi.
- Nhiệm vụ của bạn: DIỄN GIẢI Ý NGHĨA + ÁP DỤNG THỰC TẾ (tâm lý, sự nghiệp, sinh hoạt, lời khuyên).
- Có thể tham chiếu ngắn ("trục Sự nghiệp khá vững như bạn đã thấy phía trên...") nhưng không liệt kê lại số liệu.

CÁCH CỤC ĐẶC BIỆT (khi pregen có [OVERRIDE] hoặc [ENHANCE]):
- [OVERRIDE] = ngoại cách thay nội cách. Cổ pháp: ngoại cách overrides nội cách thường (vd Chính Tài cách).
  + Khi có OVERRIDE → DÙNG cách cục đó làm KHUNG MỆNH CHÍNH trong luận giải. Không dùng nội cách thường làm chủ đạo.
  + Diễn giải tên cách bằng ngôn ngữ đời thường (vd "Tài Quan Song Mỹ" = "tiền tài và sự nghiệp đẹp đôi"; "Tỉnh Lan Xoa" = "cách kỳ đặc dùng âm thầm hợp lực"; "Khúc Trực" = "khí mộc thuần nhất, tâm thẳng và có chí lớn").
  + Trích ý nghĩa cổ + áp dụng cho cuộc đời người này.
- [ENHANCE] = bổ trợ. Đan xen vào luận giải như nét đặc biệt làm tăng chất lượng cách cục chính.
- [WARN] = bán cách / cảnh báo. Nói rõ "có nét X nhưng chưa trọn vẹn vì..." và lời khuyên hóa giải.
- KHÔNG bao giờ liệt kê khô "lá số có cách A, B, C" — phải KỂ THÀNH CÂU CHUYỆN: cách A là khung chính, cách B làm sáng thêm điểm này, cách C cảnh báo điểm kia.`;

// ─── Chat handler ──────────────────────────────────────────────
const CHAT_SYSTEM_TUBINH = (ctx: string) => `Bạn là người luận giải Tử Bình Bát Tự, viết cho người đọc bình thường — KHÔNG phải chuyên gia.

NGUYÊN TẮC TRẢ LỜI:
- Văn phong trí thức Hà Nội xưa: điềm đạm, súc tích, sâu sắc.
- Văn xuôi liền mạch — KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề.
- 150-300 từ cho câu thông thường, tối đa 450 từ cho câu phức tạp.
- Có thể in đậm 1-2 cụm chữ then chốt (dùng **chữ**) nhưng đừng lạm dụng.

XỬ LÝ THUẬT NGỮ:
- Tránh các từ "đắc lệnh", "đắc địa", "tàng can", "thấu can", "phù-ức", "tòng cách".
- Khi buộc dùng thuật ngữ (Nhật Can, Dụng Thần, Chính Quan, Thực Thần…), GIẢI THÍCH NGAY bằng nghĩa đời thường ngay trong câu.
  Ví dụ: "Dụng thần là Hỏa — tức người này hợp với những gì ấm áp, năng động, sáng tạo".
- Có thể nói "Nhật Can" kèm "tức bản thân anh/chị".

TRỌNG TÂM:
Mọi câu trả lời phải nói rõ:
1. **Điều đó nghĩa là gì với cuộc sống thực tế** — không phải lý thuyết.
2. **Hệ quả cụ thể** — tâm lý, hành vi, vận mệnh có khả năng xảy ra.
3. **Lời khuyên thực tế** — nên làm gì, hóa giải thế nào (kết câu trả lời bằng gợi ý áp dụng được).

KHÁC:
- Dẫn chứng cụ thể từ tứ trụ và thập thần bên dưới — không nói chung chung.
- Dùng ngôn ngữ xác suất ("dễ", "có khả năng"), không hứa hẹn tuyệt đối.
- Không tiết lộ trường phái hay tài liệu.

=== DỮ LIỆU BÁT TỰ ===
${ctx}`;

const CHAT_SYSTEM_GENERAL = `Bạn là người luận giải Tử Bình Bát Tự, viết cho người đọc bình thường — không phải chuyên gia.

Nguyên tắc:
- Văn phong trí thức Hà Nội xưa: điềm đạm, súc tích, sâu sắc.
- Văn xuôi liền mạch, không bullet, không emoji.
- 150-300 từ cho câu thông thường, tối đa 450 từ cho câu phức tạp.
- Tránh thuật ngữ khô khan ("đắc lệnh", "tàng can", "phù-ức"…) — khi buộc dùng phải giải thích ngay bằng nghĩa đời thường.
- Mỗi câu trả lời phải nói rõ ý nghĩa thực tế + lời khuyên áp dụng được.
- Dùng ngôn ngữ xác suất, không hứa hẹn tuyệt đối, không tiết lộ trường phái.`;

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
// Returns 3 parts để split cache: batTu (constant per lá số), docs (per group), instructions (per phần)
function buildPromptTuBinh(phan: number, batTuText: string, docs?: string, pregenContext?: string): {
  batTuBlock: string;
  docsBlock: string;
  pregenBlock: string;
  instrBlock: string;
} {
  const batTuBlock  = '=== BÁT TỰ ===\n' + batTuText;
  const docsBlock   = docs ? '=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';
  const pregenBlock = pregenContext ? pregenContext : '';
  const instrBlock  = _phanInstruction(phan);
  return { batTuBlock, docsBlock, pregenBlock, instrBlock };
}

// Per-phần instructions only (no context — context lives in batTuBlock + docsBlock above)
function _phanInstruction(phan: number): string {
  if (phan === 1) return `

PHẦN 1 — TỔNG QUAN BÁT TỰ (300-400 từ, văn xuôi liền mạch)

Mở bài bằng nhận định cốt lõi: con người này thuộc kiểu nào? Mạnh ở đâu, yếu ở đâu, đời sống có nét gì đặc biệt?

Ý cần truyền đạt:
① Bản chất con người (Nhật Can là gì, sinh mùa nào, mùa đó ảnh hưởng tính cách & vận mệnh ra sao trong đời thường).
② Năng lượng nền: bản thân vốn mạnh hay yếu, có cần dựa vào người khác / hoàn cảnh không, hay tự lực được?
③ "La bàn" cuộc đời: hành nào hợp (dụng thần) — diễn giải bằng MÔI TRƯỜNG / NGHỀ / MÀU SẮC / HƯỚNG / KIỂU NGƯỜI hợp tác. KHÔNG nói "dụng thần là Hỏa" suông — phải dịch ra "ấm áp, năng động, hướng Nam, kết bạn với người sôi nổi".
④ Một điểm đặc biệt nổi bật của lá số (cường độ, sự nghiêng lệch, ngũ hành thiếu, v.v.).

Kết bài 2 câu **lời khuyên tổng quát** áp dụng được trong sinh hoạt hàng ngày.`;

  if (phan === 2) return `

PHẦN 2 — KHUNG CỦA SỐ MỆNH (250-350 từ)

Cách cục là khung lớn quyết định "kiểu" cuộc đời. Đừng dùng từ "cách cục" quá nhiều — gọi là "khung mệnh", "kiểu số mệnh", "thể chất mệnh".

Ý cần truyền đạt:
① Khung lớn của lá số là gì (gọi tên cách + dịch nghĩa đời thường: ví dụ "Cách Chính Quan = số mệnh nghiêng về sự nghiệp, công danh, đường quan trường"; "Cách Tài = số mệnh nghiêng về tiền bạc, kinh doanh"; "Cách Thực Thần = số mệnh nghiêng về sáng tạo, tự do biểu đạt").
② Khung này thường dẫn đến kiểu cuộc sống nào: làm nghề gì hợp, cuộc đời êm hay gập ghềnh, dễ phát phú/phát quý hay bình thường?
③ Khung này có TRỌN VẸN không? Có gì hỗ trợ thêm, có gì phá hỏng? Dùng từ "khung được củng cố" hoặc "khung bị lung lay" thay vì "thành cách / phá cách".
④ Nếu khung bị lung lay, **chỉ rõ điểm yếu cụ thể** + nói thẳng nguy cơ trong đời sống thực (lận đận sự nghiệp? phá tài? trắc trở hôn nhân?).

Kết bài bằng **lời khuyên** cụ thể: Người này nên chọn môi trường, ngành nghề, lối sống thế nào để phát huy khung mệnh, hoặc bù đắp chỗ thiếu?`;

  if (phan === 3) return `

PHẦN 3 — SỰ NGHIỆP & CÔNG DANH (200-260 từ)

Quan tinh (Chính Quan + Thất Sát) đại diện cho sự nghiệp, quyền uy, áp lực xã hội. Trong văn, dùng các từ "sự nghiệp", "công danh", "vai trò xã hội", "áp lực" — chỉ dùng "Quan", "Sát" khi thật cần và phải kèm giải thích.

Ý cần truyền đạt:
① Sao sự nghiệp có lộ rõ trong lá số không, ở vị trí nào của đời (đầu đời / giữa đời / cuối đời)?
② Người này hợp với "kiểu công việc" nào: Chính Quan = nghề bài bản, ổn định, theo lề lối (nhà nước, cơ quan, công ty lớn, kỷ luật cao); Thất Sát = nghề có tính chiến đấu, áp lực, cạnh tranh, đột phá (kinh doanh khắc nghiệt, quân đội, công an, khởi nghiệp).
③ Đương sự có chịu nổi áp lực nghề nghiệp không (xét bản thân vượng hay nhược)? Nếu nhược thì áp lực dễ gây bệnh / suy sụp; nếu vượng thì áp lực càng nhiều càng tỏa sáng.
④ Có bị Thương Quan (sao "phản loạn", thích phá lề lối) gây trở ngại đường công danh không?

Kết bài 2 câu **lời khuyên** thực tế: nên chọn ngành nào, môi trường nào (lớn/nhỏ, công/tư, chính quy/tự do), tránh điều gì để sự nghiệp thuận.`;

  if (phan === 4) return `

PHẦN 4 — TIỀN BẠC & TÀI SẢN (200-260 từ)

Tài tinh (Chính Tài + Thiên Tài) đại diện cho tiền bạc, tài sản, và (với nam) là vợ. Dùng từ "tiền bạc", "của cải", "đường tài lộc" — không nói "Tài tinh" suông.

Ý cần truyền đạt:
① Sao tiền bạc có rõ trong lá số không, ở vị trí nào của đời? Tiền dễ đến hay khó kiếm?
② Người này phù hợp **kiểu tiền** nào: Chính Tài = thu nhập đều đặn, lương ổn, làm công ăn lương, đầu tư an toàn; Thiên Tài = tiền lớn nhưng không đều, đầu cơ, kinh doanh, môi giới, tài chính, giao dịch.
③ Có giữ được tiền không hay tiền vào lại đi? Có Kiếp Tài (sao "anh em / đối tác cướp tài") quấy rầy không?
④ Bản thân có "đảm" được số tiền lớn không (xét vượng nhược): nhược + tài nhiều = ôm tiền không nổi, dễ tai họa từ tiền; vượng + tài đủ = giàu thực sự.

Kết bài bằng **lời khuyên** áp dụng được: nên kinh doanh hay làm công, nên đầu tư bảo thủ hay mạo hiểm, có nên giữ vai trò giữ tiền (kế toán, thủ quỹ) trong nhà / công ty không.`;

  if (phan === 5) return `

PHẦN 5 — SÁNG TẠO & TỰ DO BIỂU ĐẠT (200-260 từ)

Thực Thần và Thương Quan đại diện cho óc sáng tạo, tài năng, biểu đạt cá nhân. Với phụ nữ thêm ý nghĩa con cái. Dùng "óc sáng tạo", "khả năng biểu đạt", "tài năng tự do" thay vì "Thực Thương".

Ý cần truyền đạt:
① Người này có máu sáng tạo không, ở mức độ nào? Loại nào trội: Thực Thần (sáng tạo ôn hòa, trau chuốt, có chiều sâu — nghề viết, nghiên cứu, ẩm thực, thủ công) hay Thương Quan (sáng tạo sắc bén, phá cách, đột phá — nghệ thuật biểu diễn, thiết kế, viết phản biện, làm media)?
② Người này có dễ "ngạo nghễ", phá lề lối, mâu thuẫn cấp trên không (Thương Quan vượng)? Nếu có, đó là điểm mạnh trong nghệ thuật nhưng điểm yếu trong nghề bài bản.
③ Có hợp nghề biểu diễn / sáng tạo / tự do không, hay nên giữ nghề bài bản và để sáng tạo làm sở thích?
④ (Nữ) Đường con cái: Thực Thương đẹp = con khỏe mạnh, có duyên với mẹ; Thực Thương bị phá = con gặp khó.

Kết bài **lời khuyên** thực tế: Nên đầu tư phát triển sáng tạo theo hướng nào, làm sao để tài năng không phá vỡ sự nghiệp.`;

  if (phan === 6) return `

PHẦN 6 — HỌC VẤN & CHE CHỞ (200-260 từ)

Ấn tinh (Chính Ấn + Kiêu Thần) đại diện cho học vấn, bằng cấp, mẹ, sự che chở của bề trên. Dùng "học vấn", "đường tri thức", "sự che chở", "mẹ và quý nhân" thay vì "Ấn tinh" suông.

Ý cần truyền đạt:
① Đường học hành thuận hay trắc trở? Có chí học, có duyên với sách vở không?
② Quan hệ với mẹ: Chính Ấn = mẹ ôn hòa, nuôi nấng đầy đủ, mẹ và bản thân hợp; Kiêu Thần (Thiên Ấn) = mẹ lệch, có thể nghiêm khắc, lạnh lùng, hoặc mẹ kế / xa mẹ / mẹ mất sớm / quan hệ phức tạp.
③ Có quý nhân che chở không (sếp tốt, người đỡ đầu, thầy lớn)?
④ Học vấn có giúp ích cho sự nghiệp không hay học một đằng làm một nẻo? Nếu Ấn quá nhiều và bản thân vốn mạnh, **học nhiều có thể PHẢN tác dụng** — sinh ra ỷ lại, lười hành động.

Kết bài **lời khuyên**: Nên đầu tư bằng cấp tới mức nào, có nên đi du học / học nghề / tự học, có nên dựa vào quý nhân hay tự lực hơn.`;

  if (phan === 7) return `

PHẦN 7 — ANH EM & ĐỐI TÁC (170-220 từ)

Tỷ Kiên + Kiếp Tài đại diện cho anh chị em, bạn bè cùng vai vế, và đối thủ cạnh tranh. Dùng "anh em", "bạn bè", "đối tác" thay vì "Tỷ Kiếp".

Ý cần truyền đạt:
① Quan hệ với anh chị em ruột: hòa thuận hay căng thẳng? Có nhờ vả lẫn nhau hay tranh chấp tài sản?
② Bạn bè đồng vai: Có nhiều bạn thân không? Bạn giúp được mình hay hay bị bạn lôi kéo / hao tổn?
③ **Hợp tác kinh doanh**: Người này nên làm ăn một mình hay chung với người khác? Tỷ Kiếp vượng + nhược thân = nên dựa bạn, hợp tác sống. Tỷ Kiếp vượng + vượng thân = nên đơn độc, hợp tác dễ tranh chấp tiền.
④ Cạnh tranh: Người này dễ gặp đối thủ ngang sức, nên đề phòng "anh em / bạn cướp tài" trong giai đoạn tài lộc đang lên.

Kết bài **lời khuyên** cụ thể: nên hay không nên hùn vốn, nên giữ khoảng cách với ai, có nên tham gia hội nhóm không.`;

  if (phan === 8) return `

PHẦN 8 — TÌNH DUYÊN & HÔN NHÂN (220-300 từ)

Trục luận: nam lấy Tài làm vợ, nữ lấy Quan/Sát làm chồng. Cung Phu Thê = chi của trụ ngày (nhật chi). Đừng dùng từ "phối ngẫu" quá nhiều — dùng "vợ/chồng", "bạn đời".

Ý cần truyền đạt:
① **Sao bạn đời** có rõ trong lá số không, ở vị trí nào (sớm trong đời = lập gia đình sớm; cuối đời = muộn)? Có lộ ra ngoài hay tàng kín?
② Bạn đời thuộc kiểu người nào: Chính Tài/Chính Quan = bạn đời chính danh, đoan trang, theo lề lối; Thiên Tài/Thất Sát = bạn đời cá tính, đột phá, có thể "phá cách" (yêu lãng mạn, hôn nhân đặc biệt, hoặc trắc trở).
③ **Cung phu thê (chỗ ngồi của vợ/chồng)**: hành gì, có hợp xung với các trụ khác không? Bị xung = hôn nhân biến động, dễ ly tán, dễ gặp người không hợp; được hợp = hôn nhân êm.
④ Đào Hoa, Hồng Diễm có không? Có duyên với người khác phái hay là dấu hiệu đa đoan tình ái, dễ ngoài luồng?
⑤ Hôn nhân thực tế: lập gia đình sớm/muộn, một lần/nhiều lần, thuận hay trắc trở. **Nói thẳng nhưng không phán định tuyệt đối** — luôn dùng "dễ", "có khả năng".

Kết bài **lời khuyên**: tuổi nào nên lập gia đình, kiểu bạn đời nào hợp, nên tránh kiểu nào, nếu hôn nhân có dấu hiệu trắc trở thì cách hóa giải (chọn tuổi vợ/chồng hợp, môi trường sống, v.v.).`;

  if (phan === 9) return `

PHẦN 9 — SỨC KHỎE & THỂ TRẠNG (180-240 từ)

Sức khỏe Tử Bình xét theo hành Nhật Can + cường nhược + xung khắc trong tứ trụ. Đừng nói "ngũ hành" suông — diễn giải thành cơ quan / hệ thống cụ thể.

Ý cần truyền đạt:
① Hệ cơ quan dễ yếu nhất theo hành Nhật Can:
   - Mộc = gan, mật, hệ thần kinh, mắt
   - Hỏa = tim, mạch máu, ruột non, lưỡi
   - Thổ = tỳ vị, dạ dày, da, hệ tiêu hóa
   - Kim = phổi, đại tràng, hệ hô hấp, da
   - Thủy = thận, bàng quang, hệ sinh dục, xương
② Cường độ thể chất: bản thân vượng = thể chất khỏe, sức bền tốt nhưng dễ thừa khí huyết, nóng trong, áp lực cao; bản thân nhược = thể chất yếu, dễ mệt, dễ ốm, dễ trầm cảm.
③ Hình xung trong tứ trụ chỉ dấu bộ phận yếu cụ thể (xung trụ năm = đầu / nội tạng tiên thiên; xung trụ tháng = lồng ngực / hô hấp; xung trụ ngày = vợ chồng / hệ sinh dục; xung trụ giờ = đường con / chân tay).
④ Dấu hiệu bệnh đặc biệt nếu có (hành Nhật Can quá vượng/quá suy, đảo thực, ngũ hành thiên khô).

KHÔNG chẩn đoán y khoa — chỉ gợi ý hướng QUAN SÁT. Kết bài **lời khuyên** sinh hoạt: chế độ ăn (theo hành), thói quen tập, kiểm tra sức khỏe định kỳ ở hệ nào.`;

  if (phan === 10) return `

PHẦN 10 — CÁC MỐI QUAN HỆ ĐỘNG (200-260 từ)

Hợp/xung/hình/hại giữa các chi và can là động lực biến đổi đời sống. Đừng dùng "lục xung", "tam hình" — dịch ra "xung khắc trong tứ trụ", "ba mối hình hại".

Ý cần truyền đạt:
① **Lực hợp** (tam hợp, lục hợp, can hợp): Có cặp nào hợp tốt không? Hợp ra hành gì có lợi cho bản thân? Đời sống có "hậu phương" hay không? Hợp tốt = nhiều quý nhân, hậu vận an, hợp ngẫm giảm stress.
② **Lực xung** (lục xung): Có xung không, xung ở trụ nào của đời?
   - Xung trụ Năm: gia đình, cha mẹ, gốc gác bất ổn từ nhỏ
   - Xung trụ Tháng: anh em, môi trường công việc, ý chí
   - Xung trụ Ngày: vợ chồng, hôn nhân biến động
   - Xung trụ Giờ: con cái, hậu vận, sức khỏe cuối đời
③ **Lực hình** (tam hình): "Vô ân" (không biết ơn — quan hệ rạn nứt), "vô lễ" (lệch lạc đạo nghĩa — bất tín, bất nghĩa). Hình nhẹ hơn xung nhưng kéo dài, gây phiền phức ngầm.
④ **Lực hại** (lục hại): Lực thầm lặng — đè nén, ấm ức, không nói ra được. Hại ở vị trí nào thì khu vực đó âm thầm có chuyện.

Kết bài **lời khuyên** thực tế: với mỗi xung lớn → nên hóa giải bằng phương vị (đi xa hướng kỵ, ở hướng hợp), bạn đời tuổi gì hỗ trợ, môi trường sống thế nào, hoặc hoạt động cụ thể (tu tâm, làm phước, tránh nghề có yếu tố xung).`;

  if (phan === 11) return `

PHẦN 11 — DẤU HIỆU PHỤ (180-240 từ)

Thần sát là dấu hiệu phụ — không quyết định lớn nhưng tô đậm sắc thái cuộc đời. Chỉ đề cập những thần sát THỰC SỰ XUẤT HIỆN trong lá số, đừng kể lý thuyết suông.

Ý cần truyền đạt (tùy theo lá số có gì):
① **Quý nhân che chở**: Thiên Ất Quý Nhân, Thiên Đức, Nguyệt Đức — có nghĩa là người này có quý nhân ngầm, gặp khó hay được giúp. Đặt ở trụ nào thì hỗ trợ giai đoạn đó.
② **Sao học hành**: Văn Xương, Học Đường — thông minh, có duyên với chữ nghĩa, học giỏi, có thể đi xa nhờ tri thức.
③ **Sao duyên & tình**: Đào Hoa, Hồng Diễm — sức hút, duyên dáng, dễ thu hút người khác phái, nhưng nếu kết hợp xấu thì là dấu hiệu đa đoan tình duyên, dễ ngoài luồng.
④ **Sao uy / sát khí**: Dương Nhẫn — uy mạnh, có khí phách, làm tướng được, nhưng dễ tự tổn thương; Kình Dương cùng nghĩa.
⑤ **Sao cô độc**: Cô Thần & Quả Tú — cô độc về già, ít con, hoặc cô đơn trong tâm hồn dù sống chung gia đình.
⑥ **Sao trống rỗng**: Không Vong — làm trống ý nghĩa của trụ chứa nó (Không Vong ở trụ Phu Thê = hôn nhân lạnh nhạt; ở trụ Tài = tiền vào ra trống không).
⑦ **Sao di chuyển**: Dịch Mã — đi xa, xuất hành, làm việc liên quan giao thông / xuất ngoại / di chuyển nhiều.

Mỗi dấu hiệu xuất hiện phải nói **vì sao quan trọng với người này** + **ứng dụng thực tế**: nên phát huy / nên đề phòng / nên chuẩn bị tinh thần.`;

  if (phan === 12) return `

PHẦN 12 — TỔNG QUAN ĐẠI VẬN (CÁC GIAI ĐOẠN 10 NĂM)

Đại vận chia đời thành 9 giai đoạn, mỗi giai đoạn 10 năm. Mỗi giai đoạn có khí riêng, ảnh hưởng khác nhau lên cuộc đời.

Trước văn xuôi, lập bảng tổng hợp 9 đại vận đối chiếu với biểu đồ đã có ở trên:

| GĐ | Tuổi | Can Chi | Vai trò | Đánh giá |
| 1 | (start)–(end) | Can Chi | (thập thần dịch nghĩa: "giai đoạn sự nghiệp / tiền bạc / sáng tạo / học vấn / anh em") | Score X.X — thuận / trung / nghịch |
... (tới giai đoạn 9)

Sau bảng, viết nhận xét tổng (250-350 từ, văn xuôi liền mạch):

① **Giai đoạn ĐẸP NHẤT**: Đại vận nào điểm cao nhất, vào tuổi bao nhiêu, đó là **đỉnh cao đời** — nên chuẩn bị / dành sức / dồn lực vào giai đoạn này (sự nghiệp / kinh doanh lớn / chuyển ngành / lập gia đình lớn, v.v.).
② **Giai đoạn KHÓ NHẤT**: Đại vận nào điểm thấp nhất, vào tuổi bao nhiêu, vì sao khó (kỵ thần, xung, phá cách)? Nói cụ thể giai đoạn đó dễ gặp gì trong đời sống thực (mất việc / bệnh / hôn nhân vỡ / mất tiền / kiện tụng).
③ **Xu hướng tổng**: Đời này phát SỚM (đầu đời thuận, cuối đời lụi) hay phát MUỘN (đầu đời lận đận, cuối đời an nhàn) hay đều đều? Người phát sớm phải biết giữ; phát muộn phải biết chờ.
④ **Mốc giao thời quan trọng**: Có giai đoạn chuyển vận biên độ điểm lớn không? Đó là **bước ngoặt cần chuẩn bị** trước 1-2 năm.

Kết bài **lời khuyên** xuyên suốt cuộc đời: nên dồn lực vào giai đoạn nào, nên thủ thế giai đoạn nào, không nên cố ép thành công ở giai đoạn xấu.`;

  if (phan === 13) return `

PHẦN 13 — GIAI ĐOẠN HIỆN TẠI (220-300 từ)

Giai đoạn 10 năm đang sống ở thời điểm hiện tại — quan trọng nhất, thiết thực nhất.

Tìm "Đại Vận hiện tại" trong dữ liệu. Viết văn xuôi liền mạch:

① **Tính chất giai đoạn**: Can chi gì, vai trò là gì với Nhật Can (sự nghiệp / tiền bạc / sáng tạo / học vấn / anh em — DỊCH NGHĨA cụ thể không nói thuật ngữ suông). Hành vận hợp với "la bàn" của bản thân hay nghịch?
② **Đánh giá tổng**: Score bao nhiêu, vì sao điểm như vậy? Đọc các "Yếu tố" (factors) trong dữ liệu — diễn giải các yếu tố CHỦ ĐẠO ảnh hưởng giai đoạn này.
③ **Diễn ra trong đời thực**: Người này trong giai đoạn này dễ gặp gì cụ thể?
   - Thuận sự nghiệp = thăng chức / mở rộng / chuyển công ty tốt
   - Thuận tài = kiếm được tiền lớn / đầu tư có lãi / mở doanh nghiệp
   - Thuận hôn nhân = lập gia đình / cải thiện quan hệ
   - Nghịch quan = mất việc / kiện tụng / áp lực sếp
   - Nghịch tài = phá tài / lừa đảo / hùn hạp thất bại
   - Nghịch ấn = mất quý nhân / mất mẹ / học hành đứt gánh
④ **Cảnh báo cụ thể**: Nếu có yếu tố tiêu cực mạnh (xung Nhật Chi / phá cách / kỵ thần), nói rõ NĂM nào trong giai đoạn này dễ "nổ" + biểu hiện thực tế.

Kết bài 2-3 câu **lời khuyên** áp dụng được TRONG GIAI ĐOẠN NÀY: nên/không nên làm gì cụ thể, đầu tư hướng nào, tránh đối tác kiểu gì, có nên thay đổi lớn (đổi nghề, đổi nhà, lập gia đình) không.`;

  if (phan === 14) return `

PHẦN 14 — GIAI ĐOẠN KẾ TIẾP (180-240 từ)

Giai đoạn 10 năm sắp tới — chuẩn bị từ bây giờ.

Tìm "Đại Vận kế tiếp" trong dữ liệu. Viết văn xuôi:

① **So sánh với giai đoạn hiện tại**: Tốt hơn hay khó hơn? Điểm khác biệt cốt lõi là gì? Đời sang trang theo hướng nào?
② **Tính chất giai đoạn kế**: Can chi, vai trò với Nhật Can (DỊCH NGHĨA). Hành vận có hợp với "la bàn" bản thân không?
③ **3 cơ hội rõ rệt** trong giai đoạn này: cụ thể là gì trong đời sống thực (thăng chức / mở doanh nghiệp / lập gia đình / mua nhà / chuyển ngành / ra nước ngoài). Nói rõ.
④ **2 thách thức cần đề phòng**: tương tự, nói cụ thể, không trừu tượng.

Kết bài bằng **lời khuyên CHUẨN BỊ TỪ BÂY GIỜ**: 2-3 việc cụ thể nên bắt đầu trước khi giai đoạn mới đến (học kỹ năng gì, tích lũy gì, kết nối ai, dứt bỏ điều gì). Đây là phần thực dụng nhất — phải áp dụng được ngay.`;

  if (phan === 15) return `

PHẦN 15 — NĂM XEM (LƯU NIÊN) (220-300 từ)

Lưu niên là khí của một năm cụ thể — biến số trong khung 10 năm. Năm này có riêng can chi, tương tác với cả tứ trụ và giai đoạn hiện tại. Theo cổ pháp, **thiên can quan trọng hơn địa chi** trong năm.

Tìm "LƯU NIÊN" trong dữ liệu. Viết văn xuôi:

① **Khí của năm**: Can chi năm, vai trò với Nhật Can (sự nghiệp / tiền bạc / sáng tạo / học vấn — DỊCH NGHĨA). Năm này đem cái gì đến?
② **Đánh giá tổng**: Score bao nhiêu, vì sao? Yếu tố nào nâng điểm, yếu tố nào hạ điểm?
③ **Quan hệ với tứ trụ**:
   - Năm hợp với chi tứ trụ → việc gì THUẬN trong năm (cưới, mua nhà, ký hợp đồng, chuyển nghề)
   - Năm xung chi tứ trụ → việc gì KHÓ (xung trụ Ngày = vợ chồng cãi vã / chia tay; xung trụ Tháng = mất việc; xung trụ Năm = chuyện gia đình lớn)
④ **Quan hệ với giai đoạn 10 năm hiện tại**:
   - Năm tốt + giai đoạn tốt = năm bội thu, dồn việc lớn vào năm này
   - Năm xấu + giai đoạn xấu = năm khó nhất 10 năm, nên thủ thế tuyệt đối
   - Chéo nhau (1 tốt 1 xấu) = năm cân bằng, không nên kỳ vọng quá

Kết bài **lời khuyên cho năm này**: 2-3 việc CỤ THỂ nên làm trong năm + 2-3 việc KHÔNG NÊN làm. Phải đủ thực dụng để người đọc áp dụng được hôm nay.`;

  if (phan === 16) return `

PHẦN 16 — TỔNG KẾT ĐỜI NGƯỜI (280-380 từ, văn xuôi liền mạch — KHÔNG bullet, KHÔNG đánh số)

Đây là phần cuối — đúc kết toàn bộ lá số thành 1 bức tranh tổng thể, để người đọc gấp lại, ngẫm và áp dụng vào cuộc sống.

Văn phong: trầm tĩnh, có chiều sâu, giọng người từng trải nhìn người khác từ trên cao xuống — không phán định, không hứa hẹn, không hoa mỹ.

Đoạn 1 — **Bản chất con người này** (3-4 câu cô đọng): Người kiểu gì, điểm mạnh cốt lõi, điểm yếu căn bản, một nét riêng đáng nhớ.

Đoạn 2 — **Đường đời tổng thể**: Phát sớm hay muộn, quý lộ hay phú lộ, đời êm hay gập ghềnh, có giai đoạn nào quyết định cả cuộc đời.

Đoạn 3 — **3 ưu thế lớn** (cụ thể, đời thường, không trừu tượng): mỗi ưu thế 1-2 câu giải thích vì sao là ưu thế và **nên phát huy thế nào**.

Đoạn 4 — **3 điểm cần đề phòng**: mỗi điểm nói rõ biểu hiện trong đời sống và **cách hóa giải / né tránh** cụ thể (chọn nghề / môi trường / bạn đời / hướng nhà / phương vị / hành vi).

Đoạn cuối — **Lời khuyên đúc kết**: 3-4 câu súc tích về phương hướng sống / làm việc / tu dưỡng phù hợp nhất với mệnh số. Đây là phần đọng lại lâu nhất — phải có giá trị áp dụng được trong cả 10 năm tới.`;

  return `\nPhần ${phan}: Luận giải theo Bát Tự đã cho.`;
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
  const { batTuText, phan, docs, pregenContext } = body as { batTuText?: string; phan?: number; docs?: string; pregenContext?: string };
  if (!batTuText || !phan) return err('Thiếu dữ liệu (cần batTuText + phan)', 400);

  const phanNum = Number(phan);
  const phanInfo = PHAN_INFO[phanNum];
  if (!phanInfo) return err(`Phần ${phanNum} không tồn tại (1-16)`, 400);

  let parts;
  try {
    parts = buildPromptTuBinh(phanNum, batTuText, docs, pregenContext);
  } catch (e: unknown) {
    return err('buildPrompt error: ' + (e as Error).message);
  }

  // Build user content với 4 blocks — multiple cache breakpoints
  // System prompt cached → ~1500 tokens
  // Block 1 batTu cached → constant per lá số (~1500 tokens) — hit cho cả 16 phần
  // Block 2 docs cached → constant trong cùng group (~1500-2500 tokens)
  // Block 3 pregenContext varies per phần (~200-800 tokens) — không cache
  // Block 4 instructions varies → ~300-500 tokens không cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userContent: any[] = [
    { type: 'text', text: parts.batTuBlock, cache_control: { type: 'ephemeral' } },
  ];
  if (parts.docsBlock) {
    userContent.push({ type: 'text', text: parts.docsBlock, cache_control: { type: 'ephemeral' } });
  }
  if (parts.pregenBlock) {
    userContent.push({ type: 'text', text: parts.pregenBlock });
  }
  userContent.push({ type: 'text', text: parts.instrBlock });

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
        messages: [{ role: 'user', content: userContent }],
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
