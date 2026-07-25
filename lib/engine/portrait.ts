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

export interface RankedStar {
  ten: string;
  level: 1 | 2 | 3 | 4;
  weight: number;
  brightness?: string;
  entry: StarEntry;
}

// STEP 1-4 — rank sao theo cấp ưu tiên + bonus ngũ hành + bonus sáng sao.
// STEP 8 — chỉ giữ tối đa 8 sao "có ý nghĩa" (bỏ sao không có dữ liệu hình dáng).
function rankStars(pool: StarObj[], menhHanh: string): RankedStar[] {
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
    out.push({ ten: s.ten, level, weight: LEVEL_BASE[level] * bMult * eMult, brightness: s.brightness, entry });
  }
  out.sort((a, b) => b.weight - a.weight);
  return out.slice(0, 8);
}

// Fallback khi Phu Thê + tam phương tứ chiếu hoàn toàn không có sao nào có
// dữ liệu hình dáng (hiếm — vô chính diệu toàn cục). Dùng khung trung tính.
const DEFAULT_CORE: RankedStar = {
  ten: 'Vô Chính Diệu',
  level: 4,
  weight: 0,
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

export interface SpouseMorphology {
  spouseGender: 'nam' | 'nu';
  spouseAge: number;
  /** Tuổi hiện tại của lá số gốc — dùng làm mốc khi route.ts cần tính lại tuổi
   * theo gợi ý cách cục (ưu tiên cao hơn fallback này). */
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

  // STEP 1 — thu thập sao tại Phu Thê + tam phương tứ chiếu (Phúc Đức, Thiên
  // Di, xung Quan Lộc) — mirror đúng cách file instructions gom Mệnh+3 cung
  // tam-chiếu, chỉ đổi cung gốc từ Mệnh sang Phu Thê.
  const pool = [phuThe, ...tamHop, xung].filter(Boolean).flatMap((p) => palaceStars(p as Rec));

  const menhHanh = primaryElement(String(ls.cuc || '').split(' ')[0]);
  const ranked = rankStars(pool, menhHanh);
  const core = ranked.find((r) => r.level === 1) || ranked[0] || DEFAULT_CORE;

  const fields = buildFields(core, ranked.length ? ranked : [DEFAULT_CORE]);

  const baseAge = Number(ls.tuoiXem) || 30;
  const yNghia = ((ls.cachCucTungCung as Record<string, string[]>) || {})['Phu Thê'] || [];
  const starAgeOffset = ageOffsetFromPhuThe(yNghia, phuThe, userGender);
  const spouseAge = Math.max(18, Math.min(80, baseAge + starAgeOffset));

  return {
    spouseGender: userGender === 'nam' ? 'nu' : 'nam',
    spouseAge,
    baseAge,
    starAgeOffset,
    fields,
    coreStar: core.ten,
    contributingStars: ranked.map((r) => r.ten),
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
