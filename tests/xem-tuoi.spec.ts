import { test, expect } from '@playwright/test';

// 2026-09-19: retire /xem-tuoi.html → shell /app/xem-tuoi (public/app-xem-tuoi.html,
// dùng chung file với /app/xem-lam-an và /app/tuong-hop qua MODE_KEY). DOM khác
// bản standalone cũ: .hero-tuoi/#tuvi-form-a/#tuvi-form-b/#btn-analyze/#result-section
// → #birthPanel/#a-fields/#b-fields/#btnGo/#xtPanel (data-ws-result).
// 2026-09-23 (chat-first bước 10): SHELL_CHAT_INTAKE ẩn #birthPanel mặc định
// (hội thoại trong rail thay thế làm màn nhập liệu đầu) — form thật vẫn
// NGUYÊN VẸN phía sau, dùng làm đường "Sửa" sau khi có kết quả. Các bài kiểm
// dưới đây đo ĐÚNG/SAI của bản thân việc tính toán/hiện kết quả, không phải
// đường nhập liệu — hiện form thật lên để tái dùng logic cũ, không phải lái
// qua hội thoại mới (cùng mẫu `tu-binh-submit.spec.ts` đã dùng từ bước 6; hội
// thoại thật đã verify riêng bằng tay, xem docs/nhat-ky/2026-09.md bước 10).

test.describe('Xem Tuoi Vo Chong (shell /app/xem-tuoi)', () => {
  test('page load + TuviForm render 2 panels', async ({ page }) => {
    await page.goto('/app/xem-tuoi');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.getElementById('birthPanel');
      if (el) el.style.display = 'block';
    });
    await expect(page.locator('#birthPanel')).toBeVisible();
    await expect(page.locator('#a-fields')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#b-fields')).toBeVisible({ timeout: 5_000 });
  });

  test('submit #btnGo -> #xtPanel visible', async ({ page }) => {
    await page.goto('/app/xem-tuoi');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Nguyen Van A', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Tran Thi B',   ngay: 10, thang: 3, nam: 1992, gioHour: 3, gioitinh: 'nu'  }, 'b');
      document.getElementById('birthPanel').style.display = 'block';
    `);

    await page.locator('#btnGo').click();
    await page.waitForFunction(
      `getComputedStyle(document.querySelector('#xtPanel')).display !== 'none'`,
      { timeout: 25_000 }
    );
  });
});
