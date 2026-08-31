// ================================================================
// AUTH.JS — Shared Supabase Auth module
// Include in every page: <script src="/auth.js"></script>
// ================================================================

const SUPA_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

// ── Session storage keys ──
const SESSION_KEY = 'tuvi_session';
const USER_KEY    = 'tuvi_user';

// Facebook (và Instagram) mở link quảng cáo trong WEBVIEW RIÊNG của nó, không
// phải Chrome/Safari thật. Google CHỦ ĐỘNG chặn OAuth từ UA nhận diện được là
// webview nhúng (trả về lỗi "This browser or app may not be secure" —
// disallowed_useragent) — chặn cả redirect toàn trang, không riêng popup.
// Đo trên traffic Facebook Ads thật (2026-08-30): 1.639/1.640 khách vào từ
// utm_source=fb khớp UA này. Hệ quả đo được: 12 lượt bấm mở khoá trên Chu
// Trình Cuộc Đời chỉ ra ĐÚNG 1 signup — 11 người bấm "Tiếp tục với Google"
// (nút đầu tiên, nổi nhất) rồi kẹt ở trang cảnh báo của Google, không tự tìm
// xuống form email bên dưới. KHÔNG sửa mò regex này — nó đã đối chiếu đúng
// bằng số liệu, không phải suy đoán.
function _isEmbeddedWebview() {
  try {
    return /FBAN|FBAV|FB_IAB|FBIOS|Instagram/i.test(navigator.userAgent || '');
  } catch (e) { return false; }
}

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
  // Phiên "guest checkout" (xem signInAnonymously) — chưa thêm email/mật khẩu.
  isAnonymous: () => !!(_user && _user.is_anonymous),
  signInAnonymously: signInAnonymously,
  claimAccount: claimAccount,

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
    // Đăng xuất một phiên ẨN DANH chưa lưu = MẤT hẳn (không mật khẩu/email nào
    // để đăng nhập lại đúng phiên đó) — khác đăng xuất tài khoản thường (đăng
    // nhập lại được). Hỏi lại một câu, đừng để mất Lượng trong một cú bấm nhầm.
    if (_user && _user.is_anonymous) {
      var okToLeave = window.confirm('Bạn chưa lưu tài khoản — đăng xuất sẽ MẤT toàn bộ Lượng và lịch sử. Vẫn đăng xuất?');
      if (!okToLeave) return;
    }
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

// ── Guest checkout: phiên ẨN DANH, không hỏi gì ──
//
// Dùng khi khách bấm "mở khoá trả tiền" mà CHƯA từng đăng nhập — thay vì chặn
// bằng modal đăng ký ngay, tạo một phiên thật (có user_id, có JWT, dùng được
// với mọi RPC/route hiện có) TRONG ÂM THẦM rồi cho trả tiền luôn. Nếu quay lại
// sau/muốn giữ, họ "Lưu tài khoản" (claimAccount) — NÂNG CẤP TẠI CHỖ cùng
// user_id, không mất Lượng/lịch sử, không phải "hợp nhất 2 tài khoản".
//
// Cần bật "Allow anonymous sign-ins" ở Supabase Dashboard (Authentication →
// Sign In / Up → Anonymous) — CHƯA bật thì gọi `POST /auth/v1/signup` với body
// rỗng trả lỗi `anonymous_provider_disabled`, hàm này trả `false`, nơi gọi tự
// rơi về đường cũ (hiện modal đăng ký) — an toàn để ship trước khi bật cờ đó.
//
// 🔴 TRƯỚC KHI bật cờ này, `handle_new_user_signup()` (trigger cấp quà chào
// mừng lúc đăng ký) PHẢI đã chặn `is_anonymous` — nếu không mỗi phiên ẩn danh
// (tạo được bằng xoá cookie, không cần email/OTP) tự ăn luôn 20-40 Lượng free,
// cày vô hạn. Xem _patches/migration-anon-checkout-no-signup-bonus.sql.
async function signInAnonymously() {
  try {
    var anonId = null;
    try { anonId = localStorage.getItem('tvmb_anon'); } catch (e) { /* ignore */ }
    var res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json' },
      // `data` gắn vào user_metadata NẾU GoTrue chấp nhận cho lượt ẩn danh —
      // best-effort nối lại nguồn UTM (track.js) với user_id mới, không quan
      // trọng bằng chính lượt đăng nhập nên KHÔNG throw nếu bị bỏ qua.
      body: JSON.stringify(anonId ? { data: { source_anon_id: anonId } } : {}),
    });
    var data = await res.json();
    if (!res.ok || !data.access_token) return false;
    saveSession(data);
    return true;
  } catch (e) {
    return false;
  }
}

// ── "Lưu tài khoản" — gắn email/mật khẩu vào phiên ẨN DANH đang có ──
//
// KHÔNG phải signUpEmail (tạo user MỚI) — đây là `PUT /auth/v1/user` trên
// CHÍNH session ẩn danh hiện tại, GoTrue nâng cấp tại chỗ (giữ nguyên user_id
// ⇒ giữ nguyên Lượng/lịch sử/quyền đã mua). Tuỳ cấu hình "Confirm email" của
// dự án, `is_anonymous` có thể chỉ chuyển `false` SAU khi khách bấm link xác
// nhận trong email — không coi im lặng đây là "đã xác nhận".
async function claimAccount(email, password) {
  var token = await _ensureFreshToken();
  if (!token) throw new Error('Phiên đã hết hạn. Vui lòng thử lại.');
  var res = await fetch(`${SUPA_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { 'apikey': SUPA_KEY, 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ email: email, password: password }),
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Không lưu được tài khoản.');
  // Cập nhật `_user` tại chỗ (email mới) — session token KHÔNG đổi, chỉ user đổi.
  _user = data;
  try { localStorage.setItem(USER_KEY, JSON.stringify(_user)); } catch (e) { /* ignore */ }
  updateNavUI();
  return data;
}

// Lưu trang hiện tại để auth-callback quay về (nếu chưa có returnTo cụ thể do
// rail đặt kèm ?auto=1). Tránh về homepage sau khi đăng nhập OAuth.
function _rememberAuthReturn() {
  try { if (!localStorage.getItem('auth_return_to')) localStorage.setItem('auth_return_to', window.location.pathname + window.location.search); } catch (e) {}
}

/**
 * Nạp `/promo.js` theo lối LƯỜI.
 *
 * `auth.js` nằm trên ~89 trang, còn ô nhập mã chỉ có nghĩa ở đúng hai lúc:
 * modal đăng ký mở ra, hoặc URL mang sẵn `?promo=`. Nạp ở đây thay vì thêm
 * thẻ script vào 89 file — 89 chỗ để quên là 89 chỗ mã lặng lẽ không ăn, đúng
 * lỗi `referral.js` đã dính khi bị chép inline 2 bản.
 */
function _ensurePromoJs() {
  if (window.Promo || document.getElementById('tvmb-promo-js')) return;
  const s = document.createElement('script');
  s.id = 'tvmb-promo-js';
  s.src = '/promo.js?v=1';
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
}
try {
  // Đáp trang bằng link mang mã → nạp ngay để `capture()` nhặt được trước khi
  // người dùng điều hướng đi chỗ khác (nhặt xong nó dọn luôn khỏi thanh địa chỉ).
  if (typeof location !== 'undefined' && /[?&]promo=/i.test(location.search)) _ensurePromoJs();
} catch (e) { /* ignore */ }

/**
 * Cất mã khuyến mãi đang gõ vào sessionStorage TRƯỚC khi rời trang.
 *
 * Phải gọi ở CẢ đường email lẫn đường OAuth: đổi mã cần Authorization token,
 * mà lúc bấm nút thì chưa có token nào. `promo.js` sẽ đổi ngay khi bắt được
 * `SIGNED_IN`. Đường OAuth đi qua `/auth-callback.html` — cùng tab, cùng
 * origin, nên sessionStorage sống qua được lượt chuyển trang đó.
 */
function _stashPromoCode() {
  try {
    const el = document.getElementById('auth-promo');
    if (el && el.value.trim() && window.Promo) window.Promo.setPending(el.value);
  } catch (e) { /* ignore */ }
}

// ── Sign In with Google OAuth ──
async function signInGoogle() {
  _rememberAuthReturn();
  _stashPromoCode();
  const redirectTo = encodeURIComponent(window.location.origin + '/auth-callback.html');
  window.location.href = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
}

async function signInFacebook() {
  _rememberAuthReturn();
  _stashPromoCode();
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
    const isAnon = !!_user.is_anonymous;
    const email = _user.email || '';
    const name  = isAnon ? 'Khách' : (_user.user_metadata?.full_name || _user.user_metadata?.name || '');
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
            <div style="font-size:11px;color:#999;margin-top:2px">${isAnon ? 'Chưa lưu tài khoản' : email}</div>
          </div>
          <div style="padding:10px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Lượng · Xu</div>
              <div id="nav-credit-menu-val" style="font-size:16px;font-weight:700;color:#061A2E;font-family:Georgia,serif">… lượng</div>
            </div>
            <a href="/topup.html" style="background:#c9a84c;color:#061A2E;font-size:11px;font-weight:700;padding:5px 10px;border-radius:5px;text-decoration:none" onmouseover="this.style.background='#f0d080'" onmouseout="this.style.background='#c9a84c'">+ Nạp</a>
          </div>
          ${isAnon ? `<button onclick="window.showClaimModal&&showClaimModal();document.getElementById('nav-profile-menu').style.display='none'" style="display:flex;align-items:center;gap:6px;width:100%;padding:9px 16px;font-size:13px;font-weight:700;color:#9A7B3A;background:#FBF8F1;border:none;border-bottom:1px solid #f0f0f0;text-align:left;cursor:pointer;font-family:inherit">⚠ Lưu tài khoản — tránh mất Lượng</button>` : ''}
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
  _ensurePromoJs();
  if (document.getElementById('auth-modal')) {
    document.getElementById('auth-modal').style.display = 'flex';
    _prefillPromo();
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

      <!-- Google/Facebook OAuth — ẨN khi mở trong webview nhúng của FB/IG, xem
           _isEmbeddedWebview(). Cả hai nhà cung cấp đều không tin cậy được ở
           đó (Google chặn hẳn UA webview), nên đường DUY NHẤT còn lại là form
           email bên dưới — ẩn cả khối để khỏi mời bấm vào một nút chắc chắn kẹt. -->
      <div id="auth-oauth-block">
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
      </div>
      <p id="auth-webview-note" style="display:none;font-size:12px;color:#7A5F26;background:#FBF8F1;border:1px solid #EADFC8;border-radius:8px;padding:9px 12px;margin-bottom:14px;line-height:1.6">Bạn đang mở trong ứng dụng Facebook/Instagram nên đăng nhập Google/Facebook không dùng được ở đây — dùng email bên dưới, chỉ mất chưa tới 1 phút.</p>

      <!-- Email form -->
      <div id="auth-form">
        <input id="auth-email" type="email" placeholder="Email" style="width:100%;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#061A2E'" onblur="this.style.borderColor='#ddd'">
        <input id="auth-password" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" style="width:100%;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none;transition:border-color 0.15s" onfocus="this.style.borderColor='#061A2E'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')submitAuth()">
        <!-- Ô mã khuyến mãi: CHỈ hiện ở tab Đăng ký (switchTab bật/tắt).
             Ở tab Đăng nhập nó vô nghĩa và chỉ làm form dài thêm. -->
        <div id="auth-promo-wrap" style="display:none;margin-bottom:10px">
          <input id="auth-promo" type="text" placeholder="Mã khuyến mãi (nếu có)" autocapitalize="characters" autocomplete="off" spellcheck="false" style="width:100%;padding:10px 14px;border:1.5px dashed #c9a84c;border-radius:8px;font-size:14px;font-family:inherit;outline:none;text-transform:uppercase;transition:border-color 0.15s" onfocus="this.style.borderColor='#061A2E'" onblur="this.style.borderColor='#c9a84c'" oninput="_promoPeek()" onkeydown="if(event.key==='Enter')submitAuth()">
          <div id="auth-promo-hint" style="font-size:11.5px;color:#1E6B3C;margin-top:5px;display:none"></div>
        </div>
        <div id="auth-error" style="color:#C0392B;font-size:12px;margin-bottom:8px;display:none"></div>
        <button id="auth-submit" onclick="submitAuth()" style="width:100%;padding:11px;background:#061A2E;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s" onmouseover="this.style.background='#0D3B5E'" onmouseout="this.style.background='#061A2E'">Đăng nhập</button>
      </div>

      <p style="text-align:center;font-size:11px;color:#aaa;margin-top:16px;line-height:1.6">Bằng cách đăng ký, bạn đồng ý với điều khoản sử dụng của Tử Vi Minh Bảo.</p>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeAuthModal(); });
  if (_isEmbeddedWebview()) {
    const oauthBlock = document.getElementById('auth-oauth-block');
    if (oauthBlock) oauthBlock.style.display = 'none';
    const note = document.getElementById('auth-webview-note');
    if (note) note.style.display = 'block';
    // Khách bấm quảng cáo hầu như luôn là người MỚI — mở thẳng tab Đăng ký để
    // khỏi phải tự bấm qua, và để họ thấy ngay có Lượng tặng.
    if (_currentTab !== 'signup') switchTab('signup');
  }
  setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
  _prefillPromo();
}

/**
 * Điền sẵn mã nếu người dùng đáp trang bằng link `?promo=…` — và MỞ THẲNG tab
 * Đăng ký. Họ tới đây vì cái mã, bắt gõ lại là một bước rơi vô cớ.
 * `promo.js` nạp bất đồng bộ nên thử lại một nhịp khi nó chưa kịp có mặt.
 */
function _prefillPromo(retry) {
  if (!window.Promo) {
    if (!retry) setTimeout(() => _prefillPromo(true), 400);
    return;
  }
  const code = window.Promo.pendingCode();
  if (!code) return;
  const el = document.getElementById('auth-promo');
  if (!el || el.value.trim()) return;   // đang gõ dở thì không đè lên
  el.value = code;
  if (_currentTab !== 'signup') switchTab('signup');
  _promoPeek();
}

function closeAuthModal() {
  const m = document.getElementById('auth-modal');
  if (m) m.style.display = 'none';
  _pendingCallback = null;
}

// ── "Lưu tài khoản" — modal RIÊNG, nhỏ, KHÔNG dùng chung DOM với showAuthModal
// (tránh đụng logic tab đăng nhập/đăng ký đang chạy tốt). Chỉ có ở đây khi
// đang là phiên ẩn danh (xem `TuviPaywall`/`updateNavUI` — nơi gọi tự kiểm).
function showClaimModal() {
  if (document.getElementById('claim-modal')) {
    document.getElementById('claim-modal').style.display = 'flex';
    return;
  }
  const modal = document.createElement('div');
  modal.id = 'claim-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:32px;width:100%;max-width:380px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <button onclick="closeClaimModal()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;line-height:1">×</button>
      <div style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:#061A2E;margin-bottom:6px">Lưu tài khoản</div>
      <p style="font-size:12.5px;color:#7a705f;line-height:1.6;margin-bottom:18px">Bạn đang dùng phiên tạm — Lượng và lịch sử đang giữ ở đây sẽ MẤT nếu xoá trình duyệt hoặc đổi máy. Thêm email + mật khẩu để giữ lại, không mất gì đang có.</p>
      <input id="claim-email" type="email" placeholder="Email" style="width:100%;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none" onfocus="this.style.borderColor='#061A2E'" onblur="this.style.borderColor='#ddd'">
      <input id="claim-password" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" style="width:100%;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;margin-bottom:10px;outline:none" onfocus="this.style.borderColor='#061A2E'" onblur="this.style.borderColor='#ddd'" onkeydown="if(event.key==='Enter')submitClaim()">
      <div id="claim-error" style="color:#C0392B;font-size:12px;margin-bottom:8px;display:none"></div>
      <button id="claim-submit" onclick="submitClaim()" style="width:100%;padding:11px;background:#061A2E;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Lưu tài khoản</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeClaimModal(); });
  setTimeout(() => document.getElementById('claim-email')?.focus(), 100);
}

function closeClaimModal() {
  const m = document.getElementById('claim-modal');
  if (m) m.style.display = 'none';
}

async function submitClaim() {
  const email = document.getElementById('claim-email').value.trim();
  const pass  = document.getElementById('claim-password').value;
  const errEl = document.getElementById('claim-error');
  const btn   = document.getElementById('claim-submit');
  if (!email || !pass) { errEl.textContent = 'Vui lòng điền email và mật khẩu.'; errEl.style.display = 'block'; return; }
  if (pass.length < 6) { errEl.textContent = 'Mật khẩu ít nhất 6 ký tự.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  btn.textContent = '...'; btn.disabled = true;
  try {
    await claimAccount(email, pass);
    closeClaimModal();
    try { window.fbq && window.fbq('track', 'CompleteRegistration'); } catch (e) {}
    const msg = '✓ Đã lưu — kiểm tra email để xác nhận nếu được yêu cầu';
    if (window.TuviPaywall && window.TuviPaywall._banner) window.TuviPaywall._banner(msg);
    else alert(msg);
  } catch (e) {
    errEl.textContent = e.message || 'Không lưu được. Vui lòng thử lại.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Lưu tài khoản'; btn.disabled = false;
  }
}
window.showClaimModal = showClaimModal;
window.closeClaimModal = closeClaimModal;
window.submitClaim = submitClaim;

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
  const pw = document.getElementById('auth-promo-wrap');
  if (pw) pw.style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('auth-error').style.display = 'none';
}

// ── Mã khuyến mãi trong modal đăng ký ──
// Người xem clip TikTok nghe "nhập mã TUVIMINHBAO" rồi gõ vào đây. Ô này KHÔNG
// tự đổi mã — nó chỉ NHỚ mã lại; `promo.js` đổi sau khi phiên đăng nhập đã có
// token thật (đổi mã cần Authorization, mà lúc bấm nút thì chưa có).
let _promoPeekTimer = null;
function _promoPeek() {
  const el = document.getElementById('auth-promo');
  const hint = document.getElementById('auth-promo-hint');
  if (!el || !hint) return;
  const code = el.value.toUpperCase().trim();
  clearTimeout(_promoPeekTimer);
  if (!window.Promo || !window.Promo.CODE_RE.test(code)) { hint.style.display = 'none'; return; }
  // Chờ người ta gõ xong mới hỏi — gõ 11 ký tự mà bắn 11 lượt mạng là phí.
  _promoPeekTimer = setTimeout(() => {
    window.Promo.info(code).then((d) => {
      // Số Lượng lấy TỪ SERVER, không viết cứng ở đây. Xem `promo.js#info`.
      if (d && d.found && d.live) {
        hint.textContent = `✓ Mã hợp lệ — tặng ${d.credits} Lượng khi tạo tài khoản.`;
        hint.style.color = '#1E6B3C';
      } else if (d && d.found) {
        hint.textContent = 'Mã này đã hết hạn hoặc hết lượt.';
        hint.style.color = '#C0392B';
      } else {
        hint.style.display = 'none';
        return;
      }
      hint.style.display = 'block';
    });
  }, 450);
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

  // Cất mã TRƯỚC khi gọi mạng: nếu đăng ký thành công thì `promo.js` bắt
  // `SIGNED_IN` và đổi ngay; nếu hỏng thì mã vẫn còn đó cho lượt sau.
  if (_currentTab === 'signup') _stashPromoCode();

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
      try { window.fbq && window.fbq('track', 'CompleteRegistration'); } catch (e) {}
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
