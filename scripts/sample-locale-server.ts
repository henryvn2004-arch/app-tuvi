/**
 * Số liệu ENGINE THẬT cho văn mẫu theo ngôn ngữ của các công cụ tính ở SERVER (W32A-4/5): Chân Dung Tiền Kiếp · Chân Dung Vợ
 * Chồng · Duyên Nợ Tiền Kiếp · Dạy Con · Hướng Nghiệp Sớm · Lá Số Người Khác.
 * Cùng vai với scripts/sample-locale-data.mjs (họ Luận Giải) nhưng các công cụ này tính ở SERVER (lib/engine/*.ts) nên chạy
 * thẳng engine bằng tsx. In ra đúng prompt route thật dựng (nhân vật, chức phận, Phu Thê, loại duyên, điểm nếp/chặng…) + bảng tên/danh xưng
 * đã dịch (ns `past-life-ten`) để người viết văn mẫu đọc — KHÔNG gõ tay dữ kiện nào trong văn mẫu.
 *
 *   npx tsx scripts/sample-locale-server.ts <locale> <tk|vc|dn|dc|hn|nk>
 *     tk = Chân Dung Tiền Kiếp · vc = Chân Dung Vợ Chồng · dn = Duyên Nợ Tiền Kiếp (cần `banDoi`) · dc = Dạy Con (mối lo
 *     học hành) · hn = Hướng Nghiệp Sớm (chưa thích gì) — cả hai cần `con` · nk = Lá Số Người Khác (nhân vật chính làm sếp, nhờ việc)
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
import { computeDayCon } from '../lib/engine/day-con';
import { buildDayConPrompt } from '../lib/agent/day-con-prompt';
import { computeHuongNghiepTre } from '../lib/engine/huong-nghiep-tre';
import { buildHuongNghiepTrePrompt } from '../lib/agent/huong-nghiep-tre-prompt';
import { computeNguoiKhac } from '../lib/engine/nguoi-khac';
import { buildNguoiKhacPrompt } from '../lib/agent/nguoi-khac-prompt';
import type { Locale } from '../lib/i18n/locales';

type Persona = { ten: string; gioitinh: 'nam' | 'nu'; ngay: number; thang: number; nam: number; gioIdx: number; lich: string; banDoi?: Persona; con?: Persona };
const P = JSON.parse(readFileSync(new URL('./fixtures/sample-personas.json', import.meta.url), 'utf8'));
const [loc, tool] = process.argv.slice(2);
const p: Persona | undefined = P[loc];
if (!p || !['tk', 'vc', 'dn', 'dc', 'hn', 'nk'].includes(tool)) {
  console.error('Dùng: npx tsx scripts/sample-locale-server.ts <locale> <tk|vc|dn|dc|hn|nk>');
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
} else if (tool === 'dn') {
  const q = p.banDoi;
  if (!q) throw new Error(`sample-personas.json: ${loc} thiếu banDoi`);
  const grp = computeGroupBond([
    { ls, gender: p.gioitinh },
    { ls: laso(q), gender: q.gioitinh },
  ]);
  console.log(buildBondStoryPrompt(groupPairAsBond(grp, grp.spine), p.ten, q.ten) + khoiTenTheoNgonNgu(loc as Locale, grp.profiles));
}
 else if (tool === 'nk') {
  console.log(buildNguoiKhacPrompt(computeNguoiKhac(ls, p.gioitinh, 'sep', null, P.namXem, 'nho-viec'), p.ten));
} else {
  const c = p.con;
  if (!c) throw new Error(`sample-personas.json: ${loc} thiếu con`);
  const lsCon = laso(c);
  console.log(
    tool === 'dc'
      ? buildDayConPrompt(computeDayCon(lsCon, c.gioitinh, 'hoc-hanh', null, P.namXem), c.ten)
      : buildHuongNghiepTrePrompt(computeHuongNghiepTre(lsCon, c.gioitinh, 'chua-thich-gi', P.namXem), c.ten)
  );
}
