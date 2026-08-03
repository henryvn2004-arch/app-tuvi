# Content Pipeline dạng Media — kế hoạch phân phối đa kênh

**Trạng thái:** ĐỀ XUẤT (chưa code gì) · **Ngày:** 2026-08-01
**Bối cảnh:** SEO đã chốt là kênh CHẬM (domain 4 tháng, 617/616.715 URL có
impression, 18 click/28 ngày). Chuyển trọng tâm sang kênh phân phối chủ động.
**Ràng buộc Henry đặt:** không có ngân sách tiền — chỉ làm cái free hoặc rất rẻ.

---

## 0. 🔴 Phát hiện trước khi lập kế hoạch: pipeline ĐÃ TỒN TẠI và đang ĐỨT

Trước khi vẽ thêm bất cứ thứ gì, đã đo lại hạ tầng đang chạy. Kết quả đảo ngược
giả định ban đầu — **không phải xây từ đầu, mà là nối lại chỗ gãy**:

```
cron-khao-luan (viết bài)
      ↓
pg_cron 07:00 VN  →  edge auto-pipeline
      ↓
  van_dap row  →  edge tts  →  Railway mix (ffmpeg)  →  edge youtube-upload  →  YouTube
                    ✅ CHẠY        🔴 ĐỨT 16/07           🔴 ĐỨT (invalid_grant)
```

### Số đo `van_dap` (132 dòng)

| Trạng thái | Số bài | Mới nhất |
|---|---:|---|
| Video **render xong**, YouTube **lỗi** | **86** | 16/07 |
| Có audio, **chưa render video** | **29** | **01/08** |
| Đã lên YouTube (`live`) | **15** | 10/04 |

**Nghĩa là: 85 video đã render hoàn chỉnh đang nằm kho không đăng được, và mỗi
ngày vẫn đẻ thêm một bài mới mắc kẹt.** Cái máy vẫn chạy, chỉ có đầu ra bị bịt.

### Hai chỗ đứt, đã truy ra nguyên nhân

**1. YouTube OAuth chết — 84/86 lỗi là cùng một lỗi:**
```
Cannot get access token: {"error":"invalid_grant","error_description":"Bad Request"}
```
Đây là dấu hiệu kinh điển của **OAuth consent screen còn ở chế độ "Testing"**
trong Google Cloud: refresh token loại đó **hết hạn sau 7 ngày**. Khớp với việc
nó chết đúng hai lần (22/04 và 16/07) rồi lại chạy sau khi cấp token mới — token
mới cũng chỉ sống được vài ngày. Vá bằng cách cấp lại token là **vá triệu chứng,
tuần sau chết tiếp**. Phải chuyển consent screen sang **"In production"**.

**2. Khâu render video (Railway) ngừng từ 16/07.** `pg_cron` báo `succeeded` mỗi
ngày nhưng đó chỉ là "gọi HTTP xong", không phải "pipeline chạy xong" — 29 bài
có audio mà không có video là bằng chứng nó tắc ở bước mix.
Nghi vấn hàng đầu: **Railway free trial hết credit** (service
`tuvi-mix-service-production.up.railway.app`). Container phiên này bị chặn mạng
ngoài nên không xác minh được — **việc tay Henry, mục 6**.

> ⚠️ **`video_duration_sec` NULL ở cả 100 video** → không biết video dài bao
> nhiêu, tức không biết có tái dùng được cho Shorts/TikTok không. Phải mở một
> video thật ra xem trước khi tính chuyện cắt dọc.

### Kho nguyên liệu sẵn có (không phải sản xuất mới)

| Nguồn | Số lượng | Dùng làm media gì |
|---|---:|---|
| `khao_luan` | 324 | trích dẫn ảnh, video vấn đáp |
| `master_articles` (Nghiên Cứu) | 310 | carousel "3 điều về X" |
| `seo_pages` | 8.958 | card "tuổi X năm 2027" |
| `van_dap` | 132 | video (đã có audio + video) |
| `shared_results` | 27 | ảnh chân dung đã được chính chủ công khai |
| Tools (Kim Lâu, xem tuổi…) | 21 free | card tra cứu nhanh + CTA |

**Chưa từng dùng:** `van_dap` đã có sẵn cột `tt_status`/`tt_url` (TikTok) và
`fb_status`/`fb_post_id`/`fb_url` (Facebook) — schema đã dự trù đa kênh nhưng
không có dòng code nào ghi vào. (Xem §3 vì sao KHÔNG đi tiếp theo hướng đó.)

---

## 1. Kênh — cái nào có thật, cái nào là ảo tưởng

Tiêu chí xếp hạng: **(a) tự đăng được bằng API hay không · (b) hạ tầng đã có sẵn
bao nhiêu · (c) đối tượng người Việt · (d) chi phí.**

### Nhóm A — tự đăng được, hạ tầng gần như đã có

| Kênh | API | Đã có sẵn gì | Rào cản |
|---|---|---|---|
| **Facebook Page** | Graph API | `MESSENGER_PAGE_ACCESS_TOKEN`, `MESSENGER_PAGE_ID`, helper `graphPost()` trong `lib/channels/meta.ts` | cần quyền `pages_manage_posts`; app đang Development mode |
| **YouTube (+ Shorts)** | Data API v3 | edge `youtube-auth` + `youtube-upload`, 85 video chờ | OAuth phải sang "In production" |
| **Instagram** | Graph API (IG Business) | cùng App Meta, cùng Page | cần liên kết IG Business vào Page; ảnh phải có URL công khai (Supabase Storage đã public) |
| **Threads** | Threads API (Meta) | cùng hệ Meta | tạo app Threads riêng + OAuth |
| **Telegram channel** | Bot API | `TELEGRAM_BOT_TOKEN` đã chạy | gần như không có; đối tượng nhỏ |

### Nhóm B — đáng làm, cần thủ tục

| Kênh | Đánh giá |
|---|---|
| **TikTok** | Content Posting API cần app review. Chưa duyệt thì chỉ đẩy được vào **hộp nháp** của app TikTok — Henry mở app bấm đăng, vẫn tiết kiệm 90% công. Đối tượng VN mạnh nhất trong tất cả. |
| **Zalo OA** | Đối tượng người Việt đúng nhất. Cần CCCD/GPKD, Henry từng đăng ký dở (track cũ). API đăng bài + broadcast free. |
| **Podcast (Spotify for Creators)** | 💡 **Món hời bị bỏ quên: pipeline đã sinh sẵn file audio TTS cho 130 bài.** Spotify nhận RSS feed — chỉ cần sinh một file RSS từ audio đã có là thành kênh podcast, chi phí **≈ 0đ**, không cần render gì thêm. |
| **Pinterest** | API v5 free, ảnh dọc hợp ngành. Người Việt ít dùng → giá trị chính là backlink + tín hiệu thương hiệu, không phải traffic. Xếp sau. |

### Nhóm C — bỏ, đừng tốn thời gian
LinkedIn (sai đối tượng) · Lotus/Gapo (chết) · X/Twitter (người Việt mảng tử vi
gần như không có) · Reddit (cộng đồng Việt quá nhỏ).

### Backlink — cái gì thật sự free

- ✅ **Mỗi kênh social ở trên tự nó là một backlink + tín hiệu thực thể (entity)
  cho Google.** Đây là phần giao nhau giữa "làm social" và "làm SEO" — làm một
  lần được cả hai, và là cách xây thẩm quyền tên miền rẻ nhất đang có.
- ✅ Thư mục công cụ AI (theresanaiforthat, futuretools…) — free, dofollow.
- ✅ Product Hunt — một lượt launch, free.
- ⚠️ Guest post / trao đổi link với blog tử vi VN — hiệu quả nhất nhưng **không
  tự động hoá được**, Henry phải tự đi quan hệ.
- ❌ Mua backlink: vừa tốn tiền vừa rủi ro phạt. Không.

---

## 2. Nguyên tắc thiết kế (rút từ những lần vấp trong repo này)

1. **Đứt ở đâu phải nhìn thấy ở đó.** Bài học đắt nhất của chính pipeline này:
   nó chết từ 16/07 mà không ai biết, vì `pg_cron` báo `succeeded` cho một lượt
   gọi HTTP chứ không cho kết quả thật. Mọi bước mới BẮT BUỘC ghi trạng thái vào
   DB và hiện trên admin.
2. **Mặc định KHÔNG tự đăng.** Theo đúng tiền lệ M0.6 autopilot: công tắc tổng
   `app_config['social.autopost_enabled']` mặc định **false**, mỗi kênh còn một
   khoá phụ riêng. Tắt thì pipeline vẫn chạy đủ — chỉ dừng ở hàng đợi chờ duyệt.
   Đăng nhầm lên trang công khai không rút lại được như một dòng DB.
3. **Qua cổng brand-check (#356) trước khi vào hàng đợi.** Caption do LLM viết
   là văn bản đối ngoại, đúng loại mà cổng đó sinh ra để chặn.
4. **Không dùng model sinh ảnh.** `next/og` (Satori) đã có sẵn trong repo, render
   ảnh server-side **miễn phí**. Ảnh AI 1.658đ/lượt là khoản đắt nhất hệ thống —
   không đưa nó vào một pipeline chạy hằng ngày.
5. **Chỉ lấy nội dung đã công khai.** Nguồn ảnh chân dung là `shared_results`
   (chính chủ đã bấm Chia sẻ), tuyệt đối không đụng `spouse_portraits` /
   `past_life_portraits` / lá số người dùng. Luật này đã có ở V4, giữ nguyên.
6. **Mỗi post mang UTM riêng** (`utm_source=<kênh>&utm_medium=social&utm_campaign=<loại>`).
   Bảng "Chiến dịch UTM" trong admin đang trống rỗng — đây là thứ làm nó có số,
   và là cách duy nhất biết kênh nào đáng làm tiếp.

---

## 3. Kiến trúc

### Vì sao KHÔNG mở rộng `van_dap` (dù nó đã có cột `fb_*`/`tt_*`)

Mấy cột đó chính là cái bẫy: thêm một kênh là thêm 3 cột, thêm một định dạng là
thêm 3 cột nữa. Và `van_dap` là bảng của **một loại nội dung** (vấn đáp video) —
trong khi nguồn mới gồm khảo luận, nghiên cứu, trang SEO, tool, chân dung, mỗi
thứ đẻ ra nhiều biến thể (ảnh vuông, ảnh dọc, carousel, video ngắn). Một dòng
`van_dap` không chứa nổi, và ép nó chứa thì mỗi kênh mới lại phải sửa schema.

### Hai bảng mới, tách bạch theo đúng câu hỏi chúng trả lời

```
media_assets   — "FILE này là gì, dựng từ đâu"
  id · source_type (khao_luan|nghien_cuu|seo_page|tool|share|van_dap) · source_id
  · variant (quote_4x5 | carousel_4x5 | story_9x16 | video_9x16 | video_16x9)
  · url · width · height · duration_sec · created_at

media_posts    — "bài đăng này lên KÊNH nào, tới đâu rồi"
  id · asset_id · channel (facebook|instagram|threads|youtube|tiktok|telegram)
  · caption · hashtags · link_url (đã gắn UTM)
  · status (queued|approved|publishing|live|error|skipped)
  · scheduled_at · published_at · external_id · external_url · error · meta
```

Một asset → nhiều post (một ảnh đăng được cả FB, IG, Threads). Thêm kênh = thêm
một adapter, **không đụng schema**.

### Adapter kênh

`lib/social/<kênh>.ts`, cùng một interface:
```ts
interface SocialChannel {
  key: string;
  enabled(): Promise<boolean>;        // đọc app_config, fail-safe → false
  publish(post, asset): Promise<{ externalId: string; url: string }>;
}
```
Facebook/Instagram/Threads dùng lại `graphPost()` sẵn có trong
`lib/channels/meta.ts` — cùng nền Graph, không viết lại lớp HTTP.

### Hai cron

- **`cron/media-build`** (hằng ngày) — chọn nguồn theo luật xoay vòng → render
  asset qua `/api/og/social` → LLM viết caption → **brand-check** → xếp vào
  `media_posts` trạng thái `queued`.
- **`cron/social-publish`** (mỗi giờ) — lấy post `approved` (hoặc `queued` nếu
  kênh đó đã bật auto) tới hạn → gọi adapter → ghi `live`/`error`.

Cả hai vào sổ `lib/ops/jobs.ts` — quên ghi sổ là tái lập đúng lỗ hổng "job chết
âm thầm" vừa nói ở §2.1.

### Monitor trong admin

Trang mới **`social`** (cạnh Marketing), 4 khối:
1. **Hàng đợi chờ duyệt** — xem trước ảnh + caption, nút Duyệt / Sửa / Bỏ.
2. **Lịch 7 ngày tới** — bài nào lên kênh nào, giờ nào.
3. **Sức khoẻ kênh** — mỗi kênh: đăng thành công / lỗi / lần cuối, badge BẬT-TẮT
   auto. Đây là chỗ lẽ ra phải hiện "YouTube chết 16 ngày" từ tháng 7.
4. **Kết quả** — click về site theo kênh (đọc từ UTM đã có sẵn trong `events`).

---

## 4. Workplan

Mỗi mốc = 1 PR draft → CI xanh → squash-merge, theo đúng quy ước repo.

### 🔴 M1 — Xả kho 85 video (ưu tiên tuyệt đối, gần như 0 công code)

Đây là việc có tỉ lệ lợi/công cao nhất trong toàn bộ kế hoạch: **nội dung đã sản
xuất xong và trả tiền rồi, chỉ đang bị khoá ngoài cửa.**

- Việc tay Henry: OAuth consent screen → **In production**; kiểm Railway còn sống.
- Code: `youtube-upload` báo lỗi ra `events`/Telegram thay vì chỉ ghi `yt_error`
  im lặng; thêm cron **xả tồn kho có tiết chế** — 2–3 video/ngày, không dồn 85
  video lên một lúc (YouTube có ngưỡng chống spam, và lịch sử `van_dap` đã dính
  đúng lỗi `uploadLimitExceeded` 2 lần hồi tháng 4).
- **Kết quả kỳ vọng: kênh YouTube từ 15 video lên ~100 trong 4–5 tuần, 0đ.**

### M2 — Xương sống + kênh Facebook

2 bảng · `/api/og/social` (Satori: 1080×1350 và 1080×1920) · adapter Facebook ·
`cron/media-build` · trang admin `social`. Facebook đi trước vì **token và helper
đã có sẵn 100%** — kênh duy nhất chạy được mà không phải xin gì thêm.

### M3 — Instagram + Threads
Cùng hệ Meta, mỗi cái ~1 adapter. Ảnh đã render ở M2 dùng lại nguyên vẹn.

### M4 — Video dọc 9:16
Tái dùng Railway mix (đã có ffmpeg) thêm một đầu ra dọc → YouTube Shorts (API đã
có) + TikTok (đẩy vào hộp nháp). **Chỉ làm sau khi M1 chứng minh Railway còn
sống** — không thì xây trên nền đã sập.

### M5 — Podcast RSS + Telegram channel
Sinh RSS từ audio TTS đã có → Spotify. Rẻ nhất trong tất cả, gần như chỉ là một
route trả XML.

### M6 — Zalo OA · Pinterest · thư mục backlink
Phụ thuộc thủ tục đăng ký, làm khi có.

---

## 5. Chi phí

| Khoản | Chi phí |
|---|---|
| Render ảnh (Satori) | **0đ** |
| Caption LLM | ~35đ/bài → **~1.000đ/ngày** cho 30 bài |
| Render video | Railway — **cần Henry xác nhận gói hiện tại** |
| TTS | đã chạy sẵn, không phát sinh thêm |
| API các kênh | **0đ** |

Trừ Railway ra thì cả pipeline dưới **35.000đ/tháng**.

---

## 6. ⚠️ Việc tay Henry (chặn M1, không code thay được)

1. **Google Cloud → OAuth consent screen → "PUBLISH APP"** (chuyển khỏi Testing).
   Không làm bước này thì cấp token mới cũng chỉ sống 7 ngày.
2. **Cấp lại refresh token YouTube** (chạy `youtube-auth`) sau khi publish app.
3. **Kiểm Railway** `tuvi-mix-service-production.up.railway.app` còn sống không —
   nghi hết credit free. Nếu chết: còn dùng được Railway free tier mới, hoặc
   chuyển hẳn khâu mix sang một edge function/GitHub Actions (chậm hơn nhưng free).
4. **Mở một video `van_dap` bất kỳ xem thử** — cần biết nó trông ra sao và dài
   bao nhiêu trước khi quyết có cắt thành Shorts được không (`video_duration_sec`
   NULL toàn bộ, không tra được bằng SQL).
5. Đăng ký TikTok + Instagram (Henry đã nói sẽ làm).
6. Quyết: **duyệt tay hay cho tự đăng thẳng** từng kênh.
