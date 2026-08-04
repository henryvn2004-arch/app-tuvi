/**
 * lib/bazi/phan-tich.ts — TẦNG PHÂN TÍCH bát tự, chồng lên tứ trụ của repo.
 *
 * 🔑 CỐ Ý KHÔNG TRẢ VỀ TỨ TRỤ LÀM DỮ LIỆU HIỂN THỊ.
 * Site đã có engine bát tự riêng (`public/tubinh-ansao-engine.js`, dùng bởi
 * `lib/engine/tubinh.ts` cho tool Bát Tự và bởi trang Tứ Trụ). Đã đối chiếu 576
 * lá (1962–2006): tứ trụ khớp 100% cả 4 trụ. Nhưng "khớp hôm nay" không phải
 * bảo đảm vĩnh viễn, nên file này:
 *   · lấy phân tích của mingyu,
 *   · kèm `tuTruCheck` để phía gọi TỰ ĐỐI CHIẾU với tứ trụ của chính nó,
 *   · và phía gọi phải BỎ phần phân tích nếu lệch (fail-closed).
 * Nhờ vậy hai engine không bao giờ nói hai điều khác nhau trên cùng màn hình —
 * ràng buộc được ÉP LÚC CHẠY chứ không phải một giả định trong đầu.
 *
 * ⚠️ VỨT `luckInfo` (34,7 KB — đại vận + lưu niên, repo đã có) và mọi
 * `*Facts`/`evidenceAnalysis`: 84,6 KB → ~6 KB.
 */
import { baziCalculator } from 'mingyu-core/bazi';
import { TimeManager } from 'mingyu-core/calendar';
import {
  docThapThan, docTruongSinh, docThanSat, docCachCuc, canChiViet,
  VUONG_SUY, VUONG_TUONG, HANH, AM_DUONG, type Muc,
} from './terms';

/** ⚠️ BẮT BUỘC — mingyu mặc định +480 (Bắc Kinh). Xem `lib/qimen/board.ts`. */
TimeManager.setTimezoneOffsetMinutesOverride(420);

const TRU = ['year', 'month', 'day', 'hour'] as const;
const TRU_VI = ['Năm', 'Tháng', 'Ngày', 'Giờ'] as const;

export interface PhanTichBaTu {
  /** Để phía gọi đối chiếu với tứ trụ của CHÍNH NÓ. Lệch thì bỏ cả phân tích. */
  tuTruCheck: string[];
  nhatChu: { can: string; hanh: string; amDuong: string };
  vuongSuy: { ten: string; nghia: string } | null;
  cachCuc: string;
  thapThan: { tru: string; ten: string; nghia: string }[];
  tangCanThapThan: { tru: string; items: { ten: string; nghia: string }[] }[];
  tuToa: { tru: string; ten: string; nghia: string }[];
  khongVong: { tru: string; chi: string }[];
  nguyetLenh: string;
  vuongTuongNguHanh: { hanh: string; trangThai: string }[];
  nguHanhThieu: string[];
  dungThan: { nen: string[]; ky: string[] };
  menhCung: string;
  thaiNguyen: string;
  thaiTuc: string;
  thanSatChinh: { ten: string; muc: Muc; nghia: string; tru: string }[];
  thanSatPhu: { ten: string; tru: string }[];
}

export interface DauVao {
  ngay: number;
  thang: number;
  nam: number;
  gioChi: number; // 0 = Tý … 11 = Hợi
  gioiTinh: 'nam' | 'nu';
}

export function phanTich(v: DauVao): PhanTichBaTu {
  const r = baziCalculator.calculateBazi({
    year: v.nam,
    month: v.thang,
    day: v.ngay,
    timeIndex: v.gioChi,
    gender: v.gioiTinh === 'nam' ? 'male' : 'female',
    isLunar: false,
  }) as Record<string, any>;

  // Một sao có thể đóng ở nhiều trụ (Vong Thần thường có ở 3 trụ). GỘP THEO
  // TÊN rồi liệt kê các trụ — bày ba dòng trùng tên trông như lỗi dữ liệu.
  const gopChinh = new Map<string, { ten: string; muc: Muc; nghia: string; tru: string[] }>();
  const gopPhu = new Map<string, string[]>();
  TRU.forEach((k, i) => {
    for (const s of (r.shensha?.[k] || []) as string[]) {
      const d = docThanSat(s);
      if (d.chinh) {
        const cur = gopChinh.get(d.ten) || { ten: d.ten, muc: d.muc, nghia: d.nghia, tru: [] };
        cur.tru.push(TRU_VI[i]!);
        gopChinh.set(d.ten, cur);
      } else {
        gopPhu.set(d.ten, (gopPhu.get(d.ten) || []).concat(TRU_VI[i]!));
      }
    }
  });
  const MUC_UU = { cat: 0, hung: 1, binh: 2 };
  const chinh: PhanTichBaTu['thanSatChinh'] = [...gopChinh.values()]
    .map((x) => ({ ten: x.ten, muc: x.muc, nghia: x.nghia, tru: x.tru.join(', ') }))
    .sort((a, b) => MUC_UU[a.muc] - MUC_UU[b.muc]);
  const phu: PhanTichBaTu['thanSatPhu'] = [...gopPhu.entries()].map(([ten, tru]) => ({
    ten,
    tru: tru.join(', '),
  }));

  const ug = r.analysis?.usefulGod || {};
  const vs = VUONG_SUY[r.analysis?.dayMasterStrength?.status];

  return {
    tuTruCheck: TRU.map((k) => canChiViet(r.pillars?.[k]?.ganZhi || '')),
    nhatChu: {
      can: canChiViet(r.dayMaster?.gan || ''),
      hanh: HANH[r.dayMaster?.element] || '',
      amDuong: AM_DUONG[r.dayMaster?.yinYang] || '',
    },
    vuongSuy: vs || null,
    cachCuc: docCachCuc(r.analysis?.mingGe?.pattern),
    thapThan: TRU.map((k, i) => ({ tru: TRU_VI[i]!, ...docThapThan(r.tenGods?.[k]) })),
    tangCanThapThan: TRU.map((k, i) => ({
      tru: TRU_VI[i]!,
      items: ((r.hiddenTenGods?.[k] || []) as string[]).map(docThapThan),
    })),
    tuToa: TRU.map((k, i) => ({ tru: TRU_VI[i]!, ...docTruongSinh(r.ziZuo?.[k]) })),
    khongVong: TRU.map((k, i) => ({
      tru: TRU_VI[i]!,
      chi: ((r.kongWang?.[k] || []) as string[]).map((c) => canChiViet(c)).join(', '),
    })),
    nguyetLenh: canChiViet(r.monthCommander || ''),
    vuongTuongNguHanh: Object.entries(r.wuxingSeasonStatus || {}).map(([h, t]) => ({
      hanh: HANH[h] || h,
      trangThai: VUONG_TUONG[t as string] || String(t),
    })),
    nguHanhThieu: ((r.wuxingStrength?.missing || []) as string[]).map((h) => HANH[h] || h),
    dungThan: {
      nen: ((ug.favorable || []) as string[]).map((x) => docThapThan(x).ten),
      ky: ((ug.unfavorable || []) as string[]).map((x) => docThapThan(x).ten),
    },
    menhCung: canChiViet(r.mingGong || ''),
    thaiNguyen: canChiViet(r.taiYuan || ''),
    thaiTuc: canChiViet(r.taiXi || ''),
    thanSatChinh: chinh,
    thanSatPhu: phu,
  };
}

/** Ngữ cảnh PHẲNG cho rail — `extractGenericContext` bỏ qua mọi object. */
export function railData(p: PhanTichBaTu) {
  return {
    nhatChu: `${p.nhatChu.can} — hành ${p.nhatChu.hanh}, ${p.nhatChu.amDuong}`,
    vuongSuyNhatChu: p.vuongSuy ? `${p.vuongSuy.ten} — ${p.vuongSuy.nghia}` : '',
    cachCuc: p.cachCuc,
    thapThanTungTru: p.thapThan.map((x) => `${x.tru}: ${x.ten}${x.nghia ? ' (' + x.nghia + ')' : ''}`).join('\n'),
    tangCanThapThan: p.tangCanThapThan
      .map((x) => `${x.tru}: ${x.items.map((i) => i.ten).join(', ')}`)
      .join('\n'),
    tuToa: p.tuToa.map((x) => `${x.tru}: ${x.ten} (${x.nghia})`).join('; '),
    khongVong: p.khongVong.map((x) => `${x.tru}: ${x.chi}`).join('; '),
    nguyetLenhTuLenh: p.nguyetLenh,
    vuongTuongNguHanh: p.vuongTuongNguHanh.map((x) => `${x.hanh} ${x.trangThai}`).join(', '),
    nguHanhThieu: p.nguHanhThieu.join(', ') || 'không thiếu hành nào',
    dungThanNen: p.dungThan.nen.join(', '),
    dungThanKy: p.dungThan.ky.join(', '),
    menhCung: p.menhCung,
    thaiNguyen: p.thaiNguyen,
    thanSatChinh: p.thanSatChinh
      .map((s) => `${s.ten} (trụ ${s.tru}, ${s.muc === 'cat' ? 'cát' : s.muc === 'hung' ? 'hung' : 'trung tính'}) — ${s.nghia}`)
      .join('\n'),
  };
}
