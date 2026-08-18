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
  resolveVanNam,
  vanNamLine,
  LUAT_VAN_NAM,
  type VanNam,
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
  vanNam: VanNam | null;
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
  thuTuTiepCan: {
    ten: string;
    /** Điểm KHUNG đại vận chứa năm xem — KHÔNG phải điểm của năm (năm không có điểm). */
    khungDiem: number | null;
    /** cát − sát của năm; phá thế hoà khi hai người cùng mức đại vận. */
    canCan: number | null;
    moTa: string | null;
  }[];
}


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
      vanNam: resolveVanNam(n.ls, nam),
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
  //
  // 🔑 KHOÁ XẾP đổi, và đây là chỗ lỗi cắn sâu nhất trong cả 4 tool: bản cũ xếp
  // theo `tieuVanScores[].mainScore` — một đường LÀM MƯỢT nội suy giữa các mốc
  // đại vận (xem chú thích `VanNam` trong `cong-so.ts`). Tức thứ tự *nên gặp ai
  // trước* đang do một tạo tác của biểu đồ quyết định, và nó lệch tới 3,6 điểm
  // so với đại vận thật ở 8,4% lá số — đủ để đảo chỗ hai người trong danh sách.
  //
  // Nay xếp theo hai tầng CÓ THẬT, đúng thứ tự trọng số của `execTraVanHan`:
  //   1) điểm KHUNG đại vận — tầng duy nhất engine chấm điểm thật;
  //   2) cán cân cát − sát của chính năm đó — tín hiệu DUY NHẤT theo năm mà
  //      engine có (gộp sao 3 cung hạn), dùng để phá thế hoà giữa những người
  //      đang cùng một mức đại vận.
  // ⚠️ Vẫn là GỢI Ý thứ tự theo vận, KHÔNG phải bảng xếp hạng mức quan trọng —
  // trang và prompt đều phải nói rõ điều đó.
  const thuTuTiepCan = thanhVien
    .map((t) => ({
      ten: t.ten,
      khungDiem: t.vanNam?.khung?.diem ?? null,
      canCan: t.vanNam?.catSat ? t.vanNam.catSat.cat - t.vanNam.catSat.sat : null,
      moTa: t.vanNam ? vanNamLine(t.vanNam) : null,
    }))
    .sort(
      (x, y) =>
        (y.khungDiem ?? -1) - (x.khungDiem ?? -1) || (y.canCan ?? -99) - (x.canCan ?? -99),
    );

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
          (t.vanNam ? `, vận năm ${vanNamLine(t.vanNam)}` : ''),
      )
      .join(' | '),
    // Danh sách trên mang vận năm của TỪNG người ⇒ phải kèm luật, không thì rail
    // đọc con số khung đại vận thành "điểm vận năm nay" của người đó.
    luatVanNam: LUAT_VAN_NAM,
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
  // Kèm LÝ DO từng cặp (`vi`) — trang có hiện, mà trước đây rail chỉ nhận
  // "A ↔ B" trơ. Hỏi "vì sao hai người này bù nhau" thì nó phải luận chay dù
  // engine đã tính sẵn câu trả lời. Cùng họ lỗi `thapThan` của Bát Tự.
  const capLine = (c: { a: string; b: string; vi?: string }) =>
    `${c.a} ↔ ${c.b}${c.vi ? ` — ${c.vi}` : ''}`;
  if (giam.length) d.capDeGiamChan = giam.map(capLine).join(' | ');
  if (bu.length) d.capDeBuNhau = bu.slice(0, 6).map(capLine).join(' | ');
  // Nêu rõ con số là của KHUNG đại vận, không phải điểm của năm — nếu không,
  // rail đọc "Minh (8.7/10)" thành "vận năm nay của Minh 8,7 điểm".
  d.thuTuTiepCan = p.thuTuTiepCan
    .map((t) => `${t.ten}${t.khungDiem == null ? '' : ` (khung đại vận ${t.khungDiem}/10)`}`)
    .join(' → ');
  d.luatThuTuTiepCan =
    'Thứ tự trên xếp theo điểm KHUNG ĐẠI VẬN rồi tới cán cân cát/sát của năm. ' +
    'Đây là gợi ý THỜI ĐIỂM tiếp cận, KHÔNG phải bảng xếp hạng mức quan trọng của từng người, ' +
    'và NĂM không có điểm riêng — đừng gán "điểm/10" cho năm của ai.';
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
