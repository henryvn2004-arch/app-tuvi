// public/tools-shared/portrait-recover.js
// ============================================================
// Lấy lại bức tranh khi TRÌNH DUYỆT bỏ cuộc trong lúc SERVER VẪN ĐANG VẼ.
//
// VÌ SAO CẦN: ảnh mất ~46–57 giây (gpt-image-2 medium, đo trên prod). Trên di
// động — khoá màn hình, đổi sóng, chuyển tab — fetch bị cắt trong khi hàm trên
// server CHẠY TỚI CÙNG rồi ghi cache. Đã xảy ra thật: người dùng thấy "không vẽ
// được" trong khi bức tranh nằm sẵn trong kho 50 giây sau đó.
//
// 🔑 LUẬT TIỀN — đọc trước khi sửa: KHÔNG BAO GIỜ POST lại một cách mù. Pha ảnh
// chưa vào cache thì một lượt POST nữa là một lượt GỌI MODEL nữa (~1.100đ) để
// lấy đúng bức tranh đang được vẽ dở. Nên luôn hỏi `cache-status` trước, chỉ khi
// server báo đã có cache mới POST — lượt đó chỉ đọc lại, không sinh ảnh.
//
// 🔑 CHỈ phục hồi khi lỗi có thể là "server vẫn đang chạy":
//   • fetch NÉM (mất kết nối, request bị cắt) — không hề có phản hồi; hoặc
//   • 502/503/504 — edge bỏ cuộc nhưng hàm server còn sống.
// Server trả lỗi ĐÀNG HOÀNG (402 chưa trả tiền, 500 sinh ảnh hỏng) là câu trả
// lời DỨT KHOÁT: phục hồi chỉ tổ bắt người dùng nhìn spinner thêm 90 giây rồi
// vẫn nhận đúng câu báo lỗi đó.
// ============================================================

(function () {
  var GATEWAY = [502, 503, 504];

  /** Query `action=cache-status` cho MỘT lá số — đúng tên tham số route đọc. */
  function birthQuery(b, prefix) {
    var p = prefix || '';
    if (!b) return '';
    return p + 'd=' + (b.day || 0) + '&' + p + 'm=' + (b.month || 0) + '&' + p + 'y=' + (b.year || 0) +
      '&' + (p ? p + 'h' : 'h') + '=' + (b.hourBranch == null ? -1 : b.hourBranch) +
      '&' + (p ? p + 'g' : 'g') + '=' + (b.gender === 'nu' ? 'nu' : 'nam') +
      '&' + (p ? p + 'l' : 'lunar') + '=' + (b.isLunar ? '1' : '0');
  }

  /**
   * true nếu lỗi vừa rồi THUỘC LOẠI đáng thử lại (xem luật ở đầu file).
   * `res` là Response nếu có, `null`/undefined nếu fetch đã ném.
   */
  function nenThuLai(res) {
    if (!res) return true;                       // fetch ném — không có phản hồi nào
    return GATEWAY.indexOf(res.status) >= 0;     // edge bỏ cuộc, hàm có thể còn chạy
  }

  /**
   * Hỏi `cache-status` tới khi server báo ĐỦ cache rồi mới xin lại kết quả.
   * Trả về data của lượt POST thành công, hoặc null nếu hết giờ.
   *
   * opts: { endpoint, query, body, everyMs?, maxMs? }
   */
  async function wait(opts) {
    var endpoint = opts.endpoint;
    var every = opts.everyMs || 5000;
    var max = opts.maxMs || 90000;
    var token = (window.Auth && Auth.getSession && Auth.getSession()?.access_token) || '';
    var het = Date.now() + max;

    while (Date.now() < het) {
      await new Promise(function (r) { setTimeout(r, every); });
      try {
        var st = await fetch(endpoint + '?action=cache-status&' + opts.query, {
          headers: { Authorization: 'Bearer ' + token },
        });
        var sd = await st.json();
        if (!sd || !sd.cached) continue;         // chưa xong — KHÔNG POST, khỏi tốn tiền
        var rr = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify(opts.body),
        });
        var rd = await rr.json();
        if (rr.ok && rd && rd.success) return rd;
      } catch (e) { /* mạng chập chờn — vòng sau thử tiếp */ }
    }
    return null;
  }

  window.PortraitRecover = { birthQuery: birthQuery, nenThuLai: nenThuLai, wait: wait };
})();
