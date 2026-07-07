// lib/mcp/tools/an-sao.ts
// ============================================================
// TOOL 1 — an_sao: lập lá số Tử Vi từ ngày/giờ sinh.
// Tái dùng computeLaso (lib/engine/laso.ts) → engine vanilla là nguồn
// lá số DUY NHẤT (parity với web). Chỉ trả DỮ LIỆU đã tính, không dump
// quy tắc an sao.
// ============================================================

import { z } from 'zod';
import { computeLaso } from '@/lib/engine/laso';
import type { BirthParams } from '@/lib/contract/v1';
import {
  type McpTool, CHI_NAMES, parseGioSinh, parseNgay,
  majorStarsOf, minorStarsOf, tuChinhOf,
} from './_shared';

type Rec = Record<string, unknown>;

const schema = {
  ngay_duong: z.string().describe('Ngày sinh dương lịch định dạng YYYY-MM-DD, ví dụ 1984-05-09'),
  gio_sinh: z.union([z.number(), z.string()]).describe(
    'Giờ sinh: số 0–23 (giờ đồng hồ, sẽ tự quy về địa chi giờ) HOẶC tên giờ chi ("Tý","Sửu",…,"Hợi")',
  ),
  phut: z.number().int().min(0).max(59).optional().describe('Phút sinh (không đổi khối giờ, chỉ để tham chiếu)'),
  gioi_tinh: z.enum(['nam', 'nu']).describe("Giới tính: 'nam' hoặc 'nu'"),
  am_lich: z.boolean().optional().describe('true nếu ngay_duong thực ra là ngày ÂM lịch (mặc định false = dương lịch)'),
};

function chieuDaiVan(amDuong: string, gender: string): string {
  const thuan = (amDuong === 'dương' && gender === 'nam') || (amDuong === 'âm' && gender === 'nu');
  return thuan ? 'thuận' : 'nghịch';
}

export const anSaoTool: McpTool = {
  name: 'an_sao',
  description:
    'Lập lá số Tử Vi Đẩu Số từ ngày/giờ/giới tính sinh. Trả về: can chi năm, âm/dương nam-nữ, cục, nạp âm, cung Mệnh & Thân, đầy đủ 12 cung (chính tinh + phụ tinh + tứ hóa), và bảng đại vận. DÙNG tool này ĐẦU TIÊN khi người dùng cung cấp ngày sinh và muốn xem lá số / luận giải mệnh. Đây là dữ liệu tính toán chính xác — hãy diễn giải dựa trên nó, không tự an lại sao.',
  schema,
  // an_sao: không giới hạn (đây là hook) → không có quota check.
  run: (args) => {
    const ngay = parseNgay(String(args.ngay_duong));
    if (!ngay) return { error: 'ngay_duong phải theo định dạng YYYY-MM-DD (ví dụ 1984-05-09).' };
    const hourBranch = parseGioSinh(args.gio_sinh);
    if (hourBranch < 0) {
      return { error: 'gio_sinh không hợp lệ. Nhập số 0–23 hoặc tên giờ chi (Tý, Sửu, …, Hợi).' };
    }
    const gender = args.gioi_tinh === 'nu' ? 'nu' : 'nam';
    const birth: BirthParams = {
      day: ngay.day, month: ngay.month, year: ngay.year,
      hourBranch, gender, isLunar: !!args.am_lich,
    };

    const r = computeLaso(birth);
    if (!r.ok || !r.ls) return { error: r.error || 'Không lập được lá số.' };
    const ls = r.ls as Rec;
    const palaces = (ls.palaces as Rec[]) || [];
    const menh = palaces.find((p) => p.isMenh);
    const than = palaces.find((p) => p.isThan);
    const amDuong = String(ls.amDuong || '');

    // Tứ hóa gốc: quét mọi cung tìm sao có .hoa (engine đã an sẵn tại vị trí natal).
    const tuHoaGoc: Rec[] = [];
    for (const p of palaces) {
      for (const s of [...((p.majorStars as Rec[]) || []), ...((p.stars as Rec[]) || [])]) {
        if (s && s.hoa) {
          tuHoaGoc.push({ sao: String(s.ten || ''), hoa: String(s.hoa), cung: String(p.cungName || ''), dia_chi: String(p.diaChi || '') });
        }
      }
    }

    return {
      input: {
        ngay_duong: args.ngay_duong,
        gio_chi: hourBranch >= 0 ? CHI_NAMES[hourBranch] : null,
        gioi_tinh: gender,
        am_lich: !!args.am_lich,
      },
      can_chi_nam: ls.canChiNam ?? null,
      am_duong: amDuong,
      am_duong_gioi_tinh: `${amDuong} ${gender === 'nam' ? 'nam' : 'nữ'}`,
      cuc: ls.cuc ?? null,
      nap_am: ls.napAm ? `${ls.napAm}${ls.napAmHanh ? ` (hành ${ls.napAmHanh})` : ''}` : null,
      chieu_dai_van: chieuDaiVan(amDuong, gender),
      cung_menh: menh
        ? { dia_chi: menh.diaChi ?? null, chinh_tinh: majorStarsOf(menh) }
        : null,
      cung_than: than ? { dia_chi: than.diaChi ?? null } : null,
      cung: palaces.map((p) => ({
        ten: p.cungName ?? null,
        dia_chi: p.diaChi ?? null,
        is_menh: !!p.isMenh,
        is_than: !!p.isThan,
        chinh_tinh: majorStarsOf(p),
        phu_tinh: minorStarsOf(p),
        tam_phuong_tu_chinh: tuChinhOf(p),
      })),
      tu_hoa_goc: tuHoaGoc,
      dai_van: ((ls.daiVans as Rec[]) || []).map((dv) => ({
        cung: palaces[dv.cungIdx as number]?.cungName ?? null,
        dia_chi: dv.diaChi ?? null,
        tuoi_tu: dv.tuoiStart ?? null,
        tuoi_den: dv.tuoiEnd ?? null,
      })),
    };
  },
};
