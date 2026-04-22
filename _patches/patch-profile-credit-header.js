// patch-profile-credit-header.js
// Thêm credit balance widget vào profile header — visible ngay khi vào trang
// Usage: node patch-profile-credit-header.js (chạy từ _patches/)

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public', 'profile.html');
let html = fs.readFileSync(filePath, 'utf8');

// ── PATCH 1: Add credit widget CSS ───────────────────────────
const OLD_SIGNOUT_CSS = `.profile-signout{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.8);padding:.5rem 1.1rem;border-radius:6px;cursor:pointer;font-size:.82rem;transition:all .2s}
.profile-signout:hover{background:rgba(255,255,255,.18)}`;

const NEW_SIGNOUT_CSS = `.profile-signout{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.8);padding:.5rem 1.1rem;border-radius:6px;cursor:pointer;font-size:.82rem;transition:all .2s}
.profile-signout:hover{background:rgba(255,255,255,.18)}
.credit-widget{background:rgba(255,255,255,.07);border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:.6rem 1rem;text-align:center;min-width:120px}
.credit-widget-label{color:rgba(255,255,255,.5);font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.2rem}
.credit-widget-value{color:#c9a84c;font-family:'Noto Serif',serif;font-size:1.3rem;font-weight:700;line-height:1}
.credit-widget-value small{font-size:.7rem;font-weight:400;color:rgba(255,255,255,.4);font-family:Arial,sans-serif}
.btn-topup-header{display:block;margin-top:.5rem;background:#c9a84c;color:#061A2E;font-size:.7rem;font-weight:700;padding:.3rem .6rem;border-radius:4px;text-decoration:none;text-align:center;transition:background .15s}
.btn-topup-header:hover{background:#f0d080}`;

if (html.includes(OLD_SIGNOUT_CSS)) {
  html = html.replace(OLD_SIGNOUT_CSS, NEW_SIGNOUT_CSS);
  console.log('✅ PATCH 1: Added credit widget CSS');
} else {
  console.log('⚠️  PATCH 1: signout CSS not found');
}

// ── PATCH 2: Add credit widget to profile header ──────────────
const OLD_HEADER = `    <div class="profile-header">
      <div class="avatar" id="avatarLetter">?</div>
      <div class="profile-info">
        <div class="profile-email" id="userEmail"></div>
        <div class="profile-name" id="userDisplayName">Người Dùng</div>
        <div class="profile-since" id="userSince"></div>
      </div>
      <button class="profile-signout" id="btnSignout">Đăng Xuất</button>
    </div>`;

const NEW_HEADER = `    <div class="profile-header">
      <div class="avatar" id="avatarLetter">?</div>
      <div class="profile-info">
        <div class="profile-email" id="userEmail"></div>
        <div class="profile-name" id="userDisplayName">Người Dùng</div>
        <div class="profile-since" id="userSince"></div>
      </div>
      <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;justify-content:flex-end">
        <div class="credit-widget">
          <div class="credit-widget-label">Credits</div>
          <div class="credit-widget-value" id="headerCreditBalance">
            <small>...</small>
          </div>
          <a href="/topup.html" class="btn-topup-header">💳 Nạp thêm</a>
        </div>
        <button class="profile-signout" id="btnSignout">Đăng Xuất</button>
      </div>
    </div>`;

if (html.includes(OLD_HEADER)) {
  html = html.replace(OLD_HEADER, NEW_HEADER);
  console.log('✅ PATCH 2: Added credit widget to profile header');
} else {
  console.log('⚠️  PATCH 2: Profile header not found');
}

// ── PATCH 3: Load balance on page init (not just on tab click) ─
const OLD_RENDER_HEADER = `  renderProfileHeader();
  document.getElementById('dashboard').style.display = 'block';
  loadHistory();
  setupTabs();`;

const NEW_RENDER_HEADER = `  renderProfileHeader();
  document.getElementById('dashboard').style.display = 'block';
  loadHistory();
  setupTabs();
  loadHeaderBalance();`;

if (html.includes(OLD_RENDER_HEADER)) {
  html = html.replace(OLD_RENDER_HEADER, NEW_RENDER_HEADER);
  console.log('✅ PATCH 3: Added loadHeaderBalance() to init');
} else {
  console.log('⚠️  PATCH 3: initProfile render block not found');
}

// ── PATCH 4: Add loadHeaderBalance function ───────────────────
const OLD_SIGNOUT_ONCLICK = `document.getElementById('btnSignout').onclick = () => Auth.signOut();`;

const NEW_SIGNOUT_ONCLICK = `document.getElementById('btnSignout').onclick = () => Auth.signOut();

// ── LOAD CREDIT BALANCE (header widget) ──
async function loadHeaderBalance() {
  if (!_pUser) return;
  try {
    const res = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(_pUser.id));
    const data = await res.json();
    const bal = data.balance ?? 0;
    const el = document.getElementById('headerCreditBalance');
    if (el) el.innerHTML = bal + ' <small>cr</small>';
    // Also update Credits tab if it's loaded
    const tabEl = document.getElementById('creditBalanceDisplay');
    if (tabEl) tabEl.innerHTML = bal + ' <span style="font-size:1rem;font-weight:400;color:rgba(255,255,255,.5)">credits</span>';
  } catch(e) {
    const el = document.getElementById('headerCreditBalance');
    if (el) el.innerHTML = '<small>—</small>';
  }
}`;

if (html.includes(OLD_SIGNOUT_ONCLICK)) {
  html = html.replace(OLD_SIGNOUT_ONCLICK, NEW_SIGNOUT_ONCLICK);
  console.log('✅ PATCH 4: Added loadHeaderBalance function');
} else {
  console.log('⚠️  PATCH 4: signOut onclick not found');
}

// ── PATCH 5: loadCredits() also refreshes header balance ──────
// Find the existing loadCredits function and add header sync
const OLD_LOAD_CREDITS_END = `    document.getElementById('transactionList').innerHTML =
      '<div style="color:var(--text-lt);font-size:.85rem">Không thể tải lịch sử.</div>';
  }
}`;

const NEW_LOAD_CREDITS_END = `    document.getElementById('transactionList').innerHTML =
      '<div style="color:var(--text-lt);font-size:.85rem">Không thể tải lịch sử.</div>';
  }
  // Sync header widget
  loadHeaderBalance();
}`;

if (html.includes(OLD_LOAD_CREDITS_END)) {
  html = html.replace(OLD_LOAD_CREDITS_END, NEW_LOAD_CREDITS_END);
  console.log('✅ PATCH 5: loadCredits() syncs header widget');
} else {
  console.log('⚠️  PATCH 5: loadCredits end not found (non-critical)');
}

// ── PATCH 6: Mobile responsive for header credit widget ───────
const OLD_MOBILE_CSS = `  .profile-header{flex-direction:column;text-align:center;gap:1rem;padding:1.5rem}`;
const NEW_MOBILE_CSS = `  .profile-header{flex-direction:column;text-align:center;gap:1rem;padding:1.5rem}
  .credit-widget{min-width:unset;width:100%}`;

if (html.includes(OLD_MOBILE_CSS)) {
  html = html.replace(OLD_MOBILE_CSS, NEW_MOBILE_CSS);
  console.log('✅ PATCH 6: Mobile responsive credit widget');
} else {
  console.log('⚠️  PATCH 6: Mobile CSS not found');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('\n✅ Done: credit balance widget added to profile header.');
