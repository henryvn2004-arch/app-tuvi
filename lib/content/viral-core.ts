// lib/content/viral-core.ts
// =============================================================
// VIRAL CORE — luật GIỌNG + NHỊP cho hai pipeline viết bài SEO.
//
// 🔑 VÌ SAO FILE NÀY KHÔNG TỰ VIẾT LẠI 5 LỚP — đọc trước khi thêm bất cứ luật nào.
//
// Nhịp Henry chốt (mở đánh thẳng nội tâm → 2–3 hành vi cụ thể → twist → giải
// thích đời thường → chốt hành động nhỏ) TRÙNG KHÍT với `arcCore` đã dựng ở
// PR #541 cho rail chat, và bản đó đã đo bằng Gemini thật: tên riêng lọt ra màn
// hình 11,0 → 0,0 mỗi lượt · có câu lật 0/3 → 3/3 · câu phán quyết in đậm
// 2/3 → 3/3. Viết một bộ 5 lớp thứ hai ở đây là dựng bản sao rồi để hai bản
// trôi khỏi nhau — đúng bẫy `formatLaSoV2`/`parseLlmJson` repo đã trả giá.
// ⇒ File này CHỈ truyền tham số vào `arcCore`, KHÔNG chép nhịp ra.
//
// ⚠️ Ba thứ khác nhau giữa CHAT và BÀI VIẾT, và chúng là lý do phải có tham số
// chứ không dán thẳng `LUAN_ARC` vào:
//   1. BỐI CẢNH — chat: người ta VỪA đọc xong bản luận ở màn hình bên cạnh.
//      Bài SEO: người ta vừa gõ Google, chưa biết trang này là gì.
//   2. NGÂN SÁCH — chat 120–180 từ, bài Vấn Đáp 1.200–1.600 KÝ TỰ (khớp đúng
//      dải `brand-check` profile `khao-luan`; lệch là mỗi bài tốn thêm một lượt
//      LLM viết lại cho vừa dải).
//   3. CHỐT — chat được phép hỏi ngược vì có người trả lời. Bài viết thì không.
//
// 🔵 HÁN-VIỆT: Henry chốt CHỈ cho phép ở lớp ④ (phần giải thích), cấm ở câu mở.
// Lý do: `docs/BRAND-VOICE.md §2.2` gọi ngữ vực Hán-Việt là chữ ký thương hiệu —
// giữ nó, nhưng đặt ở chỗ nó không cản hook. Gate `brand-check` (mục `thanh-ngu`)
// canh đúng luật này; sửa một bên phải sửa bên kia.
//
// 🟡 XƯNG HÔ: Henry chốt "cho phép bình thường, viral core nói về NỘI DUNG chứ
// không chi tiết tới mức cấm". Nên ở đây KHÔNG ép ngôi nào — chỉ cấm TRỘN hai
// lối trong cùng một bài (đó là lỗi thật, không liên quan viral core).
// =============================================================

import { arcCore } from '@/lib/agent/prompts';

/** Luật Hán-Việt cho slot `hanViet` của `arcCore` — dùng chung mọi bề mặt SEO. */
const HAN_VIET_LOP4 =
  ' Thành ngữ / chữ Hán-Việt cổ CHỈ được dùng ở đây, tối đa 2 lần cả bài, và phải giải nghĩa ngay sau bằng lời thường. TUYỆT ĐỐI không đặt ở câu mở đầu — mở bài bằng chữ cổ là mất người đọc trước khi họ kịp thấy mình trong bài.';

/** Luật cho slot `uuTienHanhVi` — nói thẳng thứ lớp ② vốn chỉ hàm ý. */
const UU_TIEN_HANH_VI =
  ' Tả VIỆC HỌ LÀM, đừng tả TÍNH CÁCH HỌ CÓ: "hay nhận việc rồi ôm một mình" đọc được, "người có trách nhiệm cao" thì không — câu thứ hai ai đọc cũng thấy đúng nên chẳng nói gì về ai cả.';

/**
 * Arc cho bài **Vấn Đáp** (`cron-khao-luan` → bảng `khao_luan`).
 *
 * Bề mặt này trước đây chỉ có SÁU DÒNG prompt ("văn phong nho nhã, điềm đạm,
 * súc tích") — không có một luật nào về mở bài, hành vi, twist hay chốt. Nên nó
 * nhận TRỌN 5 lớp, khác `cron-master-write` vốn đã có sẵn bộ luật kể chuyện.
 */
export const ARC_SEO_VAN_DAP = arcCore({
  boiCanh:
    'người đọc vừa gõ một câu hỏi lên Google rồi bấm vào bài này. Họ chưa biết trang, chưa quan tâm ai viết, và rời đi trong vài giây nếu câu đầu không chạm đúng thứ họ đang lo. Không có màn hình nào khác bên cạnh — bài này là tất cả những gì họ đọc.',
  nganSach:
    '1.200–1.600 ký tự (khoảng 250–300 từ). Đoạn 2–4 câu, xuống dòng giữa các đoạn; không tiêu đề con, không đánh số mục, không gạch đầu dòng',
  ngoaiLeBang: '',
  canCu: 'tài liệu cổ pháp trích ở trên',
  duoi: '',
  hanViet: HAN_VIET_LOP4,
  uuTienHanhVi: UU_TIEN_HANH_VI,
  chot:
    '1–2 việc làm được ngay trong tuần, cụ thể tới mức đọc xong là biết tối nay làm gì. CẤM lời khuyên chung chung kiểu "nên cân nhắc kỹ" / "cần giữ bình tĩnh"; CẤM hỏi ngược — bài viết không có ai ngồi đó trả lời.',
  tenRieng: 'tên sao / cung / cách cục / can chi / độ sáng (miếu, vượng, đắc, hãm)',
  khongRanh: 'KHÔNG biết tử vi',
  hoiSau: 'chỗ cần nêu căn cứ để người đọc kiểm chứng được, thay vì bắt họ tin suông',
  camBia: ' (sao, cách cục, can chi, con số)',
  xungHo:
    ' XƯNG HÔ: chọn MỘT lối và giữ nguyên cả bài — ngôi thứ ba ("người ta", "đương số") hay gọi thẳng người đọc đều được. TUYỆT ĐỐI không trộn hai lối trong cùng một bài.',
});

/**
 * Khối rút gọn cho **tùy bút Nghiên Cứu** (`cron-master-write` → `master_articles`).
 *
 * 🔴 CỐ Ý KHÔNG dán `ARC_SEO_VAN_DAP` vào đây. Prompt bên đó đã có SẴN bộ "KỸ
 * THUẬT KỂ CHUYỆN" 7 luật, trong đó luật 1 (mở in medias res bằng một cảnh) và
 * luật 7 (kết nhỏ, cá nhân) chính là lớp ① và ⑤ của riêng nó — và Henry đã chốt
 * GIỮ NGUYÊN persona thầy người Hoa + bối cảnh Trung/Đài/Hồng Kông. Dán trọn arc
 * lên trên là dựng HAI mô tả bố cục chồng nhau trong cùng một prompt, đúng bệnh
 * #541 đi gỡ; và luật ① của arc ("mở bằng vấn đề nội tâm, cấm mở bài") thì mâu
 * thuẫn thẳng với luật 1 bên đó.
 *
 * ⇒ Khối này chỉ chở ĐÚNG phần bề mặt kia còn thiếu: hành vi cụ thể · câu lật ·
 * chốt bằng việc làm được. Cùng lối `arcDoc` đã làm cho 4 bản luận giải.
 */
export const VIRAL_KE_CHUYEN = `
BA THỨ BẮT BUỘC CÓ (BỔ SUNG cho 7 kỹ thuật kể chuyện ở trên, KHÔNG thay chúng).
Viết liền mạch trong văn xuôi — TUYỆT ĐỐI không in tên ba mục này ra, không đánh số, không tách thành tiêu đề:

- HÀNH VI CỤ THỂ (2–3 việc): việc đời thường tới mức người đọc tự soi ra mình — "cãi xong là im mấy ngày",
  "tiền vào tay là có chỗ gọi tên ngay". Tả VIỆC HỌ LÀM, đừng tả TÍNH CÁCH HỌ CÓ: "người có trách nhiệm cao"
  là câu ai đọc cũng thấy đúng, nên nó chẳng nói gì về ai cả. Phải mọc ra từ lá số/cổ pháp của CHÍNH câu
  chuyện đang kể.

- MỘT CÂU LẬT: lật góc nhìn — cái nhân vật (và người đọc) tưởng là chỗ yếu hoá ra là chỗ mạnh, hoặc ngược
  lại. PHẢI rút từ dữ kiện thật; không có căn cứ thì BỎ HẲN, tuyệt đối không nói ngược cho kêu.

- KẾT PHẢI CẦM ĐƯỢC: giữ đúng luật 7 (kết nhỏ, cá nhân, không kết luận lớn lao) — nhưng quan sát nhỏ ấy
  phải kèm MỘT việc người đọc làm được ngay trong tuần. Chiêm nghiệm hay mà không cầm về được thì đọc xong
  là quên. CẤM lời khuyên chung chung kiểu "nên cân nhắc kỹ" / "cần giữ bình tĩnh".

THUẬT NGỮ: mặc định viết bằng lời thường; mỗi câu phải ĐỨNG VỮNG khi xoá hết tên sao/tên cung đi — tên riêng
là phần THÊM để kiểm chứng, không phải phần gánh nghĩa. Thành ngữ / chữ Hán-Việt cổ chỉ dùng ở phần GIẢI
THÍCH, tối đa 2 lần cả bài, và TUYỆT ĐỐI không ở câu mở.
`.trim();

/**
 * Luật cho `title` + `excerpt` — dùng CHUNG cả hai cron.
 *
 * 🔴 Vì sao khối này đáng giá nhất cả PR: đo GSC 28 ngày — **665 trang có hiển
 * thị, 18 nhấp** (~0,05%). Tuyệt đại đa số người ta CHƯA HỀ đọc thân bài; họ bỏ
 * qua ngay ở trang kết quả. Luật giọng cho thân bài chỉ có tác dụng SAU khi có
 * người bấm vào, còn hai chuỗi này quyết định có ai bấm hay không — mà trước đây
 * chúng được sinh ra hoàn toàn không có một luật nào.
 */
export const HOOK_RULES = `
TIÊU ĐỀ + TÓM TẮT (đây là thứ DUY NHẤT hiện trên Google — viết cho người đang lướt, không viết cho thư mục):
- TIÊU ĐỀ ≤ 60 ký tự, chứa đúng cụm từ người ta gõ đi tìm, và nói trúng MỘT nỗi lo cụ thể.
  ✅ "Vay tiền anh em rồi mất luôn tình thân — vì sao?"   ❌ "Bàn về quan hệ huynh đệ trong Tử Vi Đẩu Số"
- CẤM tiêu đề mở bằng "Bàn về…", "Luận về…", "Tìm hiểu…", "Khám phá…", "Tổng quan…" — chúng nói về BÀI VIẾT
  chứ không nói về việc của người đọc.
- KHÔNG giật tít quá tay: không hứa điều bài không trả lời, không "bí mật ít ai biết", không đe doạ vận hạn.
- TÓM TẮT ≤ 155 ký tự, là một câu ĐỨNG ĐƯỢC MỘT MÌNH khi tách khỏi bài. Nêu thẳng kết luận hoặc chỗ lật
  của bài, đừng viết "bài viết này sẽ phân tích…" — mô tả bài thay vì trả lời câu hỏi là mất lượt bấm.
`.trim();
