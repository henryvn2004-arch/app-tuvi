#!/usr/bin/env node
// scripts/check-glossary.mjs — bộ dò TẤT ĐỊNH cho chữ Hán gõ tay của bảng thuật ngữ (lib/i18n/glossary/tuvi-terms.ts).
//
// Với mỗi thuật ngữ: tra TỪNG chữ Hán sang âm Hán-Việt bằng bảng của `lib/hanviet.ts` (CAN_HAN · CHI_HAN · HAN_VIET),
// ghép lại rồi so với tên tiếng Việt (chuẩn hoá bằng `chuanHoaDauThanh()` của lib/vn-text.ts — KHÔNG bỏ dấu thanh).
//   · LỆCH   → lỗi (exit 1): chữ Hán gõ nhầm, hoặc tên Việt gõ sai.
//   · THIẾU  → chữ chưa có trong hanviet.ts: liệt kê RIÊNG, KHÔNG coi là đạt (không thể xác nhận). Không tự thêm chữ vào
//              hanviet.ts (bảng đó thuộc Kỳ Môn/Hoàng Lịch, thêm khoá sẽ đổi đầu ra của các tool ấy).
//   · BỎ QUA → cờ 'v' (tên Việt không phải phiên Hán-Việt: Lá Số ↔ 命盤…) và cờ 'n' (số chữ ≠ số âm tiết).
// hanviet.ts khoá bằng chữ GIẢN thể (Kỳ Môn) nên mỗi chữ tra cả bản phồn lẫn bản giản (cột zh-cn cùng vị trí).
// Chạy trên Node 20 (CI): TS → JS bằng `typescript` (devDependency), không cần strip-types.
// Có bước đột biến: tự gõ sai MỘT chữ rồi assert bộ dò đỏ.
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENERATED_TERMS as G } from '../lib/i18n/glossary/terms.generated.mjs';

const ROOT = process.cwd();
const nap = (p) =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(
        ts.transpileModule(readFileSync(join(ROOT, p), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
        }).outputText
      ).toString('base64')
  );
const { CAN_HAN, CHI_HAN, HAN_VIET } = await nap('lib/hanviet.ts');
const { chuanHoaDauThanh } = await nap('lib/vn-text.ts');
const BANG = { ...HAN_VIET, ...CAN_HAN, ...CHI_HAN };
const chuan = (s) => chuanHoaDauThanh(s.toLowerCase());

// NGOẠI LỆ CÓ CHỦ ĐÍCH — chỉ miễn đúng cặp lệch ghi ở đây (lệch KHÁC trong cùng mục vẫn đỏ):
//   · chữ đa âm Hán-Việt mà hanviet.ts chỉ ghi một âm;
//   · tên Việt cổ ≠ tên Hán đang dùng ở zh/ja/ko (Tử Tức = 子息, nhưng 子女宮 là chữ chuẩn).
const NGOAI_LE = {
  'chinh|Thiên Tướng': {
    sai: '相→Tương≠Tướng',
    vi: '相 đa âm: Tương / Tướng (quan tướng) — 天相 đọc Thiên Tướng',
  },
  'sao|Cô Thần': {
    sai: '辰→Thìn≠Thần',
    vi: '辰 đa âm: Thìn / Thần (tinh thần) — 孤辰 đọc Cô Thần',
  },
  'cung|Tử Tức': {
    sai: '子→Tý≠Tử, 女→Nữ≠Tức',
    vi: 'tên Việt cổ 子息 (Tử Tức); chữ chuẩn ở zh/ja/ko là 子女宮',
  },
};

function soat(terms) {
  const r = { dat: 0, lech: [], thieu: [], boQua: [], ngoaiLe: [] };
  const chuThieu = new Set();
  for (const t of terms) {
    const id = `${t.k}|${t.vi}`;
    if (t.f?.includes('v') || t.f?.includes('n')) {
      r.boQua.push(id);
      continue;
    }
    const tw = [...t['zh-tw']];
    const cn = [...t['zh-cn']];
    const am = t.vi.split(/\s+/);
    if (t.k === 'cung') (tw.pop(), cn.pop()); // 宮 = "cung", tên Việt không kèm
    const doc = tw.map((ch, i) => BANG[ch] ?? BANG[cn[i]] ?? null);
    const thieu = tw.filter((_, i) => doc[i] === null);
    if (tw.length !== am.length) {
      r.lech.push(`${id}: ${tw.length} chữ Hán ≠ ${am.length} âm tiết`);
      continue;
    }
    // Lệch ở những chữ ĐÃ tra được — báo ngay cả khi chữ khác trong cụm còn thiếu.
    const sai = tw
      .map((ch, i) =>
        doc[i] !== null && chuan(doc[i]) !== chuan(am[i]) ? `${ch}→${doc[i]}≠${am[i]}` : null
      )
      .filter(Boolean);
    if (sai.length) {
      const nl = NGOAI_LE[id];
      if (nl && sai.join(', ') === nl.sai) r.ngoaiLe.push(`${id} (${t['zh-tw']}): ${nl.vi}`);
      else r.lech.push(`${id} (${t['zh-tw']}): ${sai.join(', ')}`);
    } else if (thieu.length) {
      thieu.forEach((c) => chuThieu.add(c));
      r.thieu.push(id);
    } else r.dat++;
  }
  r.chuThieu = [...chuThieu];
  return r;
}

const r = soat(G);
console.log(
  `check:glossary — ${G.length} mục: ĐẠT ${r.dat} · LỆCH ${r.lech.length} · THIẾU chữ ${r.thieu.length} (${r.chuThieu.length} chữ chưa có trong hanviet.ts) · ngoại lệ ${r.ngoaiLe.length} · bỏ qua ${r.boQua.length}`
);
if (r.ngoaiLe.length) console.log('  ngoại lệ có chủ đích:\n    ' + r.ngoaiLe.join('\n    '));
if (r.boQua.length) console.log(`  bỏ qua (cờ v/n): ${r.boQua.join(' · ')}`);
if (r.chuThieu.length) console.log(`  ⚠ chữ chưa xác nhận được: ${r.chuThieu.join('')}`);

// ── đột biến: gõ sai một chữ ĐÃ tra được phải đỏ ──
const ung = G.find(
  (t) => !t.f?.includes('v') && !t.f?.includes('n') && [...t['zh-tw']].some((c) => BANG[c])
);
const i = [...ung['zh-tw']].findIndex((c) => BANG[c]);
const khac = Object.keys(BANG).find((c) => chuan(BANG[c]) !== chuan(BANG[[...ung['zh-tw']][i]]));
const arr = [...ung['zh-tw']];
arr[i] = khac;
const mut = soat([{ ...ung, 'zh-tw': arr.join(''), 'zh-cn': arr.join('') }]);
if (!mut.lech.length) {
  console.error(`✗ ĐỘT BIẾN: sửa sai ${ung.vi} mà bộ dò không báo`);
  process.exit(1);
}

if (r.lech.length) {
  console.error('✗ LỆCH:\n  - ' + r.lech.join('\n  - '));
  process.exit(1);
}
