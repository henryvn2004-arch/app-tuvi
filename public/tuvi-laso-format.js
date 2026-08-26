// public/tuvi-laso-format.js
// formatLaSoV2 dùng chung — tách verbatim từ luan-giai.html để Tử Vi Chat
// nạp NGUYÊN lá-số-text (12 cung + cách cục + điểm 6 chiều + 9 đại vận) giống luận giải.
// Phụ thuộc: STAR_DATA (global từ tuvi-ansao-engine.js).
(function () {
  "use strict";

  // ── MỐC SECTION — HỢP ĐỒNG với bộ cắt phía server ────────────────────────
  // `trimLaSo()` (app/api/lasotuvi/route.ts) và `trimLaSoForPhuThe()`
  // (lib/agent/phu-the-luan-giai.ts) dò ĐÚNG mấy chuỗi này để cắt lá số theo
  // phần. Đổi/chú thích thêm vào ngay sau chuỗi là bộ cắt câm → cả lá số 22K
  // ký tự đi thẳng vào prompt, model tự mò → bản luận bỏ qua data (đã cắn thật:
  // header từng bị nối " (lịch trình THỜI GIAN…)" làm hỏng phần 14–24).
  // ⇒ Ghi chú phải nằm ở DÒNG RIÊNG phía dưới, KHÔNG nối vào mốc.
  // `scripts/check-laso-markers.mjs` canh đúng chuyện này.
  var MARKERS = {
    laso: '=== LÁ SỐ TỬ VI ===',
    cung: '=== 12 CUNG ===',
    daiVan: '=== 9 ĐẠI VẬN ===',
    cachCuc: '=== CÁCH CỤC & NHẬN ĐỊNH (toàn bộ lá số) ===',
  };

  // Phân loại sao cho khối "Tam phương tứ chính" của ĐẠI VẬN — CÙNG ba danh
  // sách mà panel `buildPreGenHtml()` (public/luan-giai-core.js) vẽ ra màn
  // hình, để bảng trên trang và bản luận không nói khác nhau.
  var DV_SAT = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
  var DV_BAI = ['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
  var DV_CAT = ['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật',
    'Lộc Tồn','Hóa Lộc','Hóa Quyền','Hóa Khoa'];

  const _CT_SET = new Set(['Tử Vi','Thiên Cơ','Thái Dương','Vũ Khúc','Thiên Đồng','Liêm Trinh',
    'Thiên Phủ','Thái Âm','Tham Lang','Cự Môn','Thiên Tướng','Thiên Lương','Thất Sát','Phá Quân']);
  function _hasChinhTinh(text) {
    for (const s of _CT_SET) if (text.includes(s)) return true;
    return false;
  }
  function _sortYn(items) {
    return [...items].sort((a, b) => (_hasChinhTinh(a)?0:1) - (_hasChinhTinh(b)?0:1));
  }

  /**
   * Dựng khối text cho MỘT đại vận — NGUỒN DUY NHẤT cho cả ba đường tiêu thụ:
   * luận giải 24 phần (client), lasoTextFull (server), và rail chat
   * (lib/agent/prompts.ts qua lib/engine/laso.ts). Trước đây mỗi đường tự dựng
   * một bản → rail thiếu hẳn luận đoán/cảnh báo/tam phương, trả lời sai lệch.
   *
   * @param {object} ls   lá số (anSaoLaSo)
   * @param {number} i    chỉ số đại vận, 0-based
   * @param {object} opts { compact?:boolean, combosForCung?:(palace)=>string[] }
   * @returns {string[]}  mảng dòng (chưa nối)
   */
  function buildDaiVanLines(ls, i, opts) {
    opts = opts || {};
    const dv = (ls.daiVans || [])[i];
    if (!dv) return [];
    const p = (ls.palaces || [])[dv.cungIdx];
    if (!p) return [];
    const out = [];
    const STARD = (typeof STAR_DATA !== 'undefined' && STAR_DATA) || {};
    const BAD_T = new Set(['sát tinh','hung tinh','bại tinh']);
    const isCur = ls.daiVanHienTai && ls.daiVanHienTai.cungIdx === dv.cungIdx;
    const chinh = (p.majorStars||[]).map(s => s.ten + (s.brightness?`(${s.brightness})`:'') + (s.hoa?`[${s.hoa}]`:'')).join(' ');

    out.push(`ĐV${i+1}: ${dv.diaChi} (${dv.tuoiStart}–${dv.tuoiEnd}t) cung=${p.cungName}${isCur?' ← ĐANG XEM':''}`);

    // Scoring — kèm Bộ Mệnh→Bộ ĐV (panel có, laSoText trước đây KHÔNG có).
    const sc = dv.scoring;
    if (sc) {
      const tt = sc.thienThoi?.score ?? sc.thienThoi;
      const dl = sc.diaLoi?.score ?? sc.diaLoi;
      const nh = sc.nhanHoa?.score ?? sc.nhanHoa;
      out.push(`  Scoring: TT=${tt} ĐL=${dl} NH=${nh} Tổng=${sc.tong} ${sc.flag||''}`.trimEnd());
      if (sc.nhanHoa?.boMenh) out.push(`  Bộ Mệnh: ${sc.nhanHoa.boMenh} → Bộ ĐV: ${sc.nhanHoa.boVan}`);
    }

    out.push(`  Chính tinh: ${chinh||'(vô chính diệu)'}`);
    if ((p.majorStars||[]).length === 0 && p.xungChieuCung) {
      const muon = (p.xungChieuCung.majorStars||[]).map(s => s.ten + (s.brightness?`(${s.brightness})`:'')).join(' ');
      out.push(`  → mượn chính tinh cung xung chiếu ${p.xungChieuCung.cungName}(${p.xungChieuCung.diaChi}): ${muon||'trống'}`);
    }

    const allStars = p.stars || [];
    if (!opts.compact) {
      const tot = allStars.filter(s=>s.nhom!=='chinh'&&!BAD_T.has((STARD[s.ten]||{}).type)).map(s=>s.ten+(s.hoa?`[${s.hoa}]`:'')).join(' ');
      const xau = allStars.filter(s=>s.nhom!=='chinh'&&BAD_T.has((STARD[s.ten]||{}).type)).map(s=>s.ten).join(' ');
      if (tot) out.push(`  Sao tốt: ${tot}`);
      if (xau) out.push(`  Sao xấu: ${xau}`);
    }

    // Tam phương tứ chính của CUNG ĐẠI VẬN — gom sao cung đại vận + tam hợp +
    // xung chiếu. Panel vẽ mục này từ lâu; laSoText thì KHÔNG có, nên model
    // phải tự suy lại từ khối 12 cung (đo được: bản luận nói "tam hợp là cung
    // A và B" bằng suy diễn thay vì đọc bảng engine).
    const tptcPalaces = [p].concat(p.tamHopCungs||[]).concat(p.xungChieuCung?[p.xungChieuCung]:[]);
    const tptcNames = tptcPalaces.filter(Boolean).reduce((acc,c)=>acc.concat((c.stars||[]).map(s=>s.ten)),[]);
    const catIn = DV_CAT.filter(s=>tptcNames.indexOf(s)>=0);
    const satIn = DV_SAT.filter(s=>tptcNames.indexOf(s)>=0);
    const baiIn = DV_BAI.filter(s=>tptcNames.indexOf(s)>=0);
    if (catIn.length) out.push(`  [TAM PHƯƠNG TỨ CHÍNH · CÁT]: ${catIn.join(', ')}`);
    if (satIn.length) out.push(`  [TAM PHƯƠNG TỨ CHÍNH · SÁT]: ${satIn.join(', ')}`);
    if (baiIn.length) out.push(`  [TAM PHƯƠNG TỨ CHÍNH · BẠI]: ${baiIn.join(', ')}`);
    const hasTuan  = allStars.some(s=>s.ten==='Tuần');
    const hasTriet = allStars.some(s=>s.ten==='Triệt');
    if (hasTuan)  out.push('  [TUẦN án ngữ cung đại vận]');
    if (hasTriet) out.push('  [TRIỆT án ngữ cung đại vận]');

    // Cách cục LỌC THEO CUNG ĐẠI VẬN (panel có mục "Cách cục liên quan").
    // ⚠️ CỐ Ý bỏ cách cục TỔNG QUÁT (cung === ''): panel chỉ vẽ MỘT đại vận nên
    // in kèm là hợp lý, còn ở đây 9 đại vận in liền nhau → cách tổng quát lặp
    // đúng 9 lần, phình laSoText và pha loãng chính thứ khối này sinh ra để
    // chống. Chúng vẫn tới model nguyên vẹn qua khối === CÁCH CỤC & NHẬN ĐỊNH
    // (toàn bộ lá số) === mà bộ cắt LUÔN nối vào mọi phần.
    const ccDV = (ls.cachCuc||[]).filter(c => c.cung === p.cungName);
    if (ccDV.length) {
      out.push(`  [CÁCH CỤC LIÊN QUAN]: ${ccDV.map(c=>`${c.ten} — ${c.moTa}`).join(' | ')}`);
    }

    // Luật vận hạn do engine chấm (đây mới là thứ panel in ra dưới nhãn
    // "Luận đoán vận hạn" — phần model hay bỏ qua nhất khi bị pha loãng).
    if (dv.rules && dv.rules.length > 0) {
      const rTot  = dv.rules.filter(r=>r.type==='tot').map(r=>r.text);
      const rXau  = dv.rules.filter(r=>r.type==='xau').map(r=>r.text);
      const rCB   = dv.rules.filter(r=>r.type==='canh_bao').map(r=>r.text);
      const rTrung= dv.rules.filter(r=>r.type==='trung').map(r=>r.text);
      if (rTot.length)  out.push(`  [LUẬN ĐOÁN - TỐT]: ${rTot.join(' | ')}`);
      if (rTrung.length)out.push(`  [LUẬN ĐOÁN - TRUNG]: ${rTrung.join(' | ')}`);
      if (rXau.length)  out.push(`  [LUẬN ĐOÁN - XẤU]: ${rXau.join(' | ')}`);
      if (rCB.length)   out.push(`  [CẢNH BÁO]: ${rCB.join(' | ')}`);
    }

    // [VẬN HẠN LUẬN] = patterns THÔ (vd "[Thiên Việt] Sét đánh."), nhiễu nhất
    // trong khối và KHÔNG hề hiện trên panel. Bản `compact` (rail liệt kê cả 9
    // đại vận cùng lúc) bỏ hẳn — phần đã-chấm nằm ở [LUẬN ĐOÁN]/[CẢNH BÁO] rồi;
    // giữ lại chỉ tốn ~2,2K ký tự context cho một thứ người đọc không thấy.
    if (!opts.compact && dv.yNghia && dv.yNghia.length > 0) {
      out.push(`  [VẬN HẠN LUẬN]: ${_sortYn(dv.yNghia).slice(0, 6).join(' | ')}`);
    }

    // Tổ hợp sao (cách cục đồng cung) — nguồn cach_cuc_all.json do TRANG nạp
    // bất đồng bộ, nên nhận qua hook thay vì đọc global: thiếu thì bỏ dòng,
    // không dựng bản rỗng.
    if (typeof opts.combosForCung === 'function') {
      const combos = opts.combosForCung(p) || [];
      if (combos.length) out.push(`  [TỔ HỢP SAO (cách cục)]: ${combos.join(' | ')}`);
    }
    return out;
  }

  function formatLaSoV2(ls, conv, fmtOpts) {
    const lines = [];
    lines.push(MARKERS.laso);
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
    // (_CT_SET / _hasChinhTinh / _sortYn nay ở scope module — dùng chung với
    // buildDaiVanLines, không giữ bản thứ hai ở đây.)
    const _GOOD_KW = ['phú quý','giàu','tài lộc','quý nhân','sang','thành đạt','hiển','lộc','phúc',
      'thọ','an khang','thịnh','vinh','sáng sủa','may mắn','thuận','hanh thông','tốt','được'];
    const _BAD_KW  = ['vất vả','khổ','gian nan','khó khăn','hung','tai nạn','tai họa','tai ương',
      'nguy','nghèo','túng','hao tài','tán','mất của','bệnh','tật','ốm','yếu','cô đơn',
      'lẻ loi','yểu','chết','suy','bại','hao','tổn','thiệt','dâm','ngang trái'];
    const _CC_W = { quy_cuc:3, phu_cuc:2, than_cu:1, tap_cuc:1, trung_cuc:0, hung_cuc:-3 };

    function _sentimentW(text) {
      const t = (text||'').toLowerCase();
      let w = 0;
      _GOOD_KW.forEach(k => { if (t.includes(k)) w += 0.4; });
      _BAD_KW.forEach(k  => { if (t.includes(k)) w -= 0.4; });
      return Math.max(-2, Math.min(2, w));
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
    lines.push(MARKERS.cung);
    for (const p of ls.palaces) {
      // KHÔNG nhét đại vận vào dòng cung: đại vận chỉ MƯỢN cung làm chỗ đứng
      // theo thời gian, không thuộc bản chất cung. Để riêng ở mục "9 ĐẠI VẬN".
      const chinh = p.majorStars.map(s => s.ten + (s.brightness?`(${s.brightness})`:'') + (s.hoa?`[${s.hoa}]`:'')).join(' ');
      const phu = p.stars.filter(s=>s.nhom!=='chinh').map(s => s.ten + (s.hoa?`[${s.hoa}]`:'')).join(' ');
      // Cách cục + patterns cho cung này. Cách phủ ≥2 cung có cung GHÉP "X/Y"
      // (vd Triệt Đáo Kim Cung = "Quan Lộc/Nô Bộc") → tách '/' kiểm tra thành viên.
      const _inCung = (rc, cn) => String(rc || '').split('/').includes(cn);
      const _ccThis = ls.cachCuc ? ls.cachCuc.filter(r => _inCung(r.cung, p.cungName)) : [];
      const _ynRaw  = (ls.cachCucTungCung && ls.cachCucTungCung[p.cungName]) || [];
      const _ynSorted = _sortYn(_ynRaw);
      const _xh = _xuHuong(_ccThis, _ynRaw);
      lines.push(`[${p.cungName}] ${p.diaChi}${p.isThan?' THÂN':''}${p.isMenh?' MỆNH':''} | Luận sao: ${_xh}`);
      // Priority 1: Cách cục đặc biệt (hiếm, sức ảnh hưởng mạnh nhất)
      if (ls.cachCuc) {
        const cc = ls.cachCuc.filter(r => _inCung(r.cung, p.cungName) || r.cung === '' || _inCung(r.cung, 'Thân'));
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

    // 9 đại vận với scoring JS thực tế.
    // ⚠️ MỐC phải đứng MỘT MÌNH trên dòng của nó — ghi chú xuống dòng dưới.
    lines.push('');
    lines.push(MARKERS.daiVan);
    lines.push('(lịch trình THỜI GIAN — điểm/scoring dưới đây là điểm VẬN của giai đoạn 10 năm; CHỈ dùng khi luận năm/vận hạn. TUYỆT ĐỐI KHÔNG dùng điểm đại vận để chấm hay làm điểm yếu của một CUNG — đại vận chỉ MƯỢN cung làm chỗ đứng, không đổi bản chất cung)');
    const dvCount = Math.min((ls.daiVans || []).length, 9);
    for (let i = 0; i < dvCount; i++) {
      buildDaiVanLines(ls, i, fmtOpts).forEach(l => lines.push(l));
    }

    // Cách cục phân tích
    if (ls.cachCuc && ls.cachCuc.length > 0) {
      lines.push('');
      lines.push(MARKERS.cachCuc);
      ls.cachCuc.forEach(r => {
        const cungStr = r.cung ? ` [Cung ${r.cung}]` : ' [Tổng quát]';
        lines.push(`[${r.loai.toUpperCase()}]${cungStr} ${r.ten}`);
        lines.push(`  ${r.moTa}`);
        if (r.chiTiet) lines.push(`  Chi tiết: ${r.chiTiet}`);
      });
    }

    return lines.join('\n');
  }
  if (typeof window !== "undefined") {
    window.formatLaSoV2 = formatLaSoV2;
    window.buildDaiVanLines = buildDaiVanLines;
    window.LASO_MARKERS = MARKERS;
  }
})();
