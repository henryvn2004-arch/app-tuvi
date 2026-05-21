#!/usr/bin/env node
// One-shot fixer for double-encoded UTF-8 mojibake in public/tools/*.html
// Pattern: original UTF-8 bytes were decoded as cp1252, then re-saved as UTF-8.
// Reverse: take corrupted string -> cp1252-encode -> utf8-decode.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, 'public', 'tools');

// cp1252 extras (code points that don't map identically to 0x80–0x9F bytes)
const CP1252_EXTRAS = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function strToCp1252(s) {
  const out = Buffer.alloc(s.length * 2);
  let n = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xff) {
      out[n++] = cp;
    } else if (CP1252_EXTRAS.has(cp)) {
      out[n++] = CP1252_EXTRAS.get(cp);
    } else {
      // Not encodable in cp1252; bail out by signalling
      throw new Error(`Char not in cp1252: U+${cp.toString(16)}`);
    }
  }
  return out.slice(0, n);
}

// Markers that indicate a line is mojibake-encoded
const MOJIBAKE_RE = /Ã[¡-¿]|á»|â€[—""'']|Äƒ|Æ°|áº[¿»£¥§©­¯±]|Ä[‘á]/;

function fixLine(line) {
  if (!MOJIBAKE_RE.test(line)) return { line, changed: false };
  try {
    const bytes = strToCp1252(line);
    const decoded = bytes.toString('utf8');
    // Sanity: decoded must NOT still contain mojibake markers
    if (MOJIBAKE_RE.test(decoded)) {
      return { line, changed: false, skipped: 'still-mojibake-after-fix' };
    }
    return { line: decoded, changed: true };
  } catch (e) {
    return { line, changed: false, skipped: e.message };
  }
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Preserve original line endings
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  let changed = 0;
  const skipped = [];
  for (let i = 0; i < lines.length; i++) {
    const r = fixLine(lines[i]);
    if (r.changed) {
      lines[i] = r.line;
      changed++;
    } else if (r.skipped) {
      skipped.push({ lineNo: i + 1, reason: r.skipped });
    }
  }
  if (changed > 0) {
    fs.writeFileSync(filePath, lines.join(eol), 'utf8');
  }
  return { changed, skipped };
}

const dryRun = process.argv.includes('--dry-run');
const files = fs
  .readdirSync(TARGET_DIR)
  .filter((f) => f.endsWith('.html'))
  .map((f) => path.join(TARGET_DIR, f));

let totalChanged = 0;
let totalFiles = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  if (!MOJIBAKE_RE.test(raw)) continue;
  totalFiles++;
  if (dryRun) {
    const matches = raw.split(/\r?\n/).filter((l) => MOJIBAKE_RE.test(l)).length;
    console.log(`[DRY] ${path.relative(ROOT, file)} — ${matches} mojibake lines`);
    totalChanged += matches;
    continue;
  }
  const { changed, skipped } = processFile(file);
  totalChanged += changed;
  console.log(
    `${path.relative(ROOT, file)} — fixed ${changed} line(s)${skipped.length ? `, skipped ${skipped.length}` : ''}`
  );
  for (const s of skipped) console.log(`   ! line ${s.lineNo}: ${s.reason}`);
}

console.log(
  `\n${dryRun ? 'Would fix' : 'Fixed'} ${totalChanged} line(s) across ${totalFiles} file(s).`
);
