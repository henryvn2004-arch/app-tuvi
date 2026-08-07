// app/api/sitemap/route.ts
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
import { NextResponse } from 'next/server';
import { lastmodLine, revOf } from '@/lib/seo/lastmod';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE_URL     = 'https://www.tuviminhbao.com';
const CACHE_TTL    = 3600; // CDN cache 1h — bots don't need real-time sitemap

type SlugRow = { slug: string; created_at?: string; updated_at?: string };

/** Ngày sửa THẬT của một dòng: ưu tiên `updated_at`, lùi về `created_at`.
 *  Không có cả hai ⇒ `undefined` ⇒ `lastmodLine` bỏ hẳn thẻ (xem lib/seo/lastmod.ts). */
function rowLastmod(r: SlugRow): string | undefined {
  return r.updated_at || r.created_at;
}

/** `hasUpdatedAt`: chỉ 2 bảng có cột này (`tu_dien`, `sach_library`) — hỏi cột
 *  không tồn tại thì PostgREST trả 400 và lượt đó ra mảng rỗng, tức mất im lặng
 *  cả một họ URL khỏi sitemap. */
async function fetchAllSlugs(table: string, hasUpdatedAt = false) {
  const cols = hasUpdatedAt ? 'slug,created_at,updated_at' : 'slug,created_at';
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' } }
  );
  const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);
  if (!total) return [];
  const pageSize = 1000;
  const offsets = Array.from({length: Math.ceil(total/pageSize)}, (_, i) => i * pageSize);
  const results = await Promise.all(
    offsets.map(offset =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}&order=id.asc&limit=${pageSize}&offset=${offset}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      ).then(r => r.ok ? r.json() : [])
    )
  );
  return results.flat() as SlugRow[];
}

// Paginate through seo_pages (Supabase caps at 1000 rows per request)
// Fetch total count first, then all batches in parallel
async function fetchAllSeoPages() {
  // Get total count first
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_pages?select=id&limit=1`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' } }
  );
  const totalCount = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10);
  if (!totalCount) return [];

  const pageSize = 1000;
  const pages = Math.ceil(totalCount / pageSize);
  const offsets = Array.from({length: pages}, (_, i) => i * pageSize);

  const results = await Promise.all(
    offsets.map(offset =>
      fetch(`${SUPABASE_URL}/rest/v1/seo_pages?select=slug,category,created_at&order=id.asc&limit=${pageSize}&offset=${offset}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      ).then(r => r.ok ? r.json() : [])
    )
  );
  return results.flat() as { slug: string; category: string; created_at: string }[];
}

function escXml(s: string) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// `changefreq`/`priority` đã GỠ: Google bỏ qua cả hai. Giữ lại chỉ làm file
// phình thêm ~40% và tạo ảo giác là mình đang điều khiển được thứ tự crawl.
// `lastmod` là thứ duy nhất còn tác dụng — và chỉ khi nó đúng.
function urlEntry(loc: string, lastmod?: string | null) {
  return `  <url>\n    <loc>${escXml(loc)}</loc>${lastmodLine(lastmod)}\n  </url>`;
}

export async function GET() {
  // ⚠️ KHÔNG có `const today` ở đây nữa. Bản cũ đóng dấu ngày hôm nay làm
  // lastmod cho mọi trang tĩnh + van-han, mỗi ngày một lần — xem lib/seo/lastmod.ts.
  // Trang tĩnh: CỐ Ý KHÔNG có lastmod. Mình không theo dõi ngày sửa của chúng ở
  // bất cứ đâu, mà bịa một ngày còn tệ hơn bỏ trống — xem lib/seo/lastmod.ts.
  const staticPages = [
    '/',
    '/nghien-cuu',            // master articles listing
    '/tac-gia',               // author listing
    '/luan-giai.html',        // core product page
    '/tu-vi',                 // SEO pages index
    '/tu-dien',               // từ điển index
    '/about.html',
    '/resources.html',
    '/blog.html',
    '/menh-kho.html',
    '/ngay-tot',              // ngay-tot hub
    '/van-han',               // van-han hub
    '/xem-tuoi.html',
    '/xem-lam-an.html',
    '/contact.html',
    // Category hubs
    '/kien-thuc-tuvi',
    '/phong-thuy',
    '/xem-tuong',
    '/chon-ngay',
    '/lam-dep',
    '/dat-ten',
    // Tools
    '/tools/an-sao.html',
    '/tools/ban-lam-viec.html',
    '/tools/bat-trach.html',
    '/tools/la-ban-phong-thuy.html',
    '/tools/huong-nha-phong-thuy.html',
    '/tools/boi-bai-tay.html',
    '/tools/cach-cuc.html',
    '/tools/chon-ngay-tot.html',
    '/tools/cua-hang-phong-thuy.html',
    '/tools/dai-van.html',
    '/tools/dat-ten-con.html',
    '/tools/dat-ten-doanh-nghiep.html',
    '/tools/han-nam.html',
    '/tools/hoang-dao.html',
    '/tools/khi-sac-ai.html',
    // ── Trang standalone TỪNG BỊ SÓT khỏi sitemap ────────────────────────
    // Chúng đã tồn tại và có nội dung SEO đầy đủ nhưng chưa bao giờ được nộp,
    // tức phần việc viết trang coi như phí một nửa. `kim-lau.html` CỐ Ý không
    // có ở đây: nó đã 301 về trang trụ `/kim-lau` (đã khai bên dưới) — thêm vào
    // là tự nộp một URL chuyển hướng.
    '/tools/chan-dung-tien-kiep.html',
    '/tools/chan-dung-vo-chong.html',
    '/tools/cong-so.html',
    '/tools/da-lieu-ai.html',
    '/tools/day-con.html',
    '/tools/kieu-toc-ai.html',
    '/tools/ky-mon.html',
    '/tools/mai-hoa.html',
    '/tools/nguoi-khac.html',
    '/tools/nhan-mach.html',
    '/tools/personal-color.html',
    '/tools/trang-diem-ai.html',
    '/tools/trang-phuc-theo-ngay.html',
    // Trang trụ cụm kim lâu (không phải trang tool nữa) — cầu đã xác nhận qua
    // GSC nên để ngang các hub chuyên mục.
    '/kim-lau',
    '/tools/kinh-dich.html',
    '/tools/luc-nham.html',
    '/tools/mau-sac-hop-menh.html',
    '/tools/nap-am.html',
    '/tools/ngay-tot.html',
    '/tools/ngu-hanh-ten.html',
    '/tools/nhan-tuong-ai.html',
    '/tools/oracle.html',
    '/tools/phong-thuy.html',
    '/tools/sao-nam.html',
    '/tools/tarot.html',
    '/tools/than-so-hoc.html',
    '/tools/thanh-tuong-ai.html',
    '/tools/thanh-tuong-pro.html',
    '/tools/thu-tuong-ai.html',
    '/tools/tu-tru.html',
    '/tools/tuong-hop.html',
    '/tools/tuong-mat-ai.html',
    '/tools/van-thang.html',
    '/tools/xem-tuoi-sinh-con.html',
  ];

  const [lasoRows, taiLieuRows, khaoLuanRows, sachRows, seoRows, pregenRows, tuDienRows, masterArticleRows] = await Promise.all([
    fetchAllSlugs('laso_public'),
    fetchAllSlugs('tai_lieu'),
    fetchAllSlugs('khao_luan'),
    fetchAllSlugs('sach_library', true),
    fetchAllSeoPages(),
    fetchAllSlugs('laso_pregen'),
    fetchAllSlugs('tu_dien', true),
    fetchAllSlugs('master_articles'),
  ]);

  const entries: string[] = [];
  for (const p of staticPages) entries.push(urlEntry(BASE_URL + p));
  // laso_public → new static route
  for (const r of lasoRows)     if (r.slug) entries.push(urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  // laso_pregen → static route
  for (const r of pregenRows)   if (r.slug) entries.push(urlEntry(`${BASE_URL}/la-so/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  // tu_dien → static route
  for (const r of tuDienRows)   if (r.slug) entries.push(urlEntry(`${BASE_URL}/tu-dien/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  for (const r of taiLieuRows)  if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  for (const r of sachRows)     if (r.slug) entries.push(urlEntry(`${BASE_URL}/tai-lieu/sach/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  for (const r of khaoLuanRows)      if (r.slug) entries.push(urlEntry(`${BASE_URL}/khao-luan/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  for (const r of masterArticleRows) if (r.slug) entries.push(urlEntry(`${BASE_URL}/nghien-cuu/${encodeURIComponent(r.slug)}`, rowLastmod(r)));
  for (const r of seoRows) {
    if (!r.slug) continue;
    // Category 'van-han' đã được 301 sang họ /van-han/* (bản nội dung dày hơn)
    // — xem `vanHanRedirectTarget` trong app/api/tu-vi/route.ts. Nộp URL chuyển
    // hướng vào sitemap là bắt Google đi một nhịp thừa cho 480 URL, và giữ hai
    // họ cùng tồn tại trong mắt nó đúng lúc mình đang cố gộp lại.
    if (r.category === 'van-han') continue;
    entries.push(urlEntry(`${BASE_URL}/tu-vi/${encodeURIComponent(r.slug)}`, r.created_at));
  }

  // ── Họ /van-han/* — bản CHUẨN sau khi gộp ────────────────────────────────────
  // Trước đây CHỈ có trang hub `/van-han` trong sitemap, còn 576 trang con thì
  // không được nộp — tức bản dày nhất, đúng từ khoá nhất lại là bản Google không
  // được mời vào. Sinh bằng thuật toán (không có bảng): 12 chi × 8 năm cấp 1,
  // 60 can chi × 8 năm cấp 2. Danh sách phải KHỚP `NAM_XEMS` trong
  // app/van-han/[slug]/route.ts — lệch là nộp URL 404.
  //
  // ⚠️ lastmod của họ này lấy từ `CONTENT_REV['van-han']` — hiện `null` nên KHÔNG
  // phát thẻ. Trước đây 576 URL này đóng dấu ngày HÔM NAY mỗi lượt gọi, tức mỗi
  // ngày lại tự khai "vừa sửa" cho trang không hề đổi. Đó chính là kiểu lastmod
  // làm Google thôi tin lastmod của cả site.
  const VH_NAMS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const VH_CHI  = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
  const VH_CAN  = ['giap','at','binh','dinh','mau','ky','canh','tan','nham','quy'];
  const vhRev = revOf('van-han');
  for (const nam of VH_NAMS) {
    for (const chi of VH_CHI) {
      entries.push(urlEntry(`${BASE_URL}/van-han/tuoi-${chi}-nam-${nam}`, vhRev));
    }
    // Cặp can-chi hợp lệ: cùng tính chẵn/lẻ (Giáp Tý có thật, Giáp Sửu không) —
    // đúng 60 tổ hợp của lục thập hoa giáp. Sinh đủ 120 là nộp 60 URL chết.
    for (let i = 0; i < 60; i++) {
      entries.push(
        urlEntry(`${BASE_URL}/van-han/${VH_CAN[i % 10]}-${VH_CHI[i % 12]}-nam-${nam}`, vhRev),
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`,
    },
  });
}
