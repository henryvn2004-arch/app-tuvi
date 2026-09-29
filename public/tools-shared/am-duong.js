/* tools-shared/am-duong.js — Đổi ngày ÂM lịch → ngày DƯƠNG lịch.
   Nguồn DUY NHẤT cho: `lib/engine/laso.ts` `lunarToSolar()` (server) và
   `scripts/check-am-duong.mjs` (bộ dò).
   module.exports = { lunarToSolar }

   ── KHÔNG TỰ TÍNH LỊCH ─────────────────────────────────────
   Hàm này KHÔNG có dòng thiên văn nào: nó dò từng ngày dương trong khoảng mà
   năm âm `nam` có thể rơi vào, hỏi chính `solarToLunar` của
   `public/tuvi-ansao-engine.js` (truyền vào qua tham số), dừng ở ngày đầu tiên
   khớp (ngày, tháng, năm) âm. Bảng âm lịch sinh lại thì hàm này đi theo, không
   thể trôi khỏi chiều dương→âm.

   ── THÁNG NHUẬN ────────────────────────────────────────────
   `solarToLunar` bản vanilla BỎ cờ `isLeap` (nợ cố ý — CLAUDE.md), nên hàm
   nhận ra tháng nhuận bằng cách ĐẾM ĐOẠN: trong năm có nhuận, tháng số `thang`
   hiện ra HAI đoạn (mỗi đoạn mở ở mùng 1) — đoạn thứ nhất là tháng THƯỜNG,
   đoạn thứ hai là tháng NHUẬN (tháng thường luôn đứng ngay trước tháng nhuận).
   • `nhuan` falsy  → ngày khớp ĐẦU TIÊN (tháng thường; ngày 30 mà tháng thường
     chỉ 29 ngày thì rơi sang tháng nhuận — ngày dương duy nhất có ngày âm đó).
   • `nhuan` true   → chỉ tìm trong đoạn THỨ HAI; năm đó không nhuận tháng
     `thang` ⇒ `null` (không lặng lẽ trả tháng thường).

   Trả `null` khi không có ngày dương nào khớp: ngày 30 của tháng thiếu, tháng
   ngoài 1–12, hoặc năm ngoài tầm bảng (1900–2100). */
(function (root) {
  /**
   * @param {number} ngay  ngày âm 1–30
   * @param {number} thang tháng âm 1–12
   * @param {number} nam   năm âm
   * @param {(d:number,m:number,y:number)=>({day:number,month:number,year:number}|null)} solarToLunar
   * @param {boolean} [nhuan] ngày thuộc tháng NHUẬN
   * @returns {{day:number,month:number,year:number}|null} ngày dương
   */
  function lunarToSolar(ngay, thang, nam, solarToLunar, nhuan) {
    if (!(ngay >= 1 && ngay <= 30 && thang >= 1 && thang <= 12 && nam > 0)) return null;
    // Năm âm `nam` bắt đầu cuối tháng 1 – giữa tháng 2 dương năm `nam` và kết thúc
    // trước giữa tháng 2 dương năm `nam+1` → dò 1/1/nam → 31/3/(nam+1) là dư.
    var t = Date.UTC(nam, 0, 1);
    var end = Date.UTC(nam + 1, 2, 31);
    // Chỉ số đoạn tháng `thang` đang dò: 0 = thường, 1 = nhuận. Tháng nhuận nằm
    // LIỀN sau tháng thường cùng số (không có ngày hở giữa hai đoạn) ⇒ đoạn mới
    // mở ở MÙNG 1, không phải ở chỗ "hôm trước không khớp".
    var doan = -1;
    for (; t <= end; t += 86400000) {
      var d = new Date(t);
      var dd = d.getUTCDate(),
        mm = d.getUTCMonth() + 1,
        yy = d.getUTCFullYear();
      var al = solarToLunar(dd, mm, yy);
      var khop = !!al && al.year === nam && al.month === thang;
      if (khop && al.day === 1) doan++;
      if (khop && al.day === ngay && (nhuan ? doan === 1 : true)) {
        return { day: dd, month: mm, year: yy };
      }
    }
    return null;
  }

  var API = { lunarToSolar: lunarToSolar };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AmDuong = API;
})(typeof window !== 'undefined' ? window : globalThis);
