// app/c/[token]/route.ts
// Link một lần từ kênh chat sang web (lib/channels/handoff.ts). GET KHÔNG tiêu
// token — Zalo/Messenger tự tải trước link để dựng thẻ xem trước; máy đó không
// chạy JS nên không đi tới bước POST tiêu token bên dưới.
import { NextRequest } from 'next/server';
import { bridgePage } from '@/lib/channels/web-pages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token } = await ctx.params;
  const safe = /^[A-Za-z0-9_-]{16,64}$/.test(token || '') ? token : '';
  return bridgePage(
    'Đang mở',
    `<h1 id="t">Đang mở…</h1>
<p id="m">Chờ một chút, thầy đang mở trang cho bạn.</p>
<div class="btns" id="b" style="display:none"><a class="btn primary" href="/app">Vào Tử Vi Minh Bảo</a></div>`,
    `(function () {
  var token = ${JSON.stringify(safe)};
  function fail() {
    document.getElementById('t').textContent = 'Link đã hết hạn';
    document.getElementById('m').textContent = 'Link này chỉ dùng được một lần và trong 60 phút. Quay lại cuộc trò chuyện, bấm lại nút để lấy link mới nhé.';
    document.getElementById('b').style.display = 'flex';
  }
  if (!token) return fail();
  fetch('/api/channels/handoff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token }),
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.tokenHash) return fail();
      return signInWithHash(j.tokenHash, j.birth).then(function (ok) {
        if (!ok) return fail();
        location.replace(j.next || '/app');
      });
    })
    .catch(fail);
})();`,
  );
}
