// public/tools-shared/phan-pool.js
// ============================================================
// Bể chạy N PHẦN ĐỘC LẬP SONG SONG (bounded concurrency), dùng CHUNG cho mọi
// tool "luận N phần" (Luận Giải 24 phần · Vận Hạn 12 Tháng Tới…). Mỗi phần là
// MỘT lượt gọi LLM riêng, không phụ thuộc dữ liệu của phần khác — mỗi phần tự
// truy vấn RAG bằng đúng số phần của nó, tự gọi API, tự ghi vào ô DOM riêng
// (`claude-content-<p>`). Song song hoá vì thế AN TOÀN TUYỆT ĐỐI về dữ liệu:
// không phần nào đọc kết quả của phần khác.
//
// 🔴 VÌ SAO CẦN (Henry báo 2026-08-20): Kimi K3 (primary) hiện ~120 giây/phần,
// có phần lâu hơn còn tự nhảy sang Opus 5 (đắt hơn). Chạy TUẦN TỰ (1 phần
// xong mới sang phần kế, xem git blame trước bản này) thì 24 phần × 120 giây
// = có thể tới 48 PHÚT một lượt luận giải. Song song 3 phần/đợt giảm tổng
// thời gian chờ ~3 lần MÀ KHÔNG ĐỤNG tới Kimi/model gì cả — thuần đổi THỨ TỰ
// GỌI ở tầng client, giữ nguyên Kimi K3 làm primary như Henry muốn.
//
//   var pool = PhanPool.run({
//     total: 24,
//     concurrency: 3,               // mặc định 3, xem lý do chọn số này dưới
//     progressEl: 'lgProgress',     // id phần tử hiển thị dòng tiến trình
//     progressPrefix: 'Đang luận giải phần',   // câu chữ riêng từng trang
//     pace: _pace,                  // pacer() instance (tools-shared/ai-loading-steps.js), tuỳ chọn
//     runPart: async function (p) { ... trả true (xong) / false (lỗi) ... },
//   });
//   var result = await pool;   // { failed:[số phần lỗi], doneCount, total, ok }
//
// `runPart(p)` tự lo TOÀN BỘ việc của phần đó (RAG, fetch, render vào ô
// `claude-content-<p>`, ghi vào store của trang) — bể chỉ điều phối THỨ TỰ
// NHẬN phần, dòng tiến trình, cuộn trang, và nhịp đo ETA. Một phần lỗi KHÔNG
// chặn các phần SAU nó — bể vẫn phát hết `total` phần, chỉ ghi lại phần nào
// lỗi vào `result.failed` để trang tự vẽ nút "↻ Thử lại" cho ĐÚNG phần đó
// (gọi thẳng lại `runPart(p)`, không cần chạy lại cả bể — xem cách dùng trong
// app-luan-giai.html/_lgRetryPhan).
//
// ⚠️ concurrency=3, KHÔNG PHẢI CÀNG NHIỀU CÀNG NHANH: bung hết N phần cùng
// lúc (vd 24) dồn 24 lượt gọi Moonshot vào cùng một nhịp — dễ chạm trần
// rate-limit tài khoản (429) hơn hẳn so với rải đều theo lô nhỏ, và
// kimiFetch() (lib/agent/providers/kimi.ts) tuy có backoff cho 429 nhưng
// backoff dưới áp lực 24 lượt cùng lúc vẫn chậm hơn rải 3 lượt/đợt. 3 là mức
// dè dặt: vẫn giảm ~3 lần tổng thời gian chờ mà không cần server đổi sang gọi
// theo lô (batch). `staggerMs` (mặc định 400) giãn nhẹ điểm XUẤT PHÁT của 3
// worker — kế thừa tinh thần độ trễ 600ms giữa các phần của bản tuần tự cũ,
// chỉ áp đúng chỗ còn ý nghĩa (lúc BẮT ĐẦU dồn tải), không cộng dồn vào mỗi
// phần như bản cũ (vô nghĩa khi đã chạy song song).
// ============================================================
(function () {
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function run(opts) {
    opts = opts || {};
    var total = opts.total | 0;
    var concurrency = Math.max(1, opts.concurrency || 3);
    var staggerMs = opts.staggerMs != null ? opts.staggerMs : 400;
    var runPart = opts.runPart;
    var pace = opts.pace || null;
    var doScroll = opts.scroll !== false;
    var progressEl = opts.progressEl ? document.getElementById(opts.progressEl) : null;
    var progressPrefix = opts.progressPrefix || 'Đang xử lý phần';

    var next = 0;        // phần TIẾP THEO chưa ai nhận
    var doneCount = 0;
    var failed = [];      // số phần đã thử mà lỗi — KHÔNG chặn các phần sau
    var inFlight = [];    // JS đơn luồng ⇒ push/splice ở đây an toàn tuyệt đối, không cần khoá

    function fmtInFlight() {
      var s = inFlight.slice().sort(function (a, b) { return a - b; });
      return s.join(', ');
    }

    function paint() {
      if (!progressEl || inFlight.length === 0) return;
      var remaining = total - doneCount;
      var eta = pace ? pace.remainText(remaining, concurrency) : '';
      progressEl.textContent =
        progressPrefix + ' ' + fmtInFlight() + ' / ' + total + (eta ? ' · ' + eta : '...');
    }

    function claim() {
      if (next >= total) return 0;
      next++;
      return next;
    }

    async function worker(startDelay) {
      if (startDelay) await sleep(startDelay);
      for (;;) {
        var p = claim();
        if (!p) return;
        inFlight.push(p);
        // Cuộn theo phần THẤP NHẤT đang chạy — giữ cảm giác "đang đọc xuôi từ
        // trên xuống" dù thực chất vài phần chạy song song phía sau. Chỉ cuộn
        // khi p là số nhỏ nhất đang chạy — không thì 3 worker cùng khởi động
        // sẽ giật cuộn tới 3 chỗ khác nhau trong một nhịp.
        if (doScroll && p === Math.min.apply(null, inFlight)) {
          var secEl = document.getElementById('sec-' + p);
          if (secEl) secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        pace && pace.begin(p);
        paint();
        var ok = true;
        try {
          ok = await runPart(p);
        } catch (e) {
          ok = false;
        }
        // CỐ Ý chỉ ghi nhịp ở nhánh THÀNH CÔNG — một phần lỗi có thời lượng
        // thật nhưng không đại diện cho phần chạy được (xem ai-loading-steps.js).
        if (ok !== false) pace && pace.end(p);
        var idx = inFlight.indexOf(p);
        if (idx >= 0) inFlight.splice(idx, 1);
        doneCount++;
        if (ok === false) failed.push(p);
        paint();
      }
    }

    var n = Math.min(concurrency, total);
    var workers = [];
    for (var i = 0; i < n; i++) workers.push(worker(i * staggerMs));
    return Promise.all(workers).then(function () {
      return { failed: failed, doneCount: doneCount, total: total, ok: failed.length === 0 };
    });
  }

  window.PhanPool = { run: run };
})();
