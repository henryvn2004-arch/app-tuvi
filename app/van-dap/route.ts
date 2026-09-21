// app/van-dap/route.ts — hub SSR cho Vấn Đáp Tử Vi (thay `public/blog.html`).
//
// 🔴 Vì sao thay hẳn `blog.html`: nó fetch Supabase TRONG TRÌNH DUYỆT — GPTBot/
// PerplexityBot/ClaudeBot không chạy JS nên 360 bài published không có lấy
// MỘT liên kết nào cho AI crawler thấy, dù mỗi bài tự nó SSR đầy đủ
// (app/api/khao-luan/route.ts). Route này SSR toàn bộ: danh mục, "bài mới
// trong tuần" (số ĐẾM THẬT từ created_at, không phải lượt hỏi mô phỏng —
// đúng luật docs/luat/bay.md "Số của CỔNG TUYỂN không phải số NGƯỜI XEM").
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

import { NextResponse } from 'next/server';
import {
  BASE_URL,
  KHAO_LUAN_CATEGORIES,
  PREVIEW_PER_CAT,
  RECENT_DAYS,
  fetchPublished,
  renderCard,
  renderHead,
  renderMethodBanner,
  footerScripts,
  searchScript,
  esc,
  formatDate,
  orgPublisher,
  type KhaoLuanRow,
} from './_shared';

export async function GET() {
  const rows = await fetchPublished();

  const cutoff = Date.now() - RECENT_DAYS * 86400_000;
  const recent = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff).slice(0, 8);

  const byCategory = new Map<string, KhaoLuanRow[]>();
  for (const r of rows) {
    const arr = byCategory.get(r.category) || [];
    arr.push(r);
    byCategory.set(r.category, arr);
  }

  const sections = KHAO_LUAN_CATEGORIES.map((meta) => {
    const all = byCategory.get(meta.id) || [];
    return { meta, total: all.length, preview: all.slice(0, PREVIEW_PER_CAT) };
  }).filter((s) => s.total > 0);

  const shownForSchema = new Map<string, KhaoLuanRow>();
  for (const r of recent) shownForSchema.set(r.slug, r);
  for (const s of sections) for (const r of s.preview) shownForSchema.set(r.slug, r);
  const itemListRows = [...shownForSchema.values()];

  const title = 'Vấn Đáp Tử Vi Đẩu Số — Câu Hỏi Thường Gặp | Tử Vi Minh Bảo';
  const desc =
    'Vấn đáp Tử Vi Đẩu Số — giải đáp các câu hỏi về hôn nhân, tài chính, sự nghiệp, vận hạn theo quan điểm Tử Vi cổ pháp, đối chiếu với dữ liệu cuộc đời thực đã kiểm chứng.';
  const url = `${BASE_URL}/van-dap`;

  const schemas = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: desc, url, publisher: orgPublisher() },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: itemListRows.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE_URL}/khao-luan/${r.slug}`,
        name: r.title,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Vấn Đáp', item: url },
      ],
    },
  ];

  const chipsHtml = sections
    .map((s) => `<a class="vd-chip" href="/van-dap/${s.meta.id}">${esc(s.meta.label)} <span style="opacity:.6">(${s.total})</span></a>`)
    .join('');

  const recentHtml = recent.length
    ? `<div class="vd-recent">
    <div class="vd-recent-title">Bài mới trong tuần</div>
    <div class="vd-recent-list">${recent
      .map((r) => `<a href="/khao-luan/${esc(r.slug)}">${esc(r.title)} <span style="color:var(--text-lt);font-size:11px">— ${esc(formatDate(r.created_at))}</span></a>`)
      .join('')}</div>
  </div>`
    : '';

  const sectionsHtml = sections
    .map(
      (s) => `<section class="vd-section">
    <div class="vd-section-head">
      <div><span class="vd-section-title">${esc(s.meta.label)}</span><span class="vd-section-count">${s.total} bài</span></div>
      ${s.total > PREVIEW_PER_CAT ? `<a class="vd-section-more" href="/van-dap/${s.meta.id}">Xem tất cả ${s.total} bài →</a>` : ''}
    </div>
    <div class="vd-grid">${s.preview.map((r) => renderCard(r)).join('')}</div>
  </section>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html lang="vi"><head>
${renderHead({ title, desc, url, schemas })}
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<div class="vd-hero">
  <div class="vd-eyebrow">考論 · Vấn Đáp</div>
  <h1 class="vd-title">Vấn Đáp Tử Vi</h1>
  <p class="vd-sub">Những câu hỏi thật về hôn nhân, tiền bạc, sự nghiệp, vận hạn — giải đáp theo Tử Vi Đẩu Số cổ pháp, đối chiếu với dữ liệu cuộc đời thực đã kiểm chứng.</p>
  <input class="vd-search" id="search-input" type="text" placeholder="Bạn đang thắc mắc điều gì? (tình cảm, sự nghiệp, vận hạn…)">
  <div class="vd-chips">${chipsHtml}</div>
</div>
<div class="vd-wrap">
  ${recentHtml}
  ${sectionsHtml || '<p class="vd-empty">Các bài vấn đáp đang được biên soạn. Hãy quay lại sớm.</p>'}
  <p id="vd-no-match" class="vd-empty" style="display:none">Không tìm thấy bài phù hợp.</p>
  ${renderMethodBanner()}
</div>
${footerScripts()}
${searchScript()}
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
