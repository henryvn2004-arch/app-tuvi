/* tools-shared/tool-icons.js — Module DÙNG CHUNG: ánh xạ tool_id (khoá trong
   bảng `tool_pricing`) → tên file icon minh hoạ nội dung trong
   `public/mascot/tool-icons/*.webp` (Ghibli/chibi, vẽ ĐÚNG nội dung từng
   tool — xem `docs/nhat-ky/2026-09.md` mục "16 icon Công cụ chính" +
   "32 icon còn lại"). Nguồn DUY NHẤT cho ánh xạ này — mọi nơi hiển thị icon
   tool (cong-cu.html, app-home.html springboard, 4 trang hub, related-tools)
   gọi `window.ToolIcons.src(tool_id)` thay vì tự đoán tên file.

   Không phải MỌI tool_id đều có mặt ở đây — chỉ 48 tool đang BẬT có icon
   riêng. Thiếu khoá thì `.src()` trả `null`, nơi gọi tự rơi về icon SVG/emoji
   cũ (KHÔNG throw, không chặn render).

   ⚠️ Vài tool_id KHÔNG trùng tên file (đặt tên icon từ Sprint đầu trước khi
   thống nhất dùng thẳng tool_id) — đừng "sửa cho khớp", 3 dòng lệch này là
   lịch sử, không phải lỗi: laso→luan-giai, tu-binh→tu-binh-bat-tu,
   xem-lam-an→hop-tac-lam-an. */
(function (root) {
  var MAP = {
    // 16 icon đợt 1 (2026-09-17)
    laso: 'luan-giai',
    'chu-trinh-cuoc-doi': 'chu-trinh-cuoc-doi',
    'tu-binh': 'tu-binh-bat-tu',
    'than-so-hoc': 'than-so-hoc',
    'xem-tuoi': 'xem-tuoi',
    'gio-sinh': 'gio-sinh',
    'van-han-nam': 'van-han-nam',
    'ngay-tot': 'ngay-tot',
    'cong-so': 'cong-so',
    'phong-thuy': 'phong-thuy',
    'xem-lam-an': 'hop-tac-lam-an',
    'dien-tuong': 'dien-tuong',
    'nhan-tuong': 'nhan-tuong',
    'thu-tuong': 'thu-tuong',
    'thanh-tuong': 'thanh-tuong',
    'khi-sac': 'khi-sac',
    // 32 icon đợt 2 (2026-09-18) — tên file = tool_id thẳng
    'but-tuong': 'but-tuong',
    'ban-do-sao': 'ban-do-sao',
    'chan-dung-tien-kiep': 'chan-dung-tien-kiep',
    'nap-am': 'nap-am',
    'ngu-hanh-ten': 'ngu-hanh-ten',
    'so-dep': 'so-dep',
    'an-sao': 'an-sao',
    'nguoi-khac': 'nguoi-khac',
    'nhan-mach': 'nhan-mach',
    'dat-ten-dn': 'dat-ten-dn',
    'tuong-hop': 'tuong-hop',
    'chan-dung-vo-chong': 'chan-dung-vo-chong',
    'duyen-no-tien-kiep': 'duyen-no-tien-kiep',
    'xem-tuoi-sinh-con': 'xem-tuoi-sinh-con',
    'day-con': 'day-con',
    'huong-nghiep-tre': 'huong-nghiep-tre',
    'dat-ten-con': 'dat-ten-con',
    'ban-lam-viec': 'ban-lam-viec',
    'cua-hang-phong-thuy': 'cua-hang-phong-thuy',
    'bat-trach': 'bat-trach',
    'phong-thuy-render': 'phong-thuy-render',
    'chon-ngay-tot': 'chon-ngay-tot',
    'hoang-dao': 'hoang-dao',
    'kim-lau': 'kim-lau',
    'luc-nham': 'luc-nham',
    'kinh-dich': 'kinh-dich',
    'mai-hoa': 'mai-hoa',
    'ky-mon': 'ky-mon',
    tarot: 'tarot',
    oracle: 'oracle',
    'boi-bai-tay': 'boi-bai-tay',
    'thanh-tuong-pro': 'thanh-tuong-pro',
  };

  root.ToolIcons = {
    /** tool_id → "/mascot/tool-icons/<file>.webp", hoặc null nếu chưa có icon riêng. */
    src: function (toolId) {
      var file = MAP[toolId];
      return file ? '/mascot/tool-icons/' + file + '.webp' : null;
    },
  };
})(window);
