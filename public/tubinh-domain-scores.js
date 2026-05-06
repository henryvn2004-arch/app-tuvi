// public/tubinh-domain-scores.js
// 7 trục đánh giá định lượng cho luận giải Tử Bình
// Analogue với Tử Vi cungScores (6 trục) — visualize bằng radar chart
// ============================================================

(function (root) {
  // Helpers
  function _hasCan(tuTru, cans) {
    return tuTru.filter(t => cans.includes(t.can)).length;
  }
  function _hasChi(tuTru, chis) {
    return tuTru.filter(t => chis.includes(t.chi)).length;
  }

  // Đếm thập thần thiên can + tàng can (cả tứ trụ trừ nhật can)
  function _countTT(bt, types) {
    let count = 0;
    for (const t of bt.tuTru) {
      if (t === bt.tuTru[2]) {
        // nhật trụ chỉ count tàng can
      } else {
        const ttCan = bt.thapThan?.[t.ten]?.thienCan;
        if (types.includes(ttCan)) count++;
      }
      // Tàng can
      const tangCanMap = bt.thapThan?.[t.ten]?.tangCan || {};
      for (const tt of Object.values(tangCanMap)) {
        if (types.includes(tt)) count += 0.5; // tàng nhẹ hơn thấu
      }
    }
    return count;
  }

  // Score 1: SỰ NGHIỆP (Quan + Sát)
  function scoreSuNghiep(bt) {
    const reasons = [];
    let s = 5; // base
    const quanSatCount = _countTT(bt, ['Chính Quan','Thất Sát']);
    if (quanSatCount >= 2) { s += 1.5; reasons.push(`${quanSatCount.toFixed(1)} Quan/Sát đa`); }
    else if (quanSatCount >= 1) { s += 0.8; reasons.push('Có Quan/Sát'); }
    else { s -= 1; reasons.push('Thiếu Quan/Sát'); }

    // Đắc địa? (Quan/Sát có gốc trong địa chi tàng)
    const isVuong = bt.cuongNhuoc.label === 'Vượng' || bt.cuongNhuoc.label === 'Cực vượng';
    const isNhuoc = bt.cuongNhuoc.label === 'Nhược' || bt.cuongNhuoc.label === 'Cực nhược';
    if (isVuong && quanSatCount >= 1) { s += 1; reasons.push('Thân vượng + Quan = chế tốt'); }
    else if (isNhuoc && quanSatCount >= 2) { s -= 1.5; reasons.push('Thân nhược + Quan đa = họa'); }

    // Cách Quan/Sát
    if (bt.cachCuc.primary?.includes('Chính Quan') || bt.cachCuc.primary?.includes('Thất Sát')) {
      s += 1; reasons.push('Cách Quan/Sát chính cách');
    }
    // Hỗn tạp
    const coCa2 = _countTT(bt, ['Chính Quan']) >= 1 && _countTT(bt, ['Thất Sát']) >= 1;
    if (coCa2) { s -= 0.5; reasons.push('Quan-Sát hỗn tạp'); }

    return { score: Math.max(0, Math.min(10, Math.round(s*10)/10)), reasons };
  }

  // Score 2: TÀI LỘC (Chính + Thiên Tài)
  function scoreTaiLoc(bt) {
    const reasons = [];
    let s = 5;
    const taiCount = _countTT(bt, ['Chính Tài','Thiên Tài']);
    if (taiCount >= 2) { s += 1.5; reasons.push(`${taiCount.toFixed(1)} Tài đa`); }
    else if (taiCount >= 1) { s += 0.8; reasons.push('Có Tài tinh'); }
    else { s -= 1; reasons.push('Thiếu Tài tinh'); }

    const isVuong = bt.cuongNhuoc.label === 'Vượng' || bt.cuongNhuoc.label === 'Cực vượng';
    const isNhuoc = bt.cuongNhuoc.label === 'Nhược' || bt.cuongNhuoc.label === 'Cực nhược';
    if (isVuong && taiCount >= 1) { s += 1; reasons.push('Thân vượng đảm tài'); }
    else if (isNhuoc && taiCount >= 2) { s -= 1.5; reasons.push('Thân nhược + Tài đa = phú ốc bần nhân'); }

    // Có Thực/Thương sinh Tài không?
    const ttCount = _countTT(bt, ['Thực Thần','Thương Quan']);
    if (taiCount >= 1 && ttCount >= 1) { s += 0.5; reasons.push('Thực/Thương sinh Tài'); }
    // Có Tỷ Kiếp đoạt Tài không?
    const tkCount = _countTT(bt, ['Tỷ Kiên','Kiếp Tài']);
    if (taiCount >= 1 && tkCount >= 2) { s -= 0.7; reasons.push('Tỷ Kiếp đa đoạt Tài'); }

    if (bt.cachCuc.primary?.includes('Tài')) { s += 0.8; reasons.push('Cách Tài'); }

    return { score: Math.max(0, Math.min(10, Math.round(s*10)/10)), reasons };
  }

  // Score 3: SÁNG TẠO (Thực + Thương)
  function scoreSangTao(bt) {
    const reasons = [];
    let s = 5;
    const ttCount = _countTT(bt, ['Thực Thần','Thương Quan']);
    if (ttCount >= 2) { s += 1.2; reasons.push(`${ttCount.toFixed(1)} Thực/Thương đa`); }
    else if (ttCount >= 1) { s += 0.6; reasons.push('Có Thực/Thương'); }
    else { s -= 0.5; reasons.push('Thiếu Thực/Thương'); }

    const tQuan = _countTT(bt, ['Thương Quan']);
    const isVuong = bt.cuongNhuoc.label === 'Vượng' || bt.cuongNhuoc.label === 'Cực vượng';
    if (isVuong && ttCount >= 1) { s += 0.8; reasons.push('Thân vượng tiết khí qua Thực/Thương'); }
    // Thương Quan kiến Quan
    const quanCount = _countTT(bt, ['Chính Quan']);
    if (tQuan >= 1 && quanCount >= 1) { s -= 1.2; reasons.push('Thương Quan kiến Quan = họa'); }
    // Thương Quan bội Ấn (rất quý)
    const anCount = _countTT(bt, ['Chính Ấn','Kiêu Thần']);
    if (tQuan >= 1 && anCount >= 1) { s += 1; reasons.push('Thương Quan bội Ấn = quý'); }

    if (bt.cachCuc.primary?.includes('Thực Thần') || bt.cachCuc.primary?.includes('Thương Quan')) {
      s += 0.8; reasons.push('Cách Thực/Thương');
    }

    return { score: Math.max(0, Math.min(10, Math.round(s*10)/10)), reasons };
  }

  // Score 4: HỌC VẤN (Ấn + Văn Xương + Học Đường)
  function scoreHocVan(bt) {
    const reasons = [];
    let s = 5;
    const anCount = _countTT(bt, ['Chính Ấn','Kiêu Thần']);
    if (anCount >= 2) { s += 1.2; reasons.push(`${anCount.toFixed(1)} Ấn đa`); }
    else if (anCount >= 1) { s += 0.6; reasons.push('Có Ấn'); }

    // Văn Xương / Học Đường có không?
    const thanSat = bt.thanSat || {};
    const coVanXuong = thanSat['Văn Xương']?.found;
    const coHocDuong = thanSat['Học Đường']?.found;
    if (coVanXuong) { s += 1.2; reasons.push('Có Văn Xương'); }
    if (coHocDuong) { s += 0.8; reasons.push('Có Học Đường'); }

    // Tài phá Ấn
    const taiCount = _countTT(bt, ['Chính Tài','Thiên Tài']);
    if (anCount >= 1 && taiCount >= 2) { s -= 1; reasons.push('Tài phá Ấn = đứt học'); }

    if (bt.cachCuc.primary?.includes('Ấn')) { s += 0.8; reasons.push('Cách Ấn'); }

    return { score: Math.max(0, Math.min(10, Math.round(s*10)/10)), reasons };
  }

  // Score 5: ĐỐI TÁC / XÃ HỘI (Tỷ + Kiếp)
  function scoreDoiTac(bt) {
    const reasons = [];
    let s = 5;
    const tkCount = _countTT(bt, ['Tỷ Kiên','Kiếp Tài']);
    const isNhuoc = bt.cuongNhuoc.label === 'Nhược' || bt.cuongNhuoc.label === 'Cực nhược';
    const isVuong = bt.cuongNhuoc.label === 'Vượng' || bt.cuongNhuoc.label === 'Cực vượng';

    if (isNhuoc && tkCount >= 1) { s += 1.5; reasons.push('Thân nhược + Tỷ Kiếp = bạn đỡ'); }
    else if (isVuong && tkCount >= 2) { s -= 1.5; reasons.push('Thân vượng + Tỷ Kiếp đa = tranh chấp'); }
    else if (tkCount >= 1) { s += 0.5; reasons.push('Có bạn / anh em'); }

    // Có Tài + Tỷ Kiếp = nguy
    const taiCount = _countTT(bt, ['Chính Tài','Thiên Tài']);
    if (taiCount >= 1 && tkCount >= 2) { s -= 0.8; reasons.push('Tỷ Kiếp đoạt Tài'); }

    return { score: Math.max(0, Math.min(10, Math.round(s*10)/10)), reasons };
  }

  // Score 6: HÔN NHÂN
  function scoreHonNhan(bt) {
    const reasons = [];
    let s = 5;
    const isNam = bt.input?.gioitinh === 'nam';
    // Sao phối ngẫu: nam = Tài, nữ = Quan/Sát
    const phoiCount = isNam ? _countTT(bt, ['Chính Tài','Thiên Tài']) : _countTT(bt, ['Chính Quan','Thất Sát']);
    if (phoiCount >= 2) { s += 0.8; reasons.push(`${phoiCount.toFixed(1)} sao phối ngẫu`); }
    else if (phoiCount >= 1) { s += 0.5; reasons.push('Có sao phối ngẫu'); }
    else { s -= 1; reasons.push('Thiếu sao phối ngẫu'); }

    // Cung Phu Thê = nhật chi: hợp/xung với chi khác?
    const nhatChi = bt.tuTru[2].chi;
    const truTens = ['Năm','Tháng','Giờ'];
    const LUC_XUNG_PAIRS = [['Tý','Ngọ'],['Sửu','Mùi'],['Dần','Thân'],['Mão','Dậu'],['Thìn','Tuất'],['Tỵ','Hợi']];
    const LUC_HOP_PAIRS = [['Tý','Sửu'],['Dần','Hợi'],['Mão','Tuất'],['Thìn','Dậu'],['Tỵ','Thân'],['Ngọ','Mùi']];
    let xungCount = 0, hopCount = 0;
    for (let i = 0; i < 4; i++) {
      if (i === 2) continue;
      const c = bt.tuTru[i].chi;
      if (LUC_XUNG_PAIRS.some(([a,b]) => (a===nhatChi&&b===c)||(b===nhatChi&&a===c))) xungCount++;
      if (LUC_HOP_PAIRS.some(([a,b]) => (a===nhatChi&&b===c)||(b===nhatChi&&a===c))) hopCount++;
    }
    if (xungCount >= 1) { s -= 1.5 * xungCount; reasons.push(`Cung Phu Thê bị xung ${xungCount} lần`); }
    if (hopCount >= 1) { s += 0.8 * hopCount; reasons.push(`Cung Phu Thê được hợp ${hopCount} lần`); }

    // Đào Hoa
    const thanSat = bt.thanSat || {};
    const coDaoHoa = thanSat['Đào Hoa']?.found;
    if (coDaoHoa) { s += 0.5; reasons.push('Có Đào Hoa (sức hút duyên dáng)'); }

    return { score: Math.max(0, Math.min(10, Math.round(s*10)/10)), reasons };
  }

  // Score 7: SỨC KHỎE
  function scoreSucKhoe(bt) {
    const reasons = [];
    let s = 5;
    // Cường nhược cân bằng = tốt
    const cnScore = bt.cuongNhuoc.score || 5;
    if (cnScore >= 4 && cnScore <= 7) { s += 1.5; reasons.push('Cường nhược cân bằng'); }
    else if (cnScore < 3 || cnScore > 8) { s -= 1.5; reasons.push('Cường nhược cực đoan'); }

    // Ngũ hành thiên khô
    const nh = bt.nguHanh || {};
    const counts = nh.counts || {};
    const hanhCount = ['Mộc','Hỏa','Thổ','Kim','Thủy'].map(h => counts[h] || 0);
    const minCount = Math.min(...hanhCount);
    const maxCount = Math.max(...hanhCount);
    if (minCount === 0 && maxCount >= 3) { s -= 1; reasons.push('Ngũ hành thiên khô (thiếu hành)'); }
    else if (maxCount - minCount <= 2) { s += 0.5; reasons.push('Ngũ hành đều'); }

    // Hình xung trong tứ trụ
    const hxhh = bt.hinhXungHaiHop || {};
    const xungArr = hxhh.lucXung || [];
    const hinhArr = hxhh.tamHinh || [];
    if (xungArr.length >= 2) { s -= 1; reasons.push('Nhiều xung trong tứ trụ'); }
    if (hinhArr.length >= 1) { s -= 0.5; reasons.push('Có hình'); }

    return { score: Math.max(0, Math.min(10, Math.round(s*10)/10)), reasons };
  }

  function tinhDomainScores(bt) {
    return {
      suNghiep: scoreSuNghiep(bt),
      taiLoc:   scoreTaiLoc(bt),
      sangTao:  scoreSangTao(bt),
      hocVan:   scoreHocVan(bt),
      doiTac:   scoreDoiTac(bt),
      honNhan:  scoreHonNhan(bt),
      sucKhoe:  scoreSucKhoe(bt),
    };
  }

  if (typeof module !== 'undefined') {
    module.exports = { tinhDomainScores };
  } else {
    root.TuBinhDomainScores = { tinhDomainScores };
  }
})(typeof window !== 'undefined' ? window : globalThis);
