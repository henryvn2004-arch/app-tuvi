#!/usr/bin/env node
/**
 * Sinh THƯ VIỆN HÌNH MINH HOẠ cho các phần luận giải, bằng gpt-image-2.
 *
 * Ảnh là ASSET TĨNH, vẽ MỘT LẦN rồi dùng mãi — mỗi lượt phục vụ về sau tốn 0đ.
 *
 *   node scripts/gen-illus.mjs --mau                    # 2 bức mẫu duyệt phong cách
 *   node scripts/gen-illus.mjs --id quan-loc:tot:nam    # chỉ định <khía>:<sắc>:<giới>[:<tuổi>][:v<n>]
 *   node scripts/gen-illus.mjs --id xt:tu-tuong:tot:nam # Xem Tuổi — tiền tố "xt:" đọc XEM_TUOI_CANH
 *   node scripts/gen-illus.mjs --mau --dry-run          # chỉ in prompt, KHÔNG gọi API
 *
 * Cờ: --out <thư mục> (mặc định `.illus/`) · --size (mặc định 1536x1024, khổ
 * ngang) · --quality low|medium|high (mặc định medium).
 *
 * Bức đã có trong thư mục đích thì BỎ QUA — chạy lại sau khi đứt mạng không
 * đốt lại tiền cho phần đã xong. Lỗi CHẶN (401/429/quota) dừng CẢ LƯỢT chứ
 * không thử tiếp cho từng bức còn lại.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

// Nạp module prompt (TS) bằng cách biên dịch tại chỗ — cùng cách
// scripts/gen-que-images.mjs đã dùng. `--ignoreConfig` BẮT BUỘC: nêu tên file
// trên dòng lệnh trong khi cwd có tsconfig.json thì tsc báo TS5112 rồi bỏ cuộc.
//
// Máy chưa `npm install` thì `node_modules/.bin/tsc` không tồn tại. Lùi về npx
// nhưng phải NÊU ĐÚNG BẢN trong lockfile: `npx tsc` trần kéo bản bất kỳ còn
// trong cache, không phải bản của repo (đã làm lint đỏ vì lệch bản một lần).
const TSC_LOCAL = join(ROOT, 'node_modules/.bin/tsc');
const TSC_ARGS = [
  '--ignoreConfig',
  '--module',
  'commonjs',
  '--target',
  'es2022',
  '--skipLibCheck',
  '--outDir',
  null,
  join(ROOT, 'lib/media/illus-prompt.ts'),
];
const outDir = mkdtempSync(join(tmpdir(), 'illus-prompt-'));
TSC_ARGS[TSC_ARGS.indexOf(null)] = outDir;
if (existsSync(TSC_LOCAL)) {
  execFileSync(TSC_LOCAL, TSC_ARGS, { stdio: 'inherit' });
} else {
  const ver = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')).packages[
    'node_modules/typescript'
  ].version;
  console.log(`(không có node_modules — dùng npx typescript@${ver} theo lockfile)`);
  execFileSync('npx', ['--yes', '-p', `typescript@${ver}`, 'tsc', ...TSC_ARGS], {
    stdio: 'inherit',
  });
}
const { buildIllusPrompt, KHIA_CANH, buildXemTuoiPrompt, XEM_TUOI_CANH } = require(
  join(outDir, 'illus-prompt.js')
);
if (typeof buildIllusPrompt !== 'function' || typeof buildXemTuoiPrompt !== 'function') {
  console.error(
    '❌ không nạp được buildIllusPrompt/buildXemTuoiPrompt — dừng trước khi đốt tiền vẽ.'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (n) => argv.includes(n);
const OUT = flag('--out', join(ROOT, '.illus'));
const SIZE = flag('--size', '1536x1024');
const QUALITY = flag('--quality', 'medium');
const DRY = has('--dry-run');

// Hai bức mẫu: một CỰC TỐT (nam, văn phòng Sài Gòn — đối chiếu thẳng với ảnh
// phong cách Henry gửi) và một CỰC XẤU (nữ, bàn bếp đầy hoá đơn). Chọn hai cực
// vì thứ cần duyệt không chỉ là nét vẽ mà là BIÊN ĐỘ sắc thái: nếu "xấu" nhìn
// vẫn như "tốt" thì cả hệ 3 bậc vô nghĩa.
const MAU = ['quan-loc:tot:nam:truong-thanh:v1', 'tai-bach:xau:nu:truong-thanh:v3'];

// Tiền tố "xt:" chọn bảng XEM_TUOI_CANH (Xem Tuổi vợ chồng/làm ăn) thay vì
// KHIA_CANH (12 cung + tổng quan) — hai bảng tách riêng, xem lý do ở
// illus-prompt.ts. Không tiền tố thì mặc định KHIA_CANH như cũ.
function parseId(s) {
  const xemTuoi = s.startsWith('xt:');
  const [khia, sac, gioi, tuoi, vs] = (xemTuoi ? s.slice(3) : s).split(':');
  return {
    xemTuoi,
    khia,
    sac,
    gioi,
    tuoi: tuoi || 'truong-thanh',
    v: vs ? +String(vs).replace(/^v/, '') : 1,
  };
}

let pick;
if (has('--id'))
  pick = flag('--id')
    .split(',')
    .map((s) => parseId(s.trim()));
else pick = MAU.map(parseId);

const bad = pick.filter(
  (p) =>
    !(p.xemTuoi ? XEM_TUOI_CANH : KHIA_CANH)[p.khia] ||
    !['tot', 'trung', 'xau'].includes(p.sac) ||
    !['nam', 'nu'].includes(p.gioi)
);
if (bad.length) {
  console.error('Tham số không hợp lệ: ' + JSON.stringify(bad));
  console.error('Khía cạnh hợp lệ (KHIA_CANH): ' + Object.keys(KHIA_CANH).join(' '));
  console.error('Khía cạnh hợp lệ (xt: XEM_TUOI_CANH): ' + Object.keys(XEM_TUOI_CANH).join(' '));
  process.exit(1);
}

const KEY = process.env.OPENAI_API_KEY || '';
if (!KEY && !DRY) {
  console.error('Thiếu OPENAI_API_KEY. Đặt biến môi trường rồi chạy lại, hoặc dùng --dry-run.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const prompts = pick.map((p) => (p.xemTuoi ? buildXemTuoiPrompt : buildIllusPrompt)(p));
console.log(`${prompts.length} bức · ${SIZE} · quality=${QUALITY}${DRY ? ' · DRY-RUN' : ''}`);
console.log(`Thư mục ra: ${OUT}\n`);

let daVe = 0,
  boQua = 0,
  loi = 0;
for (const p of prompts) {
  const dich = join(OUT, `${p.id}.png`);
  if (DRY) {
    console.log(`── ${p.nhan}\n${p.prompt}\n`);
    continue;
  }
  if (existsSync(dich)) {
    boQua++;
    console.log(`⏭  ${p.id} — đã có, bỏ qua`);
    continue;
  }
  try {
    const t0 = Date.now();
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt: p.prompt,
        size: SIZE,
        quality: QUALITY,
        output_format: 'png',
        n: 1,
      }),
    });
    if (!r.ok) {
      const body = (await r.text().catch(() => '')).slice(0, 300);
      // Lỗi CHẶN thì dừng CẢ LƯỢT: thử tiếp chỉ tốn thời gian và vẫn hỏng.
      if ([401, 403, 429].includes(r.status)) {
        console.error(`⛔ ${r.status} — lỗi chặn, DỪNG cả lượt: ${body}`);
        process.exit(1);
      }
      throw new Error(`${r.status}: ${body}`);
    }
    const j = await r.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new Error('API không trả ảnh');
    writeFileSync(dich, Buffer.from(b64, 'base64'));
    const u = j?.usage || {};
    const outTok = u.output_tokens || 0;
    const textTok = u.input_tokens_details?.text_tokens || 0;
    // Giá tra từ bảng của repo (lib/agent/usage.ts): gpt-image-2 textInput $5/1M,
    // imageOutput $30/1M, quy đổi 25.000đ/USD. KHÔNG gõ giá từ trí nhớ.
    const vnd = Math.round(((textTok * 5 + outTok * 30) / 1e6) * 25000);
    daVe++;
    console.log(
      `✅ ${p.id}  ·  ${((Date.now() - t0) / 1000).toFixed(1)}s  ·  ${outTok} token ra  ·  ~${vnd.toLocaleString('vi-VN')}đ`
    );
  } catch (e) {
    loi++;
    console.error(`❌ ${p.id}: ${e.message}`);
  }
}
if (!DRY) {
  console.log(`\nVẽ mới ${daVe} · bỏ qua ${boQua} · lỗi ${loi}`);
  if (loi) process.exitCode = 1;
}
