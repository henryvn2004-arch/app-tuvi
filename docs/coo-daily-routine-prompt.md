# Prompt cho Routine "Báo cáo COO hằng ngày 07:00 VN"

Bối cảnh, lý do thiết kế và trạng thái: xem **§7 của `COO-ORCHESTRATOR-SCOPE.md`**.

Cấu hình routine (Claude Code → Routines):

| Trường | Giá trị |
|---|---|
| Tên | Báo cáo COO hằng ngày (7h sáng) |
| Cron | `0 0 * * *` — **UTC**, tức 07:00 giờ VN |
| Kiểu | Tạo phiên mới mỗi lần chạy (`create_new_session_on_fire: true`) |
| Thông báo | Push |
| Connectors | **Bỏ trống** — org này không cho khai tham số đó |

⚠️ Đừng dùng `CronCreate`: nó chỉ sống trong phiên và tự hết hạn sau 7 ngày.

---

## Prompt (chép nguyên khối dưới đây)

```text
Báo cáo COO VẬN HÀNH hằng ngày cho tuviminhbao.com. Viết bằng tiếng Việt, ngắn gọn, đọc trong 30 giây.

Nguồn dữ liệu DUY NHẤT: Supabase MCP, project `dciwkfdqhhddeymlisey`. Chỉ SELECT/RPC, TUYỆT ĐỐI không ghi/sửa/xoá dữ liệu. Không cần đọc repo, không cần chạy build/test.

⚠️ BẪY THỜI GIAN: routine này chạy 07:00 VN, TRƯỚC cron `ops-digest` (07:30 VN). Event `ops_digest` mới nhất trong bảng `events` là bản của HÔM QUA — ĐỪNG đọc nó rồi báo cáo như số của hôm nay. Luôn tính LIVE từ 3 truy vấn dưới.

=== TRUY VẤN 1 — Tool · Tiền · Bảo mật ===
select 'tool_health' as src, to_jsonb(t) as data from tool_health(24) t
union all
select 'payment_reconcile', to_jsonb(r) from payment_reconcile(30) r
union all
select 'security_audit', security_audit(300,5,10)::jsonb;

=== TRUY VẤN 2 — Job (Vercel cron, qua cron_runs) ===
select job_key,
       count(*) filter (where started_at > now()-interval '24 hours') as runs_24h,
       count(*) filter (where status='error' and started_at > now()-interval '24 hours') as err_24h,
       max(started_at) as last_run,
       (array_agg(status order by started_at desc))[1] as last_status,
       (array_agg(note order by started_at desc))[1] as last_note
from cron_runs group by job_key order by last_run desc nulls last;

=== TRUY VẤN 3 — Job pg_cron (auto-pipeline KHÔNG ghi cron_runs) ===
select * from ops_pgcron_runs(20);

--- CÁCH ĐỌC & NGƯỠNG BÁO ĐỘNG ---

🩺 TOOL (`tool_health`): `errors` là lỗi HỆ THỐNG, `user_errors` là lỗi người dùng (hết Lượng, sai input) — KHÔNG phải sự cố, đừng báo động. Chỉ báo khi `errors` > 0. `p95_ms` cao ở 2 tool sinh ảnh (~50s) là BÌNH THƯỜNG. Nếu bảng rỗng: ghi "chưa có lượt chạy nào trong 24h" — KHÔNG được đọc thành "mọi tool đều khoẻ".

💰 TIỀN (`payment_reconcile`): baseline đã biết = `chan-dung-vo-chong` 2 lượt chưa giao, 44 Lượng — đó là lượt test của chính Henry hồi tháng 7, KHÔNG phải khách thật, KHÔNG cần hoàn. Chỉ báo động khi tổng `credits_at_risk` > 44 HOẶC xuất hiện `tool_id` mới. Bằng đúng 44 thì ghi một dòng "vẫn 44 Lượng cũ (đã biết)".

🔒 BẢO MẬT (`security_audit`): cả 5 mảng (`ham_ho_cho_anon`, `bom_su_kien`, `thiet_bi_cay`, `referral_bat_thuong`, `lech_so_du`) PHẢI rỗng. Bất kỳ mảng nào có phần tử → 🔴 ĐỎ, nêu rõ mảng nào và nội dung. `ham_ho_cho_anon` không rỗng là nghiêm trọng nhất (hàm RPC hở cho anon — đúng lỗ CRIT-1 đã vá).

⏰ JOB: `last_status='error'` → đỏ, kèm `last_note`. Quá hạn = quá 1.5× chu kỳ kỳ vọng (giờ VN):
- health-check: mỗi 30 phút · anomaly-alerts: mỗi 3 giờ
- Hằng ngày: cron-push 07:00 · cron-daily-push 07:00 · ops-digest 07:30 · cmo-digest 08:00 · seeding-build 08:30 · prune-anon-trial 09:00 · media-build 09:30 · yt-drain 11:00 · auto-pipeline 07:00 (pg_cron, đọc ở truy vấn 3)
- Cụm trong ngày: cron-master-write 03·09·13·17·23h (gap lớn nhất 6h) · cron-khao-luan 10·18·22h (gap lớn nhất 12h)
- Hằng tuần: autopilot-price T2 · keyword-suggest T3 · autopilot-promo T4 · topic-topup T4 · autopilot-nudge T6 · content-pack CN (đều 08:00 VN)
Job tuần chạy 0 lượt trong 24h là BÌNH THƯỜNG — chỉ tính trễ khi `last_run` quá 10,5 ngày.

--- ĐỊNH DẠNG BÁO CÁO ---

Mở đầu bằng MỘT dòng kết luận: 🟢 BÌNH THƯỜNG / 🟡 CÓ MỤC CẦN ĐỂ MẮT / 🔴 CÓ SỰ CỐ.
Rồi 4 khối 🩺 TOOL · ⏰ JOB · 💰 TIỀN · 🔒 BẢO MẬT, mỗi khối 1–3 dòng.
Mục nào bình thường thì MỘT dòng gọn là đủ — vẫn phải nêu, vì đây là bản điểm danh: im lặng phải có nghĩa. Không tô vẽ, không khuyến nghị chung chung.
Cuối cùng, nếu có mục 🔴/🟡: nêu đúng việc cần làm tiếp, kèm bảng/hàm cần soi. Nếu tất cả xanh: kết thúc luôn, không thêm gì.

Nếu một truy vấn lỗi: nói THẲNG là không đọc được phần đó (đừng bỏ qua im lặng — mù mà tưởng khoẻ chính là lỗi mà hệ giám sát này sinh ra để tránh). Nếu phiên này KHÔNG có Supabase MCP thì báo đúng một câu "không truy cập được nguồn dữ liệu, chưa kiểm tra được gì" rồi dừng — tuyệt đối không đoán trạng thái hệ thống từ trí nhớ.
```

## 🪤 Vì sao phải có nhánh "không có Supabase MCP"

Routine này **tạo phiên mới mỗi lượt**, mà tham số `connectors` thì org từ chối
⇒ không có cách nào bảo đảm phiên đó được cấp Supabase MCP. Thiếu nhánh này,
lượt chạy mất MCP sẽ rơi vào chỗ tệ nhất: model **luận trạng thái hệ thống từ
trí nhớ** rồi phát ra một bản báo cáo trông y hệt bản thật.

Cùng một họ với luật "bảng rỗng ≠ mọi tool đều khoẻ" ở khối 🩺: bộ giám sát nói
sai còn nguy hơn bộ giám sát im, vì cái im thì người ta còn nghi.

## ✅ Luật của COO miễn nhiễm với "lịch trôi"

`cmo-daily-routine-prompt.md` ghi lại một bẫy đã sập thật: sáng 07/08 routine CMO
bắn lúc 06:51 thay vì 08:10, tức **trước** cron nó phụ thuộc, và suýt phát một
cảnh báo oan.

COO **không dính** vì luật ở đây là *luôn tính LIVE, cấm đọc event `ops_digest`*
— trôi sớm hay muộn thì kết quả vẫn đúng. Nhạy với trôi là những prompt phải ĐỌC
sản phẩm của một cron khác; COO cố ý không đọc gì cả. Giữ tính chất này khi sửa
prompt: đừng "tối ưu" bằng cách cho nó đọc `ops_digest` cho nhanh.
