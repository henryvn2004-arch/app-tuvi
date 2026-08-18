// demo-arcdoc.mjs — Đo `arcDoc` có ăn không trên BẢN LUẬN GIẢI (không phải chat).
//
// Biến DUY NHẤT: system có `${DOC_ARC_LASO}` hay không. Lá số, câu lệnh từng
// phần, model, nhiệt độ, trần token đều giữ y hệt hai nhánh.
//
// Chạy:  GEMINI_API_KEY=... node scripts/demo-arcdoc.mjs
// Khớp prod luận giải: gemini-2.5-flash + thinkingConfig.thinkingBudget = 0.
// ⚠️ Thiếu thinkingBudget thì token suy nghĩ ăn chung maxOutputTokens và CẢ HAI
// nhánh đều cụt giữa câu — hỏng im lặng, nhìn qua tưởng "model viết cụt".

import { readFileSync } from 'fs';

const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const RUNS = Number(process.env.RUNS || 3);
if (!KEY) {
  console.error('Thiếu GEMINI_API_KEY');
  process.exit(1);
}

const BIRTH = { day: 3, month: 6, year: 1998, hourBranch: 1, gender: 'nam' };
const NAM_XEM = 2026;
const GIO = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

function loadEngine() {
  const code = readFileSync('public/tuvi-ansao-engine.js', 'utf8');
  const g = globalThis;
  return new Function('window', 'globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};')(g, g);
}
function computeLaso(b) {
  const { convertDuongToAm, anSaoLaSo } = loadEngine();
  const conv = convertDuongToAm(b.day, b.month, b.year, GIO[b.hourBranch]);
  const al = conv.amLich;
  return anSaoLaSo({
    ngayAL: al.day,
    thangAL: al.month,
    namAL: al.year,
    canNam: conv.canNam,
    chiNam: conv.chiNam,
    gioIdx: b.hourBranch,
    gioitinh: b.gender,
    namXem: NAM_XEM,
  });
}
const starFmt = (s) =>
  !s
    ? ''
    : typeof s !== 'object'
      ? String(s)
      : (s.ten || '') +
        (s.brightness ? '(' + s.brightness + ')' : '') +
        (s.hoa ? '[Hóa ' + s.hoa + ']' : '');

// Khối dữ kiện của MỘT cung — giống hình dạng route đưa vào prompt từng phần.
function cungBlock(ls, pName) {
  const p = (ls.palaces || []).find((x) => x.name === pName);
  if (!p) return '';
  let t = `[${pName}] ${p.canChi || ''}\n`;
  const ch = (p.majorStars || []).map(starFmt).filter(Boolean);
  if (ch.length) t += '  Chính tinh: ' + ch.join(', ') + '\n';
  const ph = (p.minorStars || []).map(starFmt).filter(Boolean).slice(0, 14);
  if (ph.length) t += '  Phụ tinh: ' + ph.join(', ') + '\n';
  (p.cachCuc || []).forEach((c) => {
    t +=
      '  Cách cục — ' +
      (c.ten || '') +
      (c.loai ? ' (' + c.loai + ')' : '') +
      (c.moTa ? ': ' + c.moTa : '') +
      '\n';
  });
  const yn = ls.cachCucTungCung?.[pName] || [];
  if (yn.length) t += '  Ý nghĩa: ' + yn.slice(0, 10).join(' | ') + '\n';
  if (p.luanSao) t += '  Luận sao: ' + p.luanSao + '\n';
  return t;
}

// ── SYSTEM: đọc THẲNG từ route thật, arc resolve từ prompts.ts thật ──
function realSystem() {
  const src = readFileSync('app/api/lasotuvi/route.ts', 'utf8');
  const m = src.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;\n/);
  if (!m) throw new Error('Không bóc được SYSTEM_PROMPT — khối đã đổi tên?');
  const ps = readFileSync('lib/agent/prompts.ts', 'utf8');
  const a = ps.match(/export const DOC_ARC_LASO = arcDoc\(\{[\s\S]*?\n\}\);/);
  if (!a) throw new Error('Không thấy DOC_ARC_LASO');
  // resolve arcDoc bằng chính mã nguồn của nó
  const fn = ps.match(/const arcDoc = \(o: \{[^}]*\}\) => (`[\s\S]*?`);\n/);
  const canCu = a[0].match(/canCu:\s*'([^']*)'/)[1];
  const phepDich = ps.match(/const PHEP_DICH_LASO = (`[\s\S]*?`);\n/)[1];
  const arc = new Function('o', 'return ' + fn[1] + ';')({
    canCu,
    phepDich: new Function('return ' + phepDich + ';')(),
  });
  const xh = ps.match(/export const XUNG_HO_RULE = (`[\s\S]*?`);\n/);
  if (!xh) throw new Error('Không thấy XUNG_HO_RULE');
  const xungHo = new Function('return ' + xh[1] + ';')();
  const base = m[1].replace('${XUNG_HO_RULE}', xungHo);
  const AFTER = base.replace('${DOC_ARC_LASO}', arc);
  const BEFORE = base.replace('\n\n${DOC_ARC_LASO}', '');
  if (AFTER.includes('${') || BEFORE.includes('${'))
    throw new Error('Còn chỗ nội suy chưa resolve');
  if (AFTER.length - BEFORE.length !== arc.length + 2) throw new Error('Δ không khớp — bóc sai');
  return { BEFORE, AFTER, arcLen: arc.length };
}

async function gemini(system, user) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${KEY}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + JSON.stringify(j).slice(0, 300));
  const c = j.candidates?.[0];
  return {
    text: (c?.content?.parts || []).map((p) => p.text || '').join(''),
    finish: c?.finishReason,
  };
}

// ── Bộ đo ────────────────────────────────────────────────────────
const KHAU_NGU = /(^|[\s,;—-])(thì|à|này|nhé|đấy|cơ|chứ|mà|ấy)([\s,.;!?]|$)/gi;
// Tên sao/cung MỞ ĐẦU câu — thứ arc bảo đừng làm.
const TEN_RIENG = [
  'Tử Vi',
  'Thiên Cơ',
  'Thái Dương',
  'Vũ Khúc',
  'Thiên Đồng',
  'Liêm Trinh',
  'Thiên Phủ',
  'Thái Âm',
  'Tham Lang',
  'Cự Môn',
  'Thiên Tướng',
  'Thiên Lương',
  'Thất Sát',
  'Phá Quân',
  'Kình Dương',
  'Đà La',
  'Hỏa Tinh',
  'Linh Tinh',
  'Địa Không',
  'Địa Kiếp',
  'Văn Xương',
  'Văn Khúc',
  'Hóa Lộc',
  'Hóa Quyền',
  'Hóa Khoa',
  'Hóa Kỵ',
];
function doDac(t) {
  const clean = t.replace(/\*\*/g, '');
  const cau = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const moDauTenSao = cau.filter((s) => TEN_RIENG.some((n) => s.startsWith(n))).length;
  // dấu hiệu HÀNH VI: câu tả việc làm cụ thể ngoài đời
  const hanhVi = (clean.match(/\b(hay|thường|cứ|là lại|xong là|đến khi)\b/gi) || []).length;
  // dấu hiệu CÂU LẬT
  const lat = (
    clean.match(
      /(tưởng là|tưởng rằng|hoá ra|hóa ra|lại chính là|ngược lại|mà chính|thật ra|lại là chỗ|chính chỗ|đổi lại|cái giá|bù lại|nhưng chính|lại giúp|lại thành lợi)/gi
    ) || []
  ).length;
  return {
    tu: clean.split(/\s+/).filter(Boolean).length,
    khauNgu: (clean.match(KHAU_NGU) || []).length,
    moDauTenSao,
    hanhVi,
    lat,
    inDam: (t.match(/\*\*[^*]+\*\*/g) || []).length,
  };
}

const ls = computeLaso(BIRTH);
const { BEFORE, AFTER, arcLen } = realSystem();
const PHAN = [
  { ten: 'Cung Mệnh', cung: 'Mệnh', budget: '220-280 từ' },
  { ten: 'Cung Quan Lộc', cung: 'Quan Lộc', budget: '120-160 từ' },
  { ten: 'Cung Phu Thê', cung: 'Phu Thê', budget: '120-160 từ' },
];
const user = (p) => `PHẦN — ${p.ten.toUpperCase()} (${p.budget})
Luận cung ${p.cung} theo đúng nguyên tắc trên.

=== LÁ SỐ ===
${cungBlock(ls, p.cung)}`;

console.log(
  `model=${MODEL} · arcDoc=${arcLen} ký tự · system BEFORE=${BEFORE.length} AFTER=${AFTER.length}`
);
console.log(`lá số: ${BIRTH.day}/${BIRTH.month}/${BIRTH.year} giờ Sửu, nam · ${RUNS} lượt/phần\n`);

const tong = { before: [], after: [] };
for (const p of PHAN) {
  for (let i = 0; i < RUNS; i++) {
    for (const [nhan, sys] of [
      ['before', BEFORE],
      ['after', AFTER],
    ]) {
      const r = await gemini(sys, user(p));
      if (r.finish && r.finish !== 'STOP')
        console.log(`  ⚠️ ${p.ten} ${nhan} #${i + 1}: finishReason=${r.finish}`);
      tong[nhan].push({ phan: p.ten, ...doDac(r.text), text: r.text });
      await new Promise((s) => setTimeout(s, 400));
    }
  }
}
const tb = (a, k) => (a.reduce((s, x) => s + x[k], 0) / a.length).toFixed(1);
const coLat = (a) => a.filter((x) => x.lat > 0).length + '/' + a.length;
console.log('| chỉ số | TRƯỚC | SAU |');
console.log('|---|---:|---:|');
for (const k of ['tu', 'khauNgu', 'hanhVi', 'lat', 'moDauTenSao', 'inDam'])
  console.log(`| ${k} | ${tb(tong.before, k)} | ${tb(tong.after, k)} |`);
console.log(`| có câu lật | ${coLat(tong.before)} | ${coLat(tong.after)} |`);
console.log('\n── MẪU (phần Cung Mệnh, lượt 1) ──');
console.log('TRƯỚC:\n' + tong.before[0].text);
console.log('\nSAU:\n' + tong.after[0].text);
