/**
 * CÔNG THỨC QUAY cho từng công cụ.
 *
 * Mỗi công cụ một mục: mở trang nào, điền gì, bấm gì, đợi thấy gì.
 *
 * 🔑 VÌ SAO KHÔNG CÓ MỘT BỘ CHỌN DÙNG CHUNG: đã đo — chỉ 1/18 công cụ miễn phí
 * dùng component form dùng chung `TuviForm` (`public/tuvi-form.js`); 3 công cụ
 * là rút bài (không có form); 14 công cụ còn lại mỗi cái một form riêng nhỏ
 * dựng trong `public/tools-shared/<tool>.js`, id trường khác nhau. Cố ép một
 * bộ chọn chung cho tất cả sẽ ra một hàm đầy nhánh `if` mà vẫn sai lặng lẽ ở
 * vài trang. Khai tay từng cái thì mỗi cái đọc ra là hiểu, và hỏng thì hỏng
 * đúng một công cụ chứ không kéo cả bộ.
 *
 * ⚠️ DỮ LIỆU MẪU DÙNG CHUNG (`MAU`) — cố ý cùng một ngày sinh cho mọi clip, để
 * bộ video xếp cạnh nhau trông là một loạt chứ không phải mỗi cái một kiểu.
 */

/** Ngày sinh mẫu dùng xuyên suốt mọi clip. Không phải ngày sinh của người thật. */
export const MAU = {
  ngay: 15,
  thang: 6,
  nam: 1990,
  ten: 'Nguyễn Minh Anh',
  gioIdx: 2, // giờ Sửu
};

/** Cuộn mượt tới một phần tử rồi dừng — để người xem clip kịp nhìn. */
async function scrollTo(page, selector, pauseMs = 900) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(pauseMs);
}

/** Gõ từng ký tự cho ra cảm giác người thật đang nhập. */
async function typeSlow(page, selector, value, delay = 110) {
  const el = page.locator(selector).first();
  await el.click();
  await el.type(String(value), { delay });
  await page.waitForTimeout(220);
}

export const TOOL_RECIPES = {
  'than-so-hoc': {
    path: '/app/than-so-hoc',
    // Đường dẫn khi phục vụ thẳng thư mục `public/` (không có rewrite của Next).
    // Container phát triển không cho trình duyệt ra Internet nên đây là đường
    // quay duy nhất chạy được tại chỗ — xem chú thích trong record-tool-demo.mjs.
    localPath: '/app-than-so-hoc.html',
    label: 'Thần Số Học',
    settleMs: 3000,
    async run(page) {
      // Thẻ giới thiệu che form ở lượt đầu — đóng đi nếu có.
      const dismiss = page.locator('#introHost button, .intro-card button').first();
      if (await dismiss.count()) {
        await dismiss.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      await typeSlow(page, '#ngay', MAU.ngay);
      await typeSlow(page, '#thang', MAU.thang);
      await typeSlow(page, '#nam', MAU.nam);
      await typeSlow(page, '#ten', MAU.ten, 70);
      await page.waitForTimeout(700);

      await page.locator('#btnGo').click();

      // Kết quả hiện ra là mốc kết thúc phần "nhập liệu".
      await page.waitForSelector('#resPanel', { state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(1600);

      // Cuộn qua kết quả để clip có phần "kết quả trông thế nào".
      await scrollTo(page, '#numResults', 1400);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(1500);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(1800);
    },
  },
};
