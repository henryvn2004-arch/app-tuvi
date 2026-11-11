// app/api/laso-luan/route.ts — bản luận đã lưu của một lá số theo NGÔN NGỮ trang (i18n W17).
//
// Trang luận (Luận Giải · Chu Trình · Bát Tự · Vận Hạn 12 Tháng) ở `vi` vẫn đọc thẳng `laso_public` bằng
// anon REST như cũ — route này CHỈ dành cho trang `/<locale>/…` ≠ vi: bản ja/ko/zh-*/en nằm ở bảng
// `laso_public_i18n` (RLS khoá, chỉ service_role) nên phải qua server.
//
// Ngôn ngữ quyết bằng `requestLocale` (Referer `/<locale>/…`) — ĐÚNG hàm mà route sinh luận và
// `/api/save-laso` dùng, nên đọc và ghi luôn cùng một ngăn. Hụt ⇒ `{ luanGiai: null }` ⇒ trang sinh như
// cũ (qua cổng thanh toán hiện có — quyền theo slug, người đã mua bản vi không bị thu lần hai).
//
// Không kiểm quyền ở đây: cùng mức lộ với `laso_public` (đọc công khai theo slug); trang chỉ gọi sau
// bước `/api/payment?action=check` y như đường vi.
export const dynamic = 'force-dynamic';
export const maxDuration = 10;
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { requestLocale } from '@/lib/llm/locale';
import { readLuanI18n } from '@/lib/laso/luan-i18n';

export async function OPTIONS() {
  return options();
}

export async function GET(request: NextRequest) {
  const slug = (new URL(request.url).searchParams.get('slug') || '').trim();
  if (!slug || slug.length > 200) return err('Missing slug', 400);
  const locale = requestLocale(request);
  if (locale === 'vi') return ok({ locale, luanGiai: null });
  const row = await readLuanI18n(slug, locale);
  return ok({ locale, luanGiai: row?.luanGiai ?? null, namXem: row?.namXem ?? null });
}
