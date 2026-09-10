#!/usr/bin/env node
/**
 * Sinh bản mẫu cho 3 tool KHÔNG dùng lá số Tử Vi (chỉ can chi/nạp âm gõ tay từ
 * năm sinh) — dat-ten-con, dat-ten-dn, chon-ngay-tot. Cả ba đi qua route dùng
 * chung `/api/xem-tuoi?action=...` (app/api/xem-tuoi/route.ts) — KHÔNG có
 * schema JSON, chỉ trả văn xuôi (SSE 'delta' khi chạy thật; ở đây gọi thẳng
 * `llmTextFull()` lấy bản văn cuối — không cần dựng lại đường stream chỉ để
 * sinh 1 bản mẫu tĩnh).
 *
 * KHÔNG dùng chung khuôn `TOOL_CONFIGS` của `gen-tool-sample.mjs`: khuôn đó
 * neo vào `computeLaso`/lá số Tử Vi ngay bước đầu — ba tool này không có khái
 * niệm lá số, ép vào khuôn đó là giả một bước không tồn tại trong route thật.
 *
 * System/user prompt CHÉP NGUYÊN VĂN từ handleDatTenCon/handleDatTenDoanhNghiep/
 * handleChonNgayTot trong app/api/xem-tuoi/route.ts (không export) — đổi ở đó
 * thì phải đổi Ở ĐÂY theo.
 *
 *   npx tsx scripts/gen-simple-text-samples.mjs [dat-ten-con|dat-ten-dn|chon-ngay-tot|--all]
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { llmTextFull } from '../lib/llm/complete.ts';
import { ARC_GIONG_NGU_HANH } from '../lib/agent/prompts.ts';
// `public/can-chi.js` xuất kép (window.CanChi ở trình duyệt, module.exports ở
// Node) — CÙNG MỘT nguồn cho cả hai phía, không chép công thức sang đây.
import CanChiPkg from '../public/can-chi.js';
const CanChi = CanChiPkg.ccInfo ? CanChiPkg : CanChiPkg.default;

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

const argv = process.argv.slice(2);
const ids = argv[0] === '--all' || !argv[0] ? Object.keys(CONFIGS) : [argv[0]];
for (const id of ids) {
  if (!CONFIGS[id]) {
    console.error(`Không rõ tool "${id}". Dùng: ${Object.keys(CONFIGS).join(' | ')} | --all`);
    process.exit(1);
  }
}
for (const id of ids) await runOne(id);
