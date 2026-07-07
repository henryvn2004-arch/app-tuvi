// lib/mcp/tools/tuong-hop.ts
// ============================================================
// TOOL — tuong_hop: so hai lá số Tử Vi để xét TƯƠNG HỢP vợ chồng / làm ăn.
// Chỉ là computeLaso ×2 (deterministic) + quan hệ địa chi năm sinh (tam hợp /
// lục hợp / lục xung / lục hại). KHÔNG luận — AI của user tự luận từ dữ liệu.
// ============================================================

import { z } from 'zod';
import { computeLaso } from '@/lib/engine/laso';
import type { BirthParams } from '@/lib/contract/v1';
import { type McpTool, parseGioSinh, parseNgay, majorStarsOf } from './_shared';

type Rec = Record<string, unknown>;

const nguoiSchema = z.object({
  ngay_duong: z.string().describe('Ngày sinh dương lịch YYYY-MM-DD'),
  gio_sinh: z.union([z.number(), z.string()]).describe('Giờ sinh: số 0–23 hoặc tên giờ chi'),
  gioi_tinh: z.enum(['nam', 'nu']),
  am_lich: z.boolean().optional(),
});

const schema = {
  loai: z.enum(['vo-chong', 'lam-an']).describe("Loại tương hợp: 'vo-chong' (hôn nhân) hoặc 'lam-an' (hợp tác kinh doanh)"),
  nguoi_a: nguoiSchema.describe('Người thứ nhất'),
  nguoi_b: nguoiSchema.describe('Người thứ hai'),
};

// ── Quan hệ địa chi năm sinh ────────────────────────────────
const TAM_HOP = [['Thân', 'Tý', 'Thìn'], ['Dần', 'Ngọ', 'Tuất'], ['Tỵ', 'Dậu', 'Sửu'], ['Hợi', 'Mão', 'Mùi']];
const LUC_HOP: Record<string, string> = { Tý: 'Sửu', Sửu: 'Tý', Dần: 'Hợi', Hợi: 'Dần', Mão: 'Tuất', Tuất: 'Mão', Thìn: 'Dậu', Dậu: 'Thìn', Tỵ: 'Thân', Thân: 'Tỵ', Ngọ: 'Mùi', Mùi: 'Ngọ' };
const LUC_XUNG: Record<string, string> = { Tý: 'Ngọ', Ngọ: 'Tý', Sửu: 'Mùi', Mùi: 'Sửu', Dần: 'Thân', Thân: 'Dần', Mão: 'Dậu', Dậu: 'Mão', Thìn: 'Tuất', Tuất: 'Thìn', Tỵ: 'Hợi', Hợi: 'Tỵ' };
const LUC_HAI: Record<string, string> = { Tý: 'Mùi', Mùi: 'Tý', Sửu: 'Ngọ', Ngọ: 'Sửu', Dần: 'Tỵ', Tỵ: 'Dần', Mão: 'Thìn', Thìn: 'Mão', Thân: 'Hợi', Hợi: 'Thân', Dậu: 'Tuất', Tuất: 'Dậu' };

function chiRelation(a: string, b: string): { quan_he: string; y_nghia: string } {
  if (!a || !b) return { quan_he: 'không rõ', y_nghia: '' };
  if (a === b) return { quan_he: 'đồng chi', y_nghia: 'Cùng tuổi/chi — dễ đồng cảm nhưng dễ trùng nhược điểm.' };
  if (TAM_HOP.some((g) => g.includes(a) && g.includes(b))) return { quan_he: 'tam hợp', y_nghia: 'Rất hợp — dễ tương trợ, đồng lòng.' };
  if (LUC_HOP[a] === b) return { quan_he: 'lục hợp', y_nghia: 'Hợp — gắn kết, bổ trợ nhau.' };
  if (LUC_XUNG[a] === b) return { quan_he: 'lục xung', y_nghia: 'Xung khắc — dễ va chạm, cần dung hòa.' };
  if (LUC_HAI[a] === b) return { quan_he: 'lục hại', y_nghia: 'Tương hại — dễ hiểu lầm, tổn hao ngầm.' };
  return { quan_he: 'bình hòa', y_nghia: 'Không xung không hợp rõ rệt — trung tính.' };
}

function summary(ls: Rec, loai: string): Rec {
  const palaces = (ls.palaces as Rec[]) || [];
  const pick = (name: string) => palaces.find((p) => p.cungName === name);
  const menh = palaces.find((p) => p.isMenh);
  const out: Rec = {
    can_chi_nam: ls.canChiNam ?? null,
    nap_am: ls.napAm ? `${ls.napAm}${ls.napAmHanh ? ` (${ls.napAmHanh})` : ''}` : null,
    menh: menh ? { dia_chi: menh.diaChi ?? null, chinh_tinh: majorStarsOf(menh) } : null,
  };
  if (loai === 'lam-an') {
    const ql = pick('Quan Lộc'), tb = pick('Tài Bạch');
    out.quan_loc = ql ? { dia_chi: ql.diaChi, chinh_tinh: majorStarsOf(ql) } : null;
    out.tai_bach = tb ? { dia_chi: tb.diaChi, chinh_tinh: majorStarsOf(tb) } : null;
  } else {
    const pt = pick('Phu Thê');
    out.phu_the = pt ? { dia_chi: pt.diaChi, chinh_tinh: majorStarsOf(pt) } : null;
  }
  const dv = ls.daiVanHienTai as Rec | undefined;
  if (dv) out.dai_van_hien_tai = { dia_chi: dv.diaChi, tuoi_tu: dv.tuoiStart, tuoi_den: dv.tuoiEnd, diem: (dv.scoring as Rec)?.tong ?? null };
  const cc = ((ls.cachCuc as Rec[]) || []).map((c) => (typeof c === 'object' ? c.ten : c)).filter(Boolean);
  if (cc.length) out.cach_cuc = cc.slice(0, 8);
  return out;
}

function buildBirth(p: Rec): BirthParams | { error: string } {
  const ngay = parseNgay(String(p.ngay_duong));
  if (!ngay) return { error: 'ngay_duong phải theo định dạng YYYY-MM-DD.' };
  const hb = parseGioSinh(p.gio_sinh as number | string);
  if (hb < 0) return { error: 'gio_sinh không hợp lệ (0–23 hoặc tên giờ chi).' };
  return { day: ngay.day, month: ngay.month, year: ngay.year, hourBranch: hb, gender: p.gioi_tinh === 'nu' ? 'nu' : 'nam', isLunar: !!p.am_lich };
}

export const tuongHopTool: McpTool = {
  name: 'tuong_hop',
  description:
    'Xét TƯƠNG HỢP giữa hai người bằng Tử Vi: hôn nhân (loai="vo-chong") hoặc hợp tác làm ăn (loai="lam-an"). Trả về tóm tắt lá số của cả hai (Mệnh + Phu Thê hoặc Quan Lộc/Tài Bạch, đại vận, cách cục) và quan hệ địa chi năm sinh (tam hợp / lục hợp / lục xung / lục hại). Dùng khi người dùng hỏi "hai tuổi này có hợp không", "vợ chồng/đối tác hợp không". Diễn giải dựa trên dữ liệu, không tự tính lại.',
  schema,
  run: (args) => {
    const ba = buildBirth(args.nguoi_a || {});
    if ('error' in ba) return { error: 'Người A: ' + ba.error };
    const bb = buildBirth(args.nguoi_b || {});
    if ('error' in bb) return { error: 'Người B: ' + bb.error };
    const ra = computeLaso(ba);
    const rb = computeLaso(bb);
    if (!ra.ok || !ra.ls) return { error: 'Người A: ' + (ra.error || 'không lập được lá số.') };
    if (!rb.ok || !rb.ls) return { error: 'Người B: ' + (rb.error || 'không lập được lá số.') };
    const lsA = ra.ls as Rec, lsB = rb.ls as Rec;
    const loai = args.loai === 'lam-an' ? 'lam-an' : 'vo-chong';

    const yearChiA = String(lsA.canChiNam || '').split(' ')[1] || '';
    const yearChiB = String(lsB.canChiNam || '').split(' ')[1] || '';

    return {
      loai,
      nguoi_a: summary(lsA, loai),
      nguoi_b: summary(lsB, loai),
      quan_he_chi_nam_sinh: { a: yearChiA, b: yearChiB, ...chiRelation(yearChiA, yearChiB) },
      note: 'Đây là dữ liệu 2 lá số + quan hệ chi năm sinh. Hãy luận tương hợp dựa trên cung Mệnh, ' +
        (loai === 'lam-an' ? 'Quan Lộc/Tài Bạch' : 'Phu Thê') + ', cách cục và quan hệ địa chi ở trên.',
    };
  },
};
