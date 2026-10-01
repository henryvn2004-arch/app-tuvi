/* luan-giai-core.js — LÕI luận giải 24 phần DÙNG CHUNG (thuần logic, chỉ đọc ls).
   Port byte-faithful từ public/luan-giai.html: PHAN_LABELS (24 phần) + buildPreGenHtml
   (khối deterministic mỗi phần: cách cục, phân tích sao, 6 chiều, scoring đại vận,
   thần sát, Tuần/Triệt, luận đoán vận hạn) — thay biến toàn cục `_astrolabe` bằng
   tham số `ls` (output của anSaoLaSo). KHÔNG DOM, KHÔNG AI, KHÔNG paywall.
   Dùng bởi: shell /app/luan-giai (render 24 phần free ở ô giữa). Standalone
   /luan-giai.html vẫn giữ bản inline (DRY hoá sau, PR riêng).
   Phụ thuộc load-order: TU_HOA (global từ public/tuvi-ansao-engine.js) —
   khối Tứ Hóa Phi Tinh cần engine nạp TRƯỚC file này.
   renderInlineDaiVanLineChart(ls): vẽ canvas #chart-daivan-overview (phần 14,
   cần Chart.js; tự thoát nếu thiếu Chart) — đúng khuôn
   BatTuCore.renderInlineDaiVanLineChart của bat-tu-core.js.
   Public API: window.LuanGiaiCore = { TONG_PHAN, PHAN_LABELS_BASE, phanLabels, buildPreGenHtml, buildCalcSectionHtml, renderInlineDaiVanLineChart }. */
/* global Chart */
(function (root) {
  var TONG_PHAN = 24;
  var CAN10 = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI12 = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  // Can của MỘT cung bất kỳ suy từ Can năm sinh (ngũ hổ độn) — CÙNG công thức
  // _getCungCan của laso-chart.js (dán nhãn can-chi trên bàn lá số), viết lại
  // tại chỗ để file này không phụ thuộc thứ tự nạp script khác. Trả -1 nếu
  // không tra được (canChiNam thiếu hoặc diaChi lạ).
  function cungCanIdx(ls, diaChi) {
    var canNam = ((ls && ls.canChiNam) || '').split(' ')[0];
    var ci = CAN10.indexOf(canNam), di = CHI12.indexOf(diaChi);
    if (ci < 0 || di < 0) return -1;
    return ((ci % 5) * 2 + di) % 10;
  }
  // Can của cung đại vận — dùng chung cungCanIdx ở trên.
  function canChiDaiVan(ls, dv) {
    if (!dv || !dv.diaChi) return '';
    var ci = cungCanIdx(ls, dv.diaChi);
    if (ci < 0) return dv.diaChi;
    return CAN10[ci] + ' ' + dv.diaChi;
  }

  // TU_HOA là global từ public/tuvi-ansao-engine.js — CÙNG cách
  // public/tuvi-laso-format.js đã dùng cho khối này (xem comment ở đó +
  // projectGlobals trong eslint.config.js). File này trước có BẢN CHÉP TAY
  // riêng, trôi lệch Khoa/Kỵ của Canh với engine suốt từ P2 tới P3 (2026-09)
  // vì sửa engine không kéo theo sửa bản chép — nay trỏ thẳng về MỘT nguồn.
  // Cả 3 trang duy nhất nạp file này (app-luan-giai/app-van-han-nam/
  // app-chu-trinh-cuoc-doi.html) đều nạp tuvi-ansao-engine.js TRƯỚC.
  var HOA_ORDER = ['Lộc', 'Quyền', 'Khoa', 'Kỵ'];

  // Khối "Tứ Hóa Phi Tinh" (tự hóa Bắc Phái, tầng MỆNH BÀN — dùng can của
  // CHÍNH cung đang xét, không phải can năm sinh hay can đại vận/lưu niên;
  // các tầng đó theo can khác, ngoài phạm vi khối này). 4 sao Lộc/Quyền/
  // Khoa/Kỵ suy từ can cung → tra vị trí HIỆN TẠI của từng sao (ls.palaces)
  // → "phi nhập" đúng cung đó. Tự hóa (sao bay về lại CHÍNH cung phát) được
  // đánh dấu riêng. Trả '' nếu không tra được can cung hoặc không có sao nào.
  function buildTuHoaPhiTinhHtml(cungForPhan, ls) {
    var pal = (ls.palaces || []).find(function (p) { return p.cungName === cungForPhan; });
    if (!pal) return '';
    var ci = cungCanIdx(ls, pal.diaChi);
    if (ci < 0) return '';
    var canCung = CAN10[ci];
    var hosts = TU_HOA[canCung];
    if (!hosts) return '';
    function findStarPalace(name) {
      return (ls.palaces || []).find(function (p) {
        return (p.stars || []).some(function (s) { return s.ten === name; });
      });
    }
    var rows = HOA_ORDER.map(function (hoa) {
      var star = hosts[hoa];
      var target = star ? findStarPalace(star) : null;
      if (!target) return null;
      return { hoa: hoa, star: star, target: target, self: target.cungName === cungForPhan };
    }).filter(Boolean);
    if (!rows.length) return '';
    var h = '<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🚀" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">🚀</span> Tứ Hóa Phi Tinh (can cung ' + canCung + ')</div>';
    rows.forEach(function (r) {
      var cls = r.hoa === 'Kỵ' ? 'yn-hung' : 'yn-cat';
      var selfBadge = r.self ? ' <span style="color:#7B3FA0;font-weight:700">[TỰ HÓA]</span>' : '';
      h += '<div class="pregen-yn ' + cls + '">Hóa ' + r.hoa + ': <b>' + r.star + '</b> → phi nhập cung <b>' + r.target.cungName + '</b> (' + r.target.diaChi + ')' + selfBadge + '</div>';
    });
    h += '</div>';
    return h;
  }
  // Thứ tự 12 trục của vành cung — CỐ ĐỊNH, không đọc `Object.keys(cungScores)`:
  // thứ tự khoá của object là thứ tự an sao, đổi engine là hình xoay theo mà
  // không ai báo, và hai lá số cạnh nhau sẽ không so hình được với nhau nữa.
  // Nhãn rút còn MỘT chữ đầu (Mệnh · Phụ · Phúc…) — 12 nhãn quanh một vòng nhỏ,
  // để nguyên "Điền Trạch" là chữ chồng lên nhau.
  var CUNG_TRUC = [
    ['Mệnh', 'Mệnh'], ['Phụ Mẫu', 'Phụ'], ['Phúc Đức', 'Phúc'], ['Điền Trạch', 'Điền'],
    ['Quan Lộc', 'Quan'], ['Nô Bộc', 'Nô'], ['Thiên Di', 'Di'], ['Tật Ách', 'Tật'],
    ['Tài Bạch', 'Tài'], ['Tử Tức', 'Tử'], ['Phu Thê', 'Phối'], ['Huynh Đệ', 'Huynh'],
  ];

  /** Vành 12 cung. Trả '' nếu thiếu HookCharts hoặc thiếu điểm — khối chữ phía
   *  sau vẫn đứng được một mình, không để trang vỡ vì một hình. */
  function buildCungRadarHtml(ls) {
    if (!window.HookCharts || !HookCharts.hexRadar) return '';
    var sc = (ls && ls.cungScores) || null;
    if (!sc) return '';
    var dims = CUNG_TRUC.map(function (x) {
      var v = sc[x[0]] && sc[x[0]].tong;
      return { label: x[1], value: typeof v === 'number' ? v : 0 };
    });
    if (!dims.some(function (d) { return d.value > 0; })) return '';
    return (
      '<div style="margin:6px 0 10px">' +
      HookCharts.hexRadar({ dims: dims, size: 260, max: 10,
        ariaLabel: 'Vành mười hai cung, trục nào dày là cung đó mạnh hơn' }) +
      '</div>'
    );
  }

  var PHAN_LABELS_BASE = [
    '',
    'Tổng Quan Lá Số',
    'Cung Mệnh', 'Cung Phụ Mẫu', 'Cung Phúc Đức', 'Cung Điền Trạch',
    'Cung Quan Lộc', 'Cung Nô Bộc', 'Cung Thiên Di', 'Cung Tật Ách',
    'Cung Tài Bạch', 'Cung Tử Tức', 'Cung Phu Thê', 'Cung Huynh Đệ',
    'Tổng quan đại vận',
    'Đại Vận 1', 'Đại Vận 2', 'Đại Vận 3', 'Đại Vận 4', 'Đại Vận 5',
    'Đại Vận 6', 'Đại Vận 7', 'Đại Vận 8', 'Đại Vận 9',
    'Tiểu Vận Năm Xem',
  ];

  // Nhãn 24 phần đã vá tuổi đại vận (Đại Vận i (start–end t)) từ ls.daiVans.
  function phanLabels(ls) {
    var L = PHAN_LABELS_BASE.slice();
    if (ls && ls.daiVans) {
      for (var i = 0; i < 9; i++) {
        var dv = ls.daiVans[i];
        if (dv) L[15 + i] = 'Đại Vận ' + (i + 1) + ' (' + dv.tuoiStart + '–' + dv.tuoiEnd + 't)';
      }
    }
    return L;
  }

  // Sao ở CUNG BẢN MỆNH (phan 2–13): chính tinh cung + sao tam phương tứ chính —
  // deterministic, LUÔN có (không như "Phân tích sao"/cachCucTungCung có thể rỗng).
  // Mirror đúng khối chính-tinh + tam-phương của phần đại vận (buildPreGenHtml 15–24)
  // để cung thiếu cách cục (vd Tử Tức) vẫn hiện đủ sao. Trả '' nếu không tìm thấy cung.
  var _SAT = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
  var _BAI = ['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
  var _CAT = ['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật','Lộc Tồn','Hóa Lộc','Hóa Quyền','Hóa Khoa'];
  function buildCungStarHtml(cungForPhan, ls) {
    const pal = (ls.palaces || []).find((p) => p.cungName === cungForPhan);
    if (!pal) return '';
    let h = '';
    const majorStars = pal.majorStars || [];
    const allStars = pal.stars || [];
    h += `<div class="pregen-block"><div class="pregen-title">✦ Chính tinh cung</div>`;
    if (majorStars.length === 0) {
      const xung = pal.xungChieuCung;
      const xungStars = xung ? (xung.majorStars || []).map((s) => `${s.ten}(${s.brightness || ''})`).join(', ') : '';
      h += `<div class="pregen-yn yn-neutral">Vô chính diệu${xungStars ? ` — mượn từ cung xung: <span style="color:#5FA8D3">${xungStars}</span>` : ''}</div>`;
    } else {
      majorStars.forEach((s) => {
        const bCol = s.brightness === 'Miếu' || s.brightness === 'Vượng' ? '#4ade80' : s.brightness === 'Đắc' ? '#86efac' : s.brightness === 'Bình hòa' || s.brightness === 'Bình' ? '#60a5fa' : '#f87171';
        h += `<div class="pregen-yn yn-neutral"><span style="font-weight:600;color:inherit">${s.ten}</span> <span style="color:${bCol};font-size:11px">(${s.brightness || ''})</span>${s.hoa ? ` <span style="color:#5FA8D3">[Hóa ${s.hoa}]</span>` : ''}</div>`;
      });
    }
    h += `</div>`;
    const tptcPalaces = [pal, ...(pal.tamHopCungs || []), pal.xungChieuCung].filter(Boolean);
    const tptcNames = tptcPalaces.flatMap((p) => (p.stars || []).map((s) => s.ten));
    const satIn = _SAT.filter((s) => tptcNames.includes(s));
    const baiIn = _BAI.filter((s) => tptcNames.includes(s));
    const catIn = _CAT.filter((s) => tptcNames.includes(s));
    const hasTuan = allStars.some((s) => s.ten === 'Tuần');
    const hasTriet = allStars.some((s) => s.ten === 'Triệt');
    if (catIn.length || satIn.length || baiIn.length || hasTuan || hasTriet) {
      h += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔍" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">🔍</span> Sao tam phương tứ chính</div>`;
      if (catIn.length) h += `<div class="pregen-yn yn-cat">Cát tinh: ${catIn.join(', ')}</div>`;
      if (satIn.length) h += `<div class="pregen-yn yn-hung">Sát tinh: ${satIn.join(', ')}</div>`;
      if (baiIn.length) h += `<div class="pregen-yn yn-hung" style="color:#fca5a5">Bại tinh: ${baiIn.join(', ')}</div>`;
      if (hasTuan) h += `<div class="pregen-yn yn-tuan">Tuần án ngữ cung</div>`;
      if (hasTriet) h += `<div class="pregen-yn yn-tuan">Triệt án ngữ cung</div>`;
      h += `</div>`;
    }
    return h;
  }

  // Khối deterministic 1 phần — PORT NGUYÊN từ luan-giai.html:buildPreGenHtml (3388–3516),
  // chỉ đổi `_astrolabe` → `ls`. Trả HTML string ('' nếu phần không có khối, vd phần 14).
  // Tách HAI phần (Henry 2026-10-01): CHART (radar 12 cung, thanh 6 chiều,
  // đường 9 đại vận, thanh chấm điểm đại vận) đứng NGOÀI khối gập "Xem cơ sở
  // tính toán" để khách thấy ngay; phần chữ (cách cục/sao/quy tắc) vẫn trong
  // khối gập. `buildPreGenHtml` giữ nguyên chữ ký, trả cả hai nối lại.
  function buildPreGenParts(phan, ls) {
    if (!ls) return { charts: '', calc: '' };
    var _astrolabe = ls;
    let chartHtml = '';
    const PHAN_TO_CUNG_MAP = {
      1: null,
      2:'Mệnh',3:'Phụ Mẫu',4:'Phúc Đức',5:'Điền Trạch',
      6:'Quan Lộc',7:'Nô Bộc',8:'Thiên Di',9:'Tật Ách',
      10:'Tài Bạch',11:'Tử Tức',12:'Phu Thê',13:'Huynh Đệ',
    };
    const cungForPhan = PHAN_TO_CUNG_MAP[phan];
    let preGenHtml = '';

    if (phan === 1) {
      const cc = _astrolabe.cachCuc || [];
      if (cc.length > 0) {
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">⚙</span> Cách cục đặc biệt</div>`;
        cc.forEach(c => { preGenHtml += `<div class="pregen-item"><span class="cc-label cc-${c.loai}">${c.ten}</span><span class="cc-mota">${c.moTa}</span></div>`; });
        preGenHtml += `</div>`;
      }
      if (_astrolabe.cungScores) {
        const METRICS = ['thienVan','canCo','mayMan','phuTro','binhYen','benVung'];
        const top3 = Object.entries(_astrolabe.cungScores).map(([c,sc])=>[c,METRICS.reduce((s,m)=>s+sc[m],0)]).sort((a,b)=>b[1]-a[1]).slice(0,3);
        const bot3 = Object.entries(_astrolabe.cungScores).map(([c,sc])=>[c,METRICS.reduce((s,m)=>s+sc[m],0)]).sort((a,b)=>a[1]-b[1]).slice(0,3);
        chartHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📊" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">📊</span> Điểm mạnh / yếu nổi bật</div>`;
        // Vành 12 cung — CÙNG con số mà hai dòng "Mạnh nhất / Yếu nhất" ngay
        // dưới đang đọc (`cungScores[cung].tong`), chỉ đổi cách đọc: hai dòng
        // chữ nêu được 6/12 cung, hình nêu cả 12 và cho thấy KHOẢNG CÁCH giữa
        // chúng — thứ mà danh sách top3/bot3 không nói ra.
        //
        // ⚠️ CỐ Ý KHÔNG in số lên từng trục: `SYSTEM_PROMPT` cấm bản luận nói
        // "cung này x/10" (mà `cungScores` KHÔNG nằm trong `formatLaSoV2`, nên
        // model thật sự không có con số đó). In số lên hình là dựng một nguồn
        // thứ hai nói ngược lại chính bài luận bên dưới nó. Hình chỉ nói TƯƠNG
        // QUAN — cung nào dày, cung nào mỏng — đúng vai của một cái radar.
        // Giữ hai dòng chữ: chúng GỌI TÊN cung, hình thì không.
        chartHtml += buildCungRadarHtml(_astrolabe);
        chartHtml += `<div class="pregen-row"><span class="pregen-good">Mạnh nhất: ${top3.map(([c,s])=>`${c} (${s.toFixed(0)})`).join(', ')}</span></div>`;
        chartHtml += `<div class="pregen-row"><span class="pregen-bad">Yếu nhất: ${bot3.map(([c,s])=>`${c} (${s.toFixed(0)})`).join(', ')}</span></div>`;
        chartHtml += `</div>`;
      }
      chartHtml += buildNguHanhHtml(_astrolabe);
    } else if (cungForPhan) {
      // FIX shell: KHÔNG gate cả khối cung theo cachCucTungCung — cung nào cũng
      // render điểm 6 chiều (cungScores) + cách cục; standalone che được vì có
      // AI prose lấp, còn shell không có AI ở giữa nên cung thiếu phân tích sao
      // (vd Tử Tức/Huynh Đệ) bị TRỐNG. ynItems rỗng thì bỏ qua khối "phân tích sao".
      const ynItems = _astrolabe.cachCucTungCung?.[cungForPhan] || [];
      const ccItems = (_astrolabe.cachCuc||[]).filter(c => c.cung === cungForPhan);
      const sc = _astrolabe.cungScores?.[cungForPhan];
      if (ccItems.length > 0) {
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">⚙</span> Cách cục đặc biệt</div>`;
        ccItems.forEach(c => { preGenHtml += `<div class="pregen-item"><span class="cc-label cc-${c.loai}">${c.ten}</span></div>`; });
        preGenHtml += `</div>`;
      }
      // Sao ở cung (LUÔN có) — chính tinh + tam phương tứ chính; đứng trước "Phân
      // tích sao" (ý nghĩa cách cục, có thể rỗng) để cung nào cũng đủ dữ liệu sao.
      preGenHtml += buildCungStarHtml(cungForPhan, _astrolabe);
      if (ynItems.length > 0) {
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📋" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">📋</span> Phân tích sao</div>`;
        ynItems.forEach(y => {
          const cls = y.includes('đại cát')||y.includes('đại phú') ? 'yn-great-cat'
            : y.includes('[cát]')||y.includes('phú quý')||y.includes('giàu sang') ? 'yn-cat'
            : y.includes('đại hung') ? 'yn-great-hung'
            : y.includes('hung')||y.includes('vất vả')||y.includes('tai') ? 'yn-hung'
            : y.includes('Tuần')||y.includes('Triệt') ? 'yn-tuan' : 'yn-neutral';
          preGenHtml += `<div class="pregen-yn ${cls}">• ${y}</div>`;
        });
        preGenHtml += `</div>`;
      }
      preGenHtml += buildTuHoaPhiTinhHtml(cungForPhan, _astrolabe);
      if (sc) {
        const METRICS = ['thienVan','canCo','mayMan','phuTro','binhYen','benVung'];
        const MV = ['Thiên Vận','Căn Cơ','May Mắn','Phù Trợ','Bình Yên','Bền Vững'];
        chartHtml += `<div class="pregen-block pregen-scores"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📈" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">📈</span> Đánh giá 6 chiều</div><div class="score-bars">`;
        METRICS.forEach((m,i) => {
          const v=sc[m]; const pct=v*10;
          const col=v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
          chartHtml += `<div class="score-bar-row"><span class="score-label">${MV[i]}</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${pct}%;background:${col}"></div></div><span class="score-val">${v}</span></div>`;
        });
        chartHtml += `</div></div>`;
      }
    } else if (phan === 14) {
      // Tổng quan đại vận: SPLINE CHART thật (Chart.js tension:.35, đúng khuôn
      // BatTuCore.renderInlineDaiVanLineChart của bat-tu-core.js) — trước đây
      // phần này chỉ có score-bars (thanh ngang) vì lúc viết app-luan-giai.html
      // chưa nạp Chart.js, không khớp "spline" như tool standalone (luan-giai.html
      // vốn có canvas #chart-daivan thật). buildPreGenHtml chỉ trả HTML text;
      // canvas #chart-daivan-overview cần renderInlineDaiVanLineChart(ls) (export
      // dưới) gọi SAU khi HTML này đã vào DOM để thực sự vẽ.
      // Cắt 9 đại vận GIỐNG standalone (mọi chart/luận ở luan-giai.html đều
      // .slice(0,9)): daiVans có 12 phần tử nhưng 3 cái cuối (93–122t) không
      // được chấm điểm → hiện ra 3 điểm trống chỉ làm nhiễu đồ thị.
      const dvs = (_astrolabe.daiVans || []).slice(0, 9);
      const cur = _astrolabe.daiVanHienTai;
      if (dvs.length) {
        const curIdx = dvs.findIndex(d => cur && d.cungIdx === cur.cungIdx);
        const diff = dvs.length > 1 ? (((dvs[1].cungIdx - dvs[0].cungIdx) % 12) + 12) % 12 : 1;
        const thuan = diff === 1;
        chartHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📈" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">📈</span> 9 đại vận — biểu đồ điểm số</div>`;
        chartHtml += `<div style="position:relative;height:240px;margin-top:8px"><canvas id="chart-daivan-overview"></canvas></div>`;
        chartHtml += `<div style="font-size:11px;color:#666;margin-top:12px;line-height:1.5">`;
        chartHtml += `· Khởi vận: ${dvs[0].tuoiStart} tuổi · Hướng: ${thuan ? 'thuận' : 'nghịch'}<br>`;
        if (curIdx >= 0) {
          const c = dvs[curIdx];
          chartHtml += `· Hiện tại: ĐV${curIdx + 1} (${canChiDaiVan(_astrolabe, c)}, ${c.tuoiStart}-${c.tuoiEnd}t)${c.scoring ? ' · ' + c.scoring.tong + '/10' : ''}`;
        }
        chartHtml += `</div></div>`;
        chartHtml += buildChuDeDaiVanHtml(_astrolabe);
      }
    } else if ((phan >= 15 && phan <= 23) || phan === 24) {
      if (phan === 24) chartHtml += buildVanNamHtml(_astrolabe) + buildVanThangHtml(_astrolabe);
      const dvNum = phan === 24 ? null : phan - 14;
      const dv = dvNum ? _astrolabe.daiVans?.[dvNum-1] : _astrolabe.daiVanHienTai;
      if (dv && _astrolabe.palaces) {
        const dvPalace = _astrolabe.palaces[dv.cungIdx];
        if (dvPalace) {
          const dvCungName = dvPalace.cungName;
          const dvDC = dvPalace.diaChi;
          const sc = dv.scoring;
          if (sc) {
            const ttScore=sc.thienThoi?.score??sc.thienThoi, dlScore=sc.diaLoi?.score??sc.diaLoi, nhScore=sc.nhanHoa?.score??sc.nhanHoa;
            const ttBar=(ttScore/5*100).toFixed(0), dlBar=(dlScore/1*100).toFixed(0), nhBar=(nhScore/4*100).toFixed(0), totBar=(sc.tong/10*100).toFixed(0);
            const totCol=sc.tong>=7?'#4ade80':sc.tong>=4?'#60a5fa':'#f87171';
            chartHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📊" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">📊</span> Chấm điểm đại vận — Cung ${dvCungName} (${dvDC})</div><div class="score-bars">
              <div class="score-bar-row"><span class="score-label">Thiên Thời</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${ttBar}%;background:#c9a84c"></div></div><span class="score-val">${ttScore}/5</span></div>
              <div class="score-bar-row"><span class="score-label">Địa Lợi</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${dlBar}%;background:#0E7490"></div></div><span class="score-val">${dlScore}/1</span></div>
              <div class="score-bar-row"><span class="score-label">Nhân Hòa</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${nhBar}%;background:#7B2FBE"></div></div><span class="score-val">${nhScore}/4</span></div>
              <div class="score-bar-row" style="border-top:1px solid #1e2e42;padding-top:6px;margin-top:2px"><span class="score-label" style="font-weight:600;color:inherit">Tổng</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${totBar}%;background:${totCol}"></div></div><span class="score-val" style="color:${totCol};font-weight:600">${sc.tong}/10</span></div>
            </div>${sc.nhanHoa?.boMenh?`<div style="font-size:11px;color:#666;margin-top:6px">Bộ Mệnh: <span style="color:#aaa">${sc.nhanHoa.boMenh}</span> → Bộ ĐV: <span style="color:#aaa">${sc.nhanHoa.boVan}</span></div>`:''}</div>`;
          }
          const majorStars=dvPalace.majorStars||[], allStars=dvPalace.stars||[];
          const SAT=['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
          const BAI=['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
          const CAT=['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật','Lộc Tồn','Hóa Lộc','Hóa Quyền','Hóa Khoa'];
          preGenHtml += `<div class="pregen-block"><div class="pregen-title">✦ Chính tinh cung đại vận</div>`;
          if (majorStars.length===0) {
            const xung=dvPalace.xungChieuCung, xungStars=xung?(xung.majorStars||[]).map(s=>`${s.ten}(${s.brightness||''})`).join(', '):'';
            preGenHtml += `<div class="pregen-yn yn-neutral">Vô chính diệu${xungStars?` — mượn từ cung xung: <span style="color:#5FA8D3">${xungStars}</span>`:''}</div>`;
          } else {
            majorStars.forEach(s => {
              const bCol=s.brightness==='Miếu'||s.brightness==='Vượng'?'#4ade80':s.brightness==='Đắc'?'#86efac':s.brightness==='Bình hòa'||s.brightness==='Bình'?'#60a5fa':'#f87171';
              preGenHtml += `<div class="pregen-yn yn-neutral"><span style="font-weight:600;color:inherit">${s.ten}</span> <span style="color:${bCol};font-size:11px">(${s.brightness||''})</span>${s.hoa?` <span style="color:#5FA8D3">[Hóa ${s.hoa}]</span>`:''}</div>`;
            });
          }
          preGenHtml += `</div>`;
          const tptcPalaces=[dvPalace,...(dvPalace.tamHopCungs||[]),dvPalace.xungChieuCung].filter(Boolean);
          const tptcNames=tptcPalaces.flatMap(p=>(p.stars||[]).map(s=>s.ten));
          const satIn=SAT.filter(s=>tptcNames.includes(s)), baiIn=BAI.filter(s=>tptcNames.includes(s)), catIn=CAT.filter(s=>tptcNames.includes(s));
          const hasTuan=allStars.some(s=>s.ten==='Tuần'), hasTriet=allStars.some(s=>s.ten==='Triệt');
          if (catIn.length||satIn.length||baiIn.length||hasTuan||hasTriet) {
            preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔍" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">🔍</span> Sao tam phương tứ chính</div>`;
            if (catIn.length) preGenHtml += `<div class="pregen-yn yn-cat">Cát tinh: ${catIn.join(', ')}</div>`;
            if (satIn.length) preGenHtml += `<div class="pregen-yn yn-hung">Sát tinh: ${satIn.join(', ')}</div>`;
            if (baiIn.length) preGenHtml += `<div class="pregen-yn yn-hung" style="color:#fca5a5">Bại tinh: ${baiIn.join(', ')}</div>`;
            if (hasTuan) preGenHtml += `<div class="pregen-yn yn-tuan">Tuần án ngữ cung đại vận</div>`;
            if (hasTriet) preGenHtml += `<div class="pregen-yn yn-tuan">Triệt án ngữ cung đại vận</div>`;
            preGenHtml += `</div>`;
          }
          const ccDV=(_astrolabe.cachCuc||[]).filter(c=>c.cung===dvCungName||c.cung==='');
          if (ccDV.length>0) {
            preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">⚙</span> Cách cục liên quan</div>`;
            ccDV.forEach(c=>{ preGenHtml += `<div class="pregen-item"><span class="cc-label cc-${c.loai}">${c.ten}</span><span class="cc-mota">${c.moTa}</span></div>`; });
            preGenHtml += `</div>`;
          }
          const dvRules=dv.rules||[];
          if (dvRules.length>0) {
            const totR=dvRules.filter(r=>r.type==='tot'), xauR=dvRules.filter(r=>r.type==='xau');
            const cbR=dvRules.filter(r=>r.type==='canh_bao'), trungR=dvRules.filter(r=>r.type==='trung');
            preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔮" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#7C6942">🔮</span> Luận đoán vận hạn</div>`;
            if (totR.length) { preGenHtml += `<div class="rules-group">`; totR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-cat">✦ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            if (trungR.length) { preGenHtml += `<div class="rules-group">`; trungR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-neutral">◆ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            if (xauR.length) { preGenHtml += `<div class="rules-group">`; xauR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-hung">▼ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            if (cbR.length) { preGenHtml += `<div class="rules-group rules-canh-bao">`; cbR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-great-hung">⚠ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            preGenHtml += `</div>`;
          }
        }
      }
    }
    return { charts: chartHtml, calc: preGenHtml };
  }

  function buildPreGenHtml(phan, ls) {
    var p = buildPreGenParts(phan, ls);
    return p.charts + p.calc;
  }

  // Thân một phần ĐÃ MỞ của Luận Giải / Chu Trình Cuộc Đời / Vận Hạn 12 Tháng —
  // MỘT nguồn cho cả ba trang: chart đứng ngoài, phần chữ trong khối GẬP sẵn
  // (Henry 2026-10-01 — chart đã ra ngoài nên chữ gập lại, ai muốn xem thì
  // bấm mở; đảo lại quyết định "bung sẵn" của Pha 4, 2026-09-17). PDF/in vẫn
  // mở hết nhờ `beforeprint` của shell.js. Không có gì để hiện → `''`.
  function buildCalcSectionHtml(phan, ls) {
    var p = buildPreGenParts(phan, ls);
    return p.charts + (p.calc ? '<details class="lg-calc"><summary>Xem cơ sở tính toán</summary>' + p.calc + '</details>' : '');
  }

  // Vẽ canvas #chart-daivan-overview mà buildPreGenHtml(14, ls) đã dựng HTML —
  // PHẢI gọi SAU khi HTML đó đã chèn vào DOM thật (giống
  // BatTuCore.renderInlineDaiVanLineChart, đúng khuôn màu #9A7B3A/#061A2E/
  // #C0392B). Không có canvas / thiếu Chart.js / thiếu daiVans → im lặng bỏ
  // qua (DOM chưa có phần 14, hoặc Chart.js chưa nạp).
  function renderInlineDaiVanLineChart(ls) {
    if (typeof Chart === 'undefined' || !ls || !window.DaiVanChart) return;
    var canvas = (typeof document !== 'undefined') ? document.getElementById('chart-daivan-overview') : null;
    var dvs = (ls.daiVans || []).slice(0, 9);
    if (!canvas || !dvs.length) return;
    var cur = ls.daiVanHienTai;
    if (root._lgDaiVanChart) { try { root._lgDaiVanChart.destroy(); } catch (e) {} }
    var config = window.DaiVanChart.buildSingle(dvs, {
      lineColor: '#9A7B3A',
      fillColor: 'rgba(154,123,58,0.15)',
      markerColor: '#061A2E',
      activeColor: '#C0392B',
      isCurrent: function (dv) { return !!(cur && dv.cungIdx === cur.cungIdx); },
      maintainAspectRatio: false,
      tooltipExtra: function (dv) {
        var palace = ls.palaces && ls.palaces[dv.cungIdx];
        return [
          (palace ? 'Cung ' + palace.cungName + ' (' + canChiDaiVan(ls, dv) + ')' : canChiDaiVan(ls, dv)),
          dv.tuoiStart + '-' + dv.tuoiEnd + ' tuổi',
        ];
      },
    });
    root._lgDaiVanChart = new Chart(canvas.getContext('2d'), config);
  }

  // ── Biểu đồ vận (Henry chốt 2026-10-01) ─────────────────────────────────
  // Số lấy NGUYÊN từ engine, ở đây chỉ vẽ: `tieuVanScores[].bienDong` +
  // `bienDongGoc` (biên năm), `tinhVanThang()` (12 tháng), `chuDeDaiVan`
  // (4 chủ đề qua 9 đại vận), `tinhBatTu().nguHanh` (ngũ hành Tứ Trụ). Công
  // thức nằm ở engine (tuvi-ansao-engine.js — khối "BIÊN DAO ĐỘNG" và "BỐN
  // CHỦ ĐỀ"). `tuvi-ansao-engine.js` không có `?v=` (nhật ký Đợt 8) nên trình
  // duyệt có thể còn bản cũ thiếu các trường này → mỗi hàm tự trả '' khi thiếu.
  // Màu CỐ ĐỊNH, không theo biến theme: `.pregen-block` ở cả 3 trang có nền
  // sáng cứng (#F5F5F5) ở MỌI chế độ — theo biến thì chế độ tối ra chữ sáng
  // trên nền sáng. Cùng quy ước với các khối pregen khác (màu viết thẳng).
  var BD = { ink: '#1a1a1a', mute: '#666', grid: '#e0e0e0', band: '#C8A96A', bandDark: '#7C6942', cur: '#FFF1D6', red: '#C0392B' };
  var CHU_DE_MAU = { su_nghiep: '#1455A4', tai_loc: '#2E7D5B', tinh_duyen: '#C0392B', suc_khoe: '#A8843A' };
  function bdF(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
  function bdPct(p) { return Math.round(p * 100) + '%'; }
  function bdEsc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bdCanChiNam(nam) { return CAN10[((nam - 4) % 10 + 10) % 10] + ' ' + CHI12[((nam - 4) % 12 + 12) % 12]; }
  function bdText(x, y, t, a) {
    a = a || {};
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (a.size || 11) + '"' +
      (a.anchor ? ' text-anchor="' + a.anchor + '"' : '') + (a.bold ? ' font-weight="700"' : '') +
      ' style="fill:' + (a.color || BD.ink) + '">' + bdEsc(t) + '</text>';
  }
  // Khung trục 0–10 dùng chung.
  function bdAxes(L, R, T, B) {
    var h = '';
    for (var v = 0; v <= 10; v += 2) {
      var y = B - (v / 10) * (B - T);
      h += '<line x1="' + L + '" x2="' + R + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" style="stroke:' + BD.grid + '" stroke-width="1"/>';
      h += bdText(L - 6, y + 4, String(v), { anchor: 'end', size: 10, color: BD.mute });
    }
    return h;
  }
  // Nến biên: chấm = điểm, thanh dọc = [lo, hi], nhãn ±% trên đầu thanh.
  // rows: [{ diem, lo, hi, pct, l1, l2, cur }]
  function bdBandSvg(rows, aria) {
    var W = 640, H = 236, L = 30, R = 632, T = 22, B = 190;
    var sy = function (v) { return B - (Math.max(0, Math.min(10, v)) / 10) * (B - T); };
    var bw = (R - L) / rows.length, cw = Math.min(16, bw * 0.42);
    var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + bdEsc(aria) + '" style="width:100%;height:auto;display:block">';
    rows.forEach(function (r, i) {
      if (r.cur) h += '<rect x="' + (L + i * bw).toFixed(1) + '" y="' + (T - 18) + '" width="' + bw.toFixed(1) + '" height="' + (B - T + 18) + '" rx="4" style="fill:' + BD.cur + '"/>';
    });
    h += bdAxes(L, R, T, B);
    var pts = rows.map(function (r, i) { return [L + i * bw + bw / 2, sy(r.diem)]; });
    h += '<path d="M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L') + '" fill="none" style="stroke:' + BD.mute + '" stroke-width="1.5" stroke-opacity=".7"/>';
    rows.forEach(function (r, i) {
      var cx = pts[i][0];
      h += '<rect x="' + (cx - cw / 2).toFixed(1) + '" y="' + sy(r.hi).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + Math.max(1, sy(r.lo) - sy(r.hi)).toFixed(1) + '" rx="3" style="fill:' + BD.band + '" fill-opacity=".35"/>';
      h += '<line x1="' + (cx - cw / 2).toFixed(1) + '" x2="' + (cx + cw / 2).toFixed(1) + '" y1="' + sy(r.hi).toFixed(1) + '" y2="' + sy(r.hi).toFixed(1) + '" style="stroke:' + BD.band + '" stroke-width="2"/>';
      h += '<line x1="' + (cx - cw / 2).toFixed(1) + '" x2="' + (cx + cw / 2).toFixed(1) + '" y1="' + sy(r.lo).toFixed(1) + '" y2="' + sy(r.lo).toFixed(1) + '" style="stroke:' + BD.band + '" stroke-width="2"/>';
      h += '<circle cx="' + cx.toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="4.5" style="fill:' + BD.ink + '"/>';
      h += bdText(cx, sy(r.hi) - 5, '±' + bdPct(r.pct), { anchor: 'middle', size: 10, bold: true, color: BD.bandDark });
      h += bdText(cx, B + 16, r.l1, { anchor: 'middle', size: 11, bold: !!r.cur, color: r.cur ? BD.red : BD.ink });
      h += bdText(cx, B + 30, r.l2, { anchor: 'middle', size: 9.5, color: BD.mute });
    });
    return h + '</svg>';
  }
  function bdSaoDong(list) {
    var seen = {}, out = [];
    list.forEach(function (d) { if (!seen[d.ten]) { seen[d.ten] = 1; out.push(d.ten); } });
    return out.length ? out.join(', ') : 'không có sao động';
  }
  function bdTieuVanNamXem(ls) {
    var tvs = ls && ls.tieuVanScores;
    if (!tvs || !tvs.length || !tvs[0].bienDong || !ls.bienDongGoc || ls.tuoiXem == null) return -1;
    return tvs.findIndex(function (t) { return t.tuoi === ls.tuoiXem; });
  }
  function bdCungIdx(ls, ten) {
    var p = (ls.palaces || []).find(function (x) { return x.cungName === ten; });
    return p ? p.idx : -1;
  }
  var BD_GHI_CHU = 'Chấm là điểm, thanh vàng là khoảng dao động. Biên = điểm × (1 ± tỉ lệ sao động trong tam phương tứ chính của cung hạn), sao động có trọng số theo hạng sao.';

  /** Phần 24 — 10 năm kể từ năm xem: điểm năm (nội suy từ đại vận) + biên. */
  function buildVanNamHtml(ls) {
    var i0 = bdTieuVanNamXem(ls);
    if (i0 < 0) return '';
    var tvs = ls.tieuVanScores.slice(i0, i0 + 10);
    var dsOf = function (t) { var c = bdCungIdx(ls, t.tieuHanCung); return ((c >= 0 && ls.bienDongGoc[c]) ? ls.bienDongGoc[c].ds : []).concat(t.bienDong.luu || []); };
    var rows = tvs.map(function (t, i) {
      return { diem: t.mainScore, lo: t.bienDong.lo, hi: t.bienDong.hi, pct: t.bienDong.pct, l1: String(t.nam), l2: t.tieuHanCung, cur: i === 0 };
    });
    var x = tvs[0], dong = tvs.reduce(function (a, b) { return b.bienDong.pct > a.bienDong.pct ? b : a; });
    var h = '<div class="pregen-block"><div class="pregen-title">Mười năm tới — điểm năm và biên dao động</div>';
    h += bdBandSvg(rows, 'Điểm và biên dao động ' + tvs[0].nam + ' đến ' + tvs[tvs.length - 1].nam);
    h += '<div style="font-size:13px;line-height:1.55;margin-top:8px;color:#1a1a1a">';
    h += '<div>Năm <b>' + x.nam + '</b> (' + bdCanChiNam(x.nam) + ', tiểu hạn ' + bdEsc(x.tieuHanCung) + '): điểm <b>' + bdF(x.mainScore) + '</b>, dao động ' + bdF(x.bienDong.lo) + '–' + bdF(x.bienDong.hi) + ' (±' + bdPct(x.bienDong.pct) + '). Sao động: ' + bdEsc(bdSaoDong(dsOf(x))) + '.</div>';
    if (dong !== x) h += '<div>Động nhất: <b>' + dong.nam + '</b> (±' + bdPct(dong.bienDong.pct) + ', tiểu hạn ' + bdEsc(dong.tieuHanCung) + ') — ' + bdEsc(bdSaoDong(dsOf(dong))) + '.</div>';
    h += '</div><div style="font-size:11px;color:#666;margin-top:6px">' + BD_GHI_CHU + '</div></div>';
    return h;
  }

  /** Phần 24 — 12 tháng âm lịch của năm xem (engine `tinhVanThang`). */
  function buildVanThangHtml(ls) {
    var i0 = bdTieuVanNamXem(ls);
    if (i0 < 0 || typeof root.tinhVanThang !== 'function') return '';
    var nam = ls.tieuVanScores[i0].nam;
    var ms = root.tinhVanThang(ls, nam);
    if (!ms || ms.length !== 12) return '';
    var ten = function (m) { var p = (ls.palaces || []).find(function (x) { return x.idx === m.cungIdx; }); return p ? p.cungName : ''; };
    var rows = ms.map(function (m) { return { diem: m.diem, lo: m.lo, hi: m.hi, pct: m.pct, l1: 'Th ' + m.thang, l2: ten(m) }; });
    var dong = ms.reduce(function (a, b) { return b.pct > a.pct ? b : a; });
    var yen = ms.reduce(function (a, b) { return b.pct < a.pct ? b : a; });
    var dsOf = function (m) { return ((ls.bienDongGoc && ls.bienDongGoc[m.cungIdx]) ? ls.bienDongGoc[m.cungIdx].ds : []).concat(m.luu || []); };
    var h = '<div class="pregen-block"><div class="pregen-title">Mười hai tháng âm lịch năm ' + bdEsc(bdCanChiNam(nam)) + ' ' + nam + '</div>';
    h += bdBandSvg(rows, 'Điểm và biên dao động 12 tháng âm lịch năm ' + nam);
    h += '<div style="font-size:13px;line-height:1.55;margin-top:8px;color:#1a1a1a">';
    h += '<div>Động nhất: <b>tháng ' + dong.thang + '</b> (nguyệt hạn ' + bdEsc(ten(dong)) + ', ±' + bdPct(dong.pct) + ') — ' + bdEsc(bdSaoDong(dsOf(dong))) + '.</div>';
    h += '<div>Yên nhất: <b>tháng ' + yen.thang + '</b> (nguyệt hạn ' + bdEsc(ten(yen)) + ', ±' + bdPct(yen.pct) + ').</div>';
    h += '</div><div style="font-size:11px;color:#666;margin-top:6px">Điểm tháng nội suy từ điểm các năm. ' + BD_GHI_CHU + '</div></div>';
    return h;
  }

  /** Phần 14 — 4 chủ đề qua 9 đại vận (engine `chuDeDaiVan`). */
  function buildChuDeDaiVanHtml(ls) {
    var cd = ls && ls.chuDeDaiVan;
    if (!cd || cd.length < 2) return '';
    var KEYS = ['su_nghiep', 'tai_loc', 'tinh_duyen', 'suc_khoe'];
    if (!cd.every(function (d) { return KEYS.every(function (k) { return d.chuDe && d.chuDe[k]; }); })) return '';
    var cur = ls.daiVanHienTai, ci = cd.findIndex(function (d) { return cur && d.tuoiStart === cur.tuoiStart; });
    var W = 640, H = 240, L = 36, R = 632, T = 22, B = 196;
    var sy = function (v) { return B - (Math.max(0, Math.min(10, v)) / 10) * (B - T); };
    var cw = (R - L) / cd.length, sx = function (i) { return L + (i + 0.5) * cw; };
    var h = '<div class="pregen-block"><div class="pregen-title">Bốn chuyện lớn qua 9 đại vận</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;margin-bottom:4px;color:#1a1a1a">' + KEYS.map(function (k) {
      return '<span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;background:' + CHU_DE_MAU[k] + '"></i>' + bdEsc(cd[0].chuDe[k].ten) + '</span>';
    }).join('') + '</div>';
    h += '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bốn đường chủ đề qua 9 đại vận" style="width:100%;height:auto;display:block">';
    if (ci >= 0) {
      h += '<rect x="' + (sx(ci) - cw / 2).toFixed(1) + '" y="' + (T - 18) + '" width="' + cw.toFixed(1) + '" height="' + (B - T + 18) + '" rx="4" style="fill:' + BD.cur + '"/>';
      h += bdText(sx(ci), T - 6, 'Đang ở đây', { anchor: 'middle', size: 9.5, bold: true, color: BD.red });
    }
    // Trục KHÔNG in số (Henry chốt: điểm chủ đề suy từ điểm cung, không đưa
    // ra cho người xem — chỉ điểm đại vận mới được hiện số). Chỉ ghi mạnh/yếu.
    for (var gv = 0; gv <= 10; gv += 2) {
      var gy = B - (gv / 10) * (B - T);
      h += '<line x1="' + L + '" x2="' + R + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '" style="stroke:' + BD.grid + '" stroke-width="1"/>';
    }
    h += bdText(L - 4, T + 4, 'mạnh', { anchor: 'end', size: 10, color: BD.mute }) + bdText(L - 4, B, 'yếu', { anchor: 'end', size: 10, color: BD.mute });
    // Chỉ vẽ đại vận trong độ tuổi CÓ NGHĨA của chủ đề (engine `trongTuoi`;
    // engine cũ thiếu cờ ⇒ coi là có). Ra/vào khoảng tuổi thì đường đứt.
    var co = function (d, k) { return d.chuDe[k].trongTuoi !== false; };
    KEYS.forEach(function (k) {
      var dd = '';
      cd.forEach(function (d, i) {
        if (!co(d, k)) return;
        dd += (i > 0 && co(cd[i - 1], k) ? ' L' : ' M') + sx(i).toFixed(1) + ',' + sy(d.chuDe[k].diem).toFixed(1);
        h += '<circle cx="' + sx(i).toFixed(1) + '" cy="' + sy(d.chuDe[k].diem).toFixed(1) + '" r="3.5" style="fill:' + CHU_DE_MAU[k] + '"/>';
      });
      if (dd) h += '<path d="' + dd.trim() + '" fill="none" style="stroke:' + CHU_DE_MAU[k] + '" stroke-width="2.5" stroke-linejoin="round"/>';
    });
    cd.forEach(function (d, i) {
      h += bdText(sx(i), B + 16, d.tuoiStart + '–' + d.tuoiEnd, { anchor: 'middle', size: 11, bold: i === ci, color: i === ci ? BD.red : BD.ink });
      h += bdText(sx(i), B + 30, 'Mệnh ở ' + d.diaChi, { anchor: 'middle', size: 9.5, color: BD.mute });
    });
    h += '</svg>';
    if (ci >= 0) {
      var c = cd[ci];
      var xs = KEYS.filter(function (k) { return co(c, k); }).map(function (k) { return c.chuDe[k]; }).sort(function (a, b) { return b.diem - a.diem; });
      if (xs.length >= 2) h += '<div style="font-size:13px;line-height:1.55;margin-top:8px;color:#1a1a1a">Đang đi đại vận ' + c.tuoiStart + '–' + c.tuoiEnd + ' (Mệnh tạm ở ' + bdEsc(c.diaChi) + '): ' +
        'mạnh nhất <b>' + bdEsc(xs[0].ten.toLowerCase()) + '</b>, yếu nhất <b>' + bdEsc(xs[xs.length - 1].ten.toLowerCase()) + '</b>.</div>';
    }
    h += '<div style="font-size:11px;color:#666;margin-top:6px">Cung đại vận làm Mệnh tạm, các cung khác dời theo và mượn sao của cung dời tới. Mỗi chủ đề chỉ vẽ trong độ tuổi có nghĩa: sự nghiệp, tài lộc 18–65 · tình duyên 16–60 · sức khỏe cả đời.</div></div>';
    return h;
  }

  /** Phần 1 — ngũ hành Tứ Trụ. Cần `tinhBatTu` (tubinh-ansao-engine.js, nạp
   *  `defer` ở trang) và ngày DƯƠNG + giờ (`ls._duong`, trang gắn lúc lập lá số).
   *  Dựng chỗ trống trước, vẽ sau khi HTML đã vào DOM; không vẽ được thì gỡ khối. */
  var _nhSeq = 0;
  var GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  function buildNguHanhHtml(ls) {
    var du = ls && ls._duong;
    if (!du || !du.d || !du.m || !du.y || typeof document === 'undefined') return '';
    var id = 'lg-nguhanh-' + (++_nhSeq);
    setTimeout(function () { mountNguHanh(id, ls, 0); }, 0);
    return '<div class="pregen-block" id="' + id + '"><div class="pregen-title">Ngũ hành theo Tứ Trụ</div><div data-nh-body style="min-height:180px"></div></div>';
  }
  function mountNguHanh(id, ls, tries) {
    var host = document.getElementById(id);
    if (!host) return;
    if (typeof root.tinhBatTu !== 'function') {
      if (tries < 20) { setTimeout(function () { mountNguHanh(id, ls, tries + 1); }, 250); return; }
      host.parentNode.removeChild(host);
      return;
    }
    var du = ls._duong, bt;
    var gio = (typeof du.h === 'number' && !isNaN(du.h)) ? du.h : GIO_HOURS[(ls._conv && ls._conv.gioIdx) || 0];
    try {
      bt = root.tinhBatTu({ ngayDL: du.d, thangDL: du.m, namDL: du.y, gio: gio, gioitinh: du.gt === 'nu' ? 'nu' : 'nam' });
    } catch (e) {
      if (root.console) console.error('[luan-giai-core] tinhBatTu', e);
    }
    var nh = bt && bt.nguHanh, W = nh && nh.weighted;
    if (!W || !bt.tuTru) { host.parentNode.removeChild(host); return; }
    var N = [['Mộc', '#2E7D5B'], ['Hỏa', '#C0392B'], ['Thổ', '#A8843A'], ['Kim', '#8C8C8C'], ['Thủy', '#1455A4']];
    var tot = N.reduce(function (a, x) { return a + (W[x[0]] || 0); }, 0);
    if (!tot) { host.parentNode.removeChild(host); return; }
    var a0 = -Math.PI / 2, svg = '<svg viewBox="-110 -110 220 220" role="img" aria-label="Tỉ lệ ngũ hành Tứ Trụ" style="width:100%;max-width:190px;height:auto;display:block;margin:0 auto">';
    var P = function (r, a) { return (r * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2); };
    N.forEach(function (x) {
      var v = W[x[0]] || 0;
      if (!v) return;
      var a1 = a0 + v / tot * 2 * Math.PI, lg = a1 - a0 > Math.PI ? 1 : 0;
      svg += '<path d="M' + P(100, a0) + ' A100,100 0 ' + lg + ' 1 ' + P(100, a1) + ' L' + P(62, a1) + ' A62,62 0 ' + lg + ' 0 ' + P(62, a0) + 'Z" style="fill:' + x[1] + ';stroke:#F5F5F5" stroke-width="2"/>';
      if (a1 - a0 > 0.35) { var am = (a0 + a1) / 2; svg += bdText(81 * Math.cos(am), 81 * Math.sin(am) + 4, x[0], { anchor: 'middle', size: 11, bold: true, color: '#fff' }); }
      a0 = a1;
    });
    svg += bdText(0, -2, bt.nhatCan || '', { anchor: 'middle', size: 22, bold: true }) + bdText(0, 18, 'nhật chủ', { anchor: 'middle', size: 11, color: BD.mute }) + '</svg>';
    var sorted = N.slice().sort(function (a, b) { return (W[b[0]] || 0) - (W[a[0]] || 0); });
    var mx = W[sorted[0][0]] || 1;
    var tru = bt.tuTru.map(function (t, i) { return '<div style="border:1px solid #e0e0e0;border-radius:6px;background:#fff;padding:4px 10px;text-align:center"><div style="font-size:10px;color:#666">' + ['Năm', 'Tháng', 'Ngày', 'Giờ'][i] + '</div><b>' + bdEsc(t.can + ' ' + t.chi) + '</b></div>'; }).join('');
    var bars = sorted.map(function (x) {
      var v = W[x[0]] || 0;
      return '<div style="display:grid;grid-template-columns:42px 1fr 74px;gap:8px;align-items:center;font-size:12.5px"><b>' + x[0] + '</b><span style="display:block;height:10px;border-radius:2px;width:' + (v / mx * 100).toFixed(0) + '%;background:' + x[1] + '"></span><span>' + bdF(v) + ' · ' + Math.round(v / tot * 100) + '%</span></div>';
    }).join('');
    var cn = bt.cuongNhuoc, dt = bt.dungThan;
    var ket = 'Vượng nhất <b>' + bdEsc(nh.dominant) + '</b>, thiếu nhất <b>' + bdEsc(nh.deficient) + '</b>.' +
      (cn && cn.label ? ' Nhật chủ ' + bdEsc(bt.nhatCan) + ', thân ' + bdEsc(String(cn.label).toLowerCase()) + (typeof cn.score === 'number' ? ' (' + bdF(cn.score) + '/10)' : '') + '.' : '') +
      (dt && dt.primary ? ' Dụng thần <b>' + bdEsc(dt.primary) + '</b>' + (dt.secondary ? ', hỷ thần ' + bdEsc(dt.secondary) : '') + '.' : '');
    var body = host.querySelector('[data-nh-body]');
    body.style.minHeight = '';
    body.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;color:#1a1a1a"><div style="flex:0 1 190px;min-width:150px">' + svg + '</div>' +
      '<div style="flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:8px"><div style="display:flex;flex-wrap:wrap;gap:6px">' + tru + '</div>' + bars +
      '<div style="font-size:13px;line-height:1.5">' + ket + '</div></div></div>' +
      '<div style="font-size:11px;color:#666;margin-top:6px">Tính bằng engine Tử Bình: can lộ mỗi can 1, tàng can trong chi theo trọng số tàng can.</div>';
  }

  var API = { TONG_PHAN: TONG_PHAN, buildVanNamHtml: buildVanNamHtml, buildVanThangHtml: buildVanThangHtml, buildChuDeDaiVanHtml: buildChuDeDaiVanHtml, buildNguHanhHtml: buildNguHanhHtml, PHAN_LABELS_BASE: PHAN_LABELS_BASE, phanLabels: phanLabels, buildPreGenHtml: buildPreGenHtml, buildCalcSectionHtml: buildCalcSectionHtml, buildCungStarHtml: buildCungStarHtml, buildTuHoaPhiTinhHtml: buildTuHoaPhiTinhHtml, renderInlineDaiVanLineChart: renderInlineDaiVanLineChart };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LuanGiaiCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
