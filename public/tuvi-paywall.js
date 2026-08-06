/**
 * tuvi-paywall.js — Tử Vi Minh Bảo
 * Uses window.Auth (from auth.js) for session management.
 * Must be loaded AFTER auth.js.
 */
const TuviPaywall = (() => {
  // NHÃN hiển thị của từng công cụ. CỐ Ý KHÔNG có giá ở đây.
  //
  // Giá đọc từ `tool_pricing` qua ToolPrices (public/tool-prices.js) — nguồn
  // DUY NHẤT, admin sửa không cần deploy. Map này từng mang thêm `cost` làm
  // "bản dự phòng", và chính nó trôi khỏi DB rồi báo sai giá cho người dùng.
  // Không đọc được giá thì HỎI LẠI, đừng đoán — xem _price().
  const PRODUCTS = {
    'tuvi-chat':           { title: 'Tử Vi Chat' },
    'laso':                { title: 'Luận Giải Lá Số' },
    'tu-binh':             { title: 'Tử Bình Bát Tự' },
    'xem-tuoi':            { title: 'Xem Tuổi Vợ Chồng' },
    'xem-lam-an':          { title: 'Xem Tuổi Làm Ăn' },
    'dien-tuong':          { title: 'Diện Tướng AI' },
    'nhan-tuong':          { title: 'Nhãn Tướng AI' },
    'thu-tuong':           { title: 'Thủ Tướng AI' },
    'thanh-tuong':         { title: 'Thanh Tướng AI' },
    'thanh-tuong-pro':     { title: 'Thanh Tướng Pro' },
    'khi-sac':             { title: 'Khí Sắc — Vận Khí' },
    'phong-thuy':          { title: 'Phong Thủy Nội Thất' },
    'ban-lam-viec':        { title: 'Phong Thủy Bàn Làm Việc' },
    'cua-hang-phong-thuy': { title: 'Phong Thủy Cửa Hàng & VP' },
    'mau-sac-hop-menh':    { title: 'Màu Sắc Hợp Mệnh' },
    'kieu-toc-phan-tich':  { title: 'Phân Tích Kiểu Tóc AI' },
    'kieu-toc-tryon':      { title: 'Thử Kiểu Tóc AI' },
    'trang-phuc-tryon':    { title: 'Thử Trang Phục AI' },
    'phong-thuy-render':   { title: 'Render Phòng Phong Thủy AI' },
    'trang-diem-phan-tich':{ title: 'Phân Tích Trang Điểm AI' },
    'trang-diem-tryon':    { title: 'Thử Trang Điểm AI' },
    'trang-phuc-theo-ngay':{ title: 'Trang Phục Theo Ngày' },
    'da-lieu-ai':          { title: 'Da Liệu AI Toàn Diện' },
    'personal-color':      { title: 'Personal Color AI' },
    'personal-color-tryon':{ title: 'Personal Color Try-on' },
    'dat-ten-con':         { title: 'Đặt Tên Con' },
    'dat-ten-dn':          { title: 'Đặt Tên Doanh Nghiệp' },
    'chon-ngay-tot':       { title: 'Chọn Ngày Tốt' },
    'chan-dung-vo-chong':  { title: 'Chân Dung Vợ Chồng' },
    'chan-dung-tien-kiep': { title: 'Chân Dung Tiền Kiếp' },
    'duyen-no-tien-kiep': { title: 'Duyên Nợ Tiền Kiếp' },
  };

  const TOOL_TYPE = {
    'tuvi-chat': 'use_tuvi_chat',
    'laso': 'use_laso', 'tu-binh': 'use_tubinh',
    'xem-tuoi': 'use_xem_tuoi', 'xem-lam-an': 'use_xem_lam_an',
    'dien-tuong': 'use_dien_tuong', 'nhan-tuong': 'use_nhan_tuong',
    'thu-tuong': 'use_thu_tuong', 'thanh-tuong': 'use_thanh_tuong',
    'thanh-tuong-pro': 'use_thanh_tuong_pro', 'khi-sac': 'use_khi_sac',
    'phong-thuy': 'use_phong_thuy', 'ban-lam-viec': 'use_ban_lam_viec',
    'cua-hang-phong-thuy': 'use_cua_hang_phong_thuy', 'mau-sac-hop-menh': 'use_mau_sac',
    'kieu-toc-phan-tich': 'use_kieu_toc_phan_tich', 'kieu-toc-tryon': 'use_kieu_toc_tryon',
    'trang-phuc-tryon': 'use_trang_phuc_tryon',
    'phong-thuy-render': 'use_phong_thuy_render',
    'trang-diem-phan-tich': 'use_trang_diem_phan_tich',
    'trang-diem-tryon': 'use_trang_diem_tryon',
    'trang-phuc-theo-ngay': 'use_trang_phuc_theo_ngay',
    'da-lieu-ai': 'use_da_lieu_ai',
    'personal-color': 'use_personal_color',
    'personal-color-tryon': 'use_personal_color_tryon',
    'dat-ten-con': 'use_dat_ten_con', 'dat-ten-dn': 'use_dat_ten_dn',
    'chon-ngay-tot': 'use_chon_ngay_tot',
    'chan-dung-vo-chong': 'use_chan_dung_vo_chong',
    'chan-dung-tien-kiep': 'use_chan_dung_tien_kiep',
    'duyen-no-tien-kiep': 'use_duyen_no_tien_kiep',
  };

  let _cfg        = null;
  let _priceCache = null;

  // ── CSS injection ─────────────────────────────────────────────
  function _css() {
    if (document.getElementById('tpw-css')) return;
    const s = document.createElement('style');
    s.id = 'tpw-css';
    s.textContent = `
.tpw-overlay{position:fixed;inset:0;background:rgba(6,26,46,.72);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;animation:tpw-fade .2s ease}
@keyframes tpw-fade{from{opacity:0}to{opacity:1}}
@keyframes tpw-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.tpw-box{background:#fff;border-radius:14px;width:100%;max-width:400px;box-shadow:0 24px 60px rgba(6,26,46,.3);animation:tpw-up .22s ease;overflow:hidden}
.tpw-hd{background:#061A2E;padding:18px 22px}
.tpw-hd-t{font-family:'Noto Serif',Georgia,serif;font-size:15px;color:#fff;font-weight:700;margin-bottom:3px}
.tpw-hd-s{font-size:11.5px;color:rgba(255,255,255,.5)}
.tpw-bd{padding:18px 22px}
.tpw-r{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f5f5f5;font-size:13px}
.tpw-r:last-of-type{border-bottom:none}
.tpw-rl{color:#666}
.tpw-rv{font-family:'Noto Serif',Georgia,serif;font-weight:700;font-size:14px}
.tpw-rv.r{color:#C0392B}
.tpw-rv.g{color:#1E6B3C}
.tpw-rv.o{color:#9A7B3A}
hr.tpw-div{border:none;border-top:1.5px solid #f0f0f0;margin:3px 0}
.tpw-ft{display:flex;gap:10px;padding:14px 22px;border-top:1px solid #f0f0f0}
.tpw-btn{flex:1;padding:10px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
.tpw-btn.cancel{background:#fff;border:1.5px solid #ddd;color:#666}
.tpw-btn.cancel:hover{background:#f5f5f5}
.tpw-btn.ok{flex:2;background:#061A2E;border:none;color:#c9a84c}
.tpw-btn.ok:hover{background:#0D3B5E}
.tpw-btn.ok:disabled{opacity:.5;cursor:not-allowed}
.tpw-btn.topup{background:#9A7B3A;border:none;color:#fff;display:inline-block;text-decoration:none;padding:10px 28px;border-radius:7px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer}
.tpw-btn.topup:hover{background:#7d6230}
.tpw-msg{font-size:13px;color:#444;line-height:1.65;margin-bottom:14px}
.tpw-center{padding:18px 22px;text-align:center}
.tpw-banner{position:fixed;top:72px;left:50%;transform:translateX(-50%);background:#1E6B3C;color:#fff;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.18);white-space:nowrap;pointer-events:none;animation:tpw-fade .25s ease}`;
    document.head.appendChild(s);
  }

  // ── Pricing ───────────────────────────────────────────────────
  // Trả { cost, title }. `cost = null` nghĩa là CHƯA BIẾT GIÁ (đọc hụt) — nơi
  // gọi phải dừng lại và nói thật, tuyệt đối không thay bằng số phỏng đoán.
  // Bản cũ rơi về `PRODUCTS['dien-tuong']` khi product lạ, nên một id gõ sai là
  // âm thầm tính tiền theo giá tool khác.
  async function _price() {
    const p = _cfg?.product;
    const title = _cfg?.title || PRODUCTS[p]?.title || p || 'Công cụ';
    if (_cfg?.cost) return { cost: _cfg.cost, title };
    await _ensurePrices();
    if (window.ToolPrices) await window.ToolPrices.load();
    const cost = window.ToolPrices ? window.ToolPrices.get(p) : null;
    return { cost, title };
  }

  // Điền giá vào [data-tvp-price] — uỷ quyền cho ToolPrices (nguồn duy nhất).
  // Giữ hàm này vì nhiều trang đã gọi TuviPaywall.fillPriceSlots().
  async function fillPriceSlots(root) {
    await _ensurePrices();
    if (window.ToolPrices) await window.ToolPrices.fillSlots(root);
  }

  // Tự nạp tool-prices.js nếu trang chưa có. CỐ Ý làm ở đây thay vì đi thêm
  // thẻ <script> vào 40+ trang: thêm tay thì sẽ sót, mà sót ở trang nào là
  // trang đó mất giá.
  function _ensurePrices() {
    if (window.ToolPrices) return Promise.resolve();
    return new Promise((resolve) => {
      let el = document.getElementById('_tvmb_prices_js');
      if (!el) {
        el = document.createElement('script');
        el.id = '_tvmb_prices_js';
        el.src = '/tool-prices.js?v=3';
        document.head.appendChild(el);
      }
      el.addEventListener('load', () => resolve());
      el.addEventListener('error', () => resolve()); // nạp hỏng → coi như chưa biết giá
    });
  }

  /** Giá của một product bất kỳ (không phụ thuộc _cfg). null = chưa biết. */
  async function _priceOf(product) {
    await _ensurePrices();
    if (window.ToolPrices) await window.ToolPrices.load();
    return window.ToolPrices ? window.ToolPrices.get(product) : null;
  }

  // Chưa đọc được bảng giá. CỐ Ý không chạy tiếp bằng một con số phỏng đoán:
  // thà bảo người ta thử lại còn hơn trừ Lượng ở mức họ chưa từng thấy.
  function _priceUnknown() {
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Chưa đọc được bảng giá</div><div class="tpw-hd-s">Chưa trừ Lượng nào của bạn</div></div>' +
      '<div class="tpw-center"><div class="tpw-msg">Kết nối tới máy chủ giá đang trục trặc. Bạn thử lại sau giây lát nhé — chúng tôi không chạy công cụ khi chưa hiện được giá chính xác.</div></div>' +
      '<div class="tpw-ft"><button class="tpw-btn cancel" onclick="TuviPaywall._close()">Đóng</button></div>'
    );
  }

  // ── Overlay helper ────────────────────────────────────────────
  let _ov = null;
  function _open(inner) {
    _close();
    _css();
    _ov = document.createElement('div');
    _ov.className = 'tpw-overlay';
    _ov.innerHTML = '<div class="tpw-box">' + inner + '</div>';
    _ov.addEventListener('click', e => { if (e.target === _ov) _close(); });
    document.body.appendChild(_ov);
    document.body.style.overflow = 'hidden';
  }
  function _close() {
    if (_ov) { _ov.remove(); _ov = null; }
    document.body.style.overflow = '';
  }

  // ── Insufficient ──────────────────────────────────────────────
  function _insufficient(cost, balance) {
    const need = cost - balance;
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Không đủ Lượng</div><div class="tpw-hd-s">Cần thêm ' + need + ' lượng</div></div>' +
      '<div class="tpw-center">' +
        '<div class="tpw-msg">Số dư: <strong>' + balance + ' lượng</strong> · Cần: <strong>' + cost + ' lượng</strong><br>' +
        '<span style="font-size:12px;color:#999">Nạp thêm credits để tiếp tục.</span></div>' +
        '<a class="tpw-btn topup" href="/topup.html" onclick="try{window.Track&&window.Track.event&&window.Track.event(\'topup_start\',{meta:{from:\'paywall\',need:' + need + '}})}catch(e){};TuviPaywall._close()">Nạp Credits →</a>' +
      '</div>' +
      '<div class="tpw-ft"><button class="tpw-btn cancel" onclick="TuviPaywall._close()">Đóng</button></div>'
    );
  }

  // ── Banner ────────────────────────────────────────────────────
  function _banner(msg) {
    const o = document.getElementById('_tpw_banner');
    if (o) o.remove();
    const el = document.createElement('div');
    el.id = '_tpw_banner'; el.className = 'tpw-banner'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = '0'; }, 2500);
    setTimeout(() => el.remove(), 3100);
  }

  // ── Slug generator ────────────────────────────────────────────
  function generateToolSlug(product) {
    const uid = (window.Auth?.getUser()?.id || 'g').slice(0, 8);
    return product + '-' + uid + '-' + Date.now();
  }

  // ── MAIN: requireCredits ──────────────────────────────────────
  async function requireCredits(slug, callback) {
    _css();

    // 1. Login check — use window.Auth from auth.js
    if (!window.Auth?.isLoggedIn()) {
      if (window.showAuthModal) {
        window.showAuthModal(async () => { await requireCredits(slug, callback); });
      } else if (window.Auth?.require) {
        window.Auth.require(async () => { await requireCredits(slug, callback); });
      } else {
        alert('Vui lòng đăng nhập để tiếp tục.');
      }
      return;
    }

    const session = window.Auth.getSession();
    const userId  = window.Auth.getUser()?.id || '';
    const token   = session?.access_token || '';

    if (!token) {
      alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      window.Auth?.signOut?.();
      return;
    }

    // 2. Giá — chưa biết thì DỪNG. Bỏ hộp thoại xác nhận rồi nên con số trên
    // nút là thứ cuối cùng người dùng đọc; chạy tiếp bằng một giá đoán là trừ
    // Lượng cho một mức họ chưa từng nhìn thấy.
    const { cost, title } = await _price();
    if (cost == null) { _priceUnknown(); return; }

    // 3. Re-access check (same slug = already paid)
    if (slug) {
      try {
        const r = await fetch('/api/payment?action=check&slug=' + encodeURIComponent(slug) + '&userId=' + encodeURIComponent(userId));
        const d = await r.json();
        if (d.hasAccess) { await callback(); return; }
      } catch(e) {}
    }

    // 4. Balance check
    let balance = 0;
    try {
      const r = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
      const d = await r.json();
      balance = d.balance ?? 0;
    } catch(e) {}

    if (balance < cost) { _insufficient(cost, balance); return; }

    // 5. Trừ → callback. KHÔNG hỏi xác nhận: giá đã ghi sẵn trên chính nút bấm
    // và trong danh sách công cụ (và cả hai nay đọc từ `tool_pricing`, xem
    // _fillPriceSlots) — hộp thoại chỉ lặp lại con số người dùng vừa đọc.
    // Hộp thoại DUY NHẤT còn giữ là lúc KHÔNG ĐỦ Lượng (_insufficient, ở trên)
    // và lúc chạm trần lượt tặng (_capReached) — hai ca người dùng cần biết vì
    // sao không chạy được và đi đâu để nạp.
    try {
      const res = await fetch('/api/payment?action=deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          amount: cost,
          product: _cfg?.product || '',
          toolType: TOOL_TYPE[_cfg?.product] || ('use_' + (_cfg?.product || 'unknown')),
          slug: slug || '',
          description: title,
        }),
      });
      const data = await res.json();

      if (data.success || data.alreadyPaid) {
        window.refreshNavCredits && window.refreshNavCredits();
        _banner('✓ Đã trừ ' + cost + ' lượng · Còn lại ' + (data.balance ?? (balance - cost)) + ' lượng');
        await callback();
        return;
      }
      if (data.insufficientBalance) { _insufficient(cost, balance); return; }
      // Chạm trần lượt dùng thử miễn phí trong ngày (cầu dao ngân sách ảnh
      // free). KHÔNG phải lỗi và KHÔNG mất Lượng — server chặn trước khi trừ
      // — nên nói tử tế, đừng ném alert 'Lỗi:' làm người ta tưởng hỏng.
      if (data.capReached) { _capReached(data.message); return; }
      alert('Lỗi: ' + (data.error || 'Vui lòng thử lại.'));
    } catch(e) {
      alert('Lỗi kết nối: ' + e.message);
    }
  }

  // ── Lượt XEM LẠI miễn phí (2 tool chân dung cache theo lá số) ─────────
  //
  // Hai tool chân dung lưu kết quả theo LÁ SỐ: cùng ngày/tháng/năm + giờ sinh
  // + giới tính thì kết quả y hệt, nên lượt sau chỉ là đọc lại bản đã có,
  // KHÔNG tốn tiền model. Ai đã từng trả cho đúng lá số đó thì xem lại miễn
  // phí — hỏi server trước để khỏi hiện hộp thoại đòi tiền cho một lượt vốn
  // không mất gì.
  //
  // FAIL-CLOSED: mạng lỗi / chưa đăng nhập / server trả lạ → coi như PHẢI trả
  // tiền và đi đường paywall như cũ. Đoán nhầm sang "miễn phí" thì server cũng
  // chặn lại bằng 402, người dùng lãnh một lỗi khó hiểu — thà hỏi tiền rồi
  // server tự bỏ qua còn hơn.
  // Hỏi endpoint xem lượt này có phải XEM LẠI thứ user đã trả tiền không.
  // Tách phần "gửi query" ra khỏi phần "dựng query" vì tool nhận HAI lá số
  // (Duyên Nợ Tiền Kiếp) không mô tả được bằng một object `birth`.
  //
  // FAIL-CLOSED ở mọi nhánh: mạng lỗi / chưa đăng nhập / server trả lạ → coi
  // như PHẢI TRẢ. Đoán nhầm thành "đã trả" là phát không hàng.
  async function _isFreeRerunQ(endpoint, query) {
    try {
      const token = window.Auth?.getSession()?.access_token || '';
      if (!token || !query) return false;
      const r = await fetch(endpoint + '?action=cache-status&' + query, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!r.ok) return false;
      const d = await r.json();
      return !!(d && d.free);
    } catch (e) { return false; }
  }

  async function _isFreeRerun(endpoint, birth) {
    if (!birth) return false;
    const q =
      'd=' + (birth.day || 0) + '&m=' + (birth.month || 0) + '&y=' + (birth.year || 0) +
      '&h=' + (birth.hourBranch == null ? -1 : birth.hourBranch) +
      '&g=' + (birth.gender === 'nu' ? 'nu' : 'nam') +
      '&lunar=' + (birth.isLunar ? '1' : '0');
    return _isFreeRerunQ(endpoint, q);
  }

  /**
   * Như `requireCredits`, nhưng bỏ qua hộp thoại trừ Lượng khi lượt này là
   * XEM LẠI một lá số người dùng đã trả tiền từ trước.
   * `callback(freeRerun)` — cờ để trang biết mình đang đi đường miễn phí, và
   * quay lại đường trả phí nếu server vẫn đòi (402).
   */
  async function requireCreditsCached(endpoint, birth, slug, callback) {
    return _cachedFlow(_isFreeRerun(endpoint, birth), slug, callback,
      '✓ Bạn đã tạo kết quả cho lá số này — mở lại, không trừ Lượng');
  }

  /** Bản nhận QUERY tự dựng — cho tool có nhiều hơn một lá số. */
  async function requireCreditsCachedQuery(endpoint, query, slug, callback, banner) {
    return _cachedFlow(_isFreeRerunQ(endpoint, query), slug, callback,
      banner || '✓ Bạn đã tạo kết quả cho cặp lá số này — mở lại, không trừ Lượng');
  }

  async function _cachedFlow(freeP, slug, callback, bannerText) {
    if (await freeP) {
      _css();
      _banner(bannerText);
      await callback(true);
      return;
    }
    return requireCredits(slug, function () { return callback(false); });
  }

  // Dùng lại đúng khung modal của _insufficient (tpw-*) — cùng cảm giác, không
  // đẻ thêm bộ class/CSS riêng cho một thông báo.
  function _capReached(msg) {
    const text = msg || 'Hôm nay số lượt dùng thử miễn phí đã hết. Bạn quay lại vào ngày mai nhé.';
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Hết lượt tặng hôm nay</div><div class="tpw-hd-s">Chưa trừ Lượng nào của bạn</div></div>' +
      '<div class="tpw-center">' +
        '<div class="tpw-msg">' + _esc(text) + '</div>' +
        '<a class="tpw-btn topup" href="/topup.html" onclick="try{window.Track&&window.Track.event&&window.Track.event(\'topup_start\',{meta:{from:\'free_cap\'}})}catch(e){};TuviPaywall._close()">Nạp Lượng →</a>' +
      '</div>' +
      '<div class="tpw-ft"><button class="tpw-btn cancel" onclick="TuviPaywall._close()">Để mai</button></div>'
    );
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Silent flow (cho chat: trừ ngầm, KHÔNG confirm modal) ─────
  async function _balanceFor(userId) {
    try {
      const r = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
      return (await r.json()).balance ?? 0;
    } catch (e) { return 0; }
  }

  // Lấy số dư hiện tại (null nếu chưa đăng nhập)
  async function getBalance() {
    if (!window.Auth?.isLoggedIn()) return null;
    return await _balanceFor(window.Auth.getUser()?.id || '');
  }

  // Gate trước khi gửi: kiểm tra đăng nhập + đủ Lượng (KHÔNG trừ, KHÔNG confirm).
  // reason: 'login' | 'insufficient'. Khi insufficient sẽ tự mở modal nạp.
  async function ensureCredits(opts) {
    opts = opts || {};
    const product = opts.product;
    const cost = opts.cost != null ? opts.cost : await _priceOf(product);
    if (cost == null) { _css(); _priceUnknown(); return { ok: false, reason: 'price_unknown' }; }
    _css();
    if (!window.Auth?.isLoggedIn()) return { ok: false, reason: 'login' };
    const userId = window.Auth.getUser()?.id || '';
    const token  = window.Auth.getSession()?.access_token || '';
    if (!token) return { ok: false, reason: 'login' };
    const balance = await _balanceFor(userId);
    if (balance < cost) { _insufficient(cost, balance); return { ok: false, reason: 'insufficient', balance }; }
    return { ok: true, balance };
  }

  // Trừ Lượng ngầm (gọi SAU khi có kết quả). Trả { ok, balance }.
  async function deductSilent(opts) {
    opts = opts || {};
    const product = opts.product;
    const cost = opts.cost != null ? opts.cost : await _priceOf(product);
    if (cost == null) return { ok: false, reason: 'price_unknown' };
    if (!window.Auth?.isLoggedIn()) return { ok: false, reason: 'login' };
    const token = window.Auth.getSession()?.access_token || '';
    if (!token) return { ok: false, reason: 'login' };
    try {
      const res = await fetch('/api/payment?action=deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          amount: cost,
          product: product || '',
          toolType: TOOL_TYPE[product] || ('use_' + (product || 'unknown')),
          slug: '',  // rỗng = luôn trừ (mỗi câu một lần)
          description: PRODUCTS[product]?.title || product || 'Tử Vi Chat',
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.refreshNavCredits && window.refreshNavCredits();
        return { ok: true, balance: data.balance ?? null };
      }
      if (data.insufficientBalance) { _insufficient(cost, data.balance ?? 0); return { ok: false, reason: 'insufficient', balance: data.balance ?? 0 }; }
      return { ok: false, reason: 'error', error: data.error };
    } catch (e) { return { ok: false, reason: 'error', error: e.message }; }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init(config) {
    _cfg = config;
    _css();
    _price().catch(() => {}); // prefetch
    fillPriceSlots().catch(() => {});
  }

  return { init, requireCredits, requireCreditsCached, requireCreditsCachedQuery, generateToolSlug, ensureCredits, deductSilent, getBalance, fillPriceSlots, _banner, _close };
})();

// Export to global window so cross-script checks (e.g. tu-binh.html line 1537) work
window.TuviPaywall = TuviPaywall;
