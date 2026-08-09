// Supabase Edge Function `send-daily-push` — BẢN LƯU TRONG REPO.
//
// ⚠️ File này KHÔNG được Next build. Nó nằm đây để bản đang chạy trên Supabase
// có một bản đối chiếu trong lịch sử git — bản cũ chỉ tồn tại trên dashboard,
// nên không ai đọc lại được nó lúc đi tìm nguyên nhân "tin nhắc lặp mãi một
// câu". Deploy bằng Supabase MCP `deploy_edge_function` (slug send-daily-push).
//
// Đuôi `.deno.ts` là QUY ƯỚC, không phải cho đẹp: `tsconfig.json` loại
// `**/*.deno.ts` khỏi `tsc`. Mã Deno dùng `Deno.*` và import `npm:`/`jsr:` nên
// nằm trong lượt typecheck của Next là 8 lỗi chắc chắn. Thêm file Deno khác thì
// đặt cùng đuôi này.
//
// ── VAI TRÒ: CHỈ ĐI PHÁT, KHÔNG NGHĨ RA NỘI DUNG ────────────────────────────
// Bản trước tự dựng chữ từ một bảng CHÉP TAY 24 dòng tra theo CAN CHI NĂM SINH
// (`VAN_HAN`), tức mỗi người nhận ĐÚNG MỘT câu, y hệt nhau, mỗi sáng, mãi mãi —
// và câu đó không nói gì về ngày hôm nay. Nay nội dung do
// `lib/push/daily-message.ts` bên Next dựng (cùng engine ngày-tốt với thẻ "Vận
// hôm nay") rồi gửi xuống trong body.
//
// Chia vai như vậy vì engine là TypeScript trong repo còn hàm này là Deno tách
// biệt: chép engine sang đây là dựng bản thứ hai rồi hai bên trôi khỏi nhau.
// Ngược lại phần KÝ VAPID + mã hoá payload thì để nguyên bên này — gói
// `web-push` chạy tốt trên Deno, tự cài lại bằng crypto thô là ~150 dòng ECDH
// dễ sai thầm lặng.
//
// Vẫn chạy được khi KHÔNG có body (bản Next cũ) → lùi về một câu chung, KHÔNG
// lùi về bảng cũ. Nhờ vậy deploy hai bên theo thứ tự nào cũng không hỏng.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import webpush from 'npm:web-push@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const FALLBACK = {
  title: 'Vận hôm nay ☾',
  body: 'Xem ngày hôm nay tốt hay xấu, hợp việc gì.',
  url: '/app?from=push&utm_source=push&utm_medium=daily',
  xungChi: '',
};

type Sub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  tuoi?: number;
  can_chi?: string;
};

Deno.serve(async (req: Request) => {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== CRON_SECRET) return new Response('Unauthorized', { status: 401 });

  let msg = { ...FALLBACK };
  try {
    const b = await req.json();
    if (b && typeof b.title === 'string' && typeof b.body === 'string') {
      msg = {
        title: b.title,
        body: b.body,
        url: typeof b.url === 'string' && b.url ? b.url : FALLBACK.url,
        xungChi: typeof b.xungChi === 'string' ? b.xungChi : '',
      };
    }
  } catch {
    // Không có body / body hỏng → dùng FALLBACK. Không ném lỗi: thà gửi một câu
    // chung còn hơn im lặng cả ngày rồi không ai biết vì sao.
  }

  webpush.setVapidDetails('mailto:contact@tuviminhbao.com', VAPID_PUBLIC, VAPID_PRIVATE);

  const sbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,tuoi,can_chi&limit=5000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const subs = (await sbRes.json()) as Sub[];

  const results = { sent: 0, failed: 0, expired: 0 };

  for (const sub of subs) {
    try {
      // Phần CÁ NHÂN duy nhất: hôm nay có xung chính tuổi người này không.
      // Chỉ là một phép so chuỗi — địa chi năm sinh đã lưu sẵn lúc đăng ký, nên
      // không phải lập lại lá số cho từng người ở đây.
      const chi = (sub.can_chi || '').split(' ')[1] || '';
      const personal = msg.xungChi && chi && chi === msg.xungChi
        ? `⚠ Hôm nay xung tuổi ${msg.xungChi} — nên lùi việc lớn. `
        : '';

      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: msg.title,
          body: personal + msg.body,
          url: msg.url,
          icon: '/seal.webp',
          badge: '/seal.webp',
          tag: 'van-ngay',
        }),
        { TTL: 86400 }
      );
      results.sent++;

      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${sub.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ last_sent: new Date().toISOString() }),
      });
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${sub.id}`, {
          method: 'DELETE',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
        results.expired++;
      } else {
        results.failed++;
      }
    }
  }

  return new Response(JSON.stringify({ ...results, total: subs.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
