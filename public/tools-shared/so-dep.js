/* tools-shared/so-dep.js — Module DÙNG CHUNG tool "Số Đẹp" (đánh giá SĐT/số
   nhà/biển số theo cổ pháp — Bát Trạch, Mai Hoa Dịch Số, Ngũ Hành, Âm Dương).
   Nguồn DUY NHẤT cho /tools/so-dep.html + shell /app/so-dep.
   window.SoDepTool = { danhGia, goiY, STAR_DESC }

   ── goiY() — GỢI Ý SỐ, thêm ở PR #2b ────────────────────────────────────
   Không chép bảng cặp số ra lần thứ ba: đồ thị cạnh cho từng "mục tiêu" dựng
   TRỰC TIẾP từ `BatTrachTool.starBetween()` (quét mọi cặp 1-9\{5}, giữ cặp
   nào ra đúng sao mục tiêu). Random-walk trên đồ thị đó SINH ứng viên, rồi
   ứng viên được CHẤM LẠI bằng chính `danhGia()` — generator không tự phát
   minh thang điểm riêng, tránh 2 nguồn "thế nào là tốt" trôi khỏi nhau.
   DETERMINISTIC: seed = hash(tham số đầu vào) qua PRNG mulberry32, không
   dùng `Math.random()` — bấm lại cùng tham số ra cùng danh sách.

   ── VÌ SAO ENGINE NÀY TỒN TẠI — đọc trước khi sửa ──────────────────────────
   Thị trường "xem số đẹp" ở VN gần như 100% chấm một điểm số DUY NHẤT (vd.
   "94.5/100") mà không nói rõ nguồn. Con số đó BỊA — vì các trường phái cổ
   pháp thật sự MÂU THUẪN nhau (Hà Đồ và Lạc Thư gán hành khác nhau cho cùng
   một chữ số), và không có "trung bình" nào cứu được mâu thuẫn đó. Engine
   này CỐ Ý không gộp — hiện điểm RIÊNG từng trường phái + chỉ số ĐỒNG THUẬN
   (bao nhiêu trường phái nói tốt), và tách bạch dân gian (không phải cổ
   pháp) khỏi phần có thể suy ra bằng toán học.

   100% DETERMINISTIC — không gọi LLM, không tốn 1đ. LLM (nếu có) chỉ được
   NHẬN kết quả engine này để LUẬN GIẢI thành văn, không được tự tính lại
   (đúng luật "Engine là nguồn số duy nhất" — xem CLAUDE.md).

   ── 4 TẦNG suy được bằng toán, 1 tầng dân gian (KHÔNG SUY ĐƯỢC — CHƯA LÀM) ─
   T1 Bát Tinh   — quét cặp chữ số liền kề, tra `BatTrachTool.starBetween()`
                   (bảng Du Niên suy từ XOR nhị phân quái, PR #607).
   T2 Quẻ Dịch   — chia dãy số làm 2 nửa, tổng mỗi nửa chia 8 dư → thượng/hạ
                   quái (số Tiên Thiên, `MaiHoaTool.BAT_QUAI`), tổng cả dãy
                   chia 6 dư → hào động. Tra `KinhDichTool.findHexagram/QUE`.
                   KHÔNG dùng giờ hiện tại (khác gieo quẻ xem bói) — phải
                   deterministic để bấm lại ra cùng kết quả, cache được.
   T3 Ngũ Hành   — hành từng chữ số = `BatTrachTool.CUNG_HANH[d]` (cùng bảng
                   Lạc Thư dùng cho T1, để không có 2 ánh xạ số↔hành khác
                   nhau trong cùng một tool). Đối chiếu nạp âm bản mệnh
                   (`NapAmTool`) + hành cung phi (`BatTrachTool.getCungMenh`)
                   NẾU có năm sinh — tầng CÁ NHÂN HOÁ duy nhất trong T1-T5.
   T5 Âm Dương   — tỉ lệ lẻ/chẵn, số chủ đạo (digital root), dãy đối xứng/
                   tiến dần/số đôi lặp — thuần số học, không cổ pháp.
   T6 Dân gian   — bảng tra cặp số quen thuộc (49/53/4/13 kiêng, 6/8/9/68/39
                   kỵ hoặc thích) — DÁN NHÃN RÕ [dân gian], KHÔNG cộng vào
                   điểm đồng thuận cổ pháp (T1+T2+T3).

   ── CHƯA LÀM — 81 Linh Số ────────────────────────────────────────────────
   Có nhắc trong workplan ban đầu nhưng CỐ Ý bỏ khỏi bản này: 81 Linh Số cần
   một bảng 81 mục nội dung cát/hung mà tôi chưa có nguồn văn bản xác thực để
   trích dẫn — bịa 81 đoạn "cổ pháp" không kiểm chứng được vi phạm đúng luật
   mà PR #607 vừa sửa (KHÔNG chép/suy một công thức cổ pháp mà không verify).
   Cần Henry cung cấp nguồn hoặc duyệt nội dung trước khi thêm T4.
   ============================================================ */
(function (root) {
  'use strict';

  function _mod(n, m) {
    // Dư 0 quy về m (Bát Quái/Bát Trạch không có "hào số 0") — cùng quy ước
    // với `mai-hoa.js` `_mod`, KHÔNG phải quy về 1.
    var r = ((n % m) + m) % m;
    return r === 0 ? m : r;
  }

  function chuanHoa(soRaw) {
    return String(soRaw == null ? '' : soRaw).replace(/[^0-9]/g, '');
  }

  // ── Mô tả ý nghĩa 8 sao Du Niên — dùng chung cho T1, tách khỏi bat-trach.js
  // vì đây là văn luận cho NGỮ CẢNH số đẹp (khác ngữ cảnh hướng nhà). Không
  // trùng với `STAR_DESC`/`CAT_DESC` nội bộ trong các tool phong thủy khác.
  var STAR_DESC = {
    'Sinh Khí': { catHung: 'cat', y: 'Đại cát — tài lộc, cơ hội, phát triển. Sao tốt nhất trong 8 sao.' },
    'Thiên Y': { catHung: 'cat', y: 'Sức khoẻ, quý nhân, tiền vào đều đặn.' },
    'Diên Niên': { catHung: 'cat', y: 'Bền vững, hôn nhân, sự nghiệp lâu dài.' },
    'Phục Vị': { catHung: 'cat', y: 'Bình ổn, giữ vững, không đột biến — an toàn nhưng ít bứt phá.' },
    'Họa Hại': { catHung: 'hung', y: 'Thị phi, khẩu thiệt, hao tài vặt.' },
    'Lục Sát': { catHung: 'hung', y: 'Tình cảm/quan hệ rắc rối, kéo dài dây dưa.' },
    'Ngũ Quỷ': { catHung: 'hung', y: 'Tiểu nhân, biến động bất ngờ, phá ngầm.' },
    'Tuyệt Mệnh': { catHung: 'hung', y: 'Cực đoan — được ăn cả ngã về không, biến động lớn.' },
  };

  // ── T1. Bát Tinh — quét cặp chữ số liền kề ─────────────────────────────
  // Trọng số tăng dần về CUỐI dãy (số cuối của SĐT/biển số thường là số hay
  // đọc/nhớ nhất — quy ước phổ biến trong giới xem số, không phải cổ pháp
  // gốc, nói rõ trong UI). `0` khuếch đại cặp trước (không tự thành sao vì
  // không có mã quái); `5` là trung cung, cắt mạch — cặp đó trung tính.
  function boCapT1(digits) {
    var BT = root.BatTrachTool;
    var out = [];
    var lastEntry = null;
    for (var i = 0; i < digits.length - 1; i++) {
      var a = digits[i], b = digits[i + 1];
      var trongSo = i + 1;
      if (a === 0 || b === 0) {
        if (lastEntry && b === 0) { lastEntry.trongSo += trongSo * 0.5; lastEntry.khuechDai = true; }
        out.push({ vi: i, a: a, b: b, sao: null, ghiChu: 'Có số 0 — khuếch đại cặp trước, không tự thành sao', trongSo: 0 });
        continue;
      }
      if (a === 5 || b === 5) {
        out.push({ vi: i, a: a, b: b, sao: null, ghiChu: 'Trung cung (5) — trung tính, cắt mạch, không tính cát/hung', trongSo: 0 });
        lastEntry = null;
        continue;
      }
      if (!BT) { out.push({ vi: i, a: a, b: b, sao: null, ghiChu: 'Chưa nạp được BatTrachTool', trongSo: 0 }); continue; }
      var sao = BT.starBetween(a, b);
      var meta = STAR_DESC[sao] || {};
      var entry = { vi: i, a: a, b: b, sao: sao, catHung: meta.catHung || null, y: meta.y || '', trongSo: trongSo };
      out.push(entry);
      lastEntry = entry;
    }
    return out;
  }

  function tongHopT1(digits) {
    var cap = boCapT1(digits);
    var diemCat = 0, diemHung = 0, phanBo = {};
    cap.forEach(function (c) {
      if (!c.sao) return;
      phanBo[c.sao] = (phanBo[c.sao] || 0) + c.trongSo;
      if (c.catHung === 'cat') diemCat += c.trongSo; else if (c.catHung === 'hung') diemHung += c.trongSo;
    });
    var tong = diemCat + diemHung;
    var diem100 = tong > 0 ? Math.round((diemCat / tong) * 100) : null;
    var noiBat = Object.keys(phanBo).sort(function (x, y2) { return phanBo[y2] - phanBo[x]; });
    var verdict = diem100 == null ? null : (diem100 >= 60 ? 'tot' : diem100 <= 40 ? 'xau' : 'trung');
    return { capSao: cap, phanBo: phanBo, diemCat: diemCat, diemHung: diemHung, diem100: diem100, noiBat: noiBat, verdict: verdict };
  }

  // ── T2. Quẻ Dịch — chia dãy làm 2 nửa, KHÔNG phụ thuộc giờ hiện tại ─────
  function tinhQueDich(digits) {
    if (digits.length < 2) return { ok: false, error: 'Cần tối thiểu 2 chữ số để lập quẻ.' };
    var MH = root.MaiHoaTool, KD = root.KinhDichTool;
    if (!MH || !KD) return { ok: false, error: 'Chưa nạp được MaiHoaTool/KinhDichTool.' };
    var mid = Math.ceil(digits.length / 2);
    var nuaDau = digits.slice(0, mid);
    var nuaSau = digits.slice(mid);
    if (!nuaSau.length) nuaSau = nuaDau;
    var tongDau = nuaDau.reduce(function (s, d) { return s + d; }, 0);
    var tongSau = nuaSau.reduce(function (s, d) { return s + d; }, 0);
    var thuongIdx = _mod(tongDau, 8);
    var haIdx = _mod(tongSau, 8);
    var haoDong = _mod(tongDau + tongSau, 6);
    var quaiTren = MH.BAT_QUAI[thuongIdx - 1];
    var quaiDuoi = MH.BAT_QUAI[haIdx - 1];
    var li6 = quaiDuoi.li + quaiTren.li;
    var idx = KD.findHexagram(li6);
    var que = KD.QUE[idx];
    var arr = li6.split('');
    arr[haoDong - 1] = arr[haoDong - 1] === '1' ? '0' : '1';
    var liBien = arr.join('');
    var idxBien = KD.findHexagram(liBien);
    var queBien = KD.QUE[idxBien];
    var verdict = que.f === 'tot' ? 'tot' : que.f === 'canh' ? 'xau' : 'trung';
    return {
      ok: true,
      tongDau: tongDau, tongSau: tongSau,
      thuongQuai: { so: thuongIdx, n: quaiTren.n, zh: quaiTren.zh, hanh: quaiTren.hanh },
      haQuai: { so: haIdx, n: quaiDuoi.n, zh: quaiDuoi.zh, hanh: quaiDuoi.hanh },
      haoDong: haoDong, li6: li6,
      que: { ten: que.n, zh: que.zh, y: que.m, chiTiet: que.g, catHung: que.f },
      queBien: { ten: queBien.n, zh: queBien.zh, y: queBien.m },
      verdict: verdict,
      moTa: 'Nửa đầu (' + nuaDau.join('') + ') tổng ' + tongDau + ' chia 8 dư ' + thuongIdx + ' → thượng quái ' + quaiTren.n +
        '; nửa sau (' + nuaSau.join('') + ') tổng ' + tongSau + ' chia 8 dư ' + haIdx + ' → hạ quái ' + quaiDuoi.n +
        '; tổng cả dãy chia 6 dư ' + haoDong + ' → hào động.',
    };
  }

  // ── T3. Ngũ Hành — cùng bảng Lạc Thư với T1, cá nhân hoá nếu có năm sinh ─
  function tinhNguHanh(digits, namSinh, gioiTinh) {
    var BT = root.BatTrachTool, NA = root.NapAmTool;
    var phanBo = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };
    if (BT) {
      digits.forEach(function (d) {
        var h = BT.CUNG_HANH[d];
        if (h) phanBo[h] = (phanBo[h] || 0) + 1;
      });
    }
    var hanhThieu = Object.keys(phanBo).filter(function (h) { return phanBo[h] === 0; });
    var out = { phanBo: phanBo, hanhThieu: hanhThieu, banMenh: null, verdict: null };
    if (namSinh && BT && NA) {
      var napAm = NA.compute(namSinh);
      var cung = BT.getCungMenh(namSinh, gioiTinh === 'nam' ? 'nam' : 'nu');
      if (cung === 5) cung = gioiTinh === 'nam' ? 2 : 8;
      var hanhCungPhi = BT.CUNG_HANH[cung];
      var hanhNapAm = napAm.ok ? napAm.data.hanh : null;
      var hopMenh = [];
      if (hanhNapAm && phanBo[hanhNapAm] > 0) hopMenh.push('nạp âm (' + hanhNapAm + ')');
      if (hanhCungPhi && hanhCungPhi !== hanhNapAm && phanBo[hanhCungPhi] > 0) hopMenh.push('cung phi (' + hanhCungPhi + ')');
      out.banMenh = {
        napAm: napAm.ok ? napAm.data.napAm : null, hanhNapAm: hanhNapAm,
        cungPhi: cung, hanhCungPhi: hanhCungPhi,
        hopMenh: hopMenh,
      };
      out.verdict = hopMenh.length > 0 ? 'tot' : 'trung';
    }
    return out;
  }

  // ── T5. Âm Dương + cấu trúc — thuần số học, không cổ pháp ──────────────
  function tinhAmDuong(digits) {
    var le = 0, chan = 0;
    digits.forEach(function (d) { if (d % 2 === 0) chan++; else le++; });
    var tong = digits.reduce(function (s, d) { return s + d; }, 0);
    var soChuDao = tong;
    while (soChuDao > 9) { soChuDao = String(soChuDao).split('').reduce(function (s, c) { return s + Number(c); }, 0); }
    var doiXung = digits.length > 2 && digits.join('') === digits.slice().reverse().join('');
    var tienDan = false;
    for (var i = 0; i < digits.length - 2; i++) {
      if (digits[i + 1] - digits[i] === 1 && digits[i + 2] - digits[i + 1] === 1) { tienDan = true; break; }
    }
    var soDoiLapLai = [];
    for (var j = 0; j < digits.length - 1; j++) if (digits[j] === digits[j + 1]) soDoiLapLai.push(digits[j]);
    return {
      soLe: le, soChan: chan,
      tyLeLe: digits.length ? Math.round((le / digits.length) * 100) : 0,
      soChuDao: soChuDao, doiXung: doiXung, tienDan: tienDan, soDoiLapLai: soDoiLapLai,
    };
  }

  // ── T6. Kiêng kỵ dân gian — DÁN NHÃN RÕ, không phải cổ pháp ─────────────
  var DAN_GIAN_XAU = [
    { mau: '49', y: '"tứ cửu" — kiêng theo cách đọc dân gian ở một số vùng, KHÔNG phải cổ pháp Bát Trạch/Kinh Dịch.' },
    { mau: '53', y: '"ngũ tam" — kiêng theo cách đọc lái ở một số vùng miền.' },
    { mau: '4', y: 'số 4 đơn lẻ — âm Hán Việt gần "tử", kiêng phổ biến trong văn hoá kinh doanh gốc Hoa dù không thuộc cổ pháp gốc.' },
    { mau: '13', y: 'kiêng theo văn hoá phương Tây (Friday 13th) — không phải quan niệm gốc Á Đông.' },
  ];
  var DAN_GIAN_TOT = [
    { mau: '6', y: '"lộc" — được ưa chuộng, hay dùng làm số cuối.' },
    { mau: '8', y: '"phát" — số được ưa chuộng nhất trong văn hoá kinh doanh gốc Hoa.' },
    { mau: '9', y: '"trường cửu, bền vững".' },
    { mau: '68', y: '"lộc phát".' },
    { mau: '39', y: '"mãi phát" (theo cách đọc phổ biến của một bộ phận).' },
    { mau: '79', y: '"thất phát" — dân gian KHÔNG thống nhất: có nơi coi tốt, có nơi kiêng vì gần "thất" (mất). Nêu cả hai chiều, không chọn phe.' },
  ];
  function kiengKyDanGian(soSach) {
    var canhBao = [], diem = [];
    DAN_GIAN_XAU.forEach(function (d) { if (soSach.indexOf(d.mau) > -1) canhBao.push(d); });
    DAN_GIAN_TOT.forEach(function (d) { if (soSach.indexOf(d.mau) > -1) diem.push(d); });
    return { canhBao: canhBao, diem: diem };
  }

  // ── Đồng thuận — CHỈ gộp phiếu từ tầng có verdict cổ pháp rõ ràng (T1,
  // T2, T3-nếu-có-bản-mệnh). T5 (thuần số học) và T6 (dân gian) KHÔNG được
  // tính vào đây — đúng cam kết "không có điểm tổng giả khoa học". ─────────
  function tinhDongThuan(t1, t2, t3) {
    var phieu = [];
    if (t1.verdict) phieu.push({ nguon: 'Bát Tinh', verdict: t1.verdict });
    if (t2 && t2.ok && t2.verdict) phieu.push({ nguon: 'Quẻ Dịch', verdict: t2.verdict });
    if (t3.verdict) phieu.push({ nguon: 'Ngũ Hành (bản mệnh)', verdict: t3.verdict });
    var tot = phieu.filter(function (p) { return p.verdict === 'tot'; }).length;
    var xau = phieu.filter(function (p) { return p.verdict === 'xau'; }).length;
    return { phieu: phieu, tot: tot, xau: xau, trung: phieu.length - tot - xau, tongPhieu: phieu.length };
  }

  /**
   * Đánh giá đầy đủ một dãy số.
   * @param {string|number} soRaw dãy số nhập vào (có thể lẫn ký tự khác, sẽ lọc)
   * @param {{loai?:string, namSinh?:number, gioiTinh?:string}} opts
   *
   * ⚠️ `data` trả về LỒNG NHAU (t1.capSao là mảng object, t3.banMenh là
   * object…) — CỐ Ý, để trang render đủ chi tiết. Route/rail nào sau này gửi
   * kết quả này cho LLM (Luận Giải) phải tự XÂY một bản PHẲNG riêng trước khi
   * gọi rail — `extractGenericContext` (lib/agent/prompts.ts) bỏ IM LẶNG mọi
   * giá trị là object/mảng, đưa thẳng `data` vào là rail nhận thiếu mà không
   * ai báo. Xem `check:railfields`/`check:railwrap`.
   */
  function danhGia(soRaw, opts) {
    opts = opts || {};
    var soSach = chuanHoa(soRaw);
    if (!soSach) return { ok: false, error: 'Không tìm thấy chữ số hợp lệ trong chuỗi nhập.' };
    if (soSach.length > 20) return { ok: false, error: 'Dãy số quá dài — tối đa 20 chữ số.' };
    var digits = soSach.split('').map(Number);
    var t1 = tongHopT1(digits);
    var t2 = tinhQueDich(digits);
    var t3 = tinhNguHanh(digits, opts.namSinh, opts.gioiTinh);
    var t5 = tinhAmDuong(digits);
    var t6 = kiengKyDanGian(soSach);
    var dongThuan = tinhDongThuan(t1, t2, t3);
    return {
      ok: true,
      data: {
        soGoc: String(soRaw == null ? '' : soRaw),
        soSach: soSach,
        doDai: digits.length,
        loai: opts.loai || 'tu-do',
        t1: t1, t2: t2, t3: t3, t5: t5, t6: t6,
        dongThuan: dongThuan,
      },
    };
  }

  // ── Generator gợi ý số ───────────────────────────────────────────────────
  var MUC_TIEU_SAO = {
    'tai-loc': 'Sinh Khí',
    'suc-khoe': 'Thiên Y',
    'ben-vung': 'Diên Niên',
    'on-dinh': 'Phục Vị',
  };
  var CAT_SET_GEN = { 'Sinh Khí': 1, 'Thiên Y': 1, 'Diên Niên': 1, 'Phục Vị': 1 };
  var CUNGS_ALL = [1, 2, 3, 4, 6, 7, 8, 9];

  // PRNG seed từ chuỗi (FNV-1a) — KHÔNG dùng Math.random(), để cùng tham số
  // luôn ra cùng danh sách gợi ý (bấm lại không đổi, cache được).
  function _fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function _mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Đồ thị cạnh: a→b hợp lệ nếu starBetween(a,b) ra ĐÚNG sao mục tiêu (hoặc
  // BẤT KỲ sao cát nào, khi không chọn mục tiêu cụ thể — 'tu-do'). Tự bao
  // gồm cạnh a→a khi mục tiêu là Phục Vị, vì starBetween(a,a)='Phục Vị'.
  function _dungDoThi(target) {
    var BT = root.BatTrachTool;
    var adj = {};
    CUNGS_ALL.forEach(function (a) {
      adj[a] = [];
      CUNGS_ALL.forEach(function (b) {
        var s = BT.starBetween(a, b);
        var hop = target ? s === target : !!CAT_SET_GEN[s];
        if (hop) adj[a].push(b);
      });
    });
    return adj;
  }

  /**
   * Sinh danh sách số gợi ý theo độ dài + mục tiêu tuỳ chọn.
   * @param {{doDai:number, mucTieu?:string, namSinh?:number, gioiTinh?:string,
   *   tienTo?:string, loaiTru?:Array<number|string>, soLuong?:number}} opts
   *   mucTieu: 'tai-loc'|'suc-khoe'|'ben-vung'|'on-dinh'|'tu-do' (mặc định).
   */
  function goiY(opts) {
    opts = opts || {};
    var BT = root.BatTrachTool;
    if (!BT) return { ok: false, error: 'Chưa nạp được BatTrachTool.' };

    var doDai = Math.floor(Number(opts.doDai));
    if (!isFinite(doDai) || doDai < 4 || doDai > 20) {
      return { ok: false, error: 'Độ dài phải là số nguyên từ 4 đến 20.' };
    }
    var mucTieu = opts.mucTieu || 'tu-do';
    var targetSao = MUC_TIEU_SAO[mucTieu];
    if (mucTieu !== 'tu-do' && !targetSao) {
      return { ok: false, error: 'Mục tiêu không hợp lệ — chỉ nhận: tai-loc, suc-khoe, ben-vung, on-dinh, tu-do.' };
    }
    var tienTo = chuanHoa(opts.tienTo);
    if (tienTo.length >= doDai) {
      return { ok: false, error: 'Tiền tố (' + tienTo.length + ' số) phải NGẮN HƠN độ dài mong muốn (' + doDai + ').' };
    }
    var loaiTruSet = {};
    (opts.loaiTru || []).forEach(function (d) {
      var n = Number(d);
      if (n >= 0 && n <= 9) loaiTruSet[n] = true;
    });
    var soLuong = Math.max(1, Math.min(10, Math.floor(Number(opts.soLuong)) || 5));

    var CUNGS = CUNGS_ALL.filter(function (d) { return !loaiTruSet[d]; });
    if (!CUNGS.length) {
      return { ok: false, error: 'Đã loại trừ hết chữ số 1-9 (trừ 5) — không còn gì để sinh số.' };
    }
    var adj = _dungDoThi(targetSao);
    CUNGS.forEach(function (a) {
      adj[a] = (adj[a] || []).filter(function (b) { return !loaiTruSet[b]; });
    });
    var chen0 = !loaiTruSet[0];

    var seedStr = JSON.stringify({
      doDai: doDai, mucTieu: mucTieu, namSinh: opts.namSinh || null,
      gioiTinh: opts.gioiTinh || null, tienTo: tienTo, loaiTru: Object.keys(loaiTruSet).sort(),
    });
    var baseSeed = _fnv1a(seedStr);
    var tienToDigits = tienTo.split('').map(Number);
    var lanThu = Math.max(soLuong * 8, 40);
    var dedupe = {};
    var candidates = [];

    for (var attempt = 0; attempt < lanThu && candidates.length < soLuong * 4; attempt++) {
      var rng = _mulberry32((baseSeed + attempt * 2654435761) >>> 0);
      var out = tienToDigits.slice();
      var cur = tienToDigits.length ? tienToDigits[tienToDigits.length - 1] : null;
      if (cur === 0 || cur === 5 || loaiTruSet[cur]) cur = null;
      if (cur == null) { cur = CUNGS[Math.floor(rng() * CUNGS.length)]; out.push(cur); }
      var need = doDai - out.length;
      for (var k = 0; k < need; k++) {
        if (chen0 && k > 0 && k < need - 1 && rng() < 0.1) { out.push(0); continue; }
        var tuyChon = (adj[cur] && adj[cur].length) ? adj[cur] : CUNGS;
        var next = tuyChon[Math.floor(rng() * tuyChon.length)];
        out.push(next);
        cur = next;
      }
      var soSach = out.slice(0, doDai).join('');
      if (soSach.length !== doDai || dedupe[soSach]) continue;
      dedupe[soSach] = true;
      candidates.push(soSach);
    }
    if (!candidates.length) {
      return { ok: false, error: 'Không sinh được số nào — thử nới độ dài hoặc bớt loại trừ.' };
    }

    // Chấm lại bằng CHÍNH danhGia() — generator không tự bịa thang điểm riêng.
    var danhSach = candidates
      .map(function (soSach) {
        var r = danhGia(soSach, { namSinh: opts.namSinh, gioiTinh: opts.gioiTinh });
        return r.ok ? r.data : null;
      })
      .filter(Boolean);

    danhSach.sort(function (x, y) {
      if (y.dongThuan.tot !== x.dongThuan.tot) return y.dongThuan.tot - x.dongThuan.tot;
      if (x.dongThuan.xau !== y.dongThuan.xau) return x.dongThuan.xau - y.dongThuan.xau;
      var dx = x.t1.diem100 == null ? -1 : x.t1.diem100;
      var dy = y.t1.diem100 == null ? -1 : y.t1.diem100;
      if (dy !== dx) return dy - dx;
      return x.soSach < y.soSach ? -1 : x.soSach > y.soSach ? 1 : 0;
    });

    return {
      ok: true,
      data: {
        doDai: doDai, mucTieu: mucTieu, targetSao: targetSao || null, tienTo: tienTo,
        soLuongYeuCau: soLuong, soUngVienDaXet: candidates.length,
        danhSach: danhSach.slice(0, soLuong),
      },
    };
  }

  // ── Render HTML — TEMPLATE THUẦN, không LLM ─────────────────────────────
  // Toàn bộ văn bản giải thích đã có sẵn trong DATA của engine (STAR_DESC,
  // QUE[].g/m từ kinh-dich.js, DAN_GIAN_*) — hàm này chỉ LẮP vào khung, không
  // tự sinh câu chữ mới. Vì vậy tool chạy 100% client-side, 0 lượt gọi mạng,
  // 0đ — đúng yêu cầu "free cho tìm kiếm tự nhiên, không tốn API LLM".
  var DIR_TAG = { tot: 'sd-tot', xau: 'sd-xau', trung: 'sd-trung' };
  var DIR_LABEL = { tot: 'Tốt', xau: 'Xấu', trung: 'Trung bình' };

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function ketQuaHTML(data) {
    var d = data;
    var dt = d.dongThuan;
    var dtTag = dt.tongPhieu === 0 ? 'sd-trung' : dt.tot > dt.xau ? 'sd-tot' : dt.xau > dt.tot ? 'sd-xau' : 'sd-trung';
    var html = '';

    html += '<div class="sd-head">';
    html += '<div class="sd-so">' + _esc(d.soSach) + '</div>';
    html += '<div class="sd-dongthuan ' + dtTag + '">' + (dt.tongPhieu ? dt.tot + '/' + dt.tongPhieu + ' trường phái cổ pháp nói tốt' : 'Dãy quá ngắn để tính đồng thuận') + '</div>';
    html += '</div>';

    // T1 Bát Tinh
    html += '<div class="sd-section"><div class="sd-section-head">Bát Tinh <span class="sd-eyebrow">Bát Trạch</span></div>';
    if (d.t1.diem100 != null) {
      html += '<div class="sd-chuoi">';
      d.t1.capSao.forEach(function (c) {
        var cls = c.catHung === 'cat' ? 'sd-cap-cat' : c.catHung === 'hung' ? 'sd-cap-hung' : 'sd-cap-trung';
        var nhan = c.sao || (c.a === 0 || c.b === 0 ? '0' : '—');
        html += '<span class="sd-cap ' + cls + '" title="' + _esc(c.ghiChu || c.y || '') + '">' + c.a + c.b + '<b>' + _esc(nhan) + '</b></span>';
      });
      html += '</div>';
      html += '<div class="sd-diem">Điểm cát: <b>' + d.t1.diem100 + '/100</b>' + (d.t1.noiBat.length ? ' · Sao nổi bật: ' + _esc(d.t1.noiBat.slice(0, 2).join(', ')) : '') + '</div>';
      var topStar = d.t1.noiBat[0];
      if (topStar && STAR_DESC[topStar]) html += '<p class="sd-p">' + _esc(STAR_DESC[topStar].y) + '</p>';
    } else {
      html += '<p class="sd-p">Dãy chưa đủ cặp số hợp lệ để xét Bát Tinh (toàn số 0/5, hoặc quá ngắn).</p>';
    }
    html += '</div>';

    // T2 Quẻ Dịch
    html += '<div class="sd-section"><div class="sd-section-head">Quẻ Dịch <span class="sd-eyebrow">Mai Hoa Dịch Số</span></div>';
    if (d.t2.ok) {
      html += '<div class="sd-que-ten">' + _esc(d.t2.que.ten) + ' <span class="sd-zh">' + _esc(d.t2.que.zh) + '</span></div>';
      html += '<div class="sd-que-meta">' + _esc(d.t2.thuongQuai.n) + ' trên · ' + _esc(d.t2.haQuai.n) + ' dưới · hào ' + d.t2.haoDong + ' động</div>';
      html += '<p class="sd-p">' + _esc(d.t2.que.chiTiet || d.t2.que.y) + '</p>';
      html += '<div class="sd-p sd-quebien">Biến sang quẻ <b>' + _esc(d.t2.queBien.ten) + '</b> — ' + _esc(d.t2.queBien.y) + '</div>';
    } else {
      html += '<p class="sd-p">' + _esc(d.t2.error) + '</p>';
    }
    html += '</div>';

    // T3 Ngũ Hành
    html += '<div class="sd-section"><div class="sd-section-head">Ngũ Hành <span class="sd-eyebrow">Lạc Thư</span></div>';
    html += '<div class="sd-phanbo">';
    ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'].forEach(function (h) {
      html += '<span class="sd-hanh">' + h + ' <b>' + (d.t3.phanBo[h] || 0) + '</b></span>';
    });
    html += '</div>';
    if (d.t3.hanhThieu.length) html += '<div class="sd-p sd-thieu">Thiếu hành: ' + _esc(d.t3.hanhThieu.join(', ')) + '</div>';
    if (d.t3.banMenh) {
      var bm = d.t3.banMenh;
      html += '<p class="sd-p">Bản mệnh nạp âm <b>' + _esc(bm.napAm) + '</b> (hành ' + _esc(bm.hanhNapAm) + '), cung phi hành ' + _esc(bm.hanhCungPhi) + '. ' +
        (bm.hopMenh.length ? 'Dãy số có chứa hành hợp mệnh: ' + _esc(bm.hopMenh.join(', ')) + '.' : 'Dãy số CHƯA chứa hành hợp bản mệnh.') + '</p>';
    }
    html += '</div>';

    // T5 Âm Dương
    html += '<div class="sd-section"><div class="sd-section-head">Âm Dương <span class="sd-eyebrow">Số học — không phải cổ pháp</span></div>';
    var t5bits = [d.t5.soLe + ' số lẻ / ' + d.t5.soChan + ' số chẵn', 'số chủ đạo ' + d.t5.soChuDao];
    if (d.t5.doiXung) t5bits.push('dãy đối xứng (soi gương)');
    if (d.t5.tienDan) t5bits.push('có đoạn 3 số liên tiếp tăng dần');
    if (d.t5.soDoiLapLai.length) t5bits.push('số đôi lặp: ' + d.t5.soDoiLapLai.join(', '));
    html += '<p class="sd-p">' + _esc(t5bits.join(' · ')) + '</p></div>';

    // T6 Dân gian
    if (d.t6.diem.length || d.t6.canhBao.length) {
      html += '<div class="sd-section sd-dangian"><div class="sd-section-head">Theo dân gian <span class="sd-eyebrow">KHÔNG phải cổ pháp</span></div>';
      d.t6.diem.forEach(function (x) { html += '<div class="sd-p sd-dg-tot">+ "' + _esc(x.mau) + '" — ' + _esc(x.y) + '</div>'; });
      d.t6.canhBao.forEach(function (x) { html += '<div class="sd-p sd-dg-xau">△ "' + _esc(x.mau) + '" — ' + _esc(x.y) + '</div>'; });
      html += '</div>';
    }

    return html;
  }

  function goiYHTML(data) {
    var html = '<div class="sd-goiy-list">';
    data.danhSach.forEach(function (item) {
      var dt = item.dongThuan;
      var tag = dt.tongPhieu === 0 ? 'sd-trung' : dt.tot > dt.xau ? 'sd-tot' : dt.xau > dt.tot ? 'sd-xau' : 'sd-trung';
      html += '<div class="sd-goiy-item" data-so="' + _esc(item.soSach) + '" role="button" tabindex="0">';
      html += '<div class="sd-goiy-so">' + _esc(item.soSach) + '</div>';
      html += '<div class="sd-goiy-dt ' + tag + '">' + (dt.tongPhieu ? dt.tot + '/' + dt.tongPhieu + ' tốt' : '—') + '</div>';
      if (item.t1.noiBat.length) html += '<div class="sd-goiy-sao">' + _esc(item.t1.noiBat.slice(0, 2).join(', ')) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  var API = {
    danhGia: danhGia,
    goiY: goiY,
    ketQuaHTML: ketQuaHTML,
    goiYHTML: goiYHTML,
    STAR_DESC: STAR_DESC,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SoDepTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
