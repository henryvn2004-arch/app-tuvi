// app/api/admin/sample-laso/route.ts
// Sample page: render lá số Nam 03/06/1998 giờ Sửu dưới dạng HTML grid + text blocks
// Preview ISR page layout trước khi build 438K pages
// Secured: /api/admin/sample-laso?secret=tuvi2024admin
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'tuvi2024admin';
const BASE = 'https://www.tuviminhbao.com';

type Rec = Record<string, unknown>;
const DCHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// Grid position: diaChi index → [row, col] trong 4×4 grid
const DCHI_TO_POS: Record<number, [number,number]> = {
  0:[3,2], 1:[3,1], 2:[3,0], 3:[2,0],
  4:[1,0], 5:[0,0], 6:[0,1], 7:[0,2],
  8:[0,3], 9:[1,3], 10:[2,3], 11:[3,3],
};

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function loadEngine() {
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Rec;
  g.window = g;
  return (new Function('window','globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};'))(g,g) as {
    convertDuongToAm: (...a: unknown[]) => unknown;
    anSaoLaSo: (...a: unknown[]) => unknown;
  };
}

// ── Render lá số grid 4×4 ───────────────────────────────────────────
function renderGrid(ls: Rec): string {
  const palaces = (ls.palaces as Rec[]) || [];

  // Map diacChi index → palace
  const dcMap: Record<number, Rec> = {};
  palaces.forEach(p => {
    const dc = DCHI.indexOf(String(p.diaChi||''));
    if (dc >= 0) dcMap[dc] = p;
  });

  // Build 4×4 grid array
  const grid: (Rec|null|'center')[][] = Array.from({length:4}, () => Array(4).fill(null));
  Object.entries(DCHI_TO_POS).forEach(([dcStr, [r,c]]) => {
    grid[r][c] = dcMap[parseInt(dcStr)] || null;
  });
  // Center cells
  grid[1][1] = grid[1][2] = grid[2][1] = grid[2][2] = 'center';

  // Đại vận hiện tại
  const dvs = (ls.daiVans as Rec[]) || [];
  const curDV = dvs.find(d => d.isCurrentDV) as Rec|undefined;

  const HOA_COLORS: Record<string, string> = { 'Lộc':'#1E6B3C','Quyền':'#7B3FA0','Khoa':'#1455A4','Kỵ':'#C0392B' };
  const SAT = new Set(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp','Tang Môn','Bạch Hổ']);

  function renderStar(s: Rec) {
    const ten  = String(s.ten||'');
    const hoa  = String(s.hoa||'');
    const bright = String(s.brightness||'');
    const isSat  = SAT.has(ten);
    const col    = hoa ? HOA_COLORS[hoa]||'#1455A4' : isSat ? '#C0392B' : '#1a1a1a';
    const bDot   = bright === 'Miếu' || bright === 'Vượng' ? '●' : '';
    return `<span style="color:${col};font-size:11px;font-weight:700;white-space:nowrap">${esc(ten)}${hoa?`<sup style="font-size:8px;color:${HOA_COLORS[hoa]}">${esc(hoa[0])}</sup>`:''}${bDot?`<sup style="color:#4ade80;font-size:8px">${bDot}</sup>`:''}</span>`;
  }

  function renderCell(p: Rec): string {
    const cungName  = String(p.cungName||'');
    const diacChi   = String(p.diaChi||'');
    const majStars  = (p.majorStars as Rec[])||[];
    const allStars  = (p.stars as Rec[])||[];
    const minStars  = allStars.filter(s => !majStars.find(m => m.ten === s.ten));
    const isMenh    = !!p.isMenh;
    const isVmong   = !!p.isVong;
    const trangSinh = String(p.trangSinh||'');
    const hasTuan   = allStars.some(s => s.ten==='Tuần');
    const hasTriet  = allStars.some(s => s.ten==='Triệt');

    // Đại vận badge
    const dcIdx = DCHI.indexOf(diacChi);
    const dvForCung = dvs.find(d => d.cungIdx === dcIdx) as Rec|undefined;
    const dvBadge = dvForCung ? `<span style="position:absolute;bottom:3px;right:5px;font-size:10px;font-weight:700;color:#555">${esc(String(dvForCung.canChi||''))}</span>` : '';

    const tuanTag  = hasTuan  ? '<span style="position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);background:#2c4a00;color:#fff;font-size:8px;font-weight:700;padding:0 5px;border-radius:2px">Tuần</span>' : '';
    const trietTag = hasTriet ? '<span style="position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);background:#4a0000;color:#fff;font-size:8px;font-weight:700;padding:0 5px;border-radius:2px">Triệt</span>' : '';

    const border = isMenh ? '2px solid #1455A4' : curDV && dcIdx === dvs.indexOf(curDV) ? '2px solid #1E6B3C' : '1px solid #aaa';
    const bg     = isMenh ? '#EEF4FF' : '#fff';

    return `<div style="border:${border};background:${bg};padding:6px 6px 18px;min-height:130px;position:relative;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">
        <span style="font-size:9px;color:#888">${esc(diacChi)}</span>
        ${isVmong?'<span style="font-size:8px;color:#888;border:1px solid #ccc;padding:0 3px;border-radius:2px">Vong</span>':''}
      </div>
      <div style="text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#222;margin-bottom:3px">
        ${esc(cungName)}${isMenh?'<span style="font-size:9px;color:#1455A4;margin-left:3px">⊕</span>':''}
      </div>
      <div style="text-align:center;margin-bottom:4px">
        ${majStars.map(s=>renderStar(s)).join('<br>')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 3px;flex:1">
        ${minStars.slice(0,8).map(s=>`<div>${renderStar(s)}</div>`).join('')}
      </div>
      <div style="position:absolute;bottom:3px;left:5px;font-size:9px;color:#999">${esc(trangSinh)}</div>
      ${dvBadge}${tuanTag}${trietTag}
    </div>`;
  }

  // Center cell content (mệnh info)
  const menhP = palaces.find(p => p.isMenh) as Rec|undefined;
  const napAm = String(ls.napAm||'');
  const cuc   = String(ls.cuc||'');
  const canChiNam = String((ls as Rec).canChiNam||'');
  const centerHTML = `<div style="border:1px solid #ddd;background:#F9F4EB;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12px;grid-column:span 2;grid-row:span 2">
    <div style="font-size:10px;color:#9A7B3A;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">紫微明寶</div>
    <div style="font-size:14px;font-weight:700;color:#061A2E;margin-bottom:4px">${esc(canChiNam)}</div>
    <div style="font-size:11px;color:#444;margin-bottom:2px">Cung ${esc(String(menhP?.cungName||''))}</div>
    <div style="font-size:10px;color:#777;margin-bottom:2px">${esc(napAm)}</div>
    <div style="font-size:10px;color:#777">${esc(cuc)}</div>
  </div>`;

  // Render grid rows
  let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);border:2px solid #333;background:#333;gap:1px">`;
  let centerRendered = false;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = grid[r][c];
      if (cell === 'center') {
        if (!centerRendered && r===1 && c===1) {
          html += centerHTML;
          centerRendered = true;
        }
        continue;
      }
      html += cell ? renderCell(cell) : `<div style="background:#f8f8f8;min-height:130px"></div>`;
    }
  }
  html += '</div>';
  return html;
}

// ── Render pre-gen text blocks ───────────────────────────────────────
function renderTextBlocks(ls: Rec): string {
  const cachCuc = (ls.cachCuc as Rec[]) || [];
  const scores  = (ls.cungScores as Record<string, Record<string,number>>) || {};
  const CUNGS   = ['Mệnh','Quan Lộc','Tài Bạch','Phu Thê','Tử Tức'];
  const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
  const MLABELS = ['Tiềm Năng','Bền Vững','An Toàn','Quý Nhân','Minh Bạch','Tương Hợp'];

  const LOAIs: Record<string, string> = {
    quy_cuc:'background:#2a1f5e;color:#a78bfa',
    phu_cuc:'background:#1f3a2a;color:#4ade80',
    hung_cuc:'background:#3a1f1f;color:#f87171',
    trung_cuc:'background:#2a2a1f;color:#fbbf24',
    than_cu:'background:#1e1e1e;color:#94a3b8',
  };

  // Cach cuc
  const ccHTML = cachCuc.length > 0 ? `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:#1a3a6a;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">⚙ Cách Cục Đặc Biệt (${cachCuc.length})</div>
      ${cachCuc.map(c => {
        const style = LOAIs[String(c.loai||'')] || 'background:#1e1e1e;color:#94a3b8';
        return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;padding:8px 12px;background:#f5f5f5;border-radius:6px">
          <span style="${style};font-size:11px;font-weight:700;padding:2px 7px;border-radius:3px;white-space:nowrap">${esc(String(c.ten||''))}</span>
          <span style="font-size:12px;color:#444;line-height:1.5">${esc(String(c.moTa||c.tomTat||''))}</span>
        </div>`;
      }).join('')}
    </div>` : '<p style="font-size:13px;color:#888;font-style:italic;margin-bottom:20px">Không có cách cục đặc biệt</p>';

  // Scores for top cungs
  const scoresHTML = CUNGS.map(cung => {
    const sc = scores[cung];
    if (!sc) return '';
    const total = METRICS.reduce((s,m)=>s+(sc[m]||0),0);
    return `<div style="background:#F5F4F0;border-radius:8px;padding:12px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:#061A2E;margin-bottom:8px">${esc(cung)} <span style="font-weight:400;color:#888;font-size:11px">(${(total/METRICS.length).toFixed(1)}/10)</span></div>
      ${METRICS.map((m,i) => {
        const v=sc[m]||0;const pct=v*10;
        const col=v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:10px;color:#666;width:72px;flex-shrink:0">${MLABELS[i]}</span>
          <div style="flex:1;height:6px;background:#d0d8e0;border-radius:3px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${col};border-radius:3px"></div>
          </div>
          <span style="font-size:10px;color:#444;width:18px;text-align:right">${v}</span>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  // Dai van
  const dvs = (ls.daiVans as Rec[]) || [];
  const dvHTML = dvs.slice(0,9).map(dv => {
    const sc = (dv.scoring as Rec)||{};
    const tong = sc.tong as number || 0;
    const col  = tong>=7?'#1a6b3a':tong>=4?'#7a5f0a':'#6b1a1a';
    const isCur = !!dv.isCurrentDV;
    return `<div style="text-align:center;padding:8px 10px;border:${isCur?'2px solid #c9a84c':'1px solid #e0e0e0'};border-radius:6px;background:${isCur?'#F9F4EB':'#fff'}">
      <div style="font-size:10px;color:#888;margin-bottom:2px">${esc(String(dv.tuoiStart||''))}–${esc(String(dv.tuoiEnd||''))}t</div>
      <div style="font-size:12px;font-weight:700;color:#061A2E">${esc(String(dv.canChi||''))}</div>
      ${tong>0?`<div style="font-size:11px;font-weight:700;color:${col};margin-top:2px">${tong}/10</div>`:''}
      ${isCur?'<div style="font-size:9px;color:#9A7B3A;font-weight:700;margin-top:2px">Hiện tại</div>':''}
    </div>`;
  }).join('');

  return `
    <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0;margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;border-bottom:2px solid #061A2E;padding-bottom:8px">⚙ CÁCH CỤC</div>
      ${ccHTML}
    </div>
    <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0;margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;border-bottom:2px solid #061A2E;padding-bottom:8px">📊 ĐIỂM 6 CHIỀU</div>
      ${scoresHTML}
    </div>
    <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;border-bottom:2px solid #061A2E;padding-bottom:8px">📅 ĐẠI VẬN</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${dvHTML}</div>
    </div>`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (sp.get('secret') !== ADMIN_SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Test case params (có thể override qua query)
  const day     = parseInt(sp.get('day') || '3');
  const month   = parseInt(sp.get('month') || '6');
  const year    = parseInt(sp.get('year') || '1998');
  const gioIdx  = parseInt(sp.get('gio') || '1');   // 1 = giờ Sửu
  const gt      = sp.get('gt') || 'nam';
  const namXem  = parseInt(sp.get('namXem') || '2027');

  // Load engine và compute
  let ls: Rec;
  try {
    const { convertDuongToAm, anSaoLaSo } = loadEngine();
    const conv = convertDuongToAm(day, month, year, [23,1,3,5,7,9,11,13,15,17,19,21][gioIdx]) as Rec;
    if (!conv?.amLich) return NextResponse.json({ error: 'convertDuongToAm failed' }, { status: 500 });
    const al = conv.amLich as Rec;
    ls = anSaoLaSo({
      ngayAL: al.day, thangAL: al.month, namAL: year,
      canNam: conv.canNam, chiNam: conv.chiNam, gioIdx,
      gioitinh: gt, namXem,
    }) as Rec;
    if (!ls) return NextResponse.json({ error: 'anSaoLaSo failed' }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  // Build display data
  const palaces   = (ls.palaces as Rec[]) || [];
  const menhP     = palaces.find(p => p.isMenh) as Rec|undefined;
  const cungMenh  = String(menhP?.cungName||'');
  const chinhTinh = ((menhP?.majorStars as Rec[]) || []).map(s=>String(s.ten||'')).join(', ');
  const cachCuc   = (ls.cachCuc as Rec[]) || [];
  const canChiNam = String((ls as Rec).canChiNam||'');
  const napAm     = String(ls.napAm||'');
  const scores    = (ls.cungScores as Record<string, Record<string,number>>) || {};
  const sc        = scores[cungMenh];
  const METRICS   = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
  const diemMenh  = sc ? METRICS.reduce((s,m)=>s+(sc[m]||0),0)/METRICS.length : 0;

  // OG image URL preview
  const ccNames   = cachCuc.slice(0,3).map(c=>String(c.ten||'')).join(',');
  const ogUrl     = `/api/og/laso?cm=${encodeURIComponent(cungMenh)}&ct=${encodeURIComponent(chinhTinh)}&cc=${encodeURIComponent(ccNames)}&diem=${diemMenh.toFixed(1)}&gt=${gt==='nam'?'Nam':'Nữ'}&year=${year}&cc_nam=${encodeURIComponent(canChiNam)}`;

  const gridHTML  = renderGrid(ls);
  const textHTML  = renderTextBlocks(ls);

  const html = `<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Sample Lá Số — ${day}/${month}/${year} Giờ ${['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'][gioIdx]} ${gt==='nam'?'Nam':'Nữ'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#F0F0EC;color:#1a1a1a;padding:20px}
.wrap{max-width:1000px;margin:0 auto}
.info-bar{background:#061A2E;color:#fff;padding:14px 20px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.info-bar h1{font-size:16px;font-weight:400}
.info-bar .badge{background:#c9a84c;color:#061A2E;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:700}
.layout{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}
.panel-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:10px}
.og-preview{background:#fff;border-radius:8px;padding:12px;border:1px solid #ddd}
.og-preview img{width:100%;border-radius:4px}
.section-label{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin:16px 0 8px;padding-top:12px;border-top:1px solid #ddd}
@media(max-width:700px){.layout{grid-template-columns:1fr}}
</style>
</head><body>
<div class="wrap">
  <div class="info-bar">
    <h1>🔬 Sample Lá Số — ${day}/${month}/${year} · Giờ ${['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'][gioIdx]} · ${gt==='nam'?'Nam':'Nữ'} · xem ${namXem}</h1>
    <span class="badge">Preview ISR Page</span>
  </div>

  <div class="layout">
    <div>
      <div class="panel-title">Lá Số Grid 4×4</div>
      ${gridHTML}

      <div class="section-label">Pre-gen Text Blocks (0 AI token)</div>
      ${textHTML}
    </div>

    <div>
      <div class="og-preview">
        <div class="panel-title">Enhanced OG Image</div>
        <img src="${BASE}${ogUrl}" alt="OG preview" onerror="this.style.display='none'" />
        <p style="font-size:11px;color:#888;margin-top:8px">URL: <code style="font-size:10px;word-break:break-all">${ogUrl}</code></p>
      </div>

      <div style="background:#fff;border-radius:8px;padding:14px;border:1px solid #ddd;margin-top:12px;font-size:12px;line-height:1.7">
        <div class="panel-title">Engine Output</div>
        <div><strong>Can Chi:</strong> ${esc(canChiNam)}</div>
        <div><strong>Cung Mệnh:</strong> ${esc(cungMenh)}</div>
        <div><strong>Chính Tinh:</strong> ${esc(chinhTinh)}</div>
        <div><strong>Nạp Âm:</strong> ${esc(napAm)}</div>
        <div><strong>Cách Cục:</strong> ${cachCuc.length} cách cục</div>
        <div><strong>Điểm Mệnh:</strong> ${diemMenh.toFixed(2)}/10</div>
        <div style="margin-top:8px;font-size:11px;color:#888">
          <strong>ISR Slug sẽ là:</strong><br>
          <code style="word-break:break-all">/la-so/${canChiNam.toLowerCase().replace(/[áàãảạăắằẵẳặâấầẫẩậ]/g,'a').replace(/[éèẽẻẹêếềễểệ]/g,'e').replace(/[íìĩỉị]/g,'i').replace(/[óòõỏọôốồỗổộơớờỡởợ]/g,'o').replace(/[úùũủụưứừữửự]/g,'u').replace(/[ýỳỹỷỵ]/g,'y').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}-${String(day).padStart(2,'0')}-${String(month).padStart(2,'0')}-${year}-gio-${'ty,suu,dan,mao,thin,ti,ngo,mui,than,dau,tuat,hoi'.split(',')[gioIdx]}-${gt}-${namXem}</code>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
