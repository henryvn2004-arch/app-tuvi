// lib/ops/jobs.ts
// ============================================================
// S4 (track COO) — SỔ ĐĂNG KÝ JOB + phát hiện "đáng lẽ phải chạy mà không chạy".
//
// VÌ SAO CẦN SỔ Ở SERVER: sổ cũ nằm hardcode trong `public/admin.html`
// (`CRON_JOBS`) và đã TRÔI khỏi thực tế — khai 5 job trong khi `vercel.json`
// có 9, tức `cmo-digest`, `anomaly-alerts` và 3 job autopilot HOÀN TOÀN VẮNG
// MẶT trên trang giám sát. Đó chính là lý do vụ CMO Digest chết 14 ngày không
// ai thấy: không phải nó bị bỏ qua, mà nó chưa bao giờ có mặt để mà nhìn.
// Đưa sổ về server để chỉ còn MỘT nguồn, và panel đọc từ đây.
//
// `everyMinutes` là thứ sổ cũ không có: chỉ có chuỗi mô tả cho người đọc, nên
// máy không thể tự kết luận job đã trễ. Đây là điều kiện để phát hiện job chết
// ÂM THẦM — loại hỏng nguy hiểm nhất vì nó không tạo ra dòng lỗi nào cả.
// ============================================================

export interface JobSpec {
  key: string;
  label: string;
  source: 'vercel' | 'edge' | 'pgcron';
  /** Chu kỳ kỳ vọng (phút). Dùng để tính "đã trễ". */
  everyMinutes: number;
  /** Mô tả lịch cho người đọc. */
  schedule: string;
  sink: string;
  trigger?: boolean;
}

const H = 60;
const D = 24 * 60;

/** Nguồn DUY NHẤT. Thêm cron mới trong `vercel.json` thì thêm ở đây luôn. */
export const JOBS: JobSpec[] = [
  { key: 'cron-khao-luan', label: 'Viết Khảo Luận', source: 'vercel', everyMinutes: 8 * H,
    schedule: '03·11·15h hằng ngày', sink: 'khao_luan → blog', trigger: true },
  { key: 'cron-master-write', label: 'Viết Nghiên Cứu', source: 'vercel', everyMinutes: 6 * H,
    schedule: '02·06·10·16·20h', sink: 'master_articles', trigger: true },
  { key: 'cron-push', label: 'Push (web)', source: 'vercel', everyMinutes: D,
    schedule: '00:00 hằng ngày', sink: 'edge send-daily-push', trigger: true },
  { key: 'cron-daily-push', label: 'Push (app/FCM)', source: 'vercel', everyMinutes: D,
    schedule: '00:00 hằng ngày', sink: 'push_tokens (FCM)', trigger: true },
  { key: 'auto-pipeline', label: 'Pipeline YouTube', source: 'edge', everyMinutes: D,
    schedule: '00:00 (pg_cron)', sink: 'auto-pipeline (edge)', trigger: true },
  // ── 5 job dưới đây TRƯỚC ĐÂY KHÔNG có trong sổ admin ──
  { key: 'ops-digest', label: 'Digest Vận Hành', source: 'vercel', everyMinutes: D,
    schedule: '07:30 VN hằng ngày', sink: 'Telegram admin + events', trigger: true },
  { key: 'cmo-digest', label: 'CMO Digest', source: 'vercel', everyMinutes: D,
    schedule: '08:00 VN hằng ngày', sink: 'Telegram admin', trigger: true },
  { key: 'anomaly-alerts', label: 'Cảnh báo bất thường', source: 'vercel', everyMinutes: 3 * H,
    schedule: 'mỗi 3 giờ', sink: 'Telegram admin + events', trigger: true },
  { key: 'autopilot-price', label: 'Autopilot — giá', source: 'vercel', everyMinutes: 7 * D,
    schedule: 'T2 hằng tuần', sink: 'autopilot_actions', trigger: true },
  { key: 'autopilot-promo', label: 'Autopilot — khuyến mãi', source: 'vercel', everyMinutes: 7 * D,
    schedule: 'T4 hằng tuần', sink: 'autopilot_actions', trigger: true },
  { key: 'autopilot-nudge', label: 'Autopilot — nhắc segment', source: 'vercel', everyMinutes: 7 * D,
    schedule: 'T6 hằng tuần', sink: 'autopilot_actions', trigger: true },
  { key: 'content-pack', label: 'Content Pack TikTok', source: 'vercel', everyMinutes: 7 * D,
    schedule: 'CN hằng tuần', sink: 'Telegram admin', trigger: true },
];

export interface CronRun {
  job_key: string;
  status: string;
  started_at: string;
  note?: string | null;
}

export interface JobHealth extends JobSpec {
  lastRun: string | null;
  lastStatus: string | null;
  /** Quá HẠN vì trễ hơn 1.5× chu kỳ (đệm cho lệch giờ chạy). */
  overdue: boolean;
  minutesLate: number;
  /** Số lượt `skip` LIÊN TIẾP gần nhất. */
  skipStreak: number;
}

/**
 * Đối chiếu sổ với log thật.
 *
 * Hệ số 1.5× là đệm: cron nhà cung cấp hiếm khi chạy đúng phút, và job hằng
 * ngày lệch vài chục phút là bình thường. Dưới 1.5× mà đã báo thì mỗi tuần
 * mấy lần báo giả, rồi cảnh báo thật cũng bị bỏ qua theo.
 */
export function evaluateJobs(runs: CronRun[]): JobHealth[] {
  const byKey = new Map<string, CronRun[]>();
  for (const r of runs) {
    const arr = byKey.get(r.job_key) || [];
    arr.push(r);
    byKey.set(r.job_key, arr);
  }
  const now = Date.now();

  return JOBS.map((spec) => {
    // `runs` đã được sắp mới→cũ từ query; sắp lại cho chắc.
    const rs = (byKey.get(spec.key) || []).slice().sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
    const last = rs[0] || null;
    const lastMs = last ? new Date(last.started_at).getTime() : 0;
    const minutesLate = last ? Math.max(0, Math.round((now - lastMs) / 60000) - spec.everyMinutes) : Infinity;

    // Đếm skip LIÊN TIẾP từ lần chạy gần nhất trở về trước. Một job `skip` đều
    // đặn hết lần này tới lần khác KHÔNG phải "bình thường" — nó đang không làm
    // được việc của nó, chỉ là im lặng thay vì báo lỗi (đúng vụ CMO Digest).
    let skipStreak = 0;
    for (const r of rs) {
      if (r.status === 'skip') skipStreak++;
      else break;
    }

    return {
      ...spec,
      lastRun: last?.started_at || null,
      lastStatus: last?.status || null,
      // Chưa từng có log cũng là quá hạn: job khai trong sổ mà không để lại vết
      // nào thì hoặc không chạy, hoặc không ghi log — cả hai đều cần biết.
      overdue: !last || now - lastMs > spec.everyMinutes * 1.5 * 60000,
      minutesLate: Number.isFinite(minutesLate) ? minutesLate : -1,
      skipStreak,
    };
  });
}
