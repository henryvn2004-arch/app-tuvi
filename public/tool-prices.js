/**
 * tool-prices.js — GIÁ LƯỢNG: nguồn DUY NHẤT cho toàn bộ phía client.
 *
 * Nguồn thật là hai bảng Supabase, sửa trong trang Admin, KHÔNG cần deploy:
 *   • `tool_pricing`     — giá từng công cụ
 *   • `credit_packages`  — các gói nạp
 *
 * ⚠️ LUẬT: KHÔNG chép số giá vào bất kỳ file nào khác. Trước đây mỗi trang giữ
 * một bản dự phòng riêng "cho chắc", và chính mấy bản đó trôi khỏi DB rồi nói
 * dối người dùng — `/app` quảng cáo Luận Giải 150 trong khi trừ 25, trang nạp
 * hứa "64 lá số" trong khi mua được 16, nút Diện Tướng ghi 5 mà trừ 8. Một con
 * số CŨ nguy hiểm hơn hẳn một ô còn đang tải: ô đang tải thì người ta chờ, còn
 * số cũ thì người ta tin.
 *
 * Vì vậy khi đọc hụt, module này trả `null` — KHÔNG đoán. Nơi gọi phải hiện
 * trạng thái "chưa biết giá" thay vì bịa một con số.
 *
 * Cache sessionStorage: lượt tải trang ĐẦU của phiên mới phải chờ mạng, các
 * lượt sau lấy ngay — nên "trang trống một nhịp" chỉ xảy ra một lần chứ không
 * phải mỗi lần chuyển trang.
 */
window.ToolPrices = (function () {
  var SB_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
  var SB_ANON =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

  var CACHE_KEY = 'tvmb_prices_v1';
  var TTL_MS = 120000; // 2 phút — đủ để đi hết một phiên duyệt, đủ ngắn để admin đổi giá thấy ngay

  var _inflight = null;
  var _data = null; // { tools: {id: credits}, packages: [...] }

  function _readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o.at !== 'number' || Date.now() - o.at > TTL_MS) return null;
      return o.data || null;
    } catch (e) {
      return null;
    }
  }

  function _writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data }));
    } catch (e) {
      /* hết quota / chế độ riêng tư — không sao, chỉ mất phần nhanh */
    }
  }

  function _get(path) {
    return fetch(SB_URL + '/rest/v1/' + path, { headers: { apikey: SB_ANON } }).then(function (r) {
      return r.ok ? r.json() : null;
    });
  }

  /**
   * Trả Promise<{tools, packages} | null>. `null` = KHÔNG đọc được; nơi gọi
   * phải xử lý như "chưa biết giá", tuyệt đối không thay bằng số phỏng đoán.
   */
  function load() {
    if (_data) return Promise.resolve(_data);
    if (_inflight) return _inflight;

    var cached = _readCache();
    if (cached) {
      _data = cached;
      return Promise.resolve(_data);
    }

    _inflight = Promise.all([
      // Lấy TRỌN dòng: trang Công Cụ và bảng chi phí ở trang nạp cần cả nhãn /
      // icon / phân loại. Một lượt fetch cho cả ba nơi thay vì ba lượt riêng.
      _get('tool_pricing?enabled=eq.true&select=tool_id,label,credits,icon,category,sort_order,is_free,description&order=sort_order.asc'),
      _get('credit_packages?enabled=eq.true&select=package_id,credits,amount_vnd,label&order=sort_order.asc'),
    ])
      .then(function (res) {
        var toolRows = res[0];
        var pkgRows = res[1];
        // Giá công cụ là phần bắt buộc; thiếu nó thì coi như đọc hụt cả cụm.
        if (!Array.isArray(toolRows)) return null;
        var tools = {};
        toolRows.forEach(function (x) {
          if (x && typeof x.tool_id === 'string') tools[x.tool_id] = Number(x.credits);
        });
        var packages = Array.isArray(pkgRows)
          ? pkgRows
              .map(function (p) {
                return {
                  package_id: String(p.package_id),
                  credits: Number(p.credits),
                  amount_vnd: Number(p.amount_vnd),
                  label: p.label || '',
                };
              })
              .filter(function (p) {
                return p.credits > 0 && p.amount_vnd > 0;
              })
          : [];
        _data = { tools: tools, rows: toolRows, packages: packages };
        _writeCache(_data);
        return _data;
      })
      .catch(function () {
        return null;
      })
      .then(function (d) {
        _inflight = null;
        return d;
      });
    return _inflight;
  }

  /** Giá một công cụ, hoặc null nếu chưa nạp / không có. `0` là MIỄN PHÍ hợp lệ. */
  function get(toolId) {
    if (!_data || !_data.tools) return null;
    var v = _data.tools[toolId];
    return typeof v === 'number' && isFinite(v) ? v : null;
  }

  /** Trọn dòng `tool_pricing` (nhãn/icon/phân loại…). Rỗng nếu chưa đọc được. */
  function rows() {
    return (_data && _data.rows) || [];
  }

  /** Danh sách gói nạp (mảng rỗng nếu chưa nạp được). */
  function packages() {
    return (_data && _data.packages) || [];
  }

  /**
   * Điền mọi <span data-tvp-price="<tool_id>"> trong `root`.
   * Chưa biết giá → để nguyên chữ đang có (mặc định trong markup là `…`), KHÔNG
   * điền số phỏng đoán.
   */
  function fillSlots(root) {
    var els = (root || document).querySelectorAll('[data-tvp-price]');
    if (!els.length) return Promise.resolve();
    return load().then(function () {
      els.forEach(function (el) {
        var v = get(el.getAttribute('data-tvp-price'));
        if (v != null) el.textContent = v;
      });
    });
  }

  // Tự điền khi DOM sẵn sàng — trang chỉ cần đặt <span data-tvp-price="id">…</span>
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      fillSlots();
    });
  } else {
    fillSlots();
  }

  return { load: load, get: get, rows: rows, packages: packages, fillSlots: fillSlots };
})();
