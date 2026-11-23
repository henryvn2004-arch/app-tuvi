# Checklist cho Claude in Chrome — bóp chi phí Vercel `app-tuvi`

Mục tiêu: từ ~43 USD → ~10–15 USD/tháng. Làm TUẦN TỰ, mỗi bước chụp màn hình trước/sau. Chỉ đổi đúng thứ ghi ở đây;
KHÔNG xoá/pause project, KHÔNG đổi domain/env, KHÔNG bấm Upgrade/mua gì. Gặp bước đòi trả thêm tiền → dừng, báo lại.
Team `team_VqQTpsYpKYVOd8X6lPNcAVZ8`, project `app-tuvi` (`prj_elfYFfsun0GifVU3EX4KhS8mNFYF`).

## Bước 1 — Xác nhận bot (chỉ đọc, 10 phút)
Project → **Logs** (Runtime Logs), khung 24h, lọc path chứa `/la-so/`. Ghi lại:
- Top 10 User-Agent (hoặc cột "Bot"/UA nếu có), tỉ lệ cache `HIT/MISS/STALE`.
- Có thấy UA kiểu Bytespider, AhrefsBot, SemrushBot, MJ12bot, GPTBot, ClaudeBot, Googlebot, bingbot, Amazonbot, python-requests, headless? Đếm mỗi loại.
- Phân bố path: có prefix `/ja/ /en/ /ko/ /zh-tw/ /zh-cn/` không.
Làm tương tự cho 11/11 nếu Logs giữ được (Pro giữ 1 ngày thì bỏ qua). Dán kết quả vào PR #1309 comment hoặc báo lại.

## Bước 2 — Firewall (WAF) chặn bot rác (tiết kiệm lớn nhất, miễn phí)
Project → **Firewall** → Custom Rules → Add:
- Rule A: `Request Path` starts with `/la-so/` **AND** `User Agent` matches bất kỳ: Bytespider, AhrefsBot, SemrushBot, MJ12bot, DotBot, PetalBot, BLEXBot, DataForSeoBot, Amazonbot, python-requests, Go-http-client, curl → Action **Deny** (hoặc Challenge nếu chỉ có Challenge).
- Rule B (nếu Bước 1 cho thấy UA lạ khác chiếm nhiều): Rate Limit `/la-so/*` và `/menh-kho/*`: 30 req/phút/IP → Challenge.
- KHÔNG chặn Googlebot, bingbot, GPTBot, ClaudeBot, PerplexityBot (GEO). Bấm **Review → Publish**.
Sau 1 ngày: mở Firewall → xem số request bị chặn.

## Bước 3 — Hạ cấu hình Function
Project → Settings → **Functions** (hoặc Build & Deployment → Functions):
- **Function CPU**: Standard (1 vCPU/2 GB) → **Basic (0,6 vCPU/1 GB)**. Save. (Rủi ro: route PDF/engine OOM → nếu sau 24h thấy lỗi 500/OOM ở Logs, trả lại Standard.)
- Giữ Fluid Compute BẬT. Giữ Max Duration mặc định.

## Bước 4 — Dọn khoản cố định
- Settings → **Speed Insights**: xác nhận đã tắt gia hạn (hết 18/12). Không bật lại.
- Settings → **Git**/Build: xác nhận Ignored Build Step đang chặn preview nhánh ≠ main (nhánh `claude/*`, `i18n-*`). Nếu có Preview deployment tự động cho mọi nhánh khác → tắt.
- Settings → **Observability/Web Analytics**: nếu đang trả phí cho add-on không dùng → liệt kê, KHÔNG tắt khi chưa hỏi.

## Bước 5 — Đo lại (sau 48h)
Usage / Billing → chụp **Fluid Provisioned Memory, CDN Requests, Build CPU** theo ngày. So với nền cũ (memory 0,3–0,6/ngày; CDN chỉ vọt 9–13/11). Báo lại số.

## Việc KHÔNG làm trong dashboard (Claude Code sẽ làm ở code, cần Henry duyệt)
- Bỏ/song song khối trang trí ở `/la-so/[slug]`, hạ `maxDuration` 30→15 s, timeout cho `/mcp/[key]`.

## Kỳ vọng thật
Khoản 9 (CDN) + 6,5 (Build) là đợt 1 lần (9–13/11) đã qua; Speed Insights 10 USD hết sau 18/12. Còn lại ≈ memory 15 → ~5–8 sau Bước 2–3.
⇒ nền dự kiến **~10–14 USD/tháng** nếu không có đợt cào mới.
