# Checklist #2 cho Claude in Chrome (sau khi PR #1309 merge, 21/11/2026)

Quy tắc: chỉ làm đúng các bước dưới. KHÔNG xoá/pause project, KHÔNG đổi env/domain, KHÔNG mua/upgrade. Gặp thứ đòi trả tiền thêm → dừng, báo.
Project `app-tuvi` (`prj_elfYFfsun0GifVU3EX4KhS8mNFYF`), team `team_VqQTpsYpKYVOd8X6lPNcAVZ8`. Ghi kết quả vào Google Doc report cũ.

## A. Xác nhận deploy (ngay)
Deployments → deployment Production mới nhất từ commit squash `bef3c88` ("perf: bỏ ISR…") phải **Ready**. Ghi giờ deploy. Nếu Error → dừng, báo link build log.

## B. Firewall — mở rộng Rule A (chỉ UA rác, KHÔNG rate-limit)
Sửa rule "Block junk bots on /la-so/":
- Thêm UA: `Reflectionbot`, `meta-externalagent` (~90K req/ngày, không giúp SEO).
- Mở rộng path: `/la-so/`, `/menh-kho/`, `/van-han/`, `/luan-giai/`, `/thu-vien/`, `/tu-dien/`.
- Giữ nguyên whitelist: Googlebot, bingbot, GPTBot, ClaudeBot, PerplexityBot. KHÔNG tạo Rule B (rate limit).
- Trước khi đặt `curl` vào rule: hỏi Henry xem curl/8.18.0 (~5,8K/ngày) có phải job của anh ấy không.
Publish. Ghi số Denied sau 24h.

## C. Đo ISR — kiểm chứng bản vá (T+24h và T+48h sau deploy)
Usage (Settings → Billing → Usage, lọc project app-tuvi, theo ngày), chụp từng dòng:
**ISR Writes, ISR Reads, Fast Origin Transfer, Fluid Provisioned Memory, CDN Requests, Function Invocations.**
Kỳ vọng: ISR Writes về ~0 trong ngày sau deploy. Nếu vẫn >5 USD/ngày: Observability/Logs lọc theo path, ghi TOP 10 path gây ISR Write (khả năng còn `ngay-tot/*`, `sitemap-*`, `van-han`, `kim-lau`, `thu-vien` khác) và báo lại — KHÔNG tự tắt gì.

## D. Cache sau force-dynamic
Logs → lọc `/la-so/` và `/menh-kho/`: ghi tỉ lệ cache HIT/MISS (Vercel Logs có cột cache) và số Function Invocations/ngày. Nếu Invocations tăng mạnh so với baseline (103K/ngày cho `/la-so`) → báo (có thể cần thêm `s-maxage` cho nhánh 404 của `/luan-giai/[slug]`).

## E. Lỗi LLM hàng loạt (không đụng code)
Chỉ kiểm tra và báo: dashboard nhà cung cấp Gemini (402 = hết credit?), Anthropic (400 — xem error body ở log), Kimi (429 rate limit). Báo số dư/lỗi cho Henry quyết nạp credit. KHÔNG nhập thẻ.

## F. Dọn khoản cố định (chỉ đọc)
Speed Insights Plus: xác nhận đã tắt gia hạn (hết ~18/12). Ghi tổng hoá đơn chu kỳ 18/11→18/12 tới hiện tại (so với 108,53 USD sau 3 ngày).

## Báo cáo cuối
Bảng: dòng chi phí × (baseline 18–20/11, T+24h, T+48h). Một dòng kết luận: nền/ngày sau vá là bao nhiêu → ngoại suy tháng.
