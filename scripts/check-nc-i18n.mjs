#!/usr/bin/env node
// scripts/check-nc-i18n.mjs — bộ dò đa ngôn ngữ của Nghiệm Chứng (W6). Chạy trên Node 20 (CI), không cần Unihan/DB.
//
// 1. CHỮ KHUNG (lib/nghiem-chung/chuoi-data.mjs): 5 ngôn ngữ cùng bộ khoá với vi, cùng tập chỗ thế `{…}`, không chuỗi rỗng
//    (trừ khoá được phép rỗng), và chuoi.zh-cn.generated.mjs KHỚP bản OpenCC của zh-tw (không lỗi thời).
// 2. BẢNG THUẬT NGỮ (lib/i18n/glossary/terms.generated.mjs): đủ 5 cột, không trùng, ja/zh-cn khớp OpenCC của zh-tw
//    (trừ ngoại lệ có chủ đích), và PHỦ MỌI sao/cung/cục mà ENGINE định nghĩa (STAR_DATA · TEN_CUNG · TRANG_SINH_SEQ ·
//    LAP_CUC_RULES) — engine thêm sao mới mà quên bảng này là bộ dò đỏ, chứ không để trang Nhật in chữ Việt.
//    "Liệt kê được thì đọc chính danh sách của nguồn" (CLAUDE.md) — không gõ tay danh sách để so.
// 3. Đột biến: tự bẻ một bản sao rồi assert bộ dò BẮT ĐƯỢC (bộ dò xanh oan nguy hơn đỏ oan).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Converter } from 'opencc-js';
import { vi, en, ja, ko, zhTw } from '../lib/nghiem-chung/chuoi-data.mjs';
import zhCn from '../lib/nghiem-chung/chuoi.zh-cn.generated.mjs';
import { GENERATED_TERMS as G } from '../lib/i18n/glossary/terms.generated.mjs';

const ROOT = process.cwd();
const errs = [];
const bad = (m) => errs.push(m);
const ph = (s) =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');

function kiemChuoi(locales) {
  const keys = Object.keys(vi);
  for (const [name, o] of Object.entries(locales)) {
    for (const k of keys) {
      if (!(k in o)) bad(`chuoi[${name}] thiếu khoá ${k}`);
      else if (typeof o[k] !== 'string' || (!o[k] && !['ong', 'ba'].includes(k)))
        bad(`chuoi[${name}].${k} rỗng`);
      else if (k === 'ngay') {
        // định dạng ngày: mỗi ngôn ngữ chọn một tập con của {d,m,y,dn,mn} (dn/mn = không đệm số 0)
        for (const v of ph(o[k]).split(','))
          if (!['d', 'm', 'y', 'dn', 'mn'].includes(v))
            bad(`chuoi[${name}].ngay có chỗ thế lạ {${v}}`);
      } else if (
        name !== 'vi' &&
        ph(o[k]) !== ph(vi[k]) &&
        !(['ong', 'ba'].includes(k) || k === 'namP')
      )
        bad(`chuoi[${name}].${k}: chỗ thế {${ph(o[k])}} ≠ vi {${ph(vi[k])}}`);
    }
    for (const k of Object.keys(o)) if (!(k in vi)) bad(`chuoi[${name}] có khoá thừa ${k}`);
  }
}
kiemChuoi({ vi, en, ja, ko, 'zh-tw': zhTw });
// namP: vi dùng {ong}, các ngôn ngữ khác được bỏ — chỉ cấm chỗ thế LẠ.
for (const [n, o] of Object.entries({ en, ja, ko, 'zh-tw': zhTw }))
  if (!/^\{ong\}$|^$/.test(ph(o.namP))) bad(`chuoi[${n}].namP có chỗ thế lạ: ${ph(o.namP)}`);

const toCnPhrase = Converter({ from: 'twp', to: 'cn' });
function kiemZhCn(src, cn) {
  for (const k of Object.keys(src))
    if (cn[k] !== toCnPhrase(src[k]))
      return `zh-cn.${k} lỗi thời so với zh-tw (chạy node scripts/gen-nc-chuoi.mjs)`;
  return Object.keys(cn).length !== Object.keys(src).length ? 'zh-cn có số khoá khác zh-tw' : null;
}
{
  const r = kiemZhCn(zhTw, zhCn);
  if (r) bad(r);
}

// ── thuật ngữ ──
const toCn = Converter({ from: 'tw', to: 'cn' });
const toJp = Converter({ from: 't', to: 'jp' });
const seen = new Set();
for (const t of G) {
  const id = `${t.k}|${t.vi}`;
  if (seen.has(id)) bad(`glossary trùng ${id}`);
  seen.add(id);
  for (const c of ['en', 'zh-tw', 'zh-cn', 'ja', 'ko'])
    if (!t[c] || typeof t[c] !== 'string') bad(`glossary ${id} thiếu cột ${c}`);
  // W25: kind 'chiemtinh' (chiêm tinh Tây) KHÔNG sinh từ chữ Hán — ja/ko viết tay (katakana/hangul + số, ngoặc, dấu cách).
  if (t.k === 'chiemtinh') {
    if (!/^[가-힣A-Z0-9 ()—·&-]+$/u.test(t.ko)) bad(`glossary ${id}: ko chiemtinh chứa ký tự lạ: ${t.ko}`);
  } else if (!/^[가-힣]+$/u.test(t.ko)) bad(`glossary ${id}: ko không thuần Hangul: ${t.ko}`);
}
// ja/zh-cn khớp OpenCC của zh-tw (ngoại lệ có chủ đích: 'Âm Lịch', 'Dương Lịch')
// W15c: GHI ĐÈ CỐ Ý (tuvi-terms.ts, cột 6) vì OpenCC dịch sai tên quẻ: 乾 (quẻ Càn) → 干 ở zh-cn (đúng là 乾);
// 豫 (quẻ Dự) → 予 ở ja (đúng là 豫). Chỉ ba mục này — thêm mục khác phải kèm lý do.
const NGOAI_LE = new Set(['khai|Âm Lịch', 'khai|Dương Lịch', 'que|Càn', 'quai|Càn', 'que|Dự']);
for (const t of G) {
  if (NGOAI_LE.has(`${t.k}|${t.vi}`) || t.k === 'gio') continue;
  if (t.k === 'chiemtinh') {
    // zh-cn vẫn phải = OpenCC(zh-tw) trừ hai ghi đè cố ý (白羊座 · 双鱼座); ja viết tay (牡羊座… hoặc katakana).
    if (t['zh-cn'] !== toCn(t['zh-tw']) && !['Bạch Dương', 'Song Ngư'].includes(t.vi))
      bad(`glossary ${t.k}|${t.vi}: zh-cn "${t['zh-cn']}" ≠ OpenCC(zh-tw)`);
    continue;
  } // 'gio': ja = 子の刻 (kiểm ở check:glossary)
  if (t['zh-cn'] !== toCn(t['zh-tw']))
    bad(`glossary ${t.k}|${t.vi}: zh-cn "${t['zh-cn']}" ≠ OpenCC(zh-tw) "${toCn(t['zh-tw'])}"`);
  if (t.ja !== toJp(t['zh-tw']))
    bad(`glossary ${t.k}|${t.vi}: ja "${t.ja}" ≠ OpenCC t→jp "${toJp(t['zh-tw'])}"`);
}

// Phủ danh sách của ENGINE
const eng = readFileSync(join(ROOT, 'public/tuvi-ansao-engine.js'), 'utf8');
const nho = (re, what) => {
  const m = eng.match(re);
  if (!m) bad(`không dò ra ${what} trong engine (đổi cấu trúc engine? sửa bộ dò)`);
  return m;
};
const has = (k, vi) => G.some((t) => t.k === k && t.vi === vi);
const hasAny = (ks, vi) => ks.some((k) => has(k, vi));
{
  const i = eng.indexOf('STAR_DATA = {');
  if (i < 0) bad('không thấy STAR_DATA trong engine');
  else {
    const blk = eng.slice(i, eng.indexOf('\n};', i));
    const names = [...blk.matchAll(/^\s*'([^']+)'\s*:\s*\{\s*type/gm)].map((m) => m[1]);
    if (names.length < 100) bad(`STAR_DATA chỉ dò được ${names.length} sao (<100) — bộ dò hỏng`);
    for (const n of names)
      if (!hasAny(['chinh', 'sao'], n))
        bad(`glossary thiếu sao "${n}" (có trong STAR_DATA của engine)`);
  }
}
{
  const m = nho(/const TEN_CUNG = \[([^\]]+)\]/, 'TEN_CUNG');
  if (m)
    for (const n of [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
      if (!has('cung', n)) bad(`glossary thiếu cung "${n}" (TEN_CUNG của engine)`);
}
{
  const m = nho(/const TRANG_SINH_SEQ = \[([^\]]+)\]/, 'TRANG_SINH_SEQ');
  if (m)
    for (const n of [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
      if (!hasAny(['sao'], n)) bad(`glossary thiếu sao vòng Tràng Sinh "${n}"`);
}
for (const n of new Set([...eng.matchAll(/cuc:\s*'([^']+Cục)'/g)].map((m) => m[1])))
  if (!has('cuc', n)) bad(`glossary thiếu cục "${n}" (LAP_CUC_RULES của engine)`);
for (const n of ['Thủy Nhị Cục', 'Mộc Tam Cục', 'Kim Tứ Cục', 'Thổ Ngũ Cục', 'Hỏa Lục Cục'])
  if (!eng.includes(`'${n}'`)) bad(`engine không còn cục "${n}" — bộ dò lạc hậu`);
const canchi = G.filter((t) => t.k === 'canchi').length;
if (canchi !== 60) bad(`glossary có ${canchi} cặp can-chi (cần 60)`);

// ── đột biến: bộ dò phải ĐỎ khi bẻ ──
{
  const mut = { ...en };
  delete mut.titleNc;
  const e0 = errs.length;
  kiemChuoi({ vi, mut });
  if (errs.length === e0) bad('ĐỘT BIẾN: bỏ khoá chuoi mà bộ dò không bắt');
  errs.length = e0;
  const mut2 = { ...en, titleNc: en.titleNc.replace('{ten}', '{tên}') };
  kiemChuoi({ vi, mut2 });
  if (errs.length === e0) bad('ĐỘT BIẾN: đổi chỗ thế mà bộ dò không bắt');
  errs.length = e0;
  if (!kiemZhCn(zhTw, { ...zhCn, titleNc: zhCn.titleNc + 'x' }))
    bad('ĐỘT BIẾN: zh-cn lỗi thời mà bộ dò không bắt');
}

if (errs.length) {
  console.error('✗ check:nci18n\n' + errs.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(
  `✓ check:nci18n — ${Object.keys(vi).length} chuỗi × 6 ngôn ngữ, ${G.length} thuật ngữ, phủ đủ sao/cung/cục của engine.`
);
