# Tính năng đặc trưng — workplan (Henry duyệt 2026-09-27)

Mục tiêu: những thứ Hỏi Thầy làm được mà ChatGPT/Claude chat **không** làm được,
vì chúng đứng trên dữ liệu engine + sổ lá số + danh tính của chính người dùng.
Bản mẫu luồng đã duyệt: artifact "Cả Nhà Mình" (scratchpad, không vào repo).

## Năm luật giới thiệu — không để khách ngợp

1. **Không tour, không banner.** Tính năng lộ ra khi khách đang cần, do THẦY nói
   ra trong câu trả lời. Không có màn "Có gì mới".
2. **Làm trước, gọi tên sau.** Khách thấy KẾT QUẢ (thầy đọc chéo hai lá số) rồi
   mới thấy cái tên "Cả nhà mình".
3. **Mỗi phiên tối đa MỘT thứ mới.** Hai tính năng cùng đủ điều kiện → chỉ hiện
   cái ưu tiên cao hơn; hàng đợi giữ ở máy khách.
4. **Bỏ qua một lần thì im 14 ngày.** Nhắc liên tục là lời mời thành quảng cáo.
5. **Một ký hiệu `@` cho mọi thứ** — gọi được cả người nhà lẫn thầy khác.

## Khi nào tính năng nào lộ diện (ưu tiên giảm dần)

| Tính năng | Lộ diện khi | Nền đã có |
|---|---|---|
| **Cả nhà mình** | Câu hỏi nhắc chồng/vợ, con, bố mẹ (`cacChuDe` → `tinh-duyen`/`con-cai`/`cha-me`) mà sổ chưa có người đó | `user_charts.relation='gia_dinh'` |
| Sổ tiên tri | Lần đầu thầy phán một điều có mốc thời gian | `tra_tieu_van`/`tra_nguyet_van` · `ghi_nho` |
| Thầy tự nhắn | Ngay sau lần ghi Sổ tiên tri đầu tiên (xin quyền kèm lý do cụ thể) | web push (soát lại `sw.js`) · Telegram |
| Lịch riêng | Lần quay lại thứ 3, hoặc vừa xem thẻ "Nhà mình năm nay" | engine ngày tốt theo lá số |
| Hội chẩn | Câu hỏi quyết định lớn + khách đã từng mời thầy khác | 3 tool `moi_thay_*` · event `master_invite` |
| Việc đời thật | Theo mùa: tháng Chạp (xuất hành, xông đất), mùa cưới, hỏi mua nhà | hoàng lịch · chọn ngày · Bát Trạch |
| Thầy có tính cách | Không giới thiệu — lộ dần khi hai thầy cùng phòng | `personas.ts` |

## Quyết định của Henry (2026-09-27)

1. Tên: **"Cả nhà mình"** (trang), "Cả nhà" (thanh chat ngắn).
2. Lưu lá số người nhà **miễn phí**, không giới hạn người; câu hỏi về người nhà
   tính như một lượt rail thường; thẻ "Nhà mình năm nay" **miễn phí lần đầu**.
3. **KHÔNG làm** "gửi link cho người nhà tự nhập ngày sinh" — khách thấy hay thì tự share.
4. Thầy tự nhắn: **web push + Telegram** trước (Zalo sau).
5. Sổ tiên tri **không công khai** tỉ lệ trúng; khách chỉ thấy sổ của mình, đo nội bộ 2 tháng.

Chữ hiển thị: "Mời **nhóm** hội chẩn" — KHÔNG "hội đồng" (luật CLAUDE.md).

## Thứ tự làm

1. **Cả nhà mình** — ba giai đoạn, mỗi giai đoạn một PR:
   - **GĐ1 — thầy đọc được người nhà** ✅ (PR này): `lib/charts/family.ts` đọc sổ
     nhóm `gia_dinh`; tool `xem_nguoi_nha` (một người: lá số + vận năm) và
     `tra_ca_nha` (cả nhà xếp cạnh nhau 12 tháng âm, `buildKhung12Thang`); tên
     người nhà đi vào CUỐI tin user (không vào system — giữ cache); menu `@`
     có mục Người nhà, gửi `addressMember` (id `user_charts`).
   - **GĐ2 — lời mời trong chat** ✅: server bắn `done.familyInvite` khi câu hỏi
     nhắc chồng/vợ/con/bố/mẹ (`vaiTroTrongCau`) mà sổ chưa có người đó
     (`canMoiThem` — sổ có người KHÔNG rõ vai thì im, tránh mời trùng). Thẻ dưới
     câu trả lời → form `TuviForm.renderChat` (tắt `savedPicker`) → lưu
     `relation='gia_dinh'` + `birth.vaiTro` → tự hỏi lại câu gốc với `@Tên`.
     Thanh "Cả nhà" trên ô nhập hiện khi sổ đã có người. "Để sau" → im 14 ngày;
     mỗi phiên tối đa một lần; lượt có thẻ mời thì không hiện thẻ gợi ý công cụ.
     Giờ sinh vẫn bắt buộc (form có sẵn link "Xác định giờ sinh →").
   - **GĐ3 — trang Cả nhà mình** ✅: `/app/ca-nha` (`app-ca-nha.html` +
     `app/api/ca-nha`), vào từ nhãn "Cả nhà →" trên thanh chat. Thẻ người (tiểu
     hạn/lưu niên năm nay, thiếu giờ thì dẫn sang `/app/gio-sinh`), lưới 12 tháng
     âm (ô = cung nguyệt hạn, bấm xem sao), "Tháng cả nhà nên để ý" (cùng hạn một
     cung), nút "Hỏi thầy về cả nhà". Engine thuần, 0 lượt LLM ⇒ miễn phí thật —
     thay cho ý "thẻ Nhà mình năm nay miễn phí lần đầu". Phép tính dùng chung với
     tool `tra_ca_nha`: `lib/engine/ca-nha.ts`.
     ⚠️ Bản mẫu tô ô "thuận / bình / cần giữ" — KHÔNG làm: repo không có công thức
     chấm tháng, tự đặt một cái là vi phạm luật cổ pháp. "Sắp tới trong nhà"
     (sinh nhật âm, Tết) để dành cho Thầy tự nhắn / Việc đời thật.
2. **Sổ tiên tri + Thầy tự nhắn** (chung một đường nhắn).
   - **GĐ1 — Sổ tiên tri** ✅: bảng `loi_tien_tri` (`_patches/migration-loi-tien-tri.sql`,
     đã chạy trên prod), cửa duy nhất `lib/tien-tri/store.ts`. Tool `ghi_so_tien_tri`
     (qua `MemoryPort` — userId bind phía server; ≤1 lời/lượt, ≤12 lời đang chờ; ngày
     hỏi lại 7–400 ngày tới). Ghi xong `done.tienTri` → dòng nhỏ "Thầy ghi vào Sổ tiên
     tri · hỏi lại con ngày …". Đến hạn → mở màn chat chính là thầy hỏi lại
     (Đúng rồi thầy / Chưa thấy gì / Để sau = lùi 3 ngày), `GET/PATCH /api/tien-tri`.
     Kết quả chỉ để đo nội bộ (SQL trên `loi_tien_tri.ket_qua`).
   - **GĐ2 — Thầy tự nhắn (Telegram)** ✅: cron `tien-tri-nhac` 08:10 VN — lời phán đến
     hạn, chưa trả lời, chưa nhắn → khách đã nối bot thì nhắn Telegram (mỗi người ≤1 tin/
     sáng; khoá `nhac_at` TRƯỚC khi gửi để không nhắn đôi). Chưa nối thì thầy vẫn hỏi lại
     trong màn chat chính. Ngay sau lần ghi sổ đầu tiên hỏi MỘT lần "con muốn thầy nhắn
     qua đâu? [Telegram] [Chỉ khi con mở app]" → nối bot qua `/api/channels/telegram/link`.
   - **GĐ3 — Web push theo người** (Henry 2026-09-27: TẠM chỉ Telegram, chưa làm): push hiện CHỈ có đường gửi hàng loạt
     (`_patches/edge-send-daily-push.deno.ts`, tag `van-ngay`). Cần sửa + deploy lại
     edge function (thêm lọc `user_id`, `tag` riêng) — đụng thông báo vận ngày đang chạy
     nên hỏi Henry trước.
3. **Lịch riêng** ✅: feed `.ics` `GET /api/lich?t=<token>` (token = chartId + HMAC(chartId,
   userId) ký bằng `SUPABASE_SERVICE_KEY` — ứng dụng lịch không gửi header đăng nhập),
   `POST /api/lich {chartId}` cấp link webcal + Google Lịch. Nguồn số `computeTuan()`
   (lib/engine/van-ngay.ts). Chỉ đưa ngày tốt (không xung tuổi) + ngày XUNG CHÍNH TUỔI —
   ngày xấu chung bỏ (19/60 ngày ⇒ lịch thành tường cảnh báo). Lộ ra: lần quay lại thứ 3
   trên màn chat chính (khi Sổ tiên tri không có gì hỏi lại) + khối "Lịch riêng" ở
   `/app/ca-nha`. Một hàm client: `Shell.moLichRieng(kind)`.
4. **Hội chẩn** ✅: tool rail `hoi_chan` — CHỈ đăng ký ở lượt khách bấm (`req.hoiChan`), thầy
   chính luận Tử Vi trước, rồi Tâm Kính (Bát Tự năm nay, `computeTuBinh`) và Linh Cơ (Lục Nhâm lập
   giờ hỏi, `lapKhoa`) mỗi thầy nói rõ THUẬN/NGHỊCH/CÒN TUỲ, cuối cùng dòng "**Kết:**" nói chỗ các
   môn gặp nhau và chỗ vênh (không ép khớp). Trần token riêng lượt này `HOI_CHAN_MAX_TOKENS`.
   Nút "Mời nhóm hội chẩn · 3 thầy" nằm trong hàng "Nghe thêm môn khác", chỉ hiện khi câu hỏi là
   quyết định lớn (`QUYET_DINH_RE`, shell.js) + khách đã từng thấy thầy khác lên tiếng + thầy chính
   không phải Tâm Kính/Linh Cơ; hiện mà không bấm ⇒ im 14 ngày. Không chờ số liệu: đo ra
   `master_invite` = 0 là do `/api/track` thiếu loại này trong ALLOWED (ghi thành `other`) — đã vá.
5. **Việc đời thật — Tết** ✅: tool rail `xem_tet_ca_nha` (luôn có ở luồng lá số): tuổi
   xông đất theo chủ nhà = người hỏi (`computeXongDat`, năm ÂM — sinh tháng 1–2 dương có thể
   thuộc năm âm trước) + giờ hoàng đạo, hướng Hỷ/Tài thần mùng 1–3 (`computeVanNgay`) + ngày
   nào xung tuổi ai trong nhà. Lời mời trong 45 ngày trước Tết trên màn chat chính (sau Sổ
   tiên tri và Lịch riêng — mỗi phiên một thứ), một lần/mùa, "Để sau" im 14 ngày; số ngày tới
   Tết lấy từ `/api/xong-dat?mua=1` (một nguồn với bảng TET). Cưới hỏi / mua nhà: CHƯA làm
   riêng — rail đã gợi ý đúng công cụ (Chọn ngày, Kim Lâu, Bát Trạch) qua `goi_y_cong_cu`.
6b. **Mời thầy theo ngữ cảnh** ✅ (2026-09-28): hàng "Nghe thêm môn khác" chọn 2 thầy khớp câu hỏi
   (`pickGuests`, shell.js) trong 6 thầy có engine thật (`THAY_KHACH` + tool `moi_thay_chuyen_mon`,
   registry.ts); thẻ cross-sell báo cáo + tool `goi_y_san_pham` đã gỡ.
6. **Thầy có tính cách** ✅ — không giới thiệu. `personaKhach(id)` (`lib/agent/personas.ts`) = giọng
   thầy + cách cư xử KHI LÀM KHÁCH trong phòng thầy khác (Tâm Kính gật phần gặp nhau rồi chỉ chỗ
   vênh; Linh Cơ vào thẳng quẻ, ngược thì nói nhẹ mà không lùi). Mọi tool `moi_thay_*` + `hoi_chan`
   dùng hàm này; câu chốt của thầy chính được đáp lại thầy khách đúng tính mình. Tách khỏi `voice`
   để `eval-personas.mjs` vẫn đo giọng khi một mình.

## Luật riêng của "Cả nhà mình"

- Người nhà **không có mặt**: luận theo hướng người hỏi đỡ/đồng hành; không phán
  bệnh tật, tai nạn, chuyện xấu như điều chắc chắn; không so "ai số tốt hơn"
  (`LUAT_NGUOI_NHA`, `lib/tools/registry.ts`).
- userId của sổ LUÔN do server bind; `addressMember` là id lạ/của người khác thì
  bị bỏ qua im lặng (server chỉ khớp trong sổ của chính người đăng nhập).
- `tra_ca_nha` chỉ đưa dữ kiện engine (cung nguyệt hạn + sao trong chùm) và
  "tháng nhiều người cùng hạn vào một cung". **Đừng thêm luật "chấm tháng xấu"
  bằng đếm sát/bại** — chùm tam phương tứ chính hiếm khi sạch sao xấu nên tháng
  nào cũng trúng, và đó là công thức tự đặt.
