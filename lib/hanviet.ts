/**
 * lib/hanviet.ts — bảng phiên HÁN-VIỆT DÙNG CHUNG cho các tool cổ pháp.
 *
 * VÌ SAO NẰM RIÊNG: Kỳ Môn (#408) dựng bảng này từ chữ trong TÊN CÁCH CỤC, rồi
 * Hoàng Lịch cần thêm 105 chữ nữa cho tên thần sát. Chép bảng thứ hai là hai
 * bản sẽ trôi khỏi nhau — nên gom về một chỗ, mỗi tool chỉ bổ sung phần riêng.
 *
 * 🔑 KHI NÀO PHIÊN HÁN-VIỆT, KHI NÀO DỊCH NGHĨA — hai loại thuật ngữ khác nhau:
 *  · Thuật ngữ CẤU TRÚC (cửa, sao, cung, can chi, tiết khí, việc nên/kỵ) thì
 *    DỊCH KÈM NGHĨA — người đọc phải hành động theo chúng.
 *  · TÊN RIÊNG cổ pháp (cách cục Kỳ Môn, thần sát Hoàng Lịch) thì PHIÊN theo
 *    chữ — sách Việt vốn gọi đúng tên đó. Bịa nghĩa cho một tên cổ pháp còn tệ
 *    hơn để nguyên.
 *
 * ⚠️ BÀI HỌC ĐÃ TRẢ GIÁ (#408): bảng dựng từ MỘT nguồn thì chỉ phủ nguồn đó —
 * bản đầu thiếu hẳn địa chi và tiết khí nên giao diện ra `"Bính 午"`. Mỗi lần
 * cắm bảng này vào một nguồn chữ Hán MỚI thì phải chạy lại bộ dò rò rỉ chữ Hán
 * trên toàn payload, đừng tin là đủ.
 *
 * Chữ không có trong bảng thì GIỮ NGUYÊN — thà lộ ra một chữ Hán để lần sau bổ
 * sung, còn hơn nuốt mất rồi tên cụt đi mà không ai biết.
 */

export const CAN_HAN: Record<string, string> = {
  甲: 'Giáp', 乙: 'Ất', 丙: 'Bính', 丁: 'Đinh', 戊: 'Mậu',
  己: 'Kỷ', 庚: 'Canh', 辛: 'Tân', 壬: 'Nhâm', 癸: 'Quý',
};

export const CHI_HAN: Record<string, string> = {
  子: 'Tý', 丑: 'Sửu', 寅: 'Dần', 卯: 'Mão', 辰: 'Thìn', 巳: 'Tỵ',
  午: 'Ngọ', 未: 'Mùi', 申: 'Thân', 酉: 'Dậu', 戌: 'Tuất', 亥: 'Hợi',
};

/** Bảng phiên theo TỪNG CHỮ. Gộp phần Kỳ Môn (#408) + phần Hoàng Lịch. */
export const HAN_VIET: Record<string, string> = {
  // ─── phần dựng cho Kỳ Môn Độn Giáp (tên cách cục) ───────────
  星: 'Tinh', 奇: 'Kỳ', 受: 'Thụ', 制: 'Chế', 时: 'Thời', 干: 'Can', 勃: 'Bột',
  格: 'Cách', 己: 'Kỷ', 击: 'Kích', 刑: 'Hình', 月: 'Nguyệt', 日: 'Nhật',
  伏: 'Phục', 太: 'Thái', 白: 'Bạch', 狱: 'Ngục', 入: 'Nhập', 自: 'Tự',
  门: 'Môn', 迫: 'Bách', 地: 'Địa', 网: 'Võng', 四: 'Tứ', 张: 'Trương',
  天: 'Thiên', 墓: 'Mộ', 乙: 'Ất', 岁: 'Tuế', 辛: 'Tân', 蛇: 'Xà', 螣: 'Đằng',
  飞: 'Phi', 空: 'Không', 龙: 'Long', 遁: 'Độn', 生: 'Sinh', 宫: 'Cung',
  朱: 'Chu', 雀: 'Tước', 江: 'Giang', 庚: 'Canh', 荧: 'Huỳnh', 骑: 'Kỵ',
  青: 'Thanh', 罗: 'La', 壬: 'Nhâm', 丙: 'Bính', 牢: 'Lao', 小: 'Tiểu',
  亭: 'Đình', 阴: 'Âm', 中: 'Trung', 返: 'Phản', 阳: 'Dương', 虎: 'Hổ',
  伤: 'Thương', 魂: 'Hồn', 神: 'Thần', 丁: 'Đinh', 夭: 'Yểu', 矫: 'Kiểu',
  冶: 'Dã', 炉: 'Lô', 猖: 'Xương', 狂: 'Cuồng', 戊: 'Mậu', 符: 'Phù',
  逃: 'Đào', 走: 'Tẩu', 孛: 'Bột', 乱: 'Loạn', 来: 'Lai', 临: 'Lâm',
  高: 'Cao', 投: 'Đầu', 合: 'Hợp', 惑: 'Hoặc', 癸: 'Quý', 织: 'Chức',
  女: 'Nữ', 寻: 'Tầm', 牛: 'Ngưu', 万: 'Vạn', 事: 'Sự', 皆: 'Giai',
  屯: 'Truân', 华: 'Hoa', 盖: 'Cái', 师: 'Sư', 玄: 'Huyền', 武: 'Vũ',
  不: 'Bất', 明: 'Minh', 困: 'Khốn', 遭: 'Tao', 复: 'Phục', 见: 'Kiến',
  大: 'Đại', 人: 'Nhân', 真: 'Chân', 诈: 'Trá', 为: 'Vi', 遮: 'Già',
  蔽: 'Tế', 使: 'Sứ', 同: 'Đồng', 出: 'Xuất', 户: 'Hộ', 逢: 'Phùng',
  鬼: 'Quỷ', 凶: 'Hung', 火: 'Hỏa', 三: 'Tam', 游: 'Du', 六: 'Lục',
  仪: 'Nghi', 相: 'Tương', 佐: 'Tá', 首: 'Thủ', 雾: 'Vụ', 重: 'Trùng',
  升: 'Thăng', 殿: 'Điện', 之: 'Chi', 勾: 'Câu', 化: 'Hóa', 直: 'Trực',
  得: 'Đắc', 休: 'Hưu', 木: 'Mộc', 宝: 'Bảo', 鉴: 'Giám', 鸟: 'Điểu',
  跌: 'Điệt', 穴: 'Huyệt', 灵: 'Linh', 云: 'Vân', 守: 'Thủ', 玉: 'Ngọc',
  耀: 'Diệu', 光: 'Quang', 精: 'Tinh', 佑: 'Hựu', 浮: 'Phù',
  甲: 'Giáp', 开: 'Khai', 景: 'Cảnh', 死: 'Tử', 惊: 'Kinh', 杜: 'Đỗ',
  水: 'Thủy', 金: 'Kim', 土: 'Thổ', 值: 'Trực', 九: 'Cửu', 五: 'Ngũ',

  // ─── 105 chữ bổ sung cho tên THẦN SÁT của Hoàng Lịch ─────────
  富: 'Phú', 续: 'Tục', 世: 'Thế', 解: 'Giải', 司: 'Tư', 命: 'Mệnh',
  鸣: 'Minh', 吠: 'Phệ', 破: 'Phá', 耗: 'Hao', 灾: 'Tai', 煞: 'Sát',
  厌: 'Yếm', 对: 'Đối', 招: 'Chiêu', 摇: 'Dao', 虚: 'Hư', 血: 'Huyết',
  忌: 'Kỵ', 要: 'Yếu', 安: 'An', 害: 'Hại', 陈: 'Trần', 德: 'Đức',
  母: 'Mẫu', 仓: 'Thương', 喜: 'Hỷ', 医: 'Y', 宇: 'Vũ', 除: 'Trừ',
  坎: 'Khảm', 焦: 'Tiêu', 离: 'Ly', 堂: 'Đường', 河: 'Hà', 魁: 'Khôi',
  败: 'Bại', 咸: 'Hàm', 池: 'Trì', 圣: 'Thánh', 心: 'Tâm', 罡: 'Cang',
  八: 'Bát', 风: 'Phong', 王: 'Vương', 驿: 'Dịch', 马: 'Mã', 后: 'Hậu',
  气: 'Khí', 益: 'Ích', 官: 'Quan', 将: 'Tướng', 吏: 'Lại', 致: 'Trí',
  支: 'Chi', 归: 'Quy', 触: 'Xúc', 建: 'Kiến', 府: 'Phủ', 往: 'Vãng',
  亡: 'Vong', 吉: 'Cát', 期: 'Kỳ', 匮: 'Quỹ', 劫: 'Kiếp', 贼: 'Tặc',
  恩: 'Ân', 民: 'Dân', 巫: 'Vu', 福: 'Phúc', 敬: 'Kính', 祸: 'Họa',
  逐: 'Trục', 阵: 'Trận', 普: 'Phổ', 护: 'Hộ', 元: 'Nguyên', 专: 'Chuyên',
  废: 'Phế', 错: 'Thác', 囊: 'Nang', 愿: 'Nguyện', 穷: 'Cùng', 赦: 'Xá',
  会: 'Hội', 孤: 'Cô', 辰: 'Thần', 单: 'Đơn', 七: 'Thất', 行: 'Hành',
  狠: 'Ngoan', 俱: 'Câu', 冲: 'Xung', 狗: 'Cẩu', 道: 'Đạo', 位: 'Vị',
  薄: 'Bạc', 绝: 'Tuyệt', 纯: 'Thuần', 丧: 'Tang', 哭: 'Khốc', 退: 'Thoái',
  了: 'Liễu', 戾: 'Lệ', 交: 'Giao',

  // ─── 97 chữ bổ sung cho tên THẦN SÁT của Bát Tự ─────────────
  贵: 'Quý', 禄: 'Lộc', 庭: 'Đình', 厄: 'Ách', 剑: 'Kiếm', 锋: 'Phong', 尸: 'Thi', 祖: 'Tổ',
  雷: 'Lôi', 霆: 'Đình', 极: 'Cực', 文: 'Văn', 昌: 'Xương', 国: 'Quốc', 印: 'Ấn', 学: 'Học',
  馆: 'Quán', 秀: 'Tú', 舆: 'Dư', 童: 'Đồng', 宅: 'Trạch', 吟: 'Ngâm', 呻: 'Thân', 杀: 'Sát',
  斧: 'Phủ', 劈: 'Phách', 鸱: 'Si', 枭: 'Kiêu', 隔: 'Cách', 角: 'Giác', 红: 'Hồng', 鸾: 'Loan',
  绞: 'Giảo', 无: 'Vô', 成: 'Thành', 旌: 'Tinh', 贯: 'Quán', 索: 'Sách', 厨: 'Trù', 截: 'Tiệt',
  路: 'Lộ', 桃: 'Đào', 花: 'Hoa', 疾: 'Tật', 良: 'Lương', 扶: 'Phù', 缢: 'Ải', 披: 'Phi', 麻: 'Ma',
  卷: 'Quyển', 舌: 'Thiệt', 词: 'Từ', 流: 'Lưu', 霞: 'Hà', 刃: 'Nhận', 十: 'Thập', 暴: 'Bạo',
  食: 'Thực', 带: 'Đới', 转: 'Chuyển', 公: 'Công', 栏: 'Lan', 杆: 'Can', 外: 'Ngoại', 头: 'Đầu',
  财: 'Tài', 羊: 'Dương', 艳: 'Diễm', 廉: 'Liêm', 瞽: 'Cổ', 寡: 'Quả', 宿: 'Tú', 吊: 'Điếu',
  客: 'Khách', 名: 'Danh', 恶: 'Ác', 科: 'Khoa', 戴: 'Đới', 目: 'Mục', 军: 'Quân', 碎: 'Toái',
  攀: 'Phàn', 鞍: 'Yên', 丘: 'Khâu', 乡: 'Hương', 库: 'Khố', 藏: 'Tàng', 差: 'Sai', 推: 'Thôi',
  病: 'Bệnh', 折: 'Chiết', 足: 'Túc', 形: 'Hình', 钺: 'Việt', 点: 'Điểm', 戮: 'Lục', 衣: 'Y',
};

/** Phiên một chuỗi Hán sang Hán-Việt, cách nhau bằng dấu cách. */
export function phienAm(han: string): string {
  return Array.from(String(han || ''))
    .map((c) => HAN_VIET[c] || c)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Đổi một cặp can chi Hán ("丙午") sang tiếng Việt ("Bính Ngọ").
 *
 * 🐞 Có hàm RIÊNG chứ không dùng `phienAm` vì địa chi KHÔNG nằm trong bảng chữ
 * dựng từ tên cách cục — bản đầu của Kỳ Môn trả ra "Bính 午", chữ Hán lọt
 * thẳng ra giao diện.
 */
export function canChiViet(han: string): string {
  return Array.from(String(han || ''))
    .map((c) => CAN_HAN[c] || CHI_HAN[c] || HAN_VIET[c] || c)
    .join(' ')
    .trim();
}
