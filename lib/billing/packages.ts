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

// Khớp seed migration-credit-packages.sql. Dùng khi DB đọc hụt.
const FALLBACK: Record<string, CreditPackage> = {
  '50':  { packageId: '50',  credits: 50,  amountVnd: 99_000,  amountUsd: '4.00',  label: 'Khởi Đầu',  bonusLabel: '+25%' },
  '120': { packageId: '120', credits: 120, amountVnd: 199_000, amountUsd: '8.00',  label: 'Phổ Thông', bonusLabel: '+50%' },
  '350': { packageId: '350', credits: 350, amountVnd: 499_000, amountUsd: '20.00', label: 'Cao Cấp',   bonusLabel: '+75%' },
  '800': { packageId: '800', credits: 800, amountVnd: 999_000, amountUsd: '40.00', label: 'VIP',       bonusLabel: '+100%' },
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
