// lib/engine/portrait.ts
// ============================================================
// "Chân Dung Vợ Chồng" — suy hình dáng người phối ngẫu từ cung Phu Thê.
//
// Nguồn thuật toán: "Portrait Generation Engine - Star Priority & Feature
// Fusion Instructions" (Henry cung cấp) — rank sao theo 4 cấp ưu tiên, khóa
// core morphology từ sao chính, chỉ cho sao phụ tinh chỉnh sửa các nét KHÔNG
// thuộc khung xương. Bảng tra hình dáng theo sao = port từ file Excel
// "Hình dáng mệnh khi sao đóng vào.xlsx" (lib/engine/data/portrait-stars.json).
//
// Module này THUẦN deterministic (không gọi LLM/API) — chỉ chọn + rank + merge
// field. Route gọi tiếp LLM để dịch/đánh bóng field đã merge thành 1 đoạn văn
// (xem app/api/chan-dung-vo-chong/route.ts).
// ============================================================

import portraitStarsData from './data/portrait-stars.json';
import type { Laso } from './laso';

type Rec = Record<string, unknown>;

interface StarEntry {
  category?: string;
  element?: string;
  faceShapeVi?: string;
  bodyVi?: string;
  phongThaiVi?: string;
  faceShape?: string;
  forehead?: string;
  eyebrows?: string;
  eyes?: string;
  nose?: string;
  lips?: string;
  chin?: string;
  cheekbones?: string;
  skin?: string;
  hair?: string;
  bodyBuild?: string;
  height?: string;
  expression?: string;
  aura?: string;
  sketchPrompt?: string;
}

interface StarObj {
  ten: string;
  hoa?: string | null;
  nhom?: string;
  brightness?: string;
}

const STAR_DATA = (portraitStarsData as { stars: Record<string, StarEntry> }).stars;

// ── STEP 2 — 4 cấp ưu tiên sao (theo file instructions) ─────────
const LEVEL1_MAIN = new Set([
  'Tử Vi', 'Thiên Phủ', 'Thiên Cơ', 'Thái Dương', 'Thái Âm', 'Vũ Khúc', 'Tham Lang',
  'Liêm Trinh', 'Thiên Đồng', 'Thiên Tướng', 'Cự Môn', 'Thất Sát', 'Phá Quân', 'Thiên Lương',
]);
const LEVEL2_STRONG = new Set([
  'Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp', 'Hỏa Tinh', 'Linh Tinh',
  'Đào Hoa', 'Hồng Loan', 'Thiên Riêu',
]);
// Lục sát tinh — DUY NHẤT nhóm sao tại tam hợp/xung được phép ảnh hưởng tới
// morphology (xem computeSpouseMorphology STEP 1b): theo cách luận giải cổ
// pháp thật, tam hợp/xung chỉ đáng xét khi có cụm sát tinh mạnh gây PHÁ CÁCH —
// không phải mọi sao đóng ở đó (Henry chỉ ra: xem chính tinh + phụ tinh tại
// CHÍNH cung Phu Thê là chuẩn, ít khi xét tam hợp/xung trừ phi có lục sát).
const LUC_SAT_TINH = new Set(['Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp', 'Hỏa Tinh', 'Linh Tinh']);
const LEVEL3_NOBLE = new Set([
  'Văn Xương', 'Văn Khúc', 'Hoa Cái', 'Long Trì', 'Phượng Các', 'Quốc Ấn',
  'Thiên Quan', 'Thiên Phúc', 'Tam Thai', 'Bát Tọa',
]);

function starLevel(ten: string): 1 | 2 | 3 | 4 {
  if (LEVEL1_MAIN.has(ten)) return 1;
  if (LEVEL2_STRONG.has(ten)) return 2;
  if (LEVEL3_NOBLE.has(ten)) return 3;
  return 4;
}

const LEVEL_BASE: Record<number, number> = { 1: 100, 2: 50, 3: 25, 4: 10 };
// STEP 4 — bonus theo độ sáng sao.
const BRIGHTNESS_MULT: Record<string, number> = {
  'Miếu': 1.3, 'Vượng': 1.2, 'Đắc': 1.1, 'Bình': 1.0, 'Hãm': 0.8,
};

// Element field dạng "Hỏa (Thổ)" hoặc "Mộc (Thủy)" → lấy hành CHÍNH (từ đầu).
function primaryElement(raw?: string): string {
  if (!raw) return '';
  const m = String(raw).match(/[A-Za-zÀ-ỹ]+/);
  return m ? m[0] : '';
}

// ── Thu thập sao tại 1 cung (chính + phụ + vòng phụ) ─────────────
function palaceStars(p: Rec | null | undefined): StarObj[] {
  if (!p) return [];
  const out: StarObj[] = [];
  for (const g of ['majorStars', 'minorStars', 'adjectiveStars'] as const) {
    const arr = (p[g] as StarObj[]) || [];
    out.push(...arr);
  }
  return out;
}

// Sao ĐÓNG THẲNG tại cung gốc (Phu Thê) là dấu hiệu CHỦ ĐẠO của cung. Trước
// đây gom TOÀN BỘ sao ở cả tam hợp/xung vào chung 1 pool rồi xếp hạng bằng
// trọng số vị trí (LOC_MULT) — nhưng Henry chỉ ra cách luận giải cổ pháp THẬT
// hẹp hơn nhiều: chỉ xem chính tinh + phụ tinh tại CHÍNH cung Phu Thê, tam
// hợp/xung CHỈ đáng xét khi có lục sát tinh gây phá cách. Gom mọi sao (kể cả
// các sao đẹp/trung tính như Văn Xương, Hồng Loan...) từ tam hợp/xung dễ khiến
// nhiều lá số khác nhau hội tụ về cùng vài sao hay đóng ở Phúc Đức/Thiên Di/
// Quan Lộc → ảnh sinh ra na ná nhau (pha loãng). Nay: home LUÔN là nguồn core
// + tinh chỉnh bình thường (không cần trọng số vị trí nữa — xem
// computeSpouseMorphology STEP 1/1b); tam hợp/xung chỉ góp mặt qua
// LUC_SAT_TINH đã lọc sẵn TRƯỚC khi vào rankStars.
interface LocatedStar extends StarObj {
  loc: 'home' | 'tamHop' | 'xung';
}
function locatedPalaceStars(p: Rec | null | undefined, loc: 'home' | 'tamHop' | 'xung'): LocatedStar[] {
  return palaceStars(p).map((s) => ({ ...s, loc }));
}

export interface RankedStar {
  ten: string;
  level: 1 | 2 | 3 | 4;
  weight: number;
  brightness?: string;
  entry: StarEntry;
  loc: 'home' | 'tamHop' | 'xung';
}

// STEP 1-4 — rank sao theo cấp ưu tiên + bonus ngũ hành + bonus sáng sao. Vị
// trí đóng KHÔNG còn là trọng số ở đây — pool đầu vào đã được CURATE trước
// (chỉ home + lục sát tinh tam hợp/xung, xem computeSpouseMorphology) nên mọi
// sao vào tới đây đều "đáng được xét" như nhau, chỉ còn cạnh tranh theo cấp/
// độ sáng/ngũ hành.
// STEP 8 — chỉ giữ tối đa 8 sao "có ý nghĩa" (bỏ sao không có dữ liệu hình dáng).
function rankStars(pool: LocatedStar[], menhHanh: string): RankedStar[] {
  const seen = new Set<string>();
  const out: RankedStar[] = [];
  for (const s of pool) {
    if (!s?.ten || seen.has(s.ten)) continue;
    const entry = STAR_DATA[s.ten];
    if (!entry) continue; // sao không có dữ liệu hình dáng → bỏ qua (Step 8)
    seen.add(s.ten);
    const level = starLevel(s.ten);
    const bMult = BRIGHTNESS_MULT[s.brightness || ''] ?? 1.0;
    const eMult = menhHanh && primaryElement(entry.element) === menhHanh ? 1.2 : 1.0;
    out.push({
      ten: s.ten,
      level,
      weight: LEVEL_BASE[level] * bMult * eMult,
      brightness: s.brightness,
      entry,
      loc: s.loc,
    });
  }
  out.sort((a, b) => b.weight - a.weight);
  return out.slice(0, 8);
}

// Ngoại lệ cổ pháp DUY NHẤT dùng tới xung chiếu cho CORE (không phải reinforce
// — đây là mượn toàn bộ danh tính): Phu Thê VÔ CHÍNH DIỆU (không có chính
// tinh nào đóng thẳng tại đó) → mượn CHÍNH TINH sáng nhất của cung XUNG CHIẾU
// (đối cung) làm core, đúng quy tắc "vô chính diệu tất phải mượn đối cung
// luận". TÁCH RIÊNG khỏi pool tam hợp/xung "reinforce" (chỉ lục sát tinh) ở
// computeSpouseMorphology — vì đây không phải tinh chỉnh phụ, mà là core.
function bestXungChinhTinh(xung: Rec | undefined, menhHanh: string): RankedStar | null {
  const majors = ((xung?.majorStars as StarObj[]) || []).filter((s) => s?.ten && STAR_DATA[s.ten]);
  if (!majors.length) return null;
  const ranked = majors.map((s) => {
    const entry = STAR_DATA[s.ten];
    const bMult = BRIGHTNESS_MULT[s.brightness || ''] ?? 1.0;
    const eMult = menhHanh && primaryElement(entry.element) === menhHanh ? 1.2 : 1.0;
    return {
      ten: s.ten,
      level: 1 as const,
      weight: LEVEL_BASE[1] * bMult * eMult,
      brightness: s.brightness,
      entry,
      loc: 'xung' as const,
    };
  });
  ranked.sort((a, b) => b.weight - a.weight);
  return ranked[0];
}

// STEP 2 (chọn CORE) — core PHẢI đến từ sao đóng THẲNG tại Phu Thê (chính tinh
// hay phụ tinh cũng được, miễn đóng tại đó). Ngoại lệ cổ pháp DUY NHẤT: Phu
// Thê VÔ CHÍNH DIỆU → mượn chính tinh cung XUNG CHIẾU (xem bestXungChinhTinh).
function pickCore(ranked: RankedStar[], phuThe: Rec | undefined, xung: Rec | undefined, menhHanh: string): RankedStar {
  // "Vô chính diệu" = KHÔNG có chính tinh (level 1) đóng tại Phu Thê — cung
  // vẫn có thể có phụ tinh (Văn Xương, Thiên Phúc...) nên phải kiểm tra
  // majorStars THÔ trước, KHÔNG được suy "có sao ở home" = "có chính tinh".
  const homeMajors = ((phuThe?.majorStars as StarObj[]) || []).length;

  if (homeMajors > 0) {
    // Phu Thê có chính tinh riêng → core LUÔN đến từ home (chính tinh tự
    // thắng phụ tinh nhờ LEVEL_BASE cao hơn, không cần lọc thêm theo level).
    const homeRanked = ranked.filter((r) => r.loc === 'home');
    if (homeRanked.length) return homeRanked[0];
  } else {
    // VÔ CHÍNH DIỆU → mượn CHÍNH TINH cung XUNG CHIẾU (đối cung) làm core,
    // ưu tiên TRƯỚC CẢ phụ tinh lẻ tại home (đúng cổ pháp "vô chính diệu tất
    // phải mượn đối cung luận").
    const borrowed = bestXungChinhTinh(xung, menhHanh);
    if (borrowed) return borrowed;
    // Xung cũng vô chính diệu (hiếm) → đành dùng phụ tinh lẻ tại home nếu có.
    const homeRanked = ranked.filter((r) => r.loc === 'home');
    if (homeRanked.length) return homeRanked[0];
  }

  return ranked[0] || DEFAULT_CORE;
}

// Fallback khi Phu Thê + tam phương tứ chiếu hoàn toàn không có sao nào có
// dữ liệu hình dáng (hiếm — vô chính diệu toàn cục). Dùng khung trung tính.
const DEFAULT_CORE: RankedStar = {
  ten: 'Vô Chính Diệu',
  level: 4,
  weight: 0,
  loc: 'home',
  entry: {
    faceShape: 'Khuôn mặt oval hài hòa, tỷ lệ cân đối, không góc cạnh.',
    forehead: 'Trán vừa phải, thanh thoát.',
    nose: 'Sống mũi thẳng, cân đối.',
    bodyBuild: 'Vóc dáng cân đối, hài hòa, không quá gầy hay quá đẫy đà.',
    height: 'Trung bình.',
    expression: 'Bình hòa, dễ gần.',
    aura: 'Ôn hòa, dễ chịu.',
  },
};

// STEP 5 — khung xương/tỷ lệ KHÓA CỨNG theo sao core, không cho sao phụ ghi đè.
const CORE_FIELDS = ['faceShape', 'forehead', 'nose', 'bodyBuild', 'height'] as const;
// STEP 6 — các nét sao phụ ĐƯỢC PHÉP tinh chỉnh (không đụng khung xương).
const MOD_FIELDS = ['eyebrows', 'eyes', 'lips', 'chin', 'cheekbones', 'skin', 'hair', 'expression', 'aura'] as const;

// STEP 5-7 — build core morphology rồi merge modifier theo thứ tự ưu tiên
// (sao rank cao hơn thắng — Rule 1; sao thấp hơn CHỈ điền field còn trống).
function buildFields(core: RankedStar, ranked: RankedStar[]): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const f of CORE_FIELDS) {
    const v = core.entry[f as keyof StarEntry];
    if (v) fields[f] = String(v);
  }
  if (!fields.faceShape && core.entry.faceShapeVi) fields.faceShape = core.entry.faceShapeVi;
  if (!fields.bodyBuild && core.entry.bodyVi) fields.bodyBuild = core.entry.bodyVi;

  const secondary = ranked.filter((r) => r.ten !== core.ten);
  for (const f of MOD_FIELDS) {
    for (const s of secondary) {
      const v = s.entry[f as keyof StarEntry];
      if (v) { fields[f] = String(v); break; }
    }
    if (!fields[f]) {
      const v = core.entry[f as keyof StarEntry];
      if (v) fields[f] = String(v);
    }
  }
  if (!fields.aura && core.entry.phongThaiVi) fields.aura = core.entry.phongThaiVi;

  return fields;
}

// ── Ước lượng chênh lệch tuổi vợ/chồng ──────────────────────────────────
// Mặc định dân gian: CHỒNG lớn hơn VỢ 3-8 tuổi. CHỈ lệch khỏi biên độ này khi
// lá số CÓ GHI RÕ tín hiệu chênh lệch tuổi tại Phu Thê — đọc thẳng câu chữ
// `cachCucTungCung` (engine đã tính sẵn, gồm cả cách cục lẫn ý nghĩa), KHÔNG
// tự suy từ sao lẻ như bản v1 trước (vốn không theo hướng "chồng lớn hơn vợ"
// nên range ra lệch, ví dụ vợ có thể lớn hơn chồng dù không có tín hiệu nào).
const TYPICAL_MIN = 3;
const TYPICAL_MAX = 8;

function ageOffsetFromPhuThe(yNghia: string[], phuThe: Rec | undefined, userGender: 'nam' | 'nu'): number {
  const text = yNghia.join(' | ');
  // "nên lấy người lớn tuổi hơn" (vd Tử Phá) — CHÍNH NGƯỜI có lá số này hợp với
  // bạn đời LỚN TUỔI HƠN MÌNH, bất kể giới tính — đảo hướng mặc định nếu cần.
  const forceOlder = /lấy người lớn tuổi hơn/.test(text);
  // "nên chênh lệch tuổi" (vd Tử Tướng, Thất Sát Dần/Thân) — chênh lệch RÕ
  // nhưng không nói hướng — giữ hướng mặc định, chỉ nới biên độ.
  const wideGap = /chênh lệch tuổi/.test(text);
  // "gần tuổi" (vd Vũ Khúc Thìn/Tuất) — vợ chồng gần tuổi nhau.
  const closeAge = /gần tuổi/.test(text);

  let lo = TYPICAL_MIN;
  let hi = TYPICAL_MAX;
  if (forceOlder || wideGap) { lo = 9; hi = 14; }
  if (closeAge) { lo = 0; hi = 2; }

  // Chọn 1 giá trị ổn định (không đổi giữa các lần gọi lại cùng lá số) trong
  // biên độ trên, dựa vào tên sao đóng tại Phu Thê — để mỗi lá số ra 1 số
  // nhất quán nhưng không luôn đúng 1 con số cố định.
  const seed = palaceStars(phuThe).reduce((acc, s) => acc + (s.ten ? s.ten.length : 0), 0);
  const magnitude = lo + (hi > lo ? seed % (hi - lo + 1) : 0);

  const partnerOlder = forceOlder || userGender === 'nu';
  return partnerOlder ? magnitude : -magnitude;
}

// ── Mốc tuổi để sinh ảnh — độ tuổi LẬP GIA ĐÌNH, KHÔNG phải tuổi hiện tại ──
// Henry chỉ ra: dùng tuổi hiện tại của lá số gốc (có thể 50-70+) làm mốc dễ
// ra ảnh quá già — nên LUÔN neo theo độ tuổi lập gia đình phổ biến (22-31),
// nới lên 30-35 nếu lá số CÓ GHI RÕ hôn nhân muộn (yNghia — "nên muộn hôn
// nhân"/"nên muộn"). Random 1 số trong range mỗi lượt gen — đây là mốc GIẢ
// ĐỊNH tuổi kết hôn, dùng để cộng/trừ starAgeOffset (±3-8 như cũ) ra
// spouseAge, KHÔNG phải tuổi thật của người xem lá số.
const MARRIAGE_AGE_MIN = 22;
const MARRIAGE_AGE_MAX = 31;
const LATE_MARRIAGE_AGE_MIN = 30;
const LATE_MARRIAGE_AGE_MAX = 35;

function pickMarriageAgeAnchor(yNghia: string[]): number {
  const lateMarriage = /nên muộn/.test(yNghia.join(' | '));
  const lo = lateMarriage ? LATE_MARRIAGE_AGE_MIN : MARRIAGE_AGE_MIN;
  const hi = lateMarriage ? LATE_MARRIAGE_AGE_MAX : MARRIAGE_AGE_MAX;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export interface SpouseMorphology {
  spouseGender: 'nam' | 'nu';
  spouseAge: number;
  /** Mốc tuổi LẬP GIA ĐÌNH giả định (random 22-31, hoặc 30-35 nếu lá số ghi
   * rõ hôn nhân muộn) — KHÔNG phải tuổi hiện tại của lá số gốc (xem
   * pickMarriageAgeAnchor). route.ts dùng số này làm mốc cộng/trừ tuổi bạn
   * đời (ưu tiên cao hơn fallback starAgeOffset khi cách cục không có gợi ý
   * tuổi tác rõ ràng). */
  baseAge: number;
  /** Offset mặc định "chồng lớn hơn vợ 3-8 tuổi" (đảo hướng/nới biên độ nếu
   * cachCucTungCung ghi rõ tín hiệu khác) — route.ts chỉ dùng làm fallback khi
   * LLM đọc (B)/(C) không thấy gợi ý tuổi tác rõ ràng nào. */
  starAgeOffset: number;
  fields: Record<string, string>;
  coreStar: string;
  contributingStars: string[];
}

/**
 * Suy hình dáng người phối ngẫu từ lá số đã tính (computeLaso). Thuần
 * deterministic — KHÔNG gọi LLM. Route gọi tiếp LLM để dịch/đánh bóng
 * `fields` thành prompt ảnh (EN) + đoạn mô tả (VI).
 */
export function computeSpouseMorphology(ls: Laso, userGender: 'nam' | 'nu'): SpouseMorphology {
  const palaces = (ls.palaces as Rec[]) || [];
  const phuThe = palaces.find((p) => p.cungName === 'Phu Thê') as Rec | undefined;
  const tamHop = (phuThe?.tamHopCungs as Rec[]) || [];
  const xung = phuThe?.xungChieuCung as Rec | undefined;

  // STEP 1 — sao ĐÓNG THẲNG tại Phu Thê (chính tinh + phụ tinh) là nguồn DUY
  // NHẤT cho core + tinh chỉnh bình thường — đúng cách luận giải cổ pháp thật
  // (Henry: chỉ xem sao tại chính cung, ít khi xét tam hợp/xung).
  const homePool = locatedPalaceStars(phuThe, 'home');
  // STEP 1b — tam hợp/xung CHỈ góp mặt khi có LỤC SÁT TINH (tín hiệu phá cách
  // thật sự) — bỏ qua mọi sao khác dù cũng đóng ở đó (Văn Xương, Hồng Loan,
  // Đào Hoa...), tránh pha loãng khiến nhiều lá số khác nhau ra hình na ná.
  const supportSat = [
    ...tamHop.flatMap((p) => locatedPalaceStars(p as Rec, 'tamHop')),
    ...locatedPalaceStars(xung, 'xung'),
  ].filter((s) => LUC_SAT_TINH.has(s.ten));

  const pool: LocatedStar[] = [...homePool, ...supportSat];

  const menhHanh = primaryElement(String(ls.cuc || '').split(' ')[0]);
  const ranked = rankStars(pool, menhHanh);
  const core = pickCore(ranked, phuThe, xung, menhHanh);

  const fields = buildFields(core, ranked.length ? ranked : [DEFAULT_CORE]);

  const yNghia = ((ls.cachCucTungCung as Record<string, string[]>) || {})['Phu Thê'] || [];
  const baseAge = pickMarriageAgeAnchor(yNghia);
  const starAgeOffset = ageOffsetFromPhuThe(yNghia, phuThe, userGender);
  const spouseAge = Math.max(18, Math.min(80, baseAge + starAgeOffset));

  return {
    spouseGender: userGender === 'nam' ? 'nu' : 'nam',
    spouseAge,
    baseAge,
    starAgeOffset,
    fields,
    coreStar: core.ten,
    // core có thể là chính tinh MƯỢN từ xung chiếu (vô chính diệu — xem
    // pickCore) nên không nằm sẵn trong `ranked`; thêm vào đây cho đủ.
    contributingStars: Array.from(new Set([core.ten, ...ranked.map((r) => r.ten)])),
  };
}

// ── Cách cục / ý nghĩa cung Phu Thê (đọc thẳng từ engine, không tự suy) ────
// Đây là dữ liệu ƯU TIÊN CAO NHẤT (Henry yêu cầu) — engine đã có sẵn diễn giải
// định tính về hôn nhân (hôn nhân muộn, chênh lệch tuổi, xa cách, đa tình...)
// qua phanTichCachCuc()/phanTichCungYNghia(). Route đưa văn bản này cho LLM
// ĐỌC và rút tín hiệu (tuổi tác/tính cách/hoàn cảnh), thay vì tự đoán từ sao.
export interface PhuTheReadout {
  chinhTinh: string[];
  phuTinh: string[];
  cachCuc: { ten: string; loai: string; moTa: string; chiTiet: string }[];
  yNghia: string[];
}

function fmtStarDisplay(s: StarObj): string {
  return s.brightness ? `${s.ten} (${s.brightness})` : s.ten;
}

export function getPhuTheReadout(ls: Laso): PhuTheReadout {
  const palaces = (ls.palaces as Rec[]) || [];
  const p = palaces.find((x) => x.cungName === 'Phu Thê') as Rec | undefined;

  const chinhTinh = ((p?.majorStars as StarObj[]) || []).map(fmtStarDisplay);
  const phuTinh = ((p?.stars as StarObj[]) || [])
    .filter((s) => s.nhom !== 'chinh')
    .map(fmtStarDisplay);

  const cachCucAll = Array.isArray(ls.cachCuc) ? (ls.cachCuc as Rec[]) : [];
  const cachCuc = cachCucAll
    .filter((c) => String(c.cung || '').split('/').includes('Phu Thê'))
    .map((c) => ({
      ten: String(c.ten || ''),
      loai: String(c.loai || ''),
      moTa: String(c.moTa || ''),
      chiTiet: String(c.chiTiet || ''),
    }));

  const yNghia = ((ls.cachCucTungCung as Record<string, string[]>) || {})['Phu Thê'] || [];

  return { chinhTinh, phuTinh, cachCuc, yNghia };
}

// Ngũ hành sao chính tinh tại Phu Thê — dùng để chọn TÔNG MÀU trang phục chân
// dung (Henry yêu cầu: Kim→trắng/be, Hỏa→đỏ nhạt, Thủy→xanh dương nhạt,
// Mộc→xanh lá nhạt, Thổ→vàng nhạt/be). Lấy sao chính tinh ĐẦU TIÊN có dữ liệu
// (không phải sao rank cao nhất của morphology — có thể là phụ tinh/sát tinh).
// Trả '' nếu Phu Thê vô chính diệu → route.ts tự fallback tông trung tính.
export function getPhuTheChinhTinhElement(ls: Laso): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const p = palaces.find((x) => x.cungName === 'Phu Thê') as Rec | undefined;
  const majors = ((p?.majorStars as StarObj[]) || []).filter((s) => s?.ten);
  for (const s of majors) {
    const el = primaryElement(STAR_DATA[s.ten]?.element);
    if (el) return el;
  }
  return '';
}

// Format gọn cho prompt LLM — đúng nguyên văn diễn giải engine, LLM chỉ ĐỌC
// và rút tín hiệu, KHÔNG được tự bịa thêm cách cục không có trong danh sách.
export function formatPhuTheForLLM(r: PhuTheReadout): string {
  const lines: string[] = [];
  if (r.chinhTinh.length) lines.push('Chính tinh tại Phu Thê: ' + r.chinhTinh.join(', '));
  if (r.phuTinh.length) lines.push('Phụ tinh tại Phu Thê: ' + r.phuTinh.join(', '));
  if (r.cachCuc.length) {
    lines.push(
      'Cách cục đặc biệt: ' + r.cachCuc.map((c) => `${c.ten} — ${c.moTa}`).join(' | '),
    );
  }
  if (r.yNghia.length) lines.push('Ý nghĩa (cổ pháp): ' + r.yNghia.join(' | '));
  return lines.join('\n') || '(Không có cách cục đặc biệt nổi bật tại Phu Thê.)';
}

// Format gọn cho prompt LLM (Vietnamese) — chỉ liệt kê field có giá trị.
export function formatMorphologyForLLM(m: SpouseMorphology): string {
  const LABELS: Record<string, string> = {
    faceShape: 'Hình dáng khuôn mặt', forehead: 'Trán', eyebrows: 'Lông mày', eyes: 'Mắt',
    nose: 'Mũi', lips: 'Môi', chin: 'Cằm', cheekbones: 'Gò má', skin: 'Da', hair: 'Tóc',
    bodyBuild: 'Vóc dáng', height: 'Chiều cao', expression: 'Biểu cảm', aura: 'Phong thái/khí chất',
  };
  const lines = Object.entries(m.fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${LABELS[k] || k}: ${v}`);
  return lines.join('\n');
}
