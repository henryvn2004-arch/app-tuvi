/**
 * Add service account làm Owner của GSC property
 * Chạy 1 lần duy nhất để setup Indexing API
 *
 * Usage:
 *   node scripts/gsc-add-owner.mjs <path-to-service-account.json>
 *
 * Yêu cầu: GOOGLE_OAUTH_TOKEN env — lấy từ browser (xem hướng dẫn bên dưới)
 */

import { readFileSync } from 'node:fs';

const SA_PATH = process.argv[2];
if (!SA_PATH) {
  console.error('Usage: node scripts/gsc-add-owner.mjs <path-to-service-account.json>');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
const SA_EMAIL = sa.client_email;
const SITE_URL = 'https://www.tuviminhbao.com/'; // URL prefix property
const DOMAIN_SITE = 'sc-domain:tuviminhbao.com'; // domain property (thử cái này nếu trên fail)

// Token lấy từ browser — xem hướng dẫn bên dưới
const token = process.env.GOOGLE_OAUTH_TOKEN;
if (!token) {
  console.log(`
Cần GOOGLE_OAUTH_TOKEN — lấy như sau:
  1. Mở DevTools (F12) trong Chrome khi đang ở trang GSC
  2. Tab Network → filter "searchconsole" hoặc bất kỳ request nào tới googleapis.com
  3. Click 1 request → Headers → Authorization: Bearer <TOKEN>
  4. Copy phần sau "Bearer "

Hoặc dùng OAuth Playground:
  1. Vào: https://developers.google.com/oauthplayground
  2. Step 1: chọn "Search Console API v3" → authorize
  3. Step 2: Exchange → copy "Access token"

Sau đó chạy:
  $env:GOOGLE_OAUTH_TOKEN="ya29.xxx..." ; node scripts/gsc-add-owner.mjs "C:\\Users\\DELL\\Desktop\\tuvi-minh-bao-132996d9bd0f.json"
`);
  process.exit(1);
}

// Bước 1: Lấy danh sách webResources đã verify của user
async function listWebResources() {
  const res = await fetch('https://www.googleapis.com/siteVerification/v1/webResource', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`list webResources lỗi ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.items || [];
}

// Bước 2: Add service account vào owners list của webResource
async function addOwnerToResource(resource) {
  const owners = resource.owners || [];
  if (owners.includes(SA_EMAIL)) {
    console.log(`✓ ${SA_EMAIL} đã là owner rồi (không cần add)`);
    return true;
  }

  // Không được include `id` trong body PUT
  const { id: _id, ...resourceWithoutId } = resource;
  const updated = { ...resourceWithoutId, owners: [...owners, SA_EMAIL] };
  const res = await fetch(
    `https://www.googleapis.com/siteVerification/v1/webResource/${encodeURIComponent(resource.id)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updated),
    }
  );

  if (res.ok) {
    console.log(`✓ Thành công! ${SA_EMAIL} đã là Owner`);
    return true;
  }

  const text = await res.text();
  console.log(`✗ Lỗi ${res.status}: ${text.slice(0, 300)}`);
  return false;
}

// Main flow
const resources = await listWebResources();
console.log(`\nTìm thấy ${resources.length} verified site(s):`);
resources.forEach((r, i) => console.log(`  ${i + 1}. ${r.site?.identifier} (${r.site?.type})`));

// Ưu tiên SITE type (URL prefix), fallback INET_DOMAIN
const target =
  resources.find(
    (r) => r.site?.type === 'SITE' && r.site?.identifier?.includes('tuviminhbao.com')
  ) ||
  resources.find(
    (r) => r.site?.identifier?.includes('tuviminhbao.com') || r.id?.includes('tuviminhbao.com')
  );

if (!target) {
  console.error('\n✗ Không tìm thấy tuviminhbao.com trong verified sites.');
  console.error(
    'Danh sách IDs:',
    resources.map((r) => r.id)
  );
  process.exit(1);
}

console.log(`\nTarget: ${target.site?.identifier} (id: ${target.id})`);
console.log(`Current owners: ${(target.owners || []).join(', ')}`);
await addOwnerToResource(target);
