/* tools-shared/so-dep.js — Module DÙNG CHUNG tool "Số Đẹp" (đánh giá SĐT/số
   nhà/biển số theo cổ pháp — Bát Trạch, Mai Hoa Dịch Số, Ngũ Hành, Âm Dương).
   Nguồn DUY NHẤT cho /tools/so-dep.html + shell /app/so-dep.
   window.SoDepTool = { danhGia, STAR_DESC, DIGIT_NOTE }

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

  var API = {
    danhGia: danhGia,
    STAR_DESC: STAR_DESC,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SoDepTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
