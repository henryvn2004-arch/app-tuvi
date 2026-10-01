// Hồ sơ nghiệm chứng: GS. Trịnh Xuân Thuận.
// Dữ liệu sinh: Astro-Databank, Rodden AA (bảng `celeb_births`, qid Q348235).
// Mọi con số tử vi trên trang do engine tính lúc dựng — file này chỉ chứa đời
// thật, câu trích lá số và kết luận. Xem lib/nghiem-chung/types.ts.
import type { HoSoNghiemChung } from '../types';

// Chỉ số nguồn — giữ đúng thứ tự mảng `nguon` bên dưới.
const VI_WIKI = 0;
const EN_WIKI = 1;
const NASA = 2;
const TUOI_TRE = 3;
const VUSTA = 4;

export const trinhXuanThuan: HoSoNghiemChung = {
  slug: 'trinh-xuan-thuan',
  ten: 'Trịnh Xuân Thuận',
  qid: 'Q348235',
  ngheNghiep: 'Nhà vật lý thiên văn, nhà văn',
  moTaNgan: 'Nhà vật lý thiên văn người Mỹ gốc Việt, giáo sư Đại học Virginia, tác giả "Giai điệu bí ẩn"',
  gioiTinh: 'nam',
  sinh: { ngay: '1948-08-20', gio: '07:10', gioEngine: 7, noi: 'Hà Nội', rodden: 'AA' },
  anhCommons: 'Trinh Xuan Thuan (2015).jpg',
  sameAs: [
    'https://www.wikidata.org/wiki/Q348235',
    'https://vi.wikipedia.org/wiki/Tr%E1%BB%8Bnh_Xu%C3%A2n_Thu%E1%BA%ADn',
    'https://en.wikipedia.org/wiki/Trinh_Xuan_Thuan',
  ],

  traLoiNgan:
    'Lá số Tử Vi của GS. Trịnh Xuân Thuận tả rất trúng con người và nghề nghiệp của ông: Hóa Khoa thủ Mệnh, bộ Cơ Nguyệt Đồng Lương cùng Xương Khúc ở Quan Lộc chỉ thẳng vào một người thầy có văn tài, nổi danh nhờ học thuật. Lá số cũng bắt được ba năm bước ngoặt 1966, 1975 và 1988. Chỗ yếu nằm ở nhịp đại vận: hai giai đoạn danh tiếng lớn nhất của ông lại bị chấm điểm thấp.',

  tieuSu: [
    'Trịnh Xuân Thuận sinh ngày 20/8/1948 ở ngoại thành Hà Nội (thôn Thái Bình, xã Danh Lâm, phủ Từ Sơn, nay thuộc Đông Anh). Năm sáu tuổi ông theo gia đình di cư vào Nam, học trường Yersin ở Đà Lạt rồi Jean Jacques Rousseau ở Sài Gòn — từ mẫu giáo đến tú tài đều bằng tiếng Pháp.',
    'Năm 1966, sau tú tài, ông sang Thụy Sĩ du học, rồi nhận học bổng sang Mỹ: cử nhân Viện Công nghệ California (Caltech, 1967–1970), tiến sĩ Đại học Princeton (1970–1974) dưới sự hướng dẫn của Lyman Spitzer. Từ năm 1976 ông là giáo sư vật lý thiên văn tại Đại học Virginia, đồng thời thỉnh giảng ở Paris.',
    'Ông được biết đến nhiều nhất qua các cuốn sách phổ biến khoa học viết bằng tiếng Pháp, mở đầu là "La Mélodie secrète" (Giai điệu bí ẩn, 1988) — sách bán chạy ở Pháp và được dịch ra nhiều thứ tiếng. Năm 2004 ông cùng cộng sự công bố thiên hà I Zwicky 18, khi đó được xem là thiên hà trẻ nhất từng biết, nhờ ảnh của kính Hubble. Ông nhận giải Kalinga của UNESCO (2009), Prix mondial Cino Del Duca (2012), Bắc Đẩu Bội Tinh (2014) và Grand Prix de la Francophonie (2022).',
  ],

  banMenh: [
    {
      cung: 'Mệnh',
      laSoNoi: 'Hóa Khoa thủ Mệnh — thông minh, học vấn tốt, danh tiếng ổn định nhờ học thức.',
      doiThat: 'Tiến sĩ Princeton, nhà nghiên cứu thiên hà có tiếng, tác giả những cuốn sách thiên văn được dịch ra hàng chục thứ tiếng.',
      ketLuan: 'khop',
      nguon: [EN_WIKI, TUOI_TRE],
    },
    {
      cung: 'Mệnh',
      laSoNoi: 'Hữu Bật thủ Mệnh — sớm rời gốc, tự lập.',
      doiThat: 'Sáu tuổi di cư vào Nam, mười tám tuổi một mình ra nước ngoài du học.',
      ketLuan: 'khop',
      nguon: [VI_WIKI],
    },
    {
      cung: 'Mệnh',
      laSoNoi: 'Thiên Đồng hãm địa — vất vả, hay thay đổi, dễ vướng thị phi.',
      doiThat: 'Gắn bó với một trường đại học suốt từ năm 1976, sự nghiệp liền mạch, không có thị phi đáng kể.',
      ketLuan: 'truot',
      nguon: [VI_WIKI],
    },
    {
      cung: 'Quan Lộc',
      laSoNoi: 'Bộ Cơ Nguyệt Đồng Lương hội chiếu — hợp nghề thầy, "nếu dạy học cũng nổi tiếng".',
      doiThat: 'Giáo sư đại học gần nửa thế kỷ; giải Kalinga 2009 trao chính cho công phổ biến khoa học.',
      ketLuan: 'khop',
      nguon: [VI_WIKI, EN_WIKI],
    },
    {
      cung: 'Quan Lộc',
      laSoNoi: 'Văn Khúc tại Quan Lộc, Xương Khúc hội — công danh hiển đạt nhờ văn tài.',
      doiThat: 'Vừa là nhà khoa học vừa là nhà văn: viết sách thiên văn bằng tiếng Pháp, được giới phê bình khen là "giàu mỹ cảm".',
      ketLuan: 'khop',
      nguon: [VI_WIKI],
    },
    {
      cung: 'Quan Lộc',
      laSoNoi: 'Hóa Kỵ ở Quan Lộc — công danh trắc trở, thăng giáng bất thường.',
      doiThat: 'Không thấy ghi nhận trắc trở: từ tiến sĩ đến giáo sư rồi các giải lớn là một đường đi lên đều.',
      ketLuan: 'truot',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Phúc Đức',
      laSoNoi: 'Tuần án ngữ Phúc Đức — xa quê lập nghiệp, họ hàng ly tán.',
      doiThat: 'Rời miền Bắc năm 1954, rời Việt Nam năm 1966, lập nghiệp ở Mỹ; sau 1975 gia đình chia ra nhiều nước, cha ông về sau sang Pháp định cư.',
      ketLuan: 'khop',
      nguon: [VI_WIKI],
    },
    {
      cung: 'Phụ Mẫu',
      laSoNoi: 'Lộc Tồn ở Phụ Mẫu — cha mẹ có của, có địa vị; đi cùng Vũ Khúc, Phá Quân hãm nên nhiều biến động.',
      doiThat: 'Cha ông từng là viên chức Tối cao Pháp viện ở miền Nam; gia đình hai lần phải rời nơi ở.',
      ketLuan: 'mot-phan',
      nguon: [VI_WIKI],
    },
    {
      cung: 'Thiên Di',
      laSoNoi: 'Thiên Di là một trong ba cung yếu nhất, chỉ có Tả Phụ cho "ra ngoài được giúp".',
      doiThat: 'Mọi thành tựu lớn đều đạt được ở nước ngoài — Mỹ và Pháp. Câu "ra ngoài được giúp" đúng, điểm cung thấp thì không.',
      ketLuan: 'mot-phan',
      nguon: [VI_WIKI],
    },
    {
      cung: 'Nô Bộc',
      laSoNoi: 'Nô Bộc nhiều sao cảnh báo — dễ gặp tiểu nhân, rủi ro khi đi xa.',
      doiThat: 'Có những cộng sự gắn bó lâu năm (Yuri Izotov trong nghiên cứu, Matthieu Ricard trong sách); không ghi nhận biến cố nào.',
      ketLuan: 'truot',
      nguon: [NASA, VI_WIKI],
    },
    {
      cung: 'Huynh Đệ',
      laSoNoi: 'Huynh Đệ vô chính diệu, có Địa Kiếp — ít anh chị em hoặc không gần gũi.',
      doiThat: 'Không có nguồn công khai đáng tin về anh chị em ruột của ông.',
      ketLuan: 'chua-kiem-chung',
    },
    {
      cung: 'Phu Thê',
      laSoNoi: 'Thiên Mã ở Phu Thê — gặp nhau nơi xa, kết duyên xa quê.',
      doiThat: 'Đời tư hôn nhân, con cái của ông không được công bố.',
      ketLuan: 'chua-kiem-chung',
    },
    {
      cung: 'Tật Ách',
      laSoNoi: 'Tật Ách là cung điểm thấp nhất lá số.',
      doiThat: 'Không có thông tin công khai về sức khỏe — và trang này cố ý không suy đoán về sức khỏe người đang sống.',
      ketLuan: 'chua-kiem-chung',
    },
  ],

  daiVan: [
    {
      thuTu: 1,
      doiThat: 'Di cư vào Nam năm 1954, học trường Pháp ở Đà Lạt và Sài Gòn.',
      ketLuan: 'mot-phan',
      vi: 'Điểm rất cao cho một tuổi thơ có biến động lớn, dù việc học thì thuận.',
      nguon: [VI_WIKI],
    },
    {
      thuTu: 2,
      doiThat: 'Tú tài, sang Thụy Sĩ (1966), vào Caltech (1967), tốt nghiệp và vào Princeton (1970).',
      ketLuan: 'khop',
      vi: 'Điểm cao, đúng giai đoạn học vấn bứt phá nhất.',
      nguon: [VI_WIKI, VUSTA],
    },
    {
      thuTu: 3,
      doiThat: 'Tiến sĩ Princeton (1974), giáo sư Đại học Virginia (1976); cùng lúc gia đình chịu biến cố 1975.',
      ketLuan: 'khop',
      vi: 'Điểm trung bình, sao tốt xấu lẫn lộn — đúng một thập niên vừa thành danh vừa mất mát.',
      nguon: [VI_WIKI],
    },
    {
      thuTu: 4,
      doiThat: '"La Mélodie secrète" (1988) thành sách bán chạy ở Pháp — bước ngoặt đưa ông tới công chúng.',
      ketLuan: 'truot',
      vi: 'Điểm thấp thứ hai trong đời, trong khi đây là lúc danh tiếng bắt đầu lan rộng.',
      nguon: [VI_WIKI],
    },
    {
      thuTu: 5,
      doiThat: '"Le destin de l\'univers" (1992) dịch ra 20 thứ tiếng; năm 1993 có mặt trong phái đoàn Tổng thống Mitterrand thăm Việt Nam; "Le Chaos et l\'Harmonie" (1998), sách viết cùng Matthieu Ricard (2000).',
      ketLuan: 'khop',
      vi: 'Điểm cao, đại vận đi đúng cung Quan Lộc — giai đoạn sung sức nhất về tác phẩm.',
      nguon: [VI_WIKI, TUOI_TRE],
    },
    {
      thuTu: 6,
      doiThat: 'Công bố thiên hà I Zwicky 18 (2004), giải Moron (2007), giải Kalinga của UNESCO (2009).',
      ketLuan: 'mot-phan',
      vi: 'Điểm khá thì đúng, nhưng lời cảnh báo tai ương đi kèm đại vận này không ứng.',
      nguon: [NASA, EN_WIKI],
    },
    {
      thuTu: 7,
      doiThat: 'Prix mondial Cino Del Duca (2012), Bắc Đẩu Bội Tinh (2014).',
      ketLuan: 'truot',
      vi: 'Điểm dưới trung bình cho một thập niên nhận những vinh danh cao nhất.',
      nguon: [EN_WIKI],
    },
    {
      thuTu: 8,
      doiThat: 'Grand Prix de la Francophonie (2022). Giai đoạn này đang diễn ra.',
      ketLuan: 'dang-dien-ra',
      vi: 'Chưa đủ dữ liệu để kết luận.',
      nguon: [VUSTA],
    },
  ],

  namMoc: [
    {
      nam: 1966,
      suKien: 'Rời Sài Gòn sang Thụy Sĩ du học.',
      laSoNoi: 'Tiểu hạn vào Mệnh có lưu Hóa Lộc; đại vận Phụ Mẫu mang cách Vũ Khúc – Phá Quân: "bỏ nhà đi kiếm ăn ở phương xa".',
      ketLuan: 'khop',
      nguon: [VI_WIKI],
    },
    {
      nam: 1975,
      suKien: 'Biến cố 1975: gia đình ở Việt Nam chịu nhiều xáo trộn; ông đang hoàn tất những năm đầu sau tiến sĩ ở Mỹ.',
      laSoNoi: 'Đại vận và tiểu hạn đều gặp Tuần, Triệt: "không có cơ nghiệp để lại, tự tay gây dựng"; Thiên Khốc, Thiên Hư báo chuyện buồn trong họ.',
      ketLuan: 'mot-phan',
      nguon: [VI_WIKI],
    },
    {
      nam: 1988,
      suKien: '"La Mélodie secrète" ra mắt và thành sách bán chạy.',
      laSoNoi: 'Thái Tuế và lưu đại vận cùng nhập Mệnh, Hóa Khoa ngay tại Mệnh; cách "Tiền Cái hậu Mã" — danh vị đến, đi xa thuận lợi.',
      ketLuan: 'khop',
      nguon: [VI_WIKI],
    },
    {
      nam: 2004,
      suKien: 'Công bố thiên hà I Zwicky 18 trên ảnh Hubble; tháng 8 về Việt Nam nói chuyện ở Hà Nội và TP.HCM.',
      laSoNoi: 'Thái Tuế đóng Quan Lộc (Thái Âm – Thiên Cơ tại Thân: "được nhiều người mến chuộng"), nhưng lưu Hóa Kỵ rơi vào Phúc Đức.',
      ketLuan: 'mot-phan',
      nguon: [NASA, VI_WIKI],
    },
  ],

  gioRanhGioi: {
    gioThay: 6,
    tenGioThay: 'Mão',
    lyDo: 'Năm 1948 đồng hồ ở Hà Nội chạy theo múi UTC+8, nhanh hơn giờ mặt trời gần một tiếng. 07:10 đồng hồ vì vậy chỉ tương đương khoảng 06:13 giờ mặt trời — tức là đã lùi về giờ Mão, ngay sát ranh giới giờ Thìn.',
    soDaiVan: [2, 5, 6],
    ketLuan: 'Lá số giờ Mão chấm đỏ đúng giai đoạn ông học Caltech, Princeton và giai đoạn nhận giải Kalinga — hai thời kỳ thuận nhất đời ông. Lá số giờ Thìn (theo giờ đồng hồ) khớp đời thật hơn rõ rệt, nên trang này dùng giờ Thìn.',
  },

  ketLuanBienTap: [
    'Phần "con người là ai" là phần lá số làm tốt nhất. Một lá số có Hóa Khoa thủ Mệnh, bộ Cơ Nguyệt Đồng Lương và Xương Khúc ở Quan Lộc gần như phác đúng chân dung một giáo sư kiêm nhà văn khoa học — kể cả chi tiết "dạy học cũng nổi tiếng".',
    'Phần "khi nào" yếu hơn. Điểm đại vận bắt đúng thời đi học và thập niên sung sức nhất về tác phẩm, nhưng chấm thấp hai giai đoạn danh tiếng lớn (1982–1991 và 2012–2021). Ngược lại, khi xét từng năm, lá số lại bắt được năm 1988 rất gọn: Thái Tuế, lưu đại vận và Hóa Khoa cùng hội về Mệnh.',
    'Những lời cảnh báo nặng (tai ương, tiểu nhân, trắc trở công danh) đều không ứng. Đây là lý do khi luận cho chính mình, nên đọc lá số như bản đồ khuynh hướng, không phải lời phán.',
  ],

  faq: [
    {
      q: 'Lá số tử vi của Trịnh Xuân Thuận có đúng với cuộc đời ông không?',
      a: 'Đúng nhiều ở phần tính cách và nghề nghiệp (học thuật, dạy học, văn tài, xa quê lập nghiệp), kém hơn ở phần thời điểm: điểm đại vận chấm thấp hai giai đoạn ông nổi tiếng nhất. Bảng đối chiếu đầy đủ ở trên ghi rõ từng mục khớp, khớp một phần và trượt.',
    },
    {
      q: 'Vì sao giờ sinh của Trịnh Xuân Thuận lại quan trọng?',
      a: 'Ông sinh 07:10 theo đồng hồ Hà Nội năm 1948, khi đồng hồ chạy theo múi UTC+8. Quy về giờ mặt trời thì thời điểm này rơi sát ranh giới giờ Mão và giờ Thìn — hai lá số khác hẳn nhau. Đối chiếu với đời thật cho thấy lá số giờ Thìn khớp hơn.',
    },
  ],

  nguon: [
    { ten: 'Wikipedia tiếng Việt — Trịnh Xuân Thuận', url: 'https://vi.wikipedia.org/wiki/Tr%E1%BB%8Bnh_Xu%C3%A2n_Thu%E1%BA%ADn' },
    { ten: 'Wikipedia tiếng Anh — Trinh Xuan Thuan', url: 'https://en.wikipedia.org/wiki/Trinh_Xuan_Thuan' },
    { ten: 'NASA — Hubble Uncovers a Baby Galaxy in a Grown-Up Universe (2004)', url: 'https://science.nasa.gov/missions/hubble/hubble-uncovers-a-baby-galaxy-in-a-grown-up-universe/' },
    { ten: 'Tuổi Trẻ — GS Trịnh Xuân Thuận: Đạo Phật giúp tôi những ngày xa Tổ quốc', url: 'https://tuoitre.vn/gs-trinh-xuan-thuan-dao-phat-giup-toi-nhung-ngay-xa-to-quoc-1130077.htm' },
    { ten: 'VUSTA — Chân dung GS Trịnh Xuân Thuận', url: 'https://vusta.vn/chan-dung-gs-trinh-xuan-thuan-nguoi-gianh-giai-thuong-lon-cua-vien-han-lam-phap-p91191.html' },
    { ten: 'Astro-Databank — Trinh, Xuan Thuan (Rodden AA)', url: 'https://www.astro.com/astro-databank/Trinh,_Xuan_Thuan' },
  ],

  ngayDang: '2026-10-01',
  ngayCapNhat: '2026-10-01',
};
