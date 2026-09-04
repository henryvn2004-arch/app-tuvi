# Nhật ký phát triển — mục lục

185 mục ghi chép từng PR, tách khỏi `CLAUDE.md` để nó thôi ngốn ~350k token mỗi lượt.
**Bốn file dưới đây KHÔNG được nạp tự động.** Cần thì tra:

```bash
grep -n 'từ khoá' docs/nhat-ky/*.md          # tìm mục
grep -n '^## ' docs/nhat-ky/2026-08.md       # liệt kê tiêu đề
sed -n '120,190p' docs/nhat-ky/2026-08.md    # đọc đúng đoạn, đừng cat cả file
```

| file | số mục | dung lượng |
|---|---:|---:|
| `2026-09.md` | 21 | 108,406 B |
| `2026-08.md` | 147 | 1,018,512 B |
| `2026-07.md` | 12 | 154,531 B |
| `track-cu.md` | 5 | 89,354 B |

Luật rút ra từ các mục này đã được cô đọng lên `CLAUDE.md`. Ở đây giữ phần *vì sao*,
*đo ra sao*, *bẫy nào đã vấp* — thứ chỉ cần khi đụng đúng vùng đó.

---

## Danh sách

| # | tháng | file | mục |
|---:|---|---|---|
| 1 | 2026-09 | `2026-09.md` | 🔧 P2 — `liveText` share đủ chữ nhưng vỡ bố cục: chuyển sang `domShareBlocks` theo từng phần |
| 1 | 2026-09 | `2026-09.md` | 🀄 Lá số thêm dòng Âm/Dương Nam/Nữ · Thuận/Nghịch Lý — so trực tiếp ảnh phần mềm Thiên Lương |
| 1 | 2026-09 | `2026-09.md` | 🚀 Tứ Hóa Phi Tinh — box hiển thị lên nốt 2 bề mặt còn thiếu (luan-giai.html + trang SEO) |
| 1 | 2026-09 | `2026-09.md` | 🔍 Nút Chia Sẻ 4 tool luận sâu: từ "tóm tắt 3-4 dòng" thành "y hệt màn hình đang xem" |
| 1 | 2026-09 | `2026-09.md` | 🔍 Tử Bình: Opus cắt giữa câu 17% — chưa ai thấy vì tool chưa có lượt nào |
| 1 | 2026-09 | `2026-09.md` | 🔀 Gemini 3.8 Flash lên primary cho toàn bộ luận giải, Opus 5 xuống lưới đỡ |
| 1 | 2026-09 | `2026-09.md` | 💰 Giá Gemini ghi bằng NỬA giá thật · lên 3.8 Flash · tách khối đại vận |
| 1 | 2026-09 | `2026-09.md` | 📖 `iconHtml()` trả SVG KHÔNG CỠ — chèn trần ở đâu là nở full ở đó |
| 1 | 2026-09 | `2026-09.md` | 🔒 Tour onboarding nhốt người dùng trên mobile — thiếu đúng MỘT bước kẹp |
| 1 | 2026-09 | `2026-09.md` | 🚪 Bản mẫu TỰ MỞ — nút bấm không gỡ được cái rào nó sinh ra để gỡ |
| 1 | 2026-09 | `2026-09.md` | 💸 A/B mù 48 bản: hạ `effort` xuống `low` — rẻ 39%, chữ ra nhiều hơn |
| 1 | 2026-09 | `2026-09.md` | 🧠 Token NGHĨ ăn chung trần với token CHỮ — nguyên nhân gốc của 7,9% phần cụt |
| 1 | 2026-09 | `2026-09.md` | ✂️ 72% bản luận ĐÃ BÁN có phần cụt giữa câu — không dòng code nào đọc `stop_reason` |
| 2 | 2026-09 | `2026-09.md` | 🎣 Ví dụ thật trước form landing `/app/luan-giai` — và một con số tôi đã báo SAI |
| 1 | 2026-09 | `2026-09.md` | 🎯 Google Ads có traffic thật, 0 sign up — track.js không bắt gclid, đếm lẫn vào "(none)" |
| 1 | 2026-08 | `2026-08.md` | 👤 Guest checkout bằng Supabase Anonymous Sign-ins |
| 1 | 2026-08 | `2026-08.md` | 🩹 `.hkl-src` lộ code ra ngoài + hook thật sang Chu Trình Cuộc Đời |
| 1 | 2026-08 | `2026-08.md` | 🎣 Teaser luận giải: điểm số suông không tò mò + 3 thẻ điểm vỡ dòng trên màn hẹp |
| 1 | 2026-08 | `2026-08.md` | 🔓 Pha 5 — 7/10 tool "ineligible" hoá ra CÓ dữ liệu free bị bỏ phí |
| 2 | 2026-08 | `2026-08.md` | 🏁 Pha 4 — "Làm hết đi": 7 tool thêm hook, 7 tool skip vì ĐÃ hook sẵn, 10 tool loại |
| 3 | 2026-08 | `2026-08.md` | 📚 Dọn thư viện + 🔴 lời mời chỉ nằm trên MỘT trong HAI tường (2026-08-26) |
| 2 | 2026-08 | `2026-08.md` | 🗂️ Pha 4 — hook nguoi-khac bằng chính tinh cung Mệnh — route.ts đã tự gọi tên đúng thứ được hé |
| 2 | 2026-08 | `2026-08.md` | 🧭 Pha 4 — hook huong-nghiep-tre, và ca ĐẦU TIÊN bị loại khỏi Pha 4 (nhan-mach) |
| 3 | 2026-08 | `2026-08.md` | 👶 Pha 4 — hook day-con bằng MỘT chất năng khiếu, tường vốn là MỜ không phải ẨN |
| 4 | 2026-08 | `2026-08.md` | 🌄 Pha 4 — hook van-han-nam bằng ĐÚNG cặp lifeArc/daiVanDinh/daiVanDay đã cất dành |
| 5 | 2026-08 | `2026-08.md` | 💼 Pha 4 — hook cong-so bằng MỘT mặt trong 12, không dựng lại radar |
| 6 | 2026-08 | `2026-08.md` | 🎭 Pha 4 — hook chan-dung-tien-kiep bằng Lục Giác Mệnh, KHÔNG động vào tuổi đã bị giấu |
| 7 | 2026-08 | `2026-08.md` | 🖼️ Pha 4 — rải hook sang chan-dung-vo-chong, đọc gate TRƯỚC khi chọn fact |
| 8 | 2026-08 | `2026-08.md` | 🎯 Hook của luan-giai hứa nhầm sản phẩm — đại vận đã tách sang tool khác |
| 9 | 2026-08 | `2026-08.md` | 🔓 Tầng hook workspace — Pha 3, dời lằn ranh free/paid của luan-giai |
| 10 | 2026-08 | `2026-08.md` | 🪝 Tầng hook workspace — Pha 0-2, chart im lặng không hiện vì sai shape tham số |
| 11 | 2026-08 | `2026-08.md` | 🎂 Cắm khối "Ai Sinh Cùng Ngày" vào 8 trang nữa — chặn ở lượt import lớn (classifier an toàn) |
| 12 | 2026-08 | `2026-08.md` | ✍️ Bút Tướng — thêm "ký theo chữ nào trong tên?", CHỈ để narrate |
| 13 | 2026-08 | `2026-08.md` | 🪝 Bút Tướng — gắn `arcDoc` (họ 3) vào bài luận, đã thiếu HẲN lớp hook |
| 14 | 2026-08 | `2026-08.md` | ✍️ Bút Tướng — tool xem chữ ký, engine đo 6 trục chạy Ở CLIENT |
| 15 | 2026-08 | `2026-08.md` | 🆓 UI "Số Đẹp" — 100% client-side, KHÔNG chạm LLM/route/paywall |
| 16 | 2026-08 | `2026-08.md` | 🎲 Generator "Số Đẹp" — gợi ý số bằng random-walk có seed, 0đ |
| 17 | 2026-08 | `2026-08.md` | 🔢 Engine "Số Đẹp" — Bát Tinh + Quẻ Dịch + Ngũ Hành + Âm Dương, 0đ |
| 18 | 2026-08 | `2026-08.md` | 🀄 Bảng Du Niên Bát Trạch — 3 bản chép tay tự mâu thuẫn, nay SINH bằng thuật toán |
| 19 | 2026-08 | `2026-08.md` | 💸 Rail chat gỡ carve-out Opus primary — quay về Gemini Flash toàn bộ |
| 20 | 2026-08 | `2026-08.md` | 🔀 Kimi K3 xuống lưới đỡ cuối cùng, Opus 5 primary cho 7 tool "luận giải" |
| 21 | 2026-08 | `2026-08.md` | 🧭 Coachmark 3 điểm → 6–7 điểm — đi hết các mặt chính của sản phẩm |
| 22 | 2026-08 | `2026-08.md` | 🚀 "Khởi Hành" thay M3 + coachmark 3 điểm — onboarding cho web |
| 23 | 2026-08 | `2026-08.md` | 🔄 Card "Khoe Kết Quả" trong Nhiệm Vụ → "Chia Sẻ" — #599 đã gỡ nút, câu hỏi đo click |
| 24 | 2026-08 | `2026-08.md` | 🏆 Tab "Nhiệm Vụ" trong Tài Khoản — gom Khởi Hành, Mời Bạn, lịch sử Khoe Kết Quả |
| 25 | 2026-08 | `2026-08.md` | 📣 Track Quest/Gamification — "Khoe Kết Quả" + "Rủ so lá số" |
| 26 | 2026-08 | `2026-08.md` | ✂️ Audit `trim_la_so` — chỉ CÒN 1 chỗ cắt thật, đã bỏ |
| 27 | 2026-08 | `2026-08.md` | 📣 TRACK DIGITAL MARKETING — 14/14 mục, và 3 giả định của tôi bị SỐ ĐO bác |
| 28 | 2026-08 | `2026-08.md` | 💰 Track Tối Ưu Chi Phí Opus — Code #1 + #2 đã push lên PR #585 (chờ merge+deploy), #3 vẫn chặn |
| 29 | 2026-08 | `2026-08.md` | 🌙 Vận Hạn 12 Tháng đổi sang KHUNG THÁNG ÂM — hết cảnh "nửa đầu / nửa sau" |
| 30 | 2026-08 | `2026-08.md` | 🌙 Rail `tra_nguyet_van` đổi sang tháng ÂM — nốt "đường dùng chung" đã né ở PR trước |
| 31 | 2026-08 | `2026-08.md` | ⏱️ Timeout 30 giây: KHÔNG phải đường tiền, và engine vô can |
| 32 | 2026-08 | `2026-08.md` | 🔤 Ảnh OG: chẩn đoán vòng 1 SAI, bản vá của tôi đẻ ra lỗi MỚI |
| 33 | 2026-08 | `2026-08.md` | 📡 BẢN ĐỒ 8 KÊNH SOCIAL — audit trước khi ráp Telegram + vá Facebook |
| 34 | 2026-08 | `2026-08.md` | 🔮 Thêm lớp DỰ BÁO vào arc ô GIỮA — và arc ô giữa KHÔNG phải 5 lớp |
| 35 | 2026-08 | `2026-08.md` | 🖼️ Ảnh preview link chia sẻ HỎNG 108 lượt/tuần — và chẩn đoán ĐẦU của tôi SAI |
| 36 | 2026-08 | `2026-08.md` | 📅 Tool MỚI "Vận Hạn 12 Tháng Tới" — và một lỗi CỔ PHÁP sai 11,4% số ngày |
| 37 | 2026-08 | `2026-08.md` | 🪝 VIRAL CORE cho 2 cron viết bài SEO — và nó ĐÃ CÓ SẴN trong repo |
| 38 | 2026-08 | `2026-08.md` | 🧱 Lượt render THẬT đầu tiên TRƯỢT — kho nền nằm ngoài git |
| 39 | 2026-08 | `2026-08.md` | 🔁 Vòng lặp trả bản CUỐI chứ không phải bản TỐT NHẤT · token TikTok · và pipeline CHƯA CHẠY THẬT lượt nào |
| 40 | 2026-08 | `2026-08.md` | 🏭 RÁP PIPELINE ĐĂNG CLIP — và cổng 2 KHÔNG chặn như tôi tưởng |
| 41 | 2026-08 | `2026-08.md` | 🎬 GỠ nhân vật, thay bằng NỀN VIDEO — nhân vật sai VAI chứ không chỉ xấu |
| 42 | 2026-08 | `2026-08.md` | 🏃 Nhịp ĐO ĐƯỢC là quá chậm · 14 tư thế · cảnh HAI người |
| 43 | 2026-08 | `2026-08.md` | 🕺 Nhân vật BIẾT CỬ ĐỘNG + 20 đạo cụ — và 4 lỗi chỉ lộ khi SOI KHUNG HÌNH |
| 44 | 2026-08 | `2026-08.md` | ✍️ ARC RA TỚI BẢN LUẬN GIẢI — `arcDoc` KHÁC `LUAN_ARC`, đừng dùng lẫn |
| 45 | 2026-08 | `2026-08.md` | 💸 Đường trả thưởng giới thiệu CHẾT TỪ LÚC VIẾT RA — `catch {}` giấu 6 ngày |
| 46 | 2026-08 | `2026-08.md` | 🤖 ĐỌC SỐ TRAFFIC: luôn dùng bản `_human` |
| 47 | 2026-08 | `2026-08.md` | 🩺 "sức khoẻ" gõ lối CŨ thì TRƯỢT bộ dò chủ đề — 3 bản chép tay cùng dính |
| 48 | 2026-08 | `2026-08.md` | 🔤 BIÊN TỪ KHÔNG CỨU ĐƯỢC TIẾNG VIỆT — mẫu phải là CỤM |
| 49 | 2026-08 | `2026-08.md` | 🔐 7 hàm SECURITY DEFINER hở `search_path` — và BỘ DÒ KHÔNG HỀ CANH NÓ |
| 50 | 2026-08 | `2026-08.md` | 🔐 Vá nốt 44 hàm SECDEF — và BỘ DÒ CỦA CHÍNH TÔI vẫn mù với lớp lỗi này |
| 51 | 2026-08 | `2026-08.md` | ✍️ 75% PROMPT LÀ LUẬT GIỌNG — arc 5 lớp THAY 3 bản bố cục chồng nhau |
| 52 | 2026-08 | `2026-08.md` | 🖼️ Hội đồng CHẤM HÌNH mà KHÔNG NHÌN THẤY HÌNH — và kho ảnh thật |
| 53 | 2026-08 | `2026-08.md` | 🧺 Kho ảnh THẬT + vá `buildTimeline`: hội đồng cuối cùng cũng nhìn thấy hình |
| 54 | 2026-08 | `2026-08.md` | 🎞️ Tuyển lại kho theo BRIEF + một-ảnh-một-clip |
| 55 | 2026-08 | `2026-08.md` | 🏭 Khâu dựng clip lên GitHub Actions — và một phép kiểm TÔI ĐẶT TÊN SAI |
| 56 | 2026-08 | `2026-08.md` | 📤 Đường clip ra kho — và KHÔNG đưa service key vào Actions |
| 57 | 2026-08 | `2026-08.md` | 🎬 18/18 công cụ miễn phí có kịch bản clip + công thức quay |
| 58 | 2026-08 | `2026-08.md` | 🎟️ Câu kết clip đọc TÊN MIỀN + MÃ, và bảng mã khuyến mãi |
| 59 | 2026-08 | `2026-08.md` | 🫂 Rail thành "Trò chuyện với Thầy" — 4 tầng, và vòng vá NHỊP HỘI THOẠI |
| 60 | 2026-08 | `2026-08.md` | 📺 3 video CÔNG KHAI lên NHẦM KÊNH — và không dòng code nào sai |
| 61 | 2026-08 | `2026-08.md` | 📘 Facebook: 33 bài, **0 bài từng đăng được** — lời khuyên chung chung |
| 62 | 2026-08 | `2026-08.md` | ▶️ "Chạy ngay" trả *Unknown job* — cùng một lỗi, lần thứ BA |
| 63 | 2026-08 | `2026-08.md` | ✏️ Kho hết CHỈ ĐỌC: sửa bài + trạng thái xuất bản |
| 64 | 2026-08 | `2026-08.md` | 📚 Kho Nội Dung: 1.140 tác phẩm, **15 từng ra khỏi website** |
| 65 | 2026-08 | `2026-08.md` | 📊 Số liệu nền tảng: YouTube đi bằng API KEY, KHÔNG dùng OAuth |
| 66 | 2026-08 | `2026-08.md` | 🕰️ Xác Định Giờ Sinh VỨT ĐI dữ kiện nó vừa bán — và sổ lá số dò form theo TÊN |
| 67 | 2026-08 | `2026-08.md` | 🔘 "Ko thấy nút Sửa ở đâu?" — NÚT CÓ, LỜI CHỈ ĐƯỜNG MỚI LÀ THỨ HỎNG |
| 68 | 2026-08 | `2026-08.md` | 🔌 `mcp-handler` 1 → 2: gỡ đúng cái workaround của chính mình |
| 69 | 2026-08 | `2026-08.md` | 🀄 Lục Nhâm CŨNG liệt kê được từ vựng — và lộ 3 chỗ rò |
| 70 | 2026-08 | `2026-08.md` | 🧷 Máy canh cho nhóm `wrap` — và nó lòi ra 13 trường + 1 lỗi #475 sót |
| 71 | 2026-08 | `2026-08.md` | 🧹 "2 tool mỏng quá" — CẦU CÓ THẬT, mình dựng SAI HÌNH DẠNG |
| 72 | 2026-08 | `2026-08.md` | 💾 "Chạy lại vẫn ra lá số cũ" — TÔI QUÊN BUMP `SHAPE` ở #475 |
| 73 | 2026-08 | `2026-08.md` | 🀄 QUÉT MẪU chỉ chứng minh được thứ mẫu CHẠM TỚI |
| 74 | 2026-08 | `2026-08.md` | 🔁 "Đã check hết chưa?" — CHƯA, và 4 tool nữa dính |
| 75 | 2026-08 | `2026-08.md` | 🀄 Rà tool khác cùng họ lỗi → Bát Tự: rail KHÔNG hề nhận Thập Thần |
| 76 | 2026-08 | `2026-08.md` | 🔴 `tsc --noEmit` XANH KHÔNG CHỨNG MINH `next build` CHẠY |
| 77 | 2026-08 | `2026-08.md` | 🔗 Luận Giải 24 phần bỏ qua data engine — MỐC SECTION HỎNG, bộ cắt CÂM |
| 78 | 2026-08 | `2026-08.md` | 🧭 Tool MỚI: Hướng Nghiệp Sớm Cho Con |
| 79 | 2026-08 | `2026-08.md` | 🧱 TypeScript 7 GỠ HẲN API BIÊN DỊCH — bump là vỡ bản dựng prod |
| 80 | 2026-08 | `2026-08.md` | 🧪 CI đo BẢN CŨ chứ không đo PR — cả 3 workflow sang preview |
| 81 | 2026-08 | `2026-08.md` | 🔐 Rail đòi ĐĂNG NHẬP với người ĐANG đăng nhập — đồng hồ ví chốt quá sớm |
| 82 | 2026-08 | `2026-08.md` | 🐞 Dạy Con: khung mới KHÔNG hiện — vì `portrait_cache` không có phiên bản SHAPE |
| 83 | 2026-08 | `2026-08.md` | 🧹 Vá nốt hai món nợ: rail cũ vô hình + `animation` trỏ vào keyframe ma |
| 84 | 2026-08 | `2026-08.md` | 🧒 Dạy Con: khung "5 TRỤC · 8 CHẤT" — bản luận có xương sống |
| 85 | 2026-08 | `2026-08.md` | 🖨️✦ Lưu PDF + orb mời hỏi — cùng đưa lên tầng SHELL |
| 86 | 2026-08 | `2026-08.md` | ⏱️ ETA TỰ HIỆU CHỈNH + `llm_usage` cuối cùng cũng có THỜI LƯỢNG |
| 87 | 2026-08 | `2026-08.md` | 🔗 Chia sẻ workspace: tính năng của SHELL, không phải của từng tool |
| 88 | 2026-08 | `2026-08.md` | 📏 LUẬT CHỈ BÁO CHỜ + mở orb ra toàn site |
| 89 | 2026-08 | `2026-08.md` | 🧭 Tử Vi Công Sở: thêm TẦNG NHÁNH NGHỀ |
| 90 | 2026-08 | `2026-08.md` | ✨ Orb chờ AI + `innerHTML` mỗi giây PHÁ animation |
| 91 | 2026-08 | `2026-08.md` | 🗺️ Sitemap: `lastmod` đang NÓI DỐI 647 URL mỗi ngày |
| 92 | 2026-08 | `2026-08.md` | 🕘 7 tool KHÔNG HỀ có lịch sử — và nhãn phiên suýt nói sai người |
| 93 | 2026-08 | `2026-08.md` | 🌓 Dark mode cho trang Tài khoản — gỡ nốt cái đảo sáng |
| 94 | 2026-08 | `2026-08.md` | 🌗 Dark mode: MÀU THƯƠNG HIỆU LÀ MẶT NỀN, đừng dùng làm chữ |
| 95 | 2026-08 | `2026-08.md` | 🕘 "Phiên gần đây": nhãn mô tả LÁ SỐ trong khi cái phân biệt là HỘI THOẠI |
| 96 | 2026-08 | `2026-08.md` | 🎯 M3 — Nhiệm vụ onboarding: đổi CÙNG khoản tiền lấy được gì |
| 97 | 2026-08 | `2026-08.md` | 🔤 Font lạc bầy + nhãn radar bị cắt ở Công Sở |
| 98 | 2026-08 | `2026-08.md` | 🧩 `npm run dev` thiếu bước dựng engine — và nó hỏng theo kiểu ĐÁNH LỪA |
| 99 | 2026-08 | `2026-08.md` | 🔒 Tấm khoá tính thử CẮT MẤT NÚT MỞ |
| 100 | 2026-08 | `2026-08.md` | 🧩 CSS CỦA TRANG ĐÈ VỠ FORM DÙNG CHUNG |
| 101 | 2026-08 | `2026-08.md` | 🔔 R1a — NỐI LẠI kênh nhắc hằng ngày |
| 102 | 2026-08 | `2026-08.md` | 🗂️ Ba bề mặt đọc chung MỘT cách xếp công cụ |
| 103 | 2026-08 | `2026-08.md` | 👥 Duyên Nợ Tiền Kiếp: 2 → tối đa 5 lá số |
| 104 | 2026-08 | `2026-08.md` | 🖼️ W1b — TÍNH THỬ MIỄN PHÍ cho 2 TOOL CHÂN DUNG |
| 105 | 2026-08 | `2026-08.md` | 🧑‍🤝‍🧑 Duyên Nợ Tiền Kiếp: nhân vật nào là lá số nào |
| 106 | 2026-08 | `2026-08.md` | 🔒 Trả nợ kỹ thuật: parser LLM giòn · `no-store` · 4 trang SEO |
| 107 | 2026-08 | `2026-08.md` | 📉 D1 — Phễu theo tool, và 🔴 BA HỆ TÊN TOOL ĐANG LỆCH NHAU |
| 108 | 2026-08 | `2026-08.md` | 🔓 W1 — TÍNH THỬ MIỄN PHÍ: bấm nút là tool CHẠY THẬT |
| 109 | 2026-08 | `2026-08.md` | 👶👥 T2 "Dạy Con" + T3 "Sổ Nhân Mạch" |
| 110 | 2026-08 | `2026-08.md` | 💸 Duyên Nợ Tiền Kiếp trừ tiền HAI LẦN — 3 lỗi chồng nhau |
| 111 | 2026-08 | `2026-08.md` | ⏳ Ảnh chậm gấp đôi vì ĐỔI MODEL, không phải hồi quy |
| 112 | 2026-08 | `2026-08.md` | 💼 Track click108 → tool MỚI "Tử Vi Công Sở" |
| 113 | 2026-08 | `2026-08.md` | 📸 Vận hôm nay: poster đủ thông tin · QR đo được · nhập lá số tại chỗ |
| 114 | 2026-08 | `2026-08.md` | 🔢 Track repo thần số học → vá 3 lỗi + mở 4→11 chỉ số |
| 115 | 2026-08 | `2026-08.md` | 🀄 Track repo Trung Quốc → Mai Hoa + Kỳ Môn + ảnh 9:16 |
| 116 | 2026-08 | `2026-08.md` | 🌌 Nâng 4 tool bằng mingyu-core + tool chiêm tinh Tây |
| 117 | 2026-08 | `2026-08.md` | 📅 Thẻ "Vận hôm nay" — và 🔴 3 công cụ đang tính SAI CAN CHI NGÀY |
| 118 | 2026-08 | `2026-08.md` | 🎴 Quẻ Phục Hy bằng hình — 64 tranh + cổ pháp đọc quẻ |
| 119 | 2026-08 | `2026-08.md` | 🧰 Admin: tách trang · mobile · GIỮ PHIÊN đăng nhập |
| 120 | 2026-08 | `2026-08.md` | 📡 M3b — 3 kênh auto THẬT: Instagram · Threads · Telegram channel |
| 121 | 2026-08 | `2026-08.md` | 🌱 Trợ lý seeding group — máy soạn, NGƯỜI dán |
| 122 | 2026-08 | `2026-08.md` | 📹 Track Media Pipeline — kênh phân phối, KHÔNG phải SEO |
| 123 | 2026-08 | `2026-08.md` | 🧭 Track CMO skills — brand-check, từ khoá, SEO |
| 124 | 2026-07 | `2026-07.md` | 🎙️ CMO SKILLS — B1 Brand Voice XONG, và 2 tiền đề của brief là SAI |
| 125 | 2026-07 | `2026-07.md` | 💸 ĐO DOANH THU ĐANG BỊA 78% |
| 126 | 2026-07 | `2026-07.md` | 🎨 Trang topup dựng lại + ĐƯỜNG ICON DÙNG CHUNG BỊ HỎNG |
| 127 | 2026-08 | `2026-08.md` | 🖼️ Sinh ảnh: gpt-image-1 → gpt-image-2 |
| 128 | 2026-07 | `2026-07.md` | 🚨 Vá cảnh báo 10:00 VN 30/07 — BỘ DÒ ĐANG NÓI DỐI |
| 122 | — | `track-cu.md` | 🧭 Marketing Autopilot + CMO Orchestrator Quân Sư |
| 130 | 2026-07 | `2026-07.md` | 🔌 Đọc GA4 từ terminal — `scripts/ga4.mjs` |
| 131 | 2026-07 | `2026-07.md` | 🧭 Ba lớp danh xưng: Quan Lộc × Mệnh × Thân — 194 → 566 |
| 132 | 2026-07 | `2026-07.md` | 🎭 Chức phận theo CẶP chính tinh — 82 → 194 danh xưng |
| 133 | 2026-07 | `2026-07.md` | 💾 Cache kết quả 2 tool chân dung theo lá số |
| 134 | 2026-07 | `2026-07.md` | 🔁 TRACK MỚI — Viral Loop cho 2 tool chân dung |
| 135 | 2026-07 | `2026-07.md` | 🏯 Tool mới — "Chân Dung Tiền Kiếp" |
| 136 | 2026-07 | `2026-07.md` | 🔀 Provider routing rail — fallback HAI CHIỀU |
| 137 | 2026-07 | `2026-07.md` | 🆕 Tool mới — "Chân Dung Vợ Chồng" |
| 131 | — | `track-cu.md` | 🟣 ĐANG LÀM — Admin Revamp + Marketing/Conversion Tracking |
| 132 | — | `track-cu.md` | 🟢 ĐANG LÀM — App-shell "/app" (không gian làm việc đa công cụ) |
| 133 | — | `track-cu.md` | 🗂️ Track cũ — Chat-first / Contract v1 (đa nền tảng) |
| 134 | — | `track-cu.md` | 🗄️ Track cũ (song song) — ISR Lá Số SEO (438K pages) |
| 142 | 2026-08 | `2026-08.md` | 💰 "Vận Hạn 12 Tháng Tới" ăn theo Code #1 — cache chia sẻ CẢ 16 lượt, không riêng 4 |
| 143 | 2026-08 | `2026-08.md` | 🗞️ Hàng đợi đề tài cạn — `topic-topup` vẫn dùng `JSON.parse` trần trong khi repo đã có bản chắc hơn |
| 144 | 2026-08 | `2026-08.md` | 📡 Tracker "đang online" trên shell — SỐ THẬT qua RPC `pulse_stats()`, không mô phỏng |
| 145 | 2026-08 | `2026-08.md` | 🎭 Tracker "đang online" — đảo ngược sang MÔ PHỎNG theo Henry, sau khi số thật ra 0/0 |
| 146 | 2026-08 | `2026-08.md` | 💳 Chuyển PayPal sang account công ty — rà đường tiền lộ 4 lỗi, `ignore-duplicates` chưa từng có tác dụng |
| 147 | 2026-08 | `2026-08.md` | 💳 PayPal live lượt đầu: thẻ hết tiền, câu báo lỗi vô dụng, webhook câm — và bẫy top-25 của log Vercel |
| 148 | 2026-08 | `2026-08.md` | 🕰️ Xác Định Giờ Sinh: hỏi trẻ em thứ chúng CÓ, thôi hỏi thứ chúng chưa có (PR #506) |
| 149 | 2026-08 | `2026-08.md` | 🔭 "Ai Sinh Cùng Ngày Với Bạn" — ĐO trước khi xây |
| 150 | 2026-08 | `2026-08.md` | 🌒 `solarToLunar` BỊA lá số cho mọi ngày trước 1900 — im lặng |
| 151 | 2026-08 | `2026-08.md` | 🎂 Cắm khối "Ai Sinh Cùng Ngày Với Bạn" vào Luận Giải + Bát Tự |
| 152 | 2026-08 | `2026-08.md` | 🖼️ Kéo ảnh người nổi tiếng về Supabase Storage — thôi hotlink Wikimedia Commons |
| 153 | 2026-08 | `2026-08.md` | 🎭 Tracker "đang online" — MÔ PHỎNG nới biên độ lên hàng nghìn, tick 5-10s |
| 154 | 2026-08 | `2026-08.md` | 📮 Hộp Thư Góp Ý trong Tài khoản — chọn KHÔNG làm chatbot sản phẩm |
| 155 | 2026-08 | `2026-08.md` | 👍👎 Lớp 1 — nút góp ý gắn NGAY dưới bản luận giải |
| 156 | 2026-08 | `2026-08.md` | 🔐 Chốt đơn chuyển khoản nguyên tử + một chuỗi nội dung CK duy nhất |
| 157 | 2026-08 | `2026-08.md` | 🔐 Đợt 3 vá `search_path` SECDEF — 2/3 hàm là HỒI QUY, không phải hàm mới |
| 158 | 2026-08 | `2026-08.md` | 📉 Meta Pixel chưa từng bắn Purchase/CompleteRegistration — Henry tắt ads vì "chả convert" |
| 159 | 2026-09 | `2026-09.md` | 🌙 P1 — sinh lại `_LUNAR_TABLE` bằng thuật toán chính xác của oracle, không chỉ "sửa tz 1968" |
| 160 | 2026-09 | `2026-09.md` | ⭐ P2 — sửa 5 bảng tra sao lệch oracle: đúng 1-2 dòng sai/bảng, không phải công thức sai |
| 161 | 2026-09 | `2026-09.md` | 🧭 P3 — Kình-Đà + Tiểu Hạn + Tứ Hóa can Canh sang trường phái Thiên Lương; La-Võng dời sang P4 |
| 162 | 2026-09 | `2026-09.md` | 🕸️ P4 — La-Võng: từ 2 sao cố định Thìn/Tuất sang NHÃN của Đà La |
| 163 | 2026-09 | `2026-09.md` | 🚀 Tứ Hóa Phi Tinh + 2 vá hiển thị mobile trên lá số |
| 164 | 2026-09 | `2026-09.md` | 🔌 Tứ Hóa Phi Tinh — nối dữ kiện vào prompt luận giải |
