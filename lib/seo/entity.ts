// lib/seo/entity.ts
// ============================================================
// Neo thực thể — MODULE LÁ, cố ý KHÔNG import gì.
//
// Vì sao tách khỏi lib/seo/same-as.ts: file kia đọc Supabase (qua
// growth_accounts). 17 route ISR chỉ cần MỘT chuỗi `@id` để trỏ về thực thể;
// nếu chúng import từ file có tầng DB thì sớm muộn có người gọi nhầm hàm đọc
// DB trong đúng route đã từng 504 vì đọc Supabase tuần tự
// (`/la-so/[slug]`). Tách ra thì việc đó BẤT KHẢ THI VỀ CẤU TRÚC, không phải
// chỉ là một lời dặn trong chú thích.
// ============================================================

export const SEO_BASE = 'https://www.tuviminhbao.com';

/** Thực thể Organization khai ĐẦY ĐỦ ở /bao-chi; mọi nơi khác trỏ về đây. */
export const ORG_ID = `${SEO_BASE}/bao-chi#organization`;
