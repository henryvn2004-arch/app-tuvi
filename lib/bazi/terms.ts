/**
 * lib/bazi/terms.ts — tầng DỊCH cho phần PHÂN TÍCH bát tự.
 *
 * ⚠️ FILE NÀY KHÔNG DỊCH TỨ TRỤ. Tứ trụ đã do engine của repo tính (và đã đối
 * chiếu 576 lá với mingyu: 0 lệch cả 4 trụ). Đây chỉ là các tầng phân tích mà
 * repo chưa có: thập thần · tàng can thập thần · tự tọa · không vong · vượng
 * suy · cách cục · dụng thần · thần sát.
 */
import { phienAm, canChiViet } from '../hanviet';

export { phienAm, canChiViet };

export type Muc = 'cat' | 'hung' | 'binh';

/** 10 thập thần + nhãn nhật chủ. */
export const THAP_THAN: Record<string, { ten: string; nghia: string }> = {
  日主: { ten: 'Nhật chủ', nghia: 'chính bản thân người xem' },
  比肩: { ten: 'Tỷ Kiên', nghia: 'anh em, bạn ngang vai — cùng chia, cũng cùng tranh' },
  劫财: { ten: 'Kiếp Tài', nghia: 'người cùng tranh phần — dễ hao tài vì người khác' },
  食神: { ten: 'Thực Thần', nghia: 'tài năng phát ra êm, hưởng thụ, con cái' },
  伤官: { ten: 'Thương Quan', nghia: 'tài năng phát ra sắc, thông minh nhưng nghịch quy củ' },
  偏财: { ten: 'Thiên Tài', nghia: 'tiền ngoài lương, cơ hội, cha; đến nhanh đi nhanh' },
  正财: { ten: 'Chính Tài', nghia: 'tiền chính đáng đều đặn, vợ (với nam)' },
  七杀: { ten: 'Thất Sát', nghia: 'áp lực, quyền uy, đối thủ — chế được thì thành quyền' },
  正官: { ten: 'Chính Quan', nghia: 'chức phận, kỷ cương, chồng (với nữ)' },
  偏印: { ten: 'Thiên Ấn', nghia: 'học vấn khác thường, mưu lược; nhiều quá thì cô độc' },
  正印: { ten: 'Chính Ấn', nghia: 'người che chở, học hành, mẹ' },
};

/** 12 vòng trường sinh — trạng thái can trụ ngồi trên chi của chính nó. */
export const TRUONG_SINH: Record<string, { ten: string; nghia: string }> = {
  长生: { ten: 'Trường Sinh', nghia: 'mới sinh, đang lên' },
  沐浴: { ten: 'Mộc Dục', nghia: 'chưa vững, dễ sa ngã' },
  冠带: { ten: 'Quan Đới', nghia: 'trưởng thành, bắt đầu có vị' },
  临官: { ten: 'Lâm Quan', nghia: 'vào việc, sung sức' },
  帝旺: { ten: 'Đế Vượng', nghia: 'cực thịnh' },
  衰: { ten: 'Suy', nghia: 'qua đỉnh, bắt đầu lui' },
  病: { ten: 'Bệnh', nghia: 'suy yếu' },
  死: { ten: 'Tử', nghia: 'hết lực' },
  墓: { ten: 'Mộ', nghia: 'thu tàng, cất giữ' },
  绝: { ten: 'Tuyệt', nghia: 'dứt hẳn, chờ chuyển' },
  胎: { ten: 'Thai', nghia: 'kết tụ lại, chuẩn bị' },
  养: { ten: 'Dưỡng', nghia: 'nuôi dưỡng, sắp ra' },
};

export const VUONG_SUY: Record<string, { ten: string; nghia: string }> = {
  极弱: { ten: 'Cực nhược', nghia: 'nhật chủ rất yếu — cần được sinh phù, kỵ khắc tiết' },
  身弱: { ten: 'Thân nhược', nghia: 'nhật chủ yếu — nên được ấn sinh, tỷ kiếp giúp' },
  偏弱: { ten: 'Hơi nhược', nghia: 'nhật chủ hơi yếu' },
  中和: { ten: 'Trung hòa', nghia: 'nhật chủ cân bằng — dễ dùng, ít cực đoan' },
  偏强: { ten: 'Hơi cường', nghia: 'nhật chủ hơi mạnh' },
  身强: { ten: 'Thân cường', nghia: 'nhật chủ mạnh — nên được khắc tiết, kỵ sinh phù thêm' },
};

export const VUONG_TUONG: Record<string, string> = {
  旺: 'vượng', 相: 'tướng', 休: 'hưu', 囚: 'tù', 死: 'tử',
};

export const HANH: Record<string, string> = {
  木: 'Mộc', 火: 'Hỏa', 土: 'Thổ', 金: 'Kim', 水: 'Thủy',
};

export const AM_DUONG: Record<string, string> = { 阳: 'Dương', 阴: 'Âm' };

/**
 * 30 THẦN SÁT ĐƯỢC ĐỌC THẬT.
 *
 * 🔴 VÌ SAO PHẢI CHỌN LỌC: mingyu trả TRUNG BÌNH 58 thần sát mỗi lá (đo trên
 * lưới thật: min 40 · max 76). Đổ hết ra màn hình thì đúng bệnh đã gặp ở Kỳ Môn
 * — gắn cờ cho mọi thứ thì không cái nào còn nghĩa, và người đọc không biết
 * nhìn vào đâu. Sách bát tự Việt thực tế chỉ đọc chừng 10–20 sao.
 *
 * ⚠️ ĐÂY LÀ XẾP THỨ TỰ TRÌNH BÀY, KHÔNG PHẢI LỌC BỎ DỮ LIỆU. Số còn lại vẫn
 * trả về nguyên vẹn ở nhóm phụ, chỉ là không đứng ở hàng đầu.
 */
export const THAN_SAT_CHINH: Record<string, { ten: string; muc: Muc; nghia: string }> = {
  天乙贵人: { ten: 'Thiên Ất Quý Nhân', muc: 'cat', nghia: 'sao quý nhân bậc nhất — gặp nạn có người đỡ' },
  太极贵人: { ten: 'Thái Cực Quý Nhân', muc: 'cat', nghia: 'ham học đạo lý, huyền học, nghiên cứu' },
  天德贵人: { ten: 'Thiên Đức Quý Nhân', muc: 'cat', nghia: 'phúc trời che chở, hóa hung thành cát' },
  月德贵人: { ten: 'Nguyệt Đức Quý Nhân', muc: 'cat', nghia: 'đức tháng, tính hiền, được người thương' },
  天德合: { ten: 'Thiên Đức Hợp', muc: 'cat', nghia: 'thêm một tầng che chở' },
  月德合: { ten: 'Nguyệt Đức Hợp', muc: 'cat', nghia: 'thêm một tầng phúc đức' },
  文昌贵人: { ten: 'Văn Xương Quý Nhân', muc: 'cat', nghia: 'văn chương, thi cử, học hành sáng sủa' },
  国印贵人: { ten: 'Quốc Ấn Quý Nhân', muc: 'cat', nghia: 'có quyền, giữ ấn tín, được giao trọng trách' },
  天官贵人: { ten: 'Thiên Quan Quý Nhân', muc: 'cat', nghia: 'lợi đường công danh, chức phận' },
  福星贵人: { ten: 'Phúc Tinh Quý Nhân', muc: 'cat', nghia: 'phúc khí, đời bớt vất vả' },
  德秀贵人: { ten: 'Đức Tú Quý Nhân', muc: 'cat', nghia: 'đức hạnh và tài hoa cùng có' },
  天厨贵人: { ten: 'Thiên Trù Quý Nhân', muc: 'cat', nghia: 'ăn lộc, không lo miếng ăn' },
  学堂: { ten: 'Học Đường', muc: 'cat', nghia: 'sáng dạ, hợp đường học vấn' },
  词馆: { ten: 'Từ Quán', muc: 'cat', nghia: 'giỏi văn từ, viết lách' },
  禄神: { ten: 'Lộc Thần', muc: 'cat', nghia: 'lộc của nhật chủ — có phần hưởng, tự lập' },
  金舆: { ten: 'Kim Dư', muc: 'cat', nghia: 'xe vàng — hôn nhân tốt, được nâng đỡ' },
  将星: { ten: 'Tướng Tinh', muc: 'cat', nghia: 'có uy, đứng đầu nhóm' },
  华盖: { ten: 'Hoa Cái', muc: 'binh', nghia: 'tài hoa nhưng cô độc, hợp tôn giáo nghệ thuật' },
  天医: { ten: 'Thiên Y', muc: 'cat', nghia: 'hợp nghề y, chăm sóc, cứu chữa' },
  天赦日: { ten: 'Thiên Xá Nhật', muc: 'cat', nghia: 'ngày trời tha — hung sự dễ được giảm' },
  驿马: { ten: 'Dịch Mã', muc: 'binh', nghia: 'chạy nhảy đi lại, đổi chỗ, xa quê' },
  桃花: { ten: 'Đào Hoa', muc: 'binh', nghia: 'duyên dáng, hút người khác phái — quá thì rối' },
  红艳煞: { ten: 'Hồng Diễm Sát', muc: 'binh', nghia: 'đa tình, dễ vướng chuyện tình cảm' },
  羊刃: { ten: 'Dương Nhận', muc: 'hung', nghia: 'sắc bén, cương mãnh — dễ thương tổn, hợp nghề dùng dao' },
  魁罡: { ten: 'Khôi Cang', muc: 'binh', nghia: 'cá tính mạnh, quyết đoán, cực đoan' },
  孤辰: { ten: 'Cô Thần', muc: 'hung', nghia: 'lẻ loi, xa người thân (nặng với nam)' },
  寡宿: { ten: 'Quả Tú', muc: 'hung', nghia: 'lẻ loi, muộn duyên (nặng với nữ)' },
  劫煞: { ten: 'Kiếp Sát', muc: 'hung', nghia: 'mất mát bất ngờ, bị đoạt' },
  亡神: { ten: 'Vong Thần', muc: 'hung', nghia: 'hao hụt ngầm, mất mà không biết vì đâu' },
  元辰: { ten: 'Nguyên Thần', muc: 'hung', nghia: 'trắc trở, việc hay lệch ý' },
  空亡: { ten: 'Không Vong', muc: 'hung', nghia: 'trống rỗng — việc ở trụ đó dễ hụt' },
  十恶大败: { ten: 'Thập Ác Đại Bại', muc: 'hung', nghia: 'ngày xấu nặng trong cổ pháp, kỵ khởi sự lớn' },
  阴差阳错: { ten: 'Âm Sai Dương Thác', muc: 'hung', nghia: 'lệch nhịp, hôn nhân và họ hàng dễ trục trặc' },
  孤鸾煞: { ten: 'Cô Loan Sát', muc: 'hung', nghia: 'khắc chế đường phối ngẫu' },
  流霞: { ten: 'Lưu Hà', muc: 'hung', nghia: 'huyết quang, cẩn thận thương tích, sinh nở' },
  血刃: { ten: 'Huyết Nhận', muc: 'hung', nghia: 'liên quan máu me, dao kéo' },
  童子煞: { ten: 'Đồng Tử Sát', muc: 'hung', nghia: 'khó nuôi thời nhỏ, hay đau vặt' },
};

/** Cách cục: `杂气正官格` = tạp khí + thập thần + cách. */
export function docCachCuc(raw: string): string {
  const s = String(raw || '');
  if (!s || s === '未知') return '';
  const rieng: Record<string, string> = {
    建禄格: 'Kiến Lộc cách', 月刃格: 'Nguyệt Nhận cách', 从势格: 'Tòng Thế cách',
  };
  if (rieng[s]) return rieng[s];
  const m = /^(杂气)?(.+?)格$/.exec(s);
  if (m) {
    const tt = THAP_THAN[m[2]!];
    const ten = tt ? tt.ten : phienAm(m[2]!);
    return (m[1] ? 'Tạp khí ' : '') + ten + ' cách';
  }
  return phienAm(s);
}

export function docThapThan(raw: string): { ten: string; nghia: string } {
  return THAP_THAN[raw] || { ten: phienAm(raw), nghia: '' };
}

export function docTruongSinh(raw: string): { ten: string; nghia: string } {
  return TRUONG_SINH[raw] || { ten: phienAm(raw), nghia: '' };
}

/** Thần sát: sao chính có nghĩa; sao còn lại chỉ phiên tên. */
export function docThanSat(raw: string): { ten: string; muc: Muc; nghia: string; chinh: boolean } {
  const c = THAN_SAT_CHINH[raw];
  if (c) return { ...c, chinh: true };
  return { ten: phienAm(raw), muc: 'binh', nghia: '', chinh: false };
}
