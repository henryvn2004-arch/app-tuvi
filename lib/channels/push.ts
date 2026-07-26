// lib/channels/push.ts
// FCM HTTP v1 send — nguồn DÙNG CHUNG, lift từ app/api/cron/daily-push/route.ts
// (M0.4, track Marketing Autopilot) để tái dùng cho lượt gửi 1-người (nhắc
// user sắp rời bỏ) thay vì chỉ broadcast toàn bộ token mỗi sáng.
// Auth: JWT (RS256, tự ký bằng service-account key) → OAuth access token →
// messages:send. KHÔNG cần thư viện firebase-admin.
import { createSign } from 'crypto';

export interface FirebaseServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

export function parseFirebaseServiceAccount(raw: string): FirebaseServiceAccount {
  const sa = JSON.parse(raw);
  if (!sa.client_email || !sa.private_key || !sa.project_id) throw new Error('missing fields');
  return sa;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function fcmAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  const signed = createSign('RSA-SHA256').update(header + '.' + claim).sign(sa.private_key);
  const jwt = header + '.' + claim + '.' + b64url(signed);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('OAuth token failed: ' + JSON.stringify(j));
  return j.access_token as string;
}

export interface FcmSendResult {
  sent: number;
  failed: number;
  dead: string[]; // token chết (404/400) — caller nên tắt enabled trong push_tokens
}

// Gửi CÙNG 1 notification title/body tới nhiều token (1 hoặc nhiều thiết bị).
export async function sendFcmPush(
  sa: FirebaseServiceAccount,
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<FcmSendResult> {
  const accessToken = await fcmAccessToken(sa);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  let sent = 0, failed = 0;
  const dead: string[] = [];
  for (const token of tokens) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: { priority: 'high', notification: { sound: 'default' } },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
      });
      if (r.ok) sent++;
      else {
        failed++;
        if (r.status === 404 || r.status === 400) dead.push(token);
      }
    } catch {
      failed++;
    }
  }
  return { sent, failed, dead };
}
