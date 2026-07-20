/* ============================================================
   tools-shared/ngay-tot.js — Lịch ngày tốt/xấu trong tháng (âm lịch).
   Nguồn DUY NHẤT: dùng chung /tools/ngay-tot.html VÀ shell /app/ngay-tot.
   Deterministic — cần convertDuongToAm (global từ tuvi-ansao-engine.js).
   API: NgayTotTool.compute(thang, nam).
   ============================================================ */
(function () {
  var TAM_NUONG = { 3: 1, 7: 1, 13: 1, 18: 1, 22: 1, 27: 1 };
  var NGUYET_KI = { 5: 1, 14: 1, 23: 1 };
  var DUONG_CONG = { '1/1': 1, '1/3': 1, '2/3': 1, '3/3': 1, '4/3': 1, '5/5': 1, '5/7': 1, '6/7': 1, '7/7': 1, '7/9': 1, '8/8': 1, '9/9': 1, '10/3': 1, '10/10': 1, '11/9': 1, '11/11': 1, '12/8': 1, '12/12': 1 };

  function compute(thang, nam, todayObj) {
    thang = parseInt(thang); nam = parseInt(nam);
    if (!nam || nam < 2020 || nam > 2030) return { ok: false, error: 'Nhập năm hợp lệ (2020–2030).' };
    var today = todayObj || new Date();
    var firstDay = new Date(nam, thang - 1, 1).getDay();
    var daysInMonth = new Date(nam, thang, 0).getDate();
    var cells = [], tot = [], luuY = [], ki = [];
    for (var i = 0; i < firstDay; i++) cells.push('<div class="cal-day empty"></div>');
    for (var d = 1; d <= daysInMonth; d++) {
      var alDay = 1, alMonth = thang;
      try { var conv = convertDuongToAm(d, thang, nam, 0); alDay = conv.amLich.day; alMonth = conv.amLich.month; } catch (e) { /* ignore */ }
      var isToday = today.getDate() === d && today.getMonth() === thang - 1 && today.getFullYear() === nam;
      var isTN = !!TAM_NUONG[alDay], isNK = !!NGUYET_KI[alDay], isDC = !!DUONG_CONG[alMonth + '/' + alDay];
      var cls = 'good', tags = [];
      if (isTN || isNK) { cls = 'bad'; if (isTN) tags.push('<span class="cd-tag t-bad">Tam Nương</span>'); if (isNK) tags.push('<span class="cd-tag t-bad">Nguyệt Kị</span>'); ki.push(d); }
      else if (isDC) { cls = 'warn'; tags.push('<span class="cd-tag t-warn">D. Công Kị</span>'); luuY.push(d); }
      else { tags.push('<span class="cd-tag t-good">Tốt</span>'); tot.push(d); }
      cells.push('<div class="cal-day ' + cls + (isToday ? ' today' : '') + '">' +
        '<div class="cd-dl">' + d + '</div><div class="cd-al">AL ' + alDay + '/' + alMonth + '</div>' +
        '<div class="cd-tags">' + tags.join('') + '</div></div>');
    }
    return {
      ok: true,
      titleText: 'Tháng ' + thang + '/' + nam + ' — Lịch Ngày Tốt Xấu',
      calBodyHTML: cells.join(''),
      data: { thang: thang, nam: nam, ngayTot: tot.join(', '), ngayLuuY: luuY.join(', '), ngayKi: ki.join(', ') }
    };
  }
  window.NgayTotTool = { compute: compute };
})();
