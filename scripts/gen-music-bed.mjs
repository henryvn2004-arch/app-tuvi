#!/usr/bin/env node
/**
 * Sinh nhạc nền cho clip — tổng hợp bằng toán, ghi thẳng ra file WAV.
 *
 *   node scripts/gen-music-bed.mjs                     # bản mặc định 60 giây
 *   node scripts/gen-music-bed.mjs --sec 90 --out b.wav
 *   node scripts/gen-music-bed.mjs --key D --bpm 60
 *
 * 🔑 VÌ SAO TỰ SINH THAY VÌ TẢI NHẠC MIỄN PHÍ:
 * môi trường dựng chặn mọi kho nhạc (pixabay/freesound/freepd/incompetech đều
 * trả 403 ở tầng chính sách mạng), nên không có đường tải về. Và kể cả tải
 * được thì mỗi track lại kéo theo một điều khoản giấy phép phải đọc và ghi
 * công. Tự sinh thì bản quyền thuộc về mình, không ghi công ai, không hết hạn.
 *
 * ⚠️ ĐÁNH ĐỔI PHẢI BIẾT TRƯỚC: đây là nhạc NỀN, không phải nhạc để nghe. Nó
 * cố ý nhạt — một lớp đệm trầm để clip không bị "trống tiếng" giữa các câu.
 * Nhạc nền trên TikTok còn có vai trò khác hẳn (bám nhạc trending để được đẩy
 * phân phối) mà một file tự sinh KHÔNG thay thế được. Muốn ăn thuật toán thì
 * vẫn nên gắn nhạc trending ngay trong app lúc đăng.
 *
 * Thiết kế âm: thang NGŨ CUNG (không có quãng nửa cung nên hầu như không thể
 * nghịch tai khi các nốt chồng lên nhau) + nốt trầm giữ liên tục. Đây là thang
 * quen thuộc của nhạc cổ truyền phương Đông, hợp chủ đề tử vi hơn hẳn thang
 * trưởng/thứ phương Tây.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const val = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='));
  if (eq) return eq.slice(f.length + 1);
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const SEC = Number(val('--sec', '60'));
const BPM = Number(val('--bpm', '58'));
const KEY = val('--key', 'D');
const OUT = val('--out', join(ROOT, 'remotion/public/music/nen-tram.wav'));
const RATE = 44100;

// Nốt gốc — D trầm cho cảm giác tĩnh, không sáng quá.
const BASE = { C: 130.81, D: 146.83, E: 164.81, F: 174.61, G: 196.0, A: 220.0 }[KEY] ?? 146.83;

/** Ngũ cung: bậc 1 · 2 · 3 · 5 · 6 (tính theo tỉ lệ tần số). */
const PENTATONIC = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];

const N = Math.floor(SEC * RATE);
const buf = new Float32Array(N);

/** Sóng có hài — sin thuần nghe quá "điện tử", thêm hài bậc 2/3 cho ấm. */
function voice(t, freq, amp) {
  return (
    amp *
    (Math.sin(2 * Math.PI * freq * t) +
      0.28 * Math.sin(4 * Math.PI * freq * t) +
      0.12 * Math.sin(6 * Math.PI * freq * t))
  );
}

// ── Lớp 1: nốt trầm giữ liên tục ─────────────────────────────────────────
// Hơi lệch pha giữa hai bè để tiếng "dày" ra mà không cần thêm nốt.
for (let i = 0; i < N; i++) {
  const t = i / RATE;
  const breathe = 0.85 + 0.15 * Math.sin(2 * Math.PI * t * 0.07); // thở rất chậm
  buf[i] += voice(t, BASE / 2, 0.16 * breathe);
  buf[i] += voice(t, BASE / 2 + 0.35, 0.1 * breathe); // lệch 0,35Hz → dập dềnh nhẹ
}

// ── Lớp 2: các nốt ngũ cung rơi thưa ─────────────────────────────────────
const beat = 60 / BPM;
const noteEvery = beat * 4; // rất thưa — nền, không phải giai điệu
let seed = 20260815; // cố định để chạy lại ra đúng một file (deterministic)
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

for (let start = 1.5; start < SEC - 3; start += noteEvery) {
  const deg = PENTATONIC[Math.floor(rnd() * PENTATONIC.length)];
  const oct = rnd() < 0.35 ? 2 : 1; // thỉnh thoảng nhảy quãng tám cho đỡ đều
  const freq = BASE * deg * oct;
  const dur = noteEvery * (1.6 + rnd() * 0.8);
  const amp = 0.055 + rnd() * 0.03;

  const s0 = Math.floor(start * RATE);
  const s1 = Math.min(N, Math.floor((start + dur) * RATE));
  for (let i = s0; i < s1; i++) {
    const t = i / RATE;
    const p = (i - s0) / (s1 - s0);
    // Bao biên độ: lên chậm, tắt dài — nghe như tiếng chuông xa, không đập.
    const env = Math.min(1, p * 6) * Math.pow(1 - p, 1.7);
    buf[i] += voice(t, freq, amp * env);
  }
}

// ── Vào/ra êm + chống vỡ tiếng ───────────────────────────────────────────
const fade = Math.floor(2.2 * RATE);
for (let i = 0; i < N; i++) {
  let g = 1;
  if (i < fade) g = i / fade;
  else if (i > N - fade) g = (N - i) / fade;
  buf[i] *= g;
  // Nén mềm thay vì cắt phẳng: cắt phẳng đúng đỉnh sóng tạo méo nghe rõ.
  buf[i] = Math.tanh(buf[i] * 1.25) * 0.78;
}

// ── Ghi WAV 16-bit mono ──────────────────────────────────────────────────
// Ghi WAV chứ không mp3: máy này không có bộ mã hoá mp3, mà Remotion nhận WAV
// bình thường và tự nén khi xuất mp4. Đổi lại file to hơn — không sao vì nó
// nằm trong repo dựng, không phải thứ gửi ra ngoài.
const header = Buffer.alloc(44);
const dataLen = N * 2;
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataLen, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(dataLen, 40);

const pcm = Buffer.alloc(dataLen);
let peak = 0;
for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, buf[i]));
  peak = Math.max(peak, Math.abs(v));
  pcm.writeInt16LE(Math.round(v * 32767), i * 2);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([header, pcm]));

console.log(`✓ ${OUT}`);
console.log(
  `  ${SEC}s · ${RATE}Hz mono · đỉnh ${(peak * 100).toFixed(0)}% · ${(dataLen / 1e6).toFixed(1)} MB`
);
console.log(`  thang ngũ cung, gốc ${KEY} (${BASE.toFixed(1)}Hz), ${BPM} nhịp/phút`);
