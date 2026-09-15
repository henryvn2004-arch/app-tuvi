// public/tools-shared/illus-match.js
// ============================================================
// Chọn ảnh minh hoạ (thư viện `illus-prompt.ts` / `scripts/gen-illus.mjs`)
// khớp với PHẦN đang hiển thị.
//
// Năm hàm công khai:
//   illusUrlForPhan(ls, phan, gioi)     → app-luan-giai.html (Luận Giải Lá Số,
//     phần 1-13 = tổng quan + 12 cung). `PHAN_TO_KHIA` gắn CỨNG với đúng thứ
//     tự phần của RIÊNG luan-giai-core.js — không tái dùng cho tool khác.
//   illusUrlForDaiVan(ls, dvIndex, gioi) → app-chu-trinh-cuoc-doi.html (Chu
//     Trình Cuộc Đời, đại vận 0-8). Tái dùng cảnh "tong-quan" sẵn có, đổi
//     TUỔI nhân vật theo tuổi giữa đại vận — không cần vẽ thêm khía cạnh mới.
//   illusUrlForTongQuan(ls, gioi, tuoiBac) → Công Sở / Dạy Con / Hướng Nghiệp
//     Trẻ (app-cong-so.html, app-day-con.html, app-huong-nghiep-tre.html) —
//     3 tool KHÔNG có cấu trúc 12-cung riêng ở client, chỉ 1 banner đầu trang
//     theo cung Mệnh, tuổi truyền tay (dùng `tuoiBac(tuoiSo)` với tuổi THỰC
//     của nhân vật, không phải tuổi giữa đại vận).
//   illusUrlForThang(ls, thangAL, gioi) → app-van-han-nam.html (Vận Hạn 12
//     Tháng, phần 5-16 = 12 tháng âm lịch). KHÔNG có trục sắc thái (xem
//     `THANG_CANH`, illus-prompt.ts) — chỉ đổi cảnh theo mùa/lễ tiết.
//   illusUrlForXemTuoi(idx, mode, gioi, diem, seedStr) → app-xem-tuoi.html
//     (Xem Tuổi vợ chồng/làm ăn/tương hợp, phần 0-8). Luận về HAI người chứ
//     không một cung của một lá số nên sắc thái đọc thẳng ĐIỂM SỐ đã hiện
//     (r.total/item.score), không tra `ls.cungScores`. 4/9 khía tái dùng
//     `KHIA_CANH` qua `buildUrl`, 5/9 khía riêng (`XEM_TUOI_CANH`, tiền tố
//     id "xt-") — xem `_xtKhiaFor`.
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
   * trong `KHIA_CANH.boiCanh` (luôn là 3). Nâng số này CHO TỪNG KHOÁ chỉ sau
   * khi biến thể đó đã thật sự sinh + upload lên Storage — nâng sớm thì một
   * phần lá số trỏ vào ảnh chưa tồn tại (ẩn ảnh do `onerror`, không vỡ trang,
   * nhưng người xem thấy phần đó "mất ảnh" so với phần khác một cách vô cớ).
   * Cả 13 khoá lên 2 từ v2 (tierAv2, xem admin route) — sắc "tốt" đọc cảnh
   * phú quý riêng, "trung"/"xấu" chỉ đổi bối cảnh (`illus-prompt.ts`).
   */
  var VARIANT_COUNT = {
    menh: 2, 'phu-mau': 2, 'phuc-duc': 2, 'dien-trach': 2, 'quan-loc': 2, 'no-boc': 2,
    'thien-di': 2, 'tat-ach': 2, 'tai-bach': 2, 'tu-tuc': 2, 'phu-the': 2, 'huynh-de': 2,
    'tong-quan': 2,
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
   * @returns {{url:string, printUrl:string, sac:string, khia:string}|null}
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
    // .webp (1536x1024, quality 82) — bản NÉN SẴN cho MÀN HÌNH, migrate
    // 2026-09-14 khỏi .png gốc (trung bình 3,1MB/tấm, đo thật từ
    // storage.objects: 230 ảnh = 693MB). Bản .png gốc VẪN CÒN trong bucket
    // làm lưu trữ, không xoá.
    //
    // 🪤 `-print.jpg` (2026-09-15): ban đầu nghĩ ảnh nhẹ sẵn thì dùng chung
    // luôn cho cả in ấn, không cần đường riêng — SAI. Chromium `page.pdf()`/
    // `window.print()` khi nhúng ảnh vào PDF KHÔNG giữ nguyên byte WebP đã
    // nén — Skia giải mã rồi nhúng lại gần-như-lossless, một PDF Luận Giải
    // Lá Số (13 ảnh 1536x1024) đo được ~41MB dù mỗi ảnh nguồn chỉ ~270KB
    // (vượt luôn trần dung lượng bucket `samples`). Sinh thêm bản nhỏ hơn
    // hẳn (`scripts/gen-illus-print.mjs`, resize theo TỈ LỆ — không ép một
    // chiều như bug crop 900x1024 đã vá ở #851) cho `img[data-print-src]` —
    // `forceEagerIllusImages()` (shell.js) tự SWAP `img.src` ngay trước khi
    // in. 🪤 Hai bẫy đã vấp: (1) `<picture><source media="print">` chọn
    // nguồn lúc CHÈN VÀO DOM (còn ở chế độ màn hình), `page.emulateMedia()`
    // của Playwright đổi SAU đó không kích hoạt lại — đo lại PDF không nhỏ
    // đi chút nào, phải swap `img.src` bằng JS thay vì dựa `<picture>`. (2)
    // Đổi `-print` sang WebP xong PDF vẫn ~10MB — đo cục bộ (13 ảnh, không
    // qua mạng): Chromium nhúng WebP gần-như-lossless (~6,5MB/13 ảnh 640px)
    // nhưng nhúng JPEG gần NGUYÊN KHỐI (~0,6MB/13 ảnh cùng cỡ, rẻ hơn ~10
    // lần) — `-print` PHẢI là `.jpg`, `.webp` màn hình giữ nguyên.
    var base = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + PREFIX + '/' + id;
    return { url: base + '.webp', printUrl: base + '-print.jpg', sac: sac, khia: khia };
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
   * @returns {{url:string, printUrl:string, sac:string, khia:string, tuoi:string}|null}
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

  /** Bậc tuổi 1/5 cho một TUỔI THỰC bất kỳ (không chỉ tuổi giữa đại vận) —
   * dùng chung bảng mốc `TUOI_MOC` ở trên, không dựng bảng mốc thứ hai. */
  function tuoiBac(tuoi) {
    if (typeof tuoi !== 'number' || !isFinite(tuoi)) return null;
    return tuoiBacThoDaiVan(tuoi);
  }

  /**
   * URL ảnh minh hoạ "tổng quan" theo cung Mệnh — dùng cho các tool KHÔNG có
   * cấu trúc 12-cung riêng (Công Sở, Dạy Con, Hướng Nghiệp Trẻ): một banner
   * duy nhất ở đầu trang, sắc thái theo Mệnh, tuổi theo TUỔI THỰC của nhân
   * vật (khác `illusUrlForDaiVan` — tuổi giữa một đại vận).
   *
   * @param {object} ls    lá số nhân vật chính (đã tính bằng `anSaoLaSo`)
   * @param {'nam'|'nu'} gioi  bắt buộc truyền tay, xem `illusUrlForPhan`
   * @param {string} tuoi  một trong 5 bậc `Tuoi` — dùng `tuoiBac(tuoiSo)` để suy ra
   * @returns {{url:string, printUrl:string, sac:string, khia:string}|null}
   */
  function illusUrlForTongQuan(ls, gioi, tuoi) {
    if (gioi !== 'nam' && gioi !== 'nu') return null;
    if (!TUOI_MOC.some(function (m) { return m[1] === tuoi; })) return null;
    var sac = sacThaiCung(ls, 'Mệnh');
    if (!sac) return null;
    var seedStr = String(ls.canChiNam || '') + '|' + String(ls.menhDC || '') + '|' + String(ls.thanDC || '');
    return buildUrl('tong-quan', sac, gioi, tuoi, seedStr);
  }

  // ── Vận Hạn 12 Tháng ─────────────────────────────────────────────────────
  // 🔑 KHÔNG có trục sắc thái ở đây — xem lý do (van-han-12.ts từ chối chấm
  // điểm cho một tháng) trong `THANG_CANH`, illus-prompt.ts. `THANG_SAC` chỉ
  // là hằng số đứng đúng vị trí "sắc thái" trong tên file 5-phần, không mang
  // nghĩa sắc thái nào — PHẢI khớp `THANG_SAC` export trong illus-prompt.ts.
  var THANG_SAC = 'chuan';

  /**
   * URL ảnh minh hoạ cho MỘT THÁNG ÂM LỊCH (Vận Hạn 12 Tháng) — khoá dựng
   * bằng công thức, KHÔNG tra bảng (12 tháng = 12 khoá cố định 'thang-01'..
   * 'thang-12' trong `THANG_CANH`, illus-prompt.ts).
   *
   * @param {object} ls
   * @param {number} thangAL  1-12 (khớp `ThangKhung.thangAL`, van-han-12.ts)
   * @param {'nam'|'nu'} gioi bắt buộc truyền tay, xem `illusUrlForPhan`
   * @returns {{url:string, printUrl:string, sac:string, khia:string}|null}
   */
  function illusUrlForThang(ls, thangAL, gioi) {
    if (gioi !== 'nam' && gioi !== 'nu') return null;
    if (typeof thangAL !== 'number' || thangAL < 1 || thangAL > 12) return null;
    var khia = 'thang-' + (thangAL < 10 ? '0' + thangAL : String(thangAL));
    var seedStr = String(ls.canChiNam || '') + '|' + String(ls.menhDC || '') + '|' + String(ls.thanDC || '');
    return buildUrl(khia, THANG_SAC, gioi, 'truong-thanh', seedStr);
  }

  // ── Xem Tuổi (vợ chồng / làm ăn / tương hợp) ────────────────────────────
  // 5 khía RIÊNG (`XEM_TUOI_CANH`, illus-prompt.ts) — file id tiền tố "xt-"
  // để tách khỏi namespace `KHIA_CANH` (khoá cứng đúng 13 khoá, xem
  // check-illus.mjs — nhét thêm khoá vào đó phá cả 3 nguồn đối chiếu chéo).
  // 4 khía còn lại TÁI DÙNG ảnh cung có sẵn qua `buildUrl` (không vẽ thêm).
  var XT_VARIANT_COUNT = {
    'xet-tuoi': 2, 'ngu-hanh': 2, 'tu-tuong': 2, 'tinh-cach': 2, 'van-hanh': 2,
  };

  /** Phần (0-8, khớp `PHAN_LABELS` app-xem-tuoi.html) → khía + có dùng bảng
   * `XEM_TUOI_CANH` (tiền tố "xt-") hay tái dùng `KHIA_CANH` (12 cung) không.
   * Phần 5/6 đổi khía theo mode — vợ chồng (Quan Hệ/Con Cái → Phu Thê/Tử
   * Tức) khác bản chất làm ăn (Đối Tác/Giao Tiếp → Nô Bộc, gần nghĩa "người
   * xung quanh, đồng nghiệp" hơn). */
  function _xtKhiaFor(idx, mode) {
    switch (idx) {
      case 0: return { khia: 'tong-quan', xt: false };
      case 1: return { khia: 'xet-tuoi', xt: true };
      case 2: return { khia: 'ngu-hanh', xt: true };
      case 3: return { khia: 'tu-tuong', xt: true };
      case 4: return { khia: 'tinh-cach', xt: true };
      case 5: return { khia: mode === 'xem-lam-an' ? 'no-boc' : 'phu-the', xt: false };
      case 6: return { khia: mode === 'xem-lam-an' ? 'no-boc' : 'tu-tuc', xt: false };
      case 7: return { khia: 'tai-bach', xt: false };
      case 8: return { khia: 'van-hanh', xt: true };
      default: return null;
    }
  }

  /** Sắc thái 3 bậc từ ĐIỂM SỐ thật đã hiện cho người dùng (không suy ngưỡng
   * riêng như cung) — phần 0 đọc `r.total` (0-100, cùng thang `meterColor`),
   * phần 1-8 đọc `item.score` (0-10, cùng thang `facColor`). Mốc ở đây KHÔNG
   * cần khớp tuyệt đối hai hàm màu đó (4 bậc màu gộp về 3 bậc sắc thái vẽ
   * tranh) — chỉ cần cùng HƯỚNG đọc đúng con số đã hiện trên màn hình. */
  function sacThaiDiem(diem, thang100) {
    if (typeof diem !== 'number') return null;
    var tot = thang100 ? 70 : 7, xau = thang100 ? 40 : 3;
    return diem >= tot ? 'tot' : diem <= xau ? 'xau' : 'trung';
  }

  /**
   * URL ảnh minh hoạ cho MỘT PHẦN của Xem Tuổi (vợ chồng/làm ăn/tương hợp).
   *
   * @param {number} idx    0-8, khớp `PHAN_LABELS` trong app-xem-tuoi.html
   * @param {string} mode   MODE_KEY trang đang mở ('xem-tuoi'|'xem-lam-an'|'tuong-hop')
   * @param {'nam'|'nu'} gioi  giới tính nhân vật trong tranh — trang tự chọn
   *                           (theo giới người A), bắt buộc truyền tay như
   *                           `illusUrlForPhan`
   * @param {number} diem   idx=0 truyền `r.total` (0-100); idx=1-8 truyền
   *                        `item.score` (0-10)
   * @param {string} seedStr  chuỗi ổn định theo CẶP lá số (vd canChiNam của
   *                          cả hai người nối lại) — chỉ để chọn biến thể
   * @returns {{url:string, sac:string, khia:string}|null}
   */
  function illusUrlForXemTuoi(idx, mode, gioi, diem, seedStr) {
    if (gioi !== 'nam' && gioi !== 'nu') return null;
    var kh = _xtKhiaFor(idx, mode);
    if (!kh) return null;
    var sac = sacThaiDiem(diem, idx === 0);
    if (!sac) return null;
    if (!kh.xt) return buildUrl(kh.khia, sac, gioi, 'truong-thanh', seedStr);
    var vCount = XT_VARIANT_COUNT[kh.khia] || 1;
    var v = (_hash(seedStr + kh.khia + 'truong-thanh') % vCount) + 1;
    var id = 'xt-' + kh.khia + '--' + sac + '--' + gioi + '--truong-thanh--v' + v;
    var url = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + PREFIX + '/' + id + '.webp';
    return { url: url, sac: sac, khia: kh.khia };
  }

  root.IllusMatch = {
    illusUrlForPhan: illusUrlForPhan,
    illusUrlForDaiVan: illusUrlForDaiVan,
    illusUrlForTongQuan: illusUrlForTongQuan,
    illusUrlForThang: illusUrlForThang,
    illusUrlForXemTuoi: illusUrlForXemTuoi,
    sacThaiCung: sacThaiCung,
    tuoiBac: tuoiBac,
    PHAN_TO_KHIA: PHAN_TO_KHIA,
  };
})(typeof window !== 'undefined' ? window : this);
