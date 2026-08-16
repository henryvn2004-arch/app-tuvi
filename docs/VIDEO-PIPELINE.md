# Dựng video ngắn 9:16 — hạ tầng + cổng kiểm

**Trạng thái:** hạ tầng chạy được · **18/18 công cụ miễn phí đã có kịch bản +
công thức quay**, cả 18 qua cổng 1 · **2026-08-15**

## 18 công cụ trong lô

Đúng bằng danh sách `tool_pricing where enabled and is_free` (tra lại DB trước
khi tin con số này). Ba cái **KHÔNG quay được từ bản phục vụ tĩnh `public/`** —
khai `localPath: null` để hỏng TO ngay thay vì quay ra clip sai:

| Công cụ | Vì sao cần prod / `next dev` |
|---|---|
| `ky-mon` | cần `/api/qimen` (định cục theo tiết khí, chạy ở server) |
| `ban-do-sao` | cần `/api/natal` (vị trí hành tinh) |
| `tuong-hop` | nhận diện chế độ bằng ĐƯỜNG DẪN — mở `/app-xem-tuoi.html` rơi vào bản **trả phí**, dựng tường thanh toán giữa clip |

15 cái còn lại quay được từ bản phục vụ tĩnh: `cd public && python3 -m
http.server 8099` rồi `--base http://127.0.0.1:8099`.
Ba cái trên thì chạy `next dev` (đã quay thật được ở đây theo đường này):

```bash
npx next dev -p 3111
node scripts/record-tool-demo.mjs --tool ky-mon --base http://127.0.0.1:3111
```

🪤 **Chốt chặn THĂM DÒ THẬT, không đoán theo tên máy.** Bản đầu suy từ host
(`localhost` ⇒ bản tĩnh) và nó chặn oan đúng cái đường mà chính thông báo lỗi
của nó khuyên dùng — `next dev` cũng chạy ở `127.0.0.1` nhưng có đủ rewrite
`/app/*` lẫn route API. Nay hỏi thẳng: `recipe.path` mở được thì dùng, không
thì mới rơi về `localPath`, và `localPath: null` là dừng hẳn.

## Chạy

```bash
# 1. Quay màn hình công cụ (cần trình duyệt ra được mạng — xem "Hạn chế")
node scripts/record-tool-demo.mjs --tool than-so-hoc

#    Ở container không cho trình duyệt ra Internet thì phục vụ public/ tại chỗ:
cd public && python3 -m http.server 8099 &
node scripts/record-tool-demo.mjs --tool than-so-hoc --base http://127.0.0.1:8099

# 2. Chạy cổng kiểm + render
node scripts/gen-video.mjs --tool than-so-hoc              # đủ cả 2 cổng
node scripts/gen-video.mjs --tool than-so-hoc --dry-run     # chỉ chạy cổng
node scripts/gen-video.mjs --tool than-so-hoc --still --frame=300
node scripts/gen-video.mjs --tool than-so-hoc --no-audience # bỏ cổng 2

# 3. Dựng cả LOẠT (quay → cổng → giọng → render → soi file), một lệnh
node scripts/build-video-batch.mjs --all
node scripts/build-video-batch.mjs --tools than-so-hoc,kim-lau
node scripts/build-video-batch.mjs --all --dry-run
```

## Chạy trên GitHub Actions — `.github/workflows/video-build.yml`

Vào tab **Actions → Video Build → Run workflow**. Ba ô: tool cần dựng (bỏ trống
= tất cả) · dựng lại kể cả khi đã có file · trang để quay. Clip tải về ở mục
**Artifacts** của lượt chạy đó.

**Vì sao Actions chứ không phải chỗ khác** — đã loại từng cái:

| Chỗ | Vì sao không |
|---|---|
| Vercel cron | hàm trần **300 giây**, một clip render ~4 phút; và không có Chromium để quay |
| Session Claude Code | ephemeral, và container KHÔNG cho Chromium ra Internet (`curl` thì được) nên không quay được prod |
| **GitHub Actions** ✅ | repo **đã** chạy Playwright + Chromium ở đây, có CPU, có lịch, artifact tải về được |

Toàn bộ logic nằm ở `scripts/build-video-batch.mjs`, YAML chỉ gọi nó — cùng một
lệnh phải chạy được ở máy khi cần dựng gấp một clip. YAML thì chỉ CI chạy được,
sửa gì cũng phải push mới biết đúng sai.

**Bốn tính chất chép từ `yt-drain`** (kho video đã trả giá cho cả bốn): tuần tự
từng tool · hỏng một tool không kéo cả loạt · ngân sách thời gian dừng giữa hai
tool · nối lại được (đã có mp4 thì bỏ qua).

### 🔴 Chốt riêng của khâu này: soi lại file, coi clip CÂM là TRƯỢT

`gen-video.mjs` cố ý **fail-soft** với giọng đọc — thiếu khoá TTS thì vẫn render,
chỉ là clip câm. Chạy tay thì đó là lựa chọn đúng (vẫn duyệt được bố cục). Chạy
tự động hàng loạt thì đó là cách hỏng tệ nhất: 18 clip câm vẫn báo "thành công"
và vẫn đi tiếp ra hàng đợi đăng. Nên `build-video-batch.mjs` đọc lại mp4 và bắt
buộc có **cả track hình lẫn track tiếng**, dài ≥8 giây.

## 📤 Nộp clip lên kho — `scripts/publish-clips.mjs`

Clip render ở Actions chỉ nằm trong *artifact*, mà artifact **hết hạn sau 14
ngày**. Bước này đẩy `remotion/out/*.mp4` lên Supabase Storage (bucket `clips`,
công khai) rồi ghi một dòng `media_assets`.

```bash
node scripts/publish-clips.mjs --dry-run     # chỉ in kế hoạch
node scripts/publish-clips.mjs               # nộp mọi clip trong out/
node scripts/publish-clips.mjs --tools kim-lau
```

### 🔐 KHÔNG đặt `SUPABASE_SERVICE_KEY` vào GitHub Actions

Đi qua hàm edge **`clip-ingest`** (`_patches/edge-clip-ingest.deno.ts`), hàm
này giữ service key ở phía server. Runner chỉ cầm **`CLIP_INGEST_SECRET`** —
làm được đúng một việc là nộp clip, xoay lại bằng một dòng, và nếu lộ thì thiệt
hại tối đa là vài clip rác trong kho. Service key thì mở toang cả DB, và **đã
phải xoay một lần vì lộ**.

| Nơi đặt | Khoá |
|---|---|
| Supabase → Edge Functions → clip-ingest → Secrets | `CLIP_INGEST_SECRET` |
| GitHub → Settings → Secrets → Actions | `CLIP_INGEST_SECRET` |

Chưa khai thì bước nộp **tự bỏ qua CÓ BÁO** (không đánh hỏng cả lượt dựng) —
clip vẫn tải về được ở mục Artifacts.

### ⚠️ NỘP KHO ≠ XẾP HÀNG ĐĂNG

Script này **cố ý không tạo dòng `media_posts`**. Hai lý do:

1. Biến một clip thành bài đăng là quyết định NỘI DUNG (caption, hashtag, kênh
   nào trước) — phải có người chốt.
2. `publishQueue` quét theo **TRẠNG THÁI**, không lọc theo kênh. Chèn vào đó với
   một `channel` chưa có adapter là nó đánh `error` cho cả lô ngay lượt cron kế
   tiếp — tự tay làm hỏng hàng đợi của chính mình.

### 🪤 Body lớn + nhánh TỪ CHỐI = treo 150 giây, không phải lỗi của bạn

Đo trên hàm đã deploy: request bị từ chối mà mang body **100KB** trả lời trong
**0,7s**; cùng nhánh đó với body **4MB** thì **treo 150 giây rồi 504**. Đã thử
huỷ luồng body ngay trong hàm (`req.body.cancel()`) — **không ăn thua**, đây là
hành vi của cổng Supabase chứ không sửa được từ bên trong.

⇒ Chốt nằm ở phía gửi: script hỏi `?ping=1` (body rỗng) để **soát khoá trước**,
rồi mới nộp file. Không có bước đó thì một secret sai trong Actions = 18 clip ×
150 giây treo, job hết giờ, và dòng lỗi cuối cùng là một con số `504` chẳng chỉ
vào đâu.

## Đường ra kênh — trạng thái thật

| Chặng | Trạng thái |
|---|---|
| Dựng clip (Actions) | ✅ chạy được |
| Nộp kho (Storage + `media_assets`) | ✅ dựng xong, **chờ khai secret** |
| Xếp hàng đăng (`media_posts`) | ⏸️ cố ý chưa làm — chờ chốt chiến lược nội dung |
| YouTube | ✅ đường ĐANG CHẢY, nhưng cho `van_dap`: 3 video/ngày, còn 63 trong kho (~21 ngày). Clip cần **làn riêng**, đừng chen vào hàng đó |
| Facebook | ⚠️ adapter có, nhưng 33 bài kẹt từ 02/08 vì token hết hạn |
| TikTok · Reels | ❌ chưa có adapter |

### Khoá (secret) — không khai thì vẫn chạy, chỉ kém đi

| Secret | Thiếu thì sao |
|---|---|
| `GEMINI_API_KEY` **hoặc** `ANTHROPIC_API_KEY` | tự chạy `--no-audience` **và in cảnh báo** lên trang chạy — bỏ qua cổng 2 chứ không im lặng |
| `SUPABASE_ANON_KEY` · `SUPABASE_URL` | dùng anon key công khai nằm sẵn trong mã client (không phải bí mật) |
| `CLIP_TTS_SECRET` | chỉ cần nếu sau này siết hàm edge TTS |
| `CLIP_INGEST_SECRET` | **bỏ qua bước nộp kho** kèm cảnh báo trên trang chạy — clip chỉ còn trong artifact, mất sau 14 ngày |

**💰 Cache giọng đọc** là bước đáng giá nhất: TTS là khoản chi phí **biến đổi duy
nhất** (nhạc · quay · render · cổng 1 đều 0đ). Tên file mp3 chính là băm của
(chữ + giọng + tốc độ) nên cache theo thư mục an toàn tuyệt đối — sửa một câu
thì chỉ câu đó sinh lại. Không có nó thì mỗi lượt 18 clip đốt lại **126 lượt TTS**.

⚠️ **CỐ Ý chưa có `schedule`.** Chạy tự động hằng ngày chỉ có nghĩa khi đã có đủ
kịch bản cho nhiều tool VÀ đã nối được đường đăng bài. Bật lịch lúc mới có 1
kịch bản là mỗi sáng dựng lại đúng một clip đã có.

## Bốn lớp

| Lớp | Ở đâu | Việc |
|---|---|---|
| Nguồn | `lib/video/sources/*.ts` | Mỗi loại clip một adapter → trả về `ScriptSpec` |
| Hợp đồng | `lib/video/script-spec.ts` | Shape DUY NHẤT giữa nguồn và khâu dựng |
| Cổng | `lib/video/gate-*.ts`, `viral-loop.ts` | Kiểm, sửa, kiểm lại — tối đa 3 vòng |
| Dựng | `remotion/src/*` | Template React → mp4 1080×1920 |

Thêm loại clip mới = **một adapter + một template**. Không đụng cổng, không đụng khâu render.

## Vòng lặp kiểm

```
ScriptSpec → CỔNG 1 (máy, 0đ) → CỔNG 2 (7 người xem giả lập, ~35đ) → render
                  ↑                          ↓ trượt
                  └────── LLM viết lại ──────┘   (tối đa 3 vòng, hết thì BỎ clip)
```

- **Cổng 1** (`gate-machine.ts`): thời lượng, nhịp, hook, phụ đề, CTA, rò chữ kỹ thuật.
  Chỉ nhận thứ **đo được chắc chắn**. Hai mức `block`/`warn`.
- **Cổng 2** (`gate-audience.ts`): 7 chân dung người lướt TikTok Việt, mỗi người trả lời
  *"bạn lướt đi ở giây thứ mấy, vì sao"* → tỉ lệ xem hết dự báo + giây rơi rụng nặng nhất.

⚠️ **Cổng chặn được clip chắc chắn chìm. Nó KHÔNG hứa clip sẽ nổi** — nhạc trending, giờ
đăng, chủ đề đang hot đều nằm ngoài tầm đo. Đừng đọc một kết quả `pass` thành lời hứa.

## `startSec` — mốc hình TỰ RẢI, đừng khai tay

Cảnh `screen` không khai `startSec` thì `gen-video.mjs` tự rải: co giãn theo
tỉ lệ để các cảnh quét hết chiều dài bản quay, rồi **kẹp** để không cảnh nào
chạy quá đuôi file. In ra một dòng `mốc hình (bản quay 16.9s): 0.0s → 3.5s →
6.9s → 10.0s → 13.4s` để soi được bằng mắt.

🔑 **Vì sao không khai tay:** đó là mốc bên trong một file mà người viết kịch
bản chưa nhìn thấy. 17 công cụ × 5 cảnh = 85 con số đoán mò, và đoán sai thì
hỏng IM LẶNG — `OffthreadVideo` vượt quá độ dài chỉ đứng ở khung cuối, không
lỗi nào bắn ra.

⚠️ **Bản quay phải DÀI HƠN lời đọc.** Lượt đầu `kim-lau` quay ra **12,1s**
trong khi lời đọc **25,9s** ⇒ hình phải tua lại, nửa sau clip trông như ảnh
tĩnh. Đã nới nhịp giữ trong `showResult` → bản quay nay **17–21s** (riêng
`kinh-dich` 31s vì phải gieo đủ sáu hào).

## Số đo nền

⚠️ **Chỉ đúng cho ĐOẠN DÀI.** Câu ngắn cỡ một cảnh clip dao động 11–18 ký tự/giây (khoảng
lặng đầu/cuối cố định chiếm tỉ trọng lớn). Nên ước lượng chỉ dùng cho cổng 1; render thì
đo **độ dài thật** của mp3.

**Giọng Vbee đọc 13,59 ký tự/giây** (`s_sg_male_thientam`, `speed_rate 0.9`) — đo trên 11
file thật, 13.034 ký tự / 958,52 giây, dải 12,77–14,12. Nhờ số này mà thời lượng clip tính
được **trước khi tốn một lượt TTS nào**, nên cổng 1 chạy 0đ.

⚠️ Đổi giọng hoặc `speed_rate` thì **phải đo lại**: `content-length` của mp3 ÷ 16000 = số
giây, chia cho `length(text)`.

## 🔴 LUẬT NỘI DUNG — đọc trước khi viết bất kỳ kịch bản nào

Công thức bắt buộc: **STOP SCROLL → CURIOSITY → RETENTION → EMOTION → PAYOFF → SHARE**

**Sai lầm đã mắc và phải tránh: viết VIDEO HƯỚNG DẪN DÙNG TOOL.** Bản dựng thứ hai có
lời đọc *"Gõ ngày sinh. Gõ họ tên. Cộng hết chữ số lại…"* — không ai lướt TikTok để xem
người khác điền form. Cổng 1 nay chặn thẳng ngôn ngữ thao tác trong lời đọc
(`viral.how-to-voice`); thao tác để HÌNH kể.

Với nội dung tử vi: **đừng giảng giải bộ môn.** Biến nó thành công cụ trả lời
*"Tôi là người thế nào?" · "Vì sao tôi lại vậy?" · "Chuyện gì sắp xảy ra với tôi?"*

Dạng hook đã biết ăn:
- *"Có 3 kiểu người càng yêu càng khổ…"*
- *"Nếu bạn có đặc điểm này, rất có thể bạn thuộc nhóm…"*
- *"Điều này giải thích tại sao bạn luôn…"*

Đích cuối: người xem nghĩ **"đúng tao"** hoặc **"phải gửi cho đứa kia"**.

Luật cổng 1 kiểm được:

| Mã | Chặn gì |
|---|---|
| `viral.how-to-voice` | Lời đọc nửa đầu clip có động từ thao tác (gõ/bấm/nhập/chọn…) |
| `viral.no-identity` | Quá ít lần nhắc người xem (*bạn/của bạn/vì sao bạn*) → đang giảng bài |
| `viral.hook-about-product` | Hook nói về công cụ/website/app thay vì về người xem |
| `viral.no-invite` | Đoạn kết không mời tương tác (`warn`) |

### 🪤 `viral.no-invite` từng KÊU OAN 11/17 kịch bản

Bản đầu chỉ dò một bảng cụm cố định (`comment · bình luận · gửi cho…`), nên
câu kết *"Bạn mệnh gì?"* — đúng là câu người xem trả lời được ngay trong ô bình
luận — vẫn bị báo là không mời tương tác. **Bộ dò kêu oan là bộ dò bị tắt đi.**

Đã nới bằng một tính chất ĐO ĐƯỢC (*một câu hỏi ngắn nói thẳng với người xem*),
không phải bằng cách thêm vài cụm nữa vào bảng. Red-team: đổi câu kết thành câu
trần thuật → cảnh báo kêu lại; khôi phục → im.

### ⚠️ `length.off-sweet-spot` phần lớn là SAI SỐ CỦA ƯỚC LƯỢNG

Cả 18 kịch bản ước ra 31–37s, tức ngoài khoảng 18–32s. Nhưng ước lượng dùng
hằng số đo trên đoạn DÀI, còn câu cỡ một cảnh clip thì nó **ước dư**:

| Clip | Ước lượng | Giọng đọc THẬT | Clip render ra |
|---|---:|---:|---:|
| `than-so-hoc` | 37,6s | — | **32,4s** |
| `kim-lau` | 34,4s | **25,9s** | — |

⇒ Đừng cắt bớt lời đọc chỉ để dập cảnh báo này. Số đáng tin là độ dài mp3, và
`gen-video.mjs` vốn đã dùng độ dài thật lúc render.

## Luật nhịp — rút từ bản dựng đầu bị chê buồn ngủ

- Mỗi cảnh **MỘT ý, dưới ~4 giây**. Thà 6 cảnh ngắn hơn 3 cảnh dài.
- Câu ngắn, cắt vụn. Đổi hình thường xuyên là thứ giữ ngón tay người xem lại.
- Khoảng lặng giữa cảnh **0,12s** — cộng dồn qua 6 cảnh là gần 1 giây, quá đó thì chùng.
- Câu kết nói về **điều người xem sắp biết về CHÍNH MÌNH**, không nói về thủ tục.
  Dùng `buildCta(keyword)`: *"Tìm hiểu ngay <từ khoá> của chính bạn."* Bản đầu là
  *"Tra thử miễn phí, không cần đăng ký"* — vừa yếu vừa trỏ sai chỗ.

## Hạn chế đã biết

- **Trình duyệt trong container phát triển không ra được Internet** (mọi host đều
  `ERR_CONNECTION_RESET`, kể cả host `curl` vào được). Quay trang prod phải chạy ở máy có
  mạng cho trình duyệt; ở đây thì phục vụ `public/` tại chỗ.
- **Chromium của Playwright không dùng được cho Remotion** — đã gỡ chế độ headless cũ.
  Để trống `browserExecutable` cho Remotion tự lo (`REMOTION_CHROMIUM=auto`).
- **Nhạc nền tự sinh, KHÔNG thay được nhạc trending.** `node scripts/gen-music-bed.mjs --all`
  ra 4 kiểu (`don-dap` · `cang-thang` · `sang-sua` · `tram-tinh`). Đã đi tìm nguồn thật
  trước: kho nhạc miễn phí bị chặn ở tầng mạng, còn mp3 tìm được trên GitHub là **OST game
  thương mại** nằm trong repo mã nguồn mở — mã mở không có nghĩa nhạc được cấp phép.
  Nhạc trending trên TikTok còn có vai trò **đẩy phân phối** mà file tự sinh không thay
  được; vẫn nên gắn nhạc trending trong app lúc đăng.
- **Giọng đọc đổi theo tool** — 4 giọng đã thử chạy thật (2 nam, 2 nữ; đã gọi thử 8 mã,
  chỉ 4 mã nhận — đừng đoán mã theo quy luật đặt tên). Chọn theo hash của `tool_id` nên
  cùng một clip dựng lại ra cùng giọng.
- **Giọng đọc** qua edge function `tts-clip` (deploy riêng, KHÔNG đụng `tts` của pipeline
  vấn đáp). Tốc độ đọc clip là **1.15**, khác 0.9 của vấn đáp: clip TikTok phải dồn.
- **Cổng 2 chưa chạy lần nào**: cần khoá model. Ngưỡng 5/7 và 2/7 hiện là phỏng đoán ban
  đầu — phải đo phân bố trên vài chục kịch bản mẫu rồi mới chốt.
