#!/usr/bin/env node
/**
 * Dựng một LOẠT clip: quay màn hình → cổng kiểm → giọng đọc → render → soi file.
 *
 *   node scripts/build-video-batch.mjs --all
 *   node scripts/build-video-batch.mjs --tools than-so-hoc,kim-lau
 *   node scripts/build-video-batch.mjs --insight vi-sao-hay-hoan-lai
 *   node scripts/build-video-batch.mjs --all --dry-run      # chỉ in kế hoạch
 *   node scripts/build-video-batch.mjs --all --force        # quay + dựng lại
 *
 * 🔴 HAI LOẠI CLIP, HAI ĐƯỜNG DỰNG KHÁC HẲN — và bản đầu của script này CHỈ
 * biết loại thứ nhất, tức bỏ sót đúng loại chiếm phần lớn kênh:
 *
 *   · `tool-demo` — quay màn hình prod bằng Playwright rồi lắp vào khung.
 *     Nguồn: `lib/video/sources/tool-demo.ts` + công thức quay `tool-recipes.mjs`.
 *   · `insight`  — KHÔNG quay gì cả; chữ chạy trên nền tranh.
 *     Nguồn: `lib/video/sources/insight.ts`. Nội dung kiểu *"có ba kiểu người
 *     khi bị tổn thương"* không có giao diện nào để quay.
 *
 * ⚠️ Vì thế `--all` phải phủ CẢ HAI. Một danh sách thiếu ở đây thì clip loại
 * kia vĩnh viễn nằm ngoài khâu tự động mà không có gì báo — đúng lớp lỗi "hai
 * danh sách chép tay rồi trôi khỏi nhau" repo này đã trả giá nhiều lần.
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
/** Mức nén cho clip insight — xem lý do tại chỗ gọi `gen-insight.mjs`. */
const CRF = val('--crf', '26');

const started = Date.now();
const outOfTime = () => (Date.now() - started) / 60000 > BUDGET_MIN;

/**
 * Danh sách việc cần dựng, mỗi việc là `{ id, kind }`.
 *
 * `--all` = mọi clip tool-demo dựng được (có CẢ công thức quay LẪN kịch bản)
 * CỘNG mọi clip insight. Hai cờ hẹp `--tools` / `--insight` dùng được cùng lúc.
 */
function resolveJobs() {
  const jobs = [];
  if (ALL) {
    const withScript = new Set(listIds('tool-demo.ts', 'toolId'));
    for (const t of Object.keys(TOOL_RECIPES)) {
      if (withScript.has(t)) jobs.push({ id: t, kind: 'tool-demo' });
    }
    for (const i of listIds('insight.ts', 'id')) jobs.push({ id: i, kind: 'insight' });
    return jobs;
  }
  for (const t of csv(val('--tools', ''))) jobs.push({ id: t, kind: 'tool-demo' });
  for (const i of csv(val('--insight', ''))) jobs.push({ id: i, kind: 'insight' });
  return jobs;
}

const csv = (s) =>
  String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * Đọc danh sách id từ file nguồn TS mà KHÔNG biên dịch cả cây.
 *
 * ⚠️ `field` phải khớp CHÍNH XÁC hoa/thường và có ranh giới từ: `\bid:` KHÔNG
 * trúng `toolId:`/`sourceId:` (chữ `I` hoa, và trước nó là ký tự chữ nên không
 * có ranh giới). Bỏ `\b` đi là danh sách insight nuốt luôn mọi `toolId` — một
 * lỗi im lặng, vì kết quả vẫn là một danh sách trông rất hợp lý.
 */
function listIds(file, field) {
  const path = join(ROOT, 'lib/video/sources', file);
  const src = execFileSync('node', [
    '-e',
    `const fs=require('fs');const s=fs.readFileSync(${JSON.stringify(path)},'utf8');` +
      `const m=[...s.matchAll(/\\b${field}:\\s*'([a-z0-9-]+)'/g)].map(x=>x[1]);` +
      `console.log([...new Set(m)].join(' '))`,
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

const jobs = resolveJobs();
if (!jobs.length) {
  console.error('Không có clip nào để dựng. Dùng --all, --tools a,b,c hoặc --insight a,b,c.');
  console.error('Clip tool-demo = có CẢ công thức quay (scripts/tool-recipes.mjs)');
  console.error('LẪN kịch bản (lib/video/sources/tool-demo.ts).');
  console.error('Clip insight   = một id trong lib/video/sources/insight.ts.');
  process.exit(1);
}

// 🪤 Hai loại clip ghi chung `remotion/out/<id>.mp4`. Trùng id thì bản dựng sau
// ĐÈ bản trước, `publish-clips.mjs` nộp đúng một file, và không có gì báo — chỉ
// là một clip biến mất. Chặn ở đây thay vì trông vào việc người đặt tên nhớ ra.
const seen = new Map();
for (const j of jobs) {
  const truoc = seen.get(j.id);
  if (truoc && truoc !== j.kind) {
    console.error(`\n❌ Trùng id "${j.id}" giữa ${truoc} và ${j.kind}.`);
    console.error('   Hai loại clip ghi chung remotion/out/<id>.mp4 nên bản sau sẽ đè bản trước.');
    console.error('   Đổi tên một trong hai (lib/video/sources/tool-demo.ts hoặc insight.ts).');
    process.exit(1);
  }
  seen.set(j.id, j.kind);
}

const nDemo = jobs.filter((j) => j.kind === 'tool-demo').length;
const nInsight = jobs.length - nDemo;
console.log(`\n📹 Dựng ${jobs.length} clip: ${nDemo} tool-demo · ${nInsight} insight`);
console.log(`   ${jobs.map((j) => j.id).join(' · ')}`);
console.log(`   nguồn quay : ${BASE}`);
console.log(`   cổng 2     : ${NO_AUDIENCE ? 'BỎ QUA' : 'bật'}`);
console.log(`   ngân sách  : ${BUDGET_MIN} phút\n`);

if (DRY) {
  for (const j of jobs) {
    const mp4 = join(OUT_DIR, `${j.id}.mp4`);
    console.log(
      `  ${j.kind.padEnd(10)} ${j.id.padEnd(26)} ${existsSync(mp4) && !FORCE ? '⏭ đã có' : '→ sẽ dựng'}`
    );
  }
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
const results = [];

for (const job of jobs) {
  const tool = job.id;
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
    console.log(`\n${'━'.repeat(60)}\n▶  ${tool}  [${job.kind}]\n${'━'.repeat(60)}`);

    if (job.kind === 'tool-demo') {
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
    } else {
      // Clip insight: không quay gì, đi thẳng cổng 1 → cổng 2 → giọng → render.
      //
      // ⚠️ CỐ Ý KHÔNG truyền `--require-voice`: `gen-insight.mjs` LUÔN dừng khi
      // TTS hỏng (không có nhánh fail-soft), vì clip này thuần chữ + tiếng —
      // một bản câm không còn gì để duyệt, khác `gen-video` nơi vẫn xem được bố
      // cục bản quay màn hình. Truyền một cờ script không đọc thì nó bị bỏ qua
      // IM LẶNG, tạo cảm giác an toàn giả.
      //
      // 💾 `--crf`: BẮT BUỘC ở đường tự động, không phải chỉnh cho nhẹ máy.
      // Đo thật: ở CRF mặc định (18) clip insight ra ~1,19 MB/giây, tức chạm
      // trần 60MB của bucket `clips` ở khoảng GIÂY THỨ 50 — mà mọi kịch bản
      // insight hiện có đều 80–92 giây. Để mặc định thì batch dựng xong rồi
      // `clip-ingest` từ chối sạch, và lỗi hiện ra chỉ là một mã HTTP.
      // CRF 26 đo được 0,15 MB/giây (91,6s → 13,7MB) — thừa chỗ.
      // 🔑 Và đây KHÔNG phải hạ chất lượng lén: cả bốn clip Henry đã xem và
      // duyệt đều render ở đúng CRF này.
      run('node', [
        'scripts/gen-insight.mjs',
        '--id',
        tool,
        '--crf',
        CRF,
        ...(NO_AUDIENCE ? ['--no-audience'] : []),
      ]);
    }

    // 3. Soi lại file. Bắt được: mất track hình, mất HẲN âm thanh, clip cụt.
    //    KHÔNG bắt được ca mất riêng lời đọc — xem chú thích đầu file.
    const info = await inspect(mp4);
    if (!info.hasVideo) throw new Error('mp4 không có track hình');
    if (!info.hasAudio) throw new Error('mp4 không có track tiếng nào (mất cả nhạc nền)');
    if (info.seconds < 8)
      throw new Error(`clip chỉ ${info.seconds.toFixed(1)}s — quá ngắn, nghi hỏng`);

    // 4. Trần dung lượng của bucket `clips` là 60MB. Clip insight có ảnh nền
    //    (Ken Burns làm mọi khung hình khác nhau) nên nặng gấp ~3,5 lần clip
    //    cùng độ dài không nền — đo thật: 88s ra 49,9MB ở CRF mặc định.
    //    Cảnh báo SỚM ở đây, vì nếu để tới lúc nộp thì lỗi là một mã HTTP của
    //    Storage, không nói gì về nguyên nhân.
    const mb = info.bytes / 1e6;
    if (mb > 55) {
      console.warn(
        `   ⚠️ ${mb.toFixed(1)}MB — sát trần 60MB của bucket. Hạ bằng --crf (26 ≈ giảm 72%).`
      );
    }

    results.push({
      tool,
      status: 'xong',
      note: `${info.seconds.toFixed(1)}s · ${mb.toFixed(1)}MB · ${((Date.now() - t0) / 1000).toFixed(0)}s dựng`,
    });
    console.log(`✓  ${tool} — ${info.seconds.toFixed(1)}s, có đủ hình và tiếng.`);
  } catch (e) {
    // Hỏng một clip KHÔNG kéo cả loạt.
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
