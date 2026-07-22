# CLAUDE.md — Context cho Claude Code

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 14, Supabase, Vercel)

---

## 🟣 ĐANG LÀM — Admin Revamp + Marketing/Conversion Tracking

**Branch:** `claude/admin-page-revamp-sgnhvg`
**Cập nhật:** 2026-07-22

### 🔖 RESUME HERE
Revamp `public/admin.html` + thêm mảng **Marketing** để đo full funnel:
`traffic source → visit → signup → free/activated → paid → return → repeat`.
Trước đó admin CHỈ suy hành vi từ `credit_transactions` (bỏ sót tool free, page view, nguồn traffic). Đang dựng hạ tầng tracking riêng.

**Workplan 5 sprint (mỗi sprint = 1 PR draft):**
- **S0 — Hạ tầng tracking** ✅ (PR đang mở): bảng `events` + `user_attribution`, `/api/track`, `public/track.js`, gắn homepage + hook signup/login attribution.
- **S1 — Phủ toàn site:** inject track.js qua `shell.js` (bump version) + trang tool; emit tool_open/run/result, chat_msg, topup_start/success, cta_click.
- **S2 — Dashboard Funnel + Sources:** mục "Marketing" sidebar, trang Funnel (conv% từng bước) + bảng Traffic Sources + filter ngày (RPC aggregate).
- **S3 — Acquisition + Campaign:** chart signups/ngày theo kênh, bảng campaign UTM, top landing/referrer.
- **S4 — Retention + Revenue/LTV:** cohort giữ chân, doanh thu & LTV theo kênh (join `user_attribution` × `credit_transactions`), export CSV.

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
