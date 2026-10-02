// lib/laso/grid.ts
// ============================================================
// Lưới lá số 4×4 (khuôn Thiên Lương) dựng phía SERVER từ object `ls` của engine.
// Tách nguyên văn khỏi app/la-so/[slug]/route.ts (2026-10-02) để trang
// Nghiệm Chứng dùng CHUNG — một nguồn, không chép. CSS đi kèm ở GRID_CSS:
// trang nào chèn renderGrid() thì chèn cả GRID_CSS vào <style>.
// ============================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = Record<string, any>;

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Mapping tên sao → slug tu-dien (chỉ sao có trang riêng)
export const SAO_SLUG: Record<string,string> = {
  'Tử Vi':'sao-tu-vi','Thiên Cơ':'sao-thien-co','Thái Dương':'sao-thai-duong',
  'Vũ Khúc':'sao-vu-khuc','Thiên Đồng':'sao-thien-dong','Liêm Trinh':'sao-liem-trinh',
  'Thiên Phủ':'sao-thien-phu','Thái Âm':'sao-thai-am','Tham Lang':'sao-tham-lang',
  'Cự Môn':'sao-cu-mon','Thiên Tướng':'sao-thien-tuong','Thiên Lương':'sao-thien-luong',
  'Thất Sát':'sao-that-sat','Phá Quân':'sao-pha-quan',
  'Kình Dương':'sao-kinh-duong','Đà La':'sao-da-la',
  'Hỏa Tinh':'sao-hoa-tinh','Linh Tinh':'sao-linh-tinh',
  'Địa Không':'sao-dia-khong','Địa Kiếp':'sao-dia-kiep',
  'Văn Xương':'sao-van-xuong','Văn Khúc':'sao-van-khuc',
  'Tả Phù':'sao-ta-phu','Hữu Bật':'sao-huu-bat',
  'Thiên Khôi':'sao-thien-khoi','Thiên Việt':'sao-thien-viet',
  'Lộc Tồn':'sao-loc-ton','Thiên Mã':'sao-thien-ma',
  'Hóa Lộc':'sao-hoa-loc','Hóa Quyền':'sao-hoa-quyen',
  'Hóa Khoa':'sao-hoa-khoa','Hóa Kỵ':'sao-hoa-ky',
  'Thiên Hình':'sao-thien-hinh','Thiên Hư':'sao-thien-hu',
  'Thiên Hỷ':'sao-thien-hy','Thiên Khốc':'sao-thien-kho',
  'Thiên Không':'sao-thien-khong','Thiên Đức':'sao-thien-duc',
  'Nguyệt Đức':'sao-nguyet-duc','Hồng Loan':'sao-hong-loan',
  'Đào Hoa':'sao-dao-hoa','Thiên Diêu':'sao-thien-dieu',
  'Bạch Hổ':'sao-bac-ho','Thanh Long':'sao-thanh-long',
  'Tang Môn':'sao-tang-mon','Bệnh Phù':'sao-benh-phu',
  'Thái Tuế':'sao-thai-tue','Phá Toái':'sao-pha-toai',
  'Kiếp Sát':'sao-kiep-sat','Quan Phù':'sao-quan-phu',
  'Cô Thần':'sao-co-than','Quả Tú':'sao-qua-tu',
  'Thiên Tài':'sao-thien-tai','Thiên Thọ':'sao-thien-tho',
  'Thiên Phúc':'sao-thien-phuc','Bát Tọa':'sao-bat-toa',
  'Ân Quang':'sao-an-quang','Tiểu Hao':'sao-tieu-hao',
  'Đại Hao':'sao-dai-hao','Phi Liêm':'sao-phi-liem',
};

export function starLink(ten: string, display: string): string {
  const slug = SAO_SLUG[ten];
  if (!slug) return display;
  return `<a href="/tu-dien/${slug}" class="sao-link">${display}</a>`;
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: 4×4 HTML grid
// ────────────────────────────────────────────────────────────────────────────
export const DCHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
export const DCHI_TO_POS: Record<number, [number,number]> = {
  0:[3,2], 1:[3,1], 2:[3,0], 3:[2,0],
  4:[1,0], 5:[0,0], 6:[0,1], 7:[0,2],
  8:[0,3], 9:[1,3], 10:[2,3], 11:[3,3],
};

// ── Star data for grid rendering ─────────────────────────────────────────────
export const CHINH_CLS: Record<string,string> = {
  'Tử Vi':'tho','Thiên Cơ':'moc','Thái Dương':'hoa','Vũ Khúc':'kim',
  'Thiên Đồng':'thuy','Liêm Trinh':'hoa','Thiên Phủ':'tho','Thái Âm':'thuy',
  'Tham Lang':'thuy','Cự Môn':'thuy','Thiên Tướng':'thuy','Thiên Lương':'moc',
  'Thất Sát':'kim','Phá Quân':'thuy',
};
export const HUNG_SET = new Set([
  'Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp','Thiên Không',
  'Đại Hao','Tiểu Hao','Bệnh Phù','Phục Binh','Quan Phù','Bạch Hổ','Tang Môn',
  'Điếu Khách','Kiếp Sát','Phá Toái','Thiên Hình','Thiên Riêu','Phi Liêm','Thiên Sứ',
]);
// STAR_CLS compiled from tuvi-ansao-engine.js STAR_DATA (server-side, no runtime access)
export const STAR_CLS: Record<string,string> = {
  // Kim
  'Kình Dương':'sc-kim','Đà La':'sc-kim',
  'Văn Xương':'sc-kim','Phượng Các':'sc-kim',
  'Bạch Hổ':'sc-kim','Nguyệt Đức':'sc-kim',
  'Hoa Cái':'sc-kim','Lực Sỹ':'sc-kim','Tướng Quân':'sc-kim',
  // Thủy
  'Văn Khúc':'sc-thuy','Thiên Y':'sc-thuy',
  'Hồng Loan':'sc-thuy','Thiên Hỷ':'sc-thuy',
  'Long Trì':'sc-thuy','Lưu Hà':'sc-thuy',
  'Thiên Riêu':'sc-thuy','Thiên Sứ':'sc-thuy',
  'Thiên Khốc':'sc-thuy','Thiên Hư':'sc-thuy',
  'Tam Thai':'sc-thuy','Long Đức':'sc-thuy',
  'Thiếu Âm':'sc-thuy','Bác Sỹ':'sc-thuy',
  'Hữu Bật':'sc-thuy',
  // Hỏa
  'Hỏa Tinh':'sc-hoa','Linh Tinh':'sc-hoa',
  'Kiếp Sát':'sc-hoa','Thiên Hình':'sc-hoa',
  'Địa Không':'sc-hoa','Địa Kiếp':'sc-hoa','Thiên Không':'sc-hoa',
  'Đại Hao':'sc-hoa','Tiểu Hao':'sc-hoa',
  'Phục Binh':'sc-hoa','Quan Phù':'sc-hoa',
  'Phá Toái':'sc-hoa','Tử Phù':'sc-hoa','Trực Phù':'sc-hoa',
  'Thiếu Dương':'sc-hoa','Thiên Giải':'sc-hoa',
  'Thiên Mã':'sc-hoa','Phi Liêm':'sc-hoa',
  // Mộc
  'Đào Hoa':'sc-moc','Bát Tọa':'sc-moc',
  'Ân Quang':'sc-moc','Giải Thần':'sc-moc',
  'Tang Môn':'sc-moc','Đường Phù':'sc-moc',
  'Thanh Long':'sc-moc','Tấu Thư':'sc-moc','Hỷ Thần':'sc-moc',
  // Thổ
  'Tả Phụ':'sc-tho','Tả Phù':'sc-tho',
  'Thiên Khôi':'sc-tho','Thiên Việt':'sc-tho',
  'Thiên Quý':'sc-tho','Thiên Tài':'sc-tho',
  'Lộc Tồn':'sc-tho','Thiên Thọ':'sc-tho',
  'Thiên Đức':'sc-tho','Thiên Phúc':'sc-tho',
  'Địa Giải':'sc-tho','Phúc Đức':'sc-tho',
  'Thiên La':'sc-tho','Địa Võng':'sc-tho',
  'Thiên Thương':'sc-tho','Thiên Trù':'sc-tho',
  'Cô Thần':'sc-tho','Quả Tú':'sc-tho',
  'Quốc Ấn':'sc-tho','Thiên Quan':'sc-tho',
  'Thái Tuế':'sc-tho','Tuế Phá':'sc-tho',
  'Bệnh Phù':'sc-tho','Điếu Khách':'sc-tho',
  'Đẩu Quân':'sc-tho',
};
export const BC_MAP: Record<string,string> = {Miếu:'M',Vượng:'V',Đắc:'Đ',Bình:'B',Hãm:'H'};
export const TS_SET = new Set(['Tràng Sinh','Mộc Dục','Quan Đới','Lâm Quan','Đế Vượng','Suy','Bệnh','Tử','Mộ','Tuyệt','Thai','Dưỡng']);
export const G_CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];

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
export function curDaiVan(ls: Rec, dvs: Rec[]): Rec | undefined {
  const t = Number(ls.tuoiXem);
  if (!t) return undefined;
  return dvs.find((d) => Number(d.tuoiStart) <= t && t <= Number(d.tuoiEnd));
}

// Khuôn Thiên Lương — cùng bảng với public/laso-chart.js (_CHI_HANH/_TAM_HOP_MENH/_VOID_AT).
export const CHI_HANH = ['thuy','tho','moc','moc','tho','hoa','hoa','tho','kim','kim','tho','thuy'];
export const TAM_HOP_MENH = new Set(['Mệnh','Tài Bạch','Quan Lộc']);
export const VOID_AT: Record<string, [number, number]> = { '0-1':[50,75], '2-3':[12.5,75], '4-5':[12.5,25], '6-7':[50,25], '8-9':[87.5,25], '10-11':[87.5,75] };
export function voidLabels(palaces: Rec[]): string {
  const pairOf = (pred: (s: Rec) => boolean) => palaces.filter(p => ((p.stars as Rec[]) || []).some(pred)).map(p => DCHI.indexOf(String(p.diaChi||''))).sort((a, b) => a - b).join('-');
  const tuan = pairOf(s => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt');
  const triet = pairOf(s => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt');
  const marks: [string, string][] = tuan && tuan === triet ? [[tuan, 'TUẦN - TRIỆT']] : [[tuan, 'TUẦN'], [triet, 'TRIỆT']];
  return marks.filter(([k]) => VOID_AT[k]).map(([k, l]) => `<div class="v2-void" style="left:${VOID_AT[k][0]}%;top:${VOID_AT[k][1]}%">${l}</div>`).join('');
}

// Vòng tiểu hạn quanh trung cung (engine tieuHanRing) — cùng cách đặt với public/laso-chart.js.
export function tieuHanLabels(ring: unknown): string {
  if (!Array.isArray(ring)) return '';
  const IN = '3px', OUT = 'calc(-100% - 3px)';
  return (ring as number[]).map((y, chi) => {
    const [r, c] = DCHI_TO_POS[chi];
    const x = c === 0 ? 25 : c === 3 ? 75 : c * 25 + 12.5;
    const top = r === 0 ? 25 : r === 3 ? 75 : r * 25 + 12.5;
    const tx = c === 0 ? IN : c === 3 ? OUT : '-50%';
    const ty = r === 0 ? IN : r === 3 ? OUT : '-50%';
    return `<div class="v2-th" style="left:${x}%;top:${top}%;transform:translate(${tx},${ty})" title="Tiểu hạn năm ${DCHI[y]} vào cung ${DCHI[chi]}">${DCHI[y].toUpperCase()}</div>`;
  }).join('');
}
// Chú giải chân lá số — khuôn Thiên Lương; màu lấy đúng class .sc-* đang tô sao.
export const LEGEND_HTML = '<div class="v2-legend"><span>(M):Miếu Địa</span><span>(V):Vượng Địa</span><span>(Đ):Đắc Địa</span><span>(B):Bình Hòa</span><span>(H):Hãm Địa</span>'
  + '<span class="v2-legend-hanh"><b class="sc-kim">Kim</b><b class="sc-moc">Mộc</b><b class="sc-thuy">Thủy</b><b class="sc-hoa">Hỏa</b><b class="sc-tho">Thổ</b></span></div>';

export function renderGrid(ls: Rec, canIdx: number): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const dcMap: Record<number, Rec> = {};
  palaces.forEach(p => {
    const dc = DCHI.indexOf(String(p.diaChi||''));
    if (dc >= 0) dcMap[dc] = p;
  });
  const grid: (Rec|null|'center')[][] = Array.from({length:4}, () => Array(4).fill(null));
  Object.entries(DCHI_TO_POS).forEach(([dcStr, [r,c]]) => { grid[r][c] = dcMap[parseInt(dcStr)] || null; });
  grid[1][1] = grid[1][2] = grid[2][1] = grid[2][2] = 'center';

  const dvs   = (ls.daiVans as Rec[]) || [];
  const curDV = curDaiVan(ls, dvs) as Rec|undefined;

  function phuCls(s: Rec): string {
    const ten = String(s.ten||''); const hoa = String(s.hoa||'');
    if (hoa==='Lộc') return 'sc-hoa-loc';
    if (hoa==='Quyền') return 'sc-hoa-quyen';
    if (hoa==='Khoa') return 'sc-hoa-khoa';
    if (hoa==='Kỵ') return 'sc-hoa-ky';
    return STAR_CLS[ten]||'sc-neutral';
  }

  function renderCell(p: Rec): string {
    const cungName = String(p.cungName||'');
    const diacChi  = String(p.diaChi||'');
    const dcIdx    = DCHI.indexOf(diacChi);
    const majStars = (p.majorStars as Rec[])||[];
    const allStars = (p.stars as Rec[])||[];
    const isMenh   = !!p.isMenh;
    const isThan   = !!p.isThan;
    const isDVCung = curDV && Number(curDV.cungIdx) === dcIdx;

    // Can-chi header for this cung
    const cungCanIdx = (((canIdx % 5) * 2 + dcIdx) % 10);
    const canChiHeader = `${G_CAN[cungCanIdx]} ${diacChi}`;

    // Chính tinh
    const hoaFromChinh: Rec[] = [];
    let chinhH = '';
    for (const s of majStars) {
      const cls = 'sc-'+(CHINH_CLS[String(s.ten||'')] ? CHINH_CLS[String(s.ten||'')] : 'neutral');
      const b = s.brightness ? ` (${BC_MAP[String(s.brightness)]||''})` : '';
      if (s.hoa) hoaFromChinh.push(s);
      const _tenChinhDisplay = starLink(String(s.ten||''), esc(String(s.ten||'')).toUpperCase());
      chinhH += `<div class="v2-chinh-item ${cls}">${_tenChinhDisplay}${b}</div>`;
    }

    // Phụ tinh: exclude tràng sinh, tuần/triệt, chính tinh
    const phuStars = allStars.filter(s => {
      const ten = String(s.ten||'');
      if (String(s.nhom||'')==='chinh') return false;
      if (TS_SET.has(ten)) return false;
      if (ten==='Tuần'||ten==='Triệt'||ten==='Tuần+Triệt') return false;
      return true;
    });
    const renderPhu = (s: Rec) => {
      const cls = phuCls(s);
      const b = s.brightness ? ` <span style="font-size:8px">(${BC_MAP[String(s.brightness)]||''})</span>` : '';
      let nm = starLink(String(s.ten||''), esc(String(s.ten||'')).toUpperCase());
      if (s.hoa) {
        const hc = s.hoa==='Lộc'?'sc-hoa-loc':s.hoa==='Quyền'?'sc-hoa-quyen':s.hoa==='Khoa'?'sc-hoa-khoa':'sc-hoa-ky';
        nm += ` <span class="${hc}" style="font-size:8px">[${esc(String(s.hoa)[0])}]</span>`;
      }
      return `<div class="v2-phu-item ${cls}">${nm}${b}</div>`;
    };
    let catH = phuStars.filter(s => !HUNG_SET.has(String(s.ten||''))).map(renderPhu).join('');
    const hungH = phuStars.filter(s => HUNG_SET.has(String(s.ten||''))).map(renderPhu).join('');
    // Hóa từ chính tinh appended to cat column, written out in full
    for (const s of hoaFromChinh) {
      const hoa = String(s.hoa||'');
      const hc = hoa==='Lộc'?'sc-hoa-loc':hoa==='Quyền'?'sc-hoa-quyen':hoa==='Khoa'?'sc-hoa-khoa':'sc-hoa-ky';
      catH += `<div class="v2-phu-item ${hc}" style="font-weight:700">HÓA ${hoa.toUpperCase()}</div>`;
    }

    const tsS = allStars.find(s => TS_SET.has(String(s.ten||'')));
    // Khuôn Thiên Lương (cùng public/laso-chart.js): tuổi VÀO đại hạn góc phải dưới,
    // Tràng Sinh giữa chân ô; Tuần/Triệt vẽ ở cấp lưới (voidLabels).
    const dvCell = dvs.find(d => Number(d.cungIdx) === dcIdx);
    const dvTuoi = dvCell ? String(dvCell.tuoiStart) : '';
    const thanBadge = isThan ? ` <span class="v2-than">(THÂN)</span>` : '';
    // Sao lưu năm xem (engine `luuStars`, cờ `xau` do engine đánh dấu) — cùng cách
    // hiện với public/laso-chart.js.
    const luuH = ((p.luuStars as Rec[]) || []).map(s => {
      const ten = String(s.ten || '');
      const tip = `${ten}${s.sao ? ` (${String(s.sao)})` : ''} — chỉ tác dụng trong năm xem`;
      return `<span class="v2-luu-item${s.xau ? ' luu-xau' : ''}" title="${esc(tip)}">${esc(ten.replace(/^Lưu /, 'L.')).toUpperCase()}</span>`;
    }).join('');

    return `<div class="cung-cell${isMenh?' is-menh':''}${isDVCung?' cur-van':''}">
      <div class="v2-cell-header">
        <span class="v2-can-chi sc-${CHI_HANH[dcIdx]}">${esc(canChiHeader).toUpperCase()}</span>
        <span class="v2-cung-name"><span class="${TAM_HOP_MENH.has(cungName) ? 'tam-hop' : ''}">${esc(cungName).toUpperCase()}</span>${thanBadge}</span>
      </div>
      <div class="v2-chinh-area">${chinhH}</div>
      <div class="v2-phu-area">
        <div class="v2-phu-col">${catH}</div>
        <div class="v2-phu-col v2-phu-col-right">${hungH}</div>
      </div>
      ${luuH ? `<div class="v2-luu-area">${luuH}</div>` : ''}
      <div class="v2-footer">
        <span class="v2-trang-sinh ${tsS ? STAR_CLS[String(tsS.ten||'')]||'' : ''}">${tsS ? esc(String(tsS.ten||'')).toUpperCase() : ''}</span>
        <span class="v2-dai-van">${esc(dvTuoi)}</span>
      </div>
    </div>`;
  }

  const menhP     = palaces.find(p => p.isMenh) as Rec|undefined;
  const napAm     = String(ls.napAmHanh||ls.napAm||'');
  const cuc       = String(ls.cucName||ls.cuc||'');
  const canChiNam = String(ls.canChiNam||'');
  const centerHTML = `<div class="grid-center">
    <div style="font-size:10px;color:#7C6942;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">紫微明寶</div>
    <div style="font-size:14px;font-weight:700;color:#0F2A3D;margin-bottom:4px">${esc(canChiNam)}</div>
    <div style="font-size:11px;color:#444;margin-bottom:2px">Cung Mệnh: ${esc(String(menhP?.cungName||''))}</div>
    <div style="font-size:10px;color:#777;margin-bottom:2px">${esc(napAm)}</div>
    <div style="font-size:10px;color:#777">${esc(cuc)}</div>
  </div>`;

  let html = `<div class="laso-grid">`;
  let centerRendered = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = grid[r][c];
      if (cell === 'center') {
        if (!centerRendered && r===1 && c===1) { html += centerHTML; centerRendered = true; }
        continue;
      }
      html += cell ? renderCell(cell) : `<div class="cung-cell cung-empty"></div>`;
    }
  }
  html += tieuHanLabels(ls.tieuHanRing) + voidLabels(palaces) + '</div>' + LEGEND_HTML;
  return html;
}

export const GRID_CSS = `.laso-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);border:2px solid #555;background:#555;gap:1px;position:relative}
.cung-cell{border:1px solid #888;padding:8px 7px 26px;min-height:150px;position:relative;display:flex;flex-direction:column;background:#F7F7F7;overflow:hidden}
.cung-cell.is-menh{border:2px solid #7C6942;background:#FFFDF7}
.cung-cell.cur-van{outline:2px solid #7FA7A3;outline-offset:-2px}
.cung-empty{background:#f8f8f8;min-height:150px}
.grid-center{border:1px solid #999;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:18px 26px;grid-column:span 2;grid-row:span 2}
.v2-cell-header{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 4px;margin-bottom:4px}
.v2-can-chi{font-size:8px;font-weight:600;text-transform:uppercase;white-space:nowrap}
.v2-cung-name{flex:1 1 auto;font-size:10px;color:#1d2f6f;font-weight:700;text-transform:uppercase;text-align:center;letter-spacing:.3px}
.v2-cung-name>span{white-space:nowrap}
.v2-cung-name .tam-hop{border:1.5px solid #1d2f6f;padding:0 3px;border-radius:2px}
.v2-than{color:#C0392B;white-space:nowrap}
.v2-badge-than{font-size:8px;background:#555;color:#fff;padding:1px 4px;border-radius:2px}
.v2-chinh-area{margin-bottom:4px;text-align:center;min-height:35px}
.v2-chinh-item{font-family:'Noto Serif',Georgia,serif;font-size:12.5px;font-weight:700;line-height:1.4;text-align:center}
.v2-phu-area{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:0 4px;align-content:start}
.v2-phu-col{display:flex;flex-direction:column;gap:1px}
.v2-phu-col-right{text-align:right}
.v2-phu-item{font-size:9.5px;line-height:1.45;font-weight:700}
.v2-luu-area{display:flex;flex-wrap:wrap;gap:0 5px;margin-top:2px;padding-top:1px;border-top:1px dashed #ddd}
.v2-luu-item{font-size:8.5px;line-height:1.4;font-style:italic;font-weight:600;color:#1455A4;cursor:help}
.v2-luu-item.luu-xau{color:#C0392B}
/* Chân ô: Tràng Sinh giữa, tuổi vào đại hạn góc phải (số to) — khuôn Thiên Lương. */
.v2-footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;position:absolute;bottom:7px;left:6px;right:6px}
.v2-trang-sinh{grid-column:2;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.v2-dai-van{grid-column:3;justify-self:end;font-size:13px;color:#1a1a1a;font-weight:700;line-height:1}
/* Tuần/Triệt: nhãn đen vắt lên đường biên chung của cặp cung (toạ độ ở VOID_AT). */
.v2-void{position:absolute;transform:translate(-50%,-50%);background:#111;color:#fff;font-size:8px;font-weight:700;letter-spacing:.5px;line-height:1.4;padding:0 5px;border-radius:2px;z-index:6;white-space:nowrap;pointer-events:none}
.v2-th{position:absolute;font-size:8px;font-weight:600;color:#8a8a8a;letter-spacing:.5px;line-height:1.2;z-index:5;white-space:nowrap;pointer-events:none}
.v2-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:2px 10px;font-size:10px;color:#1455A4;padding:6px 4px 2px}
.v2-legend-hanh{display:inline-flex;gap:8px;margin-left:8px}
.v2-legend-hanh b{font-weight:700}
/* Cột hẹp (~90px): Tràng Sinh căn giữa + số tuổi không đủ chỗ — lùi về trái/phải. */
@media(max-width:800px){.v2-footer{display:flex;justify-content:space-between;align-items:flex-end}.v2-dai-van{font-size:11px}.v2-void{font-size:7px;padding:0 3px;letter-spacing:0}}
.sc-hoa{color:#E74C3C}.sc-kim{color:#7F8C8D}.sc-thuy{color:#1a1a1a}.sc-moc{color:#27AE60}.sc-tho{color:#D4A017}.sc-neutral{color:#333}
.sc-hoa-loc{color:#D4A017;font-weight:700}.sc-hoa-quyen{color:#27AE60;font-weight:700}.sc-hoa-khoa{color:#1a1a1a;font-weight:700}.sc-hoa-ky{color:#1a1a1a;font-weight:700}`;
