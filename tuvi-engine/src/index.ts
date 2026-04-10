// ============================================================
// PUBLIC API — Tử Vi Đẩu Số Engine v2
// ============================================================

// Main function
export { anSaoLaSo } from './engine.js';

// Conversion
export { convertDuongToAm, solarToLunar } from './lunar/convert.js';

// Star data queries
export { getStarData, getStarBrightness, STAR_DATA } from './stars/star-data.js';

// Individual star placement (for testing / external use)
export { anChinhTinh, lapCuc, dinhCungMenh, dinhCungThan } from './stars/chinh-tinh.js';
export { anThaiTue, anLocTon, anTrangSinh } from './stars/thai-tue-loc-ton.js';
export { anLucSat } from './stars/luc-sat.js';
export { anPhuTinh } from './stars/phu-tinh.js';
export { getTuanTriet } from './stars/star-data.js';

// Vận hạn
export { tinhDaiVan, tinhTieuHan, tinhLuuDaiHan } from './van-han/index.js';

// Scoring
export { tinhThienThoi, tinhDiaLoi, scoreDaiVan } from './scoring/index.js';

// Constants
export {
  DIA_CHI, THIEN_CAN, TEN_CUNG, NAP_AM, TU_HOA,
  THAI_TUE_SEQ, THAI_TUE_NHOM, THAI_TUE_NHOM_Y_NGHIA,
  LOC_TON_START, HOA_LINH_KHOI,
} from './constants.js';

// Types
export type {
  AnSaoParams,
  LasoResult,
  Palace,
  Star,
  DaiVan,
  CachCuc,
  CungYNghia,
  CungScores,
  DiaChi,
  ThienCan,
  NguHanh,
  AmDuong,
  Gioitinh,
  ConvertDuongToAmResult,
  StarDataEntry,
  Brightness,
  StarGroup,
} from './types.js';
