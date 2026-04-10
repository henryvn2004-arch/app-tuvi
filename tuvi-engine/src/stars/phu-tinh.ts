// ============================================================
// AN PHỤ TINH — all supporting stars
// ============================================================
import { mod12, dcIdx, isThuanChieu } from '../helpers.js';
import { dinhCungMenh, dinhCungThan } from './chinh-tinh.js';
import type { DiaChi, ThienCan } from '../types.js';

// ─── Lookup tables (inlined) ──────────────────────────────────
const KHOI: Record<ThienCan, DiaChi> = {
  'Giáp':'Sửu','Ất':'Tý','Bính':'Hợi','Đinh':'Hợi','Mậu':'Sửu',
  'Kỷ':'Tý','Canh':'Ngọ','Tân':'Ngọ','Nhâm':'Mão','Quý':'Mão',
};
const VIET: Record<ThienCan, DiaChi> = {
  'Giáp':'Mùi','Ất':'Thân','Bính':'Dậu','Đinh':'Dậu','Mậu':'Mùi',
  'Kỷ':'Thân','Canh':'Dần','Tân':'Dần','Nhâm':'Tỵ','Quý':'Tỵ',
};
const DAO_HOA: Record<DiaChi, DiaChi> = {
  'Tý':'Dậu','Ngọ':'Mão','Mão':'Tý','Dậu':'Ngọ','Dần':'Mão','Thân':'Dậu',
  'Tỵ':'Ngọ','Hợi':'Tý','Thìn':'Dậu','Tuất':'Mão','Sửu':'Tuất','Mùi':'Tý',
};
const THIEN_MA: Record<DiaChi, DiaChi> = {
  'Dần':'Thân','Ngọ':'Thân','Tuất':'Thân','Thân':'Dần','Tý':'Dần','Thìn':'Dần',
  'Hợi':'Tỵ','Mão':'Tỵ','Mùi':'Tỵ','Tỵ':'Hợi','Dậu':'Hợi','Sửu':'Hợi',
};
const KIEP_SAT: Record<DiaChi, DiaChi> = {
  'Tỵ':'Dần','Dậu':'Dần','Sửu':'Dần','Dần':'Hợi','Ngọ':'Hợi','Tuất':'Hợi',
  'Hợi':'Thân','Mão':'Thân','Mùi':'Thân','Thân':'Tỵ','Tý':'Tỵ','Thìn':'Tỵ',
};
const PHA_TOAI: Record<DiaChi, DiaChi> = {
  'Tý':'Tỵ','Ngọ':'Tỵ','Mão':'Tỵ','Dậu':'Tỵ','Dần':'Dậu','Thân':'Dậu',
  'Tỵ':'Dậu','Hợi':'Dậu','Thìn':'Sửu','Tuất':'Sửu','Sửu':'Sửu','Mùi':'Sửu',
};
const HOA_CAI: Record<DiaChi, DiaChi> = {
  'Tý':'Thìn','Ngọ':'Tuất','Mão':'Mùi','Dậu':'Sửu','Dần':'Ngọ','Thân':'Tý',
  'Tỵ':'Sửu','Hợi':'Mão','Thìn':'Thân','Tuất':'Dần','Sửu':'Tỵ','Mùi':'Hợi',
};
const LUU_HA: Record<ThienCan, DiaChi> = {
  'Giáp':'Dậu','Ất':'Tuất','Bính':'Mùi','Đinh':'Thân','Mậu':'Tỵ',
  'Kỷ':'Ngọ','Canh':'Thìn','Tân':'Mão','Nhâm':'Hợi','Quý':'Tý',
};
const THIEN_TRU: Record<ThienCan, DiaChi> = {
  'Giáp':'Tỵ','Ất':'Ngọ','Bính':'Mùi','Đinh':'Thân','Mậu':'Dậu',
  'Kỷ':'Thân','Canh':'Hợi','Tân':'Tý','Nhâm':'Sửu','Quý':'Dần',
};
const THIEN_DUC: Record<DiaChi, DiaChi> = {
  'Tý':'Dậu','Sửu':'Tuất','Dần':'Hợi','Mão':'Tý','Thìn':'Sửu','Tỵ':'Dần',
  'Ngọ':'Mão','Mùi':'Thìn','Thân':'Tỵ','Dậu':'Ngọ','Tuất':'Mùi','Hợi':'Thân',
};
const NGUYET_DUC: Record<DiaChi, DiaChi> = {
  'Tý':'Tỵ','Sửu':'Ngọ','Dần':'Mùi','Mão':'Thân','Thìn':'Dậu','Tỵ':'Tuất',
  'Ngọ':'Hợi','Mùi':'Tý','Thân':'Sửu','Dậu':'Dần','Tuất':'Mão','Hợi':'Thìn',
};
const CO_THAN: Record<DiaChi, DiaChi> = {
  'Tý':'Dần','Sửu':'Dần','Dần':'Tỵ','Mão':'Tỵ','Thìn':'Tỵ','Tỵ':'Thân',
  'Ngọ':'Thân','Mùi':'Thân','Thân':'Hợi','Dậu':'Hợi','Tuất':'Hợi','Hợi':'Dần',
};
const QUA_TU: Record<DiaChi, DiaChi> = {
  'Tý':'Tuất','Sửu':'Tuất','Dần':'Sửu','Mão':'Sửu','Thìn':'Sửu','Tỵ':'Thìn',
  'Ngọ':'Thìn','Mùi':'Thìn','Thân':'Mùi','Dậu':'Mùi','Tuất':'Mùi','Hợi':'Tuất',
};
const THIEN_QUAN: Record<ThienCan, DiaChi> = {
  'Giáp':'Mùi','Ất':'Mùi','Bính':'Thìn','Đinh':'Dần','Mậu':'Mão',
  'Kỷ':'Dậu','Canh':'Hợi','Tân':'Dậu','Nhâm':'Tuất','Quý':'Ngọ',
};
const THIEN_PHUC: Record<ThienCan, DiaChi> = {
  'Giáp':'Dậu','Ất':'Dậu','Bính':'Thân','Đinh':'Hợi','Mậu':'Mão',
  'Kỷ':'Dần','Canh':'Ngọ','Tân':'Tỵ','Nhâm':'Ngọ','Quý':'Tỵ',
};
const QUOC_AN_MAP: Record<DiaChi, DiaChi> = {
  'Thân':'Tuất','Tý':'Tuất','Thìn':'Tuất','Dần':'Thìn','Ngọ':'Thìn','Tuất':'Mùi',
  'Tỵ':'Mùi','Dậu':'Mùi','Sửu':'Dần','Hợi':'Sửu','Mão':'Sửu','Mùi':'Dậu',
};

// ─── Main function ────────────────────────────────────────────
export function anPhuTinh(
  canNam: ThienCan,
  chiNam: DiaChi,
  thangAL: number,
  ngayAL: number,
  gioIdx: number,
  locTonIdx: number,
): Record<string, number> {
  // Tả Phụ / Hữu Bật
  const taPhu  = mod12(dcIdx('Thìn') + thangAL - 1);
  const huuBat = mod12(dcIdx('Tuất') - thangAL + 1);

  // Văn Xương / Văn Khúc
  const vanXuong = mod12(dcIdx('Tuất') - gioIdx);
  const vanKhuc  = mod12(dcIdx('Thìn') + gioIdx);

  // Long Trì / Phượng Các
  const chiNamIdx = dcIdx(chiNam);
  const longTri   = mod12(dcIdx('Thìn') + chiNamIdx);
  const phuongCac = mod12(dcIdx('Tuất') - chiNamIdx);

  // Thiên Khốc / Thiên Hư
  const thienKhoc = mod12(dcIdx('Ngọ') - chiNamIdx);
  const thienHu   = mod12(dcIdx('Ngọ') + chiNamIdx);

  // Tam Thai / Bát Tọa
  const tamThai = mod12(taPhu + ngayAL - 1);
  const batToa  = mod12(huuBat - ngayAL + 1);

  // Ân Quang / Thiên Quý
  const anQuang  = mod12(vanXuong + ngayAL - 2);
  const thienQuy = mod12(vanKhuc - ngayAL + 2);

  // Thiên Khôi / Thiên Việt
  const thienKhoi = dcIdx(KHOI[canNam]);
  const thienViet = dcIdx(VIET[canNam]);

  // Đào Hoa / Thiên Mã
  const daoHoa  = dcIdx(DAO_HOA[chiNam] ?? 'Tý');
  const thienMa = dcIdx(THIEN_MA[chiNam] ?? 'Tý');

  // Kiếp Sát / Phá Toái / Hoa Cái
  const kiepSat = dcIdx(KIEP_SAT[chiNam] ?? 'Tý');
  const phaToai = dcIdx(PHA_TOAI[chiNam] ?? 'Tý');
  const hoaCai  = dcIdx(HOA_CAI[chiNam] ?? 'Tý');

  // Lưu Hà / Thiên Trù
  const luuHa   = dcIdx(LUU_HA[canNam]   ?? 'Tý');
  const thienTru = dcIdx(THIEN_TRU[canNam] ?? 'Tý');

  // Thiên Đức / Nguyệt Đức / Hồng Loan / Thiên Hỷ
  const thienDuc  = dcIdx(THIEN_DUC[chiNam] ?? 'Tý');
  const nguyetDuc = dcIdx(NGUYET_DUC[chiNam] ?? 'Tý');
  const hongLoan  = mod12(dcIdx('Mão') - chiNamIdx);
  const thienHy   = mod12(hongLoan + 6);

  // Cô Thần / Quả Tú
  const coThan = dcIdx(CO_THAN[chiNam] ?? 'Tý');
  const quaTu  = dcIdx(QUA_TU[chiNam]  ?? 'Tý');

  // Thiên Quan / Thiên Phúc / Thiên Không
  const thienQuan  = dcIdx(THIEN_QUAN[canNam] ?? 'Tý');
  const thienPhuc  = dcIdx(THIEN_PHUC[canNam] ?? 'Tý');
  const thienKhong = mod12(dcIdx('Tý') + gioIdx);

  // Thiên Tài / Thiên Thọ
  const _menhIdx = dinhCungMenh(thangAL, gioIdx);
  const _thanIdx = dinhCungThan(thangAL, gioIdx);
  const thienTai    = mod12(_menhIdx + chiNamIdx);
  const thienTho    = mod12(_thanIdx + chiNamIdx);
  const thienThuong = mod12(_menhIdx + 5);
  const thienSu     = mod12(_menhIdx + 7);

  // Đẩu Quân
  const _thaiTueIdx  = dcIdx(chiNam);
  const _dauQuanBase = mod12(_thaiTueIdx - (thangAL - 1));
  const dauQuan      = mod12(_dauQuanBase + gioIdx);

  // Lưu Niên Văn Tinh
  const luuNienVanTinh = mod12(locTonIdx + 3);

  // Sao theo tháng
  const thienGiai = mod12(dcIdx('Thân') + thangAL - 1);
  const diaGiai   = mod12(dcIdx('Mùi')  + thangAL - 1);
  const thienHinh = mod12(dcIdx('Dậu')  + thangAL - 1);
  const thienRieu = mod12(dcIdx('Sửu')  + thangAL - 1);
  const thienY    = mod12(dcIdx('Sửu')  + thangAL - 1);
  const thaiPhu   = mod12(dcIdx('Ngọ')  + gioIdx);
  const phongCao  = mod12(dcIdx('Dần')  + gioIdx);

  // Sao theo Lộc Tồn
  const giaiThan = phuongCac;
  const quocAn   = dcIdx(QUOC_AN_MAP[chiNam] ?? 'Tuất');
  const duongPhu = mod12(locTonIdx - 7);
  const bacSy    = locTonIdx;

  // Cố định
  const thienLa  = dcIdx('Thìn');
  const diaVong  = dcIdx('Tuất');

  return {
    'Tả Phụ':taPhu,'Hữu Bật':huuBat,'Văn Xương':vanXuong,'Văn Khúc':vanKhuc,
    'Long Trì':longTri,'Phượng Các':phuongCac,'Thiên Khốc':thienKhoc,'Thiên Hư':thienHu,
    'Tam Thai':tamThai,'Bát Tọa':batToa,'Ân Quang':anQuang,'Thiên Quý':thienQuy,
    'Thiên Khôi':thienKhoi,'Thiên Việt':thienViet,'Đào Hoa':daoHoa,
    'Thiên Mã':thienMa,'Kiếp Sát':kiepSat,'Phá Toái':phaToai,'Hoa Cái':hoaCai,
    'Lưu Hà':luuHa,'Thiên Trù':thienTru,
    'Thiên Đức':thienDuc,'Nguyệt Đức':nguyetDuc,'Hồng Loan':hongLoan,'Thiên Hỷ':thienHy,
    'Cô Thần':coThan,'Quả Tú':quaTu,
    'Thiên Quan':thienQuan,'Thiên Phúc':thienPhuc,'Thiên Không':thienKhong,
    'Thiên Thương':thienThuong,'Thiên Sứ':thienSu,'Đẩu Quân':dauQuan,
    'Lưu Niên Văn Tinh':luuNienVanTinh,
    'Thiên Tài':thienTai,'Thiên Thọ':thienTho,
    'Thiên Giải':thienGiai,'Địa Giải':diaGiai,'Giải Thần':giaiThan,
    'Thiên Hình':thienHinh,'Thiên Riêu':thienRieu,'Thiên Y':thienY,
    'Thai Phụ':thaiPhu,'Phong Cáo':phongCao,
    'Quốc Ấn':quocAn,'Đường Phù':duongPhu,'Bác Sỹ':bacSy,
    'Thiên La':thienLa,'Địa Võng':diaVong,
  };
}
