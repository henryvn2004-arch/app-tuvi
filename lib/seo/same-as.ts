// lib/seo/same-as.ts
// ============================================================
// TRƯỜNG `sameAs` + NÚT Organization CHÍNH DANH cho JSON-LD.
//
// Nguồn dữ liệu: bảng `growth_accounts` (xem lib/growth/accounts.ts) — đánh
// dấu một hồ sơ "đã xác minh" trong admin là schema toàn site đổi theo,
// KHÔNG cần deploy.
//
// 🔴 HAI QUYẾT ĐỊNH ĐÃ CÂN, ĐỌC TRƯỚC KHI "TỐI ƯU" NGƯỢC LẠI:
//
// 1. KHÔNG rải `sameAs` lên cả 438K trang ISR. Hai lý do, cả hai đều nặng:
//    (a) `/la-so/[slug]` đã từng 504 vì đọc Supabase TUẦN TỰ — thêm một lượt
//        đọc nữa vào đúng route đó là lặp lại chính lỗi vừa vá;
//    (b) đúng cách làm của schema.org là khai thực thể MỘT LẦN ở một nút có
//        `@id` rồi mọi nơi khác TRỎ VỀ bằng `@id`, không phải chép 438K bản.
//    ⇒ Nút đầy đủ (kèm sameAs) chỉ nằm ở /bao-chi và /tac-gia/*; chỗ khác
//    dùng `orgRef()`.
//
// 2. `Person.sameAs` của trang tác giả CỐ Ý ĐỂ TRỐNG. Nghe như một lỗ hổng
//    (mảng rỗng nằm sẵn trong code) nhưng điền social của SITE vào đó là
//    khai sai: `sameAs` nghĩa là "mấy URL này CHÍNH LÀ thực thể đó", mà 15
//    persona tác giả không sở hữu Facebook/YouTube của site. Chỗ đúng để
//    treo mấy hồ sơ đó là Organization trong `worksFor`.
// ============================================================

import { getSameAsUrls } from '@/lib/growth/accounts';
import { SEO_BASE, ORG_ID } from '@/lib/seo/entity';

export { SEO_BASE, ORG_ID };

// Đọc DB một lượt rồi giữ trong bộ nhớ tiến trình. TTL ngắn vì đây là dữ
// liệu Henry sửa tay trong admin và muốn thấy hiệu lực sớm; nhưng đủ dài để
// một lượt cache MISS hàng loạt không nện Supabase.
const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; urls: string[] } | null = null;

export async function sameAsUrls(): Promise<string[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.urls;
  const urls = await getSameAsUrls();
  cache = { at: now, urls };
  return urls;
}

export interface OrgNodeOptions {
  /** true → khai `@context` (dùng khi nút đứng riêng trong mảng @graph). */
  standalone?: boolean;
}

/**
 * Nút Organization ĐẦY ĐỦ. Chỉ dùng ở trang đóng vai "hồ sơ thực thể"
 * (/bao-chi) và ở `worksFor` của trang tác giả — KHÔNG rải khắp nơi.
 */
export async function orgNode(opts: OrgNodeOptions = {}): Promise<Record<string, unknown>> {
  const urls = await sameAsUrls();
  const node: Record<string, unknown> = {
    ...(opts.standalone ? { '@context': 'https://schema.org' } : {}),
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Tử Vi Minh Bảo',
    alternateName: '紫微明寶',
    url: SEO_BASE,
    logo: { '@type': 'ImageObject', url: `${SEO_BASE}/seal.webp` },
    description:
      'Cổng mệnh lý — lá số lập bằng engine tất định theo cổ pháp, phần luận chỉ diễn giải trên số đã tính, không tự sinh dữ liệu.',
    areaServed: ['VN', 'US', 'AU', 'CA'],
    inLanguage: 'vi',
  };
  // Chỉ khai khi THẬT SỰ có hồ sơ — `sameAs: []` không mang tín hiệu nào mà
  // vẫn chiếm chỗ, và đó đúng là hiện trạng đang phải sửa.
  if (urls.length) node.sameAs = urls;
  return node;
}

/** Trỏ về thực thể đã khai ở /bao-chi. Rẻ, không đọc DB. */
export function orgRef(): Record<string, unknown> {
  return { '@id': ORG_ID };
}
