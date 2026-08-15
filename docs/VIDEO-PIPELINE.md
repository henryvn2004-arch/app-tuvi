# Dựng video ngắn 9:16 — hạ tầng + cổng kiểm

**Trạng thái:** hạ tầng CHẠY ĐƯỢC, pilot 1 clip đã render thật · **2026-08-15**

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
```

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

## Số đo nền

⚠️ **Chỉ đúng cho ĐOẠN DÀI.** Câu ngắn cỡ một cảnh clip dao động 11–18 ký tự/giây (khoảng
lặng đầu/cuối cố định chiếm tỉ trọng lớn). Nên ước lượng chỉ dùng cho cổng 1; render thì
đo **độ dài thật** của mp3.

**Giọng Vbee đọc 13,59 ký tự/giây** (`s_sg_male_thientam`, `speed_rate 0.9`) — đo trên 11
file thật, 13.034 ký tự / 958,52 giây, dải 12,77–14,12. Nhờ số này mà thời lượng clip tính
được **trước khi tốn một lượt TTS nào**, nên cổng 1 chạy 0đ.

⚠️ Đổi giọng hoặc `speed_rate` thì **phải đo lại**: `content-length` của mp3 ÷ 16000 = số
giây, chia cho `length(text)`.

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
- **Giọng đọc** qua edge function `tts-clip` (deploy riêng, KHÔNG đụng `tts` của pipeline
  vấn đáp). Tốc độ đọc clip là **1.15**, khác 0.9 của vấn đáp: clip TikTok phải dồn.
- **Cổng 2 chưa chạy lần nào**: cần khoá model. Ngưỡng 5/7 và 2/7 hiện là phỏng đoán ban
  đầu — phải đo phân bố trên vài chục kịch bản mẫu rồi mới chốt.
