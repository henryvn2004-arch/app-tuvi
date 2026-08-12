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
//
// ============================================================
// 📏 LUẬT CHỌN CHỈ BÁO — theo ĐỘ DÀI QUÃNG CHỜ, không theo sở thích
//
//   ≥ 10 giây, chờ MỘT CỤC (gọi LLM/sinh ảnh, màn hình đứng im)
//       → orb 62px: `mountWait`, hoặc `mount` (orb bật sẵn).
//       Đây là chỗ người ta ngồi nhìn chằm chằm rồi tưởng treo và BẤM LẠI —
//       mà bấm lại là một lượt gọi model nữa, tốn tiền thật.
//
//   < 10 giây, hoặc nằm TRONG một nút / một dòng
//       → giữ spinner 14px `.ai-spin`. Orb lóe 300ms rồi biến mất còn khó
//       chịu hơn không có gì, và không nhét vừa vào nút.
//
//   Chữ CHẢY DẦN (SSE/stream) → KHÔNG đụng vào.
//       Bản thân dòng chữ đang chạy đã là chỉ báo tốt nhất; chồng orb lên
//       chỉ che mất nội dung. Rail chat giữ 3 chấm `.typing` của shell.css.
//
//   Tải danh sách / điều hướng trang → skeleton hoặc không gì cả.
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
      '.ai-wait-note{font-size:11.5px;line-height:1.45;color:var(--text-lt,#8a8f98);text-align:center;font-variant-numeric:tabular-nums}' +
      // ---- orb: cục sáng có quầng khói, cho quãng chờ DÀI (xem mục orbHtml) ----
      // Mặt cục dùng --navy và dấu ✦ dùng --gold-on-navy: CẢ HAI token đều cố ý
      // KHÔNG khai lại ở dark theme (xem CLAUDE.md, luật "token hai vai"), nên orb
      // ra y hệt ở light lẫn dark — đúng thứ mình muốn cho một dấu thương hiệu.
      // Nền khung chờ ảnh là kem #EFEBE3, nên mặt cục phải TỐI mới nhìn ra;
      // bê nguyên cục trắng kiểu app nền-video là mất hút.
      '.ai-orb{position:relative;flex:none;display:grid;place-items:center}' +
      '.ai-orb-core{position:relative;z-index:2;width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 32% 26%,#0d2740,var(--navy,#061A2E));box-shadow:0 2px 14px rgba(0,0,0,.16),0 0 0 1px rgba(201,168,76,.45) inset}' +
      '.ai-orb-core svg{width:34%;height:34%;color:var(--gold-on-navy,#F9F4EB)}' +
      '.ai-orb-halo{position:absolute;border-radius:50%}' +
      // A — khói xoay: hai lớp lồng nhau vì lớp ngoài animate scale còn lớp trong
      // animate rotate; dồn cả hai vào MỘT element thì hai @keyframes cùng ghi
      // `transform` và cái sau nuốt cái trước.
      '.ai-orb-a .ai-orb-halo{inset:-19%;animation:ai-orb-breathe 2.1s ease-in-out infinite}' +
      '.ai-orb-a .ai-orb-halo i{display:block;width:100%;height:100%;border-radius:50%;opacity:.92;filter:blur(13px);background:var(--gold,#C9A84C);background:conic-gradient(var(--gold-soft,#9A7B3A),#F2DFA8,var(--gold,#C9A84C),#F2DFA8,var(--gold-soft,#9A7B3A));animation:ai-orb-spin 2.7s linear infinite}' +
      // B — nhịp thở
      '.ai-orb-b .ai-orb-halo{inset:0;box-shadow:0 0 26px 7px var(--gold,#C9A84C);opacity:.55;animation:ai-orb-glow 1.9s ease-in-out infinite}' +
      '.ai-orb-b .ai-orb-halo::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--gold,#C9A84C);animation:ai-orb-ripple 1.9s ease-out infinite}' +
      // C — ba cụm khói trôi lệch pha
      '.ai-orb-c .ai-orb-halo{inset:-25%}' +
      '.ai-orb-c .ai-orb-halo i{position:absolute;width:64%;height:64%;border-radius:50%;filter:blur(15px);opacity:.8}' +
      '.ai-orb-c .ai-orb-halo i:nth-child(1){background:var(--gold,#C9A84C);top:2%;left:4%;animation:ai-orb-f1 4.1s ease-in-out infinite}' +
      '.ai-orb-c .ai-orb-halo i:nth-child(2){background:var(--gold-soft,#9A7B3A);bottom:0;right:2%;animation:ai-orb-f2 3.4s ease-in-out infinite}' +
      '.ai-orb-c .ai-orb-halo i:nth-child(3){background:#F2DFA8;top:24%;right:20%;animation:ai-orb-f3 4.8s ease-in-out infinite}' +
      // INVITE — LỜI MỜI, không phải lượt chờ. Cùng một cục sáng nhưng CHUYỂN
      // ĐỘNG khác hẳn: thở chậm 3,6s và KHÔNG xoay. Đây là chỗ tách vai, theo
      // đúng lối "token hai vai" của --navy/--gold: giữ chung HÌNH (để nó là một
      // dấu thương hiệu), tách NGHĨA bằng nhịp. Quầng xoay = "máy đang chạy,
      // đừng đụng"; quầng thở đứng yên = "đang đợi BẠN". Dùng chung một hình cho
      // hai nghĩa mà không tách nhịp thì người ta học nghĩa từ lần gặp đầu rồi
      // bấm vào cái orb đang chờ LLM.
      // Nở nhanh lên khi rê chuột/focus — phản ứng là thứ phân biệt "bấm được"
      // với "đồ trang trí"; trang gắn class .ai-orb-live lên phần tử bao ngoài.
      '.ai-orb-invite .ai-orb-halo{inset:-17%;animation:ai-orb-breathe 3.6s ease-in-out infinite}' +
      '.ai-orb-invite .ai-orb-halo i{display:block;width:100%;height:100%;border-radius:50%;opacity:.8;filter:blur(14px);background:radial-gradient(circle at 50% 50%,#F2DFA8 0%,var(--gold,#C9A84C) 45%,var(--gold-soft,#9A7B3A) 100%)}' +
      '.ai-orb-live:hover .ai-orb-invite .ai-orb-halo,.ai-orb-live:focus-visible .ai-orb-invite .ai-orb-halo{animation-duration:1.5s}' +
      '.ai-orb-live:hover .ai-orb-invite .ai-orb-halo i,.ai-orb-live:focus-visible .ai-orb-invite .ai-orb-halo i{opacity:1;filter:blur(11px)}' +
      // D — vệt sáng quét vành
      '.ai-orb-d .ai-orb-halo{inset:-8%;background:conic-gradient(from 0deg,transparent 0 62%,#F2DFA8 80%,var(--gold,#C9A84C) 90%,transparent 100%);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));animation:ai-orb-spin 1.5s linear infinite}' +
      '.ai-orb-d .ai-orb-soft{position:absolute;inset:-11%;border-radius:50%;box-shadow:0 0 22px 3px var(--gold,#C9A84C);opacity:.3}' +
      '@keyframes ai-orb-spin{to{transform:rotate(360deg)}}' +
      '@keyframes ai-orb-breathe{0%,100%{transform:scale(.93);opacity:.75}50%{transform:scale(1.07);opacity:1}}' +
      '@keyframes ai-orb-glow{0%,100%{opacity:.35}50%{opacity:.75}}' +
      '@keyframes ai-orb-ripple{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.5);opacity:0}}' +
      '@keyframes ai-orb-f1{0%,100%{transform:translate(0,0)}50%{transform:translate(26%,18%)}}' +
      '@keyframes ai-orb-f2{0%,100%{transform:translate(0,0)}50%{transform:translate(-22%,-20%)}}' +
      '@keyframes ai-orb-f3{0%,100%{transform:translate(0,0)}50%{transform:translate(-14%,24%)}}' +
      // Giảm chuyển động: đứng im nhưng GIỮ quầng sáng — vẫn phải đọc ra là
      // "đang chạy", chỉ bỏ phần nhấp nháy.
      '@media (prefers-reduced-motion:reduce){' +
      '.ai-orb-halo,.ai-orb-halo i,.ai-orb-halo::after,.ai-spin{animation:none!important}' +
      '.ai-orb-halo{opacity:.8}}';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ============================================================
  // orbHtml — markup của cục sáng, trả về CHUỖI để nhét vào innerHTML.
  //
  //   AiLoadingSteps.orbHtml({ size: 62, variant: 'a' })
  //
  // variant: 'a' khói xoay (mặc định) · 'b' nhịp thở · 'c' ba cụm khói ·
  //          'd' vệt quét vành · 'invite' LỜI MỜI (thở chậm, không xoay — dùng
  //          cho nút/avatar bấm được, KHÔNG dùng cho lượt chờ; xem khối CSS).
  // Đổi biến thể = đổi đúng một chữ.
  // Không nhận dữ liệu người dùng nên an toàn khi nối chuỗi; `size` ép về số.
  // ============================================================
  var ORB_MARK =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z"/></svg>';

  function orbHtml(opts) {
    // Tự nạp CSS: hàm này export ra ngoài nên có thể được gọi trên trang chưa
    // hề mount gì — thiếu bước này thì trả về markup trần, ra một ô vuông
    // không có quầng sáng mà KHÔNG có gì báo lỗi.
    ensureStyle();
    opts = opts || {};
    var size = Number(opts.size) || 62;
    var v = String(opts.variant || 'a').toLowerCase();
    if (['a', 'b', 'c', 'd', 'invite'].indexOf(v) < 0) v = 'a';
    var inner =
      v === 'a' || v === 'invite'
        ? '<i></i>'
        : v === 'c'
          ? '<i></i><i></i><i></i>'
          : '';
    return (
      '<div class="ai-orb ai-orb-' + v + '" style="width:' + size + 'px;height:' + size + 'px">' +
      (v === 'd' ? '<div class="ai-orb-soft"></div>' : '') +
      '<div class="ai-orb-halo">' + inner + '</div>' +
      '<div class="ai-orb-core">' + ORB_MARK + '</div>' +
      '</div>'
    );
  }

  // Chỉ dựng khung (head + hộp bước + dòng đếm giây) ở lượt ĐẦU, các lượt sau
  // chỉ thay ruột hộp bước. Nếu gán lại cả el.innerHTML mỗi lần đổi bước thì
  // orb ở `head` bị dựng lại và animation giật về đầu ngay giữa chừng.
  // ============================================================
  // pacer — ETA TỰ HIỆU CHỈNH cho tool chạy NHIỀU PHẦN tuần tự
  // (luận giải 24 phần, xem tuổi 9 phần).
  //
  // Vì sao không dùng ETA tĩnh: một con số chép cứng nói dối vào đúng ngày đổi
  // model — repo này đã dính (gpt-image-1 → gpt-image-2 làm thời gian vẽ gấp
  // đôi, mà con số trong tài liệu vẫn đứng yên). Đo ngay TRONG phiên thì miễn
  // nhiễm với đổi model, đổi máy, và tải server lúc đó.
  //
  //   var pace = AiLoadingSteps.pacer();
  //   pace.begin();  ... pace.end();          // bọc quanh MỖI phần
  //   pace.perPartSec()        → số giây/phần, null khi chưa đủ mẫu
  //   pace.remainText(conLai)  → 'còn khoảng 3 phút' | '' khi chưa đủ mẫu
  //
  // ⚠️ MIN_SAMPLES = 2 vì PHẦN ĐẦU luôn chậm bất thường: nó nạp 10 tài liệu
  // RAG trong khi các phần sau chỉ 7 (`matchCount: p===1?10:7`). Lấy một mẫu
  // duy nhất đó nhân lên 23 phần là hứa sai ngay từ dòng đầu.
  // ============================================================
  function pacer(opts) {
    opts = opts || {};
    var minSamples = opts.minSamples || 2;
    var samples = [];
    var t0 = 0;

    function perPartSec() {
      if (samples.length < minSamples) return null;
      // TRUNG VỊ chứ không phải trung bình: một lượt chậm bất thường (mạng
      // chớp, model nghẽn) không được kéo lệch cả dự đoán.
      var s = samples.slice().sort(function (a, b) { return a - b; });
      var m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }

    return {
      begin: function () { t0 = Date.now(); },
      // CỐ Ý chỉ gọi ở nhánh THÀNH CÔNG: một phần chết giữa chừng có thời lượng
      // thật nhưng không đại diện cho phần chạy được.
      end: function () {
        if (!t0) return;
        samples.push((Date.now() - t0) / 1000);
        t0 = 0;
      },
      reset: function () { samples = []; t0 = 0; },
      perPartSec: perPartSec,
      // Cách viết thời lượng MỘT phần — gom ở đây để hai trang không tự chế hai
      // kiểu, và để không bao giờ in ra "khoảng 0 giây" vì làm tròn.
      perPartText: function () {
        var per = perPartSec();
        return per ? 'khoảng ' + Math.max(1, Math.round(per)) + ' giây' : '';
      },
      remainText: function (remaining) {
        var per = perPartSec();
        if (!per || !(remaining > 0)) return '';
        var s = per * remaining;
        if (s < 45) return 'còn khoảng ' + (Math.round(s / 5) * 5 || 5) + ' giây';
        if (s < 90) return 'còn khoảng 1 phút';
        return 'còn khoảng ' + Math.round(s / 60) + ' phút';
      },
    };
  }

  function render(el, rows, head) {
    var box = el.querySelector('.ai-steps-box');
    if (!box) {
      el.innerHTML =
        (head || '') +
        '<div class="ai-steps-box"></div>' +
        '<div class="ai-elapsed" id="' + el.id + '-elapsed"></div>';
      box = el.querySelector('.ai-steps-box');
    }
    box.innerHTML = rows
      .map(function (r) {
        var icon =
          r.state === 'done'
            ? '<span class="ai-step-ic done">✓</span>'
            : r.state === 'active'
              ? '<span class="ai-step-ic active"><span class="ai-spin"></span></span>'
              : '<span class="ai-step-ic pending"></span>';
        return '<div class="ai-step ' + r.state + '">' + icon + '<span>' + r.label + '</span></div>';
      })
      .join('');
  }

  // opts (tuỳ chọn): { orb: false, variant: 'a', orbSize: 54 }
  // Orb MẶC ĐỊNH BẬT: mọi nơi gọi `mount` đều là một lượt chờ LLM/sinh ảnh
  // chạy một cục ≥10 giây — đúng ngưỡng của luật ở đầu file. Trang nào muốn
  // lùi về spinner cũ thì truyền { orb: false }.
  function mount(containerOrId, steps, opts) {
    var el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!el) return { start: function () {}, finish: function () {}, stop: function () {} };
    ensureStyle();
    opts = opts || {};
    var head = opts.orb !== false
      ? '<div style="display:flex;justify-content:center;margin-bottom:14px">' +
        orbHtml({ size: Number(opts.orbSize) || 54, variant: opts.variant || 'a' }) +
        '</div>'
      : '';

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
      render(el, rows, head);

      var cum = 0;
      for (var i = 1; i < steps.length; i++) {
        cum += steps[i - 1].ms || 1500;
        (function (idx, delay) {
          timers.push(
            setTimeout(function () {
              if (rows[idx - 1]) rows[idx - 1].state = 'done';
              if (rows[idx]) rows[idx].state = 'active';
              render(el, rows, head);
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
      render(el, rows, head);
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
  //
  // opts thêm: { orb: false } quay lại spinner nhỏ như cũ ·
  //            { variant: 'a'|'b'|'c'|'d' } đổi kiểu quầng sáng.
  // ============================================================
  function mountWait(containerOrId, opts) {
    var el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    var noop = { start: function () {}, stop: function () {}, note: function () {} };
    if (!el) return noop;
    ensureStyle();
    opts = opts || {};
    var label = opts.label || 'Đang vẽ tranh…';
    // `expectSec: 0` = CHƯA ĐO ĐƯỢC thời lượng ⇒ không hứa gì, và bỏ luôn thanh
    // tiến trình. Thanh chạy theo một con số bịa còn tệ hơn không có thanh:
    // nó là một lời hứa, mà hứa hụt thì lần sau không ai tin nữa.
    var hasEta = opts.expectSec !== 0;
    var expect = opts.expectSec || 52;
    var expectText = opts.expectText || 'khoảng 45–60 giây';
    var CALM_AFTER = 45; // giây — mốc trấn an khi không có ETA
    var useOrb = opts.orb !== false;
    var variant = opts.variant || 'a';
    var timer = null;
    var startedAt = 0;
    var override = '';
    var ref = null;

    // Dựng khung ĐÚNG MỘT LẦN. Bản trước gán lại el.innerHTML mỗi giây, và điều
    // đó phá hai thứ: (1) mỗi tick sinh element MỚI nên mọi @keyframes của orb
    // bị reset về đầu — quầng khói giật một nhịp mỗi giây thay vì xoay liền
    // mạch; (2) `transition:width .9s` của thanh tiến trình chưa bao giờ chạy,
    // vì element mới không có giá trị width cũ để nội suy, nên thanh nhảy giật
    // từng nấc. Nay chỉ đổi textContent và width.
    function build() {
      el.innerHTML =
        '<div class="ai-wait">' +
        (useOrb ? orbHtml({ size: 62, variant: variant }) : '') +
        '<div class="ai-wait-top">' +
        (useOrb ? '' : '<span class="ai-spin"></span>') +
        '<span class="ai-wait-label"></span></div>' +
        (hasEta ? '<div class="ai-wait-bar"><i></i></div>' : '') +
        '<div class="ai-wait-note"></div>' +
        '</div>';
      ref = {
        label: el.querySelector('.ai-wait-label'),
        bar: el.querySelector('.ai-wait-bar i'),
        note: el.querySelector('.ai-wait-note'),
      };
      // textContent chứ không nhét thẳng vào chuỗi HTML — nhãn/lời nhắn có thể
      // mang tên nhân vật do người dùng nhập.
      ref.label.textContent = label;
    }

    function paint() {
      // Trang đã thay nội dung khung từ bên ngoài (ghi kết quả, ghi lời báo
      // lỗi) ⇒ TỰ DỪNG, tuyệt đối KHÔNG dựng lại. Dựng lại là vẽ đè lên đúng
      // thứ trang vừa ghi ra — quên một lượt `stop()` sẽ thành xoá mất kết quả
      // của người dùng thay vì chỉ để lại một cái đồng hồ chạy ngầm vô hại.
      if (!ref || !el.contains(ref.note)) {
        if (timer) { clearInterval(timer); timer = null; }
        return;
      }
      var s = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      if (hasEta) {
        // Trần 96%: thanh chạy đầy trong khi việc CHƯA xong còn tệ hơn không có
        // thanh nào — người dùng tin là xong rồi và bỏ đi.
        var pct = Math.min(96, Math.round((s / expect) * 100));
        if (ref.bar) ref.bar.style.width = pct + '%';
      }
      ref.note.textContent = override
        ? override
        : hasEta
          ? s <= expect
            ? 'Thường mất ' + expectText + ' · đã chờ ' + s + ' giây'
            // Quá hẹn thì ĐỔI LỜI chứ không đứng im: nói rõ vẫn đang chạy, để
            // người ta không đóng trang hay bấm lại (bấm lại = tốn thêm tiền).
            : 'Lâu hơn thường lệ — vẫn đang vẽ, đừng đóng trang (đã chờ ' + s + ' giây)'
          // Không có ETA: chỉ đếm giây, và trấn an khi đã lâu — không hứa
          // lúc nào xong vì chưa đo được.
          : s < CALM_AFTER
            ? 'Đã chờ ' + s + ' giây'
            : 'Vẫn đang chạy, đừng đóng trang (đã chờ ' + s + ' giây)';
    }

    return {
      start: function () {
        if (timer) clearInterval(timer);
        startedAt = Date.now();
        override = '';
        build();
        paint();
        timer = setInterval(paint, 1000);
      },
      note: function (t) { override = t || ''; if (timer) paint(); },
      stop: function () { if (timer) { clearInterval(timer); timer = null; } },
    };
  }

  // ============================================================
  // scrollToResult — cuộn khung workspace tới khung kết quả/đang chờ NGAY sau
  // khi bấm chạy. TÁCH KHỎI mount()/mountWait(): nhiều trang phải hiện panel
  // (đổi display:none→block) TRƯỚC rồi mới biết cuộn tới đâu — nhét cuộn vào
  // bên trong bộ đếm bước thì hàm đó phải biết luôn cấu trúc panel của từng
  // trang, mỗi trang một kiểu khác nhau.
  //
  // Lỗi đang vá: bấm "chạy"/"luận giải" mà không cuộn ⇒ nếu form dài hơn màn
  // hình (nhất là mobile), người dùng đang đứng ở nút bấm cuối form, panel kết
  // quả/orb hiện ra NGOÀI khung nhìn, màn hình trông như đứng im suốt vài giây
  // đầu — không biết có đang chạy hay không.
  //
  //   AiLoadingSteps.scrollToResult('resPanel')
  //   AiLoadingSteps.scrollToResult(el, { delay: 30 })
  //
  // Gọi ngay sau dòng hiện panel, KHÔNG đợi kết quả xong — mục đích là cho
  // thấy "đã có gì đó đang chạy", không phải cuộn tới kết quả CUỐI cùng.
  // ============================================================
  function scrollToResult(containerOrId, opts) {
    var el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!el) return;
    opts = opts || {};
    var run = function () {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ }
    };
    // Mặc định cuộn NGAY — trình duyệt buộc phải tính lại layout khi đọc vị
    // trí để cuộn nên panel vừa display:block trong CÙNG tick vẫn đo đúng.
    // `delay` chỉ cần khi trang còn việc khác (vd render nội dung) phải xong
    // trước đã.
    if (opts.delay) setTimeout(run, opts.delay); else run();
  }

  window.AiLoadingSteps = { mount: mount, mountWait: mountWait, orbHtml: orbHtml, pacer: pacer, scrollToResult: scrollToResult };
})();
