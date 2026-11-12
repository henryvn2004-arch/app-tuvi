/**
 * lib/engine/khuon.ts — câu KHUÔN có biến `{x}` của văn engine server (W28/W30d).
 *
 * Engine dựng chữ Việt bằng khuôn (byte-giống câu viết tay cũ: chữ còn vào rail/prompt/cache) và trả kèm
 * `bien` để CLIENT dịch tại chỗ vẽ qua `I18n.long(ns, khoá, câuViệt, bien)` — cùng quy tắc thay thế.
 */
export function dungMau(mau: string, bien: Record<string, string>): string {
  return mau.replace(/\{(\w+)\}/g, (m, n: string) => (bien[n] !== undefined ? bien[n] : m));
}
