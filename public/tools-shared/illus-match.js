// public/tools-shared/illus-match.js
// ============================================================
// Chọn ảnh minh hoạ (thư viện `illus-prompt.ts` / `scripts/gen-illus.mjs`)
// khớp với PHẦN đang hiển thị.
//
// Hai hàm công khai, hai tool khác nhau:
//   illusUrlForPhan(ls, phan, gioi)     → app-luan-giai.html (Luận Giải Lá Số,
//     phần 1-13 = tổng quan + 12 cung). `PHAN_TO_KHIA` gắn CỨNG với đúng thứ
//     tự phần của RIÊNG luan-giai-core.js — không tái dùng cho tool khác.
//   illusUrlForDaiVan(ls, dvIndex, gioi) → app-chu-trinh-cuoc-doi.html (Chu
//     Trình Cuộc Đời, đại vận 0-8). Tái dùng cảnh "tong-quan" sẵn có, đổi
//     TUỔI nhân vật theo tuổi giữa đại vận — không cần vẽ thêm khía cạnh mới.
// Vận Hạn 12 Tháng (16 phần, theo tháng) CHƯA có hàm nào ở đây — thư viện
// chưa vẽ cảnh theo mùa/tháng, để đợt sau.
//
// `sacThaiCung()` và bảng `KHIA_TO_CUNG` là phần DÙNG CHUNG được thật (đọc
// theo TÊN CUNG, không theo số phần) — cả hai hàm trên đều gọi qua đó.
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

    var seedStr = String(ls.canChiNam || '') + '|' + String(ls.menhDC || '') + '|' + String(ls.thanDC || '');
    return buildUrl(khia, sac, gioi, 'truong-thanh', seedStr);
  }

  /** Dựng URL từ 5 mảnh đã CHỐT (khoá tag) — dùng chung giữa `illusUrlForPhan`
   * và `illusUrlForDaiVan`. `seedStr` chỉ cần ổn định theo LÁ SỐ, không cần
   * theo khía/tuổi — hàm tự trộn thêm khía vào hash. */
  function buildUrl(khia, sac, gioi, tuoi, seedStr) {
    var vCount = VARIANT_COUNT[khia] || 1;
    var v = (_hash(seedStr + khia + tuoi) % vCount) + 1;
    var id = khia + '--' + sac + '--' + gioi + '--' + tuoi + '--v' + v;
    var url = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + PREFIX + '/' + id + '.png';
    return { url: url, sac: sac, khia: khia };
  }

  // ── Đại Vận (Chu Trình Cuộc Đời) ─────────────────────────────────────────
  // 🔑 SẮC THÁI ĐỌC THẲNG `dv.scoring.flag` — KHÔNG suy ngưỡng riêng như cung.
  // Khác cung (nhãn "Luận sao" ẩn trong text, phải hoist mới gọi được), đại
  // vận đã có sẵn flag 🟢/🟡/🔴 HIỂN THỊ THẲNG cho người đọc ngay cạnh "Tổng"
  // (`luan-giai-core.js`, buildTuHoaPhiTinhHtml) — đây MỚI là nguồn "một
  // nguồn" đúng nghĩa: ảnh phải khớp đúng cái người ta đã thấy trên màn hình,
  // không phải một ngưỡng khác tự suy ra cho đều tay hơn.
  var DAIVAN_FLAG_SAC = { '🟢': 'tot', '🟡': 'trung', '🔴': 'xau' };

  // Mốc tuổi đại diện của 5 bậc `Tuoi` trong illus-prompt.ts — điểm giữa hai
  // mốc liền kề là ranh giới chọn bậc gần nhất theo tuổi GIỮA đại vận.
  // Đo trên 6.000 đại vận thật: cả 5 bậc đều rơi vào dùng thật (nhi đồng khi
  // đại vận 1 rơi cục 2-3, lão niên rất phổ biến ở đại vận 7-9), không bậc
  // nào là tử lộ.
  var TUOI_MOC = [
    [15, 'nhi-dong'],
    [26, 'thanh-nien'],
    [42, 'truong-thanh'],
    [60, 'trung-nien'],
    [Infinity, 'lao-nien'],
  ];
  function tuoiBacThoDaiVan(tuoiGiua) {
    for (var i = 0; i < TUOI_MOC.length; i++) if (tuoiGiua < TUOI_MOC[i][0]) return TUOI_MOC[i][1];
    return 'lao-nien';
  }

  /**
   * URL ảnh minh hoạ cho MỘT ĐẠI VẬN (Chu Trình Cuộc Đời) — tái dùng cảnh
   * "tong-quan" (đứng nhìn cả cuộc đời/thời điểm hiện tại), đổi TUỔI nhân vật
   * theo tuổi giữa đại vận đó nên nhân vật già dần qua 9 bức.
   *
   * @param {object} ls
   * @param {number} dvIndex   0-8 (khớp `ls.daiVans[dvIndex]`)
   * @param {'nam'|'nu'} gioi  bắt buộc truyền tay, xem `illusUrlForPhan`
   * @returns {{url:string, sac:string, khia:string, tuoi:string}|null}
   */
  function illusUrlForDaiVan(ls, dvIndex, gioi) {
    if (gioi !== 'nam' && gioi !== 'nu') return null;
    var dv = ls.daiVans && ls.daiVans[dvIndex];
    if (!dv || !dv.scoring) return null;
    var sac = DAIVAN_FLAG_SAC[dv.scoring.flag];
    if (!sac) return null;
    if (typeof dv.tuoiStart !== 'number' || typeof dv.tuoiEnd !== 'number') return null;
    var tuoi = tuoiBacThoDaiVan((dv.tuoiStart + dv.tuoiEnd) / 2);
    var seedStr = String(ls.canChiNam || '') + '|' + String(ls.menhDC || '') + '|' + String(ls.thanDC || '');
    var r = buildUrl('tong-quan', sac, gioi, tuoi, seedStr);
    r.tuoi = tuoi;
    return r;
  }

  root.IllusMatch = {
    illusUrlForPhan: illusUrlForPhan,
    illusUrlForDaiVan: illusUrlForDaiVan,
    sacThaiCung: sacThaiCung,
    PHAN_TO_KHIA: PHAN_TO_KHIA,
  };
})(typeof window !== 'undefined' ? window : this);
