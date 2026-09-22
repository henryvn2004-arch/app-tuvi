import { test, expect } from '@playwright/test';

test.describe('Tu Binh Regression paywall (shell /app/bat-tu)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/bat-tu');
    await page.waitForLoadState('networkidle');
  });

  test('page load OK', async ({ page }) => {
    // Bước 6: #birthPanel (chứa <h2>) ẩn mặc định — hội thoại trong rail (#chat)
    // là màn hình đầu thật sự nay. Vẫn giữ đúng ý bài kiểm cũ: có nội dung
    // chào/hỏi hiện ra ngay khi vào trang.
    await expect(page.locator('#chat .msg.a').first()).toBeVisible();
  });

  test('REGRESSION paywall KHONG auto-popup khi submit', async ({ page }) => {
    // Bước 6: #birthPanel ẩn mặc định — hiện lại để fillRequired()/findBtn()
    // không no-op (tránh bài kiểm xanh giả vì không tìm thấy field/nút nào).
    await page.evaluate(() => {
      const el = document.getElementById('birthPanel');
      if (el) el.style.display = 'block';
    });
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await fillRequired(page);
    const s = await findBtn(page);
    if (s) { await s.click(); await page.waitForTimeout(3000); }
    let modal = false;
    try { modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }); } catch { modal = false; }
    expect(dialogs).toHaveLength(0);
    expect(modal).toBe(false);
  });

  test('sau submit DOM thay doi khong co modal', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('birthPanel');
      if (el) el.style.display = 'block';
    });
    await fillRequired(page);
    const s = await findBtn(page);
    if (!s) { console.warn('No submit btn'); return; }
    const before = await page.locator('body *').count();
    await s.click();
    await page.waitForFunction((n: number) => document.querySelectorAll('body *').length > n + 5, before, { timeout: 20000 });
    const modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }).catch(() => false);
    expect(modal).toBe(false);
  });
});

// Điền ĐỦ các trường bắt buộc của form Tử Bình như người dùng thật:
// hoten (text) KHÔNG phải <select> nên fillVisibleSelects bỏ sót → analyze()
// bị chặn ở validation, DOM không render. Phải điền tay. `nam` (năm sinh) giờ
// là <select> (đồng bộ với Ngày/Tháng) nên fillVisibleSelects đã tự khớp.
async function fillRequired(page: any) {
  const hoten = page.locator('#hoten');
  if (await hoten.count() && await hoten.first().isVisible()) await hoten.first().fill('Nguyễn Văn Test');
  await fillVisibleSelects(page);
}

async function fillVisibleSelects(page: any) {
  const s = page.locator('select');
  for (let i = 0; i < await s.count(); i++) {
    if (!await s.nth(i).isVisible()) continue;
    const o = await s.nth(i).locator('option').allInnerTexts();
    if (o.length > 1) await s.nth(i).selectOption({ index: 1 });
  }
}
async function findBtn(page: any) {
  // Trang shell (#shell-sidebar/.sb, #shell-rail/.rail) đứng TRƯỚC #btnGo trong
  // DOM và không khớp mẫu loại-trừ nav bên dưới (không có chữ "nav" trong
  // class/id) — quét chung dễ vớ nhầm nút trong sidebar. Ưu tiên #btnGo (nút
  // submit thật của app-bat-tu.html) trước khi rơi về quét chung.
  const goBtn = page.locator('#btnGo');
  if (await goBtn.count() && await goBtn.first().isVisible()) return goBtn.first();

  const b = page.locator('button');
  for (let i = 0; i < await b.count(); i++) {
    if (!await b.nth(i).isVisible()) continue;
    if (await b.nth(i).evaluate((el: Element) => !!el.closest('nav,header,.nav,#nav,[class*="nav"],.sb,#shell-sidebar,.rail,#shell-rail'))) continue;
    return b.nth(i);
  }
  return null;
}
