#!/usr/bin/env node
/**
 * Dựng một clip LAYER 1 (insight, không quay màn hình):
 * kịch bản → cổng 1 → giọng đọc → Remotion render.
 *
 *   node scripts/gen-insight.mjs --id ba-kieu-ton-thuong
 *   node scripts/gen-insight.mjs --id ba-the-be-tac --still
 *   node scripts/gen-insight.mjs --list
 *
 * ⚠️ BẢN THỬ NGHIỆM, cố ý tách khỏi `gen-video.mjs`. Hai script hiện trùng
 * nhau ở khâu TTS + gọi render (~40 dòng). Chấp nhận trong lúc còn đang duyệt
 * FORMAT — `gen-video.mjs` đang dựng 18 clip thật, đụng vào nó để thử một
 * định dạng chưa chốt là đặt cược nhầm chỗ. **Chốt format xong thì gộp hai
 * script làm một** (`--source tool-demo|insight`), đừng để hai bản trôi khỏi
 * nhau — đó đúng là cái bẫy repo này đã trả giá nhiều lần.
 */
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import { ttsScene, pickVoice } from './tts-clip.mjs';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;
const REMOTION = join(ROOT, 'remotion');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='));
  if (eq) return eq.slice(f.length + 1);
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const ID = val('--id', '');
const LIST = has('--list');
const STILL = has('--still');
const DRY = has('--dry-run');
const NO_VOICE = has('--no-voice');
const VOICE = val('--voice', '');
const FPS = 30;

// ── Nạp module TS bằng cách biên dịch tại chỗ ─────────────────────────────
// Cùng lối `gen-video.mjs`: gọi `tsc` CLI, KHÔNG dùng API biên dịch trong JS
// (TypeScript 7 là bản port native, API đó đã biến mất). `--ignoreConfig` là
// bắt buộc — nêu tên file trên dòng lệnh khi cwd có tsconfig.json thì tsc báo
// TS5112 rồi bỏ cuộc.
const outDir = mkdtempSync(join(tmpdir(), 'insight-'));
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
    join(ROOT, 'lib/video/sources/insight.ts'),
  ],
  { stdio: 'inherit' }
);

const { buildInsightSpec, getInsightSource, listInsightIds } = require(
  join(outDir, 'sources/insight.js')
);
const { runMachineGate } = require(join(outDir, 'gate-machine.js'));
const { estimateSpeechSeconds, spokenCta, spokenSceneText } = require(
  join(outDir, 'script-spec.js')
);

if (LIST) {
  console.log('\nKịch bản insight có sẵn:');
  for (const id of listInsightIds()) console.log(`  · ${id}`);
  process.exit(0);
}

if (!ID) {
  console.error('Thiếu --id. Xem danh sách: node scripts/gen-insight.mjs --list');
  process.exit(1);
}

const spec = buildInsightSpec(ID);
const source = getInsightSource(ID);
if (!spec || !source) {
  console.error(`❌ Chưa có kịch bản "${ID}" trong lib/video/sources/insight.ts`);
  process.exit(1);
}

// ── Cổng 1 ────────────────────────────────────────────────────────────────
console.log('\n── CỔNG 1 · máy ─────────────────────────────');
const g1 = runMachineGate(spec);
console.log(
  `   ${g1.pass ? '✅ QUA' : '❌ TRƯỢT'}  ·  ${g1.metrics.totalSeconds}s · ${g1.metrics.sceneCount} cảnh · hook ${g1.metrics.hookSeconds}s`
);
for (const i of g1.issues) console.log(`   [${i.level}] ${i.code}: ${i.message}`);
if (!g1.pass) {
  console.error('\n❌ Dừng: kịch bản không qua cổng 1.');
  process.exit(1);
}

if (DRY) {
  console.log('\n[dry-run] dừng trước khi render.');
  process.exit(0);
}

// ── Giọng đọc ─────────────────────────────────────────────────────────────
// Lấy ĐỘ DÀI THẬT của mp3 làm thời lượng cảnh. Ước lượng theo số ký tự chỉ đủ
// cho cổng 1 — đã đo và thấy tốc độ đọc câu ngắn dao động 11–18 ký tự/giây.
const frames = (sec) => Math.max(1, Math.round(sec * FPS));
const TAIL = 0.12;

let voices = null;
if (!NO_VOICE) {
  console.log('\n── GIỌNG ĐỌC ────────────────────────────────');
  const giong = VOICE ? { code: VOICE, ten: '(ép bằng --voice)' } : pickVoice(ID);
  console.log(`   giọng: ${giong.ten} — ${giong.code}`);
  const parts = [spec.hook, ...spec.scenes.map(spokenSceneText), spokenCta(spec)];
  voices = [];
  for (const t of parts) {
    const v = await ttsScene(t, { voice: giong.code });
    voices.push(v);
    console.log(
      `   ${v.cached ? '⏭ có sẵn' : '✓ sinh mới'}  ${v.seconds.toFixed(2)}s  "${t.slice(0, 40)}${t.length > 40 ? '…' : ''}"`
    );
  }
  console.log(
    `   tổng ${voices.reduce((a, v) => a + v.seconds, 0).toFixed(1)}s (ước lượng: ${g1.metrics.totalSeconds}s)`
  );
} else {
  console.log('\n── GIỌNG ĐỌC · BỎ QUA (--no-voice) ──────────');
}

const dur = (i, fallbackSec) => (voices ? frames(voices[i].seconds + TAIL) : frames(fallbackSec));

/**
 * Tải ảnh từ URL về `remotion/public/` rồi trỏ cảnh sang bản local.
 *
 * 🪤 VÌ SAO BẮT BUỘC, không phải tối ưu cho vui: Remotion tải ảnh bằng CHÍNH
 * Chromium của nó. Trong container phát triển, HTTPS đi qua một proxy có CA
 * riêng — `fetch` của Node tin CA đó, còn Chromium thì KHÔNG, nên mọi ảnh
 * `https://` chết với `ERR_CERT_AUTHORITY_INVALID` và cả lượt render hỏng.
 *
 * Và kể cả không có proxy thì đây vẫn là lối đúng: mỗi khung hình một lượt
 * gọi mạng nghĩa là render vừa chậm vừa phụ thuộc đường truyền, trong khi
 * cùng một bức ảnh dùng lại cho hàng trăm khung.
 *
 * Tên file là BĂM của URL ⇒ chạy lại không tải lại, và hai kịch bản dùng chung
 * một bức thì dùng chung một file.
 */
async function localizeImages(scenes) {
  const dir = join(REMOTION, 'public/img-cache');
  const hits = scenes.filter((s) => s.visual.kind === 'image' && /^https?:/.test(s.visual.src));
  if (!hits.length) return;
  mkdirSync(dir, { recursive: true });
  console.log('\n── ẢNH ──────────────────────────────────────');
  for (const sc of hits) {
    const url = sc.visual.src;
    const ext = (url.match(/\.(png|jpe?g|webp)(?:\?|$)/i)?.[1] ?? 'png').toLowerCase();
    const name = `${createHash('sha1').update(url).digest('hex').slice(0, 12)}.${ext}`;
    const abs = join(dir, name);
    if (!existsSync(abs)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`tải ảnh hỏng (${res.status}): ${url}`);
      writeFileSync(abs, Buffer.from(await res.arrayBuffer()));
      console.log(`   ✓ tải  ${name}  ←  ${url.split('/').pop()}`);
    } else {
      console.log(`   ⏭ có sẵn ${name}`);
    }
    sc.visual.src = `img-cache/${name}`;
  }
}

await localizeImages(spec.scenes);

// Hợp đồng `ScriptSpec` dùng `image` cho ảnh; template `InsightClip` gọi cảnh
// đó là `photo` (nó còn Ken Burns + lớp tối để chữ đọc được trên mọi bức).
// Đổi tên ở ĐÚNG một chỗ này thay vì bắt kịch bản biết tên nội bộ của template.
const toVisual = (v) =>
  v.kind === 'image'
    ? { kind: 'photo', src: v.src, accent: v.accent }
    : { kind: 'typo', accent: v.accent };

const props = {
  topLabel: source.topLabel,
  hook: spec.hook,
  hookDurationInFrames: dur(0, estimateSpeechSeconds(spec.hook) + 0.6),
  ...(voices ? { hookAudio: voices[0].file } : {}),
  scenes: spec.scenes.map((sc, i) => ({
    text: sc.text,
    durationInFrames: sc.forceSeconds
      ? frames(sc.forceSeconds)
      : dur(i + 1, estimateSpeechSeconds(sc.text) + 0.4),
    visual: toVisual(sc.visual),
    ...(voices ? { audio: voices[i + 1].file } : {}),
  })),
  // Phụ đề dùng bản VIẾT — người xem phải gõ lại được tên miền và mã.
  cta: spec.cta,
  ctaDurationInFrames: voices
    ? frames(voices[voices.length - 1].seconds + 0.9)
    : frames(estimateSpeechSeconds(spokenCta(spec)) + 1.2),
  ...(voices ? { ctaAudio: voices[voices.length - 1].file } : {}),
  ...(spec.music ? { music: spec.music } : {}),
};

const propsFile = join(outDir, 'props.json');
writeFileSync(propsFile, JSON.stringify(props));

mkdirSync(join(REMOTION, 'out'), { recursive: true });
const outFile = join(REMOTION, 'out', `${ID}.${STILL ? 'png' : 'mp4'}`);

console.log(`\n── RENDER ───────────────────────────────────`);
console.log(`   ${STILL ? 'khung hình tĩnh' : 'video'} → ${outFile}`);

execFileSync(
  'npx',
  [
    'remotion',
    STILL ? 'still' : 'render',
    'src/index.ts',
    'InsightClip',
    outFile,
    `--props=${propsFile}`,
    ...(STILL ? [`--frame=${val('--frame', '40')}`] : []),
  ],
  {
    cwd: REMOTION,
    stdio: 'inherit',
    env: { ...process.env, REMOTION_CHROMIUM: 'auto' },
  }
);

console.log(`\n✓ Xong: ${outFile}`);
