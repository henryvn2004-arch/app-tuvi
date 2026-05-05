// scripts/embed-tubinh.mjs
// =============================================================
// Embed sách Tử Bình (PDF) vào Supabase tubinh_docs.
// Chạy LOCAL trong Codespace, KHÔNG phải Vercel route.
//
// Usage:
//   1. Đặt 2 file PDF vào ./sach/  (xem CONFIG bên dưới)
//   2. Set env: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY
//   3. Install deps: npm install pdf-parse
//   4. Chạy: node scripts/embed-tubinh.mjs
//
// Resume nếu bị interrupted:
//   node scripts/embed-tubinh.mjs --skip-books=1            (skip book đầu)
//   node scripts/embed-tubinh.mjs --skip-chunks=120         (skip 120 chunk đầu trong book hiện tại)
// =============================================================

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const pdf = typeof pdfParseModule === 'function'
  ? pdfParseModule
  : (pdfParseModule.default || pdfParseModule);

// ─── CONFIG ──────────────────────────────────────────────────
const BOOKS = [
  { path: './sach/tu-binh-chan-thuyen.pdf', source: 'Tử Bình Chân Thuyên' },
  { path: './sach/trich-thien-tuy.pdf',     source: 'Trích Thiên Tủy' },
];
const CHUNK_SIZE   = 3500;  // chars per chunk (~700 tokens cho tiếng Việt)
const RATE_DELAY   = 200;   // ms giữa các call OpenAI
const REPORT_EVERY = 25;    // log mỗi N chunks

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY   = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('❌ Thiếu env vars. Cần: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── CHUNKING (paragraph-aware với overlap) ──────────────────
function chunkText(text, maxChars = CHUNK_SIZE) {
  // Normalize whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);

  const chunks = [];
  let current = [];
  let currentLen = 0;

  for (const p of paragraphs) {
    // Single paragraph quá lớn → cắt thô
    if (p.length > maxChars * 1.5) {
      if (current.length > 0) {
        chunks.push(current.join('\n\n'));
        current = []; currentLen = 0;
      }
      for (let i = 0; i < p.length; i += maxChars) {
        chunks.push(p.slice(i, Math.min(i + maxChars, p.length)));
      }
      continue;
    }

    // Đóng chunk hiện tại nếu thêm p sẽ vượt size
    if (currentLen + p.length > maxChars && current.length > 0) {
      chunks.push(current.join('\n\n'));
      // Overlap: giữ paragraph cuối làm "đệm" cho chunk tiếp theo
      const lastP = current[current.length - 1];
      if (lastP.length < maxChars / 2) {
        current = [lastP];
        currentLen = lastP.length + 2;
      } else {
        current = []; currentLen = 0;
      }
    }
    current.push(p);
    currentLen += p.length + 2;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));

  return chunks;
}

// ─── OPENAI EMBED ───────────────────────────────────────────
async function embedOne(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

// ─── SUPABASE INSERT ─────────────────────────────────────────
async function insertChunk(content, source, embedding) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tubinh_docs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      content,
      source,
      embedding: JSON.stringify(embedding),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase ${res.status}: ${t.slice(0, 200)}`);
  }
}

// ─── PROCESS 1 BOOK ──────────────────────────────────────────
async function processBook(book, skipChunks = 0) {
  console.log(`\n━━━ ${book.source} ━━━`);
  console.log(`📖 ${book.path}`);

  if (!fs.existsSync(book.path)) {
    console.error(`❌ File không tồn tại: ${book.path}`);
    return { embedded: 0, errors: [{ error: 'file not found' }] };
  }

  const buffer = fs.readFileSync(book.path);
  const data = await pdf(buffer);
  console.log(`📄 ${data.numpages} pages, ${data.text.length.toLocaleString()} chars`);

  const chunks = chunkText(data.text);
  const totalChunks = chunks.length;
  console.log(`✂️  ${totalChunks} chunks`);
  if (skipChunks > 0) console.log(`⏩ Bỏ qua ${skipChunks} chunks đầu`);

  let embedded = 0;
  const errors = [];
  const startTime = Date.now();

  for (let i = skipChunks; i < totalChunks; i++) {
    const chunk = chunks[i];
    const sourceLabel = `${book.source} | chunk ${i + 1}/${totalChunks}`;

    try {
      const embedding = await embedOne(chunk);
      await insertChunk(chunk, sourceLabel, embedding);
      embedded++;
      if (embedded % REPORT_EVERY === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = (embedded / elapsed).toFixed(1);
        const eta = Math.round((totalChunks - skipChunks - embedded) / rate);
        console.log(`   [${i + 1}/${totalChunks}] ${rate} chunks/s · ETA ${eta}s`);
      }
      await sleep(RATE_DELAY);
    } catch (e) {
      console.error(`   ⚠️  chunk ${i + 1}: ${e.message}`);
      errors.push({ chunk_idx: i, error: e.message });
      if (errors.length > 20) {
        console.error('❌ Quá nhiều errors, dừng book này');
        break;
      }
    }
  }

  console.log(`✅ ${book.source}: ${embedded} embedded, ${errors.length} errors`);
  return { embedded, errors };
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  const totals = { embedded: 0, errors: [] };

  // Parse CLI args
  const args = process.argv.slice(2);
  let skipBooks = 0;
  let skipChunks = 0;
  for (const arg of args) {
    if (arg.startsWith('--skip-books='))  skipBooks  = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--skip-chunks=')) skipChunks = parseInt(arg.split('=')[1]);
  }

  console.log('🚀 Embed Tử Bình → Supabase');
  console.log(`   Books: ${BOOKS.length} | Chunk size: ${CHUNK_SIZE} chars | Rate: ${RATE_DELAY}ms/call`);
  if (skipBooks)  console.log(`   --skip-books=${skipBooks}`);
  if (skipChunks) console.log(`   --skip-chunks=${skipChunks}`);

  for (let i = skipBooks; i < BOOKS.length; i++) {
    const book = BOOKS[i];
    const skip = (i === skipBooks) ? skipChunks : 0;
    const result = await processBook(book, skip);
    totals.embedded += result.embedded;
    totals.errors.push(...result.errors);
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  console.log('\n══════════════════════════════════');
  console.log(`✅ TỔNG: ${totals.embedded} chunks embedded`);
  console.log(`⚠️  Errors: ${totals.errors.length}`);
  console.log(`⏱️  Thời gian: ${mins}m ${secs}s`);
  if (totals.errors.length > 0) {
    console.log('\n5 errors đầu:');
    totals.errors.slice(0, 5).forEach(e => console.log('  ', e));
  }
}

main().catch(e => {
  console.error('💥 Fatal:', e);
  process.exit(1);
});
