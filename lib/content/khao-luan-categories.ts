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
];

export const KHAO_LUAN_CATEGORY_IDS = KHAO_LUAN_CATEGORIES.map((c) => c.id);

const BY_ID = new Map(KHAO_LUAN_CATEGORIES.map((c) => [c.id, c]));

export function khaoLuanCategory(id: string): KhaoLuanCategory | undefined {
  return BY_ID.get(id);
}

export function khaoLuanCategoryLabel(id: string): string {
  return BY_ID.get(id)?.label || id;
}
