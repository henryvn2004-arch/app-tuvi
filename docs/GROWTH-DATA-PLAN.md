# Growth Data Plan — Thu thập · Phân tích · Phân phối

**Trạng thái:** BẬC 0→6 ĐÃ CODE XONG (bậc 0 vẫn treo — việc tay Henry) · **Ngày cập
nhật:** 2026-09-15
**Thay thế:** Windsor.ai (kéo GA4/Clarity/FB Ads/Google Ads — không ổn định, tốn phí,
và KHÔNG hề nối vào bất cứ nguồn nào trong repo)
**Người đọc kết quả:** Telegram (`cmo-digest`, đã nối bậc 6a) · **Marketing
orchestrator** (CHƯA có code trong repo — `lib/marketing/orchestrator.ts` không tồn
tại, chỉ có đề xuất chưa chốt scope ở `docs/COO-ORCHESTRATOR-SCOPE.md`; đọc
findings qua `getLatestGrowthFindings()`, IMPORT thẳng, khi nào orchestrator được
code) · `anomaly-alerts` (đã nối bậc 6c) · `autopilot` (KHÔNG nối — hành động
trên tài khoản ads nằm ngoài phạm vi B, xem §8)

Bậc 1-3 (thu thập) landed ở PR #868. Bậc 4-6 (engine + findings +
phân phối) landed ở PR này — xem `docs/nhat-ky/2026-09.md` mục tương ứng cho
diễn biến/số đo/bẫy. File này giữ nguyên vai trò MỤC LỤC + THIẾT KẾ, không lặp
lại nhật ký.

---

## 0. Vì sao không dùng Windsor.ai / Airbyte / dlt

- **Windsor.ai**: đang trả phí, tự báo unstable, và `grep -ri windsor` ra 0
  kết quả trong repo — nó đứng NGOÀI hệ thống, không nối được với
  `credit_transactions`/`tool_pricing`/`events` nội bộ. Đổi nguồn kéo GA4
  không giải quyết được vấn đề THẬT: cần NỐI ads spend với phễu nội bộ.
- **Airbyte OSS**: có connector GA4/Google Ads/Meta, nhưng đòi một máy chủ
  luôn bật (Docker, ~4GB RAM) — đẻ thêm hoá đơn trong khi mục tiêu là cắt.
- **dlt (dlthub)**: nhẹ hơn nhưng là Python; repo thuần TypeScript/Next trên
  Vercel, nuôi thêm runtime là chi phí vận hành không cần thiết.
- **Cả hai đều không có connector Microsoft Clarity** — kiểu gì cũng phải tự
  viết một nguồn.
- **Repo đã có sẵn khuôn tự kéo GA4 + Search Console chạy prod** (service
  account JWT tự ký, không cần thư viện `googleapis`) — `lib/analytics/
  google-auth.ts` + `ga4.ts` + `search-console.ts`. Thêm 3 nguồn nữa là đi
  tiếp một con đường đã mở, không phải mở đường mới.

**Kết luận: tự viết trong repo. Chi phí vận hành thêm = $0.**

---

## 1. Nguyên tắc thiết kế (rút từ luật ĐÃ CÓ trong repo, không phải bịa mới)

| Nguyên tắc | Gốc |
|---|---|
| Số do CODE tính, LLM chỉ kể lại | `CLAUDE.md` — "Engine là nguồn số duy nhất, LLM không được tính lại" |
| Một nguồn cho một sự việc — không dựng bộ não thứ 2 tự tính lại | `docs/coo-daily-routine-prompt.md` §"Đảo luật" |
| Đọc số = fail-open (lỗi → null, không kéo sập) · Phát tiền/hành động = fail-closed | `docs/luat/tien.md` |
| Mọi GET Supabase `cache:'no-store'` | `docs/luat/tien.md` — đã cắn 3 lần |
| Cron mới phải vào `lib/ops/jobs.ts` | `npm run check:jobs` gác |
| Payload gửi rail phải PHẲNG | `check:railfields` |
| Doanh thu/chi phí theo tool đã có nguồn — KHÔNG tính lại | `lib/marketing/tool-profit.ts` (PR #865) |

Hệ quả cụ thể: luật *"chỉ nêu % khi mẫu ≥ 30 ở cả hai kỳ"* hiện nằm trong
PROMPT của `cmo-digest.ts` — không được typecheck bắt. Plan này chuyển
luật đó xuống CODE: engine trả `"insufficient_sample"` thay vì một con số %
để LLM tự kiềm chế.

---

## 2. Bản đồ 5 tầng

```
T1 THU THẬP   GA4 · GSC · Clarity · Meta Ads · Google Ads  ──┐
                                                             ├─→ ext_metrics_daily
T2 NỐI        ads spend ⨯ funnel nội bộ (theo campaign)    ──┘     campaign_daily (view)
T3 ENGINE     CAC · CPA từng bậc · ROAS · biên đóng góp (từ tool-profit.ts)
              WoW + cổng mẫu nhỏ trong code
T4 PHÁN ĐOÁN  → marketing_insights: findings có severity + bằng chứng + đề xuất
T5 PHÂN PHỐI  ├── Telegram (cmo-digest, giữ giờ/đường ra hiện tại)
              ├── Marketing orchestrator (PR #865) — IMPORT thẳng trong code,
              │   KHÔNG qua MCP, KHÔNG qua API mới (đã xác nhận: orchestrator
              │   là code chạy trên Vercel cùng repo, không phải agent ngoài)
              ├── anomaly-alerts (đọc findings severity='act', bỏ tự suy ngưỡng thô)
              └── autopilot (shadow/live, kill switch + cooldown ĐÃ CÓ, giữ nguyên)
```

**Điểm mấu chốt đã đổi so với bản nháp đầu:** orchestrator không phải một
session/agent ngoài cần hợp đồng API riêng. Nó là code trong CHÍNH repo này
(xem PR #865 — `lib/marketing/tool-profit.ts`, sẽ mở rộng thành
`lib/marketing/orchestrator.ts`). Đọc `marketing_insights` bằng một `fetch`
Supabase REST y hệt mọi module khác trong `lib/marketing/` — không cần
`/api/v1/insights`, không cần token mới. Bậc 6 vì thế rẻ hơn bản nháp đầu.

---

## 3. Tầng 1 — Thu thập

| Bậc | Nội dung | Việc tay Henry |
|---|---|---|
| **0** | **Link GA4 ↔ Google Ads** trong GA4 Admin → Product Links. Đã đo: `advertiserAdCost=0`, campaign `(not set)` dù 1.603 phiên `google/cpc` thật trong 30 ngày — link chưa bật. Bật xong GA4 Data API trả thẳng `googleAdsCampaignName/Id`, `advertiserAdCost/Clicks/Impressions` bằng ĐÚNG credential đang có, không code mới. | 10 phút, miễn phí |
| **1** | Bảng `ext_metrics_daily` (schema §4) + cron kéo GA4 sessions/traffic + GSC snapshot mỗi ngày | — |
| **2** | Microsoft Clarity Data Export API — rage click, dead click, scroll depth | Lấy API token ở Clarity Settings |
| **3** | Meta Ads Insights (`/act_<id>/insights`) — GA4 chỉ thấy campaign ID thô, không có tên/chi phí đáng tin; chi phí FB bắt buộc lấy trực tiếp | Tạo System User token quyền `ads_read` |

Google Ads API trực tiếp (bậc 7 cũ) **KHÔNG nằm trong phạm vi B** — chỉ làm
nếu link GA4↔Ads (bậc 0) không đủ chi tiết (vd cần keyword-level).

### Giới hạn phải mã hoá vào code, không phải nhớ tay
- **Clarity: tối đa 10 request/project/ngày, dữ liệu chỉ 1–3 ngày gần nhất,
  tối đa 1.000 dòng/request, không phân trang.** ⇒ đúng 1 lượt gọi/ngày,
  KHÔNG retry bừa khi lỗi; hỏng thì ghi `no_data`, đợi ngày mai.
- **GSC trễ 2–3 ngày** — cửa sổ kết thúc trước 3 ngày (đã đúng convention của
  `getSearchConsoleSnapshot`).
- **Google Ads auto-tagging gắn `gclid`, KHÔNG gắn UTM** — `track.js` đã tự
  suy `utm_source=google&utm_medium=cpc`, engine T2 phải đi theo đúng đường
  đó, không tự dò UTM.
- **Tiền tệ ad account lưu kèm dòng, không mặc định VND.**

---

## 4. Tầng 2 — Nối (chỗ khó thật, Windsor không làm được)

```sql
create table if not exists public.ext_metrics_daily (
  source     text not null,   -- 'ga4' | 'gsc' | 'clarity' | 'meta_ads' | 'google_ads'
  entity     text not null,   -- campaign id / url / kênh / '_total'
  stat_date  date not null,
  metrics    jsonb not null default '{}'::jsonb,  -- {cost_vnd, cost_currency, clicks, impressions, sessions, ...}
  dims       jsonb not null default '{}'::jsonb,  -- {campaign_name, source_medium, ...}
  fetched_at timestamptz not null default now(),
  primary key (source, entity, stat_date)
);
```

Cùng khuôn với `content_metrics` đã có (`_patches/migration-content-metrics.sql`)
— snapshot theo ngày, khoá chính chặn ghi trùng, KHÔNG suy hiệu số tự động
(cost là số ngày, không phải luỹ kế như view YouTube).

`campaign_daily` (view, KHÔNG phải bảng) nối `ext_metrics_daily` với phễu
nội bộ:

```sql
create view public.campaign_daily as
select
  coalesce(ads.entity, funnel.campaign_id)       as campaign_id,
  coalesce(ads.stat_date, funnel.stat_date)       as stat_date,
  ads.metrics->>'cost_vnd'                        as spend_vnd,
  funnel.visitors_human, funnel.tool_run, funnel.signup, funnel.purchase,
  funnel.revenue_vnd
from ext_metrics_daily ads
full outer join <funnel theo gclid/campaign id qua anon_id> funnel
  on ads.entity = funnel.campaign_id and ads.stat_date = funnel.stat_date;
```

**Khoá join** — đã có tiền lệ đúng trong `docs/nhat-ky/2026-09.md` mục
"Google Ads có traffic thật, 0 sign up": tách visitor theo `gad_campaignid`,
join `events` theo `anon_id`. Engine đi lại đúng đường đó.

**Luật cứng:** dòng nào không nối được PHẢI rơi vào `campaign_id='unattributed'`
hiện rõ trong output — cấm âm thầm bỏ. Chi phí biến mất khỏi mẫu số là cách
nhanh nhất để ROAS đẹp giả.

---

## 5. Tầng 3 — Engine (`lib/growth/engine.ts`, thuần code, test bằng vitest)

**KHÔNG tính lại doanh thu/chi phí/lợi nhuận theo tool** — gọi thẳng
`lib/marketing/tool-profit.ts` (đã có, PR #865). Engine chỉ cộng thêm biến
ads spend mà tool-profit chưa biết.

| Chỉ số | Công thức | Mẫu số PHẢI dùng |
|---|---|---|
| CAC | spend ÷ signup thật | `signupTruth.accounts` (đếm thẳng `auth.users`) — KHÔNG `funnel.signups` (qua attribution, hụt được) |
| CPA từng bậc phễu | spend ÷ {visitor, tool_run, paywall, purchase} | bản `_human`, KHÔNG bản thô (83% "visitors" là máy — `docs/luat/bay.md`) |
| ROAS | revenue_vnd ÷ spend_vnd | revenue đọc `credit_transactions` qua `tool-profit.ts`, không tự quy đổi |
| Biên đóng góp có ads | (đã có từ `tool-profit.ts`) − spend phân bổ theo campaign | |
| Hoà vốn | thay ô "Ngân sách Ads/ngày" đang gõ tay ở `admin.html:504` | |
| Chất lượng landing | rage/dead click + scroll depth (Clarity) | |

**Cổng mẫu nhỏ nằm trong code, không nằm trong prompt:** mọi hàm so kỳ trả

```ts
{ value: number, prev: number, delta_pct: number | null, verdict: 'ok' | 'insufficient_sample' }
```

`delta_pct = null` khi n < 30 ở BẤT KỲ kỳ nào (giữ đúng ngưỡng hiện có trong
`cmo-digest.ts` SYSTEM_PROMPT, chỉ chuyển vị trí thực thi). LLM ở tầng 5
không nhìn thấy con số % đó để mà lỡ nói ra khi mẫu quá mỏng.

**Đường tiền:** chi phí ads đi một cột RIÊNG. Tuyệt đối không chảy vào
`credit_vnd()` hay `dashboard_margin` gốc — trộn vào là hỏng đúng đường
tiền, và hỏng im lặng (đúng lớp lỗi `docs/luat/tien.md` đã cảnh báo).

---

## 6. Tầng 4 — Findings (`marketing_insights`)

Orchestrator không cần một đống số, nó cần MỘT DANH SÁCH VIỆC có bằng chứng:

```sql
create table public.marketing_insights (
  run_date         date not null,
  finding_key      text not null,      -- 'campaign_cac_spike:24193406379'
  severity         text not null,      -- info | watch | act
  confidence       text not null,      -- solid | thin_sample | no_data
  headline         text not null,      -- 1 câu tiếng Việt, số đã chốt
  metrics          jsonb not null,     -- số KÈM mẫu số n
  evidence         jsonb not null,     -- nguồn + khoảng ngày + n
  suggested_action text,               -- theo đúng vocabulary autopilot.ts
  primary key (run_date, finding_key)
);
```

Ví dụ thật, dựng lại từ số đã đo trên prod hôm nay:

```json
{ "finding_key": "campaign_zero_conversion:24193406379",
  "severity": "act", "confidence": "solid",
  "headline": "Campaign 24193406379: 140 khách, 0 lượt chạy thử tool (0%), bounce 77.9%",
  "metrics": { "visitors_human": 140, "tool_run": 0, "bounce_pct": 77.9 },
  "evidence": { "source": "ga4+events", "window": "2026-08-16..2026-09-15", "n": 140 },
  "suggested_action": "pause_campaign" }
```

`suggested_action` dùng ĐÚNG bộ từ vựng `AutopilotActionType` của
`lib/marketing/autopilot.ts` (`price_adjust` | `promo_grant` | `segment_nudge`)
cộng bộ mới cho ads (`pause_campaign` | `shift_budget`) — đề xuất và hành
động nói cùng ngôn ngữ, không phải dịch qua lại.

---

## 7. Tầng 5 — Phân phối cho 4 người đọc

**(a) Telegram (`cmo-digest`)** — giữ nguyên giờ/đường ra. Đổi input: nhồi
mảng `findings` đã tính xong thay vì snapshot 14-RPC thô. Chữ ra chắc hơn
(số đã chốt, model chỉ diễn đạt), token vào giảm.

**(b) Marketing orchestrator (PR #865)** — IMPORT thẳng, không MCP không API
mới (đã xác nhận §2). Việc của bậc 6 chỉ là: cron ghi `marketing_insights` +
1 dòng `events(event_type='growth_insight')`, và orchestrator (khi build tới
phần đọc dữ liệu) gọi hàm đọc bảng đó — cùng pattern `callRpc`/`fetch` các
module `lib/marketing/*` khác đang dùng.

**(c) `anomaly-alerts`** — đọc `marketing_insights` where `severity='act'`
thay vì tự suy ngưỡng từ RPC thô. Giữ nguyên cooldown trong `app_config`.

**(d) `autopilot`** — nhận findings làm đầu vào, giữ NGUYÊN XI kỷ luật đã có:
`marketing.autopilot_enabled` mặc định false, khoá phụ từng loại, shadow-mode
ghi `autopilot_actions` + Telegram prefix 🧪 trước khi live, cooldown.

---

## 8. An toàn — dòng quan trọng nhất của plan này

🔴 **Orchestrator CHỈ ĐỌC `marketing_insights`. Mọi hành động chạm
tiền/khách phải đi qua `autopilot_actions` với công tắc + shadow-mode đã
có.** Lý do: cho orchestrator ghi thẳng vào giá/khuyến mãi là dựng một
đường tiền không có cầu dao — trái luật `docs/luat/tien.md`. Ba vai rõ
ràng: orchestrator ĐỀ XUẤT → `autopilot` THỰC THI (sau khi qua khoá) →
`autopilot_actions` GHI SỔ.

Hành động trên tài khoản quảng cáo (pause campaign, đổi ngân sách ads) — nằm
NGOÀI phạm vi B, chỉ bàn sau khi mọi thứ trên chạy ổn, và mặc định là ĐỀ
XUẤT cho Henry bấm, không tự pause.

⚠️ **Phát hiện quan trọng cần Henry biết trước khi bật orchestrator tự trị:**
Pha 0 (PR #865) đo biên gộp 30 ngày ~31% KHÔNG hề trừ chi phí ads (1.603
phiên `google/cpc` + 404 phiên `fb/paid` đang chi tiền thật, 0 đồng nằm
trong bất kỳ sổ nào). Một orchestrator tối ưu lợi nhuận bật lên lúc này sẽ
tối ưu một con số thiếu mất biến chi phí lớn nhất — nên tầng thu thập ads
(bậc 0-3) PHẢI đi trước khi orchestrator chuyển sang "tự trị", không chạy
song song.

---

## 9. Lộ trình đã chốt (phạm vi B: bậc 0→6)

| Bậc | Nội dung | Trạng thái |
|---|---|---|
| **0** | Link GA4 ↔ Google Ads | 🔴 TREO — việc tay Henry, chưa làm |
| **1** | `ext_metrics_daily` + cron + GA4/GSC | ✅ PR #868 |
| **2** | Clarity | ✅ Field VERIFY xong bằng response thật (2026-09-16) — Traffic/RageClick/DeadClick/ScrollDepth đã parse |
| **3** | Meta Ads Insights | 🔴 TREO — token thiếu quyền `ads_read` thật (lỗi 400 `#100`), việc tay Henry: gán ad account cho System User RỒI mới generate token |
| **4** | `campaign_funnel_daily` RPC + `lib/growth/engine.ts` (gọi `tool-profit.ts`) | ✅ PR này — KHÔNG có vitest (repo không có vitest ở root, xem nhật ký) |
| **5** | `marketing_insights` + `lib/growth/findings.ts` + cron `growth-insights` (06:00 VN) | ✅ PR này |
| **6** | Telegram (cmo-digest, additive) · anomaly-alerts (additive) đã nối. Orchestrator import: chưa có gì để nối (orchestrator chưa code). Autopilot: cố ý KHÔNG nối (§8) | ✅ PR này (2/4 người đọc thật, 2 còn lại out-of-scope/chưa tồn tại) |

Bậc 7 (Google Ads API trực tiếp) — NGOÀI phạm vi B, chỉ làm nếu bậc 0 không
đủ chi tiết (cần keyword/search-term level).

Chi phí vận hành thêm: **$0**. Token LLM cho digest có khả năng GIẢM vì
digest thôi nuốt snapshot thô.

---

## 10. Bẫy đã gài sẵn trong thiết kế (đọc trước khi code từng bậc)

- `cache:'no-store'` trên MỌI GET Supabase — `anomaly-alerts.ts` đã cắn thật.
- Cron mới bắt buộc khai vào `lib/ops/jobs.ts`, `npm run check:jobs` gác.
- Payload gửi rail phải PHẲNG — `extractGenericContext` bỏ im lặng mọi giá
  trị là object (`check:railfields`).
- Clarity 10 request/ngày ⇒ đúng 1 lượt/ngày, hỏng thì `no_data`, không retry.
- GSC trễ 2–3 ngày ⇒ cửa sổ kết thúc trước 3 ngày.
- Tiền tệ ad account lưu kèm dòng, không mặc định VND.
- Chi phí ads đi cột riêng, không chảy vào `credit_vnd()`/`dashboard_margin` gốc.
- Doanh thu/chi phí theo tool: gọi `tool-profit.ts`, không tính lại.
- Orchestrator đọc sớm hơn cron thì phải xem đồng hồ trước, đọc số sau —
  routine CMO đã bắn oan sáng 07/08 vì đúng chuyện này.
- Dòng không nối được (ads ⨯ funnel) phải hiện `unattributed`, cấm âm thầm bỏ.
