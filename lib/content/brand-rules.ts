// lib/content/brand-rules.ts
// =============================================================
// Luật VIẾT dùng chung cho mọi pipeline SINH nội dung.
// Nguồn chuẩn: docs/BRAND-VOICE.md (bản đầy đủ nằm trong Supabase
// `brand_voice_docs`, đọc qua `get_brand_voice()`).
//
// ⚠️ CHỈ chứa luật CƠ HỌC, đúng cho MỌI bề mặt: tên cung, trật tự từ,
// cấp tiêu đề, tên sao. KHÔNG nhét luật giọng/độ dài vào đây — mỗi
// pipeline có persona riêng và cố ý khác nhau:
//   · khao_luan       — ghi chép nghiên cứu, ngôi 3, ~300 từ
//   · master_articles — thầy người Hoa kể chuyện, 1200–1500 từ
// Ép chung giọng là xoá mất khác biệt đang cố ý duy trì.
//
// Luật xưng hô/giới tính KHÔNG ở đây — tầng tương tác đã có
// `XUNG_HO_RULE` (lib/agent/prompts.ts) làm đúng việc đó rồi.
// =============================================================

/** Tên chuẩn 12 cung. Mỗi cung ĐÚNG MỘT tên. */
export const CUNG_CANONICAL = [
  'Mệnh',
  'Phụ Mẫu',
  'Phúc Đức',
  'Điền Trạch',
  'Quan Lộc',
  'Nô Bộc',
  'Thiên Di',
  'Tật Ách',
  'Tài Bạch',
  'Tử Tức',
  'Phu Thê',
  'Huynh Đệ',
] as const;

/** Tên sai ↔ tên chuẩn. Đo được trong corpus, không phải phòng xa. */
export const CUNG_ALIASES: Record<string, string> = {
  'Tử Nữ': 'Tử Tức',
  'Tử Tôn': 'Tử Tức',
  'Giao Hữu': 'Nô Bộc',
  'Bằng Hữu': 'Nô Bộc',
};

/**
 * Khối luật chèn vào prompt sinh nội dung.
 *
 * Vì sao cấm `#` — lý do KỸ THUẬT, không phải thẩm mỹ: trang bài đã phát
 * `<h1>` từ `title` (`public/khao-luan.html:109`, `app/api/khao-luan/route.ts:136`,
 * `app/nghien-cuu/[slug]/route.ts:211`), rồi markdown `#` bị đổi tiếp thành
 * `<h1>` nữa ⇒ trang có 2 thẻ H1. Đo lúc thêm luật này: 115 bài đang dính
 * (19 khao_luan + 96 master_articles).
 */
export const BRAND_FORMAT_RULES = `
QUY ƯỚC VIẾT (BẮT BUỘC — sai một mục là bài bị chặn):

1. TIÊU ĐỀ: TUYỆT ĐỐI KHÔNG dùng "# " ở bất kỳ dòng nào. Mục chính dùng "## ",
   mục con dùng "### ". Tiêu đề bài đã do hệ thống hiển thị riêng — viết "# " nữa
   là trang có HAI thẻ H1, lỗi SEO thật.

2. TÊN CUNG — mỗi cung ĐÚNG MỘT tên, dùng đúng bộ này:
   Mệnh · Phụ Mẫu · Phúc Đức · Điền Trạch · Quan Lộc · Nô Bộc · Thiên Di ·
   Tật Ách · Tài Bạch · Tử Tức · Phu Thê · Huynh Đệ
   CẤM: "Tử Nữ"/"Tử Tôn" (phải là Tử Tức) · "Giao Hữu"/"Bằng Hữu" (phải là Nô Bộc).

3. TRẬT TỰ TỪ: viết "cung Phúc Đức", KHÔNG viết "Phúc Đức cung".

4. TÊN SAO — chỉ dùng sao CÓ THẬT:
   Chính tinh: Tử Vi · Thiên Phủ · Vũ Khúc · Thiên Tướng · Thiên Lương · Thất Sát ·
   Phá Quân · Tham Lang · Cự Môn · Thiên Cơ · Thái Dương · Thái Âm · Liêm Trinh · Thiên Đồng
   Sát tinh: Kình Dương · Đà La · Hỏa Tinh · Linh Tinh · Địa Không · Địa Kiếp
   Tứ Hóa: Hóa Lộc · Hóa Quyền · Hóa Khoa · Hóa Kỵ
   Văn tinh: Văn Xương · Văn Khúc · Tả Phù · Hữu Bật
   CẤM bịa tên sao (đã lọt "Văn Khoa" — không tồn tại). Không chắc thì đừng nhắc.

5. KHÔNG đổ bảng tra, danh sách sao, hay điểm số vào bài. Số liệu dùng để LUẬN,
   không để in ra.

6. KHÔNG bịa trích dẫn cổ thư. Không chắc thì viết "người xưa dạy", đừng gán tên sách.
`.trim();

/**
 * Sửa CƠ HỌC những lỗi sửa được chắc chắn, rồi cảnh báo phần còn lại.
 *
 * Dặn model trong prompt là chưa đủ — nó không phải lúc nào cũng nghe. Việc nào
 * máy làm đúng 100% được (hạ `#`, đổi tên cung sai) thì để máy làm; việc cần
 * hiểu nghĩa (bịa sao, rule-dump) thì chỉ log để người xem.
 */
export function normalizeBrandFormat(md: string, tag: string): string {
  if (typeof md !== 'string' || !md) return md;

  // `#` → `##`: trang đã phát <h1> từ title, để lọt là 2 thẻ H1.
  let out = md.replace(/^# /gm, '## ');

  for (const [bad, good] of Object.entries(CUNG_ALIASES)) {
    out = out.split(bad).join(good);
  }

  const issues = checkBrandFormat(out);
  if (issues.length) console.warn(`[${tag}] brand-check:`, issues.join(' · '));

  return out;
}

/**
 * Quét cơ học một bài trước khi lưu. Trả mảng lỗi; rỗng = đạt.
 * Dùng cho brand-check gate (bước 2) và cho chính pipeline sinh bài.
 */
export function checkBrandFormat(content: string): string[] {
  const errs: string[] = [];
  if (/^# /m.test(content)) errs.push('Dùng "# " (phát 2 thẻ H1) — phải dùng "## "');

  for (const [bad, good] of Object.entries(CUNG_ALIASES)) {
    if (content.includes(bad)) errs.push(`Tên cung sai "${bad}" — phải là "${good}"`);
  }

  const orderBad = content.match(
    /(Phúc Đức|Tài Bạch|Quan Lộc|Điền Trạch|Phu Thê|Tử Tức|Nô Bộc|Thiên Di|Tật Ách|Huynh Đệ|Phụ Mẫu) cung/g,
  );
  if (orderBad) errs.push(`Trật tự từ sai: "${orderBad[0]}" — phải là "cung ${orderBad[0].split(' ')[0]}"`);

  if (/Văn Khoa/.test(content)) errs.push('Sao không tồn tại: "Văn Khoa" — ý là Văn Xương/Văn Khúc hoặc Hóa Khoa');

  // Mojibake: bắt mẫu ĐÔI. Đừng bắt ký tự đơn Â/Ã — đó là chữ Việt hợp lệ.
  if (/â€|Ã[¡©­³º]|ï¿½|Æ°|Ä‘/.test(content)) errs.push('Lỗi encoding (mojibake)');

  return errs;
}
