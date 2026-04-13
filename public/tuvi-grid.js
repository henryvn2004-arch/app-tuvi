/**
 * tuvi-grid.js — Shared lá số grid renderer cho Tử Vi Minh Bảo
 *
 * Exports (global):
 *   TuviGrid.renderCell(palace, dvTuoi, canNamIdx, isCurVan) → HTML string
 *   TuviGrid.displayResult(hoten, ngay, thang, nam, gioitinh, namXem, ls, opts)
 *   TuviGrid.renderCompact(ls, label, colorVar) → HTML string (compact cho xem-tuoi)
 *   TuviGrid.loadingHtml(label, sub) → HTML string (.tvm-wrap loading block)
 *   TuviGrid.updateMucLuc(phan, status, prefix) → cập nhật sidebar
 */

const TuviGrid = (() => {

  const _CAN  = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
  const _CHI  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const _GRID_DC = [[5,6,7,8],[4,-1,-1,9],[3,-1,-1,10],[2,1,0,11]];

  const _CHINH_COLOR = {
    'Tử Vi':'tho','Thiên Cơ':'moc','Thái Dương':'hoa','Vũ Khúc':'kim',
    'Thiên Đồng':'thuy','Liêm Trinh':'hoa','Thiên Phủ':'tho','Thái Âm':'thuy',
    'Tham Lang':'thuy','Cự Môn':'thuy','Thiên Tướng':'thuy','Thiên Lương':'moc',
    'Thất Sát':'kim','Phá Quân':'thuy',
  };
  const _TRANG_SINH_SET = new Set(['Tràng Sinh','Mộc Dục','Quan Đới','Lâm Quan','Đế Vượng','Suy','Bệnh','Tử','Mộ','Tuyệt','Thai','Dưỡng']);
  const _BC_MAP = {Miếu:'M',Vượng:'V',Đắc:'Đ',Bình:'B',Hãm:'H'};
  const _BAD_TYPES = new Set(['sát tinh','hung tinh','bại tinh']);

  function _getElemClass(n) {
    const d = (typeof STAR_DATA !== 'undefined') ? STAR_DATA[n] : null;
    if (!d?.element) return 'sc-neutral';
    return {'kim':'sc-kim','mộc':'sc-moc','thủy':'sc-thuy','hỏa':'sc-hoa','thổ':'sc-tho'}[d.element.toLowerCase()] || 'sc-neutral';
  }
  function _getStarCls(s) {
    if (s.nhom === 'chinh') return 'sc-' + (_CHINH_COLOR[s.ten] || 'neutral');
    if (s.hoa === 'Lộc')    return 'sc-hoa-loc';
    if (s.hoa === 'Quyền')  return 'sc-hoa-quyen';
    if (s.hoa === 'Khoa')   return 'sc-hoa-khoa';
    if (s.hoa === 'Kỵ')     return 'sc-hoa-ky';
    return _getElemClass(s.ten);
  }
  function _getCungCan(ci, di) { return (((ci % 5) * 2 + di) % 10); }
  function _bShort(b) { return _BC_MAP[b] || ''; }
  function _isHung(s) {
    const d = (typeof STAR_DATA !== 'undefined') ? STAR_DATA[s.ten] : null;
    return _BAD_TYPES.has(d?.type || '');
  }

  // ── renderCell: 1 ô cung V2 ──────────────────────────────────
  function renderCell(p, dvTuoi, canNamIdx, isCurVan) {
    const di = _CHI.indexOf(p.diaChi);
    const ci = _getCungCan(canNamIdx, di);
    const canChi = _CAN[ci] + ' ' + _CHI[di];
    const thanBadge = p.isThan ? ` <span class="v2-badge-than">THÂN</span>` : '';
    const tsS = p.stars.find(s => _TRANG_SINH_SET.has(s.ten));
    let tt = '';
    const tuanS  = p.stars.find(s => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt');
    const trietS = p.stars.find(s => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt');
    if (tuanS && trietS) tt = '<span class="v2-tuan-tag">TUẦN+TRIỆT</span>';
    else if (tuanS)      tt = '<span class="v2-tuan-tag">TUẦN</span>';
    else if (trietS)     tt = '<span class="v2-triet-tag">TRIỆT</span>';

    // Chính tinh
    let chinhH = '';
    const hoaFromChinh = [];
    for (const s of p.majorStars) {
      const cls = 'sc-' + (_CHINH_COLOR[s.ten] || 'neutral');
      const b = s.brightness ? ` <span style="font-size:10px">(${_bShort(s.brightness)})</span>` : '';
      if (s.hoa) hoaFromChinh.push(s);
      chinhH += `<div class="v2-chinh-item ${cls}">${s.ten.toUpperCase()}${b}</div>`;
    }

    // Phụ tinh
    const phuStars = p.stars.filter(s =>
      s.nhom !== 'chinh' && !_TRANG_SINH_SET.has(s.ten) &&
      s.ten !== 'Tuần' && s.ten !== 'Triệt' && s.ten !== 'Tuần+Triệt'
    );
    const renderPhu = s => {
      const cls = _getStarCls(s);
      const hung = _isHung(s);
      const b = (hung && s.brightness) ? ` <span style="font-size:8px">(${_bShort(s.brightness)})</span>` : '';
      let nm = s.ten.toUpperCase();
      if (s.hoa) {
        const hc = s.hoa==='Lộc'?'sc-hoa-loc':s.hoa==='Quyền'?'sc-hoa-quyen':s.hoa==='Khoa'?'sc-hoa-khoa':'sc-hoa-ky';
        nm += ` <span class="${hc}" style="font-size:8px">[${s.hoa.charAt(0)}]</span>`;
      }
      return `<div class="v2-phu-item ${cls}" style="${hung?'font-weight:600':''}">${nm}${b}</div>`;
    };

    let catH  = phuStars.filter(s => !_isHung(s)).map(renderPhu).join('');
    const hungH = phuStars.filter(s =>  _isHung(s)).map(renderPhu).join('');
    for (const s of hoaFromChinh) {
      const hc = s.hoa==='Lộc'?'sc-hoa-loc':s.hoa==='Quyền'?'sc-hoa-quyen':s.hoa==='Khoa'?'sc-hoa-khoa':'sc-hoa-ky';
      catH += `<div class="v2-phu-item ${hc}" style="font-weight:700">HÓA ${s.hoa.toUpperCase()}</div>`;
    }

    return `<div class="cung-cell${isCurVan ? ' cur-van' : ''}">
      <div class="v2-cell-header">
        <span class="v2-can-chi">${canChi.toUpperCase()}</span>
        <span class="v2-cung-name">${p.cungName.toUpperCase()}${thanBadge}</span>
      </div>
      <div class="v2-chinh-area">${chinhH}</div>
      <div class="v2-phu-area">
        <div class="v2-phu-col">${catH}</div>
        <div class="v2-phu-col v2-phu-col-right">${hungH}</div>
      </div>
      <div class="v2-footer">
        <span class="v2-trang-sinh">${tsS ? tsS.ten.toUpperCase() : ''}</span>
        <span class="v2-dai-van">${dvTuoi ?? ''}</span>
      </div>
      ${tt}
    </div>`;
  }

  // ── buildGrid: 4×4 grid HTML ─────────────────────────────────
  function buildGrid(ls, centerHtml) {
    const canNamIdx = _CAN.indexOf((ls.canChiNam || '').split(' ')[0]);
    const dvHT = ls.daiVanHienTai;
    const byDC = {};
    for (const p of ls.palaces) byDC[_CHI.indexOf(p.diaChi)] = p;
    let cells = '', centerDone = false;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const di = _GRID_DC[r][c];
        if (di === -1) {
          if (!centerDone) { centerDone = true; cells += centerHtml; }
          continue;
        }
        const p = byDC[di];
        if (!p) { cells += '<div class="cung-cell"></div>'; continue; }
        const isCurVan = dvHT?.cungIdx === _CHI.indexOf(p.diaChi) || dvHT?.cungIdx === p.idx;
        const dv = ls.daiVans.find(d => d.cungIdx === (p.idx ?? _CHI.indexOf(p.diaChi)));
        cells += renderCell(p, dv?.tuoiStart, canNamIdx, isCurVan);
      }
    }
    return cells;
  }

  // ── NAP AM full names ─────────────────────────────────────────
  const NAP_AM_FULL = {
    'Giáp Tý':'Hải Trung Kim','Ất Sửu':'Hải Trung Kim','Bính Dần':'Lô Trung Hỏa','Đinh Mão':'Lô Trung Hỏa',
    'Mậu Thìn':'Đại Lâm Mộc','Kỷ Tỵ':'Đại Lâm Mộc','Canh Ngọ':'Lộ Bàng Thổ','Tân Mùi':'Lộ Bàng Thổ',
    'Nhâm Thân':'Kiếm Phong Kim','Quý Dậu':'Kiếm Phong Kim','Giáp Tuất':'Sơn Đầu Hỏa','Ất Hợi':'Sơn Đầu Hỏa',
    'Bính Tý':'Giản Hạ Thủy','Đinh Sửu':'Giản Hạ Thủy','Mậu Dần':'Thành Đầu Thổ','Kỷ Mão':'Thành Đầu Thổ',
    'Canh Thìn':'Bạch Lạp Kim','Tân Tỵ':'Bạch Lạp Kim','Nhâm Ngọ':'Dương Liễu Mộc','Quý Mùi':'Dương Liễu Mộc',
    'Giáp Thân':'Tuyền Trung Thủy','Ất Dậu':'Tuyền Trung Thủy','Bính Tuất':'Ốc Thượng Thổ','Đinh Hợi':'Ốc Thượng Thổ',
    'Mậu Tý':'Tích Lịch Hỏa','Kỷ Sửu':'Tích Lịch Hỏa','Canh Dần':'Tùng Bách Mộc','Tân Mão':'Tùng Bách Mộc',
    'Nhâm Thìn':'Trường Lưu Thủy','Quý Tỵ':'Trường Lưu Thủy','Giáp Ngọ':'Sa Trung Kim','Ất Mùi':'Sa Trung Kim',
    'Bính Thân':'Sơn Hạ Hỏa','Đinh Dậu':'Sơn Hạ Hỏa','Mậu Tuất':'Bình Địa Mộc','Kỷ Hợi':'Bình Địa Mộc',
    'Canh Tý':'Bích Thượng Thổ','Tân Sửu':'Bích Thượng Thổ','Nhâm Dần':'Kim Bạch Kim','Quý Mão':'Kim Bạch Kim',
    'Giáp Thìn':'Phú Đăng Hỏa','Ất Tỵ':'Phú Đăng Hỏa','Bính Ngọ':'Thiên Hà Thủy','Đinh Mùi':'Thiên Hà Thủy',
    'Mậu Thân':'Đại Dịch Thổ','Kỷ Dậu':'Đại Dịch Thổ','Canh Tuất':'Thoa Xuyến Kim','Tân Hợi':'Thoa Xuyến Kim',
    'Nhâm Tý':'Tang Đố Mộc','Quý Sửu':'Tang Đố Mộc','Giáp Dần':'Đại Khê Thủy','Ất Mão':'Đại Khê Thủy',
    'Bính Thìn':'Sa Trung Thổ','Đinh Tỵ':'Sa Trung Thổ','Mậu Ngọ':'Thiên Thượng Hỏa','Kỷ Mùi':'Thiên Thượng Hỏa',
    'Canh Thân':'Thạch Lựu Mộc','Tân Dậu':'Thạch Lựu Mộc','Nhâm Tuất':'Đại Hải Thủy','Quý Hợi':'Đại Hải Thủy',
  };

  // ── displayResult: render header + full grid vào DOM ─────────
  function displayResult(hoten, ngay, thang, nam, gioitinh, namXem, ls, opts = {}) {
    const {
      headerElId  = 'result-header',
      gridElId    = 'laso-grid',
      legendElId  = 'laso-legend',
      mucLucItems = [],     // array of {id, labelEl} để update DV labels
    } = opts;

    const conv = ls._conv || {};
    const dvHT = ls.daiVanHienTai;
    const tvCung = ls.palaces[ls.tieuHanIdx];
    const ldh    = ls.palaces[ls.luuNienDaiHanIdx];

    // Header
    const headerEl = document.getElementById(headerElId);
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="result-eyebrow">Lá Số Tử Vi</div>
        <div class="result-name">${hoten}</div>
        <div class="result-info">
          <span class="result-info-item">${ngay}/${thang}/${nam} DL</span>
          <span class="result-info-item">${conv.amLich ? conv.amLich.day+'/'+conv.amLich.month+'/'+conv.amLich.year+' ÂL' : ''}</span>
          <span class="result-info-item">${gioitinh === 'nam' ? 'Nam' : 'Nữ'}</span>
          <span class="result-info-item">${ls.canChiNam}</span>
          <span class="result-info-item">Mệnh ${ls.napAm} · ${ls.cuc}</span>
          <span class="result-info-item">Xem năm ${namXem}</span>
        </div>`;
    }

    // Center cell
    const now = new Date();
    const pad = x => String(x).padStart(2,'0');
    const centerHtml = `<div class="cung-center">
      <div class="center-la-so">
        <div class="center-title">✦ ${hoten.toUpperCase()} ✦</div>
        <hr class="center-divider">
        ${conv._dl ? `<div class="center-row">📅 ${conv._dl.day}/${conv._dl.month}/${conv._dl.year} (DL) · giờ ${conv.gioChi||''}</div>` : ''}
        <div class="center-row">📅 ${conv.amLich ? conv.amLich.day+'/'+conv.amLich.month+'/'+conv.amLich.year : ''} (ÂL) · giờ ${conv.gioChi||''}</div>
        <div class="center-row">🎂 ${ls.tuoiXem} tuổi (âm lịch)</div>
        <div class="center-row">⚧ ${gioitinh === 'nam' ? 'Nam' : 'Nữ'}</div>
        <hr class="center-divider">
        <div class="center-row">Năm: <b style="color:var(--navy)">${ls.canChiNam}</b></div>
        <div class="center-row">Mệnh: <b style="color:var(--navy)">${NAP_AM_FULL[ls.canChiNam] || ls.napAm}</b></div>
        <div class="center-row">Cục: <b style="color:var(--navy)">${ls.cuc}</b></div>
        <div class="center-row">Mệnh: <b style="color:var(--navy)">${ls.menhDC}</b> · Thân: <b style="color:var(--navy)">${ls.thanDC}</b></div>
        <hr class="center-divider">
        <div class="center-row">Năm <b style="color:var(--blue)">${ls.chiNamXem||''}</b> — Tuổi ${ls.tuoiXem}</div>
        <div class="center-row">ĐV: <b style="color:#1E6B3C">${dvHT?.diaChi||'?'}</b> (${dvHT?.tuoiStart}–${dvHT?.tuoiEnd}t)${dvHT?.scoring ? ' ' + dvHT.scoring.flag + ' ' + dvHT.scoring.tong + 'đ' : ''}</div>
        <div class="center-row">Tiểu hạn: <b style="color:#1E6B3C">${tvCung?.diaChi||'?'}</b> · ${tvCung?.cungName||''}</div>
        <div class="center-row">LĐH: <b style="color:var(--gold)">${ldh?.diaChi||'?'}</b> · ${ldh?.cungName||''}</div>
        <hr class="center-divider">
        <div class="center-row" style="font-size:10px;color:var(--text-lt)">🗓 ${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}</div>
        <div class="center-row" style="font-size:10px;color:var(--text-lt)">© 2026 紫微明寶 | Tử Vi Minh Bảo</div>
      </div>
    </div>`;

    // Grid
    const gridEl = document.getElementById(gridElId);
    if (gridEl) {
      gridEl.innerHTML = buildGrid(ls, centerHtml);
    }

    // Legend
    const legEl = document.getElementById(legendElId);
    if (legEl) legEl.style.display = 'block';

    // Update muc luc DV labels
    if (ls.daiVans) {
      ls.daiVans.slice(0, 9).forEach((dv, i) => {
        const btn = document.getElementById(`ml-${15 + i}`);
        if (btn) {
          const lblEl = btn.querySelector('.ml-label');
          if (lblEl) lblEl.textContent = `Đại vận (${dv.tuoiStart}–${dv.tuoiEnd})`;
        }
      });
    }

    document.getElementById('result-section')?.classList.add('active');
  }

  // ── renderCompact: compact lá số cho xem-tuoi ───────────────
  function renderCompact(ls, label, accentColor = 'var(--navy)') {
    if (!ls?.palaces) return '';
    const canNamIdx = _CAN.indexOf((ls.canChiNam || '').split(' ')[0]);
    const dvHT = ls.daiVanHienTai;

    const centerHtml = `<div style="border-right:1px solid var(--border);border-bottom:1px solid var(--border);grid-column:span 2;grid-row:span 2;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;padding:8px;overflow:auto">
      <div style="width:100%;text-align:center;font-size:10px;line-height:1.7;color:var(--text-mid)">
        <div style="font-size:11px;font-weight:700;color:${accentColor};margin-bottom:4px">${label}</div>
        <div>${ls.canChiNam} · ${ls.cuc||''}</div>
        <div>Mệnh <b>${ls.menhDC||''}</b></div>
        ${dvHT ? `<div style="color:#1E6B3C;font-weight:600">ĐV: ${dvHT.diaChi} ${dvHT.tuoiStart}–${dvHT.tuoiEnd}t</div>` : ''}
        <div>Tuổi ${ls.tuoiXem||''}</div>
      </div>
    </div>`;

    return `<div class="laso-grid" style="font-size:8px">${buildGrid(ls, centerHtml)}</div>`;
  }

  // ── loadingHtml: .tvm-wrap loading block ─────────────────────
  function loadingHtml(label = 'Đang xử lý...', sub = 'Vui lòng chờ...') {
    return `<div class="tvm-wrap">
      <div class="tvm-header">
        <div class="tvm-avatar">✦</div>
        <div>
          <div class="tvm-name">Tử Vi Minh Bảo</div>
          <div class="tvm-sub">${sub}</div>
        </div>
      </div>
      <div class="tvm-dots">
        <span class="tvm-dot"></span>
        <span class="tvm-dot"></span>
        <span class="tvm-dot"></span>
        <span class="tvm-label">${label}</span>
      </div>
      <div class="tvm-bar-wrap"><div class="tvm-bar-fill"></div></div>
    </div>`;
  }

  // ── updateMucLuc: cập nhật sidebar mục lục ───────────────────
  function updateMucLuc(phan, status) {
    const el  = document.getElementById(`ml-status-${phan}`);
    const btn = document.getElementById(`ml-${phan}`);
    if (!el || !btn) return;
    btn.classList.remove('active', 'loading', 'done');
    if (status === 'loading') {
      btn.classList.add('active', 'loading');
      el.textContent = '⟳'; el.className = 'ml-status loading';
    } else if (status === 'done') {
      btn.classList.add('done');
      el.textContent = '✓'; el.className = 'ml-status done';
    } else if (status === 'active') {
      btn.classList.add('active');
      el.textContent = '→'; el.className = 'ml-status loading';
    }
  }

  // ── Shared CSS ───────────────────────────────────────────────
  function injectCss() {
    if (document.getElementById('tuvi-grid-css')) return;
    const s = document.createElement('style');
    s.id = 'tuvi-grid-css';
    s.textContent = `
@keyframes tvm-dot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
@keyframes tvm-bar{0%{width:5%}50%{width:80%}100%{width:95%}}
.tvm-wrap{padding:20px 24px;background:#f9f7f2;border:1px solid #e8dfc8;border-radius:8px}
.tvm-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.tvm-avatar{width:34px;height:34px;border-radius:50%;background:#e8dfc8;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px}
.tvm-name{font-size:13px;font-weight:600;color:#061A2E}
.tvm-sub{font-size:11px;color:#9A7B3A;margin-top:2px}
.tvm-dots{display:flex;gap:5px;align-items:center;padding:10px 14px;background:#fff;border-radius:6px;border:1px solid #e8dfc8}
.tvm-dot{width:8px;height:8px;border-radius:50%;background:#c9a84c;display:inline-block}
.tvm-dot:nth-child(1){animation:tvm-dot 1.2s ease-in-out infinite}
.tvm-dot:nth-child(2){animation:tvm-dot 1.2s ease-in-out 0.2s infinite}
.tvm-dot:nth-child(3){animation:tvm-dot 1.2s ease-in-out 0.4s infinite}
.tvm-label{font-size:12px;color:#999;margin-left:8px}
.tvm-bar-wrap{margin-top:10px;height:3px;background:#f0ebe0;border-radius:2px;overflow:hidden}
.tvm-bar-fill{height:100%;background:#c9a84c;border-radius:2px;animation:tvm-bar 2.5s ease-in-out infinite}
`;
    document.head.appendChild(s);
  }

  // Inject CSS immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCss);
  } else {
    injectCss();
  }

  return { renderCell, displayResult, renderCompact, loadingHtml, updateMucLuc, NAP_AM_FULL };
})();
