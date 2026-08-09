/**
 * tool-prices.js — DANH MỤC CÔNG CỤ + GIÁ LƯỢNG: nguồn DUY NHẤT cho phía client.
 *
 * Nguồn thật là ba bảng Supabase, sửa trong trang Admin, KHÔNG cần deploy:
 *   • `tool_pricing`     — giá, nhãn, icon, nhóm (`need_tags`), đường dẫn trang
 *   • `credit_packages`  — các gói nạp
 *   • `tool_groups`      — ĐỊNH NGHĨA nhóm: tên, phụ đề, icon, thứ tự
 *
 * ⚠️ LUẬT THỨ HAI (thêm ở bản master grouping): KHÔNG chép DANH SÁCH NHÓM hay
 * ĐƯỜNG DẪN công cụ vào bất kỳ file nào khác. Trước đây cách xếp công cụ nằm ở
 * BA mảng chép tay và chúng không khớp nhau — `/cong-cu` xếp theo nhu cầu với
 * 58 công cụ, còn `/app` (dashboard + sidebar) xếp theo bộ môn với 34 công cụ.
 * Cùng một sản phẩm nói hai kiểu với cùng một người, và thêm công cụ mới là
 * phải sửa tay ba chỗ; quên một chỗ thì công cụ đó tàng hình mà không có gì báo
 * (đã xảy ra với `Tử Vi Công Sở`).
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

  // ⚠️ BUMP KHOÁ khi đổi tập cột lấy về — bản cache cũ nằm trong sessionStorage
  // của người đang mở tab, thiếu cột mới mà vẫn còn hạn ⇒ trang dựng ra bằng dữ
  // liệu cụt trong tối đa 2 phút mà không có gì báo. (v2: thêm need_tags/question
  // · v3: thêm app_path/page_path + bảng tool_groups)
  var CACHE_KEY = 'tvmb_prices_v3';
  var TTL_MS = 120000; // 2 phút — đủ để đi hết một phiên duyệt, đủ ngắn để admin đổi giá thấy ngay

  // Bản đọc được LẦN GẦN NHẤT, sống qua phiên (localStorage, khác cache 2 phút
  // ở trên). CHỈ dùng cho điều hướng: sidebar của Luận Đường mà trống thì người
  // dùng mất đường đi khắp app, tệ hơn hẳn một danh sách hơi cũ. Giá thì KHÔNG
  // bao giờ lấy từ đây — luật "đọc hụt thì trả null, không đoán" giữ nguyên.
  var NAV_KEY = 'tvmb_nav_v3';

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
      // Lấy TRỌN dòng: trang Công Cụ, dashboard và sidebar đều cần nhãn / icon /
      // nhóm / đường dẫn. Một lượt fetch cho mọi nơi thay vì mỗi nơi một lượt.
      _get(
        'tool_pricing?enabled=eq.true&select=tool_id,label,credits,icon,category,sort_order,is_free,description,need_tags,question,app_path,page_path&order=sort_order.asc'
      ),
      _get('credit_packages?enabled=eq.true&select=package_id,credits,amount_vnd,label&order=sort_order.asc'),
      _get('tool_groups?enabled=eq.true&select=key,title,subtitle,icon,sort_order,default_categories&order=sort_order.asc'),
    ])
      .then(function (res) {
        var toolRows = res[0];
        var pkgRows = res[1];
        var groupRows = Array.isArray(res[2]) ? res[2] : [];
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
        _data = { tools: tools, rows: toolRows, packages: packages, groups: groupRows };
        _writeCache(_data);
        _writeNav(_data);
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

  // ── Nhóm công cụ ──────────────────────────────────────────────────────────
  /** Định nghĩa nhóm, đã sắp theo `sort_order`. Rỗng nếu chưa đọc được. */
  function groups() {
    return (_data && _data.groups) || [];
  }

  /**
   * Nhóm của một dòng công cụ, theo thứ tự ưu tiên:
   *   1. `need_tags` khai rõ (lọc bỏ khoá không có trong `tool_groups`)
   *   2. nhóm mặc định suy từ `category`
   *   3. `[]` — nơi gọi tự xếp vào "Khác"
   *
   * Bậc 2 chính là phần làm cho công cụ MỚI tự có chỗ đứng: người thêm công cụ
   * trong Admin vẫn phải khai `category`, nên chỉ cần không khai gì thêm là nó
   * đã nằm đúng một nhóm hợp lý thay vì rơi ra ngoài. Máy KHÔNG đoán nhóm từ
   * tên hay mô tả — đoán bằng từ khoá thì sai âm thầm, loại lỗi tệ nhất.
   */
  // `list` — bộ nhóm để đối chiếu. Mặc định lấy bộ đã nạp; nơi gọi PHẢI truyền
  // vào khi đang dựng từ `navFallback()`, vì lúc đó `load()` trả null nên
  // `groups()` rỗng ⇒ không khoá nào khớp ⇒ mọi công cụ rơi hết vào "Khác".
  // (Đúng lỗi bản đầu đã dính, test bắt được.)
  function groupsOf(row, list) {
    if (!row) return [];
    var gs = list && list.length ? list : groups();
    var known = {};
    gs.forEach(function (g) {
      known[g.key] = true;
    });
    var explicit = String(row.need_tags || '')
      .split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s && known[s];
      });
    if (explicit.length) return explicit;

    var cat = String(row.category || '').trim();
    if (!cat) return [];
    var hit = gs.filter(function (g) {
      return String(g.default_categories || '')
        .split(',')
        .map(function (s) {
          return s.trim();
        })
        .indexOf(cat) >= 0;
    });
    return hit.length ? [hit[0].key] : [];
  }

  /** Đường dẫn trong Luận Đường, hoặc '' nếu công cụ chưa có trang shell. */
  function appPath(row) {
    return (row && row.app_path) || '';
  }

  /** Đường dẫn trang độc lập; chưa có thì rơi về trang shell. */
  function pagePath(row) {
    return (row && (row.page_path || row.app_path)) || '';
  }

  // ── Lối lùi cho ĐIỀU HƯỚNG (xem chú thích ở NAV_KEY) ──────────────────────
  function _writeNav(d) {
    try {
      localStorage.setItem(
        NAV_KEY,
        JSON.stringify({
          at: Date.now(),
          groups: d.groups || [],
          // Chỉ giữ đúng phần cần để dựng menu — KHÔNG giữ `credits`, để không
          // ai vô tình lấy giá từ bản có thể đã cũ.
          rows: (d.rows || []).map(function (r) {
            return {
              tool_id: r.tool_id,
              label: r.label,
              icon: r.icon,
              category: r.category,
              need_tags: r.need_tags,
              description: r.description,
              question: r.question,
              app_path: r.app_path,
              page_path: r.page_path,
            };
          }),
        })
      );
    } catch (e) {
      /* hết quota / chế độ riêng tư — mất lối lùi thôi, không sao */
    }
  }

  /**
   * Bản danh mục đọc được LẦN GẦN NHẤT — CHỈ dùng để dựng điều hướng khi
   * `load()` trả null. Không kèm giá. Trả `null` nếu chưa từng đọc được lần nào
   * (người hoàn toàn mới + mạng hỏng) — lúc đó nơi gọi phải chấp nhận menu rỗng
   * chứ đừng bịa ra một danh sách.
   */
  function navFallback() {
    try {
      var o = JSON.parse(localStorage.getItem(NAV_KEY) || 'null');
      return o && Array.isArray(o.rows) && o.rows.length ? o : null;
    } catch (e) {
      return null;
    }
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

  return {
    load: load,
    get: get,
    rows: rows,
    packages: packages,
    fillSlots: fillSlots,
    groups: groups,
    groupsOf: groupsOf,
    appPath: appPath,
    pagePath: pagePath,
    navFallback: navFallback,
  };
})();
