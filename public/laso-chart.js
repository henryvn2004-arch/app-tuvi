/* ============================================================
   laso-chart.js — Renderer lưới lá số Tử Vi (dùng chung).
   PARITY: lift NGUYÊN renderer V2 từ public/luan-giai.html (_renderV2Cell
   + displayResult) để /app và /app/luan-giai hiển thị lá số ĐÚNG Y HỆT
   trang luận giải hiện tại. Phụ thuộc engine toàn cục từ
   /tuvi-ansao-engine.js: anSaoLaSo, convertDuongToAm, STAR_DATA.
   Public API giữ ổn định: renderGrid(ls, fd), esc, CHI, hourMinToGioAm.
   Nợ kỹ thuật: sau ổn định, trỏ luan-giai.html/la-so.html sang đây để DRY.
   ============================================================ */

// ── CONSTANTS ──
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const NAP_AM_FULL = { 'Giáp Tý': 'Hải Trung Kim (Vàng dưới biển)', 'Ất Sửu': 'Hải Trung Kim (Vàng dưới biển)', 'Bính Dần': 'Lô Trung Hỏa (Lửa trong lò)', 'Đinh Mão': 'Lô Trung Hỏa (Lửa trong lò)', 'Mậu Thìn': 'Đại Lâm Mộc (Cây trong rừng lớn)', 'Kỷ Tỵ': 'Đại Lâm Mộc (Cây trong rừng lớn)', 'Canh Ngọ': 'Lộ Bàng Thổ (Đất giữa đường)', 'Tân Mùi': 'Lộ Bàng Thổ (Đất giữa đường)', 'Nhâm Thân': 'Kiếm Phong Kim (Vàng ở mũi kiếm)', 'Quý Dậu': 'Kiếm Phong Kim (Vàng ở mũi kiếm)', 'Giáp Tuất': 'Sơn Đầu Hỏa (Lửa trên núi)', 'Ất Hợi': 'Sơn Đầu Hỏa (Lửa trên núi)', 'Bính Tý': 'Giản Hạ Thủy (Nước dưới khe)', 'Đinh Sửu': 'Giản Hạ Thủy (Nước dưới khe)', 'Mậu Dần': 'Thành Đầu Thổ (Đất trên mặt thành)', 'Kỷ Mão': 'Thành Đầu Thổ (Đất trên mặt thành)', 'Canh Thìn': 'Bạch Lạp Kim (Vàng trong nến trắng)', 'Tân Tỵ': 'Bạch Lạp Kim (Vàng trong nến trắng)', 'Nhâm Ngọ': 'Dương Liễu Mộc (Gỗ cây liễu)', 'Quý Mùi': 'Dương Liễu Mộc (Gỗ cây liễu)', 'Giáp Thân': 'Tuyền Trung Thủy (Nước dưới suối)', 'Ất Dậu': 'Tuyền Trung Thủy (Nước dưới suối)', 'Bính Tuất': 'Ốc Thượng Thổ (Đất trên nóc nhà)', 'Đinh Hợi': 'Ốc Thượng Thổ (Đất trên nóc nhà)', 'Mậu Tý': 'Tích Lịch Hỏa (Lửa sấm sét)', 'Kỷ Sửu': 'Tích Lịch Hỏa (Lửa sấm sét)', 'Canh Dần': 'Tùng Bách Mộc (Gỗ cây tùng, bách)', 'Tân Mão': 'Tùng Bách Mộc (Gỗ cây tùng, bách)', 'Nhâm Thìn': 'Trường Lưu Thủy (Nước chảy dài)', 'Quý Tỵ': 'Trường Lưu Thủy (Nước chảy dài)', 'Giáp Ngọ': 'Sa Trung Kim (Vàng trong cát)', 'Ất Mùi': 'Sa Trung Kim (Vàng trong cát)', 'Bính Thân': 'Sơn Hạ Hỏa (Lửa dưới chân núi)', 'Đinh Dậu': 'Sơn Hạ Hỏa (Lửa dưới chân núi)', 'Mậu Tuất': 'Bình Địa Mộc (Cây ở đồng bằng)', 'Kỷ Hợi': 'Bình Địa Mộc (Cây ở đồng bằng)', 'Canh Tý': 'Bích Thượng Thổ (Đất trên vách)', 'Tân Sửu': 'Bích Thượng Thổ (Đất trên vách)', 'Nhâm Dần': 'Kim Bạch Kim (Vàng pha kim trắng)', 'Quý Mão': 'Kim Bạch Kim (Vàng pha kim trắng)', 'Giáp Thìn': 'Phú Đăng Hỏa (Lửa ngọn đèn lớn)', 'Ất Tỵ': 'Phú Đăng Hỏa (Lửa ngọn đèn lớn)', 'Bính Ngọ': 'Thiên Hà Thủy (Nước sông trên trời)', 'Đinh Mùi': 'Thiên Hà Thủy (Nước sông trên trời)', 'Mậu Thân': 'Đại Dịch Thổ (Đất một khu lớn)', 'Kỷ Dậu': 'Đại Dịch Thổ (Đất một khu lớn)', 'Canh Tuất': 'Thoa Xuyến Kim (Vàng làm trang sức)', 'Tân Hợi': 'Thoa Xuyến Kim (Vàng làm trang sức)', 'Nhâm Tý': 'Tang Đố Mộc (Gỗ cây dâu)', 'Quý Sửu': 'Tang Đố Mộc (Gỗ cây dâu)', 'Giáp Dần': 'Đại Khê Thủy (Nước khe lớn)', 'Ất Mão': 'Đại Khê Thủy (Nước khe lớn)', 'Bính Thìn': 'Sa Trung Thổ (Đất lẫn trong cát)', 'Đinh Tỵ': 'Sa Trung Thổ (Đất lẫn trong cát)', 'Mậu Ngọ': 'Thiên Thượng Hỏa (Lửa trên trời)', 'Kỷ Mùi': 'Thiên Thượng Hỏa (Lửa trên trời)', 'Canh Thân': 'Thạch Lựu Mộc (Gỗ cây thạch lựu)', 'Tân Dậu': 'Thạch Lựu Mộc (Gỗ cây thạch lựu)', 'Nhâm Tuất': 'Đại Hải Thủy (Nước biển lớn)', 'Quý Hợi': 'Đại Hải Thủy (Nước biển lớn)' };

// Chính tinh colors — theo ngũ hành đúng (bản V2 của luan-giai.html)
const _CHINH_COLOR = {
  'Tử Vi': 'tho', 'Thiên Cơ': 'moc', 'Thái Dương': 'hoa', 'Vũ Khúc': 'kim',
  'Thiên Đồng': 'thuy', 'Liêm Trinh': 'hoa', 'Thiên Phủ': 'tho', 'Thái Âm': 'thuy',
  'Tham Lang': 'thuy', 'Cự Môn': 'thuy', 'Thiên Tướng': 'thuy', 'Thiên Lương': 'moc',
  'Thất Sát': 'kim', 'Phá Quân': 'thuy',
};
const _TRANG_SINH_SET = new Set(['Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng']);
const _BAD_TYPES = new Set(['sát tinh', 'hung tinh', 'bại tinh', 'tuế_tinh']);
const _BC_MAP = { Miếu: 'M', Vượng: 'V', Đắc: 'Đ', Bình: 'B', Hãm: 'H' };

// ── HELPERS ──
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _bShort(b) { return _BC_MAP[b] || ''; }
function hourMinToGioAm(h, m) { return Math.floor((((h * 60 + m + 60) % (24 * 60)) / 120)) % 12; }
function _getCungCan(ci, di) { return (((ci % 5) * 2 + di) % 10); }
function _getElemClass(n) { const d = (typeof STAR_DATA !== 'undefined') ? STAR_DATA[n] : null; if (!d || !d.element) return 'sc-neutral'; return { kim: 'sc-kim', mộc: 'sc-moc', thủy: 'sc-thuy', hỏa: 'sc-hoa', thổ: 'sc-tho' }[d.element.toLowerCase()] || 'sc-neutral'; }
function _getStarCls(s) { if (s.nhom === 'chinh') return 'sc-' + (_CHINH_COLOR[s.ten] || 'neutral'); if (s.hoa === 'Lộc') return 'sc-hoa-loc'; if (s.hoa === 'Quyền') return 'sc-hoa-quyen'; if (s.hoa === 'Khoa') return 'sc-hoa-khoa'; if (s.hoa === 'Kỵ') return 'sc-hoa-ky'; return _getElemClass(s.ten); }
function _isHung(s) { const d = (typeof STAR_DATA !== 'undefined') ? STAR_DATA[s.ten] : null; return _BAD_TYPES.has((d && d.type) || ''); }

// ── RENDER CUNG CELL (V2 — y hệt _renderV2Cell của luan-giai.html) ──
function renderCungCell(p, dvTuoi, canNamIdx, isCurVan) {
  const di = CHI.indexOf(p.diaChi), ci = _getCungCan(canNamIdx, di);
  const canChi = CAN[ci] + ' ' + CHI[di];
  const thanBadge = p.isThan ? ` <span class="v2-badge-than">THÂN</span>` : '';
  const tsS = p.stars.find(s => _TRANG_SINH_SET.has(s.ten));
  let tt = '';
  const tuanS = p.stars.find(s => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt');
  const trietS = p.stars.find(s => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt');
  if (tuanS && trietS) tt = '<span class="v2-tuan-tag">TUẦN+TRIỆT</span>';
  else if (tuanS) tt = '<span class="v2-tuan-tag">TUẦN</span>';
  else if (trietS) tt = '<span class="v2-triet-tag">TRIỆT</span>';
  let chinhH = ''; const hoaFromChinh = [];
  for (const s of p.majorStars) {
    const cls = 'sc-' + (_CHINH_COLOR[s.ten] || 'neutral');
    const b = s.brightness ? ` <span style="font-size:10px">(${_bShort(s.brightness)})</span>` : '';
    if (s.hoa) hoaFromChinh.push(s);
    chinhH += `<div class="v2-chinh-item ${cls}">${esc(s.ten.toUpperCase())}${b}</div>`;
  }
  const phuStars = p.stars.filter(s => s.nhom !== 'chinh' && !_TRANG_SINH_SET.has(s.ten) && s.ten !== 'Tuần' && s.ten !== 'Triệt' && s.ten !== 'Tuần+Triệt');
  const renderPhu = s => {
    const cls = _getStarCls(s); const hung = _isHung(s);
    const b = (hung && s.brightness) ? ` <span style="font-size:8px">(${_bShort(s.brightness)})</span>` : '';
    let nm = esc(s.ten.toUpperCase());
    if (s.hoa) { const hc = s.hoa === 'Lộc' ? 'sc-hoa-loc' : s.hoa === 'Quyền' ? 'sc-hoa-quyen' : s.hoa === 'Khoa' ? 'sc-hoa-khoa' : 'sc-hoa-ky'; nm += ` <span class="${hc}" style="font-size:8px">[${esc(s.hoa.charAt(0))}]</span>`; }
    return `<div class="v2-phu-item ${cls}" style="${hung ? 'font-weight:600' : ''}">${nm}${b}</div>`;
  };
  let catH = phuStars.filter(s => !_isHung(s)).map(renderPhu).join('');
  const hungH = phuStars.filter(s => _isHung(s)).map(renderPhu).join('');
  for (const s of hoaFromChinh) { const hc = s.hoa === 'Lộc' ? 'sc-hoa-loc' : s.hoa === 'Quyền' ? 'sc-hoa-quyen' : s.hoa === 'Khoa' ? 'sc-hoa-khoa' : 'sc-hoa-ky'; catH += `<div class="v2-phu-item ${hc}" style="font-weight:700">HÓA ${esc(s.hoa.toUpperCase())}</div>`; }
  return `<div class="cung-cell${isCurVan ? ' cur-van' : ''}">
    <div class="v2-cell-header"><span class="v2-can-chi">${esc(canChi.toUpperCase())}</span><span class="v2-cung-name">${esc(p.cungName.toUpperCase())}${thanBadge}</span></div>
    <div class="v2-chinh-area">${chinhH}</div>
    <div class="v2-phu-area"><div class="v2-phu-col">${catH}</div><div class="v2-phu-col v2-phu-col-right">${hungH}</div></div>
    <div class="v2-footer"><span class="v2-trang-sinh">${tsS ? esc(tsS.ten.toUpperCase()) : ''}</span><span class="v2-dai-van">${dvTuoi == null ? '' : dvTuoi}</span></div>
    ${tt}
  </div>`;
}

// ── RENDER CENTER (y hệt centerHTML của displayResult) ──
function renderCenter(ls, fd) {
  const dvHT = ls.daiVanHienTai;
  const tvCung = ls.palaces && ls.palaces[ls.tieuHanIdx];
  const ldh = ls.palaces && ls.palaces[ls.luuNienDaiHanIdx];
  const now = new Date();
  const pad = x => String(x).padStart(2, '0');
  const nowStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const dvScore = dvHT && dvHT.scoring ? ' ' + dvHT.scoring.flag + ' ' + dvHT.scoring.tong + 'đ' : '';
  return `<div class="cung-center"><div class="center-la-so">
    <div class="center-title">✦ ${esc((fd.name || '—').toUpperCase())} ✦</div>
    <hr class="center-divider">
    <div class="center-row"><span class="ic-inline" data-icon="calendar" data-icon-emoji="📅" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">📅</span> ${fd.dd}/${fd.mm}/${fd.yyyy} (Dương Lịch) · giờ ${esc(fd.gioChi || '')}</div>
    <div class="center-row"><span class="ic-inline" data-icon="calendar" data-icon-emoji="📅" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">📅</span> ${fd.amLich ? fd.amLich.day + '/' + fd.amLich.month + '/' + fd.amLich.year : ''} (Âm Lịch) · giờ ${esc(fd.gioChi || '')}</div>
    <div class="center-row"><span class="ic-inline" data-icon="cake" data-icon-emoji="🎂" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">🎂</span> ${ls.tuoiXem} tuổi (âm lịch)</div>
    <div class="center-row"><span class="ic-inline" data-icon="user" data-icon-emoji="⚧" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">⚧</span> Giới tính: ${fd.gioitinh === 'nam' ? 'Nam' : 'Nữ'}</div>
    ${fd.amDuongNam ? `<div class="center-row">${fd.amDuongNam === 'dương' ? 'Dương' : 'Âm'} ${fd.gioitinh === 'nam' ? 'Nam' : 'Nữ'} · Âm Dương ${(fd.amDuongNam === 'dương') === (fd.gioitinh === 'nam') ? 'Thuận Lý' : 'Nghịch Lý'}</div>` : ''}
    <hr class="center-divider">
    <div class="center-row">Năm: <b style="color:var(--navy)">${esc(ls.canChiNam)}</b> &nbsp;·&nbsp; Mệnh: <b style="color:var(--navy)">${esc(NAP_AM_FULL[ls.canChiNam] || ls.napAm || '')}</b></div>
    <div class="center-row">Cục: <b style="color:var(--navy)">${esc(ls.cuc || '')}</b> &nbsp;·&nbsp; Mệnh: <b style="color:var(--navy)">${esc(ls.menhDC || '')}</b> · Thân: <b style="color:var(--navy)">${esc(ls.thanDC || '')}</b></div>
    <hr class="center-divider">
    <div class="center-row">Năm <b style="color:var(--blue)">${esc(ls.chiNamXem || '')}</b> — Tuổi ${ls.tuoiXem}</div>
    <div class="center-row">Đại vận: <b style="color:#1E6B3C">${esc((dvHT && dvHT.diaChi) || '?')}</b> (${dvHT ? dvHT.tuoiStart : ''}–${dvHT ? dvHT.tuoiEnd : ''}t)${dvScore}</div>
    <div class="center-row">Tiểu hạn: <b style="color:#1E6B3C">${esc((tvCung && tvCung.diaChi) || '?')}</b> · ${esc((tvCung && tvCung.cungName) || '')}</div>
    <div class="center-row">Lưu đại hạn: <b style="color:var(--gold)">${esc((ldh && ldh.diaChi) || '?')}</b> · ${esc((ldh && ldh.cungName) || '')}</div>
    <hr class="center-divider">
    <div class="center-row" style="font-size:10px;color:var(--text-lt)"><span class="ic-inline" data-icon="calendar-days" data-icon-emoji="🗓" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">🗓</span> Lập lá số: ${nowStr}</div>
    <div class="center-row" style="font-size:10px;color:var(--text-lt)">© 2026 紫微明寶 | Tử Vi Minh Bảo</div>
  </div></div>`;
}

// ── RENDER GRID (y hệt vòng lặp displayResult) ──
function renderGrid(ls, fd) {
  const canNamIdx = CAN.indexOf(ls.canChiNam.split(' ')[0]);
  const byDC = {}; for (const p of ls.palaces) byDC[CHI.indexOf(p.diaChi)] = p;
  const dvHT = ls.daiVanHienTai;
  const GRID_DC = [[5, 6, 7, 8], [4, -1, -1, 9], [3, -1, -1, 10], [2, 1, 0, 11]];
  let html = '<div class="laso-grid">', centerDone = false;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const di = GRID_DC[r][c];
    if (di === -1) { if (!centerDone) { centerDone = true; html += renderCenter(ls, fd); } continue; }
    const p = byDC[di];
    if (!p) { html += '<div class="cung-cell"></div>'; continue; }
    const isCurVan = (dvHT && (dvHT.cungIdx === CHI.indexOf(p.diaChi) || dvHT.cungIdx === p.idx));
    const dv = ls.daiVans.find(d => d.cungIdx === p.idx);
    html += renderCungCell(p, dv ? dv.tuoiStart : undefined, canNamIdx, isCurVan);
  }
  return html + '</div>';
}
