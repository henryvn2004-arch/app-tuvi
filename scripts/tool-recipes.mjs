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

/**
 * Gõ từng ký tự cho ra cảm giác người thật đang nhập.
 *
 * 🪤 XOÁ Ô TRƯỚC KHI GÕ, đừng bỏ bước này: vài trang điền sẵn ngày hôm nay
 * (`app-hoang-dao.html` dòng cuối làm đúng thế). Gõ thêm vào ô đã có sẵn "15"
 * ra "1515", `compute()` trả `ok:false`, khối kết quả không bao giờ hiện — và
 * lượt quay chết ở `waitForSelector` sau 30 giây mà không nói được vì sao.
 */
async function typeSlow(page, selector, value, delay = 110) {
  const el = page.locator(selector).first();
  await el.click();
  await el.fill('');
  await el.type(String(value), { delay });
  await page.waitForTimeout(220);
}

/**
 * Chọn giá trị cho `<select>`.
 *
 * ⚠️ `ngay`/`thang` của `TuviForm` là `<select>` chứ KHÔNG phải `<input>` —
 * `fill()` vào đó đỏ ngay. Bài học đã ghi trong CLAUDE.md, tách hàm riêng để
 * không ai vấp lại.
 */
async function pick(page, selector, value, pauseMs = 320) {
  await page.locator(selector).first().selectOption(String(value));
  await page.waitForTimeout(pauseMs);
}

/** Đóng thẻ giới thiệu che form ở lượt đầu (trang shell nào cũng có thể có). */
async function dismissIntro(page) {
  const btn = page.locator('#introHost button, .intro-card button').first();
  if (await btn.count()) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

/**
 * Đợi kết quả rồi cuộn chậm qua nó — phần "kết quả trông thế nào" của clip.
 *
 * 🔑 NHỊP Ở ĐÂY QUYẾT ĐỊNH ĐỘ DÀI BẢN QUAY, và bản quay phải DÀI HƠN lời đọc.
 * Đo thật lượt đầu: `kim-lau` quay ra 12,1s trong khi lời đọc 25,9s ⇒ khâu
 * dựng buộc phải tua lại cùng một đoạn hình nhiều lần, clip trông như ảnh
 * tĩnh ở nửa sau. Các mốc dừng dưới đây cộng lại ~18–22s cho một công cụ form
 * đơn giản — vừa đủ phủ một clip 26–30s mà không phải quay lại.
 */
async function showResult(page, panel, anchors = [], holdMs = 2000) {
  await page.waitForSelector(panel, { state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(holdMs);
  for (const a of anchors) {
    if (await page.locator(a).count()) await scrollTo(page, a, 1600);
  }
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1600);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1800);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1800);
  // Quay lại đầu khối kết quả: khung hình cuối của bản quay nên là chỗ đọc
  // được, vì cảnh cuối cùng của clip luôn bị KẸP về đúng đoạn đuôi này.
  await page.mouse.wheel(0, -1500);
  await page.waitForTimeout(2000);
}

/** Nhập ngày/tháng/năm cho form dựng TAY (input thường, không phải TuviForm). */
async function fillDmy(page, { d = MAU.ngay, m = MAU.thang, y = MAU.nam } = {}) {
  await typeSlow(page, '#ngay', d);
  await typeSlow(page, '#thang', m);
  await typeSlow(page, '#nam', y);
}

/** Nhập một người vào `TuviForm` (prefix rỗng = form một người). */
async function fillTuviForm(page, prefix, { ten, d, m, y } = {}) {
  const p = prefix ? prefix + '-' : '';
  await pick(page, `#${p}ngay`, d ?? MAU.ngay);
  await pick(page, `#${p}thang`, m ?? MAU.thang);
  await typeSlow(page, `#${p}nam`, y ?? MAU.nam);
  if (ten !== null) await typeSlow(page, `#${p}hoten`, ten ?? MAU.ten, 70);
}

/**
 * ⚠️ BA CÔNG CỤ KHÔNG QUAY ĐƯỢC Ở BẢN PHỤC VỤ TĨNH `public/` — khai `localPath`
 * là `null` để hỏng TO ngay thay vì quay ra một clip sai:
 *
 *  · `ky-mon`      cần `/api/qimen`  (định cục theo tiết khí, chạy ở server)
 *  · `ban-do-sao`  cần `/api/natal`  (vị trí hành tinh)
 *  · `tuong-hop`   nhận diện chế độ bằng ĐƯỜNG DẪN (`indexOf('tuong-hop')`),
 *                  mở `/app-xem-tuoi.html` sẽ rơi vào chế độ *xem tuổi vợ
 *                  chồng* — bản TRẢ PHÍ, dựng tường thanh toán giữa clip.
 *
 * Ba cái này quay từ prod (Actions làm đúng thế) hoặc từ `next dev`.
 */
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

  // ── Mệnh lý: form một ô, kết quả tra bảng ───────────────────────────────
  'kim-lau': {
    path: '/app/kim-lau',
    localPath: '/app-kim-lau.html',
    label: 'Kim Lâu & Tam Tai',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#birthYear', MAU.nam);
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      await showResult(page, '#resPanel', ['#currentBox']);
    },
  },

  'nap-am': {
    path: '/app/nap-am',
    localPath: '/app-nap-am.html',
    label: 'Nạp Âm Ngũ Hành',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#year', MAU.nam);
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      await showResult(page, '#resPanel', ['#nap-am-result', '#nap-am-use']);
    },
  },

  'bat-trach': {
    path: '/app/bat-trach',
    localPath: '/app-bat-trach.html',
    label: 'Hướng Bát Trạch',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#year', MAU.nam);
      await pick(page, '#gender', 'nam');
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      // La bàn là thứ đáng nhìn nhất của tool này — dừng lâu hơn ở đó.
      await showResult(page, '#resPanel', ['#compassWrap', '#resInfo'], 2000);
    },
  },

  'ngu-hanh-ten': {
    path: '/app/ngu-hanh-ten',
    localPath: '/app-ngu-hanh-ten.html',
    label: 'Ngũ Hành Tên',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#tenInput', MAU.ten, 90);
      await pick(page, '#menhInput', 'Thổ');
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      await showResult(page, '#resPanel', ['#scoreResult', '#sylCards', '#nhBalance']);
    },
  },

  'tuong-hop': {
    path: '/app/tuong-hop',
    // Xem chú thích đầu bảng: chế độ nhận theo ĐƯỜNG DẪN, bản tĩnh sẽ rơi vào
    // tool trả phí và dựng tường thanh toán giữa clip.
    localPath: null,
    label: 'Tương Hợp Tuổi',
    settleMs: 3500,
    async run(page) {
      await dismissIntro(page);
      await fillTuviForm(page, 'a', { ten: 'Minh Anh' });
      await fillTuviForm(page, 'b', { ten: 'Quốc Bảo', d: 9, m: 11, y: 1988 });
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      await showResult(page, '#xtPanel', ['#xtVerdict', '#xtBody'], 2000);
    },
  },

  // ── Lịch số: hỏi ngày/tháng, trả bảng ngày giờ ──────────────────────────
  'hoang-dao': {
    path: '/app/hoang-dao',
    localPath: '/app-hoang-dao.html',
    label: 'Giờ Hoàng Đạo',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await fillDmy(page);
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      await showResult(page, '#resPanel', ['#ngayInfo', '#hdList']);
    },
  },

  'ngay-tot': {
    path: '/app/ngay-tot',
    localPath: '/app-ngay-tot.html',
    label: 'Ngày Tốt Trong Tháng',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#thang', MAU.thang);
      await typeSlow(page, '#nam', new Date().getFullYear());
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      // Lịch tháng là hình đắt nhất ở đây — giữ lâu cho người xem quét mắt qua.
      await showResult(page, '#resPanel', ['#calBody'], 2200);
    },
  },

  'luc-nham': {
    path: '/app/luc-nham',
    localPath: '/app-luc-nham.html',
    label: 'Lục Nhâm Giản',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await fillDmy(page);
      await pick(page, '#gio', '5');
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      await showResult(page, '#resPanel', ['#thanWheel', '#activeBox'], 2000);
    },
  },

  // ── Huyền học: gieo quẻ ─────────────────────────────────────────────────
  'kinh-dich': {
    path: '/app/kinh-dich',
    localPath: '/app-kinh-dich.html',
    label: 'Kinh Dịch 64 Quẻ',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#cauHoi', 'Việc này có nên làm không?', 60);
      await page.waitForTimeout(600);
      // Gieo đủ SÁU hào — mỗi lượt tung có hoạt ảnh đồng xu ~1,2s rồi mới mở
      // nút lại. Bấm dồn là mất hào, và `#resPanel` sẽ không bao giờ hiện.
      for (let i = 0; i < 6; i++) {
        await page.locator('#tossBtn').click();
        await page.waitForTimeout(1900);
      }
      await showResult(page, '#resPanel', ['#queGrid', '#queDoc'], 2000);
    },
  },

  'mai-hoa': {
    path: '/app/mai-hoa',
    localPath: '/app-mai-hoa.html',
    label: 'Mai Hoa Dịch Số',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#cauHoi', 'Chuyện đang phân vân nên đi hướng nào?', 55);
      // Gieo bằng một con số — nhìn rõ hơn hẳn nhánh "theo thời điểm này",
      // vốn không có gì để quay ngoài một cú bấm.
      await page.locator('#modeSo').click();
      await page.waitForTimeout(500);
      await typeSlow(page, '#soInput', 27);
      await page.waitForTimeout(600);
      await page.locator('#goBtn').click();
      await showResult(page, '#resPanel', ['#mhCard', '#mhHaoTu']);
    },
  },

  'ky-mon': {
    path: '/app/ky-mon',
    localPath: null, // cần /api/qimen
    label: 'Kỳ Môn Độn Giáp',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#cauHoi', 'Chiều nay đi gặp đối tác nên đi hướng nào?', 45);
      await page.waitForTimeout(700);
      // `#tInput` là datetime-local đã điền sẵn thời điểm hiện tại — để nguyên.
      await page.locator('#goBtn').click();
      await showResult(page, '#resPanel', ['#kmBan', '#kmChiTiet'], 2200);
    },
  },

  // ── Rút bài: không có form ngày sinh, chạy thuần ở máy người xem ────────
  tarot: {
    path: '/app/tarot',
    localPath: '/app-tarot.html',
    label: 'Tarot 78 Lá',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#question', 'Chuyện tình cảm sắp tới thế nào?', 55);
      await page.waitForTimeout(700);
      await page.locator('#drawBtn').click();
      await showResult(page, '#result-section', ['#spreadArea', '#readingResult'], 2400);
    },
  },

  oracle: {
    path: '/app/oracle',
    localPath: '/app-oracle.html',
    label: 'Oracle Phương Đông',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#question', 'Điều gì đang chờ tôi phía trước?', 55);
      await page.waitForTimeout(700);
      await page.locator('#drawBtn').click();
      await showResult(page, '#result-section', ['#spreadArea', '#readingResult'], 2400);
    },
  },

  'boi-bai-tay': {
    path: '/app/boi-bai-tay',
    localPath: '/app-boi-bai-tay.html',
    label: 'Bói Bài Tây',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#question', 'Tháng này chuyện tiền bạc ra sao?', 55);
      await page.waitForTimeout(700);
      await page.locator('#drawBtn').click();
      await showResult(page, '#result-section', ['#spreadArea', '#readingResult'], 2400);
    },
  },

  // ── Lá số & bản đồ sao ──────────────────────────────────────────────────
  'xem-tuoi-sinh-con': {
    path: '/app/sinh-con',
    localPath: '/app-sinh-con.html',
    label: 'Xem Tuổi Sinh Con',
    settleMs: 3000,
    async run(page) {
      await dismissIntro(page);
      await typeSlow(page, '#inpNamBo', 1990);
      await typeSlow(page, '#inpNamMe', 1993);
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      await showResult(page, '#resPanel', ['#topRecommend', '#ccRow'], 2000);
    },
  },

  'ban-do-sao': {
    path: '/app/ban-do-sao',
    localPath: null, // cần /api/natal
    label: 'Bản Đồ Sao Lúc Sinh',
    settleMs: 3500,
    async run(page) {
      await dismissIntro(page);
      await fillDmy(page);
      await typeSlow(page, '#gio', 3);
      await typeSlow(page, '#phut', 30);
      await page.waitForTimeout(700);
      await page.locator('#btnGo').click();
      // Vòng bánh xe hoàng đạo là thứ đáng quay nhất của cả bộ 18 clip.
      await showResult(page, '#resPanel', ['#chiTiet'], 2600);
    },
  },

  'an-sao': {
    // KHÔNG có bản trong Luận Đường (`tool_pricing.app_path` là null) — chỉ có
    // trang đứng riêng. Đường dẫn vì thế giống nhau ở prod lẫn bản tĩnh.
    path: '/tools/an-sao.html',
    localPath: '/tools/an-sao.html',
    label: 'An Sao Lá Số',
    settleMs: 3500,
    async run(page) {
      await fillTuviForm(page, '', {});
      await page.waitForTimeout(700);
      await page.locator('#tvf-submit-btn').click();
      // Lá số 12 cung — cuộn chậm, đây là hình nhận ra ngay là "tử vi".
      await showResult(page, '#result-section', ['#laso-grid'], 2600);
    },
  },
};
