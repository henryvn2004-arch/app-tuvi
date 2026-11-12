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
// ── Khuôn Thiên Lương (Henry chốt 2026-09-30, ảnh mẫu của phần mềm) ──
// Hành của địa chi → màu can chi đầu ô (Tý..Hợi).
const _CHI_HANH = ['thuy', 'tho', 'moc', 'moc', 'tho', 'hoa', 'hoa', 'tho', 'kim', 'kim', 'tho', 'thuy'];
// Mệnh + hai cung tam hợp của nó được đóng khung.
const _TAM_HOP_MENH = new Set(['Mệnh', 'Tài Bạch', 'Quan Lộc']);
// Nhãn Tuần/Triệt vắt lên đường biên chung của CẶP chi bị chiếm, đầu biên sát
// trung cung — toạ độ % của lưới 4×4 (cặp khoá theo chỉ số chi 0=Tý, xếp tăng).
// Nguồn: voidInnerAnchor() của Thiên Lương (scripts/oracle/vendor/).
const _VOID_AT = { '0-1': [50, 75], '2-3': [12.5, 75], '4-5': [12.5, 25], '6-7': [50, 25], '8-9': [87.5, 25], '10-11': [87.5, 75] };
function _voidLabels(palaces) {
  const pairOf = (pred) => palaces.filter(p => (p.stars || []).some(pred)).map(p => CHI.indexOf(p.diaChi)).sort((a, b) => a - b).join('-');
  const tuan = pairOf(s => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt');
  const triet = pairOf(s => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt');
  const TU = _lcG('sao', 'Tuần').toUpperCase(), TR = _lcG('sao', 'Triệt').toUpperCase();
  const marks = tuan && tuan === triet ? [[tuan, TU + ' - ' + TR]] : [[tuan, TU], [triet, TR]];
  return marks.filter(([k]) => _VOID_AT[k]).map(([k, l]) => `<div class="v2-void" style="left:${_VOID_AT[k][0]}%;top:${_VOID_AT[k][1]}%">${l}</div>`).join('');
}
// Vòng tiểu hạn (engine `tieuHanRing`): chữ chi của năm có tiểu hạn vào cung, in sát mép
// TRUNG CUNG cạnh cung đó — ô góc thì ở góc trung cung. [chỉ số chi] → [left%, top%, transform].
const _GRID_POS = { 5: [0, 0], 6: [0, 1], 7: [0, 2], 8: [0, 3], 4: [1, 0], 9: [1, 3], 3: [2, 0], 10: [2, 3], 2: [3, 0], 1: [3, 1], 0: [3, 2], 11: [3, 3] };
function _tieuHanLabels(ring) {
  if (!Array.isArray(ring)) return '';
  const IN = '3px', OUT = 'calc(-100% - 3px)';
  return ring.map((y, chi) => {
    const [r, c] = _GRID_POS[chi];
    const x = c === 0 ? 25 : c === 3 ? 75 : c * 25 + 12.5;
    const top = r === 0 ? 25 : r === 3 ? 75 : r * 25 + 12.5;
    const tx = c === 0 ? IN : c === 3 ? OUT : '-50%';
    const ty = r === 0 ? IN : r === 3 ? OUT : '-50%';
    return `<div class="v2-th" style="left:${x}%;top:${top}%;transform:translate(${tx},${ty})" title="${_lcT('js.lasochart.tieu-han-title','Tiểu hạn năm {y} vào cung {c}',{y:_lcG('chi', CHI[y]), c:_lcG('chi', CHI[chi])})}">${_lcG('chi', CHI[y], { short: true }).toUpperCase()}</div>`;
  }).join('');
}
// Chú giải chân lá số — khuôn Thiên Lương. Màu lấy đúng class .sc-* đang tô sao.
const _LEGEND = '<div class="v2-legend"><span>(M):Miếu Địa</span><span>(V):Vượng Địa</span><span>(Đ):Đắc Địa</span><span>(B):Bình Hòa</span><span>(H):Hãm Địa</span>'
  + '<span class="v2-legend-hanh"><b class="sc-kim">Kim</b><b class="sc-moc">Mộc</b><b class="sc-thuy">Thủy</b><b class="sc-hoa">Hỏa</b><b class="sc-tho">Thổ</b></span></div>';

// Chú giải theo ngôn ngữ: vi dùng NGUYÊN hằng _LEGEND; ngôn ngữ khác ghép chữ tắt + tên từ glossary.
function _legend() {
  if (_lcVi()) return _LEGEND;
  const sang = ['Miếu', 'Vượng', 'Đắc', 'Bình', 'Hãm'].map(b => { const a = _lcG('sang', b, { abbr: true }), t = _lcG('sang', b); return `<span>(${esc(a)})${a === t ? '' : ':' + esc(t)}</span>`; }).join('');
  const hanh = [['kim', 'Kim'], ['moc', 'Mộc'], ['thuy', 'Thủy'], ['hoa', 'Hỏa'], ['tho', 'Thổ']].map(([c, h]) => `<b class="sc-${c}">${esc(_lcG('hanh', h))}</b>`).join('');
  return `<div class="v2-legend">${sang}<span class="v2-legend-hanh">${hanh}</span></div>`;
}
// ── HELPERS ──
// Lớp HIỂN THỊ theo ngôn ngữ trang (W15): tên sao/cung/can chi qua public/tools-shared/glossary.js
// (sinh từ lib/i18n/glossary). Engine giữ tên Việt làm KHOÁ — mọi phép so/tra màu vẫn dùng s.ten gốc.
// Trang 'vi' (hoặc chưa nạp glossary.js) trả NGUYÊN chuỗi vào ⇒ HTML y hệt trước.
function _lcG(kind, vi, opts) { return window.TuviGlossary ? window.TuviGlossary.t(kind, vi, opts) : vi; }
// Chữ khung (nhãn ô giữa, chú thích): _lcT(khoá, chữViệt, {biến}) — CHỈ để HIỂN THỊ. vi ⇒ y hệt chữ gốc.
function _lcT(k, d, v) {
  const I = window.I18n;
  if (I && I.tv) return I.tv(k, d, v);
  return v ? String(d).replace(/\{(\w+)\}/g, (x, n) => (v[n] !== undefined ? v[n] : x)) : d;
}
function _lcVi() { return !window.TuviGlossary || window.TuviGlossary.locale() === 'vi'; }
const _LC_SAO = ['chinh', 'sao'];
// Nạp âm ô giữa: vi giữ NGUYÊN chuỗi NAP_AM_FULL (kèm giải nghĩa Việt trong ngoặc); ngôn ngữ khác lấy tên (phần
// trước ngoặc) qua glossary loại 'napam' — giải nghĩa Việt trong ngoặc không có bản dịch nên bỏ.
function _lcNapAm(ls) {
  const f = NAP_AM_FULL[ls.canChiNam];
  if (_lcVi()) return f || ls.napAm || '';
  return f ? _lcG('napam', f.split(' (')[0]) : _lcG('hanh', ls.napAm || '');
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _bShort(b) { const v = _BC_MAP[b] || ''; return v && !_lcVi() ? _lcG('sang', b, { abbr: true }) : v; }
// Uỷ THẲNG cho VnTimezone (tools-shared/vn-timezone.js) — NGUỒN DUY NHẤT của
// công thức giờ→chi. Mọi trang nạp laso-chart.js đều đã nạp vn-timezone.js.
function hourMinToGioAm(h, m) { return window.VnTimezone.hourMinToGioIdx(h, m); }
function _getCungCan(ci, di) { return (((ci % 5) * 2 + di) % 10); }
function _getElemClass(n) { const d = (typeof STAR_DATA !== 'undefined') ? STAR_DATA[n] : null; if (!d || !d.element) return 'sc-neutral'; return { kim: 'sc-kim', mộc: 'sc-moc', thủy: 'sc-thuy', hỏa: 'sc-hoa', thổ: 'sc-tho' }[d.element.toLowerCase()] || 'sc-neutral'; }
function _getStarCls(s) { if (s.nhom === 'chinh') return 'sc-' + (_CHINH_COLOR[s.ten] || 'neutral'); if (s.hoa === 'Lộc') return 'sc-hoa-loc'; if (s.hoa === 'Quyền') return 'sc-hoa-quyen'; if (s.hoa === 'Khoa') return 'sc-hoa-khoa'; if (s.hoa === 'Kỵ') return 'sc-hoa-ky'; return _getElemClass(s.ten); }
function _isHung(s) { const d = (typeof STAR_DATA !== 'undefined') ? STAR_DATA[s.ten] : null; return _BAD_TYPES.has((d && d.type) || ''); }

// ── RENDER CUNG CELL (V2 — y hệt _renderV2Cell của luan-giai.html) ──
function renderCungCell(p, dvTuoi, canNamIdx, isCurVan) {
  const di = CHI.indexOf(p.diaChi), ci = _getCungCan(canNamIdx, di);
  const canChi = _lcG('canchi', CAN[ci] + ' ' + CHI[di]);
  const thanBadge = p.isThan ? ` <span class="v2-than">(${esc(_lcG('cung', 'Thân', { short: true }).toUpperCase())})</span>` : '';
  const tsS = p.stars.find(s => _TRANG_SINH_SET.has(s.ten));
  let chinhH = ''; const hoaFromChinh = [];
  for (const s of p.majorStars) {
    const cls = 'sc-' + (_CHINH_COLOR[s.ten] || 'neutral');
    const b = s.brightness ? ` (${_bShort(s.brightness)})` : '';
    if (s.hoa) hoaFromChinh.push(s);
    chinhH += `<div class="v2-chinh-item ${cls}">${esc(_lcG(_LC_SAO, s.ten).toUpperCase())}${b}</div>`;
  }
  const phuStars = p.stars.filter(s => s.nhom !== 'chinh' && !_TRANG_SINH_SET.has(s.ten) && s.ten !== 'Tuần' && s.ten !== 'Triệt' && s.ten !== 'Tuần+Triệt');
  const renderPhu = s => {
    const cls = _getStarCls(s); const hung = _isHung(s);
    const b = s.brightness && _bShort(s.brightness) ? ` <span style="font-size:8px">(${_bShort(s.brightness)})</span>` : '';
    let nm = esc(_lcG(_LC_SAO, s.ten).toUpperCase());
    if (s.hoa) { const hc = s.hoa === 'Lộc' ? 'sc-hoa-loc' : s.hoa === 'Quyền' ? 'sc-hoa-quyen' : s.hoa === 'Khoa' ? 'sc-hoa-khoa' : 'sc-hoa-ky'; nm += ` <span class="${hc}" style="font-size:8px">[${esc(_lcVi() ? s.hoa.charAt(0) : _lcG('tuhoa', s.hoa, { abbr: true }))}]</span>`; }
    return `<div class="v2-phu-item ${cls}" style="${hung ? 'font-weight:600' : ''}">${nm}${b}</div>`;
  };
  let catH = phuStars.filter(s => !_isHung(s)).map(renderPhu).join('');
  const hungH = phuStars.filter(s => _isHung(s)).map(renderPhu).join('');
  for (const s of hoaFromChinh) { const hc = s.hoa === 'Lộc' ? 'sc-hoa-loc' : s.hoa === 'Quyền' ? 'sc-hoa-quyen' : s.hoa === 'Khoa' ? 'sc-hoa-khoa' : 'sc-hoa-ky'; catH += `<div class="v2-phu-item ${hc}" style="font-weight:700">${_lcVi() ? 'HÓA ' + esc(s.hoa.toUpperCase()) : esc(_lcG('sao', 'Hóa ' + s.hoa).toUpperCase())}</div>`; }
  // Sao lưu năm xem (engine `luuStars`, Thái Thứ Lang) — hàng riêng, in nghiêng,
  // viết tắt "L." để không lẫn với sao gốc cùng tên. Engine cũ chưa có → rỗng.
  const luuH = (p.luuStars || []).map(s => {
    const xau = !!s.xau; // engine đánh dấu (`danhGiaSaoLuu`) — không giữ danh sách ở đây
    const tip = s.sao ? _lcT('js.lasochart.luu-tip-sao','{ten} ({sao}) — chỉ tác dụng trong năm xem',{ten: _lcG(['sao', 'khai'], s.ten), sao: s.sao}) : _lcT('js.lasochart.luu-tip','{ten} — chỉ tác dụng trong năm xem',{ten: _lcG(['sao', 'khai'], s.ten)});
    return `<span class="v2-luu-item${xau ? ' luu-xau' : ''}" title="${esc(tip)}">${esc(_lcG(['sao', 'khai'], s.ten).replace(/^Lưu /, 'L.').toUpperCase())}</span>`;
  }).join('');
  // Khuôn Thiên Lương: can chi (màu hành của chi) + tên cung cùng một hàng; chân ô
  // Tràng Sinh giữa, tuổi vào đại hạn góc phải; Tuần/Triệt vẽ ở cấp lưới (_voidLabels).
  return `<div class="cung-cell${isCurVan ? ' cur-van' : ''}">
    <div class="v2-cell-header"><span class="v2-can-chi sc-${_CHI_HANH[di]}">${esc(canChi.toUpperCase())}</span><span class="v2-cung-name"><span class="${_TAM_HOP_MENH.has(p.cungName) ? 'tam-hop' : ''}">${esc(_lcG('cung', p.cungName, { short: true }).toUpperCase())}</span>${thanBadge}</span></div>
    <div class="v2-chinh-area">${chinhH}</div>
    <div class="v2-phu-area"><div class="v2-phu-col">${catH}</div><div class="v2-phu-col v2-phu-col-right">${hungH}</div></div>
    ${luuH ? `<div class="v2-luu-area">${luuH}</div>` : ''}
    <div class="v2-footer"><span class="v2-trang-sinh ${tsS ? _getElemClass(tsS.ten) : ''}">${tsS ? esc(_lcG('sao', tsS.ten).toUpperCase()) : ''}</span><span class="v2-dai-van">${dvTuoi == null ? '' : esc(dvTuoi)}</span></div>
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
  // `scoring.flag` của engine là emoji màu (🟢🟡🔴) — UI cấm emoji màu (docs/ICONS.md),
  // nên đổi sang chấm ● đơn sắc tô màu theo cùng ngưỡng.
  const DV_FLAG_COLOR = { '🟢': '#1E6B3C', '🟡': '#B8860B', '🔴': '#C0392B' };
  const dvScore = dvHT && dvHT.scoring
    ? ' <span style="color:' + (DV_FLAG_COLOR[dvHT.scoring.flag] || '#333') + ';font-weight:700">● ' + _lcT('js.lasochart.diem', '{n}đ', { n: dvHT.scoring.tong }) + '</span>'
    : '';
  return `<div class="cung-center"><div class="center-la-so">
    <div class="center-title">✦ ${esc((fd.name || '—').toUpperCase())} ✦</div>
    <hr class="center-divider">
    <div class="center-row"><span class="ic-inline" data-icon="calendar" data-icon-emoji="📅" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">📅</span> ${_lcT('js.lasochart.duong-lich','{d}/{m}/{y} (Dương Lịch) · giờ {chi}',{d: fd.dd, m: fd.mm, y: fd.yyyy, chi: esc(_lcG('chi', fd.gioChi || ''))})}</div>
    <div class="center-row"><span class="ic-inline" data-icon="calendar" data-icon-emoji="📅" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">📅</span> ${_lcT('js.lasochart.am-lich','{ngay} (Âm Lịch) · giờ {chi}',{ngay: fd.amLich ? fd.amLich.day + '/' + fd.amLich.month + '/' + fd.amLich.year : '', chi: esc(_lcG('chi', fd.gioChi || ''))})}</div>
    <div class="center-row"><span class="ic-inline" data-icon="cake" data-icon-emoji="🎂" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">🎂</span> ${_lcT('js.lasochart.tuoi-al','{n} tuổi (âm lịch)',{n: ls.tuoiXem})}</div>
    <div class="center-row"><span class="ic-inline" data-icon="user" data-icon-emoji="⚧" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">⚧</span> ${_lcT('js.lasochart.gioi-tinh','Giới tính: {gt}',{gt: fd.gioitinh === 'nam' ? _lcT('js.lasochart.nam','Nam') : _lcT('js.lasochart.nu','Nữ')})}</div>
    ${fd.amDuongNam ? `<div class="center-row">${_lcT('js.lasochart.am-duong-nam','{ad} {gt} · Âm Dương {tl}',{ad: fd.amDuongNam === 'dương' ? _lcT('js.lasochart.duong','Dương') : _lcT('js.lasochart.am','Âm'), gt: fd.gioitinh === 'nam' ? _lcT('js.lasochart.nam','Nam') : _lcT('js.lasochart.nu','Nữ'), tl: (fd.amDuongNam === 'dương') === (fd.gioitinh === 'nam') ? _lcT('js.lasochart.thuan-ly','Thuận Lý') : _lcT('js.lasochart.nghich-ly','Nghịch Lý')})}</div>` : ''}
    <hr class="center-divider">
    <div class="center-row">${_lcT('js.lasochart.nam-l','Năm:')} <b style="color:var(--navy)">${esc(_lcG('canchi', ls.canChiNam))}</b> &nbsp;·&nbsp; ${_lcT('js.lasochart.menh-l','Mệnh:')} <b style="color:var(--navy)">${esc(_lcNapAm(ls))}</b></div>
    <div class="center-row">${_lcT('js.lasochart.cuc-l','Cục:')} <b style="color:var(--navy)">${esc(_lcG('cuc', ls.cuc || ''))}</b> &nbsp;·&nbsp; ${_lcT('js.lasochart.menh-l','Mệnh:')} <b style="color:var(--navy)">${esc(_lcG('chi', ls.menhDC || ''))}</b> · ${_lcT('js.lasochart.than-l','Thân:')} <b style="color:var(--navy)">${esc(_lcG('chi', ls.thanDC || ''))}</b></div>
    <hr class="center-divider">
    <div class="center-row">${_lcT('js.lasochart.nam-xem-tuoi','Năm {chi} — Tuổi {n}',{chi: '<b style="color:var(--blue)">' + esc(_lcG('chi', ls.chiNamXem || '')) + '</b>', n: ls.tuoiXem})}</div>
    <div class="center-row">${_lcT('js.lasochart.dai-van','Đại vận: {chi} ({a}–{b}t)',{chi: '<b style="color:#1E6B3C">' + esc((dvHT && _lcG('chi', dvHT.diaChi)) || '?') + '</b>', a: dvHT ? dvHT.tuoiStart : '', b: dvHT ? dvHT.tuoiEnd : ''})}${dvScore}</div>
    <div class="center-row">${_lcT('js.lasochart.tieu-han','Tiểu hạn: {chi} · {cung}',{chi: '<b style="color:#1E6B3C">' + esc((tvCung && _lcG('chi', tvCung.diaChi)) || '?') + '</b>', cung: esc(_lcG('cung', (tvCung && tvCung.cungName) || ''))})}</div>
    <div class="center-row">${_lcT('js.lasochart.luu-dai-han','Lưu đại hạn: {chi} · {cung}',{chi: '<b style="color:var(--gold)">' + esc((ldh && _lcG('chi', ldh.diaChi)) || '?') + '</b>', cung: esc(_lcG('cung', (ldh && ldh.cungName) || ''))})}</div>
    <hr class="center-divider">
    <div class="center-row" style="font-size:10px;color:var(--text-lt)"><span class="ic-inline" data-icon="calendar-days" data-icon-emoji="🗓" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">🗓</span> ${_lcT('js.lasochart.lap-la-so','Lập lá số: {t}',{t: nowStr})}</div>
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
  return html + _tieuHanLabels(ls.tieuHanRing) + _voidLabels(ls.palaces) + '</div>' + _legend();
}
