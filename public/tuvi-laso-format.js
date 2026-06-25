// public/tuvi-laso-format.js
// formatLaSoV2 dùng chung — tách verbatim từ luan-giai.html để Tử Vi Chat
// nạp NGUYÊN lá-số-text (12 cung + cách cục + điểm 6 chiều + 9 đại vận) giống luận giải.
// Phụ thuộc: STAR_DATA (global từ tuvi-ansao-engine.js).
(function () {
  "use strict";
  function formatLaSoV2(ls, conv) {
    const lines = [];
    lines.push(`=== LÁ SỐ TỬ VI ===`);
    lines.push(`Năm sinh: ${ls.canChiNam} | Bản mệnh: ${ls.napAm} | Cục: ${ls.cuc}`);
    lines.push(`Cung Mệnh: ${ls.menhDC} | Cung Thân: ${ls.thanDC}`);
    lines.push(`Tuổi xem: ${ls.tuoiXem} | Năm xem: ${ls.chiNamXem}`);
    const menhP = ls.palaces.find(p => p.isMenh);
    if (menhP?.thaiTueNhom) {
      const ttn = menhP.thaiTueNhom;
      lines.push(`Vòng Thái Tuế tại Mệnh: ${ttn.sao} (${ttn.ten})`);
      lines.push(`  → ${ttn.yNghia}`);
    }
    const thanP = ls.palaces.find(p => p.diaChi === ls.thanDC);
    if (thanP?.thaiTueNhom) {
      const ttn = thanP.thaiTueNhom;
      lines.push(`Vòng Thái Tuế tại Thân (cung ${thanP.cungName}): ${ttn.sao} (${ttn.ten})`);
      lines.push(`  → ${ttn.yNghia}`);
    }
    lines.push(`Tiểu hạn: ${ls.palaces[ls.tieuHanIdx]?.diaChi} (${ls.palaces[ls.tieuHanIdx]?.cungName}) | Lưu đại hạn: ${ls.palaces[ls.luuNienDaiHanIdx]?.diaChi} (${ls.palaces[ls.luuNienDaiHanIdx]?.cungName})`);
    lines.push('');

    // (Đã bỏ khối "ĐIỂM ĐÁNH GIÁ" 6 chiều/cung — cơ chế tính điểm từng cung
    // không có cơ sở vững, từng khiến AI neo phán quyết vào con số sai. Phán
    // quyết nay neo vào nhãn "Luận sao" định tính + cách cục + độ sáng sao.)

    // ── Helpers for pattern ranking + synthesis ──────────────────────────────
    const _CT_SET = new Set(['Tử Vi','Thiên Cơ','Thái Dương','Vũ Khúc','Thiên Đồng','Liêm Trinh',
      'Thiên Phủ','Thái Âm','Tham Lang','Cự Môn','Thiên Tướng','Thiên Lương','Thất Sát','Phá Quân']);
    const _GOOD_KW = ['phú quý','giàu','tài lộc','quý nhân','sang','thành đạt','hiển','lộc','phúc',
      'thọ','an khang','thịnh','vinh','sáng sủa','may mắn','thuận','hanh thông','tốt','được'];
    const _BAD_KW  = ['vất vả','khổ','gian nan','khó khăn','hung','tai nạn','tai họa','tai ương',
      'nguy','nghèo','túng','hao tài','tán','mất của','bệnh','tật','ốm','yếu','cô đơn',
      'lẻ loi','yểu','chết','suy','bại','hao','tổn','thiệt','dâm','ngang trái'];
    const _CC_W = { quy_cuc:3, phu_cuc:2, than_cu:1, tap_cuc:1, trung_cuc:0, hung_cuc:-3 };

    function _hasChinhTinh(text) {
      for (const s of _CT_SET) if (text.includes(s)) return true;
      return false;
    }
    function _sentimentW(text) {
      const t = (text||'').toLowerCase();
      let w = 0;
      _GOOD_KW.forEach(k => { if (t.includes(k)) w += 0.4; });
      _BAD_KW.forEach(k  => { if (t.includes(k)) w -= 0.4; });
      return Math.max(-2, Math.min(2, w));
    }
    function _sortYn(items) {
      return [...items].sort((a, b) => (_hasChinhTinh(a)?0:1) - (_hasChinhTinh(b)?0:1));
    }
    function _xuHuong(ccItems, ynItems) {
      let w = 0;
      (ccItems||[]).forEach(c => { w += _CC_W[c.loai] || 0; });
      (ynItems||[]).forEach(y => { w += _sentimentW(y) * 0.5; });
      w = Math.round(w * 10) / 10;
      const label = w >= 4 ? 'Tốt rõ' : w >= 2 ? 'Khá' : w >= 0 ? 'Trung bình' : w >= -2 ? 'Yếu' : 'Xấu rõ';
      return `${label} (w:${w>0?'+':''}${w})`;
    }

    // 12 cung + tam phương tứ chính
    lines.push('=== 12 CUNG ===');
    for (const p of ls.palaces) {
      // KHÔNG nhét đại vận vào dòng cung: đại vận chỉ MƯỢN cung làm chỗ đứng
      // theo thời gian, không thuộc bản chất cung. Để riêng ở mục "9 ĐẠI VẬN".
      const chinh = p.majorStars.map(s => s.ten + (s.brightness?`(${s.brightness})`:'') + (s.hoa?`[${s.hoa}]`:'')).join(' ');
      const phu = p.stars.filter(s=>s.nhom!=='chinh').map(s => s.ten + (s.hoa?`[${s.hoa}]`:'')).join(' ');
      // Cách cục + patterns cho cung này
      const _ccThis = ls.cachCuc ? ls.cachCuc.filter(r => r.cung === p.cungName) : [];
      const _ynRaw  = (ls.cachCucTungCung && ls.cachCucTungCung[p.cungName]) || [];
      const _ynSorted = _sortYn(_ynRaw);
      const _xh = _xuHuong(_ccThis, _ynRaw);
      lines.push(`[${p.cungName}] ${p.diaChi}${p.isThan?' THÂN':''}${p.isMenh?' MỆNH':''} | Luận sao: ${_xh}`);
      // Priority 1: Cách cục đặc biệt (hiếm, sức ảnh hưởng mạnh nhất)
      if (ls.cachCuc) {
        const cc = ls.cachCuc.filter(r => r.cung === p.cungName || r.cung === '' || r.cung === 'Thân');
        cc.forEach(r => lines.push(`  [CÁCH CỤC · ${String(r.loai||'').toUpperCase()}${r.doManh?` ·★${r.doManh}`:''}] ${r.ten}: ${r.moTa}${r.chiTiet?` — ${r.chiTiet}`:''}`));
        // Priority 2+3: patterns sorted (chính tinh first, then phụ tinh)
        _ynSorted.forEach(y => {
          const tag = _hasChinhTinh(y) ? '[Ý NGHĨA · chính tinh]' : '[Ý NGHĨA]';
          lines.push(`  ${tag} ${y}`);
        });
      }
      if (p.majorStars.length === 0) {
        // Vô chính diệu — mượn chính tinh cung xung chiếu để luận giải
        const xung = p.xungChieuCung;
        const muon = xung ? xung.majorStars.map(s => s.ten + (s.hoa?`[${s.hoa}]`:'')).join(' ') : '';
        lines.push(`  Chính tinh: (vô chính diệu — mượn từ ${xung?.cungName||'?'}(${xung?.diaChi||'?'}): ${muon||'trống'})`);
      } else {
        lines.push(`  Chính tinh: ${chinh}`);
      }
      if (phu) lines.push(`  Phụ tinh: ${phu}`);
      // Tam phương tứ chính — Tuần/Triệt chỉ ảnh hưởng cung đó, không ảnh hưởng sang cung khác
      if (p.tamHopCungs && p.tamHopCungs.length) {
        const hasTuanTriet = c => c.stars?.some(s => s.nhom === 'tuan_triet');
        const tamHopStr = p.tamHopCungs.map(c => {
          if (hasTuanTriet(c)) return `${c.cungName}(${c.diaChi}):(bị Tuần/Triệt)`;
          const cs = c.majorStars.map(s=>s.ten+(s.hoa?`[${s.hoa}]`:'')).join(' ');
          return `${c.cungName}(${c.diaChi}):${cs||'trống'}`;
        }).join(' | ');
        const xung = p.xungChieuCung;
        const xungCs = xung
          ? hasTuanTriet(xung)
            ? '(bị Tuần/Triệt)'
            : xung.majorStars.map(s=>s.ten+(s.hoa?`[${s.hoa}]`:'')).join(' ') || 'trống'
          : 'trống';
        lines.push(`  Tam hợp: ${tamHopStr}`);
        lines.push(`  Xung chiếu: ${xung?.cungName}(${xung?.diaChi}):${xungCs}`);
      }
    }

    // 9 đại vận với scoring JS thực tế
    lines.push('');
    lines.push('=== 9 ĐẠI VẬN (lịch trình THỜI GIAN — điểm/scoring dưới đây là điểm VẬN của giai đoạn 10 năm; CHỈ dùng khi luận năm/vận hạn. TUYỆT ĐỐI KHÔNG dùng điểm đại vận để chấm hay làm điểm yếu của một CUNG — đại vận chỉ MƯỢN cung làm chỗ đứng, không đổi bản chất cung) ===');
    const BAD_T = new Set(['sát tinh','hung tinh','bại tinh']);
    const dvs = ls.daiVans.slice(0, 9);
    dvs.forEach((dv, i) => {
      const p = ls.palaces[dv.cungIdx];
      const isCur = ls.daiVanHienTai?.cungIdx === dv.cungIdx;
      const chinh = p.majorStars.map(s => s.ten + (s.brightness?`(${s.brightness})`:'') + (s.hoa?`[${s.hoa}]`:'')).join(' ');
      const tot = p.stars.filter(s=>s.nhom!=='chinh'&&!BAD_T.has((STAR_DATA[s.ten]||{}).type)).map(s=>s.ten+(s.hoa?`[${s.hoa}]`:'')).join(' ');
      const xau = p.stars.filter(s=>s.nhom!=='chinh'&&BAD_T.has((STAR_DATA[s.ten]||{}).type)).map(s=>s.ten).join(' ');
      const sc = dv.scoring;
      const scStr = sc ? `TT=${sc.thienThoi?.score??sc.thienThoi} ĐL=${sc.diaLoi?.score??sc.diaLoi} NH=${sc.nhanHoa?.score??sc.nhanHoa} Tổng=${sc.tong} ${sc.flag}` : '';
      lines.push(`ĐV${i+1}: ${dv.diaChi} (${dv.tuoiStart}–${dv.tuoiEnd}t) cung=${p.cungName}${isCur?' ← ĐANG XEM':''}`);
      if (scStr) lines.push(`  Scoring: ${scStr}`);
      lines.push(`  Chính tinh: ${chinh||'(vô chính diệu)'}`);
      if (tot) lines.push(`  Sao tốt: ${tot}`);
      if (xau) lines.push(`  Sao xấu: ${xau}`);
      if (dv.rules && dv.rules.length > 0) {
        const rTot  = dv.rules.filter(r=>r.type==='tot').map(r=>r.text);
        const rXau  = dv.rules.filter(r=>r.type==='xau').map(r=>r.text);
        const rCB   = dv.rules.filter(r=>r.type==='canh_bao').map(r=>r.text);
        const rTrung= dv.rules.filter(r=>r.type==='trung').map(r=>r.text);
        if (rTot.length)  lines.push(`  [LUẬN ĐOÁN - TỐT]: ${rTot.join(' | ')}`);
        if (rTrung.length)lines.push(`  [LUẬN ĐOÁN - TRUNG]: ${rTrung.join(' | ')}`);
        if (rXau.length)  lines.push(`  [LUẬN ĐOÁN - XẤU]: ${rXau.join(' | ')}`);
        if (rCB.length)   lines.push(`  [CẢNH BÁO]: ${rCB.join(' | ')}`);
      }
      // VH patterns (yNghia): chính tinh first, limit 6 per DV để tránh noise
      if (dv.yNghia && dv.yNghia.length > 0) {
        const _ynDV = _sortYn(dv.yNghia).slice(0, 6);
        lines.push(`  [VẬN HẠN LUẬN]: ${_ynDV.join(' | ')}`);
      }
    });

    // Cách cục phân tích
    if (ls.cachCuc && ls.cachCuc.length > 0) {
      lines.push('');
      lines.push('=== CÁCH CỤC & NHẬN ĐỊNH (toàn bộ lá số) ===');
      ls.cachCuc.forEach(r => {
        const cungStr = r.cung ? ` [Cung ${r.cung}]` : ' [Tổng quát]';
        lines.push(`[${r.loai.toUpperCase()}]${cungStr} ${r.ten}`);
        lines.push(`  ${r.moTa}`);
        if (r.chiTiet) lines.push(`  Chi tiết: ${r.chiTiet}`);
      });
    }

    return lines.join('\n');
  }
  if (typeof window !== "undefined") window.formatLaSoV2 = formatLaSoV2;
})();
