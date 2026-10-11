// lib/nghiem-chung/sinh/doan.ts
// ============================================================
// Phần THUẦN của nhánh "Xác Định Giờ Sinh" (người KHÔNG có giờ sinh công khai): hàng đợi, gói 12 lá số,
// luật chấm 12 giờ, brief. Dùng chung cho scripts/nghiem-chung/doan-gio.ts (ghi file) và cron Vercel.
// Không side-effect ở đầu file. Luật Việt Nam (bỏ chính trị/tôn giáo/Phạm Nhật Vượng) đã lọc sẵn trong
// data/nghiem-chung/doan-gio.jsonl — thêm người Việt mới phải lọc tay.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { banKeLaSo } from '@/lib/nghiem-chung/engine-ref';
import { slugify, banXu, extract, gon, danhSach } from './goi';

const ROOT = process.cwd();
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
/** Giờ đồng hồ đại diện của canh giờ i (Tý lấy 0h để không nhảy sang ngày hôm trước). */
export const gioDaiDien = (i: number) => (i === 0 ? 0 : i * 2);
const KHOANG = (i: number) => (i === 0 ? '23h–1h' : `${i * 2 - 1}h–${i * 2 + 1}h`);
const CUNG_XET = ['Mệnh', 'Quan Lộc', 'Tài Bạch', 'Thiên Di', 'Phúc Đức'];
const WIKI_MAX = 18000;


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const LUAT_DOAN = `## Bước 1 — chấm 12 giờ (ghi work/nghiem-chung/doan/<slug>.json)
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
export function hangDoi(): Any[] {
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

/**
 * Gói cho MỘT người chưa có giờ: chọn bài Wikipedia dài nhất (vi → en → bản xứ) và lập đủ 12 lá số.
 * Ném lỗi khi không tải được bài (lỗi tạm — lượt sau thử lại).
 */
export async function dongGoiDoan(c: Any, links: Record<string, string>): Promise<Any> {
  const cands: { lang: string; title: string }[] = [];
  if (links.viwiki) cands.push({ lang: 'vi', title: links.viwiki });
  if (links.enwiki) cands.push({ lang: 'en', title: links.enwiki });
  const bx = banXu(c.country);
  if (bx && bx !== 'vi' && links[`${bx}wiki`]) cands.push({ lang: bx, title: links[`${bx}wiki`] });
  let best = { lang: '', title: '', text: '' };
  for (const k of cands) {
    const t = await extract(k.lang, k.title);
    if (t.length > best.text.length) best = { ...k, text: t };
  }
  if (!best.text) throw new Error('không tải được bài Wikipedia');
  const gender = c.gender === 'nu' ? 'nu' : 'nam';
  const ung = [];
  for (let i = 0; i < 12; i++) ung.push({ gio: CHI[i], laSo: await banKeLaSo(c.birth_date, gioDaiDien(i), gender) });
  return {
    slug: c.slug,
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
}

/** Chốt giờ đã chọn vào gói (đổi tại chỗ): giờ, giờ engine, lá số. Ném lỗi nếu `chon` không phải một canh giờ. */
export function chotGio(pack: Any, chon: string): void {
  const i = CHI.indexOf(chon);
  if (i < 0) throw new Error(`"chon" phải là một trong ${CHI.join(', ')}`);
  pack.sinh.gio = `giờ ${CHI[i]} (xác định)`;
  pack.sinh.gioEngine = gioDaiDien(i);
  pack.laSo = pack.ung[i].laSo;
}

export function briefDoan(p: Any): string {
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

