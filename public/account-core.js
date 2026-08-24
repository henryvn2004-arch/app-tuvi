/* ============================================================
   account-core.js — Logic trang Tài khoản (Hồ sơ / Ví Lượng /
   Kết nối / Lịch sử). Tách từ profile.html để DÙNG CHUNG giữa
   trang standalone /profile VÀ trang shell /app/tai-khoan.
   Thao tác trên id cố định; host tự lo chrome + icon renderer
   (window.mountIcons/iconHtml từ nav.js, hoặc shim ở trang shell).
   sourceType: script (không module) — hàm top-level = global cho onclick.
   ============================================================ */
const SUPABASE_URL  = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

let _pUser = null;
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
let _pHistoryData = null;
let _pChatState = { slug: null, product: 'laso', messages: [], lasoContext: null };

// ── AUTH INIT ──
async function initProfile() {
  // auth.js có thể đang refresh async — đợi tối đa 1.5s
  const deadline = Date.now() + 1500;
  while (!window.Auth?.isLoggedIn() && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 100));
  }

  document.getElementById('authLoading').style.display = 'none';

  if (!window.Auth?.isLoggedIn()) {
    document.getElementById('notLoggedIn').style.display = 'block';
    return;
  }

  _pUser  = window.Auth.getUser();

  renderProfileHeader();
  document.getElementById('dashboard').style.display = 'block';
  loadHistory();
  setupTabs();
  setupHistFilters();
  loadHeaderBalance();
  if (window.mountIcons) window.mountIcons();
}

// SVG icon inline (Lucide qua nav.js) — dùng trong template JS thay cho emoji.
function ic(key, px) {
  px = px || 14;
  const svg = window.iconHtml ? window.iconHtml(key) : '';
  return '<span style="display:inline-flex;width:' + px + 'px;height:' + px + 'px;vertical-align:-2px;color:currentColor">' + svg + '</span>';
}

// Chip lọc trong tab Lịch Sử: hiện/ẩn từng nhóm công cụ.
function setupHistFilters() {
  const chips = document.querySelectorAll('#tab-lichsu .hist-chip');
  const groups = document.querySelectorAll('#tab-lichsu .hist-group');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const f = chip.dataset.filter;
    groups.forEach(g => { g.style.display = (f === 'all' || g.dataset.group === f) ? '' : 'none'; });
  }));
}

function renderProfileHeader() {
  const email = _pUser.email || '';
  const displayName = _pUser.user_metadata?.display_name || _pUser.user_metadata?.full_name || '';
  const createdAt = _pUser.created_at ? new Date(_pUser.created_at).toLocaleDateString('vi-VN',{year:'numeric',month:'long'}) : '';
  const letter = (displayName || email || '?')[0].toUpperCase();

  document.getElementById('avatarLetter').textContent = letter;
  document.getElementById('userEmail').textContent = email;
  document.getElementById('userDisplayName').textContent = displayName || 'Người Dùng';
  document.getElementById('userSince').textContent = createdAt ? `Thành viên từ ${createdAt}` : '';
  document.getElementById('accEmail').value = email;
  document.getElementById('accName').value = displayName;

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
      if (btn.dataset.tab === 'credits') loadCredits();
      if (btn.dataset.tab === 'ketnoi') loadKetnoi();
      if (btn.dataset.tab === 'thaynho') loadMemory();
      if (btn.dataset.tab === 'nhiemvu') { loadReferralPanel(); loadQuestTasks(); loadMyShares(); }
    });
  });
  // Mở thẳng một tab qua địa chỉ: `/profile.html#ketnoi`. Trước đây tab chỉ đổi
  // được bằng cú bấm, nên MỌI liên kết từ nơi khác đều đổ người ta xuống tab
  // Lịch Sử rồi để họ tự đi tìm — thẻ nhiệm vụ M3 trỏ tới đây là gặp đúng chỗ
  // đó. Chỉ nhận đúng tên tab đã khai (không phải chuỗi tự do từ URL).
  openTabFromHash();
  window.addEventListener('hashchange', openTabFromHash);
}

function openTabFromHash() {
  const key = String(location.hash || '').replace(/^#/, '').trim();
  if (!key) return;
  const btn = document.querySelector('.tab-btn[data-tab="' + CSS.escape(key) + '"]');
  if (btn) btn.click();
}

// ── LOAD HISTORY ──
async function loadHistory() {
  const resp = await fetch('/api/history?action=list', {
    headers: { Authorization: `Bearer ${await _tok()}` }
  });
  if (!resp.ok) { console.error('history load failed'); return; }
  _pHistoryData = await resp.json();

  renderLasos(_pHistoryData.lasos || []);
  renderXemTuoi(_pHistoryData.xemTuoi || []);
  renderTuong(_pHistoryData.tuong || []);
  // Hub shell (app-tai-khoan) thay danh sách chat cũ (chat_history theo trang SEO)
  // bằng HỘI THOẠI shell (tuvi_chats app-* + localStorage). /profile giữ bản cũ.
  if (window.ACCOUNT_SHELL_CHAT) window.ACCOUNT_SHELL_CHAT();
  else renderChatList(_pHistoryData.chatList || []);
  renderPurchases(_pHistoryData.purchases || []);
}

// ── RENDER LÁ SỐ ──
const GIO_MAP = {Tý:'Tý',Sửu:'Sửu',Dần:'Dần',Mão:'Mão',Thìn:'Thìn',Tỵ:'Tỵ',Ngọ:'Ngọ',Mùi:'Mùi',Thân:'Thân',Dậu:'Dậu',Tuất:'Tuất',Hợi:'Hợi'};
const PHAN_LABELS = {
  '1':'Tổng Quan','2':'Cung Mệnh','3':'Tâm Tính','4':'Học Vấn',
  '5':'Phụ Mẫu','6':'Phúc Đức','7':'Điền Trạch','8':'Quan Lộc',
  '9':'Nô Bộc','10':'Thiên Di','11':'Tật Ách','12':'Tài Bạch',
  '13':'Tử Tức','14':'Phu Thê','15':'Huynh Đệ','16':'Đại Vận',
  '17':'Tiểu Hạn','18':'Lưu Niên','19':'Cách Cục','20':'Sự Nghiệp',
  '21':'Tình Cảm','22':'Sức Khoẻ','23':'Tài Lộc','24':'Vận Mệnh'
};

function renderLasos(lasos) {
  document.getElementById('lasosLoading').style.display = 'none';
  document.getElementById('lasosContent').style.display = 'block';

  const count = lasos.length;
  if (count > 0) {
    const badge = document.getElementById('countLasos');
    badge.textContent = count; badge.style.display = '';
  }

  const el = document.getElementById('lasosContent');
  if (count === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="icon">${ic('sparkles',44)}</div>
      <p>Bạn chưa có lá số nào được lưu.<br>Hãy lập lá số và đăng nhập để lưu lịch sử.</p>
      <a href="/" class="btn-primary">Lập Lá Số Ngay</a>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="card-grid">${lasos.map(l => lasoCard(l)).join('')}</div>`;
}

function lasoCard(l) {
  const date = new Date(l.created_at).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const name = l.person_name || l.slug;
  const letter = name[0].toUpperCase();
  const gioi = l.gioi_tinh === 'nam' ? '♂ Nam' : '♀ Nữ';
  const ngaySinh = `${l.ngay_sinh}/${l.thang_sinh}/${l.nam_sinh}`;
  // Cung Mệnh + cục hiện ngay subtitle trên card-top
  const menhCuc = [l.cung_menh ? `Mệnh ${l.cung_menh}` : '', l.cuc || ''].filter(Boolean).join(' · ');
  const chinh = l.chinh_tinh ? `<span class="badge blue" style="margin-top:.5rem">${l.chinh_tinh}</span>` : '';
  return `<div class="laso-card" onclick="openLuanModal('${l.slug}','${escHtml(name)}')">
    <div class="card-top">
      <div class="card-avatar">${letter}</div>
      <div>
        <div class="card-title">${escHtml(name)}</div>
        <div class="card-subtitle">${ngaySinh} · Giờ ${l.gio_chi} · ${gioi}</div>
        ${menhCuc ? `<div class="card-subtitle" style="color:#c9a84c;margin-top:.2rem;font-weight:600">${menhCuc}</div>` : ''}
      </div>
    </div>
    <div class="card-body">
      <div class="card-badges" style="margin-bottom:.6rem">
        ${chinh}
      </div>
      <div class="card-date">${ic('calendar',13)} ${date}</div>
      <div class="card-actions">
        <button class="btn-outline navy" onclick="event.stopPropagation();openLuanModal('${l.slug}','${escHtml(name)}')">${ic('book-open',14)} Xem Lại</button>
        <button class="btn-outline gold" onclick="event.stopPropagation();openChatModal('${l.slug}','${escHtml(name)}','laso')">${ic('message-circle',14)} Chat</button>
      </div>
    </div>
  </div>`;
}

// ── RENDER XEM TUOI ──
function renderXemTuoi(list) {
  document.getElementById('xemTuoiLoading').style.display = 'none';
  document.getElementById('xemTuoiContent').style.display = 'block';

  if (list.length > 0) {
    const badge = document.getElementById('countXemTuoi');
    badge.textContent = list.length; badge.style.display = '';
  }

  const el = document.getElementById('xemTuoiContent');
  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="icon">${ic('heart-handshake',44)}</div>
      <p>Chưa có kết quả xem tuổi nào được lưu.</p>
      <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
        <a href="/xem-tuoi.html" class="btn-primary">Xem Tuổi Vợ Chồng</a>
        <a href="/xem-lam-an.html" class="btn-primary btn-gold">Xem Tuổi Làm Ăn</a>
      </div>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="xem-list">${list.map(x => xemItem(x)).join('')}</div>`;
}

function xemItem(x) {
  const date = new Date(x.created_at).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const score = x.total_score || 0;
  const cls = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
  const typeLabel = x.product_type === 'xem-lam-an' ? 'Xem tuổi làm ăn' : 'Xem tuổi vợ chồng';
  const icon = x.product_type === 'xem-lam-an' ? ic('briefcase',14) : ic('heart-handshake',14);
  return `<div class="xem-item">
    <div class="xem-score ${cls}">${score}</div>
    <div class="xem-info">
      <div class="xem-type">${icon} ${typeLabel}</div>
      <div class="xem-names">${escHtml(x.person_a || '')} × ${escHtml(x.person_b || '')}</div>
      <div class="xem-date">${ic('calendar',13)} ${date}</div>
    </div>
    <button class="btn-outline navy btn-sm" onclick="openXemTuoiModal('${x.id}','${escHtml(x.person_a||'')}','${escHtml(x.person_b||'')}')">Xem Lại</button>
  </div>`;
}

// ── RENDER CHAT LIST ──
function renderChatList(list) {
  document.getElementById('chatListLoading').style.display = 'none';
  document.getElementById('chatListContent').style.display = 'block';

  if (list.length > 0) {
    const badge = document.getElementById('countChat');
    badge.textContent = list.length; badge.style.display = '';
  }

  const el = document.getElementById('chatListContent');
  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="icon">${ic('message-circle',44)}</div>
      <p>Chưa có lịch sử trò chuyện nào.</p>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="chat-list">${list.map(c => chatListItem(c)).join('')}</div>`;
}

function chatListItem(c) {
  const date = new Date(c.updated_at).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const icon = c.product === 'xem-tuoi' ? ic('heart-handshake',18) : c.product === 'xem-lam-an' ? ic('briefcase',18) : ic('sparkles',18);
  return `<div class="chat-item" onclick="openChatModal('${c.laso_slug}','${c.laso_slug}','${c.product}')">
    <div class="chat-icon">${icon}</div>
    <div class="chat-info">
      <div class="chat-slug">${c.laso_slug}</div>
      <div class="chat-meta">${ic('message-circle',13)} Cập nhật ${date}</div>
    </div>
    <span style="color:var(--gold);font-size:.8rem">Tiếp tục →</span>
  </div>`;
}

// ── CREDIT FUNCTIONS ──
async function loadHeaderBalance() {
  if (!_pUser) return;
  try {
    const res = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(_pUser.id));
    const d = await res.json();
    const bal = d.balance ?? 0;
    const h = document.getElementById('headerCreditBalance');
    if (h) h.innerHTML = bal + ' <small>lượng</small>';
    const t = document.getElementById('tabCreditBalance');
    if (t) t.textContent = bal + ' lượng';
  } catch(e) {
    const h = document.getElementById('headerCreditBalance');
    if (h) h.innerHTML = '<small>—</small>';
  }
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
}
async function loadMcpKey() {
  if (!(await _tok())) return;
  _mcpShow('checking');
  try {
    const res = await fetch('/api/mcp/key', { headers: { Authorization: `Bearer ${await _tok()}` } });
    const d = res.ok ? await res.json() : {};
    if (d && d.url) { document.getElementById('mcpUrl').value = d.url; _mcpShow('ready'); }
    else _mcpShow('nokey');
  } catch { _mcpShow('nokey'); }
}
async function genMcpKey() {
  const btn = document.getElementById('btnMcpGen');
  btn.disabled = true; btn.textContent = 'Đang tạo…';
  try {
    const res = await fetch('/api/mcp/key', { method: 'POST', headers: { Authorization: `Bearer ${await _tok()}` } });
    const d = await res.json();
    if (d && d.url) { document.getElementById('mcpUrl').value = d.url; _mcpShow('ready'); }
    else alert('Không tạo được key, thử lại sau nhé.');
  } catch { alert('Lỗi mạng, thử lại sau nhé.'); }
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
  if (!confirm('Thu hồi key hiện tại? Kết nối AI đang dùng key cũ sẽ ngừng — bạn sẽ có key mới ngay sau đó.')) return;
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
    if (d.linked) {
      statusEl.textContent = '✓ Đã liên kết — bot Telegram dùng chung ví Lượng này.';
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
    if (d.url) {
      // Mở bot Telegram với token /start → bot tự gắn ví.
      window.open(d.url, '_blank');
      document.getElementById('tgLinkStatus').textContent =
        '⏳ Đã mở Telegram — bấm "Bắt đầu / Start" trong bot để hoàn tất, rồi tải lại trang.';
    } else {
      alert('Không tạo được liên kết, thử lại sau nhé.');
    }
  } catch {
    alert('Lỗi mạng, thử lại sau nhé.');
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
    if (d.linked) {
      statusEl.textContent = '✓ Đã liên kết — bot WhatsApp dùng chung ví Lượng này.';
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
    if (d.url) {
      // Mở WhatsApp với tin soạn sẵn "/link <token>" → gửi để bot gắn ví.
      window.open(d.url, '_blank');
      document.getElementById('waLinkStatus').textContent =
        '⏳ Đã mở WhatsApp — bấm GỬI tin soạn sẵn để hoàn tất, rồi tải lại trang.';
    } else {
      alert('Không tạo được liên kết, thử lại sau nhé.');
    }
  } catch {
    alert('Lỗi mạng, thử lại sau nhé.');
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
    if (d.linked) {
      statusEl.textContent = '✓ Đã liên kết — bot Messenger dùng chung ví Lượng này.';
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
    if (d.url) {
      // Mở Messenger với m.me/<page>?ref=<token> → bot tự gắn ví.
      window.open(d.url, '_blank');
      const fallback = d.token ? ` Nếu chưa tự liên kết, gửi tin: /link ${d.token}` : '';
      document.getElementById('msgrLinkStatus').textContent =
        '⏳ Đã mở Messenger — bấm "Bắt đầu / Get Started" hoặc gửi 1 tin để hoàn tất, rồi tải lại trang.' + fallback;
    } else {
      alert('Không tạo được liên kết, thử lại sau nhé.');
    }
  } catch {
    alert('Lỗi mạng, thử lại sau nhé.');
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

// ── TAB KẾT NỐI (AI qua MCP + các kênh chat) ──
let _ketnoiLoaded = false;
function loadKetnoi() {
  loadMcpKey();
  loadTelegramLink();
  loadWhatsappLink();
  loadMessengerLink();
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
}

// ── TAB NHIỆM VỤ — Khởi Hành + Kênh liên lạc ────────────────────────────────
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
  // Trỏ VÀO CHÍNH trang đang đứng (`/app/tai-khoan#<tab>`) thì chuyển tab TẠI
  // CHỖ thay vì tải lại cả trang.
  const m = /^\/app\/tai-khoan#(.+)$/.exec(href);
  if (m) {
    const b = document.querySelector('.tab-btn[data-tab="' + CSS.escape(m[1]) + '"]');
    if (b) { b.click(); return; }
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
      '&order=created_at.desc&limit=30&select=*',
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
    document.getElementById('transactionList').innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Không thể tải lịch sử.</div>';
  }
}

function renderTransactions(list) {
  const el = document.getElementById('transactionList');
  if (!list || list.length === 0) {
    el.innerHTML = '<div style="color:var(--text-lt);font-size:.85rem">Chưa có giao dịch nào.</div>';
    return;
  }
  const LABELS = { topup:'Nạp Lượng', use_laso:'Luận Giải Lá Số', use_xem_tuoi:'Xem Tuổi Vợ Chồng', use_xem_lam_an:'Xem Tuổi Làm Ăn' };
  el.innerHTML = '<div class="purchase-list">' + list.map(t => {
    const date = new Date(t.created_at).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
    const isAdd = t.amount > 0;
    const amtColor = isAdd ? 'var(--green)' : 'var(--red)';
    const amtStr = (isAdd ? '+' : '') + t.amount + ' cr';
    const label = LABELS[t.type] || t.description || t.type;
    return '<div class="purchase-item"><div class="purchase-slug">' + escHtml(label) + '</div>' +
           '<div class="purchase-amount" style="color:' + amtColor + '">' + amtStr + '</div>' +
           '<div class="purchase-date">' + date + '</div></div>';
  }).join('') + '</div>';
}

// ── RENDER XEM TƯỚNG ──
const TUONG_TOOL_LABELS = {
  'dien-tuong':     { label: 'Diện Tướng', cls: 'dien', icon: 'smile' },
  'nhan-tuong':     { label: 'Nhãn Tướng', cls: 'nhan', icon: 'eye' },
  'thu-tuong':      { label: 'Thủ Tướng',  cls: 'thu',  icon: 'hand' },
  'thanh-tuong':    { label: 'Thanh Tướng', cls: 'thanh', icon: 'mic' },
  'thanh-tuong-pro':{ label: 'Thanh Tướng Pro', cls: 'thanh', icon: 'mic' },
};

function renderTuong(list) {
  document.getElementById('tuongLoading').style.display = 'none';
  document.getElementById('tuongContent').style.display = 'block';

  if (list.length > 0) {
    const badge = document.getElementById('countTuong');
    badge.textContent = list.length; badge.style.display = '';
  }

  const el = document.getElementById('tuongContent');
  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <div class="icon">${ic('eye',44)}</div>
      <p>Chưa có kết quả xem tướng nào được lưu.<br>Đăng nhập trước khi xem tướng để lưu lịch sử.</p>
      <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
        <a href="/tuong-mat-ai.html" class="btn-primary">Diện Tướng</a>
        <a href="/nhan-tuong-ai.html" class="btn-primary btn-gold">Nhãn Tướng</a>
        <a href="/thu-tuong-ai.html" class="btn-primary" style="background:var(--blue)">Thủ Tướng</a>
        <a href="/thanh-tuong-ai.html" class="btn-primary" style="background:var(--green)">Thanh Tướng</a>
      </div>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="tuong-grid">${list.map(t => tuongCard(t)).join('')}</div>`;
}

function tuongCard(t) {
  const meta = TUONG_TOOL_LABELS[t.tool] || { label: t.tool, cls: 'dien', icon: 'sparkles' };
  const date = new Date(t.created_at).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
  // Strip markdown for preview
  const preview = (t.result_text || '').replace(/#{1,3} .+/g,'').replace(/\*\*/g,'').replace(/\n+/g,' ').trim().slice(0, 120) + '...';
  const thumbHtml = t.thumbnail
    ? `<img class="tuong-thumb" src="${escHtml(t.thumbnail)}" alt="${meta.label}" loading="lazy"/>`
    : `<div class="tuong-thumb-placeholder">${ic(meta.icon,32)}</div>`;
  return `<div class="tuong-card" onclick="openTuongModal('${escHtml(t.id)}','${meta.label}','${escHtml(t.thumbnail||'')}','${escHtml((t.result_text||'').replace(/'/g,'&#39;'))}')">
    ${thumbHtml}
    <div class="tuong-card-body">
      <span class="tuong-tool-badge ${meta.cls}">${ic(meta.icon,14)} ${meta.label}</span>
      <div class="tuong-preview">${escHtml(preview)}</div>
      <div class="tuong-date">${ic('calendar',13)} ${date}</div>
    </div>
  </div>`;
}

function openTuongModal(id, label, thumbnail, resultText) {
  document.getElementById('tuongModalTitle').textContent = label;
  const thumb = document.getElementById('tuongModalThumb');
  if (thumbnail) {
    thumb.src = thumbnail; thumb.style.display = 'block';
  } else {
    thumb.style.display = 'none';
  }
  // Render markdown-ish result text
  const html = resultText
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'")
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .split(/\n\n+/).map(p => p.startsWith('<h') ? p : `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  document.getElementById('tuongModalContent').innerHTML = html;
  openModal('tuongModal');
}

// ── RENDER PURCHASES (no-op in credit system) ──
function renderPurchases(list) {}

// ── OPEN LUAN GIAI MODAL ──
async function openLuanModal(slug, name) {
  document.getElementById('luanModalTitle').textContent = `Luận Giải — ${name}`;
  document.getElementById('luanTabBtns').innerHTML = '';
  document.getElementById('luanContentArea').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-lt)">Đang tải...</div>';
  openModal('luanModal');

  const resp = await fetch(`/api/history?action=laso&slug=${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${await _tok()}` }
  });
  const data = await resp.json();
  if (!data || !data.luan_giai) {
    document.getElementById('luanContentArea').innerHTML = '<div style="color:var(--red);padding:1rem">Không tìm thấy luận giải.</div>';
    return;
  }

  const keys = Object.keys(data.luan_giai).sort((a,b) => parseInt(a)-parseInt(b));
  
  // Build tab buttons
  const tabsHtml = keys.map(k => `<button class="luan-tab ${k==='1'?'active':''}" onclick="switchLuanTab('${k}',this)">${PHAN_LABELS[k]||('P'+k)}</button>`).join('');
  document.getElementById('luanTabBtns').innerHTML = tabsHtml;

  // Store data and show first
  window._luanData = data.luan_giai;
  showLuanSection('1');
}

function showLuanSection(key) {
  const text = window._luanData?.[key] || '';
  document.getElementById('luanContentArea').innerHTML = `<div class="luan-content">${marked.parse(text)}</div>`;
}

function switchLuanTab(key, btn) {
  document.querySelectorAll('.luan-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showLuanSection(key);
}

// ── OPEN XEM TUOI MODAL (reuse luan modal) ──
async function openXemTuoiModal(id, personA, personB) {
  document.getElementById('luanModalTitle').textContent = `${personA} × ${personB}`;
  document.getElementById('luanTabBtns').innerHTML = '';
  document.getElementById('luanContentArea').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-lt)">Đang tải...</div>';
  openModal('luanModal');

  const resp = await fetch(`/api/history?action=xem_tuoi&id=${id}`, {
    headers: { Authorization: `Bearer ${await _tok()}` }
  });
  const data = await resp.json();
  if (!data || !data.result_json) {
    document.getElementById('luanContentArea').innerHTML = '<div style="color:var(--red);padding:1rem">Không tìm thấy kết quả.</div>';
    return;
  }

  const rj = data.result_json;
  const sectionKeys = Object.keys(rj).filter(k => k !== 'total' && k !== 'summary');
  const SECTION_LABELS = ['Xét Tuổi','Ngũ Hành','Tư Tưởng','Tính Cách','Quan Hệ','Con Cái / Đối Tác','Tài Chính','Vận Hạn'];

  if (sectionKeys.length > 0) {
    const tabsHtml = sectionKeys.map((k,i) => `<button class="luan-tab ${i===0?'active':''}" onclick="switchXemTab('${k}',this)">${SECTION_LABELS[i]||k}</button>`).join('');
    document.getElementById('luanTabBtns').innerHTML = tabsHtml;
    window._xemData = rj;
    showXemSection(sectionKeys[0]);
  } else {
    document.getElementById('luanContentArea').innerHTML = `<div class="luan-content">${marked.parse(JSON.stringify(rj,null,2))}</div>`;
  }
}

function showXemSection(key) {
  const text = window._xemData?.[key] || '';
  document.getElementById('luanContentArea').innerHTML = `<div class="luan-content">${marked.parse(typeof text === 'string' ? text : JSON.stringify(text,null,2))}</div>`;
}
function switchXemTab(key, btn) {
  document.querySelectorAll('.luan-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showXemSection(key);
}

// ── CHAT MODAL ──
async function openChatModal(slug, name, product) {
  _pChatState.slug = slug;
  _pChatState.product = product || 'laso';
  _pChatState.messages = [];

  document.getElementById('chatModalTitle').textContent = `Vấn Đáp — ${name}`;
  document.getElementById('chatModalSub').textContent = slug;
  document.getElementById('chatMessages').innerHTML = '';
  openModal('chatModal');

  // Load existing chat history
  const resp = await fetch(`/api/history?action=chat&slug=${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${await _tok()}` }
  });
  const data = await resp.json();
  _pChatState.messages = data.messages || [];

  if (_pChatState.messages.length > 0) {
    _pChatState.messages.forEach(m => appendMessage(m.role, m.content));
  } else {
    appendMessage('assistant', 'Kính chào quý vị. Tôi đã xem qua lá số của bạn. Bạn muốn hỏi điều gì?');
  }
}

function appendMessage(role, content) {
  const el = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  if (role === 'assistant') div.innerHTML = `<div class="msg-sender">${ic("moon",13)} Thầy Tử Vi</div>${marked.parse(content)}`;
  else div.textContent = content;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendMessage('user', text);
  _pChatState.messages.push({ role: 'user', content: text });

  const btn = document.getElementById('chatSendBtn');
  btn.disabled = true;

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'msg assistant';
  typing.id = 'typingIndicator';
  typing.innerHTML = `<div class="msg-sender">${ic("moon",13)} Thầy Tử Vi</div><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  document.getElementById('chatMessages').appendChild(typing);
  document.getElementById('chatMessages').scrollTop = 99999;

  try {
    // Build messages array for API (last 10 messages for context)
    const history = _pChatState.messages.slice(-10);

    const resp = await fetch('/api/lasotuvi?action=chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        slug: _pChatState.slug,
        product: _pChatState.product
      })
    });
    const data = await resp.json();
    // `answer` PHẢI đứng đầu — đó là tên field THẬT mà `/api/lasotuvi?action=chat`
    // trả về (`handleChat` kết bằng `ok({ answer: finalText || ... })`, và `ok()`
    // trong lib/cors.ts trả phẳng chứ không bọc thêm tầng nào).
    //
    // 🐞 Thiếu nó thì cả ba nhánh dưới đều undefined → panel chat trong
    // profile.html LUÔN hiện "Xin lỗi, có lỗi xảy ra." dù model đã trả lời xong,
    // và người dùng không có cách nào biết là câu trả lời có thật. Ba nhánh
    // `content`/`text`/`reply` giữ lại cho các shape cũ, nhưng không nhánh nào
    // trong số đó khớp endpoint hiện tại.
    const reply = data.answer || data.content || data.text || data.reply || 'Xin lỗi, có lỗi xảy ra.';

    typing.remove();
    _pChatState.messages.push({ role: 'assistant', content: reply });
    appendMessage('assistant', reply);

    // Save to DB
    await fetch('/api/history?action=save_chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await _tok()}` },
      body: JSON.stringify({
        slug: _pChatState.slug,
        product: _pChatState.product,
        messages: _pChatState.messages.slice(-30)  // keep last 30 messages
      })
    });
  } catch(e) {
    typing.remove();
    appendMessage('assistant', 'Xin lỗi, có lỗi kết nối. Vui lòng thử lại.');
  }
  btn.disabled = false;
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
      document.getElementById('userDisplayName').textContent = name || 'Người Dùng';
      document.getElementById('avatarLetter').textContent = (name || 'N')[0].toUpperCase();
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
      document.getElementById('newPwd').value = '';
      document.getElementById('confirmPwd').value = '';
    } else throw new Error();
  } catch {
    alert.innerHTML = '<div class="alert error">✗ Đổi mật khẩu thất bại.</div>';
  }
  setTimeout(() => { alert.innerHTML = ''; }, 3000);
}

// ── MODAL HELPERS ──
function openModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', function(e) { if (e.target === this) closeModal(this.id); }));

// ── UTILS ──
function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ── THẦY NHỚ (hồ sơ tầng 2) ──
// Nội dung ở đây do MODEL sinh ra, nên mọi lượt vẽ đều phải thoát HTML. Nút
// bấm gắn theo CHỈ SỐ (số do chính mình sinh ra) chứ KHÔNG nội suy nội dung
// vào thuộc tính onclick — dấu nháy trong chuỗi là vỡ thẻ, bài học đã ghi.
let _memItems = [];
let _memKinds = {};
let _memMax = 40;

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

// ── Handle #credits anchor ──
if (window.location.hash === '#credits') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { const b = document.querySelector('[data-tab="credits"]'); if (b) b.click(); }, 1500);
  });
}
// ── BOOT ──
initProfile();
