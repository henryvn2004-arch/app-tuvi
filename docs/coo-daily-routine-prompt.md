# Prompt cho Routine "Báo cáo COO hằng ngày 07:00 VN"

Bối cảnh, lý do thiết kế và trạng thái: xem **§7 của `COO-ORCHESTRATOR-SCOPE.md`**.

Cấu hình routine (tạo ở **claude.ai → Routines**):

| Trường | Giá trị |
| --- | --- |
| Tên | Báo cáo COO hằng ngày (7h sáng) |
| Cron | `0 0 * * *` — **UTC**, tức 07:00 giờ VN |
| Kiểu | Tạo phiên mới mỗi lần chạy (`create_new_session_on_fire: true`) |
| Thông báo | Push |
| Connectors | **Supabase** (bắt buộc — prompt lấy Supabase làm nguồn duy nhất) |

⚠️ Đừng dùng `CronCreate`: nó chỉ sống trong phiên và tự hết hạn sau 7 ngày.

⚠️ **Đừng bind vào một phiên đang mở** (`persistent_session_id` / self-bind). Ba lý do đã
trả giá thật: (1) routine bind phiên **không gửi được push** — server từ chối tham số
`notifications`, báo cáo chỉ nằm im trong hội thoại đó; (2) container phiên từ xa **bị thu
hồi sau một thời gian không hoạt động** → routine vẫn bắn đúng giờ nhưng bắn vào một phiên
không còn tồn tại, im lặng vĩnh viễn mà không có gì báo; (3) `create_trigger` gọi từ phiên
**không mang theo connector** trừ khi chính phiên đó đang giữ → lượt chạy mất Supabase và
chỉ ra được một bản báo cáo "không đọc được".

---

## Prompt (chép nguyên khối dưới đây)

```text
Báo cáo COO VẬN HÀNH hằng ngày cho tuviminhbao.com. Viết bằng tiếng Việt, xưng "tao/mày". Ngày sạch thì đọc trong 30 giây.

Nguồn dữ liệu DUY NHẤT: Supabase MCP, project `dciwkfdqhhddeymlisey`. Chỉ SELECT/RPC, TUYỆT ĐỐI không ghi/sửa/xoá dữ liệu (không INSERT/UPDATE/DELETE/ALTER/GRANT, kể cả khi thấy thứ cần vá — chỉ NÊU ra). Không cần đọc repo, không cần chạy build/test.

⚠️ BẪY THỜI GIAN: routine này chạy 07:00 VN, TRƯỚC cron `ops-digest` (07:30 VN). Event `ops_digest` mới nhất trong bảng `events` là bản của HÔM QUA — ĐỪNG đọc nó rồi báo cáo như số của hôm nay. Luôn tính LIVE từ các truy vấn dưới.

⚠️ LUẬT XỬ LÝ LỖI: truy vấn nào lỗi (thiếu bảng/thiếu cột/không có quyền) thì ghi THẲNG "không đọc được <mục>" kèm thông báo lỗi gốc. Nếu lỗi vì SAI TÊN CỘT thì thử lại ĐÚNG MỘT lần bằng `select * from <bảng> limit 20`. Tuyệt đối không bỏ qua im lặng và không suy đoán số — mù mà tưởng khoẻ chính là lỗi mà hệ giám sát này sinh ra để tránh.

═══ NHÓM 1 — Tool · Tiền · Bảo mật (RPC dựng sẵn) ═══
select 'tool_health' as src, to_jsonb(t) as data from tool_health(24) t
union all
select 'payment_reconcile', to_jsonb(r) from payment_reconcile(30) r
union all
select 'security_audit', security_audit(300,5,10)::jsonb;

═══ NHÓM 2 — Job Vercel cron (qua cron_runs) ═══
select job_key,
       count(*) filter (where started_at > now()-interval '24 hours') as runs_24h,
       count(*) filter (where status='error' and started_at > now()-interval '24 hours') as err_24h,
       count(*) filter (where status='skip' and started_at > now()-interval '24 hours') as skip_24h,
       max(started_at) as last_run,
       (array_agg(status order by started_at desc))[1] as last_status,
       (array_agg(note order by started_at desc))[1] as last_note
from cron_runs group by job_key order by last_run desc nulls last;

═══ NHÓM 3 — Job pg_cron (auto-pipeline KHÔNG ghi cron_runs) ═══
select * from ops_pgcron_runs(20);

═══ NHÓM 4 — BẢO MẬT, 6 truy vấn nền (chạy CẢ 6, đừng bỏ bớt) ═══
-- 4a. Đối chứng ĐỘC LẬP với security_audit: hàm SECURITY DEFINER nào anon còn gọi được
select n.nspname||'.'||p.proname as fn
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by 1;

-- 4b. Bảng public nào TẮT RLS
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 4c. Policy cấp quyền cho anon/public (đặc biệt là quyền GHI)
select tablename, policyname, roles::text, cmd, qual
from pg_policies
where schemaname = 'public'
  and (roles::text like '%anon%' or roles::text like '%public%')
order by tablename;

-- 4d. Bucket storage công khai
select id, public from storage.buckets order by id;

-- 4e. Lượng được cấp/tiêu 24h, tách theo loại giao dịch
select type, count(*) as n, sum(amount) as tong_luong
from credit_transactions
where created_at > now()-interval '24 hours'
group by type order by abs(sum(amount)) desc nulls last;

-- 4f. Đăng nhập admin 24h (cột có thể khác tên → áp luật xử lý lỗi ở trên)
select * from admin_login_attempts
where created_at > now()-interval '24 hours'
order by created_at desc limit 30;

═══ NHÓM 5 — Phân phối & nội dung ═══
select 'channel_error_rate' as src, to_jsonb(c) as data from channel_error_rate(24) c;

select status, count(*) as n, max(created_at) as moi_nhat
from media_posts group by status order by n desc;

select yt_status, count(*) as n, max(created_at) as moi_nhat
from van_dap where yt_status is not null group by yt_status order by n desc;

═══ NHÓM 6 — Autopilot & cấu hình ═══
select action_type, mode, count(*) as n, max(ts) as lan_cuoi
from autopilot_actions
where ts > now()-interval '7 days'
group by action_type, mode order by lan_cuoi desc;

select key, value from app_config order by key;

────────────────────────────────────────────────
CÁCH ĐỌC & NGƯỠNG BÁO ĐỘNG
────────────────────────────────────────────────

🩺 TOOL (`tool_health`)
`errors` là lỗi HỆ THỐNG; `user_errors` là lỗi người dùng (hết Lượng, sai input) — KHÔNG phải sự cố, đừng báo động. Chỉ báo khi `errors` > 0, nêu tên tool + tỷ lệ + `last_error`.
`p95_ms` cao ở 2 tool sinh ảnh (chan-dung-vo-chong, chan-dung-tien-kiep — khoảng 50s) là BÌNH THƯỜNG, model ảnh vốn chậm.
Bảng rỗng ⇒ ghi "chưa có lượt chạy nào trong 24h". KHÔNG được đọc thành "mọi tool đều khoẻ" — đó là hai chuyện khác hẳn.

💰 TIỀN (`payment_reconcile`)
Baseline ĐÃ BIẾT: `chan-dung-vo-chong` 2 lượt chưa giao, 44 Lượng — lượt test của chính Henry hồi tháng 7, KHÔNG phải khách thật, KHÔNG cần hoàn.
Chỉ báo động khi tổng `credits_at_risk` > 44 HOẶC xuất hiện `tool_id` mới. Bằng đúng 44 thì một dòng "vẫn 44 Lượng cũ (đã biết)" là đủ.

🔒 BẢO MẬT — mục quan trọng nhất, đọc kỹ từng ngưỡng
(a) `security_audit`: cả 5 mảng (`ham_ho_cho_anon`, `bom_su_kien`, `thiet_bi_cay`, `referral_bat_thuong`, `lech_so_du`) PHẢI rỗng. Mảng nào có phần tử → 🔴 ĐỎ, nêu rõ mảng nào + nội dung.
    · `ham_ho_cho_anon` khác rỗng là NGHIÊM TRỌNG NHẤT — hàm RPC hở cho anon, đúng lỗ CRIT-1 đã vá. EXECUTE cho PUBLIC là mặc định DỰNG SẴN của Postgres và `ALTER DEFAULT PRIVILEGES` không gỡ được, nên MỌI hàm mới sinh ra đều hở cho tới khi có người REVOKE. Đây là lỗi TÁI PHÁT, không phải sự cố một lần.
    · `lech_so_du` khác rỗng nghĩa là Lượng tự sinh ra mà không giao dịch nào giải thích — đưa lên đầu báo cáo.
(b) Truy vấn 4a là ĐỐI CHỨNG ĐỘC LẬP của `ham_ho_cho_anon`. **Hai nguồn phải khớp.** Lệch nhau → báo động ngang mức có lỗ hổng, vì nghĩa là MỘT TRONG HAI ĐANG MÙ, và bộ dò nói dối còn tệ hơn không có bộ dò.
(c) 4b: mọi bảng trong `public` phải BẬT RLS. Bảng nào tắt → 🔴, nêu tên.
(d) 4c: chuẩn của repo này là các bảng nội bộ bật RLS + **0 policy** (chỉ service key chạm được): `portrait_cache`, `media_assets`, `media_posts`, `seeding_groups`, `seeding_drafts`, `brand_voice_docs`, `autopilot_actions` (riêng bảng này có 1 policy ĐỌC cho admin JWT), `events`, `user_attribution` (đọc chỉ admin). Policy nào cấp cho `anon`/`public` mà `cmd` là INSERT/UPDATE/DELETE/ALL → 🔴 ĐỎ. Policy SELECT cho anon thì nêu ra hỏi lại, đừng tự kết luận là sai.
(e) 4d: `portrait_cache`/bucket `portraits` public = ĐÚNG THIẾT KẾ (ảnh phải có URL công khai cho og:image và cho Instagram Graph API). Bucket MỚI nào `public=true` → nêu ra hỏi.
(f) 4e: `topup` và `use_*`/`chat` là bình thường. `admin_grant` xuất hiện mà Henry không nhớ đã cấp → hỏi thẳng. `signup_bonus` vọt bất thường so với số đăng ký thật → nghi farm (đối chiếu `thiet_bi_cay`/`referral_bat_thuong` ở mục a).
(g) 4f: đăng nhập admin THẤT BẠI lặp lại, hoặc email lạ ngoài `admin_users`, hoặc `method` lạ → nêu. `method='google-resume'` là lượt khôi phục phiên tự động, KHÔNG phải đăng nhập mới — nhiều dòng loại này là bình thường.
(h) NỢ BẢO MẬT ĐÃ BIẾT, nhắc lại MỘT dòng mỗi tuần (đừng nhắc mỗi ngày): edge function `youtube-upload` còn hardcode `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` làm giá trị mặc định ngay trong source — nên rotate + chuyển hẳn sang env.

⏰ JOB
`last_status='error'` → 🔴, kèm `last_note`. `skip` từ 3 lượt liên tiếp trở lên cũng phải nêu: skip nghĩa là job chạy đều nhưng KHÔNG làm được việc gì.
Quá hạn = quá 1.5× chu kỳ kỳ vọng. Lịch (giờ VN — cron Vercel khai bằng UTC, lệch 7 tiếng):
- Liên tục: health-check mỗi 30 phút · anomaly-alerts mỗi 3 giờ
- Hằng ngày: cron-push 07:00 · cron-daily-push 07:00 · ops-digest 07:30 · cmo-digest 08:00 · seeding-build 08:30 · prune-anon-trial 09:00 · media-build 09:30 · yt-drain 11:00 · auto-pipeline 07:00 (pg_cron, đọc ở NHÓM 3 — nó KHÔNG ghi vào `cron_runs`, vắng mặt ở nhóm 2 là bình thường)
- Cụm trong ngày: cron-master-write 03·09·13·17·23h (gap lớn nhất 6h) · cron-khao-luan 10·18·22h (gap lớn nhất 12h — đừng lấy 8h)
- Hằng tuần (08:00 VN): autopilot-price T2 · keyword-suggest T3 · autopilot-promo T4 · topic-topup T4 · autopilot-nudge T6 · content-pack CN
Job TUẦN chạy 0 lượt trong 24h là BÌNH THƯỜNG — chỉ tính trễ khi `last_run` quá 10,5 ngày.
⚠️ `pg_cron` báo `succeeded` chỉ nghĩa là "gọi HTTP xong", KHÔNG đo kết quả thật — đừng đọc thành job chạy tốt.

📣 PHÂN PHỐI
`channel_error_rate`: >8% trên mẫu ≥20 lượt → đỏ; 2–8% → vàng; kênh 0 lượt thì ghi "chưa có lượt", không chấm điểm.
`media_posts`: `queued` dồn tăng đều ngày qua ngày là dấu hiệu `social.publish_daily` nhỏ hơn `build_daily × số kênh` — nêu kèm phép tính. `error` mới xuất hiện → nêu nguyên nhân trong dòng lỗi.
`van_dap.yt_status`: kho `yt_error` lớn (~86 dòng) là TỒN ĐỌNG ĐÃ BIẾT — căn nguyên là OAuth consent screen còn ở chế độ **Testing** trong Google Cloud nên refresh token hết hạn sau 7 ngày; cấp token mới chỉ vá triệu chứng, phải PUBLISH APP. Chỉ báo khi con số TĂNG so với mức đã biết, và nhắc thẳng căn nguyên để lần sau không đi cấp lại token rồi tắc tiếp.

🤖 AUTOPILOT & CẤU HÌNH
`autopilot_actions` `mode='shadow'` = ĐÚNG THIẾT KẾ (tính + ghi log, không hành động thật) — KHÔNG phải lỗi, đừng báo động. Chỉ nêu khi thấy `mode='live'` mà Henry chưa chủ động bật, hoặc khi shadow im hoàn toàn nhiều tuần (nghĩa là cron không chạy chứ không phải không có việc).
`app_config` — soi các khoá phanh, nêu MỘT dòng nếu khác mức kỳ vọng: `marketing.autopilot_enabled` (kỳ vọng false) · `social.autopost_enabled` · `viral.free_gen_daily_cap` (6) · `content.brand_check.mode` (warn) · `chat.cost` (5) · `chat.provider_routes` (`_default` và `laso` đều `gemini`) · `credits.signup_bonus_variants` ([25]) · `referral.signup_bonus_referrer` (15) · `referral.signup_reward_cap` (15) · `anon.rail_*`.
⚠️ Khoá `credits.vnd_per_credit` ĐÃ BỊ GỠ CÓ CHỦ ĐÍCH — nếu nó XUẤT HIỆN LẠI thì báo, vì có code đang đọc lại khoá chết và im lặng rơi về mặc định sai 20%.

⏳ HẠN CHÓT
Model ảnh `gpt-image-1` bị OpenAI tắt **23/10/2026**. Site đã chuyển mặc định sang `gpt-image-2`, nhưng env `OPENAI_IMAGE_MODEL` có thể pin ngược lại. Khi còn **dưới 30 ngày** thì nhắc một dòng đếm ngược; còn nhiều hơn thì im.

────────────────────────────────────────────────
ĐỊNH DẠNG BÁO CÁO
────────────────────────────────────────────────

Dòng đầu là MỘT kết luận: 🟢 BÌNH THƯỜNG / 🟡 CÓ MỤC CẦN ĐỂ MẮT / 🔴 CÓ SỰ CỐ.
Rồi 7 khối theo đúng thứ tự: 🔒 BẢO MẬT · 💰 TIỀN · 🩺 TOOL · ⏰ JOB · 📣 PHÂN PHỐI · 🤖 AUTOPILOT & CẤU HÌNH · ⏳ HẠN CHÓT.
(Bảo mật và tiền đứng trước vì đó là thứ hỏng thì không lấy lại được.)

Khối nào sạch thì ĐÚNG MỘT DÒNG — nhưng VẪN PHẢI NÊU, vì đây là bản điểm danh: im lặng phải có nghĩa. Khối nào có vấn đề mới nở ra 2–5 dòng.
Ngày sạch: dưới 250 từ. Không tô vẽ, không khuyến nghị chung chung, không lặp lại số đã nêu ở khối trên.

Cuối cùng, nếu có mục 🔴/🟡: một khối "VIỆC CẦN LÀM" liệt kê đúng việc tiếp theo cho từng mục, kèm tên bảng/hàm cần soi, xếp theo mức nguy (bảo mật → tiền → tool hỏng → job trễ). Nếu tất cả xanh: kết thúc luôn, không thêm gì.

TUYỆT ĐỐI không bịa số. Không suy ra con số từ trí nhớ hay từ tài liệu — chỉ dùng thứ truy vấn vừa trả về.
```
