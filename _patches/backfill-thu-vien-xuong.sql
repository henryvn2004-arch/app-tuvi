-- ============================================================
-- ĐÃ ÁP LÊN PRODUCTION 2026-09-19. Giữ lại làm hồ sơ, KHÔNG chạy lại —
-- `update` không có `where xuong is null` nên chạy lại vẫn an toàn (idempotent,
-- ghi đè cùng giá trị) nhưng không có gì để chạy lại vì thư viện tái tạo:
--
--   node scripts/gen-thu-vien-index.mjs --out <path> \
--     --tu-dien-snapshot <path chứa {slug,ten,loai} của tu_dien> \
--     --sql-out <path>
--
-- Kết quả: 78/88 dòng `sao-tu-vi` + 12/12 dòng `cung-tu-vi` được đắp `xuong`.
-- 10 dòng `sao-tu-vi` còn lại KHÔNG đắp (nhóm/khái niệm không khớp một sao
-- đơn nào trong engine, hoặc "Tả Phù"/"Thiên Diêu" khác hẳn "Tả Phụ"/
-- "Thiên Riêu" — xem _patches/migration-thu-vien.sql để biết đầy đủ lý do).
-- ============================================================
-- Đắp `xuong` vào tu_dien — SINH TỰ ĐỘNG bởi scripts/gen-thu-vien-index.mjs.
-- CHỈ set xuong (dữ kiện tất định), KHÔNG đụng ten/slug/content.
begin;
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thổ","yin_yang":"dương","weight":10,"traits":["uy quyền","tài lộc","phúc đức"],"positions":{"mien":["Tỵ","Ngọ","Dần","Thân"],"vuong":["Thìn","Tuất"],"dac":["Sửu","Mùi"],"binh":["Hợi","Tý","Mão","Dậu"]}}'::jsonb where slug = 'sao-tu-vi';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"hỏa","yin_yang":"âm","weight":8,"traits":["quan lộc","hình ngục","đào hoa"],"positions":{"mien":["Thìn","Tuất"],"vuong":["Tý","Ngọ","Dần","Thân"],"dac":["Sửu","Mùi"],"ham":["Tỵ","Hợi","Mão","Dậu"]}}'::jsonb where slug = 'sao-liem-trinh';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thủy","yin_yang":"dương","weight":7,"traits":["phúc thọ","hiền hòa"],"positions":{"mien":["Dần","Thân"],"vuong":["Tý"],"dac":["Mão","Tỵ","Hợi"],"ham":["Ngọ","Dậu","Thìn","Tuất","Sửu","Mùi"]}}'::jsonb where slug = 'sao-thien-dong';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"kim","yin_yang":"âm","weight":9,"traits":["tài lộc","cương nghị"],"positions":{"mien":["Thìn","Tuất","Sửu","Mùi"],"vuong":["Dần","Thân","Tý","Ngọ"],"dac":["Mão","Dậu"],"ham":["Tỵ","Hợi"]}}'::jsonb where slug = 'sao-vu-khuc';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"hỏa","yin_yang":"dương","weight":9,"traits":["quan lộc","uy quyền"],"positions":{"mien":["Tỵ","Ngọ"],"vuong":["Dần","Mão","Thìn"],"dac":["Sửu","Mùi"],"ham":["Thân","Dậu","Tuất","Hợi","Tý"]}}'::jsonb where slug = 'sao-thai-duong';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"mộc","yin_yang":"âm","weight":8,"traits":["trí tuệ","mưu cơ"],"positions":{"mien":["Thìn","Tuất","Mão","Dậu"],"vuong":["Tỵ","Thân"],"dac":["Tý","Ngọ","Sửu","Mùi"],"ham":["Dần","Hợi"]}}'::jsonb where slug = 'sao-thien-co';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thổ","yin_yang":"âm","weight":9,"traits":["kho tàng","tài lộc"],"positions":{"mien":["Dần","Thân","Tý","Ngọ"],"vuong":["Thìn","Tuất"],"dac":["Tỵ","Hợi","Mùi"],"binh":["Mão","Dậu","Sửu"]}}'::jsonb where slug = 'sao-thien-phu';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thủy","yin_yang":"âm","weight":9,"traits":["điền trạch","phú quý"],"positions":{"mien":["Dậu","Tuất","Hợi"],"vuong":["Thân","Tý"],"dac":["Sửu","Mùi"],"ham":["Dần","Mão","Thìn","Tỵ","Ngọ"]}}'::jsonb where slug = 'sao-thai-am';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thủy","yin_yang":"âm","weight":8,"traits":["dục vọng","tài lộc"],"positions":{"mien":["Sửu","Mùi"],"vuong":["Thìn","Tuất"],"dac":["Dần","Thân"],"ham":["Tỵ","Hợi","Tý","Ngọ","Mão","Dậu"]}}'::jsonb where slug = 'sao-tham-lang';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thủy","yin_yang":"âm","weight":8,"traits":["thị phi","ngôn ngữ"],"positions":{"mien":["Mão","Dậu"],"vuong":["Tý","Ngọ","Dần"],"dac":["Thân","Hợi"],"ham":["Thìn","Tuất","Sửu","Mùi","Tỵ"]}}'::jsonb where slug = 'sao-cu-mon';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thủy","yin_yang":"dương","weight":8,"traits":["phò tá","quan lộc"],"positions":{"mien":["Dần","Thân"],"vuong":["Thìn","Tuất","Tý","Ngọ"],"dac":["Sửu","Mùi","Tỵ","Hợi"],"ham":["Mão","Dậu"]}}'::jsonb where slug = 'sao-thien-tuong';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"mộc","yin_yang":"âm","weight":8,"traits":["phúc thọ","giải ách"],"positions":{"mien":["Ngọ","Thìn","Tuất"],"vuong":["Tý","Mão","Dần","Thân"],"dac":["Sửu","Mùi"],"ham":["Dậu","Tỵ","Hợi"]}}'::jsonb where slug = 'sao-thien-luong';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"kim","yin_yang":"dương","weight":9,"traits":["sát phạt","quyền lực"],"positions":{"mien":["Dần","Thân","Tý","Ngọ"],"vuong":["Tỵ","Hợi"],"dac":["Sửu","Mùi"],"ham":["Mão","Dậu","Thìn","Tuất"]}}'::jsonb where slug = 'sao-that-sat';
update public.tu_dien set xuong = '{"type":"chính tinh","element":"thủy","yin_yang":"âm","weight":9,"traits":["phá tán","biến động"],"positions":{"mien":["Tý","Ngọ"],"vuong":["Sửu","Mùi"],"dac":["Thìn","Tuất"],"ham":["Mão","Dậu","Dần","Thân","Tỵ","Hợi"]}}'::jsonb where slug = 'sao-pha-quan';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"kim","yin_yang":"dương","weight":10,"traits":["sát phạt","bạo lực"],"positions":{"dac":["Thìn","Tuất","Sửu","Mùi"],"ham":["Tý","Dần","Mão","Tỵ","Ngọ","Thân","Dậu","Hợi"]}}'::jsonb where slug = 'sao-kinh-duong';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"kim","yin_yang":"âm","weight":10,"traits":["tai họa","bệnh tật"],"positions":{"dac":["Thìn","Sửu","Mùi"],"ham":["Tý","Dần","Mão","Tỵ","Ngọ","Thân","Dậu","Tuất","Hợi"]}}'::jsonb where slug = 'sao-da-la';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"hỏa","yin_yang":"dương","weight":9,"traits":["bạo phát","tai họa"],"positions":{"dac":["Dần","Mão","Thìn","Tỵ","Ngọ"],"ham":["Tý","Sửu","Mùi","Thân","Dậu","Tuất","Hợi"]}}'::jsonb where slug = 'sao-hoa-tinh';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"hỏa","yin_yang":"âm","weight":9,"traits":["đột biến","tai họa"],"positions":{"dac":["Dần","Mão","Thìn","Tỵ","Ngọ"],"ham":["Tý","Sửu","Mùi","Thân","Dậu","Tuất","Hợi"]}}'::jsonb where slug = 'sao-linh-tinh';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"hỏa","yin_yang":null,"weight":9,"traits":["đâm chém","tai họa"],"positions":{"dac":["Dần","Thân","Tỵ","Hợi"],"ham":["Tý","Sửu","Mão","Thìn","Ngọ","Mùi","Dậu","Tuất"]}}'::jsonb where slug = 'sao-kiep-sat';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"hỏa","yin_yang":null,"weight":9,"traits":["hình pháp","dao kéo"],"positions":{"dac":["Dần","Thân","Mão","Dậu"],"ham":["Tý","Sửu","Thìn","Tỵ","Ngọ","Mùi","Tuất","Hợi"]}}'::jsonb where slug = 'sao-thien-hinh';
update public.tu_dien set xuong = '{"type":"hóa tinh","element":"mộc","yin_yang":null,"weight":9,"traits":["tài lộc","phúc"],"positions":null}'::jsonb where slug = 'sao-hoa-loc';
update public.tu_dien set xuong = '{"type":"hóa tinh","element":"mộc","yin_yang":null,"weight":9,"traits":["quyền lực"],"positions":null}'::jsonb where slug = 'sao-hoa-quyen';
update public.tu_dien set xuong = '{"type":"hóa tinh","element":"mộc","yin_yang":null,"weight":8,"traits":["trí tuệ","giải ách"],"positions":null}'::jsonb where slug = 'sao-hoa-khoa';
update public.tu_dien set xuong = '{"type":"hóa tinh","element":"thủy","yin_yang":null,"weight":9,"traits":["tai họa","thị phi"],"positions":{"dac":["Thìn","Tuất","Sửu","Mùi"],"ham":["Tý","Dần","Mão","Tỵ","Ngọ","Thân","Dậu","Hợi"]}}'::jsonb where slug = 'sao-hoa-ky';
update public.tu_dien set xuong = '{"type":"quý tinh","element":"thổ","yin_yang":null,"weight":8,"traits":["tài lộc","phúc thọ"],"positions":null}'::jsonb where slug = 'sao-loc-ton';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"hỏa","yin_yang":null,"weight":7,"traits":["di chuyển","thay đổi"],"positions":{"vuong":["Dần","Thân","Tỵ","Hợi"],"dac":["Ngọ"],"ham":["Tý"]}}'::jsonb where slug = 'sao-thien-ma';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"mộc","yin_yang":null,"weight":6,"traits":["tình duyên"],"positions":null}'::jsonb where slug = 'sao-dao-hoa';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thủy","yin_yang":null,"weight":6,"traits":["hôn nhân"],"positions":null}'::jsonb where slug = 'sao-hong-loan';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thủy","yin_yang":null,"weight":6,"traits":["niềm vui"],"positions":null}'::jsonb where slug = 'sao-thien-hy';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thủy","yin_yang":null,"weight":6,"traits":["trợ lực","phò tá"],"positions":null}'::jsonb where slug = 'sao-huu-bat';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"kim","yin_yang":null,"weight":7,"traits":["văn học","thi cử"],"positions":{"dac":["Thìn","Tuất","Sửu","Mùi","Tỵ","Hợi"],"ham":["Dần","Ngọ"]}}'::jsonb where slug = 'sao-van-xuong';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thủy","yin_yang":null,"weight":7,"traits":["văn học","nghệ thuật"],"positions":{"dac":["Hợi","Tuất","Tỵ","Mùi","Sửu"],"ham":["Thân","Dần","Tý","Ngọ"]}}'::jsonb where slug = 'sao-van-khuc';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thủy","yin_yang":null,"weight":6,"traits":["phúc","quý nhân"],"positions":null}'::jsonb where slug = 'sao-long-tri';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"kim","yin_yang":null,"weight":6,"traits":["phúc","quý nhân"],"positions":null}'::jsonb where slug = 'sao-phuong-cac';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"thủy","yin_yang":null,"weight":7,"traits":["buồn khổ"],"positions":{"dac":["Tý","Ngọ","Dần","Thân"],"ham":["Sửu","Mão","Thìn","Tỵ","Mùi","Dậu","Tuất","Hợi"]}}'::jsonb where slug = 'sao-thien-kho';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"thủy","yin_yang":null,"weight":7,"traits":["sầu não"],"positions":{"dac":["Tý","Ngọ","Dần","Thân"],"ham":["Sửu","Mão","Thìn","Tỵ","Mùi","Dậu","Tuất","Hợi"]}}'::jsonb where slug = 'sao-thien-hu';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thủy","yin_yang":null,"weight":5,"traits":["uy nghi","phúc"],"positions":null}'::jsonb where slug = 'sao-tam-thai';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"mộc","yin_yang":null,"weight":5,"traits":["uy nghi","phúc"],"positions":null}'::jsonb where slug = 'sao-bat-toa';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"mộc","yin_yang":null,"weight":6,"traits":["quý nhân","giải hạn"],"positions":null}'::jsonb where slug = 'sao-an-quang';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["quý nhân","giải hạn"],"positions":null}'::jsonb where slug = 'sao-thien-quy';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thổ","yin_yang":null,"weight":7,"traits":["quý nhân"],"positions":null}'::jsonb where slug = 'sao-thien-khoi';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thổ","yin_yang":null,"weight":7,"traits":["quý nhân"],"positions":null}'::jsonb where slug = 'sao-thien-viet';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thổ","yin_yang":null,"weight":5,"traits":["điều hòa cát hung"],"positions":null}'::jsonb where slug = 'sao-thien-tai';
update public.tu_dien set xuong = '{"type":"phúc tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["tăng phúc thọ"],"positions":null}'::jsonb where slug = 'sao-thien-tho';
update public.tu_dien set xuong = '{"type":"phúc tinh","element":"mộc","yin_yang":null,"weight":6,"traits":["giải trừ tai họa"],"positions":null}'::jsonb where slug = 'sao-giai-than';
update public.tu_dien set xuong = '{"type":"phúc tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["đức độ","giải hạn"],"positions":null}'::jsonb where slug = 'sao-thien-duc';
update public.tu_dien set xuong = '{"type":"phúc tinh","element":"kim","yin_yang":null,"weight":6,"traits":["đức độ","giải hạn"],"positions":null}'::jsonb where slug = 'sao-nguyet-duc';
update public.tu_dien set xuong = '{"type":"phúc tinh","element":"hỏa","yin_yang":null,"weight":6,"traits":["quý nhân","giải hạn","cứu nguy"],"positions":null}'::jsonb where slug = 'sao-thien-quan';
update public.tu_dien set xuong = '{"type":"phúc tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["phúc đức","quý nhân trợ giúp"],"positions":null}'::jsonb where slug = 'sao-thien-phuc';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["cô độc"],"positions":null}'::jsonb where slug = 'sao-co-than';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["cô độc"],"positions":null}'::jsonb where slug = 'sao-qua-tu';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"hỏa","yin_yang":null,"weight":7,"traits":["phá tán","trở ngại"],"positions":null}'::jsonb where slug = 'sao-pha-toai';
update public.tu_dien set xuong = '{"type":"tuế_tinh","element":"thổ","yin_yang":null,"weight":7,"traits":["uy quyền","thị phi"],"positions":null}'::jsonb where slug = 'sao-thai-tue';
update public.tu_dien set xuong = '{"type":"tuế_tinh","element":"hỏa","yin_yang":null,"weight":5,"traits":["thông minh","may mắn"],"positions":null}'::jsonb where slug = 'sao-thieu-duong';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"mộc","yin_yang":null,"weight":8,"traits":["tang thương"],"positions":{"dac":["Dần","Thân","Mão","Dậu"],"ham":["Tý","Sửu","Thìn","Tỵ","Ngọ","Mùi","Tuất","Hợi"]}}'::jsonb where slug = 'sao-tang-mon';
update public.tu_dien set xuong = '{"type":"tuế_tinh","element":"thủy","yin_yang":null,"weight":5,"traits":["nhân hậu","may mắn"],"positions":null}'::jsonb where slug = 'sao-thieu-am';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"hỏa","yin_yang":null,"weight":7,"traits":["thị phi","kiện cáo"],"positions":null}'::jsonb where slug = 'sao-quan-phu';
update public.tu_dien set xuong = '{"type":"hung tinh","element":"hỏa","yin_yang":null,"weight":6,"traits":["tang thương","ngăn trở"],"positions":null}'::jsonb where slug = 'sao-tu-phu';
update public.tu_dien set xuong = '{"type":"phúc tinh","element":"thủy","yin_yang":null,"weight":6,"traits":["đức độ","giải hạn"],"positions":null}'::jsonb where slug = 'sao-long-duc';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"kim","yin_yang":null,"weight":8,"traits":["tai nạn"],"positions":null}'::jsonb where slug = 'sao-bac-ho';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["tai nạn","bệnh tật"],"positions":null}'::jsonb where slug = 'sao-dieu-khach';
update public.tu_dien set xuong = '{"type":"hung tinh","element":"hỏa","yin_yang":null,"weight":6,"traits":["tang thương","ngăn trở"],"positions":null}'::jsonb where slug = 'sao-truc-phu';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"mộc","yin_yang":null,"weight":6,"traits":["may mắn","công danh"],"positions":null}'::jsonb where slug = 'sao-thanh-long';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"hỏa","yin_yang":null,"weight":7,"traits":["hao tài"],"positions":{"dac":["Dần","Thân","Mão","Dậu"],"ham":["Tý","Sửu","Thìn","Tỵ","Ngọ","Mùi","Tuất","Hợi"]}}'::jsonb where slug = 'sao-tieu-hao';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"kim","yin_yang":null,"weight":7,"traits":["quyền lực","lãnh đạo"],"positions":null}'::jsonb where slug = 'sao-tuong-quan';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"mộc","yin_yang":null,"weight":5,"traits":["văn học","đàm luận"],"positions":null}'::jsonb where slug = 'sao-tau-thu';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"hỏa","yin_yang":null,"weight":6,"traits":["nhanh nhẹn","biến động"],"positions":null}'::jsonb where slug = 'sao-phi-liem';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"hỏa","yin_yang":null,"weight":8,"traits":["hao tài"],"positions":{"dac":["Dần","Thân","Mão","Dậu"],"ham":["Tý","Sửu","Thìn","Tỵ","Ngọ","Mùi","Tuất","Hợi"]}}'::jsonb where slug = 'sao-dai-hao';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"hỏa","yin_yang":null,"weight":9,"traits":["hao tổn","bất thành"],"positions":{"dac":["Dần","Thân","Tỵ","Hợi"],"ham":["Tý","Sửu","Mão","Thìn","Ngọ","Mùi","Dậu","Tuất"]}}'::jsonb where slug = 'sao-dia-khong';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"hỏa","yin_yang":null,"weight":9,"traits":["kiếp tài","hung hiểm"],"positions":{"dac":["Dần","Thân","Tỵ","Hợi"],"ham":["Tý","Sửu","Mão","Thìn","Ngọ","Mùi","Dậu","Tuất"]}}'::jsonb where slug = 'sao-dia-kiep';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["bệnh tật"],"positions":null}'::jsonb where slug = 'sao-benh-phu';
update public.tu_dien set xuong = '{"type":"bại tinh","element":"hỏa","yin_yang":null,"weight":7,"traits":["ám hại","lừa đảo"],"positions":null}'::jsonb where slug = 'sao-phu-binh';
update public.tu_dien set xuong = '{"type":"sát tinh","element":"hỏa","yin_yang":null,"weight":9,"traits":["hư vô","phá tán","mất mát bất ngờ"],"positions":null}'::jsonb where slug = 'sao-thien-khong';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"kim","yin_yang":null,"weight":6,"traits":["thông minh","học tập","nghiên cứu","thi cử"],"positions":null}'::jsonb where slug = 'sao-thai-phu';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thổ","yin_yang":null,"weight":6,"traits":["phong tặng","công danh","vinh hiển","ấn tín"],"positions":null}'::jsonb where slug = 'sao-phong-cao';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"kim","yin_yang":null,"weight":6,"traits":["sức mạnh","uy lực"],"positions":null}'::jsonb where slug = 'sao-luc-si';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"mộc","yin_yang":null,"weight":6,"traits":["niềm vui","hỷ sự"],"positions":null}'::jsonb where slug = 'sao-hi-than';
update public.tu_dien set xuong = '{"type":"phụ tinh","element":"thủy","yin_yang":null,"weight":5,"traits":["trí tuệ"],"positions":null}'::jsonb where slug = 'sao-bac-si';
update public.tu_dien set xuong = '{"thuTu":0,"tenNgan":"Mệnh"}'::jsonb where slug = 'cung-menh';
update public.tu_dien set xuong = '{"thuTu":1,"tenNgan":"Phụ Mẫu"}'::jsonb where slug = 'cung-phu-mau';
update public.tu_dien set xuong = '{"thuTu":2,"tenNgan":"Phúc Đức"}'::jsonb where slug = 'cung-phuc-duc';
update public.tu_dien set xuong = '{"thuTu":3,"tenNgan":"Điền Trạch"}'::jsonb where slug = 'cung-dien-trach';
update public.tu_dien set xuong = '{"thuTu":4,"tenNgan":"Quan Lộc"}'::jsonb where slug = 'cung-quan-loc';
update public.tu_dien set xuong = '{"thuTu":5,"tenNgan":"Nô Bộc"}'::jsonb where slug = 'cung-no-boc';
update public.tu_dien set xuong = '{"thuTu":6,"tenNgan":"Thiên Di"}'::jsonb where slug = 'cung-thien-di';
update public.tu_dien set xuong = '{"thuTu":7,"tenNgan":"Tật Ách"}'::jsonb where slug = 'cung-tat-ach';
update public.tu_dien set xuong = '{"thuTu":8,"tenNgan":"Tài Bạch"}'::jsonb where slug = 'cung-tai-bach';
update public.tu_dien set xuong = '{"thuTu":9,"tenNgan":"Tử Tức"}'::jsonb where slug = 'cung-tu-tuc';
update public.tu_dien set xuong = '{"thuTu":10,"tenNgan":"Phu Thê"}'::jsonb where slug = 'cung-phu-the';
update public.tu_dien set xuong = '{"thuTu":11,"tenNgan":"Huynh Đệ"}'::jsonb where slug = 'cung-huynh-de';
commit;