// ============================================================
// NGÀY TỐT — ACTIVITY SCORING
// ============================================================
// Cho 1 NgayTotInfo + 1 ActivityKey → trả về điểm 0-10 + lý do.
// Rules dựa vào truyền thống: trực phù hợp, hoàng đạo, cấm kỵ.

import type { NgayTotInfo } from './engine.js';
import { type ActivityKey, type Truc, ACTIVITY_META } from './constants.js';

export interface ActivityScore {
  activity: ActivityKey;
  score: number;          // 0-10 (10 = xuất sắc)
  level: 'rất tốt' | 'tốt' | 'bình thường' | 'xấu' | 'rất xấu';
  reasons: string[];      // lý do điểm cộng
  warnings: string[];     // lý do điểm trừ (việc kiêng)
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
  let score = 5; // base

  // Trực
  if (rule.trucTot.includes(info.truc)) {
    score += 2;
    reasons.push(`Trực ${info.truc} hợp ${ACTIVITY_META[activity].name.toLowerCase()}`);
  }
  if (rule.trucXau.includes(info.truc)) {
    score -= 2;
    warnings.push(`Trực ${info.truc} không hợp ${ACTIVITY_META[activity].name.toLowerCase()}`);
  }

  // Hoàng đạo bonus
  if (info.hoangDao) {
    score += 2;
    reasons.push(`Hoàng đạo (sao ${info.saoNgay} — ${info.saoYNghia})`);
  } else {
    score -= 1;
    warnings.push(`Hắc đạo (sao ${info.saoNgay} — ${info.saoYNghia})`);
  }

  // 28 tú
  if (info.tuTinhChat === 'cát') {
    score += 1;
    reasons.push(`Sao ${info.tu} (cát tinh trong 28 tú)`);
  } else {
    score -= 1;
    warnings.push(`Sao ${info.tu} (hung tinh trong 28 tú)`);
  }

  // Cấm kỵ
  if (info.kyTamNuong) {
    score -= 2;
    warnings.push(`Ngày Tam Nương (mùng ${info.amLich.day} ÂL)`);
  }
  if (info.kyNguyetKy) {
    score -= 2;
    warnings.push(`Ngày Nguyệt Kỵ (mùng ${info.amLich.day} ÂL)`);
  }
  if (info.kyDuongCong) {
    score -= 3;
    warnings.push(`Ngày Dương Công kỵ nhật`);
  }

  // Hard blocks
  if (rule.hardBlockTrucs?.includes(info.truc)) {
    score = Math.min(score, 1);
    warnings.push(`CẤM TUYỆT ĐỐI: trực ${info.truc} đại kỵ ${ACTIVITY_META[activity].name.toLowerCase()}`);
  }
  if (rule.hardBlockKy?.includes('tamNuong') && info.kyTamNuong) {
    score = Math.min(score, 1);
    warnings.push(`CẤM TUYỆT ĐỐI: Tam Nương kỵ ${ACTIVITY_META[activity].name.toLowerCase()}`);
  }
  if (rule.hardBlockKy?.includes('nguyetKy') && info.kyNguyetKy) {
    score = Math.min(score, 1);
    warnings.push(`CẤM TUYỆT ĐỐI: Nguyệt Kỵ kỵ ${ACTIVITY_META[activity].name.toLowerCase()}`);
  }
  if (rule.hardBlockKy?.includes('duongCong') && info.kyDuongCong) {
    score = Math.min(score, 1);
    warnings.push(`CẤM TUYỆT ĐỐI: Dương Công kỵ ${ACTIVITY_META[activity].name.toLowerCase()}`);
  }

  // Clamp 0-10
  score = Math.max(0, Math.min(10, score));

  const level: ActivityScore['level'] =
    score >= 8 ? 'rất tốt' :
    score >= 6 ? 'tốt' :
    score >= 4 ? 'bình thường' :
    score >= 2 ? 'xấu' : 'rất xấu';

  return { activity, score, level, reasons, warnings };
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
