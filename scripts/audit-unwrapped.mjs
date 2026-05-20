// Count emoji NOT inside data-icon-emoji wrapper.
// Approach: strip all <span data-icon-emoji="...">...</span> first, then count.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:\\Users\\DELL\\app-tuvi';
const SKIP_DIRS = ['node_modules', '.next', '.git', '.claude', 'dist', 'build', 'sach', '_patches', 'payos-v2', 'payos-integration', 'tuvi-engine'];
const SKIP_FILES = new Set(['sample-laso-ky-mao-1999.html', 'sample-laso-ky-mao-1999-v2.html', 'admin.html', 'admin-content.html', 'nav.js']);
const WRAPPER_RE = /<span[^>]*data-icon-emoji="[^"]*"[^>]*>[^<]*<\/span>/g;
const EMOJI_RE = /([\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}])/gu;
const KEEP = new Set(['☵','☷','☶','☴','☳','☲','☱','☰','♦','♥','♠','♣','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','⚧','✦','✧','★','☆','🟢','🟡','🔴','🟠','🟣','⚫','⚪']);

function walk(dir) {
  const out = [];
  let entries; try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_DIRS.includes(name)) continue;
    if (SKIP_FILES.has(name)) continue;
    const full = join(dir, name);
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(html|tsx?|jsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const fileMap = new Map();
for (const file of walk(ROOT)) {
  let src; try { src = readFileSync(file, 'utf8'); } catch { continue; }
  // Strip wrappers (those emoji are "handled")
  const stripped = src.replace(WRAPPER_RE, '');
  // Count remaining
  let count = 0;
  let m;
  EMOJI_RE.lastIndex = 0;
  while ((m = EMOJI_RE.exec(stripped)) !== null) {
    if (KEEP.has(m[1])) continue;
    count++;
  }
  if (count > 0) fileMap.set(file.replace(ROOT + '\\', ''), count);
}

const sorted = Array.from(fileMap.entries()).sort((a, b) => b[1] - a[1]);
const total = sorted.reduce((s, [_, c]) => s + c, 0);
console.log(`Unwrapped emoji: ${total} occurrences across ${sorted.length} files\n`);
for (const [f, c] of sorted.slice(0, 40)) console.log(`  ${String(c).padStart(3)}x  ${f}`);
