/* tools-shared/kinh-dich.js — Module DÙNG CHUNG tool Gieo Quẻ Kinh Dịch.
   Nguồn DUY NHẤT cho standalone /tools/kinh-dich.html + shell /app/kinh-dich.
   Bảng 64 quẻ (King Wen) + tra quẻ từ 6 hào + render kết quả PORT NGUYÊN XI từ
   bản inline cũ — không đổi hành vi. Gieo/animation vẫn ở trang (DOM-specific).
   window.KinhDichTool = { QUE, findHexagram, resolve, gridHTML, railData } */
(function (root) {
// ── 64 quẻ Kinh Dịch — King Wen sequence ──
// lines: 6 chars từ hào 1 (dưới) → hào 6 (trên), 1=dương 0=âm
// Unicode symbol: U+4DC0 + (index)
const QUE = [
  {n:'Càn',zh:'乾',li:'111111',f:'tot',m:'Trời — Sức mạnh sáng tạo',g:'Thời điểm của sức mạnh và hành động quyết đoán. Tin vào tiềm năng bản thân. Cơ hội lớn đang mở ra — đừng do dự, hãy tiến về phía trước với toàn bộ năng lượng.'},
  {n:'Khôn',zh:'坤',li:'000000',f:'tot',m:'Đất — Tiếp nhận, nuôi dưỡng',g:'Thời điểm của sự nhún nhường và kiên nhẫn. Đừng cố dẫn đầu — hãy hỗ trợ, nuôi dưỡng và kiên trì. Thành công đến qua sự bền bỉ và hợp tác.'},
  {n:'Truân',zh:'屯',li:'100010',f:'canh',m:'Khó khăn ban đầu',g:'Khởi đầu gặp trở ngại là điều tự nhiên. Cần sự kiên nhẫn và chuẩn bị kỹ lưỡng trước khi hành động. Tìm kiếm sự hỗ trợ từ người có kinh nghiệm.'},
  {n:'Mông',zh:'蒙',li:'010001',f:'trung',m:'Thiếu kinh nghiệm, học hỏi',g:'Giai đoạn học hỏi và trưởng thành. Khiêm tốn đặt câu hỏi, lắng nghe người hướng dẫn. Không nên vội vàng — hiểu đúng trước khi hành động.'},
  {n:'Nhu',zh:'需',li:'111010',f:'trung',m:'Chờ đợi đúng thời',g:'Thời cơ chưa đến. Kiên nhẫn chờ đợi không phải yếu đuối — đó là trí tuệ. Chuẩn bị trong khi chờ. Ăn uống, nghỉ ngơi, dưỡng sức cho giai đoạn tiếp theo.'},
  {n:'Tụng',zh:'訟',li:'010111',f:'canh',m:'Xung đột, tranh chấp',g:'Tránh leo thang mâu thuẫn. Tìm cách dàn xếp thay vì đối đầu trực tiếp. Không có bên nào thắng hoàn toàn trong tranh chấp — nhượng bộ một phần để giữ hòa khí.'},
  {n:'Sư',zh:'師',li:'010000',f:'trung',m:'Kỷ luật, tổ chức',g:'Cần lãnh đạo và tổ chức rõ ràng. Hành động tập thể đòi hỏi kỷ luật — mỗi người phải biết vai trò của mình. Người lãnh đạo phải có đức tin của tập thể.'},
  {n:'Tỉ',zh:'比',li:'000010',f:'tot',m:'Đoàn kết, liên minh',g:'Sức mạnh đến từ sự đoàn kết. Hãy mở lòng với những người xung quanh, xây dựng quan hệ tin cậy. Đây là thời điểm tốt để hợp tác và kết nghĩa.'},
  {n:'Tiểu Súc',zh:'小畜',li:'111011',f:'trung',m:'Tích lũy từng bước nhỏ',g:'Không thể tiến nhanh lúc này — hãy kiên nhẫn tích lũy từng chút nhỏ. Mưa nhỏ cũng thấm dần. Chú trọng chuẩn bị hơn là hành động lớn.'},
  {n:'Lý',zh:'履',li:'110111',f:'tot',m:'Đi đứng cẩn thận',g:'Tình huống đòi hỏi sự khéo léo và cẩn thận. Như bước trên đuôi hổ — biết giới hạn của mình, hành xử đúng mực. Thái độ đúng đắn sẽ hóa giải nguy hiểm.'},
  {n:'Thái',zh:'泰',li:'111000',f:'tot',m:'Thái bình, thịnh vượng',g:'Thời điểm vàng của sự hài hòa và phát triển. Trời đất giao hòa — mọi việc đang thuận lợi. Nắm bắt thời cơ này để tiến hành kế hoạch quan trọng.'},
  {n:'Bĩ',zh:'否',li:'000111',f:'canh',m:'Bế tắc, trì trệ',g:'Thiên địa không giao hòa — trên dưới không thông. Không phải lúc để cố sức đẩy. Rút lui, giữ gìn sức lực, chờ thời cơ thay đổi. Tiểu nhân đang lên, quân tử nên ẩn mình.'},
  {n:'Đồng Nhân',zh:'同人',li:'101111',f:'tot',m:'Hòa đồng, cộng đồng',g:'Sức mạnh của sự đoàn kết vì mục tiêu chung. Hãy mở rộng tâm, không phân biệt. Hợp tác với người có cùng lý tưởng sẽ vượt qua mọi khó khăn.'},
  {n:'Đại Hữu',zh:'大有',li:'111101',f:'tot',m:'Sở hữu lớn, phong phú',g:'Vận may và sự phong phú đang ở đỉnh cao. Nhưng tài nguyên lớn đòi hỏi trách nhiệm lớn. Chia sẻ và quản lý khôn ngoan — đừng để tự mãn làm mất đi những gì đã có.'},
  {n:'Khiêm',zh:'謙',li:'001000',f:'tot',m:'Khiêm tốn, nhún nhường',g:'Khiêm tốn là đức hạnh cao quý nhất. Núi cao nằm dưới đất — vĩ đại mà không kiêu ngạo. Sự khiêm tốn chân thành sẽ mang lại thành công bền vững và được lòng mọi người.'},
  {n:'Dự',zh:'豫',li:'000100',f:'tot',m:'Nhiệt tình, chuẩn bị',g:'Thời điểm vui vẻ và sẵn sàng. Hãy chuẩn bị kỹ lưỡng và hành động với nhiệt huyết. Âm nhạc và lễ hội — mọi thứ đang thuận dòng. Nhưng đừng quá đắm chìm vào hưởng thụ.'},
  {n:'Tùy',zh:'隨',li:'100110',f:'tot',m:'Thích nghi, theo dòng',g:'Đây là lúc thích nghi với hoàn cảnh thay vì cưỡng lại nó. Theo dòng nước không có nghĩa là mất bản thân — hãy linh hoạt mà vẫn giữ vững giá trị cốt lõi.'},
  {n:'Cổ',zh:'蠱',li:'011001',f:'canh',m:'Sửa chữa, chỉnh đốn',g:'Có điều gì đó đã bị hỏng và cần sửa chữa. Đừng né tránh vấn đề — hãy đối mặt và khắc phục tận gốc. Ba ngày trước khi thay đổi và ba ngày sau để ổn định.'},
  {n:'Lâm',zh:'臨',li:'110000',f:'tot',m:'Tiếp cận, đến gần',g:'Cơ hội đang đến gần. Tiếp cận với thái độ thân thiện và mở lòng. Tám tháng tới thuận lợi — hãy tận dụng. Sự giám sát và quan tâm đúng lúc sẽ mang lại kết quả tốt.'},
  {n:'Quán',zh:'觀',li:'000011',f:'trung',m:'Quan sát, chiêm nghiệm',g:'Thời điểm để nhìn nhận lại toàn cảnh. Quan sát trước khi hành động. Như gió thổi qua đất — ảnh hưởng âm thầm nhưng sâu sắc. Hãy là tấm gương cho người khác bằng chính phong cách của bạn.'},
  {n:'Phệ Hạp',zh:'噬嗑',li:'100101',f:'trung',m:'Cắn xuyên qua chướng ngại',g:'Có chướng ngại vật cần loại bỏ trước khi tiến lên. Cần quyết đoán và dứt khoát. Pháp luật và kỷ luật sẽ giải quyết vấn đề. Đừng dung túng cái sai.'},
  {n:'Bí',zh:'賁',li:'101001',f:'tot',m:'Vẻ đẹp, trang sức',g:'Hình thức và nội dung cần hài hòa. Đừng bỏ bê vẻ ngoài, nhưng đừng để hình thức lấn át bản chất. Vẻ đẹp chân thực đến từ sự hài hòa giữa trong và ngoài.'},
  {n:'Bác',zh:'剝',li:'000001',f:'canh',m:'Sụp đổ, tan rã',g:'Năng lượng tiêu cực đang ở đỉnh điểm. Không nên đi xa, không nên khởi sự. Giữ gìn những gì đang có. Như mùa đông — sự sụp đổ là tiền đề cho sự tái sinh. Chờ đợi thời điểm xoay chuyển.'},
  {n:'Phục',zh:'復',li:'100000',f:'tot',m:'Trở về, phục hồi',g:'Sau đêm dài là bình minh. Dương khí bắt đầu trở lại từ dưới cùng. Thời điểm tốt để bắt đầu lại, quay về với bản chất chân thực. Bảy ngày để hoàn chỉnh một chu kỳ.'},
  {n:'Vô Vọng',zh:'無妄',li:'100111',f:'tot',m:'Hành động đúng theo thiên ý',g:'Thuận theo lẽ tự nhiên, không cưỡng cầu. Hành động từ sự trong sáng và trung thực — không mưu tính. Tai họa đến với người hành động không đúng chỗ. Chân thành là con đường đúng nhất.'},
  {n:'Đại Súc',zh:'大畜',li:'111001',f:'tot',m:'Tích lũy sức mạnh lớn',g:'Đây là giai đoạn tích lũy kiến thức, kinh nghiệm và sức mạnh. Học hỏi từ quá khứ. Năng lượng đang được gom tụ — khi thời cơ đến sẽ bùng phát mạnh mẽ.'},
  {n:'Di',zh:'頤',li:'100001',f:'trung',m:'Nuôi dưỡng, ăn uống',g:'Chú ý đến việc nuôi dưỡng bản thân và người khác — cả thể xác lẫn tinh thần. Xem mình ăn gì, nói gì, suy nghĩ gì. Sự nuôi dưỡng đúng đắn là nền tảng của sức mạnh.'},
  {n:'Đại Quá',zh:'大過',li:'011110',f:'canh',m:'Vượt quá giới hạn',g:'Tình huống đang vượt ngoài tầm kiểm soát bình thường. Cây đòn giữa đang gãy dưới tải trọng. Cần hành động phi thường. Như người không sợ chết khi lội qua sông — cần can đảm đặc biệt.'},
  {n:'Khảm',zh:'坎',li:'010010',f:'canh',m:'Nước, vực sâu nguy hiểm',g:'Đang ở giữa vòng xoáy nguy hiểm. Giữ vững tâm trí, đừng hoảng loạn. Nước thấm qua mọi nơi — kiên trì và linh hoạt mới thoát được. Chỉ cần tinh thần không gục ngã.'},
  {n:'Ly',zh:'離',li:'101101',f:'tot',m:'Lửa, ánh sáng, rõ ràng',g:'Ánh sáng và sự minh bạch. Bám vào điều đúng đắn như lửa bám vào nhiên liệu. Sự rõ ràng và chân thực sẽ soi sáng mọi việc. Trâu cái — tượng trưng cho sự nhún nhường mang lại phát triển.'},
  {n:'Hàm',zh:'咸',li:'001110',f:'tot',m:'Cảm ứng, thu hút',g:'Rung động tình cảm và sự hấp dẫn lẫn nhau. Cởi mở với tình cảm thật sự. Đây là quẻ tốt nhất cho tình yêu và hôn nhân. Hãy để con tim dẫn đường, không chỉ lý trí.'},
  {n:'Hằng',zh:'恒',li:'011100',f:'tot',m:'Bền vững, kiên định',g:'Kiên trì theo đuổi mục tiêu lâu dài. Sự bền vững không có nghĩa là cứng nhắc — hãy linh hoạt trong phương pháp nhưng kiên định trong mục tiêu. Thành công đến với người nhất quán.'},
  {n:'Độn',zh:'遯',li:'001111',f:'trung',m:'Rút lui chiến lược',g:'Đây là lúc rút lui khéo léo, không phải thất bại. Như quân tử ẩn mình khi tiểu nhân nắm quyền. Rút lui kịp thời là chiến lược thông minh. Giữ gìn sức lực cho giai đoạn thích hợp hơn.'},
  {n:'Đại Tráng',zh:'大壯',li:'111100',f:'canh',m:'Sức mạnh quá lớn',g:'Sức mạnh đang ở đỉnh cao nhưng cần cẩn thận với sự hống hách. Dê húc vào hàng rào — dù mạnh vẫn bị mắc kẹt. Dùng sức mạnh đúng chỗ và đúng cách.'},
  {n:'Tấn',zh:'晉',li:'000101',f:'tot',m:'Tiến lên, thăng tiến',g:'Thời điểm tiến về phía trước với ánh sáng và sự trong sáng. Như mặt trời mọc trên mặt đất — ngày càng tỏa sáng hơn. Người lãnh đạo đức hạnh được trọng dụng.'},
  {n:'Minh Di',zh:'明夷',li:'101000',f:'canh',m:'Ánh sáng bị che khuất',g:'Trí tuệ và đức hạnh đang bị đàn áp. Hãy che giấu sự thông minh của mình, hành xử như người bình thường. Không phải lúc để tỏa sáng — hãy ẩn nhẫn và chờ thời.'},
  {n:'Gia Nhân',zh:'家人',li:'101011',f:'tot',m:'Gia đình, tổ chức nội bộ',g:'Hãy chú trọng vào việc nội bộ — gia đình và tổ chức của bạn. Mỗi người biết vai trò của mình. Sự hài hòa trong nhà là nền tảng cho mọi thành công bên ngoài.'},
  {n:'Khuê',zh:'睽',li:'110101',f:'canh',m:'Đối lập, bất đồng',g:'Có sự đối lập và hiểu lầm. Trong bất đồng vẫn có điểm chung — hãy tìm kiếm điểm đó. Việc nhỏ có thể tiến, việc lớn cần chờ thời cơ hòa hợp trở lại.'},
  {n:'Kiển',zh:'蹇',li:'001010',f:'canh',m:'Đường gập ghềnh, chướng ngại',g:'Con đường phía trước nhiều khó khăn. Không nên tiến thẳng — hãy tìm đường vòng hoặc quay về chuẩn bị tốt hơn. Cần đến sự giúp đỡ của bạn bè và đồng minh.'},
  {n:'Giải',zh:'解',li:'010100',f:'tot',m:'Giải thoát, tháo gỡ',g:'Gút mắc và chướng ngại đang được tháo gỡ. Thời điểm giải phóng — hãy tha thứ và buông bỏ. Đừng giữ oán giận. Trở về bình thường là điều tốt nhất lúc này.'},
  {n:'Tổn',zh:'損',li:'110001',f:'trung',m:'Bớt đi để tiến lên',g:'Đôi khi phải bớt phần dưới để bổ sung phần trên. Hy sinh nhỏ để đạt mục tiêu lớn hơn. Sự thành thật trong dâng hiến — dù ít nhưng thật lòng — vẫn được chấp nhận.'},
  {n:'Ích',zh:'益',li:'100011',f:'tot',m:'Tăng ích, phát triển',g:'Thời điểm của sự tăng trưởng và phát triển. Phần trên bớt đi để bổ sung phần dưới — người có quyền lực chia sẻ với người dưới. Hành động lớn và vượt sông được khuyến khích.'},
  {n:'Quải',zh:'夬',li:'111110',f:'canh',m:'Quyết đoán, đột phá',g:'Cần hành động quyết đoán để loại bỏ điều sai trái. Nói thật trước công chúng, không thể dùng vũ lực mà phải dùng chính nghĩa. Nguy hiểm — nhưng không hành động còn nguy hơn.'},
  {n:'Cấu',zh:'姤',li:'011111',f:'canh',m:'Gặp gỡ bất ngờ',g:'Một cuộc gặp gỡ đang xảy ra — nhưng hãy cẩn thận với sự hấp dẫn bề ngoài. Người phụ nữ mạnh mẽ khó kiểm soát. Không nên hôn nhân vội vàng lúc này. Chú ý đến người mới xuất hiện trong cuộc đời.'},
  {n:'Tụy',zh:'萃',li:'000110',f:'tot',m:'Tụ họp, tập hợp',g:'Thời điểm của sự quy tụ và đoàn kết. Hãy tụ họp những người cùng chí hướng. Lễ hội và sự kết nối xã hội đang thuận lợi. Chuẩn bị phòng ngừa bất trắc khi mọi người tụ họp.'},
  {n:'Thăng',zh:'升',li:'011000',f:'tot',m:'Thăng lên, tiến lên từ từ',g:'Như cây cỏ mọc lên từ đất — tiến lên từng bước vững chắc. Đây không phải bước nhảy vọt mà là sự tăng trưởng ổn định. Hướng Nam để tìm kiếm cơ hội.'},
  {n:'Khốn',zh:'困',li:'010110',f:'canh',m:'Kiệt sức, bí bách',g:'Đang bị vây hãm và kiệt sức. Lời nói không được tin — hãy để hành động chứng minh. Kiên trì với phẩm giá, đừng từ bỏ nguyên tắc. Người quân tử biết vươn lên từ gian khổ.'},
  {n:'Tỉnh',zh:'井',li:'011010',f:'trung',m:'Giếng nước — nguồn cội',g:'Hãy trở về với nguồn gốc và giá trị cốt lõi. Như giếng cung cấp nước — đừng thay đổi vị trí, hãy đào sâu hơn. Sự ổn định trong việc phục vụ cộng đồng.'},
  {n:'Cách',zh:'革',li:'101110',f:'trung',m:'Cách mạng, thay đổi',g:'Thay đổi lớn đang đến. Thay đổi chỉ được chấp nhận khi đúng lúc và có lý do chính đáng. Sau khi cách mạng thành công, cần ổn định lại. Đừng cách mạng vì lợi ích cá nhân.'},
  {n:'Đỉnh',zh:'鼎',li:'011101',f:'tot',m:'Đỉnh vạc — chuyển hóa',g:'Như chiếc vạc nấu chín thức ăn để dâng cúng — sự chuyển hóa tạo ra điều mới. Thời điểm tốt để hợp tác với người tài giỏi và đạt được mục tiêu lớn. Sự ổn định cao quý.'},
  {n:'Chấn',zh:'震',li:'100100',f:'canh',m:'Sấm sét, chấn động',g:'Sự kiện đột ngột gây chấn động. Sau cơn sốc ban đầu, hãy lấy lại bình tĩnh — rồi cười. Sấm sét thức tỉnh và thanh lọc. Tự xem xét lại bản thân sau sự kiện này.'},
  {n:'Cấn',zh:'艮',li:'001001',f:'trung',m:'Núi — dừng lại',g:'Biết khi nào phải dừng lại — đó là trí tuệ. Thiền định và hướng vào nội tâm. Không phải thời điểm tiến lên. Hãy giữ tĩnh tâm và không bị cuốn vào xúc động bên ngoài.'},
  {n:'Tiệm',zh:'漸',li:'001011',f:'tot',m:'Dần dần, từng bước',g:'Tiến lên từng bước như con ngỗng hoang bay dần lên cao. Không thể vội vàng — hãy tuân theo đúng trình tự. Hôn nhân, sự nghiệp, mọi việc quan trọng đều cần thời gian và đúng thủ tục.'},
  {n:'Quy Muội',zh:'歸妹',li:'110100',f:'canh',m:'Hôn nhân, về nhà',g:'Hành động xuất phát từ cảm xúc hơn là lý trí. Cần cẩn thận với các mối quan hệ mới. Không thuận lợi cho việc khởi sự. Nhìn nhận thực tế thay vì mộng tưởng.'},
  {n:'Phong',zh:'豐',li:'101100',f:'tot',m:'Phong phú, đỉnh cao',g:'Đang ở đỉnh cao của phong phú và vinh quang. Đừng lo lắng về việc này không kéo dài — hãy tận hưởng và trân trọng. Như mặt trời lúc ngọ — sau đỉnh cao sẽ đến giai đoạn khác.'},
  {n:'Lữ',zh:'旅',li:'001101',f:'canh',m:'Lữ hành, xa xứ',g:'Đang ở vị trí xa lạ hoặc tạm bợ. Cẩn thận và khiêm nhường khi ở đất khách. Việc nhỏ thuận lợi, nhưng tránh va chạm khi đang lưu lạc. Hành xử đúng mực để được bảo vệ.'},
  {n:'Tốn',zh:'巽',li:'011011',f:'trung',m:'Gió — thấm dần',g:'Như gió thổi nhẹ nhàng nhưng thấm vào mọi nơi. Sự kiên trì và nhún nhường. Hướng dẫn người khác bằng sự nhẹ nhàng chứ không phải cưỡng ép. Tìm kiếm người hướng dẫn bạn.'},
  {n:'Đoài',zh:'兌',li:'110110',f:'tot',m:'Hồ — vui vẻ, chia sẻ',g:'Vui vẻ và hứng khởi. Chia sẻ niềm vui với người khác sẽ nhân đôi nó. Ngôn từ ngọt ngào và sự giao tiếp tích cực. Nhưng tránh bị dẫn dụ bởi lời nịnh hót.'},
  {n:'Hoán',zh:'渙',li:'010011',f:'trung',m:'Tan rã, phân tán',g:'Sự đông cứng đang tan ra. Như băng tan — rào cản đang được tháo bỏ. Thời điểm để đến đền thờ, tập hợp mọi người vì mục tiêu chung. Vượt qua nước lớn được.'},
  {n:'Tiết',zh:'節',li:'110010',f:'trung',m:'Tiết chế, giới hạn',g:'Biết giới hạn là trí tuệ. Tiết kiệm và tiết chế mang lại sự bền vững. Tuy nhiên đừng quá khắt khe với bản thân và người khác — quy tắc khắc nghiệt khó duy trì lâu dài.'},
  {n:'Trung Phu',zh:'中孚',li:'110011',f:'tot',m:'Tin tưởng nội tâm, thành tín',g:'Sự thành thật và tin tưởng từ trái tim. Khi bạn thật sự tin vào điều gì đó, ảnh hưởng của bạn sẽ lan rộng như tiếng kêu của con hạc. Lòng trung thực sẽ cảm hóa ngay cả kẻ cứng đầu nhất.'},
  {n:'Tiểu Quá',zh:'小過',li:'001100',f:'canh',m:'Vượt qua một chút',g:'Được phép vượt qua một chút so với thông thường — nhưng chỉ một chút thôi. Như chim nhỏ bay thấp an toàn hơn bay cao. Việc nhỏ thuận, việc lớn không nên làm lúc này.'},
  {n:'Ký Tế',zh:'既濟',li:'101010',f:'trung',m:'Đã hoàn thành',g:'Mọi việc đã đúng chỗ và hoàn tất. Nhưng đây chính là lúc nguy hiểm nhất — thành công dễ sinh ra sơ suất. Hãy duy trì cảnh giác và trật tự. Như lửa trên nước — phải giữ cân bằng liên tục.'},
  {n:'Vị Tế',zh:'未濟',li:'010101',f:'trung',m:'Chưa hoàn thành',g:'Chưa đến lúc hoàn thành — vẫn còn phải vượt qua. Như cáo nhỏ sắp sang sông nhưng còn ướt đuôi. Tiếp tục cố gắng, mục tiêu đang ở gần. Sắp xong rồi — đừng bỏ cuộc.'},
];

// Trigram binary lookup (lower 3 bits = lower trigram, upper 3 bits = upper trigram)
// Map binary string (6 chars, bottom→top) to QUE index (0-based)
const LINE_TO_IDX = {};
QUE.forEach((q,i) => { LINE_TO_IDX[q.li] = i; });

  function findHexagram(binary) {
    // Direct lookup
    if (LINE_TO_IDX[binary] !== undefined) return LINE_TO_IDX[binary];
    // Fallback: find closest.
    // 64 mã hào phủ đủ 2^6 tổ hợp nên nhánh này KHÔNG BAO GIỜ chạy với 6 hào
    // hợp lệ — tới đây nghĩa là bảng QUE đã hỏng (trùng mã hoặc thiếu tổ hợp).
    // Kêu lên: chính vì nhánh này trả quẻ gần đúng trong im lặng mà 49/64 quẻ
    // sai mã hào sống được rất lâu không ai thấy. `scripts/check-hexagram-table.mjs`
    // chặn ở CI, dòng này là lưới cuối lúc chạy thật.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[kinh-dich] Bảng 64 quẻ hỏng: không tra được mã hào ' + binary);
    }
    let best = 0,
      bestScore = -1;
    QUE.forEach((q, i) => {
      let score = 0;
      for (let j = 0; j < 6; j++) if (q.li[j] === binary[j]) score++;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best;
  }

  // ── Từ 6 hào (mảng {val,yang,changing}) → quẻ chính + quẻ biến ──
  function resolve(currentLines) {
    const primary = currentLines.map((l) => (l.yang ? '1' : '0')).join('');
    const changed = currentLines
      .map((l) => (l.changing ? (l.yang ? '0' : '1') : l.yang ? '1' : '0'))
      .join('');
    const hasChanging = currentLines.some((l) => l.changing);
    const pIdx = findHexagram(primary);
    const cIdx = hasChanging ? findHexagram(changed) : -1;
    const que = QUE[pIdx] || QUE[0];
    const cQue = cIdx >= 0 ? QUE[cIdx] : null;
    return { primary, changed, hasChanging, pIdx, cIdx, que, cQue };
  }

  const _fbCls = { tot: 'fb-tot', trung: 'fb-trung', canh: 'fb-canh' };
  const _fbLabel = { tot: '✦ Cát', trung: '◆ Bình', canh: '⚠ Cần thận' };

  // ── HTML lưới quẻ (byte khớp bản standalone) ──
  function gridHTML(r) {
    const que = r.que,
      cQue = r.cQue,
      pIdx = r.pIdx,
      cIdx = r.cIdx;
    let html = `<div class="que-card primary">
    <div class="que-eyebrow">Quẻ Chính</div>
    <div class="que-symbol">${String.fromCodePoint(0x4dc0 + pIdx)}</div>
    <div class="que-name">${que.n}</div>
    <div class="que-zh">${que.zh} · ${que.li
      .split('')
      .map((b) => (b === '1' ? '⚊' : '⚋'))
      .join(' ')}</div>
    <span class="fortune-badge ${_fbCls[que.f]}">${_fbLabel[que.f]}</span>
    <div class="que-meaning">${que.m}</div>
    <div class="que-guidance">${que.g}</div>
  </div>`;

    if (cQue) {
      html += `<div class="que-card">
      <div class="que-eyebrow">Quẻ Biến (xu hướng)</div>
      <div class="que-symbol" style="opacity:0.7">${String.fromCodePoint(0x4dc0 + cIdx)}</div>
      <div class="que-name">${cQue.n}</div>
      <div class="que-zh">${cQue.zh} · ${cQue.li
        .split('')
        .map((b) => (b === '1' ? '⚊' : '⚋'))
        .join(' ')}</div>
      <span class="fortune-badge ${_fbCls[cQue.f]}">${_fbLabel[cQue.f]}</span>
      <div class="que-meaning">${cQue.m}</div>
      <div class="que-guidance" style="font-size:13px">${cQue.g}</div>
    </div>`;
    } else {
      html += `<div class="que-card" style="display:flex;align-items:center;justify-content:center;opacity:0.5">
      <div style="text-align:center">
        <div style="font-size:32px;margin-bottom:8px">—</div>
        <div style="font-size:13px;color:var(--text-lt)">Không có hào động<br>Tình huống ổn định<br>Chỉ đọc quẻ chính</div>
      </div>
    </div>`;
    }
    return html;
  }

  const _esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );

  /**
   * Gom các mục cổ pháp chỉ ra: luật đọc + lời quẻ / hào từ áp dụng.
   *
   * Vì sao KHÔNG chỉ hiện hết 6 hào: cổ pháp (考變占) rẽ theo SỐ hào động, có ca
   * chỉ đọc lời quẻ, có ca đọc hào của quẻ BIẾN. Bày cả 6 hào ra là bỏ mất phần
   * quan trọng nhất — biết ĐỌC CÁI NÀO. Xem `kinh-dich-doc.js`.
   *
   * Trả `[]` khi thiếu module phụ, để trang cũ chưa nạp đủ script không vỡ.
   */
  function loiDoc(r, currentLines) {
    const Doc = root.KinhDichDoc || (typeof require === 'function' ? null : null);
    const Hao = root.KinhDichHao || null;
    if (!Doc || !Hao) return null;
    const chon = Doc.chonLoiDoc(currentLines || []);
    const muc = chon.doc
      .map((m) => {
        const kw = (m.nguon === 'bien' ? r.cIdx : r.pIdx) + 1;
        if (kw < 1) return null;
        const loi = Hao.layLoi(kw, m);
        if (!loi) return null;
        return { ...m, ...loi, queTen: (m.nguon === 'bien' ? r.cQue : r.que).n };
      })
      .filter(Boolean);
    return { luat: chon.luat, soHaoDong: chon.soHaoDong, muc };
  }

  /** HTML khối "Cổ pháp chỉ đọc gì" — đặt dưới lưới quẻ. */
  function docHTML(r, currentLines) {
    const d = loiDoc(r, currentLines);
    if (!d) return '';
    const rows = d.muc
      .map(
        (m) => `<div class="kd-loi${m.chinh ? ' kd-chu' : ''}">
      <div class="kd-loi-nhan">${_esc(m.nhan)} · ${_esc(m.queTen)}${m.nguon === 'bien' ? ' (quẻ biến)' : ''}${m.chinh && d.muc.length > 1 ? ' · làm chủ' : ''}</div>
      <div class="kd-loi-han">${_esc(m.han)}</div>
      <div class="kd-loi-viet">${_esc(m.viet)}</div>
    </div>`
      )
      .join('');
    return `<div class="kd-doc">
    <div class="kd-doc-luat"><b>${d.soHaoDong} hào động</b> — ${_esc(d.luat)}</div>
    ${rows}
    <div class="kd-doc-nguon">Luật đọc theo <i>Khảo Biến Chiêm</i> (Chu Hy, <i>Dịch Học Khải Mông</i>) — số hào động quyết định đọc lời quẻ hay hào từ, ở quẻ chính hay quẻ biến.</div>
  </div>`;
  }

  // ── Tranh quẻ ("Quẻ Phục Hy bằng hình") ──────────────────────────────────
  // 64 bức vẽ sẵn, cất ở Supabase Storage. Tên file mang CẢ hai chỉ số:
  // `<phụcHy 2 chữ số>-kw<KingWen 2 chữ số>.png`.
  const ANH_GOC =
    'https://dciwkfdqhhddeymlisey.supabase.co/storage/v1/object/public/portraits/que-phuc-hy';

  /** Chỉ số Phục Hy (tiên thiên) = nhị phân, hào 1 là bit THẤP NHẤT, dương=1. */
  function phucHyIndex(li) {
    let n = 0;
    for (let i = 0; i < 6; i++) if (li[i] === '1') n += 1 << i;
    return n;
  }

  function _anhUrl(li, kingWen) {
    const p = String(phucHyIndex(li)).padStart(2, '0');
    const k = String(kingWen).padStart(2, '0');
    return `${ANH_GOC}/${p}-kw${k}.png`;
  }

  /**
   * Câu MỞ của một hào từ — chính là cái CẢNH được vẽ trong tranh; câu sau
   * thường là lời khuyên rút ra, không phải hình. Lấy phần đầu để chú thích đọc
   * lướt được; hào từ ĐẦY ĐỦ vẫn nằm ở khối "cổ pháp chỉ đọc" bên dưới nên
   * không mất chữ nào.
   */
  function _canhVe(viet) {
    const s = String(viet == null ? '' : viet).trim();
    const i = s.indexOf('. ');
    const dau = i > 0 ? s.slice(0, i + 1) : s;
    return dau.length > 130 ? dau.slice(0, 128).replace(/\s+\S*$/, '') + '…' : dau;
  }

  /**
   * Khối tranh quẻ.
   *
   * ẢNH ĐỂ NGUYÊN — không kẻ tầng, không phủ nhãn lên mặt tranh. Nhiều người
   * lưu bức tranh về vì nó đẹp, mà lưới chia sáu tầng thì đi theo file ra ngoài.
   * Phần "hào nào ứng với cái gì" chuyển xuống danh sách chú thích dưới tranh.
   *
   * Vẽ ảnh của MỌI quẻ mà luật đọc thực sự dùng: 4–6 hào động thì lời nằm ở quẻ
   * BIẾN, lúc đó bày tranh quẻ chính mà không bày tranh quẻ biến là chỉ sai chỗ.
   */
  function anhHTML(r, currentLines) {
    const d = loiDoc(r, currentLines);
    const Hao = root.KinhDichHao || null;
    // LUÔN bày tranh quẻ CHÍNH — đó là quẻ người ta vừa gieo ra. Chỉ bày quẻ
    // biến khi luật đọc thật sự dùng tới nó (4–6 hào động).
    //
    // 🐞 Bản đầu chỉ bày quẻ mà luật đọc dùng, nên gieo 4 hào động ra một bức
    // tranh của quẻ KHÁC hẳn quẻ vừa gieo, không lời nào giải thích. Test bắt
    // được. Không có module luật đọc thì vẫn bày quẻ chính — bức tranh tự nó đã
    // là một cách nhìn quẻ, chỉ mất phần đánh dấu hào đang đọc.
    const nguonDung = new Set(['chinh']);
    if (d) d.muc.forEach((m) => nguonDung.add(m.nguon));

    const khoi = [];
    [
      { nguon: 'chinh', que: r.que, idx: r.pIdx, nhan: 'Quẻ Chính' },
      { nguon: 'bien', que: r.cQue, idx: r.cIdx, nhan: 'Quẻ Biến' },
    ].forEach((v) => {
      if (!v.que || !nguonDung.has(v.nguon)) return;
      // Hào nào đang được đọc — CHỈ tính mục hào của ĐÚNG quẻ này. Mục "lời
      // quẻ" không trỏ vào hào nào, cả bức là câu trả lời.
      const dangDoc = new Set(
        (d ? d.muc : [])
          .filter((m) => m.nguon === v.nguon && m.loai === 'hao' && m.hao)
          .map((m) => m.hao)
      );
      const loi = Hao && Hao.HAO ? Hao.HAO[v.idx] : null;
      const dsHao =
        loi && loi.hv
          ? `<ol class="kd-anh-hao">${loi.hv
              .map((t, i) => {
                const on = dangDoc.has(i + 1);
                return `<li${on ? ' class="kd-hao-doc"' : ''}><b>Hào ${i + 1}</b> ${_esc(
                  _canhVe(t)
                )}${on ? '<i class="kd-hao-tag">đang đọc</i>' : ''}</li>`;
              })
              .join('')}</ol>`
          : '';
      khoi.push(`<figure class="kd-anh">
      <div class="kd-anh-khung">
        <img src="${_anhUrl(v.que.li, v.idx + 1)}" alt="Tranh quẻ ${_esc(v.que.n)}"
             loading="lazy" decoding="async" width="1024" height="1536">
      </div>
      <figcaption>
        <b>${_esc(v.nhan)} · ${_esc(v.que.n)} ${_esc(v.que.zh)}</b>${
          loi && loi.qv ? `<span class="kd-anh-que">${_esc(loi.qv)}</span>` : ''
        }
      </figcaption>
      ${dsHao}
    </figure>`);
    });

    if (!khoi.length) return '';
    return `<div class="kd-anhs">${khoi.join('')}</div>`;
  }

  // ── Dữ liệu thô cho rail (trợ lý luận sâu) ──
  function railData(r, cauHoi, currentLines) {
    const dongHao = (currentLines || [])
      .map((l, i) => (l.changing ? `hào ${i + 1} (${l.val})` : ''))
      .filter(Boolean)
      .join(', ');
    const d = loiDoc(r, currentLines);
    return {
      cauHoi: cauHoi || '',
      queChinh: `${r.que.n} (${r.que.zh}) — ${r.que.m}`,
      queBien: r.cQue ? `${r.cQue.n} (${r.cQue.zh}) — ${r.cQue.m}` : '',
      haoDong: dongHao || 'không có hào động',
      // Đưa ĐÚNG phần cổ pháp chỉ ra cho rail, kèm luật, để trợ lý luận bám vào
      // đó thay vì tự chọn hào — nếu không thì chữ trên màn hình nói một đằng,
      // trợ lý luận một nẻo.
      luatDoc: d ? d.luat : '',
      loiApDung: d
        ? d.muc.map((m) => `${m.nhan} (${m.queTen}${m.nguon === 'bien' ? ', quẻ biến' : ''}): ${m.han} — ${m.viet}`)
        : [],
    };
  }

  const API = { QUE, findHexagram, resolve, gridHTML, docHTML, loiDoc, anhHTML, phucHyIndex, railData };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.KinhDichTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
