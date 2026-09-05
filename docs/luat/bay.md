# Bẫy đã vấp thật & phương pháp đo — chi tiết

> Bản 1–3 dòng ở `CLAUDE.md`. Đây là phần "vì sao" và số đo.

## Phương pháp (loại tốn nhiều giờ nhất)

- **Xanh oan nguy hơn đỏ oan.** Phép so vị trí (`indexOf`) phải kèm assert cái mốc
  CÓ TỒN TẠI — `-1` làm mọi so sánh luôn đúng. `grep "A \|\| B"` là ĐỖ GIẢ (`\|` là
  toán tử HOẶC trong BRE) → dùng `grep -F`.
- **Red-team bộ dò: assert đột biến ĐÃ ăn rồi mới đọc kết quả.** Nhiều lần "pass"
  chỉ vì lệnh thay chuỗi không khớp nên chẳng sửa gì.
- **Bảng thống kê CẮT TOP-N đọc thành "chưa từng xảy ra".** Log Vercel
  `group_by requestPath` cắt ở 25 mà repo có ~3.000 đường dẫn phân biệt (mỗi
  `/la-so/*` một cái) — route bị gọi 1–2 lần RƠI KHỎI BẢNG. Dùng `group_by route`
  (gộp `[slug]`, còn ~20 dòng), rồi lấy mốc giờ bằng `statusCode` + cửa sổ hẹp;
  tìm kiếm toàn văn hay hết giờ, đừng dựa vào. `nhat-ky/2026-08.md` "PayPal live
  lượt đầu".
- **`git checkout -- <file>` kéo về HEAD, KHÔNG về bản đang sửa** — hoàn tác một
  đột biến red-team giữa lúc bản sửa còn CHƯA COMMIT là xoá trắng bản sửa của file
  đó, im lặng. Thứ tự đúng: **commit trước, red-team sau**. Và `grep -c` đếm DÒNG
  có khớp, không đếm số lần khớp — đếm lần thì `grep -o … | wc -l`.
- **Đối chứng `origin/main` HẾT HẠN** khi chính PR đó vào main, hoặc khi hạ tầng nó
  neo vào đã đổi. Neo đúng `origin/main` chưa đủ — phải neo đúng cái mình đang so.
- **Bài kiểm đặt tên theo điều nó THỰC SỰ đo**, không theo điều mình muốn nó đo.
- **Đọc TRỌN khối log quanh lỗi** — dòng ném ra thường không phải nguyên nhân
  (`document is not defined` thật ra là "engine chưa được dựng", 12 dòng phía trên).
- **Hai phép đo mâu thuẫn thì một cái sai — đừng chọn cái tiện hơn.**
- **`null` từ hàm mình tự gọi là dấu hiệu MÌNH gọi sai**, không phải "không đo được".
- **Đo trên bản đã cắt gọn thì đang đo bản cắt.**

## Shell / lệnh

| Bẫy | Cách tránh |
|---|---|
| `pkill -f 'xyz'` **tự giết chính nó** (exit 144) — đã vấp ≥5 lần | `pkill -f 'xy[z]'` hoặc bắt PID rồi `kill "$PID"` |
| Bẫy **cwd**: `cd tuvi-engine && …` giữ lại cwd cho lệnh sau — đã vấp ≥7 lần | Về gốc repo NGAY sau lệnh đó |
| `$?` sau **pipe** là mã thoát của lệnh CUỐI (`tail`), không phải lệnh mình quan tâm | Hứng ra biến trước, đừng đo sau `\| tail` |
| `git checkout --ours` khi giải xung đột **xoá luôn phần đã auto-merge sạch** | `git apply -3`; sau mỗi lần giải xung đột **đếm lại dấu hiệu của CẢ HAI bên** |
| `import()` một script CLI là **CHẠY** nó | Kiểm cú pháp bằng `node --check` |
| `tsc` emit `.js` lẫn vào `lib/` | Khai `rootDir` + `outDir` ngoài repo, `git status` lại sau mỗi lượt |
| TS5112 (nêu file trên dòng lệnh khi cwd có `tsconfig.json`) · TS6064 (`--paths` chỉ khai được trong tsconfig) | tsconfig riêng dùng `include`, không nêu file |
| `fs.globSync` chỉ có từ Node 22, **CI chạy Node 20** | Duyệt cây bằng tay |
| Không có `node_modules` thì `npx <tool>` kéo bản **bất kỳ** từ cache, KHÔNG phải bản của repo — đã làm lint đỏ vì prettier 3.8.1 vs 3.9.6 ghim trong lock | Nêu bản trong lockfile: `npx prettier@3.9.6` |
| `fetch` của Node KHÔNG tự đi qua proxy, `curl` thì có | `NODE_USE_ENV_PROXY=1` (đọc lúc KHỞI ĐỘNG) |
| `403 CONNECT` = proxy container chặn, **chưa chạm server** — khác hẳn 403 của API | Đừng đọc thành "tài khoản bị khoá" |

## Playwright / trình duyệt

- **`page.route` đăng ký SAU được ưu tiên** ⇒ catch-all `**/api/**` phải đứng TRƯỚC.
- **`isVisible()` / `page.url()` là ẢNH CHỤP tức thời** (tham số `timeout` không có
  tác dụng chờ) ⇒ dùng web-first assertion (`toBeVisible`, `expect.poll`). Đây là
  nguyên nhân 42% lượt smoke prod đỏ oan suốt 6 ngày.
- **Playwright đặt `navigator.webdriver=true`** ⇒ `track.js` tự no-op; muốn đo
  đường của người thật phải `defineProperty` cho nó về `false`. **Tour onboarding
  trong `app-home.html` dùng CÙNG cơ chế** (`if(navigator.webdriver) return;`) —
  quên giả cờ này là bài kiểm xanh oan vì chẳng đo gì cả.
- **`devices['iPhone 13']` mặc định `browserType:'webkit'`** mà máy chỉ có
  chromium ⇒ báo "Executable doesn't exist at .../webkit-2336", không nói gì về
  device. Khai tay `viewport/isMobile/hasTouch/userAgent`. Chromium chạy dưới
  root cần `--no-sandbox`.
- **`innerText` trả chữ HOA** khi phần tử có `text-transform:uppercase`.
- **Stub thiếu trường ⇒ đo nhầm ĐƯỜNG LÙI** mà vẫn xanh — lấy shape THẲNG từ code,
  đừng bịa. `.single()` của supabase-js chờ MỘT object, trả mảng là phía gọi vỡ.
- `addInitScript` chạy lại ở MỌI lượt điều hướng; stub `Auth` đặt ở đó bị `auth.js`
  ghi đè ⇒ chặn hẳn `auth.js` bằng `page.route`.
- **`Track` thì NGƯỢC CHIỀU `Auth`**: `shell.js` nạp `/track.js` BẤT ĐỒNG BỘ
  (`ensureTrackJs`) nên bản thật đáp xuống SAU và đè stub gán thường ⇒ khoá bằng
  `defineProperty(..., {writable:false})`. Triệu chứng: DOM dựng đúng mà mảng
  event vẫn rỗng.
- Chạy spec từ scratchpad thì `playwright` không resolve — chạy trong cây repo.
- `waitUntil:'networkidle'` treo vĩnh viễn vì container chặn Google Fonts.

## CI

- **`tsc --noEmit` xanh KHÔNG chứng minh `next build` chạy** — TS 7 gỡ hẳn compiler
  API mà CLI vẫn chạy; đã làm 7 lượt deploy prod ERROR. Nay có job `next-build`.
- **CI chạy trên merge-ref**, không phải trên nhánh ⇒ lockfile hiệu dụng là bản đã
  trộn với base ("local xanh, CI đỏ" thì nghi chỗ này trước).
- **Workflow `pull_request` thỉnh thoảng KHÔNG fire** (cả `opened` lẫn
  `synchronize`, cả commit thường lẫn merge commit — chưa tìm ra quy luật). Gặp thì
  chạy đủ bộ tại chỗ rồi **nói thẳng trên PR là CI vắng mặt**. PR "xanh" có thể chỉ
  là các check KHÔNG TỒN TẠI — **đếm đủ check trước khi kết luận**.
- Job tên `build` trong danh sách check là `build-android.yml`, KHÔNG phải `next build`.
- Artifact có đường dẫn bắt đầu bằng dấu chấm (`.lighthouseci/`) cần
  `include-hidden-files: true`, nếu không mất im lặng.

## Giữ chỗ chống nhảy layout (CLS)

- **Giữ chỗ chỉ có tác dụng khi khối CÓ MẶT ở lần vẽ đầu.** Nhét khung chờ vào
  trong một khối đang `display:none` thì không giữ được gì — nó chỉ làm cú chèn
  NẶNG THÊM (đo được: `/app` 0,595 → 0,827). Quyết định lộ khối phải chạy lúc
  PHÂN TÍCH HTML, không phải trong `DOMContentLoaded`.
- **Khung chờ KHÔNG khớp theo nội dung đến từ DB/API** — chép số dòng của một
  chuỗi nằm ngoài repo thì sửa chuỗi đó là khung chờ trôi, im lặng. Để số dòng
  cố định, nhắm DƯ chứ không THIẾU (khối co lại thì nội dung dồn LÊN, xa ngón
  tay). Bỏ `display:none` thì MỌI đường "không dựng được" phải ẩn tay.
- **CLS chỉ kết luận được bằng prod↔prod.** Preview ĐO HỤT: 5 vòng đều báo
  `/topup.html` = 0,016, số thật trên prod cùng bản là **0,160** (cú `#statusSlot`
  rơi ngoài cửa sổ đo). Ngược lại Perf/LCP/TBT thì đừng so prod-cũ ↔ preview-mới:
  cùng lượt đó `/xem-tuoi.html` tụt 72 → 53 với 0 dòng code đổi.
- **Box JS chèn vào ĐẦU khung nội dung vừa gây CLS vừa LÀ phần tử LCP** —
  `.intro-card` (`Shell.introOnce`): CLS 0,198 + Render Delay 5,3s/5,96s. Chữ là
  hằng số của trang ⇒ dựng tĩnh trong HTML, `introOnce` thấy `.intro-card` đã có
  thì chỉ điền `#introSrc`, và trang đó khai gọn `SHELL_INTRO={key}` — giữ thêm
  title/desc trong JS là BẢN CHÉP CHẾT: `introOnce` không dựng lại nên sửa nó
  không có tác dụng gì và không có gì báo. `npm run check:introcard` canh chỗ này.
- Đo: Actions → Lighthouse CI → `mobile_audit=true` (thêm host vào
  `lhci_url_override` để đo preview). `nhat-ky/2026-09.md` mục "Rà soát mobile".

## Overlay / popup bám phần tử

- **Đặt popup theo một phần tử thì phải KẸP CỨNG vào vùng nhìn thấy SAU khi đã
  chọn trên/dưới.** Chọn xong gán thẳng là đủ để nhốt người dùng: điểm neo nằm
  ngoài màn thì popup văng theo, nút đóng ra ngoài mép, không còn đường thoát.
  Đo được: neo ở 1072px trên màn 844 → nút nằm dưới đáy 204px.
- **`window.innerHeight` KHÔNG phải vùng nhìn thấy trên iOS Safari** — nó tính cả
  dải nằm SAU thanh công cụ dưới cùng. Dùng `visualViewport.height/offsetTop`.
- **Điểm neo phải được kéo vào tầm nhìn trước khi vẽ** — `offsetParent!==null`
  chỉ nói phần tử có trong layout, không nói nó đang được nhìn thấy.
- **Mọi overlay chặn đường phải có đường thoát không phụ thuộc vị trí** (Esc).
  `nhat-ky/2026-09.md` "Tour onboarding nhốt người dùng".

## Tiếng Việt

- **Dò chuỗi thô trên văn tiếng Việt là sai lớp.** Đã trả giá: `\bcon\b` khớp "con
  vật" · `quan` khớp "tổng quan" · `sao` khớp "tại sao" · `Tuần` (tên sao) khớp
  "tuần này" · `Â`/`Ã` hợp lệ bị báo mojibake. Mẫu phải là **CỤM ĐỦ NGHĨA**; biên từ
  KHÔNG cứu được vì tiếng Việt viết rời từng âm tiết.
- **Hai lối bỏ dấu thanh** (`khoẻ` vs `khỏe`) → chuẩn hoá bằng
  `chuanHoaDauThanh()` (`lib/vn-text.ts`), **đừng bỏ dấu thanh** (`tật`↔`tất`).
- `đ/Đ` KHÔNG tách được bằng NFD — phải đổi tay.
- Dấu tổ hợp trong mã nguồn phải viết bằng escape `\uXXXX` (vô hình khi đọc diff).

## Đo lường

- **Traffic: luôn dùng bản `_human`.** 83% "visitors" là máy — `visitors_human`,
  `wau_human`, mẫu số `human`. GA4 **không lọc được**, đừng lấy `ga4.sessions` làm
  số khách. Trước khi báo bất kỳ mức tăng/giảm nào phải xem bản `_human`.
- **Log của bên GỬI không chứng minh bên NHẬN hiện ra.** Web-push "sent=2" suốt hai
  tháng trong khi `sw.js` không có handler `push`.
- **Con số của CỔNG TUYỂN không phải con số NGƯỜI XEM NHẬN** — đo trên chính bản
  giao ra (mp4/PNG đã render), đừng tin số của khâu lọc đầu vào.
- **Event = 0 thì phải hỏi "nó có được cắm ở MỌI đường tới chưa" TRƯỚC khi kết
  luận người dùng không quan tâm.** `invite_shown` = 0 suốt 17 ngày hoá ra vì lời
  mời chỉ cắm ở 1 trong 2 tấm tường mà người hết Lượng gặp
  (`docs/nhat-ky/2026-08.md`, mục "Dọn thư viện").
- **Khoảng cách giữa hai event ĐỀU BẮN LÚC LOAD không phải "thời gian ở lại".**
  `max(ts)-min(ts)` của khách chỉ có `page_view`+`tool_open` luôn ≈ 0 theo ĐỊNH
  NGHĨA — đã đọc nhầm thành "rời sau 0.1 giây" và suýt chỉ đạo một lượt thiết kế
  lại landing. Muốn nói về dwell thì phải có dụng cụ đo dwell: nay có
  `scroll_depth` + `page_dwell` (`meta.sec`/`meta.max_pct`) trong `track.js`.
  🪤 Trang `/app/*` cuộn trong `#ws`, KHÔNG cuộn window — nghe `scroll` ở pha
  **capture** trên `document`, gắn vào window là vĩnh viễn 0.
  `docs/nhat-ky/2026-09.md` "một con số tôi đã báo SAI".
- **Google Ads auto-tagging gắn `gclid`, KHÔNG gắn UTM** — `track.js` suy
  `utm_source=google, utm_medium=cpc` từ `gclid` khi trang chưa tự có `utm_source`
  (`currentTouch()`). Thiếu suy luận này thì mọi click Ads rơi lẫn vào `(none)`
  cùng traffic direct/organic thật, KHÔNG tách lại được — nhìn báo cáo tổng sẽ
  tưởng nhầm "Ads không ra traffic" trong khi nó ra thật, chỉ không được gắn nhãn.
  `docs/nhat-ky/2026-09.md` "Google Ads có traffic thật, 0 sign up".
- **Bộ lọc của một bậc phễu phải theo kịp mọi đường mới thêm vào bậc đó** —
  `viral_loop_funnel` lọc cứng `meta.from='share'` nên mù hẳn với đường B2
  (`share_form`): số không sai công thức, nó ĐẾM HỤT.
