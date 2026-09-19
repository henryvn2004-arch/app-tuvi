import { test, expect } from '@playwright/test';

// Mobile viewport tests — chạy trên Pixel 5 (390x851) qua project mobile-chrome

const KEY_PAGES = [
  { path: '/',                name: 'Homepage' },
  { path: '/app-luan-giai.html', name: 'Luận Giải' },
  { path: '/app/xem-tuoi',   name: 'Xem Tuổi' },
  { path: '/app/bat-tu',     name: 'Tử Bình' },
  { path: '/phong-thuy.html',name: 'Phong Thuỷ' },
  { path: '/topup.html',     name: 'Topup' },
  { path: '/profile.html',   name: 'Profile' },
];

for (const { path, name } of KEY_PAGES) {
  test.describe(`Mobile — ${name} (${path})`, () => {
    test('page load không overflow ngang', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const overflow = scrollWidth - clientWidth;

      // Cho phép sai lệch tối đa 5px
      expect(overflow).toBeLessThanOrEqual(5);
    });

    test('nav/header visible', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const nav = page.locator('.topnav, nav, header').first();
      await expect(nav).toBeVisible({ timeout: 8000 });
    });

    test('không có JS errors nghiêm trọng', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const critical = errors.filter(e =>
        !e.includes('favicon') && !e.includes('Sentry') &&
        !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
      );
      expect(critical).toHaveLength(0);
    });
  });
}

// ── Mobile — hamburger menu ───────────────────────────────────────────────────
test.describe('Mobile — hamburger menu', () => {
  test('hamburger hiện và menu mở được', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburger = page.locator('.nav-hamburger, [class*="hamburger"], button[aria-label*="menu"]').first();
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(400);
      const openMenu = page.locator('.nav-links.open, .nav-links[style*="flex"], .mobile-menu').first();
      await expect(openMenu).toBeVisible({ timeout: 3000 });
    }
  });
});

// ── Mobile — form usability ───────────────────────────────────────────────────
// Trang laso THẬT là app-luan-giai.html (/luan-giai.html cũ nay 301 sang
// /app/luan-giai — Henry, 2026-09-14, xem plan productize luận giải). Form
// dùng chung TuviForm nhưng host id đổi: #tuvi-form-container (cũ) →
// #tuviFormHost (mới, xem app-luan-giai.html).
test.describe('Mobile — Luận Giải form', () => {
  test('form inputs có thể tap và nhập liệu', async ({ page }) => {
    await page.goto('/app-luan-giai.html');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });

    // Form phải đủ rộng để nhìn thấy trên mobile
    const container = page.locator('#tuviFormHost');
    await expect(container).toBeVisible({ timeout: 8000 });

    const box = await container.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
  });

  test('submit button không bị crop trên mobile', async ({ page }) => {
    await page.goto('/app-luan-giai.html');
    await page.waitForLoadState('networkidle');
    // 🪤 app-luan-giai.html gọi `TuviForm.render('tuviFormHost', {mode:'compact'})`
    // — mode:'compact' KHÔNG dựng `.btn-submit`/`#tvf-submit-btn` (khối đó chỉ
    // tồn tại ở nhánh mode:'full' của tuvi-form.js, xem `buildFull`/render()).
    // Compact "tái dùng .frow/.fg/.btn-go sẵn có của trang gọi" đúng như comment
    // ngay trong tuvi-form.js — nút submit THẬT của trang này là `#btnGo`
    // (`.btn-go`, `onclick="doLuan()"`), đứng ngoài #tuviFormHost, cùng nút mà
    // bài kiểm "grid 12 cung" bên dưới gọi gián tiếp qua `doLuan()`. Selector
    // cũ `.btn-submit, #tvf-submit-btn` không timeout vì tải chậm — nó đỏ vì
    // phần tử KHÔNG BAO GIỜ tồn tại trên trang này, hai lượt sửa timeout trước
    // đó đều sai gốc.
    const btn = page.locator('#btnGo, .btn-go').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });

    const box = await btn.boundingBox();
    expect(box?.width).toBeGreaterThan(80);
    expect(box?.height).toBeGreaterThan(30);
  });
});

// ── Mobile — lá số grid ───────────────────────────────────────────────────────
test.describe('Mobile — Lá Số grid', () => {
  test('grid 12 cung không overflow màn hình', async ({ page }) => {
    await page.goto('/app-luan-giai.html');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      const w = window as unknown as { TuviForm?: unknown; doLuan?: unknown };
      return !!w.TuviForm && typeof w.doLuan === 'function';
    }, { timeout: 10_000 });

    // Gọi thẳng `doLuan()` (cùng cách tests/hard-paywall.spec.ts đã dùng ổn
    // định) thay vì bấm nút submit — bấm nút cần nó "actionable" (không bị
    // phần tử khác che), mà app-luan-giai.html có thêm FAB/rail nổi trên
    // layout shell mà trang cũ không có, dễ khiến `.click()` timeout dù nút
    // vẫn hiển thị đúng. Kết quả cuối giống hệt: cùng hàm `doLuan()` chạy.
    await page.evaluate(() => {
      const w = window as unknown as {
        TuviForm: { setData(d: Record<string, unknown>): void };
        doLuan(): void;
      };
      w.TuviForm.setData({ hoten: 'Mobile Test', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 });
      w.doLuan();
    });
    // #lgPanel bật display:block + #miniChart (grid 12 cung) đổ chữ NGAY sau
    // khi engine tính xong — thuần client, không đợi LLM/network (xem doLuan
    // trong app-luan-giai.html), khác `#result-section.active` của trang cũ.
    await page.waitForSelector('#lgPanel', { state: 'visible', timeout: 20_000 });

    // Grid có min-width nội tại cho trải nghiệm cuộn ngang trên mobile.
    // Verify khung BAO NGOÀI (miniChart) nằm trong viewport, không phải lưới bên trong.
    const wrap = page.locator('#miniChart');
    const wrapBox = await wrap.boundingBox();
    const viewportWidth = page.viewportSize()?.width ?? 390;
    if (wrapBox) {
      expect(wrapBox.x + wrapBox.width).toBeLessThanOrEqual(viewportWidth + 5);
    }
  });
});

// ── Tour onboarding: nút "Bỏ qua"/"Tiếp" phải LUÔN nằm trong màn ────────────
// Henry mở prod bằng iPhone và bị KẸT: thẻ hướng dẫn nằm đè lên đáy màn hình,
// hai nút nằm dưới mép, kéo không tới ⇒ không có đường nào thoát khỏi tour.
// Căn nguyên là công thức đặt vị trí trong app-home.html: findTarget() chỉ đòi
// điểm neo CÓ TRONG LAYOUT chứ không đòi nó trong tầm nhìn, và sau khi chọn
// đặt-trên hay đặt-dưới thì KHÔNG có bước kẹp nào. Neo nằm ngoài màn ⇒ popup
// văng theo. Đo được lúc đó: neo ở 1072px trên màn 844 → nút nằm dưới đáy 204px.
test.describe('Mobile — tour onboarding', () => {
  // 🪤 app-home.html có `if(navigator.webdriver) return;` — tour tự tắt khi bị
  // lái tự động. Không giả cờ này thì bài kiểm xanh oan vì chẳng đo gì cả.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  });

  test('điểm neo NGOÀI MÀN vẫn không đẩy nút ra khỏi màn', async ({ page }) => {
    await page.goto('/app');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) { /* Safari riêng tư */ }
    });
    await page.reload();
    await expect(page.locator('.tour-pop')).toBeVisible({ timeout: 45000 });

    const m = await page.evaluate(async () => {
      // Dời điểm neo xuống dưới mép màn rồi bắn 'resize' → chạy lại đúng place()
      // Điểm neo bước 1 của tour đổi sang nút Home nổi giữa thanh tab (từ
      // 2026-09: Khởi Hành dời sang tab Tài khoản, không còn #khoiHanhCard).
      const card = document.querySelector('.tab-home-btn') as HTMLElement | null;
      if (card) {
        const cur = card.getBoundingClientRect().top;
        const mt = parseFloat(getComputedStyle(card).marginTop) || 0;
        card.style.marginTop = mt + (window.innerHeight + 260 - cur) + 'px';
      }
      window.dispatchEvent(new Event('resize'));
      await new Promise((r) => setTimeout(r, 500));
      const pop = document.querySelector('.tour-pop') as HTMLElement | null;
      const next = document.getElementById('tourNext');
      const skip = document.getElementById('tourSkip');
      if (!pop || !next || !skip) return null;
      return {
        popTop: pop.getBoundingClientRect().top,
        popBottom: pop.getBoundingClientRect().bottom,
        nextBottom: next.getBoundingClientRect().bottom,
        skipBottom: skip.getBoundingClientRect().bottom,
        vh: window.innerHeight,
      };
    });
    expect(m, 'tour phải còn mở để đo được').not.toBeNull();
    expect(m!.popTop).toBeGreaterThanOrEqual(0);
    expect(m!.nextBottom).toBeLessThanOrEqual(m!.vh);
    expect(m!.skipBottom).toBeLessThanOrEqual(m!.vh);
    await expect(page.locator('#tourNext')).toBeVisible();
  });

  test('Esc luôn đóng được tour', async ({ page }) => {
    await page.goto('/app');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) { /* Safari riêng tư */ }
    });
    await page.reload();
    await expect(page.locator('.tour-pop')).toBeVisible({ timeout: 45000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('.tour-pop')).toHaveCount(0);
  });
});
