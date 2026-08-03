// lib/content/brand-rules.ts
// =============================================================
// Luật VIẾT tiêm vào PROMPT của các pipeline sinh nội dung.
// Nguồn chuẩn: docs/BRAND-VOICE.md (bản đầy đủ nằm trong Supabase
// `brand_voice_docs`, đọc qua `get_brand_voice()`).
//
// ⚠️ File này CHỈ chứa phần đưa vào prompt — tức PHÒNG bệnh.
// Phần CHỮA (autofix · quét vi phạm · nhờ LLM viết lại · chặn publish) nằm ở
// `lib/content/brand-check.ts` và là nguồn DUY NHẤT cho việc đó. Đừng thêm hàm
// kiểm/sửa vào đây: hai bản luật song song sẽ trôi khỏi nhau lúc nào không biết.
//
// Vì sao vẫn cần tiêm vào prompt dù ĐÃ có gate: gate chạy SAU khi bài được sinh,
// và mỗi bài trượt tốn thêm một lượt LLM viết lại. Dặn trước rẻ hơn sinh–bắt–sửa.
//
// CỐ Ý chỉ chứa luật CƠ HỌC (tên cung · trật tự từ · cấp tiêu đề · tên sao) —
// đúng cho MỌI bề mặt. KHÔNG nhét luật giọng/độ dài: `khao_luan` là ghi chép
// ngôi 3 ~300 từ, `master_articles` là thầy người Hoa kể chuyện 1200–1500 từ
// ngôi thứ NHẤT. Ép chung giọng là xoá khác biệt đang cố ý duy trì — cùng lý do
// `brand-check.ts` tách profile `khao-luan` / `nghien-cuu`.
//
// Luật xưng hô/giới tính KHÔNG ở đây — tầng tương tác đã có `XUNG_HO_RULE`
// (lib/agent/prompts.ts) làm đúng việc đó rồi.
// =============================================================

/**
 * Khối luật chèn vào prompt sinh nội dung.
 *
 * Vì sao cấm `#` — lý do KỸ THUẬT, không phải thẩm mỹ: trang bài đã phát
 * `<h1>` từ `title` (`public/khao-luan.html:109`, `app/api/khao-luan/route.ts:136`,
 * `app/nghien-cuu/[slug]/route.ts:211`), rồi markdown `#` bị đổi tiếp thành
 * `<h1>` nữa ⇒ trang có 2 thẻ H1. Đo lúc thêm luật này: 115 bài đang dính
 * (19 khao_luan + 96 master_articles) — đã backfill về 0.
 */
export const BRAND_FORMAT_RULES = `
QUY ƯỚC VIẾT (BẮT BUỘC — sai một mục là bài bị chặn ở khâu kiểm):

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
