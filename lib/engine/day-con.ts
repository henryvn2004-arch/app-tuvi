// lib/engine/day-con.ts
// ============================================================
// DẠY CON THEO LÁ SỐ (T2 — "gói Cha Mẹ")
//
// Câu hỏi tool này trả lời: **dạy đứa trẻ này kiểu nào thì vào**. Đó là câu
// khác hẳn `nguoi-khac` với quan hệ `con-cai` (làm sao sống chung cho êm) và
// khác hẳn `cong-so` (đời đi làm của một người trưởng thành).
//
// 🔑 KHÔNG THÊM MỘT LUẬT CỔ PHÁP NÀO. Bốn kiểu người + toạ độ lấy nguyên
// `phanKieu` của `cong-so.ts`; quy đổi tuổi ↔ năm dùng chung `namSinhTuLaSo`;
// danh sách cung cấm đọc dùng chung `KHONG_DOC` của `nguoi-khac.ts`. Phần mới
// duy nhất là **cách diễn 4 kiểu đó thành việc nuôi dạy** (bảng `KIEU_HOC`) —
// nội dung tự viết, không dịch của ai.
//
// ⚠️ RANH GIỚI, và nó là ràng buộc DỮ LIỆU chứ không phải lời dặn:
// đối tượng ở đây là **một đứa trẻ chưa trưởng thành và không có mặt**. Một câu
// phán sai mà cha mẹ tin sẽ theo nó nhiều năm. Vì thế module:
//   • dùng lại `KHONG_DOC` — không trả Tật Ách (bệnh), Phu Thê (hôn nhân của
//     một đứa trẻ!), Tài Bạch, Tử Tức, Điền Trạch;
//   • KHÔNG trả bảng nghề nghiệp (`resolveCareerBase`) dù engine có sẵn — chốt
//     nghề cho một đứa 10 tuổi là thứ nguy hiểm nhất tool này có thể làm;
//   • không xếp hạng, không có điểm tổng "đứa này được mấy phần".
// Tầng prompt cấm thêm một lần nữa (đỗ/trượt, so sánh anh em, "khó dạy").
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
  namSinhTuLaSo,
  resolveVanNam,
  vanNamLine,
  LUAT_VAN_NAM,
  type VanNam,
} from './cong-so';
import { KHONG_DOC } from './nguoi-khac';

type Rec = Record<string, unknown>;

// ── Điều cha mẹ đang lo ─────────────────────────────────────
// Cùng cơ chế với ô "tình trạng nghề" của tool Công Sở: một `<select>` đổi
// giọng cả bản luận. Đây là đòn rẻ nhất mà hiệu quả nhất — người ta mở tool vì
// một chuyện cụ thể đang xảy ra trong nhà, không phải vì tò mò lá số.

export type MoiLoId =
  | 'hoc-hanh'
  | 'buong-binh'
  | 'nhut-nhat'
  | 'chon-duong'
  | 'khong-noi-chuyen'
  | 'hieu-them';

export interface MoiLoDef {
  id: MoiLoId;
  label: string;
  /** Điều cha mẹ thật sự cần nghe khi chọn mục này. */
  can: string;
}

export const MOI_LO: Record<MoiLoId, MoiLoDef> = {
  'hoc-hanh': {
    id: 'hoc-hanh',
    label: 'Học hành sa sút, ngồi vào bàn không nổi',
    can: 'Cách ra bài và cách bày bàn học hợp với kiểu tiếp thu của đứa trẻ này, thay vì ép thêm giờ.',
  },
  'buong-binh': {
    id: 'buong-binh',
    label: 'Bướng, cãi lại, nói không nghe',
    can: 'Phân biệt phần nào là tính khí gốc (không sửa được, phải dẫn) với phần nào là cách người lớn đang nói (sửa được ngay).',
  },
  'nhut-nhat': {
    id: 'nhut-nhat',
    label: 'Rụt rè, ngại đám đông, ít bạn',
    can: 'Đứa trẻ này cần được đẩy ra hay cần được để yên — hai kiểu trẻ khác nhau mà biểu hiện bên ngoài giống nhau.',
  },
  'chon-duong': {
    id: 'chon-duong',
    label: 'Sắp phải chọn trường / chọn ngành',
    can: 'Chất việc hợp với con, và cách hỏi con để con tự nói ra — KHÔNG phải một cái tên ngành.',
  },
  'khong-noi-chuyen': {
    id: 'khong-noi-chuyen',
    label: 'Con không chịu nói chuyện với mình nữa',
    can: 'Cửa nào còn mở: chuyện gì con còn chịu nghe, và cách mở lời nào khiến con đóng lại ngay.',
  },
  'hieu-them': {
    id: 'hieu-them',
    label: 'Không có gì gấp, chỉ muốn hiểu con hơn',
    can: 'Một bản mô tả con người đứa trẻ này, đủ để nhận ra nó trong đời thường.',
  },
};

export const MOI_LO_IDS = Object.keys(MOI_LO) as MoiLoId[];

export function resolveMoiLo(v?: string | null): MoiLoId {
  return MOI_LO_IDS.includes(v as MoiLoId) ? (v as MoiLoId) : 'hieu-them';
}

// ── Bốn kiểu, diễn sang việc nuôi dạy ───────────────────────
// Nội dung TỰ VIẾT. Nó KHÔNG phải cổ pháp và không giả vờ là cổ pháp: cổ pháp
// cho ra bốn kiểu (tứ tượng áp lên chính tinh cung Mệnh + Quan Lộc), còn phần
// "vậy thì dạy kiểu nào" là quy chiếu của trang. Trang phải nói rõ điều đó.

export interface KieuHoc {
  kieu: KieuId;
  /** Cách đứa trẻ tiếp nhận cái mới. */
  tiepThu: string;
  /** Cách giao bài / giao việc để nó chịu làm. */
  giaoViec: string;
  /** Kiểu động viên thật sự có tác dụng với đứa trẻ này. */
  dongVien: string;
  /** Kiểu kỷ luật phản tác dụng — phần cha mẹ hay làm sai nhất. */
  kyLuatHong: string;
  /** Chỗ người lớn hay đọc nhầm đứa trẻ này. */
  hieuNham: string;
  /** Thứ con cần học thêm. Viết như một BÀI HỌC, không phải một lời chê. */
  canHoc: string;
  /** Dấu hiệu quan sát được ở nhà, để cha mẹ đối chiếu xem có đúng con mình không. */
  dauHieu: string[];
}

export const KIEU_HOC: Record<KieuId, KieuHoc> = {
  'khai-sang': {
    kieu: 'khai-sang',
    tiepThu:
      'Học bằng cách làm hỏng rồi làm lại, không học bằng cách nghe giảng. Ngồi yên nghe lâu là nó tắt, nhưng cho tự mò thì nhớ rất lâu.',
    giaoViec:
      'Ra bài dạng thử thách có mốc kết thúc rõ ("làm xong trước bảy giờ") thay vì bài dài lê thê. Cho nó chọn thứ tự làm — được chọn là nó chịu bắt tay.',
    dongVien:
      'Khen vào chỗ nó DÁM làm, không phải chỗ nó ngoan. Ghi nhận kết quả cụ thể; khen chung chung nó biết ngay là khen cho có.',
    kyLuatHong:
      'Quát và ép trước mặt người khác. Kiểu này phản đòn tức thì — nó sẽ làm ngược lại để giữ mặt, kể cả khi biết mình sai.',
    hieuNham:
      'Bị gọi là hỗn hoặc lì. Phần lớn là nó đang thử xem giới hạn thật nằm ở đâu, chứ không phải chống đối người lớn.',
    canHoc:
      'Chờ và nghe hết câu. Đây là thứ nó thiếu nhất và không tự đến theo tuổi — phải được dạy có chủ đích.',
    dauHieu: [
      'Hay hỏi "tại sao lại phải thế" trước khi làm',
      'Chán rất nhanh khi việc đã quen tay',
      'Tranh phần dẫn đầu trong nhóm bạn',
      'Va vấp rồi tự đứng dậy, ít khi kể cho người lớn',
    ],
  },
  'lanh-dao': {
    kieu: 'lanh-dao',
    tiepThu:
      'Học theo hệ thống: cần biết cái này nằm ở đâu trong bức tranh lớn thì mới chịu học. Nhảy cóc là nó mất hứng.',
    giaoViec:
      'Cho thời khoá biểu rõ và giữ đúng nó. Giao trọn một phần việc kèm quyền quyết trong phần đó — nó làm rất nghiêm túc phần đã được giao hẳn.',
    dongVien:
      'Ghi nhận trước mặt người khác, và giao thêm trách nhiệm. Với đứa này, được tin tưởng là phần thưởng lớn hơn quà.',
    kyLuatHong:
      'Đổi luật giữa chừng, hoặc phạt kiểu tuỳ hứng. Nó chịu được phạt nặng nhưng không chịu được bất nhất — mất lòng tin là mất luôn nhiều năm.',
    hieuNham:
      'Bị cho là già trước tuổi, hoặc bị nói là "sĩ diện". Thật ra nó đang rất sợ mất chỗ đứng trong mắt người nó trọng.',
    canHoc:
      'Được phép làm sai. Nếu cả nhà chỉ khen lúc nó đúng, nó sẽ tránh mọi việc chưa chắc thắng — cái trần đó tự nó đặt cho mình rất sớm.',
    dauHieu: [
      'Thích sắp xếp đồ đạc, hay lập danh sách',
      'Nhận việc rồi làm tới nơi, ít bỏ dở',
      'Rất để ý ai được khen, ai bị mắng',
      'Ngại thử thứ mình chưa chắc làm được',
    ],
  },
  'ho-tro': {
    kieu: 'ho-tro',
    tiepThu:
      'Học bằng nói: giảng lại cho người khác nghe là cách nó thuộc bài nhanh nhất. Bắt ngồi im chép phạt gần như vô ích.',
    giaoViec:
      'Hỏi ý nó trước rồi mới giao. Cho nó trình bày lại xem đã hiểu chưa — vừa là kiểm tra, vừa đúng thứ nó thích làm.',
    dongVien:
      'Khen vào cái đầu: nhận xét sắc, nghĩ ra cách hay. Đứa này cần được công nhận là thông minh nhiều hơn nó thừa nhận.',
    kyLuatHong:
      'Cắt lời và không cho giải thích. Nó sẽ thấy bị xử oan, rồi từ đó không nói gì nữa — đúng cái kết cục cha mẹ sợ nhất.',
    hieuNham:
      'Bị cho là lắm lời hoặc cãi. Phần lớn là nó đang tìm cách được hiểu đúng, không phải đang thắng thua.',
    canHoc:
      'Làm cho xong, không chỉ nói cho hay. Nói và làm là hai việc, và khoảng cách đó là thứ nó phải tự rút ngắn.',
    dauHieu: [
      'Nói nhiều, kể chuyện có đầu có đuôi',
      'Nhạy với không khí trong nhà, biết ngay ai đang giận',
      'Bài nào hiểu thì làm rất nhanh, bài nào phải cày thì bỏ',
      'Cần người nghe; không ai nghe thì xịu hẳn',
    ],
  },
  'hop-tac': {
    kieu: 'hop-tac',
    tiepThu:
      'Học chậm mà chắc, cần thời gian ngấm. Thúc nhanh là nó rối rồi mất tự tin, chứ không phải nó không hiểu.',
    giaoViec:
      'Chia nhỏ, báo trước, đừng đổi phút chót. Làm cùng nó vài lần đầu rồi mới để tự làm — có người bên cạnh là nó yên tâm.',
    dongVien:
      'Ghi nhận sự bền bỉ và phần nó giúp người khác, không chỉ ghi nhận thành tích. Nó làm nhiều việc không ai thấy.',
    kyLuatHong:
      'So sánh với anh chị em hoặc con nhà người ta. Đứa này không phản ứng ra ngoài, nó nuốt vào — và tin luôn là mình kém.',
    hieuNham:
      'Bị cho là thiếu chí tiến thủ. Thật ra nó có nhịp riêng, chậm hơn nhưng đi được đường dài.',
    canHoc:
      'Nói ra khi không đồng ý. Giữ hoà khí bằng cách im là để vấn đề lớn lên — thói quen này hình thành rất sớm.',
    dauHieu: [
      'Ít đòi hỏi, nhường phần cho người khác',
      'Nhớ dai chuyện bị mắng, dù ngoài mặt không nói',
      'Bạn thân ít nhưng chơi rất lâu',
      'Việc nhà làm đều đặn mà không cần nhắc',
    ],
  },
};

// ── Các mặt được đọc ở lá số một đứa trẻ ────────────────────
// Năm cung này chọn theo ĐÚNG việc nuôi dạy. Cung Phụ Mẫu là mặt quan trọng
// nhất của cả tool và cũng là mặt không tool nào khác đọc: nó nói **đứa trẻ
// nhìn cha mẹ thế nào**, tức nói về phía bên kia của chính người đang hỏi.
const MAT_DOC: { cung: string; nhan: string; y: string }[] = [
  { cung: 'Mệnh', nhan: 'Cốt cách', y: 'Con người gốc của đứa trẻ — phần không đổi dù đổi trường, đổi bạn' },
  { cung: 'Phúc Đức', nhan: 'Nền tâm tính', y: 'Cái làm con thấy yên hay thấy bất an; nó vui theo kiểu nào' },
  { cung: 'Phụ Mẫu', nhan: 'Con nhìn cha mẹ', y: 'Đứa trẻ tiếp nhận người lớn trong nhà thế nào — mặt hiếm khi ai nói cho cha mẹ biết' },
  { cung: 'Thiên Di', nhan: 'Ra khỏi nhà', y: 'Cách con cư xử ở trường, giữa bạn bè, chỗ lạ' },
  { cung: 'Quan Lộc', nhan: 'Đường học', y: 'Cung học nghiệp — cách con vào việc và chịu được kỷ luật tới đâu' },
];

export interface MatDocCon {
  cung: string;
  nhan: string;
  y: string;
  sao: string[];
  muon: boolean;
  cachCuc: string[];
  diem: number | null;
}

export interface ChangHoc {
  tuoiStart: number;
  tuoiEnd: number;
  namStart: number;
  namEnd: number;
  cung: string;
  sao: string[];
  diem: number | null;
  dangChay: boolean;
  /** Nhãn mô tả chặng đó ứng với quãng nào của việc học. */
  nhan: string;
}

export interface VoiChaMe {
  /** Cung Tử Tức trong lá số CHA/MẸ — cổ pháp đọc con cái ở đây. */
  cung: string;
  sao: string[];
  muon: boolean;
  kieu: KieuId | null;
  kieuTen: string;
  /** Kiểu của cha/mẹ (từ chính lá số cha/mẹ). */
  kieuChaMe: string;
  /** Cùng tính âm/dương → cùng cách phản ứng → dễ va nhau. */
  cungTinh: boolean;
}

export interface DayConProfile {
  namXem: number;
  tuoi: number | null;
  namSinh: number | null;
  gioiTinh: 'nam' | 'nu';
  moiLo: MoiLoDef;
  kieu: KieuDef;
  kieuPhu: KieuDef | null;
  phan: PhanKieu;
  hoc: KieuHoc;
  than: { cung: string };
  matDoc: MatDocCon[];
  changHoc: ChangHoc[];
  vanNam: VanNam | null;
  voiChaMe: VoiChaMe | null;
}

/* `VanNam` · `resolveVanNam` · `CAN_CAN` nay nằm ở `cong-so.ts` — dùng CHUNG
   cho cả 4 tool. Trước đây mỗi tool một bản chép, và cả bốn bản cùng sai một
   kiểu (lấy `mainScore` làm điểm của năm). */


/** Nhãn chặng theo TUỔI thật, không theo thứ tự đại vận: mốc đại vận dịch theo
 *  CỤC (thuỷ nhị cục khởi tuổi 2, hoả lục cục khởi tuổi 6) nên lấy chỉ số cứng
 *  là trượt tới bốn năm — cùng cái bẫy `computeCongSo` đã ghi. */
function nhanChang(tuoiStart: number, tuoiEnd: number): string {
  if (tuoiEnd <= 12) return 'Quãng tiểu học — hình thành nếp';
  if (tuoiStart >= 18) return 'Quãng vào đời — tự chịu trách nhiệm';
  if (tuoiStart >= 13) return 'Quãng dậy thì — tách khỏi cha mẹ';
  return 'Quãng chuyển cấp — bắt đầu tự lập';
}

/**
 * Hồ sơ nuôi dạy MỘT đứa trẻ.
 *
 * `lsChaMe` là TUỲ CHỌN — thiếu thì phần "hai bên với nhau" rỗng, mọi phần còn
 * lại vẫn đủ. Bắt nhập hai lá số mới xem được là dựng tường ở đúng chỗ người ta
 * hay bỏ ngang (bài học đã ghi ở T1).
 */
export function computeDayCon(
  ls: Laso,
  gioiTinh: 'nam' | 'nu',
  moiLoId: MoiLoId,
  lsChaMe?: Laso | null,
  namXem?: number,
): DayConProfile {
  const nam = namXem ?? (typeof ls.namXem === 'number' ? (ls.namXem as number) : currentNamXem());
  const phan = phanKieu(ls);
  const scores = (ls.cungScores as Record<string, Rec>) || {};
  const cachCucTung = (ls.cachCucTungCung as Record<string, string[]>) || {};
  const namSinh = namSinhTuLaSo(ls, nam);

  const matDoc: MatDocCon[] = MAT_DOC.map((m) => {
    const b = majorsOrBorrow(ls, palaceByName(ls, m.cung));
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

  // Chỉ lấy các đại vận CHẠM vào quãng 6–24 tuổi. Ngoài quãng đó là chuyện của
  // người trưởng thành — không phải việc cha mẹ đang hỏi, và càng xa thì càng
  // dễ bị đọc thành lời tiên tri về cả đời đứa trẻ.
  const dvHienTai = ls.daiVanHienTai as Rec | undefined;
  const changHoc: ChangHoc[] = ((ls.daiVans as Rec[]) || [])
    .filter(
      (d) =>
        typeof d?.tuoiStart === 'number' &&
        (d.tuoiEnd as number) >= 6 &&
        (d.tuoiStart as number) <= 24,
    )
    .slice(0, 3)
    .map((d) => {
      const p = ((ls.palaces as Rec[]) || [])[d.cungIdx as number];
      const b = majorsOrBorrow(ls, p);
      const sc = d.scoring as Rec | undefined;
      const tuoiStart = d.tuoiStart as number;
      const tuoiEnd = d.tuoiEnd as number;
      return {
        tuoiStart,
        tuoiEnd,
        namStart: namSinh ? namSinh + tuoiStart - 1 : 0,
        namEnd: namSinh ? namSinh + tuoiEnd - 1 : 0,
        cung: String(p?.cungName || ''),
        sao: b.stars.map(starLabel),
        diem: typeof sc?.tong === 'number' ? (sc.tong as number) : null,
        dangChay: !!dvHienTai && dvHienTai.tuoiStart === tuoiStart,
        nhan: nhanChang(tuoiStart, tuoiEnd),
      };
    });

  const vanNam = resolveVanNam(ls, nam);

  let voiChaMe: VoiChaMe | null = null;
  if (lsChaMe) {
    // Cổ pháp: con cái đọc ở cung TỬ TỨC của cha mẹ.
    const k = kieuCuaCung(lsChaMe, 'Tử Tức');
    const kCM = phanKieu(lsChaMe).kieu;
    voiChaMe = {
      cung: 'Tử Tức',
      sao: k.sao.map(starLabel),
      muon: k.muon,
      kieu: k.kieu,
      kieuTen: k.kieu ? KIEU[k.kieu].ten : '—',
      kieuChaMe: KIEU[kCM].ten,
      // Cùng tính âm/dương ⇒ cùng cách phản ứng ⇒ va nhau ngay trên cùng một
      // chuyện; khác tính thì một bên xông một bên giữ, dễ bù. Đây là luật âm
      // dương tương bổ mà phần Ghép Đội của tool Công Sở đã dùng.
      cungTinh: KIEU[kCM].amDuong === KIEU[phan.kieu].amDuong,
    };
  }

  return {
    namXem: nam,
    tuoi: typeof ls.tuoiXem === 'number' ? (ls.tuoiXem as number) : null,
    namSinh,
    // 🪤 Giới tính KHÔNG nằm trong lá số engine trả về — phải truyền vào. Đọc
    // `ls.gioiTinh` là luôn ra 'nam', sai im lặng cho một nửa số trẻ.
    gioiTinh,
    moiLo: MOI_LO[moiLoId],
    kieu: KIEU[phan.kieu],
    kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
    phan,
    hoc: KIEU_HOC[phan.kieu],
    than: { cung: thanCung(ls) },
    matDoc,
    changHoc,
    vanNam,
    voiChaMe,
  };
}

// 🪤 Lá số KHÔNG có trường `cungThan` — chỉ có cờ `isThan` trên từng cung.
function thanCung(ls: Laso): string {
  const p = ((ls.palaces as Rec[]) || []).find((x) => x && x.isThan === true);
  return String(p?.cungName || '');
}

/** Danh sách cung tool này KHÔNG đọc — dùng chung với `nguoi-khac` để không có
 *  hai bản danh sách trôi khỏi nhau. Test đối chiếu thẳng vào đây. */
export const CUNG_KHONG_DOC = KHONG_DOC;

/**
 * Dữ liệu PHẲNG gửi rail.
 *
 * ⚠️ `extractGenericContext` bỏ IM LẶNG mọi giá trị là object — nhét mảng hay
 * object vào đây là rail nhận vài dòng rồi luận chay.
 */
export function railData(p: DayConProfile): Record<string, string | number | boolean> {
  const d: Record<string, string | number | boolean> = {
    moiLoChaMe: p.moiLo.label,
    dieuChaMeCan: p.moiLo.can,
    kieuTre: p.kieu.ten,
    kieuTuTuong: p.kieu.tuTuong,
    kieuMotCau: p.kieu.motCau,
    dongLucTre: p.kieu.dongLuc,
    cachTiepThu: p.hoc.tiepThu,
    cachGiaoViec: p.hoc.giaoViec,
    cachDongVien: p.hoc.dongVien,
    kyLuatPhanTacDung: p.hoc.kyLuatHong,
    choHayHieuNham: p.hoc.hieuNham,
    thuConCanHoc: p.hoc.canHoc,
    dauHieuNhanBiet: p.hoc.dauHieu.join(' · '),
    laiKieu: p.phan.lai,
    cungThan: p.than.cung,
  };
  if (p.tuoi != null) d.tuoiTre = p.tuoi;
  if (p.kieuPhu) d.kieuPhu = p.kieuPhu.ten;
  for (const m of p.matDoc) {
    d['cung' + m.cung.replace(/\s+/g, '')] =
      m.sao.join(', ') +
      (m.muon ? ' (mượn xung chiếu)' : '') +
      (m.cachCuc.length ? ' — ' + m.cachCuc.join('; ') : '');
  }
  if (p.changHoc.length) {
    d.changHoc = p.changHoc
      .map(
        (c) =>
          `${c.tuoiStart}–${c.tuoiEnd} tuổi (${c.nhan})` +
          (c.diem == null ? '' : `, ${c.diem}/10`) +
          (c.dangChay ? ' — ĐANG Ở CHẶNG NÀY' : ''),
      )
      .join(' | ');
  }
  if (p.vanNam) {
    // ⚠️ Payload rail phải PHẲNG — `extractGenericContext` bỏ IM LẶNG mọi giá
    // trị là object, nên dẹp thành chuỗi qua `vanNamLine` — dùng CHUNG với
    // prompt để hai chỗ không bao giờ nói khác nhau. `LUAT_VAN_NAM` chặn rail
    // tự chấm một con số cho năm (cùng luật `execTraVanHan`).
    d.vanNamNay = vanNamLine(p.vanNam);
    d.luatVanNam = LUAT_VAN_NAM;
  }
  if (p.voiChaMe) {
    d.kieuChaMe = p.voiChaMe.kieuChaMe;
    d.cungTuTucChaMe = p.voiChaMe.sao.join(', ') + (p.voiChaMe.muon ? ' (mượn xung chiếu)' : '');
    d.kieuConTrongMatChaMe = p.voiChaMe.kieuTen;
    d.hopHayVa = p.voiChaMe.cungTinh
      ? 'cùng tính âm/dương — dễ va vào nhau'
      : 'khác tính âm/dương — dễ bù cho nhau';
  }
  return d;
}
