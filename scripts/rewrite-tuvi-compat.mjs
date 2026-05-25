// scripts/rewrite-tuvi-compat.mjs
// Rewrite content cho seo_pages có category trong {tuong-hop-hon-nhan, tuong-hop-lam-an}
// Usage:
//   node scripts/rewrite-tuvi-compat.mjs --dry-run --limit=3
//   node scripts/rewrite-tuvi-compat.mjs --limit=1000
//   node scripts/rewrite-tuvi-compat.mjs --all
//   node scripts/rewrite-tuvi-compat.mjs --slug=tuong-hop-hon-nhan-tuoi-at-dau-va-binh-dan --dry-run
import { parseSlug, analyze } from './tuvi-compat/analyze.mjs';
import { composeHonNhan } from './tuvi-compat/compose-honnhan.mjs';
import { composeLamAn } from './tuvi-compat/compose-lamam.mjs';

// ── Args parsing ──────────────────────────────────────────────────────────────
const args = {};
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    args[k] = v ?? true;
  }
}
const DRY_RUN = !!args['dry-run'];
const LIMIT   = args['all'] ? 999999 : parseInt(args['limit'] || '3');
const SLUG    = args['slug'] || null;
const CAT     = args['category'] || null;
const CONC    = parseInt(args['concurrency'] || '20');

// ── Env (chỉ cần khi không dry-run) ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error('❌ Cần SUPABASE_URL và SUPABASE_SERVICE_KEY trong env (.env.local)');
  process.exit(1);
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────
async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sbPatch(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${path} → ${r.status}: ${await r.text()}`);
}

// ── Process 1 row ─────────────────────────────────────────────────────────────
function rewriteOne(row) {
  const parsed = parseSlug(row.slug);
  if (!parsed) return { ok: false, reason: 'slug-parse-failed', slug: row.slug };
  const analysis = analyze(parsed.A, parsed.B);
  const md = parsed.cat === 'honnhan'
    ? composeHonNhan(analysis, row.slug)
    : composeLamAn(analysis, row.slug);
  return { ok: true, md, wordCount: md.split(/\s+/).length, charCount: md.length };
}

// ── Concurrency limiter ───────────────────────────────────────────────────────
async function runWithConcurrency(items, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx).catch(e => ({ ok: false, error: String(e) }));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 1000;

async function fetchPage(catFilter, afterId) {
  const filter = afterId ? `${catFilter}&id=gt.${afterId}` : catFilter;
  return sbGet(`/seo_pages?${filter}&select=id,slug,category&limit=${PAGE_SIZE}&order=id.asc`);
}

async function main() {
  if (SLUG) {
    // Single-slug mode (dùng để dry-run preview 1 bài cụ thể)
    let rows;
    if (DRY_RUN) {
      rows = [{ slug: SLUG, category: SLUG.includes('hon-nhan') ? 'tuong-hop-hon-nhan' : 'tuong-hop-lam-an' }];
    } else {
      rows = await sbGet(`/seo_pages?slug=eq.${encodeURIComponent(SLUG)}&select=id,slug,category&limit=1`);
    }
    return processRows(rows);
  }

  const cats = CAT ? [CAT] : ['tuong-hop-hon-nhan', 'tuong-hop-lam-an'];
  const catFilter = `category=in.(${cats.join(',')})`;

  if (DRY_RUN) {
    // Sample mode — single page only
    const rows = await sbGet(`/seo_pages?${catFilter}&select=id,slug,category&limit=${LIMIT}&order=id.asc`);
    return processRows(rows);
  }

  // Live write mode — paginate through all rows
  let afterId = parseInt(args['after-id']) || 0;
  let totalOk = 0, totalFail = 0;
  let pageNum = 0;
  const overallStart = Date.now();

  while (true) {
    const rows = await fetchPage(catFilter, afterId);
    if (rows.length === 0) break;
    pageNum++;

    console.log(`\n── Page ${pageNum}: ${rows.length} rows (id > ${afterId}) ──`);
    const { ok, fail } = await processRows(rows);
    totalOk += ok; totalFail += fail;

    afterId = rows[rows.length - 1].id;
    if (rows.length < PAGE_SIZE) break;
    if (totalOk + totalFail >= LIMIT) break;
  }

  const totalSec = ((Date.now() - overallStart) / 1000).toFixed(1);
  console.log(`\n✅ ALL DONE. ok=${totalOk} fail=${totalFail} in ${totalSec}s (${pageNum} pages).`);
}

async function processRows(rows) {
  console.log(`Loaded ${rows.length} row(s). Mode: ${DRY_RUN ? 'DRY-RUN' : 'WRITE'}. Concurrency: ${CONC}.`);

  if (DRY_RUN) {
    for (const row of rows) {
      const r = rewriteOne(row);
      console.log('\n' + '═'.repeat(78));
      console.log(`SLUG: ${row.slug}`);
      console.log(`CAT:  ${row.category}`);
      if (r.ok) {
        console.log(`WORDS: ~${r.wordCount}, CHARS: ${r.charCount}`);
        console.log('─'.repeat(78));
        console.log(r.md);
      } else {
        console.log(`❌ FAIL: ${r.reason}`);
      }
    }
    console.log('\n' + '═'.repeat(78));
    console.log(`Dry-run done. ${rows.length} samples printed.`);
    return { ok: rows.length, fail: 0 };
  }

  let ok = 0, fail = 0;
  const startT = Date.now();
  await runWithConcurrency(rows, async (row, idx) => {
    const r = rewriteOne(row);
    if (!r.ok) { fail++; return { ok: false }; }
    await sbPatch(`/seo_pages?id=eq.${row.id}`, { content: r.md });
    ok++;
    if ((idx + 1) % 100 === 0) {
      const rate = ((idx + 1) / ((Date.now() - startT) / 1000)).toFixed(1);
      console.log(`  [${idx + 1}/${rows.length}] ok=${ok} fail=${fail} (${rate} rows/s)`);
    }
    return { ok: true };
  }, CONC);

  const totalSec = ((Date.now() - startT) / 1000).toFixed(1);
  console.log(`  page done: ok=${ok} fail=${fail} in ${totalSec}s`);
  return { ok, fail };
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
