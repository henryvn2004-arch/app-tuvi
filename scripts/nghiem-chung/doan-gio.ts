// scripts/nghiem-chung/doan-gio.ts
// ============================================================
// "Đoán giờ sinh" — nhánh RIÊNG của Nghiệm Chứng cho người nổi tiếng KHÔNG có
// giờ sinh công khai (Henry duyệt 2026-10-02). Người VIỆT: bỏ hẳn chính trị, tôn giáo
// và Phạm Nhật Vượng (luật VN riêng) — người nước ngoài không áp luật này.
// Engine lập đủ 12 lá số (12 canh giờ), agent chấm giờ nào khớp đời thật nhất,
// rồi viết hồ sơ như thường cho giờ đã chọn. Vì giờ được chọn THEO đời thật nên
// trang phải ghi rõ đây là giờ SUY ĐOÁN, không hiện tỷ lệ khớp như phép thử độc lập.
//
//   npx tsx scripts/nghiem-chung/doan-gio.ts goi [<qid>…]   # đóng gói + brief 12 giờ
//   npx tsx scripts/nghiem-chung/doan-gio.ts lo --limit 40  # lô kế tiếp theo thứ tự file: đóng gói,
//                                                          # in mảng slug có brief (cho Workflow doan)
//   npx tsx scripts/nghiem-chung/doan-gio.ts chot <slug>    # đọc work/nghiem-chung/doan/<slug>.json,
//                                                          # chốt giờ vào gói, in brief thường
//
// Đầu vào: data/nghiem-chung/doan-gio.jsonl (cột công khai của celeb_births), XẾP SẴN theo bậc:
// Việt Nam → Đông Á + Đông Nam Á → phần còn lại châu Á (sitelinks ≥ 40) — thứ tự file là thứ tự chạy.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { banKeLaSo } from '@/lib/nghiem-chung/engine-ref';
import { slugify, sitelinks, extract, gon, banXu, danhSach } from './pack';

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
const PACK = join(WORK, 'pack');
const BRIEF = join(WORK, 'brief-doan');
for (const d of [PACK, BRIEF, join(WORK, 'doan')]) mkdirSync(d, { recursive: true });
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
/** Giờ đồng hồ đại diện của canh giờ i (Tý lấy 0h để không nhảy sang ngày hôm trước). */
export const gioDaiDien = (i: number) => (i === 0 ? 0 : i * 2);
const KHOANG = (i: number) => (i === 0 ? '23h–1h' : `${i * 2 - 1}h–${i * 2 + 1}h`);
const CUNG_XET = ['Mệnh', 'Quan Lộc', 'Tài Bạch', 'Thiên Di', 'Phúc Đức'];
const WIKI_MAX = 18000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const LUAT_DOAN = `## Bước 1 — chấm 12 giờ (ghi work/nghiem-chung/doan/<slug>.json)
Người này KHÔNG có giờ sinh công khai. Với MỖI giờ dưới đây, chấm 0–100: lá số giờ đó khớp đời thật (wiki.text) đến đâu.
- Nặng nhất: ĐẠI VẬN theo năm — giai đoạn thăng hoa trong bài phải rơi vào đại vận điểm cao, giai đoạn chững/khó rơi vào điểm thấp.
- Sau đó: Mệnh + Quan Lộc (tính cách, nghề, kiểu thành công), Tài Bạch, Thiên Di (xuất ngoại, danh tiếng ngoài), Phúc Đức.
- KHÔNG dùng hôn nhân, sức khoẻ, đời tư người đang sống để chấm. Chỉ sự kiện công khai có trong bài.
- Chấm phân hoá thật: giờ khớp nhất và kém nhất phải chênh rõ; nếu nhiều giờ ngang nhau thì doTinCay = "thap".
JSON: {"bang":[{"gio":"Tý","diem":0-100,"lyDo":"1–2 câu cụ thể, 30–300 ký tự"} … đủ 12 giờ Tý→Hợi],
 "chon":"<giờ điểm cao nhất>","doTinCay":"cao|vua|thap",
 "giaiThich":"2–4 câu (100–700 ký tự): vì sao giờ này khớp nhất, giờ nào bám sát thứ hai, và nhắc đây là giờ xác định qua đối chiếu với đời thật, không phải giờ khai sinh — KHÔNG dùng chữ \"đoán\""}
Rồi chạy: npx tsx scripts/nghiem-chung/doan-gio.ts chot <slug>  → nó in đường dẫn brief THƯỜNG của giờ đã chọn.
## Bước 2 — đọc brief thường đó, viết hồ sơ như mọi hồ sơ Nghiệm Chứng (nháp + validate.ts), chấm NGHIÊM như luật trong brief.`;

/** Hàng đợi: tên bỏ phần chú thích "(cầu thủ…)"; slug trùng (trong file hoặc với kho có giờ) thì gắn năm sinh. */
function hangDoi(): Any[] {
  const rows = readFileSync(join(ROOT, 'data', 'nghiem-chung', 'doan-gio.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Any);
  const daCo = new Set(danhSach().map((c) => c.slug));
  const dem = new Map<string, number>();
  for (const r of rows) {
    r.ten = String(r.name).replace(/\s*\(.*\)$/, '');
    const s0 = slugify(r.ten) || r.qid.toLowerCase();
    dem.set(s0, (dem.get(s0) || 0) + 1);
    r.slug = s0;
  }
  for (const r of rows) if ((dem.get(r.slug) || 0) > 1 || daCo.has(r.slug)) r.slug = `${r.slug}-${r.birth_date.slice(0, 4)}`;
  return rows;
}
const daXong = (slug: string) =>
  existsSync(join(ROOT, 'data', 'nghiem-chung', 'ho-so', `${slug}.json.gz`)) ||
  existsSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${slug}.txt`));

async function lo(limit: number) {
  const rows = hangDoi()
    .filter((r) => !daXong(r.slug))
    .slice(0, limit);
  await goi(rows.filter((r) => !existsSync(join(BRIEF, `${r.slug}.md`))));
  console.log(JSON.stringify(rows.map((r) => r.slug).filter((s) => existsSync(join(BRIEF, `${s}.md`)))));
}

async function goi(rows: Any[]) {
  if (!rows.length) return;
  const sl = await sitelinks(rows.map((r) => r.qid));
  for (const c of rows) {
    const slug = c.slug;
    const links = sl[c.qid] || {};
    const cands: { lang: string; title: string }[] = [];
    if (links.viwiki) cands.push({ lang: 'vi', title: links.viwiki });
    if (links.enwiki) cands.push({ lang: 'en', title: links.enwiki });
    const bx = banXu(c.country);
    if (bx && bx !== 'vi' && links[`${bx}wiki`]) cands.push({ lang: bx, title: links[`${bx}wiki`] });
    let best = { lang: '', title: '', text: '' };
    try {
      for (const k of cands) {
        const t = await extract(k.lang, k.title);
        if (t.length > best.text.length) best = { ...k, text: t };
      }
    } catch (e) {
      console.error(`✗ ${slug}: ${(e as Error).message}`);
      continue;
    }
    if (!best.text) {
      console.error(`✗ ${slug}: không tải được bài Wikipedia`);
      continue;
    }
    const gender = c.gender === 'nu' ? 'nu' : 'nam';
    const ung = [];
    for (let i = 0; i < 12; i++) ung.push({ gio: CHI[i], laSo: await banKeLaSo(c.birth_date, gioDaiDien(i), gender) });
    const pack = {
      slug,
      qid: c.qid,
      ten: c.ten,
      ngheNghiep: c.occupation,
      quocGia: c.country,
      gioiTinh: gender,
      doan: true,
      sinh: { ngay: c.birth_date, gio: '', gioEngine: -1, tzOffsetPhut: 420, rodden: 'doan' },
      anhCommons: c.image_file,
      sitelinks: c.sitelinks,
      sameAs: [
        `https://www.wikidata.org/wiki/${c.qid}`,
        ...(links.viwiki ? [`https://vi.wikipedia.org/wiki/${encodeURIComponent(links.viwiki.replace(/ /g, '_'))}`] : []),
        ...(links.enwiki ? [`https://en.wikipedia.org/wiki/${encodeURIComponent(links.enwiki.replace(/ /g, '_'))}`] : []),
      ],
      wiki: {
        lang: best.lang,
        title: best.title,
        url: `https://${best.lang}.wikipedia.org/wiki/${encodeURIComponent(best.title.replace(/ /g, '_'))}`,
        text: gon(best.text),
      },
      laSo: null,
      gioCanh: null,
      ung,
    };
    writeFileSync(join(PACK, `${slug}.json`), JSON.stringify(pack));
    writeFileSync(join(BRIEF, `${slug}.md`), briefDoan(pack));
    console.error(`✓ ${slug}: ${best.lang} "${best.title}" ${best.text.length} ký tự`);
  }
}

function briefDoan(p: Any): string {
  const d: string[] = [
    `# BRIEF ĐOÁN GIỜ — ${p.ten} (${p.slug})`,
    `Người: ${p.ten} — ${p.ngheNghiep}, ${p.quocGia}. Sinh ${p.sinh.ngay} (dương lịch), ${p.gioiTinh}. KHÔNG có giờ sinh công khai. Năm nay 2026.`,
    '',
    LUAT_DOAN.replace(/<slug>/g, p.slug),
    '',
    '## 12 lá số (cùng ngày sinh, khác canh giờ)',
  ];
  for (const u of p.ung) {
    const ls = u.laSo;
    if (!ls) continue;
    const i = CHI.indexOf(u.gio);
    d.push(``, `### Giờ ${u.gio} (${KHOANG(i)}) — Mệnh ${ls.menh.diaChi}: ${ls.menh.sao} · Thân ${ls.than} · ${ls.cuc}`);
    for (const c of ls.cung) if (CUNG_XET.includes(c.ten)) d.push(`- ${c.cau[0].text}`);
    d.push(`- Đại vận: ${ls.daiVan.map((v: Any) => `${v.namTu}–${v.namDen} ${v.cung} ${v.diem}`).join(' · ')}`);
  }
  d.push('', `## wiki.text (${p.wiki.lang}, "${p.wiki.title}") — nguồn sự thật DUY NHẤT`, p.wiki.text.slice(0, WIKI_MAX));
  return d.join('\n');
}

function chot(slug: string) {
  const pPath = join(PACK, `${slug}.json`);
  const p = JSON.parse(readFileSync(pPath, 'utf8'));
  const dPath = join(WORK, 'doan', `${slug}.json`);
  if (!existsSync(dPath)) throw new Error(`thiếu ${dPath}`);
  const doan = JSON.parse(readFileSync(dPath, 'utf8'));
  const i = CHI.indexOf(doan.chon);
  if (i < 0) throw new Error(`"chon" phải là một trong ${CHI.join(', ')}`);
  const u = p.ung[i];
  p.sinh.gio = `giờ ${CHI[i]} (xác định)`;
  p.sinh.gioEngine = gioDaiDien(i);
  p.laSo = u.laSo;
  writeFileSync(pPath, JSON.stringify(p));
  // brief.ts chạy main() khi nạp ⇒ gọi như tiến trình con.
  execFileSync('npx', ['tsx', 'scripts/nghiem-chung/brief.ts', slug], { stdio: 'ignore' });
  console.log(`Đã chốt giờ ${CHI[i]}. Đọc tiếp: work/nghiem-chung/brief/${slug}.md (bỏ qua dòng "Ghi nháp…" — đã đúng).`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'goi') await goi(hangDoi().filter((r) => !rest.length || rest.includes(r.qid)));
  else if (cmd === 'lo') await lo(Number(rest[rest.indexOf('--limit') + 1]) || 40);
  else if (cmd === 'chot') chot(rest[0]);
  else console.error('dùng: goi [<qid>…] | chot <slug>');
}
if (process.argv[1]?.endsWith('doan-gio.ts')) main();
