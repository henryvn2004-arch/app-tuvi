// public/tools-shared/illus-match.js
// ============================================================
// Chọn ảnh minh hoạ (thư viện `illus-prompt.ts` / `scripts/gen-illus.mjs`)
// khớp với PHẦN đang hiển thị.
//
// HIỆN CHỈ RÁP VÀO app-luan-giai.html (Luận Giải Lá Số, phần 1-13 = tổng quan
// + 12 cung — Tier A của thư viện). `sacThaiCung()` và bảng `KHIA_TO_CUNG` là
// phần DÙNG CHUNG được thật (đọc theo TÊN CUNG, không theo số phần); còn
// `PHAN_TO_KHIA`/`illusUrlForPhan()` gắn CỨNG với đúng thứ tự phần 1-13 của
// RIÊNG luan-giai-core.js. Chu Trình Cuộc Đời (11 phần, toàn bộ về đại vận)
// và Vận Hạn 12 Tháng (16 phần, theo tháng) đánh số phần theo NGHĨA KHÁC hẳn —
// muốn ráp vào hai tool đó thì viết bảng phan→khía RIÊNG cho từng tool (Tier B,
// thư viện chưa vẽ ảnh theo đại vận/tháng), KHÔNG tái dùng thẳng bảng dưới đây.
//
// Phụ thuộc (nạp TRƯỚC file này, cùng thứ tự `app-luan-giai.html` đã dùng):
//   tuvi-ansao-engine.js  → cần cho `ls.cungScores`, `ls.cachCuc`, ...
//   tuvi-laso-format.js   → export `window.xuHuongCungW` (MỘT nguồn w, xem đó)
//   illus-nguong.js       → export `window.ILLUS_NGUONG` (ngưỡng, sinh bằng
//                           scripts/gen-illus-nguong.mjs, KHÔNG gõ tay)
//
// 🔑 KHÔNG TỰ TÍNH LẠI w Ở ĐÂY. `xuHuongCungW()` đã là nguồn LLM đọc (xem
// comment trong chính nó) — viết lại công thức ở file thứ ba là drift không
// ai biết, đúng bẫy CLAUDE.md "Bảng dịch dựng từ MỘT nguồn thì chỉ phủ nguồn
// đó".
// ============================================================
(function (root) {
  'use strict';

  // Cùng hằng số đã hardcode ở 7+ trang client khác (index.html, blog.html,
  // topup.html, ...) — bucket 'portraits' là PUBLIC READ, không phải bí mật.
  var SUPABASE_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
  var BUCKET = 'portraits';
  var PREFIX = 'illus';

  /**
   * PHẦN của Luận Giải Lá Số (1-13) → khoá khía cạnh trong
   * `lib/media/illus-prompt.ts` `KHIA_CANH`. Phần 1 = tổng quan (neo theo
   * cung Mệnh — không có cung riêng để tính w). Phần 2-13 = 12 cung, ĐÚNG
   * bảng `CUNG_BY_PHAN` của `lib/agent/luan-giai-doc.ts` (một nguồn khác cũng
   * ánh xạ y hệt — đổi một bên nhớ đổi bên kia; `scripts/check-illus.mjs`
   * canh hai bảng này khớp nhau).
   */
  var PHAN_TO_KHIA = {
    1: 'tong-quan',
    2: 'menh', 3: 'phu-mau', 4: 'phuc-duc', 5: 'dien-trach',
    6: 'quan-loc', 7: 'no-boc', 8: 'thien-di', 9: 'tat-ach',
    10: 'tai-bach', 11: 'tu-tuc', 12: 'phu-the', 13: 'huynh-de',
  };
  /** Khoá khía cạnh → tên cung tiếng Việt (để tra `ls.cungScores`/`xuHuongCungW`). */
  var KHIA_TO_CUNG = {
    menh: 'Mệnh', 'phu-mau': 'Phụ Mẫu', 'phuc-duc': 'Phúc Đức', 'dien-trach': 'Điền Trạch',
    'quan-loc': 'Quan Lộc', 'no-boc': 'Nô Bộc', 'thien-di': 'Thiên Di', 'tat-ach': 'Tật Ách',
    'tai-bach': 'Tài Bạch', 'tu-tuc': 'Tử Tức', 'phu-the': 'Phu Thê', 'huynh-de': 'Huynh Đệ',
  };

  /**
   * Số biến thể bối cảnh ĐÃ VẼ cho mỗi khía cạnh — KHÔNG phải số bối cảnh viết
   * trong `KHIA_CANH.boiCanh` (luôn là 3). Bắt đầu ở 1 vì Tier A chỉ vẽ v1;
   * nâng số này CHO TỪNG KHOÁ chỉ sau khi v2/v3 đã thật sự sinh + upload lên
   * Storage — nâng sớm thì một phần lá số trỏ vào ảnh chưa tồn tại (ẩn ảnh
   * do `onerror`, không vỡ trang, nhưng người xem thấy phần đó "mất ảnh" so
   * với phần khác một cách vô cớ).
   */
  var VARIANT_COUNT = {
    menh: 1, 'phu-mau': 1, 'phuc-duc': 1, 'dien-trach': 1, 'quan-loc': 1, 'no-boc': 1,
    'thien-di': 1, 'tat-ach': 1, 'tai-bach': 1, 'tu-tuc': 1, 'phu-the': 1, 'huynh-de': 1,
    'tong-quan': 1,
  };

  /** Hash chuỗi ổn định (djb2) — CHỈ để chọn biến thể bối cảnh, không cần bền
   * vững mật mã, chỉ cần CÙNG lá số ra CÙNG một số mỗi lần render (PDF, poster,
   * mở lại link cũ phải khớp nhau — random mỗi lần load là hỏng cả ba). */
  function _hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /** Sắc thái tốt/trung/xấu cho MỘT cung, theo đúng ngưỡng đã nghiệm. */
  function sacThaiCung(ls, cungName) {
    if (!root.xuHuongCungW || !root.ILLUS_NGUONG) return null;
    var th = root.ILLUS_NGUONG[cungName];
    var tong = ls.cungScores && ls.cungScores[cungName] && ls.cungScores[cungName].tong;
    var w = root.xuHuongCungW(ls, cungName);
    if (!th || typeof tong !== 'number' || w == null) return null;
    var rank = w + tong / 100;
    return rank <= th.t33 ? 'xau' : rank > th.t67 ? 'tot' : 'trung';
  }

  /**
   * URL ảnh minh hoạ cho một PHẦN (1-13), hoặc null nếu thiếu bất kỳ tag nào
   * — KHÔNG suy đoán, KHÔNG hiện ảnh sai (cùng luật "đọc hụt thì để … và từ
   * chối chạy" của giá Lượng).
   *
   * @param {object} ls     lá số (anSaoLaSo) của trang đang hiển thị
   * @param {number} phan   1-13
   * @param {'nam'|'nu'} gioi  giới tính NHÂN VẬT trong tranh. BẮT BUỘC truyền
   *                           tay — `anSaoLaSo()` KHÔNG echo `gioitinh` đầu
   *                           vào ra lại trên `ls` (đã kiểm engine), nên
   *                           không có chỗ nào để tự suy ra ở đây. Trang gọi
   *                           hàm này đã sẵn biến giới tính từ form (vd
   *                           `_gioitinh` trong app-luan-giai.html) — truyền
   *                           thẳng biến đó vào.
   * @returns {{url:string, sac:string, khia:string}|null}
   */
  function illusUrlForPhan(ls, phan, gioi) {
    var khia = PHAN_TO_KHIA[phan];
    if (!khia) return null; // phần 14-24 (đại vận) — thư viện chưa phủ, Tier B
    // Thiếu/sai giới tính → KHÔNG đoán, không hiện ảnh (cùng luật "đọc hụt
    // thì để … và từ chối chạy" của giá Lượng — xanh oan nguy hơn đỏ oan).
    if (gioi !== 'nam' && gioi !== 'nu') return null;

    var sac;
    if (khia === 'tong-quan') {
      // Tổng quan neo theo cung Mệnh — không có "w của phần 1" riêng, và Mệnh
      // là cung quyết định khí chất tổng thể (đúng cách PHẦN 1 của prompt LLM
      // cũng đọc "Luận sao" của Mệnh làm căn cứ chính).
      sac = sacThaiCung(ls, 'Mệnh');
    } else {
      sac = sacThaiCung(ls, KHIA_TO_CUNG[khia]);
    }
    if (!sac) return null;

    var vCount = VARIANT_COUNT[khia] || 1;
    // Hạt giống ổn định: can-chi năm sinh + địa chi Mệnh/Thân — không đổi
    // giữa hai lần tính lá số CÙNG một người, khác nhau giữa hai người khác
    // nhau (kể cả trùng can-chi năm thì Mệnh/Thân vẫn thường lệch).
    var seedStr = String(ls.canChiNam || '') + '|' + String(ls.menhDC || '') + '|' + String(ls.thanDC || '');
    var v = (_hash(seedStr + khia) % vCount) + 1;

    var id = khia + '--' + sac + '--' + gioi + '--truong-thanh--v' + v;
    var url = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + PREFIX + '/' + id + '.png';
    return { url: url, sac: sac, khia: khia };
  }

  root.IllusMatch = { illusUrlForPhan: illusUrlForPhan, sacThaiCung: sacThaiCung, PHAN_TO_KHIA: PHAN_TO_KHIA };
})(typeof window !== 'undefined' ? window : this);
