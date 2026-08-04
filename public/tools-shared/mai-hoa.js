/* ============================================================
   tools-shared/mai-hoa.js — MAI HOA DỊCH SỐ (梅花易數).
   Nguồn DUY NHẤT: dùng chung /tools/mai-hoa.html VÀ shell /app/mai-hoa.

   ⚠️ ĐỌC TRƯỚC KHI SỬA — vì sao tool này TỒN TẠI RIÊNG khỏi /tools/kinh-dich:
   Kinh Dịch gieo bằng ba đồng tiền, sáu lượt, mỗi hào có thể động → đọc theo
   Khảo Biến Chiêm. Mai Hoa gieo bằng SỐ hoặc THỜI ĐIỂM, ra ĐÚNG MỘT hào động,
   và cách luận hoàn toàn khác: không đọc hào từ làm chính, mà xét QUAN HỆ NGŨ
   HÀNH giữa quẻ Thể và quẻ Dụng qua ba chặng chính → hỗ → biến. Nhét vào cùng
   một trang là trộn hai phép đọc mâu thuẫn nhau.

   Nó cũng là tool DUY NHẤT của site không đòi ngày sinh: nhập một con số bất
   kỳ, hoặc bấm gieo theo giờ này. Mọi tool khác đều chặn người dùng ở form
   ngày sinh — chỗ rơi rụng lớn nhất.

   TÁI DÙNG, KHÔNG CHÉP: bảng 64 quẻ + tra quẻ (`kinh-dich.js`), 384 hào từ
   (`kinh-dich-hao.js`), và cả 64 bức tranh quẻ (`KinhDichTool.anhUrl`).
   Thiếu module nào thì hàm tương ứng trả rỗng chứ không ném.

   Deterministic, 0 lượt mạng, 0đ. Cần `convertDuongToAm` (global từ
   tuvi-ansao-engine.js) CHỈ cho nhánh gieo theo giờ.

   API: window.MaiHoaTool = {
     BAT_QUAI, gieoTheoGio, gieoTheoSo, resolve,
     cardHTML, chungHTML, loadAnh, posterDraw, railData
   }
   ============================================================ */
(function (root) {
  'use strict';

  // ── Bát quái, theo SỐ TIÊN THIÊN (Phục Hy): Càn1 Đoài2 Ly3 Chấn4 Tốn5 Khảm6
  // Cấn7 Khôn8. Chính thứ tự này là thứ dùng để chia dư cho 8 khi gieo.
  // `li` = 3 hào, ký tự 0 là hào DƯỚI cùng — khớp quy ước `li` 6 hào của
  // `kinh-dich.js` (đã đối chiếu: Khuê 110101 = dưới Đoài 110 + trên Ly 101).
  var BAT_QUAI = [
    { so: 1, n: 'Càn', zh: '乾', li: '111', hanh: 'Kim', tuong: 'Trời', nghia: 'cương kiện, chủ động, người trên' },
    { so: 2, n: 'Đoài', zh: '兌', li: '110', hanh: 'Kim', tuong: 'Đầm', nghia: 'vui vẻ, lời nói, thiếu nữ' },
    { so: 3, n: 'Ly', zh: '離', li: '101', hanh: 'Hỏa', tuong: 'Lửa', nghia: 'sáng tỏ, phô bày, văn thư' },
    { so: 4, n: 'Chấn', zh: '震', li: '100', hanh: 'Mộc', tuong: 'Sấm', nghia: 'chấn động, khởi sự, người con trưởng' },
    { so: 5, n: 'Tốn', zh: '巽', li: '011', hanh: 'Mộc', tuong: 'Gió', nghia: 'thuận theo, len lỏi, đi lại' },
    { so: 6, n: 'Khảm', zh: '坎', li: '010', hanh: 'Thủy', tuong: 'Nước', nghia: 'hiểm trở, trôi nổi, lo lắng' },
    { so: 7, n: 'Cấn', zh: '艮', li: '001', hanh: 'Thổ', tuong: 'Núi', nghia: 'dừng lại, ngăn trở, nhà cửa' },
    { so: 8, n: 'Khôn', zh: '坤', li: '000', hanh: 'Thổ', tuong: 'Đất', nghia: 'nhu thuận, chứa đựng, quần chúng' },
  ];

  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

  // ── Ngũ hành ────────────────────────────────────────────────────────────
  var SINH = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
  var KHAC = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };
  var HANH_MAU = { Kim: '#C9A84C', Mộc: '#4E9A6A', Thủy: '#3E7CB1', Hỏa: '#C0553F', Thổ: '#A98352' };

  /**
   * Quan hệ Thể–Dụng. Đây là TOÀN BỘ phép luận của Mai Hoa, nên năm nhánh dưới
   * đây phải đủ và không chồng nhau.
   *
   * Quy ước: quẻ Thể là MÌNH / việc mình hỏi; quẻ Dụng là NGOẠI CẢNH / cái
   * việc ấy gặp phải. Vì thế "Dụng sinh Thể" mới là tốt nhất (ngoài cảnh nuôi
   * mình), còn "Thể sinh Dụng" là hao (mình nuôi ngoài cảnh) — người mới học
   * hay đảo ngược đúng chỗ này.
   */
  function quanHe(theHanh, dungHanh) {
    if (theHanh === dungHanh) {
      return {
        ma: 'tihoa',
        ten: 'Tỉ hòa',
        muc: 'cat',
        diem: 4,
        tomTat: 'Thể và Dụng cùng một hành — đồng lòng, thuận.',
        luan: 'Mình và hoàn cảnh cùng một khí: việc hợp sức thì trôi, không ai cản ai. Không có lực đẩy mạnh, nhưng cũng không có lực cản.',
      };
    }
    if (SINH[dungHanh] === theHanh) {
      return {
        ma: 'dung-sinh-the',
        ten: 'Dụng sinh Thể',
        muc: 'daicat',
        diem: 5,
        tomTat: 'Ngoại cảnh nuôi mình — quẻ tốt nhất.',
        luan: 'Cái mình hỏi tới đang mang lợi về cho mình: có người giúp, có nguồn lực tới, không phải giành. Cứ nhận và tiến.',
      };
    }
    if (SINH[theHanh] === dungHanh) {
      return {
        ma: 'the-sinh-dung',
        ten: 'Thể sinh Dụng',
        muc: 'tieuhung',
        diem: 2,
        tomTat: 'Mình nuôi ngoại cảnh — hao tổn.',
        luan: 'Sức mình chảy ra ngoài: bỏ công, bỏ của, bỏ tâm sức cho việc ấy mà phần nhận lại mỏng. Làm được, nhưng phải biết mình đang trả giá gì.',
      };
    }
    if (KHAC[theHanh] === dungHanh) {
      return {
        ma: 'the-khac-dung',
        ten: 'Thể khắc Dụng',
        muc: 'tieucat',
        diem: 3,
        tomTat: 'Mình chế ngự được việc — thắng nhưng tốn sức.',
        luan: 'Mình đè được hoàn cảnh, việc rồi sẽ theo ý mình. Nhưng khắc là phải dùng lực — thắng mà mệt, và thắng chậm.',
      };
    }
    return {
      ma: 'dung-khac-the',
      ten: 'Dụng khắc Thể',
      muc: 'daihung',
      diem: 1,
      tomTat: 'Ngoại cảnh lấn mình — quẻ xấu nhất.',
      luan: 'Việc ấy đang mạnh hơn mình: cố đẩy là chịu tổn thất. Lùi một bước, đổi cách, hoặc mượn tay người khác — đừng đối đầu trực diện.',
    };
  }

  var MUC_NHAN = {
    daicat: { nhan: 'Đại cát', mau: '#2F7D52' },
    cat: { nhan: 'Cát', mau: '#4E9A6A' },
    tieucat: { nhan: 'Tiểu cát', mau: '#8A8F3A' },
    tieuhung: { nhan: 'Tiểu hung', mau: '#B07A2E' },
    daihung: { nhan: 'Đại hung', mau: '#A33B2A' },
  };

  // ── Gieo quẻ ────────────────────────────────────────────────────────────
  // Dư 0 quy về 8 (Khôn) với quái và về 6 (hào trên cùng) với hào động — đó là
  // cách cổ pháp xử số chia hết, KHÔNG phải quy về 1.
  function _mod(n, m) {
    var r = ((n % m) + m) % m;
    return r === 0 ? m : r;
  }
  function _quaiTheoSo(so) {
    return BAT_QUAI[_mod(so, 8) - 1];
  }

  /**
   * Gieo theo THỜI ĐIỂM (時間起卦).
   *   thượng quái = (số chi năm + tháng ÂL + ngày ÂL) chia 8 lấy dư
   *   hạ quái     = (số chi năm + tháng ÂL + ngày ÂL + số chi giờ) chia 8 lấy dư
   *   hào động    = cùng tổng ấy chia 6 lấy dư
   * Tháng/ngày dùng ÂM LỊCH, không phải dương lịch.
   */
  function gieoTheoGio(d) {
    var date = d || new Date();
    if (typeof root.convertDuongToAm !== 'function') {
      return { ok: false, error: 'Chưa nạp được lịch âm (tuvi-ansao-engine.js).' };
    }
    var conv;
    try {
      conv = root.convertDuongToAm(date.getDate(), date.getMonth() + 1, date.getFullYear(), date.getHours());
    } catch (e) {
      return { ok: false, error: 'Không đổi được ngày dương sang âm lịch.' };
    }
    var chiNamIdx = CHI.indexOf(conv.chiNam) + 1; // Tý=1 … Hợi=12
    var thang = conv.amLich.month;
    var ngay = conv.amLich.day;
    var chiGioIdx = conv.gioIdx + 1;
    var tongTren = chiNamIdx + thang + ngay;
    var tongDuoi = tongTren + chiGioIdx;
    return {
      ok: true,
      cach: 'gio',
      tren: _mod(tongTren, 8),
      duoi: _mod(tongDuoi, 8),
      dong: _mod(tongDuoi, 6),
      calc: {
        chiNam: conv.chiNam,
        chiNamIdx: chiNamIdx,
        thangAL: thang,
        ngayAL: ngay,
        gioChi: conv.gioChi,
        chiGioIdx: chiGioIdx,
        tongTren: tongTren,
        tongDuoi: tongDuoi,
        // Nêu ĐỦ bước chia, không chỉ tổng: người đọc phải tính lại tay được thì
        // mới tin, mà nhánh gieo theo số đã nêu rồi — hai nhánh nói khác nhau
        // thì trang tự mâu thuẫn.
        moTa:
          'Chi năm ' + conv.chiNam + ' (' + chiNamIdx + ') + tháng ' + thang + ' + ngày ' + ngay +
          ' = ' + tongTren + ', chia 8 dư ' + _mod(tongTren, 8) + ' → thượng quái; cộng giờ ' +
          conv.gioChi + ' (' + chiGioIdx + ') = ' + tongDuoi + ', chia 8 dư ' + _mod(tongDuoi, 8) +
          ' → hạ quái, chia 6 dư ' + _mod(tongDuoi, 6) + ' → hào động.',
      },
    };
  }

  /**
   * Gieo theo SỐ (數字起卦).
   *   thượng quái = số chia 8 lấy dư
   *   hạ quái     = (số + số chi giờ) chia 8 lấy dư
   *   hào động    = (số + số chi giờ) chia 6 lấy dư
   * Giờ vẫn tham gia — đó là điều khiến cùng một con số gieo sáng và gieo tối
   * ra hai quẻ khác nhau, đúng tinh thần "gieo theo cơ".
   */
  function gieoTheoSo(so, d) {
    // KHÔNG dùng Math.abs: nhận -5 rồi lặng lẽ gieo như 5 là tự diễn giải lại
    // input của người dùng, mà thông báo lỗi thì đang hứa "số nguyên dương".
    // Thà từ chối rõ ràng còn hơn trả về một quẻ họ không hề gieo.
    var n = Math.floor(Number(so));
    if (!isFinite(n) || n <= 0) return { ok: false, error: 'Hãy nhập một số nguyên dương.' };
    if (n > 1e12) return { ok: false, error: 'Số quá lớn — hãy dùng số dưới 12 chữ số.' };
    var date = d || new Date();
    var chiGioIdx = Math.floor(((date.getHours() + 1) % 24) / 2) + 1; // Tý=1 (23–01h)
    var gioChi = CHI[chiGioIdx - 1];
    var tong = n + chiGioIdx;
    return {
      ok: true,
      cach: 'so',
      tren: _mod(n, 8),
      duoi: _mod(tong, 8),
      dong: _mod(tong, 6),
      calc: {
        so: n,
        gioChi: gioChi,
        chiGioIdx: chiGioIdx,
        tongDuoi: tong,
        moTa:
          'Số ' + n + ' chia 8 dư ' + _mod(n, 8) + ' → thượng quái; ' + n + ' + giờ ' + gioChi +
          ' (' + chiGioIdx + ') = ' + tong + ' → hạ quái và hào động.',
      },
    };
  }

  // ── Dựng quẻ đầy đủ từ kết quả gieo ─────────────────────────────────────
  function _que(li6) {
    var KD = root.KinhDichTool;
    if (!KD) return null;
    var idx = KD.findHexagram(li6);
    var q = KD.QUE[idx];
    return q ? { idx: idx, kw: idx + 1, q: q } : null;
  }

  /**
   * @param {{tren:number,duoi:number,dong:number}} g kết quả gieo
   * @returns quẻ chính / hỗ / biến + Thể-Dụng ba chặng
   */
  function resolve(g) {
    if (!g || !g.ok) return g || { ok: false, error: 'Chưa gieo được quẻ.' };
    var qTren = _quaiTheoSo(g.tren);
    var qDuoi = _quaiTheoSo(g.duoi);
    var li = qDuoi.li + qTren.li; // hào 1..6, dưới → trên

    // Hào động nằm ở nửa dưới (1–3) thì HẠ quái là Dụng, ngược lại THƯỢNG quái.
    var dongODuoi = g.dong <= 3;
    var the = dongODuoi ? qTren : qDuoi;
    var dung = dongODuoi ? qDuoi : qTren;
    var theOTren = dongODuoi; // vị trí của quẻ Thể, giữ nguyên qua hỗ và biến

    // Biến quái: lật đúng hào động.
    var arr = li.split('');
    arr[g.dong - 1] = arr[g.dong - 1] === '1' ? '0' : '1';
    var liBien = arr.join('');

    // Hỗ quái: hào 2-3-4 làm hạ hỗ, hào 3-4-5 làm thượng hỗ.
    var liHo = li.slice(1, 4) + li.slice(2, 5);

    function _tach(li6) {
      return { duoi: _quaiTuLi(li6.slice(0, 3)), tren: _quaiTuLi(li6.slice(3, 6)) };
    }
    // Ở hỗ và biến, Thể/Dụng GIỮ NGUYÊN VỊ TRÍ trên–dưới đã xác định ở quẻ
    // chính, chỉ đổi cái quái đứng ở vị trí đó. Đọc lại vị trí hào động trong
    // quẻ hỗ là sai — hỗ quái không có hào động của riêng nó.
    function _chang(li6, nhan, y) {
      var t = _tach(li6);
      var qq = _que(li6);
      var th = theOTren ? t.tren : t.duoi;
      var du = theOTren ? t.duoi : t.tren;
      return { nhan: nhan, y: y, li: li6, que: qq, the: th, dung: du, qh: quanHe(th.hanh, du.hanh) };
    }

    var chinh = _chang(li, 'Quẻ chính', 'Tình thế lúc này');
    var ho = _chang(liHo, 'Hỗ quái', 'Diễn biến ở giữa');
    var bien = _chang(liBien, 'Biến quái', 'Kết cục đi về đâu');

    var KH = root.KinhDichHao;
    var haoTu = null;
    if (KH && chinh.que) {
      haoTu = KH.layLoi(chinh.que.kw, { loai: 'hao', hao: g.dong });
    }

    return {
      ok: true,
      gieo: g,
      dong: g.dong,
      dongODuoi: dongODuoi,
      quaiTren: qTren,
      quaiDuoi: qDuoi,
      the: the,
      dung: dung,
      theOTren: theOTren,
      chinh: chinh,
      ho: ho,
      bien: bien,
      haoTu: haoTu,
      // Kết luận lấy theo quẻ CHÍNH — đó là tình thế đang hỏi. Hỗ và biến nói
      // đường đi, không thay được câu trả lời cho hiện tại.
      ketLuan: chinh.qh,
    };
  }

  function _quaiTuLi(li3) {
    for (var i = 0; i < BAT_QUAI.length; i++) if (BAT_QUAI[i].li === li3) return BAT_QUAI[i];
    return BAT_QUAI[7];
  }

  // ── Render ──────────────────────────────────────────────────────────────
  var _esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function _haoSVG(li3, hoa) {
    var rows = '';
    for (var i = 2; i >= 0; i--) {
      var yang = li3[i] === '1';
      rows +=
        '<div class="mh-hao">' +
        (yang
          ? '<span class="mh-duong" style="background:' + hoa + '"></span>'
          : '<span class="mh-am"><i style="background:' + hoa + '"></i><i style="background:' + hoa + '"></i></span>') +
        '</div>';
    }
    return '<div class="mh-quai-hao">' + rows + '</div>';
  }

  /** Thẻ Thể ⟷ Dụng — khối chính của trang. */
  function cardHTML(r) {
    if (!r || !r.ok) return '';
    var qh = r.ketLuan;
    var mn = MUC_NHAN[qh.muc];
    var theMau = HANH_MAU[r.the.hanh];
    var dungMau = HANH_MAU[r.dung.hanh];
    return (
      '<div class="mh-card">' +
      '<div class="mh-doi">' +
      '<div class="mh-quai mh-the">' +
      '<div class="mh-vai">Thể · mình</div>' +
      _haoSVG(r.the.li, theMau) +
      '<div class="mh-ten">' + _esc(r.the.n) + '</div>' +
      '<div class="mh-phu">' + _esc(r.the.zh) + ' · ' + _esc(r.the.tuong) + ' · <b style="color:' + theMau + '">' + _esc(r.the.hanh) + '</b></div>' +
      '</div>' +
      '<div class="mh-giua">' +
      '<div class="mh-mui" style="color:' + mn.mau + '">' + (qh.ma === 'tihoa' ? '⟺' : qh.ma.indexOf('the-') === 0 ? '⟶' : '⟵') + '</div>' +
      '<div class="mh-qh">' + _esc(qh.ten) + '</div>' +
      '<div class="mh-muc" style="background:' + mn.mau + '">' + _esc(mn.nhan) + '</div>' +
      '</div>' +
      '<div class="mh-quai mh-dung">' +
      '<div class="mh-vai">Dụng · việc</div>' +
      _haoSVG(r.dung.li, dungMau) +
      '<div class="mh-ten">' + _esc(r.dung.n) + '</div>' +
      '<div class="mh-phu">' + _esc(r.dung.zh) + ' · ' + _esc(r.dung.tuong) + ' · <b style="color:' + dungMau + '">' + _esc(r.dung.hanh) + '</b></div>' +
      '</div>' +
      '</div>' +
      '<div class="mh-luan">' + _esc(qh.luan) + '</div>' +
      '</div>'
    );
  }

  /** Ba chặng chính → hỗ → biến. */
  function chungHTML(r) {
    if (!r || !r.ok) return '';
    var cells = [r.chinh, r.ho, r.bien]
      .map(function (c) {
        var mn = MUC_NHAN[c.qh.muc];
        var ten = c.que ? c.que.q.n + ' ' + c.que.q.zh : '—';
        return (
          '<div class="mh-chang">' +
          '<div class="mh-chang-nhan">' + _esc(c.nhan) + '</div>' +
          '<div class="mh-chang-que">' + _esc(ten) + '</div>' +
          '<div class="mh-chang-y">' + _esc(c.y) + '</div>' +
          '<div class="mh-chang-qh"><span style="background:' + mn.mau + '">' + _esc(mn.nhan) + '</span> ' + _esc(c.qh.ten) + '</div>' +
          '<div class="mh-chang-td">Thể ' + _esc(c.the.n) + ' (' + _esc(c.the.hanh) + ') · Dụng ' + _esc(c.dung.n) + ' (' + _esc(c.dung.hanh) + ')</div>' +
          '</div>'
        );
      })
      .join('');
    return (
      '<div class="mh-changs">' + cells + '</div>' +
      '<div class="mh-chang-chu">Ba chặng đọc theo thứ tự: quẻ chính là tình thế hiện tại, hỗ quái là khúc giữa mà người hỏi thường không lường trước, biến quái là chỗ việc đi tới. Chặng nào Thể bị Dụng khắc thì đó là nút thắt của chặng ấy.</div>'
    );
  }

  // ── Ảnh chia sẻ ─────────────────────────────────────────────────────────
  /**
   * Nạp trước bức tranh quẻ chính. Trả null nếu hỏng — poster vẫn dựng được,
   * chỉ mất phần tranh, KHÔNG mất nút Tải Ảnh.
   *
   * `crossOrigin` bắt buộc: thiếu nó canvas bị "tainted" và `toBlob` ném
   * SecurityError, tức mất trắng nút Tải Ảnh (đúng cái bẫy poster.js đã ghi).
   */
  function loadAnh(r) {
    return new Promise(function (resolve) {
      var KD = root.KinhDichTool;
      if (!KD || !KD.anhUrl || !r || !r.ok || !r.chinh.que) return resolve(null);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = KD.anhUrl(r.chinh.li, r.chinh.que.kw);
    });
  }

  /**
   * Trả hàm `draw(ctx, box)` cho Poster.
   *
   * Bố cục: tranh quẻ phủ kín khung, phía dưới là một dải mờ mang đúng cặp
   * Thể ⟷ Dụng và lời phán. Vì sao chồng dải lên tranh chứ không xếp cạnh:
   * khung 1080×1240 mà chia đôi thì tranh còn quá nhỏ để nhận ra, trong khi
   * chính bức tranh mới là thứ khiến người ta dừng ngón tay lại.
   *
   * Không có tranh (mạng hỏng) → vẫn vẽ được: nền navy + hai quẻ đơn to.
   */
  function posterDraw(r, img) {
    var T = (root.Poster && root.Poster.THEME) || {};
    var NAVY = T.NAVY || '#061A2E';
    var SERIF = T.SERIF || 'Georgia, serif';
    var SANS = T.SANS || 'system-ui, sans-serif';

    return function (ctx, box) {
      ctx.fillStyle = NAVY;
      ctx.fillRect(box.x, box.y, box.w, box.h);

      if (img) {
        var s = Math.max(box.w / img.width, box.h / img.height);
        var dw = img.width * s,
          dh = img.height * s;
        ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y, dw, dh);
      }

      // Dải nền cho khối Thể–Dụng. Có tranh thì phải đủ đục để chữ đọc được
      // trên MỌI bức (64 bức sáng tối rất khác nhau); không tranh thì khỏi.
      var stripH = 300;
      var sy = box.y + box.h - stripH;
      if (img) {
        var g = ctx.createLinearGradient(0, sy - 90, 0, sy + 60);
        g.addColorStop(0, 'rgba(6,26,46,0)');
        g.addColorStop(1, 'rgba(6,26,46,0.93)');
        ctx.fillStyle = g;
        ctx.fillRect(box.x, sy - 90, box.w, 150);
        ctx.fillStyle = 'rgba(6,26,46,0.93)';
        ctx.fillRect(box.x, sy + 59, box.w, stripH);
      }

      var qh = r.ketLuan;
      var mn = MUC_NHAN[qh.muc];
      var cy = sy + 120;
      var cx = box.x + box.w / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Hai quẻ đơn + mũi tên. Vẽ vạch hào bằng hình chữ nhật chứ không dùng
      // ký tự ⚊/⚋ — hai glyph đó nhiều máy không có font, canvas sẽ ra ô vuông.
      function quai(q, ox, mau) {
        var bw = 132,
          bh = 16,
          gap = 13;
        for (var i = 0; i < 3; i++) {
          var yang = q.li[2 - i] === '1';
          var yy = cy - 74 + i * (bh + gap);
          ctx.fillStyle = mau;
          if (yang) ctx.fillRect(ox - bw / 2, yy, bw, bh);
          else {
            ctx.fillRect(ox - bw / 2, yy, bw * 0.4, bh);
            ctx.fillRect(ox + bw / 2 - bw * 0.4, yy, bw * 0.4, bh);
          }
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 46px ' + SERIF;
        ctx.fillText(q.n, ox, cy + 46);
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.font = '400 27px ' + SANS;
        ctx.fillText(q.hanh, ox, cy + 84);
      }

      quai(r.the, box.x + box.w * 0.2, HANH_MAU[r.the.hanh]);
      quai(r.dung, box.x + box.w * 0.8, HANH_MAU[r.dung.hanh]);

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '600 22px ' + SANS;
      ctx.fillText('THỂ', box.x + box.w * 0.2, cy - 102);
      ctx.fillText('DỤNG', box.x + box.w * 0.8, cy - 102);

      ctx.fillStyle = mn.mau;
      ctx.font = '700 62px ' + SERIF;
      ctx.fillText(qh.ma === 'tihoa' ? '⟺' : qh.ma.indexOf('the-') === 0 ? '⟶' : '⟵', cx, cy - 4);

      // Nhãn phán quyết: nền bo tròn cho nổi khỏi tranh.
      ctx.font = '700 34px ' + SANS;
      var label = mn.nhan.toUpperCase();
      var tw = ctx.measureText(label).width;
      var pw = tw + 56,
        ph = 56,
        px = cx - pw / 2,
        py = cy + 24;
      ctx.fillStyle = mn.mau;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 28);
        ctx.fill();
      } else ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, cx, py + 39);

      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = '400 28px ' + SANS;
      ctx.fillText(qh.ten, cx, cy + 128);

      ctx.textAlign = 'left';
    };
  }

  /** Nhan đề / dòng phụ / câu trích cho poster. */
  function posterOpts(r, cauHoi) {
    var ten = r.chinh.que ? r.chinh.que.q.n : '';
    var tenBien = r.bien.que ? r.bien.que.q.n : '';
    return {
      draw: null, // trang tự gắn sau khi loadAnh xong
      title: 'Quẻ ' + ten + (tenBien && tenBien !== ten ? ' → ' + tenBien : ''),
      subtitle: 'Thể ' + r.the.n + ' ' + r.the.hanh + ' · Dụng ' + r.dung.n + ' ' + r.dung.hanh + ' — ' + r.ketLuan.ten,
      quote: (r.haoTu && r.haoTu.viet) || r.ketLuan.luan,
      cauHoi: cauHoi || '',
      // Cỡ chữ riêng của bàn quẻ — không nạp sẵn thì canvas rơi về font hệ thống.
      fonts: ['700 46px ' + ((root.Poster && root.Poster.THEME.SERIF) || 'serif'), '700 34px ' + ((root.Poster && root.Poster.THEME.SANS) || 'sans-serif')],
    };
  }

  // ── Dữ liệu thô cho rail ────────────────────────────────────────────────
  function railData(r, cauHoi) {
    if (!r || !r.ok) return {};
    function chang(c) {
      return (
        c.nhan + ': ' + (c.que ? c.que.q.n + ' (' + c.que.q.zh + ')' : '—') +
        ' — Thể ' + c.the.n + ' ' + c.the.hanh + ', Dụng ' + c.dung.n + ' ' + c.dung.hanh +
        ' → ' + c.qh.ten + ' (' + MUC_NHAN[c.qh.muc].nhan + ')'
      );
    }
    return {
      cauHoi: cauHoi || '',
      cachGieo: r.gieo.cach === 'gio' ? 'gieo theo thời điểm' : 'gieo theo số',
      buocTinh: r.gieo.calc.moTa,
      haoDong: 'hào ' + r.dong + (r.dongODuoi ? ' (nằm ở hạ quái)' : ' (nằm ở thượng quái)'),
      theDung: 'Thể ' + r.the.n + ' hành ' + r.the.hanh + ' · Dụng ' + r.dung.n + ' hành ' + r.dung.hanh,
      ketLuan: r.ketLuan.ten + ' — ' + r.ketLuan.tomTat,
      baChang: [chang(r.chinh), chang(r.ho), chang(r.bien)],
      haoTu: r.haoTu ? r.haoTu.nhan + ': ' + r.haoTu.han + ' — ' + r.haoTu.viet : '',
    };
  }

  var API = {
    BAT_QUAI: BAT_QUAI,
    HANH_MAU: HANH_MAU,
    MUC_NHAN: MUC_NHAN,
    quanHe: quanHe,
    gieoTheoGio: gieoTheoGio,
    gieoTheoSo: gieoTheoSo,
    resolve: resolve,
    cardHTML: cardHTML,
    chungHTML: chungHTML,
    loadAnh: loadAnh,
    posterDraw: posterDraw,
    posterOpts: posterOpts,
    railData: railData,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MaiHoaTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
