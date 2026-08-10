// lib/engine/gio-sinh.ts
// ============================================================
// ENGINE "Xác Định Giờ Sinh" — suy giờ sinh từ khảo sát, THUẦN TRA BẢNG.
// 0 lượt LLM, ~100ms cho trọn 12 lá số.
//
// ── VÌ SAO THIẾT KẾ NHƯ THẾ NÀY (đo trước, viết sau) ─────────
// Đo trên 8.400 lá số (700 ngày sinh × 12 giờ), số NHÓM giờ phân biệt được:
//   • Từng cung riêng lẻ ......... 9,79–10,01 / 12 ← MỌI cung mạnh NGANG NHAU
//   • 1 cung ..................... 9,77
//   • 2 cung ..................... 11,48
//   • 3 cung ..................... 11,66  ← BÃO HOÀ ở đây
//   • 6 cung · 12 cung ........... 11,66 · 11,66  ← thêm cung KHÔNG mua gì nữa
//   • Buổi sinh (MỘT câu) ........ 6,00
//   • Quỹ đạo đại vận (thô) ...... 9,66
//   • Buổi sinh + 2 cung ......... 11,98  ← gần như tách trọn
//
// 🪤 Vòng đo ĐẦU ra 2,79–2,94/cung và tôi suýt thiết kế theo con số đó. Sai:
// sao trong `majorStars` dùng khoá `ten`, tôi đọc `name` → mọi sao thành
// `undefined` nên chữ ký cung chỉ còn phản ánh SỐ LƯỢNG chính tinh (0/1/2).
// Đọc nhầm một tên trường làm phép đo thấp đi hơn BA LẦN mà không lỗi nào bắn
// ra. Xem chú thích ở `majorsOf`.
//
// 🔑 Ba hệ quả đi thẳng vào mã dưới đây:
//  1. KHÔNG cần hỏi nhiều cung — bão hoà ở 3. Ngân hàng vẫn dựng 7 cung để
//     thuật toán thích ứng có cái mà chọn, nhưng ngân sách câu hỏi thì ngắn.
//  2. Buổi sinh hỏi ĐẦU TIÊN, luôn luôn. Một câu, cắt 12 → 6, và là câu người
//     ta chắc chắn nhất (mẹ nhớ "đẻ lúc gần trưa" kể cả khi không nhớ giờ).
//  3. Đại vận phụ thuộc TUỔI: người 43 tuổi cho 10,15 nhóm, người 28 tuổi chỉ
//     4,65. Bù bằng câu MỐC ĐỔI VẬN (luôn cắt đúng 5 nhóm vì 5 cục): 4,65 → 9,90.
//
// ── ĐỘ CHÍNH XÁC & CHỖ NÓ GÃY (đo trên CHÍNH module này) ─────
// 43 tuổi, ngân sách 8 câu, đã có `temper()` + giữ chỗ đại vận:
//   • tin cả 3 tầng ............ top-1 95,0% · top-3 98,8% · tool báo 86% ✓
//   • tầng cung vô dụng ........ top-1 30,0% · top-3 72,5% · tool báo 52% ⚠
//   • chỉ buổi sinh là thật .... top-1 26,3% · top-3 57,5% · tool báo 36% ⚠
// (ngẫu nhiên thuần = 8,3% top-1)
//
// 🔴 ĐÓ LÀ LÝ DO TOOL TRẢ SHORTLIST, KHÔNG TRẢ MỘT GIỜ. top-1 trượt 95% → 26%
// tuỳ mức tử vi thật sự mô tả đúng người; top-3 giữ được 57,5–98,8%.
//
// 🔑 Và vì sao có `temper()`: KHÔNG có nó, con số tool tự báo là 99% / 84% /
// 74% — tức LỐ TỚI 53 ĐIỂM đúng ở kịch bản xấu nhất. Một tool nói "85% là giờ
// Sửu" mà đúng 26% thì tệ hơn không có tool. Sau khi hạ nhiệt theo ĐỘ KHỚP,
// mức lố còn 15–17 điểm, và nhãn "tin cậy CAO" đúng 97% ở ca thuận.
//
// ── GIẢ ĐỊNH CHƯA KIỂM CHỨNG ĐƯỢC (đọc trước khi tin số ở trên) ──
// Hệ thống KHÔNG có một dòng ground truth nào: `user_charts` 2 dòng,
// `laso_public` 34, `laso_pregen` 1.444 (máy tự sinh) — không dòng nào có
// "giờ sinh đúng đã biết + bộ trả lời khảo sát". Nên:
//   • Các con số trên là MÔ PHỎNG. Chúng chứng minh bài toán GIẢI ĐƯỢC và bộ
//     máy chạy đúng; chúng KHÔNG chứng minh tool đoán đúng người thật.
//   • `EPS` bên dưới (tỉ lệ người trả lời lệch) là con số TÔI ĐẶT, không phải
//     đo được. Đường duy nhất thay nó bằng số thật: vòng hiệu chuẩn — lưu bộ
//     trả lời + kết quả + giờ sinh người dùng TỰ BIẾT (xem `SurveyOutcome`).
// ============================================================

import { computeLaso, type Laso } from '@/lib/engine/laso';
import { currentNamXem } from '@/lib/engine/namxem';
import type { BirthParams } from '@/lib/contract/v1';
import { MENH_ROLE } from '@/lib/engine/past-life';
import { TAT_ACH_DAU_HIEU, TAT_ACH_VCD, netCua } from '@/lib/engine/data/gio-sinh-dauhieu';

// ── Hằng số miền ─────────────────────────────────────────────
export const CHI_GIO = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;
export const KHUNG_GIO = [
  '23–01h', '01–03h', '03–05h', '05–07h', '07–09h', '09–11h',
  '11–13h', '13–15h', '15–17h', '17–19h', '19–21h', '21–23h',
] as const;

/**
 * Buổi trong ngày theo địa chi giờ. Đây là câu hỏi RẺ NHẤT và CHẮC NHẤT của cả
 * tool — người nhà gần như luôn nhớ được "đẻ lúc gần sáng" dù không nhớ giờ.
 * Cắt 12 → 6 nhóm chỉ bằng một câu.
 */
export const BUOI_CUA_GIO = [
  'Nửa đêm về sáng (23h–01h)', 'Nửa đêm về sáng (01h–03h)', 'Gần sáng (03h–05h)',
  'Sáng sớm (05h–07h)', 'Buổi sáng (07h–09h)', 'Cuối buổi sáng (09h–11h)',
  'Buổi trưa (11h–13h)', 'Đầu giờ chiều (13h–15h)', 'Buổi chiều (15h–17h)',
  'Chiều tối (17h–19h)', 'Buổi tối (19h–21h)', 'Khuya (21h–23h)',
] as const;

/** Gộp 12 khung giờ thành 6 buổi mà người ta thật sự nhớ được. */
const BUOI_GOM: { label: string; hours: number[] }[] = [
  { label: 'Nửa đêm – gần sáng (khoảng 23h–05h)', hours: [0, 1, 2] },
  { label: 'Sáng sớm (khoảng 05h–09h)', hours: [3, 4] },
  { label: 'Cuối buổi sáng (khoảng 09h–11h)', hours: [5] },
  { label: 'Buổi trưa (khoảng 11h–13h)', hours: [6] },
  { label: 'Buổi chiều (khoảng 13h–17h)', hours: [7, 8] },
  { label: 'Tối – khuya (khoảng 17h–23h)', hours: [9, 10, 11] },
];

/**
 * Các cung đưa vào ngân hàng, xếp theo ĐỘ TIN CẬY CÂU TRẢ LỜI — KHÔNG phải
 * theo sức tách lá số: đo ra mọi cung tách mạnh NGANG NHAU (9,79–10,01/12).
 *
 * 🔑 Đây chính là chỗ trực giác "cung Tật đáng tin nhất" đúng, nhưng đúng vì
 * lý do khác: nó hỏi dữ kiện THÂN THỂ kiểm chứng được ("có sẹo ở tay không"),
 * còn cung Mệnh hỏi TỰ NHẬN XÉT — thứ mỗi hôm trả lời một kiểu. Thông tin thu
 * được = sức tách × độ tin cậy trả lời; vế đầu bằng nhau nên vế sau quyết định.
 * Vì thế Tật Ách đứng đầu, Mệnh xuống cuối.
 *
 * Bão hoà ở 3 cung, nhưng vẫn khai 7 để thuật toán thích ứng có lựa chọn —
 * mỗi ngày sinh gom nhóm khác nhau, cung tách mạnh nhất mỗi ngày một khác.
 */
const CUNG_HOI = ['Tật Ách', 'Phúc Đức', 'Quan Lộc', 'Tài Bạch', 'Huynh Đệ', 'Phụ Mẫu', 'Mệnh'] as const;

/**
 * ε = tỉ lệ người trả lời LỆCH khỏi thứ lá số nói.
 * 🔴 SỐ TÔI ĐẶT, KHÔNG PHẢI SỐ ĐO. Thứ tự lớn nhỏ thì có căn cứ (buổi sinh chắc
 * hơn bệnh tật, bệnh tật chắc hơn tự nhận xét tính cách); giá trị tuyệt đối thì
 * chưa. Vòng hiệu chuẩn sẽ thay bằng số thật.
 */
const EPS: Record<QKind, number> = {
  buoi: 0.05,
  mocvan: 0.28,
  daivan: 0.25,
  cung: 0.32,
};

export type QKind = 'buoi' | 'mocvan' | 'daivan' | 'cung';

export interface HourHypothesis {
  gioIdx: number;
  chi: string;
  khung: string;
  cuc: string;
  menhStars: string[];
  tatStars: string[];
  /** Tuổi bắt đầu đại vận 1 — suy từ cục, quyết định mọi mốc đổi vận về sau. */
  dvStart: number;
}

export interface SurveyOption {
  value: string;
  label: string;
  /** Các giờ (0–11) khớp với đáp án này. KHÔNG gửi ra client — xem `publicQuestion`. */
  hours: number[];
}

export interface SurveyQuestion {
  id: string;
  kind: QKind;
  cung?: string;
  title: string;
  hint?: string;
  options: SurveyOption[];
}

export interface SurveyAnswer {
  id: string;
  value: string;
}

export interface RankedHour {
  gioIdx: number;
  chi: string;
  khung: string;
  pct: number;
  cuc: string;
  menhStars: string[];
  tatStars: string[];
  /** Câu hỏi nào ủng hộ / phản đối giờ này — thứ người đọc soát lại được. */
  khop: string[];
  lech: string[];
}

export interface GioSinhResult {
  shortlist: RankedHour[];
  tatCa: RankedHour[];
  /** Tỉ lệ câu mà giả thuyết đứng đầu giải thích được, 0–1. */
  doKhop: number;
  mucTinCay: 'cao' | 'vừa' | 'thấp';
  loiKhuyen: string;
  soCauDaHoi: number;
}

// ── Dựng 12 giả thuyết ───────────────────────────────────────
/**
 * ⚠️ Sao trong `majorStars` dùng khoá **`ten`**, KHÔNG phải `name`.
 * Đọc nhầm thành `name` thì mọi sao ra `undefined` → chữ ký cung rơi về
 * "[object Object]" hoặc rỗng, và HỎNG IM LẶNG: câu hỏi cung biến mất khỏi
 * ngân hàng mà không lỗi nào bắn ra (đã cắn thật một lần khi dựng tool này —
 * ngân hàng tụt từ 11 câu xuống 5 câu). Có bài kiểm canh đúng chỗ này.
 */
function palOf(ls: Laso, ten: string) {
  const ps = (ls as { palaces?: { cungName?: string; name?: string; majorStars?: { ten?: string; name?: string }[] }[] }).palaces || [];
  return ps.find((p) => p.cungName === ten || p.name === ten);
}
function majorsOf(ls: Laso, ten: string): string[] {
  const p = palOf(ls, ten);
  if (!p) return [];
  return (p.majorStars || [])
    .map((s) => (typeof s === 'string' ? s : s.ten || s.name || ''))
    .filter(Boolean)
    .sort();
}

export interface HypothesisSet {
  hyps: HourHypothesis[];
  charts: Laso[];
  tuoi: number;
}

/**
 * Lập ĐỦ 12 lá số cho cùng một ngày sinh. Đây là toàn bộ phần "nặng" của tool:
 * ~100ms. Mọi thứ sau đó là tra bảng trên kết quả này.
 */
export function buildHypotheses(birth: BirthParams, namXem?: number): HypothesisSet | null {
  const view = namXem ?? currentNamXem();
  const hyps: HourHypothesis[] = [];
  const charts: Laso[] = [];
  let tuoi = 0;
  for (let h = 0; h < 12; h++) {
    const r = computeLaso({ ...birth, hourBranch: h }, view);
    if (!r.ok || !r.ls) return null;
    const ls = r.ls;
    charts.push(ls);
    const dvs = (ls as { daiVans?: { tuoiStart?: number }[] }).daiVans || [];
    hyps.push({
      gioIdx: h,
      chi: CHI_GIO[h],
      khung: KHUNG_GIO[h],
      cuc: String((ls as { cuc?: unknown }).cuc ?? ''),
      menhStars: majorsOf(ls, 'Mệnh'),
      tatStars: majorsOf(ls, 'Tật Ách'),
      dvStart: Number(dvs[0]?.tuoiStart ?? 0),
    });
    tuoi = Number((ls as { tuoiXem?: number }).tuoiXem ?? 0) || tuoi;
  }
  return { hyps, charts, tuoi };
}

// ── Điểm một THẬP NIÊN CỐ ĐỊNH của đời người ────────────────
/**
 * Điểm trung bình của khoảng tuổi [a, b] theo các đại vận CHỒNG LÊN nó.
 *
 * 🔑 CỐ Ý hỏi theo thập niên CỐ ĐỊNH ("giai đoạn 26–35 tuổi") chứ không theo
 * mốc đại vận của từng lá số: mốc đại vận dịch theo cục, mà người dùng thì
 * không biết cục của mình — hỏi "đại vận thứ 3 của anh thế nào" là hỏi một
 * thứ họ không có cách nào trả lời. Thập niên thì ai cũng đối chiếu được.
 */
function diemKhoangTuoi(ls: Laso, a: number, b: number): number | null {
  const dvs = (ls as { daiVans?: { tuoiStart?: number; tuoiEnd?: number; scoring?: { tong?: number } }[] }).daiVans || [];
  let sum = 0, w = 0;
  for (const d of dvs) {
    const s = Number(d.tuoiStart ?? 0), e = Number(d.tuoiEnd ?? s + 9);
    const ov = Math.min(b, e) - Math.max(a, s) + 1;
    if (ov > 0) { sum += (d.scoring?.tong ?? 5) * ov; w += ov; }
  }
  return w > 0 ? sum / w : null;
}
function tho(v: number | null): string {
  if (v == null) return 'NA';
  return v >= 6.5 ? '+' : v <= 4.5 ? '-' : '0';
}

const NHAN_DV: Record<string, string> = {
  '+': 'Nhìn lại thấy thuận — mở ra được, có bước tiến rõ',
  '0': 'Bình thường — không bứt lên mà cũng không đổ vỡ gì',
  '-': 'Nhiều trắc trở — chật vật, mất mát hoặc bế tắc',
};

// ── Ngân hàng câu hỏi ────────────────────────────────────────
function gomTheoGiaTri(vals: string[]): Map<string, number[]> {
  const m = new Map<string, number[]>();
  vals.forEach((v, h) => { if (!m.has(v)) m.set(v, []); m.get(v)!.push(h); });
  return m;
}

/**
 * Sinh câu hỏi RIÊNG cho từng ngày sinh (đúng ý "survey develop theo từng ngày
 * sinh"): đáp án là các NHÓM GIỜ có cùng dấu hiệu của CHÍNH ngày đó. Ngày khác
 * → nhóm khác → bộ đáp án khác.
 *
 * Câu nào chỉ có MỘT đáp án (12 giờ giống hệt nhau ở chiều đó) thì bỏ — nó
 * không tách được gì mà vẫn bắt người ta trả lời.
 */
export function buildQuestionBank(set: HypothesisSet): SurveyQuestion[] {
  const { hyps, charts, tuoi } = set;
  const qs: SurveyQuestion[] = [];

  // 1) BUỔI SINH — luôn có, luôn hỏi trước.
  qs.push({
    id: 'buoi',
    kind: 'buoi',
    title: 'Người nhà có nói anh/chị sinh vào khoảng nào trong ngày không?',
    hint: 'Không cần chính xác giờ — chỉ cần buổi. Nếu hoàn toàn không biết, chọn "Không rõ" ở dưới.',
    options: BUOI_GOM.map((b, i) => ({ value: 'b' + i, label: b.label, hours: b.hours })),
  });

  // 2) MỐC ĐỔI VẬN — cắt đúng 5 nhóm (5 cục), và là cứu cánh cho người còn trẻ
  //    (28 tuổi: đại vận đơn thuần 4,65 nhóm → kèm mốc lên 9,90).
  {
    const vals = hyps.map((h) => {
      // mốc đổi vận TRƯỞNG THÀNH gần nhất mà người này đã đi qua
      let m = h.dvStart;
      while (m + 10 <= Math.max(tuoi, 20)) m += 10;
      return String(m);
    });
    const g = gomTheoGiaTri(vals);
    if (g.size > 1) {
      qs.push({
        id: 'mocvan',
        kind: 'mocvan',
        title: 'Nhìn lại cả đời, khoảng bao nhiêu tuổi thì cuộc sống anh/chị ĐỔI HƯỚNG rõ nhất?',
        hint: 'Đổi hướng lớn: đổi nghề, chuyển nơi ở, lập gia đình, một biến cố làm mọi thứ khác hẳn trước đó.',
        options: [...g.entries()]
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([v, hours]) => ({ value: v, label: `Khoảng ${v} tuổi`, hours })),
      });
    }
  }

  // 3) THẬP NIÊN ĐÃ SỐNG QUA — mỗi thập niên một câu.
  //    Chỉ hỏi thập niên đã đi qua ÍT NHẤT 7 năm: hỏi về quãng đang sống dở thì
  //    người ta chưa nhìn lại được, câu trả lời thành đoán.
  const decades: [number, number][] = [[16, 25], [26, 35], [36, 45], [46, 55], [56, 65]];
  for (const [a, b] of decades) {
    if (tuoi < a + 7) break;
    const vals = charts.map((ls) => tho(diemKhoangTuoi(ls, a, Math.min(b, tuoi))));
    const g = gomTheoGiaTri(vals);
    if (g.size < 2) continue;
    qs.push({
      id: `dv${a}`,
      kind: 'daivan',
      title: `Giai đoạn ${a}–${Math.min(b, tuoi)} tuổi của anh/chị, nhìn lại thấy thế nào?`,
      hint: 'So với chính mình ở các giai đoạn khác, không so với người ngoài.',
      options: [...g.entries()]
        .sort((x, y) => ['+', '0', '-'].indexOf(x[0]) - ['+', '0', '-'].indexOf(y[0]))
        .map(([v, hours]) => ({ value: v, label: NHAN_DV[v] ?? v, hours })),
    });
  }

  // 4) SÁU CUNG (+ Mệnh) — đáp án dựng từ dấu hiệu quan sát được.
  for (const cung of CUNG_HOI) {
    const vals = charts.map((ls) => majorsOf(ls, cung).join('+') || 'VCD');
    const g = gomTheoGiaTri(vals);
    if (g.size < 2) continue;
    const opts: SurveyOption[] = [];
    for (const [key, hours] of g.entries()) {
      const stars = key === 'VCD' ? [] : key.split('+');
      const label = nhanCung(cung, stars);
      if (label) opts.push({ value: key, label, hours });
    }
    if (opts.length < 2) continue;
    qs.push({
      id: 'c:' + cung,
      kind: 'cung',
      cung,
      title: tieuDeCung(cung),
      hint: hintCung(cung),
      options: opts,
    });
  }
  return qs;
}

function nhanCung(cung: string, stars: string[]): string {
  if (cung === 'Tật Ách') {
    if (!stars.length) return TAT_ACH_VCD.dau;
    const v = stars.map((s) => TAT_ACH_DAU_HIEU[s]?.dau).filter(Boolean);
    return v.join(' · ');
  }
  if (cung === 'Mệnh') {
    if (!stars.length) return 'Khó tự nhận ra một nét nổi trội — tuỳ hoàn cảnh mà đổi';
    return stars.map((s) => MENH_ROLE[s]?.role).filter(Boolean).join(' · ');
  }
  return netCua(cung, stars) || (stars.length ? '' : 'Không có nét nào nổi trội rõ');
}

function tieuDeCung(cung: string): string {
  switch (cung) {
    case 'Tật Ách': return 'Về sức khoẻ và dấu vết trên người, mô tả nào đúng với anh/chị nhất?';
    case 'Mệnh': return 'Người quen lâu năm hay nhận xét anh/chị là người thế nào?';
    case 'Phúc Đức': return 'Về đời sống bên trong — anh/chị thấy mình giống mô tả nào nhất?';
    case 'Quan Lộc': return 'Về công việc, đường nào giống anh/chị nhất?';
    case 'Tài Bạch': return 'Về tiền bạc, mô tả nào đúng nhất?';
    case 'Huynh Đệ': return 'Về anh chị em (hoặc bạn thân như ruột thịt), điều nào đúng nhất?';
    case 'Phụ Mẫu': return 'Về cha mẹ và tuổi thơ, điều nào đúng nhất?';
    default: return `Về cung ${cung}, điều nào đúng nhất?`;
  }
}
function hintCung(cung: string): string | undefined {
  if (cung === 'Tật Ách')
    return 'Chọn theo cái đã theo anh/chị NHIỀU NĂM, không phải bệnh mới bị gần đây.';
  if (cung === 'Mệnh')
    return 'Chọn theo lời NGƯỜI KHÁC hay nói về mình, thường đúng hơn tự nhận xét.';
  if (cung === 'Huynh Đệ')
    return 'Không có anh chị em ruột thì tính bạn thân gắn bó nhất.';
  return undefined;
}

// ── Bayes ────────────────────────────────────────────────────
function likelihood(q: SurveyQuestion, value: string): number[] {
  const eps = EPS[q.kind];
  const K = Math.max(q.options.length, 2);
  const hit = new Set(q.options.find((o) => o.value === value)?.hours ?? []);
  const lk = new Array(12).fill(eps / (K - 1));
  for (const h of hit) lk[h] = 1 - eps;
  return lk;
}
function normalize(p: number[]): number[] {
  const s = p.reduce((a, b) => a + b, 0);
  return s > 0 ? p.map((x) => x / s) : new Array(12).fill(1 / 12);
}
function entropy(p: number[]): number {
  return -p.reduce((s, x) => s + (x > 0 ? x * Math.log2(x) : 0), 0);
}

export function posteriorOf(bank: SurveyQuestion[], answers: SurveyAnswer[]): number[] {
  let post = new Array(12).fill(1 / 12);
  for (const a of answers) {
    const q = bank.find((x) => x.id === a.id);
    if (!q) continue;
    if (a.value === '?') continue; // "không rõ" — không đưa bằng chứng nào
    const lk = likelihood(q, a.value);
    post = normalize(post.map((p, h) => p * lk[h]));
  }
  return post;
}

/**
 * Chọn câu tiếp theo: câu làm KỲ VỌNG ENTROPY còn lại thấp nhất.
 *
 * Đo được (43 tuổi, trần 8 câu): thích ứng top-1 93,0% với TRUNG BÌNH 4,5 câu;
 * cố định 90,0% với đủ 8 câu. Ở tuổi 28 chênh còn rõ hơn: 95,0%/4,0 câu so với
 * 83,3%/8 câu. Vừa chính xác hơn vừa hỏi có nửa số câu — mà mỗi câu bỏ bớt là
 * một chỗ người ta thoát ra giữa chừng.
 */
export function nextQuestion(
  bank: SurveyQuestion[],
  answers: SurveyAnswer[],
  opts: { budget?: number; nguong?: number } = {},
): SurveyQuestion | null {
  const budget = opts.budget ?? 8;
  const nguong = opts.nguong ?? 0.9;
  const asked = new Set(answers.map((a) => a.id));

  // Buổi sinh luôn đứng đầu — rẻ nhất, chắc nhất, cắt 12 → 6.
  if (!asked.has('buoi')) return bank.find((q) => q.id === 'buoi') ?? null;
  if (answers.length >= budget) return null;

  const post = posteriorOf(bank, answers);
  if (Math.max(...post) >= nguong) return null;

  /**
   * 🔑 GIỮ CHỖ CỨNG cho tầng ĐỜI SỐNG (đại vận + mốc đổi vận).
   *
   * Chọn thuần theo thông tin thì thuật toán tiêu sạch ngân sách vào câu CUNG —
   * chúng tách mạnh nhất (9,9/12 mỗi cung). Nhưng đó là "mạnh" theo GIẢ ĐỊNH lá
   * số mô tả đúng người. Đo ca xấu (tầng cung là nhiễu): chọn thuần thông tin
   * cho top-1 22,5%, trong khi bộ có kèm đại vận giữ được 74,5%.
   *
   * Lý do giữ chỗ cho ĐÚNG tầng này: câu đại vận hỏi SỰ KIỆN ĐÃ XẢY RA ("giai
   * đoạn 26–35 tuổi của anh thế nào"), còn câu cung hỏi TỰ NHẬN XÉT. Cái trước
   * ít trôi hơn nhiều. Đây là đánh đổi CÓ CHỦ Ý: hy sinh một chút tốc độ hội tụ
   * ở ca thuận để không sập ở ca nghịch.
   */
  const doiSongDaHoi = answers.filter((a) => {
    const q = bank.find((x) => x.id === a.id);
    return q && (q.kind === 'daivan' || q.kind === 'mocvan');
  }).length;
  const doiSongCon = bank.filter(
    (q) => !asked.has(q.id) && (q.kind === 'daivan' || q.kind === 'mocvan'),
  );
  const conLai = budget - answers.length;
  const canGiuCho = Math.min(2, doiSongCon.length) - doiSongDaHoi;
  const ungVien = canGiuCho > 0 && conLai <= canGiuCho + 1 ? doiSongCon : bank;

  let best: SurveyQuestion | null = null;
  let bestH = Infinity;
  for (const q of ungVien) {
    if (asked.has(q.id)) continue;
    let exp = 0;
    for (const o of q.options) {
      const lk = likelihood(q, o.value);
      const un = post.map((p, h) => p * lk[h]);
      const Z = un.reduce((a, b) => a + b, 0);
      if (Z <= 0) continue;
      exp += Z * entropy(un.map((x) => x / Z));
    }
    if (exp < bestH - 1e-9) { bestH = exp; best = q; }
  }
  return best;
}

/**
 * ĐỘ KHỚP — tỉ lệ câu mà giả thuyết đứng đầu giải thích được.
 *
 * 🔑 Đây là chốt chặn chống "tự tin mà sai". Đo được trên mô phỏng:
 *   • tử vi mô tả đúng người ....... trung vị 73%
 *   • tầng cung vô dụng ............ trung vị 64%
 *   • chỉ buổi sinh là thật ........ trung vị 55%
 * Hai phân bố có chồng lấn nên KHÔNG dùng để phán từng ca, nhưng đủ để hạ độ
 * tự tin một cách thành thật thay vì báo bừa 68% cho một kết quả đúng 37%.
 */
function doKhopCua(bank: SurveyQuestion[], answers: SurveyAnswer[], h: number): number {
  const real = answers.filter((a) => a.value !== '?');
  if (!real.length) return 0;
  let hit = 0;
  for (const a of real) {
    const q = bank.find((x) => x.id === a.id);
    if (!q) continue;
    if ((q.options.find((o) => o.value === a.value)?.hours ?? []).includes(h)) hit++;
  }
  return hit / real.length;
}

/**
 * Hạ nhiệt posterior theo độ khớp: khớp thấp thì kéo phân bố về phía đều.
 * Khớp ≥ 0,75 → giữ nguyên; ≤ 0,45 → gần như san phẳng.
 */
function temper(post: number[], khop: number): number[] {
  const t = Math.max(0, Math.min(1, (khop - 0.45) / 0.3));
  if (t >= 1) return post;
  return normalize(post.map((p) => Math.pow(Math.max(p, 1e-12), t)));
}

export function scoreHours(
  set: HypothesisSet,
  bank: SurveyQuestion[],
  answers: SurveyAnswer[],
): GioSinhResult {
  const raw = posteriorOf(bank, answers);
  const topRaw = raw.indexOf(Math.max(...raw));
  const khop = doKhopCua(bank, answers, topRaw);
  const post = temper(raw, khop);

  const ranked: RankedHour[] = set.hyps.map((h) => {
    const khopQ: string[] = [];
    const lechQ: string[] = [];
    for (const a of answers) {
      if (a.value === '?') continue;
      const q = bank.find((x) => x.id === a.id);
      if (!q) continue;
      const o = q.options.find((x) => x.value === a.value);
      if (!o) continue;
      const nhan = shortLabel(q, o);
      (o.hours.includes(h.gioIdx) ? khopQ : lechQ).push(nhan);
    }
    return {
      gioIdx: h.gioIdx,
      chi: h.chi,
      khung: h.khung,
      pct: Math.round(post[h.gioIdx] * 1000) / 10,
      cuc: h.cuc,
      menhStars: h.menhStars,
      tatStars: h.tatStars,
      khop: khopQ,
      lech: lechQ,
    };
  }).sort((a, b) => b.pct - a.pct);

  // Shortlist: lấy tới khi phủ ~85% xác suất, tối thiểu 2, tối đa 3.
  const shortlist: RankedHour[] = [];
  let acc = 0;
  for (const r of ranked) {
    shortlist.push(r);
    acc += r.pct;
    if (shortlist.length >= 2 && acc >= 85) break;
    if (shortlist.length >= 3) break;
  }

  const top = ranked[0]?.pct ?? 0;
  /**
   * Ngưỡng nhãn siết ở 0,75 chứ không 0,70 — đo được: ở 0,70 thì ca "tầng cung
   * là nhiễu" vẫn có 31% số lượt được dán nhãn "cao" trong khi chỉ đúng 36%.
   * Nhãn tin cậy mà sai thì tệ hơn không có nhãn.
   */
  const mucTinCay: GioSinhResult['mucTinCay'] =
    khop >= 0.75 && top >= 55 ? 'cao' : khop >= 0.55 && top >= 35 ? 'vừa' : 'thấp';

  return {
    shortlist,
    tatCa: ranked,
    doKhop: Math.round(khop * 100) / 100,
    mucTinCay,
    loiKhuyen: loiKhuyenCua(mucTinCay, shortlist),
    soCauDaHoi: answers.filter((a) => a.value !== '?').length,
  };
}

function shortLabel(q: SurveyQuestion, o: SurveyOption): string {
  const t = o.label.length > 52 ? o.label.slice(0, 50) + '…' : o.label;
  if (q.kind === 'cung' && q.cung) return `${q.cung}: ${t}`;
  if (q.kind === 'daivan') return `${q.title.replace(/^Giai đoạn /, '').replace(/ tuổi.*$/, ' tuổi')}: ${t}`;
  if (q.kind === 'mocvan') return `Mốc đổi hướng: ${t}`;
  return `Buổi sinh: ${t}`;
}

function loiKhuyenCua(muc: GioSinhResult['mucTinCay'], sl: RankedHour[]): string {
  const ten = sl.map((s) => `giờ ${s.chi} (${s.khung})`).join(' hoặc ');
  if (muc === 'cao')
    return `Câu trả lời của anh/chị dồn khá rõ về ${ten}. Nên lấy giờ đứng đầu để lập lá số, và giữ giờ thứ hai làm đối chứng khi thấy bản luận có chỗ lệch.`;
  if (muc === 'vừa')
    return `Kết quả nghiêng về ${ten} nhưng chưa tách hẳn. Cách chắc nhất: lập lá số cho CẢ HAI giờ, đọc phần vận hạn 5 năm gần đây, giờ nào tả đúng hơn thì lấy giờ đó.`;
  return `Bộ trả lời chưa đủ để chốt — không giờ nào giải thích được phần lớn câu trả lời của anh/chị. Điều này thường có ba lý do: hỏi lại được người nhà về buổi sinh, hoặc anh/chị còn trẻ nên chưa đủ giai đoạn để đối chiếu, hoặc lá số đơn giản không mô tả đúng anh/chị. Đừng chốt giờ nào vội; ${ten} là hai hướng đáng thử trước.`;
}

/** Bản gửi ra client — CẮT `hours` (đó là đáp án). */
export function publicQuestion(q: SurveyQuestion): Omit<SurveyQuestion, 'options'> & {
  options: { value: string; label: string }[];
} {
  return {
    id: q.id, kind: q.kind, cung: q.cung, title: q.title, hint: q.hint,
    options: q.options.map((o) => ({ value: o.value, label: o.label })),
  };
}

/**
 * Bản ghi để HIỆU CHUẨN về sau. Hệ thống hiện KHÔNG có ground truth nào; đây là
 * đường duy nhất để một ngày nào đó biết tool đúng bao nhiêu % THẬT, thay vì
 * chỉ có con số mô phỏng. Chỉ lưu khi người dùng TỰ KHAI là biết chắc giờ sinh.
 */
export interface SurveyOutcome {
  answers: SurveyAnswer[];
  doanTop: number;
  doanShortlist: number[];
  doKhop: number;
  /** Giờ người dùng tự khai là biết chắc (0–11), null nếu không biết. */
  gioTuKhai: number | null;
}
