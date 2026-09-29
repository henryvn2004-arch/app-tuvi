/* tools-shared/am-duong.js — Đổi ngày ÂM lịch → ngày DƯƠNG lịch.
   Nguồn DUY NHẤT cho: `lib/engine/laso.ts` `lunarToSolar()` (server) và
   `scripts/check-lunar-to-solar.mjs` (bộ dò).
   module.exports = { lunarToSolar }

   ── KHÔNG TỰ TÍNH LỊCH ─────────────────────────────────────
   Hàm này KHÔNG có dòng thiên văn nào: nó dò từng ngày dương trong khoảng mà
   năm âm `nam` có thể rơi vào, hỏi chính `solarToLunar` của
   `public/tuvi-ansao-engine.js` (truyền vào qua tham số), dừng ở ngày đầu tiên
   khớp (ngày, tháng, năm) âm. Bảng âm lịch sinh lại thì hàm này đi theo, không
   thể trôi khỏi chiều dương→âm.

   ── THÁNG NHUẬN ────────────────────────────────────────────
   `solarToLunar` bản vanilla BỎ cờ `isLeap` (nợ cố ý — CLAUDE.md), và
   `BirthParams` cũng không có trường nhuận. Một ngày âm trong năm có tháng
   nhuận trùng số vì thế khớp HAI ngày dương; hàm lấy ngày THỨ NHẤT = tháng
   THƯỜNG (tháng thường luôn đứng trước tháng nhuận cùng số). Người sinh trong
   tháng nhuận sẽ bị tính như sinh tháng thường cùng số — cùng cách
   `computeLaso` đang an sao (không có cờ nhuận).

   Trả `null` khi không có ngày dương nào khớp: ngày 30 của tháng thiếu, tháng
   ngoài 1–12, hoặc năm ngoài tầm bảng (1900–2100). */
(function (root) {
  /**
   * @param {number} ngay  ngày âm 1–30
   * @param {number} thang tháng âm 1–12
   * @param {number} nam   năm âm
   * @param {(d:number,m:number,y:number)=>({day:number,month:number,year:number}|null)} solarToLunar
   * @returns {{day:number,month:number,year:number}|null} ngày dương
   */
  function lunarToSolar(ngay, thang, nam, solarToLunar) {
    if (!(ngay >= 1 && ngay <= 30 && thang >= 1 && thang <= 12 && nam > 0)) return null;
    // Năm âm `nam` bắt đầu cuối tháng 1 – giữa tháng 2 dương năm `nam` và kết thúc
    // trước giữa tháng 2 dương năm `nam+1` → dò 1/1/nam → 31/3/(nam+1) là dư.
    var t = Date.UTC(nam, 0, 1);
    var end = Date.UTC(nam + 1, 2, 31);
    for (; t <= end; t += 86400000) {
      var d = new Date(t);
      var dd = d.getUTCDate(),
        mm = d.getUTCMonth() + 1,
        yy = d.getUTCFullYear();
      var al = solarToLunar(dd, mm, yy);
      if (!al) continue; // ngoài tầm bảng ở mép 1900/2100
      if (al.year === nam && al.month === thang && al.day === ngay) {
        return { day: dd, month: mm, year: yy };
      }
    }
    return null;
  }

  var API = { lunarToSolar: lunarToSolar };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AmDuong = API;
})(typeof window !== 'undefined' ? window : globalThis);
