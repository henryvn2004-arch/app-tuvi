/**
 * Số liệu ENGINE THẬT cho văn mẫu theo ngôn ngữ của Chân Dung Tiền Kiếp · Chân Dung Vợ Chồng · Duyên Nợ Tiền Kiếp (W32A-4).
 * Cùng vai với scripts/sample-locale-data.mjs (họ Luận Giải) nhưng các công cụ này tính ở SERVER (lib/engine/*.ts) nên chạy
 * thẳng engine bằng tsx. In ra đúng prompt route thật dựng (nhân vật, chức phận, Phu Thê, loại duyên…) + bảng tên/danh xưng
 * đã dịch (ns `past-life-ten`) để người viết văn mẫu đọc — KHÔNG gõ tay dữ kiện nào trong văn mẫu.
 *
 *   npx tsx scripts/sample-locale-portrait.ts <locale> <tk|vc|dn>
 *     tk = Chân Dung Tiền Kiếp · vc = Chân Dung Vợ Chồng · dn = Duyên Nợ Tiền Kiếp (cần `banDoi` trong sample-personas.json)
 */
import { readFileSync } from 'node:fs';
import { computeLaso } from '../lib/engine/laso';
import { computePastLife } from '../lib/engine/past-life';
import { khoiTenTheoNgonNgu } from '../lib/engine/past-life-ten';
import { buildPastLifeStoryPrompt } from '../lib/agent/past-life-story';
import { computeSpouseMorphology, getPhuTheReadout } from '../lib/engine/portrait';
import { buildChanDungVoChongAnalysisPrompt } from '../lib/agent/chan-dung-vo-chong-prompt';
import { computeGroupBond, groupPairAsBond } from '../lib/engine/past-life-bond';
import { buildBondStoryPrompt } from '../lib/agent/past-life-bond-story';
import type { Locale } from '../lib/i18n/locales';

type Persona = { ten: string; gioitinh: 'nam' | 'nu'; ngay: number; thang: number; nam: number; gioIdx: number; lich: string; banDoi?: Persona };
const P = JSON.parse(readFileSync(new URL('./fixtures/sample-personas.json', import.meta.url), 'utf8'));
const [loc, tool] = process.argv.slice(2);
const p: Persona | undefined = P[loc];
if (!p || !['tk', 'vc', 'dn'].includes(tool)) {
  console.error('Dùng: npx tsx scripts/sample-locale-portrait.ts <locale> <tk|vc|dn>');
  process.exit(1);
}
const laso = (x: Persona) => {
  const r = computeLaso(
    { day: x.ngay, month: x.thang, year: x.nam, hourBranch: x.gioIdx, gender: x.gioitinh, isLunar: false, lich: x.lich } as never,
    P.namXem
  );
  if (!r.ok || !r.ls) throw new Error(`computeLaso lỗi (${x.ten}): ${r.error || ''}`);
  return r.ls;
};
const ls = laso(p);
if (tool === 'tk') {
  const pr = computePastLife(ls, p.gioitinh);
  console.log(buildPastLifeStoryPrompt(pr) + khoiTenTheoNgonNgu(loc as Locale, [pr]));
} else if (tool === 'vc') {
  console.log(buildChanDungVoChongAnalysisPrompt(computeSpouseMorphology(ls, p.gioitinh), getPhuTheReadout(ls), '', p.gioitinh));
} else {
  const q = p.banDoi;
  if (!q) throw new Error(`sample-personas.json: ${loc} thiếu banDoi`);
  const grp = computeGroupBond([
    { ls, gender: p.gioitinh },
    { ls: laso(q), gender: q.gioitinh },
  ]);
  console.log(buildBondStoryPrompt(groupPairAsBond(grp, grp.spine), p.ten, q.ten) + khoiTenTheoNgonNgu(loc as Locale, grp.profiles));
}
