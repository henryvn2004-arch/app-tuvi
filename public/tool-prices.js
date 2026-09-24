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
  // · v3: thêm app_path/page_path + bảng tool_groups · v4: thêm parts/credits_per_part
  // — giá theo phần cho tool chia nhỏ như laso · v5: thêm home_rank — thứ tự
  // lưới springboard /app, xem public/app-home.html · v6: thêm sale_credits/
  // sale_starts_at/sale_ends_at — khuyến mãi có thời hạn, xem ghi chú ở `get()`
  // · v7: thêm `_data.banners` (bảng `home_banners`, hellobot-ui-redesign
  // Đợt 2) — banner trượt ngang trên Trang chủ, xem `banners()`.
  // · v8: thêm `_data.masters` (bảng `master_profiles`, Đợt 3) — 15 thầy +
  // `tool_ids` (công cụ thầy đó đứng tên), xem `masters()`/`masterForTool()`.)
  var CACHE_KEY = 'tvmb_prices_v8';
  var TTL_MS = 120000; // 2 phút — đủ để đi hết một phiên duyệt, đủ ngắn để admin đổi giá thấy ngay

  // Bản đọc được LẦN GẦN NHẤT, sống qua phiên (localStorage, khác cache 2 phút
  // ở trên). CHỈ dùng cho điều hướng: sidebar của Luận Đường mà trống thì người
  // dùng mất đường đi khắp app, tệ hơn hẳn một danh sách hơi cũ. Giá thì KHÔNG
  // bao giờ lấy từ đây — luật "đọc hụt thì trả null, không đoán" giữ nguyên.
  // v4: thêm home_rank — springboard cần nó để lưới KHÔNG rơi về sort_order
  // (thứ tự trang giá) trong lúc chờ mạng.
  // v5: thêm `banners` (bảng `home_banners`) — CÙNG lý do: banner Trang chủ
  // không lấy từ đây được thì phải chờ mạng, tức nhấp nháy có/không mỗi lần
  // đổi trang trong cùng phiên. Không giữ `sort_order`/id đã lọc hiệu lực sẵn
  // ở đây — `banners()` (hàm public) tự lọc lại `starts_at/ends_at` theo giờ
  // ĐANG GỌI dù nguồn là bản fallback này hay bản mạng, không phải giờ lúc ghi.
  var NAV_KEY = 'tvmb_nav_v5';

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
   * Khuyến mãi của một dòng `tool_pricing` có đang chạy NGAY LÚC NÀY không —
   * cùng luật với `effectivePrice()` phía server (lib/billing/pricing.ts):
   * `sale_credits` phải rẻ hơn `credits`, và trong khung `sale_starts_at`..
   * `sale_ends_at` (thiếu mốc nào thì mốc đó coi như không giới hạn). CHỈ dùng
   * để HIỂN THỊ — số Lượng bị trừ thật do server tự đọc lại, không tin số này.
   */
  function _saleActive(row) {
    if (!row) return false;
    // `row.sale_credits == null` PHẢI kiểm TRƯỚC khi ép kiểu — `Number(null)`
    // là `0`, và `0` lọt qua `isFinite` (đã cắn thật: 2026-09-21, mọi tool có
    // `sale_credits` bỏ trống bị hiện giá 0đ vì bị coi là đang khuyến mãi về
    // giá `Number(null)`). `lib/billing/pricing.ts::effectivePrice()` phía
    // server đã kiểm `== null` trước — bản client này lệch, nay khớp lại.
    if (row.sale_credits == null) return false;
    var sale = Number(row.sale_credits);
    var full = Number(row.credits);
    if (!isFinite(sale) || !isFinite(full) || sale >= full) return false;
    var now = Date.now();
    if (row.sale_starts_at && new Date(row.sale_starts_at).getTime() > now) return false;
    if (row.sale_ends_at && new Date(row.sale_ends_at).getTime() <= now) return false;
    return true;
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
        'tool_pricing?enabled=eq.true&select=tool_id,label,credits,icon,category,sort_order,is_free,description,need_tags,question,app_path,page_path,parts,credits_per_part,home_rank,sale_credits,sale_starts_at,sale_ends_at&order=sort_order.asc'
      ),
      _get('credit_packages?enabled=eq.true&select=package_id,credits,amount_vnd,label&order=sort_order.asc'),
      _get('tool_groups?enabled=eq.true&select=key,title,subtitle,icon,sort_order,default_categories&order=sort_order.asc'),
      // hellobot-ui-redesign Đợt 2: banner trượt ngang Trang chủ. `enabled`
      // lọc ở SERVER; cửa sổ `starts_at`/`ends_at` lọc ở CLIENT trong
      // `banners()` (giống hệt cách `_saleActive` lọc `sale_starts_at/ends_at`
      // — so "còn hiệu lực NGAY LÚC NÀY" cần đồng hồ máy khách, một truy vấn
      // tĩnh không diễn tả được "chưa tới"/"đã hết hạn").
      _get(
        'home_banners?enabled=eq.true&select=id,title,subtitle,image_url,cta_tool_id,sort_order,starts_at,ends_at&order=sort_order.asc'
      ),
      // Đợt 3: 15 thầy + công cụ mỗi thầy đứng tên (`tool_ids`). Dùng cho
      // trang `/app/thay` VÀ để shell.js đổi avatar/tên thầy trong rail theo
      // ĐÚNG thầy phụ trách công cụ đang mở — xem `masterForTool()`.
      _get(
        'master_profiles?select=id,display_name,discipline,tagline,greeting,tool_ids,sort_order&order=sort_order.asc'
      ),
    ])
      .then(function (res) {
        var toolRows = res[0];
        var pkgRows = res[1];
        var groupRows = Array.isArray(res[2]) ? res[2] : [];
        var bannerRows = Array.isArray(res[3]) ? res[3] : [];
        var masterRows = Array.isArray(res[4]) ? res[4] : [];
        // Giá công cụ là phần bắt buộc; thiếu nó thì coi như đọc hụt cả cụm.
        if (!Array.isArray(toolRows)) return null;
        var tools = {};
        toolRows.forEach(function (x) {
          if (x && typeof x.tool_id === 'string') {
            tools[x.tool_id] = _saleActive(x) ? Number(x.sale_credits) : Number(x.credits);
          }
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
        _data = { tools: tools, rows: toolRows, packages: packages, groups: groupRows, banners: bannerRows, masters: masterRows };
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

  function _rowFor(toolId) {
    var rs = rows();
    for (var i = 0; i < rs.length; i++) {
      if (rs[i] && rs[i].tool_id === toolId) return rs[i];
    }
    return null;
  }

  /**
   * Câu giá đọc được ngay, ví dụ "15 Lượng mỗi lượt" hoặc "Miễn phí" — dùng cho
   * dòng mô tả dưới mỗi công cụ trong Luận Đường. Đọc `is_free` từ chính dòng
   * `tool_pricing`, KHÔNG suy từ `credits<=0` — hai thứ đang trùng nhau ở dữ
   * liệu hiện có, nhưng suy như vậy là đoán, không phải đọc nguồn.
   * `null` khi chưa nạp được hoặc không có công cụ đó — nơi gọi giữ nguyên chữ
   * đang có (mặc định `…`), KHÔNG đoán.
   */
  function priceLabel(toolId) {
    var row = _rowFor(toolId);
    if (!row) return null;
    if (row.is_free) return 'Miễn phí';
    var v = Number(row.credits);
    if (!isFinite(v) || v <= 0) return null;
    // Henry (2026-09-20): VNĐ lên làm giá CHÍNH, Lượng lùi thành ngoặc phụ —
    // đảo ngược "N Lượng mỗi lượt" cũ. `vndLabel` rỗng khi chưa đọc được
    // `credit_packages` → rơi về câu Lượng-only cũ, KHÔNG bịa số VNĐ.
    if (_saleActive(row)) {
      var sale = Number(row.sale_credits);
      var saleVnd = vndLabel(sale);
      return saleVnd
        ? saleVnd + ' mỗi lượt (' + sale + ' Lượng, giảm từ ' + v + ')'
        : sale + ' Lượng mỗi lượt (giảm từ ' + v + ')';
    }
    var vnd = vndLabel(v);
    return vnd ? vnd + ' mỗi lượt (' + v + ' Lượng)' : v + ' Lượng mỗi lượt';
  }

  /**
   * Thông tin khuyến mãi ĐANG CHẠY của một tool, hoặc `null` nếu không có KM
   * (hết hạn/chưa tới/chưa đọc được). Dùng cho badge/đếm ngược ở trang tool —
   * `original`/`sale` là số Lượng, `endsAt` là chuỗi ISO hoặc `null` (KM không
   * có hạn tự tắt, xem `_saleActive`).
   */
  function saleInfo(toolId) {
    var row = _rowFor(toolId);
    if (!row || !_saleActive(row)) return null;
    return { original: Number(row.credits), sale: Number(row.sale_credits), endsAt: row.sale_ends_at || null };
  }

  /**
   * Giá MỘT PHẦN của tool chia nhỏ (laso: 12 Lượng/phần thay vì 150 Lượng
   * trọn bó) — đọc `tool_pricing.credits_per_part`. `null` khi tool không
   * chia phần (`parts<=1`), chưa đọc được, hoặc không có công cụ đó — nơi
   * gọi giữ nguyên chữ đang có, TUYỆT ĐỐI không đoán bằng credits/parts.
   */
  function partPrice(toolId) {
    var row = _rowFor(toolId);
    if (!row) return null;
    var parts = Number(row.parts);
    var v = Number(row.credits_per_part);
    return parts > 1 && isFinite(v) && v > 0 ? v : null;
  }

  /** Danh sách gói nạp (mảng rỗng nếu chưa nạp được). */
  function packages() {
    return (_data && _data.packages) || [];
  }

  /**
   * Đơn giá quy đổi 1 Lượng ≈ VNĐ — CÙNG QUY TẮC với `vndPerCredit()` phía
   * server (lib/billing/packages.ts) và hàm SQL `credit_vnd()`: đơn giá của
   * gói thứ hai theo giá tăng dần (bậc phổ thông, đại diện nhất), rơi về gói
   * đầu nếu chỉ có một gói. `null` khi chưa đọc được `credit_packages` — nơi
   * gọi KHÔNG được đoán bằng một con số cứng, cùng luật với mọi hàm giá khác
   * ở file này.
   */
  function vndPerCredit() {
    var pkgs = packages();
    if (!pkgs.length) return null;
    var byPrice = pkgs.slice().sort(function (a, b) { return a.amount_vnd - b.amount_vnd; });
    var tier = byPrice[1] || byPrice[0];
    return tier.credits > 0 ? Math.round(tier.amount_vnd / tier.credits) : null;
  }

  /** "X Lượng" → chuỗi "~Y đ" làm tròn lên nghìn gần nhất, hoặc '' nếu chưa biết giá. */
  function vndLabel(credits) {
    var rate = vndPerCredit();
    if (rate == null || !isFinite(credits) || credits <= 0) return '';
    var vnd = Math.ceil((credits * rate) / 1000) * 1000;
    return '~' + vnd.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Số Lượng cấp cho một khoản nạp lẻ tuỳ ý — CÙNG CÔNG THỨC với
   * `quoteCustomVnd()` phía server (lib/billing/packages.ts, dùng thật ở
   * `create-bank`): với tới gói nào thì hưởng đơn giá gói đó (rẻ nhất trong
   * các gói "với tới"), chưa với tới gói nhỏ nhất thì vào bậc "vào cửa" —
   * đơn giá CAO NHẤT trong bảng, không phải đơn giá bậc-2 mà `vndPerCredit()`
   * dùng để HIỂN THỊ. `null` khi chưa đọc được `credit_packages`.
   *
   * 🔑 VÌ SAO CÓ HÀM NÀY: `TuviPaywall._qrAmountFor` (QR chuyển khoản tại chỗ)
   * từng suy amount cần nạp bằng `vndPerCredit()` rồi lấy `needCredits * rate`
   * — nhưng đơn giá HIỂN THỊ đó rẻ hơn đơn giá THẬT áp cho các khoản nạp lẻ
   * dưới giá gói nhỏ nhất, nên trả đúng số tiền hiện ra vẫn cấp THIẾU Lượng
   * → QR nổ lần hai ngay sau khi vừa "thanh toán thành công" (2026-09-08).
   * Mọi chỗ cần BIẾT TRƯỚC số Lượng cho một số tiền tự chọn phải gọi hàm
   * này, không suy ngược từ `vndPerCredit()`.
   */
  function quoteCustomVnd(amountVnd) {
    var pkgs = packages();
    if (!pkgs.length) return null;
    var rate = function (p) { return p.amount_vnd / p.credits; };
    var affordable = pkgs.filter(function (p) { return p.amount_vnd <= amountVnd; });
    var pool = affordable.length ? affordable : pkgs;
    var tier = pool.reduce(function (best, p) {
      return (affordable.length ? rate(p) < rate(best) : rate(p) > rate(best)) ? p : best;
    });
    return Math.floor(amountVnd / rate(tier));
  }

  // ── Nhóm công cụ ──────────────────────────────────────────────────────────
  /** Định nghĩa nhóm, đã sắp theo `sort_order`. Rỗng nếu chưa đọc được. */
  function groups() {
    return (_data && _data.groups) || [];
  }

  /**
   * Banner trượt ngang Trang chủ (`home_banners`) CÒN HIỆU LỰC ngay lúc gọi —
   * `enabled` đã lọc ở server, đây lọc thêm cửa sổ `starts_at`..`ends_at`
   * (thiếu mốc nào thì mốc đó coi như không giới hạn, cùng luật `_saleActive`).
   * Mỗi banner trả kèm `href` — đường `/app/<slug>` của `cta_tool_id`, tra qua
   * CHÍNH `tool_pricing` đã nạp (không phải bảng riêng) nên banner trỏ tới một
   * công cụ đã bị gỡ/đổi tên sẽ tự rớt `href` về `''`, KHÔNG dẫn ra đường chết.
   * Mảng rỗng nếu chưa đọc được hoặc không banner nào còn hiệu lực.
   *
   * Nhận `d` TRỰC TIẾP (giống cách `renderSpringboard(d)` của app-home.html
   * đọc thẳng `d.groups`/`d.rows`) thay vì đọc `_data` nội bộ — trang gọi hàm
   * này CẢ với `navFallback()` (vẽ ngay, trước khi có mạng) LẪN bản `load()`
   * đã về, nên hàm phải trung lập với nguồn, không riêng cho bản đã nạp.
   */
  function activeBanners(d) {
    var bannerRows = (d && d.banners) || [];
    var toolRows = (d && d.rows) || [];
    var now = Date.now();
    function rowFor(toolId) {
      for (var i = 0; i < toolRows.length; i++) {
        if (toolRows[i] && toolRows[i].tool_id === toolId) return toolRows[i];
      }
      return null;
    }
    return bannerRows
      .filter(function (b) {
        if (!b) return false;
        if (b.starts_at && new Date(b.starts_at).getTime() > now) return false;
        if (b.ends_at && new Date(b.ends_at).getTime() < now) return false;
        return true;
      })
      .map(function (b) {
        var toolRow = b.cta_tool_id ? rowFor(b.cta_tool_id) : null;
        return {
          id: b.id,
          title: b.title,
          subtitle: b.subtitle || '',
          imageUrl: b.image_url || '',
          href: toolRow ? appPath(toolRow) : '',
        };
      });
  }

  /** Trọn 15 dòng `master_profiles` (hellobot-ui-redesign Đợt 3), hoặc mảng
   *  rỗng nếu chưa đọc được. Nhận `d` trực tiếp — cùng lý do với
   *  `activeBanners(d)` ở trên. */
  function masters(d) {
    return (d && d.masters) || [];
  }

  /**
   * Thầy đứng tên một trang — nhận `activeSlug` (`window.SHELL_ACTIVE`, ví dụ
   * 'bat-tu', 'chon-ngay'), KHÔNG phải `tool_pricing.tool_id` ('tu-binh',
   * 'chon-ngay-tot') — hai thứ này KHÁC NHAU với nhiều công cụ (slug trang vs
   * khoá giá), nên phải tra qua `app_path` trước rồi mới tìm thầy theo đúng
   * `tool_id` đó. `null` nếu trang không khớp công cụ nào, công cụ chưa được
   * gán cho thầy nào (Thái Hư/Tinh Quang hiện chưa có công cụ riêng), hoặc
   * chưa đọc được dữ liệu.
   */
  function masterForTool(activeSlug, d) {
    if (!activeSlug) return null;
    var toolRows = (d && d.rows) || [];
    var row = null;
    for (var i = 0; i < toolRows.length; i++) {
      if (toolRows[i] && toolRows[i].app_path === '/app/' + activeSlug) { row = toolRows[i]; break; }
    }
    if (!row) return null;
    var list = masters(d);
    for (var j = 0; j < list.length; j++) {
      var m = list[j];
      if (m && Array.isArray(m.tool_ids) && m.tool_ids.indexOf(row.tool_id) >= 0) return m;
    }
    return null;
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
          banners: d.banners || [],
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
              home_rank: r.home_rank,
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
   * Điền mọi <span data-tvp-price="<tool_id>"> (chỉ con số) và mọi
   * <p data-tvp-price-label="<tool_id>"> (câu "N Lượng mỗi lượt" / "Miễn phí")
   * trong `root`. Chưa biết giá → để nguyên chữ đang có (mặc định `…`), KHÔNG
   * điền số phỏng đoán.
   */
  function fillSlots(root) {
    var scope = root || document;
    var els = scope.querySelectorAll('[data-tvp-price]');
    var labelEls = scope.querySelectorAll('[data-tvp-price-label]');
    var partEls = scope.querySelectorAll('[data-tvp-price-part]');
    if (!els.length && !labelEls.length && !partEls.length) return Promise.resolve();
    return load().then(function () {
      els.forEach(function (el) {
        var v = get(el.getAttribute('data-tvp-price'));
        if (v != null) el.textContent = v;
      });
      labelEls.forEach(function (el) {
        var lbl = priceLabel(el.getAttribute('data-tvp-price-label'));
        if (lbl != null) el.textContent = lbl;
      });
      partEls.forEach(function (el) {
        var v = partPrice(el.getAttribute('data-tvp-price-part'));
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
    partPrice: partPrice,
    saleInfo: saleInfo,
    vndPerCredit: vndPerCredit,
    vndLabel: vndLabel,
    quoteCustomVnd: quoteCustomVnd,
    groups: groups,
    groupsOf: groupsOf,
    activeBanners: activeBanners,
    masters: masters,
    masterForTool: masterForTool,
    appPath: appPath,
    pagePath: pagePath,
    navFallback: navFallback,
  };
})();
