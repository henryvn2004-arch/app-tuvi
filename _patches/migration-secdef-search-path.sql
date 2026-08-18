-- Đóng nốt 7 hàm SECURITY DEFINER còn để TRỐNG search_path.
--
-- 🔐 Vì sao: hàm SECURITY DEFINER chạy bằng quyền của CHỦ hàm. Để trống
-- search_path thì nó dùng search_path của NGƯỜI GỌI ⇒ ai đặt được search_path
-- trỏ vào schema của mình có thể khiến hàm gọi nhầm bảng/hàm giả mạo — với
-- quyền chủ hàm. 45 hàm khác trong repo đã khai; 7 hàm này là nhóm CŨ NHẤT,
-- tạo trước khi có quy ước.
--
-- ⚠️ ĐỪNG THỔI PHỒNG — đã đo ACL: `anon` và `authenticated` KHÔNG gọi được cái
-- nào (chỉ `postgres` + `service_role`, xem migration-revoke-secdef-sweep.sql).
-- Muốn khai thác phải đã có service_role, mà có rồi thì đọc/ghi thẳng bảng
-- được, không cần lách qua search_path. ⇒ Đây là GIA CỐ PHÒNG THỦ THEO CHIỀU
-- SÂU, không phải lỗ đang hở.
--
-- 🔑 Dùng ALTER FUNCTION chứ KHÔNG CREATE OR REPLACE: nó không đụng một ký tự
-- nào trong thân hàm, nên không có cửa nào để bản đang chạy lệch khỏi bản trong
-- repo — đúng bệnh đã cắn hai lần (edge function chỉ có trên dashboard; RPC
-- deploy lượt đầu gõ chữ KHÔNG DẤU rồi chuỗi đó đi thẳng vào mô tả giao dịch).
--
-- ✅ Đã đọc TRỌN thân cả 7 hàm trước khi chạy: cả 7 chỉ chạm bảng/hàm trong
-- `public` (user_credits · chat_usage · telegram_usage · credit_transactions ·
-- add_credits · process_referral_reward). KHÔNG hàm nào tham chiếu `auth.*`
-- hay `extensions.*` mà không nêu schema ⇒ ghim search_path không làm hỏng cái
-- nào. `NOW()` nằm ở pg_catalog, vốn luôn được tìm trước, không cần khai.
--
-- 🔑 Vì sao `public, pg_temp` chứ không phải `public` trần như 45 hàm kia:
-- Postgres tìm `pg_temp` TRƯỚC TIÊN trừ khi nó được nêu tường minh ở vị trí
-- khác. Để `public` trần là vẫn còn cửa che bảng thật bằng bảng TẠM cùng tên.
-- Nêu `pg_temp` ở CUỐI thì đóng luôn cửa đó. ⚠️ Nghĩa là 45 hàm còn lại đang ở
-- mức YẾU HƠN 7 hàm này — nợ đã ghi, nâng ở lượt riêng (chỉ là ALTER, không
-- đụng thân, nhưng đụng 45 hàm đang chạy nên tách việc).

alter function public.add_credits(uuid, integer)              set search_path = public, pg_temp;
alter function public.deduct_credits(uuid, integer)            set search_path = public, pg_temp;
alter function public.get_credit_balance(uuid)                 set search_path = public, pg_temp;
alter function public.chat_incr_free_usage(text, text, date)   set search_path = public, pg_temp;
alter function public.tg_incr_free_usage(text, date)           set search_path = public, pg_temp;
alter function public.trigger_referral_check_on_topup()        set search_path = public, pg_temp;

-- ⚠️ `handle_new_user_credits` là HÀM CHẾT: đo được nó KHÔNG gắn trigger nào.
-- Nó là tàn dư của bản quà đăng ký 10 Lượng; bản đang sống là
-- `handle_new_user_signup` (25 Lượng) gắn ở trigger `on_auth_user_created` trên
-- `auth.users`. Vá luôn cho hết cảnh báo, nhưng KHÔNG xoá trong lượt này — xoá
-- là việc khó đảo và nằm ngoài phạm vi "vá search_path". Nợ đã ghi.
alter function public.handle_new_user_credits()                set search_path = public, pg_temp;

-- Verify: phải trả về 0 dòng.
--   select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.prosecdef and p.proconfig is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phần 2 — CHẶN TÁI PHÁT: thêm mục thứ 6 cho `security_audit()`.
--
-- 🔴 Đo được: `security_audit()` (S6) canh 5 thứ — hàm hở cho anon · bơm sự
-- kiện · thiết bị cày · referral bất thường · lệch số dư — nhưng **KHÔNG canh
-- search_path**. Đó là lý do 7 hàm trên sống lâu mà không ai biết, dù bộ dò đã
-- chạy mỗi 3 giờ qua `anomaly-alerts` từ lâu.
--
-- 🪤 Suýt kết luận NGƯỢC: lượt red-team đầu dựng một hàm probe rồi thấy
-- `security_audit()` "bắt được" ⇒ tưởng nó đã canh sẵn. Thật ra probe mới tạo
-- chưa siết ACL nên lọt vào mục CŨ `ham_ho_cho_anon` — đỏ vì LÝ DO KHÁC. Phải
-- dựng lại probe CÓ ACL đã siết mới đo đúng. Cùng lớp lỗi "xanh/đỏ vì lý do
-- sai" đã ghi nhiều lần trong CLAUDE.md.
--
-- Lập luận giữ nguyên như mục `ham_ho_cho_anon` ngay cạnh: Postgres KHÔNG chặn
-- được ở tầng mặc định, nên mỗi migration tương lai vẫn đẻ ra được một hàm
-- thiếu — cách duy nhất còn lại là đo lại đều đặn.
--
-- ⚠️ Thân hàm dưới đây ĐỌC NGƯỢC TỪ BẢN ĐANG CHẠY (`pg_get_functiondef`) sau
-- khi deploy, không chép tay: md5 `1ed76a8ae737f59a7415caeb135640b1`, dài 2.965
-- ký tự. Bốn khối cũ giữ NGUYÊN VĂN, chỉ thêm `v_nopath` + một khoá trả về.
--
-- ✅ Red-team: probe SECURITY DEFINER **đã siết ACL** nhưng thiếu search_path →
--    mục MỚI ra `["__rt_nopath"]` trong khi mục CŨ `ham_ho_cho_anon` vẫn `[]`
--    ⇒ bắt đúng vì đúng lý do. Khôi phục → cả hai `[]`.
--
-- Xem thân hàm đầy đủ ở `_patches/migration-security-audit.sql` (bản gốc S6);
-- lượt này chỉ thêm khối `v_nopath` và khoá `ham_thieu_search_path`:
--
--   select coalesce(json_agg(t.proname order by t.proname), '[]'::json) into v_nopath
--   from (
--     select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public' and p.prosecdef and p.proconfig is null
--   ) t;
--
-- và trong `json_build_object(...)`: 'ham_thieu_search_path', v_nopath,
--
-- Bề mặt đọc: `anomaly-alerts.ts` (Telegram, 3 giờ/lượt, cooldown
-- `sec_no_search_path`) + panel Bảo Mật trong `admin.html`.
