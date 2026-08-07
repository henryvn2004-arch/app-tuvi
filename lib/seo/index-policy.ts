// lib/seo/index-policy.ts — NGUỒN DUY NHẤT của quyết định "trang nào không vào index".
//
// ── Vì sao ──────────────────────────────────────────────────────────────────
// Đo GSC 28 ngày (2026-07-07 → 08-04): 38.147 URL nộp, **665 trang** từng có
// impression (1,7%), **18 nhấp** — 9 trong đó về trang chủ. Nhìn từng dòng thì
// thấy tiền đang trả cho cái gì:
//
//   /la-so/ky-mao-12-03-1999-gio-suu-nu-2027   162 impression · vị trí 1,41 · 0 nhấp
//   /la-so/ky-mao-12-03-1999-gio-mao-nu-2027    39 impression · vị trí 2,23 · 0 nhấp
//   /menh-kho/1999/03-11                        17 impression · vị trí 1,41 · 0 nhấp
//   /menh-kho/1973/03-31                         7 impression · vị trí 1,00 · 0 nhấp
//
// Chúng xếp hạng gần như số 1 mà KHÔNG AI BẤM, vì truy vấn kéo chúng lên là
// `"1983"`, `"1976 12"`, `"13 7 2001"` — chuỗi ngày tháng, không phải một nhu
// cầu. Đây là index bloat kinh điển: hàng chục nghìn trang mỏng kéo tụt đánh giá
// chất lượng của CẢ tên miền, trong khi ~10.000 trang có nội dung thật thì chìm.
//
// ── Vì sao là `noindex` chứ không phải rút khỏi sitemap ─────────────────────
// 🔑 Bài học #358, đã trả giá một lần: **rút khỏi sitemap KHÔNG deindex**.
// `sitemap-pregen.xml` bị rút từ hồi đó mà `/la-so/*` vẫn ăn impression đều và
// vẫn xếp hạng 1,4. Sitemap là LỜI MỜI, không phải LỆNH. Muốn gỡ thật thì chỉ
// có `noindex`.
//
// ── Vì sao `follow` chứ không phải `nofollow` ───────────────────────────────
// Mấy trang này là tầng điều hướng: day hub trỏ tới 24 lá số, lá số trỏ ngược về
// hub chuyên mục và bài viết. `nofollow` là tự cắt đường bò tới phần nội dung
// thật nằm sau chúng.
//
// ── Giữ nguyên INDEX, đừng đụng ─────────────────────────────────────────────
//   • `laso_public` (33) — lá số người dùng ĐÃ TRẢ TIỀN rồi bấm chia sẻ.
//   • `/menh-kho/[năm]` (51 hub năm) — tầng điều hướng mỏng nhưng ÍT, và là
//     đường duy nhất Google còn bò xuống day hub để đọc được thẻ noindex.
//   • Toàn bộ `/ngay-tot/*` — có cầu thật (`"ngày tốt tháng 2 năm 2021"`).
//
// ── Lật lại thế nào ────────────────────────────────────────────────────────
// Đổi hằng số dưới đây về `INDEX_FOLLOW` rồi deploy. Nhưng nhớ: lấy lại index
// mất hàng tuần tới hàng tháng, không phải bật/tắt tức thì.

/** Thẻ robots cho trang muốn Google index bình thường. */
export const INDEX_FOLLOW = '<meta name="robots" content="index, follow">';

/**
 * Thẻ robots cho các họ trang chương trình đang bị RÚT khỏi index.
 * Áp cho: `/menh-kho/[năm]/[ngày]` (18.628) · `/la-so/*` dựng sẵn (1.444) ·
 * `/la-so/*` tính tại chỗ (họ ISR).
 */
export const NOINDEX_FOLLOW = '<meta name="robots" content="noindex, follow">';
