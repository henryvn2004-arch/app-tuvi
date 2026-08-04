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
  var THAN = ['Thanh Long', 'Minh Đường', 'Thiên Hình', 'Châu Tước', 'Kim Quỹ', 'Thiên Đức', 'Bạch Hổ', 'Ngọc Đường', 'Thiên Lao', 'Huyền Vũ', 'Tư Mệnh', 'Câu Trận'];
  var IS_HD = [true, true, false, false, true, true, false, true, false, false, true, false];
  // Giờ khởi Thanh Long theo CHI NGÀY (cổ pháp "青龙起例"): Tý→Thân, Sửu→Tuất,
  // Dần→Tý, Mão→Dần, Thìn→Thìn, Tỵ→Ngọ… tức = (2 × chi ngày + 8) mod 12.
  // 11 thần còn lại đi thuận từ đó.
  //
  // 🔴 Bản cũ là bảng chép tay [0,2,1,2,2,3,0,2,1,2,2,3] — KHÔNG khớp cổ pháp
  // nào, và sai lệch với ca quyết 黄道吉时歌 trên 1.667/2.000 ngày. Kiểm bằng
  // ngày Thìn/Tuất: ca quyết cho "Dần Thìn Tỵ Thân Dậu Hợi", bảng cũ ra
  // "Tý Dần Mão Ngọ Mùi Dậu". Sau khi sửa, hàm này khớp TUYỆT ĐỐI với
  // `GIO_HOANG_DAO_BY_DAY_CHI` của tuvi-engine (đã đối chiếu 2.000 ngày).
  function thanhLongHour(chiNgay) { return (chiNgay * 2 + 8) % 12; }
  var CAN_HANH = ['Mộc', 'Mộc', 'Hỏa', 'Hỏa', 'Thổ', 'Thổ', 'Kim', 'Kim', 'Thủy', 'Thủy'];
  var THAN_DESC = {
    'Thanh Long': 'Tài lộc, mọi việc hanh thông', 'Minh Đường': 'Quý nhân phù trợ, thuận lợi',
    'Thiên Hình': 'Kiện tụng, tranh chấp, hung', 'Châu Tước': 'Khẩu thiệt, thị phi',
    'Kim Quỹ': 'Tài chính, thu nạp tiền', 'Thiên Đức': 'Phúc đức, hóa giải hung',
    'Bạch Hổ': 'Sát khí, tai họa', 'Ngọc Đường': 'Danh vọng, thành tựu',
    'Thiên Lao': 'Giam cầm, trở ngại', 'Huyền Vũ': 'Trộm cướp, tổn thất',
    'Tư Mệnh': 'Bảo hộ, cầu phúc', 'Câu Trận': 'Vướng mắc, trì trệ'
  };
  function toJDN(y, m, d) { var a = Math.floor((14 - m) / 12), yr = y + 4800 - a, mn = m + 12 * a - 3; return d + Math.floor((153 * mn + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045; }
  // Can chi NGÀY từ JDN. Chỉ số vòng 60 (Giáp Tý = 0) = (JDN + 49) mod 60.
  // 🔴 Bản cũ dùng `ANCHOR = 2434290` và SAI 19 vị trí trên MỌI ngày — 4/8/2026
  // hiện "Tân Mão" trong khi ngày thật là Canh Tuất; sai can chi kéo theo sai
  // luôn HD_OFFSET nên giờ hoàng đạo cũng sai. Neo kiểm chứng (đừng bỏ đi):
  // 1/1/2000 = JDN 2451545 = Mậu Ngọ — cùng kết quả với
  // `tuvi-engine/src/lunar/convert.ts` (jd+9 %10, jd+1 %12) và với
  // `public/tubinh-ansao-engine.js`, hai đường vốn vẫn đúng.
  function getNgayCanChi(y, m, d) { var i = ((toJDN(y, m, d) + 49) % 60 + 60) % 60; return { can: i % 10, chi: i % 12 }; }

  function compute(ngay, thang, nam) {
    ngay = parseInt(ngay); thang = parseInt(thang); nam = parseInt(nam);
    if (!ngay || ngay < 1 || ngay > 31 || !thang || thang < 1 || thang > 12 || !nam) {
      return { ok: false, error: 'Vui lòng nhập ngày tháng năm hợp lệ.' };
    }
    var cc = getNgayCanChi(nam, thang, ngay);
    var canChiNgay = CAN[cc.can] + ' ' + CHI[cc.chi];
    var alStr = '';
    try { var conv = convertDuongToAm(ngay, thang, nam, 0); alStr = ' (AL ' + conv.amLich.day + '/' + conv.amLich.month + ')'; } catch (e) { /* ignore */ }
    var offset = thanhLongHour(cc.chi);
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
