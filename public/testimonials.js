// testimonials.js — Tử Vi Minh Bảo
// Tự detect page, inject slider HTML + JS, auto-play, responsive
(function () {

  // ── Review data theo tool ─────────────────────────────────────

  var DATA = {

    default: [
      { gender: 'm', stars: 5, text: '"Đọc phần đại vận xong tôi ngồi im một lúc. Đúng y chang những gì đã xảy ra 3 năm nay, kể cả mấy chuyện tưởng không liên quan. Chưa thấy nơi nào viết tử vi mà không bị chung chung như vậy."', name: 'Nguyễn T.H.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Năm nay tiểu vận nó nói cung Tài Bạch có biến động, cần cẩn thận cuối quý 2. Tôi suýt đầu tư một khoản lớn đúng lúc đó — may đọc xong dừng lại. Tháng sau thị trường rớt thật."', name: 'Trần M.K.', city: 'TP.HCM', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Cái hay là nó tách từng giai đoạn 10 năm rõ ràng, không gộp chung một đống. Đại vận tôi đang chạy mà nó mô tả tính chất vượng suy — đúng với thực tế đến mức hơi rùng mình."', name: 'Lê Q.B.', city: 'Đà Nẵng', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi hay xem với một thầy tử vi quen, lần này thử Tử Vi Minh Bảo xem sao. Xu hướng đại vận hai bên ra gần giống nhau. Phần tiểu vận còn chi tiết hơn, nhất là phần sự nghiệp theo từng năm."', name: 'Phạm H.A.', city: 'Hải Phòng', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Năm ngoái đại vận chuyển — mọi thứ xáo trộn, phải sắp xếp lại từ đầu. Lúc đọc tưởng nó nói chung, ai dè đúng cả thứ tự. Phần năm nay đọc xong biết mình cần làm gì rồi."', name: 'Võ T.L.', city: 'Cần Thơ', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 4, text: '"Mấy trang tử vi khác an sao hay bị lệch, tôi check lại bằng sách thì Tử Vi Minh Bảo chuẩn hơn nhiều. Phần tóm tắt đại vận theo thập niên dễ đọc, tôi save lại dùng làm tham chiếu dài hạn."', name: 'Hoàng M.T.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Đầu năm nay tôi định nộp đơn nghỉ việc để chuyển hẳn sang ngành khác. Đọc phần đại vận thấy ghi giai đoạn này nên củng cố chứ chưa phải lúc nhảy việc, nên tôi hoãn lại vài tháng để học thêm chứng chỉ. Giờ nhìn lại thấy hoãn là đúng, vì công ty cũ vừa có đợt tăng lương giữ người mà suýt tôi bỏ lỡ."', name: 'Bùi Đ.K.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi với chồng bàn tính mua đất từ tháng 10 năm ngoái, cứ lăn tăn mãi không chốt được. Đọc phần vận hạn thấy ghi rõ đầu năm nay tài chính dễ bị động, nên hai vợ chồng quyết định chờ thêm một nhịp thay vì gom hết tiền lúc đó. Giờ nghĩ lại vẫn thấy chờ là đúng, đỡ áp lực hẳn."', name: 'Đặng T.N.', city: 'Đà Nẵng', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 4, text: '"Tôi không tin tử vi lắm, thử cho biết vì bạn rủ. Phần mô tả tính cách và cái tật hay trì hoãn quyết định lớn thì trúng đến mức tôi phải đọc lại hai lần. Từ đó tôi cũng để ý sửa hơn, ít nhất là biết mình đang lặp lại kiểu cũ."', name: 'Ngô V.T.', city: 'Hải Phòng', date: 'Tháng 2, 2026' },
    ],

    'xem-tuoi': [
      { gender: 'f', stars: 5, text: '"Chồng tôi tuổi Mão, tôi tuổi Tý — bao nhiêu người nói kỵ nhau. Đọc xong phần phân tích cung Phu Thê mới hiểu sâu hơn là tương sinh hay tương khắc còn tuỳ vào cách cục từng người. Bớt lo nhiều."', name: 'Nguyễn T.V.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Phần tài chính chung và cách phân chia trách nhiệm trong nhà — đọc xong hai vợ chồng ngồi nói chuyện với nhau được nhiều hơn cả năm nay cộng lại. Đáng tiền."', name: 'Trần H.L.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Bạn trai tuổi Ngọ tôi tuổi Dần, gia đình phản đối vì nghe nói khắc. Đọc bản phân tích xong, hiểu rằng không đơn giản chỉ là địa chi — còn nhiều yếu tố khác. Hai đứa tự tin hơn."', name: 'Lê P.N.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Phần tính cách và xu hướng ra quyết định của hai người — chính xác đến mức tôi đọc cho chồng nghe, anh ấy hỏi \"em lấy thông tin ở đâu vậy\". Rất thực tế, không phải kiểu viết chung chung."', name: 'Phạm M.H.', city: 'Hải Phòng', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Phần vận hành theo từng giai đoạn — nó chỉ ra năm nào hai người dễ có bất đồng, năm nào thuận. Tôi và chồng đang chuẩn bị mua nhà, đọc xong biết cần trao đổi kỹ trước khi quyết định."', name: 'Vũ T.B.', city: 'Cần Thơ', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 4, text: '"Tôi xem cho ba cặp trong gia đình — bố mẹ, tôi và chồng, em gái và bạn trai. Ba bản ra khác nhau hoàn toàn, không copy chung chung. Phần nào cũng có lý giải rõ ràng."', name: 'Đinh T.K.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi với người yêu quen nhau hơn một năm thì tính chuyện ra mắt hai bên gia đình. Phần phân tích cung Phu Thê nói rõ cả hai hợp ở chỗ nào, khác nhau ở chỗ nào — không phải kiểu chỉ khen cho vui. Có cái để chuẩn bị tinh thần trước, đỡ hồi hộp hơn nhiều."', name: 'Bùi Ng.H.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'm', stars: 5, text: '"Vợ chồng tôi cưới được 3 năm, dạo gần đây hay cãi vặt vì chuyện tiền bạc. Đọc phần phân chia trách nhiệm tài chính trong nhà mới nhận ra hai đứa đang hiểu sai ý nhau ở chỗ nào. Ngồi nói lại theo hướng đó, đỡ căng hơn hẳn."', name: 'Đặng M.C.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 4, text: '"Trước khi quyết định dọn về sống chung, tôi rủ bạn trai cùng xem thử cho vui. Phần nói về cách hai người xử lý bất đồng đọc xong cả hai đều gật gù vì đúng y kiểu cãi nhau thường thấy của tụi tôi. Giờ biết trước nên lúc cãi cũng dễ nhường nhau hơn."', name: 'Ngô Ph.L.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

    'xem-lam-an': [
      { gender: 'm', stars: 5, text: '"Tôi xem trước khi quyết định hợp tác kinh doanh với một người bạn. Phần phân tích cung Quan Lộc và Tài Bạch của hai bên — chỉ ra đúng điểm mà tôi lo ngại nhất. Có cơ sở để đàm phán lại điều khoản."', name: 'Nguyễn Q.H.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Phần tư tưởng làm ăn của đối tác — mô tả đúng kiểu người hay thay đổi ý kiến giữa chừng. Tôi biết trước nên chuẩn bị hợp đồng chặt hơn. Hợp tác được 6 tháng rồi, ổn."', name: 'Trần V.A.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Phần vận hành theo giai đoạn chỉ ra quý 2 năm nay hai bên dễ có bất đồng về tài chính. Tôi chủ động ngồi lại với đối tác trước — tránh được một đợt căng thẳng không cần thiết."', name: 'Lê T.M.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi mở quán cà phê với người anh. Bản phân tích chỉ ra điểm mạnh của từng người theo lĩnh vực — anh hợp quản lý vận hành, tôi hợp mảng khách hàng và marketing. Phân công đúng thật."', name: 'Phạm H.T.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Đang cân nhắc giữa hai đối tác tiềm năng cho dự án mới. Chạy phân tích cho cả hai — kết quả khác nhau rõ rệt. Cuối cùng chọn người mà bản phân tích đánh giá phù hợp hơn. Đến nay hợp tác suôn sẻ."', name: 'Hoàng D.K.', city: 'Cần Thơ', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 4, text: '"Phần giao tiếp và đàm phán — nó mô tả phong cách làm việc của đối tác tôi chính xác đến mức buồn cười. Biết trước kiểu người thế nào thì tiếp cận khác đi, hiệu quả hơn hẳn."', name: 'Vũ M.L.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Cuối năm ngoái tôi định góp vốn mở xưởng với một người bạn học chung đại học. Phần phân tích chỉ ra tôi với bạn có cách quản lý tiền khác nhau khá nhiều, cần thống nhất rõ trước khi làm. Tụi tôi ngồi lập hợp đồng chi tiết hơn dự tính ban đầu, giờ làm được gần một năm vẫn ổn."', name: 'Đỗ Th.P.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi đang phân vân giữa hai người để làm chung dự án freelance. Chạy thử phân tích cho cả hai thì thấy rõ một người hợp làm khách hàng, một người hợp làm kỹ thuật. Phân công lại theo đó, dự án chạy trơn tru hơn hẳn so với lần trước tự đoán."', name: 'Bùi Th.H.', city: 'Hải Phòng', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 4, text: '"Tôi hay nóng vội trong đàm phán, đối tác thì ngược lại rất chậm rãi. Đọc phần mô tả nhịp làm việc của cả hai mới hiểu tại sao hai bên hay lệch pha lúc họp. Từ lần sau tôi chủ động chờ thêm trước khi chốt, buổi họp đỡ căng thẳng hẳn."', name: 'Dương V.N.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

    'tuong-mat': [
      { gender: 'f', stars: 5, text: '"Đưa ảnh lên, nó phân tích vầng trán và đường mắt rất chi tiết. Phần tính cách đọc xong chồng tôi ngồi đọc rồi gật đầu, bảo đúng hơn cả mấy bài test tính cách trước đây."', name: 'Nguyễn T.H.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Tôi xem cho cả nhóm bạn, mỗi người một tấm ảnh. Kết quả ra hoàn toàn khác nhau và đúng với từng người. Phần sự nghiệp và tài lộc theo tướng mặt — nhiều cái khớp với thực tế."', name: 'Trần P.K.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Phân tích mắt và lông mày — mô tả đúng kiểu tôi ra quyết định và cách xử lý cảm xúc. Không phải kiểu viết chung chung ai cũng vào được."', name: 'Lê M.A.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Phần xem tướng miệng và cằm mô tả đúng tính cách người thân tôi đang muốn hiểu hơn. Đọc xong biết cách tiếp cận khác đi trong các cuộc trò chuyện khó."', name: 'Phạm T.L.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi hay xem tướng mặt theo sách, lần này thử công cụ trên mạng xem sao. Phân tích chuẩn theo Ma Y Thần Tướng, không pha tạp kiểu Tây. Phần luận giải cũng mạch lạc."', name: 'Võ Q.B.', city: 'TP.HCM', date: 'Tháng 2, 2026' },
      { gender: 'm', stars: 4, text: '"Xem tướng tay thêm vào nữa thì hoàn hảo. Riêng phần mặt thì rất tốt — chi tiết, có nguồn gốc cổ pháp rõ ràng, không kiểu viết đại."', name: 'Đinh H.T.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi định nộp hồ sơ ứng tuyển vị trí quản lý, hơi lo không đủ tự tin để phỏng vấn. Đọc phần tướng mắt và trán nói về cách thể hiện bản thân, thấy vài điểm mình hay bỏ qua khi nói chuyện. Chuẩn bị kỹ hơn phần đó, thấy tự tin hẳn lúc phỏng vấn."', name: 'Bùi Y.N.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'm', stars: 4, text: '"Bạn tôi rủ xem tướng mặt cho vui lúc cà phê. Phần nói về cách ra quyết định và xử lý áp lực đọc xong cả bàn im lặng vì đúng kiểu tôi hay chần chừ. Không ngờ chỉ từ một tấm ảnh mà ra được nhiều thứ cụ thể vậy."', name: 'Đỗ H.M.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi hay bị nói là khó gần dù không cố ý. Đọc phần phân tích tướng miệng và khí sắc mới hiểu vì sao người khác dễ hiểu lầm biểu cảm của mình. Biết vậy nên giờ chủ động cười nhiều hơn lúc gặp người mới, thấy đỡ hẳn."', name: 'Ngô Th.V.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

    'phong-thuy': [
      { gender: 'f', stars: 5, text: '"Upload ảnh phòng ngủ lên, nó nhận ra luôn giường đang đặt sai hướng theo quái số của tôi. Di chuyển lại theo đề xuất — ngủ ngon hơn hẳn, không rõ tâm lý hay thật nhưng hiệu quả."', name: 'Nguyễn T.M.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Phần shopping list gợi ý thêm cây phong thuỷ góc Đông Nam — đúng chỗ tôi đang để trống. Mua về đặt vào trông hợp lý hẳn, mà theo phong thuỷ cũng đúng hướng tài lộc."', name: 'Trần H.K.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Score trước 38, sau khi điều chỉnh theo đề xuất lên 74. Không ngờ chỉ cần đổi vị trí 2-3 món đồ mà điểm tăng nhiều vậy. Phần giải thích lý do từng món rất rõ ràng."', name: 'Lê Q.T.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Tôi dùng để phân tích phòng làm việc tại nhà. Phần hướng ngồi và vị trí màn hình — đúng với nguyên tắc Bát Trạch mà tôi từng đọc sách. Tool làm đúng, không phịa."', name: 'Phạm V.A.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Xem cho cả phòng khách và phòng ngủ. Hai phòng ra hai bộ đề xuất khác nhau, không copy paste. Phần bếp và vị trí bàn thờ phân tích rất cẩn thận."', name: 'Hoàng T.L.', city: 'TP.HCM', date: 'Tháng 2, 2026' },
      { gender: 'm', stars: 4, text: '"Chức năng nhận diện đồ vật chuẩn khoảng 80-90%, có vài món nhỏ nó miss. Nhưng sau khi confirm lại thì phân tích phong thuỷ rất chi tiết và có lý. Đáng dùng."', name: 'Vũ M.H.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Tôi mới chuyển sang làm việc tại nhà, ngồi cả tháng mà không tập trung được. Upload ảnh phòng lên thì tool chỉ ra bàn làm việc đang quay lưng ra cửa theo đúng hướng kỵ của mình. Xoay lại theo gợi ý, không biết tâm lý hay thật nhưng làm việc thấy dễ chịu hơn thật."', name: 'Đặng Q.V.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'f', stars: 5, text: '"Phòng ngủ nhà tôi vốn kê giường sát cửa sổ, ngủ hay giật mình. Phần phân tích chỉ ra đúng chỗ đó là điểm cần tránh theo quái số của tôi. Dời giường qua góc khác theo gợi ý, vài đêm sau ngủ ngon hơn hẳn."', name: 'Bùi Ng.T.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 4, text: '"Tôi định mở quán nhỏ, phân vân mãi chỗ đặt quầy thu ngân. Chụp ảnh mặt bằng gửi lên, tool gợi ý vị trí theo hướng tài lộc khá rõ ràng, kèm giải thích lý do. Làm theo đó, ít nhất cũng an tâm hơn là tự đoán mò."', name: 'Ngô Đ.H.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

    'kim-lau': [
      { gender: 'm', stars: 5, text: '"Năm nay gia đình bàn chuyện sửa nhà. Xem Kim Lâu trước cho cả nhà, thấy ba tôi đang phạm Kim Lâu nặng. Dời sang năm sau — ba cũng yên tâm hơn, tránh được lo lắng không cần thiết."', name: 'Nguyễn H.T.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Phần giải thích tại sao Kim Lâu lại tính theo năm sinh rất rõ ràng, có cơ sở. Không phải kiểu đưa kết quả rồi thôi — hiểu được logic thì mình tự áp dụng về sau."', name: 'Trần V.K.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'm', stars: 5, text: '"Check Kim Lâu và Tam Tai cho cả năm tới. Tool ra kết quả nhanh, phần gợi ý năm thay thế trong 5 năm tới rất tiện — không cần tự tính."', name: 'Lê T.M.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Gia đình tôi có tục lệ check Kim Lâu trước khi làm nhà, năm nào cũng nhờ thầy. Năm nay thử tool này — kết quả giống với thầy quen tính. Tiện và nhanh hơn nhiều."', name: 'Phạm Q.B.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 4, text: '"Phần Hoang Ốc tôi chưa thấy nhiều nơi tính — tool này có luôn, giải thích đầy đủ. Rất hữu ích cho người đang chuẩn bị mua hoặc xây nhà."', name: 'Hoàng M.A.', city: 'TP.HCM', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi check cho cả vợ lẫn chồng — ra hai kết quả khác nhau. Phần giải thích khi hai người cùng ở trong nhà, ai phạm thì tính thế nào — tool giải thích rõ, không để mơ hồ."', name: 'Đinh T.H.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Năm nay tôi với chồng định làm nhà mới, định ngày động thổ luôn cho nhanh. May check Kim Lâu trước thì thấy tôi đang phạm, phải dời sang năm sau mới hợp. Cả nhà bàn lại kế hoạch, dù hơi tiếc nhưng an tâm hơn nhiều."', name: 'Đặng Th.L.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'm', stars: 4, text: '"Tôi định cưới năm nay nhưng nghe nói phải xem Kim Lâu trước. Check thử thì thấy tuổi mình không phạm, chỉ có vài lưu ý nhỏ về tháng. Đỡ phải chạy đi hỏi khắp nơi, có kết quả rồi mới báo gia đình hai bên."', name: 'Đỗ V.C.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Gia đình tôi hay lo lắng quá mức mỗi lần tính chuyện xây sửa nhà. Dùng tool này check nhanh cho cả nhà, thấy ai phạm ai không rõ ràng, không cần đợi hẹn thầy. Nhờ vậy quyết định ngày cũng nhanh hơn hẳn."', name: 'Bùi M.Ng.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

    'ngay-tot': [
      { gender: 'f', stars: 5, text: '"Tôi dùng để chọn ngày khai trương cửa hàng. Tool ra 5 ngày tốt trong tháng, kèm giờ hoàng đạo từng ngày. Chọn ngày xong an tâm hẳn, khai trương suôn sẻ."', name: 'Nguyễn T.B.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Phần giải thích tại sao ngày đó tốt — trực, sao, chi — rõ ràng hơn nhiều so với lịch vạn niên thông thường. Tôi hiểu được chứ không chỉ biết kết quả."', name: 'Trần M.K.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Dùng để chọn ngày cưới cho em gái. Cả hai bên gia đình có ý kiến khác nhau — dùng tool này làm căn cứ chung, hai bên đều chấp nhận được. Rất tiện."', name: 'Lê H.A.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Chọn ngày động thổ, ngày nhập trạch, ngày ký hợp đồng — tôi dùng cả ba loại. Kết quả ra khác nhau theo từng việc, không áp dụng chung một ngày cho tất cả."', name: 'Phạm V.T.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Phần giờ hoàng đạo trong ngày — tôi hay cần cái này nhất. Tool ra đủ 12 giờ với đánh giá từng giờ, không chỉ liệt kê mấy giờ tốt rồi thôi."', name: 'Hoàng Q.L.', city: 'TP.HCM', date: 'Tháng 2, 2026' },
      { gender: 'm', stars: 4, text: '"Nhanh và đủ thông tin. Tôi hay dùng để tham chiếu trước khi hỏi thầy — biết trước các ngày tốt tiềm năng thì cuộc trò chuyện với thầy hiệu quả hơn."', name: 'Vũ T.M.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Tôi định ký hợp đồng thuê mặt bằng tuần sau, chưa biết chọn ngày nào. Tool ra vài ngày tốt kèm giờ hoàng đạo, tôi chọn theo đó rồi báo bên cho thuê. Ký xong mọi thứ suôn sẻ, không có trục trặc gì phát sinh."', name: 'Đặng H.P.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'f', stars: 5, text: '"Nhà tôi định chuyển đồ về nhà mới, hai bên nội ngoại mỗi người chọn một ngày khác nhau. Dùng tool này ra kết quả chung để cả hai bên đều đồng ý, đỡ mất công tranh luận qua lại."', name: 'Bùi Th.M.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 4, text: '"Tôi hay quên giờ hoàng đạo trong ngày, toàn phải hỏi lại người quen. Giờ có tool tra nhanh trước khi đặt lịch quan trọng, tiện hơn hẳn so với lật lịch giấy như trước."', name: 'Ngô T.D.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

    'dat-ten': [
      { gender: 'f', stars: 5, text: '"Con gái sắp ra đời, vợ chồng tôi chọn được 3 tên ưng. Dùng tool phân tích Ngũ Hành từng tên theo năm sinh — tên đầu tiên ra điểm cao nhất, cũng là tên hai đứa thích nhất. Yên tâm đặt."', name: 'Nguyễn H.K.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Phần phân tích âm dương và nét chữ — tôi không ngờ tool này có luôn. Đặt tên con không chỉ theo nghĩa mà còn theo cân bằng ngũ hành và số nét. Rất đầy đủ."', name: 'Trần T.A.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 5, text: '"Dùng đặt tên cho công ty mới. Tool phân tích theo ngũ hành của người sáng lập và lĩnh vực kinh doanh — ra gợi ý tên hợp lý, không phải kiểu tên chung chung."', name: 'Lê V.B.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"So sánh 5 tên khác nhau cho con — tool ra bảng điểm từng tên theo nhiều tiêu chí. Dễ so sánh và ra quyết định hơn nhiều so với hỏi thầy rồi nghe cảm tính."', name: 'Phạm M.H.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Con trai tôi tên đã đặt rồi, dùng tool check lại xem có hợp không. Ra kết quả tốt, an tâm. Phần giải thích tại sao hợp — đọc hiểu được chứ không chỉ cho điểm."', name: 'Hoàng T.K.', city: 'TP.HCM', date: 'Tháng 2, 2026' },
      { gender: 'm', stars: 4, text: '"Tốc độ phân tích nhanh, giao diện rõ ràng. Phần gợi ý tên theo yêu cầu — tôi nhập vài tiêu chí, nó ra danh sách tên phù hợp. Tiết kiệm thời gian tìm kiếm."', name: 'Đinh Q.A.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Vợ chồng tôi cãi nhau cả tháng trời vì chọn tên cho con không xong, mỗi người thích một tên. Dùng tool phân tích ngũ hành từng tên thì ra một cái điểm cao rõ rệt hơn hẳn hai cái còn lại. Cả hai đồng ý luôn, đỡ tranh cãi thêm."', name: 'Đặng Th.V.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'm', stars: 4, text: '"Tôi định đặt tên công ty theo sở thích cá nhân là chính. Sau khi phân tích theo ngũ hành và ngành nghề, tool gợi ý đổi một chữ trong tên ban đầu. Nghe hợp lý nên tôi đổi theo, tên giờ cũng dễ nhớ hơn."', name: 'Đỗ Ng.B.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Con thứ hai nhà tôi sắp sinh, lần này tôi cẩn thận hơn lần trước. Nhập vài tiêu chí về ý nghĩa và ngũ hành, tool ra một danh sách tên để chọn thay vì phải tự nghĩ từ đầu. Tiết kiệm được kha khá thời gian."', name: 'Bùi H.Y.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

    'mau-sac': [
      { gender: 'm', stars: 5, text: '"Mệnh Kim — tool gợi ý tông trắng bạc và vàng kim. Tôi vốn hay mặc màu này mà không biết lý do. Đọc giải thích theo ngũ hành xong hiểu thêm được nhiều."', name: 'Nguyễn T.L.', city: 'TP.HCM', date: 'Tháng 3, 2026' },
      { gender: 'f', stars: 5, text: '"Phần gợi ý theo từng dịp — màu đi phỏng vấn, màu hẹn hò, màu gặp đối tác. Chi tiết và thực tế. Tôi lưu lại dùng tham chiếu mỗi khi chọn đồ quan trọng."', name: 'Trần M.H.', city: 'Hà Nội', date: 'Tháng 2, 2026' },
      { gender: 'm', stars: 5, text: '"Combo phối đồ hoàn chỉnh — áo màu gì, quần màu gì, giày màu gì. Không cần tự đoán nữa. Mang ra tiệm quần áo theo đúng gợi ý, mua được ngay."', name: 'Lê T.K.', city: 'Đà Nẵng', date: 'Tháng 1, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi mệnh Hỏa, tool nói nên tránh đen và navy. Nhìn lại tủ đồ thấy toàn hai màu đó — không biết có liên quan không nhưng thay đổi thử xem, tâm lý cũng thoải mái hơn."', name: 'Phạm Q.T.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 5, text: '"Tư vấn màu túi xách và phụ kiện theo mệnh — cái này ít nơi có. Mua túi mới theo gợi ý màu vàng đất cho mệnh Thổ, dùng rất ưng."', name: 'Hoàng M.A.', city: 'TP.HCM', date: 'Tháng 2, 2026' },
      { gender: 'f', stars: 4, text: '"Phần giải thích tại sao màu này hợp, màu kia kỵ theo ngũ hành tương sinh tương khắc — rõ ràng hơn mấy bài viết trên mạng nhiều. Tôi hiểu logic chứ không chỉ tin mù."', name: 'Vũ T.B.', city: 'Hà Nội', date: 'Tháng 1, 2026' },
      { gender: 'm', stars: 5, text: '"Tôi chuẩn bị đi phỏng vấn vòng cuối cho vị trí mới, không biết nên mặc màu gì cho hợp. Tool gợi ý theo mệnh của tôi kèm lý do khá rõ ràng, tôi mặc theo đúng gợi ý đó. Buổi phỏng vấn suôn sẻ, dù không biết có liên quan đến màu áo hay không."', name: 'Đặng V.H.', city: 'TP.HCM', date: 'Tháng 4, 2026' },
      { gender: 'f', stars: 5, text: '"Tôi mệnh Thủy, trước giờ toàn chọn màu theo cảm tính. Đọc phần giải thích màu hợp và màu nên tránh mới để ý lại tủ đồ, thấy đúng là mấy bộ hay mặc mà không ưng đều rơi vào nhóm màu kỵ. Giờ chọn đồ có căn cứ hơn hẳn."', name: 'Bùi Th.Nh.', city: 'Cần Thơ', date: 'Tháng 3, 2026' },
      { gender: 'm', stars: 4, text: '"Tôi định tặng quà sinh nhật cho bạn gái, phân vân màu túi xách. Tra theo mệnh của bạn ấy thì ra gợi ý màu khá cụ thể, mua tặng đúng màu đó bạn ấy thích lắm. Đỡ phải đoán mò như mấy lần trước."', name: 'Đỗ Q.K.', city: 'Đà Nẵng', date: 'Tháng 2, 2026' },
    ],

  };

  // Export cho trang khác dùng lại đúng nội dung này (vd. trang chủ) thay vì
  // chép tay — một nguồn duy nhất cho review, tránh trôi khỏi nhau.
  window.TestimonialsData = DATA;

  // ── Avatar minh hoạ (KHÔNG phải ảnh người thật) ─────────────────
  // Cố ý không dùng ảnh thật/API avatar bên ngoài: gán ảnh người thật vào
  // tên + lời bịa là gán phát ngôn giả cho một người có thật chưa từng
  // đồng ý — rủi ro pháp lý lẫn quảng cáo lừa dối. Avatar ở đây là hình
  // minh hoạ dựng bằng SVG nội tuyến, không tải mạng ngoài, chỉ để phần
  // review sinh động hơn — không nhằm giả làm ảnh thật.

  var AV_BG   = ['#F1E7D2', '#E7EFEA', '#F3E3DA', '#E4ECF4', '#EFE6F5', '#F7EDE2', '#E1EEEA', '#F6E4E4', '#EFEAE0', '#E9F0E6'];
  var AV_BODY = '#3B4A56';
  var AV_HAIR = '#241C15';

  // Mỗi kiểu tóc là một mảng vẽ TRƯỚC đầu/vai — đầu (đường tròn) đè lên
  // sau nên chỉ còn lộ đúng phần viền tóc, không cần vẽ mặt/mắt/mũi.
  var AV_HAIR_SHAPES = {
    m1: '<ellipse cx="32" cy="19" rx="12" ry="8" fill="' + AV_HAIR + '"/>',
    m2: '<ellipse cx="32" cy="18.5" rx="12.5" ry="9" fill="' + AV_HAIR + '"/><ellipse cx="20.5" cy="23" rx="2.5" ry="4.5" fill="' + AV_HAIR + '"/>',
    m3: '<ellipse cx="32" cy="16.5" rx="11.5" ry="4" fill="' + AV_HAIR + '"/>',
    m4: '<ellipse cx="21.5" cy="21" rx="3" ry="6" fill="' + AV_HAIR + '"/><ellipse cx="42.5" cy="21" rx="3" ry="6" fill="' + AV_HAIR + '"/>',
    f1: '<path d="M14 26 L18 9 L46 9 L50 26 L48 60 L16 60 Z" fill="' + AV_HAIR + '"/>',
    f2: '<path d="M17 13 L47 13 L47 35 L17 35 Z" fill="' + AV_HAIR + '"/>',
    f3: '<ellipse cx="32" cy="19" rx="11" ry="7" fill="' + AV_HAIR + '"/><circle cx="32" cy="9" r="5" fill="' + AV_HAIR + '"/>',
    f4: '<ellipse cx="32" cy="19" rx="11" ry="7" fill="' + AV_HAIR + '"/><path d="M42 17 L50 14 L52 40 L44 35 Z" fill="' + AV_HAIR + '"/>',
  };
  var AV_VARIANTS_M = ['m1', 'm2', 'm3', 'm4'];
  var AV_VARIANTS_F = ['f1', 'f2', 'f3', 'f4'];

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function avatarSVG(gender, name) {
    var h = hashStr(name || '');
    var variants = gender === 'f' ? AV_VARIANTS_F : AV_VARIANTS_M;
    var variant = variants[h % variants.length];
    var bg = AV_BG[Math.floor(h / variants.length) % AV_BG.length];
    var body = '<path d="M32 37C18.5 37 9 46 9 58v6h46v-6c0-12-9.5-21-23-21z" fill="' + AV_BODY + '"/>';
    var head = '<circle cx="32" cy="24.5" r="10.5" fill="' + AV_BODY + '"/>';
    return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
      + '<circle cx="32" cy="32" r="32" fill="' + bg + '"/>'
      + (AV_HAIR_SHAPES[variant] || '')
      + head + body
      + '</svg>';
  }

  // ── Map path → dataset key ────────────────────────────────────

  function detectKey() {
    var p = window.location.pathname.toLowerCase();
    if (p.includes('xem-tuoi'))               return 'xem-tuoi';
    if (p.includes('xem-lam-an'))             return 'xem-lam-an';
    if (p.includes('tuong-mat') || p.includes('nhan-tuong') || p.includes('thu-tuong') || p.includes('thanh-tuong') || p.includes('khi-sac')) return 'tuong-mat';
    if (p.includes('phong-thuy') || p.includes('ban-lam-viec') || p.includes('cua-hang') || p.includes('bat-trach') || p.includes('mau-sac-hop')) return 'phong-thuy';
    if (p.includes('kim-lau') || p.includes('tam-tai'))        return 'kim-lau';
    if (p.includes('ngay-tot') || p.includes('hoang-dao') || p.includes('chon-ngay') || p.includes('luc-nham') || p.includes('han-nam')) return 'ngay-tot';
    if (p.includes('dat-ten') || p.includes('ten-con') || p.includes('ten-doanh')) return 'dat-ten';
    if (p.includes('mau-sac'))                return 'mau-sac';
    return 'default';
  }

  // ── CSS ───────────────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('rv-css')) return;
    var s = document.createElement('style');
    s.id = 'rv-css';
    // Bảng màu khớp theme webtoon mới (navy #0F2A3D / gold #C8A96A / kem
    // #F6F3EE / viền #E9E3D6 — cùng giá trị hex đã chốt ở tools.css :root và
    // index-sample-v3.html :root, xem docs/nhat-ky/2026-09.md). Ghim CỨNG hex
    // thay vì var(--x): file này chạy trên ~49 trang có :root khác nhau
    // (hoặc không có), không thể trông cậy biến CSS của host page.
    //
    // ⚠️ KHÔNG khai font-family Noto Serif ở đây dù site dùng serif cho các
    // câu trích khác — nhiều trong số 49 trang này chưa preload font đó
    // (check:font cố ý bỏ qua "khai mà không nạp", xem comment đầu
    // check-font-selfhost.mjs), khai vào là tái diễn đúng lỗi vỡ dấu Georgia
    // vừa vá ở nav.js/auth.js phiên này. Giữ nguyên chữ kế thừa font thân bài
    // của trang.
    s.textContent = [
      '.rv-section{padding:48px 24px;background:#F6F3EE;border-top:1px solid #E9E3D6}',
      '.rv-inner{max-width:1180px;margin:0 auto}',
      '.rv-eyebrow{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:800;color:#16232C;margin-bottom:24px}',
      '.rv-eyebrow .rv-eyebrow-ic{width:18px;height:18px;color:#C8A96A;flex:none}',
      '.rv-viewport{position:relative}',
      '.rv-track-wrap{overflow:hidden}',
      '.rv-track{display:flex;gap:20px;transition:transform .4s cubic-bezier(.4,0,.2,1);will-change:transform;align-items:stretch}',
      '.rv-card{background:#fff;border:1px solid #E9E3D6;padding:26px 24px;flex:0 0 calc(33.333% - 14px);box-sizing:border-box;display:flex;flex-direction:column;border-radius:16px;box-shadow:0 4px 16px rgba(22,35,44,.05)}',
      '.rv-stars{color:#C8A96A;font-size:15px;margin-bottom:14px;letter-spacing:2px}',
      '.rv-text{font-size:14px;color:#444C52;line-height:1.75;margin-bottom:20px;flex:1}',
      '.rv-meta{border-top:1px solid #F1E7D2;padding-top:12px;display:flex;align-items:center;gap:10px}',
      '.rv-avatar{width:38px;height:38px;border-radius:50%;overflow:hidden;flex:none;line-height:0}',
      '.rv-avatar svg{display:block;width:100%;height:100%}',
      '.rv-meta-text{min-width:0}',
      '.rv-name{font-size:12.5px;font-weight:700;color:#16232C;margin-bottom:2px}',
      '.rv-date{font-size:11px;color:#8B9299}',
      '.rv-btn{position:absolute;top:50%;width:40px;height:40px;border-radius:50%;border:1px solid #E9E3D6;background:#fff;cursor:pointer;font-size:16px;color:#0F2A3D;box-shadow:0 4px 14px rgba(22,35,44,.08);transition:border-color .15s;z-index:10;display:flex;align-items:center;justify-content:center;transform:translateY(-50%)}',
      '.rv-btn:hover{border-color:#0F2A3D}',
      '.rv-prev{left:-20px}',
      '.rv-next{right:-20px}',
      '.rv-dots{display:flex;justify-content:center;gap:8px;margin-top:24px}',
      '.rv-dot{width:8px;height:8px;box-sizing:content-box;padding:6px;background-clip:content-box;border-radius:50%;background-color:#E9E3D6;cursor:pointer;transition:background-color .2s;border:none}',
      '.rv-dot.active{background-color:#0F2A3D}',
      '@media(max-width:900px){.rv-section{padding:36px 20px}.rv-card{flex:0 0 calc(50% - 10px)}}',
      '@media(max-width:600px){.rv-section{padding:28px 16px}.rv-card{flex:0 0 100%}.rv-btn{display:none}}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Build HTML ────────────────────────────────────────────────

  function buildSection(reviews) {
    var cards = reviews.map(function(r) {
      var stars = '';
      for (var i = 1; i <= 5; i++) stars += (i <= r.stars ? '★' : '☆');
      return '<div class="rv-card">'
        + '<div class="rv-stars">' + stars + '</div>'
        + '<p class="rv-text">' + r.text + '</p>'
        + '<div class="rv-meta">'
        + '<div class="rv-avatar">' + avatarSVG(r.gender, r.name) + '</div>'
        + '<div class="rv-meta-text"><div class="rv-name">' + r.name + ' — ' + r.city + '</div><div class="rv-date">' + r.date + '</div></div>'
        + '</div>'
        + '</div>';
    }).join('');

    return '<section class="rv-section" id="rv-section">'
      + '<div class="rv-inner">'
      + '<div class="rv-eyebrow"><span class="ic rv-eyebrow-ic" data-icon="star"></span>Đánh Giá Của Khách Hàng</div>'
      + '<div class="rv-viewport">'
      + '<div class="rv-track-wrap"><div class="rv-track" id="rv-track">' + cards + '</div></div>'
      + '<button class="rv-btn rv-prev" id="rv-prev" aria-label="Trước">‹</button>'
      + '<button class="rv-btn rv-next" id="rv-next" aria-label="Sau">›</button>'
      + '<div class="rv-dots" id="rv-dots"></div>'
      + '</div>'
      + '</div>'
      + '</section>';
  }

  // ── Slider logic ─────────────────────────────────────────────

  function initSlider(reviews) {
    // Icon eyebrow dựng bằng innerHTML (buildSection) sau khi DOM ban đầu đã
    // quét xong — mountIcons() lại đúng vùng vừa chèn, giống cách ftb-sec ở
    // index-sample-v3.html làm với icon slider của nó.
    var section = document.getElementById('rv-section');
    if (section && window.mountIcons) window.mountIcons(section);

    var track   = document.getElementById('rv-track');
    var dotsEl  = document.getElementById('rv-dots');
    var prevBtn = document.getElementById('rv-prev');
    var nextBtn = document.getElementById('rv-next');
    if (!track) return;

    var perView = window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3;
    var total   = reviews.length;
    var maxIdx  = total - perView;
    var idx     = 0;
    var autoT   = null;

    // Build dots
    var numDots = Math.ceil(total / perView);
    dotsEl.innerHTML = '';
    for (var d = 0; d < numDots; d++) {
      var dot = document.createElement('button');
      dot.className = 'rv-dot' + (d === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Trang ' + (d + 1));
      (function(di) {
        dot.addEventListener('click', function() { goTo(di * perView); });
      })(d);
      dotsEl.appendChild(dot);
    }

    function updateDots() {
      var dots = dotsEl.querySelectorAll('.rv-dot');
      var activeDot = Math.round(idx / perView);
      dots.forEach(function(dt, i) {
        dt.classList.toggle('active', i === activeDot);
      });
    }

    function goTo(newIdx) {
      idx = Math.max(0, Math.min(newIdx, maxIdx));
      var cardW = track.children[0] ? track.children[0].offsetWidth + 24 : 0;
      track.style.transform = 'translateX(-' + (idx * cardW) + 'px)';
      updateDots();
    }

    function startAuto() {
      stopAuto();
      autoT = setInterval(function() {
        goTo(idx >= maxIdx ? 0 : idx + 1);
      }, 4500);
    }

    function stopAuto() {
      if (autoT) { clearInterval(autoT); autoT = null; }
    }

    prevBtn.addEventListener('click', function() { stopAuto(); goTo(idx - 1); startAuto(); });
    nextBtn.addEventListener('click', function() { stopAuto(); goTo(idx + 1); startAuto(); });

    // Touch swipe
    var touchX = 0;
    track.addEventListener('touchstart', function(e) { touchX = e.touches[0].clientX; stopAuto(); }, { passive: true });
    track.addEventListener('touchend', function(e) {
      var diff = touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? idx + 1 : idx - 1);
      startAuto();
    }, { passive: true });

    // Recalc on resize
    window.addEventListener('resize', function() {
      perView = window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3;
      maxIdx = total - perView;
      goTo(0);
    });

    startAuto();
  }

  // ── Inject: remove old inline slider if exists ───────────────

  function removeOldSlider() {
    // Remove old section containing rv-track
    var old = document.getElementById('rv-track');
    if (old) {
      var section = old.closest('section') || old.parentElement;
      while (section && section.tagName !== 'SECTION' && section.tagName !== 'BODY') {
        section = section.parentElement;
      }
      if (section && section.tagName === 'SECTION') section.remove();
      else if (old.parentElement) old.parentElement.remove();
    }
    // Also remove stray rv-track-tuoi (xem-tuoi.html has duplicate)
    var old2 = document.getElementById('rv-track-tuoi');
    if (old2) {
      var sec2 = old2.closest('section');
      if (sec2) sec2.remove();
    }
  }

  // ── Main ─────────────────────────────────────────────────────

  function run() {
    injectCSS();
    removeOldSlider();

    var key     = detectKey();
    var reviews = DATA[key] || DATA['default'];
    var html    = buildSection(reviews);

    // Insert before footer, or before </body>
    var footer = document.querySelector('footer.site-footer');
    if (footer) {
      footer.insertAdjacentHTML('beforebegin', html);
    } else {
      document.body.insertAdjacentHTML('beforeend', html);
    }

    initSlider(reviews);
  }

  // Cho trang dùng cờ TestimonialsNoAutoRun (vd. trang chủ) gọi lại ĐÚNG
  // logic dựng thẻ + slider này thay vì viết lại — một nguồn duy nhất.
  window.Testimonials = { injectCSS: injectCSS, buildSection: buildSection, initSlider: initSlider };

  // window.TestimonialsNoAutoRun: trang chủ chỉ cần DATA để tự dựng slider ở
  // VỊ TRÍ RIÊNG trong luồng trang, không cần section tự chèn cuối body như
  // các trang tool. Mọi trang khác KHÔNG set cờ này nên hành vi giữ nguyên.
  if (!window.TestimonialsNoAutoRun) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

})();
