// lib/billing/payos.ts
// Nguồn DUY NHẤT dựng & kiểm chữ ký payOS (webhook + tạo đơn) — đúng thuật
// toán payOS tự dùng để ký (`createSignatureFromObj`, SDK Node chính thức:
// deep-sort object theo key RỒI mới build query string `key=value`).
//
// 🪤 Bẫy đã cắn: bản cũ ở mỗi route tự viết `${k}=${data[k]}` — template
// literal biến `null` thành CHUỖI "null", trong khi payOS ký field null bằng
// CHUỖI RỖNG (`key=`). Field null CHỈ xuất hiện tuỳ kênh chuyển (vd ví điện
// tử như Viettel Money không luôn điền counterAccountBankName/... như app
// ngân hàng thường) — nên lỗi chỉ rơi vào MỘT SỐ giao dịch, không phải tất
// cả, và test tay bằng payload đủ field luôn qua trót lọt. Đọc nhầm thành
// "checksum key sai" (test lại bằng chuyển khoản thật xong tưởng đã vá) đã
// suýt để lỗi này tái diễn im lặng — xem docs/nhat-ky/2026-09.md.
import crypto from 'crypto';

function sortObjDataByKey(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortObjDataByKey);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortObjDataByKey((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

function convertObjToQueryStr(object: Record<string, unknown>): string {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value: unknown = object[key];
      if (value && (Array.isArray(value) || typeof value === 'object')) {
        value = JSON.stringify(value);
      }
      if ([null, undefined, 'undefined', 'null'].includes(value as never)) {
        value = '';
      }
      return `${key}=${value}`;
    })
    .join('&');
}

/** Chữ ký payOS cho một object dữ liệu (webhook lẫn tạo đơn) — deep-sort TRƯỚC, build query string SAU. */
export function signPayOSData(data: Record<string, unknown>, checksumKey: string): string {
  const sorted = sortObjDataByKey(data) as Record<string, unknown>;
  return crypto.createHmac('sha256', checksumKey).update(convertObjToQueryStr(sorted)).digest('hex');
}

/** Kiểm chữ ký một gói webhook payOS gửi tới (`{ data, signature }`). */
export function verifyPayOSSignature(
  body: { data?: Record<string, unknown>; signature?: string },
  checksumKey: string,
): boolean {
  if (!body.data || !body.signature) return false;
  return signPayOSData(body.data, checksumKey) === body.signature;
}
