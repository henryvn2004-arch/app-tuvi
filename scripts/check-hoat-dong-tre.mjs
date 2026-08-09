#!/usr/bin/env node
/**
 * check-hoat-dong-tre — canh 27 khối hoạt động của `huong-nghiep-tre`.
 *
 * VÌ SAO CÓ BỘ DÒ NÀY:
 * 27 khối hoạt động (9 thiên hướng × 3 lứa tuổi) là phần người TRẢ TIỀN đọc kỹ
 * nhất, và là phần DUY NHẤT của tool không có gì kiểm được bằng số — mọi bất
 * biến khác (điểm giảm dần, đủ ba hướng, rail phẳng) đều nói về CẤU TRÚC, không
 * nói gì về CHỮ. Chúng cũng là phần chắc chắn còn bị sửa: chính CLAUDE.md ghi
 * "27 khối hoạt động chưa ai review".
 *
 * Ba luật dưới đây đều rút ra từ lỗi ĐÃ BẮT ĐƯỢC THẬT khi soi tay bảng này một
 * lượt, không phải lo hão:
 *
 *   1) Lứa NHỎ (3–7) không được nêu TÊN NGHỀ.
 *      Đã bắt: `giao-thiep/nho` từng ghi "Trò chơi đổi vai: bán hàng, bác sĩ,
 *      cô giáo". Bản thân trò chơi đóng vai là hoạt động ĐÚNG cho lứa này —
 *      cái sai là gọi tên nghề. Cờ `bayNghe` chỉ làm rỗng mảng `ngheViDu`, nó
 *      KHÔNG với tới chữ trong `hoatDong`, nên lỗ này lọt qua mọi bài kiểm cũ
 *      (chúng chỉ dò các phần tử của chính `ngheViDu`). Trên một trang tên là
 *      "hướng nghiệp cho con", một danh từ nghề đứng cạnh thiên hướng đọc thành
 *      lời gợi ý chốt nghề — đúng thứ luật trẻ em sinh ra để chặn.
 *
 *   2) Lứa NHỎ không được mang ngôn ngữ THI THỐ / THÀNH TÍCH.
 *      Đo bảng hiện tại: 9 hoạt động có chữ thi/giải/cấp bậc, và cả 9 đều nằm ở
 *      lứa 8–12 và 13–18 — KHÔNG cái nào ở 3–7. Đó là hình dạng đúng (thi đấu
 *      có chỗ của nó với trẻ lớn), nên luật chỉ khoá đúng lứa nhỏ thay vì cấm
 *      tiệt. Chốt lại để lượt sửa sau không lặng lẽ kéo nó xuống.
 *
 *   3) Hai hướng KHÁC NHAU không được có hoạt động gần trùng nhau.
 *      Đã bắt: `dan-dat/lon` và `giao-thiep/giua` cùng ghi "Bán một thứ có
 *      thật…" (Jaccard 0,55). Đây là bẫy "hai hình nuốt nhau" đã phải gỡ ở TẦNG
 *      CHẤM (cosine 0,86) LỘ LẠI Ở TẦNG CHỮ — sửa trọng số không cứu được chỗ
 *      này. Trùng nội dung thì hai hướng mất lý do tồn tại riêng.
 *
 * Bộ dò đọc THẲNG mã nguồn TS (file đã được prettier chuẩn hoá nên bố cục ổn
 * định). Không dựng engine — guard phải chạy được trong lượt lint của CI.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'lib/engine/huong-nghiep-tre.ts');

const raw = readFileSync(SRC, 'utf8');

/* --- bóc 27 khối: hướng × lứa → danh sách chuỗi ------------------------- */
const LOPS = ['nho', 'giua', 'lon'];
const TEN_LOP = { nho: '3–7', giua: '8–12', lon: '13–18' };
const khoi = []; // {huong, lop, items:[{text, line}]}

const lines = raw.split('\n');
let huongHienTai = null;
let trongHoatDong = false;
let lopHienTai = null;

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const mHuong = l.match(/^ {2}'([a-z-]+)': \{$/);
  if (mHuong) {
    huongHienTai = mHuong[1];
    trongHoatDong = false;
    continue;
  }
  if (/^ {4}hoatDong: \{$/.test(l)) {
    trongHoatDong = true;
    continue;
  }
  if (trongHoatDong && /^ {4}\},$/.test(l)) {
    trongHoatDong = false;
    lopHienTai = null;
    continue;
  }
  if (!trongHoatDong) continue;

  const mLop = l.match(/^ {6}(nho|giua|lon): \[$/);
  if (mLop) {
    lopHienTai = mLop[1];
    khoi.push({ huong: huongHienTai, lop: lopHienTai, items: [] });
    continue;
  }
  const mItem = l.match(/^ {8}'(.*)',?$/);
  if (mItem && lopHienTai) {
    khoi.at(-1).items.push({ text: mItem[1].replace(/\\'/g, "'"), line: i + 1 });
  }
}

const problems = [];

if (khoi.length !== 27) {
  problems.push(
    `bóc ra ${khoi.length} khối, chờ 27 (9 hướng × 3 lứa). Bố cục file đổi ⇒ bộ dò không còn đọc đúng, PHẢI sửa bộ dò chứ đừng bỏ qua.`
  );
}
for (const k of khoi) {
  // Trần DƯỚI là 4, không phải 3: cả 27 khối hiện đúng 4 ô, và trang dựng theo
  // đó. Ngưỡng lỏng hơn thì một khối lặng lẽ tụt ô vẫn lọt — red-team đã bắt
  // đúng chỗ này (bỏ một ô của `dan-dat/nho` mà bộ dò vẫn xanh). Thêm ô thì
  // được, bớt thì không.
  if (k.items.length < 4) {
    problems.push(
      `${k.huong}/${k.lop}: chỉ ${k.items.length} hoạt động, chờ ít nhất 4 — khối bị bớt ô.`
    );
  }
}
for (const lop of LOPS) {
  const n = khoi.filter((k) => k.lop === lop).length;
  if (n !== 9) problems.push(`lứa ${lop}: ${n} khối, chờ 9.`);
}

/* --- luật 1: lứa nhỏ không nêu tên nghề --------------------------------- */
const NGHE = [
  'kỹ sư',
  'bác sĩ',
  'luật sư',
  'kiến trúc sư',
  'giáo viên',
  'cô giáo',
  'thầy giáo',
  'lập trình viên',
  'kế toán',
  'y tá',
  'điều dưỡng',
  'dược sĩ',
  'nhà báo',
  'phi công',
  'đầu bếp',
  'nhà thiết kế',
  'doanh nhân',
  'ca sĩ',
  'diễn viên',
  'vận động viên',
  'hoạ sĩ',
  'nhạc sĩ',
  'bán hàng',
];
for (const k of khoi.filter((x) => x.lop === 'nho')) {
  for (const it of k.items) {
    const low = it.text.toLowerCase();
    const hit = NGHE.filter((n) => low.includes(n));
    if (hit.length) {
      problems.push(
        `${SRC.slice(ROOT.length + 1)}:${it.line}  [${k.huong}/3–7] nêu tên nghề "${hit.join('", "')}" — lứa 3–7 CẤM tên nghề.\n      → ${it.text}`
      );
    }
  }
}

/* --- luật 2: lứa nhỏ không mang ngôn ngữ thi thố ------------------------ */
const APLUC = [
  'cuộc thi',
  'thi đấu',
  'thi lấy',
  'kỳ thi',
  'ôn thi',
  'luyện thi',
  'đoạt giải',
  'giải nhất',
  'huy chương',
  'xếp hạng',
  'đứng đầu',
  'hơn bạn',
  'thành tích',
  'tuyển chọn',
  'đội tuyển',
];
for (const k of khoi.filter((x) => x.lop === 'nho')) {
  for (const it of k.items) {
    const low = it.text.toLowerCase();
    const hit = APLUC.filter((n) => low.includes(n));
    if (hit.length) {
      problems.push(
        `${SRC.slice(ROOT.length + 1)}:${it.line}  [${k.huong}/3–7] ngôn ngữ thi thố "${hit.join('", "')}" — lứa 3–7 không đặt trẻ vào chỗ tranh hơn thua.\n      → ${it.text}`
      );
    }
  }
}

/* --- luật 3: hai hướng khác nhau không có hoạt động gần trùng ----------- */
const NGUONG = 0.5;
const tok = (s) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
const jaccard = (a, b) => {
  const A = tok(a);
  const B = tok(b);
  let chung = 0;
  for (const x of A) if (B.has(x)) chung++;
  return chung / (A.size + B.size - chung);
};

const phang = [];
for (const k of khoi) for (const it of k.items) phang.push({ ...it, huong: k.huong, lop: k.lop });

for (let a = 0; a < phang.length; a++) {
  for (let b = a + 1; b < phang.length; b++) {
    if (phang[a].huong === phang[b].huong) continue;
    const s = jaccard(phang[a].text, phang[b].text);
    if (s >= NGUONG) {
      problems.push(
        `${SRC.slice(ROOT.length + 1)}:${phang[a].line}  hoạt động gần TRÙNG giữa hai hướng (Jaccard ${s.toFixed(2)}):\n      [${phang[a].huong}/${TEN_LOP[phang[a].lop]}] ${phang[a].text}\n      [${phang[b].huong}/${TEN_LOP[phang[b].lop]}] ${phang[b].text}`
      );
    }
  }
}

if (problems.length) {
  console.error('❌ check-hoat-dong-tre: bảng hoạt động vi phạm luật trẻ em\n');
  for (const p of problems) console.error('   ' + p);
  console.error(`\n   ${problems.length} chỗ. Đọc khối chú thích đầu bộ dò trước khi nới luật —`);
  console.error('   cả ba luật đều rút từ lỗi đã bắt được thật trên chính bảng này.');
  process.exit(1);
}

console.log(
  `✅ check-hoat-dong-tre: ${khoi.length} khối · ${phang.length} hoạt động — lứa 3–7 sạch tên nghề và ngôn ngữ thi thố, 0 cặp trùng giữa các hướng.`
);
