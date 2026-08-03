/* bat-tu-core.js — LÕI luận Bát Tự / Tứ Trụ DÙNG CHUNG (render deterministic thuần, chỉ đọc bt).
   Port BYTE-FAITHFUL từ public/tu-binh.html (extract nguyên source):
     - PHAN_LABELS (16 phần)
     - buildPreGenForPhan(phan, bt): khối deterministic mỗi phần (cường nhược, 7 trục,
       cách cục, domain bars, ngũ hành, hình/xung/hại/hợp, thần sát, đại vận factors,
       lưu niên) — TRẢ VỀ chuỗi HTML.
     - renderInlineDomainRadar(bt) + renderInlineDaiVanLineChart(bt): vẽ canvas (cần Chart.js;
       tự thoát nếu thiếu Chart).
   Phụ thuộc: window.TuBinhDomainScores, window.TuBinhSpecialCach (đã dùng chung), Chart (tùy chọn).
   KHÔNG DOM-form, KHÔNG AI, KHÔNG paywall. Dùng bởi shell /app/bat-tu (16 phần free).
   Standalone /tu-binh.html giữ bản inline (DRY hoá sau).
   Public API: window.BatTuCore = { TONG_PHAN, PHAN_LABELS, buildPreGenForPhan, renderInlineDomainRadar, renderInlineDaiVanLineChart }. */
/* global Chart */
(function (root) {
  var TONG_PHAN = 16;
  const PHAN_LABELS = {
    1:  'Tổng Quan Bát Tự',
    2:  'Cách Cục',
    3:  'Quan Sát (Sự nghiệp)',
    4:  'Tài',
    5:  'Thực Thương',
    6:  'Ấn',
    7:  'Tỷ Kiếp',
    8:  'Tình Duyên',
    9:  'Sức Khỏe',
    10: 'Hình Xung Hại Hợp',
    11: 'Thần Sát',
    12: 'Tổng Quan Đại Vận',
    13: 'Đại Vận Hiện Tại',
    14: 'Đại Vận Kế Tiếp',
    15: 'Lưu Niên',
    16: 'Tổng Kết',
  };;

  function buildPreGenForPhan(phan, bt) {
  if (!bt) return '';
  let h = '';
  const matches = (typeof window.TuBinhSpecialCach !== 'undefined')
    ? window.TuBinhSpecialCach.detectSpecialCachCuc(bt) : [];
  const ds = (typeof window.TuBinhDomainScores !== 'undefined')
    ? window.TuBinhDomainScores.tinhDomainScores(bt) : null;

  function renderDomainBar(label, key) {
    if (!ds || !ds[key]) return '';
    const v = ds[key];
    const reasons = (v.reasons || []).slice(0, 3).map(r => '· ' + r).join('<br>');
    return `
      <div class="pregen-block">
        <div class="pregen-title"><span class="ic-inline" data-icon-emoji="📊" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📊</span> Trục ${label}</div>
        <div class="pregen-domain-bar">
          <div class="pregen-domain-name">${label}</div>
          <div class="pregen-domain-track"><div class="pregen-domain-fill" style="width:${v.score*10}%"></div></div>
          <div class="pregen-domain-score">${v.score}</div>
        </div>
        <div class="pregen-domain-reasons">${reasons}</div>
      </div>`;
  }

  function renderCachCucCard(m) {
    const cls = !m.hopLe ? 'warn' : (m.override ? 'override' : '');
    const badge = !m.hopLe ? '⚠ Bán cách' : (m.override ? '<span class="ic-inline" data-icon="flame" data-icon-emoji="🔥" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">🔥</span> Ngoại cách (thay nội cách)' : '<span class="ic-inline" data-icon="sparkles" data-icon-emoji="✨" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px">✨</span> Cách bổ trợ');
    const reasons = (m.lyDo || []).map(r => '· ' + r).join('<br>');
    return `
      <div class="pregen-block ${cls}">
        <div class="pregen-title">${badge}</div>
        <div class="pregen-cach-name">${m.ten}</div>
        <div class="pregen-cach-desc">${m.description}</div>
        ${reasons ? `<div class="pregen-domain-reasons" style="padding-left:0;margin-top:8px">${reasons}</div>` : ''}
        ${m.source ? `<div class="pregen-cach-source">— ${m.source}</div>` : ''}
      </div>`;
  }

  // Filter cách cục theo phần (khớp keyword với từng domain)
  function filterCachByKeywords(keywords) {
    return matches.filter(m => {
      const txt = (m.ten + ' ' + m.description + ' ' + (m.lyDo||[]).join(' ')).toLowerCase();
      return keywords.some(k => txt.includes(k.toLowerCase()));
    });
  }

  switch (phan) {
    case 1: { // Tổng Quan Bát Tự — radar 7 trục + cường nhược + ngũ hành + override cách cục
      h += `<div class="pregen-block">
        <div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚖" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">⚖</span> Cường Nhược Nhật Can</div>
        <div class="pregen-domain-bar">
          <div class="pregen-domain-name">${bt.cuongNhuoc.label}</div>
          <div class="pregen-domain-track"><div class="pregen-domain-fill" style="width:${(bt.cuongNhuoc.score||5)*10}%"></div></div>
          <div class="pregen-domain-score">${bt.cuongNhuoc.score}</div>
        </div>
        <div class="pregen-domain-reasons">
          · Đắc lệnh: ${bt.cuongNhuoc.dacLenh ? 'có' : 'không'}<br>
          · Đắc địa: ${bt.cuongNhuoc.dacDia || 0}<br>
          · Đắc thế: ${bt.cuongNhuoc.dacThe || 0}
        </div>
      </div>`;
      h += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="📐" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📐</span> 7 trục đánh giá định lượng</div>
        <div style="margin-top:8px"><canvas id="phan1-radar-chart" style="max-height:380px"></canvas></div>
      </div>`;
      const overrides = matches.filter(m => m.hopLe && m.override);
      if (overrides.length) {
        h += `<div class="pregen-block override"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔥" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🔥</span> Cách cục đặc biệt thay nội cách</div>`;
        overrides.forEach(m => h += `<div class="pregen-cach-name">${m.ten}</div><div class="pregen-cach-desc">${m.description}</div><div class="pregen-cach-source">— ${m.source}</div>`);
        h += `</div>`;
      }
      break;
    }
    case 2: { // Cách Cục
      h += `<div class="pregen-block">
        <div class="pregen-title"><span class="ic-inline" data-icon-emoji="📜" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📜</span> Nội cách bản mệnh</div>
        <div class="pregen-cach-name">${bt.cachCuc.primary || '—'}</div>
        <div class="pregen-cach-desc">Loại: ${bt.cachCuc.type || '—'} · ${bt.cachCuc.thanhPhaCach || ''}</div>
        ${bt.cachCuc.note ? `<div class="pregen-domain-reasons" style="padding-left:0;margin-top:8px">${bt.cachCuc.note}</div>` : ''}
      </div>`;
      const validMatches = matches.filter(m => m.hopLe);
      if (validMatches.length) validMatches.forEach(m => h += renderCachCucCard(m));
      const warnings = matches.filter(m => !m.hopLe);
      if (warnings.length) warnings.forEach(m => h += renderCachCucCard(m));
      h += `<div class="pregen-block">
        <div class="pregen-title"><span class="ic-inline" data-icon-emoji="🌟" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🌟</span> Dụng thần</div>
        <div class="pregen-cach-name">Dụng: ${bt.dungThan.primary}${bt.dungThan.secondary ? ' · Hỉ: ' + bt.dungThan.secondary : ''}</div>
        <div class="pregen-cach-desc">${bt.dungThan.method || ''}<br>${bt.dungThan.rationale || ''}</div>
      </div>`;
      break;
    }
    case 3: { // Quan Sát (Sự nghiệp)
      h += renderDomainBar('Sự nghiệp', 'suNghiep');
      const cc = filterCachByKeywords(['quan', 'sát', 'tài quan']);
      if (cc.length) cc.forEach(m => h += renderCachCucCard(m));
      break;
    }
    case 4: { // Tài
      h += renderDomainBar('Tài lộc', 'taiLoc');
      const cc = filterCachByKeywords(['tài', 'tuế đức']);
      if (cc.length) cc.forEach(m => h += renderCachCucCard(m));
      break;
    }
    case 5: { // Thực Thương
      h += renderDomainBar('Sáng tạo', 'sangTao');
      const cc = filterCachByKeywords(['thực', 'thương quan']);
      if (cc.length) cc.forEach(m => h += renderCachCucCard(m));
      break;
    }
    case 6: { // Ấn
      h += renderDomainBar('Học vấn', 'hocVan');
      const cc = filterCachByKeywords(['ấn', 'sát ấn']);
      if (cc.length) cc.forEach(m => h += renderCachCucCard(m));
      break;
    }
    case 7: { // Tỷ Kiếp
      h += renderDomainBar('Đối tác', 'doiTac');
      const cc = filterCachByKeywords(['tỷ', 'kiếp', 'lưỡng', 'nhất khí']);
      if (cc.length) cc.forEach(m => h += renderCachCucCard(m));
      break;
    }
    case 8: { // Tình Duyên
      h += renderDomainBar('Hôn nhân', 'honNhan');
      h += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="💞" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">💞</span> Cung Phu Thê (Nhật Chi)</div>
        <div class="pregen-cach-name">${bt.tuTru[2].chi}</div>
        <div class="pregen-cach-desc">Tàng can: ${(bt.tuTru[2].tangCan||[]).map(t=>t.can).join(', ') || '—'}</div>
      </div>`;
      const cc = filterCachByKeywords(['hợp', 'đào hoa', 'tình', 'nhật chi']);
      if (cc.length) cc.forEach(m => h += renderCachCucCard(m));
      break;
    }
    case 9: { // Sức Khỏe
      h += renderDomainBar('Sức khỏe', 'sucKhoe');
      const nh = bt.nguHanh?.counts || {};
      const order = ['Mộc','Hỏa','Thổ','Kim','Thủy'];
      h += `<div class="pregen-block"><div class="pregen-title"><span class="ic-inline" data-icon-emoji="🌿" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🌿</span> Phân bố ngũ hành</div>`;
      order.forEach(hanh => {
        const n = nh[hanh] || 0;
        h += `<div class="pregen-domain-bar">
          <div class="pregen-domain-name">${hanh}</div>
          <div class="pregen-domain-track"><div class="pregen-domain-fill" style="width:${Math.min(n*20,100)}%"></div></div>
          <div class="pregen-domain-score">${n}</div>
        </div>`;
      });
      h += `</div>`;
      break;
    }
    case 10: { // Hình Xung Hại Hợp
      const hxhh = bt.hinhXungHaiHop || {};
      // Helper: format pair-style entries (lục xung/hợp/hại)
      const fmtPair = (item, sep) => {
        if (!item) return '';
        if (item.cungA && item.cungB) {
          return `${item.cungA} (${item.chiA}) ${sep} ${item.cungB} (${item.chiB})${item.hanh ? ' → ' + item.hanh : ''}`;
        }
        return JSON.stringify(item);
      };
      // Helper: format tri-style entries (tam hợp/tam hình)
      const fmtTri = (item) => {
        if (!item) return '';
        if (item.chis?.length) {
          const chis = item.chis.join(' + ');
          const status = item.full ? 'trọn vẹn' : 'không trọn (thiếu 1 chi)';
          const extra = item.type ? ` [${item.type}]` : '';
          const hanh = item.hanh ? ` → ${item.hanh}` : '';
          return `${chis}${hanh} (${status})${extra}`;
        }
        return JSON.stringify(item);
      };
      // Helper: format can pairs
      const fmtCanPair = (item, sep) => {
        if (!item) return '';
        if (item.cungA && item.cungB) {
          return `${item.cungA} (${item.canA}) ${sep} ${item.cungB} (${item.canB})${item.hanh ? ' → ' + item.hanh : ''}`;
        }
        return JSON.stringify(item);
      };
      const sections = [
        { key: 'lucXung', label: 'Lục Xung (chi đối nghịch)', cls: 'yn-hung', fmt: (i) => fmtPair(i, '↔') },
        { key: 'lucHop',  label: 'Lục Hợp (chi tương hợp)',   cls: 'yn-cat',  fmt: (i) => fmtPair(i, '⊕') },
        { key: 'tamHop',  label: 'Tam Hợp Cục',                cls: 'yn-cat',  fmt: fmtTri },
        { key: 'tamHinh', label: 'Tam Hình',                   cls: 'yn-hung', fmt: fmtTri },
        { key: 'lucHai',  label: 'Lục Hại',                    cls: 'yn-hung', fmt: (i) => fmtPair(i, '✗') },
        { key: 'canHop',  label: 'Thiên Can Hợp Hóa',          cls: 'yn-cat',  fmt: (i) => fmtCanPair(i, '⊕') },
      ];
      sections.forEach(s => {
        const arr = hxhh[s.key] || [];
        if (arr.length === 0) return;
        h += `<div class="pregen-block"><div class="pregen-title">${s.label} — ${arr.length}</div>`;
        arr.forEach(item => {
          h += `<div class="pregen-yn ${s.cls}">${s.fmt(item)}</div>`;
        });
        h += `</div>`;
      });
      // Empty state
      const totalRels = sections.reduce((sum, s) => sum + ((hxhh[s.key] || []).length), 0);
      if (totalRels === 0) {
        h += `<div class="pregen-block"><div class="pregen-domain-reasons" style="padding-left:0">Lá số không có quan hệ hình/xung/hợp/hại đáng kể giữa các trụ — khá êm.</div></div>`;
      }
      break;
    }
    case 11: { // Thần Sát
      const ts = bt.thanSat || {};
      const found = Object.entries(ts).filter(([k,v]) => v && v.found);
      if (found.length) {
        h += `<div class="pregen-block"><div class="pregen-title">⭐ Thần sát hiện ra (${found.length})</div>`;
        found.forEach(([name, info]) => {
          const detail = (info.details || []).map(d => typeof d === 'string' ? d : (d.text || '')).filter(Boolean).join('; ');
          h += `<div class="pregen-yn yn-neutral"><strong>${name}</strong>${detail ? ' — ' + detail : ''}</div>`;
        });
        h += `</div>`;
      }
      break;
    }
    case 12: { // Tổng Quan Đại Vận — line chart
      if (bt.daiVans?.length) {
        h += `<div class="pregen-block">
          <div class="pregen-title"><span class="ic-inline" data-icon-emoji="📈" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📈</span> 9 đại vận — biểu đồ điểm số</div>
          <div style="position:relative;height:240px;margin-top:8px"><canvas id="phan12-line-chart"></canvas></div>
          <div class="pregen-domain-reasons" style="padding-left:0;margin-top:12px">
            · Khởi vận: ${bt.tuoiKhoiVan} tuổi · Hướng: ${bt.daiVanThuan ? 'thuận' : 'nghịch'}<br>
            ${bt.daiVanHienTai ? `· Hiện tại: ĐV${bt.daiVanHienTai.idx+1} (${bt.daiVanHienTai.can} ${bt.daiVanHienTai.chi}, ${bt.daiVanHienTai.tuoiStart}-${bt.daiVanHienTai.tuoiEnd}t) · ${bt.daiVanHienTai.score}/10` : ''}
          </div>
        </div>`;
      }
      break;
    }
    case 13: { // Đại Vận Hiện Tại
      const dv = bt.daiVanHienTai;
      if (dv) {
        h += `<div class="pregen-block">
          <div class="pregen-title"><span class="ic-inline" data-icon-emoji="⚡" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">⚡</span> Đại vận đang trải qua</div>
          <div class="pregen-cach-name">${dv.can} ${dv.chi} — ${dv.thapThanCan}/${dv.thapThanChi}</div>
          <div class="pregen-cach-desc">Tuổi ${dv.tuoiStart}-${dv.tuoiEnd} · Năm ${dv.namStart}-${dv.namEnd} · Score ${dv.score}/10 · ${dv.label}</div>`;
        if (dv.factors?.length) {
          h += `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border-lt)">`;
          dv.factors.forEach(f => {
            const cls = f.delta > 0 ? 'yn-cat' : (f.delta < 0 ? 'yn-hung' : 'yn-neutral');
            const sign = f.delta >= 0 ? '+' : '';
            h += `<div class="pregen-yn ${cls}" style="margin-bottom:4px">${sign}${f.delta}: ${f.text}</div>`;
          });
          h += `</div>`;
        }
        h += `</div>`;
      }
      break;
    }
    case 14: { // Đại Vận Kế Tiếp
      const cur = bt.daiVanHienTai;
      const nextIdx = cur ? cur.idx + 1 : 0;
      const next = bt.daiVans?.[nextIdx];
      if (next) {
        h += `<div class="pregen-block">
          <div class="pregen-title"><span class="ic-inline" data-icon-emoji="🔮" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">🔮</span> Đại vận sắp tới</div>
          <div class="pregen-cach-name">${next.can} ${next.chi} — ${next.thapThanCan}/${next.thapThanChi}</div>
          <div class="pregen-cach-desc">Tuổi ${next.tuoiStart}-${next.tuoiEnd} · Năm ${next.namStart}-${next.namEnd} · Score ${next.score}/10 · ${next.label}</div>`;
        if (next.factors?.length) {
          h += `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border-lt)">`;
          next.factors.slice(0,5).forEach(f => {
            const cls = f.delta > 0 ? 'yn-cat' : (f.delta < 0 ? 'yn-hung' : 'yn-neutral');
            const sign = f.delta >= 0 ? '+' : '';
            h += `<div class="pregen-yn ${cls}" style="margin-bottom:4px">${sign}${f.delta}: ${f.text}</div>`;
          });
          h += `</div>`;
        }
        h += `</div>`;
      }
      break;
    }
    case 15: { // Lưu Niên
      const ln = bt.luuNien;
      if (ln) {
        const factors = ln.factors || [];
        const rels = ln.relations || {};
        h += `<div class="pregen-block">
          <div class="pregen-title"><span class="ic-inline" data-icon-emoji="📅" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📅</span> Năm ${ln.nam} (Lưu Niên)</div>
          <div class="pregen-cach-name">${ln.can} ${ln.chi} — ${ln.thapThanCan} / ${ln.thapThanChi}</div>
          <div class="pregen-cach-desc">Tuổi ${bt.tuoiXem} · Nạp âm ${ln.napAm} · Score ${ln.score}/10 · ${ln.label}</div>`;
        // Relations với tứ trụ
        const relPairs = [];
        if (rels.xungVoi?.length)    relPairs.push({ cls: 'yn-hung', txt: 'Xung với: ' + rels.xungVoi.join(', ') });
        if (rels.hopVoi?.length)     relPairs.push({ cls: 'yn-cat',  txt: 'Hợp với: ' + rels.hopVoi.join(', ') });
        if (rels.hinhVoi?.length)    relPairs.push({ cls: 'yn-hung', txt: 'Hình với: ' + rels.hinhVoi.join(', ') });
        if (rels.haiVoi?.length)     relPairs.push({ cls: 'yn-hung', txt: 'Hại với: ' + rels.haiVoi.join(', ') });
        if (rels.canHopVoi?.length)  relPairs.push({ cls: 'yn-cat',  txt: 'Can hợp: ' + rels.canHopVoi.join(', ') });
        if (rels.canKhacVoi?.length) relPairs.push({ cls: 'yn-neutral', txt: 'Can khắc: ' + rels.canKhacVoi.join(', ') });
        if (relPairs.length) {
          h += `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-lt)">`;
          relPairs.forEach(r => h += `<div class="pregen-yn ${r.cls}" style="margin-bottom:4px">${r.txt}</div>`);
          h += `</div>`;
        }
        // Factors breakdown
        if (factors.length) {
          h += `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-lt)">`;
          factors.forEach(f => {
            const cls = f.delta > 0 ? 'yn-cat' : (f.delta < 0 ? 'yn-hung' : 'yn-neutral');
            const sign = f.delta >= 0 ? '+' : '';
            h += `<div class="pregen-yn ${cls}" style="margin-bottom:4px">${sign}${f.delta}: ${f.text}</div>`;
          });
          h += `</div>`;
        }
        h += `</div>`;
      }
      break;
    }
    case 16: { // Tổng Kết — không pregen, để Claude tự kết
      break;
    }
  }
  return h;
}

  function renderInlineDomainRadar(bt) {
  if (typeof Chart === 'undefined' || typeof window.TuBinhDomainScores === 'undefined') return;
  const canvas = document.getElementById('phan1-radar-chart');
  if (!canvas) return;
  const ds = window.TuBinhDomainScores.tinhDomainScores(bt);
  const labelMap = { suNghiep: 'Sự nghiệp', taiLoc: 'Tài lộc', sangTao: 'Sáng tạo',
    hocVan: 'Học vấn', doiTac: 'Đối tác', honNhan: 'Hôn nhân', sucKhoe: 'Sức khỏe' };
  const order = ['suNghiep','taiLoc','sangTao','hocVan','doiTac','honNhan','sucKhoe'];
  if (window._phan1Radar) try { window._phan1Radar.destroy(); } catch(e) {}
  window._phan1Radar = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: order.map(k => labelMap[k]),
      datasets: [{
        label: 'Điểm 7 trục',
        data: order.map(k => ds[k].score),
        borderColor: '#1455A4',
        backgroundColor: 'rgba(20,85,164,0.20)',
        pointBackgroundColor: '#9A7B3A',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => {
          const k = order[item.dataIndex];
          return [labelMap[k] + ': ' + ds[k].score + '/10'].concat((ds[k].reasons||[]).map(r => '· ' + r));
        } } }
      },
      scales: {
        r: {
          min: 0, max: 10,
          ticks: { stepSize: 2, font: { size: 10 }, color: '#777', backdropColor: 'transparent' },
          pointLabels: { font: { size: 12, family: 'Arial' }, color: '#061A2E' },
          grid: { color: '#E8E8E8' },
          angleLines: { color: '#CCC' },
        }
      }
    }
  });
}

  function renderInlineDaiVanLineChart(bt) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('phan12-line-chart');
  if (!canvas || !bt?.daiVans?.length) return;
  const labels = bt.daiVans.map((dv, i) => `ĐV${i+1} (${dv.tuoiStart}-${dv.tuoiEnd}t)`);
  const scores = bt.daiVans.map(dv => dv.score);
  const cur = bt.daiVanHienTai;
  if (window._phan12Line) try { window._phan12Line.destroy(); } catch(e) {}
  window._phan12Line = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Điểm Đại Vận',
        data: scores,
        borderColor: '#9A7B3A',
        backgroundColor: 'rgba(154,123,58,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: bt.daiVans.map((dv, i) => cur && cur.idx === i ? '#C0392B' : '#061A2E'),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }]
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
          title: (items) => labels[items[0].dataIndex],
          label: (item) => {
            const dv = bt.daiVans[item.dataIndex];
            return [`${dv.can} ${dv.chi} (${dv.thapThanCan})`, `Score: ${dv.score}/10 — ${dv.label}`, `${dv.namStart}-${dv.namEnd}`];
          }
        } }
      }
    }
  });
}

  root.BatTuCore = { TONG_PHAN: TONG_PHAN, PHAN_LABELS: PHAN_LABELS, buildPreGenForPhan: buildPreGenForPhan, renderInlineDomainRadar: renderInlineDomainRadar, renderInlineDaiVanLineChart: renderInlineDaiVanLineChart };
  if (typeof module !== "undefined" && module.exports) module.exports = root.BatTuCore;
})(typeof window !== "undefined" ? window : globalThis);
