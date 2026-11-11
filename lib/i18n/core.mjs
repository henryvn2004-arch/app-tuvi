// lib/i18n/core.mjs — LÕI dịch HTML phía server, Node thuần (không phụ thuộc gì).
// Viết bằng .mjs để CẢ route Next (TS) LẪN scripts/i18n/*.mjs (Node 20, không
// có ts) import chung MỘT bản — không chép logic sang chỗ thứ hai.
//
// Quy ước đánh dấu trong HTML tĩnh (nguồn chữ Việt vẫn nằm trong HTML, làm
// fallback; từ điển ở i18n/vi.json):
//   <p data-i18n="home.hero-title">Chữ Việt</p>
//        → thay NỘI DUNG (innerHTML) bằng bản dịch. Giá trị từ điển là mảnh
//          HTML tin cậy (cho phép <b>, <br>, &nbsp;…).
//   <input data-i18n-attr="placeholder:form.name;title:form.name-tip">
//        → thay thuộc tính (giá trị là chữ thuần, tự escape).
//   <title data-i18n="…">, <meta name="description" data-i18n-attr="content:…">
// Khoá bắt đầu bằng `js.` là chữ do JS phía client dựng (shell, toast…): server
// nhúng chúng vào trang qua <script id="tvmb-i18n"> để `TVMB_I18N.t()` đọc.

import { createHash } from 'node:crypto';

/** Băm câu gốc tiếng Việt → biết câu nào đã đổi sau khi đã dịch. */
export function hashVi(text) {
  return createHash('sha1').update(String(text)).digest('hex').slice(0, 8);
}

const ATTR = `(?:"[^"]*"|'[^']*'|[^>"'])*`;
// Một lượt quét: comment | script | style | thẻ mở | thẻ đóng.
const TOKEN = new RegExp(
  `<!--[\\s\\S]*?-->|<script\\b[\\s\\S]*?<\\/script\\s*>|<style\\b[\\s\\S]*?<\\/style\\s*>|<([a-zA-Z][\\w:-]*)(${ATTR})>|<\\/([a-zA-Z][\\w:-]*)\\s*>`,
  'g'
);
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

export function getAttr(attrs, name) {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = re.exec(attrs);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

const escAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const unescAttr = (s) =>
  String(s)
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

function setAttr(attrs, name, value) {
  const re = new RegExp(`(\\s)${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, 'i');
  const v = `${name}="${escAttr(value)}"`;
  return re.test(attrs) ? attrs.replace(re, (_m, sp) => sp + v) : `${attrs} ${v}`;
}

/** Cặp "attr:key" trong data-i18n-attr, ngăn cách bằng `;`. */
export function parseAttrSpec(spec) {
  return String(spec || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf(':');
      return i > 0 ? { attr: p.slice(0, i).trim(), key: p.slice(i + 1).trim() } : null;
    })
    .filter(Boolean);
}

/**
 * Duyệt HTML, trả về danh sách phần tử có data-i18n / data-i18n-attr kèm vị
 * trí. KHÔNG sửa gì. Dùng chung cho dịch, đếm khoá, bộ dò.
 */
export function scanElements(html) {
  const out = [];
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(html))) {
    if (!m[1]) continue; // comment/script/style/thẻ đóng lạc
    const name = m[1].toLowerCase();
    const attrs = m[2] || '';
    const key = getAttr(attrs, 'data-i18n');
    const attrSpec = getAttr(attrs, 'data-i18n-attr');
    if (key === undefined && attrSpec === undefined) continue;
    const el = {
      name,
      openStart: m.index,
      openEnd: m.index + m[0].length,
      attrs,
      key: key !== undefined ? key.trim() : undefined,
      attrPairs: attrSpec !== undefined ? parseAttrSpec(attrSpec) : [],
      innerStart: -1,
      innerEnd: -1,
    };
    if (el.key !== undefined && !VOID.has(name)) {
      // Tìm thẻ đóng khớp theo độ sâu của CÙNG tên thẻ.
      const save = TOKEN.lastIndex;
      let depth = 1;
      let t;
      while ((t = TOKEN.exec(html))) {
        if (t[1] && t[1].toLowerCase() === name && !/\/\s*$/.test(t[2] || '')) depth++;
        else if (t[3] && t[3].toLowerCase() === name && --depth === 0) {
          el.innerStart = el.openEnd;
          el.innerEnd = t.index;
          break;
        }
      }
      // Không bỏ qua phần tử lồng: data-i18n lồng trong data-i18n là sai quy ước,
      // phần trong bị thay nguyên khối. Đặt con trỏ SAU thẻ đóng.
      if (el.innerStart < 0) TOKEN.lastIndex = save;
    }
    out.push(el);
  }
  return out;
}

/** Mọi khoá mà một trang HTML dùng (data-i18n + data-i18n-attr). */
export function collectKeys(html) {
  const keys = new Set();
  for (const el of scanElements(html)) {
    if (el.key) keys.add(el.key);
    for (const p of el.attrPairs) keys.add(p.key);
  }
  return keys;
}

/**
 * Dịch HTML. `get(key)` trả bản dịch (string) hoặc undefined nếu chưa có.
 * Trả về { html, used:Set, missing:Set }.
 * Khoá thiếu → giữ nguyên chữ Việt trong HTML (người gọi quyết định noindex).
 */
export function translateHtml(html, get) {
  const used = new Set();
  const missing = new Set();
  const edits = []; // { start, end, text }
  for (const el of scanElements(html)) {
    if (el.key && el.innerStart >= 0) {
      used.add(el.key);
      const t = get(el.key);
      if (t === undefined) missing.add(el.key);
      else edits.push({ start: el.innerStart, end: el.innerEnd, text: t });
    } else if (el.key) {
      used.add(el.key); // phần tử rỗng/void khai khoá: vẫn tính là dùng
    }
    if (el.attrPairs.length) {
      let attrs = el.attrs;
      let changed = false;
      for (const p of el.attrPairs) {
        used.add(p.key);
        const t = get(p.key);
        if (t === undefined) missing.add(p.key);
        else {
          attrs = setAttr(attrs, p.attr, t);
          changed = true;
        }
      }
      if (changed)
        edits.push({ start: el.openStart, end: el.openEnd, text: `<${el.name}${attrs}>` });
    }
  }
  return { html: applyEdits(html, edits), used, missing };
}

export function applyEdits(html, edits) {
  if (!edits.length) return html;
  edits.sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  for (const e of edits) {
    if (e.start < pos) continue; // chồng lấn (data-i18n lồng nhau): bỏ cái trong
    out += html.slice(pos, e.start) + e.text;
    pos = e.end;
  }
  return out + html.slice(pos);
}

/**
 * Viết lại href nội bộ của <a>. `map(href)` trả href mới hoặc undefined (giữ).
 * Chạy SAU translateHtml để cũng phủ link nằm trong bản dịch.
 */
export function rewriteAnchors(html, map) {
  const edits = [];
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(html))) {
    if (!m[1] || m[1].toLowerCase() !== 'a') continue;
    const href = getAttr(m[2] || '', 'href');
    if (!href) continue;
    const next = map(unescAttr(href));
    if (next && next !== href) {
      edits.push({
        start: m.index,
        end: m.index + m[0].length,
        text: `<a${setAttr(m[2], 'href', next)}>`,
      });
    }
  }
  return applyEdits(html, edits);
}

/** Bóc thẻ trong một mảnh HTML để so cấu trúc câu gốc/bản dịch. */
// Thuộc tính MÁY dùng (JS tìm theo id, gắn handler, đọc data-*): bản dịch phải giữ NGUYÊN cả tên
// lẫn giá trị. So mỗi tên thẻ thì bản dịch làm rơi id= vẫn qua, rồi getElementById(...) null làm vỡ
// JS RIÊNG ở locale đó (W13). Thuộc tính chữ (title, alt, aria-label…) được phép dịch nên không so.
const MACHINE_ATTR = /\s((?:id|on[a-z]+|data-[\w-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))/gi;
export function tagSignature(fragment) {
  const tags = [];
  const re = /<\/?([a-zA-Z][\w-]*)\b[^>]*>/g;
  let m;
  while ((m = re.exec(fragment))) {
    const attrs = [...m[0].matchAll(MACHINE_ATTR)].map((a) => a[1].replace(/\s*=\s*/, '=')).sort();
    tags.push(
      (m[0][1] === '/' ? '/' : '') +
        m[1].toLowerCase() +
        (attrs.length ? `[${attrs.join(' ')}]` : '')
    );
  }
  return tags.sort().join(',');
}

/** Token {…}/%s/%d/{{…}} phải còn nguyên sau khi dịch. */
export function placeholderSignature(text) {
  const found = String(text).match(/\{\{?[\w.]+\}?\}|%[sd]|\$\{[^}]+\}/g) || [];
  return found.sort().join(',');
}

// Khoảng trắng ĐẦU/CUỐI của câu gốc là một phần của phép ghép chuỗi ở JS ('Còn ' + n + ' câu'):
// bản dịch mất nó thì ở runtime hai mảnh dính vào nhau. Người dịch/LLM hay trim ⇒ i18n:save tự
// trả lại khoảng trắng biên của câu gốc (padEdges) và bộ dò từ chối bản lệch.
// Ngoại lệ: bản dịch BẮT ĐẦU/KẾT THÚC bằng dấu câu toàn khổ CJK (。，、？！：；（）「」… ) thì phía đó KHÔNG đệm
// khoảng trắng — dấu toàn khổ đã có khoảng cách riêng, thêm dấu cách ra "）。 " lệch hàng. Áp cho mọi locale.
const CJK_PUNCT = /[\u3001-\u303F\u2026\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65]/;
const edgeOf = (s) => [/^\s*/.exec(s)[0], /\s*$/.exec(s)[0]];
// Khoảng trắng biên MONG ĐỢI cho bản dịch t của câu gốc vi.
const wantEdge = (vi, t) => {
  const [a, b] = edgeOf(String(vi));
  const c = String(t).trim();
  // Chỉ bỏ dấu cách/tab; xuống dòng ở biên (vd '\n｜…') là bố cục, giữ nguyên.
  const h = (e) => e.replace(/[ \t\u00a0]+/g, '');
  return [CJK_PUNCT.test(c[0]) ? h(a) : a, CJK_PUNCT.test(c[c.length - 1]) ? h(b) : b];
};
/** Bản dịch t có khoảng trắng biên hợp lệ so với câu gốc vi không (dạng cũ đệm đủ HOẶC dạng mới theo CJK_PUNCT). */
export function edgeOk(vi, t) {
  const e = edgeOf(t).join('|');
  return e === edgeOf(String(vi)).join('|') || e === wantEdge(vi, t).join('|');
}
export function padEdges(vi, t) {
  if (typeof t !== 'string' || !t.trim()) return t;
  const [a, b] = wantEdge(vi, t);
  return a + t.trim() + b;
}

/** Kiểm một bản dịch so với câu gốc. Trả chuỗi lỗi hoặc null. */
export function validateTranslation(vi, t, locale, { same = false } = {}) {
  if (typeof t !== 'string' || !t.trim()) return 'rỗng';
  // Chấp nhận cả dạng cũ (đệm đủ như câu gốc) lẫn dạng mới (bỏ dấu cách cạnh dấu toàn khổ): bản ja/ko đã lưu
  // trước khi có ngoại lệ không bị đỏ; lần i18n:save sau sẽ tự chuẩn hoá.
  if (!edgeOk(vi, t))
    return 'khoảng trắng đầu/cuối lệch câu gốc (mảnh ghép sẽ dính chữ) — i18n:save tự sửa, đừng sửa tay JSON';
  if (tagSignature(vi) !== tagSignature(t))
    return `thẻ HTML lệch (gốc: ${tagSignature(vi) || '—'} / dịch: ${tagSignature(t) || '—'})`;
  if (placeholderSignature(vi) !== placeholderSignature(t))
    return 'token {…}/%s lệch so với câu gốc';
  // Chép nguyên câu gốc = chưa dịch (câu không có chữ cái, vd "→ 3", thì được).
  if (!same && t.trim() === vi.trim() && /[A-Za-zÀ-ỹ]{2}/.test(vi))
    return 'giống hệt câu gốc (chưa dịch; tên riêng/thương hiệu giữ nguyên thì thêm "same":true)';
  // Tên riêng Latin có thể còn dấu ("Tử Vi" giữ nguyên là chuyện được phép); với
  // ngôn ngữ CJK thì chữ Việt dài trong bản dịch gần như chắc chắn là sót.
  if (['ja', 'ko', 'zh-tw', 'zh-cn'].includes(locale) && (t.match(VI_DIACRITIC_G) || []).length > 6)
    return 'còn nhiều chữ Việt có dấu';
  return null;
}

const VI_DIACRITIC = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const VI_DIACRITIC_G = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/gi;
/** true nếu chuỗi còn dấu tiếng Việt (dùng để bắt bản dịch chép nguyên câu gốc). */
export function hasVietnamese(text) {
  return VI_DIACRITIC.test(text);
}

export { normPath } from './links.mjs';
