// Ví Lượng — cùng API với trang nạp của web (public/topup.html):
//   số dư  GET  /api/payment?action=balance&userId=   (Bearer, phải đúng chủ)
//   gói    `credit_packages` (Supabase, khoá anon — cùng nguồn tool-prices.js; KHÔNG chép số)
//   nạp    POST /api/payment?action=create-bank       → link thanh toán payOS
//   chờ    GET  /api/payment?action=check-bank&orderCode=
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { api, currentUserId } from './session';

export interface CreditPackage {
  package_id: string;
  credits: number;
  amount_vnd: number;
  label: string;
}

export interface BankOrder {
  orderCode: number | string;
  checkoutUrl: string;
  amountVND: number;
  credits: number;
}

export async function getBalance(): Promise<number> {
  const uid = await currentUserId();
  const d = await api<{ balance?: number }>(
    `/api/payment?action=balance&userId=${encodeURIComponent(uid)}`
  );
  return Number(d.balance) || 0;
}

export async function listPackages(): Promise<CreditPackage[]> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/credit_packages?enabled=eq.true&select=package_id,credits,amount_vnd,label&order=sort_order.asc`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!r.ok) throw new Error('Chưa tải được bảng giá gói nạp');
  return (await r.json()) as CreditPackage[];
}

export async function createBankOrder(packageId: string): Promise<BankOrder> {
  const userId = await currentUserId();
  return api<BankOrder>('/api/payment?action=create-bank', {
    method: 'POST',
    body: JSON.stringify({ packageId, userId }),
  });
}

export async function isOrderPaid(orderCode: BankOrder['orderCode']): Promise<boolean> {
  const d = await api<{ paid?: boolean }>(
    `/api/payment?action=check-bank&orderCode=${encodeURIComponent(String(orderCode))}`
  );
  return d.paid === true;
}
