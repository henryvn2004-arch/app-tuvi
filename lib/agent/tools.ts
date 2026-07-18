// lib/agent/tools.ts
// ============================================================
// LÕI TOOL DÙNG CHUNG — trích nguyên từ app/api/lasotuvi/route.ts
// (KHÔNG đổi hành vi). Mọi cổng (/api/lasotuvi, /api/v1/chat) và
// mọi nền tảng sau này gọi CÙNG bộ tool này → sửa 1 chỗ, tất cả
// cập nhật. Xem docs/KIEN-TRUC-VA-LO-TRINH.md ("một bộ não").
//
// Các hàm thao tác trên `lasoData` — output engine an sao (palaces,
// tieuVanScores, daiVans, nguyetVanScores, thangSinhAL, gioSinhIdx).
// ============================================================

import {
  computeMonth, topDaysForActivity, ACTIVITY_META, ACTIVITY_LIST,
  type ActivityKey,
} from '../../tuvi-engine/dist/ngay-tot/index.js';
import { tinhNguyetHan, tinhNhatHan } from '../../tuvi-engine/dist/van-han/index.js';
import { solarToLunar } from '../../tuvi-engine/dist/lunar/convert.js';
import { matchVanHanCombos, formatComboLines, type LayerCung } from './vanHanCombos';

// ─── Hướng dẫn dùng tool (chèn vào system prompt) ──────────────
export const TOOLS_INSTRUCTION = (hasLaso: boolean, hasProfiles = false) => `

CÔNG CỤ (tool) — DÙNG ĐÚNG LÚC, TUYỆT ĐỐI KHÔNG bịa số liệu thời gian:
KHÔNG BAO GIỜ TRÌ HOÃN: tuyệt đối CẤM trả lời bằng lời hứa sẽ làm ("để tôi tra", "để tôi gọi tool", "chờ tôi xem", "tra xong sẽ trả lời", "xin lỗi để tôi tra ngay"). Cần dữ liệu tool → GỌI tool NGAY trong CHÍNH lượt này rồi luận trong cùng câu trả lời. Thông tin CẤU TRÚC ĐÃ có trong DỮ LIỆU LÁ SỐ (12 cung, sao, cách cục) → luận THẲNG, KHÔNG gọi tool. Đặc biệt: hỏi về một CÁCH CỤC/cung/sao đã nêu trong lá số (vd cách cục cung Phu Thê) thì luận ngay từ dữ liệu, KHÔNG cần tra vận. LƯU Ý: bản kê lá số CỐ Ý không chứa đại vận (đại vận là tầng thời gian, chỉ mượn cung đứng) — hỏi về ĐẠI VẬN / vận hạn / một năm/giai đoạn thì PHẢI gọi tra_tieu_van (trả về đại vận kèm cung nó đóng + điểm), không tự bịa. Mỗi câu trả lời gửi người dùng PHẢI là luận giải hoàn chỉnh, không phải thông báo ý định.
${hasLaso ? '- NGÀY SINH MỚI: nếu tin nhắn người dùng cung cấp một NGÀY SINH (ngày+tháng+năm) KHÁC với lá số đang nêu ở trên → GỌI lap_la_so với ngày mới và CHỈ luận trên kết quả tool mới đó; TUYỆT ĐỐI không trộn với lá số cũ và KHÔNG tự an cung/sao bằng tay (engine là nguồn lá số duy nhất).\n' : ''}${hasLaso ? '- Câu hỏi gắn với MỘT NĂM cụ thể (năm nay, năm sau, "bao giờ", một năm/tuổi nhất định) → GỌI tra_tieu_van để lấy cung tiểu hạn/lưu niên của năm + sao tại các cung đó + nền điểm ĐẠI VẬN. Tiểu vận KHÔNG có điểm riêng — luận theo CÁCH CỤC + sao của cung hạn năm đó (giữ đúng tốt/xấu của nó), rồi giới hạn BIÊN ĐỘ theo điểm đại vận, KHÔNG tự gán "điểm/10" cho năm. Không tự đoán cung/sao khi chưa gọi tool.\n' : ''}${hasLaso ? '- NHIỀU NĂM / BẢNG SO SÁNH: cung tiểu hạn & lưu niên đại hạn của MỖI năm PHẢI lấy từ tra_tieu_van cho CHÍNH năm đó — so sánh N năm thì gọi tool ĐỦ N lần (mỗi năm một lần), lấy Y NGUYÊN cung tool trả về. TUYỆT ĐỐI CẤM tự tính, tự nhớ, hay suy cung tiểu hạn/lưu niên của một năm từ năm khác (kể cả suy theo chu kỳ 12 năm — vẫn phải gọi tool cho từng năm để xác nhận). Năm nào CHƯA có kết quả tra_tieu_van thì KHÔNG được nêu tiểu hạn/lưu niên của năm đó. Đây là lỗi đã gặp: model tự nhẩm cung qua nhiều năm → sai lệch năm được năm không, các mốc cách 12 năm ra khác cung dù đáng lẽ trùng.\n' : ''}${hasLaso ? '- Câu hỏi về HẠN THÁNG / nguyệt hạn ("tháng X/YYYY", "tháng này thế nào"...) → GỌI tra_nguyet_van; kết quả trả về 3 cách tính, ưu tiên luận theo Cách 1.\n' : ''}${hasLaso ? '- Câu hỏi về HẠN NGÀY / nhật hạn ("ngày X tháng Y", "hôm nay"...) → GỌI tra_nhat_van; kết quả trả về cung nhật hạn theo Cách 1.\n' : ''}- Câu hỏi NGÀY TỐT để làm việc trọng đại (cưới hỏi, nhập trạch, khai trương, mua/bán nhà, khởi công, xuất hành...) trong một tháng → GỌI xem_ngay_tot.
${hasProfiles ? 'SỔ LÁ SỐ (một người chat có thể xem nhiều lá số — anh Tony, con gái…): mỗi lá số có TÊN riêng, không được lẫn.\n- Sau khi LẬP một lá số MỚI từ ngày sinh, hãy MỜI người dùng đặt tên để lưu (vd: "Bạn muốn lưu lá số này với tên gì — như anh Tony — để lần sau gọi nhanh không?"). Họ cho tên → GỌI luu_la_so(ten). Họ không muốn đặt → tự GỌI luu_la_so với tên gợi ý ngắn gọn (vd "Nam 2019").\n- Người dùng nhắc tới một lá số đã lưu ("xem lá số Tony", "lá số con gái thế nào") → GỌI mo_la_so(ten), rồi CHỈ luận trên lá số vừa mở, TUYỆT ĐỐI không trộn với lá số/giọng của người khác trong lịch sử.\n- Hỏi "có những lá số nào / danh sách lá số" → GỌI liet_ke_la_so.\n' : ''}Sau khi có kết quả tool, luận giải dứt khoát và neo vào đúng các con số tool trả về (đại vận điểm thấp / nhiều sát tinh phải cảnh báo rõ). Câu nào không cần tool thì trả lời thẳng.
VẬN HẠN — ĐẠI VẬN GIỚI HẠN BIÊN ĐỘ, KHÔNG ÁP THEME: chỉ ĐẠI VẬN có điểm/10 thật. TIỂU VẬN (năm), NGUYỆT VẬN và NHẬT VẬN đều KHÔNG có điểm — luận theo CÁCH CỤC + SAO của CHÍNH cung hạn đó, GIỮ ĐÚNG bản chất tốt/xấu của nó: cung hạn có cát tinh/cách cục tốt → vận đó TỐT; có sát tinh/cách xấu → vận đó XẤU. Mỗi năm/tháng/ngày luận RIÊNG theo sao của nó, CẤM bê nguyên theme tốt/xấu của đại vận áp cho mọi mốc (đừng để năm nào cũng giống nhau). Điểm đại vận KHÔNG đổi tính tốt/xấu của vận ngắn — chỉ chỉnh BIÊN ĐỘ: đại vận điểm THẤP thì cái tốt của năm/tháng/ngày VẪN tốt nhưng bị kìm, hưởng dè dặt, không bung rực rỡ, còn cái xấu nặng thêm; đại vận điểm CAO thì cái tốt được khuếch đại rực rỡ, cái xấu được đỡ nhẹ. TUYỆT ĐỐI không bịa "điểm/10" cho năm/tháng/ngày.
TỔ HỢP SAO CHÉO TẦNG: nếu kết quả tool có mục "TỔ HỢP SAO trong các cung hạn (cách cục vận)", ƯU TIÊN luận theo các tổ hợp đó — đây là cách cục hình thành khi đủ bộ sao rải qua nhiều tầng vận (vd Mã Khốc Khách), ý nghĩa rõ ràng và đáng tin hơn từng sao lẻ — tổ hợp tốt thì luận vận tốt, tổ hợp xấu thì luận xấu; sau đó điều chỉnh BIÊN ĐỘ theo điểm đại vận (KHÔNG để đại vận đảo ngược tốt/xấu của tổ hợp).`;

// ─── Định nghĩa tool (Anthropic schema) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTools(hasLaso: boolean): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = [];
  if (hasLaso) {
    tools.push({
      name: 'tra_tieu_van',
      description: 'Tra vận hạn (tiểu vận) của lá số đang xem cho MỘT NĂM dương lịch cụ thể: điểm vận năm (0–10), xu hướng lên/xuống, cung tiểu hạn, cung lưu niên đại hạn, số sao cát/sát. Dùng cho mọi câu hỏi gắn với một năm hoặc "bao giờ".',
      input_schema: {
        type: 'object',
        properties: { nam: { type: 'integer', description: 'Năm dương lịch cần tra, ví dụ 2027' } },
        required: ['nam'],
      },
    });
  }
  if (hasLaso) {
    tools.push({
      name: 'tra_nguyet_van',
      description: 'Tra lưu nguyệt hạn (hạn tháng) của lá số cho một tháng dương lịch cụ thể: cung nguyệt hạn theo 3 cách khởi, sao chính tại mỗi cung. Dùng khi user hỏi về một tháng cụ thể.',
      input_schema: {
        type: 'object',
        properties: {
          thang: { type: 'integer', description: 'Tháng dương lịch (1–12)' },
          nam:   { type: 'integer', description: 'Năm dương lịch, ví dụ 2027' },
        },
        required: ['thang', 'nam'],
      },
    });
    tools.push({
      name: 'tra_nhat_van',
      description: 'Tra lưu nhật hạn (hạn ngày) của lá số cho một ngày dương lịch cụ thể: cung nhật hạn, sao chính tại cung đó. Dùng khi user hỏi về một ngày cụ thể.',
      input_schema: {
        type: 'object',
        properties: {
          ngay:  { type: 'integer', description: 'Ngày dương lịch (1–31)' },
          thang: { type: 'integer', description: 'Tháng dương lịch (1–12)' },
          nam:   { type: 'integer', description: 'Năm dương lịch' },
        },
        required: ['ngay', 'thang', 'nam'],
      },
    });
  }
  tools.push({
    name: 'xem_ngay_tot',
    description: 'Tìm các ngày tốt nhất trong một tháng để làm một việc trọng đại, chấm theo 12 trực · 28 tú · sao hoàng/hắc đạo · ngày kỵ cổ truyền.',
    input_schema: {
      type: 'object',
      properties: {
        viec: { type: 'string', enum: ACTIVITY_LIST as readonly string[], description: 'Loại việc: ' + (ACTIVITY_LIST as readonly string[]).map(k => `${k}=${ACTIVITY_META[k as ActivityKey]?.name || k}`).join(', ') },
        thang: { type: 'integer', description: 'Tháng 1–12' },
        nam: { type: 'integer', description: 'Năm dương lịch (2020–2036)' },
      },
      required: ['viec', 'thang', 'nam'],
    },
  });
  return tools;
}

// ─── Thực thi tool ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function execTraVanHan(lasoData: any, input: any): string {
  const nam = Number(input?.nam);
  if (!nam) return 'Thiếu tham số năm.';
  const tvs = lasoData?.tieuVanScores;
  if (!Array.isArray(tvs) || !tvs.length) return 'Lá số này chưa có dữ liệu tiểu vận theo năm — hãy luận theo đại vận hiện tại trong dữ liệu lá số.';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tv = tvs.find((t: any) => Number(t.nam) === nam);
  if (!tv) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yrs = tvs.map((t: any) => Number(t.nam));
    return `Năm ${nam} ngoài phạm vi lá số (chỉ có ${Math.min(...yrs)}–${Math.max(...yrs)}).`;
  }
  const palaces = lasoData.palaces || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmtStar = (s: any): string => {
    if (!s) return '';
    if (typeof s !== 'object') return String(s);
    let t = s.ten || '';
    if (s.brightness) t += `(${s.brightness})`;
    if (s.hoa) t += `[Hóa ${s.hoa}]`;
    return t;
  };
  // Liệt kê SAO của cung hạn (chính tinh + phụ/sát tinh) để LLM luận theo ý nghĩa sao,
  // KHÔNG quy thành điểm số cho năm.
  const starsOf = (cungName: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = palaces.find((x: any) => x.cungName === cungName);
    if (!p) return '?';
    const chinh = (p.majorStars || []).map(fmtStar).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phu = (p.stars || []).filter((s: any) => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(fmtStar).filter(Boolean);
    let s = `chính tinh: ${chinh.length ? chinh.join(', ') : 'vô chính diệu'}`;
    if (phu.length) s += `; phụ/sát tinh: ${phu.slice(0, 8).join(', ')}`;
    return s;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pByName = (cn: string): any => palaces.find((x: any) => x.cungName === cn);
  const dv = (lasoData.daiVans || [])[tv.dvIdx];
  const dvPalace = dv ? palaces[dv.cungIdx] : null;
  let out = `VẬN NĂM ${nam} (tuổi ${tv.tuoi}) — TIỂU VẬN KHÔNG có điểm riêng; luận theo CÁCH CỤC + sao của các cung hạn năm này, đại vận chỉ giới hạn biên độ:\n`;
  if (dv) out += `- KHUNG ĐẠI VẬN ${dv.diaChi} (${dv.tuoiStart}–${dv.tuoiEnd} tuổi)${dvPalace?.cungName ? `, đóng tại cung ${dvPalace.cungName}` : ''}${dv.scoring?.tong != null ? `: điểm ${dv.scoring.tong}/10 ${dv.scoring.flag || ''}` : ''} — chỉ GIỚI HẠN BIÊN ĐỘ (cao = cái tốt rực rỡ/cái xấu đỡ nhẹ; thấp = cái tốt bị kìm/cái xấu nặng thêm), KHÔNG quyết định tốt/xấu của năm.\n`;
  out += `- Tiểu hạn nhập cung ${tv.tieuHanCung} — ${starsOf(tv.tieuHanCung)}.\n`;
  out += `- Lưu niên đại hạn vào cung ${tv.luuNienCung} — ${starsOf(tv.luuNienCung)}.\n`;
  // Tổ hợp sao chéo tầng (mức NĂM: đại vận + tiểu hạn + lưu niên)
  const yearLayers: LayerCung[] = [
    { label: 'đại vận', palace: dvPalace },
    { label: 'tiểu hạn', palace: pByName(tv.tieuHanCung) },
    { label: 'lưu niên', palace: pByName(tv.luuNienCung) },
  ];
  out += formatComboLines(matchVanHanCombos(yearLayers));
  out += `- Cách luận: XÁC ĐỊNH tốt/xấu của năm TRƯỚC theo cách cục + sao (cát/sát, miếu/hãm) của cung tiểu hạn & lưu niên + tổ hợp sao năm nay — cách cục tốt/sao cát thì luận năm TỐT dù đại vận xấu, ngược lại luận năm XẤU dù đại vận tốt. SAU đó dùng điểm đại vận để chỉnh BIÊN ĐỘ: đại vận thấp thì cái tốt năm nay bị kìm, hưởng dè dặt, không rực rỡ (cái xấu nặng thêm); đại vận cao thì cái tốt bung rực rỡ (cái xấu đỡ nhẹ). KHÔNG bê theme đại vận áp đồng loạt, KHÔNG tự gán "điểm/10" cho năm.\n`;
  return out;
}

const _DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tị','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const _mod12 = (n: number) => ((n % 12) + 12) % 12;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _starsOf(palaces: any[], idx: number): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const major = ((palaces[idx]?.majorStars || []) as any[]).map((s: any) => s.ten).filter(Boolean).join(', ');
  return major || 'vô chính diệu';
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _cungNameOf(palaces: any[], idx: number): string {
  return palaces[idx]?.cungName || _DIA_CHI[idx] || '?';
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _tieuHanIdxOf(palaces: any[], tieuHanCung: string): number {
  return palaces.findIndex((p: any) => p.cungName === tieuHanCung);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function execTraNguyetVan(lasoData: any, input: any): string {
  const thang = Number(input?.thang), nam = Number(input?.nam);
  if (!thang || !nam) return 'Thiếu tham số tháng hoặc năm.';

  const lunar = solarToLunar(1, thang, nam);
  const thangAL = lunar.month;

  const tvs = lasoData?.tieuVanScores;
  if (!Array.isArray(tvs) || !tvs.length) return 'Lá số này chưa có dữ liệu tiểu vận theo năm.';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tv = tvs.find((t: any) => Number(t.nam) === nam);
  if (!tv) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yrs = tvs.map((t: any) => Number(t.nam));
    return `Năm ${nam} ngoài phạm vi lá số (chỉ có ${Math.min(...yrs)}–${Math.max(...yrs)}).`;
  }

  const palaces = lasoData.palaces || [];
  const tieuHanIdx = _tieuHanIdxOf(palaces, tv.tieuHanCung);
  if (tieuHanIdx === -1) return `Không tìm thấy cung tiểu hạn "${tv.tieuHanCung}" trong lá số.`;

  // Ưu tiên dùng nguyetVanScores pre-computed; fallback về thangSinhAL/gioSinhIdx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preMonths = (lasoData.nguyetVanScores || []).find((e: any) => Number(e.nam) === nam)?.months;
  let nguyetHanIdx: number;
  if (Array.isArray(preMonths) && preMonths[thangAL - 1] != null) {
    nguyetHanIdx = Number(preMonths[thangAL - 1]);
  } else {
    const thangSinhAL = Number(lasoData.thangSinhAL);
    const gioSinhIdx  = lasoData.gioSinhIdx != null ? Number(lasoData.gioSinhIdx) : -1;
    if (!thangSinhAL || gioSinhIdx === -1) return 'Lá số thiếu dữ liệu tháng sinh / giờ sinh để tính nguyệt hạn.';
    nguyetHanIdx = _mod12(tinhNguyetHan(tieuHanIdx, thangSinhAL, gioSinhIdx).cach1 + thangAL - 1);
  }

  let out = `NGUYỆT HẠN THÁNG ${thang}/${nam} (ÂL tháng ${thangAL}, tuổi ${tv.tuoi}):\n`;
  out += `- Tiểu hạn năm ${nam}: cung ${tv.tieuHanCung}.\n`;
  out += `- Nguyệt hạn tháng ${thangAL} ÂL: cung ${_cungNameOf(palaces, nguyetHanIdx)} — chính tinh: ${_starsOf(palaces, nguyetHanIdx)}.\n`;
  // Tổ hợp sao chéo tầng (mức THÁNG: đại vận + tiểu hạn + lưu niên + nguyệt hạn)
  const _dvM = (lasoData.daiVans || [])[tv.dvIdx];
  const monthLayers: LayerCung[] = [
    { label: 'đại vận', palace: _dvM ? palaces[_dvM.cungIdx] : null },
    { label: 'tiểu hạn', palace: palaces[tieuHanIdx] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { label: 'lưu niên', palace: palaces.find((x: any) => x.cungName === tv.luuNienCung) },
    { label: 'nguyệt hạn', palace: palaces[nguyetHanIdx] },
  ];
  out += formatComboLines(matchVanHanCombos(monthLayers));
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function execTraNhatVan(lasoData: any, input: any): string {
  const ngay = Number(input?.ngay), thang = Number(input?.thang), nam = Number(input?.nam);
  if (!ngay || !thang || !nam) return 'Thiếu tham số ngày, tháng hoặc năm.';

  const lunar = solarToLunar(ngay, thang, nam);
  const ngayAL = lunar.day, thangAL = lunar.month;

  const tvs = lasoData?.tieuVanScores;
  if (!Array.isArray(tvs) || !tvs.length) return 'Lá số này chưa có dữ liệu tiểu vận theo năm.';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tv = tvs.find((t: any) => Number(t.nam) === nam);
  if (!tv) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yrs = tvs.map((t: any) => Number(t.nam));
    return `Năm ${nam} ngoài phạm vi lá số (chỉ có ${Math.min(...yrs)}–${Math.max(...yrs)}).`;
  }

  const palaces = lasoData.palaces || [];
  const tieuHanIdx = _tieuHanIdxOf(palaces, tv.tieuHanCung);
  if (tieuHanIdx === -1) return `Không tìm thấy cung tiểu hạn "${tv.tieuHanCung}" trong lá số.`;

  // Ưu tiên dùng nguyetVanScores pre-computed; fallback về thangSinhAL/gioSinhIdx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preMonthsNhat = (lasoData.nguyetVanScores || []).find((e: any) => Number(e.nam) === nam)?.months;
  let nguyetHanIdx: number;
  if (Array.isArray(preMonthsNhat) && preMonthsNhat[thangAL - 1] != null) {
    nguyetHanIdx = Number(preMonthsNhat[thangAL - 1]);
  } else {
    const thangSinhAL = Number(lasoData.thangSinhAL);
    const gioSinhIdx  = lasoData.gioSinhIdx != null ? Number(lasoData.gioSinhIdx) : -1;
    if (!thangSinhAL || gioSinhIdx === -1) return 'Lá số thiếu dữ liệu tháng sinh / giờ sinh.';
    nguyetHanIdx = _mod12(tinhNguyetHan(tieuHanIdx, thangSinhAL, gioSinhIdx).cach1 + thangAL - 1);
  }
  const nhatHanIdx   = tinhNhatHan(nguyetHanIdx, ngayAL);

  let out = `NHẬT HẠN NGÀY ${ngay}/${thang}/${nam} (ÂL ngày ${ngayAL} tháng ${thangAL}, tuổi ${tv.tuoi}):\n`;
  out += `- Nguyệt hạn ÂL tháng ${thangAL}: cung ${_cungNameOf(palaces, nguyetHanIdx)} — chính tinh: ${_starsOf(palaces, nguyetHanIdx)}.\n`;
  out += `- Nhật hạn ÂL ngày ${ngayAL}: cung ${_cungNameOf(palaces, nhatHanIdx)} — chính tinh: ${_starsOf(palaces, nhatHanIdx)}.\n`;
  // Tổ hợp sao chéo tầng (mức NGÀY: đại vận + tiểu hạn + lưu niên + nguyệt hạn + nhật hạn)
  const _dvD = (lasoData.daiVans || [])[tv.dvIdx];
  const dayLayers: LayerCung[] = [
    { label: 'đại vận', palace: _dvD ? palaces[_dvD.cungIdx] : null },
    { label: 'tiểu hạn', palace: palaces[tieuHanIdx] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { label: 'lưu niên', palace: palaces.find((x: any) => x.cungName === tv.luuNienCung) },
    { label: 'nguyệt hạn', palace: palaces[nguyetHanIdx] },
    { label: 'nhật hạn', palace: palaces[nhatHanIdx] },
  ];
  out += formatComboLines(matchVanHanCombos(dayLayers));
  return out;
}

export function execXemNgayTot(input: { viec?: string; thang?: number; nam?: number }): string {
  const key = String(input?.viec || '') as ActivityKey;
  const thang = Number(input?.thang), nam = Number(input?.nam);
  if (!(ACTIVITY_LIST as readonly string[]).includes(key)) return `Việc "${input?.viec}" không hỗ trợ. Các việc: ${(ACTIVITY_LIST as readonly string[]).join(', ')}.`;
  if (!(nam >= 2020 && nam <= 2036)) return `Năm ${nam} ngoài phạm vi (2020–2036).`;
  if (!(thang >= 1 && thang <= 12)) return `Tháng ${thang} không hợp lệ.`;
  const meta = ACTIVITY_META[key];
  const top = topDaysForActivity(computeMonth(nam, thang), key, 6);
  if (!top.length) return `Tháng ${thang}/${nam} không có ngày đạt điểm ≥6 để ${meta.name.toLowerCase()} — nên cân nhắc tháng khác.`;
  let out = `NGÀY TỐT để ${meta.name} — tháng ${thang}/${nam} (top ${top.length}):\n`;
  for (const { info, score } of top) {
    const gio = (info.gioHoangDao || []).map(g => g.chi).slice(0, 4).join(', ');
    out += `- ${info.duongLich.day}/${info.duongLich.month} (${info.thuTrongTuan}, ÂL ${info.amLich.day}/${info.amLich.month}), can chi ${info.canChiNgay}, trực ${info.truc}: ${score.score}/10 ${score.level}`;
    if (score.reasons?.length) out += ` — ${score.reasons.slice(0, 2).join('; ')}`;
    if (gio) out += ` — giờ tốt: ${gio}`;
    out += '\n';
  }
  return out;
}

// ─── Dispatcher dùng chung (cả /api/lasotuvi và /api/v1/chat) ───
/** Nhãn tiến trình hiển thị khi gọi tool. */
export function toolLabel(name: string): string {
  return name === 'tra_tieu_van' ? 'Đang tra vận hạn...'
    : name === 'tra_nguyet_van' ? 'Đang tra nguyệt hạn...'
    : name === 'tra_nhat_van'   ? 'Đang tra nhật hạn...'
    : name === 'xem_ngay_tot'   ? 'Đang xem ngày tốt...'
    : 'Đang xử lý...';
}

/** Chạy 1 tool theo tên, trả về text kết quả. Không throw. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function execLasoTool(name: string, lasoData: any, input: any): string {
  try {
    if (name === 'tra_tieu_van') return execTraVanHan(lasoData, input);
    if (name === 'tra_nguyet_van') return execTraNguyetVan(lasoData, input);
    if (name === 'tra_nhat_van') return execTraNhatVan(lasoData, input);
    if (name === 'xem_ngay_tot') return execXemNgayTot(input);
    return 'Công cụ không tồn tại.';
  } catch (e: unknown) {
    return 'Lỗi chạy công cụ: ' + (e as Error).message;
  }
}
