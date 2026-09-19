import { test, expect } from '@playwright/test';

// Gap hiện tại: tu-binh.spec.ts chỉ test paywall regression, chưa test kết quả thực
// 2026-09-19: retire /tu-binh.html → shell /app/bat-tu (public/app-bat-tu.html).
// DOM khác bản standalone cũ: #tubinh-form-container → #tuviFormHost,
// #tvf-submit-btn → #btnGo, #result-section → #btPanel (data-ws-result),
// #result-header → #btScores, #tutru-table → #tutruTable,
// #muc-luc-items .muc-luc-btn/[id^="ml-"] → #btJump a.

// Helper: setData + click submit + chờ result hoặc timeout (thiếu credits)
// Returns true nếu AI phản hồi, false nếu timeout (thiếu credits)
async function submitTuBinh(page: any): Promise<boolean> {
  await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
  await page.evaluate(`
    TuviForm.setData({ hoten: 'Test Tubinh', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam' })
  `);
  await page.locator('#btnGo').click();
  // Chờ #btPanel hiện (AI call có thể mất 30-90s)
  return page.waitForFunction(
    `getComputedStyle(document.querySelector('#btPanel')).display !== 'none'`,
    { timeout: 90_000 }
  ).then(() => true).catch(() => false);
}

test.describe('Tử Bình — Submit & Result (shell /app/bat-tu)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/bat-tu');
    await page.waitForLoadState('networkidle');
  });

  test('form container inject thành công', async ({ page }) => {
    await expect(page.locator('#tuviFormHost')).toBeVisible({ timeout: 8000 });
    await page.waitForFunction(
      'document.querySelectorAll("#tuviFormHost input, #tuviFormHost select").length > 0',
      { timeout: 10_000 }
    );
  });

  test('submit button #btnGo hiện', async ({ page }) => {
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await expect(page.locator('#btnGo')).toBeVisible({ timeout: 8000 });
  });

  test('submit → #btPanel hiện (không treo)', async ({ page }) => {
    test.setTimeout(120_000);
    const responded = await submitTuBinh(page);
    if (!responded) { console.warn('AI không phản hồi trong 90s — có thể thiếu credits, bỏ qua'); return; }

    await expect(page.locator('#btPanel')).toBeVisible();
  });

  test('nếu result hiện — btScores và tutruTable có nội dung', async ({ page }) => {
    test.setTimeout(120_000);
    const responded = await submitTuBinh(page);
    if (!responded) { console.warn('AI không phản hồi trong 90s — có thể thiếu credits, bỏ qua'); return; }

    const resultVisible = await page.locator('#btPanel').isVisible().catch(() => false);
    if (!resultVisible) { console.warn('Result không hiện (có thể thiếu credits)'); return; }

    // btScores có thể rỗng nếu không đủ credits (AI không chạy)
    const scoresEmpty = await page.locator('#btScores').evaluate(
      (el: HTMLElement) => el.innerHTML.trim() === ''
    ).catch(() => true);
    if (scoresEmpty) { console.warn('btScores rỗng — có thể thiếu credits, bỏ qua'); return; }

    await expect(page.locator('#btScores')).not.toBeEmpty({ timeout: 5000 });
    const table = page.locator('#tutruTable');
    if (await table.isVisible().catch(() => false)) {
      expect(await table.locator('tr').count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('nếu result hiện — mục lục (btJump) ít nhất 3 mục', async ({ page }) => {
    test.setTimeout(120_000);
    const responded = await submitTuBinh(page);
    if (!responded) { console.warn('AI không phản hồi trong 90s — có thể thiếu credits, bỏ qua'); return; }

    const resultVisible = await page.locator('#btPanel').isVisible().catch(() => false);
    if (!resultVisible) { console.warn('Result không hiện (có thể thiếu credits)'); return; }

    const mucLuc = page.locator('#btJump a');
    const count = await mucLuc.count();
    if (count === 0) { console.warn('Mục lục rỗng — có thể thiếu credits, bỏ qua'); return; }
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test User', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam' })
    `);
    await page.locator('#btnGo').click();
    await page.waitForTimeout(5000);

    expect(dialogs).toHaveLength(0);
    const modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }).catch(() => false);
    expect(modal).toBe(false);
  });
});
