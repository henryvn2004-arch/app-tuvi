// Harness cho agent `ux-tester` (.claude/agents/ux-tester.md): mở prod như MỘT
// người dùng thật, gom lỗi console/JS/HTTP. Ảnh chụp để ở scripts/out/ux/ (gitignore).
//   import { open, BASE, OUT } from './harness.mjs'
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

async function loadChromium() {
  try {
    return (await import('@playwright/test')).chromium;
  } catch {
    // Container phiên không có node_modules → dùng bản playwright cài global.
    const root = execSync('npm root -g').toString().trim();
    return (await import(`${root}/playwright/index.mjs`)).chromium;
  }
}

export const BASE = process.env.UX_BASE || 'https://www.tuviminhbao.com';
export const OUT = new URL('../out/ux/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

export async function open({ mobile = true } = {}) {
  const chromium = await loadChromium();
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const ctx = await browser.newContext({
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    ...(mobile
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 2,
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        }
      : { viewport: { width: 1440, height: 900 } }),
  });
  // navigator.webdriver=true làm track.js và tour onboarding tự no-op ⇒ xanh oan.
  await ctx.addInitScript(() =>
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
  );
  // Không làm bẩn số đo prod.
  await ctx.route(/google-analytics|googletagmanager|facebook\.net|clarity\.ms|doubleclick/, (r) =>
    r.abort()
  );
  const page = await ctx.newPage();
  const log = { console: [], pageErrors: [], failed: [] };
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      log.console.push(`[${m.type()}] ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => log.pageErrors.push(String(e).slice(0, 400)));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('tuviminhbao'))
      log.failed.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return { browser, ctx, page, log };
}
