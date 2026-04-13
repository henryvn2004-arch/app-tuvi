/**
 * tuvi-paywall.js — Shared paywall module cho Tử Vi Minh Bảo
 *
 * Usage:
 *   TuviPaywall.init({
 *     product:        'laso' | 'xem-tuoi' | 'xem-lam-an',
 *     slug:           () => string,           // getter vì slug có thể chưa có lúc init
 *     price:          '$19' | '$9',
 *     features:       string[],               // bullet list inside modal
 *     sessionKey:     string,                 // key cho sessionStorage
 *     getFormData:    () => object,           // save form trước khi redirect
 *     restoreFormData:(data) => void,         // restore form sau khi return
 *     onUnlock:       async () => void,       // callback khi unlock xong
 *     buildSlug:      () => string,           // tính slug từ form
 *   });
 *
 *   TuviPaywall.check()   → Promise<boolean>   kiểm tra đã mua chưa
 *   TuviPaywall.show()    → hiện modal
 *   TuviPaywall.hide()    → ẩn modal
 *   TuviPaywall.onReturn()→ Promise<void>     gọi khi return từ PayPal
 */

const TuviPaywall = (() => {

  let _cfg = null;
  let _modal = null;

  // ── CSS inject once ──────────────────────────────────────────
  function _injectCss() {
    if (document.getElementById('tpw-css')) return;
    const s = document.createElement('style');
    s.id = 'tpw-css';
    s.textContent = `
.tpw-overlay {
  position: fixed; inset: 0;
  background: rgba(6,26,46,0.82);
  z-index: 8000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
  animation: tpw-in 0.25s ease;
}
@keyframes tpw-in { from { opacity:0; } to { opacity:1; } }
.tpw-box {
  background: #fff;
  border-radius: 14px;
  max-width: 460px; width: 100%;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(6,26,46,0.4);
  animation: tpw-up 0.28s cubic-bezier(.4,0,.2,1);
}
@keyframes tpw-up { from { transform:translateY(28px); opacity:0; } to { transform:none; opacity:1; } }
.tpw-header {
  background: linear-gradient(135deg, #061A2E 0%, #0D3B5E 100%);
  padding: 28px 32px 24px;
  text-align: center;
  position: relative;
}
.tpw-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 3px;
  text-transform: uppercase; color: #c9a84c; margin-bottom: 10px;
}
.tpw-title {
  font-family: 'Noto Serif', Georgia, serif;
  font-size: 22px; font-weight: 700; color: #fff;
  line-height: 1.3; margin-bottom: 8px;
}
.tpw-subtitle { font-size: 13px; color: #8BAACC; line-height: 1.6; }
.tpw-body { padding: 24px 32px 28px; }
.tpw-features {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-bottom: 20px;
}
.tpw-feature {
  display: flex; align-items: flex-start; gap: 7px;
  font-size: 13px; color: #444; line-height: 1.4;
}
.tpw-feature::before { content: '✦'; color: #c9a84c; flex-shrink:0; font-size: 10px; margin-top: 2px; }
.tpw-price-row {
  text-align: center; margin-bottom: 18px;
  padding: 14px; background: #f9f7f2;
  border: 1px solid #e8d9b0; border-radius: 8px;
}
.tpw-price {
  font-size: 42px; font-weight: 700; color: #061A2E;
  font-family: 'Noto Serif', Georgia, serif; line-height: 1;
}
.tpw-price-note { font-size: 12px; color: #999; margin-top: 4px; }
.tpw-btn {
  width: 100%; padding: 15px; background: #061A2E; color: #c9a84c;
  border: 2px solid #c9a84c; border-radius: 6px;
  font-size: 13px; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.tpw-btn:hover:not(:disabled) { background: #c9a84c; color: #061A2E; }
.tpw-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.tpw-secure {
  text-align: center; font-size: 11px; color: #aaa; margin-top: 10px;
}
.tpw-divider {
  display: flex; align-items: center; gap: 10px;
  margin: 16px 0; color: #aaa; font-size: 12px;
}
.tpw-divider::before,.tpw-divider::after {
  content: ''; flex: 1; height: 1px; background: #eee;
}
.tpw-already {
  text-align: center; font-size: 12px; color: #9A7B3A;
  cursor: pointer; background: none; border: none;
  font-family: inherit; padding: 0; text-decoration: underline;
}
.tpw-already:hover { color: #061A2E; }
/* Success banner */
.tpw-success-banner {
  position: fixed; top: 72px; left: 50%; transform: translateX(-50%);
  background: #1E6B3C; color: #fff;
  padding: 12px 28px; border-radius: 8px;
  font-size: 13px; font-weight: 600; z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  text-align: center; white-space: nowrap;
  animation: tpw-in 0.3s ease;
}
@media(max-width:600px) {
  .tpw-box { border-radius: 10px; }
  .tpw-header { padding: 20px 20px 18px; }
  .tpw-body { padding: 18px 20px 22px; }
  .tpw-features { grid-template-columns: 1fr; }
  .tpw-price { font-size: 36px; }
}
`;
    document.head.appendChild(s);
  }

  // ── Build modal DOM ──────────────────────────────────────────
  function _buildModal() {
    if (_modal) return;
    _injectCss();
    const { price, features, product } = _cfg;

    const titleMap = {
      laso:        'Mở khóa 24 phần luận giải',
      'xem-tuoi':  'Mở khóa 9 phần luận giải',
      'xem-lam-an':'Mở khóa 9 phần luận giải',
    };
    const subMap = {
      laso:        'Luận giải chuyên sâu 12 cung, 9 đại vận và tiểu vận từng năm — riêng cho lá số của bạn.',
      'xem-tuoi':  'Phân tích chuyên sâu 8 yếu tố tương hợp — luận giải AI cho từng chiều hôn nhân.',
      'xem-lam-an':'Phân tích chuyên sâu 8 yếu tố hợp tác — luận giải AI theo góc độ kinh doanh.',
    };
    const noteMap = {
      laso: 'Thanh toán một lần · Truy cập vĩnh viễn · Xuất PDF',
      'xem-tuoi': 'Thanh toán một lần · Bao gồm Vấn Đáp AI',
      'xem-lam-an': 'Thanh toán một lần · Bao gồm Vấn Đáp AI',
    };

    const defaultFeatures = {
      laso: ['12 cung luận giải chi tiết','9 đại vận + tiểu vận','Cách cục & ý nghĩa','Vấn đáp AI không giới hạn','Lưu & xem lại mọi lúc','Xuất PDF đầy đủ'],
      'xem-tuoi': ['8 yếu tố phân tích chi tiết','Tương quan cung Phu Thê','Đại vận so sánh','Vấn đáp AI 2 lá số','9 phần luận giải AI','Lưu kết quả vĩnh viễn'],
      'xem-lam-an': ['8 yếu tố hợp tác chi tiết','Tương quan cung Nô Bộc','Đại vận so sánh','Vấn đáp AI 2 lá số','9 phần luận giải AI','Lưu kết quả vĩnh viễn'],
    };

    const feats = features || defaultFeatures[product] || [];

    _modal = document.createElement('div');
    _modal.id = 'tpw-overlay';
    _modal.className = 'tpw-overlay';
    _modal.innerHTML = `
      <div class="tpw-box" id="tpw-box">
        <div class="tpw-header">
          <div class="tpw-eyebrow">紫微明寶 · Mở Khóa</div>
          <div class="tpw-title">${titleMap[product] || 'Mở khóa luận giải'}</div>
          <div class="tpw-subtitle">${subMap[product] || ''}</div>
        </div>
        <div class="tpw-body">
          <div class="tpw-features">
            ${feats.map(f => `<div class="tpw-feature">${f}</div>`).join('')}
          </div>
          <div class="tpw-price-row">
            <div class="tpw-price">${price}</div>
            <div class="tpw-price-note">${noteMap[product] || 'Thanh toán một lần'}</div>
          </div>
          <button class="tpw-btn" id="tpw-pay-btn" onclick="TuviPaywall._initiate()">
            <span id="tpw-btn-text">Mở Khóa Ngay →</span>
          </button>
          <div class="tpw-secure">🔒 Thanh toán bảo mật qua PayPal · Hoàn tiền nếu lỗi kỹ thuật</div>
          <div class="tpw-divider">hoặc</div>
          <button class="tpw-already" onclick="TuviPaywall._checkAlready()">Đã thanh toán rồi? Nhấn để mở khóa</button>
        </div>
      </div>`;

    // Click outside box → nothing (không close vì cần payment)
    _modal.addEventListener('click', e => {
      if (e.target === _modal) {
        const box = document.getElementById('tpw-box');
        if (box) { box.style.animation = 'none'; box.style.transform = 'scale(0.97)'; setTimeout(() => { box.style.transform = ''; box.style.animation = ''; }, 150); }
      }
    });

    document.body.appendChild(_modal);
  }

  // ── Public: init ─────────────────────────────────────────────
  function init(config) {
    _cfg = config;
    _injectCss();
  }

  // ── Public: check if already paid ────────────────────────────
  async function check() {
    if (process?.env?.PAYWALL_DISABLED === 'true') return true;
    try {
      const slug = typeof _cfg.slug === 'function' ? _cfg.slug() : _cfg.slug;
      if (!slug) return false;
      const userId = window.Auth?.isLoggedIn() ? window.Auth.getUser()?.id : null;
      const url = `/api/payment?action=check&slug=${encodeURIComponent(slug)}${userId ? '&userId=' + userId : ''}`;
      const r = await fetch(url);
      const d = await r.json();
      return d.purchased === true;
    } catch(e) { return false; }
  }

  // ── Public: show modal ───────────────────────────────────────
  function show() {
    _buildModal();
    _modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // ── Public: hide modal ───────────────────────────────────────
  function hide() {
    if (_modal) _modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ── Internal: initiate payment ───────────────────────────────
  async function _initiate() {
    const btn  = document.getElementById('tpw-pay-btn');
    const text = document.getElementById('tpw-btn-text');
    if (btn) { btn.disabled = true; }
    if (text) text.textContent = 'Đang kết nối PayPal...';

    try {
      // Save form data to sessionStorage
      if (_cfg.getFormData && _cfg.sessionKey) {
        try {
          sessionStorage.setItem(_cfg.sessionKey, JSON.stringify(_cfg.getFormData()));
        } catch(e) {}
      }

      const slug = typeof _cfg.slug === 'function' ? _cfg.slug() : _cfg.slug;
      const price = _cfg.price?.replace('$', '') || '19.00';

      const res = await fetch('/api/payment?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, amount: price }),
      });
      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error(data.error || 'Không tạo được đơn PayPal');
      }
    } catch(e) {
      if (btn) btn.disabled = false;
      if (text) text.textContent = 'Mở Khóa Ngay →';
      alert('Lỗi kết nối PayPal: ' + e.message);
    }
  }

  // ── Internal: check already paid (manual trigger) ────────────
  async function _checkAlready() {
    const btn = document.getElementById('tpw-pay-btn');
    if (btn) { btn.disabled = true; }
    const already = document.querySelector('.tpw-already');
    if (already) already.textContent = 'Đang kiểm tra...';

    const paid = await check();
    if (paid) {
      _showSuccessBanner('✓ Xác nhận thanh toán thành công!');
      hide();
      if (_cfg.onUnlock) await _cfg.onUnlock();
    } else {
      if (btn) btn.disabled = false;
      if (already) already.textContent = 'Chưa tìm thấy thanh toán. Vui lòng liên hệ hỗ trợ.';
    }
  }

  // ── Public: handle return from PayPal ───────────────────────
  async function onReturn() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('unlocked') !== '1') return false;

    // Restore form data
    const sessionKey = _cfg.sessionKey;
    let pending = null;
    if (sessionKey) {
      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw) { pending = JSON.parse(raw); sessionStorage.removeItem(sessionKey); }
      } catch(e) {}
    }

    if (pending && _cfg.restoreFormData) {
      _cfg.restoreFormData(pending);
    }

    return { pending, slug: p.get('slug') };
  }

  // ── Public: show success banner ──────────────────────────────
  function _showSuccessBanner(msg = '✓ Thanh toán thành công — Đang luận giải...') {
    const existing = document.getElementById('tpw-success-banner');
    if (existing) existing.remove();
    const b = document.createElement('div');
    b.id = 'tpw-success-banner';
    b.className = 'tpw-success-banner';
    b.textContent = msg;
    document.body.appendChild(b);
    setTimeout(() => { b.style.transition = 'opacity 0.6s'; b.style.opacity = '0'; }, 6000);
    setTimeout(() => b.remove(), 6700);
  }

  return {
    init,
    check,
    show,
    hide,
    onReturn,
    showSuccessBanner: _showSuccessBanner,
    _initiate,
    _checkAlready,
  };
})();
