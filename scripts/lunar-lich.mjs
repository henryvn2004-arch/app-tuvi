// scripts/lunar-lich.mjs
// ============================================================
// QUY TẮC MÚI GIỜ CỦA TỪNG TRUYỀN THỐNG LỊCH ÂM — nguồn DUY NHẤT cho
// scripts/gen-lunar-table.mjs (SINH bảng) và scripts/oracle/report-lunar-diff.mjs
// (KIỂM bảng). Đây là thông số "lịch tính theo kinh tuyến nào", KHÔNG phải múi
// giờ dân sự nơi sinh (cái đó đọc từ IANA tzdata qua `Intl`, xem
// public/tools-shared/noi-sinh.js).
//
// Ngày mùng 1 = ngày (theo giờ của lịch) chứa thời điểm sóc ⇒ cùng một sóc lúc
// 23:30 giờ VN là 00:30 hôm sau giờ Bắc Kinh ⇒ hai lịch lệch nhau một ngày,
// có khi cả tháng (Tết 1985: VN 21/01, Trung 20/02).
//
// Nguồn:
//  • vn — UTC+8 trước 1968-01-01, UTC+7 từ đó (lịch VN đổi kinh tuyến năm 1967,
//         Tết Mậu Thân 1968 lệch lịch Trung). Giữ NGUYÊN quy tắc cũ của bảng
//         hiện hành — xem docs/luat/engine-cophap.md.
//  • cn — UTC+8 (kinh tuyến 120°E) suốt 1900–2100 — quy ước của bảng Đài Thiên
//         văn Hồng Kông (HKO, hko.gov.hk "Gregorian-Lunar Calendar Conversion
//         Table" 1901–2100), dùng chung cho Trung/Đài/HK/Ma Cao. Đối chiếu vét
//         cạn 73.049 ngày: khớp HKO trừ ĐÚNG 3 tháng âm mở ngày 17/11/1914,
//         3/2/1916 (Tết Bính Thìn) và 9/11/1920 — sóc 00:01–00:05 giờ 120°E, lịch
//         in thời đó tính cho Bắc Kinh 116°25′E. Đã thử "giờ Bắc Kinh trước 1929"
//         (Tử Kim Sơn đổi sang 120°E năm 1929): sửa được 3 tháng đó nhưng lệch 3
//         tháng KHÁC (1906-04, nhuận 1917, nhuận 1922 — lịch Thời Hiến nhà Thanh
//         dùng thiên văn cũ) ⇒ không quy tắc kinh tuyến nào khớp trọn trước 1929;
//         giữ 120°E cho đồng nhất, 3 tháng ngoại lệ được oracle:lunar ghim tên.
//  • kr — UTC+8 trước 1912-01-01, UTC+9 từ đó. Nguồn: ICU `dangical.cpp`
//         (initAstronomerTimeZone), dẫn KASI (astro.kasi.re.kr) và bảng của
//         Kye Seung-Hyuk (math.snu.ac.kr/~kye/others/lunar.html): giờ chuẩn Hàn
//         1908–1911 là GMT+8:30 nhưng chính phủ KHÔNG áp vào lịch (vẫn GMT+8);
//         1954-03-21 → 1961-08-09 là GMT+8:30 nhưng KHÔNG đổi ngày âm nào —
//         `npm run oracle:lunar` tự kiểm lại khẳng định này (đổi được ngày nào
//         là đỏ). ICU còn một vá tay "1897: GMT+7" — ngoài tầm 1900–2100.
//  • jp — UTC+9 (JST, kinh tuyến 135°E) suốt 1900–2100: 旧暦 sau 1873 tính theo
//         giờ chuẩn Nhật (NAOJ công bố thời điểm sóc theo JST).
// ============================================================
import { createRequire } from 'node:module';

// cn · kr · jp: đọc CHÍNH `GIO_LICH` của public/tools-shared/noi-sinh.js (giờ của
// lịch dùng để quy giờ sinh khi người dùng chọn nơi sinh) — bảng sinh ra và giờ
// đưa vào engine không thể trôi khỏi nhau. vn: quy tắc riêng của bảng VN hiện
// hành (KHÁC bảng giờ dân sự `VnTimezone` — cố ý, xem docs/luat/engine-cophap.md).
const { GIO_LICH } = createRequire(import.meta.url)('../public/tools-shared/noi-sinh.js');

/** yyyymmdd → múi giờ (giờ, có thể lẻ) mà lịch đó dùng để định ngày sóc/trung khí. */
export const LICH_TZ = {
  vn: (ymd) => (ymd < 19680101 ? 8 : 7),
  cn: (ymd) => GIO_LICH.cn(ymd) / 60,
  kr: (ymd) => GIO_LICH.kr(ymd) / 60,
  jp: (ymd) => GIO_LICH.jp(ymd) / 60,
};

export const LICH_LIST = Object.keys(LICH_TZ);

export function jdFromDate(d, m, y) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}
export function fromJd(jd) {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((b * 146097) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return [
    e - Math.floor((153 * m + 2) / 5) + 1,
    m + 3 - 12 * Math.floor(m / 10),
    b * 100 + d - 4800 + Math.floor(m / 10),
  ];
}
export const ymdOf = (d, m, y) => y * 10000 + m * 100 + d;
