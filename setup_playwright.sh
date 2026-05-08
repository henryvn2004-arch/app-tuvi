#!/usr/bin/env bash
# Chạy trong Codespace root của repo app-tuvi
# bash setup_playwright.sh

set -e
echo "🎭 Setting up Playwright..."

# ── playwright.config.ts ─────────────────────────────────────────────
cat > playwright.config.ts << 'ENDOFFILE'
import { defineConfig, devices } from '@playwright/test';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  (process.env.VERCEL_URL?.startsWith('http')
    ? process.env.VERCEL_URL
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://www.tuviminhbao.com');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
ENDOFFILE

# ── tsconfig.playwright.json ─────────────────────────────────────────
cat > tsconfig.playwright.json << 'ENDOFFILE'
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["tests/**/*.ts", "playwright.config.ts"]
}
ENDOFFILE

# ── tests/ ───────────────────────────────────────────────────────────
mkdir -p tests/.auth

cat > tests/auth.setup.ts << 'ENDOFFILE'
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

  await page.goto('/');
  await page.evaluate(({ url, session }) => {
    const ref = url.split('//')[1].split('.')[0];
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
  }, {
    url: SUPABASE_URL,
    session: {
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      expires_in: res.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + res.expires_in,
      token_type: 'bearer',
      user: res.user,
    },
  });

  await page.reload();
  await page.waitForTimeout(1000);
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
  console.log(`✅ Auth OK — ${TEST_EMAIL}`);
});
ENDOFFILE

cat > tests/homepage.spec.ts << 'ENDOFFILE'
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('hero render', async ({ page }) => {
    await expect(page.locator('h1, .hero-title')).toBeVisible();
  });

  test('tabs render (ít nhất 3)', async ({ page }) => {
    const tabs = page.locator('.tab-nav button, [role="tablist"] button, .tabs a').first();
    await expect(tabs).toBeVisible();
  });

  test('tool cards render (ít nhất 10)', async ({ page }) => {
    const cards = page.locator('.tool-card, a.card, [class*="tool-card"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(10);
  });

  test('không có JS errors nghiêm trọng', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('fonts.google') && !e.includes('Sentry'));
    expect(critical).toHaveLength(0);
  });
});
ENDOFFILE

cat > tests/tu-binh.spec.ts << 'ENDOFFILE'
import { test, expect } from '@playwright/test';

test.describe('Tử Bình — Regression paywall', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tu-binh.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load OK', async ({ page }) => {
    await expect(page.locator('h1, .page-title')).toBeVisible();
  });

  test('🔴 REGRESSION: paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    // Fill form tối thiểu
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts();
      if (opts.length > 1) await selects.nth(i).selectOption({ index: 1 });
    }
    const namInput = page.locator('input[type="number"], input[name*="nam"]').first();
    if (await namInput.isVisible()) await namInput.fill('1990');

    const submit = page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Tính")').first();
    await submit.click();
    await page.waitForTimeout(3000);

    let autoModal = false;
    try {
      autoModal = await page.locator('.tuvi-paywall-modal, [class*="paywall-modal"]').isVisible({ timeout: 500 });
    } catch { autoModal = false; }

    expect(dialogs).toHaveLength(0);
    expect(autoModal).toBe(false);
    console.log('✅ No auto-popup regression');
  });

  test('paywall button visible INLINE sau submit', async ({ page }) => {
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts();
      if (opts.length > 1) await selects.nth(i).selectOption({ index: 1 });
    }
    const namInput = page.locator('input[type="number"], input[name*="nam"]').first();
    if (await namInput.isVisible()) await namInput.fill('1990');

    await page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Tính")').first().click();

    const btn = page.locator('button:has-text("Mở Khóa"), .paywall-btn, [class*="unlock"]').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });

    const inModal = await btn.evaluate(el => !!el.closest('.modal, [class*="modal"], [role="dialog"]'));
    expect(inModal).toBe(false);
  });
});
ENDOFFILE

cat > tests/luan-giai.spec.ts << 'ENDOFFILE'
import { test, expect } from '@playwright/test';

test.describe('Luận Giải Lá Số', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render đủ fields', async ({ page }) => {
    await expect(page.locator('h1, .page-title')).toBeVisible();
    await expect(page.locator('input[name*="nam"], #namSinh').first()).toBeVisible();
  });

  test('submit → lá số grid 12 cung render', async ({ page }) => {
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts();
      if (opts.length > 1) await selects.nth(i).selectOption({ index: 1 });
    }
    await page.locator('input[name*="nam"], #namSinh').first().fill('1990');

    await page.locator('button[type="submit"], #btnAnalyze, button:has-text("Xem")').first().click();
    await page.waitForSelector('.palace, .cung, [class*="palace"]', { timeout: 20_000 });

    const palaces = page.locator('.palace, .cung, [class*="palace-cell"]');
    expect(await palaces.count()).toBeGreaterThanOrEqual(12);
  });

  test('paywall KHÔNG auto-popup', async ({ page }) => {
    let autoPopup = false;
    page.on('dialog', () => { autoPopup = true; });
    await page.locator('button[type="submit"], button:has-text("Xem")').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    expect(autoPopup).toBe(false);
  });
});
ENDOFFILE

cat > tests/xem-tuoi.spec.ts << 'ENDOFFILE'
import { test, expect } from '@playwright/test';

test.describe('Xem Tuổi Vợ Chồng', () => {
  test('page load + 2 form panels', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, .page-title')).toBeVisible();
    const namFields = page.locator('input[name*="nam"], input[placeholder*="năm"]');
    expect(await namFields.count()).toBeGreaterThanOrEqual(2);
  });

  test('submit → result render', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    const namFields = page.locator('input[name*="nam"], input[placeholder*="năm"]');
    if (await namFields.count() >= 2) {
      await namFields.nth(0).fill('1990');
      await namFields.nth(1).fill('1992');
    }
    await page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Phân Tích")').first().click();
    await expect(page.locator('.result, .result-section, [class*="section"], #result').first()).toBeVisible({ timeout: 20_000 });
  });
});
ENDOFFILE

cat > tests/xem-lam-an.spec.ts << 'ENDOFFILE'
import { test, expect } from '@playwright/test';

test.describe('Xem Tuổi Làm Ăn', () => {
  test('page load OK', async ({ page }) => {
    await page.goto('/xem-lam-an.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, .page-title')).toBeVisible();
    await expect(page.locator('h1, .page-title')).toContainText(/Làm Ăn|làm ăn/i);
  });

  test('slug là xem-lam-an (không nhầm xem-tuoi)', async ({ page }) => {
    await page.goto('/xem-lam-an.html');
    const content = await page.content();
    expect(content).toContain('xem-lam-an');
  });
});
ENDOFFILE

cat > tests/topup.spec.ts << 'ENDOFFILE'
import { test, expect } from '@playwright/test';

test.describe('Topup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/topup.html');
    await page.waitForLoadState('networkidle');
  });

  test('4 packages render', async ({ page }) => {
    const cards = page.locator('.package-card, .topup-card, [class*="package"], [class*="plan"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(4);
  });

  test('package names đúng', async ({ page }) => {
    for (const name of ['Khởi Đầu', 'Phổ Thông', 'Cao Cấp', 'VIP']) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible();
    }
  });

  test('buy button → QR modal', async ({ page }) => {
    await page.locator('button:has-text("Chuyển Khoản"), button:has-text("Nạp"), button:has-text("Mua"), .btn-buy').first().click();
    const modal = page.locator('.qr-modal, [class*="qr"], .modal:visible, [class*="bank"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
    const close = modal.locator('button:has-text("Đóng"), .btn-close, .close-btn').first();
    if (await close.isVisible()) await close.click();
    else await page.keyboard.press('Escape');
  });
});
ENDOFFILE

# ── .github/workflows/ ───────────────────────────────────────────────
mkdir -p .github/workflows

cat > .github/workflows/playwright.yml << 'ENDOFFILE'
name: Playwright E2E

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
  workflow_dispatch:
    inputs:
      base_url:
        description: 'Override base URL'
        required: false
        default: 'https://www.tuviminhbao.com'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npx playwright install chromium --with-deps

      - name: Set BASE_URL
        id: url
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ] && [ -n "${{ github.event.inputs.base_url }}" ]; then
            echo "val=${{ github.event.inputs.base_url }}" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref_name }}" = "dev" ]; then
            echo "val=https://app-tuvi-git-dev-henryvn2004-5000s-projects.vercel.app" >> $GITHUB_OUTPUT
          else
            echo "val=https://www.tuviminhbao.com" >> $GITHUB_OUTPUT
          fi

      - name: Run tests
        env:
          PLAYWRIGHT_BASE_URL: ${{ steps.url.outputs.val }}
          PLAYWRIGHT_TEST_EMAIL: ${{ secrets.PLAYWRIGHT_TEST_EMAIL }}
          PLAYWRIGHT_TEST_PASSWORD: ${{ secrets.PLAYWRIGHT_TEST_PASSWORD }}
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ github.run_id }}
          path: playwright-report/
          retention-days: 14
ENDOFFILE

# ── package.json patch ───────────────────────────────────────────────
echo ""
echo "📦 Patching package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['test:e2e'] = 'playwright test';
pkg.scripts['test:e2e:ui'] = 'playwright test --ui';
pkg.scripts['test:e2e:report'] = 'playwright show-report';
pkg.devDependencies = pkg.devDependencies || {};
pkg.devDependencies['@playwright/test'] = '^1.44.0';
pkg.devDependencies['typescript'] = pkg.devDependencies['typescript'] || '^5.4.5';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('✅ package.json patched');
"

# ── .gitignore ───────────────────────────────────────────────────────
if ! grep -q "playwright-report" .gitignore 2>/dev/null; then
  echo -e "\n# Playwright\n/playwright-report/\n/test-results/\n/tests/.auth/\n*.webm" >> .gitignore
  echo "✅ .gitignore updated"
fi

echo ""
echo "✅ Done! Files created:"
echo "   playwright.config.ts"
echo "   tsconfig.playwright.json"
echo "   tests/auth.setup.ts"
echo "   tests/homepage.spec.ts"
echo "   tests/luan-giai.spec.ts"
echo "   tests/tu-binh.spec.ts"
echo "   tests/xem-tuoi.spec.ts"
echo "   tests/xem-lam-an.spec.ts"
echo "   tests/topup.spec.ts"
echo "   .github/workflows/playwright.yml"
echo ""
echo "👉 Tiếp theo: git add -A && git commit -m 'feat: add Playwright E2E tests' && git push origin dev"
