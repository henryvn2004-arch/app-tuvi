// patch-index-credits.js
// Usage: node patch-index-credits.js
// Chạy từ thư mục gốc của repo (chỗ có public/index.html)

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// ── PATCH 1: Replace verifyPayment function ───────────────────
const OLD_VERIFY = `  async function verifyPayment(slug) {
    try {
      const r = await fetch(\`/api/payment?action=check&slug=\${encodeURIComponent(slug)}\`);
      const d = await r.json();
      return d.purchased === true;
    } catch(e) { return false; }
  }`;

const NEW_VERIFY = `  // Credit system: check if user already spent credits for this slug
  async function verifyPayment(slug) {
    try {
      const userId = window.Auth?.getUser()?.id || '';
      if (!userId) return false;
      const r = await fetch('/api/payment?action=check&slug=' + encodeURIComponent(slug) + '&userId=' + encodeURIComponent(userId));
      const d = await r.json();
      return d.hasAccess === true;
    } catch(e) { return false; }
  }

  // Get user's credit balance
  async function getCreditBalance() {
    try {
      const userId = window.Auth?.getUser()?.id || '';
      if (!userId) return 0;
      const r = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
      const d = await r.json();
      return d.balance ?? 0;
    } catch(e) { return 0; }
  }

  // Deduct credits and unlock
  async function deductAndUnlock(slug) {
    const token = window.Auth?.getSession()?.access_token;
    if (!token) { showAuthModal(() => deductAndUnlock(slug)); return; }
    const btn = document.getElementById('btn-paywall-pay') || document.getElementById('btn-credit-unlock');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>Đang xử lý...</span>'; }
    try {
      const res = await fetch('/api/payment?action=deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ amount: 190, toolType: 'use_laso', slug, description: 'Luận giải lá số 24 phần' }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove paywall, start Claude
        const gate = document.getElementById('paywall-gate');
        if (gate) gate.remove();
        await startClaudeOrLoadCache(slug);
      } else if (data.insufficientBalance) {
        // Not enough credits — show topup CTA
        const balance = data.balance ?? 0;
        const need = 190 - balance;
        const gate = document.getElementById('paywall-gate');
        if (gate) gate.innerHTML = renderInsufficientCreditsHTML(balance, need, slug);
      } else {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>Mở Khóa (190 Credits)</span><span>→</span>'; }
        alert('Lỗi: ' + (data.error || 'Không thể trừ credits.'));
      }
    } catch(e) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>Mở Khóa (190 Credits)</span><span>→</span>'; }
      alert('Lỗi kết nối. Vui lòng thử lại.');
    }
  }

  function renderInsufficientCreditsHTML(balance, need, slug) {
    return \`
      <div class="paywall-eyebrow">紫微明寶 · Luận Giải Đầy Đủ</div>
      <div class="paywall-title">Mở khóa 24 phần luận giải chuyên sâu</div>
      <div style="background:#FFF5F5;border:1px solid #f5c6c6;border-radius:8px;padding:14px 18px;margin-bottom:20px;color:#C0392B;font-size:13px">
        Số dư hiện tại: <strong>\${balance} credits</strong>. Bạn cần thêm <strong>\${need} credits</strong> để mở khóa.
      </div>
      <div class="paywall-price">190 Credits</div>
      <div class="paywall-price-note">Số dư không đủ — vui lòng nạp thêm credits</div>
      <a href="/topup.html" class="btn-paywall" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none">
        <span>💳 Nạp Credits</span>
        <span style="font-size:16px">→</span>
      </a>
      <div class="paywall-secure">🔒 $1 = 10 credits · Không hết hạn · Dùng cho mọi công cụ</div>
    \`;
  }`;

if (html.includes(OLD_VERIFY)) {
  html = html.replace(OLD_VERIFY, NEW_VERIFY);
  console.log('✅ PATCH 1: Replaced verifyPayment with credit system');
} else {
  console.log('⚠️  PATCH 1: verifyPayment not found (may already patched)');
}

// ── PATCH 2: Replace renderPaywall function ───────────────────
// Find the paywall render function and update price display + button
const OLD_PAYWALL_PRICE = `      <div class="paywall-price">$19</div>
      <div class="paywall-price-note">Xem offline thường 500k–1tr · Ở đây chỉ $19, nhận kết quả ngay</div>
      <button class="btn-paywall" id="btn-paywall-pay" onclick="initiatePayment()">
        <span>Xem Luận Giải Đầy Đủ</span>
        <span style="font-size:16px">→</span>
      </button>`;

const NEW_PAYWALL_PRICE = `      <div id="paywall-balance-display" style="font-size:12px;color:#9A7B3A;margin-bottom:6px"></div>
      <div class="paywall-price">190 Credits</div>
      <div class="paywall-price-note">Bằng $19 · Nạp 1 lần, dùng mọi công cụ · Credits không hết hạn</div>
      <button class="btn-paywall" id="btn-paywall-pay" onclick="handlePaywallClick()">
        <span>Mở Khóa (190 Credits)</span>
        <span style="font-size:16px">→</span>
      </button>`;

if (html.includes(OLD_PAYWALL_PRICE)) {
  html = html.replace(OLD_PAYWALL_PRICE, NEW_PAYWALL_PRICE);
  console.log('✅ PATCH 2: Updated paywall price display');
} else {
  console.log('⚠️  PATCH 2: Paywall price block not found (check manually)');
}

// ── PATCH 3: Replace initiatePayment with credit-based handler ─
const OLD_INITIATE_START = `  // ── Khởi tạo PayPal payment ──
  async function initiatePayment() {`;
const OLD_INITIATE_END = `    // Tạo PayPal order
    try {
      const res = await fetch('/api/payment?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error(data.error || 'Không tạo được đơn PayPal');
      }
    } catch(e) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>Xem Luận Giải Đầy Đủ</span><span style="font-size:16px">→</span>'; }
      alert('Lỗi kết nối PayPal: ' + e.message + '\\nVui lòng thử lại.');
    }
  }`;

const NEW_INITIATE = `  // ── Credit-based unlock ──
  async function handlePaywallClick() {
    if (!window.Auth?.isLoggedIn()) {
      showAuthModal(async () => { await handlePaywallClick(); });
      return;
    }
    const balance = await getCreditBalance();
    if (balance >= 190) {
      await deductAndUnlock(_pendingSlug);
    } else {
      const need = 190 - balance;
      const gate = document.getElementById('paywall-gate');
      if (gate) gate.innerHTML = renderInsufficientCreditsHTML(balance, need, _pendingSlug);
    }
  }

  // Legacy alias (some code may still call this)
  async function initiatePayment() { await handlePaywallClick(); }`;

// Find and replace the full initiatePayment block
const startIdx = html.indexOf(OLD_INITIATE_START);
if (startIdx !== -1) {
  const endIdx = html.indexOf(OLD_INITIATE_END, startIdx);
  if (endIdx !== -1) {
    const endPos = endIdx + OLD_INITIATE_END.length;
    html = html.slice(0, startIdx) + NEW_INITIATE + html.slice(endPos);
    console.log('✅ PATCH 3: Replaced initiatePayment with credit handler');
  } else {
    console.log('⚠️  PATCH 3: Could not find end of initiatePayment function');
  }
} else {
  console.log('⚠️  PATCH 3: initiatePayment start not found (may already patched)');
}

// ── PATCH 4: Update checkPaymentOnLoad (URL param check) ──────
// Replace the URL param check block that looked for ?unlocked=1
const OLD_URL_CHECK = `    // Check từ URL param (return từ PayPal)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('unlocked') === '1' && urlParams.get('slug')) {
      _pendingSlug = urlParams.get('slug');
      const paid = await verifyPayment(_pendingSlug);
      if (paid) { await startClaudeOrLoadCache(_pendingSlug); return; }
    }

    // Check Supabase purchases
    let userId = null;
    if (window.supabaseClient) {
      const { data: { session } } = await window.supabaseClient.auth.getSession().catch(() => ({data:{session:null}}));
      userId = session?.user?.id || null;
    }
    try {
      const r = await fetch(\`/api/payment?action=check&slug=\${encodeURIComponent(tempSlug)}\${userId?'&userId='+userId:''}\`);
      const d = await r.json();
      if (d.purchased) { await startClaudeOrLoadCache(tempSlug || _pendingSlug); return; }
    } catch(e) {}
    // Chưa mua — lock boxes đã hiển thị, không cần làm gì thêm`;

const NEW_URL_CHECK = `    // Check credit access (đã từng dùng credits cho slug này chưa?)
    const userId = window.Auth?.getUser()?.id || '';
    if (userId) {
      try {
        const r = await fetch('/api/payment?action=check&slug=' + encodeURIComponent(tempSlug) + '&userId=' + encodeURIComponent(userId));
        const d = await r.json();
        if (d.hasAccess) { await startClaudeOrLoadCache(tempSlug || _pendingSlug); return; }
      } catch(e) {}
    }

    // Chưa có access — hiển thị paywall với credit balance
    if (userId) {
      const balance = await getCreditBalance();
      const displayEl = document.getElementById('paywall-balance-display');
      if (displayEl) displayEl.textContent = 'Số dư: ' + balance + ' credits';
    }`;

if (html.includes(OLD_URL_CHECK)) {
  html = html.replace(OLD_URL_CHECK, NEW_URL_CHECK);
  console.log('✅ PATCH 4: Updated URL param check to credit check');
} else {
  console.log('⚠️  PATCH 4: URL check block not found (check manually)');
}

// ── PATCH 5: Update secure text in paywall ─────────────────────
const OLD_SECURE = `      <div class="paywall-secure">🔒 Thanh toán bảo mật qua PayPal · Hoàn tiền nếu lỗi kỹ thuật</div>`;
const NEW_SECURE = `      <div class="paywall-secure">🔒 Credits không hết hạn · Dùng được cho mọi công cụ · <a href="/topup.html" style="color:#c9a84c">Nạp thêm →</a></div>`;

if (html.includes(OLD_SECURE)) {
  html = html.replace(OLD_SECURE, NEW_SECURE);
  console.log('✅ PATCH 5: Updated secure text');
} else {
  console.log('⚠️  PATCH 5: Secure text not found');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('\n✅ Done: public/index.html patched for credit system.');
console.log('📝 Manually verify: verifyPayment, initiatePayment, paywall HTML');
