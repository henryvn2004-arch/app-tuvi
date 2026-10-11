// scripts/nghiem-chung/validate.ts
// ============================================================
// Bộ kiểm tra hồ sơ Nghiệm Chứng sinh hàng loạt. Agent chạy SAU khi viết
// nháp; lỗi thì sửa nháp rồi chạy lại. Qua hết mới ghi bản chính:
//   work/nghiem-chung/draft/<slug>.json  →  data/nghiem-chung/ho-so/<slug>.json.gz
//
//   npx tsx scripts/nghiem-chung/validate.ts <slug> [<slug>…]
//
// Luật (mỗi luật sinh ra từ một lần cắn thật ở hai hồ sơ viết tay):
//   · Lời lá số chỉ được TRỎ mã câu engine (`laSoRef`), mã phải tồn tại.
//   · Mỗi dòng có kết luận phải kèm `trich` — đoạn NGUYÊN VĂN có trong bài
//     Wikipedia của gói (vụ "4 em gái" bịa từ bản tóm tắt tìm kiếm).
//   · Người còn sống: cấm chủ đề chết/bệnh/tù tội/tình ái/tự tử — kể cả trong
//     câu engine được trích.
//   · Ngưỡng tối thiểu để không thành trang mỏng.
//   · Các trường định danh (qid, ngày giờ, ảnh, sameAs, wiki) LẤY TỪ GÓI,
//     không tin bản agent chép lại.
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { dem } from '@/lib/nghiem-chung';
import { kiemNhap } from '@/lib/nghiem-chung/sinh/kiem';

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
const OUT = join(ROOT, 'data', 'nghiem-chung', 'ho-so');
mkdirSync(OUT, { recursive: true });
const NGAY = '2026-10-01';

export async function kiem(slug: string): Promise<string[]> {
  const pPath = join(WORK, 'pack', `${slug}.json`);
  const dPath = join(WORK, 'draft', `${slug}.json`);
  if (!existsSync(pPath)) return [`không có gói ${pPath}`];
  if (!existsSync(dPath)) return [`không có nháp ${dPath}`];
  const pack = JSON.parse(readFileSync(pPath, 'utf8'));
  let d;
  try {
    d = JSON.parse(readFileSync(dPath, 'utf8'));
  } catch (e) {
    return [`nháp không phải JSON hợp lệ: ${(e as Error).message}`];
  }
  const gp = join(WORK, 'doan', `${slug}.json`);
  const g = pack.doan && existsSync(gp) ? JSON.parse(readFileSync(gp, 'utf8')) : null;
  if (pack.doan && !g) return [`thiếu ${gp} (bước 1 đoán giờ)`];
  const r = await kiemNhap(pack, d, g, NGAY);
  if (r.loaiTru) {
    // Mỗi slug một file — nhiều phiên chạy song song trên nhánh riêng gộp lại không xung đột.
    mkdirSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru'), { recursive: true });
    writeFileSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${slug}.txt`), `${pack.qid}\t${r.loaiTru}\n`);
    console.log(`⊘ ${slug}: loại trừ (${r.loaiTru})`);
    return [];
  }
  if (r.loi.length || !r.hoSo) return r.loi;
  writeFileSync(join(OUT, `${slug}.json.gz`), gzipSync(JSON.stringify(r.hoSo)));
  console.log(`✓ ${slug}: bản mệnh ${dem(r.hoSo.banMenh).tyLe}% · đại vận ${dem(r.hoSo.daiVan).tyLe}% · năm ${dem(r.hoSo.namMoc).tyLe}%`);
  return [];
}

async function main() {
  let bad = 0;
  for (const slug of process.argv.slice(2)) {
    const loi = await kiem(slug);
    if (loi.length) {
      bad++;
      console.log(`✗ ${slug} — ${loi.length} lỗi:\n  - ${loi.join('\n  - ')}`);
    }
  }
  process.exit(bad ? 1 : 0);
}
if (process.argv[1]?.endsWith('validate.ts')) main();
