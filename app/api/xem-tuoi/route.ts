// app/api/xem-tuoi/route.ts
// POST /api/xem-tuoi              → xem tuổi / làm ăn
// POST /api/xem-tuoi?action=chat           → chatbot
// POST /api/xem-tuoi?action=dat-ten-con    → đặt tên con
// POST /api/xem-tuoi?action=dat-ten-doanh-nghiep → đặt tên DN
// POST /api/xem-tuoi?action=chon-ngay-tot  → chọn ngày tốt
// 60 → 300: cùng lý do lasotuvi/route.ts — chuỗi fallback 3 provider tuần tự
// (Kimi → Opus 5 → Gemini Flash) + trần token đã nâng 50% dễ vượt 60s.
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { llmText, llmStreamResponse } from '@/lib/llm/complete';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { LUAN_ARC, MAU_ARC, DOC_ARC_TUONG_HOP, ARC_GIONG_NGU_HANH } from '@/lib/agent/prompts';
import { chuanHoaDauThanh } from '@/lib/vn-text';

// ─── Chat system prompts ──────────────────────────────────────
// ⚠️ ĐÂY LÀ BẢN CHÉP TAY, đứng ngoài `buildChatContext`. Nó phục vụ khung chat
// của HAI TRANG STANDALONE `xem-tuoi.html` + `xem-lam-an.html` (chúng gọi
// `/api/xem-tuoi?action=chat`, không nạp `shell.js`).
// 🔴 Luật cũ ở đây đã tự mâu thuẫn với phần còn lại của site: "120-250 từ" và
// "Dẫn chứng sao tinh, cung vị, can chi cụ thể" — tức BẮT mở câu bằng thuật ngữ,
// đúng thứ arc vừa bỏ. Sửa `prompts.ts` mà quên chỗ này thì hai trang đó vẫn
// nói giọng cũ, và người dùng gặp hai giọng khác nhau trên cùng một site.
// ⇒ Nay nội suy THẲNG `LUAN_ARC` + `MAU_ARC` dùng chung; chỉ giữ lại phần luật
// riêng của route (không bullet/emoji, ngôn ngữ xác suất cho tương lai, không
// lộ trường phái). Bộ trích context thì CỐ Ý giữ bản riêng: nó đọc thêm shape
// tương hợp (`_lsA`, `_partnerLaso`) mà bản chung không có — gỡ nốt là một lượt
// refactor khác, rủi ro hơn hẳn phần luật.
const CHAT_RIENG_XEM_TUOI = `- Tiếng Việt, không dùng bullet, không dùng emoji
- Riêng kết quả tương lai mới dùng ngôn ngữ xác suất, không hứa hẹn tuyệt đối
- Không tiết lộ trường phái hay tài liệu`;

const CHAT_SYSTEM_LASO = (ctx: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, luận giải sâu sắc, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Bạn đang trả lời trên nền tảng Tử Vi Minh Bảo.

${LUAN_ARC}

${MAU_ARC}

Nguyên tắc:
${CHAT_RIENG_XEM_TUOI}

=== DỮ LIỆU LÁ SỐ ===
${ctx}`;

const CHAT_SYSTEM_GENERAL = `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, luận giải sâu sắc, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Bạn đang trả lời trên nền tảng Tử Vi Minh Bảo.

${LUAN_ARC}

${MAU_ARC}

Nguyên tắc:
${CHAT_RIENG_XEM_TUOI}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmtLaso(ls: any, label: string, q: string): string {
  if (!ls) return '';
  const palaces = ls.palaces || [];
  const topics: Record<string, string[]> = {
    'tài chính|tài lộc|tiền|thu nhập|làm giàu|tài bạch': ['Tài Bạch', 'Phúc Đức'],
    'sự nghiệp|công việc|nghề|quan lộc|thăng tiến':       ['Quan Lộc', 'Mệnh'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm|phu thê':      ['Phu Thê', 'Mệnh'],
    'con cái|con cháu|tử tức':                             ['Tử Tức'],
    'sức khỏe|bệnh|thân thể|tật ách':                     ['Tật Ách'],
    'nhà đất|bất động sản|điền trạch':                    ['Điền Trạch'],
    'anh em|huynh đệ':                                     ['Huynh Đệ'],
    'bạn bè|nô bộc|nhân viên|đối tác':                    ['Nô Bộc'],
    'du lịch|di chuyển|thiên di|nước ngoài':               ['Thiên Di'],
    'cha mẹ|phụ mẫu':                                      ['Phụ Mẫu'],
    'đại vận|tiểu vận|vận hạn|vận trình':                 ['__daiVan__'],
  };
  // Dò trên bản ĐÃ CHUẨN HOÁ VỊ TRÍ DẤU THANH (lib/vn-text.ts) — "sức khoẻ" và
  // "sức khỏe" đều đúng chính tả, so chuỗi thô thì gõ lối kia là TRƯỢT IM LẶNG
  // rồi rơi xuống nhánh mặc định, mất đúng cung câu hỏi nhắm tới.
  const qn = chuanHoaDauThanh(q);
  const relevant = new Set(['Mệnh']);
  for (const [pattern, names] of Object.entries(topics)) {
    if (new RegExp(chuanHoaDauThanh(pattern), 'i').test(qn)) names.forEach(n => relevant.add(n));
  }
  if (relevant.size === 1) ['Quan Lộc', 'Tài Bạch', 'Phu Thê'].forEach(n => relevant.add(n));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const starFmt = (s: any): string => {
    if (!s) return '';
    if (typeof s !== 'object') return String(s);
    let t = s.ten || '';
    if (s.brightness) t += '(' + s.brightness + ')';
    if (s.hoa)        t += '[Hóa ' + s.hoa + ']';
    return t;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const starName = (s: any) => (typeof s === 'object' ? s.ten || '' : s || '');

  let ctx = '\n=== ' + label + ' ===\n';
  ctx += 'Năm sinh: ' + (ls.canChiNam||'') + ' | Nạp Âm: ' + (ls.napAm||'') + ' (' + (ls.napAmHanh||'') + ')\n';
  ctx += 'Cung Mệnh: ' + (ls.menhDC||'') + ' | Cung Thân: ' + (ls.thanDC||'') + '\n';
  if (ls.tuoiXem) ctx += 'Tuổi xem: ' + ls.tuoiXem + '\n';
  if (ls.cachCuc?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = ls.cachCuc.map((c: any) =>
      typeof c === 'object' ? c.ten + (c.loai ? ` (${c.loai})` : '') : c
    ).filter(Boolean);
    if (cc.length) ctx += 'Cách cục: ' + cc.join(', ') + '\n';
  }
  if (ls.daiVanHienTai) {
    const dv = ls.daiVanHienTai;
    const dvCung = palaces[dv.cungIdx] || {};
    ctx += 'Đại Vận hiện tại: ' + (dv.diaChi||'') + ' (' + (dv.tuoiStart||'') + '–' + (dv.tuoiEnd||'') + ' tuổi)';
    if (dvCung.cungName) ctx += ' — Cung ' + dvCung.cungName;
    const dvStars = (dvCung.majorStars||[]).map(starName).filter(Boolean);
    if (dvStars.length) ctx += ' — Sao: ' + dvStars.join(', ');
    if (dv.scoring?.tong != null) ctx += ' — Điểm vận: ' + dv.scoring.tong + '/10 ' + (dv.scoring.flag||'');
    ctx += '\n';
  }
  ctx += '\nCác cung liên quan:\n';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of palaces as any[]) {
    const pName = p.cungName || '';
    if (!relevant.has(pName) && !p.isMenh && !p.isThan) continue;
    ctx += '\n  [' + pName + '] ' + (p.diaChi||'') + (p.isMenh?' ★MỆNH':'') + (p.isThan?' ◆THÂN':'') + '\n';
    const chinh = (p.majorStars||[]).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '    Chính tinh: ' + chinh.join(', ') + '\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phu = (p.stars||[]).filter((s: any) => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(starFmt).filter(Boolean);
    if (phu.length) ctx += '    Phụ tinh: ' + phu.slice(0,8).join(', ') + '\n';
    if (p.thaiTueNhom?.ten) ctx += '    Thái Tuế: ' + p.thaiTueNhom.ten + ' — ' + (p.thaiTueNhom.yNghia||'') + '\n';
    const s = ls.cungScores?.[pName] || p.cungScores;
    if (s) {
      const dims = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop']
        .map(k => s[k]).filter((v: number) => typeof v === 'number');
      const tot = dims.length ? Math.round(dims.reduce((a: number, b: number) => a + b, 0) / dims.length * 10) / 10 : null;
      ctx += '    Điểm cung: ' + (tot != null ? tot + '/10 ' : '') + '(TN=' + (s.tiemNang||0) + ' BV=' + (s.benVung||0) + ' AT=' + (s.anToan||0) + ' QN=' + (s.quyNhan||0) + ' MB=' + (s.minhBach||0) + ' TH=' + (s.tuongHop||0) + ') [≥7 tốt · 5-6.9 trung bình · <5 yếu]\n';
    }
  }
  if (relevant.has('__daiVan__') && ls.daiVans?.length) {
    ctx += '\nDanh sách Đại Vận:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ls.daiVans.slice(0,9).forEach((dv: any, i: number) => {
      const dvP = palaces[dv.cungIdx] || {};
      const stars = (dvP.majorStars||[]).map(starName).filter(Boolean);
      ctx += '  ĐV' + (i+1) + ': ' + (dv.diaChi||'') + ' ' + dv.tuoiStart + '–' + dv.tuoiEnd + 't cung=' + (dvP.cungName||'?');
      if (stars.length) ctx += ' sao=' + stars.join(',');
      if (dv.scoring?.tong != null) ctx += ' điểm=' + dv.scoring.tong + '/10';
      ctx += '\n';
    });
  }
  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLasoContext(lasoData: any, question: string): string {
  if (!lasoData) return '';
  const q = (question || '').toLowerCase();
  if (lasoData._mode === 'tuongHop' || lasoData._partnerLaso) {
    const lsA = lasoData._lsA || lasoData;
    const lsB = lasoData._lsB || lasoData._partnerLaso;
    const nameA = lasoData._nameA || lsA._nameA || 'Người A';
    const nameB = lasoData._nameB || lsA._nameB || 'Người B';
    return 'CHẾ ĐỘ: So sánh tương hợp 2 lá số\n' + fmtLaso(lsA, nameA, q) + fmtLaso(lsB, nameB, q);
  }
  return fmtLaso(lasoData, 'Lá Số', q);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChat(body: any): Promise<Response> {
  const { messages, lasoData, docs } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasLaso = !!(lasoData?.palaces?.length || lasoData?._lsA?.palaces?.length || (lasoData?._partnerLaso && lasoData?.palaces?.length));
  const isTuongHop = !!(lasoData?._mode === 'tuongHop' || lasoData?._partnerLaso);

  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';
  let systemPrompt: string;
  if (hasLaso && isTuongHop) {
    systemPrompt = CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ)) + docsSection + `

Lưu ý đặc biệt: Đây là chế độ so sánh tương hợp 2 lá số. Khi trả lời, hãy:
- Phân tích mối tương quan giữa 2 lá số, không chỉ 1 người
- Dẫn chứng cụ thể từ cả 2 cung vị liên quan
- Nêu rõ điểm tương hợp, xung khắc nếu có`;
  } else if (hasLaso) {
    systemPrompt = CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ)) + docsSection;
  } else {
    systemPrompt = CHAT_SYSTEM_GENERAL + docsSection;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trimmed = messages.slice(-10).map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  try {
    const answer = await llmText({ system: systemPrompt, messages: trimmed, maxTokens: 1200 });
    return ok({ answer, scenario: hasLaso ? 'laso' : 'general' });
  } catch (e: unknown) {
    return err('API error: ' + (e as Error).message);
  }
}

// ─── Streaming helper ────────────────────────────────────────
// Provider-agnostic (Gemini-primary + Anthropic-backup) qua lib/llm/complete.
// GIỮ NGUYÊN shape SSE mà frontend parse: data:{t} / {err} / [DONE].
async function streamAnthropicResponse(system: string, user: string, maxTokens: number): Promise<Response> {
  return llmStreamResponse({ system, prompt: user, maxTokens }, 'delta');
}

// ─── Đặt tên con ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDatTenCon(body: any): Promise<Response> {
  const { ho, gioiTinh, namSinhCon, canChiCon, napAmCon, canChiBo, napAmBo, canChiMe, napAmMe } = body;
  if (!ho || !namSinhCon || !canChiCon) return err('Thiếu thông tin', 400);

  const system = `Bạn là chuyên gia đặt tên con theo ngũ hành và Hán Việt học cổ điển.

Cơ sở luận tên (chỉ dùng các cơ sở sau):
1. Ngũ hành nạp âm — Lục Thập Hoa Giáp: xác định hành cần bổ trợ dựa trên sinh khắc giữa con, bố, mẹ
2. Ý nghĩa chữ Hán — tra từ điển Hán Việt: chọn chữ có nghĩa tốt, phù hợp nguyện vọng
3. Âm Hán Việt thanh tao, phát âm đẹp và tự nhiên trong tiếng Việt

KHÔNG dùng: hệ thống 81 số nét cát hung (do người Nhật thế kỷ 20 phát triển, không có cơ sở cổ pháp Trung Hoa). Nếu có ghi số nét Khang Hy, ghi rõ "chỉ để tham khảo — không luận cát hung từ số nét".

Ngũ hành sinh: Mộc→Hỏa→Thổ→Kim→Thủy→Mộc
Ngũ hành khắc: Mộc→Thổ, Thổ→Thủy, Thủy→Hỏa, Hỏa→Kim, Kim→Mộc

Format: Trả về 3 nhóm (mỗi nhóm 4 tên), tiêu đề nhóm theo mức ưu tiên ngũ hành. Mỗi tên:
**[Họ + Tên đầy đủ]** — Chữ Hán: [chữ] · Âm HV: [âm] · Nghĩa: [nghĩa ngắn gọn] · Hành chữ: [hành] · Phù hợp vì: [1 câu lý do ngũ hành]

${ARC_GIONG_NGU_HANH}`;

  const user = `Đặt tên cho con:
- Họ: ${ho} | Giới tính: ${gioiTinh}
- Năm sinh con: ${namSinhCon} (${canChiCon}) — Nạp âm: ${napAmCon}
- Bố: năm sinh ${canChiBo} — Nạp âm: ${napAmBo}
- Mẹ: năm sinh ${canChiMe} — Nạp âm: ${napAmMe}

Trước khi gợi ý tên, hãy viết 2–3 câu phân tích ngũ hành của gia đình và hành cần bổ trợ cho con. Sau đó gợi ý 12 tên phù hợp chia 3 nhóm.`;

  return streamAnthropicResponse(system, user, 4000);
}

// ─── Đặt tên doanh nghiệp ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDatTenDoanhNghiep(body: any): Promise<Response> {
  const { hoTen, namSinh, canChiChu, napAmChu, linhVuc, loaiHinh, maSo } = body;
  if (!hoTen || !namSinh || !linhVuc) return err('Thiếu thông tin', 400);

  const system = `Bạn là chuyên gia tư vấn đặt tên thương hiệu/doanh nghiệp theo ngũ hành và ngôn ngữ học.

Cơ sở tư vấn:
1. Ngũ hành nạp âm chủ doanh nghiệp — xác định hành cần bổ trợ
2. Âm thanh và ý nghĩa tên — dễ nhớ, dễ phát âm, phù hợp ngành nghề
3. Chữ Hán nếu dùng — phải có ý nghĩa thực sự, không gượng ép
4. Tính khả dụng thực tiễn — không trùng thương hiệu lớn, phù hợp đăng ký

KHÔNG dùng: số nét cát hung, phong thủy màu sắc mà không có cơ sở. Trung thực về giới hạn: đây là gợi ý tham khảo, không đảm bảo thành công kinh doanh.

Format: 3 nhóm × 4 tên. Mỗi tên:
**[Tên đề xuất]** — Ý nghĩa: [giải thích] · Hành: [hành tên] · Ngũ hành phù hợp: [lý do] · Ghi chú thực tiễn: [1 câu]

${ARC_GIONG_NGU_HANH}`;

  const user = `Đặt tên doanh nghiệp:
- Chủ: ${hoTen} | Năm sinh: ${namSinh} (${canChiChu}) — Nạp âm: ${napAmChu}
- Lĩnh vực: ${linhVuc}
- Loại hình: ${loaiHinh}
${maSo ? `- Mã số ngành: ${maSo}` : ''}

Phân tích ngắn ngũ hành phù hợp cho lĩnh vực này, sau đó gợi ý 12 tên chia 3 nhóm: Tên Thuần Việt / Tên Hán Việt / Tên Kết Hợp.`;

  return streamAnthropicResponse(system, user, 4000);
}

// ─── Chọn ngày tốt ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChonNgayTot(body: any): Promise<Response> {
  const { suKien, hoTen, namSinh, canChiNguoi, napAmNguoi, thangCanChi, namCanChi, thangNum, namNum } = body;
  if (!suKien || !namSinh || !thangNum || !namNum) return err('Thiếu thông tin', 400);

  const system = `Bạn là chuyên gia tư vấn chọn ngày tốt theo nguyên lý Tứ Trụ và ngũ hành.

Cơ sở phân tích:
1. Ngũ hành nạp âm người chính — hành nào tương sinh/tương hợp
2. Can chi tháng mục tiêu — xét sinh khắc với người
3. Nguyên lý địa chi: Lục Hợp (Tý-Sửu, Dần-Hợi, Mão-Tuất, Thìn-Dậu, Tỵ-Thân, Ngọ-Mùi), Tam Hợp, Lục Xung — để tìm ngày địa chi thuận
4. Theo loại sự kiện: nguyên tắc cổ truyền phù hợp (cưới hỏi, khai trương, nhập trạch...)

Giới hạn trung thực: Không có cơ sở dữ liệu Thông Thư thực tế — phân tích dựa trên nguyên lý. Khuyến khích đối chiếu với lịch vạn niên cụ thể trước khi quyết định.

Format: Gợi ý 4–5 khoảng thời gian tốt trong tháng, mỗi khoảng gồm:
**[Ngày X–Y tháng Z]** — Can chi ngày: [...] · Lý do: [nguyên lý cụ thể] · Phù hợp vì: [liên hệ với ngũ hành người] · Lưu ý: [điều cần tránh nếu có]

Cuối: 1 đoạn tổng hợp khuyến nghị và lưu ý thực tiễn.

${ARC_GIONG_NGU_HANH}`;

  const user = `Chọn ngày tốt cho sự kiện:
- Sự kiện: ${suKien}
- Người chính: ${hoTen} | Năm sinh: ${namSinh} (${canChiNguoi}) — Nạp âm: ${napAmNguoi}
- Tháng cần chọn: tháng ${thangNum}/${namNum} (${thangCanChi} — năm ${namCanChi})

Phân tích và gợi ý các khoảng ngày tốt trong tháng này cho sự kiện trên.`;

  return streamAnthropicResponse(system, user, 5000);
}

// ─── Route handlers ───────────────────────────────────────────
export async function OPTIONS() { return options(); }

// System cho bản luận giải 9 phần của Xem Tuổi / Xem Làm Ăn (POST không kèm
// `action`). Ngân sách từ + dữ kiện từng phần do CLIENT gửi trong `prompt`
// (`xem-tuoi.html` · `xem-lam-an.html` · `app-xem-tuoi.html`) — ở đây CHỈ khai
// hình dạng và giọng, để một chỗ này phủ cả ba bề mặt.
const LUAN_GIAI_TUONG_HOP_SYSTEM = `Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Viết văn xuôi, không dùng bullet. Không tiết lộ trường phái hay tài liệu.

MỞ ĐẦU mỗi phần bằng MỘT câu phán quyết NGẮN, in đậm (**...**), đứng riêng một dòng — nói bằng NGHĨA ĐỜI THƯỜNG trước (hai người hợp hay khắc ở CHỖ NÀO, ảnh hưởng ra sao tới sống chung, tiền bạc, con cái). Tên sao / can chi / ngũ hành nếu cần thì để gọn trong ngoặc theo SAU, KHÔNG mở đầu câu bằng tên. Rồi xuống dòng mới giải thích vì sao.

${DOC_ARC_TUONG_HOP}`;

async function runPost(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const body = await parseBody(request);
  const action = searchParams.get('action');

  if (action === 'chat')                  return handleChat(body);
  if (action === 'dat-ten-con')           return handleDatTenCon(body);
  if (action === 'dat-ten-doanh-nghiep')  return handleDatTenDoanhNghiep(body);
  if (action === 'chon-ngay-tot')         return handleChonNgayTot(body);

  const { prompt, docs } = body as { prompt?: string; docs?: string };
  if (!prompt) return err('Missing prompt', 400);
  const userPrompt = docs ? prompt + '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : prompt;

  try {
    const luanGiai = await llmText({
      system: LUAN_GIAI_TUONG_HOP_SYSTEM,
      prompt: userPrompt,
      maxTokens: 1800,
    });
    return ok({ luanGiai });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// S1 (track COO) — bọc để tự ghi lượt chạy thành công/hỏng vào `events`.
// Chỉ QUAN SÁT: ngoại lệ vẫn ném lại nguyên vẹn, Response trả về không đổi.
export async function POST(request: NextRequest) {
  return withToolOutcome('xem-tuoi', () => runPost(request));
}
