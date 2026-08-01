// lib/llm/json.ts
// ============================================================
// Bóc JSON ra khỏi câu trả lời của LLM.
//
// Vì sao cần: `JSON.parse` trần trụi hỏng cả lượt chỉ vì model thêm một câu dẫn
// ("Đây là dàn bài:"), một ghi chú cuối, hay bọc ```json. Ở pipeline viết bài
// thì mỗi lần hỏng là mất trắng một chủ đề — đo trên `topic_queue`: tháng 5 lỗi
// 34,7%, tháng 6 20,2%, tháng 7 14,9%.
//
// Bản này lift từ `app/api/chan-dung-tien-kiep/route.ts` (đã chạy prod, đã
// verify với 10 dạng output thật). Gom ra đây vì nó là NGUỒN DUY NHẤT — trước
// đó repo có 3 bản chép tay khác nhau và chỉ bản này đủ chắc.
//
// ⚠️ Nợ chưa gỡ: `app/api/phong-thuy/route.ts` và
// `app/api/chan-dung-vo-chong/route.ts` vẫn giữ bản parse RIÊNG, yếu hơn (3 và
// 7 dòng, chỉ bóc fence). CỐ Ý không đụng trong PR này — đó là 2 tool đang thu
// tiền, đổi hành vi parse của chúng cần lượt kiểm riêng, không nên ghép vào một
// PR về cron nội dung.
// ============================================================

/**
 * Trả về object đã parse, hoặc `null` nếu không bóc được gì.
 *
 * `null` là tín hiệu để caller thử lại / rơi về nhánh dự phòng — cố ý KHÔNG ném
 * lỗi, vì mọi chỗ gọi đều có đường đi tiếp tử tế hơn là chết cả lượt.
 */
export function parseLlmJson(text: string): unknown {
  const t = String(text || '')
    .replace(/```json|```/g, '')
    .trim();
  try {
    return JSON.parse(t);
  } catch {
    /* thử cắt khối {...} bên dưới */
  }
  // Thử TỪNG khối {...} cân bằng, từ trái sang: khối đầu tiên parse được thì
  // lấy. Cố ý không dừng ở khối đầu tiên TÌM THẤY — model hay chèn ngoặc nhọn
  // trong lời dẫn ("{quan trọng}") và khối rác đó sẽ nuốt mất JSON thật.
  for (let i = t.indexOf('{'); i >= 0; i = t.indexOf('{', i + 1)) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let k = i; k < t.length; k++) {
      const c = t[k];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue; // ngoặc nhọn trong lời thoại không tính
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try {
          return JSON.parse(t.slice(i, k + 1));
        } catch {
          /* khối này không phải JSON ta cần → thử khối kế tiếp */
        }
        break;
      }
    }
  }
  return null;
}
