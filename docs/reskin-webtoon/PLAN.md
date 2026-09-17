# Reskin Webtoon — Workplan theo Sprint

> Nhánh: `claude/website-webtoon-reskin-7nxdwi` · PR #903
> Cập nhật 2026-09-16 sau khi Henry chốt guideline + 3 quyết định đầu.

**Mục tiêu:** reskin toàn site sang webtoon, mascot **Minh Bảo** xuyên suốt — cậu
bé thần đồng biết trước tương lai, bối cảnh làng quê Việt Nam xưa. Mobile-first.

---

## ✅ ĐÃ CHỐT (không mở lại)

| # | Quyết định | Hệ quả |
|---|---|---|
| 1 | **Giọng trẻ con hóm hỉnh, xưng hô lễ phép** | Bỏ toàn bộ "ngươi"/"ta" trong guideline. Xem §2. |
| 2 | **Paywall CHE HẾT** (`.tpw-ph`), không blur | Guideline §7 "blur content" **bị bác**. Xem §3.4. |
| 3 | **STYLE_LOCK duyệt** qua bức `mascot` + `hero` | Khối prompt trong `scripts/gen-webtoon-sample.mjs` là nguồn phong cách. |
| 4 | **`gpt-image-2`**, không phải `gpt-image-1` | OpenAI tắt bản 1 ngày 23/10/2026. |

---

## 1. ⚠️ GUIDELINE vs HỆ THỐNG — 6 chỗ còn lệch

Guideline do ChatGPT soạn, không đọc được repo. Dưới đây là chỗ nó nói một
đằng mà hệ thống này làm một nẻo. **Cần Henry gật/lắc từng mục.**

### 1.1 🔴 §5.3 "Progress bar step 1→4" — đề nghị BỎ
Chia form khai sinh thành 4 bước **gãy 4 thứ cùng lúc**:
- `TuviForm.render()` dùng chung ~40 trang với 3 chế độ. Trang `tuong-hop` render
  **HAI form cạnh nhau** (người A / người B) — hai wizard cạnh nhau là vô nghĩa.
- `?auto=1` + `Shell.autoRun()` tự submit form từ deep link. Wizard không có một
  nút submit để tự bấm.
- Giữ chỗ chống CLS `#tuviFormHost:empty{min-height:252px}` là số **ĐO** cho form
  hiện tại. Mỗi bước wizard một chiều cao ⇒ CLS ở từng lần chuyển bước.
- Thêm bước vào form đang chuyển đổi tốt thường làm **giảm** tỉ lệ hoàn thành.

**Đề xuất thay:** giữ MỘT màn hình, đổi cách hỏi cho ra giọng trò chuyện. Thanh
tiến trình để cho **HÀNH TRÌNH** (Gặp Bảo → Khai sinh → Xem trước → Mở khoá),
không phải cho các ô của form.

### 1.2 🔴 §2.2 "Giảm text logic" — chỉ áp cho `/app/*`
Site có 54 trang tool SEO + 26 route render server + 7.080 `seo_pages` tồn tại để
**xếp hạng tìm kiếm**. Cắt chữ ở đó là cắt nguồn khách.
**Luật đề xuất:** kể chuyện ở `/app/*` (sản phẩm sau đăng nhập). Trang SEO chỉ
thay **da**, giữ nguyên lượng chữ.

### 1.3 🟡 §11 "Replace ALL tool-based UI" — không phải tool nào cũng hợp
Bọc một cái la bàn Bát Trạch hay bảng tra Nạp Âm vào lớp kể chuyện làm nó **khó
dùng hơn**.
**Luật đề xuất — chia hai loại:**
- *Tool cảm xúc* (lá số, luận giải, chân dung, tiền kiếp, duyên nợ, chu trình
  cuộc đời) → kể chuyện đầy đủ, Minh Bảo dẫn dắt.
- *Tool tra cứu* (bát trạch, nạp âm, chọn ngày, kim lâu, số đẹp) → giữ thẳng
  việc, chỉ đổi da + một câu của Bảo ở đầu.

### 1.4 🟡 §2.3 "Progressive Reveal" đụng `portrait_cache`
Người **đã trả tiền** mở lại kết quả cũ phải thấy NGAY và ĐỦ. Reveal từ từ chỉ
được áp cho **lần xem đầu**, không áp cho lần mở lại bản đã mua.

### 1.5 🟡 §9.3 "Unlock mechanics / mở khoá chương" — đừng đẻ ID mới
Đường tiền khoá theo `tool_id` + Lượng. Luật cứng: *"slug thanh toán PHẢI bắt đầu
bằng đúng `tool_id`"* — sai là trừ tiền hai lần.
**Được:** gọi tool là "chương" trên **CHỮ HIỂN THỊ**.
**Cấm:** đẻ một hệ ID "chapter" song song với `tool_id`.

### 1.6 🟡 §9.1 "Bạn đã đi được 30% hành trình" — dùng lại cái đã có
Đã có hệ Nhiệm Vụ ở `/app/tai-khoan#nhiemvu`. Đừng dựng hệ tiến trình thứ hai;
đổi cách hiển thị của cái đang chạy.

### ✅ Hai chỗ guideline TRÙNG KHỚP sẵn — không phải làm gì
- **§4.2 Typography** "Heading serif / Body sans" = đúng thứ repo đang chạy
  (Noto Serif + Be Vietnam Pro, self-host). **Đừng đụng font** — `check:font`
  chặn Google Fonts, và font từng gây CLS 0,2364.
- **§4.1 Palette** rất gần bảng hiện tại (`#0F2A3D` vs `--navy-2 #0A2540`;
  `#C8A96A` vs `--gold #C9A84C`). Đây là **làm dịu**, không phải lật bảng màu.

---

## 2. GIỌNG MINH BẢO — chốt cụ thể

**Ngôi xưng:** Bảo tự xưng **"Bảo"**, gọi người dùng là **"bạn"**.

Vì sao không dùng "con/cháu" hay "cô/chú": người dùng trải từ 18 tới 70 tuổi,
đoán sai vai là hỏng ngay câu đầu. "Bảo" + "bạn" lễ phép, không đoán tuổi, và
vẫn là giọng trẻ con.

| Chỗ | ❌ Guideline (ChatGPT) | ✅ Bản chốt |
|---|---|---|
| Form | "Tên của ngươi là gì?" | "Bạn tên gì để Bảo gọi cho thân?" |
| Form | "Cho ta biết ngày sinh" | "Bạn cho Bảo xin ngày sinh nhé" |
| Hero | "Ta thấy… mệnh của ngươi không tầm thường" | "Bạn sinh giờ đó hả? Ồ… hay à nha." |
| Chờ | — | "Bạn đợi Bảo chút, Bảo đang đếm sao." |
| Paywall | "Nếu chỉ dừng ở đây… ngươi sẽ hiểu sai chính mình" | "Phần sau Bảo phải coi kỹ hơn mới dám nói." |

**Luật giọng:**
1. Câu ngắn. Bảo là trẻ con, không nói câu ghép ba mệnh đề.
2. Tò mò, không phán. "Ồ", "à nha", "hình như" > "chắc chắn", "định mệnh".
3. **Không doạ.** Guideline §10 tự cấm "tone bán hàng lộ liễu" nhưng copy
   paywall của nó lại doạ — bản chốt bỏ.
4. Không nhắc "AI"/"trí tuệ nhân tạo" (luật `docs/luat/chu-hien-thi.md`).

---

## 3. SPRINT

Mỗi sprint: **cổng duyệt sample trước, làm thật sau.** Sprint chỉ đóng khi CI
xanh + Henry gật.

### 📊 TIẾN ĐỘ (cập nhật 2026-09-16, sau vòng wire Minh Bảo vào rail)

| Sprint | Trạng thái | Đã làm | Còn thiếu |
|---|---|---|---|
| 0 — Nền | ✅ Xong | `theme.css` gom 40 file, `check:theme` xanh | — |
| 1 — Character Bible | ✅ Xong (paywall wire xong, 4 pose để dành) | mascot/hero/corner/library/articles/community/**paywall** V2 đã lên site; `expr-vui-v2` wire vào rail-empty, `paywall-v2.webp` (chị khách cầm lá số về cùng bạn trai, Minh Bảo chơi với bạn, bình minh Tết) wire vào `.tpw-lock` (`tuvi-paywall.js`, dùng chung `_softLock`+`lockPreview`) | 4 pose (chỉ tay/thẻ tre/chống cằm/vẫy tay) đã duyệt + commit, vẫn CHƯA có "khung minh hoạ" nào trống trên `/app/*` phù hợp — để dành chờ sprint có onboarding/empty-state mới |
| 2 — Chrome dùng chung | ⚠️ Phần lớn xong | `nav.js`: **`.topnav` đổi nền navy→kem trong suốt+blur khớp `.mb-header` homepage thật** (2026-09-17, Henry chỉ ra "header trên cùng vẫn navy" — Sprint 2 trước đó mới đổi hex đậm→nhạt, chưa đổi kiến trúc sáng/tối), 102 icon SVG bo tròn nét, corner-Bảo trong topnav (đã cập nhật sang **V2** `corner-v2.webp` khi đổi style), **footer đổi màu nâu espresso khớp tông trang chủ mới**, **254 icon-span dùng gold cũ `#9A7B3A` đã retune sang `#7C6942`** (2026-09-17, chỉ màu — bản thân SVG dùng `currentColor` nên không có gì để retune ở tầng đó) | 🔴 Henry: 102 icon hiện tại (Lucide bo nét) chưa đủ khớp Ghibli/chibi — cần **gen lại bằng ảnh**, không còn thuần SVG. **VẪN TREO** — retune màu không giải quyết được câu hỏi hình dạng này (xem ghi chú ở Sprint 2 đầy đủ) |
| 3 — App shell (53 trang `/app/*`) | ⚠️ Khung + rail-empty xong | `shell.css` đổi palette + bo góc thẻ + shadow mềm; **Minh Bảo (`expr-vui-v2`) đã vào `.rail-empty`** (trạng thái trước khi có lá số) kèm câu chào giọng §2, thay avatar "thầy" cũ ở đúng chỗ đó — KHÔNG đụng `.rail-h`/`.rail-ava` (hệ chọn thầy luận giải, khác Minh Bảo, vẫn hoạt động bình thường) | Rail SAU khi có lá số (đang chat) chưa có Minh Bảo — mới phủ trạng thái RỖNG; chưa map biểu cảm khác nhau theo trang (§3.4, mới dùng đúng 1/4 biểu cảm); **`tuvi-form.js` chưa đổi giọng "Bảo/bạn"** (§1.1/§2 — quyết định RIÊNG, còn chờ Henry gật vì đụng cấu trúc form) |
| 4 — Homepage (`/`) | ✅ Xong, đang polish | Dựng lại theo 2 mockup Henry gửi, ảnh V2 riêng cho từng khối (hero/daily/library/articles/community), SEO đầy đủ, wire vào route `/`, vá LCP+contrast+responsive-images (Lighthouse xanh), vá màu + bỏ icon SVG thô ở footer theo phản hồi Henry | — (đang chờ Henry duyệt lần cuối) |
| 5 — 52 tool avatar | ✅ Xong | 52/52 avatar mới — thầy/cô của 11 nhóm (`master-groups.ts`, dùng chung Sprint 5b) đang cầm/chỉ vào deliverable riêng của từng tool, không phải Minh Bảo; `public/tool-avatars/*.webp` (512×512, quality 82) đã thay hết art cũ | Vẫn hiện ở `/tools/*.html` (Sprint 6, còn navy) và header PDF — chưa có "sân khấu" webtoon để khoe cho tới khi Sprint 6 xong |
| 5b — Banner hook `.intro-card` (11 nhóm, khác Sprint 5) | ✅ Xong, đã publish thật + vá lỗi "che hình" | 11 nhóm cast duyệt xong, ảnh đã publish + vá 2 lỗi CSS (`.intro-photo` tràn ngang mobile, `::after` gradient lấn ảnh) + vá lỗi webp bị cắt cạnh (`nenWebp` đổi sang `sharp`, xem `nhat-ky/2026-09.md` "che hình") | Route `app/api/admin/hero-banners/route.ts` (cổng `hero_banners.gen`) chưa từng chạy qua để VẼ MỚI — lần publish làm thủ công thẳng vào Storage bằng ảnh đã duyệt sẵn |
| 6 — 54 trang tool SEO | ✅ Xong | `tools/tools.css` + cả 54 trang đổi bảng màu webtoon (khớp `shell.css`), `.xt-avatar`/`.hero-avatar` nền đổi navy→kem khớp avatar Sprint 5, `#nav-ph` hết nháy màu; gỡ `theme.css` dư thừa khỏi 14 trang (thêm `--gold-bright` vào `tools.css` thay thế) | "13 trang `:root` riêng" trong dòng cũ SAI — thực tế chỉ 2 trang, không đụng navy/gold; đã sửa lại mô tả. `.site-footer` tĩnh trong 54 trang KHÔNG đổi màu (dead code, `nav.js` luôn thay bằng footer mới) |
| 7 — 25 route SEO server | ✅ Xong | 25 file (24 route riêng + `app/ngay-tot/_shared.ts` dùng chung 6 route) đổi `:root` cục bộ sang bảng webtoon, band navy (`.hero`/`.page-header`/`.profile-header`/`.hub-hero`) đổi sang nền kem luôn trong cùng lượt (rút kinh nghiệm Sprint 6), thêm `#nav-ph` còn thiếu, bump `nav.js` version lệch ở các trang `[slug]` | "26 route" là số đếm sai, thực tế 30 route dựng HTML (4 trang share/embed cố ý không nạp nav/footer, không tính); `app/thu-vien` + 4 trang share/embed vẫn navy riêng, cố ý ngoài phạm vi (không dùng biến chung, không nạp nav.js) |
| 8 — Ảnh phụ | ✅ Xong | Khảo sát trực tiếp mở từng ảnh ra xem (không đoán theo khuôn Sprint 6/7): fbcard-topics/van-rieng (ink-wash be/nâu/xanh rêu) đã tương thích sẵn nền kem, seal.webp là dấu triện đỏ-trắng theo quy ước văn hoá — cả 3 KHÔNG cần sửa, gen lại sẽ tốn tiền vô ích. Chỉ 4 route Satori (`app/api/og/*`) thật sự "vẫn navy" — đổi nền `#061A2E`→`#F4F2EC`, chữ trắng→navy, gold chuẩn hoá `#C8A96A`/`#7C6942` | 64 quẻ (Gongbi) Henry xác nhận giữ nguyên, không đụng. `scripts/gen-que-images.mjs` vẫn ghim `gpt-image-1` cũ (đã bị OpenAI khai tử) — nằm trong vùng "không đụng" nên chưa vá, cờ nợ kỹ thuật riêng |
| 9 — Thư viện minh hoạ luận giải | ✅ Xong (không đổi gì) | Đếm bucket thật qua Supabase (MCP, không cần script) ra 652 ảnh gốc (969 MB), phủ đủ mọi khía, nhiều hơn cả ước tính ~360 combo code có thể chạm tới — không phải "chưa có gì" như PLAN.md ngầm giả định. Gửi Henry 1 ảnh mẫu thật (style watercolor "light-novel" Trí/Thư) | Henry xác nhận **giữ nguyên style, không vẽ lại** dù khác style chibi (Minh Bảo) đã chốt cho phần còn lại của site — quyết định thương hiệu có chủ đích, không phải nợ kỹ thuật |
| 10 — Giọng §2 toàn site | ✅ Xong, Henry chốt không đổi | Trình bày cụ thể file/hàm/ví dụ trước khi sửa (`arcGiong`, `lib/agent/prompts.ts`, 3 mục Hướng Nghiệp Trẻ/Nhân Mạch/Ngũ Hành) — Henry chốt giữ nguyên | Chữ tĩnh trên site (form/hero/paywall, §1.1) vẫn là quyết định RIÊNG, chưa gật, không nằm trong sprint này |

**Tóm tắt cho Henry:** nav + footer (chrome dùng chung, hiện trên ~200 trang) và
trang chủ `/` đã lên giao diện mới. **Khung** của 53 trang `/app/*` (màu + bo góc)
đã đổi nhưng **CHƯA có Minh Bảo/giọng mới bên trong**. 145 trang marketing/SEO,
54 trang tool, 26 route server, 52 avatar tool, ảnh phụ, thư viện minh hoạ, và
giọng LLM toàn site — **tất cả chưa đụng tới**, vẫn là giao diện/nội dung cũ.

---

### 🏗 SPRINT 0 — Nền (không đổi một pixel nào) — ✅ XONG
**Vì sao trước tiên:** site có 4 "bộ da" không dùng chung token; 31 file chép tay
bảng màu vào `:root`; `nav.js` gõ hex cứng. Không gom trước thì mỗi lần chỉnh màu
là 31 lần sửa tay và chắc chắn trôi.

| Việc | File |
|---|---|
| `public/theme.css` — `:root` + dark, NGUỒN DUY NHẤT | mới |
| Trỏ 31 file `:root` chép tay về đó | 31 file |
| `nav.js` đọc `var()` thay hex cứng | `public/nav.js` |
| `npm run check:theme` — chặn `:root` chép tay mới | `scripts/check-theme.mjs` |
| Nâng `STYLE_LOCK` lên module dùng chung | `lib/media/webtoon-style.ts` |
| `docs/reskin-webtoon/giong-minh-bao.md` — §2 thành file tra cứu | mới |

**Sample gate:** không có — chốt bằng ảnh chụp **trước/sau giống hệt nhau**.
**DoD:** `check:theme` xanh · Lighthouse không đổi · 8/8 CI xanh.
**Ước:** 1,5–2 ngày.

---

### 🧒 SPRINT 1 — Character Bible Minh Bảo — ⚠️ Ảnh xong (V2), CHƯA wire vào trang nào
Mở rộng từ 2 bức đã duyệt thành bộ dùng được.

| Bức | Khổ | Dùng ở |
|---|---|---|
| ~~mascot~~ ✅ đã duyệt | 1024² | nguồn neo cho mọi bức sau (V2: `mascotV2.png`) |
| ~~hero~~ ✅ đã duyệt | 1536×1024 | nền hero trang chủ (V2: `heroSceneV2` → `hero-scene-v2.webp`, đã lên `/`) |
| ✅ expressions ×4 (vui/tập trung/suy tư/nghiêm túc) | tách từ sheet 1536×1024 | §3.4 map theo ngữ cảnh — **đã gen + tách 4 ảnh riêng (nền trong suốt), CHƯA commit/wire, đang chờ Henry duyệt** |
| ⬜ paywall (hoàng hôn, cùng cảnh hero) | 1536×1024 | tường trả phí — **entry cũ trong script còn neo `hero.png` (V1), cần trỏ lại `heroSceneV2.png` rồi gen lại** |
| ~~corner-Bảo~~ ✅ đã lên site | 512² | góc topnav toàn site (`corner-v2.webp`) — xem ghi chú dưới |
| ✅ poses ×4 (chỉ tay, cầm thẻ tre, chống cằm, vẫy tay) | tách từ sheet 1536×1024 | khung minh hoạ — **đã gen + tách 4 ảnh riêng (nền trong suốt), CHƯA commit/wire, đang chờ Henry duyệt** |

🔴 **corner-Bảo bắt buộc phải có.** Guideline §3.2 đòi mascot xuất hiện ở mọi
section. Nhưng cột `.ws` ở desktop chỉ còn **~360px** sau khi trừ sidebar 246 +
rail 336 — nhét bức mascot lớn vào đó là ăn hết chỗ nội dung. Cần bản nhỏ,
nền trong suốt, neo góc.

**Kỹ thuật đã sửa vòng này:** dùng `images/edits` với bức đã duyệt làm **neo**,
không vẽ text-to-image thuần. Vòng 1 vẽ rời → trôi nhân vật (áo đổi màu, mặt già
đi) và bức paywall lạc sang tranh thuỷ mặc Tàu.

**Sample gate:** trọn bộ, Henry duyệt từng bức.
**DoD:** 4 biểu cảm phân biệt được **khi nhìn ở 64px** · webp ≤ 50 KB/bức.
**Ước:** 1 ngày.

---

### 🎨 SPRINT 2 — Chrome dùng chung — ⚠️ Phần lớn xong (nav+footer+icon+mascot V2)
Đổi một lần, ăn sang **mọi** trang không phải `/app/*`.

| Việc | Ghi chú |
|---|---|
| `nav.js` topnav + footer sang palette mới | 72 KB, hex cứng → `var()` |
| **102 icon SVG** webtoon hoá | Bo `stroke-linejoin:round`, nét 1.5→2.2, hơi lệch tay |
| corner-Bảo vào topnav | §5.1 |
| Bump `nav.js?v=31` | ⚠️ **bắt buộc**, luật `docs/ICONS.md` |

⚠️ **Không rasterize icon.** 102 file PNG giết mobile. Giữ SVG, giữ nguyên tên
khoá (`data-icon="wallet"`) ⇒ **không trang nào phải sửa**.
⚠️ Nút CHỈ-icon **cấm `textContent`** — xoá mất `<svg>`.

🔴 **2026-09-16 — Henry:** bộ 102 icon hiện tại (Lucide, chỉ bo tròn nét) KHÔNG
đủ khớp style Ghibli/chibi của trang chủ mới — làm lại đợt này phải **gen
bằng ảnh** (illustration thật, không phải line-art vector bo góc). Đổi kỹ
thuật: 102 icon giờ là ẢNH (webp nhỏ) chứ không còn thuần SVG path — bỏ
luôn ràng buộc "không rasterize icon" phía trên, cần nghĩ lại ngân sách
cân nặng mobile (KB/icon × 102) trước khi làm. **VẪN TREO** — câu hỏi hình
dạng chưa được trả lời, xem mục màu bên dưới.

✅ **2026-09-17 — phần MÀU đã xong, hình dạng vẫn treo.** Hỏi Henry "chỉ retune
màu có đủ không" trước khi động vào 102 icon SVG — khảo sát ra **hai việc khác
nhau bị PLAN.md gộp làm một**: (a) bản thân bộ SVG dùng `stroke="currentColor"`,
`.ic`/`.ic-inline` không khai `color` ⇒ **không có gì để retune ở tầng này**,
icon tự ăn màu chữ bao quanh, đã đúng từ Sprint 6/7; (b) một lỗi THẬT riêng biệt
— 254/436 chỗ dùng hex gold cũ `#9A7B3A` là hex ghim thẳng vào span
`data-icon`/`data-icon-emoji` (fallback trước khi `mountIcons()` chạy), sót lại
từ trước Sprint 6/7 vì nó không nằm trong `:root`. Henry chốt **chỉ sửa (b)**,
đổi `#9A7B3A→#7C6942` (khớp giá trị Sprint 6/7), giữ nguyên 182 chỗ hex đó dùng
cho phần tử KHÔNG phải icon. Câu hỏi (a) — hình dạng icon có cần vẽ lại bằng
ảnh — **vẫn TREO**, màu không giải quyết được hình. Chi tiết: `docs/nhat-ky/2026-09.md`.

**Sample gate:** ảnh chụp topnav + footer + bảng 102 icon (cho phần HÌNH DẠNG,
chưa làm). **Ước:** 2–3 ngày (cho phần hình dạng, chưa làm).

---

### 🏠 SPRINT 3 — App shell → 53 trang một lượt — ⚠️ Chỉ xong phần khung (màu+bo góc), chưa có Bảo/giọng mới
Sprint **lãi nhất trên mỗi giờ bỏ ra**: sửa `shell.css` là 53 trang `/app/*` đổi da.

| Việc |
|---|
| `shell.css` (85 KB) sang palette + bo góc 20–28px + shadow mềm + padding 20–32px |
| Bong bóng thoại Minh Bảo trong rail (§3.3) |
| Map biểu cảm theo ngữ cảnh trang (§3.4) |
| `tuvi-form.js` — đổi nhãn sang giọng §2 (**MỘT màn hình**, xem §1.1) |

**Sample gate:** `/app` + `/app/la-so` + `/app/luan-giai`, cả mobile lẫn desktop.
**Rủi ro:** `check:navph` · `check:formph` · `check:introcard` sẽ kêu — giữ chỗ
đổi chiều cao thì phải **ĐO lại**, đừng đoán.
**Ước:** 3–4 ngày.

---

### 🚪 SPRINT 4 — Homepage (mang shell ra ngoài) — ✅ Xong, đang chờ Henry duyệt lần cuối
`/` dựng theo khung shell, marketing nén còn 4 khối đẩy xuống dưới `.ws-body`:
số liệu live · marquee công cụ · đánh giá · SEO strip + footer.
**Cắt:** marquee câu hỏi (trùng chip rail) · khối values (dồn vào `/about`) ·
CTA đáy (rail luôn hiện).

🔴 **Rủi ro lớn nhất cả dự án.** `/` đang bị canh **LCP ≤ 4000ms · CLS ≤ 0,1 ·
TBT ≤ 600ms**, mà mang shell ra là thêm **~308 KB** (`shell.js` 223 + `shell.css` 85).

Giảm thiểu:
- Hero + form dựng **tĩnh trong HTML**, không để JS chèn (`check:introcard`).
- Rail chat tách ra, nạp khi tương tác.
- Khung chờ cho sidebar + rail, nhắm **DƯ** chứ không thiếu.
- ⚠️ Khối bê vào `.ws` co theo **bề rộng CỘT** (~360px), `@media(max-width:600px)`
  **không bao giờ khớp** → khai `container-type` + hỏi `@container`.
- ⚠️ `srcset`+`sizes` thì NGƯỢC LẠI: chỉ hiểu viewport. Hai thứ lệch nhau khi rail mở.
- ⚠️ **CLS chỉ kết luận được bằng prod↔prod.** Preview đo hụt (0,016 vs 0,160 thật).

**Sample gate:** `/` mobile + desktop, **kèm số Lighthouse đo trên prod**.
**Ước:** 3–4 ngày.

---

### 🖼 SPRINT 5 — 52 tool avatar — ⬜ Chưa bắt đầu
Bảng chủ đề từng tool đã có ở `lib/media/tool-avatar-prompt.ts` (`TOOL_AVATARS`).
Reskin = **thay khối `ART_DIRECTION`/`LINE_STYLE`** bằng `webtoon-style.ts`, giữ
nguyên `centralSubject`.

🔴 **Cả 52 bức phải vẽ lại, không giữ được bức nào.** Bộ cũ là *"thin gold line
art on deep navy, no other colors anywhere"*; style mới là *"watercolor, cream,
no harsh contrast"* — không tương thích chút nào.

🔄 **Đổi luật cũ:** file đó ghi *"KHÔNG ép mọi tool có nhân vật người"*. Webtoon
làm ngược: **Minh Bảo có mặt ở cả 52**, nhưng đổi vai — tool luận người thì Bảo
tương tác với khách; tool tra cứu thì Bảo đứng cạnh vật thể (la bàn, lịch, vòng quẻ).

**Sample gate:** 5 bức (`--sample` đã có sẵn).
**Ước:** 2 ngày · ~57k đ.

---

### 📄 SPRINT 6 — 54 trang tool SEO — ⬜ Chưa bắt đầu
`tools/tools.css` phủ 41 trang; **13 trang có `:root` chép tay đè lên** (Sprint 0
đã dọn). Chỉ đổi da, **giữ nguyên lượng chữ** (§1.2).
**Sample gate:** `/tools/an-sao.html`. **Ước:** 2–3 ngày.

---

### ⚙️ SPRINT 7 — 26 route SEO render server — ⬜ Chưa bắt đầu
Mỗi `app/**/route.ts` một khối `<style>` nhúng trong chuỗi TS, không helper chung.
Sprint này dựng helper + trỏ về `theme.css`.
**Sample gate:** `/tu-dien` + `/van-han`. **Ước:** 2–3 ngày.

---

### 🎴 SPRINT 8 — Ảnh phụ — ✅ Xong (2026-09-17)
Khảo sát trước khi gen (agent Explore) lật ngược tiền đề của dòng PLAN gốc:
- **fbcard-topics (30) + van-riêng (36)**: phong cách ink-wash thuỷ mặc be/nâu/
  xanh rêu — mở file ảnh ra xem trực tiếp, đã tương thích sẵn với nền kem mới,
  KHÔNG có kiến trúc "navy full-bleed" như các band CSS ở Sprint 6/7. Không gen
  lại.
- **van-ngay (4)**: cùng phong cách ink-wash, cùng kết luận — không gen lại.
- **seal/favicon**: `seal.webp` là con dấu đỏ-trắng theo quy ước văn hoá triện
  ấn — đỏ không phải "lỗi bảng màu", đổi sẽ phá tính nhận diện. Không đổi.
- **64 quẻ Kinh Dịch**: Henry xác nhận giữ nguyên (Gongbi đã chốt trước đó).
- **og**: đây là phần DUY NHẤT thật sự "vẫn navy" — 4 route Satori
  (`app/api/og/route.tsx`, `og/social`, `og/laso`, `og/luan-duong`) nền
  `#061A2E` full-bleed. Đổi kiến trúc y hệt Sprint 6/7: nền→`#F4F2EC`, chữ
  chính→`#0F2A3D`, gold chuẩn hoá `#C8A96A` (hoạ tiết)/`#7C6942` (chữ). Giữ
  nguyên accent tím `rgba(167,139,250,…)` trong `og/laso` (cùng logic CTA tím
  đã giữ ở Sprint 7) và màu chỉ báo điểm số (`diemColor()`).

**Bài học:** 3/5 nhóm trong dòng PLAN gốc không có script gen trong repo (ảnh
đến từ PR #774 + commit tay Henry, chưa từng commit prompt) — "cùng 1 dòng
PLAN.md" không có nghĩa "cùng 1 loại lỗi". Mở ảnh ra NHÌN trước khi viết
prompt/gọi API tốn tiền rẻ hơn nhiều so với gen theo mặc định rồi mới phát
hiện không cần. Chi tiết: `docs/nhat-ky/2026-09.md`.

---

### 🗂 SPRINT 9 — Thư viện minh hoạ luận giải — ✅ Xong, không đổi gì (2026-09-17)
Đếm bucket thật (`storage.objects`, project `dciwkfdqhhddeymlisey`, qua MCP
Supabase — không cần `reencode-illus.mjs` hay credential trong sandbox): **652
ảnh gốc, 969 MB**, mọi khía đều có ảnh (24-120/nhóm, không nhóm nào rỗng) —
nhiều hơn cả ước tính ~360 combo "code có thể chạm tới" tính từ cách
`illus-match.js` suy giảm trục lúc runtime. "13×3×2×5×1-2≈708" của PLAN.md là
số combo lý thuyết nhân thẳng, không phải số ảnh thật cần có.

Tải 1 ảnh thật qua URL public (0đ, bucket public) gửi Henry xem: style
watercolor tả thực "light-novel" (nhân vật Trí/Thư, `lib/media/illus-prompt.ts`
`STYLE_LOCK`) — nền ấm hợp bảng màu mới, nhưng KHÁC style chibi (Minh Bảo,
`lib/media/webtoon-style.ts`) đã chốt cho phần còn lại của site ngày 16/9.
**Henry xác nhận giữ nguyên, không vẽ lại** — quyết định thương hiệu có chủ
đích (không phải mọi minh hoạ trên site phải cùng một nhân vật), không phải
nợ kỹ thuật cần dọn. Chi tiết: `docs/nhat-ky/2026-09.md`.

---

### ✍️ SPRINT 10 — Rà chữ toàn site sang giọng §2 — ✅ Xong, Henry chốt KHÔNG đổi (2026-09-17)
Trước khi sửa, trình bày cụ thể cho Henry: đúng 1 file (`lib/agent/prompts.ts`),
đúng 1 hàm (`arcGiong()` — dùng cho 3 mục LLM tự sinh: Hướng Nghiệp Trẻ/Nhân
Mạch/Ngũ Hành), kèm ví dụ câu cụ thể sẽ đổi và một điểm mơ hồ cần chốt: tiêu đề
"toàn site" nhưng mô tả chi tiết chỉ nói `arcGiong` — chữ tĩnh khác (form/hero/
paywall) là việc RIÊNG, tự PLAN.md đã ghi "còn chờ Henry gật" ở `tuvi-form.js`
(§1.1), không thuộc phạm vi sprint này.

**Henry chốt: giữ nguyên, không sửa gì.** Không có thay đổi code. Chi tiết:
`docs/nhat-ky/2026-09.md`.

---

## 4. CHẠY SONG SONG (worktree)
Sau khi Sprint 0 xong, ba nhánh này không giẫm chân nhau:
- `wt-icons` — Sprint 2 icon SVG (chỉ đụng `nav.js`)
- `wt-gen` — Sprint 5/8/9 gen ảnh (chỉ đụng `scripts/` + `lib/media/` + asset)
- `wt-seo` — Sprint 7 (chỉ đụng `app/**/route.ts`)

Nhánh chính giữ Sprint 0/3/4 — chúng đụng `theme.css` + `shell.css` + `index.html`.

---

## 5. MOBILE-FIRST — luật cứng mọi ảnh

| Khoản | Luật |
|---|---|
| Định dạng | Gen PNG → **luôn** chuyển `.webp` bằng `sharp` trước khi commit |
| Khổ giao | avatar 512² · hero 600×720 (mobile 400×480) · minh hoạ 800w · fbcard 1200×630 · corner-Bảo 512² trong suốt |
| Ngân sách | hero ≤ 100 KB · avatar ≤ 50 KB · minh hoạ ≤ 120 KB |
| CLS | Mọi `<img>` khai `width`+`height` THẬT |
| Lazy | Dưới màn hình đầu: `loading="lazy" decoding="async"`. Hero: `fetchpriority="high"` |

---

## 6. BỘ DÒ SẼ KÊU — biết trước để không hoảng

| Bộ dò | Sprint | Xử |
|---|---|---|
| `check:theme` (mới) | 0 | Chính nó là deliverable |
| `check:font` | 2 | **Đừng thêm font.** Repo đã đúng §4.2 sẵn |
| `check:navph` `check:formph` | 3 | Giữ chỗ đổi chiều cao → **ĐO lại** |
| `check:introcard` | 4 | Giữ dựng tĩnh trong HTML |
| `check:prices` | 3,6 | **Client không chép số giá.** Đọc hụt → `…` + từ chối chạy |
| `check:illus` `check:motifs` | 8,9 | Không đổi bảng khoá, chỉ đổi prompt |
| `check:prompt` | 10 | Chạm trần thì CẮT, đừng nới |
| Lighthouse | 4 | **prod↔prod**, không tin preview |
| Playwright 16 spec | 3,4 | Cập nhật spec CÙNG PR, dùng web-first assertion |

⚠️ `tsc --noEmit` xanh **không** chứng minh `next build` chạy (đã 7 lượt deploy
ERROR). Job `next-build` phải xanh.
⚠️ `npm ci` TRƯỚC khi thêm file mới vào `scripts/` — nêu đúng bản lockfile
(`prettier@3.9.6`), `npx prettier` trần kéo bản bất kỳ trong cache.

---

## 7. CÒN CHỜ HENRY

1. **6 mục ở §1** — gật/lắc từng cái. Nặng nhất là **§1.1 (bỏ wizard 4 bước)**
   và **§1.2 (không cắt chữ trang SEO)**.
2. **Sprint 9** — xác nhận riêng việc đổi nét vẽ trong sản phẩm đã bán.
3. **Thứ tự** — tao đề nghị chạy thẳng Sprint 0 → 1 → 2 → 3. Hết Sprint 3 là
   **53 trang đổi da cùng lúc**, cú hích nhìn thấy được lớn nhất.
