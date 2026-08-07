# Prompt cho Routine "Báo cáo CMO hằng ngày 08:10 VN"

Cặp song sinh của `coo-daily-routine-prompt.md`: một bản lo **vận hành** (07:00),
bản này lo **tăng trưởng** (08:10).

Cấu hình routine (MCP `claude-code-remote` → `create_trigger`):

| Trường | Giá trị |
|---|---|
| Tên | Báo cáo CMO hằng ngày (8h10 sáng) |
| Cron | `10 1 * * *` — **UTC**, tức 08:10 giờ VN |
| Kiểu | **Bind vào phiên hiện có** — không đặt `persistent_session_id`, không đặt `create_new_session_on_fire` |
| Connectors | **Bỏ trống** — org này không cho khai tham số đó |
| Notifications | **Bỏ trống** — server chỉ nhận cho routine tạo phiên mới |

⚠️ Đừng dùng `CronCreate`: nó chỉ sống trong phiên và tự hết hạn sau 7 ngày.

## ⏱️ Vì sao 08:10 — và vì sao bẫy thời gian ở đây NGƯỢC với COO

Cron `cmo-digest` chạy **01:00Z (08:00 VN)** và ghi sẵn một dòng `events`
(`event_type='cmo_digest'`) mang cả bản tóm tắt LLM lẫn **snapshot GA4 thô**
trong `meta.ga4`. Routine chạy **10 phút sau** nên dòng đó là **của HÔM NAY** —
khác hẳn COO (chạy 07:00, trước `ops-digest` 07:30, nên phải cấm đọc event cũ).

Đây cũng là cách DUY NHẤT phiên Claude Code chạm được GA4: key GA4 nằm trên
Vercel, không có trong container. Cron đọc GA4 rồi ghi vào `events`; routine đọc
lại. Đừng đi tìm `scripts/ga4.mjs` — nó cần credential mà phiên này không có.

### 🪤 Lịch của routine TỰ TRÔI — bẫy này đã sập một lần
Sáng **07/08 routine bắn lúc 06:51 VN** thay vì 08:10 (sớm 1h19), tức **trước
cả lượt `cmo-digest` 08:00**. Luật cũ ("digest cũ hơn 2 tiếng ⇒ cron chết") khớp
điều kiện và suýt phát một cái 🔴 hoàn toàn oan — trong khi `cron_runs` cho thấy
`cmo-digest` chạy `ok` 5/5 lượt gần nhất, đúng giờ.

**Bài học: luật ">2 tiếng" ngầm giả định routine luôn chạy SAU cron.** Giả định
đó do lịch bảo đảm, mà lịch thì trôi được. Nên luật nay phải **xem đồng hồ
trước** (xem nhánh ⏰ trong prompt) — bộ dò đổ lỗi nhầm chỗ còn tệ hơn bộ dò im,
vì nó cử người đi sửa thứ không hỏng.

## 📌 Baseline đo thật lúc lập (2026-08-05, cửa sổ 7 ngày)

| Khối | Số | Ghi chú |
|---|---|---|
| Phễu | 414 khách · 3 đăng ký · 3 kích hoạt · 4 ý định nạp · **1 trả tiền** | mẫu quá nhỏ để nói phần trăm |
| Tiền | **199.000đ thật**, 1 giao dịch `bank` | 829đ/Lượng |
| Viral | K = **0**, 5 lượt chia sẻ, 4 lượt mở, 1 CTA, **0 referral** | 5 lượt chia sẻ chưa đủ để kết luận |
| Biên LN | `que-phuc-hy` **325.160đ / 84 lượt** | **một lần duy nhất** — batch vẽ 64 tranh quẻ |
| Kênh chat | cả 4 nền tảng `total=0` | "chưa có lượt", KHÔNG phải "khoẻ" |
| Campaign UTM | rỗng | chưa gắn `utm_campaign` vào link quảng bá nào |

Neo baseline là để routine **không kêu y hệt nhau mỗi sáng** về những chuyện đã
kết luận xong. Bộ dò kêu nhầm mỗi ngày thì chẳng mấy chốc bị ngó lơ — hỏng đúng
như khi nó im lặng.

---

## Prompt (chép nguyên khối dưới đây)

```text
Báo cáo CMO TĂNG TRƯỞNG hằng ngày cho tuviminhbao.com. Viết bằng tiếng Việt, ngắn gọn, đọc trong 30 giây.

Nguồn dữ liệu DUY NHẤT: Supabase MCP, project `dciwkfdqhhddeymlisey`. Chỉ SELECT/RPC, TUYỆT ĐỐI không ghi/sửa/xoá dữ liệu. Không cần đọc repo, không cần chạy build/test.

⚠️ GA4: key GA4 chỉ có trên Vercel, KHÔNG có trong phiên này. Đừng chạy `scripts/ga4.mjs`, đừng gọi API Google. Số GA4 lấy từ `meta.ga4` của truy vấn 1 — đó là snapshot do cron ghi sẵn.

=== TRUY VẤN 1 — Digest sáng nay (cron đã dựng sẵn, KHÔNG dựng lại) ===
select now() at time zone 'Asia/Ho_Chi_Minh' as gio_vn,
       ts at time zone 'Asia/Ho_Chi_Minh' as digest_gio_vn,
       meta->'ga4' as ga4, meta->>'text' as digest_text
from events where event_type='cmo_digest' order by ts desc limit 1;

=== TRUY VẤN 2 — Phễu · Tiền · Nguồn (7 ngày, kèm 7 ngày liền trước để so) ===
select 'funnel_7d' as src, to_jsonb(f) as data from marketing_funnel(now()-interval '7 days', now()) f
union all select 'funnel_prev', to_jsonb(f) from marketing_funnel(now()-interval '14 days', now()-interval '7 days') f
union all select 'revenue_7d', to_jsonb(r) from marketing_revenue(now()-interval '7 days', now()) r
union all select 'sources_7d', jsonb_agg(to_jsonb(s)) from marketing_sources(now()-interval '7 days', now()) s
union all select 'campaigns_7d', jsonb_agg(to_jsonb(c)) from marketing_campaigns(now()-interval '7 days', now()) c;

=== TRUY VẤN 3 — Viral · Biên LN · Giữ chân ===
select 'viral_7d' as src, to_jsonb(v) as data from viral_loop_funnel(now()-interval '7 days', now()) v
union all select 'margin_7d', to_jsonb(m) from dashboard_margin(now()-interval '7 days', now()) m
union all select 'engagement', to_jsonb(e) from dashboard_engagement(30) e
union all select 'at_risk', to_jsonb(count(*)) from dashboard_at_risk(14,3,50) a;

--- CÁCH ĐỌC & NGƯỠNG BÁO ĐỘNG ---

🔢 LUẬT SỐ NHỎ (quan trọng nhất, áp cho MỌI khối): phễu tuần này cỡ 3 đăng ký / 1 người trả tiền. Ở cỡ đó, TUYỆT ĐỐI KHÔNG nói phần trăm tăng/giảm — "tăng 200%" của 1→3 người là câu nói dối bằng số thật. Nêu số tuyệt đối kèm số tuần trước, hết. Chỉ được dùng % khi mẫu ≥ 30 ở CẢ HAI kỳ.

📊 PHỄU (`marketing_funnel`): bậc `visitors` là khách đo được bằng track.js NỘI BỘ (đã lọc `navigator.webdriver`), còn `ga4.sessions` ở truy vấn 1 KHÔNG lọc được hết bot. Hai số lệch nhau là BÌNH THƯỜNG, đừng gọi là "mất dữ liệu". Baseline 05/08: nội bộ 414 vs GA4 1.039. Chỉ báo động khi `signups` hoặc `paid` về 0 trong khi tuần trước > 0.
   ⚠️ `ga4.landing` mà thấy `/xem-tuoi.html` và `/xem-lam-an.html` gần bằng nhau và cao bất thường (~300 mỗi trang) thì đó là dấu vết CI Playwright chạy vào prod, KHÔNG phải người thật — nói thẳng ra, đừng đem khoe là traffic.

💰 TIỀN (`marketing_revenue`): chỉ tin `real_vnd` (tiền đã đối chiếu). `estimated_vnd` là suy ra từ số Lượng, phải gọi đúng tên là ước lượng. Baseline: 199.000đ / 1 giao dịch `bank`. Doanh thu 0đ trong 7 ngày → 🟡, KHÔNG phải 🔴 (site đang ở giai đoạn gần như chưa có doanh thu, đây là thực trạng đã biết chứ không phải sự cố mới).

📡 NGUỒN (`marketing_sources` / `marketing_campaigns`): `campaigns` rỗng là ĐÚNG THỰC TRẠNG — chưa có link quảng bá nào gắn `utm_campaign`. Ghi một dòng gọn, đừng báo động, cũng đừng khuyên chung chung "nên chạy chiến dịch". Nguồn `legacy` = user đăng ký trước khi có tracking, không phải một kênh.

🔁 VIRAL (`viral_loop_funnel`): `k_factor` = 0 là BASELINE, không phải sự cố — vòng lặp mới nối xong và lượng chia sẻ còn quá mỏng. CHỈ được kết luận "không lan được" khi `share_acts` ≥ 30 trong cửa sổ mà `ref_signups` vẫn 0. Dưới ngưỡng đó thì báo cáo trung thực: "N lượt chia sẻ, M lượt mở, chưa đủ mẫu để chốt K". Có `ref_signups` > 0 lần đầu tiên → nói to, đó là mắt xích lâu nay đứt.

🧮 BIÊN LN (`dashboard_margin`): `que-phuc-hy` ~325.000đ / 84 lượt là **batch vẽ 64 tranh quẻ, chạy MỘT LẦN hồi đầu tháng 8** — không phải chi phí định kỳ, KHÔNG báo động, và phải tự rụng khỏi cửa sổ 7 ngày sau 12/08; còn thấy sau mốc đó thì mới đáng hỏi. `chat_cost_vnd = 0` KHÔNG có nghĩa là rail miễn phí: bảng chi phí chỉ đo Anthropic, mà rail đang chạy Gemini — nên đừng tính "biên LN 100%". Đáng báo là khi một `tool_id` MỚI nhảy lên đầu bảng chi phí.

📉 GIỮ CHÂN (`dashboard_engagement`): `dau_today` lúc 08:10 sáng mới đếm được ~1 tiếng của ngày → LUÔN thấp, TUYỆT ĐỐI không so nó với `dau_yesterday` rồi kêu "sụt". Dùng `wau` vs `wau_prev`. `mau_prev = 0` là do chưa đủ 60 ngày dữ liệu, bỏ qua, đừng tính % MAU. `at_risk` là số user còn số dư mà im lặng 14 ngày — > 0 thì nêu con số, đó là danh sách đáng nhắc.

--- ĐỊNH DẠNG BÁO CÁO ---

Mở đầu bằng MỘT dòng kết luận: 🟢 BÌNH THƯỜNG / 🟡 CÓ MỤC CẦN ĐỂ MẮT / 🔴 CÓ SỰ CỐ.
Rồi 5 khối 📊 PHỄU · 💰 TIỀN · 📡 NGUỒN · 🔁 VIRAL · 🧮 CHI PHÍ, mỗi khối 1–3 dòng.
Mục nào bình thường thì MỘT dòng gọn là đủ — vẫn phải nêu, vì đây là bản điểm danh: im lặng phải có nghĩa.
Bản tóm tắt LLM trong `digest_text` (truy vấn 1) chỉ để ĐỐI CHIẾU. Nó do một model khác viết và đã từng phóng đại bằng phần trăm trên mẫu 1–3 người. Thấy nó nói khác số thô thì tin SỐ THÔ và nói rõ chỗ vênh.
Cuối cùng, nếu có mục 🔴/🟡: nêu đúng MỘT việc cần làm tiếp, cụ thể, kèm bảng/hàm cần soi. Không khuyến nghị marketing chung chung kiểu "tăng cường nội dung", "đẩy mạnh SEO" — không có số đỡ thì đừng nói.
Nếu tất cả xanh: kết thúc luôn, không thêm gì.

⏰ DIGEST CŨ — XEM ĐỒNG HỒ TRƯỚC KHI ĐỔ CHO CRON. `gio_vn` ở truy vấn 1 là giờ VN thật lúc chạy. Cron `cmo-digest` ghi dòng của nó lúc **08:00 VN**, nên:
   • `gio_vn` **trước 08:05** → routine đã bắn SỚM hơn lịch 08:10 của chính nó, digest hôm nay CHƯA tới giờ. Đây là lệch lịch của ROUTINE, KHÔNG phải cron chết. Báo 🟡 kèm giờ thật, vẫn dựng báo cáo từ truy vấn 2+3, dùng GA4 của dòng cũ nhưng **dán nhãn rõ là số của HÔM QUA**.
   • `gio_vn` **sau 08:05** mà `digest_gio_vn` vẫn cũ hơn 2 tiếng → lúc đó mới nghi cron. Nhưng phải soi sổ trước khi kết luận: `select job_key, started_at, status, note from cron_runs where job_key='cmo-digest' order by started_at desc limit 5;` — thấy `status='ok'` liên tiếp thì cron vẫn chạy, hỏng nằm ở chỗ khác, ĐỪNG báo 🔴 sai địa chỉ. Chỉ khi sổ thiếu lượt hôm nay hoặc `status='error'` mới báo 🔴, rồi dựng báo cáo từ truy vấn 2+3 (bỏ phần GA4, nói rõ là không có GA4 hôm nay).
Nếu một truy vấn lỗi: nói THẲNG là không đọc được phần đó (đừng bỏ qua im lặng — mù mà tưởng khoẻ chính là lỗi mà hệ giám sát này sinh ra để tránh).
```
