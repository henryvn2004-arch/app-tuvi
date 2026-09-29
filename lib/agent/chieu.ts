// lib/agent/chieu.ts
// ============================================================
// Kho CHUNG câu đinh + chiêu cho cả 15 thầy (Henry 2026-09-29).
//
// 🔴 Vì sao chung, không gán theo thầy: gán cố định ("Ngọc Tinh = lục bát",
// "Đẩu Nam = câu bóc có vần") thì nghe ba lượt là đoán được lượt thứ tư — rập
// khuôn. Thầy giữ THÁI ĐỘ + xưng hô + dấu riêng (lib/agent/personas.ts); còn
// kiểu câu đinh và chiêu thì thầy nào cũng dùng được, server bốc theo NGỮ CẢNH.
//
// 🔴 Vì sao server bốc chứ không đưa cả kho cho model tự chọn: model tệ khoản
// ngẫu nhiên — bảo "chọn một kiểu" là nó chọn đúng một kiểu mãi (xem nhip.ts),
// và nhét 35 mục vào system là tốn token mỗi lượt lẫn loãng luật. Server lọc
// theo ngữ cảnh + không lặp trong 3 lượt; CHỈ kiểu đã bốc đi vào dòng [NHỊP] cuối
// tin user (không đụng system ⇒ prompt cache không vỡ).
//
// Câu đinh: một kiểu mỗi lượt được phép. Chiêu: server lọc ra tối đa HAI chiêu hợp
// ngữ cảnh, model chọn cái hợp nhất với đoạn đang chat (hoặc bỏ nếu không hợp).
// ============================================================

import { chuanHoaDauThanh } from '@/lib/vn-text';

export interface NguCanh {
  /** Câu hỏi đã chuẩn hoá (chữ thường, chuẩn dấu thanh). */
  q: string;
  loai: string;
  nhuCau: string;
  /** `cacChuDe()` của lib/agent/luan-chu-de.ts — có thể rỗng. */
  chuDe: string[];
  /** Thứ tự lượt user trong hội thoại, 0 = lượt mở. */
  luot: number;
}

export interface KieuDinh {
  id: string;
  ten: string;
  vd: string;
  /** Chỉ bốc khi câu hỏi thuộc một trong các chủ đề này; bỏ trống = mọi chủ đề. */
  chuDe?: string[];
}

export const KIEU_DINH: KieuDinh[] = [
  { id: 'van-veo', ten: 'vần vè kiểu thơ con cóc hiện đại, có vần nhịp như vè dân gian', vd: '"Đời còn dài, mình còn trẻ / Cái gì vui vẻ thì mình ưu tiên."' },
  { id: 'khau-khi', ten: 'khẩu khí khẳng định / thách thức hài hước', vd: '"Chuẩn bài luôn!" / "Hình như tôi nuông chiều anh quá nên anh hư đúng không?"' },
  { id: 'tu-gieu', ten: 'tự giễu cái nghèo / cái ế', vd: '"Tiền thì em không thiếu, nhưng nhiều thì em không có." / "Hướng nội nhưng thích nhiều tiền."', chuDe: ['tai-chinh', 'tinh-duyen'] },
  { id: 'triet-ly-doi', ten: 'triết lý đời nửa thật nửa đùa (slogan giang hồ/mạng)', vd: '"Còn thở là còn gỡ."' },
  { id: 'doi-dap', ten: 'câu đối đáp / bắt bẻ chặt chém kiểu hội thoại', vd: '"Thấy quen quen? Quen cái gì mà quen!" / "Ơ kìa, ai lại làm thế bao giờ!"' },
  { id: 'an-uong', ten: 'triết lý ăn uống / đời sống bình dân', vd: '"Ăn được ngủ được là tiên, không ăn không ngủ mất tiền thêm tiên."' },
  { id: 'slogan', ten: 'slogan khẳng định bản thân / thả thính ngắn', vd: '"Bên ngoài xinh đẹp, bên trong nhiều tiền." / "Nắng gắt đã có ô, còn em ngoan thế ai lo?"' },
  { id: 'thac-mac', ten: 'thắc mắc vô tri / ngơ ngác hài hước', vd: '"Sao chốt đơn lẹ vậy?" / "Ủa rồi mắc gì làm vậy?"' },
  { id: 'khau-ngu', ten: 'khẩu ngữ / ngữ điệu miền biến tấu', vd: '"Chứ sao nữa!" / "Ủa alo?"' },
  { id: 'an-du-doi', ten: 'ẩn dụ đời thường tượng hình', vd: '"Hết nước chấm." / "Đúng là gạt giò người ta."' },
  { id: 'dung-bao-gio', ten: 'mô-típ "Đừng bao giờ…" đúc kết châm biếm', vd: '"Đừng bao giờ dạy nhà giàu cách tiêu tiền." / "Đừng thấy hoa nở mà ngỡ xuân về."' },
  { id: 'be-lai', ten: 'cú đảo từ / bẻ lái bất ngờ ở cuối câu', vd: '"Không phải không muốn, mà là không thể… mua được." / "Tôi rất kiên cường, cho đến khi thấy đồ giảm giá."' },
  { id: 'tuc-ngu-che', ten: 'biến tấu tục ngữ cũ sang nghĩa mới', vd: '"Gần mực thì đen, gần Tết thì hết tiền."' },
  { id: 'noi-long', ten: 'nói ngược / nói lóng hài hước', vd: '"Gia đình xin cảm ơn." / "Ôi là trời."' },
  { id: 'cua-mieng-hot', ten: 'câu cửa miệng ăn theo trào lưu mạng (chỉ dùng câu đã phổ biến lâu, không bịa trend)', vd: '"Ơ mây zing, gút chóp em." / "Thật là ố dề!"' },
  { id: 'tre-khong-gia', ten: 'mô-típ "Trẻ không… già…" biến tấu', vd: '"Trẻ không xõa, già lấy gì kể cho cháu nghe."' },
  { id: 'hoc-thuat-lay', ten: 'bẻ lái từ học thuật sang lầy lội', vd: '"Toán học dạy tôi tính toán… nhưng không tính được lòng người." / "Tiếng Anh quan trọng, nhưng tiền Việt quan trọng hơn."' },
  { id: 'doc-than', ten: 'tuyên ngôn sống độc thân / yêu bản thân', vd: '"Đột nhiên nhớ ra… mình làm gì có người yêu mà nhớ."', chuDe: ['tinh-duyen'] },
  { id: 'template', ten: 'khung câu thán từ "cực đoan" hài hước để tự điền', vd: '"Nước đi này tớ đi lại!" / "Ai rồi cũng phải…"' },
  { id: 'lam-cong', ten: 'triết lý làm công ăn lương', vd: '"Sếp nói gì cũng đúng, trừ việc đòi tăng lương." / "Đi làm vì đam mê… kiếm tiền."', chuDe: ['su-nghiep', 'tai-chinh'] },
];

export interface Chieu {
  id: string;
  ten: string;
  /** Cách nói + một câu ví dụ, gửi nguyên cho model. */
  cach: string;
  /** Ngữ cảnh hợp. */
  khi: (c: NguCanh) => boolean;
  /** Ngữ cảnh RẤT hợp ⇒ bật chiêu lượt này, không cần bốc xác suất. */
  manh?: (c: NguCanh) => boolean;
}

const coCum = (q: string, xs: string[]) => xs.some((x) => q.includes(x));
// `NguCanh.q` đã qua `chuanHoaDauThanh` (nhip.ts) — "người" thành "ngừơi" — nên cụm
// phải chuẩn hoá CÙNG cách, không thì không khớp gì cả mà vẫn không báo lỗi.
const cum = (xs: string[]) => xs.map((x) => chuanHoaDauThanh(x.toLowerCase().normalize('NFC')));
const VAN = cum(['năm nay', 'năm sau', 'năm tới', 'sang năm', 'tháng này', 'tháng tới', 'tháng sau', 'sắp tới', 'thời gian tới', 'vận hạn', 'giải hạn', 'tiểu hạn', 'đại vận', 'vận năm', 'vận tháng']);
const TINH_CACH = cum(['người thế nào', 'người như thế nào', 'tính cách', 'con người tôi', 'tôi là người', 'em là người', 'mình là người']);
const THAT_BAI = cum(['thất bại', 'thua lỗ', 'lỗ vốn', 'sai lầm', 'hối hận', 'mất trắng', 'bị lừa', 'đổ vỡ']);
const LECH = cum(['không đúng', 'sai rồi', 'không khớp', 'chưa đúng', 'không chuẩn', 'không giống', 'sai bét']);
const MAI_KHONG = cum(['mãi không', 'sao mãi', 'làm hoài', 'cứ bị', 'lần nào cũng', 'tiền kiếp', 'nghiệp']);
const HOP_TAC = cum(['hợp tác', 'làm ăn chung', 'đối tác', 'góp vốn', 'chung vốn']);
const co = (c: NguCanh, ...ids: string[]) => c.chuDe.some((x) => ids.includes(x));
const dap = (c: NguCanh) => c.nhuCau === 'giai-dap';

export const CHIEU: Chieu[] = [
  {
    id: 'barnum', ten: 'Mô tả hai mặt ai nghe cũng thấy mình',
    cach: 'nói một nét tính cách có hai mặt, gắn với điểm có thật trong lá số, để người xem tự gật: "Ngoài ai cũng thấy mạnh mẽ, tự lập — mà đêm về mới biết mình chịu nhiều thế nào. Dễ mủi lòng nên hay bị nhờ vả quá tay."',
    khi: (c) => coCum(c.q, TINH_CACH) || (c.luot === 0 && c.loai === 'doi-song') || co(c, 'tinh-duyen'),
    manh: (c) => coCum(c.q, TINH_CACH),
  },
  {
    id: 'do-duong', ten: 'Dò đường',
    cach: 'đưa hai–ba khả năng hay gặp rồi hỏi lại để người xem tự chỉ ra cái đúng, lượt sau xoáy vào đúng ý họ xác nhận: "Trong nhà dạo này hoặc vướng chuyện đất đai, hoặc có người đi xa, hoặc có người không khoẻ — đúng không?"',
    khi: (c) => c.luot === 0 || co(c, 'cha-me', 'ho-hang', 'anh-em', 'nha-dat'),
  },
  {
    id: 'so-roi-go', ten: 'Nặng trước, gỡ sau',
    cach: 'nói thẳng cái hạn nặng nhất có trong dữ liệu lượt này, rồi mở ngay đường gỡ bằng điểm cứu có thật (sao tốt, cung đỡ) và một việc người xem tự làm được: "Năm nay dễ hao tài, dính giấy tờ — nhưng có chỗ đỡ. Ký gì cũng đọc kỹ, tiền lớn đừng cho vay là qua." Chỉ dùng khi dữ liệu có hạn xấu thật; đường gỡ là việc tự làm, không khuyên cúng bái tốn tiền.',
    khi: (c) => dap(c) && coCum(c.q, VAN),
  },
  {
    id: 'neo-tham-quyen', ten: 'Neo thẩm quyền',
    cach: 'đặt lá số người xem cạnh kiểu người thành đạt hay mang cùng cách cục, để họ thấy đường dài: "Cách cục này tôi gặp không ít ở người làm lãnh đạo — đoạn đầu gian nan, qua bốn mươi mới phát mạnh." Nói theo KIỂU NGƯỜI, không bịa một người cụ thể có tên tuổi.',
    khi: (c) => co(c, 'su-nghiep', 'tai-chinh') || c.nhuCau === 'hy-vong',
  },
  {
    id: 'go-toi', ten: 'Gỡ tội cho người xem',
    cach: 'khi người xem kể một thất bại, đặt nó vào đúng giai đoạn vận xuống trong dữ liệu để họ bớt tự trách: "Đoạn đó thua không phải vì anh dở — vận lúc ấy đang đi xuống, giỏi mấy cũng khó. Qua mốc này mới là lúc làm lại."',
    khi: (c) => c.nhuCau === 'an-ui' || c.nhuCau === 'phe-minh' || coCum(c.q, THAT_BAI),
    manh: (c) => coCum(c.q, THAT_BAI),
  },
  {
    id: 'dieu-kien-dao', ten: 'Mệnh đề điều kiện đảo ngược',
    cach: 'nói theo khung "nếu đã có A thì là đúng số; nếu chưa có thì là vì B đang nén lại": "Lá số này đúng ra có nhà đất trong tay rồi. Nếu chưa có thì là lộc đang bị nén, tới mốc vận tốt mới mở."',
    khi: (c) => co(c, 'nha-dat', 'tai-chinh'),
  },
  {
    id: 'doan-theo-tuoi', ten: 'Đoán theo tuổi và hoàn cảnh',
    cach: 'dựa vào tuổi/giới trong lá số và giai đoạn đời hay gặp ở tuổi đó để đoán mối bận tâm hiện tại rồi hỏi lại: "Tầm tuổi này tâm tư đang rối chuyện gia đình đúng không? Nói ba câu là lệch nhịp?"',
    khi: (c) => c.luot === 0 || co(c, 'tinh-duyen', 'con-cai'),
  },
  {
    id: 'moc-mo', ten: 'Mốc thời gian mở',
    cach: 'nói một thay đổi lớn trong khoảng thời gian rộng, đưa vài dạng nó có thể xảy ra: "Trong hai–ba năm tới nhà anh kiểu gì cũng có thay đổi lớn: chuyển/sửa nhà, đổi việc, hoặc có người thân đi xa." Khoảng thời gian bám theo mốc vận có trong dữ liệu.',
    khi: (c) => dap(c) && coCum(c.q, VAN),
  },
  {
    id: 'keo-day', ten: 'Kéo – đẩy',
    cach: 'khen một điểm mạnh thật, rồi "NHƯNG" chỉ đúng cái tật làm hỏng điểm mạnh đó, rồi cách giữ: "Tài Bạch đẹp đấy, kiếm tiền giỏi — NHƯNG tính tin người, tiền vào tay trái ra tay phải. Không rào lại thì về già mới tiếc."',
    khi: (c) => dap(c) && (co(c, 'tai-chinh', 'su-nghiep') || coCum(c.q, TINH_CACH)),
  },
  {
    id: 'canh-bao-truoc', ten: 'Cảnh báo trước',
    cach: 'báo trước một kiểu rủi ro người để người xem tự để ý từ giờ: "Năm nay làm ăn chung dễ gặp người nói một đằng làm một nẻo — giấy trắng mực đen cho rõ, tiền chung phải có sổ." Cảnh giác việc cụ thể, không bảo nghi hết mọi người.',
    khi: (c) => dap(c) && (coCum(c.q, HOP_TAC) || co(c, 'ban-be')),
    manh: (c) => dap(c) && coCum(c.q, HOP_TAC),
  },
  {
    id: 'truy-vet', ten: 'Truy vết ngược',
    cach: 'nối quá khứ với hiện tại thành một câu chuyện: "Bản tính anh sống tình cảm, lo cho người khác trước. Từng hết lòng mà nhận lại không xứng — nên giờ mới khoác lớp vỏ bất cần để tự giữ mình."',
    khi: (c) => coCum(c.q, TINH_CACH) || co(c, 'tinh-duyen', 'ban-be') || c.nhuCau === 'an-ui',
  },
  {
    id: 'gio-sinh', ten: 'Kiểm lại giờ sinh',
    cach: 'khi người xem nói lời luận không khớp đời họ, hỏi lại giờ sinh cho chắc — sinh sát ranh giới hai giờ thì lá số khác hẳn: "Lạ nhỉ, lá số này đúng ra phải có một lần đổi hướng lớn rồi. Giờ sinh có chắc không — hay nhập nhằng giữa hai giờ?" Mời họ kiểm lại giờ sinh; không tự đổi số liệu lá số.',
    khi: (c) => coCum(c.q, LECH),
    manh: (c) => coCum(c.q, LECH),
  },
  {
    id: 'duyen-no', ten: 'Duyên nợ tiền kiếp',
    cach: 'khi chuyện cứ lặp mà lá số không đủ giải thích, nói đó là duyên nợ cũ đang trả dần: "Lá số không xấu mà làm mãi không lên — là nợ cũ đang trả nốt. Trả bằng việc tử tế, trả xong là nhẹ." Không khuyên làm lễ tốn tiền.',
    khi: (c) => coCum(c.q, MAI_KHONG) || c.loai === 'be-tac',
    manh: (c) => coCum(c.q, MAI_KHONG),
  },
  {
    id: 'huu-duyen', ten: 'Hữu duyên nói kỹ',
    cach: 'cho người xem thấy lượt này được nói kỹ hơn thường: "Nói thật, bình thường tôi không nói kỹ thế này — nhưng hôm nay hữu duyên, nên nói hết cho anh."',
    khi: (c) => c.luot === 0 || c.loai === 'giai-thich',
  },
  {
    id: 'hai-chieu', ten: 'Dự báo hai chiều',
    cach: 'báo một mốc có cả lộc lẫn hao, và nói trước cách hiểu cả hai kết cục: "Tháng này có lộc tài, mà cũng dễ hao. Được tiền là đúng lộc; mất ít tiền là cái hao đã xả bớt hạn nặng — thế là may."',
    khi: (c) => dap(c) && coCum(c.q, VAN),
  },
];
