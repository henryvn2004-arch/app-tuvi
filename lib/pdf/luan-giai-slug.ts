// lib/pdf/luan-giai-slug.ts
// 🔑 Slug của 2 tool CÓ "Gửi lại PDF" phân biệt bằng TIỀN TỐ (xem
// `makeLasoSlug`, lib/engine/laso.ts): chu-trinh-cuoc-doi luôn có tiền tố
// riêng; laso (kể cả trang 24-phần CŨ đã retire) luôn KHÔNG tiền tố. Slug của
// tool khác lưu chung bảng `laso_public` (Bát Tự `tu-binh-*`, Vận Hạn Năm
// `van-han-nam-al*`) bị loại rõ ràng — tránh dựng nhầm PDF "Luận Giải Tử Vi"
// từ nội dung Bát Tự (khoá phần trùng số nhưng khác ý nghĩa hoàn toàn).
// Nguồn DUY NHẤT: route gửi PDF (quyết định thật) và /api/reports (liệt kê cho
// trang Báo cáo) cùng gọi — hai bản chép là sớm muộn trôi khỏi nhau.
import type { LuanGiaiToolId } from '@/lib/pdf/luan-giai';

export function classifyLuanGiaiSlug(slug: string): LuanGiaiToolId | null {
  if (slug.startsWith('chu-trinh-cuoc-doi-')) return 'chu-trinh-cuoc-doi';
  if (slug.startsWith('tu-binh-') || slug.startsWith('van-han-nam-al')) return null;
  return 'laso';
}
