# Prompt cho Routine "Báo cáo CMO hằng ngày 08:10 VN"

Anh em với `coo-daily-routine-prompt.md`. Bối cảnh: §7 của
`COO-ORCHESTRATOR-SCOPE.md`.

## Vì sao thay bản cũ

Routine CMO cũ chạy tốt, nhưng **prompt của nó không sửa được, vĩnh viễn** —
`update_trigger` từ chối vì nó bind vào phiên không thuộc phiên gọi. Đã đụng
tường này một lần: muốn thêm bước đọc GA4 vào prompt mà không được, cuối cùng
phải đi đường vòng là sửa *cron* để ghi GA4 vào DB.

Nặng hơn: bản cũ ra đời **trước** track COO nên không có bước **kiểm `ts` còn
tươi**. Cron `cmo-digest` chết một sáng thì nó đọc dòng mới nhất — của hôm qua —
rồi trình bày như số hôm nay, im lặng. **Một báo cáo đọc số cũ trông y hệt một
báo cáo khoẻ**, không phân biệt được bằng mắt.

## Khác COO một điểm quan trọng — đừng chép luật sang nhau

Cron `cmo-digest` chạy **08:00 VN** và **đã tự viết sẵn nguyên bản báo cáo LLM**
vào `events.meta.text` (kèm `meta.ga4` + `meta.gsc` thô). Routine chạy **08:10**,
tức **SAU** — nên đọc bản đó là ĐÚNG.

Ngược hẳn COO: routine COO chạy 07:00, **TRƯỚC** cron `ops-digest` 07:30, nên ở
đó việc đọc event bị CẤM. Cùng một cái bẫy, hai hướng xử lý ngược nhau.

Đổi lại, ở đây phải kiểm `ts` — xem lý do bên trên.

## Mốc 612 — vì sao nằm trong prompt

`gsc.pagesWithImpressions.count` là con số Henry chốt làm **mốc quyết định hướng
SEO** (#361): đo được **612** cuối tháng 7, hẹn đọc lại sau 2–4 tuần. Bật lên rõ
⇒ mô hình gen trang chạy được; giậm chân ⇒ nút thắt là **thẩm quyền tên miền**,
không phải số lượng trang, và **đừng viết thêm trang**.

Một cái mốc hẹn "đọc lại sau vài tuần" thì rất dễ quên. Nhét vào báo cáo hằng
ngày là cách rẻ nhất để nó tự nhắc. (Đo ngày 05/08: **645**.)

## Cấu hình

| Trường | Giá trị |
|---|---|
| Tên | Báo cáo CMO hằng ngày (8h10 sáng) |
| Lịch | **08:10 giờ VN** — qua API thì cron UTC là `10 1 * * *` |
| Bind | **không** đặt `persistent_session_id`, **không** đặt `create_new_session_on_fire` → bind vào phiên đang tạo |
| Connectors / notifications | **bỏ cả hai** (org từ chối `connectors`; server từ chối `notifications` với routine bind phiên) |

⚠️ **Đừng xoá routine cũ trước.** Chạy song song vài hôm, đọc hai bản cạnh nhau,
đủ tin rồi mới pause bản cũ.

---

## Prompt (chép nguyên khối dưới đây)

```text
Chạy Báo cáo CMO hôm nay cho tuviminhbao.com. Tiếng Việt, ngắn gọn.

Nguồn: Supabase MCP, project `dciwkfdqhhddeymlisey`. CHỈ đọc, không ghi/sửa/xoá.

Cron `cmo-digest` chạy 08:00 VN đã tự viết sẵn báo cáo LLM và lưu vào `events`. Routine này chạy 08:10 — tức SAU nó — nên đọc bản đó là ĐÚNG. Việc của mày KHÔNG phải viết lại bản tóm tắt đó, mà là kiểm nó còn tươi rồi nói thêm cái nó không nói được.

=== TRUY VẤN 1 — bản digest mới nhất ===
select ts, meta->>'text' as bao_cao, meta->'ga4' as ga4, meta->'gsc' as gsc,
       (meta->>'delivered')::bool as da_gui
from events where event_type='cmo_digest' order by ts desc limit 1;

⚠️ KIỂM TƯƠI TRƯỚC TIÊN: nếu `ts` KHÔNG phải hôm nay (giờ VN) → cron cmo-digest đã hỏng. Nói THẲNG điều đó lên đầu báo cáo, ghi rõ bản đang đọc là của ngày nào, và ĐỪNG trình bày số cũ như số hôm nay. Đây là lỗi nặng hơn mọi con số bên dưới.

=== TRUY VẤN 2 — đối chiếu bằng số thô, đừng chỉ tin bản tóm tắt ===
select 'funnel' as k, to_jsonb(marketing_funnel(now()-interval '7 days', now())) as v
union all select 'revenue', to_jsonb(marketing_revenue(now()-interval '7 days', now()))
union all select 'viral',   to_jsonb(viral_loop_funnel(now()-interval '7 days', now()))
union all select 'margin',  to_jsonb(dashboard_margin(now()-interval '7 days', now()));

--- CÁCH ĐỌC ---

📊 Chép lại nguyên khối `bao_cao` (điểm sáng / điểm nghẽn / đề xuất) — đó là bản cron đã viết, không viết lại.

🔍 RỒI THÊM phần cron KHÔNG làm được:
- Đối chiếu `bao_cao` với số thô ở truy vấn 2. Chỗ nào bản tóm tắt nói lệch với số thật thì nêu ra — nó do LLM viết, không phải thánh.
- `gsc.pagesWithImpressions.count`: mốc Henry đã chốt là 612 (đo cuối tháng 7). Đây là số quyết định hướng SEO: bật lên rõ = mô hình gen trang chạy được; giậm chân = vấn đề nằm ở thẩm quyền tên miền, KHÔNG phải thiếu trang, và đừng viết thêm trang. Mỗi ngày báo con số hiện tại kèm chênh lệch so với 612.
- `ga4.sessions` vs `ga4.internalVisitors`: chênh lệch này là đo hụt của tracking nội bộ, KHÔNG phải traffic giảm. Đừng bao giờ đọc thành "khách tụt". Chỉ nêu khi tỉ lệ đo được đổi rõ so với hôm trước.
- `da_gui = false` → digest không gửi được sang Telegram. Nêu riêng, đây là lỗi đường báo cáo.

--- ĐỊNH DẠNG ---
Một dòng kết luận đầu tiên, rồi khối 📊 (bản của cron), rồi khối 🔍 (phần mày thêm). Không quá 400 từ. Không khuyến nghị chung chung kiểu "cần tối ưu SEO" — cron đã nói rồi, đừng lặp.
```
