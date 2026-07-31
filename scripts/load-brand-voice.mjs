// scripts/load-brand-voice.mjs
// =============================================================
// Đồng bộ docs/BRAND-VOICE.md → Supabase brand_voice_docs (brand memory).
//
// NGUỒN CHUẨN là file trong repo. Bảng DB chỉ là bản phái sinh để pipeline
// run-time đọc. Sửa văn bản thì sửa file rồi chạy lại script này.
//
// Ghi 2 loại dòng:
//   kind='full'    → trọn guideline, dùng CHÈN THẲNG vào system prompt
//                    (style guide phải vào nguyên khối; lấy 6 mảnh rời qua RAG
//                     sẽ ra "luật 7 và luật 12" mà thiếu luật 1)
//   kind='section' → từng mục `##`, CÓ embedding, để tra ngữ nghĩa từng luật
//
// Usage:
//   export SUPABASE_URL=... SUPABASE_SERVICE_KEY=... OPENAI_API_KEY=...
//   node scripts/load-brand-voice.mjs
//   node scripts/load-brand-voice.mjs --dry-run    (in ra, không ghi)
// =============================================================

import fs from 'fs';
import path from 'path';

const DOC_PATH = 'docs/BRAND-VOICE.md';
const DOC_KEY = 'brand-voice';
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1024; // khớp search_tuvi_docs trong lib/tools/registry.ts
const RATE_DELAY = 200;

const DRY = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!DRY && (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY)) {
  console.error('❌ Thiếu env. Cần: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  console.error('   (dùng --dry-run để xem cách cắt mục mà không cần key)');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Đọc + cắt mục ───────────────────────────────────────────
const raw = fs.readFileSync(path.resolve(DOC_PATH), 'utf8');

// Lấy version từ dòng "**Phiên bản:** 1.0"
const version = (raw.match(/\*\*Phiên bản:\*\*\s*([0-9.]+)/) || [])[1];
if (!version) {
  console.error('❌ Không đọc được **Phiên bản:** trong ' + DOC_PATH);
  process.exit(1);
}

// Cắt theo heading `## ` ở đầu dòng. Giữ nguyên heading trong nội dung mục
// để chunk tự nó có ngữ cảnh khi bị lấy ra lẻ.
function splitSections(md) {
  const lines = md.split('\n');
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = /^## (.+)$/.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { section: m[1].trim(), lines: [line] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) out.push(cur);
  return out
    .map((s) => ({ section: s.section, content: s.lines.join('\n').trim() }))
    .filter((s) => s.content.length > 0);
}

const sections = splitSections(raw);

console.log(`📄 ${DOC_PATH} — v${version}, ${raw.length} ký tự, ${sections.length} mục:`);
for (const s of sections) console.log(`   · ${s.section}  (${s.content.length})`);

if (DRY) {
  console.log('\n🔎 --dry-run: không ghi gì.');
  process.exit(0);
}

// ─── OpenAI embedding ────────────────────────────────────────
async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ input: text, model: EMBED_MODEL, dimensions: EMBED_DIMS }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return (await res.json()).data[0].embedding;
}

// ─── Supabase upsert ─────────────────────────────────────────
async function upsert(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/brand_voice_docs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      // unique index là (doc_key, version, kind, coalesce(section,'')) →
      // nạp lại cùng version thì ghi đè, không đẻ bản trùng.
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
}

// ─── Chạy ────────────────────────────────────────────────────
(async () => {
  // 1. Trọn doc — KHÔNG embed (không ai tra ngữ nghĩa cả tài liệu)
  await upsert({ doc_key: DOC_KEY, version, kind: 'full', section: null, content: raw });
  console.log(`\n✅ full  — ${raw.length} ký tự`);

  // 2. Từng mục — có embed
  let n = 0;
  for (const s of sections) {
    const embedding = await embed(`${s.section}\n\n${s.content}`);
    await upsert({
      doc_key: DOC_KEY,
      version,
      kind: 'section',
      section: s.section,
      content: s.content,
      embedding: JSON.stringify(embedding),
    });
    n++;
    console.log(`✅ ${String(n).padStart(2)}/${sections.length}  ${s.section}`);
    await sleep(RATE_DELAY);
  }

  console.log(`\n🎉 Xong: 1 dòng full + ${n} dòng section, v${version}.`);
  console.log('   Kiểm: select kind, section, (embedding is not null) e from brand_voice_docs;');
})().catch((e) => {
  console.error('❌ ' + e.message);
  process.exit(1);
});
