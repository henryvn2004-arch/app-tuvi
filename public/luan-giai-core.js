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
   Public API: window.LuanGiaiCore = { TONG_PHAN, PHAN_LABELS_BASE, phanLabels, buildPreGenHtml, renderInlineDaiVanLineChart }. */
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
    var h = '<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🚀" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🚀</span> Tứ Hóa Phi Tinh (can cung ' + canCung + ')</div>';
    rows.forEach(function (r) {
      var cls = r.hoa === 'Kỵ' ? 'yn-hung' : 'yn-cat';
      var selfBadge = r.self ? ' <span style="color:#7B3FA0;font-weight:700">[TỰ HÓA]</span>' : '';
      h += '<div class="pregen-yn ' + cls + '">Hóa ' + r.hoa + ': <b>' + r.star + '</b> → phi nhập cung <b>' + r.target.cungName + '</b> (' + r.target.diaChi + ')' + selfBadge + '</div>';
    });
    h += '</div>';
    return h;
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
    h += `<div class="pregen-block"><div class="pregen-title">⭐ Chính tinh cung</div>`;
    if (majorStars.length === 0) {
      const xung = pal.xungChieuCung;
      const xungStars = xung ? (xung.majorStars || []).map((s) => `${s.ten}(${s.brightness || ''})`).join(', ') : '';
      h += `<div class="pregen-yn yn-neutral">Vô chính diệu${xungStars ? ` — mượn từ cung xung: <span style="color:#5FA8D3">${xungStars}</span>` : ''}</div>`;
    } else {
      majorStars.forEach((s) => {
        const bCol = s.brightness === 'Miếu' || s.brightness === 'Vượng' ? '#4ade80' : s.brightness === 'Đắc' ? '#86efac' : s.brightness === 'Bình hòa' || s.brightness === 'Bình' ? '#60a5fa' : '#f87171';
        h += `<div class="pregen-yn yn-neutral"><span style="font-weight:600;color:#ddd">${s.ten}</span> <span style="color:${bCol};font-size:11px">(${s.brightness || ''})</span>${s.hoa ? ` <span style="color:#5FA8D3">[Hóa ${s.hoa}]</span>` : ''}</div>`;
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
      h += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔍" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🔍</span> Sao tam phương tứ chính</div>`;
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
  function buildPreGenHtml(phan, ls) {
    if (!ls) return '';
    var _astrolabe = ls;
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
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">⚙</span> Cách cục đặc biệt</div>`;
        cc.forEach(c => { preGenHtml += `<div class="pregen-item"><span class="cc-label cc-${c.loai}">${c.ten}</span><span class="cc-mota">${c.moTa}</span></div>`; });
        preGenHtml += `</div>`;
      }
      if (_astrolabe.cungScores) {
        const METRICS = ['thienVan','canCo','mayMan','phuTro','binhYen','benVung'];
        const top3 = Object.entries(_astrolabe.cungScores).map(([c,sc])=>[c,METRICS.reduce((s,m)=>s+sc[m],0)]).sort((a,b)=>b[1]-a[1]).slice(0,3);
        const bot3 = Object.entries(_astrolabe.cungScores).map(([c,sc])=>[c,METRICS.reduce((s,m)=>s+sc[m],0)]).sort((a,b)=>a[1]-b[1]).slice(0,3);
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📊" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📊</span> Điểm mạnh / yếu nổi bật</div>`;
        preGenHtml += `<div class="pregen-row"><span class="pregen-good">Mạnh nhất: ${top3.map(([c,s])=>`${c} (${s.toFixed(0)})`).join(', ')}</span></div>`;
        preGenHtml += `<div class="pregen-row"><span class="pregen-bad">Yếu nhất: ${bot3.map(([c,s])=>`${c} (${s.toFixed(0)})`).join(', ')}</span></div>`;
        preGenHtml += `</div>`;
      }
    } else if (cungForPhan) {
      // FIX shell: KHÔNG gate cả khối cung theo cachCucTungCung — cung nào cũng
      // render điểm 6 chiều (cungScores) + cách cục; standalone che được vì có
      // AI prose lấp, còn shell không có AI ở giữa nên cung thiếu phân tích sao
      // (vd Tử Tức/Huynh Đệ) bị TRỐNG. ynItems rỗng thì bỏ qua khối "phân tích sao".
      const ynItems = _astrolabe.cachCucTungCung?.[cungForPhan] || [];
      const ccItems = (_astrolabe.cachCuc||[]).filter(c => c.cung === cungForPhan);
      const sc = _astrolabe.cungScores?.[cungForPhan];
      if (ccItems.length > 0) {
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">⚙</span> Cách cục đặc biệt</div>`;
        ccItems.forEach(c => { preGenHtml += `<div class="pregen-item"><span class="cc-label cc-${c.loai}">${c.ten}</span></div>`; });
        preGenHtml += `</div>`;
      }
      // Sao ở cung (LUÔN có) — chính tinh + tam phương tứ chính; đứng trước "Phân
      // tích sao" (ý nghĩa cách cục, có thể rỗng) để cung nào cũng đủ dữ liệu sao.
      preGenHtml += buildCungStarHtml(cungForPhan, _astrolabe);
      if (ynItems.length > 0) {
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📋" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📋</span> Phân tích sao</div>`;
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
        preGenHtml += `<div class="pregen-block pregen-scores"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📈" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📈</span> Đánh giá 6 chiều</div><div class="score-bars">`;
        METRICS.forEach((m,i) => {
          const v=sc[m]; const pct=v*10;
          const col=v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
          preGenHtml += `<div class="score-bar-row"><span class="score-label">${MV[i]}</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${pct}%;background:${col}"></div></div><span class="score-val">${v}</span></div>`;
        });
        preGenHtml += `</div></div>`;
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
        preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📈" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📈</span> 9 đại vận — biểu đồ điểm số</div>`;
        preGenHtml += `<div style="position:relative;height:240px;margin-top:8px"><canvas id="chart-daivan-overview"></canvas></div>`;
        preGenHtml += `<div style="font-size:11px;color:#666;margin-top:12px;line-height:1.5">`;
        preGenHtml += `· Khởi vận: ${dvs[0].tuoiStart} tuổi · Hướng: ${thuan ? 'thuận' : 'nghịch'}<br>`;
        if (curIdx >= 0) {
          const c = dvs[curIdx];
          preGenHtml += `· Hiện tại: ĐV${curIdx + 1} (${canChiDaiVan(_astrolabe, c)}, ${c.tuoiStart}-${c.tuoiEnd}t)${c.scoring ? ' · ' + c.scoring.tong + '/10' : ''}`;
        }
        preGenHtml += `</div></div>`;
      }
    } else if ((phan >= 15 && phan <= 23) || phan === 24) {
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
            preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📊" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📊</span> Scoring đại vận — Cung ${dvCungName} (${dvDC})</div><div class="score-bars">
              <div class="score-bar-row"><span class="score-label">Thiên Thời</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${ttBar}%;background:#c9a84c"></div></div><span class="score-val">${ttScore}/5</span></div>
              <div class="score-bar-row"><span class="score-label">Địa Lợi</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${dlBar}%;background:#0E7490"></div></div><span class="score-val">${dlScore}/1</span></div>
              <div class="score-bar-row"><span class="score-label">Nhân Hòa</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${nhBar}%;background:#7B2FBE"></div></div><span class="score-val">${nhScore}/4</span></div>
              <div class="score-bar-row" style="border-top:1px solid #1e2e42;padding-top:6px;margin-top:2px"><span class="score-label" style="font-weight:600;color:#ddd">Tổng ${sc.flag}</span><div class="score-bar-bg"><div class="score-bar-fill" style="width:${totBar}%;background:${totCol}"></div></div><span class="score-val" style="color:${totCol};font-weight:600">${sc.tong}/10</span></div>
            </div>${sc.nhanHoa?.boMenh?`<div style="font-size:11px;color:#666;margin-top:6px">Bộ Mệnh: <span style="color:#aaa">${sc.nhanHoa.boMenh}</span> → Bộ ĐV: <span style="color:#aaa">${sc.nhanHoa.boVan}</span></div>`:''}</div>`;
          }
          const majorStars=dvPalace.majorStars||[], allStars=dvPalace.stars||[];
          const SAT=['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
          const BAI=['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
          const CAT=['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật','Lộc Tồn','Hóa Lộc','Hóa Quyền','Hóa Khoa'];
          preGenHtml += `<div class="pregen-block"><div class="pregen-title">⭐ Chính tinh cung đại vận</div>`;
          if (majorStars.length===0) {
            const xung=dvPalace.xungChieuCung, xungStars=xung?(xung.majorStars||[]).map(s=>`${s.ten}(${s.brightness||''})`).join(', '):'';
            preGenHtml += `<div class="pregen-yn yn-neutral">Vô chính diệu${xungStars?` — mượn từ cung xung: <span style="color:#5FA8D3">${xungStars}</span>`:''}</div>`;
          } else {
            majorStars.forEach(s => {
              const bCol=s.brightness==='Miếu'||s.brightness==='Vượng'?'#4ade80':s.brightness==='Đắc'?'#86efac':s.brightness==='Bình hòa'||s.brightness==='Bình'?'#60a5fa':'#f87171';
              preGenHtml += `<div class="pregen-yn yn-neutral"><span style="font-weight:600;color:#ddd">${s.ten}</span> <span style="color:${bCol};font-size:11px">(${s.brightness||''})</span>${s.hoa?` <span style="color:#5FA8D3">[Hóa ${s.hoa}]</span>`:''}</div>`;
            });
          }
          preGenHtml += `</div>`;
          const tptcPalaces=[dvPalace,...(dvPalace.tamHopCungs||[]),dvPalace.xungChieuCung].filter(Boolean);
          const tptcNames=tptcPalaces.flatMap(p=>(p.stars||[]).map(s=>s.ten));
          const satIn=SAT.filter(s=>tptcNames.includes(s)), baiIn=BAI.filter(s=>tptcNames.includes(s)), catIn=CAT.filter(s=>tptcNames.includes(s));
          const hasTuan=allStars.some(s=>s.ten==='Tuần'), hasTriet=allStars.some(s=>s.ten==='Triệt');
          if (catIn.length||satIn.length||baiIn.length||hasTuan||hasTriet) {
            preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔍" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🔍</span> Sao tam phương tứ chính</div>`;
            if (catIn.length) preGenHtml += `<div class="pregen-yn yn-cat">Cát tinh: ${catIn.join(', ')}</div>`;
            if (satIn.length) preGenHtml += `<div class="pregen-yn yn-hung">Sát tinh: ${satIn.join(', ')}</div>`;
            if (baiIn.length) preGenHtml += `<div class="pregen-yn yn-hung" style="color:#fca5a5">Bại tinh: ${baiIn.join(', ')}</div>`;
            if (hasTuan) preGenHtml += `<div class="pregen-yn yn-tuan">Tuần án ngữ cung đại vận</div>`;
            if (hasTriet) preGenHtml += `<div class="pregen-yn yn-tuan">Triệt án ngữ cung đại vận</div>`;
            preGenHtml += `</div>`;
          }
          const ccDV=(_astrolabe.cachCuc||[]).filter(c=>c.cung===dvCungName||c.cung==='');
          if (ccDV.length>0) {
            preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">⚙</span> Cách cục liên quan</div>`;
            ccDV.forEach(c=>{ preGenHtml += `<div class="pregen-item"><span class="cc-label cc-${c.loai}">${c.ten}</span><span class="cc-mota">${c.moTa}</span></div>`; });
            preGenHtml += `</div>`;
          }
          const dvRules=dv.rules||[];
          if (dvRules.length>0) {
            const totR=dvRules.filter(r=>r.type==='tot'), xauR=dvRules.filter(r=>r.type==='xau');
            const cbR=dvRules.filter(r=>r.type==='canh_bao'), trungR=dvRules.filter(r=>r.type==='trung');
            preGenHtml += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔮" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🔮</span> Luận đoán vận hạn</div>`;
            if (totR.length) { preGenHtml += `<div class="rules-group">`; totR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-cat">✦ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            if (trungR.length) { preGenHtml += `<div class="rules-group">`; trungR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-neutral">◆ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            if (xauR.length) { preGenHtml += `<div class="rules-group">`; xauR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-hung">▼ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            if (cbR.length) { preGenHtml += `<div class="rules-group rules-canh-bao">`; cbR.forEach(r=>{ preGenHtml += `<div class="pregen-yn yn-great-hung">⚠ ${r.text}</div>`; }); preGenHtml += `</div>`; }
            preGenHtml += `</div>`;
          }
        }
      }
    }
    return preGenHtml;
  }

  // Vẽ canvas #chart-daivan-overview mà buildPreGenHtml(14, ls) đã dựng HTML —
  // PHẢI gọi SAU khi HTML đó đã chèn vào DOM thật (giống
  // BatTuCore.renderInlineDaiVanLineChart, đúng khuôn màu #9A7B3A/#061A2E/
  // #C0392B). Không có canvas / thiếu Chart.js / thiếu daiVans → im lặng bỏ
  // qua (DOM chưa có phần 14, hoặc Chart.js chưa nạp).
  function renderInlineDaiVanLineChart(ls) {
    if (typeof Chart === 'undefined' || !ls) return;
    var canvas = (typeof document !== 'undefined') ? document.getElementById('chart-daivan-overview') : null;
    var dvs = (ls.daiVans || []).slice(0, 9);
    if (!canvas || !dvs.length) return;
    var cur = ls.daiVanHienTai;
    var labels = dvs.map(function (dv, i) { return 'ĐV' + (i + 1) + ' (' + dv.tuoiStart + '-' + dv.tuoiEnd + 't)'; });
    var scores = dvs.map(function (dv) { return dv.scoring ? dv.scoring.tong : 0; });
    if (root._lgDaiVanChart) { try { root._lgDaiVanChart.destroy(); } catch (e) {} }
    root._lgDaiVanChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Điểm Vận',
          data: scores,
          borderColor: '#9A7B3A',
          backgroundColor: 'rgba(154,123,58,0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: dvs.map(function (dv) { return cur && dv.cungIdx === cur.cungIdx ? '#C0392B' : '#061A2E'; }),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 10, ticks: { stepSize: 2, font: { size: 11 } } },
          x: { ticks: { font: { size: 10 }, maxRotation: 30, minRotation: 0 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            title: function (items) { return labels[items[0].dataIndex]; },
            label: function (item) {
              var dv = dvs[item.dataIndex];
              var palace = ls.palaces && ls.palaces[dv.cungIdx];
              return [
                (palace ? 'Cung ' + palace.cungName + ' (' + canChiDaiVan(ls, dv) + ')' : canChiDaiVan(ls, dv)),
                'Điểm: ' + (dv.scoring ? dv.scoring.tong : '—') + '/10',
                dv.tuoiStart + '-' + dv.tuoiEnd + ' tuổi',
              ];
            },
          } },
        },
      },
    });
  }

  var API = { TONG_PHAN: TONG_PHAN, PHAN_LABELS_BASE: PHAN_LABELS_BASE, phanLabels: phanLabels, buildPreGenHtml: buildPreGenHtml, buildCungStarHtml: buildCungStarHtml, buildTuHoaPhiTinhHtml: buildTuHoaPhiTinhHtml, renderInlineDaiVanLineChart: renderInlineDaiVanLineChart };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LuanGiaiCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
