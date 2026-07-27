# COO Orchestrator — "Quân Sư Vận Hành"

**Trạng thái:** ĐỀ XUẤT (chưa code gì) · **Ngày:** 2026-07-27
**Người đề xuất:** Claude · **Chờ Henry chốt phạm vi + thứ tự**

---

## 0. Một câu định vị

**CMO Orchestrator** trả lời *"việc kinh doanh đang ra sao?"*.
**COO Orchestrator** trả lời *"cái máy đẻ ra những con số đó có còn chạy không?"*

Hai vai này KHÔNG trùng nhau, và chỗ khác nhau quan trọng nhất là:
CMO đọc số để báo cáo, còn **COO phải nghi ngờ chính con số đó** — vì một hệ
thống chết cũng tạo ra dashboard xanh y hệt một hệ thống khỏe. Cái chết im lặng
mới là kẻ thù, không phải cái chết ồn ào.

Bằng chứng cho định vị này không phải lý thuyết — nó nằm ngay trong mục 1.

---

## 1. Audit prod trước khi đề xuất (2026-07-27)

Tao không viết scope theo cảm tính. Trước khi brainstorm, tao quét prod. Kết quả
dưới đây là **thực trạng đang chạy**, không phải giả định:

### 🔴 P0-1 — Toàn bộ hệ cảnh báo Marketing chưa từng chạy MỘT LẦN NÀO

`ADMIN_TELEGRAM_CHAT_ID` **chưa được set trên Vercel**. Hệ quả trong 14 ngày qua:

| Job | ok | skip | Ghi chú thật từ `cron_runs` |
|---|---|---|---|
| `cmo-digest` | **0** | 1+ | `no ADMIN_TELEGRAM_CHAT_ID` |
| `anomaly-alerts` | **0** | 8+ | `no ADMIN_TELEGRAM_CHAT_ID` |

CMO Digest (M0.2) và Cảnh báo bất thường (M0.3) — hai thứ đã ship và ghi "XONG"
trong CLAUDE.md — **chưa gửi được một tin nào**. CLAUDE.md M0.2 có ghi *"Henry
xác nhận `ADMIN_TELEGRAM_CHAT_ID` đã set trên Vercel (nên có sẵn — dùng chung
với alert đăng nhập)"*. Giả định đó **sai**, và không có gì kiểm chứng lại nó.

**Đây chính xác là bài học thiết kế đắt nhất của cả track:** job "skip" đều đặn
mỗi ngày được coi là *không lỗi*, nên panel Cron vẫn không đỏ, và **sự im lặng
của hệ cảnh báo trông y hệt như "mọi thứ đều ổn"**. Henry đã chờ bản digest đầu
tiên suốt 2 tuần cho một thứ không bao giờ tới.

### 🔴 P0-2 — 5 user trả tiền nhưng không nhận được hàng

```
chan-dung-vo-chong:  37 lượt bị trừ Lượng  →  32 bản ghi kết quả
chan-dung-tien-kiep: 14 lượt bị trừ Lượng  →  14 bản ghi kết quả
```

**5 user mất 20 Lượng mỗi người (~100 Lượng ≈ 250k đ) và không nhận được gì.**
Không ai biết. Không có refund. Không có bản ghi nào nói chuyện đó đã xảy ra.

Căn nguyên nằm ở thứ tự trong `public/tuvi-paywall.js`:

```js
// requireCredits(): trừ Lượng TRƯỚC, rồi mới làm việc
const data = await res.json();          // ← /api/payment?action=deduct
if (data.success) { await callback(); } // ← sinh ảnh/truyện; hỏng thì mất tiền
```

Và không có đường hoàn tiền nào trong repo — `grep -ri "refund"` trả về **0 kết quả**.

Tệ hơn: `generateToolSlug()` gắn `Date.now()`, nên **mỗi lần user bấm thử lại là
một slug mới = bị trừ tiền lần nữa**. Tool hỏng càng làm user mất càng nhiều.

### 🟡 P0-3 — 6 cron route lỗi ở mọi lần deploy, làm nhiễu chính panel giám sát

Cả 6 route `app/api/cron/*` khai `runtime = 'nodejs'` nhưng **thiếu
`export const dynamic = 'force-dynamic'`**. Chúng đọc `request.headers`
(auth `CRON_SECRET`) nên Next 14 prerender thất bại mỗi lần build:

```
Error: Dynamic server usage: Route /api/cron/cmo-digest couldn't be rendered
statically because it used `request.headers`.
```

~465 dòng lỗi giả trong `cron_runs` 14 ngày qua (duration 0–5ms). Sáu route
`app/api/cron-*` kiểu cũ không khai `runtime` thì **không dính**. Hệ quả thật
không phải là job chết (job thật vẫn chạy) mà là **alert fatigue**: panel "Cron
& Jobs" đầy lỗi giả, nên lỗi thật sẽ chìm nghỉm trong đó.

### 🟡 P0-4 — Kênh push chết, và có hai hệ push song song

`cron-daily-push` chạy OK mỗi ngày với kết quả `sent=0 · note=no tokens` —
không có token nào trong DB. Đồng thời tồn tại **hai** cron push
(`/api/cron-push` và `/api/cron/daily-push`) cùng lịch `0 0 * * *`. Chưa rõ cái
nào là thật. Đáng nói: M0.4 (nhắc user sắp rời bỏ) có nhánh gửi Push — nhánh đó
**không thể hoạt động** trong tình trạng này.

### ⚪ P0-5 — Không tồn tại khái niệm "tool lỗi" trong toàn hệ thống

Allowlist của `/api/track`:

```js
'page_view','tool_open','tool_run','tool_result','chat_msg',
'signup','login','topup_start','topup_success','share','cta_click'
```

**Không có một event type nào biểu thị thất bại.** `tool_run` bắn lúc *bắt đầu*.
`tool_result` có trong allowlist nhưng CLAUDE.md ghi rõ đã gộp vào `tool_run` —
tức không nơi nào emit.

Nghĩa là: **45 tool standalone + 26 trang shell + 58 API route có ZERO tín hiệu
lỗi.** Chỉ 4 kênh chat có `bot_reply{ok,reason}` (D2). Khi tool `chan-dung-tien-kiep`
ném *"Lỗi phân tích kết quả AI."*, cách duy nhất phát hiện là **Henry tự chạy thử
trên prod rồi báo**. Đó không phải quy trình vận hành, đó là may mắn.

### Tóm lại

Bốn trong sáu thứ ship gần nhất **chưa từng làm được việc của nó trên prod**, và
mọi dashboard vẫn xanh. Đó là lý do cần COO — và cũng là bản thiết kế cho nó.

---

## 2. Nguyên tắc thiết kế (rút từ chính mục 1)

1. **Im lặng ≠ khỏe mạnh.** Mọi thành phần giám sát phải chứng minh mình còn
   sống bằng nhịp tim (heartbeat), không phải bằng việc không kêu. P0-1 xảy ra
   chính vì vi phạm điều này.
2. **COO phải tự giám sát đường báo cáo của chính nó.** Nếu kênh Telegram hỏng,
   COO phải biết và ghi cờ đỏ vào chỗ khác (DB + dashboard), không được chết câm.
3. **Không đợi user làm chuột bạch.** Canary tự chạy tool thật theo lịch là cách
   duy nhất đáp ứng đúng yêu cầu *"break là báo tao NGAY"*.
4. **Tách lỗi hệ thống khỏi lỗi người dùng.** Hết Lượng / sai input / chưa đăng
   nhập KHÔNG phải sự cố. Gộp chung là tự tạo nhiễu.
5. **Ngưỡng theo tỷ lệ THAY ĐỔI, không theo con số tuyệt đối.** Tool chạy 3
   lượt/ngày không bao giờ chạm ngưỡng "8% lỗi", nhưng 2/3 lượt hỏng là chết rồi.
6. **An toàn nằm ở thiết kế, không ở "nhớ tắt".** Kế thừa nguyên mô hình 2 lớp
   khóa của M0.6: công tắc tổng mặc định tắt + khóa phụ từng loại hành động.

---

## 3. Phạm vi đề xuất — 7 trụ

Henry mới nêu trụ 1. Sáu trụ còn lại là phần tao brainstorm thêm.

### Trụ 1 — Sức khỏe Tool & Route *(đúng thứ Henry yêu cầu)*
- `tool_error` / `tool_outcome` event type + wrapper `logToolOutcome()` dùng
  chung cho 58 API route và lớp client (`shell.js`, `tuvi-paywall.js`).
- Phân loại lỗi: `upstream_5xx` · `llm_parse` · `timeout` · `auth` ·
  `insufficient_credits` · `bad_input` · `unknown`. Ba loại cuối = lỗi người
  dùng, **không tính vào tỷ lệ sự cố**.
- Tỷ lệ thành công + p95 độ trễ **theo từng tool**, so với baseline chính nó.
- Phát hiện **chuyển trạng thái** (đang chạy → hỏng), không phải ngưỡng tĩnh.

### Trụ 2 — Canary: tự chạy thử tool thật *(trái tim của "báo tao NGAY")*
- Tài khoản test riêng + budget Lượng riêng, chạy **end-to-end tool thật** theo
  lịch (paid tool: 1–4 lần/ngày; free tool: thưa hơn).
- Assert theo tầng: HTTP 200 → đúng shape → nội dung hợp lệ (ảnh có kích thước,
  truyện đủ 5 hồi) → độ trễ trong ngưỡng.
- **Chạy sau mỗi lần deploy**, đối chiếu với commit → chỉ thẳng deploy nào làm hỏng.
- Đây là thứ sẽ bắt bug *"Lỗi phân tích kết quả AI."* trong 1 giờ thay vì chờ Henry.

### Trụ 3 — Toàn vẹn dòng tiền *(trụ tự trả tiền cho chính nó)*
- Đối soát **trừ Lượng ↔ giao hàng**: mỗi giao dịch âm phải có bản ghi kết quả
  tương ứng. Lệch = sự cố tiền bạc, báo ngay. (Đang lệch 5 ca.)
- **Auto-refund** khi lượt chạy hỏng — idempotent, ghi log, có trần/ngày.
- Vá `generateToolSlug` để **thử lại không bị trừ tiền lần hai** (slug tất định
  theo input thay vì `Date.now()`).
- Đối soát cổng thanh toán: PayOS / PayPal / bank webhook — đơn đã trả mà chưa
  cộng Lượng, hoặc cộng hai lần.

### Trụ 4 — Giám sát đội job & cấu hình
- **Sổ đăng ký lịch kỳ vọng**: mỗi job khai cadence của nó → COO phát hiện
  **"đáng lẽ phải chạy mà không chạy"** (hiện hoàn toàn vô hình).
- **`skip` lặp lại là LỖI**, không phải trạng thái bình thường. Job skip 14 ngày
  liền = hỏng. (Bắt được P0-1 ngay ngày đầu.)
- **Preflight biến môi trường**: khai báo env bắt buộc theo từng tính năng, quét
  và báo cái thiếu. (Bắt được P0-1 trước khi ship.)
- **Trôi migration**: `_patches/*.sql` khai đã chạy vs thực tế trên prod — hiện
  đang theo dõi bằng tay trong CLAUDE.md, rất dễ sai.

### Trụ 5 — Phụ thuộc ngoài & chi phí
- 10+ API bên thứ ba (Anthropic · Gemini · OpenAI · Replicate · PayOS · PayPal ·
  Telegram · Meta ×2 · FCM · GA4 · Supabase). Theo dõi tỷ lệ lỗi + độ trễ + chi
  phí **theo từng nhà cung cấp**.
- **Hiện trạng fallback**: cơ chế fallback LLM hai chiều vừa làm đang **vô hình**
  — Henry không thấy nó phải cứu hộ bao nhiêu lần. Fallback chạy liên tục =
  provider chính đang chết, cần biết.
- **Cảnh báo cạn quota TRƯỚC khi user dính** (đúng sự cố *"credit balance is too
  low"* đã xảy ra).
- Trần chi phí: chi phí LLM/ảnh mỗi ngày so với doanh thu. D3 đã có phần *đo*,
  còn thiếu phần *cảnh báo* và *chặn*.

### Trụ 6 — Hiệu năng & toàn vẹn dữ liệu
- p95 theo tool, tỷ lệ chạm timeout của Vercel function, kích thước payload.
- Trang ISR trả 404/rỗng, link chia sẻ chết, file rác trong Storage (ảnh sinh ra
  nhưng bản ghi hỏng), embedding/RAG cũ.
- Parity engine: lá số client vs server lệch nhau (đã từng có bug này — #83).
- Lighthouse tụt sau deploy.

### Trụ 7 — An toàn phát hành
- Sau mỗi deploy: chạy bộ canary → so sánh với deploy trước → *"tool X hỏng từ
  commit Y"*.
- Nối vào quy trình PR sẵn có; nếu deploy làm hỏng tool trả phí thì báo kèm gợi
  ý rollback.

---

## 4. Mô hình vận hành (kế thừa nguyên mô hình CMO)

Ba mức, mở dần — **giống hệt M0.1→M0.6 nên không phải học lại gì**:

| Mức | Nội dung | Rủi ro |
|---|---|---|
| **Quan sát** | Đo + hiện trên dashboard. Không gửi gì. | 0 |
| **Cảnh báo** | Telegram khi có sự cố thật + Digest Vận Hành hằng ngày. | Thấp (chỉ tốn sự chú ý) |
| **Tự xử lý** | Refund tự động · thử lại tự động · **tự tắt bán tool đang hỏng**. | Cao — mặc định TẮT, shadow-mode như M0.6 |

**"Tự tắt bán tool đang hỏng"** là hành động giá trị nhất trong nhóm 3: hiện tại
một tool trả phí bị hỏng **vẫn tiếp tục thu tiền user** cho tới khi Henry phát
hiện bằng mắt. Tắt `tool_pricing.enabled` tự động chặn đứng thiệt hại — và vẫn
nằm sau hai lớp khóa như M0.6.

**Điều kiện bắt buộc với Digest Vận Hành:** nó phải tự kiểm tra đường gửi của
chính mình. Nếu Telegram hỏng → ghi cờ đỏ vào DB + hiện băng đỏ trên admin.
Không bao giờ được lặp lại P0-1.

---

## 5. Thứ tự đề xuất

| Mốc | Nội dung | Vì sao xếp ở đây |
|---|---|---|
| **O0.0** | **Vá 4 lỗ đang chảy máu** (P0-1→P0-4) | Đang mất tiền và mất tín hiệu mỗi ngày. Phần lớn là one-liner. |
| **O0.1** | Telemetry tool (`tool_error` + wrapper) | Nền móng — mọi mốc sau đều đọc từ đây. |
| **O0.2** | **Canary + cảnh báo tool hỏng** | Đúng yêu cầu gốc của Henry, giao trọn vẹn. |
| **O0.3** | Đối soát tiền + auto-refund | Tự trả tiền cho chính nó; đã có 5 ca chứng minh. |
| **O0.4** | Giám sát job + preflight env | Chống tái diễn P0-1/P0-3. |
| **O0.5** | Phụ thuộc ngoài + chi phí | Cần O0.1 có dữ liệu trước. |
| **O0.6** | Digest Vận Hành + dashboard COO | Gói mọi thứ trên thành thứ đọc được. |
| **O0.7** | Tự xử lý (shadow-first) | Mốc rủi ro cao nhất, làm cuối — đúng như M0.6. |

**Đề xuất của tao:** làm **O0.0 ngay trong 1 PR nhỏ** (độc lập, không chờ chốt
scope), rồi **O0.1 + O0.2 gộp một PR** — hai cái đó cộng lại đã trả lời trọn vẹn
câu hỏi ban đầu của Henry.

---

## 6. Điểm cần Henry quyết

1. **O0.0 làm luôn hay chờ?** Ba trong bốn lỗ vá được bằng one-liner
   (`force-dynamic`; set env). Riêng **refund 5 user** là động vào tiền → cần
   Henry gật.
2. **Ngân sách canary.** Chạy thử tool thật là tốn tiền thật (LLM + ảnh). Đề
   xuất bắt đầu: ~50–100 Lượng/ngày cho toàn bộ tool trả phí. Henry chốt số.
3. **Kênh báo động.** Dùng chung Telegram admin (nhanh nhất, 0 env mới **sau
   khi vá P0-1**) hay tách riêng để sự cố vận hành không lẫn với digest marketing?
4. **Auto-refund: tự chạy hay chờ duyệt?** Tao nghiêng về **tự chạy có trần/ngày**
   — bắt user đợi Henry duyệt mới được hoàn tiền thì thà không làm.
5. **Trụ nào cắt khỏi phạm vi?** Bảy trụ là bản đầy đủ. Nếu muốn gọn, tao đề
   xuất giữ 1–2–3 và hoãn 5–6–7.
