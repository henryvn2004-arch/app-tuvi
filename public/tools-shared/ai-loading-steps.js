// public/tools-shared/ai-loading-steps.js
// ============================================================
// Chỉ báo "đang xử lý" kiểu streaming task-list (như ChatGPT/Claude) dùng
// CHUNG cho mọi tool gọi AI một lượt (không SSE) — vẽ ảnh, sinh mô tả...
// Vì backend trả JSON 1 lần (không có tiến trình thật để lắng nghe), các
// bước ở đây là MÔ PHỎNG theo thời lượng ước tính từng giai đoạn thật của
// backend (cấu hình qua tham số `steps`) — bước CUỐI luôn giữ trạng thái
// "đang chạy" (không tự chuyển done) cho tới khi gọi finish() thật.
//
// Dùng:
//   var ctl = AiLoadingSteps.mount('mountId', [
//     { label: 'Lập lá số & xác định cung Phu Thê', ms: 900 },
//     { label: 'Luận giải cung Phu Thê', ms: 4500 },
//     { label: 'AI đang vẽ chân dung', ms: 0 }, // bước cuối: ms không dùng
//   ]);
//   ctl.start();
//   // ... await fetch(...)
//   ctl.finish();   // thành công — đánh dấu xong hết
//   ctl.stop();     // lỗi/huỷ — dọn sạch, không để lại state cũ
// ============================================================

(function () {
  var STYLE_ID = 'ai-loading-steps-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.ai-steps-box{display:flex;flex-direction:column;gap:9px;align-items:flex-start;text-align:left;max-width:360px;margin:0 auto}' +
      '.ai-step{display:flex;align-items:center;gap:10px;font-size:13.5px;line-height:1.4;color:var(--text-lt,#8a8f98);transition:color .25s}' +
      '.ai-step.active{color:var(--navy,#061A2E);font-weight:600}' +
      '.ai-step.done{color:var(--text-mid,#5a5145)}' +
      '.ai-step-ic{flex:none;width:18px;height:18px;display:flex;align-items:center;justify-content:center}' +
      '.ai-step-ic.pending{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.35;margin:6px}' +
      '.ai-step-ic.done{color:#9A7B3A;font-size:15px}' +
      '.ai-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(154,123,58,.25);border-top-color:#9A7B3A;animation:ai-spin-rotate .8s linear infinite}' +
      '@keyframes ai-spin-rotate{to{transform:rotate(360deg)}}' +
      '.ai-elapsed{margin-top:12px;font-size:11.5px;color:var(--text-lt,#8a8f98);opacity:.75}' +
      '.ai-wait{display:flex;flex-direction:column;gap:9px;align-items:center;width:100%;max-width:260px}' +
      '.ai-wait-top{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--text-mid,#5a5145)}' +
      '.ai-wait-bar{width:100%;height:4px;border-radius:99px;background:rgba(154,123,58,.18);overflow:hidden}' +
      '.ai-wait-bar i{display:block;height:100%;background:#9A7B3A;border-radius:99px;transition:width .9s linear}' +
      '.ai-wait-note{font-size:11.5px;line-height:1.45;color:var(--text-lt,#8a8f98);text-align:center}';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function render(el, rows) {
    el.innerHTML =
      '<div class="ai-steps-box">' +
      rows
        .map(function (r) {
          var icon =
            r.state === 'done'
              ? '<span class="ai-step-ic done">✓</span>'
              : r.state === 'active'
                ? '<span class="ai-step-ic active"><span class="ai-spin"></span></span>'
                : '<span class="ai-step-ic pending"></span>';
          return '<div class="ai-step ' + r.state + '">' + icon + '<span>' + r.label + '</span></div>';
        })
        .join('') +
      '</div>' +
      '<div class="ai-elapsed" id="' + el.id + '-elapsed"></div>';
  }

  function mount(containerOrId, steps) {
    var el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!el) return { start: function () {}, finish: function () {}, stop: function () {} };
    ensureStyle();

    var timers = [];
    var elapsedTimer = null;
    var rows = [];
    var startedAt = 0;

    function tickElapsed() {
      var elEl = document.getElementById(el.id + '-elapsed');
      if (!elEl) return;
      var s = Math.round((Date.now() - startedAt) / 1000);
      elEl.textContent = s < 3 ? '' : 'Đã chờ ' + s + ' giây…';
    }

    function start() {
      stop();
      startedAt = Date.now();
      rows = steps.map(function (s, i) {
        return { label: s.label, state: i === 0 ? 'active' : 'pending' };
      });
      render(el, rows);

      var cum = 0;
      for (var i = 1; i < steps.length; i++) {
        cum += steps[i - 1].ms || 1500;
        (function (idx, delay) {
          timers.push(
            setTimeout(function () {
              if (rows[idx - 1]) rows[idx - 1].state = 'done';
              if (rows[idx]) rows[idx].state = 'active';
              render(el, rows);
            }, delay),
          );
        })(i, cum);
      }

      elapsedTimer = setInterval(tickElapsed, 1000);
    }

    function finish() {
      timers.forEach(clearTimeout);
      timers = [];
      if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
      rows.forEach(function (r) { r.state = 'done'; });
      render(el, rows);
    }

    function stop() {
      timers.forEach(clearTimeout);
      timers = [];
      if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
      rows = [];
      el.innerHTML = '';
    }

    return { start: start, finish: finish, stop: stop };
  }

  // ============================================================
  // mountWait — chỉ báo cho quãng chờ DÀI của MỘT việc duy nhất (vẽ ảnh).
  //
  // VÌ SAO CẦN, khác `mount` ở trên: tool 2 pha (chân dung tiền kiếp, duyên nợ)
  // tắt bảng bước ngay khi truyện xong, rồi để pha ẢNH chạy tiếp ~40 giây nữa
  // với đúng một dòng chữ TĨNH trong khung ảnh. Không có gì nhúc nhích ⇒ người
  // dùng đọc thành "treo rồi" và bấm lại — mà bấm lại là một lượt GỌI MODEL nữa.
  //
  // Số liệu đo thật trên prod (events.llm_usage, cùng một tool hai model):
  // gpt-image-1 ~22 giây · gpt-image-2 ~46–57 giây. Nên mặc định hứa 45–60 giây.
  //
  //   var w = AiLoadingSteps.mountWait('imgPlaceholder', { label: '...' });
  //   w.start();  ... w.stop();     // LUÔN stop ở MỌI nhánh thoát
  //   w.note('Mất kết nối — đang thử lấy lại…');   // đổi lời, vẫn chạy đồng hồ
  // ============================================================
  function mountWait(containerOrId, opts) {
    var el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    var noop = { start: function () {}, stop: function () {}, note: function () {} };
    if (!el) return noop;
    ensureStyle();
    opts = opts || {};
    var label = opts.label || 'Đang vẽ tranh…';
    var expect = opts.expectSec || 52;
    var expectText = opts.expectText || 'khoảng 45–60 giây';
    var timer = null;
    var startedAt = 0;
    var override = '';

    function paint() {
      var s = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      // Trần 96%: thanh chạy đầy trong khi việc CHƯA xong còn tệ hơn không có
      // thanh nào — người dùng tin là xong rồi và bỏ đi.
      var pct = Math.min(96, Math.round((s / expect) * 100));
      var note = override
        ? override
        : s <= expect
          ? 'Thường mất ' + expectText + ' · đã chờ ' + s + ' giây'
          // Quá hẹn thì ĐỔI LỜI chứ không đứng im: nói rõ vẫn đang chạy, để
          // người ta không đóng trang hay bấm lại (bấm lại = tốn thêm tiền).
          : 'Lâu hơn thường lệ — vẫn đang vẽ, đừng đóng trang (đã chờ ' + s + ' giây)';
      el.innerHTML =
        '<div class="ai-wait">' +
        '<div class="ai-wait-top"><span class="ai-spin"></span><span class="ai-wait-label"></span></div>' +
        '<div class="ai-wait-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="ai-wait-note"></div>' +
        '</div>';
      // textContent chứ không nhét thẳng vào chuỗi HTML — nhãn/lời nhắn có thể
      // mang tên nhân vật do người dùng nhập.
      el.querySelector('.ai-wait-label').textContent = label;
      el.querySelector('.ai-wait-note').textContent = note;
    }

    return {
      start: function () {
        if (timer) clearInterval(timer);
        startedAt = Date.now();
        override = '';
        paint();
        timer = setInterval(paint, 1000);
      },
      note: function (t) { override = t || ''; if (timer) paint(); },
      stop: function () { if (timer) { clearInterval(timer); timer = null; } },
    };
  }

  window.AiLoadingSteps = { mount: mount, mountWait: mountWait };
})();
