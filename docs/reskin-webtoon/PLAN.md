# Reskin Webtoon — Kế hoạch tổng thể

> Trạng thái: **ĐỀ XUẤT, chưa duyệt.** Không code gì trước khi Henry chốt.
> Nhánh: `claude/website-webtoon-reskin-7nxdwi`

**Mục tiêu:** reskin toàn site sang phong cách webtoon, nhân vật mascot xuyên
suốt — cậu bé thần đồng **Minh Bảo**, bối cảnh làng quê Việt Nam xưa, giọng vui
nhộn nhẹ nhàng, giải trí chứ không nặng học thuật. Mobile-first.

---

## 0. HAI THỨ CHẶN ĐƯỜNG — cần Henry trả lời trước

### 0.1 🔴 Ảnh mẫu mascot + design mẫu CHƯA tới
Henry nói "tao gửi mày hình mẫu tham khảo" nhưng **trong phiên này không có file
đính kèm nào**. Không có ảnh mẫu thì không chốt được diện mạo Minh Bảo, mà diện
mạo Minh Bảo là thứ mọi ảnh còn lại phải bám theo.

Cách gửi: kéo ảnh vào khung chat, hoặc commit vào `docs/reskin-webtoon/ref/`.

### 0.2 🟡 Guideline style — Henry nói gửi sau
Plan này giả định guideline sẽ CHỐT lại phần "Character Bible" (mục 3) chứ không
lật ngược kiến trúc (mục 2). Nếu guideline đòi đổi cả grid/typography thì Phase 0
phải làm rộng hơn.

---

## 1. HIỆN TRẠNG — bốn "bộ da" độc lập, không dùng chung token

Đây là phát hiện quan trọng nhất. Site **không có một nguồn màu duy nhất**. Muốn
đổi da mà không sửa lại chỗ này thì phải sửa tay ~130 file và chắc chắn trôi.

| # | Họ trang | Số trang | Nguồn style | Ghi chú |
|---|---|---|---|---|
| A | App shell `/app/*` | **53** `public/app-*.html` | `shell.css` (85 KB) + `shell.js` (223 KB) | Sửa 1 CSS = xong 53 trang. Rẻ nhất. |
| B | SEO tool pages | **54** `public/tools/*.html` | `tools/tools.css` (18,6 KB) — nhưng **13 trang có `:root` chép tay đè lên** | 41 trang ăn theo CSS chung |
| C | Marketing / pháp lý | **42** `public/*.html` | Mỗi trang một khối `<style>` riêng. `index.html` tự mang 59 KB CSS inline | Tệ nhất |
| D | SEO render từ server | **26** `app/**/route.ts` | Mỗi route một `<style>` nhúng trong chuỗi TS. **Không có helper chung** | `tu-dien`, `van-han`, `la-so/[slug]`, `nghien-cuu`, `menh-kho`… |

**Chrome dùng chung:** `nav.js` (72 KB) vẽ topnav + footer cho họ B/C/D, và giữ
bảng **102 icon SVG**. Màu trong `nav.js` là **hex gõ cứng** (`#061A2E`,
`#C9A84C`…), không đọc biến CSS.

**Bảng màu hiện tại** (navy/gold/đỏ — tông "cổ pháp trang nghiêm"):
`--navy #061A2E` · `--gold #C9A84C` · `--blue #1455A4` · `--red #C0392B` ·
`--green #1E6B3C` · giấy `#FBFAF7`.
Đúng 31 file chép tay bảng này vào `:root` của riêng nó.

**Fonts:** Noto Serif + Be Vietnam Pro, **self-host bắt buộc** (`npm run
check:font` chặn Google Fonts — đã từng gây CLS 0,2364).

---

## 2. KIẾN TRÚC ĐỀ XUẤT — Phase 0 phải làm trước mọi thứ

### 2.1 Một nguồn token duy nhất: `public/theme.css`

```
public/theme.css        ← :root { --wt-* } + dark mode. NGUỒN DUY NHẤT.
   ├── shell.css        @import (họ A)
   ├── tools/tools.css  @import (họ B)
   ├── nav.js           đọc var() thay vì hex cứng
   └── mỗi trang C/D    <link> thay cho :root chép tay
```

Kèm `npm run check:theme` — bộ dò chặn mọi `:root` mới chép tay màu thương hiệu.
**Không có bước này, reskin sẽ trôi trong vòng 2 tuần.**

Đây là chỗ duy nhất plan đi ngược luật "thay đổi tối thiểu": nó tốn ~1 ngày
nhưng cắt 130 lần sửa tay xuống còn 1.

### 2.2 Giữ nguyên, KHÔNG đụng

- Engine an sao, `tools-shared/*`, đường tiền, prompt LLM — reskin là **da**, không
  phải xương.
- **102 icon SVG**: vẽ lại bằng SVG (bo góc `stroke-linejoin:round`, nét dày hơn,
  hơi nguệch ngoạc) — **KHÔNG rasterize thành ảnh**. 102 file PNG là giết mobile.
  Chi tiết ở mục 4.4.
- Luật `docs/ICONS.md` vẫn nguyên: không emoji màu, thêm icon phải bump `nav.js?v=`.

---

## 3. CHARACTER BIBLE — Minh Bảo

Không phải asset giao hàng. Đây là **bộ ảnh tham chiếu** để mọi prompt về sau
nhất quán. Làm đầu tiên, Henry duyệt xong mới gen tiếp bất cứ thứ gì.

| # | Ảnh | Khổ | Dùng để |
|---|---|---|---|
| 1 | Turnaround (chính diện / 3-4 / nghiêng) | 1536×1024 | khoá tỉ lệ, trang phục |
| 2 | Bảng biểu cảm ×8 (cười, nghĩ, "à ra thế", ngạc nhiên, bí ẩn, gật gù, tinh nghịch, ngái ngủ) | 1024×1024 | tái dùng cho UI state |
| 3 | Bảng dáng ×6 (ngồi gốc đa, chỉ tay, cưỡi trâu, cầm quạt, chống cằm, chạy) | 1536×1024 | khung minh hoạ |
| 4 | Bảng bối cảnh làng quê ×4 (cổng làng, sân đình, bờ ao, chợ quê) | 1536×1024 | nền cho mọi ảnh sau |
| 5 | Bảng phụ kiện (quạt giấy, thẻ tre, đèn lồng, con trâu, con cún) | 1024×1024 | motif lặp lại |

Tổng **~10 lượt gen**. Chốt xong đóng băng thành `docs/reskin-webtoon/bible.md` +
một khối prompt cố định (giống `ART_DIRECTION` trong `lib/media/tool-avatar-prompt.ts`).

**Hạ tầng đã có sẵn, không phải dựng mới:**
- `lib/image/openai-image.ts` — đã chạy `gpt-image-2`, đúng model Henry muốn.
- `scripts/gen-tool-avatars.mjs` / `gen-illus.mjs` / `gen-que-images.mjs` — đã có
  cơ chế skip file đã vẽ, `--dry-run`, `--sample`.
- `OPENAI_API_KEY` **đọc được trong container này** → gen chạy ngay tại phiên.
- ⚠️ Container chưa `npm install` → thiếu `sharp` (nén webp) và `tsc`. Chạy
  `npm ci` trước lượt gen đầu.

---

## 4. KHO ẢNH & ICON CẦN GEN

### 4.1 Tổng lượng — xếp theo độ ưu tiên

| Nhóm | Số ảnh | Khổ gen | Khổ giao | Vị trí |
|---|---|---|---|---|
| Character bible | ~10 | 1024–1536 | (không ship) | tham chiếu |
| Hero trang chủ | 2 (desktop + crop mobile) | 1024×1536 | 600×720 + 400×480 webp | thay `/minh-bao-hero.webp` |
| **Tool avatar** | **52** | 1024×1024 | 512×512 webp | `public/tool-avatars/` — dùng ở 53 trang app + springboard + `/cong-cu` |
| Con dấu / favicon / og | ~5 | 1024×1024 | 512 + 192 + 1200×630 | `seal.webp`, `og-image.webp`, `manifest.json` |
| Thẻ chia sẻ FB | 30 | 1536×1024 | 1200×630 webp | `public/img/fbcard-topics/` |
| Vận riêng 12 cung | 36 | 1024×1024 | 500w webp | `public/img/van-rieng/` |
| Vận ngày | 4 | 1536×1024 | 500w + 800w | `public/img/van-ngay/` |
| 64 quẻ Kinh Dịch | 64 | 1024×1536 | webp → Supabase Storage | tool Kinh Dịch / Mai Hoa |
| **Thư viện minh hoạ luận giải** | **~708** | 1536×1024 | webp → Supabase Storage | xem 4.2 |

**Tổng ≈ 910 ảnh.** Với `gpt-image-2` khổ `1024×1536` quality `medium` ≈ **1.090đ/ảnh**
(số này lấy từ chú thích trong `lib/image/openai-image.ts`, **phải tra lại bảng giá
OpenAI trước khi chốt ngân sách** — luật `lib/agent/usage.ts` cấm gõ giá từ trí nhớ).
→ ước **~1 triệu đồng** cho trọn bộ, trong đó thư viện minh hoạ chiếm ~78%.

### 4.2 🔴 Thư viện minh hoạ luận giải — khoản đắt nhất, đề nghị để CUỐI

Công thức từ `public/tools-shared/illus-match.js` + `lib/media/illus-prompt.ts`:

```
13 khía cạnh (12 cung + tổng quan)
 × 3 sắc thái (tốt / trung / xấu)
 × 2 giới (nam / nữ)
 × 5 bậc tuổi (nhi-đồng, thanh-niên, trưởng-thành, trung-niên, lão-niên)
 × 1–2 biến thể
≈ 708 ảnh
```

Cộng thêm bộ Xem Tuổi (`XEM_TUOI_CANH`: xét-tuổi, ngũ-hành, tứ-tượng, tính-cách,
vận-hành).

**Ba cảnh báo:**
1. Ảnh này nằm **trong sản phẩm người ta đã trả tiền** (Luận Giải, Chu Trình Cuộc
   Đời, Vận Hạn 12 Tháng). Đổi nét vẽ là đổi thứ khách đã mua — cần Henry xác nhận.
2. **Chưa audit bucket thật.** Con số 708 là số combo code SINH RA, không phải số
   file có trong Supabase Storage. Việc đầu tiên của phase này là đếm bucket thật.
3. `illusUrlForPhan` trả `null` khi thiếu ảnh và luận giải **im lặng không hiện** —
   nên gen dở dang không gãy trang, cho phép rải nhiều đợt.

### 4.3 Bảng tool avatar — mapping có sẵn

52 file trong `public/tool-avatars/`, bảng chủ đề từng tool đã nằm ở
`lib/media/tool-avatar-prompt.ts` (`TOOL_AVATARS`). Reskin = **thay khối
`ART_DIRECTION`/`LINE_STYLE`**, giữ nguyên `centralSubject` của từng tool. Đây là
lý do bộ này rẻ và nhanh: sửa 1 khối prompt, chạy `--all`.

⚠️ Luật đã ghi trong file đó: **không ép mọi tool có nhân vật người**. Với webtoon
đề xuất ngược lại — Minh Bảo xuất hiện ở **mọi** avatar (đó là điểm của "mascot
xuyên suốt"), nhưng vai trò khác nhau: tool luận người → Minh Bảo tương tác với
khách; tool tra cứu → Minh Bảo đứng bên cạnh vật thể (la bàn, lịch, vòng quẻ).

### 4.4 Icon — vẽ lại SVG, KHÔNG gen ảnh

102 icon trong `public/nav.js`. Webtoon hoá bằng cách:
- `stroke-linecap/linejoin: round`, `stroke-width` 1.5 → 2.2
- bo tròn các góc vuông, thêm chút bất đối xứng
- giữ nguyên **tên khoá** (`data-icon="wallet"`) → không trang nào phải sửa

Việc tay, ~2 ngày, không tốn tiền gen. Bump `nav.js?v=31`.

---

## 5. HOMEPAGE — mang shell ra ngoài

Henry muốn: `/` = shell (giống `/app`) + các phần marketing đẩy xuống dưới, gọn lại.

### 5.1 Hiện trạng
- `/` → `public/index.html`: 59 KB CSS inline, 8 section (hero + form chat, số liệu
  live, marquee câu hỏi, marquee tool, đánh giá, khảo luận, values, SEO strip, CTA).
  Ảnh hero là **phần tử LCP**.
- `/app` → `public/app-home.html` (132 KB): shell 3 cột, thẻ "Vận hôm nay",
  springboard, tour onboarding.

### 5.2 Đề xuất
`index.html` dựng theo khung shell (`.shell` > `.sb` + `.ws` + `.rail`), phần
`.ws-body` mang nội dung `/app` cho khách chưa đăng nhập, rồi **dưới đáy `.ws-body`**
là các section marketing đã nén còn ~4:
1. Số liệu live (giữ)
2. Marquee công cụ (giữ, gọn lại)
3. Đánh giá người dùng (giữ)
4. SEO strip + footer (giữ — **không được cắt**, đây là đường SEO)

Cắt: marquee câu hỏi (trùng chip rail), khối values (đưa vào `/about`), CTA đáy
(rail đã luôn hiện).

### 5.3 🔴 Rủi ro phải nói trước
`/` là trang SEO quan trọng nhất và đang được `lighthouserc.mobile.json` canh:
**LCP ≤ 4000ms · CLS ≤ 0,1 · TBT ≤ 600ms**.

Mang shell ra homepage = bắt trang đó nạp thêm **`shell.js` 223 KB + `shell.css`
85 KB**. Repo đã có tiền sử đúng loại này (CLAUDE.md: box JS chèn đầu khung nội
dung vừa gây CLS vừa LÀ phần tử LCP).

**Giảm thiểu:**
- Hero + form khai sinh dựng **tĩnh trong HTML**, không để JS chèn (`check:introcard`).
- `shell.js` tách phần rail chat sang `defer` / nạp khi tương tác.
- Khung chờ đặt sẵn cho sidebar + rail, nhắm DƯ.
- ⚠️ **CLS chỉ kết luận được bằng prod↔prod** — preview đo hụt (0,016 vs 0,160 thật).
  Phải đo lại sau khi lên prod, không tin số preview.
- ⚠️ Khối trong `.ws` co theo **bề rộng CỘT** (~360px ở desktop sau khi trừ sidebar
  246 + rail 336), không theo viewport. Mọi khối marketing bê vào `.ws` phải khai
  `container-type` + `@container`, `@media(max-width:600px)` sẽ KHÔNG khớp.

---

## 6. LỘ TRÌNH — mỗi phase có cổng duyệt sample

Luật Henry: **trước khi reskin page nào phải làm sample, duyệt xong mới làm thật.**

| Phase | Nội dung | Sample cần duyệt | Ước |
|---|---|---|---|
| **0** | `theme.css` + `check:theme` + gom 31 `:root` chép tay | — (không đổi pixel nào) | 1–2 ngày |
| **1** | Character Bible Minh Bảo | **10 ảnh bible** | 1 ngày |
| **2** | Chrome: `nav.js` topnav+footer, 102 icon SVG, bảng màu webtoon | **1 ảnh chụp topnav + footer + bảng 102 icon** | 2–3 ngày |
| **3** | App shell (`shell.css`) — 53 trang cùng lúc | **`/app` + `/app/la-so` + `/app/luan-giai`** | 3–4 ngày |
| **4** | Homepage revamp (mục 5) | **`/` mobile + desktop** | 3–4 ngày |
| **5** | Tool avatar ×52 | **5 ảnh mẫu** (`--sample` đã có sẵn) | 2 ngày |
| **6** | SEO tool pages (`tools.css` + 13 trang chép tay) | **`/tools/an-sao.html`** | 2–3 ngày |
| **7** | 26 route SEO server-render | **`/tu-dien` + `/van-han`** | 2–3 ngày |
| **8** | Ảnh phụ: fbcard 30, vận riêng 36, vận ngày 4, 64 quẻ | **3 ảnh mỗi nhóm** | 2 ngày |
| **9** | 🔴 Thư viện minh hoạ ~708 ảnh | **6 ảnh mẫu** + Henry xác nhận đổi nét vẽ sản phẩm đã bán | rải nhiều đợt |
| **10** | Giọng văn: rà chữ hiển thị sang tông hóm hỉnh | **3 trang mẫu** | 2–3 ngày |

Phase 0–4 là **đường tới hiệu quả nhìn thấy được**. Phase 5–9 là bề rộng.

### Tách worktree (Henry đã cho phép)
Chạy song song được, không giẫm chân nhau:
- `wt-icons` — Phase 2 icon SVG (chỉ đụng `nav.js`)
- `wt-gen` — Phase 5/8/9 gen ảnh (chỉ đụng `scripts/` + `lib/media/` + asset)
- `wt-seo` — Phase 7 (chỉ đụng `app/**/route.ts`)

Nhánh chính giữ Phase 0/3/4 vì chúng đụng `theme.css` + `shell.css` + `index.html`.

---

## 7. MOBILE-FIRST — luật cứng cho mọi ảnh

| Khoản | Luật |
|---|---|
| Định dạng | Gen PNG → **luôn** chuyển `.webp` bằng `sharp` trước khi commit |
| Khổ giao | Avatar 512² · hero 600×720 (mobile 400×480) · minh hoạ 800w · fbcard 1200×630 |
| `srcset` | Ảnh ≥800w phải có 2 bậc. ⚠️ `srcset`+`sizes` hiểu **viewport**, không hiểu container — lệch với `.ws` khi rail mở |
| CLS | Mọi `<img>` khai `width`+`height` thật. Giữ chỗ chỉ có tác dụng khi khối CÓ MẶT ở lần vẽ đầu |
| Ngân sách | Ảnh hero ≤ 100 KB · avatar ≤ 50 KB · minh hoạ ≤ 120 KB |
| Lazy | Mọi ảnh dưới màn hình đầu: `loading="lazy" decoding="async"`. Hero: `fetchpriority="high"` |

---

## 8. GIỌNG VĂN — "vui nhộn nhẹ nhàng, gần gũi hóm hỉnh"

Đây là phần **rẻ nhất mà đổi cảm giác nhiều nhất**, nhưng rủi ro cao vì chạm 2 luật
đã có:

1. **Luật `docs/luat/chu-hien-thi.md`**: cấm khoe "AI"/"trí tuệ nhân tạo" như điểm
   nổi bật. Reskin không được lách luật này (3 trang pháp lý là ngoại lệ).
2. **Luật prompt LLM**: `lib/agent/prompts.ts` có **3 họ prompt khác nhau**
   (`arcCore` rail chat · `arcDoc` bản luận dài · `arcGiong` JSON chở giọng).
   Đổi giọng Minh Bảo phải sửa **`arcGiong`**, và luật đã ghi: *"khối mới phải THAY,
   không cộng dồn"* + *"dạy bằng VÍ DỤ rẻ và ăn hơn dạy bằng LUẬT"*.
   `npm run check:prompt` có trần — chạm trần thì CẮT chỗ khác, đừng nới.

Đề xuất: Phase 10 làm **sau** khi hình đã xong, để giọng bám theo hình chứ không
ngược lại.

---

## 9. QC — 46 bộ dò sẽ kêu, biết trước để không hoảng

Reskin chạm vào vùng của các bộ dò này:

| Bộ dò | Vì sao kêu | Xử |
|---|---|---|
| `check:font` | Nếu thêm font display webtoon | Self-host vào `public/fonts/` + preload 400, **cấm** Google Fonts |
| `check:introcard` | Phase 4 đụng khối intro đầu homepage | Giữ dựng tĩnh trong HTML |
| `check:navph` / `check:formph` | Giữ chỗ nav/form đổi chiều cao | Đo lại, cập nhật số |
| `check:illus` / `check:motifs` | Phase 8/9 | Không đổi bảng khoá, chỉ đổi prompt |
| `check:prices` | Nếu lỡ ghi số giá vào UI mới | **Client không chép số giá.** Đọc hụt → `…` + paywall từ chối chạy |
| `check:nostore` | Nếu thêm GET Supabase mới | `cache:'no-store'` — đã cắn 3 lần |
| Lighthouse | Phase 4 | Đo prod↔prod, không tin preview |
| Playwright 16 spec | Phase 3/4 đổi selector | Cập nhật spec cùng PR, dùng web-first assertion |

⚠️ `tsc --noEmit` xanh **không** chứng minh `next build` chạy (đã 7 lượt deploy
ERROR). Phải để job `next-build` xanh.

⚠️ Thêm icon mới → sửa `ICONS` **và bump `nav.js?v=`**. Nút CHỈ-icon **cấm
`textContent`** (xoá mất `<svg>`).

---

## 10. CÂU HỎI CHỜ HENRY CHỐT

1. **Ảnh mẫu mascot + design mẫu** — chưa nhận được, xem mục 0.1.
2. **Bảng màu webtoon**: giữ navy/gold làm gốc (an toàn, nhận diện cũ) hay đổi hẳn
   sang tông sáng ấm kiểu tranh Đông Hồ (vàng nghệ, đỏ son, xanh chàm, giấy dó)?
   Tao nghiêng về phương án 2 — navy hiện tại kéo tông về "trang nghiêm", ngược hẳn
   với brief "vui nhộn nhẹ nhàng".
3. **Thư viện minh hoạ ~708 ảnh**: gen trọn bộ (~800k đ), hay thu hẹp ma trận (bỏ
   bậc tuổi, còn ~140 ảnh)? Ảnh này nằm trong sản phẩm đã bán.
4. **Phase 0 (`theme.css`)**: duyệt không? Nó không đổi một pixel nào nhưng là thứ
   giữ reskin khỏi trôi.
5. **Bắt đầu từ đâu**: tao đề nghị Phase 0 → 1 (bible) → 2 (chrome) → 3 (shell), vì
   Phase 3 xong là **53 trang đổi da cùng lúc** — cú hích nhìn thấy được lớn nhất
   trên mỗi giờ bỏ ra.
