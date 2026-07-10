/* tools-shared/xem-tuoi-sinh-con.js — Module DÙNG CHUNG tool Xem Tuổi Sinh Con.
   Nguồn DUY NHẤT cho standalone /tools/xem-tuoi-sinh-con.html + shell /app/sinh-con.
   Địa chi (lục hợp/tam hợp/lục xung/tam hình) + chấm điểm 15 năm + render bảng
   PORT NGUYÊN XI từ bản inline cũ — chỉ đổi năm cứng 2026 → vnYear() động.
   window.XemTuoiSinhConTool = { vnYear, getInfo, compute } */
(function (root) {
  const _CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const _CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const _NA = ['Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy', 'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy'];
  const _NA_TEN = ['Hải Trung Kim', 'Lò Trung Hỏa', 'Đại Lâm Mộc', 'Lộ Bàng Thổ', 'Kiếm Phong Kim', 'Sơn Đầu Hỏa', 'Giản Hạ Thủy', 'Thành Đầu Thổ', 'Bạch Lạp Kim', 'Dương Liễu Mộc', 'Tuyền Trung Thủy', 'Ốc Thượng Thổ', 'Tích Lịch Hỏa', 'Tùng Bách Mộc', 'Trường Lưu Thủy', 'Sa Trung Kim', 'Sơn Hạ Hỏa', 'Bình Địa Mộc', 'Bích Thượng Thổ', 'Kim Bạc Kim', 'Phú Đăng Hỏa', 'Thiên Hà Thủy', 'Đại Dịch Thổ', 'Thoa Xuyến Kim', 'Tang Đố Mộc', 'Đại Khê Thủy', 'Sa Trung Thổ', 'Thiên Thượng Hỏa', 'Thạch Lựu Mộc', 'Đại Hải Thủy'];

  // Lục Hợp pairs [a,b] where a<b
  const _LUC_HOP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  // Lục Xung pairs
  const _LUC_XUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  // Tam Hợp groups
  const _TAM_HOP = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
  // Tam Hình (3-way penalty)
  const _TAM_HINH = [[2, 11, 8], [0, 3, 6], [1, 4, 7]];

  // Năm hiện tại theo giờ VN (thay hardcode 2026) — parity công thức client cũ.
  function vnYear() {
    try {
      return parseInt(
        new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()),
        10
      );
    } catch (e) {
      return new Date().getFullYear();
    }
  }

  function getInfo(year) {
    if (!year || isNaN(year)) return null;
    const pos = ((year - 1924) % 60 + 60) % 60;
    return {
      canChi: _CAN[pos % 10] + ' ' + _CHI[pos % 12],
      can: _CAN[pos % 10],
      chi: _CHI[pos % 12],
      chiIdx: pos % 12,
      hanh: _NA[Math.floor(pos / 2)],
      napAm: _NA_TEN[Math.floor(pos / 2)],
    };
  }

  function _isLucHop(a, b) {
    return _LUC_HOP.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  }
  function _isLucXung(a, b) {
    return _LUC_XUNG.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  }
  function _isTamHop(a, b) {
    return _TAM_HOP.some((g) => g.includes(a) && g.includes(b));
  }
  function _isTamHinh(a, b) {
    return _TAM_HINH.some((g) => g.includes(a) && g.includes(b));
  }

  function _scoreYear(chiIdx, chiBoIdx, chiMeIdx) {
    const reasons = [];
    let score = 0;

    // Bố
    if (_isLucHop(chiIdx, chiBoIdx)) {
      score += 3;
      reasons.push('Lục Hợp với bố ✓');
    } else if (_isTamHop(chiIdx, chiBoIdx)) {
      score += 2;
      reasons.push('Tam Hợp với bố');
    } else if (_isLucXung(chiIdx, chiBoIdx)) {
      score -= 3;
      reasons.push('Lục Xung với bố ✗');
    } else if (_isTamHinh(chiIdx, chiBoIdx)) {
      score -= 2;
      reasons.push('Tam Hình với bố');
    }

    // Mẹ
    if (_isLucHop(chiIdx, chiMeIdx)) {
      score += 3;
      reasons.push('Lục Hợp với mẹ ✓');
    } else if (_isTamHop(chiIdx, chiMeIdx)) {
      score += 2;
      reasons.push('Tam Hợp với mẹ');
    } else if (_isLucXung(chiIdx, chiMeIdx)) {
      score -= 3;
      reasons.push('Lục Xung với mẹ ✗');
    } else if (_isTamHinh(chiIdx, chiMeIdx)) {
      score -= 2;
      reasons.push('Tam Hình với mẹ');
    }

    return { score, reasons };
  }

  function _ratingLabel(score) {
    if (score >= 5) return { label: 'Rất Thuận ★★★', cls: 'label-great', dots: 3, dotCls: 'dot-on-great' };
    if (score >= 2) return { label: 'Thuận ★★', cls: 'label-good', dots: 2, dotCls: 'dot-on-good' };
    if (score >= 0) return { label: 'Bình Thường ★', cls: 'label-ok', dots: 1, dotCls: 'dot-on-ok' };
    return { label: 'Cần Lưu Ý', cls: 'label-bad', dots: 0, dotCls: 'dot-on-bad' };
  }

  // ── Chấm 15 năm từ năm sinh bố + mẹ ──
  function compute(namBo, namMe, curYear) {
    const iB = getInfo(namBo),
      iM = getInfo(namMe);
    if (!iB || !iM) return { ok: false, error: 'Vui lòng nhập năm sinh bố và mẹ hợp lệ.' };

    const currentYear = curYear || vnYear();
    const rows = [];
    for (let y = currentYear; y < currentYear + 15; y++) {
      const info = getInfo(y);
      const { score, reasons } = _scoreYear(info.chiIdx, iB.chiIdx, iM.chiIdx);
      const rating = _ratingLabel(score);
      rows.push({ year: y, info, score, reasons, rating });
    }

    const tableRowsHTML = rows
      .map((r) => {
        const isTop = r.score >= 5;
        const dotsHtml = [1, 2, 3]
          .map(
            (i) =>
              `<span class="score-dot ${i <= r.rating.dots ? r.rating.dotCls : 'dot-on-ok'}" style="${i > r.rating.dots ? 'background:#e0e0e0' : ''}"></span>`
          )
          .join('');
        return `<tr class="${isTop ? 'top-year' : ''}">
      <td class="year-num">${r.year}${isTop ? '<span style="color:#c9a84c;margin-left:4px">★</span>' : ''}</td>
      <td class="can-chi-cell">${r.info.canChi}</td>
      <td><span class="hanh-badge hb-${r.info.hanh}">${r.info.hanh}</span></td>
      <td><div class="score-bar">${dotsHtml}<span class="${r.rating.cls}" style="margin-left:6px">${r.rating.label}</span></div></td>
      <td class="reason-cell">${r.reasons.length ? r.reasons.join(' · ') : 'Trung tính'}</td>
    </tr>`;
      })
      .join('');

    const top3 = [...rows].sort((a, b) => b.score - a.score).slice(0, 3);
    const topRecommendHTML = `
    <div style="background:#f0faf4;border:1px solid #b7e4c7;border-radius:8px;padding:12px 16px;margin-bottom:4px">
      <div style="font-size:12px;font-weight:600;color:#1E6B3C;margin-bottom:8px">🌟 Năm Thuận Nhất (Top 3)</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${top3.map((r, i) => `<span style="background:#fff;border:1px solid #b7e4c7;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:700;color:var(--navy)">${i + 1}. ${r.year} — ${r.info.canChi} (${r.info.hanh})</span>`).join('')}
      </div>
    </div>`;

    const resultTitle = 'Kết Quả ' + currentYear + ' – ' + (currentYear + 14);

    return {
      ok: true,
      resultTitle,
      tableRowsHTML,
      topRecommendHTML,
      previewBo: iB,
      previewMe: iM,
      data: {
        namBo,
        namMe,
        canChiBo: iB.canChi + ' (' + iB.napAm + ', ' + iB.hanh + ')',
        canChiMe: iM.canChi + ' (' + iM.napAm + ', ' + iM.hanh + ')',
        namTot: top3.map((r) => r.year + ' ' + r.info.canChi + ' (' + r.info.hanh + ')').join(', '),
      },
    };
  }

  const API = { vnYear, getInfo, compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.XemTuoiSinhConTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
