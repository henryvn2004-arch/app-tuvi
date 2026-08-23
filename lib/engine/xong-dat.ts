// lib/engine/xong-dat.ts
// ============================================================
// XÔNG ĐẤT ĐẦU NĂM — mục #13/14 ("pháo Tết"), hạn tháng 11.
//
// 🔑 Vì sao là xông đất mà không phải một cụm trang Tết:
// bài học #358 đã trả giá — 438K trang mỏng cho ra 612 trang có hiển thị và
// 16 nhấp; nút thắt là THẨM QUYỀN TÊN MIỀN chứ không phải số lượng trang. Nên
// "pháo Tết" ở đây đi theo khuôn #361 (`/kim-lau`): MỘT trang trụ mạnh + một
// công cụ thật, không phải một đợt gen trang.
//
// Và xông đất là câu hỏi Tết DUY NHẤT mà một bài liệt kê không trả lời thay
// được: đáp án phụ thuộc tuổi CHỦ NHÀ, nên mỗi người một kết quả. Đó vừa là
// lý do nó cần công cụ, vừa là lý do kết quả đáng chia sẻ.
//
// ⚠️ Hạn tháng 11 là hạn THẬT, không phải deadline tự đặt: Tết 2027 rơi vào
// 6/2/2027, mà nhu cầu tìm "tuổi xông đất" dồn vào quãng tháng 12–1. Trang
// phải được index TRƯỚC quãng đó mới kịp.
//
// Toàn bộ phép chấm là TRA BẢNG địa chi/nạp âm — 0 lượt LLM, 0đ. Bảng lục
// hợp/tam hợp/lục xung/tam hình DÙNG CHUNG với `diachi.ts`; chép bản thứ hai
// là hai bản trôi khỏi nhau rồi hai công cụ cùng site nói ngược nhau.
// ============================================================

import { ccInfo, CHI, LUC_HOP, LUC_XUNG, TAM_HOP, TAM_HINH } from '@/lib/engine/diachi';

/** Tết âm lịch (dương lịch) — tra bảng, chỉ những năm trang này phục vụ. */
const TET: Record<number, string> = {
  2026: '17/02/2026',
  2027: '06/02/2027',
  2028: '26/01/2028',
};

export const XONG_DAT_YEARS = Object.keys(TET).map(Number).sort();

/** Ngày Tết (dương) của một năm, dạng ISO để so sánh được. */
function tetIso(y: number): string {
  const t = TET[y];
  if (!t) return '';
  const [d, m, yy] = t.split('/');
  return `${yy}-${m}-${d}`;
}

/**
 * Năm Tết SẮP TỚI — so theo NGÀY, không so theo năm.
 *
 * 🐞 Bẫy đã vấp: bản đầu lấy `năm >= năm hiện tại`, nên suốt từ tháng 2 tới
 * hết năm trang vẫn quảng cáo cái Tết vừa đi qua. Với một trang mùa vụ thì đó
 * là hỏng đúng chỗ nó tồn tại — và hỏng IM LẶNG, vì trang vẫn dựng bình thường.
 */
export function nextTetYear(todayIso?: string): number {
  const today = todayIso || new Date().toISOString().slice(0, 10);
  const cand = XONG_DAT_YEARS.filter((y) => tetIso(y) >= today);
  return cand[0] ?? XONG_DAT_YEARS[XONG_DAT_YEARS.length - 1];
}

const inPair = (pairs: number[][], a: number, b: number) =>
  pairs.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const inGroup = (groups: number[][], a: number, b: number) =>
  groups.some((g) => g.indexOf(a) > -1 && g.indexOf(b) > -1);

/**
 * TỰ HÌNH (自刑) — bốn chi hình chính nó: Thìn(4) Ngọ(6) Dậu(9) Hợi(11).
 * ⚠️ KHÔNG suy từ `TAM_HINH` của `diachi.ts`: bảng đó đang gộp cả chi hình
 * chính nó lẫn chi hình nhau nên `inGroup(TAM_HINH, a, a)` đúng với MỌI chi có
 * trong bảng — dùng nó ở đây là bịa tự hình cho cả Tý/Dần/Mão/Sửu/Mùi/Thân.
 */
const TU_HINH = new Set([4, 6, 9, 11]);

/** Ngũ hành tương sinh: A sinh B. */
const SINH: Record<string, string> = { Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim' };
/** Ngũ hành tương khắc: A khắc B. */
const KHAC: Record<string, string> = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' };

export interface XongDatCandidate {
  namSinh: number;
  tuoi: number;
  canChi: string;
  chi: string;
  napAm: string;
  hanh: string;
  score: number;
  verdict: 'rat-hop' | 'hop' | 'binh' | 'nen-tranh';
  reasons: string[];
  warnings: string[];
}

export interface XongDatResult {
  namXem: number;
  tetDate: string;
  namCanChi: string;
  chuNha: { namSinh: number; canChi: string; hanh: string; napAm: string };
  /** Xếp hạng giảm dần, đã lọc theo dải tuổi hợp lý. */
  candidates: XongDatCandidate[];
  /** Tuổi chủ nhà có phạm Thái Tuế / Tuế Phá năm đó không. */
  chuNhaNote: string[];
  caveat: string;
}

/**
 * ⚠️ CAVEAT BẮT BUỘC đi kèm mọi kết quả.
 *
 * Cổ pháp chọn người xông đất xét CẢ những thứ engine KHÔNG thể biết: năm đó
 * người khách có tang chế không, gia cảnh có đang thuận không, tính tình có
 * hoà nhã không. Bỏ qua vế đó rồi trả một bảng xếp hạng nghe như đáp án cuối
 * cùng là nói quá thứ mình tính được — cùng luật đã áp cho bộ dữ liệu mở.
 */
const CAVEAT =
  'Bảng này chấm theo tuổi (địa chi + nạp âm ngũ hành) — phần cổ pháp tính được. ' +
  'Cổ pháp còn xét những thứ không suy từ ngày sinh: năm đó người xông đất có ' +
  'tang chế không, gia cảnh thuận không, tính nết có hoà nhã vui vẻ không. ' +
  'Người hợp tuổi nhưng đang có tang thì theo lệ vẫn không mời xông đất.';

function evalCandidate(namSinh: number, chuChiIdx: number, chuHanh: string, namChiIdx: number, namXem: number): XongDatCandidate | null {
  const cc = ccInfo(namSinh);
  if (!cc) return null;

  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // ── Tầng 1: hợp với CHỦ NHÀ (nặng nhất — người ta mời khách vào nhà MÌNH) ──
  //
  // 🐞 NHÁNH `cùng chi` PHẢI ĐỨNG TRƯỚC tam hợp, không được bỏ. Mỗi địa chi nằm
  // trong ĐÚNG một nhóm tam hợp, nên `inGroup(TAM_HOP, a, a)` LUÔN đúng ⇒ khách
  // cùng tuổi con giáp với chủ nhà bị dán nhãn "Tam Hợp" và cộng 3 điểm. Sai cổ
  // pháp (cùng chi là TỊ HOÀ, không phải tam hợp) và sai ngay ở dòng LÝ DO —
  // thứ tồn tại để chứng minh mình không bịa. Đúng lớp lỗi `chiRelation` của
  // track Duyên Nợ đã trả giá; tầng 2 bên dưới xét `cc.chiIdx === namChiIdx`
  // trước nên không dính, tầng này thì tôi bỏ sót.
  if (cc.chiIdx === chuChiIdx) {
    // TỰ HÌNH — cổ pháp rành mạch, chỉ bốn chi: Thìn Ngọ Dậu Hợi.
    if (TU_HINH.has(cc.chiIdx)) {
      score -= 2;
      warnings.push(`Cùng tuổi ${CHI[cc.chiIdx]} với chủ nhà — phạm Tự Hình`);
    } else {
      // Tị hoà: cùng loại, cổ pháp đọc là hoà thuận chứ không phải hợp cách.
      // +1 là con số CHỌN (nhẹ hơn hẳn tam hợp +3), không phải cổ pháp cho số.
      score += 1;
      reasons.push(`Cùng tuổi ${CHI[cc.chiIdx]} với chủ nhà (tị hoà)`);
    }
  } else if (inPair(LUC_HOP, cc.chiIdx, chuChiIdx)) {
    score += 4;
    reasons.push(`Lục Hợp với tuổi chủ nhà (${CHI[cc.chiIdx]} hợp ${CHI[chuChiIdx]})`);
  } else if (inGroup(TAM_HOP, cc.chiIdx, chuChiIdx)) {
    score += 3;
    reasons.push(`Tam Hợp với tuổi chủ nhà`);
  } else if (inPair(LUC_XUNG, cc.chiIdx, chuChiIdx)) {
    score -= 5;
    warnings.push(`Lục Xung với tuổi chủ nhà — kiêng`);
  } else if (inGroup(TAM_HINH, cc.chiIdx, chuChiIdx)) {
    score -= 3;
    warnings.push(`Tam Hình với tuổi chủ nhà`);
  }

  // ── Tầng 2: hợp với NĂM (Thái Tuế) ──
  if (cc.chiIdx === namChiIdx) {
    score -= 4;
    warnings.push(`Phạm Thái Tuế năm ${namXem} (cùng tuổi con giáp của năm)`);
  } else if (inPair(LUC_XUNG, cc.chiIdx, namChiIdx)) {
    score -= 4;
    warnings.push(`Xung Thái Tuế (Tuế Phá) năm ${namXem}`);
  } else if (inPair(LUC_HOP, cc.chiIdx, namChiIdx)) {
    score += 2;
    reasons.push(`Lục Hợp với năm ${namXem}`);
  } else if (inGroup(TAM_HOP, cc.chiIdx, namChiIdx)) {
    score += 2;
    reasons.push(`Tam Hợp với năm ${namXem}`);
  }

  // ── Tầng 3: nạp âm ngũ hành so với chủ nhà ──
  if (SINH[cc.hanh] === chuHanh) {
    score += 2;
    reasons.push(`Mệnh ${cc.hanh} sinh mệnh ${chuHanh} của chủ nhà`);
  } else if (cc.hanh === chuHanh) {
    score += 1;
    reasons.push(`Cùng hành ${cc.hanh} với chủ nhà`);
  } else if (KHAC[cc.hanh] === chuHanh) {
    score -= 2;
    warnings.push(`Mệnh ${cc.hanh} khắc mệnh ${chuHanh} của chủ nhà`);
  }

  const verdict: XongDatCandidate['verdict'] =
    warnings.some((w) => /Lục Xung với tuổi chủ nhà|Tuế Phá|Thái Tuế/.test(w)) || score <= -2
      ? 'nen-tranh'
      : score >= 6
        ? 'rat-hop'
        : score >= 3
          ? 'hop'
          : 'binh';

  return {
    namSinh,
    tuoi: namXem - namSinh + 1, // tuổi mụ
    canChi: cc.canChi,
    chi: cc.chi,
    napAm: cc.napAm,
    hanh: cc.hanh,
    score,
    verdict,
    reasons,
    warnings,
  };
}

/**
 * Chấm tuổi xông đất cho một chủ nhà.
 *
 * Dải ứng viên: 18–70 tuổi mụ. Không phải con số cho đẹp — dưới 18 thì theo lệ
 * không ai nhờ xông đất, trên 70 thì mời người cao tuổi ra đường sáng mùng Một
 * là điều bản thân cái lệ đó tránh. Trả về TẤT CẢ trong dải rồi để trang tự
 * cắt: người dùng cần thấy cả tuổi NÊN TRÁNH, không chỉ tuổi hợp.
 */
export function computeXongDat(namSinhChuNha: number, namXem: number): XongDatResult | null {
  const chu = ccInfo(namSinhChuNha);
  const nam = ccInfo(namXem);
  if (!chu || !nam) return null;

  const out: XongDatCandidate[] = [];
  for (let t = 18; t <= 70; t++) {
    const ns = namXem - t + 1;
    const c = evalCandidate(ns, chu.chiIdx, chu.hanh, nam.chiIdx, namXem);
    if (c) out.push(c);
  }
  out.sort((a, b) => b.score - a.score || b.namSinh - a.namSinh);

  const chuNote: string[] = [];
  if (chu.chiIdx === nam.chiIdx) chuNote.push(`Chủ nhà tuổi ${chu.chi} — năm ${namXem} là năm tuổi (phạm Thái Tuế).`);
  else if (inPair(LUC_XUNG, chu.chiIdx, nam.chiIdx)) chuNote.push(`Chủ nhà tuổi ${chu.chi} xung với năm ${nam.chi} (Tuế Phá).`);

  return {
    namXem,
    tetDate: TET[namXem] || '',
    namCanChi: nam.canChi,
    chuNha: { namSinh: namSinhChuNha, canChi: chu.canChi, hanh: chu.hanh, napAm: chu.napAm },
    candidates: out,
    chuNhaNote: chuNote,
    caveat: CAVEAT,
  };
}

/** Nhãn tiếng Việt cho verdict — một nguồn, để trang và bản chia sẻ không lệch. */
export const VERDICT_LABEL: Record<XongDatCandidate['verdict'], string> = {
  'rat-hop': 'Rất hợp',
  hop: 'Hợp',
  binh: 'Bình thường',
  'nen-tranh': 'Nên tránh',
};
