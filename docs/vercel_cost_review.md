# Rà chi phí Vercel — project `app-tuvi` (~43 USD / 30 ngày, 21/10–20/11/2026)

> Nghiên cứu + đề xuất. **Không đổi cài đặt Vercel, không đổi code.** Mọi con số "ước" dưới đây là ước lượng,
> không phải đo — Observability Plus tắt (402) và `get_runtime_logs` chỉ trả `console.*`, không có log request
> (user-agent / cache status / duration), nên **chưa chứng minh được "bot hay người"** bằng số đo.
> Đánh dấu: ✅ đọc thẳng từ code · 🔶 suy luận · ❓ cần dữ liệu thêm.

## Tóm tắt 8 dòng
1. ✅ `/la-so/[slug]` **đã** dán `s-maxage=31536000` (CDN cache 1 năm) — không phải force-dynamic hay ISR; 103K lượt/ngày là **cache MISS** thật.
2. 🔶 Nguồn miss: đuôi dài gần vô hạn — 18.628 hub `/menh-kho/<năm>/<ngày>` × 24 link ≈ 447K slug, × 5–6 ngôn ngữ (`/ja/…`, `/en/…`… mỗi URL một khoá CDN) + biến thể năm ≠ 2027 (301). Chỉ crawler mới đi hết; người thật không gõ ngày sinh chính xác (GSC: 0 nhấp).
3. ✅ Sitemap `sitemap-pregen` đã rút (rỗng) nhưng **robots.txt `Allow: /` mọi bot** + link nội bộ ở hub vẫn dẫn bot vào. Trang vi đang `noindex,follow` → crawl vẫn tốn, không sinh traffic.
4. 🔶 Tiền nằm ở **Fluid Provisioned Memory (15,2 USD)** chứ không phải Active CPU (28 phút/103K lượt ≈ 16 ms/lượt): mỗi miss chờ **3–6 lượt Supabase tuần tự** (laso_public‖pregen → bài liên quan → next-step → usdRate → thẻ thầy) trong khi giữ 2 GB.
5. ✅ `maxDuration`: la-so = 30 s (không phải 300 s). 300 s chỉ ở các route LLM/admin (`/api/v1/chat`, `phong-thuy`, `van-han-nam`…) — hợp lý, không phải thủ phạm.
6. 🔶 CDN Requests 9–13/11 (9,0 USD): khớp với đợt crawl/ i18n mở thêm ~5 ngôn ngữ (W33a la-so đa ngôn ngữ, 2026-11) nhân URL ×6 → bot cào lại toàn bộ; cần log để chắc.
7. ✅ `/mcp/[key]` 269 lượt/24h: **không đáng kể** (≤ ~0,1 USD/tháng), nhưng `validateKey` không có timeout và `maxDuration=60`.
8. Tiết kiệm khả thi ≈ **8–14 USD/tháng** (xem bảng), chủ yếu từ chặn/giảm crawl `/la-so/*` sinh bằng thuật toán + rút số lượt Supabase.

## 1. `/la-so/[slug]` — ai gọi, vì sao tốn

Đọc `app/la-so/[slug]/route.ts` (1941 dòng), `proxy.ts`, `public/robots.txt`, `app/menh-kho/[year]/[day]/route.ts`:

- Thứ tự phục vụ: `laso_public` (người trả tiền) → `laso_pregen` (1.444 lá thật) → **tính tại chỗ bằng engine** (họ slug `{can-chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi}-{namXem}`, ~438–587K lá số) → 404.
- Cache: `export const revalidate = false` trong *route handler* gần như vô nghĩa; bộ nhớ đệm thật là header `Cache-Control: public, s-maxage=31536000` (ISR tính tại chỗ) / `86400` (public, pregen) / 404 cache 1 ngày–1 năm. Tức **CDN đã được dùng đúng**; lượt gọi 103K/ngày là các URL **chưa từng được cache** (hoặc cache theo vùng riêng: CDN Vercel cache theo từng region, bot hit từ nhiều region ⇒ một URL có thể miss nhiều lần).
- Tránh nhân bản: năm xem ≠ 2027 → 301 rẻ (không chạy engine) ✅. Slug rác → 404 cache 1 năm ✅. Tác giả đã tối ưu khá kỹ; phần còn lại là **chi phí của việc có quá nhiều URL**.
- Link graph: mỗi trang hub ngày (`/menh-kho/<năm>/<ngày>`, 18.628 trang, cache 1 năm) có 24 link `/la-so/…` ⇒ ~447K URL crawlable. `robots.txt` cho phép mọi bot (kể cả GPTBot/ClaudeBot/PerplexityBot), **không có `Crawl-delay`**, không chặn `/la-so/`.
- GSC (ghi trong `app/sitemap-pregen/route.ts`): 616K URL nộp → 612 từng hiện, **0 nhấp**. Trang vi hiện `noindex,follow` (`lib/seo/index-policy.ts`) ⇒ crawl tiếp tục (vì `follow`) nhưng không sinh giá trị.
- **Kết luận: gần như chắc là bot/crawler** (người thật không gõ ngày sinh chính xác; rail `/la-so` thật chỉ ~32 lá public + 1.444 pregen). Xác nhận cần: Vercel Firewall/Logs → lọc `path:/la-so/*` group theo `user_agent` & `cache`. ❓

Mỗi miss tính tiền thế nào (🔶): Active CPU nhỏ (engine đo 5–11 ms, nạp 9,5 ms — comment trong code). Nhưng Fluid tính **Provisioned Memory** theo thời gian instance "bận" (gồm lúc chờ I/O). Ca xấu nhất tuần tự: `laso_public‖laso_pregen` → `fetchRelatedArticles` (tới 3 keyword) → `fetchNextStepTool` → `usdPerCredit` → `fetchThayCard`; cả ba khối sau là **trang trí** và chạy tuần tự (`await` lần lượt, dòng ~1880–1900). Supabase vùng khác `iad1` ⇒ mỗi vòng 100–250 ms. ⇒ ~1–1,5 s/miss × 2 GB.

## 2. Đợt CDN Requests 9–13/11
Không có số log để chứng minh. Các manh mối ✅ trong repo: nhật ký `docs/nhat-ky/2026-11.md` ghi i18n W33a (la-so + nghiem-chung + ngay-tot ra thêm ja/ko/zh-tw/zh-cn/en, sitemap i18n `sitemap-i18n`, `sitemap-la-so?lang=`) và `app/api/cron/indexnow` ping theo ngôn ngữ ⇒ **số URL crawlable nhân ~6 lần, bot (đặc biệt Googlebot/Bing sau IndexNow) quay lại cào toàn bộ**. Đỉnh 11/11 = 4,69 USD cùng ngày Fluid memory 1,43 USD (cùng một sự kiện: lượt cào lớn). 🔶 Muốn chắc: Vercel Logs ngày 11/11, group theo `user_agent`, `host/path prefix` (`/ja/`, `/en/`).

## 3. Memory / maxDuration / cache
- Function Standard 1 vCPU/2 GB, dùng thật ~374 MB ⇒ hạ xuống 1 GB giảm **~50% đơn giá memory** nếu Vercel plan cho (Pro: Settings → Functions → "Function CPU": *Standard* = 1 vCPU/2 GB; *Basic* = 0,6 vCPU/1 GB). Với route chủ yếu chờ I/O, Basic hợp lý. Rủi ro: `/api/*pdf`, `@react-pdf`, engine 400 KB nạp ~375 MB ⇒ nên thử trên preview, theo dõi OOM. 🔶
- `maxDuration`: la-so 30 s, đã ép `SB_TIMEOUT_MS=4000` ⇒ có thể hạ la-so xuống 10–15 s (khung 4 s × vài bước vẫn lọt) để một nhịp Supabase nghẽn không giữ 2 GB 30 s. `/mcp` public & `/mcp/[key]` 60 s. Route 300 s toàn là LLM/admin ⇒ giữ.
- ISR/`generateStaticParams` cho ~447K slug: **KHÔNG** (phí ghi ISR theo số URL; đúng bài học bizdirectasia). Cách hiện tại (header CDN, không ISR) là đúng. Cải tiến an toàn: thêm `Vercel-CDN-Cache-Control` (cùng giá trị) — vô hại, và `CDN-Cache-Control` tách khỏi header trình duyệt; lợi ích chính là kiểm soát nhưng không giảm miss.
- Giảm chi phí mỗi miss: chạy 3 khối trang trí **song song** (`Promise.all`) hoặc bỏ hẳn cho trang noindex (bot không cần "bài liên quan"/thẻ thầy) — còn 1 vòng Supabase thay vì 5–6. Hoặc nhẹ hơn: nhận diện crawler (UA) ⇒ không gọi các khối trang trí. Cẩn thận cloaking: nội dung chính/JSON-LD/canonical không đổi; chỉ bỏ khối "bài liên quan" cho trang đang `noindex` thì rủi ro SEO thấp. ❓ cần SEO owner chốt.

## 4. `/mcp/[key]` (75% lỗi)
`app/mcp/[key]/route.ts`: `force-dynamic`, `maxDuration=60`, key sai ⇒ `validateKey` 1 lượt Supabase **không timeout/không cache** rồi trả lỗi. 269 lượt/24h × ~1 s ≈ vài phút compute/ngày ⇒ **< 0,2 USD/tháng**. Không đáng tối ưu, trừ: thêm `AbortSignal.timeout(4000)` cho `validateKey`, và cache âm key sai (vài phút) nếu bị scan. Lỗi 75% khả năng cao là client MCP cũ/key hết hạn/scanner dò `/mcp/<key>` (🔶). Lưu ý GET Streamable-HTTP có thể mở SSE giữ function tới 60 s: nếu client gọi GET liên tục thì đáng theo dõi duration (❓).

## 5. Bảng đề xuất

| # | Việc | Tiết kiệm ước (USD/tháng) | Rủi ro SEO / người dùng | Công sức |
|---|---|---|---|---|
| 1 | Lấy log 24h `/la-so/*` theo UA + cache status để **xác nhận bot** (Vercel Logs UI, không cần Observability Plus nếu dùng Log Drain/CLI `vercel logs`) | 0 (điều kiện cho #2–3) | không | 15 phút |
| 2 | Vercel Firewall rule: **rate-limit / challenge** UA bot không phải Googlebot/Bingbot trên `/la-so/*`, `/menh-kho/*` (rule WAF miễn phí gói Pro, 1 rule) | 4–8 (CDN Req + memory đợt cào) | Thấp nếu whitelist Googlebot/Bingbot/GPTBot đã xác thực; chặn Bytespider/AhrefsBot/SemrushBot… không ảnh hưởng SEO | 30 phút (tay, dashboard) |
| 3 | `robots.txt`: `Disallow: /la-so/*-gio-*` cho UA phụ + `Crawl-delay` (Google bỏ qua, bot khác theo) — **không** chặn Googlebot vì trang đang noindex-follow, chặn sẽ khiến Google không thấy `noindex` (giữ index cũ) | 1–3 | Trung bình về index: cân nhắc kỹ trước khi Disallow; chỉ làm nếu muốn *de-index qua 410/noindex trước, robots sau* | 1 giờ + theo dõi GSC |
| 4 | Song song hoá / bỏ khối trang trí (related/nextStep/usdRate/thẻ thầy) ở nhánh ISR **noindex** của `/la-so/[slug]` | 2–4 (memory) | Thấp (khối trang trí, trang noindex); cần SEO owner xác nhận | 1–2 giờ + `check:*` |
| 5 | Hạ Function CPU Standard → **Basic (1 GB)** (thử preview) | 3–6 (≈ nửa 15,2 USD memory nếu lưu lượng giữ) | OOM với route PDF/engine nặng ⇒ thử và theo dõi; có thể tách | 15 phút + 1 ngày theo dõi |
| 6 | `maxDuration` la-so 30→15 s | <1 | Rất thấp (đã có timeout 4 s/lượt) | 5 phút |
| 7 | `/mcp/[key]`: timeout 4 s + cache âm key sai | <0,2 | không | 15 phút |
| 8 | Giữ: Ignored Build Step (đã làm), tắt Speed Insights Plus (đã làm), không bật ISR cho la-so | — | — | — |

**Tổng khả thi ≈ 8–14 USD/tháng (~20–30% hóa đơn)** — con số ước, độ chắc phụ thuộc #1.

## Phụ lục — việc cần Henry/Founder (code không làm thay được)
- Chạy #1 (log) và #2/#5 trên dashboard Vercel.
- Quyết định chính sách `/la-so/*` algorithmic: giữ `noindex,follow` (hiện tại) hay chuyển sang `410/404` cho phần chưa từng có hiển thị (đòn mạnh nhất nhưng đổi hành vi SEO).
