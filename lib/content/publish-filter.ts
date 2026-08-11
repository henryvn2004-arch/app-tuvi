/**
 * Bộ lọc "chỉ lấy bài ĐANG ĐĂNG" cho hai bảng nội dung do LLM sinh.
 *
 * `khao_luan` và `master_articles` nay có cột `publish_status`
 * (published | draft | hidden). Cột đó chỉ có nghĩa nếu MỌI bề mặt công khai
 * đều lọc theo nó — gỡ một bài xuống mà trang vẫn hiện thì cột chỉ là trang trí.
 *
 * 🔑 VÌ SAO LÀ MỘT HẰNG SỐ DÙNG CHUNG chứ không phải chép chuỗi 12 chỗ:
 * đo được 12 nơi đọc hai bảng này (trang bài, danh sách, bài liên quan, trang
 * tác giả, gợi ý trong `/la-so/*`, sitemap, dựng bài social, seeding). Chép
 * chuỗi lọc ra 12 chỗ là 12 chỗ để quên, và quên thì hỏng IM LẶNG. Bộ dò
 * `npm run check:publish` canh đúng chuyện đó.
 *
 * ⚠️ KHÔNG áp bộ lọc này cho đường ADMIN: trang Kho phải thấy được cả bài đã
 * gỡ xuống, nếu không thì gỡ xong là mất dấu luôn, không đăng lại được.
 */

/** Hai bảng có cột `publish_status`. Thêm bảng mới thì khai ở đây. */
export const PUBLISH_GATED_TABLES = ['khao_luan', 'master_articles'] as const;

/** Mảnh query PostgREST — nối vào chuỗi tham số bằng dấu `&`. */
export const PUBLISHED_ONLY = 'publish_status=eq.published';

/**
 * Nối bộ lọc vào một đường dẫn PostgREST đã có (tự chọn `?` hay `&`).
 * Dùng cho chỗ dựng URL bằng template literal.
 */
export function withPublished(path: string): string {
  return path + (path.includes('?') ? '&' : '?') + PUBLISHED_ONLY;
}

/**
 * Trạng thái mà cron nên đặt cho bài VỪA VIẾT.
 *
 * Mặc định `published` — giữ nguyên hành vi đang chạy. Bật
 * `app_config['content.require_review'] = true` thì bài nằm ở `draft` chờ
 * người bấm duyệt.
 *
 * ⚠️ Đánh đổi phải nói rõ trước khi bật: draft nghĩa là **mỗi ngày phải có
 * người vào duyệt**, không duyệt thì trang đứng im. Đó là quyết định vận hành,
 * nên nó nằm ở `app_config` (đổi bằng một câu SQL) chứ không phải hằng số
 * trong mã (đổi phải deploy).
 *
 * FAIL-OPEN: đọc hụt config → `published`. Cầu dao này gác QUY TRÌNH chứ không
 * gác an toàn; Supabase chớp một nhịp mà làm bài mới im lặng biến mất khỏi web
 * thì tệ hơn hẳn việc lỡ đăng thẳng một bài.
 */
export async function initialPublishStatus(): Promise<'published' | 'draft'> {
  try {
    const { getConfigValue } = await import('../config/appConfig');
    const v = await getConfigValue<boolean>('content.require_review', false);
    return v === true ? 'draft' : 'published';
  } catch {
    return 'published';
  }
}
