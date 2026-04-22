/**
 * tuvi-paywall.js — Credit-based shared paywall · Tử Vi Minh Bảo
 *
 * Usage:
 *   TuviPaywall.init({
 *     product:  'laso' | 'xem-tuoi' | 'xem-lam-an' | 'dien-tuong' | ...,
 *     slug:     () => string,       // getter — slug có thể chưa có lúc init
 *     onUnlock: async () => void,   // callback sau khi unlock thành công
 *     // optional overrides:
 *     cost:     number,             // override số credits
 *     title:    string,
 *     subtitle: string,
 *     features: string[],
 *   });
 *
 *   TuviPaywall.check()             → Promise<boolean>  đã có access chưa
 *   TuviPaywall.show()              → hiện paywall modal
 *   TuviPaywall.hide()              → ẩn modal
 *   TuviPaywall.showSuccessBanner() → banner xanh "Đã mở khóa"
 */

const TuviPaywall = (() => {

  // ── Product config ───────────────────────────────────────────
  const PRODUCTS = {
    'laso': {
      cost: 190, usd: '$19',
      eyebrow:  '紫微明寶 · Luận Giải Lá Số',
      title:    'Mở khóa 24 phần luận giải chuyên sâu',
      subtitle: 'Phân tích toàn diện 12 cung, 9 đại vận, tiểu vận từng năm — được tạo riêng cho lá số của bạn bởi AI Tử Vi Minh Bảo.',
      features: ['Luận giải 12 cung chi tiết', 'Phân tích 9 đại vận toàn đời', 'Tiểu vận từng năm', 'Cách cục & ý nghĩa sâu', 'Vấn đáp AI không giới hạn', 'Lưu & xuất PDF'],
      anchor:   'Thầy tử vi offline thường 500k–1tr',
      cta:      'Mở Khóa Luận Giải',
      testimonials: [
        { text: '"Phần Quan Lộc nói đúng y chang tình huống tao đang gặp."', name: 'Trần M.K. — TP.HCM' },
        { text: '"Đọc phần đại vận xong ngồi im một lúc. Đúng y chang 3 năm nay."', name: 'Nguyễn T.H. — Hà Nội' },
      ],
    },
    'xem-tuoi': {
      cost: 90, usd: '$9',
      eyebrow:  '紫微明寶 · Xem Tuổi Vợ Chồng',
      title:    'Mở khóa 9 phần luận giải tương hợp',
      subtitle: 'Phân tích chuyên sâu 8 yếu tố hôn nhân — từ ngũ hành, tư tưởng, tính cách đến tài chính và vận hạn.',
      features: ['Xét tuổi & ngũ hành', 'Tư tưởng & tính cách', 'Cung Phu Thê chi tiết', 'Tài chính & sự nghiệp', 'Vận hạn đại vận', 'Vấn đáp AI 2 lá số'],
      anchor:   'Xem offline thường 300k–500k',
      cta:      'Mở Khóa Xem Tuổi',
      testimonials: [
        { text: '"Phần tư tưởng giải thích đúng nguyên nhân mâu thuẫn của tụi tao."', name: 'Lê T.B. — Đà Nẵng' },
      ],
    },
    'xem-lam-an': {
      cost: 90, usd: '$9',
      eyebrow:  '紫微明寶 · Xem Tuổi Làm Ăn',
      title:    'Mở khóa 9 phần luận giải hợp tác',
      subtitle: 'Phân tích 8 yếu tố theo góc độ kinh doanh — tương hợp cung Nô Bộc, tài chính, và vận hạn đối tác.',
      features: ['Xét tuổi & ngũ hành', 'Tư tưởng & tính cách', 'Cung Nô Bộc / Đối Tác', 'Giao tiếp & cung Thân', 'Tài chính & vận hạn', 'Vấn đáp AI 2 lá số'],
      anchor:   'Tư vấn phong thủy kinh doanh thường 500k+',
      cta:      'Mở Khóa Xem Làm Ăn',
      testimonials: [
        { text: '"Phần đối tác phân tích đúng điểm yếu trong hợp tác của tụi tao."', name: 'Phạm Q.A. — TP.HCM' },
      ],
    },
    // Template cho tools xem tướng và tools mới
    'dien-tuong':  { cost: 50, usd: '$5', eyebrow: '紫微明寶 · Diện Tướng', title: 'Mở khóa luận giải tướng mặt', subtitle: 'Phân tích chuyên sâu tướng mặt theo Ma Y Thần Tướng.', features: ['Tướng tổng thể', 'Ngũ nhạc tứ độc', 'Thái dương / Thái âm', 'Vận trình theo tuổi'], anchor: '', cta: 'Mở Khóa Diện Tướng', testimonials: [] },
    'nhan-tuong':  { cost: 50, usd: '$5', eyebrow: '紫微明寶 · Nhãn Tướng', title: 'Mở khóa luận giải tướng mắt', subtitle: 'Phân tích nhãn tướng chi tiết theo cổ pháp.', features: ['Thần & sắc mắt', 'Ngũ hành nhãn hình', 'Vận trình', 'Đặc điểm tính cách'], anchor: '', cta: 'Mở Khóa Nhãn Tướng', testimonials: [] },
    'thu-tuong':   { cost: 50, usd: '$5', eyebrow: '紫微明寶 · Thủ Tướng', title: 'Mở khóa luận giải tướng tay', subtitle: 'Phân tích chỉ tay và hình dạng bàn tay theo cổ pháp.', features: ['Hình dạng bàn tay', 'Các đường chỉ tay', 'Vận trình', 'Tính cách & sự nghiệp'], anchor: '', cta: 'Mở Khóa Thủ Tướng', testimonials: [] },
    'thanh-tuong': { cost: 50, usd: '$5', eyebrow: '紫微明寶 · Thanh Tướng', title: 'Mở khóa luận giải tướng giọng', subtitle: 'Phân tích thanh tướng và âm sắc theo cổ pháp.', features: ['Ngũ hành âm sắc', 'Tướng giọng tổng thể', 'Vận trình', 'Tính cách'], anchor: '', cta: 'Mở Khóa Thanh Tướng', testimonials: [] },
  };

  // ── Dynamic pricing (fetched from Supabase, overrides PRODUCTS) ──
  let _pricingCache = null;

  async function _fetchPricing() {
    if (_pricingCache) return _pricingCache;
    try {
      const res = await fetch(
        'https://dciwkfdqhhddeymlisey.supabase.co/rest/v1/tool_pricing?select=tool_id,credits,enabled&enabled=eq.true',
        { headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I' } }
      );
      if (!res.ok) return null;
      const rows = await res.json();
      _pricingCache = {};
      rows.forEach(r => { _pricingCache[r.tool_id] = r.credits; });
      return _pricingCache;
    } catch(e) { return null; }
  }

  const TOOL_TYPE_MAP = {
    'laso': 'use_laso', 'xem-tuoi': 'use_xem_tuoi', 'xem-lam-an': 'use_xem_lam_an',
    'dien-tuong': 'use_dien_tuong', 'nhan-tuong': 'use_nhan_tuong',
    'thu-tuong': 'use_thu_tuong', 'thanh-tuong': 'use_thanh_tuong',
  };

  let _cfg  = null;
  let _modal = null;

  // ── CSS ──────────────────────────────────────────────────────
  function _injectCss() {
    if (document.getElementById('tpw-css')) return;
    const s = document.createElement('style');
    s.id = 'tpw-css';
    s.textContent = `
.tpw-overlay{position:fixed;inset:0;background:rgba(6,26,46,0.78);z-index:8000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);animation:tpw-fade .2s ease}
@keyframes tpw-fade{from{opacity:0}to{opacity:1}}
.tpw-box{background:#fff;border-radius:16px;max-width:480px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(6,26,46,.45);animation:tpw-up .25s cubic-bezier(.4,0,.2,1);max-height:92vh;overflow-y:auto}
@keyframes tpw-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
.tpw-header{background:linear-gradient(150deg,#061A2E 0%,#0D3B5E 60%,#1455A4 100%);padding:28px 28px 22px;text-align:center}
.tpw-eyebrow{font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin-bottom:10px}
.tpw-title{font-family:'Noto Serif',Georgia,serif;font-size:20px;font-weight:700;color:#fff;line-height:1.35;margin-bottom:7px}
.tpw-subtitle{font-size:12.5px;color:#8BAACC;line-height:1.6}
.tpw-body{padding:22px 28px 24px}
.tpw-features{display:grid;grid-template-columns:1fr 1fr;gap:7px 12px;margin-bottom:16px}
.tpw-feat{display:flex;align-items:flex-start;gap:6px;font-size:12.5px;color:#444;line-height:1.4}
.tpw-feat::before{content:'✦';color:#c9a84c;flex-shrink:0;font-size:9px;margin-top:3px}
.tpw-anchor{text-align:center;font-size:11.5px;color:#9A7B3A;margin-bottom:6px;opacity:.85}
.tpw-price-row{background:#F9F4EB;border:1px solid #e8d9b0;border-radius:10px;padding:13px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.tpw-credit-num{font-family:'Noto Serif',Georgia,serif;font-size:28px;font-weight:700;color:#061A2E;line-height:1}
.tpw-credit-label{font-size:10.5px;color:#9A7B3A;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-top:2px}
.tpw-price-right{text-align:right;flex-shrink:0}
.tpw-usd{font-size:13px;color:#9A7B3A;font-weight:700}
.tpw-usd-note{font-size:10px;color:#bbb;margin-top:2px;line-height:1.4}
.tpw-balance-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#777;margin-bottom:9px;padding:0 2px}
.tpw-balance-ok{font-weight:700;color:#1E6B3C}
.tpw-balance-low{font-weight:700;color:#C0392B}
.tpw-btn{width:100%;padding:15px;background:#061A2E;color:#c9a84c;border:2px solid #c9a84c;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;font-family:inherit;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;text-decoration:none}
.tpw-btn:hover:not(:disabled){background:#c9a84c;color:#061A2E}
.tpw-btn:disabled{opacity:.55;cursor:not-allowed}
.tpw-btn-secondary{background:transparent;color:#9A7B3A;border-color:#e8d9b0;font-size:12px;letter-spacing:1px;padding:11px}
.tpw-btn-secondary:hover:not(:disabled){background:#F9F4EB;color:#061A2E;border-color:#c9a84c}
.tpw-btn-login{background:transparent;border-color:#ddd;color:#333;font-size:12px;letter-spacing:1px;padding:12px}
.tpw-btn-login:hover{background:#f5f5f5}
.tpw-deficit{background:#FFF5F5;border:1px solid #f5c6c6;border-radius:8px;padding:11px 14px;margin-bottom:12px;font-size:12.5px;color:#C0392B;text-align:center;line-height:1.6}
.tpw-login-hint{background:#EEF4FF;border:1px solid #C7D9F5;border-radius:8px;padding:11px 14px;font-size:12.5px;color:#1455A4;text-align:center;margin-bottom:12px;line-height:1.6}
.tpw-divider{display:flex;align-items:center;gap:8px;margin:12px 0;color:#ddd;font-size:11px}
.tpw-divider::before,.tpw-divider::after{content:'';flex:1;height:1px;background:#eee}
.tpw-testimonial{background:#F9F4EB;border-left:3px solid #c9a84c;border-radius:0 6px 6px 0;padding:10px 14px;margin-bottom:8px}
.tpw-testimonial-text{font-size:12px;color:#444;line-height:1.55;font-style:italic;margin-bottom:4px}
.tpw-testimonial-name{font-size:10.5px;color:#9A7B3A;font-weight:700}
.tpw-secure{text-align:center;font-size:11px;color:#aaa;margin-top:8px;line-height:1.7}
.tpw-secure a{color:#9A7B3A;text-decoration:none}
.tpw-already{text-align:center;font-size:11.5px;color:#9A7B3A;cursor:pointer;background:none;border:none;font-family:inherit;padding:5px 0;text-decoration:underline;display:block;width:100%;margin-top:4px}
.tpw-already:hover{color:#061A2E}
.tpw-spinner{width:16px;height:16px;border:2px solid rgba(201,168,76,.3);border-top-color:#c9a84c;border-radius:50%;animation:tpw-spin .7s linear infinite;display:inline-block;margin-right:7px;vertical-align:middle;flex-shrink:0}
@keyframes tpw-spin{to{transform:rotate(360deg)}}
.tpw-success-banner{position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#1E6B3C;color:#fff;padding:11px 28px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);white-space:nowrap;animation:tpw-fade .3s ease}
@keyframes tpw-shake{0%,100%{transform:none}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
.tpw-shake{animation:tpw-shake .35s ease}
@media(max-width:520px){
  .tpw-box{border-radius:12px}
  .tpw-header{padding:22px 20px 18px}
  .tpw-body{padding:18px 20px 20px}
  .tpw-features{grid-template-columns:1fr}
  .tpw-title{font-size:18px}
  .tpw-credit-num{font-size:24px}
}
`;
    document.head.appendChild(s);
  }

  // ── Get merged product config (DB price takes priority) ─────────
  function _p() {
    const base = PRODUCTS[_cfg.product] || PRODUCTS['laso'];
    const dbCost = _pricingCache ? (_pricingCache[_cfg.product] ?? null) : null;
    const cost = _cfg.cost ?? dbCost ?? base.cost;
    const usd = '$' + (cost / 10).toFixed(cost % 10 === 0 ? 0 : 1);
    return {
      ...base,
      cost,
      usd,
      ...(_cfg.title    !== undefined && { title:    _cfg.title }),
      ...(_cfg.subtitle !== undefined && { subtitle: _cfg.subtitle }),
      ...(_cfg.features !== undefined && { features: _cfg.features }),
    };
  }

  // ── Build modal skeleton ──────────────────────────────────────
  function _buildModal() {
    if (_modal) { _modal.remove(); _modal = null; }
    _injectCss();
    const p = _p();

    _modal = document.createElement('div');
    _modal.className = 'tpw-overlay';
    _modal.id = 'tpw-overlay';

    const testi = p.testimonials.length
      ? `<div class="tpw-divider">người dùng nói gì</div>` +
        p.testimonials.map(t => `<div class="tpw-testimonial"><div class="tpw-testimonial-text">${t.text}</div><div class="tpw-testimonial-name">— ${t.name}</div></div>`).join('')
      : '';

    _modal.innerHTML = `
      <div class="tpw-box" id="tpw-box">
        <div class="tpw-header">
          <div class="tpw-eyebrow">${p.eyebrow}</div>
          <div class="tpw-title">${p.title}</div>
          <div class="tpw-subtitle">${p.subtitle}</div>
        </div>
        <div class="tpw-body">
          <div class="tpw-features">
            ${p.features.map(f => `<div class="tpw-feat">${f}</div>`).join('')}
          </div>
          ${p.anchor ? `<div class="tpw-anchor">${p.anchor} · Tại đây chỉ ${p.cost} credits</div>` : ''}
          <div class="tpw-price-row">
            <div>
              <div class="tpw-credit-num">${p.cost}</div>
              <div class="tpw-credit-label">Credits</div>
            </div>
            <div class="tpw-price-right">
              <div class="tpw-usd">≈ ${p.usd}</div>
              <div class="tpw-usd-note">Không hết hạn<br>Re-access miễn phí</div>
            </div>
          </div>
          <div id="tpw-cta-area">
            <div style="text-align:center;padding:14px 0;color:#aaa;font-size:12px">
              <span class="tpw-spinner"></span>Đang kiểm tra...
            </div>
          </div>
          ${testi}
          <div class="tpw-secure">
            🔒 Credits không hết hạn · Dùng cho mọi công cụ ·
            <a href="/topup.html">Xem gói nạp →</a>
          </div>
          <button class="tpw-already" onclick="TuviPaywall._checkAlready()">
            Đã có credits nhưng chưa mở khóa? Nhấn đây
          </button>
        </div>
      </div>`;

    // Bounce khi click ngoài
    _modal.addEventListener('click', e => {
      if (e.target !== _modal) return;
      const box = document.getElementById('tpw-box');
      if (box) { box.classList.add('tpw-shake'); setTimeout(() => box.classList.remove('tpw-shake'), 400); }
    });

    document.body.appendChild(_modal);
  }

  // ── Render CTA area (dynamic based on auth + balance) ─────────
  async function _renderCta() {
    const ctaArea = document.getElementById('tpw-cta-area');
    if (!ctaArea) return;
    const p = _p();

    // Not logged in
    if (!window.Auth?.isLoggedIn()) {
      ctaArea.innerHTML = `
        <div class="tpw-login-hint">
          Đăng nhập để dùng credits và mở khóa ngay —<br>không cần redirect, không cần thanh toán lại.
        </div>
        <button class="tpw-btn tpw-btn-login" onclick="TuviPaywall._doLogin()">
          Đăng Nhập / Đăng Ký →
        </button>`;
      return;
    }

    // Fetch balance
    const userId = window.Auth.getUser()?.id || '';
    let balance = 0;
    try {
      const r = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
      balance = (await r.json()).balance ?? 0;
    } catch(e) {}

    const enough = balance >= p.cost;
    const need   = p.cost - balance;

    if (enough) {
      ctaArea.innerHTML = `
        <div class="tpw-balance-row">
          <span>Số dư của bạn</span>
          <span class="tpw-balance-ok">✓ ${balance} credits</span>
        </div>
        <button class="tpw-btn" id="tpw-pay-btn" onclick="TuviPaywall._doDeduct()">
          <span id="tpw-btn-text">🔓 ${p.cta} — ${p.cost} Credits</span>
        </button>`;
    } else {
      ctaArea.innerHTML = `
        <div class="tpw-balance-row">
          <span>Số dư của bạn</span>
          <span class="tpw-balance-low">${balance} credits</span>
        </div>
        <div class="tpw-deficit">
          Cần thêm <strong>${need} credits</strong> để mở khóa.<br>
          Gói nhỏ nhất: <strong>$10 = 100 credits</strong>.
        </div>
        <a href="/topup.html" class="tpw-btn" style="text-decoration:none">
          💳 Nạp Credits — từ $10 →
        </a>
        <button class="tpw-btn tpw-btn-secondary" onclick="TuviPaywall._doTopupInline()">
          Chọn gói nạp phù hợp
        </button>`;
    }
  }

  // ── Login then re-render ──────────────────────────────────────
  function _doLogin() {
    if (window.showAuthModal) {
      showAuthModal(async () => { await _renderCta(); });
    } else {
      window.location.href = '/profile.html';
    }
  }

  // ── Deduct credits ────────────────────────────────────────────
  async function _doDeduct() {
    const btn  = document.getElementById('tpw-pay-btn');
    const text = document.getElementById('tpw-btn-text');
    if (btn)  btn.disabled = true;
    if (text) text.innerHTML = '<span class="tpw-spinner"></span>Đang mở khóa...';

    const p     = _p();
    const slug  = typeof _cfg.slug === 'function' ? _cfg.slug() : (_cfg.slug || '');
    const token = window.Auth?.getSession()?.access_token || '';
    const toolType = TOOL_TYPE_MAP[_cfg.product] || ('use_' + _cfg.product);

    try {
      const res = await fetch('/api/payment?action=deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ amount: p.cost, toolType, slug, description: p.title }),
      });
      const data = await res.json();

      if (data.success) {
        hide();
        _showSuccessBanner('✓ Đã mở khóa — đang luận giải...');
        window.refreshNavCredits && window.refreshNavCredits();
        if (_cfg.onUnlock) await _cfg.onUnlock();
        return;
      }

      if (data.insufficientBalance) {
        await _renderCta(); // re-render with topup state
        return;
      }

      if (btn)  btn.disabled = false;
      if (text) text.textContent = `🔓 ${p.cta} — ${p.cost} Credits`;
      alert('Lỗi: ' + (data.error || 'Vui lòng thử lại.'));
    } catch(e) {
      if (btn)  btn.disabled = false;
      if (text) text.textContent = `🔓 ${p.cta} — ${p.cost} Credits`;
      alert('Lỗi kết nối: ' + e.message);
    }
  }

  // ── Topup redirect ────────────────────────────────────────────
  function _doTopupInline() {
    sessionStorage.setItem('tpw_topup_return', window.location.href);
    window.location.href = '/topup.html';
  }

  // ── Check already paid ────────────────────────────────────────
  async function _checkAlready() {
    const btn = document.querySelector('.tpw-already');
    if (btn) btn.textContent = 'Đang kiểm tra...';
    const paid = await check();
    if (paid) {
      hide();
      _showSuccessBanner('✓ Xác nhận thành công — đang mở khóa...');
      if (_cfg.onUnlock) await _cfg.onUnlock();
    } else {
      if (btn) btn.textContent = 'Chưa tìm thấy. Liên hệ hỗ trợ nếu đã thanh toán.';
    }
  }

  // ── Public: init ─────────────────────────────────────────────
  function init(config) {
    _cfg = config;
    _injectCss();
    _fetchPricing(); // prefetch in background
  }

  // ── Public: check access ──────────────────────────────────────
  async function check() {
    try {
      const slug = typeof _cfg.slug === 'function' ? _cfg.slug() : (_cfg.slug || '');
      if (!slug) return false;
      const userId = window.Auth?.isLoggedIn() ? window.Auth.getUser()?.id : null;
      if (!userId) return false;
      const r = await fetch(`/api/payment?action=check&slug=${encodeURIComponent(slug)}&userId=${encodeURIComponent(userId)}`);
      return (await r.json()).hasAccess === true;
    } catch(e) { return false; }
  }

  // ── Public: show ─────────────────────────────────────────────
  async function show() {
    // Fetch pricing first (uses cache after first call)
    await _fetchPricing();
    _buildModal();
    _modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _renderCta(); // async — fills in CTA after balance check
  }

  // ── Public: hide ─────────────────────────────────────────────
  function hide() {
    if (_modal) _modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ── Public: success banner ────────────────────────────────────
  function _showSuccessBanner(msg = '✓ Đã mở khóa thành công!') {
    const old = document.getElementById('tpw-success-banner');
    if (old) old.remove();
    const b = document.createElement('div');
    b.id = 'tpw-success-banner';
    b.className = 'tpw-success-banner';
    b.textContent = msg;
    document.body.appendChild(b);
    setTimeout(() => { b.style.transition = 'opacity .6s'; b.style.opacity = '0'; }, 5000);
    setTimeout(() => b.remove(), 5700);
  }

  return {
    init,
    check,
    show,
    hide,
    showSuccessBanner: _showSuccessBanner,
    _initiate:    show,   // legacy compat
    _checkAlready,
    _doDeduct,
    _doLogin,
    _doTopupInline,
  };

})();
