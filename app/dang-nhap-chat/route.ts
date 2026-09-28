// app/dang-nhap-chat/route.ts
// Trang đăng nhập web bằng tin nhắn: người đã nói chuyện với thầy qua Zalo/
// Messenger/WhatsApp/Telegram nhắn mã 6 số cho kênh đó là vào đúng tài khoản
// của mình — không email, không mật khẩu (lib/channels/login.ts).
// ?next=/duong-dan → quay về đó sau khi đăng nhập.
import { NextRequest } from 'next/server';
import { bridgePage } from '@/lib/channels/web-pages';
import { safeNext } from '@/lib/channels/handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const next = safeNext(new URL(request.url).searchParams.get('next'));
  return bridgePage(
    'Đăng nhập qua tin nhắn',
    `<h1 id="t">Đăng nhập qua tin nhắn</h1>
<p id="m">Nhắn mã dưới đây cho Tử Vi Minh Bảo trên ứng dụng bạn đang dùng để trò chuyện với thầy.</p>
<div class="code" id="code">······</div>
<p class="muted" id="hint">Mã dùng một lần, hết hạn sau 10 phút.</p>
<div class="btns" id="b"></div>
<p class="muted" style="margin-top:14px">Zalo: mở cuộc trò chuyện, dán mã rồi gửi.<br>Messenger, Telegram, WhatsApp: bấm nút là mã tự gửi kèm.</p>`,
    `(function () {
  var next = ${JSON.stringify(next)};
  var pollKey = '', timer = null, code = '';
  function $(id) { return document.getElementById(id); }
  function expired() {
    if (timer) clearInterval(timer);
    $('t').textContent = 'Mã đã hết hạn';
    $('m').textContent = 'Tải lại trang để lấy mã mới.';
    $('code').textContent = '······';
    $('b').innerHTML = '<a class="btn primary" href="">Lấy mã mới</a>';
  }
  function poll() {
    fetch('/api/channels/login?poll=' + encodeURIComponent(pollKey), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.status === 'ok' && j.tokenHash) {
          clearInterval(timer);
          $('m').textContent = 'Đang đăng nhập…';
          signInWithHash(j.tokenHash, null).then(function (ok) {
            if (!ok) return expired();
            $('t').textContent = 'Đã đăng nhập';
            $('m').textContent = 'Đang chuyển trang…';
            location.replace(next);
          });
        } else if (j.status === 'expired') expired();
      })
      .catch(function () {});
  }
  fetch('/api/channels/login', { method: 'POST' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.code) return expired();
      code = j.code; pollKey = j.pollKey;
      $('code').textContent = code;
      $('b').innerHTML = (j.channels || []).map(function (c) {
        return '<a class="btn" target="_blank" rel="noopener" data-p="' + c.platform + '" href="' + c.url + '">Mở ' + c.label + '</a>';
      }).join('');
      // Zalo không nhận được mã qua link → chép sẵn vào clipboard khi bấm.
      var z = document.querySelector('a[data-p="zalo-oa"]');
      if (z) z.addEventListener('click', function () {
        try { navigator.clipboard && navigator.clipboard.writeText(code); } catch (e) {}
        $('hint').textContent = 'Đã chép mã ' + code + ' — dán vào Zalo rồi gửi.';
      });
      timer = setInterval(poll, 2500);
      setTimeout(expired, (j.expiresIn || 600) * 1000);
    })
    .catch(expired);
})();`,
  );
}
