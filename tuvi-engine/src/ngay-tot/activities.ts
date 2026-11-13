// ============================================================
// NGÀY TỐT — ACTIVITY SCORING
// ============================================================
// Cho 1 NgayTotInfo + 1 ActivityKey → trả về điểm 0-10 + lý do.
// Rules dựa vào truyền thống: trực phù hợp, hoàng đạo, cấm kỵ.

import type { NgayTotInfo } from './engine.js';
import { type ActivityKey, type Truc, ACTIVITY_META } from './constants.js';

/**
 * Mã tra song song với từng dòng `reasons`/`warnings` (additive — chữ Việt vẫn do engine dựng, còn vào
 * rail/prompt/cache). `k` = khoá của `LY_DO`; `v` = biến THÔ (tên trực/tú/sao/mã việc/ngày âm) — nơi vẽ
 * dịch từng biến rồi thay vào khuôn đã dịch cùng khoá (`I18n.long('ngay-tot', 'ly.' + k, …)`).
 */
export interface LyDoMa {
  k: keyof typeof LY_DO;
  v?: Record<string, string>;
}

export interface ActivityScore {
  activity: ActivityKey;
  score: number;          // 0-10 (10 = xuất sắc)
  level: 'rất tốt' | 'tốt' | 'bình thường' | 'xấu' | 'rất xấu';
  reasons: string[];      // lý do điểm cộng
  warnings: string[];     // lý do điểm trừ (việc kiêng)
  reasonsMa: LyDoMa[];    // song song với `reasons`
  warningsMa: LyDoMa[];   // song song với `warnings`
}

// ─── Khuôn câu lý do / cảnh báo ─────────────────────────────
// Bảng khuôn phẳng (W28 loại b): engine dựng chữ Việt bằng CHÍNH bảng này, bản dịch dùng cùng khoá.
// {viec} = tên việc viết thường · {truc} {tu} {sao} {y} = tên engine · {ngay} = ngày âm lịch.
export const LY_DO = {
  'truc.hop': 'Trực {truc} hợp {viec}',
  'truc.khong': 'Trực {truc} không hợp {viec}',
  'hoang': 'Hoàng đạo (sao {sao} — {y})',
  'hac': 'Hắc đạo (sao {sao} — {y})',
  'tu.cat': 'Sao {tu} (cát tinh trong 28 tú)',
  'tu.hung': 'Sao {tu} (hung tinh trong 28 tú)',
  'tamnuong': 'Ngày Tam Nương (mùng {ngay} ÂL)',
  'nguyetky': 'Ngày Nguyệt Kỵ (mùng {ngay} ÂL)',
  'duongcong': 'Ngày Dương Công kỵ nhật',
  'cam.truc': 'CẤM TUYỆT ĐỐI: trực {truc} đại kỵ {viec}',
  'cam.tamnuong': 'CẤM TUYỆT ĐỐI: Tam Nương kỵ {viec}',
  'cam.nguyetky': 'CẤM TUYỆT ĐỐI: Nguyệt Kỵ kỵ {viec}',
  'cam.duongcong': 'CẤM TUYỆT ĐỐI: Dương Công kỵ {viec}',
} as const;

function dung(mau: string, bien: Record<string, string>): string {
  return mau.replace(/\{(\w+)\}/g, (m, n: string) => (bien[n] !== undefined ? bien[n] : m));
}

// ─── Rules theo từng activity ───────────────────────────────
// Format: trực tốt (+3), trực xấu (-3), hoàng đạo (+2), hắc đạo (-2),
// 28 tú cát (+1) / hung (-1), Tam Nương/Nguyệt Kỵ/Dương Công (-3 to -5)
// Một số activity có hard-block (cấm tuyệt đối)

interface ActivityRule {
  trucTot: Truc[];
  trucXau: Truc[];
  hardBlockTrucs?: Truc[];  // điểm về 0 nếu trực này
  hardBlockKy?: Array<'tamNuong' | 'nguyetKy' | 'duongCong'>;
  bonusNote?: string;
}

const RULES: Record<ActivityKey, ActivityRule> = {
  'cuoi-hoi': {
    trucTot: ['Định', 'Thành', 'Khai', 'Mãn'],
    trucXau: ['Phá', 'Nguy', 'Bế', 'Bình'],
    hardBlockKy: ['tamNuong', 'duongCong'],
    bonusNote: 'Nên chọn ngày Định, Thành — kỵ tuyệt đối Tam Nương, Dương Công',
  },
  'khoi-cong': {
    trucTot: ['Bình', 'Định', 'Thành', 'Mãn'],
    trucXau: ['Kiến', 'Phá', 'Bế'],
    hardBlockTrucs: ['Phá'],
    hardBlockKy: ['duongCong'],
    bonusNote: 'Nên chọn trực Bình, Định — kỵ trực Phá (đại hung động thổ)',
  },
  'khai-truong': {
    trucTot: ['Khai', 'Mãn', 'Thành', 'Định'],
    trucXau: ['Bế', 'Phá', 'Nguy', 'Thu'],
    hardBlockTrucs: ['Bế'],
    hardBlockKy: ['tamNuong'],
    bonusNote: 'Trực Khai là đại cát cho khai trương — kỵ trực Bế',
  },
  'nhap-trach': {
    trucTot: ['Thành', 'Khai', 'Định', 'Mãn'],
    trucXau: ['Phá', 'Nguy', 'Bế'],
    hardBlockKy: ['duongCong', 'tamNuong'],
    bonusNote: 'Ngày Thành, Khai tốt nhất — tránh Tam Nương, Dương Công',
  },
  'xuat-hanh': {
    trucTot: ['Khai', 'Định', 'Thành'],
    trucXau: ['Phá', 'Nguy', 'Bế'],
    hardBlockKy: ['nguyetKy'],
    bonusNote: 'Trực Khai tốt nhất — Nguyệt Kỵ tuyệt đối tránh xuất hành',
  },
  'cau-tai': {
    trucTot: ['Mãn', 'Thu', 'Khai', 'Chấp'],
    trucXau: ['Phá', 'Bế'],
    bonusNote: 'Trực Mãn, Thu hợp cầu tài lộc',
  },
  'sinh-con': {
    trucTot: ['Thành', 'Khai', 'Định'],
    trucXau: ['Phá', 'Nguy', 'Bế', 'Thu'],
    hardBlockKy: ['tamNuong', 'nguyetKy', 'duongCong'],
    bonusNote: 'Việc trọng đại — tránh mọi ngày kỵ, ưu tiên trực Thành',
  },
  'an-tang': {
    trucTot: ['Thành', 'Thu', 'Khai', 'Phá'],
    trucXau: ['Kiến', 'Bình', 'Định'],
    hardBlockKy: ['duongCong'],
    bonusNote: 'Trái với việc khác: trực Phá lại hợp việc kết thúc (an táng)',
  },
  'dao-gieng': {
    trucTot: ['Mãn', 'Thành', 'Khai'],
    trucXau: ['Bế', 'Phá', 'Bình'],
    hardBlockTrucs: ['Bế'],
    bonusNote: 'Trực Bế cấm tuyệt đối (đại kỵ khoan giếng)',
  },
  'sua-nha': {
    trucTot: ['Bình', 'Định', 'Thành'],
    trucXau: ['Phá', 'Nguy', 'Bế'],
    hardBlockKy: ['duongCong'],
    bonusNote: 'Sửa chữa nhẹ — ngày Bình, Định ổn nhất',
  },
};

// ─── Scoring ────────────────────────────────────────────────
export function scoreActivity(info: NgayTotInfo, activity: ActivityKey): ActivityScore {
  const rule = RULES[activity];
  const reasons: string[] = [];
  const warnings: string[] = [];
  const reasonsMa: LyDoMa[] = [];
  const warningsMa: LyDoMa[] = [];
  const viec = ACTIVITY_META[activity].name.toLowerCase();
  // `ghi` dựng câu Việt từ khuôn + ghi mã song song; `v` là biến THÔ cho bản dịch, `bien` là biến chữ Việt.
  const cong = (k: LyDoMa['k'], v: Record<string, string>, bien: Record<string, string>) => {
    reasons.push(dung(LY_DO[k], bien)); reasonsMa.push({ k, v });
  };
  const tru = (k: LyDoMa['k'], v: Record<string, string>, bien: Record<string, string>) => {
    warnings.push(dung(LY_DO[k], bien)); warningsMa.push({ k, v });
  };
  let score = 5; // base

  // Trực
  if (rule.trucTot.includes(info.truc)) {
    score += 2;
    cong('truc.hop', { truc: info.truc, viec: activity }, { truc: info.truc, viec });
  }
  if (rule.trucXau.includes(info.truc)) {
    score -= 2;
    tru('truc.khong', { truc: info.truc, viec: activity }, { truc: info.truc, viec });
  }

  // Hoàng đạo bonus
  if (info.hoangDao) {
    score += 2;
    cong('hoang', { sao: info.saoNgay }, { sao: info.saoNgay, y: info.saoYNghia });
  } else {
    score -= 1;
    tru('hac', { sao: info.saoNgay }, { sao: info.saoNgay, y: info.saoYNghia });
  }

  // 28 tú
  if (info.tuTinhChat === 'cát') {
    score += 1;
    cong('tu.cat', { tu: info.tu }, { tu: info.tu });
  } else {
    score -= 1;
    tru('tu.hung', { tu: info.tu }, { tu: info.tu });
  }

  // Cấm kỵ
  if (info.kyTamNuong) {
    score -= 2;
    tru('tamnuong', { ngay: String(info.amLich.day) }, { ngay: String(info.amLich.day) });
  }
  if (info.kyNguyetKy) {
    score -= 2;
    tru('nguyetky', { ngay: String(info.amLich.day) }, { ngay: String(info.amLich.day) });
  }
  if (info.kyDuongCong) {
    score -= 3;
    tru('duongcong', {}, {});
  }

  // Hard blocks
  if (rule.hardBlockTrucs?.includes(info.truc)) {
    score = Math.min(score, 1);
    tru('cam.truc', { truc: info.truc, viec: activity }, { truc: info.truc, viec });
  }
  if (rule.hardBlockKy?.includes('tamNuong') && info.kyTamNuong) {
    score = Math.min(score, 1);
    tru('cam.tamnuong', { viec: activity }, { viec });
  }
  if (rule.hardBlockKy?.includes('nguyetKy') && info.kyNguyetKy) {
    score = Math.min(score, 1);
    tru('cam.nguyetky', { viec: activity }, { viec });
  }
  if (rule.hardBlockKy?.includes('duongCong') && info.kyDuongCong) {
    score = Math.min(score, 1);
    tru('cam.duongcong', { viec: activity }, { viec });
  }

  // Clamp 0-10
  score = Math.max(0, Math.min(10, score));

  const level: ActivityScore['level'] =
    score >= 8 ? 'rất tốt' :
    score >= 6 ? 'tốt' :
    score >= 4 ? 'bình thường' :
    score >= 2 ? 'xấu' : 'rất xấu';

  return { activity, score, level, reasons, warnings, reasonsMa, warningsMa };
}

// ─── Batch: score 1 ngày cho TẤT CẢ 10 activities ──────────
export function scoreAllActivities(info: NgayTotInfo): ActivityScore[] {
  return (Object.keys(RULES) as ActivityKey[]).map(act => scoreActivity(info, act));
}

// ─── Filter: lấy N ngày tốt nhất cho activity trong tháng ──
export function topDaysForActivity(
  monthInfo: NgayTotInfo[],
  activity: ActivityKey,
  topN = 10,
): Array<{ info: NgayTotInfo; score: ActivityScore }> {
  return monthInfo
    .map(info => ({ info, score: scoreActivity(info, activity) }))
    .filter(x => x.score.score >= 6)  // chỉ lấy ngày "tốt" trở lên
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, topN);
}
