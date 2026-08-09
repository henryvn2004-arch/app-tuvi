import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL || 'playwright@tuviminhbao.com';
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD || '';
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  if (!TEST_PASSWORD) throw new Error('PLAYWRIGHT_TEST_PASSWORD chưa set');

  const res = await page.evaluate(async ({ url, key, email, password }) => {
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  }, { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, email: TEST_EMAIL, password: TEST_PASSWORD });

  if (!res.access_token) throw new Error(`Login thất bại: ${JSON.stringify(res)}`);

  const session = {
    access_token: res.access_token,
    refresh_token: res.refresh_token,
    expires_in: res.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + res.expires_in,
    token_type: 'bearer',
    user: res.user,
  };

  // Preview nằm sau Vercel Authentication. Lấy vé bằng QUERY ở đúng lượt điều
  // hướng đầu tiên: server trả về cookie `_vercel_jwt`, cookie đó được lưu vào
  // storageState ngay dưới đây nên MỌI test sau đều qua cửa.
  //
  // 🔑 CỐ Ý không dùng `extraHTTPHeaders`: nó áp lên cả request KHÁC ORIGIN
  // (Google Fonts), biến chúng thành preflight rồi bị CORS chặn → font hỏng →
  // các ca "không có JS errors" đỏ oan. Cookie thì không gắn gì vào host lạ.
  const bypass = process.env.VERCEL_BYPASS_SECRET;
  await page.goto(
    bypass
      ? `/?x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=true`
      : '/'
  );
  // auth.js uses 'tuvi_session' / 'tuvi_user' keys — NOT supabase SDK keys
  await page.evaluate(({ session, user }) => {
    localStorage.setItem('tuvi_session', JSON.stringify(session));
    localStorage.setItem('tuvi_user', JSON.stringify(user));
  }, { session, user: res.user });

  await page.reload();
  await page.waitForTimeout(1000);
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
  console.log(`✅ Auth OK — ${TEST_EMAIL}`);
});
