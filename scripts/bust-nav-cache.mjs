// One-shot script: append ?v=11 to all `/nav.js"` references in public/*.html and app/**/route.ts
// Safe replace: only matches /nav.js followed by ", never matches comments or code mentions.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:\\Users\\DELL\\app-tuvi';
const VERSION = '?v=13';
const PATTERN = /\/nav\.js\?v=12"/g;
const REPLACEMENT = `/nav.js${VERSION}"`;

// Recursively walk dir, return list of files matching predicate
function walk(dir, predicate, skip = []) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (skip.includes(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      out.push(...walk(full, predicate, skip));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

const SKIP_DIRS = ['node_modules', '.next', '.git', '.claude', 'dist', 'build'];

// Target files: *.html in public/, *.ts in app/
const htmlFiles = walk(join(ROOT, 'public'), p => p.endsWith('.html'), SKIP_DIRS);
const tsFiles = walk(join(ROOT, 'app'), p => p.endsWith('.ts') || p.endsWith('.tsx'), SKIP_DIRS);

const targets = [...htmlFiles, ...tsFiles];

let totalFiles = 0;
let totalReplacements = 0;
const changedFiles = [];

for (const file of targets) {
  const src = readFileSync(file, 'utf8');
  const matches = src.match(PATTERN);
  if (!matches) continue;
  const updated = src.replace(PATTERN, REPLACEMENT);
  // Sanity: only write if actually different
  if (updated === src) continue;
  writeFileSync(file, updated, 'utf8');
  totalFiles++;
  totalReplacements += matches.length;
  changedFiles.push({ file: file.replace(ROOT + '\\', ''), count: matches.length });
}

console.log(`Updated ${totalFiles} files, ${totalReplacements} total replacements\n`);
for (const { file, count } of changedFiles) {
  console.log(`  ${count}x  ${file}`);
}
