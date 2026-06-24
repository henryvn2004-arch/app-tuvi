// scripts/mine-cach-cuc.mjs
// ─────────────────────────────────────────────────────────────
// Mine cách cục candidates từ corpus (Tử Vi Đẩu Số Tân Biên + KHHB)
// để bổ sung vào public/cach_cuc_all.json.
//
// TRIẾT LÝ (Henry): độ tin cậy KHÔNG phải tần suất (tài liệu lặp nhau).
// Tín hiệu thật = cách ĐƯỢC ĐẶT TÊN. Một tổ hợp có tên (vd "Mã Khốc Khách"
// = Thiên Mã + Thiên Khốc + Điếu Khách) là cách thật, dù chỉ xuất hiện 1 lần.
//
// 2 cách dò TÊN:
//   A. Chuỗi VIẾT-TẮT-SAO liền nhau, viết hoa (Mã Khốc Khách, Khốc Hư,
//      Khôi Việt, Xương Khúc, Long Phượng, Tang Hổ, Kình Đà...). Tên cách
//      thường chính là ghép tên-ngắn các sao.
//   B. Cụm "cách / thành cách / gọi là cách <Tên>" — bắt cả tên mô tả
//      Hán-Việt (Mã đầu đái kiếm, Quân thần khánh hội...).
//
// Quét TOÀN BỘ KHHB (mọi article_type, vì cách có tên hay nằm ở bài luận-lá-số)
// + Tân Biên. Tần suất CHỈ để khử lặp + tie-break nhẹ, KHÔNG để xếp hạng chính.
//
// Output:
//   scripts/out/cach-cuc-candidates.json
//   scripts/out/cach-cuc-report.txt
// Chạy: node scripts/mine-cach-cuc.mjs
// ─────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

const cachDB = JSON.parse(readFileSync(join(ROOT, 'public/cach_cuc_all.json'), 'utf-8'));

// ── Nguồn: Tân Biên + TOÀN BỘ KHHB (mọi type) ────────────────
const docs = [];
const chunks = JSON.parse(readFileSync(join(ROOT, 'chunks_all.json'), 'utf-8'));
for (const ch of chunks) {
  docs.push({ content: ch.content || '', source: 'Tân Biên', docId: ch.source || '[TÂN BIÊN]', type: 'tan-bien' });
}
const articles = JSON.parse(readFileSync(join(ROOT, 'sach/articles.json'), 'utf-8'));
for (const a of articles) {
  docs.push({
    content: a.content || '',
    source: `KHHB${a.khhb_issue ? ' #' + a.khhb_issue : ''}`,
    docId: a.id ?? a.num,
    type: a.article_type || 'khhb',
  });
}

// ── Map VIẾT-TẮT-SAO → tên đầy đủ ────────────────────────────
// Tên cách ghép từ tên-ngắn các sao. 1 viết tắt có thể ứng nhiều sao.
const SHORT2FULL = {
  'Mã': ['Thiên Mã'], 'Khốc': ['Thiên Khốc'], 'Khách': ['Điếu Khách'],
  'Hư': ['Thiên Hư'], 'Khôi': ['Thiên Khôi'], 'Việt': ['Thiên Việt'],
  'Xương': ['Văn Xương'], 'Khúc': ['Văn Khúc'], 'Tả': ['Tả Phụ'],
  'Hữu': ['Hữu Bật'], 'Phụ': ['Tả Phụ'], 'Bật': ['Hữu Bật'],
  'Long': ['Long Trì'], 'Trì': ['Long Trì'], 'Phượng': ['Phượng Các'], 'Các': ['Phượng Các'],
  'Tang': ['Tang Môn'], 'Hổ': ['Bạch Hổ'], 'Kình': ['Kình Dương'], 'Đà': ['Đà La'],
  'Hỏa': ['Hỏa Tinh'], 'Linh': ['Linh Tinh'], 'Không': ['Địa Không'], 'Kiếp': ['Địa Kiếp'],
  'Hồng': ['Hồng Loan'], 'Loan': ['Hồng Loan'], 'Đào': ['Đào Hoa'], 'Riêu': ['Thiên Riêu'],
  'Hình': ['Thiên Hình'], 'Lộc': ['Hóa Lộc', 'Lộc Tồn'], 'Quyền': ['Hóa Quyền'],
  'Khoa': ['Hóa Khoa'], 'Kỵ': ['Hóa Kỵ'], 'Tử': ['Tử Vi'], 'Phủ': ['Thiên Phủ'],
  'Tướng': ['Thiên Tướng'], 'Vũ': ['Vũ Khúc'], 'Liêm': ['Liêm Trinh'], 'Tham': ['Tham Lang'],
  'Cự': ['Cự Môn'], 'Đồng': ['Thiên Đồng'], 'Lương': ['Thiên Lương'], 'Cơ': ['Thiên Cơ'],
  'Nhật': ['Thái Dương'], 'Nguyệt': ['Thái Âm'], 'Sát': ['Thất Sát'], 'Phá': ['Phá Quân'],
  'Hao': ['Đại Hao', 'Tiểu Hao'], 'Tuế': ['Thái Tuế'], 'Quý': ['Thiên Quý'], 'Ấn': ['Quốc Ấn'],
  'Cô': ['Cô Thần'], 'Quả': ['Quả Tú'], 'Tấu': ['Tấu Thư'], 'Binh': ['Phục Binh'],
};
// Token "mạnh" (hiếm trùng từ thường) — yêu cầu ≥1 trong chuỗi để giảm nhiễu.
const STRONG = new Set([
  'Khốc', 'Hư', 'Khôi', 'Việt', 'Xương', 'Khúc', 'Riêu', 'Kình', 'Đà', 'Phượng',
  'Bật', 'Linh', 'Tham', 'Liêm', 'Cự', 'Vũ', 'Phủ', 'Lương', 'Tuế', 'Mã',
  'Loan', 'Trì', 'Các', 'Tang', 'Đào', 'Khách', 'Tả',
]);
const isUpper = (w) => w && /^[\p{Lu}]/u.test(w);
const clean = (w) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');

function resolveRun(tokens) {
  const stars = [];
  for (const t of tokens) {
    const f = SHORT2FULL[t];
    if (!f) return null;
    stars.push(f[0]); // lấy ứng viên đầu (đa nghĩa thì ghi chú sau)
  }
  return [...new Set(stars)];
}

// ── DB keys (khử trùng) ──────────────────────────────────────
const norm = (s) => s.toLowerCase();
const starKey = (arr) => [...new Set(arr.map(norm))].sort().join('|');
const dbKeys = new Set(cachDB.map((c) => starKey([...(c.sao || []), ...(c.saoPhuTro || [])])));
const dbNames = new Set(cachDB.map((c) => norm(c.ten || '')));

const POS_RE = /tốt|đẹp|quý|giàu|sang|phú|vinh|hiển|công danh|may mắn|cát|phát|thành đạt|đại quý|phúc|danh|tài/i;
const NEG_RE = /xấu|hung|bại|phá tán|hại|nghèo|khổ|tai|hoạ|họa|chết|yểu|cô đơn|hình|tù|tật|bệnh|yếu/i;

// key candidate = bộ sao (gộp các tên ghép cùng bộ sao)
const cands = new Map();
function addCand(stars, name, mode, doc, sent) {
  if (!stars || stars.length < 2) return;
  const key = starKey(stars);
  if (dbKeys.has(key)) return; // bộ sao đã có trong DB
  if (name && dbNames.has(norm(name))) return; // tên đã có
  if (!cands.has(key)) {
    cands.set(key, { sao: stars, names: new Set(), modes: new Set(), evidence: [], sources: new Set(), docIds: new Set(), pos: 0, neg: 0 });
  }
  const c = cands.get(key);
  if (name) c.names.add(name);
  c.modes.add(mode);
  c.sources.add(doc.source.startsWith('KHHB') ? 'KHHB' : doc.source);
  c.docIds.add(String(doc.docId));
  if (POS_RE.test(sent)) c.pos++;
  if (NEG_RE.test(sent)) c.neg++;
  if (c.evidence.length < 3) c.evidence.push({ source: doc.source, docId: doc.docId, cau: sent.replace(/\s+/g, ' ').slice(0, 220) });
}

// Mode B: tên cách qua marker — 2 hướng:
//   B1 SAU marker mạnh:  "(thành/gọi là/tên) cách <Tên>"
//   B2 TRƯỚC marker:     "<Tên> (là|thành|gọi là) (một) cách"  ← tiếng Việt hay viết
// Bỏ "cách" trần (quá nhiễu: "cách đây/cách nhau"...).
const NAME_AFTER_RE = /(?:thành cách|hợp thành cách|gọi là cách|tên cách)\s+([\p{Lu}][\p{L}]+(?:\s+[\p{L}]+){1,4})/gu;
const NAME_BEFORE_RE = /([\p{Lu}][\p{L}]+(?:\s+[\p{L}]+){1,4})\s+(?:là|thành|gọi là|hợp thành)\s+(?:một\s+)?cách\b/gu;
const STOP_NAME = /^(đây|đó|này|kia|nhau|biệt|mạng|cục|tính|sống|làm|nói|xa|nhìn|gì|nào|trên|dưới|thức|thế|sách|một|các|cái|người|số|sao|bộ)\b/i;

for (const doc of docs) {
  const content = doc.content || '';
  const sentences = content.split(/(?<=[.!?;:])\s+|\n+/);
  for (const raw of sentences) {
    const sent = raw.trim();
    if (sent.length < 8 || sent.length > 500) continue;

    // ── Mode A: chuỗi viết-tắt-sao viết hoa liền nhau ──
    const words = sent.split(/\s+/);
    let i = 0;
    while (i < words.length) {
      const w0 = clean(words[i]);
      if (SHORT2FULL[w0] && isUpper(w0)) {
        const run = [w0];
        let j = i + 1;
        while (j < words.length) {
          const wj = clean(words[j]);
          if (SHORT2FULL[wj] && isUpper(wj) && run.length < 5) { run.push(wj); j++; }
          else break;
        }
        if (run.length >= 2 && run.some((t) => STRONG.has(t))) {
          const stars = resolveRun(run);
          if (stars && stars.length >= 2) addCand(stars, run.join(' '), 'ten-ghep-sao', doc, sent);
        }
        i = j;
      } else i++;
    }

    // ── Mode B: tên qua marker (2 hướng) ──
    const markHits = [];
    let m;
    NAME_AFTER_RE.lastIndex = 0;
    while ((m = NAME_AFTER_RE.exec(sent)) !== null) markHits.push(m[1].trim());
    NAME_BEFORE_RE.lastIndex = 0;
    while ((m = NAME_BEFORE_RE.exec(sent)) !== null) markHits.push(m[1].trim());
    for (const name of markHits) {
      if (STOP_NAME.test(name)) continue;
      const toks = name.split(/\s+/).map(clean);
      const stars = resolveRun(toks);
      if (stars && stars.length >= 2) addCand(stars, name, 'cach-marker', doc, sent);
      else if (toks.length >= 2) {
        const k = 'NAME::' + norm(name);
        if (dbNames.has(norm(name))) continue;
        if (!cands.has(k)) cands.set(k, { sao: [], names: new Set([name]), modes: new Set(['cach-marker-mota']), evidence: [], sources: new Set(), docIds: new Set(), pos: 0, neg: 0 });
        const c = cands.get(k);
        c.sources.add(doc.source.startsWith('KHHB') ? 'KHHB' : doc.source);
        c.docIds.add(String(doc.docId));
        if (c.evidence.length < 3) c.evidence.push({ source: doc.source, docId: doc.docId, cau: sent.replace(/\s+/g, ' ').slice(0, 220) });
      }
    }
  }
}

// ── Xếp hạng: CÓ TÊN là chính, tần suất chỉ tie-break ────────
const list = [...cands.values()].map((c) => ({
  ten: [...c.names][0] || '',
  tenKhac: [...c.names].slice(1),
  sao: c.sao,
  loai: c.pos > c.neg ? 'tốt' : c.neg > c.pos ? 'xấu' : 'trung',
  mode: [...c.modes].join(','),
  soSao: c.sao.length,
  soNguon: c.sources.size,
  soLanNhac: c.docIds.size,
  trongTanBien: c.sources.has('Tân Biên'),
  evidence: c.evidence,
}));

// hạng: có tên ghép-sao (rõ nhất) > có trong Tân Biên > nhiều nguồn
const modeRank = (x) => (x.mode.includes('ten-ghep-sao') ? 2 : x.mode.includes('cach-marker') && x.sao.length ? 1 : 0);
list.sort((a, b) =>
  modeRank(b) - modeRank(a) ||
  (b.trongTanBien ? 1 : 0) - (a.trongTanBien ? 1 : 0) ||
  b.soNguon - a.soNguon ||
  a.soSao - b.soSao
);

writeFileSync(join(OUT, 'cach-cuc-candidates.json'), JSON.stringify(list, null, 2), 'utf-8');

const named = list.filter((c) => modeRank(c) === 2);
const markerNamed = list.filter((c) => c.mode.includes('cach-marker'));
const lines = [];
lines.push('# Cách cục candidates — CHẤM THEO "CÓ TÊN" (không phải tần suất)');
lines.push(`- Nguồn: ${chunks.length} chunk Tân Biên + ${articles.length} bài KHHB (TẤT CẢ type)`);
lines.push(`- DB hiện có: ${cachDB.length} cách`);
lines.push(`- Candidate MỚI: ${list.length}`);
lines.push(`- Tên ghép-viết-tắt-sao (tin cậy cao nhất): ${named.length}`);
lines.push(`- Có marker "cách <Tên>": ${markerNamed.length}`);
lines.push('');
lines.push('## A. CÁCH CÓ TÊN ghép viết-tắt-sao (duyệt trước)');
for (const c of named) {
  lines.push('');
  lines.push(`### [${c.loai}] "${c.ten}" = ${c.sao.join(' + ')}  (${c.soNguon} nguồn${c.trongTanBien ? ', có Tân Biên' : ''})`);
  for (const e of c.evidence) lines.push(`  > [${e.source}|${e.docId}] ${e.cau}`);
}
lines.push('');
lines.push('## B. Tên qua marker "cách …" (gồm tên mô tả Hán-Việt)');
for (const c of markerNamed.filter((x) => modeRank(x) < 2).slice(0, 80)) {
  lines.push(`- [${c.loai}] "${c.ten}"${c.sao.length ? ' = ' + c.sao.join(' + ') : ' (chưa map được sao)'}  (${c.soNguon} nguồn)`);
}
writeFileSync(join(OUT, 'cach-cuc-report.txt'), lines.join('\n'), 'utf-8');

console.log(`✓ ${list.length} candidate → scripts/out/cach-cuc-candidates.json`);
console.log(`  ${named.length} cách CÓ TÊN ghép-sao · ${markerNamed.length} qua marker "cách"`);
console.log(`✓ report → scripts/out/cach-cuc-report.txt`);
