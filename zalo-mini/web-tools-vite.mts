// Hai việc lúc build cho công cụ chạy trong Mini App (src/lib/web-tools.ts):
//
// 1. `public/tools-shared/*.js` là UMD: `typeof module !== 'undefined' && module.exports`
//    ? CommonJS : gắn lên `window`. Rollup buộc chữ `module` tự do đó vào biến
//    `module` của một gói CommonJS khác trong bundle ⇒ module ghi vào `exports` của
//    gói kia, `window.KimLauTool` không bao giờ có (đo 2026-09-30: màn trắng). Bọc
//    `(function(module){…})(undefined)` ⇒ luôn đi nhánh `window`, dev lẫn build.
//
// 2. `virtual:web-tools.css` — CSS kết quả của các công cụ chạy ngay trong Mini App,
// ĐỌC LÚC BUILD từ chính trang web (`public/app-<trang>.html` <style> + biến màu
// `:root` sáng của `public/shell.css`). Không chép tay: web đổi giao diện kết quả
// thì build lại Mini App là theo (HTML kết quả cũng do chính `public/tools-shared/*.js`
// dựng — xem src/lib/web-tools.ts).
//
// Mỗi trang được "nhốt" dưới `.tvw-<id>` để CSS các trang không đè nhau (trang nào
// cũng tự định nghĩa `.res-block`, `.err`…). Không dùng CSS nesting: webview Zalo
// trên Android cũ (Chrome < 112) không hiểu.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** id công cụ (tool_id của web) → trang web chứa CSS kết quả. */
export const WEB_TOOL_PAGES: Record<string, string> = {
  'kim-lau': 'app-kim-lau.html',
  'bat-trach': 'app-bat-trach.html',
  'nap-am': 'app-nap-am.html',
  'xem-tuoi-sinh-con': 'app-sinh-con.html',
  'than-so-hoc': 'app-than-so-hoc.html',
  'kinh-dich': 'app-kinh-dich.html',
};

const ID = 'virtual:web-tools.css';
const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));

/** Cắt `a{…}` cấp ngoài cùng; `@media`/`@supports` thì nhốt đệ quy phần trong. */
export function scopeCss(css: string, scope: string): string {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const prelude = css.slice(i, open).trim();
    const body = css.slice(open + 1, j - 1);
    i = j;
    if (!prelude) continue;
    if (/^@(media|supports)\b/.test(prelude)) out += `${prelude}{${scopeCss(body, scope)}}\n`;
    else if (prelude.startsWith('@')) out += `${prelude}{${body}}\n`; // @keyframes, @font-face
    else out += `${splitSelectors(prelude).map((s) => scoped(s, scope)).join(',')}{${body}}\n`;
  }
  return out;
}

function splitSelectors(prelude: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of prelude) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && !depth) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function scoped(sel: string, scope: string): string {
  const m = /^(html|body|:root)\b(.*)$/.exec(sel);
  if (m) return `${scope}${m[2]}`;
  return `${scope} ${sel}`;
}

function pageStyles(file: string): string {
  const html = readFileSync(resolve(PUBLIC, file), 'utf8');
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/** Khối `:root{…}` ĐẦU TIÊN của shell.css = bảng màu sáng (khối sau là dark). */
function shellVars(): string {
  const css = readFileSync(resolve(PUBLIC, 'shell.css'), 'utf8');
  const m = /:root\s*\{([^}]*)\}/.exec(css);
  if (!m) throw new Error('web-tools: không thấy :root trong public/shell.css');
  return m[1]!.replace(/\/\*[\s\S]*?\*\//g, '');
}

const SHARED = /[\\/]public[\\/]tools-shared[\\/][^\\/]+\.js$/;

export function webTools(): Plugin {
  return {
    name: 'tvmb-web-tools',
    enforce: 'pre',
    transform(code, id) {
      if (!SHARED.test(id.split('?')[0]!)) return null;
      return { code: `(function (module) {\n${code}\n})(undefined);\n`, map: null };
    },
    resolveId: (id) => (id === ID ? `\0${ID}` : null),
    load(id) {
      if (id !== `\0${ID}`) return null;
      this.addWatchFile(resolve(PUBLIC, 'shell.css'));
      let css = `.tvw{${shellVars()}}\n`;
      for (const [tool, file] of Object.entries(WEB_TOOL_PAGES)) {
        this.addWatchFile(resolve(PUBLIC, file));
        const own = pageStyles(file);
        if (!own.trim()) throw new Error(`web-tools: ${file} không có <style>`);
        css += scopeCss(own, `.tvw-${tool}`);
      }
      return css;
    },
  };
}
