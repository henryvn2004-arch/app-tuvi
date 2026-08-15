#!/usr/bin/env node
/**
 * Dựng một clip: kịch bản → cổng kiểm → (giọng đọc) → Remotion render.
 *
 *   node scripts/gen-video.mjs --tool than-so-hoc
 *   node scripts/gen-video.mjs --tool than-so-hoc --dry-run    # chỉ chạy cổng
 *   node scripts/gen-video.mjs --tool than-so-hoc --still      # 1 khung hình
 *   node scripts/gen-video.mjs --tool than-so-hoc --no-audience
 *
 * Thứ tự cố định, KHÔNG đảo:
 *   1. cổng 1 (máy, 0đ)  →  2. cổng 2 (hội đồng, ~35đ)  →  3. render (đắt nhất)
 * Đưa kịch bản 90 giây qua cổng 2 trước là đốt một lượt model để nghe lại đúng
 * điều một phép trừ đã nói được.
 *
 * ⚠️ Chưa có giọng đọc thì clip vẫn render — chỉ là im lặng, còn phụ đề vẫn
 * chạy. Cố ý fail-soft: thiếu khoá TTS không được chặn cả khâu dựng, vì bố cục
 * và nhịp vẫn duyệt được bằng mắt.
 */
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;
const REMOTION = join(ROOT, 'remotion');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
// Nhận CẢ HAI dạng `--cờ giá-trị` và `--cờ=giá-trị`. Bản đầu chỉ nhận dạng
// đầu, nên `--frame=120` lặng lẽ rơi về mặc định và tôi mất một lượt đi chẩn
// nhầm sang phía Remotion. Cờ không đọc được thì phải hỏng to, đừng im lặng.
const val = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='));
  if (eq) return eq.slice(f.length + 1);
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const TOOL = val('--tool', '');
const DRY = has('--dry-run');
const STILL = has('--still');
const NO_AUDIENCE = has('--no-audience');
const MUSIC = val('--music', '');
const FPS = 30;

if (!TOOL) {
  console.error('Thiếu --tool.');
  process.exit(1);
}

// ── Nạp module TS bằng cách biên dịch tại chỗ ─────────────────────────────
// Cùng lối `scripts/gen-que-images.mjs`: gọi `tsc` CLI chứ không dùng API biên
// dịch trong JS (TypeScript 7 là bản port native, API đó đã biến mất).
// `--ignoreConfig` là BẮT BUỘC — nêu tên file trên dòng lệnh trong khi cwd có
// `tsconfig.json` thì tsc báo TS5112 rồi bỏ cuộc.
const outDir = mkdtempSync(join(tmpdir(), 'video-'));
execFileSync(
  join(ROOT, 'node_modules/.bin/tsc'),
  [
    '--ignoreConfig',
    '--module',
    'commonjs',
    '--target',
    'es2022',
    '--skipLibCheck',
    '--esModuleInterop',
    '--outDir',
    outDir,
    join(ROOT, 'lib/video/script-spec.ts'),
    join(ROOT, 'lib/video/gate-machine.ts'),
    join(ROOT, 'lib/video/sources/tool-demo.ts'),
  ],
  { stdio: 'inherit' }
);

const { buildToolDemoSpec, getToolDemoSource } = require(join(outDir, 'sources/tool-demo.js'));
const { runMachineGate } = require(join(outDir, 'gate-machine.js'));
const { estimateSpeechSeconds } = require(join(outDir, 'script-spec.js'));

const spec = buildToolDemoSpec(TOOL);
const source = getToolDemoSource(TOOL);
if (!spec || !source) {
  console.error(`❌ Chưa có kịch bản cho "${TOOL}" trong lib/video/sources/tool-demo.ts`);
  process.exit(1);
}
if (MUSIC) spec.music = MUSIC;

// ── Cổng 1 ────────────────────────────────────────────────────────────────
console.log('\n── CỔNG 1 · máy ─────────────────────────────');
const g1 = runMachineGate(spec);
console.log(
  `   ${g1.pass ? '✅ QUA' : '❌ TRƯỢT'}  ·  ${g1.metrics.totalSeconds}s · ${g1.metrics.sceneCount} cảnh · hook ${g1.metrics.hookSeconds}s`
);
for (const i of g1.issues) console.log(`   [${i.level}] ${i.code}: ${i.message}`);
if (!g1.pass) {
  console.error('\n❌ Dừng: kịch bản không qua cổng 1. Sửa kịch bản rồi chạy lại.');
  process.exit(1);
}

// ── Cổng 2 ────────────────────────────────────────────────────────────────
if (NO_AUDIENCE) {
  console.log('\n── CỔNG 2 · BỎ QUA (--no-audience) ──────────');
  console.log('   ⚠️ Clip chưa qua hội đồng người xem — chỉ dùng để duyệt bố cục.');
} else {
  console.log('\n── CỔNG 2 · hội đồng người xem ──────────────');
  console.log('   ⚠️ CHƯA NỐI: cần khoá model (GEMINI_API_KEY hoặc ANTHROPIC_API_KEY)');
  console.log('   trong môi trường chạy. Dùng --no-audience để bỏ qua có chủ đích.');
  process.exit(1);
}

if (DRY) {
  console.log('\n[dry-run] dừng trước khi render.');
  process.exit(0);
}

// ── Dựng props cho Remotion ───────────────────────────────────────────────
// Thời lượng từng cảnh suy TỪ LỜI ĐỌC. Khi có giọng đọc thật thì thay bằng độ
// dài file mp3 đo được — chính xác tuyệt đối thay vì ước lượng.
const frames = (sec) => Math.max(1, Math.round(sec * FPS));

const props = {
  toolLabel: source.label,
  hook: spec.hook,
  hookDurationInFrames: frames(estimateSpeechSeconds(spec.hook) + 0.6),
  scenes: spec.scenes.map((sc) => ({
    text: sc.text,
    durationInFrames: frames(sc.forceSeconds ?? estimateSpeechSeconds(sc.text) + 0.4),
    visual: sc.visual,
  })),
  cta: spec.cta,
  ctaDurationInFrames: frames(estimateSpeechSeconds(spec.cta) + 1.2),
  ...(spec.music ? { music: spec.music } : {}),
};

const propsFile = join(outDir, 'props.json');
writeFileSync(propsFile, JSON.stringify(props));

mkdirSync(join(REMOTION, 'out'), { recursive: true });
const outFile = join(REMOTION, 'out', `${TOOL}.${STILL ? 'png' : 'mp4'}`);

// Kiểm file quay màn hình TRƯỚC khi gọi render — render chạy vài phút rồi mới
// chết vì thiếu file là kiểu lãng phí dễ tránh nhất.
for (const sc of spec.scenes) {
  if (sc.visual.kind === 'screen') {
    const f = join(REMOTION, 'public', sc.visual.recording);
    if (!existsSync(f)) {
      console.error(`❌ Thiếu clip quay màn hình: ${f}`);
      console.error(`   Chạy: node scripts/record-tool-demo.mjs --tool ${TOOL}`);
      process.exit(1);
    }
  }
}

console.log(`\n── RENDER ───────────────────────────────────`);
console.log(`   ${STILL ? 'khung hình tĩnh' : 'video'} → ${outFile}`);

execFileSync(
  'npx',
  [
    'remotion',
    STILL ? 'still' : 'render',
    'src/index.ts',
    'ToolDemo',
    outFile,
    `--props=${propsFile}`,
    ...(STILL ? [`--frame=${val('--frame', '40')}`] : []),
  ],
  {
    cwd: REMOTION,
    stdio: 'inherit',
    // Chromium của Playwright đã gỡ chế độ headless cũ → để Remotion tự lo
    // trình duyệt. Xem chú thích trong remotion.config.ts.
    env: { ...process.env, REMOTION_CHROMIUM: 'auto' },
  }
);

console.log(`\n✓ Xong: ${outFile}`);
