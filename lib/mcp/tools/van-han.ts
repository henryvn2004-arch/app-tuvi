// lib/mcp/tools/van-han.ts
// ============================================================
// TOOL 2 — van_han: vận hạn của lá số cho MỘT NĂM dương lịch.
//
// TÁI DÙNG engine (Phụ lục A đã có sẵn, đã verify test case):
//   • computeLaso(birth, nam_xem) → ls đã tính cho đúng năm xem:
//       - ls.tieuHanIdx        = tiểu hạn        (A.3, tinhTieuHan)
//       - ls.luuNienDaiHanIdx  = lưu (niên) đại vận (A.2, tinhLuuDaiHan)
//       - ls.chiNamXem         = chi năm xem → lưu Thái Tuế (A.1)
//       - ls.daiVanHienTai     = đại vận hiện tại + điểm
//   • TU_HOA (engine) → lưu tứ hóa theo can năm xem (A.4)
//   • matchVanHanCombos → blocks = tổ hợp sao chéo tầng (deterministic)
//
// KHÔNG để LLM server generate gì — chỉ dữ liệu + block có sẵn.
// ============================================================

import { z } from 'zod';
import { computeLaso } from '@/lib/engine/laso';
import { currentNamXem } from '@/lib/engine/namxem';
import { resolveNguyetHanSegments, resolveNhatHanIdx } from '@/lib/engine/van-ngay';
import { matchVanHanCombos, type LayerCung, type ComboHit } from '@/lib/agent/vanHanCombos';
import type { BirthParams } from '@/lib/contract/v1';
import { loadMcpEngine } from '../engine';
import { distinctVanHanYears } from '../usage';
import {
  type McpTool, yearCan, yearChi, parseGioSinh, parseNgay, allStarNames, normVi,
  majorStarsOf, minorStarsOf, tuChinhOf,
} from './_shared';

type Rec = Record<string, unknown>;

const LINK = 'https://www.tuviminhbao.com/mcp';

const schema = {
  ngay_duong: z.string().describe('Ngày sinh dương lịch YYYY-MM-DD'),
  gio_sinh: z.union([z.number(), z.string()]).describe('Giờ sinh: số 0–23 hoặc tên giờ chi'),
  gioi_tinh: z.enum(['nam', 'nu']),
  am_lich: z.boolean().optional().describe('true nếu ngay_duong là ngày ÂM lịch'),
  nam_xem: z.number().int().min(1930).max(2200).describe('Năm dương lịch muốn xem vận hạn, ví dụ 2026'),
  thang: z.number().int().min(1).max(12).optional().describe('(Tùy chọn) Tháng dương lịch 1–12 → trả thêm hạn THÁNG (nguyệt hạn)'),
  ngay: z.number().int().min(1).max(31).optional().describe('(Tùy chọn) Ngày dương lịch 1–31 (cần kèm thang) → trả thêm hạn NGÀY (nhật hạn)'),
};

function cungInfo(palaces: Rec[], idx: number): Rec | null {
  const p = palaces[idx];
  if (!p) return null;
  return {
    cung: p.cungName ?? null,
    dia_chi: p.diaChi ?? null,
    chinh_tinh: majorStarsOf(p),
    phu_tinh: minorStarsOf(p),
    tam_phuong_tu_chinh: tuChinhOf(p), // sao hội chiếu vào cung hạn
  };
}

function comboToBlock(h: ComboHit): Rec {
  return {
    ten: h.ten,
    loai: h.loai, // tot | xau | trung
    tom_tat: h.tomTat,
    sao: h.sao,
    tang: h.layers,        // các tầng vận góp sao
    dong_cung: h.dongCung ? h.dongCungAt : null,
    dieu_kien: h.dieuKien || null, // điều kiện natal còn lại (LLM tự xét khớp)
  };
}

export const vanHanTool: McpTool = {
  name: 'van_han',
  description:
    'Tra vận hạn của một lá số cho một NĂM dương lịch (nam_xem), và tùy chọn cả một THÁNG (thêm tham số thang) hoặc một NGÀY cụ thể (thêm thang + ngay). Trả về: tuổi mụ, can chi năm xem, lưu Thái Tuế, lưu đại vận, tiểu hạn, lưu tứ hóa, đại vận hiện tại + điểm, blocks (tổ hợp sao chéo tầng); nếu có thang → thêm hạn tháng (nguyet_han — LƯU Ý một tháng dương lịch thường bị 1 tháng âm khác cắt ngang ở giữa, khi đó trường trả về mảng "doan" gồm 2 đoạn hạn khác nhau kèm khoảng ngày dương + cờ "dang_dien_ra" cho đoạn đang áp dụng ngay lúc hỏi, PHẢI đọc đúng đoạn phù hợp thay vì gộp chung); nếu có thang+ngay → thêm hạn ngày (nhat_han, tính theo đúng ngày âm lịch của ngày đó). LUÔN dùng tool này khi người dùng hỏi về một năm/tháng/ngày cụ thể ("năm nay", "tháng 3/2027", "ngày 10/2/2027…") thay vì tự suy. Diễn giải dựa trên dữ liệu, không tự tính lại cung/sao/hóa.',
  schema,

  quota: async (args, info, key) => {
    if (info.tier === 'master') return null;
    const nam = Number(args.nam_xem);
    const cur = currentNamXem();
    if (nam > cur) {
      const allow = info.future_years || 0;
      if (nam - cur > allow) {
        return allow <= 0
          ? `Key miễn phí chỉ xem được vận hạn năm hiện tại (${cur}) trở về quá khứ. Muốn xem năm tương lai (${nam}), nâng cấp tại ${LINK}.`
          : `Key của bạn chỉ xem tới ${cur + allow}. Năm ${nam} vượt quá — nâng cấp tại ${LINK}.`;
      }
      return null;
    }
    if (nam < cur) {
      if (info.backtest_years === -1) return null; // vô hạn
      const used = await distinctVanHanYears(key);
      if (used == null) return 'Chưa kiểm được hạn mức lúc này, vui lòng thử lại sau ít phút.';
      if (!used.has(nam) && used.size >= (info.backtest_years || 0)) {
        return `Key miễn phí chỉ tra được ${info.backtest_years} năm quá khứ khác nhau (bạn đã dùng: ${Array.from(used).sort().join(', ')}). Nâng cấp để tra không giới hạn tại ${LINK}.`;
      }
      return null;
    }
    return null; // nam === cur: năm hiện tại, cho xem
  },

  run: (args) => {
    const ngay = parseNgay(String(args.ngay_duong));
    if (!ngay) return { error: 'ngay_duong phải theo định dạng YYYY-MM-DD.' };
    const hourBranch = parseGioSinh(args.gio_sinh);
    if (hourBranch < 0) return { error: 'gio_sinh không hợp lệ (0–23 hoặc tên giờ chi).' };
    const gender = args.gioi_tinh === 'nu' ? 'nu' : 'nam';
    const nam = Number(args.nam_xem);

    const birth: BirthParams = {
      day: ngay.day, month: ngay.month, year: ngay.year,
      hourBranch, gender, isLunar: !!args.am_lich,
    };
    const r = computeLaso(birth, nam);
    if (!r.ok || !r.ls) return { error: r.error || 'Không lập được lá số.' };
    const ls = r.ls as Rec;
    const palaces = (ls.palaces as Rec[]) || [];

    const chiNamXem = String(ls.chiNamXem || yearChi(nam));
    const canNamXem = yearCan(nam);

    // A.1 — lưu Thái Tuế: cung mang địa chi năm xem.
    const thaiTuePalace = palaces.find((p) => p.diaChi === chiNamXem) || null;

    // A.2 / A.3 — engine đã tính cho tuoiXem của năm xem.
    const luuDaiVanPalace = palaces[ls.luuNienDaiHanIdx as number] || null;
    const tieuHanPalace = palaces[ls.tieuHanIdx as number] || null;

    // A.4 — lưu tứ hóa theo can năm xem, tìm cung natal của từng sao.
    const { TU_HOA } = loadMcpEngine();
    // Khớp can NFC-an toàn (canNamXem là hằng số của mình, key TU_HOA từ engine).
    const hoaMap = TU_HOA[canNamXem]
      || Object.entries(TU_HOA).find(([k]) => normVi(k) === normVi(canNamXem))?.[1];
    const findPalaceOf = (starName: string): Rec | null =>
      palaces.find((p) =>
        [...((p.majorStars as Rec[]) || []), ...((p.stars as Rec[]) || [])].some(
          (s) => String(s?.ten || '') === starName,
        ),
      ) || null;
    const luuTuHoa = hoaMap
      ? (['Lộc', 'Quyền', 'Khoa', 'Kỵ'] as const).map((h) => {
          const sao = hoaMap[h];
          const p = findPalaceOf(sao);
          return { hoa: h, sao, cung: p ? String(p.cungName || '') : null, dia_chi: p ? String(p.diaChi || '') : null };
        })
      : [];

    // Đại vận hiện tại + điểm.
    const dvHT = ls.daiVanHienTai as Rec | undefined;
    const dvPalace = dvHT ? palaces[dvHT.cungIdx as number] : undefined;
    const daiVanHienTai = dvHT
      ? {
          cung: dvPalace?.cungName ?? null,
          dia_chi: dvHT.diaChi ?? null,
          tuoi_tu: dvHT.tuoiStart ?? null,
          tuoi_den: dvHT.tuoiEnd ?? null,
          diem: (dvHT.scoring as Rec)?.tong ?? null,
          flag: (dvHT.scoring as Rec)?.flag ?? null,
        }
      : null;

    // blocks — tổ hợp sao chéo tầng (deterministic). Tầng: đại vận + lưu đại vận
    // + tiểu hạn + lưu Thái Tuế (mức NĂM, giàu hơn để bắt cách cục vận).
    const layers: LayerCung[] = [
      { label: 'đại vận', palace: dvPalace ?? null },
      { label: 'lưu đại vận', palace: luuDaiVanPalace },
      { label: 'tiểu hạn', palace: tieuHanPalace },
      { label: 'lưu thái tuế', palace: thaiTuePalace },
    ];
    const blocks = matchVanHanCombos(layers).map(comboToBlock);

    // Hạn THÁNG (nguyệt hạn) + NGÀY (nhật hạn) — tùy chọn. Một tháng dương lịch
    // thường bị 1 tháng âm khác "cắt ngang" ở giữa (tháng âm ~29,5 ngày, không
    // khớp ranh giới tháng dương) → nguyệt hạn có thể có 2 ĐOẠN khác nhau trong
    // cùng một tháng dương (bug cũ: neo cứng ngày 1 để suy tháng âm, có thể
    // chọn nhầm đoạn đã hết hạn). Nhật hạn LUÔN tính từ ĐÚNG ngày được hỏi qua
    // `resolveNhatHanIdx` — KHÔNG suy từ đoạn nguyệt hạn — để không kế thừa sai
    // số đó. Cả hai dùng CHUNG nguồn với rail chat: lib/engine/van-ngay.ts.
    let nguyet_han: Rec | undefined;
    let nhat_han: Rec | undefined;
    const thangNum = args.thang != null ? Number(args.thang) : null;
    const ngayNum = args.ngay != null ? Number(args.ngay) : null;
    if (thangNum && thangNum >= 1 && thangNum <= 12) {
      const segRs = resolveNguyetHanSegments(ls, thangNum, nam);
      if (segRs.ok) {
        nguyet_han = segRs.segments.length === 1
          ? {
              thang: thangNum,
              thang_al: segRs.segments[0]!.thangAL,
              ...(segRs.segments[0]!.isLeap ? { thang_al_nhuan: true } : {}),
              ...(cungInfo(palaces, segRs.segments[0]!.nguyetHanIdx) || {}),
            }
          : {
              thang: thangNum,
              ghi_chu: 'Tháng dương lịch này cắt ngang 2 tháng âm lịch — mỗi đoạn ngày có một hạn tháng khác nhau, xem mảng "doan".',
              doan: segRs.segments.map((s) => ({
                tu_ngay: s.tuNgay,
                den_ngay: s.denNgay,
                thang_al: s.thangAL,
                ...(s.isLeap ? { thang_al_nhuan: true } : {}),
                ...(s.isCurrent ? { dang_dien_ra: true } : {}),
                ...(cungInfo(palaces, s.nguyetHanIdx) || {}),
              })),
            };
      } else {
        nguyet_han = { thang: thangNum, note: segRs.error };
      }

      if (ngayNum && ngayNum >= 1 && ngayNum <= 31) {
        const dayRs = resolveNhatHanIdx(ls, ngayNum, thangNum, nam);
        nhat_han = dayRs.ok
          ? { ngay: ngayNum, ngay_al: dayRs.ngayAL, thang_al: dayRs.thangAL, ...(cungInfo(palaces, dayRs.nhatHanIdx) || {}) }
          : { ngay: ngayNum, note: dayRs.error };
      }
    }

    return {
      input: { ngay_duong: args.ngay_duong, gioi_tinh: gender, am_lich: !!args.am_lich, nam_xem: nam, thang: thangNum ?? undefined, ngay: ngayNum ?? undefined },
      tuoi_mu: ls.tuoiXem ?? (nam - ngay.year + 1),
      can_chi_nam_xem: `${canNamXem} ${chiNamXem}`,
      luu_thai_tue: thaiTuePalace
        ? { cung: thaiTuePalace.cungName ?? null, dia_chi: chiNamXem, sao: allStarNames(thaiTuePalace) }
        : { cung: null, dia_chi: chiNamXem, sao: [] },
      luu_dai_van: cungInfo(palaces, ls.luuNienDaiHanIdx as number),
      tieu_han: cungInfo(palaces, ls.tieuHanIdx as number),
      luu_tu_hoa: luuTuHoa,
      dai_van_hien_tai: daiVanHienTai,
      nguyet_han,
      nhat_han,
      blocks,
      note: blocks.length
        ? undefined
        : 'Không có tổ hợp sao chéo tầng nổi bật cho năm này — phần luận do AI của bạn diễn giải từ dữ liệu cung/sao ở trên.',
    };
  },
};
