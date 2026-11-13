/* tools-shared/nap-am.js — Module DÙNG CHUNG tool Nạp Âm Ngũ Hành.
   Nguồn DUY NHẤT cho trang standalone /tools/nap-am.html + shell /app/nap-am.
   Logic + chuỗi render PORT NGUYÊN XI từ bản inline cũ của tools/nap-am.html
   (kể cả NAP_AM/HANH_DESC) — không đổi hành vi. API thuần dữ liệu + HTML.
   window.NapAmTool = { compute, ungDung, ungDungHTML }

   ⚠️ VÌ SAO CÓ `ungDung` — đọc trước khi rút gọn nó đi:
   Bản đầu của tool dừng ở 4 ô (Can · Chi · Can Chi · Nạp Âm) trong khi CHÍNH
   meta description của trang hứa "ứng dụng trong phong thủy, đặt tên, chọn
   màu". Trang tự hứa sẽ chỉ cho biết làm gì rồi không chỉ — người đọc xong
   không có việc nào để làm tiếp. Khảo sát đối thủ (lichngaytot "Xem Mệnh Theo
   Năm Sinh", menh.com.vn, amlich.net) cho thấy cầu THẬT của chủ đề này nằm ở
   phần ỨNG DỤNG (màu · phương vị · tuổi hợp-kỵ · số), không nằm ở con chữ
   "Lộ Bàng Thổ". `ungDung` là phần đó, và mọi giá trị đều TRA BẢNG thuần:
   0 lượt LLM, 0đ. */
(function (root) {
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var CON_GIAP = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Lợn'];
  var NAP_AM = ['Hải Trung Kim', 'Lô Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạch Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Trạch Thổ', 'Xoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];
  var HANH_COLOR = { Kim: '#9A7B3A', Hỏa: '#C0392B', Mộc: '#1E6B3C', Thủy: '#1455A4', Thổ: '#8B6914' };
  var HANH_DESC = { Kim: 'Ngũ hành Kim — cứng rắn, quyết đoán, có chính kiến. Kim tương sinh với Thủy, tương khắc với Mộc.', Hỏa: 'Ngũ hành Hỏa — nhiệt tình, nhanh nhẹn, có sức lôi cuốn. Hỏa tương sinh với Thổ, tương khắc với Kim.', Mộc: 'Ngũ hành Mộc — nhân từ, ngay thẳng, chí tiến thủ. Mộc tương sinh với Hỏa, tương khắc với Thổ.', Thủy: 'Ngũ hành Thủy — thông minh, linh hoạt, nhạy bén. Thủy tương sinh với Mộc, tương khắc với Hỏa.', Thổ: 'Ngũ hành Thổ — trung thực, bền bỉ, đáng tin cậy. Thổ tương sinh với Kim, tương khắc với Thủy.' };

  // ── Chữ hiển thị theo ngôn ngữ (W34b, ns i18n-long `nap-am`) ─────────────────────────────────────────
  // CHỈ lớp HTML hiển thị (`compute().resultHTML/eyebrowText/error`, `ungDungHTML`) đi qua đây; `data` + `ungDung()` giữ chữ
  // Việt (rail/prompt/`so-dep.js` đọc chúng). vi: `I18n.long` trả chữ Việt truyền vào ⇒ byte-giống bản cũ. Khoá: `t.<khoá>`
  // = bảng KHUON dưới đây (nguồn DUY NHẤT của câu có biến) · `desc|mau|pv|chat.<hành>` = bốn bảng trên · `cg.<con giáp>`.
  // Tên can/chi/nạp âm/hành qua glossary (`_tvmbG`, auth.js). Mỗi mục KHUON MỘT dòng, nháy đơn (bộ dò đọc bằng regex).
  var KHUON = {
    'can': 'Thiên Can',
    'chi': 'Địa Chi',
    'nam': 'Năm {x}',
    'canchi': 'Can Chi',
    'napam': 'Nạp Âm',
    'eyebrow': 'Kết quả — Năm {y}',
    'loi': 'Vui lòng nhập năm hợp lệ (1900–2100).',
    'head': 'Hành {h} — dùng vào việc gì',
    'k.mauhop': 'Màu hợp',
    'k.mauky': 'Màu nên hạn chế',
    'k.pv': 'Phương vị của hành',
    'k.tuoihop': 'Tuổi hợp (xét theo nạp âm)',
    'k.tuoiky': 'Tuổi cần cân nhắc',
    'k.so': 'Số & chất liệu',
    'mauhop': '{a} (bản mệnh), {b} ({me} sinh {h})',
    'mauky': '{a} ({k} khắc {h})',
    'n.pv': 'Đây là phương vị của ngũ hành, KHÔNG phải hướng nhà. Hướng nhà xét theo cung phi bát trạch (suy từ năm sinh + giới tính) — tra ở công cụ Bát Trạch bên dưới.',
    'n.th': 'Nạp âm chỉ là MỘT tầng khi xem tuổi. Xem tuổi đầy đủ còn xét can chi, tam hợp, tứ hành xung.',
    'nguoi': 'Người mệnh {x}',
    'khac': 'Người mệnh {x} (khắc bản mệnh)',
    'l.bt': 'Hướng nhà theo cung phi →',
    'l.th': 'Xem tuổi hợp đầy đủ →',
    'l.kl': 'Xem tuổi làm nhà, cưới hỏi →',
    'l.ms': 'Chọn màu theo cả mệnh lẫn tông da →',
  };
  if (root.I18n && root.I18n.loadLong) root.I18n.loadLong('nap-am');
  function fill(s, v) {
    return v
      ? String(s).replace(/\{(\w+)\}/g, function (m, n) {
          return v[n] !== undefined ? v[n] : m;
        })
      : s;
  }
  function X(k, vi, v) {
    return root.I18n && root.I18n.long ? root.I18n.long('nap-am', k, vi, v) : fill(vi, v);
  }
  function L(k, v) {
    return X('t.' + k, KHUON[k], v);
  }
  function G(kind, s) {
    return root._tvmbG ? root._tvmbG(kind, s) : s;
  }
  function getHanh(na) { for (var i = 0; i < 5; i++) { var h = ['Kim', 'Hỏa', 'Mộc', 'Thủy', 'Thổ'][i]; if (na.indexOf(h) > -1) return h; } return ''; }

  // compute(y) → { ok, error?, eyebrowText, resultHTML, data }. resultHTML =
  // CHÍNH chuỗi innerHTML mà bản cũ sinh cho #nap-am-result (byte-khớp).
  function compute(y) {
    if (!y || y < 1900 || y > 2100) {
      return { ok: false, error: L('loi') };
    }
    var idx60 = (((y - 4) % 60) + 60) % 60;
    var canIdx = idx60 % 10, chiIdx = idx60 % 12;
    var na = NAP_AM[Math.floor(idx60 / 2)];
    var hanh = getHanh(na);
    var color = HANH_COLOR[hanh] || '#444';
    var resultHTML =
      '\n    <div class="na-cell"><div class="na-cell-label">' + L('can') + '</div><div class="na-cell-val" style="color:' + color + '">' + G('can', CAN[canIdx]) + '</div></div>\n' +
      '    <div class="na-cell"><div class="na-cell-label">' + L('chi') + '</div><div class="na-cell-val">' + G('chi', CHI[chiIdx]) + '</div><div style="font-size:12px;color:var(--text-lt);margin-top:6px">' + L('nam', { x: X('cg.' + CON_GIAP[chiIdx], CON_GIAP[chiIdx]) }) + '</div></div>\n' +
      '    <div class="na-cell"><div class="na-cell-label">' + L('canchi') + '</div><div class="na-cell-val">' + G('canchi', CAN[canIdx] + ' ' + CHI[chiIdx]) + '</div></div>\n' +
      '    <div class="na-cell"><div class="na-cell-label">' + L('napam') + '</div><div class="na-cell-val" style="font-size:22px"><span class="na-hanh-dot" style="background:' + color + '"></span>' + G('napam', na) + '</div><div class="na-info">' + (HANH_DESC[hanh] ? X('desc.' + hanh, HANH_DESC[hanh]) : '') + '</div></div>';
    return {
      ok: true,
      eyebrowText: L('eyebrow', { y: y }),
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

  // ───────────────────────────────────────────────────────────────────
  // TẦNG ỨNG DỤNG — "hành này thì làm gì"
  // ───────────────────────────────────────────────────────────────────
  // Quan hệ ngũ hành, khai theo VAI để chỗ dùng đọc ra nghĩa ngay, đỡ phải
  // suy ngược trong đầu (đúng lớp lỗi đã làm hai dòng `sinh` bị hoán vị cho
  // nhau ở track Duyên Nợ — xem CLAUDE.md).
  var DUOC_SINH = { Kim: 'Thổ', Thủy: 'Kim', Mộc: 'Thủy', Hỏa: 'Mộc', Thổ: 'Hỏa' }; // hành SINH RA mình (mẹ)
  var SINH_RA = { Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim' }; //   hành mình sinh ra (con)
  var BI_KHAC = { Kim: 'Hỏa', Mộc: 'Kim', Thổ: 'Mộc', Thủy: 'Thổ', Hỏa: 'Thủy' }; //   hành KHẮC mình
  var KHAC_LAI = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' }; //  hành mình khắc

  var MAU = {
    Kim: 'trắng, xám, ghi, ánh kim',
    Mộc: 'xanh lá, xanh nõn chuối',
    Thủy: 'xanh dương, đen',
    Hỏa: 'đỏ, hồng, cam, tím',
    Thổ: 'vàng đất, nâu, be',
  };
  // Phương vị ngũ hành (Hậu Thiên Bát Quái). CỐ Ý tách khỏi "hướng nhà" —
  // xem chú thích trong ungDungHTML.
  var PHUONG = {
    Kim: 'Tây · Tây Bắc',
    Mộc: 'Đông · Đông Nam',
    Thủy: 'Bắc',
    Hỏa: 'Nam',
    Thổ: 'Đông Bắc · Tây Nam (và trung cung)',
  };
  var SO = { Thủy: '1, 6', Hỏa: '2, 7', Mộc: '3, 8', Kim: '4, 9', Thổ: '5, 10' }; // số Hà Đồ
  var CHAT = {
    Kim: 'kim loại, đá trắng, thạch anh trắng',
    Mộc: 'gỗ, tre trúc, cây xanh',
    Thủy: 'thủy tinh, gương, đá màu sẫm, bể nước',
    Hỏa: 'đồ da, ánh sáng ấm, vật hình nhọn',
    Thổ: 'gốm sứ, đá tự nhiên, ngọc, đất nung',
  };

  // ungDung(hanh) → dữ liệu thuần (không HTML) để trang/rail/bản chia sẻ dùng chung.
  function ungDung(hanh) {
    if (!MAU[hanh]) return null;
    var me = DUOC_SINH[hanh],
      con = SINH_RA[hanh],
      khacMinh = BI_KHAC[hanh],
      minhKhac = KHAC_LAI[hanh];
    return {
      hanh: hanh,
      mauHop: MAU[hanh] + ' (bản mệnh), ' + MAU[me] + ' (' + me + ' sinh ' + hanh + ')',
      mauKy: MAU[khacMinh] + ' (' + khacMinh + ' khắc ' + hanh + ')',
      phuongVi: PHUONG[hanh],
      hanhHop: me + ' · ' + hanh,
      // `hanhMe` là TRẦN (chỉ tên hành), khác `hanhHop` vốn là chuỗi để HIỆN.
      // Thêm vì `so-dep.js` cần so sinh/khắc bằng mã: bóc `hanhHop.split(' · ')`
      // là lấy chuỗi hiển thị làm API — đổi câu chữ một phát là hỏng im lặng.
      hanhMe: me,
      hanhKy: khacMinh,
      hanhHao: con + ' (mình sinh nó — hao khí, không phải xấu)',
      hanhMinhKhac: minhKhac,
      so: SO[hanh],
      chatLieu: CHAT[hanh],
    };
  }

  // ungDungT(hanh) → CÙNG các chuỗi hiển thị của `ungDung` nhưng theo ngôn ngữ trang (chỉ `ungDungHTML` dùng; vi byte-giống).
  function ungDungT(hanh) {
    var u = ungDung(hanh);
    if (!u) return null;
    var me = u.hanhMe, kh = u.hanhKy, H = G('hanh', hanh);
    return {
      hanh: H,
      mauHop: L('mauhop', { a: X('mau.' + hanh, MAU[hanh]), b: X('mau.' + me, MAU[me]), me: G('hanh', me), h: H }),
      mauKy: L('mauky', { a: X('mau.' + kh, MAU[kh]), k: G('hanh', kh), h: H }),
      phuongVi: X('pv.' + hanh, u.phuongVi),
      hanhHop: G('hanh', me) + ' · ' + H,
      hanhKy: G('hanh', kh),
      so: u.so,
      chatLieu: X('chat.' + hanh, u.chatLieu),
    };
  }

  // ungDungHTML(data, opts) → khối "Hành này thì làm gì".
  // opts.shell = true  → link sang bản /app/* (trang trong Luận Đường)
  //            = false → link sang bản /tools/*.html (trang standalone)
  function ungDungHTML(data, opts) {
    var u = data && ungDungT(data.hanh);
    if (!u) return '';
    var shell = !!(opts && opts.shell);
    var LK = {
      batTrach: shell ? '/app/bat-trach' : '/tools/bat-trach.html',
      tuongHop: shell ? '/app/tuong-hop' : '/tools/tuong-hop.html',
      kimLau: shell ? '/app/kim-lau' : '/kim-lau',
      mauSac: '/tools/mau-sac-hop-menh.html',
    };
    function row(label, val, note) {
      return (
        '<div class="na-use-row"><div class="na-use-k">' +
        label +
        '</div><div class="na-use-v">' +
        val +
        (note ? '<span class="na-use-note">' + note + '</span>' : '') +
        '</div></div>'
      );
    }
    return (
      '<div class="na-use">' +
      '<div class="na-use-head">' +
      L('head', { h: u.hanh }) +
      '</div>' +
      row(L('k.mauhop'), u.mauHop) +
      row(L('k.mauky'), u.mauKy) +
      row(L('k.pv'), u.phuongVi, L('n.pv')) +
      row(L('k.tuoihop'), L('nguoi', { x: u.hanhHop }), L('n.th')) +
      row(L('k.tuoiky'), L('khac', { x: u.hanhKy })) +
      row(L('k.so'), u.so + ' · ' + u.chatLieu) +
      '<div class="na-use-links">' +
      '<a class="na-use-link" href="' +
      LK.batTrach +
      '">' +
      L('l.bt') +
      '</a>' +
      '<a class="na-use-link" href="' +
      LK.tuongHop +
      '">' +
      L('l.th') +
      '</a>' +
      '<a class="na-use-link" href="' +
      LK.kimLau +
      '">' +
      L('l.kl') +
      '</a>' +
      '<a class="na-use-link" href="' +
      LK.mauSac +
      '">' +
      L('l.ms') +
      '</a>' +
      '</div>' +
      '</div>'
    );
  }

  // Hai hàm dưới CHỈ để HIỂN THỊ (bản chia sẻ): ungDung theo ngôn ngữ trang + con giáp đã dịch.
  function conGiapDisplay(c) {
    return X('cg.' + c, c);
  }
  var API = {
    compute: compute,
    ungDung: ungDung,
    ungDungHTML: ungDungHTML,
    ungDungDisplay: ungDungT,
    conGiapDisplay: conGiapDisplay,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NapAmTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
