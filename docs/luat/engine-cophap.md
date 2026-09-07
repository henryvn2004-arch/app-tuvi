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
