/**
 * tuvi-paywall.js — Tử Vi Minh Bảo
 * Uses window.Auth (from auth.js) for session management.
 * Must be loaded AFTER auth.js.
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
    'phong-thuy':          { cost:  90, title: 'Phong Thủy Nội Thất' },
    'ban-lam-viec':        { cost:  90, title: 'Phong Thủy Bàn Làm Việc' },
    'cua-hang-phong-thuy': { cost:  90, title: 'Phong Thủy Cửa Hàng & VP' },
    'mau-sac-hop-menh':    { cost:  20, title: 'Màu Sắc Hợp Mệnh' },
    'kieu-toc-phan-tich':  { cost:   5, title: 'Phân Tích Kiểu Tóc AI' },
    'kieu-toc-tryon':      { cost:  20, title: 'Thử Kiểu Tóc AI' },
    'trang-phuc-tryon':    { cost:  20, title: 'Thử Trang Phục AI' },
    'phong-thuy-render':   { cost:  30, title: 'Render Phòng Phong Thủy AI' },
    'trang-diem-phan-tich':{ cost:   5, title: 'Phân Tích Trang Điểm AI' },
    'trang-diem-tryon':    { cost:  20, title: 'Thử Trang Điểm AI' },
    'trang-phuc-theo-ngay':{ cost:  10, title: 'Trang Phục Theo Ngày' },
  };

  const TOOL_TYPE = {
    'laso': 'use_laso', 'xem-tuoi': 'use_xem_tuoi', 'xem-lam-an': 'use_xem_lam_an',
    'dien-tuong': 'use_dien_tuong', 'nhan-tuong': 'use_nhan_tuong',
    'thu-tuong': 'use_thu_tuong', 'thanh-tuong': 'use_thanh_tuong',
    'phong-thuy': 'use_phong_thuy', 'ban-lam-viec': 'use_ban_lam_viec',
    'cua-hang-phong-thuy': 'use_cua_hang_phong_thuy', 'mau-sac-hop-menh': 'use_mau_sac',
    'kieu-toc-phan-tich': 'use_kieu_toc_phan_tich', 'kieu-toc-tryon': 'use_kieu_toc_tryon',
    'trang-phuc-tryon': 'use_trang_phuc_tryon',
    'phong-thuy-render': 'use_phong_thuy_render',
    'trang-diem-phan-tich': 'use_trang_diem_phan_tich',
    'trang-diem-tryon': 'use_trang_diem_tryon',
    'trang-phuc-theo-ngay': 'use_trang_phuc_theo_ngay',
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
  async function _price() {
    const p = _cfg?.product;
    const base = PRODUCTS[p] || PRODUCTS['dien-tuong'];
    if (_cfg?.cost) return { cost: _cfg.cost, title: _cfg.title || base.title };
    if (!_priceCache) {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/tool_pricing?select=tool_id,credits&enabled=eq.true`, { headers: { apikey: SB_ANON } });
        if (r.ok) { const rows = await r.json(); _priceCache = {}; rows.forEach(x => { _priceCache[x.tool_id] = x.credits; }); }
      } catch(e) {}
    }
    const cost = (_priceCache && _priceCache[p] != null) ? _priceCache[p] : base.cost;
    return { cost, title: _cfg?.title || base.title };
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

  // ── Confirm dialog ────────────────────────────────────────────
  function _confirm(cost, balance, title, onOk) {
    const after = balance - cost;
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Xác nhận sử dụng Lượng</div><div class="tpw-hd-s">' + title + '</div></div>' +
      '<div class="tpw-bd">' +
        '<div class="tpw-r"><span class="tpw-rl">Chi phí</span><span class="tpw-rv r">−' + cost + ' lượng</span></div>' +
        '<div class="tpw-r"><span class="tpw-rl">Số dư hiện tại</span><span class="tpw-rv o">' + balance + ' lượng</span></div>' +
        '<hr class="tpw-div">' +
        '<div class="tpw-r"><span class="tpw-rl"><strong>Còn lại</strong></span><span class="tpw-rv g">' + after + ' lượng</span></div>' +
      '</div>' +
      '<div class="tpw-ft">' +
        '<button class="tpw-btn cancel" id="_tpw_cancel">Huỷ</button>' +
        '<button class="tpw-btn ok" id="_tpw_ok">Xác Nhận →</button>' +
      '</div>'
    );
    document.getElementById('_tpw_cancel').onclick = _close;
    document.getElementById('_tpw_ok').onclick = async () => {
      const b = document.getElementById('_tpw_ok');
      if (b) { b.disabled = true; b.textContent = '…'; }
      _close();
      await onOk();
    };
  }

  // ── Insufficient ──────────────────────────────────────────────
  function _insufficient(cost, balance) {
    const need = cost - balance;
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Không đủ Lượng</div><div class="tpw-hd-s">Cần thêm ' + need + ' lượng</div></div>' +
      '<div class="tpw-center">' +
        '<div class="tpw-msg">Số dư: <strong>' + balance + ' lượng</strong> · Cần: <strong>' + cost + ' lượng</strong><br>' +
        '<span style="font-size:12px;color:#999">Nạp thêm credits để tiếp tục.</span></div>' +
        '<a class="tpw-btn topup" href="/topup.html" onclick="TuviPaywall._close()">Nạp Credits →</a>' +
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

    // 2. Get pricing
    const { cost, title } = await _price();

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

    // 5. Confirm → deduct → callback
    _confirm(cost, balance, title, async () => {
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
          _banner('✓ Đã trừ ' + cost + ' lượng · Còn lại ' + (data.balance ?? (balance - cost)) + ' lượng');
          await callback();
          return;
        }
        if (data.insufficientBalance) { _insufficient(cost, balance); return; }
        alert('Lỗi: ' + (data.error || 'Vui lòng thử lại.'));
      } catch(e) {
        alert('Lỗi kết nối: ' + e.message);
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────────
  function init(config) {
    _cfg = config;
    _css();
    _price().catch(() => {}); // prefetch
  }

  return { init, requireCredits, generateToolSlug, _close, show: _insufficient };
})();
