/* tools-shared/vn-timezone.js — Quy giờ sinh về HỆ QUY CHIẾU VIỆT NAM.
   Nguồn DUY NHẤT cho: `public/tuvi-form.js` (form nhập của người dùng) và
   `scripts/import-celeb-births.mjs` (nhập ngày giờ sinh người nổi tiếng).
   window.VnTimezone = { getVnUtcOffset, toVnHour, hourMinToGioIdx, VN_TZ_HISTORY }

   ── VÌ SAO PHẢI DÙNG CHUNG ─────────────────────────────────
   Người dùng nhập giờ sinh ở múi giờ nơi sinh, form quy về giờ VN rồi mới lấy
   canh giờ. Dữ liệu người nổi tiếng cũng phải đi qua ĐÚNG phép quy đổi đó —
   nếu không thì hai bên ở hai hệ quy chiếu khác nhau và mọi phép so "trùng
   giờ sinh" đều vô nghĩa. Ba hàm này trước ở trong closure của `tuvi-form.js`,
   KHÔNG export ra `window.TuviForm`, nên script Node không gọi được. Chép sang
   là hai bản trôi khỏi nhau mà KHÔNG có gì báo — canh giờ vẫn ra một con số
   trông hợp lệ. `npm run check:vntz` canh việc đó.

   ── VN ĐỔI MÚI GIỜ 6 LẦN ───────────────────────────────────
   Giờ Tý theo cổ pháp là 23:00–00:59, nhưng chỉ đúng khi VN ở UTC+7. Các thời
   kỳ khác thì mốc canh giờ dịch theo. Bảng dưới lấy nguyên từ tooltip đang
   hiện cho người dùng trong `tuvi-form.js` — sửa một bên phải sửa cả hai. */
(function (root) {
  /** [mốc bắt đầu (Y,M,D) · offset phút] — tra theo NGÀY SINH, không phải hôm nay. */
  var VN_TZ_HISTORY = [
    { from: [1942, 1, 1], offset: 480 }, // UTC+8
    { from: [1944, 3, 9], offset: 540 }, // UTC+9 (thời Nhật)
    { from: [1945, 9, 2], offset: 420 }, // UTC+7
    { from: [1946, 12, 19], offset: 480 }, // UTC+8
    { from: [1955, 7, 1], offset: 420 }, // UTC+7
    { from: [1960, 1, 1], offset: 480 }, // UTC+8 (miền Nam)
    { from: [1975, 5, 1], offset: 420 }, // UTC+7 — tới nay
  ];

  /** Múi giờ VN (phút) TẠI THỜI ĐIỂM SINH. Thiếu năm → mặc định +7. */
  function getVnUtcOffset(ngay, thang, nam) {
    if (!nam) return 420;
    var t = new Date(nam, (thang || 1) - 1, ngay || 1).getTime();
    var off = 420;
    for (var i = 0; i < VN_TZ_HISTORY.length; i++) {
      var f = VN_TZ_HISTORY[i].from;
      if (t >= new Date(f[0], f[1] - 1, f[2]).getTime()) off = VN_TZ_HISTORY[i].offset;
    }
    // Trước 1942 thì bảng chưa phủ — giữ +7 như bản gốc trong tuvi-form.js.
    return off;
  }

  /**
   * Giờ địa phương nơi sinh → giờ VN cùng thời điểm.
   * `utcOffset` là offset PHÚT của NƠI SINH (đã gồm giờ mùa hè nếu có).
   * ⚠️ Chỉ trả giờ/phút, KHÔNG trả ngày: qua nửa đêm thì ngày ÂM LỊCH đổi theo,
   * mà việc đó do engine an sao quyết, không phải hàm này.
   */
  function toVnHour(hh, mm, utcOffset, ngay, thang, nam) {
    var vnOffset = getVnUtcOffset(ngay, thang, nam);
    var totalMin = hh * 60 + mm + (vnOffset - utcOffset);
    totalMin = ((totalMin % 1440) + 1440) % 1440;
    return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
  }

  /** Giờ:phút (đã là giờ VN) → index địa chi giờ 0=Tý..11=Hợi. Khối 2 tiếng, neo giờ lẻ. */
  function hourMinToGioIdx(h, m) {
    return Math.floor(((h * 60 + m + 60) % (24 * 60)) / 120) % 12;
  }

  var API = {
    getVnUtcOffset: getVnUtcOffset,
    toVnHour: toVnHour,
    hourMinToGioIdx: hourMinToGioIdx,
    VN_TZ_HISTORY: VN_TZ_HISTORY,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.VnTimezone = API;
})(typeof window !== 'undefined' ? window : globalThis);
