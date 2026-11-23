/* global _tvmbT, _tvmbHref, I18n -- auth.js (_tvmbT/_tvmbHref) + tools-shared/i18n.js (I18n) nạp trước file này */
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
// Định dạng ngày theo ngôn ngữ trang (I18n.locale do server chèn ở /<locale>/; vi ⇒ 'vi-VN' như cũ).
function _dateLoc() { var l = window.I18n && I18n.locale; return l && l !== 'vi' ? l : 'vi-VN'; }
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
  const createdAt = _pUser.created_at ? new Date(_pUser.created_at).toLocaleDateString(_dateLoc(),{year:'numeric',month:'long'}) : '';
  const letter = (displayName || email || '?')[0].toUpperCase();

  // Lưới an toàn soft-nav (xem _hoSoLeftPage đầu file): initProfile() gọi hàm
  // này SAU vòng đợi auth tối đa 1.5s — đủ lâu để soft-nav rời trang.
  var setEl = (id, prop, val) => { var el = document.getElementById(id); if (el) el[prop] = val; };
  setEl('avatarLetter', 'textContent', letter);
  setEl('userEmail', 'textContent', email);
  setEl('userDisplayName', 'textContent', displayName || _tvmbT('js.taikhoan.nguoi-dung', 'Người Dùng'));
  setEl('userSince', 'textContent', createdAt ? _tvmbT('js.taikhoan.thanh-vien-tu', 'Thành viên từ {d}', { d: createdAt }) : '');
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
    const res = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(_pUser.id),
      { headers: { Authorization: 'Bearer ' + ((await _tok()) || '') } });
    const d = await res.json();
    const bal = d.balance ?? 0;
    const t = document.getElementById('tabCreditBalance');
    if (t) t.textContent = _tvmbT('js.taikhoan.n-luong-thuong', '{n} lượng', { n: bal });
    return bal;
  } catch(e) {
    console.error('[loadHeaderBalance]', e);
    const t = document.getElementById('tabCreditBalance');
    if (t) t.textContent = '—';
    return null;
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
  btn.disabled = true; btn.textContent = _tvmbT('js.taikhoan.dang-tao', 'Đang tạo…');
  try {
    const res = await fetch('/api/mcp/key', { method: 'POST', headers: { Authorization: `Bearer ${await _tok()}` } });
    const d = await res.json();
    if (_hoSoLeftPage) return;
    if (d && d.url) { const el = document.getElementById('mcpUrl'); if (el) el.value = d.url; _mcpShow('ready'); }
    else alert(_tvmbT('js.taikhoan.khong-tao-duoc-key-thu-lai', 'Không tạo được key, thử lại sau nhé.'));
  } catch { if (!_hoSoLeftPage) alert(_tvmbT('js.taikhoan.loi-mang-thu-lai-sau-nhe', 'Lỗi mạng, thử lại sau nhé.')); }
  finally { btn.disabled = false; btn.textContent = _tvmbT('js.taikhoan.tao-duong-ket-noi', 'Tạo đường kết nối'); }
}
async function copyMcpUrl() {
  const inp = document.getElementById('mcpUrl');
  const btn = document.getElementById('btnMcpCopy');
  try { await navigator.clipboard.writeText(inp.value); }
  catch { inp.select(); document.execCommand('copy'); }
  btn.textContent = _tvmbT('js.taikhoan.da-copy', '✓ Đã copy'); btn.classList.add('ok');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('ok'); }, 1800);
}
async function revokeMcpKey() {
  if (!confirm(_tvmbT('js.taikhoan.thu-hoi-key-hien-tai-ket', 'Thu hồi key hiện tại? Kết nối Đang dùng key cũ sẽ ngừng — bạn sẽ có key mới ngay sau đó.'))) return;
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
      statusEl.innerHTML = _tvmbT('js.taikhoan.da-lien-ket-bot-telegram-dung', '✓ Đã liên kết — bot Telegram dùng chung ví Lượng này.') + (d.telegram_user_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.telegram_user_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = _tvmbT('js.taikhoan.chua-lien-ket', 'Chưa liên kết.');
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = _tvmbT('js.taikhoan.khong-tai-duoc-trang-thai-lien', 'Không tải được trạng thái liên kết.');
  }
}

document.getElementById('btnTgLink').onclick = async () => {
  const btn = document.getElementById('btnTgLink');
  btn.disabled = true; btn.textContent = _tvmbT('js.taikhoan.dang-tao-lien-ket', 'Đang tạo liên kết…');
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
      if (st) st.innerHTML = ic('hourglass') + _tvmbT('js.taikhoan.da-mo-telegram-bam-bat-dau', ' Đã mở Telegram — bấm "Bắt đầu / Start" trong bot để hoàn tất, rồi tải lại trang.');
    } else {
      alert(_tvmbT('js.taikhoan.khong-tao-duoc-lien-ket-thu', 'Không tạo được liên kết, thử lại sau nhé.'));
    }
  } catch {
    if (!_hoSoLeftPage) alert(_tvmbT('js.taikhoan.loi-mang-thu-lai-sau-nhe', 'Lỗi mạng, thử lại sau nhé.'));
  } finally {
    btn.disabled = false; btn.textContent = _tvmbT('js.taikhoan.lien-ket-telegram', 'Liên kết Telegram');
  }
};

document.getElementById('btnTgUnlink').onclick = async () => {
  if (!confirm(_tvmbT('js.taikhoan.huy-lien-ket-telegram-bot-se', 'Hủy liên kết Telegram? Bot sẽ không còn dùng ví Lượng của bạn.'))) return;
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
      statusEl.innerHTML = _tvmbT('js.taikhoan.da-lien-ket-bot-whatsapp-dung', '✓ Đã liên kết — bot WhatsApp dùng chung ví Lượng này.') + (d.whatsapp_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.whatsapp_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = _tvmbT('js.taikhoan.chua-lien-ket', 'Chưa liên kết.');
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = _tvmbT('js.taikhoan.khong-tai-duoc-trang-thai-lien', 'Không tải được trạng thái liên kết.');
  }
}

document.getElementById('btnWaLink').onclick = async () => {
  const btn = document.getElementById('btnWaLink');
  btn.disabled = true; btn.textContent = _tvmbT('js.taikhoan.dang-tao-lien-ket', 'Đang tạo liên kết…');
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
      if (st) st.innerHTML = ic('hourglass') + _tvmbT('js.taikhoan.da-mo-whatsapp-bam-gui-tin', ' Đã mở WhatsApp — bấm GỬI tin soạn sẵn để hoàn tất, rồi tải lại trang.');
    } else {
      alert(_tvmbT('js.taikhoan.khong-tao-duoc-lien-ket-thu', 'Không tạo được liên kết, thử lại sau nhé.'));
    }
  } catch {
    if (!_hoSoLeftPage) alert(_tvmbT('js.taikhoan.loi-mang-thu-lai-sau-nhe', 'Lỗi mạng, thử lại sau nhé.'));
  } finally {
    btn.disabled = false; btn.textContent = _tvmbT('js.taikhoan.lien-ket-whatsapp', 'Liên kết WhatsApp');
  }
};

document.getElementById('btnWaUnlink').onclick = async () => {
  if (!confirm(_tvmbT('js.taikhoan.huy-lien-ket-whatsapp-bot-se', 'Hủy liên kết WhatsApp? Bot sẽ không còn dùng ví Lượng của bạn.'))) return;
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
      statusEl.innerHTML = _tvmbT('js.taikhoan.da-lien-ket-bot-messenger-dung', '✓ Đã liên kết — bot Messenger dùng chung ví Lượng này.') + (d.messenger_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.messenger_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = _tvmbT('js.taikhoan.chua-lien-ket', 'Chưa liên kết.');
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = _tvmbT('js.taikhoan.khong-tai-duoc-trang-thai-lien', 'Không tải được trạng thái liên kết.');
  }
}

document.getElementById('btnMsgrLink').onclick = async () => {
  const btn = document.getElementById('btnMsgrLink');
  btn.disabled = true; btn.textContent = _tvmbT('js.taikhoan.dang-tao-lien-ket', 'Đang tạo liên kết…');
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
      const fallback = d.token ? _tvmbT('js.taikhoan.neu-chua-tu-lien-ket', ' Nếu chưa tự liên kết, gửi tin: /link {t}', { t: escHtml(d.token) }) : '';
      const st = document.getElementById('msgrLinkStatus');
      if (st) st.innerHTML = ic('hourglass') + _tvmbT('js.taikhoan.da-mo-messenger-bam-bat-dau', ' Đã mở Messenger — bấm "Bắt đầu / Get Started" hoặc gửi 1 tin để hoàn tất, rồi tải lại trang.') + fallback;
    } else {
      alert(_tvmbT('js.taikhoan.khong-tao-duoc-lien-ket-thu', 'Không tạo được liên kết, thử lại sau nhé.'));
    }
  } catch {
    if (!_hoSoLeftPage) alert(_tvmbT('js.taikhoan.loi-mang-thu-lai-sau-nhe', 'Lỗi mạng, thử lại sau nhé.'));
  } finally {
    btn.disabled = false; btn.textContent = _tvmbT('js.taikhoan.lien-ket-messenger', 'Liên kết Messenger');
  }
};

document.getElementById('btnMsgrUnlink').onclick = async () => {
  if (!confirm(_tvmbT('js.taikhoan.huy-lien-ket-messenger-bot-se', 'Hủy liên kết Messenger? Bot sẽ không còn dùng ví Lượng của bạn.'))) return;
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
      statusEl.innerHTML = _tvmbT('js.taikhoan.da-lien-ket-bot-zalo-dung', '✓ Đã liên kết — bot Zalo dùng chung ví Lượng này.') + (d.zalo_id ? ' <span class="conn-id">ID: ' + escHtml(String(d.zalo_id)) + '</span>' : '');
      btnLink.style.display = 'none';
      btnUnlink.style.display = 'inline-block';
    } else {
      statusEl.textContent = _tvmbT('js.taikhoan.chua-lien-ket', 'Chưa liên kết.');
      btnLink.style.display = 'inline-block';
      btnUnlink.style.display = 'none';
    }
  } catch {
    statusEl.textContent = _tvmbT('js.taikhoan.khong-tai-duoc-trang-thai-lien', 'Không tải được trạng thái liên kết.');
  }
}

document.getElementById('btnZaloLink').onclick = async () => {
  const btn = document.getElementById('btnZaloLink');
  btn.disabled = true; btn.textContent = _tvmbT('js.taikhoan.dang-tao-ma', 'Đang tạo mã…');
  try {
    const res = await fetch('/api/channels/zalo/link', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await _tok()}` }
    });
    const d = await res.json();
    if (_hoSoLeftPage) return;
    if (d.token) {
      const st = document.getElementById('zaloLinkStatus');
      if (st) st.innerHTML = ic('hourglass') + _tvmbT('js.taikhoan.nhan-cho-oa-zalo', ' Nhắn cho OA Tử Vi Minh Bảo trên Zalo đúng dòng sau (mã sống 15 phút), rồi tải lại trang: <code>/link {t}</code>', { t: escHtml(d.token) });
      if (d.url) window.open(d.url, '_blank');
    } else {
      alert(_tvmbT('js.taikhoan.khong-tao-duoc-lien-ket-thu', 'Không tạo được liên kết, thử lại sau nhé.'));
    }
  } catch {
    if (!_hoSoLeftPage) alert(_tvmbT('js.taikhoan.loi-mang-thu-lai-sau-nhe', 'Lỗi mạng, thử lại sau nhé.'));
  } finally {
    btn.disabled = false; btn.textContent = _tvmbT('js.taikhoan.lien-ket-zalo', 'Liên kết Zalo');
  }
};

document.getElementById('btnZaloUnlink').onclick = async () => {
  if (!confirm(_tvmbT('js.taikhoan.huy-lien-ket-zalo-bot-se', 'Hủy liên kết Zalo? Bot sẽ không còn dùng ví Lượng của bạn.'))) return;
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
    ? _tvmbT('js.taikhoan.moi-nguoi-dang-ky-thuong', 'Mỗi người đăng ký qua link của bạn: <strong>+{n} Lượng</strong> vào ví bạn ngay khi họ tạo tài khoản. ', { n: reward })
      + _tvmbT('js.taikhoan.khi-ho-nap-luong-lan-dau', 'Khi họ nạp Lượng lần đầu, cả hai nhận thêm <strong>30 Lượng</strong> nữa.')
    : _tvmbT('js.taikhoan.ban-da-dung-het-luot-moi', 'Bạn đã dùng hết <strong>{n}</strong> lượt mời được thưởng trong 30 ngày qua — ', { n: cap })
      + _tvmbT('js.taikhoan.luot-moi-se-mo-lai-dan', 'lượt mời sẽ mở lại dần khi qua mốc 30 ngày của từng người.');
  document.getElementById('refProgressLabel').textContent = used + '/' + (cap || '—');
  const bar = document.getElementById('refProgressBar');
  if (bar && cap > 0) setTimeout(() => { bar.style.width = Math.min(100, Math.round(used / cap * 100)) + '%'; }, 100);
  document.getElementById('refTotalCount').textContent = d.invited || 0;
  document.getElementById('refEarnedCount').textContent = d.creditsEarned || 0;

  const btn = document.getElementById('refCopyBtn');
  if (btn && !btn.dataset.wired) {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const done = () => { btn.textContent = _tvmbT('js.taikhoan.da-chep', 'Đã chép ✓'); setTimeout(() => { btn.textContent = _tvmbT('js.taikhoan.sao-chep', 'Sao chép'); }, 1600); };
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
    else host.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.khong-doc-duoc-tien-do-thu', 'Không đọc được tiến độ. Thử tải lại trang.') + '</div>');
  } catch (e) {
    host.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.khong-doc-duoc-tien-do-thu', 'Không đọc được tiến độ. Thử tải lại trang.') + '</div>');
  }
}

function questRowHtml(t, i) {
  return '<div class="qt-row' + (t.done ? ' done' : '') + '"><div class="qt-tick"></div>'
    + '<div class="qt-body"><div class="qt-t">' + escHtml(t.title) + '</div>'
    + (t.done ? '' : '<div class="qt-d">' + escHtml(t.desc) + '</div>') + '</div>'
    + '<div class="qt-pay"><div class="qt-amt">' + (t.done ? '+' : '') + _tvmbT('js.taikhoan.n-luong', '{n} Lượng', { n: (+t.credits || 0) }) + '</div>'
    + (t.done ? '' : '<button class="qt-go" type="button" data-i="' + i + '">' + escHtml(t.cta) + '</button>')
    + '</div></div>';
}

function renderQuestTasks(kh) {
  const host = document.getElementById('qtBody');
  if (!host) return;
  let done = 0;
  for (let i = 0; i < kh.steps.length; i++) if (kh.steps[i].done) done++;

  let h = kh.claimed
    ? ('<div class="qt-top"><div class="qt-count" style="color:var(--green)">' + _tvmbT('js.taikhoan.da-hoan-tat-luong', '✓ Đã hoàn tất — +{n} Lượng đã vào ví.', { n: (+kh.credits || 0) })) + '</div></div>'
    : '<div class="qt-top"><div style="font-size:.85rem;color:var(--text-mid)">' + _tvmbT('js.taikhoan.buoc-xong', '{a}/{b} bước', { a: done, b: kh.steps.length }) + '</div>'
      + '<div class="qt-count">' + _tvmbT('js.taikhoan.luong-khi-xong-ca-n', '+{n} Lượng khi xong cả {b}', { n: (+kh.credits || 0), b: kh.steps.length }) + '</div></div>';
  if (kh.justGranted) h += ('<div class="qt-note ok">' + _tvmbT('js.taikhoan.vua-cong-luong', '✓ Vừa cộng <b>+{n} Lượng</b> vào ví bạn.', { n: (+kh.credits || 0) })) + '</div>';

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
  let h = granted > 0 ? ('<div class="qt-note ok">' + _tvmbT('js.taikhoan.vua-cong-luong', '✓ Vừa cộng <b>+{n} Lượng</b> vào ví bạn.', { n: granted })) + '</div>' : '';

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
  if (!href) { location.href = _tvmbHref('/app'); return; }
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
    host.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.khong-doc-duoc-lich-su', 'Không đọc được lịch sử.') + '</div>');
  }
}

function renderMyShares(list) {
  const host = document.getElementById('spBody');
  if (!host) return;
  if (!list.length) {
    host.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.ban-chua-chia-se-luot-nao', 'Bạn chưa chia sẻ lượt nào.') + '</div>');
    return;
  }
  host.innerHTML = list.map(function (s) {
    const date = new Date(s.created_at).toLocaleDateString(_dateLoc(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    const views = Number(s.view_count) || 0;
    return '<div class="sp-row"><div style="flex:1;min-width:0">'
      + '<div class="sp-plat">' + escHtml(s.title || _tvmbT('js.taikhoan.ket-qua', 'Kết quả')) + '</div>'
      + '<div class="sp-meta">' + date + '</div></div>'
      + '<span class="sp-status approved">' + _tvmbT('js.taikhoan.n-luot-xem', '{n} lượt xem', { n: views }) + '</span></div>';
  }).join('');
}

async function loadCredits() {
  if (!_pUser || !(await _tok())) return;
  // Số dư là điểm neo: credit_transactions không lưu "số dư sau" từng dòng nên
  // cột đó suy ngược từ số dư hiện tại qua bản tóm tắt (viluLoadSummary).
  _viluBal = await loadHeaderBalance();
  loadReferralPanel();
  viluBind();
  // Bản tóm tắt (nhẹ, ≤5000 dòng) chạy song song: nuôi 2 thẻ số, danh sách tính năng,
  // cột "Số dư sau" và tab "Dùng theo tính năng". Bảng chính KHÔNG đợi nó.
  _viluSumP = viluLoadSummary().catch(e => { console.error('[viluLoadSummary]', e); });
  _viluPage = 1;
  await viluFetchPage();
}

var VILU_LABELS = { topup:_tvmbT('js.taikhoan.nap-luong', 'Nạp Lượng'), use_laso:_tvmbT('js.taikhoan.luan-giai-la-so', 'Luận Giải Lá Số'), use_xem_tuoi:_tvmbT('js.taikhoan.xem-tuoi-vo-chong', 'Xem Tuổi Vợ Chồng'), use_xem_lam_an:_tvmbT('js.taikhoan.xem-tuoi-lam-an', 'Xem Tuổi Làm Ăn'), admin_grant:_tvmbT('js.taikhoan.cap-luong-quan-tri', 'Cấp Lượng (quản trị)'), chat:_tvmbT('js.taikhoan.hoi-thay', 'Hỏi Thầy'), refund:_tvmbT('js.taikhoan.hoan-luong', 'Hoàn Lượng') };
function viluLabel(t) { return VILU_LABELS[t.type] || t.description || t.type; }
// Ghi chú = phần mô tả chi tiết; bỏ khi nó chính là nhãn đã hiện ở cột Tính năng.
function viluNote(t) { return t.description && t.description !== viluLabel(t) ? t.description : ''; }
function viluIcon(t) {
  const ty = String(t.type || '');
  if (ty === 'chat') return 'message-circle';
  if (ty === 'refund') return 'rotate-cw';
  if (ty === 'admin_grant') return 'gift';
  if (ty.indexOf('topup') === 0) return 'wallet';
  return 'sparkles';
}
function viluDate(iso, withSec) {
  const o = { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' };
  if (withSec) o.second = '2-digit';
  return new Date(iso).toLocaleString(_dateLoc(), o);
}
function viluNum(n) { return Number(n).toLocaleString(_dateLoc()); }

var VILU_PAGE_SIZE = 10;
var VILU_SUM_PAGE = 1000;   // PostgREST của Supabase cắt mỗi lượt ở 1000 dòng
var VILU_SUM_CAP = 5000;    // trần bản tóm tắt: vượt thì cột "Số dư sau"/tab tính năng chỉ phủ 5000 dòng mới nhất
var _viluBound = false;
var _viluTab = 'all';       // all | feature | topup
var _viluPage = 1;
var _viluRows = [];         // trang hiện tại — lấy từ server
var _viluTotal = 0;         // tổng dòng khớp bộ lọc — server đếm (Content-Range)
var _viluReq = 0;           // số thứ tự lượt gọi: bỏ phản hồi cũ về muộn
var _viluSel = {};          // id → dòng đang tick (giữ qua các trang)
var _viluBal = null;        // số dư hiện tại
var _viluSum = [];          // bản tóm tắt: id,type,amount,description,created_at (mới → cũ)
var _viluSumReady = false;
var _viluSumCut = false;
var _viluSumP = null;
var _viluAfter = {};        // id → số dư sau giao dịch

function viluHeaders(tok, extra) {
  return Object.assign({ apikey: SUPABASE_ANON, Authorization: 'Bearer ' + tok }, extra || {});
}
function viluBase() {
  return SUPABASE_URL + '/rest/v1/credit_transactions?user_id=eq.' + encodeURIComponent(_pUser.id);
}
// Mọi bộ lọc đi MỘT đường: server lọc (bảng chính) và client lọc bản tóm tắt (tab tính năng, xuất CSV).
function viluCriteria() {
  return {
    feat: document.getElementById('viluTypeFilter')?.value || '',
    days: Number(document.getElementById('viluRange')?.value) || 0,
  };
}
function viluFilterQs() {
  const c = viluCriteria();
  let qs = '';
  if (_viluTab === 'topup') qs += '&amount=gt.0';
  if (c.feat) qs += '&type=eq.' + encodeURIComponent(c.feat);
  if (c.days) qs += '&created_at=gte.' + encodeURIComponent(new Date(Date.now() - c.days * 864e5).toISOString());
  return qs;
}
function viluHasFilter() { const c = viluCriteria(); return _viluTab === 'topup' || !!c.feat || !!c.days; }
function viluSumFiltered() {
  const c = viluCriteria();
  const since = c.days ? Date.now() - c.days * 864e5 : 0;
  return _viluSum.filter(t => {
    if (_viluTab === 'topup' && !(t.amount > 0)) return false;
    if (_viluTab === 'feature' && !(t.amount < 0)) return false;
    if (c.feat && t.type !== c.feat) return false;
    if (since && new Date(t.created_at).getTime() < since) return false;
    return true;
  });
}

// Một trang của bảng chính: server lọc + cắt trang + đếm tổng (Prefer: count=exact).
async function viluFetchPage() {
  const el = document.getElementById('transactionList');
  if (!el || !_pUser) return;
  const mine = ++_viluReq;
  el.style.opacity = '.55';
  try {
    const tok = await _tok();
    if (!tok) return;
    const off = (_viluPage - 1) * VILU_PAGE_SIZE;
    const res = await fetch(
      viluBase() + viluFilterQs() + '&order=created_at.desc,id.desc&select=*&limit=' + VILU_PAGE_SIZE + '&offset=' + off,
      { cache: 'no-store', headers: viluHeaders(tok, { Prefer: 'count=exact' }) }
    );
    if (mine !== _viluReq) return;
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const m = /\/(\d+)$/.exec(res.headers.get('Content-Range') || '');
    const rows = await res.json();
    if (mine !== _viluReq) return;
    _viluRows = rows;
    _viluTotal = m ? Number(m[1]) : off + rows.length;
    // Dữ liệu co lại giữa hai lượt (trang cuối biến mất) ⇒ lùi về trang cuối rồi gọi lại.
    if (!rows.length && _viluTotal > 0 && _viluPage > 1) {
      _viluPage = Math.ceil(_viluTotal / VILU_PAGE_SIZE);
      return viluFetchPage();
    }
    el.style.opacity = '';
    renderViluTable();
  } catch (e) {
    if (mine !== _viluReq) return;
    console.error('[viluFetchPage]', e);
    el.style.opacity = '';
    el.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.khong-the-tai-lich-su', 'Không thể tải lịch sử.') + '</div>');
  }
}

// Bản tóm tắt: chỉ 5 cột nhẹ, phân khúc 1000 dòng/lượt.
async function viluLoadSummary() {
  const rows = [];
  while (rows.length < VILU_SUM_CAP) {
    const tok = await _tok();
    if (!tok) return;
    const res = await fetch(
      viluBase() + '&order=created_at.desc,id.desc&select=id,type,amount,description,created_at&limit=' + VILU_SUM_PAGE + '&offset=' + rows.length,
      { cache: 'no-store', headers: viluHeaders(tok) }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const part = await res.json();
    rows.push.apply(rows, part);
    if (part.length < VILU_SUM_PAGE) break;
  }
  _viluSum = rows;
  _viluSumCut = rows.length >= VILU_SUM_CAP;
  // Suy ngược từ số dư hiện tại: dòng mới nhất = số dư hiện tại, mỗi dòng cũ hơn trừ đi giao dịch của dòng liền trước.
  let run = typeof _viluBal === 'number' ? _viluBal : null;
  _viluAfter = {};
  rows.forEach(t => { if (run !== null) { _viluAfter[t.id] = run; run -= t.amount; } });
  _viluSumReady = true;

  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthUsed = rows
    .filter(tx => tx.amount < 0 && new Date(tx.created_at) >= monthStart)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const label = document.getElementById('monthlyUsageLabel');
  if (label) label.textContent = _tvmbT('js.taikhoan.n-luong-thuong', '{n} lượng', { n: monthUsed });
  const last = document.getElementById('lastTxnLabel');
  if (last) last.textContent = rows.length ? viluDate(rows[0].created_at, false) : '—';

  // Dropdown lọc theo tính năng — liệt kê đúng các `type` có trong dữ liệu, không bịa nhóm.
  const typeSel = document.getElementById('viluTypeFilter');
  if (typeSel) {
    const seen = {}, cur = typeSel.value;
    let opts = ('<option value="">' + _tvmbT('js.taikhoan.moi-tinh-nang', 'Mọi tính năng') + '</option>');
    rows.forEach(t => {
      if (t.type && !seen[t.type]) { seen[t.type] = 1; opts += `<option value="${escHtml(t.type)}">${escHtml(viluLabel(t))}</option>`; }
    });
    typeSel.innerHTML = opts;
    typeSel.value = cur;
  }
  renderViluTable();   // điền cột "Số dư sau" / dựng tab tính năng
}

function viluBind() {
  if (_viluBound) return;
  _viluBound = true;
  const redraw = () => {
    _viluPage = 1; _viluSel = {};
    if (_viluTab === 'feature') renderViluTable(); else viluFetchPage();
  };
  const typeSel = document.getElementById('viluTypeFilter');
  if (typeSel) typeSel.addEventListener('change', redraw);
  const range = document.getElementById('viluRange');
  if (range) range.addEventListener('change', redraw);
  document.querySelectorAll('#tab-credits .lh-tab').forEach(b => b.addEventListener('click', () => { _viluTab = b.dataset.lt; redraw(); }));
  const exp = document.getElementById('viluExport');
  if (exp) exp.addEventListener('click', viluExport);
  // Bảng dựng lại bằng innerHTML mỗi lần vẽ ⇒ nghe uỷ quyền trên khung cha.
  const host = document.getElementById('transactionList');
  if (!host) return;
  host.addEventListener('change', e => {
    const el = e.target;
    const byId = id => _viluRows.filter(r => String(r.id) === id)[0];
    if (el.id === 'viluAll') {
      host.querySelectorAll('.lh-pick').forEach(c => {
        c.checked = el.checked;
        const r = byId(c.dataset.id);
        if (r) { if (el.checked) _viluSel[r.id] = r; else delete _viluSel[r.id]; }
      });
    } else if (el.classList && el.classList.contains('lh-pick')) {
      const r = byId(el.dataset.id);
      if (r) { if (el.checked) _viluSel[r.id] = r; else delete _viluSel[r.id]; }
      const all = document.getElementById('viluAll');
      if (all) all.checked = Array.prototype.every.call(host.querySelectorAll('.lh-pick'), c => c.checked);
    } else return;
    viluSyncExport();
  });
  host.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.lh-more'); if (b) viluCopyId(b); });
}

function viluSyncExport() {
  const b = document.getElementById('viluExport');
  if (!b) return;
  const n = Object.keys(_viluSel).length;
  b.textContent = n ? _tvmbT('js.taikhoan.xuat-n-dong', 'Xuất {n} dòng đã chọn', { n }) : _tvmbT('js.taikhoan.xuat-csv', 'Xuất CSV');
}

function viluCopyId(b) {
  const done = () => { b.textContent = '✓'; setTimeout(() => { b.textContent = '⋯'; }, 1200); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.dataset.id).then(done).catch(e => console.error('[viluCopyId]', e));
}

// Xuất CSV: dòng đã tick nếu có, nếu không thì TOÀN BỘ kết quả sau lọc (mọi trang, từ bản tóm tắt).
async function viluExport() {
  const picked = Object.keys(_viluSel).length;
  let rows;
  if (picked) rows = Object.keys(_viluSel).map(k => _viluSel[k]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  else { await _viluSumP; rows = viluSumFiltered(); }
  if (!rows.length) return;
  // Ô chữ do người dùng/ứng dụng ghi (mô tả) có thể mở đầu bằng = + - @ ⇒ Excel hiểu là công thức.
  const q = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const lines = [_tvmbT('js.taikhoan.csv-cot', 'Thời gian,Tính năng,Lượng,Số dư sau,Ghi chú,Mã giao dịch')].concat(rows.map(t =>
    [q(t.created_at), q(viluLabel(t)), t.amount, _viluAfter[t.id] == null ? '' : _viluAfter[t.id], q(viluNote(t)), q(t.id)].join(',')
  ));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = 'lich-su-luong-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Số trang hiển thị: 1 … cur-1 cur cur+1 … last (null = dấu "…").
function viluPages(cur, total) {
  const set = {};
  [1, total, cur - 1, cur, cur + 1].forEach(p => { if (p >= 1 && p <= total) set[p] = 1; });
  const nums = Object.keys(set).map(Number).sort((a, b) => a - b), out = [];
  nums.forEach((p, i) => { if (i && p - nums[i - 1] > 1) out.push(null); out.push(p); });
  return out;
}

// Vẽ thuần từ trạng thái (không gọi mạng): bảng chính theo `_viluRows`/`_viluTotal`, tab tính năng theo `_viluSum`.
function renderViluTable() {
  const el = document.getElementById('transactionList');
  const pager = document.getElementById('viluPager');
  if (!el) return;
  document.querySelectorAll('#tab-credits .lh-tab').forEach(b => {
    const on = b.dataset.lt === _viluTab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  viluSyncExport();
  if (pager) pager.style.display = 'none';

  if (_viluTab === 'feature') {
    if (!_viluSumReady) { el.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.dang-tai', 'Đang tải…') + '</div>'); return; }
    const rows = viluSumFiltered();
    if (!rows.length) { el.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.khong-co-giao-dich-khop-bo', 'Không có giao dịch khớp bộ lọc.') + '</div>'); return; }
    renderViluUsage(el, rows);
    return;
  }

  if (!_viluTotal) {
    el.innerHTML = viluHasFilter()
      ? ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.khong-co-giao-dich-khop-bo', 'Không có giao dịch khớp bộ lọc.') + '</div>')
      : ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.chua-co-giao-dich-nao', 'Chưa có giao dịch nào.') + '</div>');
    return;
  }

  const totalPages = Math.max(1, Math.ceil(_viluTotal / VILU_PAGE_SIZE));
  const start = (_viluPage - 1) * VILU_PAGE_SIZE;
  const pageItems = _viluRows;
  const pick = _tvmbT('js.taikhoan.chon-giao-dich', 'Chọn giao dịch');
  const copyTip = _tvmbT('js.taikhoan.sao-chep-ma', 'Sao chép mã giao dịch');

  el.innerHTML = '<div class="vilu-tbl-wrap"><table class="vilu-tbl"><thead><tr>' +
    _tvmbT('js.taikhoan.cot-giao-dich', '<th class="lh-cb"></th><th>Thời gian</th><th>Tính năng</th><th>Lượng</th><th>Số dư sau</th><th>Ghi chú</th><th></th>') +
    '</tr></thead><tbody>' + pageItems.map(t => {
      const isAdd = t.amount > 0;
      const id = t.id == null ? '' : escHtml(String(t.id));
      const after = _viluAfter[t.id];
      return '<tr><td class="lh-cb">' + (id ? '<input type="checkbox" class="lh-pick" data-id="' + id + '" aria-label="' + escHtml(pick) + '"' + (_viluSel[t.id] ? ' checked' : '') + '>' : '') + '</td>' +
        '<td>' + escHtml(viluDate(t.created_at, true)) + '</td>' +
        '<td><span class="lh-ft"><span data-icon="' + viluIcon(t) + '"></span>' + escHtml(viluLabel(t)) + '</span></td>' +
        '<td class="vilu-amt ' + (isAdd ? 'pos' : 'neg') + '">' + (isAdd ? '+' : '') + escHtml(viluNum(t.amount)) + '</td>' +
        '<td>' + (after == null ? '—' : escHtml(viluNum(after))) + '</td>' +
        '<td class="lh-note" title="' + escHtml(viluNote(t)) + '">' + escHtml(viluNote(t)) + '</td>' +
        '<td>' + (id ? '<button type="button" class="lh-more" data-id="' + id + '" title="' + escHtml(copyTip) + '" aria-label="' + escHtml(copyTip) + '">⋯</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  if (window.mountIcons) window.mountIcons(el);
  const all = document.createElement('input');
  all.type = 'checkbox'; all.id = 'viluAll';
  all.setAttribute('aria-label', _tvmbT('js.taikhoan.chon-tat-ca', 'Chọn tất cả'));
  all.checked = pageItems.length > 0 && pageItems.every(t => _viluSel[t.id]);
  const th = el.querySelector('th.lh-cb');
  if (th) th.appendChild(all);

  if (pager) {
    pager.style.display = 'flex';
    let btns = '';
    if (totalPages > 1) {
      btns = '<button type="button" class="vilu-pgbtn" data-p="' + (_viluPage - 1) + '"' + (_viluPage === 1 ? ' disabled' : '') + ' aria-label="' + escHtml(_tvmbT('js.taikhoan.trang-truoc', 'Trang trước')) + '">←</button>' +
        viluPages(_viluPage, totalPages).map(p => p === null ? '<span>…</span>' :
          '<button type="button" class="vilu-pgbtn' + (p === _viluPage ? ' active' : '') + '" data-p="' + p + '">' + p + '</button>').join('') +
        '<button type="button" class="vilu-pgbtn" data-p="' + (_viluPage + 1) + '"' + (_viluPage === totalPages ? ' disabled' : '') + ' aria-label="' + escHtml(_tvmbT('js.taikhoan.trang-sau', 'Trang sau')) + '">→</button>';
    }
    pager.innerHTML = '<span>' + _tvmbT('js.taikhoan.hien-thi-giao-dich', 'Hiển thị {a}–{b} / {n} giao dịch', { a: start + 1, b: start + pageItems.length, n: viluNum(_viluTotal) }) + '</span><div class="vilu-pgbtns">' + btns + '</div>';
    pager.querySelectorAll('.vilu-pgbtn').forEach(b => b.addEventListener('click', () => { _viluPage = parseInt(b.dataset.p, 10); viluFetchPage(); }));
  }
}

// Tab "Dùng theo tính năng": gộp các dòng TRỪ Lượng theo `type`, xếp theo Lượng đã dùng.
function renderViluUsage(el, rows) {
  const g = {};
  let total = 0;
  rows.forEach(t => {
    const k = t.type || '';
    const o = g[k] || (g[k] = { t, uses: 0, sum: 0 });   // rows mới → cũ: t là dòng mới nhất
    o.uses++; o.sum += -t.amount; total += -t.amount;
  });
  const list = Object.keys(g).map(k => g[k]).sort((a, b) => b.sum - a.sum);
  el.innerHTML = '<div class="vilu-tbl-wrap"><table class="vilu-tbl lh-usage"><thead><tr>' +
    _tvmbT('js.taikhoan.cot-theo-tinh-nang', '<th>Tính năng</th><th class="lh-num">Lượt dùng</th><th class="lh-num">Lượng đã dùng</th><th>Tỷ trọng</th>') +
    '</tr></thead><tbody>' + list.map(o => {
      const pct = total > 0 ? Math.round(o.sum / total * 100) : 0;
      return '<tr><td><span class="lh-ft"><span data-icon="' + viluIcon(o.t) + '"></span>' + escHtml(viluLabel(o.t)) + '</span></td>' +
        '<td class="lh-num">' + escHtml(viluNum(o.uses)) + '</td>' +
        '<td class="lh-num vilu-amt">' + escHtml(viluNum(o.sum)) + '</td>' +
        '<td><div class="lh-share"><i style="width:' + pct + 'px;max-width:100px"></i><span>' + pct + '%</span></div></td></tr>';
    }).join('') + '</tbody></table></div>';
  if (window.mountIcons) window.mountIcons(el);
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
      alert.innerHTML = ('<div class="alert success">' + _tvmbT('js.taikhoan.da-luu-ten-hien-thi', '✓ Đã lưu tên hiển thị.') + '</div>');
      const nd = document.getElementById('userDisplayName');
      if (nd) nd.textContent = name || _tvmbT('js.taikhoan.nguoi-dung', 'Người Dùng');
      const al = document.getElementById('avatarLetter');
      if (al) al.textContent = (name || 'N')[0].toUpperCase();
    } else throw new Error();
  } catch {
    alert.innerHTML = ('<div class="alert error">' + _tvmbT('js.taikhoan.luu-that-bai-thu-lai', '✗ Lưu thất bại. Thử lại.') + '</div>');
  }
  setTimeout(() => { alert.innerHTML = ''; }, 3000);
}

async function changePassword() {
  const pwd = document.getElementById('newPwd').value;
  const confirm = document.getElementById('confirmPwd').value;
  const alert = document.getElementById('pwdAlert');
  if (pwd !== confirm) { alert.innerHTML = ('<div class="alert error">' + _tvmbT('js.taikhoan.mat-khau-khong-khop', 'Mật khẩu không khớp.') + '</div>'); return; }
  if (pwd.length < 6) { alert.innerHTML = ('<div class="alert error">' + _tvmbT('js.taikhoan.mat-khau-toi-thieu-6-ky', 'Mật khẩu tối thiểu 6 ký tự.') + '</div>'); return; }
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${await _tok()}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    if (resp.ok) {
      alert.innerHTML = ('<div class="alert success">' + _tvmbT('js.taikhoan.da-doi-mat-khau-thanh-cong', '✓ Đã đổi mật khẩu thành công.') + '</div>');
      const np = document.getElementById('newPwd');
      if (np) np.value = '';
      const cp = document.getElementById('confirmPwd');
      if (cp) cp.value = '';
    } else throw new Error();
  } catch {
    alert.innerHTML = ('<div class="alert error">' + _tvmbT('js.taikhoan.doi-mat-khau-that-bai', '✗ Đổi mật khẩu thất bại.') + '</div>');
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
  if (!(await _tok())) { box.innerHTML = ('<div class="mem-empty">' + _tvmbT('js.taikhoan.dang-nhap-de-xem-ho-so', 'Đăng nhập để xem hồ sơ.') + '</div>'); return; }
  box.innerHTML = ('<div class="mem-empty">' + _tvmbT('js.taikhoan.dang-tai', 'Đang tải…') + '</div>');
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
    box.innerHTML = ('<div class="mem-empty">' + _tvmbT('js.taikhoan.khong-doc-duoc-ho-so-thu', 'Không đọc được hồ sơ. Thử tải lại trang.') + '</div>');
  }
}

function memRender() {
  const box = document.getElementById('memList');
  if (!box) return;
  if (!_memItems.length) {
    box.innerHTML = ('<div class="mem-empty">' + _tvmbT('js.taikhoan.thay-chua-ghi-lai', 'Thầy chưa ghi lại điều gì về bạn.<br>Cứ trò chuyện vài lần, Thầy sẽ tự nhớ những điều đáng nhớ.')) + '</div>';
    return;
  }
  box.innerHTML = _memItems.map(function (it, i) {
    return '<div class="mem-item">'
      + '<div class="mem-body">'
      +   '<div class="mem-kind">' + escHtml(_memKinds[it.loai] || _tvmbT('js.taikhoan.khac', 'Khác')) + '</div>'
      +   '<div class="mem-text" id="memTxt' + i + '">' + escHtml(it.noi_dung) + '</div>'
      +   '<div class="mem-src">' + (it.nguon === 'nguoi' ? _tvmbT('js.taikhoan.ban-tu-them', 'Bạn tự thêm') : _tvmbT('js.taikhoan.thay-tu-ghi', 'Thầy tự ghi')) + '</div>'
      + '</div>'
      + '<div class="mem-act">'
      +   '<button class="mem-btn" onclick="memStartEdit(' + i + (')">' + _tvmbT('js.taikhoan.sua', 'Sửa') + '</button>')
      +   '<button class="mem-btn danger" onclick="memDelete(' + i + (')">' + _tvmbT('js.taikhoan.xoa', 'Xoá') + '</button>')
      + '</div></div>';
  }).join('') + ('<div class="mem-src" style="margin-top:.5rem">' + _tvmbT('js.taikhoan.giu-toi-da-muc', 'Giữ tối đa {n} mục — quá thì Thầy tự bỏ mục cũ nhất.', { n: _memMax })) + '</div>';
}

function memStartEdit(i) {
  const cell = document.getElementById('memTxt' + i);
  if (!cell || !_memItems[i]) return;
  const cur = _memItems[i].noi_dung;
  cell.innerHTML = '<input class="mem-edit" id="memInp' + i + '" maxlength="200">'
    + '<div style="margin-top:.4rem;display:flex;gap:.35rem">'
    + '<button class="mem-btn" onclick="memSave(' + i + (')">' + _tvmbT('js.taikhoan.luu', 'Lưu') + '</button>')
    + ('<button class="mem-btn" onclick="memRender()">' + _tvmbT('js.taikhoan.huy', 'Huỷ') + '</button></div>');
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
  if (!confirm(_tvmbT('js.taikhoan.xoa-dieu-nay-khoi-ho-so', 'Xoá điều này khỏi hồ sơ? Thầy sẽ quên hẳn.'))) return;
  await memPost('memory-delete', { id: _memItems[i].id });
}

async function memAdd() {
  const inp = document.getElementById('memAddText');
  const sel = document.getElementById('memAddKind');
  if (!inp) return;
  const val = inp.value.trim();
  if (val.length < 3) { alert(_tvmbT('js.taikhoan.viet-dai-hon-mot-chut-nhe', 'Viết dài hơn một chút nhé.')); return; }
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
    if (!r.ok) { alert((j && j.error) || _tvmbT('js.taikhoan.khong-thuc-hien-duoc', 'Không thực hiện được.')); return false; }
    await loadMemory();
    return true;
  } catch (e) { alert(_tvmbT('js.taikhoan.loi-mang', 'Lỗi mạng.')); return false; }
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
  ['noi_dung',  _tvmbT('js.taikhoan.fb-noi-dung', 'Nội dung luận giải')],
  ['bug',       _tvmbT('js.taikhoan.fb-bug', 'Lỗi kỹ thuật')],
  ['tinh_nang', _tvmbT('js.taikhoan.fb-tinh-nang', 'Đề xuất tính năng')],
  ['thanh_toan',_tvmbT('js.taikhoan.fb-thanh-toan', 'Thanh toán · Lượng')],
  ['khac',      _tvmbT('js.taikhoan.khac', 'Khác')],
];
// Nhãn hiện cho NGƯỜI GÓP Ý — cố ý khác nhãn trong admin: 'bo_qua' ở đây là
// "Đã xem", không phải "Bỏ qua". Người ta bỏ công viết, đừng trả về mặt chữ
// nói rằng công đó bị vứt.
var FB_STATUS = {
  moi:        [_tvmbT('js.taikhoan.fb-da-nhan', 'Đã nhận'),    'chip-blue',  'chip-blue-line',  'blue'],
  dang_xu_ly: [_tvmbT('js.taikhoan.fb-dang-xu-ly', 'Đang xử lý'), 'chip-amber', 'chip-amber-line', 'tx-amber'],
  da_xu_ly:   [_tvmbT('js.taikhoan.fb-da-xu-ly', 'Đã xử lý'),   'chip-green', 'chip-green-line', 'green'],
  bo_qua:     [_tvmbT('js.taikhoan.fb-da-xem', 'Đã xem'),     'chip-blue',  'chip-blue-line',  'text-lt'],
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
    +   '<h3>' + ic('inbox', 16) + ' ' + _tvmbT('js.taikhoan.gui-gop-y-tieu-de', 'Gửi góp ý') + '</h3>'
    +   '<p style="font-size:.85rem;color:var(--text-mid);margin:-.35rem 0 1rem;line-height:1.6">'
    +     _tvmbT('js.taikhoan.day-la-hop-thu-toi-thang', 'Đây là hộp thư tới thẳng người vận hành — không phải chỗ hỏi Thầy. ')
    +     _tvmbT('js.taikhoan.moi-y-kien-ve-noi-dung', 'Mọi ý kiến về nội dung luận giải, lỗi kỹ thuật, giá Lượng hay tính năng bạn muốn có, ')
    +     _tvmbT('js.taikhoan.viet-vao-day-chung-toi-doc', 'viết vào đây. Chúng tôi đọc hết và trả lời ngay trong trang này.')
    +   '</p>'
    +   '<div class="form-row">'
    +     ('<label for="fbKind">' + _tvmbT('js.taikhoan.noi-dung-gop-y-ve', 'Nội dung góp ý về') + '</label>')
    +     '<select id="fbKind">' + opts + '</select>'
    +   '</div>'
    +   '<div class="form-row">'
    +     ('<label for="fbMessage">' + _tvmbT('js.taikhoan.ban-muon-noi-gi', 'Bạn muốn nói gì?') + '</label>')
    +     '<textarea id="fbMessage" rows="6" maxlength="' + FB_MAX + '" '
    +       'placeholder="' + _tvmbT('js.taikhoan.fb-placeholder', 'Càng cụ thể càng dễ sửa. Ví dụ: &quot;Mục Tài Vận trong bản Luận Giải của lá số sinh 1990 nói ngược với mục Đại Vận&quot; — hơn hẳn &quot;luận giải chưa hay&quot;.') + '" '
    +       'style="font-family:inherit;line-height:1.6;resize:vertical"></textarea>'
    +     '<div id="fbCount" style="font-size:.74rem;color:var(--text-lt);text-align:right;margin-top:.25rem">0 / ' + FB_MAX + '</div>'
    +   '</div>'
    +   ('<button class="btn-primary" id="fbSubmit" onclick="submitFeedback()">' + _tvmbT('js.taikhoan.gui-gop-y-ka3h', 'Gửi Góp Ý') + '</button>')
    +   '<div id="fbAlert"></div>'
    +   '<p style="font-size:.78rem;color:var(--text-lt);margin-top:.9rem;line-height:1.6">'
    +     ic('info', 12) + _tvmbT('js.taikhoan.trang-thiet-bi-ban-dang-dung', ' Trang / thiết bị bạn đang dùng được đính kèm tự động để chúng tôi lần được lỗi — bạn không cần mô tả. ')
    +     (_tvmbT('js.taikhoan.viec-gap-ve-thanh-toan-xem', 'Việc gấp về thanh toán: xem') + ' <a href="' + _tvmbHref('/huong-dan-thanh-toan.html') + '" style="color:var(--tx-gold)">' + _tvmbT('js.taikhoan.huong-dan-thanh-toan', 'Hướng dẫn thanh toán') + '</a> ')
    +     (_tvmbT('js.taikhoan.hoac', 'hoặc') + ' <a href="' + _tvmbHref('/contact.html') + '" style="color:var(--tx-gold)">' + _tvmbT('js.taikhoan.lien-he', 'Liên hệ') + '</a>.')
    +   '</p>'
    + '</div>'
    + '<div class="account-section">'
    +   '<h3>' + _tvmbT('js.taikhoan.gop-y-da-gui', 'Góp ý đã gửi') + '</h3>'
    +   ('<div id="fbList"><div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.dang-tai', 'Đang tải…') + '</div></div>')
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
  if (message.length < 5) { fbAlert(_tvmbT('js.taikhoan.viet-giup-vai-dong-de-chung', 'Viết giúp vài dòng để chúng tôi hiểu ý nhé.'), 'error'); return; }

  _fbBusy = true;
  if (btn) { btn.disabled = true; btn.textContent = _tvmbT('js.taikhoan.dang-gui', 'Đang gửi…'); }
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await _tok()) },
      body: JSON.stringify({ kind, message, page_url: location.href, meta: fbMeta() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { fbAlert(data.error || _tvmbT('js.taikhoan.khong-gui-duoc-xin-thu-lai', 'Không gửi được. Xin thử lại.'), 'error'); return; }
    if (ta) ta.value = '';
    fbCount();
    fbAlert(_tvmbT('js.taikhoan.da-nhan-cam-on-ban-trang', 'Đã nhận — cảm ơn bạn. Trạng thái xử lý hiện ngay bên dưới.'), 'success');
    await fbLoadList();
  } catch (e) {
    console.error('[submitFeedback]', e);
    fbAlert(_tvmbT('js.taikhoan.loi-mang-xin-thu-lai', 'Lỗi mạng — xin thử lại.'), 'error');
  } finally {
    _fbBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = _tvmbT('js.taikhoan.gui-gop-y-ka3h', 'Gửi Góp Ý'); }
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
    el.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.khong-tai-duoc-danh-sach-gop', 'Không tải được danh sách góp ý.') + '</div>');
  }
}

function fbRenderList(list) {
  const el = document.getElementById('fbList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = ('<div style="color:var(--text-lt);font-size:.85rem">' + _tvmbT('js.taikhoan.ban-chua-gui-gop-y-nao', 'Bạn chưa gửi góp ý nào.') + '</div>');
    return;
  }
  const KIND = Object.fromEntries(FB_KINDS);
  el.innerHTML = list.map(f => {
    const st = FB_STATUS[f.status] || FB_STATUS.moi;
    const date = new Date(f.created_at).toLocaleDateString(_dateLoc(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    // Góp ý gửi kèm lá phiếu từ nút dưới bản luận giải — nhắc lại để người ta
    // nhớ mình đã nói về bản nào.
    const vote = f.rating === 'down' ? ic('x-circle', 13) + _tvmbT('js.taikhoan.chua-dung', ' Chưa đúng')
               : f.rating === 'up'   ? ic('check-circle', 13) + _tvmbT('js.taikhoan.dung', ' Đúng') : '';
    const from = (f.source === 'reading' && f.tool_id)
      ? '<span style="font-size:.74rem;color:var(--text-lt)">· ' + escHtml(f.tool_id) + '</span>' : '';
    const reply = f.admin_reply
      ? '<div style="margin-top:.7rem;padding:.65rem .8rem;background:var(--gold-lt);border-left:3px solid var(--tx-gold);border-radius:0 6px 6px 0">'
        + ('<div style="font-size:.72rem;font-weight:700;color:var(--tx-gold);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">' + _tvmbT('js.taikhoan.hoi-dap-tu-tu-vi-minh', 'Hồi đáp từ Tử Vi Minh Bảo') + '</div>')
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
