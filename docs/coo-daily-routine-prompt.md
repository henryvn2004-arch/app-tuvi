# Prompt cho Routine "Báo cáo COO hằng ngày 07:45 VN"

Bối cảnh và lý do thiết kế: xem **§7 của `COO-ORCHESTRATOR-SCOPE.md`**.
Anh em với `cmo-daily-routine-prompt.md`: một bản lo **vận hành**, bản kia lo
**tăng trưởng**.

## 🔄 Đảo luật: từ "CẤM đọc ops_digest" sang "ĐỌC ops_digest"

Bản đầu của prompt này **tính LIVE toàn bộ** và cấm đọc event `ops_digest`, vì
routine chạy **07:00** — trước cron `ops-digest` 07:30 — nên dòng mới nhất luôn
là của **hôm qua**.

Nay luật đó lật ngược, vì hai chuyện đã đổi:

1. **Cron đã kiểm đủ.** `lib/ops/digest.ts` nay có 7 khối (bảo mật · tiền · tool
   · job · phân phối · cổng · env), tức mọi thứ prompt từng tự tính.
2. **Routine không gửi được gì.** Nó chỉ sinh chữ trong một phiên; token bot nằm
   trên Vercel. Đường ra Telegram là của cron, không phải của nó.

⇒ Để routine tính lại một lần nữa là **nuôi hai nguồn cho cùng một sự việc** —
đúng cái bệnh đã trả giá ở can chi ngày (#409) và ở digest-vs-cảnh-báo hôm 30/07.
Nên routine **dời xuống 07:45**, đọc bản cron vừa dựng, và chỉ làm phần cron
không làm được: đối chiếu, so với hôm qua, phán đoán.

Giống hệt cách CMO đang chạy (cron 08:00 → routine 08:10). Hai báo cáo nay cùng
một kiến trúc.

## ⚠️ Đổi lại thì phải kiểm TƯƠI

Đọc event thì dính đúng cái bẫy CMO đã sập: sáng 07/08 routine CMO bắn lúc 06:51
thay vì 08:10 — **trước** cả cron nó phụ thuộc — và suýt phát một 🔴 hoàn toàn
oan. Lịch routine **tự trôi được**.

Nên bước đầu tiên của prompt là **xem đồng hồ**, không phải đọc số.

## Cấu hình

| Trường | Giá trị |
|---|---|
| Tên | Báo cáo COO hằng ngày (7h45 sáng) |
| Lịch | **07:45 giờ VN** — qua API thì cron UTC là `45 0 * * *` |
| Bind | **không** đặt `persistent_session_id`, **không** đặt `create_new_session_on_fire` → bind vào phiên đang tạo, để mở lại được trên app |
| Connectors / notifications | **bỏ cả hai** (org từ chối `connectors`; server từ chối `notifications` với routine bind phiên) |

⚠️ Đừng dùng `CronCreate`: nó chỉ sống trong phiên và tự hết hạn sau 7 ngày.

⚠️ **Routine bind phiên KHÔNG có push.** Bản Telegram của cron 07:30 mới là bản
tới tay ngay; bản này nằm chờ trong thread. Đó là đánh đổi cố ý — xem §7.

---

## Prompt (chép nguyên khối dưới đây)

```text
Đọc lại Báo cáo Vận Hành sáng nay của tuviminhbao.com rồi soi thêm. Tiếng Việt, xưng "tao/mày", ngắn gọn.

Nguồn: Supabase MCP, project `dciwkfdqhhddeymlisey`. Chỉ SELECT/RPC, TUYỆT ĐỐI không ghi/sửa/xoá.

⚠️ KHÔNG CÓ MCP: nếu phiên này không có Supabase MCP thì báo đúng một câu "không truy cập được nguồn dữ liệu, chưa kiểm tra được gì" rồi DỪNG. Tuyệt đối không luận trạng thái hệ thống từ trí nhớ — một bản báo cáo bịa trông y hệt bản thật.

Cron `ops-digest` chạy 07:30 VN đã dựng sẵn bản đầy đủ 7 khối và gửi Telegram. Routine này chạy 07:45, tức SAU nó. Việc của mày KHÔNG phải tính lại — mà là kiểm bản đó còn tươi, rồi nói thêm cái nó không nói được.

=== TRUY VẤN 1 — bản digest sáng nay + hôm qua (để so) ===
select now() at time zone 'Asia/Ho_Chi_Minh' as gio_chay_vn,
       ts at time zone 'Asia/Ho_Chi_Minh' as digest_gio_vn,
       (meta->>'has_issues')::bool as co_van_de,
       (meta->>'delivered')::bool as da_gui_telegram,
       meta->>'text' as bao_cao
from events where event_type='ops_digest' order by ts desc limit 2;

⏰ XEM ĐỒNG HỒ TRƯỚC, đừng đọc số trước:
- `digest_gio_vn` là HÔM NAY và sớm hơn `gio_chay_vn` ⇒ bình thường, đọc tiếp.
- `digest_gio_vn` là hôm qua VÀ `gio_chay_vn` đã qua 08:00 ⇒ cron ops-digest CHẾT. Nói THẲNG lên đầu, ghi rõ bản đang đọc là của ngày nào, và ĐỪNG trình bày số cũ như số hôm nay.
- `gio_chay_vn` SỚM HƠN 07:30 ⇒ routine bắn sớm, cron chưa chạy. Đây KHÔNG phải sự cố — ghi một dòng "chạy sớm, digest hôm nay chưa có" rồi chuyển sang tính LIVE bằng truy vấn 2. Đừng đổ cho cron. Bộ dò đổ lỗi nhầm chỗ còn tệ hơn bộ dò im, vì nó cử người đi sửa thứ không hỏng.

=== TRUY VẤN 2 — chỉ chạy khi digest sáng nay CHƯA CÓ hoặc ĐỌC HỤT ===
select 'tool_health' as src, to_jsonb(t) as data from tool_health(24) t
union all select 'payment_reconcile', to_jsonb(r) from payment_reconcile(30) r
union all select 'security_audit', security_audit(300,5,10)::jsonb
union all select 'channels', jsonb_agg(to_jsonb(c)) from channel_error_rate(24) c;

=== TRUY VẤN 3 — job, luôn chạy (digest chỉ tóm tắt, đây là chi tiết) ===
select job_key,
       count(*) filter (where started_at > now()-interval '24 hours') as runs_24h,
       count(*) filter (where status='error' and started_at > now()-interval '24 hours') as err_24h,
       max(started_at) at time zone 'Asia/Ho_Chi_Minh' as last_run_vn,
       (array_agg(status order by started_at desc))[1] as last_status,
       (array_agg(note order by started_at desc))[1] as last_note
from cron_runs group by job_key order by last_run desc nulls last;

--- CÁCH ĐỌC ---

📋 Chép lại nguyên khối `bao_cao` của dòng mới nhất. Đó là bản cron đã dựng — KHÔNG viết lại, KHÔNG tóm tắt lại, KHÔNG đổi số.

🔍 RỒI THÊM phần cron không làm được:

1. SO VỚI HÔM QUA. Có 2 dòng ở truy vấn 1 — chỉ ra cái gì MỚI xuất hiện và cái gì đã BIẾN MẤT so với bản hôm qua. Cron chỉ chụp một khoảnh khắc, nó không biết chiều hướng. Đây là phần giá trị nhất của mày.
2. `da_gui_telegram = false` ⇒ digest dựng được nhưng KHÔNG đẩy sang Telegram. Nêu riêng — đó là hỏng ở ĐƯỜNG BÁO CÁO, khác hẳn hỏng ở hệ thống, và nếu không ai nói thì chính cái im lặng đó bị hiểu nhầm là "sáng nay yên ổn".
3. JOB: digest chỉ đếm số job trễ. Từ truy vấn 3, nêu ĐÍCH DANH job nào `last_status='error'` kèm `last_note`, và job nào `last_run_vn` lệch xa lịch của nó. Lịch (giờ VN): health-check mỗi 30 phút · anomaly-alerts mỗi 3 giờ · cron-push 07:00 · cron-daily-push 07:00 · ops-digest 07:30 · cmo-digest 08:00 · seeding-build 08:30 · prune-anon-trial 09:00 · media-build 09:30 · yt-drain 11:00 · cron-master-write 03·09·13·17·23h · cron-khao-luan 10·18·22h · autopilot-price T2 · keyword-suggest T3 · autopilot-promo T4 · topic-topup T4 · autopilot-nudge T6 · content-pack CN. Job TUẦN chạy 0 lượt/24h là BÌNH THƯỜNG.
4. Việc tay đang treo mà digest nhắc: nếu thấy "KÊNH BỊ CHẶN" thì nhắc gọn một dòng là còn thiếu FB_PAGE_ID/FB_PAGE_ACCESS_TOKEN + quyền pages_manage_posts. Đừng dựng thành 🔴 mới mỗi sáng — nó là việc đã biết, chờ người làm.

--- ĐỊNH DẠNG ---
Một dòng kết luận đầu tiên (🟢/🟡/🔴), rồi khối 📋 (bản của cron), rồi khối 🔍 (phần mày thêm). Ngày sạch: dưới 200 từ cho phần 🔍.
Không lặp lại số đã có trong bản của cron. Không khuyến nghị chung chung.
TUYỆT ĐỐI không bịa số — chỉ dùng thứ truy vấn vừa trả về.
```
