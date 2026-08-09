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
  resolveVanNam,
  vanNamLine,
  LUAT_VAN_NAM_AN_CUNG,
  type VanNam,
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

// ── Việc đang cần làm ───────────────────────────────────────
//
// 🔑 VÌ SAO CÓ Ô NÀY. Trước đây bản trả tiền nhận ĐÚNG cùng một hồ sơ với bản
// tính thử (đã kiểm: `buildNguoiKhacPrompt` và `meta()` đọc gần trùng khít một
// object) ⇒ model không có thêm một dữ kiện nào để nói, nên nó chỉ có thể diễn
// đạt lại thứ người ta vừa đọc miễn phí. Đó là lỗi CẤU TRÚC, sửa prompt bao
// nhiêu vòng cũng không ra thông tin mới. Ô này là dữ kiện MỚI do chính người
// hỏi cấp ⇒ đầu vào khác thì đầu ra khác thật.
//
// ⚠️ MỘT DANH SÁCH PHẲNG + CỜ `hop`, KHÔNG PHẢI MA TRẬN 8 quan hệ × N việc.
// Cùng bài học "BA TRỤC ĐỘC LẬP, KHÔNG VIẾT MA TRẬN" của track Công Sở: viết
// 8×10 = 80 ô thì mỗi lần thêm một quan hệ phải viết thêm 10 ô, và không ai
// soát nổi. Ở đây mỗi việc tự khai nó hợp với những quan hệ nào.

export type ViecId =
  | 'nho-viec'
  | 'thuong-luong'
  | 'bao-tin-xau'
  | 'tu-choi'
  | 'bat-dong'
  | 'giao-viec'
  | 'ru-hop-tac'
  | 'gan-lai'
  | 'lan-dau'
  | 'hieu-them';

export interface ViecDef {
  id: ViecId;
  label: string;
  /** Điều người hỏi thật sự cần nghe khi chọn mục này. */
  can: string;
  /** Quan hệ nào thì việc này có nghĩa. Rỗng = hợp mọi quan hệ. */
  hop: QuanHeId[];
}

export const VIEC_CAN_LAM: Record<ViecId, ViecDef> = {
  'nho-viec': {
    id: 'nho-viec',
    label: 'Sắp nhờ họ một việc / trình một đề xuất',
    can: 'Trình bày theo thứ tự nào thì lọt, và chỗ nào trong cách trình bày sẽ làm họ chững lại.',
    hop: ['sep', 'dong-nghiep', 'doi-tac', 'cha-me', 'ban-doi', 'ban-be'],
  },
  'thuong-luong': {
    id: 'thuong-luong',
    label: 'Sắp thương lượng quyền lợi (lương, chia phần)',
    can: 'Người này quyết bằng cái gì, và mở lời bằng con số trước hay bằng lý lẽ trước.',
    hop: ['sep', 'dong-nghiep', 'doi-tac'],
  },
  'bao-tin-xau': {
    id: 'bao-tin-xau',
    label: 'Sắp phải báo một tin họ không muốn nghe',
    can: 'Nói thẳng hay nói vòng, nói riêng hay nói chung — và câu mở đầu nào khiến họ nghe hết.',
    hop: [],
  },
  'tu-choi': {
    id: 'tu-choi',
    label: 'Phải từ chối họ mà không muốn mất quan hệ',
    can: 'Từ chối kiểu nào thì người này coi là sòng phẳng, kiểu nào thì coi là bị coi thường.',
    hop: [],
  },
  'bat-dong': {
    id: 'bat-dong',
    label: 'Đang có bất đồng chưa gỡ được',
    can: 'Phần nào là khác biệt tính khí (không gỡ được, phải né) và phần nào là cách nói (sửa được ngay).',
    hop: [],
  },
  'giao-viec': {
    id: 'giao-viec',
    label: 'Cần giao việc / nhắc việc cho họ',
    can: 'Giao kiểu nào thì họ chạy, nhắc kiểu nào thì họ nghe mà không thấy bị soi.',
    hop: ['dong-nghiep', 'cap-duoi', 'doi-tac', 'con-cai'],
  },
  'ru-hop-tac': {
    id: 'ru-hop-tac',
    label: 'Muốn rủ họ làm chung một việc lớn',
    can: 'Người này bị thuyết phục bởi cái gì, và chỗ nào trong việc chung sẽ khiến họ rút.',
    hop: ['dong-nghiep', 'cap-duoi', 'doi-tac', 'ban-be', 'ban-doi'],
  },
  'gan-lai': {
    id: 'gan-lai',
    label: 'Muốn gần lại sau một thời gian xa cách',
    can: 'Cửa nào còn mở: chuyện gì họ còn chịu nghe, và cách mở lời nào làm họ đóng lại ngay.',
    hop: ['cha-me', 'con-cai', 'ban-doi', 'ban-be', 'dong-nghiep'],
  },
  'lan-dau': {
    id: 'lan-dau',
    label: 'Sắp gặp / làm việc lần đầu, chưa biết gì về họ',
    can: 'Ba điều nên biết trước khi mở miệng, và một điều tuyệt đối đừng làm ở lần gặp đầu.',
    hop: [],
  },
  'hieu-them': {
    id: 'hieu-them',
    label: 'Không có gì gấp, chỉ muốn hiểu người này hơn',
    can: 'Một bản mô tả con người này, đủ để nhận ra họ trong đời thường.',
    hop: [],
  },
};

export const VIEC_IDS = Object.keys(VIEC_CAN_LAM) as ViecId[];

export function resolveViec(v?: string | null): ViecId {
  return VIEC_IDS.includes(v as ViecId) ? (v as ViecId) : 'hieu-them';
}

/** Việc nào bày ra cho quan hệ này. `hop` rỗng = hợp mọi quan hệ. */
export function viecChoQuanHe(q: QuanHeId): ViecDef[] {
  return VIEC_IDS.map((id) => VIEC_CAN_LAM[id]).filter((v) => v.hop.length === 0 || v.hop.includes(q));
}

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
  /** Việc người hỏi đang cần làm với người này — dữ kiện do CHÍNH họ cấp. */
  viec: ViecDef;
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
  viecId?: ViecId,
): NguoiKhacProfile {
  const nam = namXem ?? (typeof ls.namXem === 'number' ? (ls.namXem as number) : currentNamXem());
  const quanHe = QUAN_HE[quanHeId];
  // Việc không hợp với quan hệ đang chọn thì rơi về 'hieu-them' — người dùng
  // đổi quan hệ sau khi đã chọn việc là ra tổ hợp vô nghĩa ("giao việc cho
  // sếp"), mà tổ hợp đó đi thẳng vào prompt.
  const viecRaw = VIEC_CAN_LAM[resolveViec(viecId)];
  const viec = viecRaw.hop.length === 0 || viecRaw.hop.includes(quanHeId) ? viecRaw : VIEC_CAN_LAM['hieu-them'];
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

  const vanNam = resolveVanNam(ls, nam);

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
    viec,
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
 * Tên các khối CHƯA MỞ, sinh từ dữ liệu thật của chính lá số này.
 *
 * 🔑 VÌ SAO KHÔNG ĐỂ TRANG CHÉP TAY. Trước đây `app-nguoi-khac.html` giữ một
 * mảng `NK_KHOA` viết cứng 6 dòng chung chung ("Con người này vận hành thế
 * nào") — nói y hệt nhau cho mọi lá số, nên không mở được vòng tò mò nào. Nêu
 * đích danh thứ đang khoá thì mới có cái để muốn biết.
 *
 * ⚠️ LUẬT CỨNG, ĐỌC TRƯỚC KHI THÊM DÒNG: mỗi mục ở đây PHẢI ứng với một trường
 * CÓ THẬT trong payload đường trả tiền (`id` chính là tên trường). Bịa một tiêu
 * đề nghe hay mà bản đầy đủ không có nội dung đó là **hứa hụt** — thứ repo tự
 * dặn tránh, và là cách nhanh nhất mất niềm tin ngay ở lượt trả tiền đầu tiên.
 * Có test canh đúng chỗ này: mọi `id` phải nằm trong payload thật.
 *
 * Vì thế `voiBan` CHỈ xuất hiện khi có lá số người hỏi — đúng điều kiện mà
 * `buildReport` dùng để quyết định có nhận mục đó hay không.
 */
export function khoiKhoa(p: NguoiKhacProfile): { id: string; tieuDe: string }[] {
  const k: { id: string; tieuDe: string }[] = [];

  // Khối của A3 đứng ĐẦU: nó là thứ DUY NHẤT đổi theo việc người hỏi đang cần
  // làm, tức thứ bản tính thử không thể có kể cả về nguyên tắc.
  if (p.viec.id !== 'hieu-them') {
    k.push({ id: 'keHoach', tieuDe: `Cách đi cho việc: ${p.viec.label.replace(/^Sắp |^Phải |^Cần |^Muốn /, '')}` });
  }
  k.push({ id: 'tinhKhi', tieuDe: `Người kiểu ${p.kieu.ten} này vận hành thế nào trong đời thật` });
  k.push({ id: 'coiTrong', tieuDe: 'Họ coi trọng cái gì — và sợ mất cái gì' });
  k.push({ id: 'chamNoc', tieuDe: 'Điều làm người này khó chịu nhất' });
  k.push({ id: 'nenNoi', tieuDe: 'Ba việc nên nói, kèm câu nói thật để dùng luôn' });
  k.push({ id: 'tranhNoi', tieuDe: 'Ba câu tuyệt đối đừng nói với người này' });
  k.push({
    id: 'thoiDiem',
    tieuDe: p.daiVan
      ? `Lúc nào nên đưa việc lớn tới — theo đại vận ${p.daiVan.tuoiStart}–${p.daiVan.tuoiEnd} tuổi họ đang chạy`
      : 'Lúc nào nên đưa việc lớn tới',
  });
  if (p.voiBan) {
    k.push({ id: 'voiBan', tieuDe: `Chỗ bạn và người này va nhau — đọc ở cung ${p.voiBan.cung} của bạn` });
  }
  k.push({ id: 'motCau', tieuDe: 'Một câu chốt để nhớ về người này' });
  return k;
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
    viecDangCanLam: p.viec.label,
    dieuNguoiHoiCanNghe: p.viec.can,
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
    // Dùng CHUNG `vanNamLine` với prompt để hai chỗ không nói khác nhau; kèm
    // luật chặn rail tự chấm điểm cho năm (luật `execTraVanHan`).
    // 🔒 `anCung` — người được xem KHÔNG có mặt. Không có cờ này thì rail nhận
    // "tiểu hạn cung Tật Ách" rồi luận bệnh tật của họ, đúng cửa mà `KHONG_DOC`
    // đã chặn ở tầng dữ liệu. Vá prompt mà quên rail là chỉ khoá một nửa.
    d.vanNamNay = vanNamLine(p.vanNam, { anCung: true });
    d.luatVanNam = LUAT_VAN_NAM_AN_CUNG;
  }
  if (p.daiVan) {
    // 🔒 KHÔNG nêu tên cung đại vận — cùng lý do `anCung` ở trên, và cùng quyết
    // định mà `buildNguoiKhacPrompt` đã ghi rõ. Cung đại vận rơi vào Tật Ách /
    // Điền Trạch ở **60/144 lá số** (đã đo), tức 42% số lượt rail có sẵn cửa để
    // luận bệnh tật / nhà cửa của một người không có mặt.
    d.daiVanDangChay =
      `${p.daiVan.tuoiStart}–${p.daiVan.tuoiEnd} tuổi` +
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
