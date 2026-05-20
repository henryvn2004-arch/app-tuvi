// Bulk replace emoji in safe contexts only.
// Patterns matched (SAFE — emoji is a UI icon, not body content):
//   1. <SOMETAG class="X-icon[Y]">EMOJI</SOMETAG>           — common tile/card icon
//   2. <SOMETAG class="X-icon[Y]" id=...>EMOJI</SOMETAG>    — with attrs
//   3. <SOMETAG class="icon-X[Y]">EMOJI</SOMETAG>           — icon-* class
//   4. >EMOJI [VIETNAMESE_TEXT]<  inside class="*title*" / "*heading*" / "*label*" / "tab-btn"
// Skip: body text, comments, code strings inside <code>/<pre>, CSS content, JS object data
//
// Replacement: <span data-icon-emoji="EMOJI" class="ic-inline"></span>EMOJI is kept
// inside the span as text fallback; client mountIcons swaps to SVG.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:\\Users\\DELL\\app-tuvi';
const SKIP_DIRS = ['node_modules', '.next', '.git', '.claude', 'dist', 'build', 'sach', '_patches', 'payos-v2', 'payos-integration', 'tuvi-engine'];
const SKIP_FILES = new Set([
  'sample-laso-ky-mao-1999.html',
  'sample-laso-ky-mao-1999-v2.html',
  'admin.html',
  'admin-content.html',
  'nav.js',
  'index.html', // already done in Phase 1
]);

// Emojis we KNOW are domain content (NOT UI icons) — skip
const DOMAIN_EMOJIS = new Set([
  '☵','☷','☶','☴','☳','☲','☱','☰',  // Bagua trigrams (I Ching)
  '♦','♥','♠','♣',                    // Card suits
  '🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘', // Moon phases
  '⚧','⚥','⚦','♂','♀',               // Gender symbols
  '✦','✧','★','☆',                    // Decorative stars
  '✓','✗','✕','✘',                    // simple checks/X — keep small inline as text
  '🟢','🟡','🔴','🟠','🟣','⚫','⚪',   // Status dot colors
]);

// Pattern: emoji in opening to closing tag where class contains -icon or icon-
// Greedy: match emoji-only content (allow whitespace + emoji + whitespace)
// Single-character emoji (supplementary plane uses 2 UTF-16 code units, handled via /u flag and surrogate ranges)
const EMOJI_RE_SOURCE = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{1F000}-\\u{1F9FF}](?:\\uFE0F)?';

// Pattern 1: <tag class="...-icon..." [attrs...]>WHITESPACE? EMOJI WHITESPACE?</tag>
//   Example: <div class="tool-card-icon"><span class="ic-inline" data-icon-emoji="🔮" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🔮</span></div>
//            <span class="hero-icon"><span class="ic-inline" data-icon-emoji="📊" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📊</span></span>
const ICON_TAG_RE = new RegExp(
  '(<\\w+\\s[^>]*\\bclass="[^"]*(?:-icon|icon-|tile-icon|tool-icon|hero-icon|hub-card-icon|free-tile-icon|tvc-paywall-icon|xt-note-icon|upload-icon|rec-icon|icon-sm|ic-)[^"]*"[^>]*>)(\\s*)(' + EMOJI_RE_SOURCE + ')(\\s*)(</\\w+>)',
  'gu'
);

// Pattern 2: <a class="..." href="...">EMOJI TEXT</a>  (tool-card links in hub pages)
// More restrictive — only match when class contains -card or tool-link
const CARD_PREFIX_RE = new RegExp(
  '(<a\\s[^>]*\\bclass="[^"]*(?:tool-card|tool-link|hub-link|tile-link)[^"]*"[^>]*>)(\\s*)(' + EMOJI_RE_SOURCE + ')(\\s+)',
  'gu'
);

const targets = [];
function walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP_DIRS.includes(name)) continue;
    if (SKIP_FILES.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full);
    else if (/\.(html|tsx?|jsx?|mjs)$/.test(name)) targets.push(full);
  }
}
walk(ROOT);

const REPLACEMENT_WRAPPER = (emoji) =>
  `<span class="ic-inline" data-icon-emoji="${emoji}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${emoji}</span>`;

let totalFiles = 0;
let totalReplacements = 0;
const changedFiles = [];

for (const file of targets) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  let count = 0;
  const before = src;

  // Pattern 1: icon class wrappers
  src = src.replace(ICON_TAG_RE, (match, openTag, ws1, emoji, ws2, closeTag) => {
    if (DOMAIN_EMOJIS.has(emoji)) return match;
    count++;
    return openTag + ws1 + REPLACEMENT_WRAPPER(emoji) + ws2 + closeTag;
  });

  // Pattern 2: card-link prefix emoji
  src = src.replace(CARD_PREFIX_RE, (match, openTag, ws1, emoji, ws2) => {
    if (DOMAIN_EMOJIS.has(emoji)) return match;
    count++;
    return openTag + ws1 + REPLACEMENT_WRAPPER(emoji) + ws2;
  });

  if (src !== before) {
    writeFileSync(file, src, 'utf8');
    totalFiles++;
    totalReplacements += count;
    changedFiles.push({ file: file.replace(ROOT + '\\', ''), count });
  }
}

console.log(`Replaced in ${totalFiles} files, ${totalReplacements} total UI icon replacements\n`);
for (const { file, count } of changedFiles.sort((a, b) => b.count - a.count)) {
  console.log(`  ${String(count).padStart(3)}x  ${file}`);
}
