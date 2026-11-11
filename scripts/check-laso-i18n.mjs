#!/usr/bin/env node
/**
 * Bản luận lá số theo ngôn ngữ (i18n W17) — `laso_public_i18n` + `lib/laso/luan-i18n.ts`.
 *
 * Bộ dò này vừa là unit test của kho (chạy thật `luan-i18n.ts` trên PostgREST giả) vừa soi hợp đồng
 * ở những chỗ typecheck không bắt được:
 *   1. `vi` KHÔNG BAO GIỜ chạm kho mới (0 lượt fetch) — đường Việt giữ nguyên từng byte.
 *   2. Đọc hụt → sinh → ghi → đọc trúng; ghi lần hai chỉ GỘP NÔNG theo số phần (không xoá phần cũ).
 *   3. Fail an toàn: bảng chưa có (404 PGRST205) / mạng ném / thiếu env ⇒ null/false, không ném.
 *   4. save-laso: chữ luận ngoại ngữ đi sang kho mới, KHÔNG vào laso_public; mọi nhánh mới gác `locale !== 'vi'`.
 *   5. 4 trang luận: locale ≠ vi đọc `/api/laso-luan` TRƯỚC (và thay cho) REST laso_public.
 *   6. Migration: idempotent, RLS bật không policy, REVOKE public/anon/authenticated, search_path, CHECK
 *      locale = LOCALES trừ vi.
 *   7. `laso_public_i18n` chỉ được nhắc trong code chạy ở ĐÚNG MỘT file (`lib/laso/luan-i18n.ts`).
 * Chạy trên Node 20 (CI): dịch .ts bằng `typescript` rồi nạp từ thư mục tạm.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const errs = [];
const bad = (m) => errs.push(m);
const must = (cond, m) => {
  if (!cond) bad(m);
};

// ── Nạp lib thật ─────────────────────────────────────────────────────────────────────────
const LIB = 'lib/laso/luan-i18n.ts';
const js = ts.transpileModule(read(LIB), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
if (/from ['"]@\//.test(js))
  throw new Error(`${LIB} có import giá trị từ '@/…' — bộ dò không nạp được, sửa bộ dò`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lasoi18n-'));
fs.writeFileSync(path.join(tmp, 'm.mjs'), js);
const lib = await import(pathToFileURL(path.join(tmp, 'm.mjs')).href);
fs.rmSync(tmp, { recursive: true, force: true });

// PostgREST giả: GET bảng + POST rpc gộp nông, cùng ngữ nghĩa câu SQL trong migration.
function fakeDb({ missing = false, throws = false } = {}) {
  const rows = new Map(); // `${slug}|${locale}` → {luan_giai, nam_xem}
  const calls = [];
  const f = async (url, init = {}) => {
    calls.push({ url, init });
    if (throws) throw new Error('mạng hỏng');
    const u = new URL(url);
    if (missing)
      return new Response('{"code":"PGRST205","message":"Could not find the table"}', {
        status: 404,
      });
    if (u.pathname === '/rest/v1/laso_public_i18n' && (init.method || 'GET') === 'GET') {
      const slug = u.searchParams.get('slug').replace(/^eq\./, '');
      const loc = u.searchParams.get('locale').replace(/^eq\./, '');
      const r = rows.get(`${slug}|${loc}`);
      return Response.json(r ? [r] : []);
    }
    if (u.pathname === '/rest/v1/rpc/laso_public_i18n_merge' && init.method === 'POST') {
      const b = JSON.parse(init.body);
      const k = `${b.p_slug}|${b.p_locale}`;
      const old = rows.get(k);
      rows.set(k, {
        luan_giai: { ...(old?.luan_giai || {}), ...b.p_luan_giai },
        nam_xem: b.p_nam_xem ?? old?.nam_xem ?? null,
      });
      return new Response(null, { status: 204 });
    }
    return new Response('?', { status: 400 });
  };
  return { f, calls, rows };
}
const env = (db) => ({ url: 'https://sb.test', key: 'service-key', fetch: db.f });
const quiet = async (fn) => {
  const ce = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = ce;
  }
};

// 1. vi không chạm kho
{
  const db = fakeDb();
  must((await lib.readLuanI18n('s1', 'vi', env(db))) === null, 'vi: read phải trả null');
  must(
    (await lib.mergeLuanI18n('s1', 'vi', { 1: 'x' }, 2026, env(db))) === false,
    'vi: merge phải trả false'
  );
  must(db.calls.length === 0, `vi: kho mới bị gọi ${db.calls.length} lượt (phải 0)`);
}

// 2. hụt → sinh → ghi → trúng; gộp nông
{
  const db = fakeDb();
  must((await lib.readLuanI18n('s1', 'ja', env(db))) === null, 'ja hụt: phải null');
  must(
    (await lib.mergeLuanI18n('s1', 'ja', { 1: '一', 2: '二' }, 2026, env(db))) === true,
    'ja merge phải true'
  );
  const hit = await lib.readLuanI18n('s1', 'ja', env(db));
  must(
    hit && hit.luanGiai[1] === '一' && hit.namXem === 2026,
    'ja: đọc lại phải trúng bản vừa ghi'
  );
  must((await lib.readLuanI18n('s1', 'ko', env(db))) === null, 'ko không được thấy bản ja');
  await lib.mergeLuanI18n('s1', 'ja', { 3: '三' }, null, env(db));
  const hit2 = await lib.readLuanI18n('s1', 'ja', env(db));
  must(
    hit2 && hit2.luanGiai[1] === '一' && hit2.luanGiai[3] === '三' && hit2.namXem === 2026,
    'ja: ghi lần hai phải GỘP (giữ phần 1, giữ nam_xem khi lượt sau không kèm năm)'
  );
  const get = db.calls.find((c) => !c.init.method);
  must(get?.init.cache === 'no-store', 'GET phải cache:no-store');
  must(get?.init.headers?.Authorization === 'Bearer service-key', 'GET phải dùng service key');
  const post = db.calls.find((c) => c.init.method === 'POST');
  must(post?.init.cache === 'no-store', 'POST rpc phải cache:no-store');
  must(
    (await lib.mergeLuanI18n('s1', 'ja', {}, 2026, env(db))) === false,
    'merge store rỗng phải false'
  );
  must(
    (await lib.mergeLuanI18n('s1', 'ja', ['x'], 2026, env(db))) === false,
    'merge mảng phải false'
  );
  const n = db.calls.length;
  await lib.mergeLuanI18n('s1', 'ja', {}, 2026, env(db));
  must(db.calls.length === n, 'merge store rỗng không được gọi mạng');
}

// 3. fail an toàn
await quiet(async () => {
  const miss = fakeDb({ missing: true });
  must((await lib.readLuanI18n('s1', 'ja', env(miss))) === null, 'bảng chưa có: read phải null');
  must(
    (await lib.mergeLuanI18n('s1', 'ja', { 1: 'a' }, 2026, env(miss))) === false,
    'bảng chưa có: merge phải false'
  );
  const boom = fakeDb({ throws: true });
  must((await lib.readLuanI18n('s1', 'ja', env(boom))) === null, 'mạng ném: read phải null');
  must(
    (await lib.mergeLuanI18n('s1', 'ja', { 1: 'a' }, 2026, env(boom))) === false,
    'mạng ném: merge phải false'
  );
  const noenv = { url: '', key: '', fetch: boom.f };
  const before = boom.calls.length;
  must((await lib.readLuanI18n('s1', 'ja', noenv)) === null, 'thiếu env: read phải null');
  must(
    (await lib.mergeLuanI18n('s1', 'ja', { 1: 'a' }, 2026, noenv)) === false,
    'thiếu env: merge phải false'
  );
  must(boom.calls.length === before, 'thiếu env: không được gọi mạng');
}).catch((e) => bad('fail an toàn: ném ra ' + e.message));

// 4. save-laso
{
  const s = read('app/api/save-laso/route.ts');
  must(
    s.includes("import { mergeLuanI18n } from '@/lib/laso/luan-i18n';"),
    'save-laso: thiếu import mergeLuanI18n'
  );
  must(
    s.includes("const luanNgoaiNgu = locale !== 'vi' ? b.luanGiai : null;"),
    'save-laso: chữ luận ngoại ngữ phải lấy CHỈ khi locale !== vi'
  );
  must(
    /if \(locale !== 'vi'\) \{\s*payload\.luan_giai = \{\};/.test(s),
    'save-laso: locale ≠ vi phải xoá chữ luận khỏi payload laso_public'
  );
  must(
    /if \(locale !== 'vi'\) delete updatePayload\.nam_xem;/.test(s),
    'save-laso: locale ≠ vi không được dời nam_xem của bản Việt'
  );
  const iMerge = s.indexOf('await mergeLuanI18n(');
  const iGuard = s.lastIndexOf('if (luanNgoaiNgu) {', iMerge);
  const iUpd = s.indexOf(".from('laso_public').update(");
  const iIns = s.indexOf(".from('laso_public').insert(");
  must(
    iMerge > 0 && iGuard > 0 && iMerge - iGuard < 200,
    'save-laso: mergeLuanI18n phải nằm trong if (luanNgoaiNgu)'
  );
  must(
    iUpd > 0 && iIns > 0 && iMerge > iUpd && iMerge > iIns,
    'save-laso: ghi kho ngoại ngữ phải đứng SAU khi ghi laso_public'
  );
}

// 5. 4 trang luận
for (const [p, fn] of [
  ['public/app-luan-giai.html', '_fetchCachedLuanGiai'],
  ['public/app-chu-trinh-cuoc-doi.html', '_fetchCachedLuanGiai'],
  ['public/app-bat-tu.html', '_fetchCachedLuanGiai'],
  ['public/app-van-han-nam.html', '_fetchCached'],
]) {
  const s = read(p);
  const i = s.indexOf(`async function ${fn}(slug){`);
  if (i < 0) {
    bad(`${p}: không thấy ${fn}`);
    continue;
  }
  const body = s.slice(i, s.indexOf('\n}', i));
  const iLoc = body.indexOf("((window.I18n&&window.I18n.locale)||'vi')!=='vi'");
  const iApi = body.indexOf("fetch('/api/laso-luan?slug='");
  const iRet = body.indexOf('return (di&&di.luanGiai', iApi);
  const iRest = body.indexOf("/rest/v1/laso_public?slug=eq.'");
  must(
    iLoc >= 0 && iApi > iLoc && iRet > iApi && iRest > iRet,
    `${p}: ${fn} phải rẽ locale ≠ vi sang /api/laso-luan (và return) TRƯỚC REST laso_public`
  );
}
{
  const r = read('app/api/laso-luan/route.ts');
  must(
    r.includes('requestLocale(request)'),
    'laso-luan: phải quyết ngôn ngữ bằng requestLocale (cùng hàm với save-laso)'
  );
  must(
    /if \(locale === 'vi'\) return ok\(\{ locale, luanGiai: null \}\);/.test(r),
    'laso-luan: vi phải trả null (không đọc kho mới)'
  );
}

// 6. migration
{
  const m = read('_patches/migration-laso-public-i18n.sql');
  for (const [re, msg] of [
    [/CREATE TABLE IF NOT EXISTS public\.laso_public_i18n/, 'CREATE TABLE IF NOT EXISTS'],
    [/PRIMARY KEY \(slug, locale\)/, 'khoá (slug, locale)'],
    [/ALTER TABLE public\.laso_public_i18n ENABLE ROW LEVEL SECURITY;/, 'RLS bật'],
    [
      /REVOKE ALL ON TABLE public\.laso_public_i18n FROM public, anon, authenticated;/,
      'REVOKE bảng',
    ],
    [/CREATE OR REPLACE FUNCTION public\.laso_public_i18n_merge/, 'CREATE OR REPLACE FUNCTION'],
    [/SET search_path = public, pg_temp/, 'search_path = public, pg_temp'],
    [
      /REVOKE ALL ON FUNCTION public\.laso_public_i18n_merge\(text, text, jsonb, integer\) FROM public, anon, authenticated;/,
      'REVOKE hàm',
    ],
  ])
    must(re.test(m), `migration: thiếu ${msg}`);
  must(!/CREATE POLICY/i.test(m), 'migration: bảng không được có policy (chỉ service_role)');
  must(!/SECURITY DEFINER/i.test(m), 'migration: hàm gộp không cần SECURITY DEFINER');
  const chk = /CHECK \(locale IN \(([^)]*)\)\)/.exec(m);
  const want = /export const LOCALES = \[([^\]]*)\]/.exec(read('lib/i18n/locales.ts'));
  const list = (x) =>
    [...x.matchAll(/'([^']+)'/g)]
      .map((a) => a[1])
      .filter((l) => l !== 'vi')
      .sort()
      .join(',');
  const raw = (x) =>
    [...x.matchAll(/'([^']+)'/g)]
      .map((a) => a[1])
      .sort()
      .join(',');
  must(
    chk && want && raw(chk[1]) === list(want[1]),
    `migration: CHECK locale phải = LOCALES trừ vi (${chk && raw(chk[1])} ≠ ${want && list(want[1])})`
  );
}

// 7. cửa duy nhất
{
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (
        /\.(ts|tsx|mjs|js)$/.test(e.name) &&
        /laso_public_i18n\b/.test(read(p).replace(/\/\/.*$/gm, ''))
      )
        hits.push(p);
    }
  };
  for (const d of ['app', 'lib']) walk(d);
  must(
    hits.length === 1 && hits[0] === LIB,
    `laso_public_i18n chỉ được chạm từ ${LIB}, thấy: ${hits.join(', ')}`
  );
}

if (errs.length) {
  console.error('✗ check:lasoi18n\n  ' + errs.join('\n  '));
  process.exit(1);
}
console.log(
  '✓ check:lasoi18n — kho luận theo ngôn ngữ: vi không chạm, hụt→sinh→ghi→trúng, fail an toàn, hợp đồng save-laso/4 trang/migration'
);
