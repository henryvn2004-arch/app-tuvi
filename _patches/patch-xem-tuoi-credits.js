// patch-xem-tuoi-credits.js
// Usage: node patch-xem-tuoi-credits.js
// Chạy từ thư mục gốc của repo

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public', 'xem-tuoi.html');
let html = fs.readFileSync(filePath, 'utf8');

// ── PATCH 1: Replace verifyPaymentTuoi ───────────────────────
const OLD_VERIFY = `async function verifyPaymentTuoi(slug) {
  try {
    const r = await fetch('/api/payment?action=check&slug='+encodeURIComponent(slug));
    const d = await r.json();
    return d.purchased === true;
  } catch(e) { return false; }
}`;

const NEW_VERIFY = `// Credit system helpers
async function getCreditBalance() {
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

// Legacy alias kept for TuviPaywall compatibility
async function verifyPaymentTuoi(slug) {
  return await checkCreditAccess(slug);
}`;

if (html.includes(OLD_VERIFY)) {
  html = html.replace(OLD_VERIFY, NEW_VERIFY);
  console.log('✅ PATCH 1: Replaced verifyPaymentTuoi with credit helpers');
} else {
  console.log('⚠️  PATCH 1: verifyPaymentTuoi not found');
}

// ── PATCH 2: Replace initiatePaymentTuoi ─────────────────────
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
  // Require login
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
    // Hide paywall, unlock
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
    // Update paywall to show top-up CTA
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
  console.log('✅ PATCH 2: Replaced initiatePaymentTuoi with credit handler');
} else {
  console.log('⚠️  PATCH 2: initiatePaymentTuoi not found');
}

// ── PATCH 3: Update TuviPaywall.init onUnlock (already correct) ─
// The onUnlock: () => luanGiaiAll(_savedResult) stays, that's fine
// Just need to make sure TuviPaywall's _initiate is overridden

// ── PATCH 4: Update analyze() — replace TuviPaywall.check() ──
const OLD_CHECK_BLOCK = `    // Check if already paid
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
        showPaywall(result, 'xem-tuoi', 'Xem Tuổi Vợ Chồng');
      }
    }`;

const NEW_CHECK_BLOCK = `    // Credit system: check access
    const alreadyPaid = await checkCreditAccess(_pendingSlug);
    if (alreadyPaid) {
      luanGiaiAll(result);
    } else {
      await luanGiaiSection(0, null, result);
      await new Promise(r => setTimeout(r, 15000));
      showPaywall(result, 'xem-tuoi', 'Xem Tuổi Vợ Chồng');
    }`;

if (html.includes(OLD_CHECK_BLOCK)) {
  html = html.replace(OLD_CHECK_BLOCK, NEW_CHECK_BLOCK);
  console.log('✅ PATCH 4: Updated analyze() credit check (xem-tuoi)');
} else {
  console.log('⚠️  PATCH 4: analyze() check block not found');
}

// ── PATCH 5: Update paywall price display ────────────────────
const OLD_PRICE = `        <div class="tvc-paywall-price">$9</div>
        <div class="tvc-paywall-price-note">Bao gồm 9 phần luận giải + Vấn đáp không giới hạn</div>`;
const NEW_PRICE = `        <div class="tvc-paywall-price">90 Credits</div>
        <div class="tvc-paywall-price-note">≈ $9 · Credits không hết hạn · Dùng cho mọi công cụ</div>`;

if (html.includes(OLD_PRICE)) {
  html = html.replace(OLD_PRICE, NEW_PRICE);
  console.log('✅ PATCH 5: Updated paywall price to 90 credits');
} else {
  console.log('⚠️  PATCH 5: Paywall price not found');
}

// ── PATCH 6: Update paywall button text ──────────────────────
const OLD_BTN = `          <button class="tvc-paywall-btn" onclick="initiatePaymentTuoi(_savedResult, "xem-tuoi")">`;
const NEW_BTN = `          <button class="tvc-paywall-btn" onclick="initiatePaymentTuoi(_savedResult, 'xem-tuoi')">`;

// Also update button inner text if needed
// The button text itself is inside — let's check and update
const OLD_BTN_TEXT = `Mở khóa luận giải đầy đủ`;
// This is inside the tvc-paywall-btn — leave as-is, the label conveys action

// Fix button onclick syntax issue (double quotes in attribute)
html = html.replace(
  `onclick="initiatePaymentTuoi(_savedResult, "xem-tuoi")"`,
  `onclick="initiatePaymentTuoi(_savedResult, 'xem-tuoi')"`
);

// ── PATCH 7: checkPaymentOnLoad — remove PayPal return logic ─
const OLD_CHECK_ONLOAD = `async function checkPaymentOnLoad(product) {
  const p = new URLSearchParams(window.location.search);
  if (p.get('unlocked') !== '1') return false;
  const slug = p.get('slug') || '';
  try {
    const raw = sessionStorage.getItem('tuvi_pending_form_' + product);
    if (!raw) return false;
    const pending = JSON.parse(raw);
    sessionStorage.removeItem('tuvi_pending_form_' + product);
    // Restore form
    TuviForm.setData({hoten:pending.nameA||'',gioitinh:pending.gtA||'nam',
      ngay:pending.ngayA||0,thang:pending.thangA||0,nam:pending.namA||0,
      gioHour:pending.gioHourA||0,gioPhut:pending.gioPhutA||0},'a');
    TuviForm.setData({hoten:pending.nameB||'',gioitinh:pending.gtB||'nu',
      ngay:pending.ngayB||0,thang:pending.thangB||0,nam:pending.namB||0,
      gioHour:pending.gioHourB||0,gioPhut:pending.gioPhutB||0},'b');
    if (document.getElementById('nam-xem')) document.getElementById('nam-xem').value = pending.namXem||'2026';
    _pendingSlug = toSlugAscii(slug);
    window._autoUnlock = toSlugAscii(slug);
    await analyze();
    window.history.replaceState({}, '', window.location.pathname);
    return true;
  } catch(e) { console.error('[paywall] restore error', e); return false; }
}`;

const NEW_CHECK_ONLOAD = `async function checkPaymentOnLoad(product) {
  // Credit system: no PayPal redirect return — nothing to restore from URL
  // Credits are deducted inline, no page redirect needed
  return false;
}`;

if (html.includes(OLD_CHECK_ONLOAD)) {
  html = html.replace(OLD_CHECK_ONLOAD, NEW_CHECK_ONLOAD);
  console.log('✅ PATCH 7: Simplified checkPaymentOnLoad');
} else {
  console.log('⚠️  PATCH 7: checkPaymentOnLoad not found');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('\n✅ Done: public/xem-tuoi.html patched for credit system.');
