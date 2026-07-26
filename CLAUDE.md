# CLAUDE.md — Context cho Claude Code

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 14, Supabase, Vercel)

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

### CÒN LẠI
- Bật `enabled=true` sau deploy (câu SQL ở trên).
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
