# CLAUDE.md — Context cho Claude Code

> File này là **MỤC LỤC + LUẬT**, không phải kho. Nó nạp vào MỌI lượt nên mỗi
> dòng thừa ở đây là tiền thật. Mỗi luật ở đây tối đa 3 dòng; phần "vì sao · số
> đo · cách vá" nằm ở `docs/luat/`, diễn biến từng PR ở `docs/nhat-ky/`.

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 16, Supabase, Vercel)

---

## 🗂️ Kho tra cứu — KHÔNG nạp tự động, tra khi đụng đúng vùng

| Cần gì | Tra ở |
|---|---|
| Chi tiết một LUẬT | `docs/luat/README.md` → `tien` · `llm-prompt` · `engine-cophap` · `postgres` · `bay` |
| Diễn biến từng PR (117+ mục) | `docs/nhat-ky/README.md` → `2026-09` · `2026-08` · `2026-07` · `track-cu` |
| Luật icon đầy đủ | `docs/ICONS.md` |
| Cấu hình QC · giới hạn đã biết · dựng máy mới | `docs/QC.md` |

```bash
grep -rn 'từ khoá' docs/luat/ docs/nhat-ky/   # tìm mục
sed -n '120,190p' docs/nhat-ky/2026-08.md     # đọc đúng đoạn, đừng cat cả file
```

⚠️ **Chú thích trong mã nguồn trỏ "đã ghi trong CLAUDE.md"** (~12 chỗ ở
`scripts/*.mjs`, `.github/workflows/`) phần lớn nói về bài học CŨ — nay nằm ở
`docs/luat/` hoặc `docs/nhat-ky/`. Cố ý không sửa từng chỗ: chúng chỉ là chú
thích, sửa hàng loạt dễ đổi sai nghĩa hơn là để nguyên với dòng bắc cầu này.

### 🔴 Luật ghi chép (đọc trước khi định thêm gì vào file này)
1. **Nhật ký PR → `docs/nhat-ky/<tháng>.md`**, chèn lên ĐẦU file đó (mới → cũ),
   rồi thêm một dòng vào bảng trong `README.md`.
2. **Chỉ thêm vào `CLAUDE.md` khi rút ra được một LUẬT** — thứ mà lượt sau đụng
   vùng đó sẽ làm sai nếu không biết. Kể lại diễn biến một PR thì thuộc về nhật
   ký, không thuộc về đây.
3. **Một luật ở đây tối đa 3 dòng: câu lệnh · hậu quả · con trỏ.** Cần dài hơn
   thì viết thân xuống `docs/luat/<chủ đề>.md` và ở đây chỉ để lại con trỏ.
   ĐÂY mới là thứ giữ file khỏi phình — không phải mấy đợt cắt định kỳ.
4. **Trần mềm ~30 KB.** Chạm trần thì (a) CẮT luật đã hết hiệu lực, (b) đẩy thân
   luật còn hiệu lực xuống `docs/luat/`. Đừng nới trần.
5. 🔑 **Vì sao gắt thế:** file này từng phình tới **1.057.562 byte ≈ 350k token**
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

### Tầng LLM — chi tiết ở `docs/luat/llm-prompt.md`
- **`lib/llm/complete.ts`** — `llmText` / `llmTextFull`. Gemini primary, Anthropic
  backup, fallback HAI CHIỀU. `cacheSystem:true` bật prompt caching (`ttl:'1h'`).
  🪤 `GEMINI_MODEL` có **HAI** dòng mặc định (ở đây + `lib/agent/providers/gemini.ts`)
  — sửa một chỗ là khi env trống hai nhánh chạy hai model khác nhau, không ai báo.
- **`lib/agent/prompts.ts`** — `buildChatContext` (rail chat, ~26 toolType) ·
  `arcCore` / `arcDoc` / `arcGiong` (ba họ prompt KHÁC nhau, xem luật bên dưới).
- **`lib/agent/run.ts`** — `runAgent`, vòng lặp tool-use, ghi `llm_usage`.
- **`lib/agent/tools.ts`** — định nghĩa tool + `TOOLS_INSTRUCTION`.
- **`lib/agent/luan-giai-doc.ts`** — **`cachedSystemFor(laSoText, phan?)` là nguồn
  DUY NHẤT cho `system` khi bật `cacheSystem`** (Luận Giải · Chu Trình Cuộc Đời ·
  Vận Hạn 12 Tháng). Tự ghép chuỗi tay ở nơi khác là cache miss ngay lượt đầu.
  `phan` chọn CỤM CACHE, có đúng **3 cụm** (≤13 · 14-24 · bỏ trống) — bỏ trống =
  toàn văn là CỐ Ý: quên truyền thì tốn token, không thiếu dữ liệu.
- **`lib/agent/usage.ts`** — bảng giá model → `cost_vnd`. ⚠️ **Giá phải TRA bảng
  giá nhà cung cấp, cấm gõ từ trí nhớ**; đường hụt-bảng-giá lấy mức ĐẮT NHẤT trong
  họ. Sai kiểu này im lặng tuyệt đối và luôn nghiêng về thổi phồng biên LN.
- **`lib/llm/json.ts` `parseLlmJson()`** — NGUỒN DUY NHẤT để bóc JSON từ output
  LLM. `JSON.parse` trần đã hỏng cả lượt (15–35%/tháng) mỗi khi model chèn câu
  dẫn/ghi chú/fence quanh JSON. Mọi chỗ gọi LLM `json:true` phải qua đây.

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

### 39 bộ dò (chạy trong CI lint) — `npm run check:*`
`prices` `nostore` `groups` `viec` `share` `history` `shellboot` `introcard` `navph`
`authapi` `giosinh` `keyframes` `hoatdong` `hexagrams` `laso` `railfields`
`railwrap` `cacheshape` `hao` `motifs` `terms` `publish` `jobs` `token`
`prompt` `topics` `batrach` `sodep` `lunar` `vntz` `tooltip` `cns` `celebanh`
`nguoithan` `nhatky` `slug` `lasogolden` `refbenchmarks` `lavong`.
**Bộ dò kêu oan là bộ dò bị tắt đi** — thà thu hẹp còn hơn để nó báo bừa.

## 📐 QUY ƯỚC BẮT BUỘC (đọc trước khi viết UI mới)

- **💰 Giá Lượng: client KHÔNG chép số.** Nguồn duy nhất là `tool_pricing` +
  `credit_packages`, sửa trong Admin (không cần deploy); UI hiện bằng
  `<span data-tvp-price="<tool_id>">`, đọc qua `public/tool-prices.js`. Đọc hụt
  → để `…` và paywall **từ chối chạy**, KHÔNG đoán. Chỉ `admin.html` được fetch
  thẳng hai bảng đó. `npm run check:prices` · `docs/luat/tien.md`.
- **Giá trị 1 Lượng SUY TỪ `credit_packages`** (gói bậc hai theo `sort_order` =
  399.000/600 = **665đ**). ⚠️ `app_config['credits.vnd_per_credit']` **ĐÃ GỠ** —
  đọc lại khoá đó không ném lỗi, nó im lặng rơi về `1000`. Ba nơi phải sửa kèm
  nhau: SQL `credit_vnd()` · `vndPerCredit()` · `FALLBACK` (`lib/billing/packages.ts`).
  `docs/luat/tien.md`.
- **Icon: KHÔNG dùng emoji màu.** `public/nav.js` là bộ icon dùng chung
  (`data-icon="wallet"`); dựng bằng `innerHTML` thì phải gọi lại `window.mountIcons(el)`;
  emoji trong dữ liệu đưa qua `window.iconHtml(raw)`. GIỮ ký tự đơn sắc theo font
  (`→ ← ✦ ★ ✓ ✗ ✕ ⚠ ☰`). KHÔNG áp dụng cho prompt LLM và tin Telegram admin.
  Thêm icon → sửa `ICONS` **và bump `nav.js?v=` trên cả cây `public/`**.
  Luật đầy đủ + 4 bẫy đã vấp: `docs/ICONS.md`.
- **Dùng thử rail cho khách CHƯA đăng nhập** — `/api/v1/chat` không 401 cứng nữa;
  3 trần độc lập (`anon.rail_trial_turns` · `rail_ip_daily_cap` · `rail_global_daily_cap`,
  đặt = 0 là TẮT), **fail-CLOSED**, chặn ảnh, tiêu quota ngay khi cấp phép.
  ⚠️ `client.anon_id` do client tự khai — KHÔNG phải danh tính. `docs/luat/tien.md`.
- **Guest checkout (Supabase Anonymous Sign-ins)** — `requireCredits()` tự mở
  phiên ẩn danh THẬT trong `auth.users`; tạo được bằng cách xoá cookie ⇒ **MỌI
  đường phát thưởng phải tự kiểm `user.is_anonymous` trước khi cấp**, thiếu một
  chỗ là cày vô hạn. Khác hẳn `anon-trial.ts` — đừng lẫn hai khái niệm "ẩn danh".
  `docs/luat/tien.md`.

---

## ⛔ LUẬT CỨNG — vi phạm là hỏng prod, phần lớn hỏng IM LẶNG

Mỗi luật dưới đây sinh ra từ một lần cắn thật. Cột cuối là chỗ tra chi tiết.

### 💸 Đường tiền — `docs/luat/tien.md`
| Luật | Hỏng ra sao |
|---|---|
| **Slug thanh toán PHẢI bắt đầu bằng đúng `tool_id`** — dài hơn được, CẤM ngắn hơn | Lưới an toàn `hasRecentToolPayment` chết ⇒ trừ tiền xong vẫn 402 ⇒ user bấm lại ⇒ **trừ lần hai** |
| **Mọi GET Supabase phải `cache:'no-store'`** | Next bọc `fetch` toàn cục, nhớ cả khi `dynamic='force-dynamic'`. Đã cắn **3 lần**. `npm run check:nostore` |
| **Chốt thanh toán đặt TRƯỚC bước tính/gọi model** | Đặt sau là thu tiền rồi mới từ chối |
| **Hoàn tiền qua RPC `add_credits`**, không sửa thẳng `user_credits.balance` | Sổ giao dịch phải giải thích được số dư |
| **Giá Lượng: client KHÔNG chép số** — đọc hụt thì để `…` và **từ chối chạy** | Số CŨ nguy hơn ô đang tải: ô đang tải thì người ta chờ, số cũ thì người ta tin |
| **Trần/cầu dao hướng fail phải ngược nhau tuỳ vai** | Gác NGÂN SÁCH → fail-**open**; PHÁT tiền → fail-**closed** |
| **Chống trùng: dòng SỔ đi TRƯỚC làm mutex, cộng tiền SAU** — mutex chỉ có thật khi có UNIQUE đỡ bên dưới | `ignore-duplicates` không có UNIQUE là vô hiệu IM LẶNG ⇒ ví tăng hai lần, sổ một dòng |
| **Chuỗi khai với cổng thanh toán và chuỗi bảo khách ghi phải là MỘT** — server quyết, client chỉ hiện lại | Hai nguồn cho một đơn ⇒ khách gõ đúng theo màn hình mà tiền không ai nhận |
| **Lỗi cổng thanh toán có HAI người đọc** — khách nhận câu tiếng Việt nói làm gì tiếp, mình nhận `details[0].issue` + `debug_id` trong `console.error` | `message` của PayPal là một câu chung cho mọi lỗi 422 ⇒ không ai lần ra nguyên nhân |

### 💾 Cache kết quả — `docs/luat/tien.md`
- **Đổi CẤU TRÚC payload ⇒ BẮT BUỘC bump `SHAPE`.** `portrait_cache` khoá theo LÁ
  SỐ chứ không theo shape → dòng cũ trả nguyên trạng **mãi mãi**, khối mới im lặng
  biến mất. Đổi CHỮ thì không cần bump. Đã cắn 2 lần. `npm run check:cacheshape`.
- **`cacheFor(toolId, shape)` là cửa DUY NHẤT** vào `portrait_cache`. `_shape`
  **KHÔNG được vào `lasoKey`** — đổi khoá là mồ côi cả cache lẫn quyền sở hữu ⇒
  người đã trả tiền bị tính lại. `free` phải xét `cachedRaw` (bản thô).

### 🗄️ Postgres / RPC — `docs/luat/postgres.md`
- **`RETURNS TABLE` thì MỌI cột trong thân phải ghi kèm tên bảng** — trùng tên OUT
  param ⇒ `42702 ambiguous` ⇒ hàm chết hoàn toàn. Đã cắn 2 lần (đường thưởng chết 6 ngày).
- **`UPDATE user_credits … WHERE user_id` phải UPSERT + soát `ROW_COUNT`** — ăn 0
  dòng vẫn chạy tiếp ⇒ **sổ nói đã trả, ví không tăng** (9 tài khoản thật).
- **SECURITY DEFINER mới LUÔN sinh ra hở**: `REVOKE ALL FROM public, anon,
  authenticated` + `SET search_path = public, pg_temp`. ⚠️ Vá bằng `ALTER FUNCTION`
  mà không sửa lại file migration nguồn là vá NỬA VỜI — deploy lại là hồi quy.
- **`} catch {}` rỗng trên đường tiền là cấm** — best-effort vẫn phải `console.error`.

### ✍️ Prompt LLM — `docs/luat/llm-prompt.md`
- **`max_tokens` KHÔNG phải trần cho phần CHỮ** — Opus 5 tự bật `thinking`, token
  nghĩ ăn CHUNG trần đó (đo: trần hiệu dụng cho văn chỉ còn **~40–55%**). Đặt trần
  mới phải cộng `THINK_BUDGET`. Đây là gốc của 7,9% phần luận bị cắt giữa câu.
- **Route văn dài chạy `output_config.effort:'low'` — CHỌN CÓ ĐO, đừng đổi mò**
  (A/B mù 48 bản: rẻ hơn 39% output token mà chữ ra NHIỀU hơn). `effort` nằm TRONG
  `output_config`, đặt sai chỗ thì API bỏ qua IM LẶNG. ⚠️ Đừng đổi sang
  `thinking:{type:'disabled'}`: Opus 5 có thể RÒ thẻ `<thinking>` ra chính văn.
- **Mỗi prompt đúng MỘT nguồn bố cục.** `arcCore` (rail chat) · `arcDoc` (bản luận
  dài) · `arcGiong` (JSON có schema — chỉ chở GIỌNG). `npm run check:prompt`.
- **Càng thêm luật thì luật càng mất tác dụng** (đo: 75% prompt từng là luật giọng,
  12 lượt tranh quyền ưu tiên trong CÙNG một prompt). Khối mới phải **THAY**, không
  cộng dồn. Chạm trần `check:prompt` thì CẮT chỗ khác, đừng nới.
- **Đổi công thức thì phải quét cả chỗ MÔ TẢ công thức** — prompt không được
  typecheck bắt. **Giọng dạy bằng VÍ DỤ rẻ và ăn hơn dạy bằng LUẬT.**
- **`extractGenericContext` bỏ IM LẶNG mọi giá trị là object** ⇒ payload gửi rail
  phải PHẲNG. `npm run check:railfields` / `check:railwrap`.
- **Bản đang chạy phải khớp bản trong repo** — edge function / RPC deploy xong phải
  **đọc ngược lại** rồi mới báo xong. Đã cắn 4 lần.

### 🀄 Cổ pháp / engine — `docs/luat/engine-cophap.md`
- **KHÔNG sửa mò một công thức cổ pháp.** Nghi sai thì GHI LẠI, không sửa. Đang
  treo: `isHoangOc` (`tools-shared/kim-lau.js`) · `TAM_HINH` (`lib/engine/diachi.ts`).
- **Engine là nguồn số duy nhất; không chép công thức sang client** — cần cả hai
  phía thì viết `public/tools-shared/<tool>.js` rồi cả hai gọi chung.
- **Quét MẪU chỉ chứng minh được thứ mẫu CHẠM TỚI**; thứ liệt kê được thì đọc
  chính danh sách của nguồn. **Bảng dịch dựng từ MỘT nguồn thì chỉ phủ nguồn đó.**
- **Bảng âm lịch chỉ phủ `1900-01-01 → 2100-12-31`** — ngoài tầm: vanilla trả
  `null`, bản TS ném `RangeError`. **Mọi lượt import ngày sinh từ nguồn NGOÀI phải
  gọi `isLunarSupported()` trước.** `npm run check:lunar`.
- **`_LUNAR_TABLE` SINH bằng `scripts/gen-lunar-table.mjs`**, không gõ tay/chép
  thư viện ngoài; `npm run oracle:lunar` gate CI vét cạn 1900-2100.
  **Bản vanilla BỎ cờ `isLeap`** — nợ CỐ Ý, đừng sửa mò.
- **Khoá "cùng lá số" là ÂM LỊCH + giới tính, không phải ngày dương** (lá số lặp
  chu kỳ **60 năm**). ⚠️ `lasoKey()` băm ngày DƯƠNG — không tái dùng để gom lá số.
- **Bảng ĐỐI XỨNG tự kiểm được, không cần nguồn ngoài** (A nhìn B = B nhìn A).
  `BatTrachTool` (`tools-shared/bat-trach.js`) là nguồn DUY NHẤT; 3 bản chép tay cũ
  đều sai 12-15/64 ô. `npm run check:batrach`.

### 🚦 Thứ tự deploy
- **Dữ liệu đi SAU giao diện.** `tool_pricing.enabled=true` chỉ được bật **sau khi
  prod phục vụ được route** — bật trước là 404 cho người thật (đã làm 58 công cụ
  rơi vào "Khác" trong 4 phút).
- Migration an toàn (tạo dòng ở `enabled=false`, `on conflict do update` không
  đụng cột đó) thì chạy TRƯỚC deploy được; câu BẬT thì không.

### 📊 Đo lường — `docs/luat/bay.md`
- **Traffic: luôn dùng bản `_human`.** 83% "visitors" là máy; GA4 không lọc được,
  đừng lấy `ga4.sessions` làm số khách.
- **Log của bên GỬI không chứng minh bên NHẬN hiện ra** (web-push "sent=2" hai
  tháng trong khi `sw.js` không có handler `push`). **Số của CỔNG TUYỂN không phải
  số NGƯỜI XEM NHẬN** — đo trên chính bản giao ra.
- **Event = 0 thì hỏi "đã cắm ở MỌI đường tới chưa" TRƯỚC khi kết luận người dùng
  không quan tâm.** Cùng họ: **bộ lọc của một bậc phễu phải theo kịp mọi đường mới
  thêm vào bậc đó** — sai kiểu này không sai công thức, nó ĐẾM HỤT.
- **Khoảng cách giữa hai event ĐỀU BẮN LÚC LOAD không phải "thời gian ở lại"** —
  muốn nói về dwell thì dùng `scroll_depth`/`page_dwell` của `track.js`.
  🪤 Trang `/app/*` cuộn trong `#ws`: nghe `scroll` ở pha **capture** trên `document`.
- **Google Ads auto-tagging gắn `gclid`, KHÔNG gắn UTM** — `track.js` phải suy
  `utm_source=google, utm_medium=cpc`; thiếu là mọi click Ads lẫn vào `(none)`,
  không tách lại được.

## 🪤 BẪY ĐÃ VẤP THẬT — chi tiết ở `docs/luat/bay.md`

### Phương pháp (loại tốn nhiều giờ nhất)
- **Xanh oan nguy hơn đỏ oan.** `indexOf` phải kèm assert cái mốc CÓ TỒN TẠI (`-1`
  làm mọi so sánh luôn đúng); `grep "A \|\| B"` là ĐỖ GIẢ → dùng `grep -F`.
- **Red-team bộ dò: assert đột biến ĐÃ ăn rồi mới đọc kết quả.** Và **commit
  TRƯỚC, red-team SAU** — `git checkout -- <file>` kéo về HEAD, xoá trắng bản sửa
  chưa commit. `grep -c` đếm DÒNG, đếm lần thì `grep -o … | wc -l`.
- **Bảng thống kê CẮT TOP-N đọc thành "chưa từng xảy ra"** (log Vercel
  `group_by requestPath` cắt ở 25 mà repo có ~3.000 đường dẫn) → `group_by route`.
- **Đối chứng `origin/main` HẾT HẠN** khi chính PR đó vào main. **Bài kiểm đặt tên
  theo điều nó THỰC SỰ đo.** **Đo trên bản đã cắt gọn thì đang đo bản cắt.**
- **Đọc TRỌN khối log quanh lỗi** — dòng ném ra thường không phải nguyên nhân.
- **Hai phép đo mâu thuẫn thì một cái sai — đừng chọn cái tiện hơn.** **`null` từ
  hàm mình tự gọi là dấu hiệu MÌNH gọi sai**, không phải "không đo được".

### Shell / lệnh
| Bẫy | Cách tránh |
|---|---|
| `pkill -f 'xyz'` **tự giết chính nó** (exit 144) — đã vấp ≥5 lần | `pkill -f 'xy[z]'` hoặc bắt PID rồi `kill "$PID"` |
| Bẫy **cwd**: `cd tuvi-engine && …` giữ lại cwd cho lệnh sau — đã vấp ≥7 lần | Về gốc repo NGAY sau lệnh đó |
| `$?` sau **pipe** là mã thoát của lệnh CUỐI (`tail`) | Hứng ra biến trước, đừng đo sau pipe |
| `git checkout --ours` khi giải xung đột **xoá luôn phần đã auto-merge sạch** | `git apply -3`; sau đó **đếm lại dấu hiệu của CẢ HAI bên** |
| `import()` một script CLI là **CHẠY** nó | Kiểm cú pháp bằng `node --check` |
| `tsc` emit `.js` lẫn vào `lib/` | Khai `rootDir` + `outDir` ngoài repo, `git status` lại |
| TS5112 · TS6064 | tsconfig riêng dùng `include`, không nêu file trên dòng lệnh |
| `fs.globSync` chỉ có từ Node 22, **CI chạy Node 20** | Duyệt cây bằng tay |
| Không có `node_modules` thì `npx <tool>` kéo bản **bất kỳ** từ cache, KHÔNG phải bản của repo — đã làm lint đỏ vì prettier 3.8.1 vs 3.9.6 ghim trong lock | Nêu bản trong lockfile: `npx prettier@3.9.6` |
| `fetch` của Node KHÔNG tự đi qua proxy, `curl` thì có | `NODE_USE_ENV_PROXY=1` (đọc lúc KHỞI ĐỘNG) |
| `403 CONNECT` = proxy container chặn, **chưa chạm server** | Đừng đọc thành "tài khoản bị khoá" |

### Playwright · CI · CLS · overlay · tiếng Việt (mỗi mục đủ để mất một vòng chẩn đoán)
- **Playwright:** `page.route` đăng ký SAU được ưu tiên ⇒ catch-all đứng TRƯỚC ·
  `isVisible()`/`page.url()` là ẢNH CHỤP tức thời ⇒ dùng web-first assertion (gốc
  của 42% smoke prod đỏ oan) · `navigator.webdriver=true` làm `track.js` VÀ tour
  onboarding tự no-op ⇒ phải giả cờ, nếu không bài kiểm xanh oan · stub thiếu
  trường ⇒ đo nhầm ĐƯỜNG LÙI mà vẫn xanh · `Auth` bị `auth.js` đè, `Track` thì
  ngược chiều (khoá bằng `defineProperty writable:false`).
- **CI:** `tsc --noEmit` xanh KHÔNG chứng minh `next build` chạy (đã 7 lượt deploy
  ERROR — nay có job `next-build`) · CI chạy trên **merge-ref** nên lockfile hiệu
  dụng đã trộn với base · workflow `pull_request` thỉnh thoảng KHÔNG fire ⇒ **đếm
  đủ check trước khi kết luận PR xanh** · job tên `build` là `build-android.yml`.
- **CLS:** giữ chỗ chỉ có tác dụng khi khối CÓ MẶT ở lần vẽ đầu (nhét vào khối
  `display:none` chỉ làm cú chèn nặng thêm) · khung chờ KHÔNG khớp theo nội dung
  từ DB/API, nhắm DƯ chứ không THIẾU · **CLS chỉ kết luận được bằng prod↔prod**
  (preview đo hụt 0,016 vs 0,160 thật) · box JS chèn vào ĐẦU khung nội dung vừa
  gây CLS vừa LÀ phần tử LCP ⇒ dựng tĩnh trong HTML (`npm run check:introcard`).
- **Overlay:** popup bám phần tử phải **KẸP CỨNG vào vùng nhìn thấy SAU khi chọn
  trên/dưới** (đã nhốt người dùng thật) · `window.innerHeight` KHÔNG phải vùng
  nhìn thấy trên iOS Safari → `visualViewport` · mọi overlay chặn đường phải có
  đường thoát không phụ thuộc vị trí (Esc).
- **Tiếng Việt:** dò chuỗi thô là sai lớp — mẫu phải là **CỤM ĐỦ NGHĨA**, biên từ
  không cứu được (`\bcon\b` khớp "con vật", `Tuần` khớp "tuần này") · hai lối bỏ
  dấu thanh → `chuanHoaDauThanh()` (`lib/vn-text.ts`), **đừng bỏ dấu thanh** ·
  `đ/Đ` không tách được bằng NFD · dấu tổ hợp trong mã nguồn viết bằng `\uXXXX`.

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
- **`ANTHROPIC_API_KEY` không đọc được trong container** (`GEMINI_API_KEY`/
  `OPENAI_API_KEY` thì đọc được) — mọi phép đo phải gọi Anthropic đều chạy ở nơi khác.

### Nợ kỹ thuật đã ghi nhận
- `trimLaSo` / `buildPrompt` (bản không cache) là **code chết** — 0 route gọi.
- 3 bảng dò chủ đề vẫn là 3 bản chép tay (`check:topics` canh chúng khỏi trôi).
- `cong-cu.html` giữ bản chép riêng của `EMOJI_TO_ICON`.
- 5 tool chưa có `SHAPE` riêng đang ở mức 1 — lượt đổi payload đầu tiên phải bump.
- `seo_pages` (7.080 trang tương hợp) chưa nhận viral-core; đụng `updated_at` của
  8.958 dòng = `lastmod` toàn site nhảy một lượt ⇒ phải rải theo lô.

## QC & Testing — cấu hình đầy đủ ở `docs/QC.md`

5 lớp QC chạy trên GitHub Actions. Mọi workflow đều free quota.

| File | Trigger | Mục đích |
|---|---|---|
| `lint.yml` | push/PR vào main/dev | ESLint + Prettier check |
| `unit-test.yml` | push/PR vào main/dev | `tuvi-engine/` vitest + typecheck + coverage |
| `playwright.yml` | push/PR vào main/dev | E2E full suite (16 specs, có auth) |
| `smoke-prod.yml` | deployment_status (prod) + cron 6h + manual | Smoke test trên prod URL, tạo issue `prod-down` khi fail |
| `lighthouse.yml` | PR vào main + manual | Lighthouse trên 4 URL chính, assert Perf/A11y/SEO/LCP/CLS/TBT |

```bash
npm run lint              # ESLint          npm run lint:fix
npm run format            # Prettier write  npm run format:check
npm run test:e2e          # Playwright full
npm run test:smoke        # Playwright smoke (PROD_URL=...)
npm run lhci              # Lighthouse local (cần Chrome)
cd tuvi-engine && npm test          # Vitest engine (nhớ về gốc repo ngay sau đó)
```

⚠️ **Số phiên bản gói: TRA `package.json`**, đừng chép vào tài liệu — bảng chép
tay từng ghi `next ^14.2.0` khi repo đã ở `^16.3.2`, và trôi thì không ai báo.
Ngoại lệ duy nhất phải nhớ: **`pdf-parse` phải ở v1** (v2 bỏ `lib/pdf-parse.js`
⇒ `scripts/embed-tubinh.mjs:20` chết).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
