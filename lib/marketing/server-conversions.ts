// lib/marketing/server-conversions.ts
// ============================================================
// Nguồn DUY NHẤT bắn "đã mua thật" (topup) sang GA4 + Meta — từ SERVER, thay
// cho bắn ở payment-success.html (client). Đường client bị RACE với webhook:
// PayPal webhook thường chốt đơn TRƯỚC khi trình duyệt kịp load trang cảm ơn,
// nên phía client hầu như luôn thấy `already_completed` và tự bỏ qua (đúng ý,
// tránh tính trùng) — kết quả là KHÔNG AI bắn Purchase cả. Đo thật: 12 lượt nạp
// thành công trong 90 ngày, 0 event `purchase` trong GA4.
//
// Gọi đúng MỘT lần, tại nơi DUY NHẤT biết chắc "lần này có phải lần cộng tiền
// THẬT ĐẦU TIÊN không": `settlePayPalTopup` (lib/billing/paypal.ts), ngay khi
// RPC trả `credited === true`. Webhook và client capture cùng gọi vào đúng hàm
// đó nên không cần lo bắn trùng ở hai nơi.
//
// Cùng measurement ID / pixel ID đang dùng toàn site (public/nav.js,
// public/shell.js, public/payment-success.html) — đổi ID ở đây mà quên đổi
// bên client (hoặc ngược lại) là số liệu rơi vào hai property/pixel khác nhau,
// không bao giờ khớp lại được.
// ============================================================

import { createHash } from 'crypto';
import { waitUntil } from '@vercel/functions';
import { PAGE_ID as MESSENGER_PAGE_ID } from '@/lib/channels/messengerLink';
import { isShadowEmail } from '@/lib/channels/shadow-email';

const GA4_MEASUREMENT_ID = 'G-F4XNRS2XT0';
const GA4_MP_API_SECRET = process.env.GA4_MP_API_SECRET || '';

const META_PIXEL_ID = '1747342186469684';
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || '';
// Đơn của khách Messenger đi vào DATASET CỦA PAGE, không vào pixel website: Meta
// chỉ nhận `business_messaging` trên dataset gắn với Page (tạo bằng POST
// `/{page_id}/dataset`, 2026-10-01 Page chưa có — GET trả rỗng). Giao diện
// Business Settings KHÔNG cho nối Page vào pixel website. Gửi bằng token của
// Page. Thiếu một trong hai ⇒ gửi như đơn website vào pixel (vẫn đếm được).
const META_MESSAGING_DATASET_ID = (process.env.META_MESSAGING_DATASET_ID || '').replace(/\D/g, '');
const META_MESSAGING_TOKEN = process.env.META_MESSAGING_CAPI_TOKEN || process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function sha256(s: string): string {
  return createHash('sha256').update(s.trim().toLowerCase()).digest('hex');
}

async function lookupEmail(userId: string): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      cache: 'no-store',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return (u?.email as string) || null;
  } catch {
    return null;
  }
}

async function sendGA4Purchase(userId: string, transactionId: string, valueVnd: number): Promise<void> {
  if (!GA4_MP_API_SECRET) {
    console.error('[server-conversions] thiếu GA4_MP_API_SECRET, bỏ qua GA4 purchase');
    return;
  }
  // Measurement Protocol đòi client_id nhưng server không có cookie `_ga` thật
  // (nhất là lượt do webhook chốt — không hề chạm trình duyệt). Dùng hash ổn
  // định của user_id: đủ để GA4 đếm event/import Key Event sang Google Ads,
  // nhưng KHÔNG khớp lại đúng session/kênh gốc trên báo cáo GA4 UI cho lượt
  // này (nợ kỹ thuật đã biết, chấp nhận cho v1 — mục tiêu là có conversion để
  // tối ưu Ads, không phải attribution hoàn hảo trên từng đơn).
  const clientId = sha256(userId).slice(0, 32);
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_MP_API_SECRET}`;
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      client_id: clientId,
      events: [
        {
          name: 'purchase',
          params: { transaction_id: transactionId, value: valueVnd, currency: 'VND' },
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error('[server-conversions] GA4 MP lỗi', res.status, await res.text().catch(() => ''));
  }
}

/** PSID Messenger của tài khoản (nếu tài khoản sinh ra / gắn với Messenger). */
async function lookupMessengerPsid(userId: string): Promise<string | null> {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_links?user_id=eq.${encodeURIComponent(userId)}&platform=eq.messenger&select=external_id&limit=1`,
      { cache: 'no-store', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as { external_id?: string }[];
    return rows[0]?.external_id || null;
  } catch {
    return null;
  }
}

async function postMetaEvent(datasetId: string, token: string, event: Record<string, unknown>): Promise<boolean> {
  const url = `https://graph.facebook.com/v21.0/${datasetId}/events?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [event] }),
  });
  if (!res.ok) {
    console.error('[server-conversions] Meta CAPI lỗi', datasetId, res.status, await res.text().catch(() => ''));
  }
  return res.ok;
}

async function sendMetaPurchase(userId: string, transactionId: string, valueVnd: number): Promise<void> {
  const [email, psid] = await Promise.all([lookupEmail(userId), lookupMessengerPsid(userId)]);
  const userData: Record<string, unknown> = { external_id: sha256(userId) };
  // Email `@chat.tuviminhbao.com` là email tổng hợp, không có thật — băm gửi
  // đi chỉ là nhiễu cho khớp người dùng của Meta.
  if (email && !isShadowEmail(email)) userData.em = sha256(email);
  const base = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: transactionId,
    custom_data: { currency: 'VND', value: valueVnd },
  };
  // Khách đến từ quảng cáo Click-to-Messenger: Meta chỉ quy được đơn về đúng
  // quảng cáo khi event mang `business_messaging` + PSID + Page ID, gửi vào
  // dataset của Page (Conversions API for Business Messaging).
  if (psid && MESSENGER_PAGE_ID && META_MESSAGING_DATASET_ID && META_MESSAGING_TOKEN) {
    const ok = await postMetaEvent(META_MESSAGING_DATASET_ID, META_MESSAGING_TOKEN, {
      ...base,
      action_source: 'business_messaging',
      messaging_channel: 'messenger',
      user_data: { ...userData, page_id: MESSENGER_PAGE_ID, page_scoped_user_id: psid },
    });
    if (ok) return;
    // Hỏng (token/dataset sai) ⇒ vẫn gửi như đơn website bên dưới, đừng để mất đơn.
  }
  if (!META_CAPI_ACCESS_TOKEN) {
    console.error('[server-conversions] thiếu META_CAPI_ACCESS_TOKEN, bỏ qua Meta Purchase');
    return;
  }
  await postMetaEvent(META_PIXEL_ID, META_CAPI_ACCESS_TOKEN, { ...base, action_source: 'website', user_data: userData });
}

/**
 * Bắn "đã mua thật" sang GA4 + Meta. Không await ở nơi gọi — không được làm
 * chậm hay làm hỏng phản hồi thanh toán nếu Google/Meta sập hoặc chậm. Lỗi
 * chỉ vào `console.error`, không ném ra ngoài.
 *
 * 🔴 PHẢI bọc `waitUntil` (đã dùng ở app/api/channels/messenger/route.ts cho
 * đúng bài toán này) — hàm serverless của Vercel ĐÓNG BĂNG ngay sau khi
 * response được trả, promise chưa `await` mất luôn cơ hội chạy tiếp. Thiếu
 * dòng này là bug thật đã cắn: lượt nạp 87 Lượng qua chuyển khoản 07/09 log
 * "paid" bình thường nhưng GA4/Meta không hề nhận được `purchase`.
 */
export function fireServerPurchase(userId: string, transactionId: string, valueVnd: number): void {
  waitUntil(
    Promise.all([
      sendGA4Purchase(userId, transactionId, valueVnd).catch((e) =>
        console.error('[server-conversions] GA4 exception', e),
      ),
      sendMetaPurchase(userId, transactionId, valueVnd).catch((e) =>
        console.error('[server-conversions] Meta exception', e),
      ),
    ]).then(() => undefined),
  );
}
