-- _patches/migration-purge-fake-cron-runs.sql
-- ============================================================================
-- Dọn các dòng `cron_runs` KHÔNG PHẢI LƯỢT CHẠY, và mở lại 3 dấu cooldown đã
-- bị đóng bởi cảnh báo giả.
--
-- CẢNH BÁO ĐÃ BẮN (10:00 VN 30/07): «Job "Autopilot — giá" lượt gần nhất LỖI»
-- và «Job "Autopilot — nhắc segment" lượt gần nhất LỖI». Cả hai ĐÚNG theo dữ
-- liệu và SAI theo sự thật — loại tệ nhất, vì nó dạy người ta ngó lơ bộ dò.
--
-- SỰ THẬT ĐO ĐƯỢC:
--   • Dòng "lượt gần nhất" của cả hai job là `note = 'Error: Dynamic server
--     usage: Route ... couldn''t be rendered statically because it used
--     `request.headers`'` — tức Next PRERENDER route lúc BUILD, không phải lịch
--     cron gọi. Mốc cuối cùng: 27/07 10:43Z, tức 3 ngày trước cảnh báo.
--   • Lượt THẬT gần nhất của `autopilot-price` là 27/07 01:00:26Z, status `ok`.
--     `autopilot-nudge` chưa có lượt thật nào (nó vào vercel.json ngày 26/07,
--     lượt T6 gần nhất trước đó là 24/07 → lượt thật đầu tiên là 31/07).
--   • Quy mô: **519 trên 941 dòng** của cả bảng là rác loại này — 55%. Phân bố:
--     cron-daily-push 218 · cmo-digest 64 · anomaly-alerts 63 · autopilot-price
--     58 · autopilot-promo 58 · autopilot-nudge 58. Mỗi push (kể cả preview của
--     PR) là một build, nên nó sinh rác theo cấp số.
--   • Hậu quả thứ hai, âm thầm hơn: cửa sổ đọc "300 dòng gần nhất" bị rác chiếm
--     hơn nửa nên chỉ với tới 3 ngày trước, trong khi job TUẦN cần nhìn lại
--     10,5 ngày mới biết nó có trễ. Job thật bị đẩy ra ngoài cửa sổ thì
--     `evaluateJobs` đọc thành "CHƯA HỀ chạy".
--
-- VÌ SAO XOÁ CHỨ KHÔNG HẠ TRẠNG THÁI: mấy dòng này không đại diện cho lượt chạy
-- nào của job cả — giữ lại dưới bất kỳ status nào cũng làm `lastRun` nói dối
-- ("nó có chạy hôm 27/07"). Hạ xuống `skip` còn tệ hơn: `skip` là trạng thái CÓ
-- NGHĨA (chạy mà không có việc) và 3 lượt skip liên tiếp là một cảnh báo riêng.
--
-- CHẶN TÁI PHÁT (đã làm trong CÙNG PR, ở `lib/cron/log.ts`): `withCronLog` bỏ
-- qua hoàn toàn khi `NEXT_PHASE = 'phase-production-build'`, và nếu lỗi vẫn lọt
-- thì XOÁ dòng nhịp tim thay vì chốt nó thành `error`. `export const dynamic =
-- 'force-dynamic'` ở từng route vẫn là tuyến chính (cả 6 route trên đã có từ
-- 27/07, nên rác dừng lại ở mốc đó) — phần mới chỉ là lưới hứng cho route thứ
-- N+1 mà ai đó quên khai.
--
-- ⚠️ CỐ Ý KHÔNG XOÁ 315 dòng `cron-push` (job lịch NGÀY mà có ~45 lượt/ngày):
-- chúng là lượt chạy THẬT, mỗi lượt `sent=2` push đã bay đến thiết bị người
-- dùng thật. Đó là một BUG KHÁC, vá ở `app/api/cron-push/route.ts` trong cùng
-- PR (route thiếu cả `force-dynamic` lẫn kiểm CRON_SECRET nên Next chạy nó ở
-- mỗi build). Xoá log của nó đi là xoá bằng chứng của chính bug đó.
--
-- Đã áp trực tiếp lên prod (project dciwkfdqhhddeymlisey) qua Supabase MCP.
-- Idempotent (chạy lần hai xoá 0 dòng).
-- ============================================================================

-- ── Khối 1: xoá dòng prerender-lúc-build ────────────────────────────────────
-- Bám vào `note` chứ không vào job_key/khoảng ngày: đây là dấu vân tay duy nhất
-- và không lẫn được của loại rác này. Không dòng lượt-chạy-thật nào mang chuỗi
-- đó (`withCronLog` chỉ ghi `note` từ body JSON của handler hoặc từ exception).
delete from public.cron_runs
 where note like 'Error: Dynamic server usage%'
    or note like '%DynamicServerError%';

-- ── Khối 2: mở lại 3 dấu cooldown do cảnh báo giả đóng ──────────────────────
-- `marketing.anomaly_last_fired` giữ mốc "đã báo lần cuối" cho từng loại, cooldown
-- 20 giờ. Ba khoá dưới đây được đóng lúc 03:00Z 30/07 bởi ĐÚNG 3 cảnh báo giả
-- vừa vá. Để nguyên thì suốt 20 giờ sau đó, nếu 3 job này hỏng THẬT, cảnh báo
-- thật sẽ bị nuốt — cùng loại lỗ "cảnh báo bị nuốt trông y hệt cảnh báo không
-- tồn tại" mà `commitAnomalyCooldown` đã phải tách hàm để vá.
-- Các khoá khác giữ nguyên (chúng đã báo đúng).
update public.app_config
   set value = (value - 'job_overdue:health-check'
                      - 'job_failed:autopilot-price'
                      - 'job_failed:autopilot-nudge'),
       updated_at = now()
 where key = 'marketing.anomaly_last_fired';

-- ── Verify (đã chạy trên prod sau khi áp) ───────────────────────────────────
--   • 519 dòng bị xoá; còn 422 dòng, 0 dòng khớp mẫu `note`.
--   • `autopilot-price` lượt cuối = 27/07 01:00:26Z `ok` (hết `failing`).
--   • `autopilot-nudge` còn 0 dòng → được `since='2026-07-26'` trong
--     lib/ops/jobs.ts che tới 05/08, lượt thật đầu tiên 31/07.
--   • `health-check` 6 dòng `ok`, mới nhất cách vài phút → hết `overdue`.
--   • `marketing.anomaly_last_fired` còn đúng 7 khoá, mất đúng 3 khoá trên.
