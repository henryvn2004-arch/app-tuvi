// One-shot script: read /tmp/lucide/*.svg, extract inner content, emit JS ICONS map.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'C:\\Users\\DELL\\AppData\\Local\\Temp\\lucide';
const files = readdirSync(DIR).filter(f => f.endsWith('.svg')).sort();

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const entries = [];
for (const file of files) {
  const name = file.replace(/\.svg$/, '');
  const raw = readFileSync(join(DIR, file), 'utf8');
  // Extract everything between the first ">" after <svg and the closing </svg>
  const m = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  if (!m) {
    console.error('FAIL', file);
    continue;
  }
  // Minify inner: collapse whitespace, remove leading/trailing space
  const inner = m[1]
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n/g, '')
    .trim();
  const minified = wrap(inner);
  entries.push(`    '${name}': '${minified.replace(/'/g, "\\'")}'`);
}

const out = `// Auto-generated from lucide-static v1.16.0 — ${entries.length} icons\nvar ICONS = {\n${entries.join(',\n')}\n  };\n`;
writeFileSync('C:\\Users\\DELL\\AppData\\Local\\Temp\\icons-output.js', out);
console.log(`Wrote ${entries.length} icons, total ${out.length} bytes`);
console.log('--- preview ---');
console.log(out.slice(0, 800));
