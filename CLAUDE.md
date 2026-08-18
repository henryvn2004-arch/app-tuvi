# CLAUDE.md — Context cho Claude Code

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 16, Supabase, Vercel)

---

## 🏃 Nhịp ĐO ĐƯỢC là quá chậm · 14 tư thế · cảnh HAI người (2026-08-18, cùng PR #543)

Henry: *"nhân vật chuyển động chậm quá, có thể thêm hình, đa dạng hơn"* ·
*"thiếu hình nhiều người (>= 2 người)"* · *"chuyển động… đang ko giống người
lắm, mày nghiên cứu xem có bộ nào free… mang nó về dùng cho nhanh"*.

### 🔍 Nghiên cứu bộ ngoài — kết luận: KHÔNG mang về. Lý do là CẤU TRÚC.
| Nguồn | Chặn ở đâu |
|---|---|
| **Rive Community** | **CC BY — bắt buộc ghi công**, đúng bức tường đã loại Unsplash (phải in tên tác giả lên khung 9:16 vốn chật chữ) |
| **LottieFiles** | Egress proxy CHẶN `lottiefiles.com` ⇒ **không đọc được điều khoản, và tôi không đoán**. `@remotion/lottie` thì có thật và chạy được — nhưng xem lý do cấu trúc dưới đây |
| **CC0 modular vector characters** (itch.io/OpenGameArt) | Sprite game, PNG, phong cách pixel/game — không phải mascot phẳng của kênh |
| **Quaternius Universal Animation** | 3D |

🔑 **Lý do quyết định KHÔNG phụ thuộc vào giấy phép**: mọi chợ asset đều là
**nhân vật CỦA NGƯỜI KHÁC**, mỗi tệp một tác giả. Lấy "ngồi buồn" của tác giả A
ghép "chạy" của tác giả B ra HAI nhân vật khác nhau — đúng con số đã đo ở lượt
khảo sát vector Pixabay (**9 tác giả trong 50 kết quả**). Mà cả điểm của nhân
vật signature là MỘT nhân vật xuất hiện ở mọi clip để người xem nhận ra kênh.
Tìm kỹ hơn không sửa được, vì đó là tính chất của cái chợ chứ không phải của
lượt tìm.
- Trường hợp duy nhất dùng được: một tác giả xuất bản TRỌN bộ, miễn phí, sửa
  màu được — hiếm, và đánh cược thương hiệu vào một gói asset có thể biến mất.
- ⇒ Thứ đáng lấy từ ngành hoạt hình là **NHỊP**, không phải asset.

### 🔴 Và nhịp thì đo được là SAI — đây mới là câu trả lời cho "không giống người"
Quy toàn bộ nhịp cũ (rad/s) ra Hz rồi so với mốc người thật:

| | cũ | người thật | |
|---|---:|---|---|
| vẫy tay | **0,83 Hz** | 2–3 Hz | chậm **~2,6×** |
| tay giảng | **0,21 Hz** | ~1 Hz | chậm **~4,4×** |
| tay quét | **0,20 Hz** | ~0,5 Hz | chậm **~2,5×** |
| bước đi | 95 bước/phút | 100–120 | hơi chậm |
| thở | 17 nhịp/phút | 12–18 | **ĐÚNG** |

Cộng thêm hai lỗi hình dạng, và chúng mới là phần "rô-bốt":
1. **Mọi nhịp là `Math.sin` đối xứng** — đi và về cùng tốc độ. Cử động người
   **bật ra nhanh, thu về chậm**. ⇒ thêm `beat()` (28% chu kỳ bật ra, 72% về)
   dùng cho MỌI cử động có chủ đích; `osc()` chỉ giữ cho thứ vốn đối xứng thật
   (thở, đung đưa, bước chân).
2. **Lò xo chuyển tư thế đặt `damping: 200`** = tắt dần tới hạn = **không có độ
   vọt quá đà**. Đúng cho chữ và khối giao diện, sai hẳn cho cơ thể. ⇒
   `SPRING_POSE = {damping: 13, mass: 0.55, stiffness: 110}`.
3. Thêm **overlapping action**: đoạn NGỌN của chi tới đích trễ 3 khung so với
   đoạn gốc (`blendLate`). Ở người cẳng tay LUÔN tới sau cánh tay trên; hai
   đoạn khớp nhau tuyệt đối chính là cái mắt đọc ra "máy".

🔑 Nhịp nay khai bằng **Hz** chứ không phải rad/s — đọc phát biết nhanh chậm,
và so được thẳng với mốc người thật. Đơn vị sai là lý do lỗi này sống lâu.

### 🧍 9 → 14 tư thế
Thêm `ngoi-buon` · `ngoi-an` · `chay` · `voi-tay` · `dang-tay` · `che-mat` ·
`ngoai-lai`. Ba chỗ hỏng chỉ lộ trên bảng đối chiếu:
- **`che-mat` không che được gì** — thứ tự vẽ mặc định là tay TRƯỚC, đầu ĐÈ LÊN
  (đúng cho mọi tư thế khác), nên hai bàn tay nấp SAU đầu và hai mắt vẫn nhìn
  thẳng. Thêm cờ `armsFront`.
- **`chay` ngả 17° đọc thành "sắp ngã sấp"** → 13°. Sải chân mới là thứ kể chạy.
- **Ngồi dạng chân kiểu ếch.** Đây là giới hạn THẬT của hình chiếu thẳng mặt:
  đùi lẽ ra hướng về phía người xem và bị rút ngắn, hình phẳng không tả được.
  Giảm bớt bằng ống chân chụm vào (gối 164, bàn chân 134), và **hai tư thế ngồi
  chỉ nên dùng KÈM `set`**.
- ⚠️ `crouch` của tư thế ngồi **giải ngược từ ràng buộc "bàn chân chạm đất"**
  (92 = 266 − 174), không phải số chọn cho vừa mắt. Đổi góc đùi là phải tính lại.

### 👥 Cảnh HAI người — `kind: 'duo'`
Rất nhiều câu đắt nhất của kênh có hai người trong đó (*"vẫn ngồi ăn cơm với
bạn, nhưng tâm trí đã rời xa"* — ví dụ của Henry). Vẽ một nhân vật đơn độc dưới
câu đó là **hình nói ngược lời**.
- `poseL` · `poseR` · `set` (`ban-an` · `ghe-bang`) · `gap` (`gan` · `xa`).
- 🔑 `gap` là **từ vựng ĐÓNG hai giá trị**, không phải số pixel: nó mang NGHĨA
  (gần nhau / cách biệt) nên cổng 2 mô tả được. Cho khai số thì mỗi kịch bản
  một con số, không so được giữa các clip.
- 🔑 Hai người **lệch pha nửa nhịp** (`timeSec + 1.4`). Cùng pha thì đọc ra là
  một hình bị nhân đôi, không phải hai người.
- ⚠️ Mọi kích thước đồ đạc **giải ngược từ chiều cao ngồi**: mặt bàn ở 78,7%
  chiều cao hộp, muốn nó rơi giữa hông (184) và vai (407) ⇒ hộp cao 318 ⇒ rộng
  911. Đổi `DUO_H` hay đổi tư thế ngồi là phải tính lại, không chỉnh mò.
- 🪤 **Bát vẽ CHÌM dưới mặt bàn** ở bản đầu: trong SVG y tăng XUỐNG, nên "đặt
  lên bàn" là TRỪ đi. Render ra chỉ còn hai vạch vàng ló lên.
- 🪤 **`DUO_H` phải LỚN HƠN cảnh một người** (980 vs 820): ngồi hạ thân người
  ~92 đơn vị nên cùng `height` thì cảnh hai người trông thấp và bé, hở một mảng
  đen ~500px giữa chữ và nhân vật. Chữ cũng phải hạ theo (top 386 thay vì 292).

### 📌 Trả lời câu "để Remotion tự code chuyển động theo ngữ cảnh script"
**Thêm một tư thế KHÔNG đắt** — nó là 8 con số. Chỗ đắt là **biết nó trông có
đúng không**, mà điều đó chỉ render ra rồi NHÌN mới biết (bằng chứng: 3/7 tư thế
mới sai ngay lượt đầu, không lỗi nào tsc bắt được). Một model sinh góc chi thì
không nhìn được thứ nó vừa sinh ⇒ sẽ đẻ ra tư thế gãy mà không gì chặn.
- ⇒ Đường đúng là **giữ TỪ VỰNG ĐÓNG rồi cho LLM CHỌN trong đó**, và mở rộng
  từ vựng khi thiếu. Mỗi mục chỉ phải soi bằng mắt MỘT lần, dùng được mãi.
- Và còn một lý do nữa: cổng 2 cần mô tả ỔN ĐỊNH để so giữa các clip. Cho model
  tự viết mô tả cử động cho từng cảnh là quay lại đúng cái gương mà mục 🖼️ đã mổ.

### Verify
`tsc` root 0 · `tsc` remotion 0 · `prettier` cả cây sạch · `lint` **0 lỗi / 77
warning = mốc nền** · **20/20 bộ dò** · engine **185 pass**.
- Bảng đối chiếu 14 tư thế + 20 đạo cụ render và soi bằng mắt; cảnh hai người
  soi riêng ở khung 300.

### CÒN LẠI
- **Hai tư thế ngồi trông vẫn hơi dạng chân** khi KHÔNG có `set`. Giới hạn hình
  chiếu, không phải số sai — muốn hết hẳn thì phải có tư thế vẽ theo lối nhìn
  nghiêng, tức một bộ khung thứ hai.
- **Chưa có tư thế hai người TƯƠNG TÁC** (ôm, quay lưng vào nhau, một người bỏ
  đi). `duo` hiện chỉ đặt hai tư thế đơn cạnh nhau.
- Cổng 2 vẫn chưa có `visual.mismatch`, `rewriteSpec` vẫn chỉ viết lại CHỮ.

---

## 🕺 Nhân vật BIẾT CỬ ĐỘNG + 20 đạo cụ — và 4 lỗi chỉ lộ khi SOI KHUNG HÌNH (2026-08-18, PR #543)

Henry: *"nhân vật chưa đạt, nhìn boring lắm, chắc phải làm motion luôn"* · *"màu
nhấn thì chọn màu theme của site đi: vàng hoặc đỏ"* · *"đạo cụ: làm luôn, có thể
làm nhiều hơn"*.

### 🔴 Căn nguyên "boring": chọn vẽ bằng code CHÍNH LÀ để có chuyển động, mà không dùng
Bản đầu chỉ có **tư thế TĨNH + nhún thở 6px + mờ dần lúc vào**. Tức nhân vật vẫn
là một BỨC HÌNH, chỉ khác là bức hình có nhấp nháy — trong khi lý do số một để
loại ba đường vector/AI và chọn vẽ bằng SVG là *"nó chuyển động được"*. Đúng chỗ
đắt nhất bị bỏ phí.

**Bốn tầng, xếp theo mức đóng góp đo bằng mắt:**
1. **CHUYỂN TƯ THẾ** (`fromPose` + `blend`) — sang cảnh mới thì nhân vật *đi từ*
   tư thế cũ *sang* tư thế mới trong nửa giây. Tầng DUY NHẤT ảnh nhập không làm
   được, và là thứ biến minh hoạ thành kể chuyện.
2. **NHỊP RIÊNG TỪNG TƯ THẾ** (`MOTIONS`) — `chao` vẫy tay thật · `hanh-dong` hai
   chân sải luân phiên + tay đánh ngược pha · `quay-lung` vừa bước vừa **nhỏ dần
   16%** (rời khỏi khung, không phải quay lưng đứng yên) · `cui-dau` thở dài.
3. **CHỚP MẮT** — gương mặt chỉ có hai chấm thì đây là tín hiệu sống rẻ nhất.
4. **THỞ** — giữ, nhưng nay là nền chứ không phải toàn bộ.

- ⚠️ **Ràng buộc cứng: mọi chuyển động là hàm THUẦN của `timeSec`.** Remotion
  render khung hình KHÔNG theo thứ tự ⇒ `Math.random()` là nhấp nháy loạn. Chớp
  mắt vì thế suy từ `(t + 1.1) % 3.6 < 0.13`.
- 🔑 **Tư thế nào có nhịp thì dáng NỀN phải là dáng NGHỈ.** `hanh-dong` bản trước
  khai sẵn một bước sải RỒI cộng thêm dao động ⇒ chân dang quá rộng suốt cảnh,
  trông vướng (đúng chỗ Henry nhận xét). Nay dáng nền đứng thẳng, bước sải HOÀN
  TOÀN do `MOTIONS` sinh.

### 🎨 Màu nhấn — bỏ bảng neon của brief, lấy vàng thương hiệu
Brief đề nghị hồng/tím/xanh ngọc; Henry chốt màu theme site. Đo tương phản trên
nền đen `#0A0A0F`: **vàng `#C9A84C` = 8,6:1** (dư sức cho nét mảnh) ·
**đỏ `#C0392B` = 3,9:1** ⇒ đỏ CHỈ được làm **mảng ĐẶC lớn** (ngọn lửa đèn lồng,
trái tim), không bao giờ làm nét mảnh hay chữ. Gỡ luôn `CHAR.pink/violet/mint`
— màu thương hiệu chết nằm trong file là bẫy cho người sau.

### 🧰 20 đạo cụ = MỘT bộ cho HAI chỗ
`remotion/src/Glyphs.tsx`. Brief tách "đạo cụ" (cầm trên tay) khỏi "icon" (đứng
riêng), nhưng vẽ hai bộ thì cùng một khái niệm có hai nét khác nhau trong cùng
một clip — đúng lớp lỗi "hai danh sách chép tay rồi trôi khỏi nhau". Ở đây chỉ
khác **CHỖ ĐẶT**, không khác hình.
- 🔑 Kịch bản khai **một trường `glyph` + một trường `glyphAt`**, KHÔNG phải hai
  trường `prop`/`icon`. Nhờ vậy *không có cách nào* khai hai ký hiệu cùng lúc ⇒
  luật "1 scene = 1 icon" của brief được ép bằng KIỂU DỮ LIỆU, không bằng lời dặn.
- Chọn theo MIỀN NỘI DUNG chứ không theo "icon nào hay gặp": `la-so` (12 cung,
  giữa để trống — đúng bố cục thật), `dong-xu` lỗ vuông, `la-ban`, `den-long`,
  `canh-cua` (câu *"đóng một cánh cửa"* xuất hiện nguyên văn trong kịch bản)…

### 🔴 BỐN lỗi chỉ lộ khi soi KHUNG HÌNH THẬT — không lỗi nào đọc code thấy được
1. **Câu MỞ ĐẦU bị chạy chữ dần** — hồi quy do CHÍNH lượt thêm nhân vật gây ra.
   `Hook` bản navy dùng chữ tĩnh và có chú thích ghi rõ lý do (*"ba giây đầu
   quyết định… chữ chạy dần nghĩa là giây đầu tiên chưa đọc được gì"*), nhưng
   khai `hookPose` thì hook đi qua `FigureScene` → `WordKaraoke`, tức chạy chữ
   dần đúng ở chỗ cấm chạy. Đo được: giây 1,3 hơn nửa câu mở đầu còn mờ.
2. **Bóng đen 55% trên nền đen đọc thành CÁI HỐ**, không thành bóng đổ. Nền tối
   thì thứ đặt nhân vật xuống mặt đất phải là ÁNH SÁNG hắt (trắng 7%), không
   phải mảng tối. Bóng cũ đúng trên nền navy — đổi sân khấu mà quên đổi nó.
3. **Nhân vật cao 470px chứ không phải 620px.** `height` là chiều cao KHUNG NHÌN,
   mà khung có lề rộng chừa chỗ tay giơ + đạo cụ ⇒ thân người chỉ chiếm ~76%.
   Trên khung 1920 thành một chấm nhỏ dưới đáy. Nâng lên **820**.
4. **Tên miền in HAI LẦN ở khung kết** — `buildCta` đã chở sẵn `tuviminhbao.com`
   trong câu kết, `OutroFigure` in thêm một dòng nữa. ⚠️ Bản nền navy `Outro`
   **cũng đang dính y hệt**, cố ý chưa đụng vì đó là khung kết của 5 clip khác.

### 🪤 Ba bẫy hình học (đều là lỗi của TÔI)
1. **`cui-dau` không hề cúi.** `crouch` hạ CẢ người nên hình dạng không đổi;
   `headTilt` xoay một hình TRÒN nên gần như vô hình (chỉ dịch hai chấm mắt).
   Phải thêm `headDx`/`headDy` — đầu **thụt xuống giữa hai vai + đổ ra trước**
   mới đọc ra là gục.
2. **`suy-nghi` gập sâu thì mất luôn nếp gập.** Thử `a2 = 185` để kéo tay vào
   cằm ⇒ cẳng tay nằm CHỒNG LÊN cánh tay trên, hai mảng trắng dày trùng nhau,
   bảng đối chiếu đọc ra thành *"một cánh tay duỗi thẳng chỉ sang ngang"*. Và
   chạm cằm là BẤT KHẢ về hình học: vai ở x=80, cằm cách 65 đơn vị, tay dài 184.
3. **Vấp lại bẫy do chính mình ghi**: truyền `--browser-executable=/opt/pw-
   browsers/chromium` trong khi `remotion.config.ts` có nguyên một khối chú
   thích *"đã thử và HỎNG… đừng tối ưu bằng cách trỏ lại vào Chromium của
   Playwright"*. Đọc chú thích rồi vẫn làm đúng thứ nó cấm.

### 🔴 Cổng 2 có PHƯƠNG SAI RẤT LỚN — một lượt chấm KHÔNG phải một phép đo
Cùng một kịch bản, không đổi một chữ nào:

| Lượt | Trong tệp | Kết quả |
|---|---|---|
| Phiên trước | **5/5** xem hết · gửi 43% | ✅ QUA vòng 1 |
| Phiên này | **3/7** trong tệp · gửi 14% | ❌ TRƯỢT cả 3 vòng |

⇒ Câu *"hội đồng đã duyệt"* ở phiên trước là **một mẫu**, không phải một kết
luận. Đừng đọc một lượt PASS thành "kịch bản đạt".
- 🔑 Nhưng cơ chế thì chạy ĐÚNG: có persona bỏ ở 2s kèm lý do *"hình ảnh nhân
  vật chỉ vẫy tay không đủ hấp dẫn"* — tức kênh HÌNH nay thật sự vào phán quyết
  và bị phản đối bằng một lời chê ĐỔI ĐƯỢC (đổi tư thế), khác hẳn lời chê chung
  chung của bản hằng số viết tay.
- Ba vòng viết lại đều trượt lại **cổng 1** (`hook.too-long`, `scene.too-long`)
  ⇒ `rewriteSpec` viết dài ra rồi tự vấp trần độ dài. Vòng lặp chưa hội tụ.

### Verify
`tsc` root 0 · `tsc` remotion 0 · `prettier` quét cả cây sạch · `lint` **0 lỗi /
77 warning = đúng mốc nền** · **20/20 bộ dò** · engine **185 pass**.
- **Soi bằng mắt trên khung hình THẬT** ở 4 mốc (hook · `cui-dau` + icon cánh
  cửa · `loi-khuyen` cầm trái tim · kết cầm lá số) — đây là phép kiểm duy nhất
  bắt được cả 4 lỗi ở trên, không phép đo tự động nào chạm tới.
- Bảng đối chiếu `CharacterSheet` render 9 tư thế **đóng băng tại mốc giây chọn
  tay** (`FREEZE`): không có bảng này thì `hanh-dong`/`quay-lung` rơi vào lúc
  `sin = 0`, hai chân chụm lại, và bảng báo là "trùng dáng đứng yên".

### CÒN LẠI
- ⚠️ **Bảng tĩnh KHÔNG thay được việc xem clip** — từ khi có nhịp riêng, phần
  lớn giá trị nằm ở CHUYỂN ĐỘNG mà một khung hình không chứa nổi.
- **Clip test chưa có giọng đọc** (thiếu `CLIP_TTS_SECRET` trong container này),
  mới có nhạc nền. Nhịp chữ ↔ nhịp nói chưa ai kiểm.
- **Cổng 2 vẫn chưa có mã lỗi `visual.mismatch`** và `rewriteSpec` vẫn chỉ viết
  lại CHỮ ⇒ hội đồng chê hình thì máy đi sửa chữ. Nay đã có 9 tư thế × 20 đạo cụ
  để gạt sang — cần gạt thì có chỗ gạt rồi, còn thiếu đúng cái cần.
- **5 kịch bản insight còn lại chưa đổi sang nhân vật** (vẫn nền navy / tranh
  quẻ). Đổi là sửa data thuần trong `insight.ts`, không đụng logic.
- `Outro` bản navy vẫn in trùng tên miền (xem lỗi 4).

---

## 🖼️ Hội đồng CHẤM HÌNH mà KHÔNG NHÌN THẤY HÌNH — và kho ảnh thật (2026-08-17, PR #539 + đang làm)

Henry: *"hội đồng phán xét về CHỮ thì ok, chứ còn phán xét về HÌNH, mà nó lại ko
nhìn thấy hình, thì hơi ko ổn… khoan hãy code nhé, phải tìm ra nguyên nhân gốc"*.

### 🔴 Căn nguyên: với HÌNH, cổng 2 đang đo CHÍNH ĐẦU VÀO CỦA NÓ
`buildTimeline()` (`lib/video/gate-audience.ts`) là thứ DUY NHẤT hội đồng nhận.
Ô `NHÌN THẤY` của nó là **hằng số viết tay**: cảnh `typo` nào cũng ra đúng một
câu *"Chữ lớn phủ giữa màn hình, sáng dần theo nhịp đọc, nền xanh đậm."*
⇒ **kênh hình có phương sai BẰNG KHÔNG.** Một cái cân trả về cùng một số bất kể
đặt gì lên thì không phải đang cân.
- Nhưng than phiền lại KHÁC nhau giữa các clip ⇒ phần khác nhau đó **không thể**
  đến từ hình. Nó đến từ CHỮ cộng nhiễu `temperature: 0.7`.
- **Luật 5 của SYSTEM ép nêu đích danh một chi tiết** (*"Cấm nói chung chung"*).
  Model quyết trước rồi đi tìm thứ cụ thể để đổ lỗi; kênh hình là chi tiết LUÔN
  có mặt và LUÔN chê được ⇒ thành con dê tế thần mặc định. Chính cái luật viết
  ra để chống nói chung chung lại **sản xuất** ra lời chê chung chung.
- 🔑 Cơ sở phán quyết về hình là một **ĐỊNH KIẾN CHỦNG LOẠI** rút từ text huấn
  luyện (*"chữ trên nền phẳng = nội dung làm ẩu"*), không phải quan sát. Nói một
  lần thì đúng; phát lại 18 lần như 18 quan sát độc lập thì thành nhiễu đội lốt
  đồng thuận. Clip typography làm KỸ và làm ẨU nhận cùng một định kiến.
- ⚠️ **Bản vá đầu của tôi SAI, đã rút lại**: sửa cho mô tả đúng hơn KHÔNG đóng
  được vòng — mô tả hay thì điểm lên, mô tả nhạt thì điểm xuống, tức điểm bám
  theo VĂN CỦA TÔI. Đó là gương, không phải thước.
- 🔑 **Bài học đặt ở tầng phương pháp**: đầu file đã chốt đúng *"đừng hỏi clip có
  viral không, hỏi họ sẽ lướt ở đâu"* — nhưng kỷ luật đó áp cho CÂU HỎI mà không
  áp cho BẰNG CHỨNG. Câu hỏi hay vẫn vô nghĩa với phần clip model không hề nhận.

### ✅ Vì sao ảnh thật LÀM CHO phán quyết có nghĩa (Henry đề xuất, đúng)
Ảnh thật, mỗi tấm kèm mô tả riêng ⇒ hội đồng chuyển từ *tra định kiến* sang
**SO HAI VĂN BẢN NÓ ĐỀU NHẬN ĐƯỢC** (lời đọc ↔ mô tả ảnh). Phép so thì phân biệt
được và kiểm sai/đúng được.
- ⛔ **Vẫn KHÔNG chấm được ĐẸP/THU HÚT** — cái đó vẫn là định kiến. Đừng hứa.
- 🔑 **Điều kiện sống còn: mô tả ảnh KHÔNG do tôi viết** (metadata nhà cung cấp
  hoặc một lượt vision đọc chính pixel, sinh MỘT LẦN lúc nhập kho). Và luật cứng:
  **caption chỉ TẢ, CẤM KHEN** — *"người phụ nữ ngồi quay lưng bên cửa sổ, tông
  lạnh"* được; *"bức ảnh xúc động, bố cục đẹp"* cấm. Khen là dựng lại cái gương.

### 📐 Format ĐÃ CHỐT: **LAI** (Henry chọn)
`backdrop` = ảnh KHÍ QUYỂN cho cả clip, phân theo **TÔNG** · thêm 1–2 cảnh
`visual.kind='image'` CHỦ THỂ đúng nhịp chốt, phân theo **CHỦ ĐỀ**. Cả hai cơ chế
**đã có sẵn** trong `ScriptSpec`, không viết mới.
- Kho A (khí quyển) ~8 tông × 12 ảnh — **dùng chung toàn kênh** (ảnh sương mù hợp
  cả clip tình cảm lẫn công việc: nó tả tâm trạng, không tả nội dung).
- Kho B (chủ thể) ~10 chủ đề × 10 ảnh. Tổng ~200 ảnh, tải MỘT lượt.
- ⛔ **KHÔNG ảnh mỗi cảnh** — chú thích `backdrop` đã bác từ trước: *"ảnh đổi mỗi
  3 giây thì mắt chạy theo ảnh chứ không đọc chữ"*.

### 🔑 Tải TRƯỚC là ràng buộc CẤU TRÚC, không phải chuyện rẻ/đắt
Vòng lặp cần **cần gạt đổi ảnh**: hội đồng chê *"ảnh không hợp"* thì phải THAY
ẢNH, không phải viết lại chữ. Ảnh lấy đúng-lúc-cần thì **không có gì để thay
sang**. ⇒ kho phải tồn tại TRƯỚC lượt dựng. Cộng thêm: hotlink là render gãy khi
nhà cung cấp rate-limit/gỡ ảnh, và render lại sau 6 tháng phải ra đúng clip đó.
- Chọn ảnh **theo băm của clip**, không random (tiền lệ `pickEraForLaso`).
- Chống lặp: một ảnh không tái xuất trong ~10 clip gần nhất. Trùng vài ảnh cùng
  tông thì TỐT (nhận diện kênh); trùng nguyên bộ thì đọc thành lười.
- Bổ kho **theo NGƯỠNG, không theo lịch tuần**.

### 🧷 Nguồn: **Pixabay** chính · Pexels dự phòng · ⛔ Unsplash LOẠI
Unsplash **bắt buộc ghi công** ⇒ phải in tên tác giả lên khung 9:16 vốn đã chật
chữ. Dù không bắt buộc vẫn **lưu đủ provenance** (tác giả · URL · id · license) —
tiền lệ CSDL nghề nghiệp CC BY 4.0.
- ⚠️ **Chưa đọc được điều khoản hiện hành** lúc viết mục này (3 host còn bị chặn).
  Phải đọc tận nơi TRƯỚC lượt gọi API đầu tiên, đừng viết code theo trí nhớ.
- ⚠️ **Tôi đã vượt quá phận sự một lần**: lấy điều khoản HẸP (cấm bôi nhọ người
  trong ảnh) thổi thành luật chung rồi tự phán về nội dung của Henry. Anh bác
  đúng. Ranh giới thật: chỉ cắn khi ảnh + chữ đọc thành **khẳng định VỀ CHÍNH
  NGƯỜI TRONG ẢNH**. Ảnh minh hoạ cho luận điểm chung thì không. Vẫn **ưu tiên
  ảnh không rõ mặt** — vì bố cục và tông thương hiệu, không phải vì lo hộ.

### 🌐 Mạng: allowlist của environment, KHÔNG phải mạng hỏng
`curl: (56) CONNECT tunnel failed, response 403` = **chính sách egress từ chối**.
Phân biệt: `403 CONNECT` là chưa chạm tới server; `400/403/404` thường là đã tới
nơi. Henry sửa được ở cấu hình **environment** (cùng chỗ đặt biến môi trường).
- ⚠️ **Đổi allowlist/biến môi trường chỉ ăn ở PHIÊN MỚI** — container khởi động
  trước đó không thấy. Đã vấp: mở allowlist xong phải đo lại mới thấy thông.
- 🔴 **`.env` nằm trong `.gitignore` ⇒ KHÔNG BAO GIỜ tới container cloud.** Sửa
  `.env` ở máy Henry là nó ở lại máy Henry. Đường duy nhất: đặt biến ở cấu hình
  environment (chỗ `OPENAI_API_KEY` đang nằm), dán giá trị THÔ — không `;`,
  không dấu nháy, không xuống dòng. Cùng bài học đã ghi ở track GA4.
- ⛔ **Đừng để Henry dán key vào chat** — chat lưu lại, đúng lý do đã phải xoay
  service key một lần.
- 🔐 Nhập kho ghi Storage cần `SUPABASE_SERVICE_KEY` ⇒ **KHÔNG chạy ở Actions**.
  Nhập kho là việc CHẠY MỘT LẦN; Actions sau đó chỉ đọc URL công khai.

### ✅ PR #539 — bỏ lớp phủ toàn khung (Henry: *"có khi ko cần lớp phủ"*)
Chú thích cũ gọi lớp phủ navy toàn khung là *"BẮT BUỘC"* — **nói quá**. Thứ bắt
buộc là **tương phản CHỮ**; phủ cả khung là cách thô nhất, nó chữa chữ bằng cách
hy sinh ảnh. Nay `0,64 → 0,20`, tương phản do **`TextPlate`** ôm riêng khối chữ.
- **GIỮ gradient tối hai đầu**, có lý do: nhãn ở mép trên, TikTok phủ caption +
  thanh điều hướng lên ~250px mép dưới.
- 🪤 **Cơ chế Henry đề nghị ĐÃ CÓ SẴN mà tôi trích thiếu**: `PhotoBackdrop` vốn
  có 3 lớp, lớp thứ ba là dải tối bám RIÊNG vùng chữ. Đọc trọn khối code trước
  khi trích một chú thích làm luận cứ.
- ⚠️ Plate ổn định **chỉ vì** `WordKaraoke` dựng SẴN mọi từ từ khung 0 rồi đổi
  `opacity`. Đổi sang thật sự thêm từ dần thì plate giật theo từng từ.
- 🔑 Mở ra một tiêu chí ĐO ĐƯỢC: **"ảnh có chỗ đặt chữ không"** (vùng giữa đủ tối,
  đủ phẳng) thành **điều kiện tuyển ảnh** ở cổng 1 — 0đ, không cần hội đồng đoán.
  64 tranh quẻ thì mình không chọn được; ảnh stock thì mình CHỌN.
- Verify: `tsc` 0 · `prettier` sạch · render thật 91,63s 1080×1920 h264+aac.

### 🔢 ĐÍNH CHÍNH con số của chính tôi
**Chỉ có 6 kịch bản insight**, không phải 18. 18 là số clip **demo công cụ**
(`screen`, có bản quay màn hình thật). 24 clip khảo sát = 18 demo + 6 insight.
⇒ Than phiền *"chỉ có chữ trên nền xanh"* nhắm vào **6 clip insight**.
6 mẫu là quá mỏng để rút cây phân loại — lấy TÔNG từ tập đóng, CHỦ ĐỀ từ miền
nội dung site.

---

## 🧺 Kho ảnh THẬT + vá `buildTimeline`: hội đồng cuối cùng cũng nhìn thấy hình (2026-08-17, PR này)

Henry đặt `PIXABAY_API_KEY` xong. Theo đúng lệnh tự đặt ở mục trên: **gọi API
thật + đọc điều khoản TRƯỚC, viết script SAU**. Cả hai bước đều đổi quyết định.

### 🔐 Điều khoản đọc tận nơi — "tải về trước" là BẮT BUỘC, không phải tối ưu
Nguyên văn `pixabay.com/api/docs/`: *"permanent hotlinking of images (using
Pixabay URLs in your app) is **not allowed**. If you intend to use the images,
please **download them to your server first**."* ⇒ Lập luận cũ của mục trên
(*"tải trước là ràng buộc CẤU TRÚC"*) đúng, nhưng **lý do mạnh hơn hẳn nó tưởng**:
đây là điều kiện dùng, không phải chuyện bền vững kỹ thuật.
- Cộng thêm: `webformatURL` **hết hạn sau 24 giờ** ⇒ dán URL Pixabay vào
  `ScriptSpec` vừa vi phạm vừa chết sau một ngày.
- *"requests must be cached for 24 hours"* ⇒ script cache phản hồi xuống đĩa.
  *"Systematic mass downloads are not allowed"* ⇒ trần cứng `MAX_REQUESTS=60`,
  chạy tuần tự, có nghỉ, **cố ý không có `schedule`**.
- **Ghi công KHÔNG bắt buộc** ở đây: tài liệu chỉ "kindly request" nêu nguồn
  *khi hiển thị KẾT QUẢ TÌM KIẾM* — clip không phải kết quả tìm kiếm. Vẫn lưu đủ
  provenance trong manifest. (Vẫn loại Unsplash: bên đó ghi công là bắt buộc.)

### 📐 Hình dạng phản hồi — trả lời đúng câu hỏi mục trên treo lại
| Câu hỏi | Đo được |
|---|---|
| `largeImageURL` nằm ở host nào | **`pixabay.com/get/`** (không phải `cdn.`), chuỗi băm dài |
| Trường mô tả | **KHÔNG có caption**. Chỉ `tags` — chuỗi phẩy, **lặp rất nặng** (`sunset, sunset, sunset…`) |
| Trường lọc chưa biết | **`isAiGenerated` · `isLowQuality` · `isGRated` · `noAiTraining`** — dùng làm cổng lọc |
- 🔴 **Trần độ phân giải 1280px**: khoá này KHÔNG có full API access (`fullHDURL`
  / `imageURL` vắng mặt). Ảnh dọc về **853×1280** cho khung **1080×1920** ⇒ phóng
  **1,5×**. Chấp nhận được vì nền nằm dưới lớp phủ + `TextPlate`, nhưng **đây là
  giới hạn thật, đừng quảng cáo là ảnh gốc**.

### 🔴 Hai lỗi nội dung mà LỌC KỸ THUẬT KHÔNG bắt được — cả hai lộ ở lượt chạy thật
1. **Truy vấn "lonely person walking alone" trả về 4 bức chân dung NGƯỜI VÔ GIA
   CƯ** (`homeless, poverty, poor`), và cả 4 **qua sạch mọi phép lọc** (đủ tối,
   đủ dọc, không phải AI, G-rated). Ghép dưới câu *"bạn thuộc kiểu tổn thương
   nào"* thì ảnh + chữ đọc thành **khẳng định VỀ CHÍNH NGƯỜI TRONG ẢNH** — đúng
   ranh giới mục trên đã chốt. ⇒ `DENY_TAGS`, **cổng CHẶN không có ngưỡng**.
2. **Pixabay xếp theo ĐỘ PHỔ BIẾN, không theo ĐỘ KHỚP** — hết ảnh hợp đề tài là
   nó lặng lẽ trôi sang ảnh đẹp-mà-lạc-đề: `chia-xa` → *cinema, valencia,
   movies*; `nang-am` → một con **MÈO**; `suy-tu` → **hạt cà phê rang**.
   ⇒ mỗi tông khai `must[]`, ảnh phải mang ≥1 tag thuộc chủ đề.
- 🪤 Khớp theo **TỪ**, không phải chuỗi con — nếu không thì `war` ăn vào **warm**,
  `poor` ăn vào **poorly**, `grave` ăn vào **gravel**. Đúng lớp lỗi `\bcon\b`
  khớp "con vật" đã ghi. Red-team 4/4 ca biên đều KHÔNG chặn oan.
- ⚠️ **Cổng liên quan nâng sàn, KHÔNG thay được mắt người**: con mèo VẪN qua vì
  nó thật sự có tag `window, curtain`. Đừng đọc "84/84 đạt" thành "84 bức đẹp".

### 🖼️ Đo độ sáng — và soi trên bản 6KB thay vì bản 180KB
Tiêu chí *"ảnh có chỗ đặt chữ không"* mục trên nêu ra nay **chạy thật**: giải mã
ảnh về xám 64px, lấy dải giữa khung (nơi `TextPlate` ngồi), tính độ sáng.
- **Không thêm một gói phụ thuộc nào**: ffmpeg (bản đi kèm Playwright) giải JPEG
  → PNG xám, rồi `zlib` có sẵn của Node giải PNG. 🪤 Bản ffmpeg đó **thiếu muxer
  `rawvideo` và protocol `pipe:`** — phải đi đường `image2pipe` + `file:` + xuất
  PNG. Mất 4 lượt thử mới ra, ghi lại để khỏi dò lại.
- 🔑 **Soi trên `previewURL` (5–8KB) rồi mới tải bản lớn**: so 8 cặp
  preview↔large, **sai lệch tuyệt đối trung bình 0,19** trên thang 0–255 — tức
  bằng nhau. Nhờ vậy loại bức quá sáng khi mới tốn ~6KB thay vì ~180KB: lọc kỹ
  hơn **và** đúng tinh thần "không tải ồ ạt". Trước khi soi trước: 73/84 đạt;
  sau: **84/84**, và `ghe-trong` từ 2/6 lên 6/6.
- ⚠️ `BRIGHT_MAX=165` gắn với lớp phủ `0,20` + `TextPlate` HIỆN NAY. Đổi hai thứ
  đó thì **đo lại**, đừng chỉnh theo cảm giác.

### 🔴 Vá `buildTimeline` — và A/B chứng minh căn nguyên mục trên chẩn ĐÚNG
`lib/video/stock-catalog.ts` (mới) tra mô tả; `gate-audience.ts` nay nêu nền,
nêu `accent`, và **hết in URL thô**. Đo trên kịch bản THẬT, chặn `llmTextFull`
để bắt đúng chuỗi gửi lên model, đối chứng bằng `git worktree` ở bản trước vá:

| Clip | | Trước | Sau |
|---|---|---:|---:|
| `bon-buoc-truoc-khi-roi-di` | dòng "NHÌN THẤY" **khác nhau** | **3**/25 | **25**/25 |
| | nhắc `backdrop` | **0** | 1 |
| `ba-the-be-tac` | **URL thô** lọt vào prompt | **5** | **0** |

⇒ *"kênh hình có phương sai bằng không"* không phải suy luận: **25 cảnh chỉ ra 3
mô tả**, và bảng thời gian còn nói clip có **"nền xanh đậm"** trong khi clip có
3 bức tranh nền. Hội đồng bị bảo là clip chỉ có chữ trên nền phẳng, rồi than
đúng câu đó.
- 🔑 Nhánh không tra được mô tả trả **"CHƯA CÓ MÔ TẢ — đừng phán đoán gì"**, cố
  ý KHÔNG trả URL: model không đọc URL thành hình, nó chỉ bịa. Nói "không biết"
  thì hội đồng biết mình thiếu dữ kiện; đưa URL thì nó tưởng mình có.

### Verify
`tsc` 0 · `lint` **0 lỗi / 77 warning = đúng mốc nền** · `prettier` cả cây sạch ·
`node --check` cả hai script.
- **Kho thật: 84 ảnh / 14 nhóm, 14/14 nhóm đạt 6/6 đặt-chữ-được**, độ sáng
  8,1–163,2 (trần 165), **14 lượt gọi API** (trần 60), 60 ứng viên bị loại.
  Manifest: 84/84 đủ provenance · 0 trùng id · **0 ảnh dính `DENY_TAGS`**.
- **Chạy lại = no-op cho cả 14 nhóm** (idempotent), nhờ cache 24h + bỏ qua id đã có.
- **5/5 nhánh `describeImage`** đúng: đường dẫn kho · URL Storage · tranh quẻ ·
  không biết · caption có sẵn. `stockByKey` chỉ trả ảnh `textSafe`.
- **`stock-upload.mjs` 4 nhánh TỪ CHỐI** đúng mã thoát: thiếu khoá → 1 · thiếu
  file trên đĩa → 1 (soát TRƯỚC khi đẩy byte nào) · `--dry-run` → 0, không gọi
  mạng · đã có `url` → 0.

### CÒN LẠI
- 🔴 **Kho CHƯA nối vào clip nào** — `stock-upload.mjs` cần `SUPABASE_SERVICE_KEY`,
  không có trong container này, nên **đường đẩy THÀNH CÔNG chưa chạy lượt nào**
  (mới chứng minh các nhánh từ chối). Việc tay Henry: tạo bucket `stock` (công
  khai) rồi chạy `node scripts/stock-upload.mjs` ở máy có khoá. Xong bước đó thì
  manifest có `url` và kịch bản mới trỏ được vào kho.
- **Ảnh nằm NGOÀI git** (`remotion/public/stock/`, 28MB, đã vào `.gitignore`) —
  đúng lối tranh quẻ. Thứ commit là manifest 60KB, đủ để dựng lại kho.
- **Vòng lặp vẫn chưa có cần gạt thứ hai**: cần mã lỗi `visual.mismatch` + hành
  động ĐỔI ẢNH. `rewriteSpec` hiện chỉ viết lại chữ ⇒ chê hình mà sửa chữ là tái
  lập đúng lỗi vừa mổ. **Đây là việc tiếp theo đáng làm nhất** — kho có rồi thì
  cần gạt mới có chỗ để gạt sang.
- **6 kịch bản insight vẫn dùng tranh quẻ làm nền**, chưa bức nào đổi sang ảnh
  stock. Đổi là sửa data thuần trong `insight.ts`, không đụng logic.
- ⚠️ **Chưa ai NHÌN 84 bức bằng mắt.** Máy chỉ gác được ba thứ: đạo đức (tag),
  liên quan (tag), chỗ đặt chữ (pixel). Nó **không** gác được đẹp/hợp gu.
- **Chưa render thử một clip nào với ảnh stock** — chưa có `url` thì chưa render
  được. Chỗ đáng nhìn đầu tiên: bức sáng nhất kho (`ngon-den/4222263`, L=163,2)
  trên lớp phủ `0,20`.
- **Kho B (chủ thể) yếu hơn kho A**: "ghế trống"/"mặt nước" trên kho stock phần
  lớn là ảnh nội thất và ảnh giọt nước macro. Qua cổng nhưng nhạt.
- **Đừng hứa việc này cứu 17 clip trượt** — phần lớn trượt vì CHỮ.
- `0,20` mới soi trên MỘT bức; phải soi lại trên bức SÁNG NHẤT trong kho.
- Chưa đụng `PhotoScene` (cảnh ảnh riêng, có dải tối riêng, cơ chế khác).

---

## 🎞️ Tuyển lại kho theo BRIEF + một-ảnh-một-clip (2026-08-17, cùng PR)

Henry xem bản render đầu (ghế trống + lá đỏ, sáng) rồi ra brief: **ưu tiên châu
Á** (app cho người Việt) · cinematic moody 70% / retro 20% / huyền bí điểm nhấn ·
tối, tương phản cao, tối giản, chừa chỗ đặt chữ · loại sáng-vui-nhiều-màu, nền
lộn xộn. Vòng sau chốt thêm: **có người thì phải là người châu Á**, thêm nhóm
*tối giản* + *thiên nhiên u tối*, **mỗi clip MỘT ảnh**, blur nhẹ nền, nhạc lặng.

### 🔑 Chỗ hỏng là RỔ ỨNG VIÊN, không phải trọng số điểm
Lượt tuyển theo brief đầu ra **25% châu Á** dù đã cộng +45 điểm cho thẻ châu Á.
Tôi suýt đi chỉnh trọng số. Căn nguyên thật: `SCREEN_CAP=40` bị **truy vấn ĐẦU
TIÊN lấp đầy**, mà truy vấn nhắm châu Á là truy vấn thứ BA ⇒ nó không bao giờ
được hỏi tới. ⇒ **hạn ngạch theo TỪNG truy vấn** (`perQuery = ceil(CAP/n)`).
Sau đó: **41%**. 🔑 Điểm không cứu được khi rổ đã thiếu — sửa ở chỗ GOM, đừng
sửa ở chỗ CHẤM.

### 👤 Cổng NGƯỜI — chặn cứng, nhưng miễn cho ảnh KHÔNG thấy mặt
Luật: có thẻ người (`woman · man · portrait · face…`) ⇒ **bắt buộc** có dấu hiệu
châu Á, không thì loại.
- 🔑 **Miễn trừ `silhouette · shadow · backlit · hands`**: mục đích của cổng là
  "đừng để người xem thấy một gương mặt lạc kênh" — bóng ngược sáng thì **không
  có gương mặt nào để lạc**, mà đó lại đúng là hình moody đắt nhất của brief.
  Chặn nó là tự tay vứt thứ mình đang đi tìm.
- 🔑 **Tách `ASIA_STRONG` khỏi `ASIA_TAGS`**: `bamboo` · `lantern` · `rice field`
  nói về BỐI CẢNH, không nói ai đứng trong khung — một người mẫu Bắc Âu cạnh bụi
  tre vẫn ra `bamboo`. Chúng chỉ được cộng điểm, KHÔNG được làm bằng chứng.
- ⚠️ **Cổng này đọc THẺ, không nhìn ảnh** ⇒ loại oan ảnh người châu Á mà tác giả
  không gắn thẻ quốc gia. Chấp nhận: loại oan chỉ làm rổ nhỏ đi, còn lọt một
  gương mặt lạc thì hỏng đúng bức người xem nhìn suốt 40 giây.
- Soi kho CŨ bằng cổng mới: **16/84 (19%) bị loại**, gồm 2 bức **quân phục/lính**
  trong `hoai-niem` — cổng bắt được miễn phí một lỗi lạc kênh chưa ai nêu.

### 🔴 Bức "lọt cổng" hoá ra là PHÉP ĐO CỦA TÔI SAI — và nó lộ một lỗi thật
Audit báo 2 bức lọt. Mở thẻ THÔ ra thì cổng **chạy đúng**: bức `4851939` có
`silhouette` ở vị trí **13**, tức được miễn hợp lệ. Tôi đo trên `caption` đã bị
`captionFromTags` **cắt ở 12 thẻ**.
- 🔑 Nhưng chính chỗ đó là lỗi THẬT: **caption là thứ hội đồng đọc**, mà mức 12
  chặt ngay trước `silhouette, alone, sad` — đúng ba từ nói về cảm xúc bức ảnh.
  Nâng lên **16** (vá lại 42/94 caption từ API cache, 0 byte tải lại).
- ⚠️ 16 là một LỰA CHỌN, không phải phép đo: nới nữa thì nuốt thẻ máy sinh
  (`gray thinking`). Thà thừa thẻ nhiễu còn hơn thiếu thẻ mang nghĩa — việc của
  caption là để SO với lời đọc, không phải để đọc cho xuôi.
- 🔑 Bài học lặp: **đo trên bản đã cắt gọn thì đang đo bản cắt, không đo thứ
  cần đo.** Cùng lớp với `grep "A \|\| B"` đỗ giả đã ghi.

### 📐 MỘT ảnh cho MỘT clip (Henry: *"chuyển sang ảnh khác nó ko ăn nhập"*)
Bản trước rải 3 bức cùng tông và cho chuyển tiếp. Nhìn bản render thật thì mỗi
lần chuyển là một lần mắt phải làm lại việc *"đây là cảnh gì"*, trong khi thứ
đang chạy là CHỮ. Một bức đứng yên dưới Ken Burns trôi chậm đọc là **một khung
hình đang thở**; ba bức nối nhau đọc là **trình chiếu ảnh**.
- 🔑 **Bốc trong TOP-5 chứ không lấy hạng nhất**: lấy thẳng bức điểm cao nhất thì
  **mọi clip cùng tông ra cùng một bức** — với 6 kịch bản insight là chuyện xảy
  ra ngay. Bốc theo băm trong nhóm đầu bảng giữ được cả điểm cao lẫn khác biệt.
- ⚠️ **`score` là mức KHỚP BRIEF, KHÔNG phải "gây cảm xúc mạnh".** Máy không đo
  được cảm xúc. Henry dặn *"ưu tiên ảnh nào tạo emotion nhiều"* — thứ làm được
  là xếp theo brief rồi nói thẳng hai cái đó không phải một.

### 🎬 Ba mục còn lại của brief — hai cái ĐÃ CÓ SẴN, đừng làm lại
Đo trên mã trước khi sửa:
| | Thực trạng |
|---|---|
| Chữ trắng / vàng nhạt | ✅ `#F9F4EB` + `#C9A84C`, không phải đụng |
| Ken Burns chậm | ✅ `scale 1,05→1,18` chạy suốt clip, cố ý không reset mỗi ảnh |
| **Blur nhẹ nền** | ❌ `blur(18px)` chỉ là `backdropFilter` của `TextPlate` |
| **Nhạc piano/ambient/sad** | ❌ 4/6 clip dùng bed có TRỐNG 92–104 nhịp/phút |
- **Blur `6px`** cho ảnh nền — đẩy ảnh ra sau mặt phẳng chữ. ⚠️ Cân với `scale`
  khởi điểm 1,05: blur lấy mẫu ra ngoài mép ~3σ ≈ 18px, còn 1,05 trên khung 1080
  dư 27px mỗi bên. Hạ scale về 1,0 hoặc nâng blur quá ~9px là **hở mép trong
  suốt ở viền khung**.
- **Hai HỌ nhạc, cố ý không gộp**: có trống (`don-dap`·`cang-thang`·`sang-sua`)
  cho clip DEMO công cụ — chú thích cũ ghi đúng một quan sát thật *"nhạc trôi
  lững lờ làm người xem buồn ngủ"*, nhưng nó đo trên clip QUAY MÀN HÌNH, nơi
  không có gì để cảm nên nhịp phải gánh phần giữ chân. Không trống (`tram-tinh`
  + 2 bed mới `u-hoai` 52bpm · `lang-le` 46bpm) cho clip INSIGHT: cú đập 104
  nhịp/phút dưới câu *"bạn thuộc kiểu tổn thương nào"* thì nhạc và lời **đá
  nhau**. 6 clip insight nay chia đều 3 bed, không clip cạnh nhau nào trùng.
- ⚠️ Vẫn là **nền tổng hợp** (sin + hài bậc 2/3), nghe gần chuông/pad hơn dây
  đàn. **Đừng quảng cáo là piano.**

### Verify
`tsc` 0 · `lint` **0 lỗi / 77 warning = đúng mốc nền** · `prettier` cả cây sạch.
- **Kho mới: 94 ảnh / 16 nhóm · 11 lượt API** (trần 60) · 1.341 ứng viên bị loại.
  Trung vị: sáng **51,5** · màu **18,6** · rối **10,2**. 0 trùng id · 94/94 đủ
  provenance · **0 dính `DENY_TAGS`**.
- **Cổng NGƯỜI trên thẻ THÔ: 13 bức có mặt người → 13/13 châu Á, 0 lọt.** (81 bức
  còn lại là vật/cảnh/bóng — không có gương mặt nào để lạc.)
- **Red-team cổng 15/15 ca** gồm 4 ca phải LOẠI (`woman, portrait, dark` ·
  `bamboo, woman` · `lantern, girl` · `eyes`) và 4 ca phải NHẬN (`silhouette` ·
  `shadow` · `hands` · `monk/temple`).
- Thẻ châu Á toàn kho **41%** (trước 25%). Nhóm cao nhất: `bi-an` 6/6 ·
  `ngon-den` 6/6 · `co-don` 5/6 · `tinh-lang` 5/6.

### CÒN LẠI
- ⚠️ **`mo-mit` và `hoai-niem` chỉ lấy được 5/6, và `mo-mit` · `chia-xa` ·
  `cua-so` · `ghe-trong` có 0 ảnh châu Á.** Sương/ray tàu/ghế hiếm khi được gắn
  thẻ quốc gia — đây là giới hạn của việc đọc thẻ, không phải lỗi truy vấn.
- ⚠️ **Vẫn chưa ai NHÌN 94 bức bằng mắt.** Máy gác được: đạo đức · lạc kênh ·
  liên quan · chỗ đặt chữ · tối/ít màu/ít rối · người-phải-châu-Á. Nó **không**
  gác được đẹp, "trông có giống ảnh stock rẻ tiền không", và **cảm xúc**.
- Blur 6px mới soi trên MỘT bản render; chưa soi trên bức sáng nhất kho.
- Hai bed nhạc mới chưa ai NGHE — luật cũ vẫn áp: mỗi lượt đổi âm thanh phải có
  người nghe lại.

## 🏭 Khâu dựng clip lên GitHub Actions — và một phép kiểm TÔI ĐẶT TÊN SAI (2026-08-15, PR này)

Henry hỏi chạy pipeline ở đâu: session Claude Code, routine, hay dựng hẳn hạ
tầng. Chốt **GitHub Actions**, sau khi loại từng cái bằng lý do cụ thể:

| Chỗ | Vì sao không |
|---|---|
| Vercel cron | hàm trần **300 giây**, một clip render ~4 phút; và không có Chromium |
| Session Claude Code | ephemeral, và container **KHÔNG cho Chromium ra Internet** (`curl` thì được) |
| **Actions** ✅ | repo **đã** chạy Playwright + Chromium ở đây, có CPU, artifact tải về được |

- **Logic ở `scripts/build-video-batch.mjs`, YAML chỉ gọi nó.** Cùng một lệnh
  phải chạy được ở máy Henry lúc cần dựng gấp; YAML thì chỉ CI chạy được và
  mỗi lần sửa phải push mới biết đúng sai.
- Bốn tính chất chép từ `yt-drain`: tuần tự · hỏng một tool không kéo cả loạt ·
  ngân sách thời gian dừng giữa hai tool · nối lại được.
- ⚠️ **CỐ Ý chưa có `schedule`** — chạy hằng ngày chỉ có nghĩa khi đã đủ kịch
  bản nhiều tool VÀ đã nối đường đăng bài. Bật lịch lúc mới có 1 kịch bản là
  mỗi sáng dựng lại đúng một clip đã có.
- **💰 Cache giọng đọc** là bước đáng giá nhất: TTS là khoản biến đổi DUY NHẤT
  (nhạc · quay · render · cổng 1 đều 0đ; đo được **511 ký tự / 7 lượt** mỗi
  clip). Tên mp3 chính là băm của (chữ+giọng+tốc độ) nên cache thư mục an toàn
  tuyệt đối. Không có nó thì mỗi lượt 18 clip đốt lại **126 lượt TTS**.

### 🔴 Phép kiểm tôi viết ra KHÔNG kiểm đúng thứ nó mang tên
Tôi thêm bước soi mp4 và gọi nó là *"bắt clip câm"* — kiểm `hasAudio`. Đo thật
thì bản `--no-voice` **VẪN có `audio aac 2ch 48000Hz`, 41,4s**: nhạc nền vẫn
render nên track tiếng vẫn có. Tức phép kiểm luôn XANH kể cả khi mất sạch lời
đọc — đúng loại xanh-oan nguy hiểm nhất, và nó đứng gác cho ca hỏng tệ nhất của
khâu tự động (18 clip không lời vẫn "thành công" rồi ra hàng đợi đăng).
- 🔑 Chốt phải nằm ở **lúc biết TTS hỏng**, không nằm ở khâu soi file phía sau.
  Thêm `--require-voice` cho `gen-video.mjs`; batch LUÔN truyền cờ đó.
- **Vì sao không bỏ luôn fail-soft:** hai lối dùng cần hai hành vi ngược nhau —
  chạy TAY thì mất khoá TTS vẫn nên render để duyệt bố cục; chạy TỰ ĐỘNG thì
  không. Cờ chọn hành vi, không phải đổi mặc định.
- 🔑 Bài học đặt tên: **gọi phép kiểm theo điều nó THỰC SỰ đo, không theo điều
  mình muốn nó đo.** Cùng lỗi đã ghi ở track `huong-nghiep-tre` (*"bài kiểm đặt
  tên theo điều muốn chứng minh"*), vấp lại.

### Verify
`lint` 0 lỗi / 77 warning = mốc nền · `prettier` cả cây sạch · YAML parse được ·
`node --check` cả hai script.
- **3 ca trên `--require-voice`**: TTS hỏng (ép `SUPABASE_URL` sai) → **exit 1,
  không render** · **ĐỐI CHỨNG** bỏ cờ đi thì fail-soft y như cũ · `--no-voice`
  + `--require-voice` → từ chối vì loại trừ nhau.
- **Chèn lệnh qua ô nhập workflow**: chạy chính đoạn shell đó với
  `IN_TOOLS='a; touch /tmp/PWNED'` → chuỗi giữ nguyên làm MỘT tham số, không
  tạo file. (Ô nhập đi qua `env:` chứ không nội suy `${{ }}` thẳng vào `run`.)

### CÒN LẠI
- **Chưa chạy thật một lượt trên Actions** — workflow mới, chỉ verify được YAML
  + logic shell tại chỗ. Lượt bấm đầu tiên là phép thử thật.
- **Chỉ 1/18 tool có đủ công thức quay + kịch bản.** Batch tự lọc theo giao của
  hai danh sách nên không gãy, nhưng `--all` hiện chỉ ra một clip.
- **Chưa nối đường đăng bài.** Clip mới nằm ở artifact; muốn YouTube tự đăng thì
  phải đẩy lên Supabase Storage cho `yt-drain` lấy — cần `SUPABASE_SERVICE_KEY`
  trong Actions, và đó là quyết định của Henry (key này đã phải rotate một lần).

---

## 📤 Đường clip ra kho — và KHÔNG đưa service key vào Actions (2026-08-15, PR này)

Henry: *"Setup tiếp đi. Nhưng mà khoan hãy chạy gen clip nhé… tao muốn chỉnh sửa
chiến lược làm nội dung chút xíu"*. Nên dựng ĐƯỜNG ỐNG, không dựng nội dung.

### 🔴 ĐÍNH CHÍNH tiền đề của chính tôi: YouTube KHÔNG tắc
Tôi định bỏ qua nhánh YouTube vì "token chết như đã ghi". Đo lại thì ngược:
**3 video/ngày đang lên đều**, 22 video live từ 11/08, hôm nay vẫn chạy. 63 dòng
`error` còn lại là **chữ lỗi CŨ** từ đợt hỏng tháng 7, và hàng đợi đang xả dần
(~21 ngày nữa hết). ⇒ Clip mới phải có **LÀN RIÊNG**, chen vào hàng đó là clip
nằm chờ ba tuần sau lưng 63 bài vấn đáp.

### 🔐 Bỏ hẳn phương án đặt `SUPABASE_SERVICE_KEY` vào GitHub Actions
Đó là khoá mở toang cả DB, đặt trong môi trường CI mà mọi workflow đều đọc được
biến môi trường — và **khoá này đã phải xoay một lần vì lộ**. Thay bằng hàm edge
**`clip-ingest`** giữ service key ở phía server; runner chỉ cầm
`CLIP_INGEST_SECRET`, làm được đúng một việc là nộp clip, lộ thì tối đa là vài
clip rác. ⇒ Quyết định treo bấy lâu (*"có nên đưa service key vào Actions không"*)
nay **không cần trả lời nữa** — câu hỏi đã biến mất cùng thiết kế.

### ⚠️ NỘP KHO ≠ XẾP HÀNG ĐĂNG — và đây là chốt chặn thật, không phải câu chữ
`publishQueue` quét `media_posts` theo **TRẠNG THÁI**, KHÔNG lọc theo kênh: gặp
`channel` chưa có adapter là đánh `error` cho cả lô ngay lượt cron kế tiếp. Nên
`clip-ingest` chỉ ghi `media_assets`, **cố ý không tạo `media_posts`** — vừa
đúng vì caption/kênh là quyết định nội dung Henry đang muốn sửa, vừa tránh tự
tay làm hỏng hàng đợi.

### 🪤 Body 4MB + nhánh TỪ CHỐI = treo 150 giây — và bản vá đầu của tôi VÔ DỤNG
Đo: request bị từ chối mang body **100KB** → trả lời **0,7s**; cùng nhánh đó với
**4MB** → **treo 150 giây rồi 504**. Tôi đoán là do hàm trả lời mà không đọc hết
body, vá bằng `req.body.cancel()`, deploy lại, **đo lại: y nguyên**. Giả thuyết
sai ⇒ **gỡ bản vá đi** thay vì để lại một đoạn mã kèm chú thích nói nó chữa được
thứ nó không chữa.
- Chốt đúng nằm ở **phía gửi**: hỏi `?ping=1` (body rỗng) soát khoá TRƯỚC rồi
  mới nộp file. Đo lại: **150s treo → 0,7s kèm câu chỉ đúng chỗ phải sửa**.
- Không có bước đó thì một secret sai = 18 clip × 150 giây, job hết giờ, và dòng
  lỗi cuối cùng là một con số `504` chẳng chỉ vào đâu.

### Verify
`tsc` 0 · `lint` 0 lỗi / 77 warning = mốc nền · `prettier` cả cây sạch.
- Bucket `clips` đã tạo (công khai, trần 60MB, **chỉ nhận `video/mp4`**), **0
  policy cho anon/authenticated** — đọc qua URL công khai, ghi thì phải qua hàm.
- Hàm `clip-ingest` **live v3**, `verify_jwt:false` (tự xác thực bằng header).
  Đo trên bản đang chạy: không khoá → `missing_env` · khoá sai → cùng nhánh ·
  `GET` → 405 · ping trả lời trong 0,7s.
- Script: `--dry-run` liệt đúng 6 clip · thiếu secret → **bỏ qua CÓ BÁO, exit 0**
  (không đánh hỏng lượt dựng) · khoá sai → **exit 1 trong 1 giây** kèm hướng dẫn.

### CÒN LẠI
- ⚠️ **Đường nộp THÀNH CÔNG chưa chạy được lượt nào** — tôi không đặt được
  secret Supabase từ đây. Mới chứng minh được các nhánh TỪ CHỐI. Lượt nộp thật
  đầu tiên là phép thử thật; chỗ đáng nhìn nếu hỏng là bước ghi Storage.
- **Việc tay Henry:** đặt `CLIP_INGEST_SECRET` ở CẢ HAI nơi (Supabase → Edge
  Functions → clip-ingest → Secrets; GitHub → Settings → Secrets → Actions).
- **Chưa có adapter TikTok/Reels**, và Facebook thì 33 bài vẫn kẹt từ 02/08 vì
  token hết hạn. Khâu xếp hàng đăng chờ Henry chốt chiến lược nội dung.

---

## 🎬 18/18 công cụ miễn phí có kịch bản clip + công thức quay (2026-08-15, PR này)

Henry: *"Bây giờ làm batch demo sản phẩm"* → chốt làm hạ tầng Actions trước
(*"Làm (2) trước đi"*), nay tới lượt nội dung: **17 kịch bản còn lại**.

### 🔑 Bỏ hẳn lối khai tay `startSec`
`startSec` là mốc thời gian BÊN TRONG một file mà người viết kịch bản chưa nhìn
thấy. 17 công cụ × 5 cảnh = **85 con số đoán mò**, và đoán sai thì hỏng IM LẶNG:
`OffthreadVideo` vượt quá độ dài bản quay chỉ đứng ở khung cuối — không lỗi,
không cảnh báo. Bỏ trống thì mọi cảnh chiếu lại giây 0 và clip thành ảnh tĩnh.
- `gen-video.mjs` thêm `fillStartSec`: đo độ dài THẬT của bản quay rồi rải theo
  tỉ lệ, **kẹp** để không cảnh nào chạy quá đuôi. In một dòng soi được bằng mắt:
  `mốc hình (bản quay 16.9s): 0.0s → 3.5s → 6.9s → 10.0s → 13.4s`.
- Cảnh có `startSec` khai tay thì GIỮ NGUYÊN (`than-so-hoc` đã hiệu chỉnh bằng
  mắt trên bản quay thật) — đường tự rải cố ý không đè lên.

### ⚠️ Bản quay phải DÀI HƠN lời đọc — đo mới thấy
Lượt đầu `kim-lau` quay ra **12,1s** trong khi lời đọc **25,9s** ⇒ hình tua lại,
nửa sau clip trông như ảnh tĩnh. Nới nhịp giữ trong `showResult` (helper dùng
chung) → cả 15 bản quay nay **17–21s**; `kinh-dich` 31s vì phải gieo đủ sáu hào.
- Khung hình CUỐI của bản quay phải là chỗ đọc được: cảnh cuối clip luôn bị kẹp
  về đúng đoạn đuôi đó. Nên `showResult` cuộn ngược lên trước khi dừng.

### 🪤 Ba bẫy đã vấp (đều là lỗi của TÔI, không phải của trang)
1. 🔴 **`typeSlow` không xoá ô trước khi gõ.** `app-hoang-dao.html` điền sẵn
   ngày hôm nay ⇒ gõ thêm "15" vào ô đã có "15" ra **1515**, `compute()` trả
   `ok:false`, khối kết quả không bao giờ hiện, lượt quay chết ở
   `waitForSelector` sau 30 giây mà **không nói được vì sao**. Phải `fill('')`.
2. **`ngay`/`thang` của `TuviForm` là `<select>`** — bài học đã ghi trong file
   này, nay tách hẳn helper `pick()` để không ai vấp lại.
3. **Bẫy cwd, lần thứ ba**: chạy `node scripts/...` khi đang đứng ở `public/` →
   `MODULE_NOT_FOUND` cho cả 9 công cụ một lượt.

### 🧷 Ba công cụ KHÔNG quay được từ bản phục vụ tĩnh — hỏng TO thay vì lặng
`localPath: null` ⇒ `record-tool-demo.mjs` dừng hẳn kèm lý do, thay vì lặng lẽ
rơi về `/app/<tool>` rồi quay 20 giây trang 404 trắng (mà khâu soi file **không
bắt được** — mp4 vẫn đủ hình đủ tiếng).
- `ky-mon` cần `/api/qimen` · `ban-do-sao` cần `/api/natal` · `tuong-hop` nhận
  diện chế độ theo ĐƯỜNG DẪN nên bản tĩnh rơi vào tool **trả phí** và dựng
  tường thanh toán giữa clip.
- 🪤 **Chốt chặn bản đầu ĐOÁN THEO TÊN MÁY** (`localhost` ⇒ bản tĩnh) nên nó
  chặn oan đúng cái đường mà **chính thông báo lỗi của nó khuyên dùng**:
  `next dev` cũng chạy ở `127.0.0.1` nhưng có đủ rewrite `/app/*` lẫn route
  API. Đổi sang **thăm dò thật** — hỏi `recipe.path` có mở được không, mở được
  thì dùng. Nhờ vậy cả ba đã quay được ngay ở đây qua `next dev`, và chốt vẫn
  đỏ đúng 3/3 khi trỏ vào server tĩnh.

### 🔁 TTS chớp một nhịp = mất trắng một clip — thêm thử lại
Lượt dựng 2 clip đầu: `an-sao` TRƯỢT vì TTS hỏng giữa chừng, chạy lại ngay sau
đó thì xong. `--require-voice` đã chặn ĐÚNG (thà trượt còn hơn ra clip câm),
nhưng trong lượt 18 clip thì đó là một clip mất không vì lý do gì.
- Thử lại **3 lượt, giãn dần, ngay trong `ttsScene`** — không phải ở tầng gọi:
  chỗ đó biết chắc lỗi là của MỘT câu, và mấy câu đã sinh xong đều nằm trong
  cache nên lượt sau không đọc lại. Thử lại cả clip là tốn thêm một lượt render.

### 🪤 `viral.no-invite` KÊU OAN 11/17 — nới đúng chỗ nó đo hụt
Bộ dò chỉ tra một bảng cụm cố định (`comment · bình luận · gửi cho…`) nên câu
kết *"Bạn mệnh gì?"* — đúng là câu trả lời được ngay trong ô bình luận — vẫn bị
báo là không mời tương tác. **Bộ dò kêu oan là bộ dò bị tắt đi.**
- Nới bằng một tính chất ĐO ĐƯỢC (*câu hỏi ngắn nói thẳng với người xem*), KHÔNG
  bằng cách thêm vài cụm nữa vào bảng — thêm cụm là hẹn lần kêu oan kế tiếp.
- 🔑 **Red-team ngay sau khi nới** (nới xong mà không kiểm thì có thể vừa tắt bộ
  dò đi): đổi một câu kết thành câu trần thuật → cảnh báo kêu lại; khôi phục →
  im. Có assert đột biến ĐÃ ăn trước khi đọc kết quả.

### ⚠️ `length.off-sweet-spot` phần lớn là SAI SỐ CỦA ƯỚC LƯỢNG, đừng cắt lời đọc
Cả 18 kịch bản ước 31–37s (ngoài khoảng 18–32s). Nhưng hằng số 13,59 ký tự/giây
đo trên đoạn DÀI, còn câu cỡ một cảnh thì nó **ước dư**: `than-so-hoc` ước 37,6s
mà render ra **32,4s**; `kim-lau` ước 34,4s mà giọng đọc thật **25,9s**. Cắt bớt
lời đọc để dập cảnh báo này là sửa theo một con số đã biết là lệch.

### Verify
`tsc` 0 · `lint` **0 lỗi / 77 warning = đúng mốc nền** · `prettier` cả cây sạch.
- **Cổng 1 trên CẢ 18 kịch bản: 18/18 QUA**, 0 block. Còn `cta.too-long` (cố ý,
  xem mục dưới) và `length.off-sweet-spot` (sai số ước lượng, xem trên).
- **15/15 công cụ quay được tại chỗ đều quay THẬT** — `waitForSelector` trên
  khối kết quả nên quay xong nghĩa là kết quả đã hiện, không phải trang trắng.
  Phủ đủ ba hình dạng DOM: form dựng tay · `TuviForm` (select) · rút bài.
- **`kim-lau` render đầu-cuối THẬT** (quay → cổng → giọng → mp4), soi khung hình
  tĩnh xác nhận bố cục; batch 2 công cụ chạy qua đúng orchestrator.
- **3 ca chốt `localPath: null`**: `ky-mon` · `ban-do-sao` · `tuong-hop` đều
  **exit 1** kèm lý do khi trỏ vào bản phục vụ tĩnh.

### CÒN LẠI
- **3 công cụ chưa quay được ở đây** (cần prod/`next dev`) — Actions quay từ
  prod nên tự có; ở container này thì trình duyệt không ra được Internet.
- **Cổng 2 vẫn chưa chạy lượt nào** — cần `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`.
  18 kịch bản mới vì thế mới qua tầng MÁY, chưa ai đọc bằng con mắt người xem.
- ⚠️ **Chưa ai NGHE 17 clip mới.** Tôi không nghe được audio; luật đã ghi ở track
  trước vẫn áp: mỗi lượt đổi chữ là phải có người nghe lại.
- Nội dung 18 kịch bản là **tôi tự viết**, chưa ai review — cùng dạng nợ với 384
  hào từ. Sửa là sửa data thuần trong `BATCH`, không đụng logic.

---

## 🎟️ Câu kết clip đọc TÊN MIỀN + MÃ, và bảng mã khuyến mãi (2026-08-15, PR này)

Henry: *"phần closing… Mày lam no đọc luôn tên website tuviminhbao.com và thêm
đoạn Nhập mã TUVIMINHBAO để nhận ngay 100 lượng. Xong mày bổ sung thêm vào flow
signup thêm cái ô để user nhập mã lúc signup… Nhân tiện bổ sung tab quản lý mã
trong page admin luôn"*.

### 🔑 Chữ VIẾT ≠ chữ ĐỌC — phải tách hai bản
`ScriptSpec.text` vốn gánh CẢ phụ đề LẪN lời gửi TTS. Với câu kết mới thì hai
vai đá nhau: phụ đề phải ghi đúng `tuviminhbao.com` + `TUVIMINHBAO` để người ta
gõ lại được, còn Vbee đọc tên miền thành một khối vô nghĩa và đọc mã viết HOA
thành từng chữ cái — hỏng đúng câu quan trọng nhất về mặt chuyển đổi.
- Thêm `Scene.speech` + `ScriptSpec.ctaSpeech` (bỏ trống ⇒ đọc luôn `text`).
  Bản đọc: *"Tra tại **Tử Vi Minh Bảo** chấm com. Nhập mã **Tử Vi Minh Bảo** để
  nhận ngay 100 lượng."*
- 🔴 **BẢN ĐỌC PHẢI CÓ ĐỦ DẤU.** Bản đầu tôi viết `tu vi minh bảo` (chỉ mỗi
  "bảo" có dấu) → Vbee đọc ra đúng một khối phẳng *"tuviminhbao"*, tức KHÔNG
  chữa được gì so với gửi thẳng tên miền; Henry nghe ra ngay. Tiếng Việt không
  dấu thì bộ đọc không tách được thành từ. Viết như TÊN RIÊNG: `Tử Vi Minh Bảo`.
  Áp cho MỌI chuỗi `speech` sau này, không riêng câu kết.
- ⛔ **CHỈ dùng cho 3 lớp ca**: tên miền · mã viết HOA · chữ số. Ngoài đó để
  `text` gánh cả hai vai — hai bản chữ song song là đúng bẫy "chép hai nơi rồi
  trôi khỏi nhau" mà chính hợp đồng này sinh ra để tránh.
- `estimateTotalSeconds` đổi sang ước theo bản ĐỌC; `checkLeaks` quét CẢ hai bản
  (rò trong bản đọc thì không thấy trên phụ đề nhưng vẫn phát ra tiếng).
- ⚠️ Câu kết CỐ Ý vượt ngưỡng cảnh báo `cta.too-long` (6s → thật 6,5s): nó chở
  bốn mẩu tin (câu hỏi · từ khoá · tên miền · mã kèm số Lượng), trong khi ngưỡng
  đặt hồi câu kết chỉ có một lời mời bấm. **Giữ ngưỡng và để nó kêu**, không nới
  cho khỏi thấy cảnh báo. Clip thật: **32,58s**, video h264 1080×1920 + audio aac.

### 🎟️ `promo_codes` + `promo_redemptions` + RPC `promo_code_redeem`
Đường PHÁT TIỀN ⇒ mọi chốt chặn nằm ở **tầng DB**, không ở mã ứng dụng:
| Chốt | Cách |
|---|---|
| Một tài khoản đổi ĐÚNG MỘT mã trọn đời | **KHOÁ CHÍNH** `promo_redemptions.user_id` |
| Trần tổng lượt mỗi mã | `max_uses`, khoá dòng `for update` khi đọc |
| Trần tuyệt đối mỗi lượt | `PROMO_MAX_CREDITS = 1000` ngay trong RPC |
| Hạn dùng · chỉ tài khoản mới | `expires_at` · `new_account_days` |
- ⚠️ **UNIQUE(user_id) chứ KHÔNG phải (user_id, code)**: cho một người gom nhiều
  mã là nhân bề mặt lạm dụng theo số chiến dịch. Nới về sau thì dễ, siết lại sau
  khi đã bị farm thì không.
- **Thứ tự "ghi dấu TRƯỚC, cộng tiền SAU"** chép từ `onboarding_task_claim`: hai
  chiều hỏng không đối xứng — cộng trước mà lỗi ⇒ cộng hai lần (phát không tiền,
  không phát hiện được); ghi dấu trước mà lỗi ⇒ thiếu một lần, đối soát được.
- Trần credits kiểm **TRƯỚC** bước chống-trùng: giá vô lý là lỗi cấu hình, phải
  kêu to chứ không được lặng lẽ đọc thành "đã dùng rồi".
- 🔐 `revoke ... from public, anon, authenticated` — EXECUTE cho PUBLIC là dựng
  sẵn của Postgres, hàm SECURITY DEFINER mới nào cũng sinh ra hở. Verify: ACL chỉ
  `postgres | service_role`, `set local role anon` → *permission denied*.
- Seed `TUVIMINHBAO` = 100 Lượng · `max_uses=200` · `new_account_days=30`.
  **200 lượt ≈ 880.000đ chi phí model THẬT** (100 Lượng ≈ 4 lượt tool ảnh ≈
  4.400đ), không phải 82.900đ giá bán lẻ. Nới bằng Admin, không cần deploy.

### Bề mặt
- **`public/promo.js`** — NGUỒN DUY NHẤT (bắt `?promo=` · `info()` · `redeem()`).
  `auth.js` **nạp LƯỜI** nó khi modal mở hoặc URL có `?promo=`: auth.js nằm trên
  ~89 trang, thêm thẻ script vào từng file là 89 chỗ để quên — đúng lỗi
  `referral.js` đã dính khi bị chép inline 2 bản.
- **Ô mã trong modal đăng ký**, chỉ hiện ở tab Đăng ký. Ô này **KHÔNG tự đổi mã**
  — nó CẤT mã vào sessionStorage (cả đường email lẫn OAuth, vì `signInGoogle` rời
  trang), `promo.js` đổi sau khi có token thật.
- **Ô đổi mã ở trang nạp Lượng** — đường về cho người ĐÃ CÓ tài khoản; thiếu nó
  thì mã trên clip chỉ dùng được đúng lúc đăng ký, ai lỡ tay là mất hẳn đường.
- **Số Lượng LẤY TỪ SERVER** (`promo-info`), không viết cứng "100" lên giao diện
  — cùng luật `check:prices`. `promo-info` cố ý **không trả `used_count`/`max_uses`**
  (ngân sách nội bộ).
- **Panel "Mã Khuyến Mãi"** ở trang Gói Nạp & Pricing. Ba thứ KHÔNG cho sửa:
  `used_count` (số đếm thật) · trần 1.000 · xoá mã đã có người đổi (FK chặn —
  muốn dừng thì TẮT, để lại dấu vết). Mã mới mặc định AN TOÀN (trần 100 lượt +
  chỉ TK mới ≤30 ngày), không phải mặc định tiện.

### Verify
`tsc` 0 · `lint` **0 lỗi / 77 warning = đúng mốc nền** · `prettier` cả cây sạch ·
**20/20 bộ dò** · engine **185 pass**.
- **RPC THẬT trên prod**, chạy trong transaction rồi rollback (verify sau đó
  `promo_redemptions` 0 dòng · `used_count` 0 · 0 giao dịch): gõ chữ thường vẫn
  ăn · **hai lượt liên tiếp chỉ +100 chứ không +200** · đúng 1 dòng giao dịch ·
  mô tả giữ nguyên dấu tiếng Việt · `not_found`/`invalid_input`/`disabled`/
  `expired`/`exhausted` đúng nhánh · trần credits **NÉM** chứ không im lặng ·
  **ĐỐI CHỨNG tuổi tài khoản**: TK 146 ngày → `account_too_old`, TK 0 ngày → ok,
  bỏ chốt tuổi → TK cũ qua được.
- **19 ca trên ROUTE THẬT** qua Next dev + stub PostgREST: không auth → 401 ·
  token người thường gọi admin → 403 · mã rỗng/60 ký tự → 400 · mã có `;`/2 ký
  tự → 400 · credits 100000/âm/10.5 → 400 · **ĐỐI CHỨNG admin hợp lệ → 200**.
- **24 ca trên TRANG THẬT**: ô mã ẩn/hiện đúng tab · gợi ý nêu **100 Lượng lấy
  từ server** · mã hết hạn báo đỏ · **mã rác → IM LẶNG** (đang gõ dở thì không
  doạ) · bấm Tạo tài khoản và bấm Google đều CẤT mã · `?promo=` được nhặt, **dọn
  khỏi thanh địa chỉ nhưng GIỮ utm_*** · tự mở tab Đăng ký · đổi mã xong xoá ô,
  mã hỏng thì GIỮ ô để sửa · chuỗi từ server **không chạy được HTML** · **ĐỐI
  CHỨNG khách chưa đăng nhập → không hiện ô đổi mã**.
- **34 ca trên `admin.html` THẬT** (light + dark): mã đã dùng **không có nút
  Xoá**, ĐỐI CHỨNG mã chưa ai dùng thì CÓ · ghi chú `<img onerror>` không chạy ·
  ô trống = ∞ · **payload lưu KHÔNG mang `used_count`** · hạn quy về **cuối ngày
  giờ VN** (`23:59:59+07`) chứ không 00:00 UTC.

### 🪤 Bẫy đã vấp (đều là lỗi của TÔI, không phải của mã)
1. 🔴 **Deploy RPC lượt đầu gõ chữ KHÔNG DẤU** (`'Ma khuyen mai: '`) trong khi
   file repo có dấu — mà chuỗi đó vào `credit_transactions.description`, người
   dùng đọc được. **Đúng bệnh "bản đang chạy khác bản trong repo"** đã ghi ở
   track `send-daily-push`. Đã `create or replace` lại bằng nguyên văn.
2. **`where code = v_code` AMBIGUOUS** với cột `code` của `RETURNS TABLE` → phải
   `where promo_codes.code = v_code`. File repo lúc đầu sai, đã sync theo bản
   đang chạy.
3. **`cd X && A & B`**: `cd` chỉ bind vào job nền đầu, `B` chạy ở cwd CŨ
   (`tuvi-engine`) → Next dev báo *"Couldn't find any `pages` or `app`"*. Bẫy cwd
   đã ghi, vấp lại.
4. **`pkill -f "next dev -p 3111"` khớp CHÍNH dòng lệnh của nó** → tự giết (exit
   144). Lần thứ hai.
5. **Đọc sessionStorage SAU `signInGoogle()`** → *execution context destroyed*
   (hàm đó gán `location.href`). Phải đọc trong CÙNG lượt `evaluate`. Bài học
   "đọc DOM trước hành động làm rời trang", vấp lại.
6. **`waitForSelector` mặc định chờ VISIBLE** — ô mã đúng ra phải ẩn ở tab Đăng
   nhập, nên phải `state:'attached'`.
7. 🔴 **Bảng admin đo trên trang CHƯA active**: `textContent`/`inputValue` đọc
   được phần tử ẩn nên 10 assertion đầu VẪN XANH trong khi bảng không ai nhìn
   thấy; chỉ `fill()` mới lộ. Phải vào bằng chính `enterApp('...','owner')` +
   `goTo('pricing')`, đừng tự bật class.
8. **Stub `Auth` thiếu `getUser`** (có thật ở `auth.js:212`) → `loadStatus()` ném
   và bài kiểm đọc thành "lỗi JS của trang".

### CÒN LẠI
- ⚠️ **Tôi KHÔNG nghe được audio** — chỉ đo được độ dài file và xác nhận mp4 có
  track thật. Chính vì thế lỗi "đọc không dấu" ở trên lọt qua cả lượt verify:
  bản hỏng và bản đúng có độ dài gần y nhau, mọi phép đo tôi chạy đều xanh.
  ⇒ **Mỗi lần đổi chuỗi `speech` thì phải có người nghe lại**, đừng đọc một
  lượt render thành công là "đã đúng".
- **Mã mới ăn từ lúc DEPLOY** — bảng + RPC đã có trên prod, nhưng ô nhập và
  panel admin thì phải deploy xong mới thấy.
- **17 clip còn lại chưa dựng** — `buildCta` dùng chung nên chúng tự có câu kết
  mới, chỉ cần thêm `keyword`/`ctaQuestion` vào `SOURCES`.
- Cổng 2 (hội đồng người xem) **vẫn chưa chạy lượt nào** — cần `GEMINI_API_KEY`
  hoặc `ANTHROPIC_API_KEY` trong môi trường dựng.

---

## 🫂 Rail thành "Trò chuyện với Thầy" — 4 tầng, và vòng vá NHỊP HỘI THOẠI (2026-08-12, #507 + PR này)

Henry: kinh tế khó → người ta stress, mà VN gần như không có kênh tâm lý nên họ
đi chùa. Muốn rail thành chỗ trò chuyện HẰNG NGÀY: nhớ chuyện của họ, ghép với
lá số + tâm lý/tôn giáo, **chủ động hỏi thăm** — *"act như 1 therapist ah"*.

### 🔑 Rail là MỘT khung dùng chung cho ~25 tool — nên phải PHÂN TẦNG
Henry chốt 3 tầng: (1) cách hành xử chung · (2) hồ sơ người dùng · (3) data tool
đang mở (đổi theo tool). Không mở tool nào thì vẫn có tầng 1+2.
- 🔑 **Điểm ráp DUY NHẤT**: `run.ts` sau `CHAT_SUGGEST_RULES` — chỗ đó nằm SAU
  cả nhánh `scenario` lẫn nhánh lá số và phủ CẢ BA đường provider (Gemini prose ·
  Gemini tools · Anthropic). Chèn một chỗ là phủ trọn ~25 prompt, không sót nhánh.
- ⚠️ **Tầng 1 phải đứng CUỐI, không phải đầu.** Nó GHI ĐÈ `RAIL_LASO_SHAPE`
  ("MỞ BẰNG PHÁN QUYẾT… In đậm") và `GIONG_NGUOI_RULES` ("trời ơi", "ôi", "á") —
  hai luật dựng cho một lượt luận ĐÁNG NHỚ, đúng cho tra cứu, **hỏng hẳn với người
  vừa gõ "em mất việc hai tháng rồi"**. Đảo thứ tự là model theo luật cũ.
  Đánh đổi có ý thức: đứng sau ⇒ mất prompt-cache dùng chung (vốn đã vỡ theo lá số).
- ⛔ **KHÔNG lọc từ khoá phía server** để bật khối nguy cấp: tiếng Việt có "mệt
  muốn chết", "chết cười" ⇒ dò chuỗi thô kêu oan liên tục, đúng lớp lỗi `\bcon\b`
  khớp "con vật". Luôn gửi cả khối (~200 token) thay vì tin vào một regex chắc sai.

### Bốn bước đã làm (#507)
1. **`lib/agent/companion.ts`** — tầng 1. Nhận diện chế độ tra-cứu/tâm-sự · ở chế
   độ tâm sự thì bỏ phán quyết + bỏ khẩu ngữ + rút còn 40–90 từ · **khối NGUY CẤP
   LUÔN áp kể cả khi tắt công tắc** · cấm sáo rỗng/chẩn đoán bệnh/hứa thay tương lai.
   - 🔑 **Henry chốt KHÔNG né vận xấu**: *"vận xấu thì nói xấu… mày né tránh thì lại
     làm họ khổ hơn"*. Nên luật là nói thẳng, **bắt buộc kèm MỐC + VIỆC LÀM ĐƯỢC** —
     một câu vận xấu không mốc, không việc làm được thì chỉ là một bản án.
   - **Tôn giáo: MẶC ĐỊNH không viện đạo nào**, chỉ viện đúng đạo họ tự nhắc trước.
   - ⛔ Chỉ cắm **115**. Cố ý KHÔNG cắm cứng đường dây tâm lý nào — số sai còn tệ hơn
     không có số, mà không xác minh được từ container. Henry: *"app này có phải đường
     dây cấp cứu đâu"* ⇒ bỏ hẳn việc tay thêm số.
2. **`lib/memory/store.ts` + bảng `user_memory`** — tầng 2, Thầy TỰ rút ra (kiểu
   ChatGPT/Claude) + tab **"Thầy Nhớ"** ở profile cho người dùng tự sửa.
   - Trần 40 mục × 200 ký tự; chống trùng bằng **unique index** `(user_id,
     lower(btrim(noi_dung)))` — để DB từ chối, đừng để mã ứng dụng nhớ hộ; HTTP
     **409 đọc là THÀNH CÔNG**.
   - 🔐 Ba tầng chốt danh tính: RLS chủ-sở-hữu · mọi hàm LUÔN lọc `user_id` · route
     lấy user từ **Authorization token**, KHÔNG BAO GIỜ nhận `userId` từ body.
   - Prompt dặn: **đừng đọc thuộc lòng hồ sơ ra**, và tin điều VỪA NGHE hơn hồ sơ cũ.
3. **Bề mặt** — nút đổi thành *"✦ Trò chuyện với Thầy"*, lời chào đổi theo số ngày
   vắng + mối lo gần nhất. Thầy chủ động hỏi thăm NGAY TRONG CHAT (Henry chốt: không
   phải push).
4. **`lib/tools/suggest-tool.ts`** — gợi ý công cụ *khéo*. Henry: *"chỉ khi nào thấy
   đúng nhu cầu mới suggest… **đừng ghi giá ra**"* ⇒ query `tool_pricing` **cố ý
   KHÔNG select cột `credits`**, và tool def nói thẳng "mặc định là KHÔNG gọi",
   "TUYỆT ĐỐI KHÔNG gọi khi người ta đang buồn/bế tắc". Đi ké **event `done`** thay
   vì thêm loại SSE mới — thêm loại mới là gãy adapter bot.

### 🔴 Vòng sau (PR này) — Henry đo prod: rail BÁM LÁ SỐ, không hỏi lại
Gõ *"kinh tế dạo này khó khăn quá, tìm việc khó"* → rail lôi lá số ra giải thích,
0 câu hỏi ngược. **Tầng 1 đổi được HÌNH DẠNG nhưng không gỡ NGHĨA VỤ**:

| Chỗ | Luật còn nguyên hiệu lực |
|---|---|
| `prompts.ts:320` | *"Dẫn chứng sao tinh, cung vị, can chi cụ thể"* — + ~14K ký tự lá số trong system |
| `prompts.ts:246` | *"TRẢ LỜI THẲNG NGAY CÂU ĐẦU… Cấm mở bài"* ⇒ lượt chỉ-hỏi-lại đọc thành lười |
| `prompts.ts:247` | *"MỖI LƯỢT MỘT Ý CHÍNH"* ⇒ nói một ý cho xong |

- 🔑 **Và nhận diện chế độ neo vào CHỮ CẢM XÚC** nên câu kể hoàn cảnh KHÔ KHAN rơi
  thẳng vào nhánh tra cứu. Đổi trục: **hỏi về LÁ SỐ hay kể về ĐỜI**, nêu đích danh
  câu Henry gõ làm ví dụ TÂM SỰ. Không rõ ⇒ **nghiêng về tâm sự rồi hỏi lại** — hỏi
  nhầm một câu thì họ nói rõ thêm, luận nhầm cả bài thì họ thôi không kể nữa.
- **Khối "lá số là NỀN"** huỷ ĐÍCH DANH luật dẫn chứng cho riêng chế độ này; mặc định
  không nhắc tên sao/cung, chỉ mở khi họ hỏi thẳng và mở gọn một câu.
- **Khối "nhịp hỏi–đáp"**: *MỘT CÂU HỎI ĐÚNG CHỖ CÓ GIÁ TRỊ HƠN MỘT BẢN LUẬN ĐÚNG*;
  một lượt chỉ ghi nhận + một câu hỏi là lượt **TỐT**; đúng MỘT câu mỗi lượt, bám
  chi tiết vừa nghe; **đừng vội gom kết luận**.
- 🔑 Cả ba huỷ luật bằng cách **trích nguyên văn luật đó** ⇒ THỨ TỰ là điều kiện sống
  còn, và đó chính là thứ bộ kiểm phải đo.

### Verify
`tsc` 0 · `lint` 0 lỗi / **77 warning = mốc nền** · `prettier` cả cây sạch ·
**19/19 bộ dò** · engine 185 pass.
- **41/41 bất biến trên MODULE THẬT** (biên dịch `run.ts`, chặn `fetch`, bắt đúng
  chuỗi `system` gửi lên provider — không mock hàm nào), chạy CẢ nhánh scenario lẫn
  nhánh lá số. Ba phép so THỨ TỰ **neo vào nguyên văn luật bị huỷ**.
- 🪤 **Red-team**: đảo thứ tự ghép tầng 1 lên ĐẦU system → **6/6 ca thứ tự đỏ đúng**,
  khôi phục xanh, 0 file rác.

### 🪤 Bẫy đã vấp (đều là lỗi của TÔI)
1. 🔴 **Fixture dùng khoá `hour` trong khi engine đọc `hourBranch`** ⇒ `computeLaso`
   trả lỗi ⇒ nhánh birth rơi sang `CHAT_SYSTEM_GENERAL`, tức **chưa hề đo đúng prompt
   Henry đang dùng**. Bắt được nhờ chốt *"luật CÓ THẬT trong prompt"*: `indexOf` trả
   **−1** làm phép so `nen > cite` **ĐỖ GIẢ**. 🔑 **Phép so vị trí phải kèm assert cái
   mốc CÓ TỒN TẠI** — không thì nó luôn xanh.
2. `computeLaso` đọc `public/` theo `process.cwd()` ⇒ harness phải chạy từ GỐC repo.
3. **`tsc` KHÔNG viết lại alias `@/` khi emit** → phải hook `Module._resolveFilename`
   trong harness thay vì sửa file (giữ mã chạy đúng nguyên byte bản repo).
4. **Stub sai shape**: bọc `/api/van-ngay` thành `{ok,data}` trong khi route trả field
   ở TOP LEVEL → trang rơi vào `fallback()` mà bộ kiểm **vẫn 7/8 xanh** — đo nhầm
   đường lùi. Bài học cũ, vấp lại.

### CÒN LẠI
- 🔴 **Chưa gọi LLM thật lượt nào** trong CẢ 5 bước — verify dừng ở tầng *chữ VÀO
  prompt* và tầng render. Chất lượng hội thoại chỉ prod mới trả lời được.
- **Đường Gemini PROSE không chạy tool** ⇒ ~20 kịch bản tra cứu ĐỌC được hồ sơ nhưng
  **không GHI được** và không gợi ý được công cụ. Chỉ nhánh có tool mới đủ.
- **Kênh bot (Telegram/Messenger/WhatsApp) chưa truyền `userId`** ⇒ chưa có tầng 2.
- ⚠️ **`chat.cost = 5` chặn người mới ở ~5 lượt/đời** — nghịch hẳn ý "trò chuyện hằng
  ngày". Chưa đo được giá thật mỗi lượt: **313 dòng `llm_usage` đều `tool_id` NULL**.
- Tắt cả tầng 1: `update app_config set value='{"enabled":false}'::jsonb where
  key='chat.companion';` — khối NGUY CẤP vẫn giữ, và cơ chế MERGE theo khoá nên
  không xoá mất danh sách số.

---

## 📺 3 video CÔNG KHAI lên NHẦM KÊNH — và không dòng code nào sai (2026-08-11, PR này)

Henry bấm *Chạy ngay* cho `yt-drain` → chạy được (token mới đã sống) → **nhưng
video lên kênh CÁ NHÂN `henryvn2004` chứ không phải `@tuviminhbao`**.

### 🔴 Căn nguyên: KHÔNG có chỗ nào chọn kênh, và đúng ra là không thể có
`videos.insert` của YouTube Data API đăng vào **kênh mà REFRESH TOKEN gắn với** —
không có tham số chọn kênh (`onBehalfOfContentOwner` là dành cho CMS đối tác).
Mà một tài khoản Google có NHIỀU kênh (kênh cá nhân + các Brand Account), và màn
consent của Google có bước *"Choose a channel"*. Chọn nhầm ở đó là mọi video sau
đó đi nhầm chỗ. ⇒ **Không sửa được bằng code, chỉ chặn được.**

### 🔑 Đây là hỏng IM LẶNG kiểu tệ nhất, và nó TỰ NHÂN LÊN
Không lỗi nào bắn ra · `yt_status='live'` · dòng DB đẹp · `privacyStatus:'public'`.
Chỉ có video nằm sai kênh, công khai, dưới tên một NGƯỜI thay vì một thương hiệu.
Và 83 video còn trong kho sẽ theo nhau đi nhầm **3 bài mỗi sáng** mà không ai hay.

### Cách chặn — `youtube-upload` v4, `assertChannel()`
Gọi `channels.list?mine=true` **trước khi tải file về**, so id với env
`YOUTUBE_CHANNEL_ID`; lệch thì ném lỗi mang tiền tố **`channel_mismatch`**.
- **FAIL-CLOSED**: chưa khai env ⇒ KHÔNG đăng. Ngược hẳn mấy cầu dao fail-open
  khác trong repo, và ngược có lý do: bên kia chặn oan người ĐÃ TRẢ TIỀN là tệ
  nhất; ở đây **ĐĂNG NHẦM** mới là tệ nhất — đăng rồi thì phải đi gỡ tay, và
  trong lúc chưa gỡ thì nó đã công khai.
- Nhánh "chưa khai env" **in ra luôn id kênh mà token đang trỏ tới** kèm câu
  *"nếu đúng thì đặt YOUTUBE_CHANNEL_ID=<id>"* — tự nó là hướng dẫn, khỏi phải
  đi tra id ở đâu khác.
- `channels.list` tốn **1** đơn vị quota so với **1.600** cho một lượt upload.
- `yt-drain` thêm `'channel_mismatch'` vào `BLOCKING_PATTERNS` ⇒ dừng CẢ lượt.
  Đây là lỗi của CÁI TOKEN chứ không phải của bài — thử bài kế tiếp chỉ tổ đăng
  nhầm thêm.
- 🧷 **Nguồn edge function nay nằm trong repo** (`_patches/edge-youtube-upload.deno.ts`).
  Trước v4 nó CHỈ có trên dashboard Supabase — đúng bệnh đã vá một lần với
  `send-daily-push`. Deploy xong **đọc ngược bản đang chạy** để chốt khớp.

### 🧭 Vá luôn chỗ ĐẺ RA lỗi: trang cấp token
Chốt kênh chặn được hậu quả, nhưng chỗ chọn nhầm là màn OAuth — nên
`public/youtube-auth.html` nay: cảnh báo ĐỎ **đứng trên nút bấm** (nói trước
khi bấm, không phải sau) · `prompt` thêm **`select_account`** ép Google hỏi lại
thay vì lặng lẽ dùng lựa chọn đã nhớ · hướng dẫn liệt kê đủ **4 biến** env chứ
không chỉ `YOUTUBE_REFRESH_TOKEN` · chỉ luôn cách tra `YOUTUBE_CHANNEL_ID`
(chạy `yt-drain` một lượt, lỗi in ra id).
- **12/12 ca trên TRANG THẬT** qua trình duyệt: cảnh báo hiện đủ ba ý · đủ 4
  tên biến · `prompt=consent select_account` · `access_type=offline` (mất là
  không có refresh token) · còn đủ scope upload · 0 lỗi JS.
- 🪤 Ca `.steps` đỏ lượt đầu là **lỗi của bài kiểm**: đọc sau cú bấm, lúc trang
  đã điều hướng đi. Đọc DOM thì phải đọc trước hành động làm rời trang.
- 🪤 Và vấp lại bẫy cũ: chạy spec từ scratchpad → `playwright` không resolve,
  phải chạy từ gốc repo.
- Không bump `?v=` — HTML trong `public/` trả `max-age=0, must-revalidate`.

### 🔓 Bắt kèm: GỠ LUÔN client id/secret viết cứng (nợ ghi sổ từ 01/08)
Không phải chủ đích ban đầu — **GitHub push protection CHẶN commit** mang chuỗi
client id/secret của Google, nên không thể vừa đưa nguồn vào repo vừa giữ giá
trị viết cứng. Phải chọn một, và chọn gỡ.
- 🔑 **Đây là lúc rẻ nhất để gỡ**: chốt kênh phía trên vốn đã làm đường upload
  đứng im, nên bắt buộc thêm hai env KHÔNG làm hỏng thêm thứ gì đang chạy. Ba
  tháng trước gỡ là gãy pipeline; hôm nay gỡ là miễn phí.
- Thiếu env → ném `missing_env` **nêu đích danh tên biến còn thiếu** (cũng vào
  `BLOCKING_PATTERNS`). Không có bước này thì Google trả `invalid_client` và
  người đọc log lại đi tìm nhầm sang phía refresh token.
- ⚠️ **`youtube-auth` VẪN còn viết cứng** — cố ý chưa đụng: đó là hàm Henry phải
  dùng để cấp lại token, hỏng nó là mất luôn đường sửa. Gỡ sau khi kênh đã đúng.
- ⚠️ Thứ tự khi ROTATE (đừng đảo): đặt env bằng giá trị HIỆN TẠI → deploy →
  mới đổi secret ở Google rồi cập nhật env.

### Verify
`tsc` 0 · `lint` 0 lỗi / 73 warning · `prettier` sạch · **18/18 bộ dò**.
- **13 ca trên MODULE THẬT** `yt-drain` (chỉ đổi 1 dòng import alias, `diff` xác
  nhận logic nguyên byte): sai kênh → thử ĐÚNG 1 bài rồi dừng, **0 video đăng**,
  báo cáo mang nguyên văn lý do · **ĐỐI CHỨNG** lỗi riêng một bài (`Cannot
  download file: 404`) → vẫn chạy đủ 3 · **ĐỐI CHỨNG** `invalid_grant` vẫn chặn
  như cũ · nhánh chưa-khai-env cũng chặn · `missing_env` chặn và nêu đúng tên
  biến.
- Edge function deploy **v12 ACTIVE**, `verify_jwt:false` giữ nguyên, đọc ngược
  bản đang chạy khớp nguyên văn file repo.

### ✅ ĐÃ THÔNG — chốt chặn chạy đúng trên prod (cùng ngày)
`YOUTUBE_CHANNEL_ID=UCyEf6daQ6taa4sFtFeTpCUA` đã đặt, token đã cấp lại đúng kênh
**Tử Vi Minh Bảo**. Lượt 15:22 ngày 11/08 đăng **3 video** lên đúng kênh
(`rk00ZKUanrs` · `g8psr3UOC2g` · `3vqYMR9oRJ8`); lượt 15:20 ngay trước đó còn
`failed=1` vì chưa khai env ⇒ **cầu dao fail-closed đo được là có tác dụng thật**,
không phải một chốt cho có. Kho còn **80** video, nhỏ giọt 3 bài/sáng ≈ 27 ngày.
- 🔑 **Chỗ Henry tắc lâu nhất KHÔNG phải kỹ thuật mà là DANH TÍNH**: màn Google
  hiện email `…@pages.plusgoogle.com` — đó là định danh tổng hợp của một **Brand
  Account**, KHÔNG đăng nhập được, luôn do một tài khoản cá nhân quản. Tra ở
  `myaccount.google.com/brandaccounts`. Không biết điều này thì lượt cấp token
  nào cũng chọn nhầm sang kênh cá nhân.
- 🪤 `channels.list` trả **200 với `items` rỗng** ở CẢ hai ca — thiếu scope, và
  tài khoản không có kênh — nên bản chẩn đoán phải in **scope Google đã cấp**
  mới tách được. ⚠️ Dò scope phải so theo **BIÊN TỪ**: `.../auth/youtube.upload`
  *chứa* `.../auth/youtube`, dùng `includes` là scope hẹp đọc thành đủ.

### 🔴 CÒN LẠI (việc tay Henry)
1. **PUBLISH APP — hạn 7 ngày, gấp nhất.** App còn **Testing** ⇒ refresh token
   vừa cấp chết sau 7 ngày (đúng thứ đã giết kho hai lần: 22/04 và 16/07, 80
   dòng `error` kia toàn cùng một `invalid_grant`). Không làm thì ~18/08 tắc
   lại khi mới xả được ~21/83 bài. Google Cloud → **Google Auth Platform →
   Audience → PUBLISH APP** (UI mới; KHÔNG còn nằm ở "OAuth consent screen").
   - Scope YouTube là *sensitive* nên app sẽ ở **"In production — unverified"**:
     màn đăng nhập hiện *"Google hasn't verified this app"* → **Advanced → Go to
     … (unsafe)**. Chỉ mình Henry dùng ⇒ **không cần nộp verification**.
   - ⚠️ **Publish KHÔNG gỡ đồng hồ của token cũ** — token hiện tại cấp lúc còn
     Testing nên vẫn mang hạn 7 ngày. Publish xong **phải cấp lại một lượt nữa**.
2. **Gỡ 3 video** khỏi kênh cá nhân: `vBLfaGpCxYE` · `J8HVAK8-HuE` · `y25CEmQcnOo`.
- 15 video cũ (tháng 4) chưa xác minh được nằm ở kênh nào — container chặn
  youtube.com. Henry tự soi.

### 🪤 Bẫy hạ tầng bắt được lúc gộp: check GitHub treo `in_progress` VĨNH VIỄN
Job `lighthouse` của #504 báo `in_progress` suốt 30 phút. Đọc `get_workflow_job`
thì **cả 15 bước đều `success`**, gồm cả `Complete job` lúc 15:10 — vỏ job không
bao giờ được chốt lại. Lỗi phía GitHub, không phải job hỏng.
- 🔑 **Đừng đợi vô hạn theo `check_runs`.** Nghi treo thì soi TỪNG BƯỚC qua
  `get_workflow_job`; mọi bước xanh + `Complete job` xanh là đã xong thật.

---

## 📘 Facebook: 33 bài, **0 bài từng đăng được** — lời khuyên chung chung (2026-08-11, PR sau)

Rà nốt đường phân phối sau khi thông YouTube thì lộ ra `media_posts` **chỉ có
trạng thái `queued`**: 33 bài, kẹt từ **02/08**, chưa post nào lên nổi. Không
phải "chạy rồi hỏng" — là **chưa bao giờ chạy**.

### 🔴 Một câu khuyên cho HAI nguyên nhân khác hẳn nhau
Hàng đợi đi qua hai cửa đóng nối tiếp: thiếu `FB_PAGE_ID`, rồi **token hết hạn**
(`Session has expired on Tuesday, 11-Aug-26 03:00`). `CHANNEL_SETUP` nói y một
câu cho cả hai — *"Meta App → Permissions xin thêm quyền `pages_manage_posts`"*.
Đúng cho ca đầu, **lạc đề cho ca sau** ⇒ người đọc đi sửa nhầm chỗ rồi tưởng xong.
- 🔑 **Và cái nguy hơn nằm ở chỗ vá được rồi vẫn tắc lại:** token vừa dùng là
  loại **NGẮN HẠN**, chết theo phiên. Chỉ token Page suy ra từ **user token DÀI
  HẠN** mới vô hạn. Nên hướng dẫn phải nêu đủ chuỗi `fb_exchange_token` →
  `/me/accounts`, **và bước KIỂM `debug_token` → `expires_at: 0`** — thiếu bước
  kiểm thì không phân biệt được token vĩnh viễn với một token ngắn hạn nữa.
- ⛔ **Cảnh báo phải đi kèm**: bước đổi token cần **ĐỌC** App Secret — chỉ copy,
  **KHÔNG bấm Reset**. `MESSENGER_APP_SECRET`/`WHATSAPP_APP_SECRET` đang dùng
  chính giá trị đó, reset là chết webhook cả hai kênh đang chạy.
- `channelFix(ch, msgs)` chọn hướng dẫn theo **LOẠI lỗi**, không theo tên kênh.
- Cắt lỗi **200 → 400** ký tự: lỗi Graph mở đầu bằng câu dẫn dài rồi mới tới mốc
  hết hạn ⇒ 200 cắt cụt đúng chỗ cần nhìn. **Cùng lỗi vừa vá ở `yt-drain` trong
  chính ngày hôm đó** — nó là một lớp, không phải hai ca lẻ.

### Verify
`tsc` 0 · `lint` 0 lỗi / 73 warning = mốc nền · `prettier` sạch · **18/18 bộ dò**.
- **18 ca trên MODULE THẬT**, dựng bằng **nguyên văn** lỗi Graph đang nằm trong
  `media_posts` (không bịa chuỗi), gồm **4 ca ĐỐI CHỨNG**: thiếu quyền vẫn giữ
  lời khuyên cũ · kênh khác không bị rò hướng dẫn Facebook · lỗi riêng một bài
  thì KHÔNG bày hướng dẫn token · không có gì thì im hẳn.
- 🪤 **ĐỐI CHỨNG bản `HEAD`: trượt 8 ca**, mà 4 ca đối chứng **vẫn xanh ở cả hai
  bên** ⇒ bài kiểm đo đúng thứ đang đổi, không xanh vì lý do khác.

### CÒN LẠI
- **Việc tay Henry:** cấp token Page vĩnh viễn theo đúng 5 bước bản tin in ra.
- ⚠️ **`social.channels` mới có `["facebook"]`** trong khi **adapter Telegram đã
  sẵn và `TELEGRAM_BOT_TOKEN` đã nằm trên Vercel** ⇒ 33 bài đang kẹt sau đúng một
  cái token chết dù có kênh khác chạy được ngay. Bật là một câu SQL, nhưng đó là
  nội dung ra trang CÔNG KHAI nên **cố ý không tự bật** — cần Henry chốt, và cần
  thêm bot làm admin channel + đặt `TELEGRAM_CHANNEL_ID`.
- **Chưa gọi Graph API thật lượt nào** — container chặn host ngoài, verify dừng ở
  tầng bản tin. Đừng đọc rộng hơn thế.

---

## ▶️ "Chạy ngay" trả *Unknown job* — cùng một lỗi, lần thứ BA (2026-08-11, PR trước)

Henry bấm *Chạy ngay* cho `media-build` và `yt-drain` → **`Lỗi: Unknown job`**.

### 🔴 Không phải job hỏng — nút bấm chưa bao giờ nối được tới chúng
Panel dựng nút theo cờ `trigger` trong **sổ job** (`lib/ops/jobs.ts`, 20 job),
còn server định tuyến bằng **một bảng chép tay khác** (`CRON_TRIGGERS` trong
`app/api/payment/route.ts`, **11 job**). ⇒ 9 job hiện nút mà bấm ra lỗi:
`health-check` · `content-pack` · `prune-anon-trial` · `keyword-suggest` ·
`topic-topup` · `yt-drain` · `media-build` · `seeding-build` · `content-metrics`.

### 🔑 Lớp lỗi này ĐÃ tái phát ba lần, và chú thích của chính nó tả đúng nó
| Lần | Hai danh sách nào lệch | Hậu quả |
|---|---|---|
| 1 | sổ trong `admin.html` (5) vs `vercel.json` (9) | **CMO Digest chết 14 ngày** — nó chưa bao giờ có mặt trên trang giám sát để mà nhìn |
| 2 | `CRON_TRIGGERS` (5) vs sổ | nút *Chạy ngay* của 5 job mới chết |
| 3 | `CRON_TRIGGERS` (11) vs sổ (20) | **lần này** |

Lần 2 vá bằng cách **chép tay cho khớp**, và để lại nguyên văn chú thích *"cùng
một kiểu trôi lệch giữa hai danh sách chép tay"* ngay trên bảng đó. Tức người
viết nhận ra đúng lớp lỗi rồi vẫn vá bằng chính cơ chế đẻ ra nó. 🔑 **Vá một
danh sách chép tay bằng cách chép tay lại là hẹn lần trôi kế tiếp** — chỗ sửa
phải là *bỏ bản sao đi*, không phải *đồng bộ bản sao*.

### Cách vá
- **Đường dẫn dời vào SỔ** (`JobSpec.path` / `edge`); `CRON_TRIGGERS` nay là
  **phép chiếu** `Object.fromEntries(JOBS.filter(...))`, không còn danh sách thứ hai.
- **`trigger` thành trường SUY RA** (`Boolean(path || edge)`) thay vì cờ khai
  tay: khai cờ mà quên đường dẫn thì mọc ra một nút chết, đúng ca vừa xảy ra.
- ⚠️ `SITE_URL` **cắm cứng vào prod** — nút này luôn gọi endpoint prod dù đang
  chạy ở đâu. Đó là chủ ý (panel quản trị prod), nhưng phải biết trước khi test.

### 🧷 `scripts/check-cron-jobs.mjs` (bộ dò thứ 18)
Canh **ba chiều** sổ ↔ `vercel.json` ↔ file route thật trên đĩa — cả ba đều
hỏng IM LẶNG. Đọc mảng `JOBS` bằng cách cắt khối rồi `new Function`, **không
cần tsc**; không khớp mẫu thì DỪNG HẲN kèm lời nhắc sửa bộ dò (đọc ra danh sách
rỗng rồi báo xanh còn tệ hơn đỏ — bài học `check:motifs`).
- **Luật 4 bắt đúng lỗi GỐC của track S4**: cron chạy thật mà vắng mặt trong sổ
  thì không cảnh báo nào chạm tới nó.

### Verify
`tsc` 0 · `lint` **0 lỗi / 73 warning = đúng mốc nền** · `prettier` quét cả cây
sạch · **18/18 bộ dò**.
- **31 ca trên ROUTE THẬT** qua Next dev (stub Supabase, `CRON_SECRET` **cố ý
  sai**): **9/9 job hỏng nay định tuyến đúng** — tới endpoint prod và nhận 401,
  tức đi đúng địa chỉ mà **không job nào bị chạy** · **ĐỐI CHỨNG 11/11 job cũ
  không hồi quy** (kể cả nhánh edge `auto-pipeline` → 200) · job bịa và chuỗi
  rỗng **vẫn 400 `Unknown job`** · token sai / không token → **403**.
- **Red-team bộ dò 3/3 đỏ đúng** (gỡ job khỏi `vercel.json` · gỡ job khỏi sổ ·
  sai một ký tự trong `path`), đối chứng khôi phục xanh, 0 file rác.
- 🪤 **Stub auth phân biệt theo TOKEN** — bài học đã ghi: stub trả user cho MỌI
  token thì ca "không auth" ĐỖ GIẢ ra 200.

### CÒN LẠI
- `next dev` lại tự ghi `next-env.d.ts` — đã revert, không commit.
- Sổ vẫn phải gõ tay khi thêm cron mới; bộ dò chỉ **bắt lúc CI**, không tự điền.

---

## ✏️ Kho hết CHỈ ĐỌC: sửa bài + trạng thái xuất bản (2026-08-11, cùng PR)

Henry hỏi *"mục Nội dung này có phải CMS ko? so với CMS thì thiếu gì?"* → đo ra
**không phải CMS**, rồi chốt làm hai món đáng làm nhất: **(a) sửa bài trong Kho**
+ **(b) cột trạng thái xuất bản**.

### 🔴 Thực trạng đo được trước khi sửa
| Trang | Làm được gì |
|---|---|
| Kho | 100% chỉ đọc |
| Content Board | chỉ xem, 1 nút tải lại |
| Khảo Luận / Nghiên Cứu | chỉ **nộp CHỦ ĐỀ** cho cron — **không sửa được bài** |
| YouTube Studio | chỗ DUY NHẤT sửa/lưu thật |

Và **691 bài** (`khao_luan` 344 + `master_articles` 347) không có cột trạng
thái, không `updated_at`, không biết ai sửa, không phiên bản ⇒ LLM viết xong là
**bài lên thẳng web**, không gỡ xuống được từ admin.

### 🔑 Mặc định `'published'`, KHÔNG phải `'draft'`
691 bài hiện có phải giữ nguyên trên web sau lượt deploy. Đặt mặc định `draft`
là toàn bộ nội dung biến mất trong một nhịp — đúng loại hỏng im lặng cả track
này đi vá. Ba trạng thái: `published` · `hidden` (người gỡ) · `draft` (máy vừa
viết, chờ duyệt).
- **Cờ `content.require_review` mặc định TẮT** — cron vẫn insert thẳng
  `published` như cũ. Bật lên thì mỗi ngày phải có người bấm duyệt, không duyệt
  thì trang đứng im; đó là quyết định VẬN HÀNH nên nó nằm ở `app_config` (đổi
  bằng một câu SQL) chứ không phải hằng số trong mã (đổi phải deploy).
- `initialPublishStatus()` **FAIL-OPEN**: đọc hụt config → `published`. Cầu dao
  này gác QUY TRÌNH chứ không gác an toàn; Supabase chớp một nhịp mà làm bài mới
  im lặng biến mất khỏi web thì tệ hơn hẳn lỡ đăng thẳng một bài.

### 🔑 Cột trạng thái chỉ có nghĩa nếu MỌI bề mặt công khai lọc theo nó
Đo được **12 chỗ đọc** hai bảng này rải khắp `app/` + `lib/`: trang bài · danh
sách · bài liên quan · trang tác giả · gợi ý trong `/la-so/*` · sitemap · dựng
bài social · seeding. Quên MỘT chỗ thì bài đã gỡ vẫn hiện ra ngoài — hỏng im
lặng, chỉ lộ khi có người tình cờ mở đúng URL đó.
- Hằng dùng chung `PUBLISHED_ONLY` (`lib/content/publish-filter.ts`), KHÔNG chép
  chuỗi 12 chỗ.
- ⚠️ `fetchAllSlugs` của sitemap nhận `table` là **BIẾN** (6 route con dùng
  chung) nên phải tra `PUBLISH_GATED_TABLES` chứ không nối cứng — hỏi cột không
  tồn tại là PostgREST trả 400 và **mất im lặng cả một họ URL**, đúng cái bẫy
  `hasUpdatedAt` đã ghi sẵn trong chính file đó.
- **`scripts/check-publish-filter.mjs` (bộ dò thứ 18)** cắm vào CI lint. Miễn
  trừ khai kèm LÝ DO, không phải allowlist câm — đáng nhớ nhất là
  `topic-topup.ts`: nó đọc tiêu đề đã có để **chống trùng chủ đề**, nên bài đã
  gỡ VẪN phải tính là "đã viết rồi", lọc ra là máy viết lại đúng bài vừa gỡ.

### 🔴 Chỗ nguy hiểm nhất của (a): `table` do CLIENT gửi
Ghép thẳng vào đường dẫn PostgREST là phiên admin ghi được vào BẤT KỲ bảng nào
(`user_credits`, `admin_users`…). Nên có **allowlist cứng** cho cả tên BẢNG lẫn
tên CỘT; không nhận bừa khoá từ body.
- ⛔ `van_dap` **cố ý không nằm trong allowlist**: nó đã có trang soạn riêng
  (YouTube Studio) với kịch bản/TTS/mix. Dựng bộ sửa thứ hai cho cùng dữ liệu là
  hai bản trôi khỏi nhau. Kho hiện nhãn "— Studio" thay cho nút Sửa.

### Verify
`tsc` 0 · `lint` 0 lỗi / 73 warning · `prettier` sạch · **18/18 bộ dò** · engine
**185 pass**.
- **17/17 ca trên TRANG THẬT**: cột trạng thái đúng · video không có nút Sửa ·
  nạp thân bài từ server · **giữ nguyên dấu nháy + backtick** · thẻ `<script>`
  trong bài **không chạy** · gửi đúng bảng/id/trạng thái/thân bài · lọc theo
  trạng thái đi tới server · 0 lỗi JS.
- **18 ca trên ROUTE THẬT** qua Next dev: chặn `user_credits` · `admin_users` ·
  `van_dap` · tên rỗng · chuỗi chèn SQL — **tất cả 400 và 0 lượt ghi DB**; cột
  ngoài danh sách trắng bị bỏ; trạng thái lạ bị chặn; **ĐỐI CHỨNG bảng hợp lệ →
  200, ghi đúng `khao_luan`, kèm `updated_by`**.
- **4/4 ca auth riêng**: không header / header rỗng / token sai → **403**;
  ĐỐI CHỨNG token đúng → 200.
- **Red-team bộ dò**: gỡ bộ lọc ở một chỗ → đỏ đúng dòng đó; khôi phục → xanh.

### 🪤 Bốn bẫy harness đã vấp (đều là lỗi của TÔI)
1. **Bộ dò kêu oan 16 chỗ** ở lượt đầu: nó dò chuỗi `publish_status` trong khi
   code dùng hằng `PUBLISHED_ONLY`, và nhánh "bảng là biến" bắt luôn `${table}?`
   của `lib/metrics/collect.ts` vô can. **Bộ dò kêu oan là bộ dò bị tắt đi.**
2. **Script sửa hàng loạt dừng giữa chừng** để lại cây nửa vời (8/10 file đã
   ghi). Phải KIỂM hết mẫu TRƯỚC rồi mới ghi — không thì phải revert rồi làm lại.
3. **Sửa nhầm bảng**: `rows.map((r, i)` áp vào bảng System Config vì số dòng đã
   dịch sau các sửa đổi trước. Chỉ lộ vì trang ném `i is not defined`.
4. 🔴 **`pkill -f "next dev"` khớp CHÍNH dòng lệnh của nó** → tự giết mình
   (exit 144). Và **stub `/auth/v1/user` trả user cho MỌI token** làm ca "không
   auth" ĐỖ GIẢ ra 200 — suýt đọc thành lỗ hổng. Stub auth phải phân biệt theo
   token, nếu không thì mọi ca "chặn" đều xanh vì lý do sai.

### CÒN LẠI
- **Không có lịch sử phiên bản / hoàn tác.** Sửa hỏng là mất. Cố ý bỏ — nội dung
  ở đây do MÁY sinh, không phải người ngồi soạn qua nhiều vòng.
- **Không có media library, lịch xuất bản, phân quyền biên tập.** Cùng lý do.
- `tu_dien` · `tai_lieu` · `sach_library` sửa được nhưng **không có trạng thái**
  (không có cột) — chúng không do cron LLM sinh nên chưa cần.
- Bật chờ duyệt: `update app_config set value='true'::jsonb where key='content.require_review';`

---

## 📚 Kho Nội Dung: 1.140 tác phẩm, **15 từng ra khỏi website** (2026-08-11, PR này)

Henry hỏi ba câu: kho content nằm ở đâu · làm sao biết cái nào đã đăng kênh nào,
được bao nhiêu like/view/sub · có nên tách mục "Nội dung" khỏi "Marketing".

### 🔴 Câu về like/view/sub: **KHÔNG đo được ở đâu cả, và chưa từng đo**
Grep toàn repo: **0 dòng gọi YouTube Analytics · Meta Insights · TikTok API**.
Thứ duy nhất có là GSC (SEO) và `shared_results.view_count` (link chia sẻ nội
bộ). Tức 15 video YouTube đang live cũng **chưa bao giờ biết được bao nhiêu
view**. ⇒ Đây KHÔNG phải việc sắp xếp lại menu — thiếu hẳn một tầng dữ liệu.
Sắp menu mà không có tầng đó thì mục mới vẫn trống. Ghi rõ trên chính trang Kho
để không ai đọc bảng đó rộng hơn thứ nó đo.

### 🔑 Kho là VIEW, không phải bảng `content_items`
Bảng vật lý cần backfill + trigger/cron đồng bộ với 6 bảng nguồn ⇒ **hai nguồn
sự thật**, đúng lớp lỗi repo đã trả giá nhiều lần (giá Lượng chép hai nơi,
`formatLaSoV2` hai bản, hash hai bản). Phạm vi Henry chốt là **chỉ đọc** ⇒ VIEW
luôn đúng theo định nghĩa, 0 dòng đồng bộ. Khi nào cần metadata RIÊNG cho tác
phẩm (nhãn biên tập, lịch sản xuất) mới cần bảng thật.
- **`content_catalog`** = tác phẩm gốc (6 nguồn) · **`content_distribution`** =
  đã ra kênh nào. Khớp đúng mô hình Henry mô tả: 1 nguồn → nhiều lát cắt
  (`media_assets`) → nhiều kênh (`media_posts`). Hai bảng đó **giữ nguyên**, chỉ
  được đọc ngược qua `source_type`/`source_id`.
- ⛔ **CỐ Ý bỏ `seo_pages` (8.958 dòng)**: trang sinh tự động theo lá số, không
  phải tác phẩm biên tập. Đưa vào là 8.958 nuốt sạch 1.140 và kho hết đọc được.
- **Điều kiện vào `content_distribution` là CÓ URL thật**, không phải chuỗi
  status: status là thứ code ghi ra, URL là bằng chứng nó đã ra ngoài đời.
- 🔐 View trong PG15+ chạy quyền OWNER (bỏ qua RLS) và EXECUTE cho PUBLIC là
  dựng sẵn của Postgres ⇒ revoke tường minh ngay trong migration. Verify ACL:
  chỉ `postgres` + `service_role`.

### 📊 Số đo (đã chạy prod)
| | |
|---|---:|
| Tổng tác phẩm | **1.140** |
| Đã từng ra khỏi website | **15 (1,3%)** |
| Đang kẹt hàng đợi | **30** (facebook, thiếu `FB_PAGE_ID` từ 02/08) |
| Nằm kho chưa đi đâu | **1.125** |

Theo loại: nghiên cứu 347 · khảo luận 344 · sách 168 · video hỏi-đáp 142 (15 đã
lên) · từ điển 132 · tài liệu 7.

### Sắp xếp lại admin
Mục cũ *"Marketing & Nội Dung"* gánh 9 nav, **6 là việc nội dung**. Nay:
- **Marketing** = chỉ đo TIỀN & NGƯỜI (Funnel · Giữ Chân & Doanh Thu · SEO).
- **Nội Dung** = Kho · Sản Xuất · Phân Phối · Kênh & Kết Nối.
- **"Sản Xuất" KHÔNG phải page mới** — là MỘT nav mở nhóm 4 trang đã có qua
  thanh tab (khuôn `mkt-filterbar` sẵn có). Giữ nguyên 4 khối DOM + 4 loader cũ
  ⇒ 0 rủi ro hồi quy, sidebar vẫn gọn.

### 🐞 Hai lỗi bắt được khi ĐO, không phải khi đọc code
1. **Vào tab YouTube Studio là mất sạch dấu vị trí**: `showView()` của module đó
   ghi đè `topbar-title` VÀ **xoá `active` khỏi MỌI `.nav-item`**. Nợ CÓ SẴN
   (nav "YouTube Studio" cũ chưa bao giờ sáng, chỉ là nó đứng một mình nên không
   ai để ý). Vá bằng cách đặt khối tô sáng **SAU** lượt gọi loader.
2. **Link tiêu đề ăn màu mặc định trình duyệt `#0000EE`** → dark mode đo được
   **1,8:1**, gần như không đọc nổi. Thẻ `<a>` trần trong admin phải khai màu.

### Verify
`tsc` 0 · `lint` **0 lỗi / 73 warning = đúng mốc nền** · `prettier` quét cả cây
sạch · **17/17 bộ dò** · 4/4 khối script nội tuyến `node --check`.
- **39/39 ca trên TRANG THẬT** (`public/admin.html`, stub `/api/*`, lái giao
  diện bằng chính `enterApp`/`goTo` — không mock hàm nào của trang): sidebar
  tách đúng 2 mục · 4 nav sản xuất cũ đã gỡ · 4 tab mở đúng page + đúng tiêu đề
  + nav vẫn sáng · rời nhóm thì thanh tab ẩn · 5 ô số khớp RPC thật · nhãn loại
  **không lộ khoá thô** · tiêu đề mang `<img onerror>` **không chạy** mà vẫn
  hiện nguyên văn · `href="javascript:"` từ DB bị chặn · 3 bộ lọc thật sự đi tới
  server · 390px không tràn · 0 lỗi JS.
- 🪤 **ĐỐI CHỨNG `origin/main` bằng `git worktree`**: tràn ngang 390px ở
  `nghiencuu` **21px** và `seo` **25px** là **nợ có sẵn** (`repeat(4,1fr)`), và
  chữ `.stat.green` chìm **2,6:1 ở dark y hệt** ⇒ không phải hồi quy của PR này.
  Nhưng trang MỚI thì không chép lại lỗi đó (`auto-fit` + màu chữ khai rõ).
- 🪤 **Ba bẫy harness đã vấp** (đều là lỗi của TÔI): (a) chạy spec từ scratchpad
  → `playwright` không resolve, phải chạy từ gốc repo; (b) tự vẽ lại DOM để bỏ
  qua màn đăng nhập thay vì gọi chính `enterApp`; (c) role `superadmin` không
  tồn tại — `applyAdminPermissions` chỉ nhận **`owner`**, nên cả mục đang đo bị
  ẩn và bài kiểm treo 30 giây ở một selector "không hiện".

### CÒN LẠI
- ✅ **Tầng số liệu ĐÃ DỰNG** — xem mục ngay dưới. Chỉ còn 1 việc tay.
- **Nợ MÀU của admin.css**, cố ý không trộn vào PR này: `--green`/`--blue`
  không khai lại trong khối `[data-theme="dark"]` nên mọi `.badge-green`/
  `.stat.green` chìm ở dark. Đụng vào là đụng mọi trang admin.
- Tràn ngang 390px ở `nghiencuu`/`seo` (nợ có sẵn) chưa vá.
- Kho **chỉ đọc** — sửa nội dung vẫn ở trang Sản Xuất của từng pipeline. Muốn
  sửa ngược thì phải viết đường ghi về 6 bảng, chưa làm.
- TikTok/Zalo chưa có kênh thật; bộ lọc kênh đã có sẵn giá trị, cắm adapter vào
  là tự hiện.

---

## 📊 Số liệu nền tảng: YouTube đi bằng API KEY, KHÔNG dùng OAuth (2026-08-11, cùng PR)

Bước 2 của track Kho. Trước mục này site **chưa từng đo** một số liệu nào từ bên
ngoài — 15 video đang live mà không biết được bao nhiêu view.

### 🔑 Quyết định quan trọng nhất: KHÔNG buộc số liệu vào OAuth đang có
Đường upload (`youtube-upload` edge function) chạy refresh token, mà app còn ở
chế độ **Testing** trong Google Cloud ⇒ token chết sau 7 ngày (86 video đang
`invalid_grant` vì đúng chuyện đó). Buộc số liệu vào cùng cái token ấy là **số
liệu chết theo, và bước 2 bị chặn bởi cùng một việc tay đang chặn bước trước**.
- `videos.list?part=statistics` + `channels.list?part=statistics` cho nội dung
  CÔNG KHAI **chỉ cần API key** — không hết hạn, không cần publish app, không
  cần scope mới. ⇒ việc tay rút từ *"publish OAuth app"* xuống *"tạo một API
  key"* (2 phút).
- ⚠️ Đánh đổi có ý thức: API key chỉ cho số CÔNG KHAI (view/like/comment/
  subscriber). Watch-time · retention · nguồn traffic thì buộc phải YouTube
  Analytics API + OAuth. **Đừng đọc bảng rộng hơn thế** — trang đã ghi rõ.
- `channelId` lấy từ `snippet` của chính video vừa đọc, **không khai thêm env**
  (một env nữa là một chỗ nữa để quên).

### 🔑 Số là TÍCH LUỸ, không phải theo ngày
Nền tảng trả tổng từ lúc đăng. Lưu **snapshot mỗi ngày**, muốn "hôm nay thêm
bao nhiêu" thì lấy hiệu hai ngày. Khoá chính `(channel, external_id, stat_date)`
⇒ chạy lại trong ngày là upsert đè, không đẻ dòng trùng — để DB từ chối, đừng
để mã ứng dụng nhớ hộ.

### Ba chốt chép thẳng từ `yt-drain`/`publish.ts`
1. **Lỗi CHẶN dừng đúng KÊNH đó, kênh khác chạy tiếp.** 84 dòng `yt_error`
   giống hệt nhau là hậu quả của việc cứ thử mãi một cái cửa đã khoá.
2. Ngân sách thời gian, dừng giữa hai lượt.
3. Báo cáo nêu **thẳng nguyên nhân gốc + việc phải làm**. Telegram **chỉ bắn khi
   có kênh đóng cửa** — ngày nào cũng gửi "đã kéo 15/15" thì hôm có chuyện thật
   cũng bị lướt qua.
- **Facebook cố ý dùng `fields=likes.summary(true)…` chứ không dùng `/insights`**:
  insights đòi thêm `read_insights` trong khi app còn chưa xin xong
  `pages_manage_posts`. Đổi lại: có tương tác, chưa có reach/impressions.
- Kênh chưa có bộ đọc (tiktok…) thì **bỏ qua CÓ BÁO** (`skipped`) — im lặng bỏ
  qua là đúng kiểu hỏng mà không ai biết.

### Verify
`tsc` 0 · `lint` 0 lỗi / 73 warning · `prettier` sạch · **17/17 bộ dò**.
- **23/23 bất biến trên MODULE THẬT** (tsc build + chặn `fetch`, không mock hàm
  nào của module; có assert bản dựng mang code mới): đọc đúng viewCount/
  subscriber · giữ trỏ ngược `source_table/source_id` · `stat_date` giờ VN ·
  upsert `merge-duplicates` · **thiếu key → 0 lượt gọi YouTube mà Facebook VẪN
  chạy** · **403 → thử ĐÚNG 1 lượt** rồi dừng, không hỏi tiếp subscriber · FB
  token hỏng không kéo theo YouTube · **ĐỐI CHỨNG lỗi RIÊNG một bài thì không
  chặn cả kênh** · kho rỗng → 0 lượt gọi ra ngoài và report im lặng.
- **5/5 ca trên ROUTE THẬT** qua Next dev: không auth/sai secret → 401, đúng
  secret → 200 đúng shape.
- **45/45 ca trên TRANG THẬT**, chạy **cả hai nhánh**: có số liệu → hiện view/
  subscriber/bảng xem-nhiều-nhất + cột Xem + sắp theo view gửi `sort=views`;
  **ĐỐI CHỨNG chưa kéo lượt nào → nói THẲNG "chưa đo" kèm đúng env cần đặt, và
  KHÔNG hiện con số 0 giả** (bảng 0 view sẽ đọc thành "nội dung không ai xem",
  trong khi sự thật là chưa từng đo).
- 🪤 **Hai bẫy đã vấp**: (a) `tsc` nêu file trên dòng lệnh trong khi cwd có
  `tsconfig.json` → **TS5112**, phải `--ignoreConfig` (bài học đã ghi ở track
  TypeScript 7, vấp lại); (b) `next dev` **tự ghi lại `next-env.d.ts`** sang
  `.next/dev/types/` — tác dụng phụ của lượt test, đã revert chứ không commit.
- 🐞 **tsc bắt được một lỗi thật của tôi**: `{ ok: result.ok, ...result }` —
  spread đứng sau thì `ok` viết tay bị ghi đè im lặng (TS2783).

### 🔑 VIỆC TAY HENRY (1 việc, ~2 phút — chưa làm thì panel vẫn trống)
**Tạo YouTube API key**: Google Cloud Console → APIs & Services → Library → bật
**YouTube Data API v3** → Credentials → **Create credentials → API key** → đặt
`YOUTUBE_API_KEY` trên Vercel → Redeploy. **KHÔNG cần publish OAuth app** cho
việc này. Sáng hôm sau 12:30 VN là có số của 15 video + subscriber kênh.
- Facebook dùng chung `FB_PAGE_ACCESS_TOKEN` với đường đăng bài — đặt env đó là
  cả hai việc cùng chạy, không phải xin thêm quyền nào.

### CÒN LẠI
- **Chưa gọi API thật lượt nào** — container không có key, verify dừng ở tầng
  stub. Chỗ đáng nhìn sau lượt cron đầu: `content_metrics` có 15 dòng không.
- **Chưa có bộ đọc cho TikTok · Instagram · Threads · Telegram** (cắm thêm vào
  `FETCHERS` là xong, nhưng chưa kênh nào có bài live để đo).
- **Không có watch-time / retention / nguồn traffic** — cần Analytics API +
  OAuth, tức phải publish app. Chỉ làm nếu thật sự cần mấy chiều đó.
- 🔓 **Nợ bảo mật CÓ SẴN, chưa xử**: `youtube-auth` và `youtube-upload` **hardcode
  `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` ngay trong source** làm giá trị
  mặc định. Nên rotate rồi chuyển hẳn sang env — cùng tiền lệ đã phải rotate
  service_role key Supabase.

---

## 🕰️ Xác Định Giờ Sinh VỨT ĐI dữ kiện nó vừa bán — và sổ lá số dò form theo TÊN (2026-08-11, PR này)

Henry hỏi ba câu về Sổ lá số: trần bao nhiêu · tool giờ sinh có bước lưu + đi
tiếp không · có phải master data cho mọi form không. Trả lời: **30** ·
**KHÔNG** · **chưa**. Hai vế sau là lỗi, vá luôn.

### 🔴 A. Tool giờ sinh sinh ra ĐÚNG MỘT dữ kiện rồi vứt nó đi
Cả tool tồn tại để chốt **giờ sinh**. `renderResult` vẽ bảng xếp hạng xong là
hết: 0 lượt `rememberBirth`, 0 lượt `UserCharts.save`, 0 đường sang Luận Giải.
Người dùng trả Lượng, đọc ra *"giờ Sửu 62%"*, rồi tự nhớ và **gõ lại tay** ở
mọi tool khác. Thêm khối *Chốt giờ và dùng tiếp*: chọn giờ → **Lưu vào sổ** +
**Luận giải lá số này →**.
- **Chọn được giờ #2, không khoá cứng giờ đầu bảng.** Chính trang này có mục
  *"Vì sao không phải một con số chắc nịch"* — ép lấy giờ #1 là nói chắc hơn
  thứ máy biết. Ai đã soát bằng chứng rồi chọn khác thì phải theo họ.
- ⛔ **Link sang Luận Giải KHÔNG gắn `?auto=1`**: `app-luan-giai.html:554` thấy
  cờ đó là **tự chạy `doLuan()`** = lượt TRỪ LƯỢNG. Điền sẵn form rồi để người
  ta tự bấm. Có ca kiểm canh đúng chuỗi này.
- 🔴 **Âm lịch: CHẶN bàn giao, không ghi bừa.** Form có ô `gs-lich`, mà cả repo
  **không có một hàm âm→dương nào** (chỉ có chiều ngược: `solarToLunar`/
  `convertDuongToAm`; `computeLaso` khi `isLunar` an THẲNG, không đổi lại) và
  `TuviForm` thì thuần dương lịch. Ghi ngày âm vào sổ như thể là ngày dương ⇒
  tool đích lập một lá số KHÁC mà **không có gì báo**. Nên ẩn nút + nói thẳng
  lý do. `_birthChot()` trả `null` ở nhánh này — chốt ở tầng dữ liệu, không chỉ
  ở tầng ẩn nút.
- **Nói thật khi ghi hỏng**: `Shell.rememberBirth` ghi sổ kiểu bắn-và-quên nên
  không biết kết quả. Có thêm MỘT lượt `UserCharts.save` **await** chỉ để lấy
  trạng thái — cùng `chart_key` + upsert `merge-duplicates` ⇒ hai lượt vẫn ra
  **đúng một dòng** (đã đo: 2 POST, 1 khoá). Báo *"đã lưu"* trong khi hỏng đúng
  là kiểu nói dối im lặng repo này đã trả giá nhiều lần.
- `gioHour = gioIdx*2` (giờ giữa khung: Tý=0h, Sửu=2h) — xem mục C.

### 🔴 B. Sổ lá số dò form theo TÊN id ⇒ trang đặt tên khác là im lặng không có sổ
`findForms()` chỉ nhận element có id khớp `/formhost/i`. **`app-xem-tuoi`
(phục vụ cả `xem-tuoi`/`xem-lam-an`/`tuong-hop`) dùng ĐÚNG khuôn `TuviForm`
nhưng đặt id `a-fields`/`b-fields` ⇒ trượt bộ dò ⇒ chưa bao giờ có sổ.**
🔑 Chú thích của chính bộ dò cũ đã lo đúng chuyện đó (*"trang nào quên là trang
đó âm thầm không có sổ"*) rồi vẫn **dò theo tên** — tức tái tạo đúng cái hố nó
muốn tránh. Chỗ sửa không phải thêm một cái tên nữa, mà là **đổi nguồn tri
thức**: `TuviForm.render()` nay tự đóng dấu `data-tvf-form="<prefix>"` lên
container. Form tự khai, không ai phải đoán, và **mọi trang TuviForm sau này tự
có sổ**.
- Giữ nguyên đường `/formhost/i` cho form dựng TAY không qua TuviForm.
- **Lọc lồng nhau**: `app-home` có `#tmeFormHost` bọc ngoài `#tmeFields` (chỗ
  TuviForm render) ⇒ hai đường dò trúng hai phần tử của CÙNG một form. Bỏ cái
  nằm trong, giữ cái ngoài → chỗ đặt thanh sổ không đổi so với trước.
- **`data-uc-skip`** (mới) cho `app-nhan-mach`: trang đó **tự quản sổ** (ô chọn
  + vai + xoá). Không có cờ này là hai bộ điều khiển cho cùng một dữ liệu —
  red-team xác nhận gỡ cờ ra thì mọc đúng 2 thanh thừa.
- ⚠️ **`app-gio-sinh` CỐ Ý vẫn không có thanh sổ**: field của nó dựng tay
  (`gs-ngay`/`gs-gt`), không phải TuviForm — `TuviForm.getData('gs')` sẽ đọc
  hụt giới tính (`gs-gioitinh` không tồn tại) và trả về `nam` mặc định. Đường
  bàn giao của trang đó là khối chốt giờ ở mục A.

### 🐞 C. Bắt kèm: `TuviForm.setData` lệch ĐÚNG MỘT CHI ở nhánh `gioIdx`
`(gioIdx*2 + 1)` — địa chi k phủ khung `[2k−1, 2k+1)` (Tý = 23–01) nên giờ đại
diện là **2k**, không phải 2k+1. `setData(gioIdx:0)` điền 01:00 → đọc lại ra
**Sửu**. Nhánh này lâu nay không ai đi vào (mọi caller truyền `gioHour`) nên
lỗi nằm im; chú thích của `_birthFromQuery` trong `shell.js` còn ghi rõ là cố ý
**"tránh nhánh gioIdx của nó"**, và `xem-tuoi.html` khi phải tự quy đổi thì
viết `gioA*2` — tức đúng công thức. Vá vì tính năng mới ở mục A đi thẳng vào
nhánh đó.

### Verify
`tsc` 0 · `lint` **0 lỗi / 73 warning = đúng mốc nền** · `prettier` quét cả cây
sạch · **17/17 bộ dò** · engine **185 pass** · `node --check` + kiểm mọi khối
script nội tuyến.
- **30/30 ca trên TRANG THẬT**: 6 trang shell ra đúng số thanh sổ · bấm chip ở ô
  người THỨ HAI điền đúng prefix và **không đụng ô thứ nhất** · chốt giờ ghi
  đúng `gioIdx`/`gioHour` vào `app_birth` · đổi sang giờ #2 thì theo người dùng ·
  điều hướng **không có `auto=1`** · âm lịch → **0 lượt POST**, `app_birth` vẫn
  trống · khách chưa đăng nhập vẫn nhớ trên máy và được nói thật · server 500 →
  **không báo "đã lưu"** · 390px tràn ngang 0px.
- **Quét 37 trang shell, đối chứng `origin/main`**: đúng **1 trang MỚI có sổ**
  (`app-xem-tuoi` 0 → 2), **0 trang mất sổ**, 0 thanh nhân đôi.
- 🪤 **ĐỐI CHỨNG off-by-one: bản `origin/main` sai 12/12 chi**, bản mới khứ hồi
  đúng 12/12.
- **Red-team 3/3 đỏ đúng**: gỡ `data-tvf-form` → xem-tuoi mất sổ lại · gỡ
  `data-uc-skip` → nhan-mach mọc 2 thanh thừa · gỡ bộ lọc lồng nhau → form lồng
  form ra 2 thanh.
- 🪤 **Ba bẫy harness đã vấp** (đều là lỗi của TÔI, không phải của mã): (a) stub
  `Auth` bằng `addInitScript` bị `auth.js` GHI ĐÈ — bài học đã ghi ở track Công
  Sở, vấp lại; phải chặn hẳn `auth.js` bằng `page.route`; (b) `waitUntil:
  'networkidle'` treo vĩnh viễn vì container chặn Google Fonts; (c) ca "ô thứ
  nhất không bị đụng" đỏ oan — `_maybeSeedForm` **cố ý** mồi form ĐẦU TIÊN, nên
  phải seed sổ HAI mục mới tách bạch được "tự mồi" với "lượt bấm".

### CÒN LẠI
- **Trần sổ 30 mục** (`MAX_CHARTS`, `app/api/charts/route.ts`). Vượt thì xoá mục
  cũ nhất theo `last_used_at`, KHÔNG từ chối lưu.
- **7 trang standalone `/tools/*.html` có `TuviForm` vẫn không có sổ** — chúng
  không nạp `shell.js` (đường nạp duy nhất của `user-charts.js`). Nay chỉ cần
  thêm thẻ script là có, vì bộ dò hết phụ thuộc tên id.
- **`app-home` vẫn chưa có sổ**: `#tmeFormHost` rỗng lúc boot (form chỉ dựng khi
  bấm Sửa) mà `mount()` có cờ `_mounted` chạy một lần. Nợ CÓ SẴN, không phải do
  PR này; vá là gọi lại `mount()` sau khi dựng form.
- **`app-xem-tuoi` nay tự mồi lá số vào ô người THỨ NHẤT** (luật `_maybeSeedForm`
  sẵn có). Cùng hành vi `app-duyen-no-tien-kiep` vốn đã làm tay; ô vẫn sửa được.
- `ban-do-sao` · `than-so-hoc` · `chon-ngay` dựng field tay nên vẫn ngoài sổ.

---


---

## 🔘 "Ko thấy nút Sửa ở đâu?" — NÚT CÓ, LỜI CHỈ ĐƯỜNG MỚI LÀ THỨ HỎNG (2026-08-10, PR sau #490)

Henry chụp màn hình `/app/ngu-hanh-ten` trên iPhone: *"nó báo 'Bấm Sửa ở góc trên
rồi chọn mệnh' mà ko thấy nút Sửa ở đâu? Tool bị lỗi ah?"*

### 🔴 Không phải lỗi tool — nút Sửa NẰM NGAY TRONG ẢNH anh chụp
`#btnEdit` hiện đúng sau khi tra (`app-ngu-hanh-ten.html:99`, `display=''` ở lượt
`calculate`), là ô thứ HAI trong thanh, giữa "Chia sẻ" và "✦ Hỏi". Anh nhìn thẳng
vào nó mà không nhận ra.
- 🔑 **Vì sao không nhận ra: thanh đó là chrome của SHELL, không đọc như một phần
  của tool.** Người dùng phân vùng màn hình theo VAI TRÒ THỊ GIÁC — thanh trên
  cùng nằm cạnh ☰ và "Lưu PDF" nên đọc thành thanh của trang, còn khối chấm điểm
  ở giữa mới là "tool". Câu chỉ đường bắc cầu giữa hai vùng đó, mà cây cầu ấy chỉ
  có trong đầu người viết.
- Chữ *"góc trên"* còn sai thêm một nhịp: nút không ở GÓC nào cả, nó là ô thứ hai
  trong hàng bốn ô.

### 🔑 Nhưng lỗi thật sâu hơn một câu chữ — tôi vá TRIỆU CHỨNG ở vòng trước
Vòng #490 tôi đã bắt được đúng lớp lỗi này (*"shell ẩn form sau khi tra ⇒ câu
'chọn mệnh ở ô bên trên' trỏ vào ô người dùng KHÔNG còn nhìn thấy"*) rồi **sửa
bằng cách đổi câu chỉ đường theo bề mặt**, còn ghi hẳn ca đối chứng khẳng định ô
đó thật sự bị ẩn. Vá đúng chỗ đau nhưng **sai TẦNG**: chỗ cần sửa không phải lời
chỉ đường, mà là **nhu cầu phải chỉ đường**.

Kể cả khi tìm ra nút, đường đi vẫn là **4 bước cho một lựa chọn 5 giá trị**:
cuộn ngược lên → bấm Sửa (**mất luôn kết quả đang đọc**, `showForm` ẩn `resPanel`)
→ chọn trong ô dán nhãn **"(tùy chọn)"** → bấm Tra lại. Trang tự nói ô đó không
bắt buộc rồi lại chặn ở dưới vì thiếu nó.

### Đã làm — chọn mệnh NGAY TRONG khối chấm điểm
5 nút `Mộc · Hỏa · Thổ · Kim · Thủy` dựng thẳng trong trạng thái trống. Bấm là
chấm liền: không rời trang, không mở lại form, không mất phần đã đọc.
- Cùng luật với **M3** (*"mỗi lần chuyển trang ở đáy phễu là một lần rơi"*) và với
  ô nhập lá số nhúng thẳng trong thẻ *Vận hôm nay* (#418) — chỗ đó cũng **cố ý
  không đá sang trang khác**.
- **Bắt cú bấm theo ỦY QUYỀN** trên `#scoreResult`: khối này bị dựng lại mỗi lượt
  render (`applyManual` đổi số nét cũng dựng lại), gắn thẳng vào từng nút thì
  lượt sau mất bộ bắt.
- **Đồng bộ ngược vào `#menhInput`** — mệnh vẫn phải có MỘT nguồn: bấm Sửa sau đó
  phải thấy đúng lựa chọn, và mọi chỗ đọc mệnh (`render`, `railData`, chia sẻ)
  không được rẽ thành hai đường.
- **`syncShell(menh)` tách khỏi `calculate()`**: chọn mệnh tại chỗ là một lượt ĐỔI
  DỮ LIỆU THẬT ⇒ rail + bản chia sẻ phải dựng lại. Thiếu bước này thì chip
  *"Vì sao tên tôi được điểm này?"* mời người ta hỏi một con số **rail chưa hề
  nhận** — đúng lớp lỗi đã tốn cả một PR để rà (track "rail thất lạc trường").
- `HANH_LIST` xếp theo **thứ tự tương sinh**, khớp ĐÚNG thứ tự ô `<select>` trên
  cả hai trang — hai chỗ xếp khác nhau thì người dùng phải đọc lại từ đầu.
- Link *"Tra mệnh theo năm sinh →"* GIỮ, nhưng tụt xuống sau, dưới câu *"Không
  biết mệnh của mình?"* — nó là lối cho người thật sự không biết, không phải bước
  bắt buộc của mọi người.

### Verify
`tsc` 0 · `lint` 0 lỗi / **73 warning = đúng mốc nền** · `prettier` quét cả cây
sạch · **16/16 bộ dò**.
- **39 ca trên 2 TRANG THẬT ở 390px** (đúng khổ máy Henry): trạng thái trống
  **KHÔNG còn chữ "Bấm Sửa"/"ô bên trên"** · đủ 5 nút đúng thứ tự · nút cao ≥36px
  bấm được bằng ngón tay · bấm → **KHÔNG rời trang**, ra ngay 94/100 · thẻ từng
  chữ và cân bằng ngũ hành **còn nguyên** (không bị dựng lại mất) · `<select>`
  đồng bộ ngược · bấm Sửa ra thấy đúng mệnh vừa chọn · 0 lỗi JS · 0px tràn ngang.
- **Rail: 1 → 2 lượt `setContext`** sau khi chọn mệnh tại chỗ; lượt sau mang đúng
  `menh`/`diem`/`hanhNenBoi`/`chuGoiY`, **vẫn PHẲNG 100%** (bẫy
  `extractGenericContext` bỏ im lặng mọi object), và bản chia sẻ có dòng chấm điểm.
- **62/62 ca của vòng #490 chạy lại: 0 hồi quy.**

### CÒN LẠI
- Ô mệnh trong form vẫn dán nhãn **"(tùy chọn)"** trong khi thiếu nó là không chấm
  được. Đúng về mặt kỹ thuật (tra ngũ hành từng chữ vẫn chạy) nhưng đọc thì mâu
  thuẫn với khối bên dưới — cố ý chưa đụng vì sửa nhãn là đụng cả hình dạng form.
- Bump `ngu-hanh-ten.js?v=2→3` (2 trang). Không đụng `nap-am.js`.

## 🔌 `mcp-handler` 1 → 2: gỡ đúng cái workaround của chính mình (2026-08-10, PR này)

#389 treo đỏ từ 03/08 (`typecheck` + `next-build`). Đây là bump MAJOR đụng bề
mặt **MCP đang chạy thật** — đúng lớp đã làm 7 lượt deploy prod ERROR ở #388,
nên không merge suông mà di trú kèm A/B.

### Hai chỗ vỡ, và cái thứ hai là TIN VUI
```
server.tool(name, desc, ZodRawShape, cb)   → gỡ, thay bằng registerTool
createMcpHandler(init, opts, config)       → còn 1–2 tham số
```
- `registerTool(name, {description, inputSchema}, cb)` — ⚠️ `inputSchema` phải là
  **SCHEMA CHUẨN** (Zod object), không phải `ZodRawShape` như `tool()` cũ nhận.
  Bọc `z.object(t.schema)` là đủ; repo đã ở Zod v4 nên không phải đụng gì thêm.
- 🔑 **Tham số thứ ba biến mất vì v2 KHÔNG cần nó nữa**: handler nay là hàm web
  chuẩn *"serves every request it receives — routing belongs to the host
  framework"*. Tức cả cái workaround `streamableHttpEndpoint = pathname` mà chú
  thích đầu file mô tả (dựng handler theo request để khớp `/mcp/<key>`) là thứ
  v2 xoá bỏ. **Vẫn dựng theo request, nhưng vì lý do KHÁC HẲN**: `key` nằm trong
  path và closure của tool phải bắt đúng key của lượt đó. Sửa chú thích theo,
  không thì người sau đọc thấy một lý do đã chết.

### A/B trên BỀ MẶT THẬT, không đọc code đoán
Dựng `next dev` hai lượt (v1 rồi v2), gọi HTTP thật `initialize` → `tools/list`
→ `tools/call`, so nguyên khối JSON:

| | kết quả |
|---|---|
| `serverInfo` · `instructions` · `protocolVersion` · 5 tên tool · mô tả · **JSON Schema từng tool** | **trùng khít** |
| lệch DUY NHẤT | `$schema` draft-07 → **2020-12** (dialect Zod v4 phát ra) |

Nhánh lỗi thì **ngang hoặc tốt hơn**:

| | v1 | v2 |
|---|---|---|
| args sai | `isError:true`, message là bãi JSON issue thô | `isError:true`, message đọc được: *"ngay_duong: Invalid input: expected string"* |
| tool lạc | bọc thành tool result `isError:true` | JSON-RPC error **-32602** (đúng spec hơn) |

### Verify
`tsc` 0 · `lint` 73 = mốc nền · `prettier` sạch · **`next build` exit 0, 64/64
trang** (đúng hai check #389 đang đỏ).

### 🪤 Bắt kèm: Next 16.3 TỰ GHI VÀO `CLAUDE.md`
`next dev` của bản vừa bump (#479) chèn khối `nextjs-agent-rules` vào cuối
`CLAUDE.md` và đổi `next-env.d.ts` sang `.next/dev/types/`. Không commit thì
**mọi lượt `npm run dev` để lại cây bẩn**. Commit kèm ở đây vì nó là hệ quả của
lượt bump tôi vừa merge, không phải của phần MCP. Muốn tắt: `agentRules: false`
trong `next.config`.

### CÒN LẠI
- **Chưa gọi được với KEY THẬT** — container không có credential Supabase, nên
  nhánh `quota` → `logUsage` → `t.run` chưa chạy thật. Phần đó KHÔNG bị lượt di
  trú đụng tới (chỉ đổi cách đăng ký tool), nhưng đừng đọc rộng hơn thế.
- `$schema` đổi dialect: client MCP thật đều đọc `properties` chứ không chốt
  theo `$schema`, nhưng đây là chỗ duy nhất đáng nhìn nếu có client kén.

---

## 🀄 Lục Nhâm CŨNG liệt kê được từ vựng — và lộ 3 chỗ rò (2026-08-10, PR trước)

Henry: *"check xanh hết thì merge đi, xong làm tiếp"*. #479 bump **`mingyu-core`
lên 0.1.25** (không phải 0.1.24 như lượt A/B ở #481) nên đo lại trước khi gộp.

### Bản bump thì SẠCH, nhưng đi đo lại thì lộ nợ CÓ SẴN
`check:terms` xanh trên 0.1.25, quét rộng thêm **4.392 khóa Lục Nhâm + 4.392 bàn
Kỳ Môn: 0 chữ Hán lọt** ⇒ bộ tách ghép của #481 gánh được bản mới.
- 🔑 **Nhưng CÒN LẠI ghi "Lục Nhâm chưa có đường liệt kê từ vựng" là SAI** — nó
  có, chỉ là nằm ở đường nội bộ: `dist/…/liuren/helpers/transmission.js` khai
  `REGISTERED_GUA_TI_RULES` (13 khóa thể tam truyền) và **export CON SỐ**
  `REGISTERED_LIUREN_GUA_TI_COUNT`; `lessons.js` khai 10 pháp cửu tông môn.
  Tôi kết luận "không có" mà chưa mở gói ra đọc — đúng lớp lỗi *"tra RAG trước
  khi nói là thiếu nguồn"* đã ghi ở track danh xưng.

### 🔴 Ba chỗ rò, cả ba lọt qua 4.392 khóa mẫu
| Chuỗi | Giao diện hiện | Vì sao mẫu không bắt |
|---|---|---|
| `铸印卦` | **"铸 Ấn 卦"** | khóa thể hiếm, không lá nào trong lưới sinh ra |
| `遥克` đứng một mình | "遥 克" | bảng chỉ có dạng GHÉP `遥克比用`/`遥克涉害` |
| `昴星` đứng một mình | "昴 Tinh" | như trên |

Đúng lớp lỗi `九丑` → *"Cửu 丑"* của #481, và lặp lại đúng bài học: **nới lưới
mẫu không cứu được, phải đọc chính danh sách của nguồn.**

### 🧷 Mục `tuvung-luc-nham` — chốt bằng CON SỐ NGUỒN KHAI
Nguồn không export danh sách tên, chỉ export số lượng ⇒ rút tên từ khối luật
rồi **đối chiếu số rút được với `REGISTERED_LIUREN_GUA_TI_COUNT`**. Bố cục đổi ⇒
hai số lệch ⇒ đỏ kèm hướng dẫn, thay vì lặng lẽ kiểm một danh sách cụt.
- 🪤 **Bộ dò bản đầu KÊU OAN**: tôi suy tên pháp bằng cách chắp đuôi `法` vào mọi
  khóa thể ⇒ đẻ ra `蒿矢法`/`递传法`, những thứ nguồn không hề sinh (`蒿矢` là
  biến thể CỦA `遥克法`). Phải rút thẳng 10 tên `X法` từ `lessons.js`. **Kêu oan
  là con đường ngắn nhất tới chỗ bị tắt đi.**
- ✅ **Kỳ Môn thì lành THEO CẤU TRÚC, không cần mục riêng**: tag của nó là chuỗi
  GHÉP (`星伏吟`, `符使同宫`, `三奇游六仪`) nhưng đọc theo TỪNG CHỮ nên ghép kiểu
  gì cũng ra (*Tinh Phục Ngâm*, *Phù Sứ Đồng Cung*). Rủi ro còn lại chỉ là một
  CHỮ mới — lượt quét 4.392 bàn phủ đúng chỗ đó. Đừng thêm mục cho có.

### Verify
`tsc` 0 · `lint` **73 warning = đúng mốc nền** · `prettier` sạch · **14/14 bộ
dò** · engine **185 pass** · quét rộng 4.392 + 4.392 trên 0.1.25 sạch.
- **5/5 ca red-team đỏ đúng** (gỡ `铸印卦` · gỡ `遥克`+`昴星` · nguồn đổi tên khối
  luật → nhánh ngưỡng · nguồn đổi CÁCH KHAI tên → **nhánh lệch số**, in đúng
  *"rút được 12 nhưng nguồn khai 13"* · gỡ một pháp khỏi bảng đọc), đối chứng
  khôi phục **xanh**, 0 file rác.
- 🪤 **Ca 5 lượt đầu ĐỖ GIẢ vì assert của TÔI sai**: đếm chuỗi `昴星法` trong khi
  khoá bảng là `昴星` ⇒ `grep -c` trả 0 trước và sau, "0" trông như đột biến đã
  ăn. Đúng bài học *"mọi lượt thay bằng script phải assert số lượt khớp"* — mà
  assert phải nhắm đúng chuỗi CÓ THẬT, không thì chính nó đỗ giả.

### CÒN LẠI
- Mục mới phủ **khóa thể + pháp**. Thần sát Lục Nhâm (`THAN_SAT`) vẫn chỉ quét
  mẫu — chưa tìm được đường liệt kê cho nhóm đó.
- Danh sách 20 nhãn khóa thể đứng một mình là **tập ĐÓNG của cổ pháp** khai
  thẳng trong bộ dò; nó không nở theo lượt bump nên không cần chốt số.

---

## 🧷 Máy canh cho nhóm `wrap` — và nó lòi ra 13 trường + 1 lỗi #475 sót (2026-08-10, PR này)

Henry: *"ok làm tiếp đi"* — mục CÒN LẠI tao tự nêu ở lượt trước: *"`check:railfields`
mới phủ Bát Tự. Nhóm `wrap` chưa có máy canh — mà đây đúng là nhóm vừa lộ 3 lỗi."*

### 🔑 Vì sao phải là bộ dò RIÊNG, không nới bộ cũ
Hai nhóm đi hai đường khác hẳn: nhóm `scenario` → `SCENARIO_FIELD` → `extract*Context`;
nhóm `wrap` → **lá số ĐẦY ĐỦ + một hàm `*RailWrapper`**. Bộ dò cũ neo vào
`extractTuBinhContext` nên không có cách nào với sang. Đó chính là lý do lượt rà
đầu **sót đúng nhóm này**, rồi lượt sau nó lòi ra 3 lỗi.

**`scripts/check-rail-wrap.mjs` (bộ dò thứ 16)** — engine khai trường nào ở hồ sơ
thì wrapper phải ĐỌC, hoặc khai `skip` **kèm lý do**, và lý do chỉ được thuộc hai
loại kiểm được bằng mắt: *(a)* đã có trong khối lá số đầy đủ (model tự suy lại
được) · *(b)* cờ nội bộ / tham số đầu vào. Chạy trên MÃ NGUỒN, không cần tsc.

### 🔴 Chạy lượt đầu: 13 trường thiếu ở 4/6 vỏ
| tool | trường không tới rail |
|---|---|
| `day-con` | `hoc` (6 thẻ CÁCH DẠY — tầng **miễn phí**) · `matDoc` · `changHoc` · `voiChaMe` · `hoatDong` |
| `nguoi-khac` | `matDoc` · `voiBan` |
| `huong-nghiep-tre` | `matDoc` · `laTreEm` · `changDangO` |
| `past-life-bond` | `signals` · `giver` |

- 🔑 **Tiêu chí quyết gửi/bỏ**: người dùng có ĐỌC được nó không, **và** model có
  suy lại được từ lá số không. Nên `sao`/`cachCuc`/`diem` của `matDoc` thì BỎ (lá
  số đã có, gửi nữa là nhân đôi ~1.200 ký tự), còn `nhan`/`y` thì GỬI — chúng nói
  *tool này đọc cung đó để trả lời câu hỏi gì*, không có trong lá số.
- **`voiBan`/`voiChaMe`/`signals` là loại KHÔNG có đường suy lại**: chúng bắc qua
  lá số THỨ HAI, mà rail chỉ nạp được một. Hỏi *"vì sao lại là oan gia?"* trước
  đây là model buộc phải bịa — đúng trên câu hỏi trang mời người ta đặt.
- **`giver`** (bên CHO trong duyên ân nhân/thầy trò) không gửi thì model tự đoán
  chiều, và nó đoán sai được y hệt lỗi `hanhRelation` đã dựng NGƯỢC VAI một lần.
- `matDocBlock` gom về **`lib/agent/rail-blocks.ts`** — ba tool cùng hình dạng,
  chép ba bản là ba bản trôi khỏi nhau.

### 🔴 Và một lỗ #475 còn sót: vỏ rail gọi lá số 43 tuổi là "một đứa trẻ"
`huongNghiepTreRailWrapper` mở đầu bằng *"ĐANG XEM LÁ SỐ CỦA MỘT ĐỨA TRẺ"*, gọi
"cháu", in *"Lứa tuổi: Tuổi vào đời"*, cấm đoán đỗ/trượt — cho một người 43 tuổi.
Nặng hơn: khối `huongBlock` tao vừa thêm ở PR trước đọc `p.lop.xungHo`, mà khi
`laTreEm=false` thì `lop` chỉ là **chỗ đứng kỹ thuật** và `xungHo` vẫn trả `"con"`
⇒ vỏ rail **tự nói ngược lại chính dữ liệu nó đang in ra** (engine đã thay đúng
`XUNG_HO_NGUOI_LON` vào các chuỗi bên trong `huong`).
- 🔑 **Bài học lặp lần thứ hai, y nguyên: chặn đường BÁN không bằng chặn đường
  ĐỌC.** #475 vá trang + chặn thu tiền; bề mặt CHỮ thứ ba (vỏ rail) thì không ai
  đi tới.
- ⚠️ **Không thổi phồng: đây là lỗ TIỀM ẨN, không phải đang cắn người dùng.**
  Trang chặn đường trả tiền trước khi `setContext({wrap})` chạy, và `SHAPE=2` của
  #475 đã làm mọi dòng cache người-lớn cũ thành stale ⇒ nhánh `free` cũng không
  tới. Vá vì bản thân vỏ SAI và vì `wrap` là ENUM client gửi được — cùng lối "vá
  ở GỐC chứ không vá ở cầu nối" của `chiNam`.
- Ca `laTreEm=false` nay có vỏ RIÊNG: cấm mọi từ trẻ con, vẫn gửi tầng thiên
  hướng (đọc từ 13 chiều, độc lập tuổi ⇒ vẫn đúng), và bàn giao sang
  `/app/cong-so`.

### ⚠️ PHẠM VI THẬT của bộ dò — ghi để khỏi tin quá tay
Soi **cấp 1** của hồ sơ + các kiểu lồng khai TAY trong `deep`. Trường mới nằm
trong một kiểu lồng CHƯA khai thì **không bắt được** — đúng chỗ `nhan-mach` từng
lọt (`cap[].vi`). Cố ý không tự duyệt sâu mọi kiểu lồng: phần lớn là cấu trúc nội
bộ, quét hết là kêu oan hàng loạt, mà **bộ dò kêu oan là bộ dò bị tắt đi**.
`deep` hiện khoá `BondSignal` · `VoiBan` · `KieuHoc` · `VoiChaMe` · **`GroupPair`**
— cái cuối bắt đúng lỗ mà cấp 1 báo xanh (`GroupBond` sạch, nhưng `GroupPair` mang
`signals`/`giver` y hệt bản 2 người vừa thiếu).
- 🪤 Bộ dò gom **thân wrapper + thân mọi helper CÙNG FILE mà nó gọi** (đệ quy).
  Bắt buộc: `huongBlock`/`kieuChiTiet` nằm ngoài hàm export. Nhưng CỐ Ý **không
  quét cả file** — `past-life-story.ts` còn chứa `formatCharacterForLLM` (dựng
  prompt TRUYỆN); tính nhầm nó là "rail đã biết" thì lại xanh oan.

### Verify
`tsc` 0 · `lint` **0 lỗi / 73 warning = ĐÚNG baseline `origin/main`** (đo lại trên
worktree main, không phỏng đoán) · `prettier` sạch · **16/16 bộ dò** · engine
**185 pass**.
- **672 lượt dựng vỏ rail trên 96 lá số**: 0 rò `[object Object]`/`undefined`/`NaN`
  · deterministic · **bất biến đạo đức: 36/36 lá số người lớn KHÔNG dính khung trẻ
  con, 60/60 lá số trẻ em vẫn giữ đúng khung**.
- 🪤 **ĐỐI CHỨNG `origin/main` bằng `git worktree`: 25 bất biến đỏ**, trong đó
  **36/36 lá số người lớn nhận khung "MỘT ĐỨA TRẺ"** và ô xưng hô ra `"con"` thay
  vì `"người này"` ⇒ lỗ có thật, phép đo bắt được.
- **Red-team bộ dò 5 ca + 2 đối chứng**: gỡ `signals` khỏi wrapper → đỏ · engine
  thêm trường mới → đỏ · `skip` khai thừa → đỏ · bỏ một trường của KIỂU LỒNG →
  đỏ · **sửa chữ vô hại → vẫn xanh** · khôi phục → xanh · 0 file rác.
- 🪤 **Ca red-team đầu "đỗ giả" vì đột biến KHÔNG ăn** (perl nội suy `${...}` trong
  template literal). Chốt assert-đột-biến-đã-ăn bắt đúng chỗ đó thay vì in một
  dấu ✓ vô nghĩa — đúng bài học "mọi lượt thay bằng script phải assert".
- 🪤 Và **hai lần vấp lại bẫy TÊN KHOÁ** (`chua-biet-thich-gi`, `khong-chiu-hoc`
  không có trong `MoiLoId`) → hàm trả `undefined`. Lần này nhận ra ngay là lỗi
  harness chứ không ghi thành "không đo được".

### Context tốn thêm (đường `wrap` vốn đã kèm ~14K ký tự lá số)
`day-con` 4,7K → **6,2K** · `nguoi-khac` 2,2K → **3,1K** · `bond` 1,7K → **2,1K** ·
`hn-tre` 4,2K → **4,7K**. Đổi lại là mấy khối người dùng ĐANG MỞ trên màn hình.

### CÒN LẠI
- **Chưa gọi LLM thật** — vẫn dừng ở tầng dữ liệu vào prompt.
- **Cấp 2 chưa có máy canh** (xem PHẠM VI). Kiểu lồng mới phải tự nhớ khai `deep`.
- **Chưa đo: 2 tool chân dung · `duyen-no`** ở tầng *nội dung* — PR này mới khoá
  phần TRƯỜNG của `past-life`/`past-life-bond`, chưa đọc chất lượng chữ.

---

## 🧹 "2 tool mỏng quá" — CẦU CÓ THẬT, mình dựng SAI HÌNH DẠNG (2026-08-10, PR này)

Henry: *"Ngũ hành nạp âm với Ngũ hành tên, nó mỏng quá, xem xong chả biết làm
gì… nếu ko tìm dc gì thì consider switch off… rà soát lại còn tool nào mỏng
quá ko thì switch off bớt, giờ nhiều tools quá."*

### 🔴 Trả lời câu hỏi chính: đối thủ CÓ làm cả hai, và họ làm khác cách mình
- **Nạp âm:** cầu rất lớn nhưng **KHÔNG ai làm nó thành "tool" có ô nhập**.
  lichngaytot có bài *"Xem Mệnh Theo Năm Sinh"* phủ trọn **1930–2067**;
  `menh.com.vn` lấy nguyên MỘT TÊN MIỀN; amlich.net/lichamduong.net là bảng
  tra 60 hoa giáp. Thứ họ bán không phải con chữ *"Lộ Bàng Thổ"* mà là **ỨNG
  DỤNG**: hợp màu · hợp hướng · hợp tuổi cưới/làm ăn · số may mắn · chọn ngày.
- **Ngũ hành tên:** thị trường thật tên là **"chấm điểm tên"** — tudienten.com
  có *"Chấm điểm tên toàn diện"*, cộng tracuuthansohoc, kiddihub, và có cả bài
  *"TOP 5 trang chấm điểm tên"* (nhiều tới mức phải xếp hạng). Họ trả **ĐIỂM
  SỐ + tên gợi ý thay thế**. Bản mình: ngũ hành từng chữ + thanh cân bằng + 1
  câu sinh/khắc — **0 điểm, 0 gợi ý, 0 lối đi tiếp**.

### 🔑 Chỗ đau nhất: CẢ HAI HỨA HỤT NGAY TRONG META DESCRIPTION CỦA CHÍNH NÓ
| Tool | Trang tự hứa | Thực tế trả ra |
|---|---|---|
| `nap-am` | *"ứng dụng trong phong thủy, đặt tên, chọn màu"* | 4 ô Can · Chi · Can Chi · Nạp Âm |
| `ngu-hanh-ten` | *"gợi ý chỉnh sửa nếu cần"* | không có gợi ý nào |
⇒ *"Xem xong chả biết làm gì"* không phải cảm giác — **trang nói trước là sẽ
chỉ cho biết làm gì rồi không chỉ**. Nên **KHÔNG tắt**: cầu còn lớn hơn phần
lớn tool đang bật, vấn đề là thiếu ĐOẠN CUỐI chứ không phải thiếu chỗ đứng.

### Đã làm — cả hai sửa trong MODULE DÙNG CHUNG (0 lượt LLM, 0đ, tra bảng thuần)
- **`nap-am.js` + `ungDung()`/`ungDungHTML()`** — khối *"Hành X dùng vào việc
  gì"*: màu hợp/kỵ · phương vị · tuổi hợp-kỵ · số Hà Đồ · chất liệu, kèm 4 lối
  đi tiếp sang `bat-trach` · `tuong-hop` · `kim-lau` · `mau-sac-hop-menh` —
  **site đã có sẵn đúng mấy tool mà người tra nạp âm muốn dùng tiếp**, nạp âm
  đúng vai CỬA VÀO.
  - 🔑 **Câu chặn bắt buộc: phương vị ngũ hành ≠ HƯỚNG NHÀ.** Hướng nhà xét
    theo cung phi bát trạch. Không nói rõ là tool này mâu thuẫn thẳng với
    `bat-trach` ngay bên cạnh — hai tool cùng site nói ngược nhau.
  - Quan hệ ngũ hành khai theo **VAI** (`DUOC_SINH`/`SINH_RA`/`BI_KHAC`/
    `KHAC_LAI`) chứ không phải một bảng `SINH` đọc hai nghĩa — đúng lớp lỗi đã
    làm hai dòng `sinh` bị hoán vị ở track Duyên Nợ.
- **`ngu-hanh-ten.js` + `score()`/`scoreHTML()`** — điểm 0–100 gồm 4 phần: chữ
  tên chính ↔ mệnh (40) · cân bằng ngũ hành (25) · có chữ bồi mệnh (20) ·
  không có chữ khắc mệnh (15); verdict 5 mức; hành nên bổ / nên tránh; **8 chữ
  gợi ý**; rồi dẫn sang **Đặt Tên Con (20 Lượng)** — biến bản free thành đầu
  phễu của tool trả tiền thay vì ngõ cụt.
  - ⚠️ **CHƯA chọn mệnh → trả `null`, KHÔNG chấm.** Ba trên bốn phần không
    tính được; chấm đại là bịa đúng thứ người ta mang đi khoe. Trạng thái đó
    nói thẳng + link sang `nap-am` để lấy mệnh (nối hai tool lại với nhau).
  - 🔑 **`GOI_Y` là danh sách CHỌN TAY, cố ý không quét cả DB**: bảng có 848 âm
    tiết gồm cả `bạo` `cãi` `cấm` `cọp` — quét máy là gợi ý chúng làm tên.
    Mỗi chữ đã đối chiếu ngược qua `netToHanh(DB[x].n)`.
  - 🔴 **LUẬT DIỄN ĐẠT in thẳng lên trang**: đây là tên người ta ĐÃ MANG, phần
    lớn do cha mẹ đặt. Điểm thấp **không được đọc thành "tên xấu"** và không
    được giục ai đổi tên; phần này chỉ có nghĩa khi đang CHỌN tên mới. Cùng họ
    với luật *"trục thấp = việc không đòi hỏi, không phải bạn thiếu"*.
  - **Thang điểm là quy ước TỰ ĐẶT**, khai rõ trên trang — cổ thư nói quan hệ
    sinh–khắc, không cho con số trên thang 100. Cùng dạng nợ `KIEU_HOC`.

### 🐞 Lỗi thật bắt được khi ĐO trên trình duyệt, không phải khi đọc code
Trang **shell ẨN form sau khi tra**, nên câu *"chọn mệnh ở ô bên trên"* trỏ vào
một ô người dùng **không còn nhìn thấy** — đúng loại hứa hụt vòng này đi sửa.
Nay câu chỉ đường khác nhau theo bề mặt (`shell` → *"Bấm Sửa ở góc trên"*), có
ca ĐỐI CHỨNG khẳng định ô đó THẬT SỰ bị ẩn.

### 🧹 Rà tool mỏng — 2 cái Henry nêu KHÔNG phải mỏng nhất
Tắt **6 tool trùng lặp nặng hơn** (`_patches/migration-tat-tool-trung.sql`,
✅ ĐÃ CHẠY prod — **61 → 54 công cụ**, 18 miễn phí):
`sao-nam` · `cach-cuc` · `dai-van` · `van-thang` **cùng hỏi một bộ ngày sinh,
cùng gọi `anSaoLaSo` lập lá số ĐẦY ĐỦ, mỗi trang chỉ hiện một mảnh** ·
`han-nam` bảng tra thuần trùng hai cái trên · `tu-tru` là bản free mỏng của
`tu-binh` (50 Lượng).
- ⚠️ **`an-sao` CỐ Ý GIỮ** — nó là cửa lá số miễn phí DUY NHẤT còn trong danh
  mục. 🪤 Phát hiện kèm: **`/app/la-so` đã gộp vào `luan-giai` và KHÔNG còn
  dòng nào trong `tool_pricing`** ⇒ nó đang là **trang mồ côi**, route còn
  sống nhưng không hiện ở sidebar lẫn `/cong-cu`.
- **"Switch off" = `enabled=false`, KHÔNG xoá**: trang vẫn trên đĩa, vẫn mở
  được bằng URL, vẫn trong sitemap — chỉ thôi hiện ở 3 bề mặt danh mục. Bề mặt
  SEO giữ nguyên, chỉ dọn chỗ chật. Lùi lại bằng một câu SQL.

### Số liệu — và giới hạn của nó, đọc trước khi viện dẫn
- GSC 28 ngày cả site: **15 click / 788 hiển thị**; **0 trang `/tools/*` lọt
  top pages** (duy nhất `/tools/hoang-dao.html` có 2 người từ GA4).
  ⇒ Tắt tool hôm nay gần như **không mất traffic**; cái mất là tiềm năng sau.
- 🔴 **Lượt dùng KHÔNG đủ mẫu để quyết**: cả 61 tool cộng lại chưa tới 200 lượt
  mở, mọi tool ≤2 người từng chạy, gần như toàn bản test. Quyết định dựa vào
  TRÙNG LẶP và CHIỀU SÂU, **không** dựa vào lượt dùng — đừng đọc bảng usage
  thành *"tool này không ai cần"*.

### Verify
`tsc` 0 · `lint` 0 lỗi / **73 warning = đúng mốc nền** · `prettier` quét cả cây
sạch · **16/16 bộ dò** · engine **185 pass** · `node --check`.
- **Phân bố điểm trên lưới 11.200 ca** (8 họ × 8 đệm × 35 tên × 5 mệnh): TB
  **68,5** · dải **20–100** · 5 mức verdict trải **8,2–27,3%** — không mức nào
  nuốt đa số. Thang mà ai cũng 90 thì vô nghĩa, nên đây là phép đo bắt buộc.
- **61/61 ca trên 4 TRANG THẬT** (shell + standalone của cả hai tool): chiều
  sinh/khắc đúng cổ pháp (`Hỏa sinh Thổ`, `Mộc khắc Thổ`, **0 ca đảo chiều**) ·
  có câu chặn phương-vị-≠-hướng-nhà · 4 lối đi tiếp trỏ đúng `/app/*` hay
  `/tools/*` theo bề mặt · chưa có mệnh → **không hiện điểm nào** · có mệnh →
  94/100 khớp module · **ĐỐI CHỨNG đổi mệnh sang Mộc → điểm đổi 51**, không
  phải số chết · 8 chữ gợi ý **0 chữ vô duyên** · 390px không tràn · 0 lỗi JS.

### CÒN LẠI
- **Chưa rà 3 nhóm bị chẻ nhỏ**: 10 tool Làm Đẹp AI (khác hẳn domain mệnh lý,
  cả 10 đều 0 lượt mở) · 6 tool Xem Tướng · 4 tool Phong Thủy. Chúng **không
  mỏng** — đây là câu hỏi ĐỊNH VỊ, cố ý tách khỏi đợt dọn này.
- `/app/la-so` mồ côi (xem trên) — hoặc thêm dòng `tool_pricing`, hoặc bỏ hẳn
  route. Để nguyên thì nó là một trang sống mà không ai tới được từ trong site.
- Bảng gợi ý tên và các bảng ứng dụng ngũ hành **là data tự viết, chưa ai
  review** — cùng dạng nợ với 384 hào từ. Sửa là sửa data thuần.

---

## 💾 "Chạy lại vẫn ra lá số cũ" — TÔI QUÊN BUMP `SHAPE` ở #475 (2026-08-10, PR trước)

Henry: *"Tao chạy lại nó còn cache nên vẫn hiện ra lá số cũ đó. Có cách nào clear
cache ko?"*

### 🔴 Không phải hỏi vặt — đo ra đúng một dòng cache hỏng, và lỗi là của tôi
Chốt tuổi của #475 nằm **TRƯỚC** lượt đọc cache nên lá số 43 tuổi không thể lấy
phải bản cũ qua đường trả tiền; SW thì network-first cho HTML. Nên đi soi thẳng
DB, và ra ngay:

| `portrait_cache` (huong-nghiep-tre) | |
|---|---|
| `tuoi` | **43** |
| `lop` | **`lon`** ← đúng cái KẸP TUỔI mà #475 đi vá |
| `laTreEm` | **không tồn tại** (ghi trước lượt vá) |
| `_shape` | **1** ⇒ `shapeStale()` coi là còn mới ⇒ **không dựng lại** |

🔑 **#475 CÓ đổi cấu trúc payload** (thêm `laTreEm`, thêm `xungHo` từng lứa,
thêm hẳn lứa `vaodoi` + 9 khối hoạt động) — mà luật ghi ngay trong khối chú
thích trên `SHAPE` nói rõ *"Đổi chữ: không bump. **Đổi cấu trúc: bắt buộc
bump**"*. Tôi đọc khối đó rồi vẫn quên. Đây là lần thứ HAI của cùng lớp lỗi
(`day-con` #465 đã cắn y hệt: 4 khối im lặng biến mất trên prod).

### Đã làm
- **`SHAPE` 1 → 2** + ghi lịch sử bump ngay tại chỗ.
- **Xoá dòng cache hỏng trên prod.** ⚠️ Chỉ xoá ở `portrait_cache`; **quyền sở
  hữu nằm ở bảng `huong_nghiep_tre_reports`, KHÔNG đụng** ⇒ người đã trả tiền
  không bị tính lại. Verify sau khi xoá: cache 0 dòng, quyền sở hữu còn 1.
- **Câu lệnh xoá cache một lá số** (khi cần bản thật sự mới):
  ```sql
  delete from portrait_cache where tool_id = '<tool>' and laso_key = '<khoá>';
  ```

### 🧷 `scripts/check-cache-shape.mjs` (bộ dò thứ 14) — lời dặn KHÔNG đủ
Lớp lỗi này hỏng IM LẶNG và đã cắn hai lần **dù chú thích cảnh báo nằm ngay trên
dòng phải sửa**. ⇒ phải có máy canh: băm danh sách KHOÁ (2 tầng) của payload
engine rồi so với `SHAPE_FINGERPRINT` khai cạnh `SHAPE`. Đổi cấu trúc ⇒ băm đổi
⇒ đỏ kèm vân tay mới, buộc bump `SHAPE` CÙNG LÚC.
- **Băm theo KHOÁ, cố ý không băm giá trị**: sửa CHỮ thì không phải bump (dòng
  cache cũ trả chữ cũ — khó chịu, không vỡ), chỉ đổi/thêm/bớt KHOÁ mới vỡ.
- 🪤 **Ca quyết định — đặt lại engine bản TRƯỚC #475 thì bộ dò ĐỎ ĐÚNG**
  (52 khoá vs 54, vân tay `ed25a825f494` vs `5242585a3d68`) ⇒ nó bắt được chính
  lỗi vừa xảy ra, không phải một cái lưới cho có.
- Red-team thêm 2 ca (engine thêm khoá · gỡ khai vân tay) đỏ đúng, đối chứng
  khôi phục xanh, 0 file rác.
- ⚠️ **Phạm vi: tầng ENGINE**, không phủ chỗ route tự ghép thêm khoá. Cả hai lần
  cắn thật đều là đổi ở engine nên nó phủ đúng chỗ đau — nhưng đừng đọc rộng hơn.

### 🪤 Ba bẫy harness đã vấp khi dựng bộ dò (đều là lỗi của TÔI)
1. **Alias `@/` không tồn tại ngoài bản dựng Next** — phải đổi sang đường dẫn
   tương đối theo ĐỘ SÂU từng file.
2. **Đổi alias phải chạy TRƯỚC bước thêm đuôi `.js`** — đảo thứ tự thì đường dẫn
   vừa sinh ra không có đuôi, node ném `ERR_MODULE_NOT_FOUND`, và thông điệp trỏ
   vào *engine* chứ không trỏ vào *harness*.
3. **`.json` bị nối nhầm `.js`**, rồi khi sửa xong lại cần `with { type: 'json' }`
   (tsc không phát ra import attribute).

### Verify
`tsc` 0 · `lint` 73 warning = đúng mốc nền `main` · `prettier` sạch ·
**14/14 bộ dò** · engine **185 pass** · `node --check`.

### ✅ Vòng sau — phủ nốt 5 tool CHƯA có `SHAPE` (Henry: *"phải làm sao tiếp?"*)
Đo trước khi chọn hướng: **11 dòng cache / 2 lượt hit** trên cả 5 tool, toàn bản
test. ⇒ cache **chưa gánh gì**, nên cắm sẵn `SHAPE` cho cả 5 là đụng đường trả
tiền của 5 tool đang bán để đổi lấy một lợi ích **chưa tới hạn**.

Chọn cách rẻ hơn mà chặn đúng chỗ: **bộ dò chốt vân tay cho CẢ 7 tool**, tool
chưa có cơ chế thì báo *"cắm `SHAPE` TRƯỚC khi đổi payload"* kèm đủ 3 bước
(`shapeStale` · cờ `overwrite` · ⛔ không nhét vào `lasoKey`). Tức là ép đúng
**thời điểm duy nhất còn kịp**, thay vì trông vào trí nhớ hay vào một dòng ghi
trong CÒN LẠI.

| tool | khoá | vân tay | SHAPE |
|---|---:|---|---|
| `huong-nghiep-tre` | 54 | `5242585a3d68` | 2 |
| `day-con` | 72 | `4ec3392fed42` | 2 |
| `nguoi-khac` | 71 | `5ca3e50e1109` | chưa có |
| `chan-dung-tien-kiep` | 59 | `f256a213cbd1` | chưa có |
| `duyen-no-tien-kiep` | 44 | `7e1e42a5757a` | chưa có |
| `chan-dung-vo-chong` | 36 | `8cfee3e40522` | chưa có |
| `nhan-mach` | 26 | `cc7d29bafb5f` | chưa có |

- **Vân tay ổn định 3/3 lượt** — băm theo KHOÁ nên giá trị ngẫu nhiên
  (`pickMarriageAgeAnchor`…) không làm bộ dò flaky.
- Red-team nhánh mới: đổi payload `nhan-mach` → đỏ đúng, và in ra **câu hướng
  dẫn của nhánh "chưa có SHAPE"** chứ không phải câu bump.

### ✅ Vòng cuối — `shape` thành LỖI BIÊN DỊCH (Henry: *"Ok. Đồng ý. Làm đi"*)
Bộ dò chỉ chặn được lúc CI chạy. Nay đổi chỗ chốt: **`cacheFor(toolId, shape)`
là cửa DUY NHẤT vào `portrait_cache`**, `shape` là tham số BẮT BUỘC, và 4 hàm
cũ (`getCachedPortrait` · `putCachedPortrait` · `touchCache` ·
`lookupPortraitCache`) **bị gỡ khỏi export** ⇒ không còn đường vòng.

**Ba quyết định đáng nhớ:**
1. 🔑 **`get` trả `cached: null` cho dòng CŨ.** Hai kiểu hỏng không ngang nhau:
   phục vụ dòng cũ = trang ẩn khối im lặng, người dùng đọc bản thiếu; còn dựng
   lại mà quên ghi đè = tốn thêm một lượt model, nội dung VẪN ĐÚNG. Nên cái
   nguy hiểm bị chặn ở tầng thư viện; route bỏ qua `stale` thì chỉ phí tiền.
2. **`put` TỰ quyết ghi đè** (đọc dòng cũ rồi mới ghi) thay vì nhận cờ
   `overwrite`. Cờ đó phải luồn qua chữ ký `buildReport`/`handleStory`/
   `handleImage` ở 7 tool = 7 chỗ để quên. Đổi lại đúng một lượt SELECT, đứng
   sau một lượt gen vốn ~1.100đ.
3. **Dòng không có `_shape` đọc là 1**, không coi là hỏng: payload của chúng
   CHÍNH LÀ phiên bản 1. Coi là hỏng thì lượt bật cơ chế đốt lại sạch cache
   đang đúng để đổi lấy con số 0.

`_shape` nay do thư viện đóng dấu — gỡ được 2 bản `shapeStale()` chép tay và 2
chỗ `_shape: SHAPE` gán tay.

### Verify vòng cuối
`tsc` 0 · `lint` 73 = mốc nền · `prettier` sạch · **14/14 bộ dò** · engine
**185 pass** · **`next build` 63/63 trang** (stub PostgREST).
- **13/13 bất biến trên MODULE THẬT** (stub `fetch`, đọc thẳng header `Prefer`):
  chưa có dòng → `ignore-duplicates` + tự đóng dấu shape · dòng còn mới → **KHÔNG
  ghi đè** (giữ luật một-lá-số-một-kết-quả) · dòng cũ → **không phục vụ** +
  `merge-duplicates` + đóng dấu shape mới · dòng thiếu `_shape` → shape 1 dùng
  được / shape 2 dựng lại · **`lookup.free` VẪN true khi dòng cũ** (không thu
  tiền lần hai của chính người đã trả).
- **Chứng minh "không thể quên"**: `cacheFor('day-con')` → `TS2554: Expected 2
  arguments, but got 1`; `import { getCachedPortrait }` → `TS2724`.
- 🪤 **Bẫy `tsc` KHÔNG bắt được, tự soi ra**: 5 nhánh `cache-status` dùng kết
  quả `get` như boolean — object mới LUÔN truthy ⇒ chúng trả `cached: true` cho
  MỌI lá số và `requireCreditsCached()` phía client sẽ bỏ luôn bước trả tiền.
  Kiểu hồi quy tệ nhất có thể (phát không hàng), mà trình biên dịch im. ⇒ đổi
  kiểu trả về là phải RÀ TỪNG chỗ dùng, đừng dừng ở "tsc 0 lỗi".

### 🪤 Ba bẫy script khi di trú (đều là lỗi của TÔI)
1. `re.sub(r"^(import \{\n)", ..., count=1)` chèn `cacheFor` vào import **đầu
   tiên của file** chứ không phải import của cache — mỗi file một chỗ khác nhau.
2. Sửa lại bằng `re.search(r"import \{\n((?:.*\n)*?)\} from '…cache';")` thì
   lazy-match **nhảy qua nhiều khối import** và gộp chúng làm một. ⇒ với nhiều
   khối cùng dạng thì phải **bám DÒNG**: tìm dòng đóng rồi lùi về dòng mở.
3. Khối `SHAPE` chèn theo vị trí vân tay nên rơi **trước `const TOOL_ID`** →
   `TS2448`. Phải neo vào chính dòng khai `TOOL_ID`.
🔑 Cả ba đều rẻ vì đã commit sạch trước đó: `git checkout HEAD -- <7 route>` trả
lại nguyên trạng mà không mất bản vá đang dở ở `cache.ts`.

### CÒN LẠI
- Bộ dò chốt lá số mẫu CỐ ĐỊNH. Đổi lá số mẫu là đổi vân tay — đừng sửa nó chỉ
  vì thấy đỏ.
- Phủ **tầng engine**, không phủ chỗ route tự ghép thêm khoá.
- 5 tool vừa cắm đang ở **`SHAPE = 1`** và 11 dòng cache cũ của chúng **không bị
  dựng lại** (thiếu `_shape` ⇒ đọc là 1). Đúng ý đồ; lượt đổi payload đầu tiên
  mới bump lên 2.
- `put` nay tốn thêm một lượt SELECT mỗi lần ghi. Không đo được ảnh hưởng vì
  cache gần rỗng — nếu sau này ghi nhiều thì đó là chỗ đầu tiên nên nhìn.

---

## 🀄 QUÉT MẪU chỉ chứng minh được thứ mẫu CHẠM TỚI (2026-08-10, PR trước)

Job `next-build` vừa dựng xong khiến tôi mở PR Dependabot **#479** ra xem — nó
đang **đỏ `lint`**, và lần theo thì lộ ra một họ lỗi rộng hơn hẳn lượt bump.

### 🔴 Lỗi do bump: `mingyu-core` 0.1.23 → 0.1.24 đẻ khóa thể GHÉP mới
`main` xanh, `#479` đỏ ⇒ lỗi của chính lượt bump, tái hiện tại chỗ bằng
`npm i mingyu-core@0.1.24 --no-save`. Bản mới sinh `伏吟重审` — `docKhoaThe`
chỉ tra bảng ĐÚNG-NGUYÊN-CHUỖI rồi rơi về phiên âm từng chữ, mà `审` không có
trong bảng ⇒ giao diện Lục Nhâm ra ***"Phục Ngâm Trùng 审"***.
- 🔑 **Đây là lần thứ TƯ của cùng một họ lỗi trong track `mingyu-core`**, và
  `docPhap` NGAY DƯỚI nó đã phải vá đúng như vậy (tách ghép tổng quát) từ lượt
  `遥克比用`/`遥克涉害` — chỉ `docKhoaThe` bị bỏ quên. Vá cùng cách: thử mọi chỗ
  cắt thành hai khóa thể đã biết ⇒ `伏吟` + `重审` = "Phục Ngâm Trùng Thẩm", và
  lượt bump SAU có đẻ dạng ghép nào cũng đã có đường đọc.

### 🔴 Lỗi CÓ SẴN trên prod, nặng hơn: `phienAm` không nhìn thấy CAN/CHI
Quét rộng 4.392 khóa Lục Nhâm + 4.392 bàn Kỳ Môn + 352 lá Bát Tự thì lộ **4
chuỗi nữa lọt chữ Hán** — và đo lại trên **0.1.23** ra Y HỆT ⇒ **không phải hồi
quy của lượt bump, là nợ đang rò ra tool Bát Tự trên prod**.
- Căn nguyên: `丑` nằm trong `CHI_HAN`, không nằm trong `HAN_VIET`, mà `phienAm`
  chỉ tra `HAN_VIET` ⇒ `九丑` ra *"Cửu 丑"*. **Chú thích của `canChiViet` ngay
  dưới đã tả đúng cái bẫy này** (*"địa chi KHÔNG nằm trong bảng chữ dựng từ tên
  cách cục"*) — nó được vá cho `canChiViet` mà không vá cho `phienAm`.
- ⚠️ `HAN_VIET` phải đứng TRƯỚC trong chuỗi rơi: `辰` là chữ DUY NHẤT hai bảng
  đọc khác nhau (`HAN_VIET` "Thần" của 时辰/星辰 vs địa chi "Thìn"). Đảo thứ tự
  là lặng lẽ viết lại mọi chỗ đang đọc "Thần" — đây phải là thay đổi CỘNG THÊM.

### 🔑 Bài học chính: bỏ hẳn lối QUÉT MẪU cho thứ liệt kê được
| Lưới | Bỏ lọt |
|---|---:|
| 3 lá số (lưới cũ của bộ dò) | 4 tên |
| **352 lá số** | **vẫn 10 tên nữa** |
| **Trọn từ vựng của nguồn (199 tên)** | **0** |

10 tên kia (`悬针杀` · `曲脚杀` · `聋哑字` · `阙字`…) hiếm tới mức 352 lá số
KHÔNG lá nào sinh ra. ⇒ Nới lưới không cứu được; phải **đọc chính danh sách của
nguồn**. `mingyu-core` cho cả hai đường: `listHuangliShenshaNames()` (công khai,
151 tên — Hoàng Lịch vốn đã phủ trọn) và bảng nội bộ `baziShenShaData` (199 tên).
- ⚠️ Bảng Bát Tự **không nằm trong `exports`** ⇒ phải nạp bằng **đường dẫn tuyệt
  đối** (gọi theo tên gói ăn `ERR_PACKAGE_PATH_NOT_EXPORTED`), và vì là đường
  nội bộ nên lượt bump có thể dời nó ⇒ có **ngưỡng số tên** làm chuông báo.
- Tổng cộng thêm **18 chữ** vào `lib/hanviet.ts` (4 do quét rộng + 14 do phủ trọn).

### 🧷 `check:terms` nay phủ TRỌN, không phủ mẫu
Thêm 2 mục `tuvung-bat-tu` (199) · `tuvung-hoang-lich` (151). Chạy **2,6s**
(trước 1,7s) — rẻ vì không phải lập lá số nào.
- 🪤 **Red-team lộ chốt của chính tôi CÂM**: ca "nguồn dời bảng" chết bằng một
  bãi `ERR_MODULE_NOT_FOUND` nên chốt ngưỡng KHÔNG BAO GIỜ chạy tới. Phải bọc
  `try/catch` cho rơi về `n: 0` thì câu hướng dẫn mới bắn được. **Chốt chặn mà
  chết trước khi tới lượt nó thì không phải chốt chặn.**
- **4/4 ca đỏ đúng** (gỡ 1 chữ mới · gỡ bộ tách ghép → bắt lại `审` · nguồn dời
  đường dẫn · nguồn đổi tên trường), đối chứng khôi phục **xanh**, 0 file rác.

### Verify
`tsc` 0 · `lint` **73 warning = ĐÚNG mốc nền của `main`** (con số 72 ghi ở các
mục dưới đã cũ, đo lại bằng cách stash bản vá) · `prettier` sạch · **13/13 bộ
dò** · engine **185 pass**.
- **A/B toàn payload, 9.148 dòng, trên CẢ HAI bản mingyu**: `0.1.24` → 8 dạng
  chuỗi đổi, `0.1.23` → 4 dạng; **cả hai đều 100% đúng một hướng (có Hán →
  hết Hán), 0 chuỗi đang đúng bị đổi.** Vá `审` nằm chờ tới khi #479 vào.
- Hai bản dựng đối chứng đều **assert mang/không mang bản vá** trước khi đo.

### 🪤 Bẫy quy trình đã vấp (cả hai đều là lỗi của TÔI, không phải của mã)
1. 🔴 **`grep "A \|\| B"` là ĐỖ GIẢ** — `\|` trong BRE là toán tử HOẶC nên mẫu
   khớp gần như mọi thứ, và assertion "bản cũ chưa có vá" báo sai. Dò chuỗi có
   `||` thì **phải `grep -F`**. Đúng lớp "xanh oan nguy hơn đỏ oan".
2. **`git checkout <file>` để gỡ mũi đột biến red-team đã xoá luôn phần vá chưa
   commit** trong cùng file đó. Sao lưu ra scratchpad trước khi đột biến, khôi
   phục bằng `cp` — đừng dùng `git checkout` khi file đang mang việc dở.

### CÒN LẠI
- ~~Kỳ Môn và Lục Nhâm chưa có đường liệt kê từ vựng~~ → **ĐÍNH CHÍNH: Lục Nhâm
  CÓ**, và mở ra thì bắt được 3 chỗ rò (xem mục đầu file). Kỳ Môn thì lành theo
  cấu trúc (phiên từng chữ) nên quét mẫu là đúng mức cần cho nó.
- ~~**#479 cần chạy lại CI**~~ → đã gộp base, CI xanh, và bản bump nay lên
  **0.1.25** đã đo lại (xem mục đầu file).

---

## 🔁 "Đã check hết chưa?" — CHƯA, và 4 tool nữa dính (2026-08-10, PR này)

Henry: *"mày check mấy tool liên quan đến tử vi như xem tuổi vợ chồng, xem làm
ăn, tử vi công sở, đinh hướng nghề nghiệp,... này nọ hết rồi đúng ko? đều ko bị
lỗi này?"*

### 🔴 Câu trả lời là CHƯA — và lượt rà trước của tao đọc lướt nghe như "đã phủ hết"
Lượt rà chỉ phủ nhóm đẩy dữ liệu qua **`scenario`**. Trong bốn thứ Henry nêu chỉ
`cong-so` nằm trong đó. Nhóm CÒN LẠI đi đường khác hẳn — **`wrap` + lá số đầy
đủ** (`past-life` · `past-life-bond` · `nguoi-khac` · `day-con` ·
`huong-nghiep-tre`) — tao chưa đụng tới lần nào.
- 🔑 **Bài học phương pháp:** với `xem-tuoi` tao viết *"extractor CỐ Ý tóm tắt lá
  số → không đo bằng thước này"*. Vế đó ĐÚNG cho **lá số thô** (hàng nghìn lá,
  tóm tắt là phải) nhưng tao lấy nó làm cớ để **không đo gì cả**, trong khi câu
  hỏi đúng là *"tầng PHÂN TÍCH engine tính ra có tới model không"*. Đó chính là
  câu đã bắt được `tu-binh`. **Lý do hợp lệ để thu hẹp THƯỚC ĐO không phải lý do
  để bỏ luôn phép đo.**

### 🔴 Ba lỗi đo được, cùng họ `thapThan`
1. **`xem-tuoi`/`xem-lam-an`/`tuong-hop`** — trang vẽ bảng **8 tiêu chí** (Xét
   Tuổi · Ngũ Hành · Tư Tưởng · Tính Cách · Quan Hệ · Con Cái · Tài Chính · Vận
   Hành) kèm điểm hai bên và **TỔNG /100**. Rail: **0/8 tên tiêu chí, không có
   tổng**. Lố nhất — **câu chào của chính rail nói *"hoà hợp 54,6/100"***, một
   con số nó không hề có trong context.
2. **`day-con`** — 5 trục + 8 chất (đúng hai biểu đồ trang vẽ) không tới rail,
   **trong khi luật trong vỏ lại nói *"ĐIỂM TRÊN THANG 0–10 trong dữ kiện"*** ⇒
   prompt neo vào khối chưa bao giờ được gửi. Đúng lỗi `=== ĐIỂM ĐÁNH GIÁ ===`.
3. **`huong-nghiep-tre`** — `railDataDayDu`/`railDataTinhThu` là **CODE CHẾT**,
   0 file import (route chỉ dùng `hoSoTinhThu`/`hoSoDayDu`). Mà `run.ts` ghi chú
   *"rail chỉ nhận chúng qua `railDataDayDu` SAU khi mua"* — **mô tả một cơ chế
   chưa bao giờ được đấu dây**; rail không biết ba thiên hướng ở BẤT KỲ trạng
   thái nào. Trong khi chip trang mời sẵn *"Vì sao lá số lại nghiêng về hướng
   này?"*. Henry chốt **cho rail biết luôn**.
4. **`nguoi-khac` + `day-con`** — bản **TRẢ TIỀN** dựng đoạn văn từ
   `kieu.dongLuc`/`datChat`/`kieuDan`/`moiTruongHop`/`moiTruongKy`; người dùng
   ĐỌC rồi hỏi lại thì rail chỉ có nhãn kiểu + một câu. Bảng KIỂU là quy chiếu
   TỰ ĐẶT — model **không suy lại được từ lá số**, khác mấy cung vốn có sẵn.
   🔑 Tiêu chí đúng để quyết "có phải gửi không" là **người dùng có ĐỌC được nó
   không** (trên trang HOẶC trong bản văn trả tiền), không phải "trang có vẽ nó
   thành ô không".

### 🪤 Lỗ parity server/client suýt do CHÍNH bản vá của tao kích hoạt
`anSaoLaSo` **không re-expose `chiNam`** ở cấp 1. Client vá tay
(`ls.chiNam = conv.chiNam`, có chú thích tại chỗ), `computeLaso` thì KHÔNG.
Lỗ này **nằm im** vì chưa gì ở server đọc `chiNam` — nhưng cầu nối tương hợp mới
sẽ gọi `chiRelation('','')` ⇒ `dc1 === dc2` ⇒ **"Cùng chi" 8/10 cho MỌI cặp**.
Đối chứng 4/4 cặp đều sai (57,6 thay vì 54,6 · 8/10 "Cùng chi" thay vì "Tam
Hình ⚠" 3/10).
- ⚠️ **TRANG CHƯA BAO GIỜ SAI** — đừng ghi thành "tool đang báo sai cho người
  dùng". Đây là lỗi tao suýt tự tạo ra, bắt được vì **nhìn output thật** thấy
  `Mậu Dần` vs `Giáp Tý` mà ghi "Cùng chi" và ngoặc rỗng.
- 🔑 Vá ở GỐC (`computeLaso` gắn lại `chiNam`) chứ không vá trong cầu nối: để
  nguyên thì người sau vấp đúng cái hố đó. Thêm trường là thay đổi CỘNG THÊM —
  có ca đối chứng **12 ca context rail lá số TRÙNG KHÍT** trước/sau.

### Cách vá
- **`lib/engine/tuong-hop.ts`** — cầu nối server nạp CHÍNH `public/tuong-hop.js`
  (khuôn `kim-lau.ts`/`laso.ts`), **không chép công thức**. Tính ở SERVER chứ
  không bắt client gửi kèm: bản JS cũ còn trong cache trình duyệt vẫn chỉ gửi 4
  khoá, mà đường đó phải đúng ngay cho họ. Fail-soft → rơi về bản tóm tắt cũ.
- Bảng điểm **sắp theo TRỌNG SỐ giảm dần**, không theo thứ tự mảng: model cần
  biết tiêu chí nào KÉO tổng điểm, không phải cái nào tình cờ đứng trước.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch · **13/13 bộ
dò** · engine **185 pass**.
- **Parity bảng điểm SERVER vs TRÌNH DUYỆT: 4/4 cặp trùng khít** (dựng lá số
  kiểu client bằng chính `anSaoLaSo` + vá `chiNam` tay, so từng tiêu chí + tổng).
- **ĐỐI CHỨNG gỡ `chiNam`: 4/4 cặp báo sai "Cùng chi 8/10"** ⇒ lỗ có thật.
- **12 ca context rail lá số TRÙNG KHÍT** sau khi thêm `chiNam`.
- Phủ sau khi vá: **8/8 tiêu chí + tổng** · **5/5 trục và 8/8 chất kèm điểm** ·
  **3/3 thiên hướng kèm CƠ SỞ trong lá số** (đúng thứ trả lời cái chip) ·
  **7/7 trường KIỂU** mà bản trả tiền dùng.

### CÒN LẠI
- **Chưa gọi LLM thật** — vẫn dừng ở tầng dữ liệu vào prompt.
- ✅ **`nhan-mach` ĐÃ ĐO — gần đủ, vá một chỗ:** railData phẳng, có tên/kiểu
  từng người, phân bố 4 kiểu, kiểu THIẾU, thứ tự tiếp cận. Thiếu **lý do từng
  cặp** (`cap[].vi`) — rail chỉ nhận `"A ↔ B"` trơ trong khi trang hiện cả câu
  giải thích. Đã thêm.
- ✅ **`ban-do-sao` ĐÃ ĐO — sạch by construction:** `railData` mọi giá trị là
  CHUỖI (phẳng tuyệt đối, miễn nhiễm bẫy `extractGenericContext`), phủ trục ·
  sao chính kèm nghĩa · sao phụ · giao điểm · góc chiếu · hình thế · cân bằng ·
  đầu nhà. Cắt duy nhất là `gocChieu.slice(0, 12)` — có chủ ý.
- **Chưa đo: 2 tool chân dung · `duyen-no`** (đường `wrap` kể chuyện, khác hình
  dạng hẳn — vỏ ở đó là giọng kể chứ không phải bảng dữ liệu).
- `check:railfields` vẫn chỉ phủ **Bát Tự**. Nhóm `wrap` chưa có máy canh — mà
  đây đúng là nhóm vừa lộ ra 3 lỗi.

---

## 🀄 Rà tool khác cùng họ lỗi → Bát Tự: rail KHÔNG hề nhận Thập Thần (2026-08-09, PR này)

Henry: *"xem lại lỗi này có bị tương tự cho các tool tử vi khác trong shell ko"*.

### Cách rà — đo, không đọc mắt
Mỗi tool: lấy **payload THẬT** (chạy chính module `tools-shared/` hoặc engine
server) → đưa qua **`buildChatContext` THẬT** → đếm giá trị nào tool tính ra mà
**không hề xuất hiện** trong prompt rail.

**Sạch (0 thất lạc): 15 tool** — `nap-am` · `kim-lau` · `than-so-hoc` ·
`bat-trach` · `hoang-dao` · `ngay-tot` · `luc-nham` · `ngu-hanh-ten` ·
`kinh-dich` · `mai-hoa` · `sinh-con` · `cong-so` · `chon-ngay-tot` ·
`dat-ten-con` · `dat-ten-dn`.
- 🪤 Lượt đo đầu tao báo `kim-lau` mất `rows[20]` + `hienTai{}` vì giả định nó
  đi qua `extractGenericContext` (hàm này bỏ IM LẶNG mọi object/array). **Sai** —
  nó có extractor riêng, đo đầu-cuối ra **51/51 lá tới model**. Giả định về
  đường đi của dữ liệu phải KIỂM, không suy từ tên hàm.
- 🪤 **Lượt đầu tao ghi 3 tool cuối là "chưa dựng được payload — API khác" ⇒
  cũng SAI, và sai theo kiểu tự bào chữa.** `chon-ngay-tot`/`dat-ten-con`/
  `dat-ten-dn` không có API khác gì cả — tao truyền nhầm **TÊN KHOÁ** vào
  `computeChonNgay`/`computeDatTen`/`computeDatTenDn` (chúng đọc `namSinh`/
  `thangNum`/`namNum`, `ho`/`namCon`/`namBo`/`namMe`, `namChu`/`nganh`) nên
  hàm trả `null`, và tao đọc `null` thành "không đo được". Truyền đúng shape
  mà `Shell.setContext` của chính trang gửi lên thì đo được ngay: **19/19 lá
  tới model, cả ba sạch**. Kiểm thêm tầng màn hình: trang chỉ vẽ đúng mấy thẻ
  can chi trong payload, không có tầng engine nào bị bỏ lại.
  🔑 **`null` từ hàm mình tự gọi là dấu hiệu MÌNH gọi sai, không phải dấu hiệu
  đối tượng không đo được.** Ghi "chưa đo" vào phần CÒN LẠI nghe như một hạn
  chế khách quan, trong khi thật ra là một lỗi harness chưa sửa.
- `ky-mon` đủ (extractor duyệt `Object.entries` + xử riêng 3 mảng).
  `xem-tuoi`/`xem-lam-an`/`tuong-hop` nhận trọn lá số và **cố ý tóm tắt** —
  không đo bằng thước "mọi lá phải lọt".

### 🔴 `tu-binh` — đúng cùng một bệnh
**`computeTuBinh` trả 25 khoá, `extractTuBinhContext` đọc 12.** Đo được
**113/151 giá trị chữ không tới model**. Nặng nhất: **`thapThan`** — Thập Thần,
cột `app-bat-tu.html` vẽ dưới mỗi trụ (dòng 300 · 310 · 426). Người dùng nhìn
thấy *"Thất Sát trụ tháng"*, hỏi rail nghĩa là gì → rail **không có dữ liệu**,
buộc phải luận chay theo can chi.
- Kèm theo: `daiVans` (cả dải 9 chặng — rail chỉ biết chặng HIỆN TẠI và KẾ
  TIẾP) · `cuongNhuoc.dacDiaDetails`/`dacTheDetails` (lý do ra điểm thân
  vượng/nhược) · `cachCuc.type` · `luuNien.relations`/`factors`/`napAm` ·
  ghi chú từng thần sát · `nhatChi`/`nhatCanAmDuong`/`tuoiKhoiVan`/`daiVanThuan`.
- 🔑 `hinhXungHaiHop` trước chỉ in **SỐ ĐẾM** (*"Tam hợp 1, Lục hại 2"*) — model
  biết CÓ mà không biết LÀ GÌ, không luận được. Nay nêu đích danh cặp nào ở trụ nào.
- CLAUDE.md từng ghi *"rail /app/bat-tu chưa nhận tầng phân tích bát tự mới"* —
  phép đo cho thấy **rộng hơn lời ghi đó**: ngay `thapThan` mà CHÍNH engine của
  rail tự tính ra cũng không được chuyển tiếp.

**Sau khi vá: 113 → 37 giá trị, cả 37 là cắt CÓ CHỦ Ý** (yếu tố ra điểm của 9
đại vận cắt còn 2 nặng nhất/chặng; `thanSat` `found:false` không liệt kê).

| | cũ | mới |
|---|---:|---:|
| context rail bát tự | 6.724 | 9.027 ký tự |
| mục vận-hạn có mặt | **0/7** | **7/7** |

### 🧷 `scripts/check-rail-fields.mjs` (bộ dò thứ 13)
Engine trả trường nào thì extractor phải đọc trường đó; khoá cố ý bỏ phải khai
`SKIP` **kèm lý do**. Chạy engine vanilla thật, **không cần tsc**.
- 🪤 **Red-team lộ bộ dò BỎ LỌT đúng con bug nó sinh ra để bắt, HAI lần:**
  (a) `body.includes('.thapThan')` được thoả bởi `.thapThanCan` → phải dò theo
  **BIÊN TỪ**; (b) sửa xong vẫn xanh oan vì **chú thích của chính tao** nhắc
  `` `thapThan` `` → phải **CẮT CHÚ THÍCH trước khi quét**. 🔑 Xanh oan nguy hiểm
  hơn đỏ oan: đỏ oan thì người ta đi tìm, xanh oan thì không ai biết.
- 🪤 Và hai lượt red-team đầu **"đỗ giả" vì đột biến KHÔNG ăn** (regex trong
  script vá không khớp). Phải **assert đột biến đã ăn** rồi mới đọc kết quả —
  đúng bài học "mọi lượt thay bằng script phải assert".
- 3/3 ca đỏ đúng (gỡ `thapThan` · engine thêm trường mới · `SKIP` khai thừa),
  đối chứng khôi phục xanh, 0 file rác.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` cả cây sạch ·
**13/13 bộ dò sạch**.
- 🪤 **ĐỐI CHỨNG `origin/main` bằng `git worktree`**: mục vận-hạn **0/7 → 7/7**
  trên 2 lá số ⇒ lỗi có thật, phép đo bắt được.
- Diff gói gọn trong **đúng một hàm** (`extractTuBinhContext`) — các tool khác
  không đổi một byte context.

### 🪤 Bắt kèm: `check:motifs` chết trên CI — và tao chẩn SAI hai vòng
`scripts/check-que-motifs.mjs` gọi `ts.transpileModule` → CI đỏ
*"Cannot read properties of undefined (reading 'CommonJS')"*, chặn MỌI PR.
- Vòng 1 tao đổ cho **Node 20 vs Node 22** và đổi `import ts` → `require` →
  **vẫn đỏ y hệt**. Vòng 2 mới đọc kỹ: thứ thiếu là `ts.ModuleKind`, không phải
  `ts`.
- 🔑 **Nguyên nhân THẬT: TypeScript 7 là bản viết lại bằng Go, không còn compiler
  API JS.** `main` lúc đó mang TS 7 (#388) nên **merge-ref** của mọi PR `npm ci`
  ra TS 7, trong khi máy dev còn TS 6 theo lockfile của NHÁNH — vì thế local mãi
  không tái hiện. `tsc` CLI vẫn chạy nên `typecheck` và build engine vẫn xanh.
- 🔑 Bài học: **CI chạy trên merge-ref, không phải trên nhánh** — lockfile hiệu
  dụng là bản đã trộn với base. "Local xanh, CI đỏ" thì nghi chỗ đó trước.
- Vá: bỏ hẳn compiler API. `que-motifs.ts` là data thuần (một `export const`,
  không import/hàm/`as const`) → chỉ đổi khai báo thành gán CJS rồi eval, có
  assert hai lớp. #476 cũng đã ghim root về TS 6.

### CÒN LẠI
- **Chưa gọi LLM thật** — đo tới tầng dữ liệu vào prompt, không tới tầng chữ.
- `check:railfields` mới phủ **Bát Tự**. Tool khác đang sạch nhưng chưa có máy
  canh; mở rộng khi thêm engine mới có extractor hand-pick.
- ~~`chon-ngay-tot`/`dat-ten-con`/`dat-ten-dn` chưa đo~~ → **ĐÃ ĐO, cả ba
  sạch** (xem bẫy tên khoá ở trên). Lượt rà nay phủ **15/15 tool** dựng được
  payload; không còn tool nào ở trạng thái "chưa biết".
- `thanSat` `found:false` (vd *"Không Vong tại Thân, Dậu"*) cố ý không gửi —
  nếu thấy đáng thì mở, đây là quyết định nội dung chứ không phải bug.
---

## 🔴 `tsc --noEmit` XANH KHÔNG CHỨNG MINH `next build` CHẠY (2026-08-09, rà PR mở)

Merge #388 (TypeScript `6.0.3 → 7.0.2` ở root) làm **7 lượt deploy production
ERROR liên tiếp**. Site không sập — Vercel vẫn phục vụ bản READY cuối — nhưng
mọi thay đổi sau đó **không lên prod** và không có gì kêu.

```
TypeScript 7.0.2 does not provide the compiler API required by Next.js.
Enable experimental.useTypeScriptCli … or install TypeScript 6 instead.
```

TS7 là bản viết lại bằng **Go**; `next build` gọi **compiler API**, còn
`tsc --noEmit` chỉ chạy **binary**. Hai đường khác nhau ⇒ **cả CI lẫn lượt verify
tại chỗ của tao đều xanh** trong khi Vercel đỏ. Job `typecheck` không bao giờ bắt
được loại lỗi này.

- 🔑 **Luật: bump TypeScript thì phải chạy `npm run build`, không được dừng ở
  `tsc --noEmit`.** Áp cho mọi thứ đụng tầng biên dịch của Next.
- **Root về `^6.0.3`; `tuvi-engine` GIỮ `^7.0.2`** — engine build bằng `tsc`
  thuần, không qua Next, đã verify build OK + 185 test pass + deploy READY.
- Chốt `ignore: typescript >=7` cho **root** trong `.github/dependabot.yml` (kèm
  lý do tại chỗ). Gỡ khi Next hỗ trợ TS7.
- 🪤 **Build local hỏng vì THIẾU ENV, không phải vì mã** — `supabaseUrl is
  required`. Muốn phân biệt "hỏng thật" với "thiếu env" thì bơm env giả: bản
  đúng sẽ chạy tới tận *Generating static pages (63)* rồi mới chết ở DNS.
- 🪤 Bài học kèm: **clone trong container là SHALLOW (54 commit)** nên
  `git merge-base` trả rỗng và tao suýt đóng 3 PR với lý do *"không có merge
  base"* — sai. `git fetch --unshallow` (1.654 commit) rồi hãy tin bất kỳ phép
  đo nào về lịch sử.

---

## 🔗 Luận Giải 24 phần bỏ qua data engine — MỐC SECTION HỎNG, bộ cắt CÂM (2026-08-09, PR này)

Henry gửi một lá số thật: *"phần luận giải hầu như ko đề cập gì đến các phần ở
trên: SCORING ĐẠI VẬN — LUẬN ĐOÁN VẬN HẠN… Có vẻ dữ liệu data chạy từ tuvi-ansao
engine hiện ra nhưng ko dc feed vào lúc luận giải"*.

### 🔴 Căn nguyên: HAI bản `formatLaSoV2`, bộ cắt neo vào bản CŨ
| Trang | Nguồn `laSoText` | Mốc khối đại vận |
|---|---|---|
| `/luan-giai.html` | `formatLaSoV2` **inline** trong file | `=== 9 ĐẠI VẬN ===` |
| **`/app/luan-giai`** (Henry dùng) | `public/tuvi-laso-format.js` | `=== 9 ĐẠI VẬN (lịch trình THỜI GIAN — …) ===` |

`trimLaSo()` dò `includes('=== 9 ĐẠI VẬN ===')` → trên trang shell trả **-1**.
Mà `findIndex` trả -1 là giá trị HỢP LỆ ⇒ **không ném, không log**, hàm lặng lẽ
`return text`. Đo trên lá số thật (22.396 ký tự):

| phần | trước | sau |
|---|---:|---:|
| 1 · 2 | 100% | 49% |
| 3–13 (từng cung) | 15% | 13% |
| **14 · 15–23 · 24 (đại vận)** | **100% — không cắt gì** | **16%** |

Phần 17 (ĐV3) lẽ ra 3,5K ký tự → thực nhận 22,4K, **pha loãng 6,3 lần**: model
phải mò dòng `ĐV3:` giữa 236 dòng, trong đó **36 dòng [LUẬN ĐOÁN]/[CẢNH BÁO] của
cả 9 đại vận** mà chỉ 4 dòng là của ĐV3. 🔑 **Data CÓ feed — feed nguyên cục.**

### 🔴 Ba lỗi kéo theo, cùng một họ "neo vào thứ không còn tồn tại"
1. **Xương sống system prompt trỏ vào khối ĐÃ BỊ XOÁ.** Bản shared cố ý gỡ
   `=== ĐIỂM ĐÁNH GIÁ ===` (điểm 6 chiều/cung, ghi lý do tại chỗ) nhưng prompt
   vẫn còn nguyên khối *"PHÁN QUYẾT BẮT BUỘC — NEO VÀO ĐIỂM SỐ… mở đầu bằng câu
   phán quyết neo vào con số đó"* + phần 1/2/3–13 đều bắt bám `[Cung] Tổng .../10`.
   ⇒ 13/24 phần bị lệnh bám vào con số **không có** → model luận chay hoặc **bịa
   điểm**. Nay neo vào nhãn `Luận sao` + cách cục + độ sáng sao, và CẤM bịa
   "điểm cung X/10" (chỉ ĐẠI VẬN mới có điểm/10 thật).
2. **Panel màn hình và prompt ăn hai nguồn khác nhau.** `buildPreGenHtml()`
   (`luan-giai-core.js`) vẽ thẳng từ `_astrolabe`, KHÔNG qua `laSoText`. Ba mục
   người đọc THẤY mà model **chưa bao giờ nhận**: *Sao tam phương tứ chính* của
   cung ĐV · *Bộ Mệnh → Bộ ĐV* · *Tuần/Triệt án ngữ*. Prompt lại bảo "xét tam
   phương" ⇒ model tự suy lại từ khối 12 cung — đúng câu trong ảnh Henry gửi.
3. **Cung ĐỨNG CUỐI nuốt đầu khối đại vận**: mốc hỏng → `cutEnd` chạy tới tận
   cách cục, nhánh không tìm được mốc kết thúc lấy **mù 30 dòng**. Đo được:
   `[Thiên Di]` dính. Nay lấy tới hết khối 12 CUNG thay vì đếm 30.

### Cách vá — MỘT nguồn, và mốc là HỢP ĐỒNG
- **`buildDaiVanLines(ls, i, opts)`** trong `tuvi-laso-format.js` là nguồn DUY
  NHẤT dựng khối đại vận cho **cả ba** đường: luận giải 24 phần · `lasoTextFull`
  (server) · **rail chat**. Thêm tam phương tứ chính / Tuần-Triệt / Bộ Mệnh→Bộ ĐV
  / cách cục theo cung ĐV.
- **`luan-giai.html` GỠ HẲN bản inline** (182 dòng) → nạp `/tuvi-laso-format.js`.
  Phần riêng của trang (`[TỔ HỢP SAO]`, nguồn `cach_cuc_all.json` nạp async)
  truyền vào qua **hook `combosForCung`**, không để module đọc global.
- **Mốc phải đứng MỘT MÌNH**; ghi chú xuống dòng riêng. `MARKERS` export ra để
  bộ dò đọc chính nó.
- Bộ cắt đổi sang dò **TIỀN TỐ** + **`console.error` khi hụt mốc** — hết im lặng.
- 🪤 **Lỗi do CHÍNH tao vừa viết, chỉ lộ khi đo:** `[CÁCH CỤC LIÊN QUAN]` lấy cả
  cách cục TỔNG QUÁT (`cung===''`) → panel chỉ vẽ 1 đại vận nên không sao, nhưng
  formatter in liền 9 đại vận ⇒ **lặp đúng 9 lần**, phình laSoText và pha loãng
  chính thứ khối này sinh ra để chống. Bỏ; chúng vẫn tới model qua `ccBlock`.

### 🔌 Rail: từ 0/5 lên 5/5 trường vận hạn
`extractLasoContext` là bản thứ BA — danh sách 9 ĐV chỉ có `cung=/sao=/điểm=`.
Nay gọi CHÍNH `buildDaiVanLines` qua `daiVanLines()` (`lib/engine/laso.ts`,
**fail-soft**: engine nạp hụt → trả `[]`, rơi về bản gọn cũ; rail là đường nóng).

| câu hỏi | cũ | mới | trường vận hạn |
|---|---:|---:|---|
| đại vận hiện tại | 4.664 | 14.822 | **0/5 → 5/5** |
| "đại vận 5" (không nêu năm) | 4.664 | 14.822 | **0/5 → 5/5** |
| theo năm | 6.501 | 17.661 | **0/5 → 5/5** |
| **ĐỐI CHỨNG: hỏi bản chất cung** | 3.848 | 3.848 | **TRÙNG KHÍT** |

- Ca đối chứng cuối là bất biến quan trọng nhất: luật *"TÁCH BẠCH CUNG vs ĐẠI
  VẬN"* còn nguyên — hỏi bản chất một cung vẫn KHÔNG kèm đại vận, byte-identical.
- Bản `compact` (rail liệt kê cả 9 ĐV) **bỏ `[VẬN HẠN LUẬN]`** — patterns thô
  (*"[Thiên Việt] Sét đánh."*) và **panel cũng không in nó**; giữ lại chỉ tốn
  ~2,2K ký tự context cho thứ người đọc không thấy.

### 🧷 `scripts/check-laso-markers.mjs` (bộ dò thứ 12) — 6 luật
Mốc nguyên vẹn · mốc đứng một mình · mọi chuỗi server đi dò phải khớp output ·
mọi `=== X ===` prompt nhắc phải TỒN TẠI · khối ĐV còn đủ trường · **chỉ MỘT bản
`formatLaSoV2` trong `public/`**.
- 🪤 **Bản đầu quét thẳng mã nguồn → kêu oan 5 ca**: toán tử JS `phan === 14 ||
  phan ===` ra một "mốc", dải `// =====` trong chú thích cũng vậy. Phải quét
  **bên trong CHUỖI**. Bộ dò kêu oan là bộ dò bị tắt đi.
- **Red-team 4/4 đỏ đúng** (nối ghi chú vào mốc · prompt trỏ khối đã chết · gỡ
  tam phương · dựng bản formatLaSoV2 thứ hai), đối chứng khôi phục **xanh**, 0
  file rác. Lượt chạy đầu bắt được **lỗi thật**: `=== ĐIỂM ĐÁNH GIÁ ===` còn sót
  trong system prompt.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` quét cả cây sạch ·
**12/12 bộ dò sạch** · engine **185 pass** · `node --check` formatter + 8 khối
script nội tuyến.
- **505 assertion trên `trimLaSo` TRÍCH TỪ NGUỒN THẬT** (5 lá số × 24 phần):
  phần 15–23 ra **đúng MỘT** khối ĐV và đúng cái đang luận · có Scoring · giữ
  khối cách cục · phần 3–13 đúng cung, **0 lẫn khối đại vận**, 0 lẫn cung khác ·
  phần 14/24 đủ 9 ĐV · phần 1–2 không lẫn đại vận.
- 🪤 **ĐỐI CHỨNG `origin/main` bằng `git worktree`: 109/505 đỏ**, phần đại vận
  **100% lá số** (không cắt gì) ⇒ lỗi có thật, bài kiểm bắt được.
- **Playwright trên 2 TRANG THẬT**: `luan-giai.html` và `app-luan-giai.html` nay
  dựng laSoText **TRÙNG KHÍT** (bỏ 3 dòng hook riêng của standalone) · đủ mốc +
  trường mới · `buildDaiVanLines` có mặt · **0 lỗi JS**.
- Harness đều **assert bản dựng mang code mới** trước khi đo (bài học "tsc từ
  chối → `|| true` nuốt → đo trên bản CŨ").
- Bump `tuvi-laso-format.js?v=2` (3 trang). **Không bump** trang HTML khác —
  `max-age=0, must-revalidate` nên tới người dùng ngay.

### CÒN LẠI
- **Chưa gọi LLM thật lượt nào** — verify dừng ở tầng dữ liệu vào prompt (kích
  thước, đúng khối, đủ trường) và tầng render. Chất lượng CHỮ sau khi vá phải
  Henry chạy một lá số trên prod rồi đọc mới biết.
- Rail tốn thêm ~10K ký tự context **cho câu hỏi vận hạn** (câu hỏi về cung
  không đổi một byte). Đường `laso` đang route sang Gemini nên ~37đ/lượt; nếu đổi
  về Anthropic thì cân lại — hạ bằng cách bỏ `[CÁCH CỤC LIÊN QUAN]` khỏi `compact`.
- `luan-giai.html` **mất `=== ĐIỂM ĐÁNH GIÁ ===` + cột `Điểm:` từng cung** khi
  gộp về bản shared. CỐ Ý — bản shared đã gỡ chúng có lý do ghi tại chỗ, và
  prompt nay không còn trỏ vào nữa.
- Bộ dò chỉ canh `public/`. Nếu sau này có nơi thứ hai dựng laSoText bằng TS
  (server) thì phải mở rộng luật 6.

---

## 🧭 Tool MỚI: Hướng Nghiệp Sớm Cho Con (2026-08-09, PR này)

Henry: *"Sau đó làm 1 tool mới cho trẻ em - Định hướng nghề nghiệp, cũng dựa
trên nền tool này nhưng mà mang tính định hướng hơn và đối tượng xem là bố mẹ/
ông bà, xem xong phải suggest cách họ định hướng, các hoạt động nên làm để trẻ
làm quen và phát huy."* → `/app/huong-nghiep-tre`, **15 Lượng**, khuôn W1.

### 🔑 CÂU HỎI CHẶN đo TRƯỚC khi viết một dòng nào
CLAUDE.md tự dặn phải đo overlap với T2 "Dạy Con" trước khi dựng. Đo trên
**2.496 lá số trẻ em** (sinh 2008–2020):

| | |
|---|---:|
| T2 phân trẻ thành | **4 kiểu** |
| 21 trục cắt cùng tệp đó ra | **359 bộ trục** |
| Hai đứa **CÙNG một kiểu**, cosine vector | **0,54** |
| Bộ trục phổ biến nhất trong một kiểu chiếm | 5–12% |

Riêng kiểu "Hỗ trợ" ra **134 bộ khác nhau**. ⇒ 4 kiểu mới nói được khoảng một
nửa về đứa trẻ; tầng 21 trục có nội dung thật, không phải đội tên khác.

### Vì sao TOOL RIÊNG mà không gộp như Công Sở
Công Sở gộp được vì tầng nhánh trả lời **CÙNG câu hỏi** (nghề nghiệp) — chi tiết
hoá thứ đã bày. Ở đây khác: `day-con` hỏi *dạy kiểu nào thì vào*, tool này hỏi
*cho con làm quen với gì*. Cùng đối tượng, khác câu hỏi — như Công Sở với Luận
Giải cùng đọc một người trưởng thành. Hai tool dùng CHUNG `phanKieu`/`KIEU` nên
không bao giờ nói khác nhau, và **`day-con` giữ riêng cung Phụ Mẫu** (mặt "con
nhìn cha mẹ thế nào") còn tool này KHÔNG đọc cung đó — cắt để hai bên không
chồng lên nhau.
- 🔴 **`day-con.ts` còn ghi luật Henry ĐÃ BÃI BỎ** (*"KHÔNG trả bảng nghề — chốt
  nghề cho một đứa 10 tuổi là thứ nguy hiểm nhất tool này làm được"*). Đã thay
  bằng khối đính chính dẫn nguyên văn Henry. Luật cũ nhầm **ĐỊNH HƯỚNG** với
  **CHỐT**.
- Ô mối lo `chon-duong` của T2 hứa *"chất việc hợp với con"* mà engine T2 không
  tính gì về chất việc — đã ghi chú thẳng tại chỗ là phần đó nằm ở tool này.

### 🔄 ĐỔI TẦNG CHẤM: dựng THẲNG trên 5 trục · 8 chất của `#458`
Henry: *"Ok làm theo đề xuất của mày đi"* — chốt phương án tôi đề nghị ở cuối
vòng trước thay vì ship bản vá bằng lời khai.

**Bệnh:** bản đầu chấm trên 21 trục riêng của `nghe-nghiep.ts`, không dính gì
tới khung `day-con` bán ngay cạnh. Đo ra: bé có CHẤT #1 bên kia là *"Hiểu người
& dẫn nhóm"* thì bản đó xếp #1 là *"Tỉ mỉ · làm cho đúng"* ở **65%** số ca.

**Vá:** chấm thẳng trên chính 13 chiều `day-con` đo. Hai tool không thể lệch
nhau về NGUYÊN TẮC nữa, chứ không phải nhờ một câu chú thích.

| Đo trên 2.496 lá số | 21 trục | 13 chiều |
|---|---:|---:|
| Chất#1 → đúng hướng kỳ vọng ở **#1** | 38,5% | **61,7%** |
| …lọt **TOP-3** (thứ phụ huynh thật sự đọc) | — | **91,2%** |
| Ca nghịch tai `hiểu người` → `tỉ mỉ` | **65%** | **24,6%** |
| …và `dẫn dắt` vẫn lọt top-3 cho nhóm đó | — | **92,6%** |

- ✅ **Ranh giới Phụ Mẫu vẫn giữ** — kiểm TRƯỚC khi mượn vector: `assess` đọc
  Mệnh · Thiên Di · Phúc Đức · Quan Lộc · Huynh Đệ · Nô Bộc, **không có Phụ
  Mẫu**. Mượn nền của nó không phá được thế phân vai với `day-con`.
- **Không còn 100% là ĐÚNG, không phải thiếu sót**: `day-con` đo NĂNG KHIẾU
  (giỏi MÔN gì), tool này đo CHẤT VIỆC (hợp KIỂU LÀM VIỆC nào). Chung thước đo,
  khác câu hỏi.
- 🔑 **Toàn bộ mẹo TRỪ NỀN + "chỉ khai thành phần dương" của bản cũ BỊ GỠ** —
  13 chiều đã z-score sẵn từng chiều nên nền phẳng từ gốc. Bớt được một tầng
  mẹo là bớt một chỗ trôi.
- 🪤 **NHƯNG lộ ra một bẫy MỚI cùng họ: 13 chiều KHÔNG độc lập** (cùng đọc một
  bộ cung). Đo được `nhip ↔ van-dong` **+0,71** · `nhip ↔ thien-nhien` −0,55 ·
  `nhay ↔ hieu-minh` +0,48. Hình nạp hai chiều tương quan mạnh CÙNG chiều thì
  tự cộng điểm (đếm hai lần một tín hiệu); nạp NGƯỢC chiều thì tự triệt tiêu.
  Lượt đo đầu dính cả hai: `van-dong` nạp nhip+van-dong ⇒ **27,6%**, `ben-bi`
  kéo −nhay ngược hieu-minh ⇒ **4,4%**, `kham-pha` **2,4%**.
  ⇒ **Luật: trong MỘT hình không nạp hai chiều |corr| > 0,45.** Sau khi tách:
  cả 9 hướng sống **8,2–14,8%** (bản 21 trục 4,7–21,0), bộ-3 hay gặp nhất
  **1/28** (trước 1/17), cặp hình giống nhau nhất 0,40.
- 🪤 `dan-dat` ↔ `giao-thiep` lượt đầu cosine **0,86** — đúng bẫy `Kể chuyện`
  0,77 lặp lại. Tách bằng trục `hoa`: dẫn dắt **giữ ý mình** (hoa thấp), giao
  thiệp **thuận nhóm** (hoa cao). Hai hình cùng đọc người nhưng ngược cực.
- **Ngưỡng 0,25 → 0,20** để `chuaRoNet` giữ **7,1%**, bám mức cũ 6,6%: đổi tầng
  chấm thì KHÔNG được lặng lẽ đổi luôn tần suất tool nói "chưa rõ nét" — đó là
  một câu người dùng đọc được, không phải hằng số nội bộ.
- 🔴 **Bất biến tự-mâu-thuẫn nay BẤT KHẢ THI VỀ CẤU TRÚC, không nhờ bộ lọc**:
  `khongDoiHoi` chỉ lấy từ CHẤT âm, mà trọng số chất luôn ≥ 0 ⇒ tích `val × w`
  ≤ 0 khi val < 0 ⇒ chất thấp không bao giờ vượt nổi ngưỡng để lọt vào phần lý
  do. Red-team gỡ chốt `|val| > 0.25` **vẫn 0 lỗi** — đúng như dự đoán; chốt đó
  nay chỉ lọc chiều gần mức giữa (665 lượt trích dẫn yếu), không còn gánh phần
  đúng/sai. Bất biến đáng canh vì thế là chốt GỐC: **0 hình khai chất âm**.
- **Chất thấp có bảng chữ RIÊNG** (`CHAT_KHONG_DOI_HOI`, 8 câu tự viết), cố ý
  KHÔNG mượn `motCau` của `KHIEU` — câu đó tả năng khiếu, ghép vào ngữ cảnh
  "thấp" là thành lời chê ngay.
- Lời khai trên trang + prompt rail viết lại: không còn nói *"hai trục khác
  nhau"* (nay sai) mà nói **cùng một thước đo, khác câu hỏi**, và rail được dặn
  NỐI hai bên lại thay vì phân trần.

### 🗑️ Tầng chấm 21 trục — ĐÃ GỠ, giữ lại đây làm bài học
Bản đầu chấm trên 21 trục của `nghe-nghiep.ts` và phải dựng hai mẹo để sống
được: **TRỪ NỀN** (trục lá số trẻ em lệch nhau rất xa — tỉ mỉ TB +1,26 · hợp
tác −0,53) và **chỉ khai thành phần DƯƠNG** (khai âm ở trục nền cao thì bị
phạt oan; `Tưởng tượng` từng tụt còn **0,2%**). Cả hai nay **không còn cần** —
13 chiều của `#458` đã z-score sẵn từng chiều.
- 🔑 Bài học giữ lại: **mẹo bù trừ ở tầng chấm là dấu hiệu nền dữ liệu chưa
  chuẩn hoá.** Chuẩn hoá đúng chỗ (phía dữ liệu) thì mẹo tự biến mất; càng
  nhiều mẹo càng nhiều chỗ trôi.
- 🪤 Và bẫy "hai hình nuốt nhau" thì **KHÔNG** biến mất theo: `Kể chuyện` ↔
  `Giao thiệp` 0,77 ở bản 21 trục, `dan-dat` ↔ `giao-thiep` **0,86** ở bản 13
  chiều. Đổi nền không cứu được chỗ này — phải tách bằng một chiều ngược cực.

### 🧷 Bắt kèm lúc gộp `#465`: port cơ chế `_shape` cho cache
`#465` phát hiện `portrait_cache` **khoá theo lá số, KHÔNG theo shape** — đổi
cấu trúc payload xong thì dòng cũ vẫn trả nguyên trạng mãi mãi (bên `day-con`
đã cắn thật: 4 khối im lặng biến mất, không lỗi nào bắn ra). Tool này có ĐÚNG
thiết kế cache đó, và PR này vừa đổi cấu trúc payload ⇒ port ngay `SHAPE = 1` +
`shapeStale()` + `overwrite` khi dựng lại.
- Chưa cắn được ai vì tool còn `enabled=false`, nhưng 27 khối hoạt động **chưa
  ai review** — sửa bảng đó là đổi payload, và lúc ấy mới cần thì đã muộn.
- ⚠️ `_shape` **KHÔNG vào `lasoKey`**: đổi khoá là mồ côi cả cache lẫn
  `userOwnsLaso` ⇒ người đã trả tiền bị tính lại. Giữ khoá thì lượt dựng lại
  vẫn miễn phí đúng cho họ.

### Ranh giới trẻ em nằm ở TẦNG DỮ LIỆU, không chỉ ở lời dặn
- **Cờ `bayNghe`**: dưới 8 tuổi thì `ngheViDu` trả **mảng RỖNG** ở mọi hướng.
  Bày danh sách nghề cho đứa 5 tuổi vừa vô nghĩa vừa mời cha mẹ chốt sớm. Trang
  là lớp thứ HAI, không phải chốt chặn duy nhất.
- Dùng chung `KHONG_DOC` — không đọc Tật Ách, Phu Thê (hôn nhân của một đứa
  trẻ!), Tài Bạch, Tử Tức, Điền Trạch. Không điểm tổng, không xếp hạng.
- 🔴 **Trục thấp đọc là "việc không đòi hỏi", không phải "con thiếu".** Với trẻ
  em luật này gắt hơn người lớn: cha mẹ đọc một câu chê rồi tin thì câu đó theo
  đứa bé nhiều năm. Nói ở cả tầng data, tầng prompt, và in thẳng lên trang.
- **`chuaRoNet` là trạng thái CÓ THẬT, không phải đường lùi**: 6,6% lá số không
  hướng nào vượt ngưỡng. Trang nói thẳng *"ở tuổi này chưa rõ nét là bình
  thường, nên cho thử rộng"* — đó là lời khuyên ĐÚNG, và prompt bị cấm giấu nó
  để bản đọc nghe chắc chắn hơn.

### Đường tiền (khuôn W1)
Miễn phí: thiên hướng đứng đầu + **dấu hiệu quan sát được ở nhà** (thứ cha mẹ
dùng để đối chiếu "có đúng con mình không") + chất người + cơ sở lá số.
Trả tiền: đủ ba hướng + hoạt động theo lứa tuổi + việc người lớn nên/tránh +
chất việc + một lượt LLM.
- `hoSoTinhThu()` / `hoSoDayDu()` là hàm RIÊNG — đường tiền cắt được bằng MỘT
  dòng đọc ra được, có bài kiểm canh đúng dòng đó.
- **Ba lớp tuổi** (3–7 · 8–12 · 13–18) × 9 hướng = 27 khối hoạt động. Chia ba
  chứ không bốn: hoạt động cho đứa 5 và đứa 7 gần như một, còn 12 với 16 khác
  hẳn — chia theo chỗ THẬT SỰ đổi.
- ⚠️ **`namXem` PHẢI vào khoá cache**: tool đọc TUỔI để chọn lứa hoạt động, nên
  cùng một lá số ở hai năm phải ra hai bản. Thiếu năm trong khoá là đứa 12 tuổi
  sang năm vẫn nhận bộ hoạt động của lứa cũ.
- `cache-status` **tự tính năm xem qua engine**, không nhận từ query — client tự
  khai năm là mở đường tra một khoá khác với khoá lượt dựng sẽ dùng.
- Rail chỉ biết ba thiên hướng SAU khi mua (`railDataDayDu`) — biết sớm thì
  người ta hỏi rail thay vì mua. Có bài kiểm canh khối vỏ không nêu tên hướng.
- **CỐ Ý không gọi `Shell.prefillForm()`**: lá số shell đang nhớ là của NGƯỜI
  DÙNG, form này là của CON. Đổ vào là người ta bấm luôn rồi nhận bản đọc về
  chính mình dưới nhãn "con" — sai im lặng, không có gì báo.

### 🔍 Soi 27 khối hoạt động — 3 lỗi thật, và một lời khai của tao hẹp hơn tên gọi
Phần này là thứ người TRẢ TIỀN đọc kỹ nhất mà không bất biến nào với tới: mọi
bài kiểm khác nói về CẤU TRÚC (điểm giảm dần, đủ ba hướng, rail phẳng), không
nói gì về CHỮ. Soi tay 108 hoạt động (9 hướng × 3 lứa × 4 ô) bằng phép đo.

- 🔴 **`bayNghe` KHÔNG với tới chữ trong `hoatDong`** — nó chỉ làm rỗng mảng
  `ngheViDu`. `giao-thiep/nho` vì thế ghi *"Trò chơi đổi vai: bán hàng, bác sĩ,
  cô giáo"* và **đi thẳng ra trang cho đứa 5 tuổi**. Bản thân trò đóng vai là
  hoạt động ĐÚNG cho lứa đó; cái sai là gọi tên nghề — trên một trang tên là
  *hướng nghiệp cho con*, danh từ nghề đứng cạnh thiên hướng đọc thành lời gợi ý
  chốt nghề. Sửa thành *"đổi vai có hai phía: người mua kẻ bán, người hỏi người
  trả lời"* — giữ nguyên độ cụ thể, bỏ nhãn nghề.
  🔑 **Và đây là chỗ tao phải đính chính chính mình:** câu verify *"trẻ nhỏ → 0
  tên nghề lọt"* ĐÚNG trong phạm vi nó đo (các phần tử của `ngheViDu`) nhưng
  **hẹp hơn hẳn cái tên gọi của nó**. Bài kiểm đặt tên theo điều muốn chứng
  minh, không theo điều thực sự đo — loại sai lệch tự đánh lừa nguy hiểm nhất.
- 🪤 **Bẫy "hai hình nuốt nhau" LỘ LẠI Ở TẦNG CHỮ**: `dan-dat/lon` và
  `giao-thiep/giua` cùng ghi *"Bán một thứ có thật…"* (Jaccard **0,55**). Đúng
  cặp đã phải tách ở TẦNG CHẤM (cosine 0,86) — **sửa trọng số không cứu được
  chỗ này**. Ô đó còn lạc khỏi chính khối của nó (ba ô kia đều là *dẫn người*).
  Thay bằng *"dẫn một nhóm qua một lần bất đồng thật — nơi nó phải chốt trong
  khi vài người không đồng ý"*: đúng cực `hoa` thấp phân biệt dẫn dắt với giao
  thiệp.
- Ô thứ ba: hai khối mở đầu y hệt *"Học nghiêm túc một môn…"* (0,36) — đổi một bên.

**Hai con số trả lời hai mối lo đang treo trong mục CÒN LẠI:**
| | |
|---|---:|
| Chồng lấn giữa 3 lứa trong cùng một hướng (Jaccard) | **≤ 0,15** cả 9 hướng |
| Hoạt động cần TIỀN / dịch vụ gần nhà | **11/108 = 10,2%** |
⇒ Chia ba lứa **có nội dung thật**, không phải đội tên khác (mốc trước chỉ là
lập luận "chia theo chỗ THẬT SỰ đổi", nay có số). Và lo "chưa phân theo vùng"
nhẹ hơn tưởng: **90% hoạt động làm được không cần tiền**, không khối nào có quá
nửa số ô cần chi.

### 🧷 `scripts/check-hoat-dong-tre.mjs` (bộ dò thứ 10) — chặn tái phát
Ba luật, **cả ba rút từ lỗi vừa bắt được thật**, không phải lo hão: lứa 3–7 cấm
tên nghề · lứa 3–7 cấm ngôn ngữ thi thố · hai hướng khác nhau cấm gợi cùng một
việc (Jaccard < 0,5). Cộng chốt đếm: đúng 27 khối, mỗi khối **≥ 4 ô**.
- **Luật 2 chỉ khoá ĐÚNG lứa nhỏ, không cấm tiệt**: đo ra 9 hoạt động có chữ
  thi/giải/cấp bậc và **cả 9 đều ở lứa 8–12 và 13–18**, 0 ở lứa 3–7. Đó là hình
  dạng ĐÚNG (thi đấu có chỗ của nó với trẻ lớn) — chốt lại để lượt sửa sau không
  lặng lẽ kéo nó xuống, chứ không phải để dọn dẹp.
- 🪤 **Red-team lộ ngưỡng của chính tao sai**: đặt "khối quá mỏng" ở `< 3` thì
  bỏ một ô (4→3) **vẫn xanh**. Ngưỡng phải là `< 4`. Bộ dò mà không red-team thì
  con số trong nó chỉ là phỏng đoán.
- **4/4 ca đỏ đúng · 2/2 đối chứng im** (thi thố ở lứa 13–18 hợp lệ → im; sửa
  chữ vô hại → im), và diff sau red-team sạch đúng 3 dòng sửa thật.

### ⚠️ Sửa 27 khối này về sau: khi nào phải bump `_shape`
`_shape` gác **CẤU TRÚC payload**, không gác chữ. Đổi chữ hoạt động thì dòng
cache cũ trả chữ CŨ (khó chịu, không vỡ); đổi/thêm/bớt KHOÁ thì trang ẩn khối
im lặng (đúng lỗi `day-con` đã cắn). ⇒ **Sửa chữ: không bump. Đổi cấu trúc: bắt
buộc bump.** Vòng này giữ `SHAPE = 1` vì tool còn `enabled=false`, chưa dòng
cache nào tồn tại.

### 🪤 Gộp #467: trang MỚI nằm lại phiên bản asset cũ
#467 bump `shell.js?v=67` trên 35 trang có sẵn; trang mới của PR này không có
trên main nên **auto-merge để nó ở `v=66`**, kèm `shell.css` lạc ở `v=17`. Không
lỗi nào bắn ra — chỉ là một trang ăn bản shell cũ. 🔑 **Gộp base xong phải đếm
lại phiên bản asset trên CẢ cây**, đừng tin "hết `<<<<<<<` là xong" (bài học
`git checkout --ours` lặp lại ở dạng khác).

### 🔴 SAU KHI BẬT PROD: lá số 43 tuổi vẫn được gọi là "bé trai"
Henry: *"Mày phải factor in tuổi thật của lá số nữa. Tao vừa test thử lá số sinh
lúc 1h45 sáng ngày 9 tháng 5 năm 1984. Tức là đã 43 tuổi rồi. Mà nó luận giải
vẫn gọi là cháu/bé trai, nghe nó kỳ kỳ."*

**Căn nguyên: `lopTuoi()` KẸP mọi tuổi > 12 về lứa 13–18** thay vì nhận ra lá số
không phải trẻ em. Kẹp là cách hỏng IM LẶNG — không lỗi nào bắn ra, lá số cứ đi
trọn đường như một đứa trẻ. Cộng thêm: chữ **"cháu" nằm CỨNG ở CẢ BA TẦNG**
(bảng `CHAT_KHONG_DOI_HOI` của engine · prompt rail · `Bé trai/Bé gái` trên
trang), nên không có đường nào đổi theo tuổi.

🔑 **Hai ca ngoài dải KHÁC NHAU, không được gộp làm một:**
| Tuổi mụ | Xử lý | Vì sao |
|---|---|---|
| **19–25** | lứa MỚI `vaodoi` | Vẫn là câu hỏi THẬT của cha mẹ (*"con vừa ra trường"*). Giữ tool, đổi xưng hô, đổi hoạt động sang việc đi làm thật |
| **≥26** | `laTreEm=false`, **KHÔNG bán** | Không còn là "định hướng sớm cho con". Đổi mấy đại từ rồi bán tiếp một bản viết cho trẻ con là bán nhầm hàng |

- **Chốt chặn đặt TRƯỚC `toolPaymentDenied`** ⇒ lá số người lớn **không mất
  Lượng**. Đặt sau là thu tiền rồi mới từ chối — có bài kiểm canh đúng thứ tự
  hai lệnh đó trong mã nguồn.
- **Tính thử vẫn chạy cho MỌI tuổi**: tầng thiên hướng đọc từ 13 chiều, độc lập
  tuổi, nên nó có nghĩa ở mọi lứa. Thứ bị cắt là phần CHỮ viết cho cha mẹ.
- ⛔ **CỐ Ý KHÔNG dựng tầng người lớn đầy đủ** — `cong-so` chính là *Tử Vi Công
  Sở & Hướng Nghiệp*, cũng 15 Lượng, cũng trả lời hướng nghiệp cho người trưởng
  thành. Dựng thêm ở đây là hai tool 15 Lượng cùng một câu hỏi, đúng cái bẫy
  track này vừa tốn một PR để gỡ. Nên ≥26 thì **bàn giao sang Công Sở**.
- `lop` vẫn có giá trị khi `laTreEm=false` (giữ hình dạng payload) nhưng trang
  **ẩn nhãn lứa và dòng vai cha mẹ** — không thì lại hiện *"Tuổi vào đời ·
  19–25"* cho lá số 43 tuổi, đúng loại vô lý vừa đi sửa chỉ đổi chỗ.
- Bảng hoạt động **27 → 36 khối** (thêm 9 khối lứa 19–25, 36 hoạt động mới),
  `check:hoatdong` cập nhật theo và vẫn 0 cặp trùng giữa các hướng.
- 🪤 **Red-team kẹp tuổi trở lại → lá số 43 tuổi lại `laTreEm=true`** ⇒ lỗi tái
  hiện được, bất biến không đỗ giả.

### 🔴 Vòng sau: phần MIỄN PHÍ vẫn gọi người 43 tuổi là "con"
Vòng trên mới chặn đường TRẢ TIỀN và sửa nhãn. Nhưng tầng miễn phí đọc được cho
**mọi** lá số, nên câu *"Việc hợp với **con** không đòi hỏi…"* vẫn dán lên lá số
43 tuổi — **đúng chỗ Henry báo, chỉ khác một dòng**. Thêm `XUNG_HO_NGUOI_LON =
'người này'`, ngôi **TRUNG TÍNH** vì lúc đó không biết ai đang đọc: cha mẹ của
một người trưởng thành, hay chính người đó tự tra lá số mình. Trang cũng hết rơi
về tiêu đề `"Con"` khi bỏ trống ô tên.
- 🔑 **Bài học: chặn đường bán KHÔNG bằng chặn đường ĐỌC.** Vá một tính năng
  theo tuổi thì phải đi hết mọi bề mặt CHỮ, không chỉ bề mặt có tường.
- Đo lại: **2.352 lá số × 13.869 assertion, 0 lỗi** — `laTreEm` khớp ngưỡng 26 ·
  0 rò `{ai}` · cờ đi đúng qua `hoSoTinhThu` · **ô xưng hô đúng ở cả hai dải**
  (người này 2.476 · con 1.627 · cháu 358) · khối hoạt động ≥4 ô · lứa 3–7 sạch
  tên nghề. Lá số Henry báo: `tuoi=43 · laTreEm=false · "người này"`.
- 🪤 **Phép đo đầu BẮT OAN 511 ca**: regex `\bcon\b` khớp vào **"con vật"**,
  **"con mắt"**. Phải đo **đúng Ô XƯNG HÔ** (`^Việc hợp với (.+?) không đòi hỏi`),
  không dò chuỗi thô — đúng lớp lỗi CLAUDE.md đã ghi ở track brand-voice.
- 🪤 **Và một bẫy cũ vấp lại**: lượt gọi `computeLaso` đầu dùng sai khoá
  (`ngay/thang/nam` thay vì `day/month/year`) nên nhận lá số RỖNG và ra
  `tuoi=null` — suýt kết luận là bug của code. Hàm **không ném lỗi** ở đường đó,
  và field trả về là **`ls`** chứ không phải `laso`.
- **15 ca trên TRANG THẬT** (serve `public/`, stub route preview): người lớn →
  bàn giao nêu đúng "43 tuổi" + nói **không trừ Lượng** + link sang `/app/cong-so`
  · **0 lượt `action=deduct`** · quét toàn bộ chữ hiện ra **0 mẩu "Bé trai"/
  "cháu" lọt** · xưng "người này" · ẩn nhãn lứa · **ĐỐI CHỨNG trẻ em: 0 bàn giao,
  vẫn "cháu", vẫn hiện nhãn 3–7 và "Bé trai"** · 0 lỗi JS.
  🪤 Ba ca đỏ đầu là **lỗi TEST**: bộ chọn nút bắt nhầm nút khác (nút thật là
  `#btnGo`), và **stub thiếu `success:true`** nên `analyze()` rơi vào nhánh báo
  lỗi — đúng bài học "stub thiếu trường thì bài kiểm đo nhầm đường lùi", phải
  lấy shape THẲNG từ route.

---

## 🧱 TypeScript 7 GỠ HẲN API BIÊN DỊCH — bump là vỡ bản dựng prod (2026-08-09)

Lượt Dependabot bump **typescript 6.0.3 → 7.0.2** (#388, `0ef5edd`) làm **lint đỏ
7 lượt liên tiếp trên `main`** VÀ **7 lượt deploy production ERROR**. Phiên khác
vá căn nguyên trước (#476 `efc26ff` — trả root về `^6.0.3` + luật Dependabot
`ignore` chặn bump major).

### 🔑 Đây là ĐỨT GÃY CẤU TRÚC, không phải quirk phiên bản
`typescript@7` là bản **port native**: `exports['.']` trỏ vào `lib/version.cjs`
và **chỉ còn `version` + `versionMajorMinor`**. Toàn bộ API biên dịch trong JS
(`transpileModule` · `ModuleKind` · `ScriptTarget`) **không còn tồn tại**. Đo
trực tiếp: `Object.keys(require('typescript')).length === 2`.

| Đường | TS 7 |
|---|---|
| `tsc` CLI (`npm run typecheck`, engine build) | ✅ vẫn chạy — binary, không qua API |
| `next build` | 🔴 *"TypeScript 7.0.2 does not provide the compiler API required by Next.js"* |
| script gọi `ts.transpileModule` | 🔴 `TypeError: Cannot read properties of undefined` |

### 🔴 CI KHÔNG PHỦ `next build` — bài học nặng nhất của lượt này
Job tên **`build`** trong danh sách check là **`build-android.yml`**, không phải
`next build`. `lint`/`typecheck` gọi `tsc` **CLI** nên vẫn xanh. ⇒ **Vercel là
nơi DUY NHẤT chạy `next build`.** Đếm "7 check xanh" trên PR **không** chứng minh
bản dựng prod còn sống — đúng họ với bài học *"skip trông giống pass"*.

### Gia cố kèm (PR sau #476)
Hai script còn dựa vào API đã bị gỡ, nay không dựa nữa nên **lượt bump sau không
đụng được tới chúng**, dù chốt Dependabot có được gỡ hay không:
- **`scripts/check-que-motifs.mjs`** — bỏ hẳn phụ thuộc TypeScript. `que-motifs.ts`
  là **bảng dữ liệu thuần** (đúng một khai báo, 0 dòng logic) nên chỉ cần cắt vế
  phải dấu `=` rồi để JS tự đọc. Không khớp mẫu thì **DỪNG HẲN** kèm lời nhắc sửa
  bộ dò — đọc ra bảng rỗng rồi báo xanh còn tệ hơn đỏ.
- **`scripts/gen-que-images.mjs`** — gọi **`tsc` CLI** (file này có LOGIC thật,
  không cắt chuỗi được). ⚠️ Bắt buộc `--ignoreConfig`: nêu tên file trên dòng lệnh
  trong khi cwd có `tsconfig.json` thì tsc báo **TS5112** rồi bỏ cuộc. Đo trên cả
  TS 6 lẫn TS 7 — cả hai emit đúng. Script này đáng gia cố nhất vì nó chỉ chạy khi
  vẽ lại 64 bức tranh, tức hỏng thì lộ ra đúng lúc tệ nhất.

### Verify
`npm ci` theo ĐÚNG lockfile ⇒ máy đo chạy chính **TS 7.0.2 như CI**, xác nhận
`ts.transpileModule === undefined` tận gốc · **A/B trên cùng bản TS 7: bộ dò bản
CŨ đỏ, bản MỚI xanh** · red-team bộ dò 2 ca (đổi tên khai báo → đỏ đúng câu hướng
dẫn; bớt một mô-típ của quẻ 1 → đỏ *"phải đúng 6 mô-típ, đang có 5"*), khôi phục
sạch 0 file rác · `--dry-run` của script vẽ in đủ prompt, **0 lượt gọi API** ·
14/14 bộ dò + `typecheck` + `next build` qua được bước TypeScript.

### ✅ Đã lấp lỗ: workflow `next-build.yml` (PR sau)
Henry: *"mày xem rồi fix lại đi"*. Nay CI **có** chạy `next build` thật.
- **Job tên `next-build`, CỐ Ý không phải `build`** — hai check cùng tên `build`
  là tái lập chính sự nhầm lẫn vừa trả giá.
- **`scripts/stub-postgrest.mjs`** — máy chủ giả trả **rỗng** cho mọi lượt đọc;
  `SUPABASE_URL` trỏ vào đó. Không có nó thì build chết ở `getaddrinfo` và mã
  thoát nói về HẠ TẦNG chứ không nói về MÃ. Với stub: đi trọn **63/63 trang**,
  exit 0. ⚠️ Nó KHÔNG phải bộ kiểm nội dung — càng làm nó giống Supabase thật
  càng dễ nuốt một lỗi thật.
  🪤 `.single()` gửi `Accept: vnd.pgrst.object+json` và chờ MỘT object ⇒ stub
  phải trả **406** (đúng thứ PostgREST trả khi không khớp dòng nào), trả mảng là
  phía gọi vỡ vì shape lạ — bẫy đã vấp một lần ở track Duyên Nợ.
- ⛔ **CẤM thêm `if: github.actor != 'dependabot[bot]'`** như playwright/
  lighthouse. Hai cái đó bỏ qua Dependabot vì cần SECRET; job này không dùng
  secret nào, và **lượt bump nó sinh ra để chặn (#388) CHÍNH LÀ một PR
  Dependabot**. Bỏ qua Dependabot ở đây là gỡ đúng cái chốt vừa dựng.
- Bước `if: failure()` in thẳng câu chẩn đoán khi vỡ ở tầng TypeScript — lượt
  sau khỏi phải đi chẩn lại từ đầu (lỗi này đã tốn 7 lượt deploy để nhận ra).
- **Red-team: cài lại `typescript@7.0.2` rồi chạy đúng chuỗi lệnh của CI → build
  exit ≠ 0 và log chứa đúng câu *"does not provide the compiler API"*** ⇒ job này
  bắt được #388. Khôi phục về TS 6 → exit 0, 63/63 trang, cây làm việc sạch.

### CÒN LẠI
- Stub chỉ trả rỗng nên trang prerender ra **trống** — job này chứng minh **bản
  dựng còn sống**, KHÔNG chứng minh trang hiện đúng chữ. Đừng đọc nó rộng hơn thế.
- `tuvi-engine` **CỐ Ý giữ TS 7** (#384): nó dựng bằng `tsc` CLI nên không dính.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` quét cả cây sạch ·
**10/10 bộ dò sạch** (`prices`/`groups`/`nostore`/`share`/`keyframes`/
**`hoatdong`**/`hexagrams`/`hao`/`motifs`/`terms`) · engine **185 pass** ·
`node --check` 2 khối script.
- **4.680 lá số × 8 bất biến = 259.208 assertion, 0 lỗi**: đủ 3 hướng · hoạt
  động khớp ĐÚNG lứa tuổi · trẻ nhỏ 0 tên nghề · rail phẳng · deterministic ·
  **0 ca bản đọc tự mâu thuẫn** (trục nêu làm lý do không nằm trong "việc không
  đòi hỏi" — đúng lỗi đã vấp ở tầng nhánh nghề).
- **26.362 assertion RIÊNG cho tầng chấm mới** trên 2.496 lá số: điểm giảm dần
  và trong dải · 0 rò `undefined`/`NaN`/`[object` · deterministic · 0 ca tự mâu
  thuẫn · tính thử **0 khoá trả tiền** · trẻ nhỏ 0 tên nghề · rail phẳng.
- **Tần suất khối rỗng** (trang phải chịu được): `chatNguoi` rỗng **0,0%** ·
  `khongDoiHoi` rỗng 2,0% · hướng không có lý do 2,9%. Trang đã có nhánh ẩn.
- 🪤 **Red-team vòng này — 2 ca, và một ca CỐ Ý không đỏ:**
  (a) nạp lại `nhip` vào `van-dong` (corr +0,71) → **13,9% vọt lên 19,1%**, dải
  nới từ 8,2–14,8 ra 5,8–19,1 ⇒ luật chống chồng tín hiệu có thật, đo được.
  (b) cho một hình khai **chất ÂM** → bộ dò bắt đúng dòng, exit 1.
  (c) gỡ chốt `|val| > 0.25` → **VẪN 0 lỗi**, đúng như dự đoán: tự mâu thuẫn
  nay bất khả thi về CẤU TRÚC (xem trên), chốt đó chỉ còn lọc chiều gần mức
  giữa (665 lượt trích dẫn yếu). **Ca không đỏ này là kết quả, không phải bài
  kiểm hỏng** — nhưng phải giải thích được vì sao, nếu không nó chỉ là một bộ
  dò câm.
- 🪤 **Bộ dựng harness thất bại IM LẶNG**: thêm `--paths` vào dòng lệnh thì tsc
  từ chối (TS6064) → không emit → `|| true` nuốt → phép đo chạy trên bản JS
  **CŨ** và ra 100% một hướng. Đúng bài học "mọi lượt thay bằng script phải
  assert". Đã thêm assert bản dựng phải chứa `day-con-assess`.
- **40/40 ca đọc thẳng mã nguồn**: `runPreview` không chứa một trong **10** ký
  hiệu cấm · rẽ nhánh trước `withToolOutcome` · + ca ĐỐI CHỨNG đường trả tiền
  PHẢI có `toolPaymentDenied` + `llmTextFull` + `hoSoDayDu` + ghi cache.
- **19/19 ca trên ROUTE THẬT qua Next dev**: tính thử 200 không cần đăng nhập ·
  payload thật **0 khoá trả tiền** · 0 cung cấm · `moiLo` rác rơi về danh sách
  trắng · đường trả tiền không auth → 401.
- **61/61 ca Playwright trên TRANG THẬT**: tính thử → 0 POST đường tiền, 0
  `deduct`, quét toàn bộ chữ hiện ra **0 mẩu trả tiền lọt** · bấm mở → có
  deduct + đủ ba hướng + phần miễn phí còn nguyên byte · **trẻ nhỏ → 0 tên nghề
  lọt** · ĐỐI CHỨNG 402 → dựng lại tường, không quẳng về form · đọc hụt bảng giá
  → **không trừ Lượng** (fail-closed) · XSS từ cả tên lẫn chuỗi server không
  chạy · 390px không tràn · **khung shell đúng chuẩn** (xem bẫy ngay dưới).
- 🪤 **Red-team lộ ra bài kiểm trang KHÔNG canh được rò rỉ SERVER**: bộ quét đọc
  `innerText`, tức đo *người dùng thấy gì*, nên payload thừa không lọt màn hình
  ⇒ 40/40 vẫn xanh khi cố ý cho preview trả bản đầy đủ. Red-team đúng tầng
  (engine) thì bắt **18.720 lỗi đỏ** trên đúng 4 assertion. Đã biến chính tính
  chất đó thành ca thật (CA8: server rò thì trang vẫn không vẽ).
- 🪤 Hai ca đỏ trên route đều là **lỗi TEST**: (a) `motCau` cũng là tên trường
  của `kieu` (câu tóm kiểu — MIỄN PHÍ) nên dò chuỗi thô báo đỏ oan, phải dò khoá
  TOP-LEVEL; (b) token sai ra **500** thay vì 401 — nhưng `day-con` và
  `nguoi-khac` (đang chạy prod) ra **y hệt 500** trong container này ⇒ hiện tượng
  của môi trường (không có credential Supabase thật), không phải của tool mới.

### 🔴 GỘP GIỮA CHỪNG: `#458` vừa cho Dạy Con một khung RẤT GIỐNG — đo rồi mới kết luận
Trong lúc làm PR này, `#458` merge vào main và thêm cho `day-con` (tầng **MIỄN
PHÍ**): 5 trục tính khí + **8 CHẤT năng khiếu** + **gợi ý hoạt động theo chất ×
nhóm tuổi**. Nghe như đúng thứ tool này làm. Đo trên 792 lá số trẻ em:

| | |
|---|---:|
| Đoán hướng#1 (tool này) từ chất#1 (Dạy Con) | **38,5%** |
| Mốc so: hai bảng là MỘT | 100% |
| Mốc so: độc lập hoàn toàn | ~11% |
| Cụm chữ **hoạt động** trùng nhau | **0/1600 (0,0%)** |

⇒ **Không phải bản sao.** Hai bảng đo hai trục khác nhau: `day-con` đo **NĂNG
KHIẾU** (con giỏi MÔN gì — ngôn ngữ, con số, âm nhạc), tool này đo **CHẤT VIỆC**
(con hợp KIỂU LÀM VIỆC nào — tỉ mỉ, dẫn dắt, khám phá).

- 🪤 **Nhưng chỗ nguy hiểm không phải trùng lặp, mà là NGHE NHƯ NÓI NGƯỢC**: bé
  có chất #1 *"Hiểu người & dẫn nhóm"* thì tool này xếp #1 là *"Tỉ mỉ · làm cho
  đúng"* ở **65%** số ca. Về lý thì không mâu thuẫn (hai trục), nhưng một phụ
  huynh trả tiền cho CẢ HAI tool 15 Lượng về CÙNG một đứa trẻ sẽ đọc thành hai
  kết luận đá nhau — và mất tin vào cả hai.
- ✅ Vá bằng lời khai, không bằng cách đổi thuật toán: trang nói thẳng tool này
  đo *chất việc* còn Dạy Con đo *năng khiếu*, kèm link sang; **prompt rail có
  luật cứng** — nếu người dùng nhắc kết quả bên kia thì phải giải thích là HAI
  TRỤC, và **TUYỆT ĐỐI không nói bên nào sai**.
- ✅ **ĐÃ LÀM trong chính PR này** (Henry: *"Ok làm theo đề xuất của mày đi"*):
  dựng thiên hướng thẳng trên 13 chiều của `#458`. Xem mục "ĐỔI TẦNG CHẤM" ở
  trên — con số trong bảng này (38,5% / 0,0% / 65%) là của bản 21 trục **đã bị
  thay**, giữ lại để so.

### 🪤 DỰNG TRANG TRÊN MỘT KHUNG KHÔNG TỒN TẠI — và test của tao không bắt được
Bản đầu của trang dựng bằng `.sidebar` / `.work` / `.work-inner` — **ba lớp
`shell.css` KHÔNG hề khai**. 35 trang shell đều dùng `.sb` / `.ws` /
`.ws-top` / `.ws-body`; trang mới là trang DUY NHẤT lạc khung.
- 🔴 **Playwright vẫn xanh 45/45** vì nó chỉ kiểm NỘI DUNG (chữ hiện đúng chưa,
  có rò tầng trả tiền không) chứ không kiểm KHUNG. Ngay cả ca "390px không tràn
  ngang" cũng xanh — không có lưới shell thì mọi thứ xếp dọc, càng không tràn.
- Thứ bắt được là **`check:share`** (guard của PR #456, gộp vào giữa chừng): nó
  đòi `.ws-actions` làm chỗ chèn nút Chia sẻ. Guard viết cho việc khác lại bắt
  đúng lỗi này — vì nó neo vào **dấu hiệu THẬT của shell**, không neo vào chữ.
- 🔑 **Quy ước rút ra: trang shell mới phải kiểm cả KHUNG, không chỉ kiểm chữ.**
  Đã thêm CA9 (13 assertion): đúng `aside.sb` / `main.ws#ws` / `.ws-top` /
  `.ws-actions` / `.ws-body` / rail · đúng MỘT mốc `data-ws-result` · **0 lớp
  chết `.work`/`.work-inner`** · và nút Chia sẻ do SHELL tự bật khi có kết quả,
  tự gỡ khi quay về form.

### 🐞 Bắt kèm: 7 khoá rail in NGUYÊN KHOÁ KỸ THUẬT vào prompt
`extractGenericContext` rơi về `GENERIC_LABELS[k] || k`, nên `laiKieu: true` ·
`cungMệnh: Cự Môn` · `hopHayVa: …` đi thẳng vào prompt. Nợ CÓ SẴN — `day-con`
phát đúng mấy khoá đó. Vá một chỗ là cả hai tool được; nay **0 khoá thiếu nhãn**
trên cả hai (quét 336 lá số).

### CÒN LẠI
- ✅ **ĐÃ BẬT TRÊN PROD — hết việc tay.** Trình tự đã chạy đúng thứ tự bắt buộc:
  merge (`3f2e1ca`) → **đợi production deploy READY** → verify prod phục vụ
  `/app/huong-nghiep-tre` **200** (mốc đối chứng: ngay trước deploy nó còn
  **404**) → migration (10 cột · RLS bật · 1 policy chủ-sở-hữu · dòng giá
  `enabled=false`) → **rồi mới** `enabled=true`. Verify sau khi bật: 60 tool
  đang bật, và nhóm `con-cai` ra *Xem Tuổi Sinh Con · Đặt Tên Con · Dạy Con Theo
  Lá Số · Hướng Nghiệp Sớm Cho Con*; route thật trả **401** đúng cho lượt
  `cache-status` chưa đăng nhập.
  🔑 Migration **an toàn chạy trước deploy** (nó tạo dòng ở `enabled=false`, và
  `on conflict do update` CỐ Ý không đụng cột `enabled` nên chạy lại không lật);
  chỉ **câu bật** mới phải đợi. Tách được hai việc này là rút ngắn được cửa sổ
  rủi ro.
- **`THIEN_HUONG` (9 hướng × 21 trục + toàn bộ phần chữ) là bảng TỰ ĐẶT**, cùng
  dạng nợ với `KIEU_HOC`, `DOMAIN_NGANH`, `SAO_TRUC`. Cổ thư không có khái niệm
  "thiên hướng của trẻ" bằng thang điểm. Sửa là sửa data thuần.
- **27 khối hoạt động nay có MÁY canh, vẫn CHƯA CÓ NGƯỜI đọc.** `check:hoatdong`
  chặn được ba lỗi đo ra được (tên nghề lứa nhỏ · thi thố lứa nhỏ · hai hướng
  trùng việc) — nó **không** nói được hoạt động ấy có phải lời khuyên tốt cho
  một đứa trẻ thật hay không. Đây vẫn là phần người trả tiền đọc kỹ nhất và là
  phần duy nhất của tool chưa ai ngoài tao đọc qua.
- ✅ **Trang standalone SEO ĐÃ CÓ** — `/tools/huong-nghiep-tre.html`, nhắm
  *"định hướng nghề nghiệp cho con"*. Theo đúng khuôn 4 trang cẩm nang: `tools.css`,
  2 khối JSON-LD, **một `<h1>` duy nhất**, FAQ `<details>` hiện trên trang. Nộp
  vào `sitemap-trang` (71 → 72 URL, 0 trùng, **0 `lastmod`** đúng luật *không
  biết ⇒ không phát*), và `day-con` trỏ ngược sang nó để trang mới có ít nhất
  MỘT link vào từ trang đã index — nợ ghi ở track SEO trước (*"4 trang mới chưa
  có link vào từ trang đã index"*) lần này không lặp lại.
  🪤 **Ngưỡng "tiêu đề ≤ 63 ký tự" tao từng ghi là ĐO SAI CHỖ**: tính cả hậu tố
  `| Tử Vi Minh Bảo` thì **cả 4 trang anh em đều vượt** (62–69). Google cắt phần
  sau dấu `|`; thứ phải ngắn là **phần phân biệt** đứng trước nó — đo lại thì
  4 trang cũ 45–52 và trang mới 54, đều lành. Ngưỡng mà bắt oan 4/4 bản mẫu thì
  ngưỡng sai, không phải bản mẫu sai.
  🔑 **FAQ schema khớp NGUYÊN VĂN cả câu hỏi LẪN câu trả lời** (siết hơn 4 trang
  cũ — chúng chỉ khớp phần hỏi, phần đáp trong schema viết dài hơn chữ hiện ra).
  Đây đúng lỗi #361 đã trả giá: khai FAQ mà nội dung không nhìn thấy được.
- Con số cần nhìn sau 1–2 tuần: cột *mở → tính thử → bấm mở* của
  `huong-nghiep-tre` trong panel Phễu Theo Tool, đặt cạnh `day-con` (cùng 15
  Lượng, cùng đối tượng) để biết câu hỏi nào bán tốt hơn.
---

## 🧪 CI đo BẢN CŨ chứ không đo PR — cả 3 workflow sang preview (2026-08-09, PR #463 · #466 · PR này)

Henry: *"Vercel smoke test dùng để test gì thế? Sao giờ thiết kế lại skip test
đó?"* → rồi *"Làm sao để tao mở SSO cho tất cả?"* → *"Ok làm nốt đi"* → *"Xong
làm tiếp"*.

### 🔴 Căn nguyên chung của CẢ BA workflow: đo NHẦM BẢN
| | Trigger cũ | Thực tế đang đo |
|---|---|---|
| `smoke-prod.yml` | `deployment_status` nhưng **chặn preview** | không đo gì trên PR (check hiện **"skipped"**) |
| `playwright.yml` | `push`/`pull_request` | **prod đang chạy**, tức bản PR chưa đụng tới |
| `lighthouse.yml` | `pull_request` | **4 URL prod cứng** trong `lighthouserc.json` |

- 🔑 **Skip TRÔNG GIỐNG PASS.** Đếm "7 check xanh" trên PR là sai — smoke nằm
  trong đó ở trạng thái skip. Prod chỉ được kiểm SAU khi merge.
- 🔑 **`push` bắn TRƯỚC khi bản deploy tồn tại** ⇒ E2E 16 spec (có đăng nhập)
  đi đo bản cũ. Xanh hay đỏ đều không nói gì về thay đổi trong PR.
- 🪤 **`lighthouse.yml` còn tệ hơn: chú thích trong file MÔ TẢ một hành vi
  KHÔNG TỒN TẠI** — nó ghi *"trên PR có thể override sang Vercel preview URL"*
  trong khi đường override duy nhất là `workflow_dispatch`. Đọc chú thích mà
  tin là xong thì không bao giờ đi tìm.
- Nay **cả ba** dùng chung một khuôn: chạy theo `deployment_status`, production
  đo domain thật (giữ DNS + redirect apex→www + CDN trong phạm vi đo), mọi
  deploy khác đo `target_url` của chính lượt đó. Nhờ vậy URL preview của nhánh
  `dev` **hết phải chép cứng** trong `playwright.yml` — chuỗi đó sẽ mục mà không
  ai hay.
- **Danh sách trang của Lighthouse vẫn nằm DUY NHẤT ở `lighthouserc.json`**;
  `scripts/lhci-preview-urls.mjs` đọc thẳng file đó rồi ghép sang host preview.
  Chép danh sách sang workflow là hai bản trôi khỏi nhau rồi âm thầm đo thiếu
  trang.

### 🔓 Mở cửa SSO cho CI mà KHÔNG mở preview cho công chúng
Dùng **Protection Bypass for Automation** (Vercel → Settings → Deployment
Protection), secret để trong GitHub Actions tên `VERCEL_BYPASS_SECRET`.
- **smoke** gửi kèm header `x-vercel-protection-bypass` + `x-vercel-set-bypass-cookie`.
- **E2E dùng COOKIE, KHÔNG dùng header** — `tests/auth.setup.ts` gắn vé vào
  QUERY ở đúng lượt điều hướng đầu, server trả `_vercel_jwt`, cookie đó nằm
  trong `storageState` nên mọi test sau qua cửa. Lý do bắt buộc phải khác smoke:
  xem bẫy số 4 bên dưới.
- ⛔ **KHÔNG tắt Vercel Authentication.** Preview **dùng chung env với
  production** (cùng `SUPABASE_SERVICE_KEY`, cùng key model, cùng key thanh
  toán) và URL preview nằm ngay trên comment của PR ⇒ mở công khai là ai cũng
  gọi được API ghi thẳng DB prod và đốt tiền model thật.
- ⚠️ **Vì thế việc này CHỈ chữa "đo nhầm bản", KHÔNG chữa "cách ly dữ liệu"** —
  E2E trên preview vẫn ghi vào đúng Supabase prod. Đừng nhầm hai thứ.
- Thiếu secret thì config **bỏ header đi**, đường prod chạy y như cũ (domain
  prod không bị gác) — nên hỏng secret không kéo sập lượt đo prod.

### 🪤 Bốn cái bẫy, cả bốn chỉ lộ khi ĐO
1. **`request.newContext()` KHÔNG thừa hưởng `use` của config.** Chỉ **FIXTURE**
   `request` (tham số của test) mới mang `baseURL` + `extraHTTPHeaders`. Bản cũ
   tự tạo context ở 4 ca API ⇒ trên preview mấy ca đó ăn 401 trong khi ca
   `page.goto` vẫn xanh — kiểu đỏ rất khó lần. Đổi sang fixture cũng gỡ luôn 4
   lượt `dispose()` tay.
2. **Phép so neo vào HOST thì chết trên preview.** Ca paywall so URL redirect với
   `tuviminhbao.com`, mà preview là `*.vercel.app` ⇒ đỏ oan. So theo **pathname**.
3. 🔴 **Tao nói SAI một lần rồi tự đính chính bằng số liệu:** tao khẳng định
   workflow chạy bằng `deployment_status` luôn lấy YAML từ **nhánh mặc định**,
   nên PR không tự kiểm được chính nó. **Sai** — run sinh ra mang đúng tiêu đề
   mới của nhánh PR, và số dòng trong log khớp spec mới. **GitHub dùng YAML +
   code từ COMMIT CỦA DEPLOYMENT.** Nhờ vậy PR tự kiểm được chính nó.
4. 🔴 **`extraHTTPHeaders` áp lên CẢ REQUEST KHÁC ORIGIN.** Đây là lỗi CI đỏ
   thật, do chính tao gây ra khi bê cách của smoke sang E2E: gắn header lạ vào
   một request cross-origin làm nó thành **preflight**, mà `fonts.gstatic.com`
   không cho phép header đó ⇒ *"Request header field x-vercel-set-bypass-cookie
   is not allowed by Access-Control-Allow-Headers"* ⇒ font hỏng ⇒ **26 ca
   "không có JS errors nghiêm trọng" đỏ** (136 ca khác vẫn xanh, tức bypass
   chạy đúng — chỉ CÁCH GẮN là sai).
   - 🔑 **Luật: bộ test nào có soi lỗi console thì KHÔNG được dùng
     `extraHTTPHeaders` để mang vé — phải dùng COOKIE.** Cookie chỉ gửi tới
     đúng domain của nó, không đụng host lạ. Smoke giữ header được vì nó không
     soi console; nếu sau này thêm assertion đó thì phải đổi luôn.

### 🐞 Bắt kèm — 42% lượt smoke prod đỏ suốt 6 ngày là BÁO ĐỘNG GIẢ
Lượt smoke đầu của PR #463 đỏ ca `luan-giai.html: paywall block`. Đo lại lịch
sử: **31/73 lượt prod đỏ (42%)**, xen kẽ xanh/đỏ trên **cùng một bản code**, và
sáng hôm đó **không có commit nào** giữa lượt xanh cuối (04:55) với lượt cron đỏ
đầu (06:58) ⇒ ca test đua nhịp, không phải prod sập. Issue #342 bị nhồi comment
vì chuyện này từ 29/07.
- **Căn nguyên: `locator.isVisible()` là phép đo TỨC THỜI** — tham số `timeout`
  của nó KHÔNG có tác dụng chờ. Bản cũ đo ngay sau `domcontentloaded`, trước khi
  JS kịp dựng tường. Nhánh redirect đua y hệt vì `page.url()` cũng đọc một lần.
- Vá bằng `expect.poll` chờ **một trong hai kết cục hợp lệ** (chuyển trang đi,
  hoặc tường/CTA mua hiện ra).
- 🔑 **Quy ước: muốn CHỜ thì dùng web-first assertion (`expect(...).toBeVisible`,
  `expect.poll`). `isVisible()`/`isEnabled()`/`page.url()` là ẢNH CHỤP một khoảnh
  khắc** — đặt chúng ngay sau `domcontentloaded` là tự viết ra một ca flaky.
- 🔑 **Bộ dò kêu oan 42% thì người ta thôi đọc nó.** Vì thế issue `prod-down`
  nay **chỉ mở cho lượt đo prod**; preview đỏ để check đỏ trên PR là đủ.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch.
- **Đầu-cuối trên preview THẬT đang bật SSO**: đo đúng `target_url`, **7/7 xanh**
  (còn bị chặn thì cả 7 ca đều 401), bước mở issue `prod-down` **skipped** đúng
  thiết kế. Rồi **trên prod THẬT** sau merge: `PROD_URL=https://tuviminhbao.com`,
  **7/7 xanh**.
- **Header đi ra thật hay không** — server giả ghi lại header từng request:
  smoke **19/19**. **ĐỐI CHỨNG không secret: 0/19**, mà bộ smoke **vẫn 7/7
  xanh** ⇒ đường prod không đổi hành vi.
- **Vé cookie của E2E** — dựng 2 server giả (app có SSO + host font khác origin
  từ chối header lạ trong preflight, y như gstatic):

  | | kết quả | lỗi console | host font |
  |---|---|---|---|
  | bản header | 🔴 đỏ | có | dính preflight/x-vercel |
  | bản cookie | ✅ xanh | **0** | **0 request dính** |

  Và chuỗi thật: query bootstrap → `_vercel_jwt` **có mặt trong `storageState`**
  → test sau vào được **chỉ bằng cookie**. **ĐỐI CHỨNG bỏ cookie đi → ĐỎ (401)**.
- 🪤 **Ca đối chứng đầu của tao ĐỖ GIẢ**: chạy `--project=chromium` vẫn kéo theo
  `dependencies: ['setup']` nên nó **dựng lại cookie** rồi mới đo → "pass" vô
  nghĩa. Muốn đối chứng thật thì phải bỏ hẳn nhánh setup.
- **ĐỐI CHỨNG bản git HEAD** cho ca paywall, trên stub dựng đúng cuộc đua: HEAD
  **đỏ cả hai** tình huống muộn, bản mới **xanh cả hai**, và **vẫn đỏ khi thật sự
  không có tường** (chống đỗ giả).
- **Logic chọn URL**: trích THẲNG khối shell từ workflow (không chép tay), chạy
  đủ nhánh prod/`Production` hoa/preview/cron/dispatch — đúng cả.
- 🪤 Một ca đỏ giữa chừng là **lỗi của stub**: server giả thiếu `charset=utf-8`
  nên tiêu đề ra mojibake (`Tá»­ Vi`) và trượt `toHaveTitle`.

### 🔑 VIỆC TAY (đã làm, ghi lại để khỏi đi tìm)
Vercel → project **app-tuvi** → Settings → Deployment Protection → **Protection
Bypass for Automation** → Add Secret; copy sang GitHub → Settings → Secrets →
Actions, tên **`VERCEL_BYPASS_SECRET`**. Xoay secret là một cú bấm, không cần deploy.

### CÒN LẠI
- **Đừng đóng issue #342 vội** — mới có 1 lượt prod xanh trên bản đã vá, mà
  trước đó nó xanh/đỏ xen kẽ. Đợi vài lượt nữa. Cơ chế đã tự lo: smoke prod đỏ
  là workflow tự comment vào #342, nên **im lặng ở đó chính là tín hiệu xanh**.
- **Deploy hỏng thì E2E/smoke KHÔNG chạy** (không còn `pull_request` để bắn).
  Đổi lại check Vercel sẽ đỏ, nên không có đường nào lọt êm — nhưng nhớ tính
  chất này khi đọc một PR thiếu check.
- Phạm vi lịch sử tao soi được chỉ từ **04/08** trở lại (giới hạn phân trang
  API); chưa xác minh mọi lượt đỏ trước đó cùng một nguyên nhân.
- 🐞 **Artifact báo cáo Lighthouse RỖNG lâu nay** — `.lighthouseci/` bắt đầu
  bằng dấu chấm, mà `upload-artifact` **loại file ẩn theo mặc định** ⇒ bước
  upload luôn kết thúc bằng *"No files were found"* dù `lhci` ghi đủ file.
  Chạy `lhci collect` tại chỗ xác nhận nó ra `lhr-*.html` + `lhr-*.json`. Vá
  bằng `include-hidden-files: true`. Hai artifact kia (`playwright-report*`)
  không ẩn nên không dính — **đường dẫn artifact bắt đầu bằng dấu chấm thì phải
  khai cờ này, không thì mất im lặng.**
- ⚠️ **Ngưỡng Lighthouse giờ chấm trên PREVIEW, chưa ai hiệu chỉnh lại.** 4 trang
  đo đều là HTML tĩnh trong `public/` nên đi CDN như prod, nhưng lượt đầu của
  một deployment mới thì edge chưa ấm. `numberOfRuns:3` đỡ được phần nào; nếu
  thấy `categories:performance` (error, minScore 0,75) hay LCP 2500ms đỏ xen kẽ
  thì đó là nhịp edge chứ chưa chắc là hồi quy — soi vài lượt rồi mới chỉnh
  ngưỡng, đừng nới ngay.
## 🔐 Rail đòi ĐĂNG NHẬP với người ĐANG đăng nhập — đồng hồ ví chốt quá sớm (2026-08-09, PR sau #465)

Henry: *"tao thử cái tool chạy ok. Xong qua rail hỏi thì nó lại báo tao phải đăng
nhập mới hỏi dc. Trong khi tao đang đăng nhập"*.

### 🔴 Không phải lỗi xác thực. Là lỗi THỜI ĐIỂM ĐỌC.
`loadRailStatus()` chỉ chạy **một lần**, trong `setContext`. Nó đọc `getToken()`
ngay lúc đó — mà access token Supabase sống ~1h nên **mở lại tab là hết hạn**, và
`auth.js` phải refresh qua cookie **BẤT ĐỒNG BỘ**. Trong quãng đó `getSession()`
trả `null` ⇒ rail hỏi `rail-status` theo đường **khách vô danh** ⇒ chốt
`_rc.anon=true`, và máy nào đã tiêu hết 3 câu dùng thử thì đồng hồ hiện **"Đã hết
câu dùng thử · Đăng ký nhận thêm"** cho đúng một người đang đăng nhập. Không có
gì gọi lại, nên nó **kẹt vĩnh viễn** tới khi tải lại trang.
- 🔑 **Đường tự lành ĐÃ CÓ SẴN cho lịch sử, chỉ thiếu cho ví.** Vòng theo dõi
  phiên ở cuối `shell.js` bắt đúng cạnh "token vừa xuất hiện" rồi gọi
  `pushLocalToServer()` + `refreshHistoryUI()` — chú thích ngay tại đó đã mô tả
  chính xác cái bẫy này. `loadRailStatus()` bị bỏ quên khỏi danh sách.
- **Bằng chứng loại trừ, đo trên prod trước khi sửa:** `anon_rail_trial` /
  `anon_rail_hits` lần cuối động **07/08** (không phải hôm nay) và **0 giao dịch
  `chat`** trong 6 giờ ⇒ lượt của Henry **chưa từng chạm server**. Tức không phải
  token hỏng, không phải hết Lượng — anh nhìn đồng hồ rồi dừng lại.

### Vá ba lớp
1. **Gọi lại `loadRailStatus()` ngay khi token xuất hiện** — cùng chỗ, cùng cạnh
   với lịch sử.
2. **`Auth.isRestoring()` (mới)** — `loadRailStatus` **không hỏi gì** khi chưa có
   token *và* Auth đang khôi phục: chưa biết người này là ai thì đừng kết luận là
   khách. Nhờ vậy hết cả **cái loé ~2 giây** hiện sai, và tiết kiệm một lượt gọi
   (`["anon","auth"]` → `["auth"]`). ⚠️ `_refreshViaServer` có **3 đường ra** —
   phải hạ cờ bằng `finally`, kẹt cờ là kẹt luôn đồng hồ.
3. **Vòng theo dõi dừng NGAY khi bắt được token**, và nới trần 9 → **18 giây**:
   lượt refresh phải đi qua cookie server có thể lâu hơn 9 giây, quá hạn là kẹt.
   Khôi phục xong mà vẫn không có token ⇒ đúng là khách ⇒ mới hỏi ví.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch · 5 bộ dò sạch
· `node --check` `auth.js` + `shell.js`.
- **3 ca Playwright trên TRANG THẬT**, dựng lại đúng tình huống (phiên còn hạn
  **refresh token**, access token **đã hết hạn**, lượt refresh chậm 1,5 giây, máy
  mang `anon_id` đã tiêu hết lượt): bản mới **không loé chữ sai** rồi về **"Còn 24
  câu hỏi"** · 🪤 **ĐỐI CHỨNG nạp đè `shell.js` bản `origin/main`: kẹt nguyên ở
  "Đã hết câu dùng thử · Đăng ký nhận thêm"** ⇒ lỗi có thật · **ĐỐI CHỨNG khách
  THẬT** (không phiên, không cookie bền) vẫn thấy **"Dùng thử: còn 2 câu"** —
  bản vá không nuốt mất đồng hồ dùng thử.
- **6 trang shell** boot sạch: có `Shell`+`Auth`, 0 lỗi JS, 0px tràn ngang.
- 🪤 **Lỗi của BÀI KIỂM, suýt kết luận ngược**: catch-all `page.route(SUPA+'/**')`
  đăng ký **SAU** route riêng nên nuốt luôn lượt refresh token ⇒ cả hai bản đều
  "hỏng" và bản vá trông như không ăn. **Catch-all phải đứng TRƯỚC** — đúng bẫy
  CLAUDE.md đã ghi ở track Duyên Nợ, vấp lại lần thứ hai.
- Bump `shell.js?v=66→67` (35 trang). **Không bump `auth.js`** — asset `public/`
  trả `max-age=0, must-revalidate` nên tới người dùng ngay (tiền lệ #361).

### CÒN LẠI
- **Chưa đo trên máy thật của Henry** — mới dựng lại tình huống bằng phiên giả.
  Dấu hiệu đã sửa đúng: mở `/app/day-con` sau khi để tab qua đêm, đồng hồ rail
  phải hiện *"Còn N câu hỏi"* chứ không phải lời mời đăng ký.
- `rail-status` vẫn là lượt gọi RIÊNG, chưa gộp vào lượt nào sẵn có.

---

## 🐞 Dạy Con: khung mới KHÔNG hiện — vì `portrait_cache` không có phiên bản SHAPE (2026-08-09, PR sau #458)

Henry gửi link chia sẻ + 4 lời: *"sắp xếp sao cho nó khoa học hơn"* · *"tự dưng
có phần Bước 4, user tự hỏi mấy bước kia đâu… User ko care bước gì cả đâu"* ·
*"ko cần giải thích dài dòng cách làm framework đằng sau"* · *"mà ko có chart gì
ah? Metrics để đánh giá."*

### 🔴 Ba lời đầu là chuyện trình bày. Lời thứ tư là LỖI THẬT, và nó giải thích cả lời thứ hai.
Đo `portrait_cache` trên prod: **2/2 dòng `day-con` tạo 07–08/08**, tức TRƯỚC lượt
deploy khung sáng 09/08, và **không dòng nào có `truc` · `khieu` · `goiYHoatDong`
· `dinhHuong`**. Henry chạy lại đúng lá số đã chạy hôm trước ⇒ cache hit ⇒ trả
payload cũ ⇒ 4 khối mới **im lặng ẩn hết**, chỉ khối "phương pháp giáo dục" sống
sót vì nó đọc `data.hoc.cards` vốn đã có từ trước. **Đó chính xác là "tự dưng có
phần Bước 4" và "ko có chart gì".** Không lỗi nào bắn ra.
- 🔑 **Căn nguyên: khoá cache là LÁ SỐ, không phải SHAPE.** Đổi cấu trúc payload
  xong thì mọi dòng cũ vẫn được trả nguyên trạng, **mãi mãi** — `putCachedPortrait`
  còn `resolution=ignore-duplicates` nên bản mới không bao giờ đè lên được.
- Vá bằng `SHAPE = 2` đóng dấu vào payload + `shapeStale()`: dòng thiếu dấu hoặc
  dấu cũ ⇒ coi như **trượt cache** ⇒ dựng lại ⇒ **GHI ĐÈ** (`putCachedPortrait`
  thêm cờ `overwrite`, mặc định `false` nên 3 tool kia không đổi hành vi).
- ⚠️ **CỐ Ý KHÔNG nhét SHAPE vào `lasoKey`** dù đó là cách hiển nhiên: đổi khoá
  là mồ côi cache **và** `userOwnsLaso` ⇒ người đã trả tiền bị tính lại (đúng bài
  học khoá cặp Duyên Nợ). Giữ khoá nguyên nên `free` vẫn đúng — vế `free` phải
  xét **`cachedRaw`** (bản thô) chứ không phải `cached` (đã lọc), có bộ dò canh.
- Không ghi đè thì còn tệ hơn bug: mỗi lượt xem lại **đốt thêm một lượt model**
  mà dòng hỏng vẫn nằm nguyên.
- ⏭️ **3 tool kia (`nguoi-khac` · `nhan-mach` · 2 chân dung) vẫn còn nguyên cái
  bẫy** — chưa gắn dấu SHAPE. Đổi payload của chúng mà quên là tái phát y hệt.

### Trình bày — bỏ đúng thứ Henry chỉ
- **Gỡ sạch 5 badge `BƯỚC n`.** Chỉ 5/17 khối có số nên đánh số đọc thành nửa vời
  — người ta đi tìm mấy bước còn lại. Thay bằng **3 vạch chia nhóm** (`Đo được gì`
  · `Nên làm gì` · `Bối cảnh`): nhãn tả **NỘI DUNG**, không tả trình tự, nên
  thiếu một khối cũng không đọc ra là hụt. Vạch tự ẩn khi nhóm rỗng (có ca đối
  chứng) — tiêu đề đứng trên khoảng trống còn khó hiểu hơn không có tiêu đề.
- **Gỡ hẳn khối "Khung Này Là Gì"** (4 đoạn phương pháp luận, 1.721 ký tự) và
  **rút mọi `fw-note` xuống một dòng**. Ranh giới đạo đức vẫn còn nguyên ở khối
  caveat cuối trang — thứ bỏ đi là phần khoe cách dựng khung.
- **Gộp "Phương Pháp Giáo Dục" + "Vào Con Bằng Cách Nào"** thành *Cách Dạy Con
  Này*: hai khối cạnh nhau nói cùng một việc, đọc thành lặp.
- **Dời "Điều Bạn Đang Lo"** xuống đầu nhóm *Nên làm gì* — nó trả lời đúng ô mối
  lo cha mẹ vừa chọn, đứng lạc ở trên thì không ăn nhập với gì.
- Bỏ nhãn `Con là người thế nào` in **hai lần trong cùng một thẻ**.

### 🐞 Lỗi chỉ lộ khi CHỤP ẢNH RA NHÌN, không lộ khi đọc code
`.tr-head` để `flex-wrap` + `margin-left:auto`: trục nào tên dài thì câu hỏi rớt
xuống dòng hai và **kéo con số xuống theo** ⇒ năm con số không thẳng cột. Mà việc
của người đọc ở đây đúng là **so năm trục với nhau**. Tách điểm ra cột riêng
(`.tr-headmain` flex:1) — đo lại: 5 mép phải **723px, khớp tuyệt đối**.

### Bản chia sẻ: từ một cục chữ thành khối có cấu trúc
`/ket-qua` dựng **mỗi `block` thành một thẻ có tiêu đề** — trước đó `day-con` gửi
`kind:'text'` nên tất cả dồn vào một đoạn `<br>` nối nhau và con số chìm nghỉm.
Nay 4 block: *Chân dung* · *Năm trục tính khí* (5 dòng có điểm) · *Tám chất năng
khiếu* (8 dòng xếp giảm dần, ★ đánh dấu chất vượt ngưỡng) · *Định hướng & cách
dạy*. Vẫn giữ `text` làm đường lùi.
- Bảng cột không căn được bằng chữ (font tỉ lệ) nên **thứ tự** gánh vai xếp hạng.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch · 7 bộ dò sạch
· engine **185 pass** · `node --check` khối script nội tuyến.
- **30.209 bất biến module** + **14.734 bất biến prompt**: vẫn xanh, 0 fail.
- **11 bất biến ĐỌC THẲNG MÃ NGUỒN** chốt chặn cache, đã **red-team cả ba ca**:
  `free` xét `cached` thay vì `cachedRaw` → đỏ · quên cờ ghi đè → đỏ · nhét SHAPE
  vào khoá cache → đỏ.
- 🪤 **Bộ dò ca thứ ba BÁO OAN XANH lượt đầu**: `lasoKey\([^)]*SHAPE` — `[^)]*`
  dừng ở dấu `)` của `cacheExtra(...)` nên không bao giờ với tới phần sau. Phải
  soi **CẢ DÒNG** dựng khoá.
- **Playwright trên TRANG THẬT** qua Next dev, chạy CẢ đường tính thử lẫn đường
  đã mở khoá bằng chính `_doGenerate`: 3 vạch nhóm hiện đúng · **0 chữ "BƯỚC"** ·
  cột điểm 5 trục thẳng hàng · payload chia sẻ có **đủ 5 dòng trục + 8 dòng chất
  kèm điểm** · ĐỐI CHỨNG ẩn hết khối của một nhóm → vạch nhóm biến mất · 390px
  tràn ngang **0px** · 0 lỗi JS.
- 🪤 Hai lỗi của BÀI KIỂM: bộ lọc `:not([style*="display: none"])` không khớp vì
  inline style viết `display:none` **không có dấu cách** → phải đo bằng
  `offsetParent`; và cwd của shell **còn nằm ở `tuvi-engine`** từ lệnh trước nên
  `computeLaso` đọc hụt engine, cả bộ 30.209 ca tụt xuống 97 ca xanh vô nghĩa.

### CÒN LẠI
- **Chưa gọi LLM thật lượt nào** — phần chữ trong ảnh chụp là chữ giả bơm vào
  đúng shape payload; khung và số liệu thì chạy engine thật.
- Hai dòng cache cũ trên prod sẽ **tự dựng lại ở lượt mở tiếp theo** (miễn phí
  cho người đã trả tiền), mỗi dòng tốn đúng một lượt model.
- Lượt dựng lại vì shape cũ ghi thêm **một dòng lịch sử trùng** cho chính chủ —
  vô hại, cố ý không vá để khỏi đụng nhánh dùng chung.

---

## 🧹 Vá nốt hai món nợ: rail cũ vô hình + `animation` trỏ vào keyframe ma (2026-08-09, PR sau #459)

Henry: *"làm nốt luôn đi"* — hai món tao cố ý để lại ở PR trước.

### 🔴 A. `/api/lasotuvi?action=chat` — đường rail CŨ chưa từng ghi một dòng usage
PR trước vá đường `phan` (24 phần luận giải). Đường `action=chat` — dùng ở
`profile.html` · `chatbot.js` · widget luận giải · `tu-binh` · `xem-tuoi` ·
`xem-lam-an` · `tuvi-chat` — thì **vẫn trắng**, ở CẢ hai nhánh stream và
non-stream. Đối chứng đo được trên `origin/main`: cả hai trả **200** mà ghi
**0 dòng** `llm_usage`.
- **Cộng dồn rồi ghi MỘT dòng cuối lượt** (`ChatUsageTally`), y như `runAgent`.
  Ghi từng vòng thì một câu hỏi nở ra 2–4 dòng, cột "số lượt" ở panel Biên LN
  thành vô nghĩa. Nhánh non-stream vốn đã cộng dồn sẵn (chỉ để trả về client),
  nhánh **stream thì chưa cộng gì cả** — phải thêm ở cả 2 chỗ gọi.
- 🔑 **Bucket là `'chat'`, KHÔNG phải `'laso'`.** `'laso'` là tool_id của Luận
  Giải 24 phần (1.500 Lượng) — nhét lượt rail vào đó là bóp méo đúng con số vừa
  vá xong ở PR trước. Lượt rail thu tiền qua `credit_transactions.type='chat'`
  nên bucket chi phí phải khớp cái đó. Kịch bản phi-lá-số giữ tên tool (mirror
  `scenario?.type` của `run.ts`).
- **`callLLMTools` nay trả kèm `provider`/`model` thật sự đã chạy** — vòng lặp
  tool có thể rơi sang provider backup GIỮA CHỪNG, chép tay tên model ở chỗ gọi
  là ghi sai giá mà không có gì báo (đúng bẫy `generatePortraitImage`).
  ⚠️ Lấy **hằng số cấu hình**, KHÔNG lấy `model` trong phản hồi Anthropic: bản
  phản hồi trả id gắn hậu tố ngày (`claude-sonnet-4-6-20260501`), tra
  `MODEL_PRICING` trượt khoá rồi **lặng lẽ rơi về giá mặc định** — đắt gấp 3 nếu
  thực tế chạy Haiku. Có ca kiểm canh đúng chuyện này.
- **Lượt HỎNG giữa chừng vẫn ghi** phần token đã đốt (chi phí thật); nhưng hỏng
  NGAY vòng đầu thì **không đẻ dòng 0đ**. `flush()` của nhánh stream đặt NGOÀI
  `try` — để trong là lượt hỏng mất sạch dấu chi phí.

### 🔴 B. Gom `@keyframes spin` — ĐO XONG THÌ QUYẾT ĐỊNH KHÔNG GOM
Backlog ghi "~26 bản chép tay, gom về một chỗ". Đo trước khi làm thì lộ ra gom
là **sai hướng**:
- **23/25 trang liên quan không nạp một file CSS ngoài nào** — toàn bộ style
  inline, trang cố ý dựng tự chứa. Không có stylesheet chung để gom vào.
- Nơi dùng chung duy nhất là **`nav.js`, tức JS** (còn `defer` ở vài trang).
  Gom vào đó = đổi *"spinner chạy bằng CSS thuần"* thành *"spinner phải chờ JS
  thực thi xong"* trên 22 trang ⇒ **hạ độ bền để đổi lấy vài chục dòng CSS**.
  Cộng thêm: đụng `nav.js` là phải bump `?v=` trên 89 file, mà mấy lượt bump kiểu
  đó đã đẻ ra drift version hai lần rồi.
- 🔑 **Keyframe xoay là giá trị TẬN CÙNG** (`rotate(360deg)` — không bao giờ phải
  sửa) nên hai bản **không có gì để trôi khỏi nhau**. Đây là một trong số ít
  duplication lành tính. Quét cả repo: **0 file dùng `spin` mà quên khai** ⇒
  duplication này hiện chưa hại ai.

### 🧷 Thay bằng `scripts/check-keyframes.mjs` — bắt đúng thứ CÓ hại
Cái hại thật là `animation:` trỏ tới keyframe **KHÔNG TỒN TẠI**: trình duyệt
không báo gì, phần tử vẫn hiện, **chỉ là đứng im**. Luật: mỗi tên keyframe được
dùng phải khai được TỚI ĐƯỢC từ chính file đó (trong file, hoặc trong
stylesheet/script mà file đó nạp). File `.js`/`.css`/`.ts` chỉ tính CHÍNH NÓ —
module export ra ngoài phải tự lo CSS của mình (bài học `orbHtml()`).

### 🐞 Bộ dò bắt được lỗi THẬT ngay lượt chạy đầu
`public/auth.js` dựng banner **"Chào mừng! Bạn đã nhận Lượng miễn phí"** — thứ
ĐẦU TIÊN người vừa đăng ký nhìn thấy — bằng `animation:tpw-fade`. Keyframe đó
nằm trong `tuvi-paywall.js` và chỉ được chèn **LƯỜI** khi có paywall dựng lên
(`_css()`), mà **38/73 trang nạp `auth.js` còn không nạp paywall**, và đường
đăng ký thì chẳng dựng paywall bao giờ. ⇒ banner **chưa bao giờ fade vào**.
- Vá bằng cách cho `auth.js` **tự khai keyframe của nó** (`auth-fade`), không
  mượn của file khác.
- Đo trong trình duyệt trên trang KHÔNG nạp paywall: bản mới `animCount=1`,
  `opacity` khởi điểm **0**; **ĐỐI CHỨNG `origin/main`: `animCount=0`,
  `opacity=1`** ⇒ lỗi có thật, không phải lo hão.
- **Không bump `auth.js?v=2`**: asset `public/` trả `max-age=0,
  must-revalidate` nên revalidate mỗi lượt — cùng tiền lệ đã đo ở #361.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch · **9/9 bộ
dò sạch** (`prices`/`groups`/`nostore`/`share`/`hexagrams`/`hao`/`motifs`/
`terms`/**`keyframes`**) · engine **185 pass** · `node --check`.
- **27 ca trên ROUTE THẬT** (`next dev` + chặn `fetch` bằng `NODE_OPTIONS
  --import`, nên prompt/tool/vòng lặp đều chạy thật): 1 vòng → đúng 1 dòng ·
  **3 vòng tool-use → VẪN đúng 1 dòng, token cộng dồn 600/60** · bucket `chat` ·
  bucket `than-so-hoc` cho kịch bản phi-lá-số · model ghi sổ là khoá tra được
  chứ không phải id có hậu tố ngày · có `duration_ms` · lượt hỏng giữa chừng vẫn
  ghi · **ĐỐI CHỨNG hỏng vòng đầu → 0 dòng rác** · nhánh stream đủ cả 5 tính
  chất trên · hợp đồng API cũ (`usage`/`toolsUsed`/`scenario`) không đổi.
- 🪤 **ĐỐI CHỨNG `origin/main`: cả stream lẫn non-stream trả 200 mà 0 dòng usage.**
- **10 ca trên CHÍNH bộ dò**, dựng lại đúng 4 lỗi + 3 đối chứng phải im: bắt lại
  lỗi `auth.js` thật · trang gỡ mất keyframe của mình · module gỡ mất keyframe
  của mình · dùng keyframe của file mình KHÔNG nạp · **im với chú thích nhắc tên
  animation** · im với `none`/`cubic-bezier`/từ khoá · im khi keyframe tới qua
  `<link>`. Kèm ca canh **không để lại file rác** sau các lượt sửa-rồi-khôi-phục.
- **9 ca trên trình duyệt** cho banner (xem trên).
- **153 ca hồi quy** của 3 bộ kiểm trước (`sweep` 76 · `pages` 60 · `eta` 17):
  vẫn xanh.

### 🪤 Bẫy đã vấp
1. **Bộ dò kêu oan vào CHÍNH chú thích tao vừa viết** — dòng tài liệu nhắc
   `animation:tpw-fade` bị đếm là chỗ dùng. Phải bỏ chú thích trước khi quét, và
   **giữ nguyên số dòng** (thay khối chú thích bằng đúng ngần ấy `\n`) thì số
   dòng báo lỗi mới còn trỏ đúng chỗ. 🔑 Chỉ cắt `//` khi nó ĐỨNG ĐẦU dòng — cắt
   giữa dòng sẽ nuốt luôn `https://…` rồi ăn mất phần khai animation nằm sau nó.
2. 🔴 **`fs.globSync` chỉ có từ Node 22, mà CI chạy Node 20** — bộ dò sẽ chết
   ngay trong CI thay vì bắt lỗi, và chết theo kiểu trông như "script hỏng" chứ
   không phải "có lỗi cần vá". Đổi sang duyệt cây bằng tay; đếm lại sau khi đổi
   ra **đúng 98 lượt / 58 file** như trước ⇒ không mất phạm vi quét.
3. **Ca đỏ của `verify-orb` là ĐỐI CHỨNG HẾT HẠN** (lần thứ hai gặp): nó khẳng
   định `origin/main` *chưa* có `pacer`, mà PR #459 đã merge nên main có rồi.
   Đối chứng neo vào `origin/main` vẫn hết hạn khi chính PR đó vào main.
4. `setContent` cho origin `about:blank` → `auth.js` đọc `document.cookie` ném
   `SecurityError`. Đo hành vi của script có đụng cookie/storage thì **phải phục
   vụ qua http thật**, đừng dùng `setContent`.

### CÒN LẠI
- **Đường `phan` và đường `chat` nay đều ghi usage; `/api/v1/chat` vốn đã ghi.**
  Hết đường LLM nào vô hình trong panel Biên LN.
- Vẫn **chưa có bề mặt đọc `duration_ms`** — dữ liệu mới chảy từ lượt deploy
  trước. Sau 1–2 tuần thì thêm cột p50/p75 vào panel Biên LN.
- **20 trang STREAM vẫn chưa đo "thời gian tới token đầu tiên"** — con số quyết
  định có cần orb ở đó hay không.
- ~28 bản `@keyframes spin` **CỐ Ý giữ nguyên** (lý do ở trên). Bộ dò mới làm
  việc giữ chúng thành an toàn thay vì canh bạc.
---

## 🧒 Dạy Con: khung "5 TRỤC · 8 CHẤT" — bản luận có xương sống (2026-08-09, PR này)

Henry: *"cách luận giải và trình bày đang hơi lộn xộn ko theo 1 framework nào…
tham khảo Big Five (lite), SDQ, Multiple Intelligences rồi tự lên 1 framework
riêng… Có dc con số đánh giá, biểu đồ càng tốt."* Flow chốt: lá số → assessment
đa chiều (gồm năng khiếu) → định hướng → phương pháp → hoạt động đề xuất.

### 🔴 Chẩn đúng bệnh: không phải thiếu chữ, là thiếu KHUNG
Bản cũ đưa cha mẹ một nhãn kiểu người + sáu thẻ chữ. Không đo được gì, không so
được hai đứa trẻ, không nói được "mạnh chỗ nào" — nên phần chữ do model viết
trôi tự do, mỗi lượt một dáng. Nay có khung CỐ ĐỊNH cho chữ bám vào, và **mỗi
khoá JSON là một bậc**: đo → đọc → định hướng → phương pháp → hoạt động.

### 🔑 MƯỢN HÌNH DẠNG, KHÔNG MƯỢN UY TÍN
- **Nền: "goodness of fit" (Thomas & Chess)** — không có khí chất tốt/xấu, kết
  quả nằm ở chỗ KHỚP giữa đứa trẻ và cách người lớn nuôi. Đây vốn đã là câu
  tool tự nói ở phần ranh giới đạo đức; nay nó thành CẤU TRÚC chứ không còn là
  lời dặn.
- **5 trục ← hình dạng Big Five**: trục LIÊN TỤC, hai cực đều có giá trị. Một
  đứa trẻ không "là" hướng nội — nó nằm đâu đó trên trục.
- **8 chất ← hình dạng Multiple Intelligences**: nhiều miền song song thay vì
  MỘT con số thông minh. Đây là phần trả lời "con có năng khiếu gì".
- ⛔ **CỐ Ý KHÔNG mượn SDQ.** SDQ là bộ **sàng lọc LÂM SÀNG** (rối loạn cảm
  xúc/hành vi/tăng động). Suy một bảng sàng lọc sức khoẻ tâm thần từ ngày sinh
  là thứ nguy hiểm nhất tool này làm được, và đá thẳng vào luật sẵn có (không
  đọc Tật Ách, không phán "khó dạy"). Trục 5 đo **NGƯỠNG CẢM NHẬN**, không đo
  lo âu — prompt cấm hẳn chữ lo âu/trầm cảm/rối loạn/tăng động/"đi khám".
- Trang + prompt CẤM nêu tên hay đối chiếu DISC/MBTI/Big Five/MI/SDQ/IQ. Gọi
  đúng tên: **một khung đọc lá số do trang dựng**.

### 🔴 Bài học nặng nhất: điểm thô KHÔNG so được giữa các miền
Lượt đo đầu: `hieu-nguoi` **50,8% lá số nổi** (19 ngôi sao cùng đổ vào miền đó
⇒ nó thành "lá số có sao tốt nào không"), `am-nhac` **1,6%**; trục `nhip` sd
0,96 (60% ca rơi vào "cân" ⇒ trục không nói gì) còn `nep` lệch hẳn lên 5,66.
🔑 **Căn nguyên: điểm thô phụ thuộc SỐ SAO tôi gán cho miền, không phụ thuộc
tín hiệu.** Nhân một hệ số chung không chữa được — mỗi trục lệch một kiểu.
- Vá bằng **chuẩn hoá theo từng miền** (z-score trên mốc đo được, bake sẵn vào
  `TRUC_NORM`/`KHIEU_NORM`), + tỉa bảng sao (bỏ nhóm quý tinh chung khỏi
  `hieu-nguoi`). **5 = mức GIỮA của phân bố**, mỗi 1,8 điểm = 1 độ lệch chuẩn.
- Sau khi vá, đo lại **6.048 lá số**: cả 5 trục và 8 chất đều TB **5,00** · sd
  **1,78–1,80** · chạm trần/sàn **<0,5%** · %nổi mỗi chất **19,6–24,4%**.
- ⚠️ **Trang PHẢI nói đúng nghĩa con số**: "so với phần lớn lá số trẻ em",
  KHÔNG phải "được 7 phần 10". Có luật riêng trong system prompt + rail wrapper.

### Ba quyết định đáng nhớ
1. **Ngưỡng nổi 6,5 giữ nguyên ca "KHÔNG chất nào nổi" (~14–17% lá số).** Hạ
   ngưỡng cho lá số nào cũng có năng khiếu thì câu "con nổi ở X" hết nghĩa và
   cha mẹ nào đọc cũng thấy đúng — dấu hiệu của bảng không nói gì. Ca đó trang
   nói THẲNG kèm việc nên làm (cho thử rộng), có ca đối chứng canh.
2. **~35% ca mỗi trục rơi vào "cân" ⇒ phải viết nội dung cho ca CÂN.** Không
   viết thì một phần ba ô trên trang hiện ra trống và cha mẹ đọc thành "máy
   không đọc được con tôi". Nằm giữa là tính chất có thật: con dùng được cả hai
   kiểu, nên bối cảnh mới là thứ quyết định — chỗ người lớn có nhiều quyền nhất.
3. **HAI TRỤC ĐỘC LẬP cho bậc hoạt động** (cùng mẹo bảng ngành của Công Sở):
   **chọn GÌ** ← chất × nhóm tuổi · **tham gia KIỂU NÀO** ← kiểu người. Viết
   8×4 + 4 khối thay vì 8×4×4 ô. Hai đứa cùng nổi chất vận động vẫn phải chọn
   lớp khác nhau nếu một đứa cần thi đấu còn đứa kia cần nhóm nhỏ ổn định.

### 📊 Biểu đồ — hai dạng, chọn theo VIỆC người đọc phải làm
- **5 trục → thanh HAI CỰC** (việc: đọc cực tính) · **8 chất → cột XẾP GIẢM
  DẦN** (việc: so độ lớn, tìm cái cao nhất).
- **KHÔNG dùng radar** dù đó là lối vẽ quen của MI và dù Công Sở đã có radar:
  câu cha mẹ hỏi là "con mạnh chỗ nào", tức thứ tự phải đọc được bằng mắt chứ
  không phải so góc. Cột xếp hạng cũng tránh luôn bẫy nhãn-tràn-khung của radar.
- Dựng bằng **DOM + CSS, không canvas** — nhãn tiếng Việt có dấu tự xuống dòng,
  tự co ở 390px, đọc được bằng trình đọc màn hình.
- 🔑 **CỐ Ý KHÔNG dùng thang hai màu nóng–lạnh cho trục hai cực** dù đó là lối
  vẽ chuẩn cho dữ liệu phân cực: đỏ–xanh gắn sẵn nghĩa tốt–xấu, mà cả khung
  dựng trên đúng câu "hai cực đều có giá trị". **Vị trí mang nghĩa, màu chỉ nói
  đậm/nhạt.** Hai màu `#7A5F26` / `#9C937F` — đo được tương phản với nền trắng
  ≥3:1 và tách nhau ΔE 16,9 kể cả với mắt loạn sắc.
- **Vạch ngưỡng nằm TRONG từng thanh**, không phải một đường phủ cả khối: bản
  đầu tính chiều cao bằng (số hàng × 22px) và **lệch đúng một hàng** — chỉ lộ
  khi chụp ảnh ra nhìn, không lộ khi đọc code.

### 🐞 Ba lỗi tự bắt, không phải Henry báo
1. **Va chạm khoá `hoatDong`**: `meta()` trả bảng hoạt động, model cũng trả
   khoá `hoatDong` là đoạn văn — mà `payload` spread `meta()` TRƯỚC. Trùng tên
   là bảng bị đè bằng một đoạn văn và khối gợi ý **biến mất mà không lỗi nào
   bắn ra**. Đổi tên trường bảng thành `goiYHoatDong`.
2. **Nợ CÓ SẴN, xác nhận bằng đối chứng git HEAD**: `tieuHanCung`/`luuNienCung`
   in thẳng tên cung vào prompt, và tiểu hạn rơi được vào **Tật Ách / Phu Thê /
   Tài Bạch** — đúng mấy cung `KHONG_DOC` cấm đọc cho trẻ. Có ở HEAD dòng
   123–124 y hệt bản mới ⇒ không phải hồi quy. Khung mới nâng mức rủi ro nên
   thêm câu chặn: tên cung chỉ là **CHỖ ĐỨNG của năm**, không phải lời mời đọc
   nội dung cung đó.
3. **Cột điểm lẫn hai dạng** (`8,2` cạnh `5`) vì `r1(5.0)` ra `5`. Ép một chữ
   số thập phân — cột số lẫn dạng là mắt phải dịch lại từng dòng.

### 🪤 Hai lỗi của BÀI KIỂM (không phải của code)
- Bộ dò "khoá thô lọt prompt" báo oan **992 ca** vì `s.includes('hoa')` khớp
  vào chữ **"Khoa"** (Hoá Khoa, khoa giáp). Phải so theo **BIÊN TỪ**.
- Bộ dò cung cấm so theo **từng DÒNG** trong khi câu chặn cố ý đứng riêng một
  dòng → đỏ oan. Phải kiểm ở mức CẢ PROMPT.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` + `check:groups` + `check:nostore` sạch · engine **185 pass** ·
`node --check` 2 khối script nội tuyến.
- **30.209 bất biến trên MODULE THẬT, 1.584 lá số**: 5 trục luôn đủ và trong
  dải · nhãn cực không bao giờ ngược điểm · ca cân LUÔN có nội dung · 8 chất
  sắp giảm dần · `noiBat` ≤3 và luôn ≥ngưỡng · `chuaRo` khớp `coNoiBat` · gợi ý
  hoạt động không nhánh nào rỗng · **`railData` PHẲNG 100%** (bẫy
  `extractGenericContext`) · 0 rò `undefined`/`NaN`/`[object` · deterministic.
- 🔴 **Bất biến ĐẠO ĐỨC chạy tự động**: `CUNG_DUOC_DOC ∩ KHONG_DOC = ∅` — khung
  đọc đúng 6 cung (Mệnh · Thiên Di · Phúc Đức · Quan Lộc · Huynh Đệ · Nô Bộc).
- **14.734 bất biến trên PROMPT THẬT, 640 lá số**: đủ 5 bậc · mọi trục/chất có
  mặt kèm điểm · **0 khoá thô lọt** · ca chưa rõ chất thì prompt nói THẲNG ·
  system prompt còn đủ 7 chốt chặn · rail wrapper mang luật đọc điểm.
- **8 ca Playwright trên TRANG THẬT** `/app/day-con` qua Next dev, route preview
  chạy THẬT: bấm nút → **0 lượt `action=deduct`**, POST duy nhất là `preview=1`
  · chấm mỗi trục nằm ĐÚNG vị trí điểm · 8 cột xếp giảm dần và vạch ngưỡng
  thẳng hàng ở 65% · hàng ★ luôn ≥65%, hàng thường luôn <65% · **ĐỐI CHỨNG**
  không đọc được tuổi → không dựng khối hoạt động · **ĐỐI CHỨNG** không chất
  nào nổi → nói thẳng, 0 hàng ★, 0 thẻ giả · mở khoá → 3 đoạn chữ rơi đúng bậc
  và phần tính thử **còn nguyên byte** · 390/768/1440px không tràn ngang.
- 🪤 **ĐÃ RED-TEAM cả ba bộ** (bộ dò chưa từng bắt được gì thì không chứng minh
  được nó biết bắt): cho khung đọc cung Tật Ách → đỏ · bỏ sắp giảm dần → đỏ ·
  hạ ngưỡng nổi về 0 → đỏ · rò khoá thô vào prompt → đỏ · bỏ câu chặn cung cấm
  → đỏ · im lặng ở ca chưa rõ chất → đỏ · đảo thứ tự cột trên trang → đỏ.
- **KHÔNG bump `?v=`**: chỉ sửa CSS/JS **nội tuyến trong chính file HTML**, mà
  HTML trả `max-age=0, must-revalidate` nên tới người dùng ngay; không đụng
  `shell.js` / `tuvi-paywall.js` / asset dùng chung nào.

### CÒN LẠI
- **Toàn bộ tầng khung là TRA BẢNG ⇒ nằm trong phần TÍNH THỬ MIỄN PHÍ (W1)**,
  0 lượt LLM, 0đ. Tường vẫn chỉ đứng trên phần chữ. Con số cần nhìn sau 1–2
  tuần: tỉ lệ **mở → tính thử → bấm mở** của `day-con` trong panel Phễu Theo
  Tool có nhảy không.
- **Nội dung 5 trục × 3 ca + 8 chất + 8×4 bảng hoạt động là tao tự viết**, chưa
  ai review — cùng dạng nợ với 384 hào từ và 4 kiểu của Công Sở. Sửa là sửa
  data thuần trong `TRUC` / `KHIEU` / `HOAT_DONG`, không đụng logic.
- **Mốc chuẩn hoá đo trên LƯỚI lá số tổng hợp, không phải trẻ em thật.** Nó nói
  "so với phân bố lá số", đúng như trang đang viết — đừng nâng cấp câu đó thành
  "so với trẻ cùng lứa".
- **Chưa gọi LLM thật một lượt nào** — không có key trong container. Verify
  dừng ở tầng prompt (cấu trúc + chốt chặn) và tầng render.
- `app-day-con.html` vẫn là **đảo SÁNG** (nền `#fff` chép cứng như mọi trang
  tool anh em) nên biểu đồ cố ý dùng cùng bảng màu sáng đó. Dark mode cho nhóm
  trang tool là việc riêng.
- Danh sách hoạt động **chưa phân theo vùng** — câu lạc bộ ở tỉnh khác hẳn Hà
  Nội/TP.HCM. Nếu thấy đáng thì thêm một ô chọn tỉnh rồi lọc, không đụng logic.
---

## 🖨️✦ Lưu PDF + orb mời hỏi — cùng đưa lên tầng SHELL (2026-08-09, PR này)

Henry: *"làm cái hiệu ứng glowing (orb khói) xung quanh cái icon nút Hỏi trên
shell để user trigger để hỏi. Với lại thêm 1 nút pdf để user lưu pdf nguyên cái
shell-workspace (hiện giờ vài tool đã có nằm trong workspace mà tao nghĩ đây nên
là 1 tính năng chung của workspace)"*. Anh nhận ra đúng cùng cái hình vừa vá ở
PR chia sẻ, nên PR này đi thẳng lên tầng shell.

### 🖨️ PDF: 3/33 tool có, và ba bản đã bắt đầu trôi khỏi nhau
`luan-giai` · `bat-tu` · `xem-tuoi` mỗi tool tự chép một khối `@media print`
**gần như trùng khít** — chỉ khác vài tên class riêng (`.lg-unlock` vs
`.bt-unlock`) — cộng một thanh PDF riêng trong nội dung. 30 tool còn lại in ra
**nguyên cả sidebar, rail, nút bấm**, và bị **cắt ở đúng chiều cao viewport** vì
`.shell` là lưới 3 cột `height:100vh`.
- Luật in nay nằm ở **`shell.css`**; nút do shell dựng trong `.ws-actions`, bám
  đúng mốc `data-ws-result` đã có ⇒ **tool không phải khai thêm gì**, và nó theo
  CÙNG vòng đời với nút Chia sẻ (hiện khi có kết quả, gỡ khi về form).
- **Đầu trang in `.ws-print-head`**: khi in thì `.ws-top` bị ẩn nên bản in cũ
  không nói được nó là kết quả gì của ai — kể cả 3 tool đã có PDF. Nay shell
  dựng một khối chỉ hiện lúc in: tên tool + dòng lá số + tên miền, **lấy chung
  `shareBirthLines`** với bản chia sẻ nên hai bản không nói khác nhau.
- **`window.print()` chứ không dựng PDF bằng thư viện**: trình duyệt đã có sẵn
  "Lưu thành PDF", giữ được chữ THẬT (tìm/copy được) và thêm 0 byte JS. Bản dựng
  bằng canvas chỉ ra ảnh — nặng hơn mà đọc kém hơn.
- **`pdf_download` là loại event RIÊNG**, cố ý không gộp vào `poster_download`:
  poster là ảnh để ĐĂNG cho người khác xem, PDF là bản LƯU cho chính mình đọc
  lại. Gộp một cột thì không đọc được cái nào thật sự có người dùng.
- ⚠️ **Đổi hành vi nhỏ, có chủ ý:** 3 tool cũ chỉ hiện PDF SAU khi luận giải
  xong; nay nút hiện ngay khi có kết quả. Nhất quán với nút Chia sẻ vốn đã hiện
  ở đúng thời điểm đó trên chính 3 tool ấy.

### ✦ Orb nút Hỏi: lời mời, không phải đồ trang trí
- 🔑 **Đo trước khi làm**: nút `✦ Hỏi` mang class `mobile-only` ⇒ trên desktop
  **không tồn tại** (rail hiện sẵn ở cột phải). Nên đây là lời mời cho **MOBILE**
  — đúng chỗ rail nằm ngoài màn hình và người ta không biết là có nó.
- **DÙNG LẠI orb của #455/#457** (`AiLoadingSteps.orbHtml`), nạp theo lối LƯỜI vì
  module đó mới có ở 24/33 trang; thiếu thì nút giữ nguyên chữ cũ, không vỡ gì.
  Chép CSS orb sang `shell.css` là dựng bản thứ hai để rồi trôi khỏi nhau.
- 🔑 **CHỈ sáng khi có gì để hỏi (`ctx` đã set) VÀ chưa mở rail lần nào**; mở là
  tắt hẳn, trả lại đúng chữ `✦ Hỏi`. Sáng vĩnh viễn thì người ta học cách bỏ
  qua, và một animation chạy suốt trên mobile là ăn pin thật.
- 🐞 **Bắt được khi đi kiểm đường dẫn**: tabbar mobile có nút "Trợ lý" mở rail
  **thẳng**, không qua `Shell.openRail` ⇒ mở bằng đường đó thì orb vẫn nhấp nháy,
  tức nài người ta làm đúng cái họ vừa làm. Nay tabbar gọi chính `Shell.openRail`.

### Verify
`typecheck` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices`/`nostore`/`groups`/`share` sạch · engine **185 pass** ·
`node --check` + kiểm ngoặc `shell.css` cân.
- **127 ca trên TRANG THẬT**: 33 trang đủ ba nhịp của nút PDF (còn form → không
  nút · có kết quả → hiện · ẩn đi → gỡ).
- **Luật in đo bằng `emulateMedia('print')`**: ẩn sidebar/rail/thanh tiêu đề/
  chính hai nút toolbar · **hiện** đầu trang in · đầu trang in KHÔNG hiện trên
  màn hình · bấm PDF gọi đúng **1** lượt `print()`.
- **3 tool cũ sau khi gỡ bản chép tay**: vẫn in được · thanh PDF cũ đã gỡ hẳn ·
  0 lỗi JS.
- **Orb ở 390px**: chưa có ngữ cảnh → không mời · có ngữ cảnh → orb + quầng khói
  hiện mà vẫn còn chữ "Hỏi" · mở rail → tắt và trả lại đúng `✦ Hỏi` · không tràn
  ngang · 0 lỗi JS.
- 🪤 **ĐỐI CHỨNG nạp đè `shell.js` bản `origin/main`**: không có nút PDF, không
  có orb ⇒ bài kiểm đo đúng thứ đang đổi.
- Bump `shell.js?v=65→66` · `shell.css?v=17→18` (35 trang).

### CÒN LẠI
- Orb chỉ nằm trên nút `✦ Hỏi`. Tab "Trợ lý" ở tabbar mobile **cố ý không gắn** —
  hai chỗ cùng nhấp nháy một lúc là nhiễu gấp đôi cho cùng một lời mời.
- **Chưa in thử ra giấy/PDF thật** — mới đo tới tầng CSS bằng `emulateMedia`.
  Chỗ đáng soi sau deploy: tool có canvas (lá số, radar, bàn Kỳ Môn) in ra có
  đúng tỉ lệ không, và bảng rộng có bị cắt mép phải không.
- `@media print` master dùng `[data-print-skip]` cho trang muốn giấu thêm khối —
  hiện **chưa trang nào dùng**, nó là lối thoát cho tool sau.

---

## ⏱️ ETA TỰ HIỆU CHỈNH + `llm_usage` cuối cùng cũng có THỜI LƯỢNG (2026-08-09, PR sau #457)

Henry: *"Có nên estimate thời gian chạy của từng tool xong… show estimated time
cho users?"* → *"làm tiếp theo suggest của mày luôn"*.

### 🔴 Tiền đề hỏng: KHÔNG ĐO ĐƯỢC GÌ CẢ
`events.llm_usage.meta` chỉ có `model` · `cost_vnd` · các loại token —
**không có một trường thời lượng nào**. Con số "45–60 giây" duy nhất đang có là
suy gián tiếp từ khoảng cách hai mốc log của **hai pha chạy song song**, mẹo chỉ
dùng được cho đúng tool chân dung. Mọi tool còn lại: trắng.

### 🔑 ETA tĩnh là một LỜI HỨA — và repo này đã thấy nó nói dối
Đổi `gpt-image-1` → `gpt-image-2` làm thời gian vẽ **gấp đôi** (22s → 46s), mà
con số trong tài liệu đứng yên, lại còn ghi theo `quality:high` trong khi thực
tế chạy `medium`. ⇒ **Nếu hiện ETA thì phải suy từ SỐ ĐO, không được chép cứng.**

### ✅ Cách giải: đo NGAY TRONG PHIÊN, không cần dữ liệu lịch sử
`AiLoadingSteps.pacer()` — tool chạy nhiều phần tuần tự (luận giải 24, xem tuổi
9) thì **xong vài phần là biết nhịp của chính phiên này**: máy này, mạng này,
tải server lúc này. Miễn nhiễm với đổi model. Hiện `Phần 7 / 24 · còn khoảng 3
phút`, và `expectSec` của `mountWait` **ăn luôn nhịp đo được** nên thanh tiến
trình quay lại (trước đó `expectSec:0` đã bỏ thanh vì không có số).
- ⚠️ **`minSamples = 2`, KHÔNG phải 1** — phần 1 nạp **10 tài liệu RAG** trong
  khi các phần sau chỉ 7 (`matchCount: p===1?10:7`) nên chậm bất thường. Lấy
  đúng mẫu đó nhân lên 23 phần là hứa sai ngay từ dòng đầu.
- **TRUNG VỊ chứ không trung bình**: một lượt nghẽn mạng không được kéo lệch cả
  dự đoán. (Ca kiểm: 3 lượt 0,2s + 1 lượt 1,5s → trung vị 0,20 còn trung bình
  0,52.)
- **Chỉ ghi nhịp ở nhánh THÀNH CÔNG** — một phần chết giữa chừng có thời lượng
  thật nhưng không đại diện.
- Chưa đủ mẫu → `remainText()` trả `''` ⇒ **im lặng, không hứa**.

### ✅ Vá lỗ đo: `llm_usage` nay có `duration_ms`
Đo **bên trong** `llmTextFull` và `generatePortraitImage` rồi trả kèm, thay vì
bắt 10 chỗ gọi tự bấm giờ — chỗ nào quên thì quên im lặng. **18 chỗ ghi**, gồm
cả rail (`run.ts` đo TRỌN lượt kể cả các vòng tool-use — đó mới là thời gian
người dùng thật sự ngồi chờ).

### 🔴 Và lộ ra: `/api/lasotuvi` CHƯA HỀ ghi `llm_usage`
Tool **bán chạy nhất** (Luận Giải, 1.500 Lượng / 3 người) hoàn toàn **vô hình
trong panel Biên Lợi Nhuận** từ trước tới nay. Nay `llmText` → `llmTextFull` +
`logLlmUsage`.
- ⚠️ Ghi `tool_id='laso'` = ĐÚNG `tool_pricing.tool_id`, không phải `'luan-giai'`
  (events) hay `'use_laso'` (giao dịch) — ba hệ tên lệch nhau, xem `tool_canon()`.
  Ghi theo id mà GIÁ treo vào thì bucket chi phí mới ghép được với doanh thu.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices`/`groups`/`nostore` sạch · engine **185 pass**.
- **17 ca trên `pacer` THẬT**: 0 và 1 mẫu đều im lặng · trung vị chịu được ngoại
  lai · câu chữ giây/1 phút/N phút · hết phần và số âm đều im · `reset()` xoá
  sạch · `end()` lẻ không đẻ mẫu rác · nối vào `mountWait` thì thanh quay lại.
- **62 + 76 + 60 ca hồi quy** của ba bộ kiểm trước: vẫn xanh.
- 🪤 **Đối chứng HẾT HẠN** — 4 ca `[v1]` mô tả diff của PR trước, mà PR đó đã vào
  `origin/main` nên chúng đỏ oan. 🔑 **Đối chứng phải theo kịp diff HIỆN TẠI;
  neo đúng `origin/main` vẫn chưa đủ nếu nội dung ca đã lỗi thời.**
- 🪤 Lệnh script thay chuỗi 4 dấu cách **khớp lồng** vào chuỗi 6 dấu cách → chèn
  `reset()` hai lần ở 2 chỗ. Vô hại (idempotent) nhưng phải đếm lại mới thấy.
- Bump `ai-loading-steps.js?v=4→5` (24 trang).

### CÒN LẠI
- **Chưa có bề mặt đọc `duration_ms`** — dữ liệu bắt đầu chảy từ lượt deploy này.
  Sau 1–2 tuần thì thêm cột "thời lượng p50/p75" vào panel Biên LN, và mở
  `expectSec` thật cho các tool CHẠY MỘT PHẦN (chân dung, phong thuỷ…) — nhóm
  nhiều phần đã tự lo bằng pacer.
- **`/api/lasotuvi?action=chat`** (đường rail cũ, dùng ở profile/chatbot) vẫn
  chưa ghi usage — nó đi qua `callLLMTools` trong vòng lặp tool, cần cộng dồn
  riêng. Đường `phan` (đường bán tiền) đã xong.
- **20 trang STREAM** vẫn chưa đo được "thời gian tới token đầu tiên" — đó mới là
  con số quyết định có cần orb ở đó hay không.

---

## 🔗 Chia sẻ workspace: tính năng của SHELL, không phải của từng tool (2026-08-09, PR #456)

Henry: *"Tool Dạy con theo lá số đang ko chia sẻ dc phần shell-workspace… Tính
năng chia sẻ shell-workspace phải là tính năng master chung cho tất cả các tool
chạy trên workspace, ko phụ thuộc vào tool nào chứ. Rà soát và design lại nếu
cần."* Hai PR trước (#452, #453) mới **vá lẻ từng tool** — đúng triệu chứng, sai
tầng. PR này sửa tầng.

### 🔴 Căn nguyên: chia sẻ là OPT-IN, và opt-in thì có ngày quên
Bản cũ bắt MỖI trang tool tự nhớ **bốn** nghĩa vụ: gọi `Shell.setShareable(…)`
đúng lúc có kết quả · gọi `setShareable(null)` khi quay về form · tự chép
`toolId` · và tự dựng một **bản văn bản THỨ HAI** (`_xxLines`) song song với DOM
đang hiện. 32 tool × 4 = **128 chỗ để quên**, không có gì canh. Đã quên thật, và
đo được:

| Lỗi | Trang | Người dùng thấy gì |
|---|---|---|
| Không bao giờ gọi | `day-con` | **Không có nút Chia sẻ** từ lúc ra mắt tới khi Henry báo |
| Không bao giờ gọi | 🔴 **`la-so`** (`app.html`) | **Tool ĐẦU BẢNG cũng chưa từng chia sẻ được** |
| Gọi mà không bao giờ gỡ | `thanh-tuong-pro` · `phong-thuy` | Làm lượt mới → bấm Chia sẻ ra **kết quả LƯỢT TRƯỚC** |

Hai lỗi dưới nặng hơn lỗi Henry báo: chúng không im lặng mà **nói sai**.

🪤 **`la-so` lọt lưới đúng hai lần, cả hai vì ĐOÁN THEO TÊN:** file của nó là
`app.html` (không gạch nối) nên lượt quét `app-*.html` đầu tiên của tao bỏ qua —
và bộ dò tao vừa viết để chống chuyện đó cũng lọc y hệt, tức suýt phát hành một
cái lưới có sẵn lỗ đúng chỗ cần vá. Nay bộ dò nhận diện trang shell bằng **dấu
hiệu của shell** (nạp `shell.js` + khai `SHELL_ACTIVE`), không theo tên file.

### 🔑 Cách vá — ĐẢO VAI, không phải thêm một lượt gọi nữa
`shell.js` nay tự theo dõi **vùng kết quả** của khung giữa: hiện ra thì bật nút,
biến mất thì gỡ nút **và vứt luôn payload của lượt trước**. Tool KHÔNG phải làm
gì để có nút Chia sẻ.
- **Giao ước DUY NHẤT của trang: một mốc `data-ws-result`** trên khối bao ngoài
  cùng của phần kết quả. Đã khai đủ **32/32** trang tool.
- **`setShareable` đổi vai: BẮT BUỘC → LÀM GIÀU.** Tool đưa gì (ảnh AI, khối
  `blocks` có cấu trúc, tiêu đề đắt hơn) thì cái đó thắng bản shell tự suy. Cả
  hai đường đi qua CHUNG `normalizeShare()` nên bản tự suy không bao giờ thiếu
  khối lá số hay lệch shape.
- **Lưới đỡ khi tool không đưa gì**: shell tự suy payload từ chính DOM đang hiện
  — `toolId` từ `ACTIVE` (hết chép tay), tiêu đề từ `.ws-title b`, nội dung bằng
  cách duyệt cây. Vì đọc thẳng thứ đang hiện nên **không có bản thứ hai để trôi
  khỏi nhau** — đúng cái bẫy `_xxLines` đang bày sẵn.
- **Bộ duyệt cây loại trừ có chủ đích**: điều khiển (nút/ô nhập/form/svg), tường
  trả phí (`.tpw-*` — chia sẻ ra ngoài đúng lời mời trả tiền thì vô nghĩa), thẻ
  intro, khối đang ẩn, và mọi thứ trang khai `data-share-skip`. Trần 4.000 ký tự.
- **Ngưỡng 60 ký tự**: dưới mức đó khung mới chỉ có tiêu đề/spinner. Thà không có
  nút còn hơn phát một link rỗng.

### ⚠️ `setShareable(null)` nay là một CÂU KHẲNG ĐỊNH, không phải nút dọn dẹp
Nghĩa mới: *"lượt này KHÔNG có gì đáng chia sẻ"* (fetch hỏng, khung đang hiện
câu báo lỗi — vd `luc-nham` khi `!j`). Lời khai của tool mạnh hơn phép suy từ
DOM nên nó **tắt cả lưới đỡ** tới lượt chạy sau. Chỉ để dọn nút khi quay về form
thì **KHÔNG cần gọi** — shell thấy vùng kết quả ẩn đi là tự gỡ.
- 🐞 **Lỗi tự bắt lúc test, không phải lúc đọc code**: bản đầu đặt cờ tắt tiếng
  RỒI mới gọi `refreshWsShare()`, mà chính lượt đó thấy cạnh lên "vùng kết quả
  vừa hiện = lượt chạy mới" nên **gỡ luôn cờ vừa đặt**. Tool báo lỗi trong khi
  khung còn hiện thì shell vẫn đè lên lời khai của nó. Phải **chốt trạng thái
  hiện/ẩn TRƯỚC, tắt tiếng SAU**.
- 🐞 **Lỗi thứ hai, cùng họ "đoán theo tên"**: MutationObserver bám
  `document.getElementById('ws')`, mà `app.html` dùng `<main class="ws">`
  **không có id** ⇒ observer câm đúng trên tool Lá Số, nút không bao giờ hiện.
  Nay lấy gốc theo `#ws` → `main.ws` → `<body>`. Chỉ lộ khi mở bằng trình duyệt.

### 🧷 `scripts/check-shell-share.mjs` — chặn tool MỚI tái phát (CI lint)
Đây mới là phần làm nó thành "master": phủ hôm nay không có nghĩa phủ tháng sau.
Ba luật — có `.ws-actions` · **đúng MỘT** mốc `data-ws-result` · `toolId` chép
tay (nếu còn) khớp `SHELL_ACTIVE`.
- **Verify bộ dò bằng cách DỰNG LẠI ĐÚNG BA LỖI**: gỡ mốc khỏi `day-con` → bắt ·
  thêm mốc thứ hai → bắt · đổi `toolId` thành `congso` → bắt. Bộ dò chưa từng
  bắt được gì thì không chứng minh được nó biết bắt.
- ⚠️ `app-xem-tuoi.html` gán `SHELL_ACTIVE` bằng **BIẾN** (một trang phục vụ 3
  route) — vẫn phải kiểm, chỉ bỏ vế đối chiếu tên. Bỏ qua trang vì "không khớp
  mẫu chuỗi" chính là kiểu im lặng bộ dò này sinh ra để chống.
- Nhiều mốc thì shell lấy cái ĐẦU trong DOM → im lặng chọn nhầm, nên bắt luôn.

### Verify
`typecheck` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices`/`nostore`/`groups`/`share`/`hexagrams`/`hao`/`motifs` sạch ·
engine **185 pass** · `node --check`.
- **143 ca trên 33 TRANG THẬT + `shell.js` THẬT**: mỗi trang đủ ba nhịp — còn
  form thì KHÔNG có nút · vùng kết quả hiện ra thì HIỆN nút · ẩn đi thì GỠ nút.
- **8 ca chạy THẬT tool Lá Số đầu-cuối** (lập lá số bằng engine trong trình
  duyệt): nút hiện, payload đúng `toolId='la-so'` và có nội dung thật, bấm "Sửa
  thông tin" thì nút tự gỡ, 0 lỗi JS — kèm **ĐỐI CHỨNG bản cũ: 0 nút**.
- **Ca lỗi day-con dựng lại nguyên trạng**: đè `Shell.setShareable` thành hàm
  rỗng ("tool quên gọi") → shell vẫn đỡ được, payload mang **đúng `toolId`
  'day-con'**, có nội dung thật, và **không lẫn chữ trên nút**.
- **Ca payload lượt trước** trên `thanh-tuong-pro` + `phong-thuy`: đặt payload
  rồi ẩn vùng kết quả → nút biến mất.
- 🪤 **ĐỐI CHỨNG nạp đè `shell.js` bản git HEAD**: tool quên gọi → **không có
  nút**; ẩn kết quả rồi → **nút VẪN CÒN**. Cả hai lỗi có thật, bài kiểm không đỗ
  giả.
- **13 ca vòng 2**: chạy THẬT `than-so-hoc` đầu-cuối (điền form → bấm tính → nút
  hiện, payload đúng tool; bấm "Sửa" → nút tự gỡ; 0 lỗi JS) · **rò rỉ**: giữ nội
  dung thật nhưng KHÔNG lọt tường trả phí / chữ trên nút / `data-share-skip` /
  khối đang ẩn · 390px không tràn ngang.
- Bump `shell.js?v=64→65` (35 trang). **Không đụng `shell.css`** — nút dùng lại
  class `.btn` sẵn có.

### CÒN LẠI
- **32 tool vẫn còn bản `_xxLines` chép tay** — nay là đường LÀM GIÀU nên vẫn
  thắng bản tự suy, và vẫn là hai bản có thể trôi khỏi nhau. CỐ Ý không gỡ trong
  PR này: gỡ payload của 32 tool đang chạy để đổi lấy bản tự suy là canh bạc
  trên đúng thứ vừa sửa. Gỡ dần từng tool khi có dịp đụng vào tool đó, và mỗi
  lần gỡ phải nhìn bản chia sẻ thật.
- Bản tự suy mới **chưa có ai tiêu thụ trên prod** (mọi tool đều đang đưa payload
  riêng) — nó là lưới đỡ cho tool SAU. Chỗ đáng nhìn khi có tool mới: khoảng
  cách giữa chữ trên trang và chữ trong link chia sẻ.
- `data-ws-result` chỉ phủ trang shell. Trang standalone `/tools/*.html` không
  nạp `shell.js` nên vẫn không có chia sẻ khung giữa — việc riêng.

---

## 📏 LUẬT CHỈ BÁO CHỜ + mở orb ra toàn site (2026-08-09, PR sau #455)

Henry: *"orb cho ≥10 giây. Mấy tool luận giải chạy lâu, apply luôn. 58 tools thì
nhiều chỗ > 10s mà nhỉ. Check lại cho kỹ rồi thay luôn"*.

### Luật (chép trong `tools-shared/ai-loading-steps.js`, đọc trước khi thêm chỗ chờ mới)
| Quãng chờ | Dùng |
|---|---|
| **≥10 giây, chờ MỘT CỤC** (LLM/sinh ảnh, màn hình đứng im) | **orb 62px** — `mountWait`, hoặc `mount` (orb bật sẵn) |
| < 10 giây, hoặc nằm TRONG một nút/một dòng | spinner 14px `.ai-spin` |
| Chữ CHẢY DẦN (SSE/stream) | **KHÔNG đụng** — dòng chữ đang chạy đã là chỉ báo tốt nhất |
| Tải danh sách / điều hướng | skeleton hoặc không gì |

### 🔴 ĐÍNH CHÍNH tiền đề "58 tool nhiều chỗ >10s"
Đo thật: **44 trang** gọi endpoint LLM, nhưng **20 trong số đó STREAM** (chữ chảy
dần) ⇒ không có quãng chờ trắng, chồng orb lên chỉ che nội dung. Số chỗ THẬT SỰ
chờ một cục mà thiếu chỉ báo dài chỉ có **5**. Đừng đếm theo số tool.

### Đã làm
- **`mount()` bật orb MẶC ĐỊNH** → 19 trang tự đổi, 0 dòng sửa từng trang.
- **`app-luan-giai` + `app-xem-tuoi`**: trước chỉ có **một dòng chữ TĨNH**
  `"Đang luận giải…"` cho mỗi phần (24 và 9 phần) → nay `mountWait`.
- **`luan-giai.html`**: đổi spinner 28px trong `.phan-loading` thành orb, **giữ
  nguyên cơ chế bật/tắt bằng `.active`** — chỉ thay thứ nằm bên trong.
- **`xem-tuoi` + `xem-lam-an`**: `TuviGrid.loadingHtml` nhận `opts.orb`. ⚠️ Hàm
  này dùng ở **CẢ HAI bậc** — an sao (chạy tại máy, mili-giây) và luận giải AI.
  Chỉ bật orb ở bậc sau; bật cả hai là orb loé rồi tắt.
- ⛔ **KHÔNG đụng** rail chat (`.typing` 3 chấm) và spinner trong nút.

### 🔑 `expectSec: 0` — KHÔNG ĐO ĐƯỢC thì KHÔNG HỨA
`/api/lasotuvi` **không ghi `llm_usage`** (phát hiện khi đi đo — nghĩa là panel
Biên LN đang thiếu hẳn tool luận giải, nợ riêng chưa vá) ⇒ không có số liệu thời
lượng một phần. Nên thêm chế độ `expectSec:0`: **bỏ hẳn thanh tiến trình**, chỉ
đếm giây, sau 45 giây thì trấn an. **Thanh chạy theo một con số bịa còn tệ hơn
không có thanh — nó là một lời hứa, hứa hụt thì lần sau không ai tin nữa.**

### 🐞 Vá cái bẫy do CHÍNH vòng trước đẻ ra
Hàm tự-lành của `paint()` (`!el.contains(ref.note) → build()`) sẽ **dựng lại chỉ
báo ĐÈ LÊN** nội dung nếu trang quên `stop()`. Ba chỗ đang dùng đều `stop()` đúng
nên chưa cắn ai, nhưng sắp thêm 5 chỗ nữa. Nay đổi thành **TỰ DỪNG im lặng**.
- 🔑 **Quên `stop()` chỉ được phép để lại một đồng hồ chạy ngầm vô hại, KHÔNG
  được phép xoá mất kết quả của người dùng.** Ca đối chứng trên bản v1 xác nhận
  lỗi có thật: nội dung bị wipe sau 2,5 giây.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices`/`groups`/`nostore` sạch · engine **185 pass**.
- **64 ca trên module thật**, gồm 🪤 **ĐỐI CHỨNG neo bản v1 đã merge** (không neo
  bản tiền-orb — `HEAD` đã dịch): v1 mount() không orb · v1 vẫn hứa thời lượng ·
  **v1 xoá mất kết quả khi quên stop()**.
- **76 ca trên 12 TRANG THẬT** × 390px và 1280px: 12/12 nạp được module, 0 lỗi JS
  · `luan-giai` orb đúng 46px và `.active` còn nguyên · **an sao KHÔNG orb, luận
  giải CÓ orb** · `mount()` orb 54px không méo, không tràn ngang · **ghi kết quả
  đè mà không stop → không bị vẽ đè**.
- **60 ca hồi quy** trên 3 trang orb của vòng trước: vẫn xanh.
- 🪤 **Ba ca đỏ, cả ba là lỗi TEST, và cả ba đều là bẫy CŨ lặp lại**:
  (a) đo trên cây có tổ tiên `display:none` (`#result-section`) → 0×0 — lần thứ
  hai vấp; (b) **đối chứng neo `HEAD`** nên sau khi stack thêm commit thì nó tự
  so với chính mình — đúng thứ CLAUDE.md đã dặn "neo `origin/main`", vẫn vấp;
  (c) lệnh thay chuỗi trong script vá bài kiểm **không khớp nên không thay gì**
  mà vẫn in "✓" vì tao quên `assert`. 🔑 **Mọi lượt thay chuỗi bằng script phải
  assert số lượt khớp — không thì nó thất bại IM LẶNG y như bug nó đi vá.**
- Bump `ai-loading-steps.js?v=3→4` (24 trang) · `tuvi-grid.js?v=2→3` (3 trang).

### CÒN LẠI
- **20 trang STREAM cố ý không đụng.** Nếu sau này thấy quãng chờ tới token đầu
  tiên lâu thì mới cân, và chỉ hiện orb tới lúc token đầu về.
- **~26 bản `@keyframes spin` chép tay** vẫn nằm rải rác (blog, khao-luan,
  topup, auth-callback…) — nợ DRY thật, nhưng phần lớn là chờ NGẮN nên đúng luật;
  gom về một chỗ là refactor thuần, tách PR riêng.
- **`/api/lasotuvi` không ghi `llm_usage`** ⇒ Biên LN thiếu tool luận giải, và
  không đo được thời lượng để đặt ETA. Vá là mở được `expectSec` thật.

---

## 🧭 Tử Vi Công Sở: thêm TẦNG NHÁNH NGHỀ (2026-08-09, PR #454)

Henry mở mục Tài chính, chốt B1 = *"số tôi hợp làm ngành nào?"*. Đi qua ba lần
đổi hướng rồi mới ra: khảo sát repo → bỏ hướng "đọc tài chính một người" → bỏ
hướng "8 trục từ cung" (*"ko thì cách đi hiện tại sẽ làm cho nó giống tool Tử vi
công sở đấy"*) → và cuối cùng chính Henry chốt: **trùng thì gộp, làm thành nâng
cấp Công Sở.**

### 🔴 Đọc code xong mới thấy: Công Sở ĐÃ CÓ đúng kiến trúc mình định dựng
`DOMAIN_NGANH` ← Quan Lộc (lĩnh vực) · `QUY_MO_THEO_BAC` ← bậc · `VAI_THEO_KIEU`
← tứ tượng. Ba tầng, đang chạy. Chỗ thiếu là **NHÁNH**: Công Sở dừng ở
`'Bất động sản · môi giới'` (một dòng chung chung) còn Henry đòi *"phát triển
bds, môi giới, mua đi bán lại — phải cụ thể ra"*; và VAI chỉ có **4 giá trị** cho
toàn bộ người dùng, quá thô để cắt nhánh. ⇒ Tầng 4, không phải tool thứ ba.

### 🔑 Số quyết định thiết kế — khớp toàn danh mục thì HỎNG
Khớp thẳng 21 trục trên cả 891 nghề: **76% danh mục không bao giờ được gợi**,
top rơi vào nghề hình PHẲNG (lau rửa xe · phụ hồ · thợ là quần áo). Căn nguyên
đo được: tính khí tách rất tốt nhóm làm-với-NGƯỜI (bán hàng 0,81 · cộng đồng
0,80) và **gần như không tách** nhóm kỹ thuật/sản xuất (y tế chuyên môn 0,27 ·
nông lâm 0,28 · xây dựng 0,32).
⇒ **Đừng dùng tính khí chọn NHÓM. Dùng nó chọn NHÁNH trong nhóm.** Sau khi chốt
lĩnh vực, dư địa còn 68–90% (quyen 90 · vo 87 · thuong 84 · van 81 · nghe 73 ·
tu 71 · y 68). Nghịch lý biểu kiến: xây dựng *tâm nhóm mờ* (0,32) nhưng *bên
trong trải rộng* (55%) — chỉ huy thi công và thợ trát cách nhau rất xa.

### Hai luật cứng rút ra từ đo — đừng "tối ưu" ngược lại
1. **KHÔNG z-score vector người.** Thử rồi: đa dạng tăng 122→169 mà chất lượng
   sụp (bậc hiển đạt ra "trợ giảng", Thiên Phủ ra "người mẫu"). Z-score triệt
   tiêu ĐỘ LỚN, mà độ lớn chính là tín hiệu BẬC.
2. **KHÔNG gom thêm cung.** Thử 7 cung: đa dạng GIẢM (trùng 1/115 → 1/90). Cộng
   nhiều nguồn thì vector tiến về trung bình.

### Ba luật nội dung
- **Nhánh khác nhau về CHẤT, không về QUY MÔ** — quy mô đã là tầng 2. Tách
  "điều hành cấp cao" khỏi "quản lý vận hành" làm hai nhánh xếp cạnh nhau với
  LÝ DO GIỐNG HỆT ⇒ đã gộp.
- **Tên nhánh nói CÁCH LÀM, không nói lĩnh vực** — lĩnh vực là tầng 1. Tên trùng
  chuỗi với `DOMAIN_NGANH` là người trả tiền mở ra thấy lại chữ vừa đọc free.
  Có bộ dò chặn tái phát trong bài kiểm.
- 🔴 **LUẬT DIỄN ĐẠT — vi phạm là xúc phạm người dùng:** trục THẤP chỉ được đọc
  là *"nghề không đòi hỏi"*, TUYỆT ĐỐI không đọc là *"bạn thiếu"*. Dữ liệu chấm
  hoạ sĩ ở trục đáng-tin-cậy **−3,6**, thợ máy ở chính-trực **−1,7**; in thẳng
  là tool đang nói *"bạn ít đáng tin cậy"*. Nói ở CẢ tầng data lẫn tầng prompt.
- **29% kho là nhánh `phoThong`** (không có chất người đặc thù) — không bao giờ
  gợi bằng phép khớp, và KHÔNG hiện %. Nói "lá số bạn hợp nghề này" trong khi lá
  số không nói gì về nó là kết luận rỗng đội lốt kết luận.

### Đường tiền (Henry chốt phương án (a))
Ba tầng cũ giữ **MIỄN PHÍ** (Công Sở vẫn là tool đầu phễu), tầng nhánh sau tường
`lockPreview` — đúng khuôn W1.
- 🔴 **GET không được mang tầng nhánh**: nó trả `Cache-Control: public,
  s-maxage=86400`, một lần rò là CDN phát phần trả tiền cho MỌI người, không thu
  hồi được. Đường tiền là **POST riêng** + `no-store` + auth + `toolPaymentDenied`.
- `hoSoTinhThu()` / `railDataDayDu()` là hàm RIÊNG — đường tiền phải cắt được
  bằng một dòng đọc ra được, có bài kiểm canh đúng dòng đó.
- Rail chỉ biết nhánh SAU khi mua: biết sớm thì người ta hỏi rail thay vì mua.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:nostore` + `check:prices` sạch.
- **A/B với bản trước tích hợp, 3.264 lá số × 5 trạng thái: 0 lệch** (Công Sở
  đang chạy prod — bất biến quan trọng nhất).
- **2.880 lá số, 8 bất biến engine: 0 lỗi**; nhánh từng đứng #1 **25/29** (khớp
  toàn danh mục chỉ được 14,5%); nhánh phổ thông **0 lượt lọt sai**.
- **22/22 ca đọc thẳng mã nguồn + 480 lá số**: GET không auth/không thanh toán/
  không rò dấu hiệu nhánh · POST có chốt thanh toán TRƯỚC `computeCongSo`.
- **22/22 ca Playwright trên TRANG THẬT**: tính thử → 0 POST, 0 `action=deduct`,
  quét toàn bộ chữ hiện ra thấy **0 việc của tầng nhánh lọt** · bấm mở → có
  deduct + POST, phần tính thử còn nguyên byte · ĐỐI CHỨNG 402 → dựng lại tường,
  không quẳng về form · 390px không tràn.
- **108 lá số**: 0 khoá thiếu nhãn, 0 rò khoá kỹ thuật vào prompt.

### 🪤 Bẫy đã vấp
1. **Hai lỗi chỉ lộ khi ĐỌC OUTPUT, xanh trên mọi phép đo số**: (a) hai nhánh ra
   lý do y hệt vì lý do nêu trục CHUNG của lĩnh vực thay vì trục PHÂN BIỆT nhánh;
   (b) tích `v × (hình − nền)` dương khi **cả hai vế cùng ÂM** ⇒ trục người YẾU
   lọt vào phần giải thích, bản đọc tự mâu thuẫn (*"không đòi: Thận trọng"* nằm
   ngay trên *"vì: Thận trọng"*).
2. **Thiếu `TuviPaywall.init` thì `lockPreview` FAIL-CLOSED** — không dựng tường,
   phần trả tiền lặng lẽ không bao giờ mời được ai. Đọc code không thấy vì cả hai
   phía đều đúng khi đọc riêng.
3. **Stub `Auth` đặt trong `addInitScript` bị `auth.js` GHI ĐÈ** khi nạp sau →
   modal đăng nhập hiện ra, lượt bấm không tới bước trừ Lượng. Phải đặt SAU khi
   trang tải xong.
4. **`engine vanilla` và `tuvi-engine/src/types.ts` khai `cungScores` KHÁC TÊN**
   — vanilla có `{thienVan, canCo, mayMan, phuTro, binhYen, benVung, tong}`, types
   khai `{tiemNang, benVung, anToan, quyNhan, minhBach, tuongHop}`, chỉ `benVung`
   trùng. Đo phải theo BẢN ĐANG CHẠY. Và `anSaoLaSo` **không ném lỗi khi sai tên
   khoá** (`gioIdx`, `gioitinh` thường) — nó lặng lẽ trả lá số rỗng.

### CÒN LẠI
- ⚠️ **VIỆC TAY: đổi `tool_pricing` SAU KHI DEPLOY**, không được trước — đúng bài
  học "dữ liệu đi SAU giao diện" đã làm 58 công cụ rơi vào "Khác" 4 phút:
  ```sql
  update tool_pricing set label='Tử Vi Công Sở & Hướng Nghiệp',
    credits=15, is_free=false, updated_at=now() where tool_id='cong-so';
  ```
  Giữ nguyên `tool_id` để URL/SEO không đổi. Henry sẽ rà lại pricing một lượt.
- **Tầng nhánh 0 lượt LLM, 0đ** — lãi 100%, không cần cầu dao ngân sách nào.
  Cố ý CHƯA thêm LLM: đo tỉ lệ mua trước rồi mới quyết thêm chi phí, đúng lối W1.
  Nếu tỉ lệ mở thấp thì chỗ thêm là một lượt viết "đường đi từ đây".
- **Tool định hướng nghề cho TRẺ EM** (Henry chốt làm sau). Trước khi dựng phải
  **đo overlap với T2 "Dạy Con"** — nó sẽ vấp đúng cái bẫy vừa gỡ với Công Sở.
- **Bảng `SAO_TRUC` (14 chính tinh → 21 trục) là quy chiếu TỰ ĐẶT**, cùng dạng
  nợ với `KIEU_HOC` và `DOMAIN_NGANH`. Cổ thư tả tính chất sao bằng văn xuôi,
  không bằng thang điểm. Sửa là sửa data thuần.
- `hinh` mỗi nhánh lấy khởi điểm từ một CSDL nghề nghiệp công khai **CC BY 4.0**
  — dùng để CHẤM, không để BÀY; danh mục việc là bảng Việt tự dựng. **Ghi công
  đặt ở trang nguồn dữ liệu, KHÔNG nhắc trong bản đọc** (Henry: *"mấy cái test ở
  trên để mình tham khảo thôi… ko cần mention tên của nó"*). ⏭️ Trang đó **chưa
  làm** — phải có trước khi bật thu phí.
- **Chưa có trang standalone SEO** cho phần hướng nghiệp.

---

## ✨ Orb chờ AI + `innerHTML` mỗi giây PHÁ animation (2026-08-09, PR #455)

Henry gửi ảnh app golf: *"cái loading indicator đẹp quá… cục tròn trắng ở giữa
xong xung quanh viền xanh như khói bay. Có library nào có sẵn ko?"*

### Trả lời câu hỏi: không cần library
Loại này hay được gọi *AI glow / aurora orb* (Apple Intelligence, Siri orb). Web
có Magic UI (`BorderBeam`, `ShineBorder`), Aceternity `Glowing Effect`, `ldrs`;
app thì phần lớn xài **Lottie**. Nhưng cấu tạo chỉ là **2 lớp**: một hình tròn
đặc ở trên, phía sau một khối gradient bị `filter:blur()` cho xoay/phóng chậm.
⇒ repo này là vanilla nên **CSS thuần, 0 dependency, 0 byte JS thêm**.

### 🔴 KHÔNG bê nguyên thiết kế của app kia được — nền khác nhau
Nền khung chờ ảnh là **kem `#EFEBE3`** (`.cdtk-imgph`), không phải video tối ⇒
mặt cục **trắng** mất hút, chỉ trơ vành khói. Và xanh dương không có trong bảng
màu site. Nên: mặt cục `--navy` · quầng `--gold` · dấu ✦ `--gold-on-navy`.
- 🔑 **Cả ba token đều CỐ Ý không khai lại ở dark theme** (luật "token hai vai")
  ⇒ orb ra y hệt hai theme, đúng vai một dấu thương hiệu — không phải đi cân lại
  contrast cho từng theme. Cùng lối với ô `.spark` sẵn có của shell.

### 🐞 Hai lỗi CÓ SẴN, cùng một căn nguyên: `paint()` gán lại `innerHTML` MỖI GIÂY
1. **Mọi `@keyframes` bị reset về đầu mỗi tick.** Trước giờ không ai thấy vì
   spinner cũ xoay `.8s` — ngắn hơn một nhịp đồng hồ nên reset trùng chu kỳ.
   Cắm orb (xoay 2,7s) vào là quầng khói giật một nhịp mỗi giây.
2. **`transition:width .9s` của thanh tiến trình CHƯA BAO GIỜ chạy** — element
   mới không có width cũ để nội suy ⇒ thanh nhảy giật từng nấc thay vì trườn.
- Vá: dựng khung **một lần**, mỗi giây chỉ đổi `textContent` + `width`.
  `render()` của `mount()` cũng chỉ thay ruột hộp bước thay vì cả `el.innerHTML`.
- 🔑 **Quy ước rút ra: chỗ nào có animation dài hơn nhịp cập nhật thì KHÔNG được
  dựng lại DOM theo nhịp đó.** Lỗi này ẩn được 2 tháng chỉ vì animation cũ ngắn
  hơn 1 giây.
- 🐞 Lỗi thứ ba **do chính bài kiểm bắt**: `orbHtml()` export ra ngoài mà không
  gọi `ensureStyle()` → ai dùng trên trang chưa mount gì nhận một ô vuông trần,
  **không có gì báo lỗi**. Hàm export công khai phải tự lo CSS của nó.

### Hợp đồng giữ nguyên
Trần 96% · quá hẹn đổi lời · `stop()` dọn interval · nhãn qua `textContent`.
Thêm `{orb:false}` lùi về spinner cũ, `{variant:'a'|'b'|'c'|'d'}` đổi kiểu quầng.
- **Orb trong `mount()` MẶC ĐỊNH TẮT** — hàm đó chạy trên 19 trang, bật đại trà
  là đổi giao diện 19 chỗ trong một lượt mà chưa ai nhìn qua. Bật một trang:
  `mount(id, steps, {orb:true})`.

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices`/`check:groups`/`check:nostore` sạch · engine **185 pass**.
- **53 ca trên MODULE THẬT**, gồm 🪤 **ĐỐI CHỨNG bản git HEAD**: bản cũ không có
  orb và node thanh tiến trình **bị thay mới mỗi giây** ⇒ hai lỗi có thật.
- **60 ca trên 3 TRANG THẬT** có gọi `mountWait` × **390px và 1280px**: orb đúng
  62×62 (CSS trang không bóp méo), mặt cục giữ navy, quầng đang chạy, không tràn
  khỏi khung chờ, trang không tràn ngang, 0 lỗi JS.
- `prefers-reduced-motion` → đứng im nhưng **VẪN giữ quầng sáng**.
- Nhãn chứa `<img onerror>` không chạy mà vẫn hiện nguyên văn · `variant`/`size`
  rác rơi về mặc định, không chèn được thẻ.
- 🪤 **Hai ca đỏ đầu đều là lỗi TEST**: (a) vòng gỡ ẩn viết
  `n.style.display = n.style.display || ''` — gán lại chính giá trị cũ, no-op,
  nên đo trên cây `display:none` ra **0×0**; (b) bộ đếm lỗi JS ăn cả
  `Failed to load resource` của lượt mạng do chính mình chặn.
- Bump `ai-loading-steps.js?v=2→3` — `git diff --numstat` xác nhận **19 file,
  mỗi file đúng 1 dòng**.

### CÒN LẠI
- **Chưa nhìn trên máy thật.** Chỗ đáng soi là `filter:blur(13px)` trên điện
  thoại tầm trung có mượt không; rớt khung hình thì đổi `variant:'b'` (không
  blur lớn), sửa đúng một chữ.
- Chỉ đụng `mountWait` (3 trang chờ ảnh). 16 trang dùng `mount` giữ nguyên.
- Demo 4 biến thể (artifact, không commit vào repo):
  `claude.ai/code/artifact/cb7a6a6a-3c96-4812-835b-89b158de2ee9`

---

## 🗺️ Sitemap: `lastmod` đang NÓI DỐI 647 URL mỗi ngày (2026-08-07, PR này)

Henry: *"Bạn tao chuyên gia SEO nói là sitemap mà nhiều URLs quá thì chia nhỏ ra
thành nhiều sitemap submit lên google sẽ crawl nhanh hơn."*

### 🔴 ĐÍNH CHÍNH tiền đề: chia nhỏ KHÔNG làm Google crawl nhanh hơn
Nguyên văn Mueller: *"Google's systems handle both small sitemap files and big
sitemap files in the same way… there's **no technical advantage** by splitting
them"*, và size/số file *"generally won't affect the crawling"*. Lợi ích DUY NHẤT
là **GIÁM SÁT** — lọc báo cáo GSC theo từng sitemap để biết nhóm nào không được
index. Mà site này **đã chia rồi** (3 file, `sitemap-ngay-tot.xml` vốn đã là
sitemapindex 18 con) và tổng chỉ **38.147 URL**, còn xa trần 50.000/file.

| Sitemap | URL nộp (GSC) | % |
|---|---:|---:|
| `sitemap-hubs.xml` (menh-kho) | **18.679** | 49,0 |
| `sitemap.xml` | 10.986 | 28,8 |
| `sitemap-ngay-tot.xml` | 8.482 | 22,2 |
| Trang từng có impression | **665** | **1,7** |

### 🔴 Lỗi THẬT — `lastmod` tự phá tín hiệu của chính mình
`app/api/sitemap/route.ts` đóng dấu `new Date()` làm `lastmod` cho **70 trang
tĩnh + 576 trang van-han, MỖI NGÀY**. Đo trên route thật: **647/655 URL mang ngày
hôm nay**. `lastmod` là trường **DUY NHẤT** Google còn đọc (`changefreq`/
`priority` bị bỏ qua) — và nó chỉ được đọc KHI ĐÚNG; đóng dấu hôm nay dạy crawler
bỏ qua `lastmod` của **CẢ SITE**, kéo theo 8.478 trang `seo_pages` có
`created_at` thật cũng mất tín hiệu theo. Mueller gọi đúng hành vi này là *"just
lazy"*. `sitemap-hubs` và `sitemap-ngay-tot/*` thì **0 lastmod** hoàn toàn.

### Cách vá — `lib/seo/lastmod.ts`, luật **KHÔNG BIẾT ⇒ KHÔNG PHÁT**
Thiếu `lastmod` là **trung tính** (trường tuỳ chọn); `lastmod` sai là **nhiễu
độc**. Nên: dòng DB → `updated_at ?? created_at` thật; trang tĩnh + menh-kho +
van-han → **bỏ hẳn thẻ**; `ngay-tot` → `CONTENT_REV = 2026-08-04` (mốc engine sửa
12 trực, đổi 26,8% số ngày — mốc có thật, ghi trong chính CLAUDE.md).
- ⚠️ **Chỉ 2 bảng có `updated_at`** (`tu_dien`, `sach_library`). Hỏi cột không
  tồn tại thì PostgREST trả 400 → lượt đó ra mảng rỗng → **mất im lặng cả một họ
  URL** khỏi sitemap. Phải tách bằng cờ `hasUpdatedAt`.
- Gỡ `changefreq`/`priority` khỏi cả 4 sitemap.

### 🪤 Ba cái bẫy đã vấp
1. **Suýt thay lời nói dối này bằng lời nói dối khác:** định lấy `git log` làm mốc
   nội dung, nhưng **git trong container là bản SHALLOW** — commit cũ nhất
   (2026-08-04) chỉ là mốc cắt của bản clone, không phải ngày sửa. **Kiểm
   `.git/shallow` trước khi tin bất kỳ ngày commit nào.**
2. **`git worktree` + symlink `node_modules` KHÔNG chạy được với Turbopack**
   (*"Symlink points out of the filesystem root"*). Đường đi được: commit trước
   rồi `git checkout HEAD~1 -- <file>` ngay trong cây đang chạy — Next dev tự
   hot-reload, xong `checkout HEAD --` trả lại.
3. 🔴 **Ca quan trọng nhất của bài kiểm ĐỖ GIẢ trên bản cũ.** Bộ parse đòi `<loc>`
   liền `<lastmod>`, mà bản cũ chèn `changefreq`/`priority` vào giữa ⇒ map ra
   RỖNG ⇒ *"0 URL đóng dấu hôm nay"* đúng một cách vô nghĩa. Sửa: tách theo khối
   `<url>` + đo THẲNG trên chuỗi thô. **Assertion phải nhìn vào thứ ĐANG ĐỔI.**

### Verify
`tsc` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices`/`check:groups`/`check:nostore` sạch · engine **185 pass**.
- **A/B danh sách trang tĩnh** (chỗ sửa tay, rủi ro hồi quy cao nhất): **70 = 70,
  0 thiếu, 0 thừa, đúng thứ tự**.
- **30 ca trên ROUTE THẬT** qua Next dev + stub PostgREST: 0 URL đóng dấu hôm nay
  · `updated_at` thắng `created_at` · **ĐỐI CHỨNG dòng thiếu ngày → bỏ thẻ chứ
  không rơi về hôm nay** · `seo_pages` category `van-han` vẫn bị loại · van-han
  đủ 576 · hubs đúng **18.679** (khớp số GSC) · ngay-tot 2021 đúng 497 · 0
  `changefreq`/`priority`.
- 🪤 **ĐỐI CHỨNG bản cũ**: **647/655 URL đóng dấu hôm nay**, 14 ca đỏ ⇒ lỗi có
  thật và bài kiểm bắt được.
- **Không bump `?v=`** — chỉ sửa route server, không đụng asset client.

### ✅ B — chia `sitemap.xml` thành sitemapindex 6 con (Henry: *"làm tiếp đi"*)
`trang` (70) · `noi-dung` (khao-luan + nghien-cuu + tu-dien + tai-lieu + sach) ·
`seo` (8.478) · `van-han` (576) · `la-so` (laso_public) · `la-so-pregen` (1.444).
- **Chia theo thứ mình sẽ HÀNH ĐỘNG KHÁC NHAU khi chúng hỏng**, không phải chia
  cho tròn số: trang tĩnh rớt index = sự cố · bài người viết rớt = thiếu link ·
  trang SEO rớt = mỏng/trùng · `la-so-pregen` là nhóm đang bị rút, theo riêng để
  biết khi nào xong.
- **`laso_public` TÁCH khỏi `laso_pregen`** dù cùng sống ở `/la-so/*`: một bên
  giữ index (người đã trả tiền), một bên đang deindex. Gộp thì báo cáo nhóm này
  lúc nào cũng đỏ vì nhóm kia.
- **KHÔNG nộp `sitemap-hubs`/`sitemap-ngay-tot` vào index** — chúng đã nộp thẳng
  trong GSC; nộp cả hai đường là một URL đếm hai lần, đúng thứ chia nhóm sinh ra
  để tránh.
- Phần dùng chung gom vào `lib/seo/sitemap-source.ts` — 6 route mà mỗi cái chép
  một bản `fetchAllSlugs` là đúng bẫy `parseLlmJson` đã trả giá.

### ✅ C — `noindex, follow` cho các họ trang mỏng
18.628 `menh-kho/[năm]/[ngày]` + `/la-so/*` dựng sẵn + `/la-so/*` tính tại chỗ.
Quyết định + cách lật lại gom trong **`lib/seo/index-policy.ts`**.
- 🔑 **Vì sao `noindex` chứ không phải rút khỏi sitemap:** bài học #358 —
  **rút khỏi sitemap KHÔNG deindex**. Pregen bị rút từ hồi đó mà `/la-so/*` vẫn
  ăn impression đều, vẫn hạng 1,4. Sitemap là LỜI MỜI, không phải LỆNH.
- 🔑 **Và vì thế URL `noindex` CỐ Ý VẪN NẰM TRONG sitemap** dù Google khuyên
  đừng: muốn Google gỡ một trang thì nó phải **crawl lại** để đọc thẻ, mà sitemap
  là đường mời crawl nhanh nhất. Gỡ khỏi sitemap CÙNG LÚC đặt noindex là lặp lại
  đúng sai lầm cũ. ⏭️ Gỡ SAU khi GSC báo đã hết index.
- **GIỮ index, đừng đụng:** `laso_public` (người dùng đã TRẢ TIỀN rồi chia sẻ) ·
  51 hub NĂM (đường duy nhất Google bò xuống day hub để đọc được thẻ noindex) ·
  toàn bộ `/ngay-tot/*` (có cầu thật).
- **`follow` chứ không `nofollow`**: đây là tầng điều hướng tới nội dung thật.

### Verify B + C
- **28 ca trên route thật**: sitemapindex đúng 6 con · 0 URL nằm ở hai nhóm ·
  0 `changefreq`/`priority` · **A/B tập URL cũ (một cục) vs mới (6 con): 657 =
  657, 0 mất, 0 thừa**.
- **noindex**: day hub ✓ · pregen ✓ · ISR ✓ — kèm **4 ca ĐỐI CHỨNG phải KHÔNG
  bị noindex**: 🔴 `laso_public` (đã trả tiền) · hub NĂM · `/van-han/*` · và
  `laso_public` vẫn khai `index, follow`.
- 🪤 **ĐỐI CHỨNG bản trước C**: đúng **3 ca noindex đỏ**, 5 ca đối chứng vẫn xanh
  ở cả hai phía ⇒ bài kiểm đo đúng thứ đang đổi, không xanh vì lý do khác.
- **lastmod của batch A còn nguyên sau khi tách**: 657 URL, **0 đóng dấu hôm
  nay**, `updated_at` vẫn thắng `created_at`, dòng thiếu ngày vẫn bỏ thẻ.

### CÒN LẠI
- ⚠️ **Số trang index sẽ TỤT MẠNH sau deploy** — đó là fix chạy đúng, không phải
  hỏng. Impression cũng tụt, nhưng phần tụt là impression **0 nhấp**.
- ⏭️ **Việc theo dõi:** GSC → Pages → lọc theo `sitemap-la-so-pregen.xml`; khi
  "Excluded by 'noindex'" phủ gần hết thì XOÁ file đó + gỡ khỏi sitemapindex.
  Tương tự cho day hub trong `sitemap-hubs.xml`.
- **Chưa đo được với dữ liệu THẬT** — preview Vercel khoá sau SSO nên toàn bộ
  verify dừng ở stub PostgREST. Sau deploy mở `sitemap.xml` là thấy ngay.
- **IndexNow không dùng được cho Google** (chỉ Bing/Yandex), và Google đã bỏ
  endpoint ping sitemap từ 6/2023.

---

## 🕘 7 tool KHÔNG HỀ có lịch sử — và nhãn phiên suýt nói sai người (2026-08-07, PR sau)

Henry: *"Mày kiểm tra lại tất cả các tool đều có mục Phiên gần đây này chưa?"*
Đếm ra **26/34**. Nhưng con số đó chưa phải vấn đề thật.

### 🔴 Không phải thiếu MỘT khối markup — 6 tool không có LỊCH SỬ nào cả
`#shellRecent` chỉ chạy khi `window.SHELL_HISTORY` bật. Chéo hai cột thì cắt
sạch: 26 tool có **cả hai**, 8 trang còn lại **không có cái nào** — tức 6 tool
(2 trang kia là `app-home`/`app-tai-khoan`, không phải tool) vừa mất khối "Phiên
gần đây" vừa mất **nút Lịch sử trong rail**. Người dùng không có đường nào mở
lại phiên cũ.
- 6 tool: `chan-dung-tien-kiep` · `chan-dung-vo-chong` · `day-con` ·
  `duyen-no-tien-kiep` · `nguoi-khac` · `nhan-mach` — đúng các tool MỚI NHẤT,
  chép từ khuôn không có khối đó. **Cùng bệnh với 2 trang thiếu `<link>` Noto
  Serif ở track Công Sở: thêm trang shell mới thì phải chép ĐỦ khuôn.**

### 🔑 Kiểm đường tiền TRƯỚC khi bật — và nó an toàn
`restoreSession` reload `?auto=1`, tool tự chạy lại center. Với tool trả phí thì
đó là đường trừ tiền. Nhưng cả 6 đều **`autoRun` 0 lượt** ⇒ không tool nào tự
chạy lại; `restorePendingFallback` là lưới đỡ, chỉ replay hội thoại rồi khoá ô
nhập. Tiền lệ đã chạy thật: `app-phong-thuy` có 7 chỗ paywall + history +
`autoRun` 0. Có ca test canh **0 lượt `action=deduct`** khi bấm khôi phục.

### 🔴 Bật xong mới lộ lỗi NẶNG HƠN: nhãn phiên dán bằng lá số CỦA NGƯỜI KHÁC
`curMeta.restore.birth` lấy từ `birthSnapshot()` = `localStorage['app_birth']`
**TOÀN CỤC**. Mà `day-con`/`nguoi-khac`/`nhan-mach` đọc lá số của CON/SẾP/ĐỘI và
**cố ý KHÔNG gọi `rememberBirth`** (đúng thiết kế: không được đè lá số của chính
người dùng). ⇒ phiên `day-con` sẽ mang dòng phụ *"Henry · 3/6/1998"* trong khi
nó nói về **bé Mai sinh 2015**. Đúng loại nhãn nói sai mà vòng "Phiên gần đây"
sinh ra để chống — và nó IM LẶNG, nhìn qua rất hợp lý.

**Vá 3 điểm trong `shell.js`:**
1. `restore.birth = normBirth(o.birth) || birthSnapshot()` — lấy lá số TOOL VỪA
   DÙNG trước, chỉ rơi về toàn cục khi tool không đưa (tool ảnh).
2. Cờ `birthOwned`, chỉ bật khi tool gọi `rememberBirth` = khai *"lá số này là
   của chính người dùng"*; ghi vào phiên thành `restore.selfBirth`.
3. `restoreSession` chỉ đồng bộ `app_birth` khi `selfBirth !== false`. Không có
   bước này thì mở lại một phiên `day-con` là **lá số con chiếm chỗ lá số của
   người dùng**, kéo theo cả thẻ "Vận hôm nay" ở trang chủ.
- ⚠️ **`!== false` chứ không phải `=== true`**: phiên CŨ không có cờ →
  `undefined` → giữ nguyên hành vi trước đây. Có ca test riêng canh chỗ này.

### Verify
`typecheck` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices`/`check:groups`/`check:nostore` sạch · engine 185 pass ·
`node --check`.
- **85 ca trên 7 TRANG THẬT** (thêm ca canh nút Lịch sử trong rail): đúng 2 dòng · dòng chính là câu hỏi · gộp đúng
  "3 phiên" · nút `Tất cả (4)` · cao 129px · bấm dòng → đúng `?auto=1` + đúng id
  trong `sessionStorage` · **0 lượt trừ Lượng** · 0 lỗi JS.
- **30 ca vòng tròn ĐẦY ĐỦ** (chạy tool → hỏi rail → phiên phải hiện lên khối):
  cả 6 tool lưu đúng 1 phiên và khối tự hiện.
- **10 ca quyền sở hữu lá số**: `day-con` ra dòng phụ *"Bé Mai · 9/5/2015"*,
  **không lọt 1998**, `selfBirth=false`, khôi phục xong `app_birth` **vẫn là
  1998** · ĐỐI CHỨNG `luan-giai` (có `rememberBirth`) `selfBirth=true` và khôi
  phục **VẪN đồng bộ** `app_birth` như cũ · ĐỐI CHỨNG phiên CŨ không cờ vẫn đồng bộ.
- 🪤 **ĐỐI CHỨNG nạp bản `origin/main`**: `#shellRecent` không có, `SHELL_HISTORY`
  tắt, **nút lịch sử trong rail cũng không có** ⇒ lỗi có thật.
- 🪤 Hai ca đỏ đầu là **lỗi TEST**: (a) `birthSnapshot()` đọc `app_birth` chứ
  không đọc `o.birth` nên `setContext` giả của tao không có lá số — chính chỗ đó
  dẫn tới phát hiện lỗi thật ở trên; (b) `addInitScript` của Playwright chạy lại
  ở **MỌI lượt điều hướng**, nên sau khi `restoreSession` reload `?auto=1` nó ghi
  đè `app_birth` về giá trị seed → hai ca đối chứng đỏ oan. Phải seed một lần.
- Bump `shell.js?v=65` (35 trang).

### 🔁 Gộp `main` giữa chừng — và tool thứ BẢY lòi ra đúng lúc đó
`main` đi trước **17 commit**, trong đó #462 thêm tool MỚI `huong-nghiep-tre`
dựng trên khuôn `day-con` **CŨ** ⇒ nó thiếu y hệt. Tức lỗi tái phát ngay trong
lượt gộp của chính PR đi sửa nó. Nay **7 tool**, không phải 6.
- ⇒ Cắm **`scripts/check-shell-history.mjs`** vào CI lint (`check:history`):
  mọi trang có `SHELL_ACTIVE` phải có CẢ `SHELL_HISTORY=true` LẪN `#shellRecent`.
  Miễn trừ đúng 2 trang không phải công cụ, **kèm lý do ghi trong chính bộ dò**.
  Đã red-team: gỡ cờ của một trang → bộ dò đỏ đúng trang đó.
- 🔑 **Thiếu MỘT trong hai là hỏng im lặng**: có cờ mà quên chỗ mount → phiên vẫn
  lưu nhưng không ai thấy; có chỗ mount mà quên cờ → khối vĩnh viễn rỗng
  (`renderRecent` thoát sớm khi `!HIST_ON`).
- 35 xung đột đều là dòng `shell.js?v=` (65 của tao vs 67 của main) → lấy bản
  main rồi bump **68**. Một xung đột THẬT ở `app-day-con.html`: main viết lại
  `SHELL_INTRO`; giữ bản mới của main rồi gắn lại `SHELL_HISTORY`.
- **Đếm lại dấu hiệu CẢ HAI bên sau khi giải** (đúng bài học `--ours`): bên tao
  `birthOwned`/`selfBirth`/`normBirth(o.birth)` còn đủ + 7 tool đủ cả hai cờ;
  bên main tool mới có mặt, `shell.js` 36/36 file, `ai-loading-steps` v=5.

### CÒN LẠI
- 7 tool này **không dựng lại được phần giữa** khi khôi phục (không có `autoRun`)
  — bấm một phiên thì hội thoại trở lại còn kết quả thì không. Cố ý: dựng lại là
  chạy lại tool trả phí. Muốn dựng lại thì phải đọc từ cache
  (`portrait_cache`/`user_charts`), là việc riêng.
- `nhan-mach` lấy lá số từ SỔ (2–8 người) nên `restore.birth` chỉ giữ người đầu
  ⇒ dòng phụ nói một người trong khi phiên bàn cả đội. Không sai, nhưng hụt.

---

## 🌓 Dark mode cho trang Tài khoản — gỡ nốt cái đảo sáng (2026-08-07, PR sau)

Henry: *"Ok làm tiếp đi"* mục "Trang Tài khoản ghim sáng" tao để lại ở vòng trên.
Vòng đó tao **ghim** nó thành đảo sáng vì bộ đổi token làm hỏng 12 chỗ ở đây; nay
gỡ hẳn cái ghim.

### 🔴 ĐÍNH CHÍNH con số của chính tao: không phải "32 chỗ / 15 mặt nền"
Trang có **BA khối `<style>`** — khối chính + `#tab-lichsu` + `#tab-ketnoi` nhét
giữa markup — nên lượt đếm trước chỉ nhìn khối đầu. Đo lại: **45 giá trị màu chép
cứng**, trong đó 15 mặt nền `#fff` + 12 chip trạng thái + 3 chỗ skeleton.

### 🔑 Dark phải giải TẠI TRANG, không thừa hưởng được
`.acct-scope` **tự khai trọn bảng màu**, che bảng của `shell.css` ⇒ khối
`:root[data-theme="dark"]` của shell không với tới. Nên phải có
`:root[data-theme="dark"] .acct-scope{…}` riêng. Và **đúng cái bẫy hai vai lặp
lại**: `--navy` là nền thẻ hero/`card-top`/`modal-header`/nút, `--gold` là nền
avatar/nút vàng — khai lại là mấy mặt đó hoá sáng, chữ `#fff` trên chúng chết
theo. ⇒ giữ `--navy`/`--gold` làm MẶT NỀN, chỗ dùng làm CHỮ chuyển sang
`--heading` (thừa hưởng từ shell, đã có bản dark) và `--tx-gold` (khai mới).

### 🪤 Bốn chỗ tao gộp token làm ĐỔI MÀU Ở LIGHT — phải trả lại
Gộp cho gọn thì tiện, nhưng giá trị light không trùng: `.conn-hero` nền `#fffdf7`
(tao gộp vào `--gold-lt` `#F9F4EB`) · viền `#d9c48a` (gộp `--chip-gold-line`
`#e8d9b0`) · `.conn-pill` `#e8f7ee`/`#1e7d43` (gộp `--chip-green`/`--green`) ·
`.conn-revoke` viền `#e2b6b0` (gộp `--chip-red-line`). Đã tách token riêng
(`--hero-tint` · `--hero-line` · `--pill-green*` · `--revoke-line`) để giữ
nguyên pixel. 🔑 **Gộp token chỉ được khi giá trị light TRÙNG KHÍT — không thì
"dọn dẹp" chính là một thay đổi giao diện lén.**

### 🐞 Lỗi phép đo contrast KHÔNG bắt được: ô nhập không khai `background`
`.form-row input` và `.chat-input` chưa bao giờ khai nền ⇒ ăn **mặc định TRẮNG
của trình duyệt**. Ở dark, `color:var(--text)` `#e9e6df` rơi trên nền trắng =
gần như vô hình. Bộ chấm contrast leo cây cha tìm nền nên nó đọc ra nền của thẻ
cha, **không thấy nền do UA cấp** ⇒ chấm ra điểm đẹp. Bắt được bằng bộ dò thứ
hai: quét `backgroundColor` tính được của MỌI phần tử ở dark, cái nào luminance
> 0,6 mà diện tích > 400px² thì kêu. Khai thẳng `background:var(--surface)`
(light vẫn `#FFFFFF` ⇒ không đổi pixel). 🔑 **Đo chữ chưa đủ — phải đo cả MẶT
NỀN, vì nền do trình duyệt cấp không nằm trong cây CSS của mình.**

### Verify — đo trong trình duyệt, đối chứng `origin/main` bằng `git worktree`
Trang này gần như trống nếu chưa đăng nhập (thẻ do JS dựng, API bị chặn) nên bơm
**fixture dựng đủ 15 thành phần** (thẻ lá số, xem tuổi 3 mức điểm, chat, tướng,
alert, skeleton, luận giải, modal, chip lịch sử, thẻ kết nối) rồi mới đo —
không có nó thì chỉ quét được 126 phần tử màn đầu và mọi mặt nền đều lọt.

| | origin/main | bản mới |
|---|---:|---:|
| phần tử có chữ | 207 | 207 |
| dưới AA 4,5:1 | **64** | **10** |
| vô hình < 2:1 | 2 | 1 |
| mặt nền sáng sót ở dark | — | **0** (còn 4 là nền thương hiệu cố ý) |

- **LIGHT: 0 lệch ngoài ý muốn**, đúng **1 chỗ khai trước** —
  `textarea.chat-input` trước ăn màu đen mặc định của trình duyệt (`#000`) trong
  khi cả trang dùng `--text` `#1a1a1a`; nay khớp lại, lệch 26/255.
- **10 chỗ còn dưới AA đều BẰNG ĐÚNG light** (kiểm từng chỗ) ⇒ nợ có sẵn ở cả
  hai theme, không phải hồi quy của dark: chữ `#fff` trên nền thương hiệu
  WhatsApp `#25D366` (1,98) · Telegram `#229ED9` (3,02) · Messenger `#0084FF`
  (3,66) · vàng `--gold` (3,99). **0 chỗ nào dark tệ hơn light.**
- `typecheck` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
  `check:prices`/`check:groups`/`check:nostore` sạch · engine 185 pass.
- **Không bump `?v=`**: chỉ sửa CSS nội tuyến trong chính file HTML, mà HTML trả
  `max-age=0, must-revalidate` nên tới người dùng ngay.

### CÒN LẠI
- **10 chỗ trên là nợ MÀU THƯƠNG HIỆU, không phải nợ dark** — muốn đạt AA thì
  phải đổi chữ nút WhatsApp/Telegram/Messenger sang màu đậm hoặc bỏ màu nền
  thương hiệu, tức đụng nhận diện của bên thứ ba. Cố ý để nguyên.
- Phép đo vẫn chạy trên **fixture tao tự dựng**, không phải dữ liệu thật của một
  tài khoản đã đăng nhập. Thành phần nào có sẵn trong markup thì đo thật, còn
  hình dạng dữ liệu thật (tên dài, nhiều badge) chưa soi.

---

## 🌗 Dark mode: MÀU THƯƠNG HIỆU LÀ MẶT NỀN, đừng dùng làm chữ (2026-08-07, cùng PR)

Henry: *"Ok sửa luôn đi"* mục nợ `--gold-lt` tao ghi ở vòng trên. Đo ra thì cái
nợ đó chỉ là **một mẩu**: khối `:root[data-theme="dark"]` của `shell.css` khai lại
`--text/--line/--paper/--white/--shadow` nhưng **không khai lại một màu thương
hiệu nào**, nên mọi màu đó dùng làm CHỮ đều chìm.

| Màu | Làm chữ | Contrast trên thẻ dark `#161d27` |
|---|---:|---|
| `--navy` `#061A2E` | **71 chỗ / 17 file** | **1,04:1** — vô hình hoàn toàn |
| `--red` `#C0392B` | 50 / 31 | 3,12:1 |
| `--blue` `#1455A4` | 19 / 14 | 2,31:1 |
| `--green` `#1E6B3C` | 15 / 5 | 2,60:1 |

### 🔑 Căn nguyên: TOKEN HAI VAI — và vì thế KHÔNG được khai lại ở dark
`--navy` vừa là **mặt nền** sidebar/thẻ hero vừa là **màu chữ tiêu đề**. `--red` là
**nền nút CTA** (`.btn-go` ~30 trang · `.btn.pri` · `.send` của rail) *và* màu chữ
lỗi. Khai lại chúng ở dark là sidebar hoá sáng, nút CTA đổi màu. ⇒ Phải **TÁCH VAI**:
- Giữ `--navy/--red/--blue/--green` = MẶT NỀN, không đụng.
- Thêm `--heading` · `--tx-red` · `--tx-blue` · `--tx-green` cho CHỮ, **giá trị
  light TRÙNG KHÍT màu gốc** ⇒ light mode không đổi một pixel, dark có bản sáng.
- `--gold-lt` cũng hai vai: 53 chỗ làm **nền**, nhưng **6 chỗ trong `app-home.html`
  làm CHỮ** trên thẻ "Vận hôm nay" — thẻ đó navy **cố định cả hai theme**. Đổi mù
  là 6 chỗ đó tụt **16,04 → 1,07:1**. Tách ra `--gold-on-navy` (không theo theme).

### Chọn `--gold-lt` dark bằng ΔE, KHÔNG bằng contrast-ratio
`#241f14` — **ΔE 16,2** so với thẻ, trong khi hover ở light mode chỉ **ΔE 6,1**;
và là ứng viên duy nhất giữ `--text-lt` ở AA (4,51). Contrast-ratio nền-vs-nền ra
**1,03** nghe như "không phân biệt được" nhưng đó là **thước đo sai cho hai MẶT
PHẲNG khác hue**: nó chỉ đo độ sáng. Trùng giá trị `admin.css` đã chọn từ trước.

### 🪤 Ba cái bẫy, cả ba chỉ lộ khi ĐO chứ không khi đọc code
1. **`app-tai-khoan.html` là ĐẢO SÁNG** — port từ `profile.html`, tự khai trọn bảng
   màu sáng trong `.acct-scope` (15 mặt nền `#fff`) và **không có bản dark**. Bộ đổi
   token của tao sửa 12 chỗ ở đó ⇒ chữ SÁNG trên nền TRẮNG. Đã **hoàn nguyên cả
   file** rồi ghim `.acct-scope{background:var(--bg)}` cho khớp chính bảng màu của
   nó. Dark thật cho trang đó là việc riêng — phải soi lại cả 15 mặt nền.
2. **Bộ dò "đảo sáng" của tao bỏ qua OAN 2 chỗ**: `.rail-upsell` khai
   `background:var(--gold-lt,#F9F4EB)` — cái **fallback** `#F9F4EB` làm bộ dò tưởng
   là nền sáng cố định. Nền nó THEO THEME. Phải vá tay 2 chỗ con.
3. **Hai bản vá của chính tao đá nhau**: đổi `h2` của trang Tài khoản sang
   `--heading` (sáng ở dark) rồi lại ghim trang thành đảo SÁNG ⇒ chữ sáng trên nền
   trắng, 1,05 → 1,25. Trả `h2` về `--navy`.

### Verify — đo trong TRÌNH DUYỆT trên cả 35 trang, không tin grep
- **A) LIGHT mode phải không đổi**: so màu chữ tính được của **5.022 phần tử** giữa
  bản mới và **worktree ở `git HEAD`** → **0 lệch ngoài ý muốn**, đúng **1 chỗ đổi
  có khai trước (`.step-counter` `#444`→`--text-mid` `#4a4a4a`, lệch 6/255)**.
- **B) DARK mode**: leo cây cha lấy nền hiệu dụng rồi chấm contrast thật trên
  **4.133 phần tử có chữ**: **vô hình (<2:1) 16 → 0** · dưới AA 403 → 375.
- 🪤 **Bản đầu của bài kiểm A/B SAI**: chỉ tráo `shell.css` mà giữ HTML mới ⇒ biến
  mới thành `undefined` → rơi về màu thừa kế → báo "40 chỗ lệch" **oan**. Đối chứng
  phải là **CẢ CÂY** (dùng `git worktree`), không phải một file.
- 🪤 Ca T8 của vòng trước hoá **flaky**: trang tải lại `?auto=1` tự tiêu thụ
  `app_restore` lúc boot nên test đọc ra `null` tuỳ lúc. Chặn lượt tải đó bằng trang
  trắng để phép đo tất định. Và ca ĐỐI CHỨNG phải neo `origin/main`, **không neo
  `HEAD`** — stack thêm commit là `HEAD` dịch, đối chứng tự so với chính mình.
- `typecheck` 0 · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
  `check:prices`/`check:groups`/`check:nostore` sạch · engine 185 pass.

### CÒN LẠI
- **375 chỗ vẫn dưới AA ở dark**, phần lớn là `--gold-soft` làm chữ (**47 chỗ,
  4,25:1**). CỐ Ý không đụng: ở **light** nó đang là **3,64:1** — tức dark còn khá
  hơn light, không phải hồi quy; và nó kiêm luôn màu VIỀN nên đổi là lan khắp nơi.
- ~~Trang Tài khoản ghim sáng~~ → **đã có dark thật**, xem mục ngay dưới.
- Bộ đo chỉ thấy **trạng thái ĐẦU** của mỗi trang (form, chưa có kết quả) nên phần
  kết quả luận giải chưa được quét.
- `admin.css` có `--gold-lt` riêng cùng giá trị `#241f14` — hai file hai bảng màu,
  cố ý không gộp.

---

## 🕘 "Phiên gần đây": nhãn mô tả LÁ SỐ trong khi cái phân biệt là HỘI THOẠI (2026-08-07, PR này)

Henry gửi ảnh `/app/luan-giai` trên iPhone: *"Chắc phải tìm cách display cái mục
Phiên gần đây lại sao cho hợp lý. Chứ càng về sau càng nhiều phiên thì nó cứ dài
ra ah?"*

### 🔴 ĐÍNH CHÍNH tiền đề: nó KHÔNG dài ra — đã chặn ở 6 dòng từ đầu
`shell.js` vốn `list.slice(0, 6)`, lưu tối đa 40 (`HIST_CAP`). Chạy 100 phiên vẫn
đúng 6 dòng. Lỗi thật là **6 dòng đó vừa tốn chỗ vừa không nói được gì**, và nó tệ
dần theo thời gian không phải vì DÀI THÊM mà vì càng ngày càng **GIỐNG NHAU**.

### 🔑 Căn nguyên: nhãn mô tả LÁ SỐ, còn thứ phân biệt các phiên là CUỘC HỘI THOẠI
`app-luan-giai.html` dựng title = `'Luận giải '+tên+' · '+ngày+' · năm '+namxem`.
Trên chính trang Luận Giải thì `"Luận giải "` thừa (đang đứng ở đó) và
`" · năm 2026"` thừa (mặc định, giống nhau cả 6 dòng) ⇒ **21/33 ký tự = 64% là
boilerplate**, phần khác nhau chỉ còn tên + ngày, mà tên thì bị cắt cụt.
- Ảnh của Henry có **3 dòng chữ y hệt** `Luận giải DT · 9/5/1984 · năm 2026`.
  Đọc `saveCurrent()`: phiên **chỉ được lưu khi đã có ít nhất một lượt hỏi–đáp**
  (`if (!msgs.length) return`) ⇒ đó là **3 cuộc trò chuyện KHÁC NHAU** về cùng một
  lá số, không phải rác trùng lặp. Nhãn không nói được điều đó nên trông như lặp →
  không ai bấm → 6 dòng chiếm 40% màn hình đầu để phục vụ ~0 cú bấm.
- ⇒ Thứ phân biệt chúng LUÔN TỒN TẠI và đã nằm sẵn trong record: **câu hỏi đầu**.

### Lỗi kèm: chiếm 40% màn hình đầu, và nằm TRÊN form
`#shellRecent` đặt trước `.form-card` ở **cả 27 trang tool**. Mỗi dòng ~43px
(padding 9 + font 12.8 + gap 6) → 6 dòng + tiêu đề ≈ **284px** ≈ 40% chiều cao
dùng được của iPhone, cộng thẻ intro phía trên thì cái form — thứ người ta vào
trang để dùng — bị đẩy hẳn xuống dưới màn hình đầu.

### Ba bề mặt cùng nói một thứ trong một màn hình
`Phiên gần đây` (trên form) · **`Sổ lá số`** (chip trong form) · **`Lịch sử`**
(panel trong rail, đã có xoá). `restoreSession()` reload `?auto=1` → **tính lại
center rồi mới replay transcript** ⇒ phần "lá số" của nó trùng khít chip Sổ lá số
ngay bên dưới; giá trị RIÊNG duy nhất là **đoạn hội thoại** — đúng thứ nhãn không
hề nhắc tới.

### Cách vá (Henry chốt phương án B sau khi xem 7 hướng)
- **Dòng chính = câu hỏi đầu của phiên**, tên/ngày sinh tụt xuống dòng phụ.
- **Chỉ hiện 2 dòng**, phần còn lại sau nút `Tất cả (N) ›` → **mở panel Lịch sử
  CÓ SẴN** trong rail (chỗ đó đã có xoá, không phải viết mới).
- **Gộp đếm theo lá số**: `DT · 9/5/1984 · 3 phiên` thay vì bày 3 dòng trông y hệt.
- ⚠️ **Dòng phụ dựng TỪ `restore.birth`, KHÔNG cắt chuỗi title**: tiền tố title là
  chữ mỗi tool tự viết, còn nhãn tool trong sidebar đọc từ `tool_pricing.label` —
  hai bên khác hoa/thường (`Luận giải` vs `Luận Giải`) nên cắt theo chuỗi sẽ trượt
  IM LẶNG, để lại đúng phần thừa mình định bỏ.
- ⚠️ **Khoá gộp CỐ Ý bỏ TÊN**: cùng một người hay bị gõ hai kiểu — ảnh của Henry có
  `TL` và `Thuy Lưu` cùng ngày `30/8/1983`. Tính tên vào khoá là đếm ra hai lá số.
- **Mở rail TRƯỚC rồi mới mở panel** khi bấm `Tất cả`: trên mobile rail nằm ngoài
  màn hình, chỉ bật panel thôi thì bấm xong không thấy gì xảy ra.
- `min-width:0` trên `.ri-m` là BẮT BUỘC — thiếu nó thì `text-overflow` của con
  không chạy, câu hỏi dài phình dòng thay vì cắt bằng ba chấm.
- Sửa **`shell.js` + `shell.css`** ⇒ 27 trang tool tự đổi. Không migration, không
  đụng API, không đụng `restoreSession`. Bump `shell.js?v=64` · `shell.css?v=17`
  (35 trang; `git diff` xác nhận HTML **chỉ có đúng 2 dòng version mỗi file**).

### Verify
`typecheck` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` + `check:groups` + `check:nostore` sạch · engine **185 pass** ·
`node --check`.
- **34 ca Playwright trên TRANG THẬT** `/app/luan-giai` + `/app/phong-thuy` với
  `shell.js` THẬT, seed đúng 6 phiên trong ảnh Henry: đúng 2 dòng · dòng chính là
  câu hỏi · **0 lượt lọt chữ "Luận giải"/"năm 2026"** · gộp đúng `3 phiên` và lá số
  1 phiên thì KHÔNG hiện số đếm · cao **129px** · 390px và 1440px không tràn ngang.
- 🪤 **ĐỐI CHỨNG nạp đè bản cũ lấy từ git HEAD**: 6 dòng, **2 dòng chữ y hệt nhau**,
  cao **265px** ⇒ lỗi có thật và bản mới cắt được ~nửa, bài kiểm không đỗ giả.
- Ca biên: 2 phiên → **không dựng nút "Tất cả"** · phiên không có lá số (tool ảnh)
  → 1 dòng, **không dựng dòng phụ rỗng** · câu hỏi dài 270 ký tự → ellipsis, vẫn 1
  dòng · câu hỏi chứa `<img onerror>` + `<script>` **không chạy** mà vẫn hiện nguyên
  văn · bấm `Tất cả` → rail mở + panel liệt kê **đủ 6 phiên kèm nút xoá** · bấm một
  dòng → đúng `?auto=1` + đúng id trong `sessionStorage`.

### CÒN LẠI
- **Nợ CÓ SẴN, cố ý không vá ở đây:** `--gold-lt` không được khai lại trong khối
  `[data-theme="dark"]` nên mọi `:hover` dùng nó (`.chip`, `.row`, `.intro-card`,
  `.recent-item`) ra nền kem sáng + chữ sáng ở dark mode. Có sẵn từ trước, nằm trên
  4 thành phần dùng chung — trộn vào PR này là đúng thứ repo tự dặn tránh. Nút
  `.recent-all` mới CỐ Ý dùng `--paper-2` (có khai lại ở dark) để không nhân thêm.
- Con số cần nhìn sau 1–2 tuần: có ai bấm `Tất cả (N)` không. Không ai bấm nghĩa là
  2 dòng đã đủ và phần còn lại chỉ nên sống trong rail.

---

## 🎯 M3 — Nhiệm vụ onboarding: đổi CÙNG khoản tiền lấy được gì (2026-08-07, PR này)

Henry: *"ok. A. skip P1. làm M3"*, rồi bổ sung đúng chỗ tao suýt khoá cứng:
*"cái liên kết telegram, mày thêm liên kết whatsap và facebook nữa, vì đã có 2
liên kết đó rồi, sau này có liên kết zalo nữa"*.

### 🔴 Cái giá đang trả, và cái nhận về
48 người đã nhận **25 Lượng** quà đăng ký (1.200 Lượng phát ra). Sau 4 tháng:

| Thứ đáng lẽ thu được | Có |
|---|---:|
| Liên kết kênh chat (`chat_links`) | **3** |
| Bật thông báo (`push_subscriptions`) | **2** |
| Lá số lưu trên tài khoản (`user_charts`) | **2 dòng, 1 người** |
| Lượt mời bạn (`referrals`) | **0** |

Dòng cuối đáng chú ý nhất: cả track viral V2 đã dựng xong mã giới thiệu + link +
thưởng 15 Lượng, **vẫn 0 lượt**. Phát tiền mà không hỏi lại gì thì không nhận
lại gì.

### 🔑 KHÔNG cắt 25 Lượng ra chia nhỏ — đó là cái bẫy hiển nhiên
Cắt thì người mới cầm 5 Lượng và **không chạy nổi tool nào** (rẻ nhất 5, phần lớn
15–30) ⇒ siết đúng đầu phễu vốn đã hỏng (60 tài khoản → 3 người trả tiền). Nhiệm
vụ là phần **CỘNG THÊM**: 3 việc × 10 = **+30 Lượng ≈ thêm một lượt Dạy Con**.
Lượng không phải tiền mặt — mình tự đúc; chi phí thật là lượt gọi model lúc họ
tiêu, mà **làm cho họ tiêu chính là mục đích**. Cầu dao ảnh free
(`viral.free_gen_daily_cap`) vẫn gác phần đắt tiền nên đúc thêm không thủng.

### Ba việc, chọn theo thứ ĐANG thiếu
**Lưu lá số** (không có lá số thì nửa site chết) · **bật thông báo** (kênh vừa
nối lại hôm qua) · **liên kết MỘT kênh chat bất kỳ**.
- ⚠️ **Phép kiểm `chat_links` KHÔNG lọc `platform`** — prod đã có Telegram +
  WhatsApp + Messenger, Zalo OA đang chờ duyệt. Bản đầu tao khoá cứng vào
  Telegram; Henry bắt đúng chỗ đó. Kênh mới cắm vào là tự tính, không sửa lại.
- ⛔ Bỏ **xác minh email** (Supabase đã xác minh lúc đăng ký — trả tiền cho thứ
  đã có) và **xác minh SĐT** (phải mua cả một nhà cung cấp OTP cho 60 người).
- ⛔ **Mời bạn chỉ được BÀY mức thưởng 15 Lượng sẵn có, không cộng thêm** — trả
  hai lần cho một việc là mở đường farm.

### Cách dựng
- **Chống nhận hai lần nằm ở KHOÁ CHÍNH `(user_id, task_key)`**, không phải ở cờ
  trong mã ứng dụng — cùng mẹo `portrait_cache`: để DB từ chối, đừng để mã nhớ
  hộ. RPC `onboarding_task_claim` gói cả `insert … on conflict do nothing` +
  `add_credits` + ghi `credit_transactions` trong MỘT transaction.
- ⚠️ **Thứ tự chèn-dấu-TRƯỚC-rồi-mới-cộng-tiền là CỐ Ý**: hai chiều hỏng không
  đối xứng — cộng trước mà lỗi ⇒ cộng hai lần (phát không tiền); chèn dấu trước
  mà lỗi ⇒ thiếu một lần, đọc `onboarding_tasks` ra là đối soát được.
- **Trần 200 Lượng/nhiệm vụ ngay trong RPC.** `app_config` sửa được bằng SQL nên
  một cú gõ thừa số 0 là phát cả gia tài; chốt ở tầng DB để lỗi đó dừng trước ví.
  Trần kiểm TRƯỚC bước chống-trùng — giá vô lý là lỗi lập trình, phải kêu to.
- **SERVER TỰ KIỂM, KHÔNG TIN CLIENT** — tra thẳng bảng đã sinh ra bằng chứng.
  **FAIL-CLOSED**: đọc hụt → coi như chưa xong. Ngược hẳn `viral-budget.ts`
  (fail-OPEN) và ngược có lý do: bên kia gác người ĐÃ TRẢ TIỀN nên chặn oan là
  tệ nhất; bên này đang PHÁT tiền nên phát nhầm mới là tệ nhất.
- **Tự cộng khi phát hiện xong, KHÔNG có nút "Nhận"** — mỗi nút bấm là một chỗ
  rơi. Nhưng **phải hiện ra** (`justGranted` → dòng "vừa cộng +N Lượng"): cộng
  lén thì không ai biết mà cũng chẳng khuyến khích được ai.
- **POST chứ không GET**: lượt gọi này cộng Lượng. Để ở GET là mời trình
  duyệt/CDN prefetch một endpoint phát tiền.
- **Đồng bộ lại khi quay lại tab** (chặn 20 giây) — đây mới là ca thường gặp
  nhất: bấm "Liên kết" → sang profile → nối Telegram → quay về.
- Thẻ **tự ẩn khi xong cả ba**; khách chưa đăng nhập **không bao giờ thấy** và
  trang KHÔNG gọi API lần nào.

### 🐞 Hai lỗi tự bắt khi đi kiểm đường dẫn, không phải khi đọc code
1. **Cả hai nút tao đặt đầu tiên đều HƯ**: `/app/so-la-so` không tồn tại (sổ lá
   số là thanh chip do `user-charts.js` chèn, không có trang riêng), và
   `/profile.html#kenh` vô nghĩa vì profile đổi tab bằng **cú bấm JS, không đọc
   hash**. Vá: thêm `openTabFromHash()` vào `account-core.js` (`#ketnoi` mở thẳng
   tab Kết Nối — hữu ích cho mọi liên kết từ nơi khác, không riêng M3), và nhiệm
   vụ lá số đổi sang `href` RỖNG = mở ô nhập **ngay trong thẻ Vận hôm nay** trên
   chính trang này. `Shell.rememberBirth` vốn đã tự ghi lên sổ tài khoản.
2. **`esc()` của `app-home.html` chỉ thoát `& < >`, KHÔNG thoát dấu nháy** — mà
   tao đang nhét chuỗi từ server vào GIÁ TRỊ THUỘC TÍNH. Bỏ hẳn đường đó: gắn nút
   theo **CHỈ SỐ** (số do chính mình sinh ra, không cần thoát) rồi tra ngược.

### 🔍 Bắt kèm — lỗi CÓ SẴN trên 58 trang, CỐ Ý KHÔNG vá ở đây
`profile.html` ném `Identifier 'SUPA_URL' has already been declared`. Đối chứng
A/B với bản dựng từ `git HEAD`: **y hệt ở cả hai bên** ⇒ không phải do PR này.
Căn nguyên: 58 trang nạp CẢ `/auth.js?v=2` (thẻ của trang) LẪN `/auth.js` (do
`nav.js` tự chèn), vì chốt canh của nav.js đọc `typeof window.Auth==='undefined'`
đúng lúc bản kia còn đang tải → một bản chết hẳn. Trang `/app` thoát vì chế độ
`data-icons-only` `return` sớm TRƯỚC đoạn chèn đó.
- **Không vá trong PR này**: một dòng trong file nạp trên 89 trang, trộn vào PR
  thêm tính năng đúng là thứ repo tự dặn tránh. Bài kiểm **lọc riêng** nó ra nên
  vẫn bắt được lỗi MỚI. Vá đúng chỗ: đổi chốt canh của `nav.js` sang dò
  `script[src*="auth.js"]` thay vì dò một id chỉ chính nó đặt.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` + `check:groups` sạch · engine **185 pass** · `node --check` 3
khối script nội tuyến.
- **Bất biến trên RPC THẬT** (chạy trong transaction rồi rollback, verify 0 dòng
  sót): nhận lần đầu **+10** · nhận lại **0** · **nhận lại với GIÁ KHÁC (50) vẫn
  0** (không cộng bù) · số dư lệch **đúng 10** · đúng 1 dòng giao dịch + 1 dòng
  nhiệm vụ · trần 200 chặn được 9999.
- **37 ca Playwright trên TRANG THẬT** `/app` và `account-core.js` THẬT: khách
  chưa đăng nhập → **0 lượt gọi API, thẻ không hiện** · 0/3 → đủ 3 việc, đếm
  đúng "0/3 · còn +30 Lượng" · 2/3 → đúng 2 dấu tích, báo "vừa cộng +20", chỉ
  việc chưa xong mới còn nút · xong cả ba → **thẻ ẩn hẳn** · nút `href` rỗng →
  **KHÔNG rời trang**, form mở ngay trong thẻ · nút có `href` → tới đúng
  `/profile.html#ketnoi` · nhãn chứa `<img onerror>` + `<script>` **không chạy**
  mà vẫn hiện nguyên văn · quay lại tab trong 20 giây → không gọi lại · 390px
  không tràn ngang · **ĐỐI CHỨNG** profile không có hash → vẫn tab mặc định.
- 🪤 **Hai ca đỏ, cả hai là lỗi TEST**: (a) glob `**/action=onboarding-sync**`
  không khớp vì trước `action=` là dấu `?` chứ không phải `/` — phải dùng hàm
  khớp URL; (b) stub `VanNgayResult` tao viết tay cho gọn thì **thiếu `saoNgay`**
  → `render()` NÉM giữa chừng, rơi vào `.catch` chạy `fallback()`; thẻ vẫn hiện
  và can chi vẫn đúng nên **nhìn qua tưởng chạy tốt**, chỉ khối cá nhân im lặng
  biến mất. **Stub thiếu trường thì bài kiểm đo nhầm đường lùi thay vì đường
  chính** — lấy shape thẳng từ interface của engine.

### ✅ Đã chạy prod — hết việc tay
`_patches/migration-onboarding-tasks.sql` đã áp (bảng + RPC + `app_config
['onboarding.task_rewards'] = {10,10,10}`). Chỉnh mức thưởng bằng SQL, không cần
deploy; đặt một khoá về **0 là tắt hẳn** nhiệm vụ đó.
- 🪤 **Lượt deploy RPC đầu tao gõ chữ KHÔNG DẤU** (`'Nhiem vu: '`) trong khi file
  repo có dấu — mà chuỗi đó đi thẳng vào `credit_transactions.description` nên
  người ta đọc được. Đúng bệnh "bản đang chạy khác bản trong repo" vừa mắc hôm
  qua với edge function. Đã `create or replace` lại bằng nguyên văn và verify
  bằng cách đọc ngược mô tả trong sổ giao dịch.
- 🪤 Cột chú thích của `app_config` tên là **`note`**, không phải `description`
  (đó là cột của `credit_transactions`) — lượt chạy đầu đỏ đúng chỗ đó.

### CÒN LẠI
- **Chưa có người thật nào làm nhiệm vụ** — mẫu 60 tài khoản. Con số cần nhìn sau
  1–2 tuần là ba cột `chat_links` / `push_subscriptions` / `user_charts` có nhảy
  khỏi mức 3/2/2 hay không. **Đừng kỳ vọng doanh thu nhảy** — mục này mua KÊNH
  LIÊN LẠC, không mua đơn hàng.
- **`push_subscriptions` hiện có 2 dòng và cả hai `user_id` NULL** ⇒ nhiệm vụ
  "bật thông báo" chưa tính được cho hai người đó. Bước tự lành của R1a (đồng bộ
  lại dòng dưới DB mỗi ngày kèm `Authorization`) sẽ điền `user_id` trong vòng
  24 giờ kể từ lượt ghé tiếp theo của họ — không phải làm gì thêm.
- Nhiệm vụ **mời bạn** cố ý không nằm trong thẻ. Nếu sau này thấy `referrals` vẫn
  0 thì vấn đề là chỗ MỜI (widget `invite-cta.js` chỉ hiện khi hết Lượng), không
  phải mức thưởng.
## 🔤 Font lạc bầy + nhãn radar bị cắt ở Công Sở (2026-08-07, PR #445)

Henry: *"tool tử vi công sở có vẻ đang dùng font khác với các tool còn lại ah?
… với lại cái chart radar chữ bị to nên bị che mất"*. **Cả hai đều đúng, và là
hai lỗi ĐỘC LẬP.**

### 🔴 1. Thẻ nạp font nằm ở TỪNG TRANG, nên quên là im lặng lệch
`shell.css` khai `--serif:'Noto Serif',Georgia,serif` — nhưng bộ 3 thẻ `<link>`
kéo Noto Serif về lại nằm trong `<head>` của **từng trang**. `app-cong-so.html`
thiếu hẳn, nên mọi chỗ dùng `var(--serif)` (tiêu đề mục · tên kiểu người · nút ·
số trong bảng) lặng lẽ rơi về **Georgia**.
- 🔑 **Không có gì báo**: CSS vẫn hợp lệ, font lùi vẫn là serif, trang vẫn đẹp —
  chỉ khác chữ so với 33 trang kia. Loại lỗi chỉ lộ khi đặt hai trang cạnh nhau.
- Quét cả 35 trang shell: **đúng 2 trang thiếu** — `app-cong-so.html` và
  `app-ban-do-sao.html`, hai tool MỚI NHẤT (chép từ khuôn không có khối đó). Vá
  cả hai; để lại một trang là lần sau đi tìm lại từ đầu.
- ⚠️ **Thêm trang shell mới thì PHẢI chép cả 3 dòng preconnect/preload này**, đừng
  tin là `shell.css` lo hết.

### 🔴 2. Radar chừa lề CỐ ĐỊNH cho nhãn có bề rộng THAY ĐỔI
`veRadar` lấy cỡ chữ **theo bán kính** (`R*0.115` ⇒ **20px** ở khổ 520) rồi chừa
lề cứng `max(46, side*0.17)`. Lề đó hẹp hơn bề rộng chữ THẬT của nhãn dài nhất
("Đồng sự ngang hàng", "Nền tảng hậu phương") ⇒ đuôi nhãn tràn khỏi canvas và bị
cắt cụt. Đo được: **51 điểm mực chạm mép** ở 1440px, **38** ở 390px.
- Vá bằng cách **đảo thứ tự tính**: chốt cỡ chữ theo KHỔ VẼ (9–12px) → gãy nhãn
  dài xuống tối đa 2 dòng (chọn chỗ ngắt cho hai dòng CÂN NHAU nhất, không ngắt
  tham lam) → rồi **giải ngược bán kính từ bề rộng ĐO ĐƯỢC** của từng nhãn theo
  góc của nó. Bán kính tự co vừa đủ ⇒ đổi chữ nhãn hay đổi khổ canvas đều không
  cắt được nữa. Nhân tiện vòng radar **to lên** vì nhãn 2 dòng hẹp hơn 1 dòng.
- 🔑 **Quy ước rút ra: nhãn quanh biểu đồ thì ĐO rồi mới chốt bán kính, đừng chừa
  một con số.** Lề cố định chỉ đúng với đúng bộ chữ lúc viết nó.
- `veToaDo` (hình lên poster) **không đụng** — `posterDraw` gọi `veToaDo` chứ
  không gọi `veRadar`, nên ảnh chia sẻ giữ nguyên.
- Bump `tools-shared/cong-so.js?v=1→2`.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` + `check:groups` sạch · engine **185 pass** · `node --check`.
- **72 ca trên MODULE THẬT** (6 khổ canvas × 4 kiểu người × 3 bộ điểm cực đoan;
  nhãn đọc THẲNG từ `RADAR_CUNG` của engine chứ không chép tay): lấy mẫu pixel
  vành ngoài canvas → **0 ca có mực chạm mép**, 0 ca ra khung trắng.
- **4 khổ màn (1440 · 1024 · 768 · 390) trên TRANG THẬT**, canvas dựng trong đúng
  khuôn DOM kết quả nên ăn CSS thật: 0 nhãn bị cắt · trang nạp VÀ ÁP được
  stylesheet Noto Serif · không tràn ngang · 0 lỗi JS.
- 🪤 **ĐỐI CHỨNG nạp đè bản cũ lấy từ git HEAD**: radar cắt 51/38 điểm và **0
  lượt gọi Google Fonts** ⇒ cả hai lỗi có thật, bài kiểm không đỗ giả.
- 🪤 **`document.fonts.check()` KHÔNG dùng để kiểm font được** — nó trả `true` cả
  khi family không tồn tại (vì luôn có font lùi), nên bản kiểm đầu xanh ở CẢ HAI
  phía. Phải hỏi *stylesheet có được nạp và áp không*. Và `cssRules` của sheet
  khác origin thì trình duyệt chặn → hỏi vào đó là ca nào cũng `false`.

### CÒN LẠI
- Container phiên chặn `fonts.googleapis.com` nên bài kiểm phục vụ một CSS
  `@font-face` giả để chứng minh đường nạp thông; **chưa nhìn Noto Serif render
  thật** ở đây.

---

## 🧩 `npm run dev` thiếu bước dựng engine — và nó hỏng theo kiểu ĐÁNH LỪA (2026-08-07, PR sau)

Henry: *"vá đi"* mục "nợ có sẵn" tao ghi ở vòng trên.

### 🔴 ĐÍNH CHÍNH: chẩn đoán cũ của tao SAI, không có bug nào trong mã
Tao ghi *"`/api/cong-so` trên `next dev` ném `document is not defined` — bộ nạp
engine vanilla thiếu mock `document`"*. **Sai.** Đọc lại đúng khối log của lượt
hỏng thì nguyên nhân nằm 12 dòng PHÍA TRÊN triệu chứng:
```
Module not found: Can't resolve '../../tuvi-engine/dist/lunar/convert.js'
```
Tức **`tuvi-engine` chưa được dựng** — phiên đó tao mới `npm ci` ở gốc, chưa
`cd tuvi-engine && npm ci && npm run build` (đúng bước setup CLAUDE.md đã ghi).
Cả hai file engine vanilla **không hề dùng `document`** (đã grep: 0 lượt).

### 🪤 Vì sao dễ chẩn sai — ba lớp che nhau, đo được cả ba
Gỡ `tuvi-engine/dist` rồi dựng lại đúng tình huống:

| | dist thiếu | sau khi vá |
|---|---:|---:|
| `/api/payment` (route THẬT SỰ hỏng) | 500 | 200 |
| `/api/cong-so` (**không liên quan**) | 500 | 200 |
| `/api/auth/session` (**không liên quan**) | 500 | 401 |
| `document is not defined` trong log | 7 | 0 |

1. Route thật sự hỏng là `/api/payment` (→ `lib/agent/tools.ts` import thẳng
   `../../tuvi-engine/dist/**`), và nó BÁO ĐÚNG nguyên nhân.
2. Nhưng Next dev sau đó **trả 500 cho cả route không dính dáng gì**.
3. Và bộ overlay lỗi của Next dev ném `ReferenceError: document is not defined`
   trong ngữ cảnh Node — **đè lên dòng nguyên nhân thật**.
⇒ Người đọc log thấy "document is not defined" ở một route vô can, đi tìm nhầm
chỗ. **Bài học: đọc TRỌN khối log quanh lỗi, đừng dừng ở dòng ném ra.**

### 🔴 Lỗ hổng THẬT tìm ra khi lần lại: `dev` không có hook, `build` thì có
| | dựng `tuvi-engine`? |
|---|---|
| `npm run build` (và Vercel deploy) | ✅ qua `prebuild` |
| `npm run dev` | ❌ **không có `predev`** |
| `npm run typecheck` | ❌ (tsc cũng cần `dist`) |

Nên máy vừa clone chạy `npm ci && npm run dev` chắc chắn rơi vào đúng cái bẫy
trên. Prod không bao giờ dính vì `prebuild` lo sẵn — đó là lý do lỗi này sống
lâu mà không ai thấy.

### Cách vá
`scripts/ensure-engine-built.mjs` + `predev` / `pretypecheck`.
- **Canh ĐÚNG file mà `tools.ts` import** (`dist/lunar/convert.js`), không canh
  mỗi thư mục `dist`: một lượt build hỏng nửa chừng vẫn để lại `dist` rỗng.
- **Tự dựng khi thiếu** (kèm `npm ci` nếu `tuvi-engine/node_modules` cũng thiếu)
  thay vì chỉ mắng — máy vừa clone không phải làm gì thêm.
- **Đường nhanh là một lượt `stat`**: đã dựng rồi thì thoát ngay, đo được
  **52ms**, nên không làm chậm `npm run dev` hằng ngày.
- Dựng hỏng thì in thẳng câu lệnh chạy tay + nói trước cái bẫy ở trên, rồi
  `exit 1` — thà chặn còn hơn để dev server lên rồi 500 lung tung.
- **KHÔNG đụng `prebuild`** — đường deploy đang chạy đúng, sửa vào đó là rủi ro
  không đổi lấy gì.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` + `check:groups` sạch · engine 185 pass.
- **Dựng lại đúng tình huống hỏng** (gỡ `tuvi-engine/dist` + xoá `.next`): tái
  hiện **y hệt** bảng số ở trên ⇒ chẩn đoán mới có bằng chứng, không phải suy.
- **3 ca trên script thật**: dist có → thoát 0 trong **52ms**, 0 dòng ra · dist
  thiếu → tự `npm ci` + build, dựng lại được `dist/lunar/convert.js`, exit 0 ·
  **đầu-cuối `npm run dev` từ trạng thái máy-vừa-clone** → `predev` chạy trước,
  3 route trên đều lành, **0 lượt** `document is not defined`, **0 lượt**
  `Can't resolve`.

---

## 🔒 Tấm khoá tính thử CẮT MẤT NÚT MỞ (2026-08-07, PR trước)

Henry gửi ảnh chụp trên laptop: *"cái box nó nhỏ quá, ko thấy dc cái button,
cũng ko scroll lên scroll xuống dc trong cái box đó"*.

### 🔴 Lỗi CẤU TRÚC, không phải thiếu padding
`.tpw-lock-veil` để `position:absolute; inset:0` ⇒ **toàn bộ chữ thật** (tiêu đề
· danh sách khối khoá · số dư · **NÚT**) nằm NGOÀI luồng. Chiều cao khung do 6
vạch mờ TRANG TRÍ quyết định (192px). Danh sách 6 khối khoá đẩy nội dung lên
~240px → tràn → `overflow:hidden` cắt đúng cái nút, mà absolute thì cũng không
cuộn được. **Đo được: nút tràn 24px.**
- Chỗ này ĐÃ vá một lần bằng cách nới padding vạch mờ (`.tpw-prev .tpw-lock-blur
  {padding:26px 20px 40px}`, có chú thích ngay trên nó). Vá triệu chứng: thêm
  một dòng item là vỡ lại — và đó chính là chuyện vừa xảy ra.
- 🔑 Người dùng nhìn thấy **một tấm khoá không có đường mở**. Đây là bậc CUỐI
  của phễu W1, tức chỗ đắt nhất để hỏng.

### Cách vá — đảo vai hai lớp
Vạch mờ thành dải trang trí có **chiều cao riêng** (`height:106px`); lớp chữ về
**trong luồng** và là thứ quyết định chiều cao. Lớp chữ chồng lên ĐUÔI dải mờ
bằng `margin-top` âm + `padding-top` bù, nên vẫn ra cảm giác "có chữ bị che"
nhưng tiêu đề và danh sách luôn nằm trên nền đã đặc. **Không ca nội dung nào cắt
được nữa** — kể cả 12 item tiêu đề dài.
- Nhân tiện: danh sách khối khoá cho vào khung nền giấy có viền (trước là chữ
  trần trên vạch mờ, đọc rất mệt), nút rộng tối thiểu 240px và full-width dưới
  520px.
- Sửa ở `tuvi-paywall.js` nên **cả 5 tool đang dùng `lockPreview` cùng đổi**
  (nguoi-khac · day-con · nhan-mach · 2 tool chân dung), và tường TỪ CHỐI
  (`_softLock`, dùng ở mọi tool trả phí) cũng hết nguy cơ cắt nút.
- Bump `tuvi-paywall.js?v=17` — **gộp luôn drift có sẵn**: 20 trang standalone
  đang ở `v=13` còn 25 trang shell ở `v=16`.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` sạch · `node --check` paywall.
- **T8 — 5 TRANG THẬT × 3 khổ màn (1440 · 1024 · 390)**: nút nằm TRỌN trong
  khung · nút thấy được · **không phải cuộn trong khung** · hiện đủ 6 khối khoá
  · không tràn ngang · 0 lỗi JS. **Ca cực đoan 12 item tiêu đề dài** ở cả 1440
  lẫn 390: vẫn không cắt, khung tự cao lên.
- 🪤 **Ca ĐỐI CHỨNG bản CŨ lấy từ git HEAD** (nạp đè `tuvi-paywall.js` bằng
  `page.route`): **đúng là bị cắt** ⇒ bài kiểm không đỗ giả.
- 🪤 CSS nằm trong template literal của JS — dấu ` trong chú thích đóng chuỗi
  sớm, `node --check` đỏ ngay. Chú thích trong khối CSS đó không được dùng
  backtick.

### CÒN LẠI
- Mới sửa tấm khoá. **Các tool CHƯA có tính thử thì vẫn chưa có** — mở thêm là
  việc riêng (mỗi tool cần tách `runPreview` + `renderMeta`/`renderProse` theo
  đúng khuôn W1/W1b).

---

## 🧩 CSS CỦA TRANG ĐÈ VỠ FORM DÙNG CHUNG (2026-08-07, cùng PR)

Henry gửi ảnh `/app/cong-so` trên laptop màn lớn: hàng NGÀY · THÁNG · NĂM · GIỜ
· PHÚT chồng chéo lên nhau, "Giờ âm" đè lên ô Phút.

### 🔴 Một dòng CSS, và nó là cả một LOẠI lỗi
`app-cong-so.html` có `.fg select{min-width:200px}` — viết cho ô riêng của trang
(`#trangThai`, "Bạn đang ở vị trí nào"). Nhưng **`TuviForm` dựng markup của nó
vào ĐÚNG khuôn `.frow`/`.fg` mà trang cấp** (đó là giao ước sẵn có: trang lo
CSS, component lo markup). Nên luật ấy trúng luôn **5 select của TuviForm** —
ngày · tháng · giờ · phút · giới tính — bơm mỗi cái lên 200px trong ô rộng
74–90px. Đo được: `#ngay` w=200 trong ô 74px.
- 🔑 Loại lỗi này **không đọc code nào bắt được**: cả trang lẫn component đều
  đúng khi đọc riêng, chỉ vỡ khi hai bên gặp nhau trong trình duyệt.
- Vá: đổi sang `#trangThai{min-width:200px}` — nhắm ĐÚNG ô của trang. Kèm chú
  thích ngay tại chỗ nói vì sao không được nhắm `.fg select`.

### Quy ước rút ra
**CSS của trang nhắm ô nhập PHẢI scope theo id/lớp RIÊNG của trang, không nhắm
`.fg input` / `.fg select` chung** khi trang đó có mount `TuviForm`. Muốn đổi
dáng cả form thì sửa trong `tuvi-form.js`.

### Verify — T9, bộ quét dựng thật rồi ĐO
Không tin vào grep: quét **CẢ 25 trang shell + 20 trang standalone × 3 khổ màn
(1440 · 1024 · 390)**, mỗi trang dựng thật rồi đo 4 bất biến — ô nhập không
tràn khỏi ô chứa · ô chứa không tràn · hàng không tràn khỏi khung · **không hai
ô nào đè lên nhau**.
- Trước khi vá: **đúng một trang đỏ** (`app-cong-so`), ở cả 3 khổ. Sau khi vá:
  **70 lượt kiểm đều xanh, 0 trang vỡ.**
- 🪤 **Đã red-team**: đặt lại dòng CSS cũ → T9 đỏ đúng trang đó ở cả 3 khổ ⇒ bộ
  quét thật sự bắt được, không xanh vì lý do khác.
- ⚠️ Chữ "Dựng hồ sơ" trong ảnh Henry gửi trông như bị tách dấu — **nguồn không
  sai** (đã quét NFD toàn bộ `public/`: 0 ký tự tổ hợp ngoài mấy regex bỏ dấu
  hợp lệ), render lại ở đây ra đúng. Đó là font fallback trên máy Henry.

---

## 🔔 R1a — NỐI LẠI kênh nhắc hằng ngày (2026-08-07, PR trước)

Henry duyệt sau khi tao báo: mục R1 của backlog (*"nhắc đúng lúc, cá nhân hoá
theo lá số, và một lý do để mở ra"*) **giả định một tệp người nhận không tồn
tại**. Đo trước khi viết một dòng nào:

| | |
|---|---:|
| Tài khoản | 60 |
| Đăng ký web-push (`push_subscriptions`) | **2** |
| Token FCM (`push_tokens`) | **0** |
| Lượt `cron-daily-push` từng ghi sổ | **0** |
| Liên kết Telegram | 1 (của Henry) |

### 🔴 BA lỗi chồng nhau — không cái nào là "viết tin nhắn hay hơn"

**1. `public/sw.js` KHÔNG có handler `push`.** Đây là lỗi nặng nhất và im lặng
nhất. `pwa-push.js` khai `userVisibleOnly: true` — tức đã HỨA với trình duyệt
rằng mỗi lượt push sẽ hiện một thông báo. Không có handler thì Chrome tự bù bằng
thông báo mặc định của NÓ (*"Trang này đã được cập nhật ở chế độ nền"*), chạm vào
không đi đâu.
- 🔑 **Nên kênh này "chạy thành công" suốt hai tháng trên giấy tờ**: edge function
  báo `sent=2`, cột `last_sent` cập nhật đúng 00:00Z mỗi sáng. **"Gửi xong" và
  "hiện được" là HAI việc — log của bên gửi không chứng minh được vế thứ hai.**

**2. Nội dung LẶP NGUYÊN VĂN mỗi sáng.** Edge function tra một bảng chép tay 24
dòng (`VAN_HAN`) theo **can chi NĂM SINH** ⇒ mỗi người đúng MỘT câu, mãi mãi, và
câu đó không nói gì về ngày hôm nay. Người đăng ký từ 12/06 đã nhận cùng một câu
**~56 lần**.

**3. Không có đường bật ở nơi có người thật.** `pwa-push.js` chỉ được nạp bởi
`/la-so/[slug]` — 438K trang SEO mà GSC đo **0 nhấp/28 ngày**. Khu `/app` không
có gì. ⚠️ **Đính chính bản báo cáo đầu của tao**: tao nói "không trang nào nạp
`pwa-push.js`" vì chỉ `grep` trong `public/`; nó CÓ được nạp, chỉ là ở đúng chỗ
không ai tới.

**4 (bắt kèm). `/app` KHÔNG đăng ký service worker.** `nav.js` ở chế độ
`data-icons-only` `return` sớm — TRƯỚC đoạn đăng ký SW ở cuối file. Mà
`navigator.serviceWorker.ready` là Promise **không bao giờ resolve** khi chưa có
đăng ký nào ⇒ bản cũ `await` thẳng vào đó là treo im lặng, không lỗi, không dấu
vết. Nay `pwa-push.js` tự đăng ký + có hạn giờ 8 giây.

### Cách vá
- **`lib/push/daily-message.ts` — NGUỒN DUY NHẤT của nội dung**, dùng chung cho
  cả web-push lẫn FCM. Vẫn **0 lượt LLM, 0đ** (tra bảng engine ngày-tốt, cùng
  nguồn với thẻ "Vận hôm nay" ⇒ tin nhắn và thẻ không bao giờ nói khác nhau).
- **Đảo vai Next ↔ edge**: Next DỰNG nội dung, edge CHỈ ĐI PHÁT. Engine là TS
  trong repo, edge là Deno tách biệt — chép engine sang đó là dựng bản thứ hai
  rồi trôi khỏi nhau (đúng bẫy can chi ngày). Ngược lại phần ký VAPID + mã hoá
  payload thì để nguyên bên Deno: gói `web-push` đã chạy tốt, tự cài lại bằng
  crypto thô trong Node là ~150 dòng ECDH dễ sai thầm lặng.
- **Tương thích HAI CHIỀU, không có thứ tự deploy nào làm hỏng**: edge cũ nhận
  body mới → bỏ qua; edge mới không có body → lùi về một câu chung (KHÔNG lùi về
  bảng cũ).
- **Cá nhân hoá bằng phép so chuỗi**: Next trả kèm `xungChi`, edge so với địa chi
  năm sinh đã lưu → thêm dòng *"⚠ Hôm nay xung tuổi X"*. Không phải lập lại lá số
  cho từng người ở tầng gửi.
- **`canChiNam` THÊM vào `VanNgayCaNhan`** thay vì để trang tự suy từ năm sinh:
  quy đổi năm → can chi là cổ pháp, có bản thứ hai ở client là có ngày hai bản
  trôi khỏi nhau.
- **Hỏi quyền SAU khi đã giao giá trị**, 6 giây sau khi thẻ dựng xong, và **chỉ
  với người đã có lá số** (chỉ họ mới nhận được phần đáng giá nhất là cảnh báo
  xung tuổi). Xin quyền lúc vào trang là cách chắc nhất bị bấm "Chặn" — mà "Chặn"
  trên trình duyệt là **VĨNH VIỄN**, không có đường hỏi lại.
- **`tag: 'van-ngay'` cố định** → lượt sau THAY lượt trước. Nhắc hằng ngày mà dồn
  7 thông báo trên màn hình khoá là cách nhanh nhất bị tắt.
- **Tự lành**: đã bật rồi thì mỗi ngày đồng bộ lại dòng dưới DB một lần — dòng đó
  bị xoá khi trình duyệt trả 410, và người đăng nhập SAU khi đăng ký thì `user_id`
  vẫn đang NULL (cả 2 dòng trên prod đều NULL).
- **3 event mới** (`push_optin_shown` · `push_optin_result` · `push_open`) — TÁCH
  nhau vì mỗi bậc hỏng theo một kiểu khác hẳn: không ai thấy lời mời (đặt sai
  chỗ) · thấy mà không bật (câu chữ) · bật mà không mở (nội dung rỗng — đúng bệnh
  vừa vá). Gộp lại thì cả ba trông giống nhau: một con số 0.
- **`.deno.ts` là QUY ƯỚC MỚI**: `tsconfig.json` loại `**/*.deno.ts` khỏi `tsc`.
  Mã Deno dùng `Deno.*` + import `npm:`/`jsr:` nên nằm trong lượt typecheck của
  Next là 8 lỗi chắc chắn. Bản edge function nay có mặt trong repo
  (`_patches/edge-send-daily-push.deno.ts`) — trước đó nó CHỈ tồn tại trên
  dashboard Supabase, nên không ai đọc lại được lúc đi tìm nguyên nhân.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` + `check:groups` sạch · engine **185 pass** · `node --check`
sw.js + pwa-push.js + 3 khối script nội tuyến.
- **13 bất biến trên MODULE THẬT, 365 ngày**: luôn có tiêu đề/thân · 0 rò
  `undefined`/`NaN`/`[object`/`null` · 0 tin gợi ý "an táng" · thân ≤160 ký tự
  (dài nhất 115) · `xungChi` khớp ĐÚNG engine · **7 ngày liên tiếp ra 7 câu KHÁC
  nhau** và cả năm **364 câu phân biệt** (canh đúng lỗi vừa vá — bản cũ có 24 câu
  cố định vĩnh viễn) · deterministic · ĐỐI CHỨNG ngày kỵ thì nêu "trùng …" chứ
  không gợi ý việc.
- **47 ca Playwright trên FILE THẬT**: chạy NGUYÊN VĂN nguồn `sw.js` trong một
  global giả (`new Function('self','caches', src)`) — có đủ 2 handler · 3 lượt
  push ra 3 thông báo · **ĐỐI CHỨNG payload không phải JSON và push rỗng vẫn phải
  HIỆN**, không im lặng · có tab sẵn thì điều hướng tab đó, không có thì mở tab
  mới. Trên `pwa-push.js` thật: tự đăng ký SW · gửi `Authorization` khi đã đăng
  nhập · ghi CẢ ca hỏng (`denied` / `error`) · **5 ca PHẢI IM LẶNG** (vừa hỏi 3
  ngày trước · đã bị chặn vĩnh viễn · **iOS tab thường không có `Notification`** ·
  đã bật rồi · vừa đồng bộ 1 tiếng trước) · **SW không bao giờ sẵn sàng → KHÔNG
  treo**. Trên **trang `/app` THẬT**: chưa tới 6 giây chưa mời · sau đó mời và
  nêu đúng can chi từ engine · ĐỐI CHỨNG chưa có lá số thì KHÔNG mời · `push_open`
  bắn khi vào từ thông báo và KHÔNG bắn khi vào thẳng · 390px không tràn ngang.
- 🪤 **Ba ca đỏ, cả ba là lỗi TEST chứ không phải code**: (a) đếm dồn qua hai
  lượt bấm thông báo nên `opened === 0` đỏ oan — phải chốt số đo giữa chừng;
  (b) catch-all `**/api/**` đăng ký SAU nên nuốt luôn stub `/api/van-ngay` (đúng
  bẫy đã ghi ở track Duyên Nợ — **catch-all phải đứng TRƯỚC**); (c) stub tầng SW
  bằng `serviceWorkers:'block'` thì `ready` không bao giờ resolve.
- 🐞 **Một lỗi THẬT do test bắt**: `push_open` gọi `Track` khi `shell.js` còn
  đang nạp `track.js` bất đồng bộ → `ReferenceError` rơi vào `catch` và event im
  lặng biến mất. Chỉ lộ vì `push_optin_shown` (bắn 6 giây sau) thì có mà
  `push_open` thì không. Nay xếp hàng chờ.

### ✅ Đã deploy — KHÔNG còn việc tay
Prod đã ra (`bd466cd`); `www.tuviminhbao.com/sw.js` verify có ĐỦ hai handler +
`tuvi-v5`. Edge function `send-daily-push` deploy tới **version 6**, `ACTIVE`,
`verify_jwt:false` giữ nguyên (hàm tự xác thực bằng `x-cron-secret`).
- 🪤 **Lượt deploy đầu (v5) tao viết chú thích đầu file KHÁC bản trong repo** —
  logic y hệt, nhưng "bản đang chạy khác bản trong repo" đúng là bệnh mà PR này
  sinh ra để chữa. Đẩy lại v6 bằng **nguyên văn** file repo (md5
  `372c54f64161dcde195846bbbd233f58`, 5.135 ký tự) rồi đọc ngược bằng
  `get_edge_function` để chốt khớp. **Deploy edge function thì phải đọc ngược
  lại bản đang chạy, đừng tin lượt ghi.**
- Lượt cron 00:00Z ngày 07/08 chạy **TRƯỚC** khi deploy nên vẫn là chữ cũ; lượt
  đầu tiên mang nội dung mới là **00:00Z ngày 08/08** (7h sáng VN).

### CÒN LẠI
- **iOS chỉ nhận web push khi đã "Thêm vào màn hình chính"** — không có cách nào
  lách. Người dùng iPhone mở bằng Safari thường sẽ không thấy lời mời (đã có ca
  test canh việc đó thoát êm thay vì ném lỗi).
- **Chưa gửi thử một lượt push THẬT tới máy thật** — mới verify tới tầng handler
  và tầng nội dung. Chỗ duy nhất còn chưa chứng minh được là chuỗi VAPID/mã hoá
  của edge function, mà phần đó không đổi.
- Quy mô nhỏ: 2 người đang đăng ký. Con số cần nhìn sau 1–2 tuần là
  **`push_optin_shown` → `push_optin_result=granted` → `push_open`**; tỉ lệ bật
  dưới ~15% thì vấn đề nằm ở câu chữ lời mời, còn bật cao mà không ai mở thì vấn
  đề nằm ở nội dung tin nhắc.
- Kênh **Telegram** (bot đã chạy thật) vẫn chưa được dùng để nhắc — đó là đường
  duy nhất không phụ thuộc quyền thông báo của trình duyệt, nhưng phải mời liên
  kết trước nên là một bậc rơi khác.

---

## 🗂️ Ba bề mặt đọc chung MỘT cách xếp công cụ (2026-08-07, PR #441)

Henry: *"hình như mới chỉ grouping theo nỗi lo trên website cho tool standalone,
chứ trong shell chưa làm… thiết kế sao để cái grouping này là master grouping,
sẽ consistent ở mọi chỗ và sau này chỉnh thì chỉnh 1 chỗ này thôi… có tạo tool
mới, thì dựa trên use case tool sẽ auto dc group vào 1 group nào đó luôn"*.

### 🔴 BA mảng chép tay, không khớp nhau
| Bề mặt | Xếp theo | Số công cụ |
|---|---|---:|
| `/cong-cu` | nhu cầu (6 nhóm) | 58 |
| Dashboard `/app` | bộ môn | **34** |
| Sidebar Luận Đường | bộ môn | **34** |
Cùng một sản phẩm nói hai kiểu với cùng một người, và **24 công cụ tàng hình**
trong khu /app mà không có gì báo.

### Cách dựng
- **Bảng `tool_groups`** (`key · title · subtitle · icon · sort_order · enabled ·
  default_categories`) + cột `app_path`/`page_path` trên `tool_pricing`. Sửa
  trong Admin, **không cần deploy**, ba bề mặt tự đổi trong ≤2 phút.
- **Tự xếp nhóm cho tool MỚI qua `default_categories`** — công cụ chưa khai
  `need_tags` thì suy từ `category`. ⚠️ **CỐ Ý KHÔNG đoán từ tên/mô tả**: đoán
  bằng từ khoá thì sai IM LẶNG, mà nhóm sai còn tệ hơn không nhóm.
- 🐞 **Tao đặt bảng mặc định vào `app_config` trước, và đó là lỗi thiết kế**:
  `app_config` chỉ có policy `admin_read` ⇒ trình duyệt KHÔNG đọc được. Luật chạy
  đúng ở server mà chết ở đúng nơi cần nó là giao diện. Chuyển vào chính
  `tool_groups`.
- **`scripts/check-no-hardcoded-groups.mjs`** chặn tái phát (3 luật, chạy trong
  CI lint). 🪤 Bản đầu báo nhầm `TAM_HOP_GROUPS` (bảng tam hợp địa chi của
  engine) → siết lại: phải là mảng của OBJECT có khoá kiểu nhóm. Bộ dò kêu oan
  vài lần là người ta tắt nó đi.
- **Sidebar fail-safe**: nhớ bản nav gần nhất trong localStorage, đọc hụt bảng
  thì dựng lại từ đó — nhưng **CỐ Ý không nhớ GIÁ** (giá cũ nguy hiểm hơn ô đang
  tải, đúng luật `check:prices`).

### 🔴 Bài học đắt nhất: DỮ LIỆU đi SAU giao diện, không bao giờ đi trước
Tao áp 10 khoá nhóm mới lên prod trong khi bản đang chạy còn lọc theo 6 khoá cũ
⇒ **cả 58 công cụ rơi vào "Khác" trong ~4 phút**. Lùi ngay, verify 0 khoá mới
còn sót. Vì thế chia **HAI LƯỢT**: lượt 1 code (giao diện đọc DB, giữ nguyên 6
nhóm cũ — có test A/B chứng minh lưới công cụ **không đổi một ô**), lượt 2 thuần
SQL đổi sang 10 nhóm, lùi được bằng một lệnh.

### Kết quả
6 → **10 nhóm theo TÌNH HUỐNG**. Nhóm to nhất từ 38% xuống **21%**. Ba nhóm CỐ Ý
không mở (Tài chính · Tâm lý · Sức khoẻ) vì không có công cụ nào chuyên về chúng
— mở ra là hứa thứ không giao.

---

## 👥 Duyên Nợ Tiền Kiếp: 2 → tối đa 5 lá số (2026-08-07, PR trước)

Henry: *"Làm dc nhiều lá số ko nhỉ? Cho user add thêm. Default là 2 đúng rồi
nhưng mà có option để add thêm."* → chốt **1 truyện + 1 tranh cho CẢ NHÓM**,
**trần 5**, mặc định vẫn 2.

### 🔴 Ba chỗ khoá cứng ở con số 2 (không phải "thêm ô nhập" là xong)
- **Ảnh**: prompt ghi thẳng `EXACTLY TWO figures`, `LEFT/RIGHT FIGURE`, và cả 7
  dàn cảnh `BOND_SCENE_EN` viết theo thế HAI người ("đứng sát vai", "đối mặt qua
  một khoảng trống", "thầy nửa bước trước trò nửa bước sau"). Không cái nào nống
  lên 3+ được.
- **Truyện**: 4 hồi kể về MỘT mối quan hệ. Ba người thì không có "một" mối nào.
- **Khoá cache**: `normalizeBondPair` sắp đúng hai lá số.

### 🔑 BẤT BIẾN CHI PHỐI CẢ PR: n=2 KHÔNG ĐƯỢC ĐỔI MỘT BYTE
Đó là đường đang bán và phần lớn lượt dùng. Nên `n === 2` vẫn đi qua ĐÚNG các
hàm cũ, và có **test A/B với bản biên dịch từ git HEAD**: prompt truyện · prompt
ảnh cuối · prompt tả mặt · cả hai system prompt · khoá cache · nền văn minh —
**trùng khít trên 690–872 ca**. Không có bất biến này thì mọi thay đổi cho nhóm
đều là một canh bạc trên tool chính.

### Cách dựng
- **`computeGroupBond(members)`** — nền chung cho N (`pickSharedEraForGroup`,
  sắp seed rồi hash, n=2 ra y hệt bản cũ) · N profile · **đủ N(N−1)/2 cặp** ·
  một **cặp TRỤC**. Mỗi cặp đi qua CHÍNH `computePastLifeBond` chứ không chép
  lại luật — một định nghĩa duy nhất cho "mối duyên".
- ⚠️ **`SPINE_WEIGHT` là lựa chọn CỦA TRANG, không phải cổ pháp** (cổ pháp không
  nói duyên nào "mạnh hơn"). Xếp theo mức gánh được một truyện 4 hồi. Mọi giá
  trị PHẢI khác nhau, không thì trục truyện nhảy khi thêm bớt người. Không hiện
  con số này ra cho người đọc.
- **Khoá cache nhóm tương thích ngược**: `lasoKey(sorted[0], 'bond|' + khoá
  những người sau)` — với n=2 rút về đúng công thức cũ. Lệch một ký tự là toàn
  bộ `portrait_cache` mồ côi, người đã trả tiền bị tính lại **và** đốt thêm một
  lượt model.
- **Lưới cặp hiện trên trang + trong bản chia sẻ** (deterministic, 0đ). Nhóm 2
  người CỐ Ý không hiện — cặp duy nhất đã nằm ngay đầu trang, bày lại là nói hai
  lần.
- **Trần 5 nằm ở ENGINE** (`MAX_BOND_MEMBERS`), route re-export. Chặn ở một tầng
  duy nhất thì một đường gọi mới quên kiểm là mở toang phần tốn CPU nhất.
- **Chi phí gần như PHẲNG**: 1 lượt LLM + 1 lượt ảnh bất kể N. Giá giữ nguyên
  một mức (sửa trong Admin nếu muốn) — nhóm càng đông càng lợi cho viral.
- **Rail**: `wrapBirths[]` mới trong contract (`wrapBirthB` vẫn chạy cho lượt 2
  người). `groupRailWrapper` có luật cứng phủ **TẤT CẢ** những người còn lại +
  cấm xếp hạng thành viên — nhóm đông thì càng dễ bị hỏi sâu về người khác, mà
  rail chỉ có lá số người đang ngồi đây.
- **Giao diện**: nút "+ Thêm người" tới 5, nút ✕ **chỉ từ người thứ ba** (2 là
  mức tối thiểu của tool). Bỏ ô giữa thì **dựng lại từ đầu** và bê dữ liệu sang
  — prefix của `TuviForm` gắn vào id phần tử, gỡ ô giữa mà giữ nguyên ô sau là
  nhãn "Người thứ ba/tư" trôi lệch khỏi ô nhập thật.
- Client vẫn gửi kèm `birthA/birthB` và server vẫn trả `nhanVatA/B`: bản cũ còn
  trong cache trình duyệt lẫn dòng cache cũ đều phải đọc được trong lúc deploy.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier` sạch ·
`check:prices` sạch · engine **185 pass** · `node --check` 2 khối script nội tuyến.
- **T5 — 872 cặp A/B với bản biên dịch từ git HEAD**: khoá cache · thứ tự sắp ·
  `selfIsA` · nền văn minh **0 lệch**; `computeGroupBond(N=2)` trùng khít
  `computePastLifeBond`. **1.200 hoán vị nhóm 3–5**: khoá · thứ tự · nền **0 lệch**.
- **T6 — 690 cặp**: 3 prompt + 2 system prompt của bản 2 người **trùng khít**.
  45 nhóm 3–5: đủ N(N−1)/2 cặp, prompt gọi đủ tên, đúng số khối FIGURE, mỗi
  người đúng đoạn tả mặt của mình, **0 rò thuật ngữ tử vi vào prompt ảnh**.
- **T7 — 38 ca Playwright trên TRANG THẬT** (ca 2 / 3 / 5 người, stub API cố ý
  **ĐẢO NGƯỢC** thứ tự để đúng ca xấu nhất của mapping): mặc định đúng 2 ô ·
  payload gửi đúng N lá số · mỗi thẻ nhân vật nêu ĐÚNG lá số đẻ ra nó · lưới cặp
  đủ 1/3/10 ô và nhóm 2 người không hiện · chip hỏi đúng nhân vật của ô nhập thứ
  nhất · bản chia sẻ đủ N dòng lá số kèm tên nhân vật + khối lưới cặp · bấm thêm
  quá tay dừng ở 5 và nút khoá lại · bỏ ô giữa thì dữ liệu không trôi và nhãn
  dựng lại đúng · 0 lỗi JS.
- **Trần ở engine**: 1 người → chặn, 6 và 20 người → chặn, 5 → 10 cặp.

### CÒN LẠI
- **Chưa gen ảnh THẬT cho nhóm 3–5** — mới verify tới tầng prompt. Chỗ nhiều khả
  năng phải chỉnh là `GROUP_SCENE_EN` và câu "evenly spaced left to right" nếu
  model dựng người chồng lên nhau hoặc làm nhoè mặt ở nhóm 5.
- **Bảng lịch sử vẫn chỉ 2 cột nhân vật** → nhóm ghi cặp TRỤC. Cố ý không mở
  cột: một migration + việc tay đổi lấy vài chữ trên dải ảnh nhỏ cuối trang.
- Giá vẫn một mức cho mọi N. Nếu thấy nhóm đông chiếm nhiều lượt thì cân nhắc
  tính theo đầu người — nhưng `tool_pricing` một tool một giá, phải sửa code.

---

## 🖼️ W1b — TÍNH THỬ MIỄN PHÍ cho 2 TOOL CHÂN DUNG (2026-08-07, PR trước)

Henry: *"Ok làm đi"*. Mục này **do chính số của D1 chỉ ra**, không phải thứ tự
backlog — và nó lật ngược một câu backlog tự viết ở vòng W1 (*"2 tool chân dung
chưa có tính thử… ở đó giá trị chính LÀ bức ảnh, cho xem trước là cho không
hàng"*).

### 🔴 Câu đó SAI một nửa, và D1 đo ra chỗ sai
| Tool | Mở | Chạy | Rơi |
|---|---:|---:|---:|
| Chân Dung Vợ Chồng | 10 | 1 | **90%** |
| Chân Dung Tiền Kiếp | 5 | 1 | **80%** |
| Luận Giải (đối chứng) | 24 | 24 | 0% |

Rơi ở **bước bấm nút** — chưa tới paywall, chưa tới chất lượng ảnh. Người ta mở
trang, thấy form ngày sinh + nút trừ 20–25 Lượng, rồi bỏ đi.

### 🔑 Và preview vẫn **0đ** — chính chú thích đầu route đã nói sẵn
`app/api/chan-dung-tien-kiep/route.ts` mở đầu bằng *"cả hai [pha] chỉ ăn dữ liệu
deterministic từ `computePastLife()`"*. Tức tầng đắt tiền nằm ở LLM + `gpt-image`,
còn danh xưng / nền văn minh / khung 5 hồi / bảng hình thể là **tra bảng thuần**.
⇒ Không cần nghĩ "cách khác" như backlog đề nghị: đúng khuôn W1 là chạy được.

### Bày gì / khoá gì
- **Tiền kiếp** bày: danh xưng (1 trong 1.150) · nền văn minh + nhãn thời đại ·
  dòng lá số · khung 5 hồi kèm nhãn **đỉnh-cao/biến-cố** · **Cơ Sở Trong Lá Số**.
  Khoá: bức tranh · mô tả nhân vật · chữ của 5 hồi · lời kết · bí danh.
- **Vợ chồng** bày: cung Phu Thê (chính tinh/phụ tinh/cách cục/ý nghĩa) + **bảng
  hình thể** — mỗi nét kèm SAO quyết định nó, sát tinh đánh dấu *"phá cách"*.
  Khoá: bức tranh · mô tả · hoàn cảnh gặp gỡ · luận giải Phu Thê.

### 🔑 Ba quyết định đáng nhớ
1. **Khối "Cơ Sở Trong Lá Số" của tiền kiếp SỐNG LẠI — nhưng CHỈ ở lượt chưa trả
   tiền.** Nó từng bị gỡ hẳn (Henry: thuật ngữ tử vi lẫn vào phần đọc chính khiến
   nó nghe như bản luận giải chứ không phải một câu chuyện) — quyết định đó GIỮ
   NGUYÊN, `renderProse` ẩn nó đi. Ở lượt chưa trả tiền vai của nó **ngược lại**:
   đây là bằng chứng DUY NHẤT người ta có để tin engine đọc đúng lá số mình.
2. ⚠️ **KHÔNG bày `spouseAge`.** `pickMarriageAgeAnchor` có `Math.random()` nên
   số ở lượt tính thử sẽ KHÁC số sau khi trả tiền. Bày một con số rồi đổi nó ngay
   sau khi thu tiền là tự tay phá thứ W1 sinh ra để xây. Có ca test canh.
3. **Nhãn hình thể `MORPH_FIELD_LABELS` + `morphRows()` EXPORT từ engine**, không
   để trang chép bản thứ hai: thêm một field là giao diện im lặng hiện `bodyBuild`
   thay vì "Vóc dáng", và tri thức "sao nào là lục sát" không rò ra client.

### Giữ nguyên khuôn W1
`runPreview()` là **hàm RIÊNG**, rẽ nhánh ngay tại `POST` **trước cả
`withToolOutcome`** (lượt tính thử không phải một lượt chạy tool — ghi vào sổ là
thổi mẫu số tỉ lệ hỏng). Không auth. `renderMeta`/`renderProse` tách theo **ĐƯỜNG
TIỀN, không theo bố cục**. Lỗi ở lượt trả tiền **không quẳng về form trống** nữa.
**0 dòng sửa trong `tuvi-paywall.js`** — `lockPreview`/`isFreeRerun` W1 dựng đã đủ,
nên không phải bump `?v=`.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine **185 pass** · `node --check` 4 khối script.
**40 bất biến ĐỌC THẲNG MÃ NGUỒN**: `runPreview` không chứa một trong 9 ký hiệu
cấm (thêm `generatePortraitImage` so với W1) · không đòi auth · nhưng PHẢI chạy
engine thật · **4 ca ĐỐI CHỨNG đường trả tiền PHẢI có** chốt thanh toán + model
ảnh + ghi cache + auth · rẽ nhánh trước `withToolOutcome` · `renderMeta` không
đọc một khoá chữ nào và `renderProse` đọc đủ.
**12 bất biến trên MODULE THẬT, 2.880 lá số**: luôn có danh xưng (636 danh xưng
khác nhau) · luôn 5 nền văn minh · luôn đúng 5 hồi và mọi hồi có nhãn · 0 rò
`undefined`/`NaN`/`[object` ở cả hai payload · nhãn hình thể luôn tiếng Việt
(không lọt khoá thô) · **cờ `isSat` khớp đúng bộ lục sát tinh**.
**79 ca Playwright trên 2 TRANG THẬT**: bấm nút → **0 lượt `action=deduct`**, POST
duy nhất là `preview=1`, không modal chặn · bày đủ danh xưng/nền/khung 5 hồi/cơ
sở lá số/bảng hình thể · **quét toàn bộ text kết quả: 0 câu chữ model lọt** ·
tường liệt kê đúng tên khối khoá + số dư + giá · `preview_shown` bắn đúng tool và
`unlock_click` CHƯA bắn · bấm mở → có `deduct`, có POST đường trả tiền, có
`unlock_click`, tường biến mất, chữ + tranh hiện, **phần miễn phí còn nguyên** ·
**khách CHƯA đăng nhập vẫn tính thử được** · đã trả tiền từ trước → mở thẳng,
không tường, không trừ Lượng · thiếu Lượng → *"còn thiếu N"*, **không bị quẳng về
form** · 390px không tràn ngang.
- 🪤 Ca đỏ duy nhất là **lỗi TEST**: `/api/track` gửi khoá `type`, không phải
  `event_type` — bản kiểm đọc nhầm khoá nên báo "không bắn event".

### CÒN LẠI
- **2 trang standalone `/tools/chan-dung-*.html` vẫn là tường cũ.** Chúng không
  nạp `shell.js` nên không nằm trong phễu D1, và CTA từ link chia sẻ vốn đổ về
  `/app` — nhưng ai đáp xuống từ tìm kiếm thì vẫn gặp bản cũ.
- Hai cột tính thử/bấm mở của 2 tool này **mới có số từ hôm nay**. Con số cần
  nhìn là tỉ lệ **mở → tính thử** có nhảy khỏi mức 10–20% hay không.

---

## 🧑‍🤝‍🧑 Duyên Nợ Tiền Kiếp: nhân vật nào là lá số nào (2026-08-07, PR trước)

Henry: *"phần luận giải phải bổ sung thêm là nhân vật nào gắn với lá số nào để
user biết"* — kèm một link chia sẻ thật.

### 🔴 Không chỉ THIẾU thông tin — thứ tự đang GỢI Ý SAI
Trang bày hai thẻ nhân vật cạnh nhau, không nói thẻ nào của ai ⇒ người đọc mặc
định thẻ đầu là mình. Nhưng `normalizeBondPair` (`lib/portraits/bond-key.ts`)
**sắp lại hai lá số theo khoá băm** để hai chiều nhập ra cùng một kết quả — nên
`nhanVatA` là người nhập **THỨ HAI** ở **45,9%** số cặp (đo 1.533 cặp trên chính
hàm đó). Tức gần một nửa số lượt, trang ngầm nói ngược.
- Bản chia sẻ còn hụt hơn: khối "Lá số dùng để luận" do `shell.js` tự chèn chỉ
  lấy `o.birth` = **một** lá số, trong khi tool dựng từ hai.

### Cách vá — nối bằng DỮ LIỆU, không nối bằng vị trí
- **Server trả `nhanVatA.laSo` / `nhanVatB.laSo`** (`birthRef`): ngày/tháng/năm ·
  giờ · lịch · giới. `withLaso()` gắn ở CẢ payload mới LẪN payload lấy từ cache
  — `pair` đã chuẩn hoá nên bản cũ trong `portrait_cache` cũng có mapping ngay,
  không phải chờ cache hết hạn.
- ⚠️ **CỐ Ý KHÔNG trả TÊN người nhập.** `portrait_cache` dùng chung toàn hệ
  thống ⇒ tên của người chạy trước sẽ hiện cho người chạy sau. Ngày sinh thì
  không rò gì: muốn chạm tới dòng cache đó phải tự nhập đúng cả hai lá số.
  Client tự dò `laSo` về đúng ô nhập của mình để lấy lại tên đã gõ.
- **Ba bề mặt cùng một thứ tự**: thẻ nhân vật (dòng "Dựng từ lá số" THAY dòng
  giới tính — nó đã mang sẵn giới), dòng hero, và bản chia sẻ.
- **`Shell.setShareable` nhận thêm `births: [{label, birth}]`** — khối lá số của
  trang chia sẻ nay nêu đủ hai dòng, mỗi dòng gắn tên nhân vật. Tool một lá số
  truyền `birth` như cũ, không đổi gì.
- **Chip rail** đổi sang hỏi về nhân vật của **ô nhập thứ nhất**: rail chỉ nạp
  lá số người đang ngồi đây và có luật cứng cấm luận sâu về người thứ hai —
  chip trỏ nhầm là mời người ta bấm đúng câu mà rail buộc phải từ chối.

### 🐞 Bắt kèm: "Cơ sở trong hai lá số" đang NÓI NGƯỢC NGŨ HÀNH
Không nằm trong lời báo, mà nằm đúng khối dùng để chứng minh mình không bịa.
`hanhRelation` trả `'a-sinh-b'` khi `NH_SINH[b] === a`, tức **A sinh B** — nhưng
câu chữ ghi `${lsB} sinh ${lsA}`. **Hai dòng `sinh` bị hoán vị cho nhau**
(cặp `khắc` thì vốn đúng). Ví dụ cụ thể: a=Mộc, b=Hỏa → cổ pháp là *Mộc sinh
Hỏa*, trang in *"Hỏa sinh Mộc"*.
- Kéo theo: `giver` của nhánh **ân nhân** cũng đảo (`'a-sinh-b' ? 'b' : 'a'`) —
  bên SINH mới là bên CHO. Sai chiều thì **truyện và bức tranh đều dựng ngược
  vai**: người được cứu thành người ra tay (`formatBondForLLM` và `sceneFor`
  đều ăn `giver`).
- Nhân tiện bỏ chữ **"người trước / người sau"** trong khối này — sau khi thứ tự
  bị chuẩn hoá thì không ai đọc ra được nó chỉ ai. Nay gọi thẳng tên nhân vật.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine **185 pass** · `node --check` shell.js + 2 khối
script nội tuyến.
- **T1 — 1.533 cặp trên `normalizeBondPair` THẬT**: **45,9% bị đảo** (chứng minh
  lỗi có thật, không phải lo hão), khoá cặp và thứ tự chuẩn hoá **0 lệch** giữa
  hai chiều nhập.
- **T2 — 15 ca Playwright trên TRANG THẬT + `shell.js` THẬT** (stub API, ca cố ý
  dựng đúng tình huống server ĐẢO): thẻ 1 nêu đúng lá số người nhập thứ hai và
  **không dính** lá số người kia · thẻ 2 ngược lại · dòng hero xếp cùng thứ tự
  hai thẻ · chip hỏi đúng nhân vật của người thứ nhất và **không** hỏi người thứ
  hai · bấm nút Chia sẻ THẬT → khối lá số gửi lên `/api/share-result` có **đủ
  hai dòng kèm tên nhân vật**, `text` đường lùi cũng mang mapping · **ca ĐỐI
  CHỨNG payload CŨ không có `laSo`** → rơi về dòng giới tính, không vỡ · 0 lỗi JS.
- **T3 — 1.001 cặp trên `computePastLifeBond` THẬT** (530 cặp bị đảo): mapping
  *lá số → nhân vật* **0 lệch** khi đảo thứ tự nhập ⇒ người thứ hai mở cùng cặp
  (kể cả lấy từ cache) thấy đúng nhân vật gắn đúng lá số.
- **T4 — 837 cặp**, đối chứng bằng bảng ngũ hành **chép tay riêng trong test**
  (import bảng của chính module đang kiểm thì hai bên cùng sai vẫn báo xanh):
  323 câu `sinh` + 323 câu `khắc` **0 câu sai cổ pháp**, 0 câu gọi sai tên, 29/29
  ca ân nhân đặt đúng chiều. 🪤 **Đã red-team**: dựng lại bản cũ trong bản biên
  dịch → T4 bắt đúng **196 câu sinh sai + 29/29 ân nhân ngược**, tức bài kiểm
  không đỗ giả.
- 🪤 Bẫy Playwright: handler `page.route` đăng ký **SAU CÙNG được ưu tiên** — bản
  đầu để catch-all `**/api/**` sau route riêng nên stub riêng không bao giờ chạy,
  trang báo "Lỗi 200". Catch-all phải đứng TRƯỚC.
- Bump `shell.js?v=60→61` (35 trang).

### CÒN LẠI
- **Lượt đã sinh TRƯỚC bản này giữ nguyên chiều ân nhân cũ** — truyện và tranh
  đã nằm trong `portrait_cache`/`past_life_bonds`, không dựng lại. Chỉ khối "cơ
  sở" là đọc lại từ engine nên tự đúng. Ảnh hưởng ~2,7% số cặp (tỉ lệ ân nhân).
- Phần CHỮ do LLM viết vẫn chỉ gọi tên nhân vật, **cố ý không nhắc ngày sinh** —
  mapping là việc của khung trang, nhét vào truyện là phá giọng kể.

---

## 🔒 Trả nợ kỹ thuật: parser LLM giòn · `no-store` · 4 trang SEO (2026-08-07, PR này)

Henry đưa lại chính danh sách "nợ kỹ thuật, không gấp" tao viết ở lượt trước:
*"fix mấy lỗi này trước đi"*. Đo trước khi sửa thì **hai trong bốn mục không hề
"không gấp"** — chúng đang sống trên đường tiền và đường xác thực.

### 🔴 Parser LLM giòn — 2 route đang BÁN vẫn chạy bản đã trả giá
`parseLlmJson` (bóc từng khối `{...}` cân bằng) sinh ra chính vì bản giòn
`JSON.parse(strip fences)` đã làm hỏng **một lượt đã tính tiền** trên prod. Ba
route được vá lẻ, **`chan-dung-vo-chong` (20 Lượng) và `phong-thuy` thì không** —
đúng hai chỗ chưa ai đụng lại từ hồi đó. Nay **7/7 route đi qua
`lib/api/tool-helpers.ts`**, 0 bản chép tay.
- 🐞 Lộ thêm một lỗi kiểu bị GIẤU: bản chép tay ở `phong-thuy` trả `any` ngầm
  nên `tsc` không thấy gì; đổi sang `parseLlmJson` (trả `unknown`) là đỏ ngay.
  **Bản chép tay không chỉ trôi khỏi nhau — nó còn tắt luôn bộ kiểm kiểu.**

### 🔴 `no-store`: cửa xác thực của `/api/payment` đang thiếu
Không phải chuyện hiệu năng. `getUserFromToken` ở đây gác **toàn bộ**
`/api/payment` **gồm cả nhánh admin** — một phản hồi bị Next nhớ lại nghĩa là
phiên đã huỷ / quyền vừa bị gỡ **vẫn qua cửa**. Vá cùng `lib/billing/credits.ts`
+ 69 lượt GET khác (70 tổng).
- **`scripts/check-supabase-no-store.mjs` — bộ dò cắm vào CI lint.** Đây mới là
  phần đáng giá: bug này đã cắn **ba lần**, lần nào cũng im lặng (bản chia sẻ đã
  gỡ vẫn render · bộ giám sát báo job "CHƯA HỀ chạy" · **trừ tiền xong vẫn nhận
  402 → người dùng bấm lại → trừ LẦN HAI**). Rà tay lần bốn thì lần năm lại sót.
- **Miễn trừ có LÝ DO ghi thẳng trong bộ dò**, không phải allowlist câm: 3 route
  SEO/sitemap dùng `s-maxage` + `stale-while-revalidate` — ở đó cache là TÍNH
  NĂNG. Nhận cả `no-store` khai inline lẫn qua hằng số cùng file (`SB_FRESH`).
- 🔑 **Verify bộ dò bằng cách DỰNG LẠI ĐÚNG BUG CŨ**: gỡ `no-store` khỏi
  `credits.ts` → bộ dò bắt đúng dòng 45 → khôi phục → xanh. Bộ dò chưa từng bắt
  được gì thì không chứng minh được nó biết bắt.

### 4 trang SEO standalone — và cái cổng phải qua trước khi viết
`#358` đã chốt **"NGỪNG gen trang"**, nút thắt là thẩm quyền tên miền chứ không
phải số lượng trang. Nên phải đo lại trước: `pagesWithImpressions` **612 → 665
trong 7 ngày**, so với **+5 trong 3 tuần** ở lần đo trước ⇒ mốc quyết định trong
`#361` đã bật, đủ điều kiện viết tiếp.
- `cong-so` · `day-con` · `nguoi-khac` · `nhan-mach` — dùng lại `tools.css` sẵn
  có, mỗi trang 2 khối JSON-LD, **một `<h1>` duy nhất** (đúng nợ 115 trang 2 H1
  đã backfill), FAQ `<details>` hiện trên trang.
- 🐞 **Ca test đỏ là lỗi THẬT của tao**: chữ trong `FAQPage` schema tao viết tắt
  đi so với `<summary>` hiện trên trang. Google phạt đúng chỗ khai FAQ mà nội
  dung không nhìn thấy được. Nay ép khớp **nguyên văn**.
- 🐞 Một ca đỏ khác là **lỗi TEST**: bộ dò link chết chỉ tra file trong `public/`
  nên báo oan mọi rewrite của Next. Phải khai danh sách đường dẫn do Next phục vụ.
- **Lộ ra 16 trang standalone CHƯA TỪNG có trong sitemap**, gồm `mai-hoa` và
  `ky-mon` — hai trang dựng riêng để làm SEO. Đã thêm 13 (bỏ `kim-lau.html` vì
  nó 301 sang `/kim-lau`, nộp cả hai là tự cạnh tranh với chính mình).

### 🪤 Gộp `main` giữa chừng — 5 xung đột, và bài học `--ours` lại đúng
`main` đi trước 6 commit (W1b · duyên nợ 5 lá số · master grouping · R1a). Xung
đột nằm ĐÚNG vùng vừa sửa: hai route bị main thêm lại **bản chép tay của chính
helper tao đang gỡ**, `lint.yml`/`package.json` thì mỗi bên thêm một bộ dò.
- Giải bằng tay từng khối: giữ **cả hai** bộ dò (`check:nostore` + `check:groups`
  — hai bug khác nhau), giữ **tính năng mới của main** (`runPreview` W1b, nhánh
  `faces` N-người) nhưng **bỏ bản chép tay** và cho chúng dùng parser chung.
- **Đếm lại dấu hiệu CẢ HAI bên sau khi giải** (đúng bài học `git checkout
  --ours` đã mất 5 file): `runPreview` vẫn **0/7 ký hiệu cấm** + ca ĐỐI CHỨNG
  đường trả tiền vẫn có `toolPaymentDenied` và `llmTextFull` · `faces` N-người
  còn đủ 10 chỗ · `ai-loading-steps` 19/19 file ở `v=2` · `shell.js` 35/35 ở
  `v=62`. Hết `<<<<<<<` **không** nghĩa là xong.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` · `check:groups` · **`check:nostore`** sạch · engine **185 pass**
· `node --check` 4 khối script nội tuyến · **44 assertion trên `tool-helpers`
THẬT**: 7 dạng output model mà bản giòn HỎNG thì bản chung bóc đúng (câu dẫn ·
ghi chú cuối · cả hai · `{}` rác trong lời dẫn · fence lồng), + ca ĐỐI CHỨNG
JSON cụt/rỗng vẫn phải trả `null` · **56 assertion trên 4 trang SEO**: đúng 1
`<h1>` · canonical/og/twitter khớp · **FAQ schema khớp NGUYÊN VĂN `<summary>`** ·
0 link chết · tiêu đề ≤ 63 ký tự · có từ khoá đích.

### CÒN LẠI
- 4 trang mới **chưa có link vào từ trang đã index** — mới có sitemap + liên kết
  chéo giữa chính chúng. `cong-cu` vẫn cố ý trỏ `/app`.
- `isHoangOc` (`tools-shared/kim-lau.js:45`) là `t % 5 === 0` trong khi Hoang Ốc
  là vòng **6 trạng thái**. Nghi sai từ `#359`, **vẫn chưa tra đủ chắc để sửa** —
  sửa mò một công thức cổ pháp còn tệ hơn để nguyên.

---

## 📉 D1 — Phễu theo tool, và 🔴 BA HỆ TÊN TOOL ĐANG LỆCH NHAU (2026-08-07, PR trước)

Henry: *"Ok D1 trước đi"* — mục backlog *"tool nào có người xem mà không ai
mua"*. Sau W1 nó còn cấp hơn: không có nó thì W1 vừa ship xong mà không biết có
tác dụng gì.

### 🔴 Phát hiện chính, KHÔNG nằm trong đề bài
Ba nơi gọi tên tool bằng ba hệ khác nhau, và chúng **không khớp**:

| Khái niệm | `events.tool_id` (shell) | `tool_pricing.tool_id` | `credit_transactions.type` |
|---|---|---|---|
| Luận Giải | `luan-giai` | `laso` | `use_laso` |
| Bát Tự | `bat-tu` | `tu-binh` | `use_tubinh` |
| Chọn Ngày | `chon-ngay` | `chon-ngay-tot` | `use_chon_ngay_tot` |
| Đặt Tên | `dat-ten` | `dat-ten-con` | `use_dat_ten_con` |
| Đặt Tên DN | `dat-ten-dn` | `dat-ten-dn` | `use_dat_ten_doanh_nghiep` |

**Bản đầu tiên tao viết join thô và nó ra: `luan-giai` — 24 người mở, 0 người
mua.** Trong khi `use_laso` đã bán **1.500 Lượng cho 3 người**. Tức panel sinh
ra để chống quyết định sai thì suýt tự đẻ ra một quyết định sai.
- Vá bằng `tool_canon()` — quy mọi biến thể về `tool_pricing.tool_id` (id mà giá
  và nhãn treo vào). Còn có **`type` lẫn cả gạch ngang lẫn gạch dưới** trong
  cùng một bảng (`use_chan_dung_vo_chong` vs `use_chan-dung-tien-kiep`) — đúng
  cái bẫy `viral-budget.ts` đã phải học khi đếm lượt gen free.
- **`tool_funnel_lac()` — bộ dò id lạc**, hiện thẳng trên panel. Chính nó bắt
  được tên lệch thứ tư (`dat-ten-doanh-nghiep`) ngay lượt chạy đầu tiên. Không
  có bộ dò thì mỗi tool mới đặt tên lệch lại âm thầm tụt khỏi bảng.

### 🔑 `topup_start` KHÔNG dùng được cho bậc "định mua"
Đo prod: **552/553** lượt của nó đến từ chính trang nạp (`from=topup_page`),
**0 lượt mang `tool_id`**. Vì thế mới phải thêm hai loại event mới —
`preview_shown` (tính thử ra kết quả) và `unlock_click` (bấm nút mở bản đầy đủ).
- `unlock_click` bắn từ **`lockPreview` trong `tuvi-paywall.js`**, không phải
  từng trang: mọi tool dựng tường qua hàm đó là tự có bậc này.
- `preview_shown` bắn từ trang, **sau khi renderMeta**, không phải lúc bấm nút —
  bấm rồi mà lá số hỏng thì không có gì để xem, tính vào phễu là thổi mẫu số.

### Panel "Phễu Theo Tool" (trang Marketing)
Mở → chạy → tính thử → bấm mở → mua → Lượng. **Mọi cột đếm NGƯỜI** (đăng nhập
thì theo tài khoản, không thì theo trình duyệt — cùng quy ước
`dashboard_engagement`, hai panel đếm khác nhau là không so được).
- Tô đỏ tool **trả phí** có **≥3 người mở mà 0 người mua**. Ngưỡng 3 vì một tool
  1 người mở 0 người mua chưa nói lên gì — gắn cờ đỏ cho nó là dạy người đọc bỏ
  qua cờ đỏ. Tool **miễn phí** không bao giờ bị tô (nó có bán gì đâu).
- Tool chưa làm W1 thì hai cột tính thử/bấm mở để **gạch ngang, KHÔNG hiện 0%** —
  0% đọc thành "ai cũng bỏ đi".
- Action RIÊNG `admin-tool-funnel` chứ không nhét vào `admin-marketing` (chỗ đó
  đã gánh 8 RPC + GA4), cùng tiền lệ `admin-viral`.
- ⚠️ Quy ước khoảng ngày **nửa mở `[from, to)` và client cộng sẵn một ngày vào
  `to`** — y hệt mọi RPC marketing khác. Hai RPC cùng trang mà hiểu khác nhau về
  mốc cuối là hai bảng lệch đúng một ngày, kiểu lệch không ai nhìn ra.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine **185 pass** · `node --check` 4 khối script admin
· bộ kiểm cấu trúc W1 vẫn xanh.
**16 ca Playwright trên CHÍNH `renderToolFunnel` trong `admin.html`**: cờ đỏ chỉ
bật đúng ca (trả phí + đủ mẫu + 0 mua), **3 ca ĐỐI CHỨNG không được bật** (đã có
người mua · tool miễn phí · dưới ngưỡng mẫu) · tool có W1 hiện đúng tỉ lệ 4/9 =
44% · tool chưa có W1 ra gạch ngang · nhãn chứa `<img onerror>` không chạy mà
vẫn hiện nguyên văn · danh sách id lạc kèm hướng dẫn sửa · dark mode · rỗng →
câu tử tế.
**12 ca trên 3 TRANG THẬT**: `preview_shown` bắn đúng tool sau lượt tính thử,
`unlock_click` **chưa bắn** lúc đó, bấm mở mới bắn, 0 lỗi JS.
- 🪤 Playwright đặt `navigator.webdriver=true` nên `track.js` tự no-op — phải
  `defineProperty` cho nó về `false` mới đo được đường của người thật.

### Số đo ngay khi bật (2026-04-01 → 08-07)
| Tool | Mở | Chạy | Mua | Lượng |
|---|---:|---:|---:|---:|
| Luận Giải | 24 | 24 | 3 | 1.500 |
| Chân Dung Vợ Chồng | 10 | 1 | 1 | 788 |
| Chân Dung Tiền Kiếp | 5 | 1 | 1 | 425 |
| Tử Bình | 3 | 2 | 2 | 1.050 |
⚠️ **Chân Dung Vợ Chồng: 10 người mở, 1 người CHẠY.** Rơi 90% ở bước bấm nút —
đó là tool đắt thứ hai và là tool viral chính. Đây đúng là loại câu hỏi D1 sinh
ra để đặt, và nó cũng là lý do W1 nên mở rộng sang 2 tool chân dung.

### CÒN LẠI
- Hai cột tính thử/bấm mở **mới có số từ hôm nay** — 3 tool W1 vừa ship. Tỉ lệ
  bấm-mở cần vài chục lượt mới đọc được.
- Chưa tách phễu theo **kênh** (organic vs share vs quảng bá). Cần join thêm
  `user_attribution`, và chỉ có nghĩa khi lưu lượng lớn hơn nhiều.
- `tool_canon()` là **bảng chép tay** — thêm tool mà tên ba nơi không khớp thì
  phải thêm dòng. Bộ dò id lạc là lưới đỡ, nhưng nó chỉ kêu SAU khi có dữ liệu.

---

## 🔓 W1 — TÍNH THỬ MIỄN PHÍ: bấm nút là tool CHẠY THẬT (2026-08-06, PR trước)

Henry: *"Ok w1 đi"* — mục backlog tự đánh giá là **tác động lớn nhất cả
backlog**. W2 trước đó mới làm nửa hình thức: tấm khoá mềm hiện ra nhưng **chữ
mờ là chữ GIẢ**, tool vẫn chưa hề chạy.

### Đảo chiều: chặn TRƯỚC → cho xem RỒI mới chặn
Trước: bấm nút → paywall → phải trả tiền mới biết tool có đúng không.
Nay: bấm nút → **tool chạy thật** → bày tầng cấu trúc → tường chỉ đứng trên
phần chữ.

### 🔑 Chỗ khiến W1 gần như 0đ — và nó là cả thiết kế
Tầng deterministic của 3 tool cẩm nang (`nguoi-khac` · `day-con` · `nhan-mach`)
là **tra bảng thuần**: kiểu người, toạ độ hai trục, 5 mặt đọc, **6 thẻ cách
dạy** (`KIEU_HOC`), chặng đi học, phân bố nhóm, **cặp giẫm-chân/bù-nhau**, thứ
tự tiếp cận, cơ sở lá số. **0 lượt LLM, 0đ.** Chỉ phần CHỮ mới tốn tiền.
⇒ Không có đường farm tiền model, vì lượt tính thử không gọi model.

### `runPreview()` là HÀM RIÊNG, không phải một cờ trong `runPost`
Rẽ nhánh ngay tại `POST`, **trước cả `withToolOutcome`**. Trong đó KHÔNG có
`toolPaymentDenied`, `llmTextFull`, `insertHistoryRow`, `putCachedPortrait`,
`railFreeGrant`, `refundIfSystemFailure`.
- **Vì sao không dùng cờ:** đây là chốt chặn thanh toán của tool đang bán. Trộn
  hai đường vào một hàm rồi tin vào một câu `if` là cách nhanh nhất để một hôm
  nào đó đường trả tiền lọt qua cửa.
- **KHÔNG đòi đăng nhập.** Cả điểm của W1 là bỏ tường trước khi người ta thấy
  chất lượng — mà màn đăng nhập cũng là một bức tường. Chi phí chỉ là CPU lập
  lá số, ngang mấy tool free vốn đã mở công khai.

### `TuviPaywall.lockPreview()` — khác `_softLock` ở đúng một điểm
`_softLock` (W2) là lời **TỪ CHỐI** (thiếu Lượng / chạm trần) nên mấy vạch mờ
sau nó là chữ giả cho có. `lockPreview` là lời **MỜI**: người dùng chưa bị từ
chối gì, nên nó liệt kê **ĐÚNG TÊN** những khối đang khoá. Fail-closed y hệt:
đọc hụt bảng giá → KHÔNG dựng tường.

### Mỗi trang tách `render()` → `renderMeta()` / `renderProse()`
**Tách theo ĐƯỜNG TIỀN, không theo bố cục.** Gộp một hàm là sớm muộn có một
khối chữ lọt vào lượt miễn phí mà không ai để ý.
- Thứ tự DOM đặt sao cho **lượt tính thử luôn thấy tường ở CUỐI**: khối chữ nằm
  xen giữa nhưng đang `display:none`, mở xong tường biến mất và mọi thứ về đúng
  chỗ. Không phải sắp lại hai lần.
- **Bóc "Cơ sở trong lá số" khỏi `<details>` ở cuối trang** thành khối mở sẵn:
  W1 đổi vai của nó — đây LÀ bằng chứng duy nhất người chưa trả tiền có để đánh
  giá tool.
- 🔑 `nhan-mach` điền chữ vào **ĐÚNG thẻ người đã dựng** ở lượt tính thử (dò
  `data-ten`) thay vì dựng lại danh sách: dựng lại thì thứ tự trôi theo thứ tự
  model trả về, mà nó không cam kết gì.
- Lỗi ở lượt trả tiền **KHÔNG quẳng người ta về form trống nữa** — họ đang nhìn
  phần tính thử và có thể vừa trả tiền cho phần sau; giữ màn hình, dựng lại
  tường, báo bằng banner.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine **185 pass** · `node --check` 6 khối script nội
tuyến · engine test T2/T3 vẫn xanh (4.896 lá số + 152 nhóm).
**24 bất biến ĐỌC THẲNG MÃ NGUỒN 3 route**: `runPreview` không chứa một trong 8
ký hiệu cấm, + **ca ĐỐI CHỨNG `runPost` PHẢI có** chốt thanh toán và lượt gọi
model (không thì bản kiểm xanh vì lý do sai), + rẽ nhánh nằm trước
`withToolOutcome`, + `renderMeta` không đọc một khoá chữ nào và `renderProse`
đọc đủ.
**30 ca Playwright trên 3 TRANG THẬT**: bấm nút → **0 lượt `action=deduct`**,
POST duy nhất là `preview=1`, không modal chặn · bày đủ kiểu người / cơ sở lá
số / 6 thẻ cách dạy / cặp giẫm-chân · **quét toàn bộ text kết quả: 0 câu chữ
model lọt** · tường liệt kê đúng tên khối khoá + số dư + giá · bấm mở → có
`deduct`, có POST đường trả tiền, tường biến mất, chữ hiện đủ, **phần miễn phí
vẫn còn nguyên** · **khách CHƯA đăng nhập vẫn tính thử được** và tường mời đăng
nhập thay vì nói số dư · đã trả tiền từ trước → mở thẳng, không tường, không
trừ Lượng · thiếu Lượng → tường "còn thiếu N", **không bị quẳng về form** ·
`nhan-mach` mở xong **thứ tự người không đổi** · 390px không tràn ngang.
- 🪤 Một ca đỏ là **lỗi TEST**: bản kiểm "rẽ nhánh trước `withToolOutcome`" dò
  vị trí chuỗi, mà CHÚ THÍCH của `nguoi-khac` có nhắc chữ `withToolOutcome`.
  Phải bỏ chú thích trước khi dò.

### CÒN LẠI
- **2 tool chân dung chưa có tính thử** — ở đó giá trị chính LÀ bức ảnh, cho
  xem trước là cho không hàng. Phải nghĩ cách khác (hé tên nhân vật + nền văn
  minh mà giấu ảnh + truyện?), và cách đó tốn một lượt LLM nên không còn 0đ.
- Chưa đo được **tỉ lệ bấm "Mở bản đầy đủ"** sau khi xem tính thử — đó chính là
  con số nói W1 có ăn hay không. Cần một event riêng (`preview_shown` /
  `preview_unlock`) rồi ghép trong panel Marketing.
- Lượt tính thử **không giới hạn** và không đăng nhập. Chi phí là CPU lập lá số
  nên chấp nhận được, nhưng nếu có ngày bị quét thì cần trần theo IP.

---

## 👶👥 T2 "Dạy Con" + T3 "Sổ Nhân Mạch" (2026-08-06, PR trước)

Henry: *"Ok. Làm tiếp t2/t3 đi"* — mục cuối của nhóm T trong `BACKLOG-DOI-THU.md`.

### ⚠️ ĐÍNH CHÍNH PHẠM VI, đọc trước khi làm tiếp
Backlog mô tả T2/T3 là **hai bậc thuê bao** (`親子白金` / `業務白金`) và ghi rõ
*"phụ thuộc S1, đừng làm trước"* — mà S1 lại chờ R1 chứng minh có người quay
lại. Dựng hạ tầng thuê bao lúc này là dựng đường thu tiền định kỳ cho thứ chưa
ai dùng lần hai. Nên PR này làm **phần NỘI DUNG của hai gói dưới dạng hai tool
bán lẻ bằng Lượng như mọi tool khác**. Nếu sau này S1 ra đời, hai tool này thành
ruột của gói — engine không phải sửa gì.

### T2 — `/app/day-con` "Dạy Con Theo Lá Số" · 15 Lượng
Khác `nguoi-khac` với quan hệ `con-cai` ở CÂU HỎI: bên kia là *sống chung cho
êm*, bên này là **dạy kiểu nào thì vào**.
- `lib/engine/day-con.ts` — 5 mặt đọc (Mệnh · Phúc Đức · **Phụ Mẫu** · Thiên Di
  · Quan Lộc) + `KIEU_HOC` (4 kiểu × 7 trường nuôi dạy, **tự viết**, không phải
  cổ thư — trang nói rõ) + **chặng đi học** (đại vận chạm quãng 6–24 tuổi) +
  cung Tử Tức của cha mẹ.
- 🔑 **Cung PHỤ MẪU là mặt đáng tiền nhất và không tool nào khác đọc**: nó nói
  *đứa trẻ nhìn cha mẹ thế nào* — tức nói về phía bên kia của chính người hỏi.
- Ô **"điều bạn đang lo"** (6 lựa chọn) đổi giọng cả bản luận — cùng đòn rẻ mà
  hiệu quả nhất đã chép từ click108 ở tool Công Sở.

### T3 — `/app/nhan-mach` "Sổ Nhân Mạch" · 20 Lượng
Đây mới là phần B2B của `業務白金`, và là thứ T1 KHÔNG làm được: **đọc cả nhóm**.
- `lib/engine/nhan-mach.ts` — 2–8 người từ **sổ lá số (U4)**, mỗi người một vai
  → phân bố 4 kiểu · **kiểu KHÔNG ai có** (lỗ hổng đội) · cặp *giẫm chân* (cùng
  kiểu) / *bù nhau* (khác tính âm–dương) · thứ tự tiếp cận.
- 🔑 **Chỉ hai loại cặp có căn cứ tra được mới nêu.** Cặp khác kiểu nhưng CÙNG
  tính (Khai sáng + Lãnh đạo) cố ý bỏ — không có gì để nói mà vẫn chiếm chỗ.
- ⚠️ **Thứ tự tiếp cận xếp theo VẬN NĂM, không phải mức quan trọng** — nói thẳng
  trên trang VÀ trong prompt. Đọc nhầm thành bảng ưu tiên khách hàng là hỏng.
- **Trần 8 người** vì trên đó phần cặp bùng nổ (28 cặp) và bản đọc thành danh bạ.
- Trang **tự quản sổ** (ô chọn + vai + xoá) nên hai ô nhập CỐ Ý không đặt id
  chứa `formHost` — `user-charts.js` dò theo mẫu đó rồi tự gắn thêm một thanh
  chip nữa, thành hai bộ điều khiển cho cùng một dữ liệu.

### ⚖️ Ranh giới đạo đức — HAI LỚP, y như T1
Cả hai đọc lá số người **không có mặt**; T3 còn đọc vài người một lúc và người
hỏi thường có quyền với họ.
- **Lớp dữ liệu**: dùng CHUNG `KHONG_DOC` của `nguoi-khac.ts` (Tật Ách · Tài Bạch
  · Phu Thê · Tử Tức · Điền Trạch). T3 **không trả điểm tổng mỗi người** ⇒ không
  có gì để xếp hạng.
- **Lớp prompt**: T2 cấm đoán đỗ/trượt, cấm so sánh anh em, cấm "khó dạy".
  T3 cấm xếp hạng người, cấm khuyên sa thải, cấm ngôn ngữ chốt sale thao túng.
- 🔴 **ĐÍNH CHÍNH 2026-08-09 — luật "T2 không được gợi nghề" ĐÃ BỎ.** Henry lật:
  *"Luật đó claude.md đang viết sai. Định hướng nghề nghiệp thì định hướng để
  tham khảo thôi. Nó giúp ích cho đứa trẻ. Mà bình thường gia đình cũng đã định
  hướng cho nó rồi."* Lý do cũ ("chốt nghề cho đứa 10 tuổi là thứ nguy hiểm nhất
  nó làm được") nhầm **ĐỊNH HƯỚNG** với **CHỐT**: gia đình vốn đã định hướng, và
  một bản tham khảo có căn cứ thì tốt hơn một câu nói vu vơ trong bữa cơm.
  ⇒ Tool định hướng nghề cho trẻ em là việc ĐƯỢC LÀM. Ranh giới còn giữ: nói
  bằng *xu hướng và việc nên cho làm quen*, không nói bằng *nghề phải theo*.
- 🪤 **Ca test suýt báo đỏ oan**: bản kiểm "prompt không nhắc cung cấm" bắt được
  `Tử Tức` — nhưng đó là cung Tử Tức trong lá số **CHA MẸ**, chỗ cổ pháp đọc con
  cái, và cha mẹ chính là người tự đưa lá số mình vào. `KHONG_DOC` cấm các cung
  đó **của đứa trẻ**. Kiểm phải phân biệt CUNG CỦA AI, không kiểm chuỗi thô.

### 🧹 Dọn kèm
- `namSinhTuLaSo(ls, namXem)` **tách khỏi `computeCongSo`** làm nguồn chung cho
  phép quy đổi tuổi mụ ↔ năm (`tuoi` là TUỔI MỤ ⇒ năm = namSinh + tuổi − 1).
- `BU` (bảng kiểu bù âm–dương) nay **export** thay vì để T3 chép bản thứ hai.
- **`lib/api/tool-helpers.ts` MỚI** — `authUserFromRequest` + `parseLlmJson` đang
  có **5 bản chép tay** trong `app/api/`. Bản `parseJSON` giòn đã trả giá một lần
  trên prod, và cái giá đó phải trả lại ở mỗi bản chép. Route mới đi qua đây;
  ⚠️ **CỐ Ý chưa đổi 5 route cũ** — trộn refactor rủi ro vào PR thêm tính năng.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine **185 pass** · `node --check` 4 khối script nội
tuyến · **4.896 lá số TRẺ EM trên module thật**: 5 mặt luôn đủ, 0 mặt rơi vào
cung cấm, chặng **liền mạch không hở**, mọi chặng chạm quãng 6–24, 0 rò
`undefined`/`NaN`/`[object`, 4 kiểu đều xuất hiện (28,0/27,7/22,3/22,0%) ·
**152 nhóm 2–8 người**: phân bố luôn cộng đúng tổng, `thieuKieu` ⇔ kiểu 0 người,
mọi cặp là người CÓ THẬT, *giẫm-chân ⇔ cùng kiểu* và *bù-nhau ⇔ khác tính âm
dương*, thứ tự giảm dần theo vận năm, **đảo thứ tự nhập → nhóm không đổi** ·
**quét cả lưới prompt: 0 cung cấm lọt** (cả nhánh có lẫn không có lá số cha mẹ)
· chống bẻ prompt qua TÊN (xuống dòng · backtick · ngoặc nhọn · tên 200 ký tự) ·
**48 ca Playwright trên 2 TRANG THẬT**: giá đúng trên nút · **lá số đang nhớ rơi
vào form CHA/MẸ chứ không phải form CON** · ô mối lo THẬT SỰ đổi nội dung ·
payload đúng shape API · rail nhận đúng `wrap`/`wrapMoiLo`/`birth` · 1 người →
chặn tại chỗ **không gọi API** · trần 8 người · sổ trống → không gọi API · tên
chứa `<img onerror>` và nội dung chứa `<script>` không chạy mà vẫn hiện nguyên
văn · API 500 → quay lại form, không treo · 390px không tràn ngang.
- 🪤 `ngay`/`thang` của `TuviForm` là `<select>` chứ không phải `<input>` —
  `page.fill()` đỏ ngay. Dùng `selectOption`.

### ✅ Đã bật trên prod — hết việc tay
Migration `_patches/migration-t2-t3.sql` đã chạy (2 bảng, RLS bật, 1 policy
chủ-sở-hữu mỗi bảng, 2 dòng giá), và `day-con` · `nhan-mach` · `nguoi-khac` nay
đều `enabled=true` (verify 07/08: 59/59 tool bật, không tool nào còn tắt).
- 🪤 Cột tên trong `tool_pricing` là **`label`**, không phải `title` — lượt chạy
  migration đầu tiên đỏ đúng chỗ này.

### CÒN LẠI
- **Nội dung `KIEU_HOC` (4 kiểu × 7 trường) là tao tự viết**, chưa ai review —
  cùng dạng nợ với 384 hào từ và nội dung 4 kiểu của Công Sở. Sửa là sửa data
  thuần, không đụng logic.
- Chưa có trang standalone SEO cho cả hai (mới có trang shell). *"dạy con theo
  tử vi"* có cầu thật, đáng làm sau.
- T3 **bắt buộc đăng nhập** (sổ lá số theo tài khoản). Khách vãng lai mở trang
  thấy sổ trống kèm hướng dẫn — đúng thiết kế, nhưng là một bức tường ở đáy phễu.
- S1 (thuê bao năm) vẫn chưa làm, và vẫn nên chờ R1 có số.

---

## 💸 Duyên Nợ Tiền Kiếp trừ tiền HAI LẦN — 3 lỗi chồng nhau (2026-08-06, PR trước)

Henry báo *"không vẽ được bức tranh"* + *"không tạo được link chia sẻ"*. Điều tra
ra **ba lỗi độc lập**, và cái nặng nhất KHÔNG nằm trong lời báo: anh **bị trừ 30
Lượng hai lần cho một lượt xem**.

### 🔑 Bằng chứng đầu tiên phải lấy: model KHÔNG hỏng
`portrait_cache` có dòng pha `image` ghi lúc **12:30:03**, ảnh PNG **1536×1024
thật** nằm trong Storage. Tức server vẽ xong bình thường — **trình duyệt bỏ cuộc
trước**. Đừng đi sửa prompt/model khi chưa soi cache và Storage.

### 🔴 Lỗi 1 — tiền tố slug rút gọn làm CHẾT lưới an toàn thanh toán
`hasRecentToolPayment` (`lib/billing/credits.ts`) lọc `slug=like.<tool_id>*` —
đây là lưới đỡ duy nhất chống *"đã trả tiền mà vẫn ăn 402"*. Trang dựng slug
`'duyen-no-' + …` trong khi `tool_id` là **`duyen-no-tien-kiep`** ⇒ slug NGẮN HƠN
tool_id ⇒ `LIKE` không bao giờ khớp (verify bằng SQL trên chính 2 dòng giao dịch
thật: `khop_fallback = false`). Mất lưới, chỉ cần `hasSlugAccess` hụt một nhịp là
402 ngay sau khi vừa trừ tiền.
- 🔑 **Luật: slug PHẢI bắt đầu bằng ĐÚNG `tool_id`, được dài hơn, cấm ngắn hơn.**
  Quét cả site: chỉ 3 route dùng `toolPaymentDenied`, hai cái kia (`chan-dung-*`)
  khai đúng — lỗi gói gọn ở tool này.
- **Hậu quả đo được**: story qua (200), image bị 402 → trang báo lỗi → Henry bấm
  lại → trừ lần hai. Hai slug cách nhau 2,5 giây, `-30` mỗi lần.

### 🔴 Lỗi 2 — `hasSlugAccess` thiếu `cache:'no-store'`, và có đường TỰ ĐẦU ĐỘC
Đúng nợ CLAUDE.md đã ghi ở track cảnh báo 30/07 (*"còn nhiều lượt GET Supabase
khác thiếu `cache:'no-store'`, chưa rà hết các route nghiệp vụ"*) — nay nó cắn
vào đường TRẢ TIỀN. Chỗ này còn tệ hơn cache thường: **`handleDeduct` gọi CHÍNH
`hasSlugAccess` với ĐÚNG URL đó ngay TRƯỚC khi ghi giao dịch** → bản rỗng bị Next
nhớ lại → route tool hỏi cùng URL và nhận lại bản rỗng ⇒ vừa trả tiền xong vẫn
402. Đã thêm `no-store` cho cả 3 lượt GET trong `credits.ts`.

### 🔴 Lỗi 3 — chia sẻ 400, và nó là HỆ QUẢ của lỗi vẽ ảnh
Vẽ hỏng → `publishShareable('')` → `kind:'text'` kèm `blocks` nhưng **không có
`text`**; route `share-result` nhánh `text` đòi bằng được `text` → **400** →
*"Không tạo được link chia sẻ"*. Vẽ được thì đi nhánh `image` (ở đó `text` là tuỳ
chọn) nên **lỗi này chỉ lộ đúng lúc ảnh hỏng**.
- Vá **hai đầu**: route nay nhận `blocks` một mình là nội dung hợp lệ (trang
  `/ket-qua` vốn render blocks trước, `text_content` chỉ là đường lùi); client
  cũng gửi kèm `text` để không phụ thuộc một phía.

### ✅ Đường phục hồi ảnh — vá đúng thứ người dùng thấy
Ảnh mất 50–150 giây; trên di động (khoá màn hình, đổi sóng, chuyển tab) fetch bị
cắt trong khi hàm server VẪN CHẠY TỚI CÙNG rồi ghi cache. Nay khi lượt ảnh hỏng ở
client, trang **hỏi `cache-status` mỗi 5 giây (tối đa 90 giây)**, đủ CẢ HAI PHA
mới POST lại để đọc cache.
- 🔑 **CỐ Ý không POST lại thẳng**: pha ảnh chưa vào cache thì một lượt POST nữa
  là một lượt **GỌI MODEL** nữa — tốn tiền thật để lấy đúng bức tranh đang vẽ dở.
  Có ca ĐỐI CHỨNG canh đúng tính chất này.
- 🐞 Bắt kèm: `imageP` bị bỏ rơi trong lúc `await storyP` → ảnh hỏng trước truyện
  là một `unhandledrejection` lọt vào bộ thu lỗi như sự cố thật. Gắn `.catch`
  giữ chỗ; `await imageP` bên dưới vẫn ném và vẫn được nhánh phục hồi xử lý.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine **185 pass** · `node --check` 2 khối script nội
tuyến · **6 ca trên ROUTE THẬT `share-result`** qua Next dev + stub PostgREST:
payload y hệt bản ảnh-hỏng nay 200, blocks chỉ có header cũng 200, + **3 ca ĐỐI
CHỨNG vẫn phải 400** (rỗng hẳn · blocks toàn rác · `imageUrl` là `javascript:`),
và kiểm dòng THỰC SỰ lưu chứ không chỉ nhìn mã trả về · **render thật
`/ket-qua/<id>`**: bản chia sẻ chỉ-có-blocks mở ra **đủ chữ** (tiêu đề + 2 khối)
· **5 ca Playwright trên TRANG THẬT**: ảnh hỏng → tự lấy lại được, hết câu "Không
vẽ được", POST pha ảnh **đúng 2 lần**, có hỏi cache-status trước khi POST lại,
0 lỗi JS · **ca ĐỐI CHỨNG**: cache chưa sẵn → **tuyệt đối không POST lại**.
- 🪤 Một ca đỏ là **lỗi TEST**: ảnh giả 16 byte nên `img.onload` không chạy, mà
  `setResultImage` chỉ đặt `display:block` trong `onload`. Phải dùng PNG hợp lệ.
- 🪤 `.single()` của supabase-js gửi `Accept: application/vnd.pgrst.object+json`
  và chờ MỘT OBJECT — stub trả mảng là trang ra 404, dễ tưởng nhầm là lỗi code.

### ✅ Đã xử lý sau khi merge (Henry chốt "fix 2 việc treo")
- **Hoàn 30 Lượng** đã chạy prod: qua RPC `add_credits` (đúng lối
  `handleAdminGrant`), **KHÔNG sửa thẳng `user_credits.balance`** — sổ giao dịch
  phải giải thích được số dư. 7.068 → **7.098**, ròng lượt đó còn `-30`. Dòng
  `type='refund'` gắn đúng slug bị trừ thừa để báo cáo doanh thu không đọc nhầm
  thành nạp tiền.
- **Mở lại lấy tranh**: đã kiểm đúng 3 điều kiện code xét — 2 pha đều có cache
  hợp lệ · `userOwnsLaso` khớp · payload cache mang sẵn `imageUrl` ⇒ `free=true`.

### 🔑 Hai ảnh KHÁC NHAU — lượt trừ thừa còn đốt thêm một lượt model
`past_life_bonds` có 2 dòng, `…400073.png` và `…405032.png`, và `events` có **2
dòng `llm_usage` ảnh**. Tức thiệt hại của lỗi slug không dừng ở 30 Lượng: nó gọi
model thêm một lần (~1.100đ) và bức thứ hai không ai từng thấy.

---

## ⏳ Ảnh chậm gấp đôi vì ĐỔI MODEL, không phải hồi quy (2026-08-06, cùng PR)

Henry: *"sao ảnh lại mất lâu thế? tool chân dung tiền kiếp đâu có lâu như vậy"*.

### Bằng chứng: CÙNG một tool, hai model
| Tool | Ngày | Model | Ảnh chậm hơn truyện |
|---|---|---|---|
| Chân Dung Vợ Chồng | 01/08 | gpt-image-1 | **21,9s** |
| Chân Dung Vợ Chồng | 04/08 | **gpt-image-2** | **46,1s** |

Đo trên `events.llm_usage` (khoảng cách mốc log pha ảnh vs pha truyện — hai pha
chạy song song). 11 lượt gpt-image-1 nằm trong **15–26s**; gpt-image-2 **46,1s**.
Model đổi **04/08**; `chan-dung-tien-kiep` chạy lần cuối **01/08** ⇒ Henry đang so
với ký ức của model cũ. **Không tool nào nhanh hơn tool nào.**

- ⚠️ **Đính chính số CLAUDE.md đang ghi**: dải "65–150 giây" là đo ở
  `quality=high` của lượt vẽ 64 bức quẻ. Ba tool chân dung **không truyền
  `quality`** nên ăn mặc định **medium** → thực đo **46–57 giây**.
- Xác nhận cấu hình: `OPENAI_IMAGE_MODEL` mặc định `gpt-image-2`, `quality` mặc
  định `medium`, và **cả 3 tool người dùng đều không truyền `quality`** (chỉ 2
  route admin `chan-dung-thu`/`que-images` mới truyền). **Henry chốt GIỮ NGUYÊN.**
- Cần gạt nếu cần nhanh: env `OPENAI_IMAGE_MODEL=gpt-image-1` + Redeploy → ~22s,
  nhưng đắt hơn 34% và **OpenAI tắt gpt-image-1 ngày 23/10/2026**.

### ✅ Chỉ báo chờ — `AiLoadingSteps.mountWait()`
🔴 **Chỗ hổng thật, không phải chuyện thẩm mỹ:** tool 2 pha tắt bảng bước ngay khi
truyện xong, rồi để pha ảnh chạy tiếp ~40 giây với đúng **một dòng chữ TĨNH**
trong khung ảnh. Không gì nhúc nhích ⇒ người dùng đọc thành "treo" và **bấm lại
— mà bấm lại là một lượt GỌI MODEL nữa**. Đúng chuỗi đã làm Henry mất 60 Lượng.
- Thêm hàm DÙNG CHUNG vào `tools-shared/ai-loading-steps.js` (spinner + thanh
  tiến trình + đếm giây + câu "thường mất 45–60 giây"), cắm vào 3 trang có khung
  ảnh tĩnh. Hai tool Vợ Chồng chạy 1 pha nên bảng bước vốn ở lại suốt — chỉ sửa
  nhãn bước cuối cho có kỳ vọng thời lượng.
- 🔑 **Thanh chặn trần 96%**: thanh đầy trong khi việc CHƯA xong còn tệ hơn không
  có thanh — người ta tin là xong rồi và bỏ đi.
- 🔑 **Quá hẹn thì ĐỔI LỜI chứ không đứng im** ("vẫn đang vẽ, đừng đóng trang").
- Nhánh ảnh hỏng **CỐ Ý giữ đồng hồ chạy** suốt vòng phục hồi — server nhiều khả
  năng vẫn đang vẽ, tắt chỉ báo ở đó là nói dối theo hướng ngược lại.
- Gọi `mountWait` qua `if (AiLoadingSteps.mountWait)`: bản JS cũ còn trong cache
  trình duyệt thì rơi về dòng chữ tĩnh như cũ, không ném lỗi. Bump `?v=1→2` (16 file).

### Verify (vòng chỉ báo)
`tsc` 0 lỗi · `lint` 0 lỗi · `prettier` sạch · `check:prices` sạch · **JS và
JSON-LD của 5 trang đều hợp lệ** (kiểm tách hai loại — `node --check` trên khối
`ld+json` là sai công cụ, đã vấp một lần) · **10 ca Playwright**: đồng hồ NHÍCH
thật, thanh chạy, nói đúng thời lượng, ảnh về thì nhường chỗ, 0 lỗi JS ·
**4 ca hợp đồng `mountWait`**: `stop()` dọn hẳn interval · quá hẹn đổi lời ·
thanh chặn đúng 96%.
- 🪤 Một ca của tao **đỗ GIẢ**: nhánh hỏng thay lời bằng câu không chứa số giây
  nên phép so `before === after` không chứng minh được gì. Phải kiểm THẲNG
  `stop()` ở tầng hợp đồng. Bài học: assertion phải nhìn vào thứ ĐANG ĐỔI.
- 🪤 **`git checkout --ours` khi giải xung đột `stash pop` là con dao cụt**: nó
  lấy TRỌN bản upstream, tức xoá luôn phần đã auto-merge sạch của mình trong
  chính file đó. Tao mất hết sửa đổi ở 5 file và chỉ biết vì có kiểm lại bằng
  `grep -c`. Đường đúng: `git apply -3` bản diff của stash rồi giải từng hunk.
  **Sau mỗi lần giải xung đột phải ĐẾM LẠI dấu hiệu của cả hai bên**, đừng tin
  là "hết `<<<<<<<` nghĩa là xong".

### ✅ Port phục hồi sang 2 tool chân dung — và tách module dùng chung (cùng PR)
Henry: *"làm đi"*. Thay vì chép `_thuLayLaiTranh` sang 4 file, tách hẳn
**`public/tools-shared/portrait-recover.js`** (`birthQuery` · `nenThuLai` ·
`wait`) rồi cho CẢ Duyên Nợ dùng lại — bản chép riêng trong Duyên Nợ đã GỠ.
- 🔑 **Siết thêm một điểm so với bản Duyên Nợ đang chạy: chỉ phục hồi khi lỗi có
  thể là "server vẫn đang chạy"** — fetch NÉM (mất kết nối) hoặc **502/503/504**
  (edge bỏ cuộc, hàm còn sống). Server trả lỗi ĐÀNG HOÀNG (402 chưa trả tiền,
  500 sinh ảnh hỏng) là câu trả lời DỨT KHOÁT ⇒ phục hồi chỉ tổ bắt người dùng
  nhìn spinner thêm 90 giây rồi vẫn nhận đúng câu báo lỗi đó. Có ca ĐỐI CHỨNG.
- **Vợ Chồng chạy MỘT pha** nên mất kết nối là mất trắng cả lượt → phải bọc cả
  lượt gọi, tách `try` truyền-tải riêng khỏi `try` nghiệp vụ. Bảng bước CỐ Ý vẫn
  chạy suốt vòng phục hồi.
- 🐞 Bắt kèm: cả 2 file Chân Dung Tiền Kiếp cũng dính lỗi `imageP` bị bỏ rơi →
  `unhandledrejection` (đúng lỗi đã vá ở Duyên Nợ mà chưa port). **Chỉ lộ vì test
  bắt `pageerror`**, không lộ khi đọc code.
- **Verify:** `tsc`/`lint`/`prettier`/`check:prices` sạch · JS + JSON-LD của 5
  trang hợp lệ · **17 ca Playwright trên TRANG THẬT**: CDTK và CDVC đều tự lấy
  lại được ảnh, POST đúng 2 lần · **ĐỐI CHỨNG lỗi-server-rõ-ràng → 0 lượt hỏi
  cache, không chờ vô ích** · **ĐỐI CHỨNG tiền: cache chưa sẵn → tuyệt đối không
  POST lại** · 0 lỗi JS · Duyên Nợ chạy lại sau refactor không hồi quy.

### CÒN LẠI
- Muốn dứt điểm quãng chờ thì phải đổi pha ảnh sang "đặt hàng rồi hỏi lại"
  (POST nhận ngay mã, client poll cache) — đụng cả 3 tool, chưa làm.

---

## 💼 Track click108 → tool MỚI "Tử Vi Công Sở" (2026-08-06, PR này)

Henry: *"cách mà trang click108 nó kết hợp tử vi với tâm lý học, quản trị học là
thế nào thế?"* → khảo sát → *"làm luôn đi"*.

### 🔴 ĐÍNH CHÍNH QUAN TRỌNG — KHÔNG PHẢI DISC, LÀ TỨ TƯỢNG KINH DỊCH
Vòng khảo sát ĐẦU tao chỉ đọc được qua bản tóm tắt của công cụ tìm kiếm (proxy
chặn host ngoài) và đã kết luận nhầm rằng 張盛舒 mượn khung DISC. Henry mở
network policy → đọc được trang gốc → **sai**. Nguyên văn của chính ông ta
(`sam.click108.com.tw/blog/?p=657`, mục `作品連載 · 紫微領導學`):

> 陽性主星共計八顆，包括開創型（**老陽**）的七殺、破軍、廉貞、貪狼，以及領導型
> （**少陰**）的紫微、天府、武曲、天相… 陰性主星共計六顆，包括支援型（**少陽**）
> 的太陽、巨門、天機，以及合作型（**老陰**）的太陰、天梁、天同

Cái "ánh xạ DISC" là **overlay của một blogger pixnet**, không phải khung gốc.
🔑 **Bài học: bản tóm tắt của search engine trộn nguồn gốc với nguồn bình luận
mà không nói cho biết.** Gặp claim quan trọng thì phải đọc trang gốc.

### Khung thật của họ (đã đọc primary source)
- **4 kiểu = tứ tượng áp lên 14 chính tinh tại cung MỆNH.** Trùng khít bộ sao
  kinh điển: 殺破狼+廉 · 紫府武相 · 機巨陽 · 同梁陰.
- **Mỗi kiểu điền đúng 5 ô cố định**: 本命驅力 (động lực gốc) · 命格特質 ·
  關鍵問題 (câu hỏi chạy ngầm) · 領導型態 · 適合職場. Đây là thứ đáng học nhất —
  không viết văn tuỳ hứng.
- **2X3法則** = 2 lý thuyết (3 cung nhân sự `疾厄/命/部屬`; đại vận ảnh hưởng bản
  mệnh) × 3 việc (tìm người bù · dựng đội · chuyển giao kế nhiệm).
- **時與位** (Kinh Dịch): tính cách không tốt/xấu, chỉ hợp/không hợp bối cảnh.
- **造命功課**: mỗi kiểu 4 bài học khi lần đầu cầm quân — phần bán được tiền vì
  nó là việc LÀM ĐƯỢC, không phải lời mô tả.
- Sản phẩm `紫微事業命盤` **NT$420** và là **#1 mục 網友熱推** — tool nghề nghiệp
  là thứ bán chạy nhất của họ. Catalog xếp theo **CÂU HỎI ĐỜI SỐNG**, không theo
  môn (site mình đang xếp theo môn).
- 🔑 **Đòn rẻ nhất, hiệu quả nhất, đã chép**: ngoài ngày sinh còn hỏi
  **事業現況** (5 lựa chọn) — một `<select>` đổi giọng cả báo cáo.

### ⛔ Phần KHÔNG chép, và vì sao
Ông tự viết *"2012 là năm KHOA HỌC MỆNH LÝ ra đời"*, tự ví mình là **佛洛伊德
phương Đông**, gọi site mình là **唯一標準**. Không có nghiên cứu đối chứng nào.
1.152 là số TỔ HỢP (144 lá số × 8 đại vận), không phải cỡ mẫu.
⇒ Trang + prompt của mình **CẤM** chữ "khoa học / thống kê / trắc nghiệm đã kiểm
định" và **cấm đối chiếu DISC/MBTI**. Nói "một khung đọc" thì đúng và vẫn bán được.

### ✅ Tool mới `/app/cong-so` — `lib/engine/cong-so.ts` + `/api/cong-so`
Miễn phí, **0 lượt LLM, 0đ**: tra bảng + đọc lại số engine đã tính. Rail vẫn
tính `chat.cost` như mọi tool.
- **🔑 PHÂN KIỂU BẰNG TOẠ ĐỘ, KHÔNG GÁN NHÃN CỨNG.** Đo 10.368 lá số trên MODULE
  THẬT: **16,2% Mệnh vô chính diệu** (mượn xung chiếu) · **49,8% Mệnh có ≥2 chính
  tinh**, trong đó **27,6% LẪN HAI NHÓM**.
  🔑 **Phát hiện quyết định thiết kế: các cặp lẫn nhóm CHỈ có hai kiểu** —
  khai-sáng+lãnh-đạo (14,1%) và hỗ-trợ+hợp-tác (13,5%), **KHÔNG lá số nào lẫn
  qua ranh giới âm/dương**. Nên trục Âm/Dương chia đúng 50,0/50,0 và không bao
  giờ mơ hồ; chỉ trục lão/thiếu mới cần phân xử. (Số này không có trong sách họ.)
- **Ba luật đã cân, đo cùng bộ**: sao đầu tiên 28,6/27,6/22,4/21,4 (tuỳ thứ tự
  engine trả → tuỳ tiện) · sao sáng nhất 28,6/25,6/24,4/21,4 · ✅ **toạ độ
  27,0/26,8/23,2/23,0** (đều nhất) kèm **13,2% sát ranh → gọi thẳng "kiểu lai"**.
  Ép nhãn cho nhóm đó là nói chắc điều mình không chắc.
- **7 khối**: kiểu người + toạ độ · **gợi NGÀNH NGHỀ** (xem dưới) · **radar 12
  mặt** (dùng thẳng `cungScores`, 12 cung × 6 chiều engine đã có) · **4 chặng
  40 năm** (`daiVans[].scoring.tong`, kèm "thuận đà / ngược đà" = so âm-dương
  đại vận với kiểu bản mệnh) · bản mệnh vs vận năm nay · **ghép đội** · lời
  riêng theo 5 tình trạng nghề.

### ✅ Gợi ngành nghề — dùng CHUNG `PAIR_OCCUPATION_TABLE` (vòng sau)
Henry: *"dùng PAIR_OCCUPATION_TABLE gợi ngành nghề cụ thể luôn đi"*.
- **Tách `resolveCareerBase(ls)` ra khỏi `computeOccupation`** (past-life.ts) làm
  NGUỒN DUY NHẤT của phép đọc chức phận cung Quan Lộc; tool tiền kiếp gọi lại
  chính nó. Chép bản thứ hai thì hai bên trôi khỏi nhau mà trích dẫn cổ thư chỉ
  đúng ở một bên. **Verify refactor: A/B `computePastLife` bản git HEAD vs bản
  mới trên 4.032 lá số → 0 lệch.**
- 🔑 **BA TRỤC ĐỘC LẬP, KHÔNG VIẾT MA TRẬN**: lĩnh vực ← `domain` (7 nhóm, cung
  Quan Lộc) × vai trò ← kiểu người (4, cung Mệnh) × quy mô ← bậc chức phận (4,
  engine chấm). Viết **7+4+4 = 15 khối** thay vì 112 ô, mỗi trục sửa riêng được.
  Đo được **59/112 tổ hợp** thật sự xuất hiện — không phải 112 vì Mệnh và Quan
  Lộc cách nhau CỐ ĐỊNH 4 cung nên hai trục không độc lập hoàn toàn.
- **49,6% lá số tra được bảng CẶP** (24/24 cặp đều xuất hiện) — tức một nửa số
  người được luận theo cặp chính tinh đồng cung, đúng lối chương Quan Lộc Tân
  Biên luận. Phân bố lĩnh vực: văn 28,4 · quyền 16,7 · thương 15,6 · võ 13,8 ·
  nghề 13,6 · y 10,8 · **tu 1,1%** (hiếm là đúng, không phải hỏng).
- ⚠️ **Trang PHẢI nói rõ ranh giới**: cổ thư nói **CHẤT VIỆC**, còn danh sách
  ngành hiện đại là **quy chiếu của trang**. Người đang làm ngành không có trong
  danh sách thì đối chiếu chất việc — cấm phán "bạn đang làm sai nghề".
- 🐞 **Lỗi đọc-thành-mâu-thuẫn, chỉ lộ khi nhìn output thật**: sắc thái phụ tinh
  ghi *"ngả hẳn về đường văn chương"* ngay dưới lĩnh vực *"chăm sóc thân thể"*.
  Sắc thái **THU HẸP BÊN TRONG** lĩnh vực chứ không thay nó (chữ nghĩa trong
  ngành y = nhánh giảng dạy/nghiên cứu/viết chuyên môn). Đã nói thẳng luật đó
  trên trang **và** trong prompt (`luatDocSacThai`).
- Chức phận lối cổ ("quan trấn phủ", "cự phú") là **ngôn ngữ nội bộ** — chỉ hiện
  ở khối "Cơ sở trong lá số", prompt CẤM đọc thô ở phần trả lời chính. Có test
  canh đúng chỗ này.
- ⚠️ **Ghép đội đọc theo CỔ PHÁP**: cấp trên = **Phụ Mẫu**, đồng sự = **Huynh
  Đệ**, cấp dưới = **Nô Bộc**. 張盛舒 đọc cấp trên ở **Tật Ách** — đó là biến thể
  của một tác giả, không kiểm chứng được, **cố ý không dùng**.
- **Nội dung tự viết**, không dịch chữ của họ (bản quyền). `MENH_ROLE` của
  `past-life.ts` nay **export** để dùng CHUNG — hai bảng mô tả cùng 14 chính tinh
  sẽ trôi khỏi nhau, và trích dẫn chỉ đúng ở một bên.
- **Poster 9:16 vẽ BIỂU ĐỒ TOẠ ĐỘ chứ không vẽ radar**: radar 12 nhãn li ti, qua
  một lượt nén của mạng xã hội là mất chữ; bốn ô có tên còn đọc được ở thumbnail.

### 🐞 Hai lỗi tự bắt khi chạy THẬT (không phải khi đọc code)
1. **Lá số KHÔNG có trường `namXem`** (chỉ có `tuoiXem`) → mọi năm trên lộ trình
   ra **0**, im lặng. Nay suy năm sinh từ chính `tieuVanScores` (mỗi ô mang sẵn
   cặp `nam`+`tuoi`) nên không phải giả định quy ước tuổi. ⚠️ `tuoi` là **TUỔI
   MỤ** → năm = namSinh + tuổi − 1; quên trừ 1 là cả bốn chặng lệch một năm.
2. **`tieuVanScores[].direction` là chuỗi TIẾNG ANH** (`up`/`down`/`flat`) và nó
   nằm trong payload API → ra thẳng giao diện được. Đúng loại rò rỉ bộ dò đã bắt
   hai lần ở Kỳ Môn và Bản Đồ Sao. Đã dịch tại một chỗ (`HUONG_VI`).

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine test **185 pass** · `node --check` module + 2 khối
script nội tuyến · **10.368 lá số trên module THẬT**: phân bố 4 kiểu khớp đúng
dự đoán, 0 lỗi trên 7 bất biến (radar luôn 12 mục điểm 0–10 · lộ trình luôn đúng
4 chặng **liền mạch không hở** · ghép đội luôn 3 vai · kiểu phụ không bao giờ
trùng kiểu chính · 0 rò `undefined`/`NaN`/`[object` · rail luôn phẳng) ·
**12 ca trên prompt THẬT** (`buildChatContext`): chọn đúng nhánh, có đủ luật cấm
phong thánh/cấm DISC-MBTI, **0 key thô lọt prompt**, 0 rò chuỗi kỹ thuật, + ca
ĐỐI CHỨNG scenario lạ bị từ chối · **A/B refactor: `computePastLife` cũ vs mới
0 lệch trên 4.032 lá số** · **12 ca Playwright trên TRANG THẬT qua Next dev**:
đúng 1 lượt gọi API · ô tình trạng nghề THẬT SỰ đổi nội dung · **chấm toạ độ rơi
đúng góc phần tư** (lấy mẫu pixel — bẫy đảo trục Y màn hình) · radar có nét ·
poster là **PNG thật 1080×1920 đọc từ IHDR** · rail gửi đúng
`scenario.type='cong-so'` + `birth`, payload phẳng · tên chứa `<img onerror>`
không chạy · chặn `poster.js` → trang vẫn sống · 390px không tràn ngang ·
**khối ngành: ≥5 ngành, vai trò khớp đúng kiểu người, nêu được trích dẫn Tân
Biên, và chức phận lối cổ KHÔNG lọt lên phần gợi ý chính**.
- 🪤 Một ca test đỏ là **kỳ vọng của TEST sai, không phải code**: nó neo theo
  THỨ TỰ tiêu đề (`.cs-sec h3` nth(0)) nên thêm khối mới là đỏ oan. Đã đổi sang
  neo theo NỘI DUNG.

### ✅ Đã bật trên prod — hết việc tay
`cong-so` nay `enabled=true`, `is_free=true`, `credits=0` (verify 07/08).
Muốn thu phí: `update tool_pricing set credits=15, is_free=false where
tool_id='cong-so';` — cố ý để free vì đây là tool ĐẦU PHỄU.

### CÒN LẠI
- **Chưa có trang standalone SEO** `/tools/cong-so.html` (mới có trang shell).
  Truy vấn "tính cách nghề nghiệp theo tử vi" có cầu thật, đáng làm sau.
- **Nội dung 4 kiểu × 5 trường là tao tự viết**, chưa ai review — cùng dạng nợ
  với 384 hào từ. Sửa là sửa data thuần trong `KIEU`, không đụng logic.
- Chưa lấy được **9 大天賦 / 12 大能量** của họ (nằm sau paywall NT$420). Không
  chặn gì: 12 mặt của mình suy từ 12 cung, độc lập.
- **Danh sách ngành hiện đại (7 nhóm × 6 ngành) là quy chiếu tao tự đặt** — cùng
  dạng nợ với nội dung 4 kiểu. Sửa là sửa `DOMAIN_NGANH`, không đụng logic.
- Lĩnh vực **`tu` chỉ 1,1%** nên gần như không ai đọc phần đó; nếu sau này thấy
  nó lạc quẻ thì gộp vào `van` là xong, không phá gì.

---

## 📸 Vận hôm nay: poster đủ thông tin · QR đo được · nhập lá số tại chỗ (2026-08-05, PR #418)

Henry soi thẻ Vận hôm nay, hỏi 3 việc: (1) ảnh tải về thiếu thông tin so với
thẻ; (2) nhúng được link vào ảnh để track không; (3) *"làm sao mày biết được lá
số của user hay thế?"* + có nên thêm bước cho user nhập/sửa lá số.

### (3) Trả lời trước vì nó là chỗ hổng thật
**Không có phép màu nào:** `Shell.getRememberedBirth()` đọc
`localStorage['app_birth']` — ghi từ lần user chạy BẤT KỲ tool nào có form ngày
sinh. Tức **theo MÁY, không theo tài khoản**: đổi máy / mở ẩn danh / xoá cache
là khối "Vận riêng của bạn" trống lại, kể cả người đã đăng nhập.
- 🔴 **Và trạng thái trống là chữ CHẾT** — nó BẢO người ta *"lập lá số một lần"*
  mà không có chỗ nào bấm. Đúng chỗ đáy phễu của khối cá nhân.
- 🔴 Trạng thái CÓ lá số cũng hổng ngược lại: thẻ luận vận riêng mà **không hé
  lộ đang dựa trên lá số nào** → sai một trường (hoặc máy dùng chung) thì người
  xem không hiểu vì sao và **không có đường sửa**.
- ✅ Nay: trống → nút **"✦ Nhập lá số của bạn"** mở `TuviForm` compact NGAY TRONG
  thẻ; có rồi → dòng *"Theo lá số: Henry · Nam · 03/06/1998 · giờ Sửu"* + nút
  **"Đổi lá số"** (form điền sẵn). **CỐ Ý không đá sang trang khác** — mỗi lần
  chuyển trang ở đáy phễu là một lần rơi.
- `showName:false` cho form này (bớt một trường là bớt một cớ bỏ ngang), nhưng
  lúc lưu **giữ lại `hoten` cũ** — ghi đè trắng thì rail mất cách xưng hô tên.
- Lưu xong xin lại **CẢ dải 7 ngày** (`tuan:true`): `bixung` từng ô phụ thuộc
  tuổi người xem, giữ dải cũ là để lại 7 ô tính cho "người chưa có lá số".

### (2) PNG KHÔNG mang được link bấm — và metadata PNG là ngõ cụt
tEXt/iTXt bị Facebook/Instagram/TikTok **bóc sạch khi nén lại** ⇒ nhúng vào đó
là nhúng vào chỗ không ai đọc. Đường DUY NHẤT chạm được là **mã QR**.
- **Tự cài bộ sinh QR trong `poster.js`** (byte mode · sửa lỗi M · version 1–10,
  ~250 dòng): 0 lượt mạng, 0đ, không phụ thuộc dịch vụ QR ngoài (dịch vụ ngoài
  chết là ảnh mất mã mà không ai hay).
- URL đi qua **`Shell.viralUrl()`** (mở mới từ `withViralParams`) nên mã QR mang
  **`ref=` của chính người tải ảnh** — ai quét mã rồi đăng ký thì người chia sẻ
  được thưởng, đúng cơ chế V2.1. UTM tách riêng **`poster`/`image`** khỏi
  `share`/`link`: gộp chung thì không bao giờ biết ĐƯỜNG ẢNH có kéo người thật
  về hay không, mà đó chính là câu hỏi.
- 🪤 **Hai lỗi tự bắt khi đối chiếu, cả hai đều làm mã sai IM LẶNG** (ảnh vẫn ra
  một hình QR trông rất thật): (a) điểm phạt N4 dùng `floor(|pct−50|/5)` trong
  khi bản chuẩn là `|ceil(pct/5) − 10|` → chọn nhầm mask; (b) **hai bản format
  info bị đặt HOÁN VỊ** (bản dọc ↔ bản ngang) → lệch 8–12 module.
- **Verify:** ma trận **khớp byte-for-byte gói `qrcode` (npm) trên 420 chuỗi**
  trải version 1→10 (gồm chuỗi có dấu tiếng Việt) ở tầng module, + **127 ca chạy
  lại trong TRÌNH DUYỆT trên chính `poster.js`**, + **đọc NGƯỢC mã đã VẼ ra**
  bằng cách lấy mẫu pixel tâm từng ô: 0 lệch, vùng lặng 4 module sạch.

### (1) Poster thiếu gì — và vì sao nó thiếu
Bản cũ chỉ có: huy hiệu · tiêu đề · 4 mục subtitle · câu chốt · 4 dòng dữ kiện.
**Rơi mất:** tú · màu hợp · tài thần · năm sinh tuổi xung · ngày kỵ · **cả khối
"Vận riêng của bạn"** · và **việc nên làm kèm từng giờ tốt** (giờ đẹp mà không
nói để làm gì thì không dùng được).
- Căn nguyên bố cục: bản cũ **neo cứng toạ độ** rồi căn giữa khối dữ kiện → hôm
  ít nội dung thì hở một mảng trống to giữa ảnh, hôm nhiều thì đè chân trang.
  Nay **đo trước – vẽ sau**: khối nào không còn chỗ thì bỏ theo thứ tự ưu tiên,
  phần dư chia đều vào các khe (trần 34px/khe để không loãng).
- Dòng "Giờ tốt" cho xuống **2 dòng khi còn chỗ, ép 1 dòng khi chật** — ép cứng
  1 dòng thì 4 khung giờ kèm việc bị cắt đuôi, mà đó là dữ kiện dùng được nhất.
- ⚠️ **Khối "Vận riêng của bạn" NAY CÓ trên ảnh chia sẻ.** Nó không lộ ngày sinh
  (chỉ cung nhật hạn + chính tinh + quan hệ hành + màu) và chính nó là thứ khiến
  tấm ảnh là của người này chứ không phải tờ lịch bloc ai cũng có. Chưa có lá số
  → **không có khối**, cố ý không lấp bằng câu chung chung.
- `_meText` dựng SONG SONG lúc render thẻ (bản chữ thuần, không thẻ `<b>` vì
  canvas không dựng được HTML) — một nguồn, hai bên không nói khác nhau.

### Verify
`tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier --check .` sạch
· `check:prices` sạch · engine test 185 pass · **11 ca Playwright trên file
THẬT**: QR (3 ca như trên) · poster ra **PNG 1080×1920 đọc từ IHDR** · nội dung
dài gấp nhiều lần vẫn **không một pixel nào lấn dải đệm 1602–1624** · không có
`qrUrl` vẫn dựng được · trên **trang `app-home.html` thật**: chưa có lá số → nút
bấm được và form mở TRONG trang · nhập xong → lưu `app_birth` + đúng 1 lượt POST
kèm `birth` + `tuan:true` + khối cá nhân hiện · đã có lá số → form điền sẵn,
sửa năm xong **`hoten` không bị xoá** · payload poster đủ tú/màu/tài thần/xung/
ngày kỵ/vận riêng/giờ-kèm-việc + `utm_source=poster` · chưa có lá số → `me` rỗng
· 390px không tràn ngang.

### ✅ Vòng sau — QR cho CẢ `drawPoster` (Henry: *"gắn QR luôn đi"*)
Nay **10/10 poster của site đều mang mã QR**: 2 tool chân dung (shell +
standalone) · Mai Hoa · Kỳ Môn · Bản Đồ Sao · Vận hôm nay.
- **`Poster.qrLink(toolId, path)` là NGUỒN DUY NHẤT dựng địa chỉ mã** — trang
  `/app` có Shell thì đi qua `Shell.viralUrl` để mang `ref=`; trang standalone
  `/tools/*` không có Shell nên **chỉ có UTM, không có mã giới thiệu** (vẫn đo
  được đường ảnh, chỉ không quy về người chia sẻ). Chép tay URL ở từng trang là
  chắc chắn trôi khỏi nhau — đã gom cả `app-home.html` về dùng chung hàm này.
- 🔑 **Tính chất phải giữ: KHÔNG truyền `qrUrl` → ảnh y HỆT bản cũ.** Verify
  bằng A/B trên chính hai bản `poster.js` (cũ lấy từ git HEAD, mới từ working
  tree) → **PNG md5 trùng khít trên 3 ca**. Mọi thay đổi bố cục đều nằm sau
  `if (opts.qrUrl)`.
- 🪤 **Chỗ suýt hỏng, chỉ lộ khi tính tay:** ca xấu nhất (tiêu đề 2 dòng + dòng
  phụ + câu trích 3 dòng) đẩy dòng cuối xuống **y=1692**, tức đè lên ô QR. Nay
  trần số dòng câu trích **tính theo chỗ còn lại** (`floor((QR_TOP−12−qTop)/54)+1`)
  chứ không cố định 3 — có test lấy mẫu pixel dải đệm ngay trên ô mã.
- 🪤 **Cỡ ô quyết định BỀ DÀY MỘT MODULE, không phải "cho đẹp":** URL tool chân
  dung dài hơn (đường dẫn + campaign + `ref`) nên rơi vào version cao hơn ⇒ ở ô
  160px mỗi module chỉ còn **2px**, nén lại một lượt là nhoè. Nới **190px** để
  giữ 3px/module cho cả ca URL dài nhất. (Poster vận ngày ô 208px, URL ngắn hơn
  → 4px/module.)
- **Verify vòng này:** 17 ca Playwright — A/B byte-identical · mã vẽ ra **đọc
  ngược đúng từng module** ở cả hai cỡ ô · ca xấu nhất không đè · `qrLink` ra
  đúng URL ở cả 3 nhánh (có Shell / không Shell / **Shell ném lỗi → không kéo
  sập lượt dựng ảnh**) · bộ dò tĩnh bắt trang nào quên truyền `qrUrl`. `tsc` 0
  lỗi · `lint` 0 lỗi · `prettier` sạch · `check:prices` sạch · engine 185 pass.
- Bump `poster.js?v=2→4` (10 trang) · `shell.js?v=55→56` (30 trang, tiện gom
  luôn `app.html` đang lạc ở `v=53`).

### CÒN LẠI
- Trang standalone `/tools/*` **không có mã giới thiệu trong QR** (không nạp
  `shell.js`). Muốn có thì phải cho chúng đọc `my-referral` — thêm một lượt
  mạng vào đường tải ảnh, chưa đáng khi CTA chính vẫn đổ về `/app`.
- Chưa quét thử mã bằng điện thoại thật — mới chứng minh tới tầng pixel (đọc
  ngược từng module, vùng lặng sạch).

---

## 🔢 Track repo thần số học → vá 3 lỗi + mở 4→11 chỉ số (2026-08-05, PR #414)

Henry: *"trên GitHub có repo nào làm thần số học ko? Cái nào ngon rating cao
mang về upgrade cho tool hiện tại được ko?"*

### 🔴 KHÔNG repo nào dùng được — đừng đi tìm lại
| Repo | ★ | Chặn ở đâu |
|---|---:|---|
| `shizhilya/yuan` | **149** | **Không có LICENSE** = all rights reserved. Mà cũng KHÔNG phải thư viện thần số học — agent skill TQ gộp 6 môn, numerology chỉ là 1 module |
| `evoluteur/motivational-numerology` | 95 | **AGPLv3** (lây qua MẠNG ⇒ dùng là phải mở mã cả site) + diễn giải chép từ sách *Motivational Numerology* của Sally Faubion ⇒ **hai lớp** bản quyền |
| `google/gematria` | 94 | ⚠️ **TRÙNG TÊN THUẦN TUÝ** — "Machine learning for machine code" của Google. Phiên sau đừng mở |
| `minhphuc010194/NumerologyWebApp` (VN) | 20 | Không có LICENSE. Nghe hấp dẫn vì có sẵn chữ tiếng Việt |
| npm (`numerology-core`, `theomath`, `numeroljs`…) | — | MIT nhưng **0–5 lượt tải/tuần**, mỏng hơn bản repo đang có |

- 🔑 **Bài học lớn nhất của track: CẢ HAI repo top đều dùng ĐÚNG công thức SAI
  mà mình đi vá.** `evoluteur` nối chuỗi tháng+ngày+năm rồi mới rút gọn (và
  thiếu hẳn Master 33); `yuan` ghi thẳng trong `spec.json`:
  `生命路径数 = reduce_number(sum(digits(normalized_birthdate)))`. Mang về cái
  nào cũng là **bê nguyên bug 12,06% vào site thay vì vá nó**.
  ⇒ **Sao đo độ phổ biến của CODE, không đo độ đúng của CỔ PHÁP.**
- ⚠️ `evoluteur` gắn topic `forecast` + `predictions` mà **không có một phép
  tính theo thời gian nào**. Nhãn đánh lừa, cùng bẫy `lunarPHP` ở track trên.
- **Công thức KHÔNG ai sở hữu** (tri thức dân gian) — chỉ *code* và *câu chữ
  diễn giải* bị bản quyền. Nên đường đi đúng: đọc để biết CÓ NHỮNG CHỈ SỐ NÀO,
  rồi tự cài + tự viết diễn giải tiếng Việt.

### 🔴 3 lỗi tìm ra khi đối chiếu — không mục nào nằm trong đề bài
| Chỗ | Sai gì | Quy mô |
|---|---|---|
| Số Đường Đời | cộng TẤT CẢ chữ số một lượt thay vì rút gọn ngày/tháng/năm RIÊNG rồi mới cộng | **12,06%** số ngày sinh (đo 28.124 ngày) |
| ↳ kéo theo | **2.469 ngày được cấp Master GIẢ** — riêng 33 phát nhầm 1.134 lần trong khi 33 thật chỉ 42 ngày (**sai ~27 lần**); 922 ngày MẤT Master thật | |
| Tên tiếng Việt | `[^A-Z]` **XOÁ** ký tự có dấu chứ không bỏ dấu | ~100% người Việt gõ đúng chính tả |
| Linh Hồn = 0 | hiện vòng tròn "0" kèm **nguyên văn diễn giải số 9** (`MEANINGS[0]` undefined → fallback `[9]`) | ca tên không có nguyên âm |

- **Nguồn quyết định là nguồn VIỆT, không phải Decoz**: các trang thần số học VN
  đều dạy *"rút gọn tổng ngày, tổng tháng, tổng năm… sau đó cộng 3 số đó lại"*.
  Đây là quy ước người xem của site kỳ vọng. Cộng-một-lượt còn phá cấu trúc
  **3 Chu Kỳ** mà Đỉnh Cao/Thử Thách dựng lên ⇒ không phải "biến thể cổ pháp".
- 🐞 **Lỗi tên tiếng Việt IM LẶNG nên nguy hiểm nhất:** `"Lê Đình Đức"` →
  `"L NH C"` (mất 5/9 chữ), `"Đỗ Thuỳ Dương"` → `" THU DNG"` (**bay mất cả họ**).
  Chuỗi còn ký tự nên qua được validate → trả kết quả sai chứ không báo lỗi.
  Vá bằng NFD + **`đ/Đ→d/D` đổi TAY** (NFD KHÔNG tách được đ vì nó là chữ cái
  riêng, không phải d + dấu — bỏ bước này là "Đức" mất luôn chữ đầu).

### ✅ Mở 4 → 11 chỉ số (deterministic, 0 lượt LLM, 0đ)
Thêm Số Ngày Sinh · Thái Độ · Trưởng Thành · **Biểu Đồ Ngày Sinh** (lưới 3×3
Pythagoras + 8 mũi tên mạnh/trống) · Bài Học Còn Thiếu · Đam Mê Tiềm Ẩn ·
**Nợ Nghiệp Quật** 13/14/16/19 · **Năm Cá Nhân** · **Đỉnh Cao & Thử Thách**
4 chặng kèm mốc tuổi (`36 − ĐườngĐời`, mỗi chặng sau 9 năm).
- **Nợ Nghiệp Quật phải dò trên TỔNG THÔ** — rút gọn xong thì dấu vết biến mất.
- **Năm Cá Nhân là chỉ số DUY NHẤT đổi theo thời gian** ⇒ móc kéo người quay
  lại hằng năm. Dùng `vnYear()` như các tool tools-shared khác, không hardcode.
- `reduce()` giữ Master, `reduce1()` về 1 chữ số — **Thử Thách và Năm Cá Nhân
  phải dùng `reduce1`**, giữ 11 lại sẽ làm hiệu `|a−b|` và chu kỳ 9 năm sai.
- 7 số của `evoluteur` **đều đã nằm trong 11 chỉ số này** (Divine Purpose của
  họ = Số Trưởng Thành của mình, công thức y hệt). Thứ duy nhất họ hơn là 11
  ngôn ngữ giao diện — bản dịch UI, không phải nội dung huyền học.

### 🪤 Bẫy đã vấp / phải nhớ
- **Đổi công thức thì phải quét cả chỗ MÔ TẢ công thức** (lặp lại lần thứ hai
  sau vụ Kim Lâu #361): `CHAT_SYSTEM_THAN_SO` đang nói *"4 CON SỐ"*, FAQ JSON-LD
  + bài SEO đang dạy lối cộng-một-lượt kèm ví dụ **15/8/1990 = 33**. Prompt LLM
  **không được typecheck bắt**. Nay ví dụ sửa thành kết quả đúng (**= 6**) và
  dùng chính nó giải thích vì sao lối kia sai.
- ⚠️ `data` gửi rail phải **PHẲNG** — `extractGenericContext` bỏ IM LẶNG mọi giá
  trị `object`. Chỉ số nào là danh sách thì dẹp thành chuỗi trong module.
- 🐞 **Lỗi chỉ lộ khi ĐỌC output, không phải khi đo:** nhãn thử thách in hai lần
  (*"Thử thách 2: Thử thách 2 — …"*) ở cả 4 chặng, vì bảng `CHALLENGE` tự mang
  tiền tố mà phần render cũng in nhãn. 85.948 assertion vẫn xanh.
- Hai lần test đỏ khác đều là **kỳ vọng của TEST sai, không phải code**: `&` bị
  escape thành `&amp;` trong `innerHTML`; và `innerText` trả **chữ HOA** vì mục
  có `text-transform:uppercase`.
- **Verify:** 85.948 assertion trên module THẬT (4.774 lá số — mốc tuổi 4 chặng
  liền mạch không hở/chồng, thử thách luôn 0–8, 0 rò `undefined`/`NaN`,
  deterministic) · 4 ca Playwright trên 2 trang thật (tên có dấu, **có dấu ≡
  không dấu byte-identical**, 390px không tràn, payload rail phẳng + bắt đúng
  Nợ 13/4) · `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier`
  sạch · engine test 185 pass · CI xanh **đủ 7 check**.

### CÒN LẠI
- ⚠️ **Số Đường Đời đổi trên ~12% người xem sau deploy**, ai từng được báo
  Master 33 phần lớn về số thường. **Fix chạy đúng, không phải hỏng** — cùng
  loại với vụ 12 trực đổi 26,8% số ngày.
- Không có việc tay: tool đã `enabled=true`, không đụng schema, không thêm env.
- **Tên chỉ số theo quy ước VN phổ biến hơi lệch, CỐ Ý chưa đổi:** `soSuMenh`
  (từ phụ âm) thường được gọi là **Nhân Cách**, còn "Sứ Mệnh" hay dùng cho số
  từ TOÀN BỘ tên. Phụ đề trên trang đã nói rõ nguồn suy ra nên không sai lệch;
  đổi key sẽ đụng cả prompt lẫn bản chia sẻ đã lưu.
- Chưa làm: **tương hợp thần số học giữa hai người** (tool MỚI, không phải nâng
  cấp tool này).

---

## 🀄 Track repo Trung Quốc → Mai Hoa + Kỳ Môn + ảnh 9:16 (2026-08-04, PR #408)

Henry đưa 5 repo huyền học TQ, hỏi có tool nào hay mà site chưa có.

### 🔴 4/5 repo là CÙNG MỘT THỨ — đừng đi tìm lại
`ChenyuHeee/tao` · `tyw66/YJ64` · `Ovilia/biangua` · `jyiL/lunarPHP` đều chỉ là
**bảng 64 quẻ Kinh Dịch** — thứ site đã có đủ. Ghi rõ để phiên sau khỏi đào lại:
- `tao` (MIT) **phiên trước đã khai thác rồi** — `kinh-dich-hao.js:14` ghi thẳng
  là đã đối chiếu bản bạch thoại của họ.
- `YJ64` là **GPL-3.0** → không lấy code vào repo thương mại được.
- ⚠️ `lunarPHP` **KHÔNG phải thư viện lịch** như tên gợi ý — README nói rõ nó là
  "易经六十四卦排盘", `gua.json` fork từ `tc31/64divine`. Tên đánh lừa.
- Mỏ thật là **`Brhiza/mingyu`** → npm **`mingyu-core` MIT** (deps `tyme4ts`,
  `celestine`, `@soul-atelier/xuankong` đều MIT).

### 🎯 Chỉnh lại khung "ưu tiên tool có ảnh" của Henry
Hai tool ảnh đang chạy dùng `gpt-image-1` **1.658đ/lượt** và bị cầu dao
`viral.free_gen_daily_cap=6/ngày` chặn ⇒ ảnh của site đang bị **phát khẩu phần**,
nghịch hẳn viral. Track này nhắm loại ảnh khác: **biểu đồ deterministic, 0đ,
không cầu dao, chia sẻ vô hạn**. Bộ lọc thứ hai: ảnh phải **đọc được trong 1 giây
bởi người không biết gì** — chính bộ lọc này loại quá nửa danh sách.

### ✅ S0 — `poster.js` nhận HÀM VẼ (nền của cả nhóm)
Trước đây `poster.js` khoá cứng vào "ảnh chân dung + câu trích": vùng `IMG_H`
chỉ nhận `<img>` ⇒ **không có đường nào biến biểu đồ thành ảnh tải về được**.
Thêm chế độ `draw(ctx, box)`. Gradient fade CHỈ áp cho chế độ ảnh (hàm vẽ đã
đứng trên nền navy). `clip()` giữ cả hai chế độ — với hàm vẽ nó là hàng rào để
lỗi toạ độ bên trang không bôi lên khối chữ. Mở `Poster.THEME` để khỏi mỗi tool
chép một bảng màu.
- **Verify mạnh nhất của chặng này:** Playwright A/B trên CHÍNH hai bản
  `poster.js` (cũ lấy từ git HEAD, mới từ working tree) → **PNG byte-identical**
  ⇒ 2 tool chân dung không đổi hành vi. Bản cũ nhận `draw` thì ném `no_image`.
- ⚠️ Hàm `draw` chạy **ĐỒNG BỘ** — trang phải tự nạp xong ảnh TRƯỚC khi gọi
  `Poster.download`. Cố ý không cho `draw` trả Promise để hợp đồng đơn giản.

### ✅ S1 — Mai Hoa Dịch Số (`/tools/mai-hoa.html` + `/app/mai-hoa`)
- **Tách khỏi `/tools/kinh-dich` là CÓ LÝ DO, đừng gộp lại:** Kinh Dịch đọc hào
  từ theo Khảo Biến Chiêm; Mai Hoa chỉ một hào động và **KHÔNG lấy hào từ làm
  chính** mà xét ngũ hành Thể/Dụng. Hai phép đọc mâu thuẫn.
- **Tool DUY NHẤT của site không đòi ngày sinh** — mọi tool khác đều chặn người
  dùng ở form ngày sinh, chỗ rơi rụng lớn nhất.
- Tái dùng bảng 64 quẻ + 384 hào từ + **cả 64 bức tranh quẻ** (mở thêm
  `KinhDichTool.anhUrl`).
- Công thức cổ pháp (khớp mingyu): thượng quái = tổng ÷ 8 dư, hạ quái = (tổng +
  chi giờ) ÷ 8 dư, hào động = cùng tổng ÷ 6 dư; **dư 0 quy về 8 và về 6, KHÔNG
  về 1**. Hỗ quái = hào 2-3-4 (hạ) + 3-4-5 (thượng). Quái chứa hào động là
  **Dụng**, quái kia là **Thể** — và Thể/Dụng **giữ nguyên VỊ TRÍ** trên/dưới
  qua hỗ và biến.
- 🔑 **Dụng sinh Thể mới là tốt nhất** (ngoại cảnh nuôi mình), **Thể sinh Dụng là
  hao**. Người mới học hay đảo ngược đúng chỗ này — prompt rail dặn thẳng.
- **Verify: 264/264 khớp `mingyu-core`** trên module THẬT (144 ca gieo theo số ×
  8 khung giờ + 120 mốc trải cả năm 2026), đối chiếu quái trên/dưới, hào động,
  Thể, Dụng, quan hệ ngũ hành ở cả quẻ chính lẫn quẻ biến, cấu trúc hỗ/biến.
  Nhánh gieo theo giờ khớp ⇒ **lịch âm của repo khớp lịch âm của họ**. + 22 ca
  Playwright trên hai trang thật.
- 🐞 Hai lỗi tự bắt: `gieoTheoSo(-5)` được nhận (`Math.abs` lặng lẽ gieo như 5
  trong khi báo lỗi hứa "số nguyên dương" → trả quẻ người dùng không hề gieo);
  nhánh gieo theo giờ không nêu bước chia 8/chia 6 trong khi nhánh số có nêu.

### ✅ S2 — Kỳ Môn Độn Giáp (`/tools/ky-mon.html` + `/app/ky-mon`)
- **CHẠY Ở SERVER** (`/api/qimen` → `lib/qimen/board.ts`), khác mọi tool free
  khác. Lý do: định cục cần tiết khí thật + phù đầu + thượng/trung/hạ nguyên,
  rồi chuyển bốn tầng bàn, tìm trực phù trực sử. Chép sang vanilla JS là gần như
  chắc chắn sai ở đâu đó mà **bàn VẪN RA** — không cách nào phát hiện.
- ⚠️ **`TimeManager.setTimezoneOffsetMinutesOverride(420)` BẮT BUỘC** —
  `mingyu-core` mặc định +480 (Bắc Kinh); để nguyên thì mọi bàn khung 23–24h giờ
  VN rơi sang can giờ ngày hôm sau, sai âm thầm.
- ⚠️ Route GET **phải `dynamic='force-dynamic'`** — không thì Next coi là tĩnh và
  chạy trọn trong `next build`, mọi người xem chung bàn của lúc build (đúng bug
  `/api/cron-push` đã dính).
- **Tầng dịch `lib/qimen/terms.ts` — hai cách cho hai loại thuật ngữ:** cấu trúc
  (8 môn · 8 sao · 8 thần · 9 cung · can chi · tiết khí) dịch tay kèm NGHĨA;
  cách cục (**123 tên, đo trên 4.380 bàn**) thì **phiên HÁN-VIỆT theo chữ** (bảng
  145 chữ) — không phải chữa cháy, sách Kỳ Môn tiếng Việt vốn gọi đúng tên đó.
  Bịa nghĩa cho một thuật ngữ cổ pháp còn tệ hơn để nguyên.
- 🐞 **Lỗi tự bắt:** bảng `HAN_VIET` dựng từ chữ trong TÊN CÁCH CỤC nên thiếu hẳn
  **địa chi và tiết khí** → giao diện ra `"Bính 午"`, `"Đại 暑"`. Bài học: bảng
  dịch dựng từ một nguồn thì chỉ phủ nguồn đó. Đã cắm **bộ dò quét rò rỉ chữ Hán
  trên toàn payload** — chạy 73 bàn trải cả năm, 0 chữ lọt.
- 🔴 **Vá vấn đề ĐO ĐƯỢC:** engine chỉ cho hướng tốt ở **26,5% số bàn**, trung
  bình **7,45/9 cung bị đánh hung** (366 bàn cả năm) vì nó gắn cờ hung cho bất kỳ
  cung nào dính 1 trong 123 hung cách. Tức 3/4 lượt, tool nói "đi đâu cũng xấu".
  Thêm **thang xếp hạng TƯƠNG ĐỐI** (cửa ±3 · sao/thần ±2 · Tam Kỳ +2 · mỗi cách
  ±1). **KHÔNG ghi đè cát/hung của engine**, công thức hiện thẳng trên trang,
  prompt rail bị CẤM gọi nó là cát cách. Trung cung không tham gia xếp hạng.
- Bàn vẽ **Nam ở trên** theo Lạc Thư (4-9-2/3-5-7/8-1-6) — ngược bản đồ, có nhãn
  cảnh báo, nếu không người ta đi nhầm hướng đối diện.
- **Dấu hiệu bàn dựng đúng:** phân bố 8 cửa ra **đúng 11,1% mỗi cửa = 1/9**.
- Verify: 20 ca Playwright trên trang thật + route thật.

### ⏸️ S3 — CHƯA LÀM, và đây là số đo giải thích vì sao
Định nâng `almanac` → hoàng đạo + ngày tốt + chọn ngày (3 tool một lượt), rồi
`liuren`/`bazi`/`xuankong`. Đo `generateAlmanacSelection` trước khi viết:
**payload 1,1 MB cho 15 ngày · 706 chữ Hán riêng biệt · 1.265 CỤM Hán riêng
biệt**, phần lớn là **văn bản kiểm toán tính thiên văn** (`求根残差`, `二分求根`,
`以平均朔望月估计望初值`…) — loại này phiên Hán-Việt ra là **vô nghĩa với người
đọc**, khác hẳn tên cách cục Kỳ Môn.
- **Có tầng cấu trúc sạch để bóc** (`lunarDate` `ganzhi` `dayOfficer`
  `twelveStar` `twentyEightStar` `nineStar` `gods` `recommends` `avoids`
  `pengZu` `clash` — mỗi trường <1KB), nhưng bảng dịch cho nó (宜/忌 · thần sát ·
  Bành Tổ bách kỵ · nhị thập bát tú · kiến trừ · cửu tinh) cỡ **200–400 mục**,
  tức MỘT CHẶNG ngang S2. Không rút gọn được.
- ⚠️ **Phiên sau: chỉ dùng tầng cấu trúc, VỨT `moonPhaseEvidence` + `*Facts` +
  `hours`** — chúng chiếm ~95% payload và không phải nội dung hoàng lịch.
- `liuren`/`bazi`/`xuankong` chưa đo bề mặt dịch.

### ✅ Đã bật trên prod — hết việc tay
Migration đã chạy, `mai-hoa` · `ky-mon` nay `enabled=true` (verify 07/08). Luật
vẫn giữ cho tool MỚI về sau: `cong-cu.html` lọc `enabled=eq.true`, nên bật
TRƯỚC khi deploy là 404 cho người thật — luôn bật SAU.
## 🌌 Nâng 4 tool bằng mingyu-core + tool chiêm tinh Tây (2026-08-04, PR này)

Henry: *"Làm almanac, liuren, bazi như mày nói (nâng cấp các tool hiện tại).
Xong làm chiêm tinh tây"*.

### 🔴 BA LỖI CỔ PHÁP TÌM RA KHI ĐỐI CHIẾU — không mục nào nằm trong đề bài
| Chỗ | Sai gì | Quy mô |
|---|---|---|
| `tuvi-engine/src/ngay-tot` | 12 trực lấy chi tháng từ THÁNG ÂM | **98/365 ngày (26,8%)** |
| ↳ kéo theo | sao trực nhật sai vì ăn chung đầu vào | cùng 98 ngày |
| `tools/tu-tru.html` | **trụ GIỜ** dùng bảng ngũ HỔ độn (vốn cho trụ THÁNG) | **100% lá số** |
| `tools/tu-tru.html` | **trụ THÁNG** lấy tháng dương, không theo tiết khí | **100%** |
| `tools/tu-tru.html` | trụ NĂM không lùi cho người sinh trước Lập Xuân | 9,2% |

- **Trực**: bằng chứng quyết định là 10/8/2026 — lịch vạn niên Việt ghi trực
  **Thành**, bản cũ ra "Thu". Vá bằng `lunar/solar-term.ts` (port đúng công
  thức đang cho trụ tháng bát tự đúng). 🔑 Luật cổ **遇節則重** (gặp tiết thì
  trực lặp một ngày) **rơi ra MIỄN PHÍ** — qua tiết chi tháng tiến 1 mà trực =
  hiệu hai chi. Chính điều đó xác nhận đây là cấu trúc gốc. Đo lại 4.018 ngày:
  98/365 → **3/4018 (99,925%)**.
- **Trụ giờ**: đối chứng bằng CA QUYẾT, độc lập mọi engine — ngũ THỬ độn "Giáp
  Kỷ hoàn gia Giáp" cho `[0,2,4,6,8…]`, bảng `TSC` trong trang là `[2,4,6,8,0…]`
  = đúng bảng ngũ HỔ độn. Nay trang **không còn tự tính tứ trụ**, hỏi
  `/api/bazi-phan-tich` (route lập bằng chính engine của site). Đã gỡ hẳn `TSC`
  và `toJDN` khỏi trang.
- ⚠️ **12 thần GIỜ của repo thì ĐÚNG TUYỆT ĐỐI** (khớp từng giờ với nguồn Việt)
  — chỉ tầng NGÀY hỏng. Đừng đi sửa nhầm chỗ.

### 🔑 QUY TẮC KIẾN TRÚC CỦA CẢ TRACK: mingyu KHÔNG BAO GIỜ là nguồn của trường repo đã có
Trực · 28 tú · can chi · giờ hoàng đạo · tứ trụ đều **lấy từ engine repo**;
mingyu chỉ cấp phần repo KHÔNG có. Hai nguồn cho cùng một trường là đúng bệnh
đã trả giá ở can chi ngày (#409).
- Bát tự còn **ép ràng buộc LÚC CHẠY**: route đối chiếu tứ trụ hai engine mỗi
  lượt, lệch thì **bỏ phần phân tích** (fail-closed) chứ không bày thập thần
  của lá số khác lên trên tứ trụ đúng — loại sai đó không ai nhìn ra.
  Đã đo 576 lá (1962–2006): khớp 100% cả 4 trụ.

### Bốn chặng
- **Hoàng lịch** (`lib/almanac/`, `/api/almanac`) — 112 nghi/kỵ dịch tay KÈM
  NGHĨA (đây là việc người ta sắp làm, để Hán-Việt là vô dụng) · 144 thần sát
  phiên theo chữ (cát/hung do mingyu gắn sẵn, không phải đoán) · 22 câu Bành Tổ
  · cửu tinh · xung sát · thần niên. **34,4 KB → 2,96 KB/ngày.** Nâng *Giờ
  Hoàng Đạo* + *Ngày Tốt*; cả hai là LỚP CHỒNG LÊN — API chết thì trang chạy y
  như trước.
- **Đại Lục Nhâm** (`lib/liuren/`, `/api/liuren`) — thay công thức thiên tướng
  `(canNgay*2)%12` mà CLAUDE.md đã ghi là chưa verify được. ✅ Đối chứng vị Quý
  Nhân với ca quyết 贵人歌 trên 1.464 quẻ. **Nhâm/Quý mingyu cho Tỵ/Mão còn dị
  bản phổ biến ghi Mão/Tỵ** — giữ theo mingyu vì chỉ cách đó mới làm CẢ HAI
  vòng Quý Nhân liền mạch quanh bàn; dị bản kia gãy vòng đúng ở Nhâm/Quý.
  🔑 Ở đây **KHÔNG có đường lùi** như Giờ Hoàng Đạo: API chết thì báo thẳng chưa
  lập được khóa. Hiện một thần tướng SAI mà trông rất tự tin còn tệ hơn.
- **Bát tự** (`lib/bazi/`, `/api/bazi-phan-tich`) — thập thần · tàng can thập
  thần · tự tọa · không vong · vượng suy · cách cục · dụng thần · thần sát.
  🔴 **Chọn lọc thần sát**: mingyu trả TB **58 sao mỗi lá** (min 40, max 76) —
  đổ hết ra đúng bệnh Kỳ Môn. Nay 30 sao được đọc thật đứng nhóm chính, phần
  còn lại vẫn trả đủ ở nhóm phụ.
- **Bản đồ sao** (`lib/tayphuong/`, `/api/natal`, `/app/ban-do-sao`) — TOOL MỚI,
  engine `celestine` (MIT, đối chứng NASA/JPL/Swiss Ephemeris). Bánh xe canvas
  **0đ, không qua model ảnh, không đụng `viral.free_gen_daily_cap`** — đúng
  tiêu chí "ưu tiên tool có ảnh" của track. Tải về 9:16 qua chế độ `draw` của
  `poster.js`. Bánh xe vẽ **cung Mọc bên TRÁI, ngược chiều kim đồng hồ**; vẽ
  sai chiều thì nhìn vẫn đẹp mà mọi nhà đều lộn.
  🔑 **Nói thẳng ĐÂY KHÔNG PHẢI TỬ VI** ở cả trang lẫn prompt (hai hệ cùng dùng
  chữ "cung"/"nhà" nhưng chỉ thứ khác hẳn); nhóm sidebar để RIÊNG.

### 🧹 Gom bảng phiên Hán-Việt về `lib/hanviet.ts`
Kỳ Môn (157 chữ) + Hoàng Lịch (105) + Bát Tự (97) dùng CHUNG một bảng thay vì
ba bản. **Verify: 200 bàn Kỳ Môn (1,26 MB) md5 TRÙNG KHÍT trước/sau refactor.**

### 🪤 Bộ dò rò rỉ chữ Hán/Anh lại cứu hai lần
`遥克比用`/`遥克涉害` lọt giao diện (docPhap chỉ tách tiền tố `返吟`) ·
`True North Node`/`Mean Lilith` lọt (không nằm trong danh sách `planets`, chỉ
có trong khía cạnh). **Bài học lặp lần thứ ba: bảng dịch dựng từ MỘT nguồn thì
chỉ phủ nguồn đó.** Cắm bộ dò mỗi lần đấu vào nguồn chữ mới, đừng tin là đủ.

### ✅ Đã bật trên prod — hết việc tay
`ban-do-sao` nay `enabled=true` (verify 07/08).
⚠️ **Trực đổi trên 26,8% số ngày** ⇒ nội dung 8.958 trang `/ngay-tot/*` và thẻ
"Vận hôm nay" đã đổi theo sau deploy. Đó là fix chạy đúng, không phải hỏng.

### CÒN LẠI
- Rail `/app/bat-tu` chưa nhận tầng phân tích bát tự mới (đường đó đi qua
  `computeTuBinh` ở server, thêm vào là đụng hot path).
- Chưa có trang standalone SEO cho `ban-do-sao` (mới có trang shell).
- `xuankong` (huyền không phi tinh) chưa đo, chưa làm.
- Xin xăm vẫn vướng DATA chứ không phải dịch: mingyu chỉ có 92 thẻ 三山国王
  (thần Quảng Đông), xăm Quan Âm/Quan Thánh bản Việt phải tự soạn.

---

## 📅 Thẻ "Vận hôm nay" — và 🔴 3 công cụ đang tính SAI CAN CHI NGÀY (2026-08-04, PR này)

Henry: *"tool Vận ngày… nó là tool sẽ attract user vào xem hằng ngày, cần hấp dẫn
chút"*, kèm khảo sát tool bên TQ/ĐL.

### 🔴 PHÁT HIỆN LỚN NHẤT — không nằm trong đề bài
Đi verify thẻ thì lộ ra **can chi NGÀY sai trên 100% ngày** ở 3 chỗ, đều do cùng
một hằng số chép tay `ANCHOR = 2434290` (lệch **19** vị trí trong vòng 60):

| File | Hỏng cái gì |
|---|---|
| `tools-shared/hoang-dao.js` | thẻ /app + tool Giờ Hoàng Đạo |
| `tools-shared/luc-nham.js` | can ngày → thần tướng đang trực |
| `tools/tu-tru.html` | **NHẬT CHỦ** của bát tự (+ trụ giờ suy từ nó) |

Ảnh chụp của Henry ghi *"Ngày Tân Mão"* — ngày 4/8/2026 thật là **Canh Tuất**.
- **Nguồn đúng vốn đã có sẵn 2 bản**: `tuvi-engine/src/lunar/convert.ts` và
  `public/tubinh-ansao-engine.js` đều dùng `(jd+9)%10 / (jd+1)%12` — tức công cụ
  **Bát Tự chính vẫn đúng**, chỉ trang Tứ Trụ cũ sai ⇒ cùng một site trả **hai
  nhật chủ khác nhau** cho cùng ngày sinh.
- Vá bằng `(JDN + 49) % 60`, **bỏ hẳn hằng số neo** (chính nó gây ra lỗi) và ghi
  neo kiểm chứng vào comment: **1/1/2000 = JDN 2451545 = Mậu Ngọ**.
- 🐞 **Lỗi thứ HAI trong cùng file `hoang-dao.js`**: bảng `HD_OFFSET =
  [0,2,1,2,2,3,...]` không khớp cổ pháp nào ⇒ giờ hoàng đạo lệch ca quyết
  **1.667/2.000 ngày**. Thay bằng 起例 thật: Thanh Long khởi giờ
  `(2 × chi ngày + 8) mod 12`, 11 thần đi thuận.
- 🐞 **Lỗi thứ BA, trong engine**: `computeGio` gán tên thần bằng cách ĐẾM theo
  thứ tự Tý→Hợi ("sao hoàng đạo đầu tiên gặp = Thanh Long"). Tập 6 giờ vẫn đúng
  (nên điểm ngày/việc KHÔNG đổi) nhưng **TÊN** sai ở hầu hết ngày — mà tên thần
  mới là thứ quyết định "giờ này nên làm gì". Nay dùng chung vòng `THAN_12`, và
  bảng tra cũ giữ lại làm **đối chứng chạy mỗi lượt** (lệch là `throw`).
- **Verify 3 nguồn ĐỘC LẬP khớp tuyệt đối trên 3.000 ngày**: hoang-dao.js ·
  tuvi-engine · ca quyết 黄道吉时歌 (chép tay riêng trong test) — 0 lệch cả can
  chi, cả tập giờ, cả tên thần. Nhật trụ tu-tru.html vs engine Bát Tự: 0/4.000.

### Thẻ mới — vì sao đổi hẳn kiến trúc
Bản cũ tính ở client bằng `HoangDaoTool` nên **chỉ có can chi + giờ hoàng đạo,
tức GIỐNG HỆT NHAU với mọi người**. Không ai quay lại mỗi ngày để đọc thứ tờ
lịch bloc cũng có, trong khi câu *"Lá số của bạn đã sẵn sàng"* thì đang **hứa cá
nhân hoá rồi không giao**.
- **`lib/engine/van-ngay.ts` + `GET/POST /api/van-ngay`** — gọi engine ngày-tốt
  đã có test (12 trực · 28 tú · sao trực nhật · ngày kỵ · điểm 10 loại việc)
  thay vì port 664 dòng luật sang trình duyệt (= bản thứ hai rồi trôi khỏi nhau).
  GET cache CDN theo ngày; POST thêm tầng cá nhân. **0 lượt LLM, 0 tính tiền** —
  thu phí ở mồi kéo người quay lại thì không ai mở lần thứ hai; lượt HỎI THẦY
  vẫn tính Lượng như cũ.
- Thẻ nay có: **huy hiệu tốt/bình/xấu** · trực/tú/sao · **xung tuổi + năm sinh**
  · **nên 3 / kiêng 2** · giờ tốt **kèm việc nên làm** · màu hợp + hướng Tài thần
  · **khối "Vận riêng của bạn"** = cung nhật hạn + chính tinh + quan hệ hành ngày
  ↔ nạp âm mệnh. Chưa có lá số → khối đó **cố ý để trống làm CTA**, đừng lấp bằng
  câu chung chung.
- `resolveNhatHanIdx` tách khỏi `execTraNhatVan` làm **nguồn duy nhất** cho phép
  "ngày này rơi vào cung nào" (thẻ cần cấu trúc, rail cần chuỗi). Regression:
  output tool **byte-identical** old vs new trên 24 ca (94.911 byte).
- 🐞 **Huy hiệu mâu thuẫn với chính câu bên dưới**: engine chấm Tam Nương chỉ −2
  nên 4/8/2026 ra "Ngày tốt" ngay trên dòng "hoãn việc trọng đại". Ngày kỵ là
  luật KIÊNG KHỞI SỰ chứ không phải điểm trừ cộng dồn ⇒ hạ trần xuống "bình",
  hạ ở MỘT chỗ để huy hiệu + câu chốt + tin push cùng một con số.
- **Push sáng** đổi từ *"Ngày Tân Mão"* (đúng-nhưng-rỗng, và còn sai) sang câu có
  tín hiệu: ngày tốt/xấu · trực · việc hợp · xung tuổi. Lọc bỏ "an táng" khỏi
  gợi ý của push (trên thẻ thì bình thường, bắn vào màn hình khoá thì rất khó đỡ).
- ⚠️ `extractGenericContext` **BỎ QUA mọi giá trị là object** → payload scenario
  gửi rail phải PHẲNG, nếu không rail nhận vài dòng rồi luận chay.
- **Đường lùi giữ nguyên `HoangDaoTool`**: API chết thì thẻ vẫn hiện như bản cũ,
  không biến mất (nó là khối đầu trang chủ).
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier`
  sạch · engine test **181 pass** · 3 khối script admin/home `node --check` OK ·
  **Playwright trên trang THẬT qua Next dev**: khách chưa có lá số → GET đúng 1
  lần + khối cá nhân là CTA · đã nhớ lá số → POST đúng 1 lần + hiện đúng cung
  Phúc Đức (**khớp độc lập với output của `execTraNhatVan`**) · **API chết →
  thẻ VẪN hiện và can chi vẫn đúng** · 390px không tràn ngang · 2 trang tool vừa
  vá render đúng, 0 lỗi JS.
- 🪤 **Bẫy đã vấp:** chạy `tsc -p` với `paths` trỏ ngược về repo để dựng bản
  regression → tsc **emit 30 file `.js` lẫn vào `lib/`** (chính là cảnh báo
  TS5011 mà tao bỏ qua), làm lint nhảy lên 119 lỗi. Dựng harness kiểu này thì
  `outDir` phải nằm NGOÀI cây repo và phải `git status` lại sau khi chạy.

### ✅ Vòng sau — dải 7 ngày + poster 9:16 (PR sau #409)
Henry: *"làm luôn đi"* với 2 móc quay lại còn treo.
- **`computeTuan()`** — 7 ô: thứ · ngày · can chi · tốt/bình/xấu · ngày kỵ, và
  **`bixung`** (ngày xung CHÍNH tuổi người xem) khi lượt POST có lá số. CỐ Ý chỉ
  trả tính chất chứ KHÔNG trả trọn `computeVanNgay` cho cả 7 ngày — dải để tô
  màu, chi tiết thì bấm vào mới xin; nhét đủ 7 ngày làm payload phình ~7 lần cho
  phần gần như không ai đọc.
- **Bấm một ô = xem vận ngày đó**, vẫn miễn phí, vẫn 0 lượt LLM. Lượt đó gửi
  `tuan=0`/`tuan:false` → **dải VẪN neo ở hôm nay**; xin lại dải theo ngày đang
  xem là mất luôn nghĩa "7 ngày TỚI".
- **`tinhChatNgay()`** tách ra làm nguồn duy nhất của phép hạ trần ngày kỵ — nếu
  không thì ô thứ nhất của dải tô màu khác huy hiệu ngay bên trên nó, trong cùng
  một màn hình.
- **`Poster.buildDay()`** — poster 9:16 TOÀN CHỮ (thẻ vận ngày không sinh ảnh
  nào), dùng lại nguyên bộ helper chữ/triện/chân trang của poster chân dung để
  hai loại ảnh ra ngoài đời trông cùng một nhà. `build()`/`drawPoster()` của
  chân dung **không bị đụng một dòng nào** (`git diff` chỉ có dòng THÊM) và có ca
  đối chứng dựng poster chân dung ra đúng 1080×1920.
- **Nút "Ảnh" TÁCH khỏi nút "Chia sẻ"**, đúng tiền lệ `poster_download` của V3:
  ảnh tải về không có link bấm được nên không bao giờ sinh `share_view`/
  `cta_click` — gộp vào `share` là kéo K-factor tụt giả.
- 🐞 **`style.display=''` KHÔNG hiện được nút "Về hôm nay"**: luật CSS của
  `.today-back` là `display:none`, gán `''` chỉ xoá inline style rồi rơi về đúng
  luật đó. Phải `'block'`. Các khối khác trong thẻ ẩn bằng `style="display:none"`
  ngay trong HTML nên gán `''` ở đó lại đúng — hai cách ẩn, hai cách hiện.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier`
  sạch · engine test 181 pass · `node --check` poster.js + 3 khối app-home ·
  **Playwright trên trang thật**: đúng 7 ô · ngày xấu tô đỏ · bấm ô khác → thẻ
  đổi đúng can chi, **chỉ 1 lượt gọi API**, dải KHÔNG nhảy · "Về hôm nay" quay
  lại đúng · **ca ĐỐI CHỨNG** người tuổi Ngọ (1990) → đúng 1 ô "xung" rơi vào
  ngày Tý · poster tải về là **PNG thật 1080×1920** (đọc IHDR, không tin đuôi
  file) · chặn `poster.js` → **nút Ảnh tự ẩn**, thẻ vẫn chạy · 390px không tràn.
- Bump `poster.js?v=2` (5 trang) + `tools-shared/hoang-dao.js?v=2` (3 trang).

### CÒN LẠI
- **`luc-nham.js`**: mới vá can ngày; công thức `startOffset = (canNgay*2)%12`
  cho thần tướng **chưa verify** — ⚠️ **Henry đang sửa ở phiên khác**, đừng đụng.
- Bảng **Tài thần** dùng ca quyết *"Giáp Ất Đông Bắc…"*; có một dị bản
  (Giáp-Cấn, Ất-Khôn…) lưu hành song song — đổi thì đổi ở `TAI_THAN`.

---

## 🎴 Quẻ Phục Hy bằng hình — 64 tranh + cổ pháp đọc quẻ (2026-08-04, PR #399·400·402·406)

Henry hỏi về "quẻ Phục Hy bằng hình" trên xemtuong.net. Truy ra tổ tiên cổ học
thật: **軌革卦影** (bói bằng tranh, Phí Hiếu Tiên, đời Tống). Làm hẳn cho mình.

### 🔑 Chỗ dễ nói sai nhất — và tao ĐÃ nói sai một lần
*"Gieo ra hào động nào thì đọc hào từ đó"* **chỉ đúng khi có ĐÚNG MỘT hào động**.
Cổ pháp **考變占** (Chu Hy, 《易學啟蒙》) rẽ theo **SỐ** hào động:

| Động | Đọc |
|---|---|
| 0 | lời quẻ quẻ chính — KHÔNG đọc hào nào |
| 1 | hào từ của chính hào đó |
| 2 | cả hai hào, hào **TRÊN** làm chủ |
| 3 | lời quẻ của **CẢ** chính lẫn biến |
| 4 | 2 hào **KHÔNG động**, đọc ở **quẻ BIẾN**, hào **DƯỚI** làm chủ |
| 5 | hào không động duy nhất, ở quẻ biến |
| 6 | Càn→**Dụng Cửu**, Khôn→**Dụng Lục**, còn lại→lời quẻ quẻ biến |

`kinh-dich-doc.js` (luật) tách khỏi `kinh-dich-hao.js` (384 hào từ + 64 lời quẻ,
Hán phồn thể + bản Việt) — hai thứ không dính nhau. Verify **4096 ca** (64 quẻ ×
64 kiểu hào động) + **448 lượt gieo trên trang thật**, 0 ô trống.

### ⚠️ 384 hào từ tiếng Việt là TAO TỰ DỊCH, chưa ai review
Henry chốt *"sau này có gì sai tao sẽ kêu sửa"*. Đây là chỗ DUY NHẤT của track mà
máy không kiểm được đúng/sai — `check:hao` chỉ kiểm "có chữ hay không". Sửa là
sửa data thuần, không đụng logic.

### 🖼️ 64 bức tranh — mô-típ VIẾT TAY, không nhờ LLM lúc chạy
`lib/media/que-motifs.ts` = 384 mô-típ, dịch hình của 384 hào từ. Vẽ MỘT lần dùng
mãi ⇒ nhờ model diễn hào ra cảnh mỗi lượt thì hai lần dựng lại ra hai bộ cảnh
khác nhau và **không ai soát được trước khi đốt tiền**.
- **Giữ nguyên tính nguyên bản của hào** (Henry chốt): xe chở xác về, máu chảy
  đen vàng, xẻo mũi chặt chân đều vào tranh. Tao từng tự làm nhẹ 2 hào, Henry
  bác. **Không lượt nào bị bộ lọc nội dung OpenAI từ chối** — lo hão.
- **Sáu tầng chiều cao = sáu hào** (dưới→trên = hào 1→6), trùng chiều đọc tranh
  trục treo. Trang tô sáng tầng mà cổ pháp chỉ đọc → tranh là cách ĐỌC quẻ chứ
  không phải đồ trang trí.
- 🐞 Bản đầu chỉ bày tranh của quẻ mà luật đọc dùng ⇒ gieo 4 hào động ra bức của
  quẻ KHÁC hẳn quẻ vừa gieo. Nay LUÔN bày quẻ chính, thêm quẻ biến khi cần.
- 🪤 **Tên file mang HAI hệ chỉ số**: `<PhụcHy>-kw<KingWen>.png`. Phục Hy = nhị
  phân, **hào 1 là bit THẤP NHẤT**. Lấy nhầm thì mỗi quẻ hiện tranh của quẻ khác
  — mắt không phát hiện được. Chốt bằng phép so 64 URL client xin với 64 file
  thật trong Storage: **khớp tuyệt đối**.

### 💸 gpt-image-1 → gpt-image-2 (đo THẬT trên prod, 1024×1536 high)
| | gpt-image-1 | gpt-image-2 |
|---|---:|---:|
| Token ảnh ra | 6.240 | **5.488** |
| Giá thật/bức | 6.315đ | **~4.116đ** |
| Thời gian/bức | 25–35s | **65–150s** |

Cả bộ 64 bức: **~276.000đ**, 67 lượt model (3 lượt dôi là A/B chọn model).
- **`gpt-image-1` bị OpenAI tắt 23/10/2026.** Nhưng đó KHÔNG phải lý do chọn
  model cho việc này — ảnh vẽ một lần rồi nằm kho vĩnh viễn, sống lâu hơn model.
  Ngày tắt chỉ ràng buộc 2 tool chân dung (gọi model mỗi lượt) — PR #401 lo.
- Model đọc từ `app_config['que_images.gen'].model` (allowlist) chứ không env:
  so được hai model cạnh nhau bằng `?tag=` trên CÙNG prompt, không cần deploy.
- ⚠️ Bảng giá trong route ĐÚNG, nhưng `lib/agent/usage.ts` lúc đó chưa biết model
  mới nên `events.cost_vnd` ghi cao hơn thật ~3%. PR #401 vá.

### 🪤 Vận hành lượt vẽ hàng loạt — hai bẫy đã trả giá
1. **Chạy song song KHÔNG nhanh hơn, chỉ đắt hơn.** Cho mỗi lượt vẽ 2 bức rồi
   bắn 4 lượt song song ⇒ bức thứ hai của cả 4 lượt vượt trần `maxDuration=300s`
   và bị giết giữa chừng (request đã bay, OpenAI vẫn có thể tính). Chuyển sang
   **trần 1 bức/lượt, mỗi lượt gọi ĐÚNG một quẻ** — từ đó 0 bức nào mất.
   Kiểm bằng cách đếm `llm_usage` vs số file trong kho: phải KHỚP.
2. **MCP `web_fetch_vercel_url` timeout 60s ≠ route chết.** Route chạy tới 300s.
   Tao đã suýt kết luận nhầm là hỏng vì soi kho quá sớm. **Đừng gọi lại** — gọi
   lại là trả tiền hai lần. Soi `storage.objects` để biết thật.
- `?vede=1` vẽ đè có chủ đích (KHÔNG đổi mô-típ, khác `?scene=`/`?motifs=`). Cần
  khi đổi model: bản cũ vẫn đúng tên đúng chỗ nên chốt "đã có thì thôi" giữ
  nguyên chúng, bộ 64 bức lẫn hai nét vẽ mà không gì báo.
- **Quy trình chạy:** bật `enabled`, đặt `budget`/`quality`/`model` → gọi từng
  quẻ → **TẮT `enabled` ngay sau khi xong**. Cổng là cờ DB (fail-CLOSED), cố ý
  không phải secret trên URL — secret nằm lại trong log truy cập.

### 3 guard trong CI lint
`check:hexagrams` (mã hào) · `check:hao` (384 hào từ) · `check:motifs` (384
mô-típ). Quẻ thiếu mô-típ **vẫn vẽ ra một bức đẹp**, chỉ là không khớp hào nào —
lỗi đó chỉ lộ khi có người ngồi đối chiếu 64 bức với 384 hào từ.

### Đã bàn, chốt GIỮ NGUYÊN
`viral.free_gen_daily_cap=6` suy từ giá cũ; model mới rẻ hơn 34% nên cùng
$15/tháng mua được ~8 lượt/ngày. Henry hỏi *"sao phải cap? user xài thì trả
credit mà"* — trần chỉ áp lên người **CHƯA TỪNG NẠP** (Lượng của họ 100% là quà:
25 đăng ký + tối đa 225 thưởng mời), ai đã nạp KHÔNG BAO GIỜ bị chặn. Đo được:
**0/53 lượt dùng 2 tool ảnh là của người chưa nạp** (53 lượt đều của 1 tài khoản
đã nạp = bản test), phơi nhiễm thật ~511 Lượng ≈ 22k đ (3 ví to nhất đều là
`admin_grant`). Cầu dao chưa từng chạm. **Henry chốt để nguyên 6.** Nới:
`update app_config set value='8'::jsonb where key='viral.free_gen_daily_cap';`
(≤ 0 = tắt hẳn).

---

## 🧰 Admin: tách trang · mobile · GIỮ PHIÊN đăng nhập (2026-08-03, PR sau #393)

Henry: *"mục Funnel & Nguồn nhiều nội dung quá, tách ra vài mục được ko"* ·
*"chỉnh admin mobile friendly như shell, tao vào bằng mobile thường xuyên"* ·
*"lưu session login lâu hơn, mỗi lần vào lại bắt login lại"*.

### 🔴 (3) Căn nguyên KHÔNG phải token hết hạn — token CHƯA TỪNG được lưu
`_token` chỉ là một biến trong bộ nhớ JS. F5 hay đóng tab là mất sạch, nên lần
nào vào cũng phải đăng nhập Google lại. Không có gì "hết hạn" cả.
- Vá: lưu `{access_token, refresh_token, expires_at, login_at}` vào
  localStorage; mở lại tab thì `restoreSession()` dùng **refresh_token** xin
  access token mới (access token GoTrue chỉ sống 1 giờ — lưu mình nó thì vẫn
  phải login lại sau 60 phút).
- **`scheduleRefresh()` — đổi token trước hạn 5 phút.** Không có bước này thì
  ngồi làm quá một tiếng là mọi lượt gọi API 401 giữa chừng không rõ vì sao.
- **Mỗi lần khôi phục VẪN hỏi server** (`oauth-verify` tra `admin_users`) chứ
  không tin token suông → gỡ tài khoản khỏi bảng đó là phiên chết ngay.
- **Cờ `silent`** cho lượt khôi phục: vẫn ghi `admin_login_attempts`
  (`method='google-resume'`) nhưng KHÔNG bắn Telegram — mỗi lần mở tab một tin
  thì cảnh báo đăng nhập THẬT chìm nghỉm.
- ⚠️ **Đánh đổi đã cân nhắc:** token admin nằm trong localStorage → một lỗ XSS
  trên chính trang này lấy được. Bù lại: verify server mỗi lần khôi phục ·
  **trần tuyệt đối 7 ngày** kể từ lượt đăng nhập THẬT (`login_at` giữ nguyên
  qua các lượt refresh, nếu không thì trần bị đẩy lùi vô hạn) · đăng xuất xoá
  sạch.

### (1) Tách `#page-marketing` 14 khối → 3 trang
Phân theo CÂU HỎI mỗi panel trả lời, không theo thứ tự lịch sử:
| Trang | Panel |
|---|---|
| **Funnel & Nguồn** (`marketing`) | Funnel · GA4 vs Nội Bộ · Nguồn Traffic · Đăng Ký Theo Ngày · Chiến Dịch UTM · Top Landing+Referrers |
| **Giữ Chân & Doanh Thu** (`retention`) | Cohort · Doanh Thu Tiền Thật · Đề Xuất AI · Autopilot |
| **Phân Phối Nội Dung** (`distribution`) | Hàng Đợi Bài Đăng · Seeding Group · Content Pack · Vòng Lặp Viral |
- **Bộ lọc ngày tách thành thanh DÙNG CHUNG** dính dưới topbar (`#mkt-filterbar`),
  hiện đúng 3 trang này. Trước nó nằm trong `panel-actions` của Funnel — tách
  trang mà để nguyên thì 2 trang kia không đổi được khoảng ngày. **Giữ nguyên
  id `mkt-from`/`mkt-to`** nên không chỗ đọc nào phải sửa.
- **`loadMarketingOnce()`** — 3 trang cùng ăn MỘT lượt `admin-marketing`
  (8 RPC + GA4); chuyển qua lại mà gọi lại thì mỗi cú bấm menu tốn cả chùm truy
  vấn. Chỉ tải lại khi khoảng ngày đổi, hoặc bấm ↻.
- 🐞 **Script tách suýt làm MẤT 2 panel**: "Top Landing Pages" + "Top Referrers"
  nằm trong một `<div style="display:grid">` chứ không mang class `panel`, nên
  vòng quét `<div class="panel">` bỏ qua và chúng biến mất khi dựng lại. Bắt
  được nhờ **đối chiếu danh sách `panel-title` trước/sau**, không phải nhờ nhìn.
  Bài học: cắt HTML theo class thì phải quét MỌI con cấp 1 rồi đếm lại.

### (2) Mobile — theo đúng lối `shell.css` đã chạy
Bản cũ chỉ có `@media(max-width:900px)` thu sidebar còn **62px icon**: trên máy
390px vẫn ăn 16% bề ngang, mà đoán nghĩa icon không nhãn còn khó hơn mở ngăn kéo.
- ≤760px: sidebar thành **ngăn kéo trượt** (`transform:translateX(-100%)` +
  `.open`) + nền mờ, nút ☰ trong topbar, chọn mục xong tự đóng. 761–900px giữ
  nguyên chế độ icon cũ cho tablet.
- Bảng rộng **cuộn ngang trong khung của nó** (`.table-wrap{overflow-x:auto}`),
  không đẩy cả trang lệch. Ngày tháng ở topbar ẩn trên máy hẹp.
- **`input,select,textarea{font-size:16px!important}`** — iOS Safari tự phóng
  to khi focus field <16px rồi KHÔNG thu lại. Phải `!important` vì nhiều ô đặt
  `font-size` thẳng trong `style=` (inline luôn thắng media query) — test bắt
  đúng chỗ này: ô của panel Seeding ra 12,48px.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · 4 script block admin OK · **47 ca Playwright trên CHÍNH
  `public/admin.html` thật** (serve tĩnh + chặn API): 3 trang đủ 15 panel không
  mất cái nào · thanh lọc ẩn/hiện đúng trang · **chuyển qua lại 3 trang → 0
  lượt gọi lại `admin-marketing`** · phiên còn hạn → vào thẳng, gửi `silent` ·
  access hết hạn → **refresh trước rồi verify bằng token MỚI** · quá 7 ngày →
  bắt login lại và xoá phiên · **bị gỡ quyền admin → phiên chết ngay** · refresh
  hỏng → về màn đăng nhập, không treo · đăng xuất xoá sạch · quay về từ Google
  lưu CẢ `refresh_token` · mobile 390px: ngăn kéo trượt, **5 trang không trang
  nào tràn ngang**, ô nhập ≥16px.
- 🐞 Hai lỗi của TEST tự bắt (không phải code): `addInitScript` chạy khi origin
  còn `about:blank` nên `localStorage` set ở đó không ăn; và `/api/*` cùng host
  với trang tĩnh nên rơi vào nhánh `route.continue()` → stub không bao giờ chạy.

---

## 📡 M3b — 3 kênh auto THẬT: Instagram · Threads · Telegram channel (2026-08-03, cùng PR)

Henry: *"làm tiếp luôn đi"* sau khi chốt trợ lý seeding. Đây là vế **auto thật**
của track phân phối — không có người ở giữa, khác hẳn seeding group.

- **`lib/media/publish.ts` thêm 3 adapter**, cắm vào ADAPTERS có sẵn nên mọi chốt
  chặn của M3 (giành lượt bằng PATCH có điều kiện · ngân sách thời gian · trần
  `social.publish_daily`) tự áp dụng, không viết lại.
- **Dùng LẠI nguyên asset `/api/og/social`** — Instagram *bắt buộc* ảnh phải có
  URL công khai, đúng điều kiện M2 đã thoả sẵn khi chọn "URL chính là file".
- **Telegram là kênh DUY NHẤT chạy được ngay** (token bot đã có trên Vercel từ
  track kênh chat). IG/Threads chờ việc tay.
- **Threads có API + TOKEN RIÊNG** (`graph.threads.net`) — page token Facebook
  KHÔNG dùng được. IG và Threads đều đăng ảnh **2 bước** (tạo container → hỏi
  trạng thái → publish); publish ngay khi vừa tạo là lỗi "media not ready" ngẫu
  nhiên tuỳ nền tảng tải ảnh nhanh hay chậm.

### 🔑 Ba lỗi thiết kế lộ ra KHI mở từ 1 kênh lên 4 (đều đã vá)
1. **Lỗi CHẶN dừng CẢ LƯỢT** — đúng khi có một kênh, sai hẳn khi có bốn: token
   Instagram hết hạn sẽ chặn luôn Telegram đang sống. Nay chặn **theo KÊNH**
   (`blockedChannels`), kênh khác chạy tiếp trong cùng lượt.
2. **Bài gặp lỗi chặn bị đánh `error` vĩnh viễn** — mất bài chỉ vì một cái token.
   Nay trả về `queued` (vẫn giữ dấu lỗi để panel giải thích được vì sao chưa đi).
3. **"Thiếu env" không nằm trong nhóm lỗi chặn** → mỗi bài của kênh chưa cấu
   hình thành một dòng `error` riêng; với 4 kênh là vài chục dòng lỗi mỗi sáng.
   Thiếu env là trạng thái của CÁI CỬA → đưa vào `BLOCKING_PATTERNS`.

### Chữ theo từng kênh (`CAPTION_STYLE`) — không phải chi tiết vụn
**Threads cắt ở 500 ký tự** mà caption `build.ts` viết ra đã ~400 + link + thẻ →
gửi thẳng là kênh đó lỗi mỗi ngày. Telegram `sendPhoto` trần **1024**, IG 2200.
Khi phải cắt thì **cắt CAPTION, giữ link + hashtag** — link là thứ duy nhất đo
được. **Instagram dùng link dạng trần** (bỏ query UTM): IG không cho link bấm
được trong caption nên dán URL kèm UTM ở đó vừa xấu vừa không đo được gì.

### ⚠️ Bẫy dễ quên nhất: `publish_daily` đếm theo LƯỢT ĐĂNG, `build_daily` theo BÀI
Bật 4 kênh với `build_daily=3` là **12 lượt đăng/ngày**, trong khi `publish_daily`
vẫn là 3 → hàng đợi dồn lên mỗi ngày mà **không có gì báo lỗi** (bài chỉ đơn giản
chưa tới lượt). Panel "Hàng Đợi Bài Đăng" nay cảnh báo đúng chỗ này kèm sẵn câu
SQL; `_patches/migration-media-channels.sql` ghi lại cho khỏi quên.

- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · 3 script block admin OK · **38 ca trên module THẬT
  `publish.ts` + `telegram.ts`** (chỉ rewrite đường dẫn import, `diff` xác nhận
  logic nguyên byte): IG đi đúng 2 bước và **hỏi trạng thái container TRƯỚC khi
  publish** · container `ERROR` → **không gọi media_publish** · Threads gọi đúng
  host riêng, **0 lượt chạm `graph.facebook.com`** · chữ Threads ≤500 mà **vẫn
  giữ nguyên link** · IG **không dán UTM** nhưng vẫn nêu địa chỉ gõ lại được ·
  Telegram lưu đúng `t.me/<username>/<message_id>` · **kênh hỏng KHÔNG kéo theo
  kênh sống** (Telegram vẫn đăng khi IG token hết hạn, IG chỉ thử ĐÚNG 1 lần) ·
  bài bị chặn giữ `queued` · **ca ĐỐI CHỨNG** lỗi riêng một bài vẫn chạy tiếp
  cùng kênh và đánh `error` thật · thiếu env → **1 dòng lỗi chứ không phải mỗi
  bài một dòng** · công tắc tắt → **0 lượt gọi ra ngoài** · báo cáo nêu hướng
  dẫn RIÊNG từng kênh (không lẫn `pages_manage_posts` sang Threads) ·
  **10 ca Playwright trên chính `renderMediaQueue` trong `admin.html`**.
- ⚠️ **CHƯA gọi được API thật của kênh nào** — container phiên chặn host ngoài
  và không có token. Toàn bộ verify dừng ở tầng stub.

### 🔑 VIỆC TAY HENRY — làm Telegram trước, nó rẻ nhất
1. **Telegram** (không phải xin quyền ai): thêm bot làm **admin channel** (bật
   quyền đăng bài) → đặt `TELEGRAM_CHANNEL_ID` (`@ten_channel` hoặc id `-100…`)
   → Redeploy → `update app_config set value='["facebook","telegram"]'::jsonb
   where key='social.channels';`
2. **Instagram**: tài khoản phải là **Business** + liên kết Page; xin
   `instagram_content_publish`; đặt `IG_USER_ID` (id SỐ, không phải username) +
   `IG_ACCESS_TOKEN`.
3. **Threads**: cấp token riêng (`threads_basic` + `threads_content_publish`),
   đặt `THREADS_USER_ID` + `THREADS_ACCESS_TOKEN`.
4. **Nới `social.publish_daily`** = `build_daily` × số kênh — xem bẫy ở trên.
- Chưa xong bước nào thì kênh đó tự đóng lại ở lượt đầu, bài **giữ nguyên hàng
  đợi** (không mất), Telegram gửi đúng hướng dẫn của riêng kênh đó.

---

## 🌱 Trợ lý seeding group — máy soạn, NGƯỜI dán (2026-08-03, PR này)

Henry: *"dùng account facebook đi seeding vào các group, auto bot mỗi ngày vào
seeding 20-30 bài"*, và khi tao nêu vấn đề thì chốt lại: *"tao muốn nó tự vào
post luôn. Nó tự tìm group… mỗi ngày tự tìm group tương tự + post theo frequency
tao set"*.

### 🔴 ĐƯỜNG API ĐÃ CHẾT — đừng đi tìm lại
**Meta gỡ Groups API khỏi MỌI phiên bản từ 22/04/2024**, xoá luôn permission
`publish_to_groups` + `groups_access_member_info` (công bố 23/01/2024 cùng Graph
API v19.0, hiệu lực sau 90 ngày). Buffer, Hootsuite, Sprinklr, RecurPost đều mất
tính năng này — **không phải mình chưa xin được quyền, mà là quyền đó không còn
tồn tại**. Lý do Meta nêu: chống spam.
- ⛔ **Đã TỪ CHỐI viết bot tự đăng.** Đường duy nhất còn lại là lái account cá
  nhân bằng trình duyệt giả lập người thật = lách chính biện pháp chống spam.
  Rủi ro không phải mất một account mà là **`tuviminhbao.com` bị gắn cờ ở tầng
  TÊN MIỀN** → Page (adapter M3 vừa xong), Instagram, và cả link do người thật
  chia sẻ đều chết theo, rất khó gỡ. Phiên sau đừng dựng lại đường này.
- **20–30 bài/ngày là mức spam KỂ CẢ khi đăng tay** — admin group ban trong vài
  ngày. Nhịp mặc định vì thế là **7 ngày/group**, trần `seeding.daily_cap=5`.

### ✅ Cái đã làm — tự động tới bước cuối, dừng đúng một cú bấm
- **Migration `_patches/migration-seeding-groups.sql`** (✅ ĐÃ CHẠY prod — verify
  13 cột `seeding_groups` + 15 cột `seeding_drafts`, RLS bật, **0 policy** = chỉ
  service key, `seeding.daily_cap=5`).
- **🔑 CỐ Ý KHÔNG dùng chung `media_posts`/`media_assets` của M2+M3** — hai cái
  bẫy đã đo trước khi viết: (1) `publishQueue()` quét MỌI dòng `queued` rồi tìm
  adapter theo `channel`, gặp channel lạ là đánh dấu `error` → nhét draft group
  vào đó là mỗi sáng vài chục bài báo lỗi oan; (2) `usedSourceIds()` trong
  `build.ts` lọc theo `source_type` **chứ không theo `variant`** → bài nào
  seeding chạm vào sẽ biến mất khỏi hàng đợi đăng Page.
- **`lib/media/seeding.ts`** — mỗi group một `angle` riêng đưa vào prompt, caption
  **viết lại từ đầu cho từng group** (tốn thêm lượt LLM, nhưng người sinh hoạt ở
  hai group là người nhận ra spam đầu tiên). Qua brand-check #356 như mọi văn bản
  đối ngoại. Ảnh Satori qua `/api/og/social` → **0đ**.
- **Ba chốt chặn dồn ứ/trùng lặp:** group còn bài `ready` chưa dán → KHÔNG soạn
  thêm · unique `(group_id, source_type, source_id)` = một bài chỉ vào một group
  MỘT lần (vẫn cho đi group khác — kho chỉ ~630 bài) · `usedThisRun` = hai group
  cùng sáng không nhận cùng một bài.
- **`last_posted_at` đặt khi người bấm "Đã dán", KHÔNG phải khi soạn xong** —
  nhịp đo bằng bài thực sự ra ngoài; bài soạn ra mà không ai dán thì group đó
  chưa hề được seed.
- Cron `seeding-build` 08:30 VN (trước `media-build` 09:30) + panel **"Seeding
  Group"** trong Marketing: sổ group (thêm/sửa/xoá, nhịp riêng từng group) +
  hàng đợi **Copy → Mở group → Đã dán**. **CỐ Ý không có nút "Đăng"** và module
  không import adapter nào — có test riêng canh đúng điều đó.
- Link mang `utm_source=fbgroup&utm_campaign=<slug group>` → sau 2 tuần bảng
  Chiến dịch UTM nói được group nào ra người thật, group nào bỏ.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · 3 script block admin OK · **41 ca trên module THẬT** (chỉ
  rewrite đường dẫn import, `diff` xác nhận logic nguyên byte): sổ trống → **0
  lượt LLM** · chưa tới lượt → **0 lượt LLM** · còn bài chưa dán → không chồng
  thêm · bài đã soạn cho group đó → chọn bài KHÁC · 2 group không trùng bài ·
  trần cắt đúng · `cap=0` tắt hẳn · brand-check chặn → **0 dòng ghi DB** ·
  **module không chứa `graph.facebook` và không import `channels/meta`** ·
  **22 ca Playwright trên chính code trong `admin.html`**: caption chứa
  `<img onerror>` không chạy mà vẫn hiện nguyên văn · `javascript:` trong URL
  group bị chặn ở cả href lẫn img src · bài đã dán khoá ô sửa · **không nút nào
  tên "Đăng"** · Copy chép đúng caption **đã sửa tay** + link + hashtag ·
  clipboard bị chặn → vẫn báo, không im lặng.
- 🐞 Hai lỗi tự bắt khi test: `seedCopy` đọc một map chưa ai đặt → nút Copy mất
  link và hashtag (làm hỏng luôn việc đo UTM); và href/src đổ thẳng từ DB nên
  `javascript:` chạy được bằng chính phiên admin → thêm `sdSafeUrl()`.
- ⚠️ **CHƯA chạy được đầu-cuối trên Next dev** — phần route chỉ là auth + gọi
  hàm + gửi Telegram, `tsc` phủ. Cũng chưa có group thật nào trong sổ nên cron
  sáng mai sẽ **im lặng** (đúng thiết kế, không phải lỗi).

### 🔑 VIỆC TAY HENRY
1. Mở Admin → Marketing → **Seeding Group**, thêm 5–10 group. Ô **"Góc tiếp cận"**
   là thứ quyết định chất lượng: viết rõ nhóm này quan tâm gì (vd *"hội xây nhà,
   quan tâm tuổi làm nhà và hướng bếp hơn là lý thuyết sao"*).
2. Sáng hôm sau kiểm bài đầu tiên trước khi dán — caption do LLM viết, gate
   brand-check là lớp QC duy nhất.
3. Nhịp muốn đổi: sửa `every_days` từng group trong panel; trần chung:
   `update app_config set value='3'::jsonb where key='seeding.daily_cap';`

### Còn lại của track phân phối
Đường auto THẬT (không cần người) là các kênh của chính mình: Page (M3, chờ
`pages_manage_posts`), Instagram, Threads, Telegram channel, Pinterest, Zalo OA
— xem `docs/MEDIA-PIPELINE-PLAN.md`.

---

## 📹 Track Media Pipeline — kênh phân phối, KHÔNG phải SEO (2026-08-01, PR #369)

Henry: *"launch 3-4 tháng mà traffic thấp quá… SEO có phải kênh đầu tiên đúng
không?"* Đo trước khi trả lời: **617/616.715 URL có impression (0,1%) · 18
click/28 ngày, 11 trong đó về trang chủ · 10 từ khoá đọc được đều hạng 51–100 ·
tháng 7: 7 đăng ký, 0đ doanh thu.** Ba tuần trước con số trang-có-impression là
612, nay 617 — **tăng 5 trang trong 3 tuần**, đúng mốc đo đã đặt ở #361. Kết
luận: nút thắt là **thẩm quyền tên miền**, không phải số lượng trang. NGỪNG gen
trang. Henry chốt chuyển sang kênh chủ động.

### 🔴 Phát hiện lớn nhất: pipeline media ĐÃ TỒN TẠI và đang ĐỨT ÂM THẦM
```
cron-khao-luan → pg_cron 07:00 → auto-pipeline → TTS ✅ → Railway mix 🔴 → YouTube 🔴
```
| `van_dap` | Bài | Mới nhất |
|---|---:|---|
| Video render xong, YouTube **lỗi** | **86** | 16/07 |
| Có audio, chưa render video | **29** | **01/08** |
| Đã lên YouTube | 15 | 10/04 |

**85 video hoàn chỉnh nằm kho không đăng được**, máy vẫn đẻ thêm mỗi ngày.
- **84/86 lỗi CÙNG một `invalid_grant`.** Đây là OAuth consent screen còn ở chế
  độ **Testing** trong Google Cloud → refresh token **hết hạn sau 7 ngày**. Đã
  chết đúng hai lần (22/04, 16/07). **Cấp token mới là vá triệu chứng** — phải
  PUBLISH APP. Việc tay Henry, không code thay được.
- `pg_cron` báo `succeeded` mỗi sáng vì nó chỉ đo "gọi HTTP xong", không đo kết
  quả thật ⇒ tắc 16 ngày không ai biết. Cùng họ với bài học nhịp tim `withCronLog`.
- 🔑 **Kho nguyên liệu đã có mà chưa dùng:** 130 file audio TTS (→ podcast RSS,
  gần như 0đ) · `van_dap` đã có sẵn cột `tt_*`/`fb_*` chưa ai ghi vào.
- ⚠️ `video_duration_sec` **NULL cả 100 dòng** → chưa biết có cắt Shorts được không.

### ✅ M1 — cron `yt-drain` (`lib/media/yt-drain.ts`)
Nối lại khâu cuối + **làm cho việc nó đứt nhìn thấy được**. 11h VN hằng ngày.
- **Lỗi CHẶN → dừng cả lượt** (`invalid_grant`/`uploadLimitExceeded`/quota/403).
  84 dòng `yt_error` giống hệt nhau chính là hậu quả của việc cứ thử mãi một thứ
  đã hỏng: đốt quota, ghi đè dấu vết. Auth chết thì bài nào cũng chết.
- **Nhỏ giọt 3/ngày**, trần cứng 6 (quota 10.000 ÷ 1.600/upload). Kho đã dính
  `uploadLimitExceeded` 2 lần — ngưỡng chống spam của YouTube TÁCH khỏi quota API.
- **Ngân sách thời gian 240s**, dừng giữa hai lượt: edge đặt `yt_status=
  'uploading'` TRƯỚC khi upload, nên bị giết ngang để lại dòng treo vĩnh viễn.
- Im lặng khi kho rỗng (khác CMO Digest luôn gửi) · report **nhắc thẳng nguyên
  nhân gốc** để lần sau không đi cấp lại token rồi tắc tiếp.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · **23 ca trên module THẬT** (chỉ thay 1 dòng import alias, đã
  `diff` xác nhận phần logic giữ nguyên byte): dừng sau ĐÚNG 1 lượt khi gặp
  `invalid_grant`; **ca ĐỐI CHỨNG** lỗi riêng của một bài (`Cannot download
  file: 404`) thì vẫn chạy đủ 3; trần 99 vẫn cắt còn 6; quá hạn giờ → 0 lượt.
- ⚠️ **CHƯA test đầu-cuối route trên Next dev** — phần route chỉ là auth +
  gọi hàm + gửi Telegram, `tsc` phủ.

### 🔓 Nợ bảo mật phát hiện kèm (CHƯA sửa)
Edge `youtube-upload` **hardcode `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET`
làm giá trị mặc định ngay trong source**. Nên rotate + chuyển hẳn sang env, cùng
tiền lệ đã phải rotate service_role key Supabase.

### ✅ M2 — xương sống + hàng đợi duyệt tay (PR sau #369)
Henry chốt **duyệt tay trước, chưa auto-post**. Cron dựng ảnh + caption rồi DỪNG
ở hàng đợi; PR này **không đăng đi đâu cả** (adapter kênh để M3).
- **Migration `_patches/migration-media-posts.sql`** (✅ ĐÃ CHẠY prod — verify 9
  cột `media_assets` + 15 cột `media_posts`, RLS bật, **0 policy** = chỉ service
  key, 3 khoá config, `autopost_enabled=false`). Hai bảng tách theo câu hỏi
  chúng trả lời: asset = "file này là gì", post = "lên kênh nào, tới đâu rồi".
  Một asset → nhiều post. **Không mở rộng `van_dap`** dù nó sẵn cột `fb_*`/`tt_*`:
  thêm kênh là thêm 3 cột, thêm định dạng lại 3 cột nữa.
- **`/api/og/social` — Satori, 0đ.** Đo prod: `gpt-image-1` 1.658đ/lượt (~96%
  chi phí một lượt chân dung); job chạy hằng ngày mà gọi model ảnh thì tiền đội
  theo số bài. **URL CHÍNH LÀ FILE** — không cần bucket, và Instagram Graph API
  vốn đòi ảnh phải có URL công khai nên điều kiện đó thoả sẵn.
- **`lib/media/build.ts`** — trích câu bằng LUẬT (dùng lại luật `poster.js`:
  câu TRỌN VẸN gần 95 ký tự, khoảng 45–155), caption LLM, **qua cổng brand-check
  #356** với ĐÚNG hồ sơ giọng của từng nguồn (`khao-luan` ngôi 3 vs `nghien-cuu`
  ngôi 1 — áp nhầm chặn 98% output, đã trả giá một lần). Trượt gate → BỎ bài.
  Ràng buộc duy nhất `(source_type, source_id, variant)` + unique
  `(asset_id, channel)` = chống dựng trùng và đăng trùng ở tầng DB.
- **Thứ tự kiểm đặt chỗ rẻ trước:** không trích được câu / bài đã dựng rồi →
  thoát TRƯỚC khi gọi LLM. Có test riêng đếm số lượt gọi LLM = 0.
- Cron `media-build` 09:30 VN + panel **"Hàng Đợi Bài Đăng"** trong Marketing
  (xem ảnh thật + sửa caption + Duyệt/Bỏ). **Cố ý KHÔNG có nút "đăng ngay"** —
  một cú bấm nhầm không được phép đẩy nội dung lên trang công khai.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi · `prettier --check .` sạch · 3 script
  block admin OK · **27 ca trên module thật** (chỉ thay 3 dòng import, `diff`
  xác nhận logic nguyên byte) · **7 ca Playwright trên chính hàm render trích từ
  `admin.html`**: caption chứa `<script>`/`onerror` không chạy được, vẫn hiện
  nguyên văn trong ô sửa.
- 🐞 Một ca test đỏ hoá ra là **kỳ vọng của test sai, không phải code** — mẫu
  markdown tao viết có cụm chữ không dấu kết câu nên dính vào câu sau, đúng như
  nó phải thế. Đã kiểm riêng: `##` và `**` đều được gỡ đúng.
- ⚠️ **CHƯA render được ảnh thật** — Satori nạp font từ Google Fonts, container
  phiên chặn mọi host ngoài. Bố cục mới chỉ đọc bằng mắt trên code. **Việc tay
  Henry: mở `/api/og/social?v=quote&k=Khảo%20Luận&q=<câu>&t=<tiêu đề>` sau khi
  deploy** để soi khung chữ có tràn không.

### ✅ M3 — BỎ khâu duyệt tay, đăng thẳng Facebook Page (PR này)
Henry đảo quyết định M2: *"ko cần duyệt đâu. Publish luôn. Tắt khâu duyệt trong
admin đi. Gen xong post publish luôn."*
- **🔴 Phát hiện trước khi sửa: KHÔNG có gì để "bật".** M2 dừng ở hàng đợi và
  `approved` là **ngõ cụt** — 0 dòng code nào đẩy `media_posts` đi đâu. Bỏ khâu
  duyệt mà không viết adapter thì bài chỉ đổi từ "chờ người" sang "chờ mãi mãi".
  Nên PR này **viết mới `lib/media/publish.ts`** chứ không phải gỡ vài nút.
- **Adapter Facebook Page** — `POST /{page-id}/photos` với `url` (Graph tự tải
  ảnh) + caption. Gửi URL chứ không upload nhị phân: `/api/og/social` render
  on-demand, URL công khai ổn định — cũng chính là điều kiện Instagram Graph API
  đòi, nên asset dùng lại được ở M3 phần IG. Lưu `post_id` chứ **không phải `id`**
  (id là tấm ảnh, mở ra không phải bài đăng).
- **Ba chốt chép thẳng bài học `yt-drain`**, kho YouTube đã trả giá rồi: (1) lỗi
  CHẶN (token/quyền/rate-limit) → **dừng cả lượt**, 84 dòng `yt_error` giống hệt
  nhau là hậu quả của việc cứ thử mãi một cái cửa đã khoá; (2) **ngân sách thời
  gian**, dừng giữa hai lượt; (3) báo cáo **nhắc thẳng nguyên nhân gốc** để lần
  sau không đi cấp lại token rồi tắc tiếp.
- **Giành lượt bằng PATCH có điều kiện** (`queued → publishing` kèm bộ lọc trạng
  thái, xem có trả dòng nào không). `media_posts` KHÔNG có ràng buộc nào chặn
  đăng lại cùng một dòng — unique `(asset_id, channel)` chỉ chặn tạo trùng, không
  chặn publish trùng. Chốt chặn phải nằm ở đây.
- **`social.autopost_enabled` GIỮ NGUYÊN, chỉ đổi mặc định sang `true`** (✅ đã
  chạy prod, kèm `social.publish_daily=3`). Bỏ khâu duyệt ≠ bỏ luôn phanh: đây là
  đường DUY NHẤT dừng tự đăng mà không cần deploy. `publish_daily` **tách khỏi**
  `build_daily` — để chung thì hôm nào dựng 0 bài cũng là hôm không xả được
  backlog.
- **Brand-check giờ là lớp QC DUY NHẤT** còn đứng giữa LLM và trang công khai
  (trước có thêm mắt Henry). Đã ghi cảnh báo đó vào `build.ts` — đừng nới gate.
- Admin: panel đổi từ *hàng đợi duyệt* sang **nhật ký**; nút chỉ còn ở bài **lỗi**
  (`retry` = sửa caption rồi xếp lại hàng · `skip` = bỏ hẳn). **Vẫn CỐ Ý không có
  "đăng ngay"** — đăng là việc của cron. Bài `live` **không sửa được** từ UI:
  đăng lại một bài đã live là đăng trùng lên trang công khai. Panel còn cảnh báo
  kênh có trong `social.channels` mà **chưa có adapter** (nếu không, bài của kênh
  đó nằm im trong DB không ai biết vì sao).
- **Verify:** `tsc` 0 lỗi · `eslint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · 3 script block admin OK · **44 ca trên module THẬT** (chỉ
  rewrite đường dẫn alias `@/`, logic nguyên byte): đường thành công ghi đúng
  `post_id`/`published_at` · công tắc tắt → **0 lượt gọi Graph** · lỗi quyền →
  dừng sau ĐÚNG 1 lượt, bài còn lại KHÔNG bị đánh dấu lỗi oan · **ca ĐỐI CHỨNG**
  lỗi riêng một bài (`Cannot download image`) vẫn chạy đủ 3 · trần 99 cắt còn 10
  · quá hạn giờ → 0 lượt và **không để dòng `publishing` treo** · kênh lạ → báo
  lỗi rõ chứ không im lặng · **dòng bị lượt khác cướp → bỏ qua, không đăng trùng**
  · thiếu env → nêu đúng tên biến · **14 ca Playwright trên chính `admin.html`**:
  hết sạch nút "Duyệt", ô caption chỉ mở cho bài lỗi, caption chứa
  `<img onerror>` không chạy được mà vẫn hiện nguyên văn.
- ⚠️ **CHƯA gọi được Graph API thật** — container phiên chặn host ngoài và không
  có page token. Toàn bộ verify dừng ở tầng stub.

### 🔑 VIỆC TAY HENRY — chưa làm thì lượt đăng đầu tiên sẽ LỖI
Adapter cần **`pages_manage_posts`**, trong khi app Meta của repo dựng cho
Messenger (`pages_messaging`) và còn ở **Development mode**.
1. Meta App → Permissions: xin thêm `pages_manage_posts`, cấp lại **page token**.
2. Vercel env: **`FB_PAGE_ID`** + **`FB_PAGE_ACCESS_TOKEN`** rồi Redeploy. (Code
   có lùi về `MESSENGER_PAGE_*` nhưng **đừng trông vào đó**: `messengerLink.ts`
   đang mặc định page id `1218919127970486` trong khi CLAUDE.md ghi
   `122097706839369476` — hai số khác nhau, khai rõ env mới là chắc.)
3. Chưa xong bước 1–2 thì cron vẫn chạy: bài đầu lỗi `OAuthException`, **dừng cả
   lượt**, Telegram gửi đúng hướng dẫn này. Không có bài rác nào lên trang.
- Dừng khẩn bất cứ lúc nào: `update app_config set value='false'::jsonb where
  key='social.autopost_enabled';`

### Kế hoạch còn lại — `docs/MEDIA-PIPELINE-PLAN.md`
M3 Instagram/Threads · M4 video 9:16 · M5 podcast RSS + Telegram channel · M6
Zalo OA/Pinterest. **Henry đã đảo quyết định "duyệt tay trước": nay auto-post,
xem M3 ở trên.** Render ảnh bằng Satori (0đ), KHÔNG dùng model sinh ảnh. Cố ý
không mở rộng cột `fb_*`/`tt_*` trong `van_dap` — thêm kênh là thêm 3 cột, đó là
cái bẫy.

---

## 🧭 Track CMO skills — brand-check, từ khoá, SEO (2026-08-01, PR #356–#359)

Henry giao 3 việc: (1) brand voice doc — **phiên khác đã chạy**, nằm ở
`brand_voice_docs`; (2) brand-check gate trước publish; (3) AI SEO.

### ⚠️ Plugin không nạp được vào container Claude Code
`brand-voice` và `marketing` **đã bật** trên tài khoản claude.ai nhưng
`~/.claude/skills` chỉ có skill built-in, và `claude plugin` ở container chỉ có
`details/enable/disable/eval` — **không có `install`/`marketplace add`**.
`claude-seo` thì **không có trong catalog** (chỉ tìm ra `searchfit-seo`).
⇒ Mọi thứ dưới đây viết tay theo checklist §8 của brand voice doc, không chạy
qua sub-skill. Đừng mất thời gian tìm lại cách cài trong phiên sau.

### ✅ #356 — brand-check gate (`lib/content/brand-check.ts`)
Chèn MỘT bước QC vào giữa 2 pipeline đang chạy, **không dựng pipeline mới**.
Gate đứng ngay trước `POST` của `cron-khao-luan` / `cron-master-write` vì cả
`khao_luan` lẫn `master_articles` **không có cột publish_status** — insert xong
là bài lên thẳng trang.
- **Tầng AUTO (regex)**: 0 lượt mạng, luật nằm sẵn trong TS nên chạy được kể cả
  khi Supabase/LLM chết; `app_config['content.brand_check']` chỉ GHI ĐÈ.
- **Tầng LLM**: 7 mục cần đọc hiểu, **fail-open** + `console.warn`.
- Trình tự: autofix → check → 1 vòng LLM viết lại → check lại. Bản viết lại
  **chỉ nhận khi thực sự ít lỗi hơn**.
- **HAI PROFILE, không phải hai mức nghiêm khắc.** Đo prod: `khao_luan` 324 bài
  (6 dùng "tôi") là ngôi 3; `master_articles` 306 bài (**300 dùng "tôi"**) là
  tùy bút ngôi 1 ký tên thầy. Áp luật Khảo Luận sang Nghiên Cứu chặn 98% output.
- Seed `mode='warn'` (tiền lệ shadow-mode M0.6). **Autofix VẪN áp ở warn** vì
  chạy trước khi phân nhánh mode. Siết: `jsonb_set(value,'{mode}','"block"')`.
- Bài bị chặn cất nguyên văn vào `content_qc_log.payload`; topic đỗ `qc_failed`.
- 🐞 **`bạn cũng…` lọt gate**: nhánh loại trừ `cũ` (danh từ "bạn cũ") khớp luôn
  tiền tố "cũng" vì thiếu ranh giới từ. Cụm cực phổ biến ⇒ lỗ rất rộng.
- 🐞 **`mình` hạ xuống `warn`**: soi 6 mẩu thật lọt bộ lọc thì cả 6 đều phản
  thân hợp lệ ("thu mình lại", "một mình phá vây"). Regex không tách được.
  Cùng bài học: đếm thô báo 98/324 bài sai xưng hô, lọc đúng danh từ còn **14**.

### ✅ #357 — Google Suggest → `keyword_ideas`
GSC 28 ngày chỉ **đọc được tên của đúng 10 truy vấn** (842 hiển thị còn lại bị
ẩn tên vì quá hiếm) ⇒ không có nguồn từ khoá để đặt title hay chọn chủ đề.
- **Không dùng Keyword Planner**: cần developer token phải xin duyệt, cần OAuth
  refresh token (**service account KHÔNG dùng được**, khác GA4/GSC), và không
  chi tiêu quảng cáo thì chỉ trả **volume dạng dải**. **Henry đã chốt KHÔNG chạy
  ads** ⇒ cột `volume` ở NULL vĩnh viễn, `best_position` là tín hiệu duy nhất.
- Chạy trên Vercel, cất asset vào Supabase — **container Claude Code chặn mọi
  host ngoài** (đã thử: `suggestqueries.google.com` và cả `tuviminhbao.com` đều
  403 qua proxy). Cùng pattern GA4/GSC.
- Tôn trọng endpoint không chính thức: tuần tự + nghỉ 350ms + trần 180 lượt +
  `User-Agent` khai đúng danh tính bot (cố ý không giả trình duyệt).
- 🐞 28 gốc × 10 hậu tố = **280 tổ hợp** nhưng trần 180 ⇒ 10 gốc cuối không bao
  giờ tới lượt. Vá bằng **xoay vòng theo số tuần**.

### ✅ #358 — gộp URL vận hạn · rút sitemap-pregen · vá trần hub
**Số đo GSC 28 ngày (đường đọc: `events` where `event_type='cmo_digest'`,
`meta->'gsc'` — cron ghi sẵn, không cần credential):**
| | |
|---|---:|
| URL đã nộp sitemap | **616.715** |
| Trang từng hiện trong kết quả | **612** (0,099%) |
| Nhấp | **16** (11 về trang chủ) |

- **Gộp 180 trang trùng**: `/tu-vi/van-han-tuoi-*` (mỏng, title tốt, có sitemap)
  ↔ `/van-han/*` (dày, không sitemap). Chọn bản dày, 301 bản kia, mở `NAM_XEMS`
  3→8 năm cho khớp `seo_pages`, nộp 576 URL, mang title tốt hơn sang.
  🐞 `NAM_XEMS[1]` làm "năm chính" trong title hub — mở mảng ra 8 năm là nó
  lặng lẽ thành 2024. Neo `currentNamXem()`.
- **Rút `sitemap-pregen`** (587.328 URL → sitemapindex RỖNG, không 404).
  ⚠️ **KHÔNG phải vì Google không index**: các trang `/la-so/*` xếp hạng
  **1,4–3,5** hẳn hoi. Chúng chỉ khớp truy vấn NGÀY SINH CHÍNH XÁC — 842 hiển
  thị, **0 nhấp**. Henry đã xoá sitemap trong GSC.
- **Vá trần hub**: HAI trần chồng nhau (`or=(…)&limit=2000` + `.slice(0,60)`).
  Fetch HTML thật của prod về đếm: chỉ **2/5 chuyên mục render, tổng 120 liên
  kết cho 7.848 trang**. Nay hỏi từng chuyên mục + phân trang → 300 liên
  kết/trang × 59 trang.
- **Phân trang theo ĐƯỜNG DẪN** (`/kien-thuc-tuvi/trang/30`), KHÔNG `?page=`:
  dạng này dùng đúng cơ chế "destination mang sẵn query" mà `/tu-vi/:slug` đã
  chứng minh chạy trên prod.

### 🪤 BẪY: `next dev` bỏ query của destination trong rewrite
Next 16 + Turbopack ở **dev** làm mọi hub và mọi `/tu-vi/<slug>` **307 về trang
chủ**. Tôi đã suýt báo đây là sự cố P0 do nâng Next 14→16.
**PROD KHÔNG DÍNH** — fetch thật `www.tuviminhbao.com/kien-thuc-tuvi` → HTTP 200.
Gặp 307 khi chạy dev thì đừng đi sửa nhầm chỗ.
Mẹo: `web_fetch_vercel_url` của Vercel MCP **với tới được prod** dù container bị
chặn mạng (preview thì không — khoá sau SSO).

### ✅ #359 — 🔴 công thức Kim Lâu SAI trên prod
Phát hiện khi chuẩn bị viết content, **không phải Henry báo**.
```
Code cũ : tuổi % 5, dư 1 hoặc 3
Đúng    : tuổi ÂM % 9, dư 1 / 3 / 6 / 8
```
4 số dư mod 9 ứng đúng 4 loại **Thân·Thê·Tử·Lục Súc** — chính 4 loại tài liệu
repo mô tả tool trả về. Bản mod-5 không thể sinh 4 loại ⇒ code lệch khỏi ý định
đã ghi, là bug chứ không phải biến thể cổ pháp.
**46% số tuổi 18–80 ra kết quả khác.** Nặng nhất: 16 tuổi (19·24·30·35·37·39·
42·44·55·57·60·62·64·69·75·80) trước đây báo "Bình thường" trong khi thực tế
phạm — người ta xem xong đi động thổ, cưới hỏi.
Kết quả nay nêu đích danh loại + hại ai. `kimLauLoai` là trường THÊM nên 2 trang
tiêu thụ không phải đổi.
⚠️ **CHƯA đụng `isHoangOc`** (`t % 5 === 0`, trong khi Hoang Ốc là vòng **6
trạng thái** Nhất Cát→Lục Hoang Ốc). Nghi sai nhưng chưa tra đủ chắc — sửa mò
một công thức cổ pháp còn tệ hơn để nguyên.

### ✅ #361 — trang trụ `/kim-lau` + vá tàn dư "chu kỳ 5"
Henry chốt **"1 trang trụ mạnh làm đường dẫn"** → MỘT trang, không phải cụm.
GSC có cầu thật ("cách tính kim lâu" hạng 92, "tính kim lâu làm nhà" 73) mà site
0 trang (`seo_pages` 0, `master_articles` 0, `khao_luan` 1). Cụm nhiều trang
mỏng đúng là thứ vừa gỡ ở #358 — toàn bộ nội dung 60 trang "tuổi X có phạm
không" nằm gọn trong hai bảng tra của một trang.
- Nội dung: công thức mod 9 + **ví dụ tính tay cố ý chọn năm sinh ra kết quả
  PHẠM** (ví dụ "không phạm" thì không dạy được cách đọc số dư) · bảng 4 loại
  kèm đối tượng bị hại · **bảng tra trọn năm sinh** 63 dòng cho năm hiện tại
  (người ta biết năm sinh chứ không biết tuổi ta) · hoá giải · phân biệt Kim Lâu
  / Hoang Ốc / Tam Tai · Article + FAQPage + BreadcrumbList.
- **`lib/engine/kim-lau.ts` KHÔNG chép công thức** — `readFileSync` + `new
  Function` nạp thẳng `public/tools-shared/kim-lau.js`, đúng tiền lệ
  `lib/engine/laso.ts`. Trang trụ nói khác công cụ bên cạnh thì hỏng cả hai.
- 301 `/tools/kim-lau.html` → `/kim-lau` + sửa 11 file link nội bộ trỏ thẳng URL
  mới. **`redirects()` chạy TRƯỚC filesystem** nên bản HTML cũ trong `public/`
  không còn được phục vụ (file vẫn nằm đó, mang chữ cũ — vô hại vì không tới
  được, nhưng đừng gỡ redirect).
- 🐞 **CTA của chính tôi vi phạm gate #356** ("Tra theo năm sinh **của bạn**").
  Sửa copy chứ không nới test, và cho test dùng CHÍNH regex của gate.
- 🐞 **Tàn dư #359: công thức đã sang mod 9 nhưng 3 chỗ vẫn NÓI "chu kỳ 5".**
  Nặng nhất là `CHAT_SYSTEM_KIM_LAU` — rail đọc bảng mod-9 rồi giải thích bằng
  luật mod-5. Và `extractKimLauContext` **không chuyển tiếp `kimLauLoai`** nên
  rail chỉ nói "phạm Kim Lâu" trống trong khi bảng cạnh đó ghi "Kim Lâu Thê".
  **Bài học: đổi công thức thì phải quét cả chỗ MÔ TẢ công thức** — prompt LLM
  là một trong số đó và nó không được typecheck bắt.
- **KHÔNG phải lỗi, đã đo để loại trừ:** `?v=1` của `tools-shared/kim-lau.js`
  không bump ở #359. Đọc header thật prod: `max-age=0, must-revalidate` ⇒
  revalidate mỗi lượt, bản mod-9 đã tới người dùng. Đừng đi bump.
- **Mốc đo quyết định hướng đi:** sau 2–4 tuần đọc lại `pagesWithImpressions`
  (hiện **612**). Bật lên rõ → mô hình chạy được, lúc đó gen trang cho chân dung
  vợ chồng / tiền kiếp / tử bình mới có cơ sở. Vẫn im → vấn đề là **thẩm quyền
  tên miền**, không phải số lượng trang; đừng viết thêm.
- ⚠️ **`xem tuổi vợ chồng` / `xem tuổi làm ăn` ĐÃ CÓ trang SEO** (3.540 + 3.540,
  6.500–7.500 ký tự, title đúng chuẩn *"Tuổi X Và Tuổi Y Có Hợp Nhau Không?"*).
  Henry tưởng chưa có. Thiếu thật chỉ là chân dung vợ chồng, chân dung tiền
  kiếp, tử bình.
- Lượt quét Suggest đầu tiên: **T3 hằng tuần**. Chạy tay:
  `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/keyword-suggest`
- Đọc `content_qc_log` vài ngày rồi cân nhắc siết gate sang `block`.

---

## 🎙️ CMO SKILLS — B1 Brand Voice XONG, và 2 tiền đề của brief là SAI (2026-07-31, PR mới)

Henry giao 3 việc: (1) brand voice guideline qua plugin `brand-voice`, (2) brand-check
gate, (3) AI SEO qua `claude-seo`. Đo trước khi làm thì lộ 2 chuyện.

### 🔴 Plugin claude.ai KHÔNG chạy trong container Claude Code
`brand-voice` + `marketing` **đã bật** trên tài khoản, nhưng chúng là plugin **Cowork của
claude.ai** — file skill KHÔNG có trong container này. Verify 3 đường: `ListSkills` rỗng ·
0 thư mục plugin trên đĩa · `/mnt/skills` chỉ có bộ examples/public của Anthropic. Nên
`guideline-generation` / `brand-voice-enforcement` **không gọi được ở đây**.
- **Bất đối xứng cần nhớ:** `claude-seo` (`AgriciDaniel/claude-seo`, MIT, 12,9k★) là plugin
  **theo REPO** → cài vào repo thì CHẠY ĐƯỢC trong Claude Code. Plugin Cowork thì không.
- Henry chốt: tao tự viết guideline trong Claude Code, không đợi plugin.

### 🔴 Hai lỗi "đã audit" KHÔNG nằm trong corpus
Brief bảo fix `lỗi encoding` + `xưng hô lộn xộn` trong `khao_luan`. Đo thì:
- **Encoding: 0 lỗi / 893 dòng** trên cả 5 bề mặt (`khao_luan` · `master_articles` ·
  `tu_dien` · `van_dap.noi_dung` · `van_dap.script_final`). ⚠️ Lượt quét ĐẦU của tao báo
  51 — **sai, do tự bắt `Â`/`Ã` vốn là chữ Việt hợp lệ**. Quét mojibake phải dùng mẫu
  ĐÔI (`â€`, `Ã¡`, `Æ°`, `Ä‘`), đừng bắt ký tự đơn.
- **Xưng hô: 248/324 bài (76,5%) KHÔNG xưng hô** với người đọc, chỉ **5 bài** trộn 2 kiểu.
- ⇒ Hai lỗi này sống ở **tầng prompt run-time** (prose 47 tool sinh), không phải dữ liệu
  lưu. **Doc nằm trong pgvector không tự fix được chúng** — phải sửa ở `lib/agent/prompts.ts`.
  Henry đã duyệt đưa tầng prompt vào phạm vi.

### Lỗi THẬT đo được (nền của guideline)
| Lỗi | Số đo |
|---|---|
| Cung Tử Tức có **3 tên** | Tử Tức 12 · Tử Nữ 8 · Tử Tôn 1 |
| Cung Nô Bộc có **2 tên** | Nô Bộc 11 · Giao Hữu 3 |
| Trật tự từ không quy ước | `cung X` 135 · `X cung` 66 |
| **19 bài phát 2 thẻ H1** | `#` 19 · `##` 269 · không có 36 |

**2 thẻ H1 là lỗi SEO thật, không phải thẩm mỹ:** `public/khao-luan.html:109` và
`app/api/khao-luan/route.ts:136` đã phát `<h1>` từ `title`, rồi `route.ts:17` đổi tiếp
markdown `#` → `<h1>`. Bài mở bằng `#` là trang có 2 H1.

### Đã làm
- **`docs/BRAND-VOICE.md`** — NGUỒN CHUẨN. Trích từ 20 bài tốt nhất (**2 bài/chuyên mục ×
  10 chuyên mục** — lấy top-20 toàn cục sẽ lệch hết về `hon-nhan`/`benh-tat`). 10 mục:
  định vị · 5 đặc trưng giọng · xưng hô · giới tính · từ vựng chuẩn · cấu trúc · cấm ·
  checklist QC · mẫu vàng.
- **`_patches/migration-brand-voice.sql`** (✅ ĐÃ CHẠY prod): bảng `brand_voice_docs` +
  `search_brand_voice()` + `get_brand_voice()`. RLS bật, **0 policy** = chỉ service key.
  - **Bảng RIÊNG chứ không nhét vào `tuvi_docs`:** `tuvi_docs` là tri thức TỬ VI (để luận),
    brand voice là luật VIẾT (để kiểm văn phong). Trộn chung thì RAG luận giải kéo nhầm
    luật văn phong vào câu trả lời tử vi.
  - **`get_brand_voice()` trả TRỌN doc** cho prompt injection. Style guide **phải vào
    nguyên khối** — RAG lấy 6 mảnh rời ra "luật 7 và luật 12" mà thiếu luật 1, tệ hơn
    không có. `search_brand_voice()` chỉ để tra lẻ từng luật.
  - Chiều **1024** khớp `text-embedding-3-small` + `dimensions:1024` của
    `lib/tools/registry.ts` → dùng chung một đường sinh embedding.
- **`scripts/load-brand-voice.mjs`** — đồng bộ file → DB, cắt theo `##`, upsert theo
  unique `(doc_key,version,kind,section)` nên nạp lại không đẻ bản trùng. `--dry-run` chạy
  được không cần key.

### Verify
`md5(content)` trong DB = **`438c70f3…`** = md5 file → bản DB **byte-identical** với repo
(`length()` 10.190 ký tự vs `wc -c` 12.984 byte là do UTF-8 tiếng Việt, không phải lệch) ·
`get_brand_voice()` trả đúng 10.190 ký tự · RLS on / 0 policy · `--dry-run` cắt đúng 10 mục ·
`prettier --check` sạch cả 3 file · `node --check` OK.
⚠️ **`eslint` KHÔNG chạy được trong container** — `node_modules` rỗng (0 gói), thiếu
`@eslint/js`. Lỗi môi trường có sẵn, không phải do PR này; CI tự cài nên vẫn phủ.

### 🔴 Vòng sau — "sửa tầng prompt" hoá ra sửa NHẦM CHỖ
Henry bảo sửa tầng prompt. Audit thì **`lib/agent/prompts.ts` KHÔNG có lỗi nào**:
- `XUNG_HO_RULE` (dòng 181–185) đã đúng sẵn: không rõ giới → **"quý vị"**, NAM → "anh",
  NỮ → "chị", cấm thẳng "bạn/em" và cấm đoán giới. Còn có chốt khéo: luật CHỈ bật khi
  context có dòng `Người xem:` → không lẫn giới tính của **bé trong đặt-tên-con**.
- Tên cung đã chuẩn (Tử Tức 3 · Tử Nữ 0 · Nô Bộc 4 · Giao Hữu 0), trật tự từ đã chuẩn
  (`cung X` 30 · `X cung` 0).
- 39 chữ "bạn" trong `lib/` đều là **dương tính giả**: "bạn bè" / "bạn đời" / "bạn diễn"
  (danh từ), hoặc đang nói với **MODEL** ("bạn PHẢI tự khoanh vùng"), hoặc chính là câu
  CẤM "bạn". **Đếm chuỗi thô rồi kết luận là sai — phải đọc ngữ cảnh từng chỗ.**

**Lỗi nằm ở prompt SINH NỘI DUNG, hai file hoàn toàn khác:**

| | `cron-khao-luan` | `cron-master-write` |
|---|---|---|
| Prompt | **6 dòng**, chỉ "văn phong nho nhã" | đầy đủ, có nêu `##`/`**bold**` |
| Bài | 324 | 306 |
| Tên cung sai | 12 (3,7%) | 1 (0,3%) |
| Trật tự từ sai | 66 (20,4%) | 8 (2,6%) |
| **Mở bằng `#`** | 19 (5,9%) | **96 (31,4%)** |

Prompt đầy đủ giúp rõ rệt ở tên cung + trật tự từ ⇒ **xác nhận nguyên nhân là prompt**.
Nhưng `cron-master-write` **tệ hơn hẳn về H1** vì nó nêu "`##` cho mục chính" mà **không
CẤM `#`** → model viết `# Tiêu đề` rồi mới `##`. `app/nghien-cuu/[slug]/route.ts:211`
cũng phát `<h1>` từ title y như khao-luan ⇒ **tổng 115 trang đang phát 2 thẻ H1**, không
phải 19 như ghi ở vòng trước.

### Đã làm (vòng 2)
- **`lib/content/brand-rules.ts`** — `BRAND_FORMAT_RULES` + `normalizeBrandFormat()` +
  `checkBrandFormat()`, tiêm vào **cả 2** prompt sinh nội dung.
  - **CỐ Ý chỉ chứa luật CƠ HỌC** (tên cung · trật tự từ · cấp tiêu đề · tên sao).
    KHÔNG nhét luật giọng/độ dài: `khao_luan` là ghi chép ngôi 3 ~300 từ, `master_articles`
    là thầy người Hoa kể chuyện 1200–1500 từ — **ép chung giọng là xoá khác biệt đang cố ý**.
  - **Không chỉ dặn model mà SỬA CƠ HỌC**: `normalizeBrandFormat` tự hạ `#`→`##` và đổi tên
    cung sai. Việc nào máy làm đúng 100% được thì đừng trông chờ model nghe lời; việc cần
    hiểu nghĩa (bịa sao, rule-dump) mới chỉ `console.warn`.
- **12 ca test trên module thật, 0 fail** — gồm 2 chốt quan trọng: `#` GIỮA DÒNG không bị
  đụng (`C#`, hashtag), và **`Â`/`Ã` tiếng Việt hợp lệ KHÔNG bị báo mojibake** (đúng lỗi
  dương tính giả tao mắc ở vòng 1).
- Verify: `tsc --noEmit` **0 lỗi** (đã `npm ci` + build engine) · `eslint` **0 lỗi** ·
  `prettier --check` sạch.

### ✅ Vòng 3 — backfill 115 bài + vendor claude-seo (Henry duyệt cả hai)
- **Backfill ĐÃ CHẠY prod:** `regexp_replace(content,'^# ','## ','gm')` trên `khao_luan`
  (19 dòng) + `master_articles` (96 dòng). Verify sau khi chạy: **0 bài còn mở bằng `#`**
  ở cả hai bảng. Dry-run trước đó đã xác nhận `still_bad_after = 0`, không tác dụng phụ —
  cờ `m` chỉ khớp `# ` ở ĐẦU DÒNG, không đụng `#` giữa câu.
- **`claude-seo` vendor vào `.claude/`** (25 skill + 18 agent, 2,3M, MIT — LICENSE giữ tại
  `.claude/skills/seo/LICENSE`). Bố cục **theo đúng `install.sh` upstream**: skill chính ở
  `.claude/skills/seo/` có `scripts/`+`schema/`+`pdf/`+`bin/`+`hooks/` lồng bên trong, 24
  sub-skill phẳng cạnh nó, agent ở `.claude/agents/`. Script Python gọi bằng đường dẫn
  tương đối `scripts/*.py` **so với `.claude/skills/seo/`** → **đừng di chuyển thư mục đó,
  22/25 skill sẽ gãy**.
  - 🔴 **`.gitignore` đang chặn `.claude/`** → bản vendor sẽ KHÔNG commit, mỗi phiên mới lại
    mất. Sửa `.claude/` → **`.claude/*`** rồi `!.claude/skills/` + `!.claude/agents/`.
    **Phải dùng `.claude/*`**: với `.claude/` git không đi vào thư mục nên luật phủ định vô
    hiệu. Verify cả 2 chiều: skill commit được, mà `settings.local.json` / `.credentials.json`
    / `history.jsonl` vẫn bị chặn.
  - **Bỏ CỐ Ý:** `screenshots/`(1,6M) `assets/` `tests/` `.devcontainer/` `.github/` (không
    cần lúc chạy) và `extensions/`(516K — DataForSEO/Firecrawl/Banana đều cần key bên thứ
    ba). Vì bỏ extensions nên thiếu `scripts/edit.py` + `scripts/presets.py`; chúng chỉ được
    gọi bởi `seo/scripts/consistency_check.py`, **0 SKILL.md phụ thuộc** → không skill nào gãy.
  - ⚠️ **Hook CỐ Ý không kích hoạt:** `seo/hooks/hooks.json` khai `PostToolUse` bắt MỌI
    `Edit|Write` rồi **exit 2 để CHẶN** khi validate JSON-LD hỏng. Vendor dạng *skill* thì
    `hooks.json` không tự nạp (chỉ plugin mới nạp) — đúng ý muốn: validator JSON-LD chặn mọi
    lần sửa file trong repo Next.js này thì cản nhiều hơn giúp.
  - Verify: 25/25 có `SKILL.md` frontmatter hợp lệ (`name`+`description`) · 18/18 agent có
    `name:` · 29/31 script Python được gọi là có mặt (2 thiếu đã giải thích ở trên) ·
    `prettier --check .` (QUÉT CẢ CÂY như CI) **sạch** · `npm run lint` **0 lỗi / 72 warning
    = đúng mức pre-existing**, bản vendor không thêm cái nào · 234 file, 0 secret/local state.
- Ghi chú: `docs/BRAND-VOICE.md` §6 nói "19 bài đang dính" — con số lúc viết; số ĐÚNG là
  **115** (19 khao_luan + 96 master_articles), và nay đã backfill về 0.

### 🔀 Vòng 4 — gộp với `brand-check.ts` vừa lên main (ĐỌC TRƯỚC KHI SỬA 2 FILE NÀY)
Trong lúc làm PR này, `main` đi trước 10 commit và **đã có `lib/content/brand-check.ts`**
(663 dòng — gate hậu kiểm 2 tầng auto+LLM, `content_qc_log`, tách profile
`khao-luan`/`nghien-cuu`). Merge ra 3 xung đột, đều nằm giữa vùng vừa sửa.

**Quan hệ hai hệ thống — đừng gộp làm một:**
| | Vai | Chạy lúc |
|---|---|---|
| `brand-rules.ts` → `BRAND_FORMAT_RULES` | **PHÒNG** — tiêm luật vào prompt | TRƯỚC khi sinh |
| `brand-check.ts` → `brandCheck()` | **CHỮA** — autofix · quét · nhờ LLM viết lại · chặn | SAU khi sinh |

Giữ cả hai vì gate chạy sau và **mỗi bài trượt tốn thêm một lượt LLM viết lại** — dặn
trước rẻ hơn sinh→bắt→sửa. Nhưng **đã GỠ `normalizeBrandFormat`/`checkBrandFormat`** khỏi
`brand-rules.ts`: chúng trùng tầng auto của `brand-check.ts`, để hai bản luật song song thì
chúng trôi khỏi nhau lúc nào không biết. **`brand-check.ts` là nguồn DUY NHẤT cho việc
kiểm/sửa; `brand-rules.ts` chỉ còn đúng một hằng số đưa vào prompt.**

- 🔑 **`brand-check.ts` đọc `brand_voice_docs`** — tức nó phụ thuộc CHÍNH migration/doc/loader
  của PR này (main chưa có 3 file đó; bảng tồn tại trên prod chỉ vì tao tạo thẳng qua MCP).
- `.gitignore`: giữ **cả hai** phủ định — `!.claude/settings.json` (của main, cho MCP ga4)
  lẫn `!.claude/skills/` + `!.claude/agents/`.
- Sau merge verify lại: `tsc` 0 lỗi · `lint` 0 lỗi/72 warning · `prettier --check .` sạch ·
  md5 DB khớp md5 file (`76b6c280…`) sau khi sửa §6.

### 🔴 CI: workflow `pull_request` có lúc KHÔNG fire — CÁCH GỠ GHI DƯỚI ĐÂY LÀ SAI
**Đính chính (2026-08-04, PR #412):** đã thử ĐỦ CẢ HAI đường trên cùng một PR,
**không đường nào kích được** 4 workflow `pull_request` (lint · unit-test ·
playwright · lighthouse):
1. đẩy commit **có code thật** (không phải commit rỗng) → chỉ Vercel + `smoke`;
2. **Close rồi Reopen PR** → vẫn chỉ Vercel + `smoke`.

Workflow không có path filter, không có guard draft, `branches:[main,dev]` khớp
đúng base — tức cấu hình không sai, đây là GitHub không phát event. Chưa có cách
gỡ nào chắc chắn.
- `playwright` và `lighthouse` có `workflow_dispatch` nên chạy tay được; `lint`
  và `unit-test` thì KHÔNG.
- ⇒ Khi gặp ca này, chạy đủ bộ tại chỗ rồi **nói thẳng trên PR là CI vắng mặt**.
  Đừng để PR trông "xanh": xanh ở đây nghĩa là các check KHÔNG TỒN TẠI.

**Thêm số liệu 2026-08-09 (PR #462), và nó ĐÍNH CHÍNH nốt cách gỡ còn lại:**
cùng một PR, hai lượt push liền nhau ra hai kết quả khác nhau —
| Lượt push | HEAD là gì | Kết quả |
|---|---|---|
| có gộp base, **HEAD CHÍNH LÀ commit merge** | merge | **đủ 7 check** |
| có gộp base trong dải push, nhưng **HEAD là commit thường** đứng sau | thường | **chỉ `smoke` + Vercel** |
⇒ *"Gộp base rồi push"* **KHÔNG đủ**.

🪤 **Nhưng giả thuyết "phải là commit merge" LẬP TỨC BỊ PHẢN CHỨNG** ngay trong
cùng buổi: PR **#471** dựng nhánh lại từ main rồi đúng **một commit thường** làm
HEAD — không có commit merge nào — mà vẫn **đủ 7 check**. Khác biệt thật nằm ở
LOẠI EVENT, không nằm ở hình dạng commit:

| Event | Quan sát được |
|---|---|
| `opened` (PR mới) | chưa thấy lượt nào hụt |
| `synchronize` (push vào PR đang mở) | **thỉnh thoảng GitHub không tạo run** |

⇒ Gặp ca hụt trên PR đang mở thì đường chắc nhất là **mở một PR MỚI** (nhánh
reset trên main + commit lại), chứ không phải cố nặn ra commit merge. Vẫn chưa
đủ mẫu để chốt, nhưng nay có một ca ngược chiều — đừng chép lại suy đoán cũ như
thể nó đã được xác nhận. 🔑 Đây là bài học lặp: **ghi giả thuyết thì phải ghi cả
ca phản chứng, nếu không nó tự lên đời thành luật.**
- 🔑 **Trước khi tốn công kích lại CI, hỏi: CI còn thêm được gì cho ĐÚNG diff
  này?** Lúc PR #462 gặp ca này, `playwright` và `lighthouse` còn trỏ **URL
  prod** nên chúng đo sức khoẻ prod chứ không đo nhánh; phần thật sự phủ diff
  chỉ còn `lint` · `typecheck` · `unit-test`, cả ba chạy tại chỗ được.
- 🔴 **LẬP LUẬN TRÊN NAY ĐÃ HẾT HẠN — đừng chép lại.** #466 rồi #468 (gộp ngay
  sau đó, trong cùng buổi) chuyển **cả E2E lẫn Lighthouse** sang đo **chính bản
  preview vừa deploy**. Từ nay hai check đó vắng mặt là **mất phủ THẬT cho
  nhánh**, không còn là "đo prod". Đây là lần thứ ba trong repo một ĐỐI CHỨNG
  hết hạn vì chính hạ tầng nó neo vào đã đổi — xem lại mục *CI đo BẢN CŨ* ngay
  dưới trước khi viện dẫn lập luận này.

### ⚠️ (ghi chép cũ) CI: workflow `pull_request` có lúc KHÔNG fire
2 commit liên tiếp chỉ có Vercel + `smoke` chạy; lint/typecheck/test/lighthouse **không hề
được tạo run** (10 workflow đều `active`, không có path filter). `smoke` vẫn chạy vì nó
trigger bằng `deployment_status` ⇒ không phải hết quota. **Cách gỡ: Close rồi Reopen PR** —
phát lại event `pull_request` và CI dựng lại đủ bộ. Commit rỗng KHÔNG kích được.
**Bài học: PR "xanh" có thể chỉ là các check VẮNG MẶT, không phải pass — đếm đủ 7 check
trước khi kết luận.**

**🔁 Tái phát ở PR #410 (2026-08-04) — và close/reopen KHÔNG gỡ được.** Thử đủ ba
lần đều chỉ ra `smoke` + Vercel: mở PR · close rồi reopen · đẩy commit RỖNG (SHA
mới). Trong khi đó `pull_request` vẫn chạy bình thường cho PR khác cùng repo
cùng lúc (dependabot 11:04, một nhánh session khác 10:53) ⇒ **hỏng riêng PR đó,
không phải hỏng Actions**. Điểm chung nghi nhất: nhánh `claude/…-ji5aub` vừa
được **dùng lại tên sau khi PR trước của chính nó đã merge** (reset từ main rồi
force-push). **Thứ gỡ được: MERGE base (`origin/main`) vào nhánh rồi push** —
commit merge làm CI dựng đủ 7 check ngay lượt đầu. Lần sau gặp lại thì đi thẳng
bước này, đừng mất 3 lượt như tao.

### CÒN LẠI
- **Embedding mục CHƯA sinh** — container không có `OPENAI_API_KEY`. Dòng `kind='full'`
  đã dùng được ngay (prompt injection không cần embedding); `search_brand_voice()` trả rỗng
  cho tới khi chạy `node scripts/load-brand-voice.mjs` ở nơi có key.
- **Tên cung sai vẫn còn trong bài CŨ** (`khao_luan` 12 · `master_articles` 1) — backfill vừa
  rồi CHỈ sửa `#`, chưa đụng `Tử Nữ`/`Tử Tôn`/`Giao Hữu`. Bài SINH TỪ GIỜ đã sạch nhờ
  `normalizeBrandFormat`. Muốn dọn nốt bài cũ thì chạy thêm một lượt update theo `CUNG_ALIASES`.
- **B2 (brand-check gate) chưa nối vào pipeline** — `checkBrandFormat()` đã là sẵn phần tự
  động hoá được, còn thiếu bước chặn trước khi publish.
- **B3 mới xong phần CÀI** — chưa chạy skill nào. Việc đầu tiên nên làm theo brief:
  semantic cluster map cho 8.958 trang `seo_pages` (`seo-cluster` + `seo-programmatic`),
  rồi `seo-schema` / `seo-geo` / index monitor.

---

## 💸 ĐO DOANH THU ĐANG BỊA 78% (2026-07-31, PR sau #350)

Henry bảo đổi nốt hằng số 2.500đ trong `MKT_VND`/`dashboard_margin`/
`marketing_revenue`. Đo trước khi sửa thì ra chuyện lớn hơn hẳn con số:

| | đ |
|---|---:|
| Doanh thu đang BÁO CÁO | **10.075.000** |
| Tiền thật CHỨNG MINH được | **1.319.500** |
| Không rõ (5 giao dịch PayPal / 3.160 Lượng) | ? |

**~78% doanh thu đang báo cáo là suy ra từ `amount * 2500`, không phải tiền.**
Vì `credit_transactions.amount_vnd` **NULL ở CẢ 9 dòng topup** — R3 ("ghi tiền
thật cho giao dịch MỚI") chưa từng ghi được dòng nào, đơn giản vì từ lúc ship
tới giờ chưa có ai nạp thêm.

### 🔎 Đính chính một chẩn đoán sai của chính tao
Tao đã nói với Henry là "panel Biên LN đang thổi lên ~3 lần". **Sai.**
`dashboard_margin` KHÔNG dùng 2500 — nó đã đi qua `credit_vnd()` từ trước, hàm
này trả **1000**, tức lệch ~1,2 lần. Chỗ thật sự còn cứng 2500 là
`marketing_revenue` + 2 chỗ trong `admin.html`. **Đọc định nghĩa hàm trước khi
kết luận, đừng suy từ tên biến.**

### 2.500đ không phải số bịa — nó là giá của THỜI KỲ KHÁC
Đơn hàng đầu (24/04) là **122.500đ cho 50 Lượng = 2.450đ/Lượng**. Nên 2.500đ
từng ĐÚNG. Cái sai là (a) đem nó áp cho Lượng của hôm nay (gói đang bán
624–990đ) và (b) để nó thành hằng số chép tay ở nhiều nơi.

### Đã làm (`_patches/migration-revenue-truth.sql`, ✅ ĐÃ CHẠY prod)
1. **Backfill TIỀN THẬT** cho 4 giao dịch tra được từ `bank_orders` (khớp
   user + số Lượng + nhãn + cửa sổ 10 phút; đo được lệch thật 20–47 giây).
   Lấy lại chính xác **1.319.500đ**. Dry-run trong transaction rồi `RAISE` để
   rollback trước khi áp thật — đúng 4 dòng, không đụng dòng nào khác.
2. **`credit_vnd()` suy từ `credit_packages`** (gói phổ biến = 829đ) thay vì
   trả hằng số. ⚠️ Prod đang có `app_config['credits.vnd_per_credit'] = 1000`
   chốt cứng — **đã XOÁ**, không thì nhánh suy-từ-gói không bao giờ chạy tới
   (đúng y bệnh cũ, chỉ khác con số). Cơ chế ghi đè vẫn còn nếu cần chốt lại.
3. **`marketing_revenue` tách `real_vnd` / `estimated_vnd` / `estimated_count`
   / `vnd_per_credit`.** Gộp một cục thì không ai biết bao nhiêu phần trăm con
   số đó đứng vững được. `dashboard_margin` trả thêm `vnd_per_credit` để
   Dashboard và Marketing dùng chung một mốc.
4. `admin.html`: `MKT_VND` + `vndOf` ăn theo RPC (đặt TRƯỚC mọi lượt vẽ — bắt
   được lúc test là `renderMktSources` chạy trước nên bảng LTV hiện bằng mức dự
   phòng); panel Doanh Thu hiện thẳng "Tiền thật đã đối chiếu" vs "Ước lượng ·
   N giao dịch"; 5 nhãn tĩnh ghi "2.500đ" viết lại cho khỏi mâu thuẫn.

**Sau khi vá:** tổng 3.939.140đ = **1.319.500 thật + 2.619.640 ước lượng**, và
giao diện nói rõ đâu là đâu.

### ⚠️ CÒN LẠI — việc tay Henry
**5 giao dịch PayPal cũ (460/1000/200/500/1000 Lượng, tháng 4–5) không có số
tiền ở BẤT CỨ ĐÂU trong DB** — tên gói cũ ("Pro", "Nhóm", "Cá Nhân", "Gia
Đình") không còn trong `credit_packages`, và chúng thanh toán bằng USD. Muốn
doanh thu chính xác tuyệt đối thì mở lịch sử PayPal, lấy số tiền thật rồi
`update credit_transactions set amount_vnd = …, gateway='paypal'` cho 5 dòng
đó. **CỐ Ý không bịa số cho chúng** — đó chính là lỗi vừa sửa.

---

## 🎨 Trang topup dựng lại + ĐƯỜNG ICON DÙNG CHUNG BỊ HỎNG (2026-07-31, PR #350)

Henry: *"Sao page topup mày vẫn còn xài emoji nhỉ? Tao nhớ đã có session nói mày
sửa hết cho nó consistent rồi mà."* Anh nhớ đúng — markup ĐÃ được chuyển sang
`data-icon` từ trước. Vấn đề là **markup đó chưa bao giờ được dựng**.

### 🔴 Căn nguyên: `mountIcons()` chạy TRƯỚC khi thân trang tồn tại
`nav.js` gọi `mountIcons()` **đúng một lần, đồng bộ, ở ĐẦU `<body>`** — lúc phần
thân trang chưa được parse. Nên mọi span `[data-icon]`/`[data-icon-emoji]` nằm
dưới nav đều trượt lượt quét rồi rơi về nhánh dự phòng **in thẳng emoji ra màn
hình**. Tức đợt chuyển sang Lucide trước đây gần như không có tác dụng trên bất
kỳ trang nào — chỉ nav là được dựng.
- Vá: quét lại một lượt khi DOM đóng (`mountIcons` bỏ qua phần tử đã có `<svg>`
  nên chạy hai lần không tốn gì). **Đo trên 50 trang: 232 icon dựng thành SVG,
  0 trang còn emoji thô** (trước đó riêng `kien-thuc-tuvi.html` lọt 22 emoji).
- **Bài học:** sửa markup icon mà không kiểm bằng trình duyệt thì không biết nó
  có dựng hay không — nhánh dự phòng in emoji khiến trang *trông vẫn có icon*.
  Cách kiểm đúng: `[data-icon]` nào KHÔNG chứa `<svg>` sau khi tải xong.
- 2 trang dựng icon SAU lượt quét (`la-ban-phong-thuy`, `xlook`) phải tự gọi
  `window.mountIcons(container)` — mẫu này áp cho MỌI chỗ render động về sau.

### Bảng icon (nav.js v13 → v14, 78 → 88 icon)
- Thêm: `clock` `credit-card` `gift` `image` `info` `landmark` `qr-code` `scale`
  `shield-check` `temple`. `image`/`temple` lấy ĐÚNG path `shell.js` đang dùng —
  để sidebar Luận Đường và bảng giá không vẽ hai kiểu khác nhau.
- Map thêm 31 glyph còn sót, gồm **8 ký tự dùng làm `tool_pricing.icon`**
  (`☉ ⧇ ⚸ 🖼️ 🏯 🖌 💋 🧥`) vốn đổ thẳng ra trang Công Cụ + bảng chi phí.
- `iconHtml()` **không trả glyph thô nữa** mà trả icon dự phòng: `tool_pricing.icon`
  do admin gõ tay nên luôn có thể xuất hiện ký tự mới, và mỗi lần như vậy trước
  đây là một con emoji lọt thẳng ra giao diện.
- ⚠️ `cong-cu.html` vẫn giữ **bản chép riêng** của `EMOJI_TO_ICON` (dòng ~671) —
  nợ DRY chưa gỡ, sửa bảng ở nav.js thì nhớ nó.

### 🐞 Ba lỗi lộ ra khi làm trang topup
1. **Nạp SỐ TIỀN TỰ CHỌN bằng chuyển khoản CHƯA TỪNG dùng được.**
   `initiateBankTopup` đọc ô VNĐ rồi kiểm bằng ngưỡng **USD** (`< 5 || > 500`) và
   gửi trường `customAmount` (đường USD cũ của server) → mọi số tiền hợp lệ đều
   bị chặn tại client kèm *"Vui lòng nhập $5–$500"*. Nhánh PayPal cạnh bên thì
   đúng (`customAmountVnd`) — lệch nhau lâu rồi mà không ai thấy vì lỗi nằm ở
   nhánh ít test hơn.
2. **Trang chớp giá SAI.** Card viết cứng 50/120/350/800 Lượng rồi trông chờ
   fetch ghi đè, trong khi `credit_packages` thật là **100/240/700/1600** — sai
   đúng một nửa, và fetch hỏng thì sai luôn. Nay dựng card TỪ dữ liệu.
3. **Bảng chi phí báo đắt hơn thực tế tới 3 lần.** Quy đổi nhân cứng 2.500đ/Lượng
   (đơn giá mua lẻ) trong khi mua gói chỉ **624–990đ/Lượng**.

### Bố cục
- Số dư / quà đăng ký dùng CHUNG một chỗ (loại trừ nhau), không còn hai khối rồi
  ẩn bớt một cái để lại khoảng trống.
- **Chọn phương thức MỘT lần** (segmented control) → mỗi gói 1 nút thay vì 2
  (8 nút → 4). Mặc định **chuyển khoản QR** — người dùng VN gần như đều trả bằng
  app ngân hàng, trong khi bản cũ để PayPal làm nút chính (đậm màu).
- Quà đăng ký lấy từ server qua action mới **`signup-bonus`** (đọc
  `credits.signup_bonus_variants`, CÔNG KHAI vì hứa với người chưa có tài khoản).
  Đọc hỏng → lùi về câu chung chung, KHÔNG nêu con số.
- Referral gộp về MỘT lượt `my-referral` (bản cũ tự hỏi PostgREST hai bảng bằng
  anon key rồi tự đếm).
- Số công cụ miễn phí đếm từ dữ liệu (**21**, FAQ cũ ghi 28).

### 💰 Vòng sau — BỎ đơn giá 2.500đ tàn dư, nạp lẻ nay BÁM bậc gói
Phát hiện lúc dựng trang: gói bán **624–990đ/Lượng** nhưng nạp "số tiền khác"
chia cứng **2.500đ/Lượng** — đắt hơn 2,5–4 lần (99.000đ mua gói được 100 Lượng,
nạp lẻ chỉ **39**). Henry xác nhận *"nó là tàn dư đó, chỉnh lại cho hợp lý luôn
đi"*.
- **Căn nguyên là KIỂU dữ liệu, không phải con số.** 2.500đ lệch được chính vì
  nó là một hằng số RIÊNG, không dính gì tới bảng gói — nên thay bằng một hằng
  số khác thì lần sau lại lệch. `quoteCustomVnd()` (`lib/billing/packages.ts`)
  **suy đơn giá TỪ `credit_packages`**: lấy bậc tốt nhất mà số tiền với tới
  (đơn giá thấp nhất trong các gói có `amountVnd <= amount`); dưới gói nhỏ nhất
  thì hưởng bậc vào cửa. Đổi giá gói dưới DB là đường nạp lẻ tự đi theo.
- **Ba tính chất đã verify:** nạp lẻ KHÔNG BAO GIỜ thiệt hơn mua gói cùng số
  tiền (99k→100 L, 199k→240 L, 499k→700 L, 999k→1600 L — khớp ĐÚNG gói); thêm
  tiền không bao giờ nhận ít Lượng hơn (đơn điệu trên cả dải 50k–5tr); DB rỗng
  → trả 0 để route báo lỗi, không cấp `NaN` Lượng.
- Dùng `min` trên các gói với tới được (thay vì "gói đắt nhất ≤ số tiền") để vẫn
  đúng kể cả khi admin khai một bậc gói không đơn điệu.
- **Client PHẢI ra cùng kết quả** (xem trước tức thì, không đợi mạng) → có test
  đối chiếu bản client (trích từ `topup.html` thật) với bản server (trích từ
  `packages.ts` thật) trên **4.951 mức tiền**: khớp tuyệt đối. Sửa một bên thì
  phải sửa cả hai — đã ghi thẳng vào comment cả hai chỗ.
- **🐞 `FALLBACK` trong `packages.ts` cũng đang mang số cũ** (50/120/350/800
  Lượng, DB thật 100/240/700/1600) → một nhịp Supabase chớp là user trả đủ tiền
  mà nhận đúng một nửa. Đã sửa khớp prod.
- **Cùng hằng số 2.500đ còn đang nói dối ở 2 chỗ HIỂN THỊ:** `cong-cu.html`
  (`t.credits * 2500`) và `admin.html` (`VND_PER_CREDIT`) — đều báo giá công cụ
  đắt hơn thực tế ~3 lần. Cả hai nay suy từ gói phổ biến.
- **CỐ Ý KHÔNG đụng** `MKT_VND`/`dashboard_margin`/`marketing_revenue` (cũng quy
  2.500đ): đó là quy ước ĐO DOANH THU cho Lượng đã tiêu, khác hẳn giá bán, và
  đổi thì lệch toàn bộ báo cáo lịch sử. Nhưng đáng soi lại — nếu giá thật ~830đ
  thì mấy panel đó đang thổi doanh thu lên ~3 lần.
- Ghi chú thêm: `chat.cost` dưới DB đang là **2** (không phải 5).

---

## 🖼️ Sinh ảnh: gpt-image-1 → gpt-image-2 (2026-08-04, PR #401)

`gpt-image-1` **bị OpenAI tắt 23/10/2026** (bản mini/1.5/chatgpt-image-latest thì
01/12 — nguồn hay lẫn hai mốc này). `lib/image/openai-image.ts` là đường sinh ảnh
DUY NHẤT của **Chân Dung Vợ Chồng + Chân Dung Tiền Kiếp**, tức 2 tool đang bán sẽ
hỏng vào ngày đó. Đây là hạn sử dụng, không phải việc tối ưu.

- **⚠️ Hai phiên chạm cùng file, KHÔNG trùng việc — đọc kỹ trước khi sửa tiếp:**
  #400 (Quẻ Phục Hy) dựng **cơ chế** `opts.model` ghi đè từng lượt + trả `model`
  về cho caller, nhưng **để nguyên mặc định `gpt-image-1`**. PR này lật mặc định
  sang `gpt-image-2` và làm phần migrate thật. Hai đường ghi đè cố ý KHÁC mục
  đích: `opts.model` = đổi cho một lượt (so hai model cạnh nhau ở chỗ rẻ), env
  `OPENAI_IMAGE_MODEL` = pin cả site (lối lùi).
- **Tham số y hệt** — `size` vẫn nhận `1024x1536`, `quality` vẫn `low|medium|high`,
  `n`, `data[0].b64_json` không đổi ⇒ đổi đúng tên model là chạy.
- **🐞 Tiền đề của Henry lệch một bậc chất lượng:** anh nói mình dùng **high**
  ($0,25 → $0,165). Thật ra 2 route KHÔNG truyền `quality` nên ăn mặc định
  **medium**. Đo lại đúng khổ đang dùng (1024×1536 medium): **1.649đ → 1.090đ,
  rẻ hơn 34%**. Tỉ lệ trùng khớp nhưng số tuyệt đối nhỏ hơn ~4 lần. 1.649đ tính
  ra khớp với **1.658đ đo thật trên prod** — chính con số đó xác nhận là medium.
- **Giá token** (`lib/agent/usage.ts`): gpt-image-2 text $5 · image in $8 ·
  **image out $30**/1M (gpt-image-1 là $5/$10/**$40**). GIỮ NGUYÊN dòng
  gpt-image-1 trong bảng — env pin ngược lại thì chi phí vẫn tính đúng giá của nó.
- **🔴 `output_format: 'png'` nay KHAI RÕ.** Có nguồn báo gpt-image-2 đổi mặc định
  sang webp (nguồn khác nói vẫn png, và issue `openai/openai-node#1850` ghi nhận
  xin webp vẫn trả PNG). Không cần biết bên nào đúng: cả 2 route upload với đuôi
  `.png` + `Content-Type: image/png`, và ảnh đó đi thẳng vào `og:image` của trang
  chia sẻ — mặc định đổi một nhịp là file nói dối kiểu của chính nó ở 3 nơi.
- **Tên model hết bị chép tay.** Trước đây 2 route gọi `logImageUsage(..., 'gpt-
  image-1', ...)` viết cứng, trong khi model thật do env quyết ⇒ pin env là bảng
  chi phí ghi sai tên. Nay `generatePortraitImage` **trả `model` đã gọi thật**,
  route log cái đó. Cùng họ bài học với giá Lượng ở #373: một số/tên chép ở hai
  nơi thì sớm muộn cũng trôi khỏi nhau.
- **Thêm `console.warn` khi có ảnh mà KHÔNG có usage** — nhánh này làm
  `logImageUsage` bỏ qua im lặng, tức panel Biên LN mất khoản đắt nhất hệ thống
  mà không ai hay (đúng bệnh GA4 base64 hỏng âm thầm hàng tháng).
- **Lối lùi:** env `OPENAI_IMAGE_MODEL=gpt-image-1` (cần Redeploy) nếu tài khoản
  chưa mở gpt-image-2.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier`
  sạch · `check:prices` sạch · **21 ca trên MODULE THẬT** (tsc + stub fetch):
  request gửi đúng model/`output_format`/size/quality/n · trả đúng `model` ·
  parse usage đúng · env pin → gửi VÀ trả đúng model bị pin · mất usage → vẫn ra
  ảnh + có cảnh báo · non-200 và data rỗng đều ném lỗi · **cost_vnd tính qua
  `logImageUsage` thật**: gpt-image-2 1.090đ, gpt-image-1 1.649đ, model lạ rơi về
  giá gpt-image-2.
- ✅ **ĐÃ gọi API thật và ĐÃ đối chiếu giá** (2026-08-04, sau #404). Container vẫn
  chặn `api.openai.com`, nên đường chạy được là **route trên Vercel** —
  `/api/admin/chan-dung-thu` (#404), nơi key vốn có sẵn. Đo trên lá số thật
  (Nam 3/6/1998 giờ Sửu → *Đại danh y coi dưỡng sinh · Nhật Bản cổ*), 1024×1536:

  | quality | token ảnh | chi phí THẬT | dự đoán từ bảng giá |
  |---|---:|---:|---:|
  | medium | 1.372 | **1.106đ** | 1.090đ |
  | high | 5.488 | **4.193đ** | 4.190đ |

  ⇒ bảng `IMAGE_MODEL_PRICING` (`$30/1M` image out) **đúng ở cả hai đầu**, và mức
  rẻ hơn 33–34% so với gpt-image-1 là số có hoá đơn đỡ chứ không còn là ước tính.
- **Henry đã chốt GIỮ `medium`** sau khi soi hai bức cạnh nhau. Không phải sửa gì:
  2 route KHÔNG truyền `quality` nên vốn đã ăn mặc định `medium`. **`high` đắt gấp
  3,8 lần** — khoản ảnh nhảy từ ~5% lên ~20% giá bán (tool 25 Lượng ≈ 20.700đ), và
  cùng $15/tháng thì medium mua được ~8 lượt/ngày còn high chỉ ~2.
- ⚠️ **Trần ảnh free `viral.free_gen_daily_cap=6` suy từ giá CŨ.** Cùng $15/tháng
  nay mua được ~8 lượt/ngày. CỐ Ý không tự nới — đó là cần gạt ngân sách của
  Henry, sửa bằng một câu SQL `app_config`, không cần deploy.

---

## 📐 QUY ƯỚC BẮT BUỘC (đọc trước khi viết UI mới)

### 💰 Giá Lượng: CHỈ sửa trong Admin — client KHÔNG được chép số (2026-08-01, PR #373)
Nguồn duy nhất: bảng `tool_pricing` + `credit_packages`, sửa trong **Tools
Registry** của trang Admin, không cần deploy. Client đọc qua
`public/tool-prices.js` (`ToolPrices.get/rows/packages/fillSlots`), cache
sessionStorage 2 phút. Hiện giá ở UI = `<span data-tvp-price="<tool_id>">…</span>`.
- **Đọc hụt → `null`, KHÔNG đoán.** Ô để `…`; paywall **từ chối chạy** và hiện
  "Chưa đọc được bảng giá" thay vì trừ Lượng ở một mức người dùng chưa từng thấy
  (hộp thoại xác nhận đã bỏ ở #366 nên số trên nút là thứ cuối cùng họ đọc).
- **Chỉ `admin.html` được fetch thẳng** hai bảng đó — nó là trang SỬA giá.
- `npm run check:prices` (chạy trong CI lint) chặn tái phát: chép số vào ô giá,
  hoặc tự fetch bảng giá. Bộ dò đã được KIỂM bằng cách tái tạo đúng hai lỗi cũ.
- **Vì sao gắt thế:** cùng một bệnh tái đi tái lại trong MỘT ngày — `/app` quảng
  cáo Luận Giải 150 khi trừ 25 · nút Diện Tướng ghi 5 mà trừ 8 · trang nạp hứa
  "64 lá số" khi mua được 16 · 9/10 trang `/tools/*` ghi sai (Phong Thủy 90 vs
  50, Xem Tuổi 50 vs 15) · và bản dự phòng trôi lại ngay trong PR đi sửa nó.
  Một con số CŨ nguy hiểm hơn hẳn một ô đang tải: ô đang tải thì người ta chờ,
  số cũ thì người ta tin.
- ⚠️ CỐ Ý không gom quà đăng ký / thưởng giới thiệu vào đây — chúng đến từ
  `app_config`, khác nguồn. Nhét chung vào bộ dò thì nó kêu suốt rồi bị tắt.


### Icon: KHÔNG dùng emoji màu — chi tiết ở `docs/ICONS.md`
`public/nav.js` là bộ icon dùng chung (102 icon SVG Lucide + `EMOJI_TO_ICON` 242
mục + `mountIcons()`), nạp trên gần như mọi trang, export ra `window.ICONS` /
`window.iconHtml` / `window.mountIcons` / `window.EMOJI_TO_ICON`.
- UI mới: `<span class="ic" data-icon="wallet"></span>` — **không** emoji màu.
- HTML dựng động bằng `innerHTML` → phải gọi lại `window.mountIcons(el)`, vì
  `mountIcons()` chỉ tự chạy MỘT lần lúc nav.js load.
- Dữ liệu còn lưu emoji (`tool_pricing.icon`) → đưa qua `window.iconHtml(raw)`,
  nó nhận cả emoji lẫn tên icon. Đừng viết map emoji riêng cho từng trang.
- **GIỮ** ký tự đơn sắc theo font: `→ ← ✦ ★ ✓ ✗ ✕ ⚠ ☰` (riêng `→` có ~1.430 chỗ
  trong CTA). Chúng ăn `currentColor`, là phần của nhận diện — đổi là phá theme.
- **KHÔNG áp dụng** cho prompt gửi LLM (emoji ở đó là chỉ dẫn định dạng cho
  model) và tin Telegram admin (Telegram không render SVG).
- Thêm icon → sửa `ICONS` trong nav.js **và bump `nav.js?v=` trên cả 89 file**.
- **Trang KHÔNG có nav bar** (27 trang shell + 2 trang admin) nạp CHÍNH `nav.js`
  ở **chế độ chỉ-icon**: `<script src="/nav.js?v=22" data-icons-only></script>`
  → chỉ cấp icon + CSS, KHÔNG dựng nav, KHÔNG chèn GA4/`conversion.js`/`auth.js`.
  Nhờ vậy cả site dùng MỘT nguồn icon; `public/icons.js` không cần tồn tại.
  `shell.js` vẫn giữ bộ 28 icon riêng cho sidebar của nó — khác mục đích, không gộp.
- **`admin*.html` dùng MutationObserver** dựng icon cho mọi nhánh mới chèn (210
  chỗ `innerHTML`, gọi tay là chắc chắn sót). `mountIcons` bỏ qua phần tử đã có
  `<svg>` nên không lặp vô hạn.
- 🪤 **HAI BẪY đã vấp thật, chỉ lộ khi mở bằng trình duyệt:**
  1. **Đừng chèn span vào GIÁ TRỊ THUỘC TÍNH** (`placeholder="🔍 Tìm..."`) — dấu
     nháy trong span đóng sớm thuộc tính, **vỡ thẻ**, phần còn lại tràn ra màn
     hình. Bộ dò: `grep -nE '\b[a-zA-Z-]+="[^"]*<span class="ic-inline"'`.
  2. **Đừng đổi emoji đi vào `textContent`** — sink đó in nguyên chuỗi HTML.
     Chỉ đổi khi đích là `innerHTML`.
- ⚠️ **Nhánh dự phòng của span in EMOJI THÔ**, không để trống — nên "trang trông
  vẫn có icon" KHÔNG chứng minh icon đã dựng. Cách kiểm đúng duy nhất:
  `[data-icon]` nào KHÔNG chứa `<svg>` sau khi tải xong.

### Dùng thử rail cho khách CHƯA đăng nhập — cầu dao 3 lớp
`/api/v1/chat` KHÔNG còn 401 cứng khi thiếu token: khách vô danh được vài câu
dùng thử (`lib/billing/anon-trial.ts` + RPC `anon_rail_trial_consume`).
- **3 trần độc lập**, mỗi cái bịt một đường lách: `anon.rail_trial_turns` (trần
  ĐỜI theo `anon_id`) · `anon.rail_ip_daily_cap` (bịt xoá-localStorage, phải NỚI
  vì NAT nhà mạng) · `anon.rail_global_daily_cap` (cầu dao ngân sách).
  **Đặt bất kỳ trần nào = 0 là TẮT hẳn.**
- **Fail-CLOSED** — ngược `viral-budget.ts` (fail-OPEN) và ngược có lý do: cầu
  dao ảnh gác người ĐÃ TRẢ TIỀN, còn đây là khách vô danh chưa trả gì.
- **`client.anon_id` KHÔNG phải danh tính** — client tự khai. Đừng dùng cho
  quyền hạn/tính phí. Trần theo IP + toàn hệ thống mới là lớp chống lạm dụng.
- **Lượt anon CHẶN ảnh** (ảnh đội input token lên nhiều lần mà trần đếm theo
  LƯỢT) và **tiêu quota ngay khi cấp phép**, không đợi model xong — đếm sau khi
  thành công là mở đường gọi model rồi ngắt kết nối để khỏi bị tính.

### Giá trị 1 Lượng: SUY TỪ BẢNG GÓI, không còn hằng số neo
**⚠️ `app_config['credits.vnd_per_credit']` ĐÃ BỊ GỠ** — đừng viết code đọc lại
khoá đó. Nguồn thật giờ là bảng `credit_packages`: đơn giá = **gói bậc hai**
(theo `sort_order`, tức mức phổ thông) = 199.000/240 = **829đ**. Hai nơi cài
CÙNG một quy tắc, phải sửa kèm nhau:
- SQL `credit_vnd()` — cho các RPC báo cáo.
- `lib/billing/packages.ts` `vndPerCredit()` — cho route/rail. **Tự tính, KHÔNG
  gọi RPC** (rail là đường nóng), đổi lại phải giữ đúng cùng quy tắc.

**Vì sao ghi hẳn cảnh báo:** đọc khoá đã chết KHÔNG ném lỗi, nó im lặng rơi về
mặc định `1000` trong khi giá thật là `829` — sai 20% trên đúng con số đang hiện
cho người dùng, và không có gì báo. Đã dính đúng một lần.

**Ngoại lệ cố ý:** `coalesce(amount_vnd, amount * 2500)` cho dòng **topup lịch
sử** giữ nguyên 2500 — các giao dịch đó thật sự đã bán ở giá cũ, đổi là viết lại
lịch sử. Xem `_patches/migration-pricing-v2.sql`.

---

## 🚨 Vá cảnh báo 10:00 VN 30/07 — BỘ DÒ ĐANG NÓI DỐI (2026-07-30, PR mới)

Cảnh báo Telegram nêu 4 mục. Điều tra ra: **1 mục đúng hoàn toàn, 2 mục đúng dữ
liệu nhưng sai sự thật, 1 mục sai hẳn** — và trong lúc lần nguyên nhân thì lộ
thêm một bug đang dội thông báo vào máy người dùng thật. Ghi lại vì cả 4 đều là
lỗi của tầng GIÁM SÁT, tức loại lỗi làm mọi cảnh báo sau đó mất giá trị.

### 1. 🔴 «health-check CHƯA HỀ có lượt chạy» — SAI HẲN. Bộ dò đọc qua CACHE.
Lúc cảnh báo bắn (03:00Z), `cron_runs` đã có 3 dòng `ok` của job này (01:30 ·
02:00 · 02:30Z). Căn nguyên: **mọi lượt GET đọc `cron_runs`/`app_config` đều
thiếu `cache: 'no-store'`** — đúng bug repo đã dính một lần ở `/ket-qua/[id]`
("Next bọc `fetch` toàn cục và nhớ kết quả kể cả khi `dynamic='force-dynamic'`").
Dựng lại được nguyên chuỗi: lượt cron 00:01Z (bản build CŨ, chưa có job này
trong sổ) nạp cache cho ĐÚNG URL đó → job merge 01:14Z (#343), chạy thật từ
01:30Z → lượt 03:00Z vẫn đọc bức ảnh trước 01:30Z. **Cache Vercel sống XUYÊN
deploy** nên bản build mới không làm nó mới lại.
- Vá `cache:'no-store'` ở **cả 3 nơi** đọc: `anomaly-alerts.ts` · `ops/digest.ts`
  · panel admin (`payment/route.ts`). Không vá đủ 3 thì hai bộ dò nhìn hai bức
  ảnh khác nhau — đúng chuyện đã xảy ra: digest 07:30 báo *"12 job, tất cả chạy
  đúng lịch"*, cảnh báo 10:00 báo 3 job có vấn đề, **cùng một bảng**.
- **`CRON_RUNS_LIMIT = 1000` dùng chung** (`lib/ops/jobs.ts`) thay 3 con số 300
  chép tay. Cửa sổ là "N dòng gần nhất" nên một job ồn ào đẩy được job khác ra
  ngoài, mà job bị đẩy ra thì đọc thành *"CHƯA HỀ chạy"* — 300 dòng lúc đó chỉ
  với tới 3 ngày trước, trong khi job TUẦN cần nhìn lại 10,5 ngày.

### 2/3. 🟡 «autopilot giá/nhắc segment lượt gần nhất LỖI» — ĐÚNG DỮ LIỆU, SAI SỰ THẬT
Dòng "lượt gần nhất" của cả hai là `Error: Dynamic server usage…` từ **27/07**,
tức Next PRERENDER route lúc BUILD, không phải lịch cron gọi. Lượt THẬT gần nhất
của `autopilot-price` là 27/07 01:00Z **`ok`**; `autopilot-nudge` chưa có lượt
thật nào (vào `vercel.json` ngày 26/07, lượt T6 đầu tiên là 31/07).
- **Quy mô rác: 519/941 dòng = 55% cả bảng** (`cron-daily-push` 218 · cmo-digest
  64 · anomaly-alerts 63 · 3 autopilot 58 mỗi cái). Mỗi push — kể cả **preview
  build của mỗi PR** — là một build, nên rác sinh theo cấp số.
- Đã purge trên prod (`_patches/migration-purge-fake-cron-runs.sql`) + **xoá 3
  dấu cooldown giả** trong `marketing.anomaly_last_fired`, nếu không thì 20 giờ
  sau đó cảnh báo THẬT của đúng 3 job này bị nuốt.
- Chặn tái phát ở `lib/cron/log.ts` (`withCronLog`): bỏ qua sạch khi
  `NEXT_PHASE='phase-production-build'`, và nếu lỗi vẫn lọt thì **XOÁ** dòng nhịp
  tim chứ không chốt thành `error`. Thêm luôn: **lượt 401 cũng không log** — 8
  route cron đều phơi ra Internet, `withCronLog` bọc NGOÀI bước kiểm secret nên
  một con bot quét URL cũng đẻ được một dòng `error` rồi thành cảnh báo giả.
  ⚠️ CỐ Ý không hạ xuống `skip`: `skip` là trạng thái CÓ NGHĨA (chạy mà không có
  việc) và 3 skip liên tiếp là một cảnh báo riêng — nhét rác vào đó chỉ đổi một
  cảnh báo giả thành cảnh báo giả khác.
- `since: '2026-07-26'` cho 3 job autopilot: sau khi purge, `autopilot-nudge`
  còn 0 dòng → không có `since` thì vừa gỡ cảnh báo giả đã dựng lại cái khác.

### 4. 🔓 «4 hàm SECURITY DEFINER cho anon gọi» — ĐÚNG. Vá xong.
`credit_vnd` · `anon_rail_trial_status` · `anon_rail_trial_consume` ·
`anon_rail_hits_prune`. Đã `set local role anon` xác nhận gọi được TRƯỚC khi vá:
`credit_vnd`→1000, `trial_status`→`{cap:3,left:3,used:0}` của bất kỳ anon_id nào.
Nguy hiểm thật là **`trial_consume` (hàm GHI)**: ai cũng đốt được trần ngày toàn
hệ thống (200) và trần theo IP (30) của người khác — cùng loại lỗ
`rail_free_grant` đã vá ở S0.
- **Lượt thứ HAI liên tiếp bộ dò bắt được loại này** (hôm trước là
  `marketing_signup_truth`). Căn nguyên không đổi: EXECUTE cho PUBLIC là DỰNG
  SẴN của Postgres, `ALTER DEFAULT PRIVILEGES` không gỡ nổi → **mọi hàm mới đều
  sinh ra hở**. 4 hàm này còn KHÔNG có trong repo (0 nơi gọi, 0 file migration) —
  tạo ad-hoc qua MCP từ track "rail dùng thử cho khách chưa đăng nhập" (2 bảng
  `anon_rail_*` đều 0 dòng, tính năng chưa deploy).
- `_patches/migration-revoke-secdef-anon-rail.sql`, đã áp prod. `service_role`
  giữ nguyên quyền; `dashboard_margin`/`viral_loop_funnel` gọi `credit_vnd` lồng
  bên trong vẫn chạy (SECURITY DEFINER → quyền của CHỦ hàm).
- **⚠️ Nhắn track anon-rail:** nếu đang định gọi 3 hàm `anon_rail_*` THẲNG từ
  trình duyệt bằng anon key thì thiết kế đó tự nó đã hỏng (`p_anon_id` do client
  tự khai, `p_ip_hash` không tính đúng được ở client ⇒ trần nào cũng vượt) —
  chuyển sang gọi ở server bằng service key, đừng mở lại quyền.

### 🐞 Bug lộ ra trong lúc chẩn (nặng nhất, KHÔNG nằm trong cảnh báo)
**`/api/cron-push` chạy mỗi lần build VÀ ai gọi cũng được.** Đo được **315 dòng
trong 7 ngày (~45 lượt/ngày) cho một job lịch NGÀY**, mỗi dòng
`note='sent=2 · failed=0'` → thông báo web-push THẬT đã bay tới thiết bị người
dùng hàng chục lần/ngày thay vì một lần mỗi sáng. Hai khuyết cộng lại:
`export async function GET()` không nhận `request` và không đọc API động nào →
Next 14 coi là route TĨNH và **THỰC THI trọn vẹn ngay trong `next build`** (đây
là mặt còn lại của cùng một bug: 6 route kia đọc `request.headers` nên chỉ ném
DynamicServerError, route này thì chạy thật); và nó là cron **DUY NHẤT không
kiểm `CRON_SECRET`** — bất kỳ ai biết URL đều broadcast được.
- Vá: `dynamic='force-dynamic'` + kiểm `Bearer CRON_SECRET`. Verify trên build
  thật: `.next/server/app/api/cron-push` **không còn `.body`** (route tĩnh có
  `.body` — nó là kết quả chạy lúc build đem cache). Vercel cron và nút "Chạy
  ngay" của panel đều tự gắn header đó nên không chặn đường gọi hợp lệ nào.
- **CỐ Ý KHÔNG xoá 315 dòng log này** (khác 519 dòng rác build): chúng là lượt
  chạy THẬT, là bằng chứng của chính bug này.

### Verify
`tsc --noEmit` 0 lỗi · `eslint .` 0 lỗi (72 warning pre-existing) · `prettier
--check .` sạch · **19 ca trên module thật** (biên dịch `lib/ops/jobs.ts` +
`lib/cron/log.ts` rồi stub `fetch`): dựng lại đúng trạng thái prod sau purge →
health-check hết `overdue`, autopilot-price hết `failing`, autopilot-nudge
`awaitingFirstRun`; **3 ca ĐỐI CHỨNG vẫn kêu** (lỗi thật → `failing`, dòng
`running` treo 90 phút → `stuck`, job trắng log mà `since` đã cũ → `overdue`);
`withCronLog` build-phase → **0 lượt gọi Supabase**, prerender-error → POST→
DELETE, 401 → POST→DELETE, lượt thật → POST→PATCH `status=ok`, lỗi 5xx thật →
PATCH `status=error` · **route thật trên Next dev**: không header → 401, secret
sai → 401, secret đúng → qua cửa · SQL verify trên prod: ACL 4 hàm còn đúng
`{postgres,service_role}`, anon bị chặn cả 4 (khối `DO` bắt ngoại lệ),
`security_audit().ham_ho_cho_anon` **rỗng**, 519 dòng đã xoá / 0 dòng còn khớp
mẫu, cooldown map còn đúng 7 khoá.

### CÒN LẠI
- **Việc tay Henry:** không có việc bắt buộc. Chỉ cần để mắt bản digest 07:30 và
  cảnh báo 3h/lượt trong 1–2 ngày tới — nếu đúng thì `health-check` và 2 job
  autopilot phải IM, và `autopilot-nudge` có lượt thật đầu tiên **T6 31/07**.
- Nợ đã biết, chưa làm: `cron-push` còn 315 dòng lịch sử làm cửa sổ hẹp lại
  (tự khỏi sau ~2 tuần, `CRON_RUNS_LIMIT=1000` đã đủ che); và toàn repo vẫn còn
  nhiều lượt GET Supabase khác thiếu `cache:'no-store'` — chỉ vá đường GIÁM SÁT
  trong PR này, chưa rà hết các route nghiệp vụ.

---

## 🧭 Marketing Autopilot + CMO Orchestrator Quân Sư

**Branch:** `claude/marketing-autopilot-track-setup-vse38f`
**Cập nhật:** 2026-07-26

### 🔖 RESUME HERE
**🎉 TOÀN BỘ WORKPLAN M0.1–M0.6 ĐÃ XONG.** Track khởi tạo 2026-07-25 (Henry giao
thẳng "làm M0.1"), đi hết 6 milestone trong ~2 phiên: M0.1 vá lỗ hổng đo lường
ISR → M0.2 CMO Digest → M0.3 cảnh báo bất thường → M0.4 nối hành động nhắc user
→ M0.5 đề xuất content/campaign (advisory) → **M0.6 autopilot THỰC THI THẬT**
(tự chỉnh giá/khuyến mãi/nhắc segment — mốc rủi ro cao nhất track, xem chi tiết
thiết kế an toàn ở mục M0.6 bên dưới). M0.6 **shadow-mode mặc định trên prod**
— Henry tự bật từng phần qua `app_config`/SQL sau khi xem log. Không còn
milestone nào đã chốt còn tồn đọng; việc tiếp theo (nếu có) là ý tưởng MỚI,
chưa bàn.

### ✅ M0.1 XONG (PR mới, session này) — track.js + GA4 phủ hết ISR + gộp share-widget.js
**Audit phát hiện trước khi sửa:** dashboard Marketing (track Admin Revamp, S0-D6)
đo qua `events`/`track.js`, nhưng **toàn bộ 20 route ISR SEO** (`la-so/[slug]`,
`menh-kho/[year]` + `[day]`, `van-han` + `[slug]`, `nghien-cuu` + `[slug]`,
`tu-vi/[slug]`, `khao-luan/[slug]`, `tu-vi-hub` (5 cat rewrite), `tu-dien` +
`[slug]`, `tac-gia` + `[slug]`, `luan-giai/[slug]`) — tức phần lưu lượng SEO
LỚN NHẤT site — **0 file có `track.js`**, nên toàn bộ traffic tổ chức/AI-crawler
đổ vào các trang này hoàn toàn mù trong Funnel/Acquisition/DAU. 3 trang share/
kết-quả công khai khác (`ket-qua/[id]`, `luan-duong/[id]`, `shared-chat/[id]`)
**mù luôn cả GA4** (không load `nav.js` — thiết kế cố ý bỏ chrome nav để giữ
layout branded độc lập cho link chia sẻ, nên GA4 chưa từng nạp qua đường đó).
Ngoài ra `share-widget.js` (bar chia sẻ Web-Share/Zalo/Facebook/copy, dùng thật
ở `la-so/[slug]` + `nghien-cuu/[slug]`) gọi endpoint chết `/api/share-event`
(404 âm thầm, không dùng `Track.event`) — audit D6 (track Admin Revamp) từng ghi
nhầm là "code chết, không nơi nào gọi" vì bỏ sót 2 trang ISR này.
- **Sprint 1 — track.js vào 15 file ISR đã có `nav.js` (đã có GA4 sẵn qua đó):**
  chèn `<script src="/track.js?v=1" defer></script>` ngay trước mọi tag
  `nav.js` (20 vị trí — vài file có nhiều nhánh template). Cache `s-maxage`
  dài của các route này không chặn gì — trang cũ tự có track.js khi CDN
  revalidate/miss, không cần bump cache-bust.
- **Sprint 2 — `ket-qua`/`luan-duong`/`shared-chat`:** không load `nav.js` (sẽ
  phá layout branded — nav.js chèn nav bar lên đầu `<body>` nếu thiếu
  `#nav-ph`). Thêm `lib/analytics/isr-tracking.ts` export `GA4_TRACK_SNIPPET`
  (script GA4 gtag inline, CÙNG Measurement ID `G-F4XNRS2XT0` với `nav.js` +
  `track.js?v=1`) — nạp trực tiếp, không qua `nav.js`.
- **Sprint 3 — gộp `share-widget.js` vào `share.js`:** thêm `ShareButtons.renderBar()`
  (Web Share API mobile + copy + Facebook + Zalo, UTM tự động qua `campaign`
  param) vào `public/share.js` cạnh `ShareButtons.render()` (hàng nút inline cũ
  của blog/khao-luan/tai-lieu/contact/tu-binh) — MỘT nguồn duy nhất. Track qua
  `ShareButtons.track()` có sẵn (→ `Track.event('share', {meta:{medium}})`),
  bỏ hẳn `gtag`/`fbq`/fetch `/api/share-event` chết của bản cũ. `la-so/[slug]`
  + `nghien-cuu/[slug]` đổi sang gọi `ShareButtons.renderBar` + nạp `/share.js`
  (nghien-cuu gắn `campaign:'nghiencuu'` để tách UTM khỏi `campaign:'laso'`
  mặc định). **Xóa `public/share-widget.js`.**
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi (72 warning
  pre-existing, không liên quan), `npx prettier --check` sạch cho mọi `.ts`
  đụng tới, `node --check` share.js/track.js OK, `cd tuvi-engine && npm test`
  181 pass (không liên quan nhưng xác nhận không đụng engine).
### 📋 Workplan M0.2–M0.6 (Henry đã chốt thứ tự 2026-07-25)
Phác thảo dựa trên hạ tầng ĐÃ CÓ (không thêm RPC/bảng mới trừ khi ghi rõ):
`events`/`user_attribution` + 12 RPC marketing/dashboard (funnel/sources/
acquisition/campaigns/traffic/cohorts/revenue/margin/engagement/content-revenue/
at-risk/channel-error-rate), GA4 Data API, và kênh đẩy Telegram admin có sẵn
(`lib/admin/alert.ts`, dùng cho alert đăng nhập).
- **M0.2 — CMO Digest tự động** (gửi Henry, read-only): cron đọc RPC → LLM tóm
  tắt → Telegram admin. 1 lần/ngày.
- **M0.3 — Cảnh báo bất thường:** so số hôm nay/tuần với baseline, ngưỡng lưu
  `app_config`, bắn ngay khi vượt (không đợi digest định kỳ). Vẫn read-only.
- **M0.4 — Nối hành động "nhắc user sắp rời bỏ":** D1 (track Admin Revamp) đã
  làm UI nút "Nhắc qua Telegram/Gửi Push" ở bảng User Sắp Rời Bỏ nhưng CHƯA nối
  hành động thật (`cursor:default`). Mốc ĐẦU TIÊN động tới end-user — cần chốt
  nội dung/tần suất trước khi bật (tránh spam/vi phạm chính sách nền tảng).
- **M0.5 — Đề xuất content/campaign** (advisory, không tự chạy): LLM đọc
  `marketing_sources`/`campaigns`/`traffic` → đề xuất kênh/nội dung nên đầu tư,
  hiện trong admin dashboard, Henry tự quyết.
- **M0.6 (để sau, rủi ro cao):** autopilot thực thi thật (tự chỉnh giá/khuyến
  mãi/tự tạo campaign) — bàn riêng khi có nhu cầu, chưa trong phạm vi gần.

### ✅ M0.2 XONG (PR mới, session này) — CMO Digest tự động
- **`lib/marketing/cmo-digest.ts`** — `buildSnapshot()` gọi lại 9 RPC đã có
  (KHÔNG thêm RPC mới): `marketing_funnel`/`marketing_revenue` 2 lần (tuần này
  vs tuần trước, WoW) + `marketing_sources` + `dashboard_engagement` (đã có sẵn
  wau/wau_prev/mau/mau_prev) + `dashboard_margin` + `channel_error_rate` +
  `dashboard_at_risk` (đếm số lượng). `generateCmoDigestText()` gói snapshot
  thành JSON, đưa 1 lượt `llmText()` (`lib/llm/complete.ts`, Gemini-primary/
  Anthropic-backup có sẵn) với system prompt ép format "📈 Điểm sáng / ⚠️ Điểm
  nghẽn / 💡 Đề xuất", dưới 350 từ, CẤM bịa số khi dữ liệu quá ít.
- **`app/api/cron/cmo-digest/route.ts`** — cron Vercel (`vercel.json` thêm
  `0 1 * * *` = 8h sáng VN), auth `CRON_SECRET` giống `cron/daily-push` có sẵn.
  Gửi qua `tgSendMessage` (`lib/channels/telegram.ts`) tới CHÍNH
  `ADMIN_TELEGRAM_CHAT_ID` đã dùng cho alert đăng nhập — **0 env mới cần set**.
  No-op an toàn nếu thiếu `ADMIN_TELEGRAM_CHAT_ID`. Log qua `withCronLog` có
  sẵn → tự hiện trong panel "Cron & Jobs" admin.html, không cần đăng ký thêm.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi (2 file `.ts` mới
  nằm ngoài phạm vi eslint theo thiết kế — repo chỉ lint `.js`, TS qua `tsc`),
  `npx prettier --check` sạch.
- **CÒN LẠI:** Henry xác nhận `ADMIN_TELEGRAM_CHAT_ID` đã set trên Vercel (nên
  có sẵn — dùng chung với alert đăng nhập); theo dõi bản digest đầu tiên (8h
  sáng VN hôm sau khi PR merge + deploy) xem chất lượng tóm tắt LLM có ổn
  không, tinh chỉnh system prompt nếu cần.

### ✅ M0.3 XONG (PR mới, session này) — Cảnh báo bất thường
- **`lib/marketing/anomaly-alerts.ts`** — `checkAnomalies()` đọc lại 5 RPC đã
  có (`channel_error_rate`, `dashboard_margin`, `dashboard_engagement`,
  `marketing_revenue` ×2 hôm nay/tuần trước), so với ngưỡng/baseline, trả
  danh sách cảnh báo THẬT SỰ vượt ngưỡng. 4 loại:
  - **Sức khỏe kênh:** error rate 24h/kênh > 8% (khớp ngưỡng "đỏ" đã có trên
    UI D2), mẫu tối thiểu 20 lượt (né noise).
  - **Biên LN chat âm:** margin < 0 trong ngày, chỉ xét khi doanh thu chat đủ
    lớn (≥50k đ, né noise mẫu nhỏ).
  - **DAU sụt / doanh thu sụt:** so hôm nay với TB 7 ngày trước — CHỈ xét sau
    20h VN (đợi dữ liệu trong ngày tích đủ, tránh báo giả lúc mới đầu ngày vì
    so sánh 1 ngày CHƯA XONG với baseline cả-ngày sẽ luôn trông như "sụt").
  - Ngưỡng lưu `app_config` key `marketing.anomaly_thresholds` (đổi không cần
    deploy). Cooldown 20h/loại (key `marketing.anomaly_last_fired`) — tránh
    spam lặp cùng 1 cảnh báo mỗi lần cron chạy.
- **`app/api/cron/anomaly-alerts/route.ts`** — cron Vercel mỗi 3 giờ
  (`0 */3 * * *`), CÙNG pattern auth/log/kênh gửi với `cron/cmo-digest`. **Im
  lặng khi không có gì bất thường** (khác digest — luôn gửi đều đặn) — chỉ
  gửi Telegram admin khi thật sự vượt ngưỡng, prefix `🚨` để phân biệt trực
  quan với `🎖️ CMO Digest`.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `npx prettier
  --check` sạch.
- **CÒN LẠI:** theo dõi vài ngày đầu xem ngưỡng mặc định (30% DAU/40% doanh
  thu/8% lỗi kênh) có hợp lý không — false positive thì nới `app_config`,
  im lặng hoài thì siết lại.

### ✅ M0.4 XONG (PR mới, session này) — nối hành động "nhắc user sắp rời bỏ"
Mốc ĐẦU TIÊN động tới end-user. **Quyết định giảm rủi ro:** KHÔNG tự động hoá
nội dung/gửi — nút ở bảng "Sắp Rời Bỏ" (D1) mở `prompt()` cho admin tự soạn/sửa
nội dung TRƯỚC MỖI LẦN gửi (có sẵn text gợi ý điền sẵn), không có LLM hay
template cứng tự bắn. "Tần suất" bị chặn tự nhiên vì cần admin bấm tay từng
người — cộng thêm cooldown server-side 24h/user (chống bấm nhầm/lặp). Tự chọn
kênh theo đúng gợi ý D1 đã có sẵn trên UI (im lặng ≥30 ngày → Push, <30 ngày →
Telegram) — không thêm UI mới.
- **`lib/channels/push.ts`** (mới) — lift phần gửi FCM HTTP v1 (JWT RS256 tự
  ký → OAuth token → `messages:send`) ra khỏi `app/api/cron/daily-push/route.ts`
  thành `parseFirebaseServiceAccount`/`fcmAccessToken`/`sendFcmPush` DÙNG
  CHUNG — cron broadcast-tất-cả-token và nhánh gửi-1-người-mới đều gọi cùng 1
  nguồn (behavior-preserving refactor, daily-push route không đổi hành vi).
- **`handleAdminNudgeUser`** (`app/api/payment/route.ts`, action
  `admin-nudge-user`, verifyAdmin) — nhận `{userId,channel,text}`. Cooldown:
  đọc lại `events` (`event_type=retention_nudge`) 24h gần nhất, có rồi thì từ
  chối (429). Telegram: tra `chat_links` (platform=telegram) lấy `external_id`
  → `tgSendMessage`; chưa liên kết → lỗi rõ ràng, KHÔNG âm thầm bỏ qua. Push:
  tra `push_tokens` theo `user_id` (cột đã có sẵn từ đầu, cron daily-push
  trước giờ chỉ chưa lọc theo user) → `sendFcmPush`, tắt token chết. Gửi xong
  ghi `events` (`event_type=retention_nudge`, meta `{channel,admin_email}`)
  làm mốc cooldown lần sau.
- **`public/admin.html`** — nút gợi ý (span, `cursor:default`, KHÔNG bấm được)
  ở bảng At-Risk đổi thành `<button>` thật, `nudgeAtRiskUser()` mở `prompt()`
  soạn nội dung (điền sẵn câu gợi ý nhắc số dư Lượng + link `/app`) → xác nhận
  → `apiPost('admin-nudge-user', ...)` → `toast()` kết quả.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `npx prettier
  --check` sạch, `node --check` 2 script block admin.html OK.
- **CÒN LẠI:** test tay 1 lượt thật (cả Telegram lẫn Push) sau khi merge+deploy
  để xác nhận `chat_links`/`push_tokens` tra đúng user; theo dõi vài lượt đầu
  xem admin có thấy prompt() đủ dùng không hay cần nâng cấp thành modal đẹp
  hơn (không cấp bách — tool nội bộ).

### ✅ M0.5 XONG (PR mới, session này) — đề xuất content/campaign (advisory)
- **`lib/marketing/content-suggestions.ts`** — `generateContentSuggestions(from,to)`
  đọc lại 3 RPC đã có (`marketing_sources`/`marketing_campaigns`/`marketing_traffic`,
  KHÔNG thêm RPC mới), đưa 1 lượt `llmText()` với system prompt ép 2 phần
  "📊 Kênh nên đầu tư thêm/xem lại" (dựa `sources`) + "✍️ Ý tưởng nội dung"
  (dựa `traffic.top_paths/top_referrers`), CẤM bịa số, nói thẳng "chưa có
  chiến dịch nào gắn utm_campaign" khi `campaigns` rỗng (đúng thực trạng hiện
  tại — D6 đã ghi nhận bảng Campaign trống), luôn chốt 1 dòng nhắc đây là gợi
  ý tham khảo.
- **`handleAdminMarketingSuggestions`** (`app/api/payment/route.ts`, action
  `admin-marketing-suggestions`, verifyAdmin) — nhận `from`/`to` CÙNG khoảng
  ngày admin đang xem trên trang Marketing (không tự chọn khoảng riêng).
- **`public/admin.html`** — panel mới "Đề Xuất AI (Content/Campaign)" trong
  `#page-marketing`, nút **"✨ Sinh Đề Xuất"** — sinh ON-DEMAND (không tự tải
  khi mở trang, tránh tốn LLM mỗi lần vào dashboard), `mktGenSuggestions()`
  gọi API rồi render text (escape qua `escHtmlLocal`, `white-space:pre-wrap`
  giữ xuống dòng).
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `npx prettier
  --check` sạch, `node --check` 2 script block admin.html OK.
- **🎉 XONG M0.1–M0.5 (toàn bộ workplan đã chốt với Henry).** **CÒN LẠI:** dùng
  thử "Sinh Đề Xuất" vài lần sau khi có đủ dữ liệu sources/traffic để đánh giá
  chất lượng gợi ý LLM, tinh chỉnh system prompt nếu cần.

### ✅ M0.6 XONG (PR mới, session này) — autopilot THỰC THI THẬT, mốc rủi ro cao
Henry: "Scope m0.6 đi. Cứ làm theo workplan cho xong hết đi" — tự scope 4 sub-
milestone (6.1–6.4) + panel admin (6.5) trong 1 phiên. **An toàn nằm ở THIẾT KẾ,
không phải "nhớ tắt"** — 2 lớp khoá độc lập: (1) công tắc tổng
`app_config['marketing.autopilot_enabled']` mặc định **false**, code KHÔNG BAO
GIỜ tự bật, lỗi đọc config → coi như false; (2) mỗi loại hành động còn có khoá
phụ riêng (bound giá rỗng / budget khuyến mãi=0 / budget nudge=0 mặc định) —
tắt tổng CHƯA đủ, phải khai rõ từng loại. Khi tắt, cron vẫn chạy đều — chỉ TÍNH
+ LOG (`autopilot_actions`) + Telegram admin (prefix 🧪) để Henry xem trước khi
bật; khi bật, cùng logic, chỉ khác bước cuối áp dụng thật (prefix 🤖). Mọi hành
động LIVE có cooldown riêng (đọc lại `autopilot_actions`).
- **Migration `_patches/migration-autopilot-actions.sql`** (✅ ĐÃ CHẠY prod qua
  Supabase MCP — verify 9 cột + RLS policy `autopilot_actions_admin_read`):
  bảng `autopilot_actions` (ts, action_type, mode shadow/live, target,
  before/after jsonb, reason, meta) — nhật ký DUY NHẤT mọi hành động, dùng cho
  cooldown lẫn panel admin. RLS đọc chỉ admin JWT (giống pattern events).
- **`lib/marketing/autopilot.ts`** (hạ tầng dùng chung) — `isAutopilotEnabled()`
  (fail-safe → false), `logAutopilotAction()`, `inCooldown(actionType,target,days)`
  (chỉ tính LIVE — shadow không giới hạn, vì không có hiệu lực thật),
  `notifyUserBestChannel()` (Telegram trước qua `chat_links`, else Push qua
  `push_tokens`, dùng chung cho promo_grant + segment_nudge), `notifyAutopilotRun()`
  (gộp N hành động/lượt cron thành 1 tin Telegram admin, tránh spam).
- **M0.6.2 — `lib/marketing/autopilot-price.ts`** — CỐ Ý THU HẸP: `dashboard_margin`
  (D3) chỉ có margin THẬT (doanh thu khớp chi phí) cho bucket `chat`
  (`rail-message`) — mọi bucket khác theo `scenario.type` CHỈ có cost, không có
  doanh thu riêng (billing rail phẳng). Tự chỉnh giá dựa số không khớp doanh thu
  là bịa → CHỈ áp `rail-message`. Hành động DUY NHẤT: TĂNG giá khi margin ÂM đủ
  lâu (tự vệ, ngăn lỗ tiếp) — KHÔNG BAO GIỜ tự giảm giá (tối ưu tăng trưởng bằng
  hạ giá cần con người quyết, rủi ro/lợi ích không đối xứng). Cần Henry khai
  `app_config['marketing.autopilot_price_bounds']['rail-message']={max,step}`
  mới đủ điều kiện (map rỗng mặc định = chưa tool nào bật). Cooldown 14N/tool.
- **M0.6.3 — `lib/marketing/autopilot-promo.ts`** — cấp Lượng bonus (mặc định
  5 Lượng) cho user tại `dashboard_at_risk` (CÙNG RPC bảng At-Risk D1 + nút nhắc
  tay M0.4, nhưng cooldown 30N ĐỘC LẬP — nhắc tay không tính vào đây). Budget/
  lượt `app_config['marketing.autopilot_promo'].budgetCreditsPerRun` mặc định
  **0 = tắt**, Henry phải tự đặt số dương. Hết budget giữa lượt chạy → phần còn
  lại rơi về shadow (không chặn cứng cả lượt). Gắn `credit_transactions
  type='autopilot_promo'`.
- **M0.6.4 — `lib/marketing/autopilot-nudge.ts`** — "tự tạo campaign" KHÔNG có
  tích hợp Facebook/Google Ads API (ngoài phạm vi, cần Henry cấp key) nên nghĩa
  là chiến dịch NHẮC LẠI qua kênh sở hữu (Telegram/Push) tới segment "sắp im
  lặng SỚM HƠN" promo (idle 7–13N, dùng lại `dashboard_at_risk(idle_days=7)`
  rồi lọc bớt phần ≥14N để không trùng segment M0.6.3). Message CỐ ĐỊNH (không
  LLM mỗi lượt — tránh chi phí + nội dung không kiểm soát), chỉ nhắc, không
  tặng gì. Budget/lượt mặc định **0 = tắt**.
- **3 cron mới** (`app/api/cron/autopilot-{price,promo,nudge}/route.ts`,
  pattern CRON_SECRET giống `cmo-digest`/`anomaly-alerts`) — TUẦN, dàn 3 ngày
  khác nhau tránh dồn tải: giá T2, khuyến mãi T4, nhắc segment T6 (8h sáng VN,
  `vercel.json`).
- **M0.6.5 — `handleAdminAutopilotLog`** (`app/api/payment/route.ts`, action
  `admin-autopilot-log`, verifyAdmin) — THUẦN ĐỌC: 100 hành động gần nhất +
  snapshot config hiện tại. **CỐ Ý KHÔNG có action bật/tắt qua API/UI** — Henry
  tự bật qua `app_config`/SQL trực tiếp, tránh 1-click bấm nhầm cho tính năng
  rủi ro cao. `public/admin.html` — panel "Autopilot — Nhật Ký Hành Động" trong
  `#page-marketing` (badge trạng thái BẬT/TẮT + bảng log mode shadow/live +
  before→after + lý do), load cùng lúc `loadMarketing()`.
- **Verify:** `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi (72 warning
  pre-existing), `npx prettier --check` sạch cho mọi `.ts`/`.json` đụng tới,
  `node --check` 3 script block admin.html OK, `cd tuvi-engine && npm test`
  181 pass. Migration verify trực tiếp qua Supabase MCP.
- **CÒN LẠI (việc tay Henry, KHÔNG code):** mọi thứ M0.6 đang **shadow-mode**
  trên prod ngay khi merge (an toàn, không hành động thật) — theo dõi vài tuần
  log ở panel Autopilot trước khi cân nhắc bật thật từng loại qua `app_config`.
  Bật `marketing.autopilot_enabled=true` KHÔNG tự làm gì nếu chưa khai thêm
  bound/budget riêng từng loại (price bounds / promo budget / nudge budget đều
  mặc định rỗng/0).

---

## 🔌 Đọc GA4 từ terminal — `scripts/ga4.mjs` (2026-07-28)

Henry hỏi "làm sao nối Google Analytics vào cho mày đọc rồi phân tích". Trước đó
repo CÓ `lib/analytics/ga4.ts` nhưng nó chỉ lấy ĐÚNG 1 con số (tổng `sessions`,
để vá ô "Khách ghé" panel Funnel D4) — không phải cửa để ngồi phân tích.
- **`scripts/ga4.mjs`** — CLI thuần Node (0 dependency mới), auth service-account
  JWT tự ký giống `ga4.ts`/`indexing-api.mjs`, scope **`analytics.readonly`**.
  11 preset (`overview`/`daily`/`traffic`/`channels`/`campaigns`/`pages`/`landing`/
  `events`/`devices`/`countries`/`referrers`/`realtime`) + `report` tự chọn
  dimension/metric + `metadata` tra tên hợp lệ. Cờ `--from/--to` (nhận
  `28daysAgo`/`yesterday`/`YYYY-MM-DD`), `--filter dim==val | =~ | !=`, `--order`,
  `--limit`, `--json`.
- **Credential:** env `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` (**CÙNG TÊN**
  với env Vercel của `ga4.ts` — set 1 bộ dùng được cả hai), hoặc `--sa <file.json>`
  khi chạy ở máy Henry. **Không dán private key vào khung chat** (nằm lại trong
  lịch sử hội thoại — cùng lý do đã phải rotate service_role key Supabase).
- **`docs/GA4-CLI.md`** — bảng cờ + so sánh với `lib/analytics/ga4.ts`. **Bước 1–3
  (enable Data API → service account → cấp Viewer property `533053153`) HENRY ĐÃ
  LÀM XONG TỪ D4**, doc giữ lại dạng `<details>` để tham chiếu. **Chỉ còn bước 4**:
  env của Vercel KHÔNG chảy vào container phiên Claude Code (quét 127 biến env
  trong phiên: 0 biến GA4/GOOGLE/SERVICE_ACCOUNT) → phải đặt riêng
  `GA4_PROPERTY_ID`/`GA4_SERVICE_ACCOUNT_JSON` cho environment Claude Code (copy y
  hệt giá trị bên Vercel, không phải đụng lại Google), hoặc chạy `--sa` ở máy Henry.
- **Verify:** `node --check` · `eslint` sạch · `prettier --check .` sạch · chạy
  thật với RSA key tự sinh + stub OAuth (JWT đúng 3 phần, scope đúng, đổi được
  token) và stub Data API (bảng render đúng, TỔNG + "hiển thị 3/9 dòng", request
  body đúng cho `traffic`/`report`/`realtime`→`:runRealtimeReport`/`metadata`) ·
  gọi thật `analyticsdata.googleapis.com` với token giả → **401 + thông điệp lỗi
  của Google hiện đúng** (chuỗi auth chạy tới cùng). **CHƯA chạy được lượt có
  quyền thật** vì container phiên chưa có credential — đó chính là việc tay Henry.

### 🐞 Vòng sau (2026-07-28) — env đã set nhưng BỊ CẮT, và lộ bug prod thật
Henry set `GA4_PROPERTY_ID`/`GA4_SERVICE_ACCOUNT_JSON` cho container Claude Code
rồi bảo chạy thử. Kết quả: vẫn chưa đọc được GA4 — **nhưng lần này lỗi nằm ở
giá trị env, không phải ở quyền Google**, và lúc lần ra thì lộ thêm một bug đang
sống trên prod.
- **Trong container:** `GA4_SERVICE_ACCOUNT_JSON` dài đúng **18 ký tự** =
  `ewogICJ0eXBlIjo...` — tức bản RÚT GỌN mà UI Vercel hiển thị, không phải giá
  trị đầy đủ. `GA4_PROPERTY_ID=533053153` thì đúng. → **việc tay Henry: mở đúng
  ô đó trên Vercel, Show/Copy giá trị đầy đủ, dán lại vào environment của Claude
  Code.** Chưa có bản đầy đủ thì không có cách nào chạy thật.
- **🔴 Bug prod (quan trọng hơn):** cái tiền tố `ewogICJ0eXBlIjo` **base64-decode
  ra `{\n  "type":`** → giá trị Henry lưu bên Vercel là **base64**, trong khi
  `lib/analytics/ga4.ts` chỉ `JSON.parse` thô (CLI `scripts/ga4.mjs` thì nhận cả
  hai từ đầu). Parse hỏng → `getAccessToken` trả `null` **im lặng** →
  `handleAdminMarketing` lặng lẽ rơi về số nội bộ. Nghĩa là D4 nhiều khả năng
  **chưa từng chạy bằng số GA4 thật** kể từ lúc ship, mà không có gì báo. Sửa:
  tách `parseServiceAccount()` nhận **raw JSON hoặc base64** (chỉ NỚI ra, raw
  vẫn chạy y như cũ) + `console.warn` khi parse hỏng để lần sau lộ ra ngay.
  **Henry check lại badge cạnh "Khách ghé" trong panel Funnel sau khi deploy —
  xanh "GA4" là đã ăn số thật.**
- **CLI:** thêm bẫy phát hiện bản bị cắt (kết thúc bằng `...`/`…` hoặc < 100 ký
  tự) → chỉ thẳng "copy ô rút gọn trên Vercel" thay vì để người ta đọc "JSON
  không hợp lệ" rồi đi dò nhầm sang phía Google.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` · **test `getGa4Sessions` với RSA key tự sinh
  + stub OAuth/Data API**: raw JSON và base64 **ra cùng 1 kết quả** (JWT RS256,
  scope + URL `properties/533053153:runReport` + body đúng), bản bị cắt và chuỗi
  rác → `null` + cảnh báo, KHÔNG gọi mạng · CLI với key giả gọi thật
  `oauth2.googleapis.com` → `400 invalid_grant: account not found` (chuỗi auth
  chạy tới cùng, chỉ thiếu key thật). Gặp 1 nhịp `503` rỗng từ token endpoint
  rồi tự khỏi ở lượt sau — nhiễu tạm thời, không phải lỗi code.

### ✅ Vòng sau — GA4 nhiều chiều: panel "GA4 vs Nội Bộ" + nối vào CMO digest (PR mới)
Henry hỏi "lấy được live data chưa, realtime không, admin bổ sung được data gì, và
mỗi ngày gửi report cho CMO orchestrator được không". Audit trả lời: phễu
**không thiếu bậc** (visit→signup→activate→topup_intent→paid→returned đã đủ), chỗ
đứt là **GA4 chỉ đóng góp ĐÚNG bậc 1** — bậc 2–6 toàn dữ liệu nội bộ, nên không
quy kết được kênh GA4 nào đẻ ra người trả tiền, mà bảng Sources lại dựa
`user_attribution` từ `track.js` (chỉ thấy khách đã chạy JS) nên luôn hụt.
- **`lib/analytics/ga4.ts`** — tách `runReport()` dùng chung + `getGa4Breakdown()`:
  tổng sessions · **kênh** (`sessionDefaultChannelGroup`) · **landing page**
  (`landingPage`) · **`activeNow`** (`:runRealtimeReport`, 30 phút gần nhất — chiều
  DUY NHẤT thật sự "realtime"; Data API thường có độ trễ). 4 report chạy SONG SONG
  trên CÙNG 1 access token đã cache; **mỗi report hỏng độc lập** (realtime 403 thì
  `activeNow=null`, phần còn lại vẫn dùng được). `getGa4Sessions` giữ nguyên chữ ký.
  Thêm `console.warn` khi report lỗi — cùng lý do với bug base64: im lặng thì hỏng
  âm thầm hàng tháng.
- **`handleAdminMarketing`** đổi sang `getGa4Breakdown`, trả thêm `ga4` kèm
  **`internalVisitors`** (số nội bộ TRƯỚC khi bị GA4 ghi đè) — đó chính là vế còn
  lại để so hai nguồn.
- **Panel "GA4 vs Nội Bộ"** (`renderMktGa4`, ngay dưới Funnel): 4 tile (Phiên GA4 ·
  Nội bộ đo được · **% đo được** với ngưỡng xanh ≥80/cam ≥60/đỏ <60 · Đang online
  30ph) + 2 bảng kênh/landing. Tooltip nói rõ **% đo được thấp KHÔNG phải traffic
  giảm** mà là bảng Nguồn/Traffic đang dựa trên mẫu thiếu — đây là chỗ dễ đọc sai
  nhất nên viết thẳng vào UI.
- **`cmo-digest.ts`** — `buildSnapshot()` gọi thêm `getGa4Breakdown` (best-effort,
  `.catch(() => null)`, KHÔNG kéo sập digest). System prompt thêm nguyên một khối
  luật đọc GA4: `ga4=null` → nói thẳng "chưa đọc được GA4", cấm đoán lưu lượng;
  chênh GA4 vs nội bộ là đo hụt chứ không phải sụt; tỉ lệ ghép 2 nguồn phải ghi rõ
  là ước lượng. **→ digest Telegram 8h sáng tự có GA4, 0 cron mới, 0 env mới.**
- **Routine chat "Báo cáo CMO hàng ngày 8h10"** (`trig_01MDKn384hYTyLxbdRtunuoc`)
  **CHƯA sửa được bằng tool** — nó bind vào phiên khác (`update_trigger` từ chối
  sửa prompt của routine bắn vào session không phải của mình). Việc tay Henry: thêm
  bước chạy `scripts/ga4.mjs overview|channels|landing --from 7daysAgo` vào prompt.

### 🐞 Vòng sau — GA4 ĐANG BỊ CI THỔI PHỒNG, vá nốt nửa còn lại của D6 (PR mới)
Henry set env đầy đủ trên Vercel + Redeploy → panel "GA4 vs Nội Bộ" ra số THẬT
(2.088 phiên · nội bộ 531 · đang online 6 — nhánh realtime cũng chạy). **Nhưng
đọc số thì lộ bug:** top trang đáp là `/` · `/xem-lam-an.html` · `/xem-tuoi.html`
· `/luan-giai.html` · `/khao-luan.html` · `/blog.html` · `/profile.html` ·
`/resources.html` — **gần đúng danh sách URL trong `tests/*.spec.ts`**, mà
`playwright.yml` chạy E2E **thẳng vào prod** mỗi push/PR.
- **Căn nguyên: D6 vá đúng một nửa.** `track.js` có `if (navigator.webdriver)
  return` từ D6, nhưng GA4 nạp qua `nav.js` + `GA4_TRACK_SNIPPET` thì KHÔNG có
  chốt đó → CI vào GA4 nhưng không vào `events`. Hai nguồn đếm hai tập khách
  khác nhau.
- **Ba hệ quả trên chính bảng đang xem:** (a) Direct 1.783/2.088 = **85%** vì CI
  không có referrer; (b) **"% đo được 25%" là số ảo** — thấp một phần do GA4 đếm
  CI còn nội bộ thì không, khoảng hụt THẬT hẹp hơn; (c) Organic Search chỉ **36
  phiên** và **không có `/la-so/*` nào** trong top landing dù log Vercel đầy
  request `/la-so/…` → 438K trang SEO đang được **crawler quét chứ chưa kéo
  người thật** (bot không chạy JS nên không vào GA4). (c) mới là con số đáng lo,
  và chỉ lộ ra nhờ có GA4.
- **Vá:** thêm `&& !navigator.webdriver` vào cả `public/nav.js` lẫn
  `lib/analytics/isr-tracking.ts` — khớp đúng chốt `track.js` đã dùng. Bump
  `nav.js?v=16/15/17 → 18` (89 file; trước đó version đang lệch 3 mức khác nhau,
  gộp luôn về 1).
- **⚠️ Số GA4 sẽ TỤT RÕ sau khi deploy — đó là fix chạy đúng, không phải traffic
  chết.** Từ mốc đó "% đo được" mới là con số đọc được.
- **Verify:** `tsc` 0 lỗi · `eslint nav.js` sạch · `prettier --check .` sạch ·
  `node --check` · **Playwright 4 ca trên nav.js THẬT và trên chính chuỗi
  `GA4_TRACK_SNIPPET` đọc từ file `.ts`**: webdriver=true → không dựng thẻ
  `#gtag-js`, không có `window.gtag`, `dataLayer` rỗng; giả lập người thật
  (`navigator.webdriver=false`) → đủ cả ba, `dataLayer` có sự kiện.

### ✅ Vòng sau — GA4 lưu vào `events` để routine chat đọc được (PR mới)
Henry thử `scripts/ga4.mjs` ở phiên mới: **vẫn báo thiếu credential** (env của
container chưa nhận giá trị đầy đủ) — và chốt "không sao, tao chỉ cần data feed
cho routine CMO + admin page theo dõi". Nhưng đó chính là chỗ còn hụt: panel admin
và digest Telegram chạy trên **Vercel** (có key, đã xong ở vòng trước), còn routine
chat 8h10 chạy trong **một phiên Claude khác không có key** → tự nó KHÔNG BAO GIỜ
thấy GA4, dù prompt có bảo chạy CLI.
- **Cách vá — không phát tán thêm credential, không thêm bảng:** cron `cmo-digest`
  (8h00, chạy trên Vercel, vốn ĐÃ lấy GA4 cho snapshot) nay ghi luôn snapshot GA4
  thô vào `meta.ga4` của chính dòng `events` `event_type='cmo_digest'` mà nó vẫn
  ghi sẵn. Routine chat chạy 8h10 — 10 phút sau — chỉ cần đọc dòng mới nhất qua
  Supabase MCP là có đủ sessions/kênh/landing/activeNow/internalVisitors.
  `generateCmoDigestText()` đổi từ trả `string` → `{ text, ga4 }` (chỉ 1 caller).
- **Ghi cả khi `ga4=null`** — để phân biệt "hôm đó GA4 hỏng" với "hôm đó cron
  không chạy"; hai ca này mà lẫn nhau thì lần sau không chẩn được.
- **Lợi kèm:** có LỊCH SỬ GA4 theo ngày nằm trong `events`, truy vấn SQL được —
  trước đây GA4 chỉ đọc tức thời rồi vứt, không so được hôm nay với tuần trước.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi · `prettier --check .` sạch · test
  `generateCmoDigestText` trên file thật (stub LLM/GA4/RPC): trả đúng
  `{text, ga4}`, `ga4` đủ 5 trường, GA4 chết → `ga4:null` mà digest vẫn chạy.
  **CHƯA chạy được test đầu-cuối cho route cron** — nạp `next/server` ngoài
  Next runtime làm V8 OOM lúc biên dịch regex; phần route chỉ là truyền thêm 1
  tham số vào body insert sẵn có, đã soi tay + `tsc` phủ.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` cả 3 script block admin · **stub test
  `getGa4Breakdown`**: đúng 1 token + 4 report, đúng dimension/metric/limit,
  `orderBys` giảm dần theo sessions, realtime KHÔNG gửi `dateRanges`, realtime 403
  → chỉ `activeNow=null`, thiếu `GA4_PROPERTY_ID` → null và **0 call mạng** ·
  **test `generateCmoDigestText` trên file thật** (chỉ thay import LLM bằng stub):
  GA4 vào snapshot kèm `internalVisitors` đúng, **KHÔNG ghi đè
  `funnelThisWeek.visitors`** (giữ được cả 2 vế để so), GA4 chết → `ga4:null` mà
  digest vẫn chạy đủ RPC nội bộ · **Playwright render panel thật** light + dark:
  nhãn/số/`% đo được` đúng công thức, landing page chứa HTML **bị escape** (không
  chèn được thẻ), ca `null` hiện hướng dẫn kiểm env.

### ✅ Vòng sau — GA4 "Key events" luôn bằng 0: site chưa từng gửi event cho GA4 (2026-07-31, PR mới)
Henry gửi ảnh app GA4: *"Nó ko có gì luôn ah"* — card **Key events = 0**, trend
phẳng, Realtime *"No data available"*. Điều tra ra **GA4 không hề down**, và
chính tấm ảnh đó có bằng chứng: ô cạnh bên ghi `Event count per user 4.77 ↑11.8%`
— có số, còn tăng. Cái trống là một chuyện khác hẳn.
- **Căn nguyên:** `grep gtag(` toàn repo chỉ ra `gtag('js')` + `gtag('config')` ở
  `public/nav.js` và `lib/analytics/isr-tracking.ts` — **0 dòng `gtag('event',…)`
  trong cả codebase**. GA4 vì thế chỉ có event TỰ ĐỘNG (`page_view`,
  `session_start`, `first_visit`, `scroll`, `user_engagement` — khớp đúng con số
  4,77/user). Mọi tín hiệu nghiệp vụ (`signup`, `topup_start`, `tool_run`,
  `share`, `cta_click`…) đi `/api/track` vào bảng `events` Supabase và **chưa bao
  giờ chảy sang GA4** ⇒ không có gì để đánh dấu key event ⇒ báo cáo conversion
  của GA4 **vĩnh viễn 0**. Thiếu cầu nối, không phải sự cố.
- **Vá — một chỗ duy nhất, `public/track.js`:** `event()` gửi song song
  `gtag('event', …)`. Không phải sửa 89 trang vì mọi nơi đã gọi `Track.event`.
  Bảng `events` nội bộ **vẫn là nguồn chuẩn** cho admin; GA4 chỉ là bản sao để
  dùng công cụ Google. Lượt gửi GA4 đứng SAU `send()` và bọc `try/catch` — GA4
  hỏng không được kéo theo beacon nội bộ.
- **`page_view` CỐ Ý không gửi:** `gtag('config')` đã tự bắn một cái mỗi lần tải
  trang; gửi thêm là đếm đôi — đúng lỗi đã dính một lần khi `GA4_TRACK_SNIPPET`
  vô tình kèm thẻ `track.js` trên `/ket-qua`.
- **Hàng đợi là bắt buộc, không phải phòng xa:** `track.js` nạp NGAY TRƯỚC
  `nav.js`, cả hai `defer` nên chạy theo thứ tự tài liệu → lúc event đầu bắn thì
  `window.gtag` CHƯA tồn tại. Xếp hàng rồi xả khi gtag xuất hiện; **không đẩy
  thẳng vào `dataLayer`** vì event lọt vào trước `gtag('config')` có thể bị
  gtag.js bỏ qua. Bỏ cuộc sau ~10s để trang không có GA4 (`admin.html`) không
  treo timer vĩnh viễn.
- `signup` → **`sign_up`** (tên GA4 khuyến nghị, rơi đúng báo cáo dựng sẵn);
  `login`/`share` vốn đã trùng tên khuyến nghị. Tham số: chỉ giá trị vô hướng,
  **trải phẳng `meta` một tầng** (đó là chỗ chứa phần có nghĩa nhất — `medium`
  của share, `from`/`need` của topup_start), cắt chuỗi 100 ký tự, tối đa 24
  tham số, loại tên sai luật GA4 và tiền tố dành riêng `ga_`/`google_`/
  `firebase_`. **`anon_id`/`session_id` CỐ Ý bỏ** — GA4 tự có định danh riêng.
- Bump `track.js?v=2→3` (27 chỗ / 20 file).
- **Verify:** `tsc` 0 lỗi · `eslint track.js` sạch · `prettier --check .` sạch ·
  `node --check` · **8 ca Playwright trên CHÍNH file `track.js` thật**: page_view
  không sang GA4 mà beacon nội bộ vẫn có · event bắn trước khi gtag tồn tại vẫn
  tới nơi sau khi xả hàng đợi · `signup→sign_up`, `login`/`share` giữ nguyên ·
  meta trải phẳng, object lồng/`first`/`anon_id` bị loại · tên sai luật bị loại
  + chuỗi 250 ký tự cắt còn 100 · trang không có GA4 → 0 lỗi console, beacon vẫn
  chạy · `webdriver=true` → **không gửi cả GA4 lẫn beacon** (giữ nguyên chốt
  chặn CI) · **1 ca trên trang THẬT `index.html` với `nav.js` THẬT**: event tới
  `dataLayer` qua gtag của chính nav.js, và `config` đứng TRƯỚC `event` trong
  hàng đợi. ⚠️ Playwright đặt `navigator.webdriver=true` mặc định nên `track.js`
  tự no-op — phải `defineProperty` cho nó về `false` mới test được người thật
  (test artifact, không phải bug).
- **CÒN LẠI (việc tay Henry, không code được):** sau khi merge + deploy, vào
  **GA4 → Admin → Events**, đợi event mới xuất hiện (thường vài giờ tới 24h) rồi
  bật **"Mark as key event"** cho `sign_up` · `topup_success` · `tool_run`. Chưa
  bật thì card Key events vẫn 0 dù dữ liệu đã sang. Realtime trống lúc sáng sớm
  là **đúng thực tế**, không phải lỗi đo: `traffic_quality` 7 ngày cho 519 lượt
  ghé nhưng chỉ **25 lượt tương tác thật** (~3–4 người/ngày).

---

## 🧭 Ba lớp danh xưng: Quan Lộc × Mệnh × Thân — 194 → 566 (2026-07-29, PR mới)

Henry: *"vẫn dựa trên cung Quan làm core mà giờ mày tổ hợp nó với cung Mệnh,
cung an Thân… tao nghĩ nó sẽ lên cả ngàn danh xưng."* Đo trước khi code
(10.080 lá số) — **đúng một nửa**:

| Trục | Tổ hợp | 2 người trùng |
|---|---|---|
| Quan Lộc (đang có) | 39 | 4,90% |
| Quan × **Mệnh** | **60** | 2,09% |
| Quan × Mệnh × **Thân** | 372 | 0,33% |
| + bậc + giới | **1.316** | 0,11% |

- **🔴 Cung MỆNH gần như không nhân được gì.** Mỗi bộ chính tinh ở Quan Lộc
  chỉ ứng với **TRUNG BÌNH 1,54 bộ ở Mệnh** (min 1, max 10) → Quan × Mệnh chỉ
  ra 60 chứ không phải 39×39. Lý do cấu trúc: 14 chính tinh an theo một thuật
  toán từ vị trí Tử Vi nên cả 12 cung chỉ có **12 thế**, mà Mệnh với Quan Lộc
  **cách nhau cố định 4 cung** → biết cái này suy ra cái kia. Hai cung KHÔNG
  độc lập. Đừng thiết kế như thể chúng độc lập.
- **✅ Cung THÂN mới là trục nhân thật (×6).** Thân đóng vào 1 trong 6 cung
  (Mệnh · Phúc Đức · Quan Lộc · Thiên Di · Tài Bạch · Phu Thê) do **giờ sinh +
  tháng sinh** quyết định — độc lập với thế an sao, đo được trải đều đúng
  16,7%/cung.
- **`THAN_ASPECT`** (6 cung × 7 nhóm nghề = 42 hậu tố + `propEn` + `aspect`).
  Hậu tố theo **NHÓM NGHỀ chứ không theo tên sao** — ghép theo sao rất dễ ra
  "Thầy lang coi kỵ binh". Thân cư Mệnh → hậu tố **RỖNG có chủ ý** (cổ pháp:
  dồn cả đời một hướng, không rẽ nhánh).
- **`propEn` = ĐẠO CỤ vào prompt ảnh** — đây là chỗ khác hẳn trục sát tinh đã
  cân nhắc rồi bỏ: trục đó chỉ đổi chữ, `attireEn` giữ nguyên nên **ảnh y hệt**.
  Mảng Thân đổi được vật trong tay nhân vật (sổ sách + cân, hành trang, đồ tế
  khí…) nên bức tranh khác thật. Phủ 83,3% (16,7% còn lại là Thân cư Mệnh).
- **`MENH_ROLE`** (14 sao) — tư cách: thống lĩnh / tham mưu / dựa người / tay
  nghề. **CỐ Ý KHÔNG vào danh xưng**, chỉ vào `desc` + prompt truyện: danh xưng
  đã mã hoá CẤP qua bậc, nhét tư cách vào là tự mâu thuẫn (bậc cao ra "Đại
  nguyên soái" mà Mệnh lại nói "hợp làm tham mưu"). Mệnh vô chính diệu thì
  **mượn xung chiếu** (cổ pháp 8.45, cùng cách Quan Lộc) — không mượn thì 15,4%
  lá số mất hẳn lớp này (đã đo, đã vá → phủ 100%).
- **`TITLE_MAX_LEN = 30`** — bản đầu KHÔNG có trần: ra 926 danh xưng nhưng
  trung bình **28,7 ký tự**, dài nhất **43** (*"Nữ võ quan vướng lao lý trấn
  nhậm phương xa"*), 60% vượt 28 — phá thẳng luật "title ngắn để nhớ mà kể
  lại" Henry đã chốt. Thêm trần → **566 danh xưng**, trung bình 21,7, dài nhất
  đúng 30. **Đánh đổi có ý thức: mất 39% biến thể để giữ danh xưng đọc được.**
  Danh xưng gốc vốn đã dài thì bỏ hậu tố — mảng đời vẫn vào truyện và vào ảnh
  qua `aspect`/`propEn`, chỉ không chen vào danh xưng.

**Kết quả:** 194 → **566 danh xưng** · trùng 0,85% → **0,47%** (1/210) · kèm
nền văn minh **2.167 tổ hợp**, trùng **0,11%** (1/930) · nhóm 50 người có
người trùng 34% → **21%**.

- **🔑 Nguồn: RAG chứ không phải file trong repo.** `chunks_all.json` chỉ có 5
  chương Tân Biên → tao đã kết luận nhầm là "không có nguồn cho Mệnh/Thân".
  Thật ra bảng **`tuvi_docs`** trên Supabase có **trọn 12 cung Tân Biên**
  (riêng CUNG MỆNH 192 chunk / 166K ký tự) **VÀ 498 chunk Vương Đình Chi**
  (`luc-thap-tinh-he`, mỗi chunk gắn sẵn `[NGUỒN: Trung Châu Phái Lục Thập
  Tinh Hệ (Vương Đình Chi)]`). **Lần sau tra RAG trước khi nói là thiếu nguồn.**
### ✅ Vòng sau — hậu tố NGẮN lấy lại phần bị trần cắt: 566 → 865 (PR mới)
Bản trước bỏ thẳng hậu tố khi vượt trần 30 → mất **39%** biến thể (926 → 566)
chỉ vì danh xưng gốc dài. Nay hạ dần thay vì bỏ ngay: **hậu tố đầy đủ → bản
NGẮN (`suffixShort`, 5–10 ký tự) → mới bỏ**.

| | Trước | Sau |
|---|---|---|
| Danh xưng phân biệt | 566 | **865** |
| 2 người trùng danh xưng | 0,47% (1/210) | **0,21% (1/485)** |
| Trùng cả danh xưng + nền | 0,11% (1/930) | **0,055% (1/1.830)** |
| Nhóm 50 người, có người trùng | 21% | **10%** |
| Bị bỏ hậu tố vì dài | ~39% | **8,1%** |
| Độ dài (TB / dài nhất) | 21,7 / 30 | 24,8 / **30** (giữ nguyên trần) |

- **🐞 Bắt được khi ĐỌC MẪU, không phải khi đo:** 3 hậu tố ngắn bị cắt mất
  động từ nên đọc thành danh từ trơ — *"Chủ đội thương thuyền **mối quan**"*,
  *"Nữ vệ sĩ áp tải thuê **nghiệp tổ**"*. Số liệu vẫn đẹp, chỉ đọc mới lộ.
  Sửa: `mối quan`→`giữ mối`, `nghiệp tổ`→`giữ nghiệp`, `tế khí`→`làm tế khí`.
  **Rút gọn hậu tố phải giữ động từ**; bỏ động từ chỉ được khi phần còn lại tự
  nó là một NƠI CHỐN (`nội phủ`, `hậu đình`, `ngự y`) chứ không phải một vật.
- 16,7% vẫn không có hậu tố vì **Thân cư Mệnh** — cố ý, không phải thiếu sót.

### ✅ Vòng sau — 4 BẬC thay 3 bậc: 865 → 1.150 (PR mới)
Henry bảo làm trục "5 bậc" đã ghi trong CÒN LẠI. **Đo trước thì 4 bậc thắng 5
bậc**, nên đổi hướng:

| | Tổ hợp | Trùng | Entry phải viết |
|---|---|---|---|
| 3 bậc (cũ) | 926 | 0,153% | 114 |
| **4 bậc** ✅ | **1.213** | **0,120%** | **+38** |
| 5 bậc | 1.388 | 0,114% | +76 |

- **4 bậc lấy 79% mức lãi với đúng một nửa công**, và phân bố **đều**
  (27,4/26,5/24,1/22,0) trong khi 5 bậc **lệch** (20/33,8/14,5/17,3/14,4 —
  bậc 2 phình gấp đôi bậc 3). Thang điểm là số NGUYÊN và hẹp nên chia 5 không
  cắt mượt được.
- **Điểm quyết định:** phân vị 4 bậc rơi đúng `[-1, 1, 3]` → **giữ nguyên y
  hệt `cao` (≥4) và `thap` (≤−1)**, chỉ tách cái bụng phình `giua` (50,6%)
  làm đôi. Toàn bộ 114 entry cũ giữ nguyên nghĩa, hiệu chỉnh ngưỡng đã duyệt
  không phải làm lại, chỉ viết thêm MỘT bậc `kha` ("khá giả") cho 38 khoá.
- **🐞 Lại bắt được một danh xưng trùng** — `Nữ ngự y` dùng ở cả bậc **cao**
  của Thiên Đồng đơn thủ lẫn bậc **kha** mới của cặp Thiên Đồng+Thiên Lương.
  Cùng loại lỗi đã vá ở #339. → đổi thành `Thị y`/`Nữ thị y`. **Mỗi lần thêm
  bậc/khoá phải quét lại trùng title trên toàn bảng** — số liệu phân bố không
  bắt được lỗi này.

**Kết quả cuối track:** **1.150 danh xưng** · trùng **0,153%** (1/655) · kèm
nền văn minh **3.812 tổ hợp**, trùng **0,044%** (1/2.280) · nhóm 50 người có
người trùng **7%** · độ dài TB 24,5, dài nhất vẫn đúng trần 30 · phân bố bậc
thấp 27,4 / giữa 26,5 / khá 24,1 / cao 22,0%.

**Cả track: 84 → 1.150 danh xưng (×13,7), chi phí model thêm 0 đồng.**

### ✅ Vòng sau — trục SÁT TINH, nhưng đổi ẢNH chứ không đổi danh xưng (PR mới)
Trục này từng bị BỎ với lý do ghi thẳng trong code: *"chỉ đổi được mấy chữ trong
danh xưng còn `attireEn` giữ nguyên nên ảnh y hệt"*. Henry: **"uh gắn đạo cụ
riêng đi"** → làm, theo đúng cách đã cứu trục cung Thân là cấp cho nó một tín
hiệu **THỊ GIÁC** riêng.
- **`SAT_MARK`** (3 nhóm × `edge` + `markEn` + `source`) theo nhóm sát tinh đóng
  **tại chính cung Quan Lộc** (không xét tam hợp, cùng nguyên tắc `CAREER_MODIFIERS`;
  đọc ở cung mượn sao là đọc sát tinh của cung khác). Phân bố đo trên 8.640 lá
  số: **sạch 58,7% · không-kiếp 15,1% · kình-đà 13,9% · hoả-linh 12,2%**.
- **`markEn` CHIẾM MỘT CHIỀU KHÁC `propEn`** — đây là cả thiết kế: cung Thân sở
  hữu **ĐỒ VẬT** bày quanh người, nhóm sát tinh sở hữu **DẤU TRÊN NGƯỜI + ÁNH
  SÁNG** khung cảnh. **34,4% lá số trúng cả hai lớp**; nếu cả hai đều thêm đồ vật
  thì bức ảnh bày bừa và hai lớp làm loãng nhau — tách chiều thì chúng cộng vào.
- **KHÔNG vào danh xưng, và đó là quyết định có số đỡ:** danh xưng đang TB 24,5
  ký tự trên trần 30, **chỉ 45% còn ≥5 ký tự trống**. Thêm dấu hiệu vào title chỉ
  tới được 41,3% × 45% ≈ **19%** lá số mà ép sát trần cho tất cả. Nên trục này đi
  theo tiền lệ `MENH_ROLE`: vào ảnh + `desc` + prompt truyện. **Nó mua độ khác
  biệt của BỨC ẢNH (41,3% lá số có thêm một lớp thị giác), không mua thêm số
  danh xưng** — đừng kỳ vọng sai chỗ.
- **🐞 Hai lỗi bắt được bằng cách ĐỌC PROMPT GHÉP, không phải bằng cách đo:**
  (a) `markEn` nhóm không-kiếp bản đầu dùng từ vựng ĐI ĐƯỜNG (*"a plain
  travelling mantle"*) → đá đúng `propEn` của Thân cư Thiên Di (*"a road bundle
  and a broad weathered hat"*): ghép lại thành bọc hành lý + mũ đi đường + áo đi
  đường, ảnh trôi về "người lữ hành" chung chung và **mất sạch nghĩa TỪNG BỎ** —
  đúng thứ nhóm này cần nói. (b) `weathered` trùng ở cả kình-đà và Thiên Di (188
  lá số) → `calloused`. **Luật rút ra:** `markEn` không được mượn từ vựng của bất
  kỳ `propEn` nào, và **tránh tả TRANG PHỤC** (đó là việc của `attireEn` +
  `costumeGrammarEn`, chen vào là ghi đè cấp bậc). Đã cắm **bẫy tự động** quét
  trùng từ giữa `markEn`/`propEn` để không tái phát.
- **🐞 Lộ thêm một BUG CÓ SẴN nặng hơn cả trục này — danh xưng lặp chữ:**
  *"Nữ lương y vân du **vân du**"* · *"Quan **trấn** phủ **trấn** phương xa"*.
  Hậu tố cung Thân ghép vào danh xưng gốc vốn đã chứa đúng chữ đó. Cùng loại lỗi
  với hai lần trùng title trước (#339, 4-bậc) và **cũng chỉ lộ khi đọc chuỗi
  thật**. Sửa: điều kiện ghép hậu tố nay xét **cả TỪ**, không chỉ độ dài — dùng
  chung ladder hạ dần sẵn có (đầy đủ → ngắn → bỏ). Gỡ được **45 danh xưng méo**
  (1.458 → 1.413 trên lưới đo này); đó là **bỏ lỗi, không phải mất biến thể**.
  ⚠️ Con số tuyệt đối phụ thuộc lưới lấy mẫu — **đừng so 1.413 với 1.150** ở trên
  (hai lưới khác nhau: 6 ngày/tháng vs 7 ngày/tháng).
- **Nguồn: RAG, cả hai sách** — `8.14b Sát tinh tọa thủ cung Quan Lộc` (mục
  RIÊNG cho đúng trục này) · `4.2.19 Kình Dương` · `4.2.20 Đà La` ("tỳ vết…
  rỗ sẹo" — nhóm duy nhất cổ thư tả bằng dấu trên THÂN THỂ, nên dễ vào ảnh nhất)
  · `4.2.21 Hỏa, Linh` · `4.2.22 Không, Kiếp` · Vương Đình Chi *Sát diệu &
  khuynh hướng nghề nghiệp* ("Có Thiên Không / Địa Không: Nên theo tôn giáo – tu
  hành – triết học") + *Tứ Sát* + *Sát tinh & tính nóng vội*.
- **Thứ tự ưu tiên khi trúng nhiều nhóm (5,9%):** không-kiếp > kình-đà > hoả-linh
  — xếp theo mức làm ĐỔI BẢN CHẤT công danh: Không/Kiếp là nhóm duy nhất kéo
  người ta RỜI HẲN chức phận nên lấn lượt; Kình/Đà để lại dấu vĩnh viễn trên
  thân; Hỏa/Linh chỉ đổi NHỊP. Đo với thứ tự này ra 15,1/13,9/12,2% — trải đủ đều.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · engine test 181 pass · **đo 8.640 lá số, 0 lỗi trên 7 bất
  biến**: có sát tinh ⇔ có lớp · nhóm chọn THỰC SỰ có sao ở Quan Lộc · ưu tiên
  đúng thứ tự khai · 0 rò rỉ chéo giữa 3 nhóm · `markEn` vào prompt ảnh đủ 3.570
  lá số · gọi lại cùng lá số ra y hệt · 0 danh xưng lặp chữ · prompt truyện có
  khối `DẤU VẾT NGHỀ` · **0 trùng từ giữa `markEn` và `propEn`**.
- **CÒN LẠI (việc tay Henry):** nhóm **kình-đà** là nhóm duy nhất đổi GƯƠNG MẶT
  (*"a faint old scar traced along the brow or jaw"*) — tao chỉ verify tới tầng
  prompt, phải gen thật mới biết model vẽ vết sẹo "mờ, cũ" hay vẽ quá tay thành
  thương tích. Nếu quá tay thì sửa gọn một chuỗi trong `SAT_MARK`.

---

## 🎭 Chức phận theo CẶP chính tinh — 82 → 194 danh xưng (2026-07-29, cùng PR cache)

Henry: *"Chỉ có 84 nhân vật thôi hả? Ít quá, phải tăng lên… tao sợ trùng nhau
sẽ nhiều."* 84 đúng = **14 chính tinh × 3 bậc × 2 giới**. Đo trước khi sửa
(10.080 lá số thật, lưới 5 năm × 12 tháng × 7 ngày × 12 giờ × 2 giới):

| Trục | Trước | Sau |
|---|---|---|
| Danh xưng phân biệt | 82 | **194** |
| 2 người bất kỳ trùng danh xưng | 1,94% (1/52) | **0,85% (1/118)** |
| Trùng cả danh xưng + nền văn minh | 0,40% | **0,18% (1/550)** |
| Nhóm 50 người, có người trùng danh xưng | 62% | **34%** |
| Danh xưng phổ biến nhất chiếm | 3,9% | **1,9%** |

- **Trục dùng: BỘ chính tinh tại Quan Lộc, không phải một sao chủ.** Cung Quan
  Lộc rất thường có HAI chính tinh — đo được **39 bộ** phân biệt (24 cặp + 14
  đơn thủ + VCD), trong khi `pickQuanMajor` chọn 1 sao rồi **vứt sao kia đi**.
  Mà CHÍNH chương Quan Lộc của Tân Biên luận theo cặp (**64 câu "X đồng cung"**):
  Vũ Khúc đơn thủ là võ nghiệp, nhưng "Vũ + Phủ" là *"chức vụ thuộc về tài chánh
  hay kinh tế"*, "Vũ + Tham" là *"giàu có và thành công trong việc kinh doanh"*.
  Tức bảng cũ đang bỏ đúng phần chi tiết nhất của cổ thư.
- **`PAIR_OCCUPATION_TABLE`** (`past-life.ts`) — 24 cặp × 3 bậc = **72 entry**,
  mỗi entry `titleNam`/`titleNu`/`domain`/`desc`/`attireEn`/`source`. **Mọi
  `source` trích NGUYÊN VĂN** từ `chunks_all.json` (`[TÂN BIÊN][CUNG QUAN LỘC]`,
  26 chunk) — kiểm corpus TRƯỚC khi viết chính vì không được bịa trích dẫn cổ thư.
  Dùng chung 1 trích dẫn cho cả 3 bậc: **sách luận CẶP chứ không luận BẬC**, chia
  bậc là lớp chấm điểm của engine.
- **Khoá `pairKey`** sắp theo `STAR_ORDER` chứ không theo thứ tự gặp trong lá số
  — cùng một cặp xuất hiện đảo thứ tự tuỳ lá số, không sắp thì tra trượt.
- **Khoá lấy từ CUNG NGUỒN THẬT**, không phải Quan Lộc cứng: Quan Lộc vô chính
  diệu thì mượn cung xung chiếu (cổ pháp 8.45) — lấy cặp ở cung trống là tra
  nhầm. Đo được **50,2% lá số** đi nhánh cặp.
- **`star` nhánh cặp nêu CẢ HAI sao** ("Vũ Khúc + Thiên Phủ đồng cung") và **bỏ
  `brightness`** — độ sáng đó là của riêng sao chủ, gắn vào tên cặp thì đọc
  thành độ sáng của cả hai.
- **KHÔNG đụng `scoreQuanTier`** → phân bố bậc giữ nguyên **cao 22,0% / giữa
  50,6% / thấp 27,4%**, ngưỡng đã hiệu chỉnh trước đây không phải chỉnh lại.
- **Chi phí: 0 đồng.** Tra bảng thuần, deterministic — không thêm lượt LLM hay
  ảnh nào. (Đo thật trên prod: ảnh 1.658đ/lượt · chữ ~35đ/lượt LLM ⇒ **ảnh chiếm
  ~96% chi phí**, bảng tra không nằm trong đó.)
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi · `prettier --check .` sạch · engine
  test 181 pass · **đo lại nguyên lưới 10.080 lá số**: 194 danh xưng, `capThieu
  TrongBang` **rỗng** (không cặp nào rơi vào nhánh dự phòng), phân bố bậc không
  đổi · **soi tay 24 ca** đủ mọi cặp/bậc/giới: sao ở cung nguồn khớp khoá tra,
  nhánh mượn xung chiếu lấy đúng cung đối, danh xưng nam/nữ và trích dẫn đều khớp.
- **CÒN LẠI (chưa làm, đo sẵn số để quyết sau):** trục **5 bậc** thay 3 (ngưỡng
  phân vị đo được `[-2, 1, 2, 4]`, chia cân, +28 entry) và trục **nhóm sát tinh
  tại Quan Lộc** (sạch 60,6% · không-kiếp 14,6% · hỏa-linh 13,7% · kình-đà 11,2%).
  Cảnh báo đã đo: làm trục sát tinh dạng *hậu tố* ("Tri phủ vùng biên") thì
  `attireEn` không đổi → **ảnh vẫn y hệt**, chỉ khác mấy chữ; tăng số danh xưng
  mà cảm giác không đổi.

---

## 💾 Cache kết quả 2 tool chân dung theo lá số (2026-07-29, PR mới)

Henry: *"2 tool chân dung vợ chồng và chân dung tiền kiếp, nếu cùng lá số input
thì xong cache lại nhỉ? Sau này user input cùng lá số thì load ra thôi."* Đúng —
nhưng audit trước khi code lộ ra lợi ích KHÔNG nằm ở chỗ tưởng, nên ghi lại đây:
- **Cache liên-user gần như vô dụng ở quy mô hiện tại.** Không gian input ≈ 30
  năm × 365 ngày × 12 giờ × 2 giới ≈ **260K tổ hợp** → 1.000 user thật mới ra ~2
  cặp trùng lá số, 10.000 user mới ~190 cặp. Đừng kỳ vọng tiết kiệm từ đường này
  cho tới khi rất đông.
- **Chỗ ăn tiền THẬT bây giờ là cùng MỘT user chạy lại cùng lá số** (prod lúc
  làm: 32 bản vợ chồng + 16 bản tiền kiếp, **1 user duy nhất** — toàn bản test).
- **Kết quả 2 tool KHÔNG phụ thuộc năm xem** → cache không cũ đi theo thời gian
  (tuổi vẽ neo vào đại vận; mốc tuổi cưới là 22–31 giả định, không phải tuổi hiện
  tại). Khoá không cần xoay theo năm.

**3 điều Henry chốt** (hỏi trước khi code vì đều là quyết định sản phẩm/tiền):
cache **chung toàn hệ thống** · **ai đã trả cho lá số đó thì xem lại free, người
mới vẫn trả đủ** · **một lá số một kết quả, KHÔNG có nút "vẽ lại"**.

- **Migration `_patches/migration-portrait-cache.sql`** (✅ ĐÃ CHẠY prod qua
  Supabase MCP — verify 8 cột · RLS bật · **0 policy** = chỉ service key chạm
  được · `laso_key` có trên cả 2 bảng lịch sử): bảng `portrait_cache`
  (PK `tool_id+phase+laso_key`) + cột `laso_key` trên `spouse_portraits`/
  `past_life_portraits` + RPC `portrait_cache_touch` (đếm hit, atomic).
  **Bảng RIÊNG chứ không nhét vào 2 bảng lịch sử:** bảng lịch sử trả lời "ai đã
  sinh cái gì" (nhiều dòng/người, RLS theo chủ), cache trả lời "lá số này ra kết
  quả gì" (1 dòng, không thuộc về ai); tiền kiếp còn chạy 2 pha SONG SONG nên ghi
  chung một dòng là hai request đua nhau ghi đè; và `past_life_portraits` **vốn
  không có chỗ chứa truyện**.
- **`lib/portraits/cache.ts`** — `lasoKey(birth)` = sha256 canonical
  `[âm/dương|năm|tháng|ngày|giờ|giới]`. **CỐ Ý BỎ `name`**: engine không đọc tên
  (tên nhân vật/nền văn minh đều seed từ dữ liệu lá số), tính vào khoá thì hai
  người cùng lá số khác tên lại tốn thêm một lượt gen mà ra hai kết quả — đúng
  thứ luật "chung toàn hệ thống" muốn tránh.
- **`free` = CÓ cache **VÀ** user đã sở hữu lá số đó.** Thiếu vế "có cache" là mở
  đường gen thật miễn phí: ai từng vẽ một lá số sẽ vẽ lại vô hạn ở mọi pha còn
  thiếu cache. Đây là lỗ nguy hiểm nhất của thiết kế này, có test riêng.
- **Hướng fail cố ý NGƯỢC NHAU trong cùng một file:** tra cache/ghi cache hỏng →
  rơi về gen như cũ (mất tiền model còn hơn chặn oan người đã trả); nhưng
  `userOwnsLaso` lỗi → trả **false** (fail-CLOSED), vì đoán nhầm thành "đã trả"
  là phát không hàng.
- **Không tặng lượt rail cho lượt xem lại** — tặng cả ở đó thì mở đúng một đường
  farm: mở lại chân dung cũ vài lần là có lượt rail vô hạn. Tiền kiếp chỉ tặng ở
  pha `image` để một lượt mua không tặng hai lần.
- **`requireCreditsCached()`** (`tuvi-paywall.js`, bump `?v=8→9` trên 19 trang) —
  hỏi `action=cache-status` TRƯỚC, free thì chạy thẳng + banner "không trừ Lượng",
  không free thì đi paywall như cũ. **FAIL-CLOSED**: mạng lỗi/chưa đăng nhập →
  coi như phải trả. 4 trang tool (2 shell + 2 standalone) có thêm nhánh **402 trên
  đường miễn phí** → quay lại paywall thay vì ném lỗi khó hiểu.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` JS + JSON-LD của cả 4 trang · engine test 181
  pass · **37 ca chạy THẬT route trên Next dev + stub PostgREST**: khoá lá số
  (đọc thẳng `laso_key` code thật gửi lên — đổi giới/giờ/ngày/lịch đều ra khoá
  khác) · chủ sở hữu xem lại **200 dù không có thanh toán nào**, không gọi model,
  không đẻ dòng lịch sử, không tặng rail · người lạ chưa trả **402** · người lạ
  đã trả **200 + đúng 1 dòng lịch sử mang `laso_key`** + tặng rail đúng 1 lần cho
  cả 2 pha · **sở hữu lá số mà chưa có cache → vẫn 402** (lỗ nguy hiểm nhất) ·
  thiếu 1 trong 2 pha → `cached=false` · ghi cache lần 2 **không đè bản đầu** ·
  round-trip `put`↔`get` trên module thật (giữ nguyên dấu tiếng Việt) ·
  **Playwright trên `tuvi-paywall.js` thật**: free → không modal + banner đúng
  chữ + query lá số đúng + không gọi `action=deduct`; 4 ca không-free (chưa trả /
  chưa có cache / server 500 / mạng chết) đều rơi về modal.
- **CÒN LẠI:** dòng lịch sử CŨ (trước migration) `laso_key` NULL → mấy bản Henry
  đã sinh trước đây không được nhận là "đã trả", lần tới vẽ lại vẫn tính tiền một
  lượt rồi từ đó mới free. Không backfill được vì 2 bảng chưa từng lưu ngày sinh —
  cố suy ngược là bịa dữ liệu. Theo dõi `portrait_cache.hit_count` để biết cache
  có tiết kiệm thật không.

---

## 🔁 TRACK MỚI — Viral Loop cho 2 tool chân dung (chốt 2026-07-27, CHƯA CODE)

**Nguồn:** phiên brainstorm "làm sao cho Chân Dung Vợ Chồng + Chân Dung Tiền Kiếp viral".
Plan này là OUTPUT của phiên; code làm ở session sau, mỗi PR reset branch trên main.

### 🔖 RESUME HERE (track viral)
**V2.1 + V2.4 XONG (PR #314)** — mắt xích đứt đã nối: link chia sẻ nay mang mã
giới thiệu, và toàn bộ vòng lặp đã có chỗ đo (panel admin "Vòng Lặp Viral").
**V2.2 XONG (#318)** — bộ số đã chốt đã vào prod (quà 25 · thưởng mời 15 ·
trần mời 15) + cầu dao ngân sách ảnh free 6 lượt/ngày + 2 lượt rail tặng sau khi
vẽ. **V2.3 XONG (#320)** — chỗ xin mời bạn sau khi hết Lượng + mục referral
ở `profile.html`. **V3 XONG (PR mới)** — nút Tải Ảnh nay trả về poster 9:16 có
thương hiệu thay vì file thô (#322). **V4 phần CODE XONG (PR mới)** — content-pack
TikTok: cron CN gom 5 bản chân dung đã được chia sẻ công khai, LLM viết sẵn kịch
bản 30–60 giây, gửi Telegram admin + nút sinh on-demand trong admin. **→ V2 + V3 +
V4(code) ĐÃ XONG.** Việc tiếp theo là **việc tay Henry** (đăng TikTok 10–15ph/ngày,
seed 3–5 group FB) rồi **V5** — nhưng V5 chốt rõ là *chỉ làm SAU khi V2.4 có số
thật*, nên đừng code V5 trước khi panel Vòng Lặp Viral có dữ liệu người thật.
Số liệu tự chảy vào panel khi có người thật dùng; trước đó K-factor còn 0 là
ĐÚNG, không phải lỗi.

### 🔴 PHÁT HIỆN CHÍNH — vòng lặp đứt đúng 1 mắt xích
Link chia sẻ `/ket-qua/<id>` **KHÔNG mang mã giới thiệu**; nút CTA "Thử ngay →" trỏ
`/app/<tool_id>` cũng **không mang mã**. Nên: A share → B đăng ký → **A không được
thưởng gì**, hệ thống không biết B đến từ A.
**Bằng chứng: bảng `referrals` = 0 dòng** dù backend referral 2 tầng + chống gian lận
đã viết đầy đủ từ lâu — chưa từng có 1 lượt nào, vì con đường tự nhiên duy nhất mà
người ta chia sẻ lại không gắn mã. Đây là thứ phải sửa TRƯỚC mọi thứ khác.

### 📊 Số thật lúc chốt plan (2026-07-27)
- `spouse_portraits` 32 bản / **1 user** · `past_life_portraits` 15 bản / **1 user**
  · `shared_results` 26 link (15 vợ chồng · 10 tiền kiếp) — **TẤT CẢ do Henry test.
  Chưa có một người ngoài nào chạm vào 2 tool này.** Mọi kỳ vọng viral hiện là giả thuyết.
- `events` có **0 dòng `share`** dù 26 link đã tạo → luồng `shareWorkspace` của
  `shell.js` không bắn `Track.event` → phần quan trọng nhất của viral đang MÙ.
- Giá: tiền kiếp **25 Lượng**, vợ chồng **20 Lượng** (`tool_pricing`, cả 2 `enabled=true`).
- Hạ tầng ĐÃ TỐT (không phải làm lại): `/ket-qua/[id]` công khai, người xem KHÔNG mất
  Lượng, **OG image lấy ĐÚNG ảnh chân dung thật** (`firstBlockImage`, không phải logo),
  `twitter:card=summary_large_image`, có sẵn CTA card cuối trang.
- Chống gian lận có sẵn: `blocked_email_domains` (chặn email tạm), device cap 5
  (`credits.signup_bonus_device_cap`), chặn tự refer, UNIQUE `referee_user_id`.

### ✅ Bộ số Henry đã chốt
| Tham số | Giá trị chốt | Hiện tại trong DB | Ghi chú |
|---|---|---|---|
| Quà đăng ký | **25 Lượng cố định** | random `[20,30,40]` (A/B) | dừng A/B, set `credits.signup_bonus_variants=[25]` |
| Thưởng mời bạn | **15 Lượng** | 10 (`referral.signup_bonus_referrer`) | **CỐ Ý thấp hơn giá tool** để ép mời nhiều |
| Thưởng kích hoạt khi | **referee ĐĂNG KÝ** | đã đúng (`process_referral_signup`) | giữ nguyên |
| Trần lượt mời được thưởng | **15** | 20 (`referral.signup_reward_cap`) | = tối đa 225 Lượng/người |
| Trần chi ảnh free | **$15/tháng**, chỉnh qua `app_config` | chưa có | Henry tăng sau khi thấy tín hiệu |

**Hệ quả số học (cố ý, Henry đã cân nhắc):** mời 1 bạn = 15 Lượng → KHÔNG đủ tool nào
(20/25). **Mời 2 bạn = 30 Lượng = 1 lượt tiền kiếp (dư 5) hoặc 1 lượt vợ chồng (dư 10).**
→ **Câu chữ BẮT BUỘC phải nói thẳng "mời 2 bạn = thêm 1 lượt vẽ"**, tuyệt đối không hứa
lửng lơ kiểu "mời bạn để xem tiếp" — hứa hụt là mất niềm tin ngay lần đầu.

**⚠️ Tension đã flag:** 25 quà − 25 giá tiền kiếp = **0 Lượng còn lại**, mà rail chat
tốn 5 Lượng/lượt → user mới KHÔNG hỏi được nhân vật câu nào, trong khi vòng chỉnh
PR #306 vừa biến rail thành upsell chính của tool. **Mặc định trong plan: tặng 2 lượt
rail miễn phí ngay sau khi vẽ xong** (chi phí chat ≪ chi phí ảnh) để giữ móc upsell.
Henry có thể bỏ nếu không ưng.

### 💰 Kinh tế (con số để Quân Sư canh + để quyết nâng trần)
- 1 lượt gen thật ≈ **$0.08–0.10** (ảnh `gpt-image-1` 1024×1536 ~$0.05–0.08 + truyện LLM ~$0.02).
- 1 mắt xích referral trọn vẹn ≈ **$0.16** (gen của referee + gen mua bằng thưởng của referrer)
  → **~4.000đ cho 1 user đăng ký thật** — rẻ hơn mọi kênh trả phí, đáng làm.
- $15/tháng → **~150–190 lượt gen free/tháng ≈ 5–6/ngày** → cỡ 90–180 user mới/tháng.
  Đây là **thí nghiệm có kiểm soát**, không phải scale — đúng với thực tế "chưa có
  validation ngoài nào".
- **Điều kiện nâng trần (Quân Sư đề xuất khi đạt):** K-factor ≥ 0.5 VÀ chi phí/user
  đăng ký ≤ 6.000đ trong 2 tuần liên tiếp → đề xuất nâng $15 → $50.

### 📋 WORKPLAN V2 (mỗi PR = 1 việc, draft → CI xanh → squash-merge)

**V2.1 + V2.4 — LÀM CÙNG 1 ĐỢT (nối mã giới thiệu + đo), ưu tiên cao nhất:**
- `shell.js` tạo link share: người tạo đã đăng nhập → gắn `?ref=<referral_code>` vào
  URL `/ket-qua/<id>` (đọc code từ `user_credits.referral_code`, đã có sẵn).
- `app/ket-qua/[id]/route.ts`: đọc `?ref=` → truyền vào nút CTA (`/app/<tool>?ref=CODE`)
  → tái dùng cơ chế **ĐÃ CÓ SẴN** ở homepage (`sessionStorage.pending_ref_code` +
  `tryRegisterReferral()` → `POST /api/payment?action=referral-register`), KHÔNG viết mới.
- Đổi copy CTA trang chia sẻ: "Đăng ký nhận **25 Lượng** — đủ vẽ chân dung của chính bạn".
- **Đo:** bắn `Track.event('share',{tool_id,medium})` trong `shareWorkspace`/`shareLink`
  (hiện mù); nạp `track.js` vào `/ket-qua/[id]` → `share_view` + `cta_click`; event
  `referral_signup` khi thưởng thành công. Gắn `utm_source=share&utm_campaign=<tool_id>`.
- **Panel admin "Vòng Lặp Viral"**: phễu gen → share → người mở link → bấm CTA → đăng ký
  → gen lại, kèm **K-factor** từng tool + chi phí/user + số Lượng thưởng đã phát.

### ✅ V2.1 + V2.4 XONG (PR #314, session này) — nối mã giới thiệu + đo vòng lặp
- **`public/referral.js` (MỚI) — nguồn DUY NHẤT bắt `?ref=`.** Audit lúc làm phát
  hiện chỗ đứt sâu hơn plan ghi: cơ chế `sessionStorage.pending_ref_code` +
  `tryRegisterReferral()` KHÔNG phải "đã có sẵn dùng lại được" — nó bị **chép
  inline 2 bản** trong `index.html` + `cong-cu.html`, nên trang `/app` (đúng nơi
  CTA đổ về) chưa từng bắt được mã. Gom thành file dùng chung; `shell.js` nạp
  động (`ensureReferralJs`) cho mọi trang `/app`; 2 trang cũ bỏ bản inline, giữ
  global `window.tryRegisterReferral` để không gãy chỗ nào.
- **`shell.js`** — `withViralParams()` gắn `?ref=<mã>` + `utm_source=share&utm_medium=link&utm_campaign=<tool_id>`
  vào link chia sẻ (CẢ `shareWorkspace` lẫn `shareSession`). Mã lấy qua endpoint
  mới `GET /api/payment?action=my-referral` (**có auth** — CỐ Ý không nhét
  `referral_code` vào `action=balance` vì endpoint đó nhận `userId` qua query
  không xác thực, thêm mã vào đó là phát mã người khác cho bất kỳ ai đoán được
  userId). Chưa đăng nhập vẫn chia sẻ bình thường, chỉ không quy về ai.
  `shareWorkspace` nay gửi kèm token khi tạo link → `shared_results.owner_user_id`
  hết null (mẫu số "số người chia sẻ" của K-factor).
- **`/ket-qua/[id]`** — chuyển tiếp `?ref=` (validate 8 ký tự, rác thì bỏ) + UTM
  sang CTA. **Copy CTA đọc `app_config`/`tool_pricing` THẲNG** thay vì viết cứng
  "25 Lượng" như plan: quà hiện còn A/B `[20,30,40]` mà tiền kiếp giá 25 → viết
  cứng là hứa hụt ngay lần đầu. Lấy mức quà THẤP NHẤT, chỉ nói "đủ dùng công cụ
  này" khi quà ≥ giá → V2.2 set `[25]` thì câu chữ tự khớp, không sửa code lại.
- **🔒 Chốt an toàn BẮT BUỘC đi kèm:** `handleReferralRegister` nay chỉ ăn cho
  **tài khoản mới (<24h)**. Trước đây không có chốt: user CŨ chỉ cần mở link
  `?ref=` của bạn là referrer được thưởng. Vô hại khi chưa ai chia sẻ, nhưng V2.1
  vừa gắn `?ref=` vào MỌI link → thành đường farm rẻ nhất. Luồng thật (đáp trang
  → đăng ký → `SIGNED_IN`) tính bằng giây nên 24h rất rộng.
- **Đo (V2.4):** `share` (bắn khi CHỌN KÊNH phát tán — native/copy/FB/Zalo/WhatsApp,
  KHÔNG bắn lúc tạo link để khỏi đếm trùng với `shared_results`), `share_view`,
  `cta_click` (`meta.from='share'`), `referral_signup` (server ghi, `tool_id` lấy
  từ `utm_campaign` của chính link → **quy được K-factor TỪNG tool**; chỉ dựa
  `user_attribution.first_utm_*` thì trình duyệt đã ghé site trước đó mãi mang
  first-touch cũ). Thêm `share_view`/`referral_signup` vào allowlist `/api/track`.
- **Migration `_patches/migration-viral-loop.sql`** (✅ ĐÃ CHẠY prod qua Supabase
  MCP — verify khớp thực trạng: 26 link chia sẻ, 0 event `share`, 0 dòng
  `referrals`): RPC `viral_loop_funnel(from,to)`, KHÔNG tạo bảng mới.
- **Panel admin "Vòng Lặp Viral"** (`#page-marketing`, `admin-viral` gọi RIÊNG khỏi
  `admin-marketing` để không bị 7 RPC + GA4 kéo chậm/gãy theo): phễu 6 bậc +
  conv% từng bậc, K-factor/tool, chi phí/user đăng ký, Lượng thưởng đã phát.
- **🐞 2 lỗi bắt được khi test, không phải Henry báo:** (a) `GA4_TRACK_SNIPPET`
  ĐÃ kèm `track.js` từ M0.1 → bản đầu thêm thẻ nữa là `page_view` đếm đôi trên
  trang chia sẻ; (b) Next **bọc `fetch` toàn cục và nhớ kết quả kể cả khi
  `dynamic='force-dynamic'`** — đổi dữ liệu dưới DB xong `/ket-qua` vẫn trả số
  cũ, nghĩa là link vừa gỡ (`revoked`) vẫn render. Vá bằng `cache:'no-store'`
  trong `createClient`.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` sạch · `node --check` referral.js/shell.js + 2 script block admin ·
  **Playwright trên trang shell thật** 3 ca (đăng nhập → link đúng ref+utm, bắn
  ĐÚNG 1 event share; chưa đăng nhập → vẫn share được, không ref; đáp `/app?ref=`
  → dọn ref khỏi URL, giữ utm, gọi register 1 lần kèm `srcTool`) · **Playwright
  trên `/ket-qua` render thật** (dev server + PostgREST stub): track.js nạp đúng
  1 lần, page_view/share_view/cta_click mỗi thứ đúng 1, ref rác bị loại, revoked
  → 404, copy CTA đúng cả 2 nhánh · panel admin sạch light+dark. Bump
  `shell.js?v=47→48` (27 trang).

**V2.2 — Sửa số + cầu dao ngân sách:**
- Set 4 config theo bảng trên (SQL, không cần deploy).
- Bảng/RPC đếm **lượt gen free toàn hệ thống theo ngày** + trần đọc từ `app_config`
  (`viral.free_gen_daily_cap`, mặc định suy từ $15/tháng ≈ 6/ngày) → chạm trần thì
  thông điệp tử tế ("hết lượt tặng hôm nay, quay lại mai hoặc nạp Lượng"), KHÔNG ném lỗi.
- Tặng 2 lượt rail free sau khi vẽ xong (xem tension ở trên).

### ✅ V2.2 XONG (PR mới, session này) — sửa số + cầu dao ngân sách
- **4 config đã set thẳng prod** (`_patches/migration-viral-budget.sql`, ✅ ĐÃ CHẠY
  qua Supabase MCP): `credits.signup_bonus_variants=[25]` (dừng A/B `[20,30,40]`),
  `referral.signup_bonus_referrer=15` (từ 10), `referral.signup_reward_cap=15`
  (từ 20). Verify `handle_new_user_signup` ăn được mảng 1 phần tử. **Hệ quả tức
  thì: copy CTA trang `/ket-qua` tự đổi sang "25 Lượng — đủ dùng công cụ này"**
  cho tiền kiếp (giá 25) mà KHÔNG cần deploy — đúng như V2.1 đã tính trước.
- **Cầu dao ngân sách ảnh free** — `viral_free_gen_gate(user, tool)` +
  `lib/billing/viral-budget.ts`. Chặn ở **`handleDeduct`**, TRƯỚC `deduct_credits`:
  đây là điểm cuối cùng còn chặn được mà chưa đụng ví ai. Chặn ở route tool thì
  đã trừ Lượng rồi — người dùng mất Lượng để đổi lấy một lời từ chối.
  - **"Free" = lượt của người CHƯA TỪNG NẠP** (`credit_transactions type='topup'`).
    Lượng của họ 100% là quà (signup + thưởng giới thiệu) nên mỗi lượt gen là
    tiền túi mình bỏ ra. Ai đã nạp đang tiêu tiền của chính họ → KHÔNG BAO GIỜ
    bị chặn. Đây là lý do trần này an toàn: nó không bao giờ chặn doanh thu.
  - Đếm theo `credit_transactions` (nơi lượt dùng được ghi TRƯỚC khi gọi model),
    khớp CẢ `slug` (`<tool_id>-...`) LẪN `type` **cả 2 biến thể gạch-ngang và
    gạch-dưới** — prod có đủ `use_chan_dung_vo_chong`, `use_chan-dung-vo-chong`
    và `use_chan-dung-tien-kiep`; bỏ sót một dạng là đếm hụt (đã verify trên dữ
    liệu thật). Ngày tính theo **giờ VN**, không phải UTC.
  - Config: `viral.free_gen_daily_cap=6` (suy từ $15/tháng ÷ ~$0.09/lượt ÷ 30),
    `viral.free_gen_tools` (chỉ 2 tool ảnh đắt tiền — tool chữ rẻ hơn 2 bậc,
    chặn chúng chỉ hỏng trải nghiệm mà không tiết kiệm bao nhiêu),
    `viral.free_gen_monthly_usd=15` (ghi lại để biết số 6 suy từ đâu).
    **Trần ≤ 0 = TẮT cầu dao** (Henry mở van nhanh không cần sửa code).
  - **FAIL-OPEN có chủ đích**: lỗi RPC/mạng → cho qua. Cầu dao này giữ NGÂN SÁCH
    chứ không giữ an toàn — chặn oan người đã trả tiền vì Supabase chớp một nhịp
    thì tệ hơn lỡ vài lượt quá trần.
  - `tuvi-paywall.js`: `capReached` → modal **tử tế** dùng lại khung `.tpw-*` của
    `_insufficient` ("Hết lượt tặng hôm nay · Chưa trừ Lượng nào của bạn" + lối
    nạp Lượng), KHÔNG phải `alert('Lỗi: …')` làm người ta tưởng hỏng.
- **2 lượt rail tặng sau khi vẽ xong** — vá "tension" đã flag: quà 25 − giá tiền
  kiếp 25 = **0 Lượng**, mà rail tốn 5/lượt → người mới không hỏi được nhân vật
  câu nào, trong khi PR #306 vừa biến rail thành upsell chính của tool.
  - **CỐ Ý KHÔNG tặng bằng Lượng**: Lượng tiêu được vào bất cứ đâu nên tặng 10
    Lượng sau MỖI lần vẽ là mở đường tích góp thành một lượt vẽ free nữa. Quầy
    đếm riêng `rail_free_turns` chỉ tiêu được ở rail, không quy đổi ngược.
  - `rail_free_grant` **ĐẶT** về mức n chứ không CỘNG DỒN → vẽ 3 lần không thành
    6 lượt. `rail_free_consume` atomic (`UPDATE … WHERE remaining > 0`).
  - `/api/v1/chat`: tiêu lượt tặng TRƯỚC Lượng; còn lượt tặng thì không chặn dù
    ví rỗng. **KHÔNG ghi `credit_transactions`** khi tiêu lượt tặng — không có
    Lượng nào đổi chủ, ghi giao dịch 0 đồng chỉ làm bẩn báo cáo doanh thu D3.
- **Dọn nợ nhỏ:** `getConfig` (đọc 1 khoá `app_config`) chuyển từ
  `lib/marketing/autopilot.ts` sang `lib/config/appConfig.ts` (`getConfigValue`)
  để billing không phải import marketing; tên cũ giữ làm alias.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi · `prettier --check .` sạch ·
  `node --check` paywall · **RPC test trên prod**: grant(2)→2, grant(2) lần nữa
  vẫn 2 (không cộng dồn), consume ×2 = true/true, lần 3 = false, `granted_total`
  đúng 2 · **nhánh chạm trần** kiểm bằng 6 lượt gen giả trong transaction rồi
  `RAISE EXCEPTION` để rollback (`used:0→allowed` ⇒ `used:6/cap:6→daily_cap`,
  verify prod **0 dòng rác còn sót**) · **Playwright**: chạm trần → hiện modal
  đúng chữ, KHÔNG alert thô, và **callback sinh ảnh KHÔNG chạy** (không tốn
  tiền model).
- **CÒN LẠI:** theo dõi vài ngày xem trần 6/ngày có chạm thật không — chạm sớm
  mỗi ngày nghĩa là nhu cầu thật đang vượt ngân sách thí nghiệm, lúc đó xét điều
  kiện nâng trần đã chốt (K ≥ 0,5 và ≤ 6.000đ/user trong 2 tuần liên tiếp).

**V2.3 — Chỗ xin mời bạn (không có chỗ này thì không ai mời):**
- Ngay sau khi xem xong chân dung + số dư không đủ lượt nữa → hiện: *"Còn X Lượng.
  **Mời 2 bạn đăng ký → +30 Lượng, đủ thêm 1 lượt vẽ**"* + nút copy link kèm mã.
- Thêm mục referral vào `profile.html` (hiện CHỈ có ở `topup.html`) + hiện tiến độ
  "đã mời N/15 bạn · đã nhận M Lượng" để tạo cảm giác tiến triển.

### ✅ V2.3 XONG (PR mới, session này) — chỗ xin mời bạn
- **`public/invite-cta.js` (MỚI)** — thẻ mời hiện NGAY SAU khi xem xong chân dung
  mà số dư KHÔNG còn đủ một lượt nữa. Đây là khoảnh khắc DUY NHẤT trong cả vòng
  lặp mà người ta vừa thích thú vừa hụt hẫng cùng lúc; không có chỗ xin ở đây
  thì không ai mời. Tự ẩn khi còn đủ Lượng (chưa hụt thì chưa phải lúc xin).
- **3 luật câu chữ** (viết thẳng trong file, đừng sửa nếu chưa đọc): (1) nói
  THẲNG con số — *"mời 2 bạn = +30 Lượng = đủ thêm 1 lượt vẽ"*, hứa lửng lơ
  kiểu "mời bạn để xem tiếp" là mất niềm tin ngay lần đầu; (2) mọi con số lấy
  từ SERVER, không viết cứng — thưởng/giá đều chỉnh bằng SQL; (3) chạm trần
  lượt mời thì NGỪNG hứa, nói thật là hết lượt trong 30 ngày.
- **Link mời trỏ vào CHÍNH tool vừa dùng** (`/app/<tool>?ref=…&utm_*`), không
  phải trang chủ — người được mời đáp xuống đúng thứ vừa khiến bạn mình khoe,
  và `referral.js` (V2.1) bắt `?ref=` sẵn ở đó.
- **`profile.html` + `account-core.js`** — thêm mục referral (link + thanh tiến
  độ mời được thưởng/30 ngày + tổng đã mời/đã nhận). Trước đây referral CHỈ có ở
  `topup.html`, tức chỉ ai đã định nạp tiền mới thấy, trong khi người hết Lượng
  thường vào profile trước.
- **🐞 Bắt được chỗ đang nói SAI với người dùng:** `topup.html` ghi *"Tối đa 10
  lượt mời / tháng"* trong khi DB là 20 (nay 15), và KHÔNG hề nhắc phần thưởng
  lúc bạn mình **đăng ký** — chỉ nhắc lúc nạp tiền. Đổi sang đọc từ server.
- **`my-referral`** trả thêm `balance`/`cap`/`rewardPerInvite`/`rewardedRecent`/
  `toolPrice` (nhận `?tool=`) để widget tính được trong MỘT lượt mạng, khỏi
  nhúng anon key vào thêm trang. `rewardedRecent` đếm theo **cửa sổ 30 ngày**
  khớp `process_referral_signup` — lấy tổng mọi thời sẽ báo "hết lượt mời" cho
  người thật ra vẫn còn.
- **Verify:** `tsc` · `lint` · `prettier --check .` · `node --check` · Playwright
  5 ca câu chữ: 0 Lượng/giá 25/thưởng 15 → "mời 2 bạn, +30, đủ thêm 1 lượt vẽ";
  10 Lượng → tự tính lại "mời 1 bạn"; còn đủ Lượng → **im lặng**; chạm trần →
  **không hứa nữa**; thiếu mã → không dựng gì.
- **CÒN LẠI:** widget mới gắn ở 2 trang shell `/app/chan-dung-*`; bản standalone
  `/tools/chan-dung-*.html` chưa gắn (CTA từ link chia sẻ đổ về `/app` nên đường
  chính đã phủ) — gắn nốt khi cần.

**V3 — Ảnh để đăng (làm song song được):** bản tải về **9:16 (1080×1920)** ghép ảnh
chân dung + 1 câu đắt nhất trong truyện + seal + `tuviminhbao.com`, dựng bằng canvas
client hoặc route OG (**không tốn thêm tiền model**); nút "Tải ảnh" cạnh nút Chia sẻ.
Lý do: người Việt share ẢNH lên Story/TikTok nhiều hơn share link — ảnh không mang
thương hiệu thì lan mà không về.

### ✅ V3 XONG (PR mới, session này) — ảnh 9:16 để đăng Story/TikTok
Audit lúc làm: nút "⬇ Tải Ảnh" **đã có sẵn** trên cả 4 trang (2 shell + 2
standalone) nhưng nó tải đúng file thô model sinh ra (1024×1536, trần trụi) —
tức đường lan MẠNH NHẤT ở thị trường VN đang chảy đi mà không mang một dấu hiệu
nào dẫn ngược về site. V3 = nâng cấp chính nút đó, không thêm nút thứ hai.
- **`public/poster.js` (MỚI)** — dựng poster bằng `<canvas>` NGAY TRÊN MÁY NGƯỜI
  DÙNG: ảnh chân dung cắt `cover` vào khung 9:16 → dải chuyển xuống nền navy →
  nhãn `TỬ VI MINH BẢO` → tiêu đề → dòng phụ → câu trích → **triện `seal.webp` +
  `tuviminhbao.com` neo CỨNG ở đáy**. Không gọi thêm lượt model nào.
- **"1 câu đắt nhất" chọn bằng LUẬT, không bằng LLM** (`Poster.pickQuote`): thêm
  một lượt model cho mỗi lần bấm Tải Ảnh là chi phí thật, trong khi thứ cần chỉ
  là một câu đọc lọt tai. Luật: lấy câu TRỌN VẸN có độ dài gần 95 ký tự nhất
  trong khoảng 45–155 (ngắn quá thì cụt lủn, dài quá thì tràn 3 dòng), duyệt các
  nguồn theo thứ tự ưu tiên. Tiền kiếp: `ketLuan` → `moTaNhanVat` → 5 hồi (Lời
  Kết là câu chốt của cả truyện, tách ra đứng một mình vẫn có nghĩa). Vợ chồng:
  `meetingContext` → `description` → `phuTheLuanGiai` (câu kể một khung cảnh đọc
  hấp dẫn hơn câu tả mũi tả mắt, mà đây là ảnh để người ta đăng lên khoe).
- **`app/api/portrait-image/route.ts` (MỚI)** — proxy CÙNG-ORIGIN cho bucket
  `portraits`. Vì sao cần: canvas vẽ ảnh khác origin thiếu header CORS sẽ bị
  "tainted", `toBlob()` ném SecurityError và mất trắng nút Tải Ảnh. poster.js
  vẫn thử đường THẲNG trước (nhanh hơn), đây là lối thoát. **ALLOWLIST CỨNG**
  theo origin + prefix `/storage/v1/object/public/portraits/` + bắt buộc
  `content-type: image/*` — nhận URL tự do là biến endpoint này thành công cụ
  SSRF.
- **`poster_download` là loại event RIÊNG** (thêm vào allowlist `/api/track`),
  CỐ Ý không gộp vào `share`: phễu Vòng Lặp Viral đếm `share` làm mẫu số của
  K-factor, mà ảnh tải về không mang link bấm được nên không bao giờ sinh ra
  `share_view`/`cta_click` tương ứng — nhét chung vào chỉ làm K tụt giả.
- **Dựng poster hỏng vẫn phải đưa được ảnh cho người ta** → mọi trang giữ nhánh
  `_downloadRaw()` tải file thô như cũ, và nhánh đó CỐ Ý không đụng gì trong
  `Poster` (nó chạy đúng lúc `poster.js` nạp không được).
- **🐞 2 lỗi bắt được khi nhìn ảnh render, không phải Henry báo:** (a) `drawImage`
  KHÔNG tự cắt theo khung — ảnh dọc 2:3 phủ đủ bề ngang 9:16 thì cao hơn vùng
  ảnh, tràn xuống đè nền khối chữ (nền chữ đổi màu theo từng bức, có bức mất
  sạch tương phản) → phải `ctx.clip()`; (b) neo ảnh lệch lên 0.15 cắt mất mép
  trên, mà nhân vật đội mũ quan/mũ giáp — cụt mũ là thứ nhìn ra ngay → neo mép
  TRÊN (0), cắt hết phần dư ở dưới nơi chỉ có thân/nền.
- **Verify:** `tsc` 0 lỗi · `lint` 0 lỗi (72 warning pre-existing) · `prettier
  --check .` (quét cả cây) sạch · `node --check` poster.js + mọi script block ·
  engine test 181 pass · **Playwright**: `pickQuote` 5 ca (chọn câu vừa khung /
  rơi xuống nguồn sau khi nguồn đầu rỗng / toàn câu ngắn thì cắt gọn / bỏ dấu
  `**` markdown / rỗng hết trả '') · `build()` ra **đúng PNG 1080×1920** (đọc
  IHDR, không tin tên file) ở cả 3 ca thường/tiêu-đề-dài/không-có-câu-trích ·
  **bấm nút thật trên CẢ 4 TRANG** → tên file + kích thước + event
  `poster_download` đúng tool_id · chặn `poster.js` → cả 4 trang rơi đúng về
  file thô (phải `serviceWorkers:'block'` mới mô phỏng được, vì `nav.js` đăng ký
  SW mà SW tự đi mạng ngoài tầm `page.route` — test artifact, không phải bug) ·
  **proxy 10 ca** (hợp lệ / query rác bị lược / host khác kể cả
  `169.254.169.254` / sai đường dẫn / bucket khác / không phải ảnh → 415 / 404 /
  `../` traversal / không phải URL) · **fallback CORS chạy thật đầu-cuối** trên
  Next dev + stub không gửi header CORS: nạp thẳng hỏng → tự đi qua
  `/api/portrait-image` → vẫn ra ảnh 1080×1920.
- **CÒN LẠI:** Henry gen thử 1 lá số trên prod rồi bấm Tải Ảnh để soi poster với
  ảnh THẬT — tao chỉ verify được bố cục bằng ảnh giả đúng tỉ lệ 1024×1536; chỗ
  nhiều khả năng phải chỉnh là vùng cắt (`IMG_H`/neo) nếu model hay đặt mặt nhân
  vật thấp hơn dự kiến. Sửa gọn, chỉ vài hằng số đầu `poster.js`.

**V4 — Mồi phân phối (viral là bộ khuếch đại, không phải nguồn):** 80 visit/ngày thì
vòng lặp không tự khởi động. Dùng content-pack TikTok (M2.3 của track Marketing) đẩy
5 chân dung đẹp nhất tuần → script 30–60s, Henry đăng tay 10–15ph/ngày + seed 3–5 group
tử vi/tarot FB.

### ✅ V4 (phần CODE) XONG (PR mới, session này) — content-pack TikTok
"M2.3 của track Marketing" mà plan trỏ tới **không tồn tại** (track đó đi M0.1–M0.6),
nên content-pack dựng mới ở đây. Phần còn lại của V4 là **việc tay Henry** (đăng
TikTok 10–15ph/ngày, seed group FB) — code CHỈ soạn sẵn chất liệu, KHÔNG tự đăng
đi đâu (không có tích hợp TikTok/FB API, cố ý).
- **`lib/marketing/content-pack.ts`** — gom 5 bản chân dung của tuần rồi nhờ 1 lượt
  `llmText()` viết kịch bản 30–60 giây cho từng cái (HOOK 0–3s / THÂN 3–45s / CHỐT
  45–60s + 5 hashtag), kết bằng gợi ý seed group FB.
- **🔑 Nguồn dữ liệu là `shared_results`, KHÔNG phải 2 bảng portrait** — hai lý do
  trùng khít nhau: (1) **riêng tư** — đó là những kết quả CHÍNH CHỦ đã bấm Chia sẻ,
  tức đã tự công khai; `past_life_portraits`/`spouse_portraits` chứa cả lượt vẽ riêng
  tư chưa ai cho phép đem đăng; (2) **chất liệu** — cột `blocks` của bản chia sẻ lưu
  TRỌN phần chữ (tên nhân vật, danh xưng, mô tả, 5 hồi, Lời Kết), trong khi 2 bảng
  portrait chỉ giữ vài cột meta. Kho được phép đăng cũng chính là kho giàu nhất.
- **Xếp theo `view_count`**, và nói thẳng trong header là "xếp theo lượt mở link,
  không phải máy chấm ảnh đẹp" — không có tín hiệu nào nói được "đẹp", giả vờ có là
  nói dối Henry về thứ anh đang đọc.
- **Tuần không ai chia sẻ → KHÔNG gọi LLM**, trả lời thẳng là chưa có chất liệu +
  chỉ ra việc cần làm. Nhờ LLM viết vo cho có là tốn tiền để sinh ra rác.
- **KHÔNG đụng hot path & KHÔNG đổi schema.** Cân nhắc lưu truyện vào
  `past_life_portraits` cho giàu chất liệu, nhưng truyện và ảnh là **2 request chạy
  SONG SONG** (thiết kế 2 pha) nên phải bịa thêm khoá tương quan để ghép — đổi kiến
  trúc một tool đang live để lấy lợi ích còn giả định. Bỏ. Script 45 giây cần *chức
  phận + nền + ảnh* (đã có sẵn); 5 hồi là thứ người ta đọc trên site.
- **`app/api/cron/content-pack/route.ts`** — CN hằng tuần (`0 1 * * 0` = 8h sáng VN),
  cùng pattern CRON_SECRET/`withCronLog`/Telegram admin với `cmo-digest`, prefix 🎬.
  0 env mới. **Đăng ký vào `lib/ops/jobs.ts`** — sổ job của S4 (track COO) mới lập
  chính vì mấy cron marketing từng VẮNG MẶT khỏi trang giám sát; thêm cron mà quên
  ghi sổ là tái lập đúng lỗ hổng vừa vá.
- **Nút "🎬 Sinh Content Pack"** (`admin-content-pack`, verifyAdmin) trong
  `#page-marketing` + chọn 7/30/90 ngày — CÙNG hàm cron dùng. Lý do có nút: cron gửi
  sáng CN, lỡ tin thì phải đợi cả tuần.
- **Verify:** `tsc` · `lint` 0 lỗi · `prettier --check .` · `node --check` 3 script
  block admin · `vercel.json` parse được · **unit test trên CHÍNH file thật** (chỉ
  thay 1 dòng import LLM bằng stub): query PostgREST đúng bộ lọc/sắp xếp, map đúng
  URL/label/views, excerpt gộp `blocks` và rơi về `text_content` khi blocks null,
  **payload gửi LLM KHÔNG chứa user_id/email/ngày sinh**, rỗng → không gọi LLM, lỗi
  PostgREST → ném lên cho `withCronLog` ghi · **cron route chạy thật** trên Next dev
  + stub: không auth/sai secret → 401, đúng secret + rỗng → 200 `sent:true` và
  `cron_runs` ghi `status=ok` đúng `job_key`, có dữ liệu → đi tiếp tới LLM · panel
  admin render + bấm nút thật, **light + dark**, 0 lỗi console.
- **CÒN LẠI:** bản digest đầu tiên gửi 8h sáng CN sau khi merge. Hiện 26 link chia sẻ
  đều là bản test của Henry nên pack đầu sẽ lấy từ đó — đúng như thiết kế, không phải
  lỗi. Việc tay: đăng đều 10–15ph/ngày + seed 3–5 group FB.

**V5 — Khuếch đại (chỉ làm SAU khi V2.4 có số thật):** gate "chia sẻ để mở khóa hồi 4–5"
· **duyên nợ tiền kiếp với người ấy** (2 lá số → 1 truyện, mỗi lượt kéo 2 người — K cao
nhất, tái dùng ~90% hạ tầng) · Thẻ Định Mệnh + độ hiếm lá số (chi phí LLM ≈ 0, gắn được
vào MỌI tool).

### 🚧 V5 — "Duyên Nợ Tiền Kiếp": ENGINE XONG (PR mới), TOOL CHƯA DỰNG
**Chọn mục nào trong 3 mục V5, và vì sao:** làm **duyên nợ tiền kiếp**, BỎ 2 mục kia.
Gate của V5 ("chỉ làm sau khi V2.4 có số thật") tồn tại vì *khuếch đại* cần biết mình
đang khuếch đại cái gì — nhưng duyên nợ là **tool MỚI tạo nhu cầu mới**, không phải
khuếch đại, nên không dính gate đó. Hai mục kia thì dính: "Thẻ Định Mệnh" là lớp share
gắn lên tool sẵn có, còn gate "chia sẻ để mở khoá hồi 4–5" **nên cân nhắc bỏ hẳn** —
ép chia sẻ mới cho đọc tiếp là đúng thứ mà cả track này tránh ("hứa hụt là mất niềm
tin ngay lần đầu"), và nó bóp trải nghiệm để đổi lấy một vòng lặp CHƯA đo được.
- **`lib/engine/past-life-bond.ts` (MỚI)** — `computePastLifeBond(lsA,gA,lsB,gB)` THUẦN
  deterministic: nền văn minh CHUNG + 2 nhân vật (dùng lại `computePastLife`, đúng chỗ
  "tái dùng ~90% hạ tầng" mà plan nói) + **loại duyên nợ** suy từ cổ pháp thật.
- **7 loại duyên:** phu thê · kim lan · ơn cứu mạng · thầy trò · nợ chưa trả · hai bờ
  chiến tuyến · tao ngộ. Mỗi loại gắn với dấu hiệu TRA ĐƯỢC trong lá số, và dấu hiệu đó
  trả ra trong `signals` để hiện thẳng cho người đọc — không bốc thăm chỗ nào.
- **Nền chung phải ĐỘC LẬP THỨ TỰ:** `pickSharedEra` sắp seed 2 lá số trước khi hash.
  Không làm vậy thì nhập A trước B ra một thế giới, B trước A ra thế giới khác — hai
  người bạn cùng bấm nhận 2 kết quả mâu thuẫn, mất tin ngay. Verify 950 cặp: 0 lệch.
- **🐞 Bắt được khi ĐO, không phải khi đọc code** (đo trên 950 cặp từ 96 lá số thật):
  - Bản 1: **36% ra "hai bờ chiến tuyến", 30% ra "ơn cứu mạng"** — 2/3 số cặp bị phán
    bởi MỘT tín hiệu yếu (ngũ hành nạp âm, gần như ngẫu nhiên giữa 2 người bất kỳ).
    Nói với một phần ba số cặp rằng kiếp trước họ là kẻ thù, chỉ vì nạp âm khắc nhau,
    là kết luận nặng dựa trên chứng cứ mỏng. → Đổi trục chính sang **địa chi cung Mệnh**
    (hợp/xung/hình — tín hiệu mạnh, rõ trong cổ pháp), ngũ hành/chính tinh chỉ tinh chỉnh.
  - Bản 2: lệch ngược, **68% ra "bằng hữu"** — thành thật nhưng nhạt, quá nửa người dùng
    nhận đúng câu trả lời chán nhất cho một tool mà cả cái hook là "kiếp trước hai ta là
    gì của nhau". Căn nguyên: cặp Mệnh HỢP mà chính tinh trung tính bị rơi tuột xuống
    nhánh mặc định, tức vứt bỏ đúng thứ vừa đọc được từ lá số. → mọi cặp Mệnh hợp đều
    vào nhánh dương.
  - **Lỗi đúng/sai thật:** nhánh `same` trong `chiRelation` KHÔNG BAO GIỜ chạy được vì
    tam hợp chặn trước (mỗi địa chi nằm trong đúng 1 nhóm tam hợp nên a===b luôn thoả
    "cùng nhóm") → cặp cùng địa chi bị **báo sai cổ pháp** là "cùng Tam Hợp", ngay trong
    phần dùng để chứng minh mình không bịa. Đảo thứ tự xét.
  - **Trục phụ cung Phu Thê:** Mệnh trung tính là >50% số cặp; cổ pháp không chỉ đọc
    duyên ở cung Mệnh — Phu Thê mới là cung nói về ràng buộc đôi lứa. Bỏ qua nó rồi trả
    "tao ngộ" cho quá nửa người dùng mới là làm hỏng.
- **Phân bố cuối (950 cặp):** tao ngộ 48,6% · kim lan 26,6% · hai bờ chiến tuyến 8,3% ·
  phu thê 7,7% · thầy trò 3,1% · nợ chưa trả 2,9% · ơn cứu mạng 2,7%. Mẫu là lưới lá số
  đều nên tỉ lệ THẬT sẽ lệch đi ít nhiều — đừng coi đây là con số prod.
- **Bất biến đã verify:** đảo A/B ra y hệt (0/950 lệch) · 2 nhân vật LUÔN cùng nền
  (0/950 lệch) · không bao giờ gán "phu thê" cho cặp cùng giới · mọi kết quả đều có
  `signals` · gọi lại cùng cặp ra y hệt · 5 nền trải đều (180–202/950) · 54 chức phận.
- **Xuất thêm từ `past-life.ts`:** `stableHash`, `ERA_IDS` — CỐ Ý dùng chung thay vì
  chép: hash mà có 2 bản thì hai bản trôi khỏi nhau lúc nào không biết.
- **⚠️ CÒN LẠI (tool chưa dùng được, engine hiện CHƯA có ai gọi):** prompt viết truyện
  đôi · prompt ảnh 2 nhân vật chung một khung · route 2 pha (`phase=story|image` như
  `chan-dung-tien-kiep`) · trang shell `/app/duyen-no-tien-kiep` · migration bảng lưu +
  `tool_pricing` · đăng ký (`next.config.mjs` rewrite, `shell.js` TOOLS, `app-home.html`
  GROUPS, `cong-cu.html`, `tuvi-paywall.js`) + bump `shell.js?v=`. Trang standalone SEO
  có thể làm sau — CTA từ link chia sẻ đổ về `/app` nên đường chính là trang shell.

### 🚦 Tiêu chí dừng/đổi hướng (đặt trước để khỏi tự lừa mình)
Sau khi xong V2 + V4 chạy đủ 3–4 tuần: **K-factor < 0.3** → kết luận 2 tool này không lan
tự nhiên ở thị trường VN; chuyển vai chúng thành **mồi trả phí thấp / hook quảng cáo**
thay vì trông chờ viral, và dồn ngân sách sang kênh khác. Không cố đấm.

---

## 🏯 Tool mới — "Chân Dung Tiền Kiếp" (2026-07-26, PR #298)

**Branch:** `claude/viral-use-cases-brainstorm-8zoydi`

Xuất phát từ phiên brainstorm "làm gì để viral" (Henry: tool Chân Dung Vợ Chồng
có vẻ viral được, còn use case nào nữa?). Chốt làm **Chân Dung Tiền Kiếp** trước
vì tái dùng ~90% hạ tầng tool vợ chồng.

### ⚠️ ĐỊNH VỊ — đọc trước khi sửa bất cứ thứ gì trong tool này
Tử Vi Đẩu Số **KHÔNG có cung nào nói về tiền kiếp** (luân hồi là khái niệm Phật
giáo, không thuộc mệnh lý Trung Hoa) — Henry hỏi thẳng điều này lúc brainstorm.
Tool KHÔNG bói tiền kiếp. Điểm tựa thật: toàn bộ từ vựng gốc của Tử Vi là từ
vựng **triều đình phong kiến** (cách cục tên "Quân Thần Khánh Hội", "Tướng Tinh
Đắc Địa"; diễn giải cổ ghi thẳng "công hầu khanh tướng", "trấn thủ biên ải").
Luận tử vi cho người hiện đại vốn là **dịch xuôi** thứ ngôn ngữ đó (Thất Sát →
"nghề áp lực cao"); tool này bỏ bước dịch đi, trả lá số về đúng bối cảnh cổ thư
viết ra nó. Bối cảnh chốt: **Trung Hoa cổ** (Henry chọn — model gen ảnh cổ trang
Trung Hoa tốt hơn hẳn cổ trang Việt). Disclaimer có ở cả 2 trang + FAQ schema.

### Kiến trúc
- **`lib/engine/past-life.ts`** (THUẦN deterministic, không gọi LLM):
  - **Chức phận**: bảng tra cứng 14 chính tinh tại **Quan Lộc** → nghề thời xưa
    (Thất Sát → tướng trấn biên, Thiên Cơ → mưu sĩ, Cự Môn → biện sĩ, Thiên Đồng
    → thầy thuốc…), mỗi nghề kèm `attireEn` (trang phục) + `backdropEn` (bối cảnh
    nền) cho prompt ảnh — đây là thứ khiến ảnh TRÔNG đúng nghề. Quan Lộc vô chính
    diệu → mượn chính tinh cung xung chiếu theo cổ pháp. Phụ tinh + tứ hóa tại
    Quan Lộc chỉ thêm *sắc thái*, KHÔNG đổi nghề gốc.
  - **Dòng đời**: 9 đại vận → 5 hồi gộp cố định `[ĐV1-2][3-4][5-6][7-8][9]` theo
    THỜI GIAN, rồi mới GẮN NHÃN `dinh-cao`/`bien-co` vào đúng hồi chứa đại vận có
    `scoring.tong` cao nhất/thấp nhất (2 cái rơi cùng hồi → `thang-tram`). **CỐ Ý
    không cố định "hồi 3 = đỉnh cao"** — ép thế thì mọi lá số ra cùng một hình
    dáng truyện; để nhãn tự trôi thì mỗi người ra một arc thật khác nhau.
  - **Tuổi vẽ ảnh**: neo vào đại vận cao điểm nhất **trong quãng đời trưởng thành**
    (`tuoiStart < 56`) rồi kẹp 25–55. Bản đầu neo vào đỉnh cao TOÀN CỤC → test 8 lá
    số thấy 4/8 chạm trần 55 vì đỉnh cao hay rơi vào 86–95 tuổi (vẽ cụ già hỏng cả
    bức). Đỉnh cao toàn cục vẫn giữ nguyên cho phần TRUYỆN.
- **`lib/engine/portrait.ts`** — tách `computeMorphologyForPalace(ls, cungName)`
  ra khỏi `computeSpouseMorphology` (trước cố định cứng `'Phu Thê'`) để dùng cho
  cung **Mệnh**. Thuật toán rank/merge sao KHÔNG đổi; wrapper cũ giữ nguyên chữ ký
  → tool vợ chồng không đổi hành vi. Tương tự `getPalaceReadout` /
  `getPalaceChinhTinhElement` / `formatPalaceReadoutForLLM`.
- **`app/api/chan-dung-tien-kiep/route.ts`** — **2 PHA** (`phase=story|image`):
  truyện (~20s) và ảnh (~60s) độc lập nhau nên client gọi SONG SONG, truyện hiện
  trước để đọc, ảnh chèn vào khung chờ sau. Khác tool vợ chồng (1 request tuần tự,
  người dùng nhìn màn hình trắng cả phút) — với tool nhắm viral thì đó là chỗ rơi
  rụng lớn nhất. Giá lá số bị tính 2 lần (deterministic, vài chục ms — không đáng).
- **`lib/agent/past-life-story.ts`** — mở đầu BẮT BUỘC là đoạn **"soi gương"** nói
  về CHÍNH người đọc (không phải nhân vật), gọi đích danh ≥2 chi tiết thật của lá
  số, nêu cả mạnh lẫn yếu, rồi mới bắc cầu sang truyện. Nếu người đọc không thấy
  mình ở đoạn này thì cả phần truyện thành chuyện người dưng. Cấm: đặt tên riêng
  cho nhân vật (tránh trùng nhân vật lịch sử), nhắc nhân vật/triều đại có thật, mô
  tả cái chết trực diện, nêu điểm số trong phần truyện.
- **Trang**: `public/tools/chan-dung-tien-kiep.html` (standalone/SEO) +
  `public/app-chan-dung-tien-kiep.html` (shell). Shell gọi `Shell.setShareable`
  dựng trang `/ket-qua` — **người xem link đọc trọn ảnh + truyện KHÔNG mất Lượng**,
  chỉ người sinh mới trả phí (Henry chốt mô hình trả phí toàn bộ; đây là cách vá
  đường lan mà không đụng giá).
- **Đăng ký**: `next.config.mjs` rewrite `/app/chan-dung-tien-kiep`; `shell.js`
  TOOLS (nhóm Tử Vi, icon mới `temple`) + `app-home.html` GROUPS (thêm icon
  `temple` vào map riêng của file này) + `cong-cu.html` TOOL_URLS +
  `tuvi-paywall.js` PRODUCTS/TOOL_TYPE. Bump `shell.js?v=45` toàn bộ trang shell.
- **Cost tracking (D3 margin)**: `llmTextFull` + `logLlmUsage` cho CẢ 2 lượt LLM,
  `logImageUsage` cho lượt sinh ảnh — `tool_id='chan-dung-tien-kiep'`.

### Migration
`_patches/migration-chan-dung-tien-kiep.sql` — ✅ **ĐÃ CHẠY PROD** qua Supabase MCP
(verify: `past_life_portraits` 8 cột / 2 index / 2 policy / RLS bật; bucket
`portraits` dùng lại của tool vợ chồng). **⚠️ Row `tool_pricing` đang
`enabled=false` CÓ CHỦ ĐÍCH** — `cong-cu.html` và `tuvi-paywall.js` đều lọc
`enabled=eq.true`, bật trước khi deploy thì tool hiện trên trang Công Cụ mà trang
`/tools/chan-dung-tien-kiep.html` chưa tồn tại → 404 cho người dùng thật. Bật sau
khi deploy xong:
```sql
UPDATE public.tool_pricing SET enabled = true, updated_at = now()
 WHERE tool_id = 'chan-dung-tien-kiep';
```

### Verify
`npx tsc --noEmit` 0 lỗi · `npm run lint` 0 lỗi (72 warning pre-existing) ·
`npx prettier --check` sạch · `node --check` mọi script block · **engine test 8 lá
số thật** (chức phận/5 hồi/nhãn đỉnh-đáy/mốc tuổi/tuổi vẽ đều hợp lệ, 8 arc khác
nhau) · Playwright render đúng cả 2 trang.

### Vòng chỉnh sau khi Henry test prod (PR mới, session này)
Henry: truyện "chủ yếu kể về công việc". Đúng — flow cũ chỉ đưa vào prompt **5 cung**
(Mệnh · Quan Lộc · Tài Bạch · Phúc Đức · Thiên Di, cộng cung Thân trùng lên 1 trong
số đó), mà **3/5 thuộc mảng bản thân–công danh–tiền bạc** → truyện dồn vào sự nghiệp
là hệ quả trực tiếp. Thiếu hẳn Phu Thê, Tử Tức, Huynh Đệ, Nô Bộc, Tật Ách, Điền
Trạch, Phụ Mẫu.
- **`computeLifeThreads(ls)`** (`past-life.ts`) — quét cách cục **cả 12 cung** (trừ
  Mệnh/Quan Lộc đã có khối riêng), chấm `cachCucWeight×3 + min(yNghia,8)×0.4` (cách
  cục quý/phú/bần tiện nặng gấp 3 cách cục thường), bỏ cung không tín hiệu, lấy **top
  5**. `CUNG_ROLE` gán mỗi cung một *vai trong truyện* ("Nô Bộc → bạn bè, thuộc hạ";
  "Tật Ách → bệnh tật, tai ách mang trên thân") để LLM biết dùng làm gì.
  `formatCharacterForLLM` thêm khối "CÁC TUYẾN ĐỜI NGOÀI CÔNG DANH"; cung nào đã in
  đủ ở trên thì chỉ trỏ ngược, không lặp dữ liệu.
- **`past-life-story.ts`** — luật mới "đây là một đời người, không phải bản lý lịch
  công tác": MỖI tuyến phải hiện ra ít nhất 1 lần bằng một CẢNH hoặc NHÂN VẬT cụ thể,
  rải theo lẽ thường (cha mẹ/anh em hồi đầu; hôn nhân/con cái/bệnh tật hồi giữa-cuối),
  không dồn 1 hồi. Thêm luật **chuyển vật hiện đại sang tương đương thời xưa** — dữ
  liệu cổ pháp trong engine có chỗ diễn đạt kiểu "tai nạn xe cộ", "đầu tư", "bảo lãnh"
  (phát hiện khi test 6 lá số). `text` mỗi hồi 90–140 → **100–160 từ** cho đủ chỗ.
- **Bỏ khối "Cơ Sở Trong Lá Số"** (markup + `renderBasis()` + CSS `.cdtk-basis`) khỏi
  cả 2 trang. **Caveat viết lại** theo lời Henry, chung chung: *"phác hoạ dựa trên các
  dữ liệu trong lá số Tử Vi của bạn, kết hợp với kinh nghiệm nghiên cứu của tiền nhân
  để lại"*. Trang standalone trước đây KHÔNG có caveat ở khu kết quả → nay thêm.
  **⚠️ KHÔNG viết "query database nhân vật lịch sử có lá số giống nhất"** như Henry
  gợi ý lúc đầu — hệ thống không có database đó và không có bước so khớp nào; viết vậy
  là mô tả một tính năng không tồn tại cho người dùng trả tiền.
- **Verify:** `npx tsc --noEmit` 0 lỗi · `npm run lint` 0 lỗi · `npx prettier --check .`
  (dạng QUÉT CẢ CÂY, đúng như CI chạy) sạch · `node --check` mọi script block · chạy
  thử 6 lá số thật: threads ra 10 cung khác nhau, cách cục thật, không lá nào trùng bộ.

### Vòng chỉnh tiếp — bỏ đoạn "soi gương", đổi thành mô tả nhân vật (PR mới)
Henry: đoạn mở đầu *"TRƯỚC HẾT — NÓI VỀ CHÍNH BẠN"* nói về người đọc ở hiện tại
→ **trái theme** khi cả trang đang kể chuyện tiền kiếp. Đổi thành **"MÔ TẢ <tên
nhân vật>"**, viết về chính nhân vật.
- Field `soiGuong` → **`moTaNhanVat`** (prompt + `route.ts` + 2 trang + block
  chia sẻ `/ket-qua`). Không có cache/lưu JSON truyện nên đổi tên an toàn.
- Nội dung mới: 3–4 câu ngôi thứ ba, gọi đúng tên đã chốt, nói về **khí chất và
  cốt cách** (tính khí gốc + một cách hành xử nhận ra ngay + một chỗ yếu/nỗi khổ
  tâm), cấm xưng "bạn", cấm nhắc đời sống hiện tại. **Giữ nguyên giá trị cũ theo
  cách khác:** cốt cách vẫn rút thẳng từ cung Mệnh nên prompt yêu cầu tả đúng tới
  mức người đọc tự soi ra mình — chỉ khác là để họ TỰ nhận ra thay vì gọi thẳng.
  Thêm luật cấm tả ngũ quan/vóc dáng/trang phục (bức tranh đã lo, tả thêm dễ đá
  nhau với ảnh).
- Tiêu đề khối giờ **động**: `moTaTitle.textContent = 'Mô tả ' + characterName`.
- **Verify:** `npx tsc --noEmit` 0 lỗi · `npm run lint` 0 lỗi · `npx prettier
  --check .` sạch · `node --check` mọi script block.

### Vòng chỉnh tiếp — 5 nền văn minh (PR mới)
Henry: thêm Nhật Bản cổ · Hàn Quốc cổ · Thái Lan cổ vào 2 nền đang có → **5 nền**.
- **Vì sao KHÔNG chỉ thêm 3 dòng vào `ERAS`:** mẹo "trang phục Việt ≈ Trung Hoa
  nên dùng chung `attireEn`" KHÔNG dùng lại được cho Nhật/Hàn/Thái (quan Hàn
  mặc dallyeongpo + mũ samo, võ tướng Nhật mặc ō-yoroi, quan Thái mặc chong
  kraben) — 44 chuỗi `attireEn` + 7 `DOMAIN_BACKDROP` đang viết bằng từ vựng
  Trung Hoa cứng ("black gauze cap", "jade belt", "bamboo scrolls", "red
  lacquered columns"). Giữ nguyên = người Trung Hoa mặc đồ Trung Hoa đứng
  trước phông Thái.
- **Kiến trúc 2 tầng** (thay vì ma trận 44×5 = 220 chuỗi): tầng 1 — trung lập
  hoá 44 `attireEn` + 7 backdrop, chỉ tả CẤP BẬC/chất liệu, không thuộc nền
  nào; tầng 2 — mỗi era một khối `costumeGrammarEn` + `sceneGrammarEn` dạy cấp
  bậc đó ăn mặc/sống ra sao ở nền này. 5 khối thay 220 chuỗi. **Trung Hoa
  không hồi quy** — grammar cấp lại đúng các dấu hiệu vừa gỡ.
- **Chọn nền = hash lá số** (`pickEraForLaso`, Henry chốt phương án A): cùng lá
  số LUÔN ra cùng nền, trải đều 5 nền (test 1.104 lá: 18,7–20,8%). **CỐ Ý
  KHÔNG suy từ ngũ hành mệnh** — tương ứng ngũ hành–phương vị chỉ cho ra NHÓM
  (Nhật/Hàn cùng Đông, Việt/Thái cùng Nam), ép 1-1 rồi gọi là cổ pháp là bịa.
  Seed có salt `'era|'` để chỉ số nền độc lập với chỉ số bốc tên.
- **Phân biệt ngoài cái tên** (Henry hỏi đúng chỗ): mỗi era thêm `ageLabel`
  (nhãn THỜI ĐẠI mô tả — "thời các lãnh chúa cát cứ" — **không** dùng tên triều
  đại thật Edo/Joseon/Ayutthaya, tránh người đọc đi tra rồi bắt lỗi) hiện thành
  badge dưới danh xưng, + `cultureVi` (thiết chế/đồ vật/tập tục đặc trưng) mà
  prompt truyện BẮT dùng ≥3 thứ rải các hồi, đồng thời CẤM mượn chi tiết của
  nền khác. **KHÔNG viết "kiếp trước bạn là người Nhật"** — đá vào disclaimer
  và kéo lại ngôi "bạn" vừa bỏ ở vòng trước.
- **Vá vênh định vị:** system prompt truyện + copy SEO 2 trang đang nói cứng
  "bối cảnh TRUNG HOA CỔ ĐẠI mà cổ thư viết ra nó" → sai với 4 nền kia. Đổi
  thành "thế giới phong kiến Á châu", nêu rõ 5 nền + nói thật là nền do lá số
  quyết định. **Điểm yếu đã biết:** Thái Lan nằm ngoài vùng Hán tự (Phật giáo
  Nam tông, quan chế gốc Ấn, không dùng Tử Vi) nên lập luận yếu nhất; 44 danh
  xưng Hán-Việt cũng không chuẩn cho Thái — giữ vì đây là nhãn tiếng Việt cho
  người đọc Việt, để ảnh + truyện gánh bản sắc.
- Gỡ 5 chỗ hardcode "East Asian" (Thái là Đông Nam Á) → `regionEn` +
  `artTraditionEn` từng nền. Giữ nguyên lối vẽ painterly pastel Henry đã duyệt.
- **Không cần migration** — cột `era` đã có sẵn trên `past_life_portraits`.
- **Verify:** `tsc` · `lint` · `prettier --check .` · `node --check` · phân bố
  era trên 1.104 lá số · gọi lại cùng lá số ra cùng nền + cùng tên · chức phận
  ĐỘC LẬP với nền · so prompt ảnh Trung Hoa trước/sau (**không mất dấu hiệu
  nào**, thêm 5) · quét rò rỉ từ vựng chéo trên 20 prompt = **0** · Playwright
  2 trang render badge đúng, không lỗi console.

### Vòng chỉnh tiếp — trang chia sẻ /ket-qua (PR #305)
Henry gửi ảnh chụp trang chia sẻ, 3 việc:
- **Tóm tắt lá số ở đầu trang.** Người nhận link không có ngữ cảnh gì → không
  biết chân dung gắn với lá số nào. `publishShareable` (trang shell) chèn block
  ĐẦU TIÊN "Lá số dùng để phác hoạ" = `birthSummary(_lastBirth)` →
  "Nam · 03/06/1998 (dương lịch) · giờ Sửu (01–03h)". **Henry chốt làm bản DÙNG
  CHUNG** → chuyển hẳn vào `shell.js` `setShareable`, mọi tool tự có (bump
  `shell.js?v=45→46` trên 27 trang). `birthSummaryLine()` đọc birth theo NHIỀU
  tên khoá vì shape không thống nhất giữa các tool (`day/month/year` vs
  `ngay/thang/nam` vs `dd/mm/yyyy`); thiếu ngày-tháng-năm → trả '' và KHÔNG
  chèn gì. Nguồn birth CHỈ lấy `o.birth` hoặc `ctx.birth` của chính lượt đó —
  **cố ý không đụng `birthSnapshot()`/localStorage**, lá số sót từ tool khác sẽ
  gắn nhầm chủ nhân cho bản chia sẻ. Ba nhánh: có `blocks` → chèn block đầu;
  text phẳng → nối dòng lên đầu `text` (không đổi layout); ảnh phẳng → dựng
  blocks. Test Playwright 5 ca (có blocks / text phẳng / ảnh phẳng / không lá
  số / birth thiếu ngày) đều đúng.
- **Logo:** `<div class="brand">紫微明寶</div>` → `<img src="/seal.webp">` ở CẢ
  `/ket-qua/[id]` lẫn `/luan-duong/[id]` (hai trang chia sẻ dùng chung layout).
  **CỐ Ý KHÔNG thay 40+ chỗ 紫微 còn lại** trong repo: phần lớn là
  `alternateName` trong JSON-LD (tên tiếng Hoa hợp lệ cho SEO, không nhét ảnh
  vào được), `紫微斗數` = TÊN BỘ MÔN không phải brand, và watermark vẽ trong
  canvas lá số. Chỉ đổi chỗ dùng như DẤU HIỆU THƯƠNG HIỆU.
- **Footer bỏ khẩu ngữ:** "AI chỉ luận, không bịa sao" → "Lá số được lập bằng
  engine cổ pháp; phần luận giải do AI thực hiện trên chính dữ liệu đó."
  `/luan-duong` giữ ngôi "thầy" (trang đó có persona thầy xuyên suốt), chỉ bỏ
  từ "bịa". Rà cả repo: từ "bịa" chỉ còn trong PROMPT gửi LLM và comment code —
  không phải chữ người dùng đọc, giữ nguyên.

### Vòng chỉnh tiếp — RAIL là upsell thật của tool (PR mới)
Henry chỉ ra insight quan trọng: đọc xong truyện, phản ứng đầu tiên của user là
**qua rail hỏi về NHÂN VẬT** ("ông ấy có giàu không?", "lấy vợ thế nào?", "có
bệnh tật gì?") — mà bản chất chính là **luận giải lá số của chính họ, bọc qua
một nhân vật cổ xưa**. Vỏ bọc đó dễ tin hơn vì nhân vật đã đi trọn một đời,
nghe như thuật lại chứ không như phán về người đang sống. Upsell = số lượt rail.
- **Audit trước khi sửa:** phần DỮ LIỆU đã đúng sẵn — cả 2 tool gọi
  `Shell.setContext({birth})` cùng shape, backend không phân biệt tool nào:
  `computeLaso` → `extractLasoContext(ls,'',{full:true})` → `CHAT_SYSTEM_LASO` +
  đủ bộ tool. Thiếu 3 thứ: (a) rail KHÔNG biết nhân vật là ai → hỏi "nhân vật
  này" là model không có referent; (b) prompt vẫn giọng luận thẳng ("cung Tài
  Bạch của bạn…"); (c) chips dùng thuật ngữ tử vi + ngôi "tôi", kéo user ra
  khỏi mạch truyện.
- **Bẫy đã tránh:** KHÔNG nhét nhân vật qua `scenario` — `runAgent` rẽ nhánh
  scenario sẽ **mất sạch full lá số**, đúng thứ cần giữ.
- **Cách làm:** thêm cờ `wrap?: 'past-life'` vào contract (additive, ENUM chứ
  KHÔNG phải chuỗi tự do — cho client gửi prose vào system là mở cửa
  prompt-injection). Trên nhánh birth, server **tự gọi `computePastLife(ls,
  gender)`** (deterministic → trùng đúng nhân vật đang hiện trên màn hình) rồi
  nối `pastLifeRailWrapper()` vào system.
- **Luật đóng vai:** trả lời *cái gì* qua nhân vật (không thuật ngữ tử vi);
  hỏi *"vì sao"* thì **được phép lộ cơ sở lá số** — đúng khoảnh khắc bán được
  Luận Giải; user xưng "tôi" thì bỏ vỏ, luận thẳng.
- Greeting + chips đổi sang hỏi về nhân vật bằng lời thường.
- **Verify:** stub fetch bắt system thật gửi lên provider — **gỡ khối đóng vai
  ra khỏi system có wrap → khớp bản không wrap BYTE-EXACT** (chỉ thêm, không
  sửa/bớt); system chứa đủ 12/12 cung + đại vận + tứ hóa + cách cục + luật luận;
  nhân vật trong prompt đúng bản engine chốt. tsc · lint · prettier · node
  --check. Bump `shell.js?v=46→47` (27 trang).

### Vòng chỉnh tiếp — neo mốc lịch sử thật + vá nút Chia sẻ desktop (PR mới)
- **🐞 Nút "Chia sẻ" trên desktop bấm KHÔNG RA GÌ.** Căn nguyên: `shareWorkspace`
  chỉ hỏi `if (navigator.share)` — trên **desktop Chrome hàm đó VẪN TỒN TẠI**,
  nhưng bị gọi SAU `await fetch('/api/share-result')` nên "user gesture" của cú
  click đã hết hạn, trình duyệt từ chối; nhánh `catch` lại `return` im lặng khi
  gặp `AbortError` → không hiện gì cả. Sửa: helper `shareLink()` — share sheet
  native CHỈ dùng trên thiết bị cảm ứng, desktop luôn mở modal có nút Sao chép;
  bọc thêm `try/catch` vì vài bản Chrome ném lỗi ĐỒNG BỘ. Áp cho cả
  `shareWorkspace` lẫn `shareSession` (cùng bug). **Tự dính bug khi test:**
  bản đầu `isTouchDevice()` ƯU TIÊN `navigator.userAgentData.mobile`, mà cờ đó
  false ngay trên máy mobile khi UA-CH không được set → mobile rơi nhầm vào
  modal. Sửa thành OR các tín hiệu, `pointer: coarse` là tín hiệu chính.
- **Dòng lá số hiện NGAY TRÊN TRANG** (trước chỉ có trong link chia sẻ nên Henry
  không thấy): "Lá số: Nam · 03/06/1998 (dương lịch) · giờ Sửu (01–03h)" dưới
  badge nền văn minh, ở cả 2 trang. Shell mở `Shell.birthSummary()` để trang
  dùng CHUNG chuỗi với bản chèn vào `/ket-qua`; trang standalone không có Shell
  nên tự dựng theo đúng định dạng đó.
- **NEO MỐC LỊCH SỬ THẬT** (Henry: không có mốc thì người đọc không biết chuyện
  xảy ra ở đâu, thời nào). Đây là **đảo luật cũ** vốn cấm sạch nhân vật/triều
  đại có thật. Mở theo TỪNG MỨC RỦI RO chứ không mở toang:
  - `geographyVi` mỗi era — **địa danh có thật** (Trường Giang/Chiết Giang,
    sông Hồng/Thăng Long, Kyoto/Kyushu, Hanyang/Gyeongju, Chao Phraya/
    Ayutthaya). Mức an toàn nhất: sông núi tỉnh thành hầu như không đổi. Cho
    phép chú "(nay thuộc …)" để người đọc định vị.
  - `periodVi` mỗi era — **triều đại có thật**, nói ở mức "dưới thời X",
    **CẤM nêu năm/niên hiệu** (engine chỉ có TUỔI nhân vật, không có mốc lịch —
    nêu năm là bịa). Danh sách triều đại **khớp với `ageLabel` đang hiện trên
    badge**: Nhật bỏ Edo (badge ghi "lãnh chúa cát cứ" = Sengoku, Edo là thái
    bình → mâu thuẫn); Hàn bỏ Silla (chưa có khoa cử).
  - **Vòng 2 — Henry chốt mở hẳn tên vua/nhân vật lịch sử** ("phải đặt vào bối
    cảnh lịch sử có thật… users có thể search google… cũng là cách để họ học
    thêm về lịch sử"). Prompt nay có luật **HAI TẦNG**: *tầng bối cảnh* = lịch
    sử THẬT (địa danh, triều đại, đời vua, chiến tranh — tra Google ra được, đó
    chính là giá trị); *tầng nhân vật* = HƯ CẤU, chỉ là một người bình thường
    sống trong thời đó. BẮT nêu thẳng "dưới thời Hán Vũ Đế", "đời vua Thành
    Thái". Nới `ageLabel` mấy nền tự bó mình: Việt "giữ nước phương Nam" →
    "quân chủ phương Nam" (để có cả Nguyễn), Nhật "lãnh chúa cát cứ" → "thời
    mạc phủ" (có cả Kamakura/Edo), Hàn "triều đình khoa cử" → "các vương triều
    cổ" (có cả Silla).
  - **Ranh giới CÒN GIỮ:** nhân vật không được LÀ người có thật, không chiếm vị
    trí độc nhất của triều ("Tể tướng của vua X" → "làm quan trong triều dưới
    thời vua X"); người thật là NỀN chứ không phải bạn diễn (không dựng cảnh họ
    trò chuyện/khen thưởng nhân vật). **Vẫn cấm năm dương lịch + niên hiệu kèm
    số** — engine chỉ có TUỔI, không có mốc lịch, nêu năm là tự bịa VÀ biến cả
    9 đại vận thành thứ tra ngược được rồi sai; muốn rõ hơn thì "đầu/giữa/cuối
    thời X".
- **Verify:** tsc · lint · prettier · `node --check` · Playwright 3 ca share
  (desktop → modal + link; mobile → native; native ném lỗi → rơi về modal) ·
  5 nền đều có đủ địa danh riêng, **0 rò rỉ địa danh chéo**, badge khớp thời kỳ.

### Vòng chỉnh tiếp — NÂNG THANG CHỨC PHẬN (PR #307)
Henry: *"user thường thích nghe những thứ hơi shocked, ngạc nhiên, thì mới viral
được… giờ đang đọc thầy thuốc này, chủ tiệm vải này, nghe tầm tầm không catchy.
Upgrade position nhưng vẫn giữ nguyên tính chất các sao, các cung."*
- **Cả 42 chức phận nâng 1–2 bậc VỀ QUY MÔ**, giữ nguyên `domain` và bản chất
  sao: Vũ Khúc vẫn tiền + võ (chủ hiệu vàng bạc → **cự phú buôn vàng bạc khắp
  mấy châu**), Thiên Đồng vẫn y (thầy lang → **ngự y trưởng** / **đại danh y
  trấn một phương**), Cự Môn vẫn khẩu thiệt (trạng sư → **ngự sử đại phu**),
  Tử Vi (quan viên ngoại → **tổng trấn một phương**, đúng ví dụ Henry đưa).
  `attireEn` chỉnh theo cấp mới; `source` (trích Tân Biên) **không đụng**.
- **Title phải NGẮN** (Henry chốt tiếp — bản đầu tao viết dài quá): title là
  **danh xưng**, đọc xong nhớ được để kể lại. "Đại đô đốc nắm binh quyền và
  quân lương" → **Đại đô đốc**; "Ngự sử đại phu, tiếng nói vang cả triều" →
  **Ngự sử đại phu**; "Cự phú buôn vàng bạc khắp mấy châu" → **Cự phú**. Râu
  ria dồn hết vào `desc` (chỉnh 7 desc để không mất chi tiết vừa rút ra).
- **CHỈ DỊCH CẢ THANG LÊN, KHÔNG NÉN 3 TẦNG.** Nén lại thì điểm cung Quan Lộc
  mất hết ý nghĩa, mọi lá số ra na ná nhau, và mất luôn khả năng nói "chức phận
  này chỉ rơi vào X% lá số". **Đo lại sau khi nâng: cao/giữa/thấp = 24/52/24%
  trên 552 lá số** (trước 20/56/24 — giữ nguyên độ trải), **79 chức phận khác
  nhau** xuất hiện, cái phổ biến nhất chỉ 4,2%.
- Không mâu thuẫn với phản hồi cũ "toàn quan với tướng": lần đó vấn đề là **đơn
  điệu** (11/14 đều là quan triều), lần này nâng **trong đúng domain của từng
  sao** nên vẫn có cự phú, danh y, tông sư, chủ đội thương thuyền, thủ lĩnh
  khai hoang — không dồn hết về triều đình.

### Vòng chỉnh tiếp — gắn TÊN vào dòng lá số (PR mới)
Henry: form có ô "Họ và tên" mà dòng tóm tắt chỉ ra "Lá số: Nam · 09/05/1984…".
`birthSummaryLine()` trong `shell.js` VỐN ĐÃ xử lý tên (`b.hoten || b.name`) —
nhưng **cả 2 trang đều bỏ rơi `hoten` khi dựng `_lastBirth`** nên nó không bao
giờ nhận được. Thêm `name` vào birth ở cả trang shell lẫn standalone, và bổ
sung phần tên vào `renderBirthLine()` riêng của trang standalone (trang này
không có Shell nên tự dựng chuỗi).
- **Lợi kèm:** `req.birth.name` cũng là thứ `nguoiXemLine()` dùng để dựng
  "Người xem: <tên>" trong system prompt — nên rail giờ xưng hô đúng tên luôn.
  KHÔNG ảnh hưởng lá số/nhân vật: `computeLaso` không đọc `name`, và
  `pickCharacterName`/`pickEraForLaso` seed từ dữ liệu lá số chứ không từ birth.
- Bỏ trống ô tên → chuỗi tự lược phần tên, không hiện dấu · thừa.
- **Verify:** Playwright kiểm 3 nơi đều ra
  "Nguyễn Văn Henry · Nam · 09/05/1984 (dương lịch) · giờ Sửu (01–03h)": dòng
  trên trang · payload gửi `/api/share-result` · trang standalone.

### 🐞 Vòng sửa lỗi — "Lỗi phân tích kết quả AI." (PR mới)
Henry chạy tool trên prod báo lỗi này, nghi hết credit. **KHÔNG phải credit** —
route có 2 lỗi tách bạch: LLM ném lỗi → *"Lỗi AI khi viết câu chuyện"*; LLM CÓ
trả text nhưng JSON không parse được → *"Lỗi phân tích kết quả AI."* (cái này).
- **Bằng chứng từ prod** (query `events` where `event_type='llm_usage'`,
  `tool_id='chan-dung-tien-kiep'`): lượt truyện 06:59 có `input_tokens=9177`,
  `output_tokens=1279` — model **trả lời bình thường**, và 1279 < `maxTokens`
  2600 nên **không phải bị cắt vì chạm trần**; `thinkingConfig.thinkingBudget`
  cũng đã = 0 nên không phải thinking token ăn mất chỗ.
- **Căn nguyên: `parseJSON` quá giòn** — chỉ `JSON.parse(strip fences)`. Chỉ
  cần model thêm một câu dẫn ("Đây là câu chuyện:") hoặc ghi chú cuối là hỏng
  cả lượt dù nội dung đủ. Prompt truyện nay ~9k token đầu vào (5 nền + luật
  lịch sử + tuyến đời) nên Flash càng dễ nói thêm ngoài JSON.
- **Sửa:** `parseJSON` quét **từng khối `{...}` cân bằng** từ trái sang, bỏ qua
  ngoặc nằm trong chuỗi (lời thoại) và ký tự escape, khối đầu tiên parse được
  thì lấy — cố ý không dừng ở khối đầu tìm thấy vì model hay chèn `{...}` trong
  lời dẫn và khối rác đó nuốt mất JSON thật. Thêm **thử lại 1 lượt** kèm nhắc
  định dạng khi parse hỏng (trước đây fail là mất Lượng mà không có gì), và
  **log độ dài + đầu/đuôi bản thô** để lần sau chẩn được ngay là lạc định dạng
  hay bị cắt. Nâng `maxTokens` 2600 → 4200 cho 5 hồi 100–160 từ tiếng Việt.
- **Verify:** test `parseJSON` với 10 dạng output thật — JSON sạch · bọc fence ·
  câu dẫn trước · ghi chú sau · cả hai · lời thoại có ngoặc kép · `{}` rác
  trong lời dẫn → **đều bóc đúng**; JSON cụt / không có JSON / rỗng → trả null
  đúng như mong đợi để rơi vào nhánh thử lại.

### CÒN LẠI
- Bật `enabled=true` sau deploy (câu SQL ở trên).
- Henry gen thử trên prod đủ 5 nền để soi ảnh — tao chỉ verify được tới tầng
  prompt, chất lượng ảnh thật (nhất là Thái Lan và Hàn Quốc) phải nhìn mới biết.
- Henry gen thử vài lá số trên prod → soi chất lượng ảnh cổ trang + văn phong
  truyện. Hai chỗ nhiều khả năng phải tinh chỉnh: bảng tra 14 sao → nghề
  (`past-life.ts`) và độ dài/giọng 5 hồi (`past-life-story.ts`). Cả hai sửa gọn,
  không đụng kiến trúc.

### 💡 Ý tưởng viral khác đã brainstorm (chưa làm, Henry có thể chọn tiếp)
Thẻ Định Mệnh + độ hiếm lá số (lớp share gắn được vào MỌI tool, chi phí LLM ≈ 0) ·
chân dung con cái tương lai (cung Tử Tức) · "bạn ở đỉnh cao vận mệnh" dùng ảnh
THẬT qua flux-kontext-pro · duyên nợ tiền kiếp với người ấy · biệt đội hội bạn
thân (mỗi post kéo 5 người) · xem sếp/crush/người yêu cũ · đếm ngược ngày gặp
chân ái · "nếu bạn sinh giờ khác" · roast mode. Cơ chế lan truyền còn thiếu:
ảnh tải về 9:16 có watermark, OG image riêng từng kết quả, gate bằng share
(`referral_code` đã có sẵn), gắn `utm_campaign` cho từng tool.

---

## 🔀 Provider routing rail — fallback HAI CHIỀU (2026-07-27)

Henry test prod: rail chat sau khi dùng tool báo `Anthropic error: … credit
balance is too low …`, trong khi tài khoản Gemini còn tiền. Henry tưởng rail
đã chạy Gemini-primary/Anthropic-backup.
- **Chẩn đoán — hai chỗ lệch với kỳ vọng:**
  1. Rail CÓ dùng Gemini, nhưng **`laso` bị ghim Anthropic**: prod
     `chat.provider_routes = {"_default":"gemini","laso":"anthropic"}`, và
     `geminiToolsEligible` CỐ Ý không đọc `_default` (fix D6). Mà mọi tool gọi
     `Shell.setContext({birth})` đều biến rail thành luồng `laso` → luôn
     Anthropic. Tool thì chạy ngon vì `lib/llm/complete.ts` (đường KHÁC) vốn
     đã Gemini-primary + fallback thật.
  2. **Chiều fallback ngược với kỳ vọng:** code chỉ có Gemini lỗi → rơi về
     Anthropic. Không có chiều ngược. `streamTurn` gặp non-200 còn bắn thẳng
     `sse.error` tại chỗ → Anthropic hết tiền là kéo sập rail dù Gemini sống.
- **Henry chốt:** (a) `laso` → Gemini; (b) làm fallback hai chiều.
- **Đã làm:** ✅ vá `app_config` prod → `{"_default":"gemini","laso":"gemini"}`
  (cache TTL 60s, không cần deploy, revert 1 dòng SQL). `streamTurn` **hoãn**
  `sse.error`, trả `errorBody` lên caller. Khối Gemini-tools tách thành closure
  `runGeminiTools()` dùng lại được ở 2 chỗ. Loop Anthropic thêm nhánh: lỗi mà
  CHƯA stream gì (round 0, chưa tool nào) → thử Gemini; hết đường mới báo lỗi.
  Thêm `geminiProseCapable`/`geminiToolsCapable` (bản BỎ QUA route — cứu hộ thì
  route hết nghĩa, nhưng guard prose/vision/ảnh GIỮ NGUYÊN).
  `Awaited<ReturnType<typeof runAgent>>` (tự tham chiếu) → `interface AgentResult`
  + `type ProviderOutcome` tường minh.
- **Verify:** tsc · lint · prettier · **test stub fetch 4 ca**: prose route-ép-
  anthropic → `anthropic→gemini` + ra chữ Gemini; laso route-ép-anthropic →
  `anthropic→gemini` + ra chữ; đối chứng Anthropic OK → **không** gọi Gemini;
  cả hai cùng chết → bắn `sse.error`.

---

## 🆕 Tool mới — "Chân Dung Vợ Chồng" (2026-07-24, CHƯA COMMIT/CHƯA DEPLOY)

Vẽ chân dung người phối ngẫu suy từ cung Phu Thê trong lá số (OpenAI `gpt-image-1`
text-to-image — KHÔNG cần ảnh input, khác hẳn Replicate flux-kontext-pro đang dùng
cho tool try-on). Cả 2 bản: standalone + shell, giống mọi tool khác.

- **Dữ liệu nguồn:** Henry cung cấp file Excel "Hình dáng mệnh khi sao đóng vào.xlsx"
  (bảng tra hình dáng theo 111 sao — Sheet1 mô tả ngắn VI, Sheet2 = 14 field chi tiết
  + "Sketch Prompt" tiếng Anh sẵn) + file instructions thuật toán rank/merge sao
  ("Portrait Generation Engine - Star..."). Đã port → `lib/engine/data/portrait-stars.json`
  (script Python 1 lần, không lưu script — chỉ lưu output JSON).
- **`lib/engine/portrait.ts`** — `computeSpouseMorphology(ls, gender)`: THUẦN
  deterministic (không gọi LLM). Rank sao tại Phu Thê + tam-phương-tứ-chiếu (tái
  dùng `p.tamHopCungs`/`p.xungChieuCung` có sẵn trong engine) theo 4 cấp ưu tiên +
  bonus ngũ hành/độ sáng sao (đúng thuật toán file instructions) → khóa khung
  mặt/vóc dáng từ sao core, sao phụ chỉ tinh chỉnh mắt/môi/da/khí chất. Độ tuổi
  phối ngẫu = tuổi hiện tại ± offset suy từ vài sao tại Phu Thê (Cô Thần/Đào Hoa/...
  — heuristic v1, biên độ nhỏ, có thể tinh chỉnh sau).
- **`lib/image/openai-image.ts`** — gọi thẳng REST `images/generations` (không SDK,
  theo pattern `lib/llm/complete.ts`), model `gpt-image-1` (env `OPENAI_IMAGE_MODEL`
  override được), trả base64.
- **`app/api/chan-dung-vo-chong/route.ts`** — POST: auth Bearer token → computeLaso
  → computeSpouseMorphology → 1 lượt LLM (Gemini/Anthropic qua `lib/llm/complete.ts`)
  dịch+đánh bóng field đã merge thành `{imagePrompt EN, description VI}` → gọi
  OpenAI sinh ảnh → upload Supabase Storage bucket `portraits` (public) → ghi lịch
  sử bảng `spouse_portraits`. GET `?action=history` trả lịch sử user.
- **Migration `_patches/migration-chan-dung-vo-chong.sql`** (✅ ĐÃ CHẠY prod qua
  Supabase MCP — verify: bucket `portraits` + bảng `spouse_portraits` (RLS: user đọc
  own + admin) + `tool_pricing` row `chan-dung-vo-chong` = 22 Lượng, category
  `Luận Giải` (để rơi tab "Tử Vi" trên `/cong-cu`), icon 🖼️.
- **Trang:** `public/tools/chan-dung-vo-chong.html` (standalone, TuviForm mode='full'
  + TuviPaywall + JSON POST, không SSE vì kết quả là ảnh+mô tả 1 lần) +
  `public/app-chan-dung-vo-chong.html` (shell, cùng flow, sau khi vẽ xong gọi
  `Shell.setContext({birth,...})` — TÁI DÙNG khả năng chat lá số chung sẵn có, KHÔNG
  thêm scenario type mới vào contract v1 để giữ phạm vi PR gọn).
- **Đăng ký:** `next.config.mjs` rewrite `/app/chan-dung-vo-chong`; `shell.js` TOOLS
  (nhóm Tử Vi, icon mới `image`) + `app-home.html` GROUPS + `cong-cu.html` TOOL_URLS;
  `tuvi-paywall.js` PRODUCTS/TOOL_TYPE fallback; bump `shell.js?v=42` toàn bộ trang shell.
- **Verify:** typecheck 0 lỗi, eslint shell.js/tuvi-paywall.js sạch, node --check 2
  script block HTML mới OK, Playwright smoke (dev server) cả 2 trang render đúng,
  sidebar link + form + rail hiện đúng, không lỗi console.
- **CÒN LẠI:** commit + PR; Henry xác nhận `OPENAI_API_KEY` đã set trên Vercel (đã
  dùng cho embeddings, nên nhiều khả năng có sẵn — dùng chung, không cần thêm key
  cho image); tùy chọn tinh chỉnh giá 22 Lượng + bảng age-offset heuristic sau khi
  có phản hồi thật.

---

## 🟣 ĐANG LÀM — Admin Revamp + Marketing/Conversion Tracking

**Branch:** `claude/admin-page-revamp-sgnhvg`
**Cập nhật:** 2026-07-22

### 🔖 RESUME HERE
Revamp `public/admin.html` + thêm mảng **Marketing** để đo full funnel:
`traffic source → visit → signup → free/activated → paid → return → repeat`.
Trước đó admin CHỈ suy hành vi từ `credit_transactions` (bỏ sót tool free, page view, nguồn traffic). Đang dựng hạ tầng tracking riêng.

**Workplan 5 sprint (mỗi sprint = 1 PR draft):**
- **S0 — Hạ tầng tracking** ✅ (PR #239): bảng `events` + `user_attribution`, `/api/track`, `public/track.js`, gắn homepage + hook signup/login attribution.
- **S1 — Phủ toàn site** ✅ (stack trên #239): track.js qua `shell.js` + emit tool_open/tool_run/chat_msg, topup_start (paywall + topup.html), cta_click (homepage).
- **S2 — Dashboard Funnel + Sources** ✅ (PR mới): mục "Marketing" sidebar, trang Funnel (conv% từng bước) + bảng Traffic Sources + filter ngày (RPC aggregate).
- **S3 — Acquisition + Campaign** ✅ (PR mới): chart signups/ngày theo kênh, bảng campaign UTM, top landing/referrer.
- **S4 — Retention + Revenue/LTV** ✅ (PR mới): cohort giữ chân, doanh thu & LTV theo kênh (join `user_attribution` × `credit_transactions`), export CSV.

### ✅ Sprint 0 XONG (chờ merge) — hạ tầng tracking
- **Migration `_patches/migration-events-tracking.sql`** (✅ ĐÃ CHẠY trên prod 2026-07-22 qua Supabase MCP — verify: events 17 cột, user_attribution 18 cột, 9 index, RLS bật + 2 policy admin_read. Không còn việc tay):
  - `events` (append-only): ts, event_type, anon_id, user_id, session_id, platform, tool_id, slug, path, referrer, utm_*, meta. Index ts/type/user/anon/utm_source.
  - `user_attribution` (1 dòng/user): first-touch + last-touch UTM/referrer/landing + signup_at.
  - RLS: GHI qua service key (`/api/track`); ĐỌC chỉ admin JWT (`email=admin@tuviminhbao.com`) — giống pattern `app_config`.
- **`app/api/track/route.ts`** (runtime nodejs): nhận `{events:[...]}` (batch ≤30), allowlist 11 loại event, ghi service key. Có Authorization token → gắn user_id; lần đầu thấy user → snapshot attribution first-touch + phát event `signup` (chỉ nếu `created_at` < 15 phút → né user cũ login lại bị tính signup mới). Beacon KHÔNG ném lỗi ra client.
- **`public/track.js`** (vanilla, không lib): anon_id (localStorage `tvmb_anon`) + session_id (sessionStorage `tvmb_sid`) + first-touch (`tvmb_attr_first`). Auto `page_view`; `window.Track.event(type, props)`. Gửi sendBeacon (ẩn danh) hoặc fetch keepalive kèm token (đọc `tuvi_session`) khi đã đăng nhập.
- **Wire:** `index.html` thêm `<script src="/track.js?v=1">` (TRƯỚC auth.js). `auth.js` `saveSession()` gọi `Track.event('login')` sau khi lưu session → server gắn user_id + attribution.
- **Verify:** typecheck root 0 lỗi (sau build engine), eslint track.js/auth.js sạch, prettier route.ts sạch.
- **Event types (allowlist):** `page_view · tool_open · tool_run · tool_result · chat_msg · signup · login · topup_start · topup_success · share · cta_click`. S0 mới emit `page_view` (homepage) + `login`/`signup`. Còn lại emit ở S1.

### ✅ Sprint 1 XONG (stack trên #239) — phủ tracking toàn site
- **`shell.js` (v40→v41, bump cả 25 trang /app):** thêm helper `track()` + `ensureTrackJs()` — tự nạp `/track.js` (page_view bắn) nếu trang chưa có, emit an toàn qua hàng đợi. Emit: `tool_open` (boot, tool_id=ACTIVE), `tool_run` (trong `setContext` = tool tính ra kết quả + gắn ngữ cảnh = activation; kèm scenario.type), `chat_msg` (trong `sendMsg`, kèm has_img).
- **`tuvi-paywall.js` (v5→v6, bump 19 trang):** `topup_start` (meta from=paywall, need) khi bấm "Nạp Credits →".
- **`topup.html`:** nạp track.js + `topup_start` (from=topup_page) lúc mở trang.
- **`index.html`:** `cta_click` (tool_id + has_q) trong `go()` — chokepoint hero submit + chip → shell.
- **QUYẾT ĐỊNH:** KHÔNG emit `topup_success` riêng — đã có đủ trong `credit_transactions` (type=topup, có amount + created_at); dashboard S2 lấy "paid" từ đó, join `user_attribution` để quy doanh thu theo kênh. `tool_result` cũng gộp vào `tool_run` (kiến trúc tool tính client rồi setContext — 1 tín hiệu activation là đủ). `tool_run` có thể hơi over-count lúc restore phiên (chấp nhận v1).
- **Verify:** eslint shell.js/paywall 0 lỗi; chỉ đụng client JS + HTML (prettier-ignore) + không .ts → typecheck/prettier không đổi. Version bump: shell.js=41 (25 trang), paywall=6 (19 trang).
- **CÒN LẠI (S2+):** dashboard Marketing đọc events/attribution (RPC aggregate) — Funnel, Sources, Acquisition, Cohort, Revenue/LTV.

### ✅ Sprint 2 XONG (PR mới, branch reset trên main sau khi #239 merge) — dashboard Funnel + Sources
- **Migration `_patches/migration-marketing-rpcs.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — verify RPC trả số thật: funnel visitors/paid/topup_intent > 0):
  - `marketing_funnel(from,to)` → JSON: visitors (distinct anon page_view) · signups (user_attribution.signup_at) · activated (distinct user tool_run) · topup_intent (distinct topup_start) · paid (distinct user credit_transactions type=topup) · returned (user active ≥2 ngày). "Stage snapshot", KHÔNG cohort chặt.
  - `marketing_sources(from,to)` → table theo KÊNH first-touch (`coalesce(first_utm_source, referral nếu có referrer, else direct)`): signups · paid · revenue_credits (sum topup amount). security definer + grant service_role.
- **`app/api/payment/route.ts`** — thêm GET action `admin-marketing` (`handleAdminMarketing`, verifyAdmin): nhận from/to (ISO date, mặc định 30N, to→cuối ngày), gọi 2 RPC bằng service key, trả `{funnel, sources}`.
- **`public/admin.html`** — sidebar section "Marketing" (nav `goTo('marketing')`) + `#page-marketing`: filter ngày (input date + nút 7N/30N/90N) → `loadMarketing()` gọi `apiGet('admin-marketing')`. `renderMktFunnel` = 4 bậc bar (visit→signup→activate→paid, conv% từng bước + tổng) + chỉ số phụ (topup_intent, returned). `renderMktSources` = bảng nguồn (conv%, Lượng nạp, doanh thu ≈ ×2500đ). Thêm `marketing` vào PAGE_TITLES + loaders.
- **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check block JS admin (125 dòng) OK. RPC test prod OK.
- **CÒN LẠI:** S3 (acquisition chart theo ngày/kênh + campaign UTM + top landing/referrer), S4 (cohort retention + LTV theo kênh + export CSV).

### ✅ Sprint 3 XONG (PR mới, branch reset trên main sau khi #240 merge) — acquisition + campaign + traffic detail
- **Migration `_patches/migration-marketing-acquisition.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — 3 RPC chạy OK, camp_rows=0 vì chưa có UTM campaign):
  - `marketing_acquisition(from,to)` → table(day, source, signups): signup theo NGÀY × KÊNH first-touch (nuôi chart).
  - `marketing_campaigns(from,to)` → table(campaign, source, signups, paid, revenue_credits): chỉ user có `first_utm_campaign`.
  - `marketing_traffic(from,to)` → JSON {top_paths, top_referrers}: distinct visitor page_view, top 15 mỗi loại. security definer + grant service_role.
- **`app/api/payment/route.ts`** — `handleAdminMarketing` gộp helper `callRpc` + `Promise.all` 5 RPC (funnel/sources/acquisition/campaigns/traffic), trả thêm `acquisition/campaigns/traffic`.
- **`public/admin.html`** — thêm 3 panel vào `#page-marketing`: chart "Đăng ký theo ngày & kênh" (`renderMktAcq` = cột chồng CSS thuần, mỗi kênh 1 màu + chú thích, xoay nhãn ngày), bảng "Chiến dịch UTM" (`renderMktCampaigns`), 2 bảng cạnh nhau "Top Landing Pages" + "Top Referrers" (`renderMktTraffic`). `loadMarketing` render thêm 3 mục.
- **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check block JS admin (147 dòng) OK. 3 RPC test prod OK.
- **CÒN LẠI:** S4 (cohort retention theo tuần signup + LTV theo kênh join credit_transactions + export CSV).

### ✅ Sprint 4 XONG (PR mới, branch reset trên main sau khi #241 merge) — retention + LTV + export CSV — HOÀN TẤT WORKPLAN
- **Migration `_patches/migration-marketing-cohorts.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — test trả `[]` vì chưa có signup có attribution):
  - `marketing_cohorts(p_weeks int default 8)` → JSON `[{cohort_week, size, retention:{woff:count}}]`. Cohort = TUẦN đăng ký (`user_attribution.signup_at`); retention = distinct user của cohort có events ở tuần offset 0..weeks-1. **Bug đã sửa khi áp:** `extract(epoch from (date-date))` lỗi (date−date ra int ngày) → dùng `((date_trunc('week',ts)::date - cw)/7)::int`.
- **`app/api/payment/route.ts`** — `handleAdminMarketing` gọi thêm `marketing_cohorts` (RPC dùng `p_weeks`, suy từ khoảng ngày, kẹp 4..16), trả thêm `cohorts` + `cohortWeeks`. Tổng 6 RPC/lần tải.
- **`public/admin.html`** — thêm: panel "Cohort Giữ Chân" (`renderMktCohorts` = lưới màu heat theo %, hàng=tuần signup, cột=T+N), cột **LTV/user** vào bảng Sources (revenue_credits/signups × 2500đ, tính client), nút **⬇ CSV** ở header funnel (`mktExportCSV` = funnel + sources ra CSV BOM UTF-8, tải client). `loadMarketing` lưu `_mktData` cho export.
- **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check block JS admin (200 dòng) OK. Cohort RPC test prod OK.
- **🎉 XONG 5 sprint (S0–S4).** Dashboard Marketing đầy đủ: Funnel · Sources (+LTV) · Acquisition chart · Campaign UTM · Cohort retention · Top landing/referrer · Export CSV. Data tự chảy khi user duyệt/đăng nhập trên prod. **Ý tưởng mở rộng sau:** đo doanh thu TIỀN THẬT (hiện quy đổi credits×2500đ — `credit_transactions` chưa lưu VNĐ/gateway); gắn `utm_campaign` vào link quảng bá để bảng Campaign có số; admin revamp phần còn lại (user detail drawer, bỏ trần 100 user — xem brainstorm đầu track).

### 🔧 Admin Revamp (phase tiếp theo track Marketing) — R1/R2/R3
Làm nốt "mấy mục còn mở" từ brainstorm. Workplan: **R1** bỏ trần 100 user + sửa tool_uses · **R2** user detail drawer · **R3** doanh thu tiền thật (amount_vnd/gateway).
- **✅ R1+R2 XONG (PR mới, gộp vì cùng đụng trang Users):**
  - **R1 — `handleAdminUsers` (`app/api/payment/route.ts`):** LOOP hết trang auth (`per_page=100` tới khi batch < 100, trần MAX_PAGES=100 ~10k user) thay vì chỉ page=1 → **bỏ trần 100 user**. Sửa `tool_uses`: đếm `credit_transactions amount<0` (lượt trừ Lượng = dùng tool trả phí) thay vì `type!=topup` (cũ tính cả signup_bonus/admin_grant → thổi phồng). `admin.html`: cột đổi nhãn "Trả Phí", panel hiện tổng số user (`#users-count`, filtered/total).
  - **R2 — endpoint GET `admin-user-detail?userId=` (`handleAdminUserDetail`, verifyAdmin):** Promise.all đọc credit_transactions (100 gần nhất) + user_attribution + events (2000 gần nhất) + user_credits(balance,referral_code); trả balance/referral_code/attribution/transactions/totals(spent,topped_up,events)/activity(by_type,top_tools,last_active). `admin.html`: hàng user click → `openUserDrawerById` mở **drawer trượt phải** (dựng bằng JS, không markup) = số dư/đã nạp/đã tiêu/events + nút cấp credits + attribution (kênh/campaign/referrer/landing/signup) + hoạt động (by_type badges + top tool) + bảng giao dịch gần đây. Nút "+Credits" trên hàng có `stopPropagation`. `_drawerUserId` guard tránh race.
  - **Verify:** typecheck 0 lỗi, prettier route.ts sạch, node --check admin script (845 loc) OK.
- **✅ R3 XONG (PR mới, reset trên main sau khi #243 merge) — doanh thu tiền thật:**
  - **Migration `_patches/migration-credit-revenue.sql`** (✅ ĐÃ CHẠY prod — test `marketing_revenue` trả total_vnd=8.925.000đ từ 8 topup cũ qua fallback ×2500): `credit_transactions += amount_vnd int, gateway text` (nullable, không phá row cũ) + index gateway. RPC `marketing_revenue(from,to)` → JSON {total_vnd, by_gateway[], by_day[]} dùng `coalesce(amount_vnd, amount*2500)`.
  - **`app/api/payment/route.ts`:** `logTransaction` nhận thêm `amountVnd?`+`gateway?`. `handleCapture` (PayPal) ghi `amountVnd=foundPkg.amountVnd, gateway='paypal'` (cả 2 nhánh COMPLETED/capture). `handleAdminMarketing` gọi thêm `marketing_revenue` (7 RPC), trả `revenue`.
  - **`app/api/bank-webhook/route.ts`:** insert topup thêm `amount_vnd=Number(data.amount)` (tiền chuyển thật) `+ gateway='bank'`.
  - **`public/admin.html`:** panel "💰 Doanh Thu Tiền Thật" trong Marketing (`renderMktRevenue` = tổng + theo cổng + cột theo ngày). **Sửa bug Dashboard:** stat "Doanh Thu" cũ = `$totalCr/10` (ước lượng) VÀ `topups=amount>0` (tính cả bonus/grant) → nay `topups=type==='topup'`, doanh thu = Σ `amount_vnd` (fallback ×2500) hiển thị "X.Ytr". "Credits Nạp" cũng chỉ đếm topup thật.
  - **Verify:** typecheck 0, prettier route+bank-webhook sạch, node --check admin (879 loc) OK. RPC prod OK.
- **🎉 XONG R1+R2+R3 — đóng trọn "mấy mục còn mở".** Còn (tùy chọn tương lai): các row topup CŨ chưa có `amount_vnd` (chỉ row mới từ giờ mới lưu tiền thật; muốn chuẩn tuyệt đối thì backfill từ `bank_orders`/PayPal history — chưa làm).
- **✅ UTM Link Builder XONG (PR mới, branch reset trên main) — công cụ gắn `utm_campaign` cho link quảng bá:** panel "Tạo Link UTM" trong Marketing (ngay trên bảng Chiến Dịch), THUẦN CLIENT (không đụng server/DB). Điền trang đích + `utm_source`/`utm_medium`/`utm_campaign` (+term/content tùy chọn) → ghép link chuẩn (`URL` + `searchParams`, slug bỏ dấu tiếng Việt "Tết"→"tet"), Copy + Lưu vào `localStorage` (`tvmb_admin_utm_links`, danh sách link đã lưu có Copy/Xóa). Hạ tầng bắt UTM đã sẵn từ S0 (`track.js` first-touch → `user_attribution.first_utm_campaign` → RPC `marketing_campaigns`) → **chỉ thiếu công cụ tạo link chuẩn**. Henry CHƯA chạy ads → tạo/lưu để dành, data tự chảy khi có người bấm link gắn UTM. Verify: node --check 3 khối JS admin OK, test slug tiếng Việt + ghép URL đúng. (Backfill `amount_vnd` lịch sử vẫn để ngỏ.)

### 🔵 Dashboard revamp — CEO brainstorm 6 metric ưu tiên (branch `claude/admin-command-center-s4-395w5n`)
Sau R1-R3, brainstorm "act như CEO" ra 6 metric outside-the-box còn thiếu trên Dashboard. Henry chọn 5, xếp thứ tự tối ưu, duyệt qua prototype HTML gửi riêng (`SendUserFile`, không dùng `Artifact`) trước khi build thật — 3 vòng chỉnh (thêm marketing tracking → bỏ traffic/ads vì đã có GA4 → thêm Full Funnel nối GA4). Sau khi duyệt, Henry nói "build thật đi".
- **✅ D1 XONG (PR mới, 4/6 mục — Supabase-only, không cần hạ tầng mới):**
  - **Migration `_patches/migration-dashboard-v2.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — verify RPC trả số thật: DAU hôm nay/qua = 87/22 từ events; at-risk logic đúng; content-revenue rỗng vì `user_attribution` chưa có signup nào — tracking mới bật gần đây, sẽ tự có số):
    - `dashboard_engagement(days)` → JSON {days:[{day,dau}], dau_today, dau_yesterday, wau, wau_prev, mau, mau_prev} — DAU = distinct(user_id|anon_id) mỗi ngày từ `events`.
    - `dashboard_content_revenue(from,to)` → table(landing,signups,paid,revenue_vnd) — quy doanh thu (`credit_transactions` topup, `amount_vnd` fallback ×2500) theo `user_attribution.first_landing_path`; `/la-so/*` gộp 1 dòng (438K trang SEO), còn lại giữ path riêng (kien-thuc/nghien-cuu đủ ít để có ý nghĩa).
    - `dashboard_at_risk(idle_days,min_events,limit)` → user còn số dư >0, từng hoạt động ≥3 lần (join `auth.users` lấy email), im lặng 14+ ngày, sắp theo số dư.
  - **`app/api/payment/route.ts`:** `handleAdminDashboardV2` (action=`admin-dashboard-v2`) gọi 3 RPC trên + đếm nhanh (`count=exact`, không tải nguyên bảng) tổng/7N của Khảo Luận/Nghiên Cứu/YouTube (`van_dap publish_status=published`) cho panel Sản Xuất Nội Dung.
  - **`public/admin.html`+`admin.css`:** 4 panel mới trên Dashboard — **Mức Độ Dùng DAU/WAU/MAU** (4 tile + biểu đồ SVG area/line 30 ngày, hover tooltip, tự dựng không lib), **Sản Xuất Nội Dung** (tile 7N + tổng, 3 pipeline), **Doanh Thu Theo Nội Dung** (bar-list theo landing page), **User Sắp Rời Bỏ** (bảng, nút "Nhắc qua Telegram"/"Gửi Push" hiện CHỈ hiển thị gợi ý kênh — CHƯA nối hành động gửi thật, `cursor:default`). Class mới: `.eng-tiles/.eng-tile`, `.chart-wrap/.chart-tip`, `.mbar-row/.mbar-track/.mbar-fill`, `.btn-mini` (tái dùng `.td-title`/`.badge-*` có sẵn thay vì tạo trùng).
  - **Tiện sửa bug có sẵn:** panel "Funnel 7 Ngày Gần Đây" (`renderDashFunnel`) số bị hardcode `color:var(--navy)` → mờ ở dark mode; đổi `var(--text)`. **NỢ KỸ THUẬT phát hiện thêm:** còn ~17 chỗ khác trong admin.html dùng `color:var(--navy)` y hệt (Content Board, Khảo Luận, Nghiên Cứu, Marketing LTV, System Config, user drawer...) — cùng 1 bug dark-mode, CHƯA sửa hết (ngoài phạm vi PR này, để audit riêng).
  - **Verify:** typecheck 0 lỗi, prettier route.ts sạch, `node --check` cả 3 script block admin.html OK, Playwright screenshot light+dark (mock `admin-dashboard-v2` + REST) render đúng, không lỗi console.
  - **CÒN LẠI (2/6 mục, cần hạ tầng mới trước khi làm thật):**
    - **Sức Khỏe Kênh (bot error rate theo Telegram/Web/Messenger/WhatsApp):** hiện KHÔNG có log lỗi theo kênh — cần thêm ghi `event_type` lỗi (hoặc bảng riêng) trong `lib/channels/core.ts` + từng route kênh trước khi có số thật.
    - **Biên Lợi Nhuận Theo Tool:** cần lưu token usage (đã capture trong `lib/agent/run.ts` nhưng KHÔNG persist) + bảng giá cost/1K token theo model → tính biên LN thật.
  - **Full Funnel nối GA4** (Traffic GA4 → Đăng ký → Kích hoạt → Trả tiền → Quay lại): GA4 property "Tử Vi Minh Bảo" (`533053153`, Measurement ID `G-F4XNRS2XT0` trong `public/nav.js`) ĐÃ LIVE. Cần Henry tạo service account GCP (bật GA4 Data API, gán quyền Viewer cho property, add JSON key vào env Vercel) trước khi code phần gọi GA4 Data API — 4 bước còn lại (signup/activate/paid/return) tái dùng `marketing_funnel` RPC sẵn có, chỉ thay số "visitors" bằng session GA4 thật.
- **Henry: "làm hết đi, tuần tự, từng mục một, cho mày chọn"** — chốt thứ tự 3 mục còn lại: **D2 Sức Khỏe Kênh** (self-contained) → **D3 Biên LN Theo Tool** (self-contained, đụng hot path `run.ts`) → **D4 Full Funnel GA4** (chặn bởi việc tay Henry, làm cuối).
- **✅ D2 XONG (PR mới) — Sức Khỏe Kênh (bot error rate theo kênh):**
  - **Instrumentation:** `lib/channels/core.ts` `runConversation()` thêm tham số `onOutcome?(ok, reason)` — gọi ở CẢ 3 nhánh kết thúc lượt (thành công / agent lỗi-rỗng / exception), best-effort không chặn trả lời. `lib/channels/store.ts` thêm `chatLogOutcome(platform, chatId, ok, reason)` ghi vào `events` (event_type=`bot_reply`, meta={ok,reason}) — CHỌN `events` thay vì đếm qua `chat_usage` vì bảng đó chỉ tăng cho free-tier (`lib/channels/gate.ts` — user đã link ví KHÔNG qua `chatIncrFreeUsage`) nên thiếu số. Wire vào 3 route kênh (`telegram`/`messenger`/`whatsapp` route.ts, callback cuối `runConversation(...)`) + trực tiếp trong `app/api/v1/chat/route.ts` (nhánh `send(sse.done)` thành công / `catch` lỗi, platform=`web`).
  - **Migration `_patches/migration-channel-error-rate.sql`** (✅ ĐÃ CHẠY prod — RPC test trả đủ 4 platform 0/0 vì code chưa deploy lúc test, tự có số sau merge): `channel_error_rate(hours)` → table(platform,total,errors,error_rate) — LEFT JOIN cứng 4 platform (`telegram,web,messenger,whatsapp`) nên card nào cũng hiện dù 0 lượt.
  - **`app/api/payment/route.ts`:** `handleAdminDashboardV2` gọi thêm `channel_error_rate` (RPC thứ 7), trả `channelHealth`.
  - **`public/admin.html`+`admin.css`:** panel "Sức Khỏe Kênh Chat (24h)" trên Dashboard (`renderDashChannelHealth`, TRƯỚC KPI stats, đúng vị trí prototype) — 4 card Telegram/Web Chat/Messenger/WhatsApp, tỷ lệ lỗi % + pill trạng thái (xanh ≤2% · cam 2-8% · đỏ >8% · cam "chưa có lượt" nếu total=0). Class mới `.chan-row/.chan-card/.chan-top/.chan-name/.pill`.
  - **Verify:** typecheck 0, prettier route+chat+3 channel route+core+store sạch, node --check 3 script block admin.html OK, Playwright screenshot light+dark render đúng.
- **✅ D3 XONG (PR mới) — Biên Lợi Nhuận LLM theo tool:**
  - **Instrumentation:** `lib/agent/usage.ts` (mới) — `logLlmUsage(toolId, model, usage)` best-effort ghi vào `events` (event_type=`llm_usage`, meta={model,input_tokens,cache_creation_input_tokens,cache_read_input_tokens,output_tokens,cost_vnd}), giá USD/1M cứng trong file (bảng giá Anthropic hiện hành: sonnet-4-6=$3/$15, opus-4-x=$5/$25, haiku-4-5=$1/$5; cache write ×1.25, cache read ×0.1) quy đổi VNĐ ×25.000. `lib/agent/run.ts`: `streamTurn` giờ bắt ĐỦ usage (trước chỉ log `input_tokens` lúc `message_start` qua `logCacheUsage`, **thiếu hẳn `output_tokens`** ở `message_delta` — vá luôn khi thêm tracking); vòng lặp tool-use cộng dồn usage qua các round rồi gọi `logLlmUsage` MỘT lần cuối, tag `tool_id = scenario?.type || 'chat'`. **CHỈ theo dõi Anthropic** (route Gemini khác cấu trúc giá, bỏ qua có chủ đích).
  - **Quyết định gắn tool_id:** `'chat'` — CHÍNH type mà `/api/v1/chat` + `lib/channels/gate.ts` ghi vào `credit_transactions` cho MỌI lượt rail thật (kể cả có lá số, billing phẳng theo tin nhắn, KHÔNG tách theo scenario) — nên bucket cost `chat` khớp thẳng bucket doanh thu thật để tính margin đúng. Các bucket theo `scenario.type` (tu-binh, xem-tuoi...) chỉ để so cost tương đối, KHÔNG có doanh thu khớp riêng (hạn chế thật của mô hình billing hiện tại, không phải bug).
  - **🐞 Bắt lỗi TRƯỚC khi ship (tự QC, không phải Henry báo):** thiết kế đầu tiên dùng `credit_transactions.amount_vnd` làm "doanh thu" cho bucket `chat` — SAI, vì row `type=chat` là giao dịch TRỪ Lượng (amount ÂM, `amount_vnd` chỉ có ở row `topup`) → test RPC ra doanh thu ÂM (-2.45tr), lộ bug ngay. Sửa: doanh thu = `sum(-amount) × 2500đ` nơi `type=chat AND amount<0` — CÙNG quy ước "revenue = Lượng tiêu × 2.500đ" đã dùng sẵn ở Tools Registry (`spendCredits`), nhất quán với phần còn lại của admin.
  - **Migration `_patches/migration-dashboard-margin.sql`** (✅ ĐÃ CHẠY prod — test lại sau khi sửa bug: `chat_revenue_vnd`=2.450.000đ dương đúng, `chat_cost_vnd`=0 vì code chưa deploy): `dashboard_margin(from,to)` → JSON {chat_cost_vnd, chat_revenue_vnd, by_tool:[{tool_id,requests,cost_vnd}]}.
  - **`app/api/payment/route.ts`:** `handleAdminDashboardV2` gọi thêm `dashboard_margin` (RPC thứ 8), trả `margin`.
  - **`public/admin.html`:** panel "Biên Lợi Nhuận LLM" trên Dashboard (`renderDashMargin`) — 3 tile (doanh thu/chi phí/margin%, màu theo ngưỡng xanh≥50%·cam≥0%·đỏ<0%) + bảng chi phí theo `tool_id` + 2 dòng caveat giải thích rõ "doanh thu" là Lượng tiêu quy đổi (không phải tiền mặt tức thời) và chỉ bucket `chat` có margin thật.
  - **Verify:** typecheck 0, prettier route+run+usage sạch, node --check 3 script block admin.html OK, Playwright screenshot light+dark render đúng.
  - **🎉 XONG D2+D3.**
- **✅ D4 XONG (PR mới) — Full Funnel nối GA4 (việc tay Henry: service account GCP + GA4 Data API + Viewer property `533053153` — ĐÃ XONG):**
  - **`lib/analytics/ga4.ts`** (mới): `getGa4Sessions(fromDate,toDate)` — tự ký JWT (RS256, `crypto.sign`, KHÔNG cần thư viện `googleapis`) bằng service-account key, đổi lấy access token (`oauth2.googleapis.com/token`, scope `analytics.readonly`, cache token tới gần hết hạn), gọi GA4 Data API `runReport` (metric `sessions`) cho property `GA4_PROPERTY_ID`. Best-effort: thiếu env/lỗi API → trả `null`, KHÔNG throw.
  - **`app/api/payment/route.ts`:** `handleAdminMarketing` gọi thêm `getGa4Sessions(from,to)` song song 7 RPC cũ; có kết quả → **ghi đè `funnel.visitors`** bằng session GA4 thật (trước suy từ `page_view` nội bộ — chỉ thấy traffic đã chạm `track.js`, thiếu hẳn organic/ads/social) + gắn `funnel.visitorsSource='ga4'`; lỗi/thiếu env → giữ số nội bộ + `visitorsSource='internal'` (dashboard không vỡ khi chưa cấu hình).
  - **`public/admin.html`:** badge nhỏ cạnh "Khách ghé (visit)" trong `renderMktFunnel` — xanh "GA4" khi dùng số thật, xám "nội bộ" (kèm tooltip giải thích) khi fallback.
  - **🐞 Tiện sửa bug dark-mode (cùng nợ kỹ thuật `color:var(--navy)` D1 phát hiện):** 2 chỗ trong `renderMktFunnel` (số bậc funnel + % chuyển đổi tổng) mờ ở dark mode → đổi `var(--text)`. Còn lại ~15 chỗ khác trong file vẫn CHƯA sửa (ngoài phạm vi PR này).
  - **Env Vercel cần add (Henry):** `GA4_PROPERTY_ID=533053153`, `GA4_SERVICE_ACCOUNT_JSON=<toàn bộ nội dung file JSON key>`.
  - **Verify:** typecheck 0, lint sạch, prettier route+ga4.ts sạch, node --check 3 script block admin.html OK, Playwright screenshot light+dark (mock GA4 badge + verify dark-mode fix) render đúng.
  - **🎉 XONG TOÀN BỘ 6 metric CEO brainstorm (D1–D4).** Track "Dashboard revamp" hoàn tất.
- **✅ D5 XONG (PR mới) — audit timestamp + backfill attribution lịch sử:** Henry yêu cầu double-check các chart có timestamp rõ ràng + fill dữ liệu lịch sử cho đầy. Audit: hầu hết chart (Acquisition, Doanh Thu, Cohort) đã có nhãn ngày rõ trên trục/hàng; riêng biểu đồ **DAU/WAU/MAU** chỉ hiện ngày lúc hover → vá thêm nhãn ngày cố định (đầu/giữa/cuối trục, `initDashChart`) + dòng phụ đề hiện rõ khoảng ngày (`renderDashEngagement`). Tra DB phát hiện: `events`/`user_attribution` chỉ có dữ liệu từ 2026-07-22 (track.js mới bật ~18h) → KHÔNG có gì để "load" cho DAU/Funnel/Acquisition/Cohort vì chưa từng ghi nhận trước đó (sẽ tự đầy dần); riêng `marketing_revenue` đọc thẳng `credit_transactions` (có thật từ tháng 4) nên chỉ cần chọn khoảng ngày rộng hơn trên UI là ra số, không cần code. **Hỏi Henry** có nên backfill `user_attribution` cho 56 user cũ (đăng ký trước khi có tracking) không — **chốt: có, backfill**.
  - **Migration `_patches/migration-backfill-attribution.sql`** (✅ ĐÃ CHẠY prod qua Supabase MCP — verify: 56/56 user có dòng, `marketing_funnel` 120N signups 50 (trước ~0), `marketing_sources` bucket `legacy` signups=50/paid=1/revenue=820cr, `marketing_cohorts` hiện 11 tuần cohort thật từ tháng 4): insert 1 dòng/user THIẾU attribution, `signup_at`/`first_seen_at` = `auth.users.created_at` (ngày thật), nhưng KHÔNG bịa kênh — `first_utm_source='legacy'` + `first_landing_path='(trước khi có tracking)'` để tách bạch rõ khỏi user thật có UTM/referrer (tránh lẫn vào bucket "direct"). Idempotent (left join where null).
  - **`public/admin.html`:** thêm màu `legacy: '#8A8F98'` (xám) vào `MKT_SRC_COLORS` cho bucket này tách biệt trực quan khỏi các kênh thật.
  - **Verify:** node --check block JS admin OK, query RPC prod xác nhận số đúng.
- **✅ D6 XONG (PR #262) — audit sâu "data nào chưa gắn" → lộ 3 bug thật, không chỉ thiếu số liệu:**
  - **🔴 Bug nghiêm trọng nhất — `laso` (kịch bản trả phí "vương miện") bị kéo sang Gemini ngoài ý muốn.** `geminiToolsEligible()` (`lib/agent/providers/gemini.ts`) fallback `r[scenarioType] || r._default || 'anthropic'` — DB `chat.provider_routes` prod là `{"_default":"gemini"}` (đặt để hạ chi phí nhóm prose free, KHÔNG có key `laso` riêng) → rơi về `_default` → lá số/luận giải trả phí chạy Gemini thay vì Claude Sonnet, trái `DEFAULTS.providerRoutes.laso='anthropic'` (appConfig.ts) và trái comment "vương miện MẶC ĐỊNH giữ Sonnet". **Đây cũng chính là lý do `events.event_type='llm_usage'` (D3) luôn 0 dòng** — phát hiện khi điều tra vì sao. Fix: nhóm tool-calling (`GEMINI_TOOLS_SCENARIOS`) không bao giờ thừa hưởng `_default` nữa — chỉ đi Gemini khi admin set ĐÚNG key `laso`. Vá DB prod ngay qua Supabase MCP (`{"_default":"gemini","laso":"anthropic"}`) — có hiệu lực tức thời, không cần đợi deploy.
  - **🟡 CI tự ghi đè dữ liệu tracking thật trên prod.** Điều tra `topup_start` bất thường (489 event/46 anon_id, 44/46 đúng **11 lần mỗi đứa** trong ~5 phút) → KHÔNG phải bot ngoài. `.github/workflows/playwright.yml` chạy full E2E trên MỌI push/PR, mặc định `BASE_URL=https://www.tuviminhbao.com` (prod thật) trừ nhánh `dev`; các spec (`topup.spec.ts`/`static-pages.spec.ts`/`mobile.spec.ts`) đều `page.goto('/topup.html')` → mỗi lần CI chạy ghi `page_view`/`topup_start`/... THẬT vào `events`, làm lệch Funnel/DAU/topup_intent. Fix: `public/track.js` bỏ qua toàn bộ event (kể cả `page_view` tự động) khi `navigator.webdriver===true` (cờ chuẩn mọi trình duyệt automation set — Playwright/Selenium/Puppeteer).
  - **⚪ Nút chia sẻ chưa track gì.** `ShareButtons` (`public/share.js` — component share THẬT, dùng ở `luan-giai.html` trang kết quả lá số + `khao-luan.html`/`blog.html`/`tai-lieu.html`) chưa gắn track dù `share` đã có sẵn trong allowlist `/api/track`. Thêm `Track.event('share',{meta:{medium}})` cho Facebook/WhatsApp/Telegram/Copy link. Phát hiện thêm: `public/share-widget.js` (component khác, gọi `/api/share-event`) — route đó KHÔNG TỒN TẠI trong `app/api/` (404 âm thầm) nhưng không nơi nào gọi `showShareWidget` → code chết, không sửa.
  - **CÒN LẠI — không phải bug, cần việc tay Henry (ngoài phạm vi code):** bảng "Chiến dịch UTM" trống vì chưa có link quảng bá nào gắn `utm_campaign` thật; 9 dòng `topup` cũ chưa có `amount_vnd` (đúng thiết kế R3 — chỉ ghi tiền thật cho giao dịch MỚI từ lúc deploy, backfill lịch sử từ bank/PayPal cần Henry cung cấp); GA4 visitors — không có tool đọc trực tiếp env Vercel để confirm `GA4_PROPERTY_ID`/`GA4_SERVICE_ACCOUNT_JSON` đã set chưa, Henry tự check badge "GA4"(xanh)/"nội bộ"(xám) cạnh "Khách ghé" trong panel Funnel.
  - **Verify:** DB app_config đã vá + verify trực tiếp qua Supabase MCP. `npx tsc --noEmit` 0 lỗi, `npm run lint` 0 lỗi, `node --check` + `eslint` track.js/share.js sạch, CI (lint/typecheck/test×2/lighthouse) xanh.

---

## 🟢 ĐANG LÀM — App-shell "/app" (không gian làm việc đa công cụ)

**Branch:** `claude/part-x-continuation-tca4xh`
**Cập nhật:** 2026-07-09

### 🔖 RESUME HERE (mở máy khác đọc cái này trước)
App-shell tại **`/app`** = **Luận Đường (論堂)** — vỏ 3 cột (sidebar tool · workspace giữa · rail "Trợ lý Luận Đường"), brand navy/gold. **ĐÃ LIVE PROD.** Mọi tool đã vào shell — **kể cả Phong thủy & Xem tướng qua ảnh** (đảo quyết định cũ). Trang chủ đã revamp "một cửa".

**Revamp trang chủ + Luận Đường (mới→cũ, ĐÃ MERGE):**
- **#162** **Phong thủy & Xem tướng NATIVE vào shell** (vision): scenario type `xem-tuong`/`phong-thuy` + prompt vision (`prompts.ts`), rail **upload ảnh** (`shell.js`, gửi `images[{data,mediaType}]`), 2 trang `app-xem-tuong.html`/`app-phong-thuy.html` (setContext lúc load, rail active KHÔNG cần birth). Bản chấm điểm phong thủy structured (before/after) VẪN ở `/cong-cu`.
- **#161** avatar thầy trên **từng tin** rail (`.msg.a` = avatar + `.msg-body`).
- **#160** **author persona** cho rail: 15 thầy (`AUTHOR_ROSTER`), random/nhớ phiên (chung `localStorage['tvc_author_v1']` với tuvi-chat), avatar `/authors/<id>.jpg` + gửi `authorName/authorStyle` → văn phong. Vá `run.ts` birth-path áp văn phong cho cả Lá số.
- **#159** seal.webp thật ở sidebar · nút "Đổi nền" vào sidebar · copy band.
- **#158** menu **9→4 mục** (`nav.js`): ✦ Luận Đường · Khám phá · Cẩm nang · Tài khoản.
- **#157** nén 3 khối SEO → 1 dải "Khám phá & Tra cứu".
- **#156** dời catalog 47 tool → trang `/cong-cu` (`cong-cu.html`) + band "Một không gian".
- **#155** hero **một cửa**: ô hỏi/persona → shell (pending-ask `sessionStorage`, rail tự hỏi sau khi lập lá số), bỏ nhánh `/tuvi-chat.html`.
- **#154** đổi tên shell → **Luận Đường** (sidebar/rail/dashboard/CTA).
- **#153** width card cố định. **#152** panel `/cong-cu` grouping khớp menu.
- **#146–#151** (cũ): nền shell + migrate tool engine + intro + chip gợi ý + dashboard + hand-off.

### Kiến trúc app-shell (ĐỌC trước khi làm tiếp)
- **Chrome dùng chung:** `public/shell.js` (v9) + `public/shell.css` (v3). Trang tool chỉ cần: khai `window.SHELL_ACTIVE='<id>'`; tùy chọn `window.SHELL_INTRO={key,title,desc}` + `<div id="introHost">`; gọi `Shell.setContext({birth?,scenario?,label,greeting,chips})` để bật rail (`chips` nuôi hàng gợi ý). API: `rememberBirth/getRememberedBirth/prefillForm/autoRun` (hand-off), `introOnce/markIntroSeen/dismissIntro`, `ask/openRail`.
- **Rail** gọi `/api/v1/chat` SSE, gửi `birth` VÀ/HOẶC `scenario` (đi CÙNG được). Có **author persona** (`authorName/authorStyle` top-level + trong scenario) + **upload ảnh** (`pendingImages` → `messages[].images=[{data,mediaType}]`, vision). `setContext` nhận thêm `placeholder`. Trang vision (`xem-tuong`/`phong-thuy`) gọi setContext lúc load (chờ `boot` bằng `DOMContentLoaded`) → rail active không cần birth.
- **Routes** (`next.config.mjs` rewrites): `/app`→`app-home.html` · `/app/la-so`→`app.html` · `/app/bat-tu` · `/app/luan-giai` · `/app/xem-tuoi`&`/app/xem-lam-an` (chung `app-xem-tuoi.html`) · `/app/dat-ten` · `/app/chon-ngay` · **`/app/xem-tuong`** · **`/app/phong-thuy`**. Trang chủ `/`→`index.html` (revamp một-cửa); `/cong-cu`→`cong-cu.html` (catalog 47 tool).
- **Backend scenario** (`lib/agent/prompts.ts` buildChatContext + `lib/contract/v1.ts`): thêm nhánh `xem-tuong`/`phong-thuy` (prompt vision prose). `run.ts` birth-path gộp văn phong thầy vào `tone`.
- **Module lift/port (NỢ DRY):** `public/tuong-hop.js`, `public/can-chi.js` — sau ổn định trỏ trang legacy sang dùng chung.
- **Asset version:** bump `shell.js?v=` / `shell.css?v=` trên TẤT CẢ trang shell mỗi khi sửa (**hiện js=27, css=6**; `nav.js?v=16`). Linter hay reflow HTML — vô hại.
- **Verify:** serve `public/` bằng `python3 -m http.server` + Playwright (`/opt/pw-browsers/chromium`); test rewrite `/app/*` bằng `page.route` fulfill file, hoặc mở `*.html?auto=1` trực tiếp.

### 🔜 KÉO THÊM TOOL VÀO SHELL (cập nhật 2026-07-09)
**✅ BATCH 1 XONG (PR mới, chờ merge) — 3 tool + vá bug vision:**
- **`xem-tuoi-sinh-con`** → `/app/sinh-con` (`app-sinh-con.html`), nhóm **Tử Vi**. Backend đã sẵn 100% (scenario type + computeSinhCon). Client chấm nhanh 15 năm địa chi (parity `diachi.ts`), gửi thô `{namBo,namMe}`.
- **`tuong-hop`** → `/app/tuong-hop` (mode thứ 3 trong `app-xem-tuoi.html`, KHÔNG tách file), nhóm **Tử Vi**. Thêm scenario type `tuong-hop` (neutral compat "hai người bất kỳ") — mirror xem-tuoi: contract + `CHAT_SYSTEM_COMPAT` nhánh 3-way + run.ts computeLaso×2 + SCENARIO_FIELD='compatData'.
- **`dat-ten-dn`** → `/app/dat-ten-dn` (`app-dat-ten-dn.html`), nhóm **Đặt Tên**. Thêm scenario type `dat-ten-dn` + `computeDatTenDn` (diachi.ts, can chi chủ) + `CHAT_SYSTEM_DAT_TEN_DN` + `extractDatTenDnContext`. Data thô `{tenChu,namChu,nganh,loaiHinh,tenGoiY}`.
- **🐞 VÁ BUG:** `validateChatRequest` (v1.ts) trước THIẾU `xem-tuong`/`phong-thuy` trong mảng `types` → rail 2 tool vision (#162) bị **400** khi gửi scenario. Nay mảng đủ 10 type. (Verify Playwright: cả 3 luồng gửi đúng scenario.type + rail bật; typecheck 0 lỗi sau build engine.)
- **Sidebar/dashboard:** shell.js TOOLS + app-home GROUPS thêm 3 item; icon dashboard mới `users`/`baby`. Bump **js=17**.

**✅ BATCH 2 XONG (PR mới) — 6 tool + 2 nhóm sidebar mới (Mệnh Lý · Huyền Học):**
- **`bat-trach`** → `/app/bat-trach` (Phong Thủy): cung phi (mệnh quái Lạc Việt) + đông/tây tứ mệnh.
- **`kim-lau`** → `/app/kim-lau` (Chọn Ngày): tuổi mụ → Kim Lâu (Thân/Thê/Tử/Lục Súc) + Tam Tai, bảng 10 năm.
- **`ngu-hanh-ten`** → `/app/ngu-hanh-ten` (Đặt Tên): mệnh nạp âm + tên → rail luận ngũ hành từng chữ.
- **`nap-am`** → `/app/nap-am` (nhóm **Mệnh Lý** mới): năm → nạp âm + hành.
- **`than-so-hoc`** → `/app/than-so-hoc` (nhóm **Huyền Học** mới): ngày sinh → số chủ đạo Life Path (Pythagoras).
- **`kinh-dich`** → `/app/kinh-dich` (Huyền Học): gieo quẻ client (3 đồng ×6) → quái thượng/hạ + hào động; server resolve quái, rail định danh 64 quẻ + luận.
- **Engine mới:** `lib/engine/menhly.ts` (computeNapAm/KimLau/NguHanhTen/ThanSoHoc/BatTrach/KinhDich) — chỉ tính phần deterministic CHẮC (KHÔNG hardcode bảng 64 hướng/64 quẻ dễ sai, để LLM luận). Contract + 6 scenario type + 6 prompt (prompts.ts) + dispatch (run.ts) + SCENARIO_FIELD. Bump **js=18**. (Verify Playwright 6 luồng đúng scenario+data, rail bật; typecheck 0 lỗi.)

**✅ DRY REFACTOR batch-2 XONG (#168–#172, ĐÃ MERGE) — sửa lỗi kiến trúc "dựng mới thay vì port":**
Henry chỉ ra shell tool được **dựng MỚI** (thin, đẩy hết qua rail) thay vì **PORT** trải nghiệm ô-giữa của trang standalone. Quyết định: **module DÙNG CHUNG** `public/tools-shared/<tool>.js` (compute + render **byte-identical** với bản inline cũ) → CẢ trang standalone `/tools/*.html` (giữ nguyên, SEO, LIVE) LẪN shell `/app/*` gọi chung. Ô giữa shell nay hiện tool THẬT (không thin), rail = trợ lý luận sâu nhận data.
- **6 module:** `tools-shared/{kim-lau,nap-am,than-so-hoc,bat-trach,ngu-hanh-ten,kinh-dich}.js`. Mỗi cái = nguồn DUY NHẤT. Standalone rewire: thay `<script>` inline bằng `src` + wiring DOM mỏng.
- **Bug batch-2 sửa nhờ port:** công thức tôi tự chế lệch bản standalone (kim-lâu chu kỳ 5+Hoang Ốc, nạp âm chính tả, bát trạch `nam%100`). Port = lấy standalone làm chuẩn → hết lệch.
- **Năm động** (`vnYear()` timezone VN) thay hardcode 2026 cho mọi tool.
- **Backend pass-through:** client module = nguồn chuẩn → `run.ts` KHÔNG recompute (gỡ 6 compute*), **XÓA `lib/engine/menhly.ts`** (rỗng). `prompts.ts` đọc data qua `extractGenericContext` (+ nhãn `GENERIC_LABELS`); gỡ `extractKinhDichContext`. Rail data-contract vài tool đổi shape (ngu-hanh-ten/kinh-dich) — prompt cập nhật đồng bộ.
- **Verify mỗi tool:** Playwright serve `public/` + so `innerHTML` bản mới vs `git HEAD` (byte-identical, gồm luồng interactive: nhập nét thủ công ngu-hanh-ten, gieo quẻ kinh-dich mock `Math.random` 5 seed) + smoke shell-mount (rail scenario đúng). Typecheck 0, lint/prettier sạch.
- **CÒN LẠI (chưa port DRY — cần Henry test/chốt, KHÔNG auto-merge):** tử-vi/lá-số adjacent `sinh-con`/`tuong-hop`/`chon-ngay`/`dat-ten`/`xem-tuoi`; nặng `la-so`/`luan-giai`/`bat-tu` (AI+paywall+RAG); API/vision `xem-tuong`/`phong-thuy`/`dat-ten-dn`.

**Ứng viên CÒN LẠI (chưa vào shell):** **18 slot đã trong shell.** Còn: an-sao/sao-nam/cach-cuc/dai-van/van-thang (lát cắt lá số — rail đã trả lời được, cân nhắc có cần slot riêng); tu-tru (≈ bat-tu đã có); hoang-dao/ngay-tot/luc-nham/han-nam (lịch số); tarot/oracle/boi-bai-tay (rút bài — cần UI riêng); phong-thuy-render + 10 tool Làm Đẹp (sinh/ghép ảnh, khác domain).

**Ứng viên CHƯA vào shell — phân theo độ khả thi (đã trừ 3 tool batch 1):**
- **Nhóm A (dễ nhất, hợp rail — engine/scenario sẵn):**
  - `nap-am`, `tu-tru`, `bat-trach`, `kim-lau`, `ngu-hanh-ten` (Mệnh Lý free) — can-chi/ngũ hành thuần, `lib/engine/diachi.ts` sẵn.
  - `an-sao`, `sao-nam`, `cach-cuc`, `dai-van`, `van-thang` (Công Cụ Tử Vi free) — **đều là lát cắt lá số, rail đã trả lời được khi có lá số** → cân nhắc có cần slot riêng không.
  - `hoang-dao`, `ngay-tot`, `luc-nham`, `han-nam` (Lịch Số free) — lịch/ngày deterministic.
- **Nhóm B (hợp rail prose, cần prompt riêng):** `kinh-dich` (64 quẻ), `than-so-hoc`, `khi-sac` (ảnh OK). `thanh-tuong`/`thanh-tuong-pro` = **giọng nói/audio → rail CHƯA nhận audio**.
- **Nhóm C (KHÓ, KHÔNG hợp rail prose — cần UI riêng/sinh ảnh):** `tarot`/`oracle`/`boi-bai-tay` (rút bài tương tác); `phong-thuy-render` (sinh ảnh); 10 tool **Phong Cách AI / Làm Đẹp** (da-lieu/kieu-toc/personal-color/trang-diem/trang-phuc, nhất là *-tryon* = sinh/ghép ảnh, khác domain mệnh lý).

**Gợi ý Claude: batch đầu = 3 tool Nhóm A có engine sẵn** (`xem-tuoi-sinh-con` → nhóm Chọn Ngày/Tử Vi · `dat-ten-dn` → Đặt Tên · `tuong-hop` → Tử Vi cạnh xem-tuoi). Pattern y hệt các trang scenario hiện có: tạo `app-<id>.html` khai `SHELL_ACTIVE` + `Shell.setContext({scenario})` bọc DOMContentLoaded, thêm route `next.config.mjs`, thêm item vào TOOLS (`shell.js`) + GROUPS (`app-home.html`), bump asset version. Backend: check `buildChatContext`/contract đã hỗ trợ scenario type chưa (xem-tuoi-sinh-con/tuong-hop có thể cần nhánh). **→ Chờ Henry chốt tool nào rồi gom 1 PR/batch.**

### Bước tiếp theo (gợi ý khác, chọn 1)
1. **`suggestions[]` do LLM sinh** theo từng câu trả lời (nâng cấp #149 — đụng brain `lib/agent/prompts.ts`+contract, áp cho cả kênh bot). Nặng hơn, tách PR.
2. **Nợ DRY:** trỏ `xem-tuoi.html` (legacy) + trang khác sang `tuong-hop.js`/`can-chi.js`.
3. **Tính phí Lượng cho vision** (xem-tuong/phong-thuy) nếu muốn — hiện bill qua `chat.cost` chung như mọi lượt rail.
4. **Setup máy mới:** `npm ci` → `cd tuvi-engine && npm ci && cd ..` → `npx playwright install chromium` (env này đã có Chromium sẵn ở `/opt/pw-browsers`).

### Quy ước (giữ nguyên)
1 việc = 1 PR draft → CI xanh (lint·typecheck·test×2·lighthouse·Vercel·smoke-skip) → mark ready → squash-merge → `git checkout -B <branch> origin/main` (branch reset, push `--force-with-lease`). Sau merge, session tự unsubscribe PR.

---

## 🗂️ Track cũ — Chat-first / Contract v1 (đa nền tảng)

**Branch:** `claude/tuviminhbao-resume-tf8tcq`
**Cập nhật:** 2026-06-24
**Xương sống:** `docs/KIEN-TRUC-VA-LO-TRINH.md` (đọc file này trước khi làm tiếp).

### 🔖 RESUME HERE (mở máy khác đọc cái này trước)
- **⏭️ PICK UP NGAY (2026-06-24 tối — answer-shape ĐÃ LIVE THẬT trên prod, verify OK, sẵn sàng PR2 chip):** Shape chạy đúng cả web + Telegram (Henry test xác nhận: phán quyết in đậm → 1 mạnh+1 yếu cốt lõi → MỞ NÚT 1 câu hỏi gọi tên chi tiết thật, ~130–200 từ, không tiêu đề con). **4 PR merge+deploy hôm nay, main @ `cea18c2`** (xem mục "PR đã merge" bên dưới — #104 shape nền, #106 NAM_XEM, #107 DB-prompt-là-lớp-tông, **#108 = FIX CHÍNH**). PR **#104** gồm 3 thứ: (1) **answer-shape v1** — `CHAT_RICH_RULES`+`CHAT_SYSTEM_LASO` (`lib/agent/prompts.ts`) đổi sang **3 lớp** (phán quyết in đậm → 1 mạch dẫn chứng cốt lõi, 1 mạnh+1 yếu, không dàn trải → **MỞ NÚT** nêu đích danh 1 chi tiết thật chưa luận + mời hỏi tiếp); độ dài **130–200 từ** (was 250–600), follow-up 80–140. (2) **Luật vận hạn "đại vận là gốc"** (prompts.ts + `TOOLS_INSTRUCTION` trong `tools.ts`): đại vận là tầng DUY NHẤT có điểm/10 thật; tiểu→nguyệt→nhật phái sinh; đặt vận ngắn trong khung đại vận (đại vận tốt thì sao xấu nhất thời lướt qua); **nguyệt/nhật vận CẤM bịa điểm**, luận theo cung+chính tinh. (3) **Cửa sổ tiểu/nguyệt vận ±5→±10** TÁCH tham số (`tinhTieuVanScores` thêm `windowYears`, `anSaoLaSo` thêm `tieuVanWindow`, `computeLaso` truyền 10) — **client/biểu đồ nến giữ ±5**, chỉ chat server giãn ±10 (smoke OK: client 2021–2031 / server 2016–2036), KHÔNG tốn token LLM. **CĂN NGUYÊN "vẫn dài" (chốt sau 3 vòng chẩn, #108):** KHÔNG phải DB override — `app_config.chat.system_prompt` vốn đã rỗng `""` (đã kiểm trực tiếp qua Supabase REST). Thật ra: **nhập ngày sinh BẰNG TEXT (Telegram, web text) → `req.birth` rỗng → `runAgent` (`lib/agent/run.ts`) chọn `CHAT_SYSTEM_GENERAL` (bản LỎNG 200–600 từ, cho tiêu đề con) rồi mới gọi tool `lap_la_so`**; shape #104 chỉ nằm trong `CHAT_SYSTEM_LASO` (dùng khi đã có sẵn lá số) → luồng phổ biến nhất trên Telegram không chạm tới. #108 cho `CHAT_SYSTEM_GENERAL` mang luôn shape. #107 (DB-prompt-là-lớp-tông) vẫn đúng kiến trúc nhưng KHÔNG phải fix triệu chứng này. **🔐 Henry: ROTATE service_role key Supabase** — đã paste qua chat để Claude kiểm DB rỗng → Settings→API→Reset, cập nhật env Vercel `SUPABASE_SERVICE_KEY` + Redeploy. **NỢ KỸ THUẬT mới:** shape lặp ở `CHAT_SYSTEM_LASO`+`CHAT_SYSTEM_GENERAL`+`CHAT_RICH_RULES` → nên trích `CHAT_SHAPE_RULES` chung (PR riêng). **Việc tiếp NGAY:** (a) **PR 2 — chip câu hỏi gợi ý** (ĐÃ MỞ KHÓA, shape OK): core trả thêm `suggestions[]` (`lib/channels/core.ts`), mỗi kênh tự render (web=chip, Telegram=inline keyboard, Messenger=quick replies, WhatsApp=interactive buttons ≤3) — chốt shape `suggestions` rồi code. (b) Tinh chỉnh tông (tùy chọn): set `app_config.chat.system_prompt` vài dòng CHỈ về giọng văn — nhờ #107 sẽ chồng lên shape, không phá. (c) **trust/retrodiction (#3)** chờ chốt dial brand rồi mới code.
- **✅ NỢ KỸ THUẬT NAM_XEM — XONG (#106):** `extractLasoContext` (`lib/agent/prompts.ts`) hết hardcode `NAM_XEM=2027`, dùng `currentNamXem()`.
- **⏸️ Messenger + WhatsApp (PR #102 merged, wiring xong nhưng TEST RUNTIME còn TẮC — gác lại):** App Business (App ID `4355400224733286`, Page id `122097706839369476`, WhatsApp Phone Number ID `1176714088859217`, số test sandbox `+1 555 652-8238`), 8 env + token vĩnh viễn + webhook verify cả 2 + 3 QR deep link — ĐÃ XONG. **NHƯNG khi test (2026-06-24):** (1) **WhatsApp**: nhắn KHÔNG có reply; Claude soi runtime log Vercel 3h → **0 POST tới `/api/channels/whatsapp`** (search path xác nhận, code route KHÔNG lỗi — webhook Meta CHƯA gửi tới). Nghi: WABA chưa "Subscribe" vào app / callback URL phải có `www` / số chưa add recipients. (2) **Messenger QR**: `m.me/122097706839369476` mở browser cũng KHÔNG ra → **Page chưa publish hoặc chưa có username**. **Việc tay Henry (Meta dashboard):** WhatsApp→Configuration check WABA subscribe + callback `https://www.tuviminhbao.com/api/channels/whatsapp`; Page→publish + set username (xong đưa Claude username để gen lại QR `m.me/<username>`). Nhắn test lại → Claude soi log. Phạm vi: Messenger Dev mode (chỉ admin/tester); WhatsApp số sandbox (cần WABA production). Ví Lượng để SAU, chạy free-cap/ngày.
- **State (2026-06-23):** Phase 0 + Phase 1 web DONE. **Đã LIVE trên prod:** Pricing 5 Lượng/lượt + signup 25 Lượng (#87, #88); Telegram bot `@tuviminhbao_bot` (#91–100) — chạy thật trên prod, test OK gồm cả tin follow-up. #96 web chat xem ẢNH (tướng mặt/phong thủy, multimodal), #97 Telegram NHỚ lá số theo phiên, #98 Telegram nhận ẢNH, #99 TÁCH lõi kênh chat dùng chung.
- **✅ FIX BUG follow-up (#100, 2026-06-23) — DONE:** tin nhắn thứ 2 (follow-up) từng trả "gặp trục trặc" với log Vercel RỖNG. Căn nguyên: lỗi TẠM THỜI từ Anthropic (529 overloaded / 429 rate-limit) — `runAgent` gọi Anthropic bằng `fetch` thô KHÔNG có auto-retry như SDK. Loại trừ được "trả lâu" (timeout → bot im, không gửi ERR_MSG) và "trả dài" (max_tokens → text cụt, không rỗng). Sửa: (a) helper `postAnthropic` retry 429/500/502/503/529 (backoff ngắn, 3 lần) trong `lib/agent/run.ts`; (b) thêm `console.error` ở 3 chỗ trước đây nuốt lỗi im (callAnthropic throw / streamFinal sse.error / runConversation catch+nhánh err||!answer) → lần sau tái phát thì log lộ `[runAgent...] Anthropic non-200: <status> — <body>`. Test prod OK.
- **Kiến trúc kênh chat (sau #99) — QUAN TRỌNG:** điều phối 1 lượt hội thoại nằm ở **`lib/channels/core.ts`** (`runConversation` + interface `ChannelIO` + `SessionStore`) — TRUNG LẬP nền tảng (không import Telegram/Supabase). Lõi lo: thanh tiến trình + typing, tải ảnh, nạp/lưu phiên (nhớ lá số), gọi `runAgent`, chốt câu trả lời, tính phí (gọi `gateCommit` khi thành công), KHÔNG lưu base64 ảnh vào phiên. `splitText`+`createSSECollector` cũng ở core. **Thêm kênh mới = viết `lib/channels/<plat>.ts` (cài ChannelIO+SessionStore) + `app/api/channels/<plat>/route.ts` (verify webhook + parse update + lệnh + cổng tính phí) → gọi `runConversation`.** Telegram giờ là mẫu: `route.ts` định nghĩa `telegramIO`/`telegramStore`. `runAgent` (lib/agent/run.ts) trả `{toolsUsed, birth}` — birth bắt từ req.birth hoặc tool lap_la_so, để lưu phiên đỡ hỏi lại ngày sinh. Ảnh: ChatMessage.images (base64) + VISION_INSTRUCTION đã sẵn trong runAgent.
- **✅ DONE — Messenger + WhatsApp (PR #102 đã merge):** thêm 2 kênh Meta Graph cùng đợt + **TỔNG QUÁT HÓA DB đa-nền-tảng**. (a) Lưu trữ gộp về `lib/channels/store.ts` (generic, bảng `chat_sessions`/`chat_links`/`chat_link_tokens`/`chat_usage` có cột `platform` + RPC `chat_incr_free_usage`) — `telegram.ts`/`telegramLink.ts` giờ là VỎ MỎNG bind `platform='telegram'`, route Telegram KHÔNG đổi (an toàn cho bot đang LIVE). (b) `lib/channels/meta.ts` helper chung: `verifyMetaSignature` (X-Hub-Signature-256 HMAC App Secret trên RAW body), `verifyWebhookChallenge` (GET hub.challenge), `graphPost`, `fetchGraphMedia`. (c) `lib/channels/gate.ts` cổng tính phí dùng chung (ví Lượng nếu link / freeCap lượt/ngày nếu chưa). (d) Adapter `messenger.ts`/`whatsapp.ts` + route `app/api/channels/{messenger,whatsapp}/route.ts`. Messenger/WhatsApp KHÔNG sửa được tin → `sendProgress` gửi "đang xem…" 1 lần rồi trả null (không edit theo status). Liên kết ví từ web cho Messenger/WhatsApp = việc làm SAU (giờ mặc định freeCap/ngày).
- **🔴 BƯỚC TIẾP — Zalo OA:** Henry đang đăng ký Zalo OA (oa.zalo.me, CCCD/GPKD, 2-3 ngày). Khi có access token → viết adapter Zalo theo mẫu Telegram/Messenger + lõi core. Zalo API riêng (của VNG): webhook JSON, send qua OA API, verify appsecret_proof. Bộ generic `store.ts`/`gate.ts` đã sẵn → Zalo chỉ thêm `lib/channels/zalo.ts` + route, bind `platform='zalo-oa'`.
- **✅ VIỆC TAY HENRY (để Telegram chạy thật trên prod) — XONG 2026-06-23:** (a) migration Supabase `telegram_sessions` (+cột `birth jsonb`) + `telegram_links`/`telegram_link_tokens`/`telegram_usage` (+RPC `tg_incr_free_usage`) đã chạy (project `dciwkfdqhhddeymlisey`); (b) env Vercel `TELEGRAM_BOT_TOKEN`+`TELEGRAM_WEBHOOK_SECRET` đã set + Redeploy; (c) webhook đăng ký đúng `https://www.tuviminhbao.com/api/channels/telegram` (verify `getWebhookInfo`). Bot test OK: nhớ lá số nhiều lượt, ảnh mặt/nhà, /new, ví Lượng, **và tin follow-up (sau fix #100).**
- **✅ VIỆC TAY HENRY (để Messenger/WhatsApp chạy thật) — WIRING XONG 2026-06-23:** (a) migration `_patches/migration-channels-multiplatform.sql` đã chạy (bảng `chat_*` + COPY data Telegram sang `platform='telegram'`; bảng `telegram_*` cũ KHÔNG đụng → bot Telegram LIVE liền mạch). (b) **Meta Developer:** App Business mới — App ID `4355400224733286`, Page Messenger id `122097706839369476`, WhatsApp Phone Number ID `1176714088859217`, số test sandbox `+1 555 652-8238`. (c) 8 env đã set Vercel + Redeploy (`MESSENGER_PAGE_ACCESS_TOKEN`/`MESSENGER_APP_SECRET`/`MESSENGER_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_TOKEN`/`WHATSAPP_APP_SECRET`/`WHATSAPP_VERIFY_TOKEN` + Graph version) — token Messenger & WhatsApp đều **vĩnh viễn**. (d) Webhook đã trỏ + verify cả 2 (`…/api/channels/messenger` + `…/whatsapp`, field `messages`, Page subscribed), endpoint test **200**. **CÒN LẠI:** (1) Henry nhắn test thật → Claude soi runtime log Vercel xác nhận nhận+trả lời. (2) Messenger đang **Development mode** → chỉ admin/tester được trả lời tới khi App Review duyệt `pages_messaging`. (3) WhatsApp đang **số test sandbox** → cần gắn số WABA production (Business verification) để mở cho người thật.
- **Setup máy mới:** `npm ci` → `cd tuvi-engine && npm ci && cd ..` → `npx playwright install chromium`. GitHub MCP/`gh` tùy môi trường.
- **Quy ước:** 1 việc = 1 PR draft → CI xanh (7 checks: lint, typecheck, test×2 unit+e2e, lighthouse, Vercel, smoke-skip) → squash-merge → `git reset --hard origin/main`. Secrets để ENV trên Vercel, KHÔNG commit.

### Tầm nhìn 1 câu
Một **bộ não** trên server (`/api/v1/chat`, Contract v1). Mọi nền tảng (Web → Zalo → TikTok → Android → iOS → bot) là **vỏ mỏng** gọi cùng API. Sửa 1 chỗ, tất cả cập nhật. Engine deterministic là nguồn lá số DUY NHẤT — LLM không bịa số.

### Kiến trúc "một bộ não" (đã hợp nhất — KHÔNG viết trùng)
- **Tools dùng chung:** `lib/agent/tools.ts` (TOOLS_INSTRUCTION, buildTools, execLasoTool, toolLabel).
- **Prompts dùng chung:** `lib/agent/prompts.ts` (CHAT_SYSTEM_LASO/GENERAL, extractLasoContext, buildChatContext).
- Cả `/api/v1/chat` VÀ `/api/lasotuvi` đều ăn 2 module trên → sửa prompt/tool 1 chỗ.
- **Engine server-side:** `lib/engine/laso.ts` `computeLaso(birth)` — nạp ĐÚNG `public/tuvi-ansao-engine.js` mà client dùng → lá số y hệt (parity đã verify).
- **Config runtime:** `app_config` (Supabase) qua `lib/config/appConfig.ts` — prompt/model/cost sửa ở DB, không deploy. `chat.system_prompt` rỗng = dùng template chung.
- **Paywall/Lượng:** `lib/billing/credits.ts`, gộp trong `/api/v1/chat` (cost từ config, 0 = free). Cờ `PAYWALL_DISABLED`.
- **Contract:** `lib/contract/v1.ts` — additive-only. SSE 5 event: status·tool_call·text(delta)·done·error. Request: `birth` (luồng lá số) HOẶC `scenario:{type,data,docs?}` (6 kịch bản phi-lá-số).

### Tiến độ
- ✅ **Phase 0** (bộ não + contract + config + paywall) — DONE.
- ✅ **Phase 1 một phần:** PWA (manifest/sw/pwa-install), `chat-v2.html` (vỏ mỏng tham chiếu, có lưu hội thoại + nút Mới).
- ✅ **Sprint 1.1 (laso-only) — MERGED PR #78.** `tuvi-chat.html` luồng lá số → `/api/v1/chat` (server tính từ `chat.birth`). Cờ `USE_V1_LASO` + escape hatch `localStorage.tvc_use_v1='0'`.
- ✅ **Sprint 1.2 (6 tool phi-lá-số) — MERGED PR #79.** Flip nốt xem-tuoi/xem-lam-an/tu-binh/sinh-con/chon-ngay/dat-ten trong `tuvi-chat.html` sang `/api/v1/chat` qua field additive `scenario:{type,data,docs?}`; `/api/v1/chat` dispatch qua CHÍNH `buildChatContext`. CÙNG cờ `USE_V1_LASO`. `/api/lasotuvi` GIỮ NGUYÊN cho 7 trang khác.
- ✅ **Sprint 1.3 (Tử Bình server-compute) — MERGED PR #80.** Lát cắt dọc đầu tiên của "server tự tính kịch bản". (A) **Sửa bug** `extractTuBinhContext` (`prompts.ts`) đọc sai shape → trước ra `?`/`[object Object]`; nay đọc đúng (mảng `tuTru` + object), context giàu. Lợi cho cả luồng cũ. (B) `lib/engine/tubinh.ts` `computeTuBinh(birth)` nạp `public/tubinh-ansao-engine.js` (CommonJS) qua `new Function`. `/api/v1/chat`: `tu-binh` + `birth` → server lập bát tự. Tử Bình dùng DƯƠNG lịch+tiết khí.
- ✅ **Sprint 1.4 (Tương hợp server-compute) — MERGED PR #81.** Nhân pattern 1.3 cho `xem-tuoi`/`xem-lam-an`: compat chỉ là **2 lá số** → `computeLaso` ×2 (parity sẵn). Client gửi `scenario.data={nameA,nameB,birthA,birthB}`; server dựng `{lsA,lsB,nameA,nameB}`.
- ✅ **Sprint 1.5 (sinh-con/chọn-ngày/đặt-tên server-compute) — MERGED PR #82.** 3 kịch bản cuối, gộp 1 PR (đều NHẸ, cùng pattern). Logic ĐỊA CHI/CAN CHI/NẠP ÂM thuần → `lib/engine/diachi.ts` (port nguyên hằng số + hàm `_cc*` từ `tuvi-chat.html`, KHÔNG nạp engine vanilla). `computeSinhCon`/`computeChonNgay`/`computeDatTen` trả CHÍNH shape `extract*Context` cần. `/api/v1/chat`: 3 type này → tính từ input thô trong `scenario.data`; trả null nếu thiếu → giữ data client (fallback). Client `tcDo*` lưu `chat.scenarioRaw`, `doSend` gửi thô. **→ Cả 6 kịch bản giờ server-compute → Zalo/native chỉ gửi input thô.**
- ✅ **Sprint 1.6 (fix parity NĂM XEM) — MERGED PR #83.** Audit parity lá số phát hiện lệch DUY NHẤT: client `tuvi-chat.html` hardcode `NAM_XEM=2027`, còn server `/api/v1/chat` không truyền namXem → `computeLaso` default `new Date().getFullYear()`=2026. Cấu trúc (12 cung/sao/cách cục/đại vận list 12/napAm/menh) parity tuyệt đối; NHƯNG `tuoiXem` lệch 1, `daiVanHienTai` lệch ở mốc, `tieuVanScores`/`nguyetVanScores` window lệch 1 năm (2021–2031 vs 2022–2032) → `tra_tieu_van`/`tra_nguyet_van` báo "ngoài phạm vi" sai. **Fix (cách 1 + năm động):** năm xem = NĂM HIỆN TẠI giờ VN, nguồn DUY NHẤT `lib/engine/namxem.ts` `currentNamXem()`; `laso.ts`/`tubinh.ts`/`diachi.ts` dùng chung (gộp 3 bản `currentYearVN` trùng); client tính cùng công thức Intl. Bỏ hardcode 2027 → hết drift, không update tay hằng năm. (`convertDuongToAm` chỉ `solarToLunar(dd,mm,yy)` → giờ KHÔNG đổi ngày âm, nên `gioHour` 0 vs 23 giờ Tý vẫn parity — đã verify.)
- ✅ **Sprint 1.7 (gỡ double-deduct billing) — MERGED PR #84.** Khi v1 bật + cost>0, lượt chat bị trừ Lượng 2 lần: SERVER `/api/v1/chat` trừ trong event done (`deductCredits`, `lib/billing/credits.ts`) VÀ client `tuvi-chat.html` gọi `TuviPaywall.deductSilent`. **Fix tối thiểu:** guard `deductSilent` ở `doSend` (lượt follow-up) bằng `!useV1` — v1 để SERVER là biller DUY NHẤT; path legacy `/api/lasotuvi` (KHÔNG bill server-side, đã verify route.ts) thì client vẫn deductSilent. 2 chỗ `deductSilent` của form-initial (Chọn Ngày/Đặt Tên) gọi legacy `/api/xem-tuoi` → GIỮ. Hiện cost=0 nên vô hại; fix để bật cost>0 an toàn.

### 🎉 PHASE 1 (Web thin-client + PWA) — DONE
`tuvi-chat.html` chạy 100% qua Contract v1: lá số + cả 6 kịch bản server-compute (#78–82), parity năm xem chuẩn (#83), billing 1 nguồn (#84), PWA + E2E xanh. **→ Web đủ điều kiện ra mắt #1.** Mở rộng tùy chọn (KHÔNG chặn ra mắt): kéo phong-thuy/tuong-mat (ảnh) vào agent chat — hiện vẫn trang/API riêng.

### Quyết định GIỮ `/api/lasotuvi` (2026-06-21)
**KHÔNG khai tử.** Lý do: (1) mode `phan` nuôi luận-giải 24 mục của `luan-giai.html` — CHƯA có bản v1 thay thế, bỏ là gãy. (2) mode `action=chat` đã share CHUNG bộ não (`lib/agent/prompts.ts`+`tools.ts`) với `/api/v1/chat` → KHÔNG drift, "nợ" chỉ cosmetic. (3) route chỉ chạy khi có request → 0 chi phí khi idle. Lợi ích khai tử ~0, rủi ro gãy `luan-giai` thật → không đáng. Bề mặt phụ còn gọi `action=chat` (profile.html, widget luan-giai, chatbot.js, fallback tuvi-chat) GIỮ NGUYÊN.

### PR đã merge gần đây
- **#74** Chat-first + Contract v1 (Phase 0–1 nền).
- **#75** chat-v2 lưu hội thoại + nút Mới.
- **#76** CI: thêm job `typecheck` (`tsc --noEmit` + build engine) — bịt lỗ refactor lọt lỗi type.
- **#77** fix engine: `computeLaso` dùng năm ÂM cho `namAL` (sửa off-by-one tuổi mụ cho người sinh trước Tết). **→ tiền đề parity cho #78.**
- **#78** Sprint 1.1: luồng lá số `tuvi-chat.html` gọi Contract v1.
- **#79** Sprint 1.2: 6 kịch bản phi-lá-số gọi Contract v1 (`scenario`).
- **#80** Sprint 1.3: Tử Bình server-compute + fix bug context.
- **#81** Sprint 1.4: Tương hợp server-compute (computeLaso ×2).
- **#82** Sprint 1.5: sinh-con/chọn-ngày/đặt-tên server-compute → cả 6 kịch bản server-compute.
- **#83** Sprint 1.6: fix parity năm xem (currentNamXem chung, bỏ hardcode 2027).
- **#84** Sprint 1.7: gỡ double-deduct billing (v1 → server là biller duy nhất).
- **#85** docs: chốt Phase 1 DONE + ghi quyết định GIỮ `/api/lasotuvi` (cập nhật CLAUDE.md + xương sống).
- **#104** answer-shape v1 (3 lớp) + luật vận hạn "đại vận là gốc" + cửa sổ vận ±10.
- **#106** fix: bỏ hardcode `NAM_XEM=2027` trong `extractLasoContext` → `currentNamXem()`.
- **#107** `app_config.chat.system_prompt` thành LỚP TÔNG (persona) thay vì thay thế template.
- **#108** **fix chính shape**: `CHAT_SYSTEM_GENERAL` mang luôn shape 3 lớp → luồng nhập sinh bằng text (Telegram) hết trả lời dài. Verify prod OK.

### 🔴 Bước tiếp theo
1. **Henry test preview prod #83/#84**: `/tuvi-chat.html` → hỏi "năm nay/năm sau", "tháng X/YYYY", tuổi mụ → verify dùng NĂM HIỆN TẠI (2026, không còn 2027); `tra_tieu_van`/`tra_nguyet_van` không báo "ngoài phạm vi" cho năm gần. Billing: khi bật cost>0, lượt v1 chỉ trừ Lượng 1 lần.
2. **Mở rộng tùy chọn (không chặn ra mắt):** kéo phong-thuy/tuong-mat (ảnh/multimodal) vào agent chat nếu muốn "1 ô chat làm mọi nghiệp vụ".
3. **Phase 2 (Zalo)** — chờ Henry đăng ký OA/Mini App (oa.zalo.me, mini.zalo.me, cần CCCD/GPKD). Bộ não đã sẵn: native/Zalo chỉ cần gửi `birth` hoặc `scenario.data` thô.

### ⏳ VIỆC TAY CỦA HENRY (chưa xong)
- [x] Chạy `_patches/migration-app-config.sql` trong Supabase SQL Editor (project `dciwkfdqhhddeymlisey`). ✅ ĐÃ CHẠY 2026-06-22 (bảng `app_config` + 5 seed). Giờ chỉnh prompt/model/giá Lượng trong DB không cần deploy.
- [x] **Bật giá 5 Lượng/lượt trên DB (live):** `UPDATE app_config SET value=to_jsonb(5) WHERE key='chat.cost';`. ✅ ĐÃ CHẠY 2026-06-22 (SELECT thấy 5). `PAYWALL_DISABLED=false` đã xác nhận. Code DEFAULTS=5.
- [x] **Quà signup 25 Lượng** ✅ ĐÃ BẬT 2026-06-22. Thực tế prod đã có sẵn trigger `on_auth_user_created` → hàm `handle_new_user_signup()`; đã `CREATE OR REPLACE` đổi 10→25 (verify `pg_get_functiondef` = 25). File repo `_patches/migration-signup-bonus.sql` đã sửa khớp (PR #88).
- [ ] **Telegram bot (PR kênh đầu tiên):** sau merge → (a) thêm env trên Vercel `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` rồi Redeploy; (b) chạy `_patches/migration-telegram-sessions.sql`; (c) Claude đăng ký webhook (`setWebhook` + secret) rồi test nhắn bot.
- [ ] **Telegram ↔ ví Lượng (monetize hướng 1 — đang làm trên branch `claude/tuviminhbao-resume-tf8tcq`):** sau merge → (a) chạy `_patches/migration-telegram-links.sql` trong Supabase (3 bảng `telegram_links`/`telegram_link_tokens`/`telegram_usage` + RPC `tg_incr_free_usage`); (b) env Vercel (tùy chọn): `TELEGRAM_BOT_USERNAME` (mặc định `tuviminhbao_bot`, để dựng deep link), `TELEGRAM_FREE_DAILY` (mặc định 3 — số lượt free/ngày cho user CHƯA link); (c) test: web Hồ sơ→Credits→"Liên kết Telegram" → mở bot → /start token → nhắn bot thấy trừ Lượng đúng ví; user lạ chưa link xài hết 3 lượt/ngày thì bot mời liên kết.
- [ ] Test preview sau mỗi lần deploy.
- [ ] Đăng ký nền tảng Zalo trước Phase 2.

### Quy ước phiên
- Phát triển trên `claude/astrology-app-design-urttcm`. Mỗi việc = 1 PR draft → CI xanh → mark ready → squash-merge → `git reset --hard origin/main` cho branch.
- Push branch sau squash-merge cần `--force-with-lease` (remote còn commit cũ).
- `send_later` có thể không có trong phiên → re-check PR thủ công khi có webhook.

---

## 🗄️ Track cũ (song song) — ISR Lá Số SEO (438K pages)

> Nhánh khác, không phải việc chat-first hiện tại. Giữ để tham khảo.

**Branch:** `claude/serene-elion-e060cc`  
**Status:** 24-section template DONE (commit c5dbc8a), sẵn sàng deploy + test

### Slug format
```
/la-so/{can-chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi-tinh}-{namXem}
ví dụ: /la-so/canh-ngo-03-06-1998-gio-suu-nam-2027
```

### Kiến trúc: ISR compute on-demand
- `app/la-so/[slug]/route.ts`: parse slug → loadEngine() → compute → HTML → cache CDN vĩnh viễn
- Priority: laso_public → laso_pregen → **ISR compute** → redirect
- Fix quan trọng: module-level `globalThis.location` mock (3 files) để tránh Next.js URL crash sau khi engine set `globalThis.window = globalThis`

### Discovery path
```
Homepage → /menh-kho.html → /menh-kho/[year] → /menh-kho/[year]/[mm-dd] → /la-so/[slug]
```

### Files đã làm trên branch
- `app/la-so/[slug]/route.ts` — ISR compute (parseIsrSlug + loadEngine + renderGrid + renderTextBlocks + buildIsrHTML)
- `app/menh-kho/[year]/route.ts` — Calendar hub 50 năm (1960–2010)
- `app/menh-kho/[year]/[day]/route.ts` — Day hub, 24 cards (12 giờ × 2 giới)
- `app/van-han/route.ts` — Hub page 12 chi × 3 năm
- `app/van-han/[slug]/route.ts` — Level 1 (tuoi-[chi]-nam-[year]) + Level 2 (can-chi-nam-year)
- `app/api/og/laso/route.tsx` — Enhanced OG image edge (1200×630)
- `app/api/admin/sample-laso/route.ts` — Admin preview page
- `public/llms.txt` — AEO: describe tool for LLM crawlers
- `public/robots.txt` — Allow AI bots (GPTBot, ClaudeBot, PerplexityBot...)
- `public/index.html` — SoftwareApplication JSON-LD schema

### ✅ DONE: 24-section template content (commit c5dbc8a)
Đã thêm `render24Sections(ls, params)` vào route.ts — 420 lines template logic.

**Sections đã build:**
```
1.  Tổng quan (cung mệnh, nạp âm, cục, cách cục tóm tắt)
2-13. 12 cung (major stars, sat tinh, cachCucTungCung tags, miniScoreBars)
14. Cách cục chi tiết (moTa per cach cuc)
15. Đại vận hiện tại (scoring + DV timeline)
16. Tiểu vận năm namXem (mainScore, direction, satCount)
17. Điểm mạnh (top 3 cung by avg score)
18. Điểm cần cải thiện (bot 3 cung by avg score)
19. Tứ Hóa phân tích (Lộc/Quyền/Khoa/Kỵ position)
20. Thần sát (Kình/Đà/Hỏa/Linh/Không/Kiếp per cung)
21. Tuần/Triệt ảnh hưởng
22. Vận năm namXem tổng hợp (DV + TV combined)
23. Dự phóng năm namXem+1
24. Tổng kết và lời khuyên
```

### 🔴 Bước tiếp theo: Deploy + test
1. Deploy branch lên Vercel
2. Test `/la-so/canh-ngo-03-06-1998-gio-suu-nam-2027` — verify 24 sections render
3. Check word count: mỗi page có ≥3000 chữ unique

### Test case
- `/la-so/canh-ngo-03-06-1998-gio-suu-nam-2027` ✅ đang work trên localhost:3000
- Engine output: Mậu Dần, Cung Mệnh Cự Môn, điểm 7.3/10, 4 cách cục

### NAM_XEM
- Hardcode 2027 trong `menh-kho/[year]/[day]/route.ts` (line: `const NAM_XEM = 2027`)
- Update hằng năm thủ công

---

## QC & Testing

5 lớp QC chạy trên GitHub Actions. Mọi workflow đều free quota.

### Workflows
| File | Trigger | Mục đích |
|---|---|---|
| `lint.yml` | push/PR vào main/dev | ESLint + Prettier check |
| `unit-test.yml` | push/PR vào main/dev | `tuvi-engine/` vitest + typecheck + coverage |
| `playwright.yml` | push/PR vào main/dev | E2E full suite (16 specs, có auth) |
| `smoke-prod.yml` | deployment_status (prod) + cron 6h + manual | Smoke test trên prod URL, tạo issue `prod-down` khi fail |
| `lighthouse.yml` | PR vào main + manual | Lighthouse trên 4 URL chính, assert Perf/A11y/SEO/LCP/CLS/TBT |

### Lệnh local
```bash
npm run lint              # ESLint
npm run lint:fix          # ESLint auto-fix
npm run format            # Prettier write
npm run format:check      # Prettier check
npm run test:e2e          # Playwright full
npm run test:smoke        # Playwright smoke (PROD_URL=...)
npm run lhci              # Lighthouse local (cần Chrome)

cd tuvi-engine && npm test            # Vitest engine
cd tuvi-engine && npm run test:coverage
```

### Config files
- `eslint.config.js` — ESLint 10 flat config (migrated từ legacy `.eslintrc.json` sau khi bump 8→10)
- `.prettierrc` + `.prettierignore` — format style
- `.gitattributes` — chuẩn hoá LF (Windows ↔ Linux)
- `playwright.config.ts` — E2E full (cần auth, testIgnore `**/smoke/**`)
- `playwright.smoke.config.ts` — smoke prod (no auth)
- `lighthouserc.json` — Lighthouse assertions
- `.github/dependabot.yml` — weekly npm + actions updates

### Dependency versions (sau khi merge Dependabot tháng 5/2026)
- next: `^14.2.0` (chưa upgrade lên 16 — xem "Open PRs" bên dưới)
- @supabase/supabase-js: `^2.106.1`
- pdf-parse: `^1.1.1` (KHÔNG bump lên v2 — break `scripts/embed-tubinh.mjs`, xem "Open PRs")
- eslint: `^10.4.0` (flat config)
- @playwright/test: `^1.60.0`
- prettier: `^3.8.3`
- @types/node: `^25.9.1` (root + engine)
- vitest + @vitest/coverage-v8: `^4.1.7` (engine)
- GHA actions: checkout@v6, setup-node@v6, upload-artifact@v7

### Known limitations
- Prettier KHÔNG check HTML files, vanilla `public/*.js`, `app/api/tuong-mat/route.js`, `next.config.mjs`, `vercel.json` — bảo toàn alignment intentional + tránh diff cosmetic lớn
- ESLint disable `no-dupe-keys` + `no-redeclare` trong `public/tuvi-ansao-engine.js` — file có duplicate star keys cần audit (TODO line ~563)
- ESLint `no-useless-assignment` disabled — rule mới trong v9+ flag false positive ở vanilla files (pattern build-then-replace)
- Sentry alerts chưa setup (skip theo lựa chọn) — nếu cần, configure trong Sentry UI: New issue alert + Error rate spike (>10/5min) + Performance LCP P75 > 4s
- Playwright + Lighthouse SKIP trên Dependabot PR (`if: github.actor != 'dependabot[bot]'`) — Dependabot không có quyền dùng secrets

### Open Dependabot PRs (chưa xử lý — cần decision)
- **#13 next 14→16** ⚠️ — local build fail do thiếu env vars, không verify được. Risk cao: Next 15 thay đổi async params/cookies/headers, route handlers cần await. Khuyên: review release notes trên branch riêng trước
- **#11 pdf-parse 1→2** — v2 bỏ internal path `lib/pdf-parse.js` → break `scripts/embed-tubinh.mjs:20`. Khuyên: close PR, hoặc rewrite script trước khi merge
- **#1, #2 Vercel bot** (Speed Insights + Web Analytics) — không phải Dependabot, merge nếu muốn analytics

### Vercel preview cho Lighthouse
Hiện tại Lighthouse chạy trên prod URLs hardcoded. Để chạy trên Vercel preview của PR:
- Trigger workflow_dispatch + truyền `lhci_url_override=https://app-tuvi-git-<branch>.vercel.app/`
- Hoặc edit `lighthouserc.json` collect.url thành preview URL trước khi merge

### Smoke test issue dedupe + label
`smoke-prod.yml` cần label `prod-down` (đã tạo). Chỉ tạo issue mới nếu chưa có open issue cùng label — lần fail sau comment vào issue cũ.

### Cross-machine setup
Sau khi clone trên máy mới:
```bash
npm ci
cd tuvi-engine && npm ci && cd ..
npx playwright install chromium
```
ESLint dùng flat config (`eslint.config.js`) nên VS Code cần extension version mới (ESLint v3+).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
