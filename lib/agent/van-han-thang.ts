// lib/agent/van-han-thang.ts
// Prompt phần THÁNG của tool "Vận Hạn Năm Tới" — tách ra khỏi
// `app/api/van-han-nam/route.ts` để `scripts/gen-tool-sample.mjs` (sinh mẫu
// PDF/dummy text) gọi được qua alias `@/...` mà không phải import một route
// file. Next App Router chỉ nhận GET/POST/… làm export của route file (thêm
// export lạ là gãy bản dựng) — đó là lý do hàm này TRƯỚC ĐÂY không export
// được tại chỗ, chứ không phải vì nó thuộc về route.
//
// Hành vi giữ NGUYÊN 100% so với bản cũ trong route.ts — đây là một phép
// CHUYỂN CHỖ, không phải một lần sửa.
import { cachedSystemFor } from '@/lib/agent/luan-giai-doc';
import { formatLaSoV2, type Laso } from '@/lib/engine/laso';
import { describeThangForLLM, nhanThangAL, nhanThangALDay, dmy } from '@/lib/engine/van-han-12';
import type { LunarMonthSpan } from '@/lib/engine/van-ngay';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

// ─── Prompt phần THÁNG (phần MỚI duy nhất của tool này) ────────
// Trả `{system, prompt}` DÙNG CHUNG CACHE với 4 phần đầu (xem CLAUDE.md track
// tối ưu chi phí Opus, mục vá "Vận Hạn 12 Tháng Tới"): `system` =
// `cachedSystemFor(formatLaSoV2(ls))` — KHÔNG phụ thuộc `span`/`stt`/`docs`,
// nên byte-for-byte GIỐNG HỆT `buildPromptCached(...)` của 4 phần đầu CÙNG
// lá số này. Nhờ vậy cả 16 lượt gọi của một báo cáo (4 phần đầu + 12 tháng)
// chia đúng MỘT breakpoint Anthropic thay vì hai cụm cache tách rời (hoặc
// như trước đây, phần tháng KHÔNG cache gì cả). Toàn văn lá số vẫn KHÔNG cắt
// (xem lib/agent/luan-giai-doc.ts, laSoContextFull/cachedSystemFor) — trước
// đây cắt theo khuôn phần 24 (bỏ hẳn khối 12 CUNG) để tiết kiệm token; đo lại
// 2026-08-23 thấy phần tiết kiệm đó nhỏ trong khi đổi lại là model mất khả
// năng đối chiếu cung đang luận với Mệnh/11 cung còn lại — đừng trim lại chỉ
// để tiết kiệm vài trăm đồng, cache mới là đòn bẩy thật.
export function buildPromptThang(
  ls: Laso,
  span: LunarMonthSpan,
  stt: number,
  docs?: string,
): { system: string; prompt: string } {
  const khoiThang = describeThangForLLM(ls as AnyRec, span);
  const nhan = nhanThangAL(span);
  const dmyTu = dmy(span.tu), dmyDen = dmy(span.den);
  // Tháng NHUẬN dùng CÙNG cung nguyệt hạn với tháng chính (engine tra chung một
  // ô `nguyetVanScores`). Không dặn thì model viết lại gần y nguyên phần trước —
  // hai phần liền nhau đọc thành lặp.
  const luatNhuan = span.isLeap
    ? `\n- ⚠️ Đây là THÁNG NHUẬN: cung nguyệt hạn TRÙNG với tháng ${span.thangAL} ÂL ngay trước. ĐỪNG viết lại bản luận của tháng trước — hãy nói về phần TIẾP NỐI: việc dở dang của tháng trước nay có thêm một tháng nữa để xử lý, và điều gì đã khác đi so với đầu chu kỳ.`
    : '';
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';

  const prompt = `${khoiThang}${docsSection}

PHẦN ${4 + stt} — NGUYỆT VẬN ${nhanThangALDay(span)} (140-180 từ)
Đây là tháng thứ ${stt} trong 12 tháng tới. Người đọc đang xem một bản riêng về VẬN HẠN — họ cần biết tháng này NÊN LÀM GÌ và NÉ GÌ, không cần học lại lý thuyết.

⚠️ CĂN CỨ NỘI BỘ, BẮT BUỘC BÁM ĐÚNG (dùng để KHÔNG bịa, không phải để liệt kê hết cho người đọc):
- Cung nguyệt hạn + sao tọa thủ/xung chiếu/tam hợp của ĐÚNG khối "${nhan}" ở trên. TRỌNG SỐ: tọa thủ nặng nhất → xung chiếu → tam hợp. Cung vô chính diệu thì MƯỢN chính tinh tam hợp/xung để luận.
- Nếu khối trên có "TỔ HỢP SAO" thì ƯU TIÊN luận theo tổ hợp — ý nghĩa rõ hơn từng sao lẻ. ĐẾM số dòng [tốt] và số dòng [xấu] trong khối đó: câu phán quyết mở đầu phải NGẢ THEO BÊN NHIỀU HƠN (nhiều [tốt] hơn ⇒ nhãn [TỐT], nhiều [xấu] hơn ⇒ [CẢNH BÁO], chênh nhau ≤1 ⇒ [TRUNG TÍNH]). Đây là bảng engine chấm cho ĐÚNG tháng này — nói ngược lại nó là bịa.
- Tháng ÂM LỊCH này là MỘT khối liền: một cung nguyệt hạn, một nền tiểu hạn cho cả tháng. KHÔNG chẻ "nửa đầu tháng thế này, nửa sau thế kia" — không có căn cứ nào cho phép chẻ.
- 🗓 MỐC THỜI GIAN NÓI VỚI NGƯỜI ĐỌC PHẢI LÀ NGÀY DƯƠNG: họ sống theo lịch dương. Mở đầu hoặc trong câu đầu phải nhắc quãng ${dmyTu} – ${dmyDen}; muốn nói "đầu tháng" / "giữa tháng" / "cuối tháng" thì kèm ngày dương cụ thể nằm TRONG quãng đó. CẤM nêu ngày dương ngoài quãng này, và CẤM gọi nó là "tháng ${span.tu.m} dương lịch" (tháng âm không trùng tháng dương).
- CẤM bịa "điểm tháng X/10" — chỉ ĐẠI VẬN mới có điểm/10 thật. Điểm đại vận chỉ dùng để chỉnh BIÊN ĐỘ: đại vận cao thì cái tốt bung rực rỡ và cái xấu đỡ nặng; đại vận thấp thì ngược lại.
- CẤM bịa sao/cách cục không có trong khối trên.${luatNhuan}

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (tháng này thuận hay chật, nên tiến hay nên giữ), KHÔNG mở đầu bằng tên cung/sao.
Xuống dòng rồi viết 1-2 đoạn ngắn, ngôn ngữ đời thường:
① Vì sao: dịch sao/cách cục của cung hạn thành chuyện đời thực (tiền bạc, công việc, người thân, sức khỏe, giấy tờ) — tên sao nếu nhắc thì để GỌN trong ngoặc, đứng sau câu nghĩa.
② Việc nên làm và việc nên hoãn trong tháng này — cụ thể, làm được ngay, không nói chung chung kiểu "hãy cẩn thận".

KHÔNG lặp lại phần tổng quan lá số hay đại vận (đã có phần riêng). Chỉ nói về THÁNG này.`;

  return { system: cachedSystemFor(formatLaSoV2(ls)), prompt };
}
