// lib/ngay-tot/pages.ts — bộ dựng HTML các trang `/ngay-tot/**` (vi VÀ /<locale>/ngay-tot/**, W33b).
//
// Trước W33b mỗi route tự dựng chuỗi; nay route chỉ parse tham số rồi gọi hàm ở đây với `ctx` (ngôn ngữ). `vi` phải ra
// BYTE-GIỐNG bản cũ (golden — chỉ thêm thẻ hreflang vào <head>): mọi chữ Việt đi qua `ctx.t/long/term` đều trả nguyên văn ở vi.
// Engine (tuvi-engine/ngay-tot) KHÔNG đổi công thức: nó trả chữ Việt + mã (`reasonsMa`/`warningsMa`), trang dịch tại chỗ vẽ.
import {
  ACTIVITY_LIST,
  ACTIVITY_META,
  HOANG_HAC_SAO,
  LY_DO,
  computeMonth,
  computeNgayTot,
  scoreActivity,
  scoreAllActivities,
  topDaysForActivity,
  type ActivityKey,
  type ActivityScore,
  type LyDoMa,
  type NgayTotInfo,
} from '../../tuvi-engine/dist/ngay-tot/index.js';
import { HREFLANG } from '@/lib/i18n/locales';
import { ORG_ID } from '@/lib/seo/entity';
import type { Ctx } from './dich';
import { BASE, YEARS, daysInMonth, esc, renderPage } from './shared';

/** Kết quả một trang: HTML, hoặc chuyển hướng (đường dẫn tuyệt đối). */
export type Out = { html: string } | { redirect: string };

const VALID_ACT = new Set(ACTIVITY_LIST as readonly string[]);
const CURRENT_YEAR = 2026;

// ── Tên engine → chữ hiển thị (vi trả nguyên) ───────────────────────────────────────────────
const actName = (c: Ctx, k: ActivityKey) => c.long('act.' + k + '.name', ACTIVITY_META[k].name);
const actDesc = (c: Ctx, k: ActivityKey) => c.long('act.' + k + '.desc', ACTIVITY_META[k].desc);
const lower = (s: string) => s.toLowerCase();
const saoTen = (c: Ctx, n: string) => c.long('sao.' + n + '.ten', n);
const saoNghia = (c: Ctx, n: string) =>
  c.long('sao.' + n + '.nghia', HOANG_HAC_SAO.find((s) => s.name === n)?.meaning ?? n);
const thuOf = (c: Ctx, info: NgayTotInfo) =>
  c.long(
    'thu.' + new Date(info.duongLich.year, info.duongLich.month - 1, info.duongLich.day).getDay(),
    info.thuTrongTuan,
  );
const canChi = (c: Ctx, v: string) => c.term('canchi', v);
const chiOf = (c: Ctx, v: string) => c.term('chi', v);
const gioRange = (c: Ctx, chi: string, vi: string) => c.long('gio.' + chi, vi);

const LEVEL_KEY: Record<ActivityScore['level'], string> = {
  'rất tốt': 'level.rat-tot',
  'tốt': 'level.tot',
  'bình thường': 'level.binh-thuong',
  'xấu': 'level.xau',
  'rất xấu': 'level.rat-xau',
};
const levelOf = (c: Ctx, l: ActivityScore['level']) =>
  c.t(LEVEL_KEY[l] as 'level.tot');
const tinhChat = (c: Ctx, v: 'cát' | 'hung' | 'bình') =>
  c.t(v === 'cát' ? 'tc.cat' : v === 'hung' ? 'tc.hung' : 'tc.binh');
const danhGia = (c: Ctx, v: 'tốt' | 'xấu' | 'bình') =>
  c.t(v === 'tốt' ? 'dg.tot' : v === 'xấu' ? 'dg.xau' : 'dg.binh');
const hdWord = (c: Ctx, hoang: boolean) => c.t(hoang ? 'hd.hoang' : 'hd.hac');

/** Một dòng lý do/cảnh báo: vi = chữ engine dựng nguyên văn; ≠vi = khuôn đã dịch + biến đã dịch từng mảnh. */
function lyDo(c: Ctx, ma: LyDoMa | undefined, viText: string): string {
  if (c.locale === 'vi' || !ma) return viText;
  const v = ma.v ?? {};
  const bien: Record<string, string> = {};
  if (v.truc) bien.truc = c.term('truc', v.truc);
  if (v.viec) bien.viec = lower(actName(c, v.viec as ActivityKey));
  if (v.sao) {
    bien.sao = saoTen(c, v.sao);
    bien.y = saoNghia(c, v.sao);
  }
  if (v.tu) bien.tu = c.term('tu', v.tu);
  if (v.ngay) bien.ngay = v.ngay;
  return c.long('ly.' + ma.k, LY_DO[ma.k], bien);
}
/** Nối danh sách bằng khuôn `join.*` (dấu nối khác nhau theo chữ viết: ', ' · '、' · '；'). */
const noi = (c: Ctx, items: string[], k: 'join.list' | 'join.ly') =>
  items.length ? items.reduce((a, b) => c.t(k, { a, b })) : '';
const lyDoList = (c: Ctx, texts: string[], mas: LyDoMa[]) =>
  noi(c, texts.map((t, i) => lyDo(c, mas[i], t)), 'join.ly');

function kyNames(c: Ctx, info: NgayTotInfo): string[] {
  const out: string[] = [];
  if (info.kyTamNuong) out.push(c.t('ky.tamnuong'));
  if (info.kyNguyetKy) out.push(c.t('ky.nguyetky'));
  if (info.kyDuongCong) out.push(c.t('ky.duongcong'));
  return out;
}

const orgName = (c: Ctx) => c.t('brand');
const publisher = (c: Ctx) => ({ '@type': 'Organization', '@id': ORG_ID, name: orgName(c), url: BASE });
const home = (c: Ctx) => c.pre || '/';
const lang = (c: Ctx) => HREFLANG[c.locale];
const rootUrl = (c: Ctx) => `${BASE}${c.pre}/ngay-tot`;
const root = (c: Ctx) => c.href('/ngay-tot');

/** Tiêu đề + mô tả meta; `brand` đã nằm trong khuôn. */
const brandVars = (c: Ctx) => ({ brand: orgName(c) });

// ── /ngay-tot ───────────────────────────────────────────────────────────────────────────────
export function pageHub(c: Ctx): Out {
  const title = c.t('hub.title', brandVars(c));
  const desc = c.t('hub.desc');
  const url = `${BASE}${c.pre}/ngay-tot`;

  const actGrid = ACTIVITY_LIST.map((key) => {
    return `<a href="${root(c)}/${key}" class="act-card">
      <div class="act-name">${esc(actName(c, key))}</div>
      <div class="act-desc">${esc(actDesc(c, key))}</div>
    </a>`;
  }).join('');

  const yearGrid = YEARS.map(
    (y) => `<a href="${root(c)}/lich/${y}" class="year-cell">${y}</a>`,
  ).join('');

  // /xem-ngay-hom-nay chỉ có tiếng Việt (Henry chốt 2026-11-13) — ẩn ở bản ngoại ngữ thay vì dẫn sang trang Việt.
  const today =
    c.locale === 'vi'
      ? `\n      <p style="margin-top:10px"><a href="/xem-ngay-hom-nay" class="rel-item">Xem ngày hôm nay — hoàng lịch đầy đủ: thần sát, cửu tinh, Bành Tổ →</a></p>`
      : '';

  const body = `
    <div class="hero">
      <div class="eyebrow">${c.t('hub.eyebrow')}</div>
      <h1>${c.t('hub.h1')}</h1>
      <p>${c.t('hub.p')}</p>${today}
    </div>
    <h2 class="sec-title">${c.t('hub.sec-viec')}</h2>
    <div class="act-grid">${actGrid}</div>
    <h2 class="sec-title">${c.t('hub.sec-nam')}</h2>
    <div class="year-grid">${yearGrid}</div>
  `;

  return {
    html: renderPage({
      ctx: c,
      title,
      desc,
      path: '/ngay-tot',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url,
        inLanguage: lang(c),
        publisher: publisher(c),
      },
      breadcrumbs: [{ name: c.t('home'), url: home(c) }, { name: c.t('bc.root') }],
      body,
    }),
  };
}

// ── /ngay-tot/<việc> ────────────────────────────────────────────────────────────────────────
// Đếm ngày tốt/xấu cho activity trong (year, month)
function monthStats(year: number, month: number, act: ActivityKey) {
  const days = computeMonth(year, month);
  let good = 0,
    bad = 0;
  for (const info of days) {
    const s = scoreActivity(info, act).score;
    if (s >= 7) good++;
    else if (s <= 3) bad++;
  }
  return { good, bad, total: days.length };
}

export function pageActivity(c: Ctx, activity: string): Out {
  if (!VALID_ACT.has(activity)) return { redirect: rootUrl(c) };

  const key = activity as ActivityKey;
  const name = actName(c, key);
  const mota = actDesc(c, key);

  const title = c.t('act.title', { viec: name, ...brandVars(c) });
  const desc = c.t('act.desc', { viecl: lower(name), mota });
  const url = `${BASE}${c.pre}/ngay-tot/${activity}`;

  // Ưu tiên năm hiện tại + 1 năm sau ở đầu
  const orderedYears = [
    CURRENT_YEAR,
    CURRENT_YEAR + 1,
    ...YEARS.filter((y) => y !== CURRENT_YEAR && y !== CURRENT_YEAR + 1),
  ];

  const cards = orderedYears
    .map((y) => {
      const monthsHTML = Array.from({ length: 12 }, (_, mi) => {
        const m = mi + 1;
        const { good, bad, total } = monthStats(y, m, key);
        // Tier theo số ngày score ≥ 7 (tốt) / score ≤ 3 (xấu, kể cả hard-block kỵ)
        let cls = '';
        if (good >= 8) cls = 'great'; // tháng nhiều ngày đẹp
        else if (good >= 4) cls = 'good';
        else if (bad >= 18) cls = 'bad'; // gần như cả tháng kỵ
        else if (bad >= 12) cls = 'soso';
        const tooltip = c.t('act.tip', { m, y, good, bad, total });
        return `<a href="${root(c)}/${activity}/${y}/thang-${m}" class="cal-day ${cls}" title="${esc(tooltip)}">${c.t('act.mlabel', { m })}</a>`;
      }).join('');
      return `<div class="cal-month">
      <div class="cal-month-name">${c.t('y.label', { y })}</div>
      <div class="cal-days" style="grid-template-columns:repeat(6,1fr)">${monthsHTML}</div>
    </div>`;
    })
    .join('');

  // Cross-links to other activities
  const otherActs = ACTIVITY_LIST.filter((a) => a !== key)
    .map((a) => `<a href="${root(c)}/${a}" class="rel-item">${esc(actName(c, a))}</a>`)
    .join('');

  const body = `
    <div class="hero">
      <div class="eyebrow">${c.t('act.eyebrow', { viec: esc(name) })}</div>
      <h1>${c.t('act.h1', { viec: esc(name) })}</h1>
      <p>${c.t('act.p', { mota: esc(mota) })}</p>
    </div>
    <h2 class="sec-title">${c.t('act.sec')}</h2>
    <div class="legend">
      <span class="legend-item"><span class="legend-dot great"></span>${c.t('act.lg-great')}</span>
      <span class="legend-item"><span class="legend-dot good"></span>${c.t('act.lg-good')}</span>
      <span class="legend-item"><span class="legend-dot soso"></span>${c.t('act.lg-soso')}</span>
      <span class="legend-item"><span class="legend-dot bad"></span>${c.t('act.lg-bad')}</span>
    </div>
    <div class="cal-grid">${cards}</div>
    <div class="rel-block">
      <div class="rel-title">${c.t('act.rel')}</div>
      <div class="rel-grid">${otherActs}</div>
    </div>
  `;

  return {
    html: renderPage({
      ctx: c,
      title,
      desc,
      path: `/ngay-tot/${activity}`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url,
        inLanguage: lang(c),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: c.t('home'), item: BASE },
            { '@type': 'ListItem', position: 2, name: c.t('bc.root'), item: rootUrl(c) },
            { '@type': 'ListItem', position: 3, name, item: url },
          ],
        },
      },
      breadcrumbs: [
        { name: c.t('home'), url: home(c) },
        { name: c.t('bc.root'), url: root(c) },
        { name },
      ],
      body,
    }),
  };
}

// ── /ngay-tot/lich/<năm> ────────────────────────────────────────────────────────────────────
export function pageLichYear(c: Ctx, yearStr: string): Out {
  const year = parseInt(yearStr);
  if (!YEARS.includes(year)) return { redirect: rootUrl(c) };

  const title = c.t('lichy.title', { y: year, ...brandVars(c) });
  const desc = c.t('lichy.desc', { y: year });
  const url = `${BASE}${c.pre}/ngay-tot/lich/${year}`;

  const monthGrid = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return `<a href="${root(c)}/lich/${year}/thang-${m}" class="month-cell">
      ${esc(c.t('m.cap', { m }))} · ${year}
      <small>${c.t('lichy.cell', { m })}</small>
    </a>`;
  }).join('');

  const relYears = YEARS.filter((y) => y !== year && Math.abs(y - year) <= 6)
    .map((y) => `<a href="${root(c)}/lich/${y}" class="rel-item">${c.t('y.label', { y })}</a>`)
    .join('');

  const body = `
    <div class="hero">
      <div class="eyebrow">${c.t('lichy.eyebrow', { y: year })}</div>
      <h1>${c.t('lichy.h1', { y: year })}</h1>
      <p>${c.t('lichy.p')}</p>
    </div>
    <h2 class="sec-title">${c.t('lichy.sec', { y: year })}</h2>
    <div class="month-grid">${monthGrid}</div>
    <div class="rel-block">
      <div class="rel-title">${c.t('lichy.rel')}</div>
      <div class="rel-grid">${relYears}</div>
    </div>
  `;

  return {
    html: renderPage({
      ctx: c,
      title,
      desc,
      path: `/ngay-tot/lich/${year}`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url,
        inLanguage: lang(c),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: c.t('home'), item: BASE },
            { '@type': 'ListItem', position: 2, name: c.t('bc.root'), item: rootUrl(c) },
            { '@type': 'ListItem', position: 3, name: c.t('y.label', { y: year }), item: url },
          ],
        },
      },
      breadcrumbs: [
        { name: c.t('home'), url: home(c) },
        { name: c.t('bc.root'), url: root(c) },
        { name: c.t('y.label', { y: year }) },
      ],
      body,
    }),
  };
}

// ── /ngay-tot/lich/<năm>/thang-<m> ──────────────────────────────────────────────────────────
export function pageLichMonth(c: Ctx, yearStr: string, monthSlug: string): Out {
  const year = parseInt(yearStr);
  // Segment có thể là "thang-5" hoặc "5" — strip prefix
  const month = parseInt(monthSlug.replace(/^thang-/, ''));
  if (!YEARS.includes(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { redirect: rootUrl(c) };
  }
  // Canonical: ép URL có dạng /lich/{year}/thang-{m}
  if (!monthSlug.startsWith('thang-')) {
    return { redirect: `${rootUrl(c)}/lich/${year}/thang-${month}` };
  }

  const title = c.t('lichm.title', { m: month, y: year, ...brandVars(c) });
  const desc = c.t('lichm.desc', { m: month, y: year });
  const url = `${BASE}${c.pre}/ngay-tot/lich/${year}/thang-${month}`;
  const monthLabel = c.t('m.my', { m: month, y: year });

  // Compute all days
  const days = computeMonth(year, month);

  // Day cards (compact: hiện ngày + tốt/xấu chính)
  const dayCards = days
    .map((info) => {
      const cls = info.overallTinhChat === 'tốt' ? 'good' : info.overallTinhChat === 'xấu' ? 'bad' : '';
      const kyList = kyNames(c, info);

      // Top 3 activities cho ngày này
      const scores = scoreAllActivities(info)
        .filter((s) => s.score >= 7)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      const topGood = scores.length
        ? noi(c, scores.map((s) => esc(actName(c, s.activity))), 'join.list')
        : '—';

      const dayUrl = `${root(c)}/ngay/${year}/${month}/${info.duongLich.day}`;
      return `<div class="day-card ${cls}">
      <div class="day-head">
        <div class="day-date">
          <a href="${esc(dayUrl)}">${c.t('date.full', { thu: thuOf(c, info), d: info.duongLich.day, m: info.duongLich.month, y: info.duongLich.year })}</a>
          <small style="font-weight:400;color:var(--text-lt);margin-left:8px">${c.t('date.al', { d: info.amLich.day, m: info.amLich.month })}</small>
        </div>
        <span class="day-score ${info.overallTinhChat === 'tốt' ? '' : info.overallTinhChat === 'xấu' ? 'bad' : 'mid'}">${danhGia(c, info.overallTinhChat).toUpperCase()}</span>
      </div>
      <div class="day-meta">
        <span>${c.t('meta.canchi', { v: esc(canChi(c, info.canChiNgay)) })}</span>
        <span>${c.t('meta.truc', { v: esc(c.term('truc', info.truc)) })}</span>
        <span>${c.t('meta.sao', { sao: esc(saoTen(c, info.saoNgay)), hd: hdWord(c, info.hoangDao) })}</span>
        <span>${c.t('meta.tu', { v: esc(c.term('tu', info.tu)) })}</span>
        ${kyList.length ? `<span style="color:var(--red)">${c.t('meta.ky', { v: esc(noi(c, kyList, 'join.list')) })}</span>` : ''}
      </div>
      <div class="day-reasons">${c.t('meta.totcho', { v: topGood })}</div>
    </div>`;
    })
    .join('');

  // Activity quick links cho tháng này
  const actLinks = ACTIVITY_LIST.map(
    (a) =>
      `<a href="${root(c)}/${a}/${year}/thang-${month}" class="rel-item">${c.t('lichm.actlink', { viec: esc(actName(c, a)), m: month })}</a>`,
  ).join('');

  // Related months
  const prevM = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextM = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const navMonths: string[] = [];
  if (YEARS.includes(prevM.y))
    navMonths.push(
      `<a href="${root(c)}/lich/${prevM.y}/thang-${prevM.m}" class="rel-item">← ${c.t('m.my', { m: prevM.m, y: prevM.y })}</a>`,
    );
  if (YEARS.includes(nextM.y))
    navMonths.push(
      `<a href="${root(c)}/lich/${nextM.y}/thang-${nextM.m}" class="rel-item">${c.t('m.my', { m: nextM.m, y: nextM.y })} →</a>`,
    );
  navMonths.push(
    `<a href="${root(c)}/lich/${year}" class="rel-item">${c.t('lichm.toan-nam', { y: year })}</a>`,
  );

  const body = `
    <div class="hero">
      <div class="eyebrow">${c.t('lichm.eyebrow', { m: month, y: year })}</div>
      <h1>${c.t('lichm.h1', { m: month, y: year })}</h1>
      <p>${c.t('lichm.p', { n: days.length, m: month, y: year })}</p>
    </div>
    <h2 class="sec-title">${c.t('lichm.sec-nhanh')}</h2>
    <div class="rel-grid" style="margin-bottom:20px">${actLinks}</div>
    <h2 class="sec-title">${c.t('lichm.sec-ngay', { n: days.length, m: month, y: year })}</h2>
    ${dayCards}
    <div class="rel-block">
      <div class="rel-title">${c.t('lichm.rel')}</div>
      <div class="rel-grid">${navMonths.join('')}</div>
    </div>
  `;

  return {
    html: renderPage({
      ctx: c,
      title,
      desc,
      path: `/ngay-tot/lich/${year}/thang-${month}`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url,
        inLanguage: lang(c),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: c.t('home'), item: BASE },
            { '@type': 'ListItem', position: 2, name: c.t('bc.root'), item: rootUrl(c) },
            {
              '@type': 'ListItem',
              position: 3,
              name: c.t('y.label', { y: year }),
              item: `${rootUrl(c)}/lich/${year}`,
            },
            { '@type': 'ListItem', position: 4, name: monthLabel, item: url },
          ],
        },
      },
      breadcrumbs: [
        { name: c.t('home'), url: home(c) },
        { name: c.t('bc.root'), url: root(c) },
        { name: c.t('y.label', { y: year }), url: `${root(c)}/lich/${year}` },
        { name: monthLabel },
      ],
      body,
    }),
  };
}

// ── /ngay-tot/<việc>/<năm>/thang-<m> ────────────────────────────────────────────────────────
export function pageActivityMonth(c: Ctx, activity: string, yearStr: string, monthSlug: string): Out {
  const year = parseInt(yearStr);
  const month = parseInt(monthSlug.replace(/^thang-/, ''));
  if (!VALID_ACT.has(activity) || !YEARS.includes(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { redirect: rootUrl(c) };
  }
  if (!monthSlug.startsWith('thang-')) {
    return { redirect: `${rootUrl(c)}/${activity}/${year}/thang-${month}` };
  }

  const key = activity as ActivityKey;
  const name = actName(c, key);
  const mota = actDesc(c, key);
  const monthLabel = c.t('m.my', { m: month, y: year });

  // seoTitle của engine là khuôn `…tháng ${m}/${y}…` — khuôn dịch cùng khoá (`act.<việc>.seo`).
  const seo = c.long('act.' + key + '.seo', ACTIVITY_META[key].seoTitle(year, month), { m: month, y: year });
  const title = c.t('actm.title', { seo, ...brandVars(c) });
  const desc = c.t('actm.desc', { mota, m: month, y: year });
  const url = `${BASE}${c.pre}/ngay-tot/${activity}/${year}/thang-${month}`;

  // Compute + lọc top ngày
  const days = computeMonth(year, month);
  const top = topDaysForActivity(days, key, 15);

  // Best days cards
  let topHTML = '';
  if (top.length === 0) {
    topHTML = `<div class="day-card bad">
      <div class="day-head"><div class="day-date">${c.t('actm.none-h')}</div></div>
      <div class="day-reasons">${c.t('actm.none-p', { m: month, y: year, viecl: esc(lower(name)) })}</div>
    </div>`;
  } else {
    topHTML = top
      .map(({ info, score }) => {
        const cls = score.score >= 8 ? 'good' : score.score >= 6 ? '' : 'bad';
        const scoreClass = score.score >= 8 ? '' : score.score >= 6 ? 'mid' : 'bad';
        const kyList = kyNames(c, info);

        const goodGio = noi(
          c,
          info.gioHoangDao.map((g) => `${chiOf(c, g.chi)} (${gioRange(c, g.chi, g.range)})`),
          'join.list',
        );
        const dayUrl = `${root(c)}/ngay/${year}/${month}/${info.duongLich.day}`;

        return `<div class="day-card ${cls}">
        <div class="day-head">
          <div class="day-date">
            <a href="${esc(dayUrl)}">${c.t('date.full', { thu: thuOf(c, info), d: info.duongLich.day, m: info.duongLich.month, y: info.duongLich.year })}</a>
            <small style="font-weight:400;color:var(--text-lt);margin-left:8px">${c.t('date.al', { d: info.amLich.day, m: info.amLich.month })}</small>
          </div>
          <span class="day-score ${scoreClass}">${c.t('actm.score', { score: score.score, level: esc(levelOf(c, score.level)) })}</span>
        </div>
        <div class="day-meta">
          <span>${c.t('meta.canchi', { v: esc(canChi(c, info.canChiNgay)) })}</span>
          <span>${c.t('meta.truc', { v: esc(c.term('truc', info.truc)) })}</span>
          <span>${c.t('meta.sao', { sao: esc(saoTen(c, info.saoNgay)), hd: hdWord(c, info.hoangDao) })}</span>
          <span>${c.t('meta.tu', { v: esc(c.term('tu', info.tu)) })}</span>
          ${kyList.length ? `<span style="color:var(--red)">${c.t('meta.ky', { v: esc(noi(c, kyList, 'join.list')) })}</span>` : ''}
        </div>
        ${score.reasons.length ? `<div class="day-reasons">${c.t('meta.lydo', { v: esc(lyDoList(c, score.reasons, score.reasonsMa)) })}</div>` : ''}
        ${score.warnings.length ? `<div class="day-warns">${c.t('meta.luuy', { v: esc(lyDoList(c, score.warnings, score.warningsMa)) })}</div>` : ''}
        <div class="day-reasons">${c.t('meta.giohd', { v: esc(goodGio) })}</div>
      </div>`;
      })
      .join('');
  }

  // Other activities for this month
  const otherActs = ACTIVITY_LIST.filter((a) => a !== key)
    .map(
      (a) =>
        `<a href="${root(c)}/${a}/${year}/thang-${month}" class="rel-item">${c.t('actm.link-viec', { viec: esc(actName(c, a)), m: month, y: year })}</a>`,
    )
    .join('');

  // Other months for this activity
  const otherMonths: string[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    if (offset === 0) continue;
    let m2 = month + offset;
    let y2 = year;
    while (m2 < 1) {
      m2 += 12;
      y2--;
    }
    while (m2 > 12) {
      m2 -= 12;
      y2++;
    }
    if (YEARS.includes(y2)) {
      otherMonths.push(
        `<a href="${root(c)}/${activity}/${y2}/thang-${m2}" class="rel-item">${c.t('m.my', { m: m2, y: y2 })}</a>`,
      );
    }
  }
  otherMonths.push(`<a href="${root(c)}/${activity}" class="rel-item">${c.t('actm.all-years')}</a>`);

  const intro = `<p style="margin-bottom:18px">${c.t('actm.intro', { n: top.length, m: month, y: year, viecl: esc(lower(name)) })}</p>`;

  const body = `
    <div class="hero">
      <div class="eyebrow">${c.t('actm.eyebrow', { viec: esc(name) })}</div>
      <h1>${c.t('actm.h1', { viec: esc(name), m: month, y: year })}</h1>
      <p>${c.t('actm.p', { mota: esc(mota), m: month, y: year })}</p>
    </div>
    ${intro}
    <h2 class="sec-title">${c.t('actm.sec', { viecl: esc(lower(name)), m: month, y: year })}</h2>
    ${topHTML}
    <div class="rel-block">
      <div class="rel-title">${c.t('actm.rel-thang', { viec: esc(name) })}</div>
      <div class="rel-grid">${otherMonths.join('')}</div>
    </div>
    <div class="rel-block">
      <div class="rel-title">${c.t('actm.rel-viec', { m: month, y: year })}</div>
      <div class="rel-grid">${otherActs}</div>
    </div>
  `;

  return {
    html: renderPage({
      ctx: c,
      title,
      desc,
      path: `/ngay-tot/${activity}/${year}/thang-${month}`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url,
        inLanguage: lang(c),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: c.t('home'), item: BASE },
            { '@type': 'ListItem', position: 2, name: c.t('bc.root'), item: rootUrl(c) },
            { '@type': 'ListItem', position: 3, name, item: `${rootUrl(c)}/${activity}` },
            { '@type': 'ListItem', position: 4, name: monthLabel, item: url },
          ],
        },
      },
      breadcrumbs: [
        { name: c.t('home'), url: home(c) },
        { name: c.t('bc.root'), url: root(c) },
        { name, url: `${root(c)}/${activity}` },
        { name: monthLabel },
      ],
      body,
    }),
  };
}

// ── /ngay-tot/ngay/<năm>/<m>/<d> ────────────────────────────────────────────────────────────
export function pageDay(c: Ctx, yearStr: string, monthStr: string, dayStr: string): Out {
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);
  if (!YEARS.includes(year) || month < 1 || month > 12 || day < 1 || day > daysInMonth(month, year)) {
    return { redirect: rootUrl(c) };
  }

  const info = computeNgayTot(day, month, year);
  const scores = scoreAllActivities(info);

  const thu = thuOf(c, info);
  const canchi = canChi(c, info.canChiNgay);
  const title = c.t('day.title', { d: day, m: month, y: year, thu, canchi: esc(canchi) });
  const desc = c.t('day.desc', {
    d: day,
    m: month,
    y: year,
    ad: info.amLich.day,
    am: info.amLich.month,
    canchi: esc(canchi),
    truc: esc(c.term('truc', info.truc)),
    sao: esc(saoTen(c, info.saoNgay)),
    tu: esc(c.term('tu', info.tu)),
  });
  const url = `${BASE}${c.pre}/ngay-tot/ngay/${year}/${month}/${day}`;

  const kyList = kyNames(c, info);
  const khong = `<span class="pill good">${c.t('day.khong')}</span>`;

  // Card 1: tổng quan
  const cardOverall = `<div class="detail-card">
    <h3>${c.t('day.c-tongquan')}</h3>
    <div class="row"><span>${c.t('day.r-duong')}</span><strong>${c.t('date.dmy', { d: info.duongLich.day, m: info.duongLich.month, y: info.duongLich.year })}</strong></div>
    <div class="row"><span>${c.t('day.r-am')}</span><strong>${c.t('date.dmy', { d: info.amLich.day, m: info.amLich.month, y: info.amLich.year })}${info.amLich.isLeap ? ' ' + c.t('day.nhuan') : ''}</strong></div>
    <div class="row"><span>${c.t('day.r-thu')}</span><strong>${thu}</strong></div>
    <div class="row"><span>${c.t('day.r-canchi')}</span><strong>${esc(canchi)}</strong></div>
    <div class="row"><span>${c.t('day.r-chithang')}</span><strong>${esc(chiOf(c, info.chiThang))}</strong></div>
    <div class="row"><span>${c.t('day.r-chung')}</span>
      <span class="pill ${info.overallTinhChat === 'tốt' ? 'good' : info.overallTinhChat === 'xấu' ? 'bad' : 'mid'}">${danhGia(c, info.overallTinhChat).toUpperCase()}</span>
    </div>
  </div>`;

  // Card 2: trực + sao + tú
  const cardStars = `<div class="detail-card">
    <h3>${c.t('day.c-sao')}</h3>
    <div class="row"><span>${c.t('day.r-truc')}</span>
      <strong>${esc(c.term('truc', info.truc))} <span class="pill ${info.trucTinhChat === 'cát' ? 'good' : info.trucTinhChat === 'hung' ? 'bad' : 'mid'}">${esc(tinhChat(c, info.trucTinhChat))}</span></strong>
    </div>
    <div class="row"><span>${c.t('day.r-saongay')}</span>
      <strong>${esc(saoTen(c, info.saoNgay))} <span class="pill ${info.hoangDao ? 'good' : 'bad'}">${hdWord(c, info.hoangDao)}</span></strong>
    </div>
    <div class="row" style="display:block">
      <span style="display:block;margin-bottom:4px">${c.t('day.r-ynghia')}</span>
      <strong style="font-weight:400;font-size:13px;color:var(--text-lt)">${esc(saoNghia(c, info.saoNgay))}</strong>
    </div>
    <div class="row"><span>${c.t('day.r-tu')}</span>
      <strong>${esc(c.term('tu', info.tu))} <span class="pill ${info.tuTinhChat === 'cát' ? 'good' : 'bad'}">${esc(tinhChat(c, info.tuTinhChat))}</span></strong>
    </div>
  </div>`;

  // Card 3: cấm kỵ
  const cardKy = `<div class="detail-card">
    <h3>${c.t('day.c-ky')}</h3>
    <div class="row"><span>${c.t('ky.tamnuong')}</span>
      <strong>${info.kyTamNuong ? `<span class="pill bad">${c.t('day.co-ky')}</span>` : khong}</strong>
    </div>
    <div class="row"><span>${c.t('ky.nguyetky')}</span>
      <strong>${info.kyNguyetKy ? `<span class="pill bad">${c.t('day.co-ky')}</span>` : khong}</strong>
    </div>
    <div class="row"><span>${c.t('day.r-duongcong')}</span>
      <strong>${info.kyDuongCong ? `<span class="pill bad">${c.t('day.co-daiky')}</span>` : khong}</strong>
    </div>
  </div>`;

  // Card 4: giờ hoàng đạo
  const gioRows = info.gio
    .map(
      (g) =>
        `<div class="gio-row ${g.hoangDao ? 'hoang' : 'hac'}">
      <span><strong>${esc(chiOf(c, g.chi))}</strong> ${esc(gioRange(c, g.chi, g.range))}</span>
      <span>${esc(saoTen(c, g.sao))}</span>
    </div>`,
    )
    .join('');
  const cardGio = `<div class="detail-card" style="grid-column:1/-1">
    <h3>${c.t('day.c-gio')}</h3>
    <div class="gio-list">${gioRows}</div>
  </div>`;

  // Card 5: 10 activity scores
  const actRows = scores
    .sort((a, b) => b.score - a.score)
    .map((s) => {
      const pct = s.score * 10;
      const color = s.score >= 8 ? 'var(--green)' : s.score >= 5 ? 'var(--gold)' : 'var(--red)';
      return `<tr>
        <td><a href="${root(c)}/${s.activity}/${year}/thang-${month}">${esc(actName(c, s.activity))}</a></td>
        <td>
          <span class="bar"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>
          ${s.score}/10 <span style="color:var(--text-lt);font-weight:400">(${esc(levelOf(c, s.level))})</span>
        </td>
      </tr>`;
    })
    .join('');
  const cardActs = `<div class="detail-card" style="grid-column:1/-1">
    <h3>${c.t('day.c-viec')}</h3>
    <table class="act-table">${actRows}</table>
  </div>`;

  // Detailed reasons for top 3 activities
  const top3 = scores.slice(0, 3);
  const detailReasons = top3
    .map((s) => {
      return `<div style="margin-bottom:14px">
      <strong style="color:var(--navy)">${esc(c.t('day.top-head', { viec: actName(c, s.activity), score: s.score, level: levelOf(c, s.level) }))}</strong>
      ${s.reasons.length ? `<div class="day-reasons" style="margin-top:4px">${c.t('day.tot', { v: esc(lyDoList(c, s.reasons, s.reasonsMa)) })}</div>` : ''}
      ${s.warnings.length ? `<div class="day-warns" style="margin-top:2px">${c.t('day.luuy', { v: esc(lyDoList(c, s.warnings, s.warningsMa)) })}</div>` : ''}
    </div>`;
    })
    .join('');

  // Related: ngày trước/sau, tháng
  const total = daysInMonth(month, year);
  const navRel: string[] = [];
  if (day > 1)
    navRel.push(
      `<a href="${root(c)}/ngay/${year}/${month}/${day - 1}" class="rel-item">${c.t('day.prev', { d: day - 1, m: month })}</a>`,
    );
  if (day < total)
    navRel.push(
      `<a href="${root(c)}/ngay/${year}/${month}/${day + 1}" class="rel-item">${c.t('day.next', { d: day + 1, m: month })}</a>`,
    );
  navRel.push(
    `<a href="${root(c)}/lich/${year}/thang-${month}" class="rel-item">${c.t('day.toan-thang', { m: month, y: year })}</a>`,
  );

  const body = `
    <div class="hero">
      <div class="eyebrow">${c.t('day.eyebrow', { thu: esc(thu), canchi: esc(canchi) })}</div>
      <h1>${c.t('day.h1', { d: day, m: month, y: year })}</h1>
      <p>${c.t('day.p', { d: day, m: month, y: year, ad: info.amLich.day, am: info.amLich.month, ay: info.amLich.year })}</p>
    </div>
    <div class="detail-grid">${cardOverall}${cardStars}${cardKy}${cardGio}${cardActs}</div>
    ${top3.length ? `<h2 class="sec-title">${c.t('day.sec-top3')}</h2><div>${detailReasons}</div>` : ''}
    ${kyList.length ? `<div class="day-card bad">${c.t('day.canhbao', { v: esc(noi(c, kyList, 'join.list')) })}</div>` : ''}
    <div class="rel-block">
      <div class="rel-title">${c.t('rel.other-days')}</div>
      <div class="rel-grid">${navRel.join('')}</div>
    </div>
  `;

  const dayLabel = c.t('date.dmy', { d: day, m: month, y: year });
  return {
    html: renderPage({
      ctx: c,
      title,
      desc,
      path: `/ngay-tot/ngay/${year}/${month}/${day}`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: desc,
        datePublished: new Date(year, month - 1, day).toISOString(),
        url,
        inLanguage: lang(c),
        publisher: publisher(c),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: c.t('home'), item: BASE },
            { '@type': 'ListItem', position: 2, name: c.t('bc.root'), item: rootUrl(c) },
            {
              '@type': 'ListItem',
              position: 3,
              name: c.t('y.label', { y: year }),
              item: `${rootUrl(c)}/lich/${year}`,
            },
            { '@type': 'ListItem', position: 4, name: dayLabel, item: url },
          ],
        },
      },
      breadcrumbs: [
        { name: c.t('home'), url: home(c) },
        { name: c.t('bc.root'), url: root(c) },
        { name: c.t('y.label', { y: year }), url: `${root(c)}/lich/${year}` },
        { name: dayLabel },
      ],
      body,
    }),
  };
}

/** Điều phối theo mảng đoạn đường dẫn SAU `/ngay-tot` — dùng cho route /<locale>/ngay-tot/**. */
export function dispatch(c: Ctx, seg: string[]): Out | null {
  const n = seg.length;
  if (n === 0) return pageHub(c);
  if (n === 1) return pageActivity(c, seg[0]!); // việc lạ ⇒ redirect của chính hàm
  if (seg[0] === 'lich' && n === 2) return pageLichYear(c, seg[1]!);
  if (seg[0] === 'lich' && n === 3) return pageLichMonth(c, seg[1]!, seg[2]!);
  if (seg[0] === 'ngay' && n === 4) return pageDay(c, seg[1]!, seg[2]!, seg[3]!);
  if (n === 3 && seg[0] !== 'lich' && seg[0] !== 'ngay') return pageActivityMonth(c, seg[0]!, seg[1]!, seg[2]!);
  return null;
}
