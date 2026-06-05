// scripts/tuvi-compat/variants.mjs
// Pool variants để tránh duplicate prose qua hàng nghìn bài
// Mỗi key chứa 5-8 cách diễn đạt cùng ý

// ── Intro openings ────────────────────────────────────────────────────────────
export const INTRO = [
  'Cổ pháp Tử Vi và Tử Bình từ Tam Mệnh Thông Hội đến Hiệp Kỷ Biện Phương Thư đều nhấn mạnh: muốn xét tương hợp hai tuổi, cần soi đủ ba tầng — Thiên Can, Địa Chi và Nạp Âm Lục Thập Hoa Giáp. Một tầng hợp chưa đủ kết luận tốt; một tầng xung cũng chưa thể vội bỏ.',
  'Theo các sách tổ truyền, hai tuổi muốn xem có hợp nhau hay không phải đi qua ba lớp khảo cứu: trước xét Thiên Can sinh khắc, kế đến soi Địa Chi tam hợp lục xung, cuối cùng đối chiếu Nạp Âm trong Lục Thập Hoa Giáp. Phép đoán này lưu truyền hơn nghìn năm, vẫn giữ giá trị thực tiễn.',
  'Phép xem tương hợp tuổi không nằm ở một con số đơn lẻ mà ở thế tương quan của ba tầng — Can, Chi và Nạp Âm. Mỗi tầng kể một câu chuyện riêng; chỉ khi ghép cả ba mới định được mệnh số chung của hai người.',
  'Trong các sách kinh điển như Tam Mệnh Thông Hội của Vạn Dân Anh và Hiệp Kỷ Biện Phương Thư, phép đoán tương hợp luôn được trình bày theo trật tự: Thiên Can trước, Địa Chi sau, Nạp Âm sau cùng. Trật tự này phản ánh từ nguyên khí trời, đến biểu hiện đất, rồi tới cốt cách vật chất con người.',
  'Hai tuổi đặt cạnh nhau là một câu hỏi mở, và cổ pháp đưa ra ba thước đo để trả lời: Thiên Can xét trục thời gian thượng tầng, Địa Chi xét trục không gian địa lý, Nạp Âm xét chất liệu vật cụ thể của mỗi mệnh.',
];

// ── Can relation phrases ──────────────────────────────────────────────────────
export const CAN_HOP_DESC = [
  'cặp can hợp được sách cổ gọi là "Lưỡng Can Tương Hợp", chủ về sự đồng thuận, hòa khí, hai bên dễ thấu hiểu và bổ trợ cho nhau từ căn cơ',
  'thuộc một trong năm cặp thiên can hợp hóa, mang ý nghĩa hai khí trời đan vào nhau tạo thành một hành mới, tượng trưng cho sự kết hợp sinh ra cái lớn hơn từng cá thể',
  'là sự gặp gỡ của hai khí dương–âm đối ngẫu trong mười can, sinh ra hành hợp hóa, theo cổ pháp coi là tốt cho mọi mối quan hệ dài hạn',
  'rơi vào "thiên can ngũ hợp", một thuật ngữ cổ chỉ năm cặp can có thể hóa thành hành mới khi gặp nhau, mang điềm tốt cho việc gắn bó',
];

export const CAN_KHAC_DESC = [
  'hai thiên can mang hành tương khắc, trong cổ pháp gọi là "Can Xung", thường gây ra sự bất đồng quan điểm trên tầng tư tưởng và phương châm sống',
  'ngũ hành của hai can rơi vào quan hệ tương khắc, làm cho khí trời giữa hai người không thuận, dễ sinh tranh luận và bất đồng trong việc lớn',
  'thuộc trường hợp thiên can xung khắc, cổ pháp xem là yếu tố trừ điểm; tuy nhiên nếu địa chi hợp tốt thì vẫn có thể bù trừ',
  'hai can tương khắc trên trục ngũ hành, biểu hiện ra ngoài đời sống là sự khác biệt về cá tính, lề lối, đôi khi là quan điểm gốc về cuộc sống',
];

export const CAN_SINH_DESC = [
  'hai thiên can có quan hệ tương sinh, một bên nâng đỡ một bên về mặt khí trời, hợp với tình thế người dìu người dắt',
  'ngũ hành của hai can tương sinh nhau, người này là nguồn nuôi dưỡng cho người kia, tạo cảm giác hòa hợp tự nhiên',
  'thuộc thế "Can Tương Sinh", trong cổ pháp được xem là tốt trung bình — không quá mặn nồng nhưng yên ổn lâu dài',
];

export const CAN_DONG_DESC = [
  'hai bên cùng một thiên can, mang đặc tính khí trời giống nhau, dễ đồng cảm nhưng cũng dễ chán vì thiếu sự bù trừ',
  'cùng thuộc một trong mười can, cả hai có nét tính cách và năng lượng tương đồng, hợp về sở thích nhưng cần đa dạng để tránh đơn điệu',
];

export const CAN_BINHHOA_DESC = [
  'thiên can hai bên không hợp cũng không khắc, ở thế bình hòa, ảnh hưởng đến quan hệ là trung tính',
  'hai can rơi vào quan hệ không xung không hợp, nghĩa là yếu tố thiên can không can dự nhiều vào tương hợp chung',
];

// ── Chi relation phrases ──────────────────────────────────────────────────────
export const TAMHOP_DESC = [
  'thuộc cùng một nhóm tam hợp địa chi, được cổ pháp ca tụng là "Tam Hợp Cục", chủ về sự đồng tâm hiệp lực, dễ chia sẻ chí hướng và giúp nhau khi khó',
  'rơi vào tam hợp — một trong bốn cục lớn của địa chi (Thân-Tý-Thìn, Tỵ-Dậu-Sửu, Dần-Ngọ-Tuất, Hợi-Mão-Mùi) — mang điềm rất tốt cho cộng tác bền lâu',
  'thuộc tam hợp địa chi, là quan hệ mạnh nhất giữa các chi, đại diện cho sự giao hòa trọn vẹn trên trục không gian, cổ thư xem là tương hợp tự nhiên',
  'cùng tam hợp, một thế cục lý tưởng theo Tử Bình; hai bên không cần cố gắng cũng cảm thấy thông hiểu, hợp tác từ bản năng',
];

export const LUCHOP_DESC = [
  'thuộc lục hợp — sáu cặp địa chi hợp đối, sách cổ xem là quan hệ hài hòa và bền bỉ, có sức bù đắp cho nhau những gì còn thiếu',
  'là cặp lục hợp địa chi, hợp về tính cách và lề lối ứng xử, dễ tìm thấy điểm chung trong sinh hoạt thường ngày',
  'rơi vào lục hợp, một dạng tương hợp dịu hơn tam hợp nhưng vô cùng ổn định, ưa cuộc sống đều đặn và lâu dài',
  'thuộc một trong sáu cặp lục hợp địa chi, mang đặc tính nâng đỡ qua lại, một bên đem cái cứng thì bên kia có cái mềm bù vào',
];

export const TUXUNG_DESC = [
  'rơi vào tứ hành xung — sáu cặp địa chi đối nhau trên bàn la kinh — đây là quan hệ xung khắc mạnh nhất giữa các chi, dễ sinh tranh chấp và đối lập trên trục căn bản',
  'thuộc lục xung, cổ pháp xếp vào nhóm cần tránh hoặc cần hóa giải kỹ, vì xung khắc ở tầng địa chi ảnh hưởng trực tiếp đến đời sống thực tế',
  'là cặp địa chi đối xung trên bàn 12 cung, sách cổ gọi là "Tương Xung", đôi khi gặp nhau là va, dù không ác ý cũng dễ sinh hiểu lầm',
  'rơi vào trục đối xung của địa chi — Tý đối Ngọ, Sửu đối Mùi, Dần đối Thân, Mão đối Dậu, Thìn đối Tuất, Tỵ đối Hợi — vốn được xem là khắc tinh tự nhiên',
];

export const LUCHAI_DESC = [
  'thuộc lục hại — sáu cặp địa chi hại nhau ngầm, cổ pháp gọi là "Tương Hại", không xung mặt nhưng âm thầm bất lợi qua lại',
  'rơi vào lục hại, một dạng bất hòa kín đáo hơn tứ xung, biểu hiện qua những bất ổn nhỏ tích tụ dần',
  'thuộc cặp lục hại địa chi, sách cổ xem là yếu tố trừ điểm vừa phải, có thể hóa giải bằng cách hai bên hiểu rõ tính cách nhau',
];

export const TAMHINH_DESC = [
  'rơi vào tam hình — nhóm địa chi gây hình thương lẫn nhau, cổ pháp xem là yếu tố cần được hóa giải qua hành động cụ thể',
  'thuộc bộ tam hình, là quan hệ "có hình" trên địa chi, gây ra những trở ngại không xung không hại nhưng vẫn để lại dấu vết',
];

export const TUHINH_DESC = [
  'rơi vào tự hình — bốn chi tự gây tổn thương cho chính mình (Thìn, Ngọ, Dậu, Hợi), khi hai bên cùng một chi này thì khí dồn nhau quá mức, dễ sinh chán nản',
  'thuộc tự hình địa chi, hai bên cùng một chi đặc biệt, cộng hưởng quá mạnh dẫn đến mất cân bằng nội tại',
];

export const CHI_SINH_DESC = [
  'hai địa chi có hành tương sinh, không thuộc tam-lục hợp nhưng vẫn có dòng khí nuôi dưỡng từ bên này sang bên kia',
  'ngũ hành địa chi tương sinh, là thế ấm áp tự nhiên dù không phải hợp cục chính danh',
  'địa chi hai bên ở quan hệ tương sinh, dòng khí chảy mượt, không trắc trở',
];

export const CHI_KHAC_DESC = [
  'ngũ hành địa chi hai bên tương khắc nhẹ, không nằm trong tứ xung lục hại nhưng cũng làm khí giao tiếp giữa hai người không thật trơn tru',
  'địa chi tương khắc về hành, là thế cản nhau ở tầng vi tế, không nguy hiểm nhưng dễ làm hai bên không thoải mái',
];

export const CHI_DONG_DESC = [
  'hai địa chi cùng hành nhưng khác chi, tạo thế giống nhau quá, dễ thấu hiểu mà cũng dễ thiếu yếu tố mới mẻ',
  'cùng hành địa chi, hai bên giống nhau trong nhịp sinh hoạt nhưng cần thêm sự khác biệt để bổ sung lẫn nhau',
];

export const CHI_BINHHOA_DESC = [
  'địa chi hai bên không xung không hợp, ở thế trung dung, không tạo ra ảnh hưởng đáng kể tích cực hay tiêu cực',
  'không có quan hệ đặc biệt nào trên trục địa chi, hai bên đứng độc lập trong không gian địa lý',
];

// ── Nạp âm relation phrases ───────────────────────────────────────────────────
export const NAPAM_SINH = [
  'nạp âm hai bên ở quan hệ tương sinh — đây là một trong những yếu tố tốt nhất trong cổ pháp, cho thấy chất liệu vật cụ thể của hai mệnh nuôi dưỡng và bồi đắp lẫn nhau',
  'hai nạp âm tương sinh theo ngũ hành, sách cổ gọi là "Nạp Âm Hòa Hợp", chủ về sự dìu đỡ bền vững ở tầng vật chất và đời sống cụ thể',
  'nạp âm hai bên tạo thế tương sinh, một bên là nguồn cho bên kia, hợp với mọi loại liên kết đòi hỏi tính bền và lâu dài',
];

export const NAPAM_KHAC = [
  'nạp âm hai bên ở quan hệ tương khắc — đây là yếu tố cổ pháp lưu ý, vì nạp âm là chất liệu vật cụ thể của mệnh, khắc nhau ở tầng này thường gây va chạm trong sinh hoạt thực tế',
  'hai nạp âm tương khắc theo ngũ hành, biểu hiện qua bất đồng trong sở thích, quan điểm tiêu xài, lề lối tổ chức cuộc sống hàng ngày',
  'nạp âm khắc nhau, cổ pháp xem đây là yếu tố trừ điểm, cần địa chi hoặc thiên can hợp tốt để bù đắp lại',
];

export const NAPAM_DONG = [
  'nạp âm hai bên cùng một hành — cổ pháp gọi là "Đồng Nạp Âm", chủ về sự giống nhau trong chất sống, hai bên dễ đồng điệu nhưng cần biến hóa thêm để tránh đơn điệu',
  'hai mệnh cùng nạp âm, có chất liệu tinh thần và lối sống tương đồng, hợp về cảm thụ nhưng đôi khi thiếu sự hỗ tương khác hành',
  'cùng một hành nạp âm, hai bên có gốc giống nhau trên tầng vật cụ thể, hợp lâu dài nếu biết tự làm mới',
];

export const NAPAM_BINHHOA = [
  'nạp âm hai bên không sinh không khắc, ở thế bình hòa, yếu tố này không can dự nhiều vào tương hợp tổng thể',
  'hai nạp âm trung tính với nhau, không phải điểm mạnh cũng không phải điểm yếu trong cấu trúc tương hợp',
];

// ── Verdict (final score) ─────────────────────────────────────────────────────
export const VERDICT = {
  'rat-hop': [
    'Đây là cặp tuổi rất hợp theo cổ pháp — cả ba tầng Thiên Can, Địa Chi và Nạp Âm đều có yếu tố tích cực, hợp lực với nhau tạo thành một cấu trúc tương hợp gần như lý tưởng',
    'Tổng quan ba tầng cho thấy đây là cặp tuổi tương hợp ở mức cao, cổ pháp xếp vào nhóm "Tam Hợp Toàn Cục", rất đáng để gắn bó dài lâu',
    'Cấu trúc tương hợp ba tầng của hai tuổi này được cổ pháp đánh giá rất cao — hiếm gặp đầy đủ yếu tố thuận như vậy trong sáu mươi hoa giáp',
  ],
  hop: [
    'Đây là cặp tuổi khá hợp theo cổ pháp — phần lớn các tầng đều có yếu tố thuận, một vài yếu tố trừ điểm không đủ làm thay đổi nhận định chung',
    'Tổng kết ba tầng cho thấy hai tuổi hợp nhau ở mức tốt, các yếu tố tích cực chiếm ưu thế rõ rệt so với yếu tố cần lưu ý',
    'Hai tuổi đứng cạnh nhau ở thế tương hợp tốt, đủ điều kiện theo cổ pháp để gắn bó bền vững',
  ],
  kha: [
    'Đây là cặp tuổi tương hợp ở mức khá — có một số yếu tố thuận đáng giá, đồng thời cũng có yếu tố cần lưu tâm; tổng thể vẫn là một quan hệ có thể vun đắp được',
    'Tổng kết ba tầng cho ra thế khá — không phải lý tưởng nhưng cũng không phải xấu, hai bên cần ý thức về điểm mạnh và điểm yếu để cùng phát huy',
    'Hai tuổi này ở mức tương hợp khá, không phải hợp tuyệt đối nhưng đủ nền tảng cho một quan hệ ổn định nếu cả hai chủ động vun bồi',
  ],
  'trung-binh': [
    'Đây là cặp tuổi ở mức tương hợp trung bình — có yếu tố thuận nhưng cũng có yếu tố xung khá rõ; quan hệ cần sự nỗ lực có ý thức từ cả hai bên để vượt qua các điểm khắc',
    'Tổng kết ba tầng cho thấy thế giằng co — yếu tố tích cực và yếu tố cản nhau gần như tương đương; thành bại phụ thuộc nhiều vào cách hai bên ứng xử',
    'Hai tuổi này có những điểm khắc đáng kể trên một hoặc hai tầng, cần hóa giải bằng nhận thức và phương pháp sống cụ thể',
  ],
  'khong-hop': [
    'Đây là cặp tuổi cổ pháp xem là khó hợp — nhiều yếu tố xung khắc tích lại trên các tầng, cần sự hóa giải tích cực và sự thấu hiểu sâu sắc để có thể vượt qua',
    'Tổng kết ba tầng cho thấy yếu tố xung khắc chiếm ưu thế; sách cổ khuyên cần thận trọng, nhưng không có nghĩa là tuyệt đối không thể, miễn hai bên ý thức rõ và chủ động hóa giải',
    'Hai tuổi này gặp nhiều điểm cản trên các trục Can, Chi hoặc Nạp Âm; theo cổ pháp đây là cặp cần nhiều công phu hóa giải hơn so với phần lớn các cặp khác',
  ],
};

// ── Hôn nhân — phần chi tiết ──────────────────────────────────────────────────
export const HN_TINHCAM_GOOD = [
  'Về mặt tình cảm, cấu trúc tương hợp thuận giúp hai người dễ rung động chung nhịp; những lúc vui buồn của bên này thường được bên kia cảm nhận nhanh chóng, sinh ra mối đồng cảm sâu trên nền tảng khí trời tự nhiên.',
  'Tình cảm trong cặp đôi này có nền móng vững — không phải sự nồng cháy bùng cháy chốc lát, mà là sự gắn bó kín đáo, càng sống bên nhau càng thấy bền.',
  'Khía cạnh tình cảm là điểm mạnh tự nhiên của cặp này. Cổ pháp xem rằng khi hai khí thuận hợp ở tầng can chi nạp âm, tình cảm cũng thuận theo, không cần gắng gỏi vẫn ấm.',
];

export const HN_TINHCAM_BAD = [
  'Về mặt tình cảm, các yếu tố xung khắc trên tầng địa chi hoặc nạp âm có thể khiến hai bên dễ hiểu lầm nhau ở những chuyện nhỏ; cảm xúc của bên này không phải lúc nào cũng được bên kia tiếp nhận đúng như ý muốn.',
  'Tình cảm trong cặp này đòi hỏi ý thức nuôi dưỡng có chủ đích. Cổ pháp khuyên hai bên cần học cách diễn đạt rõ ràng, đừng để khí xung tự nhiên hóa thành xa cách.',
  'Khía cạnh tình cảm có những điểm cần khéo léo. Khi yếu tố khắc xuất hiện ở Can hay Chi, biểu hiện ra ngoài thường là sự khác biệt về cách thể hiện yêu thương — bên này thích trực diện, bên kia thích kín đáo, dễ làm cả hai cảm thấy không được hiểu.',
];

export const HN_TAICHINH_GOOD = [
  'Về tài chính, cặp tuổi này có khả năng phối hợp tốt trong quản lý gia đình. Một bên giỏi vun đắp, một bên giỏi sử dụng — bổ sung cho nhau tạo thành thế tài chính ổn định.',
  'Khía cạnh tài chính thường là điểm sáng — hai bên có xu hướng đồng thuận về cách chi tiêu và đầu tư, ít có xung đột lớn về tiền bạc dài hạn.',
  'Cấu trúc tương hợp thuận trên tầng nạp âm và địa chi giúp tiền vào nhà đều đặn, không có biến động lớn; hai bên cũng dễ thống nhất về mục tiêu kinh tế chung.',
];

export const HN_TAICHINH_BAD = [
  'Về tài chính, cần thiết lập nguyên tắc rõ ràng từ sớm. Yếu tố khắc trên tầng nạp âm thường biểu hiện ở khác biệt quan điểm chi tiêu — bên thích tích lũy bên thích đầu tư, bên thích an toàn bên thích mạo hiểm.',
  'Khía cạnh tài chính là nơi cần thận trọng nhất. Nếu không thống nhất ngay từ đầu, các vụ tiền bạc nhỏ tích lại có thể tạo ra rạn nứt lớn hơn cả những bất đồng tình cảm.',
  'Tài chính trong cặp này đòi hỏi quy ước cụ thể. Cổ pháp khuyên hai bên nên có sổ chung rõ ràng, đừng để tiền bạc tù mù vì các yếu tố xung khắc dễ kéo ra tranh cãi.',
];

export const HN_CONCAI_GOOD = [
  'Về con cái, cặp tuổi này thường có duyên hậu vận — con cái khỏe mạnh, ngoan ngoãn, không gây nhiều lo lắng cho cha mẹ trong việc nuôi dạy.',
  'Khía cạnh con cái là điểm tốt của cặp này. Khí trời thuận hòa thường truyền sang đời sau, sinh ra con cái có tính cách cân bằng và đường học hành thuận lợi.',
  'Con cái trong cặp tuổi này thường có duyên với cha mẹ — không xung khắc với một trong hai bên, nên không khí gia đình ấm áp trọn vẹn.',
];

export const HN_CONCAI_NEUTRAL = [
  'Về con cái, cần chú ý đến thời điểm sinh và tuổi của con. Cổ pháp khuyên có thể chọn năm sinh cho con sao cho hợp với một trong hai cha mẹ để bù trừ những yếu tố xung khắc giữa hai vợ chồng.',
  'Khía cạnh con cái không phải là vấn đề lớn nhưng cũng không phải tuyệt nhất. Việc chọn tuổi sinh con và phương pháp giáo dục có ý thức sẽ giúp gia đình giữ được sự cân bằng.',
  'Con cái có thể trở thành điểm hợp hoặc điểm khắc tùy vào tuổi sinh; vì vậy hai vợ chồng nên tham khảo phép chọn năm sinh hợp tuổi trước khi quyết định.',
];

// ── Làm ăn — phần chi tiết ────────────────────────────────────────────────────
export const LA_VAITRO_HOP = [
  'Về phân chia vai trò, cặp tuổi này có cấu trúc bù trừ thuận lợi — một bên đứng đầu chiến lược, một bên lo vận hành; hai bên không tranh giành mà phối hợp như hai bánh của một cỗ xe.',
  'Cấu trúc tương hợp ở tầng địa chi giúp hai bên dễ thống nhất vai trò không cần nhiều tranh luận. Người chuyên sâu vào chuyên môn, người lo đối ngoại — phân chia tự nhiên và hiệu quả.',
  'Khía cạnh vai trò là điểm mạnh: hai bên có khả năng nhận thức nhanh ai làm gì tốt hơn, không có cái tôi cản trở trong việc phân công.',
];

export const LA_VAITRO_KHO = [
  'Về phân chia vai trò, đây là điểm dễ gây mâu thuẫn nhất. Yếu tố xung trên tầng địa chi hoặc thiên can thường biểu hiện qua việc cả hai cùng muốn nắm quyền quyết định, hoặc đẩy việc khó về bên kia.',
  'Cần thống nhất rõ ràng vai trò từ đầu bằng văn bản nếu có thể. Cổ pháp khuyên: khi tuổi xung, nên có một bên đứng tên chính thức, bên còn lại lùi về vai trò hỗ trợ để tránh chạm khí.',
  'Vai trò trong hợp tác này dễ chồng chéo nếu không quy định rõ. Lời khuyên là phân theo chức năng cụ thể — ai phụ trách tài chính, ai phụ trách sản phẩm, ai phụ trách thị trường — đừng để chung mọi việc.',
];

export const LA_RUIRO_HOP = [
  'Về rủi ro, cặp tuổi này có khả năng cùng nhận diện và xử lý nguy cơ tốt. Một bên thường nhạy với rủi ro dài hạn, một bên nhạy với rủi ro ngắn hạn — bổ sung tạo thành lưới an toàn kép.',
  'Khía cạnh quản trị rủi ro là điểm sáng. Yếu tố tương sinh trên nạp âm giúp hai bên có cùng cảm thức về sự an toàn cần thiết, không bên nào liều lĩnh quá mức.',
  'Khả năng phòng ngừa rủi ro của cặp này khá ổn. Khi hai khí thuận, hai bên cũng dễ thống nhất về mức độ chấp nhận được trong các quyết định lớn.',
];

export const LA_RUIRO_KHO = [
  'Về rủi ro, đây là vùng cần đặc biệt cẩn thận. Khi tuổi xung khắc, một bên thường liều, một bên quá cẩn; nếu không có cơ chế ràng buộc, các quyết định lớn sẽ bị kéo lệch về một thái cực.',
  'Cần thiết lập cơ chế bỏ phiếu hoặc bàn bạc trước với các quyết định trên một ngưỡng giá trị. Cổ pháp khuyên khi tuổi không thuận, đừng để một bên đơn phương quyết các việc lớn.',
  'Quản trị rủi ro là điểm yếu cấu trúc của cặp này. Nên có người thứ ba làm cố vấn trung lập, đặc biệt trong các thương vụ tài chính lớn hoặc đầu tư dài hạn.',
];

export const LA_LOINHUAN_HOP = [
  'Về lợi nhuận và phân chia, cấu trúc tương hợp tốt giúp hai bên không có hiềm khích về chia phần. Khí thuận thì mọi việc tài chính cũng thuận, miễn có quy ước rõ ràng từ đầu.',
  'Cặp tuổi này thường vận hành tốt trong các mô hình hợp tác có chia tỷ lệ rõ. Tương sinh nạp âm giúp lòng tin được duy trì lâu dài, không phải nghi kỵ qua lại.',
  'Khía cạnh lợi nhuận hiếm khi là vấn đề. Hai bên dễ đồng thuận về cách tái đầu tư, cách phân phối, cách dùng lợi nhuận cho mục tiêu chung.',
];

export const LA_LOINHUAN_KHO = [
  'Về lợi nhuận và phân chia, cần văn bản hóa mọi thỏa thuận từ trước. Tuổi xung nạp âm thường dẫn đến quan điểm khác nhau về việc rút lợi nhuận hay giữ lại tái đầu tư.',
  'Khía cạnh tài chính là nơi dễ phát sinh tranh chấp nhất. Nên thuê kế toán độc lập và lập điều khoản phân chia rõ trong hợp đồng từ đầu, đừng dựa vào thỏa thuận miệng.',
  'Lợi nhuận có thể trở thành điểm gây vỡ hợp tác nếu không quy ước trước. Cổ pháp khuyên cặp tuổi không hợp đừng chia 50-50; nên có người nắm cổ phần đa số để có quyền quyết cuối cùng.',
];

// ── Lời khuyên ────────────────────────────────────────────────────────────────
export const ADVICE_GOOD = [
  'Với cấu trúc tương hợp thuận, lời khuyên là cứ duy trì sự tự nhiên giữa hai bên, đừng cố tạo ra hình thức cứng nhắc. Khí đã thuận thì cứ để khí dẫn dắt; cổ pháp gọi là "Thuận Mệnh Hành Sự".',
  'Cặp tuổi hợp tốt cần tránh sự ỷ lại lẫn nhau. Hợp dễ sinh chủ quan; vì vậy vẫn cần ý thức về sự nỗ lực và tôn trọng độc lập của mỗi cá nhân để quan hệ giữ được sự sống động.',
  'Lời khuyên cho cặp tương hợp tốt là tận dụng thế thuận để thực hiện những việc lớn — kết hôn, lập nghiệp, mua nhà, sinh con — vì đây là cấu trúc cổ pháp ủng hộ cho sự khởi đầu.',
];

export const ADVICE_NEUTRAL = [
  'Cấu trúc tương hợp khá đòi hỏi ý thức vun bồi. Lời khuyên là chủ động học hỏi điểm yếu của nhau, không để các bất đồng nhỏ tích tụ thành rạn nứt lớn.',
  'Cặp tuổi ở mức tương hợp khá cần thiết lập một số quy tắc chung — về thời gian, tài chính, không gian riêng — để khí giữa hai người được lưu thông đều đặn, không bị nén.',
  'Với cấu trúc khá, hai bên nên có ý thức về việc bù trừ điểm khắc bằng hành động cụ thể: chọn hướng nhà, hướng giường, tuổi con sao cho hợp với một bên để cân bằng tổng thể.',
];

export const ADVICE_BAD = [
  'Cấu trúc tương hợp có nhiều điểm khắc đòi hỏi sự hóa giải có ý thức và bền bỉ. Lời khuyên đầu tiên là hai bên phải thực sự thấu hiểu lẫn nhau qua giao tiếp rõ ràng, đừng giữ trong lòng.',
  'Cặp tuổi xung khắc theo cổ pháp không phải là dấu chấm hết — chỉ là tín hiệu rằng cần nhiều công phu hơn. Có thể chọn ngày cưới hợp với cả hai, chọn hướng nhà hóa giải, chọn tuổi con hợp tuổi cha hoặc mẹ để bù trừ.',
  'Với cấu trúc khó, lời khuyên là tham khảo chuyên gia tử vi để xem trọn lá số của cả hai. Cặp tuổi xung trên giấy đôi khi vẫn rất hợp nếu cung mệnh, cung phối ngẫu của lá số có sự hỗ trợ tốt.',
];

// ── Phương pháp hóa giải cổ pháp ──────────────────────────────────────────────
export const HOAGIAI_LOW_SCORE = [
  `Khi cặp tuổi rơi vào nhiều yếu tố xung khắc, cổ pháp đề ra một số phương pháp hóa giải có thể áp dụng đồng thời:

1. **Chọn ngày kết hôn / khai trương hợp với cả hai mệnh**: Tránh các ngày xung tuổi một trong hai bên. Dùng phép Hiệp Kỷ Biện Phương Thư để chọn ngày Hoàng Đạo có sao tốt cho cả hai.

2. **Hóa giải bằng phương vị**: Nếu hai mệnh khắc nhau, có thể bù trừ qua hướng nhà ở hoặc hướng đặt bàn thờ — chọn hướng hợp với mệnh yếu hơn để cân bằng.

3. **Sinh con hợp tuổi**: Cổ pháp cho rằng đứa con có thể là "khắc tinh hóa thành phước tinh" — chọn năm sinh con hợp với một trong hai cha mẹ sẽ làm dịu trục xung giữa hai bên.

4. **Đeo phong thủy bổ trợ**: Tùy hành thiếu/thừa của mỗi người mà chọn đá quý, kim loại, màu sắc trang phục cho phù hợp. Người mệnh Hỏa khắc Kim có thể đeo thêm Mộc (cây cảnh, ngọc lục bảo) để Mộc sinh Hỏa, giảm tải khắc trên Kim.

5. **Quy ước rõ ràng trong sinh hoạt**: Đối với những cặp có nạp âm xung khắc, văn bản hóa các nguyên tắc về tiền bạc, không gian, thời gian là cách thực tế nhất để giảm xung va hằng ngày.`,
  `Cổ pháp không xem cặp tuổi xung khắc là dấu chấm hết — luôn có phương pháp hóa giải. Các kỹ thuật phổ biến bao gồm:

- **Chọn ngày tốt**: Dùng phép chọn ngày Hoàng Đạo theo "Hiệp Kỷ Biện Phương Thư", tránh ngày có sao xấu trùng tuổi một trong hai bên. Đây là kỹ thuật hóa giải đầu tiên cần áp dụng.
- **Phong thủy nhà ở**: Bố trí hướng nhà, hướng bếp, hướng cửa sao cho thuận với mệnh yếu hơn — giúp khí trong nhà cân bằng dù hai mệnh chủ có khắc.
- **Tuổi con cái bù trừ**: Sách "Tam Mệnh Thông Hội" có dạy phép chọn năm sinh con để "Tử Tinh Hóa Sát" — đứa con hợp tuổi sẽ làm trục xung giữa cha mẹ dịu đi đáng kể.
- **Vật phẩm phong thủy**: Người mang hành bị khắc có thể đeo vật mang hành tương sinh để bổ trợ. Ví dụ mệnh Kim bị Hỏa khắc thì đeo Thổ (đá ngọc, gốm) để Thổ sinh Kim.
- **Học hỏi cá nhân**: Cách hóa giải sâu xa nhất vẫn là sự thấu hiểu giữa hai bên — đọc sách về tâm lý quan hệ, học giao tiếp lành mạnh, thiết lập ranh giới rõ ràng.`,
  `Theo các trường phái cổ pháp từ Tam Mệnh Thông Hội đến Tử Bình Hạp Hôn, có nhiều cách để hóa giải tương khắc tuổi tác mà không cần phải tránh nhau:

**Phương pháp 1 — Chọn thời điểm tốt**: Mọi việc lớn (cưới, khai trương, mua nhà, sinh con) nên chọn ngày hợp với cả hai tuổi. Đây là cách hóa giải nền tảng — chọn được ngày tốt thì các yếu tố xung trong tuổi sẽ giảm đi đáng kể trong giai đoạn ấy.

**Phương pháp 2 — Bù trừ qua không gian**: Hướng nhà, hướng bàn làm việc, hướng ngủ chọn theo mệnh yếu hơn để khí hằng ngày cân bằng. Nhiều cặp khắc tuổi vẫn sống tốt nhờ phong thủy nhà ở.

**Phương pháp 3 — Bù trừ qua đời con**: Sinh con hợp tuổi một trong hai cha mẹ là cách cổ pháp xem là "Cải Tướng" — thay đổi tướng số gia đình. Đứa con sinh đúng năm hợp tuổi sẽ làm cầu nối giữa hai trục xung.

**Phương pháp 4 — Bù trừ qua vật phẩm**: Phong thủy cá nhân (đeo đá hợp mệnh, mặc màu hợp mệnh, dùng đồ thường có ngũ hành tương sinh) giúp người bị khắc giữ được khí của mình.

**Phương pháp 5 — Bù trừ qua nhận thức**: Đây là cách bền vững nhất. Khi biết mình ở cặp tuổi xung, cả hai sẽ ý thức về cách phản ứng — và chính sự ý thức ấy đã hóa giải được phần lớn xung khắc.`,
];

export const HOAGIAI_HIGH_SCORE = [
  `Với cấu trúc tương hợp thuận như cặp này, không cần áp dụng các kỹ thuật hóa giải phức tạp. Tuy nhiên cổ pháp vẫn khuyên nên:

1. **Chọn ngày tốt cho việc lớn**: Dù tuổi hợp, vẫn nên xem ngày Hoàng Đạo khi làm việc trọng — cưới hỏi, khai trương, động thổ. "Thiên Thời" vẫn là yếu tố không nên bỏ qua.

2. **Duy trì sự cân bằng**: Tránh để sự hợp tuổi dẫn đến chủ quan. Nhiều cặp hợp tuổi nhưng vẫn rạn nứt vì coi thường vai trò của nỗ lực cá nhân. Hợp khí trời chỉ là 30%; 70% còn lại là cách hai bên đối xử với nhau.

3. **Tận dụng thế thuận cho mục tiêu lớn**: Cặp tuổi hợp nên đặt mục tiêu cao hơn — không chỉ ổn định mà còn phát triển, không chỉ giữ gìn mà còn xây dựng. Cổ pháp tin rằng "Thiên hợp địa hợp" là dấu hiệu Trời mở đường cho thành tựu lớn.`,
  `Cặp tuổi tương hợp tốt như thế này không cần nhiều kỹ thuật hóa giải, nhưng vẫn nên lưu ý vài điểm để giữ vững thế thuận:

- **Không chủ quan**: Cấu trúc tốt là điều kiện cần, không phải điều kiện đủ. Vẫn cần nỗ lực vun bồi quan hệ qua thời gian.
- **Tận dụng thời điểm tốt**: Khi tuổi đã hợp, thêm ngày tốt vào sẽ tăng phần thuận lên gấp đôi. Đây là cấu trúc lý tưởng để khởi sự việc lớn.
- **Giữ độc lập cá nhân**: Hợp dễ sinh "hòa lẫn" — mỗi người mất bản sắc riêng. Cần ý thức về việc giữ nét cá tính và không gian riêng để quan hệ luôn mới.
- **Mở rộng tầm nhìn**: Khí thuận giúp hai bên dễ thống nhất; tận dụng điều đó để đặt mục tiêu lớn hơn từng cá nhân làm được.`,
];

// ── FAQ section ───────────────────────────────────────────────────────────────
export const FAQ_INTRO = [
  'Một số câu hỏi thường gặp khi xem tương hợp tuổi:',
  'Phần dưới đây giải đáp những thắc mắc phổ biến nhất về cặp tuổi này:',
  'Các câu hỏi mà nhiều người quan tâm khi đối chiếu cặp tuổi:',
];

export function buildFaqHonNhan(seed, score, verdict, tuoiAName, tuoiBName) {
  const isPositive = score >= 60;
  const faqs = [
    {
      q: `Tuổi ${tuoiAName} và tuổi ${tuoiBName} có nên cưới không?`,
      a: isPositive
        ? `Theo cổ pháp, cặp tuổi này có cấu trúc tương hợp ${verdict === 'rat-hop' ? 'rất tốt' : 'tốt'} — hoàn toàn có thể tiến tới hôn nhân. Cần chọn ngày cưới hợp với cả hai tuổi để thêm phần thuận lợi.`
        : `Cặp tuổi này có một số điểm khắc theo cổ pháp, nhưng không có nghĩa không thể cưới. Quan trọng là cả hai cần ý thức về các điểm xung khắc và chuẩn bị các phương pháp hóa giải (chọn ngày cưới tốt, phong thủy nhà ở, sinh con hợp tuổi). Nhiều cặp xung tuổi vẫn sống hạnh phúc dài lâu nhờ sự thấu hiểu và chủ động.`,
    },
    {
      q: `Cặp tuổi ${tuoiAName} và ${tuoiBName} thường gặp khó khăn gì trong hôn nhân?`,
      a: isPositive
        ? `Cấu trúc tương hợp thuận giúp cặp này tránh được phần lớn các va chạm lớn. Tuy nhiên cần lưu ý: sự hợp tuổi dễ làm hai bên chủ quan, ít nỗ lực vun bồi quan hệ. Khó khăn lớn nhất thường nằm ở việc duy trì sự mới mẻ qua thời gian.`
        : `Khó khăn chính thường đến từ các yếu tố xung khắc trên một hoặc nhiều tầng (Thiên Can, Địa Chi, Nạp Âm). Cụ thể có thể là khác biệt về quan điểm tài chính, lối sinh hoạt, cách giáo dục con cái. Cần ý thức sớm và thống nhất nguyên tắc chung để tránh tích lũy bất đồng.`,
    },
    {
      q: `Có nên xem trọn lá số tử vi của hai người trước khi quyết định không?`,
      a: `Rất nên. Bài phân tích này chỉ dựa trên năm sinh (can chi năm), tức một trong bốn trụ của lá số. Trọn vẹn lá số còn cần can chi của tháng, ngày và đặc biệt là giờ sinh. Hai người có thể "xung tuổi năm" nhưng vẫn hợp ở các trụ khác — chỉ lá số đầy đủ mới cho được kết luận chính xác.`,
    },
    {
      q: `Năm nào hợp để cưới với cặp tuổi này?`,
      a: `Nên chọn năm có can chi không xung tuổi của cả hai bên. Cụ thể: tránh năm có địa chi đối xung (Tý-Ngọ, Sửu-Mùi, Dần-Thân, Mão-Dậu, Thìn-Tuất, Tỵ-Hợi) với một trong hai tuổi. Ưu tiên năm có địa chi cùng tam hợp hoặc lục hợp với cả hai. Tốt nhất nên xem lịch ngày cưới chi tiết theo từng tháng để chọn được ngày Hoàng Đạo phù hợp.`,
    },
  ];
  return faqs;
}

export function buildFaqLamAn(seed, score, verdict, tuoiAName, tuoiBName) {
  const isPositive = score >= 60;
  const faqs = [
    {
      q: `Tuổi ${tuoiAName} có nên hợp tác làm ăn với tuổi ${tuoiBName} không?`,
      a: isPositive
        ? `Theo cổ pháp, cặp tuổi này có cấu trúc tương hợp ${verdict === 'rat-hop' ? 'rất tốt' : 'tốt'} cho hợp tác kinh doanh. Phù hợp với mô hình đồng founder, liên doanh, hoặc đối tác chiến lược dài hạn. Vẫn cần văn bản hóa rõ ràng vai trò và quyền hạn để đảm bảo tính chuyên nghiệp.`
        : `Cặp tuổi này có một số điểm xung khắc theo cổ pháp, không lý tưởng cho hợp tác kiểu 50-50. Tuy nhiên vẫn có nhiều hình thức hợp tác khả thi: một bên chủ đa số bên cố vấn thiểu số, hợp tác dự án ngắn hạn, hoặc chia tách thị trường rõ ràng.`,
    },
    {
      q: `Loại hình kinh doanh nào phù hợp với cặp ${tuoiAName} và ${tuoiBName}?`,
      a: isPositive
        ? `Với cấu trúc tương hợp thuận, cặp này có thể hợp tác linh hoạt trong nhiều loại hình kinh doanh — từ thương mại, dịch vụ đến sản xuất. Tốc độ ra quyết định nhanh là lợi thế, phù hợp với mô hình startup hoặc kinh doanh có yêu cầu thị trường biến động.`
        : `Nên chọn các mô hình hợp tác có tính chia tách cao — mỗi bên phụ trách một mảng độc lập, hợp đồng dự án ngắn hạn thay vì lập công ty chung. Tránh các mô hình đòi hỏi đồng thuận liên tục như đầu tư chứng khoán chung hay quản lý quỹ.`,
    },
    {
      q: `Cần lưu ý gì khi ký hợp đồng hợp tác giữa hai tuổi?`,
      a: `Bất kể tuổi hợp hay xung, hợp đồng cần văn bản hóa rõ: (1) Vai trò và quyền hạn của mỗi bên, (2) Quy trình ra quyết định cho việc lớn, (3) Tỷ lệ phân chia lợi nhuận và lỗ, (4) Điều khoản thoái vốn / chia tay. Với cặp tuổi xung, càng cần chi tiết hơn. Ngoài ra, ngày ký hợp đồng cũng nên chọn ngày Hoàng Đạo hợp tuổi cả hai bên.`,
    },
    {
      q: `Có nên xem trọn lá số của hai đối tác không?`,
      a: `Rất nên, đặc biệt với hợp tác lớn hoặc dài hạn. Năm sinh chỉ là một trụ; tháng và giờ sinh quyết định nhiều về cung tài, cung sự nghiệp. Hai người xung tuổi năm vẫn có thể bổ sung tốt nếu cung tài cung quan của họ tương sinh. Xem lá số đầy đủ giúp tránh quyết định sai lầm dựa trên thông tin bề mặt.`,
    },
  ];
  return faqs;
}

// ── CTA cuối bài (link nội bộ) ────────────────────────────────────────────────
export const CTA = [
  'Để có đánh giá chính xác hơn về tương hợp của hai người, bạn nên xem trọn vẹn lá số tử vi đẩu số — không chỉ dừng ở năm sinh mà còn cả tháng, ngày và giờ sinh. [Xem lá số tử vi đầy đủ](/) để hiểu sâu hơn về tính cách, vận hạn và tình duyên theo lá số riêng.',
  'Một bài phân tích theo năm sinh chỉ cho được bức tranh tổng quát. Để biết chi tiết tương hợp cụ thể hai người, bạn nên [luận giải lá số tử vi đầy đủ](/) theo giờ sinh — đó mới là phép soi xét rõ ràng nhất.',
  'Năm sinh chỉ là một trong bốn trụ. Nếu muốn xem tương hợp đầy đủ, bạn có thể [tra cứu lá số tử vi đẩu số](/) — phân tích chi tiết theo can chi của giờ-ngày-tháng-năm sinh.',
];
