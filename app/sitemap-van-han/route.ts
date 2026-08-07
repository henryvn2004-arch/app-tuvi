// app/sitemap-van-han/route.ts — họ /van-han/* (bản CHUẨN sau khi gộp).
// Trước đây CHỈ có trang hub `/van-han` trong sitemap, còn 576 trang con thì
// không được nộp — tức bản dày nhất, đúng từ khoá nhất lại là bản Google không
// được mời vào. Sinh bằng thuật toán (không có bảng).
export const dynamic = 'force-dynamic';

import { BASE_URL, urlEntry, xmlUrlset, xmlResponse } from '@/lib/seo/sitemap-source';
import { revOf } from '@/lib/seo/lastmod';

// Danh sách phải KHỚP `NAM_XEMS` trong app/van-han/[slug]/route.ts — lệch là
// nộp URL 404.
const VH_NAMS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
const VH_CHI = ['ty', 'suu', 'dan', 'mao', 'thin', 'ti', 'ngo', 'mui', 'than', 'dau', 'tuat', 'hoi'];
const VH_CAN = ['giap', 'at', 'binh', 'dinh', 'mau', 'ky', 'canh', 'tan', 'nham', 'quy'];

export async function GET() {
  // ⚠️ lastmod lấy từ `CONTENT_REV['van-han']` — hiện `null` nên KHÔNG phát thẻ.
  // Trước đây 576 URL này đóng dấu ngày HÔM NAY mỗi lượt gọi, tức mỗi ngày lại
  // tự khai "vừa sửa" cho trang không hề đổi.
  const rev = revOf('van-han');
  const entries: string[] = [];
  for (const nam of VH_NAMS) {
    for (const chi of VH_CHI) {
      entries.push(urlEntry(`${BASE_URL}/van-han/tuoi-${chi}-nam-${nam}`, rev));
    }
    // Cặp can-chi hợp lệ: cùng tính chẵn/lẻ (Giáp Tý có thật, Giáp Sửu không) —
    // đúng 60 tổ hợp của lục thập hoa giáp. Sinh đủ 120 là nộp 60 URL chết.
    for (let i = 0; i < 60; i++) {
      entries.push(urlEntry(`${BASE_URL}/van-han/${VH_CAN[i % 10]}-${VH_CHI[i % 12]}-nam-${nam}`, rev));
    }
  }
  return xmlResponse(xmlUrlset(entries));
}
