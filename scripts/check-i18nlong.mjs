#!/usr/bin/env node
/**
 * check:i18nlong — bản dịch VĂN DÀI theo chỉ số (public/tools-shared/i18n-long/<locale>/<ns>.js, W16a).
 *
 * Soi, với MỌI file bản dịch đang có:
 *   1. file chạy được và gọi `I18n.defineLong('<đúng ns>', …)`;
 *   2. KHÔNG mồ côi — mọi khoá còn có trong bảng nguồn (số quẻ/hào, `ma`, số quái, tên sao/thần);
 *   3. hash `h` khớp câu Việt nguồn HIỆN TẠI (nguồn đổi mà bản dịch chưa dịch lại ⇒ đỏ);
 *   4. bản dịch hợp lệ: không rỗng, không chép nguyên câu Việt, không còn dấu tiếng Việt, token `{x}` khớp câu
 *      Việt (câu KHUÔN có biến của văn engine — W28: I18n.long(ns, k, vi, {x}) thay ở cả hai bản);
 *   5. locale trong LONG_COMPLETE (lib/i18n/long.mjs) phải có ĐỦ mọi mục của mọi ns;
 *   6. zh-cn == OpenCC(zh-tw) mục theo mục (như check:i18n — zh-cn SINH, không sửa tay);
 * và phía module nguồn: mỗi module có gọi `loadLong('<ns>')`, và mọi `I18n.long`/`_long` dùng đúng ns;
 * văn ENGINE SERVER (`ENGINE_NS`, W28): mỗi BẢNG có bản dịch phải có chỗ vẽ trong module (tiền tố `'<bảng>.'`
 * hoặc `'<bảng>'` xuất hiện trong mã) — bảng dịch mà không ai tra là chữ chết, hoặc là chỗ vẽ bị gỡ mất.
 *
 * Chạy: node scripts/check-i18nlong.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';
import { hashVi, hasVietnamese, placeholderSignature } from '../lib/i18n/core.mjs';
import { TRANSLATED } from '../lib/i18n/dict.mjs';
import {
  LONG_NS,
  LONG_MODULE,
  LONG_COMPLETE,
  ENGINE_NS,
  loadSources,
  readLong,
  longDir,
} from '../lib/i18n/long.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const sources = loadSources(ROOT);
const conv = OpenCC.Converter({ from: 'twp', to: 'cn' });

// Thư mục lạ trong i18n-long/ (gõ sai locale) cũng là lỗi, không im lặng bỏ qua.
if (fs.existsSync(longDir(ROOT)))
  for (const d of fs.readdirSync(longDir(ROOT)))
    if (!TRANSLATED.includes(d))
      fail(`i18n-long/${d}/: không phải locale (${TRANSLATED.join(' ')})`);

const stat = {};
for (const locale of TRANSLATED) {
  const need = LONG_COMPLETE.includes(locale);
  for (const ns of LONG_NS) {
    const src = sources[ns];
    const where = `${locale}/${ns}`;
    let dict;
    try {
      dict = readLong(ROOT, locale, ns);
    } catch (e) {
      fail(`${where}: file hỏng — ${e.message}`);
      continue;
    }
    if (!dict) {
      if (need) fail(`${where}: thiếu file (locale ${locale} nằm trong LONG_COMPLETE)`);
      continue;
    }
    const byKey = new Map(src.map((e) => [e.k, e]));
    let ok = 0;
    for (const [k, e] of Object.entries(dict)) {
      const s = byKey.get(k);
      if (!s) {
        fail(`${where}: mục mồ côi "${k}" — không còn trong bảng nguồn`);
        continue;
      }
      if (!e || typeof e.t !== 'string' || !e.t.trim()) {
        fail(`${where}: "${k}" rỗng`);
        continue;
      }
      if (e.h !== hashVi(s.vi)) {
        fail(
          `${where}: "${k}" hash lệch nguồn (câu Việt đã đổi — dịch lại bằng npm run i18n:long -- next)`
        );
        continue;
      }
      if (e.t.trim() === s.vi.trim()) {
        fail(`${where}: "${k}" chép nguyên câu Việt`);
        continue;
      }
      if (hasVietnamese(e.t)) {
        fail(`${where}: "${k}" còn dấu tiếng Việt: ${e.t.slice(0, 40)}…`);
        continue;
      }
      if (placeholderSignature(e.t) !== placeholderSignature(s.vi)) {
        fail(`${where}: "${k}" token {…} lệch câu Việt (${placeholderSignature(s.vi) || '—'})`);
        continue;
      }
      ok++;
    }
    if (need) {
      const miss = src.filter((s) => !Object.prototype.hasOwnProperty.call(dict, s.k));
      if (miss.length) fail(`${where}: thiếu ${miss.length}/${src.length} mục (vd "${miss[0].k}")`);
    }
    stat[locale] = (stat[locale] || 0) + ok;

    if (locale === 'zh-cn') {
      let tw = null;
      try {
        tw = readLong(ROOT, 'zh-tw', ns);
      } catch {}
      if (!tw) fail(`${where}: có zh-cn mà không có zh-tw/${ns} — zh-cn phải SINH từ zh-tw`);
      else {
        for (const [k, e] of Object.entries(dict)) {
          if (!tw[k]) fail(`${where}: "${k}" không có ở zh-tw`);
          else if (conv(tw[k].t) !== e.t)
            fail(`${where}: "${k}" lệch OpenCC(zh-tw) — chạy npm run i18n:long -- zhcn`);
        }
        for (const k of Object.keys(tw))
          if (!dict[k])
            fail(`${where}: thiếu "${k}" (có ở zh-tw) — chạy npm run i18n:long -- zhcn`);
      }
    }
  }
}
if (LONG_COMPLETE.includes('zh-cn') !== LONG_COMPLETE.includes('zh-tw'))
  fail('LONG_COMPLETE: zh-tw và zh-cn phải đi cùng nhau (zh-cn sinh từ zh-tw)');

// Phía module: nạp đúng ns, tra đúng ns.
for (const ns of LONG_NS) {
  const f = LONG_MODULE[ns];
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (!code.includes(`loadLong('${ns}')`))
    fail(`${f}: không gọi loadLong('${ns}') — file bản dịch sẽ không bao giờ được nạp`);
  if (!code.includes(`'${ns}'`) || !/I18n\.long|_long\(/.test(code))
    fail(`${f}: không có chỗ tra bản dịch (I18n.long/_long) cho '${ns}'`);
}
// Văn engine server: mỗi bảng (đoạn đầu khoá) phải được module tra tới.
// past-life (W30f-3): khoá KHÔNG viết trong module — engine trả sẵn khoá đầy đủ trong mã `ma` (xem khối riêng dưới).
const KHOA_TRONG_MA = { 'past-life': ['nghe', 'pair', 'note', 'tier', 'menh', 'era'] };
for (const ns of Object.keys(ENGINE_NS)) {
  const f = LONG_MODULE[ns];
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const bang of new Set(sources[ns].map((e) => e.k.split('.')[0])))
    if (
      !(KHOA_TRONG_MA[ns] || []).includes(bang) &&
      !code.includes(`'${bang}.'`) &&
      !code.includes(`'${bang}'`)
    )
      fail(
        `${f}: bảng '${bang}' của ns ${ns} có bản dịch nhưng module không tra tới (chỗ vẽ bị gỡ/đổi tên?)`
      );
}
// hntre (W30a): nguồn đọc thẳng từ bảng TS nên khoá trùng id bảng; phần còn lại là MÃ trong payload do hàm dựng
// hồ sơ gắn thêm (`ma` của mặt đọc + của chiều "không đòi hỏi") và trang tra đúng cửa. Gỡ `ma` khỏi engine ⇒ /ja lặng
// lẽ lùi về chữ Việt ở hai khối đó — không bộ dò nào khác thấy, nên canh ở đây.
{
  const eng = fs.readFileSync(path.join(ROOT, ENGINE_NS.hntre), 'utf8');
  for (const [snip, y] of [
    ['ma: m.ma,', 'matDoc[].ma (cơ sở lá số)'],
    ['ma: x.id })', 'khongDoiHoi[].ma (câu khuôn {ai})'],
  ])
    if (!eng.includes(snip)) fail(`${ENGINE_NS.hntre}: thiếu mã tra ${y} — "${snip}"`);
  const page = fs.readFileSync(path.join(ROOT, LONG_MODULE.hntre), 'utf8');
  for (const t of ["'kdh.' + c.ma", "'matdoc.' + m.ma", "'huong.' + h.id", "'lop.' + lopId"])
    if (!page.includes(t)) fail(`${LONG_MODULE.hntre}: trang không tra ${t}`);
}
// past-life (W30f-3): mã `ma` do `resolveCareerBase`/`cong-so.ts` gắn thêm + trang tra đúng cửa. Gỡ mã khỏi engine ⇒ /ja lặng
// lẽ lùi về chữ Việt ở khối "Cơ sở trong lá số" — không bộ dò nào khác thấy, nên canh ở đây.
{
  const eng = fs.readFileSync(path.join(ROOT, ENGINE_NS['past-life']), 'utf8');
  for (const snip of [
    '`pair.${pk}.${tierInfo.tier}`',
    '`nghe.${lead.ten}.${tierInfo.tier}`',
    "'nghe.default'",
    '`tier.${tierInfo.tier}`',
    '`note.mod.${i}`',
    '`note.hoa.${s.hoa}`',
  ])
    if (!eng.includes(snip)) fail(`${ENGINE_NS['past-life']}: thiếu mã tra — ${snip}`);
  const cs = fs.readFileSync(path.join(ROOT, 'lib/engine/cong-so.ts'), 'utf8');
  for (const snip of ['ma: cb.ma,', '`menh.${sao}.role`'])
    if (!cs.includes(snip)) fail(`lib/engine/cong-so.ts: thiếu mã tra — ${snip}`);
  const page = fs.readFileSync(path.join(ROOT, LONG_MODULE['past-life']), 'utf8');
  for (const t of ['ma.desc', 'ma.src', 'ma.tier', 'vaiTroMa', 'ma.bd', 'ma.notes', "'bd.'"])
    if (!page.includes(t)) fail(`${LONG_MODULE['past-life']}: trang không tra ${t}`);
}
// Hàm tra dùng chung (W30f): trang đã nạp script VÀ gọi hàm. Gỡ một trong hai ⇒ /ja lặng lẽ lùi về chữ Việt ở khối đó.
{
  const doc = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const TRANG = [
    'public/app-cong-so.html',
    'public/app-day-con.html',
    'public/app-huong-nghiep-tre.html',
    'public/app-nguoi-khac.html',
  ];
  for (const f of TRANG)
    for (const js of ['star-label.js', 'cach-cuc.js'])
      if (!new RegExp(`/tools-shared/${js.replace('.', '\\.')}\\?v=\\d+`).test(doc(f)))
        fail(`${f}: không nạp /tools-shared/${js}`);
  for (const f of TRANG.slice(1)) {
    const code = doc(f);
    if (!code.includes('TuviCachCuc.list('))
      fail(`${f}: không gọi TuviCachCuc.list (câu cachCucTungCung sẽ giữ chữ Việt)`);
    if (!code.includes('TuviStarLabel.'))
      fail(`${f}: không gọi TuviStarLabel (nhãn sao sẽ giữ chữ Việt)`);
  }
  // W30f-6: các trang hiện cách cục có tên / ý nghĩa cung ngoài 4 trang trên.
  for (const f of [
    'public/app-chan-dung-vo-chong.html',
    'public/app-luan-giai.html',
    'public/app-chu-trinh-cuoc-doi.html',
    'public/app-van-han-nam.html',
  ])
    if (!/\/tools-shared\/cach-cuc\.js\?v=\d+/.test(doc(f)))
      fail(`${f}: không nạp /tools-shared/cach-cuc.js`);
  if (!doc('public/app-chan-dung-vo-chong.html').includes('TuviCachCuc.t('))
    fail(
      'public/app-chan-dung-vo-chong.html: không gọi TuviCachCuc.t (cách cục · ý nghĩa cổ pháp giữ chữ Việt)'
    );
  const lg = doc('public/luan-giai-core.js');
  if ((lg.match(/_ccT\(/g) || []).length < 5)
    fail(
      'public/luan-giai-core.js: thiếu _ccT(...) ở khối Cách cục / Phân tích sao (cần ≥5 chỗ gọi + 1 định nghĩa)'
    );
  // W30f-7: Chân Dung Tiền Kiếp dịch era/bậc/chức phận/trích dẫn qua helper dùng chung (khoá suy từ trường sẵn có, không đổi SHAPE).
  {
    const h = doc('public/tools-shared/past-life-t.js');
    for (const t of ["'era.'", "'tier.'", "'pair.'", "'nghe.'", "'desc'", "'src'"])
      if (!h.includes(t)) fail(`public/tools-shared/past-life-t.js: không dựng khoá ${t}`);
    const pg = doc('public/app-chan-dung-tien-kiep.html');
    if (!/\/tools-shared\/past-life-t\.js\?v=\d+/.test(pg))
      fail('public/app-chan-dung-tien-kiep.html: không nạp past-life-t.js');
    for (const t of [
      'TuviPastLife.eraLine(',
      'TuviPastLife.eraLabel(',
      'TuviPastLife.tier(',
      'TuviPastLife.desc(',
      'TuviPastLife.source(',
    ])
      if (!pg.includes(t)) fail(`public/app-chan-dung-tien-kiep.html: không gọi ${t}`);
  }
  const cs = doc('public/tools-shared/cong-so.js');
  if (!cs.includes('TuviCachCuc')) fail('public/tools-shared/cong-so.js: không gọi TuviCachCuc');
  if (!cs.includes('TuviStarLabel'))
    fail('public/tools-shared/cong-so.js: không gọi TuviStarLabel');
}
for (const f of new Set(Object.values(LONG_MODULE))) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of code.matchAll(/(?:I18n\.long|\b_long)\(\s*'([^']+)'/g))
    if (!LONG_NS.includes(m[1]))
      fail(`${f}: tra namespace lạ '${m[1]}' (LONG_NS: ${LONG_NS.join(' ')})`);
}

if (bad) {
  console.error(`\n${bad} lỗi.`);
  process.exit(1);
}
const total = LONG_NS.reduce((n, ns) => n + sources[ns].length, 0);
console.log(
  `✓ i18nlong: nguồn ${total} mục · ${
    Object.entries(stat)
      .map(([l, n]) => `${l} ${n}`)
      .join(' · ') || 'chưa có bản dịch'
  }`
);
