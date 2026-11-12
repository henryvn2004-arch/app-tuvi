// lib/engine/cong-so-terms.ts
// ============================================================
// TỬ VI CÔNG SỞ — bảng CHỮ + khuôn câu (tách khỏi `cong-so.ts`, W30b).
//
// THUẦN dữ liệu + hai hàm dựng câu, KHÔNG import engine: để `scripts/check-terms.mjs` nạp được bản biên dịch của
// riêng file này và `lib/i18n/long.mjs` (`loadCongSo`) đọc bảng bằng AST. Chữ Việt ở đây là NGUỒN — rail/prompt/
// payload vẫn nhận đúng chữ này; bản dịch ở client tra theo mã (docs/i18n/QUY-UOC.md "Văn engine server").
// ============================================================

export type KieuId = 'khai-sang' | 'lanh-dao' | 'ho-tro' | 'hop-tac';

/** Tình trạng nghề nghiệp người xem tự khai. CỐ Ý là một trường NGƯỜI DÙNG
 * NHẬP chứ không suy từ lá số: lá số nói thiên hướng, nó không biết hôm nay
 * người ta đang làm thuê hay đã ra riêng — mà lời khuyên cho hai người đó
 * khác hẳn nhau. Một ô chọn 5 dòng đổi được giọng cả bản đọc. */
export type TrangThai = 'nhan-vien' | 'quan-ly' | 'chu' | 'tu-do' | 'dang-tim';

export const TRANG_THAI_LABEL: Record<TrangThai, string> = {
  'nhan-vien': 'Nhân viên làm thuê',
  'quan-ly': 'Quản lý làm thuê',
  chu: 'Chủ doanh nghiệp',
  'tu-do': 'Làm tự do / nghề riêng',
  'dang-tim': 'Đang tìm việc / chuyển hướng',
};

export interface KieuDef {
  id: KieuId;
  ten: string;
  /** Tên tứ tượng gốc — hiện trên trang để người đọc biết nhãn từ đâu ra. */
  tuTuong: string;
  amDuong: 'duong' | 'am';
  saoNhom: string[];
  /** Một câu tóm — dùng làm phụ đề, làm caption ảnh. */
  motCau: string;
  /** Cái người ta thật sự đuổi theo, dưới mọi mục tiêu bề mặt. */
  dongLuc: string;
  /** Cách hành xử nhận ra ngay ở chỗ làm. */
  datChat: string;
  /** Câu hỏi chạy ngầm trong đầu trước mỗi quyết định. Đây là phần người đọc
   * hay giật mình nhất — nó tả CÁCH NGHĨ chứ không tả thành tích. */
  cauHoi: string[];
  /** Cách dẫn người khi được giao quyền. */
  kieuDan: string;
  moiTruongHop: string;
  moiTruongKy: string;
  manh: string;
  yeu: string;
  /** Bốn việc phải học khi lần đầu cầm quân. Phần bán được tiền: nó là việc
   * làm được, không phải lời mô tả. */
  baiHoc: string[];
  source: string;
}

export const KIEU: Record<KieuId, KieuDef> = {
  'khai-sang': {
    id: 'khai-sang',
    ten: 'Khai sáng',
    tuTuong: 'Lão dương (老陽) — dương trong dương',
    amDuong: 'duong',
    saoNhom: ['Thất Sát', 'Phá Quân', 'Liêm Trinh', 'Tham Lang'],
    motCau: 'Mở đường, phá cục, chịu được rủi ro mà người khác né',
    dongLuc: 'Không chịu được cảm giác thua và cảm giác giậm chân tại chỗ. Cái thúc bạn đi không phải phần thưởng mà là việc chưa ai làm được.',
    datChat:
      'Xông lên trước rồi mới tính, quyết nhanh, chịu trách nhiệm thay vì đùn đẩy. Hiện trạng nào cũng thấy còn có thể tốt hơn, nên hay là người đầu tiên đụng vào chỗ không ai muốn đụng.',
    cauHoi: ['Việc này thắng được không?', 'Ai đang chắn đường?', 'Có cách nào nhanh hơn không?', 'Chờ thêm thì mất gì?'],
    kieuDan: 'Ra lệnh trực tiếp — một khẩu lệnh một động tác, trọng hiệu quả hơn trọng cảm xúc.',
    moiTruongHop: 'Nơi thay đổi nhanh, thử thách cao, đo bằng kết quả chứ không đo bằng thâm niên: công ty mới, đội đặc nhiệm, mảng phải mở từ số không.',
    moiTruongKy: 'Bộ máy nhiều tầng, thăng tiến theo thâm niên, trọng lễ nghi công sở — ở đó bạn dễ thành người hay va chạm chứ không thành người được cất nhắc.',
    manh: 'Dám đi trước và kéo được người khác đi theo trong lúc chưa ai chắc đường nào đúng.',
    yeu: 'Thiếu kiên nhẫn với người chậm hơn mình; thắng xong hay quên mất phải giữ lại quan hệ.',
    baiHoc: [
      'Dẫn người cần kiên nhẫn — thứ bạn thiếu nhất, và nó không tự đến theo chức vụ.',
      'Vừa có quyền là dễ dùng quá tay: việc nhỏ cũng ra lệnh, khiến người dưới hết dám tự quyết.',
      'Làm tốt quá mà không che chắn thì thành "công cao lấn chủ" — cấp trên đề phòng trước khi bạn kịp hiểu vì sao.',
      'Giận là bỏ đi, thậm chí quay lại cạnh tranh với chỗ cũ. Mỗi lần thế mất sạch vốn quan hệ vừa gây dựng.',
    ],
    source: 'Tứ tượng lão dương; bộ Sát Phá Tham + Liêm Trinh. Đặc chất từng sao theo Tân Biên mục 4.2 (cung Mệnh) và Vương Đình Chi — Lục Thập Tinh Hệ.',
  },
  'lanh-dao': {
    id: 'lanh-dao',
    ten: 'Lãnh đạo',
    tuTuong: 'Thiếu âm (少陰) — dương ngoài, âm trong',
    amDuong: 'duong',
    saoNhom: ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'],
    motCau: 'Cầm trịch, sắp người vào đúng chỗ, dựng thứ chạy được lâu',
    dongLuc: 'Muốn là người nói ra thì người khác tin — có công tín, có chỗ đứng được thừa nhận, không phải hô hào mới có người nghe.',
    datChat:
      'Tính xong mới động, làm có thứ lớp, chuộng phương pháp và tiền lệ. Nhìn việc gì cũng thấy phải ráp lại từ nguồn lực đang có chứ không phải làm lại từ đầu.',
    cauHoi: ['Có tiền lệ nào chưa?', 'Có bản mẫu nào chạy được rồi không?', 'Ghép được với nguồn lực sẵn có không?', 'Việc này có hợp lý không?'],
    kieuDan: 'Quản theo mục tiêu — chia mốc, đặt điểm kiểm, giao rồi theo dõi tiến độ chứ không đứng cạnh chỉ tay.',
    moiTruongHop: 'Tổ chức có phân tầng và có quy chuẩn, nơi bạn ráp được người và nguồn lực: doanh nghiệp đã qua giai đoạn sống sót, mảng cần dựng lại nề nếp.',
    moiTruongKy: 'Chỗ hỗn loạn, đổi hướng liên tục, không ai giữ lời — bạn mất nhiều sức để dựng trật tự hơn là để làm việc.',
    manh: 'Nhìn ra ai mạnh chỗ nào rồi đặt đúng chỗ đó, khiến cả đội chạy nhanh hơn tổng từng người.',
    yeu: 'Trọng thể diện và tiền lệ nên dễ chậm chân ở khúc phải liều; ôm việc vì sợ người khác làm không đủ chuẩn.',
    baiHoc: [
      'Có ham muốn lãnh đạo không đồng nghĩa với biết lãnh đạo — cái thứ hai phải học riêng.',
      'Tầm nhìn rộng tới đâu quyết định cái đội lớn tới đâu; giữ khư khư quyền quyết là tự đặt trần cho chính mình.',
      'Chuộng tiền lệ dễ thành ngại thứ chưa có tiền lệ, mà chính đó là chỗ ăn tiền.',
      'Bạn cần người dám xông — thiếu một người kiểu Khai sáng bên cạnh thì kế hoạch đẹp mà không ai phá cục.',
    ],
    source: 'Tứ tượng thiếu âm; bộ Tử Phủ Liêm Vũ Tướng, cổ quyết "Tử Phủ Vũ Tướng, vị cư nhân thượng". Đặc chất từng sao theo Tân Biên 4.2 và Vương Đình Chi.',
  },
  'ho-tro': {
    id: 'ho-tro',
    ten: 'Hỗ trợ',
    tuTuong: 'Thiếu dương (少陽) — âm ngoài, dương trong',
    amDuong: 'am',
    saoNhom: ['Thái Dương', 'Cự Môn', 'Thiên Cơ'],
    motCau: 'Nghĩ ra đường đi, nói cho người khác hiểu, làm quân sư',
    dongLuc: 'Muốn được nhìn nhận là người sắc sảo và có ảnh hưởng. Không ai công nhận thì bất an, dù việc vẫn chạy.',
    datChat:
      'Phản ứng nhanh, nghĩ nhiều nước, đọc được không khí phòng họp. Thích trình bày, thích được hỏi ý kiến, và thường là người giải thích lại cho cả đội hiểu.',
    cauHoi: ['Làm sao để mọi người thấy hợp lý?', 'Mình đang được nhìn như thế nào?', 'Còn cách nào hay hơn không?', 'Ai cần được thuyết phục trước?'],
    kieuDan: 'Dẫn bằng thuyết phục — cho người ta hiểu vì sao rồi họ tự làm, thay vì ép.',
    moiTruongHop: 'Chỗ ăn bằng đầu và bằng miệng: hoạch định, tiếp thị, tư vấn, đào tạo, luật, y, nghề chuyên môn có thương hiệu cá nhân.',
    moiTruongKy: 'Việc lặp lại, không ai hỏi tới ý kiến, thành quả tính theo tập thể — ở đó bạn héo nhanh dù lương vẫn tốt.',
    manh: 'Biến thứ rối thành thứ người khác hiểu được, và làm được điều đó nhanh hơn hầu hết mọi người.',
    yeu: 'Nói giỏi hơn làm; hưởng thụ quá trình mà nhẹ tay với kết quả cuối; cần lời khen nhiều hơn mình thừa nhận.',
    baiHoc: [
      'Nói và làm là hai việc. Muốn cầm quân thì phải chịu phần thi hành, không chỉ phần ý tưởng.',
      'Nể nang vì sợ mất lòng sẽ khiến bạn không dám đòi tiến độ — và đội tự hiểu là không cần gấp.',
      'Ảnh hưởng của bạn đến từ chuyên môn; buông chuyên môn để đi làm quan hệ là tự tháo chỗ đứng.',
      'Bạn cần một người kiểu Lãnh đạo hoặc Khai sáng chốt hạ, nếu không phương án hay sẽ dừng ở phương án.',
    ],
    source: 'Tứ tượng thiếu dương; cụm Nhật – Cự – Cơ. Đặc chất từng sao theo Tân Biên 4.2 và Vương Đình Chi (Thiên Cơ: "phù tá, tham mưu, cố vấn, người lập kế hoạch").',
  },
  'hop-tac': {
    id: 'hop-tac',
    ten: 'Hợp tác',
    tuTuong: 'Lão âm (老陰) — âm trong âm',
    amDuong: 'am',
    saoNhom: ['Thái Âm', 'Thiên Lương', 'Thiên Đồng'],
    motCau: 'Giữ cho guồng chạy, gánh phần không ai muốn gánh, bền',
    dongLuc: 'Muốn mình là người có ích và điều đó được thừa nhận. Ham muốn vật chất thấp hơn mức người ngoài đoán.',
    datChat:
      'Ôn hoà, nghĩ trước nhiều nước lui, làm tuần tự, không đánh trận chưa chắc. Ít khi bùng lên mà cũng hiếm khi vỡ trận.',
    cauHoi: ['Làm cho ai?', 'Có hợp lợi ích số đông không?', 'Có ai cùng làm không?', 'Việc này có phá hoà khí không?'],
    kieuDan: 'Dẫn bằng phối hợp — gom đồng thuận rồi mới đi, tránh đối đầu trực diện.',
    moiTruongHop: 'Chỗ cần người giữ nhịp và nối các bên: vận hành, nhân sự, tài chính, hậu cần, cán bộ trung kiên của một bộ máy đã chạy.',
    moiTruongKy: 'Chỗ phải tranh phần công khai, đổi hướng xoành xoạch, thưởng người ồn ào — bạn làm nhiều mà được ghi nhận ít nhất.',
    manh: 'Không tranh nên không thành cái gai; khi các bên đánh nhau mệt thì bạn là người còn đứng được để thu dọn.',
    yeu: 'Ngại làm mất lòng nên hay ôm việc thay vì giao; quyết chậm, dễ bỏ lỡ khúc phải chớp.',
    baiHoc: [
      'Ngại quản người nên hay tự làm hết — đó là trần thấp nhất bạn tự đặt cho mình.',
      'Từ chối cơ hội bằng lý do "chưa đủ năng lực" là thói quen, không phải sự thật. Kiểm lại mỗi lần định nói câu đó.',
      'Đúng lúc phải nói thẳng thì nói thẳng; giữ hoà khí bằng cách im là để vấn đề lớn lên.',
      'Bạn thành công muộn hơn nhóm dương trung bình khoảng mười năm — đó là nhịp, không phải kém. Đừng lấy nhịp người khác đo mình.',
    ],
    source: 'Tứ tượng lão âm; cụm Nguyệt – Lương – Đồng (bộ Cơ Nguyệt Đồng Lương). Đặc chất từng sao theo Tân Biên 4.2 và Vương Đình Chi.',
  },
};

export const RADAR_CUNG: { cung: string; nhan: string; y: string }[] = [
  { cung: 'Mệnh', nhan: 'Bản lĩnh cá nhân', y: 'Chất riêng bạn mang vào việc, thứ còn lại khi bỏ hết chức danh' },
  { cung: 'Quan Lộc', nhan: 'Đường công danh', y: 'Sự nghiệp đi lên êm hay gập ghềnh, hợp làm công hay làm chủ' },
  { cung: 'Tài Bạch', nhan: 'Năng lực kiếm tiền', y: 'Cách tiền vào ra, hợp lương cứng hay hợp ăn theo kết quả' },
  { cung: 'Thiên Di', nhan: 'Cơ hội bên ngoài', y: 'Ra khỏi vùng quen thì gặp may hay gặp khó; hợp đi xa, đổi môi trường' },
  { cung: 'Nô Bộc', nhan: 'Cấp dưới & đối tác', y: 'Người dưới quyền và bạn nghề có đỡ được bạn không' },
  { cung: 'Huynh Đệ', nhan: 'Đồng sự ngang hàng', y: 'Quan hệ với người cùng cấp — chỗ va chạm nhiều nhất ở công sở' },
  { cung: 'Phụ Mẫu', nhan: 'Quan hệ với cấp trên', y: 'Bề trên nâng đỡ hay đè; xin duyệt dễ hay khó' },
  { cung: 'Phúc Đức', nhan: 'Sức bền tinh thần', y: 'Chịu áp lực dài được tới đâu trước khi kiệt' },
  { cung: 'Điền Trạch', nhan: 'Nền tảng hậu phương', y: 'Chỗ dựa vật chất — có dám liều một quãng không lương không' },
  { cung: 'Tật Ách', nhan: 'Sức khoẻ & áp lực', y: 'Áp lực đổ vào đâu trên người bạn' },
  { cung: 'Phu Thê', nhan: 'Hậu thuẫn bạn đời', y: 'Người bên cạnh đẩy hay kéo quyết định nghề nghiệp của bạn' },
  { cung: 'Tử Tức', nhan: 'Ươm mầm & truyền nghề', y: 'Đào tạo người sau, gây dựng cái nối tiếp mình' },
];

export const NAC_NGHE = [
  { ten: 'Vào nghề & tích vốn', y: 'Học nghề, dựng uy tín đầu tiên, chọn đúng chỗ đứng' },
  { ten: 'Đứng vững & cầm việc', y: 'Có phần việc của riêng mình, bắt đầu chịu trách nhiệm cho người khác' },
  { ten: 'Cầm đội & mở rộng', y: 'Dẫn người, hoặc làm chủ chuyên môn của mình' },
  { ten: 'Định hình & chuyển giao', y: 'Chốt di sản nghề, truyền lại, hoặc đổi sân chơi lần cuối' },
] as const;

export interface NganhDef {
  linhVuc: string;
  /** Chất việc mà nhóm này hợp — phần suy được từ cổ thư. */
  chatViec: string;
  /** Ngành hiện đại mang chất việc đó. Phần này là quy chiếu của trang. */
  nganh: string[];
}

export const DOMAIN_NGANH: Record<string, NganhDef> = {
  vo: {
    linhVuc: 'Việc đối mặt trực diện, quyết nhanh, chịu được rủi ro',
    chatViec: 'Việc có đối thủ rõ ràng, có thắng thua đo được, và phải quyết trong lúc thông tin chưa đủ.',
    nganh: ['An ninh · quân đội · thi hành pháp luật', 'Thể thao và huấn luyện thi đấu', 'Cấp cứu · phòng cháy · ứng phó sự cố', 'Vận hành hiện trường (công trường, nhà máy, kho vận)', 'Bán hàng săn khách lớn, mở thị trường mới', 'Khởi nghiệp giai đoạn đầu, mảng phải mở từ số không'],
  },
  van: {
    linhVuc: 'Việc sống bằng chữ nghĩa, tri thức và lời nói',
    chatViec: 'Việc mà giá trị nằm ở chỗ hiểu sâu rồi diễn đạt cho người khác hiểu theo.',
    nganh: ['Giáo dục · đào tạo · huấn luyện doanh nghiệp', 'Nghiên cứu · phân tích · tư vấn chuyên môn', 'Báo chí · xuất bản · biên tập', 'Sáng tạo nội dung, truyền thông, quảng cáo', 'Luật · công chứng · pháp chế', 'Biên phiên dịch, nghề chữ nghĩa tự do'],
  },
  quyen: {
    linhVuc: 'Việc cầm trịch tổ chức và điều phối người',
    chatViec: 'Việc mà kết quả đến từ chỗ sắp đúng người vào đúng chỗ, chứ không từ chỗ tự tay làm.',
    nganh: ['Quản trị doanh nghiệp · vận hành', 'Hành chính công · tổ chức đoàn thể', 'Quản lý dự án · quản lý sản phẩm', 'Nhân sự · phát triển tổ chức', 'Chuỗi cung ứng · điều phối đa bên', 'Quản lý chất lượng, kiểm soát nội bộ'],
  },
  thuong: {
    linhVuc: 'Việc xoay quanh dòng tiền và hàng hoá',
    chatViec: 'Việc mà thước đo cuối cùng là con số, và người giỏi là người thấy được cơ hội trước khi nó rõ.',
    nganh: ['Kinh doanh · thương mại · phân phối', 'Tài chính · ngân hàng · đầu tư', 'Kế toán · kiểm toán · thuế', 'Bán lẻ · thương mại điện tử', 'Bất động sản · môi giới', 'Logistics · xuất nhập khẩu'],
  },
  y: {
    linhVuc: 'Việc chăm sóc thân thể và tinh thần người khác',
    chatViec: 'Việc mà người ta tìm tới lúc yếu nhất, nên cái bán được là sự tin cậy chứ không phải kỹ thuật.',
    nganh: ['Y · dược · điều dưỡng', 'Tâm lý · trị liệu · tham vấn', 'Dinh dưỡng · y học cổ truyền · phục hồi chức năng', 'Chăm sóc sức khoẻ, thẩm mỹ, spa', 'Huấn luyện thể chất cá nhân', 'Công tác xã hội, chăm sóc người cao tuổi'],
  },
  nghe: {
    linhVuc: 'Việc sống bằng tay nghề và chuyên môn sâu',
    chatViec: 'Việc mà người ta trả tiền cho KỸ NĂNG của riêng bạn, không trả cho chức danh bạn đang giữ.',
    nganh: ['Kỹ thuật · cơ khí · xây dựng', 'Công nghệ thông tin · phần mềm · dữ liệu', 'Thiết kế (đồ hoạ, nội thất, công nghiệp)', 'Chế tác, thủ công mỹ nghệ, ẩm thực', 'Nghệ thuật ứng dụng (nhiếp ảnh, dựng phim, âm thanh)', 'Nghề tự do có thương hiệu cá nhân'],
  },
  tu: {
    linhVuc: 'Việc lấy ý nghĩa làm thước đo hơn là lấy tiền',
    chatViec: 'Việc mà bạn chịu được mức đãi ngộ thấp hơn nếu tin là nó đáng làm — và mất động lực rất nhanh nếu không tin.',
    nganh: ['Nghiên cứu nhân văn · triết học · lịch sử', 'Tổ chức thiện nguyện · phi lợi nhuận', 'Tham vấn tinh thần, đồng hành tâm lý', 'Văn hoá · di sản · bảo tàng', 'Giảng dạy chuyên đề, viết lách tự do', 'Nghề tự chủ thời gian, ít ràng buộc tổ chức'],
  },
};

/** VAI TRÒ trong ngành — theo KIỂU người (cung Mệnh), độc lập với lĩnh vực. */
export const VAI_THEO_KIEU: Record<KieuId, string> = {
  'khai-sang': 'Nhận phần CHƯA CÓ ĐƯỜNG: mở thị trường mới, lập mảng từ số không, gỡ khủng hoảng. Chỗ đã có quy trình sẵn thì bạn ngồi không yên.',
  'lanh-dao': 'Nhận phần PHẢI SẮP LẠI: dựng hệ thống, chuẩn hoá cách làm, cầm đội đã có việc. Bạn mạnh khi có người để phân vai, không mạnh khi phải tự cày một mình.',
  'ho-tro': 'Nhận phần PHẢI GIẢI THÍCH: tham mưu, tư vấn, đào tạo, đối ngoại, thiết kế giải pháp. Chỗ không ai hỏi tới ý kiến bạn là chỗ bạn héo.',
  'hop-tac': 'Nhận phần PHẢI BỀN: vận hành, kiểm soát chất lượng, giữ quan hệ khách hàng dài hạn, nghiệp vụ đòi tỉ mỉ. Chỗ phải tranh phần công khai không hợp bạn.',
};

/** QUY MÔ gánh được — theo bậc chức phận engine chấm ở cung Quan Lộc. */
export const QUY_MO_THEO_BAC: Record<string, string> = {
  cao: 'Đủ sức đứng tên: làm chủ, cầm một mảng lớn, hoặc dựng thương hiệu cá nhân. Chọn chỗ có trần cao — trần thấp là bạn sẽ đập đầu vào nó rất sớm.',
  kha: 'Hợp cầm một phần việc rõ ràng trong tổ chức có tên tuổi. Ra riêng vẫn được, nhưng nên đi sau khi đã có sẵn mối và có người cùng gánh.',
  giua: 'Hợp làm trong bộ máy đã chạy hơn là tự dựng bộ máy. Muốn ra riêng thì tìm người bù khuyết trước, đừng ra một mình.',
  thap: 'Đừng gánh một mình ở giai đoạn này. Chọn nơi có hệ thống đỡ lưng, đi lên bằng một chuyên môn hẹp mà sâu — đó là đường chắc nhất cho bạn.',
};

export const LOI_THEO_TRANG_THAI: Record<TrangThai, Record<KieuId, string>> = {
  'nhan-vien': {
    'khai-sang':
      'Bạn dễ được để mắt sớm vì dám nhận việc khó — nhưng cái quyết định không phải lần lập công đầu, mà là bạn có chịu ở lại đủ lâu để biến nó thành vị trí hay không. Chọn sếp biết giao quyền, đừng chọn công ty có tên.',
    'lanh-dao':
      'Bạn hợp lối đi từng bậc, và bạn thật sự giỏi ở đó. Việc cần làm sớm: xin một phần việc CÓ NGƯỜI DƯỚI, dù chỉ một người — không có ai để quản thì thế mạnh lớn nhất của bạn không có chỗ hiện ra trong hồ sơ.',
    'ho-tro':
      'Bạn được ưa và được hỏi ý kiến nhiều, nhưng ưa không quy ra thăng tiến. Mỗi quý hãy có một việc GẮN TÊN BẠN và đo được bằng con số, nếu không bạn sẽ mãi là người giúp mọi người hoàn thành việc của họ.',
    'hop-tac':
      'Bạn là người guồng máy dựa vào, và cũng là người dễ bị coi là đương nhiên. Hãy tập nói ra phần mình đã làm — không phải để tranh, mà vì người quyết định không tự nhìn ra được.',
  },
  'quan-ly': {
    'khai-sang':
      'Chỗ nguy của bạn không phải chỉ tiêu mà là quan hệ dọc: dễ dùng quyền quá tay với người dưới và dễ khiến cấp trên đề phòng. Mỗi quyết định gấp, thử hỏi một câu — việc này cần lệnh hay chỉ cần một lời giải thích?',
    'lanh-dao':
      'Bạn quản tốt cái đã có nề nếp. Bài toán của bạn là khúc chưa có tiền lệ: hãy giữ cạnh mình một người dám xông, và đừng bắt họ chạy theo quy trình bạn thấy hợp lý.',
    'ho-tro':
      'Bạn dẫn bằng thuyết phục nên đội hiểu việc, nhưng hay nương tay lúc phải đòi tiến độ. Đặt sẵn mốc và điểm kiểm ngay từ đầu — để cái ép nằm ở lịch, không nằm ở bạn.',
    'hop-tac':
      'Bạn hay tự làm phần khó thay vì giao, vì giao thì phải thúc mà thúc thì mất lòng. Đó chính là trần của bạn. Giao đúng một việc bạn đang ôm, chịu để nó xong chậm hơn mình làm, và giữ nguyên như thế.',
  },
  chu: {
    'khai-sang':
      'Bạn mở được cục, nhưng đội toàn người giống bạn thì mỗi ngày chỉ đi xử lý va chạm nội bộ. Người bạn cần tuyển tiếp gần như chắc chắn là kiểu trầm — người giữ nhịp, không phải người thứ hai biết xông.',
    'lanh-dao':
      'Bạn dựng được bộ máy chạy lâu. Rủi ro là bộ máy đó quá gọn nên hết chỗ cho thứ chưa có tiền lệ. Hãy tách riêng một mảng KHÔNG áp quy trình chung, giao cho người dám phá.',
    'ho-tro':
      'Bạn bán được tầm nhìn và kéo được người giỏi tới. Chỗ hụt thường là thi hành — hãy tìm một người cầm trịch vận hành, và trao quyền thật, không phải trao chức danh.',
    'hop-tac':
      'Bạn đi chậm mà ít vỡ, và đó là lợi thế thật ở đường dài. Nhưng đừng để "chưa đủ chắc" thành lý do trì hoãn mãi — đặt trước hạn chót cho quyết định, không đặt cho việc.',
  },
  'tu-do': {
    'khai-sang':
      'Làm tự do rất hợp bạn: không lễ nghi, đo bằng kết quả. Chỗ hở là nguồn việc lúc có lúc không — hãy giữ hai ba mối chạy song song thay vì dồn vào một khách lớn dễ nói chuyện.',
    'lanh-dao':
      'Bạn hợp mô hình có hệ thống hơn là chạy đơn lẻ: gói dịch vụ thành quy trình, dựng bảng giá theo bậc, và tính chuyện thuê người làm phần lặp lại.',
    'ho-tro':
      'Đây gần như là sân của bạn — nghề ăn bằng chuyên môn và tiếng nói. Đầu tư vào chỗ mình được nghe (viết, nói, dạy) sẽ ra việc nhanh hơn là đi chào từng người.',
    'hop-tac':
      'Bạn giữ khách rất bền, nhưng hay ngại nâng giá và ngại từ chối. Rà lại bảng giá mỗi năm một lần theo lịch cố định — để việc đó là thủ tục, không phải một cuộc đối đầu.',
  },
  'dang-tim': {
    'khai-sang':
      'Đừng chọn chỗ trả cao nhất; chọn chỗ cho bạn quyền quyết sớm nhất. Bạn héo trong bộ máy nhiều tầng nhanh hơn bạn tưởng, và lần nghỉ sau sẽ tới sớm.',
    'lanh-dao':
      'Hỏi thẳng trong lúc phỏng vấn: vị trí này có người dưới không, quyết định gì được tự chốt. Thiếu hai thứ đó thì dù chức danh đẹp bạn cũng sẽ thấy chật trong vòng một năm.',
    'ho-tro':
      'Chọn nơi có người nghe bạn nói. Việc lặp lại và không ai hỏi ý kiến là thứ giết động lực của bạn nhanh nhất, nhanh hơn cả lương thấp.',
    'hop-tac':
      'Bạn cần môi trường ổn định và một người dẫn rõ ràng để phát huy. Đừng nhận việc phải tự bơi ngay từ tuần đầu chỉ vì ngại từ chối lời mời.',
  },
};

/** Vai trong đội ↔ cung đọc theo CỔ PHÁP (xem chú thích ở mục 4). Bản dịch nhãn `vai`: khoá `doi.<cung>`. */
export const VAI_CUNG: { vai: string; cung: string }[] = [
  { vai: 'Cấp trên của bạn', cung: 'Phụ Mẫu' },
  { vai: 'Đồng sự ngang hàng', cung: 'Huynh Đệ' },
  { vai: 'Cấp dưới & đối tác', cung: 'Nô Bộc' },
];

/** Khuôn câu lộ trình — chữ Việt do engine dựng từ ĐÂY (vi byte-giống), client tra bản dịch theo `luanMa` (`luan.<mã>`).
 *  `{nac}` = tên chặng viết thường (client lấy từ `stt`). */
export const LUAN_NAC = {
  mo: 'Chặng {nac} — đại vận không có chính tinh, tính chất mờ, đọc thêm ở cung xung chiếu.',
  'duong-thuan':
    'Vận cùng tính dương với bản mệnh: đà thuận, dám tranh và tranh được. Đây là quãng nên đặt cược lớn — chậm chân ở đây thì quãng sau phải trả giá đắt hơn nhiều.',
  'am-thuan':
    'Vận cùng tính âm với bản mệnh: êm, hợp tích luỹ và giữ quan hệ. Đừng lấy nhịp của người đang bung ra để đo mình trong quãng này.',
  'duong-nghich':
    'Vận ngược tính với bản mệnh (mệnh dương – vận âm): húc thẳng sẽ tốn sức mà ít kết quả. Quãng này ăn nhau ở chỗ nhẫn và ở chỗ dựng quan hệ, không ở chỗ thắng nhanh.',
  'am-nghich':
    'Vận ngược tính với bản mệnh (mệnh âm – vận dương): môi trường đẩy bạn ra phía trước sớm hơn bạn muốn. Nhận việc lộ diện đi — đây đúng là quãng bạn học được thứ mình vẫn né.',
} as const;
export type LuanNacMa = keyof typeof LUAN_NAC;

export function luanNac(kieu: KieuId, tinh: 'duong' | 'am' | null, hop: boolean | null, nac: string): { ma: LuanNacMa; text: string } {
  if (!tinh || hop === null) return { ma: 'mo', text: LUAN_NAC.mo.replace('{nac}', nac.toLowerCase()) };
  const duongMenh = KIEU[kieu].amDuong === 'duong';
  const ma: LuanNacMa = hop ? (duongMenh ? 'duong-thuan' : 'am-thuan') : duongMenh ? 'duong-nghich' : 'am-nghich';
  return { ma, text: LUAN_NAC[ma] };
}

/** Khuôn câu ghép đội. `{kieu}` = kiểu của cung (viết thường), `{nen}` = kiểu nên tìm để bù (viết thường). */
export const GHEP = {
  'pm.none': 'Cung Phụ Mẫu không có chính tinh — quan hệ với cấp trên mờ nhạt, ít người đỡ mà cũng ít người chặn. Bạn phải tự tạo mối, đừng chờ được để mắt tới.',
  'pm.same': 'Bạn dễ ăn ý với sếp kiểu {kieu}. Cùng kiểu với bạn nên hiểu nhau nhanh — nhưng cũng cùng điểm mù, hai người sẽ bỏ sót cùng một thứ.',
  'pm.diff': 'Bạn dễ ăn ý với sếp kiểu {kieu}. Khác kiểu bạn nên hay va lúc đầu; qua được khúc đó thì đây là người dạy bạn nhiều nhất.',
  'nb.none': 'Cung Nô Bộc không có chính tinh — người dưới quyền khó thành chỗ dựa. Đừng trông vào một cánh tay phải; nên xây quy trình để việc không phụ thuộc một người.',
  'nb.has': 'Người dưới quyền hợp với bạn nghiêng về kiểu {kieu}. Còn kiểu bạn CẦN mà thường thiếu là {nen} — tuyển bù chỗ đó trước khi tuyển thêm người giống mình.',
  'hd.none': 'Cung Huynh Đệ không có chính tinh — quan hệ đồng cấp nhạt, ít phe cánh mà cũng ít hậu thuẫn khi cần biểu quyết.',
  'hd.has': 'Đồng sự ăn ý với bạn thường là kiểu {kieu}. Trong một đội, cặp bù nhau tốt nhất cho bạn là {nen}.',
} as const;
export type GhepMa = keyof typeof GHEP;

export function goiYGhep(cung: string, menh: KieuId, cua: KieuId | null, nenTim: KieuId): { ma: GhepMa; text: string } {
  const ma: GhepMa =
    cung === 'Phụ Mẫu'
      ? !cua ? 'pm.none' : cua === menh ? 'pm.same' : 'pm.diff'
      : cung === 'Nô Bộc'
        ? cua ? 'nb.has' : 'nb.none'
        : cua ? 'hd.has' : 'hd.none';
  const text = GHEP[ma]
    .replace('{kieu}', cua ? KIEU[cua].ten.toLowerCase() : '')
    .replace('{nen}', KIEU[nenTim].ten.toLowerCase());
  return { ma, text };
}
