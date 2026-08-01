/* tools-shared/kim-lau.js — Module DÙNG CHUNG cho tool Kim Lâu / Tam Tai /
   Hoang Ốc. Nguồn DUY NHẤT: cả trang standalone (/kim-lau) lẫn
   shell (/app/kim-lau) đều gọi module này → sửa 1 chỗ, 2 nơi cập nhật.

   Logic PORT từ bản inline cũ của tools/kim-lau.html. Hai chỗ ĐÃ ĐỔI HÀNH VI
   có chủ đích (phần còn lại giữ nguyên):
     1. Năm hiện tại lấy ĐỘNG theo giờ VN (vnYear) thay vì hardcode 2026 — sửa
        bug "sang 2027 vẫn tính theo 2026".
     2. 🔴 CÔNG THỨC KIM LÂU: `tuổi % 5 ∈ {1,3}` → `tuổi % 9 ∈ {1,3,6,8}`.
        Bản cũ SAI. Luật dân gian Việt (và mọi nguồn đang xếp hạng cho cụm
        "cách tính kim lâu") là chia tuổi ÂM cho 9, dư 1/3/6/8 thì phạm — và
        đúng 4 số dư đó ứng với 4 loại Thân/Thê/Tử/Lục Súc mà chính tài liệu
        repo mô tả tool này trả về. Bản mod-5 không thể sinh ra 4 loại, tức
        code lệch khỏi ý định đã ghi.
        Đo tuổi 18–80: 46% số tuổi ra kết quả KHÁC bản cũ. Nặng nhất là 16 tuổi
        (19·24·30·35·37·39·42·44·55·57·60·62·64·69·75·80) trước đây báo "Bình
        thường" trong khi thực tế phạm — người dùng xem xong đi động thổ/cưới
        hỏi. Đổi là để đúng, không phải để đẹp.

   API: window.KimLauTool = { vnYear, compute } (thuần dữ liệu + chuỗi HTML;
   không đụng DOM — trang tự gắn vào phần tử của mình). */
(function (root) {
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  // NAP_AM giữ NGUYÊN chính tả bản legacy (khác diachi.ts vài chữ) để byte-khớp.
  var NAP_AM = ['Hải Trung Kim', 'Lô Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Xoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
  var TAM_TAI = { 8: [2, 3, 4], 0: [2, 3, 4], 4: [2, 3, 4], 5: [11, 0, 1], 9: [11, 0, 1], 1: [11, 0, 1], 2: [8, 9, 10], 6: [8, 9, 10], 10: [8, 9, 10], 11: [5, 6, 7], 3: [5, 6, 7], 7: [5, 6, 7] };

  // 4 số dư của phép chia 9 → 4 loại Kim Lâu. Mỗi loại ứng với người/vật bị
  // ảnh hưởng theo cổ tục: Thân = chính gia chủ · Thê = vợ · Tử = con cái ·
  // Lục Súc = vật nuôi, tài sản.
  var KIM_LAU_LOAI = { 1: 'Thân', 3: 'Thê', 6: 'Tử', 8: 'Lục Súc' };
  var KIM_LAU_HAI = {
    Thân: 'ảnh hưởng tới chính gia chủ',
    Thê: 'ảnh hưởng tới người vợ',
    Tử: 'ảnh hưởng tới con cái',
    'Lục Súc': 'ảnh hưởng tới vật nuôi, tài sản',
  };

  /** Trả tên loại Kim Lâu, hoặc null nếu không phạm. Tuổi ÂM (tuổi ta). */
  function kimLauLoai(t) { return KIM_LAU_LOAI[((t % 9) + 9) % 9] || null; }
  // (Bỏ `isKimLau` — mọi chỗ gọi nay dùng thẳng `kimLauLoai(t) !== null` để có
  // luôn tên loại; giữ lại một hàm boolean song song chỉ tạo chỗ cho hai đường
  // tính trôi khỏi nhau.)
  function isHoangOc(t) { return t > 0 && t % 5 === 0; }
  function isTamTai(bChi, yChi) { var g = TAM_TAI[bChi]; return g && g.includes(yChi); }

  function getStatusHTML(kl, ho, tt, loai) {
    var tags = [];
    if (kl) tags.push('<span class="res-tag res-tag-bad">Kim Lâu' + (loai ? ' ' + loai : '') + '</span>');
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
    var klLoai = kimLauLoai(tuoiTa);
    var kl = klLoai !== null, ho = isHoangOc(tuoiTa), tt = isTamTai(bChi, yChi);
    var currentBoxHTML;
    if (kl || ho || tt) {
      // Nêu ĐÍCH DANH loại Kim Lâu và nó hại ai — đó là phần người ta thật sự
      // cần để quyết (Kim Lâu Thê thì hoãn cưới, Lục Súc thì nhẹ hơn hẳn).
      var klCau = kl ? 'Năm nay là tuổi Kim Lâu ' + klLoai + ' — ' + KIM_LAU_HAI[klLoai] + ', kiêng cưới hỏi, xây dựng, khởi công lớn.' : '';
      var desc = kl && tt ? klCau + ' Năm nay còn trùng Tam Tai nên cần thận trọng đặc biệt.' : kl ? klCau : ho ? 'Năm nay là tuổi Hoang Ốc — kiêng mua bán và xây nhà.' : 'Năm nay đang trong vận Tam Tai — cẩn thận với các quyết định lớn.';
      currentBoxHTML = '<div style="background:#fef0ef;border-left:3px solid #c9a84c;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">Năm ' + curYear + ' (Tuổi ' + tuoiTa + ') — ' + getStatusHTML(kl, ho, tt, klLoai) + '</div><div style="font-size:13px;color:var(--text-mid)">' + desc + '</div></div>';
    } else {
      currentBoxHTML = '<div style="background:#eaf4ed;border-left:3px solid #1E6B3C;padding:14px 16px;border-radius:0 6px 6px 0;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">Năm ' + curYear + ' (Tuổi ' + tuoiTa + ') — <span class="res-tag res-tag-good">Bình thường</span></div><div style="font-size:13px;color:var(--text-mid)">Năm nay không có Kim Lâu, Hoang Ốc hay Tam Tai.</div></div>';
    }

    var rowsArr = [], rowsHTML = '';
    for (var y = curYear; y < curYear + 20; y++) {
      var t = y - by + 1;
      var y60b = (((y - 4) % 60) + 60) % 60;
      var yC = y60b % 12, yN = y60b % 10;
      var klLoai2 = kimLauLoai(t);
      var kl2 = klLoai2 !== null, ho2 = isHoangOc(t), tt2 = isTamTai(bChi, yC);
      var bold = y === curYear ? 'font-weight:700' : '';
      rowsHTML += '<tr' + ((kl2 || ho2 || tt2) ? ' class="highlight"' : '') + ' style="' + bold + '"><td>' + y + (y === curYear ? ' ▶' : '') + '</td><td>' + t + '</td><td>' + CAN[yN] + ' ' + CHI[yC] + '</td><td>' + getStatusHTML(kl2, ho2, tt2, klLoai2) + '</td></tr>';
      // `kimLauLoai` là trường THÊM — consumer cũ vẫn đọc `kimLau` boolean như cũ.
      rowsArr.push({ year: y, tuoiTa: t, canChi: CAN[yN] + ' ' + CHI[yC], kimLau: kl2, kimLauLoai: klLoai2, hoangOc: ho2, tamTai: tt2 });
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
        hienTai: { kimLau: kl, kimLauLoai: klLoai, hoangOc: ho, tamTai: tt },
        rows: rowsArr,
      },
    };
  }

  var API = { vnYear: vnYear, compute: compute, kimLauLoai: kimLauLoai };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.KimLauTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
