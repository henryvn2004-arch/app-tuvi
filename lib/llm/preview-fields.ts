// lib/llm/preview-fields.ts
// ============================================================
// CẮT BẢN XEM TRƯỚC THEO TRƯỜNG (hard paywall, Pha 3)
// ============================================================
// Nhóm tool "một prompt" (day-con, nhan-mach, huong-nghiep-tre, nguoi-khac…)
// KHÔNG trả văn xuôi — chúng trả JSON có schema, một object phẳng gồm ~12
// trường văn xuôi có TÊN cộng khối dữ liệu deterministic. Nên bản xem trước
// phải cắt theo TRƯỜNG, không theo ký tự: một `text.slice(0, 20%)` ở đây sẽ
// cắt ngang giữa một trường và trả ra JSON hỏng.
//
// 🔑 DANH SÁCH LÀ ALLOWLIST, KHÔNG PHẢI BLOCKLIST — và đó là quyết định an
// toàn quan trọng nhất của file này. Hai kiểu quên hỏng theo hai hướng ngược
// nhau:
//   • quên khai một trường ĐƯỢC PHÉP  → nó bị GIẤU  → hỏng nhìn thấy được,
//     có người báo trong ngày.
//   • quên khai một trường PHẢI GIẤU  → nó LỌT RA   → mất doanh thu, im lặng,
//     không ai biết cho tới khi đọc lại code.
// Chọn hướng hỏng ồn ào. Cùng nguyên tắc fail-closed với `_priceUnknown`
// (tuvi-paywall.js) và `previewGate` (lib/billing/anon-preview.ts).
//
// ⚠️ KHÔNG dùng file này để quyết định AI ĐƯỢC XEM GÌ. Nó chỉ cắt payload gửi
// đi. Quyền sở hữu vẫn là `userOwnsLaso` + `toolPaymentDenied`.
// ============================================================

/**
 * Giữ lại ĐÚNG những khoá được khai, bỏ mọi khoá còn lại.
 *
 * `keep` khai hụt một khoá có thật ⇒ khoá đó biến mất khỏi bản xem trước. Đó là
 * hướng hỏng đã chọn (xem đầu file), nhưng vẫn `console.error` để nó không im
 * lặng: một trường trong danh sách mà KHÔNG có trong payload gần như luôn là
 * dấu hiệu payload vừa đổi tên trường và danh sách chưa theo kịp.
 *
 * Trả kèm `previewLocked` = tên các khoá đã bị bỏ. Chỉ là TÊN, không phải nội
 * dung — client dùng để dựng đúng số ô giữ chỗ, và bài kiểm dùng để chứng minh
 * phần trả phí không lọt ra.
 */
export function previewOf<T extends Record<string, unknown>>(
  full: T,
  keep: readonly string[],
  toolId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const k of keep) {
    if (Object.prototype.hasOwnProperty.call(full, k)) out[k] = full[k];
    else missing.push(k);
  }
  if (missing.length) {
    console.error(
      `[previewOf] ${toolId}: khai giữ ${missing.length} khoá KHÔNG có trong payload ` +
        `(${missing.join(', ')}) — nhiều khả năng payload vừa đổi tên trường.`,
    );
  }

  const locked = Object.keys(full).filter((k) => !keep.includes(k));
  out.preview = true;
  out.previewLocked = locked;
  return out;
}
