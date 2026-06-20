# Kiến Trúc & Lộ Trình — Tử Vi Minh Bảo (Chat-first, đa nền tảng)

> Tài liệu xương sống. Mọi quyết định code đều quy chiếu về đây.
> Cập nhật: 2026-06-20. Branch: `claude/astrology-app-design-urttcm`.

---

## ⏳ VIỆC TAY CẦN LÀM (chưa xong)

- [ ] **Chạy `_patches/migration-app-config.sql`** trong Supabase SQL Editor
      (project `dciwkfdqhhddeymlisey`). Tạo bảng `app_config` + seed prompt/model/cost.
      Cho tới khi chạy, `/api/v1/chat` vẫn hoạt động bằng giá trị DEFAULTS (miễn phí).
      → Henry chạy khi rảnh. Nhắc lại mỗi phiên cho tới khi tick.

---

## 0. Tầm nhìn một câu

> **Một "bộ não" duy nhất trên server. Mọi nền tảng (Web → Zalo → TikTok → Android → iOS → bot chat) chỉ là vỏ mỏng gọi về cùng một API. Sửa 1 chỗ, tất cả app cập nhật theo.**

Interface chính = **chat**. Người dùng gõ tự nhiên ("Nữ 1998 năm nay làm ăn sao?"), agent tự chọn tool (lá số / vận hạn / phong thủy / tra cứu sách) rồi luận giải. LLM **không bao giờ tự bịa số liệu** — chỉ luận trên JSON do engine deterministic trả về. Đây là lợi thế tin cậy so với "ChatGPT bói toán" trôi nổi.

---

## 1. Hiện trạng (đã rà soát 2026-06-20)

### Đã có — tài sản tái dùng được

| Lớp | Hiện trạng | Vị trí |
|---|---|---|
| **Engine tính toán** | An sao, lập cục, đại/tiểu vận, scoring, ngày tốt. Pure TS, có vitest. | `tuvi-engine/` (`anSaoLaSo`, `tinhDaiVan`, `scoreDaiVan`, `ngay-tot`) |
| **Agent loop (một phần)** | `/api/lasotuvi` ĐÃ có tool-use: `buildTools`, `execTraVanHan/NguyetVan/NhatVan`, `execXemNgayTot`, `callAnthropic(...tools)`, `handleChatStream` (SSE). 7 scenario prompt. | `app/api/lasotuvi/route.ts` (1233 dòng) |
| **LLM nghiệp vụ khác** | Tứ trụ, phong thủy, tướng mặt (ảnh/multimodal), xem tuổi/chọn ngày/đặt tên. Đều gọi Claude `sonnet-4-6`. | `api/tubinh`, `api/phong-thuy`, `api/tuong-mat`, `api/xem-tuoi` |
| **RAG / tri thức** | Embed + search trên sách tử vi. | `api/embed`, `api/search`, `chunks_all.json`, `/sach` |
| **Chat persistence** | Lưu hội thoại theo user. | `api/tuvi-chats` → bảng `tuvi_chats` |
| **Auth** | Supabase Auth (email + Google OAuth). Client giữ `access_token`, gửi Bearer. | `public/auth.js` |
| **Thanh toán / paywall** | Mô hình **tín dụng trả theo lượt** (`user_credits.balance`, `credit_transactions`). Cổng **PayOS** (bank VN) + **PayPal**. Cờ `PAYWALL_DISABLED`. | `api/payment`, `api/bank-webhook` |
| **Chat UI (web)** | `public/tuvi-chat.html` (2724 dòng): sidebar, sync, stream SSE, TTS, đa toolType. | `public/tuvi-chat.html` |
| **SEO/ISR** | ~438K trang lá số tĩnh — phễu traffic chính. | `app/la-so`, `menh-kho`, `van-han` |
| **QC/CI** | 5 workflow GitHub Actions (lint, unit, e2e, smoke, lighthouse). | `.github/workflows` |

### Vấn đề kiến trúc cần sửa (cái "bẫy fat client")

1. **Lá số tính ở client** (`slimLaso`, `formatLaSoV2` trong `tuvi-chat.html`) rồi mới gửi `lasoData` lên API → mỗi nền tảng mới phải code lại logic này.
2. **Logic rải rác client ↔ server**: chọn scenario/toolType, prompt-shaping, paywall nằm cả ở client.
3. **Chưa có contract versioned**: app native sau này không hot-update được, cần API ổn định, đánh version.
4. **Nhiều route LLM trùng vai** (`lasotuvi`, `xem-tuoi`, `tubinh`...) — nên hợp nhất sau một cổng agent.

### Bảng Supabase đang dùng
`laso_public`, `xem_tuoi_cache`, `tuvi_chats`, `chat_history`, `tuong_readings`, `push_subscriptions`, `shared_chats`, `purchases`, `user_credits`, `credit_transactions`, `bank_orders`.

### Biến môi trường đang dùng
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (embed), `REPLICATE_API_KEY`, Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_*`), PayOS (`PAYOS_*`), PayPal (`PAYPAL_*`), `ADMIN_*`, `CRON_SECRET`, `PAYWALL_DISABLED`.

---

## 2. Kiến trúc đích

### Mô hình: Headless brain + thin clients (nhà hàng có 1 bếp)

```
        ┌──────────── BỘ NÃO (server — nguồn chân lý duy nhất) ────────────┐
        │  /api/v1/chat   (agent loop, SSE streaming)                       │
        │   ├─ Tool layer (in-process, gọi engine + nghiệp vụ)             │
        │   │    lap_la_so · tinh_van_han · xem_ngay_tot · lap_tu_tru      │
        │   │    phong_thuy · xem_tuong_mat · tra_cuu_tri_thuc · luu/tai   │
        │   ├─ Prompt + scenario  (đọc từ DB config — đổi không cần deploy)│
        │   ├─ Paywall / quota    (kiểm tra credit theo user)             │
        │   └─ Model + feature flags (DB config)                          │
        └───────────────────────────────┬──────────────────────────────────┘
                                         │  CONTRACT JSON/SSE versioned (v1)
        ┌──────────┬──────────┬──────────┼──────────┬──────────┬───────────┐
        ▼          ▼          ▼          ▼          ▼          ▼           ▼
       Web       Zalo      TikTok     Android      iOS      Zalo OA     Telegram
    (thin)    Mini App     Mini    (Capacitor)  (Capacitor)  bot         bot
     vỏ         vỏ          vỏ        vỏ           vỏ        adapter     adapter
```

### Nguyên tắc bất di bất dịch

1. **Client không chứa logic nghiệp vụ.** Tính toán, prompt, paywall, chọn tool → đều server. Client chỉ: render chat, stream, auth, thu input.
2. **Một contract duy nhất, đánh version** (`/api/v1/chat`). **Chỉ thêm, không phá** (additive). App cũ trên máy user vẫn chạy.
3. **Thứ đổi thường xuyên → DB config** (prompt, model, giá, flags) để chỉnh không cần deploy. **Thứ là code → 1 repo này**, deploy 1 lần áp cho tất cả.
4. **SEO ISR giữ nguyên** — đó là phễu traffic. Chat là lớp giữ chân/chuyển đổi, không thay SEO. Trang lá số tĩnh có nút "Hỏi sâu hơn" → mở chat với lá số nạp sẵn.
5. **WebView-first** cho mọi app: iOS/Android/Zalo/TikTok đều bọc cùng web chat → sửa web là app theo, không chờ store duyệt. Chỉ viết native cho thứ cần phần cứng (push, IAP, camera).

### Contract `/api/v1/chat` (bản phác — sẽ chốt ở Sprint 1)

**Request** (`POST /api/v1/chat`):
```jsonc
{
  "session_id": "uuid",          // để lưu/nối hội thoại
  "messages": [                  // lịch sử hội thoại (chỉ role+content)
    { "role": "user", "content": "Nữ 1998 dương lịch, giờ Sửu, năm nay sao?" }
  ],
  "stream": true,
  "client": { "platform": "web|zalo|tiktok|android|ios", "version": "1.0.0" }
}
```

**Response — SSE events** (mọi nền tảng đọc chung 4 loại event):
```
event: status     data: {"text":"Đang lập lá số..."}        // tiến trình cho UX
event: tool_call  data: {"name":"lap_la_so","args":{...}}    // minh bạch agent làm gì
event: text       data: {"delta":"..."}                       // luận giải, stream từng phần
event: done       data: {"usage":{...},"tools_used":[...],"paywall":{...}}
```

Lý do tách event: app native không hot-update vẫn parse được; thêm event mới = thêm `event:` lạ mà client cũ bỏ qua → không vỡ.

### Lá số tính ở đâu? → **Server.**
Client gửi tham số sinh (ngày/giờ/giới tính/dương-âm lịch). Tool `lap_la_so` gọi `tuvi-engine` server-side. Mọi nền tảng ra **cùng một lá số**, không sợ client cũ tính sai. Token LLM **không tăng** (token tính trên nội dung gửi model, không phải nơi chạy code); compute tăng không đáng kể (engine chạy mili-giây).

---

## 3. Cái gì để ở đâu (để "update 1 chỗ" thật sự hiệu lực)

| Muốn chỉnh | Để ở | Áp dụng cho app nào | Cần deploy? |
|---|---|---|---|
| Prompt, giọng văn, luật luận | Bảng DB `app_config` (đọc runtime) | TẤT CẢ | Không |
| Model, max_tokens, quota, giá, bật/tắt feature | Bảng DB `app_config` / feature flags | TẤT CẢ | Không |
| Tool logic, engine, scoring, contract | Code repo này | TẤT CẢ | 1 lần (Vercel) |
| Giao diện chat (UI) | 1 web (các app dùng WebView) | TẤT CẢ webview | Không (web tự tải) |
| Tính năng phần cứng (push/IAP/camera) | Vỏ native từng store | App đó | Có (build + duyệt store) |

---

## 4. Lộ trình nền tảng + Checklist ĐĂNG KÝ để publish

> Phần này trả lời thẳng câu "tao cần đăng ký gì mới publish được". **Đây là việc của MÀY (con người) — tao không làm hộ được vì cần danh tính/giấy tờ/thẻ thanh toán của mày.**

### Thứ tự ra mắt (đã chốt theo yêu cầu)
**Web (+ PWA) → Zalo → TikTok Mini → Android → iOS**, rải thêm bot chat lúc nào cũng được.

### 4.1 Web + PWA — *ra trước, gần như không cần đăng ký gì mới*
- ✅ Đã có domain `tuviminhbao.com`, Vercel, `manifest.json`, `pwa-install.js`, push.
- **Việc của mày:** không có gì bắt buộc mới. (Tùy chọn: bật Web Push cần tạo VAPID keys — tao hướng dẫn được.)
- **Chi phí:** 0 thêm.

### 4.2 Zalo — *2 sản phẩm khác nhau, nên làm cả hai*
**(a) Zalo Official Account (OA) — bot chat trong Zalo**
- **Đăng ký:** tài khoản **Zalo Official Account** tại `oa.zalo.me` → cần **giấy phép kinh doanh hoặc CMND/CCCD** để xác minh OA.
- **Zalo Developer App** tại `developers.zalo.me` để lấy webhook + OA token.
- **Duyệt:** Zalo duyệt OA (vài ngày). Bot cần tuân chính sách nội dung.
- **Chi phí:** OA cơ bản miễn phí; gói nâng cao (gửi tin chủ động nhiều) có phí.

**(b) Zalo Mini App — app chạy trong Zalo**
- **Đăng ký:** Zalo Mini App tại `mini.zalo.me` (cần OA + tài khoản developer ở trên).
- **Yêu cầu:** xác minh doanh nghiệp, tuân chính sách Mini App, qua review của Zalo.
- **Kỹ thuật:** Mini App dùng framework riêng của Zalo (zmp) — vỏ mỏng gọi `/api/v1/chat`. Đăng nhập qua Zalo (không phải Supabase Google).
- **Chi phí:** miễn phí đăng ký; cần pháp nhân/giấy tờ.

### 4.3 TikTok Mini (TikTok Developers)
- **Đăng ký:** `developers.tiktok.com` → tạo developer account + app.
- **Lưu ý:** hệ "mini app"/"instant page" của TikTok khác nhau theo khu vực; ở VN khả dụng hạn chế hơn — **cần kiểm chứng lại tại thời điểm làm** (ghi chú: rủi ro chính sách khu vực).
- **Duyệt:** TikTok review nghiêm về nội dung (tâm linh/bói toán có thể bị soi). Chuẩn bị mô tả "giải trí/tham khảo văn hóa".
- **Chi phí:** đăng ký developer miễn phí.

### 4.4 Android — *Capacitor bọc web*
- **Đăng ký:** **Google Play Developer** — `play.google.com/console` → **phí 25 USD một lần** (trọn đời). Cần thẻ thanh toán quốc tế.
- **Giấy tờ:** từ 2023+ tài khoản cá nhân mới cần **xác minh danh tính** (CMND/CCCD + có thể cần D-U-N-S nếu đăng ký dạng tổ chức).
- **Kỹ thuật:** tao build bằng **Capacitor** từ web → ra file `.aab`. Cần icon, splash, mô tả, ảnh chụp màn hình, chính sách bảo mật (đã có trang `chinh-sach-bao-mat.html`).
- **Kho phụ (tùy chọn, free):** Samsung Galaxy Store, Huawei AppGallery — cùng file, thêm reach ở VN.
- **Chi phí:** 25 USD một lần.

### 4.5 iOS — *cùng Capacitor, khó duyệt nhất nên để cuối*
- **Đăng ký:** **Apple Developer Program** — `developer.apple.com` → **99 USD/năm**. Cần Apple ID + thẻ.
- **Phần cứng bắt buộc:** cần **máy Mac** để build & nộp (hoặc dịch vụ CI như Codemagic/EAS trả phí). Ghi chú: nếu mày không có Mac, đây là rào cản — tính trước.
- **Duyệt App Store khó:** Apple soi kỹ. App bói toán **bắt buộc** ghi rõ "for entertainment purposes". Nếu bán credit trong app, Apple **ép dùng In-App Purchase** (chiết khấu 15–30%) — không được dùng cổng PayOS/PayPal cho nội dung số trong app iOS. **Đây là quyết định kinh doanh lớn**, bàn kỹ trước khi làm iOS.
- **Chi phí:** 99 USD/năm + (có thể) máy Mac/CI.

### 4.6 Bot chat (rải thêm, rất rẻ)
- **Telegram:** tạo bot qua `@BotFather` — miễn phí, 5 phút. Tốt để test agent.
- **Messenger (Facebook):** cần Facebook Page + Meta Developer App + duyệt quyền `pages_messaging`. Miễn phí nhưng duyệt lằng nhằng.

### Bảng tổng hợp chi phí/đăng ký (việc của MÀY)

| Nền tảng | Đăng ký ở | Phí | Giấy tờ/điều kiện | Rào cản chính |
|---|---|---|---|---|
| Web/PWA | (đã có) | 0 | — | Không |
| Zalo OA | oa.zalo.me | Free (gói cơ bản) | GPKD hoặc CCCD | Duyệt OA |
| Zalo Mini App | mini.zalo.me | Free | Pháp nhân + OA | Review Zalo |
| TikTok Mini | developers.tiktok.com | Free | Tài khoản dev | Khả dụng khu vực VN + nội dung |
| Android (Play) | play.google.com/console | **25 USD một lần** | Xác minh danh tính + thẻ | Xác minh tài khoản |
| iOS (App Store) | developer.apple.com | **99 USD/năm** | Apple ID + thẻ + **máy Mac** | Duyệt khó + IAP ép chiết khấu |
| Telegram bot | @BotFather | Free | — | Không |
| Messenger | developers.facebook.com | Free | FB Page | Duyệt quyền |

---

## 5. Roadmap theo Phase & Sprint

> Mỗi Sprint ≈ một lát cắt chạy được. Không làm song song quá nhiều để giữ chất lượng.

### PHASE 0 — Nền tảng "bộ não" (xương sống cho mọi thứ sau)
**Mục tiêu:** có `/api/v1/chat` là cổng agent duy nhất, lá số tính server-side, contract chốt.

- **Sprint 0.1 — Chốt contract + scaffold** *(tao làm)*
  - Viết doc này ✅ + types contract (`lib/contract/v1.ts`): request, SSE events, tool result shape.
  - Scaffold `app/api/v1/chat/route.ts` (SSE skeleton, chưa đủ tool).
  - **DoD:** gọi thử trả về stream `status → text → done` với 1 câu chào.

- **Sprint 0.2 — Tool layer + engine server-side** *(tao làm)*
  - Tạo `lib/tools/` wrap: `lap_la_so` (gọi `tuvi-engine` server-side), `tinh_van_han`, `xem_ngay_tot`, `tra_cuu_tri_thuc` (RAG).
  - Agent loop tool-use đầy đủ (port từ `lasotuvi`), prompt-caching cho lá số JSON.
  - **DoD:** "Nữ 1998 dương lịch giờ Sửu năm nay sao?" → tự lập lá số + luận, có dẫn nguồn. Engine vitest vẫn xanh.

- **Sprint 0.3 — Config hóa prompt + paywall hợp nhất** *(tao làm)*
  - Bảng `app_config` (prompt/model/flags) + `lib/config.ts` đọc runtime, có cache.
  - Chèn kiểm tra credit/quota vào `/api/v1/chat` (tái dùng logic `api/payment`).
  - **DoD:** đổi prompt trong DB → chat đổi giọng không cần deploy. Hết credit → trả event paywall.

### PHASE 1 — Web hoàn thiện (thin client) + PWA
**Mục tiêu:** `tuvi-chat.html` thành vỏ mỏng, web là sản phẩm ra mắt #1.

- **Sprint 1.1 — Lật ruột tuvi-chat** *(tao làm)*
  - Bỏ tính lá số ở client; gọi `/api/v1/chat`; parser SSE 4-event; render `tool_call` thành chip minh bạch ("đang lập lá số").
  - Giữ sidebar/sync/TTS. Xóa logic scenario thừa ở client.
  - **DoD:** web chat chạy 100% qua contract mới; e2e Playwright xanh.

- **Sprint 1.2 — Hợp nhất các tool nghiệp vụ còn lại** *(tao làm)*
  - Thêm tool `lap_tu_tru`, `phong_thuy`, `xem_tuong_mat` (ảnh) vào agent. Gỡ dần các route/trang lẻ (giữ redirect cho SEO).
  - **DoD:** 1 ô chat làm được mọi nghiệp vụ; trang cũ redirect không vỡ SEO.

- **Sprint 1.3 — PWA + đánh bóng** *(tao làm + mày: VAPID/Push tùy chọn)*
  - Kiểm `manifest`, offline, "Add to Home Screen", Web Push (cần VAPID — **mày** tạo keys, tao gắn).
  - Lighthouse ≥ ngưỡng; onboarding hỏi ngày sinh (slot-filling) gọn.
  - **DoD:** cài được lên màn hình chính; Lighthouse PWA pass. **→ RA MẮT WEB.**

### PHASE 2 — Zalo (OA bot + Mini App)
- **Sprint 2.1 — Zalo OA bot** *(tao: adapter; mày: đăng ký OA + token)*
  - `app/api/channels/zalo-oa/route.ts`: webhook Zalo ↔ `/api/v1/chat`. Map user Zalo → session.
  - **Mày làm trước:** đăng ký OA (mục 4.2a), cấp webhook URL + token cho tao.
  - **DoD:** nhắn cho OA → nhận luận giải.
- **Sprint 2.2 — Zalo Mini App** *(tao: vỏ zmp; mày: đăng ký Mini App)*
  - Vỏ Mini App (zmp) nhúng chat, đăng nhập Zalo, gọi `/api/v1/chat`.
  - **Mày làm trước:** đăng ký Mini App (mục 4.2b), pháp nhân.
  - **DoD:** Mini App qua review Zalo, chạy thật. **→ RA MẮT ZALO.**

### PHASE 3 — TikTok Mini
- **Sprint 3.1** *(tao: vỏ; mày: developer account + kiểm khả dụng VN)*
  - **Mày làm trước:** mục 4.3, xác nhận TikTok Mini khả dụng cho VN/loại nội dung.
  - **DoD:** vỏ TikTok gọi contract chạy; qua review. **→ RA MẮT TIKTOK.**

### PHASE 4 — Android (Capacitor)
- **Sprint 4.1 — Capacitor wrap + native glue** *(tao: build; mày: Play account)*
  - Tích hợp Capacitor, push native, (tùy) thanh toán.
  - **Mày làm trước:** Google Play Developer (mục 4.4, 25 USD), chuẩn bị icon/screenshot/mô tả.
  - **DoD:** file `.aab`, nội bộ test pass. **→ RA MẮT ANDROID.**

### PHASE 5 — iOS (Capacitor)
- **Sprint 5.1 — iOS build + IAP decision** *(tao: build; mày: Apple account + Mac + quyết IAP)*
  - **Mày làm trước:** Apple Developer (mục 4.5, 99 USD/năm), có Mac/CI, **quyết định IAP vs paywall ngoài**.
  - **DoD:** qua App Review. **→ RA MẮT iOS.**

### PHASE 6 (rải bất kỳ lúc nào) — Bot phụ + B2B
- Telegram bot (1 buổi), Messenger bot, widget nhúng + API public (doanh thu B2B).

---

## 6. Rủi ro & cách chặn

| Rủi ro | Mức | Chặn thế nào |
|---|---|---|
| LLM bịa số liệu lá số | Cao | Engine deterministic là nguồn DUY nhất; prompt ràng "chỉ luận trên JSON tool" |
| App native kẹt version cũ | Cao | Contract additive + cờ `min_supported_version`; WebView-first giảm đau |
| Apple ép IAP (mất 15–30%) | Cao | Quyết định kinh doanh trước Phase 5; cân nhắc chỉ bán credit ngoài app/web |
| TikTok/Zalo từ chối nội dung tâm linh | Trung | Định vị "giải trí/tham khảo văn hóa"; đọc kỹ policy trước |
| Độ trễ nhiều tool tuần tự | Trung | Engine in-process; chạy song song tool độc lập (lá số chồng+vợ) |
| Chi phí token tăng theo user | Trung | Prompt-caching lá số JSON; giới hạn lịch sử (10 lượt); quota |
| Hồi quy khi lật ruột client | Trung | Giữ e2e Playwright xanh mỗi sprint; bật cờ rollback |
| Engine sai về học thuật | Trung | Vitest engine bắt buộc xanh; không sửa engine khi chỉ wrap |

---

## 7. Phân vai: việc của MÀY vs việc của TAO

### Việc của MÀY (con người — tao không làm hộ được)
1. **Đăng ký tài khoản nền tảng** theo checklist mục 4 (Zalo OA/Mini, TikTok, Google Play 25 USD, Apple 99 USD/năm).
2. **Giấy tờ pháp nhân/CCCD** cho Zalo/xác minh store.
3. **Thẻ thanh toán quốc tế** cho Apple/Google.
4. **Máy Mac** (hoặc duyệt chi CI) cho iOS.
5. **Quyết định kinh doanh:** IAP trên iOS vs paywall ngoài; giá credit; gói free.
6. **Cấp secrets** khi tới từng phase: token Zalo OA, keys TikTok, VAPID push, v.v.
7. **Nội dung pháp lý:** rà lại trang điều khoản/bảo mật cho đúng yêu cầu từng store.

### Việc của TAO (Claude — code & tài liệu)
- Toàn bộ Phase 0–1 (bộ não + web thin client) không cần mày đăng ký gì.
- Tất cả adapter kênh, vỏ Capacitor/Mini App (cần mày cấp secrets/account khi tới phase).
- Giữ CI xanh, viết test, cập nhật tài liệu này theo tiến độ.

---

## 8. Bắt đầu ngay: Phase 0, Sprint 0.1

Việc kế tiếp tao làm: chốt **types contract `lib/contract/v1.ts`** + scaffold **`app/api/v1/chat/route.ts`** trả stream SSE skeleton. Không đụng gì đang chạy (route mới, tách biệt) nên an toàn. Sau đó mới tới tool layer (0.2).
