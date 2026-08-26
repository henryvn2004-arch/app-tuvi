# 👪 VÒNG TRÒN — friend/family/group mechanics (workplan, 2026-08-25)

> Bàn từ brief của Henry: cơ chế add bạn/gia đình/đồng nghiệp, tạo nhóm, tương
> tác sau khi add, và cách motivate người ta add. Đối chiếu với Co-Star/The
> Pattern/Spotify Blend/Apple Family/MoMo — xem đoạn "học được gì" ở §5.
> Henry đã chốt 2 điểm sau khi bàn (25/08): **(1) bỏ khái niệm "đồng thuận"
> khỏi thiết kế** — lá số không phải lúc nào cũng riêng tư, không phải lúc
> nào cũng gắn với người còn sống; **(2) đẩy Gia Phả Lá Số lên làm mốc sớm**
> vì nó không cần ai tạo tài khoản.

---

## 📊 1. SỐ ĐO NỀN (prod, 25/08 — đo trước khi thiết kế)

| | |
|---|---:|
| Tài khoản | 67 |
| `user_charts` (sổ lá số theo tài khoản) | **13 dòng / 6 người** — **0 dòng có nhãn** |
| ↳ phân bố | 1 người có 6 lá số · 2 người có 2 · 3 người có 1 |
| `nguoi_khac_reports` (Lá Số Người Khác — T1) | **1 dòng / 1 người** |
| `chan-dung-vo-chong` (90N) | 36 lượt / **2 người** |
| `duyen-no-tien-kiep` (90N, nhóm 2–5 người) | 4 lượt / **1 người** |
| `cong-so` · `day-con` (90N) | 11 lượt/4 người · 9 lượt/2 người |
| `luan-giai` — tool MỘT người (90N, để so sánh) | 97 lượt / **44 người** |
| `referrals` | 1 dòng |
| `shared_results` / `share_view` | 50 / 16 |
| **`push_subscriptions`** | **3 sub / 1 người** |
| Ví ≥25 Lượng đang nằm im | 18/67 |

**Ba điều số này nói thẳng, đọc trước khi vẽ gì thêm:**

1. **Toàn bộ họ tool đa-người gần như chưa có người thật dùng.** 36 lượt vợ-chồng nhưng 2 tài khoản, 4 lượt duyên-nợ-nhóm nhưng 1 tài khoản — đó là dữ liệu test, không phải nhu cầu đã chứng minh. So với `luan-giai` (44 người dùng thật một tool MỘT người), khoảng cách rất lớn. **Chưa có bằng chứng người ta muốn xem cho người khác ở quy mô** — có thể vì họ không muốn, có thể vì chưa hỏi đúng lúc. Chưa phân biệt được, và đây chính là thứ mốc sớm (§6, G0/G1) phải đo trước khi đắp thêm tầng.
2. **Web-push chết trên thực địa (1 người dùng).** Mọi cơ chế "nhắc nhau" dựa vào push là dựng trên cát — kênh thật là Telegram/Zalo/link dán tay.
3. **Không ai thiếu Lượng** (18 ví đầy nằm im, đúng số đã ghi ở `QUEST-PLAN.md` §2.3). ⇒ **Lượng không mua được hành vi "add người khác".** Thứ mua được ở đây là mở khoá cái không mua bằng tiền được — nội dung, không phải Lượng.

---

## ✅ 2. HAI CHỖ ĐÃ CHỐT VỚI HENRY (25/08)

### 2.1 — Bỏ "đồng thuận" khỏi thiết kế
Bản nháp đầu tiên gộp ba thứ khác nhau vào một chữ "consent". Tách lại:

| | Trước | Sau khi Henry sửa |
|---|---|---|
| Tra cứu lá số người khác (nhập ngày sinh, xem) | ~~cần xin phép~~ | **Không đổi gì** — đang mở, giữ nguyên. Bắt xin phép ở đây giết chết use case tra cứu người đã mất/tổ tiên/người nổi tiếng |
| Mở 5 cung `KHONG_DOC` (Tật Ách·Tài Bạch·Phu Thê·Tử Tức·Điền Trạch) | ~~cần "đồng thuận"~~ | **Không phải chuyện consent — là lựa chọn sản phẩm**, cắt theo trạng thái của cạnh (§2.2) |
| Nội dung tài khoản (bản đã trả tiền, lịch sử hỏi Thầy) chảy giữa các tài khoản trong nhóm | ~~"đồng thuận về lá số"~~ | **Phân quyền thường** — mặc định riêng tư như inbox, không liên quan gì tới lá số. Một dòng luật, không màn hình xin phép |

Bỏ hẳn bảng `consent_scope` khỏi thiết kế. Kết quả: **thiết kế nhẹ hơn hẳn** — chỉ còn một bảng cạnh (`circle_edges`), không có luồng duyệt/thu hồi quyền đọc.

### 2.2 — `KHONG_DOC` cắt theo trạng thái CẠNH, không theo "đồng thuận"
`KHONG_DOC = ['Tật Ách', 'Tài Bạch', 'Phu Thê', 'Tử Tức', 'Điền Trạch']` — dùng chung bởi 4 engine (`nguoi-khac.ts` · `day-con.ts` · `huong-nghiep-tre.ts` · `nhan-mach.ts`) + có test đối chiếu ở `day-con-assess.ts`. Lý do gốc trong code gộp hai thứ:
1. *"người vắng mặt không có mặt để đồng ý"* — lý do này không còn đứng vững theo lập luận của Henry.
2. **Lý do còn sống, không dính privacy:** một bản đọc "Tật Ách của sếp mày" (a) dễ biến app thành công cụ soi mói — định hình app là gì trong mắt người kể lại, (b) dễ sai theo kiểu tốn kém nhất: phán bệnh tật/hôn nhân của người mà mình chỉ có ngày sinh, không gì để đối chiếu.

Với **người đã mất**, lý do 2 cũng yếu — không ai bị tổn thương vì bản luận về cụ cố, và đó lại là chỗ hay nhất của một cuốn gia phả (biết cụ ông mất vì bệnh gì theo lá số, cụ bà tài lộc ra sao — đúng thứ hậu duệ tò mò).

**Luật mới — cắt theo trạng thái cạnh, KHÔNG thêm màn hình xin phép nào:**

| Cạnh trỏ tới | Đọc gì |
|---|---|
| Người **đã mất** (cờ `da_mat=true` trên `user_charts`/hồ sơ) | **Đọc hết**, kể cả Tật Ách/Điền Trạch |
| Người sống, **chưa có tài khoản trong Vòng Tròn** | Giữ nguyên `KHONG_DOC` như hiện tại |
| Người sống, **đã có tài khoản và đã vào cùng Vòng Tròn** | **Đọc hết** — họ tự chọn vào, không cần xin phép riêng cho từng cung |

Đây vẫn là **ràng buộc dữ liệu** (`KHONG_DOC` lọc payload trước khi tới prompt), giữ đúng nguyên tắc "không phải lời dặn prompt" đã ghi trong code — chỉ đổi điều kiện lọc từ hằng số sang tra `da_mat`/trạng thái cạnh.

⚠️ Việc còn treo, cần Henry xác nhận khi vào PR thật: có giữ `KHONG_DOC` cho "người sống, chưa có tài khoản" như bảng trên, hay bỏ hẳn `KHONG_DOC` luôn (đọc hết mọi trường hợp)? Bảng trên là phương án **giữ một phần** — an toàn hơn, sửa ít hơn (không đụng 4 engine + test), và vẫn mở toang đúng chỗ Henry quan tâm (người đã mất). Đề xuất chốt trước khi code G2.

---

## 🧭 3. KIẾN TRÚC — "VÒNG TRÒN", không phải friend list phẳng

Không dựng danh sách bạn phẳng. Dùng lại taxonomy 8 vai đã có sẵn trong `QUAN_HE` (`lib/engine/nguoi-khac.ts`): `sep · dong-nghiep · cap-duoi · doi-tac · cha-me · con-cai · ban-doi · ban-be`, mỗi vai map sẵn sang một cung + một nhu cầu khác nhau.

```
Vòng Nhà     ← ban-doi · cha-me · con-cai      → gia đạo, dạy con, vận nhà, GIA PHẢ
Vòng Bạn     ← ban-be                          → hợp/khắc, duyên nợ, khoe
Vòng Việc    ← sep · dong-nghiep · cap-duoi · doi-tac → Công Sở, Sổ Nhân Mạch (T3)
```

**Ba luật cứng:**
1. **Vai quyết định LĂNG KÍNH đọc, không quyết định QUYỀN.** Quyền chỉ đến từ trạng thái cạnh (đã mất / sống-chưa-acc / sống-đã-vào-vòng), không có chuyện "chủ nhà đọc hết vì là chủ nhà".
2. **Quan hệ là CẠNH CÓ HƯỚNG, không phải thẻ thành viên.** A gọi B là "sếp" thì B gọi A là "cấp dưới" — mỗi chiều đọc một cung khác nhau, đúng cách `QUAN_HE` đang hoạt động. Nhóm là tập cạnh, không phải cái hộp.
3. **Một người chỉ thuộc MỘT Vòng Nhà tại một thời điểm**, đổi tối đa 1 lần/180 ngày — chốt chống farm ví chung (§7), không phải luật hành chính.

Bảng dữ liệu tối giản (sau khi bỏ consent):
- `circles(id, kind: 'nha'|'ban'|'viec', name, owner_user_id, created_at)`
- `circle_edges(circle_id, subject_ref, role, added_by_user_id, created_at)` — `subject_ref` trỏ tới **hoặc** `user_charts.id` (lá số chưa có tài khoản / người đã mất) **hoặc** `auth.users.id` (đã có tài khoản). Một cạnh, hai loại subject — không bảng consent nào cả.

---

## 🃏 4. ADD XONG THÌ CÓ GÌ — xếp theo chi phí dựng

| # | Tương tác | Nối vào đâu | Chi phí | Trạng thái |
|---|---|---|---|---|
| **A0** | ⭐ **Gia Phả Lá Số** — 3–4 đời trong một Vòng Nhà, đọc HẾT kể cả người đã mất | `duyen-no-tien-kiep` (đã hỗ trợ nhóm 2–5) + `past-life-bond.ts` (thuần deterministic) | thấp | **đẩy lên trước G3**, xem §6 |
| **A1** | Đọc hai chiều theo trạng thái cạnh (§2.2) | `nguoi-khac.ts` + `KHONG_DOC` theo cạnh | 1 cột + tra cạnh | trục chính |
| **A2** | **Trang Nhà Mình** — 1 URL cố định, cả nhóm cùng mở, tự cập nhật mỗi ngày | `van-ngay.ts` (tất định, 0đ) | thấp | học từ Spotify Blend, §5 |
| **A3** | **Lì xì Lượng** — chuyển Lượng cho thành viên | `add_credits`/`deduct_credits` + RPC mới | thấp | người VN đã quen (MoMo) |
| **A4** | Nhắc nhau ngày quan trọng (sinh nhật, tiểu hạn căng) | `van-ngay` + Telegram adapter | trung | ⚠️ KHÔNG qua web-push (1 user) |
| **A5** | Sổ Nhân Mạch cho Vòng Việc (nhóm 3–8 người) | `lib/engine/nhan-mach.ts` **đã viết xong** | thấp | thiếu đúng danh sách người |
| **A6** | Hỏi Thầy về một mối quan hệ cụ thể trong vòng | rail `buildChatContext` | trung | rail đã mang được context tool |
| **A7** | "Nói hộ tôi" — chia sẻ một phần bản luận, có chú thích tay | `shared_results` (đã có) | thấp | chia sẻ có chủ đích ≠ nút Share chung chung |
| **A8** | Quiz đôi — đoán tính cách người kia rồi lật đáp án | engine, tất định | trung | 🔶 Bậc 2, hoãn tới D1≥20% |

### Vẫn bỏ khỏi brainstorm
- ❌ **Bảng xếp hạng trong nhóm** — `nhan-mach.ts` đã ghi: *"một bảng xếp hạng đồng nghiệp là thứ tệ nhất tool này có thể sinh ra"*; trong gia đình còn tệ hơn.
- ❌ **Feed hoạt động nhóm** — hoặc giám sát, hoặc rỗng. Chỉ giữ nhật ký truy cập ngược (bạn thấy ai đã đọc bạn).
- ❌ **Gacha/streak nhóm** — đã hoãn ở `QUEST-PLAN.md`, nhóm không cứu được lý do hoãn đó.

---

## 🔭 5. HỌC ĐƯỢC GÌ TỪ APP KHÁC

| App | Cơ chế | Học được gì | Hợp không |
|---|---|---|---|
| **Co-Star** | Add friend → so biểu đồ, đây là lõi giữ chân, không phải nội dung hằng ngày | Đúng hướng — đã làm CTA (`QUEST-PLAN.md` §3.5.2) | ✅ |
| **The Pattern** | "Bonds" có TÊN riêng ("Chemistry"), người ta chụp màn hình chính cái tên | **Đặt tên cho mối quan hệ, đừng chấm điểm nó** — "Nhà mình là Kim–Thuỷ tương sinh" khoe được; "hợp 72%" vừa khoe dở vừa sai khoa học | ✅ rất hợp cổ pháp |
| **Spotify Blend** | 1 playlist chung, URL cố định, tự cập nhật — không phải 2 kết quả riêng | ⭐ Bài học đắt nhất: tạo **vật phẩm thuộc về cả nhóm**, đổi mỗi ngày ⇒ lý do quay lại KHÔNG cần streak | ✅ → A2 |
| **Duolingo Friend Quest** | Nhiệm vụ đôi — cả 2 phải xong mới có thưởng | Mạnh nhưng cần cả 2 quay lại — D1≈0 hiện tại | 🔶 hoãn |
| **Apple Family Ask-to-Buy** | Con tiêu tiền → bố duyệt trên máy bố | Giải đúng nỗi lo ví chung bị đốt, không cần trần cứng | ✅ → §7 |
| **Notion/Figma seats** | Càng nhiều người càng đắt — giá trị tăng theo người | Family plan không nhất thiết là giảm giá; nhiều người đọc được nhau là sản phẩm KHÁC, không phải rẻ hơn | ✅ → §7 |
| **MoMo lì xì/heo đất** | Chuyển tiền nhỏ mang nghĩa tình cảm | Người Việt không cần dạy — lì xì Lượng dịp Tết/sinh nhật là món rẻ nhất | ✅ → A3 |
| **Zalo (thực địa VN)** | Gia đình Việt đã có sẵn nhóm Zalo | ⭐ Đừng bắt dựng nhóm thứ hai. Cần thứ **dán vào nhóm Zalo đang có** — poster 9:16 + caption đã có (`poster.js`), thiếu bản dành riêng cho nhóm | ✅ rẻ nhất |
| Instagram/FB Story | — | Không API nào xác minh được lượt xem Story — toàn ngành dừng ở tự-nộp-bằng-chứng, đã kết luận & làm ở `QUEST-PLAN.md` §3.5 | giữ nguyên |

---

## 💰 6. LỘ TRÌNH — Gia Phả đẩy lên trước, cổng đo ở giữa

| | Việc | Migration | Cổng mở |
|---|---|---|---|
| **G0** | **Lời mời mang nội dung** — link mời chứa 1 câu tất định về CHÍNH người được mời (VD: *"Chồng bạn vừa xem thử: bạn mệnh Kim, năm nay cung Thiên Di động →"*), 0đ, tất định. Đặt ngay dưới kết quả 4 tool đa-người | không | làm ngay |
| **G1** | **Thiệp Nhà Mình dán Zalo** — poster 9:16 + caption bản-cho-nhóm, tái dùng `poster.js` | không | làm ngay |
| **G0.5 → A0** | ⭐ **Gia Phả Lá Số** (đẩy lên theo yêu cầu Henry) — 3–4 đời trong 1 Vòng Nhà, dùng `duyen-no-tien-kiep` (đã hỗ trợ 2–5 lá số) + `past-life-bond.ts` (deterministic), thêm cờ `da_mat` để đọc hết mọi cung. **Không cần ai tạo tài khoản** — chạy được ngay với 67 user hiện tại, không bị chặn bởi cổng nào | nhẹ: thêm cột `da_mat` vào `user_charts` + nhãn quan hệ (ông/bà/cha/mẹ) | **làm cùng đợt G0/G1**, không chờ |
| **G2** | **Vòng Tròn** — `circles` + `circle_edges`, mở đọc 2 chiều theo trạng thái cạnh (§2.2), không còn bảng consent | `circles` · `circle_edges` | **≥10 người dùng thật chạy tool đa-người sau G0/G1/A0** |
| **G3** | **Trang Nhà Mình** (A2) | nhẹ | sau G2 |
| **G4** | **Ví nhà** — hạn mức/tháng + `spender_user_id` + xin-duyệt kiểu Apple | `circle_wallet_limits` | **≥5 Vòng Nhà có ≥2 người hoạt động** |
| **G5** | Lì xì Lượng · Sổ Nhân Mạch Vòng Việc · nhắc nhau qua Telegram | | sau G4 |
| **G6** | Quiz đôi · nhiệm vụ đôi kiểu Duolingo | | D1 ≥20% (cùng cổng Q6 của `QUEST-PLAN.md`) |

**Vì sao A0 đẩy lên chứ không nhét vào G2:** nó không đòi hỏi ai vượt qua cổng "tạo tài khoản" — dữ liệu người đã mất nằm gọn trong `user_charts` như mọi lá số nhập hộ khác. Nó cũng **sinh ra chính nội dung khoe được** mà không lộ gì về người sống (một tấm gia phả 3 đời không phải dữ liệu nhạy cảm của ai đang sống), giải đúng bài toán "lý do khoe" mà `QUEST-PLAN.md` §3.5(b) đang thiếu.

**Cổng G2 vẫn là quan trọng nhất.** G0+G1+A0 rẻ, không migration nặng, và chúng tạo ra chính con số cần để quyết G2. Nếu sau đó vẫn chỉ 1–2 người dùng tool đa-người → nút thắt không nằm ở "thiếu cơ chế add", nó nằm ở lưu lượng (đúng tiêu chí DỪNG đã đặt ở `QUEST-PLAN.md` §8) — dồn sức về kênh phân phối, không đắp thêm tầng Vòng Tròn.

---

## 🎁 7. VÍ NHÀ + MOTIVATE — luật: thưởng cho SỰ CÓ MẶT, không thưởng cú bấm

Ba mô hình ví chung, chọn **b mặc định + c tuỳ chọn cho vai `con-cai`**:

| | Cơ chế | Rủi ro |
|---|---|---|
| a | Ví chung hoàn toàn | 1 thành viên đốt sạch vào Vận Hạn (~24.000đ/lượt) trong một buổi tối |
| **b** | **Hạn mức/thành viên/tháng** do chủ nhà đặt | cần 1 cột + 1 chốt trong `credits.ts` |
| **c** | **Xin duyệt** (Apple Ask-to-Buy) cho lượt > ngưỡng | cần kênh Telegram, không phải web-push |

Luật cứng khi dựng, nối vào luật tiền đã có trong CLAUDE.md:
- Trừ tiền vẫn qua `deduct_credits` của ví CHỦ NHÀ, nhưng `credit_transactions` ghi thêm `spender_user_id` — sổ phải giải thích được ai tiêu.
- **Chốt hạn mức đặt TRƯỚC bước gọi model**, cùng chỗ với `toolPaymentDenied`.
- Vượt hạn mức → rơi về ví riêng của chính người đó, không chặn cứng.
- Thành viên tiêu bằng ví nhà thì **quyền xem lại (`portrait_cache`/`userOwnsLaso`) thuộc về CHÍNH NGƯỜI TIÊU** — rời nhà không mất bản đã trả tiền.

**Motivate — dùng nguyên hạ tầng `referrals`, không dựng hệ thưởng thứ hai:**

| Mốc | Thưởng | Bằng chứng |
|---|---|---|
| Gửi lời mời | 0 (không verify được, farm 10 giây) | — |
| Người được mời tạo tài khoản | 15 mỗi bên, chín sau 24h | đã có: `process_referral_signup` |
| Người được mời lập lá số + chạy 1 tool | mở khoá đọc 2 chiều + Trang Nhà Mình | tái dùng bằng chứng Khởi Hành, fail-closed |
| Đủ 3 thành viên hoạt động | +50 | mốc đã thiết kế ở Q4 (`QUEST-PLAN.md`) |

Nguyên tắc: (1) lời mời vào Vòng Tròn **là** một dòng `referrals` có thêm `circle_id`+`role`, không phải hệ thưởng song song; (2) phần thưởng chính không phải Lượng — 18 ví đầy nằm im đã chứng minh Lượng không mua được hành vi này; (3) người **được mời** nhận bằng hoặc hơn người mời — họ mới là người bỏ công tạo tài khoản.

---

## 🪤 8. RỦI RO PHẢI CHỐT TRƯỚC KHI CODE

1. **`user_charts` chứa ngày sinh người thứ ba** (migration đã tự ghi cảnh báo, cố ý không có policy admin). Vòng Tròn làm dữ liệu này chảy giữa tài khoản → RLS phải viết theo CẠNH, không theo `circle_id` — một policy lỏng theo `circle_id` là cả nhà đọc được nhau bất kể trạng thái cạnh.
2. **Đường farm mới:** N acc ma vào 1 nhóm → nhận thưởng → rút. Chốt: bằng chứng hoạt động thật (Khởi Hành) + độ trễ 24h + `device_id` cap 5 (đã có) + 1 người/1 Vòng Nhà/180 ngày.
3. **Rời nhóm phải sạch:** rời → cạnh xoá ngay, bản đã tính không xoá nhưng không cập nhật nữa.
4. **Trẻ em (vai `con-cai`) dưới 16 tuổi:** không cấp tài khoản/màn hình riêng cho trẻ đọc bản phân tích về chính nó — cha mẹ dùng màn hình và ví của cha mẹ. Ràng buộc dữ liệu, không phải lời dặn prompt.
5. **Ly hôn/nghỉ việc:** Vòng Nhà/Vòng Việc phải có đường rời không cần đối phương duyệt, và **không** báo cho người kia là mình đã rời.
6. **`da_mat=true` là tự khai của người nhập** — không có gì xác minh. Chấp nhận được vì hệ quả chỉ là "đọc thêm vài cung của một lá số nhập hộ", không phải rủi ro tài chính hay pháp lý.

---

## 📏 9. MỐC ĐO (nối vào bảng đã có ở `QUEST-PLAN.md` §8)

Baseline 25/08: **6 người có `user_charts` · 2 người dùng `chan-dung-vo-chong` thật · 1 người dùng `duyen-no-tien-kiep` · 1 referral.**

Sau **3 tuần** kể từ khi G0/G1/A0 lên prod:
| Chỉ số | Baseline | Đạt | Hỏng |
|---|---:|---|---|
| Người dùng thật chạy ≥1 tool đa-người/tháng | ~4 | ≥10 | ≤5 ⇒ nút thắt là lưu lượng, hoãn G2 |
| Gia Phả Lá Số đã tạo | 0 | ≥5 | ≤1 ⇒ khoan đầu tư thêm cho nhánh này |
| `referrals` mới | 1 | ≥8 | ≤3 ⇒ vấn đề ở lý do mời, không phải cơ chế |

**Tiêu chí DỪNG:** cùng logic `QUEST-PLAN.md` §8 — 3 chỉ số trên đứng yên sau 3 tuần ⇒ đừng dựng G2 (Vòng Tròn đầy đủ); giữ A0/G0/G1 (đã rẻ, đã có ích riêng) và dồn sức về kênh phân phối.
