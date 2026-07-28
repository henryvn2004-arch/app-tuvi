// lib/ops/rate-limit.ts
// ============================================================
// S6 (track COO) — chặn bơm sự kiện vào `/api/track`.
//
// VÌ SAO ĐÁNG LÀM: `/api/track` là endpoint KHÔNG cần đăng nhập, ghi thẳng vào
// bảng `events`. Mà `events` chính là nguồn nuôi số liệu marketing, và autopilot
// M0.6 đọc số liệu đó để TỰ CHỈNH GIÁ / TỰ CẤP KHUYẾN MÃI. Nên đây không chỉ là
// chuyện rác dữ liệu: bơm được `events` là lái được hành động thật của hệ thống.
//
// ⚠️ GIỚI HẠN — nói thẳng để không ai tưởng đây là tường thành:
// Vercel chạy serverless, mỗi instance một vùng nhớ riêng, KHÔNG chia sẻ bộ
// đếm. Nên bộ này chặn được: vòng lặp client chạy loạn, script một máy, người
// tò mò curl thử. KHÔNG chặn được: kẻ tấn công phân tán qua nhiều IP rơi vào
// nhiều instance.
//
// Đó là lựa chọn CÓ Ý THỨC, không phải bỏ sót. Bộ đếm dùng chung (Redis/DB)
// nghĩa là thêm một vòng mạng vào MỌI beacon — trả giá trên đường nóng để
// chống một mối đe doạ chưa từng xảy ra (nền đo được: cao nhất 41 event/anon
// trong 24h). Nên chọn: chặn rẻ ở đây cho phần lớn trường hợp, và để
// `security_audit()` làm lưới an toàn — nó soi TOÀN CỤC trên dữ liệu đã ghi,
// nên thấy được đúng cái mà bộ đếm cục bộ này bỏ lọt.
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';

interface RateCfg {
  enabled: boolean;
  /** Số event tối đa cho một danh tính trong 1 phút. */
  perMinute: number;
}

const FALLBACK: RateCfg = { enabled: true, perMinute: 300 };

// Cache config trong tiến trình. `getConfigValue` CỐ Ý không cache (xem
// appConfig.ts), mà đây là đường nóng — đọc DB mỗi beacon là tự bắn vào chân.
const CFG_TTL_MS = 60_000;
let cfgCache: { at: number; cfg: RateCfg } | null = null;

async function getCfg(): Promise<RateCfg> {
  const now = Date.now();
  if (cfgCache && now - cfgCache.at < CFG_TTL_MS) return cfgCache.cfg;
  let cfg = FALLBACK;
  try {
    const raw = await getConfigValue<Partial<RateCfg>>('ops.track_rate_limit', {});
    cfg = {
      enabled: raw?.enabled !== false,
      perMinute: Number(raw?.perMinute) > 0 ? Number(raw!.perMinute) : FALLBACK.perMinute,
    };
  } catch {
    // Đọc config hỏng thì KHÔNG chặn ai cả. Beacon sai lệch còn hơn beacon
    // chết: chặn nhầm là mất số liệu thật, mà mất số liệu thật thì cả dàn
    // cảnh báo COO phía sau mù theo.
    cfg = FALLBACK;
  }
  cfgCache = { at: now, cfg };
  return cfg;
}

interface Bucket {
  n: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

/** Dọn rác định kỳ để Map không phình vô hạn trên instance sống lâu. */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  // `Array.from` thay vì duyệt thẳng Map: tsconfig của repo target ES cũ,
  // iterate Map trực tiếp cần cờ downlevelIteration. Dựng mảng khoá trước cũng
  // an toàn hơn khi xoá ngay trong lúc duyệt.
  for (const k of Array.from(buckets.keys())) {
    const b = buckets.get(k);
    if (b && b.resetAt <= now) buckets.delete(k);
  }
}

export interface RateVerdict {
  allowed: boolean;
  /** Số event đã ghi nhận trong cửa sổ hiện tại (sau khi cộng lượt này). */
  count: number;
  limit: number;
}

/**
 * Ghi nhận `cost` event cho `identity` và cho biết có được đi tiếp không.
 *
 * `cost` là SỐ EVENT trong lô, không phải số request — client gom tối đa 30
 * event một lần gửi, nên đếm theo request là đếm sai một bậc.
 */
export async function checkTrackRate(identity: string, cost: number): Promise<RateVerdict> {
  const cfg = await getCfg();
  if (!cfg.enabled) return { allowed: true, count: 0, limit: cfg.perMinute };

  const now = Date.now();
  sweep(now);

  let b = buckets.get(identity);
  if (!b || b.resetAt <= now) {
    b = { n: 0, resetAt: now + 60_000 };
    buckets.set(identity, b);
  }
  b.n += cost;
  return { allowed: b.n <= cfg.perMinute, count: b.n, limit: cfg.perMinute };
}

/** Chỉ dùng cho test — xoá trạng thái giữa các ca. */
export function _resetRateState(): void {
  buckets.clear();
  cfgCache = null;
}
