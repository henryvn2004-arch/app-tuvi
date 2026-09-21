// lib/celeb/lunar-key.ts
// ============================================================
// Phân tích `celeb_births.key_t1` — DÙNG CHUNG cho các trang
// /thu-vien/nguoi-cung-ngay-sinh (dương) và /thu-vien/nguoi-cung-ngay-sinh-am-lich
// (âm) khi cần hiện ngày âm lịch của một người bên cạnh ngày dương.
//
// `key_t1` = "<canChi năm>|<thángAL>|<ngàyAL>" (vd "QuýDậu|2|23"), tính sẵn
// lúc import (scripts/import-celeb-births.mjs) từ engine — nguồn TẤT ĐỊNH
// DUY NHẤT. KHÔNG tính lại bằng lunarOf() ở đây: đọc field có sẵn rẻ hơn và
// không thể trôi khỏi khoá đã dùng để MATCH (đúng nguyên tắc `parseT1` trong
// app/api/v1/cung-ngay-sinh/route.ts).
// ============================================================

export interface KeyT1Parsed {
  canChi: string;
  thangAL: number;
  ngayAL: number;
}

export function parseKeyT1(key: string | null | undefined): KeyT1Parsed | null {
  if (!key) return null;
  const parts = key.split('|');
  if (parts.length !== 3) return null;
  const [canChi, thangStr, ngayStr] = parts;
  const thangAL = Number(thangStr);
  const ngayAL = Number(ngayStr);
  if (!canChi || !Number.isFinite(thangAL) || !Number.isFinite(ngayAL)) return null;
  return { canChi, thangAL, ngayAL };
}
