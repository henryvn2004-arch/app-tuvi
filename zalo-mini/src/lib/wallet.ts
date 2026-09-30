// Số dư Lượng — GET /api/payment?action=balance&userId= (Bearer, phải đúng chủ).
// Mini App KHÔNG bán gói nạp (chính sách Zalo cấm nạp ví nội bộ) — xem MePage.
import { api, currentUserId } from './session';

export async function getBalance(): Promise<number> {
  const uid = await currentUserId();
  const d = await api<{ balance?: number }>(
    `/api/payment?action=balance&userId=${encodeURIComponent(uid)}`
  );
  return Number(d.balance) || 0;
}
