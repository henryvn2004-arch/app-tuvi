// Update nav.js: replace ICONS block with new 69-icon version,
// add EMOJI_TO_ICON map + iconHtml helper if not present, bump version.
import { readFileSync, writeFileSync } from 'node:fs';

const NAV = 'C:\\Users\\DELL\\app-tuvi\\public\\nav.js';
const ICONS_OUT = 'C:\\Users\\DELL\\AppData\\Local\\Temp\\icons-output.js';

let nav = readFileSync(NAV, 'utf8');
const iconsContent = readFileSync(ICONS_OUT, 'utf8');

// Extract the ICONS block from generated file (everything from `var ICONS` to closing `};`)
const newIconsMatch = iconsContent.match(/var ICONS = \{[\s\S]*?\n  \};/);
if (!newIconsMatch) throw new Error('Cannot find ICONS block in generated file');
const newIconsBlock = newIconsMatch[0];

// Replace old ICONS block in nav.js — match anything from `var ICONS = {` to `};` at indent level
const oldIconsRe = /  var ICONS = \{[\s\S]*?\n  \};/;
if (!oldIconsRe.test(nav)) throw new Error('Cannot find existing ICONS block in nav.js');
nav = nav.replace(oldIconsRe, '  ' + newIconsBlock);

// Update count comment
nav = nav.replace(/\/\/ Auto-generated from lucide-static v1\.16\.0 — \d+ icons/, '// Auto-generated from lucide-static v1.16.0 — 78 icons');

// Bump version comment — always to v13 for the current rollout
nav = nav.replace(/(\/\/ nav\.js — Shared navigation component) v\d+ \([^)]*\)/, '$1 v13 (Lucide icons + iconHtml + EMOJI_TO_ICON map)');

// Always replace EMOJI_TO_ICON block (idempotent — easy to extend over time)
const EMOJI_BLOCK_RE = /\n  \/\/ Map common emoji[\s\S]*?window\.iconHtml = iconHtml;\n/;
nav = nav.replace(EMOJI_BLOCK_RE, '\n');  // strip old block if exists
if (!nav.includes('var EMOJI_TO_ICON')) {
  const injection = `
  // Map common emoji → Lucide key for runtime translation of legacy data
  var EMOJI_TO_ICON = {
    '🔮':'sparkles','✨':'sparkles','🔯':'sparkles','💑':'heart-handshake','🤝':'handshake',
    '📊':'bar-chart-3','📈':'trending-up','📉':'trending-up','☀':'sun','☀️':'sun','⚡':'zap',
    '⚗':'gem','💎':'gem','🗓':'calendar-days','📅':'calendar','📌':'pin','🔄':'rotate-cw','🌀':'tornado',
    '😊':'smile','🙂':'smile','😀':'smile','👁':'eye','👁️':'eye','✋':'hand','🎤':'mic','🎙':'mic','🌅':'sunrise',
    '🧭':'compass','🧿':'compass','🖥':'monitor','🖥️':'monitor','💻':'monitor','🏪':'store','🏠':'home','🏢':'building-2',
    '🎨':'palette','💄':'palette','👗':'shirt','👔':'shirt','👚':'shirt','🧴':'droplet','💧':'droplet',
    '👶':'baby','🍼':'baby','❤':'heart','❤️':'heart','💖':'heart','💕':'heart','💚':'heart','💛':'heart','💙':'heart','💜':'heart','🖤':'heart','🤍':'heart','🤎':'heart',
    '📜':'scroll-text','📖':'book-open','📚':'book-open','🔢':'hash','#️⃣':'hash','☯':'aperture','☯️':'aperture',
    '🃏':'wallet-cards','🂠':'spade','✍':'pen-line','✍️':'pen-line','📝':'file-text','📄':'file-text','📃':'file-text',
    '💇':'scissors','✂':'scissors','✂️':'scissors',
    '⚙':'settings','⚙️':'settings','🔍':'search','🔎':'search','🔗':'link','📋':'clipboard','📎':'clipboard',
    '🎂':'cake','💼':'briefcase','💰':'dollar-sign','💵':'dollar-sign','💸':'dollar-sign','💳':'wallet',
    '⚠':'alert-triangle','⚠️':'alert-triangle','❌':'x-circle','✕':'x','❎':'x-circle',
    '✓':'check','✔':'check','✔️':'check','✅':'check-circle',
    '💡':'lightbulb','💬':'message-circle','💭':'message-circle','🗯':'message-circle','🔒':'lock','🔓':'lock','🔐':'lock',
    '🌟':'star','⭐':'star','🌸':'flower','🌺':'flower','🌹':'flower','🌷':'flower','🌻':'flower','🌼':'flower',
    '🌿':'leaf','🍀':'leaf','🌱':'leaf','🌲':'leaf','🌳':'leaf','🍃':'leaf',
    '🔥':'flame','📷':'camera','📸':'camera','🎥':'camera',
    '🚪':'door-open','🌊':'waves','📦':'package','🛍':'package','🛍️':'package','📤':'package','📥':'package',
    '🏮':'lamp','🏆':'trophy','🥇':'trophy','🏅':'award','🎖':'award','🎖️':'award',
    '👑':'crown','🌙':'moon','🌐':'globe','✉':'mail','✉️':'mail','👓':'glasses','💪':'dumbbell','🌈':'rainbow','⚓':'anchor',
    '🎵':'music','🎶':'music','🎼':'music',
    '➡':'chevron-down','➡️':'chevron-down','⬆':'chevron-down','⬇':'chevron-down','⬅':'chevron-down','↗':'chevron-down','↘':'chevron-down','↙':'chevron-down','↖':'chevron-down'
  };

  function iconHtml(raw, fallback) {
    if (!raw) return fallback || ICONS['sparkles'] || '';
    if (ICONS[raw]) return ICONS[raw];
    var key = EMOJI_TO_ICON[raw];
    if (key && ICONS[key]) return ICONS[key];
    return raw;
  }
  window.EMOJI_TO_ICON = EMOJI_TO_ICON;
  window.iconHtml = iconHtml;
`;
  // Insert right after window.mountIcons = mountIcons; line
  nav = nav.replace(
    /(window\.mountIcons = mountIcons;)/,
    `$1\n${injection}`
  );
}

// Also update mountIcons to also handle [data-icon-emoji] (emoji-based input)
if (!nav.includes('data-icon-emoji')) {
  nav = nav.replace(
    /(function mountIcons\(root\) \{[\s\S]*?\n  \})/,
    `function mountIcons(root) {
    var scope = root || document;
    // Pass 1: explicit data-icon="key"
    var nodes = scope.querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.firstElementChild && el.firstElementChild.tagName.toLowerCase() === 'svg') continue;
      var key = el.getAttribute('data-icon');
      if (ICONS[key]) el.innerHTML = ICONS[key];
    }
    // Pass 2: data-icon-emoji="🔮" (legacy emoji-based)
    var enodes = scope.querySelectorAll('[data-icon-emoji]');
    for (var j = 0; j < enodes.length; j++) {
      var eel = enodes[j];
      if (eel.firstElementChild && eel.firstElementChild.tagName.toLowerCase() === 'svg') continue;
      var emoji = eel.getAttribute('data-icon-emoji');
      var ekey = EMOJI_TO_ICON[emoji];
      if (ekey && ICONS[ekey]) eel.innerHTML = ICONS[ekey];
      else eel.textContent = emoji;
    }
  }`
  );
}

writeFileSync(NAV, nav, 'utf8');
console.log(`Updated nav.js — size now ${nav.length} bytes`);
console.log(`ICONS entries: ${(nav.match(/'<svg/g) || []).length}`);
console.log(`EMOJI_TO_ICON entries: ${(nav.match(/'[\uD83C-􏰀-\uDFFF☀-➿][^']*':'/g) || []).length} (approx)`);
