// ============================================================
// NGÀY TỐT — PUBLIC API
// ============================================================
export { computeNgayTot, computeMonth, jdFromDate } from './engine.js';
export type { NgayTotInfo, GioInfo } from './engine.js';

export { scoreActivity, scoreAllActivities, topDaysForActivity } from './activities.js';
export type { ActivityScore } from './activities.js';

export {
  ACTIVITY_LIST, ACTIVITY_META,
  TRUC_LIST, TRUC_TINH_CHAT,
  NHI_THAP_BAT_TU, TU_TINH_CHAT,
  HOANG_HAC_SAO,
  TAM_NUONG_AL, NGUYET_KY_AL, DUONG_CONG_KY,
} from './constants.js';
export type { ActivityKey, Truc, Tu } from './constants.js';
