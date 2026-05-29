// scripts/tuvi-compat/rules.mjs
// Rules tương hợp/tương khắc theo Tam Mệnh Thông Hội + Hiệp Kỷ Biện Phương Thư
import { CAN, CHI } from './can-chi.mjs';

// ── Ngũ Hành ───────────────────────────────────────────────────────────────────
// Tương sinh: Mộc→Hỏa→Thổ→Kim→Thủy→Mộc
const SINH = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
// Tương khắc: Kim→Mộc→Thổ→Thủy→Hỏa→Kim
const KHAC = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' };

export function nguHanhRelation(hanhA, hanhB) {
  if (hanhA === hanhB) return 'tuong-dong'; // tương đồng
  if (SINH[hanhA] === hanhB) return 'a-sinh-b';
  if (SINH[hanhB] === hanhA) return 'b-sinh-a';
  if (KHAC[hanhA] === hanhB) return 'a-khac-b';
  if (KHAC[hanhB] === hanhA) return 'b-khac-a';
  return 'trung-tinh';
}

// ── Thiên Can hợp/khắc ──────────────────────────────────────────────────────────
// 5 cặp can hợp (hóa thành 1 hành mới)
const CAN_HOP = {
  'giap-ky': 'Thổ',
  'ky-giap': 'Thổ',
  'at-canh': 'Kim',
  'canh-at': 'Kim',
  'binh-tan': 'Thủy',
  'tan-binh': 'Thủy',
  'dinh-nham': 'Mộc',
  'nham-dinh': 'Mộc',
  'mau-quy': 'Hỏa',
  'quy-mau': 'Hỏa',
};

export function canRelation(canA, canB) {
  if (canA === canB) return { type: 'tuong-dong', desc: 'cùng thiên can' };
  const hop = CAN_HOP[`${canA}-${canB}`];
  if (hop) return { type: 'hop', hoaHanh: hop, desc: `hợp hóa ${hop}` };
  // Khắc: dựa vào ngũ hành can
  const hA = CAN[canA].hanh,
    hB = CAN[canB].hanh;
  const rel = nguHanhRelation(hA, hB);
  if (rel === 'a-khac-b' || rel === 'b-khac-a')
    return { type: 'khac', desc: 'ngũ hành can tương khắc' };
  if (rel === 'a-sinh-b' || rel === 'b-sinh-a')
    return { type: 'sinh', desc: 'ngũ hành can tương sinh' };
  if (rel === 'tuong-dong') return { type: 'tuong-dong', desc: 'cùng hành' };
  return { type: 'binh-hoa', desc: 'không xung không hợp' };
}

// ── Địa Chi: Tam Hợp / Lục Hợp / Tứ Hành Xung / Lục Hại / Tam Hình ──────────────
// 4 nhóm tam hợp (mỗi nhóm 3 chi, hóa thành 1 cục hành)
const TAM_HOP_GROUPS = [
  { chis: ['than', 'ty', 'thin'], hanh: 'Thủy' },
  { chis: ['ti', 'dau', 'suu'], hanh: 'Kim' },
  { chis: ['dan', 'ngo', 'tuat'], hanh: 'Hỏa' },
  { chis: ['hoi', 'mao', 'mui'], hanh: 'Mộc' },
];
// Map chi → group
const CHI_TO_TAMHOP = {};
for (const g of TAM_HOP_GROUPS) {
  for (const ch of g.chis) CHI_TO_TAMHOP[ch] = g;
}

// 6 cặp lục hợp
const LUC_HOP = {
  'ty-suu': 'Thổ',
  'suu-ty': 'Thổ',
  'dan-hoi': 'Mộc',
  'hoi-dan': 'Mộc',
  'mao-tuat': 'Hỏa',
  'tuat-mao': 'Hỏa',
  'thin-dau': 'Kim',
  'dau-thin': 'Kim',
  'ti-than': 'Thủy',
  'than-ti': 'Thủy',
  'ngo-mui': 'Thái Dương Thái Âm',
  'mui-ngo': 'Thái Dương Thái Âm',
};

// 6 cặp tứ hành xung (lục xung, đối nhau trên bàn la kinh)
const TU_XUNG = new Set([
  'ty-ngo',
  'ngo-ty',
  'suu-mui',
  'mui-suu',
  'dan-than',
  'than-dan',
  'mao-dau',
  'dau-mao',
  'thin-tuat',
  'tuat-thin',
  'ti-hoi',
  'hoi-ti',
]);

// 6 cặp lục hại
const LUC_HAI = new Set([
  'ty-mui',
  'mui-ty',
  'suu-ngo',
  'ngo-suu',
  'dan-ti',
  'ti-dan',
  'mao-thin',
  'thin-mao',
  'than-hoi',
  'hoi-than',
  'dau-tuat',
  'tuat-dau',
]);

// Tự hình (4 chi tự hình mình): Thìn-Thìn, Ngọ-Ngọ, Dậu-Dậu, Hợi-Hợi
const TU_HINH = new Set(['thin', 'ngo', 'dau', 'hoi']);

// Tam hình (3 nhóm)
const TAM_HINH_GROUPS = [
  new Set(['dan', 'ti', 'than']), // vô ân chi hình
  new Set(['suu', 'tuat', 'mui']), // hữu ân chi hình
  new Set(['ty', 'mao']), // tương hình
];

export function chiRelation(chiA, chiB) {
  if (chiA === chiB) {
    if (TU_HINH.has(chiA)) return { type: 'tu-hinh', desc: 'cùng chi và rơi vào tự hình' };
    return { type: 'tuong-dong', desc: 'cùng địa chi' };
  }
  // Tam hợp: cùng group
  const gA = CHI_TO_TAMHOP[chiA],
    gB = CHI_TO_TAMHOP[chiB];
  if (gA && gA === gB)
    return {
      type: 'tam-hop',
      cucHanh: gA.hanh,
      desc: `cùng tam hợp ${gA.chis.map((c) => CHI[c].name).join('-')}, hóa ${gA.hanh}`,
    };
  // Lục hợp
  const luc = LUC_HOP[`${chiA}-${chiB}`];
  if (luc) return { type: 'luc-hop', hoaHanh: luc, desc: `lục hợp hóa ${luc}` };
  // Tứ xung
  if (TU_XUNG.has(`${chiA}-${chiB}`)) return { type: 'tu-xung', desc: 'rơi vào tứ hành xung' };
  // Lục hại
  if (LUC_HAI.has(`${chiA}-${chiB}`)) return { type: 'luc-hai', desc: 'rơi vào lục hại' };
  // Tam hình
  for (const g of TAM_HINH_GROUPS) {
    if (g.has(chiA) && g.has(chiB)) return { type: 'tam-hinh', desc: 'rơi vào tam hình' };
  }
  // Còn lại: dựa vào ngũ hành chi
  const hA = CHI[chiA].hanh,
    hB = CHI[chiB].hanh;
  const rel = nguHanhRelation(hA, hB);
  if (rel === 'a-sinh-b' || rel === 'b-sinh-a')
    return { type: 'chi-sinh', desc: 'ngũ hành địa chi tương sinh' };
  if (rel === 'a-khac-b' || rel === 'b-khac-a')
    return { type: 'chi-khac', desc: 'ngũ hành địa chi tương khắc' };
  if (rel === 'tuong-dong') return { type: 'chi-dong', desc: 'cùng hành địa chi' };
  return { type: 'binh-hoa', desc: 'không xung không hợp' };
}

// ── Nạp âm relation ────────────────────────────────────────────────────────────
export function napAmRelation(hanhA, hanhB) {
  const rel = nguHanhRelation(hanhA, hanhB);
  if (rel === 'tuong-dong') return { type: 'tuong-dong', desc: 'cùng nạp âm' };
  if (rel === 'a-sinh-b') return { type: 'a-sinh-b', desc: `${hanhA} sinh ${hanhB}` };
  if (rel === 'b-sinh-a') return { type: 'b-sinh-a', desc: `${hanhB} sinh ${hanhA}` };
  if (rel === 'a-khac-b') return { type: 'a-khac-b', desc: `${hanhA} khắc ${hanhB}` };
  if (rel === 'b-khac-a') return { type: 'b-khac-a', desc: `${hanhB} khắc ${hanhA}` };
  return { type: 'binh-hoa', desc: 'không sinh không khắc' };
}
