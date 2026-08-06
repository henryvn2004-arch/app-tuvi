// lib/engine/nhan-mach.ts
// ============================================================
// SỔ NHÂN MẠCH (T3 — "gói Kinh doanh")
//
// Khác `nguoi-khac` (T1) ở đúng một chỗ, và đó là cả giá trị: T1 đọc MỘT người,
// tool này đọc **cả nhóm cùng lúc** — đội của bạn, hoặc danh sách khách. Câu
// hỏi nó trả lời không phải "người này ra sao" mà:
//   • đội này thiếu kiểu người nào (lỗ hổng không ai bù);
//   • hai ai giao cùng loại việc là giẫm chân nhau;
//   • trong tuần này nên gặp ai trước.
//
// 🔑 KHÔNG THÊM MỘT LUẬT CỔ PHÁP NÀO. Bốn kiểu + toạ độ dùng `phanKieu`; luật
// bù âm–dương dùng `BU` của `cong-so.ts`; bảng vai ↔ cung dùng `QUAN_HE` của
// `nguoi-khac.ts` (cấp trên → Phụ Mẫu · ngang hàng → Huynh Đệ · dưới quyền và
// bạn nghề → Nô Bộc). Chép bản thứ hai thì hai bên trôi khỏi nhau.
//
// ⚠️ RANH GIỚI ĐẠO ĐỨC — ràng buộc DỮ LIỆU, không phải lời dặn. Ở đây có tới
// vài người vắng mặt cùng lúc, nên rủi ro lớn hơn T1 chứ không nhỏ hơn:
//   • dùng lại nguyên `KHONG_DOC` — không Tật Ách, Tài Bạch, Phu Thê, Tử Tức,
//     Điền Trạch của bất kỳ ai trong sổ;
//   • KHÔNG xếp hạng người (không có "ai giỏi nhất", không điểm tổng mỗi người)
//     — một bảng xếp hạng đồng nghiệp là thứ tệ nhất tool này có thể sinh ra;
//   • thứ tự tiếp cận chỉ dựa VẬN NĂM của từng người và nói thẳng ra là vậy,
//     không phải "ai quan trọng hơn".
// ============================================================

import type { Laso } from './laso';
import { currentNamXem } from './namxem';
import {
  KIEU,
  KIEU_IDS,
  type KieuDef,
  type KieuId,
  BU,
  phanKieu,
  palaceByName,
  majorsOrBorrow,
  starLabel,
  kieuCuaCung,
} from './cong-so';
import { QUAN_HE, type QuanHeDef, type QuanHeId, resolveQuanHe, KHONG_DOC } from './nguoi-khac';

type Rec = Record<string, unknown>;

/** Trần số người trong một lượt. Trên 8 người thì phần "cặp" bùng nổ (28 cặp)
 *  và bản luận thành danh bạ chứ không còn đọc được; dưới 2 người thì không có
 *  gì để ghép. Trần này cũng là trần chi phí một lượt LLM. */
export const MIN_NGUOI = 2;
export const MAX_NGUOI = 8;

export interface NguoiVao {
  ten: string;
  vai: QuanHeId;
  ls: Laso;
  gioiTinh: 'nam' | 'nu';
}

export interface ThanhVien {
  ten: string;
  vai: QuanHeDef;
  gioiTinh: 'nam' | 'nu';
  kieu: KieuDef;
  kieuPhu: KieuDef | null;
  lai: boolean;
  toaDo: { x: number; y: number };
  chinhTinhMenh: string[];
  chinhTinhQuanLoc: string[];
  muonMenh: boolean;
  than: string;
  vanNam: { diem: number | null; huong: string | null } | null;
  /** Chỉ có khi người xem đưa lá số của chính mình. */
  voiBan: {
    cung: string;
    sao: string[];
    kieuTen: string;
    cungTinh: boolean;
  } | null;
}

export interface PhanBoKieu {
  kieu: KieuId;
  ten: string;
  soNguoi: number;
  ten_nguoi: string[];
}

export interface CapNguoi {
  a: string;
  b: string;
  loai: 'giam-chan' | 'bu-nhau';
  vi: string;
}

export interface NhanMachProfile {
  namXem: number;
  soNguoi: number;
  /** Kiểu của chính người xem — chỉ có khi họ đưa lá số mình. */
  ban: { kieu: KieuDef; toaDo: { x: number; y: number } } | null;
  thanhVien: ThanhVien[];
  phanBo: PhanBoKieu[];
  /** Kiểu KHÔNG ai trong nhóm có — chỗ trống thật sự của đội. */
  thieuKieu: KieuDef[];
  /** Kiểu chiếm quá nửa nhóm — đội lệch, mạnh một chiều. */
  duaKieu: KieuDef | null;
  /** Kiểu nên tìm thêm, theo luật bù âm–dương của kiểu đang dư. */
  nenTimThem: KieuDef | null;
  cap: CapNguoi[];
  /** Thứ tự gợi ý tiếp cận — theo VẬN NĂM của từng người, không phải mức quan trọng. */
  thuTuTiepCan: { ten: string; diem: number | null; huong: string | null }[];
}

const HUONG_VI: Record<string, string> = {
  up: 'đang lên',
  down: 'đang xuống',
  flat: 'đi ngang',
};

function thanCung(ls: Laso): string {
  const p = ((ls.palaces as Rec[]) || []).find((x) => x && x.isThan === true);
  return String(p?.cungName || '');
}

/** Làm sạch tên hiển thị. Tên do người dùng gõ và đi thẳng vào prompt lẫn giao
 *  diện — bóc ký tự bẻ prompt tại NGUỒN thay vì trông vào từng nơi tiêu thụ. */
export function cleanTen(v: unknown, i: number): string {
  const s = String(v == null ? '' : v)
    .replace(/[\r\n`{}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return s || `Người ${i + 1}`;
}

/**
 * Đọc cả nhóm.
 *
 * `lsBan` (lá số người xem) TUỲ CHỌN — thiếu thì mỗi người vẫn đọc được, chỉ
 * mất phần "người này trong lá số của bạn".
 */
export function computeNhanMach(
  nguoi: NguoiVao[],
  lsBan?: Laso | null,
  namXem?: number,
): NhanMachProfile {
  const list = nguoi.slice(0, MAX_NGUOI);
  const nam =
    namXem ??
    (typeof list[0]?.ls?.namXem === 'number' ? (list[0].ls.namXem as number) : currentNamXem());

  const thanhVien: ThanhVien[] = list.map((n, i) => {
    const phan = phanKieu(n.ls);
    const tvs = (n.ls.tieuVanScores as Rec[]) || [];
    const tvNam = tvs.find((t) => t.nam === nam);
    const vai = QUAN_HE[resolveQuanHe(n.vai)];

    let voiBan: ThanhVien['voiBan'] = null;
    if (lsBan) {
      const k = kieuCuaCung(lsBan, vai.cungCuaBan);
      const kBan = phanKieu(lsBan).kieu;
      voiBan = {
        cung: vai.cungCuaBan,
        sao: k.sao.map(starLabel),
        kieuTen: k.kieu ? KIEU[k.kieu].ten : '—',
        cungTinh: KIEU[phan.kieu].amDuong === KIEU[kBan].amDuong,
      };
    }

    return {
      ten: cleanTen(n.ten, i),
      vai,
      gioiTinh: n.gioiTinh,
      kieu: KIEU[phan.kieu],
      kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
      lai: phan.lai,
      toaDo: { x: phan.xNorm, y: phan.yNorm },
      chinhTinhMenh: phan.saoMenh,
      chinhTinhQuanLoc: phan.saoQuan,
      muonMenh: phan.muonMenh,
      than: thanCung(n.ls),
      vanNam: tvNam
        ? {
            diem: typeof tvNam.mainScore === 'number' ? (tvNam.mainScore as number) : null,
            huong: HUONG_VI[String(tvNam.direction || '')] || null,
          }
        : null,
      voiBan,
    };
  });

  // ── Phân bố + lỗ hổng đội
  const phanBo: PhanBoKieu[] = KIEU_IDS.map((k) => {
    const ten_nguoi = thanhVien.filter((t) => t.kieu.id === k).map((t) => t.ten);
    return { kieu: k, ten: KIEU[k].ten, soNguoi: ten_nguoi.length, ten_nguoi };
  });
  const thieuKieu = phanBo.filter((p) => p.soNguoi === 0).map((p) => KIEU[p.kieu]);
  const duaP = phanBo.find((p) => p.soNguoi * 2 > thanhVien.length && thanhVien.length >= 3) || null;
  const duaKieu = duaP ? KIEU[duaP.kieu] : null;
  // Kiểu nên tìm thêm = kiểu bù cho kiểu đang dư; không có kiểu dư thì lấy kiểu
  // đầu tiên đang trống. Không có gì trống và cũng không lệch → null, và trang
  // nói thẳng là đội đã đủ mặt (đừng bịa ra một lời khuyên cho có).
  const nenTimThem = duaKieu ? KIEU[BU[duaKieu.id]] : thieuKieu[0] || null;

  // ── Cặp
  // CHỈ hai loại có căn cứ tra được, không xếp hạng ai với ai:
  //   • cùng KIỂU  → nghĩ giống nhau ⇒ giao cùng loại việc là giẫm chân;
  //   • khác kiểu VÀ khác tính âm/dương → bù cả trục ⇒ ghép cặp được.
  // Cặp khác kiểu nhưng CÙNG tính (vd Khai sáng + Lãnh đạo) cố ý KHÔNG nêu:
  // không có gì để nói mà vẫn chiếm chỗ.
  const cap: CapNguoi[] = [];
  for (let i = 0; i < thanhVien.length; i++) {
    for (let j = i + 1; j < thanhVien.length; j++) {
      const a = thanhVien[i];
      const b = thanhVien[j];
      if (a.kieu.id === b.kieu.id) {
        cap.push({
          a: a.ten,
          b: b.ten,
          loai: 'giam-chan',
          vi: `Cùng kiểu ${a.kieu.ten} — nghĩ giống nhau nên hợp lúc cần dồn sức, nhưng giao cùng một loại việc là giẫm chân và tranh phần.`,
        });
      } else if (a.kieu.amDuong !== b.kieu.amDuong) {
        cap.push({
          a: a.ten,
          b: b.ten,
          loai: 'bu-nhau',
          vi: `${a.kieu.ten} và ${b.kieu.ten} khác tính âm/dương — một bên xông, một bên giữ. Ghép được, miễn là chia rõ ai quyết phần nào.`,
        });
      }
    }
  }

  // ── Thứ tự tiếp cận: theo vận năm của CHÍNH họ. Người chưa chấm được vận
  // xuống cuối chứ không đoán bừa một con số.
  const thuTuTiepCan = thanhVien
    .map((t) => ({ ten: t.ten, diem: t.vanNam?.diem ?? null, huong: t.vanNam?.huong ?? null }))
    .sort((x, y) => (y.diem ?? -1) - (x.diem ?? -1));

  return {
    namXem: nam,
    soNguoi: thanhVien.length,
    ban: lsBan
      ? (() => {
          const p = phanKieu(lsBan);
          return { kieu: KIEU[p.kieu], toaDo: { x: p.xNorm, y: p.yNorm } };
        })()
      : null,
    thanhVien,
    phanBo,
    thieuKieu,
    duaKieu,
    nenTimThem,
    cap,
    thuTuTiepCan,
  };
}

/** Cung tool này KHÔNG đọc của bất kỳ ai trong sổ — dùng chung một danh sách
 *  với T1 để hai bên không trôi khỏi nhau. Test đối chiếu thẳng vào đây. */
export const CUNG_KHONG_DOC = KHONG_DOC;

/** Danh sách vai dùng trên trang. Cùng bảng `QUAN_HE`, chỉ sắp lại cho hợp bối
 *  cảnh công việc (4 vai đầu) rồi tới các vai còn lại. */
export const VAI_UU_TIEN: QuanHeId[] = [
  'sep',
  'dong-nghiep',
  'cap-duoi',
  'doi-tac',
  'ban-be',
  'cha-me',
  'con-cai',
  'ban-doi',
];

/**
 * Dữ liệu PHẲNG gửi rail.
 *
 * ⚠️ `extractGenericContext` bỏ IM LẶNG mọi giá trị là object.
 */
export function railData(p: NhanMachProfile): Record<string, string | number | boolean> {
  const d: Record<string, string | number | boolean> = {
    soNguoiTrongSo: p.soNguoi,
    danhSachNguoi: p.thanhVien
      .map(
        (t) =>
          `${t.ten} (${t.vai.label}) — kiểu ${t.kieu.ten}${t.lai && t.kieuPhu ? ` pha ${t.kieuPhu.ten}` : ''}` +
          (t.vanNam?.diem == null ? '' : `, vận năm ${t.vanNam.diem}/10`) +
          (t.vanNam?.huong ? ` (${t.vanNam.huong})` : ''),
      )
      .join(' | '),
    phanBoKieu: p.phanBo
      .filter((x) => x.soNguoi > 0)
      .map((x) => `${x.ten}: ${x.soNguoi} (${x.ten_nguoi.join(', ')})`)
      .join(' | '),
  };
  if (p.ban) d.kieuCuaBan = p.ban.kieu.ten;
  if (p.thieuKieu.length) {
    d.kieuDoiDangThieu = p.thieuKieu.map((k) => `${k.ten} — ${k.motCau}`).join(' | ');
  }
  if (p.duaKieu) d.kieuDangDu = `${p.duaKieu.ten} (chiếm quá nửa nhóm)`;
  if (p.nenTimThem) d.kieuNenTimThem = `${p.nenTimThem.ten} — ${p.nenTimThem.motCau}`;
  const giam = p.cap.filter((c) => c.loai === 'giam-chan');
  const bu = p.cap.filter((c) => c.loai === 'bu-nhau');
  if (giam.length) d.capDeGiamChan = giam.map((c) => `${c.a} ↔ ${c.b}`).join(' | ');
  if (bu.length) d.capDeBuNhau = bu.slice(0, 6).map((c) => `${c.a} ↔ ${c.b}`).join(' | ');
  d.thuTuTiepCan = p.thuTuTiepCan
    .map((t) => `${t.ten}${t.diem == null ? '' : ` (${t.diem}/10)`}`)
    .join(' → ');
  const coBan = p.thanhVien.filter((t) => t.voiBan);
  if (coBan.length) {
    d.nguoiNayTrongLaSoBan = coBan
      .map(
        (t) =>
          `${t.ten}: cung ${t.voiBan!.cung} của bạn — ${t.voiBan!.sao.join(', ') || 'không chính tinh'}` +
          `, ${t.voiBan!.cungTinh ? 'cùng tính âm/dương (dễ va)' : 'khác tính âm/dương (dễ bù)'}`,
      )
      .join(' | ');
  }
  return d;
}
