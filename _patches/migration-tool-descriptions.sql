-- _patches/migration-tool-descriptions.sql
-- ============================================================
-- Viết lại `tool_pricing.description` cho toàn bộ 61 công cụ đang bán/miễn phí
-- (loại trừ `rail-message` — dòng đó không phải một công cụ, nó chỉ giữ giá
-- rail dùng chung, xem app_path=null / category='chat').
--
-- Vì sao viết lại: mô tả cũ toàn câu chức năng khô ("Phân tích số học theo
-- ngày sinh") — nói được TOOL LÀM GÌ nhưng không nói được VÌ SAO người đọc nên
-- bấm vào. Bản mới theo đúng một khuôn 3 câu, mỗi câu ≤ ~15 từ:
--   1) Kết quả cụ thể — bấm vào thì nhận được gì, không chung chung.
--   2) Một câu "Bạn…" — chạm đúng hành vi/nỗi phân vân quen thuộc.
--   3) "Dùng khi…" — tình huống cụ thể nên mở tool này.
-- Xưng "bạn" trực tiếp với người đọc, không hứa chắc/tuyệt đối cho các tool
-- mang tính dự đoán (giữ đúng giọng xác suất mà site đang dùng ở mọi nơi khác).
--
-- ⚠️ ĐÃ CHẠY qua Supabase MCP (project dciwkfdqhhddeymlisey), verify 61/61 dòng
-- khớp khuôn mới. File này là BẢN GHI để tra lại/lùi khi cần, không phải bước
-- bắt buộc phải chạy lần nữa. Idempotent — chạy lại vô hại.
--
-- Nơi hiển thị (không có mục nào là "chỗ duy nhất", đọc trước khi đổi format):
--   • /cong-cu, tab "Theo bộ môn"      → `.tool-desc` dưới tên tool.
--   • /cong-cu, tab mặc định "nhu cầu" → chỉ hiện nếu tool CÓ `question`; PR
--     cùng nhánh này thêm dòng description NGAY DƯỚI câu hỏi (xem diff
--     `public/cong-cu.html` hàm `toolCardHtml`) — trước đó cột này bị bỏ qua
--     hoàn toàn ở lối xem mặc định.
--   • /app (app-home.html) — CHỈ hiện khi `question` là null (hiếm, hiện chỉ
--     có `cong-so`); các tool khác ở đó vẫn hiện `question` như cũ.
-- ============================================================

update tool_pricing set description = v.description, updated_at = now()
from (values
('tarot', $$Rút một lá, nghe một câu trả lời rõ cho chuyện đang rối. Bạn cứ hỏi vòng vo bạn bè mà vẫn chưa yên tâm. Dùng khi cần một góc nhìn khác trước khi quyết định.$$),
('oracle', $$Rút một lá triết lý phương Đông, đọc một lời khuyên tĩnh tâm. Bạn đang rối trí, cần một chỗ dừng để thở chậm lại. Dùng khi muốn tĩnh tâm hơn là muốn một đáp án đúng sai.$$),
('boi-bai-tay', $$Rút bài Tây kiểu ông bà hay xem, đoán hướng đi sắp tới. Bạn nhớ những buổi xem bài đầu năm ở nhà bà ngoại. Dùng khi thích lối bói dân gian quen thuộc, không cầu kỳ.$$),
('ban-do-sao', $$Dựng bánh xe 12 nhà đúng khoảnh khắc bạn chào đời. Bạn chỉ biết cung Mặt Trời, chưa từng thấy cung Mọc của mình. Dùng khi muốn một tấm bản đồ sao để lưu và chia sẻ.$$),
('sao-nam', $$Nhìn nhanh cung Mệnh và các sao chính trong lá số của bạn. Bạn tò mò lá số nói gì mà chưa muốn xem hết 12 cung. Dùng khi cần một cái nhìn tổng quan trước khi đào sâu.$$),
('cach-cuc', $$Soi từng cung, tìm cách cục đặc biệt lá số bạn đang mang. Bạn nghe người ta nói cách cục quý mà chưa rõ mình có gì. Dùng khi muốn đọc lá số theo từng cung, không luận chung chung.$$),
('dai-van', $$Xem 10 năm đại vận sắp tới đang đưa bạn theo hướng nào. Bạn cảm giác vài năm gần đây thuận, vài năm lại không. Dùng khi cần biết giai đoạn tới nên đẩy mạnh hay giữ sức.$$),
('van-thang', $$Tra nhanh vận khí tháng này rơi vào cung nào trong lá số. Bạn thấy có tháng mọi việc trôi chảy, có tháng cứ trục trặc. Dùng khi cần một cái nhìn ngắn hạn cho riêng tháng này.$$),
('an-sao', $$Lập lá số đầy đủ 12 cung theo đúng cổ pháp an sao. Bạn có ngày giờ sinh nhưng chưa từng thấy lá số của mình. Dùng khi cần dựng lá số gốc trước khi hỏi bất cứ điều gì.$$),
('dat-ten-dn', $$Nhận 12 tên công ty hợp ngũ hành và tuổi của người chủ. Bạn đang bí tên, đặt đại rồi tự hỏi có hợp mình không. Dùng khi sắp thành lập công ty và cần chốt tên thật.$$),
('dat-ten-con', $$Nhận 12 tên hợp ngũ hành của con, của cả cha và mẹ. Bạn lật hết sách đặt tên mà vẫn chưa ưng cái nào. Dùng khi sắp đón con và cần một danh sách để chọn.$$),
('chon-ngay-tot', $$Gợi ý ngày tốt cho cưới hỏi, làm nhà, khai trương của bạn. Bạn sợ chọn nhầm ngày rồi bị nói động thổ sai giờ. Dùng khi cần chốt một ngày quan trọng sắp tới.$$),
('than-so-hoc', $$Đọc 11 con số từ ngày sinh: đường đời, đỉnh cao, năm cá nhân. Bạn hay lặp lại cùng một kiểu quyết định sai mà không để ý. Dùng khi muốn hiểu cách mình nghĩ trước khi chọn lại lần nữa.$$),
('kinh-dich', $$Gieo một quẻ trong 64 quẻ, đọc đúng hào đang động của bạn. Bạn phân vân nên tiến hay nên lùi trước một việc. Dùng khi cần một lời khuyên cổ xưa cho quyết định hiện tại.$$),
('mai-hoa', $$Gieo quẻ bằng số hoặc giờ, đọc Thể và Dụng cho việc bạn hỏi. Bạn có một việc đang phân vân, muốn một gợi ý thật nhanh. Dùng khi cần đáp án gọn cho một câu hỏi cụ thể.$$),
('ky-mon', $$Dựng bàn 9 cung theo đúng giờ hiện tại, chỉ hướng nên đi. Bạn sắp ra ngoài gặp việc quan trọng, chưa biết chọn hướng nào. Dùng khi cần biết hôm nay giờ nào tốt, đi hướng nào lợi.$$),
('han-nam', $$Tra hạn năm nay rơi vào đâu theo tuổi và mệnh của bạn. Bạn nghe năm nay có hạn mà chưa biết hạn gì, ở đâu. Dùng khi đầu năm muốn biết trước điều cần để ý.$$),
('hoang-dao', $$Tra giờ hoàng đạo hôm nay, kèm việc nên làm trong giờ đó. Bạn định làm việc lớn mà không để ý giờ giấc. Dùng khi sắp ký hợp đồng, xuất hành hay bắt đầu việc mới.$$),
('ngay-tot', $$Liệt kê những ngày tốt trong tháng này, xếp theo từng ngày. Bạn cứ định làm việc lớn rồi phải dời vì gặp ngày xấu. Dùng khi lên kế hoạch cho cả tháng, không chỉ một ngày.$$),
('luc-nham', $$Tra một quẻ theo giờ và ngày cho việc đang canh cánh trong lòng. Bạn cứ nghĩ đi nghĩ lại một chuyện mà chưa dám hỏi ai. Dùng khi cần lời đáp nhanh cho một nỗi lo cụ thể.$$),
('gio-sinh', $$Lập 12 lá số theo 12 giờ, thu hẹp dần về đúng giờ sinh. Bạn chỉ nhớ sinh buổi sáng, không ai trong nhà nhớ chính xác. Dùng khi không nhớ giờ sinh mà mọi công cụ khác đều cần nó.$$),
('laso', $$Đọc trọn 24 phần lá số: cung, đại vận, cách cục, điểm mạnh yếu. Bạn từng xem lướt lá số đâu đó mà chưa hiểu hết ý nghĩa. Dùng khi muốn một bản luận đầy đủ, không phải vài dòng qua loa.$$),
('tu-binh', $$Lập bát tự, đọc Nhật Can, Dụng Thần, Cách Cục, Đại Vận của bạn. Bạn nghe mệnh yếu cần bổ mà chưa rõ yếu ở đâu, bổ gì. Dùng khi muốn xem theo trường phái Tứ Trụ, khác cách của Tử Vi.$$),
('van-han-nam', $$Xem đúng 12 tháng tới: cung hạn, sao, cách cục của từng tháng. Bạn muốn biết trước tháng nào nên cẩn thận, tháng nào nên tiến. Dùng khi cần một lịch vận hạn cụ thể cho năm sắp tới.$$),
('chan-dung-tien-kiep', $$Nhận một chân dung và câu chuyện một đời từ chính lá số bạn. Bạn từng tự hỏi kiếp trước mình là ai, sống ra sao. Dùng khi muốn một câu chuyện để đọc, không chỉ vài dòng luận.$$),
('xem-lam-an', $$Chấm 8 yếu tố hợp tác giữa bạn và người sắp làm ăn chung. Bạn sắp góp vốn với ai đó, vẫn còn chút lấn cấn. Dùng khi cần một góc nhìn khách quan trước khi ký kết.$$),
('nguoi-khac', $$Nhận cẩm nang ứng xử: nên nói gì, tránh gì với người đó. Bạn đoán già đoán non tính sếp mà vẫn hay đoán sai. Dùng khi cần hiểu nhanh một người trước cuộc gặp quan trọng.$$),
('nhan-mach', $$Xem cả đội đang thiếu kiểu người nào, ai với ai dễ va chạm. Bạn quản một nhóm mà vẫn thấy có gì đó lệch pha. Dùng khi cần sắp xếp lại đội hoặc chọn ai gặp trước.$$),
('cong-so', $$Đọc kiểu người của bạn ở chỗ làm và cả chặng đường sự nghiệp. Bạn giỏi việc nhưng chưa chắc mình đang đi đúng hướng. Dùng khi cần định hướng nghề nghiệp cụ thể hơn là cứ cố gắng.$$),
('xem-tuoi', $$Chấm 8 yếu tố tương hợp giữa hai lá số của hai bạn. Bạn nghe hai bên gia đình bàn ra tán vào chuyện tuổi tác. Dùng khi đang tính chuyện cưới xin và cần một câu trả lời rõ.$$),
('chan-dung-vo-chong', $$Vẽ chân dung người bạn đời tương lai từ cung Phu Thê của bạn. Bạn tò mò người ấy sẽ trông ra sao, tính khí thế nào. Dùng khi muốn một hình ảnh cụ thể, không chỉ vài dòng luận chữ.$$),
('duyen-no-tien-kiep', $$Ghép hai lá số, tìm mối duyên kiếp trước giữa bạn và người ấy. Bạn cảm giác quen người này từ lâu dù mới gặp gần đây. Dùng khi muốn một câu chuyện chung cho cả hai người.$$),
('xem-tuoi-sinh-con', $$Tra năm sinh con hợp địa chi của cả bố và mẹ. Bạn đang cân nhắc năm nào sinh thì thuận cho cả nhà. Dùng khi đang lên kế hoạch có con và muốn tham khảo thêm.$$),
('day-con', $$Đọc con tiếp thu kiểu nào, kỷ luật nào phản tác dụng với con. Bạn dạy mãi một cách mà con vẫn không nghe theo. Dùng khi cách dạy cũ không còn hiệu quả với con nữa.$$),
('huong-nghiep-tre', $$Gợi ý hoạt động nên cho con làm quen theo đúng lứa tuổi. Bạn muốn định hướng sớm cho con nhưng chưa biết bắt đầu từ đâu. Dùng khi muốn tham khảo, không phải để chốt nghề cho con.$$),
('tu-tru', $$Lập Tứ Trụ: năm, tháng, ngày, giờ sinh theo can chi của bạn. Bạn nghe người ta luận bát tự mà chưa từng thấy trụ của mình. Dùng khi muốn xem trước bốn trụ, trước khi luận sâu hơn.$$),
('nap-am', $$Tra mệnh nạp âm, hành, màu và hướng hợp theo năm sinh của bạn. Bạn chỉ biết mình mệnh Kim mà chưa rõ nó hợp gì, kỵ gì. Dùng khi cần tra nhanh mệnh trước khi chọn màu, chọn hướng.$$),
('ngu-hanh-ten', $$Chấm điểm ngũ hành từng chữ trong tên, xem hợp hay khắc mệnh bạn. Bạn tự hỏi cái tên cha mẹ đặt có thật sự hợp mình không. Dùng khi tò mò về tên mình, không phải để đổi tên.$$),
('tuong-hop', $$Xét nhanh hai tuổi có hợp nhau hay không, chỉ cần năm sinh. Bạn mới quen ai đó và tiện tay tra thử cho vui. Dùng khi cần một câu trả lời nhanh, chưa cần xem sâu.$$),
('bat-trach', $$Tính mệnh quái và hướng nhà hợp với bạn theo Bát Trạch. Bạn kê bàn, kê giường theo cảm tính mà chưa biết đúng hướng. Dùng khi sắp dọn nhà hoặc sắp xếp lại không gian sống.$$),
('kim-lau', $$Kiểm tra tuổi bạn có phạm Kim Lâu hay Tam Tai hay không. Bạn định cưới, làm nhà nhưng sợ tuổi xung mà chưa tra kỹ. Dùng khi sắp làm việc lớn: cưới hỏi, động thổ, khai trương.$$),
('da-lieu-ai', $$Soi ảnh da, chỉ ra những vùng đang có vấn đề cần chú ý. Bạn nhìn gương mỗi ngày mà không chắc da mình đang ổn hay không. Dùng khi muốn một góc nhìn khách quan trước lúc mua mỹ phẩm.$$),
('kieu-toc-phan-tich', $$Chấm khuôn mặt bạn hợp với kiểu tóc nào nhất. Bạn đi cắt tóc rồi lại về nhà tiếc vì chọn sai kiểu. Dùng khi định đổi tóc mà chưa dám thử ngay ngoài tiệm.$$),
('kieu-toc-tryon', $$Ghép kiểu tóc mới thẳng lên ảnh thật của bạn để xem trước. Bạn sợ cắt xong mới biết không hợp, lúc đó đã muộn. Dùng khi muốn thấy trước kết quả rồi mới quyết định cắt.$$),
('mau-sac-hop-menh', $$Gợi ý những màu hợp mệnh của bạn theo ngũ hành. Bạn mua đồ theo sở thích mà không để ý có hợp mình không. Dùng khi sắm đồ, sơn nhà hay chọn màu cho việc quan trọng.$$),
('personal-color', $$Xác định tông da bạn hợp với mùa màu nào trong 4 mùa. Bạn mặc một màu mà người khen tươi, người lại chê xỉn da. Dùng khi cần biết chắc tông màu nào thật sự hợp với mình.$$),
('personal-color-tryon', $$Thử ngay tông màu vừa chấm lên chính ảnh của bạn. Bạn biết tông màu hợp nhưng vẫn khó hình dung khi mặc lên người. Dùng khi muốn thấy trước, trước khi mua đồ theo tông màu đó.$$),
('trang-diem-phan-tich', $$Gợi ý lối trang điểm hợp với gương mặt bạn nhất. Bạn trang điểm theo video trên mạng mà chưa hợp với gương mặt mình. Dùng khi cần một hướng đi rõ trước khi mua mỹ phẩm.$$),
('trang-diem-tryon', $$Ghép lớp trang điểm gợi ý thẳng lên ảnh thật của bạn. Bạn ngại thử trang điểm mới vì sợ không hợp lúc lên mặt. Dùng khi muốn xem trước gương mặt mình sẽ trông ra sao.$$),
('trang-phuc-theo-ngay', $$Gợi ý trang phục hôm nay hợp với vận của bạn. Bạn đứng trước tủ đồ mỗi sáng mà không biết nên mặc gì. Dùng khi có việc quan trọng và muốn chọn đồ có chủ đích.$$),
('trang-phuc-tryon', $$Thử bộ đồ đang phân vân lên chính ảnh của bạn. Bạn nhìn đồ trên người mẫu mà không chắc lên người mình sẽ ra sao. Dùng khi cân nhắc mua một bộ đồ và muốn thấy trước.$$),
('phong-thuy', $$Chụp ảnh phòng, nhận phân tích phong thủy theo Bát Trạch và Ngũ Hành. Bạn kê đồ theo cảm tính rồi tự hỏi sao trong nhà cứ bất ổn. Dùng khi muốn sắp xếp lại phòng và có căn cứ rõ ràng hơn.$$),
('ban-lam-viec', $$Chụp ảnh bàn làm việc, xem cách kê có đang cản đường thăng tiến. Bạn ngồi mãi một chỗ mà công việc cứ ì ạch không lên. Dùng khi muốn sắp lại bàn làm việc cho thuận hơn.$$),
('cua-hang-phong-thuy', $$Chụp ảnh cửa hàng, xem cách bày biện có đang cản khách vào. Bạn thấy cửa hàng vắng khách mà chưa rõ vì đâu. Dùng khi mở cửa hàng mới hoặc muốn sắp lại không gian bán.$$),
('phong-thuy-render', $$Xem trước ảnh dựng phòng bạn sau khi sửa theo phong thủy. Bạn nghe tư vấn sửa phòng mà khó hình dung sẽ trông ra sao. Dùng khi muốn thấy hình ảnh cụ thể trước khi sửa thật.$$),
('dien-tuong', $$Đọc nhân tướng học tổng thể từ ảnh khuôn mặt của bạn. Bạn tò mò gương mặt mình đang nói điều gì với người khác. Dùng khi muốn hiểu bản thân qua một góc nhìn khác lời nói.$$),
('nhan-tuong', $$Đọc tướng mắt theo Liễu Trang Thần Tướng từ ảnh của bạn. Bạn nghe đôi mắt biết nói mà chưa rõ mắt mình đang nói gì. Dùng khi muốn hiểu tính cách qua một chi tiết nhỏ trên gương mặt.$$),
('thu-tuong', $$Đọc chỉ tay theo Ngũ Hành Hình Tướng từ ảnh bàn tay bạn. Bạn từng nghe xem chỉ tay nhưng chưa thử với đúng đường chỉ tay mình. Dùng khi tò mò bàn tay mình đang báo trước điều gì.$$),
('thanh-tuong', $$Ghi âm giọng nói, xem giọng bạn hợp với nghề nào. Bạn hát karaoke hay nói chuyện mà chưa từng để ý giọng mình. Dùng khi cân nhắc nghề nghiệp cần nói nhiều, thuyết trình nhiều.$$),
('thanh-tuong-pro', $$Phân tích chuyên sâu giọng nói, luận cả vận khí đi kèm. Bạn đã thử bản cơ bản và muốn đọc kỹ hơn nữa. Dùng khi cần bản luận thanh tướng đầy đủ, không chỉ vài dòng.$$),
('khi-sac', $$Đọc khí sắc trên khuôn mặt, luận vận khí 1 đến 3 tháng tới. Bạn gần đây trông mệt mỏi hoặc lại thấy tươi tắn hẳn lên. Dùng khi muốn biết trước xu hướng vận khí ngắn hạn sắp tới.$$)
) as v(tool_id, description)
where tool_pricing.tool_id = v.tool_id;

-- Verify sau khi chạy:
--   select count(*) filter (where description like '%Dùng khi%') as with_new_shape,
--          count(*) as total
--   from tool_pricing where tool_id <> 'rail-message';
--   -- kỳ vọng: 61 / 61
-- ============================================================
