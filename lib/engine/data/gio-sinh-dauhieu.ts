// lib/engine/data/gio-sinh-dauhieu.ts
// ============================================================
// BẢNG DẤU HIỆU KHẢO SÁT cho tool "Xác Định Giờ Sinh".
//
// 🔑 Vì sao bảng này tồn tại: câu hỏi khảo sát phải là thứ người ta TỰ KIỂM
// CHỨNG ĐƯỢC ("hồi nhỏ có hay mụn nhọt không"), không phải thuật ngữ tử vi
// ("Phá Quân thủ Tật Ách"). Mỗi dòng dưới đây dịch một chính tinh sang một
// dấu hiệu quan sát được, và NÊU NGUỒN.
//
// 🔴 CHẶN NỘI DUNG NẶNG Ở ĐÂY, KHÔNG Ở PROMPT. Nguyên văn Tân Biên cung Tật Ách
// có "tự tử", "chết một cách thê thảm", "chết đuối", "mù lòa", "bệnh hủi",
// "ho lao"... Những câu đó (a) không khảo sát được — người đã chết không trả
// lời khảo sát, và (b) bắn một câu như thế vào mặt người dùng đang đi tra giờ
// sinh là việc tệ nhất tool này làm được. Nên tầng dữ liệu CHỈ giữ dấu hiệu
// LÀNH TÍNH, KIỂM CHỨNG ĐƯỢC. Người sau sửa bảng này: đừng chép thêm vế nặng
// vào cho "đầy đủ" — chúng bị bỏ CÓ CHỦ Ý.
//
// Nguồn: Tử Vi Đẩu Số Tân Biên, chương 11 (CUNG TẬT ÁCH), mục 11.1.1 và
// 11.2.1–11.2.12 — đọc từ bảng `tuvi_docs` trên Supabase, không phải trí nhớ.
// ============================================================

export interface DauHieuTat {
  /** Câu hỏi hiện cho người dùng — phải TỰ KIỂM CHỨNG ĐƯỢC. */
  dau: string;
  /** Trích dẫn nguồn, hiện ở khối "cơ sở" để người đọc soát được. */
  nguon: string;
}

/**
 * Cung TẬT ÁCH theo chính tinh thủ cung.
 *
 * Đây là cung Henry chốt là đáng tin nhất, và phép đo đồng ý — nhưng KHÔNG
 * phải vì nó tách lá số mạnh hơn (mọi cung đều tách được ~2,9/12 nhóm, đo trên
 * 9.600 lá số). Nó mạnh vì ĐỘ TIN CẬY CÂU TRẢ LỜI: người ta nhớ chính xác mình
 * có sẹo ở tay hay không, còn "tôi có quyết đoán không" thì mỗi hôm trả lời
 * một kiểu.
 */
export const TAT_ACH_DAU_HIEU: Record<string, DauHieuTat> = {
  'Tử Vi': {
    dau: 'Ít khi ốm nặng; mỗi lần đau yếu thì thường gặp đúng thầy đúng thuốc rồi qua nhanh',
    nguon: 'Tân Biên 11.1.1 — "cứu giải khá nhiều bệnh tật, tai ương"',
  },
  'Thiên Phủ': {
    dau: 'Nền sức khoẻ vững, ít bệnh vặt kéo dài',
    nguon: 'Tân Biên 11.1.1 — Thiên Phủ thuộc nhóm cứu giải bệnh tật',
  },
  'Thiên Cơ': {
    dau: 'Hay bị ngoài da hoặc tê thấp, mỏi khớp; chân tay yếu gân',
    nguon: 'Tân Biên 11.2.5 — "bệnh ngoài da hay bệnh tê thấp… chân tay yếu gân"',
  },
  'Thái Dương': {
    dau: 'Hay nhức đầu, căng mạch máu; mắt dễ mỏi hoặc kém sớm',
    nguon: 'Tân Biên 11.2.4 — "căng mạch máu, hay nhức đầu… đau mắt, mắt rất kém"',
  },
  'Vũ Khúc': {
    dau: 'Da hay có vấn đề; chân tay có tỳ vết hoặc nhiều nốt ruồi',
    nguon: 'Tân Biên 11.2.3 — "bệnh ngoài da, chân tay có tỳ vết… nhiều nốt ruồi"',
  },
  'Thiên Đồng': {
    dau: 'Bụng dạ yếu — hay đau bụng, tiêu hoá thất thường',
    nguon: 'Tân Biên 11.2.2 — "đau bụng, bộ máy tiêu hóa không được lành mạnh"',
  },
  'Liêm Trinh': {
    dau: 'Có tỳ vết (sẹo, bớt) ở chân tay hoặc ở lưng',
    nguon: 'Tân Biên 11.2.1 — "có tỳ vết ở chân tay hay ở lưng"',
  },
  'Thái Âm': {
    dau: 'Hay đau bụng; ngực/phổi yếu khi trở trời; mắt dễ kém',
    nguon: 'Tân Biên 11.2.6 — "đau bụng… đau phổi… mắt kém"',
  },
  'Tham Lang': {
    dau: 'Chân hay có vấn đề (đau, chấn thương); dễ sinh bệnh vì ăn uống',
    nguon: 'Tân Biên 11.2.7 — "bệnh ở chân… vì ăn uống mà sinh bệnh"',
  },
  'Cự Môn': {
    dau: 'Hồi nhỏ nhiều mụn nhọt; mặt thường có vết',
    nguon: 'Tân Biên 11.2.8 — "mặt thường có vết, lúc ít tuổi có nhiều mụn nhọt"',
  },
  'Thiên Tướng': {
    dau: 'Vấn đề tập trung ở vùng đầu – mặt; da mặt hay xỉn vàng',
    nguon: 'Tân Biên 11.2.9 — "bệnh ở đầu hay mặt… da mặt vàng"',
  },
  'Thiên Lương': {
    dau: 'Hay nóng lạnh thất thường nhưng không thành bệnh nặng',
    nguon: 'Tân Biên 11.2.10 — "mắc bệnh hàn nhiệt, nhưng không đáng lo ngại"',
  },
  'Thất Sát': {
    dau: 'Hồi nhỏ sức khoẻ kém hẳn; mặt có vết; tiêu hoá không tốt',
    nguon: 'Tân Biên 11.2.11 — "mặt có vết, lúc ít tuổi sức khỏe rất kém… bộ máy tiêu hóa bị hư hại"',
  },
  'Phá Quân': {
    dau: 'Máu nóng — hồi nhỏ nhiều mụn nhọt, chốc lở',
    nguon: 'Tân Biên 11.2.12 — "máu nóng, nên lúc ít tuổi có nhiều mụn nhọt, chóc lở"',
  },
};

/** Cung Tật Ách VÔ CHÍNH DIỆU — không có chính tinh nào thủ. */
export const TAT_ACH_VCD: DauHieuTat = {
  dau: 'Không có bệnh nào thành "nét" riêng — ốm vặt tản mát, không theo một kiểu nào rõ',
  nguon: 'Cung vô chính diệu: không chính tinh thủ cung nên không có dấu hiệu chủ đạo',
};

/**
 * Nhãn NGẮN cho từng chính tinh ở các cung còn lại — dùng dựng đáp án trắc
 * nghiệm. CỐ Ý ngắn và mô tả HÀNH VI QUAN SÁT ĐƯỢC, không phải tính từ chung
 * chung ("tốt", "xấu") vì tính từ chung thì đáp án nào người ta cũng thấy đúng.
 *
 * Nguồn nền: cùng `MENH_ROLE` trong `lib/engine/past-life.ts` (đã trích Vương
 * Đình Chi / Tân Biên) — ở đây rút gọn về một vế quan sát được cho mỗi cung.
 * KHÔNG chép `MENH_ROLE` sang đây: cung Mệnh vẫn đọc thẳng bảng gốc.
 */
export const CUNG_NET: Record<string, Record<string, string>> = {
  'Phúc Đức': {
    'Tử Vi': 'sống thảnh thơi, có phúc, ít phải lo chuyện cơm áo',
    'Thiên Phủ': 'trong lòng thường yên, của cải để dành được',
    'Thiên Cơ': 'nghĩ nhiều, hay trăn trở, khó buông',
    'Thái Dương': 'thích bận rộn, ngồi yên là bứt rứt',
    'Vũ Khúc': 'sống thực tế, ít mơ mộng, quy ra tiền bạc việc gì cũng được',
    'Thiên Đồng': 'dễ bằng lòng, hưởng thụ được cái nhỏ',
    'Liêm Trinh': 'nguyên tắc, khó thoả hiệp nên hay tự làm khổ mình',
    'Thái Âm': 'kín đáo, đời sống bên trong phong phú hơn bên ngoài',
    'Tham Lang': 'ham vui, nhiều sở thích, thích cái mới',
    'Cự Môn': 'hay nghi, khó yên tâm hoàn toàn về việc gì',
    'Thiên Tướng': 'cần người bên cạnh mới thấy yên',
    'Thiên Lương': 'điềm đạm, người khác hay tìm đến để nhờ cậy',
    'Thất Sát': 'không chịu ngồi yên, tự đẩy mình vào việc khó',
    'Phá Quân': 'sống khác số đông, hay tự phá đi làm lại',
  },
  'Quan Lộc': {
    'Tử Vi': 'sớm ở vị trí có người dưới quyền',
    'Thiên Phủ': 'làm chỗ ổn định, có tích luỹ, ít nhảy việc',
    'Thiên Cơ': 'làm phần nghĩ – kế hoạch – tham mưu hơn là cầm quyền',
    'Thái Dương': 'việc phải lộ mặt, tiếp xúc rộng',
    'Vũ Khúc': 'làm việc dính tiền bạc, con số, tài chính',
    'Thiên Đồng': 'không tranh giành, hợp chỗ nhẹ nhàng đều đặn',
    'Liêm Trinh': 'làm bằng nguyên tắc, hay va chạm chuyện đúng sai',
    'Thái Âm': 'làm phần hậu trường, chăm chút chi tiết',
    'Tham Lang': 'giỏi giao tiếp, việc dính quan hệ – xã giao',
    'Cự Môn': 'sống bằng lời nói: dạy, nói, tranh luận, thuyết phục',
    'Thiên Tướng': 'làm phó, làm trợ thủ thì mạnh hơn đứng mũi',
    'Thiên Lương': 'việc dính chăm sóc, cố vấn, giám sát',
    'Thất Sát': 'tự gánh một mảng, không chịu làm kẻ dưới trướng',
    'Phá Quân': 'sống bằng tay nghề, không đi đường chung',
  },
  'Tài Bạch': {
    'Tử Vi': 'tiền đến từ vị thế, chức phận',
    'Thiên Phủ': 'giữ được tiền, có của để dành',
    'Thiên Cơ': 'tiền lên xuống theo tính toán, không đều',
    'Thái Dương': 'kiếm được nhưng tiêu cũng rộng',
    'Vũ Khúc': 'rất rõ ràng về tiền, tính toán chặt',
    'Thiên Đồng': 'đủ tiêu, không dư nhiều, ít chật vật',
    'Liêm Trinh': 'tiền bạc sòng phẳng, không nhập nhèm',
    'Thái Âm': 'tích cóp dần, tiền nằm ở nhà cửa – của chìm',
    'Tham Lang': 'tiền vào ra nhanh, dính giao tế',
    'Cự Môn': 'kiếm tiền bằng miệng lưỡi, hay có tranh chấp tiền nong',
    'Thiên Tướng': 'tiền qua tay người khác, hay đứng tên hộ – lo hộ',
    'Thiên Lương': 'có người giúp lúc túng, không đến nỗi bí',
    'Thất Sát': 'tiền đến từng đợt lớn, không đều tay',
    'Phá Quân': 'kiếm được rồi lại phá đi làm cái khác',
  },
  'Huynh Đệ': {
    'Tử Vi': 'có anh/chị/em (hoặc bạn thân) ở thế trên mình',
    'Thiên Phủ': 'anh em hoà thuận, đỡ đần được nhau',
    'Thiên Cơ': 'anh em mỗi người một nơi, ít gần gũi',
    'Thái Dương': 'có anh/em trai nổi bật hơn cả',
    'Vũ Khúc': 'anh em sòng phẳng, ít tình cảm uỷ mị',
    'Thiên Đồng': 'anh em thân thiện, dựa nhau được',
    'Liêm Trinh': 'anh em hay va chạm chuyện đúng sai',
    'Thái Âm': 'có chị/em gái là chỗ dựa',
    'Tham Lang': 'bạn bè đông hơn anh em ruột',
    'Cự Môn': 'anh em hay lời qua tiếng lại',
    'Thiên Tướng': 'anh em giúp được việc thật',
    'Thiên Lương': 'có người anh/chị đứng ra lo cho cả nhà',
    'Thất Sát': 'anh em ít, hoặc mỗi người tự lo phận mình',
    'Phá Quân': 'anh em ly tán, hoặc quan hệ đứt nối',
  },
  'Phụ Mẫu': {
    'Tử Vi': 'cha mẹ có vị thế, mình được nể theo',
    'Thiên Phủ': 'cha mẹ lo được cho mình đầy đủ',
    'Thiên Cơ': 'cha mẹ hay thay đổi, gia cảnh không cố định',
    'Thái Dương': 'cha (hoặc người đàn ông trong nhà) ảnh hưởng lớn',
    'Vũ Khúc': 'cha mẹ nghiêm, ít nói tình cảm',
    'Thiên Đồng': 'cha mẹ hiền, không ép mình',
    'Liêm Trinh': 'cha mẹ khắt khe về nguyên tắc',
    'Thái Âm': 'mẹ (hoặc người phụ nữ trong nhà) ảnh hưởng lớn',
    'Tham Lang': 'cha mẹ giao thiệp rộng, nhà hay có khách',
    'Cự Môn': 'trong nhà hay có lời ra tiếng vào',
    'Thiên Tướng': 'cha mẹ chu đáo, lo từng việc nhỏ',
    'Thiên Lương': 'được cha mẹ hoặc người trên che chở lâu',
    'Thất Sát': 'sớm phải tự lập, xa cha mẹ',
    'Phá Quân': 'quan hệ với cha mẹ có đoạn đứt gãy rõ',
  },
};

/** Nhãn cực ngắn khi một cung có 2 chính tinh — ghép hai vế bằng " · ". */
export function netCua(cung: string, sao: string[]): string {
  const bang = CUNG_NET[cung];
  if (!bang) return '';
  const v = sao.map((s) => bang[s]).filter(Boolean);
  return v.join(' · ');
}
