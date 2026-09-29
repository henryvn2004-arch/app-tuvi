# Engine & cổ pháp — chi tiết

> Bản 1–3 dòng ở `CLAUDE.md`. Đây là phần "vì sao" và số đo.

## KHÔNG sửa mò một công thức cổ pháp

Nghi sai thì GHI LẠI, không sửa. Đang treo:
- `isHoangOc` (`tools-shared/kim-lau.js`, `t % 5` trong khi Hoang Ốc là vòng
  **6** trạng thái);
- `TAM_HINH` (`lib/engine/diachi.ts`, xếp Dần–Hợi chung nhóm hình trong khi đó
  là LỤC HỢP).

## Một nguồn số

- **Engine là nguồn số duy nhất; không chép công thức sang client.** Cần dùng ở
  cả hai phía thì viết `public/tools-shared/<tool>.js` rồi cả hai gọi chung.
- **Quét MẪU chỉ chứng minh được thứ mẫu CHẠM TỚI.** Với thứ liệt kê được thì
  đọc chính danh sách của nguồn (4.392 khoá mẫu vẫn bỏ lọt 10 tên).
- **Bảng dịch dựng từ MỘT nguồn thì chỉ phủ nguồn đó** — đã cắn 3 lần (chữ Hán,
  tên hành tinh). Cắm bộ dò rò rỉ mỗi lần đấu vào nguồn chữ mới.

## Bảng âm lịch

- **Chỉ phủ `1900-01-01 → 2100-12-31`.** Ngoài tầm: bản vanilla
  (`public/tuvi-ansao-engine.js`) trả **`null`**, bản TS (`tuvi-engine`) **ném
  `RangeError`** — cố ý khác nhau theo nơi gọi, nhưng BIÊN phải khớp. Bản cũ
  `return {day:1,month:1,year:yy}` làm MỌI ngày dương của một năm trước 1900 ra
  CÙNG một lá số, im lặng. **Mọi lượt import ngày sinh từ nguồn NGOÀI phải gọi
  `isLunarSupported()` trước.** `npm run check:lunar` ·
  `nhat-ky/2026-08.md` "solarToLunar BỊA lá số".
- **`_LUNAR_TABLE` (cả 2 bản) SINH bằng thuật toán chính xác** của oracle Thiên
  Lương (có ΔT) + quy tắc múi giờ lịch sử VN (UTC+8 trước 1968-01-01, UTC+7 từ
  đó) — KHÔNG gõ tay/chép từ thư viện ngoài nữa (P1, 2026-09). Tết Ất Sửu 1985
  lệch lịch TQ **cả một tháng** (21/1 chứ không phải 20/2) — bằng chứng bảng cũ
  sai thật, không phải tiểu tiết. Cần sinh lại → `scripts/gen-lunar-table.mjs`
  rồi `scripts/apply-lunar-table.mjs`; `npm run oracle:lunar` gate CI đối chiếu
  vét cạn 1900-2100, đừng sửa tay bảng rồi bỏ qua bước này.
- **Bản vanilla BỎ cờ `isLeap`** ⇒ ngày trong tháng nhuận đụng khoá với tháng
  thường (đo được: 336/365 ngày phân biệt ở năm có nhuận). **Nợ CỐ Ý, đừng sửa
  mò** — tháng nhuận là chuyện cổ pháp. `check:lunar` ghim hiện trạng: đổi là đỏ.
- **Chiều ÂM → DƯƠNG chỉ có MỘT cửa: `lunarToSolar()` / `solarDateOf(birth)`**
  (`lib/engine/laso.ts` → `public/tools-shared/am-duong.js`). Hàm KHÔNG tự tính
  lịch: dò ngày dương bằng chính `solarToLunar` của engine. **Tháng nhuận đi qua
  cờ `BirthParams.isLeapMonth`** (chat: `lap_la_so.leap_month`; MCP: `thang_nhuan`; link ảnh: `ln=1`) —
  hàm đếm ĐOẠN tháng (mỗi đoạn mở ở mùng 1; tháng nhuận nằm LIỀN sau tháng thường,
  không có ngày hở) và lấy đoạn thứ hai; năm không nhuận tháng đó ⇒ `null`, không
  lặng lẽ trả tháng thường. Thiếu cờ ⇒ tháng THƯỜNG. `computeLaso` vẫn an sao theo
  SỐ tháng (không đổi cổ pháp), chỉ từ chối cờ nhuận sai năm. **Engine Bát Tự
  (`tinhBatTu`) nhận ngày DƯƠNG** — `birth.isLunar` mà đưa thẳng vào là tứ trụ sai
  hoàn toàn mà trông hợp lệ; `lunarOf()` cũng nhận ngày DƯƠNG. `npm run
  check:amduong` · `nhat-ky/2026-09.md` "Bát Tự sai cho người nhập âm lịch" · "Tháng nhuận".

## Khoá "cùng lá số" là ÂM LỊCH, không phải ngày dương

An sao chỉ phụ thuộc (can chi năm · tháng ÂL · ngày ÂL · giờ · giới); số năm âm
KHÔNG vào an sao, nên lá số lặp đúng chu kỳ **60 năm** (đo: 0/48 khác biệt giữa
1884/1944/2004). Giới tính thì PHẢI vào khoá (phụ tinh khác 100%, chính tinh
khác 0%).

⚠️ `lasoKey()` của `lib/portraits/cache.ts` băm ngày **DƯƠNG** — không tái dùng
cho việc gom theo lá số. `nhat-ky/2026-08.md` "Ai Sinh Cùng Ngày Với Bạn".

## Bảng có tính ĐỐI XỨNG tự kiểm được, KHÔNG cần nguồn ngoài

Du Niên, hay bất kỳ quan hệ 2 chiều nào: cung A nhìn cung B ra sao X thì B nhìn
A cũng phải ra X; lệch là sai chắc chắn. `BatTrachTool.duNienStars()` /
`getCungMenh()` (`tools-shared/bat-trach.js`) là nguồn DUY NHẤT cho cung mệnh +
8 sao Bát Trạch — 3 bản chép tay cũ (bản này + `route.ts` + 7 trang Vision) đều
tự mâu thuẫn, sai 12-15/64 ô mỗi bản. `npm run check:batrach` ·
`nhat-ky/2026-08.md` "Bảng Du Niên Bát Trạch".

## Sao lưu năm xem — `anSaoLuuNam` / `danhGiaSaoLuu`

Nguồn chính (Henry chốt 2026-09-29): Văn Đằng Thái Thứ Lang mục 4.1–4.4 — đúng 9 sao,
chỉ lưu theo NĂM. Đối chiếu tuvicohoc: cùng 9 sao, cùng lối an ⇒ không lệch.
- **Gắn `palaces[].luuStars` + `ls.saoLuu`, KHÔNG trộn vào `palaces[].stars`** — mọi chấm
  điểm, cách cục, `cungScores`, golden đọc mảng đó; trộn vào là lá số GỐC đổi theo năm xem.
- **Lưu Kình = Lưu Lộc +1, Lưu Đà = −1 CỐ ĐỊNH** (ví dụ sách: Ất Mùi → Lộc Mão, Kình Thìn,
  Đà Dần). Kình/Đà GỐC (`anLucSat`) theo Thiên Lương đảo chiều theo âm dương × giới — hai
  bên KHÁC nhau có chủ ý, đừng "đồng bộ".
- **Lưu Tứ Hóa không có trong Thái Thứ Lang** — dùng tuvicohoc "quan điểm 3" (can năm xem
  + `TU_HOA`, gắn vào sao cố định). Hai quan điểm còn lại (không an / an theo giờ với lưu
  chính tinh) chưa dùng.
- **Chưa an** (ngoài Thái Thứ Lang, hoặc nguồn tự ghi hai cách mâu thuẫn): lưu vòng Thái Tuế
  đầy đủ, Thiên Không, Quán Sách, vòng Bác Sĩ/Lộc Tồn, Tràng Sinh, Khôi Việt (Việt Viêm Tử),
  Lưu Triệt/Song Hao ("kinh nghiệm"), sao lưu theo tháng/ngày/giờ.
- `diemNong` chỉ chép ca sách nêu ĐÍCH DANH; "gặp nhiều sát/bại tinh" không có ngưỡng trong
  sách ⇒ chỉ liệt kê làm DỮ KIỆN, không tự gắn nhãn XẤU. `npm run check:saoluu`.
