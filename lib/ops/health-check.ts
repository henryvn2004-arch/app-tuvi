// lib/ops/health-check.ts
// ============================================================
// CANH PROD CÒN SỐNG — sinh ra từ một sự cố thật (29/07/2026).
//
// CHUYỆN ĐÃ XẢY RA: subscription Supabase bị hạ Pro → Free vì quá hạn thanh
// toán, project chuyển sang `INACTIVE`, và **mọi thứ trên prod đụng tới DB đều
// trả 500** — đăng nhập, ví Lượng, lưu lá số, 438K trang ISR. Trang tĩnh vẫn
// phục vụ bình thường nên nhìn từ ngoài site không "chết hẳn", không ai thấy.
//
// Hạ tầng phát hiện thì CÓ SẴN (smoke cron 6 giờ) và nó **đã kêu đúng từ
// 28/07**. Nhưng workflow gặp issue `prod-down` đang mở thì chỉ COMMENT vào
// issue cũ thay vì tạo issue mới, nên nhìn danh sách issue không thấy gì mới,
// và không có đường nào đẩy tới Telegram. Prod hỏng hơn một ngày mà chủ không
// biết. Đó là lỗ hổng file này vá: **có phát hiện nhưng không có báo**.
//
// BA LUẬT THIẾT KẾ, đọc trước khi sửa:
//
// 1. **KHÔNG dùng Supabase để lưu cooldown.** Thứ cần cảnh báo nhất chính là
//    "Supabase chết"; lưu trạng thái ở đó thì đúng lúc cần nhất lại không đọc
//    nổi. Nên chấp nhận nhắc lại mỗi lượt trong lúc còn hỏng — prod đang chết
//    thì nhắc 2 lần/giờ là ĐÚNG, không phải spam. Lặng đi mới là nguy.
// 2. **Đường gửi không được phụ thuộc Supabase.** Chỉ dùng env
//    (`TELEGRAM_BOT_TOKEN` + `ADMIN_TELEGRAM_CHAT_ID`) — 0 env mới, dùng chung
//    với alert đăng nhập và CMO digest.
// 3. **Mỗi phép kiểm có timeout riêng.** Một endpoint treo không được phép làm
//    chết cả lượt canh — đúng loại hỏng mà thứ này sinh ra để bắt.
// ============================================================

// Cho phép trỏ sang chỗ khác qua env — cùng quy ước `PROD_URL` mà workflow
// smoke-prod.yml đang dùng. Có hai chỗ cần: chạy test đầu-cuối được (mặc định
// gọi thẳng prod thật thì không kiểm chứng nổi nhánh "mọi thứ ổn"), và nếu sau
// này muốn canh cả preview thì không phải sửa code.
const PROD_URL = process.env.PROD_URL || 'https://www.tuviminhbao.com';

export interface HealthProblem {
  key: string;
  text: string;
}

export interface HealthResult {
  problems: HealthProblem[];
  checked: string[];
}

/** fetch có hạn giờ — trả về status, hoặc 0 khi không nối được / quá hạn. */
async function probe(url: string, ms: number, headers?: Record<string, string>): Promise<number> {
  try {
    const res = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(ms),
    });
    return res.status;
  } catch {
    return 0;
  }
}

/**
 * Ba phép kiểm, xếp theo mức nghiêm trọng giảm dần. Mỗi phép chỉ trả lời một
 * câu và nói rõ phải làm gì — cảnh báo mà người đọc phải tự đi đoán nguyên
 * nhân thì cũng bị ngó lơ như không có.
 */
export async function checkProdHealth(): Promise<HealthResult> {
  const problems: HealthProblem[] = [];
  const checked: string[] = [];

  // 1. Supabase còn sống không. Đây là phép kiểm QUAN TRỌNG NHẤT: project bị
  //    pause hay hết hạn thanh toán đều hiện ra ở đây, và khi nó chết thì toàn
  //    bộ phần có giá trị của site chết theo dù trang tĩnh vẫn mở được.
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (sbUrl && sbKey) {
    checked.push('supabase');
    const st = await probe(`${sbUrl}/rest/v1/app_config?select=key&limit=1`, 8000, {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
    });
    if (st !== 200) {
      problems.push({
        key: 'supabase_down',
        text:
          `Supabase KHÔNG phản hồi (${st === 0 ? 'quá hạn/không nối được' : 'HTTP ' + st}).\n` +
          '   → Mọi thứ trên prod đụng DB đang hỏng: đăng nhập, ví Lượng, lưu lá số, trang ISR.\n' +
          '   → Kiểm dashboard Supabase: project có bị pause không, subscription còn hạn không.',
      });
    }
  }

  // 2. `/sitemap.xml` — CHÍNH endpoint mà smoke bắt được hôm 28/07. Nó đọc 8
  //    bảng nên là phép thử "prod có nói được với DB không" qua đúng đường mà
  //    người dùng thật đi, không phải qua service key của riêng cron.
  checked.push('sitemap');
  const sm = await probe(`${PROD_URL}/sitemap.xml`, 15000);
  if (sm !== 200) {
    problems.push({
      key: 'sitemap_down',
      text:
        `prod /sitemap.xml trả ${sm === 0 ? 'không phản hồi' : 'HTTP ' + sm} (cần 200).\n` +
        '   → Route này đọc 8 bảng Supabase, nên thường là dấu hiệu DB hoặc env trên Vercel có vấn đề.',
    });
  }

  // 3. Trang chủ. Tách riêng khỏi (2) có chủ ý: trang chủ là tĩnh nên nó CÒN
  //    SỐNG trong sự cố 29/07 — đúng lý do sự cố đó khó thấy. Hai phép kiểm
  //    cùng đỏ nghĩa là hỏng ở tầng hosting; chỉ (2) đỏ nghĩa là hỏng ở DB.
  checked.push('homepage');
  const home = await probe(`${PROD_URL}/`, 15000);
  if (home !== 200) {
    problems.push({
      key: 'homepage_down',
      text:
        `prod / trả ${home === 0 ? 'không phản hồi' : 'HTTP ' + home} (cần 200).\n` +
        '   → Cùng đỏ với sitemap thì nghi tầng hosting/Vercel, không phải riêng DB.',
    });
  }

  return { problems, checked };
}
