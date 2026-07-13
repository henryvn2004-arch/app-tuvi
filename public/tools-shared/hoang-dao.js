/* ============================================================
   tools-shared/hoang-dao.js — Giờ Hoàng Đạo trong ngày (12 giờ tốt/xấu).
   Nguồn DUY NHẤT: dùng chung trang standalone /tools/hoang-dao.html VÀ
   shell /app/hoang-dao. Deterministic — cần CAN/CHI + convertDuongToAm
   (global từ tuvi-ansao-engine.js). API: HoangDaoTool.compute(ngay,thang,nam).
   ============================================================ */
(function () {
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var GIO_TIME = ['23–01h', '01–03h', '03–05h', '05–07h', '07–09h', '09–11h', '11–13h', '13–15h', '15–17h', '17–19h', '19–21h', '21–23h'];
  var THAN = ['Thanh Long', 'Minh Đường', 'Thiên Hình', 'Chu Tước', 'Kim Quỹ', 'Thiên Đức', 'Bạch Hổ', 'Ngọc Đường', 'Thiên Lao', 'Huyền Vũ', 'Tư Mệnh', 'Câu Trận'];
  var IS_HD = [true, true, false, false, true, true, false, true, false, false, true, false];
  var HD_OFFSET = [0, 2, 1, 2, 2, 3, 0, 2, 1, 2, 2, 3];
  var CAN_HANH = ['Mộc', 'Mộc', 'Hỏa', 'Hỏa', 'Thổ', 'Thổ', 'Kim', 'Kim', 'Thủy', 'Thủy'];
  var THAN_DESC = {
    'Thanh Long': 'Tài lộc, mọi việc hanh thông', 'Minh Đường': 'Quý nhân phù trợ, thuận lợi',
    'Thiên Hình': 'Kiện tụng, tranh chấp, hung', 'Chu Tước': 'Khẩu thiệt, thị phi',
    'Kim Quỹ': 'Tài chính, thu nạp tiền', 'Thiên Đức': 'Phúc đức, hóa giải hung',
    'Bạch Hổ': 'Sát khí, tai họa', 'Ngọc Đường': 'Danh vọng, thành tựu',
    'Thiên Lao': 'Giam cầm, trở ngại', 'Huyền Vũ': 'Trộm cướp, tổn thất',
    'Tư Mệnh': 'Bảo hộ, cầu phúc', 'Câu Trận': 'Vướng mắc, trì trệ'
  };
  function toJDN(y, m, d) { var a = Math.floor((14 - m) / 12), yr = y + 4800 - a, mn = m + 12 * a - 3; return d + Math.floor((153 * mn + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045; }
  function getNgayCanChi(y, m, d) { var jdn = toJDN(y, m, d), ANCHOR = 2434290, diff = ((jdn - ANCHOR) % 60 + 600) % 60; return { can: diff % 10, chi: diff % 12 }; }

  function compute(ngay, thang, nam) {
    ngay = parseInt(ngay); thang = parseInt(thang); nam = parseInt(nam);
    if (!ngay || ngay < 1 || ngay > 31 || !thang || thang < 1 || thang > 12 || !nam) {
      return { ok: false, error: 'Vui lòng nhập ngày tháng năm hợp lệ.' };
    }
    var cc = getNgayCanChi(nam, thang, ngay);
    var canChiNgay = CAN[cc.can] + ' ' + CHI[cc.chi];
    var alStr = '';
    try { var conv = convertDuongToAm(ngay, thang, nam, 0); alStr = ' (AL ' + conv.amLich.day + '/' + conv.amLich.month + ')'; } catch (e) { /* ignore */ }
    var offset = HD_OFFSET[cc.chi];
    var hd = [], hac = [], hdData = [], hacData = [];
    for (var g = 0; g < 12; g++) {
      var thanIdx = (g - offset + 12) % 12, than = THAN[thanIdx], isHD = IS_HD[thanIdx];
      var card = '<div class="gio-card ' + (isHD ? 'hd' : 'hd2') + '">' +
        '<div class="gio-chi">' + CHI[g] + '</div>' +
        '<div class="gio-time">' + GIO_TIME[g] + '</div>' +
        '<div class="gio-than ' + (isHD ? 'tag-hd' : 'tag-hd2') + '">' + than + '</div>' +
        '<div class="gio-type ' + (isHD ? 'tag-hd' : 'tag-hd2') + '">' + (isHD ? 'Hoàng Đạo' : 'Hắc Đạo') + '</div>' +
        '<div style="font-size:10px;color:var(--text-lt);margin-top:4px;line-height:1.4">' + (THAN_DESC[than] || '') + '</div></div>';
      if (isHD) { hd.push(card); hdData.push(CHI[g] + ' (' + GIO_TIME[g] + ') ' + than); }
      else { hac.push(card); hacData.push(CHI[g] + ' (' + GIO_TIME[g] + ') ' + than); }
    }
    return {
      ok: true,
      titleText: ngay + '/' + thang + '/' + nam + alStr + ' — Ngày ' + canChiNgay,
      ngayInfoHTML: '<span class="ngay-item">Ngày <strong>' + canChiNgay + '</strong></span><span class="ngay-item">Can <strong>' + CAN[cc.can] + '</strong> — Ngũ hành <strong>' + CAN_HANH[cc.can] + '</strong></span>',
      hdListHTML: hd.join(''),
      hd2ListHTML: hac.join(''),
      data: { ngayDL: ngay + '/' + thang + '/' + nam, canChiNgay: canChiNgay, canHanh: CAN_HANH[cc.can], gioHoangDao: hdData.join(' · '), gioHacDao: hacData.join(' · ') }
    };
  }
  window.HoangDaoTool = { compute: compute };
})();
