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
}

// Khớp seed migration-credit-packages.sql + migration-pricing-v2.sql.
// Dùng khi DB đọc hụt — phải GIỮ KHỚP với DB, vì để lệch thì đúng lúc Supabase
// chớp một nhịp người dùng trả 99.000đ mà chỉ nhận 50 Lượng thay vì 100.
const FALLBACK: Record<string, CreditPackage> = {
  '50':  { packageId: '50',  credits: 100,  amountVnd: 99_000,  amountUsd: '4.00',  label: 'Khởi Đầu' },
  '120': { packageId: '120', credits: 240,  amountVnd: 199_000, amountUsd: '8.00',  label: 'Phổ Thông' },
  '350': { packageId: '350', credits: 700,  amountVnd: 499_000, amountUsd: '20.00', label: 'Cao Cấp' },
  '800': { packageId: '800', credits: 1600, amountVnd: 999_000, amountUsd: '40.00', label: 'VIP' },
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
        `${SUPABASE_URL}/rest/v1/credit_packages?enabled=eq.true&select=package_id,credits,amount_vnd,amount_usd,label`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      if (res.ok) {
        const rows = (await res.json()) as {
          package_id: string; credits: number; amount_vnd: number; amount_usd: string | number; label: string;
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

export interface CustomQuote {
  credits: number;
  /** đ cho 1 Lượng đã áp cho lượt nạp này. */
  vndPerCredit: number;
  /** Gói làm mốc đơn giá — để giao diện nói được "tính theo gói X". */
  tierLabel: string;
}

/**
 * Quy đổi SỐ TIỀN TỰ CHỌN ra Lượng.
 *
 * Trước đây chỗ này chia cứng 2.500đ/Lượng, trong khi bậc gói đã tụt xuống
 * 624–990đ/Lượng — nghĩa là nạp lẻ đắt hơn mua gói 2,5–4 lần (99.000đ mua gói
 * được 100 Lượng, nạp lẻ chỉ 39). Con số 2.500đ là tàn dư bảng giá cũ, và nó
 * lệch được chính vì nó là một hằng số RIÊNG, không dính gì tới bảng gói.
 *
 * Nay đơn giá SUY TỪ `credit_packages`: lấy bậc tốt nhất mà số tiền này với
 * tới (đơn giá thấp nhất trong các gói có `amountVnd <= amount`). Dưới mức gói
 * nhỏ nhất thì hưởng đơn giá bậc vào cửa. Nhờ vậy:
 *   • nạp lẻ KHÔNG BAO GIỜ thiệt hơn mua gói cùng số tiền;
 *   • thêm tiền không bao giờ nhận ít Lượng hơn (đơn giá chỉ tốt lên);
 *   • đổi giá gói dưới DB là đường nạp lẻ tự đi theo — hết đường trôi lệch.
 *
 * Lấy `min` trên các gói với tới được (thay vì "gói đắt nhất ≤ số tiền") để
 * vẫn đúng kể cả khi admin khai một bậc gói không đơn điệu.
 */
export async function quoteCustomVnd(amountVnd: number): Promise<CustomQuote> {
  const pkgs = Object.values(await getPackages())
    .filter((p) => p.credits > 0 && p.amountVnd > 0);
  if (!pkgs.length) return { credits: 0, vndPerCredit: 0, tierLabel: '' };

  const rate = (p: CreditPackage) => p.amountVnd / p.credits;
  const affordable = pkgs.filter((p) => p.amountVnd <= amountVnd);
  // Với tới bậc nào thì hưởng bậc đó; chưa với tới gói nhỏ nhất → bậc vào cửa
  // (đơn giá CAO nhất), tức không được ưu đãi mà cũng không bị phạt thêm.
  const tier = (affordable.length ? affordable : pkgs).reduce((best, p) =>
    (affordable.length ? rate(p) < rate(best) : rate(p) > rate(best)) ? p : best,
  );
  const vndPerCredit = rate(tier);
  return {
    credits: Math.floor(amountVnd / vndPerCredit),
    vndPerCredit,
    tierLabel: tier.label,
  };
}

export function invalidatePackages() {
  cache = null;
}
