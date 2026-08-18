#!/usr/bin/env node
/**
 * Sinh nhạc nền cho clip — tổng hợp bằng toán, ghi thẳng ra WAV.
 *
 *   node scripts/gen-music-bed.mjs --all              # sinh cả bộ
 *   node scripts/gen-music-bed.mjs --style don-dap    # một kiểu
 *   node scripts/gen-music-bed.mjs --style tram-tinh --sec 90
 *
 * 🔑 VÌ SAO TỰ SINH — đã đi tìm nguồn thật trước:
 * (a) mọi kho nhạc miễn phí bị chặn ở tầng mạng của môi trường dựng
 *     (pixabay/freesound/freepd/incompetech đều trả 403);
 * (b) tìm trên GitHub thì file mp3 có thật, nhưng chúng là OST GAME THƯƠNG MẠI
 *     nằm trong repo mã nguồn mở — mã mở KHÔNG có nghĩa nhạc được cấp phép.
 *     Dùng nhạc đó cho nội dung thương mại là mời gỡ video hoặc gắn cờ bản
 *     quyền, đúng rủi ro mà cả track này đi tránh.
 * Tự sinh thì bản quyền thuộc về mình, không ghi công ai, không hết hạn.
 *
 * ⚠️ ĐÁNH ĐỔI PHẢI BIẾT TRƯỚC: nhạc trending trên TikTok còn có vai trò ĐẨY
 * PHÂN PHỐI mà một file tự sinh không thay thế được. File ở đây chỉ để clip
 * không trống tiếng và có nhịp thúc. Muốn ăn thuật toán thì vẫn gắn nhạc
 * trending ngay trong app lúc đăng — hai thứ khác việc, không loại trừ nhau.
 *
 * Thiết kế âm: thang NGŨ CUNG (không có quãng nửa cung nên các nốt chồng lên
 * nhau hầu như không nghịch tai) — thang quen của nhạc cổ truyền phương Đông,
 * hợp chủ đề hơn hẳn thang trưởng/thứ phương Tây.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const MUSIC_DIR = join(ROOT, 'remotion/public/music');
const RATE = 44100;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='));
  if (eq) return eq.slice(f.length + 1);
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const NOTE = { C: 130.81, D: 146.83, E: 164.81, F: 174.61, G: 196.0, A: 220.0 };
/** Ngũ cung: bậc 1 · 2 · 3 · 5 · 6 (theo tỉ lệ tần số). */
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];

/**
 * Các kiểu, khác nhau ở NHỊP chứ không chỉ ở tốc độ.
 *
 * 🔑 HAI HỌ, CỐ Ý KHÔNG GỘP — vì hai loại clip đòi hai thứ ngược nhau:
 *
 *  · **CÓ TRỐNG** (`don-dap` · `cang-thang` · `sang-sua`) — cho clip DEMO công
 *    cụ. Chú thích cũ ở đây ghi đúng một quan sát thật: *"clip ngắn trên TikTok
 *    cần cảm giác bị thúc, nhạc trôi lững lờ làm người xem thấy buồn ngủ và
 *    lướt đi — đã thấy thật ở bản dựng đầu"*. Quan sát đó GIỮ NGUYÊN giá trị,
 *    nhưng nó đo trên clip quay màn hình: ở đó không có gì để cảm, chỉ có thao
 *    tác, nên nhịp phải gánh phần giữ chân.
 *
 *  · **KHÔNG TRỐNG** (`tram-tinh` · `u-hoai` · `lang-le`) — cho clip INSIGHT.
 *    Ở đó nội dung là một câu chạm vào chuyện riêng của người xem, đặt trên
 *    ảnh tối. Cú đập 92–104 nhịp/phút dưới câu *"bạn thuộc kiểu tổn thương
 *    nào"* thì nhạc và lời **đá nhau**, và thứ mất đi chính là cái người ta ở
 *    lại vì nó. Giữ chân ở đây do CHỮ gánh, không do nhịp.
 *
 * ⚠️ Đây vẫn là **nền tổng hợp**, không phải piano thật: sóng sin cộng hài
 * bậc 2/3 nghe gần chuông/pad hơn dây đàn. Đừng quảng cáo là piano.
 */
const STYLES = {
  'don-dap': { bpm: 104, key: 'D', kick: true, hat: true, arp: 0.5, pad: 0.5, drive: 1.5 },
  'cang-thang': { bpm: 92, key: 'C', kick: true, hat: true, arp: 1, pad: 0.7, drive: 1.35 },
  'sang-sua': { bpm: 96, key: 'G', kick: true, hat: false, arp: 0.5, pad: 0.6, drive: 1.3 },
  'tram-tinh': { bpm: 58, key: 'D', kick: false, hat: false, arp: 4, pad: 1, drive: 1.25 },
  // Ba kiểu lặng khác GỐC và khác THƯA để 6 clip insight không nghe y hệt
  // nhau; cùng họ không trống nên đặt cạnh nhau vẫn ra một kênh.
  'u-hoai': { bpm: 52, key: 'A', kick: false, hat: false, arp: 6, pad: 1.1, drive: 1.2 },
  'lang-le': { bpm: 46, key: 'C', kick: false, hat: false, arp: 8, pad: 1.15, drive: 1.15 },
};

/** Sóng có hài — sin thuần nghe quá "điện tử", thêm hài bậc 2/3 cho ấm. */
const tone = (t, f, a) =>
  a *
  (Math.sin(2 * Math.PI * f * t) +
    0.28 * Math.sin(4 * Math.PI * f * t) +
    0.12 * Math.sin(6 * Math.PI * f * t));

function synth(styleName, sec) {
  const S = STYLES[styleName];
  if (!S) throw new Error(`Không có kiểu "${styleName}". Có: ${Object.keys(STYLES).join(' · ')}`);

  const BASE = NOTE[S.key];
  const N = Math.floor(sec * RATE);
  const buf = new Float32Array(N);
  const beat = 60 / S.bpm;

  // Seed cố định theo tên kiểu ⇒ chạy lại ra ĐÚNG một file. Không có tính chất
  // này thì mỗi lượt dựng lại clip là một nền nhạc khác, và bộ video mất nhất quán.
  let seed = 20260815 + styleName.length * 7919;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // ── Nền trầm giữ liên tục ──────────────────────────────────────────────
  for (let i = 0; i < N; i++) {
    const t = i / RATE;
    const breathe = 0.85 + 0.15 * Math.sin(2 * Math.PI * t * 0.07);
    buf[i] += tone(t, BASE / 2, 0.13 * S.pad * breathe);
    buf[i] += tone(t, BASE / 2 + 0.35, 0.08 * S.pad * breathe); // lệch 0,35Hz → dập dềnh
  }

  // ── Trống: cú đập ở phách ─────────────────────────────────────────────
  // Sóng sin quét tần số từ cao xuống thấp = tiếng "thụp" của trống điện tử.
  if (S.kick) {
    for (let b = 0; b * beat < sec - 0.3; b++) {
      const s0 = Math.floor(b * beat * RATE);
      const len = Math.floor(0.16 * RATE);
      for (let i = 0; i < len && s0 + i < N; i++) {
        const p = i / len;
        const f = 105 * Math.pow(0.35, p * 3); // quét 105Hz → ~35Hz
        buf[s0 + i] += Math.sin(2 * Math.PI * f * (i / RATE)) * 0.42 * Math.pow(1 - p, 2.2);
      }
    }
  }

  // ── Hi-hat: nhiễu ngắn ở nửa phách, tạo cảm giác gấp ──────────────────
  if (S.hat) {
    for (let b = 0.5; b * beat < sec - 0.2; b += 1) {
      const s0 = Math.floor(b * beat * RATE);
      const len = Math.floor(0.045 * RATE);
      for (let i = 0; i < len && s0 + i < N; i++) {
        const p = i / len;
        buf[s0 + i] += (rnd() * 2 - 1) * 0.06 * Math.pow(1 - p, 3);
      }
    }
  }

  // ── Nốt ngũ cung ──────────────────────────────────────────────────────
  const every = beat * S.arp;
  for (let start = 0.5; start < sec - 1; start += every) {
    const deg = PENTA[Math.floor(rnd() * PENTA.length)];
    const oct = rnd() < 0.4 ? 2 : 1;
    const f = BASE * deg * oct;
    const dur = every * (S.arp <= 1 ? 1.8 : 1.6 + rnd() * 0.8);
    const amp = (S.arp <= 1 ? 0.05 : 0.055) + rnd() * 0.03;

    const s0 = Math.floor(start * RATE);
    const s1 = Math.min(N, Math.floor((start + dur) * RATE));
    for (let i = s0; i < s1; i++) {
      // Lên nhanh, tắt dài — nghe như tiếng chuông, không đập cứng.
      const p = (i - s0) / (s1 - s0);
      buf[i] += tone(i / RATE, f, amp * Math.min(1, p * 8) * Math.pow(1 - p, 1.7));
    }
  }

  // ── Vào/ra êm + nén mềm ───────────────────────────────────────────────
  const fade = Math.floor(Math.min(1.6, sec / 12) * RATE);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    let g = 1;
    if (i < fade) g = i / fade;
    else if (i > N - fade) g = (N - i) / fade;
    // `tanh` nén mềm thay vì cắt phẳng — cắt phẳng đúng đỉnh sóng tạo méo nghe rõ.
    buf[i] = Math.tanh(buf[i] * g * S.drive) * 0.8;
    peak = Math.max(peak, Math.abs(buf[i]));
  }
  return { buf, N, peak, S, BASE };
}

/**
 * Ghi WAV 16-bit mono.
 * WAV chứ không mp3: máy dựng không có bộ mã hoá mp3, mà Remotion nhận WAV
 * bình thường và tự nén khi xuất mp4. File to hơn nhưng nó nằm trong thư mục
 * dựng, không phải thứ gửi ra ngoài (và đã gitignore).
 */
function writeWav(path, buf, N) {
  const dataLen = N * 2;
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + dataLen, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(dataLen, 40);

  const pcm = Buffer.alloc(dataLen);
  for (let i = 0; i < N; i++) {
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), i * 2);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([h, pcm]));
}

const SEC = Number(val('--sec', '50'));
const styles = has('--all') ? Object.keys(STYLES) : [val('--style', 'don-dap')];

for (const name of styles) {
  const { buf, N, peak, S, BASE } = synth(name, SEC);
  const out = val('--out', join(MUSIC_DIR, `${name}.wav`));
  writeWav(out, buf, N);
  console.log(
    `✓ ${name.padEnd(11)} ${SEC}s · ${S.bpm} nhịp/phút · gốc ${S.key}(${BASE.toFixed(0)}Hz)` +
      `${S.kick ? ' · trống' : ''}${S.hat ? ' · hi-hat' : ''} · đỉnh ${(peak * 100).toFixed(0)}%`
  );
}
console.log(`\nthư mục: ${MUSIC_DIR}`);
