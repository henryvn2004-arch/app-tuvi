// Round 2 bulk replace: heading-prefix pattern + SSR template literals.
// Patterns:
//   1. <tag class="*title|heading|label|btn|hero|eyebrow|toggle|pregen*">EMOJI TEXT</tag>
//   2. <span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span> ${esc(meta.label)} → wrap with data-icon-emoji span (SSR)
//   3. icon: 'EMOJI' in JS object literals → leave (handled at render time via iconHtml)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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
  'nav.js',
]);

const DOMAIN_EMOJIS = new Set([
  '☵',
  '☷',
  '☶',
  '☴',
  '☳',
  '☲',
  '☱',
  '☰',
  '♦',
  '♥',
  '♠',
  '♣',
  '🌑',
  '🌒',
  '🌓',
  '🌔',
  '🌕',
  '🌖',
  '🌗',
  '🌘',
  '⚧',
  '⚥',
  '⚦',
  '♂',
  '♀',
  '✦',
  '✧',
  '★',
  '☆',
  '🟢',
  '🟡',
  '🔴',
  '🟠',
  '🟣',
  '⚫',
  '⚪',
]);

const EMOJI_RE = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{1F000}-\\u{1F9FF}](?:\\uFE0F)?';

// Pattern A: <tag class="...{title|heading|label|btn|hero|eyebrow|pregen|toggle|subtitle|tag|section}...">EMOJI TEXT...
// Must have at least one Vietnamese word character after the emoji + space
const HEADING_PREFIX_RE = new RegExp(
  '(<\\w+\\s[^>]*\\bclass="[^"]*(?:title|heading|label|tab-btn|hero|eyebrow|pregen|toggle|subtitle|hero-tag|section-title|card-title|tab-content)[^"]*"[^>]*>)(\\s*)(' +
    EMOJI_RE +
    ')(\\s+)([\\w\\u00C0-\\uFFFF])',
  'gu'
);

// Pattern B: <span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span> inside SSR template literal — replace with span wrap
// Match: <span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span> (optional space) (text or another token)
const SSR_META_ICON_RE = /\$\{meta\.icon\}/g;

// Pattern C: icon: 'EMOJI' in JS objects → leave the data, but ensure render path uses iconHtml
// We'll just leave these — they get translated at render time via iconHtml.

const REPLACE = (emoji) =>
  `<span class="ic-inline" data-icon-emoji="${emoji}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${emoji}</span>`;

const targets = [];
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
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
    if (st.isDirectory()) walk(full);
    else if (/\.(html|tsx?|jsx?|mjs)$/.test(name)) targets.push(full);
  }
}
walk(ROOT);

let totalFiles = 0;
let totalReplacements = 0;
const changedFiles = [];

for (const file of targets) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  let count = 0;
  const before = src;

  // Pattern A: heading-prefix emoji
  src = src.replace(HEADING_PREFIX_RE, (m, openTag, ws1, emoji, ws2, firstCh) => {
    if (DOMAIN_EMOJIS.has(emoji)) return m;
    count++;
    return openTag + ws1 + REPLACE(emoji) + ws2 + firstCh;
  });

  // Pattern B: SSR meta.icon → span wrap
  // Replace `<span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span>` with `<span data-icon-emoji="<span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span>"><span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span></span>`
  src = src.replace(
    SSR_META_ICON_RE,
    '<span class="ic-inline" data-icon-emoji="<span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span>" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A"><span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span></span>'
  );
  // Count those too — different counter for this
  const ssrMatches = before.match(SSR_META_ICON_RE);
  if (ssrMatches) count += ssrMatches.length;

  if (src !== before) {
    writeFileSync(file, src, 'utf8');
    totalFiles++;
    totalReplacements += count;
    changedFiles.push({ file: file.replace(ROOT + '\\', ''), count });
  }
}

console.log(`Replaced in ${totalFiles} files, ${totalReplacements} total\n`);
for (const { file, count } of changedFiles.sort((a, b) => b.count - a.count)) {
  console.log(`  ${String(count).padStart(3)}x  ${file}`);
}
