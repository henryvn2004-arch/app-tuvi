/**
 * lib/almanac/terms.ts — tầng DỊCH của Hoàng Lịch. Nơi DUY NHẤT biết chữ Hán.
 *
 * Bề mặt đo được trên 3 năm (2025–2027): 112 mục nghi/kỵ · 144 thần sát ·
 * 22 câu Bành Tổ · 12 mẫu xung sát · 9 cửu tinh.
 *
 * HAI CÁCH DỊCH CHO HAI LOẠI THUẬT NGỮ (xem `lib/hanviet.ts`):
 *  · NGHI/KỴ = việc người ta sắp LÀM ⇒ dịch tay, kèm nghĩa thường. Đây là phần
 *    có giá trị nhất của hoàng lịch, để nguyên Hán-Việt thì vô dụng.
 *  · THẦN SÁT = TÊN RIÊNG cổ pháp ⇒ phiên theo chữ. Sách lịch Việt vốn gọi
 *    đúng tên đó ("Thiên Đức", "Nguyệt Phá", "Cô Thần"); bịa nghĩa cho chúng
 *    còn tệ hơn để nguyên. Cát/hung thì mingyu đã gắn sẵn nên KHÔNG phải đoán.
 */
import { phienAm, canChiViet } from '../hanviet';

export { phienAm, canChiViet };

/** 112 việc nghi/kỵ — tên Hán-Việt + nghĩa thường. */
export const VIEC: Record<string, { ten: string; nghia: string }> = {
  // ── thờ cúng ──
  祭祀: { ten: 'Tế tự', nghia: 'cúng tế, lễ bái' },
  祈福: { ten: 'Cầu phúc', nghia: 'cầu an, cầu phúc' },
  求嗣: { ten: 'Cầu tự', nghia: 'cầu con cái' },
  开光: { ten: 'Khai quang', nghia: 'điểm nhãn tượng thờ' },
  塑绘: { ten: 'Tố hội', nghia: 'tạc tượng, vẽ tranh thờ' },
  斋醮: { ten: 'Trai tiếu', nghia: 'lập đàn cúng lễ' },
  普渡: { ten: 'Phổ độ', nghia: 'cúng cô hồn' },
  谢土: { ten: 'Tạ thổ', nghia: 'lễ tạ thần đất' },
  解除: { ten: 'Giải trừ', nghia: 'trừ tà, dọn uế khí' },
  出火: { ten: 'Xuất hỏa', nghia: 'dời bát hương đi' },
  安香: { ten: 'An hương', nghia: 'đặt bát hương, lập bàn thờ' },
  造庙: { ten: 'Tạo miếu', nghia: 'dựng đền miếu' },
  沐浴: { ten: 'Mộc dục', nghia: 'tắm gội trai giới' },

  // ── cưới hỏi, gia đạo ──
  嫁娶: { ten: 'Giá thú', nghia: 'cưới hỏi' },
  订盟: { ten: 'Đính minh', nghia: 'lễ ăn hỏi, đính ước' },
  纳采: { ten: 'Nạp thái', nghia: 'lễ dạm ngõ' },
  问名: { ten: 'Vấn danh', nghia: 'hỏi tên tuổi nhà gái' },
  合帐: { ten: 'Hợp trướng', nghia: 'may màn cưới' },
  冠笄: { ten: 'Quan kê', nghia: 'lễ trưởng thành' },
  纳婿: { ten: 'Nạp tế', nghia: 'rể về ở nhà vợ' },
  归宁: { ten: 'Quy ninh', nghia: 'con gái về nhà mẹ đẻ' },
  分居: { ten: 'Phân cư', nghia: 'ra ở riêng' },
  会亲友: { ten: 'Hội thân hữu', nghia: 'gặp gỡ họ hàng, bạn bè' },
  进人口: { ten: 'Tiến nhân khẩu', nghia: 'nhận thêm người vào nhà' },
  雇佣: { ten: 'Cố dung', nghia: 'thuê người làm' },

  // ── nhà cửa, xây cất ──
  动土: { ten: 'Động thổ', nghia: 'khởi công đào đất xây cất' },
  破土: { ten: 'Phá thổ', nghia: 'đào huyệt mộ (KHÁC động thổ xây nhà)' },
  起基: { ten: 'Khởi cơ', nghia: 'đặt móng' },
  定磉: { ten: 'Định tảng', nghia: 'đặt chân tảng cột' },
  竖柱: { ten: 'Thụ trụ', nghia: 'dựng cột' },
  上梁: { ten: 'Thượng lương', nghia: 'gác đòn nóc' },
  合脊: { ten: 'Hợp tích', nghia: 'khép nóc nhà' },
  盖屋: { ten: 'Cái ốc', nghia: 'lợp nhà' },
  修造: { ten: 'Tu tạo', nghia: 'sửa chữa, xây cất' },
  拆卸: { ten: 'Sách tá', nghia: 'tháo dỡ nhà cũ' },
  破屋: { ten: 'Phá ốc', nghia: 'phá nhà' },
  坏垣: { ten: 'Hoại viên', nghia: 'phá tường' },
  补垣: { ten: 'Bổ viên', nghia: 'vá tường' },
  修饰垣墙: { ten: 'Tu sức viên tường', nghia: 'sửa sang tường vách' },
  安门: { ten: 'An môn', nghia: 'lắp cửa' },
  修门: { ten: 'Tu môn', nghia: 'sửa cửa' },
  开柱眼: { ten: 'Khai trụ nhãn', nghia: 'đục lỗ mộng cột' },
  作梁: { ten: 'Tác lương', nghia: 'làm xà nhà' },
  作灶: { ten: 'Tác táo', nghia: 'đắp bếp, đặt bếp' },
  安床: { ten: 'An sàng', nghia: 'kê giường' },
  入宅: { ten: 'Nhập trạch', nghia: 'về nhà mới' },
  移徙: { ten: 'Di tỉ', nghia: 'dời chỗ ở' },
  置产: { ten: 'Trí sản', nghia: 'tậu nhà, mua đất' },
  扫舍: { ten: 'Tảo xá', nghia: 'quét dọn nhà cửa' },
  开厕: { ten: 'Khai xí', nghia: 'làm nhà vệ sinh' },
  塞穴: { ten: 'Tắc huyệt', nghia: 'lấp hang hố' },

  // ── đất, nước, đường sá ──
  造桥: { ten: 'Tạo kiều', nghia: 'bắc cầu' },
  筑堤: { ten: 'Trúc đê', nghia: 'đắp đê' },
  开渠: { ten: 'Khai cừ', nghia: 'đào mương' },
  掘井: { ten: 'Quật tỉnh', nghia: 'đào giếng' },
  开池: { ten: 'Khai trì', nghia: 'đào ao' },
  放水: { ten: 'Phóng thủy', nghia: 'tháo nước, dẫn nước' },
  平治道涂: { ten: 'Bình trị đạo đồ', nghia: 'san lấp đường sá' },

  // ── tiền bạc, buôn bán ──
  开市: { ten: 'Khai thị', nghia: 'khai trương, mở hàng' },
  交易: { ten: 'Giao dịch', nghia: 'mua bán' },
  立券: { ten: 'Lập khoán', nghia: 'ký kết văn tự, hợp đồng' },
  纳财: { ten: 'Nạp tài', nghia: 'thu tiền vào' },
  出货财: { ten: 'Xuất hóa tài', nghia: 'xuất hàng, chi tiền ra' },
  造仓: { ten: 'Tạo thương', nghia: 'làm kho' },
  开仓: { ten: 'Khai thương', nghia: 'mở kho' },
  挂匾: { ten: 'Quải biển', nghia: 'treo biển hiệu' },

  // ── đi lại, công danh ──
  出行: { ten: 'Xuất hành', nghia: 'đi xa' },
  乘船: { ten: 'Thừa thuyền', nghia: 'đi thuyền' },
  赴任: { ten: 'Phó nhậm', nghia: 'nhậm chức' },
  入学: { ten: 'Nhập học', nghia: 'đi học, nhập trường' },
  习艺: { ten: 'Tập nghệ', nghia: 'học nghề' },
  词讼: { ten: 'Từ tụng', nghia: 'kiện tụng' },

  // ── sức khỏe ──
  治病: { ten: 'Trị bệnh', nghia: 'chữa bệnh' },
  求医: { ten: 'Cầu y', nghia: 'tìm thầy thuốc' },
  针灸: { ten: 'Châm cứu', nghia: 'châm cứu' },
  探病: { ten: 'Thám bệnh', nghia: 'thăm người ốm' },
  理发: { ten: 'Lý phát', nghia: 'cắt tóc' },
  整手足甲: { ten: 'Chỉnh thủ túc giáp', nghia: 'cắt móng tay chân' },

  // ── đồ dùng, nghề nghiệp ──
  裁衣: { ten: 'Tài y', nghia: 'cắt may quần áo' },
  经络: { ten: 'Kinh lạc', nghia: 'mắc khung cửi, dệt vải' },
  结网: { ten: 'Kết võng', nghia: 'đan lưới' },
  造车器: { ten: 'Tạo xa khí', nghia: 'đóng xe, làm đồ dùng' },
  造船: { ten: 'Tạo thuyền', nghia: 'đóng thuyền' },
  安机械: { ten: 'An cơ giới', nghia: 'lắp đặt máy móc' },
  安碓磑: { ten: 'An đối ngại', nghia: 'kê cối xay, cối giã' },
  架马: { ten: 'Giá mã', nghia: 'dựng giàn giáo' },
  雕刻: { ten: 'Điêu khắc', nghia: 'chạm khắc' },

  // ── đồng áng, chăn nuôi ──
  栽种: { ten: 'Tài chủng', nghia: 'trồng trọt' },
  伐木: { ten: 'Phạt mộc', nghia: 'đốn cây lấy gỗ' },
  牧养: { ten: 'Mục dưỡng', nghia: 'chăn nuôi' },
  纳畜: { ten: 'Nạp súc', nghia: 'mua gia súc về nuôi' },
  造畜稠: { ten: 'Tạo súc trù', nghia: 'làm chuồng trại' },
  教牛马: { ten: 'Giáo ngưu mã', nghia: 'tập trâu ngựa' },
  归岫: { ten: 'Quy tụ', nghia: 'lùa gia súc về chuồng' },
  畋猎: { ten: 'Điền liệp', nghia: 'săn bắn' },
  取渔: { ten: 'Thủ ngư', nghia: 'đánh bắt cá' },
  捕捉: { ten: 'Bổ tróc', nghia: 'bắt sâu bọ, thú hại' },
  断蚁: { ten: 'Đoạn nghĩ', nghia: 'diệt kiến, mối' },
  割蜜: { ten: 'Cát mật', nghia: 'lấy mật ong' },

  // ── tang lễ ──
  入殓: { ten: 'Nhập liệm', nghia: 'khâm liệm' },
  移柩: { ten: 'Di cữu', nghia: 'dời quan tài' },
  启钻: { ten: 'Khải toàn', nghia: 'mở mộ, bốc mộ' },
  安葬: { ten: 'An táng', nghia: 'chôn cất' },
  行丧: { ten: 'Hành tang', nghia: 'đưa tang' },
  除服: { ten: 'Trừ phục', nghia: 'bỏ tang' },
  成服: { ten: 'Thành phục', nghia: 'mặc tang phục' },
  修坟: { ten: 'Tu phần', nghia: 'sửa sang mộ phần' },
  立碑: { ten: 'Lập bi', nghia: 'dựng bia mộ' },
  开生坟: { ten: 'Khai sinh phần', nghia: 'làm sẵn mộ khi còn sống' },
  合寿木: { ten: 'Hợp thọ mộc', nghia: 'đóng sẵn áo quan' },

  // ── câu tổng ──
  馀事勿取: { ten: 'Dư sự vật thủ', nghia: 'ngoài các việc trên thì chớ làm' },
  诸事不宜: { ten: 'Chư sự bất nghi', nghia: 'mọi việc đều không nên' },
};

/**
 * Vài thần sát mà phiên theo chữ ra tên lạ tai với người đọc Việt.
 * `元武` là dạng kiêng húy của `玄武` — sách Việt gọi Huyền Vũ.
 */
const THAN_SAT_RIENG: Record<string, string> = {
  元武: 'Huyền Vũ',
};

export type Muc = 'cat' | 'hung' | 'binh';

/** Đọc một thần sát: tên Hán-Việt + cát/hung do mingyu gắn sẵn. */
export function docThanSat(ten: string, phanLoai?: string): { ten: string; muc: Muc } {
  const viet = THAN_SAT_RIENG[ten] || phienAm(ten);
  const muc: Muc = phanLoai === '吉神' ? 'cat' : phanLoai === '凶神' ? 'hung' : 'binh';
  return { ten: viet, muc };
}

/** Đọc một việc nghi/kỵ. Chưa có trong bảng thì phiên tạm cho khỏi lọt chữ Hán. */
export function docViec(raw: string): { ten: string; nghia: string } {
  return VIEC[raw] || { ten: phienAm(raw), nghia: '' };
}

/** 彭祖百忌 — 10 câu theo can, 12 câu theo chi. */
export const BANH_TO_CAN: Record<string, string> = {
  甲不开仓财物耗散: 'Ngày Giáp chớ mở kho — của cải hao tán',
  乙不栽植千株不长: 'Ngày Ất chớ trồng cây — nghìn gốc không lớn',
  丙不修灶必见灾殃: 'Ngày Bính chớ sửa bếp — ắt gặp tai ương',
  丁不剃头头必生疮: 'Ngày Đinh chớ cạo đầu — đầu ắt sinh nhọt',
  戊不受田田主不祥: 'Ngày Mậu chớ nhận ruộng — chủ ruộng không lành',
  己不破券二比并亡: 'Ngày Kỷ chớ xé văn tự — hai bên cùng thiệt',
  庚不经络织机虚张: 'Ngày Canh chớ mắc khung cửi — khung dệt hỏng việc',
  辛不合酱主人不尝: 'Ngày Tân chớ làm tương — chủ nhà không được nếm',
  壬不汲水更难提防: 'Ngày Nhâm chớ khơi nước — càng khó đề phòng',
  癸不词讼理弱敌强: 'Ngày Quý chớ kiện tụng — lý mình yếu, đối phương mạnh',
};

export const BANH_TO_CHI: Record<string, string> = {
  子不问卜自惹祸殃: 'Ngày Tý chớ xem bói — tự chuốc họa',
  丑不冠带主不还乡: 'Ngày Sửu chớ nhận chức — khó có ngày về quê',
  寅不祭祀神鬼不尝: 'Ngày Dần chớ cúng tế — thần không hưởng lễ',
  卯不穿井水泉不香: 'Ngày Mão chớ đào giếng — mạch nước không ngọt',
  辰不哭泣必主重丧: 'Ngày Thìn chớ khóc than — ắt chủ trùng tang',
  巳不远行财物伏藏: 'Ngày Tỵ chớ đi xa — của cải thất lạc',
  午不苫盖屋主更张: 'Ngày Ngọ chớ lợp mái — chủ nhà phải làm lại',
  未不服药毒气入肠: 'Ngày Mùi chớ uống thuốc — độc khí vào ruột',
  申不安床鬼祟入房: 'Ngày Thân chớ kê giường — ma quỷ vào phòng',
  酉不宴客醉坐颠狂: 'Ngày Dậu chớ đãi khách — say sưa hóa cuồng',
  戌不吃狗作怪上床: 'Ngày Tuất chớ ăn thịt chó — sinh chuyện quái gở',
  亥不嫁娶不利新郎: 'Ngày Hợi chớ cưới hỏi — bất lợi cho chú rể',
};

/** 九星 — cửu tinh trực nhật (Huyền Không), mingyu trả về chữ số Hán. */
export const CUU_TINH: Record<string, { ten: string; hanh: string }> = {
  一: { ten: 'Nhất Bạch Thủy', hanh: 'Thủy' },
  二: { ten: 'Nhị Hắc Thổ', hanh: 'Thổ' },
  三: { ten: 'Tam Bích Mộc', hanh: 'Mộc' },
  四: { ten: 'Tứ Lục Mộc', hanh: 'Mộc' },
  五: { ten: 'Ngũ Hoàng Thổ', hanh: 'Thổ' },
  六: { ten: 'Lục Bạch Kim', hanh: 'Kim' },
  七: { ten: 'Thất Xích Kim', hanh: 'Kim' },
  八: { ten: 'Bát Bạch Thổ', hanh: 'Thổ' },
  九: { ten: 'Cửu Tử Hỏa', hanh: 'Hỏa' },
};

const PHUONG_HAN: Record<string, string> = {
  东: 'Đông', 南: 'Nam', 西: 'Tây', 北: 'Bắc',
  东南: 'Đông Nam', 西南: 'Tây Nam', 东北: 'Đông Bắc', 西北: 'Tây Bắc',
  正东: 'Chính Đông', 正南: 'Chính Nam', 正西: 'Chính Tây', 正北: 'Chính Bắc',
  中: 'Trung cung',
  西南偏南: 'Tây Nam lệch Nam', 西南偏西: 'Tây Nam lệch Tây',
  西北偏西: 'Tây Bắc lệch Tây', 西北偏北: 'Tây Bắc lệch Bắc',
  东北偏北: 'Đông Bắc lệch Bắc', 东北偏东: 'Đông Bắc lệch Đông',
  东南偏东: 'Đông Nam lệch Đông', 东南偏南: 'Đông Nam lệch Nam',
};

export function docPhuong(raw: string): string {
  return PHUONG_HAN[String(raw || '')] || phienAm(String(raw || ''));
}

/** `冲未，煞东` → { tuoiXung: 'Mùi', huongSat: 'Đông' }. */
export function docXungSat(raw: string): { tuoiXung: string; huongSat: string } {
  const s = String(raw || '');
  const xung = /冲(.)/.exec(s);
  const sat = /煞(.)/.exec(s);
  return {
    tuoiXung: xung ? canChiViet(xung[1]!) : '',
    huongSat: sat ? docPhuong(sat[1]!) : '',
  };
}

/** 12 vị thần thái tuế theo năm — hướng nên tránh / nên hướng tới. */
export const THAN_NIEN: Record<string, { ten: string; muc: Muc; nghia: string }> = {
  太岁: { ten: 'Thái Tuế', muc: 'hung', nghia: 'không nên động thổ, hướng xung kỵ' },
  太阳: { ten: 'Thái Dương', muc: 'cat', nghia: 'hướng quý nhân, lợi nam giới' },
  丧门: { ten: 'Tang Môn', muc: 'hung', nghia: 'kỵ việc tang, thăm bệnh' },
  太阴: { ten: 'Thái Âm', muc: 'cat', nghia: 'hướng quý nhân, lợi nữ giới' },
  官符: { ten: 'Quan Phù', muc: 'hung', nghia: 'dễ vướng kiện tụng, giấy tờ' },
  死符: { ten: 'Tử Phù', muc: 'hung', nghia: 'kỵ việc tang ma, bệnh tật' },
  岁破: { ten: 'Tuế Phá', muc: 'hung', nghia: 'xung thẳng Thái Tuế, kỵ mọi việc lớn' },
  龙德: { ten: 'Long Đức', muc: 'cat', nghia: 'hóa giải hung, cứu trợ' },
  白虎: { ten: 'Bạch Hổ', muc: 'hung', nghia: 'sát khí, kỵ động thổ' },
  福德: { ten: 'Phúc Đức', muc: 'cat', nghia: 'hướng phúc lộc' },
  吊客: { ten: 'Điếu Khách', muc: 'hung', nghia: 'kỵ viếng tang, thăm bệnh' },
  病符: { ten: 'Bệnh Phù', muc: 'hung', nghia: 'kỵ việc liên quan sức khỏe' },
};
