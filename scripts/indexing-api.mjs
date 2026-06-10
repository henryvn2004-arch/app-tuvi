/**
 * Google Indexing API — gửi URLs mới/updated để Google index nhanh hơn
 *
 * Setup:
 *   1. Google Cloud Console → enable "Web Search Indexing API"
 *   2. Tạo Service Account → download JSON key
 *   3. Google Search Console → add service account email as "Owner"
 *   4. Set env: GOOGLE_SERVICE_ACCOUNT_JSON=<nội dung file JSON, base64 hoặc raw>
 *
 * Usage:
 *   node scripts/indexing-api.mjs                    # warm top URLs mặc định (200/ngày)
 *   node scripts/indexing-api.mjs --year 1990        # warm 1 năm sinh
 *   node scripts/indexing-api.mjs --urls url1,url2   # gửi URLs cụ thể
 *   node scripts/indexing-api.mjs --limit 50         # giới hạn số URLs
 */

import { createSign } from 'node:crypto';

const BASE_URL = 'https://www.tuviminhbao.com';
const INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const QUOTA_PER_DAY = 200; // mặc định Google; tăng lên sau khi xin quota

// Parse args
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const BIRTH_YEAR = getArg('year') ? parseInt(getArg('year')) : null;
const CUSTOM_URLS = getArg('urls') ? getArg('urls').split(',') : null;
const LIMIT = getArg('limit') ? parseInt(getArg('limit')) : QUOTA_PER_DAY;
const DRY_RUN = hasFlag('dry-run');

// ─── JWT / OAuth2 ────────────────────────────────────────────────────────────

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(serviceAccount.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${header}.${payload}.${sig}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = makeJWT(serviceAccount);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth2 error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── URL generation ───────────────────────────────────────────────────────────

const CAN = ['giap', 'at', 'binh', 'dinh', 'mau', 'ky', 'canh', 'tan', 'nham', 'quy'];
const CHI = ['ty', 'suu', 'dan', 'mao', 'thin', 'ti', 'ngo', 'mui', 'than', 'dau', 'tuat', 'hoi'];
const NAM_XEM = 2027;

function canChiOfYear(year) {
  const can = CAN[(((year - 4) % 10) + 10) % 10];
  const chi = CHI[(((year - 4) % 12) + 12) % 12];
  return `${can}-${chi}`;
}

function daysInMonth(m, y) {
  if (m === 2) return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28;
  return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

// Giờ phổ biến nhất theo traffic thực tế
const POPULAR_GIOS = ['ty', 'ngo', 'mao', 'dau', 'dan', 'than', 'thin', 'tuat'];

function generateUrlsForYear(year, gioLimit = 4) {
  const slug = canChiOfYear(year);
  const gios = POPULAR_GIOS.slice(0, gioLimit);
  const urls = [];

  for (let m = 1; m <= 12; m++) {
    const MM = String(m).padStart(2, '0');
    const maxD = daysInMonth(m, year);
    for (let d = 1; d <= maxD; d++) {
      const DD = String(d).padStart(2, '0');
      for (const gio of gios) {
        for (const gioi of ['nam', 'nu']) {
          urls.push(`${BASE_URL}/la-so/${slug}-${DD}-${MM}-${year}-gio-${gio}-${gioi}-${NAM_XEM}`);
        }
      }
    }
  }
  return urls;
}

// Priority: năm sinh có nhiều traffic nhất
const PRIORITY_YEARS = [
  1985, 1990, 1980, 1995, 1975, 1988, 1992, 1987, 1983, 1978, 1998, 2000, 1993, 1996, 2002, 2004,
];

function generatePriorityUrls(limit) {
  const urls = [];
  for (const year of PRIORITY_YEARS) {
    if (urls.length >= limit) break;
    const yearUrls = generateUrlsForYear(year, 2); // 2 giờ/năm để đa dạng năm sinh
    urls.push(...yearUrls.slice(0, limit - urls.length));
  }
  return urls.slice(0, limit);
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function notifyUrl(url, token) {
  const res = await fetch(INDEXING_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });

  if (!res.ok) {
    const text = await res.text();
    // 429 = quota exceeded, throw để dừng loop
    if (res.status === 429) throw new Error(`QUOTA_EXCEEDED: ${text}`);
    // 400/403 = URL không hợp lệ hoặc domain chưa verify — log và tiếp tục
    console.warn(`  SKIP ${res.status}: ${url} — ${text.slice(0, 120)}`);
    return false;
  }
  return true;
}

async function sendBatch(urls, token, { batchSize = 10, delayMs = 500 } = {}) {
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map((u) => notifyUrl(u, token)));

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) ok++;
      else if (r.status === 'rejected' && r.reason?.message?.startsWith('QUOTA_EXCEEDED')) {
        console.error('\n[!] Quota exceeded — dừng lại.');
        console.log(`\nKết quả: ${ok} OK, ${fail} lỗi / ${i + batch.length} gửi`);
        return { ok, fail, stopped: true };
      } else fail++;
    }

    const progress = Math.min(i + batchSize, urls.length);
    process.stdout.write(`\r  Đã gửi: ${progress}/${urls.length} (${ok} OK, ${fail} lỗi)`);

    if (i + batchSize < urls.length) await new Promise((r) => setTimeout(r, delayMs));
  }

  console.log(); // newline sau progress
  return { ok, fail, stopped: false };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load service account
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    console.error('Missing env: GOOGLE_SERVICE_ACCOUNT_JSON');
    console.error('  Set nó = nội dung file JSON từ Google Cloud Console');
    process.exit(1);
  }

  let serviceAccount;
  try {
    // Hỗ trợ cả raw JSON và base64-encoded
    const raw = saJson.trim().startsWith('{') ? saJson : Buffer.from(saJson, 'base64').toString();
    serviceAccount = JSON.parse(raw);
  } catch {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON không parse được — phải là JSON hoặc base64(JSON)');
    process.exit(1);
  }

  // Build URL list
  let urls;
  if (CUSTOM_URLS) {
    urls = CUSTOM_URLS;
    console.log(`Mode: custom URLs (${urls.length})`);
  } else if (BIRTH_YEAR) {
    urls = generateUrlsForYear(BIRTH_YEAR).slice(0, LIMIT);
    console.log(`Mode: năm sinh ${BIRTH_YEAR} (${urls.length} URLs)`);
  } else {
    urls = generatePriorityUrls(LIMIT);
    console.log(`Mode: priority years (${urls.length} URLs, limit ${LIMIT})`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] URLs sẽ được gửi:');
    urls.slice(0, 10).forEach((u) => console.log(' ', u));
    if (urls.length > 10) console.log(`  ... và ${urls.length - 10} URLs nữa`);
    return;
  }

  // Get token
  console.log('\nLấy access token...');
  let token;
  try {
    token = await getAccessToken(serviceAccount);
  } catch (e) {
    console.error('Lỗi auth:', e.message);
    process.exit(1);
  }
  console.log('Token OK\n');

  // Send
  console.log(`Gửi ${urls.length} URLs lên Google Indexing API...`);
  const { ok, fail } = await sendBatch(urls, token);

  console.log(`\nXong: ${ok} OK, ${fail} lỗi`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
