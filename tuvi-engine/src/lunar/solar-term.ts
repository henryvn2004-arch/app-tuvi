// ============================================================
// TIẾT KHÍ — chi của THÁNG theo mặt trời (tháng tiết khí / 節月)
// ============================================================
// Vì sao cần file này: "tháng" trong mệnh lý KHÔNG phải tháng âm lịch.
// Tháng Dần bắt đầu từ LẬP XUÂN (kinh độ mặt trời 315°), không phải từ mùng 1
// Tết. Hai mốc này lệch nhau tới nửa tháng, nên tháng âm và tháng tiết khí
// khác chi trên ~25% số ngày.
//
// Công thức dưới đây được PORT NGUYÊN từ `public/tubinh-ansao-engine.js`
// (`_sunLongitudeDeg` + `_monthChiBySunLongitude`) — chính là đường đang cho
// TRỤ THÁNG bát tự của site. Cố ý giữ y hệt để hai nơi không trôi khỏi nhau;
// sửa một bên thì phải sửa bên kia.
//
// ⚠️ Đây là công thức mặt trời xấp xỉ (sai số cỡ vài phút), KHÔNG phải
// ephemeris. Đủ chính xác để xác định NGÀY của tiết khí, trừ những ca tiết rơi
// sát nửa đêm — đo trên 4.018 ngày (2020–2030) đối chiếu `mingyu-core` (dùng
// ephemeris thật): lệch 3 ngày, tức 99,925%.

import type { DiaChi } from '../types.js';

/** Julian Day Number (proleptic Gregorian). Số nguyên trả về ứng với 12:00 UT. */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  return (
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Kinh độ mặt trời (độ, 0–360) tại một thời điểm Julian. */
export function sunLongitudeDeg(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const T2 = T * T;
  const dr = Math.PI / 180.0;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  const omega = 125.04 - 1934.136 * T;
  L = L - 0.00569 - 0.00478 * Math.sin(omega * dr);
  L = L - Math.floor(L / 360) * 360;
  if (L < 0) L += 360;
  return L;
}

/**
 * Thời điểm KẾT THÚC ngày dân dụng Việt Nam (+07:00), tính theo Julian.
 *
 * JDN nguyên = 12:00 UT. Nửa đêm kết thúc ngày VN = 17:00 UT cùng ngày
 * = JDN + 5/24. Dùng mốc CUỐI ngày là có chủ đích: theo lịch pháp, ngày nào
 * CHỨA thời khắc giao tiết thì cả ngày đó đã thuộc tháng mới — nên phải hỏi
 * "đến hết ngày này thì mặt trời đã qua tiết chưa".
 */
const VN_DAY_END_FROM_JDN = 5 / 24;

const MONTH_CHI_FROM_LAP_XUAN: readonly DiaChi[] = [
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
  'Tý',
  'Sửu',
] as const;

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Chi của tháng TIẾT KHÍ chứa ngày dương lịch đã cho.
 *
 * Lập Xuân (315°) mở tháng Dần; mỗi tháng tiết khí rộng đúng 30° kinh độ.
 */
export function monthChiBySolarTerm(dd: number, mm: number, yy: number): DiaChi {
  const L = sunLongitudeDeg(jdFromDate(dd, mm, yy) + VN_DAY_END_FROM_JDN);
  const offset = Math.floor(mod(L - 315, 360) / 30);
  return MONTH_CHI_FROM_LAP_XUAN[offset]!;
}
