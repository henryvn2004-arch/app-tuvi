// lib/billing/packages.ts
// ============================================================
// GÓI NẠP — nguồn sự thật = bảng Supabase `credit_packages` (admin sửa được).
// Server /api/payment đọc qua getPackages(); nếu DB đọc hụt → FALLBACK hardcode
// (an toàn tuyệt đối cho luồng thanh toán, không bao giờ để user nạp mà mất gói).
// Cache in-memory TTL ngắn. Không bao giờ throw.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export interface CreditPackage {
  packageId: string;
  credits: number;
  amountVnd: number;
  amountUsd: string; // chuỗi 2 chữ số thập phân cho PayPal (vd '4.00')
  label: string;
  bonusLabel?: string;
}

/**
 * Neo quy đổi 1 Lượng ≈ VNĐ, dùng cho GÓI NẠP TÙY CHỈNH (mức tiền tự nhập).
 *
 * Suy từ gói vào cửa: 99.000đ / 100 Lượng = 990đ → làm tròn 1.000đ, tức nạp tùy
 * chỉnh luôn hơi đắt hơn gói rẻ nhất. CỐ Ý: gói có sẵn phải luôn lợi hơn, nếu
 * không thì bậc giá mất nghĩa và không ai bấm gói nào.
 *
 * ĐỒNG BỘ với `app_config['credits.vnd_per_credit']` (RPC báo cáo đọc qua hàm
 * `credit_vnd()`). Đổi một bên mà quên bên kia thì panel Biên Lợi Nhuận và giá
 * nạp thật lệch nhau — xem `_patches/migration-pricing-v2.sql`.
 *
 * KHÔNG dùng cho topup LỊCH SỬ: các dòng đó có `amount_vnd` thật, hoặc rơi về
 * ×2500 đúng với giá lúc chúng phát sinh.
 */
export const VND_PER_CREDIT = 1000;

// Khớp seed migration-credit-packages.sql + migration-pricing-v2.sql.
// Dùng khi DB đọc hụt — phải GIỮ KHỚP với DB, vì để lệch thì đúng lúc Supabase
// chớp một nhịp người dùng trả 99.000đ mà chỉ nhận 50 Lượng thay vì 100.
const FALLBACK: Record<string, CreditPackage> = {
  '50':  { packageId: '50',  credits: 100,  amountVnd: 99_000,  amountUsd: '4.00',  label: 'Khởi Đầu',  bonusLabel: '4 lá số' },
  '120': { packageId: '120', credits: 240,  amountVnd: 199_000, amountUsd: '8.00',  label: 'Phổ Thông', bonusLabel: '9 lá số' },
  '350': { packageId: '350', credits: 700,  amountVnd: 499_000, amountUsd: '20.00', label: 'Cao Cấp',   bonusLabel: '28 lá số' },
  '800': { packageId: '800', credits: 1600, amountVnd: 999_000, amountUsd: '40.00', label: 'VIP',       bonusLabel: '64 lá số' },
};

const TTL_MS = 60_000;
let cache: { at: number; map: Record<string, CreditPackage> } | null = null;

/** Bản đồ gói nạp (đã enabled), key = package_id. Rơi về FALLBACK nếu DB hụt. */
export async function getPackages(): Promise<Record<string, CreditPackage>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.map;

  let map: Record<string, CreditPackage> | null = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/credit_packages?enabled=eq.true&select=package_id,credits,amount_vnd,amount_usd,label,bonus_label`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      if (res.ok) {
        const rows = (await res.json()) as {
          package_id: string; credits: number; amount_vnd: number; amount_usd: string | number; label: string; bonus_label?: string;
        }[];
        if (rows.length) {
          map = {};
          for (const r of rows) {
            map[r.package_id] = {
              packageId: r.package_id,
              credits: Number(r.credits),
              amountVnd: Number(r.amount_vnd),
              amountUsd: Number(r.amount_usd).toFixed(2),
              label: r.label,
              bonusLabel: r.bonus_label || undefined,
            };
          }
        }
      }
    } catch {
      /* fallback */
    }
  }

  const finalMap = map && Object.keys(map).length ? map : FALLBACK;
  cache = { at: now, map: finalMap };
  return finalMap;
}

/** 1 gói theo id (đã enabled), hoặc null. */
export async function getPackage(packageId: string): Promise<CreditPackage | null> {
  return (await getPackages())[packageId] || null;
}

export function invalidatePackages() {
  cache = null;
}
