// ============================================================
// STAR DATA + TU HOA helpers
// ============================================================
import { TUAN_BANG, TRIET_BANG, THIEN_CAN } from '../constants.js';
import { mod12, dcIdx } from '../helpers.js';
import type { DiaChi, ThienCan, Brightness, StarDataEntry } from '../types.js';

// ─── STAR_DATA ───────────────────────────────────────────────
export const STAR_DATA: Record<string, StarDataEntry> = {
  'Tử Vi':       { type:'chính tinh', element:'thổ',   weight:10, traits:['uy quyền','tài lộc','phúc đức'],    positions:{mien:['Tỵ','Ngọ','Dần','Thân'],vuong:['Thìn','Tuất'],dac:['Sửu','Mùi'],binh:['Hợi','Tý','Mão','Dậu']} },
  'Liêm Trinh':  { type:'chính tinh', element:'hỏa',   weight:8,  traits:['quan lộc','hình ngục','đào hoa'],   positions:{mien:['Thìn','Tuất'],vuong:['Tý','Ngọ','Dần','Thân'],dac:['Sửu','Mùi'],ham:['Tỵ','Hợi','Mão','Dậu']} },
  'Thiên Đồng':  { type:'chính tinh', element:'thủy',  weight:7,  traits:['phúc thọ','hiền hòa'],              positions:{mien:['Dần','Thân'],vuong:['Tý'],dac:['Mão','Tỵ','Hợi'],ham:['Ngọ','Dậu','Thìn','Tuất','Sửu','Mùi']} },
  'Vũ Khúc':     { type:'chính tinh', element:'kim',   weight:9,  traits:['tài lộc','cương nghị'],             positions:{mien:['Thìn','Tuất','Sửu','Mùi'],vuong:['Dần','Thân','Tý','Ngọ'],dac:['Mão','Dậu'],ham:['Tỵ','Hợi']} },
  'Thái Dương':  { type:'chính tinh', element:'hỏa',   weight:9,  traits:['quan lộc','uy quyền'],              positions:{mien:['Tỵ','Ngọ'],vuong:['Dần','Mão','Thìn'],dac:['Sửu','Mùi'],ham:['Thân','Dậu','Tuất','Hợi','Tý']} },
  'Thiên Cơ':    { type:'chính tinh', element:'mộc',   weight:8,  traits:['trí tuệ','mưu cơ'],                 positions:{mien:['Thìn','Tuất','Mão','Dậu'],vuong:['Tỵ','Thân'],dac:['Tý','Ngọ','Sửu','Mùi'],ham:['Dần','Hợi']} },
  'Thiên Phủ':   { type:'chính tinh', element:'thổ',   weight:9,  traits:['kho tàng','tài lộc'],               positions:{mien:['Dần','Thân','Tý','Ngọ'],vuong:['Thìn','Tuất'],dac:['Tỵ','Hợi','Mùi'],binh:['Mão','Dậu','Sửu']} },
  'Thái Âm':     { type:'chính tinh', element:'thủy',  weight:9,  traits:['điền trạch','phú quý'],             positions:{mien:['Dậu','Tuất','Hợi'],vuong:['Thân','Tý'],dac:['Sửu','Mùi'],ham:['Dần','Mão','Thìn','Tỵ','Ngọ']} },
  'Tham Lang':   { type:'chính tinh', element:'thủy',  weight:8,  traits:['dục vọng','tài lộc'],               positions:{mien:['Sửu','Mùi'],vuong:['Thìn','Tuất'],dac:['Dần','Thân'],ham:['Tỵ','Hợi','Tý','Ngọ','Mão','Dậu']} },
  'Cự Môn':      { type:'chính tinh', element:'thủy',  weight:8,  traits:['thị phi','ngôn ngữ'],               positions:{mien:['Mão','Dậu'],vuong:['Tý','Ngọ','Dần'],dac:['Thân','Hợi'],ham:['Thìn','Tuất','Sửu','Mùi','Tỵ']} },
  'Thiên Tướng': { type:'chính tinh', element:'thủy',  weight:8,  traits:['phò tá','quan lộc'],                positions:{mien:['Dần','Thân'],vuong:['Thìn','Tuất','Tý','Ngọ'],dac:['Sửu','Mùi','Tỵ','Hợi'],ham:['Mão','Dậu']} },
  'Thiên Lương': { type:'chính tinh', element:'mộc',   weight:8,  traits:['phúc thọ','giải ách'],              positions:{mien:['Ngọ','Thìn','Tuất'],vuong:['Tý','Mão','Dần','Thân'],dac:['Sửu','Mùi'],ham:['Dậu','Tỵ','Hợi']} },
  'Thất Sát':    { type:'chính tinh', element:'kim',   weight:9,  traits:['sát phạt','quyền lực'],             positions:{mien:['Dần','Thân','Tý','Ngọ'],vuong:['Tỵ','Hợi'],dac:['Sửu','Mùi'],ham:['Mão','Dậu','Thìn','Tuất']} },
  'Phá Quân':    { type:'chính tinh', element:'thủy',  weight:9,  traits:['phá tán','biến động'],              positions:{mien:['Tý','Ngọ'],vuong:['Sửu','Mùi'],dac:['Thìn','Tuất'],ham:['Mão','Dậu','Dần','Thân','Tỵ','Hợi']} },
  'Kình Dương':  { type:'sát tinh',   element:'kim',   weight:10, traits:['sát phạt','bạo lực'],               positions:{dac:['Thìn','Tuất','Sửu','Mùi'],ham:['Tý','Dần','Mão','Tỵ','Ngọ','Thân','Dậu','Hợi']} },
  'Đà La':       { type:'sát tinh',   element:'kim',   weight:10, traits:['tai họa','bệnh tật'],               positions:{dac:['Thìn','Sửu','Mùi'],ham:['Tý','Dần','Mão','Tỵ','Ngọ','Thân','Dậu','Tuất','Hợi']} },
  'Hỏa Tinh':    { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['bạo phát','tai họa'],               positions:{dac:['Dần','Mão','Thìn','Tỵ','Ngọ'],ham:['Tý','Sửu','Mùi','Thân','Dậu','Tuất','Hợi']} },
  'Linh Tinh':   { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['đột biến','tai họa'],               positions:{dac:['Dần','Mão','Thìn','Tỵ','Ngọ'],ham:['Tý','Sửu','Mùi','Thân','Dậu','Tuất','Hợi']} },
  'Kiếp Sát':    { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['đâm chém','tai họa'],               positions:{dac:['Dần','Thân','Tỵ','Hợi'],ham:['Tý','Sửu','Mão','Thìn','Ngọ','Mùi','Dậu','Tuất']} },
  'Địa Không':   { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['hao tổn','bất thành'],              positions:{dac:['Dần','Thân','Tỵ','Hợi'],ham:['Tý','Sửu','Mão','Thìn','Ngọ','Mùi','Dậu','Tuất']} },
  'Địa Kiếp':    { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['kiếp tài','hung hiểm'],             positions:{dac:['Dần','Thân','Tỵ','Hợi'],ham:['Tý','Sửu','Mão','Thìn','Ngọ','Mùi','Dậu','Tuất']} },
  'Thiên Không': { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['hư vô','phá tán','mất mát bất ngờ'] },
  'Thiên Hình':  { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['hình pháp','dao kéo'],              positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Lưu Hà':      { type:'sát tinh',   element:'thủy',  weight:9,  traits:['máu huyết','tai nạn'] },
  'Thiên La':    { type:'hung tinh',  element:'thổ',   weight:7,  traits:['giam hãm','rắc rối'] },
  'Địa Võng':    { type:'hung tinh',  element:'thổ',   weight:7,  traits:['giam hãm','rắc rối'] },
  'Thiên Thương':{ type:'hung tinh',  element:'thổ',   weight:7,  traits:['tai họa','tang thương'] },
  'Thiên Sứ':    { type:'hung tinh',  element:'thủy',  weight:7,  traits:['tai họa','tang thương'] },
  'Lộc Tồn':     { type:'quý tinh',   element:'thổ',   weight:8,  traits:['tài lộc','phúc thọ'] },
  'Thiên Mã':    { type:'phụ tinh',   element:'hỏa',   weight:7,  traits:['di chuyển','thay đổi'],             positions:{dac:['Tỵ','Dần']} },
  'Đào Hoa':     { type:'phụ tinh',   element:'mộc',   weight:6,  traits:['tình duyên'] },
  'Hồng Loan':   { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['hôn nhân'] },
  'Thiên Hỷ':    { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['niềm vui'] },
  'Tả Phụ':      { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['trợ lực','phò tá'] },
  'Hữu Bật':     { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['trợ lực','phò tá'] },
  'Văn Xương':   { type:'phụ tinh',   element:'kim',   weight:7,  traits:['văn học','thi cử'],                 positions:{dac:['Thìn','Tuất','Sửu','Mùi','Tỵ','Hợi'],ham:['Dần','Ngọ','Tuất']} },
  'Văn Khúc':    { type:'phụ tinh',   element:'thủy',  weight:7,  traits:['văn học','nghệ thuật'],             positions:{dac:['Hợi','Tuất','Tỵ','Mùi','Sửu','Thìn'],ham:['Thân','Dần','Tý','Ngọ']} },
  'Long Trì':    { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['phúc','quý nhân'] },
  'Phượng Các':  { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['phúc','quý nhân'] },
  'Thiên Khốc':  { type:'bại tinh',   element:'thủy',  weight:7,  traits:['buồn khổ'],                         positions:{dac:['Tý','Ngọ','Dần','Thân'],ham:['Sửu','Mão','Thìn','Tỵ','Mùi','Dậu','Tuất','Hợi']} },
  'Thiên Hư':    { type:'bại tinh',   element:'thủy',  weight:7,  traits:['sầu não'],                          positions:{dac:['Tý','Ngọ','Dần','Thân'],ham:['Sửu','Mão','Thìn','Tỵ','Mùi','Dậu','Tuất','Hợi']} },
  'Tam Thai':    { type:'phụ tinh',   element:'thủy',  weight:5,  traits:['uy nghi','phúc'] },
  'Bát Tọa':     { type:'phụ tinh',   element:'mộc',   weight:5,  traits:['uy nghi','phúc'] },
  'Ân Quang':    { type:'phụ tinh',   element:'mộc',   weight:6,  traits:['quý nhân','giải hạn'] },
  'Thiên Quý':   { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['quý nhân','giải hạn'] },
  'Thiên Khôi':  { type:'phụ tinh',   element:'hỏa',   weight:7,  traits:['quý nhân'] },
  'Thiên Việt':  { type:'phụ tinh',   element:'hỏa',   weight:7,  traits:['quý nhân'] },
  'Thiên Tài':   { type:'phụ tinh',   element:'thổ',   weight:5,  traits:['điều hòa cát hung'] },
  'Thiên Thọ':   { type:'phúc tinh',  element:'thổ',   weight:6,  traits:['tăng phúc thọ'] },
  'Thiên Giải':  { type:'phúc tinh',  element:'hỏa',   weight:6,  traits:['giải hạn','cứu nguy'] },
  'Địa Giải':    { type:'phúc tinh',  element:'thổ',   weight:6,  traits:['giải hạn','cứu nguy'] },
  'Giải Thần':   { type:'phúc tinh',  element:'mộc',   weight:6,  traits:['giải trừ tai họa'] },
  'Thiên Đức':   { type:'phúc tinh',  element:'hỏa',   weight:6,  traits:['đức độ','giải hạn'] },
  'Nguyệt Đức':  { type:'phúc tinh',  element:'hỏa',   weight:6,  traits:['đức độ','giải hạn'] },
  'Thiên Y':     { type:'phúc tinh',  element:'thủy',  weight:6,  traits:['y dược','cứu bệnh'] },
  'Thiên Quan':  { type:'phúc tinh',  element:'hỏa',   weight:6,  traits:['quý nhân','giải hạn','cứu nguy'] },
  'Thiên Phúc':  { type:'phúc tinh',  element:'thổ',   weight:6,  traits:['phúc đức','quý nhân trợ giúp'] },
  'Cô Thần':     { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['cô độc'] },
  'Quả Tú':      { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['cô độc'] },
  'Hoa Cái':     { type:'phụ tinh',   element:'kim',   weight:6,  traits:['phú quý','tâm linh'] },
  'Thiên Trù':   { type:'phụ tinh',   element:'thổ',   weight:5,  traits:['ẩm thực','tài lộc'] },
  'Phá Toái':    { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['phá tán','trở ngại'] },
  'Quốc Ấn':     { type:'phụ tinh',   element:'thổ',   weight:7,  traits:['quyền ấn','chức vị'] },
  'Đường Phù':   { type:'phụ tinh',   element:'mộc',   weight:6,  traits:['uy nghi','công danh'] },
  'Thái Tuế':    { type:'tuế_tinh',   element:'hỏa',   weight:7,  traits:['uy quyền','thị phi'] },
  'Thiếu Dương': { type:'tuế_tinh',   element:'hỏa',   weight:5,  traits:['thông minh','may mắn'] },
  'Tang Môn':    { type:'bại tinh',   element:'mộc',   weight:8,  traits:['tang thương'],                      positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Thiếu Âm':    { type:'tuế_tinh',   element:'thủy',  weight:5,  traits:['nhân hậu','may mắn'] },
  'Quan Phù':    { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['thị phi','kiện cáo'] },
  'Tử Phù':      { type:'hung tinh',  element:'hỏa',   weight:6,  traits:['tang thương','ngăn trở'] },
  'Tuế Phá':     { type:'tuế_tinh',   element:'hỏa',   weight:7,  traits:['phá tán','ngang ngược'] },
  'Long Đức':    { type:'phúc tinh',  element:'thủy',  weight:6,  traits:['đức độ','giải hạn'] },
  'Bạch Hổ':     { type:'bại tinh',   element:'kim',   weight:8,  traits:['tai nạn'] },
  'Phúc Đức':    { type:'phúc tinh',  element:'thổ',   weight:6,  traits:['đức độ','phúc thọ'] },
  'Điếu Khách':  { type:'bại tinh',   element:'hỏa',   weight:6,  traits:['tai nạn','bệnh tật'] },
  'Trực Phù':    { type:'hung tinh',  element:'hỏa',   weight:6,  traits:['tang thương','ngăn trở'] },
  'Lực Sỹ':      { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['sức mạnh','uy lực'] },
  'Thanh Long':  { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['may mắn','công danh'] },
  'Tiểu Hao':    { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['hao tài'],                          positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Tướng Quân':  { type:'phụ tinh',   element:'mộc',   weight:7,  traits:['quyền lực','lãnh đạo'] },
  'Tấu Thư':     { type:'phụ tinh',   element:'kim',   weight:5,  traits:['văn học','đàm luận'] },
  'Phi Liêm':    { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['nhanh nhẹn','biến động'] },
  'Hỷ Thần':     { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['niềm vui','hỷ sự'] },
  'Đại Hao':     { type:'bại tinh',   element:'hỏa',   weight:8,  traits:['hao tài'],                          positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Bệnh Phù':    { type:'bại tinh',   element:'thổ',   weight:6,  traits:['bệnh tật'] },
  'Phục Binh':   { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['ám hại','lừa đảo'] },
  'Đẩu Quân':    { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['nghiêm nghị','giữ của'] },
  'Bác Sỹ':      { type:'phụ tinh',   element:'thủy',  weight:5,  traits:['trí tuệ'] },
  'Tràng Sinh':  { type:'vòng_trang_sinh', element:'thủy', weight:7, traits:['sinh trưởng'] },
  'Mộc Dục':     { type:'vòng_trang_sinh', element:'thủy', weight:6, traits:['thay đổi'] },
  'Quan Đới':    { type:'vòng_trang_sinh', element:'kim',  weight:7, traits:['danh vọng'] },
  'Lâm Quan':    { type:'vòng_trang_sinh', element:'kim',  weight:7, traits:['thịnh đạt'] },
  'Đế Vượng':    { type:'vòng_trang_sinh', element:'kim',  weight:8, traits:['cực thịnh'] },
  'Suy':         { type:'vòng_trang_sinh', element:'thủy', weight:4, traits:['suy yếu'] },
  'Bệnh':        { type:'vòng_trang_sinh', element:'hỏa',  weight:3, traits:['bệnh tật'] },
  'Tử':          { type:'vòng_trang_sinh', element:'thủy', weight:2, traits:['chết'] },
  'Mộ':          { type:'vòng_trang_sinh', element:'thổ',  weight:3, traits:['chôn cất'] },
  'Tuyệt':       { type:'vòng_trang_sinh', element:'thổ',  weight:2, traits:['bế tắc'] },
  'Thai':        { type:'vòng_trang_sinh', element:'thổ',  weight:5, traits:['sinh'] },
  'Dưỡng':       { type:'vòng_trang_sinh', element:'mộc',  weight:6, traits:['nuôi dưỡng'] },
  'Tuần':        { type:'tuan_triet', weight:5, traits:['hạn chế','trống không'] },
  'Triệt':       { type:'tuan_triet', weight:5, traits:['hạn chế','trống không'] },
  'Thiên Riêu':  { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['phong lưu','tình ái'] },
};

export function getStarData(tenSao: string): StarDataEntry {
  return STAR_DATA[tenSao] ?? { type:'phụ tinh', weight:5, traits:[] };
}

export function getStarBrightness(tenSao: string, diaChi: DiaChi): Brightness {
  const data = STAR_DATA[tenSao];
  if (!data?.positions) return 'Bình';
  const pos = data.positions;
  if (pos.mien?.includes(diaChi))  return 'Miếu';
  if (pos.vuong?.includes(diaChi)) return 'Vượng';
  if (pos.dac?.includes(diaChi))   return 'Đắc';
  if (pos.binh?.includes(diaChi))  return 'Bình';
  if (pos.ham?.includes(diaChi))   return 'Hãm';
  return 'Bình';
}

// ─── Tuần Triệt ───────────────────────────────────────────────
export function getTuanTriet(canChi: string, canNam: ThienCan): { tuan: number[]; triet: number[] } {
  let tuan: number[] | null = null;
  const chiNam = canChi.split(' ')[1]!;
  const canNamStr = canChi.split(' ')[0]!;
  for (const [key, val] of Object.entries(TUAN_BANG)) {
    const canTuan = key.split(' ')[0]!;
    const chiTuan = key.split(' ')[1]!;
    const tuanIdx   = dcIdx(chiTuan);
    const chiNamIdx = dcIdx(chiNam);
    const diff    = mod12(chiNamIdx - tuanIdx);
    const canDiff = THIEN_CAN.indexOf(canNamStr as ThienCan) - THIEN_CAN.indexOf(canTuan as ThienCan);
    if (diff < 10 && diff >= 0 && ((canDiff % 10 + 10) % 10) === diff % 10) {
      tuan = val.map(dcIdx);
      break;
    }
  }
  const triet = (TRIET_BANG[canNam] ?? []).map(dcIdx);
  return { tuan: tuan ?? [], triet };
}
