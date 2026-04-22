// patch-xem-lam-an-credits.js
// Usage: node patch-xem-lam-an-credits.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public', 'xem-lam-an.html');
let html = fs.readFileSync(filePath, 'utf8');

// ── xem-lam-an.html is nearly identical to xem-tuoi.html ─────
// Same patches but with 'xem-lam-an' product names

// PATCH 1: verifyPaymentTuoi (same as xem-tuoi)
const OLD_VERIFY = `async function verifyPaymentTuoi(slug) {
  try {
    const r = await fetch('/api/payment?action=check&slug='+encodeURIComponent(slug));
    const d = await r.json();
    return d.purchased === true;
  } catch(e) { return false; }
}`;

const NEW_VERIFY = `async function getCreditBalance() {
  try {
    const userId = window.Auth?.getUser()?.id || '';
    if (!userId) return 0;
    const r = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
    const d = await r.json();
    return d.balance ?? 0;
  } catch(e) { return 0; }
}

async function checkCreditAccess(slug) {
  try {
    const userId = window.Auth?.getUser()?.id || '';
    if (!userId) return false;
    const r = await fetch('/api/payment?action=check&slug=' + encodeURIComponent(slug) + '&userId=' + encodeURIComponent(userId));
    const d = await r.json();
    return d.hasAccess === true;
  } catch(e) { return false; }
}

async function deductCredits(slug, toolType, amount, description) {
  const token = window.Auth?.getSession()?.access_token;
  if (!token) return { success: false, needLogin: true };
  try {
    const res = await fetch('/api/payment?action=deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ amount, toolType, slug, description }),
    });
    return await res.json();
  } catch(e) { return { success: false, error: e.message }; }
}

async function verifyPaymentTuoi(slug) {
  return await checkCreditAccess(slug);
}`;

if (html.includes(OLD_VERIFY)) {
  html = html.replace(OLD_VERIFY, NEW_VERIFY);
  console.log('✅ PATCH 1: Replaced verifyPaymentTuoi');
} else {
  console.log('⚠️  PATCH 1: Not found');
}

// PATCH 2: initiatePaymentTuoi
const OLD_INITIATE = `async function initiatePaymentTuoi(result, product) {
  // Delegate sang TuviPaywall
  _pendingSlug = buildSlug(result, product);
  TuviPaywall._initiate();
}`;

const NEW_INITIATE = `async function initiatePaymentTuoi(result, product) {
  _pendingSlug = buildSlug(result, product);
  await handleCreditUnlock(_pendingSlug, product, result);
}

async function handleCreditUnlock(slug, product, result) {
  if (!window.Auth?.isLoggedIn()) {
    showAuthModal(async () => { await handleCreditUnlock(slug, product, result); });
    return;
  }

  const COST = 90;
  const toolType = product === 'xem-lam-an' ? 'use_xem_lam_an' : 'use_xem_tuoi';
  const desc = product === 'xem-lam-an' ? 'Xem tuổi làm ăn' : 'Xem tuổi vợ chồng';

  const btn = document.querySelector('.btn-paywall-tuoi, .tvc-paywall-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }

  const data = await deductCredits(slug, toolType, COST, desc);

  if (data.success) {
    TuviPaywall.showSuccessBanner && TuviPaywall.showSuccessBanner();
    if (result) luanGiaiAll(result);
    return;
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Mở Khóa (' + COST + ' Credits)'; }

  if (data.needLogin) {
    showAuthModal(async () => { await handleCreditUnlock(slug, product, result); });
    return;
  }

  if (data.insufficientBalance) {
    const balance = data.balance ?? 0;
    const need = COST - balance;
    const overlay = document.querySelector('.tvc-paywall-inner, .paywall-lock');
    if (overlay) {
      const alert = document.createElement('div');
      alert.style.cssText = 'background:#FFF5F5;border:1px solid #f5c6c6;border-radius:8px;padding:12px 16px;margin-bottom:14px;color:#C0392B;font-size:13px;text-align:center';
      alert.innerHTML = 'Số dư: <strong>' + balance + ' credits</strong>. Cần thêm <strong>' + need + ' credits</strong>.<br><a href="/topup.html" style="color:#C0392B;font-weight:700">→ Nạp Credits</a>';
      const firstChild = overlay.firstElementChild;
      if (firstChild) overlay.insertBefore(alert, firstChild);
    }
    return;
  }

  alert('Lỗi: ' + (data.error || 'Vui lòng thử lại.'));
}`;

if (html.includes(OLD_INITIATE)) {
  html = html.replace(OLD_INITIATE, NEW_INITIATE);
  console.log('✅ PATCH 2: Replaced initiatePaymentTuoi');
} else {
  console.log('⚠️  PATCH 2: Not found');
}

// PATCH 3: analyze() check block (xem-lam-an version)
const OLD_CHECK = `    // Check if already paid
    // If returning from PayPal with _autoUnlock, skip re-checking
    if (window._autoUnlock) {
      // Return từ PayPal — unlock thẳng, không cần check slug
      window._autoUnlock = null;
      TuviPaywall.showSuccessBanner();
      luanGiaiAll(result);
    } else {
      const alreadyPaid = await TuviPaywall.check();
      if (alreadyPaid) {
        luanGiaiAll(result);
      } else {
        await luanGiaiSection(0, null, result);
        // Cho user 4 giây đọc section 0 trước khi hiện paywall
        await new Promise(r => setTimeout(r, 15000));
        showPaywall(result, 'xem-lam-an', 'Xem Tuổi Làm Ăn');
      }
    }`;

const NEW_CHECK = `    // Credit system: check access
    const alreadyPaid = await checkCreditAccess(_pendingSlug);
    if (alreadyPaid) {
      luanGiaiAll(result);
    } else {
      await luanGiaiSection(0, null, result);
      await new Promise(r => setTimeout(r, 15000));
      showPaywall(result, 'xem-lam-an', 'Xem Tuổi Làm Ăn');
    }`;

if (html.includes(OLD_CHECK)) {
  html = html.replace(OLD_CHECK, NEW_CHECK);
  console.log('✅ PATCH 3: Updated analyze() check (xem-lam-an)');
} else {
  console.log('⚠️  PATCH 3: analyze() check block not found');
}

// PATCH 4: Paywall price
const OLD_PRICE = `        <div class="tvc-paywall-price">$9</div>
        <div class="tvc-paywall-price-note">Bao gồm 9 phần luận giải + Vấn đáp không giới hạn</div>`;
const NEW_PRICE = `        <div class="tvc-paywall-price">90 Credits</div>
        <div class="tvc-paywall-price-note">≈ $9 · Credits không hết hạn · Dùng cho mọi công cụ</div>`;

if (html.includes(OLD_PRICE)) {
  html = html.replace(OLD_PRICE, NEW_PRICE);
  console.log('✅ PATCH 4: Updated paywall price');
} else {
  console.log('⚠️  PATCH 4: Not found');
}

// PATCH 5: Fix button onclick (double quotes issue)
html = html.replace(
  `onclick="initiatePaymentTuoi(_savedResult, "xem-tuoi")"`,
  `onclick="initiatePaymentTuoi(_savedResult, 'xem-lam-an')"`
);
// Also fix xem-lam-an version if it exists with wrong product name
html = html.replace(
  `onclick="initiatePaymentTuoi(_savedResult, "xem-lam-an")"`,
  `onclick="initiatePaymentTuoi(_savedResult, 'xem-lam-an')"`
);

// PATCH 6: checkPaymentOnLoad
const OLD_CHECK_ONLOAD = `async function checkPaymentOnLoad(product) {
  const p = new URLSearchParams(window.location.search);
  if (p.get('unlocked') !== '1') return false;`;

if (html.includes(OLD_CHECK_ONLOAD)) {
  // Find the full function and replace
  const funcStart = html.indexOf(OLD_CHECK_ONLOAD);
  const funcEnd = html.indexOf('\n}', funcStart) + 2;
  html = html.slice(0, funcStart) +
    `async function checkPaymentOnLoad(product) {
  // Credit system: no PayPal return flow
  return false;
}` + html.slice(funcEnd);
  console.log('✅ PATCH 6: Simplified checkPaymentOnLoad');
} else {
  console.log('⚠️  PATCH 6: Not found');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('\n✅ Done: public/xem-lam-an.html patched for credit system.');
