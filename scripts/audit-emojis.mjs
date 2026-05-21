// Scan all target files, output unique emojis + their frequency + sample contexts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:\\Users\\DELL\\app-tuvi';
const SKIP_DIRS = [
  'node_modules',
  '.next',
  '.git',
  '.claude',
  'dist',
  'build',
  'sach',
  '_patches',
  'payos-v2',
  'payos-integration',
  'tuvi-engine',
];
const SKIP_FILES = new Set([
  'sample-laso-ky-mao-1999.html',
  'sample-laso-ky-mao-1999-v2.html',
  'admin.html',
  'admin-content.html',
  'nav.js', // already done
  'index.html', // already done
]);

// Pattern matches major emoji ranges + dingbats
const EMOJI_RE = /([\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}])/gu;

// These Unicode chars are NOT emoji we want to replace — leave them alone
const KEEP_LITERAL = new Set([
  '✦', // four-pointed star, decorative bullet, renders consistently
  '✧', // outlined four-pointed star
  '★',
  '☆', // common stars
  '✓',
  '✗', // simple check/cross (keep or convert? these ARE often used as icons. Let me convert)
  '⚧', // transgender, intentional
  '🟢',
  '🟡',
  '🔴',
  '🟠',
  '🟣',
  '⚫',
  '⚪', // status dot colors — better as colored circles, but keep for now
]);

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.includes(name)) continue;
    if (SKIP_FILES.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(html|tsx?|jsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const counts = new Map(); // emoji -> count
const samples = new Map(); // emoji -> Set of sample contexts (file:line + 30 chars)

for (const file of files) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    let m;
    EMOJI_RE.lastIndex = 0;
    while ((m = EMOJI_RE.exec(line)) !== null) {
      const e = m[1];
      if (KEEP_LITERAL.has(e)) continue;
      counts.set(e, (counts.get(e) || 0) + 1);
      if (!samples.has(e)) samples.set(e, []);
      if (samples.get(e).length < 3) {
        const start = Math.max(0, m.index - 20);
        const end = Math.min(line.length, m.index + 30);
        const ctx = line.substring(start, end).replace(/\s+/g, ' ');
        samples.get(e).push(`${file.replace(ROOT + '\\', '')}:${i + 1} | ${ctx}`);
      }
    }
  });
}

const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
console.log(`Found ${sorted.length} unique emojis across ${files.length} files\n`);
console.log(`Total occurrences: ${sorted.reduce((s, [_, c]) => s + c, 0)}\n`);
for (const [e, c] of sorted) {
  console.log(`${e} (U+${e.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) — ${c}x`);
  for (const s of samples.get(e)) console.log(`    ${s}`);
}
