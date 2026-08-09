// lib/engine/nghe-nghiep.ts
// ============================================================
// TẦNG NHÁNH NGHỀ — lớp thứ tư của Tử Vi Công Sở.
//
// Công Sở đã có ba tầng và chúng vẫn giữ nguyên:
//   1. LĨNH VỰC  ← cung Quan Lộc  (`resolveCareerBase` → domain)
//   2. QUY MÔ    ← bậc chức phận  (`tier`)
//   3. VAI       ← kiểu tứ tượng  (`phanKieu` → 4 giá trị)
// Tầng này thêm cái thứ tư: NHÁNH CỤ THỂ trong lĩnh vực — "trong bất động sản
// thì hợp phát triển dự án hay hợp môi giới", thứ ba tầng trên không cắt được
// vì VAI chỉ có ĐÚNG BỐN giá trị cho toàn bộ người dùng.
//
// THUẦN deterministic: 0 lượt LLM, 0đ. Tra bảng + một phép cosine.
//
// ── VÌ SAO KHỚP TRONG LĨNH VỰC CHỨ KHÔNG KHỚP TOÀN BỘ ───────
// Đo trên 891 nghề: nếu khớp thẳng toàn bộ danh mục thì **76% danh mục không
// bao giờ được gợi**, và top gợi ý rơi vào mấy nghề có hình PHẲNG (khớp được
// với bất kỳ ai) — lau rửa xe, phụ hồ, thợ là quần áo. Nguyên nhân đo được:
// tính khí phân biệt rất tốt nhóm "làm với NGƯỜI" (bán hàng 0,81 · cộng đồng
// 0,80) nhưng gần như KHÔNG phân biệt nhóm kỹ thuật/sản xuất (y tế chuyên môn
// 0,27 · nông lâm 0,28 · xây dựng 0,32) — vì mấy nghề đó không đòi một chất
// người đặc thù nào.
//
// 🔑 Kết luận: KHÔNG dùng tính khí để chọn NHÓM. Dùng nó để chọn NHÁNH trong
// nhóm. Sau khi đã chốt lĩnh vực, dư địa phân biệt còn lại vẫn là 68–90%
// (quyen 90% · vo 87% · thuong 84% · van 81% · nghe 73% · tu 71% · y 68%).
//
// ── HAI LUẬT CỨNG, RÚT RA TỪ ĐO, ĐỪNG "TỐI ƯU" NGƯỢC LẠI ────
// 1. **KHÔNG z-score vector người.** Đã thử: đa dạng tăng (122→169 nhánh) mà
//    chất lượng sụp — bậc hiển đạt ra "trợ giảng", Thiên Phủ ra "người mẫu".
//    Vì z-score triệt tiêu ĐỘ LỚN, mà độ lớn chính là thứ mang tín hiệu BẬC.
// 2. **KHÔNG gom thêm cung vào vector.** Đã thử 7 cung: đa dạng GIẢM
//    (122→92 nhánh, trùng 1/115→1/90). Cộng nhiều nguồn thì vector tiến về
//    trung bình — càng trơn càng giống nhau.
//
// ── ⚠️ NGUỒN CỦA BẢNG, NÓI CHO RÕ ĐỂ KHỎI MƯỢN UY TÍN NHẦM ──
// • `SAO_TRUC` (14 chính tinh → 21 trục) là bảng QUY CHIẾU TỰ ĐẶT, cùng dạng
//   nợ với `KIEU_HOC` của Dạy Con và `DOMAIN_NGANH` của Công Sở. Cổ thư tả
//   tính chất sao bằng văn xuôi, không bằng thang điểm — việc quy nó thành 21
//   con số là lựa chọn của trang. Sửa là sửa data thuần, không đụng logic.
// • `hinh` của mỗi nhánh lấy khởi điểm từ hình trung bình của cụm nghề tương
//   ứng trong một cơ sở dữ liệu nghề nghiệp công khai (giấy phép CC BY 4.0 —
//   ghi công đặt ở trang nguồn dữ liệu, KHÔNG nhắc trong bản đọc người dùng).
//   Dữ liệu đó chỉ dùng để CHẤM; danh mục việc bày ra là bảng Việt tự dựng.
// ============================================================

import type { Laso } from './laso';

/** 21 trục tính khí nghề. Thứ tự CỐ ĐỊNH — mọi vector đọc theo thứ tự này. */
export const TRUC_IDS = [
  'chiTienThu', 'uyenChuyen', 'tiMi', 'thanTrong', 'hopTac', 'dangTinCay', 'thauCam',
  'khiemNhuong', 'chuDong', 'sangTao', 'chinhTruc', 'hamTimHieu', 'camTrich', 'lacQuan',
  'benBi', 'tuTin', 'tuChu', 'chanThanh', 'huongNguoi', 'chiuApLuc', 'chiuMoHo',
] as const;
export type TrucId = (typeof TRUC_IDS)[number];

/**
 * Nhãn và câu đọc của từng trục.
 *
 * 🔴 LUẬT DIỄN ĐẠT — VI PHẠM LÀ XÚC PHẠM NGƯỜI DÙNG:
 * trục THẤP chỉ được đọc là "nghề KHÔNG ĐÒI HỎI", tuyệt đối không đọc là
 * "bạn THIẾU". Dữ liệu chấm hoạ sĩ ở trục `dangTinCay` là −3,6 và thợ máy ở
 * `chinhTruc` là −1,7; in thẳng ra thì tool đang nói với người ta "bạn ít
 * đáng tin cậy", "bạn ít chính trực". Nghĩa thật là hoạ sĩ không bị chấm theo
 * giờ giấc đều đặn, thợ máy không phải ra phán đoán đạo đức. Loại lỗi này
 * không test nào bắt được — chỉ lộ khi đọc câu chữ thật.
 */
export const TRUC: Record<TrucId, { ten: string; cao: string; thap: string }> = {
  chiTienThu: { ten: 'Chí tiến thủ', cao: 'tự đặt mức cao rồi tự đi tới', thap: 'không bị đo bằng nấc thang thăng tiến' },
  uyenChuyen: { ten: 'Uyển chuyển', cao: 'đổi cách làm khi tình thế đổi', thap: 'cách làm ổn định, ít phải xoay' },
  tiMi: { ten: 'Tỉ mỉ', cao: 'sai một li là hỏng, phải soi kỹ', thap: 'không đòi độ chính xác từng chi tiết' },
  thanTrong: { ten: 'Thận trọng', cao: 'cân nhắc kỹ trước khi quyết', thap: 'được phép thử và sai, không phải giữ mình từng bước' },
  hopTac: { ten: 'Hợp tác', cao: 'kết quả đến từ chỗ ăn ý với người khác', thap: 'làm phần của mình là chính, ít phải phối hợp' },
  dangTinCay: { ten: 'Đáng tin cậy', cao: 'đúng hẹn, đúng quy trình, không ai phải nhắc', thap: 'không bị chấm theo giờ giấc hay quy trình cố định' },
  thauCam: { ten: 'Thấu cảm', cao: 'phải đọc được người đối diện đang thế nào', thap: 'ít phải đặt mình vào chỗ người khác' },
  khiemNhuong: { ten: 'Khiêm nhường', cao: 'lùi lại để việc chạy, không tranh phần', thap: 'được phép nhận công khai phần của mình' },
  chuDong: { ten: 'Chủ động', cao: 'tự tìm việc mà làm, không đợi giao', thap: 'phần việc đến theo luồng có sẵn' },
  sangTao: { ten: 'Sáng tạo', cao: 'phải nghĩ ra cách chưa ai làm', thap: 'có cách làm chuẩn, theo là được' },
  chinhTruc: { ten: 'Chính trực', cao: 'phải giữ chuẩn mực cả khi không ai nhìn', thap: 'ít phải ra phán đoán đúng–sai về đạo đức' },
  hamTimHieu: { ten: 'Ham tìm hiểu', cao: 'phải đào tới tận gốc mới yên', thap: 'không đòi phải liên tục học cái mới' },
  camTrich: { ten: 'Cầm trịch', cao: 'phải đứng ra chịu trách nhiệm cho cả nhóm', thap: 'không phải gánh phần quyết của người khác' },
  lacQuan: { ten: 'Lạc quan', cao: 'giữ được khí thế khi mọi thứ chưa sáng', thap: 'không đòi phải truyền năng lượng cho ai' },
  benBi: { ten: 'Bền bỉ', cao: 'việc kéo dài, phải theo tới cùng', thap: 'việc gọn từng lượt, xong là xong' },
  tuTin: { ten: 'Tự tin', cao: 'phải đứng ra nói và bảo vệ ý mình', thap: 'không đòi phải thuyết phục ai' },
  tuChu: { ten: 'Tự chủ', cao: 'giữ được bình tĩnh lúc căng', thap: 'ít gặp tình huống làm mất bình tĩnh' },
  chanThanh: { ten: 'Chân thành', cao: 'người ta tin mình vì thấy thật', thap: 'không đòi phải xây quan hệ tin cậy lâu dài' },
  huongNguoi: { ten: 'Hướng người', cao: 'cả ngày làm việc với người', thap: 'làm việc với vật và số nhiều hơn với người' },
  chiuApLuc: { ten: 'Chịu áp lực', cao: 'phải tỉnh táo khi bị dồn', thap: 'nhịp việc đều, ít bị dồn' },
  chiuMoHo: { ten: 'Chịu mơ hồ', cao: 'phải quyết khi thông tin chưa đủ', thap: 'đề bài rõ ràng, biết trước phải làm gì' },
};

type Vec = number[];
const V = (o: Partial<Record<TrucId, number>>): Vec => TRUC_IDS.map((t) => o[t] ?? 0);

/**
 * 14 chính tinh → 21 trục. ⚠️ BẢNG QUY CHIẾU TỰ ĐẶT (xem chú thích đầu file).
 * Giá trị dương = sao đẩy trục đó lên; âm = sao kéo xuống. Biên độ ±2.
 */
const SAO_TRUC: Record<string, Vec> = {
  'Tử Vi': V({ camTrich: 2, tuTin: 2, chiTienThu: 1.5, chinhTruc: 1, dangTinCay: 1, huongNguoi: 0.5, khiemNhuong: -1.5 }),
  'Thiên Cơ': V({ hamTimHieu: 2, uyenChuyen: 2, sangTao: 1.5, chiuMoHo: 1.5, tiMi: 1, thanTrong: 0.5, benBi: -1.5 }),
  'Thái Dương': V({ huongNguoi: 2, chinhTruc: 1.5, lacQuan: 1.5, camTrich: 1, chuDong: 1, thauCam: 1, khiemNhuong: -0.5 }),
  'Vũ Khúc': V({ chiTienThu: 2, tuChu: 1.5, benBi: 1.5, tiMi: 1, chuDong: 1, thauCam: -1.5, huongNguoi: -1 }),
  'Thiên Đồng': V({ hopTac: 2, thauCam: 1.5, lacQuan: 1.5, khiemNhuong: 1, chiTienThu: -1.5, camTrich: -1.5, chuDong: -1 }),
  'Liêm Trinh': V({ tuChu: 1.5, chinhTruc: 1.5, sangTao: 1, chiuApLuc: 1, hopTac: -1.5, khiemNhuong: -1 }),
  'Thiên Phủ': V({ thanTrong: 2, dangTinCay: 2, tiMi: 1.5, camTrich: 1, sangTao: -1.5, chiuMoHo: -1.5 }),
  'Thái Âm': V({ tiMi: 2, thauCam: 1.5, chanThanh: 1.5, sangTao: 1, khiemNhuong: 1, tuTin: -1.5, chuDong: -1 }),
  'Tham Lang': V({ uyenChuyen: 2, huongNguoi: 2, sangTao: 1.5, chuDong: 1.5, thanTrong: -1.5, chinhTruc: -1 }),
  'Cự Môn': V({ hamTimHieu: 2, tiMi: 1.5, thanTrong: 1.5, hopTac: -2, chanThanh: -0.5, tuChu: -0.5 }),
  'Thiên Tướng': V({ dangTinCay: 2, hopTac: 2, chinhTruc: 1.5, tiMi: 1, camTrich: -1.5, chuDong: -1 }),
  'Thiên Lương': V({ chinhTruc: 2, thauCam: 1.5, benBi: 1.5, tuChu: 1, chuDong: -1.5, khiemNhuong: -0.5 }),
  'Thất Sát': V({ chuDong: 2, chiuApLuc: 2, tuTin: 1.5, camTrich: 1, hopTac: -1.5, thanTrong: -2 }),
  'Phá Quân': V({ sangTao: 2, chiuMoHo: 2, chuDong: 1.5, thanTrong: -2, tiMi: -1.5, dangTinCay: -1 }),
};

/** Tứ hoá — sắc thái chồng lên sao, không thay sao. */
const HOA_TRUC: Record<string, Vec> = {
  'Quyền': V({ camTrich: 1, tuTin: 1, chuDong: 0.5, khiemNhuong: -0.5 }),
  'Khoa': V({ hamTimHieu: 1, tiMi: 1, chinhTruc: 0.5, dangTinCay: 0.5 }),
  'Lộc': V({ lacQuan: 1, huongNguoi: 1, uyenChuyen: 0.5 }),
  'Kỵ': V({ thanTrong: 1, tiMi: 0.5, uyenChuyen: -1, lacQuan: -1 }),
};

/** Lục sát — đẩy sức chịu đựng lên, kéo sự êm ả xuống. */
const SAT_TINH = ['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp'];
const SAT_TRUC = V({ chiuApLuc: 0.6, chiuMoHo: 0.6, tuChu: -0.5, hopTac: -0.4, thanTrong: -0.3 });

/** Độ sáng nhân vào sức của sao — sao hãm thì tính chất mờ đi, không đảo dấu. */
const HE_SANG: Record<string, number> = { 'Miếu': 1.3, 'Vượng': 1.15, 'Đắc': 1, 'Bình': 0.85, 'Hãm': 0.6 };

/**
 * Ba cung, và CHỈ ba cung. Xem luật 2 ở đầu file — thêm cung là làm phẳng
 * vector, đo ra tệ hơn chứ không tốt hơn.
 *   Mệnh      — chất người gốc
 *   Quan Lộc  — cách người đó hành sự trong công việc
 *   Phúc Đức  — thứ khiến họ thấy việc đáng làm hay không
 */
const TRONG_SO_CUNG: Record<string, number> = { 'Mệnh': 1.0, 'Quan Lộc': 0.5, 'Phúc Đức': 0.35 };

type Rec = Record<string, unknown>;
interface StarLike { ten?: string; hoa?: string; brightness?: string }

/** Vector 21 trục của một lá số. Giữ nguyên ĐỘ LỚN — xem luật 1 ở đầu file. */
export function vectorNguoi(ls: Laso): Vec {
  const v = new Array(TRUC_IDS.length).fill(0);
  const palaces = ((ls as Rec).palaces as Rec[]) || [];
  for (const [ten, w] of Object.entries(TRONG_SO_CUNG)) {
    const p = palaces.find((x) => x.cungName === ten);
    if (!p) continue;
    for (const s of ((p.stars as StarLike[]) || [])) {
      const name = s?.ten;
      if (!name) continue;
      const base = SAO_TRUC[name];
      if (base) {
        const k = w * (HE_SANG[s.brightness || ''] ?? 1);
        for (let i = 0; i < v.length; i++) v[i] += base[i] * k;
      }
      if (s.hoa && HOA_TRUC[s.hoa]) {
        const h = HOA_TRUC[s.hoa];
        for (let i = 0; i < v.length; i++) v[i] += h[i] * w;
      }
      if (SAT_TINH.includes(name)) {
        for (let i = 0; i < v.length; i++) v[i] += SAT_TRUC[i] * w;
      }
    }
  }
  return v;
}

export type DomainId = 'vo' | 'van' | 'quyen' | 'thuong' | 'y' | 'nghe' | 'tu';

export interface NhanhDef {
  id: string;
  /** Tên nhánh, tiếng Việt. */
  ten: string;
  /** Một câu tả CHẤT VIỆC — cái nhánh này thật sự là gì. */
  chat: string;
  /** Việc cụ thể ở Việt Nam. Đây là danh mục BÀY RA, tự dựng cho VN. */
  viec: string[];
  /** Bậc chức phận hợp nhất với nhánh (khớp `tier` của resolveCareerBase). */
  bac: ('thap' | 'giua' | 'kha' | 'cao')[];
  /** Hình 21 trục. Khởi điểm từ hình trung bình cụm nghề (xem đầu file). */
  hinh: Partial<Record<TrucId, number>>;
  /**
   * Nhánh PHỔ THÔNG — không có chất người đặc thù, ai cũng làm được.
   * KHÔNG bao giờ gợi ý bằng phép khớp tính khí: nói "lá số bạn hợp nghề này"
   * trong khi lá số không nói gì về nó là một kết luận rỗng đội lốt kết luận.
   * Chỉ dùng làm đường lùi khi không nhánh nào khớp đủ mạnh, và khi đó phải
   * diễn đạt khác hẳn.
   */
  phoThong?: true;
}

export const NHANH: Record<DomainId, NhanhDef[]> = {
  vo: [
    {
      id: 'chi-huy', ten: 'Chỉ huy hiện trường',
      chat: 'Cầm một đội đang làm việc thật, ở nơi sai một nhịp là hỏng cả dây chuyền.',
      viec: ['Chỉ huy công trường, giám sát thi công', 'Trưởng ca nhà máy, quản đốc', 'Điều độ kho vận, trưởng bộ phận logistics', 'Giám sát an ninh toà nhà, khu công nghiệp', 'Chỉ huy đội kỹ thuật vận hành'],
      bac: ['giua', 'kha'],
      hinh: { chiuApLuc: 1.5, tuChu: 1.4, camTrich: 1.3, dangTinCay: 1.1, thanTrong: 1.0, chinhTruc: 0.9, tuTin: 0.9, benBi: 0.8, uyenChuyen: 0.5, sangTao: -0.8, hamTimHieu: -0.5 },
    },
    {
      id: 'ung-cuu', ten: 'Ứng cứu · trực chiến',
      chat: 'Việc chỉ tới lúc có chuyện, và lúc đó phải quyết ngay không đợi ai duyệt.',
      viec: ['Cảnh sát, cứu hoả, cứu hộ', 'Cấp cứu ngoại viện, vận chuyển bệnh nhân', 'Ứng phó sự cố kỹ thuật, trực hệ thống 24/7', 'An ninh sự kiện, bảo vệ yếu nhân', 'Cứu hộ bờ biển, cứu nạn'],
      bac: ['giua', 'kha'],
      hinh: { chiuApLuc: 2.1, tuChu: 1.8, camTrich: 1.5, dangTinCay: 1.4, uyenChuyen: 1.4, tuTin: 1.4, benBi: 1.3, hopTac: 1.2, chuDong: 1.1, chinhTruc: 1.0, chanThanh: 1.0, thauCam: 0.9, lacQuan: 0.8, huongNguoi: 0.8 },
    },
    {
      id: 'dieu-tra', ten: 'Điều tra · thanh tra',
      chat: 'Gỡ một việc mà người trong cuộc không muốn mình gỡ ra — cần lì và cần sạch.',
      viec: ['Điều tra nội bộ, kiểm soát tuân thủ', 'Thanh tra an toàn, phòng cháy, môi trường', 'Điều tra gian lận bảo hiểm, tín dụng', 'Phân tích rủi ro, tình báo doanh nghiệp', 'Giám định, thẩm định độc lập'],
      bac: ['kha', 'cao'],
      hinh: { chinhTruc: 1.7, chiuApLuc: 1.3, tuChu: 1.2, benBi: 1.2, thanTrong: 1.0, dangTinCay: 1.0, chuDong: 0.9, tuTin: 0.9, tiMi: 0.9, uyenChuyen: 0.8, chiuMoHo: 0.7, chiTienThu: 0.7, hamTimHieu: 0.7, lacQuan: -0.7, hopTac: -0.6 },
    },
    {
      id: 'van-hanh', ten: 'Vận hành · thi công', phoThong: true,
      chat: 'Việc có quy trình rõ, làm đúng là được — không đòi một chất người đặc thù nào.',
      viec: ['Thi công, lắp đặt, hoàn thiện công trình', 'Lái xe, vận chuyển, giao nhận', 'Vận hành máy móc, thiết bị nặng'],
      bac: ['thap', 'giua'],
      hinh: { hamTimHieu: -1.2, chuDong: -1.2, chiuMoHo: -1.1, sangTao: -1.0, chiTienThu: -1.0, uyenChuyen: -1.0 },
    },
  ],
  van: [
    {
      id: 'nghien-cuu', ten: 'Nghiên cứu · phân tích',
      chat: 'Đề bài chưa có lời giải sẵn, và phần lớn thời gian là chưa biết mình đúng hay sai.',
      viec: ['Nghiên cứu thị trường, phân tích dữ liệu', 'R&D sản phẩm, nghiên cứu ứng dụng', 'Tư vấn chiến lược, phân tích chính sách', 'Quy hoạch, phân tích môi trường', 'Chuyên gia nội dung chuyên ngành'],
      bac: ['kha', 'cao'],
      hinh: { sangTao: 1.4, hamTimHieu: 1.4, chiuMoHo: 1.1, chiTienThu: 0.9, chuDong: 0.8, uyenChuyen: 0.7, tiMi: 0.5, camTrich: 0.5, tuChu: -0.6, dangTinCay: -0.6 },
    },
    {
      id: 'sang-tac', ten: 'Sáng tác · biểu diễn',
      chat: 'Cái bán được là giọng riêng của mình. Không có ai chấm mình bằng giờ giấc.',
      viec: ['Viết văn, viết kịch bản, sáng tác nhạc', 'Ca sĩ, nhạc công, diễn viên', 'Thiết kế thời trang, tạo mẫu', 'Biên đạo, đạo diễn sân khấu', 'Sáng tạo nội dung, KOL chuyên đề'],
      bac: ['giua', 'kha', 'cao'],
      hinh: { sangTao: 1.6, tuTin: 1.5, lacQuan: 1.3, uyenChuyen: 1.3, chiuMoHo: 1.0, huongNguoi: 1.0, benBi: 0.9, chuDong: 0.9, chiTienThu: 0.9, thanTrong: -3.0, dangTinCay: -2.6, khiemNhuong: -2.0, chinhTruc: -1.9, tiMi: -1.8 },
    },
    {
      id: 'day-hoc', ten: 'Dạy học · huấn luyện',
      chat: 'Việc thành hay không nằm ở chỗ người đối diện có hiểu ra không, không ở chỗ mình nói hay.',
      viec: ['Giáo viên phổ thông, mầm non', 'Đào tạo doanh nghiệp, huấn luyện kỹ năng', 'Gia sư, luyện thi, trung tâm ngoại ngữ', 'Hướng dẫn nghề, đào tạo nội bộ', 'Huấn luyện viên thể thao phong trào'],
      bac: ['giua', 'kha'],
      hinh: { lacQuan: 1.9, thauCam: 1.8, chanThanh: 1.8, khiemNhuong: 1.6, hopTac: 1.4, huongNguoi: 1.3, tuChu: 1.2, uyenChuyen: 1.0, chiuMoHo: 0.9, chiuApLuc: 0.9, benBi: 0.8, tiMi: -0.7 },
    },
    {
      id: 'thiet-ke', ten: 'Thiết kế · minh hoạ',
      chat: 'Kết quả nhìn thấy được ngay, và gu của mình chính là sản phẩm.',
      viec: ['Thiết kế đồ hoạ, nhận diện thương hiệu', 'Minh hoạ, truyện tranh, concept art', 'Dựng phim, hoạt hình, kỹ xảo', 'Thiết kế UI, sản phẩm số', 'Nhiếp ảnh thương mại'],
      bac: ['giua', 'kha'],
      hinh: { sangTao: 1.9, chiuMoHo: 1.0, chuDong: 0.8, chiTienThu: 0.5, dangTinCay: -3.6, thanTrong: -2.4, chinhTruc: -1.5, tuChu: -1.5, chiuApLuc: -1.4, khiemNhuong: -1.1 },
    },
    {
      id: 'truyen-thong', ten: 'Truyền thông · đối ngoại',
      chat: 'Phải đứng ra nói thay cho một tổ chức, và chịu phần rủi ro của lời mình nói.',
      viec: ['Truyền thông thương hiệu, quan hệ báo chí', 'Giám đốc sáng tạo, quản lý nội dung', 'Tổ chức sự kiện, quản lý nghệ sĩ', 'Đối ngoại doanh nghiệp, quan hệ cộng đồng', 'Quản lý kênh mạng xã hội'],
      bac: ['kha', 'cao'],
      hinh: { tuTin: 1.6, camTrich: 1.3, chuDong: 1.3, huongNguoi: 1.2, sangTao: 1.2, uyenChuyen: 1.2, lacQuan: 1.1, chiuMoHo: 1.0, chiTienThu: 0.8, chiuApLuc: 0.8, thanTrong: -2.4, khiemNhuong: -1.3, tiMi: -1.2 },
    },
    {
      id: 'hoc-thuat', ten: 'Giảng dạy chuyên sâu · học thuật',
      chat: 'Vừa phải biết sâu, vừa phải đứng lớp — hai việc khác nhau mà phải làm cùng lúc.',
      viec: ['Giảng viên đại học, cao đẳng', 'Nghiên cứu viên viện, trung tâm', 'Viết giáo trình, phản biện chuyên môn', 'Diễn giả chuyên đề, đào tạo cấp cao', 'Chuyên gia tư vấn ngành'],
      bac: ['cao'],
      hinh: { hamTimHieu: 1.4, sangTao: 1.2, huongNguoi: 1.1, chiTienThu: 0.9, chuDong: 0.9, chiuMoHo: 0.9, thauCam: 0.9, camTrich: 0.8, hopTac: 0.7, chanThanh: 0.7, khiemNhuong: 0.7, thanTrong: -1.3, tiMi: -0.9 },
    },
    {
      id: 'ky-thuat-pt', ten: 'Kỹ thuật viên chuyên môn',
      chat: 'Làm phần đo đạc, kiểm nghiệm, xử lý mẫu — việc cần chuẩn hơn cần nhanh.',
      viec: ['Kỹ thuật viên phòng thí nghiệm', 'Quan trắc môi trường, kiểm định', 'Kỹ thuật viên khảo sát, đo đạc', 'Kiểm nghiệm thực phẩm, dược phẩm', 'Xử lý và số hoá dữ liệu chuyên ngành'],
      bac: ['giua', 'kha'],
      hinh: { tiMi: 0.4, hamTimHieu: 0.4, thauCam: -0.6, chiuApLuc: -0.6, tuChu: -0.6, lacQuan: -0.5, huongNguoi: -0.5, tuTin: -0.5, camTrich: -0.4 },
    },
  ],
  quyen: [
    {
      // ⚠️ CỐ Ý GỘP "điều hành cấp cao" và "quản lý vận hành" làm MỘT.
      // Hai thứ đó khác nhau ở QUY MÔ chứ không ở CHẤT — mà quy mô đã là tầng
      // 2 (`tier`). Tách ở tầng nhánh là lặp lại một tầng đã có, và đo ra đúng
      // hậu quả: hai nhánh xếp cạnh nhau với LÝ DO GIỐNG HỆT, người đọc không
      // hiểu vì sao cái này trên cái kia.
      // 🔑 Luật: NHÁNH phải khác nhau về CHẤT, không về QUY MÔ.
      id: 'cam-trich', ten: 'Cầm trịch tổ chức',
      chat: 'Sắp đúng người vào đúng chỗ để bộ máy chạy — kết quả không đến từ chỗ tự tay làm, và phần quyết cuối vẫn là của mình.',
      viec: ['Quản lý sản xuất, quản lý chất lượng', 'Quản lý chuỗi cung ứng, kho vận', 'Quản lý dự án, quản lý sản phẩm', 'Trưởng phòng, giám đốc khối', 'Điều hành chuỗi, quản lý vùng', 'Sáng lập và điều hành doanh nghiệp'],
      bac: ['giua', 'kha', 'cao'],
      hinh: { camTrich: 1.8, chuDong: 1.3, tuTin: 1.3, chinhTruc: 1.1, chiTienThu: 1.0, dangTinCay: 1.0, chiuApLuc: 0.9, tuChu: 0.9, uyenChuyen: 0.9, benBi: 0.8, chiuMoHo: 0.8, huongNguoi: 0.7, hopTac: 0.5, thanTrong: 0.3 },
    },
    {
      id: 'dich-vu', ten: 'Quản lý dịch vụ · trải nghiệm',
      chat: 'Sản phẩm là cảm giác của khách khi rời đi, nên phải quản cả không khí chứ không chỉ quy trình.',
      viec: ['Quản lý nhà hàng, khách sạn, resort', 'Quản lý spa, phòng tập, trung tâm chăm sóc', 'Quản lý khu vui chơi, giải trí', 'Quản lý trải nghiệm khách hàng', 'Điều hành tour, dịch vụ du lịch'],
      bac: ['kha', 'cao'],
      hinh: { camTrich: 1.8, lacQuan: 1.5, huongNguoi: 1.4, chuDong: 1.4, chiTienThu: 1.2, tuTin: 1.2, uyenChuyen: 1.1, hopTac: 1.0, thauCam: 0.9, sangTao: 0.9, chiuMoHo: 0.9, thanTrong: -1.2, tiMi: -1.1 },
    },
    {
      id: 'hanh-chinh', ten: 'Hành chính · nghiệp vụ', phoThong: true,
      chat: 'Việc có quy trình rõ, làm đúng là được — không đòi một chất người đặc thù nào.',
      viec: ['Hành chính, thư ký, trợ lý văn phòng', 'Nghiệp vụ chứng từ, nhập liệu', 'Điều phối đơn hàng, kế hoạch sản xuất'],
      bac: ['thap', 'giua'],
      hinh: { benBi: -1.2, hamTimHieu: -1.0, sangTao: -1.0, chiTienThu: -1.0, tuTin: -0.9, chiuMoHo: -0.9, camTrich: -0.9 },
    },
  ],
  thuong: [
    {
      id: 'mo-thi-truong', ten: 'Mở thị trường · môi giới',
      chat: 'Không ai giao khách cho mình. Thu nhập đi theo số vụ chốt được, và phải chịu được chuỗi ngày trắng tay.',
      viec: ['Môi giới bất động sản, môi giới thuê', 'Kinh doanh dự án, phát triển khách hàng lớn', 'Đại diện thương mại, mở đại lý vùng', 'Bán hàng kỹ thuật, giải pháp doanh nghiệp', 'Đại diện nghệ sĩ, môi giới hợp tác'],
      bac: ['giua', 'kha', 'cao'],
      hinh: { benBi: 1.5, huongNguoi: 1.4, tuTin: 1.4, chuDong: 1.3, lacQuan: 1.3, chiTienThu: 1.2, chiuMoHo: 0.8, uyenChuyen: 0.8, camTrich: 0.8, thanTrong: -1.9, khiemNhuong: -1.7, tiMi: -1.1, dangTinCay: -0.9 },
    },
    {
      id: 'dau-tu', ten: 'Phân tích · đầu tư',
      chat: 'Quyết bằng con số và chịu trách nhiệm với con số đó, kể cả khi thị trường nói ngược.',
      viec: ['Phân tích đầu tư, quản lý danh mục', 'Phát triển dự án bất động sản', 'Thẩm định dự án, M&A', 'Điều tra gian lận, quản trị rủi ro', 'Hoạch định tài chính doanh nghiệp'],
      bac: ['kha', 'cao'],
      hinh: { chinhTruc: 1.2, chuDong: 1.1, chiTienThu: 1.0, chiuMoHo: 1.0, tuTin: 1.0, benBi: 0.9, hamTimHieu: 0.9, camTrich: 0.9, tiMi: 0.8, chiuApLuc: 0.7, dangTinCay: 0.6, thanTrong: 0.6 },
    },
    {
      id: 'kiem-soat', ten: 'Kiểm soát tài chính',
      chat: 'Việc của mình là phát hiện chỗ sai trước khi nó thành thiệt hại — nên phải chấp nhận bị coi là khó tính.',
      viec: ['Kế toán tổng hợp, kế toán trưởng', 'Kiểm toán nội bộ, kiểm toán độc lập', 'Kiểm soát ngân sách, phân tích chi phí', 'Thẩm định tín dụng, phân tích rủi ro nợ', 'Dự toán, bóc tách khối lượng'],
      bac: ['kha', 'cao'],
      hinh: { tiMi: 1.0, chinhTruc: 1.0, thanTrong: 0.7, tuTin: 0.4, hamTimHieu: 0.4, lacQuan: -0.9, thauCam: -0.6, hopTac: -0.5, uyenChuyen: -0.4, sangTao: -0.4 },
    },
    {
      id: 'quan-ly-ban', ten: 'Quản lý bán hàng · chăm khách',
      chat: 'Giữ khách cũ quan trọng hơn săn khách mới, nên việc đo bằng quan hệ dài chứ không bằng cú chốt.',
      viec: ['Quản lý cửa hàng, quản lý vùng bán lẻ', 'Chăm sóc khách hàng doanh nghiệp', 'Quản lý kênh phân phối, đại lý', 'Tư vấn du lịch, dịch vụ trọn gói', 'Tuyển dụng, tư vấn nhân sự'],
      bac: ['giua', 'kha'],
      hinh: { huongNguoi: 1.2, camTrich: 1.0, chuDong: 0.8, lacQuan: 0.8, tuTin: 0.7, thauCam: 0.7, hopTac: 0.7, chanThanh: 0.6, khiemNhuong: 0.5, thanTrong: -0.7 },
    },
    {
      id: 'ban-le', ten: 'Bán lẻ tại quầy', phoThong: true,
      chat: 'Việc có quy trình rõ, làm đúng là được — không đòi một chất người đặc thù nào.',
      viec: ['Thu ngân, nhân viên quầy', 'Bán hàng tại cửa hàng, siêu thị', 'Tư vấn viên qua điện thoại'],
      bac: ['thap'],
      hinh: { huongNguoi: 1.0, lacQuan: 0.8, thanTrong: -1.7, benBi: -1.4, hamTimHieu: -1.4, dangTinCay: -1.4, chuDong: -1.4 },
    },
  ],
  y: [
    {
      id: 'tham-van', ten: 'Tham vấn · đồng hành',
      chat: 'Người ta tìm tới lúc yếu nhất. Thứ bán được là sự tin cậy, không phải kỹ thuật.',
      viec: ['Tham vấn tâm lý, trị liệu', 'Tư vấn hướng nghiệp, học đường', 'Công tác xã hội, hỗ trợ cộng đồng', 'Chăm sóc người cao tuổi, phục hồi chức năng', 'Tư vấn dinh dưỡng, đồng hành sức khoẻ'],
      bac: ['kha', 'cao'],
      hinh: { thauCam: 2.2, chanThanh: 2.1, lacQuan: 1.9, khiemNhuong: 1.8, hopTac: 1.6, huongNguoi: 1.4, tuChu: 1.1, uyenChuyen: 0.9, chiuApLuc: 0.9, chiuMoHo: 0.8, tiMi: -0.6 },
    },
    {
      id: 'lam-sang', ten: 'Lâm sàng áp lực cao',
      chat: 'Quyết trong vài phút, hậu quả là một mạng người, và không có đường lùi lại để nghĩ thêm.',
      viec: ['Bác sĩ cấp cứu, hồi sức', 'Bác sĩ sản, nhi, nội tổng quát', 'Điều dưỡng chăm sóc tích cực', 'Bác sĩ gây mê, phẫu thuật', 'Y tế can thiệp, vận chuyển cấp cứu'],
      bac: ['cao'],
      hinh: { chiuApLuc: 1.9, tuChu: 1.7, thauCam: 1.6, chanThanh: 1.5, dangTinCay: 1.5, benBi: 1.4, hopTac: 1.3, uyenChuyen: 1.3, tiMi: 1.2, tuTin: 1.2, chinhTruc: 1.1, hamTimHieu: 1.1, chiuMoHo: 1.0, thanTrong: 1.0, camTrich: 1.0 },
    },
    {
      id: 'chuyen-khoa', ten: 'Chuyên khoa · tay nghề tinh',
      chat: 'Một việc hẹp làm cho tới mức không ai thay được — danh tiếng đi theo tay nghề chứ không theo chức.',
      viec: ['Bác sĩ da liễu, mắt, răng hàm mặt', 'Nha khoa thẩm mỹ, chỉnh nha', 'Y học cổ truyền, châm cứu, xoa bóp', 'Vật lý trị liệu chuyên sâu', 'Thẩm mỹ y khoa, chăm sóc da'],
      bac: ['kha', 'cao'],
      hinh: { chanThanh: 1.2, thauCam: 1.1, tiMi: 1.0, hamTimHieu: 1.0, khiemNhuong: 0.9, hopTac: 0.9, chiTienThu: 0.9, thanTrong: 0.8, tuChu: 0.8, chinhTruc: 0.7, huongNguoi: 0.6, sangTao: 0.6 },
    },
    {
      id: 'ky-thuat', ten: 'Kỹ thuật y học',
      chat: 'Không gặp bệnh nhân nhiều, nhưng kết quả mình đưa ra quyết định cách người ta được chữa.',
      viec: ['Xét nghiệm, giải phẫu bệnh', 'Chẩn đoán hình ảnh, siêu âm, CT/MRI', 'Kỹ thuật viên tim mạch, thăm dò chức năng', 'Dược sĩ bệnh viện, kiểm nghiệm dược', 'Quản lý hồ sơ và dữ liệu y tế'],
      bac: ['giua', 'kha'],
      hinh: { tiMi: 1.2, thanTrong: 0.9, dangTinCay: 0.8, hopTac: 0.7, khiemNhuong: 0.6, chanThanh: 0.5, chinhTruc: 0.5, sangTao: -0.7, chiuMoHo: -0.6, camTrich: -0.6 },
    },
    {
      id: 'ho-tro', ten: 'Hỗ trợ chăm sóc',
      chat: 'Đứng cạnh người khác làm chuyên môn, và phần việc của mình là làm cho người bệnh đỡ sợ.',
      viec: ['Trợ lý nha khoa, phụ tá phòng khám', 'Điều dưỡng viên, hộ lý', 'Trợ lý vật lý trị liệu', 'Chăm sóc thú y, trợ lý thú y', 'Nhân viên chăm sóc tại nhà'],
      bac: ['thap', 'giua'],
      hinh: { thauCam: 1.5, khiemNhuong: 1.3, lacQuan: 1.3, hopTac: 1.2, chanThanh: 1.2, huongNguoi: 0.9, chiTienThu: -1.0, hamTimHieu: -0.8, camTrich: -0.8, tuTin: -0.7 },
    },
  ],
  nghe: [
    {
      id: 'ky-su', ten: 'Kỹ sư · thiết kế kỹ thuật',
      chat: 'Bài toán có lời giải đúng, nhưng phải tự tìm ra — và người ta trả tiền cho cái đầu chứ không cho chức danh.',
      viec: ['Kỹ sư cơ khí, điện, điện tử', 'Kỹ sư xây dựng, kết cấu, hạ tầng', 'Lập trình viên, kỹ sư phần mềm', 'Kỹ sư dữ liệu, học máy', 'Thiết kế công nghiệp, thiết kế sản phẩm'],
      bac: ['kha', 'cao'],
      hinh: { sangTao: 1.3, hamTimHieu: 1.2, chiTienThu: 0.9, chiuMoHo: 0.9, tiMi: 0.8, uyenChuyen: 0.8, chuDong: 0.6, thanTrong: 0.5, tuChu: -0.7, lacQuan: -0.6, thauCam: -0.6 },
    },
    {
      id: 'bao-mat', ten: 'An toàn hệ thống · kiểm soát rủi ro kỹ thuật',
      chat: 'Việc là nghĩ như người muốn phá, rồi bịt trước. Làm tốt thì không ai thấy gì xảy ra cả.',
      viec: ['An toàn thông tin, kiểm thử xâm nhập', 'Quản trị hệ thống, vận hành hạ tầng', 'Kiểm định an toàn công nghiệp', 'Quản lý chất lượng kỹ thuật', 'Ứng cứu sự cố công nghệ'],
      bac: ['kha', 'cao'],
      hinh: { chinhTruc: 1.5, sangTao: 1.4, hamTimHieu: 1.3, thanTrong: 1.2, chiuMoHo: 1.2, benBi: 1.2, tiMi: 1.1, chuDong: 1.1, uyenChuyen: 1.1, chiTienThu: 1.1, dangTinCay: 0.8, lacQuan: -1.0, huongNguoi: -0.8, thauCam: -0.8 },
    },
    {
      id: 'to-truong', ten: 'Trưởng nhóm tay nghề',
      chat: 'Vừa giỏi nghề vừa phải cầm người — hai thứ không tự đi kèm nhau.',
      viec: ['Bếp trưởng, quản lý bếp', 'Tổ trưởng kỹ thuật, trưởng nhóm bảo trì', 'Trưởng nhóm phát triển, tech lead', 'Kiến trúc sư cảnh quan, chủ trì thiết kế', 'Trưởng bộ phận hỗ trợ kỹ thuật'],
      bac: ['giua', 'kha'],
      hinh: { camTrich: 1.1, sangTao: 0.9, chuDong: 0.9, uyenChuyen: 0.8, tuTin: 0.8, hopTac: 0.7, chiuMoHo: 0.7, huongNguoi: 0.6, chiTienThu: 0.6, khiemNhuong: 0.6 },
    },
    {
      id: 'bao-tri', ten: 'Bảo trì · kỹ thuật hiện trường',
      chat: 'Máy hỏng thì mình tới. Làm việc với vật nhiều hơn với người, và cái đúng là máy chạy lại được.',
      viec: ['Bảo trì máy công nghiệp, cơ điện', 'Kỹ thuật viên ô tô, xe máy, máy nông nghiệp', 'Lắp đặt và bảo trì điện lạnh, thang máy', 'Kỹ thuật viên viễn thông, hạ tầng mạng', 'Vận hành trạm, nhà máy kỹ thuật'],
      bac: ['giua', 'kha'],
      hinh: { tiMi: 0.6, thanTrong: 0.6, huongNguoi: -0.8, thauCam: -0.8, lacQuan: -0.7, hopTac: -0.7, chanThanh: -0.6, camTrich: -0.6, chuDong: -0.5 },
    },
    {
      id: 'san-xuat', ten: 'Vận hành sản xuất', phoThong: true,
      chat: 'Việc có quy trình rõ, làm đúng là được — không đòi một chất người đặc thù nào.',
      viec: ['Vận hành máy, lắp ráp dây chuyền', 'Gia công cơ khí, hàn, tiện phay', 'Đóng gói, kiểm phẩm'],
      bac: ['thap', 'giua'],
      hinh: { chinhTruc: -1.5, hopTac: -1.4, chiuMoHo: -1.4, uyenChuyen: -1.4, tuTin: -1.3, chuDong: -1.3 },
    },
    {
      id: 'phuc-vu', ten: 'Chế biến · phục vụ', phoThong: true,
      chat: 'Việc có quy trình rõ, làm đúng là được — không đòi một chất người đặc thù nào.',
      viec: ['Phục vụ nhà hàng, quán cà phê', 'Pha chế, chế biến suất ăn', 'Bán hàng ăn nhanh, quầy phục vụ'],
      bac: ['thap'],
      hinh: { lacQuan: 0.9, khiemNhuong: 0.8, hopTac: 0.7, huongNguoi: 0.7, tiMi: -1.4, thanTrong: -1.3, chiTienThu: -1.3, benBi: -1.3 },
    },
  ],
  tu: [
    {
      id: 'hoc-thuat', ten: 'Học thuật · truyền bá tri thức',
      chat: 'Đổi thu nhập lấy chỗ được nghĩ sâu và được nói ra điều mình tin.',
      viec: ['Giảng viên, nghiên cứu viên', 'Viết sách, biên soạn chuyên khảo', 'Diễn giả, tổ chức khoá chuyên đề', 'Phản biện chính sách, cố vấn học thuật', 'Dịch thuật học thuật'],
      bac: ['cao'],
      hinh: { hamTimHieu: 1.5, sangTao: 1.2, huongNguoi: 1.1, chiTienThu: 1.0, chuDong: 1.0, chiuMoHo: 1.0, thauCam: 0.9, camTrich: 0.9, hopTac: 0.8, thanTrong: -1.1, tiMi: -0.9 },
    },
    {
      id: 'dong-hanh', ten: 'Đồng hành · giáo dục sớm',
      chat: 'Kết quả không thấy trong năm nay. Người làm được việc này là người chịu được chuyện đó.',
      viec: ['Giáo viên mầm non, tiểu học', 'Giáo dục đặc biệt, can thiệp sớm', 'Tổ chức thiện nguyện, phát triển cộng đồng', 'Tham vấn học đường', 'Đào tạo kỹ năng sống'],
      bac: ['giua', 'kha'],
      hinh: { lacQuan: 2.1, chanThanh: 2.0, thauCam: 2.0, khiemNhuong: 1.7, hopTac: 1.5, huongNguoi: 1.4, tuChu: 1.2, uyenChuyen: 1.0, chiuApLuc: 1.0, tiMi: -0.9 },
    },
    {
      id: 'bao-ton', ten: 'Bảo tồn · di sản · môi trường',
      chat: 'Giữ lại thứ người khác sắp bỏ đi, và phải giữ đúng chứ không giữ cho có.',
      viec: ['Bảo tàng, lưu trữ, tu bổ di tích', 'Thư viện, số hoá tư liệu', 'Bảo tồn thiên nhiên, kiểm lâm', 'An toàn lao động, môi trường', 'Hướng dẫn di sản, du lịch văn hoá'],
      bac: ['giua', 'kha'],
      hinh: { hamTimHieu: 0.9, tiMi: 0.8, khiemNhuong: 0.7, thanTrong: 0.6, chinhTruc: 0.6, chanThanh: 0.5, hopTac: 0.5, lacQuan: -0.4 },
    },
    {
      id: 'nghien-cuu', ten: 'Nghiên cứu độc lập',
      chat: 'Không ai giao đề bài. Tự chọn câu hỏi rồi tự chịu trách nhiệm là nó có đáng hỏi không.',
      viec: ['Nghiên cứu tự do, viết chuyên đề', 'Tư vấn độc lập theo dự án', 'Khảo cứu, điền dã, sưu tầm', 'Phát triển nội dung chuyên môn', 'Nghề tự chủ thời gian, ít ràng buộc tổ chức'],
      bac: ['kha', 'cao'],
      hinh: { hamTimHieu: 1.4, sangTao: 1.2, chiuMoHo: 1.0, chiTienThu: 0.8, chuDong: 0.6, uyenChuyen: 0.5, tiMi: 0.5, tuChu: -0.8, chiuApLuc: -0.6, dangTinCay: -0.6, thauCam: -0.5 },
    },
  ],
};

const hinhVec = (h: NhanhDef['hinh']): Vec => TRUC_IDS.map((t) => h[t] ?? 0);

function cosine(a: Vec, b: Vec): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

export interface NhanhGoiY {
  id: string;
  ten: string;
  chat: string;
  viec: string[];
  /** 0–100, để xếp thứ tự. KHÔNG bày ra như "độ chính xác" — nó là độ khớp. */
  diem: number;
  /** Trục kéo nhánh này lên, đọc theo mặt CAO. */
  vi: string[];
  /** Nhánh phổ thông: lá số không nói gì đặc thù về nó. */
  phoThong: boolean;
  /** Bậc chức phận có khớp không — dùng để nêu cảnh báo, không để loại. */
  hopBac: boolean;
}

export interface NhanhKetQua {
  goiY: NhanhGoiY[];
  /** Ba trục nổi nhất của chính lá số — phần "chất người" đọc ra được. */
  chatNguoi: { ten: string; cao: string; diem: number }[];
  /** Trục thấp nhất — đọc theo mặt "không đòi hỏi", KHÔNG đọc là thiếu sót. */
  neTranh: { ten: string; thap: string }[];
  /** Không nhánh nào khớp đủ mạnh → chỉ còn nhánh phổ thông. */
  moNhat: boolean;
  /**
   * MỌI nhánh gợi ý đều lệch bậc chức phận hiện tại. Trang PHẢI nói ra chỗ này
   * thay vì im lặng bày "Điều hành cấp cao" cho lá số bậc lận đận — đọc lên rất
   * kỳ và làm người ta mất tin vào cả bản đọc. Cách nói đúng: đây là HƯỚNG hợp
   * với chất người, chưa phải chỗ đứng ngay bây giờ.
   */
  lechBac: boolean;
}

const NGUONG_KHOP = 0.25;

/**
 * Chọn nhánh trong MỘT lĩnh vực. `tier` lấy từ `resolveCareerBase(ls).tier`.
 *
 * Nhánh `phoThong` KHÔNG tham gia xếp hạng bằng tính khí (xem `NhanhDef`);
 * chúng chỉ xuất hiện khi không nhánh thật nào vượt ngưỡng.
 */
export function chonNhanh(
  ls: Laso,
  domain: DomainId,
  tier: 'thap' | 'giua' | 'kha' | 'cao',
  soLuong = 3,
): NhanhKetQua {
  const v = vectorNguoi(ls);
  const ds = NHANH[domain] || [];

  // Nền của lĩnh vực: hình trung bình của các nhánh THẬT trong lĩnh vực này.
  // Lý do phải nêu trục PHÂN BIỆT nhánh, không nêu trục chung — nếu không thì
  // hai nhánh khác hẳn nhau lại cùng một câu giải thích, và người đọc không
  // hiểu vì sao cái này xếp trên cái kia. (Đã vấp: "Quản lý vận hành" và
  // "Điều hành cấp cao" ra y hệt "Đáng tin cậy · Chính trực · Chịu áp lực".)
  const thatDs = ds.filter((x) => !x.phoThong);
  const nen: Vec = TRUC_IDS.map((t) =>
    thatDs.length ? thatDs.reduce((s, x) => s + (x.hinh[t] ?? 0), 0) / thatDs.length : 0,
  );

  const cham = (n: NhanhDef): NhanhGoiY => {
    const s = cosine(v, hinhVec(n.hinh));
    // Trục vừa mạnh ở người, vừa là chỗ nhánh này đòi CAO HƠN mặt bằng lĩnh vực.
    // ⚠️ `v[i] > 0.2` là BẮT BUỘC, không phải lọc cho gọn: tích v×(hình−nền)
    // ra DƯƠNG khi cả hai vế cùng ÂM, nên thiếu chốt này thì một trục người
    // YẾU vẫn được nêu làm lý do — và bản đọc tự mâu thuẫn ngay trong một màn
    // hình ("không đòi: Thận trọng" nằm ngay trên "vì: Thận trọng").
    const vi = TRUC_IDS
      .map((t, i) => ({ t, gop: v[i] * ((n.hinh[t] ?? 0) - nen[i]), manh: v[i] }))
      .filter((x) => x.gop > 0.15 && x.manh > 0.2 && (n.hinh[x.t] ?? 0) > 0)
      .sort((a, b) => b.gop - a.gop)
      .slice(0, 3)
      .map((x) => `${TRUC[x.t].ten} — ${TRUC[x.t].cao}`);
    return {
      id: n.id, ten: n.ten, chat: n.chat, viec: n.viec,
      diem: Math.round(Math.max(0, Math.min(1, (s + 1) / 2)) * 100),
      vi, phoThong: !!n.phoThong, hopBac: n.bac.includes(tier),
    };
  };

  const that = thatDs.map((n) => ({ n, s: cosine(v, hinhVec(n.hinh)) }));
  that.sort((a, b) => b.s - a.s);
  const dat = that.filter((x) => x.s >= NGUONG_KHOP);

  // Bậc chỉ dùng để SẮP LẠI trong nhóm đã đạt ngưỡng, không dùng để loại —
  // bậc là thứ đổi được theo thời gian, chất người thì không.
  const xep = (dat.length ? dat : that.slice(0, soLuong)).slice(0, soLuong * 2);
  xep.sort((a, b) => {
    const ba = a.n.bac.includes(tier) ? 1 : 0, bb = b.n.bac.includes(tier) ? 1 : 0;
    return bb - ba || b.s - a.s;
  });

  const goiY = xep.slice(0, soLuong).map((x) => cham(x.n));
  const moNhat = dat.length === 0;
  if (moNhat) {
    const pt = ds.find((n) => n.phoThong);
    if (pt) goiY.push(cham(pt));
  }

  const xepTruc = TRUC_IDS.map((t, i) => ({ t, val: v[i] })).sort((a, b) => b.val - a.val);
  return {
    goiY,
    chatNguoi: xepTruc.filter((x) => x.val > 0.3).slice(0, 3)
      .map((x) => ({ ten: TRUC[x.t].ten, cao: TRUC[x.t].cao, diem: Math.round(x.val * 10) / 10 })),
    neTranh: xepTruc.filter((x) => x.val < -0.3).slice(-2)
      .map((x) => ({ ten: TRUC[x.t].ten, thap: TRUC[x.t].thap })),
    moNhat,
    lechBac: goiY.length > 0 && goiY.every((x) => !x.hopBac),
  };
}
