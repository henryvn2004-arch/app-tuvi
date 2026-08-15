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

**Giọng Vbee đọc 13,59 ký tự/giây** (`s_sg_male_thientam`, `speed_rate 0.9`) — đo trên 11
file thật, 13.034 ký tự / 958,52 giây, dải 12,77–14,12. Nhờ số này mà thời lượng clip tính
được **trước khi tốn một lượt TTS nào**, nên cổng 1 chạy 0đ.

⚠️ Đổi giọng hoặc `speed_rate` thì **phải đo lại**: `content-length` của mp3 ÷ 16000 = số
giây, chia cho `length(text)`.

## Hạn chế đã biết

- **Trình duyệt trong container phát triển không ra được Internet** (mọi host đều
  `ERR_CONNECTION_RESET`, kể cả host `curl` vào được). Quay trang prod phải chạy ở máy có
  mạng cho trình duyệt; ở đây thì phục vụ `public/` tại chỗ.
- **Chromium của Playwright không dùng được cho Remotion** — đã gỡ chế độ headless cũ.
  Để trống `browserExecutable` cho Remotion tự lo (`REMOTION_CHROMIUM=auto`).
- **Chưa có nhạc nền**: thả file vào `remotion/public/music/` rồi truyền `--music <tên>`.
  Không có file thì clip vẫn render, chỉ không nhạc (fail-soft có chủ ý).
- **Chưa nối giọng đọc**: cần `VBEE_TOKEN` + `VBEE_APP_ID` trong môi trường chạy.
- **Cổng 2 chưa chạy lần nào**: cần khoá model. Ngưỡng 5/7 và 2/7 hiện là phỏng đoán ban
  đầu — phải đo phân bố trên vài chục kịch bản mẫu rồi mới chốt.
