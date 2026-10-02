// Hồ sơ nghiệm chứng: Cung Lê.
// Dữ liệu sinh: Astro-Databank, Rodden A (bảng `celeb_births`, qid Q952839).
// Mọi con số tử vi trên trang do engine tính lúc dựng — file này chỉ chứa đời
// thật, câu trích lá số và kết luận. Xem lib/nghiem-chung/types.ts.
import type { HoSoNghiemChung } from '../types';

// Chỉ số nguồn — giữ đúng thứ tự mảng `nguon` bên dưới.
const EN_WIKI = 0;

export const cungLe: HoSoNghiemChung = {
  slug: 'cung-le',
  ten: 'Cung Lê',
  qid: 'Q952839',
  ngheNghiep: 'Võ sĩ tán thủ, võ sĩ MMA, diễn viên',
  moTaNgan:
    'Võ sĩ người Mỹ gốc Việt, cựu vô địch hạng trung Strikeforce, diễn viên phim hành động "Tekken", "Dragon Eyes"',
  gioiTinh: 'nam',
  sinh: { ngay: '1972-05-25', gio: '02:00', gioEngine: 2, noi: 'Sài Gòn', rodden: 'A' },
  anhCommons: 'Cung Le at Inside MMA.jpg',
  sameAs: [
    'https://www.wikidata.org/wiki/Q952839',
    'https://vi.wikipedia.org/wiki/Cung_L%C3%AA',
    'https://en.wikipedia.org/wiki/Cung_Le',
  ],

  traLoiNgan:
    'Lá số Tử Vi của Cung Lê khớp cao với cuộc đời ông: Mệnh vô chính diệu báo một tuổi thơ phiêu bạt (ba tuổi rời Sài Gòn bằng trực thăng, qua trại tị nạn rồi mới tới Mỹ), Hóa Lộc ở Thiên Di báo lập nghiệp nhờ đất khách, còn hai đại vận tuổi trẻ được chấm cao đúng lúc ông gom hết danh hiệu võ thuật nghiệp dư. Năm 2008 — năm ông lên ngôi vô địch Strikeforce — và năm 2014 — năm thua trận và vướng tranh chấp với UFC — đều hiện rõ trên lá số.',

  tieuSu: [
    'Cung Lê (tên tiếng Anh: Cung Le) sinh ngày 25/5/1972 tại Sài Gòn. Năm 1975, ba ngày trước khi Sài Gòn thất thủ, cậu bé ba tuổi cùng mẹ rời Việt Nam bằng trực thăng; cha ông ở lại. Sau vài tháng ở trại tị nạn tại Philippines, hai mẹ con định cư ở San Jose, California — nơi những lần bị phân biệt và bắt nạt khiến mẹ cho ông học Taekwondo từ năm mười tuổi.',
    'Ông đấu vật từ năm 14 tuổi và đạt danh hiệu All-American ở trường trung học, rồi chuyển sang tán thủ: ba lần vô địch US Open (1994–1996), vô địch quốc gia Mỹ, ba huy chương đồng giải Wushu thế giới (1995, 1997, 1999), thành tích kickboxing 17 trận toàn thắng.',
    'Năm 2006 ông chuyển sang MMA, năm 2008 hạ Frank Shamrock để giành đai vô địch hạng trung Strikeforce. Ở UFC, cú knock-out Rich Franklin tại Ma Cao năm 2012 được bầu là một trong những pha knock-out hay nhất năm. Song song, ông đóng phim "Tekken", "Pandorum" (2009), "Dragon Eyes", "The Man with the Iron Fists" (2012). Ông giải nghệ MMA đầu năm 2015.',
  ],

  banMenh: [
    {
      cung: 'Mệnh',
      laSoNoi: 'Mệnh vô chính diệu — khôn ngoan sắc sảo, thiếu thời dễ phiêu bạt, không ở yên một chỗ.',
      doiThat: 'Ba tuổi rời Sài Gòn bằng trực thăng, qua trại tị nạn ở Philippines rồi mới định cư ở San Jose.',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Mệnh',
      laSoNoi: 'Mệnh vô chính diệu mượn Thiên Lương, gặp Thái Âm, Linh Tinh hội chiếu — người nhiều tài năng, về sau quý hiển.',
      doiThat: 'Vô địch tán thủ, vô địch Strikeforce, rồi thành diễn viên phim hành động Hollywood.',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Phúc Đức',
      laSoNoi: 'Thân cư Phúc Đức có Thiên Khốc, Thiên Hư — thiếu thời vất vả, ngoài 30 tuổi trở đi khá giả.',
      doiThat: 'Tuổi thơ tị nạn, bị bắt nạt ở trường; sau tuổi 30 mới thật sự thành danh với K-1, Strikeforce và điện ảnh.',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Thiên Di',
      laSoNoi: 'Hóa Lộc ở Thiên Di — tài lộc đến từ bên ngoài, đi xa được lợi, xuất ngoại nhiều cơ hội.',
      doiThat: 'Toàn bộ sự nghiệp gây dựng ở Mỹ; những trận lớn nhất đánh ở Ma Cao, đóng phim với Hồng Kông và Hollywood.',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Nô Bộc',
      laSoNoi: 'Phục Binh, Xương Khúc, Khôi Việt ở Nô Bộc — ra ngoài có nhiều người phụ giúp, gặp quý nhân, gần người có quyền thế.',
      doiThat: 'Tập ở American Kickboxing Academy, từng là thành viên đội tuyển Wushu Mỹ; đóng vai chính bên Jean-Claude Van Damme trong phim do Joel Silver sản xuất.',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Phu Thê',
      laSoNoi: 'Phu Thê bị cả Tuần lẫn Triệt, có Cô Thần, Quả Tú — duyên vợ chồng trắc trở, dễ xa cách.',
      doiThat: 'Có hai con trai với người vợ trước; hiện đã tái hôn.',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Tử Tức',
      laSoNoi: 'Tử Tức có Dưỡng — "nuôi được hai con", có thể có con nuôi.',
      doiThat: 'Có hai con trai. Phần con nuôi không có thông tin.',
      ketLuan: 'mot-phan',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Tài Bạch',
      laSoNoi: 'Tài Bạch vô chính diệu, có Địa Kiếp, Kình Dương — tiền bạc túng thiếu, khó giữ.',
      doiThat: 'Thuở nhỏ là gia đình tị nạn; khi trưởng thành thì có thu nhập ổn định từ võ đài và phim ảnh.',
      ketLuan: 'mot-phan',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Điền Trạch',
      laSoNoi: 'Hóa Kỵ ở Điền Trạch — phải đổi chỗ ở nhiều lần.',
      doiThat: 'Từ Sài Gòn qua trại tị nạn ở Philippines rồi tới San Jose; về sau thì gắn bó lâu dài với San Jose.',
      ketLuan: 'mot-phan',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Quan Lộc',
      laSoNoi: 'Quan Lộc có Thái Dương hãm, Cự Môn — điểm cung dưới trung bình.',
      doiThat: 'Sự nghiệp thi đấu và điện ảnh thành công rõ rệt — điểm cung thấp không phản ánh điều này.',
      ketLuan: 'truot',
      nguon: [EN_WIKI],
    },
    {
      cung: 'Huynh Đệ',
      laSoNoi: 'Huynh Đệ có Liêm Trinh, Phá Quân hãm, Hỏa Tinh — ít anh chị em hoặc không gần gũi.',
      doiThat: 'Không có nguồn công khai về anh chị em của ông.',
      ketLuan: 'chua-kiem-chung',
    },
    {
      cung: 'Tật Ách',
      laSoNoi: 'Thất Sát ở Tật Ách.',
      doiThat: 'Trang này cố ý không suy đoán về sức khỏe của người đang sống.',
      ketLuan: 'chua-kiem-chung',
    },
  ],

  daiVan: [
    {
      thuTu: 1,
      doiThat: 'Lớn lên ở San Jose sau khi tị nạn, bị phân biệt và bắt nạt; học Taekwondo từ năm 10 tuổi, đấu vật từ năm 14 tuổi.',
      ketLuan: 'mot-phan',
      vi: 'Điểm cao cho một tuổi thơ nhiều thiệt thòi — nhưng đây cũng là lúc ông tìm thấy võ thuật.',
      nguon: [EN_WIKI],
    },
    {
      thuTu: 2,
      doiThat: 'All-American môn vật; ba lần vô địch US Open (1994–1996), vô địch quốc gia, đồng thế giới 1995, vô địch thế giới Taekwondo đối kháng 1996.',
      ketLuan: 'khop',
      vi: 'Điểm cao, đúng giai đoạn gom danh hiệu dày nhất.',
      nguon: [EN_WIKI],
    },
    {
      thuTu: 3,
      doiThat: 'Thêm hai huy chương đồng thế giới (1997, 1999), vô địch Shidokan 1998, thi đấu K-1, kickboxing bất bại; ra mắt MMA năm 2006 bằng một trận knock-out.',
      ketLuan: 'mot-phan',
      vi: 'Điểm trung bình cho một thập niên vẫn thắng đều, dù danh tiếng chưa vượt khỏi giới võ thuật.',
      nguon: [EN_WIKI],
    },
    {
      thuTu: 4,
      doiThat: 'Vô địch Strikeforce (2008), đóng "Tekken", "Pandorum" (2009), knock-out Rich Franklin (2012); nhưng cũng thua Scott Smith, Wanderlei Silva, Michael Bisping, vướng tranh chấp xét nghiệm với UFC (2014) rồi giải nghệ (2015).',
      ketLuan: 'khop',
      vi: 'Điểm trung bình, sao tốt xấu lẫn lộn — đúng một thập niên vừa đỉnh cao vừa sóng gió.',
      nguon: [EN_WIKI],
    },
    {
      thuTu: 5,
      doiThat: 'Đã giải nghệ, không còn thi đấu; chỉ đóng thêm một số phim hành động như "Savage Dog" (2017).',
      ketLuan: 'mot-phan',
      vi: 'Điểm thấp ứng với một sự nghiệp lặng hẳn đi, dù không có biến cố lớn nào được ghi nhận.',
      nguon: [EN_WIKI],
    },
  ],

  namMoc: [
    {
      nam: 1975,
      suKien: 'Ba ngày trước khi Sài Gòn thất thủ, rời Việt Nam bằng trực thăng cùng mẹ; cha ở lại; vài tháng sống trong trại tị nạn.',
      laSoNoi: 'Thái Tuế đóng Huynh Đệ có Liêm Trinh – Phá Quân hãm gặp Hỏa: "xa nhà, may ít rủi nhiều", "hao tán"; lưu Hóa Kỵ rơi vào Phúc Đức.',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      nam: 2008,
      suKien: 'Hạ Frank Shamrock, giành đai vô địch hạng trung Strikeforce.',
      laSoNoi: 'Đại vận Điền Trạch có Tham Lang – Vũ Khúc: "mọi sự hanh thông, danh tài hưng vượng"; lưu Hóa Lộc và Hóa Khoa cùng đổ vào cung đại vận; tiểu hạn Thiên Di có Cơ Lương: "càng xa nhà càng may".',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
    {
      nam: 2012,
      suKien: 'Thắng Patrick Côté, knock-out Rich Franklin ở Ma Cao; đóng vai chính "Dragon Eyes".',
      laSoNoi: 'Thái Tuế nhập Mệnh, lưu Hóa Khoa vào cung đại vận — một năm "của chính mình", có tiếng; nhưng lưu Hóa Kỵ cũng vào cung đó và tiểu hạn Phu Thê gặp Tang Môn – Thiên Mã.',
      ketLuan: 'mot-phan',
      nguon: [EN_WIKI],
    },
    {
      nam: 2014,
      suKien: 'Thua Michael Bisping; bị UFC đình chỉ sau một xét nghiệm, rồi được hủy án vì phòng xét nghiệm không đạt chuẩn; xin rời UFC và đứng tên vụ kiện tập thể chống công ty mẹ của UFC.',
      laSoNoi: 'Lưu Hóa Kỵ rơi đúng Quan Lộc — sự nghiệp trắc trở; Thái Tuế ở Phúc Đức gặp Khốc Hư; cách "Vũ Khúc cư Càn… ít khi được xứng ý toại lòng".',
      ketLuan: 'khop',
      nguon: [EN_WIKI],
    },
  ],

  gioRanhGioi: {
    gioThay: 0,
    tenGioThay: 'Tý',
    lyDo: 'Năm 1972 đồng hồ ở Sài Gòn chạy theo múi UTC+8, nhanh hơn giờ mặt trời gần một tiếng. 02:00 đồng hồ chỉ tương đương khoảng 01:10 giờ mặt trời — vẫn là giờ Sửu, nhưng chỉ cách giờ Tý chừng mười phút.',
    soDaiVan: [2, 4, 5],
    ketLuan: 'Lá số giờ Tý chấm đỏ đúng mười năm ông gom danh hiệu (1987–1996) và chấm xanh cho giai đoạn đã giải nghệ — ngược hẳn với đời thật. Lá số giờ Sửu khớp hơn rõ rệt, nên trang này dùng giờ Sửu.',
  },

  ketLuanBienTap: [
    'Hiếm có lá số nào tả hoàn cảnh xuất thân sát như vậy: Mệnh vô chính diệu (phiêu bạt), Thân cư Phúc Đức có Khốc Hư (thiếu thời vất vả, ngoài 30 khá giả) và Hóa Lộc ở Thiên Di (lập nghiệp nhờ đất khách) ghép lại đúng câu chuyện một cậu bé tị nạn thành nhà vô địch ở Mỹ.',
    'Nhịp đại vận cũng đi đúng hướng: cao khi ông gom danh hiệu nghiệp dư, trung bình và lẫn lộn ở thập niên vừa vô địch vừa thua trận, thấp khi sự nghiệp lặng đi. Chỗ trượt rõ nhất là cung Quan Lộc bị chấm dưới trung bình cho một người thành công như ông.',
    'Phép thử giờ sinh đáng chú ý: chỉ cần lùi mười phút sang giờ Tý, nhịp đại vận đảo ngược hoàn toàn so với đời thật — một ví dụ cho thấy vì sao giờ sinh chính xác quan trọng đến vậy.',
  ],

  faq: [
    {
      q: 'Lá số tử vi của Cung Lê có đúng với cuộc đời ông không?',
      a: 'Khớp ở phần lớn các mục kiểm chứng được: tuổi thơ phiêu bạt, lập nghiệp nơi đất khách, quý nhân giúp đỡ và nhịp các đại vận. Chỗ trượt rõ nhất là cung Quan Lộc bị chấm thấp dù sự nghiệp của ông rất thành công. Bảng đầy đủ ở trên ghi rõ từng mục.',
    },
    {
      q: 'Vì sao giờ sinh của Cung Lê lại quan trọng?',
      a: 'Ông sinh 02:00 theo đồng hồ Sài Gòn năm 1972, khi đồng hồ chạy theo múi UTC+8. Quy về giờ mặt trời thì vẫn là giờ Sửu nhưng chỉ cách giờ Tý chừng mười phút. Lá số giờ Tý cho nhịp đại vận ngược hẳn với đời thật, nên lá số giờ Sửu là cách đọc đáng tin hơn.',
    },
  ],

  nguon: [
    { ten: 'Wikipedia tiếng Anh — Cung Le', url: 'https://en.wikipedia.org/wiki/Cung_Le' },
    { ten: 'Wikipedia tiếng Việt — Cung Lê', url: 'https://vi.wikipedia.org/wiki/Cung_L%C3%AA' },
    { ten: 'Astro-Databank — Le, Cung (Rodden A)', url: 'https://www.astro.com/astro-databank/Le,_Cung' },
  ],

  ngayDang: '2026-10-01',
  ngayCapNhat: '2026-10-01',
};
