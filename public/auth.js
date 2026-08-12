// ================================================================
// AUTH.JS — Shared Supabase Auth module
// Include in every page: <script src="/auth.js"></script>
// ================================================================

const SUPA_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

// ── Session storage keys ──
const SESSION_KEY = 'tuvi_session';
const USER_KEY    = 'tuvi_user';

// ── Cookie helpers — lưu refresh_token 6 tháng để sống sót ITP trên iOS Safari ──
function _setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Strict';
}
function _getCookie(name) {
  const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return v ? decodeURIComponent(v.pop()) : null;
}
function _delCookie(name) {
  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict';
}

// ── Cookie phiên bền đặt TỪ SERVER (HttpOnly) — né giới hạn ITP 7-ngày của iOS
//    Safari cho storage do script ghi. Cookie JS `tuvi_rt` ở trên vẫn giữ (dự phòng
//    cho trình duyệt không ITP); cookie server `tvmb_rt` là lớp bền chính. ──
function _serverStoreRt(token) {
  if (!token) return;
  try {
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token }),
      keepalive: true,
    }).catch(function () {});
  } catch (e) { /* ignore */ }
}
// Refresh phiên qua cookie HttpOnly (server đọc cookie, gọi Supabase, xoay token,
// đặt lại cookie, trả session). Dùng khi localStorage + cookie JS đều mất (ITP xoá).
async function _refreshViaServer() {
  _restoring = true;
  try {
    const res = await fetch('/api/auth/session', { method: 'GET' });
    if (!res.ok) { updateNavUI(); return false; }
    const data = await res.json();
    if (data && data.access_token) { _applySession(data); return true; }
  } catch (e) { /* ignore */ }
  finally { _restoring = false; }   // ⚠️ hàm có 3 đường ra — kẹt cờ là kẹt luôn đồng hồ ví
  updateNavUI();
  return false;
}

// ── Auth state ──
let _session = null;
let _user    = null;
// Đang khôi phục phiên (refresh token chạy BẤT ĐỒNG BỘ). Trong quãng này
// `getSession()` trả null nhưng người dùng VẪN đang đăng nhập — nơi nào đọc
// token để quyết định hiển thị gì thì phải chờ, không được kết luận là khách.
let _restoring = false;
// Lượt refresh ĐANG BAY. Bắt buộc gộp về một promise: Supabase XOAY refresh
// token mỗi lần đổi, nên hai lượt refresh chạy song song thì lượt sau cầm token
// đã bị thu hồi → `invalid_grant` → mất phiên của người đang đăng nhập. Mà ~30
// chỗ trong site cùng đọc token nên chạy song song là chuyện thường.
let _refreshInFlight = null;
// Hẹn giờ tự xoay token. Giữ id để không bao giờ chồng hai lịch lên nhau.
let _refreshTimer = null;

// Access token Supabase sống ~1 giờ. Coi là "sắp hết" khi còn dưới 60 giây —
// đủ để một request đang bay không chết giữa đường.
const TOKEN_MARGIN_SEC = 60;

function _tokenFresh(s, marginSec) {
  return !!(s && s.access_token && s.expires_at &&
    s.expires_at - Date.now() / 1000 > (marginSec == null ? TOKEN_MARGIN_SEC : marginSec));
}

// ── Hẹn giờ xoay token TRƯỚC khi hết hạn ──────────────────────────────
// 🔑 Phải gọi từ MỌI đường tạo phiên (đăng nhập, đăng ký, OAuth, khôi phục lúc
// tải trang), không chỉ từ `_applySession`. Trước đây chỉ `_applySession` hẹn
// giờ — mà hàm đó chỉ chạy SAU một lượt refresh, nên phiên vừa đăng nhập và
// phiên khôi phục từ localStorage KHÔNG BAO GIỜ được hẹn: mở tab quá một tiếng
// là token chết lặng, mọi API trả 401 trong khi nav vẫn hiện "đang đăng nhập".
function _scheduleRefresh(data) {
  if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
  if (!data || !data.refresh_token || !data.expires_at) return;
  // Hẹn sớm 5 phút; token đã sát hạn thì xoay ngay ở nhịp sau.
  const msLeft = Math.max(0, (data.expires_at - Date.now() / 1000 - 300) * 1000);
  // ⚠️ setTimeout KHÔNG đáng tin một mình: tab chạy nền bị bóp nhịp, máy ngủ thì
  // treo hẳn. Đây là lớp CHỦ ĐỘNG; lớp chắc chắn là `getFreshToken()` kiểm ngay
  // trước lúc dùng, cộng lượt kiểm khi tab sáng lại ở cuối file.
  _refreshTimer = setTimeout(() => { _refreshTimer = null; _ensureFreshToken(); }, msLeft);
}

// ── Bảo đảm có access token còn hạn, gộp mọi lượt gọi song song ───────
// Trả về token dùng được, hoặc null nếu thật sự không còn phiên.
async function _ensureFreshToken(force) {
  // ⚠️ `force` KHÔNG được xoá `_session`: refresh_token nằm trong đó, xoá là tự
  // cắt đường xoay và tụt xuống nhánh cookie.
  if (!force && _tokenFresh(_session)) return _session.access_token;
  if (!_refreshInFlight) {
    const rt = (_session && _session.refresh_token) || _getCookie('tuvi_rt');
    _refreshInFlight = (rt ? _refreshSession(rt) : _refreshViaServer())
      .catch(() => {})
      .then(() => { _refreshInFlight = null; });
  }
  await _refreshInFlight;
  return _tokenFresh(_session, 0) ? _session.access_token : null;
}

// ── Init: restore session từ localStorage, fallback sang cookie (iOS ITP safe) ──
(function initAuth() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.access_token && s.expires_at > Date.now() / 1000) {
        // Session còn hạn
        _session = s;
        _user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        // 🔑 Và PHẢI hẹn giờ xoay: phiên khôi phục từ localStorage trước đây
        // không được hẹn, nên tab mở lâu là token hết hạn lặng lẽ.
        _scheduleRefresh(s);
      } else {
        // Hết hạn — ưu tiên refresh_token từ localStorage, fallback cookie JS,
        // cuối cùng cookie server bền (HttpOnly, sống sót ITP khi mọi thứ JS bị xoá).
        const rt = (s && s.refresh_token) || _getCookie('tuvi_rt');
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
        if (rt) { _refreshSession(rt); return; }
        _refreshViaServer(); return;
      }
    } else {
      // localStorage trống (bị iOS clear) — thử cookie JS rồi cookie server bền
      const rt = _getCookie('tuvi_rt');
      if (rt) { _refreshSession(rt); return; }
      _refreshViaServer(); return;
    }
  } catch(e) {
    const rt = _getCookie('tuvi_rt');
    if (rt) { _refreshSession(rt); return; }
    _refreshViaServer(); return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavUI);
  } else {
    updateNavUI();
  }
})();

// ── Áp session mới vào state + mọi lớp lưu trữ (localStorage + cookie JS + cookie
//    server bền) + lịch tự refresh. Dùng chung cho refresh client & refresh server. ──
function _applySession(data) {
  _session = data;
  _user = data.user || null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  if (_user) localStorage.setItem(USER_KEY, JSON.stringify(_user));
  if (data.refresh_token) {
    _setCookie('tuvi_rt', data.refresh_token, 180); // dự phòng (bị ITP cap 7 ngày)
    _serverStoreRt(data.refresh_token);             // lớp bền HttpOnly (né ITP)
  }
  updateNavUI();
  _scheduleRefresh(data);
}

// ── Refresh session silently ──
  async function _refreshSession(refreshToken) {
    _restoring = true;
    try {
      const res = await fetch(SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        // refresh_token client hỏng/cũ → thử cookie server bền (HttpOnly) trước khi bỏ.
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
        await _refreshViaServer();
        return;
      }
      const data = await res.json();
      if (data.access_token) _applySession(data);
    } catch(e) { console.warn('[auth] refresh failed:', e); }
    finally { _restoring = false; }
  }

// ── Load credit balance for nav ──
async function _loadNavCredits() {
  if (!_user) return;
  try {
    const res = await fetch(SUPA_URL + '/rest/v1/user_credits?user_id=eq.' + encodeURIComponent(_user.id) + '&select=balance&limit=1', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + (_session?.access_token || SUPA_KEY) }
    });
    if (!res.ok) return;
    const rows = await res.json();
    const bal = rows[0]?.balance ?? 0;
    const badge = document.getElementById('nav-credit-badge');
    const menuVal = document.getElementById('nav-credit-menu-val');
    if (badge) badge.innerHTML = '<svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-right:3px"><ellipse cx="7" cy="8.5" rx="6.2" ry="2" fill="#c9a84c" opacity=".35"/><path d="M1.2 7C1.2 7 0.8 5.5 2 4.2C3 3.2 4.5 2.8 7 2.8C9.5 2.8 11 3.2 12 4.2C13.2 5.5 12.8 7 12.8 7C12.1 8.2 9.8 9 7 9C4.2 9 1.9 8.2 1.2 7Z" fill="#c9a84c"/><path d="M2.5 4.5C3.3 3.5 5 3 7 3C9 3 10.7 3.5 11.5 4.5" stroke="#f0d080" stroke-width=".7" stroke-linecap="round"/><ellipse cx="7" cy="3" rx="3.5" ry="1.2" fill="#d4a853"/><path d="M5.5 3C5.5 3 6 1.5 7 1.2C8 1.5 8.5 3 8.5 3" stroke="#f0d080" stroke-width=".6" fill="none"/></svg>' + bal.toLocaleString();
    if (menuVal) menuVal.textContent = bal.toLocaleString() + ' lượng';
  } catch(e) {}
}

// ── Public API ──
window.Auth = {
  isLoggedIn:  () => !!_session,
  // true = chưa biết, đừng vội coi là khách vãng lai (xem chú thích _restoring).
  isRestoring: () => _restoring,
  getUser:     () => _user,
  getSession:  () => _session,

  // ── Cách ĐÚNG để lấy Bearer token trước một lượt gọi API ────────────
  // `getSession().access_token` là ẢNH CHỤP: nó trả token kể cả khi token ĐÃ
  // HẾT HẠN, và server sẽ 401 trong khi người dùng vẫn đang đăng nhập. Hàm này
  // kiểm hạn trước, tự xoay nếu cần, gộp mọi lượt gọi song song vào một lượt
  // refresh. Trả null khi thật sự hết phiên.
  getFreshToken: () => _ensureFreshToken(),

  // Ép xoay token ngay (dùng khi server vừa trả 401 dù mình tưởng còn phiên —
  // vd đồng hồ máy lệch nên token trông còn hạn mà server đã coi là hết).
  // Trả token mới, hoặc null nếu phiên hết thật.
  refresh: () => _ensureFreshToken(true),

  // Require login — show modal if not logged in, then run callback
  require: function(callback) {
    if (_session) { callback(); return; }
    showAuthModal(callback);
  },

  signOut: async function() {
    if (_session) {
      await fetch(`${SUPA_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${_session.access_token}` }
      }).catch(() => {});
    }
    _session = null; _user = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    _delCookie('tuvi_rt');
    try { await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {}); } catch (e) {}
    updateNavUI();
    window.location.reload();
  },
};

// ── Sign In with Email/Password ──
async function signInEmail(email, password) {
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Đăng nhập thất bại');
  saveSession(data);
  return data;
}

// ── Sign Up with Email/Password ──
async function signUpEmail(email, password) {
  const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Đăng ký thất bại');
  // Auto sign in after signup
  if (data.access_token) {
    saveSession(data);
  }
  return data;
}

// Lưu trang hiện tại để auth-callback quay về (nếu chưa có returnTo cụ thể do
// rail đặt kèm ?auto=1). Tránh về homepage sau khi đăng nhập OAuth.
function _rememberAuthReturn() {
  try { if (!localStorage.getItem('auth_return_to')) localStorage.setItem('auth_return_to', window.location.pathname + window.location.search); } catch (e) {}
}

// ── Sign In with Google OAuth ──
async function signInGoogle() {
  _rememberAuthReturn();
  const redirectTo = encodeURIComponent(window.location.origin + '/auth-callback.html');
  window.location.href = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
}

async function signInFacebook() {
  _rememberAuthReturn();
  const redirectTo = encodeURIComponent(window.location.origin + '/auth-callback.html');
  window.location.href = `${SUPA_URL}/auth/v1/authorize?provider=facebook&redirect_to=${redirectTo}`;
}

// ── Save session ──
function saveSession(data) {
  _session = data;
  _user = data.user || null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  localStorage.setItem(USER_KEY, JSON.stringify(_user));
  if (data.refresh_token) {
    _setCookie('tuvi_rt', data.refresh_token, 180); // dự phòng (ITP cap 7 ngày)
    _serverStoreRt(data.refresh_token);             // lớp bền HttpOnly (né ITP)
  }
  updateNavUI();
  // 🔑 Đăng nhập/đăng ký cũng phải hẹn giờ xoay token — thiếu dòng này thì phiên
  // vừa tạo chết sau ~1 giờ mà không có gì gia hạn (lỗi rail đòi đăng nhập lại).
  _scheduleRefresh(data);
  if (data.access_token) sendSignupSignal(data.access_token);
  // Marketing: gắn user_id + snapshot attribution (first-touch) lên tài khoản.
  // track.js đọc token vừa lưu trong localStorage; server phân biệt signup mới.
  try { if (window.Track && window.Track.event) window.Track.event('login'); } catch (e) { /* ignore */ }
}

// ── Beacon chống lạm dụng thưởng Lượng ──
// Gọi sau mỗi lần đăng nhập/đăng ký. Gửi device_id (ổn định theo trình duyệt) để
// server áp cap thưởng theo thiết bị. Fire trên MỌI lần đăng nhập; server idempotent
// theo user (chỉ xử user mới) → mỗi tài khoản mới trên cùng thiết bị đều được đếm.
function _deviceId() {
  try {
    var d = localStorage.getItem('tvc_device_id');
    if (!d) {
      d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('d' + Date.now() + Math.random().toString(36).slice(2));
      localStorage.setItem('tvc_device_id', d);
    }
    return d;
  } catch (e) { return ''; }
}
function sendSignupSignal(token) {
  try {
    fetch('/api/signup-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ fp: _deviceId() }),
      keepalive: true,
    }).catch(function () {});
  } catch (e) { /* ignore */ }
}
window.sendSignupSignal = sendSignupSignal;

// ── Update Nav UI (show avatar or sign in button) ──
function updateNavUI() {
  const navEl = document.getElementById('nav-auth-area');
  if (!navEl) return;
  // Always fix to top-right
  const isMobile = window.innerWidth <= 700;
  navEl.style.cssText = isMobile
    ? 'position:fixed;top:10px;right:52px;height:40px;display:flex;align-items:center;z-index:199'
    : 'position:fixed;top:0;right:56px;height:60px;display:flex;align-items:center;z-index:300';
  if (_session && _user) {
    const email = _user.email || '';
    const name  = _user.user_metadata?.full_name || _user.user_metadata?.name || '';
    const avatar= _user.user_metadata?.avatar_url || _user.user_metadata?.picture || '';
    const initial = (name || email).charAt(0).toUpperCase();
    navEl.innerHTML = `
      <div style="position:relative;display:inline-block" id="nav-profile-wrap">
        <div style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:6px 8px;border-radius:8px;transition:background .15s"
             onmouseover="this.style.background='rgba(255,255,255,.08)'" onmouseout="this.style.background=''"
             onclick="document.getElementById('nav-profile-menu').style.display=document.getElementById('nav-profile-menu').style.display==='block'?'none':'block'">
          <div id="nav-credit-badge" style="background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.4);border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:.02em;white-space:nowrap;font-family:Georgia,serif">
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-right:3px"><ellipse cx="7" cy="8.5" rx="6.2" ry="2" fill="#c9a84c" opacity=".35"/><path d="M1.2 7C1.2 7 0.8 5.5 2 4.2C3 3.2 4.5 2.8 7 2.8C9.5 2.8 11 3.2 12 4.2C13.2 5.5 12.8 7 12.8 7C12.1 8.2 9.8 9 7 9C4.2 9 1.9 8.2 1.2 7Z" fill="#c9a84c"/><path d="M2.5 4.5C3.3 3.5 5 3 7 3C9 3 10.7 3.5 11.5 4.5" stroke="#f0d080" stroke-width=".7" stroke-linecap="round"/><ellipse cx="7" cy="3" rx="3.5" ry="1.2" fill="#d4a853"/><path d="M5.5 3C5.5 3 6 1.5 7 1.2C8 1.5 8.5 3 8.5 3" stroke="#f0d080" stroke-width=".6" fill="none"/></svg> …
          </div>
          ${avatar
            ? `<img src="${avatar}" referrerpolicy="no-referrer" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid #c9a84c">`
            : `<div style="width:28px;height:28px;background:#c9a84c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#061A2E">${initial}</div>`
          }
          <span style="font-size:11px;color:rgba(255,255,255,.5)">▾</span>
        </div>
        <div id="nav-profile-menu" style="display:none;position:absolute;right:0;top:44px;background:#fff;border:1px solid #ddd;border-radius:10px;padding:8px 0;min-width:200px;box-shadow:0 8px 28px rgba(0,0,0,.14);z-index:1000">
          <div style="padding:11px 16px;border-bottom:1px solid #f0f0f0">
            <div style="font-size:12px;font-weight:700;color:#333">${name || 'Tài khoản'}</div>
            <div style="font-size:11px;color:#999;margin-top:2px">${email}</div>
          </div>
          <div style="padding:10px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Lượng · Xu</div>
              <div id="nav-credit-menu-val" style="font-size:16px;font-weight:700;color:#061A2E;font-family:Georgia,serif">… lượng</div>
            </div>
            <a href="/topup.html" style="background:#c9a84c;color:#061A2E;font-size:11px;font-weight:700;padding:5px 10px;border-radius:5px;text-decoration:none" onmouseover="this.style.background='#f0d080'" onmouseout="this.style.background='#c9a84c'">+ Nạp</a>
          </div>
          <a href="/profile.html" style="display:block;padding:9px 16px;font-size:13px;color:#333;text-decoration:none" onmouseover="this.style.background='#f8f8f8'" onmouseout="this.style.background=''">Hồ sơ của tôi</a>
          <div style="border-top:1px solid #f0f0f0;margin-top:4px"></div>
          <button onclick="Auth.signOut()" style="display:block;width:100%;padding:9px 16px;font-size:13px;color:#C0392B;background:none;border:none;text-align:left;cursor:pointer;font-family:inherit" onmouseover="this.style.background='#fff5f5'" onmouseout="this.style.background=''">Đăng xuất</button>
        </div>
      </div>`;
    // Load credit balance async
    _loadNavCredits();
    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        const wrap = document.getElementById('nav-profile-wrap');
        if (wrap && !wrap.contains(e.target)) {
          const menu = document.getElementById('nav-profile-menu');
          if (menu) menu.style.display = 'none';
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  } else {
    navEl.innerHTML = `
      <button onclick="showAuthModal(null)" style="padding:6px 14px;background:transparent;color:#c9a84c;border:1px solid #c9a84c;border-radius:5px;font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.15s" onmouseover="this.style.background='rgba(201,168,76,0.1)'" onmouseout="this.style.background='transparent'">Đăng nhập</button>`;
  }
}

// ── Auth Modal ──
let _pendingCallback = null;

function showAuthModal(callback) {
  _pendingCallback = callback;
  if (document.getElementById('auth-modal')) {
    document.getElementById('auth-modal').style.display = 'flex';
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:36px;width:100%;max-width:400px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <button onclick="closeAuthModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;line-height:1">×</button>

      <!-- Tabs -->
      <div style="display:flex;gap:0;margin-bottom:28px;border-bottom:2px solid #eee">
        <button id="tab-signin" onclick="switchTab('signin')" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:#061A2E;border-bottom:2px solid #061A2E;margin-bottom:-2px;cursor:pointer;font-family:inherit">Đăng nhập</button>
        <button id="tab-signup" onclick="switchTab('signup')" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:500;color:#aaa;cursor:pointer;font-family:inherit">Đăng ký <span style="font-size:11px;color:#1E6B3C;font-weight:700">tặng Lượng</span></button>
      </div>

      <!-- Logo -->
      <div style="text-align:center;margin-bottom:20px">
        <img src="/seal.webp" style="width:48px;height:48px;border-radius:6px;margin-bottom:8px">
        <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#CC2200">Tử Vi Minh Bảo</div><div style="font-size:11px;color:#999;margin-top:2px;font-style:italic">Tri mệnh lý – Thuận thế hành</div>
      </div>

      <!-- Google OAuth -->
      <button onclick="signInGoogle()" style="width:100%;padding:11px;border:1.5px solid #ddd;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:8px;transition:border-color 0.15s" onmouseover="this.style.borderColor='#4285f4'" onmouseout="this.style.borderColor='#ddd'">
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
        Tiếp tục với Google
      </button>
      <button onclick="signInFacebook()" style="width:100%;padding:11px;border:1.5px solid #ddd;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:16px;transition:border-color 0.15s" onmouseover="this.style.borderColor='#1877F2'" onmouseout="this.style.borderColor='#ddd'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Tiếp tục với Facebook
      </button>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="flex:1;height:1px;background:#eee"></div>
        <span style="font-size:12px;color:#aaa">hoặc</span>
        <div style="flex:1;height:1px;background:#eee"></div>
      </div>

      <!-- Email form -->
      <div id="auth-form">
        <input id="auth-email" type="email" placeholder="Email" style="width:100%;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#061A2E'" onblur="this.style.borderColor='#ddd'">
        <input id="auth-password" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" style="width:100%;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#061A2E'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')submitAuth()">
        <div id="auth-error" style="color:#C0392B;font-size:12px;margin-bottom:8px;display:none"></div>
        <button id="auth-submit" onclick="submitAuth()" style="width:100%;padding:11px;background:#061A2E;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s" onmouseover="this.style.background='#0D3B5E'" onmouseout="this.style.background='#061A2E'">Đăng nhập</button>
      </div>

      <p style="text-align:center;font-size:11px;color:#aaa;margin-top:16px;line-height:1.6">Bằng cách đăng ký, bạn đồng ý với điều khoản sử dụng của Tử Vi Minh Bảo.</p>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeAuthModal(); });
  setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
}

function closeAuthModal() {
  const m = document.getElementById('auth-modal');
  if (m) m.style.display = 'none';
  _pendingCallback = null;
}

let _currentTab = 'signin';
function switchTab(tab) {
  _currentTab = tab;
  const si = document.getElementById('tab-signin');
  const su = document.getElementById('tab-signup');
  const btn = document.getElementById('auth-submit');
  if (tab === 'signin') {
    si.style.cssText += ';color:#061A2E;border-bottom:2px solid #061A2E;margin-bottom:-2px;font-weight:600';
    su.style.cssText += ';color:#aaa;border-bottom:none';
    btn.textContent = 'Đăng nhập';
  } else {
    su.style.cssText += ';color:#061A2E;border-bottom:2px solid #061A2E;margin-bottom:-2px;font-weight:600';
    si.style.cssText += ';color:#aaa;border-bottom:none';
    btn.textContent = 'Tạo tài khoản';
  }
  document.getElementById('auth-error').style.display = 'none';
}

async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  const btn   = document.getElementById('auth-submit');

  if (!email || !pass) { showAuthError('Vui lòng điền email và mật khẩu.'); return; }
  if (pass.length < 6)  { showAuthError('Mật khẩu ít nhất 6 ký tự.'); return; }

  btn.textContent = '...'; btn.disabled = true;
  errEl.style.display = 'none';

  try {
    if (_currentTab === 'signin') {
      await signInEmail(email, pass);
    } else {
      const d = await signUpEmail(email, pass);
      if (!d.access_token) {
        showAuthError('Đã gửi email xác nhận — vui lòng kiểm tra hộp thư.');
        btn.textContent = _currentTab === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản';
        btn.disabled = false;
        return;
      }
    }
    closeAuthModal();
    if (_currentTab === 'signup') {
      // Show free credits welcome banner
      _showFreeCreditsWelcome();
    }
    if (_pendingCallback) { _pendingCallback(); _pendingCallback = null; }
    else updateNavUI();
  } catch(e) {
    showAuthError(e.message);
  }
  btn.textContent = _currentTab === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản';
  btn.disabled = false;
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ── Free credits welcome banner ──
// Keyframe khai NGAY TẠI ĐÂY, không mượn của file khác. Bản cũ dùng
// `animation:tpw-fade` — keyframe đó nằm trong `tuvi-paywall.js` và chỉ được
// chèn LƯỜI khi có paywall dựng lên (`_css()`), mà 38/73 trang nạp auth.js
// còn không nạp paywall, và đường đăng ký thì chẳng dựng paywall bao giờ.
// ⇒ banner chào mừng người dùng MỚI chưa từng fade vào. Không có gì báo:
// animation trỏ tới keyframe không tồn tại thì phần tử vẫn hiện, chỉ đứng im.
// `scripts/check-keyframes.mjs` canh đúng chuyện này.
function _ensureAuthFadeCss() {
  if (document.getElementById('auth-fade-css')) return;
  const s = document.createElement('style');
  s.id = 'auth-fade-css';
  s.textContent = '@keyframes auth-fade{from{opacity:0}to{opacity:1}}';
  document.head.appendChild(s);
}

function _showFreeCreditsWelcome() {
  _ensureAuthFadeCss();
  const old = document.getElementById('free-credits-banner');
  if (old) old.remove();
  const b = document.createElement('div');
  b.id = 'free-credits-banner';
  b.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1E6B3C,#155d32);color:#fff;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.25);text-align:center;white-space:nowrap;animation:auth-fade .3s ease';
  // ⚠️ KHÔNG nêu tên tool kèm GIÁ ở đây. Bản cũ ghi "Xem Tướng (5 Lượng/lần)" —
  // sai hai lần: `tool_pricing` không có tool nào tên "Xem Tướng" (gần nhất là
  // `dien-tuong`), và giá thật của nó là 8 chứ không phải 5. Đây là banner ĐẦU
  // TIÊN người vừa đăng ký nhìn thấy, nên nói sai giá ở đây là mất tin ngay lượt
  // đầu. Giá chỉ được nêu ở trang tool / tool trong shell (nơi đọc `tool_pricing`).
  b.innerHTML = '<span class="ic-inline" data-icon="gift" data-icon-emoji="🎉" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">🎉</span> Chào mừng! Bạn đã nhận <strong>Lượng</strong> — mở Luận Đường để dùng thử';
  if (window.mountIcons) window.mountIcons(b);
  document.body.appendChild(b);
  setTimeout(() => { b.style.transition = 'opacity .6s'; b.style.opacity = '0'; }, 5000);
  setTimeout(() => b.remove(), 5700);
  // Refresh nav credit display
  setTimeout(() => { window.refreshNavCredits && window.refreshNavCredits(); }, 1000);
}

// Expose for inline use
window.showAuthModal  = showAuthModal;
window.refreshNavCredits = _loadNavCredits;
window.closeAuthModal = closeAuthModal;
window.switchTab      = switchTab;
window.submitAuth     = submitAuth;
window.signInGoogle   = signInGoogle;
window.signInFacebook = signInFacebook;

// ── Tab sáng lại → soát hạn token ─────────────────────────────────────
// Hẹn giờ ở trên là lớp chủ động, nhưng trình duyệt bóp nhịp timer ở tab chạy
// nền và treo hẳn khi máy ngủ — đúng ca hay gặp nhất: để tab qua đêm rồi sáng
// mở ra bấm một cái là ăn 401. Soát ở đây để token được xoay TRƯỚC cú bấm đầu.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (!_session) return;                 // khách vãng lai: không có gì để xoay
    if (_tokenFresh(_session, 300)) return; // còn >5 phút thì để hẹn giờ lo
    _ensureFreshToken();
  });
}
