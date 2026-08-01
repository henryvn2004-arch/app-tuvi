/**
 * tool-prices.js — giá Lượng của công cụ, đọc từ MỘT nguồn duy nhất.
 *
 * Nguồn THẬT là bảng Supabase `tool_pricing` (admin chỉnh thẳng trong trang
 * Admin, không cần deploy). Mọi chỗ HIỂN THỊ giá phải đọc qua đây thay vì chép
 * số vào markup: số chép tay trôi khỏi DB lúc nào không ai biết, và người dùng
 * đọc một giá rồi bị trừ một giá khác.
 *
 * `/cong-cu` và `tuvi-paywall.js` cũng đọc chính bảng này. ⚠️ Nợ DRY đã biết:
 * hiện mỗi chỗ tự fetch một lượt, chưa gộp về đây.
 */
window.ToolPrices = (function () {
  var SB_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
  var SB_ANON =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

  var _inflight = null;

  /**
   * Trả Promise<{ [tool_id]: credits } | null>. `null` = đọc không được —
   * người gọi PHẢI tự lo bản dự phòng, đừng coi như "mọi thứ miễn phí".
   * Chỉ fetch một lượt cho cả trang.
   */
  function load() {
    if (_inflight) return _inflight;
    _inflight = fetch(SB_URL + '/rest/v1/tool_pricing?enabled=eq.true&select=tool_id,credits', {
      headers: { apikey: SB_ANON },
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (rows) {
        if (!Array.isArray(rows)) return null;
        var m = {};
        rows.forEach(function (x) {
          m[x.tool_id] = Number(x.credits);
        });
        return m;
      })
      .catch(function () {
        return null;
      });
    return _inflight;
  }

  return { load: load };
})();
