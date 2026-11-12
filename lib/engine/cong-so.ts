// lib/engine/cong-so.ts
// ============================================================
// TỬ VI CÔNG SỞ — đọc lá số bằng ngôn ngữ công việc.
//
// THUẦN deterministic: 0 lượt LLM, 0đ. Mọi con số lấy thẳng từ engine
// (`palaces`, `cungScores`, `daiVans[].scoring`, `tieuVanScores`) — module này
// KHÔNG tự an sao, KHÔNG tự chấm điểm lại.
//
// ── VÌ SAO CHIA 4 KIỂU, VÀ CHIA THEO GÌ ─────────────────────
// Trục phân loại là TỨ TƯỢNG của Kinh Dịch (lão dương · thiếu âm · thiếu
// dương · lão âm) áp lên 14 chính tinh, KHÔNG phải mượn một bộ trắc nghiệm
// tính cách phương Tây nào. Bốn nhóm rơi đúng vào các bộ sao kinh điển:
//
//   老陽 Khai sáng  = Sát · Phá · Tham + Liêm Trinh   (bộ Sát Phá Tham)
//   少陰 Lãnh đạo   = Tử · Phủ · Vũ · Tướng           (bộ Tử Phủ Liêm Vũ Tướng)
//   少陽 Hỗ trợ     = Nhật · Cự · Cơ
//   老陰 Hợp tác    = Nguyệt · Lương · Đồng           (bộ Cơ Nguyệt Đồng Lương)
//
// ⚠️ TÊN GỌI "Khai sáng / Lãnh đạo / Hỗ trợ / Hợp tác" LÀ NHÃN HIỆN ĐẠI do
// trang đặt cho dễ đọc — cổ thư không gọi thế. Cấu trúc bốn nhóm thì có nền
// cổ pháp thật (tứ tượng + bộ sao). Trang PHẢI nói rõ chỗ này; nhập nhèm là
// mượn uy tín cổ thư cho một cái tên mình vừa nghĩ ra.
//
// ⚠️ KHÔNG dùng chữ "khoa học / thống kê / trắc nghiệm đã kiểm định". Đây là
// một KHUNG ĐỌC, không phải công cụ tâm lý có đối chứng. Không có nghiên cứu
// nào đứng sau nó, và nói ngược lại là hứa thứ không có.
//
// ── VÌ SAO DÙNG TOẠ ĐỘ CHỨ KHÔNG GÁN NHÃN CỨNG ──────────────
// Đo trên 10.368 lá số (1972–2005 × 12 tháng × 3 ngày × 12 giờ × 2 giới):
//   • 16,2% lá số Mệnh VÔ CHÍNH DIỆU  → phải mượn xung chiếu
//   • 49,8% Mệnh có ≥2 chính tinh, trong đó 27,6% LẪN HAI NHÓM
//   • 🔑 các cặp lẫn nhóm CHỈ có hai kiểu: khai-sáng+lãnh-đạo (14,1%) và
//     hỗ-trợ+hợp-tác (13,5%) — KHÔNG lá số nào lẫn qua ranh giới âm/dương.
//     Nên trục Âm/Dương chia đúng 50,0/50,0 và KHÔNG BAO GIỜ mơ hồ; chỉ trục
//     lão/thiếu mới cần phân xử.
//
// Ba luật đã cân, đo trên cùng bộ 10.368 lá số:
//   sao đầu tiên   → 28,6 / 27,6 / 22,4 / 21,4  (phụ thuộc thứ tự engine trả
//                     — tuỳ tiện, đổi thứ tự an sao là đổi kết quả)
//   sao sáng nhất  → 28,6 / 25,6 / 24,4 / 21,4
//   ✅ TOẠ ĐỘ      → 27,0 / 26,8 / 23,2 / 23,0  (đều nhất) · 13,2% sát ranh
//
// Toạ độ thắng vì (a) trải đều nhất, (b) trả về HAI CON SỐ nên vẽ được, và
// (c) nêu được ca lưỡng lự thay vì ép nhãn — 13,2% ca sát ranh được gọi thẳng
// là "kiểu lai". Ép nhãn cho nhóm đó là nói chắc điều mình không chắc.
// ============================================================

import type { Laso } from '@/lib/engine/laso';
import { MENH_ROLE, resolveCareerBase, type CareerBase, type CareerMa } from '@/lib/engine/past-life';
import { currentNamXem } from '@/lib/engine/namxem';
import { chonNhanh, type DomainId, type NhanhKetQua } from '@/lib/engine/nghe-nghiep';
import type { KieuId, TrangThai, KieuDef, LuanNacMa, GhepMa } from '@/lib/engine/cong-so-terms';
import {
  TRANG_THAI_LABEL,
  KIEU,
  RADAR_CUNG,
  NAC_NGHE,
  VAI_CUNG,
  DOMAIN_NGANH,
  VAI_THEO_KIEU,
  QUY_MO_THEO_BAC,
  LOI_THEO_TRANG_THAI,
  luanNac,
  goiYGhep,
} from '@/lib/engine/cong-so-terms';

// Bảng chữ + khuôn câu (thuần, không phụ thuộc engine) nằm ở `cong-so-terms.ts` để bộ dò dịch (`check:terms`) nạp được
// mà không kéo cả engine lá số. Re-export giữ nguyên bề mặt API cũ của module này.
export { TRANG_THAI_LABEL, KIEU, RADAR_CUNG, NAC_NGHE };
export type { KieuId, TrangThai, KieuDef, LuanNacMa, GhepMa };

type Rec = Record<string, unknown>;
interface StarObj {
  ten: string;
  brightness?: string;
  hoa?: string | null;
}


export function resolveTrangThai(v?: string | null): TrangThai {
  return v && v in TRANG_THAI_LABEL ? (v as TrangThai) : 'nhan-vien';
}

// ── Bảng tứ tượng ───────────────────────────────────────────
// x = trục ÂM/DƯƠNG  (+1 dương "tranh"  · −1 âm "nhường")
// y = trục LÃO/THIẾU (+1 xông/bộc phát  · −1 trầm/tiết chế)
//
// 老陽 = dương thuần        → (+1, +1)
// 少陰 = "dương ngoài, âm trong" → (+1, −1)
// 少陽 = "âm ngoài, dương trong" → (−1, +1)
// 老陰 = âm thuần           → (−1, −1)
const STAR_AXIS: Record<string, readonly [number, number]> = {
  // 老陽 — Khai sáng
  'Thất Sát': [1, 1],
  'Phá Quân': [1, 1],
  'Liêm Trinh': [1, 1],
  'Tham Lang': [1, 1],
  // 少陰 — Lãnh đạo
  'Tử Vi': [1, -1],
  'Thiên Phủ': [1, -1],
  'Vũ Khúc': [1, -1],
  'Thiên Tướng': [1, -1],
  // 少陽 — Hỗ trợ
  'Thái Dương': [-1, 1],
  'Cự Môn': [-1, 1],
  'Thiên Cơ': [-1, 1],
  // 老陰 — Hợp tác
  'Thái Âm': [-1, -1],
  'Thiên Lương': [-1, -1],
  'Thiên Đồng': [-1, -1],
};

/** Độ sáng → hệ số. Dải hẹp (0,6–1,0) CÓ CHỦ ĐÍCH: sao hãm vẫn là sao đó, nó
 * chỉ phát huy kém hơn chứ không đổi bản chất sang nhóm khác. Cho hệ số về 0
 * thì một lá số Mệnh có đúng một chính tinh hãm sẽ rơi về gốc toạ độ và bị
 * phân kiểu bằng… cung Quan Lộc, tức đọc tính cách của người khác. */
const BRIGHT_W: Record<string, number> = {
  Miếu: 1.0,
  Vượng: 0.93,
  'Đắc địa': 0.87,
  Đắc: 0.87,
  Bình: 0.73,
  'Bình hòa': 0.73,
  'Bình hoà': 0.73,
  Hãm: 0.6,
};
const brightW = (b?: string) => BRIGHT_W[(b || '').trim()] ?? 0.8;

/** Trọng số cung Quan Lộc so với cung Mệnh khi tính toạ độ.
 * Mệnh là gốc tính cách nên phải nặng hơn; nhưng đây là bản đọc NGHỀ NGHIỆP
 * nên bỏ hẳn Quan Lộc là vứt đúng cung nói về công việc. 0,6 giữ được Mệnh
 * luôn thắng khi hai cung mâu thuẫn, mà Quan Lộc vẫn đủ sức kéo lệch những ca
 * Mệnh yếu (chính tinh hãm) — đúng ca cần được kéo. */
const W_QUAN = 0.6;


export const KIEU_IDS = Object.keys(KIEU) as KieuId[];

// ── Helper đọc lá số ────────────────────────────────────────
const palaces = (ls: Laso): Rec[] => ((ls.palaces as Rec[]) || []);

export function palaceByName(ls: Laso, name: string): Rec | undefined {
  return palaces(ls).find((p) => p.cungName === name);
}

function majors(p: Rec | undefined): StarObj[] {
  return ((p?.majorStars as StarObj[]) || []).filter((s) => s && s.ten);
}

/**
 * Chính tinh của một cung; cung VÔ CHÍNH DIỆU thì MƯỢN cung xung chiếu.
 *
 * Cổ pháp (Tân Biên 8.45) cho phép mượn xung chiếu khi cung trống — và đo được
 * 16,2% lá số có Mệnh vô chính diệu, tức bỏ qua bước này là một phần sáu người
 * xem không phân được kiểu.
 */
export function majorsOrBorrow(ls: Laso, p: Rec | undefined): { stars: StarObj[]; muon: boolean } {
  const own = majors(p);
  if (own.length) return { stars: own, muon: false };
  const xung = p?.xungChieuCung as Rec | undefined;
  const borrowed = majors(xung);
  if (borrowed.length) return { stars: borrowed, muon: true };
  // Không có cả xungChieuCung (không nên xảy ra với engine hiện tại) — tra bằng
  // chỉ số đối cung cho chắc, thay vì trả rỗng làm hỏng cả bản đọc.
  const idx = typeof p?.idx === 'number' ? (p.idx as number) : -1;
  if (idx >= 0) return { stars: majors(palaces(ls)[(idx + 6) % 12]), muon: true };
  return { stars: [], muon: false };
}

export const starLabel = (s: StarObj) => s.ten + (s.brightness ? ` (${s.brightness})` : '') + (s.hoa ? ` [Hóa ${s.hoa}]` : '');

/** Kiểu của một CUNG bất kỳ (dùng cho Phụ Mẫu / Nô Bộc / Huynh Đệ ở phần ghép
 * đội). Ở đây gán nhãn đơn giản theo đa số vì chỉ cần một nhãn để nói chuyện,
 * không cần toạ độ. */
export function kieuCuaCung(ls: Laso, name: string): { kieu: KieuId | null; sao: StarObj[]; muon: boolean } {
  const { stars, muon } = majorsOrBorrow(ls, palaceByName(ls, name));
  let bx = 0;
  let by = 0;
  for (const s of stars) {
    const ax = STAR_AXIS[s.ten];
    if (!ax) continue;
    const w = brightW(s.brightness);
    bx += ax[0] * w;
    by += ax[1] * w;
  }
  if (bx === 0 && by === 0) return { kieu: null, sao: stars, muon };
  return { kieu: quadrant(bx, by), sao: stars, muon };
}

function quadrant(x: number, y: number): KieuId {
  if (x >= 0) return y >= 0 ? 'khai-sang' : 'lanh-dao';
  return y >= 0 ? 'ho-tro' : 'hop-tac';
}

// ── 1. Phân kiểu ────────────────────────────────────────────

export interface PhanKieu {
  kieu: KieuId;
  /** Trục âm/dương: dương (tranh) > 0, âm (nhường) < 0. */
  x: number;
  /** Trục lão/thiếu: xông > 0, trầm < 0. */
  y: number;
  /** Toạ độ đã chuẩn hoá về [-1, 1] để vẽ. */
  xNorm: number;
  yNorm: number;
  /** Sát ranh giới → nói thẳng là kiểu lai, KHÔNG ép nhãn. Đo được 13,2%. */
  lai: boolean;
  /** Kiểu đứng thứ hai — chỉ có nghĩa khi `lai`. */
  kieuPhu: KieuId | null;
  saoMenh: string[];
  saoQuan: string[];
  muonMenh: boolean;
  muonQuan: boolean;
  /** Vai trò suy từ chính tinh cung Mệnh, kèm trích dẫn (dùng chung bảng với
   * tool Chân Dung Tiền Kiếp — một nguồn, hai chỗ đọc). */
  vaiTro: { role: string; source: string } | null;
}

/** Ngưỡng "sát ranh giới". 0,25 trên thang toạ độ thô (dải đo được ±3,1) cho
 * ra 13,2% ca lai — đủ hiếm để nhãn còn nghĩa, đủ nhiều để không giấu đi ca
 * thật sự lưỡng lự. */
const NGUONG_LAI = 0.25;

export function phanKieu(ls: Laso): PhanKieu {
  const menhP = palaceByName(ls, 'Mệnh');
  const quanP = palaceByName(ls, 'Quan Lộc');
  const m = majorsOrBorrow(ls, menhP);
  const q = majorsOrBorrow(ls, quanP);

  let x = 0;
  let y = 0;
  const add = (stars: StarObj[], w: number) => {
    for (const s of stars) {
      const ax = STAR_AXIS[s.ten];
      if (!ax) continue;
      const k = w * brightW(s.brightness);
      x += ax[0] * k;
      y += ax[1] * k;
    }
  };
  add(m.stars, 1);
  add(q.stars, W_QUAN);

  const kieu = quadrant(x, y);
  const lai = Math.abs(x) < NGUONG_LAI || Math.abs(y) < NGUONG_LAI;
  // Kiểu phụ = lật đúng cái trục đang lưỡng lự. Lật cả hai trục thì ra kiểu
  // đối xứng chéo — thứ lá số này KHÔNG hề gần.
  let kieuPhu: KieuId | null = null;
  if (lai) {
    kieuPhu = Math.abs(x) < Math.abs(y) ? quadrant(-x, y) : quadrant(x, -y);
    if (kieuPhu === kieu) kieuPhu = null;
  }

  // Chuẩn hoá để vẽ: dải thô đo được xấp xỉ ±3,2; kẹp về [-1,1].
  const norm = (v: number) => Math.max(-1, Math.min(1, v / 3.2));

  const menhKey = m.stars.map((s) => s.ten).sort().join('+');
  const vaiTro = MENH_ROLE[menhKey] || (m.stars[0] ? MENH_ROLE[m.stars[0].ten] : undefined) || null;

  return {
    kieu,
    x: +x.toFixed(3),
    y: +y.toFixed(3),
    xNorm: +norm(x).toFixed(3),
    yNorm: +norm(y).toFixed(3),
    lai,
    kieuPhu,
    saoMenh: m.stars.map(starLabel),
    saoQuan: q.stars.map(starLabel),
    muonMenh: m.muon,
    muonQuan: q.muon,
    vaiTro,
  };
}

// ── 2. Radar 12 chiều ───────────────────────────────────────
// Đọc 12 cung qua LĂNG KÍNH CÔNG VIỆC. Nghĩa gốc từng cung không đổi — chỉ
// đổi cách gọi cho khớp việc người ta đang hỏi. Điểm lấy nguyên `cungScores`
// của engine, KHÔNG chấm lại.


export interface RadarItem {
  cung: string;
  nhan: string;
  y: string;
  diem: number;
  /** Cung này có được vận NĂM NAY chiếu tới không (tiểu hạn / lưu niên). */
  namNay: 'tieu-han' | 'luu-nien' | 'ca-hai' | null;
  sao: string[];
  cachCuc: string[];
}

// ── 3. Lộ trình 40 năm ──────────────────────────────────────
// Bốn đại vận liên tiếp phủ quãng đi làm. Nhãn nấc là NHÃN CHẶNG ĐỜI NGHỀ,
// không phải lời hứa chức vụ — người không đi con đường quản lý vẫn đọc được
// (nấc 3 là "làm chủ chuyên môn" chứ không nhất thiết là ghế giám đốc).


export interface NacDaiVan {
  stt: number;
  nac: string;
  nacY: string;
  tuoiStart: number;
  tuoiEnd: number;
  namStart: number;
  namEnd: number;
  cung: string;
  sao: string[];
  muon: boolean;
  diem: number | null;
  flag: string;
  /** Tính âm/dương của chính đại vận này. */
  tinh: 'duong' | 'am' | null;
  /** Đại vận CÙNG tính với bản mệnh → thuận đà; KHÁC tính → phải đổi cách làm.
   * Đây là chỗ "vận" gặp "mệnh", và nó computable chứ không phải lời văn. */
  hopMenh: boolean | null;
  dangChay: boolean;
  luan: string;
  /** Mã khuôn câu `luan` (khoá `luan.<mã>` của bản dịch) — additive, KHÔNG hiển thị. */
  luanMa: LuanNacMa;
}

// ── 4. Ghép đội ─────────────────────────────────────────────
// ⚠️ CHỌN CUNG THEO CỔ PHÁP, không theo biến thể hiện đại:
//   • cấp trên  → PHỤ MẪU (cung bề trên/trưởng thượng)
//   • cấp dưới  → NÔ BỘC  (cung tôi tớ, thuộc hạ, bạn nghề)
//   • đồng sự   → HUYNH ĐỆ (cung anh em, người ngang hàng)
// Có tài liệu hiện đại đọc cấp trên ở cung TẬT ÁCH; đó là biến thể của một
// tác giả, không phải cổ pháp, và không kiểm chứng được — nên không dùng.

export interface GhepDoi {
  vai: string;
  cung: string;
  sao: string[];
  muon: boolean;
  kieu: KieuId | null;
  kieuTen: string;
  /** Kiểu BỔ KHUYẾT nên tìm — theo luật âm dương tương bổ. */
  nenTim: KieuId;
  goiY: string;
  /** Mã khuôn câu `goiY` (khoá `ghep.<mã>`) — additive, KHÔNG hiển thị. Biến `{kieu}`/`{nen}` client lấy từ `kieu`/`nenTim`. */
  goiYMa: GhepMa;
}

/** Luật bù: âm ghép dương. Trong mỗi nửa, chọn kiểu bù cả trục nhịp cho đủ đôi
 * — Khai sáng (xông, dương) ↔ Hợp tác (trầm, âm); Lãnh đạo (trầm, dương) ↔
 * Hỗ trợ (xông, âm). Đây là "chéo góc" trên lưới toạ độ, tức bù CẢ HAI trục. */
/**
 * Vận của MỘT năm. 🔑 CỐ Ý KHÔNG có trường "điểm của năm".
 *
 * `tieuVanScores[].mainScore` trông như điểm của năm nhưng KHÔNG phải: nó là
 * `interpolate(splinePts, tuoi)` — nội suy Catmull-Rom giữa các mốc
 * `daiVans[].scoring.tong`, tức đường LÀM MƯỢT để vẽ biểu đồ nến. Nó không đọc
 * MỘT ngôi sao nào của tiểu hạn hay lưu niên năm đó, nên nó không thể là điểm
 * của năm — nó là điểm của ĐẠI VẬN, đã bôi trơn qua ranh giới.
 *
 * Hệ quả đo được, lệch CẢ HAI CHIỀU. Lá số 9/5/1984 nam giờ Sửu:
 *   2024–25 nằm trong đại vận 3,6/10 → đường mượt thổi lên 5,6 và 6,1
 *   2026 vào đại vận 8,7/10        → đường mượt mới dìm xuống 6,7
 * Trên 912 lá số, 8,4% lệch ≥1,5 điểm so với đại vận chứa năm đó (lớn nhất 3,6).
 *
 * Đây đúng là luật `execTraVanHan` (`lib/agent/tools.ts`) đã chốt và rail vẫn
 * đang nói với người dùng: *"TIỂU VẬN KHÔNG có điểm riêng… KHÔNG tự gán
 * 'điểm/10' cho năm"*. Đại vận là tầng DUY NHẤT có điểm/10 thật.
 *
 * 🔑 Định nghĩa DUY NHẤT cho cả 4 tool (`cong-so` · `day-con` · `nguoi-khac` ·
 * `nhan-mach`) — trước đây mỗi tool một bản chép, và cả bốn bản cùng sai một
 * kiểu. Bốn bản của cùng một phép đọc thì sớm muộn cũng trôi khỏi nhau.
 */
export interface VanNam {
  nam: number;
  /** Khung đại vận chứa năm này — tầng duy nhất có điểm/10 thật. */
  khung: { tuoiStart: number; tuoiEnd: number; diem: number | null } | null;
  tieuHanCung: string | null;
  luuNienCung: string | null;
  /** Cán cân cát/sát của năm, gộp sao 3 cung hạn (đại vận + tiểu hạn + lưu niên). */
  catSat: { cat: number; sat: number; canCan: string } | null;
}

/**
 * 🪤 `tieuVanScores[].direction` KHÔNG phải "đà" (xu hướng điểm) — nó là dấu của
 * `catCount − satCount`, tức CÁN CÂN cát/sát. Đọc nó thành "đà đang lên / đi
 * ngang" là dịch sai nghĩa: đo trên 912 lá số, nó lệch với xu hướng thật của
 * `mainScore` **67,7%** số ca; riêng ca `flat` thì **65,3%** là điểm vẫn đang
 * chạy chứ không hề "đi ngang" (lá số 9/5/1984: `flat` trong khi đường vận leo
 * 6,7 → 8,5 suốt bốn năm). Nay gọi đúng tên thứ nó đo.
 */
const CAN_CAN: Record<string, string> = {
  up: 'cát nhiều hơn sát',
  down: 'sát nhiều hơn cát',
  flat: 'cát sát cân nhau',
};

/** Đọc vận của một năm từ lá số. Nguồn DUY NHẤT — xem chú thích `VanNam`. */
export function resolveVanNam(ls: Laso, nam: number): VanNam | null {
  const tvs = (ls.tieuVanScores as Rec[]) || [];
  const tv = tvs.find((t) => t.nam === nam);
  if (!tv) return null;
  // Lấy đại vận theo `dvIdx` của CHÍNH năm đó, không lấy `daiVanHienTai`: hai
  // cái chỉ trùng nhau khi năm xem đúng là năm nay.
  const dv = ((ls.daiVans as Rec[]) || [])[Number(tv.dvIdx)];
  const dvSc = dv?.scoring as Rec | undefined;
  return {
    nam,
    khung: dv
      ? {
          tuoiStart: Number(dv.tuoiStart) || 0,
          tuoiEnd: Number(dv.tuoiEnd) || 0,
          diem: typeof dvSc?.tong === 'number' ? (dvSc.tong as number) : null,
        }
      : null,
    tieuHanCung: (tv.tieuHanCung as string) || null,
    luuNienCung: (tv.luuNienCung as string) || null,
    catSat:
      typeof tv.catCount === 'number' && typeof tv.satCount === 'number'
        ? {
            cat: tv.catCount as number,
            sat: tv.satCount as number,
            canCan: CAN_CAN[String(tv.direction || '')] || 'cát sát cân nhau',
          }
        : null,
  };
}

/** Một dòng chữ mô tả vận năm — dùng chung cho payload rail (phải PHẲNG) và
 *  cho prompt, để hai chỗ không bao giờ nói khác nhau. */
/**
 * `anCung` = KHÔNG nêu tên cung tiểu hạn / lưu niên.
 *
 * 🔒 Dùng cho tool đọc lá số NGƯỜI KHÁC. Cung hạn rất hay rơi đúng vào Tật Ách
 * / Tài Bạch / Điền Trạch — tức những cung `KHONG_DOC` đã chặn ở tầng dữ liệu
 * vì người được xem KHÔNG có mặt để đồng ý. Nêu tên chúng ở dòng vận năm là mở
 * lại đúng cánh cửa đó qua ngõ sau: model có tên cung là luận được về bệnh tật,
 * tiền riêng, nhà cửa của họ. Đo trên `git HEAD`: **23/48 lá số (~48%)** lọt
 * theo đường này.
 *
 * Mặc định GIỮ NGUYÊN hành vi cũ — tool đọc lá số của CHÍNH người hỏi (Công Sở,
 * Dạy Con) vẫn nêu tên cung, ở đó người ta tự đưa lá số mình vào nên không có
 * ranh giới nào bị vượt.
 */
export function vanNamLine(v: VanNam | null, opts?: { anCung?: boolean }): string {
  if (!v) return '—';
  const an = opts?.anCung === true;
  const bit = [
    v.khung
      ? `khung đại vận ${v.khung.tuoiStart}–${v.khung.tuoiEnd} tuổi ${v.khung.diem == null ? 'chưa chấm' : v.khung.diem + '/10'}`
      : '',
    !an && v.tieuHanCung ? `tiểu hạn cung ${v.tieuHanCung}` : '',
    !an && v.luuNienCung ? `lưu niên cung ${v.luuNienCung}` : '',
    v.catSat ? `cát ${v.catSat.cat}/sát ${v.catSat.sat} — ${v.catSat.canCan}` : '',
  ].filter(Boolean);
  return bit.length ? `${v.nam}: ${bit.join('; ')}` : '—';
}

/** Câu dặn model, đi kèm MỌI chỗ đưa `vanNamLine` vào prompt — cùng luật với
 *  `execTraVanHan`. Không dặn thì model tự chấm một con số cho năm rồi nói chắc. */
export const LUAT_VAN_NAM =
  'Riêng NĂM thì KHÔNG có điểm — đừng gán "điểm/10" cho năm. Điểm trên là của KHUNG đại vận, ' +
  'nó chỉ nới hay bó BIÊN ĐỘ (khung cao thì cái tốt của năm bung rõ, cái khó nhẹ bớt; khung thấp thì ngược lại). ' +
  'Tốt/xấu của năm đọc ở cung tiểu hạn + lưu niên và cán cân cát/sát.';

/** Bản đi kèm `vanNamLine(v,{anCung:true})` — không trỏ model về cung đã bị giấu. */
export const LUAT_VAN_NAM_AN_CUNG =
  'Riêng NĂM thì KHÔNG có điểm — đừng gán "điểm/10" cho năm. Điểm trên là của KHUNG đại vận, ' +
  'nó chỉ nới hay bó BIÊN ĐỘ (khung cao thì cái tốt của năm bung rõ, cái khó nhẹ bớt; khung thấp thì ngược lại). ' +
  'Tốt/xấu của năm đọc ở cán cân cát/sát. Cung tiểu hạn và lưu niên CỐ Ý không đưa cho bạn — ' +
  'đừng đoán tên chúng, và đừng luận sức khoẻ/tiền riêng/nhà cửa của người này.';

export const BU: Record<KieuId, KieuId> = {
  'khai-sang': 'hop-tac',
  'hop-tac': 'khai-sang',
  'lanh-dao': 'ho-tro',
  'ho-tro': 'lanh-dao',
};

/**
 * Năm sinh suy từ chính lá số.
 *
 * 🪤 Lá số KHÔNG có trường `namXem` (chỉ có `tuoiXem`) — lấy nó ra là
 * `undefined` rồi mọi năm hiện trên trang thành 0, IM LẶNG. Suy từ
 * `tieuVanScores`: mỗi ô đã mang CẶP (nam, tuoi) nên không phải giả định gì về
 * quy ước tuổi. `tuoi` ở đây là TUỔI MỤ ⇒ năm = namSinh + tuổi − 1; quên trừ 1
 * là mọi mốc lệch đúng một năm mà nhìn không ra.
 *
 * Tách ra khỏi `computeCongSo` để tool Dạy Con dùng CHUNG — hai bản của cùng
 * một phép quy đổi tuổi thì sớm muộn cũng trôi khỏi nhau.
 */
export function namSinhTuLaSo(ls: Laso, namXem: number): number | null {
  const tvs = (ls.tieuVanScores as Rec[]) || [];
  const moc = tvs.find((t) => typeof t.nam === 'number' && typeof t.tuoi === 'number');
  if (moc) return (moc.nam as number) - (moc.tuoi as number) + 1;
  return typeof ls.tuoiXem === 'number' ? namXem - (ls.tuoiXem as number) + 1 : null;
}

// ── 5. Gợi ngành nghề cụ thể ────────────────────────────────
// Đọc chức phận ở cung Quan Lộc qua `resolveCareerBase` (past-life.ts) — CÙNG
// một đường tra với tool Chân Dung Tiền Kiếp, tức dùng được bảng CẶP chính
// tinh `PAIR_OCCUPATION_TABLE`. Chính chương Quan Lộc của Tân Biên luận theo
// CẶP ("Vũ + Phủ" là chức tài chánh, "Vũ + Tham" là kinh doanh, "Vũ" đơn thủ
// mới là võ nghiệp) nên đọc theo cặp là bám sát sách hơn đọc sao đơn.
// Đo trên 10.368 lá số: 49,6% lá số tra được bảng cặp, cả 24 cặp đều xuất hiện.
//
// 🔑 BA TRỤC ĐỘC LẬP, KHÔNG VIẾT MA TRẬN:
//   LĨNH VỰC ← domain (7 nhóm, từ cung Quan Lộc)  → "làm ở ngành nào"
//   VAI TRÒ  ← kiểu người (4 nhóm, từ cung Mệnh)  → "làm việc gì trong ngành đó"
//   QUY MÔ   ← bậc chức phận (4 bậc engine chấm)  → "gánh tới đâu"
// Viết 7 + 4 + 4 = 15 khối thay vì 112 ô ma trận, và mỗi trục sửa được riêng.
//
// ⚠️ Đây là GỢI Ý HƯỚNG, không phải chỉ định nghề. Danh sách ngành cố ý nêu
// nhiều lựa chọn trong cùng một chất việc — cổ thư nói về TÍNH CHẤT công việc
// (đối mặt hay bàn giấy, cầm người hay cầm nghề), nó không biết ngành nghề
// hiện đại nào tồn tại. Thu về đúng một nghề là bịa thêm phần sách không nói.



export interface NganhGoiY {
  linhVuc: string;
  chatViec: string;
  nganh: string[];
  vaiTro: string;
  quyMo: string;
  /** Bậc chức phận + điểm, hiện ở khối cơ sở. */
  bac: string;
  bacDiem: number;
  bacChiTiet: string[];
  /** Sao (hoặc CẶP sao) quyết định lĩnh vực. */
  sao: string;
  laCap: boolean;
  muon: boolean;
  /** Câu chức phận theo lối cổ + trích dẫn Tân Biên — để nói được "dựa vào đâu". */
  chucPhanCo: string;
  nguon: string;
  /** Sắc thái từ phụ tinh + tứ hoá tại Quan Lộc. */
  sacThai: string[];
  /** Mã bảng nguồn của `linhVuc`/`chatViec`/`nganh` (khoá `nganh.<mã>.*`) và của `quyMo` (`quymo.<mã>`) — additive. */
  domainMa: string;
  quyMoMa: string;
  /** Mã tra `past-life` của bậc · khoản chấm · chức phận · trích dẫn · sắc thái (additive, xem `CareerMa`). */
  ma: CareerMa;
}

// `cb` truyền VÀO chứ không tự gọi lại `resolveCareerBase` — tầng nhánh cũng
// cần đúng bản đọc chức phận đó. Gọi hai lần là mở đường cho hai bản trôi khỏi
// nhau, đúng bẫy repo đã trả giá ở can chi ngày.
function goiYNganh(cb: CareerBase, kieu: KieuId): NganhGoiY {
  const d = DOMAIN_NGANH[cb.domain];
  const quyMoMa = cb.tier in QUY_MO_THEO_BAC ? cb.tier : 'giua';
  return {
    linhVuc: d.linhVuc,
    chatViec: d.chatViec,
    nganh: d.nganh,
    vaiTro: VAI_THEO_KIEU[kieu],
    quyMo: QUY_MO_THEO_BAC[quyMoMa],
    bac: cb.tierLabel,
    bacDiem: cb.tierScore,
    bacChiTiet: cb.tierBreakdown,
    sao: cb.star,
    laCap: cb.laCap,
    muon: cb.borrowed,
    chucPhanCo: cb.desc,
    nguon: cb.source,
    sacThai: cb.notes,
    domainMa: cb.domain,
    quyMoMa,
    ma: cb.ma,
  };
}

// ── 6. Lời khuyên theo tình trạng nghề ──────────────────────


// ── Kết quả ─────────────────────────────────────────────────

/** Khoá `menh.<sao>.role` của đúng mục `MENH_ROLE` mà `phanKieu` đã chọn (so theo THAM CHIẾU — cùng một đối tượng). */
function vaiTroMaCua(v: PhanKieu['vaiTro']): string | null {
  const sao = v ? Object.keys(MENH_ROLE).find((k) => MENH_ROLE[k] === v) : undefined;
  return sao ? `menh.${sao}.role` : null;
}

export interface CongSoProfile {
  namXem: number;
  trangThai: TrangThai;
  trangThaiLabel: string;
  kieu: KieuDef;
  kieuPhu: KieuDef | null;
  phan: PhanKieu;
  radar: RadarItem[];
  loTrinh: NacDaiVan[];
  vanNam: VanNam | null;
  doi: GhepDoi[];
  loiTrangThai: string;
  /**
   * Khoá `past-life` (`menh.<sao>.role`) của `phan.vaiTro` — mã tra ADDITIVE cho client dịch. Đặt ở CẤP HỒ SƠ chứ không
   * trong `phan`: `phanKieu` còn đi vào payload Dạy Con/Người Khác (lưu `portrait_cache`) — thêm trường ở đó là đổi
   * `SHAPE` của hai tool kia mà không đem lại gì cho chúng.
   */
  vaiTroMa: string | null;
  /** Gợi ngành nghề cụ thể — đọc chức phận cung Quan Lộc theo CẶP chính tinh. */
  nganh: NganhGoiY;
  /**
   * TẦNG 4 — nhánh cụ thể trong lĩnh vực (xem `lib/engine/nghe-nghiep.ts`).
   * Tách hẳn khỏi `nganh` chứ không nhét vào trong: đây là phần TRẢ TIỀN, và
   * đường tiền phải cắt được bằng một dòng chứ không phải bằng cách lọc field
   * — đúng khuôn W1 đã dựng cho 3 tool cẩm nang.
   */
  nhanh: NhanhKetQua;
  quanLoc: { sao: string[]; muon: boolean; diem: number | null; cachCuc: string[] };
}

export function computeCongSo(ls: Laso, trangThai: TrangThai = 'nhan-vien', namXem?: number): CongSoProfile {
  const nam = namXem ?? (typeof ls.namXem === 'number' ? (ls.namXem as number) : currentNamXem());
  const phan = phanKieu(ls);
  const scores = (ls.cungScores as Record<string, Rec>) || {};
  const cachCucTung = (ls.cachCucTungCung as Record<string, string[]>) || {};

  // ── Vận năm nay: engine đã tính sẵn tiểu hạn / lưu niên đóng ở cung nào.
  // CỐ Ý không tự chấm điểm 12 cung cho riêng năm nay — engine không có số đó,
  // bịa ra một bộ điểm "năm nay" là dựng dữ liệu. Cùng lý do, `resolveVanNam`
  // KHÔNG trả điểm cho năm mà trả điểm của KHUNG đại vận.
  const vanNam = resolveVanNam(ls, nam);
  // MỘT lượt đọc chức phận, dùng chung cho cả `nganh` (tầng 1–3) lẫn `nhanh`
  // (tầng 4) — xem chú thích ở `goiYNganh`.
  const careerBase = resolveCareerBase(ls);

  const radar: RadarItem[] = RADAR_CUNG.map((r) => {
    const p = palaceByName(ls, r.cung);
    const sc = scores[r.cung];
    const isTH = vanNam?.tieuHanCung === r.cung;
    const isLN = vanNam?.luuNienCung === r.cung;
    return {
      cung: r.cung,
      nhan: r.nhan,
      y: r.y,
      diem: typeof sc?.tong === 'number' ? (sc.tong as number) : 0,
      namNay: isTH && isLN ? 'ca-hai' : isTH ? 'tieu-han' : isLN ? 'luu-nien' : null,
      sao: majors(p).map(starLabel),
      cachCuc: (cachCucTung[r.cung] || []).slice(0, 3),
    };
  });

  // ── Lộ trình 40 năm: 4 đại vận liên tiếp phủ quãng đi làm.
  // Chọn đại vận đầu tiên có tuoiEnd >= 25 (khúc thật sự vào nghề) thay vì
  // cứng nhắc lấy đại vận thứ 3: mốc đại vận dịch theo CỤC (thuỷ nhị cục khởi
  // tuổi 2, hoả lục cục khởi tuổi 6) nên lấy chỉ số cứng sẽ trượt tới 4 năm.
  const dvs = ((ls.daiVans as Rec[]) || []).filter((d) => typeof d?.tuoiStart === 'number');
  let start = dvs.findIndex((d) => (d.tuoiEnd as number) >= 25);
  if (start < 0) start = Math.min(2, Math.max(0, dvs.length - 4));
  const dvHienTai = ls.daiVanHienTai as Rec | undefined;
  const namSinh = namSinhTuLaSo(ls, nam);

  const loTrinh: NacDaiVan[] = dvs.slice(start, start + 4).map((dv, i) => {
    const p = palaces(ls)[dv.cungIdx as number];
    const b = majorsOrBorrow(ls, p);
    let tinh: 'duong' | 'am' | null = null;
    let bx = 0;
    for (const s of b.stars) {
      const ax = STAR_AXIS[s.ten];
      if (ax) bx += ax[0] * brightW(s.brightness);
    }
    if (b.stars.length) tinh = bx >= 0 ? 'duong' : 'am';
    const hopMenh = tinh ? tinh === KIEU[phan.kieu].amDuong : null;
    const sc = dv.scoring as Rec | undefined;
    const tuoiStart = dv.tuoiStart as number;
    const tuoiEnd = dv.tuoiEnd as number;
    const nac = NAC_NGHE[Math.min(i, NAC_NGHE.length - 1)];
    return {
      stt: i + 1,
      nac: nac.ten,
      nacY: nac.y,
      tuoiStart,
      tuoiEnd,
      namStart: namSinh ? namSinh + tuoiStart - 1 : 0,
      namEnd: namSinh ? namSinh + tuoiEnd - 1 : 0,
      cung: (p?.cungName as string) || '',
      sao: b.stars.map(starLabel),
      muon: b.muon,
      diem: typeof sc?.tong === 'number' ? (sc.tong as number) : null,
      flag: (sc?.flag as string) || '',
      tinh,
      hopMenh,
      dangChay: !!dvHienTai && dvHienTai.tuoiStart === tuoiStart,
      ...(({ ma, text }) => ({ luan: text, luanMa: ma }))(luanNac(phan.kieu, tinh, hopMenh, nac.ten)),
    };
  });

  // ── Ghép đội
  const doi: GhepDoi[] = VAI_CUNG.map((v) => {
    const k = kieuCuaCung(ls, v.cung);
    const nenTim = BU[phan.kieu];
    return {
      vai: v.vai,
      cung: v.cung,
      sao: k.sao.map(starLabel),
      muon: k.muon,
      kieu: k.kieu,
      kieuTen: k.kieu ? KIEU[k.kieu].ten : '—',
      nenTim,
      ...(({ ma, text }) => ({ goiY: text, goiYMa: ma }))(goiYGhep(v.cung, phan.kieu, k.kieu, nenTim)),
    };
  });

  const quanP = palaceByName(ls, 'Quan Lộc');
  const quanB = majorsOrBorrow(ls, quanP);
  const quanSc = scores['Quan Lộc'];

  return {
    namXem: nam,
    trangThai,
    trangThaiLabel: TRANG_THAI_LABEL[trangThai],
    kieu: KIEU[phan.kieu],
    kieuPhu: phan.kieuPhu ? KIEU[phan.kieuPhu] : null,
    phan,
    vaiTroMa: vaiTroMaCua(phan.vaiTro),
    radar,
    loTrinh,
    vanNam,
    doi,
    loiTrangThai: LOI_THEO_TRANG_THAI[trangThai][phan.kieu],
    nganh: goiYNganh(careerBase, phan.kieu),
    nhanh: chonNhanh(ls, careerBase.domain as DomainId, careerBase.tier),
    quanLoc: {
      sao: quanB.stars.map(starLabel),
      muon: quanB.muon,
      diem: typeof quanSc?.tong === 'number' ? (quanSc.tong as number) : null,
      cachCuc: cachCucTung['Quan Lộc'] || [],
    },
  };
}


// ── Xuất cho rail (PHẲNG) ───────────────────────────────────
/** ⚠️ `extractGenericContext` BỎ QUA im lặng mọi giá trị là object/mảng —
 * payload gửi rail bắt buộc phẳng, mọi danh sách phải dẹp thành chuỗi ngay tại
 * đây. Đã trả giá một lần ở thẻ Vận hôm nay. */
/**
 * Bản hồ sơ cho lượt TÍNH THỬ — y hệt bản đầy đủ nhưng KHÔNG có tầng nhánh.
 *
 * 🔑 Tách thành hàm riêng chứ không lọc tại chỗ trong route: `GET /api/cong-so`
 * trả `Cache-Control: public, s-maxage=86400`, tức một lần rò là CDN phát lại
 * phần trả tiền cho MỌI người và không có cách nào thu hồi. Đường tiền phải cắt
 * được bằng một dòng đọc ra được, và có bài kiểm canh đúng dòng đó.
 */
export function hoSoTinhThu(p: CongSoProfile): Omit<CongSoProfile, 'nhanh'> {
  const { nhanh: _bo, ...conLai } = p;
  void _bo;
  return conLai;
}

export function railData(p: CongSoProfile): Record<string, string | number | boolean> {
  const top = [...p.radar].sort((a, b) => b.diem - a.diem);
  return {
    kieu: p.kieu.ten,
    tuTuong: p.kieu.tuTuong,
    kieuLai: p.phan.lai && p.kieuPhu ? `Kiểu lai — nghiêng ${p.kieu.ten}, pha ${p.kieuPhu.ten}` : 'Không (kiểu rõ)',
    toaDo: `tranh/nhường ${p.phan.x} · xông/trầm ${p.phan.y}`,
    chinhTinhMenh: (p.phan.saoMenh.join(', ') || 'vô chính diệu') + (p.phan.muonMenh ? ' (mượn xung chiếu)' : ''),
    chinhTinhQuanLoc: (p.phan.saoQuan.join(', ') || 'vô chính diệu') + (p.phan.muonQuan ? ' (mượn xung chiếu)' : ''),
    vaiTroTheoMenh: p.phan.vaiTro?.role || '—',
    dongLuc: p.kieu.dongLuc,
    kieuDanDat: p.kieu.kieuDan,
    moiTruongHop: p.kieu.moiTruongHop,
    moiTruongKy: p.kieu.moiTruongKy,
    baiHocTaoMenh: p.kieu.baiHoc.join(' | '),
    trangThaiNgheNghiep: p.trangThaiLabel,
    loiTheoTrangThai: p.loiTrangThai,
    diemCaoNhat: top.slice(0, 3).map((r) => `${r.nhan} ${r.diem}/10`).join(', '),
    diemThapNhat: top.slice(-3).reverse().map((r) => `${r.nhan} ${r.diem}/10`).join(', '),
    linhVucHop: p.nganh.linhVuc,
    chatViecHop: p.nganh.chatViec,
    nganhGoiY: p.nganh.nganh.join(' · '),
    vaiTroTrongNganh: p.nganh.vaiTro,
    quyMoGanhDuoc: p.nganh.quyMo,
    saoQuyetDinhNganh: p.nganh.sao + (p.nganh.laCap ? ' (đọc theo CẶP đồng cung)' : '') + (p.nganh.muon ? ' (mượn xung chiếu)' : ''),
    bacChucPhan: `${p.nganh.bac} (điểm ${p.nganh.bacDiem}: ${p.nganh.bacChiTiet.join(', ') || '—'})`,
    chucPhanTheoCoThu: p.nganh.chucPhanCo,
    trichDanCoThu: p.nganh.nguon,
    sacThaiQuanLoc: p.nganh.sacThai.join(' | ') || '—',
    luatDocSacThai: 'Sắc thái phụ tinh THU HẸP BÊN TRONG lĩnh vực trên, KHÔNG thay lĩnh vực. Nghiêng "chữ nghĩa" trong ngành y nghĩa là nhánh giảng dạy / nghiên cứu / viết chuyên môn của ngành y — đừng đọc thành đổi sang nghề viết.',
    cachCucQuanLoc: p.quanLoc.cachCuc.join(' | ') || '—',
    loTrinh40Nam: p.loTrinh
      .map((n) => `${n.nac} (${n.tuoiStart}–${n.tuoiEnd} tuổi, cung ${n.cung}${n.diem != null ? `, ${n.diem}/10` : ''}${n.dangChay ? ', ĐANG Ở CHẶNG NÀY' : ''})`)
      .join(' → '),
    vanNamNay: vanNamLine(p.vanNam),
    luatVanNam: LUAT_VAN_NAM,
    ghepDoi: p.doi.map((d) => `${d.vai} (cung ${d.cung}): kiểu ${d.kieuTen}`).join(' | '),
    kieuNenTimDeBu: KIEU[BU[p.phan.kieu]].ten,
  };
}

/**
 * Rail data KÈM tầng nhánh — chỉ dựng trên đường ĐÃ TRẢ TIỀN.
 *
 * Tách khỏi `railData` là cố ý: lượt tính thử đi qua GET có cache CDN công
 * khai, nhét nhánh vào đó là phát không phần trả tiền. Và nếu rail biết nhánh
 * ngay từ lượt free thì người ta hỏi rail thay vì mở tầng nhánh — tự tay phá
 * đúng thứ mình vừa dựng để bán.
 *
 * ⚠️ Payload gửi rail phải PHẲNG — `extractGenericContext` bỏ IM LẶNG mọi giá
 * trị là object.
 */
export function railDataDayDu(p: CongSoProfile): Record<string, string | number | boolean> {
  const nh = p.nhanh;
  return {
    ...railData(p),
    nhanhNghe: nh.goiY.map((g) => `${g.ten} (${g.diem}%)`).join(' · '),
    nhanhChiTiet: nh.goiY
      .map((g) => `${g.ten}: ${g.chat} Việc cụ thể: ${g.viec.join(', ')}.`)
      .join(' | '),
    lyDoTungNhanh: nh.goiY.map((g) => `${g.ten} ← ${g.vi.join(', ') || 'không trục nào nổi bật'}`).join(' | '),
    chatNguoiNoiBat: nh.chatNguoi.map((t) => `${t.ten} (${t.cao})`).join(' · ') || 'không trục nào nổi trội',
    ngheKhongDoiHoi: nh.neTranh.map((t) => `${t.ten} — ${t.thap}`).join(' | ') || '—',
    canhBaoLechBac: nh.lechBac
      ? 'MỌI nhánh gợi ý đều lệch bậc chức phận hiện tại — đây là HƯỚNG hợp với chất người, chưa phải chỗ đứng ngay bây giờ. Phải nói rõ chỗ này, đừng bày như thể họ vào được ngay.'
      : 'Không',
    canhBaoMoNhat: nh.moNhat
      ? 'Lá số KHÔNG chỉ ra một nhánh nào nổi bật trong lĩnh vực này. Nói thẳng là chưa đủ tín hiệu, đừng chọn đại một nhánh rồi luận như thể chắc chắn.'
      : 'Không',
    luatDocTrucThap:
      'Trục thấp nghĩa là NGHỀ KHÔNG ĐÒI HỎI trục đó, TUYỆT ĐỐI không đọc thành "người này thiếu". Ví dụ nghề sáng tác chấm thấp ở trục đáng-tin-cậy chỉ có nghĩa nghề đó không đo người bằng giờ giấc và quy trình.',
    luatDocNhanh:
      'Nhánh là CÁCH LÀM trong lĩnh vực, không phải một lĩnh vực khác. Phần trăm là độ KHỚP giữa chất người và chất việc, KHÔNG phải xác suất thành công — cấm đọc thành "80% khả năng thành công".',
  };
}
