// lib/engine/day-con-hoat-dong.ts
// ============================================================
// HOẠT ĐỘNG ĐỀ XUẤT — bậc cuối của khung "5 Trục · 8 Chất".
//
// Bậc này trả lời câu duy nhất mà cha mẹ làm được ngay tuần này: **đăng ký cho
// con cái gì, chơi với con trò gì, hỏi nhà trường điều gì.**
//
// 🔑 HAI TRỤC ĐỘC LẬP, KHÔNG VIẾT MA TRẬN — cùng mẹo đã dùng cho bảng gợi ngành
// của tool Công Sở (7 + 4 + 4 khối thay vì 112 ô):
//
//   CHỌN GÌ   ← chất năng khiếu × nhóm tuổi   (bảng `HOAT_DONG`)
//   THAM GIA KIỂU NÀO ← kiểu người            (bảng `DINH_DANG`)
//
// Hai câu đó thật sự độc lập: hai đứa trẻ cùng nổi chất vận động vẫn phải chọn
// lớp khác nhau nếu một đứa cần thi đấu còn đứa kia cần nhóm nhỏ ổn định. Viết
// 8×4 + 4 khối thay vì 8×4×4 ô, và mỗi trục sửa được riêng.
//
// ⚠️ Đây là GỢI Ý ĐỂ THỬ, không phải chỉ định. Cổ thư nói về CHẤT của con
// người, nó không biết câu lạc bộ nào tồn tại ở Việt Nam năm nay. Danh sách
// hoạt động là quy chiếu của trang, và trang phải nói rõ chỗ đó — cùng ranh
// giới với danh sách ngành nghề hiện đại của tool Công Sở.
//
// ⛔ CẤM biến bậc này thành lời chốt nghề. "Cho con thử lớp robot" khác hẳn
// "con hợp làm kỹ sư". Cái đầu là một buổi học thử; cái sau là một cái nhãn
// dán lên đứa trẻ nhiều năm.
// ============================================================

import type { KieuId } from './cong-so';
import { KHIEU, type KhieuId, type KhieuScore } from './day-con-assess';

// ── Nhóm tuổi ───────────────────────────────────────────────
// Cắt theo CẤP HỌC Việt Nam, không cắt cho tròn số: cha mẹ nghĩ theo "con đang
// lớp mấy", và cái quyết định có đăng ký được lớp nào cũng là cấp học.

export type BandId = 'mam-non' | 'tieu-hoc' | 'thieu-nien' | 'thanh-thieu';

export const BAND_LABEL: Record<BandId, string> = {
  'mam-non': 'Trước tuổi đi học (dưới 6 tuổi)',
  'tieu-hoc': 'Tiểu học (khoảng 6–11 tuổi)',
  'thieu-nien': 'Cấp hai (khoảng 12–15 tuổi)',
  'thanh-thieu': 'Cấp ba trở lên (khoảng 16 tuổi trở lên)',
};

/**
 * Tuổi → nhóm.
 *
 * 🪤 `tuoi` truyền vào là TUỔI MỤ (engine trả `tuoiXem` theo tuổi mụ) — tính
 * theo tuổi tây là mọi mốc lệch một năm, đúng cái bẫy `namSinhTuLaSo` đã ghi.
 * Mốc dưới đây đã trừ sẵn: tuổi mụ 7 ≈ tuổi tây 6 = vào lớp 1.
 *
 * Không có tuổi (lá số thiếu `tuoiXem`) → trả `null`, và trang BỎ HẲN khối
 * hoạt động chứ không đoán bừa một nhóm tuổi: gợi ý lớp cấp ba cho một đứa bé
 * bốn tuổi là hỏng cả bậc này.
 */
export function bandOf(tuoi: number | null | undefined): BandId | null {
  if (typeof tuoi !== 'number' || !Number.isFinite(tuoi) || tuoi <= 0) return null;
  if (tuoi <= 6) return 'mam-non';
  if (tuoi <= 11) return 'tieu-hoc';
  if (tuoi <= 15) return 'thieu-nien';
  return 'thanh-thieu';
}

// ── Bảng hoạt động theo CHẤT × NHÓM TUỔI ────────────────────
// `clb` = việc phải đăng ký / ra khỏi nhà. `nha` = việc làm được tối nay, 0đ.
// Cố ý luôn có cả hai: bậc này mà chỉ toàn "đi học thêm" thì nó thành đơn
// hàng cho trung tâm, không phải lời khuyên cho cha mẹ.

interface HoatDongKhieu {
  clb: Record<BandId, string[]>;
  nha: Record<BandId, string[]>;
}

export const HOAT_DONG: Record<KhieuId, HoatDongKhieu> = {
  'ngon-ngu': {
    clb: {
      'mam-non': [
        'Lớp kể chuyện / đọc sách cùng cô — chọn lớp có phần trẻ được NÓI, không chỉ ngồi nghe',
        'Góc đóng vai (bán hàng, bác sĩ, nấu ăn) ở trường hoặc khu vui chơi',
        'Tiếng Anh qua bài hát và trò chơi — chưa cần học chữ, chưa cần ngữ pháp',
      ],
      'tieu-hoc': [
        'Câu lạc bộ kể chuyện / dẫn chương trình nhí',
        'Lớp viết sáng tạo hoặc lớp làm báo tường',
        'Tiếng Anh chú trọng GIAO TIẾP (giờ nói nhiều hơn giờ ngữ pháp)',
      ],
      'thieu-nien': [
        'Câu lạc bộ tranh biện / hùng biện',
        'Ban báo trường, kênh podcast hoặc bản tin của lớp',
        'Câu lạc bộ sách — loại có buổi bàn luận, không chỉ mượn sách',
      ],
      'thanh-thieu': [
        'Đội tuyển tranh biện, mô phỏng hội nghị (MUN), thi hùng biện',
        'Viết cho ấn phẩm / trang tin của trường hoặc bên ngoài',
        'Dạy kèm em nhỏ — dạy là cách kiểm tra hiểu thật nhanh nhất',
      ],
    },
    nha: {
      'mam-non': [
        'Đọc truyện trước khi ngủ, dừng giữa chừng hỏi "con nghĩ tiếp theo thế nào"',
        'Trò kể nối: mỗi người thêm một câu vào cùng một chuyện',
        'Đi chợ thì gọi tên đồ vật, hỏi con mô tả lại',
      ],
      'tieu-hoc': [
        'Mỗi tối con kể một chuyện ở trường có đủ mở đầu – diễn biến – kết',
        'Trò "hai thật một bịa": con kể ba chuyện, cả nhà đoán chuyện nào bịa',
        'Nhật ký ba dòng mỗi ngày — ba dòng thôi, đừng đòi hơn',
      ],
      'thieu-nien': [
        'Cả nhà đọc chung một cuốn rồi cãi nhau về nó',
        'Giao con soạn tin nhắn / thư thay mặt gia đình',
        'Cho con giảng lại cho em một bài con vừa học',
      ],
      'thanh-thieu': [
        'Cho con chủ trì một cuộc họp gia đình thật, có việc phải chốt',
        'Tập phỏng vấn: con hỏi một người lớn về nghề của họ trong 20 phút',
        'Cho con tóm tắt một bài dài xuống còn 10 câu',
      ],
    },
  },
  'suy-luan': {
    clb: {
      'mam-non': [
        'Lớp xếp hình, lego, khối gỗ',
        'Lớp toán tư duy qua TRÒ CHƠI — tránh lớp luyện viết số ở tuổi này',
        'Lớp khoa học vui, thí nghiệm đơn giản',
      ],
      'tieu-hoc': [
        'Câu lạc bộ cờ vua hoặc cờ tướng',
        'Câu lạc bộ robot / lego lập trình',
        'Lớp toán tư duy — chọn lớp có bài mở nhiều cách giải, không phải lớp luyện đề',
      ],
      'thieu-nien': [
        'Câu lạc bộ lập trình / tin học',
        'Câu lạc bộ cờ, giải đố logic',
        'Câu lạc bộ khoa học, làm đề tài nghiên cứu nhỏ',
      ],
      'thanh-thieu': [
        'Đội tuyển toán / tin học, thi khoa học kỹ thuật',
        'Câu lạc bộ nghiên cứu, cuộc thi giải pháp',
        'Câu lạc bộ tài chính — đầu tư mô phỏng, không dùng tiền thật',
      ],
    },
    nha: {
      'mam-non': [
        'Chơi phân loại: theo màu, theo cỡ, theo hình',
        'Đếm và chia đồ khi dọn bàn ăn',
        'Hỏi "con đoán chuyện gì xảy ra nếu…" rồi cùng thử',
      ],
      'tieu-hoc': [
        'Sudoku, rubik, cờ ca-rô',
        'Trò "20 câu hỏi" — con đoán đồ vật bằng cách hỏi có/không',
        'Đưa con tiền lẻ và để con tự tính khi đi chợ',
      ],
      'thieu-nien': [
        'Giao con lập ngân sách cho một chuyến đi của nhà',
        'Đố logic, mật mã, trò suy luận',
        'Cho con tự tháo và sửa một món đồ hỏng',
      ],
      'thanh-thieu': [
        'Giao con quản một khoản chi thật của gia đình trong một tháng',
        'Đọc một bài báo có số liệu rồi cùng tìm chỗ số liệu bị dùng sai',
        'Cho con so sánh và chọn mua một món đồ lớn cho nhà',
      ],
    },
  },
  'hinh-khoi': {
    clb: {
      'mam-non': [
        'Lớp vẽ tự do — chọn lớp KHÔNG tô theo mẫu',
        'Lớp xếp khối, lego, mô hình',
        'Lớp đất nặn, thủ công',
      ],
      'tieu-hoc': [
        'Câu lạc bộ mỹ thuật',
        'Câu lạc bộ lego / mô hình / gấp giấy',
        'Lớp nhiếp ảnh cho trẻ',
      ],
      'thieu-nien': [
        'Câu lạc bộ mỹ thuật hoặc thiết kế',
        'Câu lạc bộ nhiếp ảnh, quay dựng video',
        'Lớp vẽ kỹ thuật / kiến trúc nhập môn',
      ],
      'thanh-thieu': [
        'Lớp thiết kế đồ hoạ, kiến trúc, nội thất nhập môn',
        'Câu lạc bộ làm phim',
        'Các cuộc thi vẽ, thiết kế, ảnh',
      ],
    },
    nha: {
      'mam-non': [
        'Vẽ lại một thứ vừa nhìn thấy, không nhìn mẫu',
        'Xếp hình, ghép tranh',
        'Cho con bày mâm cơm theo ý con',
      ],
      'tieu-hoc': [
        'Vẽ bản đồ đường từ nhà tới trường',
        'Gấp giấy origami theo hướng dẫn hình',
        'Cho con sắp lại góc học tập theo ý con',
      ],
      'thieu-nien': [
        'Giao con thiết kế lại một góc trong nhà, có ngân sách',
        'Làm poster / thiệp cho dịp của gia đình',
        'Dựng một video ngắn về một ngày của nhà',
      ],
      'thanh-thieu': [
        'Nhận một việc thiết kế thật: bìa kỷ yếu, logo cho lớp, gian hàng hội chợ',
        'Dựng một tập hồ sơ tác phẩm để dành cho hồ sơ tuyển sinh',
        'Đi xem triển lãm rồi cùng mổ xẻ vì sao nó đẹp',
      ],
    },
  },
  'van-dong': {
    clb: {
      'mam-non': [
        'Lớp thể chất / vận động cho trẻ nhỏ',
        'Bơi',
        'Lớp múa, nhảy, vận động theo nhạc',
      ],
      'tieu-hoc': [
        'Võ: taekwondo, vovinam, judo, aikido',
        'Bơi, bóng đá, bóng rổ, cầu lông',
        'Câu lạc bộ thủ công, làm đồ bằng tay',
      ],
      'thieu-nien': [
        'Đội tuyển thể thao của trường',
        'Leo núi nhân tạo, điền kinh, bơi thi đấu',
        'Câu lạc bộ kỹ thuật: mộc, cơ khí, điện tử',
      ],
      'thanh-thieu': [
        'Câu lạc bộ thể thao thi đấu, giải phong trào',
        'Lớp nghề thật: bếp, mộc, điện, cơ khí, làm đẹp',
        'Làm trợ lý huấn luyện cho lớp các em nhỏ',
      ],
    },
    nha: {
      'mam-non': [
        'Ra ngoài trời ít nhất một tiếng mỗi ngày — đây là việc quan trọng nhất trong bảng này',
        'Dựng đường vượt chướng ngại bằng gối và ghế trong nhà',
        'Cho con bê, xếp, dọn đồ nặng vừa sức',
      ],
      'tieu-hoc': [
        'Đạp xe, nhảy dây đếm số, đá cầu',
        'Cho con phụ bếp phần an toàn: nhặt rau, trộn, xếp',
        'Xen kẽ 25 phút học – 5 phút vận động, đừng bắt ngồi liền một mạch',
      ],
      'thieu-nien': [
        'Chạy bộ hoặc đạp xe cùng con, có ghi lại quãng đường',
        'Giao con tự bảo dưỡng xe đạp, thay bóng đèn, lắp đồ',
        'Chọn một kỹ năng đo được tiến bộ theo tuần và theo đuổi 8 tuần',
      ],
      'thanh-thieu': [
        'Đặt một mục tiêu thể lực 8 tuần và cùng theo',
        'Làm trọn vẹn MỘT sản phẩm bằng tay từ đầu đến cuối',
        'Giao con nấu bữa tối cho cả nhà mỗi tuần một lần',
      ],
    },
  },
  'am-nhac': {
    clb: {
      'mam-non': [
        'Lớp cảm thụ âm nhạc cho trẻ nhỏ',
        'Lớp gõ nhịp, trống, bộ gõ',
        'Hát tập thể ở trường',
      ],
      'tieu-hoc': [
        'Lớp nhạc cụ: piano, guitar, organ, trống, sáo',
        'Hợp xướng, đội văn nghệ',
        'Lớp thanh nhạc cơ bản',
      ],
      'thieu-nien': [
        'Ban nhạc trường, dàn nhạc, hợp xướng',
        'Lớp sản xuất nhạc trên máy tính',
        'Lớp nhạc lý nếu con đã chơi được một nhạc cụ',
      ],
      'thanh-thieu': [
        'Ban nhạc có biểu diễn thật',
        'Lớp sáng tác / hoà âm / thu âm',
        'Các cuộc thi âm nhạc, đêm nhạc trường',
      ],
    },
    nha: {
      'mam-non': [
        'Hát cùng con và vỗ tay theo nhịp',
        'Đoán bài hát qua giai điệu ngân nga',
        'Cho con gõ nồi, xoong, hộp — đúng nghĩa đen',
      ],
      'tieu-hoc': [
        'Nghe một bản nhạc rồi đoán có những nhạc cụ nào',
        'Đặt bài học khó thành bài hát để thuộc',
        'Đặt lời mới cho một giai điệu quen',
      ],
      'thieu-nien': [
        'Cho con làm nhạc nền cho video của gia đình',
        'Chọn một bản đủ khó và luyện trong 6 tuần, có ngày biểu diễn cho cả nhà',
        'Nghe cùng con nhạc con thích và hỏi con thích chỗ nào',
      ],
      'thanh-thieu': [
        'Thu một bản hoàn chỉnh, kể cả thu bằng điện thoại',
        'Đi xem một buổi biểu diễn thật rồi cùng mổ xẻ',
        'Cho con dạy nhạc cho em nhỏ trong nhà',
      ],
    },
  },
  'hieu-nguoi': {
    clb: {
      'mam-non': [
        'Lớp có nhóm bạn CỐ ĐỊNH, không đổi bạn liên tục',
        'Góc đóng vai, trò chơi giả bộ',
        'Sân chơi nhiều lứa tuổi',
      ],
      'tieu-hoc': [
        'Câu lạc bộ kỹ năng sống, hướng đạo sinh',
        'Môn thể thao ĐỒNG ĐỘI',
        'Việc có vai trong lớp: tổ trưởng, sao đỏ, luân phiên',
      ],
      'thieu-nien': [
        'Câu lạc bộ tình nguyện',
        'Ban cán sự lớp, đoàn đội',
        'Câu lạc bộ dẫn chương trình, tổ chức sự kiện',
      ],
      'thanh-thieu': [
        'Dự án cộng đồng do chính con đứng ra tổ chức',
        'Câu lạc bộ khởi nghiệp, kinh doanh học đường',
        'Làm trợ giảng hoặc người kèm cặp cho lớp dưới',
      ],
    },
    nha: {
      'mam-non': [
        'Đọc truyện rồi hỏi "bạn ấy đang thấy thế nào"',
        'Cho con chia phần bánh cho cả nhà',
        'Chơi đóng vai đổi chỗ: con làm bố mẹ, bố mẹ làm con',
      ],
      'tieu-hoc': [
        'Cho con tự tổ chức một buổi mời bạn tới nhà chơi',
        'Khi anh em cãi nhau, giao con làm người phân xử',
        'Xem phim rồi đoán nhân vật đang nghĩ gì',
      ],
      'thieu-nien': [
        'Cho con dẫn một buổi họp gia đình',
        'Giao con kèm em học một môn',
        'Đi làm tình nguyện cùng con, để con chọn nơi đi',
      ],
      'thanh-thieu': [
        'Giao con thương lượng một việc thật: đặt phòng, mặc cả, đổi hàng',
        'Cho con phỏng vấn ba người lớn về nghề rồi kể lại',
        'Để con làm người đại diện gia đình trong một việc nhỏ',
      ],
    },
  },
  'hieu-minh': {
    clb: {
      'mam-non': [
        'Lớp ít trẻ, có góc yên để rút vào khi cần',
        'Lớp kể chuyện có khoảng lặng, không dồn dập',
        'Vận động nhẹ tự chọn, không thi đua',
      ],
      'tieu-hoc': [
        'Lớp học nhóm nhỏ thay vì lớp đông',
        'Câu lạc bộ đọc sách',
        'Cờ vua, yoga hoặc lớp tĩnh cho trẻ',
      ],
      'thieu-nien': [
        'Câu lạc bộ nghiên cứu, dự án cá nhân dài hơi',
        'Lớp viết, nhật ký, sáng tác',
        'Yoga, thiền, môn thể thao cá nhân',
      ],
      'thanh-thieu': [
        'Khoá học trực tuyến con TỰ chọn đề tài',
        'Câu lạc bộ triết học, tâm lý, đọc sâu',
        'Dự án cá nhân kéo dài một năm học',
      ],
    },
    nha: {
      'mam-non': [
        'Cho con một góc riêng không ai được vào',
        'Hỏi "hôm nay con thấy thế nào" rồi CHỜ, đừng gợi ý hộ',
        'Để con đọc hoặc chơi một mình mà không hỏi han',
      ],
      'tieu-hoc': [
        'Sổ tay riêng, người lớn không đọc',
        'Hai mươi phút một mình mỗi ngày, không hỏi con đang làm gì',
        'Cho con chọn một dự án riêng và tự đặt hạn',
      ],
      'thieu-nien': [
        'Cho con theo đuổi một đề tài suốt học kỳ, không đòi kết quả sớm',
        'Hỏi con một câu lớn rồi NGHE hết, không phản bác',
        'Đi bộ cùng con, không mang điện thoại',
      ],
      'thanh-thieu': [
        'Bàn chuyện chọn ngành theo thứ con muốn sống cùng, không theo mức lương',
        'Cho con tự lên kế hoạch trọn vẹn một chuyến đi',
        'Cùng đọc một cuốn khó rồi trao đổi như hai người lớn',
      ],
    },
  },
  'thien-nhien': {
    clb: {
      'mam-non': [
        'Trường hoặc lớp có sân vườn thật',
        'Trại thiên nhiên ngắn ngày cho trẻ nhỏ',
        'Lớp chăm cây, gieo hạt',
      ],
      'tieu-hoc': [
        'Câu lạc bộ sinh học, thiên nhiên',
        'Hướng đạo sinh, cắm trại',
        'Lớp làm vườn, nông trại cuối tuần',
      ],
      'thieu-nien': [
        'Câu lạc bộ môi trường',
        'Trại kỹ năng dã ngoại, sinh tồn cơ bản',
        'Câu lạc bộ sinh học, thí nghiệm',
      ],
      'thanh-thieu': [
        'Tình nguyện về môi trường hoặc cứu hộ động vật',
        'Trại hè y sinh, khoa học sự sống',
        'Đề tài nghiên cứu về sinh thái địa phương',
      ],
    },
    nha: {
      'mam-non': [
        'Một chậu cây con TỰ chăm, không ai tưới hộ',
        'Ra công viên nhặt lá rồi phân loại',
        'Nuôi một con vật nhỏ dễ chăm',
      ],
      'tieu-hoc': [
        'Giao hẳn con chăm một cây hoặc một con vật, có trách nhiệm thật',
        'Ghi sổ theo dõi: cao thêm bao nhiêu, ăn bao nhiêu',
        'Đi chợ cùng và để con chọn rau, giải thích vì sao chọn',
      ],
      'thieu-nien': [
        'Làm một dự án nhỏ tại nhà: ủ rác hữu cơ, trồng rau ban công',
        'Đi rừng, leo núi cùng con',
        'Học sơ cứu cơ bản cùng nhau',
      ],
      'thanh-thieu': [
        'Giao con phụ trách mảng ăn uống — sức khoẻ của nhà trong một tháng',
        'Tìm hiểu một nghề chăm sóc thật: gặp và hỏi người đang làm',
        'Tham gia một đợt tình nguyện dài hơn một ngày',
      ],
    },
  },
};

// ── Cách tham gia, theo KIỂU NGƯỜI ──────────────────────────
// Trục thứ hai. Chọn đúng hoạt động mà sai định dạng thì con bỏ sau ba buổi —
// và cha mẹ kết luận nhầm là "con không có năng khiếu cái đó".

export interface DinhDang {
  /** Định dạng lớp / nhóm hợp với kiểu này. */
  nen: string;
  /** Định dạng làm kiểu này bỏ ngang. */
  tranh: string;
  /** Cách cho con bắt đầu để con không bỏ sau vài buổi. */
  batDau: string;
}

export const DINH_DANG: Record<KieuId, DinhDang> = {
  'khai-sang': {
    nen: 'Lớp có thử thách, có thi đấu, có thắng thua đo được. Con cần cảm giác đang chinh phục một thứ, không phải đang hoàn thành một giáo trình.',
    tranh:
      'Lớp học thuộc dài kỳ, lớp phải xếp hàng chờ tới lượt, lớp mà buổi nào cũng giống buổi nào. Con sẽ phá hoặc bỏ.',
    batDau:
      'Cho học thử MỘT buổi trước khi đăng ký cả khoá, và để con tự chọn trong hai ba lựa chọn bạn đã lọc sẵn. Được chọn thì con mới chịu ở lại.',
  },
  'lanh-dao': {
    nen: 'Lớp có lộ trình rõ, có cấp bậc hoặc đai hoặc chứng chỉ, và con được giao hẳn một phần việc có quyền quyết trong phần đó.',
    tranh:
      'Lớp thả tự do không mốc, giáo viên đổi liên tục, luật đổi giữa chừng. Con chịu được khó, nhưng không chịu được bất nhất.',
    batDau:
      'Cho con xem trước lộ trình cả khoá và mốc đầu tiên đạt được sau bao lâu. Biết đích ở đâu thì con vào rất nghiêm túc.',
  },
  'ho-tro': {
    nen: 'Lớp có chỗ để con trình bày, được hỏi ý kiến, có bạn để nói chuyện. Con học bằng cách nói ra.',
    tranh:
      'Lớp im lặng làm bài, một mình một máy, không ai hỏi tới. Con héo rất nhanh ở đó dù học phí có cao đến đâu.',
    batDau:
      'Đưa con tới xem một buổi rồi hỏi con kể lại. Con kể hào hứng và nhớ chi tiết nghĩa là hợp — im lặng nghĩa là không.',
  },
  'hop-tac': {
    nen: 'Nhóm nhỏ ổn định, giáo viên không đổi, độ khó tăng dần. Con cần thời gian ngấm và cần người quen bên cạnh.',
    tranh:
      'Lớp đông, hay đổi bạn, thi đấu loại trực tiếp ngay từ đầu. Con không phản ứng ra ngoài đâu — con lặng lẽ tin là mình kém.',
    batDau:
      'Đi cùng con vài buổi đầu rồi mới rút. Báo trước mọi thay đổi ít nhất một tuần, đừng đổi phút chót.',
  },
};

// ── Ghép lại ────────────────────────────────────────────────

export interface GoiYChat {
  id: KhieuId;
  ten: string;
  diem: number;
  clb: string[];
  nha: string[];
  oLop: string;
  chuY: string;
}

export interface GoiYHoatDong {
  band: BandId;
  bandLabel: string;
  /** Gợi ý theo các chất NỔI. Rỗng khi lá số không có chất nào nổi. */
  theoChat: GoiYChat[];
  /** Cách cho con tham gia — theo kiểu người, luôn có. */
  dinhDang: DinhDang;
  /**
   * Ca không có chất nào nổi. Trang PHẢI nói thẳng thay vì lấp bằng ba chất
   * cao nhất: xem chú thích ngưỡng trong `day-con-assess.ts`.
   */
  chuaRo: boolean;
  /** Ca `chuaRo` thì đây là ba chất cao nhất, gọi đúng tên là "đáng cho thử". */
  dangThu: GoiYChat[];
}

function goiYChat(k: KhieuScore, band: BandId): GoiYChat {
  const h = HOAT_DONG[k.id];
  return {
    id: k.id,
    ten: k.ten,
    diem: k.diem,
    clb: h.clb[band],
    nha: h.nha[band],
    oLop: KHIEU[k.id].oLop,
    chuY: KHIEU[k.id].chuY,
  };
}

/**
 * Gợi ý hoạt động. Trả `null` khi không biết tuổi — xem `bandOf`.
 *
 * `khieu` phải là danh sách ĐÃ SẮP giảm dần (đúng thứ `assessChild` trả về).
 */
export function goiYHoatDong(
  khieu: KhieuScore[],
  noiBat: KhieuScore[],
  kieu: KieuId,
  tuoi: number | null | undefined,
): GoiYHoatDong | null {
  const band = bandOf(tuoi);
  if (!band) return null;
  const chuaRo = noiBat.length === 0;
  return {
    band,
    bandLabel: BAND_LABEL[band],
    theoChat: noiBat.map((k) => goiYChat(k, band)),
    dinhDang: DINH_DANG[kieu],
    chuaRo,
    dangThu: chuaRo ? khieu.slice(0, 3).map((k) => goiYChat(k, band)) : [],
  };
}
