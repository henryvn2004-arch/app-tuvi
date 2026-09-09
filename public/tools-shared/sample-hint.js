/**
 * sample-hint.js — nguồn DUY NHẤT cho khối "Chưa muốn khai [giờ sinh/chụp ảnh]?
 * Xem bản mẫu →" đứng trên form nhập liệu của mỗi tool (gỡ rào cản "phải khai
 * thông tin trước khi thử" — xem app-luan-giai.html, tool đầu tiên có box này).
 *
 * ⚠️ ĐANG LÀ CHỖ GIỮ CHỖ. File này CHƯA có dữ liệu mẫu thật cho bất kỳ tool
 * nào ngoài app-luan-giai.html (tool đó tự cài `openSample()`/`renderSample()`
 * riêng, KHÔNG qua module này — xem file đó làm ví dụ đầy đủ nhất nếu cần dựng
 * bản xem trước THẬT SỰ mở lá số/kết quả mẫu ngay trên trang).
 *
 * Quy ước dùng ở MỌI trang khác (để phiên sau gắn dữ liệu mẫu thật, gõ
 * `grep -rl "SampleHint.open" public/` là ra hết danh sách):
 *   <div class="samp-cta" id="sampCta">
 *     <span class="sc-ic" data-icon="lightbulb"></span>
 *     <span class="sc-txt"><b>Câu hỏi</b><span>Câu phụ</span></span>
 *     <button type="button" id="btnSample" data-sample-tool="<tool_id>"
 *             onclick="SampleHint.open(this)">Xem bản mẫu →</button>
 *   </div>
 * (`.samp-cta` đã có CSS dùng chung ở shell.css — không khai lại.)
 *
 * Gắn dữ liệu mẫu thật cho một tool: viết đè `SampleHint.open` NGAY TRONG
 * TRANG đó (sau khi nạp file này) bằng hàm riêng đọc `data-sample-tool`, hệt
 * cách app-luan-giai.html tự cài `openSample()` mà không đụng module dùng
 * chung — đừng sửa hàm mặc định bên dưới cho một tool cụ thể, sửa vậy là hỏng
 * placeholder của MỌI tool chưa có mẫu.
 */
window.SampleHint = (function () {
  function open(btn) {
    if (btn) window.alert('Bản mẫu đang được chuẩn bị, quay lại sau nhé!');
  }
  return { open: open };
})();
