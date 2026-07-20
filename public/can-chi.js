/* can-chi.js — Helper CAN CHI / NẠP ÂM thuần (browser), port từ
   lib/engine/diachi.ts (parity tuyệt đối). Cho các trang shell nhẹ
   (Đặt tên, Chọn ngày) render thông tin can chi trước khi hỏi trợ lý.
   Public API: window.CanChi = { ccInfo, ccThangCanChi }. */
(function (root) {
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var NA = ['Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy', 'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy'];
  var NA_TEN = ['Hải Trung Kim', 'Lò Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạc Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Dịch Thổ', 'Thoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];

  function ccInfo(year) {
    year = Number(year);
    if (!year || isNaN(year)) return null;
    var pos = (((year - 1924) % 60) + 60) % 60;
    return {
      canChi: CAN[pos % 10] + ' ' + CHI[pos % 12],
      can: CAN[pos % 10],
      chi: CHI[pos % 12],
      chiIdx: pos % 12,
      hanh: NA[Math.floor(pos / 2)],
      napAm: NA_TEN[Math.floor(pos / 2)],
    };
  }
  function ccThangCanChi(thang, nam) {
    thang = Number(thang); nam = Number(nam);
    if (!thang || !nam) return '';
    var pos = (((nam - 1924) % 60) + 60) % 60;
    var base = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][pos % 10];
    return CAN[(base + (thang - 1) * 2) % 10] + ' ' + CHI[(2 + thang - 1) % 12];
  }

  var API = { ccInfo: ccInfo, ccThangCanChi: ccThangCanChi };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CanChi = API;
})(typeof window !== 'undefined' ? window : globalThis);
