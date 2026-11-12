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

  // Chữ HIỂN THỊ qua I18n.tv + glossary (trang /<locale>/); vi / Node (check-so-dep) ⇒ chữ Việt nguyên.
  // `data` (gửi rail/server: sao, quẻ, hành…) GIỮ chữ Việt — chỉ `error` và `*HTML` đổi theo ngôn ngữ.
  function _tv(key, vi, vars) {
    var I = root.I18n;
    if (I && I.tv) return I.tv(key, vi, vars);
    return vars ? vi.replace(/\{(\w+)\}/g, function (x, n) { return vars[n] !== undefined ? vars[n] : x; }) : vi;
  }
  function _g(kind, v) {
    var g = root.TuviGlossary;
    return g && v ? g.t(kind, v) : v;
  }
  function _long(key, vi) {
    var I = root.I18n;
    return I && I.long ? I.long('kinh-dich', key, vi) : vi;
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
    if (digits.length < 2) return { ok: false, error: _tv('js.shellui.sd-err-lap-que', 'Cần tối thiểu 2 chữ số để lập quẻ.') };
    var MH = root.MaiHoaTool, KD = root.KinhDichTool;
    if (!MH || !KD) return { ok: false, error: _tv('js.shellui.sd-err-nap-que', 'Chưa nạp được MaiHoaTool/KinhDichTool.') };
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
      que: { so: idx + 1, ten: que.n, zh: que.zh, y: que.m, chiTiet: que.g, catHung: que.f },
      queBien: { so: idxBien + 1, ten: queBien.n, zh: queBien.zh, y: queBien.m },
      verdict: verdict,
      moTa: 'Nửa đầu (' + nuaDau.join('') + ') tổng ' + tongDau + ' chia 8 dư ' + thuongIdx + ' → thượng quái ' + quaiTren.n +
        '; nửa sau (' + nuaSau.join('') + ') tổng ' + tongSau + ' chia 8 dư ' + haIdx + ' → hạ quái ' + quaiDuoi.n +
        '; tổng cả dãy chia 6 dư ' + haoDong + ' → hào động.',
    };
  }

  // ── T3. Ngũ Hành — cùng bảng Lạc Thư với T1, cá nhân hoá nếu có năm sinh ─
  var HANH = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

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
      var hopMenh = [], hopMenhCT = [];
      if (hanhNapAm && phanBo[hanhNapAm] > 0) { hopMenh.push('nạp âm (' + hanhNapAm + ')'); hopMenhCT.push({ loai: 'napam', hanh: hanhNapAm }); }
      if (hanhCungPhi && hanhCungPhi !== hanhNapAm && phanBo[hanhCungPhi] > 0) { hopMenh.push('cung phi (' + hanhCungPhi + ')'); hopMenhCT.push({ loai: 'cungphi', hanh: hanhCungPhi }); }
      // ── Verdict: HÀNH TRỘI của dãy so sinh/khắc với hành nạp âm bản mệnh ──
      // 🔴 ĐÃ CẮN (2026-09): luật cũ là `hopMenh.length > 0 ? 'tot' : 'trung'`,
      // mà `hopMenh` chỉ cần dãy CHỨA MỘT chữ số thuộc hành nạp âm hoặc cung
      // phi — với 9-10 chữ số rải trên 5 hành thì gần như luôn đúng. Đo 500 số:
      // tốt 484 · trung 16 · XẤU 0 — nhánh 'xau' không tồn tại trong biểu thức.
      // T3 chiếm 1/3 phiếu đồng thuận (dòng chữ to nhất màn hình) nên tool bị
      // kê thêm một phiếu "tốt" gần như miễn phí: `0/3 nói tốt` chỉ ra 4/500 lần.
      // `0888888888` (thiếu 4/5 hành) vẫn hiện "3/3 trường phái cổ pháp nói tốt".
      //
      // Luật mới xét TỈ TRỌNG chứ không xét SỰ CÓ MẶT: hành nào chiếm nhiều chữ
      // số nhất mới là hành dãy này mang, rồi so nó với bản mệnh. Hoà (từ 2 hành
      // cùng đỉnh) ⇒ 'trung' — không có hành nào trội thì không kết luận, chứ
      // KHÔNG bốc đại một hành. Đo lại trên cùng 500 số: tốt 151 · trung 279 ·
      // xấu 70; đồng thuận `3/3` rơi 14,4% → 4,4%, `0/3` lên 0,8% → 25,8%.
      // Quan hệ sinh/khắc lấy từ `NapAmTool.ungDung()` — bảng DUY NHẤT trong
      // repo, không chép thêm bản thứ hai.
      var ud = hanhNapAm ? NA.ungDung(hanhNapAm) : null;
      var dinh = Math.max.apply(null, HANH.map(function (h) { return phanBo[h] || 0; }));
      var troi = dinh > 0 ? HANH.filter(function (h) { return (phanBo[h] || 0) === dinh; }) : [];
      var hanhTroi = troi.length === 1 ? troi[0] : null;
      var quanHe = null;
      if (hanhTroi && ud) {
        if (hanhTroi === ud.hanhKy) quanHe = 'khac-menh';
        else if (hanhTroi === hanhNapAm) quanHe = 'dong-hanh';
        else if (hanhTroi === ud.hanhMe) quanHe = 'sinh-menh';
        else quanHe = 'trung';
      }
      out.banMenh = {
        napAm: napAm.ok ? napAm.data.napAm : null, hanhNapAm: hanhNapAm,
        cungPhi: cung, hanhCungPhi: hanhCungPhi,
        hopMenh: hopMenh, hopMenhCT: hopMenhCT,
        hanhTroi: hanhTroi, quanHeTroi: quanHe,
      };
      out.verdict = quanHe === 'khac-menh' ? 'xau'
        : quanHe === 'dong-hanh' || quanHe === 'sinh-menh' ? 'tot'
        : 'trung';
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
    if (!soSach) return { ok: false, error: _tv('js.shellui.sd-err-khong-co-so', 'Không tìm thấy chữ số hợp lệ trong chuỗi nhập.') };
    if (soSach.length > 20) return { ok: false, error: _tv('js.shellui.sd-err-qua-dai', 'Dãy số quá dài — tối đa 20 chữ số.') };
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
    if (!BT) return { ok: false, error: _tv('js.shellui.sd-err-nap-bt', 'Chưa nạp được BatTrachTool.') };

    var doDai = Math.floor(Number(opts.doDai));
    if (!isFinite(doDai) || doDai < 4 || doDai > 20) {
      return { ok: false, error: _tv('js.shellui.sd-err-do-dai', 'Độ dài phải là số nguyên từ 4 đến 20.') };
    }
    var mucTieu = opts.mucTieu || 'tu-do';
    var targetSao = MUC_TIEU_SAO[mucTieu];
    if (mucTieu !== 'tu-do' && !targetSao) {
      return { ok: false, error: _tv('js.shellui.sd-err-muc-tieu', 'Mục tiêu không hợp lệ — chỉ nhận: tai-loc, suc-khoe, ben-vung, on-dinh, tu-do.') };
    }
    var tienTo = chuanHoa(opts.tienTo);
    if (tienTo.length >= doDai) {
      return { ok: false, error: _tv('js.shellui.sd-err-tien-to', 'Tiền tố ({n} số) phải NGẮN HƠN độ dài mong muốn ({d}).', { n: tienTo.length, d: doDai }) };
    }
    var loaiTruSet = {};
    (opts.loaiTru || []).forEach(function (d) {
      var n = Number(d);
      if (n >= 0 && n <= 9) loaiTruSet[n] = true;
    });
    var soLuong = Math.max(1, Math.min(10, Math.floor(Number(opts.soLuong)) || 5));

    var CUNGS = CUNGS_ALL.filter(function (d) { return !loaiTruSet[d]; });
    if (!CUNGS.length) {
      return { ok: false, error: _tv('js.shellui.sd-err-loai-het', 'Đã loại trừ hết chữ số 1-9 (trừ 5) — không còn gì để sinh số.') };
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
      return { ok: false, error: _tv('js.shellui.sd-err-khong-sinh', 'Không sinh được số nào — thử nới độ dài hoặc bớt loại trừ.') };
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
  // ── Chữ giải thích tra theo KHOÁ TĨNH (check:i18n quét được; khoá ghép động bị i18n:prune xoá nhầm).
  // Gốc Việt luôn lấy từ bảng nguồn (STAR_DESC / DAN_GIAN_*) — không chép câu Việt lần hai.
  function _starY(sao) {
    var m = STAR_DESC[sao], vi = m ? m.y : '';
    switch (sao) {
      case 'Sinh Khí': return _tv('js.shellui.sd-sy-sinh-khi', vi);
      case 'Thiên Y': return _tv('js.shellui.sd-sy-thien-y', vi);
      case 'Diên Niên': return _tv('js.shellui.sd-sy-dien-nien', vi);
      case 'Phục Vị': return _tv('js.shellui.sd-sy-phuc-vi', vi);
      case 'Họa Hại': return _tv('js.shellui.sd-sy-hoa-hai', vi);
      case 'Lục Sát': return _tv('js.shellui.sd-sy-luc-sat', vi);
      case 'Ngũ Quỷ': return _tv('js.shellui.sd-sy-ngu-quy', vi);
      case 'Tuyệt Mệnh': return _tv('js.shellui.sd-sy-tuyet-menh', vi);
    }
    return vi;
  }
  function _dgY(x) {
    switch (x.mau) {
      case '49': return _tv('js.shellui.sd-dg-49', x.y);
      case '53': return _tv('js.shellui.sd-dg-53', x.y);
      case '4': return _tv('js.shellui.sd-dg-4', x.y);
      case '13': return _tv('js.shellui.sd-dg-13', x.y);
      case '6': return _tv('js.shellui.sd-dg-6', x.y);
      case '8': return _tv('js.shellui.sd-dg-8', x.y);
      case '9': return _tv('js.shellui.sd-dg-9', x.y);
      case '68': return _tv('js.shellui.sd-dg-68', x.y);
      case '39': return _tv('js.shellui.sd-dg-39', x.y);
      case '79': return _tv('js.shellui.sd-dg-79', x.y);
    }
    return x.y;
  }
  // Ghi chú ô cặp số (thuộc tính title) — `ghiChu` trong data giữ chữ Việt.
  function _ghiT(c) {
    if (c.sao) return _starY(c.sao);
    switch (c.ghiChu) {
      case 'Có số 0 — khuếch đại cặp trước, không tự thành sao': return _tv('js.shellui.sd-gc-so-0', c.ghiChu);
      case 'Trung cung (5) — trung tính, cắt mạch, không tính cát/hung': return _tv('js.shellui.sd-gc-trung-cung', c.ghiChu);
      case 'Chưa nạp được BatTrachTool': return _tv('js.shellui.sd-gc-chua-nap', c.ghiChu);
    }
    return c.ghiChu || c.y || '';
  }
  function _saoList(arr) { return arr.map(function (x) { return _g('battrach', x); }).join(', '); }
  function _hanhList(arr) { return arr.map(function (x) { return _g('hanh', x); }).join(', '); }
  function _dongThuanT(dt) {
    return dt.tongPhieu ? _tv('js.shellui.sd-dt-tot', '{t}/{n} trường phái cổ pháp nói tốt', { t: dt.tot, n: dt.tongPhieu })
      : _tv('js.shellui.sd-dt-ngan', 'Dãy quá ngắn để tính đồng thuận');
  }

  var DIR_TAG = { tot: 'sd-tot', xau: 'sd-xau', trung: 'sd-trung' };

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ── Vành ngũ hành — CHỈ vẽ khi trang có nạp `tools-shared/hook-charts.js`.
  // `/tools/so-dep.html` dùng `tools.css` (thiếu --line-2/--sans/--gold-soft),
  // nên CỐ Ý không nạp bên đó: biến CSS hụt thì `stroke:var(--line-2)` rơi về
  // `none` và nhãn rớt về font mặc định — hỏng IM LẶNG, không lỗi nào bắn ra.
  //
  // ⚠️ Thang chuẩn hoá theo CHÍNH dãy này (max = hành nhiều chữ số nhất), KHÔNG
  // theo độ dài dãy. Đây là dữ liệu THÀNH PHẦN: 9 chữ số chia cho 5 hành nên
  // hành trội thường chỉ 3 (đo 500 dãy: p10=2 · median=3 · p90=5 · max=7). Lấy
  // độ dài làm trần thì dãy nào cũng co lại còn ~1/3 vành, hết đọc được hình.
  // Chuẩn hoá theo dãy làm nổi đúng câu hỏi của tầng này — "dãy nghiêng hành
  // nào, hụt hành nào" — còn CON SỐ chính xác vẫn nằm nguyên ở hàng chữ ngay
  // dưới. Hình chở DÁNG, chữ chở SỐ; không nơi nào phải đoán nơi kia.
  function _vanhNguHanhHTML(t3) {
    if (typeof root.HookCharts === 'undefined') return '';
    var hs = HANH;
    var v = hs.map(function (h) { return t3.phanBo[h] || 0; });
    var dinh = Math.max.apply(null, v);
    if (!dinh) return '';
    var svg = root.HookCharts.hexRadar({
      dims: hs.map(function (h, i) { return { label: _g('hanh', h), value: v[i] }; }),
      max: dinh, size: 220, ariaLabel: _tv('js.shellui.sd-vanh-aria', 'Vành ngũ hành của dãy số'),
    });
    return svg ? '<div class="sd-vanh">' + svg + '</div>' : '';
  }

  function ketQuaHTML(data) {
    var d = data;
    var dt = d.dongThuan;
    var dtTag = dt.tongPhieu === 0 ? 'sd-trung' : dt.tot > dt.xau ? 'sd-tot' : dt.xau > dt.tot ? 'sd-xau' : 'sd-trung';
    var html = '';

    html += '<div class="sd-head">';
    html += '<div class="sd-so">' + _esc(d.soSach) + '</div>';
    html += '<div class="sd-dongthuan ' + dtTag + '">' + _esc(_dongThuanT(dt)) + '</div>';
    html += '</div>';

    // T1 Bát Tinh
    html += '<div class="sd-section"><div class="sd-section-head">' + _tv('js.shellui.sd-h-bat-tinh', 'Bát Tinh') + ' <span class="sd-eyebrow">' + _tv('js.shellui.sd-e-bat-trach', 'Bát Trạch') + '</span></div>';
    if (d.t1.diem100 != null) {
      html += '<div class="sd-chuoi">';
      d.t1.capSao.forEach(function (c) {
        var cls = c.catHung === 'cat' ? 'sd-cap-cat' : c.catHung === 'hung' ? 'sd-cap-hung' : 'sd-cap-trung';
        var nhan = c.sao ? _g('battrach', c.sao) : (c.a === 0 || c.b === 0 ? '0' : '—');
        html += '<span class="sd-cap ' + cls + '" title="' + _esc(_ghiT(c)) + '">' + c.a + c.b + '<b>' + _esc(nhan) + '</b></span>';
      });
      html += '</div>';
      html += '<div class="sd-diem">' + (d.t1.noiBat.length
        ? _tv('js.shellui.sd-diem-noibat', 'Điểm cát: <b>{d}/100</b> · Sao nổi bật: {s}', { d: d.t1.diem100, s: _esc(_saoList(d.t1.noiBat.slice(0, 2))) })
        : _tv('js.shellui.sd-diem', 'Điểm cát: <b>{d}/100</b>', { d: d.t1.diem100 })) + '</div>';
      var topStar = d.t1.noiBat[0];
      if (topStar && STAR_DESC[topStar]) html += '<p class="sd-p">' + _esc(_starY(topStar)) + '</p>';
    } else {
      html += '<p class="sd-p">' + _tv('js.shellui.sd-t1-thieu', 'Dãy chưa đủ cặp số hợp lệ để xét Bát Tinh (toàn số 0/5, hoặc quá ngắn).') + '</p>';
    }
    html += '</div>';

    // T2 Quẻ Dịch
    html += '<div class="sd-section"><div class="sd-section-head">' + _tv('js.shellui.sd-h-que-dich', 'Quẻ Dịch') + ' <span class="sd-eyebrow">' + _tv('js.shellui.sd-e-mai-hoa', 'Mai Hoa Dịch Số') + '</span></div>';
    if (d.t2.ok) {
      html += '<div class="sd-que-ten">' + _esc(_g('que', d.t2.que.ten)) + ' <span class="sd-zh">' + _esc(d.t2.que.zh) + '</span></div>';
      html += '<div class="sd-que-meta">' + _tv('js.shellui.sd-que-meta', '{t} trên · {h} dưới · hào {n} động', { t: _esc(_g('quai', d.t2.thuongQuai.n)), h: _esc(_g('quai', d.t2.haQuai.n)), n: d.t2.haoDong }) + '</div>';
      html += '<p class="sd-p">' + _esc(d.t2.que.chiTiet ? _long('que.' + d.t2.que.so + '.g', d.t2.que.chiTiet) : _long('que.' + d.t2.que.so + '.m', d.t2.que.y)) + '</p>';
      html += '<div class="sd-p sd-quebien">' + _tv('js.shellui.sd-que-bien', 'Biến sang quẻ <b>{q}</b> — {y}', { q: _esc(_g('que', d.t2.queBien.ten)), y: _esc(_long('que.' + d.t2.queBien.so + '.m', d.t2.queBien.y)) }) + '</div>';
    } else {
      html += '<p class="sd-p">' + _esc(d.t2.error) + '</p>';
    }
    html += '</div>';

    // T3 Ngũ Hành
    html += '<div class="sd-section"><div class="sd-section-head">' + _tv('js.shellui.sd-h-ngu-hanh', 'Ngũ Hành') + ' <span class="sd-eyebrow">' + _tv('js.shellui.sd-e-lac-thu', 'Lạc Thư') + '</span></div>';
    html += _vanhNguHanhHTML(d.t3);
    html += '<div class="sd-phanbo">';
    HANH.forEach(function (h) {
      html += '<span class="sd-hanh">' + _esc(_g('hanh', h)) + ' <b>' + (d.t3.phanBo[h] || 0) + '</b></span>';
    });
    html += '</div>';
    if (d.t3.hanhThieu.length) html += '<div class="sd-p sd-thieu">' + _tv('js.shellui.sd-thieu-hanh', 'Thiếu hành: {h}', { h: _esc(_hanhList(d.t3.hanhThieu)) }) + '</div>';
    if (d.t3.banMenh) {
      var bm = d.t3.banMenh;
      var hopT = (bm.hopMenhCT || []).map(function (x) {
        return x.loai === 'napam' ? _tv('js.shellui.sd-hop-napam', 'nạp âm ({h})', { h: _g('hanh', x.hanh) }) : _tv('js.shellui.sd-hop-cungphi', 'cung phi ({h})', { h: _g('hanh', x.hanh) });
      });
      html += '<p class="sd-p">' + _tv('js.shellui.sd-ban-menh', 'Bản mệnh nạp âm <b>{na}</b> (hành {hn}), cung phi hành {hc}.', { na: _esc(_g('napam', bm.napAm)), hn: _esc(_g('hanh', bm.hanhNapAm)), hc: _esc(_g('hanh', bm.hanhCungPhi)) }) + ' ' +
        (bm.hopMenh.length ? _tv('js.shellui.sd-hop-co', 'Trong dãy có mặt hành hợp mệnh: {l}.', { l: _esc(hopT.join(', ')) }) : _tv('js.shellui.sd-hop-khong', 'Trong dãy KHÔNG có mặt hành hợp bản mệnh.')) + '</p>';
      // Nói RA vì sao tầng này bỏ phiếu như vậy. Phiếu tính theo HÀNH TRỘI (xem
      // `tinhNguHanh`), không theo câu "có chứa hành hợp mệnh" ngay trên — hai
      // câu đứng cạnh nhau mà không nói rõ thì người đọc tưởng câu trên là lý do.
      var QH = {
        'khac-menh': [_tv('js.shellui.sd-qh-khac', 'khắc bản mệnh'), 'sd-dg-xau'],
        'dong-hanh': [_tv('js.shellui.sd-qh-dong', 'đồng hành với bản mệnh'), 'sd-dg-tot'],
        'sinh-menh': [_tv('js.shellui.sd-qh-sinh', 'sinh bản mệnh'), 'sd-dg-tot'],
        trung: [_tv('js.shellui.sd-qh-trung', 'không sinh cũng không khắc bản mệnh'), ''],
      };
      if (bm.hanhTroi && QH[bm.quanHeTroi]) {
        html += '<div class="sd-p ' + QH[bm.quanHeTroi][1] + '">' + _tv('js.shellui.sd-troi', 'Hành trội của dãy là <b>{h}</b> — {qh} ({na}). Phiếu của tầng này tính theo hành trội.', { h: _esc(_g('hanh', bm.hanhTroi)), qh: _esc(QH[bm.quanHeTroi][0]), na: _esc(_g('hanh', bm.hanhNapAm)) }) + '</div>';
      } else if (bm.hanhNapAm) {
        html += '<div class="sd-p">' + _tv('js.shellui.sd-khong-troi', 'Không hành nào trội hẳn trong dãy — tầng này không kết luận.') + '</div>';
      }
    }
    html += '</div>';

    // T5 Âm Dương
    html += '<div class="sd-section"><div class="sd-section-head">' + _tv('js.shellui.sd-h-am-duong', 'Âm Dương') + ' <span class="sd-eyebrow">' + _tv('js.shellui.sd-e-so-hoc', 'Số học — không phải cổ pháp') + '</span></div>';
    var t5bits = [_tv('js.shellui.sd-le-chan', '{l} số lẻ / {c} số chẵn', { l: d.t5.soLe, c: d.t5.soChan }), _tv('js.shellui.sd-chu-dao', 'số chủ đạo {n}', { n: d.t5.soChuDao })];
    if (d.t5.doiXung) t5bits.push(_tv('js.shellui.sd-doi-xung', 'dãy đối xứng (soi gương)'));
    if (d.t5.tienDan) t5bits.push(_tv('js.shellui.sd-tien-dan', 'có đoạn 3 số liên tiếp tăng dần'));
    if (d.t5.soDoiLapLai.length) t5bits.push(_tv('js.shellui.sd-doi-lap', 'số đôi lặp: {l}', { l: d.t5.soDoiLapLai.join(', ') }));
    html += '<p class="sd-p">' + _esc(t5bits.join(' · ')) + '</p></div>';

    // T6 Dân gian
    if (d.t6.diem.length || d.t6.canhBao.length) {
      html += '<div class="sd-section sd-dangian"><div class="sd-section-head">' + _tv('js.shellui.sd-h-dan-gian', 'Theo dân gian') + ' <span class="sd-eyebrow">' + _tv('js.shellui.sd-e-khong-phai', 'KHÔNG phải cổ pháp') + '</span></div>';
      d.t6.diem.forEach(function (x) { html += '<div class="sd-p sd-dg-tot">+ "' + _esc(x.mau) + '" — ' + _esc(_dgY(x)) + '</div>'; });
      d.t6.canhBao.forEach(function (x) { html += '<div class="sd-p sd-dg-xau">△ "' + _esc(x.mau) + '" — ' + _esc(_dgY(x)) + '</div>'; });
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
      html += '<div class="sd-goiy-dt ' + tag + '">' + (dt.tongPhieu ? _esc(_tv('js.shellui.sd-goiy-tot', '{t}/{n} tốt', { t: dt.tot, n: dt.tongPhieu })) : '—') + '</div>';
      if (item.t1.noiBat.length) html += '<div class="sd-goiy-sao">' + _esc(_saoList(item.t1.noiBat.slice(0, 2))) + '</div>';
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
