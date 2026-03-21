// ================================================================
// AUTH.JS — Shared Supabase Auth module
// Include in every page: <script src="/auth.js"></script>
// ================================================================

const SUPA_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

// ── Session storage keys ──
const SESSION_KEY = 'tuvi_session';
const USER_KEY    = 'tuvi_user';

// ── Auth state ──
let _session = null;
let _user    = null;

// ── Init: restore session from localStorage ──
(function initAuth() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.access_token && s.expires_at > Date.now() / 1000) {
        _session = s;
        _user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      } else {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  } catch(e) {}
  updateNavUI();
})();

// ── Public API ──
window.Auth = {
  isLoggedIn:  () => !!_session,
  getUser:     () => _user,
  getSession:  () => _session,

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

// ── Sign In with Google OAuth ──
async function signInGoogle() {
  const redirectTo = encodeURIComponent(window.location.origin + '/auth-callback.html');
  window.location.href = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
}

// ── Save session ──
function saveSession(data) {
  _session = data;
  _user = data.user || null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  localStorage.setItem(USER_KEY, JSON.stringify(_user));
  updateNavUI();
}

// ── Update Nav UI (show avatar or sign in button) ──
function updateNavUI() {
  const navEl = document.getElementById('nav-auth-area');
  if (!navEl) return;
  if (_session && _user) {
    const email = _user.email || '';
    const initial = email.charAt(0).toUpperCase();
    navEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="Auth.signOut()" title="Đăng xuất (${email})">
        <div style="width:30px;height:30px;background:#c9a84c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#061A2E">${initial}</div>
      </div>`;
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
        <button id="tab-signup" onclick="switchTab('signup')" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:500;color:#aaa;cursor:pointer;font-family:inherit">Đăng ký</button>
      </div>

      <!-- Logo -->
      <div style="text-align:center;margin-bottom:20px">
        <img src="/seal.webp" style="width:48px;height:48px;border-radius:6px;margin-bottom:8px">
        <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#CC2200">Tử Vi Minh Bảo</div>
      </div>

      <!-- Google OAuth -->
      <button onclick="signInGoogle()" style="width:100%;padding:11px;border:1.5px solid #ddd;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:16px;transition:border-color 0.15s" onmouseover="this.style.borderColor='#4285f4'" onmouseout="this.style.borderColor='#ddd'">
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
        Tiếp tục với Google
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

// Expose for inline use
window.showAuthModal  = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchTab      = switchTab;
window.submitAuth     = submitAuth;
window.signInGoogle   = signInGoogle;
