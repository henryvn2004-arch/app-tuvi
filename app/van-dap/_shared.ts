// app/van-dap/_shared.ts — dùng chung giữa route.ts, [cat]/route.ts,
// [cat]/trang/[page]/route.ts. Hub Vấn Đáp SSR — thay `public/blog.html`
// (client fetch, AI crawler không thấy được link nào tới 360 bài).
//
// 🔴 Vì sao SSR chứ không phải client fetch như bản cũ: `curl -A
// "GPTBot/1.0" /blog.html` trả 200 nhưng chuỗi "khao-luan/" chỉ xuất hiện
// ĐÚNG 1 lần (nằm trong template literal JS) — GPTBot/PerplexityBot/
// ClaudeBot không chạy JS nên 360 bài không có lấy một liên kết nào cho
// chúng thấy, dù mỗi bài tự nó đã SSR đầy đủ (app/api/khao-luan/route.ts).
import { PUBLISHED_ONLY } from '@/lib/content/publish-filter';
import { ORG_ID } from '@/lib/seo/entity';
import { KHAO_LUAN_CATEGORIES, khaoLuanCategory, khaoLuanCategoryLabel } from '@/lib/content/khao-luan-categories';

export { KHAO_LUAN_CATEGORIES, khaoLuanCategory, khaoLuanCategoryLabel };

export const BASE_URL = 'https://www.tuviminhbao.com';
export const PAGE_SIZE = 30;
/** Số bài xem trước mỗi danh mục ở trang tổng — "Xem tất cả" mới dẫn hết. */
export const PREVIEW_PER_CAT = 6;
/** "Bài mới trong tuần" — số THẬT đếm từ created_at, không phải lượt hỏi mô phỏng. */
export const RECENT_DAYS = 7;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export interface KhaoLuanRow {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  created_at: string;
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Một lượt fetch TOÀN BỘ bài đã đăng — kho hiện ~360 bài (xem
 * `docs/nhat-ky/2026-09.md`), `limit=1000` giữ biên độ an toàn nhiều năm
 * trước khi cần chuyển sang offset/count như `seo_pages` (7.080 dòng, xem
 * `app/api/tu-vi-hub/route.ts`). Cùng cách `public/blog.html` bản cũ đã làm,
 * chỉ khác là chạy phía SERVER nên publish_status lọc được ở đây thay vì im
 * lặng phơi bài draft/hidden ra ngoài (bản client cũ KHÔNG lọc — bài học đã
 * ghi khi rà lại cho hub này).
 */
export async function fetchPublished(): Promise<KhaoLuanRow[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/khao_luan?select=slug,title,excerpt,category,tags,created_at&${PUBLISHED_ONLY}&order=created_at.desc&limit=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as KhaoLuanRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Một danh mục — dataset nhỏ (chục tới trăm dòng), lọc thẳng ở Postgres đủ rẻ. */
export async function fetchByCategory(cat: string): Promise<KhaoLuanRow[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/khao_luan?select=slug,title,excerpt,category,tags,created_at&category=eq.${encodeURIComponent(cat)}&${PUBLISHED_ONLY}&order=created_at.desc&limit=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as KhaoLuanRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Dải số trang quanh trang hiện tại + luôn có trang đầu/cuối — cùng công thức tu-vi-hub. */
export function pageWindow(page: number, totalPages: number): number[] {
  const out = new Set<number>([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) out.add(p);
  return [...out].sort((a, b) => a - b);
}

/** Trang 1 = URL gốc `/van-dap/<cat>` (không có `/trang/1`) — khỏi đẻ hai URL cùng nội dung. */
export function categoryPageUrl(cat: string, page: number): string {
  return page === 1 ? `${BASE_URL}/van-dap/${cat}` : `${BASE_URL}/van-dap/${cat}/trang/${page}`;
}

export function renderCard(a: KhaoLuanRow, opts: { showCat?: boolean } = {}): string {
  const catLabel = opts.showCat ? khaoLuanCategoryLabel(a.category) : '';
  return `<a class="vd-card" href="/khao-luan/${esc(a.slug)}">
    <div class="vd-card-top">${catLabel ? `<span class="vd-card-cat">${esc(catLabel)}</span>` : ''}<span class="vd-card-date">${esc(formatDate(a.created_at))}</span></div>
    <div class="vd-card-title">${esc(a.title)}</div>
    <div class="vd-card-excerpt">${esc(a.excerpt || '')}</div>
  </a>`;
}

export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#0F2A3D;--blue:#1455A4;--gold:#7C6942;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#D8D4CB;--bg:#fff;--bg-soft:#F4F2EC}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
a{color:inherit}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.breadcrumb a{color:var(--text-lt);text-decoration:none}.breadcrumb a:hover{color:var(--navy)}
.breadcrumb span{color:var(--border)}
.vd-hero{background:var(--bg-soft);padding:48px 40px 36px;text-align:center;border-bottom:1px solid var(--border)}
.vd-eyebrow{font-size:11px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;margin-bottom:12px}
.vd-title{font-family:'Noto Serif',serif;font-size:34px;color:var(--navy);font-weight:600;margin-bottom:10px}
.vd-sub{font-size:14px;color:var(--text-mid);max-width:640px;margin:0 auto;line-height:1.7}
.vd-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:22px}
.vd-chip{padding:6px 16px;border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text-mid);text-decoration:none;background:#fff}
.vd-chip:hover,.vd-chip.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.vd-search{max-width:420px;margin:20px auto 0;padding:10px 16px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;width:100%;display:block}
.vd-wrap{max-width:1040px;margin:0 auto;padding:36px 40px 72px;width:100%;flex:1}
.vd-recent{background:var(--gold-lt);border:1px solid #e6d9c0;border-radius:10px;padding:20px 24px;margin-bottom:36px}
.vd-recent-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
.vd-recent-list{display:flex;flex-wrap:wrap;gap:8px 20px}
.vd-recent-list a{font-size:13px;color:var(--navy);text-decoration:none}
.vd-recent-list a:hover{color:var(--blue);text-decoration:underline}
.vd-section{margin-bottom:40px}
.vd-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--border)}
.vd-section-title{font-family:'Noto Serif',serif;font-size:19px;color:var(--navy);font-weight:600}
.vd-section-count{font-size:11px;color:var(--text-lt);background:var(--bg-soft);padding:2px 10px;border-radius:20px;margin-left:8px}
.vd-section-more{font-size:12px;color:var(--blue);text-decoration:none;white-space:nowrap}
.vd-section-more:hover{text-decoration:underline}
.vd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.vd-card{display:block;border:1px solid var(--border);border-radius:8px;padding:16px;text-decoration:none;color:inherit;transition:border-color .12s,box-shadow .12s}
.vd-card:hover{border-color:var(--navy);box-shadow:0 3px 12px rgba(6,26,46,.08)}
.vd-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.vd-card-cat{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold)}
.vd-card-date{font-size:11px;color:var(--text-lt)}
.vd-card-title{font-family:'Noto Serif',serif;font-size:15px;color:var(--navy);font-weight:600;line-height:1.4;margin-bottom:6px}
.vd-card-excerpt{font-size:12.5px;color:var(--text-lt);line-height:1.6}
.vd-method{margin-top:8px;padding:22px 24px;background:var(--navy);border-radius:10px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.vd-method p{font-size:13px;color:#c7d3da;line-height:1.6;max-width:520px}
.vd-method p b{color:#fff}
.vd-method a{flex-shrink:0;background:#C8A96A;color:var(--navy);font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none}
.vd-pager{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:32px}
.vd-pg{display:inline-block;min-width:34px;text-align:center;padding:7px 10px;border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--navy);font-size:13px}
.vd-pg:hover{border-color:var(--gold)}
.vd-pg-cur{background:var(--navy);color:#fff;border-color:var(--navy)}
.vd-empty{text-align:center;padding:60px 20px;color:var(--text-lt);font-size:14px}
@media(max-width:700px){.breadcrumb,.vd-hero,.vd-wrap{padding-left:16px;padding-right:16px}.vd-title{font-size:26px}}
`.trim();

export function renderHead(opts: { title: string; desc: string; url: string; schemas: unknown[] }): string {
  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.desc)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.desc)}">
<meta property="og:url" content="${opts.url}">
<meta property="og:type" content="website">
<meta property="og:image" content="${BASE_URL}/seal.webp">
<meta property="og:site_name" content="Tử Vi Minh Bảo">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${opts.url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="apple-touch-icon" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet"></noscript>
<script type="application/ld+json">${JSON.stringify(opts.schemas)}</script>
<style>${CSS}</style>
<script src="/auth.js" defer></script>`;
}

export function orgPublisher() {
  return { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE_URL };
}

/** Khối "Nghiệm chứng" — neo về /phuong-phap, đặt cuối cả trang tổng lẫn trang cụm. */
export function renderMethodBanner(): string {
  return `<div class="vd-method">
  <p><b>Mỗi câu trả lời trên trang này đối chiếu với dữ liệu cuộc đời thực đã kiểm chứng</b>, không chỉ dựa vào cổ pháp lý thuyết — quy trình Tử Vi Nghiệm Chứng dùng hơn 270.000 hồ sơ từ AstroDataBank và hơn 2.000 quy tắc đã qua thẩm định của 10+ chuyên gia.</p>
  <a href="/phuong-phap">Xem cách hệ thống hoạt động →</a>
</div>`;
}

export function footerScripts(): string {
  return `<script src="/track.js?v=4" defer></script><script src="/nav.js?v=44" defer></script>`;
}

/**
 * Lọc `.vd-card` bằng JS tại chỗ — KHÔNG fetch lại, nội dung đã SSR đầy đủ
 * từ trước. Khác bản `blog.html` cũ (client fetch rồi mới render): ở đây bộ
 * lọc chỉ ẩn/hiện phần tử đã có sẵn trong HTML, nên vô hiệu hoá JS (hoặc bot
 * không chạy JS) vẫn thấy trọn danh sách, chỉ mất mỗi tính năng lọc.
 */
export function searchScript(): string {
  return `<script>
(function(){
  var input = document.getElementById('search-input');
  if(!input) return;
  var empty = document.getElementById('vd-no-match');
  input.addEventListener('input', function(){
    var q = input.value.trim().toLowerCase();
    var totalVisible = 0;
    document.querySelectorAll('.vd-card').forEach(function(card){
      var match = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
      card.style.display = match ? '' : 'none';
      if (match) totalVisible++;
    });
    document.querySelectorAll('.vd-section').forEach(function(sec){
      var any = sec.querySelector('.vd-card:not([style*="display: none"])');
      sec.style.display = any ? '' : 'none';
    });
    if (empty) empty.style.display = totalVisible ? 'none' : 'block';
  });
})();
</script>`;
}

/** Trang danh mục — dùng chung cho page 1 (`[cat]/route.ts`) và page N (`[cat]/trang/[page]/route.ts`). */
export function renderCategoryPage(opts: {
  cat: string;
  page: number;
  rows: KhaoLuanRow[];
}): string {
  const meta = khaoLuanCategory(opts.cat)!;
  const start = (opts.page - 1) * PAGE_SIZE;
  const pageRows = opts.rows.slice(start, start + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(opts.rows.length / PAGE_SIZE));
  const url = categoryPageUrl(opts.cat, opts.page);

  const pagerHtml =
    totalPages > 1
      ? `<nav class="vd-pager" aria-label="Phân trang">
      ${opts.page > 1 ? `<a class="vd-pg" href="${categoryPageUrl(opts.cat, opts.page - 1)}" rel="prev">‹ Trước</a>` : ''}
      ${pageWindow(opts.page, totalPages)
        .map((p) =>
          p === opts.page
            ? `<span class="vd-pg vd-pg-cur">${p}</span>`
            : `<a class="vd-pg" href="${categoryPageUrl(opts.cat, p)}">${p}</a>`,
        )
        .join('')}
      ${opts.page < totalPages ? `<a class="vd-pg" href="${categoryPageUrl(opts.cat, opts.page + 1)}" rel="next">Sau ›</a>` : ''}
    </nav>`
      : '';

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: meta.title,
      description: meta.desc,
      url,
      publisher: orgPublisher(),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: pageRows.map((r, i) => ({
        '@type': 'ListItem',
        position: start + i + 1,
        url: `${BASE_URL}/khao-luan/${r.slug}`,
        name: r.title,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Vấn Đáp', item: `${BASE_URL}/van-dap` },
        { '@type': 'ListItem', position: 3, name: meta.label, item: `${BASE_URL}/van-dap/${opts.cat}` },
      ],
    },
  ];

  return `<!DOCTYPE html><html lang="vi"><head>
${renderHead({ title: `${meta.title} — Tử Vi Minh Bảo`, desc: meta.desc, url, schemas })}
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<div class="breadcrumb"><a href="/">Trang Chủ</a><span>›</span><a href="/van-dap">Vấn Đáp</a><span>›</span><span>${esc(meta.label)}</span></div>
<div class="vd-hero">
  <div class="vd-eyebrow">考論 · Vấn Đáp</div>
  <h1 class="vd-title">${esc(meta.title)}</h1>
  <p class="vd-sub">${esc(meta.desc)}</p>
  ${pageRows.length ? `<input class="vd-search" id="search-input" type="text" placeholder="Tìm trong ${esc(meta.label)}...">` : ''}
</div>
<div class="vd-wrap">
  ${
    pageRows.length
      ? `<div class="vd-grid">${pageRows.map((r) => renderCard(r)).join('')}</div>
  <p id="vd-no-match" class="vd-empty" style="display:none">Không tìm thấy bài phù hợp.</p>`
      : `<p class="vd-empty">Chưa có bài nào ở chủ đề này — đang được biên soạn, quay lại sớm.</p>`
  }
  ${pagerHtml}
  ${renderMethodBanner()}
</div>
${footerScripts()}
${searchScript()}
</body></html>`;
}
