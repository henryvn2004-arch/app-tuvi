# COO Orchestrator — "Quân Sư Vận Hành"

**Trạng thái:** ĐỀ XUẤT v2 (chưa code gì) · **Ngày:** 2026-07-27
**v2 bổ sung:** Bảo mật / chống hack (Henry yêu cầu) + 3 lĩnh vực còn thiếu
**Chờ Henry chốt scope trước khi làm bất cứ thứ gì**

---

## 0. Định vị

**CMO** trả lời *"việc kinh doanh đang ra sao?"* — **COO** trả lời *"cái máy đẻ ra
những con số đó có còn chạy, có còn đúng, có còn an toàn không?"*

Chỗ khác nhau cốt lõi: CMO đọc số để báo cáo. **COO phải nghi ngờ chính con số
đó** — vì một hệ thống chết, hoặc bị chiếm, cũng tạo ra dashboard xanh y hệt một
hệ thống khỏe.

---

## 1. 🚨 PHÁT HIỆN NGHIÊM TRỌNG NHẤT — đọc trước mọi thứ khác

### CRIT-1 — Bất kỳ ai trên Internet đều tự cấp Lượng vô hạn được, không cần đăng nhập

```
add_credits(p_user_id uuid, p_amount integer)
  → SECURITY DEFINER
  → EXECUTE granted to: anon, authenticated
```

`anon` key nằm công khai trong **26 file** dưới `public/` (đúng thiết kế Supabase —
nó vốn được bảo vệ bằng RLS và bằng việc KHÔNG cấp quyền các hàm nhạy cảm).
Nhưng hàm `add_credits` lại **được cấp quyền cho `anon`** và chạy dưới quyền
`SECURITY DEFINER`, tức bỏ qua mọi RLS.

Hệ quả: chỉ cần xem source trang web lấy `anon` key rồi gọi thẳng REST endpoint
`/rest/v1/rpc/add_credits` với `p_user_id` + `p_amount` tùy ý là **tự nạp bao
nhiêu Lượng cũng được, không cần tài khoản.** Toàn bộ mô hình kiếm tiền bị vô
hiệu bằng một request.

Cùng lỗ hổng, cùng mức quyền:
| Hàm | Khai thác được gì |
|---|---|
| `add_credits` | Tự nạp Lượng vô hạn cho bất kỳ ai |
| `deduct_credits` | **Trừ sạch Lượng của user khác** (phá hoại) |
| `process_referral_reward` | Tự phát thưởng giới thiệu |
| `revoke_signup_bonus` | Tước quà đăng ký của user khác |

> ⚠️ Tao **không thử khai thác** — không gọi RPC nào để đổi dữ liệu prod. Kết
> luận rút từ bảng phân quyền (`has_function_privilege`) + `prosecdef`, đủ chắc
> và không đụng vào tiền của ai.

**Cách vá — đã kiểm chứng là an toàn tuyệt đối:**

Tao đã rà **toàn bộ** nơi gọi 4 hàm này. Tất cả đều **server-side, dùng service
key**: `lib/billing/credits.ts` · `lib/marketing/autopilot-promo.ts` ·
`app/api/payment/route.ts` · `app/api/bank-webhook/route.ts` ·
`app/api/signup-signal/route.ts`. **Không có một caller client-side nào**
(`admin.html` chỉ *nhắc tên* `process_referral_reward` trong một dòng mô tả).
`service_role` vẫn giữ nguyên quyền EXECUTE.

```sql
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid,int)             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_credits(uuid,int)          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral_reward(uuid)     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_signup_bonus(uuid,int)     FROM anon, authenticated;
```

→ **Vá được ngay hôm nay, không cần deploy, không gãy gì.** Cần Henry gật.
Sau khi vá nên soát `credit_transactions` xem đã có ai lợi dụng chưa.

### CRIT-2 — Tool trả phí không hề kiểm tra thanh toán ở server

`app/api/chan-dung-tien-kiep` và `app/api/chan-dung-vo-chong` chỉ xác thực
`Authorization: Bearer` là **user hợp lệ**, rồi sinh ảnh + gọi LLM luôn. Đếm số
lần hai file này nhắc tới `tool_pricing` / `getToolPrice` / `deductCredits` /
`credit_transactions`: **0**.

Việc trừ Lượng nằm hoàn toàn ở client (`tuvi-paywall.js` gọi
`/api/payment?action=deduct` như **một request riêng biệt**). Nghĩa là bất kỳ
tài khoản miễn phí nào cũng `curl` thẳng endpoint để sinh ảnh + truyện **không
mất Lượng, không giới hạn số lần** — mỗi lượt tốn tiền thật của Henry
(OpenAI `gpt-image-1` + 2 lượt LLM ~9k token đầu vào).

Điểm sáng: `handleDeduct` làm **đúng** — tra giá server-side qua `tool_pricing`,
không tin `amount` client gửi. Vấn đề là các tool không đi qua nó.

### CRIT-3 — Không có rate limit ở bất kỳ endpoint tốn tiền nào

Toàn repo chỉ có 2 chỗ trả 429 vì rate limit: `admin/login` và
`admin/oauth-verify`. `/api/v1/chat`, 2 tool sinh ảnh, `/api/track` — **không có
gì**. Cộng với CRIT-2 thì đây là đường rút tiền không đáy.

`/api/track` còn nhận ghi **không cần auth** bằng service key. Kẻ xấu bơm hàng
triệu event giả → **đầu độc chính số liệu mà CMO autopilot dùng để tự quyết
định giá và tự phát khuyến mãi (M0.6)**. Khi autopilot được bật, toàn vẹn dữ
liệu không còn là chuyện báo cáo nữa — nó trở thành **ranh giới bảo mật**.

### Mức thấp hơn (từ 205 cảnh báo của Supabase advisor)

| Vấn đề | Chi tiết |
|---|---|
| `van_dap` | policy tên **"anon full access for now"** cho `ALL` — anon đọc/ghi/xóa toàn bảng. Policy tạm để lại prod. |
| `laso_public` | anon `INSERT` **và** `UPDATE` always-true — ai cũng sửa được lá số công khai |
| `shared_results`/`shared_sessions`/`push_subscriptions` | anon INSERT always-true — spam/phình storage |
| 20 bảng | bật RLS nhưng **không có policy nào** (`bank_orders`, `mcp_keys`, `push_tokens`, `chat_links`, `cron_runs`…) |
| 15 hàm | `search_path` khả biến — đường leo thang quyền kinh điển |
| `van_dap_stats` | view `SECURITY DEFINER` (mức **ERROR** duy nhất) |
| 3 bucket | `hair-templates`/`samples`/`wardrobe-items` cho liệt kê nội dung |
| Auth | **chống mật khẩu rò rỉ đang TẮT** |
| CORS | `Access-Control-Allow-Origin: '*'` áp cho **mọi** route kể cả `/api/payment` |
| Service key | dùng trong **52 file** — bán kính thiệt hại rất rộng nếu lộ |

Ghi nhận công bằng: chống gian lận đăng ký **đã có nền** — `blocked_email_domains`,
`signup_signals`, `revoke_signup_bonus`. Không phải làm từ đầu.

### Nhắc lại 4 lỗ vận hành từ v1 (vẫn nguyên)

1. `ADMIN_TELEGRAM_CHAT_ID` chưa set → CMO Digest + cảnh báo bất thường **0 lần
   gửi trong 14 ngày**, mà panel vẫn không đỏ vì `skip` không tính là lỗi.
2. **Trừ tiền trước khi giao hàng, không có đường hoàn.** `requireCredits()`
   trừ Lượng rồi mới chạy việc; `grep -ri "refund"` toàn repo = **0**; và
   `generateToolSlug()` gắn `Date.now()` nên **thử lại sau khi hỏng là bị trừ
   lần nữa**.

   > ⚠️ **ĐÍNH CHÍNH (2026-07-27).** Bản v1/v2 của tài liệu này từng ghi
   > *"37 lượt trừ Lượng → 32 kết quả, 5 user mất tiền ~250k đ"*. **SAI.** Con
   > số đó lấy bằng cách so HAI TỔNG với nhau, và bộ lọc
   > `description ilike '%vợ chồng%'` còn hút nhầm 3 dòng `xem-tuoi` không liên
   > quan. Đối chiếu lại **từng giao dịch** với bản ghi kết quả sinh ra sau nó:
   >
   > | Tool | Lượt trừ | Người trả | Không ra kết quả |
   > |---|---|---|---|
   > | `chan-dung-vo-chong` | 34 | **1** | **2** |
   > | `chan-dung-tien-kiep` | 15 | **1** | 0 |
   >
   > "Người trả" duy nhất của cả hai tool là `henryvn2004@gmail.com` — chính
   > Henry lúc test. **Không có khách hàng thật nào bị ảnh hưởng, không cần
   > hoàn tiền.**
   >
   > Bài học phương pháp: **so tổng-với-tổng không bao giờ chỉ ra được lượt nào
   > hỏng** — phải khớp theo từng giao dịch. Sprint S3 dựng đối soát đúng cách.
   > Cơ chế lỗi vẫn CÓ THẬT (2 lượt hỏng đã xảy ra thật), nên S3 giữ nguyên
   > nhưng đổi vai từ *khắc phục* sang *phòng ngừa*.
3. 6 route `app/api/cron/*` thiếu `dynamic='force-dynamic'` → ~465 lỗi giả.
4. Push chết (`sent=0 · no tokens`) + hai hệ push song song cùng lịch.
5. Không tồn tại event type nào biểu thị lỗi — 45 tool + 26 trang + 58 route mù hoàn toàn.

---

## 2. Nguyên tắc thiết kế

1. **Im lặng ≠ khỏe mạnh.** Mọi thành phần giám sát phải chứng minh còn sống
   bằng nhịp tim, không phải bằng việc không kêu.
2. **COO tự giám sát đường báo cáo của chính nó.** Telegram hỏng → ghi cờ đỏ chỗ
   khác, không được chết câm.
3. **Không đợi user làm chuột bạch.** Canary tự chạy là cách duy nhất đáp ứng
   đúng *"break là báo tao NGAY"*.
4. **Tách lỗi hệ thống khỏi lỗi người dùng.** Hết Lượng / sai input không phải sự cố.
5. **Ngưỡng theo tỷ lệ THAY ĐỔI, không theo số tuyệt đối.**
6. **Giả định sẽ bị tấn công, không phải "nếu".** Mọi thứ client gửi lên đều là
   thù địch cho tới khi server tự kiểm chứng.
7. **An toàn nằm ở thiết kế, không ở "nhớ tắt"** — kế thừa mô hình 2 lớp khoá M0.6.

---

## 3. PHẠM VI ĐỀ XUẤT — 4 lĩnh vực, 19 trụ

v1 có 7 trụ rời. v2 gom lại thành 4 lĩnh vực cho dễ cắt gọt, và **bổ sung
lĩnh vực C (bảo mật) theo yêu cầu của Henry + lĩnh vực D mà tao thấy còn thiếu**.

### 🟦 A. ỔN ĐỊNH — *nó có chạy không?*

| # | Trụ | Nội dung |
|---|---|---|
| **A1** | **Sức khỏe tool & route** ← *yêu cầu gốc* | `tool_error` event + wrapper dùng chung 58 route; phân loại lỗi (upstream_5xx · llm_parse · timeout · auth · bad_input); tỷ lệ thành công + p95 **theo từng tool**; phát hiện **chuyển trạng thái** thay vì ngưỡng tĩnh |
| **A2** | **Canary tự chạy tool thật** | Tài khoản test + budget riêng, chạy end-to-end theo lịch **và sau mỗi deploy**; assert theo tầng (HTTP → shape → nội dung → độ trễ) |
| **A3** | **Đội job & cấu hình** | Sổ lịch kỳ vọng → bắt "đáng lẽ chạy mà không chạy"; **`skip` lặp lại = LỖI**; preflight biến môi trường; phát hiện trôi migration |
| **A4** | **Phụ thuộc ngoài** | 10+ API bên thứ ba: tỷ lệ lỗi, độ trễ, **hiện trạng fallback** (fallback LLM 2 chiều đang vô hình), cảnh báo cạn quota **trước** khi user dính |
| **A5** | **An toàn phát hành** | Canary sau deploy → chỉ thẳng commit làm hỏng; gợi ý rollback |
| **A6** | **Hiệu năng & sức chứa** | p95, tỷ lệ chạm timeout Vercel, kích thước DB/storage, chi phí trên đầu user khi scale |

### 🟩 B. TOÀN VẸN — *nó có đúng không?*

| # | Trụ | Nội dung |
|---|---|---|
| **B1** | **Dòng tiền** | Đối soát **trừ-Lượng ↔ giao-hàng** khớp theo TỪNG giao dịch (không so tổng-với-tổng); auto-refund; vá slug `Date.now()` để **thử lại không mất tiền lần hai**; đối soát PayOS/PayPal/bank |
| **B2** | **Dữ liệu** | Parity engine client↔server; ISR trả 404/rỗng; link chia sẻ chết; file rác trong Storage; embedding cũ |
| **B3** | **Nội dung tự động** ⭐mới | 3 cron đang **tự xuất bản nội dung AI không ai duyệt** (`cron-khao-luan`, `cron-master-write`, YouTube `van_dap`). Nội dung sai/trùng lặp có thể khiến **Google phạt cả site**. Cần QC: trùng lặp, ảo giác, chất lượng |
| **B4** | **Sự thật của tài liệu** ⭐mới | CLAUDE.md ghi "XONG" cho những thứ **chưa từng chạy** (P0-1 là bằng chứng). Đối chiếu điều tài liệu tuyên bố với thực tế prod — nghe lạ, nhưng dự án này vận hành dựa trên độ chính xác của CLAUDE.md |

### 🟥 C. BẢO MẬT & CHỐNG LẠM DỤNG — *yêu cầu mới của Henry*

| # | Trụ | Nội dung |
|---|---|---|
| **C1** | **Nền tảng bảo mật ứng dụng** | Rà phân quyền RPC/RLS định kỳ (bắt CRIT-1); **bắt buộc kiểm tra thanh toán server-side** (CRIT-2); siết CORS; giảm bán kính service key; quét CVE phụ thuộc; kiểm tra bí mật bị commit |
| **C2** | **Chống lạm dụng & gian lận** | Rate limit **theo user + theo IP** cho mọi endpoint tốn tiền; phát hiện cày Lượng / đa tài khoản / gian lận giới thiệu; chống cào 438K trang ISR; phát hiện bơm event giả vào `/api/track` |
| **C3** | **Phát hiện & ứng cứu sự cố** | Cảnh báo bất thường **bảo mật** (đăng nhập admin lạ, số dư nhảy vọt, dùng key bất thường); runbook cách ly; **đường truy vết** — hiện gần như không thể dựng lại chuyện gì đã xảy ra |
| **C4** | **Quản trị truy cập & khoá** | Lịch xoay khoá (CLAUDE.md còn ghi service key **cần xoay từ 2026-06-24** — chưa rõ đã làm chưa); hạn token Meta/GA4; bật chống mật khẩu rò rỉ; 2FA tài khoản admin; nguyên tắc quyền tối thiểu |
| **C5** | **An toàn AI** | Bề mặt prompt-injection (`wrap` để dạng ENUM là **đúng** — giữ nguyên tắc đó); chống lạm dụng ảnh người dùng tải lên; chặn nội dung AI đưa lời khuyên y tế/tài chính gây trách nhiệm pháp lý |

### 🟨 D. BỀN VỮNG — *nó sống được lâu không?* ⭐lĩnh vực mới

| # | Trụ | Nội dung |
|---|---|---|
| **D1** | **Sao lưu & phục hồi thảm hoạ** | **Đã bao giờ thử phục hồi chưa?** Bản sao lưu chưa test = không có sao lưu. Chính sách PITR/retention, RTO/RPO |
| **D2** | **Rủi ro nhà cung cấp & tài khoản** | Một Supabase, một Vercel, một domain, một bot token, một tài khoản admin. **Thẻ thanh toán hết hạn = sập toàn bộ.** Theo dõi hạn khoá/hạn thẻ/bậc quota/thay đổi ToS |
| **D3** | **Riêng tư & tuân thủ** | **NĐ 13/2023** về bảo vệ dữ liệu cá nhân. Đang lưu ngày sinh, email, lịch sử chat, và **ảnh khuôn mặt** (xem-tướng, thử đồ) — dữ liệu sinh trắc học. Cần: chính sách lưu giữ, quyền xoá, quyền xuất dữ liệu, tuân thủ chính sách nhắn tin Meta/Telegram (**quan trọng cho M0.4/M0.6 vì chúng chủ động nhắn user**) |
| **D4** | **Hỗ trợ & xử lý thiệt hại user** | **Hiện KHÔNG có đường nào** để user báo "tôi mất Lượng mà không nhận được gì" — 5 nạn nhân đã có thật. Cần kênh tiếp nhận, SLA phản hồi, quy trình hoàn tiền |
| **D5** | **Sức khỏe SEO/organic** | 438K trang ISR là nguồn lưu lượng lớn nhất. Google Search Console: độ phủ index, án phạt thủ công, lỗi crawl, Core Web Vitals. **Mất index = mất kênh chính**, hiện không ai theo dõi |

---

## 4. Mô hình vận hành

Ba mức, mở dần — **giống hệt M0.1→M0.6 nên không phải học lại gì**:

| Mức | Nội dung | Rủi ro |
|---|---|---|
| **Quan sát** | Đo + hiện dashboard. Không gửi gì. | 0 |
| **Cảnh báo** | Telegram khi có sự cố thật + Digest Vận Hành. | Thấp |
| **Tự xử lý** | Refund tự động · thử lại · **tự tắt bán tool đang hỏng** · **tự chặn IP/user đang lạm dụng**. | Cao — mặc định TẮT, shadow-mode, 2 lớp khoá |

Hai hành động đáng giá nhất ở mức 3:
- **Tự tắt bán tool đang hỏng** — hiện tool hỏng **vẫn tiếp tục thu tiền** tới khi Henry phát hiện bằng mắt.
- **Tự chặn nguồn lạm dụng** — nhưng chặn nhầm user thật thì tệ hơn, nên mức này phải shadow lâu.

**Bắt buộc:** Digest Vận Hành phải tự kiểm tra đường gửi của chính nó. Không bao giờ lặp lại P0-1.

---

## 5. WORKPLAN — 7 sprint tuần tự

**Henry đã chốt scope 2026-07-27, kèm yêu cầu: KHÔNG over-engineer.**

### Luật chống phình (áp cho mọi sprint)

1. **Tái dùng, không dựng mới.** Hạ tầng đã có và phải dùng lại:
   `events` (telemetry) · `cron_runs` + `withCronLog` (job) · `app_config`
   (ngưỡng, đổi không cần deploy) · `tgSendMessage` (báo động) · panel
   `admin.html` (hiển thị). **Bảng mới chỉ khi thật sự không nhét vừa `events`.**
2. **Một helper dùng chung, không dựng framework.**
3. **Đi theo giá trị, không theo độ phủ.** Gắn telemetry cho tool **trả phí +
   lưu lượng cao trước**, không gắn đủ 58 route rồi mới dùng.
4. **1 sprint = 1 PR.** Sprint nào phình quá thì cắt đôi, không nống ra.
5. **Lĩnh vực D phần lớn là CHECKLIST/quy trình, không phải code.** Đừng biến
   sao lưu/tuân thủ/SEO thành một hệ thống tự động — chi phí không đáng.

### Bảng sprint

| Sprint | Tên | Mục đích một câu | Đầu ra | Phụ thuộc |
|---|---|---|---|---|
| **S0** 🚨 | **Cầm máu** | Bịt lỗ đang khai thác được + dọn nhiễu giám sát | ✅ SQL `REVOKE` · ✅ chốt thanh toán server-side · ✅ `force-dynamic` · ⏭️ rate limit → dời S6 (xem ghi chú) | — |
| **S1** | **Giác quan** | Cho hệ thống biết đau ở đâu | `tool_error` + helper `logToolOutcome()` gắn vào tool trả phí & lưu lượng cao | S0 |
| **S2** | **Canary** ⭐ | *Break là báo NGAY* — yêu cầu gốc | Cron tự chạy tool thật + cảnh báo Telegram | S1 |
| **S3** | **Dòng tiền** | Không để user trả tiền mà mất trắng | Đối soát trừ-Lượng ↔ giao-hàng · auto-refund · vá slug `Date.now()` | S1 |
| **S4** | **Job & cấu hình** | Không lặp lại vụ "chạy 14 ngày mà chưa gửi được gì" | Sổ lịch kỳ vọng · `skip` lặp = LỖI · preflight env | S1 |
| **S5** | **Digest & panel COO** | Gói mọi thứ thành thứ đọc được mỗi sáng | Digest Vận Hành (tự kiểm tra đường gửi của chính nó) + panel admin | S1–S4 |
| **S6** | **Chống lạm dụng & rà bảo mật định kỳ** | Giữ cho lỗ đã vá không mở lại | Rà phân quyền RPC/RLS định kỳ · phát hiện cày Lượng/gian lận | S1 |

**Để sau, chỉ làm khi Henry thấy cần** (cố ý KHÔNG xếp sprint để tránh phình):
phụ thuộc ngoài & chi phí · sức chứa · QC nội dung AI · đối chiếu tài liệu ·
toàn bộ lĩnh vực D (sao lưu/DR · tuân thủ · hỗ trợ user · SEO) · tự xử lý
(auto-tắt tool hỏng, auto-chặn lạm dụng).

**Quy trình mỗi sprint:** tao giải thích gọn *làm để làm gì* → hỏi những điểm
cần chốt → làm → 1 PR draft → CI xanh → Henry duyệt → sprint kế.

### Ghi chú: vì sao rate limit rời S0 sang S6

Lúc lên kế hoạch, rate limit là phanh chính cho các endpoint tốn tiền. **Chốt
thanh toán server-side (làm ngay trong S0) đã đổi điều đó:**

| Bề mặt | Sau S0 |
|---|---|
| 2 tool sinh ảnh | Đã bị chốt thanh toán ở server → **hệ thống Lượng chính là bộ giới hạn** |
| `/api/v1/chat` | Vốn đã trừ Lượng server-side (`deductCredits`) |
| `/api/track` | **Vẫn hở** — không cần auth, và là đường đầu độc số liệu autopilot |

Rate limit giờ là phòng thủ lớp hai, không còn là thứ cầm máu. Mà làm cho tử tế
thì cần **bảng trạng thái dùng chung** (serverless không giữ bộ đếm trong RAM
được) — đúng là hạ tầng của S6, nơi nó được dùng lại cho phát hiện cày Lượng và
gian lận giới thiệu. Nhét vào S0 là dựng hạ tầng cho một sprint cầm máu:
vi phạm luật chống phình số 4.

**Lỗ còn lại đã biết sau S0** (cố ý chấp nhận, đóng ở S6):
- `/api/track` chưa có phanh.
- Cửa sổ 20 phút của đường lùi trong `toolPaymentDenied` cho phép dùng lại
  trong cùng lượt mua. So với lỗ đang vá (miễn phí VÔ HẠN, VĨNH VIỄN) thì đây
  là thu hẹp rất lớn, không phải để ngỏ.

---

## 6. Trạng thái quyết định (Henry chốt 2026-07-27)

| # | Điểm | Chốt |
|---|---|---|
| 1 | Phạm vi | ✅ **Duyệt cả 4 lĩnh vực**, kèm yêu cầu KHÔNG over-engineer |
| 2 | CRIT-1 `REVOKE` | ✅ Cho chạy thẳng prod — **ĐÃ CHẠY & kiểm chứng xong** |
| 3 | Refund | ❌ **Không còn áp dụng** — đính chính ở mục 1 cho thấy không có khách nào bị ảnh hưởng |
| 4 | Ngưỡng rate limit | ✅ Claude chọn mặc định, lưu `app_config` để chỉnh không cần deploy |
| 5 | Xoay service key | ⏳ Henry tự kiểm rồi báo lại — **không chặn** phần còn lại của S0 |
| 6 | Kênh báo động | ⏳ Chưa chốt — đề xuất **tách riêng** khỏi digest marketing, quyết ở S5 |
| 7 | Budget canary | ⏳ Chưa chốt — quyết ở S2 |
