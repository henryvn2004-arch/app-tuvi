/* tools-shared/kim-lau.js — Module DÙNG CHUNG cho tool Kim Lâu / Tam Tai /
   Hoang Ốc. Nguồn DUY NHẤT: cả trang standalone (/tools/kim-lau.html) lẫn
   shell (/app/kim-lau) đều gọi module này → sửa 1 chỗ, 2 nơi cập nhật.

   Logic (isKimLau/isHoangOc/isTamTai + NAP_AM/TAM_TAI + chuỗi render) PORT
   NGUYÊN XI từ bản inline cũ của tools/kim-lau.html — KHÔNG đổi hành vi. Khác
   biệt DUY NHẤT: năm hiện tại lấy ĐỘNG theo giờ VN (vnYear) thay vì hardcode
   2026 — sửa bug "sang 2027 vẫn tính theo 2026". Trong năm 2026 output y hệt.

   API: window.KimLauTool = { vnYear, compute } (thuần dữ liệu + chuỗi HTML;
   không đụng DOM — trang tự gắn vào phần tử của mình). */
(function (root) {
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  // NAP_AM giữ NGUYÊN chính tả bản legacy (khác diachi.ts vài chữ) để byte-khớp.
  var NAP_AM = ['Hải Trung Kim', 'Lô Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Xoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
  var TAM_TAI = { 8: [2, 3, 4], 0: [2, 3, 4], 4: [2, 3, 4], 5: [11, 0, 1], 9: [11, 0, 1], 1: [11, 0, 1], 2: [8, 9, 10], 6: [8, 9, 10], 10: [8, 9, 10], 11: [5, 6, 7], 3: [5, 6, 7], 7: [5, 6, 7] };

  function isKimLau(t) { var r = ((t % 5) + 5) % 5; return r === 1 || r === 3; }
  function isHoangOc(t) { return t > 0 && t % 5 === 0; }
  function isTamTai(bChi, yChi) { var g = TAM_TAI[bChi]; return g && g.includes(yChi); }

  function getStatusHTML(kl, ho, tt) {
    var tags = [];
    if (kl) tags.push('<span class="res-tag res-tag-bad">Kim Lâu</span>');
    if (ho) tags.push('<span class="res-tag res-tag-warn">Hoang Ốc</span>');
    if (tt) tags.push('<span class="res-tag res-tag-bad" style="background:#e8f0fe;color:#1455A4;border-color:#c5d4f5">Tam Tai</span>');
    if (!tags.length) return '<span class="res-tag res-tag-good">Bình thường</span>';
    return tags.join(' ');
  }

  // Năm hiện tại theo giờ VN (khớp currentNamXem server-side → parity).
  function vnYear() {
    try { return parseInt(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date())); }
    catch (e) { return new Date().getFullYear(); }
  }

  // compute(by, curYear) → { ok, error?, resTitleText, currentBoxHTML, rowsHTML, data }
  // Trả CHÍNH các chuỗi HTML mà bản cũ sinh (byte-khớp) + object data cho rail.
  function compute(by, curYear) {
    if (curYear == null) curYear = vnYear();
    if (!by || by < 1900 || by > 2010) {
      return { ok: false, error: 'Vui lòng nhập năm sinh hợp lệ (1900–2010).' };
    }
    var idx60 = (((by - 4) % 60) + 60) % 60;
    var bCan = idx60 % 10, bChi = idx60 % 12;
    var na = NAP_AM[Math.floor(idx60 / 2)];
    var tuoiTa = curYear - by + 1;
    var resTitleText = CAN[bCan] + ' ' + CHI[bChi] + ' (' + by + ') — ' + na + ' · Tuổi ta năm ' + curYear + ': ' + tuoiTa;

    var y60 = (((curYear - 4) % 60) + 60) % 60;
    var yChi = y60 % 12;
    var kl = isKimLau(tuoiTa), ho = isHoangOc(tuoiTa), tt = isTamTai(bChi, yChi);
    var currentBoxHTML;
    if (kl || ho || tt) {
      var desc = kl && tt ? 'Năm nay trùng Kim Lâu và Tam Tai — cần thận trọng đặc biệt với cưới hỏi và việc hệ trọng.' : kl ? 'Năm nay là tuổi Kim Lâu — kiêng cưới hỏi, xây dựng, khởi công lớn.' : ho ? 'Năm nay là tuổi Hoang Ốc — kiêng mua bán và xây nhà.' : 'Năm nay đang trong vận Tam Tai — cẩn thận với các quyết định lớn.';
      currentBoxHTML = '<div style="background:#fef0ef;border-left:3px solid #c9a84c;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">Năm ' + curYear + ' (Tuổi ' + tuoiTa + ') — ' + getStatusHTML(kl, ho, tt) + '</div><div style="font-size:13px;color:var(--text-mid)">' + desc + '</div></div>';
    } else {
      currentBoxHTML = '<div style="background:#eaf4ed;border-left:3px solid #1E6B3C;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">Năm ' + curYear + ' (Tuổi ' + tuoiTa + ') — <span class="res-tag res-tag-good">Bình thường</span></div><div style="font-size:13px;color:var(--text-mid)">Năm nay không có Kim Lâu, Hoang Ốc hay Tam Tai.</div></div>';
    }

    var rowsArr = [], rowsHTML = '';
    for (var y = curYear; y < curYear + 20; y++) {
      var t = y - by + 1;
      var y60b = (((y - 4) % 60) + 60) % 60;
      var yC = y60b % 12, yN = y60b % 10;
      var kl2 = isKimLau(t), ho2 = isHoangOc(t), tt2 = isTamTai(bChi, yC);
      var bold = y === curYear ? 'font-weight:700' : '';
      rowsHTML += '<tr' + ((kl2 || ho2 || tt2) ? ' class="highlight"' : '') + ' style="' + bold + '"><td>' + y + (y === curYear ? ' ▶' : '') + '</td><td>' + t + '</td><td>' + CAN[yN] + ' ' + CHI[yC] + '</td><td>' + getStatusHTML(kl2, ho2, tt2) + '</td></tr>';
      rowsArr.push({ year: y, tuoiTa: t, canChi: CAN[yN] + ' ' + CHI[yC], kimLau: kl2, hoangOc: ho2, tamTai: tt2 });
    }

    return {
      ok: true,
      resTitleText: resTitleText,
      currentBoxHTML: currentBoxHTML,
      rowsHTML: rowsHTML,
      data: {
        nam: by,
        canChi: CAN[bCan] + ' ' + CHI[bChi],
        napAm: na,
        namHienTai: curYear,
        tuoiTaHienTai: tuoiTa,
        hienTai: { kimLau: kl, hoangOc: ho, tamTai: tt },
        rows: rowsArr,
      },
    };
  }

  var API = { vnYear: vnYear, compute: compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.KimLauTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
