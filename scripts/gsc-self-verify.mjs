/**
 * Service account tự verify ownership của site qua FILE method
 * Chạy 2 bước:
 *   node scripts/gsc-self-verify.mjs get-token   → lấy token + tạo file HTML
 *   node scripts/gsc-self-verify.mjs verify       → hoàn tất verify sau khi deploy
 */

import { createSign } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SA_PATH = process.argv[3] || 'C:\\Users\\DELL\\Desktop\\tuvi-minh-bao-132996d9bd0f.json';
const CMD = process.argv[2];
const SITE_URL = 'https://www.tuviminhbao.com/';
const TOKEN_CACHE = join(__dir, '.gsc-verify-token.json');

if (!CMD || !['get-token', 'verify'].includes(CMD)) {
  console.log('Usage:');
  console.log('  node scripts/gsc-self-verify.mjs get-token');
  console.log('  node scripts/gsc-self-verify.mjs verify');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/siteverification',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ─── get-token ────────────────────────────────────────────────────────────────

async function getToken() {
  console.log('Lấy service account token...');
  const saToken = await getServiceAccountToken();

  console.log('Yêu cầu verification token từ Google...');
  const res = await fetch('https://www.googleapis.com/siteVerification/v1/token', {
    method: 'POST',
    headers: { Authorization: `Bearer ${saToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site: { type: 'SITE', identifier: SITE_URL },
      verificationMethod: 'FILE',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);

  const { token } = data;
  const fileName = token; // Google trả về tên file luôn, e.g. "google1234abc.html"
  const fileContent = `google-site-verification: ${token}`;

  console.log(`\nVerification token: ${token}`);
  console.log(`File cần tạo: public/${fileName}`);

  // Tạo file trong public/
  const publicPath = join(__dir, '..', 'public', fileName);
  writeFileSync(publicPath, fileContent);
  console.log(`✓ Đã tạo: ${publicPath}`);

  // Lưu token để dùng ở bước verify
  writeFileSync(TOKEN_CACHE, JSON.stringify({ token, fileName }));

  console.log(`
Bước tiếp theo:
  1. git add public/${fileName} && git commit -m "chore: google site verification" && git push
  2. Đợi Vercel deploy xong (1-2 phút)
  3. Chạy: node scripts/gsc-self-verify.mjs verify
`);
}

// ─── verify ───────────────────────────────────────────────────────────────────

async function verify() {
  let cached;
  try {
    cached = JSON.parse(readFileSync(TOKEN_CACHE, 'utf8'));
  } catch {
    console.error('Chưa chạy get-token hoặc file cache bị mất. Chạy get-token trước.');
    process.exit(1);
  }

  console.log('Lấy service account token...');
  const saToken = await getServiceAccountToken();

  console.log(`Verify ${SITE_URL} với token ${cached.token}...`);
  const res = await fetch(`https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=FILE`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${saToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      site: { type: 'SITE', identifier: SITE_URL },
    }),
  });
  const data = await res.json();

  if (res.ok) {
    console.log(`\n✓ Thành công! Service account đã là verified owner của ${SITE_URL}`);
    console.log(`Owners: ${data.owners?.join(', ')}`);
  } else {
    console.error(`✗ Lỗi ${res.status}:`, JSON.stringify(data, null, 2));
    console.error('\nKiểm tra:');
    console.error(`  - File có accessible không: curl https://www.tuviminhbao.com/${cached.fileName}`);
    console.error('  - Vercel đã deploy xong chưa?');
    process.exit(1);
  }
}

if (CMD === 'get-token') await getToken();
else await verify();
