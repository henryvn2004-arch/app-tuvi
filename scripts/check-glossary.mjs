#!/usr/bin/env node
// scripts/check-glossary.mjs — bộ dò TẤT ĐỊNH cho chữ Hán gõ tay của bảng thuật ngữ (lib/i18n/glossary/tuvi-terms.ts).
//
// Với mỗi thuật ngữ: tra TỪNG chữ Hán sang âm Hán-Việt bằng bảng của `lib/hanviet.ts` (CAN_HAN · CHI_HAN · HAN_VIET),
// ghép lại rồi so với tên tiếng Việt (chuẩn hoá bằng `chuanHoaDauThanh()` của lib/vn-text.ts — KHÔNG bỏ dấu thanh).
//   · LỆCH   → lỗi (exit 1): chữ Hán gõ nhầm, hoặc tên Việt gõ sai.
//   · PHỤ    → chữ chưa có trong hanviet.ts thì tra bảng phụ `han-viet-check.json` (SINH từ Unihan kVietnamese, giữ MỌI âm,
//              không chọn tay). Chỉ cần MỘT âm khớp là đạt — mục nào đạt nhờ bảng phụ được ghi riêng.
//   · THIẾU  → không xác nhận được (chữ không có ở cả hai bảng, hoặc kVietnamese chỉ có âm thuần Việt 紫→tía / 帝→đấy): liệt kê RIÊNG,
//              KHÔNG coi là đạt. Bảng phụ KHÔNG đủ thẩm quyền để kết tội LỆCH (nó không phải bảng Hán-Việt) nên lệch ở bảng phụ = THIẾU.
//              Không tự thêm chữ vào hanviet.ts (bảng đó thuộc Kỳ Môn/Hoàng Lịch, thêm khoá sẽ đổi đầu ra của các tool ấy).
//   · BỎ QUA → cờ 'v' (tên Việt không phải phiên Hán-Việt: Lá Số ↔ 命盤…) và cờ 'n' (số chữ ≠ số âm tiết).
// hanviet.ts khoá bằng chữ GIẢN thể (Kỳ Môn) nên mỗi chữ tra cả bản phồn lẫn bản giản (cột zh-cn cùng vị trí).
// Chạy trên Node 20 (CI): TS → JS bằng `typescript` (devDependency), không cần strip-types.
// Có bước đột biến: tự gõ sai MỘT chữ rồi assert bộ dò đỏ.
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENERATED_TERMS as G } from '../lib/i18n/glossary/terms.generated.mjs';

const PHU = JSON.parse(
  readFileSync(join(process.cwd(), 'lib/i18n/glossary/han-viet-check.json'), 'utf8')
);

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
// kVietnamese viết ỵ/ỷ/ỹ như ị/ỉ/ĩ (kị, hỉ, sĩ) còn tên Việt viết kỵ, hỷ, sỹ: coi y ≡ i khi so với bảng phụ.
const chuanPhu = (s) => chuan(s).normalize('NFD').replace(/y/g, 'i').normalize('NFC');

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
  const r = { dat: 0, datPhu: [], lech: [], thieu: [], boQua: [], ngoaiLe: [] };
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
    // Mỗi chữ: âm từ hanviet.ts (chắc) hoặc danh sách âm từ bảng phụ (chỉ để xác nhận, không để kết tội).
    const doc = tw.map((ch, i) => {
      const hv = BANG[ch] ?? BANG[cn[i]];
      if (hv) return { nguon: 'hv', am: [hv] };
      const ph = PHU.chars[ch];
      return ph?.length ? { nguon: 'phu', am: ph } : null;
    });
    if (tw.length !== am.length) {
      r.lech.push(`${id}: ${tw.length} chữ Hán ≠ ${am.length} âm tiết`);
      continue;
    }
    // Lệch CHẮC CHẮN: chỉ từ hanviet.ts — báo ngay cả khi chữ khác trong cụm còn thiếu.
    const sai = tw
      .map((ch, i) =>
        doc[i]?.nguon === 'hv' && chuan(doc[i].am[0]) !== chuan(am[i])
          ? `${ch}→${doc[i].am[0]}≠${am[i]}`
          : null
      )
      .filter(Boolean);
    if (sai.length) {
      const nl = NGOAI_LE[id];
      if (nl && sai.join(', ') === nl.sai) r.ngoaiLe.push(`${id} (${t['zh-tw']}): ${nl.vi}`);
      else r.lech.push(`${id} (${t['zh-tw']}): ${sai.join(', ')}`);
      continue;
    }
    // Chữ chưa xác nhận: không có âm nào, hoặc bảng phụ không có âm nào khớp tên Việt (thường là âm thuần Việt).
    const chua = tw.filter(
      (_, i) =>
        !doc[i] ||
        (doc[i].nguon === 'phu' && !doc[i].am.some((x) => chuanPhu(x) === chuanPhu(am[i])))
    );
    if (chua.length) {
      chua.forEach((c) => chuThieu.add(c));
      r.thieu.push(id);
    } else if (doc.some((d) => d.nguon === 'phu')) r.datPhu.push(id);
    else r.dat++;
  }
  r.chuThieu = [...chuThieu];
  return r;
}

const r = soat(G);
console.log(
  `check:glossary — ${G.length} mục: ĐẠT ${r.dat + r.datPhu.length} (hanviet.ts ${r.dat} · nhờ bảng phụ Unihan ${r.datPhu.length}) · LỆCH ${r.lech.length} · THIẾU ${r.thieu.length} (${r.chuThieu.length} chữ) · ngoại lệ ${r.ngoaiLe.length} · bỏ qua ${r.boQua.length}`
);
if (r.ngoaiLe.length) console.log('  ngoại lệ có chủ đích:\n    ' + r.ngoaiLe.join('\n    '));
if (r.boQua.length) console.log(`  bỏ qua (cờ v/n): ${r.boQua.join(' · ')}`);
if (r.datPhu.length)
  console.log(`  đạt nhờ bảng phụ Unihan (${r.datPhu.length}): ${r.datPhu.join(' · ')}`);
if (r.thieu.length) {
  console.log(`  THIẾU — cần xem tay (${r.thieu.length} mục):\n    ${r.thieu.join(' · ')}`);
  console.log(
    `  chữ chưa xác nhận (kVietnamese): ${r.chuThieu.map((c) => `${c}[${(PHU.chars[c] || []).join('/') || '—'}]`).join(' ')}`
  );
}

// ── đột biến 1: gõ sai một chữ có trong hanviet.ts ⇒ phải LỆCH ──
const ung = G.find(
  (t) => !t.f?.includes('v') && !t.f?.includes('n') && [...t['zh-tw']].some((c) => BANG[c])
);
const i = [...ung['zh-tw']].findIndex((c) => BANG[c]);
const khac = Object.keys(BANG).find((c) => chuan(BANG[c]) !== chuan(BANG[[...ung['zh-tw']][i]]));
const arr = [...ung['zh-tw']];
arr[i] = khac;
const mut = soat([{ ...ung, 'zh-tw': arr.join(''), 'zh-cn': arr.join('') }]);
if (!mut.lech.length) {
  console.error(`✗ ĐỘT BIẾN 1: sửa sai ${ung.vi} mà bộ dò không báo`);
  process.exit(1);
}
// ── đột biến 2: một mục ĐẠT NHỜ BẢNG PHỤ, thay một chữ phụ bằng chữ phụ khác âm ⇒ KHÔNG còn được tính đạt ──
const tPhu = G.find((t) => r.datPhu.includes(`${t.k}|${t.vi}`));
const arrP = [...tPhu['zh-tw']];
const j = arrP.findIndex((c) => PHU.chars[c]?.length);
const syl = tPhu.vi.split(/\s+/)[tPhu.k === 'cung' ? j : j];
const thay = Object.entries(PHU.chars).find(
  ([c, v]) => c !== arrP[j] && v.length && !v.some((x) => chuanPhu(x) === chuanPhu(syl))
)[0];
arrP[j] = thay;
const mutP = soat([{ ...tPhu, 'zh-tw': arrP.join(''), 'zh-cn': arrP.join('') }]);
if (mutP.dat + mutP.datPhu.length !== 0) {
  console.error(`✗ ĐỘT BIẾN 2: đổi chữ phụ trong ${tPhu.vi} mà bộ dò vẫn tính đạt`);
  process.exit(1);
}

if (r.lech.length) {
  console.error('✗ LỆCH:\n  - ' + r.lech.join('\n  - '));
  process.exit(1);
}
