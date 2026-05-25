// app/ngay-tot/_shared.ts — common HTML helpers cho ngày tốt routes

export const BASE = 'https://www.tuviminhbao.com';
export const YEAR_FROM = 2020;
export const YEAR_TO = 2036;
export const YEARS = Array.from({ length: YEAR_TO - YEAR_FROM + 1 }, (_, i) => YEAR_FROM + i);

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export const CACHE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
};

// Shared CSS for all ngay-tot pages
export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--green:#2E7D32;--red:#C62828;--text:#1a1a1a;--text-lt:#777;--border:#CCC;--border-lt:#E8E8E8;--bg:#fff;--bg-soft:#F5F4F0;--bg-gold:#FFF9E6;--bg-green:#E8F5E9;--bg-red:#FFEBEE}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.6}
a{color:var(--blue);text-decoration:none}
.page{max-width:1100px;margin:0 auto;padding:0 32px 80px}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:9px 32px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;flex-wrap:wrap}
.bc a{color:var(--text-lt)}.bc a:hover{color:var(--navy)}
.bc>span{color:var(--text-lt)}
.hero{padding:40px 0 28px;border-bottom:2px solid var(--navy);margin-bottom:32px}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:10px}
h1{font-size:32px;font-weight:400;color:var(--navy);margin-bottom:8px}
h1 em{font-style:italic;color:var(--gold)}
.hero p{font-size:14px;color:var(--text-lt);max-width:620px}
.sec-title{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--navy);margin:28px 0 14px;padding-bottom:6px;border-bottom:1px solid var(--border-lt)}
.act-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:36px}
.act-card{display:block;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:6px;padding:14px 16px;transition:all .12s}
.act-card:hover{border-color:var(--gold);background:var(--bg-gold);transform:translateY(-1px)}
.act-name{font-size:15px;font-weight:600;color:var(--navy);margin-bottom:4px}
.act-desc{font-size:12px;color:var(--text-lt);line-height:1.4}
.year-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px;margin-bottom:36px}
.year-cell{display:flex;align-items:center;justify-content:center;height:36px;font-size:13px;color:var(--navy);background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:4px;transition:all .1s}
.year-cell:hover{background:var(--blue);color:#fff;border-color:var(--blue)}
.month-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:36px}
.month-cell{display:block;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:6px;padding:12px 14px;color:var(--navy);font-size:14px;transition:all .12s}
.month-cell:hover{border-color:var(--gold);background:var(--bg-gold)}
.month-cell small{display:block;font-size:11px;color:var(--text-lt);margin-top:2px}
.day-card{background:var(--bg-soft);border:1px solid var(--border-lt);border-left:4px solid var(--gold);border-radius:6px;padding:14px 18px;margin-bottom:10px}
.day-card.good{border-left-color:var(--green);background:var(--bg-green)}
.day-card.bad{border-left-color:var(--red);background:var(--bg-red)}
.day-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:6px}
.day-date{font-size:16px;font-weight:600;color:var(--navy)}
.day-date a{color:var(--navy);border-bottom:1px dotted var(--navy)}
.day-score{font-size:13px;font-weight:700;padding:3px 10px;border-radius:12px;background:var(--green);color:#fff}
.day-score.bad{background:var(--red)}
.day-score.mid{background:var(--gold)}
.day-meta{font-size:12px;color:var(--text-lt);margin-bottom:8px}
.day-meta span{margin-right:14px}
.day-reasons{font-size:13px;color:var(--text);margin-top:6px}
.day-reasons strong{color:var(--green)}
.day-warns{font-size:13px;color:var(--text);margin-top:2px}
.day-warns strong{color:var(--red)}
.rel-block{padding:20px 0;border-top:1px solid var(--border-lt);margin-top:20px}
.rel-title{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--text-lt);margin-bottom:10px}
.rel-grid{display:flex;flex-wrap:wrap;gap:8px}
.rel-item{font-size:12px;padding:5px 12px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:4px;color:var(--navy)}
.rel-item:hover{border-color:var(--blue);color:var(--blue)}
.cal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px}
.cal-month{background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:8px;padding:12px}
.cal-month-name{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--navy);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border-lt)}
.cal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.cal-day{display:flex;align-items:center;justify-content:center;height:26px;font-size:12px;color:var(--navy);border-radius:3px;transition:all .1s;border:1px solid transparent}
.cal-day:hover{background:var(--blue);color:#fff;border-color:var(--blue)}
.cal-day.great{background:#2E7D32;color:#fff;font-weight:700}
.cal-day.great:hover{background:#1B5E20}
.cal-day.good{background:#C8E6C9;color:#1B5E20;font-weight:600}
.cal-day.soso{background:#FFE0B2;color:#E65100}
.cal-day.bad{background:#FFCDD2;color:#B71C1C;font-weight:600}
.legend{display:flex;flex-wrap:wrap;gap:14px;margin:-6px 0 14px;font-size:11px;color:var(--text-lt)}
.legend-item{display:inline-flex;align-items:center;gap:6px}
.legend-dot{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid var(--border-lt)}
.legend-dot.great{background:#2E7D32;border-color:#2E7D32}
.legend-dot.good{background:#C8E6C9}
.legend-dot.soso{background:#FFE0B2}
.legend-dot.bad{background:#FFCDD2}
.detail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px}
.detail-card{background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:6px;padding:14px 16px}
.detail-card h3{font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase}
.detail-card .row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px dashed var(--border-lt)}
.detail-card .row:last-child{border:0}
.detail-card .row strong{color:var(--navy)}
.detail-card .pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.detail-card .pill.good{background:var(--bg-green);color:var(--green)}
.detail-card .pill.bad{background:var(--bg-red);color:var(--red)}
.detail-card .pill.mid{background:var(--bg-gold);color:var(--gold)}
.gio-list{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px}
.gio-row{font-size:12px;padding:6px 10px;border-radius:4px;background:#fff;border:1px solid var(--border-lt);display:flex;justify-content:space-between}
.gio-row.hoang{background:var(--bg-green);border-color:#A5D6A7}
.gio-row.hac{background:var(--bg-red);border-color:#EF9A9A;opacity:.7}
.act-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
.act-table td{padding:7px 10px;border-bottom:1px dashed var(--border-lt)}
.act-table td:last-child{text-align:right;font-weight:600}
.bar{display:inline-block;width:80px;height:10px;background:var(--border-lt);border-radius:5px;overflow:hidden;vertical-align:middle;margin-right:6px}
.bar-fill{height:100%;background:linear-gradient(90deg,var(--red) 0%,var(--gold) 50%,var(--green) 100%)}
@media(max-width:700px){.page,.bc{padding-left:14px;padding-right:14px}.cal-grid{grid-template-columns:repeat(2,1fr)}h1{font-size:24px}.gio-list{grid-template-columns:1fr}}
@media(max-width:400px){.cal-grid{grid-template-columns:1fr}}
`;

export interface PageOpts {
  title: string;
  desc: string;
  canonical: string;
  schema: object;
  breadcrumbs: Array<{ name: string; url?: string }>;
  body: string; // raw HTML for .page content
}

export function renderPage(opts: PageOpts): string {
  const bcHTML = opts.breadcrumbs
    .map((b, i) => {
      const sep = i < opts.breadcrumbs.length - 1 ? '<span>›</span>' : '';
      const inner = b.url
        ? `<a href="${esc(b.url)}">${esc(b.name)}</a>`
        : `<span>${esc(b.name)}</span>`;
      return inner + sep;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.desc)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(opts.canonical)}">
<link rel="canonical" href="${esc(opts.canonical)}">
<link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${JSON.stringify(opts.schema)}</script>
<style>${CSS}</style>
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">${bcHTML}</div>
<div class="page">${opts.body}</div>
<script src="/footer.js"></script>
<script src="/nav.js?v=13" defer></script>
</body></html>`;
}

export const ACTIVITY_DISPLAY: Record<string, string> = {
  'cuoi-hoi': 'cưới hỏi',
  'khoi-cong': 'khởi công',
  'khai-truong': 'khai trương',
  'nhap-trach': 'nhập trạch',
  'xuat-hanh': 'xuất hành',
  'cau-tai': 'cầu tài',
  'sinh-con': 'sinh con',
  'an-tang': 'an táng',
  'dao-gieng': 'đào giếng',
  'sua-nha': 'sửa nhà',
};
