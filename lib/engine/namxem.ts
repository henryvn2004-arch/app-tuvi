// lib/engine/namxem.ts
// ============================================================
// NĂM XEM — nguồn DUY NHẤT cho "năm đang xem" của mọi engine
// server-side (laso, tubinh, diachi) và đối ứng client.
//
// Năm xem = NĂM HIỆN TẠI theo giờ VN (Asia/Ho_Chi_Minh). KHÔNG
// hardcode, KHÔNG cần update tay hằng năm. Client (tuvi-chat.html)
// tính bằng CÙNG công thức Intl → server/client luôn cùng năm xem
// → parity tuyệt đối cho tuoiXem / đại vận hiện tại / tiểu vận /
// nguyệt vận (các trường phụ thuộc namXem).
// ============================================================

export function currentNamXem(): number {
  return Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()),
  );
}
