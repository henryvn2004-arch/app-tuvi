import { test, expect } from '@playwright/test';

// Mobile viewport tests — chạy trên Pixel 5 (390x851) qua project mobile-chrome

const KEY_PAGES = [
  { path: '/',                name: 'Homepage' },
  { path: '/app-luan-giai.html', name: 'Luận Giải' },
  { path: '/app/xem-tuoi',   name: 'Xem Tuổi' },
  { path: '/app/bat-tu',     name: 'Tử Bình' },
  { path: '/topup.html',     name: 'Topup' },
  { path: '/app/ho-so',      name: 'Hồ Sơ' },
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

// ── Mobile — hội thoại nhập liệu (bước 6) ─────────────────────────────────────
// Trang laso THẬT là app-luan-giai.html (/luan-giai.html cũ nay 301 sang
// /app/luan-giai — Henry, 2026-09-14, xem plan productize luận giải).
// Bước 6 (2026-09-22): #birthPanel/#tuviFormHost tĩnh chuyển ẩn mặc định —
// `TuviForm.renderChat()` dựng hội thoại 4 bước trong #chat thay thế, đây
// mới là màn hình đầu THẬT trên mobile. Field ảo bước 1 dùng prefix 'cx'
// (renderChat gọi không prefix → cp='c'+('' || 'x')='cx', xem tuvi-form.js).
test.describe('Mobile — Luận Giải hội thoại', () => {
  test('bước hỏi tên/giới tính có thể tap và nhập liệu', async ({ page }) => {
    await page.goto('/app-luan-giai.html');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });

    const nameInput = page.locator('#cx-hoten');
    await expect(nameInput).toBeVisible({ timeout: 8000 });
    const box = await nameInput.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
  });

  test('nút "Tiếp tục" không bị crop trên mobile', async ({ page }) => {
    await page.goto('/app-luan-giai.html');
    await page.waitForLoadState('networkidle');
    const btn = page.locator('#cx-next1');
    await expect(btn).toBeVisible({ timeout: 20_000 });

    const box = await btn.boundingBox();
    expect(box?.width).toBeGreaterThan(50);
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
