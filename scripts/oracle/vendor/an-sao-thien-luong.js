"use strict";

/* ============================================================
   ENGINE TỬ VI V1.0
   - Quy ước địa chi 1..12: Tý=1 ... Hợi=12
   - Mệnh/Thân, Cục, Tử Vi tinh hệ, Thiên Phủ tinh hệ,
     các vòng và phụ tinh được tách thành hàm độc lập.
   ============================================================ */

const CAN=["","Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const CHI=["","Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const HOUSES=["Mệnh","Phụ Mẫu","Phúc Đức","Điền Trạch","Quan Lộc","Nô Bộc","Thiên Di","Tật Ách","Tài Bạch","Tử Tức","Phu Thê","Huynh Đệ"];

const LIMIT_HOUSE_SHORT={
  "Mệnh":"MỆNH","Phụ Mẫu":"PHỤ","Phúc Đức":"PHÚC","Điền Trạch":"ĐIỀN",
  "Quan Lộc":"QUAN","Nô Bộc":"NÔ","Thiên Di":"DI","Tật Ách":"TẬT",
  "Tài Bạch":"TÀI","Tử Tức":"TỬ","Phu Thê":"PHỐI","Huynh Đệ":"HUYNH"
};
function limitHouseShort(branch,anchor){
  if(!branch||!anchor)return "—";
  const h=houseName(branch,anchor);
  return LIMIT_HOUSE_SHORT[h]||h.toUpperCase();
}

const GRID={
  6:[1,1],7:[1,2],8:[1,3],9:[1,4],
  5:[2,1],10:[2,4],
  4:[3,1],11:[3,4],
  3:[4,1],2:[4,2],1:[4,3],12:[4,4]
};

const CUC_INFO={
  K:{element:"Kim",number:4,name:"KIM TỨ CỤC"},
  M:{element:"Mộc",number:3,name:"MỘC TAM CỤC"},
  T:{element:"Thủy",number:2,name:"THỦY NHỊ CỤC"},
  H:{element:"Hỏa",number:6,name:"HỎA LỤC CỤC"},
  O:{element:"Thổ",number:5,name:"THỔ NGŨ CỤC"}
};

const NAP_AM=[
 ["HẢI TRUNG KIM","K"],["LƯ TRUNG HỎA","H"],["ĐẠI LÂM MỘC","M"],["LỘ BÀNG THỔ","O"],["KIẾM PHONG KIM","K"],
 ["SƠN ĐẦU HỎA","H"],["GIẢN HẠ THỦY","T"],["THÀNH ĐẦU THỔ","O"],["BẠCH LẠP KIM","K"],["DƯƠNG LIỄU MỘC","M"],
 ["TUYỀN TRUNG THỦY","T"],["ỐC THƯỢNG THỔ","O"],["TÍCH LỊCH HỎA","H"],["TÙNG BÁCH MỘC","M"],["TRƯỜNG LƯU THỦY","T"],
 ["SA TRUNG KIM","K"],["SƠN HẠ HỎA","H"],["BÌNH ĐỊA MỘC","M"],["BÍCH THƯỢNG THỔ","O"],["KIM BẠCH KIM","K"],
 ["PHÚ ĐĂNG HỎA","H"],["THIÊN HÀ THỦY","T"],["ĐẠI TRẠCH THỔ","O"],["THOA XUYẾN KIM","K"],["TANG ĐỐ MỘC","M"],
 ["ĐẠI KHÊ THỦY","T"],["SA TRUNG THỔ","O"],["THIÊN THƯỢNG HỎA","H"],["THẠCH LỰU MỘC","M"],["ĐẠI HẢI THỦY","T"]
];

const MAJOR_META={
 "Tử Vi":{id:1,e:"O"},"Liêm Trinh":{id:2,e:"H"},"Thiên Đồng":{id:3,e:"T"},
 "Vũ Khúc":{id:4,e:"K"},"Thái Dương":{id:5,e:"H"},"Thiên Cơ":{id:6,e:"M"},
 "Thiên Phủ":{id:7,e:"O"},"Thái Âm":{id:8,e:"T"},"Tham Lang":{id:9,e:"M"},
 "Cự Môn":{id:10,e:"T"},"Thiên Tướng":{id:11,e:"T"},"Thiên Lương":{id:12,e:"M"},
 "Thất Sát":{id:13,e:"K"},"Phá Quân":{id:14,e:"T"}
};

const STAR_ELEMENT={
 "Thái Tuế":"H","Thiếu Dương":"H","Tang Môn":"M","Thiếu Âm":"T","Quan Phù":"H","Tử Phù":"H",
 "Tuế Phá":"H","Long Đức":"T","Bạch Hổ":"K","Phúc Đức":"O","Điếu Khách":"H","Trực Phù":"H",
 "Lộc Tồn":"O","Bác Sỹ":"T","Lực Sĩ":"H","Thanh Long":"T","Tiểu Hao":"H","Tướng Quân":"M",
 "Tấu Thư":"K","Phi Liêm":"H","Hỷ Thần":"H","Bệnh Phù":"O","Đại Hao":"H","Phục Binh":"H",
 /* Vòng Tràng Sinh — khôi phục mapping ngũ hành của bản nền trước khi áp dụng biến thể Thiên Lương. */
 "Quan Phủ":"H","Tràng Sinh":"T","Mộc Dục":"T","Quan Đới":"K","Lâm Quan":"K","Đế Vượng":"K",
 "Suy":"T","Bệnh":"H","Tử":"T","Mộ":"O","Tuyệt":"O","Thai":"O","Dưỡng":"M",
 "Đà La":"K","Kình Dương":"K","Địa Không":"H","Địa Kiếp":"H","Linh Tinh":"H","Hỏa Tinh":"H",
 "Văn Xương":"K","Văn Khúc":"T","Thiên Khôi":"H","Thiên Việt":"H","Tả Phụ":"O","Hữu Bật":"O",
 "Long Trì":"T","Phượng Các":"M","Tam Thai":"T","Bát Tọa":"M","Ân Quang":"M","Thiên Quý":"O",
 "Thiên Khốc":"T","Thiên Hư":"T","Thiên Đức":"H","Nguyệt Đức":"H","Thiên Hình":"H","Thiên Riêu":"T",
 "Thiên Y":"T","Quốc Ấn":"O","Đường Phù":"M","Đào Hoa":"M","Hồng Loan":"T","Thiên Hỷ":"T",
 "Thiên Giải":"H","Địa Giải":"O","Giải Thần":"M","Thai Phụ":"O","Phong Cáo":"O","Thiên Tài":"O",
 "Thiên Thọ":"O","Thiên Thương":"O","Thiên Sứ":"T",
 "Hóa Khoa":"T","Hóa Quyền":"M","Hóa Lộc":"M","Hóa Kỵ":"T","Cô Thần":"O","Quả Tú":"O",
 "Thiên Mã":"H","Phá Toái":"H","Thiên Quan":"H","Thiên Phúc":"H","Lưu Hà":"T","Thiên Trù":"O",
 "Kiếp Sát":"H","Hoa Cái":"K","L.N. Văn Tinh":"H","Đẩu Quân":"H","Thiên Không":"H"
};



/* ============================================================
   V3.3.78 — POPUP TỪ ĐIỂN SAO + NGHIỆM LÝ GIA ĐÌNH THIÊN LƯƠNG
   Hiển thị lớp nghĩa tra cứu cơ bản của từng sao từ dữ liệu từ điển
   đang có trong hệ thống, sau đó bổ sung khung luận Tử Vi Thiên Lương.
   Ưu tiên vị trí, phe nhóm, ba vòng, âm dương-ngũ hành và nghiệm lý;
   không dùng một sao đơn độc để kết luận.
   ============================================================ */
/* V3.3.113 — MỞ RỘNG “Ý NGHĨA THEO TỪ ĐIỂN SAO”.
   Giữ nguyên nghĩa cốt lõi do người dùng chốt; bổ sung phần giải thích dễ hiểu
   từ lớp mô tả đặc tính sao (mặt thuận/mặt lệch, sáng–hãm/hội hợp khi có).
   Popup không hiển thị tên nguồn để giữ giao diện gọn. */
const STAR_HELP_DATA=Object.freeze({"Tử Vi":{"tb":"Chủ uy quyền, tài lộc và phúc đức. Ở vị trí sáng thường thiên về thông minh, nghiêm cẩn, uy nghi; ở vị trí kém sáng thì uy lực và sự sáng suốt giảm.","tl":"Thiên Lương định danh là sao uy nghi, đức độ, chủ quyền lộc và Phúc Đức. Thuộc nhóm Tử–Phủ–Vũ–Tướng, muốn hoàn mỹ cần thêm Tả Hữu, Thai Tọa và phải xét thế vận hành của cả nhóm."},"Liêm Trinh":{"tb":"Chủ quan lộc và hình ngục. Khi sáng thiên về liêm khiết, thẳng thắn; khi hãm dễ khắc nghiệt, gặp sát tinh, Kỵ hoặc Hình thì mặt bất lợi tăng mạnh. Nét nghĩa bổ sung: thẳng thắn, trực tính; khi lệch dễ nóng nảy, sỗ sàng hoặc lỗ mãng.","tl":"Định danh là chủ Quan Lộc, Tù tinh. Thuộc Sát–Phá–Liêm–Tham; khi luận phải xét cả bộ và sát tinh chứ không tách riêng một sao."},"Thiên Đồng":{"tb":"Phúc tinh, chủ phúc thọ. Tính canh cải, linh hoạt, nhân hậu; ở vị trí tốt thường gắn với may mắn, vui vẻ, ở vị trí hãm dễ thất thường và vướng thị phi hoặc tai họa.","tl":"Định danh là chủ phúc thọ. Thuộc Cơ–Nguyệt–Đồng–Lương, nên đọc cùng Xương Khúc, Khôi Việt và toàn thế tam hợp."},"Vũ Khúc":{"tb":"Tài tinh, chủ tài lộc. Khi sáng thiên về cương nghị, quyết đoán và năng lực tạo tài; khi hãm dễ ương ngạnh, tham cầu hoặc phá tán.","tl":"Định danh là chủ tài lộc. Trong nhóm Tử–Phủ–Vũ–Tướng, giá trị không chỉ do riêng Vũ Khúc mà do thế đứng, hành và các trợ tinh đi kèm."},"Thái Dương":{"tb":"Quý tinh, chủ quan lộc, tượng Mặt Trời và hình tượng người cha. Khi sáng thiên về thông minh, nhân hậu, uy quyền; khi hãm dễ giảm sáng suốt và uy thế.","tl":"Định danh là chủ Quan Lộc. Cự–Nhật cần Hồng Đào, Quang Quý; riêng Nhật–Nguyệt còn phải xét độ sáng và các bộ Xương Khúc, Long Phượng, Quang Quý."},"Thiên Cơ":{"tb":"Thiên tinh, chủ mưu cơ, huynh đệ và phúc thọ. Khi sáng biểu hiện sự khéo léo, tính toán, linh hoạt và nhân hậu; khi hãm dễ do dự, kém sáng hoặc thay đổi nhiều.","tl":"Định danh là chủ Huynh Đệ, mưu cơ, phúc thọ. Thuộc Cơ–Nguyệt–Đồng–Lương, nhóm này cần Xương Khúc và Khôi Việt để thành thế đẹp."},"Thiên Phủ":{"tb":"Tài tinh kiêm quyền tinh, chủ tài lộc và uy quyền. Thường thiên về nhân hậu, ổn định, tích chứa; gặp đủ sát tinh hoặc Không, Kiếp, Tuần, Triệt thì năng lực bảo toàn giảm.","tl":"Định danh là chủ tài lộc, trung hậu, hiền lành. Thuộc nhóm Tử–Phủ–Vũ–Tướng; trọng năng lực gìn giữ, tổ chức và sự phối hợp với Tả Hữu, Thai Tọa."},"Thái Âm":{"tb":"Phúc tinh, chủ điền trạch, tượng Mặt Trăng và hình tượng người mẹ. Khi sáng thiên về khoan hòa, phú túc, tích lũy; khi hãm dễ nhầm lẫn và biến động tài sản.","tl":"Định danh là chủ điền tài. Thuộc Cơ–Nguyệt–Đồng–Lương; khi Nhật–Nguyệt lạc hãm, Thiên Lương đặc biệt coi trọng Hồng Đào Hỷ hoặc Xương Khúc, Long Phượng, Quang Quý để nâng cách."},"Tham Lang":{"tb":"Chủ họa phúc và ham muốn, đồng thời có mặt quyền lộc. Ở vị trí tốt có sức hoạt động, giao tế và hưởng thụ mạnh; khi hãm dễ thiên về tham dục, bốc đồng hoặc gây rối.","tl":"Định danh là chủ họa phúc, hung bạo. Thuộc Sát–Phá–Liêm–Tham; Linh Hỏa được xem là bộ sát tinh hợp quyền điều động của Tham Lang."},"Cự Môn":{"tb":"Chủ ngôn ngữ và thị phi. Khi sáng có năng lực ăn nói, biện giải và tạo ảnh hưởng; khi hãm dễ phát sinh tranh chấp, kiện cáo, hiểu lầm hoặc lời nói bất lợi. Nét nghĩa bổ sung: nhấn mạnh lời ăn tiếng nói và khả năng tranh luận.","tl":"Định danh là chủ điền và thị phi. Cự–Nhật được Thiên Lương xếp thành một nhóm cần Hồng Đào, Quang Quý để hoàn thiện tư thế."},"Thiên Tướng":{"tb":"Quyền tinh, chủ quan lộc và phúc thiện. Khi sáng thiên về đôn hậu, can đảm, uy dũng và công danh; gặp Kình hoặc Tuần, Triệt thì quyền lực và sự ổn định dễ suy giảm.","tl":"Định danh là Quyền tinh, uy dũng. Thiên Lương nhấn mạnh nhóm Tử–Phủ–Vũ–Tướng cần Tả Hữu, Thai Tọa để phát huy đầy đủ."},"Thiên Lương":{"tb":"Thọ tinh, chủ phụ mẫu và phúc thọ. Khi sáng thiên về nhân hậu, khoan hòa, mưu cơ, quyền biến và khả năng cứu giải; khi hãm dễ nhầm lẫn, canh cải hoặc ham nhàn.","tl":"Định danh là chủ phúc thọ, phụ mẫu. Thuộc Cơ–Nguyệt–Đồng–Lương, lấy Xương Khúc, Khôi Việt làm những bộ trợ tinh quan trọng."},"Thất Sát":{"tb":"Quyền tinh, chủ uy vũ và sát phạt. Khi sáng thiên về can đảm, dũng mãnh, quyết liệt; khi hãm dễ thành nóng nảy, liều lĩnh và gây tai họa.","tl":"Định danh là Quyền tinh, uy dũng. Thuộc Sát–Phá–Liêm–Tham, bộ này cần đúng sát tinh và cấp chỉ huy; riêng Kình Đà hợp với Thất Sát hơn các sát bộ khác."},"Phá Quân":{"tb":"Hung tinh, hao tinh, chủ phá cũ đổi mới và hao tán. Khi sáng có can đảm, quyết liệt, sức cải biến; khi hãm dễ thành phá tán, bại hoại hoặc hành động quá tay. Nét nghĩa bổ sung: dũng mãnh, can đảm đương đầu, tháo vát, có khả năng chỉnh đốn và xoay xở.","tl":"Định danh là dũng mãnh, hao tán. Trong Sát–Phá–Liêm–Tham, Phá Quân được xem là cấp chỉ huy hợp nhất của Không Kiếp và có thể điều động Kình Đà."},"Thái Tuế":{"tb":"Tính xét đoán, lý luận, dễ nói năng mạnh và giữ lập trường. Gặp cát tinh có thể tăng uy tín, danh thế; gặp sát, Kỵ dễ tăng thị phi, tranh chấp và trở ngại. Nét nghĩa bổ sung: tự hào, sắc sảo, có tài hùng biện và ý thức vị thế.","tl":"Vị trí chính danh: tự hào, thấy mình có sứ mạng làm việc chính đáng. Đây là một đỉnh của tam hợp Thái Tuế–Quan Phù–Bạch Hổ."},"Thiếu Dương":{"tb":"Thiên về thông minh, vui vẻ, hòa nhã, nhân hậu; có tính cứu giải nhẹ. Gặp Khoa hoặc Nhật sáng thường tăng phần sáng sủa và phúc khí. Nét nghĩa bổ sung: lanh lợi, nhạy bén, mau mắn và phản ứng nhanh.","tl":"Vị trí sinh nhập, được mô tả là sáng suốt hơn người; nhưng Thiên Không đứng sát nên trí sáng phải đi cùng đức độ mới bền."},"Tang Môn":{"tb":"Bại tinh, thiên về buồn phiền, tang thương, lo nghĩ và hao tổn; khi đi cùng hung sát có thể làm nặng thêm bệnh tật, tai nạn hoặc sự suy giảm. Nét nghĩa bổ sung: lo âu, điều trắc trở và cảm giác quyền thế hoặc khả năng kiểm soát bị giảm.","tl":"Vị trí bất mãn nhưng nặng lo toan, tính toán; thường nằm trong thế Tuế Phá–Tang Môn–Điếu Khách có Thiên Mã hỗ trợ."},"Thiếu Âm":{"tb":"Thiên về thông minh, hòa nhã, nhân hậu và cứu giải nhẹ; cần xét thêm hội hợp vì tính chất có thể bị lấn bởi hung sát. Nét nghĩa bổ sung: ngây thơ, khờ dại, thụ động và thiên về chịu đựng.","tl":"Vị trí sinh xuất, dễ lầm lẫn hoặc tin người; cần dùng toàn bộ cung và các đức tinh để kiểm soát mặt bất lợi."},"Quan Phù":{"tb":"Thiên về xét đoán, lý luận, công việc pháp lý và tranh tụng. Gặp tốt có thể hữu ích cho việc pháp luật; gặp xấu dễ thành thị phi, kiện cáo và ngăn trở. Nét nghĩa bổ sung: phán đoán, lý luận và công việc phản biện.","tl":"Hành động theo điều cho là chính đáng, có suy tính kỹ và thận trọng; thuộc tam hợp Thái Tuế–Quan Phù–Bạch Hổ."},"Tử Phù":{"tb":"Thiên về buồn phiền, tang thương và vướng mắc, thường làm tăng cảm giác bị cản trở hoặc khó thông suốt. Nét nghĩa bổ sung: tang thương, buồn thảm, bực dọc và khó chịu.","tl":"Vị trí sinh nhập, có phần hơn người nhưng thường bị kẹt; cần xét cùng Thiếu Dương–Phúc Đức và Thiên Không."},"Tuế Phá":{"tb":"Tính phá tán, ngang nghịch và đối kháng; dễ tạo thế bất mãn, tranh chấp hoặc phá bỏ khuôn cũ. Nét nghĩa bổ sung: ngang bướng, ương ngạnh, không chịu thua kém.","tl":"Vị trí xung khắc, biểu hiện bất mãn và xu hướng muốn đả phá, quật ngược. Thiên Mã được bố trí ở thế đối kháng để tạo nghị lực hành động."},"Long Đức":{"tb":"Đức tinh, thiên về hòa nhã, nhân hậu, từ thiện và cứu giải bệnh tật, tai họa ở mức độ nhất định. Nét nghĩa bổ sung: hòa nhã, nhân hậu, đoan trang và biết giữ khuôn phép.","tl":"Vị trí sinh xuất, thiên về chấp nhận thua thiệt để tu dưỡng; Thiên Lương coi trọng con đường đức độ hơn bon chen ở thế này."},"Bạch Hổ":{"tb":"Bại tinh, tính mạnh, quyết liệt, dễ liên quan tang thương, bệnh tật hoặc tai nạn; khi đi cùng bộ tốt vẫn có thể biểu hiện khí lực và sự cứng cỏi. Nét nghĩa bổ sung: dũng mãnh, oai quyền và khí thế mạnh.","tl":"Gắng công làm việc chính đáng, có sức chịu đựng và quyết liệt; thuộc tam hợp chính của vòng Thái Tuế."},"Phúc Đức":{"tb":"Đức tinh, thiên về nhân hậu, đoan chính và cứu giải. Gặp Thiên Đức, Nguyệt Đức có thể thành bộ đức tinh mạnh hơn. Nét nghĩa bổ sung: hòa nhã, nhân hậu và có khả năng cứu giải.","tl":"Ở tam hợp sinh nhập, muốn hơn người bền vững phải trọng nhân hậu, đạo đức; đây là điểm cân bằng của thế Thiếu Dương–Tử Phù–Phúc Đức."},"Điếu Khách":{"tb":"Khá thích phô diễn, nói nhiều hoặc ham vui; khi gặp Tang, Hình dễ làm tăng sự cố, tai nạn hoặc tang thương. Nét nghĩa bổ sung: dễ khoe khoang, cường điệu trong lời nói và giao tiếp.","tl":"Vị trí bất mãn, thường dùng lời lẽ để thuyết phục, phân trần; cần xem Thiên Mã có thực sự đắc dụng hay không."},"Trực Phù":{"tb":"Thiên về buồn phiền, tang thương, rắc rối và ngăn trở; thường không phải yếu tố chủ động nâng đỡ. Nét nghĩa bổ sung: trắc trở, điều họa hại hoặc việc khó xử.","tl":"Vị trí sinh xuất, dễ chịu thiệt thòi và hữu công vô lao; Thiên Lương coi đây là một thế cần biết tự điều chỉnh kỳ vọng."},"Lộc Tồn":{"tb":"Quý tinh, chủ quyền tước, tài lộc và phúc thọ; có tính tích lũy, cứu khốn, phò nguy và làm tăng khả năng giữ tài. Nét nghĩa bổ sung: nghiêm túc, nề nếp, thiên về gìn giữ và ổn định.","tl":"Thiên Lương coi Lộc Tồn là thiên lộc do Thiên Can ấn định, phần phúc vật chất được đặt sẵn; hưởng bền hay không tùy tam hợp tuổi, vị trí Mệnh và khả năng tránh lạm dụng."},"Bác Sỹ":{"tb":"Thiên về thông minh, khoan hòa, nhân hậu; lợi cho học hành, thi cử và có ý nghĩa cứu giải bệnh tật. Nét nghĩa bổ sung: thông tuệ, am tường và hiểu biết nhiều điều.","tl":"Thuộc vòng Lộc Tồn. Theo cách Thiên Lương, ý nghĩa phải đặt trong cấu trúc Thiên Can và vị trí hưởng Lộc chứ không nên luận riêng."},"Lực Sĩ":{"tb":"Chủ sức khỏe, sức mạnh, sự nhanh nhẹn và quyền lực. Gặp tốt làm tăng mặt tích cực, gặp xấu có thể làm tác động xấu đến nhanh hơn. Nét nghĩa bổ sung: khỏe mạnh, mạnh dạn, có sức làm và sức chịu đựng.","tl":"Trong hệ Thiên Lương, Kình Dương luôn đi với Lực Sĩ theo chiều thuận/nghịch của âm dương. Vì vậy Lực Sĩ còn là mốc kiểm tra cách an Kình–Đà."},"Thanh Long":{"tb":"Vui vẻ, hòa nhã, lợi cho cầu công danh, cưới hỏi và sinh nở; có tính cứu giải nhẹ, một số phối hợp đặc biệt có thể nâng tài lộc, quyền thế. Nét nghĩa bổ sung: vui vẻ, tin vui và công việc có chiều hướng thăng tiến.","tl":"Thuộc vòng Lộc Tồn; nên đọc trong dòng vận hành của Thiên Can và sự phối hợp với Lộc Tồn, Kình Đà, Hao, Phục."},"Tiểu Hao":{"tb":"Bại tinh, chủ hao hụt tài lộc, ly tán và những khoản tiêu tán nhỏ nhưng dai dẳng. Nét nghĩa bổ sung: suy sụp, thất thoát, hao nhỏ hoặc nguồn lực bị chia nhỏ.","tl":"Thuộc vòng Lộc Tồn; mặt hao tổn cần đặt trong bài toán được hưởng hay phải trả của Thiên lộc, không tách khỏi cả vòng."},"Tướng Quân":{"tb":"Can đảm, dũng mãnh, hiên ngang, có tính chỉ huy và tranh công danh; gặp Tuần, Triệt thường bị giảm quyền hoặc phát sinh trở ngại. Nét nghĩa bổ sung: hiên ngang, dũng mãnh, có chí khí và tố chất lãnh đạo.","tl":"Thuộc vòng Lộc Tồn; giá trị quyền động phải xét với hành, vị trí và thế hưởng Lộc của tuổi."},"Tấu Thư":{"tb":"Vui vẻ, nói năng khôn khéo, lợi cho văn chương, đàm luận, ca hát và giao tiếp. Nét nghĩa bổ sung: lịch lãm, khôn khéo, biết giao tiếp và ứng xử.","tl":"Thuộc vòng Lộc Tồn; Thiên Lương dùng cả vòng để biểu đạt cách Thiên Can vận hành, do đó Tấu Thư chỉ là một mắt xích."},"Phi Liêm":{"tb":"Nhanh nhẹn, hoạt động mau; là phụ tinh hai mặt nhưng thiên về biến động, thị phi và tác động bất ngờ. Gặp cát tinh có thể làm việc tốt đến nhanh; gặp hung sát tinh cũng làm mặt bất lợi phát nhanh hơn. Nét nghĩa bổ sung: nhanh chóng, gọn gàng, phản ứng mau và linh hoạt.","tl":"Thuộc vòng Lộc Tồn/Bác Sĩ. Trong quy ước trình bày CÁT/TRỢ trái — HUNG/SÁT/BẠI phải của phần mềm, Phi Liêm được xếp bên phải vì tính hai mặt thiên hung; khi luận vẫn phải phối với toàn bộ sao hội hợp."},"Hỷ Thần":{"tb":"Vui vẻ, mang tin mừng, lợi cho thi cử, cầu công danh, cưới hỏi và sinh nở. Nét nghĩa bổ sung: vui vẻ, may mắn, dễ có việc đáng mừng.","tl":"Thuộc vòng Lộc Tồn; ý nghĩa tốt/xấu phải quy về toàn bộ cấu trúc Thiên Can, không nên tách một mình."},"Bệnh Phù":{"tb":"Chủ đau yếu, buồn rầu và bệnh tật; ở Mệnh hoặc Tật Ách cần đặc biệt xem thêm các sao hội hợp. Nét nghĩa bổ sung: buồn bã, chán chường, tâm trạng dễ sa sút.","tl":"Thuộc vòng Lộc Tồn; khi bất lợi cần xét cả thế Lộc Tồn, Kình Đà, Hao và hành Mệnh."},"Đại Hao":{"tb":"Bại tinh, chủ hao tán lớn, ly tán và biến động tài chính; mức độ tùy cung và bộ sao đi kèm. Nét nghĩa bổ sung: hao hụt, thâm thủng, tiêu tán nguồn lực.","tl":"Thuộc vòng Lộc Tồn; biểu hiện hao tán cần xem đó là phần thừa trừ của Thiên lộc hay chỉ là biến động nhất thời."},"Phục Binh":{"tb":"Gặp tốt có thể biểu hiện sự trợ giúp, phò tá; gặp xấu dễ thiên về mưu ngầm, lừa dối, trộm cắp hoặc việc quân sự. Nét nghĩa bổ sung: âm mưu, điềm xấu bất thường, việc ẩn phía sau khó thấy.","tl":"Thuộc vòng Lộc Tồn; nên luận theo toàn bộ vòng và vị trí Thiên Can thay vì dùng nghĩa đơn tinh tuyệt đối."},"Quan Phủ":{"tb":"Chủ rắc rối, phiền nhiễu và ngăn trở công việc; thường cần xét cùng các sao pháp lý, thị phi và sát tinh. Nét nghĩa bổ sung: phiền phức, việc rắc rối, dây dưa hoặc lôi thôi.","tl":"Thuộc vòng Lộc Tồn; là một mắt xích trong cơ cấu Thiên Can, cần xét đồng thời Lộc Tồn và Kình–Đà."},"Tràng Sinh":{"tb":"Chủ sinh trưởng, nhân hậu, độ lượng, sức sống, phúc thọ và sự bền vững; thường có lợi cho sinh nở và khởi đầu. Nét nghĩa bổ sung: lâu bền, gia tăng điều tốt đẹp và giúp công việc phát triển.","tl":"Thiên Lương gọi là giai đoạn “khôn lớn”; cả vòng Tràng Sinh là hình bóng hợp nhất của Thái Tuế và Lộc Tồn, dùng để đọc diễn biến của đời người theo không gian và thời gian."},"Mộc Dục":{"tb":"Chủ thay đổi, canh cải, dễ chán nản hoặc bỏ dở; cũng liên hệ đến ham muốn, tắm gội, làm đẹp và đi xa. Nét nghĩa bổ sung: dễ lầm lạc, dở dang; đồng thời có mặt thích trưng diện, phô bày.","tl":"Giai đoạn “dậy thì”. Không nên chỉ coi tốt/xấu đơn lẻ, mà đặt trong chuỗi 12 giai đoạn liên tục của vòng Tràng Sinh."},"Quan Đới":{"tb":"Chủ ham công danh, chức vị và quyền thế; khi gặp nhiều hung sát có thể chuyển thành sự ràng buộc, bó buộc. Nét nghĩa bổ sung: đam mê, ham muốn địa vị, danh thế hoặc quyền lực.","tl":"Giai đoạn “sự nghiệp”; là một mắt xích của chu kỳ sinh hóa và phải xét hành Mệnh với hành cung."},"Lâm Quan":{"tb":"Chủ xu hướng thể hiện, danh vị và sự phát triển nghề nghiệp; gặp tốt dễ phát đạt, gặp xấu dễ sinh phiền nhiễu hoặc hư danh. Nét nghĩa bổ sung: dễ biểu lộ sự hãnh diện, khoe thế hoặc thích phô trương.","tl":"Giai đoạn “hãnh diện”; biểu hiện bước tiến của chu kỳ, nhưng mức phát huy phụ thuộc vị trí Mệnh/Thân và ngũ hành."},"Đế Vượng":{"tb":"Chủ thế mạnh, uy nghi, thịnh đạt, quyền thế, tài lộc và sinh sản; ở Mệnh/Thân gặp Tử Vi sáng thường tăng khí chất lãnh đạo. Nét nghĩa bổ sung: thịnh vượng, quyền lực, thế phát triển đang lên cao.","tl":"Giai đoạn “oanh liệt”; là đỉnh thịnh của chu kỳ nhưng vẫn thuộc quy luật thịnh rồi suy, không phải tốt tuyệt đối."},"Suy":{"tb":"Chủ suy giảm, yếu thế, sa sút hoặc thiếu sinh lực; cần cát tinh nâng đỡ để giảm tác động. Nét nghĩa bổ sung: sút giảm, yếu kém, đuối sức hoặc giảm thế.","tl":"Giai đoạn “biếng nhược”; đánh dấu bước giảm của chu kỳ, cần xem như một trạng thái vận hành chứ không phải kết luận cố định."},"Bệnh":{"tb":"Chủ đau yếu, suy nhược, buồn rầu và bệnh tật; ý nghĩa tăng khi ở Mệnh/Tật Ách cùng hung sát. Nét nghĩa bổ sung: suy nhược, yếu đuối, giảm sức.","tl":"Giai đoạn “tàn tạ”; dùng để nhận diện một pha suy của chu kỳ sinh hóa, phải phối hợp hành Mệnh và cung."},"Tử":{"tb":"Chủ sự thu liễm, kín đáo, suy giảm sinh khí, tang thương hoặc kết thúc một chu kỳ; cần xét theo cung để tránh hiểu máy móc. Nét nghĩa bổ sung: chôn giấu, che đậy, âm thầm và kín đáo.","tl":"Giai đoạn “mãn kiếp”; là kết thúc một pha nhưng vòng vẫn tiếp tục qua Mộ–Tuyệt–Thai–Dưỡng."},"Mộ":{"tb":"Chủ thu chứa, khép lại, bảo tồn và cất giữ; có thể biểu hiện tính kín đáo, tích lũy hoặc sự trì trệ tùy bộ sao. Nét nghĩa bổ sung: sa sút, chôn giấu, u ám hoặc thu mình vào phần kín.","tl":"Giai đoạn “chôn vùi”; thuộc chuỗi khép lại để chuẩn bị tái sinh, nhấn mạnh tính luân chuyển hơn là phán tốt/xấu tuyệt đối."},"Tuyệt":{"tb":"Chủ đứt đoạn, suy kiệt hoặc cắt chuyển mạnh; gặp cát tinh có thể hiểu như dứt cũ để đổi mới, nhưng không nên tách khỏi toàn bộ cung. Nét nghĩa bổ sung: dứt đoạn, chấm dứt, kết thúc, khô cạn hoặc bế tắc.","tl":"Giai đoạn “đứt đoạn”; là điểm cắt của chu kỳ nhưng chưa phải chấm hết vì sau đó còn Thai và Dưỡng."},"Thai":{"tb":"Chủ mầm sinh, thai nghén, dự bị và sự hình thành ban đầu; tốt xấu phụ thuộc các sao hội hợp và cung đóng. Nét nghĩa bổ sung: nảy nở, phát sinh, mầm sống và sự hình thành mới.","tl":"Giai đoạn “tái sinh”; Thiên Lương dùng nó để nhấn mạnh vòng Tràng Sinh nối tiếp, không có đoạn tuyệt hoàn toàn."},"Dưỡng":{"tb":"Chủ nuôi dưỡng, bồi đắp, phục hồi và chuẩn bị cho chu kỳ mới; có tính mềm và tích lũy dần.","tl":"Giai đoạn “bồi đắp”; là bước chuẩn bị nối trở lại Tràng Sinh, biểu tượng cho chu kỳ tiếp diễn."},"Đà La":{"tb":"Sát tinh, chủ sát phạt và trở ngại. Ở vị trí đắc có thể tăng sự quả quyết; hãm dễ liều lĩnh, hung bạo, bệnh tật hoặc phá hoại. Nét nghĩa bổ sung: hung bạo, hiểm hóc, dễ tạo thế khó và va chạm.","tl":"Cùng Kình Dương tạo một quân đoàn sát tinh; Thiên Lương nhấn mạnh vị trí âm dương và quan hệ với Thất Sát. Đà tại Thìn/Tuất mới được gắn nhãn La–Võng."},"Kình Dương":{"tb":"Sát tinh, hình tinh, chủ sát phạt và va chạm. Đắc địa thiên về can đảm, quyết đoán; hãm dễ bạo liệt, thương tật và tai họa. Nét nghĩa bổ sung: liều lĩnh, hung bạo, sức công phá và tính đối đầu cao.","tl":"Thiên Lương xếp Kình–Đà là một quân đoàn sát tinh, hợp sự chỉ huy của Thất Sát; Kình còn phải an theo âm dương thuận/nghịch và luôn đi với Lực Sĩ."},"Địa Không":{"tb":"Sát tinh, chủ phá tán và biến động mạnh. Dù đắc địa vẫn cần bộ chỉ huy và cách cục phù hợp; hãm dễ gian hiểm, hao tán, bệnh tật hoặc tai họa. Nét nghĩa bổ sung: phá tán, bạo ngược, dễ đưa tới tai họa hay đổ vỡ khi cấu trúc xấu.","tl":"Không–Kiếp là quân đoàn sát tinh dữ nhất, Thiên Lương cho rằng Phá Quân là cấp chỉ huy hợp nhất; hiệu lực phải xét cả bộ, không luận Không riêng."},"Địa Kiếp":{"tb":"Sát tinh, chủ sát và phá tán. Đắc địa có thể tạo tính mạnh, táo bạo; hãm dễ gây phá tán, bệnh tật và tai họa. Nét nghĩa bổ sung: bạo liệt, dễ đi với thất bại, tổn hại hoặc nghịch cảnh mạnh.","tl":"Không–Kiếp là bộ sát mạnh, cần đúng cấp chỉ huy và đắc/hãm địa. Gặp Phá Quân trong hạn có thể tạo biến cố rất lớn."},"Linh Tinh":{"tb":"Sát tinh, chủ sát phạt, tính nhanh và bộc phát; dễ liên quan hỏa hoạn, thương tổn hoặc tai họa khi hội hung. Nét nghĩa bổ sung: trắc trở, ngang trái, ách tắc và khó thông suốt.","tl":"Linh–Hỏa hợp Tham Lang hơn các chính tinh khác; Thiên Lương đặc biệt chú ý cách an theo giờ sinh và âm dương thuận/nghịch."},"Hỏa Tinh":{"tb":"Sát tinh, chủ sát phạt, nóng gấp và bộc phát; dễ liên quan đốt phá, thương tổn hoặc tai họa khi hội hung. Nét nghĩa bổ sung: đốt phá, dễ đi với tai ương, họa nạn hoặc biến cố đột ngột.","tl":"Linh–Hỏa là một quân đoàn sát tinh riêng, hợp sự chỉ huy của Tham Lang; dùng lẫn với bộ khác thì hiệu lực giảm hoặc biến dạng."},"Văn Xương":{"tb":"Văn tinh, chủ văn chương, mỹ thuật, khoa giáp và học vấn; thông minh, hiếu học, nhưng gặp sát, Kỵ, Riêu thì mặt bất lợi tăng.","tl":"Thuộc bộ Xương–Khúc, là trợ lực quan trọng cho Cơ–Nguyệt–Đồng–Lương; đồng thời được Thiên Lương xem như một lớp chi tiết tinh tế khi luận cách."},"Văn Khúc":{"tb":"Văn tinh, chủ văn chương, mỹ thuật, khoa giáp và tài nghệ; thông minh, hiếu học, nhưng hội sát, Kỵ, Riêu dễ sinh lệch lạc hoặc hao tổn.","tl":"Cùng Văn Xương là bộ văn tinh quan trọng cho Cơ–Nguyệt–Đồng–Lương; cần xem trong tam hợp và toàn cấu trúc chứ không chỉ một cung."},"Thiên Khôi":{"tb":"Quý tinh, văn tinh, chủ khoa giáp, quyền tước, thông minh và cao thượng; gặp Hỏa, Linh, Hình thì cần dè chừng tai họa. Nét nghĩa bổ sung: sáng suốt, cao thượng, dễ gắn với chức sắc hoặc vị thế lớn.","tl":"Khôi–Việt là bộ trợ tinh then chốt của Cơ–Nguyệt–Đồng–Lương; vị trí an theo Can được Thiên Lương hiệu chỉnh khác một số sách phổ thông."},"Thiên Việt":{"tb":"Quý tinh, văn tinh, chủ khoa giáp, quý nhân, quyền tước và sự nâng đỡ; gặp Hỏa, Linh, Hình thì mặt tai họa tăng. Nét nghĩa bổ sung: cao sang, quyền tước, tài giỏi và có học vị.","tl":"Cùng Thiên Khôi là bộ quý tinh hỗ trợ Cơ–Nguyệt–Đồng–Lương; phải dùng đúng bảng an theo Can của hệ Thiên Lương."},"Tả Phụ":{"tb":"Trợ tinh, phò tá và giúp đỡ. Gặp nhiều sao tốt làm tốt thêm; gặp nhiều sao xấu có thể làm tác động xấu tăng.","tl":"Tả–Hữu là bộ chân tay đắc lực của Tử–Phủ–Vũ–Tướng; Thiên Lương coi đây là dấu hiệu năng lực quán xuyến khi hội đúng cách."},"Hữu Bật":{"tb":"Trợ tinh, phò tá và giúp đỡ. Gặp nhiều sao tốt làm tốt thêm; gặp nhiều sao xấu có thể làm tác động xấu tăng. Nét nghĩa bổ sung: giúp đỡ, cứu giải, có tính trợ lực cho người hoặc việc.","tl":"Cùng Tả Phụ là trợ lực then chốt cho Tử–Phủ–Vũ–Tướng; khi Tả Hữu nhập Mệnh, Thiên Lương thường nhấn mạnh khả năng quán xuyến."},"Long Trì":{"tb":"Thiên về thông minh, nhân hậu, ôn hòa, may mắn; liên quan cưới hỏi, sinh nở, nhà đất và công danh. Nét nghĩa bổ sung: ôn hòa, bình tĩnh, phong độ tự tại, an nhiên và ung dung.","tl":"Long–Phượng–Hổ–Cái là bộ nhân phẩm/chính phái và vinh dự; Long Trì nên đọc cùng Phượng Các, Bạch Hổ, Hoa Cái hơn là tách riêng."},"Phượng Các":{"tb":"Thiên về thông minh, nhân hậu, vui vẻ và danh giá; thường trợ công danh, nhà đất, cưới hỏi và các bộ hiền tinh. Nét nghĩa bổ sung: vui vẻ, hoan hỉ, tăng nét may mắn và sáng sủa.","tl":"Thuộc Long–Phượng–Hổ–Cái, bộ biểu thị nhân phẩm và vinh dự; cũng là một bộ hỗ trợ Nhật–Nguyệt khi cần tăng độ sáng cách cục."},"Tam Thai":{"tb":"Thiên về khôn ngoan, bệ vệ, phúc hậu, thích an nhàn; có ý nghĩa nâng đỡ nhà đất và địa vị.","tl":"Thai–Tọa là bộ trợ lực quan trọng cho Tử–Phủ–Vũ–Tướng; nhấn mạnh thế đứng và khả năng hoàn chỉnh cách cục."},"Bát Tọa":{"tb":"Thiên về khôn ngoan, bệ vệ, phúc hậu và thế đứng; có tác dụng nâng đỡ nhà đất, địa vị khi hội cát. Nét nghĩa bổ sung: bệ vệ, đường hoàng, có dáng vẻ trang trọng.","tl":"Cùng Tam Thai là bộ Thai–Tọa, hỗ trợ Tử–Phủ–Vũ–Tướng; giá trị mạnh hơn khi hội đúng nhóm và đúng tam hợp."},"Ân Quang":{"tb":"Thiên về thông minh, trọng ân nghĩa, nhân hậu, từ thiện; có tính cứu khốn, phò nguy và đem may mắn.","tl":"Quang–Quý được Thiên Lương xem là bộ hỗ trợ Cự–Nhật và Nhật–Nguyệt; tăng phần sáng, đạo lý và danh giá khi hội đúng cách."},"Thiên Quý":{"tb":"Quý tinh thiên về ân nghĩa, nhân hậu, từ thiện, quý nhân; có tính cứu khốn và giảm bệnh tật, tai họa.","tl":"Cùng Ân Quang tạo bộ Quang–Quý, trợ Cự–Nhật và Nhật–Nguyệt; cần đặt trong toàn tam hợp để luận."},"Thiên Khốc":{"tb":"Bại tinh, chủ đa sầu, đa cảm, buồn rầu và tang thương; đắc địa có thể làm lời nói thêm đanh thép, nhưng vẫn cần xét bộ sao. Nét nghĩa bổ sung: đau đớn, hốt hoảng, cảnh tang thương hoặc buồn chán.","tl":"Thiên Lương xem Khốc–Hư là bại tinh, nhưng ở Tý–Ngọ–Mão–Dậu có thể biểu hiện sự hãnh diện, danh tiếng hoặc tiếng nói mạnh nếu có Thiên Mã và thế phù hợp."},"Thiên Hư":{"tb":"Bại tinh, chủ buồn rầu, hoảng hốt, tang thương và sự trống hụt; thường đi gần thế Tuế Phá và bất mãn. Nét nghĩa bổ sung: đầu óc và tư tưởng phong phú, nhiều liên tưởng.","tl":"Gần Tuế Phá, biểu hiện bất mãn; khi đi với Khốc tại Tý/Ngọ và có Thiên Mã đúng dụng có thể chuyển thành động lực tạo danh."},"Thiên Đức":{"tb":"Đức tinh, chủ đoan chính, nhân hậu, từ thiện; có thể chế bớt tính hoa nguyệt của Đào, Hồng và giải bệnh nhỏ. Nét nghĩa bổ sung: nhân hậu, đức độ, đàng hoàng và nghiêm chỉnh.","tl":"Thuộc nhóm đức tinh thường đi với thế sinh nhập của vòng Thái Tuế; dùng để kiềm chế Thiên Không và giữ sự sáng suốt trong khuôn đạo đức."},"Nguyệt Đức":{"tb":"Đức tinh, chủ đoan chính, nhân hậu, từ thiện; có tính điều hòa và cứu giải nhẹ. Nét nghĩa bổ sung: mẫu mực, đoan chính, bao dung và có tính che chở.","tl":"Đức tinh, thường cùng Thiên Đức, Long Đức, Phúc Đức tạo nền nhân hậu; Thiên Lương dùng các đức tinh để cân bằng những thế thông minh nhưng dễ quá trớn."},"Thiên Hình":{"tb":"Hình tinh, chủ uy, sát phạt, dao kéo, luật lệ và xử đoán; gặp bộ y dược có thể liên hệ nghề y, gặp sát tinh dễ thành thương tổn.","tl":"Thiên Lương coi Hình là hung tinh đáng kể; người Giáp–Ất hoặc Mệnh Mộc gặp Hình phải dè chừng hơn, và Hình đắc địa có thể giảm mức tác hại."},"Thiên Riêu":{"tb":"Chủ đa nghi, huyễn hoặc, tín ngưỡng và sắc dục. Đắc địa có thể hướng về tâm linh; hãm hoặc hội Đào Hồng, Xương Khúc dễ tăng mặt dục tính.","tl":"Trong nghiệm lý Thiên Lương, Riêu thường được xét cùng Hình và Không Kiếp trong các thế oan nghiệp hoặc sắc dục; không nên luận riêng khỏi bộ sao."},"Thiên Y":{"tb":"Chủ sạch sẽ, cẩn thận và cứu giải bệnh tật; thường được xem như yếu tố y dược, chăm sóc.","tl":"Thiên Lương không tách Thiên Y thành nguyên lý lớn riêng; nên đọc theo chức năng cứu giải/y dược cùng cung và bộ sao thực tế."},"Quốc Ấn":{"tb":"Chủ chức vị, quyền hành, công danh và bằng sắc; gặp Tuần, Triệt dễ bị ngăn trở hoặc giảm quyền. Nét nghĩa bổ sung: thế lực, quyền hành, việc tuyển chọn và cơ hội thăng tiến.","tl":"Trong hệ Thiên Lương, Ấn thường được dùng như dấu hiệu quyền chức khi đi với bộ chính tinh phù hợp; vẫn phải chịu luật Tuần–Triệt và tam hợp."},"Đường Phù":{"tb":"Chủ đường bệ, uy nghi, lợi cho công danh và nhà đất; gặp Bạch Hổ có thể liên hệ bắt bớ, pháp luật hoặc giam giữ. Nét nghĩa bổ sung: thêm điều ích lợi, mở rộng và phát triển.","tl":"Thiên Lương không dùng Đường Phù như trục chính; nên xem như phụ trợ, đặt dưới nguyên tắc âm dương, ngũ hành và toàn bộ cung."},"Đào Hoa":{"tb":"Chủ duyên, vui vẻ, đa tình, hấp dẫn và việc hôn phối; gặp cát tinh tăng vẻ rực rỡ, gặp nhiều sát tinh dễ thành rắc rối tình cảm. Nét nghĩa bổ sung: lãng mạn, đa tình và dễ nghiêng về cảm xúc.","tl":"Thiên Lương tách rõ vị trí Đào Hoa tại Tý–Ngọ–Mão–Dậu: đây là vị trí mưu sĩ, lanh lợi, có thể thành quỷ quyệt nếu thiếu đức; luôn xét cùng Hồng Loan và Thiên Không."},"Hồng Loan":{"tb":"Chủ duyên, tình cảm, hỷ sự và cưới hỏi; đi cùng bộ tốt làm tăng nét sáng, nhưng hội sát tinh phải xét mặt bất ổn. Nét nghĩa bổ sung: đảm đang, tháo vát, lanh lợi trong ứng xử và quan hệ.","tl":"Ở Dần–Thân–Tỵ–Hợi, Hồng Loan làm chủ, biểu hiện giác quan bén nhạy, từ tâm, giảm tham sân si; Thiên Không tại đây chỉ là khách hỗ trợ sắc–không."},"Thiên Hỷ":{"tb":"Chủ vui vẻ, hòa nhã, tin mừng, cầu danh, cưới hỏi và sinh nở. Nét nghĩa bổ sung: vui vẻ, hanh thông và nhiều may mắn.","tl":"Thường được Thiên Lương dùng cùng Hồng–Đào trong các thế sáng, vui hoặc đạo đức; không phải trục độc lập lớn nhưng có giá trị tăng tính hỷ và sáng."},"Thiên Giải":{"tb":"Giải tinh, chủ đức độ, khoan hòa, cứu khốn và giải trừ bệnh tật, tai họa ở mức độ nhất định.","tl":"Không phải trục lý luận trung tâm trong Thiên Lương; nên dùng như sao cứu giải phụ, sau khi đã xét Thái Tuế, Lộc Tồn, Tràng Sinh và tam hợp."},"Địa Giải":{"tb":"Giải tinh, chủ nhân hậu, cứu khốn, giảm bệnh tật và tai họa; hiệu lực cần xét toàn bộ bộ sao. Nét nghĩa bổ sung: nhân hậu, đức độ, có tính làm dịu và cứu giải.","tl":"Sao cứu giải phụ; theo phương pháp Thiên Lương, không để một giải tinh phủ định cấu trúc lớn của cung và vận."},"Giải Thần":{"tb":"Giải tinh, chủ cứu giải và nhân hậu; ở Tài/Điền có thể đi kèm hao hụt của cải theo cách luận của Tân Biên. Nét nghĩa bổ sung: giải cứu, giải phóng, tháo gỡ và thoát nạn.","tl":"Sao cứu giải phụ; chỉ nên dùng để điều chỉnh mức độ sau khi đã xác định thế chính của Mệnh/Thân và các vòng."},"Thai Phụ":{"tb":"Chủ danh dự, hình thức, bằng sắc, thi cử và cầu công danh; thường làm tăng vẻ bề thế.","tl":"Thai–Cáo được Thiên Lương xem là bộ trợ lực cần cho Sát–Phá–Liêm–Tham; giúp định hình địa vị, hiệu lệnh và hình thức của bộ này."},"Phong Cáo":{"tb":"Chủ bằng sắc, danh dự, chức tước và hình thức; thường lợi cho thi cử, công danh khi hội cát. Nét nghĩa bổ sung: công danh, sự nghiệp, học vị và bằng cấp.","tl":"Cùng Thai Phụ thành Thai–Cáo, là bộ trợ cho Sát–Phá–Liêm–Tham; cần hội đúng cách mới có giá trị rõ."},"Thiên Tài":{"tb":"Có tính điều tiết: gặp sao xấu có thể giảm xấu, gặp sao tốt cũng có thể làm giảm độ tốt; đặc biệt cần xét với Nhật Nguyệt. Nét nghĩa bổ sung: có tính chế ngự, giảm thiểu, làm bớt đi hoặc điều chỉnh mức độ.","tl":"Thiên Lương thường dùng Thiên Tài trong phối hợp thực tế của lá số hơn là làm nguyên lý độc lập; phải xem tác động điều tiết trong toàn cung."},"Thiên Thọ":{"tb":"Điềm đạm, hòa nhã, nhân hậu, từ thiện; chủ tăng phúc thọ. Nét nghĩa bổ sung: phúc thiện, hiền hậu, điềm đạm và hòa nhã.","tl":"Thuộc lớp phúc thọ phụ; cần đặt sau các trục Mệnh–Thân, Thái Tuế, Lộc Tồn và Tràng Sinh."},"Thiên Thương":{"tb":"Chủ buồn thảm, bất lợi, tang thương, bệnh tật hoặc tai họa; thường mang tính ngăn trở.","tl":"Sao bất lợi phụ; Thiên Lương không cho phép một sao đơn độc quyết định kết luận nếu cấu trúc lớn của hạn và cung không đồng ý."},"Thiên Sứ":{"tb":"Chủ buồn thảm, bất lợi, bệnh tật, tai họa và trở ngại; cần xét mạnh hơn khi ở Tật Ách.","tl":"Sao bất lợi phụ, đặc biệt nhạy ở Tật Ách; vẫn phải xét cùng hành, chính tinh và vận hạn."},"Hóa Khoa":{"tb":"Chủ thông minh, học vấn, nhân hậu, danh giá; có tính tăng phúc thọ, cứu khốn, giải bệnh tật và giảm tác động sát tinh. Nét nghĩa bổ sung: thông minh, lịch lãm, uyên bác và thiên về tri thức.","tl":"Thiên Lương coi Khoa có vai trò đặc biệt như lực dung hòa giữa Lộc–Quyền và Kỵ; các sao có tư cách thông minh, nhân hậu mới đảm đương tốt vai trò này."},"Hóa Quyền":{"tb":"Chủ quyền hành, mạnh bạo, mau mắn và uy thế; gặp tốt làm tốt thêm, gặp xấu cũng có thể làm xấu mạnh hơn. Nét nghĩa bổ sung: thăng tiến công việc, tăng trách nhiệm hoặc thêm chức vụ.","tl":"Trong Tứ Hóa, Quyền là mặt quyền động mạnh; Thiên Lương cảnh báo Quyền–Lộc quá nặng mà thiếu Khoa cân bằng dễ tạo căng thẳng và phản tác dụng."},"Hóa Lộc":{"tb":"Chủ tăng tài, tiến lộc, chức vị và khả năng thu hoạch; gặp Tham, Vũ, Lộc Tồn càng tăng tài, gặp Không Kiếp/Hao thì dễ hao tán. Nét nghĩa bổ sung: phát tài, tăng nguồn lợi và có khả năng thu hoạch tốt.","tl":"Thiên Lương phân biệt Hóa Lộc với Lộc Tồn: Hóa Lộc là phần lộc do công khó, tái tạo và phát triển; không đồng nghĩa với thiên lộc bền vững của Lộc Tồn."},"Hóa Kỵ":{"tb":"Chủ vướng mắc, nhầm lẫn, thị phi, ghen ghét và bệnh tật; đắc địa ở Tứ Mộ giảm phần tai họa, một số phối hợp đặc biệt có thể chuyển nghĩa. Nét nghĩa bổ sung: ghen ghét, đố kỵ, bảo thủ hoặc dễ mắc vào thế cực đoan.","tl":"Hung tinh đáng kể. Người Bính–Đinh hoặc Mệnh Hỏa gặp Kỵ phải dè chừng hơn; hiệu lực còn phụ thuộc đắc địa và các thế chế hóa."},"Cô Thần":{"tb":"Chủ cô độc, lạnh, khó tính, ít giao tiếp và giữ của; thường bất lợi cho hôn nhân hoặc sự hòa hợp nếu không có sao hóa giải. Nét nghĩa bổ sung: lạnh lùng, khép kín, thái độ khó gần hoặc khó hòa hợp.","tl":"Thiên Lương không đồng ý hiểu Cô–Quả luôn là cô độc. Với tuổi Thìn–Tuất–Sửu–Mùi tại Dần–Thân–Tỵ–Hợi, Cô Thần có thể chuyển thành sự cởi mở, sáng suốt và đạo đức."},"Quả Tú":{"tb":"Chủ cô độc, khép kín, khó gần và duyên phối ngẫu; đồng thời có tính giữ gìn tài sản. Nét nghĩa bổ sung: đơn độc, âm thầm, lặng lẽ và có sức chịu đựng.","tl":"Cùng Cô Thần tạo thế Cô–Quả; phải xét vị trí theo tuổi. Một số thế đặc biệt của Thiên Lương cho kết quả không cô độc mà ngược lại rất sáng và công chính."},"Thiên Mã":{"tb":"Dịch mã, chủ di chuyển, thay đổi, nhanh nhẹn, tháo vát và công danh tài lộc. Hiệu lực thay đổi rất mạnh theo sao đi cùng. Nét nghĩa bổ sung: nghị lực, chí khí, năng nổ vận hành và di động; cũng mang nghĩa khởi sự, bắt đầu hành động.","tl":"Thiên Lương coi Thiên Mã là viên ngọc quý của phe bất mãn Tuế Phá–Tang Môn–Điếu Khách. Mã phải xét đúng hành địa bàn và Mệnh; đúng chủ mới thành nghị lực thực sự."},"Phá Toái":{"tb":"Chủ phá ngang, hao tán, chống chặn và trở ngại; khi đi với Phá Quân hoặc bộ hung có thể làm tính phá tán rõ hơn. Nét nghĩa bổ sung: hao hụt, phát tán, dễ tạo tình trạng đảo điên hoặc hỗn loạn.","tl":"Hao tán tinh, Hỏa đới Kim, chỉ ở Tỵ–Dậu–Sửu. Thiên Lương đặc biệt coi Phá Toái là trợ lực phá mạnh cho Phá Quân trong thế “lưỡng Phá”."},"Thiên Quan":{"tb":"Quý nhân, đức tinh, chủ nhân hậu, tín ngưỡng, cứu khốn, phò nguy và tăng phúc thọ. Nét nghĩa bổ sung: giúp đỡ, hỗ trợ, giải cứu và tháo gỡ khó khăn.","tl":"Quý/đức tinh phụ, dùng để tăng phần đạo lý, cứu giải; không thay thế nguyên tắc Mệnh–Thân và ba vòng chính."},"Thiên Phúc":{"tb":"Quý nhân, phúc tinh, chủ đức độ, nhân hậu, từ thiện, cứu giải bệnh tật và tăng phúc thọ. Nét nghĩa bổ sung: chia sẻ, giảm bớt, xóa bỏ hoặc triệt tiêu một phần bất lợi.","tl":"Phúc tinh phụ, thường bổ sung nền đức; trong nghiệm lý Thiên Lương phải phối hợp toàn tam hợp và vị trí Mệnh/Thân."},"Lưu Hà":{"tb":"Sát tinh, chủ thâm trầm, gian hiểm, sát phạt và tai họa; gặp Kiếp Sát hoặc bộ hung có thể tăng mức nguy hiểm. Nét nghĩa bổ sung: nham hiểm, khủng hoảng, quỷ quyệt; khi xấu dễ làm tình thế khó lường.","tl":"Thiên Lương xem Lưu Hà (Thủy) đi với Kiếp Sát (Hỏa) như hai lưỡi kéo sát tinh, thường đứng với Thiên Không để thi hành hậu quả thừa trừ."},"Thiên Trù":{"tb":"Chủ ăn uống, hưởng thụ và tài lộc; thường biểu hiện điều kiện vật chất, ẩm thực hoặc lộc hưởng.","tl":"Trong hệ Thiên Lương được đưa vào Tứ Lộc mở rộng của phần mềm hiện tại; ý nghĩa hưởng thụ phải đặt trong Thiên Can và thế Lộc tổng thể."},"Kiếp Sát":{"tb":"Sát tinh, chủ sát phạt, tai họa, dao kéo, châm chích hoặc thương tổn; ở Mệnh/Tật Ách cần xem kỹ hội hợp. Nét nghĩa bổ sung: tai họa, ách nạn và sát lực mạnh khi gặp cấu trúc bất lợi.","tl":"Cùng Lưu Hà tạo bộ sát mạnh: một Thủy, một Hỏa, đều ở nghịch địa âm dương theo Can/Chi; chỉ kết luận nặng khi toàn cấu trúc cùng xác nhận."},"Hoa Cái":{"tb":"Chủ vẻ bề ngoài, uy nghi, phú quý, quyền thế và cầu công danh; đi cùng Long Phượng Hổ có thể thành bộ Tứ Linh. Nét nghĩa bổ sung: bệ thế, đẹp về uy nghi và có dáng vẻ nổi bật.","tl":"Nằm trong Long–Phượng–Hổ–Cái, bộ biểu thị vinh dự, nhân phẩm và chính phái; giá trị rõ hơn khi hội thành bộ."},"L.N. Văn Tinh":{"tb":"Chủ thông minh, chuộng bằng sắc, lợi cho học hành, thi cử và cầu công danh. Nét nghĩa bổ sung: thông minh, ham học hỏi và hiểu biết nhiều điều.","tl":"Trong các phát triển của gia đình Thiên Lương, Lưu Niên Văn Tinh được đặt ở phía tinh thần của Thiên Can, đối xứng với Lộc Tồn ở phía vật chất."},"Đẩu Quân":{"tb":"Chủ nghiêm nghị, khắc nghiệt, giữ của và ít thuận cho sinh nở; ở Quan Lộc hội nhiều sao tốt có thể tăng danh quyền. Nét nghĩa bổ sung: nghiêm trang, giữ phép tắc và bảo vệ nguyên tắc.","tl":"Không phải trục lý luận lớn riêng trong các phần cốt lõi; nên dùng như phụ tinh sau khi xác định thế cung, vòng và vận."},"Thiên Không":{"tb":"Chủ phá hủy, phát tán, hư không và mưu biến. Khi đi cùng Đào/Hồng có thể chuyển sang sắc thái mưu trí hoặc ẩn dật tùy cấu trúc.","tl":"Ở Dần–Thân–Tỵ–Hợi phụ thuộc Hồng Loan, ở Tý–Ngọ–Mão–Dậu đi cùng Đào Hoa, còn tại Thìn–Tuất–Sửu–Mùi dễ độc quyền gây phá. Đây là sao phải luận theo vị trí, không theo một nghĩa cố định."}});

/* V3.3.78 — lớp nội dung bổ sung theo hệ Gia đình Thiên Lương. */
const TL_STAR_GROUP=Object.freeze({
  "Tử Vi":"Tử–Phủ–Vũ–Tướng","Thiên Phủ":"Tử–Phủ–Vũ–Tướng","Vũ Khúc":"Tử–Phủ–Vũ–Tướng","Thiên Tướng":"Tử–Phủ–Vũ–Tướng",
  "Thất Sát":"Sát–Phá–Liêm–Tham","Phá Quân":"Sát–Phá–Liêm–Tham","Liêm Trinh":"Sát–Phá–Liêm–Tham","Tham Lang":"Sát–Phá–Liêm–Tham",
  "Thiên Cơ":"Cơ–Nguyệt–Đồng–Lương","Thái Âm":"Cơ–Nguyệt–Đồng–Lương","Thiên Đồng":"Cơ–Nguyệt–Đồng–Lương","Thiên Lương":"Cơ–Nguyệt–Đồng–Lương",
  "Cự Môn":"Cự–Nhật","Thái Dương":"Cự–Nhật"
});
const TL_MAJOR_POSITIONS=Object.freeze({
  "Tử Vi":"Miếu: Tỵ, Ngọ, Dần, Thân; Vượng: Thìn, Tuất; Đắc: Sửu, Mùi, Hợi, Tý; Bình: Mão, Dậu. Thiên Lương không xếp Tử Vi vào hãm địa.",
  "Thiên Phủ":"Miếu: Dần, Thân, Tý, Ngọ; Vượng: Thìn, Tuất; Đắc: Mùi, Tỵ, Hợi; Bình: Sửu, Mão, Dậu. Không xếp hãm địa.",
  "Vũ Khúc":"Miếu: Thìn, Tuất, Sửu, Mùi; Vượng: Dần, Thân, Tý, Ngọ; Đắc: Mão, Dậu; Hãm: Tỵ, Hợi.",
  "Thiên Tướng":"Miếu: Dần, Thân; Vượng: Tý, Ngọ, Thìn, Tuất; Đắc: Sửu, Mùi, Tỵ, Hợi; Hãm: Mão, Dậu.",
  "Thất Sát":"Miếu: Dần, Thân, Tý, Ngọ; Vượng: Tỵ, Hợi; Đắc: Sửu, Mùi; Hãm: Mão, Dậu, Thìn, Tuất.",
  "Phá Quân":"Miếu: Tý, Ngọ; Vượng: Sửu, Mùi; Đắc: Thìn, Tuất; Hãm: Dần, Thân, Tỵ, Hợi, Mão, Dậu.",
  "Liêm Trinh":"Miếu: Dần, Thân; Vượng: Thìn, Tuất, Tý, Ngọ; Đắc: Sửu, Mùi; Hãm: Tỵ, Hợi, Mão, Dậu.",
  "Tham Lang":"Miếu: Sửu, Mùi; Vượng: Thìn, Tuất; Đắc: Dần, Thân; Hãm: Tỵ, Hợi, Tý, Ngọ, Mão, Dậu.",
  "Thiên Cơ":"Miếu: Thìn, Tuất, Mão, Dậu; Vượng: Tỵ, Thân, Mùi; Đắc: Ngọ, Tý, Sửu; Hãm: Dần, Hợi.",
  "Thái Âm":"Miếu: Hợi, Tý; Vượng: Dậu, Tuất, Thân; Đắc: Sửu, Mùi; Hãm: Dần, Mão, Thìn, Tỵ, Ngọ.",
  "Thiên Đồng":"Miếu: Dần, Thân; Vượng: Tý; Đắc: Mão, Tỵ, Hợi; Hãm: Ngọ, Dậu, Thìn, Tuất, Sửu, Mùi.",
  "Thiên Lương":"Miếu: Ngọ, Thìn, Tuất; Vượng: Tý, Mão, Dần, Thân; Đắc: Sửu, Mùi; Hãm: Tỵ, Hợi, Dậu.",
  "Cự Môn":"Miếu: Mão, Dậu; Vượng: Tý, Ngọ, Dần; Đắc: Thân, Hợi; Hãm: Tỵ, Thìn, Tuất, Sửu, Mùi.",
  "Thái Dương":"Miếu: Thìn, Ngọ; Vượng: Dần, Mão, Tỵ; Đắc: Sửu, Mùi; Hãm: Thân, Dậu, Tuất, Hợi, Tý."
});
const TL_STAR_DETAIL=Object.freeze({
  "Tử Vi":{role:"Đế tinh, tượng ngôi vị thụ hưởng xứng đáng với phúc đức và tư cách.",combine:"Thuộc Tử–Phủ–Vũ–Tướng; cần Tả–Hữu, Thai–Tọa. Thiên Lương đọc Tử Vi theo cả thế quân thần và đối lực Sát–Phá–Tham, không theo một tính từ tốt/xấu cố định. Các vị trí Tử Vi được nghiệm lý như những thế Đế/Bá khác nhau, từ đắc thế đến bị Phá Quân hoặc Tham Lang uy hiếp."},
  "Thiên Phủ":{role:"Thừa tướng, chủ tài lộc, trung hậu và khả năng gìn giữ.",combine:"Gắn chặt với Tử Vi và Thiên Tướng. Khi xa Tử Vi, Thiên Tướng thường giao tiếp với Thiên Phủ. Giá trị của Phủ là ổn định và quản trị, nhưng phải xét Tuần–Triệt, Không–Kiếp và toàn tam hợp trước khi nói đến khả năng bảo toàn."},
  "Vũ Khúc":{role:"Tài tinh, thiên về tài lực và năng lực điều hành thực tế.",combine:"Trong Tử–Phủ–Vũ–Tướng, Vũ là chân tay thực hành. Thiên Lương đồng thời lưu ý mặt cô độc, tham cầu hoặc dễ bị lợi dụng khi cấu trúc xấu; các thế Vũ–Phá, Vũ–Sát làm quan hệ với Đế tinh đổi mạnh. Vũ Khúc còn được coi là một mắt xích làm chuyển thế giữa Tử và Phá."},
  "Thiên Tướng":{role:"Quyền tinh, uy dũng, tư cách khẳng khái và nghĩa hiệp.",combine:"Thiên Lương nhấn mạnh Thiên Tướng không đứng chung với Sát–Phá–Tham và thường xuyên ở thế chống Phá Quân. Khi xa Tử Vi, Tướng giao tiếp với Thiên Phủ; chỉ tại Tý–Ngọ mới chịu Liêm Trinh để thành Liêm–Tướng. Đây là sao phải đọc trong quan hệ quân thần, không chỉ theo miếu/hãm."},
  "Thất Sát":{role:"Quyền tinh, uy dũng; cương quyết, can đảm và hành động dứt khoát.",combine:"Thuộc Sát–Phá–Liêm–Tham, nhóm thực hành có biên độ tốt/xấu rất cao. Kình–Đà là quân đoàn sát tinh hợp với Thất Sát và cần Sát làm cấp chỉ huy; Phá Quân có thể thay chỉ huy Kình–Đà, nhưng Thất Sát gặp Không–Kiếp hoặc Linh–Hỏa không hiệu nghiệm bằng đúng bộ. Sát thường ở thế chống Thiên Phủ ôn nhu, vì vậy phải xét đối cung và toàn cục."},
  "Phá Quân":{role:"Dũng mãnh, hao tán, vai chủ động của Sát–Phá–Liêm–Tham.",combine:"Thiên Lương mô tả Phá Quân nhiều khi đơn thương độc mã, xông pha bất kể trở lực. Không–Kiếp là quân đoàn hợp nhất với Phá Quân; Phá cũng có thể điều động Kình–Đà. Phá Toái tại Tỵ–Dậu–Sửu làm sức phá tăng rõ, đặc biệt trong thế ‘lưỡng Phá’. Tốt/xấu phải xét việc Phá đang cải biến đúng lúc hay phá hỏng cấu trúc."},
  "Liêm Trinh":{role:"Chủ Quan Lộc, Tù tinh; cốt tính chính trực, nghiêm nghị và đi đường thẳng.",combine:"Liêm có vị trí đặc biệt giữa hai phe. Khi phò Tử–Phủ và đắc địa, Liêm tăng uy danh liêm khiết; khi nhập Sát–Phá–Tham thì Liêm–Tham, Liêm–Phá, Liêm–Sát có thể trở nên hung hãn hơn vì Liêm không đủ sức cảm hóa bộ ba thực hành. Cần xét toàn bộ phe và sát tinh đi kèm."},
  "Tham Lang":{role:"Chủ họa phúc, tính hoạt động mạnh; trong hệ Thiên Lương là một đầu mối thực hành của Sát–Phá–Liêm–Tham.",combine:"Linh–Hỏa là quân đoàn sát tinh hợp với Tham Lang. Không nên dùng Không–Kiếp hay Kình–Đà thay thế máy móc vì mỗi quân đoàn có cấp chỉ huy riêng. Vị trí Tham còn tham gia trực tiếp vào thế uy hiếp/kiến thiết quanh Tử Vi, nên phải đọc cùng Phá, Sát, Vũ và thế vận."},
  "Thiên Cơ":{role:"Chủ mưu cơ, khéo léo và ngoại giao; thuộc lớp tư tưởng tinh thần.",combine:"Trong Cơ–Nguyệt–Đồng–Lương, Thiên Cơ trội về khéo léo, nhưng không tự đủ để quyết định cục diện. Bộ này cần Xương–Khúc, Khôi–Việt. Khi vận hành gặp Sát–Phá–Liêm–Tham dễ phát sinh va chạm mạnh vì hai thế cờ khác nhau."},
  "Thái Âm":{role:"Chủ điền tài, là một trong hai ‘ngọn đèn’ soi phần tư tưởng.",combine:"Nhật–Nguyệt được Thiên Lương coi là biểu tượng cặp mắt/khối óc. Khi lạc hãm, phải tìm Hồng–Đào–Hỷ hoặc ít nhất một trong Xương–Khúc, Long–Phượng, Quang–Quý để nâng tư cách. Không luận Âm tách khỏi độ sáng, vị trí và các bộ phụ tá."},
  "Thiên Đồng":{role:"Chủ phúc thọ; trong nhóm tinh thần thường mềm, dễ canh cải và kém phần quyết định.",combine:"Thiên Đồng phải đọc với Cơ–Nguyệt–Lương, Xương–Khúc, Khôi–Việt và vòng Tràng Sinh. Gặp thế Sát–Phá–Liêm–Tham trong vận có thể bị ép mạnh hơn do bản chất mềm và biến đổi."},
  "Thiên Lương":{role:"Chủ phúc thọ, phụ mẫu; khoan hòa và có khả năng giữ thăng bằng trước biến diễn.",combine:"Trong Cơ–Nguyệt–Đồng–Lương, Thiên Lương là sao có độ lượng và khả năng xử lý hay/dở khá đầy đủ. Tý được xem là đất rất hợp; Ngọ danh vọng nhưng hao công; Sửu có thể thành cao nhân đắc ý. Khi đứng với Cơ ở Thìn–Tuất, Nhật ở Mão–Dậu, Đồng ở Dần–Thân, vai của Lương là giữ khuôn khổ và độ lượng."},
  "Cự Môn":{role:"Chủ điền, thị phi; ‘ám thể’ nhưng không thể hiểu đơn giản là xấu.",combine:"Cự–Nhật là một thế riêng, cần Hồng–Đào, Quang–Quý. Thiên Lương dùng Thái Dương/Thái Âm như hai nguồn sáng để soi thấu Cự, Cơ, Đồng, Lương; vì vậy phải xét ánh sáng và thế đối đãi trước khi luận thị phi."},
  "Thái Dương":{role:"Chủ Quan Lộc, một trong hai ‘ngọn đèn’ của hệ tư tưởng.",combine:"Cùng Thái Âm tạo trục sáng soi đường cho Cự–Cơ–Đồng–Lương. Cự–Nhật cần Hồng–Đào, Quang–Quý; Nhật–Nguyệt lạc hãm còn cần Xương–Khúc, Long–Phượng hoặc Quang–Quý. Độ sáng và hoàn cảnh sinh khắc quan trọng hơn việc gán một nghĩa tốt/xấu đơn giản."},
  "Tả Phụ":{role:"Một trong các sao biểu thị tài năng quán xuyến và lực phò tá.",combine:"Tả–Hữu là bộ cần nhất của Tử–Phủ–Vũ–Tướng. Thiên Lương còn xếp Tả–Hữu cùng Nhật–Nguyệt và Thiên Mã vào nhóm những ‘viên ngọc’ biểu thị thực lực; phải xem chúng có nhập đúng cấu trúc và hành hay không."},
  "Hữu Bật":{role:"Phụ tá, quán xuyến; đi đôi với Tả Phụ.",combine:"Tả–Hữu trợ Tử–Phủ–Vũ–Tướng và được đánh giá cao hơn vẻ hào nhoáng của Khoa–Quyền–Lộc nếu xét về thực lực. Hữu Bật còn tham gia Tứ Hóa can Mậu theo bảng Thiên Lương."},
  "Văn Xương":{role:"Văn tinh, thuộc lớp trợ lực trí thức.",combine:"Xương–Khúc là bộ cần nhất cho Cơ–Nguyệt–Đồng–Lương. Với Nhật–Nguyệt lạc hãm, Xương–Khúc là một trong các bộ có thể nâng tư cách. Không nên dùng riêng Xương để kết luận học vấn nếu Mệnh/Thân và tam hợp không đồng ý."},
  "Văn Khúc":{role:"Văn tinh, phối hợp với Văn Xương.",combine:"Xương–Khúc trợ Cơ–Nguyệt–Đồng–Lương và giúp Nhật–Nguyệt lạc hãm có tư cách hơn. Giá trị còn phụ thuộc vị trí, hành và sát/hung tinh hội hợp."},
  "Thiên Khôi":{role:"Quý tinh, đi đôi với Thiên Việt.",combine:"Khôi–Việt là bộ cần cho Cơ–Nguyệt–Đồng–Lương. Hệ Thiên Lương có bảng an Khôi–Việt riêng theo Can năm sinh và lưu ý nhiều sách cũ từng in sai; vì vậy vị trí phải lấy đúng theo bảng Thiên Lương trước khi luận."},
  "Thiên Việt":{role:"Quý tinh, phối hợp với Thiên Khôi.",combine:"Khôi–Việt trợ thế tinh thần Cơ–Nguyệt–Đồng–Lương; tác dụng chỉ rõ khi nằm trong bố cục phù hợp, không dùng như dấu hiệu ‘quý nhân’ độc lập để đảo ngược toàn lá số."},
  "Lộc Tồn":{role:"Thiên lộc do Thiên Can ấn định, khác Hóa Lộc là lộc do công khó làm ra.",combine:"Chỉ bốn Can Giáp, Ất, Canh, Tân có những trường hợp tam hợp tuổi được hưởng Lộc Tồn trọn vẹn; sáu Can còn lại thường phải xét nghịch vị trí và bộ Hà–Sát canh giữ. Lộc Tồn phải đọc cùng vòng Thái Tuế và Tràng Sinh, không đồng nhất cứ có Lộc là giàu."},
  "Thái Tuế":{role:"Trục tư cách theo Địa Chi tuổi, cho biết đương số đứng ở ‘đất nhà mình’ hay thế thuận/nghịch.",combine:"Tam hợp Thái Tuế–Quan Phù–Bạch Hổ là thế chính danh, thỏa mãn và thường được Long–Phượng–Hổ–Cái nâng đỡ. Ba tam hợp còn lại lần lượt là sinh nhập, xung khắc bất mãn và sinh xuất thua thiệt. Đây là nguyên lý nền, không chỉ là nghĩa riêng của một sao."},
  "Quan Phù":{role:"Một đỉnh của tam hợp Thái Tuế, biểu hiện hành động chính đáng có suy tính.",combine:"Quan Phù phải luận cùng Thái Tuế và Bạch Hổ. Khi đương số nằm đúng tam hợp tuổi, hành động có tính chính danh; nếu tách khỏi vòng sẽ mất ý nghĩa nghiệm lý cốt lõi."},
  "Bạch Hổ":{role:"Một đỉnh của tam hợp Thái Tuế, biểu hiện nỗ lực làm điều mình cho là chính đáng bất kể giá.",combine:"Bạch Hổ trong hệ Thiên Lương không thể chỉ coi là bại/hung tinh; khi thuộc tam hợp Thái Tuế, nó tham gia Long–Phượng–Hổ–Cái và có thể là dấu hiệu vinh dự, chính phái. Phải xét tuổi và vị trí trước."},
  "Thiếu Dương":{role:"Vị trí sinh nhập, sáng suốt hơn người.",combine:"Thiên Không đứng sát Thiếu Dương, vì vậy sự sáng suốt cần đi với đức độ; nếu không, Thiên Không sẽ thi hành mặt bù trừ. Luận cùng Tử Phù–Phúc Đức và các Đức tinh."},
  "Tử Phù":{role:"Vị trí sinh nhập, có phần hơn người nhưng thường bị kẹt.",combine:"Không nên tách Tử Phù khỏi bộ Thiếu Dương–Tử Phù–Phúc Đức; đây là một tam hợp được sinh nhập, nhưng đòi hỏi nhân hậu và đạo đức để giữ bền."},
  "Phúc Đức":{role:"Vị trí sinh nhập trong vòng Thái Tuế, nhấn mạnh đức độ và phần thần quyền/đạo lý.",combine:"Trong bộ Thiếu Dương–Tử Phù–Phúc Đức, muốn ‘hơn người ăn chắc’ phải có đức. Đây là nguyên lý của vòng, không phải chỉ là ý nghĩa cát tinh thông thường."},
  "Tuế Phá":{role:"Vị trí xung khắc, bất mãn và muốn đả phá/quật ngược.",combine:"Thuộc tam hợp Tuế Phá–Tang Môn–Điếu Khách; Thiên Mã được bố trí ở phe này như nguồn nghị lực để chống thế chính. Thành bại tùy Mã có thực sự thuộc quyền sử dụng của Mệnh hay không."},
  "Tang Môn":{role:"Bất mãn nhưng nặng lo toan, tính toán.",combine:"Cùng Tuế Phá–Điếu Khách tạo phe đối kháng. Không nên luận Tang Môn đơn thuần là tang tóc; trong Thiên Lương, trọng tâm là trạng thái tâm thế và nghị lực Thiên Mã đi kèm."},
  "Điếu Khách":{role:"Bất mãn, thường dùng lời lẽ để thuyết phục và phân trần.",combine:"Cùng Tuế Phá–Tang Môn và Thiên Mã. Khi Mã đắc dụng, Điếu Khách có thể biểu hiện khả năng thuyết phục, vận động và hành động ngoài xã hội."},
  "Trực Phù":{role:"Vị trí sinh xuất, dễ hữu công vô lao hoặc phải chịu thiệt.",combine:"Thuộc tam hợp Trực Phù–Thiếu Âm–Long Đức. Thiên Lương xem đây là thế thua thiệt; phương án tốt thường là tiết chế tranh hơn thua, trọng Long Đức hơn ham lộc nhất thời."},
  "Thiếu Âm":{role:"Vị trí sinh xuất, dễ lầm lẫn hoặc tin người.",combine:"Phải xem cùng Trực Phù–Long Đức. Không dùng ‘thông minh’ theo nghĩa phổ thông để phủ nhận nguyên lý sinh xuất của vòng Thái Tuế."},
  "Long Đức":{role:"Trong thế sinh xuất, là con đường tự an ủi, giữ đức và giảm bon chen.",combine:"Thiên Lương coi Long Đức là lựa chọn ổn hơn trong tam hợp thua thiệt Trực Phù–Thiếu Âm–Long Đức; giá trị nằm ở thái độ xử thế hơn là một ‘cát tinh’ tự động ban may."},
  "Tràng Sinh":{role:"Vòng tổng hợp Nạp Âm, được xem như hình bóng hợp nhất của Thái Tuế và Lộc Tồn.",combine:"Sao Tràng Sinh tại Mệnh là trọng điểm; toàn vòng diễn tả chuỗi thời gian từ khôn lớn đến tái sinh. Thiên Lương chủ trương xét hành của Mệnh với hành cung và chính sao Tràng Sinh tại đó, không dùng tam hợp của vòng một cách máy móc."},
  "Thiên Mã":{role:"‘Viên ngọc quý’ dành cho phe bất mãn, biểu thị nghị lực và động lực hành động.",combine:"Mã ở Dần thuộc người Mệnh Mộc; Tỵ thuộc Hỏa; Thân thuộc Kim; Hợi thuộc Thủy/Thổ. Mã gặp Triệt thành ‘Mã què’; gặp Tuần có các thế đặc dụng riêng và thường phải chùng một bước trước khi thành. Mã phải xét theo hành Mệnh, không chỉ vị trí đắc/hãm."},
  "Địa Không":{role:"Một nửa Không–Kiếp, quân đoàn sát tinh dữ nhất.",combine:"Không–Kiếp cần Phá Quân làm cấp chỉ huy mới phát huy đúng bộ; gặp Tham Lang hoặc Thất Sát không hiệu nghiệm bằng. Tốt/xấu của Không–Kiếp phải xét cấp chỉ huy, đắc/hãm và vận hạn, không kết luận chỉ từ sự hiện diện."},
  "Địa Kiếp":{role:"Một nửa Không–Kiếp, tính bộc phát và phá hoại mạnh.",combine:"Cùng Địa Không thuộc quân đoàn do Phá Quân cai trị đắc lực. Khi Phá Quân gặp hạn Không–Kiếp, mức biến động có thể rất lớn; phải xét cả Bộ Tư lệnh và quân đoàn đắc/hãm."},
  "Kình Dương":{role:"Một nửa Kình–Đà, sát tinh cần cấp chỉ huy đúng.",combine:"Kình–Đà hợp Thất Sát nhất; Phá Quân có thể thay Thất Sát điều động. Theo cách an Thiên Lương, Kình luôn đồng cung Lực Sĩ và vị trí đổi theo thuận/nghịch Dương Nam–Âm Nữ / Âm Nam–Dương Nữ."},
  "Đà La":{role:"Một nửa Kình–Đà, sát tinh thiên về lực cản và va chạm.",combine:"Hợp với Thất Sát hơn các bộ sát khác; Phá Quân có thể điều động. Thiên Lương còn quy định chỉ khi Đà La ở Thìn hoặc Tuất mới coi là có La–Võng."},
  "Hỏa Tinh":{role:"Thuộc Hỏa–Linh, quân đoàn sát tinh có tính bộc phát.",combine:"Hỏa–Linh là bộ hợp Tham Lang. Dùng với Sát/Phá chỉ là vá víu và hiệu quả không bằng đúng cấp chỉ huy. Việc an Hỏa–Linh trong hệ Thiên Lương phải theo giờ sinh và chiều thuận/nghịch."},
  "Linh Tinh":{role:"Thuộc Hỏa–Linh, sát tinh cần Tham Lang làm cấp chỉ huy.",combine:"Linh–Hỏa đi với Tham Lang mới đắc dụng rõ. Thiên Lương sửa cách an Linh Tinh theo giờ sinh để bảo đảm cấu trúc âm dương, không dùng vị trí cố định như một số sách cũ."},
  "Hồng Loan":{role:"Ở Dần–Thân–Tỵ–Hợi là chủ vị, thiên về trọng đức và ‘sắc sắc không không’.",combine:"Tại bốn góc, Hồng Loan làm chủ còn Thiên Không là khách, biểu hiện giác quan bén nhạy, từ tâm, bớt tham sân si. Đây là lớp cao nhất của bộ Hồng–Đào–Không khi đức thắng dục."},
  "Đào Hoa":{role:"Ở Tý–Ngọ–Mão–Dậu là chủ vị, thiên về mưu trí và sức hấp dẫn.",combine:"Khi Đào làm chủ, Hồng–Không thành phụ tá; nếu thiếu đức dễ thành mưu sĩ quỷ quyệt, ‘đạo đức giả hiệu’. Không luận Đào Hoa chỉ là tình ái; trọng tâm là vị trí và quyền chủ trong bộ ba."},
  "Thiên Không":{role:"Sao ‘Không’ phải luận theo địa bàn và ai làm chủ trong bộ Hồng–Đào–Không.",combine:"Dần–Thân–Tỵ–Hợi: phụ thuộc Hồng Loan; Tý–Ngọ–Mão–Dậu: Đào Hoa làm chủ; Thìn–Tuất–Sửu–Mùi: Thiên Không gần như độc quyền, dễ tác hại mạnh. Kết luận phải phân ba nhóm vị trí này trước."},
  "Lưu Hà":{role:"Sát tinh hành Thủy, luôn ở nghịch địa âm dương theo Can.",combine:"Cùng Kiếp Sát hành Hỏa tạo ‘hai lưỡi kéo’, thường phối với Thiên Không trong cơ chế thừa trừ. Sáu kho Lộc Tồn Bính–Đinh–Mậu–Kỷ–Nhâm–Quý đặc biệt phải dè bộ Hà–Sát canh giữ."},
  "Kiếp Sát":{role:"Sát tinh hành Hỏa, an theo Chi và cũng ở nghịch địa âm dương.",combine:"Cùng Lưu Hà thành bộ Hà–Sát, được Thiên Lương ví như hai lưỡi kéo thi hành hậu quả sau Thiên Không. Không dùng riêng Kiếp Sát để phán tai họa nếu toàn cấu trúc không xác nhận."},
  "Phá Toái":{role:"Hao tán tinh Hỏa đới Kim, chỉ đóng Tỵ–Dậu–Sửu.",combine:"Không phò chính diệu hiền hậu mà tăng sức cho Sát–Phá–Tham, đặc biệt Phá Quân. Các thế Vũ–Phá, Liêm–Phá, Tử–Phá phải xét tuổi để biết ‘Toái quân lưỡng Phá’ có thực sự đắc dụng."},
  "Cô Thần":{role:"Không được phép hiểu mặc định là cô độc, khắc nghiệt.",combine:"Cô–Quả không bao giờ ở tam hợp Thái Tuế; nhưng với tuổi Thìn–Tuất–Sửu–Mùi tại Dần–Thân–Tỵ–Hợi, Cô Thần có thể thành cởi mở, sáng suốt, chí công nhờ Thiếu Dương–Hồng Loan–Thiên Không. Vị trí Dần được đánh giá mở nhất."},
  "Quả Tú":{role:"Phải luận cùng Cô Thần và theo tuổi, không theo nghĩa cô quả cố định.",combine:"Cô–Quả thường tạo thế nghiệp ngã/thua thiệt, nhưng các trường hợp đặc biệt của tuổi Thìn–Tuất–Sửu–Mùi có thể chuyển nghĩa mạnh. Luôn xét vị trí trước khi dùng tên sao."},
  "Thiên Khốc":{role:"Cùng Thiên Hư là bại tinh, nhưng không phải vị trí nào cũng xấu như nhau.",combine:"Khốc–Hư có thể hãnh diện tại Tý–Ngọ–Mão–Dậu. Thiên Khốc thuận hơn cho tuổi Âm khi đứng trong tam hợp tuổi; Mão–Dậu có thể cho tiếng nói danh chính, biện thuyết mạnh."},
  "Thiên Hư":{role:"Thường đi sát Tuế Phá, diễn tả tâm thế ôm hận/bất mãn.",combine:"Ở Tý–Ngọ cùng Khốc và nhờ Thiên Mã có thể tạo thanh thế cho phe đối lập; thành hay bại phụ thuộc Mã có thực sự là nghị lực của đương số hay không."},
  "Hóa Kỵ":{role:"Một hung tinh đáng kể, nhưng lực tác động phụ thuộc hành Mệnh và vị trí.",combine:"Thiên Lương đặc biệt lưu ý người Bính–Đinh hoặc Mệnh Hỏa gặp Kỵ; giảm nhẹ khi Kỵ đắc địa ở Thìn–Tuất–Sửu–Mùi. Kỵ phải đọc trong cơ chế chế hóa, không coi là dấu xấu tuyệt đối."},
  "Thiên Hình":{role:"Hung tinh hành Hỏa, sức đàn áp mạnh với Giáp–Ất hoặc Mệnh Mộc.",combine:"Ngay Thiên Tướng cũng có thể bị Hình khuất phục. Hình đắc địa ở Dần–Mão–Dậu–Tuất làm mức nguy giảm; bộ Hình–Riêu–Không–Kiếp hãm dễ kéo đương số vào oan nghiệp hoặc tai nạn chung."},
  "Hóa Lộc":{role:"Lộc do công khó, tái tạo và lao động mà có.",combine:"Thiên Lương phân biệt rõ với Lộc Tồn là thiên lộc. Có Hóa Lộc không đồng nghĩa hưởng bền; phải xét vị trí Lộc Tồn, vòng Thái Tuế và cơ chế Hà–Sát/Thiên Không."},
  "Hóa Quyền":{role:"Tăng quyền động và lực hành động của cấu trúc.",combine:"Khoa–Quyền–Lộc chỉ như ‘gấm thêu hoa’; chân giá trị vẫn nằm ở Nhật–Nguyệt, Tả–Hữu, Thiên Mã và tư thế Mệnh–Thân. Quyền không cứu được một cấu trúc nền sai."},
  "Hóa Khoa":{role:"Lực văn minh, giải và điều hòa trong Tứ Hóa.",combine:"Khoa–Quyền–Lộc làm đẹp cách đã có, nhưng Thiên Lương không lấy Tam Hóa làm nền duy nhất. Khi phối với bộ đúng, Khoa giúp nâng tư cách và giảm mặt hung, nhưng vẫn dưới các nguyên tắc vị trí và vận."},
  "Long Trì":{role:"Cùng Phượng Các, Bạch Hổ, Hoa Cái tạo Long–Phượng–Hổ–Cái.",combine:"Bộ này gắn với nhân phẩm chính phái, vinh dự và hưng vượng; đặc biệt thường nâng tam hợp Thái Tuế–Quan Phù–Bạch Hổ. Không nên dùng Long Trì một mình như cát tinh tự động."},
  "Phượng Các":{role:"Một thành phần của Long–Phượng–Hổ–Cái.",combine:"Giá trị chính là khi hội thành bộ, biểu thị nhân phẩm, danh dự và sự chính phái; cần xét có thực sự nằm trong thế tam hợp tuổi hay không."},
  "Hoa Cái":{role:"Một thành phần của Long–Phượng–Hổ–Cái.",combine:"Trong hệ Thiên Lương, bộ đủ/khá đủ thường xuất hiện ở tam hợp Thái Tuế và góp phần tạo vinh dự, hưng vượng. Hoa Cái tách riêng không đủ để phán quý cách."},
  "Thai Phụ":{role:"Cùng Phong Cáo tạo Thai–Cáo, lớp phụ tá về danh vị/hình thức.",combine:"Thai–Cáo là bộ trợ quan trọng cho Sát–Phá–Liêm–Tham; giúp bộ thực hành có tư cách hiệu lệnh, danh vị và tổ chức, nhưng vẫn cần đúng cấp chỉ huy sát tinh."},
  "Phong Cáo":{role:"Đi đôi với Thai Phụ thành Thai–Cáo.",combine:"Là bộ trợ cho Sát–Phá–Liêm–Tham, không phải một dấu công danh độc lập. Phải xét nó có đứng trong cấu trúc thực hành hay chỉ là phụ tinh rời rạc."}
});
function tlHelpKicker(base){
  const g=TL_STAR_GROUP[base];
  return g?`Hệ Thiên Lương • ${g}`:"Hệ Thiên Lương • nghiệm lý vị trí và phối hợp";
}
function tlHelpRole(base){
  return TL_STAR_DETAIL[base]?.role||"";
}
function tlHelpCombine(base){
  return TL_STAR_DETAIL[base]?.combine||"";
}
function tlHelpPosition(base){
  return TL_MAJOR_POSITIONS[base]||"";
}

const STAR_HELP_STATUS=Object.freeze({
  "M":"Miếu địa","V":"Vượng địa","Đ":"Đắc địa","B":"Bình hòa","H":"Hãm địa"
});
const STAR_HELP_ELEMENT=Object.freeze({
  "K":"Kim","M":"Mộc","T":"Thủy","H":"Hỏa","O":"Thổ"
});

/* V3.3.78 — Ý NGHĨA RIÊNG CỦA SAO LƯU THEO KHUNG NGHIỆM LÝ THIÊN LƯƠNG.
   Sao lưu là lớp động của năm xem: dùng để định thời, làm nổi chủ đề của cung và
   gia giảm cường độ của cấu trúc gốc. Không thay thế chính tinh, Mệnh–Thân, ba vòng
   Thái Tuế–Lộc Tồn–Tràng Sinh hay đại/tiểu hạn. */
const TL_ANNUAL_STAR_MEANING=Object.freeze({
  "Thái Tuế":"Lưu Thái Tuế đánh dấu điểm thời sự nổi bật của năm: việc chính danh, trách nhiệm, tranh luận và đối diện hoàn cảnh dễ lộ rõ tại cung nó đi qua. Tốt hay xấu phải xét tam hợp Thái Tuế của năm, cung hạn và sao gốc đang bị kích hoạt.",
  "Tang Môn":"Lưu Tang Môn làm nổi phần bất mãn, lo toan, gánh việc và cảm giác nặng lòng trong năm. Khi hội thêm sát, Kỵ hoặc cung hạn yếu thì mặt hao tổn, phiền muộn và trở ngại dễ rõ hơn.",
  "Bạch Hổ":"Lưu Bạch Hổ tăng tính quyết liệt, chịu đựng và phản ứng mạnh của năm; đồng thời là tín hiệu cần dè chừng va chạm, bệnh/tang hoặc sự cố khi toàn bộ cung hạn cùng xấu. Không kết luận chỉ từ một Bạch Hổ lưu.",
  "Thiên Khốc":"Lưu Thiên Khốc làm nổi tâm trạng bất mãn, tiếng than, lời biện giải và những việc khiến đương số phải suy nghĩ nhiều. Khi đi đúng thế Khốc–Hư của phe đối kháng, cần xét thêm Thiên Mã và cung hạn để biết có chuyển thành động lực hay thành bế tắc.",
  "Thiên Hư":"Lưu Thiên Hư làm rõ phần hụt hẫng, bất mãn và những việc không như ý trong năm. Giá trị của nó tăng khi hội Tuế Phá, Khốc hoặc sát tinh; nếu có lực cứu giải và Thiên Mã đắc dụng thì chỉ nên hiểu là một giai đoạn phải xoay xở nhiều.",
  "Lộc Tồn":"Lưu Lộc Tồn là lớp thiên lộc theo Can của năm xem, báo cơ hội ổn định, giữ gìn hoặc được hưởng vật chất trong thời gian đó. Hưởng được bao nhiêu còn tùy vị trí hạn, tam hợp tuổi, Thiên Không–Hà–Sát và cách đương số sử dụng lộc, vì Thiên Lương không coi Lộc Tồn là quyền lợi vô điều kiện.",
  "Kình Dương":"Lưu Kình Dương đưa lực sát và tính quyết liệt của Kình vào năm xem. Tác động mạnh hay nhẹ phải xét đúng cách an thuận/nghịch, cung hạn và cấp chỉ huy của bộ sát; trong hệ Thiên Lương, Kình–Đà hợp với Thất Sát hơn các sát bộ khác.",
  "Đà La":"Lưu Đà La đưa lực Kình–Đà vào thời điểm năm xem, làm tăng tính cản trở, áp lực hoặc va chạm khi gặp cấu trúc xấu. Cần xét cùng Thất Sát/Phá Quân, hành của cung và Tuần–Triệt; không dùng một Đà La lưu để phán tai họa.",
  "Thiên Mã":"Lưu Thiên Mã kích hoạt di chuyển, thay đổi, công việc phải chạy và nghị lực hành động trong năm. Theo Thiên Lương, Mã chỉ thật sự đắc dụng khi hợp hành địa bàn và Mệnh; gặp Tuần–Triệt còn phải xét quy tắc Mã chùng, Mã què hay Mã được mở.",
  "Hồng Loan":"Lưu Hồng Loan làm nổi duyên, cảm xúc, thiện ý và các việc vui/giao tế trong năm. Ở cách Thiên Lương phải xét vị trí của bộ Hồng–Đào–Thiên Không: Hồng ở thế làm chủ thiên về từ tâm và tỉnh thức hơn là chỉ hiểu đơn giản là tình duyên.",
  "Thiên Hỷ":"Lưu Thiên Hỷ tăng tín hiệu vui, hòa hợp, gặp gỡ, hỷ sự hoặc tin mừng trong năm. Đây là trợ tinh, chỉ có giá trị rõ khi cung hạn và các bộ Hồng–Đào, đức tinh hoặc chính tinh cùng ủng hộ.",
  "Thiên Khôi":"Lưu Thiên Khôi là quý trợ theo Can năm xem, làm nổi cơ hội được nâng đỡ, mở đường về học hành, danh vị hoặc người trợ giúp. Hiệu lực là lớp thời điểm, cần đặt dưới chính tinh và thế hạn.",
  "Thiên Việt":"Lưu Thiên Việt là quý trợ của năm, thường dùng để nhận diện lúc có người nâng đỡ, cơ hội danh vị hoặc sự hỗ trợ tinh thần. Không đủ sức tự đảo một cung hạn xấu nếu các trục chính không thuận.",
  "Thiên Quan":"Lưu Thiên Quan tăng phần quý nhân, đức độ và cơ hội được cứu giải trong năm. Theo phương pháp Thiên Lương, đây là sao phụ trợ, dùng để gia giảm mức độ sau khi đã xác định thế chính của hạn.",
  "Thiên Phúc":"Lưu Thiên Phúc làm nổi nền phúc, sự giúp đỡ và khả năng giảm nhẹ khó khăn trong năm. Tác dụng mạnh hơn khi hội các đức tinh và cung hạn vốn có nền tốt.",
  "Phá Toái":"Lưu Phá Toái báo thời điểm tính phá ngang, hao tán hoặc sự việc bị bẻ gãy dễ nổi lên. Trong hệ Thiên Lương, phải đặc biệt lưu ý khi nó nhập vào thế có Phá Quân hoặc cả bộ Sát–Phá–Liêm–Tham.",
  "Hoa Cái":"Lưu Hoa Cái làm nổi danh dự, uy nghi, hình thức, chức vị hoặc nhu cầu khẳng định vị thế trong năm. Giá trị đẹp rõ hơn khi hội Long–Phượng–Hổ–Cái và cung hạn chính danh.",
  "Kiếp Sát":"Lưu Kiếp Sát đưa sát lực của Kiếp Sát vào năm xem, dùng như tín hiệu cảnh báo khi hội Lưu Hà, Thiên Không hoặc các sát bộ khác. Chỉ nên nâng mức cảnh báo khi cung hạn và sao gốc cùng bất lợi.",
  "Đào Hoa":"Lưu Đào Hoa kích hoạt giao tế, sức hút, tình cảm và mưu tính trong năm. Thiên Lương phân biệt rõ Đào với Hồng: Đào ở Tý–Ngọ–Mão–Dậu thiên về mưu sĩ; gặp Thiên Không phải xét đạo đức và toàn bộ thế sao để biết đẹp hay biến thành rắc rối.",
  "Nguyệt Đức":"Lưu Nguyệt Đức tăng khả năng hòa giải, mềm hóa và gặp thiện duyên trong năm. Đây là đức tinh phụ, có thể giảm nhẹ chứ không xóa bỏ cấu trúc xấu của hạn.",
  "Thiên Đức":"Lưu Thiên Đức tăng phần nhân hậu, chính trực và cứu giải theo thời điểm năm xem. Khi đi với Long Đức, Phúc Đức hoặc Nguyệt Đức thì nền đức của cung hạn rõ hơn.",
  "Lưu Hà":"Lưu Lưu Hà là sát lực theo Can năm xem; khi hội Kiếp Sát và Thiên Không cần nâng mức cảnh báo về sự cố, tổn thất hoặc hệ quả thừa trừ. Không diễn giải nặng nếu bộ sát không hội đủ và cung hạn vẫn vững.",
  "Thiên Trù":"Lưu Thiên Trù làm nổi lộc hưởng, ăn uống, điều kiện vật chất và sự được chăm sóc trong năm. Trong cách phần mềm đang dùng theo hệ Thiên Lương, nó thuộc lớp Tứ Lộc mở rộng nên phải xét cùng Lộc Tồn và Hóa Lộc.",
  "Hóa Lộc":"Lưu Hóa Lộc là lộc phát sinh do Can năm xem kích hoạt sao chủ gốc, biểu thị cơ hội tạo tài, thu hoạch hoặc mở nguồn trong năm. Thiên Lương phân biệt với Lộc Tồn: Hóa Lộc thiên về phần do công việc và vận hội tạo ra, nên có thể tăng nhanh nhưng cũng dễ suy khi vận rã hoặc gặp phá cách.",
  "Hóa Quyền":"Lưu Hóa Quyền kích hoạt quyền động, trách nhiệm, quyết định và vị thế trong năm. Quyền có thể giúp sự việc tiến nhanh khi vận thuận, nhưng Thiên Lương cảnh báo quyền lực thiếu Khoa cân bằng dễ sinh tự ái, chủ quan và làm Lộc thất thoát.",
  "Hóa Khoa":"Lưu Hóa Khoa là lớp hóa giải, học vấn, danh nghĩa và sự điều hòa của năm xem. Nó thường làm dịu sát lực hoặc giúp sự việc có đường giải, nhưng vẫn chỉ là yếu tố gia giảm, không phủ định cấu trúc hạn bất lợi.",
  "Hóa Kỵ":"Lưu Hóa Kỵ làm lộ vướng mắc, thị phi, nhầm lẫn, tâm lý nặng hoặc điểm nghẽn của năm tại sao/cung nó kích hoạt. Cần xét hành Mệnh, vị trí đắc/hãm và các thế chế hóa; Kỵ lưu chủ yếu cho biết nơi vấn đề nổi lên chứ không tự nó quyết định kết quả."
});
/* V3.3.105 — LỚP LUẬN SAO LƯU THEO CUNG NHẬP HẠN.
   Nguyên tắc: sao lưu không tự tạo một "lá số mới" mà kích hoạt chủ đề của ô nó đi qua.
   Cung gốc trả lời "việc gì/lĩnh vực nào"; tính chất sao lưu trả lời "việc đó động theo hướng nào";
   ĐH/LĐH/Tiểu Hạn và các bộ sao gốc dùng để xác nhận cường độ, diễn biến và kết quả gần. */
const TL_ANNUAL_HOUSE_FOCUS=Object.freeze({
  "Mệnh":{
    topic:"bản thân, tâm thế, hình ảnh cá nhân, cách hành động và những quyết định trực tiếp của đương số",
    watch:"thay đổi thái độ, mục tiêu, vai trò cá nhân, cách tự quyết và các việc tác động trực tiếp đến chính mình"
  },
  "Phụ Mẫu":{
    topic:"cha mẹ, bậc trên, người bảo trợ, quan hệ với cấp trên và nền hỗ trợ trực hệ",
    watch:"việc của cha mẹ/bậc trên, sự nâng đỡ hay áp lực từ người có thẩm quyền, quan hệ cấp trên và các trách nhiệm với gia đình trực hệ"
  },
  "Phúc Đức":{
    topic:"nền phúc, họ tộc, hậu phương, đời sống tinh thần, mức an tâm và khả năng hưởng thụ",
    watch:"chuyện họ hàng, hậu phương gia đình, trạng thái tinh thần, niềm tin, nghỉ ngơi và mức độ yên ổn bên trong"
  },
  "Điền Trạch":{
    topic:"nhà cửa, nơi ở, bất động sản, môi trường cư trú và tài sản mang tính nền tảng lâu dài",
    watch:"mua bán/sửa chữa/chuyển chỗ ở, biến động nhà đất, điều kiện sinh hoạt và các khoản gắn với tài sản cố định"
  },
  "Quan Lộc":{
    topic:"nghề nghiệp, công việc, chức trách, vị thế, thành tích và con đường phát triển sự nghiệp",
    watch:"thay đổi công việc, giao nhiệm vụ, thăng/giảm trách nhiệm, dự án, danh vị, đánh giá năng lực và quan hệ trong môi trường nghề nghiệp"
  },
  "Nô Bộc":{
    topic:"bạn bè, đồng nghiệp, cấp dưới, cộng sự, khách hàng và mạng lưới quan hệ hỗ trợ hoặc gây nhiễu",
    watch:"hợp tác, nhân sự, bạn bè/cộng sự, khách hàng, người giúp việc và những vấn đề phát sinh từ quan hệ ngang hàng hoặc cấp dưới"
  },
  "Thiên Di":{
    topic:"môi trường bên ngoài, đi lại, giao tiếp xã hội, xuất hành, thay đổi địa bàn và cách xã hội phản hồi với mình",
    watch:"đi xa, đổi môi trường, gặp gỡ bên ngoài, công tác, giao dịch, đối ngoại và các việc xảy ra khi rời phạm vi quen thuộc"
  },
  "Tật Ách":{
    topic:"sức khỏe, thể trạng, áp lực thân–tâm, điểm yếu cần chăm sóc và các sự cố ảnh hưởng tới khả năng hoạt động",
    watch:"tín hiệu sức khỏe, mệt mỏi, điều trị/chăm sóc, áp lực tâm lý, va chạm hoặc những yếu tố làm giảm thể lực; chỉ dùng như chỉ báo tử vi, không thay cho đánh giá y khoa"
  },
  "Tài Bạch":{
    topic:"thu nhập, chi tiêu, dòng tiền, tài sản lưu động, cách kiếm tiền và cách quản lý nguồn lực",
    watch:"nguồn thu, khoản chi, tiền về/ra, đầu tư, hợp đồng tài chính, khả năng giữ tiền và các quyết định sử dụng nguồn lực"
  },
  "Tử Tức":{
    topic:"con cái, mối quan hệ với con, việc nuôi dưỡng và theo nghĩa mở rộng là sản phẩm/dự án do mình tạo ra",
    watch:"việc của con cái, trách nhiệm nuôi dạy, kế hoạch gia đình và các dự án/sản phẩm cần được vun bồi; không suy đoán sinh sản chỉ từ một sao lưu"
  },
  "Phu Thê":{
    topic:"hôn nhân, người phối ngẫu, quan hệ gắn bó lâu dài và các quan hệ một–một có tính cam kết",
    watch:"tương tác với người phối ngẫu/đối tác, thỏa thuận, xung đột hay hòa hợp, quyết định chung và mức độ gắn kết trong năm"
  },
  "Huynh Đệ":{
    topic:"anh chị em, người cùng thế hệ gần gũi, cộng sự thân cận và quan hệ ngang hàng trong phạm vi gia đình",
    watch:"việc của anh chị em, hỗ trợ hoặc bất đồng giữa người ngang hàng, chia sẻ trách nhiệm và nguồn lực trong nhóm thân cận"
  }
});

/* Cách an được mô tả theo đúng engine hiện hành để popup vừa là phần luận vừa là phần tra cứu. */
const TL_ANNUAL_STAR_PLACEMENT=Object.freeze({
  "Thái Tuế":"An theo Địa Chi của năm xem; Lưu Thái Tuế đóng ngay tại địa bàn mang Chi năm đó.",
  "Tang Môn":"An theo vị trí tương đối với Lưu Thái Tuế của năm; theo quy tắc đang áp dụng trong chương trình, Lưu Tang Môn cách Thái Tuế 2 địa chi theo chiều thuận.",
  "Bạch Hổ":"An theo vòng lưu niên từ Địa Chi năm; theo quy tắc đang áp dụng trong chương trình, Lưu Bạch Hổ cách Thái Tuế 8 địa chi.",
  "Thiên Khốc":"An theo Địa Chi năm, lấy Ngọ làm mốc Tý rồi đếm nghịch đến Chi năm xem.",
  "Thiên Hư":"An theo Địa Chi năm, lấy Ngọ làm mốc Tý rồi đếm thuận đến Chi năm xem.",
  "Lộc Tồn":"An theo Thiên Can của năm xem. Vị trí Lưu Lộc Tồn thay đổi theo Can năm và là mốc quan trọng để đọc lộc của lưu niên.",
  "Kình Dương":"An theo Thiên Can năm và quy tắc Kình–Đà đang chọn trong chương trình. Ở hệ Thiên Lương, chiều an còn xét âm dương và giới tính theo thiết lập hiện hành của chương trình.",
  "Đà La":"An cùng cơ chế với Lưu Kình Dương theo Can năm và trường phái Kình–Đà đang chọn; phải đọc Kình–Đà thành bộ, không tách rời máy móc.",
  "Thiên Mã":"An theo Địa Chi năm, lấy vị trí Mã của tam hợp Chi năm. Khi luận tiếp tục xét hành địa bàn, hành Mệnh và Tuần–Triệt theo hệ Thiên Lương.",
  "Hồng Loan":"An theo Địa Chi của năm xem; là một điểm động của bộ Hồng–Đào–Thiên Không trong lưu niên.",
  "Thiên Hỷ":"An đối xứng với Lưu Hồng Loan theo quy tắc hiện hành của chương trình, dùng như lớp hỷ khí và giao tế phụ trợ của năm.",
  "Thiên Khôi":"An theo Thiên Can năm xem; thuộc lớp quý trợ lưu niên.",
  "Thiên Việt":"An theo Thiên Can năm xem và phối thành cặp Khôi–Việt của năm.",
  "Thiên Quan":"An theo Thiên Can năm xem; dùng như lớp quý nhân/đức trợ của lưu niên.",
  "Thiên Phúc":"An theo Thiên Can năm xem; phối với Thiên Quan và các đức tinh để gia giảm khả năng cứu giải.",
  "Phá Toái":"An theo Địa Chi năm xem; vị trí thuộc nhóm Tỵ–Dậu–Sửu theo quy tắc Phá Toái đang áp dụng trong chương trình.",
  "Hoa Cái":"An từ vị trí Lưu Thiên Mã của năm theo quan hệ cố định đang áp dụng trong chương trình; dùng để nhận diện lớp danh dự, hình thức và vị thế.",
  "Kiếp Sát":"An từ vị trí Lưu Thiên Mã của năm theo quan hệ cố định đang áp dụng trong chương trình; khi luận cần đặc biệt xét hội Lưu Hà/Thiên Không và sát bộ.",
  "Đào Hoa":"An từ vị trí Lưu Thiên Mã của năm theo quan hệ cố định đang áp dụng trong chương trình; là lớp giao tế, sức hút và mưu tính của lưu niên.",
  "Nguyệt Đức":"An theo Địa Chi năm xem; là đức tinh dùng để gia giảm mức căng của sự việc.",
  "Thiên Đức":"An theo Địa Chi năm xem; phối với các đức tinh khác để đánh giá khả năng mềm hóa/cứu giải.",
  "Lưu Hà":"An theo Thiên Can năm xem; thuộc lớp sát lực cần đọc cùng Kiếp Sát, Thiên Không và cấu trúc gốc.",
  "Thiên Trù":"An theo Thiên Can năm xem; trong hệ quy tắc Thiên Lương đang áp dụng, Thiên Trù được xếp vào lớp lộc hưởng mở rộng của năm.",
  "Hóa Lộc":"Lưu Tứ Hóa an theo Thiên Can năm xem: Can năm xác định sao chủ Hóa Lộc, rồi Hóa Lộc lưu nhập đúng cung đang chứa sao chủ đó trên lá số gốc.",
  "Hóa Quyền":"Lưu Tứ Hóa an theo Thiên Can năm xem: Can năm xác định sao chủ Hóa Quyền, rồi Lưu Hóa Quyền nhập cung chứa sao chủ trên lá số gốc.",
  "Hóa Khoa":"Lưu Tứ Hóa an theo Thiên Can năm xem: Can năm xác định sao chủ Hóa Khoa, rồi Lưu Hóa Khoa nhập cung chứa sao chủ trên lá số gốc.",
  "Hóa Kỵ":"Lưu Tứ Hóa an theo Thiên Can năm xem: Can năm xác định sao chủ Hóa Kỵ, rồi Lưu Hóa Kỵ nhập cung chứa sao chủ trên lá số gốc."
});

/* "Động từ" của từng sao khi chiếu vào chủ đề của một cung.
   Viết theo hướng kích hoạt/gia giảm, tránh biến sao lưu thành phán quyết tuyệt đối. */
const TL_ANNUAL_STAR_TRIGGER=Object.freeze({
  "Thái Tuế":"Các việc của cung này dễ trở thành điểm thời sự: phải đối diện, trình bày, quyết định, tranh luận, chịu trách nhiệm hoặc xử lý việc có tính chính danh/công khai.",
  "Tang Môn":"Các việc của cung này dễ kéo theo lo toan, gánh trách nhiệm, cảm giác nặng lòng hoặc phải xử lý phần việc tồn đọng; nếu thêm sát/Kỵ thì mức phiền nhiễu mới tăng rõ.",
  "Bạch Hổ":"Lĩnh vực của cung có xu hướng căng, quyết liệt và cần sức chịu đựng; chỉ nâng thành cảnh báo va chạm, bệnh/sự cố hay tang khi các lớp hạn và bộ sao khác cùng xác nhận.",
  "Thiên Khốc":"Lĩnh vực của cung dễ khiến đương số phải suy nghĩ, than phiền, biện giải hoặc lên tiếng; nếu có Mã đắc dụng có thể chuyển phần bất mãn thành động lực hành động.",
  "Thiên Hư":"Lĩnh vực của cung dễ xuất hiện cảm giác hụt, chậm, không đúng kỳ vọng hoặc phải làm lại; cần xem cứu tinh và lực hành động để phân biệt thất vọng tạm thời với trở ngại thực chất.",
  "Lộc Tồn":"Lĩnh vực của cung dễ xuất hiện cơ hội giữ được, tích lũy, được hưởng hoặc nhận nguồn lực ổn định; cần xem cơ chế thừa–trừ và khả năng giữ lộc chứ không hiểu là lợi ích vô điều kiện.",
  "Kình Dương":"Lĩnh vực của cung bị đẩy lên theo hướng quyết liệt, cạnh tranh, áp lực hoặc va chạm; nếu nền cung mạnh có thể thành lực phá thế, nếu nền yếu thì dễ thành xung đột hay tổn hao.",
  "Đà La":"Lĩnh vực của cung dễ gặp lực cản, trì hoãn, mắc kẹt, việc phải kéo dài hoặc xử lý vòng vèo; mức hung chỉ tăng khi hội đúng sát bộ và cấu trúc hạn bất lợi.",
  "Thiên Mã":"Lĩnh vực của cung được kích hoạt bằng sự di chuyển, thay đổi, chạy việc, đổi môi trường hoặc tăng nhịp hành động; Mã tốt hay mệt còn tùy hành Mệnh, địa bàn và Tuần–Triệt.",
  "Hồng Loan":"Lĩnh vực của cung dễ phát sinh cảm xúc, thiện duyên, sự mềm hóa, giao tế hoặc việc vui; không mặc định quy tất cả về tình yêu mà phải đọc đúng chức năng của cung.",
  "Thiên Hỷ":"Lĩnh vực của cung có xu hướng xuất hiện tin vui, sự hòa hợp, gặp gỡ hoặc không khí thuận lòng hơn; đây là trợ lực nên cần nền cung và chính tinh ủng hộ để thành việc rõ.",
  "Thiên Khôi":"Lĩnh vực của cung dễ có người mở đường, cơ hội được chú ý, học hỏi, nâng đỡ hoặc gặp đầu mối hữu ích; quý trợ giúp cơ hội dễ mở hơn chứ không thay thế năng lực nền.",
  "Thiên Việt":"Lĩnh vực của cung dễ nhận hỗ trợ, giới thiệu, chỉ dẫn hoặc một cơ hội nhờ người/hoàn cảnh thuận; tác dụng mạnh hơn khi đi cùng cấu trúc cát của hạn.",
  "Thiên Quan":"Lĩnh vực của cung có thêm khả năng được giúp, được thông cảm, gặp người có thiện ý hoặc có đường giải; dùng để giảm mức căng chứ không xóa nguyên nhân xấu.",
  "Thiên Phúc":"Lĩnh vực của cung được tăng phần phúc trợ, hậu thuẫn và khả năng giảm nhẹ khó khăn; hiệu lực rõ hơn khi nền Phúc và các đức tinh cùng tốt.",
  "Phá Toái":"Lĩnh vực của cung dễ có việc bị bẻ ngang, thay đổi đột ngột, hao tán, hỏng kế hoạch hoặc phải tháo ra làm lại; cần dè hơn khi hội Phá Quân/Sát–Phá–Liêm–Tham.",
  "Hoa Cái":"Lĩnh vực của cung dễ gắn với danh dự, hình thức, vị thế, nhu cầu được công nhận hoặc chuyện lễ nghi/chính danh; đẹp hơn khi hội đủ bộ trợ danh và nền cung sáng.",
  "Kiếp Sát":"Lĩnh vực của cung nhận thêm sát lực, dễ có sự cố nhanh, tổn thất hoặc hậu quả mạnh nếu đồng thời hội Lưu Hà, Thiên Không và nền hạn yếu; không dùng riêng sao này để kết luận tai họa.",
  "Đào Hoa":"Lĩnh vực của cung tăng giao tiếp, sức hút, kết nối, mưu tính và nhu cầu tương tác; tốt/xấu tùy đạo đức, vai trò chủ–khách của bộ Hồng–Đào–Không và chức năng cụ thể của cung.",
  "Nguyệt Đức":"Lĩnh vực của cung dễ có cơ hội hòa giải, mềm hóa, gặp thiện duyên hoặc giảm căng; đây là đức trợ nên chỉ gia giảm chứ không phủ nhận cấu trúc chính.",
  "Thiên Đức":"Lĩnh vực của cung được tăng khả năng xử lý bằng thiện ý, chính trực, nhường nhịn hoặc gặp đường cứu giải; tác dụng rõ hơn khi hội nhiều đức tinh.",
  "Lưu Hà":"Lĩnh vực của cung cần dè các tình huống trôi tuột, thất thoát, sự cố hoặc hậu quả phát sinh nhanh; chỉ nâng cảnh báo khi Hà–Sát/Thiên Không và các lớp hạn cùng hội đủ.",
  "Thiên Trù":"Lĩnh vực của cung dễ có lộc hưởng, điều kiện vật chất, ăn uống, chăm sóc hoặc nguồn tiện nghi đi vào; hưởng bền hay không phải xét Lộc Tồn, Hóa Lộc và nền cung.",
  "Hóa Lộc":"Lĩnh vực của cung dễ mở ra cơ hội tạo lợi ích, tăng nguồn lực, thu hoạch hoặc có việc mang lại giá trị; vì là lộc do vận/công việc kích hoạt nên cần xem khả năng giữ và chuyển lộc thành kết quả bền.",
  "Hóa Quyền":"Lĩnh vực của cung bị đẩy mạnh về quyền chủ động, trách nhiệm, quyết định, ảnh hưởng và sức hành động; thuận thì dễ nắm việc, nghịch thì dễ thành áp lực, tự ái hoặc tranh quyền.",
  "Hóa Khoa":"Lĩnh vực của cung được tăng tính minh bạch, học hỏi, danh nghĩa, giải pháp và khả năng điều hòa; thường là nơi dễ tìm cách xử lý hợp lý hơn nhưng không tự xóa một cấu trúc hạn xấu.",
  "Hóa Kỵ":"Lĩnh vực của cung dễ lộ điểm nghẽn, hiểu lầm, thị phi, ám ảnh, sai sót hoặc việc phải quay lại xử lý; Kỵ lưu chủ yếu chỉ nơi vấn đề nổi lên, mức nặng nhẹ phải do toàn bộ hạn xác nhận."
});

function tlAnnualStarPlacement(base){
  return TL_ANNUAL_STAR_PLACEMENT[base]||"An theo quy tắc lưu niên của sao trong năm xem; vị trí thay đổi theo Can/Chi năm hoặc sao chủ được kích hoạt tùy từng nhóm sao.";
}
function tlAnnualHouseInfo(house){
  return TL_ANNUAL_HOUSE_FOCUS[house]||{
    topic:`các vấn đề thuộc cung ${house||"đang xét"}`,
    watch:"những sự kiện thực tế phát sinh đúng chức năng của cung, sau đó kiểm tra lại bằng Đại Hạn, Lưu Đại Hạn, Tiểu Hạn và bộ sao gốc"
  };
}
function tlAnnualStarTrigger(base){
  return TL_ANNUAL_STAR_TRIGGER[base]||"Sao lưu làm nổi chủ đề của cung trong năm và gia giảm cường độ của cấu trúc gốc; cần đọc theo tính chất thật của sao và toàn bộ hạn.";
}
function tlAnnualGroupLabel(group){
  if(group==="core")return "Bộ 9 lưu tinh cốt lõi";
  if(group==="tuhoa")return "Lưu Tứ Hóa";
  if(group==="extended")return "Lưu tinh mở rộng";
  return "Sao lưu";
}
function tlAnnualHouseReading(base,house,viewYear){
  const h=tlAnnualHouseInfo(house);
  const yearText=viewYear?`Năm ${viewYear}: `:"Trong năm xem: ";
  return `${yearText}${tlAnnualStarTrigger(base)} Trọng tâm kiểm chứng tại cung ${house||"đang xét"}: ${h.watch}.`;
}
function annualPalaceContext(target){
  const palace=target.closest(".palace");
  if(!palace)return {house:"",daiHouse:"",luuDaiHouse:"",branch:"",isDai:false,isLuuDai:false,isTieu:false};
  const house=palace.dataset.houseName||palace.querySelector(".house-title")?.textContent?.replace(/\s+/g," ").trim()||"";
  return {
    house,
    daiHouse:palace.dataset.daiHouse||"",
    luuDaiHouse:palace.dataset.luuDaiHouse||"",
    branch:palace.dataset.branch||"",
    isDai:palace.classList.contains("active-dai"),
    isLuuDai:palace.classList.contains("active-luu-dai"),
    isTieu:palace.classList.contains("active-tieu")
  };
}
function tlAnnualLimitOverlayText(ctx,viewYear){
  const parts=[];
  if(ctx.daiHouse&&ctx.daiHouse!=="—")parts.push(`ĐH.${ctx.daiHouse}`);
  if(ctx.luuDaiHouse&&ctx.luuDaiHouse!=="—")parts.push(`LĐH.${ctx.luuDaiHouse}`);
  const flags=[];
  if(ctx.isDai)flags.push("Đại Hạn");
  if(ctx.isLuuDai)flags.push("Lưu Đại Hạn");
  if(ctx.isTieu)flags.push("Tiểu Hạn");
  if(!parts.length&&!flags.length)return "";
  return `${parts.length?`Vai trò động: ${parts.join(" • ")}. `:""}${flags.length?`Ô này đồng thời là điểm ${flags.join(" + ")}. `:""}Đại Hạn = nền 10 năm; Lưu Đại Hạn = hướng diễn biến năm; Tiểu Hạn = biểu hiện gần.`;
}


/* V3.3.113 — TỪ ĐIỂN Ý NGHĨA SAO DO NGƯỜI DÙNG CHỐT.
   Mục “Ý nghĩa theo từ điển sao” ưu tiên bảng này; các lớp nghiệm lý Thiên Lương giữ độc lập. */
const STAR_POPUP_DICTIONARY=Object.freeze({"Ân Quang":"Chỉ sự nhân hậu, vui tươi, trong sáng, lành mạnh.","Bạch Hổ":"Là thực tế khó người dễ mình, dũng mãnh, oai quyền.","Bệnh Phù":"Chỉ sự buồn bã, chán chường.","Bệnh":"Chỉ sự suy nhược, yếu đuối.","Bác Sỹ":"Chỉ sự thông tuệ, am tường nhiều điều.","Bát Tọa":"Là dáng vẻ bệ vệ, đường hoàng.","Cô Thần":"Chỉ sự lạnh lùng, thái độ khó khăn.","Cự Môn":"Là lời ăn tiếng nói, khả năng tranh luận.","Dưỡng":"Là phù trợ, hỗ trợ.","Điếu Khách":"Chỉ sự khoe khoang, cường điệu ngôn ngữ trao đổi.","Đại Hao":"Là sự hao hụt, thâm thủng.","Đế Vượng":"Chỉ sự thịnh vượng, quyền lực.","Đà La":"Chỉ sự hung bạo, hiểm ác.","Đường Phù":"Là thêm điều ích lợi, phát triển.","Đào Hoa":"Chỉ tính lẳng lơ, đa tình.","Địa Giải":"Chỉ sự nhân hậu, đức độ.","Địa Kiếp":"Là bạo tàn, gian ác, thất bại.","Địa Không":"Là phá tán, bạo ngược, tai họa.","Đẩu Quân":"Chỉ sự nghiêm trang, bảo vệ nguyên tắc.","Địa Võng":"Chỉ sự kềm tỏa, vây hãm.","Giải Thần":"Chỉ sự giải cứu, giải phóng, thoát nạn.","Hỷ Thần":"Điều vui vẻ, sự may mắn.","Hồng Loan":"Đảm đang, tháo vát, lanh lợi.","Hóa Lộc":"Phát tài, thu hoạch tốt đẹp.","Hóa Quyền":"Chỉ sự thăng tiến công việc, thêm chức vụ.","Hóa Khoa":"Chỉ sự thông minh, lịch lãm và uyên bác.","Hóa Kỵ":"Chỉ sự ghen ghét, đố kị, bảo thủ cực đoan.","Hoa Cái":"Chỉ sự bề thế, đẹp vẻ uy nghi.","Hữu Bật":"Chỉ sự giúp đỡ, cứu giải.","Hỏa Tinh":"Chỉ sự đốt phá, tai ương họa nạn.","Kình Dương":"Sự liều lĩnh, tính sỗ sàng, hung bạo.","Kiếp Sát":"Tai họa, ách nạn, hung ác.","Long Đức":"Hòa nhã, đức độ, đoan trang.","Lộc Tồn":"Chỉ sự nghiêm túc, nề nếp.","Lực Sĩ":"Hàm nghĩa khỏe mạnh, mạnh dạn.","Lâm Quan":"Chỉ tính khoe khoang, thích phô trương.","Long Trì":"Chỉ sự ôn hòa, bình tĩnh, phong độ tự tại an nhiên, ung dung.","Lưu Hà":"Chỉ sự nham hiểm, khủng hoảng, quỷ quyệt.","L.N. Văn Tinh":"Hàm nghĩa thông minh, ham học hỏi, hiểu biết nhiều điều.","Liêm Trinh":"Hàm nghĩa thẳng thắn, sống sượng, nóng nảy và lỗ mãng.","Linh Tinh":"Chỉ sự trắc trở, điều ngang trái, ách tắc.","Mộc Dục":"Chỉ sự lầm lạc, dở dang, cũng có nghĩa thích trưng diện, phô bày.","Mộ":"Chỉ sự sa sút, chôn giấu, u ám mờ mịt.","Nguyệt Đức":"Hàm nghĩa mẫu mực, đoan chính, bao dung che chở.","Phúc Đức":"Hòa nhã, nhân hậu, sự cứu giải.","Phi Liêm":"Hàm nghĩa nhanh chóng, gọn gàng, thu vén.","Phục Binh":"Hàm nghĩa ám muội, điều xấu bất thường.","Phượng Các":"Điều vui vẻ, hoan hỉ, nhiều may mắn.","Phá Toái":"Sự hao hụt, phá tán, tình trạng đảo điên và hỗn loạn.","Phá Quân":"Dũng mãnh, can đảm đương đầu, tháo vát, chỉnh đốn, khéo lo liệu.","Phong Cáo":"Chỉ công danh sự nghiệp, học vị, bằng cấp.","Quan Phù":"Phán đoán, lý luận, công việc phản biện.","Quan Phủ":"Chỉ sự phiền phức, việc rắc rối lôi thôi.","Quan Đới":"Chỉ sự đam mê, ham muốn địa vị, quyền thế.","Quốc Ấn":"Hàm nghĩa thế lực, quyền hành, việc tuyển chọn cơ hội thăng tiến.","Quả Tú":"Chỉ sự cô độc, âm thầm, lặng lẽ chịu đựng.","Suy":"Chỉ sự sút giảm, yếu kém, đuối sức.","Thái Tuế":"Chỉ sự tự hào, sắc sảo, tài hùng biện.","Thiếu Dương":"Chỉ sự lanh lợi, nhạy bén, mau mắn lặt vặt.","Tang Môn":"Chỉ sự lo âu, điều trắc trở, quyền hành sút giảm.","Thiếu Âm":"Hàm nghĩa ngây thơ, khờ dại, thụ động, chịu đựng.","Tử Phù":"Chỉ sự tang thương, buồn thảm, bực dọc.","Tuế Phá":"Chỉ sự ngang bướng, ương ngạnh, không chịu thua kém.","Trực Phù":"Chỉ sự trắc trở, điều họa hại.","Thanh Long":"Chỉ sự vui vẻ, tin vui, công việc thăng tiến.","Tiểu Hao":"Điều suy sụp, sự thất thoát, chia sẻ nhỏ ra.","Tướng Quân":"Chỉ sự hiên ngang, dũng mãnh, có chí khí lãnh đạo.","Tấu Thư":"Chỉ sự lịch lãm, khôn khéo, bặt thiệp.","Tràng Sinh":"Hàm nghĩa lâu bền, gia tăng điều tốt đẹp, công việc phát triển.","Tử":"Hàm nghĩa chôn giấu, che đậy, âm thầm kín đáo.","Tuyệt":"Chỉ sự đứt đoạn, chấm dứt, kết thúc, khô cạn, bế tắc.","Thai":"Chỉ sự nảy nở, phát sinh, mầm sống, giao hoan.","Thiên Khôi":"Chỉ sự sáng suốt, cao thượng, chức sắc lớn.","Thiên Việt":"Chỉ sự cao sang, quyền tước, tài giỏi, có học vị.","Thiên Khốc":"Chỉ sự đau đớn, hốt hoảng, cảnh tang thương, buồn chán.","Thiên Hư":"Đa mưu túc trí, có trí tưởng tượng phong phú.","Thiên Đức":"Chỉ sự nhân hậu, đức độ, đàng hoàng, nghiêm chỉnh.","Thiên Hỷ":"Điều vui vẻ, sự hanh thông, nhiều may mắn.","Thiên Tài":"Chế ngự, giảm thiểu, làm cho ít đi, bớt đi.","Thiên Thọ":"Chỉ sự phúc thiện, hiền hậu, điềm đạm hòa nhã.","Thiên Quan":"Cứu giúp, hỗ trợ, giải cứu, tháo gỡ khó khăn.","Thiên Phúc":"Chia sẻ nhỏ dần, xóa bỏ bớt đi, triệt tiêu.","Thiên Mã":"Là nghị lực, chí khí, năng nổ vận hành, di động.","Thiên Trù":"Chỉ sự hưởng thụ ẩm thực, công việc gia chánh.","Thiên Không":"Nông nổi, nông cạn, kém bền vững, hào nhoáng vẻ bề ngoài.","Tuần Không":"Chỉ sự hạn chế, kiểm soát, cai quản chặt chẽ.","Triệt Lộ":"Chỉ sự phong tỏa, giam hãm, bao vây.","Tả Phụ":"Chỉ sự phù trợ, bảo vệ, canh giữ.","Thiên Hình":"Chỉ sự sát phạt mạnh mẽ, nguy hiểm cao độ, tội trạng.","Thiên Riêu":"Chỉ tính cách tâm linh, trực giác nhạy bén.","Thiên Y":"Chỉ về tính kỹ lưỡng, cẩn thận mọi việc, chăm sóc chu đáo.","Thiên Giải":"Tăng cường giúp đỡ, cứu trợ, giải trừ tai họa.","Tử Vi":"Quyền lực cao, chức phận lớn, ngôi vị nhiều uy tín.","Thiên Đồng":"Chỉ cải tổ, thay đổi nhanh chóng, chóng chán.","Thiên Cơ":"Chỉ khéo léo, chỉnh đốn, làm hoàn chỉnh công việc.","Thiên Phủ":"Chỉ phú quý cao sang, giàu có, thịnh vượng.","Thái Âm":"Chủ về nhà đất, cũng hàm nghĩa tính nhu mì, hiền hậu.","Thái Dương":"Chủ về uy lực, quyền thế, cũng hàm nghĩa nóng nảy, độc đoán.","Tham Lang":"Chủ về thu gom, tiếp nhận mạnh dạn, thực dụng hưởng thụ.","Thiên Tướng":"Chỉ tính hào hiệp, dũng khí, yêu chuộng thanh sắc, hào hoa phong nhã.","Thiên Lương":"Chỉ sự nhân hậu, tận tâm công việc, yêu chuộng văn chương, nghệ thuật.","Thất Sát":"Chỉ sự dũng mãnh, táo bạo, liều lĩnh dữ dội.","Tam Thai":"Chỉ sự nhàn tản ung dung, hòa hợp vui vẻ.","Thiên Quý":"Chỉ sự ôn hòa, ân nghĩa, trọng sự cứu giúp phúc thiện.","Thai Phụ":"Là ý nghĩa tự phụ, khoe khoang, hình thức khoa trương.","Thiên Thương":"Chỉ sự ngang trái, trắc trở, điều buồn chán.","Thiên La":"Chỉ sự phong tỏa, kìm hãm, ngăn cản đủ điều.","Thiên Nguyệt":"Bệnh tật, tai nạn.","Vũ Khúc":"Chỉ sự bướng bỉnh, cương cường, cứng rắn.","Văn Xương":"Chỉ khả năng học thuật, văn chương, khoa bảng.","Văn Khúc":"Chỉ khả năng biện luận, khoa học, kỹ thuật.","Tức Thần":"Chỉ sự chậm chạp, trì trệ, đình hoãn.","Bác Sĩ":"Chỉ sự thông tuệ, am tường nhiều điều.","Hỉ Thần":"Điều vui vẻ, sự may mắn.","Thiên Diêu":"Chỉ tính cách tâm linh, trực giác nhạy bén.","Thiên Quí":"Chỉ sự ôn hòa, ân nghĩa, trọng sự cứu giúp phúc thiện.","Lưu Niên Văn Tinh":"Hàm nghĩa thông minh, ham học hỏi, hiểu biết nhiều điều.","Trường Sinh":"Hàm nghĩa lâu bền, gia tăng điều tốt đẹp, công việc phát triển.","Tả Phù":"Chỉ sự phù trợ, bảo vệ, canh giữ."});

function tlAnnualStarMeaning(base){
  return TL_ANNUAL_STAR_MEANING[base]||"Sao lưu này là lớp động theo năm xem: dùng để định thời và gia giảm ý nghĩa của sao gốc tại cung hạn. Cần phối hợp với đại hạn, lưu đại hạn, tiểu hạn, Mệnh–Thân và toàn tam hợp; không dùng riêng sao lưu để kết luận.";
}
function starHelpBaseName(name){
  const raw=String(name||"").trim();
  /* L.N. Văn Tinh là tên riêng của sao, không phải tiền tố "L." của sao lưu.
     Chuẩn hóa các cách gõ L.N / L.N. để popup luôn tra đúng khóa dữ liệu. */
  if(/^L\.N\.?\s*Văn\s+Tinh$/i.test(raw)) return "L.N. Văn Tinh";
  /* Chỉ bỏ tiền tố sao lưu khi "L." được theo sau bởi khoảng trắng.
     Tránh lỗi cũ biến "L.N. Văn Tinh" thành "N. Văn Tinh". */
  return raw.replace(/^L\.\s+/,"");
}
function starHelpInfo(name){
  const base=starHelpBaseName(name);
  return STAR_HELP_DATA[base]||null;
}
function ensureStarHelpPopup(){
  let tip=document.getElementById("starHelpPopup");
  if(!tip){
    tip=document.createElement("div");
    tip.id="starHelpPopup";
    tip.className="star-help-popup";
    tip.setAttribute("role","tooltip");
    tip.setAttribute("aria-hidden","true");
    document.body.appendChild(tip);
  }
  /* V3.3.143 — Popup là vùng thao tác thực sự. Khi con trỏ đã vào popup,
     mọi thao tác cuộn, kéo scrollbar, chọn chữ hoặc bấm trong popup đều
     hủy lịch đóng sinh ra từ việc rời sao/cung nguồn. */
  if(tip.dataset.interactiveBridgeBound!=="1"){
    tip.dataset.interactiveBridgeBound="1";
    ["pointerenter","pointermove","pointerdown","wheel"].forEach(type=>{
      tip.addEventListener(type,()=>cancelStarHelpClose(),{passive:type!=="pointerdown"});
    });
    document.addEventListener("pointerdown",e=>{
      if(!starHelpPopupIsVisible())return;
      if(e.target.closest?.("#starHelpPopup,[data-star-help],[data-palace-cc-help],[data-chart-help],[data-phi-help]"))return;
      cancelStarHelpClose();
      hideStarHelp();
    },true);
    document.addEventListener("keydown",e=>{
      if(e.key==="Escape"){cancelStarHelpClose();hideStarHelp();}
    });
  }
  return tip;
}
function starHelpContext(target){
  const owner=target.closest(".major-star,.minor-star,.annual-star,.life-stage");
  return owner?.dataset?.contextNote||"";
}
function starHelpPosition(tip,target){
  const r=target.getBoundingClientRect();
  const vv=window.visualViewport;
  const vw=vv?.width||window.innerWidth;
  const vh=vv?.height||window.innerHeight;
  const vx=vv?.offsetLeft||0;
  const vy=vv?.offsetTop||0;
  const pad=10,gap=10;

  /* Khóa kích thước vào phần viewport THỰC đang nhìn thấy.
     Cách này tránh popup vượt đáy/phải khi trình duyệt zoom, thanh địa chỉ
     di động thay đổi chiều cao hoặc lá số đang được phóng lớn. */
  const maxW=Math.max(240,vw-pad*2);
  const maxH=Math.max(220,vh-pad*2);
  tip.style.maxWidth=Math.floor(maxW)+"px";
  tip.style.maxHeight=Math.floor(maxH)+"px";
  tip.style.left=Math.round(vx+pad)+"px";
  tip.style.top=Math.round(vy+pad)+"px";

  const tr=tip.getBoundingClientRect();
  const rightEdge=vx+vw-pad;
  const bottomEdge=vy+vh-pad;

  let left=r.right+gap;
  if(left+tr.width>rightEdge) left=r.left-tr.width-gap;
  if(left<vx+pad) left=Math.max(vx+pad,Math.min(r.left,rightEdge-tr.width));

  let top=r.top-6;
  if(top+tr.height>bottomEdge) top=bottomEdge-tr.height;
  if(top<vy+pad) top=vy+pad;

  tip.style.left=Math.round(left)+"px";
  tip.style.top=Math.round(top)+"px";
}
function starHelpEnabled(){
  const mode=document.querySelector("#annualMode");
  const disablePopup=document.querySelector("#disablePopup");
  return !!mode && mode.value==="full" && !disablePopup?.checked;
}
function syncPopupToggleVisibility(){
  const mode=document.querySelector("#annualMode");
  const row=document.querySelector("#disablePopupRow");
  if(!row)return;
  const isPopupMode=!!mode && (mode.value==="full"||isPhiDisplayMode(mode.value));
  row.classList.toggle("hidden",!isPopupMode);
  if(!isPopupMode)hideStarHelp();
}
function syncAnnualGoodDaysVisibility(){
  const mode=document.querySelector("#annualMode");
  const box=document.querySelector("#annualGoodDaysControls");
  if(!box)return;
  box.classList.toggle("hidden",!(mode && mode.value==="full"));
}
function syncPhiLayerVisibility(){
  const mode=document.querySelector("#annualMode");
  const box=document.querySelector("#phiLayerControls");
  if(!box)return;
  const active=!!mode&&isPhiDisplayMode(mode.value);
  box.classList.toggle("hidden",!active);
  if(active)updatePhiLayerNote();
}
function updatePhiLayerNote(){
  const select=document.querySelector("#phiLayer");
  const note=document.querySelector("#phiLayerNote");
  const mode=document.querySelector("#annualMode")?.value||"phi";
  if(!select||!note)return;
  const year=normalizeCivilYear(document.querySelector("#viewYear")?.value,new Date().getFullYear());
  const base={
    natal:"Mệnh bàn: xem 12 Can cung nguyên thủy làm nguồn phát 4 Hóa.",
    dai:`Đại Hạn: dùng Can cung nơi Đại Hạn hiện hành của năm ${year} làm nguồn phát 4 Hóa.`,
    annual:`Lưu Niên ${year}: dùng Can của năm xem làm nguồn phát; Lưu Thái Tuế chỉ là điểm neo trực quan trên địa bàn.`,
    tieu:`Tiểu Hạn ${year}: chỉ dùng làm điểm đối chiếu/kích hoạt theo quy tắc Tiểu Hạn thông dụng (Nam thuận, Nữ nghịch); không lấy Can cung Tiểu Hạn để phát riêng 4 Hóa.`
  };
  const prefix=isNorthTuHoaMode(mode)?"Tứ Hóa Bắc Phái": "Phi Tứ Hóa";
  note.textContent=`${prefix} — ${base[select.value]||base.natal}`;
}
/* V3.3.113 — Phần mở rộng cho người mới học.
   STAR_HELP_DATA.tb đã được biên tập theo lớp “đặc tính các sao”; khi nghĩa cốt lõi
   đã chứa câu “Nét nghĩa bổ sung”, bỏ đoạn lặp đó để popup không nhắc lại cùng ý. */
function starBeginnerExpansion(base,info,coreText){
  let text=String(info?.tb||"").trim();
  if(!text)return "";
  text=text.replace(/\s*Nét nghĩa bổ sung:\s*[^.]+\.?\s*$/i,"").trim();
  const core=String(coreText||"").trim();
  if(!text || text===core)return "";
  return text;
}


/* V3.3.143 — POPUP SAO THEO CUNG VỊ + HỘI HỢP.
   Mục tiêu: từ nghĩa chung của sao chuyển sang nghĩa ứng dụng tại đúng cung đang đóng,
   sau đó đọc thêm đồng cung, tam hợp và nhị hợp. Đây là lớp tổng hợp hỗ trợ nghiệm lý,
   không thay thế việc kiểm tra toàn lá số và vận hạn. */
const STAR_POPUP_HOUSE_LENS=Object.freeze({
  "Mệnh":Object.freeze({focus:"khí chất, cách hành xử, năng lực và lựa chọn cá nhân",practical:"Quan sát cách đặc tính của sao đi vào quyết định, phản ứng và phong cách sống của đương số."}),
  "Phụ Mẫu":Object.freeze({focus:"cha mẹ, cấp trên, người bảo trợ, hồ sơ và quan hệ với hệ thống có thẩm quyền",practical:"Ưu tiên kiểm chứng ở mức hỗ trợ/áp lực từ bậc trên, chất lượng hồ sơ, tư vấn và cách làm việc với cơ quan."}),
  "Phúc Đức":Object.freeze({focus:"nền phúc, đời sống tinh thần, họ tộc và sức bền tâm lý",practical:"Quan sát khả năng giữ cân bằng, hưởng thụ, phục hồi sau áp lực và ảnh hưởng của môi trường gia tộc."}),
  "Điền Trạch":Object.freeze({focus:"nhà cửa, bất động sản, nơi ở và nền tảng vật chất lâu dài",practical:"Kiểm chứng ở khả năng tạo lập, duy trì, thay đổi hoặc chịu áp lực liên quan tài sản và môi trường sống."}),
  "Quan Lộc":Object.freeze({focus:"nghề nghiệp, chức trách, dự án, vị thế và cách phát triển sự nghiệp",practical:"Quan sát loại công việc phù hợp, cách nhận trách nhiệm, quan hệ với quyền hạn và kết quả nghề nghiệp."}),
  "Nô Bộc":Object.freeze({focus:"bạn bè, đồng nghiệp, cộng sự, cấp dưới và mạng lưới xã hội",practical:"Kiểm chứng chất lượng phối hợp, độ tin cậy của cộng sự, khả năng dùng người và ranh giới trách nhiệm."}),
  "Thiên Di":Object.freeze({focus:"môi trường bên ngoài, đối tác, xã hội, đi xa và phản ứng khi ra ngoài",practical:"Quan sát cơ hội hoặc va chạm đến từ bên ngoài, cách đương số ứng xử với thị trường, đối tác và thay đổi môi trường."}),
  "Tật Ách":Object.freeze({focus:"điểm dễ căng thẳng của thể chất/tâm lý và cách phản ứng trước áp lực",practical:"Dùng để nhận diện khu vực cần giữ nhịp sống và quản trị áp lực; đây là diễn giải mệnh lý, không thay cho đánh giá y khoa."}),
  "Tài Bạch":Object.freeze({focus:"thu nhập, dòng tiền, tài sản và cách quản trị nguồn lực",practical:"Kiểm chứng cách tạo tiền, giữ tiền, phân bổ vốn và mức độ chủ động hay bị động trước dòng tiền."}),
  "Tử Tức":Object.freeze({focus:"con cái, cấp dưới, sản phẩm, đầu ra, dự án và phần việc tạo ra kết quả",practical:"Quan sát khả năng nuôi dưỡng một kết quả dài hạn, trách nhiệm với con cái/cấp dưới và mức nguồn lực phải bỏ ra cho đầu ra."}),
  "Phu Thê":Object.freeze({focus:"hôn phối, đối tác trực tiếp, hợp đồng và quan hệ một-một",practical:"Kiểm chứng cách chọn đối tác, phân chia quyền lợi/trách nhiệm, mức gắn bó và chất lượng cam kết dài hạn."}),
  "Huynh Đệ":Object.freeze({focus:"anh chị em, người cùng thế hệ, đồng cấp và quan hệ phối hợp ngang hàng",practical:"Quan sát mức đồng thuận, cạnh tranh, chia sẻ thông tin và ranh giới trách nhiệm giữa những người ngang vai."})
});
const STAR_POPUP_SUPPORT_SET=new Set([
  "Hóa Lộc","Hóa Quyền","Hóa Khoa","Lộc Tồn","Tả Phụ","Tả Phù","Hữu Bật","Thiên Khôi","Thiên Việt","Văn Xương","Văn Khúc",
  "Ân Quang","Thiên Quý","Thiên Quí","Tam Thai","Bát Tọa","Quốc Ấn","Phong Cáo","Thanh Long","Hỷ Thần","Hỉ Thần","Thiên Hỷ",
  "Long Đức","Nguyệt Đức","Phúc Đức","Thiên Đức","Thiên Quan","Thiên Phúc","Thiên Giải","Địa Giải","Giải Thần","Phượng Các","Đường Phù"
]);
const STAR_POPUP_PRIORITY=new Set([
  "Hóa Lộc","Hóa Quyền","Hóa Khoa","Hóa Kỵ","Lộc Tồn","Kình Dương","Đà La","Hỏa Tinh","Linh Tinh","Địa Không","Địa Kiếp",
  "Thiên Khôi","Thiên Việt","Tả Phụ","Tả Phù","Hữu Bật","Văn Xương","Văn Khúc","Quốc Ấn","Thiên Mã","Thái Tuế"
]);
function starPopupNatureScore(name,status=""){
  let score=0;
  if(BAD_STARS.has(name))score-=1;
  if(STAR_POPUP_SUPPORT_SET.has(name))score+=1;
  if(["M","V","Đ"].includes(status))score+=0.35;
  if(status==="H")score-=0.35;
  return score;
}
function starPopupPalaceContext(target){
  const palace=target.closest?.(".palace");
  if(!palace)return {palace:null,house:"",branch:0};
  const house=palace.dataset.houseName||palace.querySelector(".house-title")?.textContent?.replace(/\(THÂN\)/i,"").replace(/\s+/g," ").trim()||"";
  return {palace,house,branch:Number(palace.dataset.branch)||0};
}
function starPopupStaticStars(palace){
  if(!palace)return [];
  const seen=new Set(),rows=[];
  palace.querySelectorAll(".star-token[data-star-help]").forEach(node=>{
    const name=starHelpBaseName(node.dataset.starHelp||node.dataset.starDisplay||"");
    if(!name||seen.has(name))return;
    seen.add(name);
    rows.push({
      name,
      status:node.dataset.starStatus||"",
      major:!!node.closest(".major-star"),
      priority:STAR_POPUP_PRIORITY.has(name),
      score:starPopupNatureScore(name,node.dataset.starStatus||"")
    });
  });
  rows.sort((a,b)=>(Number(b.major)-Number(a.major))||(Number(b.priority)-Number(a.priority))||(Math.abs(b.score)-Math.abs(a.score))||a.name.localeCompare(b.name,"vi"));
  return rows;
}
function starPopupRelationBranches(branch){
  const tamGroups=[[1,5,9],[2,6,10],[3,7,11],[4,8,12]];
  const tam=(tamGroups.find(g=>g.includes(branch))||[]).filter(x=>x!==branch);
  const nhiMap={1:2,2:1,3:12,12:3,4:11,11:4,5:10,10:5,6:9,9:6,7:8,8:7};
  return {tam,nhi:nhiMap[branch]||0};
}
function starPopupPalaceSummaryByBranch(branch,excludeName=""){
  const p=document.querySelector(`#chart .palace[data-branch="${branch}"]`);
  if(!p)return null;
  const house=p.dataset.houseName||p.querySelector(".house-title")?.textContent?.replace(/\(THÂN\)/i,"").replace(/\s+/g," ").trim()||CHI[branch]||"";
  const stars=starPopupStaticStars(p).filter(x=>x.name!==excludeName);
  const selected=stars.slice(0,5);
  return {branch,house,stars,selected,score:selected.reduce((s,x)=>s+x.score,0)};
}
function starPopupNames(rows,max=5){
  return rows.slice(0,max).map(x=>`${x.name}${x.status?` (${x.status})`:""}`).join(", ");
}
function starPopupEssence(name){
  const raw=String(STAR_POPUP_DICTIONARY[name]||STAR_HELP_DATA[name]?.tb||STAR_HELP_DATA[name]?.tl||"").replace(/\s+/g," ").trim();
  if(!raw)return "";
  const first=(raw.match(/^.*?[.!?](?:\s|$)/)||[raw])[0].trim();
  return first.length>128?first.slice(0,125).trim()+"…":first;
}
function starPopupSamePalaceSynthesis(base,ctx){
  if(!ctx.palace)return "";
  const companions=starPopupStaticStars(ctx.palace).filter(x=>x.name!==base);
  if(!companions.length)return `Cung ${ctx.house||"đang xét"} ít sao đồng cung nổi bật; nên tăng trọng số cho chính tinh, tam hợp, đối cung và vận hạn.`;
  const picked=companions.slice(0,6);
  const score=picked.reduce((s,x)=>s+x.score,0);
  const semantic=picked.filter(x=>x.major||x.priority).slice(0,2).map(x=>{
    const e=starPopupEssence(x.name);
    return e?`${x.name}: ${e}`:"";
  }).filter(Boolean);
  const hoa=picked.filter(x=>["Hóa Lộc","Hóa Quyền","Hóa Khoa","Hóa Kỵ"].includes(x.name)).map(x=>({
    "Hóa Lộc":"tăng lớp lợi ích/thu hoạch và khả năng huy động nguồn lực",
    "Hóa Quyền":"tăng quyền quyết định, trách nhiệm và sức thúc đẩy",
    "Hóa Khoa":"tăng tính chuyên môn, danh tín, văn bản và khả năng hợp thức hóa",
    "Hóa Kỵ":"tăng ràng buộc, điểm khó hoặc phần việc phải xử lý kỹ"
  })[x.name]).filter(Boolean);
  const tone=score>=1.25
    ? "Cụm đồng cung có xu hướng tăng trợ lực và khả năng triển khai; mặt thuận của sao đang xét dễ có điều kiện biểu hiện hơn."
    : (score<=-1.25
      ? "Cụm đồng cung có khá nhiều yếu tố gây áp lực hoặc làm sự việc phức tạp; mặt khó của sao đang xét cần được quản trị rõ hơn."
      : "Cụm đồng cung đan xen lực hỗ trợ và lực gây áp lực; kết quả phụ thuộc mạnh vào cách phối hợp, đắc-hãm và tầng vận kích hoạt.");
  return `Đồng cung đáng chú ý: ${starPopupNames(picked,6)}.${semantic.length?` Hai lớp nghĩa nên đọc trực tiếp cùng sao đang xét: ${semantic.join(" • ")}.`:""}${hoa.length?` Tứ Hóa đồng cung làm ${hoa.join("; ")}.`:""} ${tone}`;
}
function starPopupTamHopSynthesis(base,ctx){
  if(!ctx.branch)return "";
  const rel=starPopupRelationBranches(ctx.branch);
  const rows=rel.tam.map(b=>starPopupPalaceSummaryByBranch(b,base)).filter(Boolean);
  if(!rows.length)return "";
  const score=rows.reduce((s,r)=>s+r.score,0);
  const detail=rows.map(r=>`Cung ${r.house}: ${r.selected.length?starPopupNames(r.selected,4):"ít sao nổi bật"}`).join(" • ");
  const fields=rows.map(r=>STAR_POPUP_HOUSE_LENS[r.house]?.focus||`chủ đề cung ${r.house}`);
  const tone=score>=1.5
    ? "Tam hợp đang tạo nguồn hỗ trợ tương đối rõ cho chủ đề của cung này; nên đọc sao đang xét trong một mạng có khả năng tiếp sức từ hai cung liên hệ."
    : (score<=-1.5
      ? "Tam hợp mang nhiều tín hiệu gây áp lực; một vấn đề tại cung này dễ bị kéo thêm bởi hai lĩnh vực tam hợp, vì vậy không nên luận riêng nội cung."
      : "Tam hợp có tính pha trộn; cần xem cung nào đang được vận hạn kích hoạt để biết lực nào thực sự nổi lên.");
  return `${detail}. Về ứng dụng, cung ${ctx.house||"đang xét"} đang nối trực tiếp với ${fields.join(" và ")}; khi một trong các cung này động mạnh, chủ đề của sao đang xét thường cần được đọc cùng cả ba lĩnh vực. ${tone}`;
}
function starPopupNhiHopSynthesis(base,ctx){
  if(!ctx.branch)return "";
  const rel=starPopupRelationBranches(ctx.branch);
  if(!rel.nhi)return "";
  const row=starPopupPalaceSummaryByBranch(rel.nhi,base);
  if(!row)return "";
  const field=STAR_POPUP_HOUSE_LENS[row.house]?.focus||`chủ đề cung ${row.house}`;
  const tone=row.score>=0.75
    ? "Nhị hợp có xu hướng bổ trợ thêm cho cách biểu hiện của cung đang xét."
    : (row.score<=-0.75
      ? "Nhị hợp cho thấy một lớp ràng buộc hoặc áp lực phụ cần kiểm chứng khi sự việc phát sinh."
      : "Nhị hợp là lớp bổ sung trung tính/pha trộn; dùng để tinh chỉnh sau khi đã đọc nội cung và tam hợp.");
  return `Nhị hợp với cung ${row.house}${row.selected.length?` có ${starPopupNames(row.selected,4)}`:""}. Liên hệ thực tế cần kiểm tra thêm ở ${field}. ${tone}`;
}
function starPopupHouseMeaning(base,ctx,dictionaryText){
  const lens=STAR_POPUP_HOUSE_LENS[ctx.house]||{focus:`chủ đề của cung ${ctx.house||"đang xét"}`,practical:"Đối chiếu với các sao đồng cung, tam hợp, đối cung và vận hạn để xác định biểu hiện thực tế."};
  const core=String(dictionaryText||"").trim();
  const status=ctx.palace?.querySelector(`[data-star-help="${CSS.escape(base)}"]`)?.dataset?.starStatus||"";
  let strength="";
  if(["M","V","Đ"].includes(status))strength=" Trạng thái hiện tại giúp đặc tính của sao có điều kiện biểu hiện rõ hơn, nhưng vẫn phải xem hội hợp.";
  else if(status==="H")strength=" Sao đang ở trạng thái hãm nên mặt khó hoặc sự bất ổn của đặc tính này cần được kiểm chứng kỹ hơn qua hội hợp và vận hạn.";
  return `Tại cung ${ctx.house||"đang xét"}, sao này tác động chủ yếu vào ${lens.focus}. ${core?`Nghĩa cốt lõi “${core}” nên được chuyển thành biểu hiện thực tế trong đúng lĩnh vực này, không đọc theo nghĩa chung tách rời cung vị. `:""}${lens.practical}${strength}`;
}
function starPopupPracticalConclusion(base,ctx,dictionaryText){
  if(!ctx.palace)return "";
  const lens=STAR_POPUP_HOUSE_LENS[ctx.house]||{focus:`cung ${ctx.house||"đang xét"}`,practical:"Kiểm chứng theo toàn bộ cấu trúc lá số."};
  const own=starPopupStaticStars(ctx.palace).filter(x=>x.name!==base).slice(0,6);
  const rel=starPopupRelationBranches(ctx.branch);
  const tam=rel.tam.map(b=>starPopupPalaceSummaryByBranch(b,base)).filter(Boolean);
  const nhi=rel.nhi?starPopupPalaceSummaryByBranch(rel.nhi,base):null;
  const total=own.reduce((s,x)=>s+x.score,0)+tam.reduce((s,r)=>s+r.score,0)*0.65+(nhi?.score||0)*0.3;
  const direction=total>=1.5
    ? "Cấu trúc xung quanh đang nghiêng về khả năng khai thác mặt thuận của sao; khi có vận phù hợp, chủ đề này dễ chuyển thành kết quả cụ thể hơn."
    : (total<=-1.5
      ? "Cấu trúc xung quanh tạo khá nhiều lực cản; nên ưu tiên kiểm soát rủi ro, trách nhiệm và cách phối hợp trước khi kỳ vọng kết quả thuận lợi."
      : "Cấu trúc xung quanh cân bằng hoặc pha trộn; kết quả thực tế phụ thuộc nhiều vào tầng vận đang kích hoạt và cách đương số xử lý tình huống.");
  return `Trọng tâm nghiệm lý: ${lens.focus}. ${direction}`;
}
function showStarHelp(target){
  if(!starHelpEnabled()){ hideStarHelp(); return; }
  const raw=target.dataset.starDisplay||target.dataset.starHelp||"";
  const base=starHelpBaseName(target.dataset.starHelp||raw);
  const annual=target.dataset.starAnnual==="1";
  const viewYear=Number(document.querySelector("#viewYear")?.value)||null;
  const tip=ensureStarHelpPopup();

  /* V3.3.78: popup sao lưu chỉ trình bày lớp nghĩa theo năm xem.
     Không lặp hành, trạng thái M/V/Đ/B/H, cốt tính, phối hợp hay vị trí của sao gốc. */
  if(annual){
    const annualMeaning=tlAnnualStarMeaning(base);
    const annualGroup=target.dataset.starAnnualGroup||"";
    const annualType=target.classList.contains("bad")?"Hung/sát/bại lưu tinh":"Cát/trợ lưu tinh";
    const palaceCtx=annualPalaceContext(target);
    const houseInfo=tlAnnualHouseInfo(palaceCtx.house);
    const houseReading=tlAnnualHouseReading(base,palaceCtx.house,viewYear);
    const overlayText=tlAnnualLimitOverlayText(palaceCtx,viewYear);
    const meta=[viewYear?`Sao lưu ${viewYear}`:"Sao lưu",tlAnnualGroupLabel(annualGroup),annualType].filter(Boolean);
    tip.innerHTML=`
      <div class="star-help-head">
        <span class="star-help-name">${escapeHtml(raw||base)}</span>
        <span class="star-help-meta">${escapeHtml(meta.join(" • "))}</span>
      </div>
      <div class="star-help-kicker">TỬ VI THIÊN LƯƠNG • SAO LƯU • LUẬN THEO CUNG NHẬP HẠN</div>
      <div class="star-help-detail star-help-annual">
        <div class="star-help-detail-title">1. Bản chất sao lưu${viewYear?` • năm ${escapeHtml(String(viewYear))}`:""}</div>
        <div class="star-help-detail-text">${escapeHtml(annualMeaning)}</div>
      </div>
      <div class="star-help-detail star-help-annual-house">
        <div class="star-help-detail-title">2. Đang nhập cung nào?</div>
        <div class="star-help-detail-text"><b>Cung ${escapeHtml(palaceCtx.house||"—")}</b>${palaceCtx.branch?` • địa bàn ${escapeHtml(CHI[Number(palaceCtx.branch)]||palaceCtx.branch)}`:""}. Chủ về ${escapeHtml(houseInfo.topic)}.</div>
      </div>
      <div class="star-help-detail star-help-annual-reading">
        <div class="star-help-detail-title">3. Luận theo cung trong năm</div>
        <div class="star-help-detail-text">${escapeHtml(houseReading)}</div>
      </div>
      ${overlayText?`<div class="star-help-detail star-help-annual-overlay">
        <div class="star-help-detail-title">4. Chồng lớp hạn</div>
        <div class="star-help-detail-text">${escapeHtml(overlayText)}</div>
      </div>`:""}
      <div class="star-help-foot"><b>Cách đọc:</b> Cung = lĩnh vực → Sao lưu = cách lĩnh vực ấy động trong năm → các lớp hạn và sao gốc xác nhận mức thành/bại. Không kết luận từ một sao lưu đơn độc.</div>`;
    tip.classList.add("is-visible");
    tip.setAttribute("aria-hidden","false");
    starHelpPosition(tip,target);
    return;
  }

  const info=starHelpInfo(base);
  if(!info)return;
  const dictionaryText=STAR_POPUP_DICTIONARY[base]||info.tb||"";
  const dictionaryMore=starBeginnerExpansion(base,info,dictionaryText);
  const e=target.dataset.starElement||"";
  const st=target.dataset.starStatus||"";
  const isDualElement=target.dataset.starDualElement==="1";
  const baseElement=target.dataset.starBaseElement||"";
  const secondaryElement=target.dataset.starSecondaryElement||"";
  const unusedElement=target.dataset.starUnusedElement||"";
  const menhElement=target.dataset.starMenhElement||"";
  const elementReason=target.dataset.starElementReason||"";
  const master=starMasterMeta(base);
  const meta=[];
  if(e&&STAR_HELP_ELEMENT[e])meta.push((isDualElement?"Dụng hành ":"Hành ")+STAR_HELP_ELEMENT[e]);
  if(st&&STAR_HELP_STATUS[st])meta.push(STAR_HELP_STATUS[st]+` (${st})`);
  const context=starHelpContext(target);
  const role=tlHelpRole(base);
  const combine=tlHelpCombine(base);
  const dualElementIdentity=isDualElement&&baseElement&&secondaryElement
    ? `${STAR_HELP_ELEMENT[baseElement]||baseElement} đới ${STAR_HELP_ELEMENT[secondaryElement]||secondaryElement}`
    : "";
  const dualElementDetail=isDualElement&&e&&baseElement&&secondaryElement
    ? `<div class="star-help-detail star-help-element-use">
        <div class="star-help-detail-title">Ngũ hành sử dụng trên lá số này</div>
        <div class="star-help-detail-text">Định danh cố định của sao: <b>${escapeHtml(dualElementIdentity)}</b>${menhElement?` • Nạp âm bản mệnh: <b>${escapeHtml(STAR_HELP_ELEMENT[menhElement]||menhElement)}</b>`:""}</div>
        <div class="star-help-element-row">
          <span class="star-help-element-item"><i class="star-help-element-swatch use-${escapeHtml(e)}"></i><b>Dụng để luận và tô màu: ${escapeHtml(STAR_HELP_ELEMENT[e]||e)}</b></span>
          ${unusedElement?`<span class="star-help-element-item"><i class="star-help-element-swatch use-${escapeHtml(unusedElement)}"></i>Không dụng trên lá số này: ${escapeHtml(STAR_HELP_ELEMENT[unusedElement]||unusedElement)}</span>`:""}
        </div>
        ${elementReason?`<div class="star-help-element-reason">${escapeHtml(elementReason)}</div>`:""}
        <div class="star-help-element-note">“Không dụng” chỉ là không chọn làm hành hiệu lực để luận và tô màu trên lá số này; không xóa hành đới khỏi định danh cố định của sao.</div>
      </div>`
    : "";
  const popupCtx=starPopupPalaceContext(target);
  const houseMeaning=starPopupHouseMeaning(base,popupCtx,dictionaryText);
  const samePalaceMeaning=starPopupSamePalaceSynthesis(base,popupCtx);
  const tamHopMeaning=starPopupTamHopSynthesis(base,popupCtx);
  const nhiHopMeaning=starPopupNhiHopSynthesis(base,popupCtx);
  const practicalConclusion=starPopupPracticalConclusion(base,popupCtx,dictionaryText);
  tip.innerHTML=`
    <div class="star-help-head">
      <span class="star-help-name">${escapeHtml(raw||base)}</span>
      ${meta.length?`<span class="star-help-meta">${escapeHtml(meta.join(" • "))}</span>`:""}
    </div>
    ${context?`<div class="star-help-context"><b>Trên lá số này:</b> ${escapeHtml(context)}</div>`:""}
    ${dualElementDetail}
    ${dictionaryText?`<div class="star-help-section dictionary">
      <span class="star-help-source">Ý nghĩa theo từ điển sao</span>
      <div class="star-help-dict-core"><span class="star-help-dict-label">Nghĩa cốt lõi:</span>${escapeHtml(dictionaryText)}</div>
      ${dictionaryMore?`<div class="star-help-dict-more"><span class="star-help-dict-label">Hiểu thêm:</span>${escapeHtml(dictionaryMore)}</div>`:""}
    </div>`:""}
    ${houseMeaning?`<div class="star-help-detail star-help-annual-reading"><div class="star-help-detail-title">Ý nghĩa tại cung ${escapeHtml(popupCtx.house||"đang đóng")}</div><div class="star-help-detail-text">${escapeHtml(houseMeaning)}</div></div>`:""}
    ${samePalaceMeaning?`<div class="star-help-detail"><div class="star-help-detail-title">Phối hợp sao đồng cung</div><div class="star-help-detail-text">${escapeHtml(samePalaceMeaning)}</div></div>`:""}
    ${tamHopMeaning?`<div class="star-help-detail"><div class="star-help-detail-title">Tam hợp liên quan</div><div class="star-help-detail-text">${escapeHtml(tamHopMeaning)}</div></div>`:""}
    ${nhiHopMeaning?`<div class="star-help-detail"><div class="star-help-detail-title">Nhị hợp bổ trợ</div><div class="star-help-detail-text">${escapeHtml(nhiHopMeaning)}</div></div>`:""}
    ${practicalConclusion?`<div class="star-help-detail star-help-annual-reading"><div class="star-help-detail-title">Kết luận ứng dụng</div><div class="star-help-detail-text">${escapeHtml(practicalConclusion)}</div></div>`:""}
    <div class="star-help-section tl">
      <span class="star-help-source">Tóm lược theo Tử Vi Thiên Lương</span>
      <div class="star-help-text">${escapeHtml(info.tl)}</div>
    </div>
    ${role?`<div class="star-help-detail"><div class="star-help-detail-title">Cốt tính / vai trò</div><div class="star-help-detail-text">${escapeHtml(role)}</div></div>`:""}
    ${combine?`<div class="star-help-detail"><div class="star-help-detail-title">Phối hợp và nghiệm lý</div><div class="star-help-detail-text">${escapeHtml(combine)}</div></div>`:""}
    <div class="star-help-foot">Cách đọc: nghĩa chung của sao → đúng cung đang đóng → sao đồng cung → tam hợp/nhị hợp → vận hạn kích hoạt. Phần “Kết luận ứng dụng” là tổng hợp hỗ trợ nghiệm lý, không phải dự báo chắc chắn và không dùng một sao đơn độc để kết luận toàn lá số.</div>`;
  tip.classList.add("is-visible");
  tip.setAttribute("aria-hidden","false");
  starHelpPosition(tip,target);
}
let __starHelpCloseTimer=0;
function starHelpPopupIsVisible(){
  return !!document.getElementById("starHelpPopup")?.classList.contains("is-visible");
}
function cancelStarHelpClose(){
  if(__starHelpCloseTimer){clearTimeout(__starHelpCloseTimer);__starHelpCloseTimer=0;}
}
function scheduleStarHelpClose(onClose,delay=900){
  cancelStarHelpClose();
  __starHelpCloseTimer=setTimeout(()=>{
    __starHelpCloseTimer=0;
    const tip=document.getElementById("starHelpPopup");
    /* :hover tiếp tục đúng khi người dùng đang ở nội dung hoặc scrollbar
       của phần tử; vì vậy tuyệt đối không đóng trong trường hợp này. */
    if(tip?.matches?.(":hover"))return;
    if(typeof onClose==="function")onClose();
    hideStarHelp();
  },delay);
}
function hideStarHelp(){
  cancelStarHelpClose();
  const tip=document.getElementById("starHelpPopup");
  if(!tip)return;
  tip.classList.remove("is-visible");
  tip.setAttribute("aria-hidden","true");
}


function phiPopupEnabled(){
  const mode=document.querySelector("#annualMode");
  const disablePopup=document.querySelector("#disablePopup");
  return !!mode && isPhiDisplayMode(mode.value) && !disablePopup?.checked;
}
function phiTuHoaTableHtml(){
  return `<table class="phi-help-table"><thead><tr><th>Can</th><th>Hóa Lộc</th><th>Hóa Quyền</th><th>Hóa Khoa</th><th>Hóa Kỵ</th></tr></thead><tbody>${Array.from({length:10},(_,i)=>{
    const can=i+1,h=THIEN_LUONG_TU_HOA[can]||[];
    return `<tr><td><b>${escapeHtml(CAN[can])}</b></td>${h.map(x=>`<td>${escapeHtml(x)}</td>`).join("")}</tr>`;
  }).join("")}</tbody></table>`;
}
function phiOverviewPopupHtml(c){
  const natal=THIEN_LUONG_TU_HOA[c.canNam]||[],v=c.phiView||{layer:"natal",title:"MỆNH BÀN",subtitle:"12 Can cung nguyên thủy"};
  const north=isNorthTuHoaMode(c.annualMode);
  const modeName=phiModeLabel(c.annualMode);
  const school=phiModeSchoolLabel(c.annualMode);
  const intro={natal:"Mỗi cung bản mệnh dùng Thiên Can cung của nó để phát Lộc – Quyền – Khoa – Kỵ tới vị trí thật của bốn sao chủ.",dai:"Đại Hạn của hệ Phi Hóa/Bắc Phái được an độc lập theo Dương Nam–Âm Nữ thuận, Âm Nam–Dương Nữ nghịch; sau đó dùng Can cung Đại Hạn làm nguồn phát bốn Hóa.",annual:"Lưu Niên dùng trực tiếp Can của năm xem để phát bốn Hóa. Lưu Thái Tuế chỉ là điểm neo trực quan, không thay thế Can năm.",tieu:"Tiểu Hạn ở chế độ Phi Hóa/Bắc Phái chỉ là lớp đối chiếu sự kiện: an theo quy tắc thông dụng Nam thuận – Nữ nghịch, không lấy Can cung Tiểu Hạn để phát riêng bốn Hóa. Khi luận năm, dùng Sinh niên/Mệnh bàn + Đại Hạn + Lưu Niên chiếu vào cung Tiểu Hạn."}[v.layer]||"";
  const northBlock=north?`<div class="star-help-detail"><div class="star-help-detail-title">6. Các mục Bắc Phái đang hỗ trợ</div><div class="star-help-detail-text"><b>Phi xuất / Phi nhập</b>, <b>Tự Hóa</b> và cấu trúc <b>cung phát → sao chủ → cung nhận</b> đã được trình bày trực tiếp trên lá số và popup. Các lớp nâng cao <b>Kỵ xung</b>, <b>Chuyển Kỵ</b>, <b>Lai Nhân Cung</b>, <b>Ngã cung / Tha cung</b> đã được engine nhận diện và đưa vào popup/hội tụ; phần mềm vẫn tách rõ dữ liệu quy tắc với nhận định tổng hợp.</div></div><div class="star-help-detail"><div class="star-help-detail-title">7. Cách đọc Bắc Phái trên phần mềm</div><div class="star-help-detail-text">Chọn một cung để làm nổi <b>nguồn phát</b>, sau đó đọc từng dòng Lộc/Quyền/Khoa/Kỵ để biết sao chủ nào nhận Hóa và phi nhập cung nào. Cuối cùng phối thêm chính tinh, phụ tinh và trục đối cung để luận.</div></div>`:`<div class="star-help-detail"><div class="star-help-detail-title">6. Bốn tầng hiện có</div><div class="star-help-detail-text"><b>Mệnh bàn</b>: 12 Can cung • <b>Đại Hạn</b>: Can cung Đại Hạn của hệ Phi Hóa • <b>Lưu Niên</b>: Can năm xem • <b>Tiểu Hạn</b>: chỉ đối chiếu/kích hoạt, không phát riêng 4 Hóa. Các quy tắc vận của Thiên Lương không được dùng để thay thế quy tắc của Phi Hóa.</div></div>`;
  return `<div class="star-help-head"><span class="star-help-name">${modeName}</span><span class="star-help-meta">${escapeHtml(v.title)} • ${escapeHtml(v.subtitle)}</span></div><div class="star-help-kicker">${school} • TẦNG ${escapeHtml(v.title)}</div><div class="star-help-detail"><div class="star-help-detail-title">1. Nguyên tắc của tầng đang xem</div><div class="star-help-detail-text">${escapeHtml(intro)}</div></div><div class="phi-help-grid">${PHI_HOA_ORDER.map(h=>`<div class="phi-help-card"><b>${escapeHtml(h)}</b><div>${escapeHtml(PHI_HOA_KNOWLEDGE[h].core)}</div></div>`).join("")}</div><div class="star-help-detail"><div class="star-help-detail-title">2. Phi xuất – Phi nhập</div><div class="star-help-detail-text"><b>Phi xuất</b> là hướng đi từ nguồn phát của tầng đang chọn; <b>phi nhập</b> là cung nhận. Luôn đọc đủ: tầng phát → Can phát → loại Hóa + sao chủ → cung nhận.</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Tự Hóa</div><div class="star-help-detail-text">Mệnh bàn và Đại Hạn có thể đánh dấu <b>TỰ</b> khi sao chủ Hóa nằm ngay cung đang dùng Can cung để phát. Lưu Niên dùng Can năm nên không gán Tự Hóa chỉ vì sao rơi đúng cung Lưu Thái Tuế. Tiểu Hạn là lớp đối chiếu, không tự phát 4 Hóa nên không tạo Tự Hóa riêng.</div></div><div class="star-help-detail"><div class="star-help-detail-title">4. Tứ Hóa năm sinh</div><div class="star-help-detail-text">Can năm sinh <b>${escapeHtml(CAN[c.canNam])}</b>: Lộc = <b>${escapeHtml(natal[0]||"—")}</b> • Quyền = <b>${escapeHtml(natal[1]||"—")}</b> • Khoa = <b>${escapeHtml(natal[2]||"—")}</b> • Kỵ = <b>${escapeHtml(natal[3]||"—")}</b>.</div></div><div class="star-help-detail"><div class="star-help-detail-title">5. Bảng 10 Can Tứ Hóa</div>${phiTuHoaTableHtml()}</div>${northBlock}<div class="star-help-foot">Đổi “Tầng Phi Hóa” để xem từng lớp riêng; mỗi lần chỉ một tầng được dựng.</div>`;
}
function phiReferencePopupHtml(c){
  const v=c.phiView||{},br=Number(v.sourceBranch)||Number(c.phiTieuBranch)||0;
  const house=br?houseName(br,c.menh):"—";
  return `<div class="star-help-head"><span class="star-help-name">TIỂU HẠN ${escapeHtml(String(c.viewYear))}</span><span class="star-help-meta">ĐỐI CHIẾU • ${escapeHtml(house.toUpperCase())}${br?` • ${escapeHtml(CHI[br].toUpperCase())}`:""}</span></div><div class="star-help-kicker">${phiModeLabel(c.annualMode)} • KHÔNG PHÁT RIÊNG 4 HÓA</div><div class="star-help-detail"><div class="star-help-detail-title">1. Quy tắc đang dùng</div><div class="star-help-detail-text">Trong chế độ Phi Hóa/Bắc Phái, Tiểu Hạn được an độc lập theo quy tắc thông dụng <b>Nam thuận – Nữ nghịch</b>, không kế thừa chiều Tiểu Hạn của chế độ Thiên Lương.</div></div><div class="star-help-detail"><div class="star-help-detail-title">2. Vai trò</div><div class="star-help-detail-text">Cung Tiểu Hạn là <b>điểm đối chiếu/kích hoạt sự việc</b>. Phần mềm kiểm tra Sinh niên/Mệnh bàn, Đại Hạn và Lưu Niên có Lộc–Quyền–Khoa–Kỵ nhập hoặc xung tới cung này hay không.</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Không làm gì?</div><div class="star-help-detail-text">Không lấy Thiên Can của cung Tiểu Hạn để dựng thêm một bộ Lộc–Quyền–Khoa–Kỵ riêng, tránh trộn quy tắc của các hệ khác vào Phi Hóa/Bắc Phái.</div></div><div class="star-help-foot">Nguyên tắc: cùng một lá số, mỗi chế độ vận hành theo đúng hệ lý luận của chính nó.</div>`;
}
function phiFlowTrace(flow,c){
  if(!flow)return [];
  const layerLabel=({natal:"Mệnh bàn",dai:"Đại Hạn",annual:`Lưu Niên ${c.viewYear}`})[flow.layer]||flow.layer||"—";
  const rows=[
    ["Tầng",layerLabel],
    ["Nguồn phát",flow.sourceLabel||flow.sourceHouse||"—"],
    ["Can phát",`${CAN[flow.sourceStem]||"—"} • ${flow.sourceStemOrigin||"—"}`],
    ["Bảng Tứ Hóa",`${CAN[flow.sourceStem]||"—"} → ${flow.star||"—"} ${flow.hoa||"—"}`],
    ["Vị trí sao",`${flow.star||"—"} tại ${flow.targetHouse||"—"}${flow.targetBranch?` (${CHI[flow.targetBranch]})`:""}`],
    ["Kết quả",`${flow.hoa||"—"} phi nhập ${flow.targetHouse||"—"}`]
  ];
  if(flow.self)rows.push(["Tự Hóa",`Có • cung phát trùng cung nhận ${flow.targetHouse}`]);
  if(isNorthTuHoaMode(c.annualMode)&&flow.hoa==="Hóa Kỵ"){
    rows.push(["Kỵ xung",`${flow.targetHouse||"—"} → xung ${flow.oppositeHouse||"—"}`]);
    if(flow.sourceBranch){
      const chain=northKyChainFromSource(flow.sourceBranch,c,6);
      if(chain.length)rows.push(["Chuyển Kỵ",chain.map(x=>`CK${x.level}: ${x.sourceHouse}→${x.star}→${x.targetHouse}`).join(" • ")]);
    }
  }
  return rows;
}
function phiTraceHtml(flow,c){
  const rows=phiFlowTrace(flow,c);
  return `<div class="calc-trace">${rows.map(([k,v])=>`<div class="calc-trace-row"><div class="calc-trace-key">${escapeHtml(k)}</div><div class="calc-trace-value">${escapeHtml(v)}</div></div>`).join("")}</div>`;
}
function provenanceBadgesHtml(){
  return `<span class="knowledge-provenance knowledge-rule">QUY TẮC</span><span class="knowledge-provenance knowledge-detect">PHÁT HIỆN</span><span class="knowledge-provenance knowledge-infer">NHẬN ĐỊNH</span>`;
}
function phiSourcePopupHtml(sourceBranch,c){
  const v=c.phiView,source=Number(sourceBranch)||0;
  if(v?.referenceOnly)return phiReferencePopupHtml(c);
  const flows=phiCurrentFlows(c,source);if(!flows.length)return "";const f0=flows[0],house=f0.sourceHouse||houseName(source,c.menh),stem=f0.sourceStem;
  return `<div class="star-help-head"><span class="star-help-name">${escapeHtml(v?.multiSource?house.toUpperCase():(v?.title||house.toUpperCase()))}</span><span class="star-help-meta">${escapeHtml(f0.sourceStemOrigin)} ${escapeHtml(CAN[stem])} • ${escapeHtml(v?.subtitle||"")}</span></div><div class="star-help-kicker">${phiModeLabel(c.annualMode)} • NGUỒN PHÁT → 4 CUNG NHẬN</div><div class="star-help-context">${provenanceBadgesHtml()}<br><b>Nguồn phát:</b> ${escapeHtml(f0.sourceLabel||house)}${f0.sourceVisualNote?` • ${escapeHtml(f0.sourceVisualNote)}`:""}.</div>${flows.map((f,i)=>`<div class="star-help-detail"><div class="star-help-detail-title">${i+1}. ${escapeHtml(f.hoa)} → ${escapeHtml(f.targetHouse)}${f.self?" • TỰ HÓA":""}</div><div class="star-help-detail-text"><b>${escapeHtml(f.star)}</b> là sao chủ ${escapeHtml(f.hoa)} của ${escapeHtml(f.sourceStemOrigin)} <b>${escapeHtml(CAN[f.sourceStem])}</b>; sao đang ở <b>cung ${escapeHtml(f.targetHouse)}</b> (${escapeHtml(CHI[f.targetBranch]||"—")}). ${escapeHtml(PHI_HOA_KNOWLEDGE[f.hoa].verb)}.</div>${phiTraceHtml(f,c)}</div>`).join("")}<div class="star-help-foot"><b>QUY TẮC</b> là dữ liệu/luật an; <b>PHÁT HIỆN</b> là cấu trúc máy tự nhận diện; <b>NHẬN ĐỊNH</b> là lớp diễn giải tham khảo. Bấm từng dòng Hóa để xem chi tiết.</div>`;
}
function phiFlowPopupHtml(flow,c){
  const info=PHI_HOA_KNOWLEDGE[flow.hoa]||{core:"",verb:""},dst=phiHouseTopic(flow.targetHouse),annual=flow.layer==="annual";
  const sourceText=annual?`Lưu Niên lấy Can năm <b>${escapeHtml(CAN[flow.sourceStem])}</b> làm nguồn phát. ${escapeHtml(flow.sourceVisualNote||"")}.`:`${escapeHtml(flow.sourceLabel||flow.sourceHouse)} dùng <b>${escapeHtml(flow.sourceStemOrigin)}</b> ${escapeHtml(CAN[flow.sourceStem])}.`;
  return `<div class="star-help-head"><span class="star-help-name">${escapeHtml(flow.hoa.toUpperCase())}</span><span class="star-help-meta">${escapeHtml(flow.sourceLabel||flow.sourceHouse)} → ${escapeHtml(flow.targetHouse)}${flow.self?" • TỰ HÓA":""}</span></div><div class="star-help-kicker">${escapeHtml(CAN[flow.sourceStem])} • ${escapeHtml(flow.star.toUpperCase())} • ${escapeHtml(c.phiView?.title||phiModeLabel(c.annualMode))}</div><div class="star-help-detail"><div class="star-help-detail-title">1. Cách an trên tầng này</div><div class="star-help-detail-text">${sourceText} Theo bảng Tứ Hóa, Can ${escapeHtml(CAN[flow.sourceStem])} làm <b>${escapeHtml(flow.star)}</b> ${escapeHtml(flow.hoa)}; sao hiện ở <b>${escapeHtml(flow.targetHouse)}</b> (${escapeHtml(CHI[flow.targetBranch]||"—")}), nên ${escapeHtml(flow.hoa)} phi nhập cung này.</div></div><div class="star-help-detail"><div class="star-help-detail-title">2. Ý nghĩa ${escapeHtml(flow.hoa)}</div><div class="star-help-detail-text">${escapeHtml(info.core)}</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Nguồn phát → cung nhận</div><div class="star-help-detail-text">${escapeHtml(flow.sourceLabel||flow.sourceHouse)} ${escapeHtml(info.verb)} <b>${escapeHtml(flow.targetHouse)}</b> — chủ ${escapeHtml(dst)}. Sau đó phối bản tính <b>${escapeHtml(flow.star)}</b> và bộ sao tại cung nhận.</div></div><div class="star-help-detail"><div class="star-help-detail-title">4. Phi xuất / Phi nhập</div><div class="star-help-detail-text">Từ nguồn phát là <b>phi xuất</b>; tại ${escapeHtml(flow.targetHouse)} là <b>phi nhập</b>. Không tự gán xuất = xấu hay nhập = tốt.</div></div>${annual?`<div class="star-help-detail"><div class="star-help-detail-title">5. Tự Hóa?</div><div class="star-help-detail-text">Không gán Tự Hóa ở Lưu Niên chỉ vì cung nhận trùng mốc Lưu Thái Tuế, vì nguồn Can là Can năm.</div></div>`:(flow.self?`<div class="star-help-detail star-help-annual-reading"><div class="star-help-detail-title">5. Tự Hóa</div><div class="star-help-detail-text">Sao chủ nằm ngay cung đang dùng Can cung làm nguồn phát nên đánh dấu <b>TỰ HÓA</b>.</div></div>`:`<div class="star-help-detail"><div class="star-help-detail-title">5. Tự Hóa?</div><div class="star-help-detail-text">Không. Sao chủ nằm ở cung khác cung nguồn.</div></div>`)}<div class="star-help-detail"><div class="star-help-detail-title">6. Đối cung của cung nhận</div><div class="star-help-detail-text">Đối cung là <b>${escapeHtml(flow.oppositeHouse)}</b>; chỉ để tham chiếu trục cung, chưa tự động suy thành Kỵ xung.</div></div>${isNorthTuHoaMode(c.annualMode)?`<div class="star-help-detail"><div class="star-help-detail-title">7. Ngã / Tha cung</div><div class="star-help-detail-text">Cung phát <b>${northHouseTypeByName(flow.sourceHouse)==="nga"?"Ngã":"Tha"}</b> → cung nhận <b>${northHouseTypeByName(flow.targetHouse)==="nga"?"Ngã":"Tha"}</b>.</div></div>${flow.hoa==="Hóa Kỵ"?`<div class="star-help-detail star-help-annual-reading"><div class="star-help-detail-title">8. Kỵ xung & Chuyển Kỵ</div><div class="star-help-detail-text">Kỵ nhập <b>${escapeHtml(flow.targetHouse)}</b> nên đánh dấu trục xung tới <b>${escapeHtml(flow.oppositeHouse)}</b>. Cung nhận có thể tiếp tục dùng Can cung của nó để dò <b>Kỵ chuyển Kỵ</b>; các bước được hiển thị trực tiếp trên lá số sau khi chọn cung phát.</div></div>`:""}`:""}<div class="star-help-detail"><div class="star-help-detail-title">${isNorthTuHoaMode(c.annualMode)?"9":"7"}. Dấu vết tính toán</div>${phiTraceHtml(flow,c)}</div><div class="star-help-foot">${provenanceBadgesHtml()}<br>Đọc: tầng → Can phát → sao chủ → loại Hóa → cung nhận → phối toàn lá số.</div>`;
}
function phiHostPopupHtml(star,c){
  const targetBranch=Number(c.positions?.[star])||0,targetHouse=targetBranch?houseName(targetBranch,c.menh):"—",roles=[];for(let can=1;can<=10;can++){const idx=(THIEN_LUONG_TU_HOA[can]||[]).indexOf(star);if(idx>=0)roles.push({can,hoa:PHI_HOA_ORDER[idx]});}
  const incoming=[];if(c.phiView?.multiSource){for(let s=1;s<=12;s++)for(const f of (c.phiTuHoa?.[s]||[]))if(f.star===star)incoming.push(f);}else for(const f of (c.phiView?.flows||[]))if(f.star===star)incoming.push(f);
  const dict=(typeof STAR_POPUP_DICTIONARY!=="undefined"&&STAR_POPUP_DICTIONARY[star])||"",tl=(typeof starHelpInfo==="function"?starHelpInfo(star)?.tl:"")||"";
  return `<div class="star-help-head"><span class="star-help-name">${escapeHtml(star.toUpperCase())}</span><span class="star-help-meta">Sao chủ Tứ Hóa • cung ${escapeHtml(targetHouse)}</span></div><div class="star-help-kicker">${phiModeLabel(c.annualMode)} • ${escapeHtml(c.phiView?.title||"MỆNH BÀN")} • SAO NHẬN HÓA</div>${dict||tl?`<div class="star-help-detail"><div class="star-help-detail-title">1. Bản tính sao</div><div class="star-help-detail-text">${escapeHtml(dict||tl)}</div></div>`:""}<div class="star-help-detail"><div class="star-help-detail-title">2. Hóa gì theo 10 Can?</div><div class="star-help-detail-text">${roles.length?roles.map(r=>`<b>${escapeHtml(CAN[r.can])}</b> → ${escapeHtml(r.hoa)}`).join(" • "):"Không thuộc nhóm sao chủ Tứ Hóa."}</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Ở tầng đang xem nhận Phi Hóa từ đâu?</div><div class="star-help-detail-text">${incoming.length?incoming.map(f=>`<b>${escapeHtml(f.sourceLabel||f.sourceHouse)}</b> (${escapeHtml(CAN[f.sourceStem])}) → ${escapeHtml(f.hoa)}`).join("<br>"):"Không phải sao chủ của bốn Hóa ở nguồn đang chọn."}</div></div><div class="star-help-detail"><div class="star-help-detail-title">4. Cung nhận</div><div class="star-help-detail-text"><b>${escapeHtml(targetHouse)}</b> • ${escapeHtml(CHI[targetBranch]||"—")} • chủ ${escapeHtml(phiHouseTopic(targetHouse))}.</div></div><div class="star-help-foot">Luận đồng thời loại Hóa, tầng phát, sao chủ, cung nhận và toàn lá số.</div>`;
}
function northHousePopupHtml(branch,c){
  const house=houseName(branch,c.menh),type=northHouseTypeByName(house),label=type==="nga"?"NGÃ CUNG":"THA CUNG";
  const outgoing=c.phiTuHoa?.[branch]||[];
  const incoming=[];
  for(let source=1;source<=12;source++)for(const f of (c.phiTuHoa?.[source]||[]))if(f.targetBranch===branch)incoming.push({source,f});
  const ky=outgoing.find(f=>f.hoa==="Hóa Kỵ");
  const chain=northKyChainFromSource(branch,c,6);
  const active=[];
  if(branch===c.menh)active.push("Mệnh");
  if(branch===Number(c.phiDaiBranch))active.push("Đại Hạn");
  if(branch===yearBranch(c.viewYear))active.push(`Lưu Niên ${c.viewYear}`);
  if(branch===Number(c.phiTieuBranch))active.push(`Tiểu Hạn ${c.viewYear} (đối chiếu)`);
  const dynamicIncoming=[];
  for(const v of northConvergenceLayerViews(c))for(const f of (v.flows||[]))if(f.targetBranch===branch)dynamicIncoming.push(`${v.label}: ${PHI_HOA_LABEL[f.hoa]||f.hoa} ${f.star}`);
  return `<div class="star-help-head"><span class="star-help-name">${label}</span><span class="star-help-meta">${escapeHtml(house.toUpperCase())} • ${escapeHtml(CAN[houseCan(branch,c.canNam)])} ${escapeHtml(CHI[branch])}</span></div>
    <div class="star-help-kicker">TỨ HÓA BẮC PHÁI • MẠNG PHI HÓA CỦA CUNG</div>
    <div class="star-help-context">${provenanceBadgesHtml()}<br><b>Kết luận nhanh:</b> ${active.length?`đang được ${escapeHtml(active.join(" + "))} kích hoạt/đối chiếu.`:"không phải mốc vận chính đang chọn."}</div>
    <div class="star-help-detail"><div class="star-help-detail-title">1. Phân loại cung</div><div class="star-help-detail-text"><b>${escapeHtml(house)}</b> thuộc <b>${label}</b>. Ngã/Tha là hướng quan hệ, không đồng nghĩa tốt/xấu.</div></div>
    <div class="star-help-detail"><div class="star-help-detail-title">2. Cung này phát đi đâu?</div><div class="star-help-detail-text">${outgoing.length?outgoing.map(f=>`<b>${escapeHtml(PHI_HOA_LABEL[f.hoa]||f.hoa)}</b> ${escapeHtml(f.star)} → ${escapeHtml(f.targetHouse)}${f.self?" • TỰ HÓA":""}`).join("<br>"):"Không có dữ liệu Phi Hóa."}</div></div>
    <div class="star-help-detail"><div class="star-help-detail-title">3. Ai phi vào cung này?</div><div class="star-help-detail-text">${incoming.length?incoming.map(x=>`<b>${escapeHtml(houseName(x.source,c.menh))}</b> (${escapeHtml(CAN[houseCan(x.source,c.canNam)])}) → ${escapeHtml(PHI_HOA_LABEL[x.f.hoa]||x.f.hoa)} ${escapeHtml(x.f.star)}`).join("<br>"):"Không có cung nguyên cục nào phi Hóa vào cung này theo bảng đang dùng."}</div></div>
    <div class="star-help-detail"><div class="star-help-detail-title">4. Tầng vận nào đang chiếu vào đây?</div><div class="star-help-detail-text">${dynamicIncoming.length?dynamicIncoming.map(escapeHtml).join("<br>"):"Chưa có Mệnh/Đại Hạn/Lưu Niên đang phát Hóa trực tiếp vào cung này."}${active.length?`<br><b>Bản thân cung cũng là mốc:</b> ${escapeHtml(active.join(" • "))}.`:""}</div></div>
    ${ky?`<div class="star-help-detail star-help-annual-reading"><div class="star-help-detail-title">5. Tuyến Kỵ của cung</div><div class="star-help-detail-text"><b>${escapeHtml(house)}</b> → ${escapeHtml(ky.star)} Kỵ → <b>${escapeHtml(ky.targetHouse)}</b> → xung <b>${escapeHtml(ky.oppositeHouse)}</b>.</div></div>`:""}
    ${chain.length?`<div class="star-help-detail"><div class="star-help-detail-title">6. Chuyển Kỵ</div><div class="star-help-detail-text">${chain.map(x=>`CK${x.level}: ${escapeHtml(x.sourceHouse)} (${escapeHtml(CAN[x.sourceStem])}) → ${escapeHtml(x.star)} Kỵ → ${escapeHtml(x.targetHouse)}${x.self?" • TỰ":""}${x.cycle?" • VÒNG LẶP":""}`).join("<br>")}</div></div>`:""}
    <div class="star-help-foot"><b>Cách dùng:</b> “phát đi đâu” trả lời nguyên nhân từ cung này; “ai phi vào” trả lời tác động nhận; “tầng vận” cho biết lúc nào cấu trúc dễ được kích hoạt.</div>`;
}
function northLaiNhanPopupHtml(branch,c){
  const house=houseName(branch,c.menh),stem=houseCan(branch,c.canNam),natal=northNatalHoaFlows(c),all=northLaiNhanBranches(c);
  return `<div class="star-help-head"><span class="star-help-name">LAI NHÂN CUNG</span><span class="star-help-meta">${escapeHtml(house.toUpperCase())} • Can ${escapeHtml(CAN[stem])}</span></div><div class="star-help-kicker">BẮC PHÁI / KHÂM THIÊN • CAN NĂM SINH ${escapeHtml(CAN[c.canNam])}</div><div class="star-help-detail"><div class="star-help-detail-title">1. Cách xác định</div><div class="star-help-detail-text">Phần mềm lấy cung có <b>Thiên Can cung trùng Thiên Can năm sinh</b>. Theo quy ước Khâm Thiên đang dùng, vị trí Tý/Sửu không lấy làm Lai Nhân; vì Can lặp theo vòng 10, dùng vị trí Dần/Mão tương ứng.</div></div><div class="star-help-detail"><div class="star-help-detail-title">2. Lai Nhân trên lá số này</div><div class="star-help-detail-text">${all.length?all.map(b=>`<b>${escapeHtml(houseName(b,c.menh))}</b> (${escapeHtml(CAN[houseCan(b,c.canNam)])} ${escapeHtml(CHI[b])})`).join(" • "):"Không xác định."}</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Sinh niên Tứ Hóa</div><div class="star-help-detail-text">${natal.map(f=>`${escapeHtml(PHI_HOA_LABEL[f.hoa]||f.hoa)}: <b>${escapeHtml(f.star)}</b> → ${escapeHtml(f.targetHouse)}`).join("<br>")}</div></div><div class="star-help-detail"><div class="star-help-detail-title">4. Vai trò</div><div class="star-help-detail-text">Lai Nhân Cung được dùng như đầu mối truy nguyên của Sinh niên Tứ Hóa. Khi luận vẫn phải phối vị trí bốn Hóa năm sinh, Ngã/Tha cung và các phi hóa phát sinh.</div></div><div class="star-help-foot">Đây là quy ước Khâm Thiên Tứ Hóa, được tách riêng khỏi chế độ Phi Tứ Hóa Thiên Lương.</div>`;
}
function northNatalPopupHtml(index,c){
  const f=northNatalHoaFlows(c)[Number(index)];if(!f)return "";const type=northHouseTypeByName(f.targetHouse);
  return `<div class="star-help-head"><span class="star-help-name">SINH NIÊN ${escapeHtml((PHI_HOA_LABEL[f.hoa]||f.hoa).toUpperCase())}</span><span class="star-help-meta">${escapeHtml(f.star)} → ${escapeHtml(f.targetHouse)}</span></div><div class="star-help-kicker">CAN NĂM SINH ${escapeHtml(CAN[c.canNam])} • ${type==="nga"?"NGÃ CUNG":"THA CUNG"}</div><div class="star-help-detail"><div class="star-help-detail-title">1. Vị trí</div><div class="star-help-detail-text">Can năm sinh <b>${escapeHtml(CAN[c.canNam])}</b> làm <b>${escapeHtml(f.star)}</b> ${escapeHtml(f.hoa)}; sao tọa tại <b>${escapeHtml(f.targetHouse)}</b> (${escapeHtml(CHI[f.targetBranch]||"—")}).</div></div><div class="star-help-detail"><div class="star-help-detail-title">2. Tính chất</div><div class="star-help-detail-text">${escapeHtml(PHI_HOA_KNOWLEDGE[f.hoa]?.core||"")}</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Ngã / Tha</div><div class="star-help-detail-text">Cung nhận thuộc <b>${type==="nga"?"Ngã cung":"Tha cung"}</b>. Đây là lớp phân loại để theo dõi hướng khí, không phải kết luận cát/hung độc lập.</div></div>`;
}
function northKyXungPopupHtml(level,c){
  const source=Number(__phiSelectedSource)||Number(c.phiView?.sourceBranch)||c.menh,chain=northKyChainFromSource(source,c),row=chain[Number(level)];if(!row)return "";
  return `<div class="star-help-head"><span class="star-help-name">KỴ XUNG</span><span class="star-help-meta">${escapeHtml(row.targetHouse)} ↔ ${escapeHtml(row.oppositeHouse)}</span></div><div class="star-help-kicker">${row.level===0?"KỴ GỐC":`CHUYỂN KỴ ${row.level}`} • ${escapeHtml(row.star.toUpperCase())}</div><div class="star-help-detail"><div class="star-help-detail-title">1. Trục Kỵ</div><div class="star-help-detail-text"><b>${escapeHtml(row.sourceHouse)}</b> dùng Can ${escapeHtml(CAN[row.sourceStem])} làm <b>${escapeHtml(row.star)}</b> Hóa Kỵ nhập <b>${escapeHtml(row.targetHouse)}</b>; đối cung <b>${escapeHtml(row.oppositeHouse)}</b> được đánh dấu Kỵ xung.</div></div><div class="star-help-detail"><div class="star-help-detail-title">2. Cách hiểu</div><div class="star-help-detail-text">Kỵ nhập tạo điểm dính/vướng tại cung nhận và đồng thời tạo một trục đối xung với cung đối diện. Phần mềm đánh dấu trục để nghiên cứu, không mặc định suy “xung = hung tuyệt đối”.</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Ngã / Tha</div><div class="star-help-detail-text">Cung nhận: <b>${northHouseTypeByName(row.targetHouse)==="nga"?"Ngã":"Tha"}</b> • Cung bị xung: <b>${northHouseTypeByName(row.oppositeHouse)==="nga"?"Ngã":"Tha"}</b>.</div></div>`;
}
function northChainPopupHtml(level,c){
  const source=Number(__phiSelectedSource)||Number(c.phiView?.sourceBranch)||c.menh,chain=northKyChainFromSource(source,c),row=chain[Number(level)];if(!row)return "";
  const rows=chain.map(x=>`<tr><td>${x.level===0?"Kỵ gốc":`CK${x.level}`}</td><td>${escapeHtml(x.sourceHouse)} (${escapeHtml(CAN[x.sourceStem])})</td><td>${escapeHtml(x.star)}</td><td>${escapeHtml(x.targetHouse)}</td><td>${escapeHtml(x.oppositeHouse)}</td></tr>`).join("");
  return `<div class="star-help-head"><span class="star-help-name">CHUYỂN KỴ</span><span class="star-help-meta">Bước ${row.level} • ${escapeHtml(row.sourceHouse)} → ${escapeHtml(row.targetHouse)}</span></div><div class="star-help-kicker">KỴ CHUYỂN KỴ • THEO CAN CUNG NHẬN</div><div class="star-help-detail"><div class="star-help-detail-title">1. Quy tắc phần mềm</div><div class="star-help-detail-text">Sau khi Hóa Kỵ nhập một cung, lấy <b>Thiên Can của cung nhận</b> làm nguồn mới, tìm sao Hóa Kỵ của Can đó và lần tiếp tới cung chứa sao. Chuỗi dừng khi gặp tự hóa, lặp vòng hoặc đạt giới hạn an toàn.</div></div><div class="star-help-detail"><div class="star-help-detail-title">2. Bước đang chọn</div><div class="star-help-detail-text">Can <b>${escapeHtml(CAN[row.sourceStem])}</b> của ${escapeHtml(row.sourceHouse)} làm <b>${escapeHtml(row.star)}</b> Hóa Kỵ → <b>${escapeHtml(row.targetHouse)}</b>${row.self?" • TỰ HÓA":""}${row.cycle?" • GẶP VÒNG LẶP":""}.</div></div><div class="star-help-detail"><div class="star-help-detail-title">3. Toàn chuỗi đang dò</div><table class="north-chain-table"><thead><tr><th>Bước</th><th>Cung phát</th><th>Sao Kỵ</th><th>Cung nhận</th><th>Kỵ xung</th></tr></thead><tbody>${rows}</tbody></table></div><div class="star-help-foot">Chuỗi Chuyển Kỵ là công cụ truy quan hệ; không dùng số bước để chấm điểm cát/hung.</div>`;
}
function showPhiTuHoaHelp(target){
  if(!phiPopupEnabled()){hideStarHelp();return;}
  const c=window.__chartData;
  if(!c)return;
  const tip=ensureStarHelpPopup();
  const kind=target.dataset.phiHelp||"";
  let html="";
  if(kind==="overview")html=phiOverviewPopupHtml(c);
  else if(kind==="north-convergence")html=northConvergencePopupHtml(c);
  else if(kind==="host"){
    const star=target.dataset.phiStar||"";
    if(star)html=phiHostPopupHtml(star,c);
  }
  else if(kind==="source"){
    const source=Number(target.dataset.phiSourceBranch)||0;
    if(source)html=phiSourcePopupHtml(source,c);
  }else if(kind==="flow"){
    const source=Number(target.dataset.phiSourceBranch)||0;
    const index=Number(target.dataset.phiIndex);
    const flow=(c.phiView?.multiSource ? c.phiTuHoa?.[source]?.[index] : c.phiView?.flows?.[index]);
    if(flow)html=phiFlowPopupHtml(flow,c);
  }else if(kind==="north-house"&&isNorthTuHoaMode(c.annualMode)){
    html=northHousePopupHtml(Number(target.dataset.northBranch)||0,c);
  }else if(kind==="north-lai"&&isNorthTuHoaMode(c.annualMode)){
    html=northLaiNhanPopupHtml(Number(target.dataset.northBranch)||0,c);
  }else if(kind==="north-natal"&&isNorthTuHoaMode(c.annualMode)){
    html=northNatalPopupHtml(Number(target.dataset.northHoaIndex),c);
  }else if(kind==="north-kyxung"&&isNorthTuHoaMode(c.annualMode)){
    html=northKyXungPopupHtml(Number(target.dataset.northLevel)||0,c);
  }else if(kind==="north-chain"&&isNorthTuHoaMode(c.annualMode)){
    html=northChainPopupHtml(Number(target.dataset.northLevel)||0,c);
  }
  if(!html){hideStarHelp();return;}
  tip.innerHTML=html;
  tip.classList.add("is-visible");
  tip.setAttribute("aria-hidden","false");
  starHelpPosition(tip,target);
}
let __phiSelectedSource=null;
function clearPhiHighlights(){
  const chart=document.querySelector("#chart");
  if(!chart)return;
  chart.querySelectorAll(".phi-source-active,.phi-target-active,.north-ky-xung-active,.north-chain-active").forEach(x=>x.classList.remove("phi-source-active","phi-target-active","north-ky-xung-active","north-chain-active"));
  chart.querySelectorAll(".phi-receive-badges,.north-dynamic-badges").forEach(x=>x.remove());
}
function addNorthDynamicBadge(p,text,cls,kind,level){
  let box=p.querySelector(".north-dynamic-badges");
  if(!box){box=document.createElement("div");box.className="north-dynamic-badges";p.appendChild(box);}
  const b=document.createElement("button");b.type="button";b.className=`north-dynamic-badge ${cls}`;b.textContent=text;b.dataset.phiHelp=kind;b.dataset.northLevel=String(level);box.appendChild(b);
}
function activateNorthSource(source,c){
  if(!isNorthTuHoaMode(c.annualMode))return;
  const chart=document.querySelector("#chart"),chain=northKyChainFromSource(source,c);
  chain.forEach((row,i)=>{
    const target=chart.querySelector(`.palace[data-branch="${row.targetBranch}"]`);
    if(target&&i>0){target.classList.add("north-chain-active");addNorthDynamicBadge(target,`CK${i} ${HOA_SHORT[row.star]||row.star}`,"chuyen-ky","north-chain",i);}
    const opp=chart.querySelector(`.palace[data-branch="${row.oppositeBranch}"]`);
    if(opp){opp.classList.add("north-ky-xung-active");addNorthDynamicBadge(opp,i===0?"KỴ XUNG":`XUNG CK${i}`,"ky-xung","north-kyxung",i);}
  });
}
function activatePhiSource(sourceBranch){
  const c=window.__chartData;if(!c||!isPhiDisplayMode(c.annualMode))return;const v=c.phiView;
  const source=v?.multiSource?(Number(sourceBranch)||0):(Number(v?.sourceBranch)||0);if(!source)return;
  __phiSelectedSource=source;clearPhiHighlights();const chart=document.querySelector("#chart"),src=chart.querySelector(`.palace[data-branch="${source}"]`);if(src)src.classList.add("phi-source-active");
  phiCurrentFlows(c,source).forEach(flow=>{if(!flow.targetBranch)return;const p=chart.querySelector(`.palace[data-branch="${flow.targetBranch}"]`);if(!p)return;p.classList.add("phi-target-active");let box=p.querySelector(".phi-receive-badges");if(!box){box=document.createElement("div");box.className="phi-receive-badges";p.appendChild(box);}const badge=document.createElement("span"),cls=PHI_HOA_CLASS[flow.hoa]||"";badge.className=`phi-receive-badge ${cls}`;badge.textContent=`← ${PHI_HOA_LABEL[flow.hoa]||flow.hoa}`;box.appendChild(badge);});
  activateNorthSource(source,c);
}
function bindPhiTuHoaHelpPopup(){
  if(document.documentElement.dataset.phiTuHoaHelpBound==="1")return;
  document.documentElement.dataset.phiTuHoaHelpBound="1";
  let active=null;

  /* V3.3.143 — Popup Phi Tứ Hóa/Bắc Phái là vùng tương tác thật.
     Khi con trỏ đi từ đối tượng nguồn sang popup, popup phải tiếp tục mở
     để người dùng cuộn bánh xe hoặc kéo scrollbar. Popup chỉ đóng khi
     bấm ra ngoài, đổi chế độ, hoặc một popup khác thay thế nội dung. */
  document.addEventListener("pointerover",e=>{
    if(e.pointerType&&e.pointerType!=="mouse"&&e.pointerType!=="pen")return;
    if(!phiPopupEnabled()){active=null;return;}
    if(e.target.closest?.("#starHelpPopup"))return;
    const t=e.target.closest?.("[data-phi-help]");
    if(!t||(t===active&&starHelpPopupIsVisible()))return;
    active=t;showPhiTuHoaHelp(t);
  });

  document.addEventListener("pointerout",e=>{
    if(!active||!phiPopupEnabled())return;
    if(e.target.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    const from=e.target.closest?.("[data-phi-help]");
    if(from!==active)return;
    if(e.relatedTarget?.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    /* Có khoảng hở giữa nhãn và popup nên không đóng tức thời. Cho người dùng
       900ms để đưa chuột qua khoảng hở; vào popup sẽ tự hủy lịch đóng. */
    scheduleStarHelpClose(()=>{if(active===from)active=null;},900);
  });

  document.addEventListener("pointerdown",e=>{
    if(!phiPopupEnabled())return;
    /* Bấm/kéo trong popup, kể cả scrollbar: tuyệt đối không đóng. */
    if(e.target.closest?.("#starHelpPopup"))return;
    const t=e.target.closest?.("[data-phi-help]");
    if(t){
      active=t;
      if(e.pointerType==="touch")showPhiTuHoaHelp(t);
      return;
    }
    /* Bấm ra ngoài popup và ngoài đối tượng Phi Hóa thì đóng. */
    if(active){active=null;hideStarHelp();}
  });

  document.addEventListener("click",e=>{
    if(!phiPopupEnabled())return;
    if(e.target.closest?.("#starHelpPopup"))return;
    const t=e.target.closest?.("[data-phi-help]");
    if(!t)return;
    const source=Number(t.dataset.phiSourceBranch)||0;
    if(source)activatePhiSource(source);
    setTimeout(()=>{showPhiTuHoaHelp(t);active=t;},0);
    if(t.tagName==="BUTTON")e.preventDefault();
  });

  /* Cuộn ngay trong popup không được làm mất popup; cuộn trang ngoài popup
     vẫn để các handler chung xử lý theo hành vi hiện có. */
  document.addEventListener("scroll",e=>{
    if(!phiPopupEnabled())return;
    if(e.target?.closest?.("#starHelpPopup"))return;
  },true);
}

/* V3.3.91 — POPUP CAN–CHI CỦA TỪNG CUNG.
   Nhãn Can–Chi ở góc cung là tọa độ địa bàn được an Can theo Ngũ Hổ Độn
   từ Thiên Can năm sinh. Popup giải thích cấu tạo, quan hệ Ngũ Hành và Nạp âm,
   nhưng không dùng riêng lớp này để kết luận cát/hung của cung. */
function palaceCanChiRelationDetail(rel){
  const can=rel.canElementName,chi=rel.chiElementName;
  if(rel.rank===1)return `${can} sinh ${chi}`;
  if(rel.rank===2)return `Can và Chi đồng hành ${can}`;
  if(rel.rank===3)return `${chi} sinh ${can}`;
  if(rel.rank===4)return `${can} khắc ${chi}`;
  if(rel.rank===5)return `${chi} khắc ${can}`;
  return "—";
}
function showPalaceCanChiHelp(target){
  if(!starHelpEnabled()){ hideStarHelp(); return; }
  const stem=Number(target.dataset.houseStem);
  const branch=Number(target.dataset.houseBranch);
  const yearStem=Number(target.dataset.yearStem);
  if(!(stem>=1&&stem<=10&&branch>=1&&branch<=12&&yearStem>=1&&yearStem<=10)){
    hideStarHelp();return;
  }
  const house=target.dataset.houseName||"";
  const tip=ensureStarHelpPopup();
  const stemE=stemElement(stem),branchE=branchElement(branch);
  const stemPolarity=stemYang(stem)===1?"Dương":"Âm";
  const branchPolarity=branchYang(branch)===1?"Dương":"Âm";
  const rel=canChiRelation(stem,branch);
  const na=napAm(stem,branch);
  const danStem=houseCan(3,yearStem);
  const label=`${CAN[stem]} ${CHI[branch]}`;
  const napText=na?`${na.name} • ${ELEMENT_LABEL[na.e]}`:"—";
  const relationDetail=palaceCanChiRelationDetail(rel);
  tip.innerHTML=`
    <div class="star-help-head">
      <span class="star-help-name">${escapeHtml(label)}</span>
      <span class="star-help-meta">${escapeHtml(house?`Cung ${house}`:"Can–Chi cung")}</span>
    </div>
    <div class="star-help-kicker">CAN–CHI ĐỊA BÀN CUNG</div>
    <div class="star-help-detail">
      <div class="star-help-detail-title">Thiên Can</div>
      <div class="star-help-detail-text"><b>${escapeHtml(CAN[stem])}</b>: ${stemPolarity} ${escapeHtml(ELEMENT_LABEL[stemE])}</div>
    </div>
    <div class="star-help-detail">
      <div class="star-help-detail-title">Địa Chi</div>
      <div class="star-help-detail-text"><b>${escapeHtml(CHI[branch])}</b>: ${branchPolarity} ${escapeHtml(ELEMENT_LABEL[branchE])}</div>
    </div>
    <div class="star-help-detail">
      <div class="star-help-detail-title">Quan hệ Can–Chi</div>
      <div class="star-help-detail-text"><b>${escapeHtml(rel.label)}</b> • ${escapeHtml(relationDetail)}</div>
    </div>
    <div class="star-help-detail">
      <div class="star-help-detail-title">Nạp âm 60 Hoa Giáp</div>
      <div class="star-help-detail-text">${escapeHtml(napText)}</div>
    </div>
    <div class="star-help-detail">
      <div class="star-help-detail-title">Cách an</div>
      <div class="star-help-detail-text">Ngũ Hổ Độn theo Can năm sinh <b>${escapeHtml(CAN[yearStem])}</b>: Dần khởi <b>${escapeHtml(CAN[danStem])} Dần</b>, đi thuận từng địa chi; đến ${escapeHtml(CHI[branch])} an <b>${escapeHtml(label)}</b>.</div>
    </div>
    <div class="star-help-foot">Can–Chi cung là lớp nền của địa bàn. Quan hệ sinh/khắc và Nạp âm giúp mô tả cấu trúc của cung nhưng không đủ để kết luận cát/hung. Khi luận cần phối hợp chính tinh, phụ tinh, Mệnh–Thân, Tam phương Tứ chính, Tuần–Triệt và vận hạn.</div>`;
  tip.classList.add("is-visible");
  tip.setAttribute("aria-hidden","false");
  starHelpPosition(tip,target);
}

/* V3.3.91 — POPUP GIẢI THÍCH CẤU TRÚC CUNG VÀ CÁC LỚP HẠN.
   Chỉ hoạt động ở chế độ Đầy đủ lưu niên, dùng chung khung popup tra cứu.
   Mục tiêu là giải nghĩa trực tiếp các nhãn trên lá số: tên cung, Đại Hạn,
   ĐH.x, LĐH.x và số tuổi bắt đầu Đại Hạn của từng cung. */
const HOUSE_HELP_DATA=Object.freeze({
  "Mệnh":{
    meaning:"Cung Mệnh mô tả nền tảng bản thân: khí chất, khuynh hướng hành xử, năng lực và cách đương số tiếp nhận hoàn cảnh.",
    read:"Khi luận phải phối hợp Thân, tam hợp Mệnh–Tài–Quan, đối cung Thiên Di, chính tinh, phụ tinh và vận hạn; không dùng riêng một cung để kết luận toàn bộ cuộc đời."
  },
  "Phụ Mẫu":{
    meaning:"Cung Phụ Mẫu chủ quan hệ với cha mẹ, nền gia đình trực hệ, mức độ nâng đỡ hoặc khoảng cách với bậc sinh thành; trong một số phép luận còn phản ánh cấp trên và người bảo trợ.",
    read:"Cần đối chiếu thêm Phúc Đức, Mệnh, Huynh Đệ và các sao chỉ phụ mẫu; không nên suy trực tiếp thành tuổi thọ hay số phận cha mẹ chỉ từ một cung."
  },
  "Phúc Đức":{
    meaning:"Cung Phúc Đức phản ánh nền phúc, môi trường họ tộc, đời sống tinh thần, khả năng hưởng thụ và sức bền tâm lý của đương số.",
    read:"Đây là cung nền quan trọng khi đánh giá mức độ bền của một cách cục; cần xét cùng Mệnh, Điền Trạch, Phu Thê và toàn tam hợp."
  },
  "Điền Trạch":{
    meaning:"Cung Điền Trạch chủ nhà cửa, bất động sản, môi trường cư trú, khả năng tạo lập và duy trì cơ sở vật chất lâu dài.",
    read:"Nên phối hợp với Tài Bạch, Phúc Đức, Mệnh và các sao tài sản; không đồng nhất một cách máy móc với số lượng nhà đất."
  },
  "Quan Lộc":{
    meaning:"Cung Quan Lộc chủ nghề nghiệp, công việc, vị thế xã hội, trách nhiệm và phương thức phát triển sự nghiệp.",
    read:"Quan Lộc phải đọc cùng Mệnh và Tài Bạch trong tam hợp Mệnh–Tài–Quan, đồng thời xét Thiên Di để thấy môi trường hành nghề."
  },
  "Nô Bộc":{
    meaning:"Cung Nô Bộc chủ quan hệ với bạn bè, đồng nghiệp, cộng sự, cấp dưới và mạng lưới xã hội mà đương số trực tiếp sử dụng hoặc phụ thuộc.",
    read:"Cần xét cùng Huynh Đệ, Thiên Di, Quan Lộc và tính chất sao hội hợp để phân biệt trợ lực, cạnh tranh hay lệ thuộc."
  },
  "Thiên Di":{
    meaning:"Cung Thiên Di chủ hoàn cảnh bên ngoài, quan hệ xã hội, việc đi xa, ra ngoài môi trường quen thuộc và cách đương số được thế giới bên ngoài tiếp nhận.",
    read:"Thiên Di là đối cung của Mệnh nên phải đọc thành một cặp Mệnh–Di; không nên chỉ hiểu đơn giản là đi xa hay xuất ngoại."
  },
  "Tật Ách":{
    meaning:"Cung Tật Ách chủ điểm yếu của thể chất và tâm lý, tai ách, áp lực và cách cơ thể phản ứng trước hoàn cảnh bất lợi theo hệ quy chiếu Tử Vi.",
    read:"Đây là lớp luận mệnh lý truyền thống, không phải chẩn đoán y khoa. Khi luận cần phối hợp Mệnh, Phúc Đức, vận hạn và toàn bộ bộ sao."
  },
  "Tài Bạch":{
    meaning:"Cung Tài Bạch chủ khả năng tạo thu nhập, sử dụng và quản trị nguồn lực vật chất, dòng tiền, cách kiếm tiền và quan hệ của đương số với tài sản.",
    read:"Tài Bạch không đồng nghĩa trực tiếp với giàu hay nghèo. Cần đọc cùng Mệnh và Quan Lộc trong tam hợp Mệnh–Tài–Quan, đồng thời xét Điền Trạch, Phúc Đức và vận hạn để đánh giá khả năng tạo, giữ và luân chuyển tài sản."
  },
  "Tử Tức":{
    meaning:"Cung Tử Tức chủ quan hệ với con cái, việc sinh dưỡng, hậu thế và phần trách nhiệm hoặc niềm vui gắn với con cái.",
    read:"Cần xét cùng Phu Thê, Phúc Đức, Mệnh và các sao sinh dưỡng; không dùng một cung để kết luận tuyệt đối về số con hay khả năng sinh sản."
  },
  "Phu Thê":{
    meaning:"Cung Phu Thê chủ quan hệ hôn phối, mô thức gắn bó lâu dài, cách đương số tương tác với người phối ngẫu và những vấn đề nổi bật trong đời sống đôi lứa.",
    read:"Cần đọc cùng Mệnh, Phúc Đức, Tử Tức, Thiên Di và vận hạn; không nên suy duyên hay hôn nhân từ một sao đơn độc."
  },
  "Huynh Đệ":{
    meaning:"Cung Huynh Đệ chủ quan hệ với anh chị em ruột và người cùng thế hệ gần gũi trong gia đình; cũng phản ánh mức độ tương trợ hoặc khác biệt trong quan hệ ngang hàng thân cận.",
    read:"Nên phối hợp với Phụ Mẫu, Nô Bộc, Mệnh và các sao hội hợp để phân biệt quan hệ huyết thống với quan hệ xã hội."
  }
});

function houseHelpInfo(name){
  return HOUSE_HELP_DATA[name]||{
    meaning:`Cung ${name} là một trong 12 cung chức năng của lá số.`,
    read:"Cần phối hợp chính tinh, phụ tinh, Tam phương Tứ chính, Tuần–Triệt và vận hạn; không dùng riêng tên cung để kết luận."
  };
}


/* V3.3.112 — POPUP TUẦN / TRIỆT THEO TỬ VI NGHIỆM LÝ THIÊN LƯƠNG.
   Nguồn nội dung: phần Tuần–Triệt trong Tử Vi Nghiệm Lý 1974 và phần
   “Tuần - Triệt và ảnh hưởng ra sao?” của Tử Vi Thiên Lương Tổng Hợp.
   Chỉ diễn giải nghiệm lý; không biến Tuần/Triệt thành kết luận cát-hung độc lập. */
const TL_VOID_META=Object.freeze({
  "TUẦN":Object.freeze({
    full:"Tuần Trung Không Vong",
    essence:"Tuần là lực kìm hãm và điều tiết: làm sự việc chậm, phải qua một nhịp trung gian rồi mới phát. Cát bị giảm độ phát, hung cũng được giảm lực.",
    contrast:"Hình tượng Thiên Lương: cây cầu/gạch nối — phải chùng lại trước khi qua, tác động kéo dài và từ từ hơn Triệt.",
    school:"Trong phần nghiệm lý, Tuần được liên hệ với phía Âm/Địa Chi và có đoạn kinh nghiệm xem Tuần thiên Hỏa. Cách gán Hỏa này chỉ nên dùng như lớp nghiệm lý phụ, không thay thế toàn bộ cấu trúc cung–sao–Mệnh."
  }),
  "TRIỆT":Object.freeze({
    full:"Triệt Lộ Không Vong",
    essence:"Triệt là lực phong tỏa và cắt ngang: cái đang tốt khó phát trọn, cái đang xấu cũng có thể bị chặn bớt. Tác động trực diện và quyết liệt hơn Tuần.",
    contrast:"Theo Thiên Lương, Triệt giống cái thắng trước: chặn nhanh, cắt mạch và làm biến dạng đường phát của cung/sao bị án.",
    school:"Trong phần nghiệm lý, Triệt được liên hệ với phía Dương/Thiên Can và có đoạn kinh nghiệm xem Triệt thiên Kim. Cách gán Kim này chỉ nên dùng như lớp nghiệm lý phụ, không thay thế toàn bộ cấu trúc cung–sao–Mệnh."
  })
});
function tlVoidPairFromTarget(target){
  const raw=String(target?.dataset?.voidPair||"").split(",").map(Number).filter(n=>n>=1&&n<=12);
  return raw.length===2?raw:null;
}
function tlVoidPolarityLabel(branch){return branchYang(branch)===1?"Dương":"Âm"}
function tlVoidRoleLabels(c,branch){
  const roles=[];
  if(c?.menh===branch)roles.push("Mệnh");
  if(c?.than===branch)roles.push("Thân");
  if(c?.daiBranch===branch)roles.push("Đại Hạn hiện hành");
  if(c?.luuDaiBranch===branch)roles.push("Lưu Đại Hạn năm xem");
  if(c?.tieuBranch===branch)roles.push("Tiểu Hạn năm xem");
  return roles;
}
const TL_VOID_HOUSE_SHORT=Object.freeze({
  "Mệnh":"bản thân, khí chất, hướng hành động và khả năng tự chủ",
  "Phụ Mẫu":"cha mẹ, cấp trên, người nâng đỡ và nền gia đình trực hệ",
  "Phúc Đức":"nền phúc, họ tộc, hậu phương, tinh thần và mức an tâm",
  "Điền Trạch":"nhà cửa, chỗ ở, bất động sản và nền tảng vật chất lâu dài",
  "Quan Lộc":"công việc, nghề nghiệp, chức trách, vị thế và thành tích",
  "Nô Bộc":"bạn bè, đồng nghiệp, cấp dưới, cộng sự và mạng lưới quan hệ",
  "Thiên Di":"môi trường bên ngoài, đi lại, giao tiếp, đối ngoại và thay đổi địa bàn",
  "Tật Ách":"sức khỏe, áp lực thân–tâm, tai ách và điểm yếu cần chăm sóc",
  "Tài Bạch":"thu nhập, chi tiêu, dòng tiền, tài sản và cách quản trị nguồn lực",
  "Tử Tức":"con cái, việc nuôi dưỡng và các dự án/sản phẩm do mình tạo ra",
  "Phu Thê":"hôn nhân, người phối ngẫu và quan hệ một–một có tính cam kết",
  "Huynh Đệ":"anh chị em, người cùng thế hệ và quan hệ ngang hàng thân cận"
});
function tlVoidBranchHouseHtml(c,branch,pct){
  const house=c?.menh?houseName(branch,c.menh):"—";
  const roles=tlVoidRoleLabels(c,branch);
  const roleText=roles.length?` • <b>${escapeHtml(roles.join(" + "))}</b>`:"";
  const topic=TL_VOID_HOUSE_SHORT[house]||`các vấn đề của cung ${house}`;
  return `<b>${escapeHtml(CHI[branch])} (${tlVoidPolarityLabel(branch)}) • cung ${escapeHtml(house)} • ~${pct}%</b>${roleText}<br><span style="opacity:.88">Trọng tâm: ${escapeHtml(topic)}.</span>`;
}
function tlVoidTrietAnText(can){
  const pair=findTriet(can)||[];
  return `Triệt an theo Thiên Can năm sinh. Bảng an đang áp dụng theo hệ Thiên Lương: Giáp/Kỷ → Thân–Dậu; Ất/Canh → Ngọ–Mùi; Bính/Tân → Thìn–Tỵ; Đinh/Nhâm → Dần–Mão; Mậu/Quý → Tý–Sửu. Với Can <b>${escapeHtml(CAN[can]||"—")}</b>, lá số này an Triệt tại <b>${escapeHtml(pair.map(x=>CHI[x]).join("–")||"—")}</b>.`;
}
function tlVoidTuanAnText(c,pair){
  return `Tuần là “gạch nối/cây cầu” ở chỗ kết thúc một vòng 10 Can rồi sang đoạn kế tiếp của vòng 60 Hoa Giáp. Trên lá số này, Tuần án đúng biên <b>${escapeHtml(pair.map(x=>CHI[x]).join("–"))}</b>. Chương trình xác định vị trí từ Can–Chi năm sinh và luôn đặt Tuần giữa một cung Dương với một cung Âm.`;
}
function tlVoidCurrentReleaseState(c,otherPair,aligned,birthPol){
  if(!c || !Array.isArray(otherPair) || otherPair.length!==2 || !c.daiBranch || c.daiStartAge==null || c.ageAtView==null)return "";
  const n=c.ageAtView-c.daiStartAge;
  if(n<0||n>9)return "";
  const strong=otherPair.find(b=>branchYang(b)===birthPol);
  const weak=otherPair.find(b=>branchYang(b)!==birthPol);
  let open=false,why="";
  if(aligned){
    open=c.daiBranch===strong;
    if(c.daiBranch===strong)why=`Đại Hạn hiện đang ở ${CHI[strong]}, đúng nhánh cùng âm/dương tuổi`;
    else if(otherPair.includes(c.daiBranch))why=`Đại Hạn hiện ở ${CHI[c.daiBranch]}, là nhánh còn lại của cặp`;
  }else{
    open=(c.daiBranch===strong&&n<=4)||(c.daiBranch===weak&&n>=5);
    if(c.daiBranch===strong)why=`Đại Hạn ở ${CHI[strong]}, đang năm thứ ${n+1}/10; cửa tháo gỡ của nhánh này là 5 năm đầu`;
    else if(c.daiBranch===weak)why=`Đại Hạn ở ${CHI[weak]}, đang năm thứ ${n+1}/10; cửa tháo gỡ của nhánh này là 5 năm sau`;
  }
  if(!why)return "";
  return `<br><b>Đối chiếu năm đang xem:</b> ${escapeHtml(why)} → <b>${open?"ĐANG Ở CỬA THÁO GỠ":"CHƯA/ KHÔNG Ở CỬA THÁO GỠ"}</b> theo riêng công thức này.`;
}
function tlVoidReleaseHtml(c,kind,pair){
  if(!c)return "Không có đủ dữ liệu lá số để đối chiếu tháo gỡ.";
  const otherKind=kind==="TUẦN"?"TRIỆT":"TUẦN";
  const otherPair=(kind==="TUẦN"?c.marks?.triet:c.marks?.tuan)||[];
  const both=sameVoidPair(c.marks?.tuan||[],c.marks?.triet||[]);
  const hits=[{name:"Mệnh",branch:c.menh},{name:"Thân",branch:c.than}].filter(x=>pair.includes(x.branch));
  if(!hits.length){
    return `Cặp ${escapeHtml(pair.map(x=>CHI[x]).join("–"))} <b>không án trực tiếp Mệnh/Thân</b>, nên chưa kích hoạt luật “một Không gặp Không kia thì tháo”. Trọng tâm vẫn là hai cung chịu lực ~70/30 ở trên.`;
  }
  if(both){
    return `<b>Tuần và Triệt cùng án một cặp có ${escapeHtml(hits.map(x=>x.name).join("/"))}</b>: theo Thiên Lương, không được hiểu là hai cái tự phá nhau. Trường hợp Mệnh/Thân cùng chịu cả hai thì không còn một Không đối ứng để tháo; vận tốt cũng bị giảm, tài liệu nêu mức hưởng tối đa khoảng <b>50%</b>.`;
  }
  const birthPol=stemYang(c.canNam);
  const birthPolText=birthPol===1?"Dương":"Âm";
  const strongOther=otherPair.find(b=>branchYang(b)===birthPol);
  const weakOther=otherPair.find(b=>branchYang(b)!==birthPol);
  return hits.map(hit=>{
    const aligned=branchYang(hit.branch)===birthPol;
    let rule="";
    if(aligned){
      rule=`<b>${hit.name}</b> chịu ${kind} ở phía cùng âm/dương tuổi. Khi Đại Hạn gặp ${otherKind}, nhánh <b>${CHI[strongOther]} (${birthPolText})</b> là cửa tháo chính; nhóm thuận có thể mở trọn một vận 10 năm.`;
    }else{
      rule=`<b>${hit.name}</b> chịu ${kind} ở phía trái âm/dương tuổi. Khi Đại Hạn gặp ${otherKind}, sự tháo mở chậm hơn và chia <b>5 năm đầu / 5 năm sau</b> theo hai nhánh ${CHI[strongOther]}–${CHI[weakOther]}.`;
    }
    rule+=tlVoidCurrentReleaseState(c,otherPair,aligned,birthPol);
    if(hit.name==="Thân"&&kind==="TRIỆT")rule+=`<br><b>Riêng Thân bị Triệt:</b> gặp Tuần quá sớm chưa chắc tháo nổi; cổ liệu nhấn mạnh sau khoảng 30 tuổi mới dễ thành.`;
    return rule;
  }).join("<br><br>");
}
function tlVoidSpecialHtml(c,kind,pair){
  const notes=[];
  const maPos=c?.positions?.["Thiên Mã"];
  if(maPos&&pair.includes(maPos)){
    notes.push(`<b>Thiên Mã:</b> ${kind==="TRIỆT"?"Mã bị Triệt là ‘Mã què’, khó phát dụng trọn.":"Mã gặp Tuần có thể thành đặc dụng nhưng thường phải chùng một nhịp rồi mới phát."}`);
  }
  const vcd=pair.filter(br=>!(c?.buckets?.[br]||[]).some(s=>s.major));
  if(vcd.length){
    notes.push(`<b>Vô Chính Diệu:</b> ${escapeHtml(vcd.map(br=>`${CHI[br]} (cung ${houseName(br,c.menh)})`).join(", "))}. Không dùng công thức “có Tam Không là tự tốt”; phải xét Nhật–Nguyệt chiếu, sát tinh và toàn tam hợp.`);
  }
  const spt=[];
  pair.forEach(br=>(c?.buckets?.[br]||[]).filter(s=>s.major&&["Thất Sát","Phá Quân","Liêm Trinh","Tham Lang"].includes(s.name)).forEach(s=>spt.push(`${s.name} tại ${CHI[br]}`)));
  if(spt.length){
    notes.push(`<b>Sát–Phá–Liêm–Tham:</b> ${escapeHtml(spt.join(", "))}. Tuần thiên về kìm/chậm; Triệt phong tỏa mạnh hơn, vừa giảm thế phát vừa có thể cắt bớt hung.`);
  }
  const e=c?.banMenh?.e;
  if(kind==="TRIỆT"&&e==="K"&&pair.some(br=>branchElementName(br)==="KIM")){
    notes.push(`<b>Nghiệm Kim–Triệt:</b> lá số này trúng điều kiện Mệnh Kim và Triệt có nhánh ở Kim cung; chỉ ghi nhận như lớp nghiệm lý phụ.`);
  }
  if(kind==="TUẦN"&&e==="H"&&pair.some(br=>branchElementName(br)==="HỎA")){
    notes.push(`<b>Nghiệm Hỏa–Tuần:</b> lá số này trúng điều kiện Mệnh Hỏa và Tuần có nhánh ở Hỏa cung; có thể tham khảo ý “chậm rồi mới ló”, không đảo kết luận chính.`);
  }
  return notes.join("<br>");
}
function tlVoidPopupHtml(target){
  const c=window.__chartData||null;
  const rawKind=String(target?.dataset?.voidKind||target?.textContent||"").trim().toUpperCase();
  const combined=rawKind.includes("TUẦN")&&rawKind.includes("TRIỆT");
  const kind=combined?"TUẦN - TRIỆT":rawKind;
  const pair=tlVoidPairFromTarget(target)||(combined?c?.marks?.tuan:(kind==="TUẦN"?c?.marks?.tuan:c?.marks?.triet));
  if(!pair||pair.length!==2)return "";
  const birthPol=c?stemYang(c.canNam):1;
  const strong=pair.find(b=>branchYang(b)===birthPol)??pair[0];
  const weak=pair.find(b=>b!==strong)??pair[1];
  const pairText=pair.map(x=>CHI[x]).join("–");
  const birthText=c?`${CAN[c.canNam]} ${CHI[c.chiNam]} • tuổi ${birthPol===1?"Dương":"Âm"} • ${c.gender}`:"";

  if(combined){
    const tuan=TL_VOID_META["TUẦN"],triet=TL_VOID_META["TRIỆT"];
    const release=tlVoidReleaseHtml(c,"TUẦN",pair);
    const specialT=tlVoidSpecialHtml(c,"TUẦN",pair);
    const specialR=tlVoidSpecialHtml(c,"TRIỆT",pair);
    const specials=[specialT,specialR].filter(Boolean);
    return `
      <div class="star-help-head"><span class="star-help-name">TUẦN - TRIỆT</span><span class="star-help-meta">ĐỒNG CUNG / CÙNG CẶP</span></div>
      <div class="star-help-kicker">TUẦN–TRIỆT • NGHIỆM LÝ GIA ĐÌNH THIÊN LƯƠNG</div>
      <div class="star-help-detail"><div class="star-help-detail-title">Đang cùng án tại</div><div class="star-help-detail-text"><b>${escapeHtml(pairText)}</b>${birthText?` • ${escapeHtml(birthText)}`:""}</div></div>
      <div class="star-help-detail star-help-annual-house"><div class="star-help-detail-title">1. Hai cung chịu lực 70/30</div><div class="star-help-detail-text">Tuổi ${birthPol===1?"Dương":"Âm"}: phía cùng âm/dương tuổi chịu lực mạnh hơn.<br><br>${tlVoidBranchHouseHtml(c,strong,70)}<br><br>${tlVoidBranchHouseHtml(c,weak,30)}<br><span style="opacity:.82">Tuần/Triệt không đổi tên hay căn tính của cung; chúng làm mức phát của cát/hung trong cung bị kìm, chặn hoặc giảm.</span></div></div>
      <div class="star-help-detail star-help-annual-reading"><div class="star-help-detail-title">2. Khi Tuần và Triệt cùng một cặp</div><div class="star-help-detail-text">${release}</div></div>
      <div class="star-help-detail"><div class="star-help-detail-title">3. Bản chất Tuần</div><div class="star-help-detail-text">${escapeHtml(tuan.essence)} ${escapeHtml(tuan.contrast)}</div></div>
      <div class="star-help-detail"><div class="star-help-detail-title">4. Bản chất Triệt</div><div class="star-help-detail-text">${escapeHtml(triet.essence)} ${escapeHtml(triet.contrast)}</div></div>
      ${specials.length?`<div class="star-help-detail"><div class="star-help-detail-title">5. Trường hợp đặc biệt đang có</div><div class="star-help-detail-text">${specials.join("<br>")}</div></div>`:""}
      <div class="star-help-foot">Khi Tuần và Triệt đồng cặp, nhãn trên lá số được ghép thành một ô để thể hiện đúng vị trí án trên cùng đường biên; việc ghép nhãn chỉ là bố cục, không có nghĩa hai lực tự triệt tiêu nhau.</div>`;
  }

  const meta=TL_VOID_META[kind];
  if(!meta)return "";
  const special=tlVoidSpecialHtml(c,kind,pair);
  return `
    <div class="star-help-head"><span class="star-help-name">${kind}</span><span class="star-help-meta">${escapeHtml(meta.full)}</span></div>
    <div class="star-help-kicker">TUẦN–TRIỆT • NGHIỆM LÝ GIA ĐÌNH THIÊN LƯƠNG</div>
    <div class="star-help-detail"><div class="star-help-detail-title">Đang án tại</div><div class="star-help-detail-text"><b>${escapeHtml(pairText)}</b>${birthText?` • ${escapeHtml(birthText)}`:""}</div></div>
    <div class="star-help-detail star-help-annual-house"><div class="star-help-detail-title">1. Hai cung chịu lực 70/30</div><div class="star-help-detail-text">Tuổi ${birthPol===1?"Dương":"Âm"}: phía cùng âm/dương tuổi chịu lực mạnh hơn.<br><br>${tlVoidBranchHouseHtml(c,strong,70)}<br><br>${tlVoidBranchHouseHtml(c,weak,30)}<br><span style="opacity:.82">Tuần/Triệt không đổi tên hay căn tính của cung; chúng làm mức phát của cát/hung trong cung bị kìm, chặn hoặc giảm.</span></div></div>
    <div class="star-help-detail star-help-annual-reading"><div class="star-help-detail-title">2. Có được tháo gỡ không?</div><div class="star-help-detail-text">${tlVoidReleaseHtml(c,kind,pair)}</div></div>
    <div class="star-help-detail"><div class="star-help-detail-title">3. Bản chất ${kind}</div><div class="star-help-detail-text">${escapeHtml(meta.essence)} ${escapeHtml(meta.contrast)}</div></div>
    ${special?`<div class="star-help-detail"><div class="star-help-detail-title">4. Trường hợp đặc biệt đang có</div><div class="star-help-detail-text">${special}</div></div>`:""}
    <div class="star-help-foot">Nguồn: <b>Tử Vi Nghiệm Lý</b> và phần tổng hợp của gia đình Thiên Lương. Ưu tiên đọc: <b>cung bị án → lực 70/30 → trạng thái tháo gỡ → sao/cách cục liên quan</b>; không phán cát–hung chỉ từ Tuần hoặc Triệt.</div>`;
}
function showChartConceptHelp(target){
  if(!starHelpEnabled()){ hideStarHelp(); return; }
  const kind=target.dataset.chartHelp||"";
  const tip=ensureStarHelpPopup();
  let html="";

  if(kind==="house"){
    const house=target.dataset.helpHouse||"";
    const info=houseHelpInfo(house);
    html=`
      <div class="star-help-head">
        <span class="star-help-name">Cung ${escapeHtml(house)}</span>
        <span class="star-help-meta">12 cung bản mệnh</span>
      </div>
      <div class="star-help-kicker">Ý NGHĨA CUNG</div>
      <div class="star-help-detail">
        <div class="star-help-detail-title">Chủ về</div>
        <div class="star-help-detail-text">${escapeHtml(info.meaning)}</div>
      </div>
      <div class="star-help-detail">
        <div class="star-help-detail-title">Cách đọc</div>
        <div class="star-help-detail-text">${escapeHtml(info.read)}</div>
      </div>
      <div class="star-help-foot">Tên cung là chức năng của ô địa bàn gốc. Khi vận hạn chạy qua, cùng một ô còn có thể nhận thêm vai trò ĐH.x hoặc LĐH.x; các lớp này bổ sung cho nhau chứ không thay thế cung gốc.</div>`;
  }
  else if(kind==="limit-badge"){
    const k=target.dataset.limitKind||"";
    const physical=target.dataset.physicalHouse||"";
    const viewYear=Number(target.dataset.viewYear)||null;
    const age=Number(target.dataset.currentAge)||null;
    const start=Number(target.dataset.startAge);
    const end=Number(target.dataset.endAge);
    if(k==="dai"){
      html=`
        <div class="star-help-head"><span class="star-help-name">Đại Hạn</span><span class="star-help-meta">Chu kỳ 10 năm</span></div>
        <div class="star-help-kicker">BỐI CẢNH NỀN CỦA 10 NĂM</div>
        <div class="star-help-detail"><div class="star-help-detail-title">Là gì?</div><div class="star-help-detail-text">Đại Hạn là lớp vận kéo dài 10 tuổi. Chương trình an các Đại Hạn từ số Cục, cung Mệnh, giới tính và âm dương của năm sinh; sau đó xác định cung Đại Hạn hiện hành theo tuổi của năm xem.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Nói lên điều gì?</div><div class="star-help-detail-text"><b>Đại Hạn là bối cảnh và nền vận của cả giai đoạn 10 năm</b>: cho biết lĩnh vực nào nổi bật, mức thuận–nghịch chung, tiềm lực, cơ hội và giới hạn mà đương số phải vận động trong đó. Đại Hạn không chỉ ra chính xác một sự việc đơn lẻ sẽ xảy ra vào năm nào.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Trên lá số này</div><div class="star-help-detail-text">Nhãn <b>Đại Hạn</b> đặt tại cung gốc <b>${escapeHtml(physical)}</b>${Number.isFinite(start)&&Number.isFinite(end)?`, ứng với khoảng <b>${start}–${end} tuổi</b>`:""}${viewYear&&age?`. Năm ${viewYear}, chương trình đang tính ${age} tuổi theo quy ước tuổi đang dùng.`:""}</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Cách hiểu ngắn gọn</div><div class="star-help-detail-text"><b>Đại Hạn = nền/bối cảnh 10 năm.</b> Từ nền đó, Lưu Đại Hạn cho biết hướng vận động của từng năm; Tiểu Hạn cho biết sự việc và biểu hiện cụ thể hơn trong năm.</div></div>
        <div class="star-help-foot">Không dùng Đại Hạn để kết luận một năm riêng lẻ. Kết quả của năm cần tổng hợp Đại Hạn, Lưu Đại Hạn, Tiểu Hạn, sao lưu và cấu trúc lá số gốc.</div>`;
    }else if(k==="luu"){
      html=`
        <div class="star-help-head"><span class="star-help-name">Lưu Đại Hạn</span><span class="star-help-meta">${viewYear?`Năm ${viewYear}`:"Lớp năm"}</span></div>
        <div class="star-help-kicker">HƯỚNG DIỄN BIẾN CỦA ĐẠI HẠN TRONG NĂM</div>
        <div class="star-help-detail"><div class="star-help-detail-title">Là gì?</div><div class="star-help-detail-text">Lưu Đại Hạn là vị trí dịch chuyển theo từng năm bên trong Đại Hạn đang xét. LĐH.MỆNH được neo tại vị trí Lưu Đại Hạn của năm, rồi 11 cung động còn lại xoay theo thứ tự 12 cung.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Nói lên điều gì?</div><div class="star-help-detail-text"><b>Lưu Đại Hạn nghiêng về lớp diễn biến và hướng vận động của năm</b>: nó cho biết nền Đại Hạn 10 năm đang chuyển vào lĩnh vực nào, khuynh hướng thuận–nghịch nào được kích hoạt và con đường mà sự việc có xu hướng phát triển trong năm đó.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Có phải là kết quả không?</div><div class="star-help-detail-text">Không nên coi Lưu Đại Hạn là kết quả cuối cùng. Nó giống <b>hướng đi hoặc cơ chế diễn biến</b> của năm. Muốn biết sự việc biểu hiện cụ thể ra sao phải đọc thêm Tiểu Hạn, sao lưu và các cung liên hệ.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Trên lá số này</div><div class="star-help-detail-text">Nhãn <b>Lưu ĐH</b> đánh dấu cung gốc <b>${escapeHtml(physical)}</b> đang là điểm neo LĐH.MỆNH của năm${viewYear?` <b>${viewYear}</b>`:""}.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Cách hiểu ngắn gọn</div><div class="star-help-detail-text"><b>Đại Hạn = nền 10 năm → Lưu Đại Hạn = hướng/diễn biến của năm → Tiểu Hạn = sự việc và biểu hiện cụ thể của năm.</b></div></div>
        <div class="star-help-foot">Khi Lưu Đại Hạn và Tiểu Hạn cùng chỉ về một xu hướng, tín hiệu của năm thường rõ hơn. Khi hai lớp trái chiều, cần giảm mức khẳng định và xét sao lưu cùng lá số gốc để phân định.</div>`;
    }else if(k==="tieu"){
      html=`
        <div class="star-help-head"><span class="star-help-name">Tiểu Hạn</span><span class="star-help-meta">${viewYear?`Năm ${viewYear}`:"Lớp năm"}</span></div>
        <div class="star-help-kicker">SỰ VIỆC VÀ BIỂU HIỆN CỤ THỂ TRONG NĂM</div>
        <div class="star-help-detail"><div class="star-help-detail-title">Là gì?</div><div class="star-help-detail-text">Tiểu Hạn là lớp hạn theo từng năm, được an từ tuổi, giới tính và quy tắc vận hành của vòng Tiểu Hạn. Nó giúp định vị nơi các vấn đề của năm dễ biểu hiện thành sự việc cụ thể hơn.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Nói lên điều gì?</div><div class="star-help-detail-text"><b>Tiểu Hạn nghiêng về lớp sự việc, trải nghiệm và biểu hiện cụ thể của năm</b>: tài chính tăng hay giảm, công việc thay đổi, quan hệ phát sinh, đi lại, sức khỏe hoặc các sự kiện khác tùy cung và bộ sao hội chiếu.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Có thể hiểu là “kết quả” không?</div><div class="star-help-detail-text">Có thể xem Tiểu Hạn là <b>lớp biểu hiện hoặc kết quả gần</b> của những xu hướng đang vận động, nhưng <b>không phải kết quả cuối cùng một cách máy móc</b>. Một Tiểu Hạn tốt vẫn có thể chỉ cho kết quả nhỏ nếu Lưu Đại Hạn không nâng đỡ; ngược lại, hai lớp cùng thuận thì mức ứng thường rõ hơn.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Trên lá số này</div><div class="star-help-detail-text">Nhãn <b>Tiểu hạn</b> cho biết năm${viewYear?` <b>${viewYear}</b>`:""}, Tiểu Hạn đang nhập cung gốc <b>${escapeHtml(physical)}</b>.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Cách hiểu ngắn gọn</div><div class="star-help-detail-text"><b>Đại Hạn = bối cảnh; Lưu Đại Hạn = diễn biến/hướng đi; Tiểu Hạn = sự việc và biểu hiện cụ thể.</b> Kết quả cuối cùng là phần tổng hợp của cả ba lớp cùng sao lưu và lá số gốc.</div></div>
        <div class="star-help-foot">Vì vậy không nên dùng riêng Tiểu Hạn để kết luận cát/hung của năm. Hãy xem Tiểu Hạn như điểm quy tụ sự việc, rồi kiểm chứng bằng Lưu Đại Hạn, Đại Hạn và các sao lưu.</div>`;
    }
  }
  else if(kind==="limit-house"){
    const layer=target.dataset.limitLayer||"";
    const dynamicHouse=target.dataset.dynamicHouse||"";
    const physicalHouse=target.dataset.physicalHouse||"";
    const short=target.dataset.dynamicShort||"";
    const viewYear=Number(target.dataset.viewYear)||null;
    if(layer==="dai"){
      html=`
        <div class="star-help-head"><span class="star-help-name">ĐH.${escapeHtml(short)}</span><span class="star-help-meta">Cung động Đại Hạn</span></div>
        <div class="star-help-kicker">ĐẠI HẠN • 12 CUNG ĐỘNG</div>
        <div class="star-help-detail"><div class="star-help-detail-title">Nhãn này nghĩa là gì?</div><div class="star-help-detail-text"><b>ĐH</b> là viết tắt của Đại Hạn. Trên ô gốc <b>${escapeHtml(physicalHouse)}</b>, nhãn <b>ĐH.${escapeHtml(short)}</b> cho biết trong lá số Đại Hạn hiện hành, chính ô này đang đảm nhiệm vai trò <b>cung ${escapeHtml(dynamicHouse)}</b>.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Trường hợp ĐH.MỆNH</div><div class="star-help-detail-text">ĐH.MỆNH là điểm neo của 12 cung động Đại Hạn. Từ vị trí này, ĐH.PHỤ, ĐH.PHÚC, ĐH.ĐIỀN, ĐH.QUAN… được xoay theo đúng thứ tự 12 cung.</div></div>
        <div class="star-help-foot">Cung động Đại Hạn là lớp chồng lên cung gốc. Ví dụ ô gốc Tài Bạch có thể đồng thời mang nhãn ĐH.MỆNH hoặc ĐH.DI tùy Đại Hạn; hai ý nghĩa phải đọc cùng nhau.</div>`;
    }else{
      html=`
        <div class="star-help-head"><span class="star-help-name">LĐH.${escapeHtml(short)}</span><span class="star-help-meta">${viewYear?`Lưu Đại Hạn ${viewYear}`:"Cung động Lưu Đại Hạn"}</span></div>
        <div class="star-help-kicker">LƯU ĐẠI HẠN • 12 CUNG ĐỘNG</div>
        <div class="star-help-detail"><div class="star-help-detail-title">Nhãn này nghĩa là gì?</div><div class="star-help-detail-text"><b>LĐH</b> là viết tắt của Lưu Đại Hạn. Trên ô gốc <b>${escapeHtml(physicalHouse)}</b>, nhãn <b>LĐH.${escapeHtml(short)}</b> cho biết trong lớp Lưu Đại Hạn của năm${viewYear?` <b>${viewYear}</b>`:""}, ô này đang đảm nhiệm vai trò <b>cung ${escapeHtml(dynamicHouse)}</b>.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Ví dụ LĐH.DI</div><div class="star-help-detail-text">LĐH.DI nghĩa là ô này trở thành <b>cung Thiên Di</b> của lớp Lưu Đại Hạn năm xem. Vì Lưu Đại Hạn thiên về <b>diễn biến và hướng vận động</b>, nhãn này cho biết các diễn biến của năm có xu hướng đi qua môi trường bên ngoài, giao tiếp, đi lại hoặc quan hệ đối ngoại; vẫn phải phối hợp với cung gốc đang chứa nhãn đó.</div></div>
        <div class="star-help-detail"><div class="star-help-detail-title">Vai trò khi luận năm</div><div class="star-help-detail-text">Các nhãn LĐH.x cho biết <b>lĩnh vực đang dẫn hướng diễn biến</b> của năm. Chúng không tự quyết định kết quả; sự việc cụ thể cần kiểm chứng qua Tiểu Hạn, sao lưu và các cung liên hệ.</div></div>
        <div class="star-help-foot">LĐH.MỆNH là điểm neo; từ đó 11 cung LĐH còn lại xoay theo thứ tự 12 cung. Có thể nhớ: LĐH.x trả lời “diễn biến đang đi qua lĩnh vực nào?”, còn Tiểu Hạn giúp trả lời “sự việc biểu hiện cụ thể ở đâu và ra sao?”.</div>`;
    }
  }
  else if(kind==="void"){
    html=tlVoidPopupHtml(target);
  }
  else if(kind==="decade-start"){
    const start=Number(target.dataset.startAge);
    const end=Number(target.dataset.endAge);
    const physical=target.dataset.physicalHouse||"";
    const isActive=target.dataset.activeDecade==="1";
    const age=Number(target.dataset.currentAge)||null;
    const viewYear=Number(target.dataset.viewYear)||null;
    html=`
      <div class="star-help-head"><span class="star-help-name">${Number.isFinite(start)?start:"—"}</span><span class="star-help-meta">Mốc tuổi Đại Hạn</span></div>
      <div class="star-help-kicker">SỐ Ở GÓC PHẢI DƯỚI MỖI CUNG</div>
      <div class="star-help-detail"><div class="star-help-detail-title">Số này là gì?</div><div class="star-help-detail-text">Đây là <b>tuổi bắt đầu Đại Hạn</b> khi vòng Đại Hạn đi đến cung gốc <b>${escapeHtml(physical)}</b>. Vì mỗi Đại Hạn kéo dài 10 tuổi, số <b>${start}</b> biểu thị khoảng <b>${start}–${end} tuổi</b>.</div></div>
      <div class="star-help-detail"><div class="star-help-detail-title">Có phải tuổi hiện tại không?</div><div class="star-help-detail-text">Không. Đây là mốc cố định của vòng Đại Hạn tại cung này, không phải tuổi hiện tại và cũng không phải năm dương lịch.${isActive&&viewYear&&age?` Năm <b>${viewYear}</b>, chương trình tính đương số <b>${age} tuổi</b>, nên đang nằm trong Đại Hạn <b>${start}–${end}</b>.`:""}</div></div>
      <div class="star-help-foot">Chương trình xác định mốc đầu Đại Hạn từ số Cục và chiều đi Đại Hạn theo giới tính/âm dương năm sinh. Ví dụ số 42 nghĩa là Đại Hạn của cung đó bắt đầu ở 42 tuổi và kéo đến hết 51 tuổi.</div>`;
  }

  if(!html){hideStarHelp();return;}
  tip.innerHTML=html;
  tip.classList.add("is-visible");
  tip.setAttribute("aria-hidden","false");
  starHelpPosition(tip,target);
}
function bindChartConceptHelpPopup(){
  if(document.documentElement.dataset.chartConceptHelpBound==="1")return;
  document.documentElement.dataset.chartConceptHelpBound="1";
  let active=null;
  document.addEventListener("pointerover",e=>{
    if(e.pointerType&&e.pointerType!=="mouse"&&e.pointerType!=="pen")return;
    if(!starHelpEnabled()){active=null;if(!phiPopupEnabled())hideStarHelp();return;}
    const t=e.target.closest?.("[data-chart-help]");
    if(!t||(t===active&&starHelpPopupIsVisible()))return;
    active=t;showChartConceptHelp(t);
  });
  document.addEventListener("pointerout",e=>{
    if(!active)return;
    if(e.target.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    const from=e.target.closest?.("[data-chart-help]");
    if(from!==active)return;
    if(e.relatedTarget?.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    const to=e.relatedTarget?.closest?.("[data-chart-help]");
    if(to===active)return;
    scheduleStarHelpClose(()=>{if(active===from)active=null;},900);
  });
  document.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="touch")return;
    if(!starHelpEnabled()){active=null;if(!phiPopupEnabled())hideStarHelp();return;}
    if(e.target.closest?.("#starHelpPopup"))return;
    const t=e.target.closest?.("[data-chart-help]");
    if(t){active=t;showChartConceptHelp(t);return;}
    if(active){active=null;hideStarHelp();}
  });
  window.addEventListener("blur",()=>{active=null;hideStarHelp();});
  document.addEventListener("scroll",e=>{if(e.target?.closest?.("#starHelpPopup"))return;active=null;hideStarHelp();},true);
  window.addEventListener("resize",()=>{active=null;hideStarHelp();});
}

function bindPalaceCanChiHelpPopup(){
  if(document.documentElement.dataset.palaceCanChiHelpBound==="1")return;
  document.documentElement.dataset.palaceCanChiHelpBound="1";
  let active=null;
  document.addEventListener("pointerover",e=>{
    if(e.pointerType&&e.pointerType!=="mouse"&&e.pointerType!=="pen")return;
    if(!starHelpEnabled()){active=null;if(!phiPopupEnabled())hideStarHelp();return;}
    const t=e.target.closest?.("[data-palace-cc-help]");
    if(!t||(t===active&&starHelpPopupIsVisible()))return;
    active=t;showPalaceCanChiHelp(t);
  });
  document.addEventListener("pointerout",e=>{
    if(!active)return;
    if(e.target.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    const from=e.target.closest?.("[data-palace-cc-help]");
    if(from!==active)return;
    if(e.relatedTarget?.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    const to=e.relatedTarget?.closest?.("[data-palace-cc-help]");
    if(to===active)return;
    scheduleStarHelpClose(()=>{if(active===from)active=null;},900);
  });
  /* Điện thoại/máy tính bảng: chạm nhãn để mở, chạm ra ngoài để đóng. */
  document.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="touch")return;
    if(!starHelpEnabled()){active=null;if(!phiPopupEnabled())hideStarHelp();return;}
    if(e.target.closest?.("#starHelpPopup"))return;
    const t=e.target.closest?.("[data-palace-cc-help]");
    if(t){active=t;showPalaceCanChiHelp(t);return;}
    if(active){active=null;hideStarHelp();}
  });
  window.addEventListener("blur",()=>{active=null;hideStarHelp();});
  document.addEventListener("scroll",e=>{if(e.target?.closest?.("#starHelpPopup"))return;active=null;hideStarHelp();},true);
  window.addEventListener("resize",()=>{active=null;hideStarHelp();});
}
function bindStarHelpPopup(){
  if(document.documentElement.dataset.starHelpBound==="1")return;
  document.documentElement.dataset.starHelpBound="1";
  let active=null;
  document.addEventListener("pointerover",e=>{
    if(e.pointerType&&e.pointerType!=="mouse"&&e.pointerType!=="pen")return;
    if(!starHelpEnabled()){active=null;if(!phiPopupEnabled())hideStarHelp();return;}
    const t=e.target.closest?.("[data-star-help]");
    if(!t||(t===active&&starHelpPopupIsVisible()))return;
    active=t;showStarHelp(t);
  });
  document.addEventListener("pointerout",e=>{
    if(!active)return;
    if(e.target.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    const from=e.target.closest?.("[data-star-help]");
    if(from!==active)return;
    if(e.relatedTarget?.closest?.("#starHelpPopup")){cancelStarHelpClose();return;}
    const to=e.relatedTarget?.closest?.("[data-star-help]");
    if(to===active)return;
    scheduleStarHelpClose(()=>{if(active===from)active=null;},900);
  });
  window.addEventListener("blur",()=>{active=null;hideStarHelp();});
  document.addEventListener("scroll",e=>{if(e.target?.closest?.("#starHelpPopup"))return;active=null;hideStarHelp();},true);
  window.addEventListener("resize",()=>{active=null;hideStarHelp();});
}
const HIDDEN_VISUAL_STARS=new Set([]);

/* Tứ Lộc theo Tử Vi Nghiệm Lý Thiên Lương. */
const THIEN_LUONG_TU_LOC=["Lộc Tồn","Hóa Lộc","Thiên Trù","L.N. Văn Tinh"];
const THIEN_LUONG_TU_LOC_SET=new Set(THIEN_LUONG_TU_LOC);


/* V3.3.105 — SAO CÓ ĐỚI HÀNH THEO GIA ĐÌNH THIÊN LƯƠNG.
   Tài liệu của gia đình ghi nguyên tắc: sao có hai hành được xét theo ngũ hành Mạng
   của đương số. Cách triển khai ở đây giữ HÀNH CHÍNH làm mặc định; khi Nạp âm Mệnh
   trùng đúng HÀNH ĐỚI thì chuyển sang hành đới. Như vậy không tự suy diễn sang một
   hành thứ ba khi Mệnh không trùng một trong hai hành của sao.
   Quyết định này là nguồn duy nhất cho cả MÀU SAO và NỘI DUNG POPUP. */
const THIEN_LUONG_DUAL_ELEMENTS=Object.freeze({
  "Tham Lang":Object.freeze({primary:"M",secondary:"T"}),      // Mộc đới Thủy
  "Kình Dương":Object.freeze({primary:"K",secondary:"H"}),    // Kim đới Hỏa
  "Đà La":Object.freeze({primary:"K",secondary:"H"}),          // Kim đới Hỏa
  "Linh Tinh":Object.freeze({primary:"H",secondary:"K"}),      // Hỏa đới Kim
  "Tả Phụ":Object.freeze({primary:"O",secondary:"K"}),         // Thổ đới Kim
  "Hữu Bật":Object.freeze({primary:"O",secondary:"T"}),        // Thổ đới Thủy
  "Văn Xương":Object.freeze({primary:"K",secondary:"O"}),     // Kim đới Thổ
  "Văn Khúc":Object.freeze({primary:"T",secondary:"H"}),      // Thủy đới Hỏa
  "Thiên Khôi":Object.freeze({primary:"H",secondary:"K"}),    // Hỏa đới Kim
  "Thiên Việt":Object.freeze({primary:"H",secondary:"M"}),    // Hỏa đới Mộc
  "Hóa Lộc":Object.freeze({primary:"M",secondary:"O"}),       // Mộc đới Thổ
  "Thai Phụ":Object.freeze({primary:"O",secondary:"K"}),      // Thổ đới Kim
  "Phong Cáo":Object.freeze({primary:"O",secondary:"T"}),     // Thổ đới Thủy
  "Phá Toái":Object.freeze({primary:"H",secondary:"K"})       // Hỏa đới Kim
});

function thienLuongDualElementDecision(name,menhElement){
  const pair=THIEN_LUONG_DUAL_ELEMENTS[name];
  if(!pair)return null;
  const useSecondary=menhElement===pair.secondary;
  const effective=useSecondary?pair.secondary:pair.primary;
  const unused=useSecondary?pair.primary:pair.secondary;
  let reason;
  if(useSecondary){
    reason=`Nạp âm bản mệnh ${ELEMENT_LABEL[menhElement]} trùng hành đới ${ELEMENT_LABEL[pair.secondary]}, nên dụng ${ELEMENT_LABEL[effective]}; không dụng ${ELEMENT_LABEL[unused]}.`;
  }else if(menhElement===pair.primary){
    reason=`Nạp âm bản mệnh ${ELEMENT_LABEL[menhElement]} trùng hành chính ${ELEMENT_LABEL[pair.primary]}, nên dụng ${ELEMENT_LABEL[effective]}; không dụng ${ELEMENT_LABEL[unused]}.`;
  }else{
    reason=`Nạp âm bản mệnh ${ELEMENT_LABEL[menhElement]||menhElement} không trùng hành chính ${ELEMENT_LABEL[pair.primary]} hoặc hành đới ${ELEMENT_LABEL[pair.secondary]}, nên giữ hành chính ${ELEMENT_LABEL[effective]}; không dụng ${ELEMENT_LABEL[unused]}.`;
  }
  const identity=`${ELEMENT_LABEL[pair.primary]} đới ${ELEMENT_LABEL[pair.secondary]}`;
  const usage=`Dụng ${ELEMENT_LABEL[effective]}; không dụng ${ELEMENT_LABEL[unused]}`;
  return {primary:pair.primary,secondary:pair.secondary,menhElement,effective,unused,useSecondary,identity,usage,reason};
}
function thienLuongEffectiveElement(name,menhElement){
  return thienLuongDualElementDecision(name,menhElement)?.effective||null;
}
function applyThienLuongDualElements(buckets,menhElement){
  if(!menhElement)return;
  for(let br=1;br<=12;br++){
    (buckets[br]||[]).forEach(s=>{
      const decision=thienLuongDualElementDecision(s.name,menhElement);
      if(!decision)return;
      s.baseElement=decision.primary;
      s.secondaryElement=decision.secondary;
      s.menhElement=decision.menhElement;
      s.e=decision.effective;
      s.unusedElement=decision.unused;
      s.elementUseReason=decision.reason;
      s.elementByMenh=true;
    });
  }
}
function dualElementTitle(star,c){
  if(!star || !c?.banMenh)return "";
  const decision=thienLuongDualElementDecision(star.name,c.banMenh.e);
  if(!decision)return "";
  return `${star.name}: ${decision.identity} (định danh cố định) • Nạp âm Mệnh ${ELEMENT_LABEL[decision.menhElement]} • ${decision.usage}`;
}

/* V3.3.70 — TỨ LỘC VÀ THIÊN CAN.
   - Lộc Tồn: lớp thuận lý Can trước hết là Giáp, Ất, Canh, Tân; nếu Chi năm còn
     nằm trong tam hợp của vị trí Lộc Tồn thì đánh dấu mức "hưởng trọn".
   - L.N. Văn Tinh: bù cho 6 Can Bính, Đinh, Mậu, Kỷ, Nhâm, Quý.
   - Thiên Trù: bốn Can thuận ở lớp âm-dương là Bính, Đinh, Mậu, Canh.
   - Hóa Lộc: cả 10 Can đều có một sao chủ Hóa Lộc riêng theo bảng Tứ Hóa. */
const LOC_CAN_RULES=Object.freeze({
  "Lộc Tồn":Object.freeze([1,2,7,8]),
  "L.N. Văn Tinh":Object.freeze([3,4,5,6,9,10]),
  "Thiên Trù":Object.freeze([3,4,5,7]),
  "Hóa Lộc":Object.freeze([1,2,3,4,5,6,7,8,9,10])
});
function sameTamHop(a,b){
  if(!a||!b)return false;
  const d=mod(a-b,12);
  return d===0||d===4||d===8;
}
function locCanFocusInfo(star,c){
  if(!star || !c || !THIEN_LUONG_TU_LOC_SET.has(star.name))return {focus:false,strong:false};
  const eligible=(LOC_CAN_RULES[star.name]||[]).includes(c.canNam);
  const locTonAgeGroup=star.name==="Lộc Tồn" && eligible && sameTamHop(c.chiNam,c.positions?.["Lộc Tồn"]);
  const menhAtThaiTueTamHop=star.name==="Lộc Tồn" && sameTamHop(c.menh,c.chiNam);
  const strong=locTonAgeGroup && menhAtThaiTueTamHop;
  let note="";
  if(eligible){
    note=`${star.name} hợp lớp Thiên Can ${CAN[c.canNam]} theo nghiệm lý Thiên Lương`;
    if(star.name==="Hóa Lộc")note+=`; Hóa Lộc của Can ${CAN[c.canNam]} đặt theo ${c.hoaHosts?.[0]||"Tứ Hóa"}`;
    if(locTonAgeGroup && !strong)note+="; Chi năm thuộc nhóm được hưởng Lộc Tồn nhưng Mệnh chưa ở tam hợp Thái Tuế nên chưa đánh dấu hưởng trọn";
    if(strong)note+="; Chi năm thuộc tam hợp Lộc Tồn và Mệnh ở tam hợp Thái Tuế → hưởng trọn";
  }
  return {focus:eligible,strong,note};
}

/* V3.3.70 — THIÊN MÃ THEO GIA ĐÌNH THIÊN LƯƠNG.
   Không gán máy móc (Đ) cho cả Dần/Thân/Tỵ/Hợi. Mức sử dụng phụ thuộc Mệnh;
   Triệt và các trường hợp Tuần đặc biệt được xét riêng. */
const THIEN_MA_USE=Object.freeze({
  3:Object.freeze({M:"DUNG",K:"NHUOC",T:"VAT",O:"DIEU",H:"LOI"}),
  6:Object.freeze({H:"DUNG",O:"LOI",M:"VAT",K:"DIEU",T:"NHUOC"}),
  9:Object.freeze({K:"DUNG",T:"LOI",O:"VAT",M:"DIEU",H:"NHUOC"}),
  12:Object.freeze({O:"DUNG",T:"DUNG",M:"LOI",K:"VAT",H:"DIEU"})
});
const THIEN_MA_LABEL=Object.freeze({
  DUNG:{short:"DỤNG",full:"chính thức đắc dụng"},
  LOI:{short:"LỢI",full:"làm lợi"},
  VAT:{short:"VẤT",full:"vất vả"},
  DIEU:{short:"ĐIÊU",full:"điêu linh"},
  NHUOC:{short:"NHƯỢC",full:"bạc nhược"}
});
/* V3.3.70 — Thiên Mã đổi hành theo địa bàn theo nghiệm lý Thiên Lương.
   Mã vốn là Hỏa, nhưng khi đóng Tứ Sinh thì lấy hành của địa bàn để luận:
   Dần=Mộc (Mã Trạng Nguyên), Tỵ=Hỏa (Xích Thố), Thân=Kim (Bạch Mã), Hợi=Thủy (Ô Mã).
   Riêng Mã Hợi, sách cho cả Thủy Mệnh và Thổ Mệnh quyền sử dụng chính thức;
   đây là quy tắc đắc dụng, không đổi màu Hợi thành Thổ. */
const THIEN_MA_POSITION_META=Object.freeze({
  3:Object.freeze({e:"M",type:"MÃ TRẠNG NGUYÊN"}),
  6:Object.freeze({e:"H",type:"XÍCH THỐ"}),
  9:Object.freeze({e:"K",type:"BẠCH MÃ"}),
  12:Object.freeze({e:"T",type:"Ô MÃ"})
});
function applyThienMaPositionElements(buckets){
  for(let br=1;br<=12;br++){
    (buckets[br]||[]).forEach(s=>{
      if(s.name!=="Thiên Mã")return;
      const meta=THIEN_MA_POSITION_META[s.pos];
      if(!meta)return;
      s.baseElement="H";
      s.e=meta.e;
      s.maType=meta.type;
      s.maPositionElement=true;
    });
  }
}
function thienMaPositionTitle(star){
  if(!star || star.name!=="Thiên Mã")return "";
  const meta=THIEN_MA_POSITION_META[star.pos];
  if(!meta)return "";
  const names={M:"Mộc",H:"Hỏa",O:"Thổ",K:"Kim",T:"Thủy"};
  return `Thiên Mã tại ${CHI[star.pos]}: ${meta.type}; Mã vốn Hỏa, đổi hành địa bàn thành ${names[meta.e]}`;
}
function thienMaUseInfo(star,c){
  if(!star || star.name!=="Thiên Mã" || !c?.banMenh)return null;
  const pos=star.pos;
  const menhE=c.banMenh.e;
  const names={M:"Mộc",H:"Hỏa",O:"Thổ",K:"Kim",T:"Thủy"};
  const hitTriet=(c.marks?.triet||[]).includes(pos);
  const hitTuan=(c.marks?.tuan||[]).includes(pos);
  if(hitTriet){
    return {code:"QUE",short:"QUÈ",className:"ma-use-que",note:`Thiên Mã tại ${CHI[pos]} gặp Triệt: Mã què theo nghiệm lý Thiên Lương`};
  }
  if(hitTuan){
    if(pos===3 && menhE==="H")return {code:"SPECIAL",short:"CHIẾN",className:"ma-use-special",note:"Thiên Mã Dần gặp Tuần, Hỏa Mệnh: Ngựa chiến; trước khi đắc dụng phải chùng một bước"};
    if(pos===6 && menhE==="K")return {code:"SPECIAL",short:"BẠCH",className:"ma-use-special",note:"Thiên Mã Tỵ gặp Tuần, Kim Mệnh: Ngựa bạch; trước khi đắc dụng phải chùng một bước"};
    if(pos===9 && ["T","O"].includes(menhE))return {code:"SPECIAL",short:"Ô",className:"ma-use-special",note:"Thiên Mã Thân gặp Tuần, Thủy/Thổ Mệnh: Ngựa ô; trước khi đắc dụng phải chùng một bước"};
    if(pos===12 && menhE==="M")return {code:"SPECIAL",short:"NO",className:"ma-use-special",note:"Thiên Mã Hợi gặp Tuần, Mộc Mệnh: Ngựa ăn no; trước khi đắc dụng phải chùng một bước"};
  }
  const code=THIEN_MA_USE[pos]?.[menhE]||null;
  if(!code)return null;
  const meta=THIEN_MA_LABEL[code];
  const classMap={DUNG:"ma-use-dung",LOI:"ma-use-loi",VAT:"ma-use-vat",DIEU:"ma-use-dieu",NHUOC:"ma-use-nhuoc"};
  const posMeta=THIEN_MA_POSITION_META[pos];
  let note=`Thiên Mã tại ${CHI[pos]}${posMeta?` (${posMeta.type})`:""} với Mệnh ${names[menhE]}: ${meta.full}`;
  if(hitTuan)note+="; có Tuần nên cần hiểu thêm ý chùng một bước trước khi phát dụng";
  return {code,short:meta.short,className:classMap[code],note};
}

function auditDualElementRules(){
  const errors=[];
  const elementCodes=Object.keys(ELEMENT_LABEL);
  const entries=Object.entries(THIEN_LUONG_DUAL_ELEMENTS);
  entries.forEach(([name,pair])=>{
    const staticElement=MAJOR_META[name]?.e||STAR_ELEMENT[name]||"";
    if(!elementCodes.includes(pair.primary)||!elementCodes.includes(pair.secondary)||pair.primary===pair.secondary){
      errors.push(`${name}: cặp đới hành không hợp lệ`);
    }
    if(staticElement!==pair.primary)errors.push(`${name}: hành gốc không khớp hành chính`);
    if(!STAR_HELP_DATA[name])errors.push(`${name}: thiếu nội dung từ điển sao`);
    if(!TL_STAR_DETAIL[name])errors.push(`${name}: thiếu mô tả nghiệm lý`);
    elementCodes.forEach(menhElement=>{
      const d=thienLuongDualElementDecision(name,menhElement);
      const expected=menhElement===pair.secondary?pair.secondary:pair.primary;
      const expectedUnused=expected===pair.primary?pair.secondary:pair.primary;
      if(!d || d.effective!==expected || d.unused!==expectedUnused || d.useSecondary!==(expected===pair.secondary)){
        errors.push(`${name}/Mệnh ${ELEMENT_LABEL[menhElement]}: sai quyết định dụng hành`);
        return;
      }
      if(d.identity!==`${ELEMENT_LABEL[pair.primary]} đới ${ELEMENT_LABEL[pair.secondary]}` ||
         !d.usage.includes(ELEMENT_LABEL[d.effective]) || !d.usage.includes(ELEMENT_LABEL[d.unused]) || !d.reason){
        errors.push(`${name}/Mệnh ${ELEMENT_LABEL[menhElement]}: mô tả dụng hành không đồng nhất`);
      }
    });
  });
  if(entries.length!==14)errors.push(`Danh mục sao hai hành: cần 14, hiện có ${entries.length}`);
  return {ok:errors.length===0,errors,dualCount:entries.length,caseCount:entries.length*elementCodes.length};
}
function auditAllStarElementUsage(c){
  const errors=[];
  const valid=new Set(Object.keys(ELEMENT_LABEL));
  Object.entries(MAJOR_META).forEach(([name,meta])=>{
    if(!valid.has(meta.e))errors.push(`${name}: hành chính tinh không hợp lệ`);
  });
  Object.entries(STAR_ELEMENT).forEach(([name,e])=>{
    if(!valid.has(e))errors.push(`${name}: hành phụ tinh không hợp lệ`);
  });

  /* Kiểm tra trực tiếp mọi sao đã dựng: hành hiệu lực, màu và popup phải cùng một mã.
     Thiên Mã là ngoại lệ đổi theo địa bàn; sao hai hành đổi theo đúng một quyết định chung. */
  let renderedCount=0;
  for(let br=1;br<=12;br++){
    (c?.buckets?.[br]||[]).forEach(star=>{
      renderedCount++;
      const base=MAJOR_META[star.name]?.e||STAR_ELEMENT[star.name]||"";
      if(!base)errors.push(`${star.name}: thiếu hành gốc`);
      if(!valid.has(star.e))errors.push(`${star.name}: hành hiệu lực không hợp lệ`);
      if(!STAR_HELP_DATA[star.name])errors.push(`${star.name}: thiếu mô tả popup`);
      const dual=THIEN_LUONG_DUAL_ELEMENTS[star.name];
      if(dual){
        const d=thienLuongDualElementDecision(star.name,c?.banMenh?.e);
        if(!d || !star.elementByMenh || star.baseElement!==d.primary ||
           star.secondaryElement!==d.secondary || star.e!==d.effective ||
           star.unusedElement!==d.unused || star.elementUseReason!==d.reason){
          errors.push(`${star.name}: màu và mô tả dụng hành không cùng quyết định`);
        }
      }else if(star.name==="Thiên Mã"){
        const expected=THIEN_MA_POSITION_META[star.pos]?.e;
        if(expected && star.e!==expected)errors.push(`Thiên Mã ${CHI[star.pos]}: màu không khớp hành địa bàn`);
      }else if(base && star.e!==base){
        errors.push(`${star.name}: màu không khớp hành gốc`);
      }
    });
  }

  /* Khóa lỗi từng tồn tại: lời mô tả Thiên Hình phải theo cùng hành Hỏa với bảng màu. */
  if(!/^Hung tinh hành Hỏa\b/.test(TL_STAR_DETAIL["Thiên Hình"]?.role||"")){
    errors.push("Thiên Hình: mô tả ngũ hành không khớp hành Hỏa");
  }
  /* V3.3.143 — Bệnh Phù dùng hành Thổ theo quy ước đang áp dụng cho phần mềm.
     Mã O phải đồng thời chi phối màu sao, data-star-element và popup “Hành Thổ”. */
  if(STAR_ELEMENT["Bệnh Phù"]!=="O"){
    errors.push("Bệnh Phù: phải khóa hành Thổ (O) để màu sao và popup đồng bộ");
  }
  return {ok:errors.length===0,errors,renderedCount};
}
function auditLocCanRules(){
  const errors=[];
  const has=(name,can)=>(LOC_CAN_RULES[name]||[]).includes(can);
  if(!has("Lộc Tồn",1)||!has("Lộc Tồn",8)||has("Lộc Tồn",3))errors.push("Lộc Tồn/Can");
  if(!has("L.N. Văn Tinh",3)||!has("L.N. Văn Tinh",10)||has("L.N. Văn Tinh",1))errors.push("LN Văn Tinh/Can");
  if(!has("Thiên Trù",3)||!has("Thiên Trù",7)||has("Thiên Trù",8))errors.push("Thiên Trù/Can");
  if((LOC_CAN_RULES["Hóa Lộc"]||[]).length!==10)errors.push("Hóa Lộc/Can");
  return {ok:errors.length===0,errors};
}
function auditThienMaRules(){
  const errors=[];
  const want=[[3,"M","DUNG"],[3,"H","LOI"],[3,"K","NHUOC"],[6,"K","DIEU"],[9,"O","VAT"],[12,"T","DUNG"],[12,"M","LOI"]];
  want.forEach(([p,e,v],i)=>{if(THIEN_MA_USE[p]?.[e]!==v)errors.push(`Thiên Mã test ${i+1}`)});
  const elemWant={3:"M",6:"H",9:"K",12:"T"};
  Object.entries(elemWant).forEach(([p,e])=>{if(THIEN_MA_POSITION_META[p]?.e!==e)errors.push(`Thiên Mã đổi hành ${CHI[Number(p)]}`)});
  return {ok:errors.length===0,errors};
}

/* V3.3.143 — TÁCH HAI KHÁI NIỆM ĐỘC LẬP:
   1) BÊN TRÁI / BÊN PHẢI = quy ước TRÌNH BÀY lá số.
   2) CÁT / HUNG / TRUNG TÍNH / QUYỀN–VÕ... = thuộc tính LUẬN SAO.
   Vì vậy một sao có thể nằm cột phải nhưng không phải hung tinh mặc định.
   Tướng Quân là trường hợp điển hình: đặt bên phải theo quy ước trình bày phổ biến,
   nhưng bản chất vẫn là Võ tinh / Quyền tinh, cương mạnh, không mặc định là hung. */
const BAD_STARS=new Set([
 "Thái Tuế","Tang Môn","Quan Phù","Tử Phù","Tuế Phá","Bạch Hổ","Điếu Khách","Trực Phù",
 "Tiểu Hao","Phi Liêm","Bệnh Phù","Đại Hao","Phục Binh","Quan Phủ","Đà La","Kình Dương","Địa Không",
 "Địa Kiếp","Linh Tinh","Hỏa Tinh","Thiên Khốc","Thiên Hư","Thiên Hình","Thiên Riêu",
 "Cô Thần","Quả Tú","Phá Toái","Kiếp Sát","Lưu Hà","Thiên Không","Hóa Kỵ",
 "Thiên Thương","Thiên Sứ"
]);

/* Danh sách CỘT PHẢI chỉ phục vụ bố cục, không đồng nghĩa BAD_STARS. */
const STAR_DISPLAY_RIGHT=new Set([...BAD_STARS,"Tướng Quân","Đẩu Quân"]);
function starDisplaySide(name){return STAR_DISPLAY_RIGHT.has(name)?"right":"left"}

/* Thuộc tính luận sao tách riêng khỏi vị trí trình bày. */
const STAR_NATURE_OVERRIDES=Object.freeze({
  "Tướng Quân":Object.freeze({
    label:"QUYỀN–VÕ",
    note:"Võ tinh / Quyền tinh; cương mạnh, hiên ngang, có chí khí lãnh đạo. Không phải hung tinh mặc định; tốt/xấu tùy hội hợp."
  }),
  "Phi Liêm":Object.freeze({
    label:"LƯỠNG DIỆN • THIÊN HUNG",
    note:"Thiên về nhanh mạnh, gọn, biến động; tính lưỡng diện nhưng thiên hung hơn Tướng Quân, cần luận theo hội hợp và cung vị."
  }),
  "Đẩu Quân":Object.freeze({
    label:"TRUNG TÍNH • THIÊN NGHIÊM/THIÊN KHẮC",
    note:"Mang tính nghiêm nghị, nguyên tắc, kiểm soát và giữ gìn; có mặt khắc nghiệt, cô cứng, ít thuận sinh nở. Không mặc định là hung; ở Quan Lộc hội cát tinh có thể tăng danh quyền."
  })
});
function starNatureMeta(name){
  if(STAR_NATURE_OVERRIDES[name])return STAR_NATURE_OVERRIDES[name];
  if(BAD_STARS.has(name))return {label:"HUNG / SÁT / BẠI",note:"Thuộc nhóm thiên hung/sát/bại trong hệ phân loại luận sao hiện tại; mức độ phải phối hội hợp, đắc hãm và cung vị."};
  return {label:"CÁT / TRỢ / TRUNG TÍNH",note:"Không xếp vào nhóm hung mặc định trong hệ hiện tại; cần đọc bản tính riêng của sao và toàn bộ hội hợp."};
}

/* V3.3.143 — STAR MASTER DATABASE.
   Từ phiên bản này UI/popup/audit đọc hồ sơ sao qua một cổng duy nhất.
   Các bảng lịch sử vẫn được giữ để tương thích với engine an sao, nhưng STAR_MASTER_DB
   là lớp chuẩn hóa thống nhất: hành, vị trí trình bày, bản chất luận và nội dung popup. */
function buildStarMasterDatabase(){
  const names=new Set([
    ...Object.keys(MAJOR_META||{}),
    ...Object.keys(STAR_ELEMENT||{}),
    ...Object.keys(STAR_HELP_DATA||{}),
    ...BAD_STARS,
    ...STAR_DISPLAY_RIGHT
  ]);
  const out={};
  for(const name of names){
    const nature=STAR_NATURE_OVERRIDES[name]
      ? {...STAR_NATURE_OVERRIDES[name]}
      : (BAD_STARS.has(name)
        ? {label:"HUNG / SÁT / BẠI",note:"Thuộc nhóm thiên hung/sát/bại trong hệ phân loại luận sao hiện tại; mức độ phải phối hội hợp, đắc hãm và cung vị."}
        : {label:"CÁT / TRỢ / TRUNG TÍNH",note:"Không xếp vào nhóm hung mặc định trong hệ hiện tại; cần đọc bản tính riêng của sao và toàn bộ hội hợp."});
    out[name]=Object.freeze({
      name,
      element:MAJOR_META[name]?.e||STAR_ELEMENT[name]||"",
      displaySide:STAR_DISPLAY_RIGHT.has(name)?"right":"left",
      nature:Object.freeze(nature),
      dictionary:STAR_HELP_DATA[name]?.tb||"",
      thienLuong:STAR_HELP_DATA[name]?.tl||"",
      majorId:MAJOR_META[name]?.id||null
    });
  }
  return Object.freeze(out);
}
const STAR_MASTER_DB=buildStarMasterDatabase();
function starMasterMeta(name){
  return STAR_MASTER_DB[name]||Object.freeze({name,element:"",displaySide:"left",nature:{label:"CHƯA PHÂN LOẠI",note:"Chưa có hồ sơ chuẩn hóa."},dictionary:"",thienLuong:"",majorId:null});
}
function auditStarMasterDatabase(){
  const errors=[];
  const known=new Set([...Object.keys(MAJOR_META),...Object.keys(STAR_ELEMENT),...Object.keys(STAR_HELP_DATA)]);
  for(const name of known){
    const m=STAR_MASTER_DB[name];
    if(!m){errors.push(`${name}: thiếu STAR MASTER`);continue;}
    const expectedElement=MAJOR_META[name]?.e||STAR_ELEMENT[name]||"";
    if(m.element!==expectedElement)errors.push(`${name}: STAR MASTER lệch hành`);
    const expectedSide=STAR_DISPLAY_RIGHT.has(name)?"right":"left";
    if(m.displaySide!==expectedSide)errors.push(`${name}: STAR MASTER lệch cột`);
    if(STAR_HELP_DATA[name]&&(!m.dictionary||!m.thienLuong))errors.push(`${name}: STAR MASTER thiếu popup`);
  }
  if(starMasterMeta("Bệnh Phù").element!=="O")errors.push("STAR MASTER: Bệnh Phù phải hành Thổ");
  if(starMasterMeta("Tướng Quân").displaySide!=="right")errors.push("STAR MASTER: Tướng Quân phải cột phải");
  if(starMasterMeta("Đẩu Quân").displaySide!=="right")errors.push("STAR MASTER: Đẩu Quân phải cột phải");
  if(starMasterMeta("Phi Liêm").displaySide!=="right")errors.push("STAR MASTER: Phi Liêm phải cột phải");
  return {ok:errors.length===0,errors,starCount:Object.keys(STAR_MASTER_DB).length};
}

/* Quy ước HIỂN THỊ của vòng Bác Sĩ/Lộc Tồn.
   Tướng Quân và Phi Liêm cùng ở cột phải nhưng bản chất luận khác nhau. */
const LOC_RING_LEFT_DISPLAY=Object.freeze(["Bác Sỹ","Lực Sĩ","Thanh Long","Tấu Thư","Hỷ Thần"]);
const LOC_RING_RIGHT_DISPLAY=Object.freeze(["Tiểu Hao","Tướng Quân","Phi Liêm","Bệnh Phù","Đại Hao","Phục Binh","Quan Phủ"]);
function auditStarDisplaySides(){
  const mustRight=["Địa Không","Địa Kiếp","Kình Dương","Đà La","Linh Tinh","Hỏa Tinh","Hóa Kỵ","Kiếp Sát","Lưu Hà","Thiên Thương","Thiên Sứ","Phi Liêm","Tướng Quân","Đẩu Quân"];
  const mustLeft=["Lộc Tồn","Hóa Lộc","Hóa Quyền","Hóa Khoa","Tả Phụ","Hữu Bật","Văn Xương","Văn Khúc","Thiên Khôi","Thiên Việt","Ân Quang","Thiên Quý","Long Trì","Phượng Các","Thiên Giải","Địa Giải","Giải Thần","Thiên Quan","Thiên Phúc","Thiên Trù"];
  const errors=[];
  mustRight.forEach(n=>{ if(starDisplaySide(n)!=="right") errors.push(`${n} chưa ở cột phải`); });
  mustLeft.forEach(n=>{ if(starDisplaySide(n)!=="left") errors.push(`${n} bị xếp nhầm cột phải`); });
  LOC_RING_RIGHT_DISPLAY.forEach(n=>{ if(starDisplaySide(n)!=="right") errors.push(`Vòng Bác Sĩ: ${n} phải ở cột phải`); });
  LOC_RING_LEFT_DISPLAY.forEach(n=>{ if(starDisplaySide(n)!=="left") errors.push(`Vòng Bác Sĩ: ${n} phải ở cột trái`); });
  if(BAD_STARS.has("Tướng Quân"))errors.push("Tướng Quân không được gắn bản chất hung chỉ vì đặt cột phải");
  if(starNatureMeta("Tướng Quân").label!=="QUYỀN–VÕ")errors.push("Tướng Quân: sai thuộc tính Quyền–Võ");
  if(starNatureMeta("Phi Liêm").label!=="LƯỠNG DIỆN • THIÊN HUNG")errors.push("Phi Liêm: sai thuộc tính lưỡng diện thiên hung");
  const ring=["Bác Sỹ","Lực Sĩ","Thanh Long","Tiểu Hao","Tướng Quân","Tấu Thư","Phi Liêm","Hỷ Thần","Bệnh Phù","Đại Hao","Phục Binh","Quan Phủ"];
  if(new Set(ring).size!==12)errors.push("Vòng Bác Sĩ: danh sách kiểm thử không đủ 12 sao duy nhất");
  return {ok:errors.length===0,errors,locRingChecked:ring.length};
}


/* Sao trọng điểm theo hệ nghiệm lý đang áp dụng:
   - Giáp/Ất hoặc Mệnh Mộc: Thiên Hình
   - Bính/Đinh hoặc Mệnh Hỏa: Hóa Kỵ
   - Mậu/Kỷ hoặc Mệnh Thổ: Đường Phù
   - Canh/Tân hoặc Mệnh Kim: Hỏa Tinh, Linh Tinh
   - Nhâm/Quý hoặc Mệnh Thủy: Cô Thần, Quả Tú
   Nếu cả Can và Nạp âm bản mệnh cùng rơi vào một nhóm, dùng lớp nhấn mạnh hơn. */
const KEY_STAR_RULES=Object.freeze([
  Object.freeze({stems:Object.freeze([1,2]), element:"M", stars:Object.freeze(["Thiên Hình"]), label:"Giáp–Ất / Mệnh Mộc"}),
  Object.freeze({stems:Object.freeze([3,4]), element:"H", stars:Object.freeze(["Hóa Kỵ"]), label:"Bính–Đinh / Mệnh Hỏa"}),
  Object.freeze({stems:Object.freeze([5,6]), element:"O", stars:Object.freeze(["Đường Phù"]), label:"Mậu–Kỷ / Mệnh Thổ"}),
  Object.freeze({stems:Object.freeze([7,8]), element:"K", stars:Object.freeze(["Hỏa Tinh","Linh Tinh"]), label:"Canh–Tân / Mệnh Kim"}),
  Object.freeze({stems:Object.freeze([9,10]), element:"T", stars:Object.freeze(["Cô Thần","Quả Tú"]), label:"Nhâm–Quý / Mệnh Thủy"})
]);
const ELEMENT_LABEL=Object.freeze({M:"Mộc",H:"Hỏa",O:"Thổ",K:"Kim",T:"Thủy"});

function keyStarFocusInfo(star,c){
  if(!star || !c)return {focus:false,strong:false,reasons:[]};
  const rule=KEY_STAR_RULES.find(r=>r.stars.includes(star.name));
  if(!rule)return {focus:false,strong:false,reasons:[]};
  const byCan=rule.stems.includes(c.canNam);
  const byMenh=c.banMenh?.e===rule.element;
  if(!byCan && !byMenh)return {focus:false,strong:false,reasons:[]};
  const reasons=[];
  if(byCan)reasons.push(`Thiên Can ${CAN[c.canNam]}`);
  if(byMenh)reasons.push(`Mệnh ${ELEMENT_LABEL[c.banMenh.e]||c.banMenh.e}`);
  return {focus:true,strong:byCan&&byMenh,reasons,rule};
}

function auditKeyStarRules(){
  const errors=[];
  const mock=(can,e)=>({canNam:can,banMenh:{e}});
  const tests=[
    ["Thiên Hình",1,"K",true,false],["Thiên Hình",7,"M",true,false],["Thiên Hình",1,"M",true,true],
    ["Hóa Kỵ",3,"K",true,false],["Hóa Kỵ",7,"H",true,false],["Hóa Kỵ",3,"H",true,true],
    ["Đường Phù",5,"K",true,false],["Đường Phù",7,"O",true,false],["Đường Phù",5,"O",true,true],
    ["Hỏa Tinh",7,"M",true,false],["Linh Tinh",1,"K",true,false],["Hỏa Tinh",7,"K",true,true],
    ["Cô Thần",9,"K",true,false],["Quả Tú",1,"T",true,false],["Cô Thần",9,"T",true,true],
    ["Thiên Hình",7,"K",false,false]
  ];
  tests.forEach(([name,can,e,focus,strong],i)=>{
    const got=keyStarFocusInfo({name},mock(can,e));
    if(got.focus!==focus || got.strong!==strong)errors.push(`Sao trọng điểm test ${i+1}`);
  });
  return {ok:errors.length===0,errors};
}

/* Bảng trạng thái theo 12 địa chi: Tý..Hợi */
const STATUS={
 "Tử Vi":      ["B","Đ","M","B","V","M","M","Đ","M","B","V","B"],
 "Liêm Trinh":  ["V","Đ","V","H","M","H","V","Đ","V","H","M","H"],
 "Thiên Đồng":  ["V","H","M","Đ","H","Đ","H","H","M","H","H","Đ"],
 "Vũ Khúc":     ["V","M","V","Đ","M","H","V","M","V","Đ","M","H"],
 "Thái Dương":  ["H","Đ","V","V","V","M","M","Đ","H","H","H","H"],
 "Thiên Cơ":    ["Đ","Đ","H","M","M","V","Đ","Đ","V","M","M","H"],
 "Thiên Phủ":   ["M","B","M","B","V","Đ","M","Đ","M","B","V","Đ"],
 "Thái Âm":     ["V","Đ","H","H","H","H","H","Đ","V","M","M","M"],
 "Tham Lang":   ["H","M","Đ","H","V","H","H","M","Đ","H","V","H"],
 "Cự Môn":      ["V","H","V","M","H","H","V","H","Đ","M","H","Đ"],
 "Thiên Tướng": ["V","Đ","M","H","V","Đ","V","Đ","M","H","V","Đ"],
 "Thiên Lương": ["Đ","Đ","V","V","M","H","M","Đ","V","H","M","H"],
 "Thất Sát":    ["M","Đ","M","H","H","V","M","Đ","M","H","H","H"],
 "Phá Quân":    ["M","V","H","H","V","H","M","V","H","H","V","H"],
 /* Kình Dương: dùng hệ thông thường làm nền; Gia đình Thiên Lương xác nhận Tứ Mộ
    Sửu/Thìn/Mùi/Tuất là Đắc địa. Các vị trí khác giữ nguyên hệ nền. */
 "Kình Dương":  ["H","Đ","H","H","Đ","H","H","Đ","H","H","Đ","H"],
 "Linh Tinh":   ["H","B","Đ","Đ","Đ","Đ","Đ","B","H","H","H","H"],
 "Hỏa Tinh":    ["H","B","Đ","Đ","Đ","Đ","Đ","B","H","H","H","H"],
 "Văn Xương":   ["H","Đ","H","H","Đ","H","H","Đ","H","H","Đ","H"],
 "Văn Khúc":    ["H","Đ","H","H","Đ","H","H","Đ","H","H","Đ","H"],
 "Địa Không":   ["H","H","Đ","H","H","Đ","H","H","Đ","H","H","Đ"],
 "Địa Kiếp":    ["H","H","Đ","H","H","Đ","H","H","Đ","H","H","Đ"],
 "Hóa Khoa":    ["Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ"],
 "Hóa Quyền":   ["Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ"],
 "Hóa Lộc":     ["Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ","Đ"],
 "Hóa Kỵ":      ["H","Đ","H","H","Đ","H","H","Đ","H","H","Đ","H"],
 "Thiên Mã":    ["","","","","","","","","","","",""],

 /* Các phụ/bại tinh dưới đây khai báo ĐẦY ĐỦ 12 cung để trạng thái luôn hiện nhất quán. */
 "Thiên Hình":  ["H","H","Đ","Đ","H","H","H","H","H","Đ","Đ","H"],
 "Thiên Hư":    ["Đ","H","H","H","H","H","Đ","H","H","H","H","H"],
 "Bạch Hổ":     ["H","H","Đ","Đ","H","H","H","H","Đ","Đ","H","H"],
 "Đại Hao":     ["H","H","Đ","Đ","H","H","H","H","Đ","Đ","H","H"],
 "Thiên Riêu":  ["H","H","Đ","Đ","H","H","H","H","H","Đ","Đ","H"],
 "Tang Môn":    ["H","H","Đ","Đ","H","H","H","H","Đ","Đ","H","H"],
 "Thiên Khốc":  ["Đ","H","H","Đ","H","H","Đ","H","H","Đ","H","H"],
 "Tiểu Hao":    ["H","H","Đ","Đ","H","H","H","H","Đ","Đ","H","H"],
 /* Đà La: dùng hệ thông thường làm nền rồi áp lớp override Thiên Lương:
    - Tứ Sinh Dần/Thân/Tỵ/Hợi = Đắc địa.
    - Tứ Mộ Sửu/Thìn/Mùi/Tuất = Hãm địa.
    - Tý/Mão/Ngọ/Dậu: Thiên Lương không nêu điều chỉnh, giữ H theo bảng nền đang dùng. */
 "Đà La":       ["H","H","Đ","H","H","Đ","H","H","Đ","H","H","Đ"]
};

/* V3.3.70 — 14 CHÍNH TINH dùng bảng Miếu/Vượng/Đắc/Bình/Hãm THÔNG THƯỜNG.
   Đây là snapshot khóa để lớp nghiệm lý Thiên Lương không vô tình ghi đè bảng chính tinh. */
const COMMON_MAJOR_STATUS_SNAPSHOT=Object.freeze({
  "Tử Vi":"BĐMBVMMĐMBVB","Liêm Trinh":"VĐVHMHVĐVHMH","Thiên Đồng":"VHMĐHĐHHMHHĐ",
  "Vũ Khúc":"VMVĐMHVMVĐMH","Thái Dương":"HĐVVVMMĐHHHH","Thiên Cơ":"ĐĐHMMVĐĐVMMH",
  "Thiên Phủ":"MBMBVĐMĐMBVĐ","Thái Âm":"VĐHHHHHĐVMMM","Tham Lang":"HMĐHVHHMĐHVH",
  "Cự Môn":"VHVMHHVHĐMHĐ","Thiên Tướng":"VĐMHVĐVĐMHVĐ","Thiên Lương":"ĐĐVVMHMĐVHMH",
  "Thất Sát":"MĐMHHVMĐMHHH","Phá Quân":"MVHHVHMVHHVH"
});
function auditCommonMajorStatuses(){
  const errors=[];
  Object.entries(COMMON_MAJOR_STATUS_SNAPSHOT).forEach(([name,expected])=>{
    const got=(STATUS[name]||[]).join("");
    if(got!==expected)errors.push(`${name} lệch bảng chính tinh thông thường`);
  });
  return {ok:errors.length===0,errors};
}

/* Regression guard: mọi sao có bảng trạng thái, trừ Thiên Mã chỉ an tại Tứ Sinh,
   phải có đủ 12 giá trị M/V/Đ/B/H. */
const STATUS_REQUIRE_FULL=Object.freeze(Object.keys(STATUS).filter(n=>n!=="Thiên Mã"));
function auditStarStatuses(){
  const errors=[];
  const allowed=new Set(["M","V","Đ","B","H"]);
  STATUS_REQUIRE_FULL.forEach(name=>{
    const arr=STATUS[name];
    if(!Array.isArray(arr)||arr.length!==12){errors.push(`${name}: bảng trạng thái không đủ 12 cung`);return;}
    arr.forEach((v,i)=>{if(!allowed.has(v))errors.push(`${name} ${CHI[i+1]}: thiếu/sai trạng thái`);});
  });
  /* Điểm kiểm chứng từ lá số mẫu: Bạch Hổ/Tiểu Hao tại Mão và Đại Hao tại Dậu đều Đắc. */
  if(STATUS["Bạch Hổ"][3]!=="Đ")errors.push("Bạch Hổ tại Mão phải Đ");
  if(STATUS["Tiểu Hao"][3]!=="Đ")errors.push("Tiểu Hao tại Mão phải Đ");
  if(STATUS["Đại Hao"][9]!=="Đ")errors.push("Đại Hao tại Dậu phải Đ");
  /* Gia đình Thiên Lương: Kình đắc Tứ Mộ; Đà đắc Tứ Sinh và hãm Tứ Mộ. */
  [2,5,8,11].forEach(branch=>{
    if(STATUS["Kình Dương"][branch-1]!=="Đ")errors.push(`Kình Dương tại ${CHI[branch]} phải Đ theo Thiên Lương`);
  });
  [[3,"Đ"],[6,"Đ"],[9,"Đ"],[12,"Đ"], [2,"H"],[5,"H"],[8,"H"],[11,"H"]].forEach(([branch,expected])=>{
    if(STATUS["Đà La"][branch-1]!==expected)errors.push(`Đà La tại ${CHI[branch]} phải ${expected} theo Thiên Lương`);
  });
  /* Những vị trí Thiên Lương không nêu khác biệt giữ đúng bảng nền thông thường đang dùng. */
  [1,3,4,6,7,9,10,12].forEach(branch=>{
    if(!STATUS["Kình Dương"][branch-1])errors.push(`Kình Dương tại ${CHI[branch]} thiếu trạng thái nền`);
  });
  [1,4,7,10].forEach(branch=>{
    if(STATUS["Đà La"][branch-1]!=="H")errors.push(`Đà La tại ${CHI[branch]} phải giữ H theo hệ nền thông thường`);
  });
  return {ok:errors.length===0,errors};
}

const LOC_TON=[0,3,4,6,7,6,7,9,10,12,1]; // index theo can 1..10
const THAI_TUE=["Thái Tuế","Thiếu Dương","Tang Môn","Thiếu Âm","Quan Phù","Tử Phù","Tuế Phá","Long Đức","Bạch Hổ","Phúc Đức","Điếu Khách","Trực Phù"];

const THAI_TUE_SET=new Set(THAI_TUE);
const INTERPRETATION_32={"1": {"title": "Sao Át chủ và Mệnh Thân cùng tam hợp Thái Tuế.", "body": "Trường hợp này biểu thị sự tương ứng mật thiết giữa Ý tưởng và Hiện thực: cái Lý trong Tâm có điều kiện thuận tiện triển khai thành Sự. Bởi vậy, đây là thế có khả năng đột phá tạo nên thành công lớn.\nTuy nhiên, do đặc tính cực đoan, độc đoán và tự tin thái quá, nên khi gặp thời vận bất lợi (lâm thế đối xung hoặc hình hại), toàn bộ cơ đồ lại rất dễ gãy đổ đột ngột. Chính sự mạnh mẽ của “thế” vừa là ưu thế, vừa là mối nguy ngầm nảy sinh.", "loiBinh": "Thế vượng dễ thành, cũng dễ gãy; chỉ khi giữ tâm quân bình mới khiến cơ đồ bền lâu."}, "2": {"title": "Sao Át chủ và Mệnh cùng tam hợp Thái Tuế, riêng Thân thuộc tam hợp Tuế Phá.", "body": "Bởi Lý và Sự đồng hành trong cùng tam hợp Thái Tuế -.cho thấy Tâm ý có điều kiện thuận để biểu hiện thành Sự,  Riêng Thân thuộc tam hợp Tuế Phá - biểu hiện người thận trọng hơn, chậm rãi hơn, không vội vã bộc phát .\nĐặc biệt, sự thành công ở thế này thường không đến dễ dàng mà phải trải qua nhiều thử thách. Thậm chí phải dấn thân trong mạo hiểm, biến động hay thời loạn mới có cơ hội gặt hái thành tựu. Nói cách khác, đây là mẫu người càng trải nguy nan càng bộc lộ sức mạnh, lấy nghịch cảnh làm bệ phóng cho sự nghiệp. Lý vậy trong mọi thời vận tốt xấu bản thân đều có đủ bản lãnh xoay chuyển thích nghi.", "loiBinh": "Nghịch cảnh là duyên, nguy nan là bệ phóng; chỉ với tâm an định mới chuyển hung thành cát, giữ vững cơ đồ."}, "3": {"title": "Sao Át chủ và Thân cùng trong tam hợp Thái Tuế, riêng Mệnh thuộc tam hợp Tuế Phá", "body": "Đây là mẫu người giàu nghị lực, biết nhẫn nhịn trong nghịch cảnh. Thuở ban đầu còn nhiều yếu kém, song nhờ sức chịu đựng và sự kiên trì - họ từng bước hiện thực hóa mục tiêu theo đúng tâm ý đã hoạch định và cuối cùng gặt hái thành công. Trong hạn vận, dù gặp thời xấu hay tốt, bản mệnh vẫn dựa vào nghị lực để giữ thế cân bằng, chuyển hóa nghịch cảnh thành thuận duyên. Vì thế, cuộc đời phần nhiều gian nan buổi đầu nhưng càng về sau càng sung túc, thử thách nhiều bao nhiêu thì hậu vận càng bền vững bấy nhiêu. Riêng mặt tư tưởng do giao thoa giữa Át chủ (Thái tuế) & Mệnh (Tuế phá) nên tâm thức luôn cảm thấy mọi sự luôn bất toàn và cần sửa sai.", "loiBinh": "Toàn hay khiếm cũng chỉ là bóng. Sửa sai cũng chỉ là chấp, rốt cùng-lời cũng là hư. Vô ngôn mới là tâm đạo."}, "4": {"title": "Sao Át chủ thế Thái Tuế, Mệnh và Thân đồng cư Tuế Phá.", "body": "Ðây là cách cục biểu hiện rõ nét tâm thức chính trực, luôn khởi ý muốn điều chỉnh mọi sự cho ngay thẳng, công minh. Người mang cách này thường sống với lý tưởng cao, không chịu thuận theo những điều quanh co, sai lệch.\nTuy nhiên, bởi lâm vào thế Tuế Phá, hoàn cảnh đời thường không thuận, ít khi được đứng ở dòng chính nên chí lớn khó trọn, thực hiện thường dang dở giữa đường. Tài năng và tâm huyết có thừa, nhưng thế lực lại không đủ, nên càng nhiều dự tính thì càng dễ gặp trở ngại, gây tiếc nuối suốt đời.\n\nĐiểm đáng chú ý: thuở thiếu thời và trung niên nhờ năng lực cải cách mạnh mẽ,dễ tạo được thanh danh được người đời nhắc đến sớm. Nhưng từ trung niên về sau, thế lực dần suy, sự nghiệp ít còn đất dụng võ; càng muốn giữ vị thế lại càng dễ cô độc, thậm chí bất mãn trước cảnh đời trái nghịch .", "loiBinh": "Thái Tuế mở đường, Tuế Phá thử sức- thành bại chỉ là nhịp thăng trầm của vận số. Khi tâm an thì dang dở cũng là viên mãn ."}, "5": {"title": "Sao Át chủ trong tam hợp Thái Tuế, Mệnh-Thân tam hợp Thiếu Dương.", "body": "Cách cục này biểu thị ước mơ và tâm ý có điều kiện thuận đi vào thực tại, thường đạt kết quả hơn mức dự định ban đầu. Tuy nhiên, sự khác biệt rõ rệt tùy theo tuổi Dương hay tuổi Âm.\n\n\\- Tuổi Dương: Ước mơ dễ trở thành hiện thực vượt xa dự kiến. Người biết giữ mức điều hòa thì càng sung túc, cuộc sống phần lớn được ưu đãi, gặp nhiều may mắn. Buổi đầu dấn thân còn khó khăn, nhưng càng về hậu vận càng tốt đẹp, an lạc.\n\n\\- Tuổi Âm: Ước mơ cũng thành hiện thực trên mức dự định, nhưng vì khuynh hướng lay động trước lòng tham nên dễ bị tổn thương cả tinh thần lẫn vật chất. Cần đặc biệt tỉnh thức trước cám dỗ và sự dẫn dắt sai lầm. Tuổi này thường may mắn bộc phát khi mới vào đời, nhưng hậu vận chỉ dừng ở mức trung bình, khó giữ trọn vẹn sự thịnh đạt.", "loiBinh": "Ước mơ lớn hay nhỏ, thành hay bại, chỉ khi biết đủ và tỉnh thức thì mới thật sự an lạc.."}, "6": {"title": "Sao Át chủ trong tam hợp Thái Tuế, Mệnh ở thế Thiếu Dương, Thân thuộc Thiếu Âm.", "body": "Trường hợp này cho thấy hoàn cảnh đời sống thường thuận tiện, gần như tương ứng với ý tưởng đã hoạch định. Tuy nhiên, tùy thuộc tuổi Dương hay tuổi Âm mà biểu hiện có khác biệt:\n\n\\- Tuổi Dương: Hoàn cảnh được ưu tiên, nhiều điều diễn ra đúng như dự tính. Người có tính cách đúng đắn, cao thượng, nhưng khi hành xử lại quá khiêm cung, nhún nhường nên đôi khi thua thiệt. Dẫu vậy, cuộc sống vẫn giữ được mức ổn định trong hầu hết mọi hoàn cảnh.\n\n\\- Tuổi Âm: Hoàn cảnh cũng thuận lợi và ưu đãi như dự định. Nhờ đức độ, biết kiểm soát lòng tham, lại sống theo tinh thần “biết mình , biết người, biết sự . .  là sống”, nên mọi sự an hưởng bền lâu, tâm ý hài lòng trong mọi cảnh ngộ.", "loiBinh": "“Tùy duyên an phận, tức là toàn vẹn.”"}, "7": {"title": "Sao Át chủ trong tam hợp Thái Tuế, Mệnh thế Thiếu Âm, Thân thuộc Thiếu Dương.", "body": "\\- Tuổi Dương: Thường khởi đầu trong cảnh ngộ thua thiệt, song do Tâm ý kiên định, biết ẩn nhẫn hoạch định, giữ vững chí hướng để vượt qua nhiều thử thách đầu đời mà đạt được sự hài lòng nơi hậu vận.\n\n\\- Tuổi Âm: Mang tâm thế lo toan thường trực, dù gặp thuận cảnh hay nghịch cảnh đều thấy bất toàn; được ưu đãi cũng không thấy đủ. Đây là mẫu người vốn thiên về lo xa, nên suốt cuộc đời ít khi an định trọn vẹn, cảm nhận bất toàn ngay giữa phúc lộc đang hiện hữu.", "loiBinh": "Được mất vốn không hai, chỉ khi dừng tâm mới thấy đời vốn tròn đầy."}, "8": {"title": "Sao Át chủ trong tam hợp Thái Tuế, Mệnh & Thân ở thế Thiếu Âm.", "body": "Nói chung là mẫu người có lòng dạ ngay thẳng, tâm thức chính trực-thể hiện qua  hành động cao cả, không chấp nê điều vụn vặt, tầm thường. Tuy nhiên sự thọ hưởng có đôi chút khác biệt, phân hóa theo tuổi Âm & Dương.\n\n\\- Tuổi Dương: vận trình thường bất thường, được thì nhiều mà mất cũng lớn, tựa như sóng lớn dâng cao rồi lại cuốn trôi mạnh mẽ. Tuy được mất thất thường nhưng tâm ý không vì thế mà xao động bất mãn.\n\n\\- Tuổi Âm: sự thọ hưởng từ tốn, chậm rãi, tích lũy từng chút một mà thành, tuy gian nan buổi đầu nhưng càng về sau càng vững bền, hậu vận an nhàn và hạnh phúc.", "loiBinh": "Được hay mất, nhiều hay ít, rốt cuộc cũng chỉ như mây bay. Tâm an, đời đủ."}, "9": {"title": "Sao Át chủ và Mệnh Thân cùng trong tam hợp Tuế Phá .", "body": "Cách cục này cho thấy tâm ý và đời sống luôn biến động khó lường, lúc nào cũng trong thế chực chờ cải cách. Người này thường tâm ý lao xao, đường lối thay đổi liên tục, nay theo hướng này, mai theo hướng khác, rất khó an định. Nội tâm đương số luôn khắc khoải, cảm giác không ai thực sự hiểu hoặc đồng cảm với tâm tư mình. Tuy nhiên, chính nhờ nhìn sâu vào nội tâm, họ có khả năng sáng tạo và nhận thấy vấn đề dưới nhiều chiều khác nhau. Với tính khí đối lập, họ luôn tìm kiếm sự hoàn thiện, dù thừa nhận rằng sự bất toàn là điều không tránh khỏi.\n\nĐây là mẫu người không hài lòng với hiện tại ngay cả khi gặp vận Thái Tuế và đạt thành công bên ngoài, họ vẫn thấy chưa trọn ý. Nói cách khác, niềm hạnh phúc không chỉ dựa vào thành công mà còn phụ thuộc vào sự an yên nội tâm .", "loiBinh": "Biến động ngoài kia, tĩnh lặng trong tâm; đó là cửa thoát."}, "10": {"title": "Sao Át chủ đóng ở Tuế Phá, Mệnh Thân thuộc tam hợp Thái Tuế.", "body": "Thế số cho thấy tâm tưởng luôn hướng tới khai mở, đổi mới, mong muốn biến động được hóa giải thành an yên. Nhưng do Át chủ ở Tuế Phá, nên đường tâm ý thường gặp điều trái ý, khó đi trọn nguyện vọng.\n\nTrong khi đó, Mệnh và Thân ở tam hợp Thái Tuế khiến thực tế đời sống vẫn tỏ ra vững vàng, nhiều thuận lợi, dễ tạo nên hình ảnh thành công bên ngoài. Tuy nhiên, nội tâm thường cảm thấy chưa thỏa mãn, như có khoảng cách giữa hoài bão và kết quả đạt được.\n\nTóm lại, thế số này phản ánh sự bất tương xứng giữa Lý và Sự: bên ngoài sáng sủa, nhưng bên trong vẫn chưa đạt ý nguyện.", "loiBinh": "Muốn vượt khỏi mâu thuẫn, cần biết dung hòa Lý và Sự: để Tâm thuận theo thực tại, và dùng thực tại nuôi dưỡng Tâm- đời sống mới thật sự an lạc viên mãn."}, "11": {"title": "Át chủ và Mệnh đóng ở Tuế Phá, Thân thuộc tam hợp Thái Tuế.", "body": "Cách cục này biểu hiện Tâm ý và hoàn cảnh đời sống luôn đặt trong thế cải cách, khởi đầu thường phải ẩn nhẫn, chịu đựng nghịch cảnh. Tuy nhiên, từ nửa đời sau trở đi, hoài bão dần có cơ hội bước vào thực tế. Thành công tuy có, nhưng thường chỉ ở mức độ khiêm tốn, không bộc phát lớn lao.\nĐây là mẫu người sống trong nghịch cảnh với tư tưởng đột phá, nhờ đó hình thành đủ bản lãnh để tự điều chỉnh đời sống sao cho an toàn, ổn định. Chính nhờ năng lực kiên trì thích ứng & nhất là giữ được tâm bình- bản thân mới tìm thấy con đường an cư trong biến động.", "loiBinh": "Dẫu trải bao biến động, thăng trầm hạn vận, chỉ khi tâm bình lặng-hậu vận mới cập bến an cư."}, "12": {"title": "Sao Át chủ đi cùng Thân đóng ở Tuế Phá, trong khi Mệnh thuộc tam hợp Thái Tuế.", "body": "Cách cục biểu hiện mẫu người ôm hoài bão lớn, đặc biệt thiên về cải cách và đổi mới. Đương số thường có hoàn cảnh thuận tiện, thời thế đưa đẩy để biến ý tưởng thành hành động, từ đó dễ trở thành người tiên phong trong một trào lưu hay lĩnh vực.\nTuy nhiên, chính tham vọng lớn lao đôi khi vượt quá sức chứa và giới hạn thực tế khiến con đường sự nghiệp thường gặp cảnh dang dở. Dù năng lực và ý chí đều mạnh mẽ, nhưng khoảng cách giữa lý tưởng và thực tại khiến kết quả thường không trọn vẹn, để lại tiếc nuối như một dấu ấn khó xóa trong đời. Đây là mẫu người dễ bị cuốn vào vòng xoáy của “kỳ vọng càng cao - vấp ngã càng nhiều”.\nNếu biết tiết chế tham vọng, đặt trọng tâm vào từng bước nhỏ vững chắc thay vì mưu cầu toàn vẹn một lần, thì chí hướng cải cách mới có thể thành công bền lâu. Bằng không, phần đời thường ghi nhận sự rực rỡ ban đầu nhưng cuối cùng vẫn là dang dở, chỉ để lại tiếng vọng mà thiếu sự thực hiện trọn vẹn.", "loiBinh": "Cải cách nếu thuận thời, tâm sáng thì việc lớn tự thành; nghịch thời mà tham vọng, tất khó tránh dở dang."}, "13": {"title": "Sao Át chủ lâm thế Tuế Phá, Mệnh và Thân đóng ở Thiếu Dương.", "body": "Mẫu người có tâm thức sáng tạo, ý tưởng phong phú nhưng việc hiện thực hóa lại chịu ảnh hưởng rõ rệt bởi hoàn cảnh và căn tính Âm Dương.\n\n\\- Tuổi Dương: thường mang khí chất kiêu ngạo, gặp được môi trường ưu đãi nhưng thành quả lại hay bị phủ nhận, hoặc làm nhiều mà kẻ khác hưởng lợi. Bởi vậy, đời sống dễ đưa đẩy đến cảnh ly hương; chỉ khi lập nghiệp nơi đất khách, đặc biệt ngoại quốc, mới mong có hậu vận an định, sung túc.\n\n-Tuổi Âm: cũng giàu sáng tạo nhưng thận trọng, chậm chắc và kiên nhẫn hơn. Do tính cẩn trọng, dù muộn màng họ vẫn có khả năng đạt tới mục tiêu. Cách cục này hợp chịu đựng gắn bó với quê hương, hoặc đi đi về về, thì mới bền vững hơn là ly hương hẳn.", "loiBinh": "Ly hương hay thủ xứ, sớm muộn khác nhau; chỉ tâm yên nhẫn mới định được vận an."}, "14": {"title": "Sao Át chủ lâm thế Tuế Phá, Mệnh đóng ở Thiếu Dương, Thân ở Thiếu Âm.", "body": "Mẫu người có tâm thức sáng tạo, song biểu hiện ra ngoài lại khác biệt tùy theo tính chất Âm Dương.\n\n\\- Tuổi Dương: Thường xuất phát từ hoàn cảnh trái nghịch, nhờ đó tâm trí bừng sáng, dễ nảy sinh lẽ mới để thích nghi đời sống. Vì khởi điểm từ tầng lớp thấp kém, đương số biết cảm thông và sẵn sàng sẻ chia vô vị lợi đến tha nhân. Đây là mẫu người “không thành thân cũng thành nhân”, lấy nhân cách làm gốc, giá trị đời sống không ở chỗ quyền thế mà ở lòng nhân ái.\n\n\\- Tuổi Âm: Tâm trí vốn sáng sủa, lại thêm hoàn cảnh thuận tiện sớm ban đầu nên dễ sinh tự mãn. Do đó, từ Lý đến Sự thường rơi vào khung cứng, thiếu sự uyển chuyển cần thiết. Khi bước vào thực tế, đặc biệt từ trung niên đến hậu vận, đương số thường phải tự mình gánh vác, một đường tận lực làm việc mà không có phương tiện hay trợ giúp đi kèm. Kết quả thường rơi vào cảnh \"hữu công vô lao\", nỗ lực nhiều nhưng thành tựu thụ hưởng lại chẳng được bao nhiêu.", "loiBinh": "Công quả tuy khó hưởng trọn, nhưng tâm Ta & Người không hai mới chính là phúc lạc . ."}, "15": {"title": "Sao Át chủ lâm thế Tuế Phá, Mệnh đóng ở Thiếu Âm, Thân thuộc Thiếu Dương.", "body": "Biểu thị mẫu người có nhiều mâu thuẫn nội tâm, muốn vươn lên đổi mới lại gặp trở lực vì chính hạn chế bản thân.\n\n\\- Tuổi Dương: tâm thức thường không thỏa mãn hiện tại, luôn khao khát thay đổi nhưng năng lực lại chưa đủ để thực hiện. Khi gặp vận may, thường cũng chỉ trở thành bức bình phong cho kẻ khác lợi dụng. Về hậu vận, càng cưỡng cầu danh lợi thì càng vấp phải thất bại, bất như ý. Chỉ khi biết lui về, tu dưỡng tâm tánh, hành trì nơi đạo lý, mới mong tìm thấy an lạc thân tâm.\n\n-Tuổi Âm: khuynh hướng vươn lên được tôi luyện từ nghịch cảnh. Chính gian nan thử thách khơi dậy sức mạnh nội tâm giúp họ vượt khó. Những được mất của tuổi thiếu thời trở thành kinh nghiệm quý giá, giúp thân tâm về sau hành xử đúng đắn, biết đối đãi hài hòa với người và đời. Nhờ vậy, hậu vận thường ổn định, vững chãi và an hòa.", "loiBinh": "Được mất như bóng trăng qua dòng nước, thăng trầm chỉ là duyên số; ngộ Tâm mình không khác  Tâm người thì đâu cũng là mùa Xuân."}, "16": {"title": "Sao Át chủ lâm thế Tuế Phá, Mệnh và Thân cùng đóng Thiếu Âm.", "body": "Ðây là thế số nặng về nghịch duyên. Người sinh vào cục này thường phải trải qua nhiều thử thách, đời không mấy khi thuận cảnh, nhưng chính nghịch cảnh lại là môi trường tôi luyện bản lãnh và ý chí.\n\n\\- Tuổi Dương, đây là mẫu người kiên trì ẩn nhẫn, biết chịu phần thiệt để đạt & giữ lấy cứu cánh. Họ có thiên hướng dùng phương tiện mềm mỏng, bất bạo động để tranh đấu cho cải cách, nên trong mọi vận hạn đều đủ bản lĩnh vượt qua. Sức chịu đựng bền bỉ chính là vũ khí hộ thân. Càng về hậu vận, khi đã thấu ngộ “lùi một bước là trời cao đất rộng”- cuộc sống càng thêm yên ổn, thanh thản.\n\n\\- Tuổi Âm, tâm thức lại thường bất đắc chí. Ngay cả gặp vận tốt cũng khó thoát khỏi cảnh bị chèn ép, thiệt thòi. Suốt đời thường phải lặn ngụp trong nghịch cảnh, công sức bỏ ra nhiều mà kết quả chẳng được bao nhiêu. Lý vậy, tâm trí dễ sinh bất mãn, nặng nề, nếu không biết buông xả thì khó tránh khỏi u uất, dẫn đến trầm cảm, thậm chí lâm cảnh nghiện ngập (nếu hung sát tinh vây hãm).", "loiBinh": "Thua được theo đời ảo, về nguồn Tâm mới là bến đỗ bình an ."}, "17": {"title": "Sao Át chủ ở thế Thiếu Dương, Mệnh và Thân đồng thuộc tam hợp Thái Tuế.", "body": "Cách cục biểu thị sự sáng tỏ tâm thức cùng khả năng thuận lợi để biến ý tưởng thành hiện thực. Đây là thế số có nhiều cơ hội phát huy tài năng, song cũng tiềm ẩn những thử thách tùy theo căn cơ Âm Dương của tuổi.\n\n\\- Tuổi Dương: tâm thức sáng rõ trong bối cảnh chính danh nên hầu hết ước nguyện đều dễ thành. Người có cách này thường sớm gặt hái thành tựu, song thách thức lại nằm ở chỗ giữ vững thành quả. Nếu biết lấy đạo đức làm gốc, tránh bảo thủ và độc đoán, thì con đường về sau sẽ thong dong và bền vững.\n\nTuổi Âm: tuy cũng tâm thức sáng tỏ và hoàn cảnh chính danh, nhưng bên trong luôn ẩn chứa những yếu tố bất lợi - có thể lật đổ công trình đã xây dựng ! Người mang cách này buộc phải thận trọng, đi từng bước vững chắc, không nên để cảm tính chi phối hoặc ảo tưởng quá sức mình. Hậu vận thường khó được hưởng nhàn, phần nhiều vẫn bận rộn với công việc miên man khó ngưng nghỉ.", "loiBinh": "Cơ đồ bền hay gãy, một niệm đức độ vị tha - mọi sự sẽ bình ổn."}, "18": {"title": "Sao Át chủ ở thế Thiếu Dương, Mệnh an tam hợp Thái Tuế, Thân vào thế Tuế Phá", "body": "Ðây là cách cục trí tuệ sáng tỏ sớm bộc lộ, dễ nắm bắt thời cơ, nhưng hướng phát triển và kết quả lại phân hóa rõ rệt tùy theo căn cơ Âm Dương.\n\n\\- Tuổi Dương: đây là dạng khôn mà không ngoan. Tâm trí thông minh, nhạy bén trước biến động, có khả năng chớp lấy cơ hội, nhưng lại thiếu sự kiềm chế và không biết đâu là giới hạn cần dừng. Do tham vọng và thói quen ỷ lại sức mình, đương số dễ vượt quá khuôn khổ luật pháp hoặc quy tắc xã hội. Thành tựu ban đầu có thể vang dội, nhưng càng về cuối đời càng dễ rơi vào cảnh dang dở, thậm chí gãy đổ hoàn toàn.\n\n-Tuổi Âm: tâm trí sáng suốt lại được uốn nắn theo đường chính, nên đương số biết kết hợp trí tuệ với đạo đức để tự cách mạng bản thân, điều chỉnh lối sống hài hòa và có trách nhiệm với cộng đồng. Thời thiếu niên và trung vận thường gặp nhiều khó khăn, nhưng chính nghịch cảnh rèn luyện cho họ bản lĩnh sống. Đến hậu vận, dù hoàn cảnh khá giả hay thanh bần, họ vẫn giữ được tâm thế hài lòng và an ổn với chính mình.", "loiBinh": "Cơ đồ có thể gãy, nhưng tâm giữ đạo thì đời vẫn trọn; được mất chỉ là vận, an nhiên mới là phần."}, "19": {"title": "Sao Át chủ thế Thiếu Dương, Mệnh vào Tuế Phá, Thân an Thái Tuế.", "body": "Ðây là thế số biểu thị hoàn cảnh bất như ý, nhưng tâm thức cải cách sáng suốt luôn nổi bật. Lý tưởng mạnh mẽ, song đường đời phân hóa rõ rệt giữa tuổi Dương và tuổi Âm.\n\n\\- Tuổi Dương: hoàn cảnh nghịch chiều khiến đương số sớm hình thành tư tưởng phản kháng và tinh thần cải cách. Dẫu buổi đầu chưa thành công, nhưng tài năng và chí hướng vẫn để lại dấu ấn danh tiếng. Chính kinh nghiệm từ thất bại đã giúp họ thức thời, biết thuận theo dòng chính để hành xử đúng thời vị, nhờ đó từ trung vận trở đi dễ đạt thành tựu, hậu vận cũng yên ổn và thỏa nguyện.\n\n\\- Tuổi Âm: cũng cùng một tâm thức sáng tỏ và khát vọng cải cách, nhưng do thành công đến quá sớm nên dễ sinh tự mãn. Sau đó chính thành công ấy ràng buộc mình vào khuôn phép, mất đi tính sáng tạo ban đầu. Công danh về sau chỉ là hư danh, còn thực lực thì suy giảm. Cuộc sống nhìn bề ngoài ổn định, nhưng trong tâm thường mắc mứu, khó hài lòng với chính mình cũng như xã hội.", "loiBinh": "Hưng suy do vận, khổ lạc do tâm."}, "20": {"title": "Sao Át chủ an tại Thiếu Dương, Mệnh & Thân lâm thế Tuế Phá.", "body": "Vốn đã báo trước cuộc đời nhiều nghịch duyên, dễ vướng vào cảnh được rồi lại mất, có rồi lại không.\n\n.- Tuổi Dương: Do tâm tính ỷ lại sức mình, tham vọng quá độ và nôn nóng, nên ánh sáng minh triết nơi Thiếu Dương bị che lấp. Đương số thường tự đẩy mình vào thế đối nghịch, hành sự gấp gáp mà thiếu nền tảng, bỏ nhiều công lao song thành tựu chỉ còn là cái danh hão -“có tiếng mà chẳng có miếng”. Tài trí tuy sắc bén nhưng lại bị người đời lợi dụng một thời gian rồi bỏ rơi. Chính vì thế suốt đời dễ mang nỗi bất mãn, cảm giác uất ức khi thấy công lao chẳng được trọng dụng trọn vẹn.\n\n\\- Tuổi Âm: Lại khác. Nhờ sự thâm trầm, kiên nhẫn và biết chờ thời mà bản thân có thể xoay chuyển thế khó thành thuận, từng bước đạt được mục đích đã dự tính. Càng trải dài theo năm tháng, đương số càng chứng tỏ sự bền bỉ, tích lũy công quả để rồi đến khi thời cơ đến thì thành tựu chắc chắn. Tuy nhiên, ngay cả khi gặt hái thành công, trong tâm vẫn còn chút tiếc nuối: với trí tuệ sáng suốt và công lao chịu đựng, lẽ ra kết quả phải rực rỡ hơn nữa !", "loiBinh": "Vận xoay theo Trời, tâm lặng theo Ðạo - thì còn đâu bất mãn hay tiếc nuối ?"}, "21": {"title": "Sao Át chủ, Mệnh và Thân đồng thế Thiếu Dương.", "body": "Đây là cách cục người sáng suốt, có tầm nhìn xa và mang trong mình tham vọng mạnh mẽ. Đương số không chỉ dừng lại ở ước muốn thành tựu, mà còn biết hoạch định kế hoạch, đặt mục tiêu rõ ràng và từng bước hành động để đạt tới. Tham vọng chính là ngọn lửa nội tại thôi thúc, giúp họ tạo dấu ấn và định hướng đường đời.\n\nTuy nhiên, cũng từ ngọn lửa ấy mà phân định thiện-ác, tốt -xấụ Nếu tham vọng được chuyển hóa thành động lực tích cực, hướng về sự trong sáng và vị tha, thì công danh và uy tín càng thêm bền vững. Ngược lại, nếu tham vọng bị biến chất thành tham lam vị kỷ, với những toan tính hẹp hòi và tiêu cực, thì chính nó sẽ trở thành nguyên nhân đưa bản thân vào vòng tranh đoạt, hệ quả khó tránh khỏi phá tán, khổ lụỵ", "loiBinh": "Tham vọng dựng nên thành bại, nhưng buông vọng thì ngọc sáng trong lòng ."}, "22": {"title": "Sao Át chủ và Mệnh đồng thế Thiếu Dương, Thân an tại Thiếu Âm.", "body": "Đây là cách cục người có tầm nhìn xa và khả năng nhận định tình thế sáng suốt. Đương số biết phân tích, cân nhắc nhiều mặt trước khi quyết định, nên hành động tuy chậm rãi nhưng chắc chắn. Nét đặc biệt là khả năng quản lý cảm xúc nội tâm, đồng thời thấu cảm và chia sẻ cùng người khác, nhờ đó dễ tạo nên sự hòa đồng, gắn kết.\n\nTham vọng trong cách cục này không thiên về mưu cầu riêng tư, mà hướng tới sự cân bằng, dung hòa lợi ích cá nhân và tập thể. Chính nhờ đó, khi cần, đương số sẵn sàng hy sinh điều lợi trước mắt để giữ cho đại cuộc bền vững lâu dài. Có thể nói đây là mẫu người biết tiến lùi đúng thời, biết đủ để dừng, nhờ vậy mà cuộc sống cuối đời thường an nhiên, ít vướng hệ lụy .", "loiBinh": "Biết tiến thoái thuận thời là mệnh, biết dừng nơi tâm là đạo; nhờ vậy thành bại đều hóa an nhiên ."}, "23": {"title": "Sao Át chủ & Thân đồng thế Thiếu Dương; Mệnh lâm thế Thiếu Âm.", "body": "Dạng người tài trí và nhiều tham vọng, nhưng lại thường gặp hoàn cảnh thua kém. Chính sự áp chế từ ngoại cảnh này lại trở thành ngòi nổ, thúc đẩy cái tôi bùng phát: không cam chịu thua kém, luôn muốn chứng tỏ mình vượt trội hơn người khác.\n\nNhờ trí thông minh sắc bén, đương số có khả năng tìm ra giải pháp sáng tạo trước khó khăn, nhìn xa trông rộng và biết đặt ra mục tiêu lớn lao, kèm theo những kế hoạch chi tiết để hiện thực hóa. Tuy nhiên, động cơ sâu xa lại là nhu cầu bù đắp cho những thiệt thòi quá khứ.\n\nLẽ vậy, cuộc đời thường bị cuốn vào guồng xoáy của áp lực: làm việc không ngơi nghỉ, tranh đấu với người đời, so sánh với xung quanh và không ngừng thách thức giới hạn của bản thân. Suốt đời khó hưởng được cảnh nhàn.", "loiBinh": "Thành bại vốn theo thời, được mất cũng do duyên; chỉ khi tâm biết dừng, đời mới thong dong trong chính bước đi của mình ."}, "24": {"title": "Sao Át chủ thế Thiếu Dương, Mệnh và Thân cùng thế Thiếu Âm.", "body": "Mẫu người trí sáng suốt, tầm nhìn xa và lý tưởng cao cả. Tuy nhiên, hoàn cảnh và thời cuộc thường không thuận để triển khai, khiến tài trí không được phát huy đúng mức. Càng muốn vươn tới, lại càng gặp nghịch duyên; tâm trí vì thế dần trở nên lu mờ, thiếu quyết đoán, dễ hành xử sai lầm.\n\nCái cao vọng của lý tưởng khi không được hiện thực, dung nạp lại thành thụ động, hoài nghi chính mình. Đương số thường sống trong tâm cảnh dằn vặt, u uất- biết mình có khả năng nhưng không gặp được vận hội để thành tựu, nên dễ lạc bước trong nhầm lẫn kéo dài suốt đời.", "loiBinh": "Thời thế có thể ngăn bước, nhưng tâm an thì được-mất tức khắc lìa xa; sáng suốt vốn vẫn nằm ngay chính mình."}, "25": {"title": "Sao Át chủ an thế Thiếu Âm, Mệnh và Thân đồng trong tam hợp Thái Tuế.", "body": "Cách cục biểu thị mẫu người nghiêng về chính nghĩa, sẵn sàng lấy lý tưởng cộng đồng làm trọng, coi nhẹ lợi ích riêng tư.\n\n-Tuổi Dương: Đây là dạng người có khí chất hy sinh, chấp nhận thiệt thòi để phụng sự cho điều mà mình tin là chính nghĩa . Đương số có sức chịu đựng bền bỉ trước áp lực tinh thần, không nao núng trước cảnh cô độc hay lời chỉ trích khi đi ngược chính kiến. Tuy nhiên, hệ quả thường công sức bỏ ra nhiều mà phần thụ hưởng vật chất hạn hẹp, chỉ còn lại niềm vui nơi tâm tưởng\n\n\\- Tuổi Âm: Cũng chung một tinh thần chính nghĩa, nhưng gặp bối cảnh thuận lợi hơn. Đương số biết rõ giá trị và tầm quan trọng của việc mình làm, từ đó hành động có chủ đích và đạt hiệu quả thiết thực. Thành công đến dễ dàng hơn, tuy vật chất có phần khiêm tốn nhưng vẫn đủ để an ổn, hài hòa cùng sự thỏa nguyện về tinh thần.", "loiBinh": "Danh lợi được mất theo thời, nhưng tâm chính nghĩa an nhiên thì phúc luôn viên mãn."}, "26": {"title": "Sao Át chủ thế Thiếu Âm; Mệnh thuộc tam hợp Thái Tuế, Thân vào tam hợp Tuế Phá.", "body": "-Tuổi Dương: Đây là mẫu người giàu lòng trắc ẩn, có khả năng cảm nhận và thấu hiểu sâu sắc những nỗi đau, mất mát, hay bất công mà tha nhân gánh chịu. Chính sự đồng cảm này trở thành động lực thúc đẩy họ dấn thân hành động để hỗ trợ, bảo vệ kẻ yếu thế hoặc theo đuổi một lý tưởng nhân bản. Đường đời thường khởi đầu nhiều gian nan, song nhờ lòng kiên trì và nghị lực bền bỉ mà dần vượt qua thử thách. Hậu vận tuy không hoàn toàn viên mãn, nhưng với tâm thức biết chấp nhận và trân trọng điều đạt được, đương số vẫn cảm thấy an ổn, xem đó như một sự thành tựu xứng đáng.\n\n\\- Tuổi Âm: Trái lại, đây là mẫu người mang trong mình tinh thần can đảm, dám rời bỏ sự an toàn để trực diện với bất công. Tuy nhiên, sự nôn nóng và cứng cỏi lại khiến đương số đánh mất lợi thế phương tiện, không tận dụng ngoại duyên mà quá tin cậy vào sức mình. Các quyết định phần lớn được đặt trên nền tảng đạo nghĩa và lý tưởng nhân văn; ít khi vì lợi ích vật chất hay sự tiện lợi bản thân. Chính vì vậy, con đường sự nghiệp thường nhiều dang dở, tâm ý không trọn vẹn, và cuối cùng để lại trong lòng sự bất mãn, tiếc nuối khó gỡ bỏ.", "loiBinh": "Đối thế lực lớn, lấy tâm an mà ứng, lấy phương tiện uyển chuyển mà hành- sóng gió cũng thành thuyền đưa về đích."}, "27": {"title": "Sao Át chủ ở thế Thiếu Âm; Mệnh tam hợp Tuế Phá, Thân tam hợp Thái Tuế.", "body": "\\- Tuổi Dương: Đây là mẫu người mang tầm nhìn rộng và chí khí nhiệt thành, luôn sẵn sàng dốc toàn tâm toàn lực để theo đuổi mục tiêu đã chọn. Thế nhưng, vì mong cầu sự toàn hảo và đặt nặng lý tưởng, nên dễ rơi vào thế khó dung hòa với thực tế vốn nhiều nghịch duyên và phức tạp. Kết quả sau bao nỗ lực và dốc cạn tâm huyết, đương số thường cảm thấy chưa được như mong đợi, thậm chí bất mãn với chính thành quả dang dở của mình. Càng nhiều kỳ vọng thì càng nhiều va chạm; thế cuộc chèn ép - khiến hành sự nửa chừng ngưng trệ, khó lòng thỏa nguyện trọn vẹn, dẫu cho chí hướng và công sức bỏ ra vốn hoàn toàn chính đáng.\n\n\\- Tuổi Âm: Trái lại, tuổi đây nổi bật phẩm chất ẩn nhẫn và kiên trì. Đương số biết chấp nhận sự chậm rãi, lấy gian khó làm nền tảng rèn luyện, nhờ đó từng bước xây dựng cơ nghiệp vững vàng. Dẫu đường đời không ít thử thách, nhưng với khả năng thích ứng, tự chủ và lòng trắc ẩn, họ thường biến nghịch cảnh thành cơ hội. Thành công của họ không đến vội, nhưng có chiều sâu, tạo nền tảng lâu dài, bền bỉ và đúng đắn.", "loiBinh": "Tuổi Dương dễ thấy khổ vì mộng lớn chưa thành, tuổi Âm chậm mà vững như đá tảng; rốt cùng Âm hay Dương, thành hay bại cũng chỉ là bóng trên dòng, còn tâm tĩnh mới là gốc minh minh soi chiếu an nhiên ."}, "28": {"title": "Sao Át chủ ở thế Thiếu Âm; Mệnh và Thân đồng tam hợp Tuế Phá.", "body": "\\- Tuổi Dương: Mẫu người có sức chịu đựng cao, biết nhẫn nhịn và linh hoạt trước nghịch cảnh. Họ thường chấp nhận lui về thế yếu để tính đường dài, nhờ đó có khả năng đạt mục tiêu lớn bằng con đường ôn hòa, không đối kháng trực diện. Phương tiện họ chọn thường là đối thoại, thương lượng, hay vận động tập thể thay vì bạo lực. Tâm tính ôn hòa, cảm xúc ổn định, biết tự điều chỉnh bản thân, nên dù gặp biến động bất lợi vẫn có thể xoay chuyển và thích nghi. Có thể nói, họ là dạng người “thắng nhờ nhu”, kiên định nhưng không cố chấp.\n\n\\- Tuổi Âm: Trái lại, dễ rơi vào thế tự tạo vỏ bọc. Đương số thường tin vào sáng suốt của chính mình, nhưng chính sự khép kín ấy khiến tầm nhìn dễ lấy chủ quan làm chuẩn. Khi áp dụng vào thực tế, họ thường chọn sai thời điểm, dẫn đến thất bại. Thất bại sinh ra bất mãn, mà bất mãn lại càng khóa chặt thêm lớp vỏ cô lập, vòng lặp sai lầm tái diễn. Điểm mạnh là lòng tin và sự quả quyết, nhưng điểm yếu là thiếu sự mở lòng để tiếp nhận phản chiếu từ ngoại cảnh. Do đó, nếu không biết tháo bỏ chấp niệm, thì dễ sống trong cảm giác sáng suốt nửa vời mà hệ quả lại chuốc lấy khổ lụỵ", "loiBinh": "Trong vòng xoay định mệnh, thành hay bại không chỉ do thế cuộc, mà chính là do tâm: Mở thì sáng, khép thì tối; thuận theo thì an, nghịch chấp thì khổ."}, "29": {"title": "Sao Át chủ thế Thiếu Âm; Mệnh và Thân cùng tam hợp Thiếu Dương.", "body": "Mẫu người mang tính cách hài hòa: bề ngoài nghiêm trang, cứng cỏi, nhưng nội tâm lại mềm mỏng, biết lắng nghe và thấu hiểu lẽ đời lẫn lý đạọ Điểm nổi bật là khả năng đứng vững trước nghịch cảnh, không để hoàn cảnh cuốn trôi, mà ngược lại biết xoay chuyển tình thế bằng trí tuệ và sự linh hoạt thích nghi.\n\nKhông chỉ dừng ở đó, đương số còn có tiềm năng thăng hoa về phương diện tinh thần: tiếp cận đạo lý với một trái tim từ bi, nhân hậu, kết hợp cùng sự thấu triệt sâu xa. Nhờ vậy, cuộc sống của họ không chỉ ổn định về hình tướng mà còn được nâng đỡ bởi ý nghĩa và giá trị đạo đức, ảnh hưởng bền lâu cho bản thân và người khác.", "loiBinh": "Vận thế có thể đưa người lên cao hay xuống thấp, nhưng khi tâm sáng soi( trí tuệ) thì nghịch cảnh cũng hóa thuận duyên."}, "30": {"title": "Sao Át chủ ở thế Thiếu Âm; Mệnh tam hợp Thiếu Dương, Thân tam hợp Thiếu Âm.", "body": "Thường biểu hiện mẫu người có nhận thức thấu đạt ưu khuyết điểm, sáng rõ đường lối bản thân cũng như người khác. Thuở thiếu thời, nhờ tâm trí bén nhạy trước thời cuộc nên vững tin dấn thân trong thế yếu, lấy trí tuệ và sự nhẫn nại làm phương tiện để tiến tới mục đích. Tuy nhiên, thành quả tạo dựng ban đầu lại thường rơi vào tay người khác ở điểm cuối thành công; đương số chỉ còn giữ tiếng tăm cùng quyền lực hư ảo, vật chất thụ hưởng hạn hẹp. Bước vào hậu vận tâm thức dễ co cụm trong tiêu cực, khó hòa điệu cùng người xung quanh, đời sống cuối cùng thường mang nỗi lạc lõng, trầm lắng .", "loiBinh": "Vị thế thấp mà khiên cưỡng leo cao cuối cùng vẫn là vị thế thấp. Nếu lìa được sự chấp nê cao thấp, dừng tham vọng ban đầu thì đời luôn an nhiên."}, "31": {"title": "Sao Át chủ thế Thiếu Âm; Mệnh tam hợp Thiếu Âm, Thân tam hợp Thiếu Dương.", "body": "Mẫu người thuở đầu thường bị kìm hãm trong cảnh sống thiệt thòi, tâm tính dễ trở nên ù lì, cam chịu. Thế nhưng, chính sự tích tụ và dồn nén lâu ngày ấy lại như ngọn lửa âm ỉ, chỉ chờ cơ hội thuận thời để bùng phát. Khi thời vận mở ra, đương số thường chuyển sang xu hướng lấn lướt, muốn kiểm soát, thậm chí bộc phát quyền hành hoặc hành động liều lĩnh trong những nhầm lẫn khó lường ! Căn nguyên do khát vọng thoát khỏi áp lực, khiến hành vi dễ đi đến cực đoan và thiếu sự tự chế.\n\nTuy nhiên, điểm sáng do Thân tam hợp Thiếu Dương: nếu đương số biết quay về lý Đạo, lấy trí tuệ và tâm từ làm ngọn đèn soi, thì chính sự chuyển hóa ấy sẽ giúp họ vượt khỏi cực đoan, biến dồn nén thành nội lực, và đạt đến giác ngộ đạo sáng suốt.", "loiBinh": "Người ngộ được rằng quyền hành chỉ là huyễn cảnh, còn tâm sáng mới là thực tướng, thì từ đó an nhiên, không còn bị cuốn vào vòng cực đoan, được hay mất đều như hư không."}, "32": {"title": "Sao Át chủ, Mệnh & Thân đồng cư ở thế Thiếu Âm.", "body": "Mẫu người mang trong mình tâm thế tự ti, lo sợ thất bại, thiếu quyết đoán, hay trì hoãn công việc. Đương số thường gặp khó khăn trong quản lý cảm xúc, đôi khi thiếu kỹ năng cần thiết để khởi đầu việc lớn. Bị ám ảnh bởi những nhược điểm đồng thời phóng đại rủi ro tiềm ẩn, họ ngại bước ra khỏi vùng an toàn, dần thu mình trong vỏ bọc lo âu và mặc cảm. Chính sự co cụm này khiến cơ hội dễ vuột khỏi tầm tay, nhiều lần bỏ lỡ bước chuyển quan trọng của cuộc đời. Kết cục, đa phần cuộc sống an phận, bằng lòng với những gì sẵn có, hơn là dấn thân tìm cầu đột phá hay mở ra lối đi khác biệt.", "loiBinh": "Ðịnh nghiệp tuy khiến bước chân chùn lại, nhưng một khi tâm không vướng mắc, biết dừng nơi chỗ biết đủ- thì cuộc đời vẫn thong dong."}};

function thaiTueFocusRole(branch,c){
  const roles=[];
  if(branch===c.menh)roles.push("Mệnh");
  if(branch===c.than)roles.push("Thân");
  if(branch===c.atChuBranch)roles.push("Át Chủ");
  return roles;
}
function isThaiTueFocusStar(star,branch,c){
  return THAI_TUE_SET.has(star.name) && thaiTueFocusRole(branch,c).length>0;
}
function thaiTueFocusSummary(c){
  const result=[];
  [["Mệnh",c.menh],["Thân",c.than],["Át Chủ",c.atChuBranch]].forEach(([role,branch])=>{
    if(!branch)return;
    const s=(c.buckets[branch]||[]).find(x=>THAI_TUE_SET.has(x.name));
    if(s)result.push({role,branch,star:s.name});
  });
  return result;
}

function isTuLocStar(star){
  return THIEN_LUONG_TU_LOC_SET.has(star.name);
}
function tuLocSummary(c){
  const menhTaiQuan=new Set([c.menh,wrap1(c.menh+4),wrap1(c.menh+8)]);
  return THIEN_LUONG_TU_LOC.map(name=>{
    const branch=c.positions[name]||null;
    return {
      name,
      branch,
      house:branch?houseName(branch,c.menh):null,
      atMenh:branch===c.menh,
      atThan:branch===c.than,
      inMenhTaiQuan:branch?menhTaiQuan.has(branch):false
    };
  });
}

/* Chỉ ghi nhận dữ kiện của ba vòng tại cung Mệnh.
   Chưa tự suy diễn "đắc cách/đắc vị" nếu không có quy tắc định lượng đầy đủ. */
function tamVongMenhSummary(c){
  const stars=c.buckets[c.menh]||[];
  const thaiTue=stars.find(s=>s.source==="vong-thai-tue" && THAI_TUE_SET.has(s.name));
  const locRing=stars.find(s=>s.source==="vong-loc");
  const trangSinh=stars.find(s=>s.source==="trang-sinh");
  const isLocTon=c.positions["Lộc Tồn"]===c.menh;
  return {
    thaiTue:thaiTue?.name||null,
    locTon:isLocTon ? `Lộc Tồn${locRing?` / ${locRing.name}`:""}` : (locRing?.name||null),
    trangSinh:trangSinh?.name||null
  };
}

/* Phân loại 4 thế theo vòng Thái Tuế của năm sinh. */
function thaiTueThe(branch,yearBranch){
  const r=mod(branch-yearBranch,12)%4;
  return r===0?"TT":r===1?"TD":r===2?"TP":"TA";
}
function thaiTueTheName(code){
  return ({TT:"tam hợp Thái Tuế",TP:"tam hợp Tuế Phá",TD:"thế Thiếu Dương",TA:"thế Thiếu Âm"})[code]||code;
}
/* ============================================================
   V3.3.70 — KHÓA ÁNH XẠ 32 THẾ ÁT CHỦ
   Không suy số thế bằng công thức offset + tổ hợp Mệnh/Thân.
   Mỗi thế được khóa tường minh theo bộ ba:
     Át Chủ | Mệnh | Thân
   Quy ước: TT = tam hợp Thái Tuế; TP = tam hợp Tuế Phá;
             TD = thế Thiếu Dương; TA = thế Thiếu Âm.

   Lưu ý quan trọng: nhóm Át Chủ ở TP có thứ tự 9–12 khác
   ba nhóm còn lại. Đây là nguyên nhân gây nhầm ở bản trước.
   ============================================================ */
const INTERPRETATION_CASE_RULES=Object.freeze([
  {caseNo:1, at:"TT",me:"TT",th:"TT"},
  {caseNo:2, at:"TT",me:"TT",th:"TP"},
  {caseNo:3, at:"TT",me:"TP",th:"TT"},
  {caseNo:4, at:"TT",me:"TP",th:"TP"},
  {caseNo:5, at:"TT",me:"TD",th:"TD"},
  {caseNo:6, at:"TT",me:"TD",th:"TA"},
  {caseNo:7, at:"TT",me:"TA",th:"TD"},
  {caseNo:8, at:"TT",me:"TA",th:"TA"},

  /* Át Chủ ở Tuế Phá: thứ tự 9–12 theo đúng tài liệu 32 thế. */
  {caseNo:9,  at:"TP",me:"TP",th:"TP"},
  {caseNo:10, at:"TP",me:"TT",th:"TT"},
  {caseNo:11, at:"TP",me:"TP",th:"TT"},
  {caseNo:12, at:"TP",me:"TT",th:"TP"},
  {caseNo:13, at:"TP",me:"TD",th:"TD"},
  {caseNo:14, at:"TP",me:"TD",th:"TA"},
  {caseNo:15, at:"TP",me:"TA",th:"TD"},
  {caseNo:16, at:"TP",me:"TA",th:"TA"},

  {caseNo:17,at:"TD",me:"TT",th:"TT"},
  {caseNo:18,at:"TD",me:"TT",th:"TP"},
  {caseNo:19,at:"TD",me:"TP",th:"TT"},
  {caseNo:20,at:"TD",me:"TP",th:"TP"},
  {caseNo:21,at:"TD",me:"TD",th:"TD"},
  {caseNo:22,at:"TD",me:"TD",th:"TA"},
  {caseNo:23,at:"TD",me:"TA",th:"TD"},
  {caseNo:24,at:"TD",me:"TA",th:"TA"},

  {caseNo:25,at:"TA",me:"TT",th:"TT"},
  {caseNo:26,at:"TA",me:"TT",th:"TP"},
  {caseNo:27,at:"TA",me:"TP",th:"TT"},
  {caseNo:28,at:"TA",me:"TP",th:"TP"},
  {caseNo:29,at:"TA",me:"TD",th:"TD"},
  {caseNo:30,at:"TA",me:"TD",th:"TA"},
  {caseNo:31,at:"TA",me:"TA",th:"TD"},
  {caseNo:32,at:"TA",me:"TA",th:"TA"}
]);

const INTERPRETATION_CASE_MAP=Object.freeze(Object.fromEntries(
  INTERPRETATION_CASE_RULES.map(r=>[`${r.at}|${r.me}|${r.th}`,r.caseNo])
));

function auditInterpretation32Rules(){
  const errors=[];
  const caseNos=new Set();
  const keys=new Set();
  if(INTERPRETATION_CASE_RULES.length!==32)errors.push("32 thế: số lượng quy tắc không bằng 32");

  INTERPRETATION_CASE_RULES.forEach(r=>{
    const key=`${r.at}|${r.me}|${r.th}`;
    if(caseNos.has(r.caseNo))errors.push(`32 thế: trùng số ${r.caseNo}`);
    if(keys.has(key))errors.push(`32 thế: trùng tổ hợp ${key}`);
    caseNos.add(r.caseNo); keys.add(key);
    if(!INTERPRETATION_32[r.caseNo])errors.push(`32 thế: thiếu lời bình thế ${r.caseNo}`);
  });
  for(let i=1;i<=32;i++)if(!caseNos.has(i))errors.push(`32 thế: thiếu thế ${i}`);

  /* Regression bắt buộc cho nhóm TP từng gây nhầm ở V3.3.36. */
  const critical={
    "TP|TP|TP":9,
    "TP|TT|TT":10,
    "TP|TP|TT":11,
    "TP|TT|TP":12
  };
  Object.entries(critical).forEach(([key,expected])=>{
    if(INTERPRETATION_CASE_MAP[key]!==expected)errors.push(`32 thế: ${key} phải là thế ${expected}`);
  });

  return {ok:errors.length===0,errors};
}

function interpretationCase(c){
  if(!c.atChuBranch)return null;
  const at=thaiTueThe(c.atChuBranch,c.chiNam);
  const me=thaiTueThe(c.menh,c.chiNam);
  const th=thaiTueThe(c.than,c.chiNam);
  const key=`${at}|${me}|${th}`;
  const caseNo=INTERPRETATION_CASE_MAP[key]||null;
  if(!caseNo)return {caseNo:null,at,me,th,warning:`Tổ hợp Át Chủ/Mệnh/Thân ${key} nằm ngoài 32 thế đã cung cấp.`};
  return {caseNo,at,me,th,warning:""};
}
function renderInterpretation(c){
  const titleEl=document.querySelector("#interpretationTitle");
  if(!titleEl)return;
  const caseEl=document.querySelector("#interpretationCase");
  const posEl=document.querySelector("#interpretationPositions");
  const bodyEl=document.querySelector("#interpretationBody");
  const lbEl=document.querySelector("#interpretationLoiBinh");
  const ic=interpretationCase(c);
  if(!ic||!ic.caseNo){
    titleEl.textContent="Lời bình 32 thế"; caseEl.textContent="—";
    posEl.textContent=ic?.warning||"Không xác định được thế.";
    bodyEl.textContent=""; lbEl.textContent=""; lbEl.style.display="none"; return;
  }
  const data=INTERPRETATION_32[ic.caseNo];
  const agePolarity=stemYang(c.canNam)===1?"Tuổi Dương":"Tuổi Âm";
  titleEl.textContent=data.title;
  caseEl.textContent=`THẾ ${ic.caseNo}/32`;
  posEl.innerHTML=`<b>${agePolarity}</b> • <b>Mệnh:</b> ${thaiTueTheName(ic.me)} • <b>Thân:</b> ${thaiTueTheName(ic.th)} • <b>Át Chủ ${c.saoAtChu}:</b> ${thaiTueTheName(ic.at)}`;
  bodyEl.textContent=data.body;
  if(data.loiBinh){lbEl.style.display="";lbEl.textContent="Lời bình: "+data.loiBinh;}
  else{lbEl.style.display="none";lbEl.textContent="";}
}
const LOC_RING=["Bác Sỹ","Lực Sĩ","Thanh Long","Tiểu Hao","Tướng Quân","Tấu Thư","Phi Liêm","Hỷ Thần","Bệnh Phù","Đại Hao","Phục Binh","Quan Phủ"];
const TRANG_SINH=Object.freeze(["Tràng Sinh","Mộc Dục","Quan Đới","Lâm Quan","Đế Vượng","Suy","Bệnh","Tử","Mộ","Tuyệt","Thai","Dưỡng"]);

/* ============================================================
   VÒNG TRÀNG SINH — CÁCH AN THÔNG THƯỜNG
   Điểm khởi Tràng Sinh chỉ phụ thuộc Ngũ Hành Cục:
     Kim Tứ Cục                    -> Tỵ
     Mộc Tam Cục                   -> Hợi
     Hỏa Lục Cục                   -> Dần
     Thủy Nhị Cục, Thổ Ngũ Cục    -> Thân

   Chiều an:
     Dương Nam / Âm Nữ -> THUẬN
     Âm Nam / Dương Nữ -> NGHỊCH

   Khác với biến thể Thiên Lương: Âm Nam/Dương Nữ KHÔNG đổi
   điểm khởi sang Dậu/Mão/Ngọ/Tý; chỉ đổi chiều an 11 sao còn lại.
   ============================================================ */
const STANDARD_TRANG_SINH_START=Object.freeze({4:6,3:12,6:3,2:9,5:9});

/* TỨ HÓA THIÊN LƯƠNG — khóa cố định theo bài quyết:
   Giáp Liêm-Phá-Vũ-Dương; Ất Cơ-Lương-Tử-Âm;
   Bính Đồng-Cơ-Xương-Liêm; Đinh Âm-Đồng-Cơ-Cự;
   Mậu Tham-Âm-Bật-Cơ; Kỷ Vũ-Tham-Lương-Khúc;
   Canh Nhật-Vũ-Đồng-Âm; Tân Cự-Nhật-Khúc-Xương;
   Nhâm Lương-Tử-Phụ-Vũ; Quý Phá-Cự-Âm-Tham. */
/* Bảng Tứ Hóa khóa theo Tử Vi Thiên Lương Tổng Hợp.
   Canh: Nhật – Vũ – Đồng – Âm.
   Nhâm: Lương – Vi – Phụ – Vũ (Tả Phụ Hóa Khoa, không phải Thiên Phủ). */
const THIEN_LUONG_TU_HOA=Object.freeze({
 1:Object.freeze(["Liêm Trinh","Phá Quân","Vũ Khúc","Thái Dương"]),
 2:Object.freeze(["Thiên Cơ","Thiên Lương","Tử Vi","Thái Âm"]),
 3:Object.freeze(["Thiên Đồng","Thiên Cơ","Văn Xương","Liêm Trinh"]),
 4:Object.freeze(["Thái Âm","Thiên Đồng","Thiên Cơ","Cự Môn"]),
 5:Object.freeze(["Tham Lang","Thái Âm","Hữu Bật","Thiên Cơ"]),
 6:Object.freeze(["Vũ Khúc","Tham Lang","Thiên Lương","Văn Khúc"]),
 7:Object.freeze(["Thái Dương","Vũ Khúc","Thiên Đồng","Thái Âm"]),
 8:Object.freeze(["Cự Môn","Thái Dương","Văn Khúc","Văn Xương"]),
 9:Object.freeze(["Thiên Lương","Tử Vi","Tả Phụ","Vũ Khúc"]),
 10:Object.freeze(["Phá Quân","Cự Môn","Thái Âm","Tham Lang"])
});

function auditThienLuongCoreRules(){
  const errors=[];
  const expectedTuHoa={
    1:["Liêm Trinh","Phá Quân","Vũ Khúc","Thái Dương"],
    2:["Thiên Cơ","Thiên Lương","Tử Vi","Thái Âm"],
    3:["Thiên Đồng","Thiên Cơ","Văn Xương","Liêm Trinh"],
    4:["Thái Âm","Thiên Đồng","Thiên Cơ","Cự Môn"],
    5:["Tham Lang","Thái Âm","Hữu Bật","Thiên Cơ"],
    6:["Vũ Khúc","Tham Lang","Thiên Lương","Văn Khúc"],
    7:["Thái Dương","Vũ Khúc","Thiên Đồng","Thái Âm"],
    8:["Cự Môn","Thái Dương","Văn Khúc","Văn Xương"],
    9:["Thiên Lương","Tử Vi","Tả Phụ","Vũ Khúc"],
    10:["Phá Quân","Cự Môn","Thái Âm","Tham Lang"]
  };
  for(let can=1;can<=10;can++){
    if(JSON.stringify(THIEN_LUONG_TU_HOA[can])!==JSON.stringify(expectedTuHoa[can])) errors.push(`Tứ Hóa can ${can}`);
  }
  const expectedLuuHa=[0,10,11,8,9,6,7,4,5,12,3];
  for(let can=1;can<=10;can++){
    if(findLuuHaThienTru(can)[0]!==expectedLuuHa[can]) errors.push(`Lưu Hà can ${can}`);
  }
  const tsChecks=[[4,1,6],[3,1,12],[6,1,3],[2,1,9],[5,1,9],[4,-1,6],[3,-1,12],[6,-1,3],[2,-1,9],[5,-1,9]];
  tsChecks.forEach(([cuc,dir,pos])=>{
    const check=verifyTrangSinhPlacement(cuc,dir);
    if(check.start!==pos)errors.push(`Tràng Sinh cục ${cuc} dir ${dir}`);
  });
  /* Kiểm tra trực tiếp 4 tổ hợp Âm/Dương + giới tính. */
  const genderDirectionChecks=[
    [1,"Nam",1,"Dương Nam phải thuận"],
    [2,"Nữ",1,"Âm Nữ phải thuận"],
    [2,"Nam",-1,"Âm Nam phải nghịch"],
    [1,"Nữ",-1,"Dương Nữ phải nghịch"]
  ];
  genderDirectionChecks.forEach(([stem,gender,expected,label])=>{
    if(trangSinhDirection(stem,gender)!==expected)errors.push(label);
  });
  const tsElements={
    "Tràng Sinh":"T","Mộc Dục":"T",
    "Quan Đới":"K","Lâm Quan":"K","Đế Vượng":"K",
    "Suy":"T","Bệnh":"H","Tử":"T",
    "Mộ":"O","Tuyệt":"O","Thai":"O","Dưỡng":"M"
  };
  Object.entries(tsElements).forEach(([name,e])=>{
    if(STAR_ELEMENT[name]!==e)errors.push(`Ngũ hành Tràng Sinh ${name}`);
  });

  /* Regression Kình–Đà Thiên Lương trên đủ 10 Can × Nam/Nữ.
     Kình phải luôn trùng Lực Sĩ; Đà tuyệt đối không trùng Lực Sĩ. */
  for(let stem=1;stem<=10;stem++){
    for(const gender of ["Nam","Nữ"]){
      const kd=kinhDaPlacement(stem,gender,"thienluong");
      if(kd.kinh!==kd.lucSi)errors.push(`Kình Dương không đồng cung Lực Sĩ: ${CAN[stem]} ${gender}`);
      if(kd.da===kd.lucSi)errors.push(`Đà La đồng cung Lực Sĩ sai quy tắc: ${CAN[stem]} ${gender}`);
    }
  }
  /* Ca kiểm chứng trực tiếp trong sách: Giáp Dương Nam Lộc Dần → Kình Mão, Đà Sửu;
     Giáp Dương Nữ → Kình Sửu, Đà Mão. */
  const kdGiapNam=kinhDaPlacement(1,"Nam","thienluong");
  const kdGiapNu=kinhDaPlacement(1,"Nữ","thienluong");
  if(kdGiapNam.loc!==3||kdGiapNam.kinh!==4||kdGiapNam.da!==2)errors.push("Kình–Đà Giáp Dương Nam sai");
  if(kdGiapNu.loc!==3||kdGiapNu.kinh!==2||kdGiapNu.da!==4)errors.push("Kình–Đà Giáp Dương Nữ sai");

  /* La–Võng phải suy ra từ vị trí Đà La, tuyệt đối không an như sao cố định. */
  const laVongName=branch=>branch===5?"Thiên La":(branch===11?"Địa Võng":"");
  if(laVongName(5)!=="Thiên La"||laVongName(11)!=="Địa Võng"||laVongName(3)!=="")
    errors.push("Logic La–Võng theo vị trí Đà La sai");
  if(Object.prototype.hasOwnProperty.call(STAR_ELEMENT,"Thiên La")||Object.prototype.hasOwnProperty.call(STAR_ELEMENT,"Địa Võng"))
    errors.push("Thiên La/Địa Võng còn bị khai báo như sao độc lập");
  if(BAD_STARS.has("Thiên La")||BAD_STARS.has("Địa Võng"))
    errors.push("Thiên La/Địa Võng còn nằm trong tập sao độc lập");

  const interpAudit=auditInterpretation32Rules();
  if(!interpAudit.ok)errors.push(...interpAudit.errors);
  return {ok:errors.length===0,errors};
}
/* Sao Át Chủ theo hệ Gia đình Thiên Lương — mapping do người dùng cung cấp. */
const AT_CHU_BY_STEM={
  1:"Cự Môn",      // Giáp
  2:"Thất Sát",    // Ất
  3:"Thiên Tướng", // Bính
  4:"Thiên Cơ",    // Đinh
  5:"Liêm Trinh",  // Mậu
  6:"Thiên Lương", // Kỷ
  7:"Vũ Khúc",     // Canh
  8:"Phá Quân",    // Tân
  9:"Tham Lang",   // Nhâm
  10:"Thái Dương"  // Quý
};
function saoAtChu(canNam){
  return AT_CHU_BY_STEM[canNam]||"—";
}

const HOA_SHORT={
 "Tử Vi":"TỬ","Liêm Trinh":"LIÊM","Thiên Đồng":"ĐỒNG","Vũ Khúc":"VŨ","Thái Dương":"NHẬT",
 "Thiên Cơ":"CƠ","Thiên Phủ":"PHỦ","Thái Âm":"ÂM","Tham Lang":"THAM","Cự Môn":"CỰ",
 "Thiên Tướng":"TƯỚNG","Thiên Lương":"LƯƠNG","Thất Sát":"SÁT","Phá Quân":"PHÁ",
 "Văn Xương":"XƯƠNG","Văn Khúc":"KHÚC","Tả Phụ":"PHỤ","Hữu Bật":"BẬT"
};

/* ======================== LỊCH ======================== */
const INT=Math.floor;
const mod=(n,m)=>((n%m)+m)%m;
const wrap1=n=>mod(n-1,12)+1;
const wrap10=n=>mod(n-1,10)+1;
function normalizeCivilYear(value,fallback=null){
  const n=Number(value);
  if(Number.isFinite(n)){
    const y=Math.trunc(n);
    if(y>=1&&y<=9999)return y;
  }
  return fallback;
}

function jdFromDate(dd,mm,yy){
  let a=INT((14-mm)/12), y=yy+4800-a, m=mm+12*a-3;
  let jd=dd+INT((153*m+2)/5)+365*y+INT(y/4)-INT(y/100)+INT(y/400)-32045;
  if(jd<2299161) jd=dd+INT((153*m+2)/5)+365*y+INT(y/4)-32083;
  return jd;
}
function jdToDate(jd){
  let a,b,c,d,e,m;
  if(jd>2299160){a=jd+32044;b=INT((4*a+3)/146097);c=a-INT(b*146097/4)}
  else{b=0;c=jd+32082}
  d=INT((4*c+3)/1461);e=c-INT(1461*d/4);m=INT((5*e+2)/153);
  return [e-INT((153*m+2)/5)+1,m+3-12*INT(m/10),b*100+d-4800+INT(m/10)];
}
/* V3.3.78 — Sóc thiên văn chính xác hơn theo Jean Meeus.
   Bản trước dùng công thức gần đúng đời cũ, có thể sai vài chục phút.
   Với các kỳ Sóc sát 0h địa phương, sai số này có thể làm lệch cả ngày âm.
   Ví dụ 12/08/2026: Sóc thực ~17:37 UTC = 00:37 ngày 13/08 tại GMT+7.
   Vì vậy tháng 7 âm lịch 2026 phải bắt đầu ngày 13/08/2026, không phải 12/08. */
function lunarDeltaTSeconds(y){
  let t,u;
  /* V3.3.145 — ΔT cho niên đại cổ theo đa thức Espenak/Meeus. */
  if(y<-500){
    u=(y-1820)/100;
    return -20+32*u*u;
  }
  if(y<500){
    u=y/100;
    return 10583.6-1014.41*u+33.78311*u*u-5.952053*Math.pow(u,3)-0.1798452*Math.pow(u,4)+0.022174192*Math.pow(u,5)+0.0090316521*Math.pow(u,6);
  }
  if(y<1600){
    u=(y-1000)/100;
    return 1574.2-556.01*u+71.23472*u*u+0.319781*Math.pow(u,3)-0.8503463*Math.pow(u,4)-0.005050998*Math.pow(u,5)+0.0083572073*Math.pow(u,6);
  }
  if(y<1700){
    t=y-1600;
    return 120-0.9808*t-0.01532*t*t+t*t*t/7129;
  }
  if(y<1800){
    t=y-1700;
    return 8.83+0.1603*t-0.0059285*t*t+0.00013336*t*t*t-Math.pow(t,4)/1174000;
  }
  if(y<1860){
    t=y-1800;
    return 13.72-0.332447*t+0.0068612*t*t+0.0041116*Math.pow(t,3)-0.00037436*Math.pow(t,4)
      +0.0000121272*Math.pow(t,5)-0.0000001699*Math.pow(t,6)+0.000000000875*Math.pow(t,7);
  }
  if(y<1900){
    t=y-1860;
    return 7.62+0.5737*t-0.251754*t*t+0.01680668*Math.pow(t,3)-0.0004473624*Math.pow(t,4)+Math.pow(t,5)/233174;
  }
  if(y<1920){
    t=y-1900;
    return -2.79+1.494119*t-0.0598939*t*t+0.0061966*Math.pow(t,3)-0.000197*Math.pow(t,4);
  }
  if(y<1941){
    t=y-1920;
    return 21.20+0.84493*t-0.076100*t*t+0.0020936*Math.pow(t,3);
  }
  if(y<1961){
    t=y-1950;
    return 29.07+0.407*t-t*t/233+Math.pow(t,3)/2547;
  }
  if(y<1986){
    t=y-1975;
    return 45.45+1.067*t-t*t/260-Math.pow(t,3)/718;
  }
  if(y<2005){
    t=y-2000;
    return 63.86+0.3345*t-0.060374*t*t+0.0017275*Math.pow(t,3)+0.000651814*Math.pow(t,4)+0.00002373599*Math.pow(t,5);
  }
  if(y<2050){
    t=y-2000;
    return 62.92+0.32217*t+0.005589*t*t;
  }
  if(y<2150){
    return -20+32*Math.pow((y-1820)/100,2)-0.5628*(2150-y);
  }
  u=(y-1820)/100;
  return -20+32*u*u;
}
function sind(x){return Math.sin(x*Math.PI/180)}
function NewMoon(k){
  /* Các hàm lịch cũ đánh số lunation từ mốc 1900; Meeus dùng k=0 quanh 01/2000. */
  const km=k-1237;
  const T=km/1236.85,T2=T*T,T3=T2*T,T4=T3*T;
  let jde=2451550.09765+29.530588853*km+0.0001337*T2-0.000000150*T3+0.00000000073*T4;
  const E=1-0.002516*T-0.0000074*T2;
  const M=2.5534+29.10535670*km-0.0000014*T2-0.00000011*T3;
  const Mp=201.5643+385.81693528*km+0.0107582*T2+0.00001238*T3-0.000000058*T4;
  const F=160.7108+390.67050284*km-0.0016118*T2-0.00000227*T3+0.000000011*T4;
  const Om=124.7746-1.56375588*km+0.0020672*T2+0.00000215*T3;

  let corr=
    -0.40720*sind(Mp)+0.17241*E*sind(M)+0.01608*sind(2*Mp)+0.01039*sind(2*F)
    +0.00739*E*sind(Mp-M)-0.00514*E*sind(Mp+M)+0.00208*E*E*sind(2*M)
    -0.00111*sind(Mp-2*F)-0.00057*sind(Mp+2*F)+0.00056*E*sind(2*Mp+M)
    -0.00042*sind(3*Mp)+0.00042*E*sind(M+2*F)+0.00038*E*sind(M-2*F)
    -0.00024*E*sind(2*Mp-M)-0.00017*sind(Om)-0.00007*sind(Mp+2*M)
    +0.00004*sind(2*Mp-2*F)+0.00004*sind(3*M)+0.00003*sind(Mp+M-2*F)
    +0.00003*sind(2*Mp+2*F)-0.00003*sind(Mp+M+2*F)+0.00003*sind(Mp-M+2*F)
    -0.00002*sind(Mp-M-2*F)-0.00002*sind(3*Mp+M)+0.00002*sind(4*Mp);

  const A=[
    299.77+0.107408*km-0.009173*T2,
    251.88+0.016321*km,
    251.83+26.651886*km,
    349.42+36.412478*km,
    84.66+18.206239*km,
    141.74+53.303771*km,
    207.14+2.453732*km,
    154.84+7.306860*km,
    34.52+27.261239*km,
    207.19+0.121824*km,
    291.34+1.844379*km,
    161.72+24.198154*km,
    239.56+25.513099*km,
    331.55+3.592518*km
  ];
  const AC=[0.000325,0.000165,0.000164,0.000126,0.000110,0.000062,0.000060,0.000056,0.000047,0.000042,0.000040,0.000037,0.000035,0.000023];
  for(let i=0;i<A.length;i++)corr+=AC[i]*sind(A[i]);
  jde+=corr;

  /* JDE là Terrestrial Time; lịch dân dụng cần UT trước khi cộng múi giờ. */
  const approxYear=2000+km/12.3685;
  return jde-lunarDeltaTSeconds(approxYear)/86400;
}
function SunLongitude(jdn){
  let T=(jdn-2451545.0)/36525,T2=T*T,dr=Math.PI/180;
  let M=357.52910+35999.05030*T-0.0001559*T2-0.00000048*T*T2;
  let L0=280.46645+36000.76983*T+0.0003032*T2;
  let DL=(1.914600-0.004817*T-0.000014*T2)*Math.sin(dr*M);
  DL+=(0.019993-0.000101*T)*Math.sin(dr*2*M)+0.000290*Math.sin(dr*3*M);
  let L=(L0+DL)*dr;L-=Math.PI*2*INT(L/(Math.PI*2));return L;
}
const getSunLongitude=(day,tz)=>INT(SunLongitude(day-0.5-tz/24)/Math.PI*6);
const getNewMoonDay=(k,tz)=>INT(NewMoon(k)+0.5+tz/24);
function getLunarMonth11(y,tz){
  let off=jdFromDate(31,12,y)-2415021,k=INT(off/29.530588853),nm=getNewMoonDay(k,tz);
  if(getSunLongitude(nm,tz)>=9)nm=getNewMoonDay(k-1,tz);return nm;
}
function getLeapMonthOffset(a11,tz){
  let k=INT(.5+(a11-2415021.076998695)/29.530588853),last=0,i=1;
  let arc=getSunLongitude(getNewMoonDay(k+i,tz),tz);
  do{last=arc;i++;arc=getSunLongitude(getNewMoonDay(k+i,tz),tz)}while(arc!==last&&i<14);
  return i-1;
}
function solarToLunar(dd,mm,yy,tz){
  let day=jdFromDate(dd,mm,yy),k=INT((day-2415021.076998695)/29.530588853);
  let start=getNewMoonDay(k+1,tz);if(start>day)start=getNewMoonDay(k,tz);
  let a11=getLunarMonth11(yy,tz),b11=a11,ly;
  if(a11>=start){ly=yy;a11=getLunarMonth11(yy-1,tz)}
  else{ly=yy+1;b11=getLunarMonth11(yy+1,tz)}
  let ld=day-start+1,diff=INT((start-a11)/29),leap=0,lm=diff+11;
  if(b11-a11>365){
    let leapDiff=getLeapMonthOffset(a11,tz);
    if(diff>=leapDiff){lm=diff+10;if(diff===leapDiff)leap=1}
  }
  if(lm>12)lm-=12;if(lm>=11&&diff<4)ly-=1;
  return {day:ld,month:lm,year:ly,leap};
}
function lunarToSolar(ld,lm,ly,leap,tz){
  let a11,b11;
  if(lm<11){a11=getLunarMonth11(ly-1,tz);b11=getLunarMonth11(ly,tz)}
  else{a11=getLunarMonth11(ly,tz);b11=getLunarMonth11(ly+1,tz)}
  let k=INT(.5+(a11-2415021.076998695)/29.530588853),off=lm-11;
  if(off<0)off+=12;
  if(b11-a11>365){
    let leapOff=getLeapMonthOffset(a11,tz),leapMonth=leapOff-2;
    if(leapMonth<0)leapMonth+=12;
    if(leap&&lm!==leapMonth)return null;
    if(leap||off>=leapOff)off+=1;
  }
  let monthStart=getNewMoonDay(k+off,tz);
  const [dd,mm,yy]=jdToDate(monthStart+ld-1);
  const chk=solarToLunar(dd,mm,yy,tz);
  if(chk.day!==ld||chk.month!==lm||chk.year!==ly||Number(chk.leap)!==Number(leap))return null;
  return {day:dd,month:mm,year:yy};
}

/* V3.3.78 — kiểm thử chéo lịch âm/dương GMT+7.
   Các mốc 2026 bao gồm kỳ Sóc 12/08 UTC rơi sang 13/08 theo giờ Việt Nam,
   là ca nhạy cảm đã làm bản V3.3.78 lệch 1 ngày âm. */
function auditLunarCalendar(){
  const cases=[
    {s:[17,2,2026],l:[1,1,2026,0]},
    {s:[12,8,2026],l:[30,6,2026,0]},
    {s:[13,8,2026],l:[1,7,2026,0]},
    {s:[8,9,2026],l:[27,7,2026,0]}
  ];
  const errors=[];
  for(const tc of cases){
    const [sd,sm,sy]=tc.s,[ld,lm,ly,leap]=tc.l;
    const got=solarToLunar(sd,sm,sy,7);
    if(got.day!==ld||got.month!==lm||got.year!==ly||Number(got.leap)!==leap){
      errors.push(`DL ${sd}/${sm}/${sy} → AL ${got.day}/${got.month}/${got.year}${got.leap?'N':''}, kỳ vọng ${ld}/${lm}/${ly}${leap?'N':''}`);
      continue;
    }
    const back=lunarToSolar(ld,lm,ly,leap,7);
    if(!back||back.day!==sd||back.month!==sm||back.year!==sy){
      errors.push(`AL ${ld}/${lm}/${ly}${leap?'N':''} quy đổi ngược không khớp ${sd}/${sm}/${sy}`);
    }
  }
  return {ok:errors.length===0,errors};
}

/* ======================== CAN CHI / MỆNH CỤC ======================== */
const yearStem=y=>mod(y+6,10)+1;
const yearBranch=y=>mod(y+8,12)+1;
const stemYang=stem=>stem%2===1?1:-1;
const branchYang=branch=>branch%2===1?1:-1;
const genderSign=g=>g==="Nam"?1:-1;

/* +1 = thuận chiều kim đồng hồ trên địa bàn; -1 = nghịch.
   Dương Nam / Âm Nữ thuận; Âm Nam / Dương Nữ nghịch. */
function polarityGenderDirection(stem,gender){
  return stemYang(stem)*genderSign(gender);
}
function polarityGenderLabel(stem,gender){
  return polarityGenderDirection(stem,gender)===1
    ? "DƯƠNG NAM / ÂM NỮ — THUẬN"
    : "ÂM NAM / DƯƠNG NỮ — NGHỊCH";
}

/* Kình–Đà theo Gia đình Thiên Lương:
   - Dương Nam / Âm Nữ: thuận, Kình đi trước Lộc Tồn và Đà đi sau.
   - Âm Nam / Dương Nữ: nghịch, vị trí Kình–Đà đảo theo chiều vòng Lộc Tồn.
   - Hệ quả bắt buộc: Kình Dương luôn đồng cung Lực Sĩ; Đà La không đồng cung Lực Sĩ.
   Chế độ fixed chỉ phục vụ đối chiếu cách an thông thường một chiều. */
function kinhDaPlacement(stem,gender,school="thienluong"){
  const loc=LOC_TON[stem];
  const ringDir=polarityGenderDirection(stem,gender);
  const dir=school==="thienluong" ? ringDir : 1;
  return {
    loc, ringDir, dir,
    kinh:wrap1(loc+dir),
    da:wrap1(loc-dir),
    lucSi:wrap1(loc+ringDir)
  };
}

function amDuongThuanLy(canNam,menhBranch){
  // Dương năm + Mệnh ở cung Dương, hoặc Âm năm + Mệnh ở cung Âm.
  return stemYang(canNam)===branchYang(menhBranch);
}

function dayStemBranch(dd,mm,yy){
  const jd=jdFromDate(dd,mm,yy);
  return {stem:mod(jd+9,10)+1,branch:mod(jd+1,12)+1,jd};
}
function hourBranchFrom24(h){return Math.floor(((h+1)%24)/2)+1}
function hourStem(dayStem1,hourBranch1){return mod((dayStem1-1)*2+(hourBranch1-1),10)+1}
function lunarMonthCanChi(lm,canNam){
  let stemJan=(canNam*2+1)%10;if(stemJan===0)stemJan=10;
  return {stem:wrap10(stemJan+lm-1),branch:wrap1(3+lm-1)};
}
function houseCan(branch,canNam){
  let stemDan=(canNam*2+1)%10;if(stemDan===0)stemDan=10;
  const offset=mod(branch-3,12); // Dần khởi số 0, đi thuận đủ 12 cung theo Ngũ Hổ Độn.
  return wrap10(stemDan+offset);
}
function sexagenaryIndex(stem,branch){
  for(let i=0;i<60;i++)if(i%10===stem-1&&i%12===branch-1)return i;
  return -1;
}
function napAm(stem,branch){
  const idx=sexagenaryIndex(stem,branch);
  if(idx<0)return null;
  const [name,e]=NAP_AM[Math.floor(idx/2)];
  return {name,e};
}
function menhThan(lm,hourBranch1){
  return {
    menh:wrap1(3+lm-1-hourBranch1+1),
    than:wrap1(3+lm-1+hourBranch1-1)
  };
}
function houseName(branch,menh){return HOUSES[mod(branch-menh,12)]}


/* ======================== PHI TỨ HÓA ========================
   Chế độ này dùng đúng bảng THIEN_LUONG_TU_HOA đã khóa trong phần mềm.
   Mỗi Can cung phi 4 Hóa tới cung đang chứa sao chủ tương ứng trên lá số gốc.
   Không tự suy rộng các quy tắc trường phái nâng cao (chuyển Kỵ, Lai Nhân Cung,
   Thuận/Nghịch Thủy Kỵ...) nếu chưa có bộ quy tắc riêng được người dùng chốt. */
const PHI_HOA_ORDER=Object.freeze(["Hóa Lộc","Hóa Quyền","Hóa Khoa","Hóa Kỵ"]);
const PHI_HOA_CLASS=Object.freeze({"Hóa Lộc":"loc","Hóa Quyền":"quyen","Hóa Khoa":"khoa","Hóa Kỵ":"ky"});
const PHI_HOA_LABEL=Object.freeze({"Hóa Lộc":"LỘC","Hóa Quyền":"QUYỀN","Hóa Khoa":"KHOA","Hóa Kỵ":"KỴ"});
const PHI_TU_HOA_STAR_SET=new Set(Object.values(THIEN_LUONG_TU_HOA).flat());
const PHI_HOA_KNOWLEDGE=Object.freeze({
  "Hóa Lộc":Object.freeze({
    core:"Tượng sinh phát, duyên, thu hút, cơ hội, nguồn lực và sự dễ mở ra. Lộc không đồng nghĩa mặc định với tiền bạc hay kết quả tốt tuyệt đối; phải đọc sao chủ và hai cung liên hệ.",
    verb:"đưa xu hướng sinh phát, kết nối và nguồn lực từ cung phát sang cung nhận"
  }),
  "Hóa Quyền":Object.freeze({
    core:"Tượng chủ động, quyền biến, thực thi, thúc đẩy, cạnh tranh và khả năng nắm quyền xử lý. Quyền có thể là năng lực tiến lên nhưng cũng có thể làm tăng áp lực hoặc tính kiểm soát.",
    verb:"đưa lực chủ động, thực thi và kiểm soát từ cung phát sang cung nhận"
  }),
  "Hóa Khoa":Object.freeze({
    core:"Tượng danh, học, lý tính, quy củ, uy tín, văn minh và khả năng điều hòa/giải thích. Khoa thường làm sự việc sáng rõ hơn nhưng không tự xóa cấu trúc bất lợi khác.",
    verb:"đưa tính lý giải, danh–học, quy củ và điều hòa từ cung phát sang cung nhận"
  }),
  "Hóa Kỵ":Object.freeze({
    core:"Tượng nút thắt, vướng mắc, lo toan, chấp trước, trách nhiệm, hao tổn hoặc điều khó buông. Kỵ không được dùng như kết luận hung tuyệt đối; cần phân biệt cung phát, cung nhận, sao chủ và các lớp phối hợp.",
    verb:"đưa điểm vướng, trách nhiệm hoặc điều khó buông từ cung phát sang cung nhận"
  })
});
const PHI_HOUSE_TOPIC=Object.freeze({
  "Mệnh":"bản thân, khí chất, lựa chọn và cách đương số tiếp nhận hoàn cảnh",
  "Phụ Mẫu":"cha mẹ, cấp trên, giấy tờ, sự bảo trợ và khuôn phép",
  "Phúc Đức":"đời sống tinh thần, nền phúc, sở thích, tư tưởng và khả năng hưởng thụ",
  "Điền Trạch":"nhà cửa, bất động sản, môi trường sống, nền tảng và tài sản cố định",
  "Quan Lộc":"công việc, nghề nghiệp, vị thế, trách nhiệm và con đường phát triển",
  "Nô Bộc":"bạn bè, đồng nghiệp, cấp dưới, quan hệ xã hội và mạng lưới hỗ trợ",
  "Thiên Di":"môi trường bên ngoài, giao tiếp, đi lại, xã hội và phản ứng với ngoại cảnh",
  "Tật Ách":"thân thể, thói quen, nội lực chịu đựng và những vấn đề phải tự điều chỉnh",
  "Tài Bạch":"tiền bạc, nguồn lực, cách kiếm–dùng–giữ và giá trị vật chất",
  "Tử Tức":"con cái, sản phẩm tạo ra, kế hoạch sinh thành và phần tiếp nối",
  "Phu Thê":"hôn nhân, đối tác, quan hệ một–một và cách phối hợp với người gần gũi",
  "Huynh Đệ":"anh chị em, người ngang hàng, quan hệ chia sẻ và nguồn lực cận thân"
});
function isLimitDisplayMode(mode){return mode==="full"||mode==="limit"}
function isPhiDisplayMode(mode){return mode==="phi"||mode==="bacphai"}
function isNorthTuHoaMode(mode){return mode==="bacphai"}
function phiModeLabel(mode){return isNorthTuHoaMode(mode)?"TỨ HÓA BẮC PHÁI":"PHI TỨ HÓA"}
function phiModeSchoolLabel(mode){return isNorthTuHoaMode(mode)?"BẮC PHÁI / KHÂM THIÊN":"PHI HÓA THÔNG DỤNG"}
function phiModePanelLabel(mode){return isNorthTuHoaMode(mode)?"BẮC PHÁI":"PHI TỨ HÓA"}
const NORTH_NGA_HOUSES=new Set(["Mệnh","Tài Bạch","Quan Lộc","Phúc Đức","Điền Trạch","Tật Ách"]);
const NORTH_THA_HOUSES=new Set(["Phụ Mẫu","Nô Bộc","Thiên Di","Tử Tức","Phu Thê","Huynh Đệ"]);
function northHouseTypeByName(name){return NORTH_NGA_HOUSES.has(name)?"nga":(NORTH_THA_HOUSES.has(name)?"tha":"");}
function northHouseType(branch,c){return northHouseTypeByName(houseName(branch,c.menh));}
function northLaiNhanBranches(c){
  const out=[];
  for(let b=3;b<=12;b++)if(houseCan(b,c.canNam)===c.canNam)out.push(b);
  return out;
}
function northNatalHoaFlows(c){
  const hosts=THIEN_LUONG_TU_HOA[c.canNam]||[];
  return PHI_HOA_ORDER.map((hoa,i)=>{
    const star=hosts[i]||"—",targetBranch=Number(c.positions?.[star])||0;
    return {index:i,hoa,star,targetBranch,targetHouse:targetBranch?houseName(targetBranch,c.menh):"—"};
  });
}
function northKyChainFromSource(sourceBranch,c,maxSteps=6){
  const flows=phiCurrentFlows(c,sourceBranch),first=flows.find(f=>f.hoa==="Hóa Kỵ");
  if(!first||!first.targetBranch)return [];
  const chain=[{level:0,kind:"Kỵ gốc",sourceBranch:first.sourceBranch,sourceHouse:first.sourceHouse,sourceStem:first.sourceStem,star:first.star,targetBranch:first.targetBranch,targetHouse:first.targetHouse,oppositeBranch:first.oppositeBranch,oppositeHouse:first.oppositeHouse,self:first.self,cycle:false}];
  const seen=new Set([`${first.sourceBranch}>${first.targetBranch}`]);
  let current=first.targetBranch;
  for(let level=1;level<=maxSteps;level++){
    const stem=houseCan(current,c.canNam),star=(THIEN_LUONG_TU_HOA[stem]||[])[3]||"—",target=Number(c.positions?.[star])||0;
    if(!target)break;
    const key=`${current}>${target}`,cycle=seen.has(key)||chain.some(x=>x.sourceBranch===target&&x.targetBranch===current);
    const row={level,kind:"Chuyển Kỵ",sourceBranch:current,sourceHouse:houseName(current,c.menh),sourceStem:stem,star,targetBranch:target,targetHouse:houseName(target,c.menh),oppositeBranch:wrap1(target+6),oppositeHouse:houseName(wrap1(target+6),c.menh),self:target===current,cycle};
    chain.push(row);seen.add(key);
    if(cycle||target===current)break;
    current=target;
  }
  return chain;
}
function northConvergenceLayerViews(c){
  const natalFlows=(c.phiTuHoa?.[c.menh]||[]);
  const natal={key:"natal",label:"Mệnh bàn",sourceBranch:c.menh,sourceHouse:houseName(c.menh,c.menh),flows:natalFlows};
  const dai=buildPhiLayerView("dai",c,c.phiTuHoa);
  const annual=buildPhiLayerView("annual",c,c.phiTuHoa);
  return [natal,
    {key:"dai",label:"Đại hạn",sourceBranch:dai.sourceBranch,sourceHouse:dai.sourceHouse,flows:dai.flows||[]},
    {key:"annual",label:`Lưu niên ${c.viewYear}`,sourceBranch:annual.sourceBranch,sourceHouse:annual.sourceHouse,flows:annual.flows||[],visualAnchor:true}
  ].filter(v=>v.sourceBranch&&v.flows?.length);
}
function northActivatedAnchors(c){
  const out=[];
  const add=(key,label,branch,weight)=>{branch=Number(branch)||0;if(branch)out.push({key,label,branch,weight,house:houseName(branch,c.menh)});};
  add("menh","Mệnh",c.menh,12);
  add("dai","Đại Hạn",c.phiDaiBranch,13);
  add("annual",`Lưu Niên ${c.viewYear}`,yearBranch(c.viewYear),10);
  add("tieu",`Tiểu Hạn ${c.viewYear}`,c.phiTieuBranch,12);
  return out;
}
function northNatalSourceActivationCandidates(c){
  const anchors=northActivatedAnchors(c),rows=[];
  for(let source=1;source<=12;source++){
    const flows=c.phiTuHoa?.[source]||[];
    if(!flows.length)continue;
    const sourceHouse=houseName(source,c.menh),stem=houseCan(source,c.canNam);
    for(const f of flows){
      if(!f.targetBranch)continue;
      for(const a of anchors){
        const direct=f.targetBranch===a.branch;
        const xung=f.hoa==="Hóa Kỵ"&&f.oppositeBranch===a.branch;
        if(!direct&&!xung)continue;
        const hoaBase=f.hoa==="Hóa Kỵ"?82:(f.hoa==="Hóa Khoa"?70:(f.hoa==="Hóa Quyền"?68:67));
        const sourceBonus=source===c.menh?8:(source===c.phiDaiBranch?7:0);
        const score=hoaBase+a.weight+sourceBonus+(xung?6:0);
        rows.push({
          type:"natal_source_activation",score,sourceBranch:source,sourceHouse,anchor:a,flow:f,
          title:`Mệnh bàn ${sourceHouse} phát ${PHI_HOA_LABEL[f.hoa]||f.hoa} tới điểm đang kích hoạt`,
          layers:[`Mệnh bàn • ${sourceHouse}`,a.label],
          path:`${sourceHouse.toUpperCase()} (${CAN[stem]}) → ${f.star} ${PHI_HOA_LABEL[f.hoa]||f.hoa} → ${f.targetHouse.toUpperCase()}${xung?` → XUNG ${a.house.toUpperCase()}`:` ← ${a.label.toUpperCase()}`}`
        });
      }
    }
  }
  return rows.sort((a,b)=>b.score-a.score);
}
function northConvergenceMeaning(type){
  const map={
    exact_repeat:"Hai tầng dùng cùng một Thiên Can nên lặp nguyên vẹn cả bốn đường Lộc–Quyền–Khoa–Kỵ. Đây là cộng hưởng cấu trúc mạnh: chủ đề của tầng trước được tầng sau kích hoạt lại gần như nguyên dạng.",
    star_mixed_hoa:"Cùng một sao tại cùng một cung vừa nhận Hóa tích cực vừa nhận Hóa Kỵ từ nhiều tầng. Không hiểu là triệt tiêu; nên đọc là lợi ích/cơ hội và trách nhiệm/chi phí cùng tồn tại trên một sự việc.",
    star_ky_repeat:"Cùng một sao tại cùng một cung nhận Hóa Kỵ lặp lại từ nhiều tầng. Điểm vướng được nhắc lại đúng địa chỉ nên mức ưu tiên kiểm soát cao hơn Kỵ đơn tầng.",
    positive_cluster:"Một cung đồng thời hội Lộc–Quyền–Khoa hoặc nhiều Hóa tích cực từ nhiều tầng. Đây là vùng có nguồn lực, quyền xử lý và/hoặc năng lực giải thích–hợp thức hóa hội tụ; vẫn phải phối Kỵ và toàn cục.",
    closed_loop:"Một cung nhận Kỵ của tầng trước đồng thời trở thành điểm kích hoạt của tầng vận sau, rồi Kỵ tầng sau xung trở lại nguồn ban đầu. Đây là chuỗi hồi ứng đáng ưu tiên theo dõi.",
    activation:"Cung nhận Hóa Kỵ của một tầng đồng thời là cung đang được Đại hạn/Tiểu hạn kích hoạt. Điểm vướng của tầng trước vì vậy có khả năng được đưa lên thành chủ đề vận hành rõ hơn.",
    ky_to_menh:"Hóa Kỵ nhập hoặc xung trực tiếp trục Mệnh. Nên đọc như áp lực/vướng mắc tác động mạnh tới bản thân, nhưng vẫn phải phối sao chủ và toàn cục.",
    ky_positive_axis:"Một Hóa Kỵ và một Hóa Lộc/Quyền/Khoa của tầng khác cùng nằm trên một trục đối cung. Đây là cấu trúc vừa có lực thúc đẩy/giải thích vừa có nút thắt, không nên quy giản thành tốt hay xấu.",
    ky_positive_same:"Hóa Kỵ và Lộc/Quyền/Khoa từ hai tầng cùng hội vào một cung. Cùng một chủ đề vừa nhận nguồn lực vừa nhận trách nhiệm/vướng mắc; cần phân biệt lợi ích với chi phí và nghĩa vụ.",
    ky_ky_same:"Hai tầng cùng đưa Hóa Kỵ vào một cung hoặc cùng một trục. Chủ đề đó được lặp lại nhiều tầng nên đáng ưu tiên kiểm soát.",
    same_target:"Nhiều tầng cùng phi Hóa vào một cung, tạo điểm hội tụ. Ý nghĩa cụ thể phụ thuộc loại Hóa và sao chủ của từng tầng.",
    natal_source_activation:"Một trong 12 cung nguyên cục phát Hóa đúng tới cung/trục đang được Đại Hạn, Lưu Niên hoặc Tiểu Hạn kích hoạt. Đây là dấu vết quan trọng để truy ngược ‘việc phát từ đâu’ thay vì chỉ nhìn Mệnh cung."
  };
  return map[type]||"Cấu trúc hội tụ nhiều tầng; cần đọc theo tầng phát → loại Hóa → sao chủ → cung nhận.";
}
function northConvergenceLevel(score){
  const s=Number(score)||0;
  if(s>=120)return {rank:5,label:"CỰC MẠNH"};
  if(s>=105)return {rank:4,label:"RẤT MẠNH"};
  if(s>=90)return {rank:3,label:"MẠNH"};
  if(s>=75)return {rank:2,label:"RÕ"};
  return {rank:1,label:"THAM KHẢO"};
}
function northConvergenceRole(type){
  const roles={
    exact_repeat:"KÍCH HOẠT",closed_loop:"RỦI RO",activation:"KÍCH HOẠT",ky_to_menh:"RỦI RO",
    star_mixed_hoa:"HAI MẶT",star_ky_repeat:"RỦI RO",ky_positive_axis:"HAI MẶT",ky_positive_same:"HAI MẶT",
    ky_ky_same:"RỦI RO",positive_cluster:"ĐƯỜNG MỞ",same_target:"HỘI TỤ",natal_source_activation:"CUNG PHÁT"
  };
  return roles[type]||"HỘI TỤ";
}
function northFlowSignature(v){
  return (v.flows||[]).map(f=>`${f.hoa}|${f.star}|${f.targetBranch}`).join("||");
}
function northConvergenceSignals(c){
  const layers=northConvergenceLayerViews(c),signals=[],seen=new Set();
  const add=(sig)=>{
    const key=sig.key||`${sig.type}|${sig.path}`;
    if(seen.has(key))return;
    seen.add(key);
    const level=northConvergenceLevel(sig.score);
    signals.push({...sig,level,role:sig.role||northConvergenceRole(sig.type),meaning:sig.meaning||northConvergenceMeaning(sig.type)});
  };
  const kyOf=v=>(v.flows||[]).find(f=>f.hoa==="Hóa Kỵ");
  const pos=(v)=>(v.flows||[]).filter(f=>f.hoa!=="Hóa Kỵ");

  // 0A. Hai tầng trùng hoàn toàn 4 Hóa do cùng Can phát.
  for(let i=0;i<layers.length;i++)for(let j=i+1;j<layers.length;j++){
    const a=layers[i],b=layers[j];
    const fa=a.flows||[],fb=b.flows||[];
    if(fa.length!==4||fb.length!==4)continue;
    const sa=fa[0]?.sourceStem||0,sb=fb[0]?.sourceStem||0;
    if(!sa||sa!==sb||northFlowSignature(a)!==northFlowSignature(b))continue;
    const pair=`${a.key}+${b.key}`;
    const pairBonus=(pair==="natal+annual"||pair==="annual+natal")?9:((pair==="dai+tieu"||pair==="tieu+dai")?7:3);
    add({type:"exact_repeat",score:116+pairBonus,title:`${a.label} + ${b.label}: trùng hoàn toàn 4 Hóa`,layers:[a.label,b.label],
      path:`Cùng Can ${CAN[sa].toUpperCase()} → ${fa.map(f=>`${PHI_HOA_LABEL[f.hoa]||f.hoa} ${f.star}→${f.targetHouse}`).join(" • ")}`});
  }

  // 0B. Hội tụ theo đúng sao + đúng cung: bắt Lộc/Quyền/Khoa/Kỵ đa tầng trên cùng một sao.
  const starBucket=new Map();
  for(const v of layers)for(const f of (v.flows||[]))if(f.targetBranch&&f.star){
    const key=`${f.star}|${f.targetBranch}`;
    const arr=starBucket.get(key)||[];arr.push({v,f});starBucket.set(key,arr);
  }
  for(const arr of starBucket.values()){
    const layerKeys=new Set(arr.map(x=>x.v.key));
    if(layerKeys.size<2)continue;
    const sample=arr[0].f,kyRows=arr.filter(x=>x.f.hoa==="Hóa Kỵ"),posRows=arr.filter(x=>x.f.hoa!=="Hóa Kỵ");
    if(kyRows.length>=1&&posRows.length>=1){
      const score=104+Math.min(12,(layerKeys.size-2)*4)+Math.min(8,(kyRows.length-1)*4);
      add({type:"star_mixed_hoa",score,title:`${sample.star} tại ${sample.targetHouse}: Hóa tích cực + Kỵ đa tầng`,layers:[...new Set(arr.map(x=>x.v.label))],
        path:arr.map(x=>`${x.v.label} ${PHI_HOA_LABEL[x.f.hoa]||x.f.hoa}`).join(" • ")+` → ${sample.star.toUpperCase()} / ${sample.targetHouse.toUpperCase()}`});
    }
    if(kyRows.length>=2){
      const score=111+Math.min(12,(kyRows.length-2)*5);
      add({type:"star_ky_repeat",score,title:`${sample.star} tại ${sample.targetHouse}: Kỵ lặp ${kyRows.length} tầng`,layers:[...new Set(kyRows.map(x=>x.v.label))],
        path:kyRows.map(x=>`${x.v.label} Kỵ`).join(" + ")+` → ${sample.star.toUpperCase()} → ${sample.targetHouse.toUpperCase()}`});
    }
  }

  // 0C. Cụm Hóa tích cực nhiều tầng tại cùng cung; ưu tiên đủ Lộc–Quyền–Khoa.
  const positiveBucket=new Map();
  for(const v of layers)for(const f of pos(v))if(f.targetBranch){
    const arr=positiveBucket.get(f.targetBranch)||[];arr.push({v,f});positiveBucket.set(f.targetBranch,arr);
  }
  for(const [branch,arr] of positiveBucket){
    const layerKeys=new Set(arr.map(x=>x.v.key));
    const hoaKinds=new Set(arr.map(x=>x.f.hoa));
    if(layerKeys.size<2||arr.length<3||hoaKinds.size<2)continue;
    const house=houseName(branch,c.menh),full=hoaKinds.has("Hóa Lộc")&&hoaKinds.has("Hóa Quyền")&&hoaKinds.has("Hóa Khoa");
    const score=(full?104:91)+Math.min(10,(layerKeys.size-2)*3)+Math.min(8,arr.length-3);
    const counts={};arr.forEach(x=>counts[x.f.hoa]=(counts[x.f.hoa]||0)+1);
    const combo=PHI_HOA_ORDER.filter(h=>h!=="Hóa Kỵ"&&counts[h]).map(h=>`${PHI_HOA_LABEL[h]||h}×${counts[h]}`).join(" + ");
    add({type:"positive_cluster",score,title:`${house}: hội ${full?"Lộc–Quyền–Khoa":"nhiều Hóa tích cực"} đa tầng`,layers:[...new Set(arr.map(x=>x.v.label))],
      path:`${combo} → ${house.toUpperCase()} • `+arr.map(x=>`${x.v.label}:${x.f.star}`).join(" • ")});
  }

  // 1. Chuỗi kín chỉ xét các tầng thật sự phát Tứ Hóa; Tiểu Hạn Phi Hóa không tự phát 4 Hóa.
  for(const a of layers){
    const ka=kyOf(a); if(!ka?.targetBranch)continue;
    for(const b of layers){
      if(a.key===b.key||b.visualAnchor||b.key!=="dai")continue;
      if(ka.targetBranch!==b.sourceBranch)continue;
      const kb=kyOf(b); if(!kb?.targetBranch)continue;
      if(kb.oppositeBranch===a.sourceBranch){
        add({type:"closed_loop",score:120,title:"Chuỗi Kỵ kích hoạt rồi hồi xung",layers:[a.label,b.label],
          path:`${a.label} ${a.sourceHouse.toUpperCase()} → ${ka.star} Kỵ → ${ka.targetHouse.toUpperCase()} → ${b.label} kích hoạt → ${kb.star} Kỵ → ${kb.targetHouse.toUpperCase()} → XUNG ${a.sourceHouse.toUpperCase()}`});
      }
    }
  }

  // 2. Kỵ bản tầng trước rơi đúng cung nguồn Đại/Tiểu hạn.
  for(const a of layers){
    const ka=kyOf(a); if(!ka?.targetBranch)continue;
    for(const b of layers){
      if(a.key===b.key||b.visualAnchor||b.key!=="dai")continue;
      if(ka.targetBranch===b.sourceBranch){
        add({type:"activation",score:95,title:`${b.label} kích hoạt cung nhận Kỵ của ${a.label}`,layers:[a.label,b.label],
          path:`${a.label} ${a.sourceHouse.toUpperCase()} → ${ka.star} Kỵ → ${ka.targetHouse.toUpperCase()} → ${b.label} nhập`});
      }
    }
  }

  // 2B. Tiểu Hạn chỉ làm điểm đối chiếu/kích hoạt, không tạo một bộ Tứ Hóa riêng.
  const tieuRef=Number(c.phiTieuBranch)||0;
  if(tieuRef){
    const tieuHouse=houseName(tieuRef,c.menh);
    for(const a of layers){
      const ka=kyOf(a);if(!ka?.targetBranch)continue;
      if(ka.targetBranch===tieuRef){
        add({type:"activation",score:97,title:`Tiểu hạn ${c.viewYear} kích hoạt cung nhận Kỵ của ${a.label}`,layers:[a.label,`Tiểu hạn ${c.viewYear} (đối chiếu)`],path:`${a.label} ${a.sourceHouse.toUpperCase()} → ${ka.star} Kỵ → ${ka.targetHouse.toUpperCase()} → TIỂU HẠN nhập ${tieuHouse.toUpperCase()}`});
      }else if(ka.oppositeBranch===tieuRef){
        add({type:"activation",score:91,title:`Tiểu hạn ${c.viewYear} nằm tại cung bị Kỵ xung của ${a.label}`,layers:[a.label,`Tiểu hạn ${c.viewYear} (đối chiếu)`],path:`${a.label} ${ka.star} Kỵ → ${ka.targetHouse.toUpperCase()} → XUNG ${tieuHouse.toUpperCase()} ← TIỂU HẠN`});
      }
    }
  }

  // 3. Kỵ nhập/xung Mệnh.
  for(const v of layers){
    const k=kyOf(v);if(!k?.targetBranch)continue;
    if(k.targetBranch===c.menh){
      add({type:"ky_to_menh",score:110,title:`${v.label}: Hóa Kỵ nhập Mệnh`,layers:[v.label],path:`${v.label} ${v.sourceHouse.toUpperCase()} → ${k.star} Kỵ → MỆNH`});
    }else if(k.oppositeBranch===c.menh){
      add({type:"ky_to_menh",score:108,title:`${v.label}: Hóa Kỵ xung Mệnh`,layers:[v.label],path:`${v.label} ${v.sourceHouse.toUpperCase()} → ${k.star} Kỵ → ${k.targetHouse.toUpperCase()} → XUNG MỆNH`});
    }
  }

  // 4. So sánh Kỵ của mỗi tầng với Hóa tích cực của tầng khác.
  for(let i=0;i<layers.length;i++)for(let j=0;j<layers.length;j++){
    if(i===j)continue;
    const a=layers[i],b=layers[j],k=kyOf(a);if(!k?.targetBranch)continue;
    for(const f of pos(b)){
      if(!f.targetBranch)continue;
      if(f.targetBranch===k.targetBranch){
        add({type:"ky_positive_same",score:82,title:`${a.label} Kỵ + ${b.label} ${PHI_HOA_LABEL[f.hoa]||f.hoa} cùng hội ${k.targetHouse}`,layers:[a.label,b.label],
          path:`${a.label} Kỵ → ${k.targetHouse.toUpperCase()} ← ${b.label} ${PHI_HOA_LABEL[f.hoa]||f.hoa} (${f.star})`});
      }else if(f.targetBranch===k.oppositeBranch){
        add({type:"ky_positive_axis",score:88,title:`${a.label} Kỵ và ${b.label} ${PHI_HOA_LABEL[f.hoa]||f.hoa} cùng một trục`,layers:[a.label,b.label],
          path:`${a.label} Kỵ → ${k.targetHouse.toUpperCase()} → XUNG ${k.oppositeHouse.toUpperCase()} ← ${b.label} ${PHI_HOA_LABEL[f.hoa]||f.hoa} (${f.star})`});
      }
    }
  }

  // 5. Kỵ trùng Kỵ giữa hai tầng.
  for(let i=0;i<layers.length;i++)for(let j=i+1;j<layers.length;j++){
    const a=layers[i],b=layers[j],ka=kyOf(a),kb=kyOf(b);if(!ka?.targetBranch||!kb?.targetBranch)continue;
    if(ka.targetBranch===kb.targetBranch){
      add({type:"ky_ky_same",score:102,title:`Kỵ trùng cung: ${a.label} + ${b.label}`,layers:[a.label,b.label],path:`${a.label} ${ka.star} Kỵ → ${ka.targetHouse.toUpperCase()} ← ${b.label} ${kb.star} Kỵ`});
    }else if(ka.targetBranch===kb.oppositeBranch||ka.oppositeBranch===kb.targetBranch){
      add({type:"ky_ky_same",score:98,title:`Kỵ đối trục: ${a.label} ↔ ${b.label}`,layers:[a.label,b.label],path:`${a.label} ${ka.star} Kỵ → ${ka.targetHouse.toUpperCase()} ↔ ${kb.targetHouse.toUpperCase()} ← ${b.label} ${kb.star} Kỵ`});
    }
  }

  // 6. Hội tụ bất kỳ: ít nhất 3 Hóa từ 3 tầng khác nhau vào cùng cung.
  const bucket=new Map();
  for(const v of layers)for(const f of (v.flows||[]))if(f.targetBranch){
    const arr=bucket.get(f.targetBranch)||[];arr.push({v,f});bucket.set(f.targetBranch,arr);
  }
  for(const [branch,arr] of bucket){
    const keys=new Set(arr.map(x=>x.v.key));
    if(keys.size<3)continue;
    const house=houseName(branch,c.menh);
    add({type:"same_target",score:72+Math.min(9,(keys.size-3)*3),title:`Hội tụ ${keys.size} tầng tại ${house}`,layers:[...new Set(arr.map(x=>x.v.label))],
      path:arr.map(x=>`${x.v.label} ${PHI_HOA_LABEL[x.f.hoa]||x.f.hoa}(${x.f.star})`).join(" • ")+` → ${house.toUpperCase()}`});
  }

  // 7. Quét đủ 12 cung nguyên cục để tìm cung phát Hóa đúng vào các điểm vận đang kích hoạt.
  for(const row of northNatalSourceActivationCandidates(c).slice(0,12))add(row);

  return signals.sort((a,b)=>b.score-a.score).slice(0,20);
}
function northConvergenceHotspots(c){
  const layers=northConvergenceLayerViews(c);
  const annual=layers.find(v=>v.key==="annual"),dai=layers.find(v=>v.key==="dai");
  const positive=new Map(),risk=new Map(),khoa=new Map();
  const bump=(map,branch,value,row)=>{if(!branch)return;const x=map.get(branch)||{score:0,rows:[]};x.score+=value;x.rows.push(row);map.set(branch,x);};
  for(const v of layers)for(const f of (v.flows||[]))if(f.targetBranch){
    const row={v,f};
    if(f.hoa==="Hóa Lộc")bump(positive,f.targetBranch,3,row);
    else if(f.hoa==="Hóa Quyền")bump(positive,f.targetBranch,2.6,row);
    else if(f.hoa==="Hóa Khoa"){bump(positive,f.targetBranch,2.4,row);bump(khoa,f.targetBranch,3.4,row);}
    else if(f.hoa==="Hóa Kỵ"){
      bump(risk,f.targetBranch,4,row);
      if(f.oppositeBranch)bump(risk,f.oppositeBranch,1.5,{...row,xung:true});
    }
  }
  const top=(map)=>[...map.entries()].sort((a,b)=>b[1].score-a[1].score)[0];
  const opp=top(positive),rk=top(risk),sol=top(khoa);
  const origin=northNatalSourceActivationCandidates(c)[0]||null;
  const fmt=(entry,fallback="—")=>entry?`${houseName(entry[0],c.menh)} (${entry[1].rows.length} lớp/tác động)`:fallback;
  return {
    event:annual?.sourceHouse||"—",
    origin:origin?`${origin.sourceHouse} → ${origin.flow.targetHouse}${origin.flow.hoa==="Hóa Kỵ"?" (Kỵ)":` (${PHI_HOA_LABEL[origin.flow.hoa]||origin.flow.hoa})`}`:"—",
    trigger:c.phiTieuBranch?houseName(c.phiTieuBranch,c.menh):"—",
    decade:dai?.sourceHouse||"—",
    opportunity:fmt(opp),risk:fmt(rk),solution:fmt(sol),
    opportunityBranch:opp?.[0]||0,riskBranch:rk?.[0]||0,solutionBranch:sol?.[0]||0
  };
}
function northConvergenceButtonHtml(c){
  if(!isNorthTuHoaMode(c.annualMode))return "";
  const signals=northConvergenceSignals(c),n=signals.length,top=northConvergenceLevel(signals[0]?.score||0);
  return `<button type="button" class="north-convergence-btn" data-phi-help="north-convergence"><span>HỘI TỤ TỨ HÓA</span><span class="north-convergence-count">• ${n} tín hiệu${n?` • ${top.label}`:""}</span></button>`;
}
function northConvergencePopupHtml(c){
  const signals=northConvergenceSignals(c);
  const layers=northConvergenceLayerViews(c),hot=northConvergenceHotspots(c);
  const layerText=layers.map(v=>`<b>${escapeHtml(v.label)}</b>: ${escapeHtml(v.sourceHouse||"—")}${v.flows?.[0]?.sourceStem?` / Can ${escapeHtml(CAN[v.flows[0].sourceStem])}`:""}`).join(" • ");
  const tieuText=c.phiTieuBranch?`<b>Tiểu hạn ${escapeHtml(String(c.viewYear))}</b>: ${escapeHtml(houseName(c.phiTieuBranch,c.menh))} / đối chiếu, không phát riêng 4 Hóa`:"<b>Tiểu hạn</b>: —";
  return `<div class="star-help-head"><span class="star-help-name">KẾT LUẬN HỘI TỤ TỨ HÓA</span><span class="star-help-meta">${signals.length} tín hiệu • ${escapeHtml(String(c.viewYear))}</span></div>
    <div class="star-help-kicker">BẮC PHÁI • MỆNH BÀN + ĐẠI HẠN + LƯU NIÊN • TIỂU HẠN ĐỐI CHIẾU</div><div class="star-help-context">${provenanceBadgesHtml()}<br><b>QUY TẮC</b>: Can/Hóa/cung nhận; <b>PHÁT HIỆN</b>: mẫu hội tụ máy dò; <b>NHẬN ĐỊNH</b>: vai trò cơ hội–rủi ro–đường giải, chỉ dùng tham khảo.</div>
    <div class="star-help-context"><b>Các lớp đang đối chiếu:</b> ${layerText} • ${tieuText}.</div>
    <div class="star-help-detail"><div class="star-help-detail-title">Bản đồ trọng điểm đa tầng</div>
      <div class="north-convergence-map">
        <div class="north-convergence-map-card"><b>Trọng tâm năm</b><div>${escapeHtml(hot.event)} • Lưu Thái Tuế/neo Lưu Niên</div><div><b>Cung phát nổi bật:</b> ${escapeHtml(hot.origin)}</div><div>Điểm đối chiếu Tiểu Hạn: ${escapeHtml(hot.trigger)}</div></div>
        <div class="north-convergence-map-card"><b>Bối cảnh 10 năm</b><div>Đại Hạn tại ${escapeHtml(hot.decade)}</div></div>
        <div class="north-convergence-map-card"><b>Vùng cơ hội / nguồn lực</b><div>${escapeHtml(hot.opportunity)}</div></div>
        <div class="north-convergence-map-card"><b>Điểm rủi ro / nút thắt</b><div>${escapeHtml(hot.risk)}</div></div>
        <div class="north-convergence-map-card"><b>Đường giải / hợp thức hóa</b><div>${escapeHtml(hot.solution)}</div></div>
      </div>
    </div>
    <div class="star-help-detail"><div class="star-help-detail-title">Cách xếp mức hội tụ</div><div class="star-help-detail-text"><b>CỰC MẠNH</b> → <b>RẤT MẠNH</b> → <b>MẠNH</b> → <b>RÕ</b> → <b>THAM KHẢO</b>. Đây là mức độ <b>lặp và chồng cấu trúc</b>, không phải điểm cát/hung. Bộ dò ưu tiên: trùng toàn bộ 4 Hóa, Kỵ lặp đúng sao–cung, Hóa tích cực + Kỵ trên cùng sao, chuỗi Kỵ hồi xung và cụm Lộc–Quyền–Khoa nhiều tầng.</div></div>
    ${signals.length?signals.map((s,i)=>`<div class="star-help-detail${i<3?" star-help-annual-reading":""}"><div class="star-help-detail-title">${i+1}. ${escapeHtml(s.title)}</div><div class="north-convergence-path">${escapeHtml(s.path)}</div><div class="star-help-detail-text"><span class="north-convergence-level">${escapeHtml(s.level.label)}</span><span class="north-convergence-role">${escapeHtml(s.role)}</span><span class="north-convergence-tag">${escapeHtml((s.layers||[]).join(" + "))}</span>${escapeHtml(s.meaning)}</div></div>`).join(""):`<div class="star-help-detail"><div class="star-help-detail-title">Chưa thấy hội tụ mạnh theo bộ lọc hiện tại</div><div class="star-help-detail-text">Các tầng vẫn có thể được luận riêng; bộ dò chỉ đưa lên những quan hệ lặp, kích hoạt hoặc đối trục rõ.</div></div>`}
    <div class="star-help-foot">Ưu tiên tín hiệu mức cao; sau đó mở popup từng Hóa để kiểm tra Can phát, sao chủ, cung nhận, Ngã/Tha, Kỵ xung và chuỗi Chuyển Kỵ. “Vùng cơ hội / rủi ro / đường giải” là bản đồ cấu trúc, không phải dự báo chắc chắn.</div>`;
}

function northStaticPalaceOverlayHtml(branch,c){
  if(!isNorthTuHoaMode(c.annualMode))return "";
  const house=houseName(branch,c.menh),type=northHouseTypeByName(house),lai=northLaiNhanBranches(c).includes(branch);
  const natal=northNatalHoaFlows(c).filter(f=>f.targetBranch===branch);
  const typeHtml=type?`<button type="button" class="north-badge ${type}" data-phi-help="north-house" data-north-branch="${branch}">${type==="nga"?"NGÃ":"THA"}</button>`:"";
  const laiHtml=lai?`<button type="button" class="north-badge lai" data-phi-help="north-lai" data-north-branch="${branch}">LAI NHÂN</button>`:"";
  const natalHtml=natal.map(f=>`<button type="button" class="north-badge natal-${PHI_HOA_CLASS[f.hoa]||""}" data-phi-help="north-natal" data-north-hoa-index="${f.index}" data-north-branch="${branch}">SN ${PHI_HOA_LABEL[f.hoa]||f.hoa}</button>`).join("");
  return `<div class="north-static-badges">${typeHtml}${laiHtml}${natalHtml}</div>`;
}
function phiHouseTopic(name){return PHI_HOUSE_TOPIC[name]||`các vấn đề thuộc cung ${name||"đang xét"}`}
function phiFlowsFromStem(sourceStem,sourceBranch,sourceHouse,c,opts={}){
  const hosts=THIEN_LUONG_TU_HOA[sourceStem]||[];
  const layer=opts.layer||"natal";
  const sourceLabel=opts.sourceLabel||sourceHouse;
  const allowSelf=opts.allowSelf!==false;
  return PHI_HOA_ORDER.map((hoa,i)=>{
    const star=hosts[i]||"—";
    const targetBranch=Number(c.positions?.[star])||0;
    const targetHouse=targetBranch?houseName(targetBranch,c.menh):"—";
    return {index:i,hoa,star,sourceStem,sourceBranch,sourceHouse,sourceLabel,layer,
      sourceStemOrigin:opts.sourceStemOrigin||"Can cung",sourceVisualNote:opts.sourceVisualNote||"",
      targetBranch,targetHouse,oppositeBranch:targetBranch?wrap1(targetBranch+6):0,
      oppositeHouse:targetBranch?houseName(wrap1(targetBranch+6),c.menh):"—",
      self:allowSelf&&!!targetBranch&&!!sourceBranch&&targetBranch===sourceBranch};
  });
}
function phiTuHoaForSource(sourceBranch,c){
  const sourceStem=houseCan(sourceBranch,c.canNam);
  const sourceHouse=houseName(sourceBranch,c.menh);
  return phiFlowsFromStem(sourceStem,sourceBranch,sourceHouse,c,{layer:"natal",sourceLabel:`Cung ${sourceHouse}`,sourceStemOrigin:"Can cung",allowSelf:true});
}
function buildPhiTuHoaMap(c){
  const out={};
  for(let branch=1;branch<=12;branch++)out[branch]=phiTuHoaForSource(branch,c);
  return out;
}
function buildPhiLayerView(layer,c,phiTuHoa){
  const safe=["natal","dai","annual","tieu"].includes(layer)?layer:"natal";
  if(safe==="natal")return {layer:"natal",title:"MỆNH BÀN",subtitle:"12 Can cung nguyên thủy",multiSource:true,map:phiTuHoa,sourceBranch:c.menh,sourceStem:null,sourceHouse:houseName(c.menh,c.menh),flows:phiTuHoa?.[c.menh]||[]};
  if(safe==="dai"){
    const br=Number(c.phiDaiBranch??c.daiBranch)||0,startAge=c.phiDaiStartAge??c.daiStartAge,stem=br?houseCan(br,c.canNam):0,house=br?houseName(br,c.menh):"—";
    const flows=stem?phiFlowsFromStem(stem,br,house,c,{layer:"dai",sourceLabel:`Đại Hạn ${startAge}–${startAge+9} tuổi tại ${house}`,sourceStemOrigin:"Can cung Đại Hạn Phi Hóa",allowSelf:true}):[];
    return {layer:"dai",title:`ĐẠI HẠN ${startAge??"—"}–${startAge!=null?startAge+9:"—"} TUỔI`,subtitle:br?`${house.toUpperCase()} • ${CAN[stem].toUpperCase()} ${CHI[br].toUpperCase()} • quy tắc Phi Hóa`:"Ngoài phạm vi 12 Đại Hạn",multiSource:false,sourceBranch:br,sourceStem:stem,sourceHouse:house,flows};
  }
  if(safe==="annual"){
    const br=yearBranch(c.viewYear),stem=yearStem(c.viewYear),house=houseName(br,c.menh);
    const flows=phiFlowsFromStem(stem,br,house,c,{layer:"annual",sourceLabel:`Lưu Niên ${c.viewYear} (${CAN[stem]} ${CHI[br]})`,sourceStemOrigin:"Can năm Lưu Niên",sourceVisualNote:`Neo trực quan tại Lưu Thái Tuế ${CHI[br]} / cung ${house}`,allowSelf:false});
    return {layer:"annual",title:`LƯU NIÊN ${c.viewYear} • ${CAN[stem].toUpperCase()} ${CHI[br].toUpperCase()}`,subtitle:`Can năm ${CAN[stem].toUpperCase()} • neo Lưu Thái Tuế tại ${house.toUpperCase()} (${CHI[br].toUpperCase()})`,multiSource:false,sourceBranch:br,sourceStem:stem,sourceHouse:house,flows};
  }
  const br=Number(c.phiTieuBranch??c.tieuBranch)||0,house=br?houseName(br,c.menh):"—";
  return {layer:"tieu",title:`TIỂU HẠN ${c.viewYear} • ĐỐI CHIẾU`,subtitle:br?`${house.toUpperCase()} • ${CHI[br].toUpperCase()} • Nam thuận/Nữ nghịch • không phát riêng 4 Hóa`:"Không xác định",multiSource:false,referenceOnly:true,sourceBranch:br,sourceStem:0,sourceHouse:house,flows:[]};
}
function phiCurrentFlows(c,sourceBranch=null){
  const v=c.phiView;if(!v)return [];
  if(v.multiSource){const source=Number(sourceBranch)||Number(__phiSelectedSource)||c.menh;return c.phiTuHoa?.[source]||[];}
  return v.flows||[];
}
function phiFlowShortHtml(flow){
  const cls=PHI_HOA_CLASS[flow.hoa]||"",short=LIMIT_HOUSE_SHORT[flow.targetHouse]||String(flow.targetHouse||"—").toUpperCase();
  return `<button type="button" class="phi-flow phi-flow-${cls}${flow.self?" phi-self":""}" data-phi-help="flow" data-phi-source-branch="${flow.sourceBranch||0}" data-phi-index="${flow.index}" aria-label="${escapeHtml(flow.sourceLabel||flow.sourceHouse)} ${escapeHtml(flow.hoa)} qua ${escapeHtml(flow.star)} đến ${escapeHtml(flow.targetHouse)}"><span class="phi-kind">${escapeHtml(PHI_HOA_LABEL[flow.hoa]||flow.hoa)}</span><span class="phi-star">${escapeHtml(HOA_SHORT[flow.star]||flow.star.toUpperCase())}</span><span class="phi-dest">→ ${escapeHtml(short)}</span>${flow.self?`<span class="phi-self-mark">TỰ</span>`:""}</button>`;
}
function phiTuHoaPanelHtml(branch,c){
  if(!isPhiDisplayMode(c.annualMode))return "";const v=c.phiView;if(!v)return "";
  if(v.multiSource){
    const flows=c.phiTuHoa?.[branch]||[],sourceHouse=houseName(branch,c.menh),sourceStem=houseCan(branch,c.canNam);
    return `<div class="phi-tu-hoa-panel" data-phi-source-panel="${branch}"><div class="phi-source-head" data-phi-help="source" data-phi-source-branch="${branch}" title="${phiModeLabel(c.annualMode)} từ Can cung ${CAN[sourceStem]} của cung ${escapeHtml(sourceHouse)}"><span>${phiModePanelLabel(c.annualMode)}</span><span class="phi-source-can">${CAN[sourceStem].toUpperCase()}</span></div>${flows.map(phiFlowShortHtml).join("")}</div>`;
  }
  if(branch!==v.sourceBranch)return "";
  const layerLabel=({dai:"ĐẠI HẠN",annual:"LƯU NIÊN",tieu:"TIỂU HẠN"})[v.layer]||phiModeLabel(c.annualMode);
  if(v.referenceOnly)return `<div class="phi-tu-hoa-panel" data-phi-source-panel="${branch}"><div class="phi-source-head" data-phi-help="source" data-phi-source-branch="${branch}" title="${escapeHtml(v.title)} • ${escapeHtml(v.subtitle)}"><span>${layerLabel}</span><span class="phi-source-can">ĐỐI CHIẾU</span></div></div>`;
  return `<div class="phi-tu-hoa-panel" data-phi-source-panel="${branch}"><div class="phi-source-head" data-phi-help="source" data-phi-source-branch="${branch}" title="${escapeHtml(v.title)} • ${escapeHtml(v.subtitle)}"><span>${layerLabel}</span><span class="phi-source-can">${v.sourceStem?CAN[v.sourceStem].toUpperCase():"—"}</span></div>${(v.flows||[]).map(phiFlowShortHtml).join("")}</div>`;
}
function renderPhiHostStarHtml(s,branch){return `<div class="minor-star" data-context-note="Sao có thể làm chủ Tứ Hóa theo tầng Phi Hóa đang chọn" data-phi-help="host" data-phi-star="${escapeHtml(s.name)}" data-phi-target-branch="${branch}">${displayStar(s)}</div>`;}
function findCuc(menh,canNam){
  let canJan=(canNam*2+1)%10;if(canJan===0)canJan=10;
  let canMenh=((menh-3)%12+12)%12+canJan;
  canMenh=canMenh%10;if(canMenh===0)canMenh=10;
  const na=napAm(canMenh,menh);
  if(!na)throw new Error("Không tính được Ngũ Hành Cục.");
  return CUC_INFO[na.e];
}
function findTuVi(cuc,ld){
  let p=3,x=cuc;
  while(x<ld){x+=cuc;p+=1}
  let diff=x-ld;if(diff%2===1)diff=-diff;
  return wrap1(p+diff);
}
function trangSinhDirection(stem,gender){
  /* Cách thông thường: Dương Nam/Âm Nữ thuận; Âm Nam/Dương Nữ nghịch. */
  return polarityGenderDirection(stem,gender);
}
function findTrangSinh(cuc){
  const start=STANDARD_TRANG_SINH_START[cuc];
  if(!start)throw new Error("Ngũ Hành Cục không hợp lệ khi an Vòng Tràng Sinh.");
  return start;
}
function verifyTrangSinhPlacement(cuc,dir){
  const start=findTrangSinh(cuc);
  const deVuong=wrap1(start+4*dir);
  const mo=wrap1(start+8*dir);
  return {
    start,deVuong,mo,
    direction:dir,
    directionLabel:dir===1?"DƯƠNG NAM / ÂM NỮ — THUẬN":"ÂM NAM / DƯƠNG NỮ — NGHỊCH"
  };
}

/* ======================== ENGINE SAO ======================== */
function makeBuckets(){return Array.from({length:13},()=>[])}
function addStar(b,pos,name,source=""){
  pos=wrap1(pos);
  if(!b[pos].some(s=>s.name===name)){
    const major=MAJOR_META[name];
    b[pos].push({
      name,pos,source,
      major:!!major,
      id:major?.id||null,
      e:major?.e||STAR_ELEMENT[name]||"T",
      status:(STATUS[name]||[])[pos-1]||""
    });
  }
  return pos;
}
function locate(b,name){
  for(let i=1;i<=12;i++)if(b[i].some(s=>s.name===name))return i;
  return null;
}
function findKhoi(can){return [0,2,1,12,12,2,1,7,7,4,4][can]}
function findQuanPhuc(can){
  const quan=[0,8,5,6,3,4,10,12,10,11,7];
  const phuc=[0,10,9,1,12,4,3,7,6,7,6];
  return [quan[can],phuc[can]];
}
function findCoThan(chi){
  if([12,1,2].includes(chi))return 3;
  if([3,4,5].includes(chi))return 6;
  if([6,7,8].includes(chi))return 9;
  return 12;
}
function findThienMa(chi){
  const r=chi%4;if(r===1)return 3;if(r===2)return 12;if(r===3)return 9;return 6;
}
function findPhaToai(chi){
  const r=chi%3;
  if(r===1)return 6;   // Tý/Mão/Ngọ/Dậu -> Tỵ
  if(r===2)return 2;   // Sửu/Thìn/Mùi/Tuất -> Sửu
  return 10;           // Dần/Tỵ/Thân/Hợi -> Dậu
}

function tieuHanStartByBirthBranch(chi){
  if([3,7,11].includes(chi)) return 5;   // Dần Ngọ Tuất -> Thìn
  if([9,1,5].includes(chi)) return 11;   // Thân Tý Thìn -> Tuất
  if([6,10,2].includes(chi)) return 8;   // Tỵ Dậu Sửu -> Mùi
  return 2;                              // Hợi Mão Mùi -> Sửu
}
function tieuHanDirection(canNam,gender){
  return polarityGenderDirection(canNam,gender);
}
function tieuHanBranch(birthChi,viewChi,canNam,gender){
  const start=tieuHanStartByBirthBranch(birthChi);
  const dir=tieuHanDirection(canNam,gender);
  return wrap1(start + dir*(viewChi-birthChi));
}
function tieuHanRing(birthChi,canNam,gender){
  const start=tieuHanStartByBirthBranch(birthChi);
  const dir=tieuHanDirection(canNam,gender);
  const labels={};
  for(let physical=1;physical<=12;physical++){
    labels[physical]=wrap1(birthChi + dir*(physical-start));
  }
  return {start,dir,labels};
}
/* V3.3.143 — TÁCH HỆ VẬN HẠN.
   Không dùng chiều Tiểu Hạn Thiên Lương để suy ngược cho Phi Tứ Hóa/Bắc Phái.
   Phi Hóa thông dụng: Đại Hạn Dương Nam/Âm Nữ thuận, Âm Nam/Dương Nữ nghịch;
   Tiểu Hạn chỉ làm điểm đối chiếu và an Nam thuận – Nữ nghịch, không phát Can cung thành 4 Hóa riêng. */
function phiDecadeDirection(canNam,gender){
  return polarityGenderDirection(canNam,gender);
}
function phiDecadeAt(branch,menh,cuc,gender,canNam){
  return cuc.number+distanceHouse(branch,menh,phiDecadeDirection(canNam,gender))*10;
}
function phiTieuHanDirection(gender){
  return genderSign(gender); // Nam thuận, Nữ nghịch; không xét Âm/Dương năm sinh.
}
function phiTieuHanBranch(birthChi,viewChi,gender){
  const start=tieuHanStartByBirthBranch(birthChi);
  return wrap1(start + phiTieuHanDirection(gender)*(viewChi-birthChi));
}
function auditSystemRuleIsolation(){
  const errors=[];
  // Âm Nam: Thiên Lương đi nghịch, Tiểu Hạn đối chiếu Phi Hóa vẫn Nam thuận.
  if(tieuHanDirection(2,"Nam")!==-1)errors.push("Thiên Lương Âm Nam phải nghịch");
  if(phiTieuHanDirection("Nam")!==1)errors.push("Phi Hóa Tiểu Hạn Nam phải thuận");
  // Âm Nữ: Thiên Lương thuận, Tiểu Hạn đối chiếu Phi Hóa vẫn Nữ nghịch.
  if(tieuHanDirection(2,"Nữ")!==1)errors.push("Thiên Lương Âm Nữ phải thuận");
  if(phiTieuHanDirection("Nữ")!==-1)errors.push("Phi Hóa Tiểu Hạn Nữ phải nghịch");
  // Đại Hạn Phi Hóa vẫn theo âm/dương Can năm + giới tính.
  if(phiDecadeDirection(1,"Nam")!==1||phiDecadeDirection(2,"Nam")!==-1||phiDecadeDirection(1,"Nữ")!==-1||phiDecadeDirection(2,"Nữ")!==1)errors.push("Sai chiều Đại Hạn Phi Hóa");
  const tieuView=buildPhiLayerView("tieu",{canNam:1,menh:3,positions:{},viewYear:2026,phiTieuBranch:5},{});
  if(!tieuView.referenceOnly||(tieuView.flows||[]).length!==0||tieuView.sourceStem!==0)errors.push("Tiểu Hạn Phi Hóa không được phát riêng 4 Hóa");
  return {ok:errors.length===0,errors,caseCount:9};
}

/* V3.3.143 — RULE REGISTRY THEO TRƯỜNG PHÁI.
   Engine chỉ truy cập luật vận qua registry tương ứng; không dùng hàm của hệ này
   làm mặc định cho hệ khác. Đây là lớp chống “cross-wire” giữa Thiên Lương,
   Phi Tứ Hóa và Tứ Hóa Bắc Phái. */
const SYSTEM_ARCHITECTURE=Object.freeze([
  "CORE CALENDAR","CORE CHART","STAR MASTER DATABASE","THIEN LUONG RULES","PHI HOA RULES","BAC PHAI RULES","INTERPRETATION ENGINE","POPUP / TRACE ENGINE","EXPORT ENGINE","AUDIT ENGINE"
]);
const SYSTEM_RULE_REGISTRY=Object.freeze({
  thienluong:Object.freeze({
    id:"thien-luong",
    label:"Tử Vi Thiên Lương",
    decadeAt,
    tieuDirection:tieuHanDirection,
    tieuBranch:tieuHanBranch,
    tieuRing:tieuHanRing,
    annualUsesAtChu:true
  }),
  phi:Object.freeze({
    id:"standard-feixing",
    label:"Phi Tứ Hóa",
    decadeDirection:phiDecadeDirection,
    decadeAt:phiDecadeAt,
    tieuDirection:phiTieuHanDirection,
    tieuBranch:phiTieuHanBranch,
    tieuEmitsFourHoa:false,
    annualStemSource:"year-stem"
  }),
  bacphai:Object.freeze({
    id:"north-tuhoa",
    label:"Tứ Hóa Bắc Phái",
    decadeDirection:phiDecadeDirection,
    decadeAt:phiDecadeAt,
    tieuDirection:phiTieuHanDirection,
    tieuBranch:phiTieuHanBranch,
    tieuEmitsFourHoa:false,
    annualStemSource:"year-stem",
    supports:Object.freeze(["phi-xuat","phi-nhap","tu-hoa","ky-xung","chuyen-ky","nga-tha","lai-nhan","hoi-tu-da-tang"])
  })
});
function ruleSetForMode(mode){
  if(mode==="bacphai")return SYSTEM_RULE_REGISTRY.bacphai;
  if(mode==="phi")return SYSTEM_RULE_REGISTRY.phi;
  return SYSTEM_RULE_REGISTRY.thienluong;
}
function auditRuleRegistry(){
  const errors=[];
  const tl=SYSTEM_RULE_REGISTRY.thienluong,phi=SYSTEM_RULE_REGISTRY.phi,bp=SYSTEM_RULE_REGISTRY.bacphai;
  if(tl.tieuBranch===phi.tieuBranch)errors.push("Rule Registry: Tiểu Hạn Thiên Lương và Phi Hóa không được dùng cùng hàm");
  if(phi.tieuEmitsFourHoa!==false||bp.tieuEmitsFourHoa!==false)errors.push("Rule Registry: Tiểu Hạn Phi/Bắc Phái không phát riêng 4 Hóa");
  if(phi.decadeAt!==phiDecadeAt||bp.decadeAt!==phiDecadeAt)errors.push("Rule Registry: Đại Hạn Phi/Bắc Phái sai engine");
  if(tl.decadeAt!==decadeAt)errors.push("Rule Registry: Đại Hạn Thiên Lương sai engine");
  if(ruleSetForMode("bacphai").id!=="north-tuhoa"||ruleSetForMode("phi").id!=="standard-feixing")errors.push("Rule Registry: mode routing sai");
  return {ok:errors.length===0,errors,ruleCount:Object.keys(SYSTEM_RULE_REGISTRY).length};
}

/* Nhị hợp: Tý–Sửu, Dần–Hợi, Mão–Tuất, Thìn–Dậu, Tỵ–Thân, Ngọ–Mùi. */
function nhiHopBranch(branch){
  return ({
    1:2,2:1,3:12,12:3,4:11,11:4,
    5:10,10:5,6:9,9:6,7:8,8:7
  })[branch];
}
function tamHopBranches(branch){
  return [branch,wrap1(branch+4),wrap1(branch+8)];
}

/* Quy tắc đánh giá tháng theo mô tả Gia đình Thiên Lương:
   Sao ứng với Can tháng được coi là tốt nếu vị trí sao gốc nằm:
   1) trong tam hợp của cung tháng; hoặc
   2) tại nhị hợp của một trong ba đỉnh tam hợp đó.
   Các trường hợp còn lại đánh dấu đỏ. */
function evaluateMonthRelation(monthBranch,natalStarBranch){
  const tam=tamHopBranches(monthBranch);
  const nhiTam=tam.map(nhiHopBranch);
  const good=tam.includes(natalStarBranch)||nhiTam.includes(natalStarBranch);
  let reason="ngoài tam hợp/nhị hợp";
  if(tam.includes(natalStarBranch)){
    reason=natalStarBranch===monthBranch?"đồng cung":"tam hợp";
  }else if(nhiTam.includes(natalStarBranch)){
    const source=tam.find(x=>nhiHopBranch(x)===natalStarBranch);
    reason=source===monthBranch?"nhị hợp cung tháng":"nhị hợp một đỉnh tam hợp";
  }
  return {good,reason,tamHop:tam,nhiHopTam:nhiTam};
}

/* Tìm tháng 1 lưu niên:
   từ cung Tiểu Hạn năm -> nghịch tháng sinh -> thuận giờ sinh.
   Sau đó tháng 1..12 chạy thuận chiều kim đồng hồ (+1 địa chi). */
function annualLunarMonths(viewYear,tieuBranch,birthLunarMonth,birthHourBranch,natalPositions){
  const month1Branch=wrap1(
    tieuBranch - (birthLunarMonth-1) + (birthHourBranch-1)
  );
  const canNamXem=yearStem(viewYear);
  const months=[];
  for(let m=1;m<=12;m++){
    const branch=wrap1(month1Branch+(m-1));
    const cc=lunarMonthCanChi(m,canNamXem);
    const star=saoAtChu(cc.stem);
    const natalStarBranch=natalPositions[star]||null;
    const relation=natalStarBranch
      ? evaluateMonthRelation(branch,natalStarBranch)
      : {good:false,reason:"không tìm thấy sao gốc",tamHop:tamHopBranches(branch),nhiHopTam:tamHopBranches(branch).map(nhiHopBranch)};
    months.push({
      month:m,
      branch,
      stem:cc.stem,
      stemName:CAN[cc.stem],
      monthBranch:cc.branch,
      star,
      natalStarBranch,
      good:relation.good,
      reason:relation.reason,
      tamHop:relation.tamHop,
      nhiHopTam:relation.nhiHopTam
    });
  }
  return {month1Branch,months};
}
/* V3.3.117 — Ngày tốt theo cùng logic Thiên Lương đang dùng cho “tháng tốt”.
   Đây là bộ lọc gợi ý nội bộ của lá số, không đồng nhất với lịch Hoàng Đạo/Trực.
   Một ngày được chọn khi:
   1) Sao Át Chủ theo Can ngày nằm tam hợp/nhị hợp với cung tháng lưu niên;
   2) Chi ngày cũng nằm tam hợp/nhị hợp với cung tháng;
   3) Chi ngày không xung trực tiếp với Chi năm sinh. */
function annualGoodDaysForMonth(viewYear,viewLunarMonth,tz,annualMonths,natalPositions,birthYearBranch){
  const monthInfo=annualMonths?.months?.find(x=>x.month===viewLunarMonth);
  if(!monthInfo)return {month:viewLunarMonth,monthInfo:null,days:[]};
  const days=[];
  for(let lunarDay=1;lunarDay<=30;lunarDay++){
    const solar=lunarToSolar(lunarDay,viewLunarMonth,viewYear,0,tz);
    if(!solar)continue;
    const dayCC=dayStemBranch(solar.day,solar.month,solar.year);
    const star=saoAtChu(dayCC.stem);
    const natalStarBranch=natalPositions[star]||null;
    if(!natalStarBranch)continue;
    const stemRel=evaluateMonthRelation(monthInfo.branch,natalStarBranch);
    const branchRel=evaluateMonthRelation(monthInfo.branch,dayCC.branch);
    const directClash=dayCC.branch===wrap1(birthYearBranch+6);
    if(stemRel.good && branchRel.good && !directClash){
      const strongStem=stemRel.reason==="đồng cung"||stemRel.reason==="tam hợp";
      const strongBranch=branchRel.reason==="đồng cung"||branchRel.reason==="tam hợp";
      days.push({
        lunarDay,solar,dayCC,star,natalStarBranch,
        stemReason:stemRel.reason,branchReason:branchRel.reason,
        strong:strongStem&&strongBranch
      });
    }
  }
  return {month:viewLunarMonth,monthInfo,days};
}

function annualGoodDaysHtml(c){
  if(c.annualMode!=="full"||!c.showGoodDays)return "";
  const pack=c.goodDays;
  if(!pack?.monthInfo)return "";
  const items=pack.days.map(d=>{
    const solar=`${d.solar.day}/${d.solar.month}`;
    const mark=d.strong?"★":"";
    const tip=`Âm ${d.lunarDay}/${pack.month} • Dương ${solar}/${d.solar.year} • ${CAN[d.dayCC.stem]} ${CHI[d.dayCC.branch]} • ${d.star} • ${d.stemReason}; Chi ngày ${d.branchReason}`;
    return `<span class="good-day-item" title="${escapeHtml(tip)}">${mark}${fmt2(d.lunarDay)} <span style="font-weight:400">(${solar})</span></span>`;
  });
  return `<div class="good-days-box" title="Ngày tốt theo logic Át Chủ của ngày cùng cung tháng đang xem. Số trong ngoặc là ngày dương lịch; dấu ★ là ngày ưu tiên. Diễn giải chi tiết xem trong popup.">
    <span class="good-days-title">Ngày tốt tháng ${pack.month} AL:</span>
    <span class="good-days-list">${items.length?items.join(" • "):"—"}</span>
  </div>`;
}

function annualStarLayer(viewYear,natalPositions,gender){
  const can=yearStem(viewYear),chi=yearBranch(viewYear);
  const out=Array.from({length:13},()=>[]);
  const add=(pos,name,type="neutral",group="core")=>{
    pos=wrap1(pos);
    if(!out[pos].some(x=>x.name===name))out[pos].push({name,type,group});
  };

  /* Bộ 9 sao lưu cơ bản */
  const loc=LOC_TON[can];
  add(chi,"L. Thái Tuế","bad","core");
  add(chi+2,"L. Tang Môn","bad","core");
  add(chi+8,"L. Bạch Hổ","bad","core");
  add(7-chi+1,"L. Thiên Khốc","bad","core");
  add(7+chi-1,"L. Thiên Hư","bad","core");
  add(loc,"L. Lộc Tồn","good","core");
  const kdSchool=document.querySelector("#kinhDaSchool")?.value||"thienluong";
  const annualKD=kinhDaPlacement(can,gender,kdSchool);
  add(annualKD.kinh,"L. Kình Dương","bad","core");
  add(annualKD.da,"L. Đà La","bad","core");
  add(findThienMa(chi),"L. Thiên Mã","good","core");

  /* Lưu tinh mở rộng theo năm xem */
  const hong=wrap1(4-chi+1);
  add(hong,"L. Hồng Loan","good","extended");
  add(hong+6,"L. Thiên Hỷ","good","extended");

  const khoi=findKhoi(can);
  add(khoi,"L. Thiên Khôi","good","extended");
  add(5+5-khoi,"L. Thiên Việt","good","extended");

  const [quan,phuc]=findQuanPhuc(can);
  add(quan,"L. Thiên Quan","good","extended");
  add(phuc,"L. Thiên Phúc","good","extended");

  add(findPhaToai(chi),"L. Phá Toái","bad","extended");

  const ma=findThienMa(chi);
  add(ma+2,"L. Hoa Cái","good","extended");
  add(ma+3,"L. Kiếp Sát","bad","extended");
  add(ma+7,"L. Đào Hoa","good","extended");

  add(chi+5,"L. Nguyệt Đức","good","extended");
  add(chi+9,"L. Thiên Đức","good","extended");

  const [luu,tru]=findLuuHaThienTru(can);
  add(luu,"L. Lưu Hà","bad","extended");
  add(tru,"L. Thiên Trù","good","extended");

  /* Lưu Tứ Hóa: Can năm xem tác động lên vị trí sao chủ của lá số gốc */
  const hosts=THIEN_LUONG_TU_HOA[can];
  ["L. Hóa Lộc","L. Hóa Quyền","L. Hóa Khoa","L. Hóa Kỵ"].forEach((name,i)=>{
    const p=natalPositions[hosts[i]];
    if(p)add(p,name,name.includes("Kỵ")?"bad":"good","tuhoa");
  });

  return {year:viewYear,can,chi,stars:out,hoaHosts:hosts};
}
function findTriet(can){
  if(can===1||can===6)return [9,10];
  if(can===2||can===7)return [7,8];
  if(can===3||can===8)return [5,6];
  if(can===4||can===9)return [3,4];
  return [1,2];
}
function findHoaLinh(chi,gio,gender,can){
  let hoa,linh;
  if([3,7,11].includes(chi)){hoa=2;linh=4}
  else if([1,5,9].includes(chi)){hoa=3;linh=11}
  else if([6,10,2].includes(chi)){hoa=4;linh=11}
  else{hoa=10;linh=11}
  const direction=genderSign(gender)*stemYang(can);
  if(direction===-1)return [wrap1(hoa+1-gio),wrap1(linh-1+gio)];
  return [wrap1(hoa-1+gio),wrap1(linh+1-gio)];
}
function findLuuHaThienTru(can){
  const luu=[0,10,11,8,9,6,7,4,5,12,3];
  const tru=[0,6,7,1,6,7,9,3,7,10,11];
  return [luu[can],tru[can]];
}

/* Lưu Niên Văn Tinh theo Can tuổi — hệ Thiên Lương:
   Giáp Tỵ, Ất Ngọ, Bính Thân, Đinh Dậu, Mậu Thân,
   Kỷ Dậu, Canh Hợi, Tân Tý, Nhâm Dần, Quý Mão.
   Sao này KHÔNG phụ thuộc giới tính và không được suy từ Kình Dương. */
function findLuuNienVanTinh(can){
  const table=[0,6,7,9,10,9,10,12,1,3,4];
  return table[can];
}

function buildStars(ctx){
  const {ld,lm,ly,hourBranch,gender,menh,than,cuc,banMenh}=ctx;
  const can=yearStem(ly),chi=yearBranch(ly);
  const b=makeBuckets();
  const mark={tuan:[],triet:[]};
  const pos={};

  /* 14 Chính Tinh */
  pos["Tử Vi"]=addStar(b,findTuVi(cuc.number,ld),"Tử Vi","chinh");
  pos["Liêm Trinh"]=addStar(b,pos["Tử Vi"]+4,"Liêm Trinh","chinh");
  pos["Thiên Đồng"]=addStar(b,pos["Tử Vi"]+7,"Thiên Đồng","chinh");
  pos["Vũ Khúc"]=addStar(b,pos["Tử Vi"]+8,"Vũ Khúc","chinh");
  pos["Thái Dương"]=addStar(b,pos["Tử Vi"]+9,"Thái Dương","chinh");
  pos["Thiên Cơ"]=addStar(b,pos["Tử Vi"]+11,"Thiên Cơ","chinh");

  pos["Thiên Phủ"]=addStar(b,wrap1(3+3-pos["Tử Vi"]),"Thiên Phủ","chinh");
  pos["Thái Âm"]=addStar(b,pos["Thiên Phủ"]+1,"Thái Âm","chinh");
  pos["Tham Lang"]=addStar(b,pos["Thiên Phủ"]+2,"Tham Lang","chinh");
  pos["Cự Môn"]=addStar(b,pos["Thiên Phủ"]+3,"Cự Môn","chinh");
  pos["Thiên Tướng"]=addStar(b,pos["Thiên Phủ"]+4,"Thiên Tướng","chinh");
  pos["Thiên Lương"]=addStar(b,pos["Thiên Phủ"]+5,"Thiên Lương","chinh");
  pos["Thất Sát"]=addStar(b,pos["Thiên Phủ"]+6,"Thất Sát","chinh");
  pos["Phá Quân"]=addStar(b,pos["Thiên Phủ"]+10,"Phá Quân","chinh");

  /* Vòng Lộc Tồn — chiều theo Âm/Dương + giới tính */
  const loc=LOC_TON[can];
  pos["Lộc Tồn"]=addStar(b,loc,"Lộc Tồn","can");
  const vongDir=polarityGenderDirection(can,gender);
  LOC_RING.forEach((s,i)=>{const p=addStar(b,loc+i*vongDir,s,"vong-loc");if(!(s in pos))pos[s]=p});

  /* Kình–Đà: dùng cùng một hàm quy tắc cho bản sinh và sao lưu để không lệch logic. */
  const kdSchool=document.querySelector("#kinhDaSchool")?.value||"thienluong";
  const kd=kinhDaPlacement(can,gender,kdSchool);
  pos["Kình Dương"]=addStar(b,kd.kinh,"Kình Dương","can");
  pos["Đà La"]=addStar(b,kd.da,"Đà La","can");

  /* Vòng Thái Tuế */
  THAI_TUE.forEach((s,i)=>{const p=addStar(b,chi+i,s,"vong-thai-tue");if(!(s in pos))pos[s]=p});
  pos["Thiên Không"]=addStar(b,chi+1,"Thiên Không","vong-thai-tue");
  pos["Nguyệt Đức"]=addStar(b,chi+5,"Nguyệt Đức","vong-thai-tue");
  pos["Thiên Đức"]=addStar(b,chi+9,"Thiên Đức","vong-thai-tue");

  /* Vòng Tràng Sinh — cách an thông thường: điểm khởi cố định theo Cục, Âm/Dương Nam Nữ chỉ đổi chiều. */
  const tsDir=trangSinhDirection(can,gender);
  const tsCheck=verifyTrangSinhPlacement(cuc.number,tsDir);
  const tsStart=tsCheck.start;
  TRANG_SINH.forEach((s,i)=>{
    const p=addStar(b,tsStart+i*tsDir,s,"trang-sinh");
    pos[s]=p;
  });

  /* Không Kiếp / Hỏa Linh */
  pos["Địa Kiếp"]=addStar(b,11+hourBranch,"Địa Kiếp","gio");
  pos["Địa Không"]=addStar(b,12+12-pos["Địa Kiếp"],"Địa Không","gio");
  const [hoa,linh]=findHoaLinh(chi,hourBranch,gender,can);
  pos["Hỏa Tinh"]=addStar(b,hoa,"Hỏa Tinh","nam-gio");
  pos["Linh Tinh"]=addStar(b,linh,"Linh Tinh","nam-gio");

  /* Sao đôi và phụ tinh */
  pos["Long Trì"]=addStar(b,5+chi-1,"Long Trì","nam");
  pos["Phượng Các"]=addStar(b,2+2-pos["Long Trì"],"Phượng Các","nam");
  pos["Giải Thần"]=addStar(b,pos["Phượng Các"],"Giải Thần","nam");

  pos["Tả Phụ"]=addStar(b,5+lm-1,"Tả Phụ","thang");
  pos["Hữu Bật"]=addStar(b,2+2-pos["Tả Phụ"],"Hữu Bật","thang");

  pos["Văn Khúc"]=addStar(b,5+hourBranch-1,"Văn Khúc","gio");
  pos["Văn Xương"]=addStar(b,2+2-pos["Văn Khúc"],"Văn Xương","gio");

  pos["Tam Thai"]=addStar(b,5+lm+ld-2,"Tam Thai","ngay");
  pos["Bát Tọa"]=addStar(b,2+2-pos["Tam Thai"],"Bát Tọa","ngay");
  pos["Ân Quang"]=addStar(b,pos["Văn Xương"]+ld-2,"Ân Quang","ngay-gio");
  pos["Thiên Quý"]=addStar(b,2+2-pos["Ân Quang"],"Thiên Quý","ngay-gio");

  pos["Thiên Khôi"]=addStar(b,findKhoi(can),"Thiên Khôi","can");
  pos["Thiên Việt"]=addStar(b,5+5-pos["Thiên Khôi"],"Thiên Việt","can");

  pos["Thiên Hư"]=addStar(b,7+chi-1,"Thiên Hư","nam");
  pos["Thiên Khốc"]=addStar(b,7-chi+1,"Thiên Khốc","nam");
  pos["Thiên Tài"]=addStar(b,menh+chi-1,"Thiên Tài","nam");
  pos["Thiên Thọ"]=addStar(b,than+chi-1,"Thiên Thọ","nam");
  pos["Hồng Loan"]=addStar(b,4-chi+1,"Hồng Loan","nam");
  pos["Thiên Hỷ"]=addStar(b,pos["Hồng Loan"]+6,"Thiên Hỷ","nam");

  const [quan,phuc]=findQuanPhuc(can);
  pos["Thiên Quan"]=addStar(b,quan,"Thiên Quan","can");
  pos["Thiên Phúc"]=addStar(b,phuc,"Thiên Phúc","can");

  pos["Thiên Hình"]=addStar(b,10+lm-1,"Thiên Hình","thang");
  pos["Thiên Riêu"]=addStar(b,pos["Thiên Hình"]+4,"Thiên Riêu","thang");
  pos["Thiên Y"]=addStar(b,pos["Thiên Riêu"],"Thiên Y","thang");

  pos["Cô Thần"]=addStar(b,findCoThan(chi),"Cô Thần","nam");
  pos["Quả Tú"]=addStar(b,pos["Cô Thần"]-4,"Quả Tú","nam");

  /* Quỹ đạo Lộc Tồn — LN Văn Tinh — Đường Phù — Quốc Ấn.
     LN Văn Tinh lấy trực tiếp theo Can, không lấy từ vị trí Kình. */
  pos["L.N. Văn Tinh"]=addStar(b,findLuuNienVanTinh(can),"L.N. Văn Tinh","can-thien-luong");
  pos["Đường Phù"]=addStar(b,pos["L.N. Văn Tinh"]+2,"Đường Phù","can-thien-luong");
  pos["Quốc Ấn"]=addStar(b,pos["Đường Phù"]+3,"Quốc Ấn","can-thien-luong");

  pos["Thai Phụ"]=addStar(b,pos["Văn Khúc"]+2,"Thai Phụ","gio");
  pos["Phong Cáo"]=addStar(b,pos["Văn Khúc"]-2,"Phong Cáo","gio");

  pos["Thiên Giải"]=addStar(b,9+lm-1,"Thiên Giải","thang");
  pos["Địa Giải"]=addStar(b,pos["Tả Phụ"]+3,"Địa Giải","thang");

  /* La–Võng theo Gia đình Thiên Lương (V3.3.70):
     Thiên La / Địa Võng KHÔNG phải hai sao độc lập cố định tại Thìn/Tuất.
     Chúng là tên gọi trạng thái của chính Đà La khi rơi vào:
       - Thìn (5)  => THIÊN LA
       - Tuất (11) => ĐỊA VÕNG
     Vì vậy chỉ lưu nhãn suy diễn theo vị trí Đà La; không addStar thêm lần nào. */
  /* Không ghi thêm key vào positions: positions chỉ lưu tọa độ sao thực. */
  pos["Thiên Thương"]=addStar(b,menh+5,"Thiên Thương","cung");
  pos["Thiên Sứ"]=addStar(b,menh+7,"Thiên Sứ","cung");

  pos["Thiên Mã"]=addStar(b,findThienMa(chi),"Thiên Mã","nam");
  pos["Hoa Cái"]=addStar(b,pos["Thiên Mã"]+2,"Hoa Cái","nam");
  pos["Kiếp Sát"]=addStar(b,pos["Thiên Mã"]+3,"Kiếp Sát","nam");
  pos["Đào Hoa"]=addStar(b,pos["Kiếp Sát"]+4,"Đào Hoa","nam");

  pos["Phá Toái"]=addStar(b,findPhaToai(chi),"Phá Toái","nam");
  pos["Đẩu Quân"]=addStar(b,chi-lm+hourBranch,"Đẩu Quân","nam-thang-gio");

  /* Tứ Hóa */
  const hosts=THIEN_LUONG_TU_HOA[can];
  ["Hóa Lộc","Hóa Quyền","Hóa Khoa","Hóa Kỵ"].forEach((s,i)=>{
    pos[s]=addStar(b,pos[hosts[i]],s,"tu-hoa");
  });

  /* Lưu Hà, Thiên Trù */
  const [luu,tru]=findLuuHaThienTru(can);
  pos["Lưu Hà"]=addStar(b,luu,"Lưu Hà","can");
  pos["Thiên Trù"]=addStar(b,tru,"Thiên Trù","can");

  /* Tuần / Triệt */
  const endTuan=wrap1(chi+10-can);
  mark.tuan=[wrap1(endTuan+1),wrap1(endTuan+2)];
  mark.triet=findTriet(can);

  /* Sau khi toàn bộ sao đã được tạo:
     1) Thiên Mã đổi hành theo địa bàn Dần/Tỵ/Thân/Hợi;
     2) các sao đới hành chọn hành theo Nạp âm bản Mệnh. */
  applyThienMaPositionElements(b);
  applyThienLuongDualElements(b,banMenh?.e);

  return {
    buckets:b,positions:pos,marks:mark,hoaHosts:hosts,vongDir,
    trangSinhDir:tsDir,
    trangSinhStart:tsStart,
    trangSinhDeVuong:tsCheck.deVuong,
    trangSinhMo:tsCheck.mo,
    trangSinhRuleLabel:tsCheck.directionLabel
  };
}

/* ======================== ĐẠI HẠN / RENDER DATA ======================== */
function distanceHouse(a,b,dir){
  return dir===1?mod(a-b,12):mod(b-a,12);
}
function decadeAt(branch,menh,cuc,gender,chiNam){
  const dir=genderSign(gender)*branchYang(chiNam);
  return cuc.number+distanceHouse(branch,menh,dir)*10;
}

/* Lưu Đại Hạn / Lưu niên Đại Hạn.
   n=0: cung gốc Đại Hạn
   n=1: cung xung chiếu
   n=2: từ xung chiếu lệch một cung theo quy tắc âm-dương/giới tính
   n>=3: trở lại xung chiếu rồi tiến dần theo chiều tương ứng. */
function luuDaiHanBranch(daiBranch,daiStartAge,age,canNam,gender){
  if(!daiBranch || daiStartAge==null)return null;
  const n=age-daiStartAge;
  if(n<0 || n>9)return null;
  if(n===0)return daiBranch;

  const opposite=wrap1(daiBranch+6);
  if(n===1)return opposite;

  const dir=polarityGenderDirection(canNam,gender); // +1 Dương Nam/Âm Nữ; -1 Âm Nam/Dương Nữ
  if(n===2)return wrap1(opposite-dir);
  return wrap1(opposite + dir*(n-3));
}
function elementClass(e){return "el-"+(e||"T")}

/* Ngũ Hành của bốn tam hợp địa chi.
   Hợi–Mão–Mùi: Mộc; Dần–Ngọ–Tuất: Hỏa;
   Thân–Tý–Thìn: Thủy; Tỵ–Dậu–Sửu: Kim. */
function tamHopElement(branch){
  if([12,4,8].includes(branch))return "M";
  if([3,7,11].includes(branch))return "H";
  if([9,1,5].includes(branch))return "T";
  return "K";
}
function tamHopColor(branch){
  const e=tamHopElement(branch);
  return ({M:"#2d9b37",H:"#e32b2b",T:"#17191c",K:"#777b7f"})[e];
}
function tuChinhColor(branch){
  const e=tamHopElement(branch);
  // Cùng hệ màu nhưng đậm hơn để đường Mệnh–Thiên Di dễ quan sát.
  return ({M:"#176a24",H:"#a81515",T:"#050607",K:"#4f5357"})[e];
}
function tamHopName(branch){
  const e=tamHopElement(branch);
  return ({M:"HỢI–MÃO–MÙI • MỘC",H:"DẦN–NGỌ–TUẤT • HỎA",T:"THÂN–TÝ–THÌN • THỦY",K:"TỴ–DẬU–SỬU • KIM"})[e];
}
function stemElement(stem){
  if(stem<=2)return "M";if(stem<=4)return "H";if(stem<=6)return "O";if(stem<=8)return "K";return "T";
}
function branchElement(branch){
  if([1,12].includes(branch))return "T";
  if([3,4].includes(branch))return "M";
  if([6,7].includes(branch))return "H";
  if([9,10].includes(branch))return "K";
  return "O";
}

function branchElementName(branch){
  return ({T:"THỦY",M:"MỘC",H:"HỎA",K:"KIM",O:"THỔ"})[branchElement(branch)];
}

/* V3.3.70 — ĐÁNH GIÁ QUAN HỆ THIÊN CAN–ĐỊA CHI NĂM SINH.
   Theo nghiệm lý Thiên Lương, 5 bậc từ thuận lợi đến nghịch cảnh:
   1) Can sinh Chi; 2) Can–Chi đồng hành; 3) Chi sinh Can;
   4) Can khắc Chi; 5) Chi khắc Can. */
const NGU_HANH_SINH=Object.freeze({M:"H",H:"O",O:"K",K:"T",T:"M"});
const NGU_HANH_KHAC=Object.freeze({M:"O",O:"T",T:"H",H:"K",K:"M"});
const CAN_CHI_GRADE=Object.freeze({
  1:Object.freeze({label:"CAN SINH CHI",grade:"Bậc 1/5 · tốt nhất",meaning:"Phúc đức lớn, tiềm tàng căn bản hơn người"}),
  2:Object.freeze({label:"CAN CHI ĐỒNG HÀNH",grade:"Bậc 2/5 · vững",meaning:"Năng lực khá đầy đủ, nền tảng vững chắc"}),
  3:Object.freeze({label:"CHI SINH CAN",grade:"Bậc 3/5 · thuận",meaning:"Đời gặp may nhiều hơn thực lực"}),
  4:Object.freeze({label:"CAN KHẮC CHI",grade:"Bậc 4/5 · trở lực",meaning:"Đời thường gặp nhiều trở lực"}),
  5:Object.freeze({label:"CHI KHẮC CAN",grade:"Bậc 5/5 · nghịch",meaning:"Nghịch cảnh thường nhiều và gay gắt"})
});
function canChiRelation(stem,branch){
  const canE=stemElement(stem),chiE=branchElement(branch);
  let rank;
  if(canE===chiE)rank=2;
  else if(NGU_HANH_SINH[canE]===chiE)rank=1;
  else if(NGU_HANH_SINH[chiE]===canE)rank=3;
  else if(NGU_HANH_KHAC[canE]===chiE)rank=4;
  else if(NGU_HANH_KHAC[chiE]===canE)rank=5;
  else rank=5; // phòng vệ: với Ngũ Hành chuẩn nhánh này không xảy ra.
  const meta=CAN_CHI_GRADE[rank];
  return {
    rank,...meta,
    canElement:canE,chiElement:chiE,
    canElementName:ELEMENT_LABEL[canE],
    chiElementName:ELEMENT_LABEL[chiE]
  };
}
function auditCanChiRelation(){
  const errors=[];
  const tests=[
    [1,7,1,"Giáp Ngọ"],   // Mộc sinh Hỏa
    [1,3,2,"Giáp Dần"],  // Mộc đồng Mộc
    [1,1,3,"Giáp Tý"],   // Thủy sinh Mộc
    [1,5,4,"Giáp Thìn"], // Mộc khắc Thổ
    [1,9,5,"Giáp Thân"]  // Kim khắc Mộc
  ];
  tests.forEach(([can,chi,rank,label])=>{
    if(canChiRelation(can,chi).rank!==rank)errors.push(`${label}: sai bậc Can–Chi`);
  });
  return {ok:errors.length===0,errors};
}
function auditHouseCanByNguHoDon(){
  const errors=[];
  let caseCount=0;
  for(let canNam=1;canNam<=10;canNam++){
    let stemDan=(canNam*2+1)%10;if(stemDan===0)stemDan=10;
    for(let step=0;step<12;step++){
      const branch=wrap1(3+step);
      const expected=wrap10(stemDan+step);
      const got=houseCan(branch,canNam);
      caseCount++;
      if(got!==expected){
        errors.push(`Ngũ Hổ Độn ${CAN[canNam]} năm sinh • ${CHI[branch]} cung: phải là ${CAN[expected]} nhưng đang ra ${CAN[got]}`);
      }
    }
    const tyExpected=wrap10(stemDan+10),suuExpected=wrap10(stemDan+11);
    const tyGot=houseCan(1,canNam),suuGot=houseCan(2,canNam);
    if(tyGot!==tyExpected)errors.push(`Cung Tý của năm ${CAN[canNam]}: phải là ${CAN[tyExpected]} Tý, đang ra ${CAN[tyGot]} Tý`);
    if(suuGot!==suuExpected)errors.push(`Cung Sửu của năm ${CAN[canNam]}: phải là ${CAN[suuExpected]} Sửu, đang ra ${CAN[suuGot]} Sửu`);
  }
  return {ok:errors.length===0,errors,caseCount};
}

function auditHistoricalYearSupport(){
  const errors=[];
  const caseCount=5;
  if(normalizeCivilYear(223,2026)!==223)errors.push("Năm xem 223 bị ép sang mốc hiện đại");
  if(223-181+1!==43)errors.push("Tuổi năm 181→223 phải là 43 theo tuổi mụ năm");
  if(!validSolarDate(15,5,181))errors.push("Ngày lịch sử 15/05/181 bị từ chối");
  const l=solarToLunar(15,5,181,7);
  const s=lunarToSolar(l.day,l.month,l.year,l.leap,7);
  if(!s||s.day!==15||s.month!==5||s.year!==181)errors.push("Ca 181 không round-trip dương↔âm");
  if(!Number.isFinite(lunarDeltaTSeconds(181))||!Number.isFinite(lunarDeltaTSeconds(223)))errors.push("ΔT cổ đại không hữu hạn");
  return {ok:errors.length===0,errors,caseCount};
}

/* V3.3.91 — PHÂN LOẠI GIỜ SINH THEO CÁC BẢNG DÂN GIAN/TỬ VI CỔ.
   Chỉ dùng để hiển thị khi bật “Đầy đủ lưu niên”.
   Quy ước Quan Sát chọn bảng thường được dẫn theo Tử Vi Đẩu Số Tân Biên /
   Tử Vi Ảo Bí: tháng 1=Tỵ, 2=Ngọ, ... 12=Thìn.
   Tháng nhuận: ngày 1–15 tính tháng chính; ngày 16–30 tính sang tháng kế. */
const QUAN_SAT_BY_LUNAR_MONTH=Object.freeze([null,6,7,8,9,10,11,12,1,2,3,4,5]);
const TUONG_QUAN_BY_SEASON=Object.freeze([
  Object.freeze([5,11,10]),  // Xuân: Thìn, Tuất, Dậu
  Object.freeze([1,4,8]),    // Hạ: Tý, Mão, Mùi
  Object.freeze([3,7,2]),    // Thu: Dần, Ngọ, Sửu
  Object.freeze([9,6,12])    // Đông: Thân, Tỵ, Hợi
]);
const DIEM_VUONG_BY_SEASON=Object.freeze([
  Object.freeze([2,8]),      // Xuân: Sửu, Mùi
  Object.freeze([5,11]),     // Hạ: Thìn, Tuất
  Object.freeze([1,7]),      // Thu: Tý, Ngọ
  Object.freeze([4,10])      // Đông: Mão, Dậu
]);
const DA_DE_BY_SEASON=Object.freeze([
  Object.freeze([7]),        // Xuân: Ngọ
  Object.freeze([10]),       // Hạ: Dậu
  Object.freeze([1]),        // Thu: Tý
  Object.freeze([4])         // Đông: Mão
]);
function traditionalHourMonth(lunar){
  let m=lunar.month;
  if(lunar.leap && lunar.day>=16)m=mod(m,12)+1;
  return m;
}
function lunarSeasonIndex(month){
  return Math.floor((month-1)/3); // 0 Xuân, 1 Hạ, 2 Thu, 3 Đông
}
function kimXaPalace(yearBranch,lunarMonth,lunarDay,hourBranch){
  // Khởi năm Tý tại Tuất, năm thuận; tháng nghịch; ngày thuận; giờ nghịch.
  let p=mod(11-1 + (yearBranch-1),12)+1;
  p=mod(p-1 - (lunarMonth-1),12)+1;
  p=mod(p-1 + (lunarDay-1),12)+1;
  p=mod(p-1 - (hourBranch-1),12)+1;
  return p;
}
function birthHourEvaluation(lunar,yearBranch,hourBranch,gender){
  const month=traditionalHourMonth(lunar);
  const season=lunarSeasonIndex(month);
  const violations=[];
  if(QUAN_SAT_BY_LUNAR_MONTH[month]===hourBranch)violations.push("Quan Sát");
  if(TUONG_QUAN_BY_SEASON[season].includes(hourBranch))violations.push("Tướng Quân");
  if(DIEM_VUONG_BY_SEASON[season].includes(hourBranch))violations.push("Diêm Vương");
  if(DA_DE_BY_SEASON[season].includes(hourBranch))violations.push("Dạ Đề");

  const kxPalace=kimXaPalace(yearBranch,month,lunar.day,hourBranch);
  const kimXa=(gender==="Nam") ? [5,11].includes(kxPalace) : [2,8].includes(kxPalace);
  if(kimXa)violations.push("Kim Xà Thiết Tỏa");

  return {
    month,season,hourBranch,kimXaPalace:kxPalace,violations,
    clear:violations.length===0,
    label:violations.length ? violations.join(" • ") : "Không phạm giờ"
  };
}
function auditBirthHourEvaluation(){
  const errors=[];
  const has=(r,name)=>r.violations.includes(name);
  let r=birthHourEvaluation({month:1,day:1,leap:0},1,6,"Nam");
  if(!has(r,"Quan Sát"))errors.push("Giờ Quan Sát tháng 1/Tỵ");
  r=birthHourEvaluation({month:4,day:1,leap:0},1,1,"Nam");
  if(!has(r,"Tướng Quân"))errors.push("Giờ Tướng Quân mùa Hạ/Tý");
  r=birthHourEvaluation({month:7,day:1,leap:0},1,7,"Nam");
  if(!has(r,"Diêm Vương"))errors.push("Giờ Diêm Vương mùa Thu/Ngọ");
  r=birthHourEvaluation({month:9,day:1,leap:0},1,1,"Nam");
  if(!has(r,"Dạ Đề"))errors.push("Giờ Dạ Đề mùa Thu/Tý");
  r=birthHourEvaluation({month:9,day:3,leap:0},4,7,"Nữ");
  if(!has(r,"Kim Xà Thiết Tỏa") || r.kimXaPalace!==2)errors.push("Kim Xà mẫu Mão tháng 9 ngày 3 giờ Ngọ nữ");
  r=birthHourEvaluation({month:7,day:27,leap:0},7,11,"Nữ");
  if(!r.clear)errors.push("Mẫu 27/07 Bính Ngọ giờ Tuất nữ phải không phạm");
  return {ok:errors.length===0,errors};
}
function branchPalette(branch){
  const e=branchElement(branch);
  return {
    M:{bg:"#eaf7ec",accent:"#2d9b37"},
    H:{bg:"#fff0f0",accent:"#e32b2b"},
    T:{bg:"#dff1ff",accent:"#0f5f9c"},
    K:{bg:"#f1f2f3",accent:"#777b7f"},
    O:{bg:"#fff6df",accent:"#d59418"}
  }[e];
}

function stableExportColorsEnabled(){
  const el=document.querySelector("#stableExportColors");
  return !el || el.checked;
}

function applyStableExportColors(root){
  if(!root || !stableExportColorsEnabled())return;

  root.classList.add("stable-export-colors");

  root.querySelectorAll(".palace.an-menh,.palace.an-than").forEach(p=>{
    const branch=Number(p.dataset.branch);
    if(!branch)return;
    const pal=branchPalette(branch);

    /* Gán trực tiếp literal values — tuyệt đối không phụ thuộc CSS variables. */
    p.style.setProperty("background",pal.bg,"important");
    p.style.setProperty("background-color",pal.bg,"important");
    p.style.setProperty("background-image","none","important");
    p.style.setProperty("box-shadow","none","important");
    p.style.setProperty("filter","none","important");
    p.style.setProperty("-webkit-filter","none","important");
    p.style.setProperty("mix-blend-mode","normal","important");
    p.style.setProperty("background-blend-mode","normal","important");
    p.style.setProperty("opacity","1","important");
    p.style.setProperty("box-sizing","border-box","important");
    p.style.setProperty("border",`4px solid ${pal.accent}`,"important");
    p.style.setProperty("--branch-bg",pal.bg,"important");
    p.style.setProperty("--branch-accent",pal.accent,"important");
  });
}

function applyStablePalaceHighlightStyles(root){
  if(!root)return;
  root.querySelectorAll('.palace.phi-target-active').forEach(p=>{
    p.style.setProperty('box-shadow','none','important');
    p.style.setProperty('outline','3px solid rgba(33,69,116,.18)','important');
    p.style.setProperty('outline-offset','-3px','important');
  });
  root.querySelectorAll('.palace.north-lai-active').forEach(p=>{
    p.style.setProperty('box-shadow','none','important');
    p.style.setProperty('outline','2px solid rgba(105,64,141,.45)','important');
    p.style.setProperty('outline-offset','-2px','important');
  });
  root.querySelectorAll('.palace.north-chain-active').forEach(p=>{
    p.style.setProperty('box-shadow','none','important');
    p.style.setProperty('outline','2px solid rgba(103,64,138,.28)','important');
    p.style.setProperty('outline-offset','-2px','important');
  });
  root.querySelectorAll('.palace.north-ky-xung-active').forEach(p=>{
    p.style.setProperty('box-shadow','none','important');
    p.style.setProperty('outline','3px dashed rgba(139,31,45,.55)','important');
    p.style.setProperty('outline-offset','-9px','important');
  });
  root.querySelectorAll('.palace.phi-source-active').forEach(p=>{
    p.style.setProperty('box-shadow','none','important');
    p.style.setProperty('outline','4px solid rgba(33,69,116,.55)','important');
    p.style.setProperty('outline-offset','-4px','important');
  });
}

function applyStableColorsToHtml2CanvasClone(clonedDoc){
  const paper=clonedDoc.querySelector(".paper");
  if(!paper)return;
  if(stableExportColorsEnabled())applyStableExportColors(paper);
  applyStablePalaceHighlightStyles(paper);
}

/* Chủ Mệnh theo địa chi nơi an Mệnh. */
const CHU_MENH_BY_BRANCH={
  1:"Tham Lang",2:"Cự Môn",3:"Lộc Tồn",4:"Văn Khúc",
  5:"Liêm Trinh",6:"Vũ Khúc",7:"Phá Quân",8:"Vũ Khúc",
  9:"Liêm Trinh",10:"Văn Khúc",11:"Lộc Tồn",12:"Cự Môn"
};

/* Chủ Thân theo địa chi năm sinh. */
const CHU_THAN_BY_YEAR_BRANCH={
  1:"Hỏa Tinh",2:"Thiên Tướng",3:"Thiên Lương",4:"Thiên Đồng",
  5:"Văn Xương",6:"Thiên Cơ",7:"Linh Tinh",8:"Thiên Tướng",
  9:"Thiên Lương",10:"Thiên Đồng",11:"Văn Xương",12:"Thiên Cơ"
};
function chuMenh(menhBranch){return CHU_MENH_BY_BRANCH[menhBranch]||"—"}
function chuThan(yearBranch){return CHU_THAN_BY_YEAR_BRANCH[yearBranch]||"—"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmt2(n){return String(n).padStart(2,"0")}
function displayStar(s,suffixHtml=""){
  /* V3.3.70 — khóa tên sao + trạng thái thành một token không tách dòng.
     Thiên La / Địa Võng chỉ là NHÃN TRẠNG THÁI của Đà La theo vị trí,
     không tồn tại như một sao độc lập trong buckets. */
  const st=s.status?`<span class="status">(${s.status})</span>`:"";
  const laVong = s.name==="Đà La" && s.pos===5
    ? `<span class="la-vong-label">THIÊN LA</span>`
    : (s.name==="Đà La" && s.pos===11 ? `<span class="la-vong-label">ĐỊA VÕNG</span>` : "");
  const longClass=(String(s.name).length>=12 || (s.status && String(s.name).length>=10) || !!laVong)?" star-token-long":"";
  const dualAttrs=s.elementByMenh
    ? ` data-star-dual-element="1" data-star-base-element="${escapeHtml(s.baseElement||"")}" data-star-secondary-element="${escapeHtml(s.secondaryElement||"")}" data-star-unused-element="${escapeHtml(s.unusedElement||"")}" data-star-menh-element="${escapeHtml(s.menhElement||"")}" data-star-element-reason="${escapeHtml(s.elementUseReason||"")}"`
    : "";
  const master=starMasterMeta(s.name),nature=master.nature,side=master.displaySide;
  return `<span class="${elementClass(s.e)} star-token${longClass}" data-star-help="${escapeHtml(s.name)}" data-star-display="${escapeHtml(s.name)}" data-star-element="${escapeHtml(s.e||"")}" data-star-status="${escapeHtml(s.status||"")}" data-star-display-side="${side}" data-star-nature-label="${escapeHtml(nature.label)}" data-star-nature-note="${escapeHtml(nature.note)}"${dualAttrs}><span class="star-name">${escapeHtml(s.name)}</span>${st}${laVong}${suffixHtml}</span>`;
}

function renderMinorStarHtml(s,branch,c){
  const focus=isThaiTueFocusStar(s,branch,c);
  const tuLoc=isTuLocStar(s);
  const key=keyStarFocusInfo(s,c);
  const locFocus=locCanFocusInfo(s,c);
  const maInfo=thienMaUseInfo(s,c);
  const titles=[];
  if(focus)titles.push(`Vòng Thái Tuế trọng điểm tại ${thaiTueFocusRole(branch,c).join(" + ")}`);
  if(tuLoc)titles.push("Tứ Lộc Thiên Lương");
  if(locFocus.focus)titles.push(locFocus.note);
  if(key.focus){
    titles.push(`Sao trọng điểm theo ${key.reasons.join(" và ")}${key.strong?" (Can và Mệnh cùng ứng)":""}`);
  }
  const dualTitle=dualElementTitle(s,c);
  if(dualTitle)titles.push(dualTitle);
  const maPosTitle=thienMaPositionTitle(s);
  if(maPosTitle)titles.push(maPosTitle);
  if(maInfo?.note)titles.push(maInfo.note);
  const classes=["minor-star"];
  if(focus)classes.push("thai-tue-focus");
  if(tuLoc)classes.push("tu-loc-star");
  if(locFocus.focus)classes.push("loc-can-focus");
  if(locFocus.strong)classes.push("loc-can-strong");
  if(key.focus)classes.push("key-star-focus");
  if(key.strong)classes.push("key-star-strong");
  if(maInfo?.className)classes.push(maInfo.className);
  const maLabel=maInfo?`<span class="ma-use-label" aria-hidden="true">${escapeHtml(maInfo.short)}</span>`:"";
  const marker=key.focus?'<span class="key-star-marker" aria-hidden="true">*</span>':'';
  return `<div class="${classes.join(" ")}" data-context-note="${escapeHtml(titles.join(" • "))}">${displayStar(s,maLabel+marker)}</div>`;
}
function voidInnerAnchor(pair){
  const key=[...pair].sort((a,b)=>a-b).join("-");
  /* Bố trí theo hình mẫu Thiên Lương:
     - Cặp có biên đứng ở hàng trên/dưới (Tý–Sửu, Ngọ–Mùi):
       đặt nhãn tại đầu biên sát tâm bàn.
     - Cặp có biên ngang ở hai cột ngoài:
       đặt nhãn giữa chính cạnh chung của hai cung.
     Nhờ vậy Triệt Thân–Dậu không còn nằm tại giao điểm Mùi–Thân–Dậu. */
  const map={
    "1-2": {x:50,y:75},       // Tý–Sửu
    "3-4": {x:12.5,y:75},     // Dần–Mão
    "5-6": {x:12.5,y:25},     // Thìn–Tỵ
    "7-8": {x:50,y:25},       // Ngọ–Mùi
    "9-10":{x:87.5,y:25},     // Thân–Dậu
    "11-12":{x:87.5,y:75}     // Tuất–Hợi
  };
  return map[key]||null;
}

function sameVoidPair(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2)return false;
  const aa=[...a].sort((x,y)=>x-y);
  const bb=[...b].sort((x,y)=>x-y);
  return aa[0]===bb[0] && aa[1]===bb[1];
}

function createVoidLabel(chart,pair,label,offsetX=0,offsetY=0,stacked=false){
  const g=voidInnerAnchor(pair);
  if(!g)return null;

  const el=document.createElement("div");
  el.className="void-label";
  if(stacked)el.classList.add("void-stacked");
  if(label==="TUẦN")el.classList.add("void-tuan");
  if(label==="TRIỆT")el.classList.add("void-triet");
  if(label==="TUẦN - TRIỆT")el.classList.add("void-combined");

  el.textContent=label;
  /* V3.3.112: Không dùng title native cho nhãn Tuần/Triệt.
     Popup nghiệm lý đã hiển thị trực tiếp khi hover/chạm; title của trình duyệt
     sẽ tạo thêm một tooltip nhỏ chồng lên lá số và gây rối giao diện. */
  el.dataset.chartHelp="void";
  el.dataset.voidKind=label;
  el.dataset.voidPair=pair.join(",");
  el.setAttribute("role","button");
  el.setAttribute("aria-label",`${label} tại ${CHI[pair[0]]} – ${CHI[pair[1]]}: mở giải thích Tuần Triệt`);

  el.style.left=offsetX
    ? `calc(${g.x}% + ${offsetX}px)`
    : g.x+"%";
  el.style.top=offsetY
    ? `calc(${g.y}% + ${offsetY}px)`
    : g.y+"%";

  chart.appendChild(el);
  return el;
}

/* Vẽ Tuần/Triệt.
   Nếu Tuần và Triệt cùng án đúng một cặp địa chi, ghép thành MỘT nhãn đen
   “TUẦN - TRIỆT” nằm giữa đường biên chung, theo bố cục lá số thông dụng.
   Nếu khác cặp, giữ hai nhãn riêng như bình thường. */
function createVoidLabels(chart,trietPair,tuanPair){
  if(sameVoidPair(trietPair,tuanPair)){
    const both=createVoidLabel(chart,tuanPair,"TUẦN - TRIỆT",0,-1,true);
    if(both){
      both.classList.add("void-paired","void-combined");
      both.setAttribute("aria-label",`Tuần và Triệt cùng án tại ${CHI[tuanPair[0]]} – ${CHI[tuanPair[1]]}: mở giải thích Tuần Triệt`);
    }
    return;
  }

  createVoidLabel(chart,trietPair,"TRIỆT");
  createVoidLabel(chart,tuanPair,"TUẦN");
}

/* ================== HIỆU CHỈNH GIỜ MIỀN NAM VIỆT NAM ==================
   Dùng giờ sinh được ghi theo đồng hồ địa phương, rồi lùi lại số giờ mà
   đồng hồ dân sự đã được chỉnh nhanh trong từng giai đoạn. Việc hiệu chỉnh
   chỉ dùng để xác định giờ Tử Vi; ngày sinh dương/âm vẫn giữ theo ngày nhập. */
function ymdKey(y,m,d){return y*10000+m*100+d}
function southVietnamClockAdvanceHours(solar){
  const k=ymdKey(solar.year,solar.month,solar.day);
  if(k>=19420101 && k<=19440308)return 1;
  if(k>=19440309 && k<=19450901)return 2;
  if(k>=19450902 && k<=19461218)return 0;
  if(k>=19461219 && k<=19550630)return 1;
  if(k>=19550701 && k<=19591231)return 0;
  if(k>=19600101 && k<=19750430)return 1;
  return 0;
}
function historicalBirthTimeAdjustment(solar,hour,minute){
  const enabled=Boolean(document.querySelector("#southVietnamHistorical")?.checked);
  const advance=enabled?southVietnamClockAdvanceHours(solar):0;
  const calcHour=mod(hour-advance,24);
  return {enabled,advance,calcHour,calcMinute:minute};
}
function updateSouthVietnamTimeNote(){
  const note=document.querySelector("#southVietnamTimeNote");
  if(!note)return;
  const enabled=Boolean(document.querySelector("#southVietnamHistorical")?.checked);
  if(!enabled){
    note.classList.remove("active");
    note.textContent="Bật lựa chọn này để tự động hiệu chỉnh giờ sinh theo các giai đoạn thay đổi giờ tại miền Nam Việt Nam.";
    return;
  }
  const d=Number(document.querySelector("#birthDay")?.value);
  const m=Number(document.querySelector("#birthMonth")?.value);
  const y=Number(document.querySelector("#birthYear")?.value);
  const hour=Math.max(0,Math.min(23,Number(document.querySelector("#hour")?.value)||0));
  const minute=Math.max(0,Math.min(59,Number(document.querySelector("#minute")?.value)||0));
  const type=document.querySelector("#calendarType")?.value;
  note.classList.add("active");
  if(type!=="solar" || !validSolarDate(d,m,y)){
    note.textContent="Hiệu chỉnh miền Nam đang bật. Khi lập lá số, chương trình sẽ quy đổi ngày âm sang ngày dương trước rồi tự xác định mức hiệu chỉnh giờ.";
    return;
  }
  const advance=southVietnamClockAdvanceHours({day:d,month:m,year:y});
  const calcHour=mod(hour-advance,24);
  note.textContent=advance>0
    ? `Hiệu chỉnh lịch sử: đồng hồ thời kỳ này nhanh ${advance} giờ → giờ dùng để an sao ${fmt2(calcHour)}:${fmt2(minute)} (giờ nhập ${fmt2(hour)}:${fmt2(minute)}).`
    : `Thời điểm này không cần lùi giờ theo bảng miền Nam → giờ dùng để an sao ${fmt2(hour)}:${fmt2(minute)}.`;
}

function validSolarDate(d,m,y){
  if(!Number.isInteger(d)||!Number.isInteger(m)||!Number.isInteger(y))return false;
  if(y<1||y>9999||m<1||m>12||d<1)return false;
  const gregorian=(y>1582)||(y===1582&&(m>10||(m===10&&d>=15)));
  const leap=gregorian ? (y%4===0&&(y%100!==0||y%400===0)) : (y%4===0);
  const mdays=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  return d<=mdays[m-1];
}
function resolveInput(){
  const tz=Number(document.querySelector("#tz").value);
  const d=Number(document.querySelector("#birthDay").value);
  const m=Number(document.querySelector("#birthMonth").value);
  const y=Number(document.querySelector("#birthYear").value);
  if(!d||!m||!y)throw new Error("Vui lòng nhập đủ Ngày – Tháng – Năm sinh.");
  if(!Number.isInteger(y)||y<1||y>9999)throw new Error("Năm sinh phải nằm trong khoảng 1–9999 (Công nguyên).");
  if(m<1||m>12)throw new Error("Tháng sinh phải nằm trong khoảng 1–12.");
  const type=document.querySelector("#calendarType").value;
  let solar,lunar;
  if(type==="solar"){
    if(!validSolarDate(d,m,y))throw new Error("Ngày dương lịch không hợp lệ. Kiểm tra lại thứ tự Ngày – Tháng – Năm.");
    solar={day:d,month:m,year:y};
    lunar=solarToLunar(d,m,y,tz);
  }else{
    if(d<1||d>30)throw new Error("Ngày âm lịch phải nằm trong khoảng 1–30.");
    lunar={day:d,month:m,year:y,leap:document.querySelector("#lunarLeap").checked?1:0};
    solar=lunarToSolar(d,m,y,lunar.leap,tz);
    if(!solar)throw new Error("Ngày âm lịch hoặc tháng nhuận không hợp lệ.");
  }
  return {solar,lunar,tz,type};
}

function computeChart(){
  const name=document.querySelector("#name").value.trim()||"—";
  const gender=document.querySelector("#gender").value;
  const hour=Math.max(0,Math.min(23,Number(document.querySelector("#hour").value)||0));
  const minute=Math.max(0,Math.min(59,Number(document.querySelector("#minute").value)||0));
  const {solar,lunar,tz,type}=resolveInput();

  const canNam=yearStem(lunar.year),chiNam=yearBranch(lunar.year);
  const dcc=dayStemBranch(solar.day,solar.month,solar.year);
  const historicalTime=historicalBirthTimeAdjustment(solar,hour,minute);
  const hb=hourBranchFrom24(historicalTime.calcHour),hc=hourStem(dcc.stem,hb);
  const mc=lunarMonthCanChi(lunar.month,canNam);
  const mt=menhThan(lunar.month,hb);
  const cuc=findCuc(mt.menh,canNam);
  const banMenh=napAm(canNam,chiNam);
  const starEngine=buildStars({
    ld:lunar.day,lm:lunar.month,ly:lunar.year,hourBranch:hb,gender,
    menh:mt.menh,than:mt.than,cuc,banMenh
  });

  const viewYear=normalizeCivilYear(document.querySelector("#viewYear").value,new Date().getFullYear());
  const annualMode=document.querySelector("#annualMode").value;
  // V3.3.145: Rule Registry phải được resolve tại runtime trước khi dựng phiBase.
  // Chế độ Bắc Phái dùng rule set riêng; các chế độ khác mặc định dùng engine Phi Tứ Hóa khi dựng lớp Phi ẩn.
  const phiRules=annualMode==="bacphai"?SYSTEM_RULE_REGISTRY.bacphai:SYSTEM_RULE_REGISTRY.phi;
  const phiLayer=document.querySelector("#phiLayer")?.value||"natal";
  const viewLunarMonth=Math.max(1,Math.min(12,Number(document.querySelector("#viewLunarMonth")?.value)||1));
  const showGoodDays=annualMode==="full" && Boolean(document.querySelector("#showGoodDays")?.checked);
  const ageAtView=viewYear-lunar.year+1; // Tuổi âm/mụ phải tính theo năm âm lịch của ngày sinh, đặc biệt ca sinh trước Tết có lunar.year !== solar.year.
  let daiBranch=null,daiStartAge=null;
  for(let br=1;br<=12;br++){
    const start=decadeAt(br,mt.menh,cuc,gender,chiNam); // Hệ Thiên Lương / chế độ vận hạn thường.
    if(ageAtView>=start && ageAtView<=start+9){
      daiBranch=br;
      daiStartAge=start;
      break;
    }
  }
  const luuDaiBranch=luuDaiHanBranch(daiBranch,daiStartAge,ageAtView,canNam,gender);
  const viewChi=yearBranch(viewYear);
  const tieuRing=tieuHanRing(chiNam,canNam,gender);
  const tieuBranch=tieuHanBranch(chiNam,viewChi,canNam,gender); // Tiểu Hạn Thiên Lương.

  // V3.3.145: vận hạn dùng riêng cho Phi Tứ Hóa / Tứ Hóa Bắc Phái.
  let phiDaiBranch=null,phiDaiStartAge=null;
  for(let br=1;br<=12;br++){
    const start=phiDecadeAt(br,mt.menh,cuc,gender,canNam);
    if(ageAtView>=start && ageAtView<=start+9){phiDaiBranch=br;phiDaiStartAge=start;break;}
  }
  const phiTieuBranch=phiTieuHanBranch(chiNam,viewChi,gender);
  const annualMonths=annualLunarMonths(
    viewYear,tieuBranch,lunar.month,hb,starEngine.positions
  );
  const annual=annualStarLayer(viewYear,starEngine.positions,gender);
  const phiBase={canNam,menh:mt.menh,positions:starEngine.positions,viewYear,phiDaiBranch,phiDaiStartAge,phiTieuBranch,daiBranch:phiDaiBranch,daiStartAge:phiDaiStartAge,tieuBranch:phiTieuBranch,phiRuleSet:phiRules.id};
  const phiTuHoa=buildPhiTuHoaMap(phiBase);
  const phiView=buildPhiLayerView(phiLayer,phiBase,phiTuHoa);
  const goodDays=annualGoodDaysForMonth(
    viewYear,viewLunarMonth,tz,annualMonths,starEngine.positions,chiNam
  );
  const kinhDaSchool=document.querySelector("#kinhDaSchool").value;

  return {
    name,gender,hour,minute,tz,type,solar,lunar,historicalTime,
    calcHour:historicalTime.calcHour,calcMinute:historicalTime.calcMinute,
    canNam,chiNam,dayCC:dcc,hourCC:{stem:hc,branch:hb},monthCC:mc,
    menh:mt.menh,than:mt.than,cuc,banMenh,...starEngine,
    viewYear,annualMode,phiLayer,phiView,viewLunarMonth,showGoodDays,goodDays,ageAtView,daiBranch,daiStartAge,luuDaiBranch,
    tieuBranch,tieuRing,phiDaiBranch,phiDaiStartAge,phiTieuBranch,phiRuleSet:phiRules.id,annualMonths,annual,phiTuHoa,kinhDaSchool,
    amDuongThuanLy:amDuongThuanLy(canNam,mt.menh),
    canChiRelation:canChiRelation(canNam,chiNam),
    birthHourEval:birthHourEvaluation(lunar,chiNam,hb,gender),
    chuMenh:chuMenh(mt.menh),
    chuThan:chuThan(chiNam),
    saoAtChu:saoAtChu(canNam),
    atChuBranch:starEngine.positions[saoAtChu(canNam)]||null,
    tuHoaSchool:"Thiên Lương"
  };
}


function setExportStatus(message,type=""){
  const el=document.querySelector("#exportStatus");
  if(!el)return;
  el.textContent=message||"";
  el.className="export-status"+(type?" "+type:"");
}

function safeFileName(){
  return (document.querySelector("#name").value.trim()||"la-so-tu-vi")
    .replace(/[\\/:*?"<>|]+/g,"_")
    .replace(/\s+/g,"_");
}

/* V3.3.102 — TÊN FILE XUẤT THEO ĐƯƠNG SỐ
   Mẫu: Dieu Thuyen _ 09.10.1982 03h30 TVTL
   Ngày trong tên file luôn dùng DƯƠNG LỊCH sau khi quy đổi, kể cả khi
   người dùng nhập ngày âm lịch. Tên được bỏ dấu để tương thích Windows. */
function exportPersonNameAscii(){
  const raw=(document.querySelector("#name")?.value||"La So").trim()||"La So";
  return raw
    .replace(/Đ/g,"D").replace(/đ/g,"d")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[\\/:*?"<>|]+/g," ")
    .replace(/\s+/g," ").trim();
}

function exportBaseFileName(){
  let solar;
  try{ solar=resolveInput().solar; }
  catch(_){
    solar={
      day:Number(document.querySelector("#birthDay")?.value)||1,
      month:Number(document.querySelector("#birthMonth")?.value)||1,
      year:Number(document.querySelector("#birthYear")?.value)||0
    };
  }
  const hour=Math.max(0,Math.min(23,Number(document.querySelector("#hour")?.value)||0));
  const minute=Math.max(0,Math.min(59,Number(document.querySelector("#minute")?.value)||0));
  const dd=String(solar.day).padStart(2,"0");
  const mm=String(solar.month).padStart(2,"0");
  const yyyy=String(solar.year);
  const hh=String(hour).padStart(2,"0");
  const mi=String(minute).padStart(2,"0");
  return `${exportPersonNameAscii()} _ ${dd}.${mm}.${yyyy} ${hh}h${mi} TVTL`
    .replace(/[\\/:*?"<>|]+/g," ")
    .replace(/\s+/g," ").trim();
}

function isMobileDevice(){
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||"");
}

async function saveBlobWithPrompt(blob, suggestedName, mimeType, extension, description){
  /* Desktop secure context: Save As picker thật. */
  if(window.isSecureContext &&
     typeof window.showSaveFilePicker==="function" &&
     !isMobileDevice()){
    try{
      const handle=await window.showSaveFilePicker({
        suggestedName,
        types:[{
          description:description||"Tệp",
          accept:{[mimeType]:[extension]}
        }]
      });
      const writable=await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return {method:"picker",saved:true};
    }catch(err){
      if(err?.name==="AbortError")return {method:"picker",saved:false,cancelled:true};
      console.warn("showSaveFilePicker failed:",err);
    }
  }

  /* Mobile secure context: bảng Share / Save to Files. */
  try{
    const file=new File([blob],suggestedName,{type:mimeType});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({
        files:[file],
        title:"Tử Vi Thiên Lương"
      });
      return {method:"share",saved:true};
    }
  }catch(err){
    if(err?.name==="AbortError")return {method:"share",saved:false,cancelled:true};
    console.warn("Web Share failed:",err);
  }

  /* file:// hoặc browser không hỗ trợ picker: download là fallback
     hoạt động ổn định nhất. */
  const ok=window.confirm(
    "Trình duyệt hiện tại không hỗ trợ hộp thoại chọn thư mục trực tiếp.\n\n"+
    "Bạn có muốn tải file xuống thư mục Downloads không?"
  );
  if(!ok)return {method:"download",saved:false,cancelled:true};

  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=suggestedName;
  a.style.display="none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  return {method:"download",saved:true};
}


let __previewBlob=null;
let __previewObjectUrl=null;

let __contextBlob=null;
let __contextBlobPromise=null;

function hideChartContextMenu(){
  const menu=document.querySelector("#chartContextMenu");
  if(!menu)return;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden","true");
}

function placeChartContextMenu(x,y){
  const menu=document.querySelector("#chartContextMenu");
  if(!menu)return;
  menu.style.left="0px";
  menu.style.top="0px";
  menu.classList.add("open");
  menu.setAttribute("aria-hidden","false");

  const rect=menu.getBoundingClientRect();
  const left=Math.min(Math.max(6,x),window.innerWidth-rect.width-6);
  const top=Math.min(Math.max(6,y),window.innerHeight-rect.height-6);
  menu.style.left=left+"px";
  menu.style.top=top+"px";
}

async function prepareContextImageBlob(){
  if(__contextBlob)return __contextBlob;
  if(__contextBlobPromise)return __contextBlobPromise;

  const menu=document.querySelector("#chartContextMenu");
  const preparing=document.querySelector("#ctxPreparing");
  const copyBtn=document.querySelector("#ctxCopyImage");
  const saveBtn=document.querySelector("#ctxSaveImage");
  const openBtn=document.querySelector("#ctxOpenPreview");

  if(menu){
    menu.classList.remove("ready","error");
  }
  if(preparing){
    preparing.textContent="Đang chuẩn bị ảnh PNG 4K…";
  }
  [copyBtn,saveBtn,openBtn].forEach(btn=>{
    if(btn)btn.disabled=true;
  });

  __contextBlobPromise=(async()=>{
    const blob=await rasterCurrentChartForPreview();
    __contextBlob=blob;
    __previewBlob=blob;

    if(menu)menu.classList.add("ready");
    [copyBtn,saveBtn,openBtn].forEach(btn=>{
      if(btn)btn.disabled=false;
    });
    return blob;
  })();

  try{
    return await __contextBlobPromise;
  }catch(err){
    if(menu)menu.classList.add("error");
    if(preparing){
      preparing.textContent="Không tạo được ảnh. Hãy kiểm tra kết nối rồi thử lại.";
    }
    throw err;
  }finally{
    __contextBlobPromise=null;
  }
}

async function copyBlobToClipboard(blob){
  if(!blob)throw new Error("Chưa có ảnh để sao chép.");

  const pngBlob=blob.type==="image/png"
    ? blob
    : new Blob([await blob.arrayBuffer()],{type:"image/png"});

  /* Clipboard ảnh chỉ hoạt động ổn định trong secure context
     (https/localhost). Khi mở trực tiếp file://, nhiều trình duyệt
     sẽ chặn. */
  if(window.isSecureContext &&
     navigator.clipboard &&
     typeof ClipboardItem!=="undefined"){
    await navigator.clipboard.write([
      new ClipboardItem({"image/png":pngBlob})
    ]);
    return {method:"clipboard"};
  }

  /* Fallback thực dụng cho file://:
     mở ảnh thật trong cửa sổ xem trước để người dùng chuột phải
     hoặc nhấn giữ trực tiếp lên ảnh -> Copy image. */
  await openPreviewFromBlob(pngBlob);
  return {method:"preview"};
}

async function openPreviewFromBlob(blob){
  if(!blob)blob=__contextBlob||await prepareContextImageBlob();

  if(__previewObjectUrl)URL.revokeObjectURL(__previewObjectUrl);
  __previewBlob=blob;
  __previewObjectUrl=URL.createObjectURL(blob);

  const img=document.querySelector("#previewImage");
  const overlay=document.querySelector("#imagePreviewOverlay");
  if(!img || !overlay)throw new Error("Không tìm thấy cửa sổ xem ảnh.");

  img.src=__previewObjectUrl;
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden","false");
}

async function rasterCurrentChartForPreview(){
  const ready=await ensureHtml2Canvas();
  if(!ready)throw new Error("Không tải được bộ tạo ảnh.");

  render();
  const paper=document.querySelector(".paper");
  if(!paper)throw new Error("Không tìm thấy vùng lá số.");

  if(document.fonts?.ready){
    try{await document.fonts.ready}catch(_){}
  }
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  /* Chuột phải / Sao chép / Lưu ảnh dùng một nguồn PNG 4K thật.
     Không đổi layout CSS: chỉ tăng mật độ raster để chữ giữ nguyên bố cục
     như màn hình nhưng đủ nét khi đưa vào video YouTube 1080p/4K. */
  const paperRect=paper.getBoundingClientRect();
  const cssWidth=Math.max(1,paperRect.width||paper.offsetWidth||paper.scrollWidth||960);
  const CONTEXT_TARGET_WIDTH=3840;
  const contextScale=Math.min(5.0,Math.max(3.0,CONTEXT_TARGET_WIDTH/cssWidth));

  const restoreTypography=lockComputedTypographyForRaster(paper);
  let sourceCanvas;
  try{
    sourceCanvas=await window.html2canvas(paper,{
    backgroundColor:"#ffffff",
    scale:contextScale,
    onclone:applyStableColorsToHtml2CanvasClone,
    useCORS:true,
    allowTaint:false,
    logging:false,
    scrollX:0,
    scrollY:-window.scrollY,
    windowWidth:Math.max(document.documentElement.clientWidth,paper.scrollWidth),
    windowHeight:Math.max(document.documentElement.clientHeight,paper.scrollHeight)
    });
  }finally{
    restoreTypography();
  }

  return await new Promise((resolve,reject)=>{
    sourceCanvas.toBlob(blob=>{
      if(blob)resolve(blob);
      else reject(new Error("Không tạo được ảnh."));
    },"image/png",1);
  });
}

async function openImagePreview(){
  try{
    setExportStatus("Đang tạo ảnh xem trước 4K…");
    const blob=await rasterCurrentChartForPreview();

    if(__previewObjectUrl)URL.revokeObjectURL(__previewObjectUrl);
    __previewBlob=blob;
    __previewObjectUrl=URL.createObjectURL(blob);

    const img=document.querySelector("#previewImage");
    const overlay=document.querySelector("#imagePreviewOverlay");
    img.src=__previewObjectUrl;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden","false");
    setExportStatus("Đã mở ảnh. Có thể nhấn giữ để Copy/Lưu.","ok");
  }catch(err){
    console.error(err);
    setExportStatus("Không tạo được ảnh xem trước: "+(err?.message||err),"err");
  }
}

function closeImagePreview(){
  const overlay=document.querySelector("#imagePreviewOverlay");
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden","true");
}

async function copyPreviewImageToClipboard(){
  if(!__previewBlob){
    setExportStatus("Chưa có ảnh để sao chép.","err");
    return;
  }

  try{
    await copyBlobToClipboard(__previewBlob);
    setExportStatus("Đã sao chép ảnh PNG 4K vào Clipboard.","ok");
  }catch(err){
    console.warn("Clipboard image copy failed:",err);
    setExportStatus(
      "Không sao chép trực tiếp được. Hãy nhấn giữ lên ảnh và chọn Copy/Lưu ảnh.",
      "err"
    );
  }
}

async function savePreviewImage(){
  if(!__previewBlob){
    setExportStatus("Chưa có ảnh để lưu.","err");
    return;
  }
  const result=await saveBlobWithPrompt(
    __previewBlob,
    `${exportBaseFileName()}.png`,
    "image/png",
    ".png",
    "Ảnh PNG"
  );
  if(result.cancelled){
    setExportStatus("Đã hủy lưu ảnh.");
  }else if(result.method==="share"){
    setExportStatus("Đã mở bảng Lưu/Chia sẻ.","ok");
  }else{
    setExportStatus("Đã lưu ảnh.","ok");
  }
}

function installChartLongPressCopy(){
  const paper=document.querySelector(".paper");
  if(!paper || paper.dataset.copyReady==="1")return;

  paper.dataset.copyReady="1";
  paper.classList.add("copy-ready");

  /* Desktop: chuột phải vào lá số -> menu Sao chép/Lưu ảnh. */
  paper.addEventListener("contextmenu",e=>{
    if(isMobileDevice())return;
    e.preventDefault();
    e.stopPropagation();

    __contextBlob=null;
    __contextBlobPromise=null;

    const menu=document.querySelector("#chartContextMenu");
    const preparing=document.querySelector("#ctxPreparing");
    if(menu)menu.classList.remove("ready","error");
    if(preparing)preparing.textContent="Đang chuẩn bị ảnh…";
    ["ctxCopyImage","ctxSaveImage","ctxOpenPreview"].forEach(id=>{
      const btn=document.getElementById(id);
      if(btn)btn.disabled=true;
    });

    placeChartContextMenu(e.clientX,e.clientY);
    prepareContextImageBlob().catch(err=>{
      console.error(err);
      const copyBtn=document.querySelector("#ctxCopyImage");
      if(copyBtn){
        copyBtn.disabled=true;
        copyBtn.textContent="Không tạo được ảnh";
      }
      setExportStatus("Không tạo được ảnh để sao chép: "+(err?.message||err),"err");
    });
  });

  /* Mobile: nhấn giữ -> mở ảnh với nút Sao chép ảnh. */
  let timer=null;
  let startX=0,startY=0;

  const clear=()=>{
    if(timer){clearTimeout(timer);timer=null}
  };

  paper.addEventListener("touchstart",e=>{
    if(e.touches.length!==1)return;
    startX=e.touches[0].clientX;
    startY=e.touches[0].clientY;
    clear();
    timer=setTimeout(()=>{
      timer=null;
      openImagePreview();
    },650);
  },{passive:true});

  paper.addEventListener("touchmove",e=>{
    if(!timer || e.touches.length!==1)return;
    const dx=Math.abs(e.touches[0].clientX-startX);
    const dy=Math.abs(e.touches[0].clientY-startY);
    if(dx>12 || dy>12)clear();
  },{passive:true});

  paper.addEventListener("touchend",clear,{passive:true});
  paper.addEventListener("touchcancel",clear,{passive:true});
}

async function ensureHtml2Canvas(){
  if(typeof window.html2canvas==="function")return true;

  // Fallback: thử nạp lại CDN nếu lần tải đầu chưa hoàn tất.
  return await new Promise(resolve=>{
    const old=document.querySelector('script[data-h2c-fallback="1"]');
    if(old){resolve(false);return}

    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.dataset.h2cFallback="1";
    s.onload=()=>resolve(typeof window.html2canvas==="function");
    s.onerror=()=>resolve(false);
    document.head.appendChild(s);

    setTimeout(()=>resolve(typeof window.html2canvas==="function"),10000);
  });
}

function getExportOrientation(){
  return document.querySelector("#exportOrientation")?.value||"portrait";
}

/* V3.3.102 — TÙY CHỌN XUẤT ĐEN TRẮNG
   Chỉ tác động lên file xuất PDF/PNG, không đổi màu lá số trên màn hình. */
function blackWhiteExportEnabled(){
  return !!document.querySelector("#blackWhiteExport")?.checked;
}

function prepareCanvasForExport(canvas){
  if(!canvas || !blackWhiteExportEnabled())return canvas;

  const out=document.createElement("canvas");
  out.width=canvas.width;
  out.height=canvas.height;
  const ctx=out.getContext("2d",{alpha:false});
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,out.width,out.height);

  /* Dùng bộ lọc canvas để giữ nguyên kích thước pixel và độ nét glyph. */
  if("filter" in ctx){
    ctx.filter="grayscale(100%)";
    ctx.drawImage(canvas,0,0);
    ctx.filter="none";
  }else{
    ctx.drawImage(canvas,0,0);
    const img=ctx.getImageData(0,0,out.width,out.height);
    const d=img.data;
    for(let i=0;i<d.length;i+=4){
      const y=Math.round(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);
      d[i]=d[i+1]=d[i+2]=y;
    }
    ctx.putImageData(img,0,0);
  }
  return out;
}

function drawContained(sourceCanvas,targetW,targetH,background="#ffffff"){
  const out=document.createElement("canvas");
  out.width=targetW;
  out.height=targetH;

  const ctx=out.getContext("2d",{alpha:false});
  ctx.fillStyle=background;
  ctx.fillRect(0,0,targetW,targetH);

  const scale=Math.min(targetW/sourceCanvas.width,targetH/sourceCanvas.height);
  const dw=Math.round(sourceCanvas.width*scale);
  const dh=Math.round(sourceCanvas.height*scale);
  const dx=Math.round((targetW-dw)/2);
  const dy=Math.round((targetH-dh)/2);

  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(sourceCanvas,dx,dy,dw,dh);
  return out;
}

/* V3.3.102 — VIDEO NGANG CHỈ XUẤT ĐÚNG KHUNG LÁ SỐ.
   Cao 2160 px để ghép vào timeline 4K; chiều rộng tự theo tỷ lệ thật của
   lá số, nên file không có hai dải trắng thừa ở trái/phải. */
function drawLandscapeStandalone(sourceCanvas,targetH=2160){
  const scale=targetH/sourceCanvas.height;
  const targetW=Math.max(1,Math.round(sourceCanvas.width*scale));
  const out=document.createElement("canvas");
  out.width=targetW;
  out.height=targetH;
  const ctx=out.getContext("2d",{alpha:false});
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,targetW,targetH);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(sourceCanvas,0,0,targetW,targetH);
  return out;
}

async function saveCanvasPng(canvas,fileName){
  const outputCanvas=prepareCanvasForExport(canvas);
  const blob=await new Promise(resolve=>outputCanvas.toBlob(resolve,"image/png",1));
  if(!blob)throw new Error("Không tạo được dữ liệu PNG.");

  return await saveBlobWithPrompt(
    blob,
    fileName,
    "image/png",
    ".png",
    "Ảnh PNG 4K"
  );
}

/* ============================================================
   V3.3.70 — FIT NGANG TỪNG DÒNG SAO TRÊN BẢN XUẤT
   Mục tiêu: mỗi tên sao + trạng thái phải nằm trọn trong chính cột
   của nó sau khi layout A4/video/print đã thay đổi kích thước.
   Chỉ dòng quá dài mới bị thu font; các dòng khác giữ nguyên cỡ.
   ============================================================ */
function fitOneExportTextLine(el,minScale=0.62){
  if(!el || el.clientWidth<=2)return false;
  const originalStyle=el.getAttribute("style")||"";
  const base=parseFloat(getComputedStyle(el).fontSize)||0;
  if(!base)return false;

  const available=Math.max(1,el.clientWidth-2);
  let changed=false;
  let guard=0;
  while(el.scrollWidth>available+0.5 && guard<8){
    const current=parseFloat(getComputedStyle(el).fontSize)||base;
    const ratio=Math.max(.72,Math.min(.985,(available/Math.max(1,el.scrollWidth))*.972));
    const next=Math.max(base*minScale,current*ratio);
    if(next>=current-.03)break;
    el.style.setProperty("font-size",`${next.toFixed(2)}px`,"important");
    el.style.setProperty("letter-spacing","-.08px","important");
    changed=true;
    guard++;
  }

  /* Van cuối: nếu tên đặc biệt dài vẫn sát mép, nén nhẹ theo chiều ngang.
     transform chỉ dùng tối đa khoảng 8%, không làm thay đổi chiều cao dòng. */
  if(el.scrollWidth>available+0.5){
    const visualRatio=Math.max(.92,Math.min(1,available/Math.max(1,el.scrollWidth)));
    if(visualRatio<.999){
      el.style.setProperty("transform",`scaleX(${visualRatio.toFixed(4)})`,"important");
      el.style.setProperty("transform-origin","left center","important");
      changed=true;
    }
  }
  if(changed)el.dataset.exportFitOriginalStyle=originalStyle;
  return changed;
}

function enforceExportHorizontalFit(root,profile="portrait"){
  if(!root)return ()=>{};
  const changed=[];
  const remember=el=>{
    if(changed.some(x=>x.el===el))return;
    changed.push({el,style:el.getAttribute("style")});
  };
  const minScale=profile==="video-split40"?.52:(profile==="landscape"?.72:.60);

  /* Đo từng dòng sau khi grid/flex của bản xuất đã ổn định. */
  root.querySelectorAll(".minor-star").forEach(el=>{
    remember(el);
    fitOneExportTextLine(el,minScale);
  });
  root.querySelectorAll(".annual-star").forEach(el=>{
    /* Sao lưu được phép xuống dòng, chỉ thu khi vẫn tràn ngang thật sự. */
    if(el.scrollWidth>el.clientWidth+1){
      remember(el);
      fitOneExportTextLine(el,profile==="landscape"?.74:.70);
    }
  });
  root.querySelectorAll(".major-star").forEach(el=>{
    if(el.scrollWidth>el.clientWidth+1){
      remember(el);
      fitOneExportTextLine(el,profile==="landscape"?.92:.78);
      el.style.setProperty("transform-origin","center center","important");
    }
  });

  return ()=>changed.forEach(({el,style})=>{
    if(style===null)el.removeAttribute("style");
    else el.setAttribute("style",style);
    delete el.dataset.exportFitOriginalStyle;
  });
}



/* ============================================================
   V3.3.114 — KHUNG THIẾT KẾ CỐ ĐỊNH 960px
   - Dàn lá số ở đúng một kích thước chuẩn, độc lập độ phân giải/DPI.
   - Viewer chỉ scale đồng nhất toàn bộ lá số để vừa cột hiển thị.
   - Không phóng quá 100%: màn hình lớn vẫn giữ đúng tỷ lệ chuẩn.
   ============================================================ */
const FIXED_PAPER_DESIGN_WIDTH=960;
let __paperViewerScale=1;
let __paperViewerRaf=0;

function syncFixedPaperViewer(){
  const wrap=document.querySelector('.paper-wrap');
  const stage=document.querySelector('#paperScaleStage');
  const paper=stage?.querySelector(':scope > .paper')||document.querySelector('.paper');
  if(!wrap||!stage||!paper)return;
  if(window.matchMedia&&window.matchMedia('print').matches)return;

  const available=Math.max(1,wrap.clientWidth-2);
  const scale=Math.min(1,available/FIXED_PAPER_DESIGN_WIDTH);
  const designH=Math.max(1,paper.offsetHeight||paper.scrollHeight||1365);

  __paperViewerScale=scale;
  stage.style.width=(FIXED_PAPER_DESIGN_WIDTH*scale)+'px';
  stage.style.height=(designH*scale)+'px';
  paper.style.transform='scale('+scale+')';
  paper.dataset.viewerScale=String(scale);
}

function scheduleFixedPaperViewer(){
  cancelAnimationFrame(__paperViewerRaf);
  __paperViewerRaf=requestAnimationFrame(()=>{
    syncFixedPaperViewer();
    /* Font load muộn có thể đổi cao độ vài px; chốt thêm một frame. */
    requestAnimationFrame(syncFixedPaperViewer);
  });
}

function suspendFixedPaperViewerScale(paper){
  const stage=paper?.closest?.('.paper-scale-stage');
  const wrap=paper?.closest?.('.paper-wrap');
  if(!paper||!stage)return ()=>{};

  const saved={
    paperTransform:paper.style.transform,
    stageWidth:stage.style.width,
    stageHeight:stage.style.height,
    wrapOverflow:wrap?.style.overflow||''
  };
  paper.style.transform='none';
  stage.style.width=FIXED_PAPER_DESIGN_WIDTH+'px';
  stage.style.height=Math.max(1,paper.offsetHeight||paper.scrollHeight||1365)+'px';
  if(wrap)wrap.style.overflow='visible';

  return ()=>{
    paper.style.transform=saved.paperTransform;
    stage.style.width=saved.stageWidth;
    stage.style.height=saved.stageHeight;
    if(wrap)wrap.style.overflow=saved.wrapOverflow;
    scheduleFixedPaperViewer();
  };
}

/* V3.3.70 — KHÓA TYPOGRAPHY KHI RASTER
   html2canvas vẽ chữ bằng canvas nên nếu để CSS kế thừa/resize nhiều lần,
   độ nặng và khoảng chữ có thể khác cảm giác so với DOM trên màn hình.
   Trước khi raster, khóa trực tiếp các thuộc tính typography đã COMPUTE trên
   chính lá số đang hiển thị; sau khi xong sẽ phục hồi nguyên trạng. */
function lockComputedTypographyForRaster(root){
  if(!root)return ()=>{};
  const selector=[
    '.stem-branch','.house-title','.major-star','.major-star *',
    '.minor-star','.minor-star *','.annual-star','.annual-star *',
    '.life-stage','.decade','.limit-badge','.limit-house-label',
    '.lunar-month-label','.center-content','.center-content *',
    '.legend-bar','.legend-bar *'
  ].join(',');
  const changed=[];
  root.querySelectorAll(selector).forEach(el=>{
    const cs=getComputedStyle(el);
    changed.push({el,style:el.getAttribute('style')});
    el.style.setProperty('font-family',cs.fontFamily,'important');
    el.style.setProperty('font-size',cs.fontSize,'important');
    el.style.setProperty('font-weight',cs.fontWeight,'important');
    el.style.setProperty('font-style',cs.fontStyle,'important');
    el.style.setProperty('line-height',cs.lineHeight,'important');
    el.style.setProperty('letter-spacing',cs.letterSpacing,'important');
    el.style.setProperty('font-kerning','normal','important');
    el.style.setProperty('font-synthesis','none','important');
    el.style.setProperty('text-rendering','geometricPrecision','important');
  });
  return ()=>changed.forEach(({el,style})=>{
    if(style===null)el.removeAttribute('style');
    else el.setAttribute('style',style);
  });
}

async function renderPaperDirectAtWidth(paper,targetWidth,{backgroundColor='#ffffff'}={}){
  if(!paper)throw new Error('Không tìm thấy vùng lá số.');
  const restoreViewer=suspendFixedPaperViewerScale(paper);
  if(document.fonts?.ready){
    try{await document.fonts.ready}catch(_){}
  }
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const rect=paper.getBoundingClientRect();
  const cssWidth=Math.max(1,rect.width||paper.offsetWidth||paper.scrollWidth||960);
  const scale=Math.max(1,targetWidth/cssWidth);
  const restoreTypography=lockComputedTypographyForRaster(paper);
  try{
    return await window.html2canvas(paper,{
      backgroundColor,
      scale,
      onclone:applyStableColorsToHtml2CanvasClone,
      useCORS:true,
      allowTaint:false,
      logging:false,
      scrollX:0,
      scrollY:-window.scrollY,
      windowWidth:Math.max(document.documentElement.clientWidth,paper.scrollWidth),
      windowHeight:Math.max(document.documentElement.clientHeight,paper.scrollHeight)
    });
  }finally{
    restoreTypography();
    restoreViewer();
  }
}

async function renderPortraitPaperHighRes(targetWidth=null){
  const paper=document.querySelector('.paper');
  if(!paper)throw new Error('Không tìm thấy vùng lá số.');

  /* V3.3.70: ảnh dọc/video đứng dùng đúng typography đang thấy trên màn hình.
     Không gắn profile font riêng và không raster lớn rồi thu nhỏ lại. */
  const rect=paper.getBoundingClientRect();
  const cssWidth=Math.max(1,rect.width||paper.offsetWidth||paper.scrollWidth||960);
  const desired=Math.max(1,Math.round(targetWidth||cssWidth*3));
  const restoreFit=enforceExportHorizontalFit(paper,'portrait');
  try{
    return await renderPaperDirectAtWidth(paper,desired,{backgroundColor:'#ffffff'});
  }finally{
    restoreFit();
  }
}

function enforceAnnualExportFit(root,safeBottomPx){
  if(!root)return;
  const densityClasses=[
    "density-spacious","density-mid","density-high","density-ultra",
    "density-emergency","density-critical","density-max"
  ];
  root.querySelectorAll(".palace.annual-full").forEach(p=>{
    const annual=p.querySelector(".annual-stars");
    if(!annual)return;

    /* V3.3.102: bản ngang phải tự đo lại trên chính kích thước 1754×1206.
       Không kế thừa density đã tính từ lá số đứng/màn hình, vì đó là nguyên
       nhân làm cùng một nhóm chính tinh bị chữ to/chữ nhỏ không cần thiết. */
    p.classList.remove(...densityClasses);

    const isOverflow=()=>{
      const safeBottom=p.clientHeight-safeBottomPx;
      const annualBottom=annual.offsetTop+annual.offsetHeight;
      return annualBottom>safeBottom+1;
    };
    if(isOverflow())p.classList.add("density-mid");
    if(isOverflow())p.classList.add("density-high");
    if(isOverflow())p.classList.add("density-ultra");
    if(isOverflow())p.classList.add("density-emergency");
    if(isOverflow())p.classList.add("density-critical");
    if(isOverflow())p.classList.add("density-max");
  });
  balanceAnnualPalaceVerticalSpace(root,safeBottomPx,"landscape");
}

function clearPalaceVerticalBalance(p){
  p.classList.remove("vertical-balanced","vertical-sparse");
  p.style.removeProperty("--balance-minors-h");
  p.style.removeProperty("--balance-annual-h");
  p.style.removeProperty("--balance-annual-margin");
}

/* Phân phối một phần khoảng trống dọc còn lại vào chính vùng sao.
   Không kéo nội dung sát đáy: luôn để lại vùng thở và vùng hạn. */
function balanceAnnualPalaceVerticalSpace(root,safeBottomPx=34,profile="screen"){
  /* V3.3.70: cố ý KHÔNG phân phối khoảng trắng bằng space-between/evenly.
     Hai cột trái/phải phải dùng chung nhịp dòng cố định để các hàng sao
     thẳng nhau. Hàm được giữ để tương thích với pipeline export cũ, nhưng
     chỉ có nhiệm vụ xóa mọi trạng thái cân dọc còn sót lại. */
  if(!root)return;
  root.querySelectorAll(".palace.annual-full").forEach(clearPalaceVerticalBalance);
}



/* V3.3.102 — Fit riêng các dòng trung cung của bản A4 ngang.
   CSS giữ một dòng; hàm này chỉ thu đúng dòng quá dài, không làm nhỏ
   toàn bộ trung cung. */
function enforceLandscapeCenterTextFit(root){
  if(!root)return;
  const content=root.querySelector('.center-content');
  if(!content)return;

  /* Khóa hình học trung cung trước khi đo: phải là một khối cao đủ 2 hàng,
     căn giữa dọc; tuyệt đối không dịch lên bằng transform. */
  content.style.setProperty('height','100%','important');
  content.style.setProperty('min-height','100%','important');
  content.style.setProperty('max-height','none','important');
  content.style.setProperty('transform','none','important');
  content.style.setProperty('justify-content','center','important');
  content.style.setProperty('overflow','hidden','important');

  content.querySelectorAll('.center-primary,.center-secondary').forEach(group=>{
    group.style.setProperty('display','flex','important');
    group.style.setProperty('flex-direction','column','important');
    group.style.setProperty('width','100%','important');
    group.style.setProperty('min-width','0','important');
    group.style.setProperty('flex','0 0 auto','important');
  });

  const lineSelectors=[
    '.person-line','.polarity','.logic','.age',
    '.cc-mainline','.cc-grade-line','.birth-hour-eval',
    '.special-row','.thai-tue-summary','.generated','.version','.contact-line'
  ];
  content.querySelectorAll(lineSelectors.join(',')).forEach(el=>{
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('max-width','100%','important');
    el.style.setProperty('box-sizing','border-box','important');
    if(el.scrollWidth>el.clientWidth+1){
      fitOneExportTextLine(el,.70);
    }
  });

  /* Các ô ngày tháng/can chi không được xuống dòng. */
  content.querySelectorAll('.info-row > *').forEach(el=>{
    el.style.setProperty('white-space','nowrap','important');
    el.style.setProperty('overflow','visible','important');
  });

  /* Van an toàn dọc: chỉ khi dữ liệu thực sự quá dày mới co nhẹ toàn bộ
     typography trung cung. Bình thường không đụng tới kích thước chữ. */
  const measureBlockHeight=()=>{
    const groups=[...content.querySelectorAll(':scope > .center-primary, :scope > .center-secondary')];
    if(!groups.length)return 0;
    let top=Infinity,bottom=-Infinity;
    groups.forEach(g=>{
      const r=g.getBoundingClientRect();
      top=Math.min(top,r.top); bottom=Math.max(bottom,r.bottom);
    });
    return Math.max(0,bottom-top);
  };
  const safeHeight=Math.max(1,content.clientHeight-44);
  let blockHeight=measureBlockHeight();
  if(blockHeight>safeHeight+1){
    const ratio=Math.max(.84,Math.min(.985,(safeHeight/blockHeight)*.985));
    const scalable=[
      '.person-line','.person-name','.polarity','.logic','.age',
      '.info','.can-chi-eval','.birth-hour-eval','.special-row',
      '.thai-tue-summary','.generated','.version','.contact-line'
    ];
    content.querySelectorAll(scalable.join(',')).forEach(el=>{
      const fs=parseFloat(getComputedStyle(el).fontSize);
      if(fs>0)el.style.setProperty('font-size',`${(fs*ratio).toFixed(2)}px`,'important');
    });
    /* Đo lại các dòng dài sau khi co dọc. */
    content.querySelectorAll(lineSelectors.join(',')).forEach(el=>{
      if(el.scrollWidth>el.clientWidth+1)fitOneExportTextLine(el,.68);
    });
  }
}

/* ============================================================
   V3.3.116 — CẮT SÁT MÉP BẢN XUẤT NGANG
   html2canvas trên một số máy có thể tạo thêm dải trắng ở mép phải/dưới
   dù DOM lá số đã đúng tỷ lệ. Hàm này tìm khung pixel thực của lá số và
   cắt đúng theo khung đó. Không thêm margin, không scale lại chữ.
   ============================================================ */
function cropCanvasToVisibleBounds(sourceCanvas,whiteThreshold=250,padding=0){
  if(!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height)return sourceCanvas;
  const ctx=sourceCanvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)return sourceCanvas;

  let data;
  try{
    data=ctx.getImageData(0,0,sourceCanvas.width,sourceCanvas.height).data;
  }catch(_){
    return sourceCanvas;
  }

  const w=sourceCanvas.width,h=sourceCanvas.height;
  const rowHasInk=(y)=>{
    let i=(y*w)*4;
    for(let x=0;x<w;x++,i+=4){
      if(data[i+3]>8 && (data[i]<whiteThreshold || data[i+1]<whiteThreshold || data[i+2]<whiteThreshold))return true;
    }
    return false;
  };
  const colHasInk=(x)=>{
    let i=x*4;
    for(let y=0;y<h;y++,i+=w*4){
      if(data[i+3]>8 && (data[i]<whiteThreshold || data[i+1]<whiteThreshold || data[i+2]<whiteThreshold))return true;
    }
    return false;
  };

  let top=0,bottom=h-1,left=0,right=w-1;
  while(top<h && !rowHasInk(top))top++;
  while(bottom>=top && !rowHasInk(bottom))bottom--;
  while(left<w && !colHasInk(left))left++;
  while(right>=left && !colHasInk(right))right--;

  if(left>right || top>bottom)return sourceCanvas;

  left=Math.max(0,left-padding);
  top=Math.max(0,top-padding);
  right=Math.min(w-1,right+padding);
  bottom=Math.min(h-1,bottom+padding);

  const cw=right-left+1,ch=bottom-top+1;
  if(cw===w && ch===h)return sourceCanvas;

  const out=document.createElement("canvas");
  out.width=cw;
  out.height=ch;
  const octx=out.getContext("2d",{alpha:false});
  octx.fillStyle="#ffffff";
  octx.fillRect(0,0,cw,ch);
  /* Cắt 1:1 pixel, tuyệt đối không nội suy lại chữ. */
  octx.imageSmoothingEnabled=false;
  octx.drawImage(sourceCanvas,left,top,cw,ch,0,0,cw,ch);
  return out;
}

async function renderLandscapePaperHighRes(){
  const {stage,clone}=makeLandscapeExportClone();
  if(stableExportColorsEnabled())applyStableExportColors(clone);
  else applyLiteralMenhThanColors(clone);
  applyStablePalaceHighlightStyles(clone);
  try{
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    enforceAnnualExportFit(clone,52);
    await new Promise(r=>requestAnimationFrame(r));
    enforceExportHorizontalFit(clone,"landscape");
    enforceLandscapeCenterTextFit(clone);
    await new Promise(r=>requestAnimationFrame(r));
    balanceAnnualPalaceVerticalSpace(clone,52,"landscape");
    await new Promise(r=>requestAnimationFrame(r));
    const rawCanvas=await window.html2canvas(clone,{
      backgroundColor:"#ffffff",
      width:1754,
      height:1240,
      scale:2,
      onclone:applyStableColorsToHtml2CanvasClone,
      useCORS:true,
      allowTaint:false,
      logging:false,
      scrollX:0,
      scrollY:0,
      windowWidth:1754,
      windowHeight:1240
    });
    /* Chỉ trả về đúng vùng lá số; bỏ mọi dải trắng thừa do raster. */
    return cropCanvasToVisibleBounds(rawCanvas,250,0);
  }finally{
    stage.remove();
  }
}

function makeLandscapeExportClone(){
  const paper=document.querySelector(".paper");
  if(!paper)throw new Error("Không tìm thấy vùng lá số.");

  const stage=document.createElement("div");
  stage.className="export-landscape-stage";

  const clone=paper.cloneNode(true);
  stage.appendChild(clone);
  document.body.appendChild(stage);

  return {stage,clone};
}

/* html2canvas đôi khi raster CSS custom properties khác với browser.
   Trước khi xuất ngang, gán trực tiếp màu literal của bản đứng. */
function applyLiteralMenhThanColors(root){
  const changed=[];
  const portraitRoot=document.querySelector(".paper");

  root.querySelectorAll(".palace.an-menh,.palace.an-than").forEach(p=>{
    const branch=Number(p.dataset.branch);
    if(!branch)return;

    /* Nguồn màu chuẩn là cung tương ứng trên lá số đứng đang hiển thị.
       Không suy diễn lại màu khi xuất ngang. */
    const source=portraitRoot?.querySelector(`.palace[data-branch="${branch}"]`);
    const sourceStyle=source ? getComputedStyle(source) : null;
    const pal=branchPalette(branch);

    const exactBg=(sourceStyle?.backgroundColor &&
                   sourceStyle.backgroundColor!=="rgba(0, 0, 0, 0)")
      ? sourceStyle.backgroundColor
      : pal.bg;

    const exactAccent=(sourceStyle?.getPropertyValue("--branch-accent")||pal.accent).trim();

    changed.push({
      p,
      background:p.style.getPropertyValue("background"),
      backgroundColor:p.style.getPropertyValue("background-color"),
      backgroundImage:p.style.getPropertyValue("background-image"),
      boxShadow:p.style.getPropertyValue("box-shadow"),
      border:p.style.getPropertyValue("border"),
      boxSizing:p.style.getPropertyValue("box-sizing"),
      branchBg:p.style.getPropertyValue("--branch-bg"),
      branchAccent:p.style.getPropertyValue("--branch-accent")
    });

    p.style.setProperty("--branch-bg",exactBg,"important");
    p.style.setProperty("--branch-accent",exactAccent,"important");

    /* Quan trọng: html2canvas có thể raster inset box-shadow thành mảng màu.
       Vì vậy export dùng nền pastel thật + viền thật, không dùng inset shadow. */
    p.style.setProperty("background",exactBg,"important");
    p.style.setProperty("background-color",exactBg,"important");
    p.style.setProperty("background-image","none","important");
    p.style.setProperty("box-shadow","none","important");
    p.style.setProperty("box-sizing","border-box","important");
    p.style.setProperty("border",`4px solid ${exactAccent}`,"important");
  });

  return ()=>changed.forEach(x=>{
    const restore=(name,value)=>{
      if(value)x.p.style.setProperty(name,value);
      else x.p.style.removeProperty(name);
    };
    restore("background",x.background);
    restore("background-color",x.backgroundColor);
    restore("background-image",x.backgroundImage);
    restore("box-shadow",x.boxShadow);
    restore("border",x.border);
    restore("box-sizing",x.boxSizing);
    restore("--branch-bg",x.branchBg);
    restore("--branch-accent",x.branchAccent);
  });
}


function makeVideoSplit40ExportClone(){
  const paper=document.querySelector(".paper");
  if(!paper)throw new Error("Không tìm thấy vùng lá số.");

  const stage=document.createElement("div");
  stage.className="export-video-split40-stage";

  const clone=paper.cloneNode(true);
  stage.appendChild(clone);
  document.body.appendChild(stage);
  return {stage,clone};
}

/* V3.3.70 — chế độ 40% phải giống đúng lá số đang nhìn trên màn hình.
   Không dùng stage/CSS chữ lớn riêng, không đổi mật độ, không chia lại cột.
   Chỉ raster chính .paper hiện hành ở độ phân giải cao. */
async function renderVideoSplit40PaperHighRes(){
  const paper=document.querySelector('.paper');
  if(!paper)throw new Error('Không tìm thấy vùng lá số.');
  /* Raster trực tiếp đúng 1536 px để tránh một lần drawImage/downsample
     làm đổi độ nặng và hình dạng glyph so với màn hình. */
  return await renderPaperDirectAtWidth(paper,1536,{backgroundColor:'#ffffff'});
}

/* Xuất riêng lá số ở chiều rộng 1536 px (40% của 4K),
   chiều cao tự theo đúng tỷ lệ của lá số đang hiển thị. Không ép vào 1536×2160,
   vì ép khung sẽ làm khác bố cục/nhịp chữ trên màn hình. */
function drawVideoSplit40(sourceCanvas){
  const targetW=1536;
  const scale=targetW/sourceCanvas.width;
  const targetH=Math.max(1,Math.round(sourceCanvas.height*scale));
  const out=document.createElement("canvas");
  out.width=targetW;
  out.height=targetH;

  const ctx=out.getContext("2d",{alpha:false});
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,targetW,targetH);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(sourceCanvas,0,0,targetW,targetH);
  return out;
}

/* Xuất lá số độc lập cho video đứng 9:16.
   File chỉ chứa đúng vùng lá số, rộng 2160 px; chiều cao tự theo tỷ lệ gốc.
   Khi đặt vào timeline 2160×3840, chỉ cần fit theo chiều ngang.
   Không tạo canvas 9:16 nên không có dải trắng trên/dưới. */
function drawPortraitStandalone(sourceCanvas,targetW=2160){
  const scale=targetW/sourceCanvas.width;
  const targetH=Math.max(1,Math.round(sourceCanvas.height*scale));
  const out=document.createElement("canvas");
  out.width=targetW;
  out.height=targetH;

  const ctx=out.getContext("2d",{alpha:false});
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,targetW,targetH);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(sourceCanvas,0,0,targetW,targetH);
  return out;
}

async function exportChartJpg(){
  render();
  const mode=getExportOrientation();

  const labels={
    portrait:"A4 dọc",
    landscape:"A4 ngang",
    "video-landscape":"Video 16:9 – Lá số độc lập 2160px",
    "video-split40":"Video – Lá số độc lập 40% – như màn hình",
    "video-portrait":"Video đứng 9:16 – Lá số độc lập 2160px"
  };
  setExportStatus(`Đang tạo ảnh ${labels[mode]||""}…`);

  const ready=await ensureHtml2Canvas();
  if(!ready){
    setExportStatus("Không tải được bộ xuất ảnh. Kiểm tra kết nối Internet rồi thử lại.","err");
    alert(
      "Không tải được bộ xuất ảnh.\n\n"+
      "Hãy kết nối Internet, tải lại trang (Ctrl+R) rồi bấm Xuất ảnh."
    );
    return;
  }

  if(document.fonts?.ready){
    try{await document.fonts.ready}catch(_){}
  }
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  /* ========================================================
     VIDEO NGANG CHO TIMELINE 16:9 — CHỈ NGUYÊN LÁ SỐ
     - Chiều cao 2160 px.
     - Chiều rộng tự theo tỷ lệ thật của lá số.
     - Không tạo canvas 3840×2160 nên không còn hai dải trắng
       thừa ở trái/phải. Khi dựng video 4K, đặt ảnh này vào
       timeline 3840×2160 và dùng nền của video cho phần còn lại.
     ======================================================== */
  if(mode==="video-landscape"){
    const sourceCanvas=await renderLandscapePaperHighRes();
    const out=drawLandscapeStandalone(sourceCanvas,2160);

    const result=await saveCanvasPng(
      out,
      `${exportBaseFileName()}.png`
    );

    if(result.cancelled){
      setExportStatus("Đã hủy lưu ảnh.");
      return;
    }
    setExportStatus(
      result.method==="share"
        ? `Đã mở bảng Lưu/Chia sẻ lá số ngang độc lập ${out.width}×${out.height}.`
        : `Đã lưu lá số ngang độc lập ${out.width}×${out.height}; không còn phần trắng thừa ở trái/phải.`,
      "ok"
    );
    return;
  }


  /* ========================================================
     VIDEO – LÁ SỐ ĐỘC LẬP 40% – NHƯ MÀN HÌNH
     - rộng 1536 px (40% chiều rộng 4K)
     - chiều cao tự theo đúng tỷ lệ lá số trên màn hình
     - không dùng CSS chữ lớn riêng, không kèm phần trống bên phải
     ======================================================== */
  if(mode==="video-split40"){
    const out=await renderVideoSplit40PaperHighRes();

    const result=await saveCanvasPng(
      out,
      `${exportBaseFileName()}.png`
    );

    if(result.cancelled){
      setExportStatus("Đã hủy lưu ảnh.");
      return;
    }
    setExportStatus(
      result.method==="share"
        ? `Đã mở bảng Lưu/Chia sẻ lá số độc lập 40% – như màn hình (${out.width}×${out.height}).`
        : `Đã lưu lá số độc lập ${out.width}×${out.height}: bố cục giống màn hình, không có phần trống 60% bên phải.`,
      "ok"
    );
    return;
  }

  /* ========================================================
     VIDEO ĐỨNG 9:16 – LÁ SỐ ĐỘC LẬP
     - Không tạo canvas 2160×3840.
     - Chỉ xuất đúng vùng lá số, rộng 2160 px.
     - Chiều cao tự theo tỷ lệ gốc của lá số.
     - Khi dựng video 9:16, fit theo chiều ngang; khoảng trống
       trên/dưới thuộc về ảnh/video nền của timeline.
     ======================================================== */
  if(mode==="video-portrait"){
    const out=await renderPortraitPaperHighRes(2160);

    const result=await saveCanvasPng(
      out,
      `${exportBaseFileName()}.png`
    );

    if(result.cancelled){
      setExportStatus("Đã hủy lưu ảnh.");
      return;
    }
    setExportStatus(
      result.method==="share"
        ? `Đã mở bảng Lưu/Chia sẻ lá số độc lập video đứng 2160×${out.height}.`
        : `Đã lưu lá số độc lập 2160×${out.height}; không có nền trắng trên/dưới.`,
      "ok"
    );
    return;
  }

  /* ========================================================
     A4 DỌC – PNG 300 DPI ưu tiên độ nét chữ
     ======================================================== */
  if(mode==="portrait"){
    const outW=2480, outH=3508;
    const margin=32;
    const paper=document.querySelector('.paper');
    const r=paper.getBoundingClientRect();
    const aspect=(r.width||paper.offsetWidth||960)/Math.max(1,(r.height||paper.offsetHeight||1360));
    const maxW=outW-margin*2;
    const maxH=outH-margin*2;
    /* Chọn kích thước raster cuối cùng ngay từ đầu: không render 3x rồi thu nhỏ. */
    const directW=Math.max(1,Math.floor(Math.min(maxW,maxH*aspect)));
    const sourceCanvas=await renderPortraitPaperHighRes(directW);

    const canvas=document.createElement("canvas");
    canvas.width=outW;
    canvas.height=outH;

    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,outW,outH);

    const dw=sourceCanvas.width;
    const dh=sourceCanvas.height;
    const dx=Math.round((outW-dw)/2);
    const dy=Math.round((outH-dh)/2);

    /* 1:1 pixel copy; không nội suy lại glyph. */
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sourceCanvas,dx,dy);

    const outputCanvas=prepareCanvasForExport(canvas);
    const blob=await new Promise(resolve=>outputCanvas.toBlob(resolve,"image/png",1));
    if(!blob)throw new Error("Không tạo được dữ liệu ảnh.");

    const result=await saveBlobWithPrompt(
      blob,
      `${exportBaseFileName()}.png`,
      "image/png",
      ".png",
      "Ảnh PNG 300 DPI"
    );

    if(result.cancelled){
      setExportStatus("Đã hủy lưu ảnh.");
      return;
    }
    setExportStatus(
      result.method==="share"
        ? "Đã mở bảng Lưu/Chia sẻ."
        : "Đã lưu ảnh A4 dọc PNG 300 DPI; giữ khóa CÁT/TRỢ bên trái, HUNG/SÁT/BẠI bên phải và tự co cung dày.",
      "ok"
    );
    return;
  }

  /* ========================================================
     A4 NGANG – PNG 300 DPI ưu tiên độ nét chữ
     ======================================================== */
  const canvas=await renderLandscapePaperHighRes();
  const outputCanvas=prepareCanvasForExport(canvas);
  const blob=await new Promise(resolve=>outputCanvas.toBlob(resolve,"image/png",1));
  if(!blob)throw new Error("Không tạo được dữ liệu ảnh.");

  const result=await saveBlobWithPrompt(
    blob,
    `${exportBaseFileName()}.png`,
    "image/png",
    ".png",
    "Ảnh PNG 300 DPI"
  );

  if(result.cancelled){
    setExportStatus("Đã hủy lưu ảnh.");
    return;
  }
  setExportStatus(
    result.method==="share"
      ? "Đã mở bảng Lưu/Chia sẻ."
      : "Đã lưu ảnh A4 ngang PNG 300 DPI; đã cắt sát mép lá số, không còn dải trắng thừa bên phải/dưới.",
    "ok"
  );
}

/* V3.3.102 — PDF MỘT TRANG KHÔNG HEADER/FOOTER CỦA TRÌNH DUYỆT
   Không gọi window.print(): PDF được tạo trực tiếp từ lá số nên không có
   URL, ngày giờ in hay "1 of 1". Lá số được fit và căn giữa trên trang A4. */
function makeA4PageCanvas(sourceCanvas,orientation="portrait",marginPx=48){
  const landscape=orientation==="landscape";
  const pageW=landscape?3508:2480;
  const pageH=landscape?2480:3508;
  const out=document.createElement("canvas");
  out.width=pageW;
  out.height=pageH;
  const ctx=out.getContext("2d",{alpha:false});
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,pageW,pageH);

  const maxW=Math.max(1,pageW-marginPx*2);
  const maxH=Math.max(1,pageH-marginPx*2);
  const scale=Math.min(maxW/sourceCanvas.width,maxH/sourceCanvas.height);
  const dw=Math.max(1,Math.round(sourceCanvas.width*scale));
  const dh=Math.max(1,Math.round(sourceCanvas.height*scale));
  const dx=Math.round((pageW-dw)/2);
  const dy=Math.round((pageH-dh)/2);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(sourceCanvas,dx,dy,dw,dh);
  return out;
}

function concatPdfBytes(parts){
  const total=parts.reduce((n,p)=>n+p.length,0);
  const out=new Uint8Array(total);
  let pos=0;
  for(const p of parts){out.set(p,pos);pos+=p.length;}
  return out;
}

async function canvasToSinglePagePdfBlob(canvas,orientation="portrait"){
  const jpgBlob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.985));
  if(!jpgBlob)throw new Error("Không tạo được dữ liệu ảnh cho PDF.");
  const jpg=new Uint8Array(await jpgBlob.arrayBuffer());
  const enc=new TextEncoder();
  const ascii=t=>enc.encode(t);
  const landscape=orientation==="landscape";
  const pageW=landscape?841.890:595.276;
  const pageH=landscape?595.276:841.890;
  const content=`q\n${pageW.toFixed(3)} 0 0 ${pageH.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes=ascii(content);

  const header=ascii("%PDF-1.4\n%TVTL\n");
  const parts=[header];
  const offsets=[0,0,0,0,0,0];
  let length=header.length;
  const pushAsciiObject=(num,text)=>{
    offsets[num]=length;
    const b=ascii(`${num} 0 obj\n${text}\nendobj\n`);
    parts.push(b);length+=b.length;
  };

  pushAsciiObject(1,"<< /Type /Catalog /Pages 2 0 R >>");
  pushAsciiObject(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  pushAsciiObject(3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(3)} ${pageH.toFixed(3)}] `+
    `/Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );

  offsets[4]=length;
  const imageHead=ascii(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} `+
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`
  );
  const imageTail=ascii("\nendstream\nendobj\n");
  parts.push(imageHead,jpg,imageTail);
  length+=imageHead.length+jpg.length+imageTail.length;

  offsets[5]=length;
  const contentHead=ascii(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  const contentTail=ascii("endstream\nendobj\n");
  parts.push(contentHead,contentBytes,contentTail);
  length+=contentHead.length+contentBytes.length+contentTail.length;

  const xrefOffset=length;
  let xref="xref\n0 6\n0000000000 65535 f \n";
  for(let i=1;i<=5;i++)xref+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
  xref+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(ascii(xref));

  return new Blob([concatPdfBytes(parts)],{type:"application/pdf"});
}

async function exportChartPdf(){
  render();
  let orientation=getExportOrientation();
  if(orientation==="video-landscape" || orientation==="video-split40")orientation="landscape";
  if(orientation==="video-portrait")orientation="portrait";

  setExportStatus(`Đang tạo PDF A4 ${orientation==="landscape"?"ngang":"dọc"}…`);
  const ready=await ensureHtml2Canvas();
  if(!ready){
    setExportStatus("Không tải được bộ xuất PDF. Kiểm tra kết nối Internet rồi thử lại.","err");
    return;
  }
  if(document.fonts?.ready){try{await document.fonts.ready}catch(_){}}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  let sourceCanvas;
  if(orientation==="landscape"){
    sourceCanvas=await renderLandscapePaperHighRes();
  }else{
    sourceCanvas=await renderPortraitPaperHighRes(2384);
  }

  /* V3.3.116: A4 ngang không thêm lề nhân tạo; ảnh lá số đã được crop sát mép.
     A4 dọc giữ lề cũ để không thay đổi bố cục đang ổn định. */
  let pageCanvas=makeA4PageCanvas(sourceCanvas,orientation,orientation==="landscape"?0:48);
  pageCanvas=prepareCanvasForExport(pageCanvas);
  const pdfBlob=await canvasToSinglePagePdfBlob(pageCanvas,orientation);
  const result=await saveBlobWithPrompt(
    pdfBlob,
    `${exportBaseFileName()}.pdf`,
    "application/pdf",
    ".pdf",
    "Tệp PDF A4"
  );

  if(result.cancelled){
    setExportStatus("Đã hủy lưu PDF.");
    return;
  }
  setExportStatus(
    result.method==="share"
      ? "Đã mở bảng Lưu/Chia sẻ PDF."
      : `Đã lưu PDF A4 ${orientation==="landscape"?"ngang sát mép":"dọc"}; không có đầu trang/chân trang của trình duyệt.`,
    "ok"
  );
}

function applyAnnualDensityClass(p,leftCount,rightCount,annualGoodCount,annualBadCount,annualMode){
  if(annualMode!=="full")return;
  p.classList.add("annual-full");

  /* Khóa sao lưu theo hai nửa: tốt bên trái, xấu bên phải. Mật độ phải
     tính theo phía dài hơn thay vì chia đôi tổng số sao lưu. */
  const minorRows=Math.max(leftCount,rightCount);
  const annualRows=Math.max(annualGoodCount,annualBadCount);
  const densityScore=minorRows+annualRows;
  p.dataset.densityScore=String(densityScore);

  /* V3.3.70: nhịp dòng cố định, đồng bộ hai cột. Không giãn cung thưa để
     lấp khoảng trắng. Chỉ cung thực sự dày mới co theo các cấp density. */
  if(densityScore>=16)p.classList.add("density-ultra");
  else if(densityScore>=13)p.classList.add("density-high");
  else if(densityScore>=10)p.classList.add("density-mid");
}

function enforceAnnualPalaceFit(chart){
  chart.querySelectorAll(".palace.annual-full").forEach(p=>{
    const annual=p.querySelector(".annual-stars");
    if(!annual)return;
    const isOverflow=()=>{
      const safeBottom=p.clientHeight-34;
      const annualBottom=annual.offsetTop+annual.offsetHeight;
      return annualBottom>safeBottom+1;
    };

    /* V3.3.70: co theo số đo thực tế, từng nấc một. Nếu cung còn nhiều
       khoảng trắng phía dưới thì giữ chữ lớn và khoảng cách thoáng. */
    if(isOverflow()){p.classList.remove("density-spacious");p.classList.add("density-mid");}
    if(isOverflow())p.classList.add("density-high");
    if(isOverflow())p.classList.add("density-ultra");
    if(isOverflow())p.classList.add("density-emergency");
    if(isOverflow())p.classList.add("density-critical");
    if(isOverflow())p.classList.add("density-max");
  });
  balanceAnnualPalaceVerticalSpace(chart,34,"screen");
}

function render(){
  __contextBlob=null;
  __contextBlobPromise=null;
  try{
    const c=computeChart();
    const chart=document.querySelector("#chart");
    chart.innerHTML="";

    for(let branch=1;branch<=12;branch++){
      const p=document.createElement("section");
      p.className="palace";
      if(isPhiDisplayMode(c.annualMode))p.classList.add("phi-mode");
      if(isNorthTuHoaMode(c.annualMode)&&northLaiNhanBranches(c).includes(branch))p.classList.add("north-lai-active");
      p.dataset.branch=String(branch);
      p.style.gridRow=GRID[branch][0];
      p.style.gridColumn=GRID[branch][1];

      const stars=c.buckets[branch];
      const majors=stars.filter(s=>s.major);
      const stage=stars.find(s=>s.source==="trang-sinh");
      const allMinors=stars.filter(s=>!s.major&&s.source!=="trang-sinh"&&!HIDDEN_VISUAL_STARS.has(s.name));
      const minors=isPhiDisplayMode(c.annualMode) ? allMinors.filter(s=>PHI_TU_HOA_STAR_SET.has(s.name)) : allMinors;

      /* Phân cột theo tính chất sao, không cân cột bằng cách đảo vị trí.
         Điều này giữ đúng thông lệ trình bày: sao tốt/trợ tinh bên trái,
         hung/sát/bại tinh bên phải. */
      const left=minors.filter(s=>starDisplaySide(s.name)==="left");
      const right=minors.filter(s=>starDisplaySide(s.name)==="right");
      const annualList=c.annualMode==="full" ? (c.annual.stars[branch]||[]) : [];
      const annualGood=annualList.filter(s=>s.type!=="bad");
      const annualBad=annualList.filter(s=>s.type==="bad");
      applyAnnualDensityClass(
        p,left.length,right.length,annualGood.length,annualBad.length,c.annualMode
      );

      const hCan=houseCan(branch,c.canNam);
      const title=houseName(branch,c.menh);
      p.dataset.houseName=title;
      p.dataset.viewYear=String(c.viewYear||"");
      const isThan=branch===c.than;
      const isMenh=branch===c.menh;
      const isTamHop=["Mệnh","Quan Lộc","Tài Bạch"].includes(title);

      if(isMenh || isThan){
        const pal=branchPalette(branch);
        p.style.setProperty("--branch-bg",pal.bg);
        p.style.setProperty("--branch-accent",pal.accent);
        if(isMenh)p.classList.add("an-menh");
        if(isThan)p.classList.add("an-than");
      }
      if(isLimitDisplayMode(c.annualMode) && branch===c.daiBranch)p.classList.add("active-dai");
      if(isLimitDisplayMode(c.annualMode) && branch===c.luuDaiBranch)p.classList.add("active-luu-dai");
      if(isLimitDisplayMode(c.annualMode) && branch===c.tieuBranch)p.classList.add("active-tieu");

      const annualGoodHtml=annualGood
        .map(s=>`<div class="annual-star ${s.type}" data-star-help="${escapeHtml(starHelpBaseName(s.name))}" data-star-display="${escapeHtml(s.name)}" data-star-annual="1" data-star-annual-group="${escapeHtml(s.group||"")}" data-context-note="Lưu cát tinh">${escapeHtml(s.name)}</div>`).join("");
      const annualBadHtml=annualBad
        .map(s=>`<div class="annual-star ${s.type}" data-star-help="${escapeHtml(starHelpBaseName(s.name))}" data-star-display="${escapeHtml(s.name)}" data-star-annual="1" data-star-annual-group="${escapeHtml(s.group||"")}" data-context-note="Lưu hung/sát/bại tinh">${escapeHtml(s.name)}</div>`).join("");
      const annualHtml=annualList.length
        ? `<div class="annual-stars" aria-label="Sao lưu: cát bên trái, hung bên phải">
             <div class="annual-col annual-good-col">${annualGoodHtml}</div>
             <div class="annual-col annual-bad-col">${annualBadHtml}</div>
           </div>`
        : "";
      const monthInfo=c.annualMode==="full"
        ? c.annualMonths.months.find(x=>x.branch===branch)
        : null;
      const monthLabel=monthInfo
        ? `<div class="lunar-month-label ${monthInfo.good?"month-good":"month-bad"}"
                title="Tháng ${monthInfo.month} • Can ${monthInfo.stemName} • ${monthInfo.star} • ${monthInfo.reason}">
             THÁNG ${monthInfo.month}
           </div>`
        : "";
      const limitBadges=isLimitDisplayMode(c.annualMode)
        ? `<div class="limit-badges">
             ${branch===c.daiBranch?`<span class="limit-badge badge-dai" data-chart-help="limit-badge" data-limit-kind="dai" data-physical-house="${escapeHtml(title)}" data-start-age="${c.daiStartAge??""}" data-end-age="${c.daiStartAge!=null?c.daiStartAge+9:""}" data-current-age="${c.ageAtView}" data-view-year="${c.viewYear}">Đại hạn</span>`:""}
             ${branch===c.luuDaiBranch?`<span class="limit-badge badge-luu-dai" data-chart-help="limit-badge" data-limit-kind="luu" data-physical-house="${escapeHtml(title)}" data-current-age="${c.ageAtView}" data-view-year="${c.viewYear}">Lưu ĐH</span>`:""}
             ${branch===c.tieuBranch?`<span class="limit-badge badge-tieu" data-chart-help="limit-badge" data-limit-kind="tieu" data-physical-house="${escapeHtml(title)}" data-current-age="${c.ageAtView}" data-view-year="${c.viewYear}">Tiểu hạn</span>`:""}
           </div>`
        : "";

      /* Hai vòng cung động tham khảo cách trình bày lá số hạn:
         - ĐH.MỆNH neo tại cung Đại Hạn hiện hành.
         - LĐH.MỆNH neo tại cung Lưu Đại Hạn của năm xem.
         Các cung còn lại xoay cùng thứ tự Mệnh→Phụ→Phúc→...→Huynh. */
      const daiHouseLabel=c.daiBranch?limitHouseShort(branch,c.daiBranch):"—";
      const luuDaiHouseLabel=c.luuDaiBranch?limitHouseShort(branch,c.luuDaiBranch):"—";
      const daiDynamicHouse=c.daiBranch?houseName(branch,c.daiBranch):"—";
      const luuDaiDynamicHouse=c.luuDaiBranch?houseName(branch,c.luuDaiBranch):"—";
      p.dataset.daiHouse=daiDynamicHouse;
      p.dataset.luuDaiHouse=luuDaiDynamicHouse;
      const decadeStart=decadeAt(branch,c.menh,c.cuc,c.gender,c.chiNam);
      const decadeEnd=decadeStart+9;
      const phiPanel=phiTuHoaPanelHtml(branch,c);
      const limitHouseRow=c.annualMode==="full" && c.daiBranch && c.luuDaiBranch
        ? `<div class="limit-house-row" aria-label="Cung động Đại Hạn và Lưu Đại Hạn">
             <span class="limit-house-label dai ${daiHouseLabel==="MỆNH"?"limit-menh":""}"
                   data-chart-help="limit-house" data-limit-layer="dai" data-dynamic-short="${escapeHtml(daiHouseLabel)}"
                   data-dynamic-house="${escapeHtml(daiDynamicHouse)}" data-physical-house="${escapeHtml(title)}" data-view-year="${c.viewYear}"
                   title="Đại Hạn: ${daiHouseLabel}">ĐH.${daiHouseLabel}</span>
             <span class="limit-house-label luu ${luuDaiHouseLabel==="MỆNH"?"limit-menh":""}"
                   data-chart-help="limit-house" data-limit-layer="luu" data-dynamic-short="${escapeHtml(luuDaiHouseLabel)}"
                   data-dynamic-house="${escapeHtml(luuDaiDynamicHouse)}" data-physical-house="${escapeHtml(title)}" data-view-year="${c.viewYear}"
                   title="Lưu Đại Hạn ${c.viewYear}: ${luuDaiHouseLabel}">LĐH.${luuDaiHouseLabel}</span>
           </div>`
        : "";

      p.innerHTML=`
        <div class="palace-header">
          <div class="stem-branch ${elementClass(branchElement(branch))}"
               data-palace-cc-help="1"
               data-house-stem="${hCan}"
               data-house-branch="${branch}"
               data-house-name="${escapeHtml(title)}"
               data-year-stem="${c.canNam}"
               aria-label="Tra cứu Can–Chi cung ${escapeHtml(title)}: ${CAN[hCan]} ${CHI[branch]}">${CAN[hCan].toUpperCase()} ${CHI[branch].toUpperCase()}</div>
          <div class="house-title ${isTamHop?"tam-hop":""}"
               data-chart-help="house" data-help-house="${escapeHtml(title)}"
               ${isPhiDisplayMode(c.annualMode) && (c.phiView?.multiSource || branch===c.phiView?.sourceBranch)?`data-phi-help="source" data-phi-source-branch="${branch}"`:""}
               aria-label="Tra cứu ý nghĩa cung ${escapeHtml(title)}">${title.toUpperCase()}${isThan?' <span class="than">(THÂN)</span>':''}</div>
        </div>
        ${monthLabel}

        <div class="major">
          ${majors.map(s=>`
            <div class="major-star ${s.name===c.saoAtChu&&!isPhiDisplayMode(c.annualMode)?"at-chu-star":""}"
                 ${isPhiDisplayMode(c.annualMode)?`data-phi-help="host" data-phi-star="${escapeHtml(s.name)}" data-phi-target-branch="${branch}"`:""}
                 data-context-note="${escapeHtml([s.name===c.saoAtChu?`Sao Át Chủ của tuổi ${CAN[c.canNam]}`:"",dualElementTitle(s,c)].filter(Boolean).join(" • "))}">
              ${displayStar(s)}
            </div>`).join("")}
        </div>
        <div class="minors">
          <div class="minor-col">${left.map(s=>isPhiDisplayMode(c.annualMode)?renderPhiHostStarHtml(s,branch):renderMinorStarHtml(s,branch,c)).join("")}</div>
          <div class="minor-col">${right.map(s=>isPhiDisplayMode(c.annualMode)?renderPhiHostStarHtml(s,branch):renderMinorStarHtml(s,branch,c)).join("")}</div>
        </div>
        ${phiPanel}
        ${annualHtml}
        ${limitBadges}
        ${limitHouseRow}
        ${northStaticPalaceOverlayHtml(branch,c)}
        <div class="life-stage ${stage?elementClass(stage.e):""}" ${stage?`data-star-help="${escapeHtml(stage.name)}" data-star-display="${escapeHtml(stage.name)}" data-star-element="${escapeHtml(stage.e||"")}"`:""}>${stage?escapeHtml(stage.name):""}</div>
        <div class="decade" data-chart-help="decade-start"
             data-start-age="${decadeStart}" data-end-age="${decadeEnd}"
             data-physical-house="${escapeHtml(title)}" data-active-decade="${branch===c.daiBranch?"1":"0"}"
             data-current-age="${c.ageAtView}" data-view-year="${c.viewYear}"
             aria-label="Đại Hạn cung ${escapeHtml(title)} bắt đầu từ ${decadeStart} tuổi">${decadeStart}</div>
      `;
      chart.appendChild(p);
    }

    /*
       TAM PHƯƠNG TỨ CHÍNH
       Tam giác đậm nối Mệnh – Quan Lộc – Tài Bạch.
       Đường riêng Mệnh – Thiên Di biểu diễn Tứ chính.
       Chỉ phần đường nằm trong ô trung tâm 2x2 được hiển thị.
    */
    const innerAnchor={
      1:{x:62.5,y:75},  2:{x:37.5,y:75},  3:{x:25,y:75},
      4:{x:25,y:62.5},  5:{x:25,y:37.5},  6:{x:25,y:25},
      7:{x:37.5,y:25},  8:{x:62.5,y:25},  9:{x:75,y:25},
      10:{x:75,y:37.5},11:{x:75,y:62.5},12:{x:75,y:75}
    };
    const toCenterLocal=p=>({x:(p.x-25)*2,y:(p.y-25)*2});
    const mAnchor=toCenterLocal(innerAnchor[c.menh]);
    const quanAnchor=toCenterLocal(innerAnchor[wrap1(c.menh+4)]);
    const thienDiAnchor=toCenterLocal(innerAnchor[wrap1(c.menh+6)]);
    const taiAnchor=toCenterLocal(innerAnchor[wrap1(c.menh+8)]);
    const tamColor=tamHopColor(c.menh);
    const diColor=tuChinhColor(c.menh);
    const tamPhuongSvg=`
      <svg class="tam-phuong-lines"
           style="--tamhop-color:${tamColor};--tuchinh-color:${diColor}"
           viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line class="tam-hop" x1="${mAnchor.x}" y1="${mAnchor.y}" x2="${quanAnchor.x}" y2="${quanAnchor.y}"></line>
        <line class="tam-hop" x1="${quanAnchor.x}" y1="${quanAnchor.y}" x2="${taiAnchor.x}" y2="${taiAnchor.y}"></line>
        <line class="tam-hop" x1="${taiAnchor.x}" y1="${taiAnchor.y}" x2="${mAnchor.x}" y2="${mAnchor.y}"></line>
        <line class="tu-chinh" x1="${mAnchor.x}" y1="${mAnchor.y}" x2="${thienDiAnchor.x}" y2="${thienDiAnchor.y}"></line>
      </svg>`;

    const center=document.createElement("section");
    center.className="center";
    const current=new Date();
    const age=c.ageAtView;
    const pol=stemYang(c.canNam)===1?"DƯƠNG":"ÂM";
    const logic=amDuongThuanLy(c.canNam,c.menh)?"ÂM DƯƠNG THUẬN LÝ":"ÂM DƯƠNG NGHỊCH LÝ";
    const hosts=c.hoaHosts.map(x=>HOA_SHORT[x]||x.toUpperCase()).join(" ");
    const now=`${fmt2(current.getDate())}/${fmt2(current.getMonth()+1)}/${current.getFullYear()} ${fmt2(current.getHours())}:${fmt2(current.getMinutes())}`;

    center.innerHTML=`
      ${tamPhuongSvg}
      ${isPhiDisplayMode(c.annualMode)?"":[6,7,8,9,5,4,10,11,3,2,1,12].map(p=>
        `<span class="center-label th-p${p}" title="Tiểu hạn tại cung ${CHI[p]}">${CHI[c.tieuRing.labels[p]].toUpperCase()}</span>`
      ).join("")}

      <div class="center-content">
        <div class="center-primary">
        <div class="person-line">Họ tên: <span class="person-name">${escapeHtml(c.name)}</span></div>
        <div class="polarity">${pol} ${c.gender.toUpperCase()}</div>
        <div class="logic">${logic}</div>
        <div class="age">${
          isPhiDisplayMode(c.annualMode)
            ? `${c.ageAtView} tuổi • ${isNorthTuHoaMode(c.annualMode)?"TỨ HÓA BẮC PHÁI":"PHI TỨ HÓA"}`
            : (c.annualMode==="none"
              ? `${c.ageAtView} tuổi`
              : `${c.ageAtView} tuổi • Năm xem ${c.viewYear} (${CAN[c.annual.can].toUpperCase()} ${CHI[c.annual.chi].toUpperCase()})`)
        }</div>

        <div class="info">
          <div class="info-row">
            <div class="info-key">Năm:</div>
            <div class="info-date">${c.solar.year} (${c.lunar.year})</div>
            <div class="info-cc">${CAN[c.canNam].toUpperCase()} ${CHI[c.chiNam].toUpperCase()}</div>
          </div>
          <div class="info-row">
            <div class="info-key">Tháng:</div>
            <div class="info-date">${c.solar.month} (${c.lunar.month}${c.lunar.leap?"N":""})</div>
            <div class="info-cc">${CAN[c.monthCC.stem].toUpperCase()} ${CHI[c.monthCC.branch].toUpperCase()}</div>
          </div>
          <div class="info-row">
            <div class="info-key">Ngày:</div>
            <div class="info-date">${c.solar.day} (${c.lunar.day})</div>
            <div class="info-cc">${CAN[c.dayCC.stem].toUpperCase()} ${CHI[c.dayCC.branch].toUpperCase()}</div>
          </div>
          <div class="info-row">
            <div class="info-key">Giờ:</div>
            <div class="info-date">${fmt2(c.hour)}:${fmt2(c.minute)}</div>
            <div class="info-cc">${CAN[c.hourCC.stem].toUpperCase()} ${CHI[c.hourCC.branch].toUpperCase()}</div>
          </div>
        </div>
        ${c.annualMode==="full"?`
        <div class="center-inline-note" title="Đánh giá sinh–khắc Ngũ Hành giữa Thiên Can và Địa Chi năm sinh theo nghiệm lý Thiên Lương. ${c.canChiRelation.grade} — ${c.canChiRelation.meaning}">
          <span class="center-inline-label">Can–Chi năm sinh:</span>
          <span class="center-inline-value">${CAN[c.canNam].toUpperCase()}(${c.canChiRelation.canElementName})-${CHI[c.chiNam].toUpperCase()}(${c.canChiRelation.chiElementName}) ${c.canChiRelation.label}</span>
        </div>
        <div class="birth-hour-eval ${c.birthHourEval.clear?"birth-hour-clear":"birth-hour-hit"}" title="Đối chiếu 5 nhóm giờ sinh theo các bảng Tử Vi/dân gian: Quan Sát, Tướng Quân, Diêm Vương, Dạ Đề và Kim Xà Thiết Tỏa. Đây là quy ước mệnh lý truyền thống, không phải đánh giá y khoa.">
          <span class="birth-hour-line"><span class="birth-hour-label">Giờ sinh:</span><span class="birth-hour-value">${c.birthHourEval.label}</span></span>
        </div>`:""}
        ${c.historicalTime?.enabled?`
          <div class="special-row"><strong>Giờ miền Nam:</strong> ${c.historicalTime.advance>0
            ? `${fmt2(c.hour)}:${fmt2(c.minute)} → <b>${fmt2(c.calcHour)}:${fmt2(c.calcMinute)}</b> (lùi ${c.historicalTime.advance} giờ)`
            : `<b>không cần hiệu chỉnh</b>`}
          </div>`:""}

        <div class="center-sep"></div>
        ${isPhiDisplayMode(c.annualMode)?`<div class="phi-center-guide" data-phi-help="overview">${phiModeLabel(c.annualMode)} • ${escapeHtml(c.phiView?.title||"MỆNH BÀN")}<br><span style="font-weight:400">${escapeHtml(c.phiView?.subtitle||"")}</span></div>`:""}
        ${isPhiDisplayMode(c.annualMode)
          ? `<div class="special-row phi-center-summary" data-phi-help="overview"><strong>${isNorthTuHoaMode(c.annualMode)?"Bảng Tứ Hóa" : (c.phiView?.multiSource?`Tứ Hóa năm sinh Can ${CAN[c.canNam]}`:`Can phát ${c.phiView?.sourceStem?CAN[c.phiView.sourceStem]:"—"}`)}:</strong> <b>${(THIEN_LUONG_TU_HOA[c.phiView?.multiSource?c.canNam:c.phiView?.sourceStem]||[]).map(x=>HOA_SHORT[x]||x.toUpperCase()).join(" ")}</b></div>`
          : `<div class="special-row"><strong>Tứ Hóa Thiên Lương Can ${CAN[c.canNam]}:</strong> <b>${hosts}</b></div>`}
        ${isNorthTuHoaMode(c.annualMode)?`<div class="north-center-summary" data-phi-help="overview"><b>Lai Nhân:</b> ${northLaiNhanBranches(c).map(b=>houseName(b,c.menh).toUpperCase()+" • "+CAN[houseCan(b,c.canNam)].toUpperCase()+" "+CHI[b].toUpperCase()).join(" / ")||"—"}<br><b>Ngã:</b> Mệnh–Tài–Quan–Phúc–Điền–Tật &nbsp; • &nbsp; <b>Tha:</b> Phụ–Nô–Di–Tử–Phu–Huynh</div>${northConvergenceButtonHtml(c)}`:""}
        </div>
        <div class="center-secondary">
        <div class="special-row menh-nap-am ${elementClass(c.banMenh.e)}">Mệnh: <b>${c.banMenh.name}</b></div>
        <div class="special-row">Cục: <b>${c.cuc.name}</b></div>
        ${c.annualMode!=="none"?`
          <div class="special-row">An Mệnh: <b>${CHI[c.menh].toUpperCase()} • ${branchElementName(c.menh)}</b>
            &nbsp; • &nbsp; An Thân: <b>${CHI[c.than].toUpperCase()} • ${branchElementName(c.than)}</b>
          </div>
          <div class="special-row">Chủ Mệnh: <b>${c.chuMenh.toUpperCase()}</b>
            &nbsp; • &nbsp; Chủ Thân: <b>${c.chuThan.toUpperCase()}</b>
          </div>
        `:""}
        ${!isPhiDisplayMode(c.annualMode)?`<div class="special-row">Sao Át Chủ Can ${CAN[c.canNam]}:
          <b>${c.saoAtChu.toUpperCase()}</b>
          ${c.atChuBranch?` • tại <b>${CHI[c.atChuBranch].toUpperCase()}</b>`:""}
        </div>`:""}
        ${isLimitDisplayMode(c.annualMode)?`
          <div class="thai-tue-summary">
            <span class="summary-label">Thái Tuế trọng điểm:</span>
            ${thaiTueFocusSummary(c).map(x=>
              `<span class="summary-item"><span>${x.role}:</span><span>${x.star}</span></span>`
            ).join("")}
          </div>
        `:""}
        ${c.annualMode!=="none"?`
          <div class="special-row">Thân cư <b>${houseName(c.than,c.menh).toUpperCase()}</b></div>
        `:""}
        ${isLimitDisplayMode(c.annualMode)?`
          <div class="special-row">Vòng Tiểu Hạn / Lộc Tồn: <b>${c.tieuRing.dir===1?"THUẬN CHIỀU KIM ĐỒNG HỒ":"NGHỊCH CHIỀU KIM ĐỒNG HỒ"}</b></div>
        `:""}
        ${isLimitDisplayMode(c.annualMode)?`
          <div class="center-sep"></div>
          <div class="special-row">Đại Hạn: <b>${c.daiBranch?houseName(c.daiBranch,c.menh).toUpperCase()+" • "+CHI[c.daiBranch].toUpperCase()+" • "+c.daiStartAge+"–"+(c.daiStartAge+9)+" tuổi":"ngoài phạm vi 12 đại hạn"}</b></div>
          <div class="special-row">Lưu Đại Hạn ${c.viewYear}: <b>${c.luuDaiBranch?houseName(c.luuDaiBranch,c.menh).toUpperCase()+" • "+CHI[c.luuDaiBranch].toUpperCase():"—"}</b></div>
          <div class="special-row">Tiểu Hạn ${c.viewYear}: <b>${houseName(c.tieuBranch,c.menh).toUpperCase()} • ${CHI[c.tieuBranch].toUpperCase()}</b></div>
          <div class="special-row">Tháng 1 âm lịch: <b>${CHI[c.annualMonths.month1Branch].toUpperCase()}</b>
            • Tháng tốt: <b>${c.annualMonths.months.filter(x=>x.good).map(x=>x.month).join(", ")||"—"}</b>
          </div>
          ${annualGoodDaysHtml(c)}
          <div class="special-row">Lưu Thái Tuế: <b>${CHI[c.annual.chi].toUpperCase()}</b> &nbsp; • &nbsp; Lưu Thiên Mã: <b>${CHI[findThienMa(c.annual.chi)].toUpperCase()}</b></div>
        `:""}
        <div class="generated">Ngày lập: &nbsp; <b>${now}</b></div>
        <div class="version">
          <div>Copyright Tử Vi Thiên Lương</div>
          <div class="contact-line">Liên hệ: Thienluongtvth@gmail.com</div>
        </div>
        </div>
      </div>`;
    chart.appendChild(center);
    center.querySelector(".tam-phuong-lines")?.classList.toggle(
      "hidden",
      !document.querySelector("#showTamPhuong").checked
    );

    /* Chốt chống tràn sau khi toàn bộ grid đã có kích thước thực. */
    enforceAnnualPalaceFit(chart);

    createVoidLabels(chart,c.marks.triet,c.marks.tuan);

    window.__chartData=c;
    if(isPhiDisplayMode(c.annualMode))requestAnimationFrame(()=>activatePhiSource(c.phiView?.multiSource?(__phiSelectedSource||c.menh):c.phiView?.sourceBranch));
    regressionTest(c);
    renderInterpretation(c);
    installChartLongPressCopy();
    scheduleFixedPaperViewer();
  }catch(err){
    alert(err.message||String(err));
    console.error(err);
  }
}

function regressionTest(c){
  const el=document.querySelector("#regression") || document.createElement("div");

  /* V3.3.122 — khóa lỗi tuổi âm cho người sinh trước Tết:
     tuổi âm/mụ của năm xem phải lấy NĂM ÂM LỊCH SINH, không lấy năm dương lịch sinh. */
  const lunarAgeExpected=c.viewYear-c.lunar.year+1;
  const lunarAgeAudit=(c.ageAtView===lunarAgeExpected);
  if(!lunarAgeAudit){
    console.error("LUNAR_AGE_AUDIT_FAIL",{viewYear:c.viewYear,lunarBirthYear:c.lunar.year,solarBirthYear:c.solar.year,ageAtView:c.ageAtView,expected:lunarAgeExpected});
  }

  /* Benchmark A: ảnh tham chiếu Canh Thân 07/07/1980 */
  const sample1980=c.solar.year===1980&&c.solar.month===7&&c.solar.day===7&&c.hour===7&&c.minute===7&&c.gender==="Nam";
  if(sample1980){
    const expected={
      menh:3,than:11,cuc:5,
      main:{
        "Vũ Khúc":3,"Thiên Tướng":3,"Thái Dương":4,"Thiên Lương":4,"Thất Sát":5,
        "Thiên Cơ":6,"Tử Vi":7,"Phá Quân":9,"Liêm Trinh":11,"Thiên Phủ":11,
        "Thái Âm":12,"Tham Lang":1,"Thiên Đồng":2,"Cự Môn":2
      }
    };
    let ok=c.menh===expected.menh&&c.than===expected.than&&c.cuc.number===expected.cuc;
    Object.entries(expected.main).forEach(([s,p])=>{if(c.positions[s]!==p)ok=false});
    ok=ok &&
      c.saoAtChu==="Vũ Khúc" &&
      c.atChuBranch===3 &&
      c.positions["L.N. Văn Tinh"]===12 &&
      c.positions["Đường Phù"]===2 &&
      c.positions["Quốc Ấn"]===5;
    const tuan=[...c.marks.tuan].sort((a,b)=>a-b).join(",")==="1,2";
    const triet=[...c.marks.triet].sort((a,b)=>a-b).join(",")==="7,8";
    ok=ok&&tuan&&triet;
    el.innerHTML=ok
      ? `Benchmark 1980: <span class="test-ok">ĐẠT</span> — 14 Chính Tinh, Mệnh/Thân/Cục, Tuần/Triệt.`
      : `Benchmark 1980: <span class="test-warn">CẦN KIỂM TRA</span>.`;
    return;
  }

  /* Benchmark C: mẫu người dùng 04/11/1994 07:15 – Nữ.
     Giáp Tuất: Tuần và Triệt phải đồng tại Thân–Dậu. */
  const sample1994=
    c.solar.year===1994 &&
    c.solar.month===11 &&
    c.solar.day===4 &&
    c.hour===7 &&
    c.minute===15 &&
    c.gender==="Nữ";

  if(sample1994){
    const tuan=[...c.marks.tuan].sort((a,b)=>a-b).join(",")==="9,10";
    const triet=[...c.marks.triet].sort((a,b)=>a-b).join(",")==="9,10";
    const dongCung=sameVoidPair(c.marks.tuan,c.marks.triet);
    const ok=tuan&&triet&&dongCung;

    el.innerHTML=ok
      ? `Benchmark 1994: <span class="test-ok">ĐẠT</span> — Tuần–Triệt đồng cung Thân–Dậu, hiển thị song song.`
      : `Benchmark 1994: <span class="test-warn">CẦN KIỂM TRA TUẦN–TRIỆT</span>.`;
    return;
  }

  /* Benchmark B: ảnh Gia đình Thiên Lương người Kỷ Mùi – Âm Nam */
  const sample1979=c.solar.year===1979&&c.solar.month===8&&c.solar.day===2&&c.hour===8&&c.gender==="Nam";
  if(sample1979){
    const expectedRing={
      6:4,7:3,8:2,9:1,   // mép trên: Mão Dần Sửu Tý
      5:5,4:6,            // mép trái: Thìn Tỵ
      10:12,11:11,        // mép phải: Hợi Tuất
      3:7,2:8,1:9,12:10  // mép dưới: Ngọ Mùi Thân Dậu
    };
    let ringOK=true;
    Object.entries(expectedRing).forEach(([p,z])=>{
      if(c.tieuRing.labels[Number(p)]!==z)ringOK=false;
    });
    const kdOK=
      c.canNam===6 &&
      c.chiNam===8 &&
      c.positions["Lộc Tồn"]===7 &&
      c.positions["Kình Dương"]===6 &&
      c.positions["Đà La"]===8;
    const baseOK=
      c.menh===4 &&
      c.than===12 &&
      branchElementName(c.menh)==="MỘC" &&
      branchElementName(c.than)==="THỦY" &&
      c.chuMenh==="Văn Khúc" &&
      c.chuThan==="Thiên Tướng" &&
      c.saoAtChu==="Thiên Lương" &&
      c.atChuBranch===5 &&
      c.positions["L.N. Văn Tinh"]===10 &&
      c.positions["Đường Phù"]===12 &&
      c.positions["Quốc Ấn"]===3 &&
      thaiTueFocusSummary(c).some(x=>x.role==="Mệnh" && x.branch===4 && x.star==="Bạch Hổ") &&
      thaiTueFocusSummary(c).some(x=>x.role==="Thân" && x.branch===12 && x.star==="Quan Phù") &&
      thaiTueFocusSummary(c).some(x=>x.role==="Át Chủ" && x.branch===5 && x.star==="Phúc Đức") &&
      c.cuc.number===6 &&
      c.banMenh?.name==="THIÊN THƯỢNG HỎA" &&
      c.tieuRing.dir===-1 &&
      c.amDuongThuanLy===true;

    const luuDaiOK=(c.viewYear!==2026) ? true :
      (c.ageAtView===48 && c.daiBranch===12 && c.daiStartAge===46 && c.luuDaiBranch===7);

    const month1=c.annualMonths.months[0];
    const monthRuleOK=(c.viewYear!==2026) ? true :
      (
        c.tieuBranch===3 &&
        c.annualMonths.month1Branch===2 &&
        month1.branch===2 &&
        month1.stemName==="Canh" &&
        month1.star==="Vũ Khúc" &&
        month1.natalStarBranch===2 &&
        month1.good===true
      );

    const ok=ringOK&&kdOK&&baseOK&&luuDaiOK&&monthRuleOK;
    el.innerHTML=ok
      ? `Benchmark Thiên Lương Kỷ Mùi: <span class="test-ok">ĐẠT</span> — LN Văn Tinh Dậu, Đường Phù Hợi, Quốc Ấn Dần;  Tháng 1/2026 khởi Sửu, Canh→Vũ Khúc và được đánh dấu xanh; Thái Tuế trọng điểm cũng khớp.`
      : `Benchmark Thiên Lương Kỷ Mùi: <span class="test-warn">CẦN KIỂM TRA</span>.`;
    return;
  }

  const coreAudit=auditThienLuongCoreRules();
  const starSideAudit=auditStarDisplaySides();
  const statusAudit=auditStarStatuses();
  const majorStatusAudit=auditCommonMajorStatuses();
  const keyStarAudit=auditKeyStarRules();
  const dualElementAudit=auditDualElementRules();
  const allStarElementAudit=auditAllStarElementUsage(c);
  const thienMaAudit=auditThienMaRules();
  const locCanAudit=auditLocCanRules();
  const canChiAudit=auditCanChiRelation();
  const houseCanAudit=auditHouseCanByNguHoDon();
  const starMasterAudit=auditStarMasterDatabase();
  const systemRuleAudit=auditSystemRuleIsolation();
  const ruleRegistryAudit=auditRuleRegistry();
  const exportAudit=auditExportRendererRules();
  const goldenAudit=auditGoldenRegressionSuite();
  const birthHourAudit=auditBirthHourEvaluation();
  const calendarAudit=auditLunarCalendar();
  const historicalYearAudit=auditHistoricalYearSupport();
  const auditOK=coreAudit.ok&&starSideAudit.ok&&statusAudit.ok&&majorStatusAudit.ok&&keyStarAudit.ok&&dualElementAudit.ok&&allStarElementAudit.ok&&thienMaAudit.ok&&locCanAudit.ok&&canChiAudit.ok&&houseCanAudit.ok&&starMasterAudit.ok&&systemRuleAudit.ok&&ruleRegistryAudit.ok&&exportAudit.ok&&goldenAudit.ok&&birthHourAudit.ok&&calendarAudit.ok&&historicalYearAudit.ok;
  el.innerHTML=auditOK
    ? `Hệ thống V3.3.145: <span class="test-ok">ĐẠT</span> — Đã kiểm tra ${allStarElementAudit.renderedCount} sao đang dựng trên lá số và toàn bộ bảng hành gốc; ${dualElementAudit.dualCount} sao hai hành được khóa ${dualElementAudit.caseCount} trường hợp đối chiếu với 5 Nạp âm Mệnh; Thiên Can 12 cung theo Ngũ Hổ Độn đã kiểm đủ ${houseCanAudit.caseCount} trường hợp (10 Can năm sinh × 12 cung), đặc biệt khóa đúng hai cung cuối Tý/Sửu; STAR MASTER chuẩn hóa ${starMasterAudit.starCount} hồ sơ sao; Rule Registry khóa ${ruleRegistryAudit.ruleCount} hệ luật độc lập; Golden Regression khóa ${goldenAudit.caseCount} ca trọng yếu và Export Audit ${exportAudit.caseCount} điều kiện renderer; popup sao đã bỏ mục kỹ thuật vị trí trái/phải và bổ sung lớp nghĩa theo cung vị, đồng cung, tam hợp, nhị hợp cùng kết luận ứng dụng; popup dài có cầu nối hover 900ms và vùng popup tương tác độc lập để cuộn/kéo scrollbar không bị đóng; hỗ trợ năm lịch sử Công nguyên 1–9999, không còn ép năm xem về 1800/2300 và đã bổ sung ΔT cổ đại; Bắc Phái quét đủ 12 cung nguyên cục để truy cung phát sự việc và popup cung đã thành trình xem mạng “phát đi đâu / ai phi vào / tầng vận kích hoạt”; phân cột sao đã kiểm riêng đủ ${starSideAudit.locRingChecked||12} sao vòng Bác Sĩ/Lộc Tồn, trong đó Phi Liêm được khóa cột phải; Bệnh Phù được khóa hành Thổ và dùng cùng mã hành cho màu sao lẫn popup. Định danh “hành chính đới hành phụ” luôn giữ cố định; chỉ hành dụng thay đổi, đồng thời chi phối cả màu sao, dòng tóm tắt và popup. Vòng Tràng Sinh và bảng M/V/Đ/B/H của 14 chính tinh giữ hệ thông thường; Kình–Đà: ${c.kinhDaSchool==="thienluong"?"Thiên Lương":"cố định"}; La–Võng là nhãn của Đà La tại Thìn/Tuất. Thiên Mã đổi hành theo địa bàn Dần=Mộc, Tỵ=Hỏa, Thân=Kim, Hợi=Thủy; dùng mức DỤNG/LỢI/VẤT/ĐIÊU/NHƯỢC và xét Tuần–Triệt theo Thiên Lương; Tứ Lộc được nhấn theo Thiên Can, Lộc Tồn đủ tam hợp được nhấn mạnh hơn; tuổi âm/mụ được tính theo năm âm lịch của ngày sinh (không dùng năm dương lịch sinh, để đúng cả trường hợp sinh trước Tết); chế độ Phi Tứ Hóa/Bắc Phái đã tách quy tắc vận hạn khỏi hệ Thiên Lương: Mệnh bàn dùng 12 Can cung; Đại Hạn Phi Hóa tự an theo Dương Nam–Âm Nữ thuận, Âm Nam–Dương Nữ nghịch rồi dùng Can cung Đại Hạn phát 4 Hóa; Lưu Niên dùng Can năm xem; Tiểu Hạn chỉ an Nam thuận–Nữ nghịch để làm điểm đối chiếu/kích hoạt và không lấy Can cung Tiểu Hạn phát riêng 4 Hóa; đồng thời có chế độ Tứ Hóa Bắc Phái riêng biệt: ba tầng phát Hóa thực sự là Mệnh bàn/Đại Hạn/Lưu Niên, còn Tiểu Hạn chỉ làm lớp đối chiếu kích hoạt; Bắc Phái tiếp tục nghiên cứu cấu trúc cung phát → sao chủ → cung nhận, phi xuất/phi nhập và tự hóa; Bắc Phái đã tự nhận diện Lai Nhân Cung theo Can năm sinh (loại Tý/Sửu theo quy ước Khâm Thiên), phân loại Ngã/Tha cung, đánh dấu Kỵ xung đối cung và dò chuỗi Kỵ chuyển Kỵ có chống vòng lặp; bộ Hội tụ đa tầng đã nhận diện trùng nguyên vẹn 4 Hóa giữa hai tầng cùng Can, cùng sao/cung nhận Hóa tích cực + Kỵ, Kỵ lặp đúng sao–cung, cụm Lộc–Quyền–Khoa nhiều tầng, đồng thời xếp mức hội tụ và tóm tắt trọng tâm năm/cơ hội/rủi ro/đường giải; bổ sung bộ dò Hội tụ Tứ Hóa giữa Mệnh bàn/Đại Hạn/Lưu Niên và điểm đối chiếu Tiểu Hạn, nhận diện Kỵ kích hoạt cung hạn, Kỵ nhập/xung Mệnh, Kỵ–Lộc/Quyền/Khoa đồng cung hoặc cùng trục và Kỵ trùng Kỵ; quan hệ Can–Chi năm sinh được xếp đủ 5 bậc dưới dạng Bậc x/5 và chỉ hiển thị ở thiên bàn giữa khi bật Đầy đủ lưu niên; cùng chế độ này có thêm phân loại giờ sinh Quan Sát/Tướng Quân/Diêm Vương/Dạ Đề/Kim Xà Thiết Tỏa. Phân cột CÁT/TRỢ trái — HUNG/SÁT/BẠI phải; SAO LƯU tốt trái — xấu phải; sao hành Thủy hiển thị ĐEN, Ngũ Hành cung Thủy giữ XANH; font lá số chuẩn hóa Arial 400/700 trên mọi stage; xuất ảnh/PDF đồng bộ typography và chống va chạm; popup tra cứu sao kết hợp từ điển sao và nghiệm lý Tử Vi Thiên Lương, trong đó nghĩa cốt lõi được giữ nguyên và có thêm lớp “Hiểu thêm” về đặc tính sao cho người mới học, chỉ hoạt động khi bật Đầy đủ lưu niên; popup Can–Chi từng cung chỉ hoạt động khi bật Đầy đủ lưu niên, trực tiếp trên nhãn địa bàn và giải thích Ngũ Hổ Độn, Âm Dương–Ngũ Hành, quan hệ Can–Chi và Nạp âm; popup tên cung/Đại Hạn/ĐH.x/LĐH.x/mốc tuổi Đại Hạn cũng chỉ hoạt động ở chế độ Đầy đủ lưu niên và phân biệt rõ Đại Hạn=bối cảnh 10 năm, Lưu Đại Hạn=hướng/diễn biến của năm, Tiểu Hạn=sự việc/biểu hiện cụ thể; popup sao lưu ưu tiên bản chất theo năm, cung nhập hạn, luận trực tiếp sao–cung và lớp chồng ĐH/LĐH/Tiểu Hạn; đã bỏ phần cách an để gọn và không lặp thông tin sao gốc; popup TUẦN/TRIỆT trực tiếp trên nhãn đen, chỉ ở Đầy đủ lưu niên; đã bỏ phần cách an, đưa lực Âm–Dương 70/30 và luật tháo gỡ Mệnh–Thân/Đại Hạn lên trước, các trường hợp đặc biệt chỉ hiện khi thực sự có trên lá số; lịch âm/dương dùng Sóc thiên văn Meeus + ΔT, đã khóa ca 08/09/2026 = 27/07/2026 âm lịch.`
    : `Hệ thống V3.3.145: <span class="test-warn">CẦN KIỂM TRA</span> — ${[...coreAudit.errors,...starSideAudit.errors,...statusAudit.errors,...majorStatusAudit.errors,...keyStarAudit.errors,...dualElementAudit.errors,...allStarElementAudit.errors,...thienMaAudit.errors,...locCanAudit.errors,...canChiAudit.errors,...houseCanAudit.errors,...starMasterAudit.errors,...systemRuleAudit.errors,...ruleRegistryAudit.errors,...exportAudit.errors,...goldenAudit.errors,...birthHourAudit.errors,...calendarAudit.errors,...historicalYearAudit.errors].join("; ")}`;
}

function auditExportRendererRules(){
  const errors=[];
  try{
    const root=document.createElement("div");
    root.innerHTML='<div class="palace phi-target-active north-lai-active north-chain-active north-ky-xung-active phi-source-active"></div>';
    applyStablePalaceHighlightStyles(root);
    const p=root.querySelector(".palace");
    if(!p||p.style.boxShadow!=="none")errors.push("Export: highlight palace chưa loại box-shadow");
    if(!p.style.outline)errors.push("Export: highlight palace chưa chuyển sang outline ổn định");
  }catch(e){errors.push(`Export audit: ${e?.message||e}`);}
  return {ok:errors.length===0,errors,caseCount:2};
}
function auditGoldenRegressionSuite(){
  const errors=[];
  const expect=(ok,msg)=>{if(!ok)errors.push(msg);};
  // Ngũ Hổ Độn: Nhâm năm → Nhâm Dần ... Tân Hợi → Nhâm Tý → Quý Sửu.
  expect(houseCan(3,9)===9,"Golden Nhâm: Dần phải Nhâm");
  expect(houseCan(12,9)===8,"Golden Nhâm: Hợi phải Tân");
  expect(houseCan(1,9)===9,"Golden Nhâm: Tý phải Nhâm");
  expect(houseCan(2,9)===10,"Golden Nhâm: Sửu phải Quý");
  // Giáp/Kỷ khởi Bính Dần; kiểm thêm Kỷ để chống lỗi hai cung cuối.
  expect(houseCan(3,6)===3,"Golden Kỷ: Dần phải Bính");
  expect(houseCan(1,6)===3,"Golden Kỷ: Tý phải Bính");
  expect(houseCan(2,6)===4,"Golden Kỷ: Sửu phải Đinh");
  expect(starMasterMeta("Bệnh Phù").element==="O","Golden sao: Bệnh Phù phải Thổ");
  expect(starMasterMeta("Phi Liêm").displaySide==="right","Golden sao: Phi Liêm phải cột phải");
  expect(starMasterMeta("Tướng Quân").displaySide==="right"&&starMasterMeta("Tướng Quân").nature.label==="QUYỀN–VÕ","Golden sao: Tướng Quân phải cột phải nhưng không gắn hung mặc định");
  expect(starMasterMeta("Đẩu Quân").displaySide==="right","Golden sao: Đẩu Quân phải cột phải");
  expect(SYSTEM_RULE_REGISTRY.phi.tieuEmitsFourHoa===false&&SYSTEM_RULE_REGISTRY.bacphai.tieuEmitsFourHoa===false,"Golden hệ: Tiểu Hạn Phi/Bắc Phái không phát riêng 4 Hóa");
  return {ok:errors.length===0,errors,caseCount:12};
}

document.querySelector("#build").addEventListener("click",render);


function bindInteractiveImageActions(){
  const byId=id=>document.getElementById(id);

  const ctxCopy=byId("ctxCopyImage");
  const ctxSave=byId("ctxSaveImage");
  const ctxOpen=byId("ctxOpenPreview");
  const previewCopy=byId("copyPreviewImage");
  const previewSave=byId("savePreviewImage");
  const previewClose=byId("closePreviewImage");
  const overlay=byId("imagePreviewOverlay");
  const exportJpgBtn=byId("exportJpg");
  const exportPdfBtn=byId("exportPdf");

  if(ctxCopy){
    ctxCopy.addEventListener("click",async e=>{
      e.preventDefault();
      e.stopPropagation();
      try{
        if(!__contextBlob){
          setExportStatus("Ảnh chưa chuẩn bị xong, vui lòng đợi nút sáng rồi bấm lại.","err");
          return;
        }
        const result=await copyBlobToClipboard(__contextBlob);
        hideChartContextMenu();
        if(result.method==="clipboard"){
          setExportStatus("Đã sao chép ảnh vào Clipboard.","ok");
        }else{
          setExportStatus(
            "Trình duyệt không cho copy ảnh tự động. Ảnh đã được mở; hãy chuột phải trực tiếp lên ảnh và chọn Copy image.",
            "ok"
          );
        }
      }catch(err){
        console.error(err);
        hideChartContextMenu();
        if(__contextBlob)await openPreviewFromBlob(__contextBlob);
        setExportStatus("Đã mở ảnh để bạn sao chép thủ công.","ok");
      }
    });
  }

  if(ctxSave){
    ctxSave.addEventListener("click",async e=>{
      e.preventDefault();
      e.stopPropagation();
      try{
        if(!__contextBlob){
          setExportStatus("Ảnh chưa chuẩn bị xong, vui lòng đợi nút sáng rồi bấm lại.","err");
          return;
        }
        const result=await saveBlobWithPrompt(
          __contextBlob,
          `${exportBaseFileName()}.png`,
          "image/png",
          ".png",
          "Ảnh PNG"
        );
        hideChartContextMenu();
        if(result.cancelled)setExportStatus("Đã hủy lưu ảnh.");
        else if(result.method==="share")setExportStatus("Đã mở bảng Lưu/Chia sẻ.","ok");
        else setExportStatus("Đã lưu ảnh PNG 4K.","ok");
      }catch(err){
        console.error(err);
        hideChartContextMenu();
        setExportStatus("Lưu ảnh lỗi: "+(err?.message||err),"err");
      }
    });
  }

  if(ctxOpen){
    ctxOpen.addEventListener("click",async e=>{
      e.preventDefault();
      e.stopPropagation();
      try{
        if(!__contextBlob){
          setExportStatus("Ảnh chưa chuẩn bị xong, vui lòng đợi nút sáng rồi bấm lại.","err");
          return;
        }
        await openPreviewFromBlob(__contextBlob);
        hideChartContextMenu();
      }catch(err){
        console.error(err);
        setExportStatus("Không mở được ảnh: "+(err?.message||err),"err");
      }
    });
  }

  if(previewCopy){
    previewCopy.addEventListener("click",async e=>{
      e.preventDefault();
      try{
        if(!__previewBlob){
          setExportStatus("Chưa có ảnh để sao chép.","err");
          return;
        }
        const result=await copyBlobToClipboard(__previewBlob);
        if(result.method==="clipboard"){
          setExportStatus("Đã sao chép ảnh vào Clipboard.","ok");
        }else{
          setExportStatus(
            "Hãy chuột phải/nhấn giữ trực tiếp lên ảnh và chọn Copy image.",
            "ok"
          );
        }
      }catch(err){
        console.error(err);
        setExportStatus("Không copy tự động được; hãy dùng menu trên chính ảnh.","err");
      }
    });
  }

  if(previewSave){
    previewSave.addEventListener("click",async e=>{
      e.preventDefault();
      try{
        await savePreviewImage();
      }catch(err){
        console.error(err);
        setExportStatus("Lưu ảnh lỗi: "+(err?.message||err),"err");
      }
    });
  }

  if(previewClose)previewClose.addEventListener("click",closeImagePreview);

  if(overlay){
    overlay.addEventListener("click",e=>{
      if(e.target===overlay)closeImagePreview();
    });
  }

  if(exportJpgBtn){
    exportJpgBtn.addEventListener("click",()=>{
      exportChartJpg().catch(err=>{
        console.error(err);
        setExportStatus("Xuất ảnh lỗi: "+(err?.message||err),"err");
        alert("Xuất ảnh chưa thành công: "+(err?.message||err));
      });
    });
  }

  if(exportPdfBtn){
    exportPdfBtn.addEventListener("click",()=>{
      exportChartPdf().catch(err=>{
        console.error(err);
        setExportStatus("Xuất PDF lỗi: "+(err?.message||err),"err");
      });
    });
  }

  document.addEventListener("click",e=>{
    const menu=byId("chartContextMenu");
    if(menu && !menu.contains(e.target))hideChartContextMenu();
  });
  window.addEventListener("blur",hideChartContextMenu);
  window.addEventListener("resize",hideChartContextMenu);
  document.addEventListener("scroll",hideChartContextMenu,true);
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bindInteractiveImageActions,{once:true});
}else{
  bindInteractiveImageActions();
}

document.querySelector("#showTamPhuong").addEventListener("change",render);
document.querySelector("#kinhDaSchool").addEventListener("change",render);
document.querySelector("#annualMode").addEventListener("change",()=>{
  hideStarHelp();
  syncPopupToggleVisibility();
  syncAnnualGoodDaysVisibility();
  syncPhiLayerVisibility();
  __phiSelectedSource=null;
  render();
});
const phiLayerSelect=document.querySelector("#phiLayer");
if(phiLayerSelect)phiLayerSelect.addEventListener("change",()=>{hideStarHelp();__phiSelectedSource=null;updatePhiLayerNote();render();});
const viewLunarMonthSelect=document.querySelector("#viewLunarMonth");
if(viewLunarMonthSelect)viewLunarMonthSelect.addEventListener("change",render);
const showGoodDaysToggle=document.querySelector("#showGoodDays");
if(showGoodDaysToggle)showGoodDaysToggle.addEventListener("change",render);
const disablePopupToggle=document.querySelector("#disablePopup");
if(disablePopupToggle){
  disablePopupToggle.addEventListener("change",()=>{
    if(disablePopupToggle.checked)hideStarHelp();
  });
}
syncPopupToggleVisibility();
syncAnnualGoodDaysVisibility();
syncPhiLayerVisibility();
document.querySelector("#exportOrientation").addEventListener("change",()=>setExportStatus(""));
const stableColorToggle=document.querySelector("#stableExportColors");
if(stableColorToggle){
  stableColorToggle.addEventListener("change",()=>{
    setExportStatus(
      stableColorToggle.checked
        ? "Khóa màu khi xuất: BẬT."
        : "Khóa màu khi xuất: TẮT."
    );
  });
}
const blackWhiteToggle=document.querySelector("#blackWhiteExport");
if(blackWhiteToggle){
  blackWhiteToggle.addEventListener("change",()=>{
    setExportStatus(
      blackWhiteToggle.checked
        ? "Xuất đen trắng: BẬT cho PDF và ảnh."
        : "Xuất đen trắng: TẮT; PDF và ảnh sẽ giữ màu."
    );
  });
}
document.querySelector("#viewYear").addEventListener("change",()=>{updatePhiLayerNote();render();});
document.querySelector("#calendarType").addEventListener("change",e=>{
  const lunar=e.target.value==="lunar";
  document.querySelector("#dateLabel").textContent=lunar?"Ngày sinh âm lịch":"Ngày sinh dương lịch";
  document.querySelector("#leapRow").classList.toggle("hidden",!lunar);
  updateSouthVietnamTimeNote();
});
["southVietnamHistorical","birthDay","birthMonth","birthYear","hour","minute"].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener("change",updateSouthVietnamTimeNote);
});
updateSouthVietnamTimeNote();
bindStarHelpPopup();
bindPalaceCanChiHelpPopup();
bindChartConceptHelpPopup();
bindPhiTuHoaHelpPopup();

/* Viewer responsive: resize chỉ đổi scale toàn khung, không dàn lại lá số. */
window.addEventListener('resize',scheduleFixedPaperViewer,{passive:true});
if(typeof ResizeObserver!=='undefined'){
  const __paperWrapObserver=new ResizeObserver(()=>scheduleFixedPaperViewer());
  const __paperWrap=document.querySelector('.paper-wrap');
  if(__paperWrap)__paperWrapObserver.observe(__paperWrap);
}
if(document.fonts?.ready){
  document.fonts.ready.then(scheduleFixedPaperViewer).catch(()=>{});
}

render();
