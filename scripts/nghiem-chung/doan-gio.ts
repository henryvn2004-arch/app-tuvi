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
import { sitelinks } from './pack';
import { CHI, gioDaiDien, hangDoi, dongGoiDoan, briefDoan } from '@/lib/nghiem-chung/sinh/doan';

export { CHI, gioDaiDien };

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
const PACK = join(WORK, 'pack');
const BRIEF = join(WORK, 'brief-doan');
for (const d of [PACK, BRIEF, join(WORK, 'doan')]) mkdirSync(d, { recursive: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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
    try {
      const pack = await dongGoiDoan(c, sl[c.qid] || {});
      writeFileSync(join(PACK, `${c.slug}.json`), JSON.stringify(pack));
      writeFileSync(join(BRIEF, `${c.slug}.md`), briefDoan(pack));
      console.error(`✓ ${c.slug}: ${pack.wiki.lang} "${pack.wiki.title}" ${pack.wiki.text.length} ký tự`);
    } catch (e) {
      console.error(`✗ ${c.slug}: ${(e as Error).message}`);
    }
  }
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
