/* ============================================================
   tools-shared/luc-nham.js — Lục Nhâm Giản: thần tướng theo giờ/ngày.
   Nguồn DUY NHẤT: dùng chung /tools/luc-nham.html VÀ shell /app/luc-nham.
   Deterministic (toJDN nội bộ). API: LucNhamTool.compute(ngay,thang,nam,gioChi).
   ============================================================ */
(function () {
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var GIO_TIME = ['23–01h', '01–03h', '03–05h', '05–07h', '07–09h', '09–11h', '11–13h', '13–15h', '15–17h', '17–19h', '19–21h', '21–23h'];
  var THAN12 = [
    { name: 'Quý Nhân', good: true, desc: 'Quý nhân xuất hiện, được giúp đỡ, vạn sự đại lợi. Giờ tốt nhất để gặp gỡ, cầu xin, hội họp.' },
    { name: 'Đằng Xà', good: false, desc: 'Biến động bất ngờ, lo lắng, sự việc xoắn xuýt. Tránh quyết định vội vàng, cần bình tĩnh.' },
    { name: 'Chu Tước', good: false, desc: 'Khẩu thiệt, thị phi, văn thư rắc rối. Tránh tranh luận, ký kết hợp đồng.' },
    { name: 'Lục Hợp', good: true, desc: 'Hợp tác, ký kết, hôn nhân thuận lợi. Mọi sự giao hợp đều có kết quả tốt.' },
    { name: 'Câu Trận', good: false, desc: 'Cản trở, trì trệ, mắc kẹt. Việc khởi sự gặp trở ngại, tránh tranh kiện.' },
    { name: 'Thanh Long', good: true, desc: 'Tài lộc dồi dào, phú quý, mọi việc hanh thông. Rất tốt cho kinh doanh, thu nạp tài lộc.' },
    { name: 'Thiên Không', good: false, desc: 'Hư không, thất thoát, lời hứa không thực hiện được. Tránh cho mượn tiền, ký kết.' },
    { name: 'Bạch Hổ', good: false, desc: 'Sát khí, tai họa, bệnh tật. Cẩn thận khi đi lại, tránh nơi nguy hiểm.' },
    { name: 'Thái Thường', good: true, desc: 'Tài lộc ổn định, hội hợp vui vẻ, ẩm thực. Tốt cho kinh doanh nhỏ, gặp gỡ thân thiết.' },
    { name: 'Huyền Vũ', good: false, desc: 'Trộm cắp, gian lận, bí mật bị lộ. Cẩn thận tài sản, tránh tiết lộ thông tin quan trọng.' },
    { name: 'Thái Âm', good: true, desc: 'Bí mật thuận lợi, hôn nhân tốt, nữ giới được phù trợ. Tốt cho mưu kế, kế hoạch lâu dài.' },
    { name: 'Thiên Hậu', good: true, desc: 'Phúc đức, thuận hòa, vạn vật phát triển. Rất tốt cho mọi sự khởi đầu tích cực.' }
  ];
  function toJDN(y, m, d) { var a = Math.floor((14 - m) / 12), yr = y + 4800 - a, mn = m + 12 * a - 3; return d + Math.floor((153 * mn + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045; }

  function compute(ngay, thang, nam, gioChi) {
    ngay = parseInt(ngay); thang = parseInt(thang); nam = parseInt(nam); gioChi = parseInt(gioChi) || 0;
    if (!ngay || ngay < 1 || ngay > 31 || !thang || !nam) return { ok: false, error: 'Vui lòng nhập ngày tháng năm.' };
    // Chỉ số vòng 60 (Giáp Tý = 0) = (JDN + 49) mod 60. Neo kiểm chứng:
    // 1/1/2000 = JDN 2451545 = Mậu Ngọ. 🔴 Bản cũ dùng ANCHOR = 2434290, sai 19
    // vị trí trên MỌI ngày → can ngày sai → thần tướng đang trực sai theo.
    var diff = ((toJDN(nam, thang, ngay) + 49) % 60 + 60) % 60;
    var canNgay = diff % 10;
    var startOffset = (canNgay * 2) % 12;
    var activeIdx = (gioChi - startOffset + 12) % 12;
    var active = THAN12[activeIdx];
    var activeBoxHTML = '<div style="background:' + (active.good ? '#eaf4ed' : '#fef0ef') + ';border-left:4px solid ' + (active.good ? '#1E6B3C' : '#C0392B') + ';padding:16px 20px;border-radius:0 8px 8px 0">' +
      '<div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + (active.good ? '#1E6B3C' : '#C0392B') + ';margin-bottom:6px">' + (active.good ? '✦ Thần Tướng Cát' : '✗ Thần Tướng Hung') + ' — Giờ Hiện Tại</div>' +
      '<div style="font-size:22px;font-weight:700;color:var(--navy);margin-bottom:8px">' + active.name + '</div>' +
      '<div style="font-size:14px;color:var(--text-mid);line-height:1.7">' + active.desc + '</div></div>';
    var wheel = THAN12.map(function (t, i) {
      var gioIdx = (startOffset + i) % 12, isActive = i === activeIdx;
      return '<div class="than-card ' + (isActive ? 'active-than' : t.good ? 'good' : 'bad') + '">' +
        '<div class="than-name">' + t.name + '</div>' +
        '<div class="than-gio">Giờ ' + CHI[gioIdx] + ' (' + GIO_TIME[gioIdx] + ')</div>' +
        '<span class="than-type ' + (t.good ? 'ty-good' : 'ty-bad') + '">' + (t.good ? 'Cát' : 'Hung') + '</span></div>';
    }).join('');
    return {
      ok: true,
      titleText: 'Ngày ' + ngay + '/' + thang + '/' + nam + ' — Giờ ' + CHI[gioChi] + ' (' + GIO_TIME[gioChi] + ')',
      activeBoxHTML: activeBoxHTML,
      thanWheelHTML: wheel,
      data: { ngayDL: ngay + '/' + thang + '/' + nam, canNgay: CAN[canNgay], gio: CHI[gioChi] + ' (' + GIO_TIME[gioChi] + ')', thanTuong: active.name, catHung: active.good ? 'Cát' : 'Hung', luan: active.desc }
    };
  }
  window.LucNhamTool = { compute: compute };
})();
