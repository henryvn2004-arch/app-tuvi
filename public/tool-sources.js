// tool-sources.js — NGUỒN DUY NHẤT ghi "tool này dùng cổ pháp/phương pháp gì"
// cho khối giới thiệu (shell.js `introOnce`, tự nạp file này) VÀ khối kết quả
// (mỗi trang tự gọi ToolSources.noteHtml(id) khi cần). Đừng chép chuỗi ra nơi
// khác — thêm/sửa nguồn thì sửa Ở ĐÂY, một chỗ, khớp lại cả 2 vị trí cùng lúc.
//
// QUY ƯỚC (đọc trước khi thêm dòng — xem thêm trang /nguon-du-lieu.html):
//   'co-phap' — cổ thư/thuật số có tác giả hoặc tên gọi thật. Ghi ĐÚNG tên,
//               không bịa tác giả, không suy diễn thêm.
//   'tvmb'    — phương pháp/thang chấm do đội ngũ tự dựng (không có trong cổ
//               thư). CHỈ nêu tên đơn vị, TUYỆT ĐỐI không mô tả đã làm gì —
//               nêu chi tiết là tự tay đưa cho đối thủ chép lại (Henry chốt).
//   'lib'     — thư viện mã nguồn mở dùng để tính/đối chiếu.
//   'data'    — bộ dữ liệu mở dùng làm THƯỚC ĐO, không phải danh mục hiển thị.
// Tool KHÔNG có mặt trong REG thì mọi hàm trả về rỗng — im lặng, không suy
// đoán ra một nguồn không kiểm chứng được cho nó.
(function () {
  var TAN_BIEN = { kind: 'co-phap', name: 'Tử Vi Đẩu Số Tân Biên', author: 'Vân Đằng Thái Thứ Lang' };
  var VDC = { kind: 'co-phap', name: 'Trung Châu Phái — Lục Thập Tinh Hệ', author: 'Vương Đình Chi' };
  var TU_BINH = { kind: 'co-phap', name: 'Tử Bình' };
  var TVMB = { kind: 'tvmb' };
  var MINGYU = { kind: 'lib', name: 'mingyu-core', license: 'MIT' };
  var CELESTINE = { kind: 'lib', name: 'celestine', license: 'MIT' };

  // Danh mục ban đầu — phủ các tool đã xác nhận nguồn trong quá trình xây
  // dựng. Còn nhiều tool khác chưa vào đây, thêm dần theo lô.
  var REG = {
    'luan-giai': [TAN_BIEN],
    'la-so': [TAN_BIEN],
    'an-sao': [TAN_BIEN],
    'bat-tu': [TU_BINH, MINGYU],
    'tu-tru': [TU_BINH],
    'xem-tuoi': [TAN_BIEN],
    'xem-lam-an': [TAN_BIEN],
    'tuong-hop': [TAN_BIEN],
    'cong-so': [TAN_BIEN, VDC, TVMB],
    'day-con': [TAN_BIEN, TVMB],
    'huong-nghiep-tre': [TAN_BIEN, TVMB],
    'nguoi-khac': [TAN_BIEN, TVMB],
    'nhan-mach': [TAN_BIEN, TVMB],
    'chan-dung-tien-kiep': [TAN_BIEN, TVMB],
    'chan-dung-vo-chong': [TAN_BIEN, TVMB],
    'duyen-no-tien-kiep': [TAN_BIEN, TVMB],
    'ban-do-sao': [CELESTINE],
    'ky-mon': [{ kind: 'co-phap', name: 'Kỳ Môn Độn Giáp' }, MINGYU],
    'luc-nham': [{ kind: 'co-phap', name: 'Đại Lục Nhâm' }, MINGYU],
    'hoang-dao': [{ kind: 'co-phap', name: 'Hoàng Lịch' }, MINGYU],
    'ngay-tot': [{ kind: 'co-phap', name: 'Hoàng Lịch' }, MINGYU],
    'chon-ngay-tot': [{ kind: 'co-phap', name: 'Hoàng Lịch' }, MINGYU],
    'mai-hoa': [{ kind: 'co-phap', name: 'Mai Hoa Dịch Số' }],
    'kinh-dich': [{ kind: 'co-phap', name: 'Kinh Dịch' }],
    'kim-lau': [{ kind: 'co-phap', name: 'Kim Lâu' }],
    'bat-trach': [{ kind: 'co-phap', name: 'Bát Trạch Minh Cảnh' }],
    'than-so-hoc': [{ kind: 'co-phap', name: 'Thần số học Pythagoras' }],
    'ngu-hanh-ten': [TVMB],
    'nap-am': [{ kind: 'co-phap', name: 'Lục Thập Hoa Giáp' }],
    'sinh-con': [TAN_BIEN],
    'dat-ten-con': [TVMB],
    'dat-ten-dn': [TVMB]
  };

  function fmt(e) {
    if (e.kind === 'co-phap') return 'Theo <i>' + e.name + '</i>' + (e.author ? ' — ' + e.author : '') + '.';
    if (e.kind === 'tvmb') return 'Phần quy chiếu riêng do <b>đội ngũ chuyên gia Tử Vi Minh Bảo</b> xây dựng.';
    if (e.kind === 'lib') return 'Đối chiếu qua thư viện mã nguồn mở <i>' + e.name + '</i>' + (e.license ? ' (' + e.license + ')' : '') + '.';
    if (e.kind === 'data') return 'Dùng <i>' + e.name + '</i> làm thước đo, không phải danh mục hiển thị.';
    return '';
  }

  function line(id) {
    var es = REG[id];
    if (!es || !es.length) return '';
    return es.map(fmt).filter(Boolean).join(' ');
  }

  // Dòng NGẮN cho khối giới thiệu (shell.js introOnce) — chữ nhỏ, mờ, đặt
  // DƯỚI phần mô tả tính năng để không cạnh tranh với câu chào hàng.
  function introHtml(id) {
    var l = line(id);
    if (!l) return '';
    return '<div style="margin-top:9px;font-size:11.5px;line-height:1.6;color:#8a8a8a;opacity:.9">' + l +
      ' <a href="/nguon-du-lieu.html" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Nguồn dữ liệu →</a></div>';
  }

  // Khối ĐẦY ĐỦ hơn cho cuối phần kết quả — tự lo CSS bằng inline style (KHÔNG
  // dựa vào class .res-block của riêng từng trang, để dùng được ở bất kỳ tool
  // nào). Tông màu #FBF3DE/#e8d9b0/#5a5145 lấy nguyên từ khối caveat đã có sẵn
  // ở day-con/huong-nghiep-tre — một khối "nguồn" mới không lạc tông với khối
  // caveat cũ đứng cạnh nó.
  // opts.prefix: HTML riêng của tool (vd. luật đọc con số) đặt TRƯỚC dòng nguồn,
  // dùng khi trang đã có sẵn một câu caveat muốn gộp chung một khối.
  function noteHtml(id, opts) {
    opts = opts || {};
    var l = line(id);
    if (!l && !opts.prefix) return '';
    return '<div style="margin-top:16px;padding:14px 18px;background:#FBF3DE;border:1px solid #e8d9b0;border-radius:10px;font-size:12.5px;line-height:1.68;color:#5a5145">' +
      (opts.prefix ? opts.prefix + '<br><br>' : '') +
      (l ? '📚 <b>Nguồn:</b> ' + l + ' ' : '') +
      '<a href="/nguon-du-lieu.html" target="_blank" rel="noopener" style="color:#9A7B3A">Xem đầy đủ nguồn dữ liệu →</a>' +
      '</div>';
  }

  window.ToolSources = { REG: REG, line: line, introHtml: introHtml, noteHtml: noteHtml };
})();
