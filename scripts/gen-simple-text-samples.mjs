#!/usr/bin/env node
/**
 * Sinh bản mẫu cho 4 tool đi qua `/api/xem-tuoi` (route DÙNG CHUNG cho cả bốn,
 * app/api/xem-tuoi/route.ts) mà KHÔNG khớp khuôn `TOOL_CONFIGS` của
 * `gen-tool-sample.mjs` (khuôn đó neo cứng vào `computeLaso` → 1 `ls` →
 * `buildPromptCached`/schema JSON — bốn tool này đều lệch khỏi hình dạng đó):
 *
 *   - dat-ten-con, dat-ten-dn, chon-ngay-tot: KHÔNG dùng lá số Tử Vi — chỉ can
 *     chi/nạp âm tra từ năm sinh, 1 prompt tự do, trả văn xuôi (SSE khi chạy
 *     thật). System/user prompt CHÉP NGUYÊN VĂN từ handleDatTenCon/
 *     handleDatTenDoanhNghiep/handleChonNgayTot (route trên, không export).
 *   - xem-tuoi: CÓ lá số (2 người, so tương hợp) nhưng prompt của cả 9 phần
 *     được DỰNG NGAY TRONG JS TRÌNH DUYỆT (`buildPhanPrompt` trong
 *     app-xem-tuoi.html) — route chỉ relay `{prompt}` sang LLM, không hề có
 *     hàm build-prompt phía server để gọi lại như các tool khác. Port
 *     `buildPhanPrompt` NGUYÊN VĂN vào đây (đổi bên kia thì đổi Ở ĐÂY theo).
 *     `public/tuong-hop.js` (bộ tính tương hợp 8 chiều) và `public/can-chi.js`
 *     hoá ra đã có sẵn export kép (window.* cho trình duyệt, module.exports
 *     cho Node) — import thẳng được, không chép lại công thức.
 *
 *   npx tsx scripts/gen-simple-text-samples.mjs [dat-ten-con|dat-ten-dn|chon-ngay-tot|xem-tuoi|--all]
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { llmTextFull } from '../lib/llm/complete.ts';
import { ARC_GIONG_NGU_HANH, DOC_ARC_TUONG_HOP } from '../lib/agent/prompts.ts';
import { computeLaso } from '../lib/engine/laso.ts';
// `public/can-chi.js`/`public/tuong-hop.js` xuất kép (window.* ở trình duyệt,
// module.exports ở Node) — CÙNG MỘT nguồn cho cả hai phía, không chép công
// thức sang đây.
import CanChiPkg from '../public/can-chi.js';
const CanChi = CanChiPkg.ccInfo ? CanChiPkg : CanChiPkg.default;
import TuongHopPkg from '../public/tuong-hop.js';
const TuongHop = TuongHopPkg.calcTuongHop ? TuongHopPkg : TuongHopPkg.default;

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Thiếu biến môi trường ${name}`);
    process.exit(1);
  }
  return v;
}

const CONFIGS = {
  'dat-ten-con': {
    label: 'Đặt Tên Con',
    sample: { ho: 'Nguyễn', gioiTinh: 'nu', namSinhCon: 2026, namBo: 1990, namMe: 1992 },
    outPath: join(ROOT, 'public/samples/dat-ten-con-sample.json'),
    build(s) {
      const iCon = CanChi.ccInfo(s.namSinhCon);
      const iBo = CanChi.ccInfo(s.namBo);
      const iMe = CanChi.ccInfo(s.namMe);
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
- Họ: ${s.ho} | Giới tính: ${s.gioiTinh}
- Năm sinh con: ${s.namSinhCon} (${iCon.canChi}) — Nạp âm: ${iCon.napAm}
- Bố: năm sinh ${iBo.canChi} — Nạp âm: ${iBo.napAm}
- Mẹ: năm sinh ${iMe.canChi} — Nạp âm: ${iMe.napAm}

Trước khi gợi ý tên, hãy viết 2–3 câu phân tích ngũ hành của gia đình và hành cần bổ trợ cho con. Sau đó gợi ý 12 tên phù hợp chia 3 nhóm.`;
      return { system, user, maxTokens: 4000 };
    },
  },
  'dat-ten-dn': {
    label: 'Đặt Tên Doanh Nghiệp',
    sample: { tenChu: 'Trần Văn Bình', namChu: 1985, nganh: 'Ăn uống / F&B / nhà hàng', loaiHinh: 'Công ty', tenGoiY: '' },
    outPath: join(ROOT, 'public/samples/dat-ten-dn-sample.json'),
    build(s) {
      const iChu = CanChi.ccInfo(s.namChu);
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
- Chủ: ${s.tenChu} | Năm sinh: ${s.namChu} (${iChu.canChi}) — Nạp âm: ${iChu.napAm}
- Lĩnh vực: ${s.nganh}
- Loại hình: ${s.loaiHinh}

Phân tích ngắn ngũ hành phù hợp cho lĩnh vực này, sau đó gợi ý 12 tên chia 3 nhóm: Tên Thuần Việt / Tên Hán Việt / Tên Kết Hợp.`;
      return { system, user, maxTokens: 4000 };
    },
  },
  'chon-ngay-tot': {
    label: 'Chọn Ngày Tốt',
    sample: { suKien: 'Khai trương', hoTen: 'Lê Thị Hoa', namSinh: 1990, thangNum: 11, namNum: 2026 },
    outPath: join(ROOT, 'public/samples/chon-ngay-tot-sample.json'),
    build(s) {
      const info = CanChi.ccInfo(s.namSinh);
      const thangCC = CanChi.ccThangCanChi(s.thangNum, s.namNum);
      const namCC = (CanChi.ccInfo(s.namNum) || {}).canChi || '';
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
- Sự kiện: ${s.suKien}
- Người chính: ${s.hoTen} | Năm sinh: ${s.namSinh} (${info.canChi}) — Nạp âm: ${info.napAm}
- Tháng cần chọn: tháng ${s.thangNum}/${s.namNum} (${thangCC} — năm ${namCC})

Phân tích và gợi ý các khoảng ngày tốt trong tháng này cho sự kiện trên.`;
      return { system, user, maxTokens: 5000 };
    },
  },
};

async function runOne(toolId) {
  const cfg = CONFIGS[toolId];
  console.log(`\n=== ${cfg.label} (${toolId}) ===`);
  requireEnv('GEMINI_API_KEY');
  const { system, user, maxTokens } = cfg.build(cfg.sample);
  console.log('  đang gọi LLM…');
  const r = await llmTextFull({ system, prompt: user, maxTokens });
  const text = r.text.trim();
  console.log(`  OK (${text.length} ký tự, model ${r.model})`);
  mkdirSync(dirname(cfg.outPath), { recursive: true });
  writeFileSync(cfg.outPath, JSON.stringify({ input: cfg.sample, text }, null, 2));
  console.log(`✓ Ghi ${cfg.outPath}`);
}

// ── xem-tuoi (so tương hợp 2 người, 9 phần) ─────────────────────────────
// Lá số mẫu CỐ ĐỊNH — khác `SAMPLE_BIRTH`/`SAMPLE_BOND_PARTNER_BIRTH` của
// gen-tool-sample.mjs (file này KHÔNG chia sẻ hằng số với script đó, cố ý:
// hai script độc lập, đổi một bên không âm thầm đổi bên kia).
// `hourBranch` = chỉ số CHI giờ sinh (0-11, KHÔNG phải giờ đồng hồ) — HTML
// wiring (app-xem-tuoi.html) dùng cặp gioIdx/gioHour tương ứng: 3=Mão(6h),
// 9=Dậu(18h), khớp đúng quy ước `SAMPLE_BIRTH`/`SAMPLE_HH` của gen-tool-sample.mjs.
const XT_A = { day: 4, month: 12, year: 1989, hourBranch: 3, gender: 'nam', isLunar: false, name: 'Anh Khoa' };
const XT_B = { day: 17, month: 7, year: 1991, hourBranch: 9, gender: 'nu', isLunar: false, name: 'Chị Linh' };
const XT_NAM_XEM = 2026;
const XT_PHAN_LABELS = ['Tổng Quan', 'Xét Tuổi', 'Ngũ Hành', 'Tư Tưởng', 'Tính Cách', 'Quan Hệ', 'Con Cái', 'Tài Chính', 'Vận Hành'];
const XT_CUNG_MAP = [null, null, null, 'Mệnh', null, 'Phu Thê', 'Tử Tức', 'Tài Bạch', null];
const XT_SECTION_QUESTIONS = [
  '',
  'Hai người có hợp tuổi để tiến tới hôn nhân/gắn bó lâu dài không? Chênh lệch nạp âm này ai nên nhường, chiều ai nhiều hơn?',
  'Ngũ hành hai người tương sinh giúp đỡ nhau hay tương khắc dễ va chạm? Ai nên chủ động nhường để giữ hòa khí?',
  'Hai người có cùng chí hướng, quan điểm sống hay dễ bất đồng vì suy nghĩ khác biệt? Ai thường là người quyết định chính?',
  'Tính cách hai người hòa hợp trong sinh hoạt hàng ngày hay dễ va chạm vì tính khí trái ngược? Ai nóng ai nguội, ai nên nhường lúc cãi vã?',
  'Đời sống tình cảm, vợ chồng đôi bên có bền chặt, gắn bó hay tiềm ẩn nguy cơ rạn nứt, nhạt phai? Ai chung thủy, gắn bó hơn?',
  'Hai người có thuận lợi về đường con cái không — dễ có con, con cái ngoan hay vất vả? Con sinh ra hợp tính cha hay mẹ hơn?',
  'Kết hợp tài chính, làm ăn chung mang lại lợi ích hay dễ hao tổn, bất đồng vì tiền? Ai nên là người giữ tay hòm chìa khóa?',
  'Giai đoạn hiện tại của cả hai có đang thuận lợi để tiến xa (cưới, làm ăn chung, mua nhà) hay nên chờ thêm? Ai đang gặp vận khó hơn cần được đỡ đần?',
];
// Cùng LUAN_GIAI_TUONG_HOP_SYSTEM trong app/api/xem-tuoi/route.ts (không
// export) — bỏ đúng phần LUAN_ARC/MAU_ARC (chỉ dùng cho chat, không dùng cho
// đường luận giải 9 phần này).
const XT_SYSTEM = `Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Viết văn xuôi, không dùng bullet. Không tiết lộ trường phái hay tài liệu.

MỞ ĐẦU mỗi phần bằng MỘT câu phán quyết NGẮN, in đậm (**...**), đứng riêng một dòng — nói bằng NGHĨA ĐỜI THƯỜNG trước (hai người hợp hay khắc ở CHỖ NÀO, ảnh hưởng ra sao tới sống chung, tiền bạc, con cái). Tên sao / can chi / ngũ hành nếu cần thì để gọn trong ngoặc theo SAU, KHÔNG mở đầu câu bằng tên. Rồi xuống dòng mới giải thích vì sao.

${DOC_ARC_TUONG_HOP}`;

const XT_TH = { 'Dần': ['Ngọ', 'Tuất'], 'Ngọ': ['Dần', 'Tuất'], 'Tuất': ['Dần', 'Ngọ'], 'Thân': ['Tý', 'Thìn'], 'Tý': ['Thân', 'Thìn'], 'Thìn': ['Thân', 'Tý'], 'Tỵ': ['Dậu', 'Sửu'], 'Dậu': ['Tỵ', 'Sửu'], 'Sửu': ['Tỵ', 'Dậu'], 'Hợi': ['Mão', 'Mùi'], 'Mão': ['Hợi', 'Mùi'], 'Mùi': ['Hợi', 'Mão'] };
const XT_XC = { 'Tý': 'Ngọ', 'Ngọ': 'Tý', 'Sửu': 'Mùi', 'Mùi': 'Sửu', 'Dần': 'Thân', 'Thân': 'Dần', 'Mão': 'Dậu', 'Dậu': 'Mão', 'Thìn': 'Tuất', 'Tuất': 'Thìn', 'Tỵ': 'Hợi', 'Hợi': 'Tỵ' };
function xtStars(ls, cungName) {
  if (!ls || !ls.palaces) return '';
  const main = ls.palaces.find((p) => p.cungName === cungName);
  if (!main) return '';
  const dc = main.diaChi;
  const seen = {};
  const stars = [];
  [dc].concat(XT_TH[dc] || [], [XT_XC[dc]]).filter(Boolean).forEach((chi) => {
    const p = ls.palaces.find((p) => p.diaChi === chi);
    if (p) (p.majorStars || []).forEach((s) => { if (!seen[s.ten]) { seen[s.ten] = 1; stars.push(s.ten); } });
  });
  return stars.join(' ');
}

// Port NGUYÊN VĂN `buildPhanPrompt` (app-xem-tuoi.html) — pure function của
// `result` (đầu ra `TuongHop.calcTuongHop`), không đụng DOM nên port thẳng
// được, không cần chạy trong trình duyệt.
function xtBuildPhanPrompt(idx, m, result) {
  const nameA = result.nameA, nameB = result.nameB, lsA = result.lsA, lsB = result.lsB;
  const palMenhA = lsA.palaces && lsA.palaces.find((p) => p.isMenh);
  const palMenhB = lsB.palaces && lsB.palaces.find((p) => p.isMenh);
  if (idx === 0) {
    const itemsText = result.items.map((item, i) => `${i + 1}. ${item.label}: ${item.score}/10 — ${item.detail}`).join('\n');
    return `Phân tích tương quan lá số vợ chồng theo Tử Vi Đẩu Số cổ pháp:
${nameA}: ${lsA.canChiNam} · Nạp Âm ${result.naA} · Cung Mệnh ${palMenhA ? palMenhA.diaChi : '?'} · Chính tinh: ${((palMenhA && palMenhA.majorStars) || []).map((s) => s.ten).join(', ') || 'VCD'}
${nameB}: ${lsB.canChiNam} · Nạp Âm ${result.naB} · Cung Mệnh ${palMenhB ? palMenhB.diaChi : '?'} · Chính tinh: ${((palMenhB && palMenhB.majorStars) || []).map((s) => s.ten).join(', ') || 'VCD'}

Kết quả 8 yếu tố:
${itemsText}
Tổng điểm tương hợp: ${result.total}/100

Viết 300-350 từ văn xuôi. Nhận định tổng quan, điểm mạnh, điểm cần lưu ý, 1 lời khuyên thực tiễn. Dùng tên ${nameA} và ${nameB}.`;
  }
  const cungName = XT_CUNG_MAP[idx];
  const palA = cungName && lsA.palaces && lsA.palaces.find((p) => p.cungName === cungName);
  const palB = cungName && lsB.palaces && lsB.palaces.find((p) => p.cungName === cungName);
  const lines = [];
  lines.push(nameA + ': ' + (m.a || ''));
  lines.push(nameB + ': ' + (m.b || ''));
  lines.push('Tương quan: ' + (m.detail || '') + ' → Điểm ' + m.score + '/10');
  const MK = ['tiemNang', 'benVung', 'anToan', 'quyNhan', 'minhBach', 'tuongHop'];
  const MV = ['Tiềm Năng', 'Bền Vững', 'An Toàn', 'Quý Nhân', 'Minh Bạch', 'Tương Hợp'];
  const fmtSc = (sc) => (sc ? MK.map((k, i) => MV[i] + '=' + sc[k]).join(' · ') : '');
  if (idx === 1) {
    lines.push('Nạp Âm: ' + nameA + '=' + (lsA.napAm || result.naA) + ' · ' + nameB + '=' + (lsB.napAm || result.naB));
  } else if (idx === 2) {
    lines.push('Hành: ' + nameA + '=' + result.naA + ' · ' + nameB + '=' + result.naB);
  } else if (idx === 3) {
    const ccA = (lsA.cachCuc || []).filter((c) => c.cung === 'Mệnh' || c.cung === '');
    const ccB = (lsB.cachCuc || []).filter((c) => c.cung === 'Mệnh' || c.cung === '');
    const ynA = ((lsA.cachCucTungCung || {})['Mệnh'] || []);
    const ynB = ((lsB.cachCucTungCung || {})['Mệnh'] || []);
    const scA = (lsA.cungScores || {})['Mệnh'], scB = (lsB.cungScores || {})['Mệnh'];
    if (ccA.length) lines.push('Cách cục Mệnh ' + nameA + ': ' + ccA.map((c) => c.ten + (c.moTa ? ' — ' + c.moTa : '')).join(' | '));
    if (ccB.length) lines.push('Cách cục Mệnh ' + nameB + ': ' + ccB.map((c) => c.ten + (c.moTa ? ' — ' + c.moTa : '')).join(' | '));
    if (ynA.length) lines.push('Sao Mệnh ' + nameA + ': ' + ynA.slice(0, 3).join(' | '));
    if (ynB.length) lines.push('Sao Mệnh ' + nameB + ': ' + ynB.slice(0, 3).join(' | '));
    if (scA) lines.push('6 chiều Mệnh ' + nameA + ': ' + fmtSc(scA));
    if (scB) lines.push('6 chiều Mệnh ' + nameB + ': ' + fmtSc(scB));
  } else if (idx === 4) {
    const ttA = palMenhA && palMenhA.thaiTueNhom, ttB = palMenhB && palMenhB.thaiTueNhom;
    const tsA = palMenhA && (palMenhA.stars || []).find((s) => s.nhom === 'trang_sinh');
    const tsB = palMenhB && (palMenhB.stars || []).find((s) => s.nhom === 'trang_sinh');
    const locA = palMenhA && (palMenhA.stars || []).find((s) => s.ten === 'Lộc Tồn');
    const locB = palMenhB && (palMenhB.stars || []).find((s) => s.ten === 'Lộc Tồn');
    const NN = { 1: 'Tuế Hổ Phù — ngay thẳng, lý tưởng, đàng hoàng', 2: 'Dương Phù Phúc — sáng suốt, hay cạnh tranh, cần hành thiện', 3: 'Tang Tuế Khách — thông minh, tháo vát, thường làm trái sở nguyện', 4: 'Âm Long Trực — làm công, phụ thuộc, được phúc an lành' };
    lines.push('Nhóm Thái Tuế ' + nameA + ': ' + (NN[ttA && ttA.nhom] || '?'));
    lines.push('Nhóm Thái Tuế ' + nameB + ': ' + (NN[ttB && ttB.nhom] || '?'));
    lines.push('Trường Sinh: ' + nameA + '=' + (tsA ? tsA.ten : 'không có') + ' · ' + nameB + '=' + (tsB ? tsB.ten : 'không có'));
    lines.push('Lộc Tồn tại Mệnh: ' + nameA + '=' + (locA ? 'Có' : 'Không') + ' · ' + nameB + '=' + (locB ? 'Có' : 'Không'));
  } else if (idx >= 5 && idx <= 7) {
    const ccA2 = (lsA.cachCuc || []).filter((c) => c.cung === cungName);
    const ccB2 = (lsB.cachCuc || []).filter((c) => c.cung === cungName);
    const ynA2 = ((lsA.cachCucTungCung || {})[cungName] || []);
    const ynB2 = ((lsB.cachCucTungCung || {})[cungName] || []);
    const scA2 = (lsA.cungScores || {})[cungName], scB2 = (lsB.cungScores || {})[cungName];
    if (ccA2.length) lines.push('Cách cục ' + cungName + ' ' + nameA + ': ' + ccA2.map((c) => c.ten).join(', '));
    if (ccB2.length) lines.push('Cách cục ' + cungName + ' ' + nameB + ': ' + ccB2.map((c) => c.ten).join(', '));
    if (ynA2.length) lines.push('Sao ' + nameA + ': ' + ynA2.slice(0, 3).join(' | '));
    if (ynB2.length) lines.push('Sao ' + nameB + ': ' + ynB2.slice(0, 3).join(' | '));
    if (scA2) lines.push('6 chiều ' + nameA + ': ' + fmtSc(scA2));
    if (scB2) lines.push('6 chiều ' + nameB + ': ' + fmtSc(scB2));
  } else if (idx === 8) {
    const dvA = lsA.daiVanHienTai, dvB = lsB.daiVanHienTai;
    if (dvA) {
      const scDvA = dvA.scoring || {};
      lines.push('ĐV ' + nameA + ': ' + dvA.diaChi + ' (' + dvA.tuoiStart + '–' + dvA.tuoiEnd + 't) · Tổng=' + scDvA.tong);
      const totA = (dvA.rules || []).filter((r) => r.type === 'tot').slice(0, 2).map((r) => r.text);
      const xauA = (dvA.rules || []).filter((r) => r.type === 'xau').slice(0, 2).map((r) => r.text);
      if (totA.length) lines.push('Tốt: ' + totA.join(' | '));
      if (xauA.length) lines.push('Cần lưu ý: ' + xauA.join(' | '));
    }
    if (dvB) {
      const scDvB = dvB.scoring || {};
      lines.push('ĐV ' + nameB + ': ' + dvB.diaChi + ' (' + dvB.tuoiStart + '–' + dvB.tuoiEnd + 't) · Tổng=' + scDvB.tong);
      const totB = (dvB.rules || []).filter((r) => r.type === 'tot').slice(0, 2).map((r) => r.text);
      const xauB = (dvB.rules || []).filter((r) => r.type === 'xau').slice(0, 2).map((r) => r.text);
      if (totB.length) lines.push('Tốt: ' + totB.join(' | '));
      if (xauB.length) lines.push('Cần lưu ý: ' + xauB.join(' | '));
    }
  }
  const focusQ = XT_SECTION_QUESTIONS[idx] || '';
  return `Luận giải "${m.label}" — tương quan lá số ${nameA} và ${nameB}:
${lines.join('\n')}

Viết 180-230 từ văn xuôi.${focusQ ? ' Tối thiểu phải trả lời được: ' + focusQ : ''} Tác động thực tế, 1 điểm lưu ý. Dùng tên thật.`;
}

async function runXemTuoi() {
  console.log('\n=== Xem Tuổi (xem-tuoi) ===');
  requireEnv('GEMINI_API_KEY');
  const rA = computeLaso(XT_A, XT_NAM_XEM);
  const rB = computeLaso(XT_B, XT_NAM_XEM);
  if (!rA.ok || !rA.ls) throw new Error('computeLaso lỗi cho ' + XT_A.name + ': ' + (rA.error || ''));
  if (!rB.ok || !rB.ls) throw new Error('computeLaso lỗi cho ' + XT_B.name + ': ' + (rB.error || ''));
  const result = TuongHop.calcTuongHop(rA.ls, rB.ls, XT_A.name, XT_B.name);
  console.log(`✓ Tương hợp: ${result.total}/100`);

  const texts = {};
  for (let idx = 0; idx < XT_PHAN_LABELS.length; idx++) {
    const m = idx === 0 ? null : result.items[idx - 1];
    const prompt = xtBuildPhanPrompt(idx, m, result);
    console.log(`  phần ${idx} (${XT_PHAN_LABELS[idx]}): đang gọi LLM…`);
    const r = await llmTextFull({ system: XT_SYSTEM, prompt, maxTokens: 1800 });
    texts[idx] = r.text.trim();
    console.log(`  phần ${idx}: OK (${texts[idx].length} ký tự, model ${r.model})`);
  }

  const outPath = join(ROOT, 'public/samples/xem-tuoi-sample.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        input: {
          nameA: XT_A.name, birthA: XT_A,
          nameB: XT_B.name, birthB: XT_B,
        },
        texts,
      },
      null,
      2
    )
  );
  console.log(`✓ Ghi ${outPath}`);
}

const argv = process.argv.slice(2);
const ALL_IDS = [...Object.keys(CONFIGS), 'xem-tuoi'];
const ids = argv[0] === '--all' || !argv[0] ? ALL_IDS : [argv[0]];
for (const id of ids) {
  if (!ALL_IDS.includes(id)) {
    console.error(`Không rõ tool "${id}". Dùng: ${ALL_IDS.join(' | ')} | --all`);
    process.exit(1);
  }
}
for (const id of ids) {
  if (id === 'xem-tuoi') await runXemTuoi();
  else await runOne(id);
}
