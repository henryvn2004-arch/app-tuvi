#!/usr/bin/env node
/**
 * Sinh 1 LẦN, dùng cho 2 việc: (a) văn MẪU (dummy) cho khối blur của một tool
 * chia-phần (xem app-chu-trinh-cuoc-doi.html DUMMY_CTCD) — gọi ĐÚNG pipeline
 * thật (buildPromptCached + llmTextFull), không viết tay; (b) một PDF mẫu
 * (lá số + toàn bộ bản luận của lá số MẪU đó) upload lên Supabase Storage,
 * để làm nút "Xem mẫu" trong form nhập liệu.
 *
 * ⚠️ CHẠY Ở NƠI CÓ ĐỦ 3 BIẾN MÔI TRƯỜNG THẬT (không chạy được trong sandbox
 * phiên này — xem docs/nhat-ky/2026-09.md mục "Chu Trình Cuộc Đời"):
 *   GEMINI_API_KEY (hoặc ANTHROPIC_API_KEY/KIMIK3_API_KEY) — sinh văn bản
 *   SUPABASE_URL + SUPABASE_SERVICE_KEY — upload PDF (bucket `tool-samples`,
 *     tự tạo public nếu chưa có — xem hướng dẫn cuối file khi chạy lần đầu)
 *
 * Chạy bằng `tsx` (KHÔNG dùng `tsc --ignoreConfig` như gen-tool-avatars.mjs:
 * cây import ở đây sâu và dùng alias `@/...`, tsc bỏ qua tsconfig thì không
 * resolve được — tsx đọc thẳng tsconfig, xử lý được ngay):
 *
 *   npx tsx scripts/gen-tool-sample.mjs chu-trinh-cuoc-doi
 *   npx tsx scripts/gen-tool-sample.mjs chu-trinh-cuoc-doi --pdf-only   # chỉ PDF, không gọi LLM lại
 *   npx tsx scripts/gen-tool-sample.mjs chu-trinh-cuoc-doi --dummy-only # chỉ JSON văn mẫu
 *
 * Đã có JSON văn mẫu từ lượt trước thì KHÔNG gọi lại LLM cho phần đó (đọc từ
 * `outJson` nếu tồn tại) — dùng `--force` để sinh lại toàn bộ.
 *
 * Thêm tool mới vào khối chia-phần này: khai thêm một mục trong TOOL_CONFIGS
 * bên dưới — mọi phần còn lại (PDF, upload, CLI) dùng chung không phải viết
 * lại.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { computeLaso, formatLaSoV2 } from '../lib/engine/laso.ts';
import { buildPromptCached } from '../lib/agent/luan-giai-doc.ts';
import { llmTextFull } from '../lib/llm/complete.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// ── Cấu hình theo tool — thêm tool mới thì thêm một mục ở đây ──────────────
const TOOL_CONFIGS = {
  'chu-trinh-cuoc-doi': {
    label: 'Chu Trình Cuộc Đời',
    sampleBirth: { day: 15, month: 8, year: 1990, hourBranch: 3, gender: 'nam', isLunar: false },
    namXem: 2026,
    // Engine phan 14-24 = local phần 1-11 của tool này. 14+15 miễn phí (xem
    // trước thật, KHÔNG cần dummy) — chỉ 16-24 (9 phần) cần văn mẫu cho khối
    // blur. PDF mẫu thì in ĐỦ cả 11 phần (14-24) cho đẹp, kể cả 2 phần free.
    dummyPhanList: [16, 17, 18, 19, 20, 21, 22, 23, 24],
    pdfPhanList: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    maxTokFor(ep) {
      const THINK_BUDGET = 900;
      return (
        THINK_BUDGET + (ep === 14 ? 4500 : ep === 24 ? 2100 : ep >= 15 && ep <= 23 ? 1650 : 1500)
      );
    },
    outJson: join(ROOT, 'public/samples/chu-trinh-cuoc-doi-dummy.json'),
    pdfTitle: 'Chu Trình Cuộc Đời — Bản mẫu',
    storagePath: 'chu-trinh-cuoc-doi/sample.pdf',
  },
};

// ── CLI ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const toolId = argv[0];
const has = (n) => argv.includes(n);
const PDF_ONLY = has('--pdf-only');
const DUMMY_ONLY = has('--dummy-only');
const FORCE = has('--force');

const cfg = TOOL_CONFIGS[toolId];
if (!cfg) {
  console.error('Dùng: node scripts/gen-tool-sample.mjs <toolId>');
  console.error('Tool đã khai:', Object.keys(TOOL_CONFIGS).join(', '));
  process.exit(1);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Thiếu biến môi trường ${name} — xem hướng dẫn ở đầu file.`);
    process.exit(1);
  }
  return v;
}

// ── 1) Tính lá số mẫu ───────────────────────────────────────────────────
const { ok, ls, error } = computeLaso(cfg.sampleBirth, cfg.namXem);
if (!ok) {
  console.error('❌ computeLaso lỗi:', error);
  process.exit(1);
}
const laSoText = formatLaSoV2(ls);
console.log(
  `✓ Lá số mẫu: ${cfg.sampleBirth.day}/${cfg.sampleBirth.month}/${cfg.sampleBirth.year}, ${cfg.sampleBirth.gender}, xem ${cfg.namXem}`
);

// ── 2) Sinh văn bản thật cho từng phần (bỏ qua nếu --pdf-only, hoặc đã có
//    sẵn trong outJson và không --force) ─────────────────────────────────
let store = {};
if (existsSync(cfg.outJson)) {
  try {
    store = JSON.parse(readFileSync(cfg.outJson, 'utf8'));
  } catch {
    store = {};
  }
}

async function genPhan(ep) {
  if (!FORCE && store[ep]) {
    console.log(`  phần ${ep}: đã có, bỏ qua (dùng --force để sinh lại)`);
    return;
  }
  requireEnv('GEMINI_API_KEY');
  const { system, prompt } = buildPromptCached(ep, laSoText, '');
  console.log(`  phần ${ep}: đang gọi LLM…`);
  const r = await llmTextFull({
    system,
    prompt,
    maxTokens: cfg.maxTokFor(ep),
    cacheSystem: true,
    effort: 'low',
  });
  const text = r.text.replace(/```chartdata[\s\S]*?```/, '').trim();
  store[ep] = text;
  console.log(`  phần ${ep}: OK (${text.length} ký tự, model ${r.model})`);
}

if (!PDF_ONLY) {
  const needed = DUMMY_ONLY
    ? cfg.dummyPhanList
    : Array.from(new Set([...cfg.dummyPhanList, ...cfg.pdfPhanList]));
  for (const ep of needed) await genPhan(ep);
  mkdirSync(dirname(cfg.outJson), { recursive: true });
  const dummyOut = {};
  for (const ep of cfg.dummyPhanList) if (store[ep]) dummyOut[ep] = store[ep];
  writeFileSync(cfg.outJson, JSON.stringify(dummyOut, null, 2));
  console.log(
    `✓ Ghi văn mẫu: ${cfg.outJson} (${Object.keys(dummyOut).length}/${cfg.dummyPhanList.length} phần)`
  );
}

if (DUMMY_ONLY) {
  console.log('✓ Xong (--dummy-only, bỏ qua PDF).');
  process.exit(0);
}

// ── 3) Dựng PDF từ toàn bộ pdfPhanList (đọc lại store — cần đủ tất cả các
//    phần trong pdfPhanList, kể cả phần KHÔNG nằm trong dummyPhanList) ────
for (const ep of cfg.pdfPhanList) {
  if (!store[ep]) await genPhan(ep);
}

// Chuyển đổi markdown ĐƠN GIẢN → HTML, đủ cho một bản PDF minh hoạ (không
// cần khớp pixel-for-pixel với renderMarkdown() phía client).
function mdToHtml(text) {
  return text
    .split('\n\n')
    .map((block) => {
      const m = /^\[(TỐT|CẢNH BÁO|TRUNG TÍNH)(?:\|([^\]]{0,40}))?\]\s*\*\*(.+?)\*\*([\s\S]*)$/.exec(
        block.trim()
      );
      if (m) {
        const cls = m[1] === 'TỐT' ? 'good' : m[1] === 'CẢNH BÁO' ? 'warn' : 'neutral';
        return `<div class="hook ${cls}">${m[3]}</div><p>${m[4].trim()}</p>`;
      }
      if (/^PHẦN \d+/.test(block.trim())) return `<h3>${block.trim()}</h3>`;
      return `<p>${block.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('\n');
}

const PHAN_LABELS = {
  14: 'Tổng quan đại vận',
  15: 'Đại Vận 1',
  16: 'Đại Vận 2',
  17: 'Đại Vận 3',
  18: 'Đại Vận 4',
  19: 'Đại Vận 5',
  20: 'Đại Vận 6',
  21: 'Đại Vận 7',
  22: 'Đại Vận 8',
  23: 'Đại Vận 9',
  24: 'Tiểu Vận Năm Xem',
};

const bodyHtml = cfg.pdfPhanList
  .map(
    (ep, i) =>
      `<section><h2>${i + 1}. ${PHAN_LABELS[ep] || 'Phần ' + ep}</h2>${mdToHtml(store[ep] || '')}</section>`
  )
  .join('\n');

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<style>
  body{font-family:'Noto Serif',Georgia,serif;color:#1a1a1a;max-width:680px;margin:0 auto;padding:40px}
  h1{font-size:22px;border-bottom:2px solid #C9A84C;padding-bottom:10px}
  .sub{color:#8a8f98;font-size:13px;margin-bottom:30px}
  h2{font-size:16px;color:#061A2E;margin-top:28px}
  h3{font-size:14px;color:#061A2E}
  p{font-size:12.5px;line-height:1.7;color:#3a3a3a}
  .hook{font-weight:700;font-size:13px;padding:8px 12px;border-radius:6px;margin:10px 0 6px}
  .hook.good{background:#eaf6ee;color:#1a6b3a}
  .hook.warn{background:#fdeceb;color:#c0392b}
  .hook.neutral{background:#eef2f6;color:#2a5a7a}
  .watermark{margin-top:40px;padding-top:14px;border-top:1px dashed #ccc;font-size:11px;color:#999;text-align:center}
</style></head><body>
<h1>${cfg.pdfTitle}</h1>
<div class="sub">Lá số mẫu — ${cfg.sampleBirth.day}/${cfg.sampleBirth.month}/${cfg.sampleBirth.year} · ${cfg.sampleBirth.gender === 'nam' ? 'Nam' : 'Nữ'} · Xem vận năm ${cfg.namXem}</div>
${bodyHtml}
<div class="watermark">Bản mẫu minh hoạ — tuviminhbao.com</div>
</body></html>`;

console.log('✓ Dựng HTML xong, đang render PDF…');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px' } });
await browser.close();

const localPdfPath = join(ROOT, `.tool-samples-${toolId}.pdf`);
writeFileSync(localPdfPath, pdfBuffer);
console.log(`✓ PDF tạm: ${localPdfPath} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

// ── 4) Upload Supabase Storage ──────────────────────────────────────────
const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BUCKET = 'tool-samples';
const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
if (bucketErr && !/already exists/i.test(bucketErr.message || '')) {
  console.error(
    '⚠ Không tạo được bucket (có thể đã có sẵn, kiểm tra tay nếu upload lỗi tiếp):',
    bucketErr.message
  );
}

const { error: uploadErr } = await supabase.storage
  .from(BUCKET)
  .upload(cfg.storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
if (uploadErr) {
  console.error('❌ Upload lỗi:', uploadErr.message);
  process.exit(1);
}

const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(cfg.storagePath);
console.log(`✓ Đã upload — URL công khai:\n  ${urlData?.publicUrl}`);
console.log(
  '\nBước cuối (tay): dán URL trên vào SAMPLE_PDF_URL của tool tương ứng trong app-' +
    toolId +
    '.html.'
);
