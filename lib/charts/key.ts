// lib/charts/key.ts
// ============================================================
// Khoá canonical cho một mục trong SỔ LÁ SỐ (`user_charts`).
//
// Khác `lasoKey` của `lib/portraits/cache.ts` ở đúng hai điểm, và cả hai đều
// cố ý — đừng gộp làm một:
//   • Ở ĐÂY có NHÃN trong khoá. Hai người sinh cùng ngày cùng giờ cùng giới là
//     chuyện có thật (sinh đôi, hoặc hai người quen). Khoá chỉ theo ngày sinh
//     thì lưu người thứ hai sẽ ĐÈ mất người thứ nhất trong sổ.
//   • Ở KIA thì ngược lại phải BỎ nhãn/tên, vì nó là khoá cache KẾT QUẢ: cùng
//     lá số phải trúng cùng một bản đã sinh, bất kể đặt tên gì.
//
// Nhận shape birth của TuviForm (hoten/ngay/thang/nam/gioHour/gioPhut/gioitinh/
// namxem) — KHÔNG phải `BirthParams` của contract.
// ============================================================

import { createHash } from 'crypto';

export interface ChartBirth {
  hoten?: string;
  ngay?: number | string;
  thang?: number | string;
  nam?: number | string;
  gioIdx?: number | string;
  gioHour?: number | string;
  gioPhut?: number | string;
  gioitinh?: string;
  namxem?: number | string;
  [k: string]: unknown;
}

const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/** Chỉ số địa chi giờ (0..11) — chấp nhận cả `gioIdx` lẫn `gioHour`+`gioPhut`. */
export function hourIndexOf(b: ChartBirth): number {
  if (b.gioIdx != null && b.gioIdx !== '') return num(b.gioIdx, -1);
  if (b.gioHour != null && b.gioHour !== '') {
    const h = num(b.gioHour);
    const m = num(b.gioPhut);
    return Math.floor((((h * 60 + m + 60) % (24 * 60)) / 120)) % 12;
  }
  return -1;
}

/** true nếu birth đủ dùng. Thiếu ngày/tháng/năm thì KHÔNG lưu — một mục sổ
 *  không có ngày sinh chỉ làm bẩn danh sách và không bấm được. */
export function isUsableBirth(b: unknown): b is ChartBirth {
  const x = b as ChartBirth | null;
  return Boolean(x && num(x.ngay) > 0 && num(x.thang) > 0 && num(x.nam) > 0);
}

export function normalizeLabel(s: unknown): string {
  return String(s == null ? '' : s).trim().slice(0, 60);
}

/**
 * Khoá của một mục sổ.
 *
 * CỐ Ý BỎ `namxem`: đó là NĂM ĐANG XEM, không phải danh tính của lá số. Tính
 * vào khoá thì mỗi năm mới lại đẻ thêm một mục trùng cho cùng một người.
 * CỐ Ý BỎ `hoten`: tên hiển thị đổi được, và người ta đổi thật (viết hoa, thêm
 * họ); tính vào khoá thì sửa tên là mọc thêm một mục mới.
 */
export function chartKey(b: ChartBirth, label: string): string {
  const canonical = [
    num(b.ngay),
    num(b.thang),
    num(b.nam),
    `h${hourIndexOf(b)}`,
    b.gioitinh === 'nu' ? 'nu' : 'nam',
    normalizeLabel(label).toLowerCase(),
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}
