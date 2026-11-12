// scripts/gen-glossary.mjs — SINH lib/i18n/glossary/terms.generated.mjs từ tuvi-terms.ts.
//
//   node scripts/gen-glossary.mjs --unihan /đường/dẫn/Unihan_Readings.txt [--check]
//
// Unihan_Readings.txt nằm trong https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
// (giải nén RIÊNG vào một thư mục trống; file này KHÔNG commit). Cột sinh ra:
//   zh-tw = chữ Hán phồn thể gốc · zh-cn = OpenCC tw→cn · ja = OpenCC t→jp (新字体)
//   ko    = Unihan kHangul (luật đầu âm áp cho âm tiết đầu từ) · en = pinyin kMandarin nếu không có tay.
// `--check`: không ghi file, chỉ báo file đang commit có KHỚP kết quả sinh lại không (dùng trong lint).
//
// Cần Node ≥ 22.18 (đọc thẳng .ts không cần tsx). Đây là script chạy tay hiếm khi; kết quả được commit.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Converter } from 'opencc-js';
import { TERMS, CHI_EN, CAN_EN } from '../lib/i18n/glossary/tuvi-terms.ts';
import { CAN_HAN, CHI_HAN, HAN_VIET } from '../lib/hanviet.ts';
import { clientGlossaryJs } from '../lib/i18n/glossary/client-file.mjs';

const OUT = new URL('../lib/i18n/glossary/terms.generated.mjs', import.meta.url);
const OUT_HV = new URL('../lib/i18n/glossary/han-viet-check.json', import.meta.url);
// Bản CLIENT cho lớp hiển thị bảng lá số (W15) — cùng mảng `out`, không chép tay.
const OUT_CLIENT = new URL('../public/tools-shared/glossary.js', import.meta.url);
const args = process.argv.slice(2);
const uIdx = args.indexOf('--unihan');
const CHECK = args.includes('--check');
if (uIdx < 0 || !args[uIdx + 1]) {
  console.error(
    'Thiếu --unihan <Unihan_Readings.txt> (tải Unihan.zip từ unicode.org, giải nén ra thư mục trống).'
  );
  process.exit(2);
}
const uniText = readFileSync(args[uIdx + 1], 'utf8');
const uniSha = createHash('sha256').update(uniText).digest('hex').slice(0, 12);

// ── Unihan: chỉ giữ ba trường cần ────────────────────────────────────────────
const U = new Map(); // codepoint hex → { hangul: [..], mandarin, viet: [..] }
for (const line of uniText.split('\n')) {
  if (!line.startsWith('U+')) continue;
  const [cp, field, val] = line.split('\t');
  if (field !== 'kHangul' && field !== 'kMandarin' && field !== 'kVietnamese') continue;
  const e = U.get(cp) || {};
  if (field === 'kHangul') e.hangul = val.split(' ').map((x) => x.split(':'));
  if (field === 'kMandarin') e.mandarin = val.split(' ')[0];
  if (field === 'kVietnamese') e.viet = val.split(' ');
  U.set(cp, e);
}
const info = (ch) => U.get('U+' + ch.codePointAt(0).toString(16).toUpperCase()) || {};

// ── Hangul: luật đầu âm (두음법칙) cho âm tiết ĐẦU của từ ────────────────────
// ㄹ-đầu → ㅇ khi nguyên âm là ㅑㅕㅖㅛㅠㅣ(ㅒ), còn lại → ㄴ. Ví dụ: 廉 렴→염, 龍 룡→용, 祿 록→녹, 力 력→역.
function dauAm(syl) {
  const c = syl.codePointAt(0) - 0xac00;
  if (c < 0 || c > 11171) return syl;
  const cho = Math.floor(c / 588);
  const jung = Math.floor((c % 588) / 28);
  if (cho !== 5) return syl; // chỉ ㄹ
  const iotized = [2, 3, 6, 7, 12, 17, 20].includes(jung); // ㅑ ㅒ ㅕ ㅖ ㅛ ㅠ ㅣ
  const newCho = iotized ? 11 : 2; // ㅇ : ㄴ
  return String.fromCodePoint(0xac00 + (newCho * 21 + jung) * 28 + (c % 28));
}
// Chọn âm gốc của MỘT chữ từ danh sách kHangul ("녹:0 록:0E"): (1) âm gắn cờ E (âm chuẩn giáo dục);
// (2) không có E thì âm bắt đầu bằng ㄹ nếu danh sách chứa cả dạng đã qua đầu âm của nó (狼 랑/낭 → 랑);
// (3) còn lại lấy âm đầu tiên. Đầu âm chỉ áp ở âm tiết ĐẦU từ (xem hangul()), nên giữ âm gốc ㄹ ở giữa từ: 官祿 관록.
function amGoc(list) {
  const e = list.find(([, tag]) => tag.includes('E'));
  if (e) return e[0];
  const l = list.find(([r]) => dauAm(r) !== r && list.some(([x]) => x === dauAm(r)));
  return (l || list[0])[0];
}
function hangul(han, where) {
  const out = [];
  for (const ch of [...han]) {
    const list = info(ch).hangul;
    if (!list) throw new Error(`${where}: chữ ${ch} không có kHangul`);
    out.push(amGoc(list));
  }
  out[0] = dauAm(out[0]);
  return out.join('');
}
function pinyin(han, where) {
  return [...han]
    .map((ch) => {
      const m = info(ch).mandarin;
      if (!m) throw new Error(`${where}: chữ ${ch} không có kMandarin`);
      const s = m.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ü/g, 'u');
      return s[0].toUpperCase() + s.slice(1);
    })
    .join(' ');
}

const toCn = Converter({ from: 'tw', to: 'cn' });
const toJp = Converter({ from: 't', to: 'jp' });
const noTone = (s) =>
  s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/y/g, 'i');

const warns = [];
const out = [];
function them(k, vi, han, en, flags, nSyl, ov = {}) {
  const where = `${k}:${vi}`;
  const sylVi = vi.split(/\s+/).length;
  const expected = nSyl ?? sylVi;
  // Cờ 'v' (tên Việt không phải phiên Hán-Việt: Bạch Dương ↔ 牡羊座) cũng miễn kiểm số chữ — W25.
  if (!flags.includes('n') && !flags.includes('v') && [...han].length !== expected)
    throw new Error(`${where}: ${[...han].length} chữ Hán ≠ ${expected} âm tiết`);
  // Soát chéo với Unihan kVietnamese: chỉ CẢNH BÁO (kVietnamese hay ghi âm thuần Việt: 紫 "tía").
  const syl = vi.split(/\s+/);
  if (k !== 'gio' && !flags.includes('n') && syl.length === [...han].length) {
    [...han].forEach((ch, i) => {
      const v = info(ch).viet;
      if (v && !v.some((x) => noTone(x) === noTone(syl[i])))
        warns.push(`${where}: ${ch} kVietnamese=${v.join('/')} ≠ ${syl[i]}`);
    });
  }
  out.push({
    k,
    vi,
    en: en || pinyin(han, where),
    'zh-tw': han,
    'zh-cn': ov['zh-cn'] ?? toCn(han),
    ja: ov.ja ?? toJp(han),
    ko: ov.ko ?? hangul(han, where),
    ...(flags ? { f: flags } : {}),
  });
}

for (const [k, vi, han, en = '', flags = '', ov] of TERMS) {
  // Cung: tên Việt không kèm "cung" nhưng Hán có 宮 ⇒ +1 chữ.
  them(k, vi, han, en, flags, k === 'cung' ? vi.split(/\s+/).length + 1 : undefined, ov);
}

// Can · Chi · 60 cặp Can-Chi — chữ Hán lấy ĐẢO từ lib/hanviet.ts (không gõ lại).
const canVi = Object.fromEntries(Object.entries(CAN_HAN).map(([h, v]) => [v, h]));
const chiVi = Object.fromEntries(Object.entries(CHI_HAN).map(([h, v]) => [v, h]));
for (const [vi, h] of Object.entries(canVi)) them('can', vi, h, CAN_EN[vi], 'x');
for (const [vi, h] of Object.entries(chiVi)) them('chi', vi, h, CHI_EN[vi], 'x');
const CAN = Object.keys(canVi); // thứ tự Giáp…Quý theo hanviet (khớp thứ tự chuẩn)
const CHI = Object.keys(chiVi);
if (
  CAN.join() !== 'Giáp,Ất,Bính,Đinh,Mậu,Kỷ,Canh,Tân,Nhâm,Quý' ||
  CHI.join() !== 'Tý,Sửu,Dần,Mão,Thìn,Tỵ,Ngọ,Mùi,Thân,Dậu,Tuất,Hợi'
)
  throw new Error(
    'thứ tự Can/Chi trong hanviet.ts không phải thứ tự chuẩn — dừng, đừng sinh cặp sai'
  );
for (let i = 0; i < 60; i++) {
  const c = CAN[i % 10];
  const z = CHI[i % 12];
  them('canchi', `${c} ${z}`, canVi[c] + chiVi[z], `${CAN_EN[c]}-${CHI_EN[z].split(' ')[0]}`, '');
}
// "Giờ Tý"…"Giờ Hợi" (W6b): Hán = chi + 時 (子時), ja = 子の刻, ko = Unihan (자시), en = pinyin + "hour". Sinh từ chiVi — không gõ tay.
for (const z of CHI)
  them('gio', `Giờ ${z}`, chiVi[z] + '時', `${CHI_EN[z].split(' ')[0]} hour`, '', undefined, {
    ja: `${chiVi[z]}の刻`,
  });

const dup = out.map((t) => `${t.k}:${t.vi}`).filter((x, i, a) => a.indexOf(x) !== i);
if (dup.length) throw new Error('trùng thuật ngữ: ' + [...new Set(dup)].join(', '));

const json = `// SINH bằng scripts/gen-glossary.mjs (Unihan sha256:${uniSha}) từ tuvi-terms.ts — ĐỪNG sửa tay.
// .mjs thuần (không import JSON) để Next, tsc và Node ≥20 đọc chung mà không cần import attributes.
export const GENERATED_TERMS = ${JSON.stringify(out, null, 1)};
`;
// ── Bảng âm đọc PHỤ cho bộ dò check:glossary ────────────────────────────────────────────────
// Chỉ gồm chữ mà lib/hanviet.ts CHƯA có (cả bản phồn lẫn giản). Âm đọc = Unihan kVietnamese, giữ MỌI âm, không chọn tay.
// Chữ không có kVietnamese ⇒ mảng rỗng (bộ dò để THIẾU). Hán-Việt chuẩn thường KHÔNG có ở đây khi kVietnamese chỉ ghi âm thuần Việt (紫 → tía).
const BANG_HV = { ...HAN_VIET, ...CAN_HAN, ...CHI_HAN };
const chars = {};
for (const t of out) {
  const tw = [...t['zh-tw']];
  const cn = [...t['zh-cn']];
  tw.forEach((ch, i) => {
    if (BANG_HV[ch] || BANG_HV[cn[i]] || ch in chars) return;
    chars[ch] = info(ch).viet || info(cn[i]).viet || [];
  });
}
const sortedChars = Object.fromEntries(
  Object.entries(chars).sort(([a], [b]) => a.localeCompare(b, 'zh'))
);
const jsonHv =
  JSON.stringify(
    {
      _: `SINH bằng scripts/gen-glossary.mjs từ Unihan kVietnamese (sha256:${uniSha}) — chỉ chữ chưa có trong lib/hanviet.ts; ĐỪNG sửa tay.`,
      unihan: uniSha,
      chars: sortedChars,
    },
    null,
    1
  ) + '\n';

if (CHECK) {
  const cur = readFileSync(OUT, 'utf8');
  console.log(
    cur === json
      ? 'terms.generated.mjs khớp nguồn.'
      : 'terms.generated.mjs LỆCH nguồn — chạy lại gen-glossary.'
  );
  const okHv = readFileSync(OUT_HV, 'utf8') === jsonHv;
  if (!okHv) console.log('han-viet-check.json LỆCH nguồn — chạy lại gen-glossary.');
  const okClient = readFileSync(OUT_CLIENT, 'utf8') === clientGlossaryJs(out);
  if (!okClient) console.log('public/tools-shared/glossary.js LỆCH nguồn — chạy lại gen-glossary.');
  process.exit(cur === json && okHv && okClient ? 0 : 1);
}
writeFileSync(OUT, json);
writeFileSync(OUT_HV, jsonHv);
writeFileSync(OUT_CLIENT, clientGlossaryJs(out));
console.log(`Đã ghi ${out.length} thuật ngữ. Cảnh báo kVietnamese (xem lại): ${warns.length}`);
if (warns.length) console.log(warns.join('\n'));
