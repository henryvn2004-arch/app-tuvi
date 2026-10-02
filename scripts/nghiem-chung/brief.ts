// scripts/nghiem-chung/brief.ts
// ============================================================
// Gói MỘT file đọc-một-lần cho agent viết hồ sơ: luật (PROMPT.md) + lá số + bài
// Wikipedia + vận các năm ứng viên (tính sẵn). Đo 2026-10-02: agent cũ tốn 8–9
// lượt công cụ/hồ sơ (đọc PROMPT, đọc gói từng khúc, chạy nam.ts, ghi, validate…)
// và mỗi lượt đọc lại toàn bộ ngữ cảnh ⇒ ~120k token/hồ sơ, gần hết là đọc lại.
// Brief cắt còn 2–3 lượt: Read brief → một lệnh Bash ghi nháp + validate.
//
//   npx tsx scripts/nghiem-chung/brief.ts <slug> [<slug>…]
//   npx tsx scripts/nghiem-chung/brief.ts --shard 0/6     # mọi slug có gói, chưa có hồ sơ
//   … --gon   bản CẮT GỌN: wiki 10k ký tự, 5 năm ứng viên, bản mệnh đúng 8 dòng
//
// Năm ứng viên: các năm (trong đời người) được bài nhắc nhiều nhất — agent chọn
// 3–4 trong số này; mã N<năm>.* khớp đúng thứ validate.ts tự tính lại.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { banKeNam } from '@/lib/nghiem-chung/engine-ref';
import { danhSach } from './pack';

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
const OUT = join(WORK, 'brief');
mkdirSync(OUT, { recursive: true });
const NAM_NAY = 2026;
const GON = process.argv.includes('--gon');
const SO_NAM = GON ? 5 : 8;
const WIKI_MAX = GON ? 10000 : 18000;

const PROMPT_MD = readFileSync(join(ROOT, 'scripts', 'nghiem-chung', 'PROMPT.md'), 'utf8');
const LUAT_DU = PROMPT_MD.slice(PROMPT_MD.indexOf('## Khi nào LOẠI TRỪ'), PROMPT_MD.indexOf('## Trả về')).trim();
const LUAT = GON ? LUAT_DU.replace('Bản mệnh 8–12 dòng', 'Bản mệnh ĐÚNG 8 dòng') : LUAT_DU;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Công cụ Read cắt dòng > 2000 ký tự ⇒ bẻ đoạn dài theo khoảng trắng. Validate gộp khoảng trắng nên trích qua chỗ bẻ vẫn khớp. */
function beDong(t: string, max = 1500): string {
  return t
    .split('\n')
    .map((l) => {
      const out: string[] = [];
      let s = l;
      while (s.length > max) {
        const cut = s.lastIndexOf(' ', max);
        const k = cut > max / 2 ? cut : max;
        out.push(s.slice(0, k));
        s = s.slice(k).trimStart();
      }
      out.push(s);
      return out.join('\n');
    })
    .join('\n');
}

function namUngVien(text: string, namSinh: number): number[] {
  const dem = new Map<number, number>();
  for (const m of text.matchAll(/\b(1[89]\d\d|20[0-2]\d)\b/g)) {
    const y = Number(m[1]);
    if (y > namSinh && y <= NAM_NAY) dem.set(y, (dem.get(y) || 0) + 1);
  }
  return [...dem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, SO_NAM)
    .map(([y]) => y)
    .sort((a, b) => a - b);
}

async function mot(slug: string): Promise<void> {
  const pack: Any = JSON.parse(readFileSync(join(WORK, 'pack', `${slug}.json`), 'utf8'));
  const ls = pack.laSo;
  const wiki = (pack.wiki?.text || '').slice(0, WIKI_MAX);
  const nams = namUngVien(wiki, Number(pack.sinh.ngay.slice(0, 4)));
  const kes = await Promise.all(nams.map((y) => banKeNam(pack.sinh.ngay, pack.sinh.gioEngine, pack.gioiTinh, y)));
  const d: string[] = [
    `# BRIEF — ${pack.ten} (${slug})`,
    `Ghi nháp vào work/nghiem-chung/draft/${slug}.json rồi chạy: npx tsx scripts/nghiem-chung/validate.ts ${slug}`,
    `Người: ${pack.ten} (${pack.qid}) — ${pack.ngheNghiep || ''}, ${pack.quocGia || ''}. Sinh ${pack.sinh.ngay} ${pack.sinh.gio}, ${pack.gioiTinh}. Năm nay ${NAM_NAY}.`,
    '',
    LUAT,
    '',
    `## Lá số (mã câu | câu engine)`,
    `Năm ${ls.canChi} · ${ls.cuc} · Mệnh ${ls.menh.diaChi}: ${ls.menh.sao} · Thân ${ls.than}`,
  ];
  for (const c of ls.cung) for (const x of c.cau) d.push(`${x.id} | ${x.text}`);
  d.push('', '## Đại vận (thuTu · cung · tuổi · năm · điểm · hang)');
  for (const v of ls.daiVan) {
    d.push(`DV${v.thuTu} · ${v.cung} · ${v.tuoiTu}–${v.tuoiDen} tuổi · ${v.namTu}–${v.namDen} · ${v.diem} · ${v.hang}`);
    for (const x of v.cau) d.push(`${x.id} | ${x.text}`);
  }
  if (pack.gioCanh) {
    d.push('', `## gioCanh = ${pack.gioCanh.gio} (giờ sinh sát ranh giới canh giờ) — đại vận lá số giờ cạnh bên`);
    for (const v of pack.gioCanh.laSo.daiVan) d.push(`DV${v.thuTu} · ${v.cung} · ${v.namTu}–${v.namDen} · ${v.diem} · ${v.hang}`);
  }
  d.push('', `## Vận các năm ứng viên (chọn 3–4 năm làm namMoc; chỉ dùng mã N<năm>.* của các năm dưới đây)`);
  for (const k of kes) {
    if (!k) continue;
    d.push(`### ${k.nam} (${k.canChi}, ${k.tuoiMu} tuổi mụ)`);
    for (const x of k.cau) d.push(`${x.id} | ${x.text}`);
  }
  d.push('', `## wiki.text (${pack.wiki?.lang}, "${pack.wiki?.title}") — nguồn sự thật DUY NHẤT; "trich" chép nguyên văn từ đây`);
  d.push(beDong(wiki));
  writeFileSync(join(OUT, `${slug}.md`), d.join('\n'));
}

async function main() {
  const argv = process.argv.slice(2);
  let slugs = argv.filter((a) => !a.startsWith('--'));
  const i = argv.indexOf('--shard');
  if (i >= 0) {
    const [k, n] = argv[i + 1].split('/').map(Number);
    slugs = danhSach()
      .filter((_, j) => j % n === k)
      .map((c) => c.slug)
      .filter(
        (s) =>
          existsSync(join(WORK, 'pack', `${s}.json`)) &&
          !existsSync(join(OUT, `${s}.md`)) &&
          !existsSync(join(ROOT, 'data', 'nghiem-chung', 'ho-so', `${s}.json.gz`)) &&
          !existsSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${s}.txt`)),
      );
  }
  for (const s of slugs) await mot(s);
  console.log(`brief: ${slugs.length}`);
}
main();
