// app/api/save-laso/route.ts
export const maxDuration = 30;
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options, parseBody } from '@/lib/cors';
import { makeLasoSlug } from '@/lib/engine/laso';

const SUPABASE_URL = process.env.SUPABASE_URL!;
// Service key (KHÔNG phải anon key): anon key là public, và trước đây bảng
// laso_public phải mở INSERT/UPDATE cho vai trò anon (qual=true, không giới
// hạn dòng nào) để route này ghi được — nghĩa là bất kỳ ai cầm anon key (lộ
// sẵn trong mọi trang client) đều gọi thẳng REST API Supabase để SỬA bất kỳ
// dòng laso_public nào, bỏ qua toàn bộ logic của route này. Chuyển ghi qua
// service key rồi khoá RLS anon insert/update lại (xem migration đi kèm).
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const b = await parseBody(request) as Record<string,unknown>;
  if (!b.canChiNam || !b.namSinh) return err('Thiếu thông tin cơ bản', 400);

  let userId: string | null = null;
  const authToken = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    if (authToken) {
      const { data: { user } } = await sb.auth.getUser(authToken);
      if (user) userId = user.id;
    }

    const slug = makeLasoSlug(
      String(b.canChiNam),
      String(b.gioiTinh||''),
      String(b.ngaySinh||''),
      String(b.thangSinh||''),
      String(b.namSinh),
      String(b.gioChi||''),
      String(b.toolType||'')
    );

    const payload: Record<string, unknown> = {
      slug,
      can_chi_nam:    b.canChiNam,
      gioi_tinh:      b.gioiTinh,
      nam_sinh:       parseInt(String(b.namSinh)),
      thang_sinh:     b.thangSinh  ? parseInt(String(b.thangSinh))  : null,
      ngay_sinh:      b.ngaySinh   ? parseInt(String(b.ngaySinh))   : null,
      gio_idx:        b.gioIdx !== undefined ? parseInt(String(b.gioIdx)) : null,
      gio_chi:        b.gioChi     || null,
      can_nam:        b.canNam     || null,
      chi_nam:        b.chiNam     || null,
      nam_xem:        b.namXem     ? parseInt(String(b.namXem))     : null,
      cung_menh:      b.cungMenh   || null,
      chinh_tinh:     b.chinhTinh  || null,
      nap_am:         b.napAm      || null,
      cuc:            b.cuc        || null,
      luan_giai:      b.luanGiai   || {},
      la_so_text:     b.laSoText   || null,
      rendered_html:  b.renderedHtml  || null,
      astrolabe_data: b.astrolabeData || null,
      person_name:    b.personName ? String(b.personName) : null,
    };
    if (userId) payload.user_id = userId;

    // Check slug đã tồn tại chưa
    const { data: ex } = await sb.from('laso_public')
      .select('slug, user_id, luan_giai').eq('slug', slug).maybeSingle();

    let finalSlug = slug;

    if (ex) {
      // Slug đã tồn tại — UPDATE tại chỗ, không tạo slug mới.
      // 🔴 `luan_giai` khoá theo SỐ PHẦN (vd Chu Trình Cuộc Đời khoá theo ĐÚNG
      // engine phan 14-24 để van-han-nam đọc lại được, xem readCachedLuanGiaiPhan)
      // — GHI ĐÈ CẢ CỤC ở đây xoá sạch phần đã lưu TRƯỚC ĐÓ mỗi khi một lượt lưu
      // MỚI chỉ mang một TẬP CON phần (vd một phần lỗi rồi retry ở phiên sau chỉ
      // gửi lại đúng phần vừa xong, hoặc caller nào đó lưu thông tin cơ bản mà
      // không kèm luận giải). MERGE nông theo khoá phần, không REPLACE cả cục.
      const existingLuanGiai = (ex.luan_giai as Record<string, unknown> | null) || {};
      const incomingLuanGiai = (payload.luan_giai as Record<string, unknown> | null) || {};
      // Ép kiểu `Record<string, unknown>` tường minh: spread `payload` (vốn
      // đã là Record<string,unknown>) CÙNG với một property tường minh
      // (`luan_giai`) làm TypeScript đánh mất index signature của object kết
      // quả — nó suy ra type CHỈ CÓ đúng `luan_giai`, khiến `delete
      // updatePayload.user_id` ngay dưới báo lỗi dù `payload` có `user_id`
      // thật. Không annotate thì spread ĐƠN (không kèm property khác) như bản
      // cũ vẫn giữ được index signature — quirk chỉ lộ ra khi thêm property.
      const updatePayload: Record<string, unknown> = { ...payload, luan_giai: { ...existingLuanGiai, ...incomingLuanGiai } };
      if (ex.user_id) delete updatePayload.user_id; // giữ owner cũ nếu đã có
      const { error } = await sb.from('laso_public').update(updatePayload).eq('slug', slug);
      if (error) throw error;
      finalSlug = slug;
    } else {
      // INSERT mới
      const { data, error } = await sb.from('laso_public').insert(payload).select('slug').single();
      if (error) throw error;
      finalSlug = data.slug;
    }

    return ok({ slug: finalSlug, url: `/la-so.html?slug=${finalSlug}` });
  } catch(e:unknown) { return err((e as Error).message); }
}
