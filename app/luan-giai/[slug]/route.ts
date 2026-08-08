// app/luan-giai/[slug]/route.ts
// ISR page: luận giải tóm tắt (teaser free) + CTA đăng nhập để xem đầy đủ
// Slug format: {can}-{chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi}-{namXem}
export const revalidate = false;
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

{
  const _g = globalThis as Record<string, unknown>;
  if (!_g.location) {
    _g.location = { protocol:'https:', hostname:'tuviminhbao.com', host:'tuviminhbao.com', port:'', href:'https://tuviminhbao.com/', pathname:'/', search:'', hash:'' };
  }
}

const BASE = 'https://www.tuviminhbao.com';
type Rec = Record<string, unknown>;

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Constants ────────────────────────────────────────────────────────────────
const CAN_SLUGS = ['giap','at','binh','dinh','mau','ky','canh','tan','nham','quy'];
const CAN_NAMES = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const CHI_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_SLUGS  = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_NAMES  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_HOURS  = [23,1,3,5,7,9,11,13,15,17,19,21];

interface IsrParams {
  canIdx: number; chiIdx: number;
  dd: number; mm: number; year: number;
  gioIdx: number; gioi: 'nam'|'nu'; namXem: number;
}

function parseSlug(slug: string): IsrParams | null {
  const parts = slug.split('-');
  if (parts.length < 9) return null;
  const namXem = parseInt(parts[parts.length - 1]);
  const gioi   = parts[parts.length - 2] as 'nam'|'nu';
  const gioSlug = parts[parts.length - 3];
  const gioLit  = parts[parts.length - 4];
  const yyyy    = parseInt(parts[parts.length - 5]);
  const mm      = parseInt(parts[parts.length - 6]);
  const dd      = parseInt(parts[parts.length - 7]);
  if (gioLit !== 'gio') return null;
  if (isNaN(namXem) || namXem < 2020 || namXem > 2040) return null;
  if (isNaN(yyyy) || yyyy < 1900 || yyyy > 2050) return null;
  if (isNaN(mm) || mm < 1 || mm > 12) return null;
  if (isNaN(dd) || dd < 1 || dd > 31) return null;
  if (gioi !== 'nam' && gioi !== 'nu') return null;
  const gioIdx = GIO_SLUGS.indexOf(gioSlug);
  if (gioIdx < 0) return null;
  const canChiParts = parts.slice(0, parts.length - 7);
  if (canChiParts.length !== 2) return null;
  const canIdx = CAN_SLUGS.indexOf(canChiParts[0]);
  const chiIdx = CHI_SLUGS.indexOf(canChiParts[1]);
  if (canIdx < 0 || chiIdx < 0) return null;
  return { canIdx, chiIdx, dd, mm, year: yyyy, gioIdx, gioi, namXem };
}

// ── Engine loader (singleton) ────────────────────────────────────────────────
let engineCache: {
  convertDuongToAm: (...a: unknown[]) => unknown;
  anSaoLaSo: (...a: unknown[]) => unknown;
} | null = null;

function loadEngine() {
  if (engineCache) return engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Rec;
  g.window = g;
  if (!g.location) {
    g.location = { protocol:'https:', hostname:'tuviminhbao.com', host:'tuviminhbao.com', port:'', href:'https://tuviminhbao.com/', pathname:'/', search:'', hash:'' };
  }
  engineCache = (new Function('window','globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};'))(g,g) as typeof engineCache;
  return engineCache!;
}

// ── Lá số grid (compact version) ────────────────────────────────────────────
const DCHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const DCHI_TO_POS: Record<number,[number,number]> = {
  0:[3,2],1:[3,1],2:[3,0],3:[2,0],4:[1,0],5:[0,0],6:[0,1],7:[0,2],8:[0,3],9:[1,3],10:[2,3],11:[3,3],
};
const SAT_SET = new Set(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp','Tang Môn','Bạch Hổ']);
const HOA_COL: Record<string,string> = {'Lộc':'#1E6B3C','Quyền':'#7B3FA0','Khoa':'#1455A4','Kỵ':'#C0392B'};

/**
 * Đại vận chứa năm đang xem.
 *
 * 🐞 Bản cũ dùng `dvs.find(d => d.isCurrentDV)` — nhưng engine KHÔNG BAO GIỜ đặt
 * cờ `isCurrentDV` (grep `public/tuvi-ansao-engine.js`: 0 lượt; nó trả một object
 * riêng `daiVanHienTai`). Nên `curDV` luôn `undefined`, và mọi khối phụ thuộc nó
 * lặng lẽ biến mất: đoạn "Đại vận đang chạy", phần tô sáng cung đại vận trên bảng
 * lá số, và một mục FAQ. Lỗi im lặng — trang vẫn dựng đủ, chỉ thiếu vài khối mà
 * không có gì báo. Verify bằng cách render trang thật: `grep 'Đại vận đang chạy'`
 * ra 0 lượt trước khi vá, có sau khi vá.
 *
 * Điều này làm lỗi "điểm vận năm" nặng thêm một bậc trên `luan-giai`: thẻ đại vận
 * (điểm THẬT) chưa từng hiện, nên con số duy nhất người đọc thấy cho giai đoạn
 * này chính là điểm nội suy — không có gì cạnh bên để đối chiếu.
 */
function curDaiVan(ls: Rec, dvs: Rec[]): Rec | undefined {
  const t = Number(ls.tuoiXem);
  if (!t) return undefined;
  return dvs.find((d) => Number(d.tuoiStart) <= t && t <= Number(d.tuoiEnd));
}

function renderGrid(ls: Rec): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const dcMap: Record<number,Rec> = {};
  palaces.forEach(p => {
    const dc = DCHI.indexOf(String(p.diaChi||''));
    if (dc >= 0) dcMap[dc] = p;
  });
  const grid: (Rec|null|'center')[][] = Array.from({length:4}, () => Array(4).fill(null));
  Object.entries(DCHI_TO_POS).forEach(([dcStr,[r,c]]) => { grid[r][c] = dcMap[parseInt(dcStr)] || null; });
  grid[1][1] = grid[1][2] = grid[2][1] = grid[2][2] = 'center';

  const dvs   = (ls.daiVans as Rec[]) || [];
  const curDV = curDaiVan(ls, dvs) as Rec|undefined;
  const menhP = palaces.find(p => p.isMenh) as Rec|undefined;

  function renderCell(p: Rec): string {
    const cungName = String(p.cungName||'');
    const diacChi  = String(p.diaChi||'');
    const majStars = (p.majorStars as Rec[])||[];
    const allStars = (p.stars as Rec[])||[];
    const trangSinh = String(p.trangSinh||'');
    const isMenh = !!p.isMenh;
    const isThan = !!p.isThan;
    const isDVCung = curDV && palaces[Number(curDV.cungIdx)] === p;
    const border = isMenh ? '2px solid #9A7B3A' : '1px solid #555';
    const bg = isMenh ? '#1a1600' : '#0a0f1a';
    let html = `<div style="background:${bg};padding:6px;min-height:110px;border:${border};position:relative">`;
    html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px">`;
    html += `<span style="font-size:9px;color:#9A7B3A;font-weight:700">${esc(cungName)}</span>`;
    html += `<span style="font-size:9px;color:#777">${esc(diacChi)}</span>`;
    html += `</div>`;
    if (isMenh||isThan) {
      html += `<div style="display:flex;gap:3px;margin-bottom:2px">`;
      if (isMenh) html += `<span style="font-size:8px;background:#9A7B3A;color:#fff;padding:1px 4px;border-radius:2px">Mệnh</span>`;
      if (isThan) html += `<span style="font-size:8px;background:#555;color:#fff;padding:1px 4px;border-radius:2px">Thân</span>`;
      if (isDVCung) html += `<span style="font-size:8px;background:#1455A4;color:#fff;padding:1px 4px;border-radius:2px">ĐV</span>`;
      html += `</div>`;
    }
    majStars.forEach(s => {
      const ten = String(s.ten||''); const hoa = String(s.hoa||'');
      const bright = String(s.brightness||'');
      const isSat = SAT_SET.has(ten);
      const col = hoa ? HOA_COL[hoa]||'#1455A4' : isSat ? '#f87171' : '#e2e8f0';
      const bDot = bright==='Miếu'||bright==='Vượng' ? '●' : '';
      html += `<div style="font-size:11px;font-weight:700;color:${col}">${esc(ten)}${hoa?`<sup style="font-size:8px">${esc(hoa[0])}</sup>`:''}${bDot?`<sup style="color:#4ade80;font-size:8px">${bDot}</sup>`:''}</div>`;
    });
    if (majStars.length === 0) html += `<div style="font-size:10px;color:#555;font-style:italic">Vô chính diệu</div>`;
    if (trangSinh) html += `<div style="font-size:9px;color:#9A7B3A;margin-top:2px">${esc(trangSinh)}</div>`;
    const minorNames = allStars.filter(s=>!majStars.find(m=>m.ten===s.ten)).slice(0,5).map(s=>String(s.ten||'')).join(' ');
    if (minorNames) html += `<div style="font-size:8px;color:#555;margin-top:2px;line-height:1.3">${esc(minorNames)}</div>`;
    html += `</div>`;
    return html;
  }

  const canChiNam = String(ls.canChiNam||'');
  const napAm     = String(ls.napAmHanh||'');
  const cuc       = String(ls.cucName||ls.cuc||'');
  const center = `<div style="background:#0e1020;border:2px solid #9A7B3A;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12px;grid-column:span 2;grid-row:span 2">
    <div style="font-size:9px;color:#9A7B3A;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">紫微明寶</div>
    <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:4px">${esc(canChiNam)}</div>
    <div style="font-size:10px;color:#aaa;margin-bottom:2px">Cung ${esc(String(menhP?.cungName||''))}</div>
    <div style="font-size:9px;color:#777;margin-bottom:2px">${esc(napAm)}</div>
    <div style="font-size:9px;color:#777">${esc(cuc)}</div>
  </div>`;

  let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);background:#333;gap:1px;border:2px solid #333">`;
  let centerRendered = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = grid[r][c];
      if (cell === 'center') {
        if (!centerRendered && r===1 && c===1) { html += center; centerRendered = true; }
        continue;
      }
      html += cell ? renderCell(cell) : `<div style="background:#060a12;min-height:110px"></div>`;
    }
  }
  html += '</div>';
  return html;
}

// ── Page builder ─────────────────────────────────────────────────────────────
function buildLuanGiaiHTML(ls: Rec, params: IsrParams, slug: string): string {
  const palaces    = (ls.palaces as Rec[]) || [];
  const cachCuc    = (ls.cachCuc as Rec[]) || [];
  const cachCucTC  = (ls.cachCucTungCung as Record<string,string[]>) || {};
  const scores     = (ls.cungScores as Record<string,Record<string,number>>) || {};
  const dvs        = (ls.daiVans as Rec[]) || [];
  const tieuVanSc  = (ls.tieuVanScores as Rec[]) || [];
  const { namXem, gioi, dd, mm, year } = params;

  const menhP      = palaces.find(p => p.isMenh) as Rec|undefined;
  const menhName   = menhP ? String(menhP.cungName||'') : 'Mệnh';
  const menhMaj    = menhP ? ((menhP.majorStars as Rec[])||[]).map(s=>String(s.ten||'')).join(', ') : '';
  const canChiNam  = String(ls.canChiNam||'');
  const napAm      = String(ls.napAmHanh||'');
  const cuc        = String(ls.cucName||ls.cuc||'');
  const curDV      = curDaiVan(ls, dvs) as Rec|undefined;
  const gioistr    = gioi === 'nu' ? 'Nữ' : 'Nam';
  const gioName    = GIO_NAMES[params.gioIdx];
  const canChi     = `${CAN_NAMES[params.canIdx]} ${CHI_NAMES[params.chiIdx]}`;

  const title   = `Luận giải lá số Tử Vi ${canChi} sinh ${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${year} giờ ${gioName} ${gioistr} năm ${namXem}`;
  const desc    = `Luận giải lá số tử vi ${canChi} ${gioistr.toLowerCase()}, sinh ${dd}/${mm}/${year} giờ ${gioName}. Cung mệnh ${menhName}${menhMaj?` — chính tinh ${menhMaj}`:''}, nạp âm ${napAm}. Phân tích vận hạn năm ${namXem} theo cổ pháp tử vi đẩu số.`.slice(0,160);
  const url     = `${BASE}/luan-giai/${slug}`;
  const lasoUrl = `${BASE}/la-so/${slug}`;
  const ogImg   = `${BASE}/api/og?${new URLSearchParams({title: title.slice(0,80), sub:'Luận giải AI · Tử Vi Minh Bảo'}).toString()}`;

  const schema = JSON.stringify([
    {
      '@context':'https://schema.org','@type':'Article',
      headline: title, description: desc, url, inLanguage:'vi',
      author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
      publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
      image:{'@type':'ImageObject',url:ogImg},
    },
    {
      '@context':'https://schema.org','@type':'BreadcrumbList',
      itemListElement:[
        {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
        {'@type':'ListItem',position:2,name:'Lá Số',item:`${BASE}/la-so/${slug}`},
        {'@type':'ListItem',position:3,name:'Luận Giải',item:url},
      ],
    },
  ]);

  // ── Teaser content (free, visible to Google) ──────────────────────────────
  const LOAI_COL: Record<string,string> = {
    quy_cuc:'#7B3FA0',phu_cuc:'#1E6B3C',hung_cuc:'#C0392B',trung_cuc:'#9A7B3A',than_cu:'#555',
  };

  // Cách cục nổi bật (top 4)
  const ccHTML = cachCuc.slice(0,4).map(c => {
    const loai = String(c.loai||'');
    return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;padding:10px 12px;background:#F5F4F0;border-radius:6px;border-left:3px solid ${LOAI_COL[loai]||'#888'}">
      <span style="background:${LOAI_COL[loai]||'#888'};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:3px;white-space:nowrap">${esc(String(c.ten||''))}</span>
      <span style="font-size:13px;color:#333;line-height:1.6">${esc(String(c.moTa||''))}</span>
    </div>`;
  }).join('');

  // Phân tích sao cung Mệnh (top 5 free)
  const menhItems = (cachCucTC['Mệnh'] || []).slice(0, 5);
  const menhAnalHTML = menhItems.length > 0
    ? menhItems.map(y => {
        const isGood = y.includes('phú quý')||y.includes('giàu sang')||y.includes('sáng')||y.includes('sống lâu');
        const isBad  = y.includes('vất vả')||y.includes('hung')||y.includes('tai')||y.includes('yểu');
        const col = isGood ? '#1E6B3C' : isBad ? '#C0392B' : '#444';
        return `<p style="font-size:14px;color:${col};line-height:1.7;margin-bottom:8px;padding-left:16px;border-left:2px solid ${col}20">${esc(y)}</p>`;
      }).join('')
    : '<p style="color:#888;font-style:italic">Cung Mệnh chưa có phân tích chi tiết.</p>';

  // Vận năm namXem (sơ lược)
  const tvThis  = tieuVanSc.find(t => Number(t.nam) === namXem) as Rec|undefined;
  const tvDC    = tvThis ? String(tvThis.diaChi||'') : '';
  // 🔑 CỐ Ý không còn "điểm/10" cho năm. `mainScore` là đường LÀM MƯỢT nội suy
  // giữa các mốc đại vận (xem chú thích `VanNam` trong lib/engine/cong-so.ts),
  // không đọc một ngôi sao nào của năm — bày nó cạnh thẻ đại vận thật là đặt
  // hai con số mâu thuẫn sát nhau. Năm đọc bằng cung hạn + cán cân cát/sát.
  const tvCat   = tvThis ? Number(tvThis.catCount||0) : 0;
  const tvSat   = tvThis ? Number(tvThis.satCount||0) : 0;
  const dvSc    = curDV ? ((curDV.scoring as Rec)||{}) : {};
  const dvTotal = curDV ? Number((dvSc as Rec).tong||0) : 0;
  const dvDC    = curDV ? String(curDV.diaChi||'') : '';

  const vanNamHTML = (curDV || tvThis) ? `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      ${curDV ? `<div style="flex:1;min-width:140px;background:#F5F4F0;border-radius:8px;padding:14px 16px">
        <div style="font-size:11px;color:#888;margin-bottom:4px">ĐẠI VẬN HIỆN TẠI</div>
        <div style="font-size:18px;font-weight:700;color:#061A2E">${esc(dvDC)}</div>
        ${dvTotal>0?`<div style="font-size:13px;color:${dvTotal>=7?'#1E6B3C':dvTotal>=4?'#9A7B3A':'#C0392B'};font-weight:600">${dvTotal}/10 điểm</div>`:''}
        <div style="font-size:11px;color:#777">${esc(String(curDV.tuoiStart||''))}–${esc(String(curDV.tuoiEnd||''))} tuổi</div>
      </div>` : ''}
      ${tvThis ? `<div style="flex:1;min-width:140px;background:#EEF4FF;border-radius:8px;padding:14px 16px;border:1px solid #1455A420">
        <div style="font-size:11px;color:#888;margin-bottom:4px">TIỂU VẬN NĂM ${namXem}</div>
        <div style="font-size:18px;font-weight:700;color:#061A2E">${esc(tvDC)}</div>
        ${(tvCat||tvSat)?`<div style="font-size:13px;color:${tvCat>tvSat?'#1E6B3C':tvCat<tvSat?'#C0392B':'#9A7B3A'};font-weight:600">cát ${tvCat} / sát ${tvSat}</div>`:''}
        <div style="font-size:11px;color:#777">năm không có điểm riêng — đọc trong khung đại vận bên cạnh</div>
      </div>` : ''}
    </div>` : '';

  // Điểm 6 chiều cung Mệnh
  const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
  const MLABELS = ['Tiềm Năng','Bền Vững','An Toàn','Quý Nhân','Minh Bạch','Tương Hợp'];
  const menhSc = scores['Mệnh'];
  const scoresHTML = menhSc ? `
    <div style="background:#F5F4F0;border-radius:8px;padding:14px 16px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:700;color:#061A2E;margin-bottom:10px">Điểm 6 chiều — Cung Mệnh</div>
      ${METRICS.map((m,i) => {
        const v = menhSc[m]||0; const col = v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:11px;color:#666;width:80px;flex-shrink:0">${MLABELS[i]}</span>
          <div style="flex:1;height:7px;background:#d0d8e0;border-radius:4px;overflow:hidden">
            <div style="width:${v*10}%;height:100%;background:${col};border-radius:4px"></div>
          </div>
          <span style="font-size:11px;color:#444;width:20px;text-align:right">${v}</span>
        </div>`;
      }).join('')}
    </div>` : '';

  // ── Paywall block ─────────────────────────────────────────────────────────
  const paywallHTML = `
    <div style="margin:32px 0;padding:28px 24px;background:linear-gradient(135deg,#061A2E 0%,#0d2d4a 100%);border-radius:12px;color:#fff;text-align:center">
      <div style="font-size:13px;color:#9A7B3A;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">🔮 Luận giải AI đầy đủ</div>
      <h2 style="font-size:20px;font-weight:700;color:#fff;margin-bottom:12px;line-height:1.4">24 phần phân tích chuyên sâu theo cổ pháp Tử Vi Đẩu Số</h2>
      <p style="font-size:13px;color:#94a3b8;margin-bottom:20px;line-height:1.7">Tính cách · Sự nghiệp · Tài lộc · Tình duyên · Sức khỏe · Gia đình · Phân tích 12 cung · 9 đại vận · Tiểu vận năm ${namXem} · Lời khuyên cụ thể</p>
      <a href="/" style="display:inline-block;background:#9A7B3A;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:7px;text-decoration:none;margin-bottom:10px">Xem luận giải đầy đủ →</a>
      <p style="font-size:11px;color:#64748b;margin-top:10px">Đăng nhập miễn phí · Dùng credit để xem · Không cần tải app</p>
    </div>`;

  // ── Related link ──────────────────────────────────────────────────────────
  const relatedHTML = `
    <div style="margin-top:24px;padding:16px 18px;background:#F9F4EB;border-radius:8px;border-left:3px solid #9A7B3A">
      <div style="font-size:12px;color:#9A7B3A;font-weight:700;margin-bottom:6px">📊 Xem thêm</div>
      <a href="${lasoUrl}" style="font-size:14px;color:#1455A4;text-decoration:none;display:block;margin-bottom:4px">→ Lá số chi tiết 24 phần — ${esc(canChi)} sinh ${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${year} giờ ${esc(gioName)}</a>
      <a href="/menh-kho/${year}" style="font-size:13px;color:#555;text-decoration:none;display:block">→ Mệnh khố năm ${year}</a>
    </div>`;

  const gridHTML = renderGrid(ls);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | Tử Vi Minh Bảo</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="vi_VN">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index,follow">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet"></noscript>
<script type="application/ld+json">${schema}</script>
<script src="/auth.js" defer></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f8f7f4;color:#1a1a1a;min-height:100vh}
.wrap{max-width:780px;margin:0 auto;padding:0 16px 60px}
.hero{background:#061A2E;color:#fff;padding:28px 20px 24px;margin-bottom:0}
.hero-sub{font-size:11px;color:#9A7B3A;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}
h1{font-family:'Noto Serif',serif;font-size:clamp(16px,3.5vw,22px);font-weight:600;color:#fff;line-height:1.4;margin-bottom:8px}
.hero-meta{font-size:12px;color:#94a3b8}
.bc{font-size:11px;color:#9A7B3A;padding:10px 0;border-bottom:1px solid #E8E3D9;margin-bottom:20px}
.bc a{color:#9A7B3A;text-decoration:none}
.bc a:hover{text-decoration:underline}
.sec{margin-bottom:28px}
.sec-title{font-size:12px;font-weight:700;color:#9A7B3A;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #E8E3D9}
h2.sec-title{font-family:'Noto Serif',serif;font-size:16px;text-transform:none;letter-spacing:0;color:#061A2E}
.blur-wrap{position:relative;overflow:hidden;border-radius:8px}
.blur-content{filter:blur(4px);user-select:none;pointer-events:none;opacity:0.6}
.blur-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(to bottom,transparent 0%,rgba(248,247,244,0.9) 40%,rgba(248,247,244,1) 100%);padding:20px;text-align:center}
</style>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="hero">
  <div class="wrap">
    <div class="hero-sub">Luận Giải Tử Vi AI</div>
    <h1>${esc(title)}</h1>
    <div class="hero-meta">${esc(canChiNam)} · Nạp âm ${esc(napAm)} · ${esc(cuc)} · Cung ${esc(menhName)}${menhMaj ? ` — ${esc(menhMaj)}` : ''}</div>
  </div>
</div>

<div class="wrap">
  <div class="bc" style="margin-top:12px">
    <a href="/">Trang chủ</a> &rsaquo;
    <a href="${lasoUrl}">Lá số ${esc(canChi)}</a> &rsaquo;
    Luận giải
  </div>

  <!-- Lá số grid -->
  <div class="sec">
    <div class="sec-title">Lá Số Tử Vi</div>
    ${gridHTML}
    <p style="font-size:11px;color:#888;margin-top:6px;text-align:right">
      <a href="${lasoUrl}" style="color:#1455A4;text-decoration:none">Xem phân tích chi tiết 24 phần →</a>
    </p>
  </div>

  <!-- Cách cục đặc biệt (free teaser) -->
  ${cachCuc.length > 0 ? `<div class="sec">
    <div class="sec-title">Cách Cục Đặc Biệt</div>
    ${ccHTML}
    ${cachCuc.length > 4 ? `<p style="font-size:12px;color:#888;margin-top:4px">... và ${cachCuc.length - 4} cách cục khác. <a href="/" style="color:#1455A4;text-decoration:none">Xem đầy đủ →</a></p>` : ''}
  </div>` : ''}

  <!-- Điểm 6 chiều (free) -->
  ${scoresHTML ? `<div class="sec">${scoresHTML}</div>` : ''}

  <!-- Phân tích cung Mệnh (free teaser) -->
  <div class="sec">
    <h2 class="sec-title">Phân Tích Cung Mệnh — ${esc(menhMaj||menhName)}</h2>
    ${menhAnalHTML}
  </div>

  <!-- Vận năm (free teaser) -->
  ${vanNamHTML ? `<div class="sec">
    <div class="sec-title">Vận Hạn Năm ${namXem} — Sơ Lược</div>
    ${vanNamHTML}
  </div>` : ''}

  <!-- Paywall -->
  ${paywallHTML}

  <!-- Related -->
  ${relatedHTML}
</div>

<script src="/footer.js"></script>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=20" defer></script>
</body>
</html>`;
}

// ── GET handler ───────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsed = parseSlug(slug);

  if (!parsed) {
    // 404 thay vì redirect — tránh "Page with redirect" trên GSC, tiết kiệm crawl budget
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const { convertDuongToAm, anSaoLaSo } = loadEngine();
    const hour = GIO_HOURS[parsed.gioIdx];
    const conv = convertDuongToAm(parsed.dd, parsed.mm, parsed.year, hour) as Rec;
    if (!conv?.amLich) return new NextResponse('Not found', { status: 404 });
    const al = conv.amLich as Rec;

    const ls = (anSaoLaSo as (o: object) => Rec)({
      ngayAL:   al.day,
      thangAL:  al.month,
      namAL:    parsed.year,
      canNam:   conv.canNam,
      chiNam:   conv.chiNam,
      gioIdx:   parsed.gioIdx,
      gioitinh: parsed.gioi,
      namXem:   parsed.namXem,
    });

    if (!ls) return new NextResponse('Not found', { status: 404 });
    const html = buildLuanGiaiHTML(ls, parsed, slug);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
