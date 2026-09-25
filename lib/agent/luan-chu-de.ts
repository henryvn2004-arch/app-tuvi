// lib/agent/luan-chu-de.ts
// ============================================================
// KỸ NĂNG LUẬN THEO CHỦ ĐỀ — hỏi chuyện gì thì nhìn cung nào, sao nào, đọc
// tầng thời gian ra sao. Nội dung cổ pháp do Henry duyệt từng mục (2026-09-25,
// chủ đề đầu tiên: SỰ NGHIỆP). Thêm chủ đề mới = thêm một khối cùng khuôn ở
// đây, KHÔNG rải luật vào system prompt.
//
// 💸 Ngân sách token là ràng buộc thiết kế, không phải chuyện làm sau:
//  - Khối chỉ sinh ra khi câu hỏi TRÚNG chủ đề (0 byte với câu khác).
//  - Khối đi vào TIN NHẮN, không vào system ⇒ system giữ byte ổn định, prompt
//    cache vẫn trúng. Nó THAY `focusHint` chứ không cộng thêm.
//  - Mảnh nội dung chia theo KIỂU HỎI: bảng tính chất việc (S4) chỉ đi kèm khi
//    hỏi "hợp nghề gì", khung quyết định chỉ đi kèm khi hỏi "có nên…".
//  - Phần cần đếm cung (chạm Quan Lộc, nền động/ổn, quét năm thăng tiến) do
//    SERVER tính rồi đưa kết quả — model không tự đếm cung, và không phải đọc
//    luật đếm. Trần độ dài canh bởi `npm run check:topics`.
// ============================================================

import { relevantPalacesStrict } from '@/lib/agent/prompts';
import { currentNamXem } from '@/lib/engine/namxem';
import { chuanHoaDauThanh } from '@/lib/vn-text';

// ── Kiểu hỏi trong chủ đề sự nghiệp (S1). Cụm ĐỦ NGHĨA, không âm tiết đơn —
// `check:topics` đọc chính bảng này.
const Y_DINH_SU_NGHIEP: Record<string, string> = {
  'có nên|nên chuyển|nên nghỉ|nên nhảy|nên đổi|khởi nghiệp|làm riêng|mở công ty': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'hợp nghề|nghề gì|hợp làm|làm nghề|ngành gì|hợp ngành': 'ban-chat',
  'cấp trên|sếp tôi|ông sếp|bà sếp|lãnh đạo': 'cap-tren',
  'đồng nghiệp|cấp dưới|nhân viên': 'dong-nghiep',
};
const Y_DINH_MATCHERS = Object.entries(Y_DINH_SU_NGHIEP).map(
  ([p, id]) => [new RegExp(chuanHoaDauThanh(p), 'i'), id] as const,
);

// ── Bộ sao (S3/S4). Hóa là THUỘC TÍNH `hoa` trên sao, không phải sao riêng.
const SAO_CAT = new Set([
  'Tử Vi', 'Thiên Phủ', 'Thiên Tướng', 'Tả Phụ', 'Hữu Bật', 'Văn Xương', 'Văn Khúc',
  'Thiên Khôi', 'Thiên Việt', 'Quốc Ấn', 'Thai Phụ', 'Phong Cáo', 'Đường Phù', 'Lộc Tồn', 'Thiên Mã',
]);
const SAO_HUNG = new Set([
  'Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp', 'Hỏa Tinh', 'Linh Tinh',
  'Quan Phù', 'Phục Binh', 'Thiên Hình', 'Tuần', 'Triệt', 'Tuần+Triệt',
]);
const SAO_DONG = new Set(['Thất Sát', 'Phá Quân', 'Tham Lang', 'Thiên Mã']);
const SAO_ON_DINH = new Set(['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng']);
const SAO_THANG_TIEN = new Set(['Thiên Khôi', 'Thiên Việt']);
const HOA_THANG_TIEN = new Set(['Quyền', 'Khoa']);

const tamHop = (i: number) => [(i + 4) % 12, (i + 8) % 12];
const xung = (i: number) => (i + 6) % 12;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Palace = any;

function starsOf(p: Palace): Palace[] {
  return (p?.stars || []).filter((s: Palace) => s && typeof s === 'object');
}
// Chính tinh để xét nền: cung vô chính diệu thì MƯỢN chính tinh cung xung chiếu
// (luật đã có trong prompt vận hạn).
function chinhTinhXet(palaces: Palace[], i: number): Palace[] {
  const own = palaces[i]?.majorStars || [];
  return own.length ? own : palaces[xung(i)]?.majorStars || [];
}
function nhan(s: Palace): string {
  return s.ten + (s.hoa ? `[Hóa ${s.hoa}]` : '');
}
function uniq(a: string[]): string[] {
  return Array.from(new Set(a));
}

// Sao ĐỘNG của một cung: Sát Phá Tham (tọa, hoặc mượn khi vô chính diệu) + Thiên Mã.
function saoDong(palaces: Palace[], i: number): string[] {
  const chinh = chinhTinhXet(palaces, i).filter((s: Palace) => SAO_DONG.has(s.ten)).map((s: Palace) => s.ten);
  const ma = starsOf(palaces[i]).some((s: Palace) => s.ten === 'Thiên Mã') ? ['Thiên Mã'] : [];
  return uniq([...chinh, ...ma]);
}
function saoSuNghiep(p: Palace): { cat: string[]; hung: string[] } {
  const cat: string[] = [];
  const hung: string[] = [];
  for (const s of starsOf(p)) {
    if (s.hoa === 'Kỵ') hung.push(nhan(s));
    else if (s.hoa) cat.push(nhan(s));
    else if (SAO_CAT.has(s.ten)) cat.push(s.ten);
    else if (SAO_HUNG.has(s.ten)) hung.push(s.ten);
  }
  return { cat: uniq(cat), hung: uniq(hung) };
}
function fmtSao(x: { cat: string[]; hung: string[] }): string {
  const parts = [];
  if (x.cat.length) parts.push('cát ' + x.cat.join(', '));
  if (x.hung.length) parts.push('hung ' + x.hung.join(', '));
  return parts.length ? parts.join('; ') : 'không có sao sự nghiệp nổi bật';
}

// Hạn cung `h` chạm Quan Lộc gốc `ql` theo cách nào (tọa thủ > xung > tam hợp).
function cachCham(h: number, ql: number): string | null {
  if (h === ql) return 'tọa đúng Quan Lộc';
  if (xung(h) === ql) return 'xung chiếu Quan Lộc';
  if (tamHop(h).includes(ql)) return 'tam hợp Quan Lộc';
  return null;
}

function idxCung(palaces: Palace[], ten: string): number {
  return palaces.findIndex((p: Palace) => p?.cungName === ten);
}

// Nền Quan Lộc gốc: biến động (Sát Phá Tham / Thiên Mã) hay ổn định (Tử Phủ Vũ Tướng).
function nenQuanLoc(palaces: Palace[], ql: number): { nhan: string; dong: string[] } {
  const dong = saoDong(palaces, ql);
  const on = chinhTinhXet(palaces, ql).filter((s: Palace) => SAO_ON_DINH.has(s.ten)).map((s: Palace) => s.ten);
  const nhanNen = dong.length && !on.length ? `BIẾN ĐỘNG (${dong.join(', ')})`
    : on.length && !dong.length ? `ỔN ĐỊNH (${on.join(', ')})`
    : dong.length ? `vừa động vừa giữ (${[...dong, ...on].join(', ')})`
    : 'trung tính (không có Sát Phá Tham lẫn Tử Phủ Vũ Tướng)';
  return { nhan: nhanNen, dong };
}

/** Chủ đề của câu hỏi, hoặc null. Hiện chỉ có 'su-nghiep'. */
export function chuDeCuaCauHoi(question: string): string | null {
  const hit = relevantPalacesStrict(question);
  return hit.has('Quan Lộc') ? 'su-nghiep' : null;
}

function yDinh(question: string): Set<string> {
  const q = chuanHoaDauThanh((question || '').toLowerCase());
  const out = new Set<string>();
  for (const [re, id] of Y_DINH_MATCHERS) if (re.test(q)) out.add(id);
  return out;
}

// ── S6: quét các năm tới có hạn chạm Quan Lộc KÈM Quyền/Khoa/Khôi/Việt trong
// chùm tam phương của cung hạn. Server tính, model chỉ đọc danh sách.
function namThangTien(ls: Palace, ql: number, tuNam: number, soNam = 10): string {
  const palaces = ls.palaces || [];
  const tvs: Palace[] = (ls.tieuVanScores || []).filter((t: Palace) => t.nam >= tuNam && t.nam < tuNam + soNam);
  const hits: string[] = [];
  for (const tv of tvs) {
    const bits: string[] = [];
    for (const [tang, ten] of [['tiểu hạn', tv.tieuHanCung], ['lưu niên', tv.luuNienCung]] as const) {
      const h = idxCung(palaces, ten);
      if (h < 0) continue;
      const cham = cachCham(h, ql);
      if (!cham) continue;
      const chum = [h, xung(h), ...tamHop(h)];
      const tot = uniq(chum.flatMap((j) => starsOf(palaces[j])
        .filter((s: Palace) => HOA_THANG_TIEN.has(s.hoa) || SAO_THANG_TIEN.has(s.ten))
        .map(nhan)));
      if (tot.length) bits.push(`${tang} ${ten} ${cham}; ${tot.join(', ')}`);
    }
    if (bits.length) {
      const dv = (ls.daiVans || [])[tv.dvIdx];
      const diem = dv?.scoring?.tong != null ? ` · đại vận ${dv.scoring.tong}/10` : '';
      hits.push(`${tv.nam}: ${bits.join(' | ')}${diem}`);
    }
  }
  return hits.length
    ? `Năm thăng tiến (${tuNam}–${tuNam + soNam - 1}, server đã quét — CHỈ nêu các năm này, không tự suy thêm):\n` + hits.map((h) => '  ' + h).join('\n')
    : `${soNam} năm tới (${tuNam}–${tuNam + soNam - 1}) KHÔNG có năm nào hạn chạm Quan Lộc kèm Quyền/Khoa/Khôi/Việt — nói thẳng, đừng bịa năm.`;
}

// S4 — tính chất việc theo chính tinh. Chỉ in dòng của chính tinh ĐANG ở Quan
// Lộc (hoặc mượn khi vô chính diệu), không in cả bảng: tiết kiệm ~80% khối.
const TINH_CHAT_VIEC: Record<string, string> = {
  'Tử Vi': 'điều hành, giữ trật tự', 'Thiên Phủ': 'điều hành, giữ trật tự',
  'Vũ Khúc': 'con số, tiền, quyết đoán', 'Thất Sát': 'mở đường, phá cũ dựng mới, áp lực cao',
  'Phá Quân': 'mở đường, phá cũ dựng mới, áp lực cao', 'Tham Lang': 'giao tế, kinh doanh, đa tài',
  'Cự Môn': 'dùng lời, lý lẽ, phân tích', 'Thiên Cơ': 'mưu tính, kế hoạch, kỹ thuật',
  'Thiên Lương': 'che chở, dạy dỗ, chữa lành', 'Thái Dương': 'việc công, việc ra mặt, lan tỏa',
  'Thái Âm': 'tích lũy, tỉ mỉ, hậu trường', 'Liêm Trinh': 'kỷ cương, cạnh tranh',
  'Thiên Đồng': 'phục vụ, dịch vụ, nhịp nhàng', 'Thiên Tướng': 'trung gian, hành chính, đứng giữa',
};
function tinhChatViec(palaces: Palace[], ql: number): string {
  const muon = !(palaces[ql]?.majorStars || []).length;
  const dong = chinhTinhXet(palaces, ql)
    .filter((s: Palace) => TINH_CHAT_VIEC[s.ten])
    .map((s: Palace) => `${s.ten}${s.brightness ? '(' + s.brightness + ')' : ''}: ${TINH_CHAT_VIEC[s.ten]}`);
  if (!dong.length) return '';
  return `Tính chất việc hợp${muon ? ' (Quan Lộc vô chính diệu, mượn chính tinh xung chiếu)' : ''} — nói TÍNH CHẤT, không nói tên nghề: ${dong.join(' · ')}. Sát Phá Tham chủ biến động, Tử Phủ Vũ Tướng chủ ổn định.`;
}

/**
 * Khối chủ đề nhét vào CUỐI tin nhắn người dùng (thay `focusHint`). Trả '' nếu
 * câu hỏi không thuộc chủ đề nào đã dựng — lúc đó caller dùng `focusHint` cũ.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function khoiChuDe(question: string, ls: any): string {
  if (chuDeCuaCauHoi(question) !== 'su-nghiep' || !ls?.palaces) return '';
  const palaces = ls.palaces;
  const ql = idxCung(palaces, 'Quan Lộc');
  if (ql < 0) return '';
  const yd = yDinh(question);
  const nen = nenQuanLoc(palaces, ql);
  const qlP = palaces[ql];

  const cung = ['Quan Lộc (chính)', 'tam phương: Mệnh, Tài Bạch, Phu Thê (xung)'];
  if (yd.has('cap-tren')) cung.push('Phụ Mẫu (cấp trên)');
  if (yd.has('dong-nghiep')) cung.push('Nô Bộc (đồng nghiệp, cấp dưới)');
  if (yd.has('quyet-dinh')) cung.push('Thiên Di (đổi môi trường)', 'Tài Bạch + Phúc Đức nếu làm riêng');

  const L: string[] = [];
  L.push('(Trọng tâm: SỰ NGHIỆP.');
  L.push(`Cung đọc: ${cung.join('; ')}. Trọng số tọa thủ > xung chiếu > tam hợp.`);
  L.push(`Quan Lộc gốc (${qlP.diaChi}): nền ${nen.nhan}; sao sự nghiệp: ${fmtSao(saoSuNghiep(qlP))}.`);
  L.push('Sát tinh/Thiên Hình ĐẮC địa ở Quan Lộc không tính là xấu (hợp việc kỹ thuật, kỷ luật, mở đường) — xét độ sáng trước khi phán.');
  if (/năm|tháng/.test(chuanHoaDauThanh(question.toLowerCase()))) {
    L.push('Hỏi theo NĂM/THÁNG: đọc cung hạn QUA ý nghĩa công việc; KHÔNG kể nghĩa gốc của cung hạn (nhà đất, con cái…) nếu không nối được sang công việc.');
  }
  if (yd.has('quyet-dinh')) {
    L.push('Kiểu hỏi QUYẾT ĐỊNH: câu đầu trả lời có / không / chưa. Căn cứ theo thứ tự: nền Quan Lộc gốc (động hay ổn) → năm nay hạn có chạm Quan Lộc/Thiên Di không → Thiên Mã, Lộc Tồn.');
  }
  if (yd.has('ban-chat')) { const tc = tinhChatViec(palaces, ql); if (tc) L.push(tc); }
  if (yd.has('thoi-diem')) L.push(namThangTien(ls, ql, currentNamXem()));
  return L.join('\n') + ')';
}

/**
 * Lăng kính sự nghiệp cho kết quả `tra_tieu_van` (S5): hạn năm có chạm Quan Lộc
 * gốc không, sao động/sao sự nghiệp ở hai cung hạn, và mức biến động công việc
 * theo luật Henry: Quan Lộc gốc có yếu tố động + tiểu hạn có sao động ⇒ CAO.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lanKinhSuNghiepNam(ls: any, tv: any): string {
  const palaces = ls?.palaces || [];
  const ql = idxCung(palaces, 'Quan Lộc');
  if (ql < 0 || !tv) return '';
  const nen = nenQuanLoc(palaces, ql);
  const out: string[] = [`── LĂNG KÍNH SỰ NGHIỆP năm ${tv.nam} (server tính) ──`];
  out.push(`- Quan Lộc gốc: nền ${nen.nhan}.`);
  let dongTieuHan: string[] = [];
  let coCham = false;
  for (const [tang, ten] of [['Tiểu hạn', tv.tieuHanCung], ['Lưu niên', tv.luuNienCung]] as const) {
    const h = idxCung(palaces, ten);
    if (h < 0) continue;
    const cham = cachCham(h, ql);
    if (cham) coCham = true;
    const dong = saoDong(palaces, h);
    if (tang === 'Tiểu hạn') dongTieuHan = dong;
    out.push(`- ${tang} ${ten}: ${cham ? 'CHẠM Quan Lộc (' + cham + ')' : 'không chạm Quan Lộc'}; sao động: ${dong.length ? dong.join(', ') : 'không'}; ${fmtSao(saoSuNghiep(palaces[h]))}.`);
  }
  const muc = nen.dong.length && dongTieuHan.length ? 'CAO' : nen.dong.length || dongTieuHan.length ? 'VỪA' : 'THẤP';
  out.push(`- Khả năng công việc biến động (đổi chỗ, đi xa, đi nhiều): ${muc} — luật: Quan Lộc gốc có yếu tố động + tiểu hạn có sao động.`);
  out.push(coCham
    ? '- Hai tầng hạn vẫn gọi tên, nhưng LUẬN QUA ý nghĩa công việc.'
    : '- Không tầng nào chạm Quan Lộc ⇒ nói rõ năm nay công việc KHÔNG phải tâm điểm biến động, chủ yếu đi theo nền gốc; vẫn gọi tên hai cung hạn nhưng chỉ nói phần ảnh hưởng tới công việc.');
  return out.join('\n');
}
