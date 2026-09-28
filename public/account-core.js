/* ============================================================
   account-core.js — Logic trang Hồ sơ `/app/ho-so` (= /app/tai-khoan,
   app-tai-khoan.html): 3 tab Ví Lượng / Kết nối / Cài đặt. Lịch sử
   (lá số, báo cáo, lượt Hỏi Thầy) KHÔNG ở đây — nó là trang riêng của
   sidebar (/app/so-la-so, /app/bao-cao, /app/tro-chuyen).
   Thao tác trên id cố định; host tự lo chrome + icon renderer
   (window.mountIcons/iconHtml từ nav.js, hoặc shim ở trang shell).
   sourceType: script (không module) — hàm top-level = global cho onclick.
   ============================================================ */
var SUPABASE_URL  = 'https://dciwkfdqhhddeymlisey.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

var _pUser = null;
// Lưới an toàn soft-nav: mọi hàm `load*`/`render*` dưới đây có thể còn treo
// sau một `fetch()` khi người dùng đã soft-nav rời trang — "nghĩa địa" của
// shell-soft-nav.js giữ phần tử id cũ SỐNG (vô hình) chỉ 15 giây; fetch chậm
// hơn mốc đó thì phần tử THẬT SỰ biến mất, `getElementById` ra `null` giữa
// chừng. Cờ này chặn TỪNG continuation trước khi đụng DOM — không đủ để gộp
// lại một chỗ vì các hàm nằm rải khắp file, không đi qua một chokepoint
// chung như `Shell.setContext()`.
var _hoSoLeftPage = false;
document.addEventListener('tvmb:softnav', () => { _hoSoLeftPage = true; });
// 🔑 KHÔNG chụp token vào biến rồi dùng cả phiên trang: access token Supabase
// sống ~1 giờ, mà trang Tài khoản hay bị để mở rất lâu → mọi lượt gọi sau đó
// ăn 401 với đúng người đang đăng nhập. Đọc SỐNG mỗi lần dùng; auth.js lo
// phần xoay token (hẹn giờ + soát lúc tab sáng lại).
async function _tok() {
  try {
    if (window.Auth?.getFreshToken) return (await window.Auth.getFreshToken()) || null;
    return window.Auth?.getSession()?.access_token || null; // đường lùi: auth.js bản cũ còn trong cache
  } catch (e) { return null; }
}
// Lá số gần nhất — CHỈ để đính kèm vào góp ý (fbMeta), nạp lười khi mở Góp ý.
var _pHistoryData = null;

// ── AUTH INIT ──
async function initProfile() {
  // auth.js có thể đang refresh async — đợi tối đa 1.5s
  const deadline = Date.now() + 1500;
  while (!window.Auth?.isLoggedIn() && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 100));
  }

  // Null-safe: nếu người dùng đã rời trang (điều hướng mềm sang trang khác)
  // TRONG lúc đợi ở trên, các id này không còn trong DOM hiện tại nữa — gọi
  // thẳng `.style` sẽ ném lỗi giữa chừng, cắt ngang các dòng CÒN LẠI của hàm
  // (kể cả với trang tải mới bình thường, phòng hờ nếu id trang đổi tên).
  var elAuthLoading = document.getElementById('authLoading');
  if (elAuthLoading) elAuthLoading.style.display = 'none';

  if (!window.Auth?.isLoggedIn()) {
    var elNotLoggedIn = document.getElementById('notLoggedIn');
    if (elNotLoggedIn) elNotLoggedIn.style.display = 'block';
    return;
  }

  _pUser  = window.Auth.getUser();

  renderProfileHeader();
  var elDashboard = document.getElementById('dashboard');
  if (elDashboard) elDashboard.style.display = 'block';
  // Sub-nav Cài đặt gắn TRƯỚC setupTabs(): hash `#gopy` bấm vào pane ngay lúc mở tab.
  setupAccountSettingsNav();
  setupTabs();
  setupThemeChoice();
  if (window.mountIcons) window.mountIcons();
}

// SVG icon inline (Lucide qua nav.js) — dùng trong template JS thay cho emoji.
function ic(key, px) {
  px = px || 14;
  const svg = window.iconHtml ? window.iconHtml(key) : '';
  return '<span style="display:inline-flex;width:' + px + 'px;height:' + px + 'px;vertical-align:-2px;color:currentColor">' + svg + '</span>';
}

// Sub-nav trong tab Cài đặt (Thông tin cá nhân/Bảo mật/Giao diện/Góp ý).
function setupAccountSettingsNav() {
  const btns = document.querySelectorAll('#tab-account .setnav-btn');
  const panes = document.querySelectorAll('#tab-account .setpane');
  if (!btns.length) return;
  btns.forEach(btn => btn.addEventListener('click', () => {
    btns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const key = btn.dataset.pane;
    panes.forEach(p => p.classList.toggle('active', p.dataset.pane === key));
    if (key === 'gopy') loadFeedback();
  }));
}

// Nút chọn Sáng/Tối trong tab Tài Khoản — dùng CHUNG khoá localStorage
// `app_theme` với nút "Đổi nền" ở sidebar (shell.js `toggleTheme()`), không
// dựng cơ chế thứ hai lệch nhau.
function setupThemeChoice() {
  const btns = document.querySelectorAll('#tab-account .theme-btn');
  if (!btns.length) return;
  function current() {
    return document.documentElement.dataset.theme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function paint() {
    const t = current();
    btns.forEach(b => b.classList.toggle('active', b.dataset.themeChoice === t));
  }
  btns.forEach(btn => btn.addEventListener('click', () => {
    const t = btn.dataset.themeChoice;
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('app_theme', t); } catch (e) { /* ignore */ }
    paint();
  }));
  paint();
}

function renderProfileHeader() {
  const email = _pUser.email || '';
  const displayName = _pUser.user_metadata?.display_name || _pUser.user_metadata?.full_name || '';
  const createdAt = _pUser.created_at ? new Date(_pUser.created_at).toLocaleDateString('vi-VN',{year:'numeric',month:'long'}) : '';
  const letter = (displayName || email || '?')[0].toUpperCase();

  // Lưới an toàn soft-nav (xem _hoSoLeftPage đầu file): initProfile() gọi hàm
  // này SAU vòng đợi auth tối đa 1.5s — đủ lâu để soft-nav rời trang.
  var setEl = (id, prop, val) => { var el = document.getElementById(id); if (el) el[prop] = val; };
  setEl('avatarLetter', 'textContent', letter);
  setEl('userEmail', 'textContent', email);
  setEl('userDisplayName', 'textContent', displayName || 'Người Dùng');
  setEl('userSince', 'textContent', createdAt ? `Thành viên từ ${createdAt}` : '');
  setEl('accEmail', 'value', email);
  setEl('accName', 'value', displayName);

  // Detect OAuth provider
  const identities = _pUser.identities || [];
  const oauthIdentity = identities.find(i => i.provider !== 'email');
  const isOAuthOnly = identities.length > 0 && !identities.find(i => i.provider === 'email');

  if (oauthIdentity) {
    const PROVIDER_NAMES = { google: 'Google', facebook: 'Facebook' };
    const badge = document.getElementById('providerBadge');
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.textContent = 'via ' + (PROVIDER_NAMES[oauthIdentity.provider] || oauthIdentity.provider);
    }
  }

  if (isOAuthOnly) {
    const pwdSection = document.getElementById('pwdSection');
    const pwdOAuthMsg = document.getElementById('pwdOAuthMsg');
    if (pwdSection) pwdSection.style.display = 'none';
    if (pwdOAuthMsg) pwdOAuthMsg.style.display = 'block';
  }
}

document.getElementById('btnSignout').onclick = () => Auth.signOut();

// ── TABS ──
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'credits') { loadCredits(); loadQuestTasks(); loadMyShares(); }
      if (btn.dataset.tab === 'ketnoi') loadKetnoi();
    });
  });
  // Mở thẳng một tab qua địa chỉ (`/app/ho-so#ketnoi`) — sidebar, thẻ nhiệm vụ,
  // trang nạp tiền đều trỏ bằng hash. Không có hash thì nạp tab mặc định.
  if (!openTabFromHash()) { const b = document.querySelector('.tab-btn.active'); if (b) b.click(); }
  window.addEventListener('hashchange', openTabFromHash);
}

// Hash → [tab, pane Cài đặt | khối cần cuộn tới]. Gồm cả tên tab CŨ (trang từng
// có 6 tab) để mọi link đã phát ra ngoài — sidebar bản cũ còn trong cache, email,
// `lib/onboarding/tasks.ts` — vẫn rơi đúng chỗ thay vì tab mặc định.
var HASH_ALIAS = {
  credits: ['credits'], lichsu: ['credits'],
  nhiemvu: ['credits', 'qtCard'], moiban: ['credits', 'refSection'],
  ketnoi: ['ketnoi'],
  account: ['account'], caidat: ['account'], gopy: ['account', 'gopy'],
};
var _scrollTarget = null;
function scrollToPending() {
  const el = _scrollTarget && document.getElementById(_scrollTarget);
  if (!el || el.style.display === 'none') return;
  _scrollTarget = null;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function openTabFromHash() {
  const key = String(location.hash || '').replace(/^#/, '').trim();
  const a = HASH_ALIAS[key];
  if (!a) return false;
  const btn = document.querySelector('.tab-btn[data-tab="' + a[0] + '"]');
  if (!btn) return false;
  btn.click();
  if (a[0] === 'account' && a[1]) {
    const p = document.querySelector('#tab-account .setnav-btn[data-pane="' + a[1] + '"]');
    if (p) p.click();
  } else if (a[1]) {
    // #refSection chỉ hiện SAU khi my-referral trả về — loadReferralPanel() gọi lại.
    _scrollTarget = a[1];
    scrollToPending();
  }
  return true;
}

// ── CREDIT FUNCTIONS ──
async function loadHeaderBalance() {
  if (!_pUser) return;
  try {
    const res = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(_pUser.id));
    const d = await res.json();
    const bal = d.balance ?? 0;
    const t = document.getElementById('tabCreditBalance');
    if (t) t.textContent = bal + ' lượng';
  } catch(e) {
    console.error('[loadHeaderBalance]', e);
    const t = document.getElementById('tabCreditBalance');
    if (t) t.textContent = '—';
  }
}

// 2 ô tổng số ở đầu tab Kết Nối — trên đúng 4 kênh có backend thật (AI qua
// MCP + Telegram + WhatsApp + Messenger). KHÔNG thêm Zalo/Discord: chưa có
// route liên kết cho hai kênh đó.
var _connStats = { mcp: false, tg: false, wa: false, msgr: false };
// Zalo chỉ vào mẫu số khi thẻ Zalo hiện (kênh đã cấu hình phía server).
var _zaloAvailable = false, _zaloLinked = false;
function updateConnStats() {
  const ok = (_connStats.mcp ? 1 : 0) + (_connStats.tg ? 1 : 0) + (_connStats.wa ? 1 : 0) + (_connStats.msgr ? 1 : 0) + (_zaloAvailable && _zaloLinked ? 1 : 0);
  const total = _zaloAvailable ? 5 : 4;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('connOkCount', ok + '/' + total);
  set('connMissingCount', (total - ok) + '/' + total);
}

// ── AI QUA MCP (self-serve key riêng của user) ──
function _mcpShow(state) { // 'checking' | 'nokey' | 'ready'
  const c = document.getElementById('mcpChecking');
  const n = document.getElementById('mcpNoKey');
  const r = document.getElementById('mcpReady');
  if (!c || !n || !r) return;
  c.style.display = state === 'checking' ? 'block' : 'none';
  n.style.display = state === 'nokey' ? 'block' : 'none';
  r.style.display = state === 'ready' ? 'block' : 'none';
  if (state !== 'checking') { _connStats.mcp = state === 'ready'; updateConnStats(); }
}
async function loadMcpKey() {
  if (!(await _tok())) return;
  _mcpShow('checking');
  try {
    const res = await fetch('/api/mcp/key', { headers: { Authorization: `Bearer ${await _tok()}` } });
    const d = res.ok ? await res.json() : {};
    if (_hoSoLeftPage) return;
    if (d && d.url) { const el = document.getElementById('mcpUrl'); if (el) el.value = d.url; _mcpShow('ready'); }
    else _mcpShow('nokey');
  } catch { _mcpShow('nokey'); }
}
async function genMcpKey() {
  const btn = document.getElementById('btnMcpGen');
  btn.disabled = true; btn.textContent = 'Đang tạo…';
  try {
    const res = await fetch('/api/mcp/key', { method: 'POST', headers: { Authorization: `Bearer ${await _tok()}` } });
    const d = await res.json();
    if (_hoSoLeftPage) return;
    if (d && d.url) { const el = document.getElementById('mcpUrl'); if (el) el.value = d.url; _mcpShow('ready'); }
    else alert('Không tạo được key, thử lại sau nhé.');
  } catch { if (!_hoSoLeftPage) alert('Lỗi mạng, thử lại sau nhé.'); }
  finally { btn.disabled = false; btn.textContent = 'Tạo đường kết nối'; }
}
async function copyMcpUrl() {
  const inp = document.getElementById('mcpUrl');
  const btn = document.getElementById('btnMcpCopy');
  try { await navigator.clipboard.writeText(inp.value); }
  catch { inp.select(); document.execCommand('copy'); }
  btn.textContent = '✓ Đã copy'; btn.classList.add('ok');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('ok'); }, 1800);
}
async function revokeMcpKey() {
  if (!confirm('Thu hồi key hiện tại? Kết nối Đang dùng key cũ sẽ ngừng — bạn sẽ có key mới ngay sau đó.')) return;
  _mcpShow('checking');
  try {
    await fetch('/api/mcp/key', { method: 'DELETE', headers: { Authorization: `Bearer ${await _tok()}` } });
    await fetch('/api/mcp/key', { method: 'POST', headers: { Authorization: `Bearer ${await _tok()}` } });
  } catch {}
  loadMcpKey();
}
document.getElementById('btnMcpGen')?.addEventListener('click', genMcpKey);
document.getElementById('btnMcpCopy')?.addEventListener('click', copyMcpUrl);
document.getElementById('btnMcpRevoke')?.addEventListener('click', revokeMcpKey);

// ── LIÊN KẾT TELEGRAM ──
async function loadTelegramLink() {
  const statusEl = document.getElementById('tgLinkStatus');
  const btnLink  = document.getElementById('btnTgLink');
  const btnUnlink = document.getElementById('btnTgUnlink');
  if (!statusEl) return;
  try {
    const res = await fetch('/api/channels/telegram/link', {
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = res.ok ? await res.json() : { linked: false };
    _connStats.tg = !!d.linked;
    updateConnStats();
    if (d.linked) {
      statusEl.innerHTML = '✓ Đã liên kết — bot Telegram dùng chung ví Lượng này.' + (d.telegram_user_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.telegram_user_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = 'Chưa liên kết.';
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = 'Không tải được trạng thái liên kết.';
  }
}

document.getElementById('btnTgLink').onclick = async () => {
  const btn = document.getElementById('btnTgLink');
  btn.disabled = true; btn.textContent = 'Đang tạo liên kết…';
  try {
    const res = await fetch('/api/channels/telegram/link', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = await res.json();
    if (_hoSoLeftPage) return;
    if (d.url) {
      // Mở bot Telegram với token /start → bot tự gắn ví.
      window.open(d.url, '_blank');
      const st = document.getElementById('tgLinkStatus');
      if (st) st.innerHTML = ic('hourglass') + ' Đã mở Telegram — bấm "Bắt đầu / Start" trong bot để hoàn tất, rồi tải lại trang.';
    } else {
      alert('Không tạo được liên kết, thử lại sau nhé.');
    }
  } catch {
    if (!_hoSoLeftPage) alert('Lỗi mạng, thử lại sau nhé.');
  } finally {
    btn.disabled = false; btn.textContent = 'Liên kết Telegram';
  }
};

document.getElementById('btnTgUnlink').onclick = async () => {
  if (!confirm('Hủy liên kết Telegram? Bot sẽ không còn dùng ví Lượng của bạn.')) return;
  try {
    await fetch('/api/channels/telegram/link', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
  } catch {}
  loadTelegramLink();
};

// ── LIÊN KẾT WHATSAPP ──
async function loadWhatsappLink() {
  const statusEl = document.getElementById('waLinkStatus');
  const btnLink  = document.getElementById('btnWaLink');
  const btnUnlink = document.getElementById('btnWaUnlink');
  if (!statusEl) return;
  try {
    const res = await fetch('/api/channels/whatsapp/link', {
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = res.ok ? await res.json() : { linked: false };
    _connStats.wa = !!d.linked;
    updateConnStats();
    if (d.linked) {
      statusEl.innerHTML = '✓ Đã liên kết — bot WhatsApp dùng chung ví Lượng này.' + (d.whatsapp_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.whatsapp_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = 'Chưa liên kết.';
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = 'Không tải được trạng thái liên kết.';
  }
}

document.getElementById('btnWaLink').onclick = async () => {
  const btn = document.getElementById('btnWaLink');
  btn.disabled = true; btn.textContent = 'Đang tạo liên kết…';
  try {
    const res = await fetch('/api/channels/whatsapp/link', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = await res.json();
    if (_hoSoLeftPage) return;
    if (d.url) {
      // Mở WhatsApp với tin soạn sẵn "/link <token>" → gửi để bot gắn ví.
      window.open(d.url, '_blank');
      const st = document.getElementById('waLinkStatus');
      if (st) st.innerHTML = ic('hourglass') + ' Đã mở WhatsApp — bấm GỬI tin soạn sẵn để hoàn tất, rồi tải lại trang.';
    } else {
      alert('Không tạo được liên kết, thử lại sau nhé.');
    }
  } catch {
    if (!_hoSoLeftPage) alert('Lỗi mạng, thử lại sau nhé.');
  } finally {
    btn.disabled = false; btn.textContent = 'Liên kết WhatsApp';
  }
};

document.getElementById('btnWaUnlink').onclick = async () => {
  if (!confirm('Hủy liên kết WhatsApp? Bot sẽ không còn dùng ví Lượng của bạn.')) return;
  try {
    await fetch('/api/channels/whatsapp/link', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
  } catch {}
  loadWhatsappLink();
};

// ── LIÊN KẾT MESSENGER ──
async function loadMessengerLink() {
  const statusEl = document.getElementById('msgrLinkStatus');
  const btnLink  = document.getElementById('btnMsgrLink');
  const btnUnlink = document.getElementById('btnMsgrUnlink');
  if (!statusEl) return;
  try {
    const res = await fetch('/api/channels/messenger/link', {
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = res.ok ? await res.json() : { linked: false };
    _connStats.msgr = !!d.linked;
    updateConnStats();
    if (d.linked) {
      statusEl.innerHTML = '✓ Đã liên kết — bot Messenger dùng chung ví Lượng này.' + (d.messenger_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.messenger_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = 'Chưa liên kết.';
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = 'Không tải được trạng thái liên kết.';
  }
}

document.getElementById('btnMsgrLink').onclick = async () => {
  const btn = document.getElementById('btnMsgrLink');
  btn.disabled = true; btn.textContent = 'Đang tạo liên kết…';
  try {
    const res = await fetch('/api/channels/messenger/link', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = await res.json();
    if (_hoSoLeftPage) return;
    if (d.url) {
      // Mở Messenger với m.me/<page>?ref=<token> → bot tự gắn ví.
      window.open(d.url, '_blank');
      const fallback = d.token ? ` Nếu chưa tự liên kết, gửi tin: /link ${escHtml(d.token)}` : '';
      const st = document.getElementById('msgrLinkStatus');
      if (st) st.innerHTML = ic('hourglass') + ' Đã mở Messenger — bấm "Bắt đầu / Get Started" hoặc gửi 1 tin để hoàn tất, rồi tải lại trang.' + fallback;
    } else {
      alert('Không tạo được liên kết, thử lại sau nhé.');
    }
  } catch {
    if (!_hoSoLeftPage) alert('Lỗi mạng, thử lại sau nhé.');
  } finally {
    btn.disabled = false; btn.textContent = 'Liên kết Messenger';
  }
};

document.getElementById('btnMsgrUnlink').onclick = async () => {
  if (!confirm('Hủy liên kết Messenger? Bot sẽ không còn dùng ví Lượng của bạn.')) return;
  try {
    await fetch('/api/channels/messenger/link', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
  } catch {}
  loadMessengerLink();
};

// ── LIÊN KẾT ZALO OA ──
// Zalo không truyền được mã vào cuộc trò chuyện (không có ?ref như m.me) ⇒
// hiện mã để người dùng nhắn "/link <mã>" cho OA.
async function loadZaloLink() {
  const card = document.getElementById('zaloCard');
  const statusEl = document.getElementById('zaloLinkStatus');
  const btnLink  = document.getElementById('btnZaloLink');
  const btnUnlink = document.getElementById('btnZaloUnlink');
  if (!card || !statusEl) return;
  try {
    const res = await fetch('/api/channels/zalo/link', {
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = res.ok ? await res.json() : { available: false, linked: false };
    _zaloAvailable = !!d.available;
    _zaloLinked = !!d.linked;
    updateConnStats();
    card.style.display = _zaloAvailable ? '' : 'none';
    if (!_zaloAvailable) return;
    if (d.linked) {
      statusEl.innerHTML = '✓ Đã liên kết — bot Zalo dùng chung ví Lượng này.' + (d.zalo_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.zalo_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = 'Chưa liên kết.';
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = 'Không tải được trạng thái liên kết.';
  }
}

document.getElementById('btnZaloLink').onclick = async () => {
  const btn = document.getElementById('btnZaloLink');
  btn.disabled = true; btn.textContent = 'Đang tạo mã…';
  try {
    const res = await fetch('/api/channels/zalo/link', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = await res.json();
    if (_hoSoLeftPage) return;
    if (d.token) {
      const st = document.getElementById('zaloLinkStatus');
      if (st) st.innerHTML = ic('hourglass') + ' Nhắn cho OA Tử Vi Minh Bảo trên Zalo đúng dòng sau (mã sống 15 phút), rồi tải lại trang: <code>/link ' + escHtml(d.token) + '</code>';
      if (d.url) window.open(d.url, '_blank');
    } else {
      alert('Không tạo được liên kết, thử lại sau nhé.');
    }
  } catch {
    if (!_hoSoLeftPage) alert('Lỗi mạng, thử lại sau nhé.');
  } finally {
    btn.disabled = false; btn.textContent = 'Liên kết Zalo';
  }
};

document.getElementById('btnZaloUnlink').onclick = async () => {
  if (!confirm('Hủy liên kết Zalo? Bot sẽ không còn dùng ví Lượng của bạn.')) return;
  try {
    await fetch('/api/channels/zalo/link', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
  } catch {}
  loadZaloLink();
};

// ── TAB KẾT NỐI (AI qua MCP + các kênh chat) ──
var _ketnoiLoaded = false;
function loadKetnoi() {
  loadMcpKey();
  loadTelegramLink();
  loadWhatsappLink();
  loadMessengerLink();
  loadZaloLink();
  _ketnoiLoaded = true;
}

// Mời bạn (V2.3). Mọi con số lấy từ server (`my-referral`) — thưởng/trần đều
// chỉnh được bằng SQL nên viết cứng vào đây là sớm muộn cũng nói sai với người
// dùng. Trần đếm theo CỬA SỔ 30 NGÀY, khớp process_referral_signup.
async function loadReferralPanel() {
  const sec = document.getElementById('refSection');
  if (!sec || !(await _tok())) return;
  let d;
  try {
    const r = await fetch('/api/payment?action=my-referral', { headers: { Authorization: 'Bearer ' + (await _tok()) } });
    d = await r.json();
  } catch (e) { return; }
  if (!d || !d.code) return;
  if (_hoSoLeftPage) return;

  const reward = Number(d.rewardPerInvite) || 0;
  const cap = Number(d.cap) || 0;
  const used = Number(d.rewardedRecent) || 0;
  const left = Math.max(0, cap - used);

  const link = window.location.origin + '/?ref=' + encodeURIComponent(d.code);
  document.getElementById('refLinkInput').value = link;
  document.getElementById('refPitch').innerHTML = left > 0
    ? 'Mỗi người đăng ký qua link của bạn: <strong>+' + reward + ' Lượng</strong> vào ví bạn ngay khi họ tạo tài khoản. '
      + 'Khi họ nạp Lượng lần đầu, cả hai nhận thêm <strong>30 Lượng</strong> nữa.'
    : 'Bạn đã dùng hết <strong>' + cap + '</strong> lượt mời được thưởng trong 30 ngày qua — '
      + 'lượt mời sẽ mở lại dần khi qua mốc 30 ngày của từng người.';
  document.getElementById('refProgressLabel').textContent = used + '/' + (cap || '—');
  const bar = document.getElementById('refProgressBar');
  if (bar && cap > 0) setTimeout(() => { bar.style.width = Math.min(100, Math.round(used / cap * 100)) + '%'; }, 100);
  document.getElementById('refTotalCount').textContent = d.invited || 0;
  document.getElementById('refEarnedCount').textContent = d.creditsEarned || 0;

  const btn = document.getElementById('refCopyBtn');
  if (btn && !btn.dataset.wired) {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const done = () => { btn.textContent = 'Đã chép ✓'; setTimeout(() => { btn.textContent = 'Sao chép'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, done);
      else { document.getElementById('refLinkInput').select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } }
      try { window.Track && window.Track.event && window.Track.event('cta_click', { meta: { from: 'invite', action: 'copy', page: 'profile' } }); } catch (e) { /* ignore */ }
    });
  }
  sec.style.display = '';
  scrollToPending();
}

// ── NHẬN THÊM LƯỢNG (trong tab Ví) — Khởi Hành + Kênh liên lạc ────────────────────────────────
// Cùng nguồn dữ liệu với thẻ Khởi Hành trên Tổng Quan
// (`/api/payment?action=onboarding-sync`, lib/onboarding/tasks.ts) — server
// tự kiểm bằng chứng và tự cộng, trang này CHỈ vẽ. Khác Tổng Quan ở chỗ:
//   • #qtCard KHÔNG ẩn khi xong cả ba bước — đây là nơi TRA CỨU, ẩn đi sau khi
//     hoàn tất thì mất luôn bằng chứng đã làm.
//   • #chCard (kênh liên lạc) VẪN ẩn khi cả hai đã xong — không có gì để tra
//     cứu thêm, giữ nó là chiếm chỗ một khối toàn dấu tích.
// `d.khoiHanh` (3 bước, thưởng CHUỖI) và `d.channels.tasks` (2 nhiệm vụ độc
// lập) dùng CHUNG mảng `_qtDefs` để nút bấm tra ngược theo chỉ số — xem
// questTaskGo(). Không nội suy chuỗi từ server vào thuộc tính onclick: dấu
// nháy trong chuỗi là vỡ thẻ (cùng lý do đã ghi ở phần Thầy Nhớ bên dưới).
var _qtDefs = [];

async function loadQuestTasks() {
  var host = document.getElementById('qtBody');
  if (!host || !(await _tok())) return;
  try {
    const res = await fetch('/api/payment?action=onboarding-sync', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + (await _tok()) },
    });
    const d = await res.json();
    if (d && d.khoiHanh) { renderQuestTasks(d.khoiHanh); renderChannelTasks(d.khoiHanh.steps.length, (d.channels && d.channels.tasks) || []); }
    else host.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Không đọc được tiến độ. Thử tải lại trang.</div>';
  } catch (e) {
    host.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Không đọc được tiến độ. Thử tải lại trang.</div>';
  }
}

function questRowHtml(t, i) {
  return '<div class="qt-row' + (t.done ? ' done' : '') + '"><div class="qt-tick"></div>'
    + '<div class="qt-body"><div class="qt-t">' + escHtml(t.title) + '</div>'
    + (t.done ? '' : '<div class="qt-d">' + escHtml(t.desc) + '</div>') + '</div>'
    + '<div class="qt-pay"><div class="qt-amt">' + (t.done ? '+' : '') + (+t.credits || 0) + ' Lượng</div>'
    + (t.done ? '' : '<button class="qt-go" type="button" data-i="' + i + '">' + escHtml(t.cta) + '</button>')
    + '</div></div>';
}

function renderQuestTasks(kh) {
  const host = document.getElementById('qtBody');
  if (!host) return;
  let done = 0;
  for (let i = 0; i < kh.steps.length; i++) if (kh.steps[i].done) done++;

  let h = kh.claimed
    ? '<div class="qt-top"><div class="qt-count" style="color:var(--green)">✓ Đã hoàn tất — +' + (+kh.credits || 0) + ' Lượng đã vào ví.</div></div>'
    : '<div class="qt-top"><div style="font-size:.85rem;color:var(--text-mid)">' + done + '/' + kh.steps.length + ' bước</div>'
      + '<div class="qt-count">+' + (+kh.credits || 0) + ' Lượng khi xong cả ' + kh.steps.length + '</div></div>';
  if (kh.justGranted) h += '<div class="qt-note ok">✓ Vừa cộng <b>+' + (+kh.credits || 0) + ' Lượng</b> vào ví bạn.</div>';

  // Bước Khởi Hành chiếm CHỈ SỐ 0..N-1 của `_qtDefs`; renderChannelTasks nối
  // tiếp từ đó — thứ tự gọi PHẢI là render Khởi Hành trước rồi mới tới kênh
  // liên lạc (loadQuestTasks() đã gọi đúng thứ tự này).
  _qtDefs = kh.steps.slice();
  h += '<div>' + kh.steps.map(function (t, i) { return questRowHtml(t, i); }).join('') + '</div>';

  host.innerHTML = h;
  host.querySelectorAll('.qt-go').forEach(function (b) { b.onclick = questTaskGo; });
  if (window.mountIcons) window.mountIcons(host);
}

function renderChannelTasks(indexOffset, tasks) {
  const card = document.getElementById('chCard');
  const host = document.getElementById('chBody');
  if (!card || !host) return;
  if (!tasks.length || tasks.every(function (t) { return t.done; })) { card.style.display = 'none'; return; }

  const granted = tasks.filter(function (t) { return t.justGranted; })
    .reduce(function (s, t) { return s + (+t.credits || 0); }, 0);
  let h = granted > 0 ? '<div class="qt-note ok">✓ Vừa cộng <b>+' + granted + ' Lượng</b> vào ví bạn.</div>' : '';

  _qtDefs = _qtDefs.concat(tasks);
  h += '<div>' + tasks.map(function (t, i) { return questRowHtml(t, indexOffset + i); }).join('') + '</div>';

  host.innerHTML = h;
  card.style.display = '';
  host.querySelectorAll('.qt-go').forEach(function (b) { b.onclick = questTaskGo; });
  if (window.mountIcons) window.mountIcons(host);
}

function questTaskGo() {
  const t = _qtDefs[+this.getAttribute('data-i')];
  if (!t) return;
  const href = t.href || '';
  // `href` rỗng = việc chỉ làm được TẠI Tổng Quan (ô lá số/rail của thẻ "Vận
  // hôm nay", hoặc quyền thông báo trình duyệt) — tab này không có UI đó, đưa
  // người ta tới đúng chỗ có thay vì cố dựng lại một bản thứ hai ở đây.
  if (!href) { location.href = '/app'; return; }
  // Trỏ VÀO CHÍNH trang đang đứng (`/app/tai-khoan#<tab>` hay `/app/ho-so#…`)
  // thì chuyển tab TẠI CHỖ thay vì tải lại cả trang.
  const m = /^\/app\/(?:tai-khoan|ho-so)#(.+)$/.exec(href);
  if (m && HASH_ALIAS[m[1]]) {
    if (location.hash === '#' + m[1]) openTabFromHash(); else location.hash = m[1];
    return;
  }
  location.href = href;
}

// ── TAB NHIỆM VỤ — lịch sử "Chia Sẻ" ─────────────────────────────────────
// #599 gỡ nút "Khoe kết quả" (nộp bằng chứng + chờ admin duyệt) — quest này
// đổi sang đọc lại `shared_results` (mỗi lần bấm "Chia sẻ" trong workspace
// ghi 1 dòng, `view_count` +1 mỗi lượt `/ket-qua/<id>` được mở). Chưa gắn
// thưởng vào số lượt xem này — `view_count` cộng cả bot xem-trước của
// Facebook/Zalo/WhatsApp lẫn chính chủ tự mở lại, nên chỉ HIỆN cho biết,
// không dùng để tính Lượng.
async function loadMyShares() {
  const host = document.getElementById('spBody');
  if (!host || !(await _tok())) return;
  try {
    const res = await fetch('/api/payment?action=my-shares', {
      headers: { Authorization: 'Bearer ' + (await _tok()) },
    });
    const d = await res.json();
    renderMyShares((d && d.shares) || []);
  } catch (e) {
    host.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Không đọc được lịch sử.</div>';
  }
}

function renderMyShares(list) {
  const host = document.getElementById('spBody');
  if (!host) return;
  if (!list.length) {
    host.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Bạn chưa chia sẻ lượt nào.</div>';
    return;
  }
  host.innerHTML = list.map(function (s) {
    const date = new Date(s.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const views = Number(s.view_count) || 0;
    return '<div class="sp-row"><div style="flex:1;min-width:0">'
      + '<div class="sp-plat">' + escHtml(s.title || 'Kết quả') + '</div>'
      + '<div class="sp-meta">' + date + '</div></div>'
      + '<span class="sp-status approved">' + views + ' lượt xem</span></div>';
  }).join('');
}

async function loadCredits() {
  if (!_pUser || !(await _tok())) return;
  // Balance
  await loadHeaderBalance();
  loadReferralPanel();
  const t = document.getElementById('tabCreditBalance');
  if (t && t.textContent === '…') t.textContent = '...';
  // Transactions
  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/credit_transactions?user_id=eq.' + encodeURIComponent(_pUser.id) +
      '&order=created_at.desc&limit=100&select=*',
      { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + (await _tok()) } }
    );
    const txns = res.ok ? await res.json() : [];
    renderTransactions(txns);

    // Monthly usage progress bar
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthUsed = txns
      .filter(tx => tx.amount < 0 && new Date(tx.created_at) >= monthStart)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    // Get current balance to estimate total (used + remaining)
    const balRes = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(_pUser.id));
    const balData = await balRes.json();
    const currentBal = balData.balance ?? 0;
    const totalThisMonth = monthUsed + currentBal;
    const pct = totalThisMonth > 0 ? Math.min(100, Math.round(monthUsed / totalThisMonth * 100)) : 0;

    const bar = document.getElementById('monthlyUsageBar');
    const label = document.getElementById('monthlyUsageLabel');
    if (bar) setTimeout(() => { bar.style.width = pct + '%'; }, 100);
    if (label) label.textContent = monthUsed + ' lượng';
    // Color shift when high usage
    if (bar && pct >= 80) bar.style.background = 'linear-gradient(90deg,#c0392b,#e74c3c)';
  } catch(e) {
    const tl = document.getElementById('transactionList');
    if (tl) tl.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Không thể tải lịch sử.</div>';
  }
}

var VILU_LABELS = { topup:'Nạp Lượng', use_laso:'Luận Giải Lá Số', use_xem_tuoi:'Xem Tuổi Vợ Chồng', use_xem_lam_an:'Xem Tuổi Làm Ăn', admin_grant:'Cấp Lượng (quản trị)', chat:'Hỏi Thầy' };
function viluLabel(t) { return VILU_LABELS[t.type] || t.description || t.type; }

var _viluTxns = [];
var _viluPage = 1;
var _viluBound = false;
var VILU_PAGE_SIZE = 10;

function renderTransactions(list) {
  _viluTxns = list || [];
  _viluPage = 1;


  // Dropdown lọc theo loại — liệt kê đúng các `type` có trong dữ liệu, không bịa nhóm.
  const typeSel = document.getElementById('viluTypeFilter');
  if (typeSel) {
    const seen = {}, cur = typeSel.value;
    let opts = '<option value="">Tất cả loại giao dịch</option>';
    _viluTxns.forEach(t => {
      if (t.type && !seen[t.type]) { seen[t.type] = 1; opts += `<option value="${escHtml(t.type)}">${escHtml(viluLabel(t))}</option>`; }
    });
    typeSel.innerHTML = opts;
    typeSel.value = cur;
  }

  if (!_viluBound) {
    _viluBound = true;
    const search = document.getElementById('viluSearch');
    if (typeSel) typeSel.addEventListener('change', () => { _viluPage = 1; renderViluTable(); });
    if (search) search.addEventListener('input', () => { _viluPage = 1; renderViluTable(); });
  }

  renderViluTable();
}

function renderViluTable() {
  const el = document.getElementById('transactionList');
  const pager = document.getElementById('viluPager');
  if (!el) return;
  if (!_viluTxns.length) {
    el.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Chưa có giao dịch nào.</div>';
    if (pager) pager.style.display = 'none';
    return;
  }

  const type = document.getElementById('viluTypeFilter')?.value || '';
  const q = (document.getElementById('viluSearch')?.value || '').trim().toLowerCase();
  const filtered = _viluTxns.filter(t => {
    if (type && t.type !== type) return false;
    if (q && viluLabel(t).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });

  if (!filtered.length) {
    el.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Không có giao dịch khớp bộ lọc.</div>';
    if (pager) pager.style.display = 'none';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / VILU_PAGE_SIZE));
  _viluPage = Math.min(_viluPage, totalPages);
  const start = (_viluPage - 1) * VILU_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + VILU_PAGE_SIZE);

  el.innerHTML = '<div class="vilu-tbl-wrap"><table class="vilu-tbl"><thead><tr>' +
    '<th>#</th><th>Thời gian</th><th>Loại</th><th>Nội dung</th><th>Số lượng</th><th>Mã giao dịch</th>' +
    '</tr></thead><tbody>' + pageItems.map((t, i) => {
      const date = new Date(t.created_at).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      const isAdd = t.amount > 0;
      const loaiColor = isAdd ? 'var(--green)' : 'var(--red)';
      const loaiText = isAdd ? 'Nạp / Thưởng' : 'Sử dụng';
      const amtCls = isAdd ? 'pos' : 'neg';
      const amtStr = (isAdd ? '+' : '') + t.amount;
      const ma = t.id ? String(t.id).slice(0, 8) : '—';
      return '<tr><td>' + (start + i + 1) + '</td><td>' + date + '</td>' +
        '<td style="color:' + loaiColor + ';font-weight:600">' + loaiText + '</td>' +
        '<td>' + escHtml(viluLabel(t)) + '</td>' +
        '<td class="vilu-amt ' + amtCls + '">' + amtStr + '</td>' +
        '<td class="vilu-mono">' + escHtml(ma) + '</td></tr>';
    }).join('') + '</tbody></table></div>';

  if (pager) {
    pager.style.display = totalPages > 1 ? 'flex' : 'none';
    if (totalPages > 1) {
      pager.innerHTML = '<span>Hiển thị ' + (start + 1) + '–' + Math.min(start + VILU_PAGE_SIZE, filtered.length) + ' / ' + filtered.length + ' giao dịch</span><div class="vilu-pgbtns">' +
        Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p =>
          '<button type="button" class="vilu-pgbtn' + (p === _viluPage ? ' active' : '') + '" data-p="' + p + '">' + p + '</button>'
        ).join('') + '</div>';
      pager.querySelectorAll('.vilu-pgbtn').forEach(b => b.addEventListener('click', () => { _viluPage = parseInt(b.dataset.p, 10); renderViluTable(); }));
    }
  }
}

// ── ACCOUNT ACTIONS ──
async function saveDisplayName() {
  const name = document.getElementById('accName').value.trim();
  const alert = document.getElementById('nameAlert');
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${await _tok()}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ data: { display_name: name } })
    });
    if (resp.ok) {
      alert.innerHTML = '<div class="alert success">✓ Đã lưu tên hiển thị.</div>';
      const nd = document.getElementById('userDisplayName');
      if (nd) nd.textContent = name || 'Người Dùng';
      const al = document.getElementById('avatarLetter');
      if (al) al.textContent = (name || 'N')[0].toUpperCase();
    } else throw new Error();
  } catch {
    alert.innerHTML = '<div class="alert error">✗ Lưu thất bại. Thử lại.</div>';
  }
  setTimeout(() => { alert.innerHTML = ''; }, 3000);
}

async function changePassword() {
  const pwd = document.getElementById('newPwd').value;
  const confirm = document.getElementById('confirmPwd').value;
  const alert = document.getElementById('pwdAlert');
  if (pwd !== confirm) { alert.innerHTML = '<div class="alert error">Mật khẩu không khớp.</div>'; return; }
  if (pwd.length < 6) { alert.innerHTML = '<div class="alert error">Mật khẩu tối thiểu 6 ký tự.</div>'; return; }
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${await _tok()}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    if (resp.ok) {
      alert.innerHTML = '<div class="alert success">✓ Đã đổi mật khẩu thành công.</div>';
      const np = document.getElementById('newPwd');
      if (np) np.value = '';
      const cp = document.getElementById('confirmPwd');
      if (cp) cp.value = '';
    } else throw new Error();
  } catch {
    alert.innerHTML = '<div class="alert error">✗ Đổi mật khẩu thất bại.</div>';
  }
  setTimeout(() => { alert.innerHTML = ''; }, 3000);
}

// ── UTILS ──
function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ── THẦY NHỚ (hồ sơ tầng 2) ──
// Nội dung ở đây do MODEL sinh ra, nên mọi lượt vẽ đều phải thoát HTML. Nút
// bấm gắn theo CHỈ SỐ (số do chính mình sinh ra) chứ KHÔNG nội suy nội dung
// vào thuộc tính onclick — dấu nháy trong chuỗi là vỡ thẻ, bài học đã ghi.
var _memItems = [];
var _memKinds = {};
var _memMax = 40;

async function loadMemory() {
  const box = document.getElementById('memList');
  if (!box) return;
  if (!(await _tok())) { box.innerHTML = '<div class="mem-empty">Đăng nhập để xem hồ sơ.</div>'; return; }
  box.innerHTML = '<div class="mem-empty">Đang tải…</div>';
  try {
    const r = await fetch('/api/payment?action=my-memory', { headers: { Authorization: 'Bearer ' + (await _tok()) } });
    const j = await r.json();
    if (!r.ok) throw new Error(j && j.error);
    _memItems = (j.items || []);
    _memKinds = j.kinds || {};
    _memMax = j.max || 40;
    const sel = document.getElementById('memAddKind');
    if (sel && !sel.options.length) {
      sel.innerHTML = Object.keys(_memKinds)
        .map(k => '<option value="' + escHtml(k) + '">' + escHtml(_memKinds[k]) + '</option>').join('');
    }
    memRender();
  } catch (e) {
    box.innerHTML = '<div class="mem-empty">Không đọc được hồ sơ. Thử tải lại trang.</div>';
  }
}

function memRender() {
  const box = document.getElementById('memList');
  if (!box) return;
  if (!_memItems.length) {
    box.innerHTML = '<div class="mem-empty">Thầy chưa ghi lại điều gì về bạn.<br>'
      + 'Cứ trò chuyện vài lần, Thầy sẽ tự nhớ những điều đáng nhớ.</div>';
    return;
  }
  box.innerHTML = _memItems.map(function (it, i) {
    return '<div class="mem-item">'
      + '<div class="mem-body">'
      +   '<div class="mem-kind">' + escHtml(_memKinds[it.loai] || 'Khác') + '</div>'
      +   '<div class="mem-text" id="memTxt' + i + '">' + escHtml(it.noi_dung) + '</div>'
      +   '<div class="mem-src">' + (it.nguon === 'nguoi' ? 'Bạn tự thêm' : 'Thầy tự ghi') + '</div>'
      + '</div>'
      + '<div class="mem-act">'
      +   '<button class="mem-btn" onclick="memStartEdit(' + i + ')">Sửa</button>'
      +   '<button class="mem-btn danger" onclick="memDelete(' + i + ')">Xoá</button>'
      + '</div></div>';
  }).join('') + '<div class="mem-src" style="margin-top:.5rem">Giữ tối đa ' + _memMax
    + ' mục — quá thì Thầy tự bỏ mục cũ nhất.</div>';
}

function memStartEdit(i) {
  const cell = document.getElementById('memTxt' + i);
  if (!cell || !_memItems[i]) return;
  const cur = _memItems[i].noi_dung;
  cell.innerHTML = '<input class="mem-edit" id="memInp' + i + '" maxlength="200">'
    + '<div style="margin-top:.4rem;display:flex;gap:.35rem">'
    + '<button class="mem-btn" onclick="memSave(' + i + ')">Lưu</button>'
    + '<button class="mem-btn" onclick="memRender()">Huỷ</button></div>';
  const inp = document.getElementById('memInp' + i);
  if (inp) { inp.value = cur; inp.focus(); }   // gán qua .value, không nội suy vào HTML
}

async function memSave(i) {
  const inp = document.getElementById('memInp' + i);
  if (!inp || !_memItems[i]) return;
  const val = inp.value.trim();
  if (!val) return;
  await memPost('memory-edit', { id: _memItems[i].id, noi_dung: val, loai: _memItems[i].loai });
}

async function memDelete(i) {
  if (!_memItems[i]) return;
  if (!confirm('Xoá điều này khỏi hồ sơ? Thầy sẽ quên hẳn.')) return;
  await memPost('memory-delete', { id: _memItems[i].id });
}

async function memAdd() {
  const inp = document.getElementById('memAddText');
  const sel = document.getElementById('memAddKind');
  if (!inp) return;
  const val = inp.value.trim();
  if (val.length < 3) { alert('Viết dài hơn một chút nhé.'); return; }
  const done = await memPost('memory-add', { noi_dung: val, loai: sel ? sel.value : 'khac' });
  if (done) inp.value = '';
}

async function memPost(action, body) {
  try {
    const r = await fetch('/api/payment?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await _tok()) },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert((j && j.error) || 'Không thực hiện được.'); return false; }
    await loadMemory();
    return true;
  } catch (e) { alert('Lỗi mạng.'); return false; }
}

// ── BOOT ──
initProfile();

// ═══════════════════════════════════════════════════════════
// TAB GÓP Ý — hộp thư một chiều rưỡi
// ═══════════════════════════════════════════════════════════
// Vì sao đặt ở đây chứ không làm chatbot sản phẩm: bot trả lời tự động là kênh
// DẬP tín hiệu — người dùng vấp ở đâu thì bot đáp cho xong, còn người vận hành
// không bao giờ biết. Hộp thư ghi nguyên văn + ngữ cảnh máy tự đính kèm, tốn 0
// token. Đặt trong Tài khoản để không ai nhầm nó với rail chat hỏi Thầy.
//
// "Một chiều RƯỠI": người gửi thấy lại góp ý của mình, trạng thái xử lý và lời
// hồi đáp của admin. Đó là lý do duy nhất khiến ai đó chịu góp ý lần thứ hai —
// mà vẫn không phải dựng hạ tầng email hay hội thoại thời gian thực.
//
// TOÀN BỘ khung được dựng TỪ ĐÂY (không phải trong HTML) vì trang có tab này
// là HAI (/profile.html và /app/tai-khoan) — chép markup sang cả hai là mở
// đường cho chúng trôi lệch nhau. Trang chỉ khai nút tab + một khung rỗng.

var FB_KINDS = [
  ['noi_dung',  'Nội dung luận giải'],
  ['bug',       'Lỗi kỹ thuật'],
  ['tinh_nang', 'Đề xuất tính năng'],
  ['thanh_toan','Thanh toán · Lượng'],
  ['khac',      'Khác'],
];
// Nhãn hiện cho NGƯỜI GÓP Ý — cố ý khác nhãn trong admin: 'bo_qua' ở đây là
// "Đã xem", không phải "Bỏ qua". Người ta bỏ công viết, đừng trả về mặt chữ
// nói rằng công đó bị vứt.
var FB_STATUS = {
  moi:        ['Đã nhận',    'chip-blue',  'chip-blue-line',  'blue'],
  dang_xu_ly: ['Đang xử lý', 'chip-amber', 'chip-amber-line', 'tx-amber'],
  da_xu_ly:   ['Đã xử lý',   'chip-green', 'chip-green-line', 'green'],
  bo_qua:     ['Đã xem',     'chip-blue',  'chip-blue-line',  'text-lt'],
};
var FB_MAX = 2000;
var _fbBusy = false;

async function loadFeedback() {
  const host = document.getElementById('gopyHost');
  if (!host) return;
  if (!host.dataset.built) {
    host.innerHTML = fbFormHtml();
    host.dataset.built = '1';
    const ta = document.getElementById('fbMessage');
    if (ta) ta.addEventListener('input', fbCount);
  }
  await fbLoadList();
  if (!_pHistoryData) loadRecentLasos();
}

// Ba lá số gần nhất cho fbMeta — trước đây có sẵn nhờ tab Lịch Sử; nay nạp
// riêng, chỉ khi người ta mở Góp ý. Hụt thì góp ý vẫn gửi, chỉ thiếu ngữ cảnh.
async function loadRecentLasos() {
  try {
    const resp = await fetch('/api/history?action=list', { headers: { Authorization: `Bearer ${await _tok()}` } });
    if (resp.ok) _pHistoryData = await resp.json();
    else console.error('[loadRecentLasos]', resp.status);
  } catch (e) { console.error('[loadRecentLasos]', e); }
}

function fbFormHtml() {
  const opts = FB_KINDS.map(k => '<option value="' + k[0] + '">' + k[1] + '</option>').join('');
  return ''
    + '<div class="account-section">'
    +   '<h3>' + ic('inbox', 16) + ' Gửi góp ý</h3>'
    +   '<p style="font-size:.85rem;color:var(--text-mid);margin:-.35rem 0 1rem;line-height:1.6">'
    +     'Đây là hộp thư tới thẳng người vận hành — không phải chỗ hỏi Thầy. '
    +     'Mọi ý kiến về nội dung luận giải, lỗi kỹ thuật, giá Lượng hay tính năng bạn muốn có, '
    +     'viết vào đây. Chúng tôi đọc hết và trả lời ngay trong trang này.'
    +   '</p>'
    +   '<div class="form-row">'
    +     '<label for="fbKind">Nội dung góp ý về</label>'
    +     '<select id="fbKind">' + opts + '</select>'
    +   '</div>'
    +   '<div class="form-row">'
    +     '<label for="fbMessage">Bạn muốn nói gì?</label>'
    +     '<textarea id="fbMessage" rows="6" maxlength="' + FB_MAX + '" '
    +       'placeholder="Càng cụ thể càng dễ sửa. Ví dụ: &quot;Mục Tài Vận trong bản Luận Giải của lá số sinh 1990 nói ngược với mục Đại Vận&quot; — hơn hẳn &quot;luận giải chưa hay&quot;." '
    +       'style="font-family:inherit;line-height:1.6;resize:vertical"></textarea>'
    +     '<div id="fbCount" style="font-size:.74rem;color:var(--text-lt);text-align:right;margin-top:.25rem">0 / ' + FB_MAX + '</div>'
    +   '</div>'
    +   '<button class="btn-primary" id="fbSubmit" onclick="submitFeedback()">Gửi Góp Ý</button>'
    +   '<div id="fbAlert"></div>'
    +   '<p style="font-size:.78rem;color:var(--text-lt);margin-top:.9rem;line-height:1.6">'
    +     ic('info', 12) + ' Trang / thiết bị bạn đang dùng được đính kèm tự động để chúng tôi lần được lỗi — bạn không cần mô tả. '
    +     'Việc gấp về thanh toán: xem <a href="/huong-dan-thanh-toan.html" style="color:var(--tx-gold)">Hướng dẫn thanh toán</a> '
    +     'hoặc <a href="/contact.html" style="color:var(--tx-gold)">Liên hệ</a>.'
    +   '</p>'
    + '</div>'
    + '<div class="account-section">'
    +   '<h3>Góp ý đã gửi</h3>'
    +   '<div id="fbList"><div style="color:var(--text-lt);font-size:.85rem">Đang tải…</div></div>'
    + '</div>';
}

function fbCount() {
  const ta = document.getElementById('fbMessage');
  const el = document.getElementById('fbCount');
  if (ta && el) el.textContent = ta.value.length + ' / ' + FB_MAX;
}

function fbAlert(msg, type) {
  const el = document.getElementById('fbAlert');
  if (el) el.innerHTML = '<div class="alert ' + type + '" style="margin-top:.75rem">' + escHtml(msg) + '</div>';
}

/** Ngữ cảnh máy tự đính kèm. PHẲNG có chủ ý — dễ đọc trong panel admin, và
 *  không có gì ở đây dùng cho quyền hạn hay tính phí nên không cần xác thực. */
function fbMeta() {
  const m = {};
  try {
    m.screen = window.innerWidth + 'x' + window.innerHeight;
    m.theme = document.documentElement.getAttribute('data-theme') || 'light';
    const bal = document.getElementById('tabCreditBalance');
    if (bal) m.balance = (bal.textContent || '').trim();
    // Ba lá số gần nhất: gần như mọi góp ý về NỘI DUNG đều nói về một trong số
    // chúng, mà người gửi thì không bao giờ chép slug vào.
    const lasos = (_pHistoryData && _pHistoryData.lasos) || [];
    if (lasos.length) m.laso_gan_day = lasos.slice(0, 3).map(l => l.slug).join(', ');
  } catch (e) { console.error('[fbMeta]', e); }
  return m;
}

async function submitFeedback() {
  if (_fbBusy) return;
  const btn = document.getElementById('fbSubmit');
  const ta = document.getElementById('fbMessage');
  const kind = (document.getElementById('fbKind') || {}).value || 'khac';
  const message = (ta && ta.value || '').trim();
  if (message.length < 5) { fbAlert('Viết giúp vài dòng để chúng tôi hiểu ý nhé.', 'error'); return; }

  _fbBusy = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi…'; }
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await _tok()) },
      body: JSON.stringify({ kind, message, page_url: location.href, meta: fbMeta() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { fbAlert(data.error || 'Không gửi được. Xin thử lại.', 'error'); return; }
    if (ta) ta.value = '';
    fbCount();
    fbAlert('Đã nhận — cảm ơn bạn. Trạng thái xử lý hiện ngay bên dưới.', 'success');
    await fbLoadList();
  } catch (e) {
    console.error('[submitFeedback]', e);
    fbAlert('Lỗi mạng — xin thử lại.', 'error');
  } finally {
    _fbBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Gửi Góp Ý'; }
  }
}

async function fbLoadList() {
  const el = document.getElementById('fbList');
  if (!el) return;
  try {
    const res = await fetch('/api/feedback', { headers: { Authorization: 'Bearer ' + (await _tok()) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.status);
    fbRenderList(data.items || []);
  } catch (e) {
    console.error('[fbLoadList]', e);
    el.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Không tải được danh sách góp ý.</div>';
  }
}

function fbRenderList(list) {
  const el = document.getElementById('fbList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Bạn chưa gửi góp ý nào.</div>';
    return;
  }
  const KIND = Object.fromEntries(FB_KINDS);
  el.innerHTML = list.map(f => {
    const st = FB_STATUS[f.status] || FB_STATUS.moi;
    const date = new Date(f.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    // Góp ý gửi kèm lá phiếu từ nút dưới bản luận giải — nhắc lại để người ta
    // nhớ mình đã nói về bản nào.
    const vote = f.rating === 'down' ? ic('x-circle', 13) + ' Chưa đúng'
               : f.rating === 'up'   ? ic('check-circle', 13) + ' Đúng' : '';
    const from = (f.source === 'reading' && f.tool_id)
      ? '<span style="font-size:.74rem;color:var(--text-lt)">· ' + escHtml(f.tool_id) + '</span>' : '';
    const reply = f.admin_reply
      ? '<div style="margin-top:.7rem;padding:.65rem .8rem;background:var(--gold-lt);border-left:3px solid var(--tx-gold);border-radius:0 6px 6px 0">'
        + '<div style="font-size:.72rem;font-weight:700;color:var(--tx-gold);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">Hồi đáp từ Tử Vi Minh Bảo</div>'
        + '<div style="font-size:.86rem;color:var(--text);line-height:1.65;white-space:pre-wrap">' + escHtml(f.admin_reply) + '</div>'
        + '</div>'
      : '';
    return '<div style="border:1px solid var(--border-lt);border-radius:var(--radius);padding:.9rem 1rem;margin-bottom:.75rem;background:var(--surface)">'
      + '<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">'
      +   '<span style="display:inline-flex;align-items:center;font-size:.72rem;font-weight:700;padding:.2rem .6rem;border-radius:999px;'
      +     'background:var(--' + st[1] + ');border:1px solid var(--' + st[2] + ');color:var(--' + st[3] + ')">' + st[0] + '</span>'
      +   '<span style="font-size:.78rem;color:var(--text-mid)">' + escHtml(KIND[f.kind] || f.kind) + '</span>'
      +   (vote ? '<span style="display:inline-flex;align-items:center;gap:.25rem;font-size:.74rem;color:var(--text-mid)">' + vote + '</span>' : '')
      +   from
      +   '<span style="font-size:.75rem;color:var(--text-lt);margin-left:auto">' + date + '</span>'
      + '</div>'
      + '<div style="font-size:.88rem;color:var(--text);line-height:1.65;white-space:pre-wrap">' + escHtml(f.message) + '</div>'
      + reply
      + '</div>';
  }).join('');
}
