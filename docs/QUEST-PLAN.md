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
- **Chỉ số hiếm** — lý do để khoe, tính từ engine, **0đ, tất định**. Mỏ có sẵn:
  `public/data/tuvi-dataset-v1.json` (96.480 lá số) đã đo phân bố thật.
  ⚠️ **BẤT BIẾN TRUNG THỰC (CLAUDE.md)**: đây là phân bố trên KHÔNG GIAN THỜI ĐIỂM
  SINH, **không phải phân bố dân số** ⇒ câu đúng là *"trong các thời điểm sinh có
  thể có, 16,5% cho ra mệnh vô chính diệu"*, **CẤM** viết *"16,5% người Việt"*.
  Câu caveat phải đi kèm mọi nơi khoe, kể cả poster.
- **Thưởng share theo `share_view`**, không theo cú bấm. +5 Lượng/lượt mở, cap
  3/ngày, không tính lượt tự mở (so `anon_id` người mở ≠ người chia sẻ).
- **Mời bạn**: giữ 15 Lượng/lượt + cap 15 như hiện tại; thêm mốc **3 người → +50**
  (đủ đúng 1 tool 50 Lượng — con số nói thẳng được, không hứa lửng lơ).
- ⛔ Không hứa "mời 5 người mở tool ảnh free": trần ảnh 6/ngày toàn hệ thống
  không gánh nổi lời hứa đó.

---

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

### Q5 — "Tổng Kết Vận Mệnh" (phần thưởng 8/8)
- 1 lượt LLM (~35đ) dựng từ dữ liệu đã tính. Cache theo lá số (`portrait_cache`
  pattern + `cacheFor(toolId, shape)` — **bắt buộc khai `shape`**, đã cắn 2 lần).

### Q6 — Quay lại ngày 2 — **CHỈ LÀM NẾU** Q1–Q4 đẩy được retention D1 > 0
- Cổng: đo lại phân bố "số ngày hoạt động/user" sau 3 tuần. **≥20% user mới có ≥2
  ngày** thì mới code streak; dưới mức đó thì streak là trang trí.

### Q7 — Streak + gacha — **HOÃN**, cổng ≥500 DAU (hiện DAU người thật ~3–4).

---

## ⚖️ 7. KINH TẾ REWARD — cầu dao bắt buộc (làm ở Q2, trước khi phát đồng nào)

| Chốt | Giá trị | Nơi chỉnh |
|---|---|---|
| Trần Lượng quest/user/ngày | **20** | `app_config['quest.daily_user_cap']` |
| Trần Lượng quest/toàn hệ thống/ngày | **300** | `app_config['quest.daily_global_cap']` |
| Reward lặp lại theo ngày | **KHÔNG bằng Lượng** — dùng `rail_free_grant` | luật thiết kế |
| Đặt trần = 0 | **TẮT HẲN** quest reward | `app_config` |
| Hướng fail | **FAIL-CLOSED** (đọc hụt → không phát) | mẫu `lib/onboarding/tasks.ts` |

Ước chi ở mức xấu nhất hiện tại (14 user hoạt động × 20 Lượng/ngày) = 280 Lượng/ngày
≈ **232.000đ/ngày giá bán**, nhưng chi phí THẬT chỉ phát sinh khi tiêu vào tool ảnh
(trần 6/ngày đã gác) — tool chữ chỉ vài chục đến vài trăm đồng/lượt. Trần toàn hệ
thống 300 là con số CHỌN, hiệu chỉnh sau 2 tuần theo `credit_transactions`.

---

## 📏 8. MỐC ĐO — đặt trước để khỏi tự lừa mình

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
