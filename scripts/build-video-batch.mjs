#!/usr/bin/env node
/**
 * Dựng một LOẠT clip: quay màn hình → cổng kiểm → giọng đọc → render → soi file.
 *
 *   node scripts/build-video-batch.mjs --all
 *   node scripts/build-video-batch.mjs --tools than-so-hoc,kim-lau
 *   node scripts/build-video-batch.mjs --all --dry-run      # chỉ in kế hoạch
 *   node scripts/build-video-batch.mjs --all --force        # quay + dựng lại
 *
 * Đây là thứ GitHub Actions gọi. Để logic ở script chứ không nhét vào YAML vì
 * cùng một lệnh phải chạy được ở máy Henry lúc cần dựng gấp một clip — YAML thì
 * chỉ CI chạy được, và mỗi lần sửa phải push mới biết đúng hay sai.
 *
 * BỐN TÍNH CHẤT, chép từ `yt-drain` (kho video đã trả giá cho cả bốn):
 *   1. TUẦN TỰ, từng tool một. Chạy song song chỉ đốt CPU và làm lỗi từng phần
 *      không lần ra được.
 *   2. HỎNG MỘT TOOL KHÔNG KÉO CẢ LOẠT. Ghi lại rồi đi tiếp.
 *   3. NGÂN SÁCH THỜI GIAN, dừng giữa hai tool chứ không giữa chừng một tool.
 *   4. NỐI LẠI ĐƯỢC. Đã có mp4 thì bỏ qua; đứt mạng giữa chừng không phải làm lại.
 *
 * 🔴 VÀ MỘT CHỐT RIÊNG CỦA KHÂU NÀY: `gen-video.mjs` cố ý FAIL-SOFT với giọng
 * đọc — thiếu khoá TTS thì nó vẫn render, chỉ là clip KHÔNG LỜI. Chạy tay thì
 * đó là lựa chọn đúng (còn duyệt được bố cục). Chạy tự động hàng loạt thì đó là
 * cách hỏng tệ nhất: 18 clip không lời vẫn "thành công", vẫn lên hàng đợi đăng.
 * Nên ở đây LUÔN truyền `--require-voice` để TTS hỏng là dừng hẳn.
 *
 * ⚠️ ĐỪNG THAY chốt đó bằng cách soi file — tôi đã thử và nó KHÔNG bắt được:
 * clip `--no-voice` VẪN có track tiếng vì nhạc nền vẫn render (đo thật:
 * `audio aac 2ch 48000Hz`, 41,4s). Phép soi file dưới đây chỉ bắt được ca mất
 * HẲN âm thanh; ca mất riêng lời đọc phải chặn ở lúc TTS hỏng.
 */
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, statSync, appendFileSync } from 'fs';
import { join } from 'path';
import { TOOL_RECIPES } from './tool-recipes.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'remotion/out');
const REC_DIR = join(ROOT, 'remotion/public/recordings');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='));
  if (eq) return eq.slice(f.length + 1);
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const ALL = has('--all');
const DRY = has('--dry-run');
const FORCE = has('--force');
const BASE = val('--base', 'https://www.tuviminhbao.com');
const NO_AUDIENCE = has('--no-audience');
/** Ngân sách phút. Job Actions trần 6 giờ; dừng sớm để còn kịp báo cáo. */
const BUDGET_MIN = Number(val('--budget-min', '300'));

const started = Date.now();
const outOfTime = () => (Date.now() - started) / 60000 > BUDGET_MIN;

/** Danh sách tool dựng được = có CẢ công thức quay LẪN kịch bản. */
function resolveTools() {
  const withScript = new Set(listScriptedTools());
  const withRecipe = Object.keys(TOOL_RECIPES);
  if (ALL) return withRecipe.filter((t) => withScript.has(t));
  const asked = val('--tools', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return asked;
}

/** Đọc danh sách tool có kịch bản, không cần biên dịch cả cây TS. */
function listScriptedTools() {
  const src = execFileSync('node', [
    '-e',
    `const fs=require('fs');const s=fs.readFileSync(${JSON.stringify(join(ROOT, 'lib/video/sources/tool-demo.ts'))},'utf8');` +
      `const m=[...s.matchAll(/toolId:\\s*'([a-z0-9-]+)'/g)].map(x=>x[1]);console.log(m.join(' '))`,
  ]).toString();
  return src.trim().split(/\s+/).filter(Boolean);
}

/**
 * Soi file đã render: đúng là mp4, có track hình, có âm thanh, dài hợp lý.
 *
 * ⚠️ PHẠM VI THẬT — đừng đọc rộng hơn: hàm này bắt được ca render ra file hỏng
 * (mất hình, mất hẳn âm thanh, cụt). Nó KHÔNG bắt được ca "mất riêng lời đọc",
 * vì nhạc nền vẫn tạo ra track tiếng. Ca đó chặn bằng `--require-voice` ở bước
 * trước. Đặt tên hàm theo điều nó THỰC SỰ đo, không theo điều mình muốn nó đo.
 */
async function inspect(file) {
  const { parseMedia } = await import(
    join(ROOT, 'remotion/node_modules/@remotion/media-parser/dist/esm/index.mjs')
  );
  const { nodeReader } = await import(
    join(ROOT, 'remotion/node_modules/@remotion/media-parser/dist/esm/node.mjs')
  );
  const r = await parseMedia({
    src: file,
    reader: nodeReader,
    fields: { durationInSeconds: true, tracks: true },
    acknowledgeRemotionLicense: true,
  });
  const tracks = Array.isArray(r.tracks)
    ? r.tracks
    : [...(r.tracks?.videoTracks ?? []), ...(r.tracks?.audioTracks ?? [])];
  return {
    seconds: r.durationInSeconds ?? 0,
    hasVideo: tracks.some((t) => t.type === 'video'),
    hasAudio: tracks.some((t) => t.type === 'audio'),
    bytes: statSync(file).size,
  };
}

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
}

const tools = resolveTools();
if (!tools.length) {
  console.error('Không có tool nào để dựng. Dùng --all hoặc --tools a,b,c.');
  console.error('Tool dựng được = có CẢ công thức quay (scripts/tool-recipes.mjs)');
  console.error('LẪN kịch bản (lib/video/sources/tool-demo.ts).');
  process.exit(1);
}

console.log(`\n📹 Dựng ${tools.length} clip: ${tools.join(' · ')}`);
console.log(`   nguồn quay : ${BASE}`);
console.log(`   cổng 2     : ${NO_AUDIENCE ? 'BỎ QUA' : 'bật'}`);
console.log(`   ngân sách  : ${BUDGET_MIN} phút\n`);

if (DRY) {
  for (const t of tools) {
    const mp4 = join(OUT_DIR, `${t}.mp4`);
    console.log(`  ${t.padEnd(20)} ${existsSync(mp4) && !FORCE ? '⏭ đã có' : '→ sẽ dựng'}`);
  }
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
const results = [];

for (const tool of tools) {
  if (outOfTime()) {
    results.push({ tool, status: 'hoãn', note: 'hết ngân sách thời gian' });
    continue;
  }
  const mp4 = join(OUT_DIR, `${tool}.mp4`);
  if (existsSync(mp4) && !FORCE) {
    results.push({ tool, status: 'bỏ qua', note: 'đã có mp4' });
    console.log(`⏭  ${tool} — đã có, bỏ qua.`);
    continue;
  }

  const t0 = Date.now();
  try {
    console.log(`\n${'━'.repeat(60)}\n▶  ${tool}\n${'━'.repeat(60)}`);

    // 1. Quay màn hình (tự bỏ qua nếu đã có, trừ khi --force)
    run('node', [
      'scripts/record-tool-demo.mjs',
      '--tool',
      tool,
      '--base',
      BASE,
      ...(FORCE ? ['--force'] : []),
    ]);
    if (!existsSync(join(REC_DIR, `${tool}.webm`))) {
      throw new Error('quay xong nhưng không thấy file .webm');
    }

    // 2. Cổng kiểm → giọng đọc → render.
    //    `--require-voice`: TTS hỏng thì DỪNG, không render bản không lời.
    run('node', [
      'scripts/gen-video.mjs',
      '--tool',
      tool,
      '--require-voice',
      ...(NO_AUDIENCE ? ['--no-audience'] : []),
    ]);

    // 3. Soi lại file. Bắt được: mất track hình, mất HẲN âm thanh, clip cụt.
    //    KHÔNG bắt được ca mất riêng lời đọc — xem chú thích đầu file.
    const info = await inspect(mp4);
    if (!info.hasVideo) throw new Error('mp4 không có track hình');
    if (!info.hasAudio) throw new Error('mp4 không có track tiếng nào (mất cả nhạc nền)');
    if (info.seconds < 8)
      throw new Error(`clip chỉ ${info.seconds.toFixed(1)}s — quá ngắn, nghi hỏng`);

    results.push({
      tool,
      status: 'xong',
      note: `${info.seconds.toFixed(1)}s · ${(info.bytes / 1e6).toFixed(1)}MB · ${((Date.now() - t0) / 1000).toFixed(0)}s dựng`,
    });
    console.log(`✓  ${tool} — ${info.seconds.toFixed(1)}s, có đủ hình và tiếng.`);
  } catch (e) {
    // Hỏng một tool KHÔNG kéo cả loạt.
    results.push({ tool, status: 'TRƯỢT', note: String(e.message).split('\n')[0].slice(0, 160) });
    console.error(`❌ ${tool} — ${e.message.split('\n')[0]}`);
  }
}

// ── Báo cáo ───────────────────────────────────────────────────────────────
const done = results.filter((r) => r.status === 'xong');
const failed = results.filter((r) => r.status === 'TRƯỢT');

console.log(`\n${'═'.repeat(60)}`);
for (const r of results) console.log(`  ${r.status.padEnd(8)} ${r.tool.padEnd(20)} ${r.note}`);
console.log(`${'═'.repeat(60)}`);
console.log(
  `  ${done.length} xong · ${failed.length} trượt · ${results.length - done.length - failed.length} bỏ qua/hoãn\n`
);

// Tóm tắt cho trang chạy của GitHub — người mở Actions đọc được ngay mà không
// phải bới log.
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map((r) => `| ${r.tool} | ${r.status} | ${r.note} |`).join('\n');
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## 📹 Dựng clip\n\n` +
      `${done.length} xong · ${failed.length} trượt\n\n` +
      `| Tool | Kết quả | Ghi chú |\n|---|---|---|\n${rows}\n` +
      (NO_AUDIENCE
        ? `\n> ⚠️ Cổng 2 (hội đồng người xem) **bị bỏ qua** — chưa khai khoá model. Clip mới qua cổng máy.\n`
        : '')
  );
}

// Trượt thì hỏng to. Bỏ qua/hoãn thì không — đó là hành vi đúng.
process.exit(failed.length ? 1 : 0);
