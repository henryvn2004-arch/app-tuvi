// lib/engine/nguoi-khac.ts
// ============================================================
// LÁ SỐ NGƯỜI KHÁC — cẩm nang ứng xử (T1)
//
// Khác mọi tool hiện có ở CÂU HỎI, không ở cổ pháp: các tool kia trả lời "đời
// người này ra sao"; tool này trả lời "làm sao sống chung với người này".
// Vì thế nó KHÔNG thêm một luật cổ pháp nào — chỉ đọc lại đúng những cung mà
// engine đã tính, qua một lăng kính khác.
//
// 🔑 KHÔNG CHÉP LẠI GÌ. Bốn kiểu người + toạ độ lấy nguyên `phanKieu` của
// `cong-so.ts` (đã đo trên 10.368 lá số); vai trò cung Mệnh lấy `MENH_ROLE` của
// `past-life.ts` (đã export sẵn để dùng chung); mượn xung chiếu dùng chung
// `majorsOrBorrow`. Chép bản thứ hai thì hai bên trôi khỏi nhau, mà trích dẫn
// cổ thư chỉ đúng ở một bên — đúng bài học đã ghi ở track Công Sở.
//
// ⚠️ RANH GIỚI ĐẠO ĐỨC, viết ở đây vì nó là ràng buộc THIẾT KẾ chứ không phải
// lời văn: tool này đọc lá số của một người KHÔNG CÓ MẶT. Vì thế module chỉ
// trả về (a) cách người đó vận hành, (b) cách nói chuyện cho êm — và CỐ Ý
// KHÔNG trả về điểm yếu dạng "chỗ dễ bị lung lay", không trả về cung Tật Ách
// dưới dạng bệnh tật, không trả về Phu Thê của họ. Xem `KHONG_DOC` bên dưới.
// ============================================================

import type { Laso } from './laso';
import { currentNamXem } from './namxem';
import {
  KIEU,
  type KieuDef,
  type KieuId,
  phanKieu,
  type PhanKieu,
  palaceByName,
  majorsOrBorrow,
  starLabel,
  kieuCuaCung,
} from './cong-so';

type Rec = Record<string, unknown>;

// ── Quan hệ ─────────────────────────────────────────────────
//
// `cungCuaBan` = cung TRONG LÁ SỐ NGƯỜI XEM nói về hạng người này, theo CỔ
// PHÁP: bề trên → Phụ Mẫu · ngang hàng → Huynh Đệ · dưới quyền/bạn nghề → Nô
// Bộc · bạn đời → Phu Thê · con → Tử Tức. Có tài liệu hiện đại đọc cấp trên ở
// cung Tật Ách; đó là biến thể của một tác giả, không kiểm chứng được, và track
// Công Sở đã cố ý không dùng — giữ nguyên quyết định đó ở đây.

export type QuanHeId =
  | 'sep'
  | 'dong-nghiep'
  | 'cap-duoi'
  | 'doi-tac'
  | 'cha-me'
  | 'con-cai'
  | 'ban-doi'
  | 'ban-be';

export interface QuanHeDef {
  id: QuanHeId;
  label: string;
  /** Cung trong lá số NGƯỜI XEM ứng với hạng người này. */
  cungCuaBan: string;
  /** Điều người ta thật sự cần khi hỏi về hạng người này. */
  nhuCau: string;
}

export const QUAN_HE: Record<QuanHeId, QuanHeDef> = {
  sep: {
    id: 'sep',
    label: 'Sếp / cấp trên',
    cungCuaBan: 'Phụ Mẫu',
    nhuCau: 'Trình bày thế nào để được duyệt, và lúc nào thì đừng trình bày.',
  },
  'dong-nghiep': {
    id: 'dong-nghiep',
    label: 'Đồng nghiệp ngang hàng',
    cungCuaBan: 'Huynh Đệ',
    nhuCau: 'Chia việc thế nào cho khỏi giẫm chân, và tránh cái gì để khỏi mất lòng.',
  },
  'cap-duoi': {
    id: 'cap-duoi',
    label: 'Cấp dưới / người mình quản',
    cungCuaBan: 'Nô Bộc',
    nhuCau: 'Giao việc kiểu nào thì họ chạy, nhắc kiểu nào thì họ nghe.',
  },
  'doi-tac': {
    id: 'doi-tac',
    label: 'Đối tác / khách hàng',
    cungCuaBan: 'Nô Bộc',
    nhuCau: 'Họ quyết bằng cái gì, và điều gì làm họ chùn lại.',
  },
  'cha-me': {
    id: 'cha-me',
    label: 'Cha mẹ / người lớn trong nhà',
    cungCuaBan: 'Phụ Mẫu',
    nhuCau: 'Nói chuyện thế nào để không thành cãi nhau về cùng một chuyện cũ.',
  },
  'con-cai': {
    id: 'con-cai',
    label: 'Con cái',
    cungCuaBan: 'Tử Tức',
    nhuCau: 'Đứa trẻ này cần được thúc hay cần được để yên.',
  },
  'ban-doi': {
    id: 'ban-doi',
    label: 'Vợ / chồng / người yêu',
    cungCuaBan: 'Phu Thê',
    nhuCau: 'Chỗ nào là khác biệt tính cách chứ không phải hết thương.',
  },
  'ban-be': {
    id: 'ban-be',
    label: 'Bạn bè',
    cungCuaBan: 'Huynh Đệ',
    nhuCau: 'Trông cậy được ở việc gì, và đừng trông cậy ở việc gì.',
  },
};

export const QUAN_HE_IDS = Object.keys(QUAN_HE) as QuanHeId[];

export function resolveQuanHe(v?: string | null): QuanHeId {
  return QUAN_HE_IDS.includes(v as QuanHeId) ? (v as QuanHeId) : 'sep';
}

// ── Những cung CỐ Ý KHÔNG ĐỌC ───────────────────────────────
//
// Người được xem không có mặt để đồng ý. Nên tool dừng ở phần "làm việc và nói
// chuyện với nhau", không đi vào đời riêng của họ:
//   • Tật Ách   — sức khoẻ/bệnh tật của người vắng mặt
//   • Phu Thê   — hôn nhân của họ (trừ khi CHÍNH người xem là bạn đời)
//   • Tài Bạch  — tiền bạc riêng
// Đây là ràng buộc DỮ LIỆU, không phải lời dặn prompt: cung nào không nằm
// trong payload thì model không có gì để luận, kể cả khi bị dụ.
export const KHONG_DOC = ['Tật Ách', 'Tài Bạch', 'Phu Thê', 'Tử Tức', 'Điền Trạch'] as const;

/** Các cung được đọc, kèm nhãn nói rõ nó dùng để làm gì trong bản cẩm nang. */
const MAT_DOC: { cung: string; nhan: string; y: string }[] = [
  { cung: 'Mệnh', nhan: 'Cốt cách', y: 'Con người gốc — cái không đổi dù đổi việc, đổi chỗ' },
  { cung: 'Phúc Đức', nhan: 'Nền tâm tính', y: 'Cái làm họ thấy yên hay thấy bất an, thứ họ tin là đáng sống' },
  { cung: 'Thiên Di', nhan: 'Ra ngoài', y: 'Cách họ cư xử với người ngoài — đây là mặt bạn gặp nhiều nhất' },
  { cung: 'Quan Lộc', nhan: 'Cách làm việc', y: 'Họ coi trọng gì trong công việc, làm kiểu nào thì thấy đúng' },
  { cung: 'Nô Bộc', nhan: 'Với người xung quanh', y: 'Họ kết giao và giữ người thế nào' },
];

export interface MatDoc {
  cung: string;
  nhan: string;
  y: string;
  sao: string[];
  muon: boolean;
  /** Ý nghĩa cách cục engine gắn cho chính cung này. Tối đa 3 — đủ nói, không ngập. */
  cachCuc: string[];
  diem: number | null;
}

export interface VanNam {
  nam: number;
  diem: number | null;
  huong: string | null;
  tieuHanCung: string | null;
}

export interface VoiBan {
  /** Cung trong lá số NGƯỜI XEM nói về hạng người này. */
  cung: string;
  sao: string[];
  muon: boolean;
  kieu: KieuId | null;
  kieuTen: string;
  /** Kiểu của họ có trùng kiểu mà cung này của bạn mô tả không. */
  khop: boolean | null;
  /** Hai kiểu cùng tính âm/dương → dễ va; khác tính → dễ bù. */
  cungTinh: boolean;
}

export interface NguoiKhacProfile {
  namXem: number;
  quanHe: QuanHeDef;
  gioiTinh: 'nam' | 'nu';
  kieu: KieuDef;
  kieuPhu: KieuDef | null;
  phan: PhanKieu;
  /** Cung an Thân — nửa đời sau họ dồn về đâu. */
  than: { cung: string; y: string };
  matDoc: MatDoc[];
  vanNam: VanNam | null;
  /** Đại vận đang chạy của HỌ — dùng cho phần "lúc nào nên nhờ vả". */
  daiVan: { tuoiStart: number; tuoiEnd: number; cung: string; sao: string[]; diem: number | null } | null;
  voiBan: VoiBan | null;
}

/** Cung an Thân nói nửa đời sau dồn về đâu — 6 khả năng theo cổ pháp. */
const THAN_Y: Record<string, string> = {
  Mệnh: 'Dồn cả đời về chính mình — họ không rẽ nhánh, càng về sau càng đúng là con người gốc ở trên.',
  'Phúc Đức': 'Càng về sau càng đặt sự yên ổn và ý nghĩa lên trên thành bại.',
  'Quan Lộc': 'Càng về sau càng lấy công việc làm chỗ dựa cho cả con người.',
  'Thiên Di': 'Càng về sau càng sống ở bên ngoài — quan hệ, đi lại, môi trường mới.',
  'Tài Bạch': 'Càng về sau càng quy mọi thứ về chuyện thu xếp được hay không.',
  'Phu Thê': 'Càng về sau càng bị chi phối bởi người bạn đời và đời sống gia đình.',
};

// 🪤 Lá số KHÔNG có trường `cungThan` — chỉ có cờ `isThan` trên từng cung (đã
// kiểm trên engine thật). Đọc `ls.cungThan` là ra `undefined` rồi cả khối này
// rỗng một cách im lặng.
function thanCung(ls: Laso): { cung: string; y: string } {
  const p = ((ls.palaces as Rec[]) || []).find((x) => x && x.isThan === true);
  const cung = String(p?.cungName || '');
  return { cung, y: THAN_Y[cung] || '' };
}

/** `tieuVanScores[].direction` của engine là chuỗi TIẾNG ANH — dịch tại đúng
 *  một chỗ, đúng như `cong-so.ts` đã phải làm sau khi chữ Anh lọt giao diện. */
const HUONG_VI: Record<string, string> = {
  up: 'đang lên',
  down: 'đang xuống',
  flat: 'đi ngang',
};

/**
 * Hồ sơ ứng xử với MỘT người, suy từ lá số của chính họ.
 *
 * `lsBan` (lá số người xem) là TUỲ CHỌN — thiếu thì phần "Người này với bạn"
 * rỗng, mọi phần còn lại vẫn đầy đủ. CỐ Ý không bắt buộc: bắt nhập hai lá số
 * mới xem được là dựng thêm một bức tường ở đúng chỗ người ta hay bỏ ngang.
 */
export function computeNguoiKhac(
  ls: Laso,
  gioiTinh: 'nam' | 'nu',
  quanHeId: QuanHeId,
  lsBan?: Laso | null,
  namXem?: number,
): NguoiKhacProfile {
  const nam = namXem ?? (typeof ls.namXem === 'number' ? (ls.namXem as number) : currentNamXem());
  const quanHe = QUAN_HE[quanHeId];
  const phan = phanKieu(ls);
  const scores = (ls.cungScores as Record<string, Rec>) || {};
  const cachCucTung = (ls.cachCucTungCung as Record<string, string[]>) || {};

  const matDoc: MatDoc[] = MAT_DOC.map((m) => {
    const p = palaceByName(ls, m.cung);
    const b = majorsOrBorrow(ls, p);
    const sc = scores[m.cung];
    return {
      cung: m.cung,
      nhan: m.nhan,
      y: m.y,
      sao: b.stars.map(starLabel),
      muon: b.muon,
      cachCuc: (cachCucTung[m.cung] || []).slice(0, 3),
      diem: typeof sc?.tong === 'number' ? (sc.tong as number) : null,
    };
  });

  const tvs = (ls.tieuVanScores as Rec[]) || [];
  const tvNam = tvs.find((t) => t.nam === nam);
  const vanNam: VanNam | null = tvNam
    ? {
        nam,
        diem: typeof tvNam.mainScore === 'number' ? (tvNam.mainScore as number) : null,
        huong: HUONG_VI[String(tvNam.direction || '')] || null,
        tieuHanCung: (tvNam.tieuHanCung as string) || null,
      }
    : null;

  const dv = ls.daiVanHienTai as Rec | undefined;
  const dvP = dv && typeof dv.cungIdx === 'number' ? ((ls.palaces as Rec[]) || [])[dv.cungIdx as number] : undefined;
  const dvSc = dv?.scoring as Rec | undefined;
  const daiVan = dv
    ? {
        tuoiStart: Number(dv.tuoiStart) || 0,
        tuoiEnd: Number(dv.tuoiEnd) || 0,
        cung: String(dvP?.cungName || ''),
        sao: majorsOrBorrow(ls, dvP).stars.map(starLabel),
        diem: typeof dvSc?.tong === 'number' ? (dvSc.tong as number) : null,
      }
    : null;

  let voiBan: VoiBan | null = null;
  if (lsBan) {
    const k = kieuCuaCung(lsBan, quanHe.cungCuaBan);
    voiBan = {
      cung: quanHe.cungCuaBan,
      sao: k.sao.map(starLabel),
      muon: k.muon,
      kieu: k.kieu,
      kieuTen: k.kieu ? KIEU[k.kieu].ten : '—',
      khop: k.kieu ? k.kieu === phan.kieu : null,
      // Hai kiểu CÙNG tính âm/dương thì cùng cách phản ứng nên dễ va vào nhau;
      // khác tính thì một bên xông một bên giữ, dễ bù hơn. Đây là luật âm dương
      // tương bổ mà phần Ghép Đội của tool Công Sở đã dùng.
      cungTinh: k.kieu ? KIEU[k.kieu].amDuong === KIEU[phan.kieu].amDuong : false,
    };
  }

  return {
    namXem: nam,
    quanHe,
    // 🪤 Giới tính KHÔNG nằm trong lá số engine trả về (đã kiểm) — phải truyền
    // vào. Đọc `ls.gioiTinh` là luôn ra 'nam', sai im lặng cho một nửa người xem.
    gioiTinh,
    kieu: KIEU[phan.kieu],
    kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
    phan,
    than: thanCung(ls),
    matDoc,
    vanNam,
    daiVan,
    voiBan,
  };
}

/**
 * Dữ liệu PHẲNG gửi rail.
 *
 * ⚠️ `extractGenericContext` bỏ IM LẶNG mọi giá trị là object — nhét mảng hay
 * object vào đây là rail nhận vài dòng rồi luận chay. Đã trả giá một lần ở tool
 * Thần Số Học, ghi lại để khỏi lặp.
 */
export function railData(p: NguoiKhacProfile): Record<string, string | number | boolean> {
  const d: Record<string, string | number | boolean> = {
    quanHe: p.quanHe.label,
    nhuCauNguoiXem: p.quanHe.nhuCau,
    kieuNguoi: p.kieu.ten,
    kieuTuTuong: p.kieu.tuTuong,
    kieuMotCau: p.kieu.motCau,
    dongLuc: p.kieu.dongLuc,
    datChat: p.kieu.datChat,
    kieuDan: p.kieu.kieuDan,
    diemManh: p.kieu.manh,
    diemYeu: p.kieu.yeu,
    moiTruongHop: p.kieu.moiTruongHop,
    moiTruongKy: p.kieu.moiTruongKy,
    cauHoiChayNgam: p.kieu.cauHoi.join(' · '),
    laiKieu: p.phan.lai,
    cungThan: p.than.cung,
    cungThanY: p.than.y,
  };
  if (p.kieuPhu) d.kieuPhu = p.kieuPhu.ten;
  if (p.phan.vaiTro) d.vaiTroMenh = p.phan.vaiTro.role;
  for (const m of p.matDoc) {
    d['cung' + m.cung.replace(/\s+/g, '')] =
      m.sao.join(', ') + (m.muon ? ' (mượn xung chiếu)' : '') +
      (m.cachCuc.length ? ' — ' + m.cachCuc.join('; ') : '');
  }
  if (p.vanNam) {
    d.vanNamNay =
      `${p.vanNam.nam}: ${p.vanNam.diem == null ? 'chưa chấm' : p.vanNam.diem + '/10'}` +
      (p.vanNam.huong ? ` (${p.vanNam.huong})` : '') +
      (p.vanNam.tieuHanCung ? ` · tiểu hạn ở cung ${p.vanNam.tieuHanCung}` : '');
  }
  if (p.daiVan) {
    d.daiVanDangChay =
      `${p.daiVan.tuoiStart}–${p.daiVan.tuoiEnd} tuổi, cung ${p.daiVan.cung}` +
      (p.daiVan.diem == null ? '' : `, ${p.daiVan.diem}/10`);
  }
  if (p.voiBan) {
    d.cungCuaBan = p.voiBan.cung;
    d.saoCungCuaBan = p.voiBan.sao.join(', ') + (p.voiBan.muon ? ' (mượn xung chiếu)' : '');
    d.kieuCungCuaBan = p.voiBan.kieuTen;
    d.hopHayVa = p.voiBan.cungTinh ? 'cùng tính âm/dương — dễ va' : 'khác tính âm/dương — dễ bù';
  }
  return d;
}
