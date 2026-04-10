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
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    let slug = makeSlug(String(b.canChiNam), String(b.gioiTinh||''), String(b.namSinh), String(b.gioChi||''));
    const { data: ex } = await sb.from('laso_public').select('slug').eq('slug', slug).maybeSingle();
    if (ex) slug = slug + '-' + Date.now().toString(36);
    const { data, error } = await sb.from('laso_public').insert({
      slug, can_chi_nam:b.canChiNam, gioi_tinh:b.gioiTinh,
      nam_sinh:parseInt(String(b.namSinh)),
      thang_sinh:b.thangSinh?parseInt(String(b.thangSinh)):null,
      ngay_sinh:b.ngaySinh?parseInt(String(b.ngaySinh)):null,
      gio_idx:b.gioIdx!==undefined?parseInt(String(b.gioIdx)):null,
      gio_chi:b.gioChi||null, can_nam:b.canNam||null, chi_nam:b.chiNam||null,
      nam_xem:b.namXem?parseInt(String(b.namXem)):null,
      cung_menh:b.cungMenh||null, chinh_tinh:b.chinhTinh||null,
      nap_am:b.napAm||null, cuc:b.cuc||null,
      luan_giai:b.luanGiai||{}, la_so_text:b.laSoText||null,
      rendered_html:b.renderedHtml||null, astrolabe_data:b.astrolabeData||null,
    }).select('slug').single();
    if (error) throw error;
    return ok({ slug: data.slug, url: `/la-so.html?slug=${data.slug}` });
  } catch(e:unknown) { return err((e as Error).message); }
}
