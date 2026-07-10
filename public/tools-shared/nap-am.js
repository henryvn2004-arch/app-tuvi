/* tools-shared/nap-am.js — Module DÙNG CHUNG tool Nạp Âm Ngũ Hành.
   Nguồn DUY NHẤT cho trang standalone /tools/nap-am.html + shell /app/nap-am.
   Logic + chuỗi render PORT NGUYÊN XI từ bản inline cũ của tools/nap-am.html
   (kể cả NAP_AM/HANH_DESC) — không đổi hành vi. API thuần dữ liệu + HTML.
   window.NapAmTool = { compute } */
(function (root) {
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var CON_GIAP = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Lợn'];
  var NAP_AM = ['Hải Trung Kim', 'Lô Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Xoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
  var HANH_COLOR = { Kim: '#9A7B3A', Hỏa: '#C0392B', Mộc: '#1E6B3C', Thủy: '#1455A4', Thổ: '#8B6914' };
  var HANH_DESC = { Kim: 'Ngũ hành Kim — cứng rắn, quyết đoán, có chính kiến. Kim tương sinh với Thủy, tương khắc với Mộc.', Hỏa: 'Ngũ hành Hỏa — nhiệt tình, nhanh nhẹn, có sức lôi cuốn. Hỏa tương sinh với Thổ, tương khắc với Kim.', Mộc: 'Ngũ hành Mộc — nhân từ, ngay thẳng, chí tiến thủ. Mộc tương sinh với Hỏa, tương khắc với Thổ.', Thủy: 'Ngũ hành Thủy — thông minh, linh hoạt, nhạy bén. Thủy tương sinh với Mộc, tương khắc với Hỏa.', Thổ: 'Ngũ hành Thổ — trung thực, bền bỉ, đáng tin cậy. Thổ tương sinh với Kim, tương khắc với Thủy.' };
  function getHanh(na) { for (var i = 0; i < 5; i++) { var h = ['Kim', 'Hỏa', 'Mộc', 'Thủy', 'Thổ'][i]; if (na.indexOf(h) > -1) return h; } return ''; }

  // compute(y) → { ok, error?, eyebrowText, resultHTML, data }. resultHTML =
  // CHÍNH chuỗi innerHTML mà bản cũ sinh cho #nap-am-result (byte-khớp).
  function compute(y) {
    if (!y || y < 1900 || y > 2100) {
      return { ok: false, error: 'Vui lòng nhập năm hợp lệ (1900–2100).' };
    }
    var idx60 = (((y - 4) % 60) + 60) % 60;
    var canIdx = idx60 % 10, chiIdx = idx60 % 12;
    var na = NAP_AM[Math.floor(idx60 / 2)];
    var hanh = getHanh(na);
    var color = HANH_COLOR[hanh] || '#444';
    var resultHTML =
      '\n    <div class="na-cell"><div class="na-cell-label">Thiên Can</div><div class="na-cell-val" style="color:' + color + '">' + CAN[canIdx] + '</div></div>\n' +
      '    <div class="na-cell"><div class="na-cell-label">Địa Chi</div><div class="na-cell-val">' + CHI[chiIdx] + '</div><div style="font-size:12px;color:var(--text-lt);margin-top:6px">Năm ' + CON_GIAP[chiIdx] + '</div></div>\n' +
      '    <div class="na-cell"><div class="na-cell-label">Can Chi</div><div class="na-cell-val">' + CAN[canIdx] + ' ' + CHI[chiIdx] + '</div></div>\n' +
      '    <div class="na-cell"><div class="na-cell-label">Nạp Âm</div><div class="na-cell-val" style="font-size:22px"><span class="na-hanh-dot" style="background:' + color + '"></span>' + na + '</div><div class="na-info">' + (HANH_DESC[hanh] || '') + '</div></div>';
    return {
      ok: true,
      eyebrowText: 'Kết quả — Năm ' + y,
      resultHTML: resultHTML,
      data: {
        nam: y,
        canChi: CAN[canIdx] + ' ' + CHI[chiIdx],
        conGiap: CON_GIAP[chiIdx],
        napAm: na,
        hanh: hanh,
      },
    };
  }

  var API = { compute: compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NapAmTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
