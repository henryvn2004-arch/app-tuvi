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
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ttsScene, pickVoice } from './tts-clip.mjs';
import { compileVideoLib, chayCong2 } from './video-lib.mjs';

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
const VOICE = val('--voice', ''); // ép một giọng cụ thể; bỏ trống = chọn theo tool
const NO_VOICE = has('--no-voice');
/**
 * Coi giọng đọc là BẮT BUỘC: TTS hỏng thì dừng hẳn thay vì render bản không lời.
 *
 * 🔴 Vì sao phải có cờ này thay vì bỏ luôn fail-soft: hai lối dùng cần hai hành
 * vi ngược nhau. Chạy TAY thì fail-soft đúng — mất khoá TTS vẫn duyệt được bố
 * cục và nhịp. Chạy TỰ ĐỘNG hàng loạt thì fail-soft là cách hỏng tệ nhất: cả
 * loạt clip không lời vẫn báo "thành công" rồi đi tiếp ra hàng đợi đăng.
 *
 * ⚠️ Và KHÔNG phát hiện được bằng cách soi file: clip không lời VẪN có track
 * tiếng vì nhạc nền vẫn render. Đã thử thật — bản `--no-voice` cho ra mp4 có
 * đủ `audio aac 2ch`. Nên chốt phải nằm ở ĐÂY, lúc biết TTS hỏng, chứ không
 * nằm ở khâu soi file phía sau.
 */
const REQUIRE_VOICE = has('--require-voice');
const FPS = 30;

if (!TOOL) {
  console.error('Thiếu --tool.');
  process.exit(1);
}

// ── Nạp module TS bằng cách biên dịch tại chỗ ─────────────────────────────
// Phần biên dịch + hook alias `@/` nằm ở `scripts/video-lib.mjs` để hai script
// dựng clip (tool-demo và insight) dùng CHUNG một bản — hai khối tsc chép tay
// là hai bản sẽ trôi khỏi nhau, đúng lớp lỗi repo này đã trả giá nhiều lần.
const { outDir, load } = compileVideoLib(['lib/video/sources/tool-demo.ts']);

const { buildToolDemoSpec, getToolDemoSource } = load('video/sources/tool-demo.js');
const { runMachineGate } = load('video/gate-machine.js');
const { runViralLoop, MAX_ROUNDS } = load('video/viral-loop.js');
const { estimateSpeechSeconds, spokenCta, spokenSceneText } = load('video/script-spec.js');

let spec = buildToolDemoSpec(TOOL);
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
// ⚠️ Đứng TRƯỚC khâu giọng đọc là có chủ đích: cổng có thể VIẾT LẠI lời, mà
// TTS là khoản chi phí biến đổi duy nhất của cả pipeline. Sinh tiếng trước rồi
// mới chấm là trả tiền đọc cho câu sắp bị bỏ đi.
{
  const kq = await chayCong2(runViralLoop, spec, { skip: NO_AUDIENCE, maxRounds: MAX_ROUNDS });
  if (!kq.pass) process.exit(1);
  spec = kq.spec;
}

if (DRY) {
  console.log('\n[dry-run] dừng trước khi render.');
  process.exit(0);
}

// ── Giọng đọc ─────────────────────────────────────────────────────────────
// Sinh TỪNG CẢNH một, rồi lấy ĐỘ DÀI THẬT của file mp3 làm thời lượng cảnh.
// Ước lượng theo số ký tự chỉ đủ cho cổng 1: đã đo và thấy tốc độ đọc câu ngắn
// dao động 11–18 ký tự/giây, sai số 1–2 giây là đủ để hình lệch khỏi tiếng.
const frames = (sec) => Math.max(1, Math.round(sec * FPS));
// Khoảng lặng chèn thêm sau mỗi cảnh.
// ⚠️ 0,12s chứ không phải 0,35s: khoảng lặng là chỗ nhịp clip chùng xuống, và
// cộng dồn qua 5–6 cảnh thì thành gần 2 giây chết. Đủ để câu không dính vào
// nhau, không đủ để người xem kịp chán.
const TAIL = 0.12;

let voices = null;
if (!NO_VOICE) {
  console.log('\n── GIỌNG ĐỌC ────────────────────────────────');
  try {
    const giong = VOICE ? { code: VOICE, ten: '(ép bằng --voice)' } : pickVoice(TOOL);
    console.log(`   giọng: ${giong.ten} — ${giong.code}`);
    // Gửi TTS bản ĐỌC (`speech`), không phải bản viết trên phụ đề. Hai bản chỉ
    // khác nhau ở tên miền / mã / chữ số — xem `Scene.speech` trong script-spec.
    const parts = [spec.hook, ...spec.scenes.map(spokenSceneText), spokenCta(spec)];
    voices = [];
    for (const t of parts) {
      const v = await ttsScene(t, { voice: giong.code });
      voices.push(v);
      console.log(
        `   ${v.cached ? '⏭ có sẵn' : '✓ sinh mới'}  ${v.seconds.toFixed(2)}s  "${t.slice(0, 42)}${t.length > 42 ? '…' : ''}"`
      );
    }
    const tong = voices.reduce((a, v) => a + v.seconds, 0);
    console.log(
      `   tổng ${tong.toFixed(1)}s giọng đọc (ước lượng trước đó: ${g1.metrics.totalSeconds}s)`
    );
  } catch (e) {
    if (REQUIRE_VOICE) {
      console.error(`\n❌ TTS hỏng: ${e.message}`);
      console.error('   --require-voice đang bật ⇒ DỪNG, không render bản không lời.');
      console.error('   Kiểm khoá/kết nối TTS rồi chạy lại.');
      process.exit(1);
    }
    console.warn(`   ⚠️ ${e.message}`);
    console.warn('   → render KHÔNG có giọng đọc; phụ đề vẫn chạy.');
    voices = null;
  }
} else {
  if (REQUIRE_VOICE) {
    console.error('\n❌ --no-voice và --require-voice loại trừ nhau.');
    process.exit(1);
  }
  console.log('\n── GIỌNG ĐỌC · BỎ QUA (--no-voice) ──────────');
}

const dur = (i, fallbackSec) => (voices ? frames(voices[i].seconds + TAIL) : frames(fallbackSec));

/** Độ dài thật (giây) của một file quay màn hình. Đọc hụt → null, không ném. */
async function probeSeconds(file) {
  try {
    const { parseMedia } = await import(
      join(REMOTION, 'node_modules/@remotion/media-parser/dist/esm/index.mjs')
    );
    const { nodeReader } = await import(
      join(REMOTION, 'node_modules/@remotion/media-parser/dist/esm/node.mjs')
    );
    const r = await parseMedia({
      src: file,
      reader: nodeReader,
      fields: { durationInSeconds: true },
      acknowledgeRemotionLicense: true,
    });
    return r.durationInSeconds ?? null;
  } catch {
    return null;
  }
}

/**
 * Rải `startSec` cho các cảnh quay màn hình KHÔNG tự khai.
 *
 * 🔑 Vì sao cần: `startSec` là mốc thời gian bên trong một file mà người viết
 * kịch bản CHƯA nhìn thấy lúc viết. Khai tay 17 công cụ × ~5 cảnh là 85 con số
 * đoán mò, và đoán sai thì hỏng IM LẶNG — `OffthreadVideo` vượt quá độ dài
 * file chỉ đứng hình ở khung cuối, không lỗi, không cảnh báo. Bỏ trống thì mọi
 * cảnh cùng chiếu lại giây 0 và clip trông như một ảnh tĩnh.
 *
 * Cách rải: co giãn theo tỉ lệ để các cảnh quét HẾT chiều dài bản quay, rồi
 * KẸP để không cảnh nào chạy quá đuôi file. Bản quay dài hơn tổng lời đọc thì
 * thành lướt nhanh qua thao tác; ngắn hơn thì các cảnh cuối dồn về đoạn cuối.
 *
 * ⚠️ Cảnh có `startSec` khai tay thì GIỮ NGUYÊN — `than-so-hoc` đã hiệu chỉnh
 * bằng mắt trên bản quay thật, không được đè lên.
 */
async function fillStartSec(scenes, sceneFrames) {
  const idx = scenes
    .map((sc, i) => ({ sc, i }))
    .filter(({ sc }) => sc.visual.kind === 'screen' && sc.visual.startSec == null);
  if (!idx.length) return;

  const byFile = new Map();
  for (const { sc } of idx) {
    const rel = sc.visual.recording;
    if (!byFile.has(rel)) byFile.set(rel, await probeSeconds(join(REMOTION, 'public', rel)));
  }

  const secs = sceneFrames.map((f) => f / FPS);
  const total = secs.reduce((a, b) => a + b, 0) || 1;

  for (const { sc, i } of idx) {
    const R = byFile.get(sc.visual.recording);
    if (!R || R <= 0) {
      sc.visual.startSec = 0;
      continue;
    }
    const before = secs.slice(0, i).reduce((a, b) => a + b, 0);
    const raw = (before / total) * R;
    // Kẹp để cảnh không chạy quá đuôi bản quay (chỗ hình đứng im).
    sc.visual.startSec = Math.max(0, Math.min(raw, R - secs[i]));
  }

  // In ra để soi được bằng mắt: cảnh nào cũng dừng ở cùng một mốc nghĩa là bản
  // quay quá ngắn so với lời đọc — clip sẽ trông như ảnh tĩnh ở đoạn cuối.
  const R0 = byFile.get(idx[0].sc.visual.recording);
  console.log(
    `   mốc hình (bản quay ${R0 ? R0.toFixed(1) + 's' : '?'}): ` +
      idx.map(({ sc }) => `${sc.visual.startSec.toFixed(1)}s`).join(' → ')
  );
}

const sceneFrames = spec.scenes.map((sc, i) =>
  sc.forceSeconds ? frames(sc.forceSeconds) : dur(i + 1, estimateSpeechSeconds(sc.text) + 0.4)
);
await fillStartSec(spec.scenes, sceneFrames);

const props = {
  toolLabel: source.label,
  hook: spec.hook,
  hookDurationInFrames: dur(0, estimateSpeechSeconds(spec.hook) + 0.6),
  ...(voices ? { hookAudio: voices[0].file } : {}),
  scenes: spec.scenes.map((sc, i) => ({
    text: sc.text,
    durationInFrames: sceneFrames[i],
    visual: sc.visual,
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
