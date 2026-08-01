# CLAUDE.md — Context cho Claude Code

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 16, Supabase, Vercel)

---

## 🧭 Track CMO skills — brand-check, từ khoá, SEO (2026-08-01, PR #356–#359)

Henry giao 3 việc: (1) brand voice doc — **phiên khác đã chạy**, nằm ở
`brand_voice_docs`; (2) brand-check gate trước publish; (3) AI SEO.

### ⚠️ Plugin không nạp được vào container Claude Code
`brand-voice` và `marketing` **đã bật** trên tài khoản claude.ai nhưng
`~/.claude/skills` chỉ có skill built-in, và `claude plugin` ở container chỉ có
`details/enable/disable/eval` — **không có `install`/`marketplace add`**.
`claude-seo` thì **không có trong catalog** (chỉ tìm ra `searchfit-seo`).
⇒ Mọi thứ dưới đây viết tay theo checklist §8 của brand voice doc, không chạy
qua sub-skill. Đừng mất thời gian tìm lại cách cài trong phiên sau.

### ✅ #356 — brand-check gate (`lib/content/brand-check.ts`)
Chèn MỘT bước QC vào giữa 2 pipeline đang chạy, **không dựng pipeline mới**.
Gate đứng ngay trước `POST` của `cron-khao-luan` / `cron-master-write` vì cả
`khao_luan` lẫn `master_articles` **không có cột publish_status** — insert xong
là bài lên thẳng trang.
- **Tầng AUTO (regex)**: 0 lượt mạng, luật nằm sẵn trong TS nên chạy được kể cả
  khi Supabase/LLM chết; `app_config['content.brand_check']` chỉ GHI ĐÈ.
- **Tầng LLM**: 7 mục cần đọc hiểu, **fail-open** + `console.warn`.
- Trình tự: autofix → check → 1 vòng LLM viết lại → check lại. Bản viết lại
  **chỉ nhận khi thực sự ít lỗi hơn**.
- **HAI PROFILE, không phải hai mức nghiêm khắc.** Đo prod: `khao_luan` 324 bài
  (6 dùng "tôi") là ngôi 3; `master_articles` 306 bài (**300 dùng "tôi"**) là
  tùy bút ngôi 1 ký tên thầy. Áp luật Khảo Luận sang Nghiên Cứu chặn 98% output.
- Seed `mode='warn'` (tiền lệ shadow-mode M0.6). **Autofix VẪN áp ở warn** vì
  chạy trước khi phân nhánh mode. Siết: `jsonb_set(value,'{mode}','"block"')`.
- Bài bị chặn cất nguyên văn vào `content_qc_log.payload`; topic đỗ `qc_failed`.
- 🐞 **`bạn cũng…` lọt gate**: nhánh loại trừ `cũ` (danh từ "bạn cũ") khớp luôn
  tiền tố "cũng" vì thiếu ranh giới từ. Cụm cực phổ biến ⇒ lỗ rất rộng.
- 🐞 **`mình` hạ xuống `warn`**: soi 6 mẩu thật lọt bộ lọc thì cả 6 đều phản
  thân hợp lệ ("thu mình lại", "một mình phá vây"). Regex không tách được.
  Cùng bài học: đếm thô báo 98/324 bài sai xưng hô, lọc đúng danh từ còn **14**.

### ✅ #357 — Google Suggest → `keyword_ideas`
GSC 28 ngày chỉ **đọc được tên của đúng 10 truy vấn** (842 hiển thị còn lại bị
ẩn tên vì quá hiếm) ⇒ không có nguồn từ khoá để đặt title hay chọn chủ đề.
- **Không dùng Keyword Planner**: cần developer token phải xin duyệt, cần OAuth
  refresh token (**service account KHÔNG dùng được**, khác GA4/GSC), và không
  chi tiêu quảng cáo thì chỉ trả **volume dạng dải**. **Henry đã chốt KHÔNG chạy
  ads** ⇒ cột `volume` ở NULL vĩnh viễn, `best_position` là tín hiệu duy nhất.
- Chạy trên Vercel, cất asset vào Supabase — **container Claude Code chặn mọi
  host ngoài** (đã thử: `suggestqueries.google.com` và cả `tuviminhbao.com` đều
  403 qua proxy). Cùng pattern GA4/GSC.
- Tôn trọng endpoint không chính thức: tuần tự + nghỉ 350ms + trần 180 lượt +
  `User-Agent` khai đúng danh tính bot (cố ý không giả trình duyệt).
- 🐞 28 gốc × 10 hậu tố = **280 tổ hợp** nhưng trần 180 ⇒ 10 gốc cuối không bao
  giờ tới lượt. Vá bằng **xoay vòng theo số tuần**.

### ✅ #358 — gộp URL vận hạn · rút sitemap-pregen · vá trần hub
**Số đo GSC 28 ngày (đường đọc: `events` where `event_type='cmo_digest'`,
`meta->'gsc'` — cron ghi sẵn, không cần credential):**
| | |
|---|---:|
| URL đã nộp sitemap | **616.715** |
| Trang từng hiện trong kết quả | **612** (0,099%) |
| Nhấp | **16** (11 về trang chủ) |

- **Gộp 180 trang trùng**: `/tu-vi/van-han-tuoi-*` (mỏng, title tốt, có sitemap)
  ↔ `/van-han/*` (dày, không sitemap). Chọn bản dày, 301 bản kia, mở `NAM_XEMS`
  3→8 năm cho khớp `seo_pages`, nộp 576 URL, mang title tốt hơn sang.
  🐞 `NAM_XEMS[1]` làm "năm chính" trong title hub — mở mảng ra 8 năm là nó
  lặng lẽ thành 2024. Neo `currentNamXem()`.
- **Rút `sitemap-pregen`** (587.328 URL → sitemapindex RỖNG, không 404).
  ⚠️ **KHÔNG phải vì Google không index**: các trang `/la-so/*` xếp hạng
  **1,4–3,5** hẳn hoi. Chúng chỉ khớp truy vấn NGÀY SINH CHÍNH XÁC — 842 hiển
  thị, **0 nhấp**. Henry đã xoá sitemap trong GSC.
- **Vá trần hub**: HAI trần chồng nhau (`or=(…)&limit=2000` + `.slice(0,60)`).
  Fetch HTML thật của prod về đếm: chỉ **2/5 chuyên mục render, tổng 120 liên
  kết cho 7.848 trang**. Nay hỏi từng chuyên mục + phân trang → 300 liên
  kết/trang × 59 trang.
- **Phân trang theo ĐƯỜNG DẪN** (`/kien-thuc-tuvi/trang/30`), KHÔNG `?page=`:
  dạng này dùng đúng cơ chế "destination mang sẵn query" mà `/tu-vi/:slug` đã
  chứng minh chạy trên prod.

### 🪤 BẪY: `next dev` bỏ query của destination trong rewrite
Next 16 + Turbopack ở **dev** làm mọi hub và mọi `/tu-vi/<slug>` **307 về trang
chủ**. Tôi đã suýt báo đây là sự cố P0 do nâng Next 14→16.
**PROD KHÔNG DÍNH** — fetch thật `www.tuviminhbao.com/kien-thuc-tuvi` → HTTP 200.
Gặp 307 khi chạy dev thì đừng đi sửa nhầm chỗ.
Mẹo: `web_fetch_vercel_url` của Vercel MCP **với tới được prod** dù container bị
chặn mạng (preview thì không — khoá sau SSO).

### ✅ #359 — 🔴 công thức Kim Lâu SAI trên prod
Phát hiện khi chuẩn bị viết content, **không phải Henry báo**.
```
Code cũ : tuổi % 5, dư 1 hoặc 3
Đúng    : tuổi ÂM % 9, dư 1 / 3 / 6 / 8
```
4 số dư mod 9 ứng đúng 4 loại **Thân·Thê·Tử·Lục Súc** — chính 4 loại tài liệu
repo mô tả tool trả về. Bản mod-5 không thể sinh 4 loại ⇒ code lệch khỏi ý định
đã ghi, là bug chứ không phải biến thể cổ pháp.
**46% số tuổi 18–80 ra kết quả khác.** Nặng nhất: 16 tuổi (19·24·30·35·37·39·
42·44·55·57·60·62·64·69·75·80) trước đây báo "Bình thường" trong khi thực tế
phạm — người ta xem xong đi động thổ, cưới hỏi.
Kết quả nay nêu đích danh loại + hại ai. `kimLauLoai` là trường THÊM nên 2 trang
tiêu thụ không phải đổi.
⚠️ **CHƯA đụng `isHoangOc`** (`t % 5 === 0`, trong khi Hoang Ốc là vòng **6
trạng thái** Nhất Cát→Lục Hoang Ốc). Nghi sai nhưng chưa tra đủ chắc — sửa mò
một công thức cổ pháp còn tệ hơn để nguyên.

### 📌 CÒN LẠI
- **Hình dạng cụm content kim lâu CHƯA CHỐT.** GSC xác nhận có cầu ("cách tính
  kim lâu" hạng 92, "tính kim lâu làm nhà" 73) mà site có **0 trang**
  (`seo_pages` 0, `master_articles` 0, `khao_luan` 1). Tôi đề xuất **MỘT trang
  trụ mạnh** (`/kim-lâu`: công cụ + công thức + bảng tra trọn tuổi/năm sinh +
  4 loại + hoá giải + FAQ schema, kèm 301 từ `/tools/kim-lau.html`) thay vì cụm
  nhiều trang mỏng — vì cụm mỏng đúng là thứ vừa gỡ. Henry chưa trả lời.
- **Mốc đo quyết định hướng đi:** sau 2–4 tuần đọc lại `pagesWithImpressions`
  (hiện **612**). Bật lên rõ → mô hình chạy được, lúc đó gen trang cho chân dung
  vợ chồng / tiền kiếp / tử bình mới có cơ sở. Vẫn im → vấn đề là **thẩm quyền
  tên miền**, không phải số lượng trang; đừng viết thêm.
- ⚠️ **`xem tuổi vợ chồng` / `xem tuổi làm ăn` ĐÃ CÓ trang SEO** (3.540 + 3.540,
  6.500–7.500 ký tự, title đúng chuẩn *"Tuổi X Và Tuổi Y Có Hợp Nhau Không?"*).
  Henry tưởng chưa có. Thiếu thật chỉ là chân dung vợ chồng, chân dung tiền
  kiếp, tử bình.
- Lượt quét Suggest đầu tiên: **T3 hằng tuần**. Chạy tay:
  `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/keyword-suggest`
- Đọc `content_qc_log` vài ngày rồi cân nhắc siết gate sang `block`.

---

## 💸 ĐO DOANH THU ĐANG BỊA 78% (2026-07-31, PR sau #350)

Henry bảo đổi nốt hằng số 2.500đ trong `MKT_VND`/`dashboard_margin`/
`marketing_revenue`. Đo trước khi sửa thì ra chuyện lớn hơn hẳn con số:

| | đ |
|---|---:|
| Doanh thu đang BÁO CÁO | **10.075.000** |
| Tiền thật CHỨNG MINH được | **1.319.500** |
| Không rõ (5 giao dịch PayPal / 3.160 Lượng) | ? |

**~78% doanh thu đang báo cáo là suy ra từ `amount * 2500`, không phải tiền.**
Vì `credit_transactions.amount_vnd` **NULL ở CẢ 9 dòng topup** — R3 ("ghi tiền
thật cho giao dịch MỚI") chưa từng ghi được dòng nào, đơn giản vì từ lúc ship
tới giờ chưa có ai nạp thêm.

### 🔎 Đính chính một chẩn đoán sai của chính tao
Tao đã nói với Henry là "panel Biên LN đang thổi lên ~3 lần". **Sai.**
`dashboard_margin` KHÔNG dùng 2500 — nó đã đi qua `credit_vnd()` từ trước, hàm
này trả **1000**, tức lệch ~1,2 lần. Chỗ thật sự còn cứng 2500 là
`marketing_revenue` + 2 chỗ trong `admin.html`. **Đọc định nghĩa hàm trước khi
kết luận, đừng suy từ tên biến.**

### 2.500đ không phải số bịa — nó là giá của THỜI KỲ KHÁC
Đơn hàng đầu (24/04) là **122.500đ cho 50 Lượng = 2.450đ/Lượng**. Nên 2.500đ
từng ĐÚNG. Cái sai là (a) đem nó áp cho Lượng của hôm nay (gói đang bán
624–990đ) và (b) để nó thành hằng số chép tay ở nhiều nơi.

### Đã làm (`_patches/migration-revenue-truth.sql`, ✅ ĐÃ CHẠY prod)
1. **Backfill TIỀN THẬT** cho 4 giao dịch tra được từ `bank_orders` (khớp
   user + số Lượng + nhãn + cửa sổ 10 phút; đo được lệch thật 20–47 giây).
   Lấy lại chính xác **1.319.500đ**. Dry-run trong transaction rồi `RAISE` để
   rollback trước khi áp thật — đúng 4 dòng, không đụng dòng nào khác.
2. **`credit_vnd()` suy từ `credit_packages`** (gói phổ biến = 829đ) thay vì
   trả hằng số. ⚠️ Prod đang có `app_config['credits.vnd_per_credit'] = 1000`
   chốt cứng — **đã XOÁ**, không thì nhánh suy-từ-gói không bao giờ chạy tới
   (đúng y bệnh cũ, chỉ khác con số). Cơ chế ghi đè vẫn còn nếu cần chốt lại.
3. **`marketing_revenue` tách `real_vnd` / `estimated_vnd` / `estimated_count`
   / `vnd_per_credit`.** Gộp một cục thì không ai biết bao nhiêu phần trăm con
   số đó đứng vững được. `dashboard_margin` trả thêm `vnd_per_credit` để
   Dashboard và Marketing dùng chung một mốc.
4. `admin.html`: `MKT_VND` + `vndOf` ăn theo RPC (đặt TRƯỚC mọi lượt vẽ — bắt
   được lúc test là `renderMktSources` chạy trước nên bảng LTV hiện bằng mức dự
   phòng); panel Doanh Thu hiện thẳng "Tiền thật đã đối chiếu" vs "Ước lượng ·
   N giao dịch"; 5 nhãn tĩnh ghi "2.500đ" viết lại cho khỏi mâu thuẫn.

**Sau khi vá:** tổng 3.939.140đ = **1.319.500 thật + 2.619.640 ước lượng**, và
giao diện nói rõ đâu là đâu.

### ⚠️ CÒN LẠI — việc tay Henry
**5 giao dịch PayPal cũ (460/1000/200/500/1000 Lượng, tháng 4–5) không có số
tiền ở BẤT CỨ ĐÂU trong DB** — tên gói cũ ("Pro", "Nhóm", "Cá Nhân", "Gia
Đình") không còn trong `credit_packages`, và chúng thanh toán bằng USD. Muốn
doanh thu chính xác tuyệt đối thì mở lịch sử PayPal, lấy số tiền thật rồi
`update credit_transactions set amount_vnd = …, gateway='paypal'` cho 5 dòng
đó. **CỐ Ý không bịa số cho chúng** — đó chính là lỗi vừa sửa.

---

## 🎨 Trang topup dựng lại + ĐƯỜNG ICON DÙNG CHUNG BỊ HỎNG (2026-07-31, PR #350)

Henry: *"Sao page topup mày vẫn còn xài emoji nhỉ? Tao nhớ đã có session nói mày
sửa hết cho nó consistent rồi mà."* Anh nhớ đúng — markup ĐÃ được chuyển sang
`data-icon` từ trước. Vấn đề là **markup đó chưa bao giờ được dựng**.

### 🔴 Căn nguyên: `mountIcons()` chạy TRƯỚC khi thân trang tồn tại
`nav.js` gọi `mountIcons()` **đúng một lần, đồng bộ, ở ĐẦU `<body>`** — lúc phần
thân trang chưa được parse. Nên mọi span `[data-icon]`/`[data-icon-emoji]` nằm
dưới nav đều trượt lượt quét rồi rơi về nhánh dự phòng **in thẳng emoji ra màn
hình**. Tức đợt chuyển sang Lucide trước đây gần như không có tác dụng trên bất
kỳ trang nào — chỉ nav là được dựng.
- Vá: quét lại một lượt khi DOM đóng (`mountIcons` bỏ qua phần tử đã có `<svg>`
  nên chạy hai lần không tốn gì). **Đo trên 50 trang: 232 icon dựng thành SVG,
  0 trang còn emoji thô** (trước đó riêng `kien-thuc-tuvi.html` lọt 22 emoji).
- **Bài học:** sửa markup icon mà không kiểm bằng trình duyệt thì không biết nó
  có dựng hay không — nhánh dự phòng in emoji khiến trang *trông vẫn có icon*.
  Cách kiểm đúng: `[data-icon]` nào KHÔNG chứa `<svg>` sau khi tải xong.
- 2 trang dựng icon SAU lượt quét (`la-ban-phong-thuy`, `xlook`) phải tự gọi
  `window.mountIcons(container)` — mẫu này áp cho MỌI chỗ render động về sau.

### Bảng icon (nav.js v13 → v14, 78 → 88 icon)
- Thêm: `clock` `credit-card` `gift` `image` `info` `landmark` `qr-code` `scale`
  `shield-check` `temple`. `image`/`temple` lấy ĐÚNG path `shell.js` đang dùng —
  để sidebar Luận Đường và bảng giá không vẽ hai kiểu khác nhau.
- Map thêm 31 glyph còn sót, gồm **8 ký tự dùng làm `tool_pricing.icon`**
  (`☉ ⧇ ⚸ 🖼️ 🏯 🖌 💋 🧥`) vốn đổ thẳng ra trang Công Cụ + bảng chi phí.
- `iconHtml()` **không trả glyph thô nữa** mà trả icon dự phòng: `tool_pricing.icon`
  do admin gõ tay nên luôn có thể xuất hiện ký tự mới, và mỗi lần như vậy trước
  đây là một con emoji lọt thẳng ra giao diện.
- ⚠️ `cong-cu.html` vẫn giữ **bản chép riêng** của `EMOJI_TO_ICON` (dòng ~671) —
  nợ DRY chưa gỡ, sửa bảng ở nav.js thì nhớ nó.

### 🐞 Ba lỗi lộ ra khi làm trang topup
1. **Nạp SỐ TIỀN TỰ CHỌN bằng chuyển khoản CHƯA TỪNG dùng được.**
   `initiateBankTopup` đọc ô VNĐ rồi kiểm bằng ngưỡng **USD** (`< 5 || > 500`) và
   gửi trường `customAmount` (đường USD cũ của server) → mọi số tiền hợp lệ đều
   bị chặn tại client kèm *"Vui lòng nhập $5–$500"*. Nhánh PayPal cạnh bên thì
   đúng (`customAmountVnd`) — lệch nhau lâu rồi mà không ai thấy vì lỗi nằm ở
   nhánh ít test hơn.
2. **Trang chớp giá SAI.** Card viết cứng 50/120/350/800 Lượng rồi trông chờ
   fetch ghi đè, trong khi `credit_packages` thật là **100/240/700/1600** — sai
   đúng một nửa, và fetch hỏng thì sai luôn. Nay dựng card TỪ dữ liệu.
3. **Bảng chi phí báo đắt hơn thực tế tới 3 lần.** Quy đổi nhân cứng 2.500đ/Lượng
   (đơn giá mua lẻ) trong khi mua gói chỉ **624–990đ/Lượng**.

### Bố cục
- Số dư / quà đăng ký dùng CHUNG một chỗ (loại trừ nhau), không còn hai khối rồi
  ẩn bớt một cái để lại khoảng trống.
- **Chọn phương thức MỘT lần** (segmented control) → mỗi gói 1 nút thay vì 2
  (8 nút → 4). Mặc định **chuyển khoản QR** — người dùng VN gần như đều trả bằng
  app ngân hàng, trong khi bản cũ để PayPal làm nút chính (đậm màu).
- Quà đăng ký lấy từ server qua action mới **`signup-bonus`** (đọc
  `credits.signup_bonus_variants`, CÔNG KHAI vì hứa với người chưa có tài khoản).
  Đọc hỏng → lùi về câu chung chung, KHÔNG nêu con số.
- Referral gộp về MỘT lượt `my-referral` (bản cũ tự hỏi PostgREST hai bảng bằng
  anon key rồi tự đếm).
- Số công cụ miễn phí đếm từ dữ liệu (**21**, FAQ cũ ghi 28).

### 💰 Vòng sau — BỎ đơn giá 2.500đ tàn dư, nạp lẻ nay BÁM bậc gói
Phát hiện lúc dựng trang: gói bán **624–990đ/Lượng** nhưng nạp "số tiền khác"
chia cứng **2.500đ/Lượng** — đắt hơn 2,5–4 lần (99.000đ mua gói được 100 Lượng,
nạp lẻ chỉ **39**). Henry xác nhận *"nó là tàn dư đó, chỉnh lại cho hợp lý luôn
đi"*.
- **Căn nguyên là KIỂU dữ liệu, không phải con số.** 2.500đ lệch được chính vì
  nó là một hằng số RIÊNG, không dính gì tới bảng gói — nên thay bằng một hằng
  số khác thì lần sau lại lệch. `quoteCustomVnd()` (`lib/billing/packages.ts`)
  **suy đơn giá TỪ `credit_packages`**: lấy bậc tốt nhất mà số tiền với tới
  (đơn giá thấp nhất trong các gói có `amountVnd <= amount`); dưới gói nhỏ nhất
  thì hưởng bậc vào cửa. Đổi giá gói dưới DB là đường nạp lẻ tự đi theo.
- **Ba tính chất đã verify:** nạp lẻ KHÔNG BAO GIỜ thiệt hơn mua gói cùng số
  tiền (99k→100 L, 199k→240 L, 499k→700 L, 999k→1600 L — khớp ĐÚNG gói); thêm
  tiền không bao giờ nhận ít Lượng hơn (đơn điệu trên cả dải 50k–5tr); DB rỗng
  → trả 0 để route báo lỗi, không cấp `NaN` Lượng.
- Dùng `min` trên các gói với tới được (thay vì "gói đắt nhất ≤ số tiền") để vẫn
  đúng kể cả khi admin khai một bậc gói không đơn điệu.
- **Client PHẢI ra cùng kết quả** (xem trước tức thì, không đợi mạng) → có test
  đối chiếu bản client (trích từ `topup.html` thật) với bản server (trích từ
  `packages.ts` thật) trên **4.951 mức tiền**: khớp tuyệt đối. Sửa một bên thì
  phải sửa cả hai — đã ghi thẳng vào comment cả hai chỗ.
- **🐞 `FALLBACK` trong `packages.ts` cũng đang mang số cũ** (50/120/350/800
  Lượng, DB thật 100/240/700/1600) → một nhịp Supabase chớp là user trả đủ tiền
  mà nhận đúng một nửa. Đã sửa khớp prod.
- **Cùng hằng số 2.500đ còn đang nói dối ở 2 chỗ HIỂN THỊ:** `cong-cu.html`
  (`t.credits * 2500`) và `admin.html` (`VND_PER_CREDIT`) — đều báo giá công cụ
  đắt hơn thực tế ~3 lần. Cả hai nay suy từ gói phổ biến.
- **CỐ Ý KHÔNG đụng** `MKT_VND`/`dashboard_margin`/`marketing_revenue` (cũng quy
  2.500đ): đó là quy ước ĐO DOANH THU cho Lượng đã tiêu, khác hẳn giá bán, và
  đổi thì lệch toàn bộ báo cáo lịch sử. Nhưng đáng soi lại — nếu giá thật ~830đ
  thì mấy panel đó đang thổi doanh thu lên ~3 lần.
- Ghi chú thêm: `chat.cost` dưới DB đang là **2** (không phải 5).

---

## 🚨 Vá cảnh báo 10:00 VN 30/07 — BỘ DÒ ĐANG NÓI DỐI (2026-07-30, PR mới)

Cảnh báo Telegram nêu 4 mục. Điều tra ra: **1 mục đúng hoàn toàn, 2 mục đúng dữ
liệu nhưng sai sự thật, 1 mục sai hẳn** — và trong lúc lần nguyên nhân thì lộ
thêm một bug đang dội thông báo vào máy người dùng thật. Ghi lại vì cả 4 đều là
lỗi của tầng GIÁM SÁT, tức loại lỗi làm mọi cảnh báo sau đó mất giá trị.

### 1. 🔴 «health-check CHƯA HỀ có lượt chạy» — SAI HẲN. Bộ dò đọc qua CACHE.
Lúc cảnh báo bắn (03:00Z), `cron_runs` đã có 3 dòng `ok` của job này (01:30 ·
02:00 · 02:30Z). Căn nguyên: **mọi lượt GET đọc `cron_runs`/`app_config` đều
thiếu `cache: 'no-store'`** — đúng bug repo đã dính một lần ở `/ket-qua/[id]`
("Next bọc `fetch` toàn cục và nhớ kết quả kể cả khi `dynamic='force-dynamic'`").
Dựng lại được nguyên chuỗi: lượt cron 00:01Z (bản build CŨ, chưa có job này
trong sổ) nạp cache cho ĐÚNG URL đó → job merge 01:14Z (#343), chạy thật từ
01:30Z → lượt 03:00Z vẫn đọc bức ảnh trước 01:30Z. **Cache Vercel sống XUYÊN
deploy** nên bản build mới không làm nó mới lại.
- Vá `cache:'no-store'` ở **cả 3 nơi** đọc: `anomaly-alerts.ts` · `ops/digest.ts`
  · panel admin (`payment/route.ts`). Không vá đủ 3 thì hai bộ dò nhìn hai bức
  ảnh khác nhau — đúng chuyện đã xảy ra: digest 07:30 báo *"12 job, tất cả chạy
  đúng lịch"*, cảnh báo 10:00 báo 3 job có vấn đề, **cùng một bảng**.
- **`CRON_RUNS_LIMIT = 1000` dùng chung** (`lib/ops/jobs.ts`) thay 3 con số 300
  chép tay. Cửa sổ là "N dòng gần nhất" nên một job ồn ào đẩy được job khác ra
  ngoài, mà job bị đẩy ra thì đọc thành *"CHƯA HỀ chạy"* — 300 dòng lúc đó chỉ
  với tới 3 ngày trước, trong khi job TUẦN cần nhìn lại 10,5 ngày.

### 2/3. 🟡 «autopilot giá/nhắc segment lượt gần nhất LỖI» — ĐÚNG DỮ LIỆU, SAI SỰ THẬT
Dòng "lượt gần nhất" của cả hai là `Error: Dynamic server usage…` từ **27/07**,
tức Next PRERENDER route lúc BUILD, không phải lịch cron gọi. Lượt THẬT gần nhất
của `autopilot-price` là 27/07 01:00Z **`ok`**; `autopilot-nudge` chưa có lượt
thật nào (vào `vercel.json` ngày 26/07, lượt T6 đầu tiên là 31/07).
- **Quy mô rác: 519/941 dòng = 55% cả bảng** (`cron-daily-push` 218 · cmo-digest
  64 · anomaly-alerts 63 · 3 autopilot 58 mỗi cái). Mỗi push — kể cả **preview
  build của mỗi PR** — là một build, nên rác sinh theo cấp số.
- Đã purge trên prod (`_patches/migration-purge-fake-cron-runs.sql`) + **xoá 3
  dấu cooldown giả** trong `marketing.anomaly_last_fired`, nếu không thì 20 giờ
  sau đó cảnh báo THẬT của đúng 3 job này bị nuốt.
- Chặn tái phát ở `lib/cron/log.ts` (`withCronLog`): bỏ qua sạch khi
  `NEXT_PHASE='phase-production-build'`, và nếu lỗi vẫn lọt thì **XOÁ** dòng nhịp
  tim chứ không chốt thành `error`. Thêm luôn: **lượt 401 cũng không log** — 8
  route cron đều phơi ra Internet, `withCronLog` bọc NGOÀI bước kiểm secret nên
  một con bot quét URL cũng đẻ được một dòng `error` rồi thành cảnh báo giả.
  ⚠️ CỐ Ý không hạ xuống `skip`: `skip` là trạng thái CÓ NGHĨA (chạy mà không có
  việc) và 3 skip liên tiếp là một cảnh báo riêng — nhét rác vào đó chỉ đổi một
  cảnh báo giả thành cảnh báo giả khác.
- `since: '2026-07-26'` cho 3 job autopilot: sau khi purge, `autopilot-nudge`
  còn 0 dòng → không có `since` thì vừa gỡ cảnh báo giả đã dựng lại cái khác.

### 4. 🔓 «4 hàm SECURITY DEFINER cho anon gọi» — ĐÚNG. Vá xong.
`credit_vnd` · `anon_rail_trial_status` · `anon_rail_trial_consume` ·
`anon_rail_hits_prune`. Đã `set local role anon` xác nhận gọi được TRƯỚC khi vá:
`credit_vnd`→1000, `trial_status`→`{cap:3,left:3,used:0}` của bất kỳ anon_id nào.
Nguy hiểm thật là **`trial_consume` (hàm GHI)**: ai cũng đốt được trần ngày toàn
hệ thống (200) và trần theo IP (30) của người khác — cùng loại lỗ
`rail_free_grant` đã vá ở S0.
- **Lượt thứ HAI liên tiếp bộ dò bắt được loại này** (hôm trước là
  `marketing_signup_truth`). Căn nguyên không đổi: EXECUTE cho PUBLIC là DỰNG
  SẴN của Postgres, `ALTER DEFAULT PRIVILEGES` không gỡ nổi → **mọi hàm mới đều
  sinh ra hở**. 4 hàm này còn KHÔNG có trong repo (0 nơi gọi, 0 file migration) —
  tạo ad-hoc qua MCP từ track "rail dùng thử cho khách chưa đăng nhập" (2 bảng
  `anon_rail_*` đều 0 dòng, tính năng chưa deploy).
- `_patches/migration-revoke-secdef-anon-rail.sql`, đã áp prod. `service_role`
  giữ nguyên quyền; `dashboard_margin`/`viral_loop_funnel` gọi `credit_vnd` lồng
  bên trong vẫn chạy (SECURITY DEFINER → quyền của CHỦ hàm).
- **⚠️ Nhắn track anon-rail:** nếu đang định gọi 3 hàm `anon_rail_*` THẲNG từ
  trình duyệt bằng anon key thì thiết kế đó tự nó đã hỏng (`p_anon_id` do client
  tự khai, `p_ip_hash` không tính đúng được ở client ⇒ trần nào cũng vượt) —
  chuyển sang gọi ở server bằng service key, đừng mở lại quyền.

### 🐞 Bug lộ ra trong lúc chẩn (nặng nhất, KHÔNG nằm trong cảnh báo)
**`/api/cron-push` chạy mỗi lần build VÀ ai gọi cũng được.** Đo được **315 dòng
trong 7 ngày (~45 lượt/ngày) cho một job lịch NGÀY**, mỗi dòng
`note='sent=2 · failed=0'` → thông báo web-push THẬT đã bay tới thiết bị người
dùng hàng chục lần/ngày thay vì một lần mỗi sáng. Hai khuyết cộng lại:
`export async function GET()` không nhận `request` và không đọc API động nào →
Next 14 coi là route TĨNH và **THỰC THI trọn vẹn ngay trong `next build`** (đây
là mặt còn lại của cùng một bug: 6 route kia đọc `request.headers` nên chỉ ném
DynamicServerError, route này thì chạy thật); và nó là cron **DUY NHẤT không
kiểm `CRON_SECRET`** — bất kỳ ai biết URL đều broadcast được.
- Vá: `dynamic='force-dynamic'` + kiểm `Bearer CRON_SECRET`. Verify trên build
  thật: `.next/server/app/api/cron-push` **không còn `.body`** (route tĩnh có
  `.body` — nó là kết quả chạy lúc build đem cache). Vercel cron và nút "Chạy
  ngay" của panel đều tự gắn header đó nên không chặn đường gọi hợp lệ nào.
- **CỐ Ý KHÔNG xoá 315 dòng log này** (khác 519 dòng rác build): chúng là lượt
  chạy THẬT, là bằng chứng của chính bug này.

### Verify
`tsc --noEmit` 0 lỗi · `eslint .` 0 lỗi (72 warning pre-existing) · `prettier
--check .` sạch · **19 ca trên module thật** (biên dịch `lib/ops/jobs.ts` +
`lib/cron/log.ts` rồi stub `fetch`): dựng lại đúng trạng thái prod sau purge →
health-check hết `overdue`, autopilot-price hết `failing`, autopilot-nudge
`awaitingFirstRun`; **3 ca ĐỐI CHỨNG vẫn kêu** (lỗi thật → `failing`, dòng
`running` treo 90 phút → `stuck`, job trắng log mà `since` đã cũ → `overdue`);
`withCronLog` build-phase → **0 lượt gọi Supabase**, prerender-error → POST→
DELETE, 401 → POST→DELETE, lượt thật → POST→PATCH `status=ok`, lỗi 5xx thật →
PATCH `status=error` · **route thật trên Next dev**: không header → 401, secret
sai → 401, secret đúng → qua cửa · SQL verify trên prod: ACL 4 hàm còn đúng
`{postgres,service_role}`, anon bị chặn cả 4 (khối `DO` bắt ngoại lệ),
`security_audit().ham_ho_cho_anon` **rỗng**, 519 dòng đã xoá / 0 dòng còn khớp
mẫu, cooldown map còn đúng 7 khoá.

### CÒN LẠI
- **Việc tay Henry:** không có việc bắt buộc. Chỉ cần để mắt bản digest 07:30 và
  cảnh báo 3h/lượt trong 1–2 ngày tới — nếu đúng thì `health-check` và 2 job
  autopilot phải IM, và `autopilot-nudge` có lượt thật đầu tiên **T6 31/07**.
- Nợ đã biết, chưa làm: `cron-push` còn 315 dòng lịch sử làm cửa sổ hẹp lại
  (tự khỏi sau ~2 tuần, `CRON_RUNS_LIMIT=1000` đã đủ che); và toàn repo vẫn còn
  nhiều lượt GET Supabase khác thiếu `cache:'no-store'` — chỉ vá đường GIÁM SÁT
  trong PR này, chưa rà hết các route nghiệp vụ.

---

## 🧭 Marketing Autopilot + CMO Orchestrator Quân Sư

**Branch:** `claude/marketing-autopilot-track-setup-vse38f`
**Cập nhật:** 2026-07-26

### 🔖 RESUME HERE
**🎉 TOÀN BỘ WORKPLAN M0.1–M0.6 ĐÃ XONG.** Track khởi tạo 2026-07-25 (Henry giao
thẳng "làm M0.1"), đi hết 6 milestone trong ~2 phiên: M0.1 vá lỗ hổng đo lường
ISR → M0.2 CMO Digest → M0.3 cảnh báo bất thường → M0.4 nối hành động nhắc user
→ M0.5 đề xuất content/campaign (advisory) → **M0.6 autopilot THỰC THI THẬT**
(tự chỉnh giá/khuyến mãi/nhắc segment — mốc rủi ro cao nhất track, xem chi tiết
thiết kế an toàn ở mục M0.6 bên dưới). M0.6 **shadow-mode mặc định trên prod**
— Henry tự bật từng phần qua `app_config`/SQL sau khi xem log. Không còn
milestone nào đã chốt còn tồn đọng; việc tiếp theo (nếu có) là ý tưởng MỚI,
chưa bàn.

### ✅ M0.1 XONG (PR mới, session này) — track.js + GA4 phủ hết ISR + gộp share-widget.js
**Audit phát hiện trước khi sửa:** dashboard Marketing (track Admin Revamp, S0-D6)
đo qua `events`/`track.js`, nhưng **toàn bộ 20 route ISR SEO** (`la-so/[slug]`,
`menh-kho/[year]` + `[day]`, `van-han` + `[slug]`, `nghien-cuu` + `[slug]`,
`tu-vi/[slug]`, `khao-luan/[slug]`, `tu-vi-hub` (5 cat rewrite), `tu-dien` +
`[slug]`, `tac-gia` + `[slug]`, `luan-giai/[slug]`) — tức phần lưu lượng SEO
LỚN NHẤT site — **0 file có `track.js`**, nên toàn bộ traffic tổ chức/AI-crawler
đổ vào các trang này hoàn toàn mù trong Funnel/Acquisition/DAU. 3 trang share/
kết-quả công khai khác (`ket-qua/[id]`, `luan-duong/[id]`, `shared-chat/[id]`)
**mù luôn cả GA4** (không load `nav.js` — thiết kế cố ý bỏ chrome nav để giữ
layout branded độc lập cho link chia sẻ, nên GA4 chưa từng nạp qua đường đó).
Ngoài ra `share-widget.js` (bar chia sẻ Web-Share/Zalo/Facebook/copy, dùng thật
ở `la-so/[slug]` + `nghien-cuu/[slug]`) gọi endpoint chết `/api/share-event`
(404 âm thầm, không dùng `Track.event`) — audit D6 (track Admin Revamp) từng ghi
nhầm là "code chết, không nơi nào gọi" vì bỏ sót 2 trang ISR này.
- **Sprint 1 — track.js vào 15 file ISR đã có `nav.js` (đã có GA4 sẵn qua đó):**
  chèn `<script src="/track.js?v=1" defer></script>` ngay trước mọi tag
  `nav.js` (20 vị trí — vài file có nhiều nhánh template). Cache `s-maxage`
  dài của các route này không chặn gì — trang cũ tự có track.js khi CDN
  revalidate/miss, không cần bump cache-bust.
- **Sprint 2 — `ket-qua`/`luan-duong`/`shared-chat`:** không load `nav.js` (sẽ
  phá layout branded — nav.js chèn nav bar lên đầu `<body>` nếu thiếu
  `#nav-ph`). Thêm `lib/analytics/isr-tracking.ts` export `GA4_TRACK_SNIPPET`
  (script GA4 gtag inline, CÙNG Measurement ID `G-F4XNRS2XT0` với `nav.js` +
  `track.js?v=1`) — nạp trực tiếp, không qua `nav.js`.
- **Sprint 3 — gộp `share-widget.js` vào `share.js`:** thêm `ShareButtons.renderBar()`
  (Web Share API mobile + copy + Facebook + Zalo, UTM tự động qua `campaign`
  param) vào `public/share.js` cạnh `ShareButtons.render()` (hàng nút inline cũ
  của blog/khao-luan/tai-lieu/contact/tu-binh) — MỘT nguồn duy nhất. Track qua
  `ShareButtons.track()` có sẵn (→ `Track.event('share', {meta:{medium}})`),
  bỏ hẳn `gtag`/`fbq`/fetch `/api/share-event` chết của bản cũ. `la-so/[slug]`
  + `nghien-cuu/[slug]` đổi sang gọi `ShareButtons.renderBar` + nạp `/share.js`
  (nghien-cuu gắn `campaign:'nghiencuu'` để tách UTM khỏi `campaign:'laso'`
  mặc định). **Xóa `public/share-widget.js`.**
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi (72 warning
  pre-existing, không liên quan), `npx prettier --check` sạch cho mọi `.ts`
  đụng tới, `node --check` share.js/track.js OK, `cd tuvi-engine && npm test`
  181 pass (không liên quan nhưng xác nhận không đụng engine).
### 📋 Workplan M0.2–M0.6 (Henry đã chốt thứ tự 2026-07-25)
Phác thảo dựa trên hạ tầng ĐÃ CÓ (không thêm RPC/bảng mới trừ khi ghi rõ):
`events`/`user_attribution` + 12 RPC marketing/dashboard (funnel/sources/
acquisition/campaigns/traffic/cohorts/revenue/margin/engagement/content-revenue/
at-risk/channel-error-rate), GA4 Data API, và kênh đẩy Telegram admin có sẵn
(`lib/admin/alert.ts`, dùng cho alert đăng nhập).
- **M0.2 — CMO Digest tự động** (gửi Henry, read-only): cron đọc RPC → LLM tóm
  tắt → Telegram admin. 1 lần/ngày.
- **M0.3 — Cảnh báo bất thường:** so số hôm nay/tuần với baseline, ngưỡng lưu
  `app_config`, bắn ngay khi vượt (không đợi digest định kỳ). Vẫn read-only.
- **M0.4 — Nối hành động "nhắc user sắp rời bỏ":** D1 (track Admin Revamp) đã
  làm UI nút "Nhắc qua Telegram/Gửi Push" ở bảng User Sắp Rời Bỏ nhưng CHƯA nối
  hành động thật (`cursor:default`). Mốc ĐẦU TIÊN động tới end-user — cần chốt
  nội dung/tần suất trước khi bật (tránh spam/vi phạm chính sách nền tảng).
- **M0.5 — Đề xuất content/campaign** (advisory, không tự chạy): LLM đọc
  `marketing_sources`/`campaigns`/`traffic` → đề xuất kênh/nội dung nên đầu tư,
  hiện trong admin dashboard, Henry tự quyết.
- **M0.6 (để sau, rủi ro cao):** autopilot thực thi thật (tự chỉnh giá/khuyến
  mãi/tự tạo campaign) — bàn riêng khi có nhu cầu, chưa trong phạm vi gần.

### ✅ M0.2 XONG (PR mới, session này) — CMO Digest tự động
- **`lib/marketing/cmo-digest.ts`** — `buildSnapshot()` gọi lại 9 RPC đã có
  (KHÔNG thêm RPC mới): `marketing_funnel`/`marketing_revenue` 2 lần (tuần này
  vs tuần trước, WoW) + `marketing_sources` + `dashboard_engagement` (đã có sẵn
  wau/wau_prev/mau/mau_prev) + `dashboard_margin` + `channel_error_rate` +
  `dashboard_at_risk` (đếm số lượng). `generateCmoDigestText()` gói snapshot
  thành JSON, đưa 1 lượt `llmText()` (`lib/llm/complete.ts`, Gemini-primary/
  Anthropic-backup có sẵn) với system prompt ép format "📈 Điểm sáng / ⚠️ Điểm
  nghẽn / 💡 Đề xuất", dưới 350 từ, CẤM bịa số khi dữ liệu quá ít.
- **`app/api/cron/cmo-digest/route.ts`** — cron Vercel (`vercel.json` thêm
  `0 1 * * *` = 8h sáng VN), auth `CRON_SECRET` giống `cron/daily-push` có sẵn.
  Gửi qua `tgSendMessage` (`lib/channels/telegram.ts`) tới CHÍNH
  `ADMIN_TELEGRAM_CHAT_ID` đã dùng cho alert đăng nhập — **0 env mới cần set**.
  No-op an toàn nếu thiếu `ADMIN_TELEGRAM_CHAT_ID`. Log qua `withCronLog` có
  sẵn → tự hiện trong panel "Cron & Jobs" admin.html, không cần đăng ký thêm.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi (2 file `.ts` mới
  nằm ngoài phạm vi eslint theo thiết kế — repo chỉ lint `.js`, TS qua `tsc`),
  `npx prettier --check` sạch.
- **CÒN LẠI:** Henry xác nhận `ADMIN_TELEGRAM_CHAT_ID` đã set trên Vercel (nên
  có sẵn — dùng chung với alert đăng nhập); theo dõi bản digest đầu tiên (8h
  sáng VN hôm sau khi PR merge + deploy) xem chất lượng tóm tắt LLM có ổn
  không, tinh chỉnh system prompt nếu cần.

### ✅ M0.3 XONG (PR mới, session này) — Cảnh báo bất thường
- **`lib/marketing/anomaly-alerts.ts`** — `checkAnomalies()` đọc lại 5 RPC đã
  có (`channel_error_rate`, `dashboard_margin`, `dashboard_engagement`,
  `marketing_revenue` ×2 hôm nay/tuần trước), so với ngưỡng/baseline, trả
  danh sách cảnh báo THẬT SỰ vượt ngưỡng. 4 loại:
  - **Sức khỏe kênh:** error rate 24h/kênh > 8% (khớp ngưỡng "đỏ" đã có trên
    UI D2), mẫu tối thiểu 20 lượt (né noise).
  - **Biên LN chat âm:** margin < 0 trong ngày, chỉ xét khi doanh thu chat đủ
    lớn (≥50k đ, né noise mẫu nhỏ).
  - **DAU sụt / doanh thu sụt:** so hôm nay với TB 7 ngày trước — CHỈ xét sau
    20h VN (đợi dữ liệu trong ngày tích đủ, tránh báo giả lúc mới đầu ngày vì
    so sánh 1 ngày CHƯA XONG với baseline cả-ngày sẽ luôn trông như "sụt").
  - Ngưỡng lưu `app_config` key `marketing.anomaly_thresholds` (đổi không cần
    deploy). Cooldown 20h/loại (key `marketing.anomaly_last_fired`) — tránh
    spam lặp cùng 1 cảnh báo mỗi lần cron chạy.
- **`app/api/cron/anomaly-alerts/route.ts`** — cron Vercel mỗi 3 giờ
  (`0 */3 * * *`), CÙNG pattern auth/log/kênh gửi với `cron/cmo-digest`. **Im
  lặng khi không có gì bất thường** (khác digest — luôn gửi đều đặn) — chỉ
  gửi Telegram admin khi thật sự vượt ngưỡng, prefix `🚨` để phân biệt trực
  quan với `🎖️ CMO Digest`.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `npx prettier
  --check` sạch.
- **CÒN LẠI:** theo dõi vài ngày đầu xem ngưỡng mặc định (30% DAU/40% doanh
  thu/8% lỗi kênh) có hợp lý không — false positive thì nới `app_config`,
  im lặng hoài thì siết lại.

### ✅ M0.4 XONG (PR mới, session này) — nối hành động "nhắc user sắp rời bỏ"
Mốc ĐẦU TIÊN động tới end-user. **Quyết định giảm rủi ro:** KHÔNG tự động hoá
nội dung/gửi — nút ở bảng "Sắp Rời Bỏ" (D1) mở `prompt()` cho admin tự soạn/sửa
nội dung TRƯỚC MỖI LẦN gửi (có sẵn text gợi ý điền sẵn), không có LLM hay
template cứng tự bắn. "Tần suất" bị chặn tự nhiên vì cần admin bấm tay từng
người — cộng thêm cooldown server-side 24h/user (chống bấm nhầm/lặp). Tự chọn
kênh theo đúng gợi ý D1 đã có sẵn trên UI (im lặng ≥30 ngày → Push, <30 ngày →
Telegram) — không thêm UI mới.
- **`lib/channels/push.ts`** (mới) — lift phần gửi FCM HTTP v1 (JWT RS256 tự
  ký → OAuth token → `messages:send`) ra khỏi `app/api/cron/daily-push/route.ts`
  thành `parseFirebaseServiceAccount`/`fcmAccessToken`/`sendFcmPush` DÙNG
  CHUNG — cron broadcast-tất-cả-token và nhánh gửi-1-người-mới đều gọi cùng 1
  nguồn (behavior-preserving refactor, daily-push route không đổi hành vi).
- **`handleAdminNudgeUser`** (`app/api/payment/route.ts`, action
  `admin-nudge-user`, verifyAdmin) — nhận `{userId,channel,text}`. Cooldown:
  đọc lại `events` (`event_type=retention_nudge`) 24h gần nhất, có rồi thì từ
  chối (429). Telegram: tra `chat_links` (platform=telegram) lấy `external_id`
  → `tgSendMessage`; chưa liên kết → lỗi rõ ràng, KHÔNG âm thầm bỏ qua. Push:
  tra `push_tokens` theo `user_id` (cột đã có sẵn từ đầu, cron daily-push
  trước giờ chỉ chưa lọc theo user) → `sendFcmPush`, tắt token chết. Gửi xong
  ghi `events` (`event_type=retention_nudge`, meta `{channel,admin_email}`)
  làm mốc cooldown lần sau.
- **`public/admin.html`** — nút gợi ý (span, `cursor:default`, KHÔNG bấm được)
  ở bảng At-Risk đổi thành `<button>` thật, `nudgeAtRiskUser()` mở `prompt()`
  soạn nội dung (điền sẵn câu gợi ý nhắc số dư Lượng + link `/app`) → xác nhận
  → `apiPost('admin-nudge-user', ...)` → `toast()` kết quả.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `npx prettier
  --check` sạch, `node --check` 2 script block admin.html OK.
- **CÒN LẠI:** test tay 1 lượt thật (cả Telegram lẫn Push) sau khi merge+deploy
  để xác nhận `chat_links`/`push_tokens` tra đúng user; theo dõi vài lượt đầu
  xem admin có thấy prompt() đủ dùng không hay cần nâng cấp thành modal đẹp
  hơn (không cấp bách — tool nội bộ).

### ✅ M0.5 XONG (PR mới, session này) — đề xuất content/campaign (advisory)
- **`lib/marketing/content-suggestions.ts`** — `generateContentSuggestions(from,to)`
  đọc lại 3 RPC đã có (`marketing_sources`/`marketing_campaigns`/`marketing_traffic`,
  KHÔNG thêm RPC mới), đưa 1 lượt `llmText()` với system prompt ép 2 phần
  "📊 Kênh nên đầu tư thêm/xem lại" (dựa `sources`) + "✍️ Ý tưởng nội dung"
  (dựa `traffic.top_paths/top_referrers`), CẤM bịa số, nói thẳng "chưa có
  chiến dịch nào gắn utm_campaign" khi `campaigns` rỗng (đúng thực trạng hiện
  tại — D6 đã ghi nhận bảng Campaign trống), luôn chốt 1 dòng nhắc đây là gợi
  ý tham khảo.
- **`handleAdminMarketingSuggestions`** (`app/api/payment/route.ts`, action
  `admin-marketing-suggestions`, verifyAdmin) — nhận `from`/`to` CÙNG khoảng
  ngày admin đang xem trên trang Marketing (không tự chọn khoảng riêng).
- **`public/admin.html`** — panel mới "Đề Xuất AI (Content/Campaign)" trong
  `#page-marketing`, nút **"✨ Sinh Đề Xuất"** — sinh ON-DEMAND (không tự tải
  khi mở trang, tránh tốn LLM mỗi lần vào dashboard), `mktGenSuggestions()`
  gọi API rồi render text (escape qua `escHtmlLocal`, `white-space:pre-wrap`
  giữ xuống dòng).
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `npx prettier
  --check` sạch, `node --check` 2 script block admin.html OK.
- **🎉 XONG M0.1–M0.5 (toàn bộ workplan đã chốt với Henry).** **CÒN LẠI:** dùng
  thử "Sinh Đề Xuất" vài lần sau khi có đủ dữ liệu sources/traffic để đánh giá
  chất lượng gợi ý LLM, tinh chỉnh system prompt nếu cần.

### ✅ M0.6 XONG (PR mới, session này) — autopilot THỰC THI THẬT, mốc rủi ro cao
Henry: "Scope m0.6 đi. Cứ làm theo workplan cho xong hết đi" — tự scope 4 sub-
milestone (6.1–6.4) + panel admin (6.5) trong 1 phiên. **An toàn nằm ở THIẾT KẾ,
không phải "nhớ tắt"** — 2 lớp khoá độc lập: (1) công tắc tổng
`app_config['marketing.autopilot_enabled']` mặc định **false**, code KHÔNG BAO
GIỜ tự bật, lỗi đọc config → coi như false; (2) mỗi loại hành động còn có khoá
phụ riêng (bound giá rỗng / budget khuyến mãi=0 / budget nudge=0 mặc định) —
tắt tổng CHƯA đủ, phải khai rõ từng loại. Khi tắt, cron vẫn chạy đều — chỉ TÍNH
+ LOG (`autopilot_actions`) + Telegram admin (prefix 🧪) để Henry xem trước khi
bật; khi bật, cùng logic, chỉ khác bước cuối áp dụng thật (prefix 🤖). Mọi hành
động LIVE có cooldown riêng (đọc lại `autopilot_actions`).
- **Migration `_patches/migration-autopilot-actions.sql`** (✅ ĐÃ CHẠY prod qua
  Supabase MCP — verify 9 cột + RLS policy `autopilot_actions_admin_read`):
  bảng `autopilot_actions` (ts, action_type, mode shadow/live, target,
  before/after jsonb, reason, meta) — nhật ký DUY NHẤT mọi hành động, dùng cho
  cooldown lẫn panel admin. RLS đọc chỉ admin JWT (giống pattern events).
- **`lib/marketing/autopilot.ts`** (hạ tầng dùng chung) — `isAutopilotEnabled()`
  (fail-safe → false), `logAutopilotAction()`, `inCooldown(actionType,target,days)`
  (chỉ tính LIVE — shadow không giới hạn, vì không có hiệu lực thật),
  `notifyUserBestChannel()` (Telegram trước qua `chat_links`, else Push qua
  `push_tokens`, dùng chung cho promo_grant + segment_nudge), `notifyAutopilotRun()`
  (gộp N hành động/lượt cron thành 1 tin Telegram admin, tránh spam).
- **M0.6.2 — `lib/marketing/autopilot-price.ts`** — CỐ Ý THU HẸP: `dashboard_margin`
  (D3) chỉ có margin THẬT (doanh thu khớp chi phí) cho bucket `chat`
  (`rail-message`) — mọi bucket khác theo `scenario.type` CHỈ có cost, không có
  doanh thu riêng (billing rail phẳng). Tự chỉnh giá dựa số không khớp doanh thu
  là bịa → CHỈ áp `rail-message`. Hành động DUY NHẤT: TĂNG giá khi margin ÂM đủ
  lâu (tự vệ, ngăn lỗ tiếp) — KHÔNG BAO GIỜ tự giảm giá (tối ưu tăng trưởng bằng
  hạ giá cần con người quyết, rủi ro/lợi ích không đối xứng). Cần Henry khai
  `app_config['marketing.autopilot_price_bounds']['rail-message']={max,step}`
  mới đủ điều kiện (map rỗng mặc định = chưa tool nào bật). Cooldown 14N/tool.
- **M0.6.3 — `lib/marketing/autopilot-promo.ts`** — cấp Lượng bonus (mặc định
  5 Lượng) cho user tại `dashboard_at_risk` (CÙNG RPC bảng At-Risk D1 + nút nhắc
  tay M0.4, nhưng cooldown 30N ĐỘC LẬP — nhắc tay không tính vào đây). Budget/
  lượt `app_config['marketing.autopilot_promo'].budgetCreditsPerRun` mặc định
  **0 = tắt**, Henry phải tự đặt số dương. Hết budget giữa lượt chạy → phần còn
  lại rơi về shadow (không chặn cứng cả lượt). Gắn `credit_transactions
  type='autopilot_promo'`.
- **M0.6.4 — `lib/marketing/autopilot-nudge.ts`** — "tự tạo campaign" KHÔNG có
  tích hợp Facebook/Google Ads API (ngoài phạm vi, cần Henry cấp key) nên nghĩa
  là chiến dịch NHẮC LẠI qua kênh sở hữu (Telegram/Push) tới segment "sắp im
  lặng SỚM HƠN" promo (idle 7–13N, dùng lại `dashboard_at_risk(idle_days=7)`
  rồi lọc bớt phần ≥14N để không trùng segment M0.6.3). Message CỐ ĐỊNH (không
  LLM mỗi lượt — tránh chi phí + nội dung không kiểm soát), chỉ nhắc, không
  tặng gì. Budget/lượt mặc định **0 = tắt**.
- **3 cron mới** (`app/api/cron/autopilot-{price,promo,nudge}/route.ts`,
  pattern CRON_SECRET giống `cmo-digest`/`anomaly-alerts`) — TUẦN, dàn 3 ngày
  khác nhau tránh dồn tải: giá T2, khuyến mãi T4, nhắc segment T6 (8h sáng VN,
  `vercel.json`).
- **M0.6.5 — `handleAdminAutopilotLog`** (`app/api/payment/route.ts`, action
  `admin-autopilot-log`, verifyAdmin) — THUẦN ĐỌC: 100 hành động gần nhất +
  snapshot config hiện tại. **CỐ Ý KHÔNG có action bật/tắt qua API/UI** — Henry
  tự bật qua `app_config`/SQL trực tiếp, tránh 1-click bấm nhầm cho tính năng
  rủi ro cao. `public/admin.html` — panel "Autopilot — Nhật Ký Hành Động" trong
  `#page-marketing` (badge trạng thái BẬT/TẮT + bảng log mode shadow/live +
  before→after + lý do), load cùng lúc `loadMarketing()`.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi (72 warning
  pre-existing), `npx prettier --check` sạch cho mọi `.ts`/`.json` đụng tới,
  `node --check` 3 script block admin.html OK, `cd tuvi-engine && npm test`
  181 pass. Migration verify trực tiếp qua Supabase MCP.
- **CÒN LẠI (việc tay Henry, KHÔNG code):** mọi thứ M0.6 đang **shadow-mode**
  trên prod ngay khi merge (an toàn, không hành động thật) — theo dõi vài tuần
  log ở panel Autopilot trước khi cân nhắc bật thật từng loại qua `app_config`.
  Bật `marketing.autopilot_enabled=true` KHÔNG tự làm gì nếu chưa khai thêm
  bound/budget riêng từng loại (price bounds / promo budget / nudge budget đều
  mặc định rỗng/0).

---

## 🔌 Đọc GA4 từ terminal — `scripts/ga4.mjs` (2026-07-28)

Henry hỏi "làm sao nối Google Analytics vào cho mày đọc rồi phân tích". Trước đó
repo CÓ `lib/analytics/ga4.ts` nhưng nó chỉ lấy ĐÚNG 1 con số (tổng `sessions`,
để vá ô "Khách ghé" panel Funnel D4) — không phải cửa để ngồi phân tích.
- **`scripts/ga4.mjs`** — CLI thuần Node (0 dependency mới), auth service-account
  JWT tự ký giống `ga4.ts`/`indexing-api.mjs`, scope **`analytics.readonly`**.
  11 preset (`overview`/`daily`/`traffic`/`channels`/`campaigns`/`pages`/`landing`/
  `events`/`devices`/`countries`/`referrers`/`realtime`) + `report` tự chọn
  dimension/metric + `metadata` tra tên hợp lệ. Cờ `--from/--to` (nhận
  `28daysAgo`/`yesterday`/`YYYY-MM-DD`), `--filter dim==val | =~ | !=`, `--order`,
  `--limit`, `--json`.
- **Credential:** env `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` (**CÙNG TÊN**
  với env Vercel của `ga4.ts` — set 1 bộ dùng được cả hai), hoặc `--sa <file.json>`
  khi chạy ở máy Henry. **Không dán private key vào khung chat** (nằm lại trong
  lịch sử hội thoại — cùng lý do đã phải rotate service_role key Supabase).
- **`docs/GA4-CLI.md`** — bảng cờ + so sánh với `lib/analytics/ga4.ts`. **Bước 1–3
  (enable Data API → service account → cấp Viewer property `533053153`) HENRY ĐÃ
  LÀM XONG TỪ D4**, doc giữ lại dạng `<details>` để tham chiếu. **Chỉ còn bước 4**:
  env của Vercel KHÔNG chảy vào container phiên Claude Code (quét 127 biến env
  trong phiên: 0 biến GA4/GOOGLE/SERVICE_ACCOUNT) → phải đặt riêng
  `GA4_PROPERTY_ID`/`GA4_SERVICE_ACCOUNT_JSON` cho environment Claude Code (copy y
  hệt giá trị bên Vercel, không phải đụng lại Google), hoặc chạy `--sa` ở máy Henry.
- **Verify:** `node --check` · `eslint` sạch · `prettier --check .` sạch · chạy
  thật với RSA key tự sinh + stub OAuth (JWT đúng 3 phần, scope đúng, đổi được
  token) và stub Data API (bảng render đúng, TỔNG + "hiển thị 3/9 dòng", request
  body đúng cho `traffic`/`report`/`realtime`→`:runRealtimeReport`/`metadata`) ·
  gọi thật `analyticsdata.googleapis.com` với token giả → **401 + thông điệp lỗi
  của Google hiện đúng** (chuỗi auth chạy tới cùng). **CHƯA chạy được lượt có
  quyền thật** vì container phiên chưa có credential — đó chính là việc tay Henry.

### 🐞 Vòng sau (2026-07-28) — env đã set nhưng BỊ CẮT, và lộ bug prod thật
Henry set `GA4_PROPERTY_ID`/`GA4_SERVICE_ACCOUNT_JSON` cho container Claude Code
rồi bảo chạy thử. Kết quả: vẫn chưa đọc được GA4 — **nhưng lần này lỗi nằm ở
giá trị env, không phải ở quyền Google**, và lúc lần ra thì lộ thêm một bug đang
sống trên prod.
- **Trong container:** `GA4_SERVICE_ACCOUNT_JSON` dài đúng **18 ký tự** =
  `ewogICJ0eXBlIjo...` — tức bản RÚT GỌN mà UI Vercel hiển thị, không phải giá
  trị đầy đủ. `GA4_PROPERTY_ID=533053153` thì đúng. → **việc tay Henry: mở đúng
  ô đó trên Vercel, Show/Copy giá trị đầy đủ, dán lại vào environment của Claude
  Code.** Chưa có bản đầy đủ thì không có cách nào chạy thật.
- **🔴 Bug prod (quan trọng hơn):** cái tiền tố `ewogICJ0eXBlIjo` **base64-decode
  ra `{\n  "type":`** → giá trị Henry lưu bên Vercel là **base64**, trong khi
  `lib/analytics/ga4.ts` chỉ `JSON.parse` thô (CLI `scripts/ga4.mjs` thì nhận cả
  hai từ đầu). Parse hỏng → `getAccessToken` trả `null` **im lặng** →
  `handleAdminMarketing` lặng lẽ rơi về số nội bộ. Nghĩa là D4 nhiều khả năng
  **chưa từng chạy bằng số GA4 thật** kể từ lúc ship, mà không có gì báo. Sửa:
  tách `parseServiceAccount()` nhận **raw JSON hoặc base64** (chỉ NỚI ra, raw
  vẫn chạy y như cũ) + `console.warn` khi parse hỏng để lần sau lộ ra ngay.
  **Henry check lại badge cạnh "Khách ghé" trong panel Funnel sau khi deploy —
  xanh "GA4" là đã ăn số thật.**
- **CLI:** thêm bẫy phát hiện bản bị cắt (kết thúc bằng `...`/`…` hoặc < 100 ký
  tự) → chỉ thẳng "copy ô rút gọn trên Vercel" thay vì để người ta đọc "JSON
  không hợp lệ" rồi đi dò nhầm sang phía Google.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` · **test `getGa4Sessions` với RSA key tự sinh
  + stub OAuth/Data API**: raw JSON và base64 **ra cùng 1 kết quả** (JWT RS256,
  scope + URL `properties/533053153:runReport` + body đúng), bản bị cắt và chuỗi
  rác → `null` + cảnh báo, KHÔNG gọi mạng · CLI với key giả gọi thật
  `oauth2.googleapis.com` → `400 invalid_grant: account not found` (chuỗi auth
  chạy tới cùng, chỉ thiếu key thật). Gặp 1 nhịp `503` rỗng từ token endpoint
  rồi tự khỏi ở lượt sau — nhiễu tạm thời, không phải lỗi code.

### ✅ Vòng sau — GA4 nhiều chiều: panel "GA4 vs Nội Bộ" + nối vào CMO digest (PR mới)
Henry hỏi "lấy được live data chưa, realtime không, admin bổ sung được data gì, và
mỗi ngày gửi report cho CMO orchestrator được không". Audit trả lời: phễu
**không thiếu bậc** (visit→signup→activate→topup_intent→paid→returned đã đủ), chỗ
đứt là **GA4 chỉ đóng góp ĐÚNG bậc 1** — bậc 2–6 toàn dữ liệu nội bộ, nên không
quy kết được kênh GA4 nào đẻ ra người trả tiền, mà bảng Sources lại dựa
`user_attribution` từ `track.js` (chỉ thấy khách đã chạy JS) nên luôn hụt.
- **`lib/analytics/ga4.ts`** — tách `runReport()` dùng chung + `getGa4Breakdown()`:
  tổng sessions · **kênh** (`sessionDefaultChannelGroup`) · **landing page**
  (`landingPage`) · **`activeNow`** (`:runRealtimeReport`, 30 phút gần nhất — chiều
  DUY NHẤT thật sự "realtime"; Data API thường có độ trễ). 4 report chạy SONG SONG
  trên CÙNG 1 access token đã cache; **mỗi report hỏng độc lập** (realtime 403 thì
  `activeNow=null`, phần còn lại vẫn dùng được). `getGa4Sessions` giữ nguyên chữ ký.
  Thêm `console.warn` khi report lỗi — cùng lý do với bug base64: im lặng thì hỏng
  âm thầm hàng tháng.
- **`handleAdminMarketing`** đổi sang `getGa4Breakdown`, trả thêm `ga4` kèm
  **`internalVisitors`** (số nội bộ TRƯỚC khi bị GA4 ghi đè) — đó chính là vế còn
  lại để so hai nguồn.
- **Panel "GA4 vs Nội Bộ"** (`renderMktGa4`, ngay dưới Funnel): 4 tile (Phiên GA4 ·
  Nội bộ đo được · **% đo được** với ngưỡng xanh ≥80/cam ≥60/đỏ <60 · Đang online
  30ph) + 2 bảng kênh/landing. Tooltip nói rõ **% đo được thấp KHÔNG phải traffic
  giảm** mà là bảng Nguồn/Traffic đang dựa trên mẫu thiếu — đây là chỗ dễ đọc sai
  nhất nên viết thẳng vào UI.
- **`cmo-digest.ts`** — `buildSnapshot()` gọi thêm `getGa4Breakdown` (best-effort,
  `.catch(() => null)`, KHÔNG kéo sập digest). System prompt thêm nguyên một khối
  luật đọc GA4: `ga4=null` → nói thẳng "chưa đọc được GA4", cấm đoán lưu lượng;
  chênh GA4 vs nội bộ là đo hụt chứ không phải sụt; tỉ lệ ghép 2 nguồn phải ghi rõ
  là ước lượng. **→ digest Telegram 8h sáng tự có GA4, 0 cron mới, 0 env mới.**
- **Routine chat "Báo cáo CMO hàng ngày 8h10"** (`trig_01MDKn384hYTyLxbdRtunuoc`)
  **CHƯA sửa được bằng tool** — nó bind vào phiên khác (`update_trigger` từ chối
  sửa prompt của routine bắn vào session không phải của mình). Việc tay Henry: thêm
  bước chạy `scripts/ga4.mjs overview|channels|landing --from 7daysAgo` vào prompt.

### 🐞 Vòng sau — GA4 ĐANG BỊ CI THỔI PHỒNG, vá nốt nửa còn lại của D6 (PR mới)
Henry set env đầy đủ trên Vercel + Redeploy → panel "GA4 vs Nội Bộ" ra số THẬT
(2.088 phiên · nội bộ 531 · đang online 6 — nhánh realtime cũng chạy). **Nhưng
đọc số thì lộ bug:** top trang đáp là `/` · `/xem-lam-an.html` · `/xem-tuoi.html`
· `/luan-giai.html` · `/khao-luan.html` · `/blog.html` · `/profile.html` ·
`/resources.html` — **gần đúng danh sách URL trong `tests/*.spec.ts`**, mà
`playwright.yml` chạy E2E **thẳng vào prod** mỗi push/PR.
- **Căn nguyên: D6 vá đúng một nửa.** `track.js` có `if (navigator.webdriver)
  return` từ D6, nhưng GA4 nạp qua `nav.js` + `GA4_TRACK_SNIPPET` thì KHÔNG có
  chốt đó → CI vào GA4 nhưng không vào `events`. Hai nguồn đếm hai tập khách
  khác nhau.
- **Ba hệ quả trên chính bảng đang xem:** (a) Direct 1.783/2.088 = **85%** vì CI
  không có referrer; (b) **"% đo được 25%" là số ảo** — thấp một phần do GA4 đếm
  CI còn nội bộ thì không, khoảng hụt THẬT hẹp hơn; (c) Organic Search chỉ **36
  phiên** và **không có `/la-so/*` nào** trong top landing dù log Vercel đầy
  request `/la-so/…` → 438K trang SEO đang được **crawler quét chứ chưa kéo
  người thật** (bot không chạy JS nên không vào GA4). (c) mới là con số đáng lo,
  và chỉ lộ ra nhờ có GA4.
- **Vá:** thêm `&& !navigator.webdriver` vào cả `public/nav.js` lẫn
  `lib/analytics/isr-tracking.ts` — khớp đúng chốt `track.js` đã dùng. Bump
  `nav.js?v=16/15/17 → 18` (89 file; trước đó version đang lệch 3 mức khác nhau,
  gộp luôn về 1).
- **⚠️ Số GA4 sẽ TỤT RÕ sau khi deploy — đó là fix chạy đúng, không phải traffic
  chết.** Từ mốc đó "% đo được" mới là con số đọc được.
- **Verify:** `tsc` 0 lỗi · `eslint nav.js` sạch · `prettier --check .` sạch ·
  `node --check` · **Playwright 4 ca trên nav.js THẬT và trên chính chuỗi
  `GA4_TRACK_SNIPPET` đọc từ file `.ts`**: webdriver=true → không dựng thẻ
  `#gtag-js`, không có `window.gtag`, `dataLayer` rỗng; giả lập người thật
  (`navigator.webdriver=false`) → đủ cả ba, `dataLayer` có sự kiện.

### ✅ Vòng sau — GA4 lưu vào `events` để routine chat đọc được (PR mới)
Henry thử `scripts/ga4.mjs` ở phiên mới: **vẫn báo thiếu credential** (env của
container chưa nhận giá trị đầy đủ) — và chốt "không sao, tao chỉ cần data feed
cho routine CMO + admin page theo dõi". Nhưng đó chính là chỗ còn hụt: panel admin
và digest Telegram chạy trên **Vercel** (có key, đã xong ở vòng trước), còn routine
chat 8h10 chạy trong **một phiên Claude khác không có key** → tự nó KHÔNG BAO GIỜ
thấy GA4, dù prompt có bảo chạy CLI.
- **Cách vá — không phát tán thêm credential, không thêm bảng:** cron `cmo-digest`
  (8h00, chạy trên Vercel, vốn ĐÃ lấy GA4 cho snapshot) nay ghi luôn snapshot GA4
  thô vào `meta.ga4` của chính dòng `events` `event_type='cmo_digest'` mà nó vẫn
  ghi sẵn. Routine chat chạy 8h10 — 10 phút sau — chỉ cần đọc dòng mới nhất qua
  Supabase MCP là có đủ sessions/kênh/landing/activeNow/internalVisitors.
  `generateCmoDigestText()` đổi từ trả `string` → `{ text, ga4 }` (chỉ 1 caller).
- **Ghi cả khi `ga4=null`** — để phân biệt "hôm đó GA4 hỏng" với "hôm đó cron
  không chạy"; hai ca này mà lẫn nhau thì lần sau không chẩn được.
- **Lợi kèm:** có LỊCH SỬ GA4 theo ngày nằm trong `events`, truy vấn SQL được —
  trước đây GA4 chỉ đọc tức thời rồi vứt, không so được hôm nay với tuần trước.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi · `prettier --check .` sạch · test
  `generateCmoDigestText` trên file thật (stub LLM/GA4/RPC): trả đúng
  `{text, ga4}`, `ga4` đủ 5 trường, GA4 chết → `ga4:null` mà digest vẫn chạy.
  **CHƯA chạy được test đầu-cuối cho route cron** — nạp `next/server` ngoài
  Next runtime làm V8 OOM lúc biên dịch regex; phần route chỉ là truyền thêm 1
  tham số vào body insert sẵn có, đã soi tay + `tsc` phủ.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` cả 3 script block admin · **stub test
  `getGa4Breakdown`**: đúng 1 token + 4 report, đúng dimension/metric/limit,
  `orderBys` giảm dần theo sessions, realtime KHÔNG gửi `dateRanges`, realtime 403
  → chỉ `activeNow=null`, thiếu `GA4_PROPERTY_ID` → null và **0 call mạng** ·
  **test `generateCmoDigestText` trên file thật** (chỉ thay import LLM bằng stub):
  GA4 vào snapshot kèm `internalVisitors` đúng, **KHÔNG ghi đè
  `funnelThisWeek.visitors`** (giữ được cả 2 vế để so), GA4 chết → `ga4:null` mà
  digest vẫn chạy đủ RPC nội bộ · **Playwright render panel thật** light + dark:
  nhãn/số/`% đo được` đúng công thức, landing page chứa HTML **bị escape** (không
  chèn được thẻ), ca `null` hiện hướng dẫn kiểm env.

### ✅ Vòng sau — GA4 "Key events" luôn bằng 0: site chưa từng gửi event cho GA4 (2026-07-31, PR mới)
Henry gửi ảnh app GA4: *"Nó ko có gì luôn ah"* — card **Key events = 0**, trend
phẳng, Realtime *"No data available"*. Điều tra ra **GA4 không hề down**, và
chính tấm ảnh đó có bằng chứng: ô cạnh bên ghi `Event count per user 4.77 ↑11.8%`
— có số, còn tăng. Cái trống là một chuyện khác hẳn.
- **Căn nguyên:** `grep gtag(` toàn repo chỉ ra `gtag('js')` + `gtag('config')` ở
  `public/nav.js` và `lib/analytics/isr-tracking.ts` — **0 dòng `gtag('event',…)`
  trong cả codebase**. GA4 vì thế chỉ có event TỰ ĐỘNG (`page_view`,
  `session_start`, `first_visit`, `scroll`, `user_engagement` — khớp đúng con số
  4,77/user). Mọi tín hiệu nghiệp vụ (`signup`, `topup_start`, `tool_run`,
  `share`, `cta_click`…) đi `/api/track` vào bảng `events` Supabase và **chưa bao
  giờ chảy sang GA4** ⇒ không có gì để đánh dấu key event ⇒ báo cáo conversion
  của GA4 **vĩnh viễn 0**. Thiếu cầu nối, không phải sự cố.
- **Vá — một chỗ duy nhất, `public/track.js`:** `event()` gửi song song
  `gtag('event', …)`. Không phải sửa 89 trang vì mọi nơi đã gọi `Track.event`.
  Bảng `events` nội bộ **vẫn là nguồn chuẩn** cho admin; GA4 chỉ là bản sao để
  dùng công cụ Google. Lượt gửi GA4 đứng SAU `send()` và bọc `try/catch` — GA4
  hỏng không được kéo theo beacon nội bộ.
- **`page_view` CỐ Ý không gửi:** `gtag('config')` đã tự bắn một cái mỗi lần tải
  trang; gửi thêm là đếm đôi — đúng lỗi đã dính một lần khi `GA4_TRACK_SNIPPET`
  vô tình kèm thẻ `track.js` trên `/ket-qua`.
- **Hàng đợi là bắt buộc, không phải phòng xa:** `track.js` nạp NGAY TRƯỚC
  `nav.js`, cả hai `defer` nên chạy theo thứ tự tài liệu → lúc event đầu bắn thì
  `window.gtag` CHƯA tồn tại. Xếp hàng rồi xả khi gtag xuất hiện; **không đẩy
  thẳng vào `dataLayer`** vì event lọt vào trước `gtag('config')` có thể bị
  gtag.js bỏ qua. Bỏ cuộc sau ~10s để trang không có GA4 (`admin.html`) không
  treo timer vĩnh viễn.
- `signup` → **`sign_up`** (tên GA4 khuyến nghị, rơi đúng báo cáo dựng sẵn);
  `login`/`share` vốn đã trùng tên khuyến nghị. Tham số: chỉ giá trị vô hướng,
  **trải phẳng `meta` một tầng** (đó là chỗ chứa phần có nghĩa nhất — `medium`
  của share, `from`/`need` của topup_start), cắt chuỗi 100 ký tự, tối đa 24
  tham số, loại tên sai luật GA4 và tiền tố dành riêng `ga_`/`google_`/
  `firebase_`. **`anon_id`/`session_id` CỐ Ý bỏ** — GA4 tự có định danh riêng.
- Bump `track.js?v=2→3` (27 chỗ / 20 file).
- **Verify:** `tsc` 0 lỗi · `eslint track.js` sạch · `prettier --check .` sạch ·
  `node --check` · **8 ca Playwright trên CHÍNH file `track.js` thật**: page_view
  không sang GA4 mà beacon nội bộ vẫn có · event bắn trước khi gtag tồn tại vẫn
  tới nơi sau khi xả hàng đợi · `signup→sign_up`, `login`/`share` giữ nguyên ·
  meta trải phẳng, object lồng/`first`/`anon_id` bị loại · tên sai luật bị loại
  + chuỗi 250 ký tự cắt còn 100 · trang không có GA4 → 0 lỗi console, beacon vẫn
  chạy · `webdriver=true` → **không gửi cả GA4 lẫn beacon** (giữ nguyên chốt
  chặn CI) · **1 ca trên trang THẬT `index.html` với `nav.js` THẬT**: event tới
  `dataLayer` qua gtag của chính nav.js, và `config` đứng TRƯỚC `event` trong
  hàng đợi. ⚠️ Playwright đặt `navigator.webdriver=true` mặc định nên `track.js`
  tự no-op — phải `defineProperty` cho nó về `false` mới test được người thật
  (test artifact, không phải bug).
- **CÒN LẠI (việc tay Henry, không code được):** sau khi merge + deploy, vào
  **GA4 → Admin → Events**, đợi event mới xuất hiện (thường vài giờ tới 24h) rồi
  bật **"Mark as key event"** cho `sign_up` · `topup_success` · `tool_run`. Chưa
  bật thì card Key events vẫn 0 dù dữ liệu đã sang. Realtime trống lúc sáng sớm
  là **đúng thực tế**, không phải lỗi đo: `traffic_quality` 7 ngày cho 519 lượt
  ghé nhưng chỉ **25 lượt tương tác thật** (~3–4 người/ngày).

---

## 🧭 Ba lớp danh xưng: Quan Lộc × Mệnh × Thân — 194 → 566 (2026-07-29, PR mới)

Henry: *"vẫn dựa trên cung Quan làm core mà giờ mày tổ hợp nó với cung Mệnh,
cung an Thân… tao nghĩ nó sẽ lên cả ngàn danh xưng."* Đo trước khi code
(10.080 lá số) — **đúng một nửa**:

| Trục | Tổ hợp | 2 người trùng |
|---|---|---|
| Quan Lộc (đang có) | 39 | 4,90% |
| Quan × **Mệnh** | **60** | 2,09% |
| Quan × Mệnh × **Thân** | 372 | 0,33% |
| + bậc + giới | **1.316** | 0,11% |

- **🔴 Cung MỆNH gần như không nhân được gì.** Mỗi bộ chính tinh ở Quan Lộc
  chỉ ứng với **TRUNG BÌNH 1,54 bộ ở Mệnh** (min 1, max 10) → Quan × Mệnh chỉ
  ra 60 chứ không phải 39×39. Lý do cấu trúc: 14 chính tinh an theo một thuật
  toán từ vị trí Tử Vi nên cả 12 cung chỉ có **12 thế**, mà Mệnh với Quan Lộc
  **cách nhau cố định 4 cung** → biết cái này suy ra cái kia. Hai cung KHÔNG
  độc lập. Đừng thiết kế như thể chúng độc lập.
- **✅ Cung THÂN mới là trục nhân thật (×6).** Thân đóng vào 1 trong 6 cung
  (Mệnh · Phúc Đức · Quan Lộc · Thiên Di · Tài Bạch · Phu Thê) do **giờ sinh +
  tháng sinh** quyết định — độc lập với thế an sao, đo được trải đều đúng
  16,7%/cung.
- **`THAN_ASPECT`** (6 cung × 7 nhóm nghề = 42 hậu tố + `propEn` + `aspect`).
  Hậu tố theo **NHÓM NGHỀ chứ không theo tên sao** — ghép theo sao rất dễ ra
  "Thầy lang coi kỵ binh". Thân cư Mệnh → hậu tố **RỖNG có chủ ý** (cổ pháp:
  dồn cả đời một hướng, không rẽ nhánh).
- **`propEn` = ĐẠO CỤ vào prompt ảnh** — đây là chỗ khác hẳn trục sát tinh đã
  cân nhắc rồi bỏ: trục đó chỉ đổi chữ, `attireEn` giữ nguyên nên **ảnh y hệt**.
  Mảng Thân đổi được vật trong tay nhân vật (sổ sách + cân, hành trang, đồ tế
  khí…) nên bức tranh khác thật. Phủ 83,3% (16,7% còn lại là Thân cư Mệnh).
- **`MENH_ROLE`** (14 sao) — tư cách: thống lĩnh / tham mưu / dựa người / tay
  nghề. **CỐ Ý KHÔNG vào danh xưng**, chỉ vào `desc` + prompt truyện: danh xưng
  đã mã hoá CẤP qua bậc, nhét tư cách vào là tự mâu thuẫn (bậc cao ra "Đại
  nguyên soái" mà Mệnh lại nói "hợp làm tham mưu"). Mệnh vô chính diệu thì
  **mượn xung chiếu** (cổ pháp 8.45, cùng cách Quan Lộc) — không mượn thì 15,4%
  lá số mất hẳn lớp này (đã đo, đã vá → phủ 100%).
- **`TITLE_MAX_LEN = 30`** — bản đầu KHÔNG có trần: ra 926 danh xưng nhưng
  trung bình **28,7 ký tự**, dài nhất **43** (*"Nữ võ quan vướng lao lý trấn
  nhậm phương xa"*), 60% vượt 28 — phá thẳng luật "title ngắn để nhớ mà kể
  lại" Henry đã chốt. Thêm trần → **566 danh xưng**, trung bình 21,7, dài nhất
  đúng 30. **Đánh đổi có ý thức: mất 39% biến thể để giữ danh xưng đọc được.**
  Danh xưng gốc vốn đã dài thì bỏ hậu tố — mảng đời vẫn vào truyện và vào ảnh
  qua `aspect`/`propEn`, chỉ không chen vào danh xưng.

**Kết quả:** 194 → **566 danh xưng** · trùng 0,85% → **0,47%** (1/210) · kèm
nền văn minh **2.167 tổ hợp**, trùng **0,11%** (1/930) · nhóm 50 người có
người trùng 34% → **21%**.

- **🔑 Nguồn: RAG chứ không phải file trong repo.** `chunks_all.json` chỉ có 5
  chương Tân Biên → tao đã kết luận nhầm là "không có nguồn cho Mệnh/Thân".
  Thật ra bảng **`tuvi_docs`** trên Supabase có **trọn 12 cung Tân Biên**
  (riêng CUNG MỆNH 192 chunk / 166K ký tự) **VÀ 498 chunk Vương Đình Chi**
  (`luc-thap-tinh-he`, mỗi chunk gắn sẵn `[NGUỒN: Trung Châu Phái Lục Thập
  Tinh Hệ (Vương Đình Chi)]`). **Lần sau tra RAG trước khi nói là thiếu nguồn.**
### ✅ Vòng sau — hậu tố NGẮN lấy lại phần bị trần cắt: 566 → 865 (PR mới)
Bản trước bỏ thẳng hậu tố khi vượt trần 30 → mất **39%** biến thể (926 → 566)
chỉ vì danh xưng gốc dài. Nay hạ dần thay vì bỏ ngay: **hậu tố đầy đủ → bản
NGẮN (`suffixShort`, 5–10 ký tự) → mới bỏ**.

| | Trước | Sau |
|---|---|---|
| Danh xưng phân biệt | 566 | **865** |
| 2 người trùng danh xưng | 0,47% (1/210) | **0,21% (1/485)** |
| Trùng cả danh xưng + nền | 0,11% (1/930) | **0,055% (1/1.830)** |
| Nhóm 50 người, có người trùng | 21% | **10%** |
| Bị bỏ hậu tố vì dài | ~39% | **8,1%** |
| Độ dài (TB / dài nhất) | 21,7 / 30 | 24,8 / **30** (giữ nguyên trần) |

- **🐞 Bắt được khi ĐỌC MẪU, không phải khi đo:** 3 hậu tố ngắn bị cắt mất
  động từ nên đọc thành danh từ trơ — *"Chủ đội thương thuyền **mối quan**"*,
  *"Nữ vệ sĩ áp tải thuê **nghiệp tổ**"*. Số liệu vẫn đẹp, chỉ đọc mới lộ.
  Sửa: `mối quan`→`giữ mối`, `nghiệp tổ`→`giữ nghiệp`, `tế khí`→`làm tế khí`.
  **Rút gọn hậu tố phải giữ động từ**; bỏ động từ chỉ được khi phần còn lại tự
  nó là một NƠI CHỐN (`nội phủ`, `hậu đình`, `ngự y`) chứ không phải một vật.
- 16,7% vẫn không có hậu tố vì **Thân cư Mệnh** — cố ý, không phải thiếu sót.

### ✅ Vòng sau — 4 BẬC thay 3 bậc: 865 → 1.150 (PR mới)
Henry bảo làm trục "5 bậc" đã ghi trong CÒN LẠI. **Đo trước thì 4 bậc thắng 5
bậc**, nên đổi hướng:

| | Tổ hợp | Trùng | Entry phải viết |
|---|---|---|---|
| 3 bậc (cũ) | 926 | 0,153% | 114 |
| **4 bậc** ✅ | **1.213** | **0,120%** | **+38** |
| 5 bậc | 1.388 | 0,114% | +76 |

- **4 bậc lấy 79% mức lãi với đúng một nửa công**, và phân bố **đều**
  (27,4/26,5/24,1/22,0) trong khi 5 bậc **lệch** (20/33,8/14,5/17,3/14,4 —
  bậc 2 phình gấp đôi bậc 3). Thang điểm là số NGUYÊN và hẹp nên chia 5 không
  cắt mượt được.
- **Điểm quyết định:** phân vị 4 bậc rơi đúng `[-1, 1, 3]` → **giữ nguyên y
  hệt `cao` (≥4) và `thap` (≤−1)**, chỉ tách cái bụng phình `giua` (50,6%)
  làm đôi. Toàn bộ 114 entry cũ giữ nguyên nghĩa, hiệu chỉnh ngưỡng đã duyệt
  không phải làm lại, chỉ viết thêm MỘT bậc `kha` ("khá giả") cho 38 khoá.
- **🐞 Lại bắt được một danh xưng trùng** — `Nữ ngự y` dùng ở cả bậc **cao**
  của Thiên Đồng đơn thủ lẫn bậc **kha** mới của cặp Thiên Đồng+Thiên Lương.
  Cùng loại lỗi đã vá ở #339. → đổi thành `Thị y`/`Nữ thị y`. **Mỗi lần thêm
  bậc/khoá phải quét lại trùng title trên toàn bảng** — số liệu phân bố không
  bắt được lỗi này.

**Kết quả cuối track:** **1.150 danh xưng** · trùng **0,153%** (1/655) · kèm
nền văn minh **3.812 tổ hợp**, trùng **0,044%** (1/2.280) · nhóm 50 người có
người trùng **7%** · độ dài TB 24,5, dài nhất vẫn đúng trần 30 · phân bố bậc
thấp 27,4 / giữa 26,5 / khá 24,1 / cao 22,0%.

**Cả track: 84 → 1.150 danh xưng (×13,7), chi phí model thêm 0 đồng.**

### ✅ Vòng sau — trục SÁT TINH, nhưng đổi ẢNH chứ không đổi danh xưng (PR mới)
Trục này từng bị BỎ với lý do ghi thẳng trong code: *"chỉ đổi được mấy chữ trong
danh xưng còn `attireEn` giữ nguyên nên ảnh y hệt"*. Henry: **"uh gắn đạo cụ
riêng đi"** → làm, theo đúng cách đã cứu trục cung Thân là cấp cho nó một tín
hiệu **THỊ GIÁC** riêng.
- **`SAT_MARK`** (3 nhóm × `edge` + `markEn` + `source`) theo nhóm sát tinh đóng
  **tại chính cung Quan Lộc** (không xét tam hợp, cùng nguyên tắc `CAREER_MODIFIERS`;
  đọc ở cung mượn sao là đọc sát tinh của cung khác). Phân bố đo trên 8.640 lá
  số: **sạch 58,7% · không-kiếp 15,1% · kình-đà 13,9% · hoả-linh 12,2%**.
- **`markEn` CHIẾM MỘT CHIỀU KHÁC `propEn`** — đây là cả thiết kế: cung Thân sở
  hữu **ĐỒ VẬT** bày quanh người, nhóm sát tinh sở hữu **DẤU TRÊN NGƯỜI + ÁNH
  SÁNG** khung cảnh. **34,4% lá số trúng cả hai lớp**; nếu cả hai đều thêm đồ vật
  thì bức ảnh bày bừa và hai lớp làm loãng nhau — tách chiều thì chúng cộng vào.
- **KHÔNG vào danh xưng, và đó là quyết định có số đỡ:** danh xưng đang TB 24,5
  ký tự trên trần 30, **chỉ 45% còn ≥5 ký tự trống**. Thêm dấu hiệu vào title chỉ
  tới được 41,3% × 45% ≈ **19%** lá số mà ép sát trần cho tất cả. Nên trục này đi
  theo tiền lệ `MENH_ROLE`: vào ảnh + `desc` + prompt truyện. **Nó mua độ khác
  biệt của BỨC ẢNH (41,3% lá số có thêm một lớp thị giác), không mua thêm số
  danh xưng** — đừng kỳ vọng sai chỗ.
- **🐞 Hai lỗi bắt được bằng cách ĐỌC PROMPT GHÉP, không phải bằng cách đo:**
  (a) `markEn` nhóm không-kiếp bản đầu dùng từ vựng ĐI ĐƯỜNG (*"a plain
  travelling mantle"*) → đá đúng `propEn` của Thân cư Thiên Di (*"a road bundle
  and a broad weathered hat"*): ghép lại thành bọc hành lý + mũ đi đường + áo đi
  đường, ảnh trôi về "người lữ hành" chung chung và **mất sạch nghĩa TỪNG BỎ** —
  đúng thứ nhóm này cần nói. (b) `weathered` trùng ở cả kình-đà và Thiên Di (188
  lá số) → `calloused`. **Luật rút ra:** `markEn` không được mượn từ vựng của bất
  kỳ `propEn` nào, và **tránh tả TRANG PHỤC** (đó là việc của `attireEn` +
  `costumeGrammarEn`, chen vào là ghi đè cấp bậc). Đã cắm **bẫy tự động** quét
  trùng từ giữa `markEn`/`propEn` để không tái phát.
- **🐞 Lộ thêm một BUG CÓ SẴN nặng hơn cả trục này — danh xưng lặp chữ:**
  *"Nữ lương y vân du **vân du**"* · *"Quan **trấn** phủ **trấn** phương xa"*.
  Hậu tố cung Thân ghép vào danh xưng gốc vốn đã chứa đúng chữ đó. Cùng loại lỗi
  với hai lần trùng title trước (#339, 4-bậc) và **cũng chỉ lộ khi đọc chuỗi
  thật**. Sửa: điều kiện ghép hậu tố nay xét **cả TỪ**, không chỉ độ dài — dùng
  chung ladder hạ dần sẵn có (đầy đủ → ngắn → bỏ). Gỡ được **45 danh xưng méo**
  (1.458 → 1.413 trên lưới đo này); đó là **bỏ lỗi, không phải mất biến thể**.
  ⚠️ Con số tuyệt đối phụ thuộc lưới lấy mẫu — **đừng so 1.413 với 1.150** ở trên
  (hai lưới khác nhau: 6 ngày/tháng vs 7 ngày/tháng).
- **Nguồn: RAG, cả hai sách** — `8.14b Sát tinh tọa thủ cung Quan Lộc` (mục
  RIÊNG cho đúng trục này) · `4.2.19 Kình Dương` · `4.2.20 Đà La` ("tỳ vết…
  rỗ sẹo" — nhóm duy nhất cổ thư tả bằng dấu trên THÂN THỂ, nên dễ vào ảnh nhất)
  · `4.2.21 Hỏa, Linh` · `4.2.22 Không, Kiếp` · Vương Đình Chi *Sát diệu &
  khuynh hướng nghề nghiệp* ("Có Thiên Không / Địa Không: Nên theo tôn giáo – tu
  hành – triết học") + *Tứ Sát* + *Sát tinh & tính nóng vội*.
- **Thứ tự ưu tiên khi trúng nhiều nhóm (5,9%):** không-kiếp > kình-đà > hoả-linh
  — xếp theo mức làm ĐỔI BẢN CHẤT công danh: Không/Kiếp là nhóm duy nhất kéo
  người ta RỜI HẲN chức phận nên lấn lượt; Kình/Đà để lại dấu vĩnh viễn trên
  thân; Hỏa/Linh chỉ đổi NHỊP. Đo với thứ tự này ra 15,1/13,9/12,2% — trải đủ đều.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · engine test 181 pass · **đo 8.640 lá số, 0 lỗi trên 7 bất
  biến**: có sát tinh ⇔ có lớp · nhóm chọn THỰC SỰ có sao ở Quan Lộc · ưu tiên
  đúng thứ tự khai · 0 rò rỉ chéo giữa 3 nhóm · `markEn` vào prompt ảnh đủ 3.570
  lá số · gọi lại cùng lá số ra y hệt · 0 danh xưng lặp chữ · prompt truyện có
  khối `DẤU VẾT NGHỀ` · **0 trùng từ giữa `markEn` và `propEn`**.
- **CÒN LẠI (việc tay Henry):** nhóm **kình-đà** là nhóm duy nhất đổi GƯƠNG MẶT
  (*"a faint old scar traced along the brow or jaw"*) — tao chỉ verify tới tầng
  prompt, phải gen thật mới biết model vẽ vết sẹo "mờ, cũ" hay vẽ quá tay thành
  thương tích. Nếu quá tay thì sửa gọn một chuỗi trong `SAT_MARK`.

---

## 🎭 Chức phận theo CẶP chính tinh — 82 → 194 danh xưng (2026-07-29, cùng PR cache)

Henry: *"Chỉ có 84 nhân vật thôi hả? Ít quá, phải tăng lên… tao sợ trùng nhau
sẽ nhiều."* 84 đúng = **14 chính tinh × 3 bậc × 2 giới**. Đo trước khi sửa
(10.080 lá số thật, lưới 5 năm × 12 tháng × 7 ngày × 12 giờ × 2 giới):

| Trục | Trước | Sau |
|---|---|---|
| Danh xưng phân biệt | 82 | **194** |
| 2 người bất kỳ trùng danh xưng | 1,94% (1/52) | **0,85% (1/118)** |
| Trùng cả danh xưng + nền văn minh | 0,40% | **0,18% (1/550)** |
| Nhóm 50 người, có người trùng danh xưng | 62% | **34%** |
| Danh xưng phổ biến nhất chiếm | 3,9% | **1,9%** |

- **Trục dùng: BỘ chính tinh tại Quan Lộc, không phải một sao chủ.** Cung Quan
  Lộc rất thường có HAI chính tinh — đo được **39 bộ** phân biệt (24 cặp + 14
  đơn thủ + VCD), trong khi `pickQuanMajor` chọn 1 sao rồi **vứt sao kia đi**.
  Mà CHÍNH chương Quan Lộc của Tân Biên luận theo cặp (**64 câu "X đồng cung"**):
  Vũ Khúc đơn thủ là võ nghiệp, nhưng "Vũ + Phủ" là *"chức vụ thuộc về tài chánh
  hay kinh tế"*, "Vũ + Tham" là *"giàu có và thành công trong việc kinh doanh"*.
  Tức bảng cũ đang bỏ đúng phần chi tiết nhất của cổ thư.
- **`PAIR_OCCUPATION_TABLE`** (`past-life.ts`) — 24 cặp × 3 bậc = **72 entry**,
  mỗi entry `titleNam`/`titleNu`/`domain`/`desc`/`attireEn`/`source`. **Mọi
  `source` trích NGUYÊN VĂN** từ `chunks_all.json` (`[TÂN BIÊN][CUNG QUAN LỘC]`,
  26 chunk) — kiểm corpus TRƯỚC khi viết chính vì không được bịa trích dẫn cổ thư.
  Dùng chung 1 trích dẫn cho cả 3 bậc: **sách luận CẶP chứ không luận BẬC**, chia
  bậc là lớp chấm điểm của engine.
- **Khoá `pairKey`** sắp theo `STAR_ORDER` chứ không theo thứ tự gặp trong lá số
  — cùng một cặp xuất hiện đảo thứ tự tuỳ lá số, không sắp thì tra trượt.
- **Khoá lấy từ CUNG NGUỒN THẬT**, không phải Quan Lộc cứng: Quan Lộc vô chính
  diệu thì mượn cung xung chiếu (cổ pháp 8.45) — lấy cặp ở cung trống là tra
  nhầm. Đo được **50,2% lá số** đi nhánh cặp.
- **`star` nhánh cặp nêu CẢ HAI sao** ("Vũ Khúc + Thiên Phủ đồng cung") và **bỏ
  `brightness`** — độ sáng đó là của riêng sao chủ, gắn vào tên cặp thì đọc
  thành độ sáng của cả hai.
- **KHÔNG đụng `scoreQuanTier`** → phân bố bậc giữ nguyên **cao 22,0% / giữa
  50,6% / thấp 27,4%**, ngưỡng đã hiệu chỉnh trước đây không phải chỉnh lại.
- **Chi phí: 0 đồng.** Tra bảng thuần, deterministic — không thêm lượt LLM hay
  ảnh nào. (Đo thật trên prod: ảnh 1.658đ/lượt · chữ ~35đ/lượt LLM ⇒ **ảnh chiếm
  ~96% chi phí**, bảng tra không nằm trong đó.)
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi · `prettier --check .` sạch · engine
  test 181 pass · **đo lại nguyên lưới 10.080 lá số**: 194 danh xưng, `capThieu
  TrongBang` **rỗng** (không cặp nào rơi vào nhánh dự phòng), phân bố bậc không
  đổi · **soi tay 24 ca** đủ mọi cặp/bậc/giới: sao ở cung nguồn khớp khoá tra,
  nhánh mượn xung chiếu lấy đúng cung đối, danh xưng nam/nữ và trích dẫn đều khớp.
- **CÒN LẠI (chưa làm, đo sẵn số để quyết sau):** trục **5 bậc** thay 3 (ngưỡng
  phân vị đo được `[-2, 1, 2, 4]`, chia cân, +28 entry) và trục **nhóm sát tinh
  tại Quan Lộc** (sạch 60,6% · không-kiếp 14,6% · hỏa-linh 13,7% · kình-đà 11,2%).
  Cảnh báo đã đo: làm trục sát tinh dạng *hậu tố* ("Tri phủ vùng biên") thì
  `attireEn` không đổi → **ảnh vẫn y hệt**, chỉ khác mấy chữ; tăng số danh xưng
  mà cảm giác không đổi.

---

## 💾 Cache kết quả 2 tool chân dung theo lá số (2026-07-29, PR mới)

Henry: *"2 tool chân dung vợ chồng và chân dung tiền kiếp, nếu cùng lá số input
thì xong cache lại nhỉ? Sau này user input cùng lá số thì load ra thôi."* Đúng —
nhưng audit trước khi code lộ ra lợi ích KHÔNG nằm ở chỗ tưởng, nên ghi lại đây:
- **Cache liên-user gần như vô dụng ở quy mô hiện tại.** Không gian input ≈ 30
  năm × 365 ngày × 12 giờ × 2 giới ≈ **260K tổ hợp** → 1.000 user thật mới ra ~2
  cặp trùng lá số, 10.000 user mới ~190 cặp. Đừng kỳ vọng tiết kiệm từ đường này
  cho tới khi rất đông.
- **Chỗ ăn tiền THẬT bây giờ là cùng MỘT user chạy lại cùng lá số** (prod lúc
  làm: 32 bản vợ chồng + 16 bản tiền kiếp, **1 user duy nhất** — toàn bản test).
- **Kết quả 2 tool KHÔNG phụ thuộc năm xem** → cache không cũ đi theo thời gian
  (tuổi vẽ neo vào đại vận; mốc tuổi cưới là 22–31 giả định, không phải tuổi hiện
  tại). Khoá không cần xoay theo năm.

**3 điều Henry chốt** (hỏi trước khi code vì đều là quyết định sản phẩm/tiền):
cache **chung toàn hệ thống** · **ai đã trả cho lá số đó thì xem lại free, người
mới vẫn trả đủ** · **một lá số một kết quả, KHÔNG có nút "vẽ lại"**.

- **Migration `_patches/migration-portrait-cache.sql`** (✅ ĐÃ CHẠY prod qua
  Supabase MCP — verify 8 cột · RLS bật · **0 policy** = chỉ service key chạm
  được · `laso_key` có trên cả 2 bảng lịch sử): bảng `portrait_cache`
  (PK `tool_id+phase+laso_key`) + cột `laso_key` trên `spouse_portraits`/
  `past_life_portraits` + RPC `portrait_cache_touch` (đếm hit, atomic).
  **Bảng RIÊNG chứ không nhét vào 2 bảng lịch sử:** bảng lịch sử trả lời "ai đã
  sinh cái gì" (nhiều dòng/người, RLS theo chủ), cache trả lời "lá số này ra kết
  quả gì" (1 dòng, không thuộc về ai); tiền kiếp còn chạy 2 pha SONG SONG nên ghi
  chung một dòng là hai request đua nhau ghi đè; và `past_life_portraits` **vốn
  không có chỗ chứa truyện**.
- **`lib/portraits/cache.ts`** — `lasoKey(birth)` = sha256 canonical
  `[âm/dương|năm|tháng|ngày|giờ|giới]`. **CỐ Ý BỎ `name`**: engine không đọc tên
  (tên nhân vật/nền văn minh đều seed từ dữ liệu lá số), tính vào khoá thì hai
  người cùng lá số khác tên lại tốn thêm một lượt gen mà ra hai kết quả — đúng
  thứ luật "chung toàn hệ thống" muốn tránh.
- **`free` = CÓ cache **VÀ** user đã sở hữu lá số đó.** Thiếu vế "có cache" là mở
  đường gen thật miễn phí: ai từng vẽ một lá số sẽ vẽ lại vô hạn ở mọi pha còn
  thiếu cache. Đây là lỗ nguy hiểm nhất của thiết kế này, có test riêng.
- **Hướng fail cố ý NGƯỢC NHAU trong cùng một file:** tra cache/ghi cache hỏng →
  rơi về gen như cũ (mất tiền model còn hơn chặn oan người đã trả); nhưng
  `userOwnsLaso` lỗi → trả **false** (fail-CLOSED), vì đoán nhầm thành "đã trả"
  là phát không hàng.
- **Không tặng lượt rail cho lượt xem lại** — tặng cả ở đó thì mở đúng một đường
  farm: mở lại chân dung cũ vài lần là có lượt rail vô hạn. Tiền kiếp chỉ tặng ở
  pha `image` để một lượt mua không tặng hai lần.
- **`requireCreditsCached()`** (`tuvi-paywall.js`, bump `?v=8→9` trên 19 trang) —
  hỏi `action=cache-status` TRƯỚC, free thì chạy thẳng + banner "không trừ Lượng",
  không free thì đi paywall như cũ. **FAIL-CLOSED**: mạng lỗi/chưa đăng nhập →
  coi như phải trả. 4 trang tool (2 shell + 2 standalone) có thêm nhánh **402 trên
  đường miễn phí** → quay lại paywall thay vì ném lỗi khó hiểu.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` JS + JSON-LD của cả 4 trang · engine test 181
  pass · **37 ca chạy THẬT route trên Next dev + stub PostgREST**: khoá lá số
  (đọc thẳng `laso_key` code thật gửi lên — đổi giới/giờ/ngày/lịch đều ra khoá
  khác) · chủ sở hữu xem lại **200 dù không có thanh toán nào**, không gọi model,
  không đẻ dòng lịch sử, không tặng rail · người lạ chưa trả **402** · người lạ
  đã trả **200 + đúng 1 dòng lịch sử mang `laso_key`** + tặng rail đúng 1 lần cho
  cả 2 pha · **sở hữu lá số mà chưa có cache → vẫn 402** (lỗ nguy hiểm nhất) ·
  thiếu 1 trong 2 pha → `cached=false` · ghi cache lần 2 **không đè bản đầu** ·
  round-trip `put`↔`get` trên module thật (giữ nguyên dấu tiếng Việt) ·
  **Playwright trên `tuvi-paywall.js` thật**: free → không modal + banner đúng
  chữ + query lá số đúng + không gọi `action=deduct`; 4 ca không-free (chưa trả /
  chưa có cache / server 500 / mạng chết) đều rơi về modal.
- **CÒN LẠI:** dòng lịch sử CŨ (trước migration) `laso_key` NULL → mấy bản Henry
  đã sinh trước đây không được nhận là "đã trả", lần tới vẽ lại vẫn tính tiền một
  lượt rồi từ đó mới free. Không backfill được vì 2 bảng chưa từng lưu ngày sinh —
  cố suy ngược là bịa dữ liệu. Theo dõi `portrait_cache.hit_count` để biết cache
  có tiết kiệm thật không.

---

## 🔁 TRACK MỚI — Viral Loop cho 2 tool chân dung (chốt 2026-07-27, CHƯA CODE)

**Nguồn:** phiên brainstorm "làm sao cho Chân Dung Vợ Chồng + Chân Dung Tiền Kiếp viral".
Plan này là OUTPUT của phiên; code làm ở session sau, mỗi PR reset branch trên main.

### 🔖 RESUME HERE (track viral)
**V2.1 + V2.4 XONG (PR #314)** — mắt xích đứt đã nối: link chia sẻ nay mang mã
giới thiệu, và toàn bộ vòng lặp đã có chỗ đo (panel admin "Vòng Lặp Viral").
**V2.2 XONG (#318)** — bộ số đã chốt đã vào prod (quà 25 · thưởng mời 15 ·
trần mời 15) + cầu dao ngân sách ảnh free 6 lượt/ngày + 2 lượt rail tặng sau khi
vẽ. **V2.3 XONG (#320)** — chỗ xin mời bạn sau khi hết Lượng + mục referral
ở `profile.html`. **V3 XONG (PR mới)** — nút Tải Ảnh nay trả về poster 9:16 có
thương hiệu thay vì file thô (#322). **V4 phần CODE XONG (PR mới)** — content-pack
TikTok: cron CN gom 5 bản chân dung đã được chia sẻ công khai, LLM viết sẵn kịch
bản 30–60 giây, gửi Telegram admin + nút sinh on-demand trong admin. **→ V2 + V3 +
V4(code) ĐÃ XONG.** Việc tiếp theo là **việc tay Henry** (đăng TikTok 10–15ph/ngày,
seed 3–5 group FB) rồi **V5** — nhưng V5 chốt rõ là *chỉ làm SAU khi V2.4 có số
thật*, nên đừng code V5 trước khi panel Vòng Lặp Viral có dữ liệu người thật.
Số liệu tự chảy vào panel khi có người thật dùng; trước đó K-factor còn 0 là
ĐÚNG, không phải lỗi.

### 🔴 PHÁT HIỆN CHÍNH — vòng lặp đứt đúng 1 mắt xích
Link chia sẻ `/ket-qua/<id>` **KHÔNG mang mã giới thiệu**; nút CTA "Thử ngay →" trỏ
`/app/<tool_id>` cũng **không mang mã**. Nên: A share → B đăng ký → **A không được
thưởng gì**, hệ thống không biết B đến từ A.
**Bằng chứng: bảng `referrals` = 0 dòng** dù backend referral 2 tầng + chống gian lận
đã viết đầy đủ từ lâu — chưa từng có 1 lượt nào, vì con đường tự nhiên duy nhất mà
người ta chia sẻ lại không gắn mã. Đây là thứ phải sửa TRƯỚC mọi thứ khác.

### 📊 Số thật lúc chốt plan (2026-07-27)
- `spouse_portraits` 32 bản / **1 user** · `past_life_portraits` 15 bản / **1 user**
  · `shared_results` 26 link (15 vợ chồng · 10 tiền kiếp) — **TẤT CẢ do Henry test.
  Chưa có một người ngoài nào chạm vào 2 tool này.** Mọi kỳ vọng viral hiện là giả thuyết.
- `events` có **0 dòng `share`** dù 26 link đã tạo → luồng `shareWorkspace` của
  `shell.js` không bắn `Track.event` → phần quan trọng nhất của viral đang MÙ.
- Giá: tiền kiếp **25 Lượng**, vợ chồng **20 Lượng** (`tool_pricing`, cả 2 `enabled=true`).
- Hạ tầng ĐÃ TỐT (không phải làm lại): `/ket-qua/[id]` công khai, người xem KHÔNG mất
  Lượng, **OG image lấy ĐÚNG ảnh chân dung thật** (`firstBlockImage`, không phải logo),
  `twitter:card=summary_large_image`, có sẵn CTA card cuối trang.
- Chống gian lận có sẵn: `blocked_email_domains` (chặn email tạm), device cap 5
  (`credits.signup_bonus_device_cap`), chặn tự refer, UNIQUE `referee_user_id`.

### ✅ Bộ số Henry đã chốt
| Tham số | Giá trị chốt | Hiện tại trong DB | Ghi chú |
|---|---|---|---|
| Quà đăng ký | **25 Lượng cố định** | random `[20,30,40]` (A/B) | dừng A/B, set `credits.signup_bonus_variants=[25]` |
| Thưởng mời bạn | **15 Lượng** | 10 (`referral.signup_bonus_referrer`) | **CỐ Ý thấp hơn giá tool** để ép mời nhiều |
| Thưởng kích hoạt khi | **referee ĐĂNG KÝ** | đã đúng (`process_referral_signup`) | giữ nguyên |
| Trần lượt mời được thưởng | **15** | 20 (`referral.signup_reward_cap`) | = tối đa 225 Lượng/người |
| Trần chi ảnh free | **$15/tháng**, chỉnh qua `app_config` | chưa có | Henry tăng sau khi thấy tín hiệu |

**Hệ quả số học (cố ý, Henry đã cân nhắc):** mời 1 bạn = 15 Lượng → KHÔNG đủ tool nào
(20/25). **Mời 2 bạn = 30 Lượng = 1 lượt tiền kiếp (dư 5) hoặc 1 lượt vợ chồng (dư 10).**
→ **Câu chữ BẮT BUỘC phải nói thẳng "mời 2 bạn = thêm 1 lượt vẽ"**, tuyệt đối không hứa
lửng lơ kiểu "mời bạn để xem tiếp" — hứa hụt là mất niềm tin ngay lần đầu.

**⚠️ Tension đã flag:** 25 quà − 25 giá tiền kiếp = **0 Lượng còn lại**, mà rail chat
tốn 5 Lượng/lượt → user mới KHÔNG hỏi được nhân vật câu nào, trong khi vòng chỉnh
PR #306 vừa biến rail thành upsell chính của tool. **Mặc định trong plan: tặng 2 lượt
rail miễn phí ngay sau khi vẽ xong** (chi phí chat ≪ chi phí ảnh) để giữ móc upsell.
Henry có thể bỏ nếu không ưng.

### 💰 Kinh tế (con số để Quân Sư canh + để quyết nâng trần)
- 1 lượt gen thật ≈ **$0.08–0.10** (ảnh `gpt-image-1` 1024×1536 ~$0.05–0.08 + truyện LLM ~$0.02).
- 1 mắt xích referral trọn vẹn ≈ **$0.16** (gen của referee + gen mua bằng thưởng của referrer)
  → **~4.000đ cho 1 user đăng ký thật** — rẻ hơn mọi kênh trả phí, đáng làm.
- $15/tháng → **~150–190 lượt gen free/tháng ≈ 5–6/ngày** → cỡ 90–180 user mới/tháng.
  Đây là **thí nghiệm có kiểm soát**, không phải scale — đúng với thực tế "chưa có
  validation ngoài nào".
- **Điều kiện nâng trần (Quân Sư đề xuất khi đạt):** K-factor ≥ 0.5 VÀ chi phí/user
  đăng ký ≤ 6.000đ trong 2 tuần liên tiếp → đề xuất nâng $15 → $50.

### 📋 WORKPLAN V2 (mỗi PR = 1 việc, draft → CI xanh → squash-merge)

**V2.1 + V2.4 — LÀM CÙNG 1 ĐỢT (nối mã giới thiệu + đo), ưu tiên cao nhất:**
- `shell.js` tạo link share: người tạo đã đăng nhập → gắn `?ref=<referral_code>` vào
  URL `/ket-qua/<id>` (đọc code từ `user_credits.referral_code`, đã có sẵn).
- `app/ket-qua/[id]/route.ts`: đọc `?ref=` → truyền vào nút CTA (`/app/<tool>?ref=CODE`)
  → tái dùng cơ chế **ĐÃ CÓ SẴN** ở homepage (`sessionStorage.pending_ref_code` +
  `tryRegisterReferral()` → `POST /api/payment?action=referral-register`), KHÔNG viết mới.
- Đổi copy CTA trang chia sẻ: "Đăng ký nhận **25 Lượng** — đủ vẽ chân dung của chính bạn".
- **Đo:** bắn `Track.event('share',{tool_id,medium})` trong `shareWorkspace`/`shareLink`
  (hiện mù); nạp `track.js` vào `/ket-qua/[id]` → `share_view` + `cta_click`; event
  `referral_signup` khi thưởng thành công. Gắn `utm_source=share&utm_campaign=<tool_id>`.
- **Panel admin "Vòng Lặp Viral"**: phễu gen → share → người mở link → bấm CTA → đăng ký
  → gen lại, kèm **K-factor** từng tool + chi phí/user + số Lượng thưởng đã phát.

### ✅ V2.1 + V2.4 XONG (PR #314, session này) — nối mã giới thiệu + đo vòng lặp
- **`public/referral.js` (MỚI) — nguồn DUY NHẤT bắt `?ref=`.** Audit lúc làm phát
  hiện chỗ đứt sâu hơn plan ghi: cơ chế `sessionStorage.pending_ref_code` +
  `tryRegisterReferral()` KHÔNG phải "đã có sẵn dùng lại được" — nó bị **chép
  inline 2 bản** trong `index.html` + `cong-cu.html`, nên trang `/app` (đúng nơi
  CTA đổ về) chưa từng bắt được mã. Gom thành file dùng chung; `shell.js` nạp
  động (`ensureReferralJs`) cho mọi trang `/app`; 2 trang cũ bỏ bản inline, giữ
  global `window.tryRegisterReferral` để không gãy chỗ nào.
- **`shell.js`** — `withViralParams()` gắn `?ref=<mã>` + `utm_source=share&utm_medium=link&utm_campaign=<tool_id>`
  vào link chia sẻ (CẢ `shareWorkspace` lẫn `shareSession`). Mã lấy qua endpoint
  mới `GET /api/payment?action=my-referral` (**có auth** — CỐ Ý không nhét
  `referral_code` vào `action=balance` vì endpoint đó nhận `userId` qua query
  không xác thực, thêm mã vào đó là phát mã người khác cho bất kỳ ai đoán được
  userId). Chưa đăng nhập vẫn chia sẻ bình thường, chỉ không quy về ai.
  `shareWorkspace` nay gửi kèm token khi tạo link → `shared_results.owner_user_id`
  hết null (mẫu số "số người chia sẻ" của K-factor).
- **`/ket-qua/[id]`** — chuyển tiếp `?ref=` (validate 8 ký tự, rác thì bỏ) + UTM
  sang CTA. **Copy CTA đọc `app_config`/`tool_pricing` THẲNG** thay vì viết cứng
  "25 Lượng" như plan: quà hiện còn A/B `[20,30,40]` mà tiền kiếp giá 25 → viết
  cứng là hứa hụt ngay lần đầu. Lấy mức quà THẤP NHẤT, chỉ nói "đủ dùng công cụ
  này" khi quà ≥ giá → V2.2 set `[25]` thì câu chữ tự khớp, không sửa code lại.
- **🔒 Chốt an toàn BẮT BUỘC đi kèm:** `handleReferralRegister` nay chỉ ăn cho
  **tài khoản mới (<24h)**. Trước đây không có chốt: user CŨ chỉ cần mở link
  `?ref=` của bạn là referrer được thưởng. Vô hại khi chưa ai chia sẻ, nhưng V2.1
  vừa gắn `?ref=` vào MỌI link → thành đường farm rẻ nhất. Luồng thật (đáp trang
  → đăng ký → `SIGNED_IN`) tính bằng giây nên 24h rất rộng.
- **Đo (V2.4):** `share` (bắn khi CHỌN KÊNH phát tán — native/copy/FB/Zalo/WhatsApp,
  KHÔNG bắn lúc tạo link để khỏi đếm trùng với `shared_results`), `share_view`,
  `cta_click` (`meta.from='share'`), `referral_signup` (server ghi, `tool_id` lấy
  từ `utm_campaign` của chính link → **quy được K-factor TỪNG tool**; chỉ dựa
  `user_attribution.first_utm_*` thì trình duyệt đã ghé site trước đó mãi mang
  first-touch cũ). Thêm `share_view`/`referral_signup` vào allowlist `/api/track`.
- **Migration `_patches/migration-viral-loop.sql`** (✅ ĐÃ CHẠY prod qua Supabase
  MCP — verify khớp thực trạng: 26 link chia sẻ, 0 event `share`, 0 dòng
  `referrals`): RPC `viral_loop_funnel(from,to)`, KHÔNG tạo bảng mới.
- **Panel admin "Vòng Lặp Viral"** (`#page-marketing`, `admin-viral` gọi RIÊNG khỏi
  `admin-marketing` để không bị 7 RPC + GA4 kéo chậm/gãy theo): phễu 6 bậc +
  conv% từng bậc, K-factor/tool, chi phí/user đăng ký, Lượng thưởng đã phát.
- **🐞 2 lỗi bắt được khi test, không phải Henry báo:** (a) `GA4_TRACK_SNIPPET`
  ĐÃ kèm `track.js` từ M0.1 → bản đầu thêm thẻ nữa là `page_view` đếm đôi trên
  trang chia sẻ; (b) Next **bọc `fetch` toàn cục và nhớ kết quả kể cả khi
  `dynamic='force-dynamic'`** — đổi dữ liệu dưới DB xong `/ket-qua` vẫn trả số
  cũ, nghĩa là link vừa gỡ (`revoked`) vẫn render. Vá bằng `cache:'no-store'`
  trong `createClient`.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` referral.js/shell.js + 2 script block admin ·
  **Playwright trên trang shell thật** 3 ca (đăng nhập → link đúng ref+utm, bắn
  ĐÚNG 1 event share; chưa đăng nhập → vẫn share được, không ref; đáp `/app?ref=`
  → dọn ref khỏi URL, giữ utm, gọi register 1 lần kèm `srcTool`) · **Playwright
  trên `/ket-qua` render thật** (dev server + PostgREST stub): track.js nạp đúng
  1 lần, page_view/share_view/cta_click mỗi thứ đúng 1, ref rác bị loại, revoked
  → 404, copy CTA đúng cả 2 nhánh · panel admin sạch light+dark. Bump
  `shell.js?v=47→48` (27 trang).

**V2.2 — Sửa số + cầu dao ngân sách:**
- Set 4 config theo bảng trên (SQL, không cần deploy).
- Bảng/RPC đếm **lượt gen free toàn hệ thống theo ngày** + trần đọc từ `app_config`
  (`viral.free_gen_daily_cap`, mặc định suy từ $15/tháng ≈ 6/ngày) → chạm trần thì
  thông điệp tử tế ("hết lượt tặng hôm nay, quay lại mai hoặc nạp Lượng"), KHÔNG ném lỗi.
- Tặng 2 lượt rail free sau khi vẽ xong (xem tension ở trên).

### ✅ V2.2 XONG (PR mới, session này) — sửa số + cầu dao ngân sách
- **4 config đã set thẳng prod** (`_patches/migration-viral-budget.sql`, ✅ ĐÃ CHẠY
  qua Supabase MCP): `credits.signup_bonus_variants=[25]` (dừng A/B `[20,30,40]`),
  `referral.signup_bonus_referrer=15` (từ 10), `referral.signup_reward_cap=15`
  (từ 20). Verify `handle_new_user_signup` ăn được mảng 1 phần tử. **Hệ quả tức
  thì: copy CTA trang `/ket-qua` tự đổi sang "25 Lượng — đủ dùng công cụ này"**
  cho tiền kiếp (giá 25) mà KHÔNG cần deploy — đúng như V2.1 đã tính trước.
- **Cầu dao ngân sách ảnh free** — `viral_free_gen_gate(user, tool)` +
  `lib/billing/viral-budget.ts`. Chặn ở **`handleDeduct`**, TRƯỚC `deduct_credits`:
  đây là điểm cuối cùng còn chặn được mà chưa đụng ví ai. Chặn ở route tool thì
  đã trừ Lượng rồi — người dùng mất Lượng để đổi lấy một lời từ chối.
  - **"Free" = lượt của người CHƯA TỪNG NẠP** (`credit_transactions type='topup'`).
    Lượng của họ 100% là quà (signup + thưởng giới thiệu) nên mỗi lượt gen là
    tiền túi mình bỏ ra. Ai đã nạp đang tiêu tiền của chính họ → KHÔNG BAO GIỜ
    bị chặn. Đây là lý do trần này an toàn: nó không bao giờ chặn doanh thu.
  - Đếm theo `credit_transactions` (nơi lượt dùng được ghi TRƯỚC khi gọi model),
    khớp CẢ `slug` (`<tool_id>-...`) LẪN `type` **cả 2 biến thể gạch-ngang và
    gạch-dưới** — prod có đủ `use_chan_dung_vo_chong`, `use_chan-dung-vo-chong`
    và `use_chan-dung-tien-kiep`; bỏ sót một dạng là đếm hụt (đã verify trên dữ
    liệu thật). Ngày tính theo **giờ VN**, không phải UTC.
  - Config: `viral.free_gen_daily_cap=6` (suy từ $15/tháng ÷ ~$0.09/lượt ÷ 30),
    `viral.free_gen_tools` (chỉ 2 tool ảnh đắt tiền — tool chữ rẻ hơn 2 bậc,
    chặn chúng chỉ hỏng trải nghiệm mà không tiết kiệm bao nhiêu),
    `viral.free_gen_monthly_usd=15` (ghi lại để biết số 6 suy từ đâu).
    **Trần ≤ 0 = TẮT cầu dao** (Henry mở van nhanh không cần sửa code).
  - **FAIL-OPEN có chủ đích**: lỗi RPC/mạng → cho qua. Cầu dao này giữ NGÂN SÁCH
    chứ không giữ an toàn — chặn oan người đã trả tiền vì Supabase chớp một nhịp
    thì tệ hơn lỡ vài lượt quá trần.
  - `tuvi-paywall.js`: `capReached` → modal **tử tế** dùng lại khung `.tpw-*` của
    `_insufficient` ("Hết lượt tặng hôm nay · Chưa trừ Lượng nào của bạn" + lối
    nạp Lượng), KHÔNG phải `alert('Lỗi: …')` làm người ta tưởng hỏng.
- **2 lượt rail tặng sau khi vẽ xong** — vá "tension" đã flag: quà 25 − giá tiền
  kiếp 25 = **0 Lượng**, mà rail tốn 5/lượt → người mới không hỏi được nhân vật
  câu nào, trong khi PR #306 vừa biến rail thành upsell chính của tool.
  - **CỐ Ý KHÔNG tặng bằng Lượng**: Lượng tiêu được vào bất cứ đâu nên tặng 10
    Lượng sau MỖI lần vẽ là mở đường tích góp thành một lượt vẽ free nữa. Quầy
    đếm riêng `rail_free_turns` chỉ tiêu được ở rail, không quy đổi ngược.
  - `rail_free_grant` **ĐẶT** về mức n chứ không CỘNG DỒN → vẽ 3 lần không thành
    6 lượt. `rail_free_consume` atomic (`UPDATE … WHERE remaining > 0`).
  - `/api/v1/chat`: tiêu lượt tặng TRƯỚC Lượng; còn lượt tặng thì không chặn dù
    ví rỗng. **KHÔNG ghi `credit_transactions`** khi tiêu lượt tặng — không có
    Lượng nào đổi chủ, ghi giao dịch 0 đồng chỉ làm bẩn báo cáo doanh thu D3.
- **Dọn nợ nhỏ:** `getConfig` (đọc 1 khoá `app_config`) chuyển từ
  `lib/marketing/autopilot.ts` sang `lib/config/appConfig.ts` (`getConfigValue`)
  để billing không phải import marketing; tên cũ giữ làm alias.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi · `prettier --check .` sạch ·
  `node --check` paywall · **RPC test trên prod**: grant(2)→2, grant(2) lần nữa
  vẫn 2 (không cộng dồn), consume ×2 = true/true, lần 3 = false, `granted_total`
  đúng 2 · **nhánh chạm trần** kiểm bằng 6 lượt gen giả trong transaction rồi
  `RAISE EXCEPTION` để rollback (`used:0→allowed` ⇒ `used:6/cap:6→daily_cap`,
  verify prod **0 dòng rác còn sót**) · **Playwright**: chạm trần → hiện modal
  đúng chữ, KHÔNG alert thô, và **callback sinh ảnh KHÔNG chạy** (không tốn
  tiền model).
- **CÒN LẠI:** theo dõi vài ngày xem trần 6/ngày có chạm thật không — chạm sớm
  mỗi ngày nghĩa là nhu cầu thật đang vượt ngân sách thí nghiệm, lúc đó xét điều
  kiện nâng trần đã chốt (K ≥ 0,5 và ≤ 6.000đ/user trong 2 tuần liên tiếp).

**V2.3 — Chỗ xin mời bạn (không có chỗ này thì không ai mời):**
- Ngay sau khi xem xong chân dung + số dư không đủ lượt nữa → hiện: *"Còn X Lượng.
  **Mời 2 bạn đăng ký → +30 Lượng, đủ thêm 1 lượt vẽ**"* + nút copy link kèm mã.
- Thêm mục referral vào `profile.html` (hiện CHỈ có ở `topup.html`) + hiện tiến độ
  "đã mời N/15 bạn · đã nhận M Lượng" để tạo cảm giác tiến triển.

### ✅ V2.3 XONG (PR mới, session này) — chỗ xin mời bạn
- **`public/invite-cta.js` (MỚI)** — thẻ mời hiện NGAY SAU khi xem xong chân dung
  mà số dư KHÔNG còn đủ một lượt nữa. Đây là khoảnh khắc DUY NHẤT trong cả vòng
  lặp mà người ta vừa thích thú vừa hụt hẫng cùng lúc; không có chỗ xin ở đây
  thì không ai mời. Tự ẩn khi còn đủ Lượng (chưa hụt thì chưa phải lúc xin).
- **3 luật câu chữ** (viết thẳng trong file, đừng sửa nếu chưa đọc): (1) nói
  THẲNG con số — *"mời 2 bạn = +30 Lượng = đủ thêm 1 lượt vẽ"*, hứa lửng lơ
  kiểu "mời bạn để xem tiếp" là mất niềm tin ngay lần đầu; (2) mọi con số lấy
  từ SERVER, không viết cứng — thưởng/giá đều chỉnh bằng SQL; (3) chạm trần
  lượt mời thì NGỪNG hứa, nói thật là hết lượt trong 30 ngày.
- **Link mời trỏ vào CHÍNH tool vừa dùng** (`/app/<tool>?ref=…&utm_*`), không
  phải trang chủ — người được mời đáp xuống đúng thứ vừa khiến bạn mình khoe,
  và `referral.js` (V2.1) bắt `?ref=` sẵn ở đó.
- **`profile.html` + `account-core.js`** — thêm mục referral (link + thanh tiến
  độ mời được thưởng/30 ngày + tổng đã mời/đã nhận). Trước đây referral CHỈ có ở
  `topup.html`, tức chỉ ai đã định nạp tiền mới thấy, trong khi người hết Lượng
  thường vào profile trước.
- **🐞 Bắt được chỗ đang nói SAI với người dùng:** `topup.html` ghi *"Tối đa 10
  lượt mời / tháng"* trong khi DB là 20 (nay 15), và KHÔNG hề nhắc phần thưởng
  lúc bạn mình **đăng ký** — chỉ nhắc lúc nạp tiền. Đổi sang đọc từ server.
- **`my-referral`** trả thêm `balance`/`cap`/`rewardPerInvite`/`rewardedRecent`/
  `toolPrice` (nhận `?tool=`) để widget tính được trong MỘT lượt mạng, khỏi
  nhúng anon key vào thêm trang. `rewardedRecent` đếm theo **cửa sổ 30 ngày**
  khớp `process_referral_signup` — lấy tổng mọi thời sẽ báo "hết lượt mời" cho
  người thật ra vẫn còn.
- **Verify:** `tsc` · `lint` · `prettier --check .` · `node --check` · Playwright
  5 ca câu chữ: 0 Lượng/giá 25/thưởng 15 → "mời 2 bạn, +30, đủ thêm 1 lượt vẽ";
  10 Lượng → tự tính lại "mời 1 bạn"; còn đủ Lượng → **im lặng**; chạm trần →
  **không hứa nữa**; thiếu mã → không dựng gì.
- **CÒN LẠI:** widget mới gắn ở 2 trang shell `/app/chan-dung-*`; bản standalone
  `/tools/chan-dung-*.html` chưa gắn (CTA từ link chia sẻ đổ về `/app` nên đường
  chính đã phủ) — gắn nốt khi cần.

**V3 — Ảnh để đăng (làm song song được):** bản tải về **9:16 (1080×1920)** ghép ảnh
chân dung + 1 câu đắt nhất trong truyện + seal + `tuviminhbao.com`, dựng bằng canvas
client hoặc route OG (**không tốn thêm tiền model**); nút "Tải ảnh" cạnh nút Chia sẻ.
Lý do: người Việt share ẢNH lên Story/TikTok nhiều hơn share link — ảnh không mang
thương hiệu thì lan mà không về.

### ✅ V3 XONG (PR mới, session này) — ảnh 9:16 để đăng Story/TikTok
Audit lúc làm: nút "⬇ Tải Ảnh" **đã có sẵn** trên cả 4 trang (2 shell + 2
standalone) nhưng nó tải đúng file thô model sinh ra (1024×1536, trần trụi) —
tức đường lan MẠNH NHẤT ở thị trường VN đang chảy đi mà không mang một dấu hiệu
nào dẫn ngược về site. V3 = nâng cấp chính nút đó, không thêm nút thứ hai.
- **`public/poster.js` (MỚI)** — dựng poster bằng `<canvas>` NGAY TRÊN MÁY NGƯỜI
  DÙNG: ảnh chân dung cắt `cover` vào khung 9:16 → dải chuyển xuống nền navy →
  nhãn `TỬ VI MINH BẢO` → tiêu đề → dòng phụ → câu trích → **triện `seal.webp` +
  `tuviminhbao.com` neo CỨNG ở đáy**. Không gọi thêm lượt model nào.
- **"1 câu đắt nhất" chọn bằng LUẬT, không bằng LLM** (`Poster.pickQuote`): thêm
  một lượt model cho mỗi lần bấm Tải Ảnh là chi phí thật, trong khi thứ cần chỉ
  là một câu đọc lọt tai. Luật: lấy câu TRỌN VẸN có độ dài gần 95 ký tự nhất
  trong khoảng 45–155 (ngắn quá thì cụt lủn, dài quá thì tràn 3 dòng), duyệt các
  nguồn theo thứ tự ưu tiên. Tiền kiếp: `ketLuan` → `moTaNhanVat` → 5 hồi (Lời
  Kết là câu chốt của cả truyện, tách ra đứng một mình vẫn có nghĩa). Vợ chồng:
  `meetingContext` → `description` → `phuTheLuanGiai` (câu kể một khung cảnh đọc
  hấp dẫn hơn câu tả mũi tả mắt, mà đây là ảnh để người ta đăng lên khoe).
- **`app/api/portrait-image/route.ts` (MỚI)** — proxy CÙNG-ORIGIN cho bucket
  `portraits`. Vì sao cần: canvas vẽ ảnh khác origin thiếu header CORS sẽ bị
  "tainted", `toBlob()` ném SecurityError và mất trắng nút Tải Ảnh. poster.js
  vẫn thử đường THẲNG trước (nhanh hơn), đây là lối thoát. **ALLOWLIST CỨNG**
  theo origin + prefix `/storage/v1/object/public/portraits/` + bắt buộc
  `content-type: image/*` — nhận URL tự do là biến endpoint này thành công cụ
  SSRF.
- **`poster_download` là loại event RIÊNG** (thêm vào allowlist `/api/track`),
  CỐ Ý không gộp vào `share`: phễu Vòng Lặp Viral đếm `share` làm mẫu số của
  K-factor, mà ảnh tải về không mang link bấm được nên không bao giờ sinh ra
  `share_view`/`cta_click` tương ứng — nhét chung vào chỉ làm K tụt giả.
- **Dựng poster hỏng vẫn phải đưa được ảnh cho người ta** → mọi trang giữ nhánh
  `_downloadRaw()` tải file thô như cũ, và nhánh đó CỐ Ý không đụng gì trong
  `Poster` (nó chạy đúng lúc `poster.js` nạp không được).
- **🐞 2 lỗi bắt được khi nhìn ảnh render, không phải Henry báo:** (a) `drawImage`
  KHÔNG tự cắt theo khung — ảnh dọc 2:3 phủ đủ bề ngang 9:16 thì cao hơn vùng
  ảnh, tràn xuống đè nền khối chữ (nền chữ đổi màu theo từng bức, có bức mất
  sạch tương phản) → phải `ctx.clip()`; (b) neo ảnh lệch lên 0.15 cắt mất mép
  trên, mà nhân vật đội mũ quan/mũ giáp — cụt mũ là thứ nhìn ra ngay → neo mép
  TRÊN (0), cắt hết phần dư ở dưới nơi chỉ có thân/nền.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` (quét cả cây) sạch · `node --check` poster.js + mọi script block ·
  engine test 181 pass · **Playwright**: `pickQuote` 5 ca (chọn câu vừa khung /
  rơi xuống nguồn sau khi nguồn đầu rỗng / toàn câu ngắn thì cắt gọn / bỏ dấu
  `**` markdown / rỗng hết trả '') · `build()` ra **đúng PNG 1080×1920** (đọc
  IHDR, không tin tên file) ở cả 3 ca thường/tiêu-đề-dài/không-có-câu-trích ·
  **bấm nút thật trên CẢ 4 TRANG** → tên file + kích thước + event
  `poster_download` đúng tool_id · chặn `poster.js` → cả 4 trang rơi đúng về
  file thô (phải `serviceWorkers:'block'` mới mô phỏng được, vì `nav.js` đăng ký
  SW mà SW tự đi mạng ngoài tầm `page.route` — test artifact, không phải bug) ·
  **proxy 10 ca** (hợp lệ / query rác bị lược / host khác kể cả
  `169.254.169.254` / sai đường dẫn / bucket khác / không phải ảnh → 415 / 404 /
  `../` traversal / không phải URL) · **fallback CORS chạy thật đầu-cuối** trên
  Next dev + stub không gửi header CORS: nạp thẳng hỏng → tự đi qua
  `/api/portrait-image` → vẫn ra ảnh 1080×1920.
- **CÒN LẠI:** Henry gen thử 1 lá số trên prod rồi bấm Tải Ảnh để soi poster với
  ảnh THẬT — tao chỉ verify được bố cục bằng ảnh giả đúng tỉ lệ 1024×1536; chỗ
  nhiều khả năng phải chỉnh là vùng cắt (`IMG_H`/neo) nếu model hay đặt mặt nhân
  vật thấp hơn dự kiến. Sửa gọn, chỉ vài hằng số đầu `poster.js`.

**V4 — Mồi phân phối (viral là bộ khuếch đại, không phải nguồn):** 80 visit/ngày thì
vòng lặp không tự khởi động. Dùng content-pack TikTok (M2.3 của track Marketing) đẩy
5 chân dung đẹp nhất tuần → script 30–60s, Henry đăng tay 10–15ph/ngày + seed 3–5 group
tử vi/tarot FB.

### ✅ V4 (phần CODE) XONG (PR mới, session này) — content-pack TikTok
"M2.3 của track Marketing" mà plan trỏ tới **không tồn tại** (track đó đi M0.1–M0.6),
nên content-pack dựng mới ở đây. Phần còn lại của V4 là **việc tay Henry** (đăng
TikTok 10–15ph/ngày, seed group FB) — code CHỈ soạn sẵn chất liệu, KHÔNG tự đăng
đi đâu (không có tích hợp TikTok/FB API, cố ý).
- **`lib/marketing/content-pack.ts`** — gom 5 bản chân dung của tuần rồi nhờ 1 lượt
  `llmText()` viết kịch bản 30–60 giây cho từng cái (HOOK 0–3s / THÂN 3–45s / CHỐT
  45–60s + 5 hashtag), kết bằng gợi ý seed group FB.
- **🔑 Nguồn dữ liệu là `shared_results`, KHÔNG phải 2 bảng portrait** — hai lý do
  trùng khít nhau: (1) **riêng tư** — đó là những kết quả CHÍNH CHỦ đã bấm Chia sẻ,
  tức đã tự công khai; `past_life_portraits`/`spouse_portraits` chứa cả lượt vẽ riêng
  tư chưa ai cho phép đem đăng; (2) **chất liệu** — cột `blocks` của bản chia sẻ lưu
  TRỌN phần chữ (tên nhân vật, danh xưng, mô tả, 5 hồi, Lời Kết), trong khi 2 bảng
  portrait chỉ giữ vài cột meta. Kho được phép đăng cũng chính là kho giàu nhất.
- **Xếp theo `view_count`**, và nói thẳng trong header là "xếp theo lượt mở link,
  không phải máy chấm ảnh đẹp" — không có tín hiệu nào nói được "đẹp", giả vờ có là
  nói dối Henry về thứ anh đang đọc.
- **Tuần không ai chia sẻ → KHÔNG gọi LLM**, trả lời thẳng là chưa có chất liệu +
  chỉ ra việc cần làm. Nhờ LLM viết vo cho có là tốn tiền để sinh ra rác.
- **KHÔNG đụng hot path & KHÔNG đổi schema.** Cân nhắc lưu truyện vào
  `past_life_portraits` cho giàu chất liệu, nhưng truyện và ảnh là **2 request chạy
  SONG SONG** (thiết kế 2 pha) nên phải bịa thêm khoá tương quan để ghép — đổi kiến
  trúc một tool đang live để lấy lợi ích còn giả định. Bỏ. Script 45 giây cần *chức
  phận + nền + ảnh* (đã có sẵn); 5 hồi là thứ người ta đọc trên site.
- **`app/api/cron/content-pack/route.ts`** — CN hằng tuần (`0 1 * * 0` = 8h sáng VN),
  cùng pattern CRON_SECRET/`withCronLog`/Telegram admin với `cmo-digest`, prefix 🎬.
  0 env mới. **Đăng ký vào `lib/ops/jobs.ts`** — sổ job của S4 (track COO) mới lập
  chính vì mấy cron marketing từng VẮNG MẶT khỏi trang giám sát; thêm cron mà quên
  ghi sổ là tái lập đúng lỗ hổng vừa vá.
- **Nút "🎬 Sinh Content Pack"** (`admin-content-pack`, verifyAdmin) trong
  `#page-marketing` + chọn 7/30/90 ngày — CÙNG hàm cron dùng. Lý do có nút: cron gửi
  sáng CN, lỡ tin thì phải đợi cả tuần.
- **Verify:** `tsc` · `lint` 0 lỗi · `prettier --check .` · `node --check` 3 script
  block admin · `vercel.json` parse được · **unit test trên CHÍNH file thật** (chỉ
  thay 1 dòng import LLM bằng stub): query PostgREST đúng bộ lọc/sắp xếp, map đúng
  URL/label/views, excerpt gộp `blocks` và rơi về `text_content` khi blocks null,
  **payload gửi LLM KHÔNG chứa user_id/email/ngày sinh**, rỗng → không gọi LLM, lỗi
  PostgREST → ném lên cho `withCronLog` ghi · **cron route chạy thật** trên Next dev
  + stub: không auth/sai secret → 401, đúng secret + rỗng → 200 `sent:true` và
  `cron_runs` ghi `status=ok` đúng `job_key`, có dữ liệu → đi tiếp tới LLM · panel
  admin render + bấm nút thật, **light + dark**, 0 lỗi console.
- **CÒN LẠI:** bản digest đầu tiên gửi 8h sáng CN sau khi merge. Hiện 26 link chia sẻ
  đều là bản test của Henry nên pack đầu sẽ lấy từ đó — đúng như thiết kế, không phải
  lỗi. Việc tay: đăng đều 10–15ph/ngày + seed 3–5 group FB.

**V5 — Khuếch đại (chỉ làm SAU khi V2.4 có số thật):** gate "chia sẻ để mở khóa hồi 4–5"
· **duyên nợ tiền kiếp với người ấy** (2 lá số → 1 truyện, mỗi lượt kéo 2 người — K cao
nhất, tái dùng ~90% hạ tầng) · Thẻ Định Mệnh + độ hiếm lá số (chi phí LLM ≈ 0, gắn được
vào MỌI tool).

### 🚧 V5 — "Duyên Nợ Tiền Kiếp": ENGINE XONG (PR mới), TOOL CHƯA DỰNG
**Chọn mục nào trong 3 mục V5, và vì sao:** làm **duyên nợ tiền kiếp**, BỎ 2 mục kia.
Gate của V5 ("chỉ làm sau khi V2.4 có số thật") tồn tại vì *khuếch đại* cần biết mình
đang khuếch đại cái gì — nhưng duyên nợ là **tool MỚI tạo nhu cầu mới**, không phải
khuếch đại, nên không dính gate đó. Hai mục kia thì dính: "Thẻ Định Mệnh" là lớp share
gắn lên tool sẵn có, còn gate "chia sẻ để mở khoá hồi 4–5" **nên cân nhắc bỏ hẳn** —
ép chia sẻ mới cho đọc tiếp là đúng thứ mà cả track này tránh ("hứa hụt là mất niềm
tin ngay lần đầu"), và nó bóp trải nghiệm để đổi lấy một vòng lặp CHƯA đo được.
- **`lib/engine/past-life-bond.ts` (MỚI)** — `computePastLifeBond(lsA,gA,lsB,gB)` THUẦN
  deterministic: nền văn minh CHUNG + 2 nhân vật (dùng lại `computePastLife`, đúng chỗ
  "tái dùng ~90% hạ tầng" mà plan nói) + **loại duyên nợ** suy từ cổ pháp thật.
- **7 loại duyên:** phu thê · kim lan · ơn cứu mạng · thầy trò · nợ chưa trả · hai bờ
  chiến tuyến · tao ngộ. Mỗi loại gắn với dấu hiệu TRA ĐƯỢC trong lá số, và dấu hiệu đó
  trả ra trong `signals` để hiện thẳng cho người đọc — không bốc thăm chỗ nào.
- **Nền chung phải ĐỘC LẬP THỨ TỰ:** `pickSharedEra` sắp seed 2 lá số trước khi hash.
  Không làm vậy thì nhập A trước B ra một thế giới, B trước A ra thế giới khác — hai
  người bạn cùng bấm nhận 2 kết quả mâu thuẫn, mất tin ngay. Verify 950 cặp: 0 lệch.
- **🐞 Bắt được khi ĐO, không phải khi đọc code** (đo trên 950 cặp từ 96 lá số thật):
  - Bản 1: **36% ra "hai bờ chiến tuyến", 30% ra "ơn cứu mạng"** — 2/3 số cặp bị phán
    bởi MỘT tín hiệu yếu (ngũ hành nạp âm, gần như ngẫu nhiên giữa 2 người bất kỳ).
    Nói với một phần ba số cặp rằng kiếp trước họ là kẻ thù, chỉ vì nạp âm khắc nhau,
    là kết luận nặng dựa trên chứng cứ mỏng. → Đổi trục chính sang **địa chi cung Mệnh**
    (hợp/xung/hình — tín hiệu mạnh, rõ trong cổ pháp), ngũ hành/chính tinh chỉ tinh chỉnh.
  - Bản 2: lệch ngược, **68% ra "bằng hữu"** — thành thật nhưng nhạt, quá nửa người dùng
    nhận đúng câu trả lời chán nhất cho một tool mà cả cái hook là "kiếp trước hai ta là
    gì của nhau". Căn nguyên: cặp Mệnh HỢP mà chính tinh trung tính bị rơi tuột xuống
    nhánh mặc định, tức vứt bỏ đúng thứ vừa đọc được từ lá số. → mọi cặp Mệnh hợp đều
    vào nhánh dương.
  - **Lỗi đúng/sai thật:** nhánh `same` trong `chiRelation` KHÔNG BAO GIỜ chạy được vì
    tam hợp chặn trước (mỗi địa chi nằm trong đúng 1 nhóm tam hợp nên a===b luôn thoả
    "cùng nhóm") → cặp cùng địa chi bị **báo sai cổ pháp** là "cùng Tam Hợp", ngay trong
    phần dùng để chứng minh mình không bịa. Đảo thứ tự xét.
  - **Trục phụ cung Phu Thê:** Mệnh trung tính là >50% số cặp; cổ pháp không chỉ đọc
    duyên ở cung Mệnh — Phu Thê mới là cung nói về ràng buộc đôi lứa. Bỏ qua nó rồi trả
    "tao ngộ" cho quá nửa người dùng mới là làm hỏng.
- **Phân bố cuối (950 cặp):** tao ngộ 48,6% · kim lan 26,6% · hai bờ chiến tuyến 8,3% ·
  phu thê 7,7% · thầy trò 3,1% · nợ chưa trả 2,9% · ơn cứu mạng 2,7%. Mẫu là lưới lá số
  đều nên tỉ lệ THẬT sẽ lệch đi ít nhiều — đừng coi đây là con số prod.
- **Bất biến đã verify:** đảo A/B ra y hệt (0/950 lệch) · 2 nhân vật LUÔN cùng nền
  (0/950 lệch) · không bao giờ gán "phu thê" cho cặp cùng giới · mọi kết quả đều có
  `signals` · gọi lại cùng cặp ra y hệt · 5 nền trải đều (180–202/950) · 54 chức phận.
- **Xuất thêm từ `past-life.ts`:** `stableHash`, `ERA_IDS` — CỐ Ý dùng chung thay vì
  chép: hash mà có 2 bản thì hai bản trôi khỏi nhau lúc nào không biết.
- **⚠️ CÒN LẠI (tool chưa dùng được, engine hiện CHƯA có ai gọi):** prompt viết truyện
  đôi · prompt ảnh 2 nhân vật chung một khung · route 2 pha (`phase=story|image` như
  `chan-dung-tien-kiep`) · trang shell `/app/duyen-no-tien-kiep` · migration bảng lưu +
  `tool_pricing` · đăng ký (`next.config.mjs` rewrite, `shell.js` TOOLS, `app-home.html`
  GROUPS, `cong-cu.html`, `tuvi-paywall.js`) + bump `shell.js?v=`. Trang standalone SEO
  có thể làm sau — CTA từ link chia sẻ đổ về `/app` nên đường chính là trang shell.

### 🚦 Tiêu chí dừng/đổi hướng (đặt trước để khỏi tự lừa mình)
Sau khi xong V2 + V4 chạy đủ 3–4 tuần: **K-factor < 0.3** → kết luận 2 tool này không lan
tự nhiên ở thị trường VN; chuyển vai chúng thành **mồi trả phí thấp / hook quảng cáo**
thay vì trông chờ viral, và dồn ngân sách sang kênh khác. Không cố đấm.

---

## 🏯 Tool mới — "Chân Dung Tiền Kiếp" (2026-07-26, PR #298)

**Branch:** `claude/viral-use-cases-brainstorm-8zoydi`

Xuất phát từ phiên brainstorm "làm gì để viral" (Henry: tool Chân Dung Vợ Chồng
có vẻ viral được, còn use case nào nữa?). Chốt làm **Chân Dung Tiền Kiếp** trước
vì tái dùng ~90% hạ tầng tool vợ chồng.

### ⚠️ ĐỊNH VỊ — đọc trước khi sửa bất cứ thứ gì trong tool này
Tử Vi Đẩu Số **KHÔNG có cung nào nói về tiền kiếp** (luân hồi là khái niệm Phật
giáo, không thuộc mệnh lý Trung Hoa) — Henry hỏi thẳng điều này lúc brainstorm.
Tool KHÔNG bói tiền kiếp. Điểm tựa thật: toàn bộ từ vựng gốc của Tử Vi là từ
vựng **triều đình phong kiến** (cách cục tên "Quân Thần Khánh Hội", "Tướng Tinh
Đắc Địa"; diễn giải cổ ghi thẳng "công hầu khanh tướng", "trấn thủ biên ải").
Luận tử vi cho người hiện đại vốn là **dịch xuôi** thứ ngôn ngữ đó (Thất Sát →
"nghề áp lực cao"); tool này bỏ bước dịch đi, trả lá số về đúng bối cảnh cổ thư
viết ra nó. Bối cảnh chốt: **Trung Hoa cổ** (Henry chọn — model gen ảnh cổ trang
Trung Hoa tốt hơn hẳn cổ trang Việt). Disclaimer có ở cả 2 trang + FAQ schema.

### Kiến trúc
- **`lib/engine/past-life.ts`** (THUẦN deterministic, không gọi LLM):
  - **Chức phận**: bảng tra cứng 14 chính tinh tại **Quan Lộc** → nghề thời xưa
    (Thất Sát → tướng trấn biên, Thiên Cơ → mưu sĩ, Cự Môn → biện sĩ, Thiên Đồng
    → thầy thuốc…), mỗi nghề kèm `attireEn` (trang phục) + `backdropEn` (bối cảnh
    nền) cho prompt ảnh — đây là thứ khiến ảnh TRÔNG đúng nghề. Quan Lộc vô chính
    diệu → mượn chính tinh cung xung chiếu theo cổ pháp. Phụ tinh + tứ hóa tại
    Quan Lộc chỉ thêm *sắc thái*, KHÔNG đổi nghề gốc.
  - **Dòng đời**: 9 đại vận → 5 hồi gộp cố định `[ĐV1-2][3-4][5-6][7-8][9]` theo
    THỜI GIAN, rồi mới GẮN NHÃN `dinh-cao`/`bien-co` vào đúng hồi chứa đại vận có
    `scoring.tong` cao nhất/thấp nhất (2 cái rơi cùng hồi → `thang-tram`). **CỐ Ý
    không cố định "hồi 3 = đỉnh cao"** — ép thế thì mọi lá số ra cùng một hình
    dáng truyện; để nhãn tự trôi thì mỗi người ra một arc thật khác nhau.
  - **Tuổi vẽ ảnh**: neo vào đại vận cao điểm nhất **trong quãng đời trưởng thành**
    (`tuoiStart < 56`) rồi kẹp 25–55. Bản đầu neo vào đỉnh cao TOÀN CỤC → test 8 lá
    số thấy 4/8 chạm trần 55 vì đỉnh cao hay rơi vào 86–95 tuổi (vẽ cụ già hỏng cả
    bức). Đỉnh cao toàn cục vẫn giữ nguyên cho phần TRUYỆN.
- **`lib/engine/portrait.ts`** — tách `computeMorphologyForPalace(ls, cungName)`
  ra khỏi `computeSpouseMorphology` (trước cố định cứng `'Phu Thê'`) để dùng cho
  cung **Mệnh**. Thuật toán rank/merge sao KHÔNG đổi; wrapper cũ giữ nguyên chữ ký
  → tool vợ chồng không đổi hành vi. Tương tự `getPalaceReadout` /
  `getPalaceChinhTinhElement` / `formatPalaceReadoutForLLM`.
- **`app/api/chan-dung-tien-kiep/route.ts`** — **2 PHA** (`phase=story|image`):
  truyện (~20s) và ảnh (~60s) độc lập nhau nên client gọi SONG SONG, truyện hiện
  trước để đọc, ảnh chèn vào khung chờ sau. Khác tool vợ chồng (1 request tuần tự,
  người dùng nhìn màn hình trắng cả phút) — với tool nhắm viral thì đó là chỗ rơi
  rụng lớn nhất. Giá lá số bị tính 2 lần (deterministic, vài chục ms — không đáng).
- **`lib/agent/past-life-story.ts`** — mở đầu BẮT BUỘC là đoạn **"soi gương"** nói
  về CHÍNH người đọc (không phải nhân vật), gọi đích danh ≥2 chi tiết thật của lá
  số, nêu cả mạnh lẫn yếu, rồi mới bắc cầu sang truyện. Nếu người đọc không thấy
  mình ở đoạn này thì cả phần truyện thành chuyện người dưng. Cấm: đặt tên riêng
  cho nhân vật (tránh trùng nhân vật lịch sử), nhắc nhân vật/triều đại có thật, mô
  tả cái chết trực diện, nêu điểm số trong phần truyện.
- **Trang**: `public/tools/chan-dung-tien-kiep.html` (standalone/SEO) +
  `public/app-chan-dung-tien-kiep.html` (shell). Shell gọi `Shell.setShareable`
  dựng trang `/ket-qua` — **người xem link đọc trọn ảnh + truyện KHÔNG mất Lượng**,
  chỉ người sinh mới trả phí (Henry chốt mô hình trả phí toàn bộ; đây là cách vá
  đường lan mà không đụng giá).
- **Đăng ký**: `next.config.mjs` rewrite `/app/chan-dung-tien-kiep`; `shell.js`
  TOOLS (nhóm Tử Vi, icon mới `temple`) + `app-home.html` GROUPS (thêm icon
  `temple` vào map riêng của file này) + `cong-cu.html` TOOL_URLS +
  `tuvi-paywall.js` PRODUCTS/TOOL_TYPE. Bump `shell.js?v=45` toàn bộ trang shell.
- **Cost tracking (D3 margin)**: `llmTextFull` + `logLlmUsage` cho CẢ 2 lượt LLM,
  `logImageUsage` cho lượt sinh ảnh — `tool_id='chan-dung-tien-kiep'`.

### Migration
`_patches/migration-chan-dung-tien-kiep.sql` — ✅ **ĐÃ CHẠY PROD** qua Supabase MCP
(verify: `past_life_portraits` 8 cột / 2 index / 2 policy / RLS bật; bucket
`portraits` dùng lại của tool vợ chồng). **⚠️ Row `tool_pricing` đang
`enabled=false` CÓ CHỦ ĐÍCH** — `cong-cu.html` và `tuvi-paywall.js` đều lọc
`enabled=eq.true`, bật trước khi deploy thì tool hiện trên trang Công Cụ mà trang
`/tools/chan-dung-tien-kiep.html` chưa tồn tại → 404 cho người dùng thật. Bật sau
khi deploy xong:
```sql
UPDATE public.tool_pricing SET enabled = true, updated_at = now()
 WHERE tool_id = 'chan-dung-tien-kiep';
```

### Verify
`npx tsc --noEmit` 0 lỗi · `npm run lint` 0 lỗi (72 warning pre-existing) ·
`npx prettier --check` sạch · `node --check` mọi script block · **engine test 8 lá
số thật** (chức phận/5 hồi/nhãn đỉnh-đáy/mốc tuổi/tuổi vẽ đều hợp lệ, 8 arc khác
nhau) · Playwright render đúng cả 2 trang.

### Vòng chỉnh sau khi Henry test prod (PR mới, session này)
Henry: truyện "chủ yếu kể về công việc". Đúng — flow cũ chỉ đưa vào prompt **5 cung**
(Mệnh · Quan Lộc · Tài Bạch · Phúc Đức · Thiên Di, cộng cung Thân trùng lên 1 trong
số đó), mà **3/5 thuộc mảng bản thân–công danh–tiền bạc** → truyện dồn vào sự nghiệp
là hệ quả trực tiếp. Thiếu hẳn Phu Thê, Tử Tức, Huynh Đệ, Nô Bộc, Tật Ách, Điền
Trạch, Phụ Mẫu.
- **`computeLifeThreads(ls)`** (`past-life.ts`) — quét cách cục **cả 12 cung** (trừ
  Mệnh/Quan Lộc đã có khối riêng), chấm `cachCucWeight×3 + min(yNghia,8)×0.4` (cách
  cục quý/phú/bần tiện nặng gấp 3 cách cục thường), bỏ cung không tín hiệu, lấy **top
  5**. `CUNG_ROLE` gán mỗi cung một *vai trong truyện* ("Nô Bộc → bạn bè, thuộc hạ";
  "Tật Ách → bệnh tật, tai ách mang trên thân") để LLM biết dùng làm gì.
  `formatCharacterForLLM` thêm khối "CÁC TUYẾN ĐỜI NGOÀI CÔNG DANH"; cung nào đã in
  đủ ở trên thì chỉ trỏ ngược, không lặp dữ liệu.
- **`past-life-story.ts`** — luật mới "đây là một đời người, không phải bản lý lịch
  công tác": MỖI tuyến phải hiện ra ít nhất 1 lần bằng một CẢNH hoặc NHÂN VẬT cụ thể,
  rải theo lẽ thường (cha mẹ/anh em hồi đầu; hôn nhân/con cái/bệnh tật hồi giữa-cuối),
  không dồn 1 hồi. Thêm luật **chuyển vật hiện đại sang tương đương thời xưa** — dữ
  liệu cổ pháp trong engine có chỗ diễn đạt kiểu "tai nạn xe cộ", "đầu tư", "bảo lãnh"
  (phát hiện khi test 6 lá số). `text` mỗi hồi 90–140 → **100–160 từ** cho đủ chỗ.
- **Bỏ khối "Cơ Sở Trong Lá Số"** (markup + `renderBasis()` + CSS `.cdtk-basis`) khỏi
  cả 2 trang. **Caveat viết lại** theo lời Henry, chung chung: *"phác hoạ dựa trên các
  dữ liệu trong lá số Tử Vi của bạn, kết hợp với kinh nghiệm nghiên cứu của tiền nhân
  để lại"*. Trang standalone trước đây KHÔNG có caveat ở khu kết quả → nay thêm.
  **⚠️ KHÔNG viết "query database nhân vật lịch sử có lá số giống nhất"** như Henry
  gợi ý lúc đầu — hệ thống không có database đó và không có bước so khớp nào; viết vậy
  là mô tả một tính năng không tồn tại cho người dùng trả tiền.
- **Verify:** `npx tsc --noEmit` 0 lỗi · `npm run lint` 0 lỗi · `npx prettier --check .`
  (dạng QUÉT CẢ CÂY, đúng như CI chạy) sạch · `node --check` mọi script block · chạy
  thử 6 lá số thật: threads ra 10 cung khác nhau, cách cục thật, không lá nào trùng bộ.

### Vòng chỉnh tiếp — bỏ đoạn "soi gương", đổi thành mô tả nhân vật (PR mới)
Henry: đoạn mở đầu *"TRƯỚC HẾT — NÓI VỀ CHÍNH BẠN"* nói về người đọc ở hiện tại
→ **trái theme** khi cả trang đang kể chuyện tiền kiếp. Đổi thành **"MÔ TẢ <tên
nhân vật>"**, viết về chính nhân vật.
- Field `soiGuong` → **`moTaNhanVat`** (prompt + `route.ts` + 2 trang + block
  chia sẻ `/ket-qua`). Không có cache/lưu JSON truyện nên đổi tên an toàn.
- Nội dung mới: 3–4 câu ngôi thứ ba, gọi đúng tên đã chốt, nói về **khí chất và
  cốt cách** (tính khí gốc + một cách hành xử nhận ra ngay + một chỗ yếu/nỗi khổ
  tâm), cấm xưng "bạn", cấm nhắc đời sống hiện tại. **Giữ nguyên giá trị cũ theo
  cách khác:** cốt cách vẫn rút thẳng từ cung Mệnh nên prompt yêu cầu tả đúng tới
  mức người đọc tự soi ra mình — chỉ khác là để họ TỰ nhận ra thay vì gọi thẳng.
  Thêm luật cấm tả ngũ quan/vóc dáng/trang phục (bức tranh đã lo, tả thêm dễ đá
  nhau với ảnh).
- Tiêu đề khối giờ **động**: `moTaTitle.textContent = 'Mô tả ' + characterName`.
- **Verify:** `npx tsc --noEmit` 0 lỗi · `npm run lint` 0 lỗi · `npx prettier
  --check .` sạch · `node --check` mọi script block.

### Vòng chỉnh tiếp — 5 nền văn minh (PR mới)
Henry: thêm Nhật Bản cổ · Hàn Quốc cổ · Thái Lan cổ vào 2 nền đang có → **5 nền**.
- **Vì sao KHÔNG chỉ thêm 3 dòng vào `ERAS`:** mẹo "trang phục Việt ≈ Trung Hoa
  nên dùng chung `attireEn`" KHÔNG dùng lại được cho Nhật/Hàn/Thái (quan Hàn
  mặc dallyeongpo + mũ samo, võ tướng Nhật mặc ō-yoroi, quan Thái mặc chong
  kraben) — 44 chuỗi `attireEn` + 7 `DOMAIN_BACKDROP` đang viết bằng từ vựng
  Trung Hoa cứng ("black gauze cap", "jade belt", "bamboo scrolls", "red
  lacquered columns"). Giữ nguyên = người Trung Hoa mặc đồ Trung Hoa đứng
  trước phông Thái.
- **Kiến trúc 2 tầng** (thay vì ma trận 44×5 = 220 chuỗi): tầng 1 — trung lập
  hoá 44 `attireEn` + 7 backdrop, chỉ tả CẤP BẬC/chất liệu, không thuộc nền
  nào; tầng 2 — mỗi era một khối `costumeGrammarEn` + `sceneGrammarEn` dạy cấp
  bậc đó ăn mặc/sống ra sao ở nền này. 5 khối thay 220 chuỗi. **Trung Hoa
  không hồi quy** — grammar cấp lại đúng các dấu hiệu vừa gỡ.
- **Chọn nền = hash lá số** (`pickEraForLaso`, Henry chốt phương án A): cùng lá
  số LUÔN ra cùng nền, trải đều 5 nền (test 1.104 lá: 18,7–20,8%). **CỐ Ý
  KHÔNG suy từ ngũ hành mệnh** — tương ứng ngũ hành–phương vị chỉ cho ra NHÓM
  (Nhật/Hàn cùng Đông, Việt/Thái cùng Nam), ép 1-1 rồi gọi là cổ pháp là bịa.
  Seed có salt `'era|'` để chỉ số nền độc lập với chỉ số bốc tên.
- **Phân biệt ngoài cái tên** (Henry hỏi đúng chỗ): mỗi era thêm `ageLabel`
  (nhãn THỜI ĐẠI mô tả — "thời các lãnh chúa cát cứ" — **không** dùng tên triều
  đại thật Edo/Joseon/Ayutthaya, tránh người đọc đi tra rồi bắt lỗi) hiện thành
  badge dưới danh xưng, + `cultureVi` (thiết chế/đồ vật/tập tục đặc trưng) mà
  prompt truyện BẮT dùng ≥3 thứ rải các hồi, đồng thời CẤM mượn chi tiết của
  nền khác. **KHÔNG viết "kiếp trước bạn là người Nhật"** — đá vào disclaimer
  và kéo lại ngôi "bạn" vừa bỏ ở vòng trước.
- **Vá vênh định vị:** system prompt truyện + copy SEO 2 trang đang nói cứng
  "bối cảnh TRUNG HOA CỔ ĐẠI mà cổ thư viết ra nó" → sai với 4 nền kia. Đổi
  thành "thế giới phong kiến Á châu", nêu rõ 5 nền + nói thật là nền do lá số
  quyết định. **Điểm yếu đã biết:** Thái Lan nằm ngoài vùng Hán tự (Phật giáo
  Nam tông, quan chế gốc Ấn, không dùng Tử Vi) nên lập luận yếu nhất; 44 danh
  xưng Hán-Việt cũng không chuẩn cho Thái — giữ vì đây là nhãn tiếng Việt cho
  người đọc Việt, để ảnh + truyện gánh bản sắc.
- Gỡ 5 chỗ hardcode "East Asian" (Thái là Đông Nam Á) → `regionEn` +
  `artTraditionEn` từng nền. Giữ nguyên lối vẽ painterly pastel Henry đã duyệt.
- **Không cần migration** — cột `era` đã có sẵn trên `past_life_portraits`.
- **Verify:** `tsc` · `lint` · `prettier --check .` · `node --check` · phân bố
  era trên 1.104 lá số · gọi lại cùng lá số ra cùng nền + cùng tên · chức phận
  ĐỘC LẬP với nền · so prompt ảnh Trung Hoa trước/sau (**không mất dấu hiệu
  nào**, thêm 5) · quét rò rỉ từ vựng chéo trên 20 prompt = **0** · Playwright
  2 trang render badge đúng, không lỗi console.

### Vòng chỉnh tiếp — trang chia sẻ /ket-qua (PR #305)
Henry gửi ảnh chụp trang chia sẻ, 3 việc:
- **Tóm tắt lá số ở đầu trang.** Người nhận link không có ngữ cảnh gì → không
  biết chân dung gắn với lá số nào. `publishShareable` (trang shell) chèn block
  ĐẦU TIÊN "Lá số dùng để phác hoạ" = `birthSummary(_lastBirth)` →
  "Nam · 03/06/1998 (dương lịch) · giờ Sửu (01–03h)". **Henry chốt làm bản DÙNG
  CHUNG** → chuyển hẳn vào `shell.js` `setShareable`, mọi tool tự có (bump
  `shell.js?v=45→46` trên 27 trang). `birthSummaryLine()` đọc birth theo NHIỀU
  tên khoá vì shape không thống nhất giữa các tool (`day/month/year` vs
  `ngay/thang/nam` vs `dd/mm/yyyy`); thiếu ngày-tháng-năm → trả '' và KHÔNG
  chèn gì. Nguồn birth CHỈ lấy `o.birth` hoặc `ctx.birth` của chính lượt đó —
  **cố ý không đụng `birthSnapshot()`/localStorage**, lá số sót từ tool khác sẽ
  gắn nhầm chủ nhân cho bản chia sẻ. Ba nhánh: có `blocks` → chèn block đầu;
  text phẳng → nối dòng lên đầu `text` (không đổi layout); ảnh phẳng → dựng
  blocks. Test Playwright 5 ca (có blocks / text phẳng / ảnh phẳng / không lá
  số / birth thiếu ngày) đều đúng.
- **Logo:** `<div class="brand">紫微明寶</div>` → `<img src="/seal.webp">` ở CẢ
  `/ket-qua/[id]` lẫn `/luan-duong/[id]` (hai trang chia sẻ dùng chung layout).
  **CỐ Ý KHÔNG thay 40+ chỗ 紫微 còn lại** trong repo: phần lớn là
  `alternateName` trong JSON-LD (tên tiếng Hoa hợp lệ cho SEO, không nhét ảnh
  vào được), `紫微斗數` = TÊN BỘ MÔN không phải brand, và watermark vẽ trong
  canvas lá số. Chỉ đổi chỗ dùng như DẤU HIỆU THƯƠNG HIỆU.
- **Footer bỏ khẩu ngữ:** "AI chỉ luận, không bịa sao" → "Lá số được lập bằng
  engine cổ pháp; phần luận giải do AI thực hiện trên chính dữ liệu đó."
  `/luan-duong` giữ ngôi "thầy" (trang đó có persona thầy xuyên suốt), chỉ bỏ
  từ "bịa". Rà cả repo: từ "bịa" chỉ còn trong PROMPT gửi LLM và comment code —
  không phải chữ người dùng đọc, giữ nguyên.

### Vòng chỉnh tiếp — RAIL là upsell thật của tool (PR mới)
Henry chỉ ra insight quan trọng: đọc xong truyện, phản ứng đầu tiên của user là
**qua rail hỏi về NHÂN VẬT** ("ông ấy có giàu không?", "lấy vợ thế nào?", "có
bệnh tật gì?") — mà bản chất chính là **luận giải lá số của chính họ, bọc qua
một nhân vật cổ xưa**. Vỏ bọc đó dễ tin hơn vì nhân vật đã đi trọn một đời,
nghe như thuật lại chứ không như phán về người đang sống. Upsell = số lượt rail.
- **Audit trước khi sửa:** phần DỮ LIỆU đã đúng sẵn — cả 2 tool gọi
  `Shell.setContext({birth})` cùng shape, backend không phân biệt tool nào:
  `computeLaso` → `extractLasoContext(ls,'',{full:true})` → `CHAT_SYSTEM_LASO` +
  đủ bộ tool. Thiếu 3 thứ: (a) rail KHÔNG biết nhân vật là ai → hỏi "nhân vật
  này" là model không có referent; (b) prompt vẫn giọng luận thẳng ("cung Tài
  Bạch của bạn…"); (c) chips dùng thuật ngữ tử vi + ngôi "tôi", kéo user ra
  khỏi mạch truyện.
- **Bẫy đã tránh:** KHÔNG nhét nhân vật qua `scenario` — `runAgent` rẽ nhánh
  scenario sẽ **mất sạch full lá số**, đúng thứ cần giữ.
- **Cách làm:** thêm cờ `wrap?: 'past-life'` vào contract (additive, ENUM chứ
  KHÔNG phải chuỗi tự do — cho client gửi prose vào system là mở cửa
  prompt-injection). Trên nhánh birth, server **tự gọi `computePastLife(ls,
  gender)`** (deterministic → trùng đúng nhân vật đang hiện trên màn hình) rồi
  nối `pastLifeRailWrapper()` vào system.
- **Luật đóng vai:** trả lời *cái gì* qua nhân vật (không thuật ngữ tử vi);
  hỏi *"vì sao"* thì **được phép lộ cơ sở lá số** — đúng khoảnh khắc bán được
  Luận Giải; user xưng "tôi" thì bỏ vỏ, luận thẳng.
- Greeting + chips đổi sang hỏi về nhân vật bằng lời thường.
- **Verify:** stub fetch bắt system thật gửi lên provider — **gỡ khối đóng vai
  ra khỏi system có wrap → khớp bản không wrap BYTE-EXACT** (chỉ thêm, không
  sửa/bớt); system chứa đủ 12/12 cung + đại vận + tứ hóa + cách cục + luật luận;
  nhân vật trong prompt đúng bản engine chốt. tsc · lint · prettier · node
  --check. Bump `shell.js?v=46→47` (27 trang).

### Vòng chỉnh tiếp — neo mốc lịch sử thật + vá nút Chia sẻ desktop (PR mới)
- **🐞 Nút "Chia sẻ" trên desktop bấm KHÔNG RA GÌ.** Căn nguyên: `shareWorkspace`
  chỉ hỏi `if (navigator.share)` — trên **desktop Chrome hàm đó VẪN TỒN TẠI**,
  nhưng bị gọi SAU `await fetch('/api/share-result')` nên "user gesture" của cú
  click đã hết hạn, trình duyệt từ chối; nhánh `catch` lại `return` im lặng khi
  gặp `AbortError` → không hiện gì cả. Sửa: helper `shareLink()` — share sheet
  native CHỈ dùng trên thiết bị cảm ứng, desktop luôn mở modal có nút Sao chép;
  bọc thêm `try/catch` vì vài bản Chrome ném lỗi ĐỒNG BỘ. Áp cho cả
  `shareWorkspace` lẫn `shareSession` (cùng bug). **Tự dính bug khi test:**
  bản đầu `isTouchDevice()` ƯU TIÊN `navigator.userAgentData.mobile`, mà cờ đó
  false ngay trên máy mobile khi UA-CH không được set → mobile rơi nhầm vào
  modal. Sửa thành OR các tín hiệu, `pointer: coarse` là tín hiệu chính.
- **Dòng lá số hiện NGAY TRÊN TRANG** (trước chỉ có trong link chia sẻ nên Henry
  không thấy): "Lá số: Nam · 03/06/1998 (dương lịch) · giờ Sửu (01–03h)" dưới
  badge nền văn minh, ở cả 2 trang. Shell mở `Shell.birthSummary()` để trang
  dùng CHUNG chuỗi với bản chèn vào `/ket-qua`; trang standalone không có Shell
  nên tự dựng theo đúng định dạng đó.
- **NEO MỐC LỊCH SỬ THẬT** (Henry: không có mốc thì người đọc không biết chuyện
  xảy ra ở đâu, thời nào). Đây là **đảo luật cũ** vốn cấm sạch nhân vật/triều
  đại có thật. Mở theo TỪNG MỨC RỦI RO chứ không mở toang:
  - `geographyVi` mỗi era — **địa danh có thật** (Trường Giang/Chiết Giang,
    sông Hồng/Thăng Long, Kyoto/Kyushu, Hanyang/Gyeongju, Chao Phraya/
    Ayutthaya). Mức an toàn nhất: sông núi tỉnh thành hầu như không đổi. Cho
    phép chú "(nay thuộc …)" để người đọc định vị.
  - `periodVi` mỗi era — **triều đại có thật**, nói ở mức "dưới thời X",
    **CẤM nêu năm/niên hiệu** (engine chỉ có TUỔI nhân vật, không có mốc lịch —
    nêu năm là bịa). Danh sách triều đại **khớp với `ageLabel` đang hiện trên
    badge**: Nhật bỏ Edo (badge ghi "lãnh chúa cát cứ" = Sengoku, Edo là thái
    bình → mâu thuẫn); Hàn bỏ Silla (chưa có khoa cử).
  - **Vòng 2 — Henry chốt mở hẳn tên vua/nhân vật lịch sử** ("phải đặt vào bối
    cảnh lịch sử có thật… users có thể search google… cũng là cách để họ học
    thêm về lịch sử"). Prompt nay có luật **HAI TẦNG**: *tầng bối cảnh* = lịch
    sử THẬT (địa danh, triều đại, đời vua, chiến tranh — tra Google ra được, đó
    chính là giá trị); *tầng nhân vật* = HƯ CẤU, chỉ là một người bình thường
    sống trong thời đó. BẮT nêu thẳng "dưới thời Hán Vũ Đế", "đời vua Thành
    Thái". Nới `ageLabel` mấy nền tự bó mình: Việt "giữ nước phương Nam" →
    "quân chủ phương Nam" (để có cả Nguyễn), Nhật "lãnh chúa cát cứ" → "thời
    mạc phủ" (có cả Kamakura/Edo), Hàn "triều đình khoa cử" → "các vương triều
    cổ" (có cả Silla).
  - **Ranh giới CÒN GIỮ:** nhân vật không được LÀ người có thật, không chiếm vị
    trí độc nhất của triều ("Tể tướng của vua X" → "làm quan trong triều dưới
    thời vua X"); người thật là NỀN chứ không phải bạn diễn (không dựng cảnh họ
    trò chuyện/khen thưởng nhân vật). **Vẫn cấm năm dương lịch + niên hiệu kèm
    số** — engine chỉ có TUỔI, không có mốc lịch, nêu năm là tự bịa VÀ biến cả
    9 đại vận thành thứ tra ngược được rồi sai; muốn rõ hơn thì "đầu/giữa/cuối
    thời X".
- **Verify:** tsc · lint · prettier · `node --check` · Playwright 3 ca share
  (desktop → modal + link; mobile → native; native ném lỗi → rơi về modal) ·
  5 nền đều có đủ địa danh riêng, **0 rò rỉ địa danh chéo**, badge khớp thời kỳ.

### Vòng chỉnh tiếp — NÂNG THANG CHỨC PHẬN (PR #307)
Henry: *"user thường thích nghe những thứ hơi shocked, ngạc nhiên, thì mới viral
được… giờ đang đọc thầy thuốc này, chủ tiệm vải này, nghe tầm tầm không catchy.
Upgrade position nhưng vẫn giữ nguyên tính chất các sao, các cung."*
- **Cả 42 chức phận nâng 1–2 bậc VỀ QUY MÔ**, giữ nguyên `domain` và bản chất
  sao: Vũ Khúc vẫn tiền + võ (chủ hiệu vàng bạc → **cự phú buôn vàng bạc khắp
  mấy châu**), Thiên Đồng vẫn y (thầy lang → **ngự y trưởng** / **đại danh y
  trấn một phương**), Cự Môn vẫn khẩu thiệt (trạng sư → **ngự sử đại phu**),
  Tử Vi (quan viên ngoại → **tổng trấn một phương**, đúng ví dụ Henry đưa).
  `attireEn` chỉnh theo cấp mới; `source` (trích Tân Biên) **không đụng**.
- **Title phải NGẮN** (Henry chốt tiếp — bản đầu tao viết dài quá): title là
  **danh xưng**, đọc xong nhớ được để kể lại. "Đại đô đốc nắm binh quyền và
  quân lương" → **Đại đô đốc**; "Ngự sử đại phu, tiếng nói vang cả triều" →
  **Ngự sử đại phu**; "Cự phú buôn vàng bạc khắp mấy châu" → **Cự phú**. Râu
  ria dồn hết vào `desc` (chỉnh 7 desc để không mất chi tiết vừa rút ra).
- **CHỈ DỊCH CẢ THANG LÊN, KHÔNG NÉN 3 TẦNG.** Nén lại thì điểm cung Quan Lộc
  mất hết ý nghĩa, mọi lá số ra na ná nhau, và mất luôn khả năng nói "chức phận
  này chỉ rơi vào X% lá số". **Đo lại sau khi nâng: cao/giữa/thấp = 24/52/24%
  trên 552 lá số** (trước 20/56/24 — giữ nguyên độ trải), **79 chức phận khác
  nhau** xuất hiện, cái phổ biến nhất chỉ 4,2%.
- Không mâu thuẫn với phản hồi cũ "toàn quan với tướng": lần đó vấn đề là **đơn
  điệu** (11/14 đều là quan triều), lần này nâng **trong đúng domain của từng
  sao** nên vẫn có cự phú, danh y, tông sư, chủ đội thương thuyền, thủ lĩnh
  khai hoang — không dồn hết về triều đình.

### Vòng chỉnh tiếp — gắn TÊN vào dòng lá số (PR mới)
Henry: form có ô "Họ và tên" mà dòng tóm tắt chỉ ra "Lá số: Nam · 09/05/1984…".
`birthSummaryLine()` trong `shell.js` VỐN ĐÃ xử lý tên (`b.hoten || b.name`) —
nhưng **cả 2 trang đều bỏ rơi `hoten` khi dựng `_lastBirth`** nên nó không bao
giờ nhận được. Thêm `name` vào birth ở cả trang shell lẫn standalone, và bổ
sung phần tên vào `renderBirthLine()` riêng của trang standalone (trang này
không có Shell nên tự dựng chuỗi).
- **Lợi kèm:** `req.birth.name` cũng là thứ `nguoiXemLine()` dùng để dựng
  "Người xem: <tên>" trong system prompt — nên rail giờ xưng hô đúng tên luôn.
  KHÔNG ảnh hưởng lá số/nhân vật: `computeLaso` không đọc `name`, và
  `pickCharacterName`/`pickEraForLaso` seed từ dữ liệu lá số chứ không từ birth.
- Bỏ trống ô tên → chuỗi tự lược phần tên, không hiện dấu · thừa.
- **Verify:** Playwright kiểm 3 nơi đều ra
  "Nguyễn Văn Henry · Nam · 09/05/1984 (dương lịch) · giờ Sửu (01–03h)": dòng
  trên trang · payload gửi `/api/share-result` · trang standalone.

### 🐞 Vòng sửa lỗi — "Lỗi phân tích kết quả AI." (PR mới)
Henry chạy tool trên prod báo lỗi này, nghi hết credit. **KHÔNG phải credit** —
route có 2 lỗi tách bạch: LLM ném lỗi → *"Lỗi AI khi viết câu chuyện"*; LLM CÓ
trả text nhưng JSON không parse được → *"Lỗi phân tích kết quả AI."* (cái này).
- **Bằng chứng từ prod** (query `events` where `event_type='llm_usage'`,
  `tool_id='chan-dung-tien-kiep'`): lượt truyện 06:59 có `input_tokens=9177`,
  `output_tokens=1279` — model **trả lời bình thường**, và 1279 < `maxTokens`
  2600 nên **không phải bị cắt vì chạm trần**; `thinkingConfig.thinkingBudget`
  cũng đã = 0 nên không phải thinking token ăn mất chỗ.
- **Căn nguyên: `parseJSON` quá giòn** — chỉ `JSON.parse(strip fences)`. Chỉ
  cần model thêm một câu dẫn ("Đây là câu chuyện:") hoặc ghi chú cuối là hỏng
  cả lượt dù nội dung đủ. Prompt truyện nay ~9k token đầu vào (5 nền + luật
  lịch sử + tuyến đời) nên Flash càng dễ nói thêm ngoài JSON.
- **Sửa:** `parseJSON` quét **từng khối `{...}` cân bằng** từ trái sang, bỏ qua
  ngoặc nằm trong chuỗi (lời thoại) và ký tự escape, khối đầu tiên parse được
  thì lấy — cố ý không dừng ở khối đầu tìm thấy vì model hay chèn `{...}` trong
  lời dẫn và khối rác đó nuốt mất JSON thật. Thêm **thử lại 1 lượt** kèm nhắc
  định dạng khi parse hỏng (trước đây fail là mất Lượng mà không có gì), và
  **log độ dài + đầu/đuôi bản thô** để lần sau chẩn được ngay là lạc định dạng
  hay bị cắt. Nâng `maxTokens` 2600 → 4200 cho 5 hồi 100–160 từ tiếng Việt.
- **Verify:** test `parseJSON` với 10 dạng output thật — JSON sạch · bọc fence ·
  câu dẫn trước · ghi chú sau · cả hai · lời thoại có ngoặc kép · `{}` rác
  trong lời dẫn → **đều bóc đúng**; JSON cụt / không có JSON / rỗng → trả null
  đúng như mong đợi để rơi vào nhánh thử lại.

### CÒN LẠI
- Bật `enabled=true` sau deploy (câu SQL ở trên).
- Henry gen thử trên prod đủ 5 nền để soi ảnh — tao chỉ verify được tới tầng
  prompt, chất lượng ảnh thật (nhất là Thái Lan và Hàn Quốc) phải nhìn mới biết.
- Henry gen thử vài lá số trên prod → soi chất lượng ảnh cổ trang + văn phong
  truyện. Hai chỗ nhiều khả năng phải tinh chỉnh: bảng tra 14 sao → nghề
  (`past-life.ts`) và độ dài/giọng 5 hồi (`past-life-story.ts`). Cả hai sửa gọn,
  không đụng kiến trúc.

### 💡 Ý tưởng viral khác đã brainstorm (chưa làm, Henry có thể chọn tiếp)
Thẻ Định Mệnh + độ hiếm lá số (lớp share gắn được vào MỌI tool, chi phí LLM ≈ 0) ·
chân dung con cái tương lai (cung Tử Tức) · "bạn ở đỉnh cao vận mệnh" dùng ảnh
THẬT qua flux-kontext-pro · duyên nợ tiền kiếp với người ấy · biệt đội hội bạn
thân (mỗi post kéo 5 người) · xem sếp/crush/người yêu cũ · đếm ngược ngày gặp
chân ái · "nếu bạn sinh giờ khác" · roast mode. Cơ chế lan truyền còn thiếu:
ảnh tải về 9:16 có watermark, OG image riêng từng kết quả, gate bằng share
(`referral_code` đã có sẵn), gắn `utm_campaign` cho từng tool.

---

## 🔀 Provider routing rail — fallback HAI CHIỀU (2026-07-27)

Henry test prod: rail chat sau khi dùng tool báo `Anthropic error: … credit
balance is too low …`, trong khi tài khoản Gemini còn tiền. Henry tưởng rail
đã chạy Gemini-primary/Anthropic-backup.
- **Chẩn đoán — hai chỗ lệch với kỳ vọng:**
  1. Rail CÓ dùng Gemini, nhưng **`laso` bị ghim Anthropic**: prod
     `chat.provider_routes = {"_default":"gemini","laso":"anthropic"}`, và
     `geminiToolsEligible` CỐ Ý không đọc `_default` (fix D6). Mà mọi tool gọi
     `Shell.setContext({birth})` đều biến rail thành luồng `laso` → luôn
     Anthropic. Tool thì chạy ngon vì `lib/llm/complete.ts` (đường KHÁC) vốn
     đã Gemini-primary + fallback thật.
  2. **Chiều fallback ngược với kỳ vọng:** code chỉ có Gemini lỗi → rơi về
     Anthropic. Không có chiều ngược. `streamTurn` gặp non-200 còn bắn thẳng
     `sse.error` tại chỗ → Anthropic hết tiền là kéo sập rail dù Gemini sống.
- **Henry chốt:** (a) `laso` → Gemini; (b) làm fallback hai chiều.
- **Đã làm:** ✅ vá `app_config` prod → `{"_default":"gemini","laso":"gemini"}`
  (cache TTL 60s, không cần deploy, revert 1 dòng SQL). `streamTurn` **hoãn**
  `sse.error`, trả `errorBody` lên caller. Khối Gemini-tools tách thành closure
  `runGeminiTools()` dùng lại được ở 2 chỗ. Loop Anthropic thêm nhánh: lỗi mà
  CHƯA stream gì (round 0, chưa tool nào) → thử Gemini; hết đường mới báo lỗi.
  Thêm `geminiProseCapable`/`geminiToolsCapable` (bản BỎ QUA route — cứu hộ thì
  route hết nghĩa, nhưng guard prose/vision/ảnh GIỮ NGUYÊN).
  `Awaited<ReturnType<typeof runAgent>>` (tự tham chiếu) → `interface AgentResult`
  + `type ProviderOutcome` tường minh.
- **Verify:** tsc · lint · prettier · **test stub fetch 4 ca**: prose route-ép-
  anthropic → `anthropic→gemini` + ra chữ Gemini; laso route-ép-anthropic →
  `anthropic→gemini` + ra chữ; đối chứng Anthropic OK → **không** gọi Gemini;
  cả hai cùng chết → bắn `sse.error`.

---

## 🆕 Tool mới — "Chân Dung Vợ Chồng" (2026-07-24, CHƯA COMMIT/CHƯA DEPLOY)

Vẽ chân dung người phối ngẫu suy từ cung Phu Thê trong lá số (OpenAI `gpt-image-1`
text-to-image — KHÔNG cần ảnh input, khác hẳn Replicate flux-kontext-pro đang dùng
cho tool try-on). Cả 2 bản: standalone + shell, giống mọi tool khác.

- **Dữ liệu nguồn:** Henry cung cấp file Excel "Hình dáng mệnh khi sao đóng vào.xlsx"
  (bảng tra hình dáng theo 111 sao — Sheet1 mô tả ngắn VI, Sheet2 = 14 field chi tiết
  + "Sketch Prompt" tiếng Anh sẵn) + file instructions thuật toán rank/merge sao
  ("Portrait Generation Engine - Star..."). Đã port → `lib/engine/data/portrait-stars.json`
  (script Python 1 lần, không lưu script — chỉ lưu output JSON).
- **`lib/engine/portrait.ts`** — `computeSpouseMorphology(ls, gender)`: THUẦN
  deterministic (không gọi LLM). Rank sao tại Phu Thê + tam-phương-tứ-chiếu (tái
  dùng `p.tamHopCungs`/`p.xungChieuCung` có sẵn trong engine) theo 4 cấp ưu tiên +
  bonus ngũ hành/độ sáng sao (đúng thuật toán file instructions) → khóa khung
  mặt/vóc dáng từ sao core, sao phụ chỉ tinh chỉnh mắt/môi/da/khí chất. Độ tuổi
  phối ngẫu = tuổi hiện tại ± offset suy từ vài sao tại Phu Thê (Cô Thần/Đào Hoa/...
  — heuristic v1, biên độ nhỏ, có thể tinh chỉnh sau).
- **`lib/image/openai-image.ts`** — gọi thẳng REST `images/generations` (không SDK,
  theo pattern `lib/llm/complete.ts`), model `gpt-image-1` (env `OPENAI_IMAGE_MODEL`
  override được), trả base64.
- **`app/api/chan-dung-vo-chong/route.ts`** — POST: auth Bearer token → computeLaso
  → computeSpouseMorphology → 1 lượt LLM (Gemini/Anthropic qua `lib/llm/complete.ts`)
  dịch+đánh bóng field đã merge thành `{imagePrompt EN, description VI}` → gọi
  OpenAI sinh ảnh → upload Supabase Storage bucket `portraits` (public) → ghi lịch
  sử bảng `spouse_portraits`. GET `?action=history` trả lịch sử user.
- **Migration `_patches/migration-chan-dung-vo-chong.sql`** (✅ ĐÃ CHẠY prod qua
  Supabase MCP — verify: bucket `portraits` + bảng `spouse_portraits` (RLS: user đọc
  own + admin) + `tool_pricing` row `chan-dung-vo-chong` = 22 Lượng, category
  `Luận Giải` (để rơi tab "Tử Vi" trên `/cong-cu`), icon 🖼️.
- **Trang:** `public/tools/chan-dung-vo-chong.html` (standalone, TuviForm mode='full'
  + TuviPaywall + JSON POST, không SSE vì kết quả là ảnh+mô tả 1 lần) +
  `public/app-chan-dung-vo-chong.html` (shell, cùng flow, sau khi vẽ xong gọi
  `Shell.setContext({birth,...})` — TÁI DÙNG khả năng chat lá số chung sẵn có, KHÔNG
  thêm scenario type mới vào contract v1 để giữ phạm vi PR gọn).
- **Đăng ký:** `next.config.mjs` rewrite `/app/chan-dung-vo-chong`; `shell.js` TOOLS
  (nhóm Tử Vi, icon mới `image`) + `app-home.html` GROUPS + `cong-cu.html` TOOL_URLS;
  `tuvi-paywall.js` PRODUCTS/TOOL_TYPE fallback; bump `shell.js?v=42` toàn bộ trang shell.
- **Verify:** typecheck 0 lỗi, eslint shell.js/tuvi-paywall.js sạch, node --check 2
  script block HTML mới OK, Playwright smoke (dev server) cả 2 trang render đúng,
  sidebar link + form + rail hiện đúng, không lỗi console.
- **CÒN LẠI:** commit + PR; Henry xác nhận `OPENAI_API_KEY` đã set trên Vercel (đã
  dùng cho embeddings, nên nhiều khả năng có sẵn — dùng chung, không cần thêm key
  cho image); tùy chọn tinh chỉnh giá 22 Lượng + bảng age-offset heuristic sau khi
  có phản hồi thật.

---

## 🟣 ĐANG LÀM — Admin Revamp + Marketing/Conversion Tracking

**Branch:** `claude/admin-page-revamp-sgnhvg`
**Cập nhật:** 2026-07-22

### 🔖 RESUME HERE
Revamp `public/admin.html` + thêm mảng **Marketing** để đo full funnel:
`traffic source → visit → signup → free/activated → paid → return → repeat`.
Trước đó admin CHỈ suy hành vi từ `credit_transactions` (bỏ sót tool free, page view, nguồn traffic). Đang dựng hạ tầng tracking riêng.

**Workplan 5 sprint (mỗi sprint = 1 PR draft):**
- **S0 — Hạ tầng tracking** ✅ (PR #239): bảng `events` + `user_attribution`, `/api/track`, `public/track.js`, gắn homepage + hook signup/login attribution.
- **S1 — Phủ toàn site** ✅ (stack trên #239): track.js qua `shell.js` + emit tool_open/tool_run/chat_msg, topup_start (paywall + topup.html), cta_click (homepage).
- **S2 — Dashboard Funnel + Sources** ✅ (PR mới): mục "Marketing" sidebar, trang Funnel (conv% từng bước) + bảng Traffic Sources + filter ngày (RPC aggregate).
- **S3 — Acquisition + Campaign** ✅ (PR mới): chart signups/ngày theo kênh, bảng campaign UTM, top landing/referrer.
- **S4 — Retention + Revenue/LTV** ✅ (PR mới): cohort giữ chân, doanh thu & LTV theo kênh (join `user_attribution` × `credit_transactions`), export CSV.

### ✅ Sprint 0 XONG (chờ merge) — hạ tầng tracking
- **Migration `_patches/migration-events-tracking.sql`** (✅ ĐÃ CHẠY trên prod 2026-07-22 qua Supabase MCP — verify: events 17 cột, user_attribution 18 cột, 9 index, RLS bật + 2 policy admin_read. Không còn việc tay):
  - `events` (append-only): ts, event_type, anon_id, user_id, session_id, platform, tool_id, slug, path, referrer, utm_*, meta. Index ts/type/user/anon/utm_source.
  - `user_attribution` (1 dòng/user): first-touch + last-touch UTM/referrer/landing + signup_at.
  - RLS: GHI qua service key (`/api/track`); ĐỌC chỉ admin JWT (`email=admin@tuviminhbao.com`) — giống pattern `app_config`.
- **`app/api/track/route.ts`** (runtime nodejs): nhận `{events:[...]}` (batch ≤30), allowlist 11 loại event, ghi service key. Có Authorization token → gắn user_id; lần đầu thấy user → snapshot attribution first-touch + phát event `signup` (chỉ nếu `created_at` < 15 phút → né user cũ login lại bị tính signup mới). Beacon KHÔNG ném lỗi ra client.
- **`public/track.js`** (vanilla, không lib): anon_id (localStorage `tvmb_anon`) + session_id (sessionStorage `tvmb_sid`) + first-touch (`tvmb_attr_first`). Auto `page_view`; `window.Track.event(type, props)`. Gửi sendBeacon (ẩn danh) hoặc fetch keepalive kèm token (đọc `tuvi_session`) khi đã đăng nhập.
- **Wire:** `index.html` thêm `<script src="/track.js?v=1">` (TRƯỚC auth.js). `auth.js` `saveSession()` gọi `Track.event('login')` sau khi lưu session → server gắn user_id + attribution.
- **Verify:** typecheck root 0 lỗi (sau build engine), eslint track.js/auth.js sạch, prettier route.ts sạch.
- **Event types (allowlist):** `page_view · tool_open · tool_run · tool_result · chat_msg · signup · login · topup_start · topup_success · share · cta_click`. S0 mới emit `page_view` (homepage) + `login`/`signup`. Còn lại emit ở S1.

### ✅ Sprint 1 XONG (stack trên #239) — phủ tracking toàn site
- **`shell.js` (v40→v41, bump cả 25 trang /app):** thêm helper `track()` + `ensureTrackJs()` — tự nạp `/track.js` (page_view bắn) nếu trang chưa có, emit an toàn qua hàng đợi. Emit: `tool_open` (boot, tool_id=ACTIVE), `tool_run` (trong `setContext` = tool tính ra kết quả + gắn ngữ cảnh = activation; kèm scenario.type), `chat_msg` (trong `sendMsg`, kèm has_img).
- **`tuvi-paywall.js` (v5→v6, bump 19 trang):** `topup_start` (meta from=paywall, need) khi bấm "Nạp Credits →".
- **`topup.html`:** nạp track.js + `topup_start` (from=topup_page) lúc mở trang.
- **`index.html`:** `cta_click` (tool_id + has_q) trong `go()` — chokepoint hero submit + chip → shell.
- **QUYẾT ĐỊNH:** KHÔNG emit `topup_success` riêng — đã có đủ trong `credit_transactions` (type=topup, có amount + created_at); dashboard S2 lấy "paid" từ đó, join `user_attribution` để quy doanh thu theo kênh. `tool_result` cũng gộp vào `tool_run` (kiến trúc tool tính client rồi setContext — 1 tín hiệu activation là đủ). `tool_run` có thể hơi over-count lúc restore phiên (chấp nhận v1).
- **Verify:** eslint shell.js/paywall 0 lỗi; chỉ đụng client JS + HTML (prettier-ignore) + không .ts → typecheck/prettier không đổi. Version bump: shell.js=41 (25 trang), paywall=6 (19 trang).
- **CÒN LẠI (S2+):** dashboard Marketing đọc events/attribution (RPC aggregate) — Funnel, Sources, Acquisition, Cohort, Revenue/LTV.

### ✅ Sprint 2 XONG (PR mới, branch reset trên main sau khi #239 merge) — dashboard Funnel + Sources
- **Migration `_patches/migration-marketing-rpcs.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — verify RPC trả số thật: funnel visitors/paid/topup_intent > 0):
  - `marketing_funnel(from,to)` → JSON: visitors (distinct anon page_view) · signups (user_attribution.signup_at) · activated (distinct user tool_run) · topup_intent (distinct topup_start) · paid (distinct user credit_transactions type=topup) · returned (user active ≥2 ngày). "Stage snapshot", KHÔNG cohort chặt.
  - `marketing_sources(from,to)` → table theo KÊNH first-touch (`coalesce(first_utm_source, referral nếu có referrer, else direct)`): signups · paid · revenue_credits (sum topup amount). security definer + grant service_role.
- **`app/api/payment/route.ts`** — thêm GET action `admin-marketing` (`handleAdminMarketing`, verifyAdmin): nhận from/to (ISO date, mặc định 30N, to→cuối ngày), gọi 2 RPC bằng service key, trả `{funnel, sources}`.
- **`public/admin.html`** — sidebar section "Marketing" (nav `goTo('marketing')`) + `#page-marketing`: filter ngày (input date + nút 7N/30N/90N) → `loadMarketing()` gọi `apiGet('admin-marketing')`. `renderMktFunnel` = 4 bậc bar (visit→signup→activate→paid, conv% từng bước + tổng) + chỉ số phụ (topup_intent, returned). `renderMktSources` = bảng nguồn (conv%, Lượng nạp, doanh thu ≈ ×2500đ). Thêm `marketing` vào PAGE_TITLES + loaders.
- **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check block JS admin (125 dòng) OK. RPC test prod OK.
- **CÒN LẠI:** S3 (acquisition chart theo ngày/kênh + campaign UTM + top landing/referrer), S4 (cohort retention + LTV theo kênh + export CSV).

### ✅ Sprint 3 XONG (PR mới, branch reset trên main sau khi #240 merge) — acquisition + campaign + traffic detail
- **Migration `_patches/migration-marketing-acquisition.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — 3 RPC chạy OK, camp_rows=0 vì chưa có UTM campaign):
  - `marketing_acquisition(from,to)` → table(day, source, signups): signup theo NGÀY × KÊNH first-touch (nuôi chart).
  - `marketing_campaigns(from,to)` → table(campaign, source, signups, paid, revenue_credits): chỉ user có `first_utm_campaign`.
  - `marketing_traffic(from,to)` → JSON {top_paths, top_referrers}: distinct visitor page_view, top 15 mỗi loại. security definer + grant service_role.
- **`app/api/payment/route.ts`** — `handleAdminMarketing` gộp helper `callRpc` + `Promise.all` 5 RPC (funnel/sources/acquisition/campaigns/traffic), trả thêm `acquisition/campaigns/traffic`.
- **`public/admin.html`** — thêm 3 panel vào `#page-marketing`: chart "Đăng ký theo ngày & kênh" (`renderMktAcq` = cột chồng CSS thuần, mỗi kênh 1 màu + chú thích, xoay nhãn ngày), bảng "Chiến dịch UTM" (`renderMktCampaigns`), 2 bảng cạnh nhau "Top Landing Pages" + "Top Referrers" (`renderMktTraffic`). `loadMarketing` render thêm 3 mục.
- **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check block JS admin (147 dòng) OK. 3 RPC test prod OK.
- **CÒN LẠI:** S4 (cohort retention theo tuần signup + LTV theo kênh join credit_transactions + export CSV).

### ✅ Sprint 4 XONG (PR mới, branch reset trên main sau khi #241 merge) — retention + LTV + export CSV — HOÀN TẤT WORKPLAN
- **Migration `_patches/migration-marketing-cohorts.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — test trả `[]` vì chưa có signup có attribution):
  - `marketing_cohorts(p_weeks int default 8)` → JSON `[{cohort_week, size, retention:{woff:count}}]`. Cohort = TUẦN đăng ký (`user_attribution.signup_at`); retention = distinct user của cohort có events ở tuần offset 0..weeks-1. **Bug đã sửa khi áp:** `extract(epoch from (date-date))` lỗi (date−date ra int ngày) → dùng `((date_trunc('week',ts)::date - cw)/7)::int`.
- **`app/api/payment/route.ts`** — `handleAdminMarketing` gọi thêm `marketing_cohorts` (RPC dùng `p_weeks`, suy từ khoảng ngày, kẹp 4..16), trả thêm `cohorts` + `cohortWeeks`. Tổng 6 RPC/lần tải.
- **`public/admin.html`** — thêm: panel "Cohort Giữ Chân" (`renderMktCohorts` = lưới màu heat theo %, hàng=tuần signup, cột=T+N), cột **LTV/user** vào bảng Sources (revenue_credits/signups × 2500đ, tính client), nút **⬇ CSV** ở header funnel (`mktExportCSV` = funnel + sources ra CSV BOM UTF-8, tải client). `loadMarketing` lưu `_mktData` cho export.
- **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check block JS admin (200 dòng) OK. Cohort RPC test prod OK.
- **🎉 XONG 5 sprint (S0–S4).** Dashboard Marketing đầy đủ: Funnel · Sources (+LTV) · Acquisition chart · Campaign UTM · Cohort retention · Top landing/referrer · Export CSV. Data tự chảy khi user duyệt/đăng nhập trên prod. **Ý tưởng mở rộng sau:** đo doanh thu TIỀN THẬT (hiện quy đổi credits×2500đ — `credit_transactions` chưa lưu VNĐ/gateway); gắn `utm_campaign` vào link quảng bá để bảng Campaign có số; admin revamp phần còn lại (user detail drawer, bỏ trần 100 user — xem brainstorm đầu track).

### 🔧 Admin Revamp (phase tiếp theo track Marketing) — R1/R2/R3
Làm nốt "mấy mục còn mở" từ brainstorm. Workplan: **R1** bỏ trần 100 user + sửa tool_uses · **R2** user detail drawer · **R3** doanh thu tiền thật (amount_vnd/gateway).
- **✅ R1+R2 XONG (PR mới, gộp vì cùng đụng trang Users):**
  - **R1 — `handleAdminUsers` (`app/api/payment/route.ts`):** LOOP hết trang auth (`per_page=100` tới khi batch < 100, trần MAX_PAGES=100 ~10k user) thay vì chỉ page=1 → **bỏ trần 100 user**. Sửa `tool_uses`: đếm `credit_transactions amount<0` (lượt trừ Lượng = dùng tool trả phí) thay vì `type!=topup` (cũ tính cả signup_bonus/admin_grant → thổi phồng). `admin.html`: cột đổi nhãn "Trả Phí", panel hiện tổng số user (`#users-count`, filtered/total).
  - **R2 — endpoint GET `admin-user-detail?userId=` (`handleAdminUserDetail`, verifyAdmin):** Promise.all đọc credit_transactions (100 gần nhất) + user_attribution + events (2000 gần nhất) + user_credits(balance,referral_code); trả balance/referral_code/attribution/transactions/totals(spent,topped_up,events)/activity(by_type,top_tools,last_active). `admin.html`: hàng user click → `openUserDrawerById` mở **drawer trượt phải** (dựng bằng JS, không markup) = số dư/đã nạp/đã tiêu/events + nút cấp credits + attribution (kênh/campaign/referrer/landing/signup) + hoạt động (by_type badges + top tool) + bảng giao dịch gần đây. Nút "+Credits" trên hàng có `stopPropagation`. `_drawerUserId` guard tránh race.
  - **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check admin script (845 loc) OK.
- **✅ R3 XONG (PR mới, reset trên main sau khi #243 merge) — doanh thu tiền thật:**
  - **Migration `_patches/migration-credit-revenue.sql`** (✅ ĐÃ CHẠY prod — test `marketing_revenue` trả total_vnd=8.925.000đ từ 8 topup cũ qua fallback ×2500): `credit_transactions += amount_vnd int, gateway text` (nullable, không phá row cũ) + index gateway. RPC `marketing_revenue(from,to)` → JSON {total_vnd, by_gateway[], by_day[]} dùng `coalesce(amount_vnd, amount*2500)`.
  - **`app/api/payment/route.ts`:** `logTransaction` nhận thêm `amountVnd?`+`gateway?`. `handleCapture` (PayPal) ghi `amountVnd=foundPkg.amountVnd, gateway='paypal'` (cả 2 nhánh COMPLETED/capture). `handleAdminMarketing` gọi thêm `marketing_revenue` (7 RPC), trả `revenue`.
  - **`app/api/bank-webhook/route.ts`:** insert topup thêm `amount_vnd=Number(data.amount)` (tiền chuyển thật) `+ gateway='bank'`.
  - **`public/admin.html`:** panel "💰 Doanh Thu Tiền Thật" trong Marketing (`renderMktRevenue` = tổng + theo cổng + cột theo ngày). **Sửa bug Dashboard:** stat "Doanh Thu" cũ = `$totalCr/10` (ước lượng) VÀ `topups=amount>0` (tính cả bonus/grant) → nay `topups=type==='topup'`, doanh thu = Σ `amount_vnd` (fallback ×2500) hiển thị "X.Ytr". "Credits Nạp" cũng chỉ đếm topup thật.
  - **Verify:** typecheck 0, prettier route+bank-webhook sạch, node --check admin (879 loc) OK. RPC prod OK.
- **🎉 XONG R1+R2+R3 — đóng trọn "mấy mục còn mở".** Còn (tùy chọn tương lai): gắn `utm_campaign` vào link để bảng Campaign có số; các row topup CŨ chưa có `amount_vnd` (chỉ row mới từ giờ mới lưu tiền thật; muốn chuẩn tuyệt đối thì backfill từ `bank_orders`/PayPal history — chưa làm).

### 🔵 Dashboard revamp — CEO brainstorm 6 metric ưu tiên (branch `claude/admin-command-center-s4-395w5n`)
Sau R1-R3, brainstorm "act như CEO" ra 6 metric outside-the-box còn thiếu trên Dashboard. Henry chọn 5, xếp thứ tự tối ưu, duyệt qua prototype HTML gửi riêng (`SendUserFile`, không dùng `Artifact`) trước khi build thật — 3 vòng chỉnh (thêm marketing tracking → bỏ traffic/ads vì đã có GA4 → thêm Full Funnel nối GA4). Sau khi duyệt, Henry nói "build thật đi".
- **✅ D1 XONG (PR mới, 4/6 mục — Supabase-only, không cần hạ tầng mới):**
  - **Migration `_patches/migration-dashboard-v2.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — verify RPC trả số thật: DAU hôm nay/qua = 87/22 từ events; at-risk logic đúng; content-revenue rỗng vì `user_attribution` chưa có signup nào — tracking mới bật gần đây, sẽ tự có số):
    - `dashboard_engagement(days)` → JSON {days:[{day,dau}], dau_today, dau_yesterday, wau, wau_prev, mau, mau_prev} — DAU = distinct(user_id|anon_id) mỗi ngày từ `events`.
    - `dashboard_content_revenue(from,to)` → table(landing,signups,paid,revenue_vnd) — quy doanh thu (`credit_transactions` topup, `amount_vnd` fallback ×2500) theo `user_attribution.first_landing_path`; `/la-so/*` gộp 1 dòng (438K trang SEO), còn lại giữ path riêng (kien-thuc/nghien-cuu đủ ít để có ý nghĩa).
    - `dashboard_at_risk(idle_days,min_events,limit)` → user còn số dư >0, từng hoạt động ≥3 lần (join `auth.users` lấy email), im lặng 14+ ngày, sắp theo số dư.
  - **`app/api/payment/route.ts`:** `handleAdminDashboardV2` (action=`admin-dashboard-v2`) gọi 3 RPC trên + đếm nhanh (`count=exact`, không tải nguyên bảng) tổng/7N của Khảo Luận/Nghiên Cứu/YouTube (`van_dap publish_status=published`) cho panel Sản Xuất Nội Dung.
  - **`public/admin.html`+`admin.css`:** 4 panel mới trên Dashboard — **Mức Độ Dùng DAU/WAU/MAU** (4 tile + biểu đồ SVG area/line 30 ngày, hover tooltip, tự dựng không lib), **Sản Xuất Nội Dung** (tile 7N + tổng, 3 pipeline), **Doanh Thu Theo Nội Dung** (bar-list theo landing page), **User Sắp Rời Bỏ** (bảng, nút "Nhắc qua Telegram"/"Gửi Push" hiện CHỈ hiển thị gợi ý kênh — CHƯA nối hành động gửi thật, `cursor:default`). Class mới: `.eng-tiles/.eng-tile`, `.chart-wrap/.chart-tip`, `.mbar-row/.mbar-track/.mbar-fill`, `.btn-mini` (tái dùng `.td-title`/`.badge-*` có sẵn thay vì tạo trùng).
  - **Tiện sửa bug có sẵn:** panel "Funnel 7 Ngày Gần Đây" (`renderDashFunnel`) số bị hardcode `color:var(--navy)` → mờ ở dark mode; đổi `var(--text)`. **NỢ KỸ THUẬT phát hiện thêm:** còn ~17 chỗ khác trong admin.html dùng `color:var(--navy)` y hệt (Content Board, Khảo Luận, Nghiên Cứu, Marketing LTV, System Config, user drawer...) — cùng 1 bug dark-mode, CHƯA sửa hết (ngoài phạm vi PR này, để audit riêng).
  - **Verify:** typecheck 0 lỗi, prettier route.ts sạch, `node --check` cả 3 script block admin.html OK, Playwright screenshot light+dark (mock `admin-dashboard-v2` + REST) render đúng, không lỗi console.
  - **CÒN LẠI (2/6 mục, cần hạ tầng mới trước khi làm thật):**
    - **Sức Khỏe Kênh (bot error rate theo Telegram/Web/Messenger/WhatsApp):** hiện KHÔNG có log lỗi theo kênh — cần thêm ghi `event_type` lỗi (hoặc bảng riêng) trong `lib/channels/core.ts` + từng route kênh trước khi có số thật.
    - **Biên Lợi Nhuận Theo Tool:** cần lưu token usage (đã capture trong `lib/agent/run.ts` nhưng KHÔNG persist) + bảng giá cost/1K token theo model → tính biên LN thật.
  - **Full Funnel nối GA4** (Traffic GA4 → Đăng ký → Kích hoạt → Trả tiền → Quay lại): GA4 property "Tử Vi Minh Bảo" (`533053153`, Measurement ID `G-F4XNRS2XT0` trong `public/nav.js`) ĐÃ LIVE. Cần Henry tạo service account GCP (bật GA4 Data API, gán quyền Viewer cho property, add JSON key vào env Vercel) trước khi code phần gọi GA4 Data API — 4 bước còn lại (signup/activate/paid/return) tái dùng `marketing_funnel` RPC sẵn có, chỉ thay số "visitors" bằng session GA4 thật.
- **Henry: "làm hết đi, tuần tự, từng mục một, cho mày chọn"** — chốt thứ tự 3 mục còn lại: **D2 Sức Khỏe Kênh** (self-contained) → **D3 Biên LN Theo Tool** (self-contained, đụng hot path `run.ts`) → **D4 Full Funnel GA4** (chặn bởi việc tay Henry, làm cuối).
- **✅ D2 XONG (PR mới) — Sức Khỏe Kênh (bot error rate theo kênh):**
  - **Instrumentation:** `lib/channels/core.ts` `runConversation()` thêm tham số `onOutcome?(ok, reason)` — gọi ở CẢ 3 nhánh kết thúc lượt (thành công / agent lỗi-rỗng / exception), best-effort không chặn trả lời. `lib/channels/store.ts` thêm `chatLogOutcome(platform, chatId, ok, reason)` ghi vào `events` (event_type=`bot_reply`, meta={ok,reason}) — CHỌN `events` thay vì đếm qua `chat_usage` vì bảng đó chỉ tăng cho free-tier (`lib/channels/gate.ts` — user đã link ví KHÔNG qua `chatIncrFreeUsage`) nên thiếu số. Wire vào 3 route kênh (`telegram`/`messenger`/`whatsapp` route.ts, callback cuối `runConversation(...)`) + trực tiếp trong `app/api/v1/chat/route.ts` (nhánh `send(sse.done)` thành công / `catch` lỗi, platform=`web`).
  - **Migration `_patches/migration-channel-error-rate.sql`** (✅ ĐÃ CHẠY prod — RPC test trả đủ 4 platform 0/0 vì code chưa deploy lúc test, tự có số sau merge): `channel_error_rate(hours)` → table(platform,total,errors,error_rate) — LEFT JOIN cứng 4 platform (`telegram,web,messenger,whatsapp`) nên card nào cũng hiện dù 0 lượt.
  - **`app/api/payment/route.ts`:** `handleAdminDashboardV2` gọi thêm `channel_error_rate` (RPC thứ 7), trả `channelHealth`.
  - **`public/admin.html`+`admin.css`:** panel "Sức Khỏe Kênh Chat (24h)" trên Dashboard (`renderDashChannelHealth`, TRƯỚC KPI stats, đúng vị trí prototype) — 4 card Telegram/Web Chat/Messenger/WhatsApp, tỷ lệ lỗi % + pill trạng thái (xanh ≤2% · cam 2-8% · đỏ >8% · cam "chưa có lượt" nếu total=0). Class mới `.chan-row/.chan-card/.chan-top/.chan-name/.pill`.
  - **Verify:** typecheck 0, prettier route+chat+3 channel route+core+store sạch, node --check 3 script block admin.html OK, Playwright screenshot light+dark render đúng.
- **✅ D3 XONG (PR mới) — Biên Lợi Nhuận LLM theo tool:**
  - **Instrumentation:** `lib/agent/usage.ts` (mới) — `logLlmUsage(toolId, model, usage)` best-effort ghi vào `events` (event_type=`llm_usage`, meta={model,input_tokens,cache_creation_input_tokens,cache_read_input_tokens,output_tokens,cost_vnd}), giá USD/1M cứng trong file (bảng giá Anthropic hiện hành: sonnet-4-6=$3/$15, opus-4-x=$5/$25, haiku-4-5=$1/$5; cache write ×1.25, cache read ×0.1) quy đổi VNĐ ×25.000. `lib/agent/run.ts`: `streamTurn` giờ bắt ĐỦ usage (trước chỉ log `input_tokens` lúc `message_start` qua `logCacheUsage`, **thiếu hẳn `output_tokens`** ở `message_delta` — vá luôn khi thêm tracking); vòng lặp tool-use cộng dồn usage qua các round rồi gọi `logLlmUsage` MỘT lần cuối, tag `tool_id = scenario?.type || 'chat'`. **CHỈ theo dõi Anthropic** (route Gemini khác cấu trúc giá, bỏ qua có chủ đích).
  - **Quyết định gắn tool_id:** `'chat'` — CHÍNH type mà `/api/v1/chat` + `lib/channels/gate.ts` ghi vào `credit_transactions` cho MỌI lượt rail thật (kể cả có lá số, billing phẳng theo tin nhắn, KHÔNG tách theo scenario) — nên bucket cost `chat` khớp thẳng bucket doanh thu thật để tính margin đúng. Các bucket theo `scenario.type` (tu-binh, xem-tuoi...) chỉ để so cost tương đối, KHÔNG có doanh thu khớp riêng (hạn chế thật của mô hình billing hiện tại, không phải bug).
  - **🐞 Bắt lỗi TRƯỚC khi ship (tự QC, không phải Henry báo):** thiết kế đầu tiên dùng `credit_transactions.amount_vnd` làm "doanh thu" cho bucket `chat` — SAI, vì row `type=chat` là giao dịch TRỪ Lượng (amount ÂM, `amount_vnd` chỉ có ở row `topup`) → test RPC ra doanh thu ÂM (-2.45tr), lộ bug ngay. Sửa: doanh thu = `sum(-amount) × 2500đ` nơi `type=chat AND amount<0` — CÙNG quy ước "revenue = Lượng tiêu × 2.500đ" đã dùng sẵn ở Tools Registry (`spendCredits`), nhất quán với phần còn lại của admin.
  - **Migration `_patches/migration-dashboard-margin.sql`** (✅ ĐÃ CHẠY prod — test lại sau khi sửa bug: `chat_revenue_vnd`=2.450.000đ dương đúng, `chat_cost_vnd`=0 vì code chưa deploy): `dashboard_margin(from,to)` → JSON {chat_cost_vnd, chat_revenue_vnd, by_tool:[{tool_id,requests,cost_vnd}]}.
  - **`app/api/payment/route.ts`:** `handleAdminDashboardV2` gọi thêm `dashboard_margin` (RPC thứ 8), trả `margin`.
  - **`public/admin.html`:** panel "Biên Lợi Nhuận LLM" trên Dashboard (`renderDashMargin`) — 3 tile (doanh thu/chi phí/margin%, màu theo ngưỡng xanh≥50%·cam≥0%·đỏ<0%) + bảng chi phí theo `tool_id` + 2 dòng caveat giải thích rõ "doanh thu" là Lượng tiêu quy đổi (không phải tiền mặt tức thời) và chỉ bucket `chat` có margin thật.
  - **Verify:** typecheck 0, prettier route+run+usage sạch, node --check 3 script block admin.html OK, Playwright screenshot light+dark render đúng.
  - **🎉 XONG D2+D3.**
- **✅ D4 XONG (PR mới) — Full Funnel nối GA4 (việc tay Henry: service account GCP + GA4 Data API + Viewer property `533053153` — ĐÃ XONG):**
  - **`lib/analytics/ga4.ts`** (mới): `getGa4Sessions(fromDate,toDate)` — tự ký JWT (RS256, `crypto.sign`, KHÔNG cần thư viện `googleapis`) bằng service-account key, đổi lấy access token (`oauth2.googleapis.com/token`, scope `analytics.readonly`, cache token tới gần hết hạn), gọi GA4 Data API `runReport` (metric `sessions`) cho property `GA4_PROPERTY_ID`. Best-effort: thiếu env/lỗi API → trả `null`, KHÔNG throw.
  - **`app/api/payment/route.ts`:** `handleAdminMarketing` gọi thêm `getGa4Sessions(from,to)` song song 7 RPC cũ; có kết quả → **ghi đè `funnel.visitors`** bằng session GA4 thật (trước suy từ `page_view` nội bộ — chỉ thấy traffic đã chạm `track.js`, thiếu hẳn organic/ads/social) + gắn `funnel.visitorsSource='ga4'`; lỗi/thiếu env → giữ số nội bộ + `visitorsSource='internal'` (dashboard không vỡ khi chưa cấu hình).
  - **`public/admin.html`:** badge nhỏ cạnh "Khách ghé (visit)" trong `renderMktFunnel` — xanh "GA4" khi dùng số thật, xám "nội bộ" (kèm tooltip giải thích) khi fallback.
  - **🐞 Tiện sửa bug dark-mode (cùng nợ kỹ thuật `color:var(--navy)` D1 phát hiện):** 2 chỗ trong `renderMktFunnel` (số bậc funnel + % chuyển đổi tổng) mờ ở dark mode → đổi `var(--text)`. Còn lại ~15 chỗ khác trong file vẫn CHƯA sửa (ngoài phạm vi PR này).
  - **Env Vercel cần add (Henry):** `GA4_PROPERTY_ID=533053153`, `GA4_SERVICE_ACCOUNT_JSON=<toàn bộ nội dung file JSON key>`.
  - **Verify:** typecheck 0, lint sạch, prettier route+ga4.ts sạch, node --check 3 script block admin.html OK, Playwright screenshot light+dark (mock GA4 badge + verify dark-mode fix) render đúng.
  - **🎉 XONG TOÀN BỘ 6 metric CEO brainstorm (D1–D4).** Track "Dashboard revamp" hoàn tất.
- **✅ D5 XONG (PR mới) — audit timestamp + backfill attribution lịch sử:** Henry yêu cầu double-check các chart có timestamp rõ ràng + fill dữ liệu lịch sử cho đầy. Audit: hầu hết chart (Acquisition, Doanh Thu, Cohort) đã có nhãn ngày rõ trên trục/hàng; riêng biểu đồ **DAU/WAU/MAU** chỉ hiện ngày lúc hover → vá thêm nhãn ngày cố định (đầu/giữa/cuối trục, `initDashChart`) + dòng phụ đề hiện rõ khoảng ngày (`renderDashEngagement`). Tra DB phát hiện: `events`/`user_attribution` chỉ có dữ liệu từ 2026-07-22 (track.js mới bật ~18h) → KHÔNG có gì để "load" cho DAU/Funnel/Acquisition/Cohort vì chưa từng ghi nhận trước đó (sẽ tự đầy dần); riêng `marketing_revenue` đọc thẳng `credit_transactions` (có thật từ tháng 4) nên chỉ cần chọn khoảng ngày rộng hơn trên UI là ra số, không cần code. **Hỏi Henry** có nên backfill `user_attribution` cho 56 user cũ (đăng ký trước khi có tracking) không — **chốt: có, backfill**.
  - **Migration `_patches/migration-backfill-attribution.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — verify: 56/56 user có dòng, `marketing_funnel` 120N signups 50 (trước ~0), `marketing_sources` bucket `legacy` signups=50/paid=1/revenue=820cr, `marketing_cohorts` hiện 11 tuần cohort thật từ tháng 4): insert 1 dòng/user THIẾU attribution, `signup_at`/`first_seen_at` = `auth.users.created_at` (ngày thật), nhưng KHÔNG bịa kênh — `first_utm_source='legacy'` + `first_landing_path='(trước khi có tracking)'` để tách bạch rõ khỏi user thật có UTM/referrer (tránh lẫn vào bucket "direct"). Idempotent (left join where null).
  - **`public/admin.html`:** thêm màu `legacy: '#8A8F98'` (xám) vào `MKT_SRC_COLORS` cho bucket này tách biệt trực quan khỏi các kênh thật.
  - **Verify:** node --check block JS admin OK, query RPC prod xác nhận số đúng.
- **✅ D6 XONG (PR #262) — audit sâu "data nào chưa gắn" → lộ 3 bug thật, không chỉ thiếu số liệu:**
  - **🔴 Bug nghiêm trọng nhất — `laso` (kịch bản trả phí "vương miện") bị kéo sang Gemini ngoài ý muốn.** `geminiToolsEligible()` (`lib/agent/providers/gemini.ts`) fallback `r[scenarioType] || r._default || 'anthropic'` — DB `chat.provider_routes` prod là `{"_default":"gemini"}` (đặt để hạ chi phí nhóm prose free, KHÔNG có key `laso` riêng) → rơi về `_default` → lá số/luận giải trả phí chạy Gemini thay vì Claude Sonnet, trái `DEFAULTS.providerRoutes.laso='anthropic'` (appConfig.ts) và trái comment "vương miện MẶC ĐỊNH giữ Sonnet". **Đây cũng chính là lý do `events.event_type='llm_usage'` (D3) luôn 0 dòng** — phát hiện khi điều tra vì sao. Fix: nhóm tool-calling (`GEMINI_TOOLS_SCENARIOS`) không bao giờ thừa hưởng `_default` nữa — chỉ đi Gemini khi admin set ĐÚNG key `laso`. Vá DB prod ngay qua Supabase MCP (`{"_default":"gemini","laso":"anthropic"}`) — có hiệu lực tức thời, không cần đợi deploy.
  - **🟡 CI tự ghi đè dữ liệu tracking thật trên prod.** Điều tra `topup_start` bất thường (489 event/46 anon_id, 44/46 đúng **11 lần mỗi đứa** trong ~5 phút) → KHÔNG phải bot ngoài. `.github/workflows/playwright.yml` chạy full E2E trên MỌI push/PR, mặc định `BASE_URL=https://www.tuviminhbao.com` (prod thật) trừ nhánh `dev`; các spec (`topup.spec.ts`/`static-pages.spec.ts`/`mobile.spec.ts`) đều `page.goto('/topup.html')` → mỗi lần CI chạy ghi `page_view`/`topup_start`/... THẬT vào `events`, làm lệch Funnel/DAU/topup_intent. Fix: `public/track.js` bỏ qua toàn bộ event (kể cả `page_view` tự động) khi `navigator.webdriver===true` (cờ chuẩn mọi trình duyệt automation set — Playwright/Selenium/Puppeteer).
  - **⚪ Nút chia sẻ chưa track gì.** `ShareButtons` (`public/share.js` — component share THẬT, dùng ở `luan-giai.html` trang kết quả lá số + `khao-luan.html`/`blog.html`/`tai-lieu.html`) chưa gắn track dù `share` đã có sẵn trong allowlist `/api/track`. Thêm `Track.event('share',{meta:{medium}})` cho Facebook/WhatsApp/Telegram/Copy link. Phát hiện thêm: `public/share-widget.js` (component khác, gọi `/api/share-event`) — route đó KHÔNG TỒN TẠI trong `app/api/` (404 âm thầm) nhưng không nơi nào gọi `showShareWidget` → code chết, không sửa.
  - **CÒN LẠI — không phải bug, cần việc tay Henry (ngoài phạm vi code):** bảng "Chiến dịch UTM" trống vì chưa có link quảng bá nào gắn `utm_campaign` thật; 9 dòng `topup` cũ chưa có `amount_vnd` (đúng thiết kế R3 — chỉ ghi tiền thật cho giao dịch MỚI từ lúc deploy, backfill lịch sử từ bank/PayPal cần Henry cung cấp); GA4 visitors — không có tool đọc trực tiếp env Vercel để confirm `GA4_PROPERTY_ID`/`GA4_SERVICE_ACCOUNT_JSON` đã set chưa, Henry tự check badge "GA4"(xanh)/"nội bộ"(xám) cạnh "Khách ghé" trong panel Funnel.
  - **Verify:** DB app_config đã vá + verify trực tiếp qua Supabase MCP. `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `node --check` + `eslint` track.js/share.js sạch, CI (lint/typecheck/test×2/lighthouse) xanh.

---

## 🟢 ĐANG LÀM — App-shell "/app" (không gian làm việc đa công cụ)

**Branch:** `claude/part-x-continuation-tca4xh`
**Cập nhật:** 2026-07-09

### 🔖 RESUME HERE (mở máy khác đọc cái này trước)
App-shell tại **`/app`** = **Luận Đường (論堂)** — vỏ 3 cột (sidebar tool · workspace giữa · rail "Trợ lý Luận Đường"), brand navy/gold. **ĐÃ LIVE PROD.** Mọi tool đã vào shell — **kể cả Phong thủy & Xem tướng qua ảnh** (đảo quyết định cũ). Trang chủ đã revamp "một cửa".

**Revamp trang chủ + Luận Đường (mới→cũ, ĐÃ MERGE):**
- **#162** **Phong thủy & Xem tướng NATIVE vào shell** (vision): scenario type `xem-tuong`/`phong-thuy` + prompt vision (`prompts.ts`), rail **upload ảnh** (`shell.js`, gửi `images[{data,mediaType}]`), 2 trang `app-xem-tuong.html`/`app-phong-thuy.html` (setContext lúc load, rail active KHÔNG cần birth). Bản chấm điểm phong thủy structured (before/after) VẪN ở `/cong-cu`.
- **#161** avatar thầy trên **từng tin** rail (`.msg.a` = avatar + `.msg-body`).
- **#160** **author persona** cho rail: 15 thầy (`AUTHOR_ROSTER`), random/nhớ phiên (chung `localStorage['tvc_author_v1']` với tuvi-chat), avatar `/authors/<id>.jpg` + gửi `authorName/authorStyle` → văn phong. Vá `run.ts` birth-path áp văn phong cho cả Lá số.
- **#159** seal.webp thật ở sidebar · nút "Đổi nền" vào sidebar · copy band.
- **#158** menu **9→4 mục** (`nav.js`): ✦ Luận Đường · Khám phá · Cẩm nang · Tài khoản.
- **#157** nén 3 khối SEO → 1 dải "Khám phá & Tra cứu".
- **#156** dời catalog 47 tool → trang `/cong-cu` (`cong-cu.html`) + band "Một không gian".
- **#155** hero **một cửa**: ô hỏi/persona → shell (pending-ask `sessionStorage`, rail tự hỏi sau khi lập lá số), bỏ nhánh `/tuvi-chat.html`.
- **#154** đổi tên shell → **Luận Đường** (sidebar/rail/dashboard/CTA).
- **#153** width card cố định. **#152** panel `/cong-cu` grouping khớp menu.
- **#146–#151** (cũ): nền shell + migrate tool engine + intro + chip gợi ý + dashboard + hand-off.

### Kiến trúc app-shell (ĐỌC trước khi làm tiếp)
- **Chrome dùng chung:** `public/shell.js` (v9) + `public/shell.css` (v3). Trang tool chỉ cần: khai `window.SHELL_ACTIVE='<id>'`; tùy chọn `window.SHELL_INTRO={key,title,desc}` + `<div id="introHost">`; gọi `Shell.setContext({birth?,scenario?,label,greeting,chips})` để bật rail (`chips` nuôi hàng gợi ý). API: `rememberBirth/getRememberedBirth/prefillForm/autoRun` (hand-off), `introOnce/markIntroSeen/dismissIntro`, `ask/openRail`.
- **Rail** gọi `/api/v1/chat` SSE, gửi `birth` VÀ/HOẶC `scenario` (đi CÙNG được). Có **author persona** (`authorName/authorStyle` top-level + trong scenario) + **upload ảnh** (`pendingImages` → `messages[].images=[{data,mediaType}]`, vision). `setContext` nhận thêm `placeholder`. Trang vision (`xem-tuong`/`phong-thuy`) gọi setContext lúc load (chờ `boot` bằng `DOMContentLoaded`) → rail active không cần birth.
- **Routes** (`next.config.mjs` rewrites): `/app`→`app-home.html` · `/app/la-so`→`app.html` · `/app/bat-tu` · `/app/luan-giai` · `/app/xem-tuoi`&`/app/xem-lam-an` (chung `app-xem-tuoi.html`) · `/app/dat-ten` · `/app/chon-ngay` · **`/app/xem-tuong`** · **`/app/phong-thuy`**. Trang chủ `/`→`index.html` (revamp một-cửa); `/cong-cu`→`cong-cu.html` (catalog 47 tool).
- **Backend scenario** (`lib/agent/prompts.ts` buildChatContext + `lib/contract/v1.ts`): thêm nhánh `xem-tuong`/`phong-thuy` (prompt vision prose). `run.ts` birth-path gộp văn phong thầy vào `tone`.
- **Module lift/port (NỢ DRY):** `public/tuong-hop.js`, `public/can-chi.js` — sau ổn định trỏ trang legacy sang dùng chung.
- **Asset version:** bump `shell.js?v=` / `shell.css?v=` trên TẤT CẢ trang shell mỗi khi sửa (**hiện js=27, css=6**; `nav.js?v=16`). Linter hay reflow HTML — vô hại.
- **Verify:** serve `public/` bằng `python3 -m http.server` + Playwright (`/opt/pw-browsers/chromium`); test rewrite `/app/*` bằng `page.route` fulfill file, hoặc mở `*.html?auto=1` trực tiếp.

### 🔜 KÉO THÊM TOOL VÀO SHELL (cập nhật 2026-07-09)
**✅ BATCH 1 XONG (PR mới, chờ merge) — 3 tool + vá bug vision:**
- **`xem-tuoi-sinh-con`** → `/app/sinh-con` (`app-sinh-con.html`), nhóm **Tử Vi**. Backend đã sẵn 100% (scenario type + computeSinhCon). Client chấm nhanh 15 năm địa chi (parity `diachi.ts`), gửi thô `{namBo,namMe}`.
- **`tuong-hop`** → `/app/tuong-hop` (mode thứ 3 trong `app-xem-tuoi.html`, KHÔNG tách file), nhóm **Tử Vi**. Thêm scenario type `tuong-hop` (neutral compat "hai người bất kỳ") — mirror xem-tuoi: contract + `CHAT_SYSTEM_COMPAT` nhánh 3-way + run.ts computeLaso×2 + SCENARIO_FIELD='compatData'.
- **`dat-ten-dn`** → `/app/dat-ten-dn` (`app-dat-ten-dn.html`), nhóm **Đặt Tên**. Thêm scenario type `dat-ten-dn` + `computeDatTenDn` (diachi.ts, can chi chủ) + `CHAT_SYSTEM_DAT_TEN_DN` + `extractDatTenDnContext`. Data thô `{tenChu,namChu,nganh,loaiHinh,tenGoiY}`.
- **🐞 VÁ BUG:** `validateChatRequest` (v1.ts) trước THIẾU `xem-tuong`/`phong-thuy` trong mảng `types` → rail 2 tool vision (#162) bị **400** khi gửi scenario. Nay mảng đủ 10 type. (Verify Playwright: cả 3 luồng gửi đúng scenario.type + rail bật; typecheck 0 lỗi sau build engine.)
- **Sidebar/dashboard:** shell.js TOOLS + app-home GROUPS thêm 3 item; icon dashboard mới `users`/`baby`. Bump **js=17**.

**✅ BATCH 2 XONG (PR mới) — 6 tool + 2 nhóm sidebar mới (Mệnh Lý · Huyền Học):**
- **`bat-trach`** → `/app/bat-trach` (Phong Thủy): cung phi (mệnh quái Lạc Việt) + đông/tây tứ mệnh.
- **`kim-lau`** → `/app/kim-lau` (Chọn Ngày): tuổi mụ → Kim Lâu (Thân/Thê/Tử/Lục Súc) + Tam Tai, bảng 10 năm.
- **`ngu-hanh-ten`** → `/app/ngu-hanh-ten` (Đặt Tên): mệnh nạp âm + tên → rail luận ngũ hành từng chữ.
- **`nap-am`** → `/app/nap-am` (nhóm **Mệnh Lý** mới): năm → nạp âm + hành.
- **`than-so-hoc`** → `/app/than-so-hoc` (nhóm **Huyền Học** mới): ngày sinh → số chủ đạo Life Path (Pythagoras).
- **`kinh-dich`** → `/app/kinh-dich` (Huyền Học): gieo quẻ client (3 đồng ×6) → quái thượng/hạ + hào động; server resolve quái, rail định danh 64 quẻ + luận.
- **Engine mới:** `lib/engine/menhly.ts` (computeNapAm/KimLau/NguHanhTen/ThanSoHoc/BatTrach/KinhDich) — chỉ tính phần deterministic CHẮC (KHÔNG hardcode bảng 64 hướng/64 quẻ dễ sai, để LLM luận). Contract + 6 scenario type + 6 prompt (prompts.ts) + dispatch (run.ts) + SCENARIO_FIELD. Bump **js=18**. (Verify Playwright 6 luồng đúng scenario+data, rail bật; typecheck 0 lỗi.)

**✅ DRY REFACTOR batch-2 XONG (#168–#172, ĐÃ MERGE) — sửa lỗi kiến trúc "dựng mới thay vì port":**
Henry chỉ ra shell tool được **dựng MỚI** (thin, đẩy hết qua rail) thay vì **PORT** trải nghiệm ô-giữa của trang standalone. Quyết định: **module DÙNG CHUNG** `public/tools-shared/<tool>.js` (compute + render **byte-identical** với bản inline cũ) → CẢ trang standalone `/tools/*.html` (giữ nguyên, SEO, LIVE) LẪN shell `/app/*` gọi chung. Ô giữa shell nay hiện tool THẬT (không thin), rail = trợ lý luận sâu nhận data.
- **6 module:** `tools-shared/{kim-lau,nap-am,than-so-hoc,bat-trach,ngu-hanh-ten,kinh-dich}.js`. Mỗi cái = nguồn DUY NHẤT. Standalone rewire: thay `<script>` inline bằng `src` + wiring DOM mỏng.
- **Bug batch-2 sửa nhờ port:** công thức tôi tự chế lệch bản standalone (kim-lâu chu kỳ 5+Hoang Ốc, nạp âm chính tả, bát trạch `nam%100`). Port = lấy standalone làm chuẩn → hết lệch.
- **Năm động** (`vnYear()` timezone VN) thay hardcode 2026 cho mọi tool.
- **Backend pass-through:** client module = nguồn chuẩn → `run.ts` KHÔNG recompute (gỡ 6 compute*), **XÓA `lib/engine/menhly.ts`** (rỗng). `prompts.ts` đọc data qua `extractGenericContext` (+ nhãn `GENERIC_LABELS`); gỡ `extractKinhDichContext`. Rail data-contract vài tool đổi shape (ngu-hanh-ten/kinh-dich) — prompt cập nhật đồng bộ.
- **Verify mỗi tool:** Playwright serve `public/` + so `innerHTML` bản mới vs `git HEAD` (byte-identical, gồm luồng interactive: nhập nét thủ công ngu-hanh-ten, gieo quẻ kinh-dich mock `Math.random` 5 seed) + smoke shell-mount (rail scenario đúng). Typecheck 0, lint/prettier sạch.
- **CÒN LẠI (chưa port DRY — cần Henry test/chốt, KHÔNG auto-merge):** tử-vi/lá-số adjacent `sinh-con`/`tuong-hop`/`chon-ngay`/`dat-ten`/`xem-tuoi`; nặng `la-so`/`luan-giai`/`bat-tu` (AI+paywall+RAG); API/vision `xem-tuong`/`phong-thuy`/`dat-ten-dn`.

**Ứng viên CÒN LẠI (chưa vào shell):** **18 slot đã trong shell.** Còn: an-sao/sao-nam/cach-cuc/dai-van/van-thang (lát cắt lá số — rail đã trả lời được, cân nhắc có cần slot riêng); tu-tru (≈ bat-tu đã có); hoang-dao/ngay-tot/luc-nham/han-nam (lịch số); tarot/oracle/boi-bai-tay (rút bài — cần UI riêng); phong-thuy-render + 10 tool Làm Đẹp (sinh/ghép ảnh, khác domain).

**Ứng viên CHƯA vào shell — phân theo độ khả thi (đã trừ 3 tool batch 1):**
- **Nhóm A (dễ nhất, hợp rail — engine/scenario sẵn):**
  - `nap-am`, `tu-tru`, `bat-trach`, `kim-lau`, `ngu-hanh-ten` (Mệnh Lý free) — can-chi/ngũ hành thuần, `lib/engine/diachi.ts` sẵn.
  - `an-sao`, `sao-nam`, `cach-cuc`, `dai-van`, `van-thang` (Công Cụ Tử Vi free) — **đều là lát cắt lá số, rail đã trả lời được khi có lá số** → cân nhắc có cần slot riêng không.
  - `hoang-dao`, `ngay-tot`, `luc-nham`, `han-nam` (Lịch Số free) — lịch/ngày deterministic.
- **Nhóm B (hợp rail prose, cần prompt riêng):** `kinh-dich` (64 quẻ), `than-so-hoc`, `khi-sac` (ảnh OK). `thanh-tuong`/`thanh-tuong-pro` = **giọng nói/audio → rail CHƯA nhận audio**.
- **Nhóm C (KHÓ, KHÔNG hợp rail prose — cần UI riêng/sinh ảnh):** `tarot`/`oracle`/`boi-bai-tay` (rút bài tương tác); `phong-thuy-render` (sinh ảnh); 10 tool **Phong Cách AI / Làm Đẹp** (da-lieu/kieu-toc/personal-color/trang-diem/trang-phuc, nhất là *-tryon* = sinh/ghép ảnh, khác domain mệnh lý).

**Gợi ý Claude: batch đầu = 3 tool Nhóm A có engine sẵn** (`xem-tuoi-sinh-con` → nhóm Chọn Ngày/Tử Vi · `dat-ten-dn` → Đặt Tên · `tuong-hop` → Tử Vi cạnh xem-tuoi). Pattern y hệt các trang scenario hiện có: tạo `app-<id>.html` khai `SHELL_ACTIVE` + `Shell.setContext({scenario})` bọc DOMContentLoaded, thêm route `next.config.mjs`, thêm item vào TOOLS (`shell.js`) + GROUPS (`app-home.html`), bump asset version. Backend: check `buildChatContext`/contract đã hỗ trợ scenario type chưa (xem-tuoi-sinh-con/tuong-hop có thể cần nhánh). **→ Chờ Henry chốt tool nào rồi gom 1 PR/batch.**

### Bước tiếp theo (gợi ý khác, chọn 1)
1. **`suggestions[]` do LLM sinh** theo từng câu trả lời (nâng cấp #149 — đụng brain `lib/agent/prompts.ts`+contract, áp cho cả kênh bot). Nặng hơn, tách PR.
2. **Nợ DRY:** trỏ `xem-tuoi.html` (legacy) + trang khác sang `tuong-hop.js`/`can-chi.js`.
3. **Tính phí Lượng cho vision** (xem-tuong/phong-thuy) nếu muốn — hiện bill qua `chat.cost` chung như mọi lượt rail.
4. **Setup máy mới:** `npm ci` → `cd tuvi-engine && npm ci && cd ..` → `npx playwright install chromium` (env này đã có Chromium sẵn ở `/opt/pw-browsers`).

### Quy ước (giữ nguyên)
1 việc = 1 PR draft → CI xanh (lint·typecheck·test×2·lighthouse·Vercel·smoke-skip) → mark ready → squash-merge → `git checkout -B <branch> origin/main` (branch reset, push `--force-with-lease`). Sau merge, session tự unsubscribe PR.

---

## 🗂️ Track cũ — Chat-first / Contract v1 (đa nền tảng)

**Branch:** `claude/tuviminhbao-resume-tf8tcq`
**Cập nhật:** 2026-06-24
**Xương sống:** `docs/KIEN-TRUC-VA-LO-TRINH.md` (đọc file này trước khi làm tiếp).

### 🔖 RESUME HERE (mở máy khác đọc cái này trước)
- **⏭️ PICK UP NGAY (2026-06-24 tối — answer-shape ĐÃ LIVE THẬT trên prod, verify OK, sẵn sàng PR2 chip):** Shape chạy đúng cả web + Telegram (Henry test xác nhận: phán quyết in đậm → 1 mạnh+1 yếu cốt lõi → MỞ NÚT 1 câu hỏi gọi tên chi tiết thật, ~130–200 từ, không tiêu đề con). **4 PR merge+deploy hôm nay, main @ `cea18c2`** (xem mục "PR đã merge" bên dưới — #104 shape nền, #106 NAM_XEM, #107 DB-prompt-là-lớp-tông, **#108 = FIX CHÍNH**). PR **#104** gồm 3 thứ: (1) **answer-shape v1** — `CHAT_RICH_RULES`+`CHAT_SYSTEM_LASO` (`lib/agent/prompts.ts`) đổi sang **3 lớp** (phán quyết in đậm → 1 mạch dẫn chứng cốt lõi, 1 mạnh+1 yếu, không dàn trải → **MỞ NÚT** nêu đích danh 1 chi tiết thật chưa luận + mời hỏi tiếp); độ dài **130–200 từ** (was 250–600), follow-up 80–140. (2) **Luật vận hạn "đại vận là gốc"** (prompts.ts + `TOOLS_INSTRUCTION` trong `tools.ts`): đại vận là tầng DUY NHẤT có điểm/10 thật; tiểu→nguyệt→nhật phái sinh; đặt vận ngắn trong khung đại vận (đại vận tốt thì sao xấu nhất thời lướt qua); **nguyệt/nhật vận CẤM bịa điểm**, luận theo cung+chính tinh. (3) **Cửa sổ tiểu/nguyệt vận ±5→±10** TÁCH tham số (`tinhTieuVanScores` thêm `windowYears`, `anSaoLaSo` thêm `tieuVanWindow`, `computeLaso` truyền 10) — **client/biểu đồ nến giữ ±5**, chỉ chat server giãn ±10 (smoke OK: client 2021–2031 / server 2016–2036), KHÔNG tốn token LLM. **CĂN NGUYÊN "vẫn dài" (chốt sau 3 vòng chẩn, #108):** KHÔNG phải DB override — `app_config.chat.system_prompt` vốn đã rỗng `""` (đã kiểm trực tiếp qua Supabase REST). Thật ra: **nhập ngày sinh BẰNG TEXT (Telegram, web text) → `req.birth` rỗng → `runAgent` (`lib/agent/run.ts`) chọn `CHAT_SYSTEM_GENERAL` (bản LỎNG 200–600 từ, cho tiêu đề con) rồi mới gọi tool `lap_la_so`**; shape #104 chỉ nằm trong `CHAT_SYSTEM_LASO` (dùng khi đã có sẵn lá số) → luồng phổ biến nhất trên Telegram không chạm tới. #108 cho `CHAT_SYSTEM_GENERAL` mang luôn shape. #107 (DB-prompt-là-lớp-tông) vẫn đúng kiến trúc nhưng KHÔNG phải fix triệu chứng này. **🔐 Henry: ROTATE service_role key Supabase** — đã paste qua chat để Claude kiểm DB rỗng → Settings→API→Reset, cập nhật env Vercel `SUPABASE_SERVICE_KEY` + Redeploy. **NỢ KỸ THUẬT mới:** shape lặp ở `CHAT_SYSTEM_LASO`+`CHAT_SYSTEM_GENERAL`+`CHAT_RICH_RULES` → nên trích `CHAT_SHAPE_RULES` chung (PR riêng). **Việc tiếp NGAY:** (a) **PR 2 — chip câu hỏi gợi ý** (ĐÃ MỞ KHÓA, shape OK): core trả thêm `suggestions[]` (`lib/channels/core.ts`), mỗi kênh tự render (web=chip, Telegram=inline keyboard, Messenger=quick replies, WhatsApp=interactive buttons ≤3) — chốt shape `suggestions` rồi code. (b) Tinh chỉnh tông (tùy chọn): set `app_config.chat.system_prompt` vài dòng CHỈ về giọng văn — nhờ #107 sẽ chồng lên shape, không phá. (c) **trust/retrodiction (#3)** chờ chốt dial brand rồi mới code.
- **✅ NỢ KỸ THUẬT NAM_XEM — XONG (#106):** `extractLasoContext` (`lib/agent/prompts.ts`) hết hardcode `NAM_XEM=2027`, dùng `currentNamXem()`.
- **⏸️ Messenger + WhatsApp (PR #102 merged, wiring xong nhưng TEST RUNTIME còn TẮC — gác lại):** App Business (App ID `4355400224733286`, Page id `122097706839369476`, WhatsApp Phone Number ID `1176714088859217`, số test sandbox `+1 555 652-8238`), 8 env + token vĩnh viễn + webhook verify cả 2 + 3 QR deep link — ĐÃ XONG. **NHƯNG khi test (2026-06-24):** (1) **WhatsApp**: nhắn KHÔNG có reply; Claude soi runtime log Vercel 3h → **0 POST tới `/api/channels/whatsapp`** (search path xác nhận, code route KHÔNG lỗi — webhook Meta CHƯA gửi tới). Nghi: WABA chưa "Subscribe" vào app / callback URL phải có `www` / số chưa add recipients. (2) **Messenger QR**: `m.me/122097706839369476` mở browser cũng KHÔNG ra → **Page chưa publish hoặc chưa có username**. **Việc tay Henry (Meta dashboard):** WhatsApp→Configuration check WABA subscribe + callback `https://www.tuviminhbao.com/api/channels/whatsapp`; Page→publish + set username (xong đưa Claude username để gen lại QR `m.me/<username>`). Nhắn test lại → Claude soi log. Phạm vi: Messenger Dev mode (chỉ admin/tester); WhatsApp số sandbox (cần WABA production). Ví Lượng để SAU, chạy free-cap/ngày.
- **State (2026-06-23):** Phase 0 + Phase 1 web DONE. **Đã LIVE trên prod:** Pricing 5 Lượng/lượt + signup 25 Lượng (#87, #88); Telegram bot `@tuviminhbao_bot` (#91–100) — chạy thật trên prod, test OK gồm cả tin follow-up. #96 web chat xem ẢNH (tướng mặt/phong thủy, multimodal), #97 Telegram NHỚ lá số theo phiên, #98 Telegram nhận ẢNH, #99 TÁCH lõi kênh chat dùng chung.
- **✅ FIX BUG follow-up (#100, 2026-06-23) — DONE:** tin nhắn thứ 2 (follow-up) từng trả "gặp trục trặc" với log Vercel RỖNG. Căn nguyên: lỗi TẠM THỜI từ Anthropic (529 overloaded / 429 rate-limit) — `runAgent` gọi Anthropic bằng `fetch` thô KHÔNG có auto-retry như SDK. Loại trừ được "trả lâu" (timeout → bot im, không gửi ERR_MSG) và "trả dài" (max_tokens → text cụt, không rỗng). Sửa: (a) helper `postAnthropic` retry 429/500/502/503/529 (backoff ngắn, 3 lần) trong `lib/agent/run.ts`; (b) thêm `console.error` ở 3 chỗ trước đây nuốt lỗi im (callAnthropic throw / streamFinal sse.error / runConversation catch+nhánh err||!answer) → lần sau tái phát thì log lộ `[runAgent...] Anthropic non-200: <status> — <body>`. Test prod OK.
- **Kiến trúc kênh chat (sau #99) — QUAN TRỌNG:** điều phối 1 lượt hội thoại nằm ở **`lib/channels/core.ts`** (`runConversation` + interface `ChannelIO` + `SessionStore`) — TRUNG LẬP nền tảng (không import Telegram/Supabase). Lõi lo: thanh tiến trình + typing, tải ảnh, nạp/lưu phiên (nhớ lá số), gọi `runAgent`, chốt câu trả lời, tính phí (gọi `gateCommit` khi thành công), KHÔNG lưu base64 ảnh vào phiên. `splitText`+`createSSECollector` cũng ở core. **Thêm kênh mới = viết `lib/channels/<plat>.ts` (cài ChannelIO+SessionStore) + `app/api/channels/<plat>/route.ts` (verify webhook + parse update + lệnh + cổng tính phí) → gọi `runConversation`.** Telegram giờ là mẫu: `route.ts` định nghĩa `telegramIO`/`telegramStore`. `runAgent` (lib/agent/run.ts) trả `{toolsUsed, birth}` — birth bắt từ req.birth hoặc tool lap_la_so, để lưu phiên đỡ hỏi lại ngày sinh. Ảnh: ChatMessage.images (base64) + VISION_INSTRUCTION đã sẵn trong runAgent.
- **✅ DONE — Messenger + WhatsApp (PR #102 đã merge):** thêm 2 kênh Meta Graph cùng đợt + **TỔNG QUÁT HÓA DB đa-nền-tảng**. (a) Lưu trữ gộp về `lib/channels/store.ts` (generic, bảng `chat_sessions`/`chat_links`/`chat_link_tokens`/`chat_usage` có cột `platform` + RPC `chat_incr_free_usage`) — `telegram.ts`/`telegramLink.ts` giờ là VỎ MỎNG bind `platform='telegram'`, route Telegram KHÔNG đổi (an toàn cho bot đang LIVE). (b) `lib/channels/meta.ts` helper chung: `verifyMetaSignature` (X-Hub-Signature-256 HMAC App Secret trên RAW body), `verifyWebhookChallenge` (GET hub.challenge), `graphPost`, `fetchGraphMedia`. (c) `lib/channels/gate.ts` cổng tính phí dùng chung (ví Lượng nếu link / freeCap lượt/ngày nếu chưa). (d) Adapter `messenger.ts`/`whatsapp.ts` + route `app/api/channels/{messenger,whatsapp}/route.ts`. Messenger/WhatsApp KHÔNG sửa được tin → `sendProgress` gửi "đang xem…" 1 lần rồi trả null (không edit theo status). Liên kết ví từ web cho Messenger/WhatsApp = việc làm SAU (giờ mặc định freeCap/ngày).
- **🔴 BƯỚC TIẾP — Zalo OA:** Henry đang đăng ký Zalo OA (oa.zalo.me, CCCD/GPKD, 2-3 ngày). Khi có access token → viết adapter Zalo theo mẫu Telegram/Messenger + lõi core. Zalo API riêng (của VNG): webhook JSON, send qua OA API, verify appsecret_proof. Bộ generic `store.ts`/`gate.ts` đã sẵn → Zalo chỉ thêm `lib/channels/zalo.ts` + route, bind `platform='zalo-oa'`.
- **✅ VIỆC TAY HENRY (để Telegram chạy thật trên prod) — XONG 2026-06-23:** (a) migration Supabase `telegram_sessions` (+cột `birth jsonb`) + `telegram_links`/`telegram_link_tokens`/`telegram_usage` (+RPC `tg_incr_free_usage`) đã chạy (project `dciwkfdqhhddeymlisey`); (b) env Vercel `TELEGRAM_BOT_TOKEN`+`TELEGRAM_WEBHOOK_SECRET` đã set + Redeploy; (c) webhook đăng ký đúng `https://www.tuviminhbao.com/api/channels/telegram` (verify `getWebhookInfo`). Bot test OK: nhớ lá số nhiều lượt, ảnh mặt/nhà, /new, ví Lượng, **và tin follow-up (sau fix #100).**
- **✅ VIỆC TAY HENRY (để Messenger/WhatsApp chạy thật) — WIRING XONG 2026-06-23:** (a) migration `_patches/migration-channels-multiplatform.sql` đã chạy (bảng `chat_*` + COPY data Telegram sang `platform='telegram'`; bảng `telegram_*` cũ KHÔNG đụng → bot Telegram LIVE liền mạch). (b) **Meta Developer:** App Business mới — App ID `4355400224733286`, Page Messenger id `122097706839369476`, WhatsApp Phone Number ID `1176714088859217`, số test sandbox `+1 555 652-8238`. (c) 8 env đã set Vercel + Redeploy (`MESSENGER_PAGE_ACCESS_TOKEN`/`MESSENGER_APP_SECRET`/`MESSENGER_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_TOKEN`/`WHATSAPP_APP_SECRET`/`WHATSAPP_VERIFY_TOKEN` + Graph version) — token Messenger & WhatsApp đều **vĩnh viễn**. (d) Webhook đã trỏ + verify cả 2 (`…/api/channels/messenger` + `…/whatsapp`, field `messages`, Page subscribed), endpoint test **200**. **CÒN LẠI:** (1) Henry nhắn test thật → Claude soi runtime log Vercel xác nhận nhận+trả lời. (2) Messenger đang **Development mode** → chỉ admin/tester được trả lời tới khi App Review duyệt `pages_messaging`. (3) WhatsApp đang **số test sandbox** → cần gắn số WABA production (Business verification) để mở cho người thật.
- **Setup máy mới:** `npm ci` → `cd tuvi-engine && npm ci && cd ..` → `npx playwright install chromium`. GitHub MCP/`gh` tùy môi trường.
- **Quy ước:** 1 việc = 1 PR draft → CI xanh (7 checks: lint, typecheck, test×2 unit+e2e, lighthouse, Vercel, smoke-skip) → squash-merge → `git reset --hard origin/main`. Secrets để ENV trên Vercel, KHÔNG commit.

### Tầm nhìn 1 câu
Một **bộ não** trên server (`/api/v1/chat`, Contract v1). Mọi nền tảng (Web → Zalo → TikTok → Android → iOS → bot) là **vỏ mỏng** gọi cùng API. Sửa 1 chỗ, tất cả cập nhật. Engine deterministic là nguồn lá số DUY NHẤT — LLM không bịa số.

### Kiến trúc "một bộ não" (đã hợp nhất — KHÔNG viết trùng)
- **Tools dùng chung:** `lib/agent/tools.ts` (TOOLS_INSTRUCTION, buildTools, execLasoTool, toolLabel).
- **Prompts dùng chung:** `lib/agent/prompts.ts` (CHAT_SYSTEM_LASO/GENERAL, extractLasoContext, buildChatContext).
- Cả `/api/v1/chat` VÀ `/api/lasotuvi` đều ăn 2 module trên → sửa prompt/tool 1 chỗ.
- **Engine server-side:** `lib/engine/laso.ts` `computeLaso(birth)` — nạp ĐÚNG `public/tuvi-ansao-engine.js` mà client dùng → lá số y hệt (parity đã verify).
- **Config runtime:** `app_config` (Supabase) qua `lib/config/appConfig.ts` — prompt/model/cost sửa ở DB, không deploy. `chat.system_prompt` rỗng = dùng template chung.
- **Paywall/Lượng:** `lib/billing/credits.ts`, gộp trong `/api/v1/chat` (cost từ config, 0 = free). Cờ `PAYWALL_DISABLED`.
- **Contract:** `lib/contract/v1.ts` — additive-only. SSE 5 event: status·tool_call·text(delta)·done·error. Request: `birth` (luồng lá số) HOẶC `scenario:{type,data,docs?}` (6 kịch bản phi-lá-số).

### Tiến độ
- ✅ **Phase 0** (bộ não + contract + config + paywall) — DONE.
- ✅ **Phase 1 một phần:** PWA (manifest/sw/pwa-install), `chat-v2.html` (vỏ mỏng tham chiếu, có lưu hội thoại + nút Mới).
- ✅ **Sprint 1.1 (laso-only) — MERGED PR #78.** `tuvi-chat.html` luồng lá số → `/api/v1/chat` (server tính từ `chat.birth`). Cờ `USE_V1_LASO` + escape hatch `localStorage.tvc_use_v1='0'`.
- ✅ **Sprint 1.2 (6 tool phi-lá-số) — MERGED PR #79.** Flip nốt xem-tuoi/xem-lam-an/tu-binh/sinh-con/chon-ngay/dat-ten trong `tuvi-chat.html` sang `/api/v1/chat` qua field additive `scenario:{type,data,docs?}`; `/api/v1/chat` dispatch qua CHÍNH `buildChatContext`. CÙNG cờ `USE_V1_LASO`. `/api/lasotuvi` GIỮ NGUYÊN cho 7 trang khác.
- ✅ **Sprint 1.3 (Tử Bình server-compute) — MERGED PR #80.** Lát cắt dọc đầu tiên của "server tự tính kịch bản". (A) **Sửa bug** `extractTuBinhContext` (`prompts.ts`) đọc sai shape → trước ra `?`/`[object Object]`; nay đọc đúng (mảng `tuTru` + object), context giàu. Lợi cho cả luồng cũ. (B) `lib/engine/tubinh.ts` `computeTuBinh(birth)` nạp `public/tubinh-ansao-engine.js` (CommonJS) qua `new Function`. `/api/v1/chat`: `tu-binh` + `birth` → server lập bát tự. Tử Bình dùng DƯƠNG lịch+tiết khí.
- ✅ **Sprint 1.4 (Tương hợp server-compute) — MERGED PR #81.** Nhân pattern 1.3 cho `xem-tuoi`/`xem-lam-an`: compat chỉ là **2 lá số** → `computeLaso` ×2 (parity sẵn). Client gửi `scenario.data={nameA,nameB,birthA,birthB}`; server dựng `{lsA,lsB,nameA,nameB}`.
- ✅ **Sprint 1.5 (sinh-con/chọn-ngày/đặt-tên server-compute) — MERGED PR #82.** 3 kịch bản cuối, gộp 1 PR (đều NHẸ, cùng pattern). Logic ĐỊA CHI/CAN CHI/NẠP ÂM thuần → `lib/engine/diachi.ts` (port nguyên hằng số + hàm `_cc*` từ `tuvi-chat.html`, KHÔNG nạp engine vanilla). `computeSinhCon`/`computeChonNgay`/`computeDatTen` trả CHÍNH shape `extract*Context` cần. `/api/v1/chat`: 3 type này → tính từ input thô trong `scenario.data`; trả null nếu thiếu → giữ data client (fallback). Client `tcDo*` lưu `chat.scenarioRaw`, `doSend` gửi thô. **→ Cả 6 kịch bản giờ server-compute → Zalo/native chỉ gửi input thô.**
- ✅ **Sprint 1.6 (fix parity NĂM XEM) — MERGED PR #83.** Audit parity lá số phát hiện lệch DUY NHẤT: client `tuvi-chat.html` hardcode `NAM_XEM=2027`, còn server `/api/v1/chat` không truyền namXem → `computeLaso` default `new Date().getFullYear()`=2026. Cấu trúc (12 cung/sao/cách cục/đại vận list 12/napAm/menh) parity tuyệt đối; NHƯNG `tuoiXem` lệch 1, `daiVanHienTai` lệch ở mốc, `tieuVanScores`/`nguyetVanScores` window lệch 1 năm (2021–2031 vs 2022–2032) → `tra_tieu_van`/`tra_nguyet_van` báo "ngoài phạm vi" sai. **Fix (cách 1 + năm động):** năm xem = NĂM HIỆN TẠI giờ VN, nguồn DUY NHẤT `lib/engine/namxem.ts` `currentNamXem()`; `laso.ts`/`tubinh.ts`/`diachi.ts` dùng chung (gộp 3 bản `currentYearVN` trùng); client tính cùng công thức Intl. Bỏ hardcode 2027 → hết drift, không update tay hằng năm. (`convertDuongToAm` chỉ `solarToLunar(dd,mm,yy)` → giờ KHÔNG đổi ngày âm, nên `gioHour` 0 vs 23 giờ Tý vẫn parity — đã verify.)
- ✅ **Sprint 1.7 (gỡ double-deduct billing) — MERGED PR #84.** Khi v1 bật + cost>0, lượt chat bị trừ Lượng 2 lần: SERVER `/api/v1/chat` trừ trong event done (`deductCredits`, `lib/billing/credits.ts`) VÀ client `tuvi-chat.html` gọi `TuviPaywall.deductSilent`. **Fix tối thiểu:** guard `deductSilent` ở `doSend` (lượt follow-up) bằng `!useV1` — v1 để SERVER là biller DUY NHẤT; path legacy `/api/lasotuvi` (KHÔNG bill server-side, đã verify route.ts) thì client vẫn deductSilent. 2 chỗ `deductSilent` của form-initial (Chọn Ngày/Đặt Tên) gọi legacy `/api/xem-tuoi` → GIỮ. Hiện cost=0 nên vô hại; fix để bật cost>0 an toàn.

### 🎉 PHASE 1 (Web thin-client + PWA) — DONE
`tuvi-chat.html` chạy 100% qua Contract v1: lá số + cả 6 kịch bản server-compute (#78–82), parity năm xem chuẩn (#83), billing 1 nguồn (#84), PWA + E2E xanh. **→ Web đủ điều kiện ra mắt #1.** Mở rộng tùy chọn (KHÔNG chặn ra mắt): kéo phong-thuy/tuong-mat (ảnh) vào agent chat — hiện vẫn trang/API riêng.

### Quyết định GIỮ `/api/lasotuvi` (2026-06-21)
**KHÔNG khai tử.** Lý do: (1) mode `phan` nuôi luận-giải 24 mục của `luan-giai.html` — CHƯA có bản v1 thay thế, bỏ là gãy. (2) mode `action=chat` đã share CHUNG bộ não (`lib/agent/prompts.ts`+`tools.ts`) với `/api/v1/chat` → KHÔNG drift, "nợ" chỉ cosmetic. (3) route chỉ chạy khi có request → 0 chi phí khi idle. Lợi ích khai tử ~0, rủi ro gãy `luan-giai` thật → không đáng. Bề mặt phụ còn gọi `action=chat` (profile.html, widget luan-giai, chatbot.js, fallback tuvi-chat) GIỮ NGUYÊN.

### PR đã merge gần đây
- **#74** Chat-first + Contract v1 (Phase 0–1 nền).
- **#75** chat-v2 lưu hội thoại + nút Mới.
- **#76** CI: thêm job `typecheck` (`tsc --noEmit` + build engine) — bịt lỗ refactor lọt lỗi type.
- **#77** fix engine: `computeLaso` dùng năm ÂM cho `namAL` (sửa off-by-one tuổi mụ cho người sinh trước Tết). **→ tiền đề parity cho #78.**
- **#78** Sprint 1.1: luồng lá số `tuvi-chat.html` gọi Contract v1.
- **#79** Sprint 1.2: 6 kịch bản phi-lá-số gọi Contract v1 (`scenario`).
- **#80** Sprint 1.3: Tử Bình server-compute + fix bug context.
- **#81** Sprint 1.4: Tương hợp server-compute (computeLaso ×2).
- **#82** Sprint 1.5: sinh-con/chọn-ngày/đặt-tên server-compute → cả 6 kịch bản server-compute.
- **#83** Sprint 1.6: fix parity năm xem (currentNamXem chung, bỏ hardcode 2027).
- **#84** Sprint 1.7: gỡ double-deduct billing (v1 → server là biller duy nhất).
- **#85** docs: chốt Phase 1 DONE + ghi quyết định GIỮ `/api/lasotuvi` (cập nhật CLAUDE.md + xương sống).
- **#104** answer-shape v1 (3 lớp) + luật vận hạn "đại vận là gốc" + cửa sổ vận ±10.
- **#106** fix: bỏ hardcode `NAM_XEM=2027` trong `extractLasoContext` → `currentNamXem()`.
- **#107** `app_config.chat.system_prompt` thành LỚP TÔNG (persona) thay vì thay thế template.
- **#108** **fix chính shape**: `CHAT_SYSTEM_GENERAL` mang luôn shape 3 lớp → luồng nhập sinh bằng text (Telegram) hết trả lời dài. Verify prod OK.

### 🔴 Bước tiếp theo
1. **Henry test preview prod #83/#84**: `/tuvi-chat.html` → hỏi "năm nay/năm sau", "tháng X/YYYY", tuổi mụ → verify dùng NĂM HIỆN TẠI (2026, không còn 2027); `tra_tieu_van`/`tra_nguyet_van` không báo "ngoài phạm vi" cho năm gần. Billing: khi bật cost>0, lượt v1 chỉ trừ Lượng 1 lần.
2. **Mở rộng tùy chọn (không chặn ra mắt):** kéo phong-thuy/tuong-mat (ảnh/multimodal) vào agent chat nếu muốn "1 ô chat làm mọi nghiệp vụ".
3. **Phase 2 (Zalo)** — chờ Henry đăng ký OA/Mini App (oa.zalo.me, mini.zalo.me, cần CCCD/GPKD). Bộ não đã sẵn: native/Zalo chỉ cần gửi `birth` hoặc `scenario.data` thô.

### ⏳ VIỆC TAY CỦA HENRY (chưa xong)
- [x] Chạy `_patches/migration-app-config.sql` trong Supabase SQL Editor (project `dciwkfdqhhddeymlisey`). ✅ ĐÃ CHẠY 2026-06-22 (bảng `app_config` + 5 seed). Giờ chỉnh prompt/model/giá Lượng trong DB không cần deploy.
- [x] **Bật giá 5 Lượng/lượt trên DB (live):** `UPDATE app_config SET value=to_jsonb(5) WHERE key='chat.cost';`. ✅ ĐÃ CHẠY 2026-06-22 (SELECT thấy 5). `PAYWALL_DISABLED=false` đã xác nhận. Code DEFAULTS=5.
- [x] **Quà signup 25 Lượng** ✅ ĐÃ BẬT 2026-06-22. Thực tế prod đã có sẵn trigger `on_auth_user_created` → hàm `handle_new_user_signup()`; đã `CREATE OR REPLACE` đổi 10→25 (verify `pg_get_functiondef` = 25). File repo `_patches/migration-signup-bonus.sql` đã sửa khớp (PR #88).
- [ ] **Telegram bot (PR kênh đầu tiên):** sau merge → (a) thêm env trên Vercel `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` rồi Redeploy; (b) chạy `_patches/migration-telegram-sessions.sql`; (c) Claude đăng ký webhook (`setWebhook` + secret) rồi test nhắn bot.
- [ ] **Telegram ↔ ví Lượng (monetize hướng 1 — đang làm trên branch `claude/tuviminhbao-resume-tf8tcq`):** sau merge → (a) chạy `_patches/migration-telegram-links.sql` trong Supabase (3 bảng `telegram_links`/`telegram_link_tokens`/`telegram_usage` + RPC `tg_incr_free_usage`); (b) env Vercel (tùy chọn): `TELEGRAM_BOT_USERNAME` (mặc định `tuviminhbao_bot`, để dựng deep link), `TELEGRAM_FREE_DAILY` (mặc định 3 — số lượt free/ngày cho user CHƯA link); (c) test: web Hồ sơ→Credits→"Liên kết Telegram" → mở bot → /start token → nhắn bot thấy trừ Lượng đúng ví; user lạ chưa link xài hết 3 lượt/ngày thì bot mời liên kết.
- [ ] Test preview sau mỗi lần deploy.
- [ ] Đăng ký nền tảng Zalo trước Phase 2.

### Quy ước phiên
- Phát triển trên `claude/astrology-app-design-urttcm`. Mỗi việc = 1 PR draft → CI xanh → mark ready → squash-merge → `git reset --hard origin/main` cho branch.
- Push branch sau squash-merge cần `--force-with-lease` (remote còn commit cũ).
- `send_later` có thể không có trong phiên → re-check PR thủ công khi có webhook.

---

## 🗄️ Track cũ (song song) — ISR Lá Số SEO (438K pages)

> Nhánh khác, không phải việc chat-first hiện tại. Giữ để tham khảo.

**Branch:** `claude/serene-elion-e060cc`  
**Status:** 24-section template DONE (commit c5dbc8a), sẵn sàng deploy + test

### Slug format
```
/la-so/{can-chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi-tinh}-{namXem}
ví dụ: /la-so/canh-ngo-03-06-1998-gio-suu-nam-2027
```

### Kiến trúc: ISR compute on-demand
- `app/la-so/[slug]/route.ts`: parse slug → loadEngine() → compute → HTML → cache CDN vĩnh viễn
- Priority: laso_public → laso_pregen → **ISR compute** → redirect
- Fix quan trọng: module-level `globalThis.location` mock (3 files) để tránh Next.js URL crash sau khi engine set `globalThis.window = globalThis`

### Discovery path
```
Homepage → /menh-kho.html → /menh-kho/[year] → /menh-kho/[year]/[mm-dd] → /la-so/[slug]
```

### Files đã làm trên branch
- `app/la-so/[slug]/route.ts` — ISR compute (parseIsrSlug + loadEngine + renderGrid + renderTextBlocks + buildIsrHTML)
- `app/menh-kho/[year]/route.ts` — Calendar hub 50 năm (1960–2010)
- `app/menh-kho/[year]/[day]/route.ts` — Day hub, 24 cards (12 giờ × 2 giới)
- `app/van-han/route.ts` — Hub page 12 chi × 3 năm
- `app/van-han/[slug]/route.ts` — Level 1 (tuoi-[chi]-nam-[year]) + Level 2 (can-chi-nam-year)
- `app/api/og/laso/route.tsx` — Enhanced OG image edge (1200×630)
- `app/api/admin/sample-laso/route.ts` — Admin preview page
- `public/llms.txt` — AEO: describe tool for LLM crawlers
- `public/robots.txt` — Allow AI bots (GPTBot, ClaudeBot, PerplexityBot...)
- `public/index.html` — SoftwareApplication JSON-LD schema

### ✅ DONE: 24-section template content (commit c5dbc8a)
Đã thêm `render24Sections(ls, params)` vào route.ts — 420 lines template logic.

**Sections đã build:**
```
1.  Tổng quan (cung mệnh, nạp âm, cục, cách cục tóm tắt)
2-13. 12 cung (major stars, sat tinh, cachCucTungCung tags, miniScoreBars)
14. Cách cục chi tiết (moTa per cach cuc)
15. Đại vận hiện tại (scoring + DV timeline)
16. Tiểu vận năm namXem (mainScore, direction, satCount)
17. Điểm mạnh (top 3 cung by avg score)
18. Điểm cần cải thiện (bot 3 cung by avg score)
19. Tứ Hóa phân tích (Lộc/Quyền/Khoa/Kỵ position)
20. Thần sát (Kình/Đà/Hỏa/Linh/Không/Kiếp per cung)
21. Tuần/Triệt ảnh hưởng
22. Vận năm namXem tổng hợp (DV + TV combined)
23. Dự phóng năm namXem+1
24. Tổng kết và lời khuyên
```

### 🔴 Bước tiếp theo: Deploy + test
1. Deploy branch lên Vercel
2. Test `/la-so/canh-ngo-03-06-1998-gio-suu-nam-2027` — verify 24 sections render
3. Check word count: mỗi page có ≥3000 chữ unique

### Test case
- `/la-so/canh-ngo-03-06-1998-gio-suu-nam-2027` ✅ đang work trên localhost:3000
- Engine output: Mậu Dần, Cung Mệnh Cự Môn, điểm 7.3/10, 4 cách cục

### NAM_XEM
- Hardcode 2027 trong `menh-kho/[year]/[day]/route.ts` (line: `const NAM_XEM = 2027`)
- Update hằng năm thủ công

---

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
