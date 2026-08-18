#!/usr/bin/env node
/**
 * Dựng một clip LAYER 1 (insight, không quay màn hình):
 * kịch bản → cổng 1 → cổng 2 → giọng đọc → Remotion render.
 *
 *   node scripts/gen-insight.mjs --id ba-kieu-ton-thuong
 *   node scripts/gen-insight.mjs --id ba-the-be-tac --still
 *   node scripts/gen-insight.mjs --id ba-the-be-tac --no-audience
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
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ttsScene, pickVoice } from './tts-clip.mjs';
import { compileVideoLib, chayCong2 } from './video-lib.mjs';

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
/**
 * Bỏ cổng 2 (hội đồng người xem) — không gọi LLM.
 *
 * ⚠️ Clip insight là loại CẦN cổng 2 nhất: nó không có bản quay màn hình làm
 * bằng chứng, toàn bộ giá trị nằm ở chữ. Cờ này để chạy thử tại chỗ khi chưa
 * có khoá model, KHÔNG phải để bỏ qua cho tiện lúc dựng thật.
 */
const NO_AUDIENCE = has('--no-audience');
const VOICE = val('--voice', '');
const FPS = 30;
/**
 * Trần độ dài cho clip insight — mặc định 240s, tức THỰC TẾ KHÔNG CHẶN.
 *
 * Trần 45s của cổng đặt cho clip DEMO CÔNG CỤ, ở đó dài hơn là thừa. Clip dạy
 * một điều gì đó thì 25–30 giây mới hook xong đã hết: người xem không học được
 * gì và clip đọc thành quảng cáo. Đây là quyết định vận hành nên để ở cờ.
 */
const MAX_SECONDS = Number(val('--max-seconds', '240'));
/**
 * Mức nén h264 (thấp = đẹp + nặng). Bỏ trống = giữ mặc định của Remotion (18).
 *
 * 🔑 Vì sao thành cờ chứ không đổi mặc định: ảnh nền chi tiết đẩy dung lượng
 * lên gấp ~3 lần bản chữ thuần (đo được: 12MB → 50MB cho một clip 100 giây),
 * và mọi khung hình đều khác nhau vì Ken Burns chạy suốt. Bản ĐĂNG thì nặng
 * không sao — nền tảng nào cũng nén lại; nhưng bản gửi đi DUYỆT thì có trần.
 * Hai nhu cầu khác nhau nên để người chạy chọn, đừng hạ chất lượng mặc định.
 */
const CRF = val('--crf', '');
/** Khoảng "đẹp" cho clip dạy — ngoài khoảng chỉ WARN, không chặn. */
const SWEET = [45, 120];

// ── Nạp module TS bằng cách biên dịch tại chỗ ─────────────────────────────
// Dùng CHUNG `scripts/video-lib.mjs` với `gen-video.mjs` — xem chú thích ở đó
// về việc phải hook alias `@/` sau khi biên dịch.
const { outDir, load } = compileVideoLib(['lib/video/sources/insight.ts']);

const { buildInsightSpec, getInsightSource, listInsightIds } = load('video/sources/insight.js');
const { runMachineGate } = load('video/gate-machine.js');
const { runViralLoop, MAX_ROUNDS } = load('video/viral-loop.js');
const { estimateSpeechSeconds, spokenCta, spokenSceneText } = load('video/script-spec.js');

if (LIST) {
  console.log('\nKịch bản insight có sẵn:');
  for (const id of listInsightIds()) console.log(`  · ${id}`);
  process.exit(0);
}

if (!ID) {
  console.error('Thiếu --id. Xem danh sách: node scripts/gen-insight.mjs --list');
  process.exit(1);
}

let spec = buildInsightSpec(ID);
const source = getInsightSource(ID);
if (!spec || !source) {
  console.error(`❌ Chưa có kịch bản "${ID}" trong lib/video/sources/insight.ts`);
  process.exit(1);
}

// Ngưỡng cổng 1 của clip insight KHÁC hẳn clip demo tool (80–92s so với 18–32s)
// nên phải đi kèm mọi lượt chấm — kể cả lượt chấm lại BÊN TRONG vòng lặp cổng 2.
// Thiếu nó thì vòng lặp chấm clip này bằng thước của loại khác rồi bắt viết lại
// một lỗi không có thật, mỗi vòng đốt hai lượt LLM.
const GATE = { maxSeconds: MAX_SECONDS, sweetSpot: SWEET };

// ── Cổng 1 ────────────────────────────────────────────────────────────────
console.log('\n── CỔNG 1 · máy ─────────────────────────────');
const g1 = runMachineGate(spec, GATE);
console.log(
  `   ${g1.pass ? '✅ QUA' : '❌ TRƯỢT'}  ·  ${g1.metrics.totalSeconds}s · ${g1.metrics.sceneCount} cảnh · hook ${g1.metrics.hookSeconds}s`
);
for (const i of g1.issues) console.log(`   [${i.level}] ${i.code}: ${i.message}`);
if (!g1.pass) {
  console.error('\n❌ Dừng: kịch bản không qua cổng 1.');
  process.exit(1);
}

// ── Cổng 2 ────────────────────────────────────────────────────────────────
// Đứng TRƯỚC khâu giọng đọc: cổng có thể viết lại lời, mà TTS là khoản chi phí
// biến đổi duy nhất — sinh tiếng trước rồi mới chấm là trả tiền đọc cho câu
// sắp bị bỏ đi. Clip insight dài gấp ba clip demo nên khoản đó cũng gấp ba.
{
  const kq = await chayCong2(runViralLoop, spec, {
    skip: NO_AUDIENCE,
    gate: GATE,
    maxRounds: MAX_ROUNDS,
  });
  if (!kq.pass) process.exit(1);
  spec = kq.spec;
}

if (DRY) {
  // In TRỌN kịch bản để đọc bằng mắt trước khi đốt một lượt TTS + render.
  // 🔑 Duyệt NỘI DUNG rẻ hơn duyệt VIDEO nhiều bậc: một vòng sửa chữ ở đây tốn
  // 0đ và vài giây, còn dựng lại clip là 20 lượt TTS cộng mấy phút render.
  const line = (n, t) => `   ${String(n).padStart(2)}. ${t}`;
  console.log('\n══════════════════════════════════════════════');
  console.log(`  ${spec.title}`);
  console.log(`  nhãn đỉnh: ${source.topLabel}  ·  dẫn về: ${source.toolId}`);
  console.log('══════════════════════════════════════════════');
  console.log(`\n  HOOK  (${estimateSpeechSeconds(spec.hook).toFixed(1)}s)`);
  console.log(`   ▸ ${spec.hook}`);
  console.log(`\n  ${spec.scenes.length} CẢNH`);
  spec.scenes.forEach((sc, i) => {
    console.log(line(i + 1, sc.text));
    if (sc.speech) console.log(`       ↳ đọc: ${sc.speech}`);
  });
  console.log(`\n  CÂU KẾT  (${estimateSpeechSeconds(spokenCta(spec)).toFixed(1)}s)`);
  console.log(`   ▸ ${spec.cta}`);
  if (spec.ctaSpeech) console.log(`   ↳ đọc: ${spec.ctaSpeech}`);
  console.log(`\n  nhạc: ${spec.music ?? '—'}   ·   thẻ: ${(spec.hashtags ?? []).join(' ')}`);
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
    let v;
    try {
      v = await ttsScene(t, { voice: giong.code });
    } catch (e) {
      // 🔑 LUÔN DỪNG, cố ý KHÔNG có cờ `--require-voice` như `gen-video.mjs`.
      //
      // Bên đó fail-soft có lý do: clip demo vẫn còn bản quay màn hình để
      // duyệt bố cục, mất lời đọc thì khó chịu chứ chưa vô dụng. Clip insight
      // thì thuần CHỮ + TIẾNG — một bản câm không còn gì để xem, mà nó vẫn
      // render ra một mp4 "thành công" rồi đi thẳng vào hàng đợi đăng.
      //
      // Trước đây chỗ này không bắt lỗi nên vẫn dừng, nhưng dừng bằng một
      // stack trace thô — người mở log Actions không biết phải sửa gì.
      console.error(`\n❌ TTS hỏng ở câu: "${t.slice(0, 60)}${t.length > 60 ? '…' : ''}"`);
      console.error(`   ${e.message}`);
      console.error('   Clip insight thuần chữ + tiếng ⇒ DỪNG, không render bản câm.');
      console.error('   Kiểm CLIP_TTS_SECRET / SUPABASE_URL rồi chạy lại — câu đã sinh');
      console.error('   xong nằm trong cache nên lượt sau không đọc lại từ đầu.');
      process.exit(1);
    }
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
async function localizeOne(url, dir) {
  if (!/^https?:/.test(url)) return url; // đã là đường dẫn trong public/
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
  return `img-cache/${name}`;
}

async function localizeImages(spec) {
  const dir = join(REMOTION, 'public/img-cache');
  const scenesWithImg = spec.scenes.filter(
    (s) => s.visual.kind === 'image' && /^https?:/.test(s.visual.src)
  );
  const bgRemote = (spec.backdrop ?? []).filter((u) => /^https?:/.test(u));
  if (!scenesWithImg.length && !bgRemote.length) return;

  mkdirSync(dir, { recursive: true });
  console.log('\n── ẢNH ──────────────────────────────────────');
  for (const sc of scenesWithImg) sc.visual.src = await localizeOne(sc.visual.src, dir);
  if (spec.backdrop) {
    spec.backdrop = await Promise.all(spec.backdrop.map((u) => localizeOne(u, dir)));
  }
}

await localizeImages(spec);

// Hợp đồng `ScriptSpec` dùng `image` cho ảnh; template `InsightClip` gọi cảnh
// đó là `photo` (nó còn Ken Burns + lớp tối để chữ đọc được trên mọi bức).
// Đổi tên ở ĐÚNG một chỗ này thay vì bắt kịch bản biết tên nội bộ của template.
const toVisual = (v) =>
  v.kind === 'image'
    ? { kind: 'photo', src: v.src, accent: v.accent }
    : v.kind === 'figure'
      ? { kind: 'figure', pose: v.pose, accent: v.accent, glyph: v.glyph, glyphAt: v.glyphAt }
      : v.kind === 'duo'
        ? { kind: 'duo', poseL: v.poseL, poseR: v.poseR, set: v.set, gap: v.gap, accent: v.accent }
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
  ...(spec.backdrop?.length ? { backdrop: spec.backdrop } : {}),
  ...(spec.backdropVideo ? { backdropVideo: spec.backdropVideo } : {}),
  ...(spec.backdropRate ? { backdropRate: spec.backdropRate } : {}),
  ...(spec.backdropSeconds ? { backdropSeconds: spec.backdropSeconds } : {}),
  ...(spec.hookPose ? { hookPose: spec.hookPose } : {}),
  ...(spec.ctaPose ? { ctaPose: spec.ctaPose } : {}),
  ...(spec.hookGlyph ? { hookGlyph: spec.hookGlyph } : {}),
  ...(spec.ctaGlyph ? { ctaGlyph: spec.ctaGlyph } : {}),
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
    ...(!STILL && CRF ? [`--crf=${CRF}`] : []),
  ],
  {
    cwd: REMOTION,
    stdio: 'inherit',
    env: { ...process.env, REMOTION_CHROMIUM: 'auto' },
  }
);

console.log(`\n✓ Xong: ${outFile}`);
