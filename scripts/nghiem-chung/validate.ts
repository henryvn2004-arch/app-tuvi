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
import { banKeNam, bangTra, type BanKeLaSo } from '@/lib/nghiem-chung/engine-ref';
import { dem, type KetLuan } from '@/lib/nghiem-chung';

const ROOT = process.cwd();
const WORK = join(ROOT, 'work', 'nghiem-chung');
const OUT = join(ROOT, 'data', 'nghiem-chung', 'ho-so');
mkdirSync(OUT, { recursive: true });
const NAM_NAY = 2026;
const NGAY = '2026-10-01';

const CUNG = ['Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc', 'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ'];
const KL: KetLuan[] = ['khop', 'mot-phan', 'truot', 'chua-kiem-chung', 'dang-dien-ra'];
const CO_KL = (k: KetLuan) => k === 'khop' || k === 'mot-phan' || k === 'truot';
const NHAY_CAM = /tự tử|treo cổ|nhảy sông|yểu|giảm thọ|ám sát|sát nhân|giết người|ngoại tình|dâm|ăn trộm|tù tội|ngồi tù|chết|ung thư|trăng gió|lẽ mọn|vợ lẽ|sát vợ|khắc chồng/i;

const norm = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[“”«»„"]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—‐-]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export async function kiem(slug: string): Promise<string[]> {
  const loi: string[] = [];
  const pPath = join(WORK, 'pack', `${slug}.json`);
  const dPath = join(WORK, 'draft', `${slug}.json`);
  if (!existsSync(pPath)) return [`không có gói ${pPath}`];
  if (!existsSync(dPath)) return [`không có nháp ${dPath}`];
  const pack = JSON.parse(readFileSync(pPath, 'utf8'));
  let d: Any;
  try {
    d = JSON.parse(readFileSync(dPath, 'utf8'));
  } catch (e) {
    return [`nháp không phải JSON hợp lệ: ${(e as Error).message}`];
  }

  if (d.loaiTru) {
    // Mỗi slug một file — nhiều phiên chạy song song trên nhánh riêng gộp lại không xung đột.
    mkdirSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru'), { recursive: true });
    writeFileSync(join(ROOT, 'data', 'nghiem-chung', 'loai-tru', `${slug}.txt`), `${pack.qid}\t${d.loaiTru}\n`);
    console.log(`⊘ ${slug}: loại trừ (${d.loaiTru})`);
    return [];
  }
  if (!pack.wiki?.text) loi.push('gói không có bài Wikipedia — đặt "loaiTru": "thieu-nguon"');
  const ls: BanKeLaSo = pack.laSo;
  const wiki = norm(pack.wiki?.text || '');
  const namSinh = Number(pack.sinh.ngay.slice(0, 4));
  const namMat: number | undefined = d.namMat ? Number(d.namMat) : undefined;
  const conSong = !namMat;
  if (namMat && (namMat < namSinh || namMat > NAM_NAY)) loi.push(`namMat ${namMat} vô lý`);

  // Năm mốc: tính bản kê năm để tra mã N<năm>.*
  const nams = Array.isArray(d.namMoc) ? d.namMoc : [];
  const kes = await Promise.all(
    nams.map((n: Any) => banKeNam(pack.sinh.ngay, pack.sinh.gioEngine, pack.gioiTinh, Number(n.nam))),
  );
  const tra = bangTra(ls, kes);

  const str = (v: unknown, ten: string, min = 1, max = 2000) => {
    if (typeof v !== 'string' || v.trim().length < min) loi.push(`${ten}: thiếu hoặc quá ngắn (≥${min} ký tự)`);
    else if (v.length > max) loi.push(`${ten}: quá dài (≤${max} ký tự)`);
  };
  const kiemNhayCam = (txt: string, ten: string) => {
    if (conSong && NHAY_CAM.test(txt)) loi.push(`${ten}: người còn sống — có chủ đề nhạy cảm ("${txt.match(NHAY_CAM)![0]}")`);
    if (/\bAI\b|trí tuệ nhân tạo/.test(txt)) loi.push(`${ten}: không nhắc "AI" trong chữ hiển thị`);
  };
  const kiemRef = (refs: unknown, ten: string, phaiCo?: RegExp) => {
    if (!Array.isArray(refs) || !refs.length) return loi.push(`${ten}.laSoRef: trống`);
    for (const r of refs) {
      if (!tra.has(r)) loi.push(`${ten}.laSoRef: mã "${r}" không tồn tại`);
      else kiemNhayCam(tra.get(r)!, `${ten} (câu engine ${r})`);
    }
    if (phaiCo && !refs.some((r: string) => phaiCo.test(r))) loi.push(`${ten}.laSoRef: phải có ít nhất một mã ${phaiCo}`);
  };
  const kiemTrich = (row: Any, ten: string) => {
    if (!CO_KL(row.ketLuan)) return;
    if (typeof row.trich !== 'string' || row.trich.trim().length < 15) return loi.push(`${ten}.trich: thiếu đoạn trích nguyên văn`);
    const parts = row.trich.split(/\s*(?:…|\.\.\.)\s*/).filter((x: string) => x.trim().length >= 8);
    for (const p of parts) if (!wiki.includes(norm(p))) loi.push(`${ten}.trich: không tìm thấy nguyên văn trong bài Wikipedia: "${p.slice(0, 80)}"`);
  };

  str(d.ngheNghiep, 'ngheNghiep', 3, 120);
  str(d.moTaNgan, 'moTaNgan', 20, 220);
  str(d.traLoiNgan, 'traLoiNgan', 150, 800);
  str(d.sinh?.noi, 'sinh.noi', 2, 80);
  kiemNhayCam(`${d.traLoiNgan} ${d.moTaNgan}`, 'traLoiNgan/moTaNgan');
  if (!Array.isArray(d.tieuSu) || d.tieuSu.length < 2 || d.tieuSu.length > 4) loi.push('tieuSu: 2–4 đoạn');
  else d.tieuSu.forEach((p: string, i: number) => (str(p, `tieuSu[${i}]`, 120, 1200), kiemNhayCam(p, `tieuSu[${i}]`)));

  // Bảng 1
  const bm = Array.isArray(d.banMenh) ? d.banMenh : [];
  bm.forEach((r: Any, i: number) => {
    const t = `banMenh[${i}]`;
    if (!CUNG.includes(r.cung)) loi.push(`${t}.cung "${r.cung}" không phải tên cung`);
    if (!KL.includes(r.ketLuan) || r.ketLuan === 'dang-dien-ra') loi.push(`${t}.ketLuan không hợp lệ`);
    str(r.laSoNoi, `${t}.laSoNoi`, 15, 300);
    str(r.doiThat, `${t}.doiThat`, 15, 400);
    kiemNhayCam(`${r.laSoNoi} ${r.doiThat}`, t);
    kiemRef(r.laSoRef, t, /^C\./);
    kiemTrich(r, t);
  });
  const dBM = dem(bm);
  if (dBM.kiemChung < 6) loi.push(`banMenh: cần ≥6 dòng đã chấm (khớp/một phần/trượt), mới có ${dBM.kiemChung}`);
  if (bm.length > 14) loi.push('banMenh: tối đa 14 dòng');

  // Bảng 2
  const dvs = Array.isArray(d.daiVan) ? d.daiVan : [];
  const cuoi = Math.min(NAM_NAY, namMat ?? NAM_NAY);
  const canCo = ls.daiVan.filter((x) => x.namTu <= cuoi).map((x) => x.thuTu);
  for (const n of canCo) if (!dvs.some((r: Any) => r.thuTu === n)) loi.push(`daiVan: thiếu đại vận ${n} (đã diễn ra)`);
  dvs.forEach((r: Any, i: number) => {
    const t = `daiVan[${i}]`;
    const dv = ls.daiVan.find((x) => x.thuTu === r.thuTu);
    if (!dv) return loi.push(`${t}.thuTu ${r.thuTu} không có`);
    if (dv.namTu > cuoi) loi.push(`${t}: đại vận ${r.thuTu} bắt đầu ${dv.namTu}, sau năm ${namMat ? 'mất' : 'nay'}`);
    if (!KL.includes(r.ketLuan)) loi.push(`${t}.ketLuan không hợp lệ`);
    if (r.ketLuan === 'dang-dien-ra' && !(dv.namDen >= NAM_NAY && !namMat)) loi.push(`${t}: "dang-dien-ra" chỉ dùng cho đại vận hiện tại của người còn sống`);
    str(r.doiThat, `${t}.doiThat`, 15, 500);
    str(r.vi, `${t}.vi`, 10, 250);
    kiemNhayCam(`${r.doiThat} ${r.vi}`, t);
    kiemRef(r.laSoRef, t, new RegExp(`^DV${r.thuTu}\\.`));
    kiemTrich(r, t);
  });
  // Đoán giờ: phần chính là bảng 12 giờ, người trẻ (sinh 1990+) mới qua 2 đại vận ⇒ ngưỡng 2 (Henry duyệt 2026-10-02).
  const nguongDV = pack.doan ? 2 : 3;
  if (dem(dvs).kiemChung < Math.min(nguongDV, canCo.length)) loi.push(`daiVan: cần ≥${nguongDV} đại vận đã chấm`);

  // Năm mốc
  if (nams.length < 2 || nams.length > 5) loi.push('namMoc: 2–5 năm');
  nams.forEach((n: Any, i: number) => {
    const t = `namMoc[${i}]`;
    if (!Number.isInteger(n.nam) || n.nam < namSinh || n.nam > cuoi) loi.push(`${t}.nam ${n.nam} ngoài đời người`);
    if (!kes[i]) loi.push(`${t}: engine không tính được năm ${n.nam}`);
    if (!KL.includes(n.ketLuan) || !CO_KL(n.ketLuan)) loi.push(`${t}.ketLuan phải là khop/mot-phan/truot`);
    str(n.suKien, `${t}.suKien`, 15, 400);
    str(n.laSoNoi, `${t}.laSoNoi`, 15, 400);
    kiemNhayCam(`${n.suKien} ${n.laSoNoi}`, t);
    kiemRef(n.laSoRef, t, new RegExp(`^N${n.nam}\\.`));
    kiemTrich(n, t);
  });

  // Giờ sát ranh giới
  if (d.gioRanhGioi) {
    const g = d.gioRanhGioi;
    if (!pack.gioCanh) loi.push('gioRanhGioi: gói không có giờ cạnh bên — bỏ trường này');
    else if (g.gioThay !== pack.gioCanh.gio) loi.push(`gioRanhGioi.gioThay phải là ${pack.gioCanh.gio}`);
    str(g.lyDo, 'gioRanhGioi.lyDo', 30, 500);
    str(g.ketLuan, 'gioRanhGioi.ketLuan', 30, 500);
    if (!Array.isArray(g.soDaiVan) || g.soDaiVan.length < 2 || g.soDaiVan.some((n: number) => !canCo.includes(n)))
      loi.push('gioRanhGioi.soDaiVan: 2–4 đại vận đã diễn ra');
  }

  if (!Array.isArray(d.ketLuanBienTap) || d.ketLuanBienTap.length < 2 || d.ketLuanBienTap.length > 4) loi.push('ketLuanBienTap: 2–4 đoạn');
  else d.ketLuanBienTap.forEach((p: string, i: number) => (str(p, `ketLuanBienTap[${i}]`, 80, 900), kiemNhayCam(p, `ketLuanBienTap[${i}]`)));
  if (!Array.isArray(d.faq) || d.faq.length < 1 || d.faq.length > 4) loi.push('faq: 1–4 câu');
  else d.faq.forEach((f: Any, i: number) => (str(f.q, `faq[${i}].q`, 10, 200), str(f.a, `faq[${i}].a`, 40, 700), kiemNhayCam(`${f.q} ${f.a}`, `faq[${i}]`)));

  // ── Đoán giờ sinh (gói `doan`): bảng chấm 12 giờ ở work/nghiem-chung/doan/<slug>.json ──
  let gioDoan: Any;
  if (pack.doan) {
    const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
    const gp = join(WORK, 'doan', `${slug}.json`);
    const g = existsSync(gp) ? JSON.parse(readFileSync(gp, 'utf8')) : null;
    if (!g) loi.push(`thiếu ${gp} (bước 1 đoán giờ)`);
    else if (pack.sinh.gioEngine < 0) loi.push('chưa chạy doan-gio.ts chot');
    else {
      const bang = Array.isArray(g.bang) ? g.bang : [];
      if (bang.length !== 12 || bang.some((b: Any, i: number) => b.gio !== CHI[i])) loi.push('doan.bang: đủ 12 giờ theo thứ tự Tý→Hợi');
      bang.forEach((b: Any, i: number) => {
        if (!Number.isInteger(b.diem) || b.diem < 0 || b.diem > 100) loi.push(`doan.bang[${i}].diem: số nguyên 0–100`);
        str(b.lyDo, `doan.bang[${i}].lyDo`, 30, 300);
        kiemNhayCam(b.lyDo || '', `doan.bang[${i}]`);
      });
      const max = Math.max(...bang.map((b: Any) => b.diem));
      const chon = bang.find((b: Any) => b.gio === g.chon);
      if (!chon || chon.diem !== max) loi.push('doan.chon phải là giờ có điểm cao nhất');
      if (`giờ ${g.chon} (suy đoán)` !== pack.sinh.gio) loi.push('doan.chon khác giờ đã chốt — chạy lại doan-gio.ts chot');
      if (!['cao', 'vua', 'thap'].includes(g.doTinCay)) loi.push('doan.doTinCay: cao|vua|thap');
      str(g.giaiThich, 'doan.giaiThich', 100, 700);
      kiemNhayCam(g.giaiThich || '', 'doan.giaiThich');
      gioDoan = {
        chon: g.chon,
        doTinCay: g.doTinCay,
        giaiThich: g.giaiThich,
        bang: bang.map((b: Any, i: number) => {
          const u = pack.ung[i]?.laSo;
          return { gio: b.gio, diem: b.diem, lyDo: b.lyDo, menh: u ? `Mệnh ${u.menh.diaChi}: ${u.menh.sao}` : '' };
        }),
      };
    }
  }

  if (loi.length) return loi;

  // ── Ghi bản chính: định danh lấy từ GÓI ─────────────────
  const nguon = [
    { ten: `Wikipedia (${pack.wiki.lang}) — ${pack.wiki.title}`, url: pack.wiki.url },
    pack.doan
      ? { ten: 'Wikidata — ngày sinh (giờ sinh không công bố; giờ trong bài là suy đoán)', url: `https://www.wikidata.org/wiki/${pack.qid}` }
      : { ten: `Astro-Databank — dữ liệu giờ sinh (Rodden ${pack.sinh.rodden})`, url: `https://www.astro.com/astro-databank/` },
  ];
  const gan0 = (r: Any) => ({ ...r, nguon: CO_KL(r.ketLuan) ? [0] : undefined });
  const hoSo = {
    slug,
    ten: pack.ten,
    qid: pack.qid,
    ngheNghiep: d.ngheNghiep,
    moTaNgan: d.moTaNgan.replace(/\.$/, ''),
    gioiTinh: pack.gioiTinh,
    sinh: { ngay: pack.sinh.ngay, gio: pack.sinh.gio, gioEngine: pack.sinh.gioEngine, noi: d.sinh.noi, rodden: pack.sinh.rodden },
    anhCommons: pack.anhCommons || undefined,
    sameAs: pack.sameAs,
    traLoiNgan: d.traLoiNgan,
    tieuSu: d.tieuSu,
    banMenh: bm.map(gan0),
    daiVan: dvs.map(gan0).sort((a: Any, b: Any) => a.thuTu - b.thuTu),
    namMoc: nams.map(gan0).sort((a: Any, b: Any) => a.nam - b.nam),
    gioRanhGioi: d.gioRanhGioi
      ? { ...d.gioRanhGioi, tenGioThay: ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'][Math.floor(((pack.gioCanh.gio + 1) % 24) / 2)] }
      : undefined,
    gioDoan,
    ketLuanBienTap: d.ketLuanBienTap,
    faq: d.faq,
    nguon,
    ngayDang: NGAY,
    ngayCapNhat: NGAY,
    namMat,
    wiki: { lang: pack.wiki.lang, title: pack.wiki.title, url: pack.wiki.url },
    indexed: false,
  };
  writeFileSync(join(OUT, `${slug}.json.gz`), gzipSync(JSON.stringify(hoSo)));
  console.log(`✓ ${slug}: bản mệnh ${dem(hoSo.banMenh).tyLe}% · đại vận ${dem(hoSo.daiVan).tyLe}% · năm ${dem(hoSo.namMoc).tyLe}%`);
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
