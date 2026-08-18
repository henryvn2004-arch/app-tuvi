/**
 * Mẩu khối dùng chung cho các vỏ rail nhóm `wrap`.
 *
 * Ba tool (`nguoi-khac` · `day-con` · `huong-nghiep-tre`) cùng trả một mảng
 * "mặt đọc" hình dạng y hệt nhau. Chép ba bản định dạng là ba bản trôi khỏi
 * nhau — đúng cái bẫy `parseLlmJson` và `currentYearVN` đã trả giá.
 */

/** Một "mặt đọc": engine chọn ra vài cung rồi gán cho mỗi cung một VAI. */
export interface RailMatDoc {
  cung: string;
  /** Nhãn ngắn của vai — quy chiếu TỰ ĐẶT của tool, không có trong lá số. */
  nhan: string;
  /** Câu nói rõ vai đó nghĩa là gì. */
  y: string;
  /** Cung vô chính diệu, đang mượn sao xung chiếu. */
  muon?: boolean;
}

/**
 * CỐ Ý chỉ gửi `cung / nhan / y` (+ cờ mượn).
 *
 * `sao`, `cachCuc`, `diem` **đã nằm trong khối lá số đầy đủ** mà đường `wrap`
 * luôn nạp — gửi lại là nhân đôi ~1.200 ký tự context cho thứ model đã có.
 * Thứ model KHÔNG thể suy lại được chỉ là `nhan`/`y`: chúng nói *tool này đọc
 * cung đó để trả lời câu hỏi gì* (vd Phụ Mẫu = "con nhìn cha mẹ"), và đó đúng
 * là dòng người dùng đọc trên trang rồi hỏi lại.
 */
export function matDocBlock(rows: RailMatDoc[] | null | undefined, tieuDe: string): string {
  if (!Array.isArray(rows) || !rows.length) return '';
  const body = rows
    .map((m) => `  ${m.cung}${m.muon ? ' (vô chính diệu — mượn xung chiếu)' : ''} → ${m.nhan}: ${m.y}\n`)
    .join('');
  return (
    `--- ${tieuDe} (sao/cách cục/điểm của mấy cung này đã có ở khối lá số trên) ---\n` + body
  );
}
