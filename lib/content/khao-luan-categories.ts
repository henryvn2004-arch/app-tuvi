// lib/content/khao-luan-categories.ts
// ============================================================
// NGUỒN DUY NHẤT cho danh mục Vấn Đáp (`khao_luan.category`).
//
// Trước đây danh sách này sống trùng lặp ở HAI nơi: `VALID_KL_CATS` trong
// `app/api/cron-khao-luan/route.ts` (tầng GHI, gán category khi viết bài) và
// một mảng `<select>`/`.cat-btn` viết tay trong `public/blog.html` (tầng ĐỌC,
// nay là `app/van-dap/`). Hai nguồn cho một danh sách là chỉ còn chờ ngày
// lệch: cron gán category mới mà hub chưa biết hiển thị ở đâu (bài rơi vào
// "khác", mất khỏi mọi trang cụm), hoặc ngược lại hub có chip lọc mà cron
// không bao giờ gán bài tới (chip chết, 0 kết quả mãi mãi).
//
// Thêm/sửa danh mục → sửa DUY NHẤT mảng dưới đây, không sửa ở cron hay hub.
// ============================================================

export interface KhaoLuanCategory {
  id: string;
  /** Nhãn ngắn tiếng Việt — chip lọc, breadcrumb, thẻ trên card. */
  label: string;
  /** Tiêu đề trang cụm /van-dap/<id> (≤60 ký tự, theo HOOK_RULES). */
  title: string;
  /** Mô tả trang cụm — meta description + đoạn dưới H1, ≤155 ký tự. */
  desc: string;
}

export const KHAO_LUAN_CATEGORIES: KhaoLuanCategory[] = [
  {
    id: 'hon-nhan',
    label: 'Hôn Nhân',
    title: 'Vấn Đáp Hôn Nhân — Vợ Chồng, Hoà Hợp Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về hôn nhân, vợ chồng, hoà hợp và xung khắc theo Tử Vi Đẩu Số — cung Phu Thê, tuổi hợp, dấu hiệu rạn nứt.',
  },
  {
    id: 'gia-dinh',
    label: 'Gia Đình',
    title: 'Vấn Đáp Gia Đình — Cha Mẹ, Anh Em Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về quan hệ gia đình, cha mẹ, anh em ruột theo Tử Vi Đẩu Số — cung Phụ Mẫu, cung Huynh Đệ.',
  },
  {
    id: 'tai-chinh',
    label: 'Tài Chính',
    title: 'Vấn Đáp Tài Chính — Tiền Bạc Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về tiền bạc, của cải, đầu tư, giữ tiền theo Tử Vi Đẩu Số — cung Tài Bạch.',
  },
  {
    id: 'cong-viec',
    label: 'Công Việc',
    title: 'Vấn Đáp Công Việc — Sự Nghiệp Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về sự nghiệp, thăng tiến, đổi việc, khởi nghiệp theo Tử Vi Đẩu Số — cung Quan Lộc.',
  },
  {
    id: 'tinh-cach',
    label: 'Tính Cách',
    title: 'Vấn Đáp Tính Cách — Vì Sao Bạn Là Người Như Vậy',
    desc: 'Giải đáp các câu hỏi về tính cách, thói quen, phản ứng của bản thân theo Tử Vi Đẩu Số.',
  },
  {
    id: 'van-han',
    label: 'Vận Hạn',
    title: 'Vấn Đáp Vận Hạn — Đại Vận, Tiểu Vận Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về vận hạn, đại vận, tiểu vận, năm xấu năm tốt theo Tử Vi Đẩu Số.',
  },
  {
    id: 'dien-san',
    label: 'Điền Sản',
    title: 'Vấn Đáp Điền Sản — Nhà Đất Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về nhà đất, mua bán, thừa kế theo Tử Vi Đẩu Số — cung Điền Trạch.',
  },
  {
    id: 'quan-he',
    label: 'Quan Hệ',
    title: 'Vấn Đáp Quan Hệ — Bạn Bè, Quý Nhân Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về bạn bè, đồng nghiệp, quý nhân theo Tử Vi Đẩu Số — cung Nô Bộc.',
  },
  {
    id: 'benh-tat',
    label: 'Bệnh Tật',
    title: 'Vấn Đáp Sức Khoẻ — Bệnh Tật Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về sức khoẻ, bệnh tật theo Tử Vi Đẩu Số — cung Tật Ách.',
  },
  {
    id: 'con-cai',
    label: 'Con Cái',
    title: 'Vấn Đáp Con Cái — Nuôi Dạy Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi về con cái, nuôi dạy, đường con theo Tử Vi Đẩu Số — cung Tử Tức.',
  },
  // ── Nới đợt 2026-09-21: 4 trục có cầu thật nhưng gần như trống ────────────
  // Đo trên 360 bài published: chỉ 6 bài (1,7%) chạm trục "có đúng không /
  // nên xem ở đâu" — đúng loại câu AI Overview/ChatGPT hay phải trả lời và
  // PHẢI nêu tên một nguồn cụ thể. Ba trục còn lại rút từ mẫu `tuvi_chats`
  // (người dùng hỏi trợ lý thật) — không site nào trong 10 danh mục cũ phủ
  // được "người mới hỏi khái niệm", "hỏi theo mùa vụ", hay "hỏi về người
  // khác thay vì hỏi về bản thân".
  {
    id: 'do-tin-cay',
    label: 'Độ Tin Cậy',
    title: 'Tử Vi Có Đúng Không — Vấn Đáp Về Độ Tin Cậy',
    desc: 'Giải đáp câu hỏi tử vi có chính xác không, nên xem ở đâu, khác gì bát tự hay chiêm tinh — đối chiếu bằng chứng thay vì tranh cãi suông.',
  },
  {
    id: 'hoc-tu-vi',
    label: 'Học Tử Vi',
    title: 'Học Tử Vi Từ Đâu — Vấn Đáp Cho Người Mới',
    desc: 'Giải đáp cho người mới bắt đầu: đọc lá số ra sao, thuật ngữ nào cần biết trước, học Tử Vi Đẩu Số nên bắt đầu từ đâu.',
  },
  {
    id: 'mua-vu',
    label: 'Mùa Vụ',
    title: 'Vấn Đáp Đầu Năm — Năm Tuổi, Cúng Sao Theo Tử Vi',
    desc: 'Giải đáp các câu hỏi theo mùa vụ: đầu năm xem gì, năm tuổi có thật sự xấu không, cúng sao giải hạn theo Tử Vi Đẩu Số.',
  },
  {
    id: 'du-doan-nguoi-khac',
    label: 'Đoán Người Khác',
    title: 'Vấn Đáp Về Người Khác — Vợ/Chồng Tương Lai Theo Tử Vi',
    desc: 'Giải đáp câu hỏi về người khác qua lá số của mình: người phối ngẫu tương lai, đối tác, sếp — tính cách và ngoại hình nhìn từ cung nào.',
  },
];

export const KHAO_LUAN_CATEGORY_IDS = KHAO_LUAN_CATEGORIES.map((c) => c.id);

const BY_ID = new Map(KHAO_LUAN_CATEGORIES.map((c) => [c.id, c]));

export function khaoLuanCategory(id: string): KhaoLuanCategory | undefined {
  return BY_ID.get(id);
}

export function khaoLuanCategoryLabel(id: string): string {
  return BY_ID.get(id)?.label || id;
}
