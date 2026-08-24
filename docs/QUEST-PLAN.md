# 🎮 QUEST / GAMIFICATION — workplan (2026-08-23)

Nguồn: brief của Henry (16 mục, gen-Z 18–30). Mục tiêu chốt: (1) làm quen hệ
thống · (2) hook dùng tool · (3) trigger share/mời.

**Đọc mục "Số đo nền" trước khi sửa bất cứ con số reward nào trong file này.**

---

## 📊 1. SỐ ĐO NỀN (prod, 2026-08-23 — đo trước khi thiết kế)

| | |
|---|---:|
| Tài khoản | **66** (30 ngày gần nhất: **9**) |
| Người ĐĂNG NHẬP có hoạt động (90N) | **14** |
| ↳ trong đó hoạt động **đúng 1 ngày** | **11** |
| ↳ 3 ngày | 2 |
| ↳ 29 ngày | **1** (chính Henry) |
| Chạy tool 30N — **khách vô danh** | **86 người** / 437 lượt |
| Chạy tool 30N — **đã đăng nhập** | **9 người** / 939 lượt |
| Nhiệm vụ M3 đã nhận | **4 lượt / 2 người** |
| Dòng `referrals` | **1** |
| Mã khuyến mãi đã dùng | **0** |
| Người từng nạp tiền | **3** |
| Ví có số dư ≥ 25 Lượng | **18** |
| Lượng đang lưu hành | 20.654 (≈16k của 2 ví admin/test) |

Chi phí thật mỗi lượt (bảng `events.llm_usage`, 30N): Luận Giải ~**35đ**/lượt LLM
(24 lượt/bản ≈ 840đ) · Vận Hạn 12 Tháng **1.505đ**/phần · chân dung ~**600–1.700đ**
(ảnh) · rail Anthropic **~4.000đ**. Giá bán 1 Lượng ≈ **829đ**.

---

## 🔴 2. BỐN PHÁT HIỆN LẬT NGƯỢC BRIEF

### 2.1 — 90% người dùng KHÔNG CÓ TÀI KHOẢN
86 khách vô danh vs 9 người đăng nhập cùng chạy tool. Quest đặt dưới **Tài khoản**
chỉ với tới **10%** người thật.

⇒ **Mọi quest phải có BẬC 0 cho khách vô danh**: tiến độ đếm ở máy (`anon_id` +
localStorage), phần thưởng CHỈ nhận được sau khi tạo tài khoản. Đó là hook đăng ký
mạnh nhất đang bỏ phí: *"Bạn đã làm 2/3 việc — tạo tài khoản để nhận."*
Quest chỉ-cho-người-đã-đăng-nhập = tái lập đúng lỗi M3 (4 lượt / 2 người).

### 2.2 — Retention người đăng nhập ≈ 0 → streak là thiết kế cho tệp KHÔNG TỒN TẠI
**11/14 người chỉ hoạt động đúng MỘT ngày.** Mục 4 (streak day 2·3·5·7) và mục 3
(daily quest reset mỗi ngày) giả định có người quay lại — chưa ai quay lại.

⇒ **HOÃN streak.** Bật khi đo được ≥20% user quay lại ngày 2 (xem §6, cổng Q6).
Việc trước mắt không phải "giữ người quay lại mỗi ngày" mà là **giữ họ ở lại LÂU
HƠN trong lượt đầu** — vì đến giờ gần như ai cũng chỉ có một lượt đó.

### 2.3 — KHÔNG AI THIẾU LƯỢNG → phát thêm Lượng không giải quyết gì
18 ví còn ≥25 Lượng (đủ ít nhất 1 tool) **nằm im**. 20.654 Lượng lưu hành, 3 người
từng nạp. Nút thắt là **không quay lại tiêu**, không phải hết tiền.

⇒ Reward chính KHÔNG phải Lượng, mà là **mở khoá nội dung đã tính sẵn (0đ)** +
**lượt rail tặng** (`rail_free_grant` — quầy đếm hẹp, không quy đổi ngược).

### 2.4 — Reward inflation trong brief đá thẳng vào cầu dao ảnh
Brief: daily 5+5+(5–20) = **tối đa 30 Lượng/ngày/user**, cộng streak + share + gacha.
| Va chạm | |
|---|---|
| `viral.free_gen_daily_cap` = **6 lượt/ngày TOÀN HỆ THỐNG** (2 tool ảnh) | 10 user chăm chỉ đốt sạch trước trưa → quest hứa mà không giao được |
| Lượng tiêu được vào **mọi thứ** | 30/ngày × 30 = 900 Lượng = **9 bản Luận Giải** (giá 100) phát không |
| Quà đăng ký đang 25 | thêm 30/ngày làm quà đăng ký mất hết ý nghĩa |

🔑 **Luật cứng rút ra (đã có tiền lệ V2.2 trong CLAUDE.md):** *phần thưởng LẶP LẠI
theo ngày KHÔNG BAO GIỜ trả bằng Lượng.* Lượng chỉ trả cho việc **một-lần-đời**
hoặc việc có **bên thứ ba xác nhận** (referral, `share_view`).

---

## ✅ 3. ĐÁNH GIÁ TỪNG MỤC CỦA BRIEF

| # | Mục | Phán quyết | Lý do |
|---|---|---|---|
| 1 | Core principles | **GIỮ** | ≤3 action/ngày, ≤60s — đúng |
| 2 | Onboarding quest | **SỬA** | 3 việc hiện tại là việc HÀNH CHÍNH (lưu lá số/bật push/liên kết chat) — không việc nào cho thấy sản phẩm hay hơn ⇒ 2 người làm. Đổi sang việc MỞ RA nội dung đọc được. Thưởng theo **CHUỖI** (đủ 3 mới +15), không thưởng lẻ từng bước |
| 3 | Daily quest | **HOÃN → thay bằng Bản Đồ** | §2.2 |
| 4 | Streak | **HOÃN có điều kiện** | §2.2, cổng Q6 |
| 5 | Milestone/level | **GIỮ, đổi trục** | Đếm theo **MẢNG ĐỜI đã đọc** chứ không theo "số view" — view là chỉ số rỗng, ai F5 cũng lên level |
| 6 | Referral | **GIỮ, đã có sẵn** | Hạ tầng đủ (`process_referral_signup` 15 Lượng, cap 15). Thiếu **chỗ ĐẶT** + **mốc**. Brief đề xuất +20 mỗi bên — giữ 15, thêm mốc 3 người → +50 |
| 7 | Social share | **SỬA CƠ CHẾ** | ⛔ Không thưởng cho **hành vi bấm** (không verify được, farm 10 giây). Thưởng khi link **ĐƯỢC MỞ** (`share_view` — event đã có), +5, cap 3/ngày |
| 8 | Email invite | **BỎ** | Repo KHÔNG có đường gửi email marketing (chỉ email auth của Supabase). Dựng SMTP + chống spam cho 14 user là sai chỗ đầu tư |
| 9 | Gacha | **HOÃN** | 5% premium trên 14 user = 0,7 lượt/tháng — không ai cảm nhận được "may mắn". Và nó dạy người ta reward là ngẫu nhiên, phá quan hệ *làm X được Y* đang cần dựng. Bật lại khi ≥500 DAU |
| 10 | Locked content | **SỬA, GIỮ TINH THẦN** | ⛔ "Full report unlock bằng mời bạn" phá mô hình W1 (phát không hàng tốn tiền model). Khoá bằng **CHƯA TỪNG MỞ** thay vì bằng tiền: mở ra là bản tính thử **0đ** đã có, đọc sâu vẫn trả Lượng |
| 11 | Trigger/notification | **GIỮ** | Có sẵn web-push (R1a) + Telegram. Câu chữ trong brief đúng hướng |
| 12 | Anti-abuse | **GIỮ + BỔ SUNG** | Đã có device cap 5, referral cap, unique key. Thêm: **cầu dao Lượng/ngày toàn hệ thống** cho quest |
| 13 | Gen-Z optimization | **GIỮ** | |
| 14 | Full loop | **GIỮ** | |
| 15 | Nguyên tắc sống còn | **GIỮ + 1 luật** | Thêm: *reward lặp lại ≠ Lượng* (§2.4) |
| 16 | Outcome | **SỬA MỐC** | Kỳ vọng "tăng retention/viral/revenue" chưa đo được ở n=14. Mốc thật xem §6 |

---

## 🧭 4. THIẾT KẾ ĐÃ CHỈNH — "HÀNH TRÌNH TRI MỆNH"

Ba tầng, mỗi tầng đúng một mục tiêu Henry nêu.

### Tầng 1 — KHỞI HÀNH (mục tiêu 1: làm quen)
Thay hẳn M3. Ba bước, mỗi bước **mở ra một thứ đọc được**, không phải một thao tác:

| Bước | Việc | Mở ra | Bằng chứng server tra |
|---|---|---|---|
| 1 | Lập lá số | "Vận hôm nay" bản **cá nhân** (cung nhật hạn, xung tuổi) | `user_charts` |
| 2 | Hỏi Thầy 1 câu | dùng 1 trong 3 lượt rail dùng thử | `events.chat_msg` |
| 3 | Xem thử 1 công cụ bất kỳ | bản tính thử W1 (0đ) | `events.preview_shown` hoặc `tool_run` |

- Thưởng **+15 Lượng khi xong CẢ BA** (một lần/đời). Thưởng lẻ từng bước thì người
  ta nhặt bước rẻ nhất rồi bỏ — đúng thứ đang xảy ra (`luu_la_so` 2 lượt, hai bước
  kia 1 lượt).
- **BẬC 0 (khách vô danh):** tiến độ vẫn chạy, thanh vẫn hiện, nút cuối là
  *"Tạo tài khoản để nhận 15 + 25 Lượng chào mừng"*.
- Giữ 2 nhiệm vụ cũ (bật thông báo · liên kết chat) nhưng **tách sang tầng khác**:
  chúng là kênh liên lạc, không phải bước làm quen. Thưởng giữ 10 mỗi cái.

### Tầng 2 — BẢN ĐỒ LÁ SỐ (mục tiêu 2: hook dùng tool)
Thay daily quest. **8 mảng đời**, mỗi mảng gắn 1–2 công cụ (lấy từ `tool_groups`
đã có, không chép tay):

`Bản thân · Sự nghiệp · Tình duyên · Gia đạo · Tài lộc · Vận hạn · Con cái · Sức khoẻ`

- Chưa mở = mờ + một câu trêu (*"Cung Phu Thê của bạn chưa ai đọc"*).
- Mở = chạy bản tính thử **0đ** (W1 đã dựng sẵn cho 5 tool, các tool khác dùng
  phần deterministic đang có).
- Thanh tiến độ: *"Bạn đã đọc 3/8 mảng lá số"*.
- Mốc: **4/8 → +10 Lượng** · **8/8 → mở "Tổng Kết Vận Mệnh"** (1 lượt LLM ≈ 35đ,
  dựng từ dữ liệu ĐÃ TÍNH — không gọi lại tool nào).
- 🔑 Vì sao hơn daily quest: nó không đòi người ta quay lại HÔM SAU (chưa ai làm),
  nó chỉ đòi họ ở lại lâu hơn trong lượt đang có.

### Tầng 3 — LAN TOẢ (mục tiêu 3: share/mời)

**🔴 Đo lại 24/08 — nút thắt KHÔNG phải mức thưởng:**
| | |
|---|---:|
| Link chia sẻ đã tạo | 46 |
| ↳ **số người từng bấm nút Share** | **3** |
| Link có người mở | 28/46 |
| **Lượt mở TB mỗi link** | **1,7** |
| `chan-dung-vo-chong` (tool có ảnh) | 18 link · **2,2 lượt mở/link** |
| **Tải poster 9:16** (dựng xong từ V3, có QR) | **2 lượt** |

Link chia sẻ **ăn thật** — mỗi link kéo TB 1,7 người mở. Cái chết nằm ở chỗ **không
ai bấm nút**. Đổ Lượng vào đây là trả tiền cho một hành vi vốn không xảy ra.
⇒ Thứ tự sửa: **(a) chỗ ĐẶT nút → (b) LÝ DO khoe → (c) mới tới thưởng.**

**(a) Chỗ đặt** — nút Chia sẻ/Ảnh hiện nằm trên thanh `.ws-actions` của shell, đọc
như chrome của trang chứ không như một lời mời (đúng lỗi đã ghi ở track nút "Sửa"
của `ngu-hanh-ten`). Đặt thêm một lời mời **ngay cuối phần kết quả**, đúng lúc vừa
đọc xong — không phải lúc hết Lượng như `invite-cta` hiện tại.

**(b) Lý do khoe** — hai mỏ đã có sẵn, chưa dùng đúng:
- **Chỉ số hiếm** từ `public/data/tuvi-dataset-v1.json` (96.480 lá số), 0đ, tất định.
  ⚠️ **BẤT BIẾN TRUNG THỰC (CLAUDE.md)**: đây là phân bố trên KHÔNG GIAN THỜI ĐIỂM
  SINH, **không phải phân bố dân số** ⇒ *"trong các thời điểm sinh có thể có, 16,5%
  cho ra mệnh vô chính diệu"*, **CẤM** viết *"16,5% người Việt"*. Caveat đi kèm mọi
  nơi khoe, kể cả poster.
- **Ảnh chân dung** — tool có ảnh đang lan gấp ~1,5 lần tool chữ (2,2 vs 1,5 lượt mở).

**(c) Thưởng** — chỉ sau khi (a)(b) xong:
- Thưởng theo **`share_view`** (link được mở), KHÔNG theo cú bấm: bấm không verify
  được, farm 10 giây. Người mở ≠ người chia sẻ. Chín sau 24h (§7.3).
- **Mời bạn**: giữ 15 Lượng/lượt + cap 15; thêm mốc **3 người → +50**.
- **Đăng bài/review** (Henry nêu): không verify tự động được ⇒ form nộp link +
  admin duyệt tay. Ở quy mô hiện tại (14 user hoạt động) duyệt tay là khả thi, và
  nó chặn được đúng thứ mà thưởng-tự-động không chặn nổi.

### 3.5. 🔴 Henry hỏi thêm (24/08): "vẫn thiếu activity để user ĐĂNG facebook/
instagram" — nghiên cứu + 4 mục mới, đè lên đúng dòng "Đăng bài/review" ở trên

**Đã kiểm tra trước khi thiết kế (đừng đọc rộng hơn số hiện có):** con số §1 là
n=14–66, chưa đủ để kết luận gì — Henry đúng, không nên đóng khung theo baseline
đó. Bốn mục dưới đây bổ sung THÊM hành động cụ thể vào tầng Lan Toả, không thay
thế mấy mục đã có.

**Nghiên cứu (WebSearch, 24/08) — một giới hạn phải nói thẳng trước khi thiết kế
bất cứ gì:** không có cách nào xác minh tự động một lượt đăng Story lên Instagram/
Facebook — Instagram **không phát lộ dữ liệu screenshot/lượt xem qua API cho bất
kỳ ứng dụng thứ ba nào**, và mọi dịch vụ quảng cáo "báo ai đã xem/chụp story bạn"
đều là lừa đảo (đánh cắp mật khẩu). Đây **không phải giới hạn riêng của app này**
— toàn ngành growth loop đều dừng ở đúng một mức: **người dùng TỰ NỘP bằng chứng
(link công khai hoặc ảnh chụp), admin xác nhận bằng mắt**. Ở quy mô hiện tại (một
mình Henry duyệt), việc này khả thi — cùng khuôn với hàng đợi Seeding Group/Media
Queue đã có trong admin.

1. **"Khoe Kết Quả" — nộp bằng chứng đã đăng, cụ thể hoá dòng "Đăng bài/review"
   ở trên thành một luồng dựng được:**
   - Nút mới cạnh Chia sẻ/Ảnh: *"Đã đăng lên Facebook/Instagram? Dán link hoặc
     gửi ảnh chụp — nhận +20 Lượng"*.
   - Bài đăng THƯỜNG (FB post/IG feed) → dán **link công khai**. Story (FB/IG,
     tự xoá sau 24h, KHÔNG có link bền) → **tải ảnh chụp màn hình** — đây là
     đường DUY NHẤT chứng minh được Story, đúng giới hạn vừa nêu ở trên.
   - Bảng mới `social_post_submissions(user_id, platform, url, screenshot_path,
     status:pending|approved|rejected, submitted_at, reviewed_at)`. UNIQUE trên
     `url` khi có (chặn 2 tài khoản cùng nộp 1 link) + trần **1 lượt/nền tảng/7
     ngày/user** (chặn nộp lại ảnh cũ mỗi tuần).
   - Admin: một hàng đợi duyệt (mở link/ảnh → Duyệt/Từ chối), đúng UX các hàng
     đợi duyệt tay đã có. Duyệt xong mới cộng Lượng qua `credit_transactions`
     (`meta.source='social_proof'`) — **không auto-cộng lúc nộp**.
   - ⚠️ Không thay được bằng "đăng thẳng lên trang" — CLAUDE.md đã chốt ranh giới
     cứng: máy **không tự đăng, không tự gửi**; ở đây máy chỉ soạn sẵn (mục 3) và
     ghi nhận, người tự tay đăng và tự tay dán link/ảnh.

2. **Rủ người kia so lá số — CTA đi thẳng, không chờ hết Lượng như `invite-cta`:**
   3 tool đã có sẵn đúng cơ chế viral mạnh nhất của ngành tử vi (Co-Star nổi lên
   nhờ đúng một tính năng: *thêm bạn, so biểu đồ với nhau* — WebSearch 24/08 xác
   nhận đây là công cụ giữ chân/lan truyền chủ lực của họ, không phải nội dung
   hằng ngày). `tuong-hop` / `chan-dung-vo-chong` / `duyen-no-tien-kiep` đang có
   sẵn nhưng nút Chia sẻ hiện đọc như "khoe kết quả của TÔI" chung chung. Đổi câu
   CTA ngay dưới kết quả thành lời **RỦ ĐÍCH DANH**: *"Rủ [đối tác/crush/bạn
   thân] nhập ngày sinh xem có hợp không →"* — người mời phải tự đẩy bạn mình mở
   link (khác hẳn share thụ động), và đúng khoảnh khắc vừa đọc xong là lúc tò mò
   cao nhất. 0đ, chỉ đổi 1 dòng copy + 1 chỗ đặt, không cần migration.

3. **Caption soạn sẵn + share-thẳng-vào-Story trên di động** — friction lớn nhất
   khi đăng không phải "có muốn khoe không" mà là "viết gì bây giờ". Thêm nút
   **"Sao chép caption"** cạnh nút Ảnh: 2–3 câu xoay vòng, giọng đời thường, kèm
   hashtag cố định — copy dán thẳng vào status/story. Trên di động, dùng
   `instagram-stories://share` (URL scheme có thật của Instagram) để mở thẳng
   màn "thêm vào Story" với ảnh poster đã nạp sẵn, bớt 2–3 bước lưu-ảnh-mở-app-
   đính-ảnh. Không xác minh được lượt Story đó (xem giới hạn ở trên) — đây là
   bước GIẢM MA SÁT lúc đăng, thưởng vẫn đi qua mục 1.

4. **⏰ Có hạn chót, không phải "làm khi nào cũng được":** `docs/GROWTH-
   BRAINSTORM.md` §4 đã cảnh báo Tết 2027 cần nội dung SEO chuẩn bị trước ~6
   tháng; hôm nay còn **~5 tháng**. Cùng logic đó áp cho quest: *"xem tuổi xông
   đất"* / *"vận năm Đinh Mùi 2027"* là loại kết quả người Việt vốn đã có thói
   quen khoe trên Facebook mỗi dịp Tết — dựng card kèm CTA khoe **trước tháng
   11** thì mới kịp mùa cao điểm; dựng sau Tết là lỡ trọn một năm.

5. **⚠️ Một mỏ KHÔNG dùng được ngay:** "mời follow/like Trang Facebook" nghe hợp
   lý nhưng Trang hiện **0 bài live** (token chết, 54 bài kẹt hàng đợi — xem mục
   BẢN ĐỒ 8 KÊNH trong CLAUDE.md). Trỏ user vào một Trang im lặng là phí một lời
   mời. Không chặn 4 mục trên (chúng không phụ thuộc Trang) — chỉ đừng thêm quest
   loại "ghé Trang" tới khi token được cấp lại.

## 🖥️ 5. TỔNG QUAN MỚI (`/app`)

Bỏ list 58 công cụ. Thứ tự đọc (mobile 390px trước):

1. **Vận hôm nay** — GIỮ NGUYÊN, không đụng (đang là nội dung chính, có poster/QR).
2. **Tiếp tục từ đâu** — 1 thẻ gợi ý công cụ + **một câu lý do**.
3. **Hành trình của bạn** — thanh tiến độ Bản Đồ + nút mở mảng kế + Khởi Hành nếu chưa xong.
4. **Mời bạn** — mã + nút chép + tiến độ mời (kéo `invite-cta.js` lên, hiện LUÔN
   thay vì chỉ khi hết Lượng).
5. Một dòng **"Xem tất cả 58 công cụ →"** trỏ `/cong-cu`.

**Gợi ý công cụ theo hành vi — LUẬT, KHÔNG LLM** (0đ, tất định, giải thích được):
| Điều kiện | Gợi ý |
|---|---|
| Chưa có lá số | Luận Giải Lá Số |
| Có lá số, chưa xem vận hạn | Vận Hạn 12 Tháng |
| Vừa dùng tool X | tool cùng `need_tags` chưa dùng |
| Đã dùng `day-con` | Hướng Nghiệp Sớm Cho Con |
| Đã đọc ≥4 mảng | mảng còn thiếu |

⛔ **KHÔNG nêu giá trên thẻ gợi ý** — tiền lệ `lib/tools/suggest-tool.ts`: dán giá
vào đúng lúc đang giúp biến lời chỉ đường thành lời chào hàng. (Cũng nhờ vậy không
đụng bộ dò `check:prices`.)

⚠️ **Rủi ro đã lường:** bỏ list tool khỏi Tổng Quan là bỏ một đường vào của 58 công
cụ. Sidebar vẫn còn + link `/cong-cu` vẫn còn. Mốc canh: `cta_click` từ dashboard
hiện **50 lượt / 16 người** trong 30N — tụt dưới mức đó sau 2 tuần thì trả lại 4–6
thẻ gợi ý dạng lưới.

---

## 🛠️ 6. WORKPLAN — mỗi mục 1 PR

Thứ tự chọn theo: chạm được nhiều người nhất trước, rủi ro kinh tế thấp nhất trước.

### Q1 — Tổng Quan mới (KHÔNG quest)
Vận hôm nay (giữ) + thẻ gợi ý theo luật + mã mời + link `/cong-cu`. Bỏ list tool.
- Đụng: `public/app-home.html`, `public/invite-cta.js`, có thể `shell.js`.
- Không migration. Không phát Lượng. **Rủi ro thấp nhất, làm trước.**
- Verify: Playwright 390/1440px, `cta_click` vẫn bắn, không tràn ngang.

### Q2 — Bản Đồ 8 mảng + tiến độ
- Migration: `quest_progress(user_id, mang_key, opened_at)` — khoá chính `(user_id, mang_key)`.
  Khách vô danh: đếm ở localStorage, **đồng bộ lên khi đăng nhập**.
- Mảng → công cụ lấy từ `tool_groups`/`tool_pricing`, **không chép tay**.
- Reward mốc 4/8 = +10 Lượng qua RPC atomic (mẫu `onboarding_task_claim`).
- Verify: mở đủ 8 mảng không phát quá 1 lần; khách vô danh có tiến độ; đồng bộ không nhân đôi.

### Q3 — Khởi Hành 3 bước (thay M3) + bậc khách vô danh
- Giữ bảng `onboarding_tasks`, **thêm** 3 key mới, giữ 2 key cũ ở tầng khác.
- Thưởng chuỗi: chỉ cộng khi đủ 3 → một dòng `onboarding_tasks` key `khoi_hanh`.
- Verify: server tự kiểm cả 3 bằng chứng (fail-closed), nhận 2 lần không cộng 2 lần.

### Q4 — Lan toả: chỉ số hiếm + thưởng `share_view` + mốc mời
- Chỉ số hiếm đọc `tuvi-dataset-v1.json`, **kèm caveat trung thực bắt buộc**.
- RPC `quest_share_claim`: chỉ nhận `share_view` của link mình tạo, người mở ≠ mình,
  cap 3/ngày, cửa sổ 7 ngày.
- Mốc mời 3 người → +50 (đọc `referrals` đã thưởng, không đếm signup suông).
- **Khoe Kết Quả** (§3.5.1): bảng `social_post_submissions` + hàng đợi duyệt tay
  trong admin (mẫu Seeding Group/Media Queue) + `+20 Lượng` khi Duyệt
  (`meta.source='social_proof'`), UNIQUE url + trần 1/nền tảng/7 ngày.
- **Rủ so lá số** (§3.5.2): đổi copy CTA của 3 tool compat — 0đ, không migration,
  làm CÙNG PR vì rẻ và độc lập.
- **Caption soạn sẵn + `instagram-stories://share`** (§3.5.3): nút mới cạnh Ảnh.
- ⏰ Ưu tiên trước Q5–Q7 nếu muốn kịp mùa Tết 2027 (§3.5.4, hạn ~tháng 11).

### Q5 — "Tổng Kết Vận Mệnh" (phần thưởng 8/8)
- 1 lượt LLM (~35đ) dựng từ dữ liệu đã tính. Cache theo lá số (`portrait_cache`
  pattern + `cacheFor(toolId, shape)` — **bắt buộc khai `shape`**, đã cắn 2 lần).

### Q6 — Quay lại ngày 2 — **CHỈ LÀM NẾU** Q1–Q4 đẩy được retention D1 > 0
- Cổng: đo lại phân bố "số ngày hoạt động/user" sau 3 tuần. **≥20% user mới có ≥2
  ngày** thì mới code streak; dưới mức đó thì streak là trang trí.

### Q7 — Streak + gacha — **HOÃN**, cổng ≥500 DAU (hiện DAU người thật ~3–4).

---

## ⚖️ 7. KINH TẾ REWARD — Henry chốt: KHÔNG chặn, chống abuse bằng THU HỒI (2026-08-24)

Henry bác hai trần tao đề xuất: *"tao đang muốn dùng chính cái product để làm viral
marketing… tính ra còn rẻ hơn chi phí marketing chạy paid ads, ko nên chặn, nhưng
phải làm cơ chế chống abuse rõ ràng… nếu phát hiện user abuse thì mình có cơ chế
thu hồi lượng lại được."*

**Chốt lại:**
| | |
|---|---|
| ~~Trần 20 Lượng/user/ngày~~ | **BỎ** |
| ~~Trần 300 Lượng/ngày toàn hệ thống~~ | **BỎ** |
| `viral.free_gen_daily_cap` (2 tool ảnh) | **GIỮ**, nới 6 → **10** |
| Luật *reward lặp lại ≠ Lượng* | **NỚI** thành *reward lặp lại có ĐỘ TRỄ 24h* |

### 7.1 — Vì sao vẫn giữ đúng MỘT cầu dao, và nó không phải trần Lượng
Nó gác **chi phí model thật**, không gác Lượng. Chi phí thật lệch nhau rất xa:
| Tool | Chi phí model/lượt | Giá bán |
|---|---:|---:|
| Luận Giải 24 phần | ~840đ | 100 Lượng (82.900đ) |
| Chân dung (có ảnh) | ~1.100–1.700đ | 20–30 Lượng |
| **Vận Hạn 12 Tháng** | **~24.000đ** (16 lượt LLM) | 50 Lượng (41.450đ) |

Phát Lượng thoải mái đúng với tool chữ. Nhưng Lượng tiêu được vào **mọi thứ** nên
nó cũng chảy vào Vận Hạn — chỗ biên mỏng nhất. Cầu dao này do chính Henry chốt ở
track V2.2 ($15/tháng); nới lên 10 vì gpt-image-2 rẻ hơn 34%.

### 7.2 — 🔴 THU HỒI: chưa có, và có giới hạn phải nói trước
Repo hiện chỉ có `add_credits` / `deduct_credits`. **Không có `revoke`, không có nhãn
nguồn gốc trên từng dòng Lượng, không có bộ dò abuse.** Phải dựng ở Q4.

> ⚠️ **Lượng đã TIÊU thì không thu hồi được.** Thu hồi chỉ lấy lại phần còn trong ví.
> Kẻ farm 300 Lượng rồi đốt ngay vào tool ảnh trong một giờ — lúc phát hiện thì tiền
> model đã cháy. Thu hồi chỉ có răng khi reward có ĐỘ TRỄ.

### 7.3 — Bộ chống abuse KHÔNG CHẶN (thay cho trần)
1. **Nhãn nguồn gốc** — `credit_transactions.meta.source` (`quest` · `referral` ·
   `share` · `signup`) để thu hồi đúng phần đã phát, không đụng Lượng người ta mua.
2. **Độ trễ 24h cho reward rủi ro cao** (chính brief mục 12 đã ghi): share + referral
   ghi `pending`, chín sau 24h. UI nói thẳng *"+15 Lượng — nhận sau 24 giờ"*.
   Reward **một-lần-đời** (Khởi Hành) cộng ngay, không trễ.
3. **Bộ dò abuse** đi ké cron `anomaly-alerts` (3h/lượt, đã có): nhiều tài khoản cùng
   `device_id` · referral cùng IP/khung giờ · `share_view` tự mở (người mở = người
   chia sẻ) · tốc độ bất thường. Bắn Telegram admin, **không tự chặn**.
4. **RPC `revoke_credits`** + nút trong user drawer của Admin (đã có nút +Credits).
   Ghi `credit_transactions type='revoke'`, soát số dòng, không cho âm ví quá mức đã phát.
5. **Ràng buộc đã có, giữ nguyên:** `credits.signup_bonus_device_cap=5` ·
   `blocked_email_domains` · UNIQUE `referee_user_id` · cấm tự refer.

## 📏 8. MỐC ĐO — đặt trước để khỏi tự lừa mình

⚠️ **Henry nhắc (24/08): đừng đọc n nhỏ này thành kết luận chắc.** Site mới ra
mắt, mẫu còn quá mỏng để "tỉ lệ % đạt/hỏng" có ý nghĩa thống kê thật. Bảng dưới
vẫn giữ làm ĐIỂM NEO (đo lại thấy gì thì ghi lại thấy đó), **không phải phán
quyết cuối cùng về việc gamification có tác dụng hay không** — 3 tuần đầu chủ
yếu để phát hiện lỗi thiết kế rõ ràng (0 ai bấm nút vì đặt sai chỗ, câu chữ hứa
hụt…), không phải để đóng track lại nếu %  chưa đạt.

Baseline hôm nay: **14 user hoạt động · 11 người chỉ 1 ngày · 1 referral · 0 promo ·
4 lượt nhiệm vụ · 86 khách vô danh chạy tool.**

Sau **3 tuần** kể từ khi Q1–Q4 lên prod:
| Chỉ số | Baseline | Đạt | Hỏng |
|---|---:|---|---|
| Khách vô danh → đăng ký (bậc 0) | — | ≥8% | <3% ⇒ hook sai chỗ |
| User mới hoàn tất Khởi Hành | 2/66 | ≥30% | <10% ⇒ 3 bước vẫn quá hành chính |
| Số mảng đọc TB/user | ~1 | ≥2,5 | ≤1,5 ⇒ Bản Đồ chỉ là trang trí |
| Dòng `referrals` | 1 | ≥10 | ≤3 ⇒ vấn đề ở LÝ DO share, không phải mức thưởng |
| User có ≥2 ngày hoạt động | 3/14 | ≥20% | <10% ⇒ **đừng làm streak** |

**Tiêu chí DỪNG:** cả 5 chỉ số đứng yên sau 3 tuần ⇒ nút thắt KHÔNG nằm ở
gamification mà ở lưu lượng (98 người thật/tuần) ⇒ dồn sức về kênh phân phối, gỡ
quest xuống mức tối thiểu thay vì đắp thêm tầng.

---

## 🪤 9. BẪY ĐÃ LƯỜNG (đọc trước khi code)

1. **`_shape` cache** — thêm field vào payload tool nào là phải bump `SHAPE`, nếu
   không dòng cache cũ trả bản thiếu, IM LẶNG. Đã cắn 2 lần.
2. **`extractGenericContext` bỏ im lặng mọi giá trị `object`** — data gửi rail phải PHẲNG.
3. **Không chép giá vào HTML** — `npm run check:prices` chặn CI.
4. **Reward phát 2 lần**: chống trùng ở **KHOÁ CHÍNH của DB**, không ở cờ trong mã
   ứng dụng. Thứ tự bắt buộc: **ghi dấu TRƯỚC, cộng tiền SAU**.
5. **`UPDATE user_credits` phải UPSERT + soát số dòng** — 9 tài khoản cũ không có
   dòng ví; thiếu chốt là "thưởng ma" (sổ ghi đã trả, ví không tăng).
6. **Hàm `RETURNS TABLE`**: mọi cột trong thân phải ghi kèm tên bảng (`42702`).
7. **Hàm SECURITY DEFINER mới**: `REVOKE EXECUTE FROM public, anon, authenticated`
   + `SET search_path = public, pg_temp` — EXECUTE cho PUBLIC là dựng sẵn của Postgres.
8. **Bỏ list tool khỏi Tổng Quan** — canh `cta_click` (xem §5).
