// lib/pdf/phan-labels.ts
// ============================================================
// Nhãn phần luận giải (khoá "1".."24") — PORT NGUYÊN VĂN từ `PHAN_LABELS`
// (public/account-core.js, nơi tab "Xem Lại" của Lịch Sử đang dùng để vẽ
// modal). Bản này là NGUỒN cho phía SERVER (resend-pdf, permalink) — hai file
// (client JS + server TS) không chia sẻ được module trực tiếp, đổi một bên
// thì đổi bên kia, không có cách nào bắt lệch bằng type-check vì một bên là
// JS trình duyệt.
// ============================================================
export const PHAN_LABELS: Record<string, string> = {
  '1': 'Tổng Quan', '2': 'Cung Mệnh', '3': 'Tâm Tính', '4': 'Học Vấn',
  '5': 'Phụ Mẫu', '6': 'Phúc Đức', '7': 'Điền Trạch', '8': 'Quan Lộc',
  '9': 'Nô Bộc', '10': 'Thiên Di', '11': 'Tật Ách', '12': 'Tài Bạch',
  '13': 'Tử Tức', '14': 'Phu Thê', '15': 'Huynh Đệ', '16': 'Đại Vận',
  '17': 'Tiểu Hạn', '18': 'Lưu Niên', '19': 'Cách Cục', '20': 'Sự Nghiệp',
  '21': 'Tình Cảm', '22': 'Sức Khoẻ', '23': 'Tài Lộc', '24': 'Vận Mệnh',
};

export interface LuanGiaiPhanText {
  key: string;
  title: string;
  text: string;
}

/** Dựng danh sách phần từ `laso_public.luan_giai` (JSONB khoá theo SỐ PHẦN) —
 *  dùng chung bởi resend-pdf (dựng PDF) và permalink xem online (dựng HTML).
 *  Lấy MỌI khoá số hợp lệ có mặt, không giới hạn cứng theo khoảng 1-13/14-24
 *  — để ngỏ cho các dòng CŨ từ trang 24-phần đã retire vẫn có đủ 1-24. */
export function buildPhans(luanGiai: Record<string, unknown> | null | undefined): LuanGiaiPhanText[] {
  const src = luanGiai || {};
  return Object.keys(src)
    .filter((k) => /^\d+$/.test(k) && PHAN_LABELS[k] && String(src[k] ?? '').trim())
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => ({ key: k, title: PHAN_LABELS[k], text: String(src[k]) }));
}
