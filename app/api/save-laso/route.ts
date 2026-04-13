// app/api/save-laso/route.ts
export const maxDuration = 30;
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options, parseBody } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

function makeSlug(canChiNam: string, gioiTinh: string, namSinh: string, gioChi: string): string {
  const rm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,'-');
  return [rm(canChiNam||''), gioiTinh==='nu'?'nu':'nam', namSinh||'', gioChi?'gio-'+rm(gioChi):''].filter(Boolean).join('-');
}

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

    const slug = makeSlug(String(b.canChiNam), String(b.gioiTinh||''), String(b.namSinh), String(b.gioChi||''));

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
      .select('slug, user_id').eq('slug', slug).maybeSingle();

    let finalSlug = slug;

    if (ex) {
      // Slug đã tồn tại — UPDATE tại chỗ, không tạo slug mới
      const updatePayload = { ...payload };
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
