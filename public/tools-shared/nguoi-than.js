/* tools-shared/nguoi-than.js — CTA "Xem lá số cho người thân" cuối bản luận
   window.NguoiThan = { mount }

   ── LUẬT CỦA KHỐI NÀY ───────────────────────────────────────
   1. Thuần trình bày. Không fetch, không biết gì về TuviForm/UserCharts/
      paywall — trang gọi truyền `onPick(label)`, tự quyết làm gì (mở form
      trống, gắn nhãn, cuộn tới). Giữ module này dùng lại được ở tool khác
      mà không kéo theo giả định về cấu trúc form của từng trang.
   2. BEST-EFFORT TUYỆT ĐỐI — như cung-ngay-sinh.js. Khối này đứng CUỐI bản
      luận người ta vừa trả tiền; hỏng gì cũng lặng lẽ không dựng, không ném
      lỗi ra ngoài.
   3. Không trừ Lượng, không gọi mạng ở bước mount này — chỉ tới khi người
      dùng bấm chip và trang tự lo phần luận giải người thứ hai (đi qua đúng
      paywall của chính trang đó). */
(function (root) {
  var CHIPS = ['Vợ/Chồng', 'Bố', 'Mẹ', 'Con', 'Người khác'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var STYLE_ID = 'nt-style';
  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.nt{margin:18px 0;padding:16px 18px;border:1px solid var(--line-2,#e5e0d5);border-radius:12px;background:var(--paper,#faf8f3)}' +
      '.nt h3{font-family:var(--serif,serif);font-size:15px;font-weight:700;margin:0 0 4px}' +
      '.nt p{font-size:12.5px;color:var(--text-lt,#6b6459);margin:0 0 11px}' +
      '.nt-chips{display:flex;gap:8px;flex-wrap:wrap}' +
      '.nt-chip{border:1px solid var(--line-2,#e5e0d5);background:var(--white,#fff);border-radius:999px;' +
      'padding:7px 15px;font-size:13px;font-family:inherit;color:var(--text,#2a2118);cursor:pointer}' +
      '.nt-chip:hover{border-color:var(--gold-soft,#b8935a);color:var(--gold-soft,#b8935a)}';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function mount(target, opts) {
    try {
      var el = typeof target === 'string' ? document.getElementById(target) : target;
      if (!el || !opts || typeof opts.onPick !== 'function') return;
      injectCss();
      el.innerHTML =
        '<section class="nt">' +
        '<h3><span class="ic" data-icon="users"></span> Xem lá số cho người thân</h3>' +
        '<p>Đọc xong bản này rồi thì xem tiếp cho vợ/chồng, bố mẹ hay con — mỗi người một bản riêng.</p>' +
        '<div class="nt-chips">' +
        CHIPS.map(function (c) {
          return '<button type="button" class="nt-chip" data-nt="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('') +
        '</div></section>';
      if (root.mountIcons) root.mountIcons(el);
      el.querySelector('.nt-chips').addEventListener('click', function (e) {
        var btn = e.target.closest('.nt-chip');
        if (!btn) return;
        var label = btn.getAttribute('data-nt');
        if (label === 'Người khác') {
          label = root.prompt ? root.prompt('Người này là ai (vd: Sếp, Bạn thân):', '') : '';
          if (!label) return;
        }
        try {
          if (root.Track && root.Track.event) {
            root.Track.event('cta_click', { tool_id: opts.toolId || '', meta: { from: 'nguoithan', label: label } });
          }
        } catch (e2) { /* ignore */ }
        opts.onPick(label);
      });
    } catch (e) {
      // Best-effort: khối phụ hỏng không được kéo hỏng bản luận phía trên.
    }
  }

  root.NguoiThan = { mount: mount };
})(window);
