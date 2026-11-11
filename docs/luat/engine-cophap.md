# Engine & cổ pháp — chi tiết

> Bản 1–3 dòng ở `CLAUDE.md`. Đây là phần "vì sao" và số đo.

## KHÔNG sửa mò một công thức cổ pháp

Nghi sai thì GHI LẠI, không sửa. Đang treo:
- `isHoangOc` (`tools-shared/kim-lau.js`, `t % 5` trong khi Hoang Ốc là vòng
  **6** trạng thái);
- `TAM_HINH` (`lib/engine/diachi.ts`, xếp Dần–Hợi chung nhóm hình trong khi đó
  là LỤC HỢP).
- **Bảng âm lịch VN mở SỚM một ngày ở 4 tháng** (i18n W3, 2026-11): mùng 1 tháng
  3/1939, tháng 2 nhuận/1947, tháng 4/2054, tháng 3/2062 trong `_LUNAR_TABLE` là
  19/4/1939, 22/3/1947, 7/5/2054, 9/4/2062; dựng lại theo quy tắc chuẩn (sóc của
  CHÍNH oracle `NewMoon` + trung khí `astronomy-engine`, cùng quy tắc múi VN) ra
  20/4/1939, 23/3/1947, 8/5/2054, 10/4/2062 — và HKO (cùng UTC+8 với VN trước
  1968) cũng mở 20/4/1939, 23/3/1947. Gốc: "ngày rác" `day:0` của oracle không chỉ
  sai field day — oracle ước lượng lệch chỉ số lunation nên ngày đó nó đã báo SANG
  tháng mới; generator lấy luôn ngày đó làm mùng 1. 2054 là ca sát biên thật (sóc
  00:00:22 giờ VN, nằm trong sai số ΔT). CHƯA sửa: đổi là đổi lá số người sinh
  ~120 ngày đó, cần chủ sản phẩm quyết. Bảng cn/kr/jp KHÔNG dính (xem dưới).
- **Engine Bát Tự lịch `vn` xét tiết khí theo NGÀY, không theo giờ/múi**
  (`_findTietKhiJDN`, `_sunLongitudeDeg(jdnRaw)` = kinh độ Mặt Trời lúc 12:00 UT
  của ngày sinh) ⇒ người sinh đúng ngày giao tiết có thể lệch trụ tháng/năm tuỳ
  giờ (vd Lập Xuân 2025 = 14:10 UTC 3/2 ⇒ sinh 23:30 giờ VN 3/2 vẫn ra năm Giáp
  Thìn). **ĐÃ SỬA cho `cn`/`kr`/`jp`** (i18n W3b, 2026-11 — khách mới, không lá
  số cũ nào đổi; xem mục "Tiết khí theo THỜI ĐIỂM" dưới). **`vn` CÒN TREO**: sửa
  là đổi tứ trụ người VN đang có — cần chủ sản phẩm quyết; khi quyết thì chỉ cần
  cho `vn` đi cùng đường bảng (giờ của lịch VN lấy theo `VnTimezone`), và
  `check:tietkhi` mục 5 (hash lịch vn) sẽ đỏ — cố ý, phải chụp lại hash.
- **"Thủ truyền" ở Đại Lục Nhâm** (W7a5 nghi, W15b soát 2026-11 — KHÔNG sửa chữ gốc). Nghi: `app-luc-nham.html:194`
  viết "Thủ truyền theo phép **X**, sơ truyền **Y**", W7a5 cho rằng "Thủ truyền" không chuẩn, đúng phải là
  "Sơ truyền". **Bằng chứng ngược:** cùng một câu đã có CẢ hai từ, chỉ hai thứ khác nhau; `lib/liuren/terms.ts`
  gọi 12 pháp (贼克 · 元首 · 重审 · 比用 · 涉害 · 遥克 · 昴星 · 别责 · 八专 · 伏吟 · 返吟…, `PHAP_THU_TRUYEN`,
  map từ `transmissionRule` của engine) là "pháp thủ truyền", còn 初传/中传/末传 là Sơ/Trung/Mạt truyền (dòng 118);
  `tools-shared/dai-luc-nham.js:102` in tiêu đề "Phép thủ truyền" trên đúng danh sách 12 pháp đó. 取 đọc "thủ"
  (lấy) ⇒ "thủ truyền" = cách LẤY ba truyền (sách Hoa gọi 九宗門 / 取傳法), không phải truyền thứ nhất.
  ⇒ Chữ gốc ĐÚNG nghĩa; cái sai là bản dịch nếu đổi nó thành 初伝/초전/"first transmission". Glossary ghi
  `lucnham|Thủ truyền = 取傳` (W15b). Còn treo: chọn từ hiển thị cho khách ngoài VN (取傳法 hay 九宗門) — người duyệt.

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

## Lịch âm theo NƠI SINH (i18n W3, 2026-11)

Người dùng chỉ chọn nơi sinh (`tuvi-form.js` → `public/tools-shared/noi-sinh.js`):
giờ đồng hồ nơi sinh → thời điểm tuyệt đối (múi + giờ mùa hè LỊCH SỬ đọc từ IANA qua
`Intl`, không gõ tay offset dân sự) → giờ dân sự CỦA LỊCH nơi đó → engine
`convertDuongToAm(d,m,y,h,lich)`. Sinh ở VN KHÔNG đi qua đường này — y nguyên cũ.

- **Lịch theo nước** (`LICH_THEO_NUOC`): VN→`vn` · CN/TW/HK/MO→`cn` · KR→`kr` ·
  JP→`jp`; còn lại → `LICH_MAC_DINH = 'vn'` (quyết định của chỉ huy, một hằng số).
- **Giờ của lịch** (`GIO_LICH`, cũng là quy tắc khi SINH bảng — `scripts/lunar-lich.mjs`
  đọc chính nó): cn UTC+8 (HKO) · jp UTC+9 · kr UTC+8 trước 1912, UTC+9 từ 1912 (ICU
  `dangical.cpp`, dẫn KASI: 1908–11 giờ chuẩn +8:30 nhưng lịch vẫn +8; 1954–61 giờ
  chuẩn +8:30 nhưng KHÔNG đổi ngày âm nào — `oracle:lunar` tự kiểm). Giờ mùa hè bị
  trừ ra. Chưa áp giờ Mặt Trời thật (lệ một số thầy Hàn trừ ~30′) — chuyện trường phái.
- **Bảng cn/kr/jp KHÔNG dùng thuật toán HND của oracle để quyết tháng nhuận**: kinh
  độ Mặt Trời công thức rút gọn của HND sai ~15′, trúng ca Đại Thử 2017 (00:15 giờ
  Seoul/Tokyo 23/7) ⇒ HND ra nhuận 6 trong khi KASI ghi 윤5월. Bảng dựng theo quy tắc
  chuẩn: sóc từ oracle `NewMoon` (lệch astronomy-engine ≤ 1′) · tháng chứa Đông Chí =
  11 · năm 13 tháng thì tháng đầu thiếu trung khí là nhuận · trung khí từ
  `astronomy-engine` (chỉ trong script sinh bảng). Lưu mã hoá gọn (~2,5 KB/bảng) ở
  khối `<LUNAR_EXTRA>` của CẢ HAI engine: `gen-lunar-table.mjs --lich cn|kr|jp` →
  `apply-lunar-table.mjs --extra`.
- **Đối chứng ngoài, vét cạn từng ngày** (`npm run oracle:lunar`): cn ↔ HKO 1901–2100
  khớp trừ đúng 3 tháng ghim (17/11/1914, 3/2/1916, 9/11/1920 — lịch in thời đó tính
  cho Bắc Kinh; thử quy tắc "giờ Bắc Kinh trước 1929" thì sửa được 3 tháng đó nhưng
  lệch 3 tháng khác 1906/1917/1922 ⇒ giữ 120°E). kr ↔ KASI 1900–2050 khớp 100%
  (KASI chỉ phục vụ tới 31/12/2050). jp ↔ KASI từ 2/1912 (cùng 135°E) khớp 100%; jp
  không có nguồn Nhật chính thức (NAOJ không công bố 旧暦). 2051–2100 kr/jp chỉ còn
  oracle HND + cấu trúc. Dữ liệu đối chứng: `scripts/fixtures/lunar-ref-{hko,kasi}.json`,
  làm mới bằng `NODE_USE_ENV_PROXY=1 node scripts/oracle/fetch-lunar-refs.mjs --hko --kasi`.
- **`lich` phải đi theo lá số tới MỌI chỗ tính/khoá**: `BirthParams.lich` (contract
  v1, thêm) → `lichOf()` ở `lib/engine/laso.ts`; `lasoKey()` có đoạn `lich:` (chỉ khi ≠
  vn — khoá VN không đổi); link ảnh ký `lc=`; `cache-status` `lc=`. Thiếu ở chỗ nào là
  chỗ đó lặng lẽ tính theo lịch VN.
- `public/tuvi-ansao-engine.js` KHÔNG mang `?v=` (luật Đợt 8, dedup soft-nav) — đừng
  "bump" nó; `tuvi-form.js` thì có, và tự giữ instance cũ khi bị nạp lại.

## Tiết khí theo THỜI ĐIỂM — Bát Tự lịch cn/kr/jp (i18n W3b, 2026-11)

Ở Hàn (사주) và Trung/Đài/Nhật, lịch vạn niên tính tứ trụ tới PHÚT: trụ tháng đổi
đúng thời điểm Mặt Trời tới kinh độ 255°+30°·k (12 TIẾT), Lập Xuân 315° đổi cả trụ
năm. Với `lich` ∈ {cn, kr, jp}:

- **Thời điểm sinh tuyệt đối** = giờ dân sự của lịch (form đã quy qua
  `NoiSinh.quyDoi`, đủ múi + giờ mùa hè lịch sử) − `NoiSinh.GIO_LICH[lich]` — đọc
  CHÍNH nguồn đó: trang có sẵn biến toàn cục, server (`lib/engine/tubinh.ts`) truyền
  vào engine làm tham số `NoiSinh`. Thiếu ⇒ engine `console.error` rồi lùi về đường
  theo ngày (không ném, không bịa).
- **Bảng mốc tiết** = khối `<TIET_KHI_TABLE>` trong `public/tubinh-ansao-engine.js`
  (một file cho cả client lẫn server), SINH bằng `scripts/gen-tiet-khi-table.mjs
  --write` từ `astronomy-engine` (kinh độ biểu kiến, thời điểm UT). 2.414 mốc Đại
  Tuyết 1899 → Tiểu Hàn 2101, phút UTC, ~2,8 KB (12 gốc + mỗi mốc sau một ký tự
  base36 = chênh so với cùng tiết năm trước − 525.930′). Chỉ 12 tiết: 12 trung khí
  không đổi trụ nào. Khởi vận đại vận cũng đếm theo cùng bảng.
- **Giờ chính xác phải tới engine**: client truyền `tinhBatTu({…, lich, gioLich,
  phutLich})`; server đọc `birth.hour`/`birth.minute` (contract v1, thêm). Thiếu
  phút ⇒ lấy đầu canh giờ — server và trang lệch nhau đúng ở cửa sổ quanh mốc.
  Mọi đường dựng lại birth phải chở `lich` + `hour/minute`: `shell.js`
  `birthToApi` (khôi phục phiên), query `hm` (= giờ·60+phút) ở `portrait-recover.js`
  ↔ `birthFromQuery`, link ảnh ký `laso-image.ts`.
- **Khoá cache `lasoKey()`** thêm `tk:<chỉ số mốc>` CHỈ khi lịch cn/kr/jp, có giờ:phút
  VÀ sinh cách mốc tiết < 1 ngày (`tietKhiKhoa`, `lib/engine/tubinh.ts`). Ngoài cửa
  sổ đó (và mọi lá số vn) khoá y như trước ⇒ chỉ mồ côi cache của khách cn/kr/jp
  sinh sát mốc từ W3 (vài ngày) — chấp nhận để hai người hai bên mốc không dùng
  chung kết quả trả phí. Dùng chỉ số tiết chứ không dùng phút: cùng tiết thì
  cùng kết quả, khoá không vỡ theo từng phút.
- **Đối chứng** (`npm run check:tietkhi`): NAOJ 暦要項 (giờ:phút JST 2005→năm sau)
  lệch ≤ 1′; HKO (NGÀY UTC+8 cả 24 tiết 1901–2100) khớp trừ đúng danh sách ghim
  `scripts/fixtures/tietkhi-hko-ghim.json` — mỗi mục phải nằm ≤ 10′ quanh nửa đêm
  120°E. Không có nguồn Hàn công khai không khoá (KASI 24절기 chỉ qua API
  data.go.kr cần service key). Làm mới fixture:
  `NODE_USE_ENV_PROXY=1 node scripts/oracle/fetch-tietkhi-refs.mjs --hko --naoj`.

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
