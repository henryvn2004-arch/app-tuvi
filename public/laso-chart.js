/* ============================================================
   laso-chart.js — Renderer lưới lá số Tử Vi (dùng chung).
   Lift NGUYÊN VĂN từ public/la-so.html để /app.html (shell) render
   lá số y hệt. Phụ thuộc engine toàn cục từ /tuvi-ansao-engine.js:
   anSaoLaSo, convertDuongToAm, STAR_DATA. KHÔNG sửa la-so.html.
   Nợ kỹ thuật: sau ổn định, trỏ la-so.html sang file này để DRY.
   ============================================================ */

// ── CONSTANTS ──
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const GRID_DC = [[5, 6, 7, 8], [4, -1, -1, 9], [3, -1, -1, 10], [2, 1, 0, 11]];
const NAP_AM_FULL = { 'Giáp Tý': 'Hải Trung Kim (Vàng dưới biển)', 'Ất Sửu': 'Hải Trung Kim (Vàng dưới biển)', 'Bính Dần': 'Lô Trung Hỏa (Lửa trong lò)', 'Đinh Mão': 'Lô Trung Hỏa (Lửa trong lò)', 'Mậu Thìn': 'Đại Lâm Mộc (Cây trong rừng lớn)', 'Kỷ Tỵ': 'Đại Lâm Mộc (Cây trong rừng lớn)', 'Canh Ngọ': 'Lộ Bàng Thổ (Đất giữa đường)', 'Tân Mùi': 'Lộ Bàng Thổ (Đất giữa đường)', 'Nhâm Thân': 'Kiếm Phong Kim (Vàng ở mũi kiếm)', 'Quý Dậu': 'Kiếm Phong Kim (Vàng ở mũi kiếm)', 'Giáp Tuất': 'Sơn Đầu Hỏa (Lửa trên núi)', 'Ất Hợi': 'Sơn Đầu Hỏa (Lửa trên núi)', 'Bính Tý': 'Giản Hạ Thủy (Nước dưới khe)', 'Đinh Sửu': 'Giản Hạ Thủy (Nước dưới khe)', 'Mậu Dần': 'Thành Đầu Thổ (Đất trên mặt thành)', 'Kỷ Mão': 'Thành Đầu Thổ (Đất trên mặt thành)', 'Canh Thìn': 'Bạch Lạp Kim (Vàng trong nến trắng)', 'Tân Tỵ': 'Bạch Lạp Kim (Vàng trong nến trắng)', 'Nhâm Ngọ': 'Dương Liễu Mộc (Gỗ cây liễu)', 'Quý Mùi': 'Dương Liễu Mộc (Gỗ cây liễu)', 'Giáp Thân': 'Tuyền Trung Thủy (Nước dưới suối)', 'Ất Dậu': 'Tuyền Trung Thủy (Nước dưới suối)', 'Bính Tuất': 'Ốc Thượng Thổ (Đất trên nóc nhà)', 'Đinh Hợi': 'Ốc Thượng Thổ (Đất trên nóc nhà)', 'Mậu Tý': 'Tích Lịch Hỏa (Lửa sấm sét)', 'Kỷ Sửu': 'Tích Lịch Hỏa (Lửa sấm sét)', 'Canh Dần': 'Tùng Bách Mộc (Gỗ cây tùng, bách)', 'Tân Mão': 'Tùng Bách Mộc (Gỗ cây tùng, bách)', 'Nhâm Thìn': 'Trường Lưu Thủy (Nước chảy dài)', 'Quý Tỵ': 'Trường Lưu Thủy (Nước chảy dài)', 'Giáp Ngọ': 'Sa Trung Kim (Vàng trong cát)', 'Ất Mùi': 'Sa Trung Kim (Vàng trong cát)', 'Bính Thân': 'Sơn Hạ Hỏa (Lửa dưới chân núi)', 'Đinh Dậu': 'Sơn Hạ Hỏa (Lửa dưới chân núi)', 'Mậu Tuất': 'Bình Địa Mộc (Cây ở đồng bằng)', 'Kỷ Hợi': 'Bình Địa Mộc (Cây ở đồng bằng)', 'Canh Tý': 'Bích Thượng Thổ (Đất trên vách)', 'Tân Sửu': 'Bích Thượng Thổ (Đất trên vách)', 'Nhâm Dần': 'Kim Bạch Kim (Vàng pha kim trắng)', 'Quý Mão': 'Kim Bạch Kim (Vàng pha kim trắng)', 'Giáp Thìn': 'Phú Đăng Hỏa (Lửa ngọn đèn lớn)', 'Ất Tỵ': 'Phú Đăng Hỏa (Lửa ngọn đèn lớn)', 'Bính Ngọ': 'Thiên Hà Thủy (Nước sông trên trời)', 'Đinh Mùi': 'Thiên Hà Thủy (Nước sông trên trời)', 'Mậu Thân': 'Đại Dịch Thổ (Đất một khu lớn)', 'Kỷ Dậu': 'Đại Dịch Thổ (Đất một khu lớn)', 'Canh Tuất': 'Thoa Xuyến Kim (Vàng làm trang sức)', 'Tân Hợi': 'Thoa Xuyến Kim (Vàng làm trang sức)', 'Nhâm Tý': 'Tang Đố Mộc (Gỗ cây dâu)', 'Quý Sửu': 'Tang Đố Mộc (Gỗ cây dâu)', 'Giáp Dần': 'Đại Khê Thủy (Nước khe lớn)', 'Ất Mão': 'Đại Khê Thủy (Nước khe lớn)', 'Bính Thìn': 'Sa Trung Thổ (Đất lẫn trong cát)', 'Đinh Tỵ': 'Sa Trung Thổ (Đất lẫn trong cát)', 'Mậu Ngọ': 'Thiên Thượng Hỏa (Lửa trên trời)', 'Kỷ Mùi': 'Thiên Thượng Hỏa (Lửa trên trời)', 'Canh Thân': 'Thạch Lựu Mộc (Gỗ cây thạch lựu)', 'Tân Dậu': 'Thạch Lựu Mộc (Gỗ cây thạch lựu)', 'Nhâm Tuất': 'Đại Hải Thủy (Nước biển lớn)', 'Quý Hợi': 'Đại Hải Thủy (Nước biển lớn)' };
const CHINH_TINH_COLOR = { 'Tử Vi': 'hoa', 'Thiên Cơ': 'moc', 'Thái Dương': 'hoa', 'Vũ Khúc': 'kim', 'Thiên Đồng': 'thuy', 'Liêm Trinh': 'hoa', 'Thiên Phủ': 'kim', 'Thái Âm': 'thuy', 'Tham Lang': 'moc', 'Cự Môn': 'thuy', 'Thiên Tướng': 'thuy', 'Thiên Lương': 'moc', 'Thất Sát': 'hoa', 'Phá Quân': 'thuy' };
const HUNG_SAT_SET = new Set([
  'Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp', 'Thiên Không',
  'Thiên Hình', 'Thiên Riêu', 'Phá Toái', 'Kiếp Sát', 'Thiên Sứ', 'Lưu Hà', 'Thiên Hư',
  'Thiên Khốc', 'Phi Liêm', 'Trùng Tang', 'Cô Thần', 'Quả Tú', 'Tuần', 'Triệt', 'Tuần+Triệt',
  'Đại Hao', 'Tiểu Hao', 'Bệnh Phù', 'Phục Binh',
  'Quan Phù', 'Bạch Hổ', 'Tang Môn', 'Điếu Khách', 'Tuế Phá',
]);
const TRANG_SINH_SET = new Set(['Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng']);

// ── HELPERS ──
function bShort(b) { return { Miếu: 'M', Vượng: 'V', Đắc: 'Đ', Bình: 'B', Hãm: 'H' }[b] || ''; }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function getStarElementClass(n) { const d = (typeof STAR_DATA !== 'undefined') ? STAR_DATA[n] : null; if (!d?.element) return 'sc-neutral'; const m = { kim: 'sc-kim', moc: 'sc-moc', mộc: 'sc-moc', thuy: 'sc-thuy', thủy: 'sc-thuy', hoa: 'sc-hoa', hỏa: 'sc-hoa', tho: 'sc-tho', thổ: 'sc-tho' }; return m[d.element.toLowerCase()] || 'sc-neutral'; }
function getStarClass(s) { if (s.nhom === 'chinh') return 'sc-' + (CHINH_TINH_COLOR[s.ten] || 'neutral'); if (s.hoa === 'Lộc') return 'sc-hoa-loc'; if (s.hoa === 'Quyền') return 'sc-hoa-quyen'; if (s.hoa === 'Khoa') return 'sc-hoa-khoa'; if (s.hoa === 'Kỵ') return 'sc-hoa-ky'; return getStarElementClass(s.ten); }
function getCungCan(ci, di) { return ((ci % 5) * 2 + di) % 10; }
function hourMinToGioAm(h, m) { return Math.floor((((h * 60 + m + 60) % (24 * 60)) / 120)) % 12; }

// ── RENDER CUNG CELL ──
function renderCungCell(palace, dvTuoi, canNamIdx) {
  const dcIdx = CHI.indexOf(palace.diaChi), canIdx = getCungCan(canNamIdx, dcIdx);
  const canChi = CAN[canIdx] + ' ' + CHI[dcIdx];
  const thanBadge = palace.isThan ? ` <span class="badge-than">THÂN</span>` : '';
  const tsS = palace.stars.find(s => TRANG_SINH_SET.has(s.ten));
  const tuanS = palace.stars.find(s => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt');
  const trietS = palace.stars.find(s => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt');
  let tuanTriet = '';
  if (tuanS && trietS) tuanTriet = '<span class="tuan-tag">TUẦN+TRIỆT</span>';
  else if (tuanS) tuanTriet = '<span class="tuan-tag">TUẦN</span>';
  else if (trietS) tuanTriet = '<span class="triet-tag">TRIỆT</span>';
  let chinhHTML = '';
  for (const s of palace.majorStars) {
    const cls = 'sc-' + (CHINH_TINH_COLOR[s.ten] || 'neutral');
    const b = s.brightness ? ` <span style="font-size:10px">(${bShort(s.brightness)})</span>` : '';
    chinhHTML += `<div class="chinh-tinh-item ${cls}">${esc(s.ten.toUpperCase())}${b}</div>`;
  }
  const hoaEntries = [];
  for (const s of [...palace.majorStars, ...palace.stars]) {
    if (!s.hoa) continue;
    const isBad = s.hoa === 'Kỵ';
    const hoaCls = s.hoa === 'Lộc' ? 'sc-hoa-loc' : s.hoa === 'Quyền' ? 'sc-hoa-quyen' : s.hoa === 'Khoa' ? 'sc-hoa-khoa' : 'sc-hoa-ky';
    if (!hoaEntries.find(e => e.hoa === s.hoa && e.star === s.ten))
      hoaEntries.push({ label: `HÓA ${s.hoa.toUpperCase()}`, cls: hoaCls, isBad, hoa: s.hoa, star: s.ten });
  }
  const phuStars = palace.stars.filter(s => s.nhom !== 'chinh' && !TRANG_SINH_SET.has(s.ten) && s.ten !== 'Tuần' && s.ten !== 'Triệt' && s.ten !== 'Tuần+Triệt');
  const catTinh = phuStars.filter(s => !HUNG_SAT_SET.has(s.ten));
  const hungTinh = phuStars.filter(s => HUNG_SAT_SET.has(s.ten));
  function renderPhuStar(s) {
    const cls = getStarClass(s);
    const b = s.brightness ? ` <span style="font-size:8px">(${bShort(s.brightness)})</span>` : '';
    return `<div class="phu-tinh-item ${cls}">${esc(s.ten.toUpperCase())}${b}</div>`;
  }
  const catHTML = catTinh.map(renderPhuStar).join('')
    + hoaEntries.filter(h => !h.isBad).map(h => `<div class="phu-tinh-item ${h.cls}" style="font-weight:700">${h.label}</div>`).join('');
  const hungHTML = hungTinh.map(s => {
    const cls = getStarClass(s);
    const b = s.brightness ? ` <span style="font-size:8px">(${bShort(s.brightness)})</span>` : '';
    return `<div class="phu-tinh-item ${cls}" style="font-weight:600">${esc(s.ten.toUpperCase())}${b}</div>`;
  }).join('')
    + hoaEntries.filter(h => h.isBad).map(h => `<div class="phu-tinh-item ${h.cls}" style="font-weight:700">${h.label}</div>`).join('');
  return `<div class="cung-cell">
    <div class="cell-header"><span class="can-chi-label">${esc(canChi.toUpperCase())}</span><span class="cung-name-label">${esc(palace.cungName.toUpperCase())}${thanBadge}</span></div>
    <div class="chinh-tinh-area">${chinhHTML}</div>
    <div class="phu-tinh-area"><div class="phu-col">${catHTML}</div><div class="phu-col" style="text-align:right">${hungHTML}</div></div>
    <div class="cell-footer"><span class="trang-sinh-label">${tsS ? tsS.ten.toUpperCase() : ''}</span><span class="dai-van-num">${dvTuoi ?? ''}</span></div>
    ${tuanTriet}
  </div>`;
}

// ── RENDER CENTER ──
function renderCenter(ls, fd) {
  const dvHT = ls.daiVanHienTai;
  const tvCung = ls.palaces?.[ls.tieuHanIdx];
  const ldh = ls.palaces?.[ls.luuNienDaiHanIdx];
  const dvFlag = dvHT?.scoring?.tong >= 7 ? '🟢' : dvHT?.scoring?.tong >= 4 ? '🟡' : '🔴';
  const dvScore = dvHT?.scoring?.tong != null ? ` ${dvFlag} ${dvHT.scoring.tong}đ` : '';
  return `<div class="cell-center"><div class="cung-center">
    <div class="center-title">✦ ${esc((fd.name || '—').toUpperCase())} ✦</div>
    <hr class="center-divider">
    <div class="center-row">📅 ${fd.dd}/${fd.mm}/${fd.yyyy} (Dương Lịch) · giờ ${fd.gioChi}</div>
    <div class="center-row">📅 ${fd.amLich ? fd.amLich.day + '/' + fd.amLich.month + '/' + fd.amLich.year : ''} (Âm Lịch) · giờ ${fd.gioChi}</div>
    <div class="center-row">🎂 ${ls.tuoiXem} tuổi (âm lịch)</div>
    <div class="center-row">⚧ Giới tính: ${fd.gioitinh === 'nam' ? 'Nam' : 'Nữ'}</div>
    <hr class="center-divider">
    <div class="center-row">Năm: <b style="color:var(--navy,#061A2E)">${ls.canChiNam}</b> &nbsp;·&nbsp; Mệnh: <b style="color:var(--navy,#061A2E)">${NAP_AM_FULL[ls.canChiNam] || ls.napAm || ''}</b></div>
    <div class="center-row">Cục: <b style="color:var(--navy,#061A2E)">${ls.cuc || ''}</b> &nbsp;·&nbsp; Mệnh: <b>${ls.menhDC || ''}</b> · Thân: <b>${ls.thanDC || ''}</b></div>
    <hr class="center-divider">
    <div class="center-row">Năm <b style="color:var(--blue,#1455A4)">${ls.chiNamXem || ''}</b> — Tuổi ${ls.tuoiXem}</div>
    <div class="center-row">Đại vận: <b style="color:#1E6B3C">${dvHT?.diaChi || '?'}</b> (${dvHT?.tuoiStart}–${dvHT?.tuoiEnd}t)${dvScore}</div>
    <div class="center-row">Tiểu hạn: <b style="color:#1E6B3C">${tvCung?.diaChi || '?'}</b> · ${tvCung?.cungName || ''}</div>
    <div class="center-row">Lưu đại hạn: <b style="color:var(--gold,#9A7B3A)">${ldh?.diaChi || '?'}</b> · ${ldh?.cungName || ''}</div>
    <hr class="center-divider">
    <div class="center-row" style="font-size:10px;color:var(--text-lt,#777)">© 2026 紫微明寶 | Tử Vi Minh Bảo</div>
  </div></div>`;
}

// ── RENDER GRID ──
function renderGrid(ls, fd) {
  const canNamIdx = CAN.indexOf(ls.canChiNam.split(' ')[0]);
  const byDC = {}; for (const p of ls.palaces) byDC[CHI.indexOf(p.diaChi)] = p;
  let html = '<div class="laso-grid">';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const di = GRID_DC[r][c];
    if (di === -1) { if (r === 1 && c === 1) html += renderCenter(ls, fd); continue; }
    const p = byDC[di];
    if (!p) { html += '<div class="cung-cell"></div>'; continue; }
    const dv = ls.daiVans.find(d => d.cungIdx === p.idx);
    html += renderCungCell(p, dv?.tuoiStart, canNamIdx);
  }
  return html + '</div>';
}
