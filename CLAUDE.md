# CLAUDE.md — Context cho Claude Code

> File này là **MỤC LỤC + LUẬT**, không phải kho. Nó được nạp vào mọi lượt nên
> mỗi dòng thừa ở đây là tiền thật. Nhật ký từng PR nằm ở `docs/nhat-ky/`.

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 16, Supabase, Vercel)

---

## 🗂️ Nhật ký ở đâu — và LUẬT GHI TỪ NAY

117 mục ghi chép từng PR (bối cảnh · số đo · bẫy · cách verify) đã dời sang
**`docs/nhat-ky/`** — `2026-08.md` · `2026-07.md` · `track-cu.md`, mục lục ở
`docs/nhat-ky/README.md`. **KHÔNG nạp tự động.** Cần thì tra:

```bash
grep -n 'từ khoá' docs/nhat-ky/*.md        # tìm mục
sed -n '120,190p' docs/nhat-ky/2026-08.md  # đọc đúng đoạn, đừng cat cả file
```

⚠️ **Chú thích trong mã nguồn trỏ "đã ghi trong CLAUDE.md"** (khoảng 12 chỗ ở
`scripts/*.mjs`, `.github/workflows/`) phần lớn nói về bài học CŨ — nay nằm ở
`docs/nhat-ky/`. Cố ý không sửa từng chỗ: chúng chỉ là chú thích, sửa hàng loạt
dễ đổi sai nghĩa hơn là để nguyên với một dòng bắc cầu ở đây.

### 🔴 Luật ghi chép (đọc trước khi định thêm gì vào file này)
1. **Nhật ký PR → viết vào `docs/nhat-ky/<tháng>.md`**, chèn lên ĐẦU file đó
   (thứ tự mới → cũ), rồi thêm một dòng vào bảng trong `README.md`.
2. **Chỉ cập nhật `CLAUDE.md` khi rút ra được một LUẬT** — thứ mà lượt sau đụng
   vùng đó sẽ làm sai nếu không biết. Luật viết 1–3 dòng + con trỏ tới mục gốc.
   Kể lại diễn biến một PR thì thuộc về nhật ký, không thuộc về đây.
3. **Trần mềm: giữ file này dưới ~50 KB.** Chạm trần thì CẮT luật đã hết hiệu
   lực trước, đừng nới trần.
4. 🔑 **Vì sao gắt thế:** file này từng phình tới **1.057.562 byte ≈ 350k token**
   — lớn hơn cả context window của Sonnet, nạp lại ở MỌI lượt. Và vì Anthropic
   prompt cache chỉ hit khi prefix giống hệt từng byte, mỗi lần ghi thêm một mục
   là **cache miss toàn bộ**. Chính nếp ghi chép làm nên chất lượng repo này đã
   trở thành khoản chi đắt nhất của nó.

## 🏗️ Bản đồ hệ thống — đi thẳng tới file, đừng đi tìm

Next.js 16 · Supabase · Vercel. Trước khi sửa, **mở đúng file dưới đây** thay vì
grep mò — repo có file 400 KB+ (`public/tuvi-ansao-engine.js`, `public/admin.html`),
đọc nguyên cái là đốt cả trăm nghìn token.

### Engine (deterministic — nguồn số DUY NHẤT, LLM không được tính lại)
| Việc | File |
|---|---|
| Lá số Tử Vi | `lib/engine/laso.ts` → nạp CHÍNH `public/tuvi-ansao-engine.js` |
| Bát Tự | `lib/engine/tubinh.ts` → `public/tubinh-ansao-engine.js` · `lib/bazi/phan-tich.ts` |
| Can chi / ngũ hành / nạp âm | `lib/engine/diachi.ts` · `lib/hanviet.ts` |
| Năm xem (nguồn duy nhất) | `lib/engine/namxem.ts` `currentNamXem()` |
| Vận ngày / vận hạn 12 tháng | `lib/engine/van-ngay.ts` · `van-han-12.ts` |
| Chân dung / tiền kiếp / duyên nợ | `lib/engine/portrait.ts` · `past-life.ts` · `past-life-bond.ts` |
| Công Sở · Dạy Con · Nhân Mạch · Hướng nghiệp trẻ | `lib/engine/cong-so.ts` · `day-con*.ts` · `nhan-mach.ts` · `huong-nghiep-tre.ts` |
| Hoàng lịch · Kỳ Môn · Lục Nhâm · chiêm tinh Tây | `lib/almanac/` · `lib/qimen/` · `lib/liuren/` · `lib/tayphuong/` |
| Dùng chung client+server | `public/tools-shared/*.js` (một nguồn, KHÔNG chép sang trang) |

### Tầng LLM
- **`lib/llm/complete.ts`** — `llmText` / `llmTextFull`. Gemini primary, Anthropic
  backup, fallback HAI CHIỀU. `cacheSystem:true` bật prompt caching (`ttl:'1h'`).
- **`lib/agent/prompts.ts`** — `buildChatContext` (rail chat, ~26 toolType) ·
  `arcCore` / `arcDoc` / `arcGiong` (ba họ prompt KHÁC nhau, xem luật bên dưới).
- **`lib/agent/run.ts`** — `runAgent`, vòng lặp tool-use, ghi `llm_usage`.
- **`lib/agent/tools.ts`** — định nghĩa tool + `TOOLS_INSTRUCTION`.
- **`lib/agent/luan-giai-doc.ts`** — prompt Luận Giải 24 phần (`buildPromptCached`,
  qua `cachedSystemFor`). **`cachedSystemFor(laSoText, phan?)` là nguồn DUY NHẤT
  cho `system` khi bật `cacheSystem`** — Luận Giải, Chu Trình Cuộc Đời LẪN Vận
  Hạn 12 Tháng đều gọi hàm này; tự ghép chuỗi tay ở nơi khác là cache miss ngay
  lượt đầu. `phan` quyết định CỤM CACHE, và có đúng **3 cụm**: `phan`≤13 nhận lá
  số đã bỏ chi tiết đại vận (`stripDaiVanDetail` — khối đó là 47,7% lá số mà
  phần 1-13 không dùng); `phan` 14-24 và **bỏ trống** (đường `buildPromptThang`
  của van-han-nam) nhận toàn văn. Bỏ trống = toàn văn là CỐ Ý: quên truyền thì
  tốn token, không thiếu dữ liệu. `nhat-ky/2026-09.md` mục "Giá Gemini ghi bằng
  NỬA giá thật".
- **`lib/agent/usage.ts`** — bảng giá model → `cost_vnd`. ⚠️ **Giá phải TRA
  bảng giá nhà cung cấp, cấm gõ từ trí nhớ** — dòng `gemini-2.5-flash` từng ghi
  0.15/1.25 (giá Gemini **2.0**) nên mọi `cost_vnd` Gemini ghi bằng ĐÚNG MỘT
  NỬA suốt nhiều tháng, im lặng tuyệt đối vì model có trong bảng nên không rơi
  vào nhánh fallback nào. Sai số kiểu này luôn nghiêng về phía **thổi phồng biên
  LN**, nên đường hụt-bảng-giá phải nghiêng ngược lại: fallback theo họ lấy mức
  ĐẮT NHẤT trong họ, không trỏ vào một model cụ thể. Giá khuyến mãi có hạn
  (3.8 Flash ×2 từ 01/01/2027) phải ghi mốc ngay tại dòng đó.
  🪤 `GEMINI_MODEL` có **HAI** dòng mặc định (`lib/llm/complete.ts` +
  `lib/agent/providers/gemini.ts`) — sửa một chỗ là khi env trống hai nhánh chạy
  hai model khác nhau, không có gì báo.
- **`lib/llm/json.ts` `parseLlmJson()`** — NGUỒN DUY NHẤT để bóc JSON từ output
  LLM. `JSON.parse` trần đã hỏng cả lượt (15–35%/tháng, xem `nhat-ky/2026-08.md`
  mục "topic-topup") mỗi khi model chèn câu dẫn/ghi chú/fence quanh JSON. Mọi
  chỗ gọi LLM với `json:true` phải qua đây, không tự viết `JSON.parse(raw)`.

### Kênh & hợp đồng
- **`lib/channels/core.ts`** `runConversation` + `ChannelIO` + `SessionStore` —
  trung lập nền tảng. Thêm kênh mới = viết adapter + route, KHÔNG sửa lõi.
- Adapter: `telegram.ts` · `messenger.ts` · `whatsapp.ts`; chung `store.ts` /
  `gate.ts` / `meta.ts`. **`lib/contract/v1.ts`** — hợp đồng API, additive-only.

### Tiền
`lib/billing/credits.ts` (trừ/hoàn/kiểm sở hữu) · `packages.ts` + `pricing.ts`
(giá) · `viral-budget.ts` (trần ảnh free) · `anon-trial.ts` (khách vô danh) ·
`lib/portraits/cache.ts` `cacheFor()` (cửa DUY NHẤT vào `portrait_cache`) ·
`lib/billing/paypal.ts` (nguồn DUY NHẤT chạm PayPal — `settlePayPalTopup` là
cửa chung cho CẢ trình duyệt lẫn `app/api/paypal-webhook`, chịu được gọi trùng).

### Vận hành
`lib/ops/jobs.ts` (**sổ job** — thêm cron phải ghi vào đây) · `lib/cron/log.ts`
`withCronLog` · `lib/config/appConfig.ts` `getConfigValue` (đọc `app_config`,
sửa bằng SQL không cần deploy) · `lib/marketing/*` (digest · cảnh báo · autopilot).

### Client
`public/shell.js` + `shell.css` (app-shell `/app`, 35 trang) · `tuvi-paywall.js`
(tường trả phí) · `tool-prices.js` (giá) · `poster.js` (ảnh 9:16 + QR) ·
`nav.js` (icon dùng chung) · `track.js` (đo) · `referral.js`.

### 32 bộ dò (chạy trong CI lint) — `npm run check:*`
`prices` `nostore` `groups` `viec` `share` `history` `shellboot` `authapi`
`giosinh` `keyframes` `hoatdong` `hexagrams` `laso` `railfields` `railwrap`
`cacheshape` `hao` `motifs` `terms` `publish` `jobs` `token` `prompt` `topics`
`batrach` `sodep` `lunar` `vntz` `tooltip` `cns` `celebanh` `nhatky`.
**Bộ dò kêu oan là bộ dò bị tắt đi** — thà thu hẹp còn hơn để nó báo bừa.

## 📐 QUY ƯỚC BẮT BUỘC (đọc trước khi viết UI mới)

### 💰 Giá Lượng: CHỈ sửa trong Admin — client KHÔNG được chép số (2026-08-01, PR #373)
Nguồn duy nhất: bảng `tool_pricing` + `credit_packages`, sửa trong **Tools
Registry** của trang Admin, không cần deploy. Client đọc qua
`public/tool-prices.js` (`ToolPrices.get/rows/packages/fillSlots`), cache
sessionStorage 2 phút. Hiện giá ở UI = `<span data-tvp-price="<tool_id>">…</span>`.
- **Đọc hụt → `null`, KHÔNG đoán.** Ô để `…`; paywall **từ chối chạy** và hiện
  "Chưa đọc được bảng giá" thay vì trừ Lượng ở một mức người dùng chưa từng thấy
  (hộp thoại xác nhận đã bỏ ở #366 nên số trên nút là thứ cuối cùng họ đọc).
- **Chỉ `admin.html` được fetch thẳng** hai bảng đó — nó là trang SỬA giá.
- `npm run check:prices` (chạy trong CI lint) chặn tái phát: chép số vào ô giá,
  hoặc tự fetch bảng giá. Bộ dò đã được KIỂM bằng cách tái tạo đúng hai lỗi cũ.
- **Vì sao gắt thế:** cùng một bệnh tái đi tái lại trong MỘT ngày — `/app` quảng
  cáo Luận Giải 150 khi trừ 25 · nút Diện Tướng ghi 5 mà trừ 8 · trang nạp hứa
  "64 lá số" khi mua được 16 · 9/10 trang `/tools/*` ghi sai (Phong Thủy 90 vs
  50, Xem Tuổi 50 vs 15) · và bản dự phòng trôi lại ngay trong PR đi sửa nó.
  Một con số CŨ nguy hiểm hơn hẳn một ô đang tải: ô đang tải thì người ta chờ,
  số cũ thì người ta tin.
- ⚠️ CỐ Ý không gom quà đăng ký / thưởng giới thiệu vào đây — chúng đến từ
  `app_config`, khác nguồn. Nhét chung vào bộ dò thì nó kêu suốt rồi bị tắt.

### Icon: KHÔNG dùng emoji màu — chi tiết ở `docs/ICONS.md`
`public/nav.js` là bộ icon dùng chung (102 icon SVG Lucide + `EMOJI_TO_ICON` 242
mục + `mountIcons()`), nạp trên gần như mọi trang, export ra `window.ICONS` /
`window.iconHtml` / `window.mountIcons` / `window.EMOJI_TO_ICON`.
- UI mới: `<span class="ic" data-icon="wallet"></span>` — **không** emoji màu.
- HTML dựng động bằng `innerHTML` → phải gọi lại `window.mountIcons(el)`, vì
  `mountIcons()` chỉ tự chạy MỘT lần lúc nav.js load.
- Dữ liệu còn lưu emoji (`tool_pricing.icon`) → đưa qua `window.iconHtml(raw)`,
  nó nhận cả emoji lẫn tên icon. Đừng viết map emoji riêng cho từng trang.
- **GIỮ** ký tự đơn sắc theo font: `→ ← ✦ ★ ✓ ✗ ✕ ⚠ ☰` (riêng `→` có ~1.430 chỗ
  trong CTA). Chúng ăn `currentColor`, là phần của nhận diện — đổi là phá theme.
- **KHÔNG áp dụng** cho prompt gửi LLM (emoji ở đó là chỉ dẫn định dạng cho
  model) và tin Telegram admin (Telegram không render SVG).
- Thêm icon → sửa `ICONS` trong nav.js **và bump `nav.js?v=` trên cả cây `public/`**
  (201 chỗ / 145 file — nhớ cả `public/tools/`, quét mỗi tầng một là sót).
- **`iconHtml()` trả SVG có sẵn `width="1em"`** (từ 2026-09-02). Trước đó nó trả
  SVG KHÔNG CỠ, chỉ sống nhờ CSS `.ic>svg` — bộ chọn con TRỰC TIẾP — nên chèn
  trần ở đâu là nở HẾT bề ngang ở đó, hỏng im lặng và hỏng cỡ khổng lồ (đã ra
  prod: quyển sách nửa màn hình ở khối "Nguồn"). ⚠️ Dò `width` trên SVG thì
  ĐỪNG dùng `indexOf('width=')` — mọi icon Lucide có `stroke-width=`, khớp nhầm.
- **Trang KHÔNG có nav bar** (27 trang shell + 2 trang admin) nạp CHÍNH `nav.js`
  ở **chế độ chỉ-icon**: `<script src="/nav.js?v=22" data-icons-only></script>`
  → chỉ cấp icon + CSS, KHÔNG dựng nav, KHÔNG chèn GA4/`conversion.js`/`auth.js`.
  Nhờ vậy cả site dùng MỘT nguồn icon; `public/icons.js` không cần tồn tại.
  `shell.js` vẫn giữ bộ 28 icon riêng cho sidebar của nó — khác mục đích, không gộp.
- **`admin*.html` dùng MutationObserver** dựng icon cho mọi nhánh mới chèn (210
  chỗ `innerHTML`, gọi tay là chắc chắn sót). `mountIcons` bỏ qua phần tử đã có
  `<svg>` nên không lặp vô hạn.
- 🪤 **HAI BẪY đã vấp thật, chỉ lộ khi mở bằng trình duyệt:**
  1. **Đừng chèn span vào GIÁ TRỊ THUỘC TÍNH** (`placeholder="🔍 Tìm..."`) — dấu
     nháy trong span đóng sớm thuộc tính, **vỡ thẻ**, phần còn lại tràn ra màn
     hình. Bộ dò: `grep -nE '\b[a-zA-Z-]+="[^"]*<span class="ic-inline"'`.
  2. **Đừng đổi emoji đi vào `textContent`** — sink đó in nguyên chuỗi HTML.
     Chỉ đổi khi đích là `innerHTML`.
- ⚠️ **Nhánh dự phòng của span in EMOJI THÔ**, không để trống — nên "trang trông
  vẫn có icon" KHÔNG chứng minh icon đã dựng. Cách kiểm đúng duy nhất:
  `[data-icon]` nào KHÔNG chứa `<svg>` sau khi tải xong.

### Dùng thử rail cho khách CHƯA đăng nhập — cầu dao 3 lớp
`/api/v1/chat` KHÔNG còn 401 cứng khi thiếu token: khách vô danh được vài câu
dùng thử (`lib/billing/anon-trial.ts` + RPC `anon_rail_trial_consume`).
- **3 trần độc lập**, mỗi cái bịt một đường lách: `anon.rail_trial_turns` (trần
  ĐỜI theo `anon_id`) · `anon.rail_ip_daily_cap` (bịt xoá-localStorage, phải NỚI
  vì NAT nhà mạng) · `anon.rail_global_daily_cap` (cầu dao ngân sách).
  **Đặt bất kỳ trần nào = 0 là TẮT hẳn.**
- **Fail-CLOSED** — ngược `viral-budget.ts` (fail-OPEN) và ngược có lý do: cầu
  dao ảnh gác người ĐÃ TRẢ TIỀN, còn đây là khách vô danh chưa trả gì.
- **`client.anon_id` KHÔNG phải danh tính** — client tự khai. Đừng dùng cho
  quyền hạn/tính phí. Trần theo IP + toàn hệ thống mới là lớp chống lạm dụng.
- **Lượt anon CHẶN ảnh** (ảnh đội input token lên nhiều lần mà trần đếm theo
  LƯỢT) và **tiêu quota ngay khi cấp phép**, không đợi model xong — đếm sau khi
  thành công là mở đường gọi model rồi ngắt kết nối để khỏi bị tính.

### Guest checkout (Supabase Anonymous Sign-ins) — MỌI thưởng phải chặn `is_anonymous`
`requireCredits()` (`public/tuvi-paywall.js`) tự mở một phiên **ẩn danh** (âm
thầm, không hỏi gì — `Auth.signInAnonymously()`) cho khách CHƯA đăng nhập bấm
unlock, thay vì chặn bằng modal đăng ký. Phiên này là user **THẬT** trong
`auth.users` (`is_anonymous=true`), dùng được với mọi RPC/route hiện có; "Lưu
tài khoản" (`Auth.claimAccount()`) nâng cấp TẠI CHỖ cùng `user_id` — không
phải hợp nhất 2 tài khoản. Đây KHÁC hẳn `anon-trial.ts` ở trên (đó là
`anon_id` phía marketing cho vài câu chat miễn phí; đây là danh tính Auth thật
dùng để mua hàng) — đừng lẫn hai khái niệm "ẩn danh".

⚠️ **Vì tạo được bằng cách xoá cookie (không cần email/OTP), MỌI đường phát
thưởng phải tự kiểm `user.is_anonymous` trước khi cấp — thiếu một chỗ là cày
vô hạn.** Đã chặn ở `handle_new_user_signup()` (trigger quà chào mừng 20-40
Lượng), `handleOnboardingSync`, `handleReferralRegister`, `handlePromoRedeem`
(`app/api/payment/route.ts`). Thêm đường thưởng mới → nhớ thêm chốt này.
Xem `_patches/migration-anon-checkout-no-signup-bonus.sql`.

### Giá trị 1 Lượng: SUY TỪ BẢNG GÓI, không còn hằng số neo
**⚠️ `app_config['credits.vnd_per_credit']` ĐÃ BỊ GỠ** — đừng viết code đọc lại
khoá đó. Nguồn thật giờ là bảng `credit_packages`: đơn giá = **gói bậc hai**
(theo `sort_order`, tức mức phổ thông) = 399.000/600 = **665đ** (tăng giá
2026-08-30, xem `_patches/migration-credit-packages-reprice-2026-08.sql` —
trước đó là 199.000/240 = 829đ). Hai nơi cài CÙNG một quy tắc, phải sửa kèm
nhau:
- SQL `credit_vnd()` — cho các RPC báo cáo.
- `lib/billing/packages.ts` `vndPerCredit()` — cho route/rail. **Tự tính, KHÔNG
  gọi RPC** (rail là đường nóng), đổi lại phải giữ đúng cùng quy tắc.
- `lib/billing/packages.ts` `FALLBACK` — bản dự phòng khi DB đọc hụt, PHẢI
  đổi theo `credit_packages` mỗi lần sửa giá gói, nếu không rơi về fallback
  đúng lúc là tính tiền/cấp Lượng theo giá CŨ trong khi client đã hiện giá MỚI.

**Vì sao ghi hẳn cảnh báo:** đọc khoá đã chết KHÔNG ném lỗi, nó im lặng rơi về
mặc định `1000` trong khi giá thật là 665 (hoặc 829 tuỳ đợt giá) — sai hàng
chục % trên đúng con số đang hiện cho người dùng, và không có gì báo. Đã dính
đúng một lần.

**Ngoại lệ cố ý:** `coalesce(amount_vnd, amount * 2500)` cho dòng **topup lịch
sử** giữ nguyên 2500 — các giao dịch đó thật sự đã bán ở giá cũ, đổi là viết lại
lịch sử. Xem `_patches/migration-pricing-v2.sql`.

---

## ⛔ LUẬT CỨNG — vi phạm là hỏng prod, phần lớn hỏng IM LẶNG

Mỗi luật dưới đây sinh ra từ một lần cắn thật. Cột cuối là chỗ tra chi tiết.

### 💸 Đường tiền
| Luật | Vì sao | Tra |
|---|---|---|
| **Slug thanh toán PHẢI bắt đầu bằng đúng `tool_id`** — được dài hơn, CẤM ngắn hơn | `hasRecentToolPayment` lọc `slug=like.<tool_id>*`; slug ngắn hơn ⇒ lưới an toàn chết ⇒ trừ tiền xong vẫn 402 ⇒ user bấm lại ⇒ **trừ lần hai** | `nhat-ky/2026-08.md` "Duyên Nợ trừ tiền HAI LẦN" |
| **Mọi GET Supabase phải `cache:'no-store'`** | Next bọc `fetch` toàn cục và nhớ kết quả kể cả khi `dynamic='force-dynamic'`. Đã cắn **3 lần**: bản chia sẻ đã gỡ vẫn render · bộ giám sát báo job "CHƯA HỀ chạy" · trừ tiền xong vẫn 402 | `npm run check:nostore` |
| **Chốt thanh toán đặt TRƯỚC bước tính/gọi model** | Đặt sau là thu tiền rồi mới từ chối | mục "Hướng Nghiệp Sớm Cho Con" |
| **Hoàn tiền qua RPC `add_credits`, KHÔNG sửa thẳng `user_credits.balance`** | Sổ giao dịch phải giải thích được số dư | mục "Vận Hạn 12 Tháng" |
| **Giá Lượng: client KHÔNG chép số** — hiện bằng `data-tvp-price`, đọc hụt thì để `…` và **từ chối chạy** | Số CŨ nguy hiểm hơn ô đang tải: ô đang tải thì người ta chờ, số cũ thì người ta tin | `npm run check:prices` |
| **Trần/cầu dao ngân sách hướng fail phải ngược nhau tuỳ vai** | Gác NGÂN SÁCH → fail-**open** (`viral-budget.ts`); PHÁT tiền → fail-**closed** (`onboarding/tasks.ts`) | mục "M3 — Nhiệm vụ onboarding" |
| **Chống trùng đường tiền: dòng SỔ đi TRƯỚC làm mutex, cộng tiền SAU** — và mutex chỉ có thật khi có UNIQUE đỡ bên dưới | `Prefer: resolution=ignore-duplicates` KHÔNG làm gì nếu thiếu ràng buộc UNIQUE — đã im lặng vô hiệu từ đầu trên `paypal_order_id`. Và cộng tiền trước rồi ghi sổ sau thì lượt thua cuộc VẪN kịp cộng, chỉ trượt ở bước ghi ⇒ ví tăng hai lần, sổ một dòng | `paypal_settle_topup` · `bank_settle_topup` · `nhat-ky/2026-08.md` "Chuyển PayPal sang account công ty" |
| **Chuỗi khai với cổng thanh toán và chuỗi bảo khách ghi phải là MỘT** — server quyết, client chỉ hiện lại | Hai nguồn cho cùng một đơn thì cái khách đọc không phải cái cổng biết. Sống sót được tới giờ chỉ vì PayOS khớp bằng SỐ TÀI KHOẢN ẢO; kênh nào khớp bằng nội dung CK là khách gõ đúng theo màn hình mà tiền không ai nhận | `handleCreateBank` trả `description` · `nhat-ky/2026-08.md` "Chốt đơn chuyển khoản nguyên tử" |
| **Lỗi cổng thanh toán có HAI người đọc — đừng đưa cùng một chuỗi cho cả hai** | `message` của PayPal là MỘT câu chung chung cho mọi lỗi 422; lý do thật ở `details[0].issue` (+ `debug_id`). Nhưng trả thẳng `INSTRUMENT_DECLINED` cho khách cũng vô dụng ngang. Khách → câu tiếng Việt nói làm gì tiếp; mình → mã lỗi trong `console.error`. Đã trả giá: một lượt nạp hỏng vì thẻ hết tiền mà chính chủ site phải đi dò số dư mới hiểu | `humanIssueMessage()` · `nhat-ky/2026-08.md` "PayPal live lượt đầu" |

### 💾 Cache kết quả
- **Đổi CẤU TRÚC payload ⇒ BẮT BUỘC bump `SHAPE`.** `portrait_cache` khoá theo
  LÁ SỐ chứ không theo shape → dòng cũ được trả nguyên trạng **mãi mãi**, khối
  mới im lặng biến mất. Đã cắn **2 lần** (`day-con`, `huong-nghiep-tre`).
  Đổi CHỮ thì không cần bump. `npm run check:cacheshape`.
- **`cacheFor(toolId, shape)` là cửa DUY NHẤT** vào `portrait_cache`; 4 hàm cũ đã
  gỡ khỏi export. `_shape` **KHÔNG được vào `lasoKey`** — đổi khoá là mồ côi cả
  cache lẫn quyền sở hữu ⇒ người đã trả tiền bị tính lại.
- `free` phải xét **`cachedRaw`** (bản thô), không xét bản đã lọc.

### 🗄️ Postgres / RPC
- **Hàm `RETURNS TABLE` thì MỌI cột trong thân phải ghi kèm tên bảng** — trùng
  tên OUT param ⇒ `42702 ambiguous` ⇒ hàm chết hoàn toàn. Đã cắn 2 lần
  (`promo_code_redeem`, `process_referral_signup` — đường thưởng chết 6 ngày).
- **`UPDATE user_credits … WHERE user_id` phải UPSERT + soát `ROW_COUNT`** — ăn 0
  dòng vẫn chạy tiếp ⇒ **sổ nói đã trả, ví không tăng**. 9 tài khoản thật không
  có dòng ví.
- **Hàm SECURITY DEFINER mới LUÔN sinh ra hở**: EXECUTE cho PUBLIC là dựng sẵn
  của Postgres. Phải `REVOKE ALL FROM public, anon, authenticated` +
  `SET search_path = public, pg_temp` (nêu `pg_temp` tường minh, nếu không nó
  đứng đầu và che được bảng thật bằng bảng TẠM cùng tên).
  ⚠️ **Vá bằng `ALTER FUNCTION` chạy thẳng trên DB mà KHÔNG sửa lại
  `CREATE OR REPLACE` trong file migration nguồn là vá NỬA VỜI** — nó thay
  TOÀN BỘ `proconfig`, không cộng dồn với ALTER trước đó, nên deploy lại đúng
  file migration là hồi quy về `search_path` trần mà không ai để ý. Đã cắn:
  `tool_funnel`/`tool_funnel_lac` được vá ở đợt 2 rồi hồi quy, bắt lại ở đợt 3
  (`_patches/migration-secdef-search-path-batch3.sql`).
- **`} catch {}` rỗng trên đường tiền là cấm** — best-effort thì đúng, nhưng phải
  `console.error`, nếu không lỗi bay ra rồi bị nuốt trọn.

### ✍️ Prompt LLM
- **`max_tokens` KHÔNG phải trần cho phần CHỮ — Opus 5 tự bật `thinking` và token
  nghĩ ăn CHUNG trần đó.** `buildAnthropicBody` không truyền `thinking`, mặc định
  của model là BẬT ⇒ mọi lượt trả về `[thinking, text]`. Đo thật: phần 4 tốn 1160
  token cho 920 chữ khi bật, 570 token cho 993 chữ khi tắt — phần nghĩ ăn ~500–900
  token, trần hiệu dụng cho văn chỉ còn **~40–55%** con số ghi trong code. Đặt trần
  mới thì phải cộng `THINK_BUDGET` (xem `app/api/lasotuvi/route.ts`), và **đừng đọc
  `max_tokens` như số chữ tối đa**. Đây là nguyên nhân gốc của 7,9% phần luận bị
  cắt giữa câu trên hàng đã bán. `docs/nhat-ky/2026-09.md` "Token NGHĨ ăn chung trần".
- **Route văn dài chạy `output_config.effort:'low'` — CHỌN CÓ ĐO, đừng đổi mò.**
  A/B mù 48 bản: `low` rẻ hơn 39% output token mà chữ ra NHIỀU hơn, 16 cặp chấm mù
  không phân biệt được chất lượng. `effort` nằm TRONG `output_config`, đặt sai chỗ
  thì API bỏ qua IM LẶNG. ⚠️ **Đừng đổi sang `thinking:{type:'disabled'}` cho rẻ
  thêm 2%** — Opus 5 tắt hẳn thinking có thể RÒ THẺ `<thinking>` ra chính văn, mà
  văn này bán cho khách; `disabled` còn bị 400 ở effort `xhigh`/`max`. Và `THINK_BUDGET`
  vẫn phải giữ: 7/16 lượt model vẫn nghĩ. `nhat-ky/2026-09.md` "A/B mù 48 bản".
- **Mỗi prompt đúng MỘT nguồn bố cục.** Ba họ KHÔNG dùng lẫn: `arcCore` (rail
  chat, mang bối cảnh "vừa đọc xong bản luận", ngân sách 120–180 từ) · `arcDoc`
  (bản luận giải dài) · `arcGiong` (bản trả JSON có schema — chỉ chở GIỌNG, đụng
  bố cục là phá schema). `npm run check:prompt`.
- **Càng thêm luật thì luật càng mất tác dụng.** Đo được: 75% prompt từng là luật
  giọng, 12 lượt tranh quyền ưu tiên trong CÙNG một prompt. Khối mới phải **THAY**,
  không cộng dồn. Chạm trần `check:prompt` thì **CẮT chỗ khác**, đừng nới trần;
  nới thì phải ghi lý do.
- **Đổi công thức thì phải quét cả chỗ MÔ TẢ công thức** — prompt LLM không được
  typecheck bắt. Đã cắn với Kim Lâu (công thức sang mod 9 mà 3 chỗ vẫn nói "chu kỳ 5").
- **Giọng dạy bằng VÍ DỤ rẻ và ăn hơn dạy bằng LUẬT** — thấy giọng nhạt thì thêm
  một mẫu, đừng viết lại bảng khẩu ngữ.
- **`extractGenericContext` bỏ IM LẶNG mọi giá trị là object** ⇒ payload gửi rail
  phải PHẲNG. `npm run check:railfields` / `check:railwrap`.
- **Bản đang chạy phải khớp bản trong repo.** Edge function / RPC deploy xong phải
  **đọc ngược lại** rồi mới báo xong — đã cắn 4 lần (có lần chuỗi mô tả giao dịch
  gõ không dấu đi thẳng tới người dùng).

### 🀄 Cổ pháp / engine
- **KHÔNG sửa mò một công thức cổ pháp.** Nghi sai thì GHI LẠI, không sửa. Đang
  treo: `isHoangOc` (`tools-shared/kim-lau.js`, `t % 5` trong khi Hoang Ốc là vòng
  **6** trạng thái) · `TAM_HINH` (`lib/engine/diachi.ts`, xếp Dần–Hợi chung nhóm
  hình trong khi đó là LỤC HỢP).
- **Engine là nguồn số duy nhất; không chép công thức sang client.** Cần dùng ở cả
  hai phía thì viết `public/tools-shared/<tool>.js` rồi cả hai gọi chung.
- **Quét MẪU chỉ chứng minh được thứ mẫu CHẠM TỚI.** Với thứ liệt kê được thì đọc
  chính danh sách của nguồn (4.392 khoá mẫu vẫn bỏ lọt 10 tên).
- **Bảng dịch dựng từ MỘT nguồn thì chỉ phủ nguồn đó** — đã cắn 3 lần (chữ Hán,
  tên hành tinh). Cắm bộ dò rò rỉ mỗi lần đấu vào nguồn chữ mới.
- **Bảng âm lịch chỉ phủ `1900-01-01 → 2100-12-31`.** Ngoài tầm: bản vanilla
  (`public/tuvi-ansao-engine.js`) trả **`null`**, bản TS (`tuvi-engine`) **ném
  `RangeError`** — cố ý khác nhau theo nơi gọi, nhưng BIÊN phải khớp. Bản cũ
  `return {day:1,month:1,year:yy}` làm MỌI ngày dương của một năm trước 1900 ra
  CÙNG một lá số, im lặng. **Mọi lượt import ngày sinh từ nguồn NGOÀI phải gọi
  `isLunarSupported()` trước.** `npm run check:lunar` ·
  `nhat-ky/2026-08.md` "solarToLunar BỊA lá số".
- **`_LUNAR_TABLE` (cả 2 bản) SINH bằng thuật toán chính xác của oracle Thiên
  Lương (có ΔT) + quy tắc múi giờ lịch sử VN (UTC+8 trước 1968-01-01, UTC+7 từ
  đó) — KHÔNG gõ tay/chép từ thư viện ngoài nữa (P1, 2026-09). Tết Ất Sửu 1985
  lệch lịch TQ **cả một tháng** (21/1 chứ không phải 20/2) — bằng chứng bảng cũ
  sai thật, không phải tiểu tiết. Cần sinh lại → `scripts/gen-lunar-table.mjs`
  rồi `scripts/apply-lunar-table.mjs`; `npm run oracle:lunar` gate CI đối chiếu
  vét cạn 1900-2100, đừng sửa tay bảng rồi bỏ qua bước này.
- **Bản vanilla BỎ cờ `isLeap`** ⇒ ngày trong tháng nhuận đụng khoá với tháng
  thường (đo được: 336/365 ngày phân biệt ở năm có nhuận). **Nợ CỐ Ý, đừng sửa
  mò** — tháng nhuận là chuyện cổ pháp. `check:lunar` ghim hiện trạng: đổi là đỏ.
- **Khoá "cùng lá số" là ÂM LỊCH, không phải ngày dương** — an sao chỉ phụ thuộc
  (can chi năm · tháng ÂL · ngày ÂL · giờ · giới); số năm âm KHÔNG vào an sao, nên
  lá số lặp đúng chu kỳ **60 năm** (đo: 0/48 khác biệt giữa 1884/1944/2004). Giới
  tính thì PHẢI vào khoá (phụ tinh khác 100%, chính tinh khác 0%).
  ⚠️ `lasoKey()` của `lib/portraits/cache.ts` băm ngày **DƯƠNG** — không tái dùng
  cho việc gom theo lá số. `nhat-ky/2026-08.md` "Ai Sinh Cùng Ngày Với Bạn".
- **Bảng có tính ĐỐI XỨNG (Du Niên, quan hệ 2 chiều bất kỳ) tự kiểm được KHÔNG
  cần nguồn ngoài** — cung A nhìn cung B ra sao X thì B nhìn A cũng phải ra X;
  lệch là sai chắc chắn. `BatTrachTool.duNienStars()`/`getCungMenh()`
  (`tools-shared/bat-trach.js`) là nguồn DUY NHẤT cho cung mệnh + 8 sao Bát
  Trạch — 3 bản chép tay cũ (bản này + `route.ts` + 7 trang Vision) đều tự
  mâu thuẫn, sai 12-15/64 ô mỗi bản. `npm run check:batrach`.
  `nhat-ky/2026-08.md` "Bảng Du Niên Bát Trạch".

### 🚦 Thứ tự deploy
- **Dữ liệu đi SAU giao diện.** `tool_pricing.enabled=true` chỉ được bật **sau khi
  prod phục vụ được route** — bật trước là 404 cho người thật (đã làm 58 công cụ
  rơi vào "Khác" trong 4 phút).
- Migration an toàn (tạo dòng ở `enabled=false`, `on conflict do update` không
  đụng cột đó) thì chạy TRƯỚC deploy được; câu BẬT thì không.

### 📊 Đo lường
- **Traffic: luôn dùng bản `_human`.** 83% "visitors" là máy — `visitors_human`,
  `wau_human`, mẫu số `human`. GA4 **không lọc được**, đừng lấy `ga4.sessions` làm
  số khách. Trước khi báo bất kỳ mức tăng/giảm nào phải xem bản `_human`.
- **Log của bên GỬI không chứng minh bên NHẬN hiện ra.** Web-push "sent=2" suốt hai
  tháng trong khi `sw.js` không có handler `push`.
- **Con số của CỔNG TUYỂN không phải con số NGƯỜI XEM NHẬN** — đo trên chính bản
  giao ra (mp4/PNG đã render), đừng tin số của khâu lọc đầu vào.
- **Event = 0 thì phải hỏi "nó có được cắm ở MỌI đường tới chưa" TRƯỚC khi kết
  luận người dùng không quan tâm.** `invite_shown` = 0 suốt 17 ngày hoá ra vì lời
  mời chỉ cắm ở 1 trong 2 tấm tường mà người hết Lượng gặp
  (`docs/nhat-ky/2026-08.md`, mục "Dọn thư viện").
- **Khoảng cách giữa hai event ĐỀU BẮN LÚC LOAD không phải "thời gian ở lại".**
  `max(ts)-min(ts)` của khách chỉ có `page_view`+`tool_open` luôn ≈ 0 theo ĐỊNH
  NGHĨA — đã đọc nhầm thành "rời sau 0.1 giây" và suýt chỉ đạo một lượt thiết kế
  lại landing. Muốn nói về dwell thì phải có dụng cụ đo dwell: nay có
  `scroll_depth` + `page_dwell` (`meta.sec`/`meta.max_pct`) trong `track.js`.
  🪤 Trang `/app/*` cuộn trong `#ws`, KHÔNG cuộn window — nghe `scroll` ở pha
  **capture** trên `document`, gắn vào window là vĩnh viễn 0.
  `docs/nhat-ky/2026-09.md` "một con số tôi đã báo SAI".
- **Google Ads auto-tagging gắn `gclid`, KHÔNG gắn UTM** — `track.js` suy
  `utm_source=google, utm_medium=cpc` từ `gclid` khi trang chưa tự có `utm_source`
  (`currentTouch()`). Thiếu suy luận này thì mọi click Ads rơi lẫn vào `(none)`
  cùng traffic direct/organic thật, KHÔNG tách lại được — nhìn báo cáo tổng sẽ
  tưởng nhầm "Ads không ra traffic" trong khi nó ra thật, chỉ không được gắn nhãn.
  `docs/nhat-ky/2026-09.md` "Google Ads có traffic thật, 0 sign up".
- **Bộ lọc của một bậc phễu phải theo kịp mọi đường mới thêm vào bậc đó** —
  `viral_loop_funnel` lọc cứng `meta.from='share'` nên mù hẳn với đường B2
  (`share_form`): số không sai công thức, nó ĐẾM HỤT.

## 🪤 BẪY ĐÃ VẤP THẬT — đọc trước khi mất một vòng chẩn đoán

### Phương pháp (loại tốn nhiều giờ nhất)
- **Xanh oan nguy hơn đỏ oan.** Phép so vị trí (`indexOf`) phải kèm assert cái mốc
  CÓ TỒN TẠI — `-1` làm mọi so sánh luôn đúng. `grep "A \|\| B"` là ĐỖ GIẢ (`\|` là
  toán tử HOẶC trong BRE) → dùng `grep -F`.
- **Red-team bộ dò: assert đột biến ĐÃ ăn rồi mới đọc kết quả.** Nhiều lần "pass"
  chỉ vì lệnh thay chuỗi không khớp nên chẳng sửa gì.
- **Bảng thống kê CẮT TOP-N đọc thành "chưa từng xảy ra".** Log Vercel
  `group_by requestPath` cắt ở 25 mà repo có ~3.000 đường dẫn phân biệt (mỗi
  `/la-so/*` một cái) — route bị gọi 1–2 lần RƠI KHỎI BẢNG. Dùng `group_by route`
  (gộp `[slug]`, còn ~20 dòng), rồi lấy mốc giờ bằng `statusCode` + cửa sổ hẹp;
  tìm kiếm toàn văn hay hết giờ, đừng dựa vào. `nhat-ky/2026-08.md` "PayPal live
  lượt đầu".
- **Đối chứng `origin/main` HẾT HẠN** khi chính PR đó vào main, hoặc khi hạ tầng nó
  neo vào đã đổi. Neo đúng `origin/main` chưa đủ — phải neo đúng cái mình đang so.
- **Bài kiểm đặt tên theo điều nó THỰC SỰ đo**, không theo điều mình muốn nó đo.
- **Đọc TRỌN khối log quanh lỗi** — dòng ném ra thường không phải nguyên nhân
  (`document is not defined` thật ra là "engine chưa được dựng", 12 dòng phía trên).
- **Hai phép đo mâu thuẫn thì một cái sai — đừng chọn cái tiện hơn.**
- **`null` từ hàm mình tự gọi là dấu hiệu MÌNH gọi sai**, không phải "không đo được".
- **Đo trên bản đã cắt gọn thì đang đo bản cắt.**

### Shell / lệnh
| Bẫy | Cách tránh |
|---|---|
| `pkill -f 'xyz'` **tự giết chính nó** (exit 144) — đã vấp ≥5 lần | `pkill -f 'xy[z]'` hoặc bắt PID rồi `kill "$PID"` |
| Bẫy **cwd**: `cd tuvi-engine && …` giữ lại cwd cho lệnh sau — đã vấp ≥7 lần | Về gốc repo NGAY sau lệnh đó |
| `$?` sau **pipe** là mã thoát của lệnh CUỐI (`tail`), không phải lệnh mình quan tâm | Hứng ra biến trước, đừng đo sau `| tail` |
| `git checkout --ours` khi giải xung đột **xoá luôn phần đã auto-merge sạch** | `git apply -3`; sau mỗi lần giải xung đột **đếm lại dấu hiệu của CẢ HAI bên** |
| `import()` một script CLI là **CHẠY** nó | Kiểm cú pháp bằng `node --check` |
| `tsc` emit `.js` lẫn vào `lib/` | Khai `rootDir` + `outDir` ngoài repo, `git status` lại sau mỗi lượt |
| TS5112 (nêu file trên dòng lệnh khi cwd có `tsconfig.json`) · TS6064 (`--paths` chỉ khai được trong tsconfig) | tsconfig riêng dùng `include`, không nêu file |
| `fs.globSync` chỉ có từ Node 22, **CI chạy Node 20** | Duyệt cây bằng tay |
| `fetch` của Node KHÔNG tự đi qua proxy, `curl` thì có | `NODE_USE_ENV_PROXY=1` (đọc lúc KHỞI ĐỘNG) |
| `403 CONNECT` = proxy container chặn, **chưa chạm server** — khác hẳn 403 của API | Đừng đọc thành "tài khoản bị khoá" |

### Playwright / trình duyệt
- **`page.route` đăng ký SAU được ưu tiên** ⇒ catch-all `**/api/**` phải đứng TRƯỚC.
- **`isVisible()` / `page.url()` là ẢNH CHỤP tức thời** (tham số `timeout` không có
  tác dụng chờ) ⇒ dùng web-first assertion (`toBeVisible`, `expect.poll`). Đây là
  nguyên nhân 42% lượt smoke prod đỏ oan suốt 6 ngày.
- **Playwright đặt `navigator.webdriver=true`** ⇒ `track.js` tự no-op; muốn đo
  đường của người thật phải `defineProperty` cho nó về `false`. **Tour onboarding
  trong `app-home.html` dùng CÙNG cơ chế** (`if(navigator.webdriver) return;`) —
  quên giả cờ này là bài kiểm xanh oan vì chẳng đo gì cả.
- **`devices['iPhone 13']` mặc định `browserType:'webkit'`** mà máy chỉ có
  chromium ⇒ báo "Executable doesn't exist at .../webkit-2336", không nói gì về
  device. Khai tay `viewport/isMobile/hasTouch/userAgent`. Chromium chạy dưới
  root cần `--no-sandbox`.
- **`innerText` trả chữ HOA** khi phần tử có `text-transform:uppercase`.
- **Stub thiếu trường ⇒ đo nhầm ĐƯỜNG LÙI** mà vẫn xanh — lấy shape THẲNG từ code,
  đừng bịa. `.single()` của supabase-js chờ MỘT object, trả mảng là phía gọi vỡ.
- `addInitScript` chạy lại ở MỌI lượt điều hướng; stub `Auth` đặt ở đó bị `auth.js`
  ghi đè ⇒ chặn hẳn `auth.js` bằng `page.route`.
- **`Track` thì NGƯỢC CHIỀU `Auth`**: `shell.js` nạp `/track.js` BẤT ĐỒNG BỘ
  (`ensureTrackJs`) nên bản thật đáp xuống SAU và đè stub gán thường ⇒ khoá bằng
  `defineProperty(..., {writable:false})`. Triệu chứng: DOM dựng đúng mà mảng
  event vẫn rỗng.
- Chạy spec từ scratchpad thì `playwright` không resolve — chạy trong cây repo.
- `waitUntil:'networkidle'` treo vĩnh viễn vì container chặn Google Fonts.

### CI
- **`tsc --noEmit` xanh KHÔNG chứng minh `next build` chạy** — TS 7 gỡ hẳn compiler
  API mà CLI vẫn chạy; đã làm 7 lượt deploy prod ERROR. Nay có job `next-build`.
- **CI chạy trên merge-ref**, không phải trên nhánh ⇒ lockfile hiệu dụng là bản đã
  trộn với base ("local xanh, CI đỏ" thì nghi chỗ này trước).
- **Workflow `pull_request` thỉnh thoảng KHÔNG fire** (cả `opened` lẫn
  `synchronize`, cả commit thường lẫn merge commit — chưa tìm ra quy luật). Gặp thì
  chạy đủ bộ tại chỗ rồi **nói thẳng trên PR là CI vắng mặt**. PR "xanh" có thể chỉ
  là các check KHÔNG TỒN TẠI — **đếm đủ check trước khi kết luận**.
- Job tên `build` trong danh sách check là `build-android.yml`, KHÔNG phải `next build`.
- Artifact có đường dẫn bắt đầu bằng dấu chấm (`.lighthouseci/`) cần
  `include-hidden-files: true`, nếu không mất im lặng.

### Overlay / popup bám phần tử
- **Đặt popup theo một phần tử thì phải KẸP CỨNG vào vùng nhìn thấy SAU khi đã
  chọn trên/dưới.** Chọn xong gán thẳng là đủ để nhốt người dùng: điểm neo nằm
  ngoài màn thì popup văng theo, nút đóng ra ngoài mép, không còn đường thoát.
  Đo được: neo ở 1072px trên màn 844 → nút nằm dưới đáy 204px.
- **`window.innerHeight` KHÔNG phải vùng nhìn thấy trên iOS Safari** — nó tính cả
  dải nằm SAU thanh công cụ dưới cùng. Dùng `visualViewport.height/offsetTop`.
- **Điểm neo phải được kéo vào tầm nhìn trước khi vẽ** — `offsetParent!==null`
  chỉ nói phần tử có trong layout, không nói nó đang được nhìn thấy.
- **Mọi overlay chặn đường phải có đường thoát không phụ thuộc vị trí** (Esc).
  `nhat-ky/2026-09.md` "Tour onboarding nhốt người dùng".

### Tiếng Việt
- **Dò chuỗi thô trên văn tiếng Việt là sai lớp.** Đã trả giá: `\bcon\b` khớp "con
  vật" · `quan` khớp "tổng quan" · `sao` khớp "tại sao" · `Tuần` (tên sao) khớp
  "tuần này" · `Â`/`Ã` hợp lệ bị báo mojibake. Mẫu phải là **CỤM ĐỦ NGHĨA**; biên từ
  KHÔNG cứu được vì tiếng Việt viết rời từng âm tiết.
- **Hai lối bỏ dấu thanh** (`khoẻ` vs `khỏe`) → chuẩn hoá bằng
  `chuanHoaDauThanh()` (`lib/vn-text.ts`), **đừng bỏ dấu thanh** (`tật`↔`tất`).
- `đ/Đ` KHÔNG tách được bằng NFD — phải đổi tay.
- Dấu tổ hợp trong mã nguồn phải viết bằng escape `\uXXXX` (vô hình khi đọc diff).

## 🔭 Việc đang treo (cập nhật khi xong, đừng để mục chết nằm lại)

### Việc tay Henry — code không làm thay được
- **Facebook Page**: token chết (`code 190`), **54 bài `queued` từ 02/08**. Cấp lại
  token Page vĩnh viễn (5 bước in trong `FB_TOKEN_EXPIRED`, `lib/media/publish.ts`).
  ⚠️ Chỉ **copy** App Secret, **TUYỆT ĐỐI không Reset** — Messenger/WhatsApp đang
  dùng chung giá trị đó.
- **Telegram channel**: thêm bot làm admin + đặt `TELEGRAM_CHANNEL_ID` rồi mới
  thêm `"telegram"` vào `social.channels`.
- **Messenger** im lặng từ 27/06 — kiểm Page đã publish + có username chưa.
- **`brand_voice_docs` trên DB vẫn là bản CŨ** — chạy `node scripts/load-brand-voice.mjs`
  ở máy có `OPENAI_API_KEY` (container phiên không có).
- **`ANTHROPIC_API_KEY` không đọc được trong container — đã đo 3 lần liên tiếp**
  (trong khi `GEMINI_API_KEY`/`OPENAI_API_KEY` đọc được). Giả thuyết mạnh nhất: đặt
  ở env Vercel chứ không phải env của Claude Code. ⇒ **bước đo A/B `effort` vẫn bị
  chặn; đừng đoán mù `effort` rồi code theo phỏng đoán.**

### Nợ kỹ thuật đã ghi nhận
- `trimLaSo` / `buildPrompt` (bản không cache) là **code chết** — 0 route gọi.
- 3 bảng dò chủ đề vẫn là 3 bản chép tay (`check:topics` canh chúng khỏi trôi).
- `cong-cu.html` giữ bản chép riêng của `EMOJI_TO_ICON`.
- 5 tool chưa có `SHAPE` riêng đang ở mức 1 — lượt đổi payload đầu tiên phải bump.
- `seo_pages` (7.080 trang tương hợp) chưa nhận viral-core; đụng `updated_at` của
  8.958 dòng = `lastmod` toàn site nhảy một lượt ⇒ phải rải theo lô.

## QC & Testing

5 lớp QC chạy trên GitHub Actions. Mọi workflow đều free quota.

### Workflows
| File | Trigger | Mục đích |
|---|---|---|
| `lint.yml` | push/PR vào main/dev | ESLint + Prettier check |
| `unit-test.yml` | push/PR vào main/dev | `tuvi-engine/` vitest + typecheck + coverage |
| `playwright.yml` | push/PR vào main/dev | E2E full suite (16 specs, có auth) |
| `smoke-prod.yml` | deployment_status (prod) + cron 6h + manual | Smoke test trên prod URL, tạo issue `prod-down` khi fail |
| `lighthouse.yml` | PR vào main + manual | Lighthouse trên 4 URL chính, assert Perf/A11y/SEO/LCP/CLS/TBT |

### Lệnh local
```bash
npm run lint              # ESLint
npm run lint:fix          # ESLint auto-fix
npm run format            # Prettier write
npm run format:check      # Prettier check
npm run test:e2e          # Playwright full
npm run test:smoke        # Playwright smoke (PROD_URL=...)
npm run lhci              # Lighthouse local (cần Chrome)

cd tuvi-engine && npm test            # Vitest engine
cd tuvi-engine && npm run test:coverage
```

### Config files
- `eslint.config.js` — ESLint 10 flat config (migrated từ legacy `.eslintrc.json` sau khi bump 8→10)
- `.prettierrc` + `.prettierignore` — format style
- `.gitattributes` — chuẩn hoá LF (Windows ↔ Linux)
- `playwright.config.ts` — E2E full (cần auth, testIgnore `**/smoke/**`)
- `playwright.smoke.config.ts` — smoke prod (no auth)
- `lighthouserc.json` — Lighthouse assertions
- `.github/dependabot.yml` — weekly npm + actions updates

### Dependency versions (sau khi merge Dependabot tháng 5/2026)
- next: `^14.2.0` (chưa upgrade lên 16 — xem "Open PRs" bên dưới)
- @supabase/supabase-js: `^2.106.1`
- pdf-parse: `^1.1.1` (KHÔNG bump lên v2 — break `scripts/embed-tubinh.mjs`, xem "Open PRs")
- eslint: `^10.4.0` (flat config)
- @playwright/test: `^1.60.0`
- prettier: `^3.8.3`
- @types/node: `^25.9.1` (root + engine)
- vitest + @vitest/coverage-v8: `^4.1.7` (engine)
- GHA actions: checkout@v6, setup-node@v6, upload-artifact@v7

### Known limitations
- Prettier KHÔNG check HTML files, vanilla `public/*.js`, `app/api/tuong-mat/route.js`, `next.config.mjs`, `vercel.json` — bảo toàn alignment intentional + tránh diff cosmetic lớn
- ESLint disable `no-dupe-keys` + `no-redeclare` trong `public/tuvi-ansao-engine.js` — file có duplicate star keys cần audit (TODO line ~563)
- ESLint `no-useless-assignment` disabled — rule mới trong v9+ flag false positive ở vanilla files (pattern build-then-replace)
- Sentry alerts chưa setup (skip theo lựa chọn) — nếu cần, configure trong Sentry UI: New issue alert + Error rate spike (>10/5min) + Performance LCP P75 > 4s
- Playwright + Lighthouse SKIP trên Dependabot PR (`if: github.actor != 'dependabot[bot]'`) — Dependabot không có quyền dùng secrets

### Open Dependabot PRs (chưa xử lý — cần decision)
- **#13 next 14→16** ⚠️ — local build fail do thiếu env vars, không verify được. Risk cao: Next 15 thay đổi async params/cookies/headers, route handlers cần await. Khuyên: review release notes trên branch riêng trước
- **#11 pdf-parse 1→2** — v2 bỏ internal path `lib/pdf-parse.js` → break `scripts/embed-tubinh.mjs:20`. Khuyên: close PR, hoặc rewrite script trước khi merge
- **#1, #2 Vercel bot** (Speed Insights + Web Analytics) — không phải Dependabot, merge nếu muốn analytics

### Vercel preview cho Lighthouse
Hiện tại Lighthouse chạy trên prod URLs hardcoded. Để chạy trên Vercel preview của PR:
- Trigger workflow_dispatch + truyền `lhci_url_override=https://app-tuvi-git-<branch>.vercel.app/`
- Hoặc edit `lighthouserc.json` collect.url thành preview URL trước khi merge

### Smoke test issue dedupe + label
`smoke-prod.yml` cần label `prod-down` (đã tạo). Chỉ tạo issue mới nếu chưa có open issue cùng label — lần fail sau comment vào issue cũ.

### Cross-machine setup
Sau khi clone trên máy mới:
```bash
npm ci
cd tuvi-engine && npm ci && cd ..
npx playwright install chromium
```
ESLint dùng flat config (`eslint.config.js`) nên VS Code cần extension version mới (ESLint v3+).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
