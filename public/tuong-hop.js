/* tuong-hop.js — Bộ máy so tuổi / tương hợp DETERMINISTIC (thuần logic, KHÔNG DOM).
   Lift NGUYÊN từ public/xem-tuoi.html (calcTuongHop 8 chiều có trọng số) để
   app-shell (/app/xem-tuoi) render y hệt. Nợ kỹ thuật: sau ổn định trỏ luôn
   xem-tuoi.html sang file này để DRY (giống laso-chart.js).
   Public API: window.TuongHop = { calcTuongHop, chiRelation, nguHanhRel }.
   Nhận 2 lá số (anSaoLaSo) + tên → trả { items[8], total, ... }. */
(function (root) {
  const LUC_HOP = {'Tý':'Sửu','Sửu':'Tý','Dần':'Hợi','Hợi':'Dần','Mão':'Tuất','Tuất':'Mão','Thìn':'Dậu','Dậu':'Thìn','Tỵ':'Thân','Thân':'Tỵ','Ngọ':'Mùi','Mùi':'Ngọ'};
  const TAM_HOP_G = [['Dần','Ngọ','Tuất'],['Tỵ','Dậu','Sửu'],['Thân','Tý','Thìn'],['Hợi','Mão','Mùi']];
  const TU_XUNG = {'Tý':'Ngọ','Ngọ':'Tý','Sửu':'Mùi','Mùi':'Sửu','Dần':'Thân','Thân':'Dần','Mão':'Dậu','Dậu':'Mão','Thìn':'Tuất','Tuất':'Thìn','Tỵ':'Hợi','Hợi':'Tỵ'};
  const TAM_HINH = {'Dần':['Tỵ','Thân'],'Tỵ':['Dần','Thân'],'Thân':['Dần','Tỵ'],'Sửu':['Tuất','Mùi'],'Tuất':['Sửu','Mùi'],'Mùi':['Sửu','Tuất'],'Tý':['Mão'],'Mão':['Tý']};
  const _NH_SINH = {'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc'};
  const _NH_KHAC = {'Mộc':'Thổ','Thổ':'Thủy','Thủy':'Hỏa','Hỏa':'Kim','Kim':'Mộc'};
  const _NA = {'Giáp Tý':'Kim','Ất Sửu':'Kim','Bính Dần':'Hỏa','Đinh Mão':'Hỏa','Mậu Thìn':'Mộc','Kỷ Tỵ':'Mộc','Canh Ngọ':'Thổ','Tân Mùi':'Thổ','Nhâm Thân':'Kim','Quý Dậu':'Kim','Giáp Tuất':'Hỏa','Ất Hợi':'Hỏa','Bính Tý':'Thủy','Đinh Sửu':'Thủy','Mậu Dần':'Thổ','Kỷ Mão':'Thổ','Canh Thìn':'Kim','Tân Tỵ':'Kim','Nhâm Ngọ':'Mộc','Quý Mùi':'Mộc','Giáp Thân':'Thủy','Ất Dậu':'Thủy','Bính Tuất':'Thổ','Đinh Hợi':'Thổ','Mậu Tý':'Hỏa','Kỷ Sửu':'Hỏa','Canh Dần':'Mộc','Tân Mão':'Mộc','Nhâm Thìn':'Thủy','Quý Tỵ':'Thủy','Giáp Ngọ':'Kim','Ất Mùi':'Kim','Bính Thân':'Hỏa','Đinh Dậu':'Hỏa','Mậu Tuất':'Mộc','Kỷ Hợi':'Mộc','Canh Tý':'Thổ','Tân Sửu':'Thổ','Nhâm Dần':'Kim','Quý Mão':'Kim','Giáp Thìn':'Hỏa','Ất Tỵ':'Hỏa','Bính Ngọ':'Thủy','Đinh Mùi':'Thủy','Mậu Thân':'Thổ','Kỷ Dậu':'Thổ','Canh Tuất':'Kim','Tân Hợi':'Kim','Nhâm Tý':'Mộc','Quý Sửu':'Mộc','Giáp Dần':'Thủy','Ất Mão':'Thủy','Bính Thìn':'Thổ','Đinh Tỵ':'Thổ','Mậu Ngọ':'Hỏa','Kỷ Mùi':'Hỏa','Canh Thân':'Mộc','Tân Dậu':'Mộc','Nhâm Tuất':'Thủy','Quý Hợi':'Thủy'};

  function clamp(v, lo, hi) { lo = lo == null ? 0 : lo; hi = hi == null ? 10 : hi; return Math.max(lo, Math.min(hi, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }

  function chiRelation(dc1, dc2) {
    if (dc1 === dc2) return { score: 8, label: 'Cùng chi', type: 'same' };
    if (LUC_HOP[dc1] === dc2) return { score: 9, label: 'Lục Hợp ✓', type: 'luchop' };
    if (TU_XUNG[dc1] === dc2) return { score: 1, label: 'Tứ Xung ✗', type: 'tuxung' };
    const g1 = TAM_HOP_G.find(g => g.includes(dc1)), g2 = TAM_HOP_G.find(g => g.includes(dc2));
    if (g1 && g2 && g1 === g2) return { score: 9, label: 'Tam Hợp ✓', type: 'tamhop' };
    if (TAM_HINH[dc1] && TAM_HINH[dc1].includes(dc2)) return { score: 3, label: 'Tam Hình ⚠', type: 'tamhinh' };
    return { score: 5, label: 'Bình thường', type: 'neutral' };
  }
  function nguHanhRel(hA, hB) {
    if (!hA || !hB) return { score: 5, label: '?' };
    if (hA === hB) return { score: 8, label: 'Đồng hành' };
    if (_NH_SINH[hB] === hA) return { score: 9, label: hB + ' sinh ' + hA + ' ✓' };
    if (_NH_SINH[hA] === hB) return { score: 6, label: hA + ' sinh ' + hB };
    if (_NH_KHAC[hB] === hA) return { score: 1, label: hB + ' khắc ' + hA + ' ✗' };
    if (_NH_KHAC[hA] === hB) return { score: 4, label: hA + ' khắc ' + hB };
    return { score: 5, label: 'Bình thường' };
  }
  function ttNhomRel(nA, nB) {
    if (!nA || !nB) return { delta: 0, label: '' };
    if (nA === nB) return { delta: 2, label: 'Cùng nhóm Thái Tuế' };
    if ([[1,3],[3,1],[2,4],[4,2]].some(p => p[0] === nA && p[1] === nB)) return { delta: -1, label: 'Nhóm đối lập' };
    if ([[1,2],[2,1],[3,4],[4,3]].some(p => p[0] === nA && p[1] === nB)) return { delta: 1, label: 'Nhóm bổ trợ' };
    return { delta: 0, label: 'Nhóm trung tính' };
  }
  function cungScore(palA, palB) {
    if (!palA || !palB) return { score: 5, chiRel: { label: '?' }, details: [] };
    const cr = chiRelation(palA.diaChi, palB.diaChi);
    let s = cr.score * 0.6 + 5 * 0.4;
    const details = [cr.label];
    const stA = (palA.stars || []).map(x => x.ten);
    const stB = (palB.stars || []).map(x => x.ten);
    if (stA.includes('Hóa Kỵ')) { s -= 1.5; details.push('Hóa Kỵ cung A ✗'); }
    if (stB.includes('Hóa Kỵ')) { s -= 1.5; details.push('Hóa Kỵ cung B ✗'); }
    if (stA.includes('Hóa Lộc') || stA.includes('Lộc Tồn')) { s += 1; details.push('Lộc cung A ✓'); }
    if (stB.includes('Hóa Lộc') || stB.includes('Lộc Tồn')) { s += 1; details.push('Lộc cung B ✓'); }
    return { score: r1(clamp(s)), chiRel: cr, details };
  }
  function mainStarRel(palA, palB) {
    const PAIRS = [['Tử Vi','Thiên Phủ'],['Thái Dương','Thái Âm'],['Thiên Cơ','Thiên Lương'],['Vũ Khúc','Tham Lang'],['Liêm Trinh','Thiên Tướng']];
    const sA = ((palA && palA.majorStars) || []).map(x => x.ten);
    const sB = ((palB && palB.majorStars) || []).map(x => x.ten);
    for (const pair of PAIRS) {
      const s1 = pair[0], s2 = pair[1];
      if ((sA.includes(s1) && sB.includes(s2)) || (sA.includes(s2) && sB.includes(s1)))
        return { score: 9, label: s1 + ' × ' + s2 + ' — Cặp hòa hợp ✓' };
    }
    for (const s of sA) if (sB.includes(s)) return { score: 8, label: 'Cùng ' + s + ' — Đồng khí' };
    const SAT = ['Thất Sát', 'Phá Quân'];
    if (sA.some(s => SAT.includes(s)) && sB.some(s => SAT.includes(s)))
      return { score: 4, label: 'Cả 2 cung có sao cứng — dễ xung đột' };
    return { score: 6, label: 'Bình thường' };
  }

  function calcTuongHop(lsA, lsB, nameA, nameB) {
    const ccA = lsA.canChiNam || '', ccB = lsB.canChiNam || '';
    const naA = _NA[ccA] || lsA.napAmHanh || '', naB = _NA[ccB] || lsB.napAmHanh || '';
    const chiNamA = lsA.chiNam || '', chiNamB = lsB.chiNam || '';
    const find = (ls, pred) => (ls.palaces || []).find(pred);
    const pMenhA = find(lsA, p => p.isMenh), pMenhB = find(lsB, p => p.isMenh);
    const pPTA = find(lsA, p => p.cungName === 'Phu Thê'), pPTB = find(lsB, p => p.cungName === 'Phu Thê');
    const pTTA = find(lsA, p => p.cungName === 'Tử Tức'), pTTB = find(lsB, p => p.cungName === 'Tử Tức');
    const pTBA = find(lsA, p => p.cungName === 'Tài Bạch'), pTBB = find(lsB, p => p.cungName === 'Tài Bạch');

    const cr1 = chiRelation(chiNamA, chiNamB);
    const s1 = { score: cr1.score, w: 0.10, label: 'Xét Tuổi', detail: cr1.label, a: ccA + ' (' + chiNamA + ')', b: ccB + ' (' + chiNamB + ')', chiRel: cr1 };
    const nr = nguHanhRel(naA, naB);
    const s2 = { score: nr.score, w: 0.10, label: 'Ngũ Hành', detail: nr.label, a: ccA + ' — ' + naA, b: ccB + ' — ' + naB };
    const mc = cungScore(pMenhA, pMenhB);
    const ttA = pMenhA && pMenhA.thaiTueNhom && pMenhA.thaiTueNhom.nhom, ttB = pMenhB && pMenhB.thaiTueNhom && pMenhB.thaiTueNhom.nhom;
    const ttr = ttNhomRel(ttA, ttB);
    const mScore = r1(clamp(mc.score * 0.7 + (5 + ttr.delta) * 0.3));
    const stars = (pal) => ((pal && pal.majorStars) || []).map(x => x.ten).join(',') || 'VCD';
    const s3 = { score: mScore, w: 0.20, label: 'Tư Tưởng', detail: [mc.chiRel && mc.chiRel.label, ttr.label].filter(Boolean).join(' · '),
      a: (pMenhA ? pMenhA.diaChi : '?') + ' · ' + stars(pMenhA), b: (pMenhB ? pMenhB.diaChi : '?') + ' · ' + stars(pMenhB) };
    const ptc = cungScore(pPTA, pPTB);
    const s4 = { score: ptc.score, w: 0.20, label: 'Quan Hệ', detail: (ptc.chiRel && ptc.chiRel.label) || '',
      a: (pPTA ? pPTA.diaChi : '?') + ' · ' + stars(pPTA), b: (pPTB ? pPTB.diaChi : '?') + ' · ' + stars(pPTB) };
    const ttc = cungScore(pTTA, pTTB);
    const s5 = { score: ttc.score, w: 0.10, label: 'Con Cái', detail: (ttc.chiRel && ttc.chiRel.label) || '',
      a: (pTTA ? pTTA.diaChi : '?'), b: (pTTB ? pTTB.diaChi : '?') };
    const tbc = cungScore(pTBA, pTBB);
    const s6 = { score: tbc.score, w: 0.15, label: 'Tài Chính', detail: (tbc.chiRel && tbc.chiRel.label) || '',
      a: (pTBA ? pTBA.diaChi : '?'), b: (pTBB ? pTBB.diaChi : '?') };
    const sr = mainStarRel(pMenhA, pMenhB);
    const s7 = { score: sr.score, w: 0.10, label: 'Tính Cách', detail: sr.label,
      a: ((pMenhA && pMenhA.majorStars) || []).map(x => x.ten).join(', ') || 'VCD',
      b: ((pMenhB && pMenhB.majorStars) || []).map(x => x.ten).join(', ') || 'VCD' };
    const dvA = (lsA.daiVanHienTai && lsA.daiVanHienTai.scoring && lsA.daiVanHienTai.scoring.tong) != null ? lsA.daiVanHienTai.scoring.tong : 5;
    const dvB = (lsB.daiVanHienTai && lsB.daiVanHienTai.scoring && lsB.daiVanHienTai.scoring.tong) != null ? lsB.daiVanHienTai.scoring.tong : 5;
    const s8 = { score: r1((dvA + dvB) / 2), w: 0.05, label: 'Vận Hành', detail: 'ĐV ' + nameA + ': ' + dvA + '/10 · ĐV ' + nameB + ': ' + dvB + '/10',
      a: dvA + '/10', b: dvB + '/10' };

    const items = [s1, s2, s3, s7, s4, s5, s6, s8];
    const total = r1(items.reduce((sum, m) => sum + m.score * m.w * 10, 0));
    return { items, total, lsA, lsB, nameA, nameB, naA, naB };
  }

  const API = { calcTuongHop, chiRelation, nguHanhRel };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TuongHop = API;
})(typeof window !== 'undefined' ? window : globalThis);
