/**
 * nam-luan-select.js — dropdown "Năm luận" dùng chung
 *
 * NGUỒN DUY NHẤT cho khoảng năm + mặc định của ô "Năm luận" — trước đây mỗi
 * trang (`app.html`, `app-bat-tu.html`, `app-luan-giai.html`,
 * `app-chu-trinh-cuoc-doi.html`) tự chép một `<input type="number"
 * value="2026">`, mặc định là số GÕ CHẾT chứ không phải năm hiện tại.
 */
window.NamLuanSelect = (() => {
  function mount(id, { spanBack = 5, spanFwd = 10 } = {}) {
    const el = document.getElementById(id);
    if (!el) return;
    const now = new Date().getFullYear();
    let html = '';
    for (let y = now - spanBack; y <= now + spanFwd; y++) {
      html += `<option value="${y}"${y === now ? ' selected' : ''}>${y}</option>`;
    }
    el.innerHTML = html;
  }
  return { mount };
})();
