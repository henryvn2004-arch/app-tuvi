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
import { matchVanHanCombos, formatComboLines, type LayerCung } from './vanHanCombos';
import { resolveNhatHanIdx, resolveNguyetHanSegments } from '../engine/van-ngay';

// ─── Hướng dẫn dùng tool (chèn vào system prompt) ──────────────
export const TOOLS_INSTRUCTION = (hasLaso: boolean, hasProfiles = false) => `

CÔNG CỤ (tool) — DÙNG ĐÚNG LÚC, TUYỆT ĐỐI KHÔNG bịa số liệu thời gian:
KHÔNG BAO GIỜ TRÌ HOÃN: tuyệt đối CẤM trả lời bằng lời hứa sẽ làm ("để tôi tra", "để tôi gọi tool", "chờ tôi xem", "tra xong sẽ trả lời", "xin lỗi để tôi tra ngay"). Cần dữ liệu tool → GỌI tool NGAY trong CHÍNH lượt này rồi luận trong cùng câu trả lời. Thông tin CẤU TRÚC ĐÃ có trong DỮ LIỆU LÁ SỐ (12 cung, sao, cách cục) → luận THẲNG, KHÔNG gọi tool. Đặc biệt: hỏi về một CÁCH CỤC/cung/sao đã nêu trong lá số (vd cách cục cung Phu Thê) thì luận ngay từ dữ liệu, KHÔNG cần tra vận. LƯU Ý: bản kê lá số CỐ Ý không chứa đại vận (đại vận là tầng thời gian, chỉ mượn cung đứng) — hỏi về ĐẠI VẬN / vận hạn / một năm/giai đoạn thì PHẢI gọi tra_tieu_van (trả về đại vận kèm cung nó đóng + điểm), không tự bịa. Mỗi câu trả lời gửi người dùng PHẢI là luận giải hoàn chỉnh, không phải thông báo ý định.
${hasLaso ? '- NGÀY SINH MỚI: nếu tin nhắn người dùng cung cấp một NGÀY SINH (ngày+tháng+năm) KHÁC với lá số đang nêu ở trên → GỌI lap_la_so với ngày mới và CHỈ luận trên kết quả tool mới đó; TUYỆT ĐỐI không trộn với lá số cũ và KHÔNG tự an cung/sao bằng tay (engine là nguồn lá số duy nhất).\n' : ''}${hasLaso ? '- Câu hỏi gắn với MỘT NĂM cụ thể (năm nay, năm sau, "bao giờ", một năm/tuổi nhất định) → GỌI tra_tieu_van để lấy cung tiểu hạn/lưu niên của năm + sao tại các cung đó (kèm tam hợp xung chiếu) + nền điểm ĐẠI VẬN. Tiểu vận KHÔNG có điểm riêng — luận ĐỦ CẢ HAI cung tool trả về: cung TIỂU HẠN và cung LƯU NIÊN ĐẠI HẠN, MỖI cung đọc cả tọa thủ + tam hợp xung chiếu, GỌI TÊN & luận cả hai (bỏ tầng lưu niên hay tiểu hạn đều là THIẾU), giữ đúng tốt/xấu của nó, rồi giới hạn BIÊN ĐỘ theo điểm đại vận, KHÔNG tự gán "điểm/10" cho năm. Không tự đoán cung/sao khi chưa gọi tool.\n' : ''}${hasLaso ? '- NHIỀU NĂM / BẢNG SO SÁNH: cung tiểu hạn & lưu niên đại hạn của MỖI năm PHẢI lấy từ tra_tieu_van cho CHÍNH năm đó — so sánh N năm thì gọi tool ĐỦ N lần (mỗi năm một lần), lấy Y NGUYÊN cung tool trả về. TUYỆT ĐỐI CẤM tự tính, tự nhớ, hay suy cung tiểu hạn/lưu niên của một năm từ năm khác (kể cả suy theo chu kỳ 12 năm — vẫn phải gọi tool cho từng năm để xác nhận). Năm nào CHƯA có kết quả tra_tieu_van thì KHÔNG được nêu tiểu hạn/lưu niên của năm đó. Đây là lỗi đã gặp: model tự nhẩm cung qua nhiều năm → sai lệch năm được năm không, các mốc cách 12 năm ra khác cung dù đáng lẽ trùng.\n' : ''}${hasLaso ? '- Câu hỏi về HẠN THÁNG / nguyệt hạn ("tháng X/YYYY", "tháng này thế nào"...) → GỌI tra_nguyet_van với ĐÚNG tháng/năm DƯƠNG LỊCH đang hỏi (hỏi "tháng này" thì dùng tháng/năm dương lịch của HÔM NAY đã nêu ở trên). Một tháng dương lịch thường bị CẮT NGANG bởi 2 tháng ÂM lịch — nếu tool trả về 2 ĐOẠN thì PHẢI phân biệt rõ theo ngày khi luận (KHÔNG gộp chung một hạn cho cả tháng); đoạn được đánh dấu "ĐANG DIỄN RA" là hạn đang áp dụng NGAY LÚC NÀY, luận theo đoạn đó khi hỏi về hiện tại/"tháng này".\n' : ''}${hasLaso ? '- Câu hỏi về HẠN NGÀY / nhật hạn ("ngày X tháng Y", "hôm nay"...) → GỌI tra_nhat_van; kết quả trả về cung nhật hạn theo Cách 1.\n' : ''}- Câu hỏi NGÀY TỐT để làm việc trọng đại (cưới hỏi, nhập trạch, khai trương, mua/bán nhà, khởi công, xuất hành...) trong một tháng → GỌI xem_ngay_tot.
${hasProfiles ? 'SỔ LÁ SỐ (một người chat có thể xem nhiều lá số — anh Tony, con gái…): mỗi lá số có TÊN riêng, không được lẫn.\n- Sau khi LẬP một lá số MỚI từ ngày sinh, hãy MỜI người dùng đặt tên để lưu (vd: "Bạn muốn lưu lá số này với tên gì — như anh Tony — để lần sau gọi nhanh không?"). Họ cho tên → GỌI luu_la_so(ten). Họ không muốn đặt → tự GỌI luu_la_so với tên gợi ý ngắn gọn (vd "Nam 2019").\n- Người dùng nhắc tới một lá số đã lưu ("xem lá số Tony", "lá số con gái thế nào") → GỌI mo_la_so(ten), rồi CHỈ luận trên lá số vừa mở, TUYỆT ĐỐI không trộn với lá số/giọng của người khác trong lịch sử.\n- Hỏi "có những lá số nào / danh sách lá số" → GỌI liet_ke_la_so.\n' : ''}Sau khi có kết quả tool, luận giải dứt khoát và neo vào đúng các con số tool trả về (đại vận điểm thấp / nhiều sát tinh phải cảnh báo rõ). Câu nào không cần tool thì trả lời thẳng.
VẬN HẠN: áp ĐÚNG luật VẬN HẠN đã nêu trong system prompt ở trên (đại vận là tầng duy nhất có điểm/10 thật; tiểu/nguyệt/nhật vận không có điểm riêng, luận theo cách cục+sao của cung hạn; vận năm phải xét đủ cả cung tiểu hạn lẫn cung lưu niên đại hạn) — không lặp lại quy tắc ở đây, chỉ nhắc để không bỏ sót khi có kết quả tool.
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
      description: 'Tra lưu nguyệt hạn (hạn tháng) của lá số cho một tháng dương lịch cụ thể: cung nguyệt hạn + sao chính tại cung đó. Một tháng dương lịch thường trải qua 2 tháng âm lịch — khi đó tool trả về 2 đoạn hạn khác nhau kèm khoảng ngày dương của từng đoạn, và đánh dấu đoạn nào đang diễn ra ngay lúc này. Dùng khi user hỏi về một tháng cụ thể.',
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

const _DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tị','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// ── Tam hợp xung chiếu theo INDEX địa chi ────────────────────────
// palaces[] LUÔN xếp theo địa chi 0=Tý..11=Hợi ở cả hai đường vào (engine
// server + lasoData client gửi qua JSON) → tính tam hợp/xung bằng index AN
// TOÀN, kể cả khi ref palace.tamHopCungs/xungChieuCung (circular) không sống
// sót sau JSON.stringify. Luận hạn cổ điển: một cung hạn phải đọc CẢ chùm tam
// hợp xung chiếu (tam phương tứ chính), không chỉ sao tọa thủ.
//   Tam hợp (tam giác chiếu) = i±4  → (i+4)%12, (i+8)%12
//   Xung chiếu (đối cung)     = i+6
const _tamHopIdx = (i: number): number[] => [(i + 4) % 12, (i + 8) % 12];
const _xungChieuIdx = (i: number): number => (i + 6) % 12;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _fmtStarT(s: any): string {
  if (!s) return '';
  if (typeof s !== 'object') return String(s);
  let t = s.ten || '';
  if (s.brightness) t += `(${s.brightness})`;
  if (s.hoa) t += `[Hóa ${s.hoa}]`;
  return t;
}
// Chính tinh + phụ/sát tinh của MỘT cung (đủ để LLM luận theo ý nghĩa sao).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _palaceStarText(p: any, capPhu = 6): string {
  if (!p) return '?';
  const chinh = (p.majorStars || []).map(_fmtStarT).filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phu = (p.stars || []).filter((s: any) => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(_fmtStarT).filter(Boolean);
  let s = `chính tinh ${chinh.length ? chinh.join(', ') : 'vô chính diệu'}`;
  if (phu.length) s += `; phụ/sát tinh ${phu.slice(0, capPhu).join(', ')}`;
  return s;
}
// Mô tả 1 cung hạn KÈM tam hợp xung chiếu, xếp theo trọng số: tọa thủ (nặng
// nhất) → xung chiếu → tam hợp. Xuống dòng thụt lề cho dễ đọc.
// EXPORT vì `lib/engine/van-han-12.ts` (tool Vận Hạn 12 Tháng Tới) dựng khối
// dữ liệu tháng cho LLM — phải nói CÙNG một thứ với rail chat, chép bản thứ
// hai là hai bản trôi khỏi nhau.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function describeHanCungRich(palaces: any[], idx: number): string {
  if (idx < 0 || !palaces[idx]) return '?';
  const lines: string[] = [];
  lines.push(`tọa thủ (${palaces[idx].cungName}): ${_palaceStarText(palaces[idx])}`);
  const xu = _xungChieuIdx(idx);
  if (palaces[xu]) lines.push(`xung chiếu (${palaces[xu].cungName}): ${_palaceStarText(palaces[xu], 4)}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const th = _tamHopIdx(idx).map((j) => palaces[j]).filter(Boolean) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (th.length) lines.push(`tam hợp (${th.map((p: any) => p.cungName).join(', ')}): ${th.map((p: any) => _palaceStarText(p, 4)).join(' | ')}`);
  return lines.join('\n    ');
}
// Các LayerCung của 1 cung hạn (tọa + xung + tam hợp) cho combo matcher — để
// cách cục hình thành nhờ sao HỘI/XUNG CHIẾU cũng được bắt (không chỉ tọa thủ).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hanClusterLayers(palaces: any[], idx: number, label: string): LayerCung[] {
  if (idx < 0) return [];
  const out: LayerCung[] = [];
  if (palaces[idx]) out.push({ label, palace: palaces[idx] });
  const xu = _xungChieuIdx(idx);
  if (palaces[xu]) out.push({ label: `${label} (xung)`, palace: palaces[xu] });
  for (const j of _tamHopIdx(idx)) if (palaces[j]) out.push({ label: `${label} (tam hợp)`, palace: palaces[j] });
  return out;
}

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
  const tieuHanIdx = palaces.findIndex((x: any) => x.cungName === tv.tieuHanCung);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const luuNienIdx = palaces.findIndex((x: any) => x.cungName === tv.luuNienCung);
  const dv = (lasoData.daiVans || [])[tv.dvIdx];
  const dvIdx = dv && dv.cungIdx != null ? Number(dv.cungIdx) : -1;
  const dvPalace = dvIdx >= 0 ? palaces[dvIdx] : null;
  let out = `VẬN NĂM ${nam} (tuổi ${tv.tuoi}) — TIỂU VẬN KHÔNG có điểm riêng; luận theo CÁCH CỤC + sao (TỌA THỦ + TAM HỢP XUNG CHIẾU) của các cung hạn năm này, đại vận chỉ giới hạn biên độ:\n`;
  if (dv) out += `- KHUNG ĐẠI VẬN ${dv.diaChi} (${dv.tuoiStart}–${dv.tuoiEnd} tuổi)${dvPalace?.cungName ? `, đóng tại cung ${dvPalace.cungName}` : ''}${dv.scoring?.tong != null ? `: điểm ${dv.scoring.tong}/10 ${dv.scoring.flag || ''}` : ''} — điểm này ĐÃ gói tam hợp xung chiếu của cung đại vận; chỉ GIỚI HẠN BIÊN ĐỘ (cao = cái tốt rực rỡ/cái xấu đỡ nhẹ; thấp = cái tốt bị kìm/cái xấu nặng thêm), KHÔNG quyết định tốt/xấu của năm.\n`;
  out += `- Tiểu hạn nhập cung ${tv.tieuHanCung}:\n    ${describeHanCungRich(palaces, tieuHanIdx)}\n`;
  out += `- Lưu niên đại hạn vào cung ${tv.luuNienCung}:\n    ${describeHanCungRich(palaces, luuNienIdx)}\n`;
  // Tổ hợp sao chéo tầng (mức NĂM): đại vận (tọa — điểm đã gói tam hợp) + tiểu
  // hạn & lưu niên KÈM tam hợp xung chiếu để bắt cách cục do sao chiếu tạo thành.
  const yearLayers: LayerCung[] = [
    { label: 'đại vận', palace: dvPalace },
    ...hanClusterLayers(palaces, tieuHanIdx, 'tiểu hạn'),
    ...hanClusterLayers(palaces, luuNienIdx, 'lưu niên'),
  ];
  out += formatComboLines(matchVanHanCombos(yearLayers));
  out += `- Cách luận (BẮT BUỘC xét ĐỦ CẢ HAI tầng năm, KHÔNG được bỏ tầng nào): (A) TIỂU HẠN — cung ${tv.tieuHanCung} + tam hợp xung chiếu của nó; (B) LƯU NIÊN ĐẠI HẠN — cung ${tv.luuNienCung} + tam hợp xung chiếu của nó. Câu trả lời PHẢI gọi tên & luận CẢ hai cung ${tv.tieuHanCung} và ${tv.luuNienCung} (nếu trùng cung thì nói rõ hai tầng chồng nhau → ứng nghiệm mạnh hơn). Mỗi cung ĐỌC CẢ tọa thủ + tam hợp xung chiếu, TRỌNG SỐ: tọa thủ nặng nhất → xung chiếu → tam hợp (cung vô chính diệu thì MƯỢN chính tinh tam hợp/xung để luận) + tổ hợp sao năm nay. XÁC ĐỊNH tốt/xấu của năm theo cách cục + sao của CẢ hai tầng: cát tinh/cách tốt thì năm TỐT dù đại vận xấu, ngược lại XẤU dù đại vận tốt. SAU đó dùng điểm đại vận để chỉnh BIÊN ĐỘ: đại vận thấp thì cái tốt năm nay bị kìm, hưởng dè dặt, không rực rỡ (cái xấu nặng thêm); đại vận cao thì cái tốt bung rực rỡ (cái xấu đỡ nhẹ). KHÔNG bê theme đại vận áp đồng loạt, KHÔNG tự gán "điểm/10" cho năm.\n`;
  return out;
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

  // Một tháng DƯƠNG lịch hầu như luôn bị cắt ngang bởi 2 tháng ÂM lịch (tháng
  // âm ~29,5 ngày, không khớp ranh giới tháng dương) → hàm dùng chung trả về
  // 1 hoặc 2 ĐOẠN, mỗi đoạn đúng MỘT tháng âm, kèm khoảng ngày dương của nó và
  // đánh dấu đoạn nào đang diễn ra NGAY LÚC NÀY (nếu đang hỏi đúng tháng hiện
  // tại). Xem chú thích ở `resolveNguyetHanSegments` (lib/engine/van-ngay.ts).
  const rs = resolveNguyetHanSegments(lasoData, thang, nam);
  if (!rs.ok) return rs.error;
  const { tv, tieuHanIdx, luuNienIdx, segments } = rs;

  const palaces = lasoData.palaces || [];
  // Hai đoạn của một tháng dương có thể thuộc HAI năm âm khác nhau (tháng chứa
  // Tết) ⇒ tiểu hạn khác nhau. Chỉ in một dòng tiểu hạn chung khi cả tháng
  // thật sự nằm trong MỘT năm âm; không thì nêu theo từng đoạn.
  const cungTieuHan = [...new Set(segments.map((x) => String(x.tv.tieuHanCung)))];
  let out = `NGUYỆT HẠN THÁNG ${thang}/${nam} DƯƠNG LỊCH (tuổi ${tv.tuoi}) — đọc CẢ tọa thủ + tam hợp xung chiếu (tọa thủ nặng nhất → xung → tam hợp):\n`;
  if (cungTieuHan.length === 1) out += `- Tiểu hạn năm ÂL ${segments[0]!.namAL}: cung ${cungTieuHan[0]}.\n`;
  if (segments.length > 1) {
    out += `⚠️ Tháng dương lịch này CẮT NGANG 2 tháng âm lịch — dưới đây là 2 ĐOẠN HẠN KHÁC NHAU, PHẢI phân biệt rõ theo ngày khi luận, KHÔNG được gộp chung một hạn cho cả tháng.\n`;
    if (cungTieuHan.length > 1) {
      out += `⚠️ Hai đoạn còn thuộc HAI NĂM ÂM khác nhau (giao thừa nằm trong tháng dương này) nên TIỂU HẠN cũng đổi giữa chừng — mỗi đoạn có nền tiểu hạn riêng, nêu rõ khi luận.\n`;
    }
  }
  for (const seg of segments) {
    const nhanNgay = segments.length > 1 ? `ngày ${seg.tuNgay}–${seg.denNgay}/${thang}` : `cả tháng ${thang}/${nam}`;
    const nowMark = seg.isCurrent ? ' — ĐANG DIỄN RA (hôm nay rơi vào đoạn này)' : '';
    const nenTH = cungTieuHan.length > 1 ? `, nền tiểu hạn năm ÂL ${seg.namAL}: cung ${seg.tv.tieuHanCung}` : '';
    out += `- Đoạn ${nhanNgay} (ÂL tháng ${seg.thangAL}${seg.isLeap ? ' nhuận' : ''})${nowMark}${nenTH}, cung ${_cungNameOf(palaces, seg.nguyetHanIdx)}:\n    ${describeHanCungRich(palaces, seg.nguyetHanIdx)}\n`;
  }

  // Tổ hợp sao chéo tầng (mức THÁNG): đại vận (tọa) + tiểu hạn/lưu niên/nguyệt
  // hạn KÈM tam hợp xung chiếu. Dùng đoạn ĐANG DIỄN RA nếu có (hỏi tháng hiện
  // tại), không thì đoạn đầu tiên (tháng không cắt ngang chỉ có 1 đoạn).
  const activeSeg = segments.find((s) => s.isCurrent) || segments[0]!;
  const _dvM = (lasoData.daiVans || [])[tv.dvIdx];
  const monthLayers: LayerCung[] = [
    { label: 'đại vận', palace: _dvM ? palaces[_dvM.cungIdx] : null },
    ...hanClusterLayers(palaces, tieuHanIdx, 'tiểu hạn'),
    ...hanClusterLayers(palaces, luuNienIdx, 'lưu niên'),
    ...hanClusterLayers(palaces, activeSeg.nguyetHanIdx, 'nguyệt hạn'),
  ];
  out += formatComboLines(matchVanHanCombos(monthLayers));
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function execTraNhatVan(lasoData: any, input: any): string {
  const ngay = Number(input?.ngay), thang = Number(input?.thang), nam = Number(input?.nam);
  if (!ngay || !thang || !nam) return 'Thiếu tham số ngày, tháng hoặc năm.';

  // Phép "ngày này rơi vào cung nào" dùng CHUNG với thẻ Vận Ngày
  // (lib/engine/van-ngay.ts) — thẻ cần kết quả có cấu trúc, tool cần chuỗi cho
  // model đọc; giữ hai bản tính song song thì sớm muộn chúng trôi khỏi nhau.
  const rs = resolveNhatHanIdx(lasoData, ngay, thang, nam);
  if (!rs.ok) return rs.error;
  const { nhatHanIdx, nguyetHanIdx, tieuHanIdx, tv, ngayAL, thangAL } = rs;

  const palaces = lasoData.palaces || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const luuNienIdx = palaces.findIndex((x: any) => x.cungName === tv.luuNienCung);
  let out = `NHẬT HẠN NGÀY ${ngay}/${thang}/${nam} (ÂL ngày ${ngayAL} tháng ${thangAL}, tuổi ${tv.tuoi}) — đọc CẢ tọa thủ + tam hợp xung chiếu (tọa thủ nặng nhất → xung → tam hợp):\n`;
  out += `- Nguyệt hạn ÂL tháng ${thangAL}, cung ${_cungNameOf(palaces, nguyetHanIdx)}:\n    ${describeHanCungRich(palaces, nguyetHanIdx)}\n`;
  out += `- Nhật hạn ÂL ngày ${ngayAL}, cung ${_cungNameOf(palaces, nhatHanIdx)}:\n    ${describeHanCungRich(palaces, nhatHanIdx)}\n`;
  // Tổ hợp sao chéo tầng (mức NGÀY): đại vận (tọa) + tiểu hạn/lưu niên/nguyệt
  // hạn/nhật hạn KÈM tam hợp xung chiếu.
  const _dvD = (lasoData.daiVans || [])[tv.dvIdx];
  const dayLayers: LayerCung[] = [
    { label: 'đại vận', palace: _dvD ? palaces[_dvD.cungIdx] : null },
    ...hanClusterLayers(palaces, tieuHanIdx, 'tiểu hạn'),
    ...hanClusterLayers(palaces, luuNienIdx, 'lưu niên'),
    ...hanClusterLayers(palaces, nguyetHanIdx, 'nguyệt hạn'),
    ...hanClusterLayers(palaces, nhatHanIdx, 'nhật hạn'),
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
