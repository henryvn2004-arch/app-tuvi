/**
 * lib/liuren/ke.ts — lập khóa Đại Lục Nhâm (大六壬) cho một thời điểm.
 *
 * VÌ SAO CHẠY Ở SERVER (giống Kỳ Môn, khác các tool free khác):
 * Lập khóa cần nguyệt tướng THẬT (theo trung khí, tức cần ephemeris), rồi mới
 * "nguyệt tướng gia thời" để quay thiên bàn, an 12 thiên tướng theo vị Quý Nhân
 * ngày/đêm, dựng tứ khóa, rồi chạy 9 tông môn thủ truyền để ra tam truyền. Chép
 * tay sang vanilla JS thì khóa VẪN ra, chỉ là ra sai — không cách nào phát hiện.
 *
 * 🔴 ĐÂY LÀ BẢN THAY THẾ CHO CÔNG THỨC ĐOÁN.
 * `public/tools-shared/luc-nham.js` cũ quay 12 thiên tướng bằng
 * `startOffset = (canNgay * 2) % 12` — một công thức KHÔNG khớp cổ pháp nào và
 * CLAUDE.md đã ghi là chưa verify được. Cổ pháp thật: vị Quý Nhân do CAN NGÀY
 * và ngày/đêm quyết định, rồi 11 tướng còn lại đi thuận hay nghịch tùy Quý Nhân
 * rơi vào cung trước hay sau trục Mão–Dậu. Bản cũ không có khái niệm đó.
 *
 * ✅ ĐÃ ĐỐI CHỨNG vị Quý Nhân với ca quyết 贵人歌 trên 1.464 quẻ: khớp tuyệt đối
 * ở Giáp Mậu Canh (Sửu/Mùi) · Ất Kỷ (Tý/Thân) · Bính Đinh (Hợi/Dậu) · Tân
 * (Ngọ/Dần). Riêng Nhâm Quý mingyu cho Tỵ/Mão trong khi một dị bản phổ biến ghi
 * Mão/Tỵ — GIỮ THEO MINGYU vì chỉ cách đó mới làm cả hai vòng Quý Nhân LIỀN
 * MẠCH quanh bàn (ngày: Sửu→Tý→Hợi→…→Ngọ→Tỵ; đêm: Mùi→Thân→Dậu→…→Dần→Mão);
 * dị bản kia làm gãy vòng đúng ở Nhâm Quý. Đừng "sửa" lại mà không đọc chú
 * thích này.
 *
 * ⚠️ VỨT phần văn bản kiểm chứng của mingyu (`focusEvidence`, `timingEvidence`,
 * `evidenceAnalysis`, `*Facts`, các `note`/`summary` tiếng Hán): 58 KB → ~3 KB.
 * Các câu `note` là CÂU SINH THEO MẪU, nên file này DỰNG LẠI bằng tiếng Việt từ
 * trường cấu trúc, chứ không dịch câu — dịch câu sinh sẵn thì vừa dài vừa dễ sai.
 */
import { generateLiuren } from 'mingyu-core/divination/liuren';
import { TimeManager } from 'mingyu-core/calendar';
import {
  THIEN_TUONG, VUONG_SUY, HANH, KHOA_TEN, TRUYEN_TEN, DANG_TRUYEN,
  docQuanHe, docKhoaThe, docPhap, docThanSat, canChiViet, phienAm, type Muc,
} from './terms';

/** ⚠️ BẮT BUỘC — mingyu mặc định +480 (Bắc Kinh). Xem `lib/qimen/board.ts`. */
TimeManager.setTimezoneOffsetMinutesOverride(420);

export interface KhoaLucNham {
  khi: string;
  canChi: { nam: string; thang: string; ngay: string; gio: string };
  truDem: string;
  nguyetTuong: string;
  chiemThoi: string;
  quyNhan: { thienBan: string; diaBan: string };
  tuanKhong: string[];
  canNgayKyCung: string;
  phap: { ten: string; nghia: string };
  dangTruyen: { ten: string; nghia: string };
  thienBan: { thien: string; dia: string; tuong: string; muc: Muc; nghia: string }[];
  tuKhoa: { ten: string; tren: string; duoi: string; tuong: string; muc: Muc; quanHe: string }[];
  tamTruyen: {
    ten: string; chi: string; tuong: string; muc: Muc; hanh: string;
    vuongSuy: string; tuanKhong: boolean; quanHe: string; quanHeCanNgay: string;
  }[];
  khoaThe: string[];
  thanSat: { ten: string; muc: Muc; nghia: string }[];
}

function tuong(g: string) {
  const t = THIEN_TUONG[g];
  return t || { ten: phienAm(g), muc: 'binh' as Muc, nghia: '' };
}

export function lapKhoa(khi?: Date): KhoaLucNham {
  const t = khi || new Date();
  const r = generateLiuren(t) as Record<string, any>;

  const phap = docPhap(r.transmissionRule);
  const dt = DANG_TRUYEN[r.transmissionPattern] || {
    ten: phienAm(r.transmissionPattern), nghia: '',
  };

  return {
    khi: t.toISOString(),
    canChi: {
      nam: canChiViet(r.ganzhi.year),
      thang: canChiViet(r.ganzhi.month),
      ngay: canChiViet(r.ganzhi.day),
      gio: canChiViet(r.ganzhi.hour),
    },
    // 昼占 / 夜占 — quyết định dùng Quý Nhân ban ngày hay ban đêm.
    truDem: r.dayNight === '昼占' ? 'Trú chiêm (ban ngày)' : 'Dạ chiêm (ban đêm)',
    nguyetTuong: canChiViet(r.monthLeader),
    chiemThoi: canChiViet(r.divinationBranch),
    quyNhan: {
      thienBan: canChiViet(r.noblemanBranch),
      diaBan: canChiViet(r.noblemanGroundBranch),
    },
    tuanKhong: (r.xunKong || []).map((c: string) => canChiViet(c)),
    canNgayKyCung: canChiViet(r.dayStemResidence),
    phap,
    dangTruyen: dt,
    thienBan: (r.heavenlyPlate || []).map((x: any) => {
      const g = tuong(x.god);
      return { thien: canChiViet(x.branch), dia: canChiViet(x.under), tuong: g.ten, muc: g.muc, nghia: g.nghia };
    }),
    tuKhoa: (r.fourLessons || []).map((x: any) => {
      const g = tuong(x.god);
      return {
        ten: KHOA_TEN[x.name] || phienAm(x.name),
        tren: canChiViet(x.upper),
        duoi: canChiViet(x.lower),
        tuong: g.ten,
        muc: g.muc,
        quanHe: docQuanHe(x.relation),
      };
    }),
    tamTruyen: (r.threeTransmissions || []).map((x: any) => {
      const g = tuong(x.god);
      return {
        ten: TRUYEN_TEN[x.stage] || phienAm(x.stage),
        chi: canChiViet(x.branch),
        tuong: g.ten,
        muc: g.muc,
        hanh: HANH[x.wuxing] || phienAm(x.wuxing),
        vuongSuy: VUONG_SUY[x.seasonState] || phienAm(x.seasonState),
        tuanKhong: !!x.isVoid,
        quanHe: docQuanHe(x.relation),
        quanHeCanNgay: docQuanHe(x.dayRelation),
      };
    }),
    khoaThe: (r.patternTags || []).map((x: string) => docKhoaThe(x)),
    thanSat: (r.shenShaFacts || []).map((x: any) => docThanSat(x.name)),
  };
}

/** Ngữ cảnh PHẲNG cho rail — `extractGenericContext` bỏ qua mọi giá trị object. */
export function railData(k: KhoaLucNham, cauHoi?: string) {
  return {
    ...(cauHoi ? { cauHoi } : {}),
    canChiNgay: k.canChi.ngay,
    canChiGio: k.canChi.gio,
    canChiThang: k.canChi.thang,
    truDem: k.truDem,
    nguyetTuongGiaThoi: `Nguyệt tướng ${k.nguyetTuong} gia lên giờ chiêm ${k.chiemThoi}`,
    quyNhan: `${k.quyNhan.thienBan} (thiên bàn) đóng trên ${k.quyNhan.diaBan} (địa bàn)`,
    tuanKhong: k.tuanKhong.join(', '),
    canNgayKyCung: k.canNgayKyCung,
    phapThuTruyen: `${k.phap.ten} — ${k.phap.nghia}`,
    dangTruyen: `${k.dangTruyen.ten} — ${k.dangTruyen.nghia}`,
    tuKhoa: k.tuKhoa
      .map((x) => `${x.ten}: trên ${x.tren} / dưới ${x.duoi}, thiên tướng ${x.tuong} (${x.muc === 'cat' ? 'cát' : x.muc === 'hung' ? 'hung' : 'bình'}), ${x.quanHe}`)
      .join('\n'),
    tamTruyen: k.tamTruyen
      .map((x) => `${x.ten}: ${x.chi} — ${x.tuong}, hành ${x.hanh}, ${x.vuongSuy}${x.tuanKhong ? ', RƠI TUẦN KHÔNG' : ''}; với can ngày ${x.quanHeCanNgay}`)
      .join('\n'),
    khoaThe: k.khoaThe.join(', '),
    thanSat: k.thanSat.map((s) => `${s.ten} (${s.nghia})`).join(', '),
  };
}
