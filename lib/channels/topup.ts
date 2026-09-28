// lib/channels/topup.ts
// ============================================================
// NẠP TIỀN NGAY TRONG CHAT — gửi ảnh VietQR vào cuộc trò chuyện, khách quét
// bằng app ngân hàng, webhook payOS cộng Lượng rồi bot báo lại tại chỗ
// (lib/channels/notify.ts). Không phải rời app chat, không phải đăng nhập web.
//
// Đơn tạo qua CÙNG cửa với trang nạp web (lib/billing/payos-order) ⇒ một
// đường chốt đơn duy nhất (`bank_settle_topup`). Giá đọc từ `credit_packages`
// (nguồn thật, Admin sửa không cần deploy) — không chép số nào ở đây.
// ============================================================

import { getPackages, getPackage, quoteCustomVnd, type CreditPackage } from '@/lib/billing/packages';
import { createPayOSOrder, type PayOSOrder } from '@/lib/billing/payos-order';
import type { ChatButton } from './core';

export const TOPUP_CMD = '/nap';
/** Mức nạp lẻ nhỏ nhất (khớp trần dưới của trang nạp web). */
const CUSTOM_MIN_VND = 50_000;
const CUSTOM_MAX_VND = 5_000_000;

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

/** Các lựa chọn nạp: một mức lẻ nhỏ + các gói (rẻ → đắt). */
export async function topupChoices(): Promise<ChatButton[]> {
  const pkgs = Object.values(await getPackages())
    .filter((p) => p.credits > 0 && p.amountVnd > 0)
    .sort((a, b) => a.amountVnd - b.amountVnd);
  const small = await quoteCustomVnd(CUSTOM_MIN_VND);
  const out: ChatButton[] = [];
  // Nút gửi câu tự nhiên "Nạp 200.000đ" (khách thấy nó thành tin của mình);
  // `parseTopup` nhận ra số tiền trùng một gói là chọn gói đó.
  if (small.credits > 0) out.push({ title: `${vnd(CUSTOM_MIN_VND)} (${small.credits} Lượng)`, reply: `Nạp ${vnd(CUSTOM_MIN_VND)}` });
  for (const p of pkgs.slice(0, 4)) out.push({ title: `${p.label} ${vnd(p.amountVnd)}`, reply: `Nạp ${vnd(p.amountVnd)}` });
  return out;
}

export type TopupPick =
  | { kind: 'menu' }
  | { kind: 'package'; pkg: CreditPackage }
  | { kind: 'custom'; amountVnd: number; credits: number }
  | { kind: 'invalid' };

/** "" → menu · "goi-120" → gói · "200.000đ" / "100k" → gói nếu trùng số tiền một gói, không thì nạp lẻ. */
export async function parseTopup(arg: string): Promise<TopupPick> {
  const a = arg.trim().toLowerCase();
  if (!a) return { kind: 'menu' };
  const g = a.match(/^goi-([a-z0-9_-]+)$/);
  if (g) {
    const pkg = await getPackage(g[1]);
    return pkg ? { kind: 'package', pkg } : { kind: 'invalid' };
  }
  const m = a
    .replace(/[.,\s]/g, '')
    .replace(/(đ|vnđ|vnd)$/, '')
    .match(/^(\d+)(k)?$/);
  if (!m) return { kind: 'invalid' };
  const amountVnd = Number(m[1]) * (m[2] ? 1000 : 1);
  const pkg = Object.values(await getPackages()).find((p) => p.credits > 0 && p.amountVnd === amountVnd);
  if (pkg) return { kind: 'package', pkg };
  if (amountVnd < CUSTOM_MIN_VND || amountVnd > CUSTOM_MAX_VND) return { kind: 'invalid' };
  const q = await quoteCustomVnd(amountVnd);
  return q.credits > 0 ? { kind: 'custom', amountVnd, credits: q.credits } : { kind: 'invalid' };
}

/** Tạo đơn payOS cho lựa chọn đã parse. null = lỗi (đã log). */
export async function createChatTopup(
  userId: string,
  pick: Extract<TopupPick, { kind: 'package' } | { kind: 'custom' }>,
): Promise<PayOSOrder | null> {
  try {
    return pick.kind === 'package'
      ? await createPayOSOrder({
          userId,
          packageId: pick.pkg.packageId,
          amountVND: pick.pkg.amountVnd,
          credits: pick.pkg.credits,
          label: `${pick.pkg.label} – ${pick.pkg.credits} Luong`,
        })
      : await createPayOSOrder({
          userId,
          packageId: 'custom',
          amountVND: pick.amountVnd,
          credits: pick.credits,
          label: `Nap ${pick.credits} Luong`,
        });
  } catch (e) {
    console.error('[chat-topup] tạo đơn payOS lỗi', e);
    return null;
  }
}

/**
 * Ảnh VietQR của đơn (dịch vụ ảnh công khai của VietQR — dựng từ BIN + số tài
 * khoản ảo payOS + số tiền + nội dung, đúng chuẩn NAPAS nên app ngân hàng nào
 * cũng quét được). Kênh chat chỉ nhận ẢNH theo URL công khai.
 */
export function vietQrImageUrl(o: PayOSOrder): string | null {
  if (!o.bin || !o.accountNumber) return null;
  const q = new URLSearchParams({
    amount: String(o.amountVND),
    addInfo: o.description,
    accountName: o.accountName || '',
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(o.bin)}-${encodeURIComponent(o.accountNumber)}-compact2.png?${q.toString()}`;
}

export function topupCaption(o: PayOSOrder): string {
  return (
    `Nạp ${vnd(o.amountVND)} → ${o.credits} Lượng\n` +
    `Nội dung chuyển khoản: ${o.description} (đã có sẵn trong mã)\n\n` +
    'Trên cùng điện thoại: bấm giữ ảnh QR → Lưu ảnh → mở app ngân hàng → Quét QR → chọn ảnh vừa lưu.\n' +
    'Tiền vào là thầy báo ngay tại đây.'
  );
}
