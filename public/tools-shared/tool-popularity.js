/* tools-shared/tool-popularity.js — badge "N người đã xem tháng này" cạnh
   giá/nút mua. Nguồn DUY NHẤT: GET /api/payment?action=tool-popularity —
   số THẬT (event 'tool_open', đã lọc bot, distinct user/anon), xem
   migration-tool-viewcount.sql + handleToolPopularity (app/api/payment/route.ts).

   `show:false` (dưới ngưỡng hiển thị, hoặc lỗi mạng) → ĐỂ NGUYÊN slot ẩn,
   không hiện gì — im lặng tốt hơn hiện số nhỏ trông thảm hay bịa số.

   Gắn vào 1 phần tử có sẵn trong trang: <span data-tvp-viewcount="<tool_id>" hidden></span>
   Gọi 1 lần API cho mỗi tool_id khác nhau trên trang (thường chỉ 1), dù có
   nhiều slot cùng tool_id (giống cơ chế nhiều slot data-tvp-price cùng tên). */
(function () {
  async function fillViewcounts() {
    var els = document.querySelectorAll('[data-tvp-viewcount]');
    if (!els.length) return;
    var byTool = {};
    els.forEach(function (el) {
      var t = el.getAttribute('data-tvp-viewcount');
      if (!t) return;
      (byTool[t] = byTool[t] || []).push(el);
    });
    var tools = Object.keys(byTool);
    for (var i = 0; i < tools.length; i++) {
      var tool = tools[i];
      try {
        var res = await fetch('/api/payment?action=tool-popularity&tool=' + encodeURIComponent(tool), {
          cache: 'no-store',
        });
        var data = await res.json();
        if (!data || !data.show || !data.count) continue;
        var text = ' · ' + data.count.toLocaleString('vi-VN') + ' người đã xem tháng này';
        byTool[tool].forEach(function (el) {
          el.textContent = text;
          el.hidden = false;
        });
      } catch (e) {
        /* im lặng — badge không quan trọng bằng giá/nút mua, đừng làm ồn console */
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillViewcounts);
  else fillViewcounts();
})();
