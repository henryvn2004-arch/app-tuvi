// patch-profile-credits.js
// Usage: node patch-profile-credits.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public', 'profile.html');
let html = fs.readFileSync(filePath, 'utf8');

// ── PATCH 1: Add Credits tab button ──────────────────────────
const OLD_TABS = `      <button class="tab-btn active" data-tab="lasos">🔮 Lá Số <span id="countLasos" class="chat-count" style="margin-left:.35rem;display:none"></span></button>
      <button class="tab-btn" data-tab="xemtuoi">💑 Xem Tuổi <span id="countXemTuoi" class="chat-count" style="margin-left:.35rem;display:none"></span></button>
      <button class="tab-btn" data-tab="chat">💬 Lịch Sử Chat <span id="countChat" class="chat-count" style="margin-left:.35rem;display:none"></span></button>
      <button class="tab-btn" data-tab="account">👤 Tài Khoản</button>`;

const NEW_TABS = `      <button class="tab-btn active" data-tab="lasos">🔮 Lá Số <span id="countLasos" class="chat-count" style="margin-left:.35rem;display:none"></span></button>
      <button class="tab-btn" data-tab="xemtuoi">💑 Xem Tuổi <span id="countXemTuoi" class="chat-count" style="margin-left:.35rem;display:none"></span></button>
      <button class="tab-btn" data-tab="chat">💬 Lịch Sử Chat <span id="countChat" class="chat-count" style="margin-left:.35rem;display:none"></span></button>
      <button class="tab-btn" data-tab="credits">💳 Credits</button>
      <button class="tab-btn" data-tab="account">👤 Tài Khoản</button>`;

if (html.includes(OLD_TABS)) {
  html = html.replace(OLD_TABS, NEW_TABS);
  console.log('✅ PATCH 1: Added Credits tab button');
} else {
  console.log('⚠️  PATCH 1: Tabs not found');
}

// ── PATCH 2: Add Credits tab content (before account tab) ────
const OLD_ACCOUNT_TAB = `    <!-- Tab: Tài Khoản -->
    <div class="tab-content" id="tab-account">`;

const NEW_CREDITS_AND_ACCOUNT = `    <!-- Tab: Credits -->
    <div class="tab-content" id="tab-credits">
      <div id="creditsContent">

        <!-- Balance Card -->
        <div style="background:var(--navy);border-radius:12px;padding:1.75rem 2rem;margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <div>
            <div style="color:rgba(255,255,255,.6);font-size:.78rem;margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.06em">Số Dư Credits</div>
            <div id="creditBalanceDisplay" style="color:#fff;font-family:'Noto Serif',serif;font-size:2.2rem;font-weight:700">
              <span style="opacity:.5;font-size:1rem">Đang tải...</span>
            </div>
            <div style="color:rgba(255,255,255,.45);font-size:.75rem;margin-top:.35rem">$1 = 10 credits · Không hết hạn</div>
          </div>
          <a href="/topup.html" style="display:inline-block;background:#c9a84c;color:#061A2E;padding:.75rem 1.5rem;border-radius:8px;font-size:.88rem;font-weight:700;text-decoration:none;transition:background .2s" onmouseover="this.style.background='#f0d080'" onmouseout="this.style.background='#c9a84c'">
            💳 Nạp Credits
          </a>
        </div>

        <!-- Quick Tools -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.25rem">
          <a href="/" style="background:#fff;border:1px solid var(--border-lt);border-radius:8px;padding:1rem;text-decoration:none;text-align:center;color:var(--navy);transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 12px rgba(6,26,46,.08)'" onmouseout="this.style.boxShadow=''">
            <div style="font-size:1.5rem;margin-bottom:.4rem">🔮</div>
            <div style="font-size:.8rem;font-weight:700">Luận Giải Lá Số</div>
            <div style="font-size:.72rem;color:var(--gold);font-weight:700;margin-top:.2rem">190 credits</div>
          </a>
          <a href="/xem-tuoi.html" style="background:#fff;border:1px solid var(--border-lt);border-radius:8px;padding:1rem;text-decoration:none;text-align:center;color:var(--navy);transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 12px rgba(6,26,46,.08)'" onmouseout="this.style.boxShadow=''">
            <div style="font-size:1.5rem;margin-bottom:.4rem">💑</div>
            <div style="font-size:.8rem;font-weight:700">Xem Tuổi Vợ Chồng</div>
            <div style="font-size:.72rem;color:var(--gold);font-weight:700;margin-top:.2rem">90 credits</div>
          </a>
          <a href="/xem-lam-an.html" style="background:#fff;border:1px solid var(--border-lt);border-radius:8px;padding:1rem;text-decoration:none;text-align:center;color:var(--navy);transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 12px rgba(6,26,46,.08)'" onmouseout="this.style.boxShadow=''">
            <div style="font-size:1.5rem;margin-bottom:.4rem">💼</div>
            <div style="font-size:.8rem;font-weight:700">Xem Tuổi Làm Ăn</div>
            <div style="font-size:.72rem;color:var(--gold);font-weight:700;margin-top:.2rem">90 credits</div>
          </a>
        </div>

        <!-- Transaction History -->
        <div class="account-section">
          <h3>Lịch Sử Giao Dịch</h3>
          <div id="transactionList"><div style="color:var(--text-lt);font-size:.85rem">Đang tải...</div></div>
        </div>

      </div>
    </div>

    <!-- Tab: Tài Khoản -->
    <div class="tab-content" id="tab-account">`;

if (html.includes(OLD_ACCOUNT_TAB)) {
  html = html.replace(OLD_ACCOUNT_TAB, NEW_CREDITS_AND_ACCOUNT);
  console.log('✅ PATCH 2: Added Credits tab content');
} else {
  console.log('⚠️  PATCH 2: Account tab not found');
}

// ── PATCH 3: Replace renderPurchases with credit transaction render ──
const OLD_RENDER_PURCHASES = `// ── RENDER PURCHASES ──
function renderPurchases(list) {
  const el = document.getElementById('purchaseList');
  if (!list || list.length === 0) {
    el.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Chưa có lịch sử thanh toán.</div>';
    return;
  }
  el.innerHTML = \`<div class="purchase-list">\${list.map(p => {
    const date = new Date(p.created_at).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
    const status = p.status === 'completed' ? 'completed' : '';
    const label = p.status === 'completed' ? 'Hoàn thành' : p.status;
    return \`<div class="purchase-item">
      <div class="purchase-slug">\${p.slug}</div>
      <div class="purchase-amount">$\${p.amount}</div>
      <span class="purchase-status \${status}">\${label}</span>
      <div class="purchase-date">\${date}</div>
    </div>\`;
  }).join('')}</div>\`;
}`;

const NEW_RENDER_PURCHASES = `// ── LOAD & RENDER CREDITS ──
async function loadCredits() {
  if (!_pToken || !_pUser) return;
  const userId = _pUser.id;

  // Balance
  try {
    const res = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
    const data = await res.json();
    const bal = data.balance ?? 0;
    document.getElementById('creditBalanceDisplay').innerHTML =
      bal + ' <span style="font-size:1rem;font-weight:400;color:rgba(255,255,255,.5)">credits</span>';
  } catch(e) {
    document.getElementById('creditBalanceDisplay').innerHTML = '<span style="opacity:.5;font-size:1rem">Lỗi tải</span>';
  }

  // Transactions
  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/credit_transactions?user_id=eq.' + encodeURIComponent(userId) +
      '&order=created_at.desc&limit=30&select=*',
      { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + _pToken } }
    );
    const txns = res.ok ? await res.json() : [];
    renderTransactions(txns);
  } catch(e) {
    document.getElementById('transactionList').innerHTML =
      '<div style="color:var(--text-lt);font-size:.85rem">Không thể tải lịch sử.</div>';
  }
}

function renderTransactions(list) {
  const el = document.getElementById('transactionList');
  if (!list || list.length === 0) {
    el.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Chưa có giao dịch nào.</div>';
    return;
  }
  const TYPE_LABELS = {
    topup: '💳 Nạp Credits',
    use_laso: '🔮 Luận Giải Lá Số',
    use_xem_tuoi: '💑 Xem Tuổi Vợ Chồng',
    use_xem_lam_an: '💼 Xem Tuổi Làm Ăn',
  };
  el.innerHTML = '<div class="purchase-list">' + list.map(t => {
    const date = new Date(t.created_at).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
    const isAdd = t.amount > 0;
    const amtStr = (isAdd ? '+' : '') + t.amount;
    const amtColor = isAdd ? 'var(--green)' : 'var(--red)';
    const label = TYPE_LABELS[t.type] || t.type;
    const desc = t.description || label;
    return '<div class="purchase-item">' +
      '<div class="purchase-slug">' + escHtml(desc) + '</div>' +
      '<div class="purchase-amount" style="color:' + amtColor + '">' + amtStr + ' cr</div>' +
      '<div class="purchase-date">' + date + '</div>' +
      '</div>';
  }).join('') + '</div>';
}

// ── RENDER PURCHASES (legacy — kept for backward compat) ──
function renderPurchases(list) {
  // no-op in credit system — credits shown in Credits tab
}`;

if (html.includes(OLD_RENDER_PURCHASES)) {
  html = html.replace(OLD_RENDER_PURCHASES, NEW_RENDER_PURCHASES);
  console.log('✅ PATCH 3: Replaced renderPurchases with credit transaction render');
} else {
  console.log('⚠️  PATCH 3: renderPurchases not found');
}

// ── PATCH 4: Call loadCredits when Credits tab is activated ──
// Add loadCredits() call inside setupTabs click handler
const OLD_SETUP_TABS = `function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}`;

const NEW_SETUP_TABS = `function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // Lazy-load credits tab
      if (btn.dataset.tab === 'credits') loadCredits();
    });
  });
}`;

if (html.includes(OLD_SETUP_TABS)) {
  html = html.replace(OLD_SETUP_TABS, NEW_SETUP_TABS);
  console.log('✅ PATCH 4: Added loadCredits() trigger to tab setup');
} else {
  console.log('⚠️  PATCH 4: setupTabs not found');
}

// ── PATCH 5: Add credits tab CSS ─────────────────────────────
// Add credit-specific styles after existing purchase-item styles
const OLD_PURCHASE_CSS = `.purchase-date{color:var(--text-lt);font-size:.75rem}`;
const NEW_PURCHASE_CSS = `.purchase-date{color:var(--text-lt);font-size:.75rem}

/* Credits tab */
.credit-balance-num{font-family:'Noto Serif',serif;font-size:2rem;font-weight:700;color:#fff}`;

if (html.includes(OLD_PURCHASE_CSS)) {
  html = html.replace(OLD_PURCHASE_CSS, NEW_PURCHASE_CSS);
  console.log('✅ PATCH 5: Added credits CSS');
} else {
  console.log('⚠️  PATCH 5: Purchase CSS anchor not found');
}

// ── PATCH 6: Handle #credits anchor on page load ──────────────
const OLD_INIT_PROFILE = `// ── BOOT ──
initProfile();`;

const NEW_INIT_PROFILE = `// ── Handle #credits anchor ──
if (window.location.hash === '#credits') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const btn = document.querySelector('[data-tab="credits"]');
      if (btn) btn.click();
    }, 1500); // Wait for auth init
  });
}

// ── BOOT ──
initProfile();`;

if (html.includes(OLD_INIT_PROFILE)) {
  html = html.replace(OLD_INIT_PROFILE, NEW_INIT_PROFILE);
  console.log('✅ PATCH 6: Added #credits anchor handler');
} else {
  console.log('⚠️  PATCH 6: Boot anchor not found');
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('\n✅ Done: public/profile.html patched with Credits tab.');
