// lib/channels/web-pages.ts
// Khung HTML nhỏ cho hai trang cầu chat ↔ web (`/c/<token>`, `/dang-nhap-chat`)
// + đoạn JS ghi phiên đăng nhập vào ĐÚNG các lớp lưu mà public/auth.js đọc
// (`tuvi_session`/`tuvi_user` trong localStorage + cookie JS `tuvi_rt` + cookie
// HttpOnly `tvmb_rt` qua /api/auth/session). Đổi tên khoá ở auth.js thì phải
// sửa ở đây.

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * JS (chuỗi) cho trang cầu:
 *   • `signInWithHash(hash, birth)` — đổi mã đăng nhập một lần lấy phiên ở
 *     Supabase `/verify` (từ trình duyệt — xem lib/channels/handoff.ts), ghi
 *     phiên như `_applySession` của auth.js, gửi refresh token lên
 *     `/api/auth/session` để đặt cookie bền `tvmb_rt`. Trả Promise<boolean>.
 */
function signInJs(): string {
  const url = JSON.stringify(process.env.SUPABASE_URL || '');
  const key = JSON.stringify(process.env.SUPABASE_ANON_KEY || '');
  return `
function applySession(s, birth) {
  try {
    localStorage.setItem('tuvi_session', JSON.stringify(s));
    if (s.user) localStorage.setItem('tuvi_user', JSON.stringify(s.user));
    if (birth) localStorage.setItem('app_birth', JSON.stringify(birth));
  } catch (e) {}
  if (s.refresh_token) {
    var d = new Date(); d.setTime(d.getTime() + 180 * 864e5);
    document.cookie = 'tuvi_rt=' + encodeURIComponent(s.refresh_token) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Strict';
  }
}
function signInWithHash(hash, birth) {
  return fetch(${url} + '/auth/v1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ${key} },
    body: JSON.stringify({ type: 'magiclink', token_hash: hash }),
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s || !s.access_token) return false;
      if (!s.expires_at && s.expires_in) s.expires_at = Math.floor(Date.now() / 1000) + s.expires_in;
      applySession(s, birth);
      return fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      }).then(function () { return true; }, function () { return true; });
    });
}`;
}

export function bridgePage(title: string, bodyHtml: string, script: string): Response {
  const html = `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)} — Tử Vi Minh Bảo</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#F4F2EC; color:#1a1a2e; font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; }
  .card { background:#fff; border-radius:14px; padding:28px 24px; margin:16px; max-width:380px; width:100%;
    box-shadow:0 10px 40px rgba(0,0,0,.08); text-align:center; }
  h1 { font-size:18px; margin:0 0 10px; color:#061A2E; }
  p { font-size:14px; line-height:1.6; color:#555; margin:8px 0; }
  .code { font-size:34px; font-weight:800; letter-spacing:.18em; color:#CC2200; margin:14px 0 4px; font-variant-numeric:tabular-nums; }
  .btns { display:flex; flex-direction:column; gap:8px; margin-top:16px; }
  a.btn, button.btn { display:block; padding:11px 14px; border-radius:8px; border:1.5px solid #ddd; background:#fff;
    color:#061A2E; font-size:14px; font-weight:600; text-decoration:none; cursor:pointer; font-family:inherit; }
  a.btn.primary { background:#061A2E; border-color:#061A2E; color:#fff; }
  .muted { font-size:12px; color:#999; }
</style>
</head><body><main class="card">${bodyHtml}</main>
<script>${signInJs()}
${script}</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
