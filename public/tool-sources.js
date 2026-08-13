// tool-sources.js — NGUỒN DUY NHẤT ghi "tool này dùng cổ pháp/phương pháp gì"
// cho khối giới thiệu (shell.js `introOnce`, tự nạp file này) VÀ khối kết quả
// (shell.js `maybeAppendSrcNote`, tự chèn khi vùng kết quả có nội dung — xem
// `watchWsResult`). Đừng chép chuỗi ra nơi khác — thêm/sửa nguồn thì sửa Ở
// ĐÂY, một chỗ, khớp lại cả 2 vị trí cùng lúc, cho MỌI tool trong shell.
//
// ⚠️ KHOÁ tra theo `window.SHELL_ACTIVE` của từng trang app-*.html — CHÍNH LÀ
// khoá `events.tool_id` dùng để đo — KHÔNG phải `tool_pricing.tool_id` (hai
// cái lệch nhau ở nhiều tool: bat-tu/tu-binh, chon-ngay/chon-ngay-tot,
// dat-ten/dat-ten-con — xem CLAUDE.md mục "BA HỆ TÊN TOOL ĐANG LỆCH NHAU").
// Tra nhầm hệ tên là dòng nguồn không bao giờ hiện, im lặng, không báo lỗi.
//
// QUY ƯỚC (đọc trước khi thêm dòng — xem thêm trang /nguon-du-lieu.html):
//   'co-phap' — cổ thư/thuật số có tên gọi thật. Ghi ĐÚNG tên, không bịa tác
//               giả, không suy diễn thêm.
//   'tvmb'    — phương pháp/thang chấm do đội ngũ tự dựng (không có trong cổ
//               thư). CHỈ nêu tên đơn vị, TUYỆT ĐỐI không mô tả đã làm gì —
//               nêu chi tiết là tự tay đưa cho đối thủ chép lại (Henry chốt).
//   'lib'     — thư viện mã nguồn mở dùng để tính/đối chiếu. CHỈ nói "thư viện
//               mã nguồn mở, giấy phép MIT" — KHÔNG nêu tên gói/repo. Henry
//               chốt: tên gói tra ngược ra kỹ thuật đang dùng cho đối thủ.
//               ⚠️ "(MIT)" LÀ TÊN GIẤY PHÉP PHẦN MỀM (MIT License), KHÔNG
//               PHẢI Đại học MIT — hai thứ trùng tên tình cờ, ĐỪNG viết thành
//               "nghiên cứu của đại học MIT", đó là một tuyên bố sai sự thật.
// Tool KHÔNG có mặt trong REG thì mọi hàm trả về rỗng — im lặng, không suy
// đoán ra một nguồn không kiểm chứng được cho nó.
(function () {
  var TAN_BIEN = { kind: 'co-phap', name: 'Tử Vi Đẩu Số Tân Biên (Vân Đằng Thái Thứ Lang)' };
  var VDC = { kind: 'co-phap', name: 'Trung Châu Phái — Lục Thập Tinh Hệ (Vương Đình Chi)' };
  var TU_BINH = { kind: 'co-phap', name: 'Tử Bình' };
  var TVMB = { kind: 'tvmb' };
  var LIB = { kind: 'lib' }; // dùng chung cho mọi thư viện mã nguồn mở — KHÔNG nêu tên gói (xem quy ước trên)
  var MA_LIEU_THUY = { kind: 'co-phap', name: 'Ma Y Thần Tướng, Liễu Trang Thần Tướng, Thủy Kính Tập' };

  // Danh mục — phủ các tool đã xác nhận nguồn (đọc thẳng từ prompt/engine
  // thật, không đoán). Khoá là SHELL_ACTIVE, xem cảnh báo ở đầu file.
  var REG = {
    // ── Tử Vi ──
    'luan-giai': [TAN_BIEN],
    'la-so': [TAN_BIEN],
    'an-sao': [TAN_BIEN],
    'gio-sinh': [TAN_BIEN, TVMB],
    'xem-tuoi': [TAN_BIEN],
    'xem-lam-an': [TAN_BIEN],
    'tuong-hop': [TAN_BIEN],
    'sinh-con': [TAN_BIEN],
    'cong-so': [TAN_BIEN, VDC, TVMB],
    'day-con': [TAN_BIEN, TVMB],
    'huong-nghiep-tre': [TAN_BIEN, TVMB],
    'nguoi-khac': [TAN_BIEN, TVMB],
    'nhan-mach': [TAN_BIEN, TVMB],
    'chan-dung-tien-kiep': [TAN_BIEN, TVMB],
    'chan-dung-vo-chong': [TAN_BIEN, TVMB],
    'duyen-no-tien-kiep': [TAN_BIEN, TVMB],
    // ── Bát Tự ──
    'bat-tu': [TU_BINH, LIB],
    'tu-tru': [TU_BINH],
    // ── Chiêm tinh Tây ──
    'ban-do-sao': [LIB],
    // ── Huyền học / lịch số ──
    'ky-mon': [{ kind: 'co-phap', name: 'Kỳ Môn Độn Giáp' }, LIB],
    'luc-nham': [{ kind: 'co-phap', name: 'Đại Lục Nhâm' }, LIB],
    'hoang-dao': [{ kind: 'co-phap', name: 'Hoàng Lịch' }, LIB],
    'ngay-tot': [{ kind: 'co-phap', name: 'Hoàng Lịch' }, LIB],
    'mai-hoa': [{ kind: 'co-phap', name: 'Mai Hoa Dịch Số' }],
    'kinh-dich': [{ kind: 'co-phap', name: 'Kinh Dịch' }],
    'than-so-hoc': [{ kind: 'co-phap', name: 'Thần số học Pythagoras' }],
    // ── Mệnh lý ──
    'kim-lau': [{ kind: 'co-phap', name: 'Kim Lâu' }],
    'bat-trach': [{ kind: 'co-phap', name: 'Bát Trạch Minh Kính' }],
    'ngu-hanh-ten': [TVMB],
    'nap-am': [{ kind: 'co-phap', name: 'Lục Thập Hoa Giáp' }],
    // ── Đặt tên & ngày ──
    'chon-ngay': [{ kind: 'co-phap', name: 'Hoàng Lịch' }, LIB],
    'dat-ten': [TVMB],
    'dat-ten-dn': [TVMB],
    // ── Xem tướng ──
    'dien-tuong': [MA_LIEU_THUY],
    'nhan-tuong': [MA_LIEU_THUY],
    'thanh-tuong': [{ kind: 'co-phap', name: 'Ma Y Thần Tướng, Ngũ Âm tướng pháp' }],
    'thanh-tuong-pro': [{ kind: 'co-phap', name: 'Ma Y Thần Tướng, Ngũ Âm tướng pháp' }],
    'thu-tuong': [{ kind: 'co-phap', name: 'Chỉ Tướng học phương Đông' }],
    // ── Phong thủy ──
    'phong-thuy': [{ kind: 'co-phap', name: 'Bát Trạch Minh Kính' }, TVMB]
  };

  // Gộp mọi entry 'co-phap' của MỘT tool thành MỘT câu ("Theo A, B và C."),
  // thay vì lặp "Theo X. Theo Y. Theo Z." — đọc tự nhiên hơn khi một tool trích
  // nhiều nguồn (vd. Xem Tướng trích 3 cổ thư trong CÙNG một entry `name`).
  function fmtCoPhap(names) {
    if (!names.length) return '';
    var s = names.length === 1 ? names[0]
      : names.slice(0, -1).join(', ') + ' và ' + names[names.length - 1];
    return 'Theo <i>' + s + '</i>.';
  }

  function line(id) {
    var es = REG[id];
    if (!es || !es.length) return '';
    var parts = [];
    var coPhapNames = es.filter(function (e) { return e.kind === 'co-phap'; }).map(function (e) { return e.name; });
    var cp = fmtCoPhap(coPhapNames);
    if (cp) parts.push(cp);
    es.forEach(function (e) {
      if (e.kind === 'tvmb') parts.push('Phần quy chiếu riêng do <b>đội ngũ chuyên gia Tử Vi Minh Bảo</b> xây dựng.');
      if (e.kind === 'lib') parts.push('Đối chiếu qua một thư viện mã nguồn mở (giấy phép MIT).');
      if (e.kind === 'data') parts.push('Dùng ' + (e.name || 'một bộ dữ liệu mở') + ' làm thước đo, không phải danh mục hiển thị.');
    });
    return parts.join(' ');
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
  //
  // Class `tvmb-src-note` + `data-share-skip`: (a) là DẤU HIỆU để shell.js
  // biết tool này ĐÃ có khối nguồn (tự chèn tay hoặc do `maybeAppendSrcNote`
  // tự chèn) — không chèn chồng lần hai; (b) loại khối này khỏi bản chia sẻ tự
  // suy (`domShareText` đã loại `[data-share-skip]`) — nội dung nguồn là
  // boilerplate, không phải kết quả của lượt luận, lẫn vào link chia sẻ là rác.
  //
  // opts.prefix: HTML riêng của tool (vd. luật đọc con số) đặt TRƯỚC dòng
  // nguồn, dùng khi trang đã có sẵn một câu caveat muốn gộp chung một khối.
  function noteHtml(id, opts) {
    opts = opts || {};
    var l = line(id);
    if (!l && !opts.prefix) return '';
    return '<div class="tvmb-src-note" data-share-skip style="margin-top:16px;padding:14px 18px;background:#FBF3DE;border:1px solid #e8d9b0;border-radius:10px;font-size:12.5px;line-height:1.68;color:#5a5145">' +
      (opts.prefix ? opts.prefix + '<br><br>' : '') +
      (l ? '📚 <b>Nguồn:</b> ' + l + ' ' : '') +
      '<a href="/nguon-du-lieu.html" target="_blank" rel="noopener" style="color:#9A7B3A">Xem đầy đủ nguồn dữ liệu →</a>' +
      '</div>';
  }

  window.ToolSources = { REG: REG, line: line, introHtml: introHtml, noteHtml: noteHtml };
})();
