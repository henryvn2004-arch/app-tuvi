// lib/mcp/tools/luan-giai.ts
// ============================================================
// TOOL — luan_giai: trả BỘ PHÂN TÍCH ĐẦY ĐỦ của lá số (nguyên liệu cho bản
// luận giải 24 mục): điểm từng cung, điểm mạnh/yếu, cách cục chi tiết, tứ hóa,
// thần sát, tuần/triệt, đại vận. Tất cả deterministic từ engine — AI của user
// tự viết luận giải, server KHÔNG luận (không tốn token).
// ============================================================

import { z } from 'zod';
import { computeLaso } from '@/lib/engine/laso';
import type { BirthParams } from '@/lib/contract/v1';
import {
  type McpTool, parseGioSinh, parseNgay, majorStarsOf, minorStarsOf, tuChinhOf,
} from './_shared';

type Rec = Record<string, unknown>;

const SAT_TINH = new Set(['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp']);

const schema = {
  ngay_duong: z.string().describe('Ngày sinh dương lịch YYYY-MM-DD'),
  gio_sinh: z.union([z.number(), z.string()]).describe('Giờ sinh: số 0–23 hoặc tên giờ chi'),
  gioi_tinh: z.enum(['nam', 'nu']),
  am_lich: z.boolean().optional().describe('true nếu ngay_duong là ngày ÂM lịch'),
};

function starNamesOf(p: Rec): string[] {
  return [...((p.majorStars as Rec[]) || []), ...((p.stars as Rec[]) || [])]
    .map((s) => String(s?.ten || '')).filter(Boolean);
}

export const luanGiaiTool: McpTool = {
  name: 'luan_giai',
  description:
    'Trả về BỘ PHÂN TÍCH ĐẦY ĐỦ của một lá số Tử Vi để viết luận giải chi tiết (kiểu 24 mục): điểm số từng cung, các cung mạnh nhất & yếu nhất, cách cục chi tiết (kèm ý nghĩa), vị trí tứ hóa, thần sát (sát tinh) từng cung, cung bị Tuần/Triệt, và bảng đại vận có điểm. Dùng khi người dùng muốn "luận giải chi tiết / tổng quát lá số", "phân tích toàn diện". Đây là số liệu chuẩn — hãy dựa vào để viết luận giải, không tự bịa cung/sao/điểm.',
  schema,
  run: (args) => {
    const ngay = parseNgay(String(args.ngay_duong));
    if (!ngay) return { error: 'ngay_duong phải theo định dạng YYYY-MM-DD.' };
    const hourBranch = parseGioSinh(args.gio_sinh);
    if (hourBranch < 0) return { error: 'gio_sinh không hợp lệ (0–23 hoặc tên giờ chi).' };
    const birth: BirthParams = {
      day: ngay.day, month: ngay.month, year: ngay.year,
      hourBranch, gender: args.gioi_tinh === 'nu' ? 'nu' : 'nam', isLunar: !!args.am_lich,
    };
    const r = computeLaso(birth);
    if (!r.ok || !r.ls) return { error: r.error || 'Không lập được lá số.' };
    const ls = r.ls as Rec;
    const palaces = (ls.palaces as Rec[]) || [];
    const scores = (ls.cungScores as Record<string, { tong?: number }>) || {};
    const menh = palaces.find((p) => p.isMenh);
    const than = palaces.find((p) => p.isThan);

    // 12 cung + điểm + cách cục gắn cung + thần sát + tuần/triệt.
    const cachCucList = (Array.isArray(ls.cachCuc) ? ls.cachCuc : []) as Rec[];
    const ynByCung = (ls.cachCucTungCung as Record<string, string[]>) || {};
    const cung = palaces.map((p) => {
      const name = String(p.cungName || '');
      const names = starNamesOf(p);
      const ccThis = cachCucList
        .filter((c) => String(c.cung || '').split('/').includes(name))
        .map((c) => ({ ten: c.ten, loai: c.loai, mo_ta: c.moTa, chi_tiet: c.chiTiet }));
      return {
        ten: name,
        dia_chi: p.diaChi ?? null,
        is_menh: !!p.isMenh,
        is_than: !!p.isThan,
        diem: scores[name]?.tong ?? null,
        chinh_tinh: majorStarsOf(p),
        phu_tinh: minorStarsOf(p),
        tam_phuong_tu_chinh: tuChinhOf(p), // sao hội chiếu — cốt lõi luận cung
        than_sat: names.filter((n) => SAT_TINH.has(n)),
        tuan_triet: names.filter((n) => n === 'Tuần' || n === 'Triệt' || n === 'Tuần+Triệt'),
        cach_cuc: ccThis,
        y_nghia: (ynByCung[name] || []).slice(0, 8), // ý nghĩa chi tiết từng cung (như web)
      };
    });

    // Điểm mạnh / yếu — xếp hạng theo tong.
    const ranked = palaces
      .map((p) => ({ ten: String(p.cungName || ''), dia_chi: String(p.diaChi || ''), diem: scores[String(p.cungName || '')]?.tong ?? null }))
      .filter((x) => x.diem != null)
      .sort((a, b) => (b.diem as number) - (a.diem as number));

    // Tứ hóa gốc.
    const tuHoaGoc: Rec[] = [];
    for (const p of palaces) {
      for (const s of [...((p.majorStars as Rec[]) || []), ...((p.stars as Rec[]) || [])]) {
        if (s && s.hoa) tuHoaGoc.push({ sao: String(s.ten || ''), hoa: String(s.hoa), cung: String(p.cungName || ''), dia_chi: String(p.diaChi || '') });
      }
    }

    return {
      tong_quan: {
        can_chi_nam: ls.canChiNam ?? null,
        am_duong: ls.amDuong ?? null,
        cuc: ls.cuc ?? null,
        nap_am: ls.napAm ? `${ls.napAm}${ls.napAmHanh ? ` (${ls.napAmHanh})` : ''}` : null,
        tuoi_xem: ls.tuoiXem ?? null,
        menh: menh ? { dia_chi: menh.diaChi ?? null, chinh_tinh: majorStarsOf(menh), diem: scores['Mệnh']?.tong ?? null } : null,
        than: than ? { dia_chi: than.diaChi ?? null } : null,
      },
      diem_manh: ranked.slice(0, 3),
      diem_yeu: ranked.slice(-3).reverse(),
      cung,
      cach_cuc_toan_cuc: cachCucList.map((c) => ({ ten: c.ten, loai: c.loai, cung: c.cung, mo_ta: c.moTa, chi_tiet: c.chiTiet })),
      tu_hoa_goc: tuHoaGoc,
      dai_van: ((ls.daiVans as Rec[]) || []).map((dv, i) => {
        const p = palaces[dv.cungIdx as number];
        const sc = (dv.scoring as Rec) || {};
        return {
          thu_tu: i + 1, // đại vận thứ mấy (1..12) — để "luận đại vận N"
          cung: p?.cungName ?? null,
          dia_chi: dv.diaChi ?? null,
          tuoi_tu: dv.tuoiStart ?? null,
          tuoi_den: dv.tuoiEnd ?? null,
          diem: sc.tong ?? null,
          flag: sc.flag ?? null,
          chinh_tinh: p ? majorStarsOf(p) : [],
          chi_tiet_diem: {
            thien_thoi: (sc.thienThoi as Rec)?.score ?? null,
            dia_loi: (sc.diaLoi as Rec)?.score ?? null,
            nhan_hoa: (sc.nhanHoa as Rec)?.score ?? null,
          },
          // Bộ nhận định deterministic của engine cho đại vận này (dùng để luận).
          luan: ((dv.rules as Rec[]) || []).map((rr) => ({ y: rr.text, loai: rr.type })),
        };
      }),
    };
  },
};
