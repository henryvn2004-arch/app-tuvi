#!/usr/bin/env node
// npm run i18n:split-markup -- public/x.js [public/y.html …] [--dry]
// Tách MÁY MÓC ra khỏi chuỗi dịch: mọi lời gọi T('js.…', '…') / _tvmbT('js.…', '…') mà câu gốc
// chứa thẻ CÓ thuộc tính (id, onclick, data-*, class…) hoặc mảnh thẻ dở ('" alt="">…', '…href="')
// được viết lại thành ('<thẻ thô>' + T('khoá', 'chữ') + '…'). Khoá dịch chỉ còn CHỮ + thẻ định
// dạng trần (<b> <i> <strong> <em> <small> <u> <br>); giá trị data-tip/aria-label/title/placeholder/
// alt/data-label có chữ thành T() riêng. Lý do: bản dịch làm rơi id= thì JS vỡ RIÊNG ở locale đó
// mà không bộ dò nào thấy (getElementById(...) null). Đọc diff trước khi commit.
import fs from 'node:fs';
import { arg } from './_common.mjs';
import { loadVi, writeJson, sortObj } from '../../lib/i18n/dict.mjs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const vi = loadVi();
const byText = new Map(
  Object.entries(vi)
    .filter(([k]) => k.startsWith('js.'))
    .map(([k, v]) => [v, k])
);
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
function keyFor(prefix, text) {
  if (byText.has(text)) return byText.get(text);
  const slug =
    fold(text.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '))
      .replace(/[^a-z0-9]+/g, '-')
      .split('-')
      .filter(Boolean)
      .slice(0, 6)
      .join('-')
      .slice(0, 40) || 'text';
  let key = `${prefix}.${slug}`;
  if (key in vi && vi[key] !== text)
    key +=
      '-' +
      Math.abs([...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))
        .toString(36)
        .slice(0, 4);
  vi[key] = text;
  byText.set(text, key);
  return key;
}

const FMT = /^<\/?(b|i|strong|em|small|u)>$|^<br\s*\/?>$/i;
const TEXTY = /[A-Za-zÀ-ỹ]{2}/;
const TEXT_ATTR = /(\s(?:data-tip|aria-label|title|placeholder|alt|data-label)=")([^"]*)"/g;
/** Câu gốc có cần tách không: có thẻ mang thuộc tính, hoặc mở/đóng giữa chừng một thẻ. */
// Mảnh ĐẦU câu là máy móc chứ không phải chữ: dấu đóng của biểu thức/thuộc tính trước đó (`) …`,
// `" …`) hoặc đuôi thẻ mở dở đang vào một thuộc tính (`" alt="Minh hoạ `).
const LEAD_ATTR = /^"\s+[\w-]+="/;
const LEAD_PUNCT = /^[)"\]]+\s*/;
export function needsSplit(s) {
  if (LEAD_ATTR.test(s) || /^[)\]]/.test(s)) return true;
  if (/<[a-z][\w-]*\s[^>]*>/i.test(s)) return true; // thẻ có thuộc tính
  const lt = s.indexOf('<');
  const gt = s.indexOf('>');
  if (gt >= 0 && (lt < 0 || gt < lt)) return true; // bắt đầu giữa một thẻ
  const llt = s.lastIndexOf('<');
  if (llt >= 0 && s.indexOf('>', llt) < 0) return true; // kết thúc giữa một thẻ
  return false;
}

const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";

/** Trả danh sách mảnh: {raw:string} | {t:string} (chữ dịch). */
function segments(s) {
  const out = [];
  const pushRaw = (r) => {
    if (!r) return;
    // giá trị thuộc tính hiển thị trong mảnh thẻ → T() riêng
    let last = 0;
    let m;
    TEXT_ATTR.lastIndex = 0;
    while ((m = TEXT_ATTR.exec(r))) {
      if (!TEXTY.test(m[2])) continue;
      const vs = m.index + m[1].length;
      out.push({ raw: r.slice(last, vs) }, { t: m[2], attr: true });
      last = vs + m[2].length;
    }
    out.push({ raw: r.slice(last) });
  };
  let rest = s;
  const la = LEAD_ATTR.exec(rest) || (/^[)\]]/.test(rest) ? LEAD_PUNCT.exec(rest) : null);
  if (la && rest.indexOf('>') < 0) {
    out.push({ raw: la[0] });
    rest = rest.slice(la[0].length);
  }
  // tiền tố nằm giữa một thẻ đang mở dở (… alt="x">)
  const lt = rest.indexOf('<');
  const gt = rest.indexOf('>');
  if (gt >= 0 && (lt < 0 || gt < lt)) {
    pushRaw(rest.slice(0, gt + 1));
    rest = rest.slice(gt + 1);
  }
  // hậu tố là thẻ mở dở (<a href=")
  let tail = '';
  const llt = rest.lastIndexOf('<');
  if (llt >= 0 && rest.indexOf('>', llt) < 0) {
    tail = rest.slice(llt);
    rest = rest.slice(0, llt);
  }
  // giữa: chữ + thẻ định dạng trần gộp thành một câu; thẻ khác đứng riêng
  const toks = rest.split(/(<[^>]*>)/);
  let run = '';
  const flush = () => {
    if (!run) return;
    if (!TEXTY.test(run.replace(/<[^>]*>/g, ''))) {
      out.push({ raw: run });
    } else {
      const lead = /^\s*/.exec(run)[0];
      const trail = /\s*$/.exec(run)[0];
      if (lead) out.push({ raw: lead });
      out.push({ t: run.slice(lead.length, run.length - trail.length) });
      if (trail) out.push({ raw: trail });
    }
    run = '';
  };
  for (const tk of toks) {
    if (!tk) continue;
    if (tk[0] === '<' && !FMT.test(tk)) {
      flush();
      pushRaw(tk);
    } else run += tk;
  }
  flush();
  pushRaw(tail);
  // gộp mảnh thô liền nhau
  const merged = [];
  for (const sg of out) {
    const prev = merged[merged.length - 1];
    if (sg.raw !== undefined && prev && prev.raw !== undefined) prev.raw += sg.raw;
    else if (sg.raw !== '' || sg.t !== undefined) merged.push(sg);
  }
  return merged;
}

let changed = 0;
const dropped = new Set();
const orig = new Map();
for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const re = /\b(T|_tvmbT)\(\s*'(js\.[\w.-]+)',\s*('(?:[^'\\]|\\.)*')\s*\)/g;
  src = src.replace(re, (all, fn, key, lit) => {
    // js.shell.* / js.nav.* đã có bản dịch từ đợt trước — không đụng (tách là mồ côi bản dịch).
    if (/^js\.(shell|nav)\./.test(key)) return all;
    const text = new Function('return ' + lit)();
    if (!needsSplit(text)) return all;
    const prefix = key.split('.').slice(0, 2).join('.');
    // Gỡ khoá cũ TRƯỚC khi đặt khoá cho mảnh, để mảnh dùng lại được tên đẹp (không hậu tố băm).
    if (key in vi) {
      orig.set(key, vi[key]);
      if (byText.get(vi[key]) === key) byText.delete(vi[key]);
      delete vi[key];
    }
    const segs = segments(text);
    // Bản vi phải ra ĐÚNG từng byte như trước (T(k, d) trả d): ghép lại mảnh phải bằng câu gốc.
    if (segs.map((sg) => (sg.raw !== undefined ? sg.raw : sg.t)).join('') !== text)
      throw new Error(`tách lệch câu gốc ở ${key}`);
    const parts = segs.map((sg) =>
      sg.raw !== undefined ? q(sg.raw) : `${fn}(${q(keyFor(prefix, sg.t))}, ${q(sg.t)})`
    );
    changed++;
    dropped.add(key);
    return parts.length === 1 ? parts[0] : '(' + parts.join(' + ') + ')';
  });
  if (!arg('dry', false)) fs.writeFileSync(file, src);
}
// Khoá cũ không còn ai gọi thì gỡ khỏi vi.json (chưa có bản dịch nào — W7 dịch sau).
const all = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
for (const k of dropped) if (all.includes(`'${k}'`) && !(k in vi)) vi[k] = orig.get(k); // còn nơi gọi chưa tách
console.log(`tách ${changed} lời gọi · vi.json ${Object.keys(vi).length} khoá`);
if (!arg('dry', false)) writeJson('vi.json', sortObj(vi));
