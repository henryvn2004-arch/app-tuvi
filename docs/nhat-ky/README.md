# Nhật ký phát triển — mục lục

141 mục ghi chép từng PR, tách khỏi `CLAUDE.md` để nó thôi ngốn ~350k token mỗi lượt.
**Ba file dưới đây KHÔNG được nạp tự động.** Cần thì tra:

```bash
grep -n 'từ khoá' docs/nhat-ky/*.md          # tìm mục
grep -n '^## ' docs/nhat-ky/2026-08.md       # liệt kê tiêu đề
sed -n '120,190p' docs/nhat-ky/2026-08.md    # đọc đúng đoạn, đừng cat cả file
```

| file | số mục | dung lượng |
|---|---:|---:|
| `2026-08.md` | 124 | 928,579 B |
| `2026-07.md` | 12 | 154,531 B |
| `track-cu.md` | 5 | 89,354 B |

Luật rút ra từ các mục này đã được cô đọng lên `CLAUDE.md`. Ở đây giữ phần *vì sao*,
*đo ra sao*, *bẫy nào đã vấp* — thứ chỉ cần khi đụng đúng vùng đó.

---

## Danh sách

| # | tháng | file | mục |
|---:|---|---|---|
| 1 | 2026-08 | `2026-08.md` | ✍️ Bút Tướng — thêm "ký theo chữ nào trong tên?", CHỈ để narrate |
| 2 | 2026-08 | `2026-08.md` | 🪝 Bút Tướng — gắn `arcDoc` (họ 3) vào bài luận, đã thiếu HẲN lớp hook |
| 3 | 2026-08 | `2026-08.md` | ✍️ Bút Tướng — tool xem chữ ký, engine đo 6 trục chạy Ở CLIENT |
| 4 | 2026-08 | `2026-08.md` | 🆓 UI "Số Đẹp" — 100% client-side, KHÔNG chạm LLM/route/paywall |
| 5 | 2026-08 | `2026-08.md` | 🎲 Generator "Số Đẹp" — gợi ý số bằng random-walk có seed, 0đ |
| 6 | 2026-08 | `2026-08.md` | 🔢 Engine "Số Đẹp" — Bát Tinh + Quẻ Dịch + Ngũ Hành + Âm Dương, 0đ |
| 7 | 2026-08 | `2026-08.md` | 🀄 Bảng Du Niên Bát Trạch — 3 bản chép tay tự mâu thuẫn, nay SINH bằng thuật toán |
| 8 | 2026-08 | `2026-08.md` | 💸 Rail chat gỡ carve-out Opus primary — quay về Gemini Flash toàn bộ |
| 9 | 2026-08 | `2026-08.md` | 🔀 Kimi K3 xuống lưới đỡ cuối cùng, Opus 5 primary cho 7 tool "luận giải" |
| 10 | 2026-08 | `2026-08.md` | 🧭 Coachmark 3 điểm → 6–7 điểm — đi hết các mặt chính của sản phẩm |
| 11 | 2026-08 | `2026-08.md` | 🚀 "Khởi Hành" thay M3 + coachmark 3 điểm — onboarding cho web |
| 12 | 2026-08 | `2026-08.md` | 🔄 Card "Khoe Kết Quả" trong Nhiệm Vụ → "Chia Sẻ" — #599 đã gỡ nút, câu hỏi đo click |
| 13 | 2026-08 | `2026-08.md` | 🏆 Tab "Nhiệm Vụ" trong Tài Khoản — gom Khởi Hành, Mời Bạn, lịch sử Khoe Kết Quả |
| 14 | 2026-08 | `2026-08.md` | 📣 Track Quest/Gamification — "Khoe Kết Quả" + "Rủ so lá số" |
| 15 | 2026-08 | `2026-08.md` | ✂️ Audit `trim_la_so` — chỉ CÒN 1 chỗ cắt thật, đã bỏ |
| 16 | 2026-08 | `2026-08.md` | 📣 TRACK DIGITAL MARKETING — 14/14 mục, và 3 giả định của tôi bị SỐ ĐO bác |
| 17 | 2026-08 | `2026-08.md` | 💰 Track Tối Ưu Chi Phí Opus — Code #1 + #2 đã push lên PR #585 (chờ merge+deploy), #3 vẫn chặn |
| 18 | 2026-08 | `2026-08.md` | 🌙 Vận Hạn 12 Tháng đổi sang KHUNG THÁNG ÂM — hết cảnh "nửa đầu / nửa sau" |
| 19 | 2026-08 | `2026-08.md` | 🌙 Rail `tra_nguyet_van` đổi sang tháng ÂM — nốt "đường dùng chung" đã né ở PR trước |
| 20 | 2026-08 | `2026-08.md` | ⏱️ Timeout 30 giây: KHÔNG phải đường tiền, và engine vô can |
| 21 | 2026-08 | `2026-08.md` | 🔤 Ảnh OG: chẩn đoán vòng 1 SAI, bản vá của tôi đẻ ra lỗi MỚI |
| 22 | 2026-08 | `2026-08.md` | 📡 BẢN ĐỒ 8 KÊNH SOCIAL — audit trước khi ráp Telegram + vá Facebook |
| 23 | 2026-08 | `2026-08.md` | 🔮 Thêm lớp DỰ BÁO vào arc ô GIỮA — và arc ô giữa KHÔNG phải 5 lớp |
| 24 | 2026-08 | `2026-08.md` | 🖼️ Ảnh preview link chia sẻ HỎNG 108 lượt/tuần — và chẩn đoán ĐẦU của tôi SAI |
| 25 | 2026-08 | `2026-08.md` | 📅 Tool MỚI "Vận Hạn 12 Tháng Tới" — và một lỗi CỔ PHÁP sai 11,4% số ngày |
| 26 | 2026-08 | `2026-08.md` | 🪝 VIRAL CORE cho 2 cron viết bài SEO — và nó ĐÃ CÓ SẴN trong repo |
| 27 | 2026-08 | `2026-08.md` | 🧱 Lượt render THẬT đầu tiên TRƯỢT — kho nền nằm ngoài git |
| 28 | 2026-08 | `2026-08.md` | 🔁 Vòng lặp trả bản CUỐI chứ không phải bản TỐT NHẤT · token TikTok · và pipeline CHƯA CHẠY THẬT lượt nào |
| 29 | 2026-08 | `2026-08.md` | 🏭 RÁP PIPELINE ĐĂNG CLIP — và cổng 2 KHÔNG chặn như tôi tưởng |
| 30 | 2026-08 | `2026-08.md` | 🎬 GỠ nhân vật, thay bằng NỀN VIDEO — nhân vật sai VAI chứ không chỉ xấu |
| 31 | 2026-08 | `2026-08.md` | 🏃 Nhịp ĐO ĐƯỢC là quá chậm · 14 tư thế · cảnh HAI người |
| 32 | 2026-08 | `2026-08.md` | 🕺 Nhân vật BIẾT CỬ ĐỘNG + 20 đạo cụ — và 4 lỗi chỉ lộ khi SOI KHUNG HÌNH |
| 33 | 2026-08 | `2026-08.md` | ✍️ ARC RA TỚI BẢN LUẬN GIẢI — `arcDoc` KHÁC `LUAN_ARC`, đừng dùng lẫn |
| 34 | 2026-08 | `2026-08.md` | 💸 Đường trả thưởng giới thiệu CHẾT TỪ LÚC VIẾT RA — `catch {}` giấu 6 ngày |
| 35 | 2026-08 | `2026-08.md` | 🤖 ĐỌC SỐ TRAFFIC: luôn dùng bản `_human` |
| 36 | 2026-08 | `2026-08.md` | 🩺 "sức khoẻ" gõ lối CŨ thì TRƯỢT bộ dò chủ đề — 3 bản chép tay cùng dính |
| 37 | 2026-08 | `2026-08.md` | 🔤 BIÊN TỪ KHÔNG CỨU ĐƯỢC TIẾNG VIỆT — mẫu phải là CỤM |
| 38 | 2026-08 | `2026-08.md` | 🔐 7 hàm SECURITY DEFINER hở `search_path` — và BỘ DÒ KHÔNG HỀ CANH NÓ |
| 39 | 2026-08 | `2026-08.md` | 🔐 Vá nốt 44 hàm SECDEF — và BỘ DÒ CỦA CHÍNH TÔI vẫn mù với lớp lỗi này |
| 40 | 2026-08 | `2026-08.md` | ✍️ 75% PROMPT LÀ LUẬT GIỌNG — arc 5 lớp THAY 3 bản bố cục chồng nhau |
| 41 | 2026-08 | `2026-08.md` | 🖼️ Hội đồng CHẤM HÌNH mà KHÔNG NHÌN THẤY HÌNH — và kho ảnh thật |
| 42 | 2026-08 | `2026-08.md` | 🧺 Kho ảnh THẬT + vá `buildTimeline`: hội đồng cuối cùng cũng nhìn thấy hình |
| 43 | 2026-08 | `2026-08.md` | 🎞️ Tuyển lại kho theo BRIEF + một-ảnh-một-clip |
| 44 | 2026-08 | `2026-08.md` | 🏭 Khâu dựng clip lên GitHub Actions — và một phép kiểm TÔI ĐẶT TÊN SAI |
| 45 | 2026-08 | `2026-08.md` | 📤 Đường clip ra kho — và KHÔNG đưa service key vào Actions |
| 46 | 2026-08 | `2026-08.md` | 🎬 18/18 công cụ miễn phí có kịch bản clip + công thức quay |
| 47 | 2026-08 | `2026-08.md` | 🎟️ Câu kết clip đọc TÊN MIỀN + MÃ, và bảng mã khuyến mãi |
| 48 | 2026-08 | `2026-08.md` | 🫂 Rail thành "Trò chuyện với Thầy" — 4 tầng, và vòng vá NHỊP HỘI THOẠI |
| 49 | 2026-08 | `2026-08.md` | 📺 3 video CÔNG KHAI lên NHẦM KÊNH — và không dòng code nào sai |
| 50 | 2026-08 | `2026-08.md` | 📘 Facebook: 33 bài, **0 bài từng đăng được** — lời khuyên chung chung |
| 51 | 2026-08 | `2026-08.md` | ▶️ "Chạy ngay" trả *Unknown job* — cùng một lỗi, lần thứ BA |
| 52 | 2026-08 | `2026-08.md` | ✏️ Kho hết CHỈ ĐỌC: sửa bài + trạng thái xuất bản |
| 53 | 2026-08 | `2026-08.md` | 📚 Kho Nội Dung: 1.140 tác phẩm, **15 từng ra khỏi website** |
| 54 | 2026-08 | `2026-08.md` | 📊 Số liệu nền tảng: YouTube đi bằng API KEY, KHÔNG dùng OAuth |
| 55 | 2026-08 | `2026-08.md` | 🕰️ Xác Định Giờ Sinh VỨT ĐI dữ kiện nó vừa bán — và sổ lá số dò form theo TÊN |
| 56 | 2026-08 | `2026-08.md` | 🔘 "Ko thấy nút Sửa ở đâu?" — NÚT CÓ, LỜI CHỈ ĐƯỜNG MỚI LÀ THỨ HỎNG |
| 57 | 2026-08 | `2026-08.md` | 🔌 `mcp-handler` 1 → 2: gỡ đúng cái workaround của chính mình |
| 58 | 2026-08 | `2026-08.md` | 🀄 Lục Nhâm CŨNG liệt kê được từ vựng — và lộ 3 chỗ rò |
| 59 | 2026-08 | `2026-08.md` | 🧷 Máy canh cho nhóm `wrap` — và nó lòi ra 13 trường + 1 lỗi #475 sót |
| 60 | 2026-08 | `2026-08.md` | 🧹 "2 tool mỏng quá" — CẦU CÓ THẬT, mình dựng SAI HÌNH DẠNG |
| 61 | 2026-08 | `2026-08.md` | 💾 "Chạy lại vẫn ra lá số cũ" — TÔI QUÊN BUMP `SHAPE` ở #475 |
| 62 | 2026-08 | `2026-08.md` | 🀄 QUÉT MẪU chỉ chứng minh được thứ mẫu CHẠM TỚI |
| 63 | 2026-08 | `2026-08.md` | 🔁 "Đã check hết chưa?" — CHƯA, và 4 tool nữa dính |
| 64 | 2026-08 | `2026-08.md` | 🀄 Rà tool khác cùng họ lỗi → Bát Tự: rail KHÔNG hề nhận Thập Thần |
| 65 | 2026-08 | `2026-08.md` | 🔴 `tsc --noEmit` XANH KHÔNG CHỨNG MINH `next build` CHẠY |
| 66 | 2026-08 | `2026-08.md` | 🔗 Luận Giải 24 phần bỏ qua data engine — MỐC SECTION HỎNG, bộ cắt CÂM |
| 67 | 2026-08 | `2026-08.md` | 🧭 Tool MỚI: Hướng Nghiệp Sớm Cho Con |
| 68 | 2026-08 | `2026-08.md` | 🧱 TypeScript 7 GỠ HẲN API BIÊN DỊCH — bump là vỡ bản dựng prod |
| 69 | 2026-08 | `2026-08.md` | 🧪 CI đo BẢN CŨ chứ không đo PR — cả 3 workflow sang preview |
| 70 | 2026-08 | `2026-08.md` | 🔐 Rail đòi ĐĂNG NHẬP với người ĐANG đăng nhập — đồng hồ ví chốt quá sớm |
| 71 | 2026-08 | `2026-08.md` | 🐞 Dạy Con: khung mới KHÔNG hiện — vì `portrait_cache` không có phiên bản SHAPE |
| 72 | 2026-08 | `2026-08.md` | 🧹 Vá nốt hai món nợ: rail cũ vô hình + `animation` trỏ vào keyframe ma |
| 73 | 2026-08 | `2026-08.md` | 🧒 Dạy Con: khung "5 TRỤC · 8 CHẤT" — bản luận có xương sống |
| 74 | 2026-08 | `2026-08.md` | 🖨️✦ Lưu PDF + orb mời hỏi — cùng đưa lên tầng SHELL |
| 75 | 2026-08 | `2026-08.md` | ⏱️ ETA TỰ HIỆU CHỈNH + `llm_usage` cuối cùng cũng có THỜI LƯỢNG |
| 76 | 2026-08 | `2026-08.md` | 🔗 Chia sẻ workspace: tính năng của SHELL, không phải của từng tool |
| 77 | 2026-08 | `2026-08.md` | 📏 LUẬT CHỈ BÁO CHỜ + mở orb ra toàn site |
| 78 | 2026-08 | `2026-08.md` | 🧭 Tử Vi Công Sở: thêm TẦNG NHÁNH NGHỀ |
| 79 | 2026-08 | `2026-08.md` | ✨ Orb chờ AI + `innerHTML` mỗi giây PHÁ animation |
| 80 | 2026-08 | `2026-08.md` | 🗺️ Sitemap: `lastmod` đang NÓI DỐI 647 URL mỗi ngày |
| 81 | 2026-08 | `2026-08.md` | 🕘 7 tool KHÔNG HỀ có lịch sử — và nhãn phiên suýt nói sai người |
| 82 | 2026-08 | `2026-08.md` | 🌓 Dark mode cho trang Tài khoản — gỡ nốt cái đảo sáng |
| 83 | 2026-08 | `2026-08.md` | 🌗 Dark mode: MÀU THƯƠNG HIỆU LÀ MẶT NỀN, đừng dùng làm chữ |
| 84 | 2026-08 | `2026-08.md` | 🕘 "Phiên gần đây": nhãn mô tả LÁ SỐ trong khi cái phân biệt là HỘI THOẠI |
| 85 | 2026-08 | `2026-08.md` | 🎯 M3 — Nhiệm vụ onboarding: đổi CÙNG khoản tiền lấy được gì |
| 86 | 2026-08 | `2026-08.md` | 🔤 Font lạc bầy + nhãn radar bị cắt ở Công Sở |
| 87 | 2026-08 | `2026-08.md` | 🧩 `npm run dev` thiếu bước dựng engine — và nó hỏng theo kiểu ĐÁNH LỪA |
| 88 | 2026-08 | `2026-08.md` | 🔒 Tấm khoá tính thử CẮT MẤT NÚT MỞ |
| 89 | 2026-08 | `2026-08.md` | 🧩 CSS CỦA TRANG ĐÈ VỠ FORM DÙNG CHUNG |
| 90 | 2026-08 | `2026-08.md` | 🔔 R1a — NỐI LẠI kênh nhắc hằng ngày |
| 91 | 2026-08 | `2026-08.md` | 🗂️ Ba bề mặt đọc chung MỘT cách xếp công cụ |
| 92 | 2026-08 | `2026-08.md` | 👥 Duyên Nợ Tiền Kiếp: 2 → tối đa 5 lá số |
| 93 | 2026-08 | `2026-08.md` | 🖼️ W1b — TÍNH THỬ MIỄN PHÍ cho 2 TOOL CHÂN DUNG |
| 94 | 2026-08 | `2026-08.md` | 🧑‍🤝‍🧑 Duyên Nợ Tiền Kiếp: nhân vật nào là lá số nào |
| 95 | 2026-08 | `2026-08.md` | 🔒 Trả nợ kỹ thuật: parser LLM giòn · `no-store` · 4 trang SEO |
| 96 | 2026-08 | `2026-08.md` | 📉 D1 — Phễu theo tool, và 🔴 BA HỆ TÊN TOOL ĐANG LỆCH NHAU |
| 97 | 2026-08 | `2026-08.md` | 🔓 W1 — TÍNH THỬ MIỄN PHÍ: bấm nút là tool CHẠY THẬT |
| 98 | 2026-08 | `2026-08.md` | 👶👥 T2 "Dạy Con" + T3 "Sổ Nhân Mạch" |
| 99 | 2026-08 | `2026-08.md` | 💸 Duyên Nợ Tiền Kiếp trừ tiền HAI LẦN — 3 lỗi chồng nhau |
| 100 | 2026-08 | `2026-08.md` | ⏳ Ảnh chậm gấp đôi vì ĐỔI MODEL, không phải hồi quy |
| 101 | 2026-08 | `2026-08.md` | 💼 Track click108 → tool MỚI "Tử Vi Công Sở" |
| 102 | 2026-08 | `2026-08.md` | 📸 Vận hôm nay: poster đủ thông tin · QR đo được · nhập lá số tại chỗ |
| 103 | 2026-08 | `2026-08.md` | 🔢 Track repo thần số học → vá 3 lỗi + mở 4→11 chỉ số |
| 104 | 2026-08 | `2026-08.md` | 🀄 Track repo Trung Quốc → Mai Hoa + Kỳ Môn + ảnh 9:16 |
| 105 | 2026-08 | `2026-08.md` | 🌌 Nâng 4 tool bằng mingyu-core + tool chiêm tinh Tây |
| 106 | 2026-08 | `2026-08.md` | 📅 Thẻ "Vận hôm nay" — và 🔴 3 công cụ đang tính SAI CAN CHI NGÀY |
| 107 | 2026-08 | `2026-08.md` | 🎴 Quẻ Phục Hy bằng hình — 64 tranh + cổ pháp đọc quẻ |
| 108 | 2026-08 | `2026-08.md` | 🧰 Admin: tách trang · mobile · GIỮ PHIÊN đăng nhập |
| 109 | 2026-08 | `2026-08.md` | 📡 M3b — 3 kênh auto THẬT: Instagram · Threads · Telegram channel |
| 110 | 2026-08 | `2026-08.md` | 🌱 Trợ lý seeding group — máy soạn, NGƯỜI dán |
| 111 | 2026-08 | `2026-08.md` | 📹 Track Media Pipeline — kênh phân phối, KHÔNG phải SEO |
| 112 | 2026-08 | `2026-08.md` | 🧭 Track CMO skills — brand-check, từ khoá, SEO |
| 113 | 2026-07 | `2026-07.md` | 🎙️ CMO SKILLS — B1 Brand Voice XONG, và 2 tiền đề của brief là SAI |
| 114 | 2026-07 | `2026-07.md` | 💸 ĐO DOANH THU ĐANG BỊA 78% |
| 115 | 2026-07 | `2026-07.md` | 🎨 Trang topup dựng lại + ĐƯỜNG ICON DÙNG CHUNG BỊ HỎNG |
| 116 | 2026-08 | `2026-08.md` | 🖼️ Sinh ảnh: gpt-image-1 → gpt-image-2 |
| 117 | 2026-07 | `2026-07.md` | 🚨 Vá cảnh báo 10:00 VN 30/07 — BỘ DÒ ĐANG NÓI DỐI |
| 118 | — | `track-cu.md` | 🧭 Marketing Autopilot + CMO Orchestrator Quân Sư |
| 119 | 2026-07 | `2026-07.md` | 🔌 Đọc GA4 từ terminal — `scripts/ga4.mjs` |
| 120 | 2026-07 | `2026-07.md` | 🧭 Ba lớp danh xưng: Quan Lộc × Mệnh × Thân — 194 → 566 |
| 121 | 2026-07 | `2026-07.md` | 🎭 Chức phận theo CẶP chính tinh — 82 → 194 danh xưng |
| 122 | 2026-07 | `2026-07.md` | 💾 Cache kết quả 2 tool chân dung theo lá số |
| 123 | 2026-07 | `2026-07.md` | 🔁 TRACK MỚI — Viral Loop cho 2 tool chân dung |
| 124 | 2026-07 | `2026-07.md` | 🏯 Tool mới — "Chân Dung Tiền Kiếp" |
| 125 | 2026-07 | `2026-07.md` | 🔀 Provider routing rail — fallback HAI CHIỀU |
| 126 | 2026-07 | `2026-07.md` | 🆕 Tool mới — "Chân Dung Vợ Chồng" |
| 127 | — | `track-cu.md` | 🟣 ĐANG LÀM — Admin Revamp + Marketing/Conversion Tracking |
| 128 | — | `track-cu.md` | 🟢 ĐANG LÀM — App-shell "/app" (không gian làm việc đa công cụ) |
| 129 | — | `track-cu.md` | 🗂️ Track cũ — Chat-first / Contract v1 (đa nền tảng) |
| 130 | — | `track-cu.md` | 🗄️ Track cũ (song song) — ISR Lá Số SEO (438K pages) |
| 131 | 2026-08 | `2026-08.md` | 💰 "Vận Hạn 12 Tháng Tới" ăn theo Code #1 — cache chia sẻ CẢ 16 lượt, không riêng 4 |
| 132 | 2026-08 | `2026-08.md` | 🗞️ Hàng đợi đề tài cạn — `topic-topup` vẫn dùng `JSON.parse` trần trong khi repo đã có bản chắc hơn |
| 133 | 2026-08 | `2026-08.md` | 📡 Tracker "đang online" trên shell — SỐ THẬT qua RPC `pulse_stats()`, không mô phỏng |
| 134 | 2026-08 | `2026-08.md` | 🎭 Tracker "đang online" — đảo ngược sang MÔ PHỎNG theo Henry, sau khi số thật ra 0/0 |
| 135 | 2026-08 | `2026-08.md` | 💳 Chuyển PayPal sang account công ty — rà đường tiền lộ 4 lỗi, `ignore-duplicates` chưa từng có tác dụng |
