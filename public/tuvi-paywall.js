/**
 * tuvi-paywall.js — Tử Vi Minh Bảo
 * Self-contained credit paywall. No dependency on window.Auth or window.showAuthModal.
 * Uses window.supabaseClient directly for session.
 */
const TuviPaywall = (() => {
  const SB_URL  = 'https://dciwkfdqhhddeymlisey.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

  const PRODUCTS = {
    'laso':        { cost: 150, title: 'Luận Giải Lá Số' },
    'xem-tuoi':    { cost:  50, title: 'Xem Tuổi Vợ Chồng' },
    'xem-lam-an':  { cost:  50, title: 'Xem Tuổi Làm Ăn' },
    'dien-tuong':  { cost:   5, title: 'Diện Tướng AI' },
    'nhan-tuong':  { cost:   5, title: 'Nhãn Tướng AI' },
    'thu-tuong':   { cost:   5, title: 'Thủ Tướng AI' },
    'thanh-tuong': { cost:   5, title: 'Thanh Tướng AI' },
  };

  const TOOL_TYPE = {
    'laso': 'use_laso', 'xem-tuoi': 'use_xem_tuoi', 'xem-lam-an': 'use_xem_lam_an',
    'dien-tuong': 'use_dien_tuong', 'nhan-tuong': 'use_nhan_tuong',
    'thu-tuong': 'use_thu_tuong', 'thanh-tuong': 'use_thanh_tuong',
  };

  let _cfg         = null;
  let _priceCache  = null;

  // ── CSS ────────────────────────────────────────────────────────
  function _injectCss() {
    if (document.getElementById('tpw-css')) return;
    const s = document.createElement('style');
    s.id = 'tpw-css';
    s.textContent = `
.tpw-overlay{position:fixed;inset:0;background:rgba(6,26,46,.75);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);animation:tpw-fade .2s ease}
@keyframes tpw-fade{from{opacity:0}to{opacity:1}}
@keyframes tpw-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.tpw-box{background:#fff;border-radius:14px;width:100%;max-width:420px;box-shadow:0 24px 64px rgba(6,26,46,.35);animation:tpw-up .22s ease;overflow:hidden}
.tpw-head{background:#061A2E;padding:20px 24px}
.tpw-head-title{font-family:'Noto Serif',Georgia,serif;font-size:16px;color:#fff;font-weight:700;margin-bottom:4px}
.tpw-head-sub{font-size:12px;color:rgba(255,255,255,.55)}
.tpw-body{padding:20px 24px}
.tpw-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px;color:#444}
.tpw-row:last-of-type{border-bottom:none}
.tpw-row-label{color:#666}
.tpw-row-val{font-family:'Noto Serif',Georgia,serif;font-weight:700;font-size:14px}
.tpw-row-val.deduct{color:#C0392B}
.tpw-row-val.balance{color:#9A7B3A}
.tpw-row-val.remain{color:#1E6B3C}
.tpw-divider{border:none;border-top:1.5px solid #f0f0f0;margin:4px 0}
.tpw-btns{display:flex;gap:10px;padding:16px 24px;border-top:1px solid #f0f0f0}
.tpw-btn-cancel{flex:1;padding:10px;border:1.5px solid #ddd;border-radius:7px;background:#fff;color:#666;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.tpw-btn-cancel:hover{background:#f5f5f5}
.tpw-btn-confirm{flex:2;padding:10px;border:none;border-radius:7px;background:#061A2E;color:#c9a84c;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.03em}
.tpw-btn-confirm:hover{background:#0D3B5E}
.tpw-btn-confirm:disabled{opacity:.5;cursor:not-allowed}
.tpw-topup-box{padding:0 24px 20px;text-align:center}
.tpw-topup-msg{font-size:13px;color:#666;margin-bottom:12px;line-height:1.6}
.tpw-topup-msg strong{color:#C0392B}
.tpw-btn-topup{display:inline-block;padding:10px 28px;background:#9A7B3A;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;font-family:inherit}
.tpw-btn-topup:hover{background:#7d6230}
.tpw-login-box{padding:20px 24px;text-align:center}
.tpw-login-msg{font-size:13px;color:#444;margin-bottom:14px;line-height:1.6}
.tpw-btn-login{padding:10px 28px;background:#061A2E;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.tpw-btn-login:hover{background:#0D3B5E}
.tpw-banner{position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#1E6B3C;color:#fff;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2);white-space:nowrap;animation:tpw-fade .25s ease;pointer-events:none}
    `;
    document.head.appendChild(s);
  }

  // ── Session helper (uses supabaseClient directly) ─────────────
  async function _getSession() {
    try {
      if (window.supabaseClient) {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        return session || null;
      }
    } catch(e) {}
    return null;
  }

  // ── Pricing cache ─────────────────────────────────────────────
  async function _getCost() {
    const product = _cfg?.product;
    const base = PRODUCTS[product] || PRODUCTS['dien-tuong'];
    if (_cfg?.cost) return { cost: _cfg.cost, title: base.title };

    if (!_priceCache) {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/tool_pricing?select=tool_id,credits&enabled=eq.true`,
          { headers: { apikey: SB_ANON } });
        if (r.ok) {
          const rows = await r.json();
          _priceCache = {};
          rows.forEach(row => { _priceCache[row.tool_id] = row.credits; });
        }
      } catch(e) {}
    }
    const cost = (_priceCache && _priceCache[product] != null) ? _priceCache[product] : base.cost;
    return { cost, title: _cfg?.title || base.title };
  }

  // ── Slug generator ────────────────────────────────────────────
  function generateToolSlug(product) {
    const uid = (window.supabaseClient ? 'u' : 'g') + Date.now();
    return product + '-' + uid;
  }

  // ── Modal management ──────────────────────────────────────────
  let _overlay = null;

  function _closeOverlay() {
    if (_overlay) { _overlay.remove(); _overlay = null; }
    document.body.style.overflow = '';
  }

  function _showOverlay(innerHTML) {
    _closeOverlay();
    _injectCss();
    _overlay = document.createElement('div');
    _overlay.className = 'tpw-overlay';
    _overlay.innerHTML = `<div class="tpw-box">${innerHTML}</div>`;
    _overlay.addEventListener('click', e => { if (e.target === _overlay) _closeOverlay(); });
    document.body.appendChild(_overlay);
    document.body.style.overflow = 'hidden';
  }

  // ── Show confirm dialog ───────────────────────────────────────
  function _showConfirm(cost, balance, title, onConfirm) {
    const after = balance - cost;
    _showOverlay(`
      <div class="tpw-head">
        <div class="tpw-head-title">⊙ Xác nhận sử dụng Lượng</div>
        <div class="tpw-head-sub">${title}</div>
      </div>
      <div class="tpw-body">
        <div class="tpw-row">
          <span class="tpw-row-label">Chi phí</span>
          <span class="tpw-row-val deduct">−${cost} lượng</span>
        </div>
        <div class="tpw-row">
          <span class="tpw-row-label">Số dư hiện tại</span>
          <span class="tpw-row-val balance">${balance} lượng</span>
        </div>
        <hr class="tpw-divider">
        <div class="tpw-row">
          <span class="tpw-row-label"><strong>Còn lại sau khi trừ</strong></span>
          <span class="tpw-row-val remain">${after} lượng</span>
        </div>
      </div>
      <div class="tpw-btns">
        <button class="tpw-btn-cancel" id="tpw-cancel">Huỷ</button>
        <button class="tpw-btn-confirm" id="tpw-confirm-ok">Xác Nhận →</button>
      </div>
    `);
    document.getElementById('tpw-cancel').onclick = _closeOverlay;
    document.getElementById('tpw-confirm-ok').onclick = async () => {
      const btn = document.getElementById('tpw-confirm-ok');
      if (btn) { btn.disabled = true; btn.textContent = '...'; }
      _closeOverlay();
      await onConfirm();
    };
  }

  // ── Show insufficient credits ─────────────────────────────────
  function _showInsufficient(cost, balance) {
    const need = cost - balance;
    _showOverlay(`
      <div class="tpw-head">
        <div class="tpw-head-title">⊙ Không đủ Lượng</div>
        <div class="tpw-head-sub">Cần thêm ${need} lượng để tiếp tục</div>
      </div>
      <div class="tpw-topup-box">
        <div class="tpw-topup-msg">
          Số dư: <strong>${balance} lượng</strong> · Cần: <strong>${cost} lượng</strong><br>
          Nạp thêm credits để sử dụng công cụ này.
        </div>
        <a class="tpw-btn-topup" href="/topup.html" onclick="TuviPaywall._close()">Nạp Credits →</a>
      </div>
    `);
  }

  // ── Show login prompt ─────────────────────────────────────────
  function _showLogin(slug, callback) {
    _showOverlay(`
      <div class="tpw-head">
        <div class="tpw-head-title">Đăng nhập để tiếp tục</div>
        <div class="tpw-head-sub">Cần tài khoản để sử dụng credits</div>
      </div>
      <div class="tpw-login-box">
        <div class="tpw-login-msg">
          Đăng nhập để dùng credits và mở khoá ngay.<br>
          <span style="font-size:12px;color:#999">Đăng ký nhận 10 credits miễn phí</span>
        </div>
        <button class="tpw-btn-login" id="tpw-login-btn">Đăng Nhập / Đăng Ký</button>
      </div>
    `);
    document.getElementById('tpw-login-btn').onclick = () => {
      _closeOverlay();
      if (window.showAuthModal) {
        window.showAuthModal(async () => { await requireCredits(slug, callback); });
      } else if (window.Auth?.require) {
        window.Auth.require(async () => { await requireCredits(slug, callback); });
      } else {
        window.location.href = '/profile.html?redirect=' + encodeURIComponent(window.location.href);
      }
    };
  }

  // ── Success banner ────────────────────────────────────────────
  function _showBanner(msg) {
    const old = document.getElementById('tpw-banner');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'tpw-banner';
    el.className = 'tpw-banner';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = '0'; }, 3000);
    setTimeout(() => el.remove(), 3600);
  }

  // ── MAIN: requireCredits ──────────────────────────────────────
  async function requireCredits(slug, callback) {
    _injectCss();

    // 1. Get session directly from supabase
    const session = await _getSession();
    if (!session) {
      _showLogin(slug, callback);
      return;
    }

    const userId = session.user.id;
    const token  = session.access_token;

    // 2. Get cost from cache/DB
    const { cost, title } = await _getCost();

    // 3. Re-access check (already paid for this slug)
    if (slug) {
      try {
        const r = await fetch(`/api/payment?action=check&slug=${encodeURIComponent(slug)}&userId=${encodeURIComponent(userId)}`);
        const d = await r.json();
        if (d.hasAccess) { await callback(); return; }
      } catch(e) {}
    }

    // 4. Balance check
    let balance = 0;
    try {
      const r = await fetch(`/api/payment?action=balance&userId=${encodeURIComponent(userId)}`);
      const d = await r.json();
      balance = d.balance ?? 0;
    } catch(e) {}

    if (balance < cost) {
      _showInsufficient(cost, balance);
      return;
    }

    // 5. Show confirm → deduct → callback
    _showConfirm(cost, balance, title, async () => {
      try {
        const res = await fetch('/api/payment?action=deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            amount: cost,
            toolType: TOOL_TYPE[_cfg?.product] || ('use_' + (_cfg?.product || 'unknown')),
            slug: slug || '',
            description: title,
          }),
        });
        const data = await res.json();

        if (data.success || data.alreadyPaid) {
          window.refreshNavCredits && window.refreshNavCredits();
          _showBanner('✓ Đã trừ ' + cost + ' lượng · Còn lại ' + (data.balance ?? (balance - cost)) + ' lượng');
          await callback();
          return;
        }

        if (data.insufficientBalance) {
          _showInsufficient(cost, balance);
          return;
        }

        alert('Lỗi: ' + (data.error || 'Vui lòng thử lại.'));
      } catch(e) {
        alert('Lỗi kết nối: ' + e.message);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────
  function init(config) {
    _cfg = config;
    _injectCss();
    // Pre-fetch pricing in background
    _getCost().catch(() => {});
  }

  return {
    init,
    requireCredits,
    generateToolSlug,
    _close: _closeOverlay,
    show: _showInsufficient,
  };
})();
