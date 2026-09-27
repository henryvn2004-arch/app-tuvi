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
   - **GĐ3 — trang Cả nhà mình + thẻ "Nhà mình năm nay"**: dựng trên
     `/app/so-la-so` lọc `gia_dinh`; lưới 12 tháng từ `buildKhung12Thang` (engine,
     0 lượt LLM — miễn phí đúng nghĩa); "Sắp tới trong nhà" là cầu sang Thầy tự nhắn.
2. **Sổ tiên tri + Thầy tự nhắn** (chung một đường nhắn).
3. **Lịch riêng**.
4. **Hội chẩn** — chờ 1–2 tuần số liệu `master_invite` trước.
5. **Việc đời thật** — phải kịp trước tháng Chạp.
6. Thầy có tính cách — không có việc giới thiệu; chỉnh `personas.ts` khi cần.

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
