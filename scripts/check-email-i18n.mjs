#!/usr/bin/env node
/**
 * Chữ của 6 loại email theo ngôn ngữ (lib/email/i18n.ts) — W11.
 *
 * 🔴 Vì sao cần: nội dung email KHÔNG đi qua i18n/<locale>.json nên check:i18n không
 * thấy. Thiếu một khoá ở một ngôn ngữ thì TypeScript đã bắt (kiểu Record<Locale, Strings>);
 * cái TypeScript KHÔNG bắt được, bộ dò này bắt:
 *   1. hàm chữ phải dùng ĐỦ tham số như bản vi (thiếu {credits} = hoá đơn không ghi số Lượng)
 *   2. zh-cn PHẢI là OpenCC(zh-tw) từng ký tự — cùng luật "không dịch tay zh-cn" của W4
 *   3. cặp cross-sell trong email-cross-sell.ts có đủ chữ ở MỌI ngôn ngữ (thiếu ⇒ ném lỗi
 *      giữa cron, mất cả lượt gửi)
 *   4. không chữ "AI"/trí tuệ nhân tạo trong email (luật chữ hiển thị)
 * Chạy trên Node 20 (CI): dịch i18n.ts bằng `typescript` rồi nạp từ thư mục tạm.
 *
 * Sửa khối `'zh-tw'` xong thì chạy `node scripts/check-email-i18n.mjs --write` để SINH lại khối
 * `'zh-cn'` (OpenCC twp→cn) — đừng sửa tay khối zh-cn.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { Converter } from 'opencc-js';

const root = new URL('..', import.meta.url).pathname;
const SRC = path.join(root, 'lib/email/i18n.ts');
let src = fs.readFileSync(SRC, 'utf8');

if (process.argv.includes('--write')) {
  const conv = Converter({ from: 'twp', to: 'cn' });
  // Khối của mỗi ngôn ngữ nằm trong `const S` và `const UNSUB`, hoặc một dòng (PDF_EXTRA), hoặc nhiều dòng đóng bằng `\n  },` ở cấp thụt 2 ô.
  const blocks = (key) => [
    ...src.matchAll(
      new RegExp(`\\n  '${key}': \\{(?:[^\\n]*\\},(?=\\n)|[\\s\\S]*?\\n  \\},)`, 'g')
    ),
  ];
  const tws = blocks('zh-tw');
  const cns = blocks('zh-cn');
  if (tws.length !== 3 || cns.length !== 3)
    throw new Error(
      `mong 3 khối zh-tw/zh-cn (S, PDF_EXTRA, UNSUB), thấy ${tws.length}/${cns.length}`
    );
  for (let i = tws.length - 1; i >= 0; i--) {
    const regen = conv(tws[i][0]).replace("'zh-tw'", "'zh-cn'");
    src = src.slice(0, cns[i].index) + regen + src.slice(cns[i].index + cns[i][0].length);
  }
  fs.writeFileSync(SRC, src);
  console.log('đã sinh lại 3 khối zh-cn từ zh-tw');
}
const imp = "import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locales';";
if (!src.includes(imp)) throw new Error('i18n.ts đổi dòng import — sửa bộ dò');
src = src.replace(imp, "const DEFAULT_LOCALE = 'vi';");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emaili18n-'));
const file = path.join(tmp, 'i18n.mjs');
fs.writeFileSync(file, js);
const mod = await import(pathToFileURL(file).href);
fs.rmSync(tmp, { recursive: true, force: true });

const S = mod.EMAIL_STRINGS_FOR_CHECK;
const LOCALES = ['vi', 'en', 'ja', 'ko', 'zh-tw', 'zh-cn'];
const toCn = Converter({ from: 'twp', to: 'cn' });
const errs = [];
const bad = (m) => errs.push(m);

for (const l of LOCALES) if (!S[l]) bad(`thiếu ngôn ngữ ${l}`);

// Gọi mọi hàm chữ bằng tham số dò: số 7777 và chuỗi PROBE_x. Bản vi cho biết tham số nào PHẢI xuất hiện.
function probeArgs(n) {
  return Array.from({ length: n }, (_, i) => (i === 0 && n === 1 ? 7777 : `PROBE_${i}`));
}
function walk(obj, p, out) {
  for (const [k, v] of Object.entries(obj)) {
    const kp = p ? `${p}.${k}` : k;
    if (typeof v === 'function') out.push([kp, v]);
    else if (typeof v === 'string') out.push([kp, v]);
    else if (v && typeof v === 'object') walk(v, kp, out);
  }
}
const flat = {};
for (const l of LOCALES) {
  flat[l] = [];
  walk(S[l], '', flat[l]);
}
const viKeys = flat.vi.map(([k]) => k);
for (const l of LOCALES) {
  const ks = flat[l].map(([k]) => k);
  const miss = viKeys.filter((k) => !ks.includes(k));
  const extra = ks.filter((k) => !viKeys.includes(k));
  if (miss.length) bad(`${l}: thiếu khoá ${miss.join(', ')}`);
  if (extra.length) bad(`${l}: thừa khoá ${extra.join(', ')}`);
}

const AI = /\bAI\b|人工智能|人工智慧|人工知能|인공지능|trí tuệ nhân tạo/i;
let cnChecked = 0;
for (const [key, viVal] of flat.vi) {
  const render = (l) => {
    const e = flat[l].find(([k]) => k === key);
    if (!e) return null;
    return typeof e[1] === 'function' ? e[1](...probeArgs(e[1].length)) : e[1];
  };
  const viOut = render('vi');
  const needed =
    typeof viVal === 'function' ? [...viOut.matchAll(/7777|PROBE_\d/g)].map((m) => m[0]) : [];
  for (const l of LOCALES) {
    const out = render(l);
    if (out == null) continue;
    for (const n of new Set(needed))
      if (!out.includes(n)) bad(`${l}: ${key} không dùng tham số ${n} (bản vi có)`);
    if (AI.test(out)) bad(`${l}: ${key} nhắc "AI" (luật chữ hiển thị)`);
  }
  const tw = render('zh-tw');
  const cn = render('zh-cn');
  if (tw != null && cn != null) {
    cnChecked++;
    if (toCn(tw) !== cn)
      bad(`zh-cn lệch OpenCC(zh-tw) ở ${key}:\n      zh-cn  : ${cn}\n      OpenCC : ${toCn(tw)}`);
  }
}

// Cặp cross-sell của cron phải có chữ ở mọi ngôn ngữ.
const cs = fs.readFileSync(path.join(root, 'lib/marketing/email-cross-sell.ts'), 'utf8');
const pairs = [...cs.matchAll(/\{\s*from:\s*'([^']+)',\s*to:\s*'([^']+)'/g)].map(
  (m) => `${m[1]}>${m[2]}`
);
if (pairs.length < 5) bad(`chỉ dò thấy ${pairs.length} cặp cross-sell — regex lỗi thời?`);
for (const l of LOCALES)
  for (const pr of pairs)
    if (!S[l].crossSell.pairs[pr]) bad(`${l}: thiếu chữ cross-sell cho cặp ${pr}`);

if (errs.length) {
  console.error('✗ check:emaili18n\n  - ' + errs.join('\n  - '));
  process.exit(1);
}
console.log(
  `✓ check:emaili18n — ${LOCALES.length} ngôn ngữ · ${viKeys.length} chuỗi · ${pairs.length} cặp cross-sell · zh-cn = OpenCC(zh-tw) trên ${cnChecked} chuỗi`
);
