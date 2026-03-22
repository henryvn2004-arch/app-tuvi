const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dciwkfdqhhddeymlisey.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

const CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

function makeSlug(canChiNam, gioiTinh, namSinh, gioChi) {
  // Giáp Tý → giap-ty, Nữ → nu, 1984 → 1984, Mão → mao
  const removeAccents = str => str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/\s+/g, '-');
  const parts = [
    removeAccents(canChiNam || ''),
    gioiTinh === 'nu' ? 'nu' : 'nam',
    namSinh || '',
    removeAccents(gioChi ? 'gio-' + gioChi : ''),
  ].filter(Boolean);
  return parts.join('-');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      canChiNam, gioiTinh, namSinh, thangSinh, ngaySinh,
      gioIdx, gioChi, canNam, chiNam, namXem,
      cungMenh, chinhTinh, napAm, cuc,
      luanGiai, laSoText, renderedHtml,
    } = req.body;

    if (!canChiNam || !namSinh) {
      return res.status(400).json({ error: 'Thiếu thông tin cơ bản' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Generate slug + ensure unique
    let slug = makeSlug(canChiNam, gioiTinh, namSinh, gioChi);

    // Check duplicate
    const { data: existing } = await supabase
      .from('laso_public')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      // Append timestamp to make unique
      slug = slug + '-' + Date.now().toString(36);
    }

    const { data, error } = await supabase
      .from('laso_public')
      .insert({
        slug,
        can_chi_nam:  canChiNam,
        gioi_tinh:    gioiTinh,
        nam_sinh:     parseInt(namSinh),
        thang_sinh:   parseInt(thangSinh) || null,
        ngay_sinh:    parseInt(ngaySinh) || null,
        gio_idx:      gioIdx !== undefined ? parseInt(gioIdx) : null,
        gio_chi:      gioChi || null,
        can_nam:      canNam || null,
        chi_nam:      chiNam || null,
        nam_xem:      parseInt(namXem) || null,
        cung_menh:    cungMenh || null,
        chinh_tinh:   chinhTinh || null,
        nap_am:       napAm || null,
        cuc:          cuc || null,
        luan_giai:    luanGiai || {},
        la_so_text:   laSoText || null,
        rendered_html: renderedHtml || null,
        rendered_html: renderedHtml || null,
      })
      .select('slug')
      .single();

    if (error) throw error;

    return res.status(200).json({ slug: data.slug, url: `/la-so.html?slug=${data.slug}` });

  } catch (e) {
    console.error('save-laso error:', e);
    return res.status(500).json({ error: e.message });
  }
};
