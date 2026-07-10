// lib/engine/menhly.ts
// ============================================================
// Server-compute cho BATCH 2 tool Mệnh Lý / Huyền Học (nhẹ, deterministic):
// nạp âm, kim lâu & tam tai, ngũ hành tên, thần số học, bát trạch (mệnh quái),
// kinh dịch (gieo quẻ → quái từ hào).
//
// NGUYÊN TẮC: chỉ tính phần deterministic CHẮC CHẮN (can chi/nạp âm, tuổi mụ,
// mệnh quái + đông/tây tứ mệnh, life path, quái từ 6 hào). KHÔNG hardcode bảng
// dễ sai (64 hướng du niên bát trạch, tên 64 quẻ King Wen) — để rail (LLM) luận
// tiếp từ dữ liệu thật, giống pattern chọn-ngày/đặt-tên.
//
// Mỗi compute* trả CHÍNH shape mà extract*Context (prompts.ts) đọc. Client gửi
// input thô → Zalo/native không cần JS helper.
// ============================================================

type Rec = Record<string, unknown>;

// NẠP ÂM & KIM LÂU & TAM TAI đã chuyển sang module client dùng chung
// public/tools-shared/{nap-am,kim-lau}.js (nguồn chuẩn = trang standalone).
// Rail nhận data client gửi (run.ts pass-through) → không tính lại ở đây.

// NGŨ HÀNH TÊN đã chuyển sang module client dùng chung
// public/tools-shared/ngu-hanh-ten.js (bảng tra số nét + ngũ hành từng chữ =
// nguồn chuẩn với trang standalone). Rail pass-through, không tính lại ở đây.

// THẦN SỐ HỌC đã chuyển sang module client dùng chung
// public/tools-shared/than-so-hoc.js (4 số Pythagoras). Rail pass-through.

// BÁT TRẠCH đã chuyển sang module client dùng chung
// public/tools-shared/bat-trach.js (getCungMenh nam%100 + bảng du niên 8 hướng =
// nguồn chuẩn với trang standalone). Rail pass-through, không tính lại ở đây.

// ── KINH DỊCH: 6 hào gieo (client random) → quái hạ/thượng + hào động ──
// Hào: 6=lão âm(động→dương) · 7=thiếu dương · 8=thiếu âm · 9=lão dương(động→âm).
// Server chỉ resolve QUÁI (8 quẻ đơn, chắc chắn) + hào động; TÊN 64 quẻ King Wen
// để rail (LLM) định danh + luận — tránh hardcode bảng dễ sai.
const TRIGRAM = ['Khôn', 'Cấn', 'Khảm', 'Tốn', 'Chấn', 'Ly', 'Đoài', 'Càn'];
function trigram(b1: number, b2: number, b3: number): string {
  return TRIGRAM[b1 * 4 + b2 * 2 + b3];
}
export function computeKinhDich(input: Rec): Rec | null {
  const hao = input.hao;
  if (!Array.isArray(hao) || hao.length !== 6) return null;
  const vals = hao.map((h) => Number(h));
  if (vals.some((v) => ![6, 7, 8, 9].includes(v))) return null;
  // Dương nếu 7/9, âm nếu 6/8. Động nếu 6/9.
  const yang = vals.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const dong = vals.map((v) => v === 6 || v === 9);
  // hào 1 dưới cùng → quái hạ = hào 1..3, quái thượng = hào 4..6
  const quaiHa = trigram(yang[0], yang[1], yang[2]);
  const quaiThuong = trigram(yang[3], yang[4], yang[5]);
  const dongHao = dong.map((d, i) => (d ? i + 1 : 0)).filter(Boolean);
  // Biến quái: lật hào động
  const bienYang = yang.map((y, i) => (dong[i] ? 1 - y : y));
  const bienHa = trigram(bienYang[0], bienYang[1], bienYang[2]);
  const bienThuong = trigram(bienYang[3], bienYang[4], bienYang[5]);
  const haoLines = vals.map((v, i) => ({
    vi: i + 1,
    am_duong: yang[i] ? 'dương' : 'âm',
    dong: dong[i],
  }));
  return {
    question: input.question || '',
    quaiHa,
    quaiThuong,
    tenQuaiMoTa: `Thượng ${quaiThuong} / Hạ ${quaiHa}`,
    dongHao,
    bienQuai: dongHao.length ? `Thượng ${bienThuong} / Hạ ${bienHa}` : '',
    haoLines,
  };
}
