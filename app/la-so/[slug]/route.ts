// app/la-so/[slug]/route.ts
// Static-first: serves laso_public (user lá số) + laso_pregen (pre-generated)
export const revalidate = 3600; // ISR: re-generate every hour
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ogImg(base: string, title: string, sub: string): string {
  return `${base}/api/og?${new URLSearchParams({ title: title.slice(0,80), sub }).toString()}`;
}

// Grid position by địa chi (row, col) in 4×4 lá số layout
const GRID_POS: Record<string,[number,number]> = {
  'Tỵ':[0,0],'Ngọ':[0,1],'Mùi':[0,2],'Thân':[0,3],
  'Thìn':[1,0],                                'Dậu':[1,3],
  'Mão':[2,0],                                 'Tuất':[2,3],
  'Dần':[3,0],'Sửu':[3,1],'Tý':[3,2],'Hợi':[3,3],
};
const PHAN_LABELS = ['','Tổng Quan','Cung Mệnh','Cung Phụ Mẫu','Cung Phúc Đức','Cung Điền Trạch','Cung Quan Lộc','Cung Nô Bộc','Cung Thiên Di','Cung Tật Ách','Cung Tài Bạch','Cung Tử Tức','Cung Phu Thê','Cung Huynh Đệ','Tổng Quan Đại Vận','Đại Vận 1','Đại Vận 2','Đại Vận 3','Đại Vận 4','Đại Vận 5','Đại Vận 6','Đại Vận 7','Đại Vận 8','Đại Vận 9','Tiểu Vận & Năm Xem'];
const PHAN_TO_CUNG: Record<number,string> = {2:'Mệnh',3:'Phụ Mẫu',4:'Phúc Đức',5:'Điền Trạch',6:'Quan Lộc',7:'Nô Bộc',8:'Thiên Di',9:'Tật Ách',10:'Tài Bạch',11:'Tử Tức',12:'Phu Thê',13:'Huynh Đệ'};
const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
const MLABELS = ['Tiềm Năng','Bền Vững','An Toàn','Quý Nhân','Minh Bạch','Tương Hợp'];

function renderScoreBars(sc: Record<string,number>): string {
  return METRICS.map((m,i) => {
    const v = sc[m]||0; const pct = v*10;
    const col = v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
    return `<div class="sb-row"><span class="sb-label">${MLABELS[i]}</span><div class="sb-bg"><div class="sb-fill" style="width:${pct}%;background:${col}"></div></div><span class="sb-val">${v}</span></div>`;
  }).join('');
}

function renderCachCucList(items: Array<Record<string,string>>, showDesc = true): string {
  if (!items.length) return '';
  return `<div class="cc-list">${items.map(c=>`<div class="cc-item"><span class="cc-badge cc-${esc(c.loai||'')}">${esc(c.ten||'')}</span>${showDesc&&c.moTa?`<span class="cc-desc">${esc(c.moTa)}</span>`:''}</div>`).join('')}</div>`;
}

function renderGrid(palaces: Array<Record<string,unknown>>, napAm: string, cuc: string, amDuong: string, canChiNam: string, ngaySinh: string): string {
  const cells: string[][] = Array.from({length:4}, ()=>Array(4).fill(''));
  for (const p of palaces) {
    const dc = String(p.diaChi||'');
    const pos = GRID_POS[dc];
    if (!pos) continue;
    const [r,c] = pos;
    const isMenh = Boolean(p.isMenh);
    const majorStars = (p.majorStars as Array<Record<string,unknown>>) || [];
    const allStars   = (p.stars     as Array<Record<string,unknown>>) || [];
    const minorStars = allStars.filter(s => !majorStars.find(m=>m.ten===s.ten));

    const majorHtml = majorStars.map(s => {
      const bCol = ['Miếu','Vượng'].includes(String(s.brightness||'')) ? '#4ade80'
        : s.brightness==='Đắc' ? '#86efac'
        : s.brightness==='Bình hòa'||s.brightness==='Bình' ? '#93c5fd' : '#fca5a5';
      const hoaBadge = s.hoa ? `<sup style="color:#60a5fa;font-size:8px">${esc(String(s.hoa))}</sup>` : '';
      return `<div class="gs-major" style="color:${bCol}">${esc(String(s.ten||''))}${hoaBadge}</div>`;
    }).join('');

    const minorHtml = minorStars.slice(0,8).map(s => {
      const nhom = String(s.nhom||'');
      const col = nhom==='sat'?'#f87171':nhom==='cat'?'#86efac':nhom==='tuan_triet'?'#fbbf24':'#94a3b8';
      return `<span class="gs-minor" style="color:${col}">${esc(String(s.ten||''))}</span>`;
    }).join('');

    cells[r][c] = `<div class="gc${isMenh?' gc-menh':''}">
      <div class="gc-top"><span class="gc-dc">${esc(dc)}</span><span class="gc-cung">${esc(String(p.cungName||''))}</span></div>
      <div class="gc-major">${majorHtml}</div>
      <div class="gc-minor">${minorHtml}</div>
    </div>`;
  }

  // Center 2×2: chart metadata
  const centerHTML = `<div class="gc-center">
    <div class="gc-center-title">${esc(canChiNam)}</div>
    <div class="gc-center-row">Nạp Âm: <b>${esc(napAm)}</b></div>
    <div class="gc-center-row">Cục: <b>${esc(cuc)}</b></div>
    <div class="gc-center-row">${esc(amDuong)}</div>
    <div class="gc-center-row" style="font-size:10px;color:#999;margin-top:4px">${esc(ngaySinh)}</div>
  </div>`;

  let html = '<div class="laso-grid">';
  for (let r=0; r<4; r++) {
    for (let c=0; c<4; c++) {
      if (r===1&&c===1) { html += `<div class="gc-center-wrap" style="grid-column:2/4;grid-row:2/4">${centerHTML}</div>`; continue; }
      if ((r===1||r===2)&&(c===1||c===2)) continue; // skip center cells
      html += cells[r][c] || `<div class="gc"></div>`;
    }
  }
  html += '</div>';
  return html;
}

function buildPregenHTML(row: Record<string,unknown>, slug: string): string {
  const url   = `${BASE}/la-so/${slug}`;
  const gt    = row.gioi_tinh === 'nu' ? 'Nữ' : 'Nam';
  const ngaySinh = row.ngay_sinh ? `${String(row.ngay_sinh).padStart(2,'0')}/${String(row.thang_sinh||'').padStart(2,'0')}/${row.nam_sinh}` : '';
  const title = ngaySinh
    ? `Lá Số Tử Vi ${esc(row.can_chi)} ${gt} Sinh ${ngaySinh} Giờ ${esc(row.gio_chi)} — Cung ${esc(row.cung_menh)} — Tử Vi Minh Bảo`
    : `Lá Số Tử Vi ${esc(row.can_chi)} ${gt} — Cung ${esc(row.cung_menh)} — Tử Vi Minh Bảo`;
  const desc  = ngaySinh
    ? `Lá số tử vi ${row.can_chi} ${gt.toLowerCase()} sinh ngày ${ngaySinh} giờ ${row.gio_chi}, cung mệnh ${row.cung_menh}, chính tinh ${row.chinh_tinh_menh||''}, nạp âm ${row.nap_am||''}. Xem cách cục đặc biệt và phân tích 12 cung theo cổ pháp.`
    : `Lá số tử vi ${row.can_chi} ${gt.toLowerCase()}, cung mệnh ${row.cung_menh}, chính tinh ${row.chinh_tinh_menh||''}, nạp âm ${row.nap_am||''}. Xem cách cục đặc biệt và phân tích 12 cung theo cổ pháp.`;
  const img   = ogImg(BASE, title, 'Lá Số Tử Vi · Cổ Pháp');
  const schema = JSON.stringify([
    {'@context':'https://schema.org','@type':'Article',headline:title,description:desc,url,inLanguage:'vi',
     author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
     publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
     image:{'@type':'ImageObject',url:img}},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:'Mệnh Khố',item:`${BASE}/menh-kho.html`},
      {'@type':'ListItem',position:3,name:title,item:url}]},
  ]);

  const cachCuc: Array<Record<string,string>> = (row.cach_cuc as Array<Record<string,string>>) || [];
  const daiVan: Array<Record<string,unknown>> = (row.dai_van as Array<Record<string,unknown>>) || [];
  const cungScores: Record<string,Record<string,number>> = (row.cung_scores as Record<string,Record<string,number>>) || {};
  const engineData = (row.engine_data as Record<string,unknown>) || {};
  const palaces = (engineData.palaces as Array<Record<string,unknown>>) || [];
  const cachCucTungCung: Record<string,string[]> = (engineData.cachCucTungCung as Record<string,string[]>) || {};

  // ── Grid ──
  const gridHTML = palaces.length > 0 ? renderGrid(
    palaces,
    String(engineData.napAm||row.nap_am||''),
    String(row.cuc||''),
    String(row.am_duong||''),
    String(engineData.canChiNam||row.can_chi||''),
    ngaySinh ? `Sinh ${ngaySinh}` : '',
  ) : '';

  // ── Phần 1: Tổng Quan ──
  const topScores = Object.entries(cungScores)
    .map(([c,sc]):[string,number] => [c, METRICS.reduce((s,m)=>s+(sc[m]||0),0)])
    .sort((a,b)=>b[1]-a[1]);
  const phan1 = `
    ${cachCuc.length>0 ? `<div class="pg-block"><div class="pg-title">⚙ Cách Cục Đặc Biệt</div>${renderCachCucList(cachCuc)}</div>` : '<p class="no-cc">Lá số này không có cách cục đặc biệt nổi bật.</p>'}
    ${topScores.length>0 ? `<div class="pg-block"><div class="pg-title">📊 Cung mạnh / yếu</div>
      <div class="pg-row pg-good">Mạnh nhất: ${topScores.slice(0,3).map(([c,s])=>`${c} (${s.toFixed(0)}đ)`).join(', ')}</div>
      <div class="pg-row pg-bad">Yếu nhất: ${topScores.slice(-3).reverse().map(([c,s])=>`${c} (${s.toFixed(0)}đ)`).join(', ')}</div>
    </div>` : ''}`;

  // ── Phần 2–13: từng cung ──
  const phanCung: string[] = Array(14).fill('');
  for (let phan=2; phan<=13; phan++) {
    const cungName = PHAN_TO_CUNG[phan];
    const ynItems = cachCucTungCung[cungName] || [];
    const ccCung = cachCuc.filter(c => c.cung === cungName);
    const sc = cungScores[cungName];
    let html = '';
    if (ccCung.length) html += `<div class="pg-block"><div class="pg-title">⚙ Cách cục</div>${renderCachCucList(ccCung, false)}</div>`;
    if (ynItems.length) {
      html += `<div class="pg-block"><div class="pg-title">📋 Phân tích sao</div>`;
      for (const y of ynItems) {
        const cls = y.includes('đại cát')||y.includes('đại phú') ? 'yn-great-cat'
          : y.includes('[cát]')||y.includes('phú quý') ? 'yn-cat'
          : y.includes('đại hung') ? 'yn-great-hung'
          : y.includes('hung')||y.includes('vất vả') ? 'yn-hung'
          : y.includes('Tuần')||y.includes('Triệt') ? 'yn-tuan' : 'yn-neutral';
        html += `<div class="yn-item ${cls}">• ${esc(y)}</div>`;
      }
      html += `</div>`;
    }
    if (sc) html += `<div class="pg-block"><div class="pg-title">📈 Đánh giá 6 chiều — ${cungName}</div><div class="score-bars">${renderScoreBars(sc)}</div></div>`;
    phanCung[phan] = html;
  }

  // ── Phần 14: Tổng Quan Đại Vận ──
  const phan14 = daiVan.length>0 ? `
    <div class="pg-block"><div class="pg-title">📅 Các Đại Vận Trong Đời</div>
      <div class="dv-list">${daiVan.slice(0,9).map(d=>{
        const active = Boolean(d.isCurrentDV);
        const sc = (d.scoring as Record<string,unknown>|null);
        const tot = sc ? Number((sc.tong as number)||0) : null;
        const col = tot!=null ? (tot>=7?'#4ade80':tot>=4?'#60a5fa':'#f87171') : '';
        return `<div class="dv-item${active?' dv-active':''}">
          <div class="dv-age">${esc(d.startAge||'')}–${esc(d.endAge||'')}</div>
          <div class="dv-canchi">${esc(d.canChi||'')}</div>
          ${tot!=null?`<div style="font-size:9px;color:${col};font-weight:700;margin-top:2px">${tot}/10</div>`:''}
          ${active?'<div class="dv-now">Hiện tại</div>':''}
        </div>`;
      }).join('')}</div>
    </div>` : '';

  // ── Phần 15–23: chi tiết từng đại vận ──
  const phanDV: string[] = Array(10).fill('');
  for (let i=0; i<daiVan.length && i<9; i++) {
    const dv = daiVan[i];
    const dvPalace = palaces[Number(dv.cungIdx??-1)];
    let html = '';
    // Scoring
    const sc = dv.scoring as Record<string,unknown>|null;
    if (sc) {
      const tt = Number((sc.thienThoi as Record<string,unknown>)?.score ?? sc.thienThoi ?? 0);
      const dl = Number((sc.diaLoi as Record<string,unknown>)?.score ?? sc.diaLoi ?? 0);
      const nh = Number((sc.nhanHoa as Record<string,unknown>)?.score ?? sc.nhanHoa ?? 0);
      const tot = Number(sc.tong||0);
      const totCol = tot>=7?'#4ade80':tot>=4?'#60a5fa':'#f87171';
      const flag = String(sc.flag||'');
      html += `<div class="pg-block"><div class="pg-title">📊 Scoring Đại Vận ${esc(dv.canChi||'')} (tuổi ${esc(dv.startAge||'')}–${esc(dv.endAge||'')})</div>
        <div class="score-bars">
          <div class="sb-row"><span class="sb-label">Thiên Thời</span><div class="sb-bg"><div class="sb-fill" style="width:${tt/5*100}%;background:#c9a84c"></div></div><span class="sb-val">${tt}/5</span></div>
          <div class="sb-row"><span class="sb-label">Địa Lợi</span><div class="sb-bg"><div class="sb-fill" style="width:${dl*100}%;background:#0E7490"></div></div><span class="sb-val">${dl}/1</span></div>
          <div class="sb-row"><span class="sb-label">Nhân Hòa</span><div class="sb-bg"><div class="sb-fill" style="width:${nh/4*100}%;background:#7B2FBE"></div></div><span class="sb-val">${nh}/4</span></div>
          <div class="sb-row" style="border-top:1px solid #e0e0e0;padding-top:5px;margin-top:3px"><span class="sb-label" style="font-weight:600">Tổng ${esc(flag)}</span><div class="sb-bg"><div class="sb-fill" style="width:${tot/10*100}%;background:${totCol}"></div></div><span class="sb-val" style="color:${totCol};font-weight:600">${tot}/10</span></div>
        </div>
      </div>`;
    }
    // Chính tinh cung đại vận
    if (dvPalace) {
      const majors = (dvPalace.majorStars as Array<Record<string,unknown>>) || [];
      html += `<div class="pg-block"><div class="pg-title">⭐ Chính Tinh Cung Đại Vận — ${esc(String(dvPalace.cungName||''))} (${esc(String(dvPalace.diaChi||''))})</div>`;
      if (majors.length===0) {
        html += `<div class="yn-item yn-neutral">Vô chính diệu</div>`;
      } else {
        for (const s of majors) {
          const bCol = ['Miếu','Vượng'].includes(String(s.brightness||'')) ? '#4ade80' : String(s.brightness||'')==='Đắc' ? '#86efac' : '#fca5a5';
          const hoaStr = s.hoa ? ` [Hóa ${esc(String(s.hoa))}]` : '';
          html += `<div class="yn-item yn-neutral"><b style="color:#1a1a1a">${esc(String(s.ten||''))}</b> <span style="color:${bCol};font-size:11px">(${esc(String(s.brightness||''))})</span>${esc(hoaStr)}</div>`;
        }
      }
      html += `</div>`;
    }
    // Rules luận đoán
    const rules = (dv.rules as Array<{type:string;text:string}>) || [];
    if (rules.length) {
      const tot2  = rules.filter(r=>r.type==='tot');
      const xau   = rules.filter(r=>r.type==='xau');
      const cb    = rules.filter(r=>r.type==='canh_bao');
      const trung = rules.filter(r=>r.type==='trung');
      html += `<div class="pg-block"><div class="pg-title">🔮 Luận Đoán Vận Hạn</div>`;
      for (const r of tot2)  html += `<div class="yn-item yn-cat">✦ ${esc(r.text)}</div>`;
      for (const r of trung) html += `<div class="yn-item yn-neutral">◆ ${esc(r.text)}</div>`;
      for (const r of xau)   html += `<div class="yn-item yn-hung">▼ ${esc(r.text)}</div>`;
      for (const r of cb)    html += `<div class="yn-item yn-great-hung">⚠ ${esc(r.text)}</div>`;
      html += `</div>`;
    }
    phanDV[i+1] = html;
  }

  // ── Phần 24: Tiểu Vận & Năm Xem ──
  const dvHT = daiVan.find(d=>d.isCurrentDV);
  const phan24 = dvHT ? `<div class="pg-block"><div class="pg-title">📅 Đại Vận Hiện Tại — ${esc(dvHT.canChi||'')} (tuổi ${esc(dvHT.startAge||'')}–${esc(dvHT.endAge||'')})</div>
    <div class="yn-item yn-neutral">Đang trong đại vận <b>${esc(dvHT.canChi||'')}</b>. Xem luận giải đầy đủ bên dưới.</div>
  </div>` : '';

  // ── Render all 24 sections ──
  const sections = [
    {phan:1, label:PHAN_LABELS[1], html:phan1},
    ...([2,3,4,5,6,7,8,9,10,11,12,13].map(p=>({phan:p,label:PHAN_LABELS[p],html:phanCung[p]||''}))),
    {phan:14,label:PHAN_LABELS[14],html:phan14},
    ...([1,2,3,4,5,6,7,8,9].map(i=>({phan:14+i,label:PHAN_LABELS[14+i],html:phanDV[i]||''}))),
    {phan:24,label:PHAN_LABELS[24],html:phan24},
  ];

  const sectionsHTML = sections.map(({phan, label, html}) => `
    <div class="phan-section" id="phan-${phan}">
      <div class="phan-header">
        <span class="phan-num">Phần ${phan} / 24</span>
        <span class="phan-label">${esc(label)}</span>
      </div>
      ${html || '<p class="no-cc">Không có dữ liệu cho phần này.</p>'}
      <div class="phan-lock">
        <div class="lock-blur"><p>Luận giải chuyên sâu về ${esc(label.toLowerCase())} — phân tích cách cục, tổ hợp sao, vận hạn theo cổ pháp Tử Vi Đẩu Số...</p></div>
        <div class="lock-cta">
          <span class="lock-icon">🔒</span>
          <span class="lock-text">Luận giải AI đầy đủ</span>
          <a href="/" class="lock-btn">Xem ngay →</a>
        </div>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}.bc span{color:var(--border)}
.wrap{flex:1;max-width:940px;margin:0 auto;padding:32px 40px 80px;width:100%}
.hero{background:linear-gradient(135deg,var(--navy),var(--navy-mid));border-radius:12px;padding:24px 28px;color:#fff;margin-bottom:24px}
.hero-eyebrow{font-size:10px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px}
.hero-title{font-family:'Noto Serif',serif;font-size:24px;font-weight:600;margin-bottom:10px;line-height:1.3}
.hero-tags{display:flex;gap:6px;flex-wrap:wrap}
.hero-tag{font-size:11px;padding:2px 9px;border-radius:12px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.85)}
/* Grid */
.laso-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,auto);gap:2px;background:#c8c8c8;border:2px solid #c8c8c8;border-radius:6px;margin-bottom:28px;font-family:'Be Vietnam Pro',sans-serif}
.gc{background:#fff;padding:7px 8px;min-height:100px;display:flex;flex-direction:column;gap:3px}
.gc-menh{background:#fffbef;border:1.5px solid #c9a84c}
.gc-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px}
.gc-dc{font-size:10px;color:#888;font-weight:500}
.gc-cung{font-size:10px;font-weight:700;color:var(--navy)}
.gc-major{display:flex;flex-direction:column;gap:1px}
.gs-major{font-family:'Noto Serif',serif;font-size:12px;font-weight:600;line-height:1.3}
.gc-minor{display:flex;flex-wrap:wrap;gap:2px;margin-top:2px}
.gs-minor{font-size:9px;line-height:1.3}
.gc-center-wrap{background:#F0F4F9;display:flex;align-items:center;justify-content:center}
.gc-center{text-align:center;padding:10px}
.gc-center-title{font-family:'Noto Serif',serif;font-size:15px;font-weight:700;color:var(--navy);margin-bottom:6px}
.gc-center-row{font-size:11px;color:var(--text-mid);margin-bottom:2px}
/* Phần sections */
.phan-section{margin-bottom:20px;border:1px solid var(--border-lt);border-radius:10px;overflow:hidden}
.phan-header{display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--bg-soft);border-bottom:1px solid var(--border-lt)}
.phan-num{font-size:10px;font-weight:700;color:var(--text-lt);letter-spacing:.05em}
.phan-label{font-family:'Noto Serif',serif;font-size:14px;font-weight:600;color:var(--navy)}
.phan-section>*:not(.phan-header):not(.phan-lock){padding:12px 16px 0}
/* Pre-gen blocks */
.pg-block{background:var(--bg-soft);border-radius:7px;padding:10px 13px;margin:0 16px 12px}
.pg-title{font-size:10px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px}
.pg-row{font-size:12px;margin:3px 0}
.pg-good{color:#1a6b3a}.pg-bad{color:#c0392b}
.cc-list{display:flex;flex-direction:column;gap:8px}
.cc-item{display:flex;align-items:flex-start;gap:8px;padding:8px 11px;background:#fff;border-radius:6px;border-left:3px solid var(--gold)}
.cc-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:3px;white-space:nowrap;background:#2a1f5e;color:#a78bfa;flex-shrink:0}
.cc-desc{font-size:12px;color:var(--text-mid);line-height:1.5}
.no-cc{font-size:12px;color:var(--text-lt);font-style:italic;padding:8px 16px}
/* Yn items */
.yn-item{font-size:12px;line-height:1.6;padding:2px 0}
.yn-cat{color:#1a6b3a}.yn-great-cat{color:#166534;font-weight:600}
.yn-hung{color:#c0392b}.yn-great-hung{color:#991b1b;font-weight:600}
.yn-tuan{color:#92400e}.yn-neutral{color:var(--text-mid)}
/* Scores */
.score-bars{display:flex;flex-direction:column;gap:4px}
.sb-row{display:flex;align-items:center;gap:6px}
.sb-label{font-size:10px;color:var(--text-lt);width:68px;flex-shrink:0}
.sb-bg{flex:1;height:5px;background:#d0d8e0;border-radius:3px;overflow:hidden}
.sb-fill{height:100%;border-radius:3px}
.sb-val{font-size:10px;color:var(--text-mid);width:22px;text-align:right}
/* DV list */
.dv-list{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.dv-item{text-align:center;padding:8px 11px;border:1.5px solid var(--border-lt);border-radius:7px;min-width:66px}
.dv-active{border-color:var(--gold);background:var(--gold-lt)}
.dv-age{font-size:9px;color:var(--text-lt);margin-bottom:2px}
.dv-canchi{font-family:'Noto Serif',serif;font-size:13px;font-weight:600;color:var(--navy)}
.dv-now{font-size:8px;color:var(--gold);font-weight:700;margin-top:2px}
/* Lock paywall */
.phan-lock{margin:12px 16px 16px;border-radius:8px;overflow:hidden;border:1px solid var(--border-lt)}
.lock-blur{padding:12px 14px;font-size:13px;line-height:1.75;color:#999;filter:blur(3px);user-select:none;pointer-events:none}
.lock-cta{display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(135deg,#171a4a,#2d2060);color:#fff;font-size:13px}
.lock-icon{font-size:16px}
.lock-text{flex:1;font-weight:500}
.lock-btn{background:#8b6dff;color:#fff;padding:6px 16px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;white-space:nowrap}
@media(max-width:700px){.bc,.wrap{padding-left:14px;padding-right:14px}.hero-title{font-size:20px}.gs-major{font-size:11px}.gc{min-height:80px;padding:5px 6px}}
</style>
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/menh-kho.html">Mệnh Khố</a><span>›</span>
  <span>${esc(row.can_chi)} ${gt} — Cung ${esc(row.cung_menh)}</span>
</div>
<div class="wrap">
  <div class="hero">
    <div class="hero-eyebrow">Lá Số Tử Vi · Cổ Pháp</div>
    <div class="hero-title">Lá Số ${esc(row.can_chi)} ${gt}${ngaySinh?` · Sinh ${ngaySinh}`:''} — Cung Mệnh ${esc(row.cung_menh)}</div>
    <div class="hero-tags">
      ${row.chinh_tinh_menh?`<span class="hero-tag">⭐ ${esc(row.chinh_tinh_menh)}</span>`:''}
      ${row.nap_am?`<span class="hero-tag">🔥 ${esc(row.nap_am)}</span>`:''}
      ${row.cuc?`<span class="hero-tag">Cục ${esc(row.cuc)}</span>`:''}
      ${row.am_duong?`<span class="hero-tag">${esc(row.am_duong)}</span>`:''}
      ${row.gio_chi?`<span class="hero-tag">Giờ ${esc(row.gio_chi)}</span>`:''}
    </div>
  </div>

  ${gridHTML ? `<div class="section-label">Lá Số</div>${gridHTML}` : ''}

  ${sectionsHTML}

  <div style="margin-top:36px;padding:24px;background:linear-gradient(135deg,#171a4a,#2d2060);border-radius:12px;color:#fff;text-align:center">
    <div style="font-family:'Noto Serif',serif;font-size:18px;margin-bottom:8px">Luận Giải AI Đầy Đủ — 24 Phần</div>
    <p style="font-size:13px;opacity:.85;margin-bottom:16px;line-height:1.6">Nhập đúng giờ sinh để có luận giải chuyên sâu về tính cách, sự nghiệp, tình duyên, vận hạn theo cổ pháp Tử Vi Đẩu Số.</p>
    <a style="display:inline-block;background:#8b6dff;color:#fff;padding:11px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px" href="/">Xem Luận Giải →</a>
  </div>
</div>
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body></html>`;
}

function buildPublicHTML(row: Record<string,unknown>, slug: string): string {
  const url   = `${BASE}/la-so/${slug}`;
  const gt    = row.gioi_tinh === 'nu' ? 'Nữ' : 'Nam';
  const title = `Lá Số ${esc(row.can_chi_nam)} ${gt} — Cung ${esc(row.cung_menh)} — Tử Vi Minh Bảo`;
  const desc  = `Lá số tử vi ${row.can_chi_nam} ${gt.toLowerCase()}, cung mệnh ${row.cung_menh}, chính tinh ${row.chinh_tinh || ''}, nạp âm ${row.nap_am || ''}.`;

  const img   = ogImg(BASE, title, `Cung ${esc(row.cung_menh as string)}`);
  const schema = JSON.stringify([
    {'@context':'https://schema.org','@type':'Article',headline:title,description:desc,url,inLanguage:'vi',
     datePublished:(row.created_at as string||'').slice(0,10)||undefined,
     author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
     publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
     image:{'@type':'ImageObject',url:img}},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:'Mệnh Khố',item:`${BASE}/menh-kho.html`},
      {'@type':'ListItem',position:3,name:title,item:url}]},
  ]);
  const commonHead = `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${schema}</script>`;
  const bcHTML = `<div style="background:#F5F4F0;border-bottom:1px solid #E8E8E8;padding:12px 40px;font-size:12px;color:#777;display:flex;gap:8px;align-items:center">
  <a href="/" style="color:#777;text-decoration:none">Trang Chủ</a><span style="color:#CCC">›</span>
  <a href="/menh-kho.html" style="color:#777;text-decoration:none">Mệnh Khố</a><span style="color:#CCC">›</span>
  <span>${esc(row.can_chi_nam as string)} ${esc(gt)} — Cung ${esc(row.cung_menh as string)}</span>
</div>`;

  // If rendered_html exists, embed it directly
  if (row.rendered_html) {
    return `<!DOCTYPE html><html lang="vi"><head>
${commonHead}
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
${bcHTML}
${row.rendered_html}
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body></html>`;
  }

  // Fallback: basic layout
  const luanGiai: Record<string,string> = (row.luan_giai as Record<string,string>) || {};
  const sections = Object.entries(luanGiai).sort(([a],[b]) => Number(a)-Number(b));
  const bodyHTML = sections.map(([,v]) => `<div style="margin-bottom:24px">${String(v||'').split('\n').map(l=>`<p>${l}</p>`).join('')}</div>`).join('');

  return `<!DOCTYPE html><html lang="vi"><head>
${commonHead}
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script src="/auth.js" defer></script>
<style>
body{font-family:'Be Vietnam Pro',sans-serif;max-width:760px;margin:0 auto;padding:0 20px 40px;color:#333}
h1{font-family:'Noto Serif',serif;color:#061A2E;margin:32px 0 24px}
p{margin-bottom:14px;line-height:1.8;color:#444}
</style>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
${bcHTML}
<h1>${title}</h1>
<div>${bodyHTML}</div>
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body></html>`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return NextResponse.redirect(`${BASE}/menh-kho.html`);

  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  // 1. Try laso_public first
  const pubRes = await fetch(
    `${SB_URL}/rest/v1/laso_public?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers }
  );
  if (pubRes.ok) {
    const rows = await pubRes.json();
    if (rows?.length) {
      const html = buildPublicHTML(rows[0], slug);
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }});
    }
  }

  // 2. Try laso_pregen
  const preRes = await fetch(
    `${SB_URL}/rest/v1/laso_pregen?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers }
  );
  if (preRes.ok) {
    const rows = await preRes.json();
    if (rows?.length) {
      const html = buildPregenHTML(rows[0], slug);
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }});
    }
  }

  // 3. Not found → redirect
  return NextResponse.redirect(`${BASE}/menh-kho.html`);
}
