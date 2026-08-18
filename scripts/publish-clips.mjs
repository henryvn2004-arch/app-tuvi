#!/usr/bin/env node
/**
 * Nộp clip đã render lên kho: `remotion/out/*.mp4` → Supabase Storage + một
 * dòng `media_assets`.
 *
 *   node scripts/publish-clips.mjs                 # nộp mọi clip trong out/
 *   node scripts/publish-clips.mjs --tools a,b     # chỉ vài cái
 *   node scripts/publish-clips.mjs --dry-run       # chỉ in kế hoạch
 *
 * 🔑 VÌ SAO PHẢI CÓ BƯỚC NÀY: clip render ở Actions chỉ nằm trong *artifact*,
 * mà artifact hết hạn sau 14 ngày. Không nộp lên kho thì mỗi lượt dựng là một
 * lượt đốt CPU rồi vứt đi, và không khâu đăng nào có URL để lấy file.
 *
 * 🔐 KHÔNG dùng `SUPABASE_SERVICE_KEY`. Đi qua hàm edge `clip-ingest`, runner
 * chỉ cầm `CLIP_INGEST_SECRET` — làm được đúng một việc là nộp clip. Xem lý do
 * đầy đủ trong `_patches/edge-clip-ingest.deno.ts`.
 *
 * ⚠️ NỘP KHO ≠ XẾP HÀNG ĐĂNG. Script này KHÔNG tạo dòng `media_posts`. Biến
 * một clip thành bài đăng là quyết định nội dung (caption, hashtag, kênh nào
 * trước) và phải có người chốt — chưa kể `publishQueue` quét theo TRẠNG THÁI
 * chứ không theo kênh, nên chèn vào đó với kênh chưa có adapter là tự tay đánh
 * hỏng cả lô.
 */
import { readdirSync, statSync, readFileSync, existsSync, appendFileSync } from 'fs';
import { join, basename } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'remotion/out');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='));
  if (eq) return eq.slice(f.length + 1);
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const DRY = has('--dry-run');
const ONLY = val('--tools', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const SB_URL = (process.env.SUPABASE_URL || 'https://dciwkfdqhhddeymlisey.supabase.co').replace(
  /\/+$/,
  ''
);
const SECRET = process.env.CLIP_INGEST_SECRET || '';

if (!existsSync(OUT_DIR)) {
  console.log('Không có remotion/out — chưa dựng clip nào. Bỏ qua.');
  process.exit(0);
}

const files = readdirSync(OUT_DIR)
  .filter((f) => f.endsWith('.mp4'))
  .filter((f) => !ONLY.length || ONLY.includes(basename(f, '.mp4')))
  .sort();

if (!files.length) {
  console.log('Không có .mp4 nào để nộp.');
  process.exit(0);
}

console.log(`\n📤 Nộp ${files.length} clip lên kho (${SB_URL})`);

if (DRY) {
  for (const f of files) {
    const b = statSync(join(OUT_DIR, f)).size;
    console.log(`  ${basename(f, '.mp4').padEnd(20)} ${(b / 1e6).toFixed(1)}MB → sẽ nộp`);
  }
  process.exit(0);
}

/**
 * Thiếu khoá thì BỎ QUA CÓ BÁO, không hỏng cả lượt dựng.
 *
 * Clip vẫn nằm trong artifact tải về được — mất đường vào kho chứ không mất
 * sản phẩm. Đánh hỏng cả job vì một secret chưa khai là biến một thiếu sót cấu
 * hình thành một lượt render 18 clip bị vứt đi.
 */
if (!SECRET) {
  const msg =
    'Chưa khai CLIP_INGEST_SECRET — BỎ QUA bước nộp kho. ' +
    'Clip vẫn tải về được ở mục Artifacts của lượt chạy này.';
  console.warn(`⚠️  ${msg}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n> ⚠️ **${msg}**\n> Đặt secret ở Supabase (Edge Functions → clip-ingest) và ở GitHub (Settings → Secrets → Actions).\n`
    );
  }
  process.exit(0);
}

/**
 * Soát khoá TRƯỚC khi nộp file.
 *
 * 🪤 Đo thật trên hàm đã deploy: một request bị TỪ CHỐI mà mang body 100KB thì
 * trả lời trong 0,7s, còn mang body 4MB thì **treo 150 giây rồi 504**. Đã thử
 * huỷ luồng body ngay trong hàm — không ăn thua, đó là hành vi của cổng.
 *
 * Không có bước này thì một secret sai trong Actions = 18 clip × 150 giây treo,
 * job hết giờ, và dòng lỗi cuối cùng là một con số `504` chẳng chỉ vào đâu.
 */
const ping = await fetch(`${SB_URL}/functions/v1/clip-ingest?ping=1`, {
  method: 'POST',
  headers: { 'x-clip-secret': SECRET },
}).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: e.message }) }));

if (!ping.ok) {
  const why = (await ping.json().catch(() => ({}))).error || `HTTP ${ping.status}`;
  console.error(`❌ Không nộp được: cửa nhận clip từ chối khoá — ${why}`);
  console.error('   Kiểm CLIP_INGEST_SECRET ở CẢ HAI nơi: Supabase (Edge Functions →');
  console.error('   clip-ingest → Secrets) và GitHub (Settings → Secrets → Actions).');
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n## 📤 Nộp clip lên kho\n\n❌ **Cửa nhận clip từ chối khoá** — ${why}\n\n` +
        `Kiểm \`CLIP_INGEST_SECRET\` ở cả Supabase lẫn GitHub. Clip vẫn tải về được ở mục Artifacts.\n`
    );
  }
  process.exit(1);
}

const results = [];

for (const f of files) {
  const toolId = basename(f, '.mp4');
  const abs = join(OUT_DIR, f);
  const bytes = statSync(abs).size;
  try {
    /*
     * Sidecar `<id>.meta.json` do `gen-insight.mjs` ghi ra ngay sau lượt render
     * — nguồn DUY NHẤT của caption/thẻ/khổ. Không có sidecar (clip demo tool
     * dựng bằng `gen-video.mjs`) thì bỏ trống: cửa nhận vẫn cất file và ghi sổ
     * như cũ, chỉ là không có chữ để xếp hàng đăng.
     */
    const sidePath = join(OUT_DIR, `${toolId}.meta.json`);
    let side = {};
    if (existsSync(sidePath)) {
      try {
        side = JSON.parse(readFileSync(sidePath, 'utf8'));
      } catch {
        console.error(`⚠️  ${toolId} — sidecar hỏng, bỏ qua phần caption`);
      }
    }

    const form = new FormData();
    form.set('tool_id', toolId);
    form.set('variant', 'clip-9x16');
    if (side.caption) form.set('caption', String(side.caption));
    if (Array.isArray(side.hashtags) && side.hashtags.length) {
      form.set('hashtags', side.hashtags.join(','));
    }
    if (side.width) form.set('width', String(side.width));
    if (side.height) form.set('height', String(side.height));
    // Loại nguồn do BÊN DỰNG khai (sidecar). Không khai thì hàm edge giữ mặc
    // định `tool-demo` như cũ — clip demo công cụ chưa ghi trường này.
    if (side.sourceType) form.set('source_type', String(side.sourceType));
    form.set(
      'meta',
      JSON.stringify({ built_at: new Date().toISOString(), run: process.env.GITHUB_RUN_ID || null })
    );
    form.set('file', new Blob([readFileSync(abs)], { type: 'video/mp4' }), f);

    const res = await fetch(`${SB_URL}/functions/v1/clip-ingest`, {
      method: 'POST',
      headers: { 'x-clip-secret': SECRET },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    results.push({ toolId, ok: true, note: `${(bytes / 1e6).toFixed(1)}MB` });
    console.log(`✓  ${toolId} — ${data.url}`);
  } catch (e) {
    // Hỏng một clip KHÔNG kéo cả loạt — cùng luật với `build-video-batch`.
    results.push({ toolId, ok: false, note: String(e.message).slice(0, 160) });
    console.error(`❌ ${toolId} — ${e.message}`);
  }
}

const ok = results.filter((r) => r.ok).length;
console.log(`\n  ${ok} nộp được · ${results.length - ok} trượt\n`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results
    .map((r) => `| ${r.toolId} | ${r.ok ? 'xong' : 'TRƯỢT'} | ${r.note} |`)
    .join('\n');
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## 📤 Nộp clip lên kho\n\n${ok}/${results.length} clip đã vào \`media_assets\`.\n\n` +
      `| Tool | Kết quả | Ghi chú |\n|---|---|---|\n${rows}\n\n` +
      `> Clip mới **chưa được xếp hàng đăng** — đó là một bước riêng, có người chốt nội dung.\n`
  );
}

process.exit(results.some((r) => !r.ok) ? 1 : 0);
