// lib/agent/luan-chu-de.ts
// ============================================================
// KỸ NĂNG LUẬN THEO CHỦ ĐỀ — hỏi chuyện gì thì nhìn cung nào, sao nào, đọc
// tầng thời gian ra sao. Nội dung cổ pháp do Henry duyệt từng mục (2026-09-25):
// SỰ NGHIỆP (S1–S7), TÌNH DUYÊN (T1–T7), TÀI CHÍNH (F1–F7), CON CÁI (C1–C7), GIA ĐẠO (G1–G7). Thêm chủ đề = thêm MỘT `ChuDe` vào
// `CHU_DE` bên dưới (chỉ khai dữ liệu); phần chạm cung / quét năm / lăng kính
// năm là khuôn dùng chung. KHÔNG rải luật vào system prompt.
//
// 💸 Ngân sách token là ràng buộc thiết kế, không phải chuyện làm sau:
//  - Khối chỉ sinh ra khi câu hỏi TRÚNG chủ đề (0 byte với câu khác).
//  - Khối đi vào TIN NHẮN, không vào system ⇒ system giữ byte ổn định, prompt
//    cache vẫn trúng. Nó THAY `focusHint` chứ không cộng thêm.
//  - Mảnh nội dung chia theo KIỂU HỎI: bảng tính chất chỉ đi kèm khi hỏi bản
//    chất, khung quyết định chỉ đi kèm khi hỏi "có nên…"; bảng tính chất chỉ in
//    dòng của chính tinh ĐANG ở cung chính, không in cả 14 sao.
//  - Phần cần đếm cung (chạm cung chính, nền động/ổn, quét năm) do SERVER tính
//    rồi đưa kết quả — model không tự đếm cung, không phải đọc luật đếm.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { relevantPalacesStrict, primaryPalacesStrict } from '@/lib/agent/prompts';
import { currentNamXem } from '@/lib/engine/namxem';
import { chuanHoaDauThanh } from '@/lib/vn-text';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Palace = any;
type Sao = Palace;
type LoaiSao = 'cát' | 'hung' | 'đào hoa' | 'hỷ';

const tamHop = (i: number) => [(i + 4) % 12, (i + 8) % 12];
const xung = (i: number) => (i + 6) % 12;
const uniq = (a: string[]) => Array.from(new Set(a));
const norm = (s: string) => chuanHoaDauThanh((s || '').toLowerCase());
const matchers = (t: Record<string, string>) =>
  Object.entries(t).map(([p, id]) => [new RegExp(chuanHoaDauThanh(p), 'i'), id] as const);

function starsOf(p: Palace): Sao[] {
  return (p?.stars || []).filter((s: Sao) => s && typeof s === 'object');
}
// Chính tinh để xét nền: cung vô chính diệu thì MƯỢN chính tinh cung xung chiếu
// (luật đã có trong prompt vận hạn).
function chinhTinhXet(palaces: Palace[], i: number): Sao[] {
  const own = palaces[i]?.majorStars || [];
  return own.length ? own : palaces[xung(i)]?.majorStars || [];
}
const muonChinhTinh = (palaces: Palace[], i: number) => !(palaces[i]?.majorStars || []).length;
const nhan = (s: Sao) => s.ten + (s.hoa ? `[Hóa ${s.hoa}]` : '');
const idxCung = (palaces: Palace[], ten: string) => palaces.findIndex((p: Palace) => p?.cungName === ten);
const coSao = (p: Palace, ten: string) => starsOf(p).some((s: Sao) => s.ten === ten);

// ── Khuôn một chủ đề ─────────────────────────────────────────
interface ChuDe {
  id: string;
  ten: string; // in hoa, vd 'SỰ NGHIỆP'
  cung: string; // cung chính, vd 'Quan Lộc'
  nghia: string; // "công việc" / "tình cảm" — cụm dùng trong câu lệnh đọc hạn
  yDinh: ReadonlyArray<readonly [RegExp, string]>;
  tenNhomSao: string; // "sao sự nghiệp"
  // Phân loại một sao ở cung đang xét (null = không liên quan chủ đề).
  loaiSao: (s: Sao) => LoaiSao | null;
  // Nền cung chính: yếu tố ĐỘNG + yếu tố ỔN (đã xét mượn chính tinh).
  nen: (palaces: Palace[], i: number) => { dong: string[]; on: string[]; tenOn: string };
  // Yếu tố ở TIỂU HẠN dùng cho luật mức biến động (Henry chốt từng chủ đề).
  hanDong: (palaces: Palace[], h: number) => string[];
  tenHanDong: string;
  bienDong: string; // "công việc biến động (đổi chỗ, đi xa, đi nhiều)"
  luatBienDong: string;
  // Năm "tốt" để quét khi hỏi bao giờ: sao cần có trong chùm tam phương cung hạn.
  // Không khai = chủ đề chưa được duyệt luật quét năm → không quét.
  namTot?: { ten: string; thieu: string; hop: (s: Sao) => boolean };
  // Các dòng riêng của chủ đề (cung đọc theo kiểu hỏi, luật riêng…).
  dongRieng: (x: { palaces: Palace[]; i: number; yd: Set<string>; gioi: 'nam' | 'nu' | null }) => string[];
  tinhChat: Record<string, string>;
  tenTinhChat: string; // "Tính chất việc hợp"
  chiDanTinhChat: string; // chen giữa tên và danh sách
  duoiTinhChat: string;
}

function fmtSao(cd: ChuDe, p: Palace): string {
  const nhom: Record<LoaiSao, string[]> = { cát: [], hung: [], 'đào hoa': [], hỷ: [] };
  for (const s of starsOf(p)) {
    const l = cd.loaiSao(s);
    if (l) nhom[l].push(nhan(s));
  }
  const parts = (['cát', 'hung', 'đào hoa', 'hỷ'] as const)
    .filter((k) => nhom[k].length)
    .map((k) => `${k} ${uniq(nhom[k]).join(', ')}`);
  return parts.length ? parts.join('; ') : `không có ${cd.tenNhomSao} nổi bật`;
}

function nhanNen(cd: ChuDe, palaces: Palace[], i: number): { nhan: string; dong: string[] } {
  const { dong, on, tenOn } = cd.nen(palaces, i);
  const t = dong.length && !on.length ? `BIẾN ĐỘNG (${dong.join(', ')})`
    : on.length && !dong.length ? `ỔN ĐỊNH (${on.join(', ')})`
    : dong.length ? `vừa động vừa giữ (${[...dong, ...on].join(', ')})`
    : `trung tính (không có Sát Phá Tham lẫn ${tenOn})`;
  return { nhan: t, dong };
}

// Hạn cung `h` chạm cung chính `c` theo cách nào (tọa thủ > xung > tam hợp).
function cachCham(h: number, c: number, ten: string): string | null {
  if (h === c) return `tọa đúng ${ten}`;
  if (xung(h) === c) return `xung chiếu ${ten}`;
  if (tamHop(h).includes(c)) return `tam hợp ${ten}`;
  return null;
}

function tinhChat(cd: ChuDe, palaces: Palace[], i: number): string {
  const dong = chinhTinhXet(palaces, i)
    .filter((s: Sao) => cd.tinhChat[s.ten])
    .map((s: Sao) => `${s.ten}${s.brightness ? '(' + s.brightness + ')' : ''}: ${cd.tinhChat[s.ten]}`);
  if (!dong.length) return '';
  const muon = muonChinhTinh(palaces, i) ? ` (${cd.cung} vô chính diệu, mượn chính tinh xung chiếu)` : '';
  return `${cd.tenTinhChat}${muon} — ${cd.chiDanTinhChat}${dong.join(' · ')}. ${cd.duoiTinhChat}`;
}

// Quét 10 năm tới: hạn chạm cung chính + chùm tam phương cung hạn có sao `namTot`.
function quetNam(cd: ChuDe, ls: Palace, c: number, tuNam: number, soNam = 10): string {
  const nt = cd.namTot;
  if (!nt) return '';
  const palaces = ls.palaces || [];
  const tvs: Palace[] = (ls.tieuVanScores || []).filter((t: Palace) => t.nam >= tuNam && t.nam < tuNam + soNam);
  const hits: string[] = [];
  for (const tv of tvs) {
    const bits: string[] = [];
    for (const [tang, ten] of [['tiểu hạn', tv.tieuHanCung], ['lưu niên', tv.luuNienCung]] as const) {
      const h = idxCung(palaces, ten);
      if (h < 0) continue;
      const cham = cachCham(h, c, cd.cung);
      if (!cham) continue;
      const tot = uniq([h, xung(h), ...tamHop(h)].flatMap((j) => starsOf(palaces[j]).filter(nt.hop).map(nhan)));
      if (tot.length) bits.push(`${tang} ${ten} ${cham}; ${tot.join(', ')}`);
    }
    if (bits.length) {
      const dv = (ls.daiVans || [])[tv.dvIdx];
      const diem = dv?.scoring?.tong != null ? ` · đại vận ${dv.scoring.tong}/10` : '';
      hits.push(`${tv.nam}: ${bits.join(' | ')}${diem}`);
    }
  }
  const khoang = `${tuNam}–${tuNam + soNam - 1}`;
  return hits.length
    ? `${nt.ten} (${khoang}, server đã quét — CHỈ nêu các năm này, không tự suy thêm):\n` + hits.map((h) => '  ' + h).join('\n')
    : `${soNam} năm tới (${khoang}) KHÔNG có năm nào hạn chạm ${cd.cung} kèm ${nt.thieu} — nói thẳng, đừng bịa năm.`;
}

// ── SỰ NGHIỆP (S1–S7) ────────────────────────────────────────
// `check:topics` đọc chính các bảng Y_DINH_* này — cụm ĐỦ NGHĨA, không âm tiết đơn.
const Y_DINH_SU_NGHIEP: Record<string, string> = {
  'có nên|nên chuyển|nên nghỉ|nên nhảy|nên đổi|khởi nghiệp|làm riêng|mở công ty': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'hợp nghề|nghề gì|hợp làm|làm nghề|ngành gì|hợp ngành': 'ban-chat',
  'cấp trên|sếp tôi|ông sếp|bà sếp|lãnh đạo': 'cap-tren',
  'đồng nghiệp|cấp dưới|nhân viên': 'dong-nghiep',
};
const SN_CAT = new Set([
  'Tử Vi', 'Thiên Phủ', 'Thiên Tướng', 'Tả Phụ', 'Hữu Bật', 'Văn Xương', 'Văn Khúc',
  'Thiên Khôi', 'Thiên Việt', 'Quốc Ấn', 'Thai Phụ', 'Phong Cáo', 'Đường Phù', 'Lộc Tồn', 'Thiên Mã',
]);
const SN_HUNG = new Set([
  'Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp', 'Hỏa Tinh', 'Linh Tinh',
  'Quan Phù', 'Phục Binh', 'Thiên Hình', 'Tuần', 'Triệt', 'Tuần+Triệt',
]);
const SAT_PHA_THAM = new Set(['Thất Sát', 'Phá Quân', 'Tham Lang']);
// Sao ĐỘNG cho công việc: Sát Phá Tham (tọa, hoặc mượn) + Thiên Mã.
function snDong(palaces: Palace[], i: number): string[] {
  const chinh = chinhTinhXet(palaces, i).filter((s: Sao) => SAT_PHA_THAM.has(s.ten)).map((s: Sao) => s.ten);
  return uniq([...chinh, ...(coSao(palaces[i], 'Thiên Mã') ? ['Thiên Mã'] : [])]);
}

const SU_NGHIEP: ChuDe = {
  id: 'su-nghiep',
  ten: 'SỰ NGHIỆP',
  cung: 'Quan Lộc',
  nghia: 'công việc',
  yDinh: matchers(Y_DINH_SU_NGHIEP),
  tenNhomSao: 'sao sự nghiệp',
  loaiSao: (s) => (s.hoa === 'Kỵ' ? 'hung' : s.hoa ? 'cát' : SN_CAT.has(s.ten) ? 'cát' : SN_HUNG.has(s.ten) ? 'hung' : null),
  nen: (palaces, i) => ({
    dong: snDong(palaces, i),
    on: chinhTinhXet(palaces, i).filter((s: Sao) => ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'].includes(s.ten)).map((s: Sao) => s.ten),
    tenOn: 'Tử Phủ Vũ Tướng',
  }),
  hanDong: snDong,
  tenHanDong: 'sao động',
  bienDong: 'công việc biến động (đổi chỗ, đi xa, đi nhiều)',
  luatBienDong: 'Quan Lộc gốc có yếu tố động + tiểu hạn có sao động',
  namTot: {
    ten: 'Năm thăng tiến',
    thieu: 'Quyền/Khoa/Khôi/Việt',
    hop: (s) => s.hoa === 'Quyền' || s.hoa === 'Khoa' || s.ten === 'Thiên Khôi' || s.ten === 'Thiên Việt',
  },
  dongRieng: ({ yd }) => {
    const cung = ['Quan Lộc (chính)', 'tam phương: Mệnh, Tài Bạch, Phu Thê (xung)'];
    if (yd.has('cap-tren')) cung.push('Phụ Mẫu (cấp trên)');
    if (yd.has('dong-nghiep')) cung.push('Nô Bộc (đồng nghiệp, cấp dưới)');
    if (yd.has('quyet-dinh')) cung.push('Thiên Di (đổi môi trường)', 'Tài Bạch + Phúc Đức nếu làm riêng');
    const L = [`Cung đọc: ${cung.join('; ')}. Trọng số tọa thủ > xung chiếu > tam hợp.`];
    L.push('@NEN');
    L.push('Sát tinh/Thiên Hình ĐẮC địa ở Quan Lộc không tính là xấu (hợp việc kỹ thuật, kỷ luật, mở đường) — xét độ sáng trước khi phán.');
    L.push('@NAM');
    if (yd.has('quyet-dinh')) {
      L.push('Kiểu hỏi QUYẾT ĐỊNH: câu đầu trả lời có / không / chưa. Căn cứ theo thứ tự: nền Quan Lộc gốc (động hay ổn) → năm nay hạn có chạm Quan Lộc/Thiên Di không → Thiên Mã, Lộc Tồn.');
    }
    return L;
  },
  tinhChat: {
    'Tử Vi': 'điều hành, giữ trật tự', 'Thiên Phủ': 'điều hành, giữ trật tự',
    'Vũ Khúc': 'con số, tiền, quyết đoán', 'Thất Sát': 'mở đường, phá cũ dựng mới, áp lực cao',
    'Phá Quân': 'mở đường, phá cũ dựng mới, áp lực cao', 'Tham Lang': 'giao tế, kinh doanh, đa tài',
    'Cự Môn': 'dùng lời, lý lẽ, phân tích', 'Thiên Cơ': 'mưu tính, kế hoạch, kỹ thuật',
    'Thiên Lương': 'che chở, dạy dỗ, chữa lành', 'Thái Dương': 'việc công, việc ra mặt, lan tỏa',
    'Thái Âm': 'tích lũy, tỉ mỉ, hậu trường', 'Liêm Trinh': 'kỷ cương, cạnh tranh',
    'Thiên Đồng': 'phục vụ, dịch vụ, nhịp nhàng', 'Thiên Tướng': 'trung gian, hành chính, đứng giữa',
  },
  tenTinhChat: 'Tính chất việc hợp',
  chiDanTinhChat: 'nói TÍNH CHẤT, không nói tên nghề: ',
  duoiTinhChat: 'Sát Phá Tham chủ biến động, Tử Phủ Vũ Tướng chủ ổn định.',
};

// ── TÌNH DUYÊN (T1–T7) ───────────────────────────────────────
const Y_DINH_TINH_DUYEN: Record<string, string> = {
  'có nên|nên cưới|nên chia tay|quay lại|nên ly hôn': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'bạn đời|hợp người|người thế nào|vợ tương lai|chồng tương lai|vợ sau này|chồng sau này|tính cách vợ|tính cách chồng': 'ban-chat',
  'ngoại tình|lăng nhăng|người thứ ba|đào hoa|bồ nhí|cắm sừng': 'dao-hoa',
  'ly hôn|ly thân|bền không|đổ vỡ|tan vỡ|hôn nhân có': 'ben-vung',
};
const TD_DAO_HOA = new Set(['Đào Hoa', 'Hồng Loan', 'Thiên Hỷ', 'Thiên Riêu', 'Mộc Dục', 'Tham Lang', 'Liêm Trinh']);
const TD_CAT = new Set(['Thiên Phủ', 'Thiên Lương', 'Thiên Đồng']);
const TD_HUNG = new Set([
  'Cô Thần', 'Quả Tú', 'Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp',
  'Thiên Hình', 'Thiên Không', 'Hoa Cái', 'Tuần', 'Triệt', 'Tuần+Triệt',
]);
const SAT_TINH = new Set(['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp']);
const HY_TINH = new Set(['Đào Hoa', 'Hồng Loan', 'Thiên Hỷ']);
const tdLoai = (s: Sao): LoaiSao | null => {
  if (s.hoa === 'Kỵ') return 'hung';
  if (s.hoa === 'Lộc' || s.hoa === 'Khoa') return 'cát';
  if (TD_DAO_HOA.has(s.ten)) return 'đào hoa';
  if (TD_CAT.has(s.ten)) return 'cát';
  if ((s.ten === 'Thái Âm' || s.ten === 'Thái Dương') && /Miếu|Vượng/.test(s.brightness || '')) return 'cát';
  if (TD_HUNG.has(s.ten)) return 'hung';
  return null;
};
// Tên các sao ĐÀO HOA ở một cung (kể cả chính tinh Tham/Liêm tọa thủ).
const daoHoaO = (p: Palace) => uniq(starsOf(p).filter((s: Sao) => TD_DAO_HOA.has(s.ten)).map((s: Sao) => s.ten));

const TINH_DUYEN: ChuDe = {
  id: 'tinh-duyen',
  ten: 'TÌNH DUYÊN',
  cung: 'Phu Thê',
  nghia: 'tình cảm',
  yDinh: matchers(Y_DINH_TINH_DUYEN),
  tenNhomSao: 'sao tình duyên',
  loaiSao: tdLoai,
  // T5.4: nền Phu Thê ĐỘNG = Sát Phá Tham (tọa/mượn) / Hóa Kỵ / Không Kiếp;
  // ỔN = Tử Phủ Đồng Lương.
  nen: (palaces, i) => {
    const chinh = chinhTinhXet(palaces, i);
    const dong = uniq([
      ...chinh.filter((s: Sao) => SAT_PHA_THAM.has(s.ten)).map((s: Sao) => s.ten),
      ...starsOf(palaces[i]).filter((s: Sao) => s.hoa === 'Kỵ').map(nhan),
      ...starsOf(palaces[i]).filter((s: Sao) => s.ten === 'Địa Không' || s.ten === 'Địa Kiếp').map((s: Sao) => s.ten),
    ]);
    const on = chinh.filter((s: Sao) => ['Tử Vi', 'Thiên Phủ', 'Thiên Đồng', 'Thiên Lương'].includes(s.ten)).map((s: Sao) => s.ten);
    return { dong, on, tenOn: 'Tử Phủ Đồng Lương' };
  },
  // T5.4: tiểu hạn có sao ĐÀO HOA hoặc SÁT TINH (tọa thủ).
  hanDong: (palaces, h) =>
    uniq(starsOf(palaces[h]).filter((s: Sao) => TD_DAO_HOA.has(s.ten) || SAT_TINH.has(s.ten)).map((s: Sao) => s.ten)),
  tenHanDong: 'đào hoa/sát tinh',
  bienDong: 'tình cảm biến động (có duyên mới, trục trặc, chia ly)',
  luatBienDong: 'Phu Thê gốc có yếu tố động (Sát Phá Tham/Kỵ/Không Kiếp) + tiểu hạn có đào hoa hoặc sát tinh',
  namTot: { ten: 'Năm có duyên / hỷ sự', thieu: 'Đào Hoa/Hồng Loan/Thiên Hỷ', hop: (s) => HY_TINH.has(s.ten) },
  dongRieng: ({ palaces, i, yd, gioi }) => {
    const ban = gioi === 'nam' ? 'vợ' : gioi === 'nu' ? 'chồng' : 'vợ/chồng';
    const cung = [`Phu Thê (chính — đọc là ${ban})`, 'tam phương: Phúc Đức, Thiên Di, Quan Lộc (xung)', 'Mệnh (cách mình yêu)'];
    if (yd.has('dao-hoa')) cung.push('Nô Bộc (người thứ ba)');
    const L = [`Cung đọc: ${cung.join('; ')}. Trọng số tọa thủ > xung chiếu > tam hợp.`];
    L.push('@NEN');
    if (palaces[i]?.isThan) L.push('Thân cư Phu Thê: đời xoay quanh hôn nhân, chuyện vợ chồng ảnh hưởng mạnh tới cả đời.');
    const taHuu = ['Tả Phụ', 'Hữu Bật'].filter((t) => coSao(palaces[i], t));
    if (taHuu.length) L.push(`${taHuu.join(', ')} tọa Phu Thê: DẤU HIỆU hai đời ${ban} — nêu như dấu hiệu, không phán chắc.`);
    L.push('@NAM');
    if (yd.has('quyet-dinh')) {
      L.push('Kiểu hỏi QUYẾT ĐỊNH: câu đầu trả lời có / không / chưa. Căn cứ theo thứ tự: nền Phu Thê gốc (động hay ổn) → năm nay hạn có chạm Phu Thê không, gặp đào hoa hay hung tinh.');
    }
    if (yd.has('ben-vung')) {
      L.push('Hỏi HÔN NHÂN BỀN / LY HÔN: căn cứ nền Phu Thê (Sát Phá Tham, Kỵ, Không Kiếp, Cô Quả, Tuần Triệt) và các năm hạn chạm Phu Thê có hung tinh; nói nguy cơ, KHÔNG phán chắc sẽ ly hôn.');
    }
    if (yd.has('dao-hoa')) {
      const noi = (['Mệnh', 'Phu Thê', 'Thiên Di', 'Nô Bộc'] as const)
        .map((t) => { const j = idxCung(palaces, t); const d = j >= 0 ? daoHoaO(palaces[j]) : []; return d.length ? `${t}: ${d.join(', ')}` : ''; })
        .filter(Boolean);
      L.push(`Đào hoa trong lá số (server tính): ${noi.length ? noi.join(' · ') : 'không có ở Mệnh/Phu Thê/Thiên Di/Nô Bộc'}. Đào hoa tụ ở Mệnh/Phu Thê/Thiên Di, nhất là kèm Thiên Riêu, Mộc Dục hoặc Tham Lang/Liêm Trinh hãm, là dấu lăng nhăng; người thứ ba đọc ở Nô Bộc.`);
      L.push('ĐÀO HOA / NGOẠI TÌNH: KHÔNG phán chắc có ngoại tình, KHÔNG buộc tội ai — chỉ nói nguy cơ, lúc nào dễ xảy ra, nên làm gì.');
    }
    return L;
  },
  tinhChat: {
    'Tử Vi': 'có uy, gia trưởng', 'Thiên Phủ': 'điềm đạm, giữ của', 'Vũ Khúc': 'cứng rắn, thực tế',
    'Thất Sát': 'mạnh, nóng', 'Phá Quân': 'bốc đồng, hay đổi', 'Tham Lang': 'đa tình, nhiều tài',
    'Cự Môn': 'nói nhiều, hay cãi', 'Thiên Cơ': 'nhanh nhạy, tính toán',
    'Thiên Lương': 'chững chạc, che chở, thường hơn tuổi', 'Thái Dương': 'sôi nổi, sĩ diện',
    'Thái Âm': 'dịu, sâu kín', 'Liêm Trinh': 'nguyên tắc, hay ghen', 'Thiên Đồng': 'hiền, trẻ tính',
    'Thiên Tướng': 'tử tế, chiều chuộng',
  },
  tenTinhChat: 'Bạn đời là người',
  chiDanTinhChat: '',
  duoiTinhChat: 'Sát Phá Tham ở Phu Thê chủ hôn nhân biến động, nên lấy muộn; Tử Phủ Đồng Lương chủ ổn định.',
};

// ── TÀI CHÍNH (F1–F7) ────────────────────────────────────────
const Y_DINH_TAI_CHINH: Record<string, string> = {
  'có nên|nên đầu tư|nên vay|nên cho vay|nên mua|nên bán|nên góp vốn': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'có giàu|giàu không|kiếm tiền|giữ được tiền|giữ tiền|cách kiếm': 'ban-chat',
  'mất tiền|hao tài|nợ nần|vay nợ|bị lừa|phá sản|thua lỗ|cho vay|đòi nợ': 'hao-tai',
  'kinh doanh|làm ăn|buôn bán|làm công': 'lam-an',
};
const TC_TAI = new Set(['Vũ Khúc', 'Thiên Phủ', 'Thái Âm', 'Lộc Tồn', 'Thiên Mã']);
const TC_HAO = new Set([
  'Địa Không', 'Địa Kiếp', 'Đại Hao', 'Tiểu Hao', 'Kình Dương', 'Đà La',
  'Kiếp Sát', 'Phá Toái', 'Tuần', 'Triệt', 'Tuần+Triệt',
]);
// Sao HAO dùng cho luật năm (F5.3): Không Kiếp, Đại/Tiểu Hao, Hóa Kỵ.
const laSaoHao = (s: Sao) => s.hoa === 'Kỵ' || ['Địa Không', 'Địa Kiếp', 'Đại Hao', 'Tiểu Hao'].includes(s.ten);
const coLoc = (p: Palace) => starsOf(p).some((s: Sao) => s.ten === 'Lộc Tồn' || s.hoa === 'Lộc');

const TAI_CHINH: ChuDe = {
  id: 'tai-chinh',
  ten: 'TÀI CHÍNH',
  cung: 'Tài Bạch',
  nghia: 'tiền bạc',
  yDinh: matchers(Y_DINH_TAI_CHINH),
  tenNhomSao: 'sao tài chính',
  loaiSao: (s) => (s.hoa === 'Kỵ' ? 'hung' : s.hoa === 'Lộc' ? 'cát' : TC_TAI.has(s.ten) ? 'cát' : TC_HAO.has(s.ten) ? 'hung' : null),
  // F5.4: nền Tài Bạch ĐỘNG = Sát Phá Tham (tọa/mượn) / Không Kiếp / Đại–Tiểu Hao;
  // GIỮ CỦA = Tử Phủ Vũ Tướng.
  nen: (palaces, i) => ({
    dong: uniq([
      ...chinhTinhXet(palaces, i).filter((s: Sao) => SAT_PHA_THAM.has(s.ten)).map((s: Sao) => s.ten),
      ...starsOf(palaces[i]).filter((s: Sao) => ['Địa Không', 'Địa Kiếp', 'Đại Hao', 'Tiểu Hao'].includes(s.ten)).map((s: Sao) => s.ten),
    ]),
    on: chinhTinhXet(palaces, i).filter((s: Sao) => ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'].includes(s.ten)).map((s: Sao) => s.ten),
    tenOn: 'Tử Phủ Vũ Tướng',
  }),
  // F5.4: tiểu hạn có sao HAO hoặc Thiên Mã (tọa thủ).
  hanDong: (palaces, h) => uniq(starsOf(palaces[h]).filter((s: Sao) => laSaoHao(s) || s.ten === 'Thiên Mã').map(nhan)),
  tenHanDong: 'sao hao/Thiên Mã',
  bienDong: 'tiền bạc biến động (vào ra mạnh, được lớn hoặc hao lớn)',
  luatBienDong: 'Tài Bạch gốc có yếu tố động (Sát Phá Tham/Không Kiếp/Đại–Tiểu Hao) + tiểu hạn có sao hao hoặc Thiên Mã',
  namTot: { ten: 'Năm có lộc', thieu: 'Lộc Tồn/Hóa Lộc', hop: (s) => s.ten === 'Lộc Tồn' || s.hoa === 'Lộc' },
  dongRieng: ({ palaces, i, yd }) => {
    const cung = ['Tài Bạch (chính)', 'tam phương: Mệnh, Quan Lộc, Phúc Đức (xung)', 'Điền Trạch (kho giữ của)'];
    if (yd.has('quyet-dinh') || yd.has('hao-tai')) cung.push('Nô Bộc (cho vay mượn, đối tác góp vốn)');
    if (yd.has('lam-an')) cung.push('Nô Bộc (cho vay mượn, đối tác góp vốn)');
    const L = [`Cung đọc: ${uniq(cung).join('; ')}. Trọng số tọa thủ > xung chiếu > tam hợp.`];
    L.push('@NEN');
    const dt = idxCung(palaces, 'Điền Trạch');
    if (dt >= 0) L.push(`Điền Trạch (kho giữ của): ${fmtSao(TAI_CHINH, palaces[dt])}.`);
    const tb = palaces[i];
    if (coLoc(tb) && (coSao(tb, 'Địa Không') || coSao(tb, 'Địa Kiếp'))) L.push('Tài Bạch có Lộc gặp Không Kiếp: cách LỘC TAN — tiền đến rồi đi.');
    if (coSao(tb, 'Vũ Khúc') && coLoc(tb)) L.push('Tài Bạch có Vũ Khúc gặp Lộc Tồn/Hóa Lộc: cách GIÀU.');
    L.push('@NAM');
    if (yd.has('quyet-dinh')) {
      L.push('Kiểu hỏi QUYẾT ĐỊNH: câu đầu trả lời có / không / chưa. Căn cứ theo thứ tự: nền Tài Bạch gốc (động hay giữ của) → năm nay hạn có chạm Tài Bạch không, gặp sao tài hay sao hao.');
    }
    if (yd.has('hao-tai')) {
      L.push('Hỏi HAO TÀI / NỢ / BỊ LỪA: căn cứ sao hao ở Tài Bạch, Điền Trạch (kho) và các năm hạn chạm Tài Bạch có Không Kiếp/Hao/Kỵ; nói nguy cơ và cách phòng, không đổ lỗi cho ai.');
    }
    if (yd.has('lam-an')) {
      L.push('Hỏi LÀM ĂN: căn cứ nền Tài Bạch (động hay giữ của) để nói hợp tự làm ăn, chịu lên xuống, hay hợp giữ nguồn tiền đều.');
    }
    L.push('AN TOÀN: KHÔNG khuyên mã cổ phiếu, kênh đầu tư, số tiền hay TỈ LỆ % vốn cụ thể; KHÔNG hứa trúng số/chắc thắng — chỉ nói thời điểm thuận/nghịch, mức rủi ro, nên phòng gì.');
    return L;
  },
  tinhChat: {
    'Vũ Khúc': 'quyết đoán, đụng thẳng vào tiền', 'Thiên Phủ': 'giữ của giỏi', 'Thái Âm': 'tích tiểu thành đại',
    'Tử Vi': 'tiền nhờ vị thế', 'Thất Sát': 'tiền từ mạo hiểm, lên xuống mạnh', 'Phá Quân': 'kiếm nhanh, tiêu nhanh',
    'Tham Lang': 'nhiều nguồn, tiền từ giao tế', 'Cự Môn': 'tiền từ lời nói, cạnh tranh',
    'Thiên Cơ': 'tiền từ tính toán, linh hoạt', 'Thiên Lương': 'tiền đều, không hợp đầu cơ',
    'Thái Dương': 'tiền từ danh tiếng, hay chi cho người', 'Liêm Trinh': 'tiền trong khuôn khổ, dễ dính giấy tờ',
    'Thiên Đồng': 'tay trắng làm nên', 'Thiên Tướng': 'tiền từ trung gian, dịch vụ',
  },
  tenTinhChat: 'Cách kiếm tiền',
  chiDanTinhChat: '',
  duoiTinhChat: 'Sát Phá Tham ở Tài Bạch chủ tiền biến động; Tử Phủ Vũ Tướng chủ giữ của.',
};

// ── CON CÁI (C1–C7) ──────────────────────────────────────────
const Y_DINH_TU_TUC: Record<string, string> = {
  'có nên sinh|nên sinh|sinh thêm|sinh năm nào|sinh con năm': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'mấy con|bao nhiêu con|số con|đông con|ít con|hiếm con|hiếm muộn|muộn con|có con không|có con chưa': 'so-con',
  'có hiếu|nhờ được con|nhờ con|hợp con|con hư|con cãi|xa con': 'quan-he',
  'học hành|học giỏi|tính cách con|tương lai con|nghề cho con|con học|con sau này': 've-con',
};
const TT_HY = new Set(['Thai', 'Thiên Hỷ', 'Hồng Loan', 'Long Trì', 'Phượng Các']);
const TT_CAT = new Set(['Thiên Lương', 'Thiên Đồng', 'Thiên Phủ', 'Tả Phụ', 'Hữu Bật', 'Ân Quang', 'Thiên Quý']);
const TT_HUNG = new Set([
  'Cô Thần', 'Quả Tú', 'Tuần', 'Triệt', 'Tuần+Triệt', 'Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp', 'Thiên Hình',
]);
const VONG_TRANG_SINH = ['Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan', 'Đế Vượng', 'Suy', 'Bệnh', 'Tử', 'Mộ', 'Tuyệt', 'Thai', 'Dưỡng'];

// Số con theo sao vòng Tràng Sinh ở Tử Tức — ĐỌC THẲNG `public/cach_cuc_all.json`
// (Tử Vi Đẩu Số Tân Biên, cùng file `vanHanCombos` nạp), KHÔNG chép số sang đây:
// hai bản số là hai bản trôi khỏi nhau. Chỉ lấy mục CUNG Tử Tức có MỘT sao của vòng.
// Dùng cho CẢ số con (Tử Tức) lẫn số anh chị em (Huynh Đệ) — sách có bảng vòng
// Tràng Sinh cho cả hai cung.
const _vongCache = new Map<string, Map<string, { tomTat: string; dieuKien: string }>>();
function bangVongTS(cung: string): Map<string, { tomTat: string; dieuKien: string }> {
  const c = _vongCache.get(cung);
  if (c) return c;
  const m = new Map<string, { tomTat: string; dieuKien: string }>();
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'public', 'cach_cuc_all.json'), 'utf-8')) as Palace[];
    // Chỉ mục mà MỌI sao đều thuộc vòng Tràng Sinh ("Nhật, Nguyệt, Thai" là cách
    // khác, không phải câu số con). Lượt 1 lấy mục MỘT sao; lượt 2 để mục nhiều sao
    // ("Quan Đới, Lâm Quan", "Mộ (Thai, Dưỡng)") lấp sao còn thiếu — nếu làm một
    // lượt thì "Mộ (Thai, Dưỡng)" đứng trước sẽ chiếm chỗ của Thai và Dưỡng.
    const muc = raw.filter((x) => x?.cung === cung && Array.isArray(x.sao) && x.sao.every((t: string) => VONG_TRANG_SINH.includes(t)));
    for (const luot of [1, 2]) {
      for (const x of muc) {
        if ((luot === 1) !== (x.sao.length === 1)) continue;
        for (const sao of x.sao as string[]) {
          if (!m.has(sao)) m.set(sao, { tomTat: String(x.tomTat || ''), dieuKien: String(x.dieuKien || '') });
        }
      }
    }
  } catch (e) {
    console.error(`[luan-chu-de] không đọc được cach_cuc_all.json cho bảng vòng Tràng Sinh ${cung}:`, e);
  }
  _vongCache.set(cung, m);
  return m;
}
// Câu sách có cụm tật bệnh ("một con mù lòa", "có người mang tật") — CẮT trước
// khi đưa cho model: dặn "đừng nhắc" mà vẫn đưa nguyên câu là đặt đúng thứ bị cấm
// trước mặt nó. Cắt xong không còn số → coi như sách không ghi số.
const CUM_TAT = /\s*(bị\s+)?(mù lòa|mang tật)(\s+hay\s+(mù lòa|mang tật))?/gi;
const catTat = (t: string) => t.replace(CUM_TAT, '').replace(/\s+\./g, '.');
// Regex DÒ riêng, KHÔNG cờ /g: `.test()` trên regex /g nhớ lastIndex giữa các lần gọi
// nên lần sau có thể trượt IM LẶNG.
const CO_TAT = /mù lòa|mang tật/i;

function dongSoCon(p: Palace): string {
  const sao = starsOf(p).map((s: Sao) => s.ten).find((t: string) => VONG_TRANG_SINH.includes(t));
  if (!sao) return '';
  const goc = bangVongTS('Tử Tức').get(sao);
  const muc = goc && { ...goc, tomTat: catTat(goc.tomTat) };
  if (!muc) return `Số con (vòng Tràng Sinh ở Tử Tức là ${sao}): sách Tân Biên KHÔNG ghi số cho sao này — KHÔNG tự đặt số, nói theo chính tinh và sao hỷ/hung.`;
  const tt = ['Tuần', 'Triệt', 'Tuần+Triệt'].some((t) => coSao(p, t));
  const dk = muc.dieuKien ? ` (điều kiện trong sách: ${muc.dieuKien}; Tử Tức ${tt ? 'CÓ' : 'KHÔNG có'} Tuần/Triệt)` : '';
  const coSo = /\b(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|\d+)\s+(con|lần)/i.test(muc.tomTat);
  const cach = coSo
    ? 'Nói SỐ CON cụ thể theo câu này, lấy số NUÔI ĐƯỢC'
    : 'Câu sách KHÔNG ghi số — nói đúng ý câu này, KHÔNG tự đặt số';
  return `Số con theo sách (vòng Tràng Sinh ở Tử Tức là ${sao}): "${muc.tomTat}"${dk}. ${cach}; KHÔNG nhắc con mất, sẩy thai, tật bệnh, giới tính con.`;
}

const CON_CAI: ChuDe = {
  id: 'con-cai',
  ten: 'CON CÁI',
  cung: 'Tử Tức',
  nghia: 'chuyện con cái',
  yDinh: matchers(Y_DINH_TU_TUC),
  tenNhomSao: 'sao con cái',
  loaiSao: (s) => {
    if (s.hoa === 'Kỵ') return 'hung';
    if (s.hoa === 'Lộc' || s.hoa === 'Khoa') return 'cát';
    if (TT_HY.has(s.ten)) return 'hỷ';
    if (TT_CAT.has(s.ten)) return 'cát';
    if (s.ten === 'Thái Âm' && /Miếu|Vượng/.test(s.brightness || '')) return 'cát';
    if (TT_HUNG.has(s.ten)) return 'hung';
    return null;
  },
  // C5.4: nền Tử Tức ĐỘNG = Sát Phá Tham (tọa/mượn) / Kỵ / Không Kiếp / Thiên Hình;
  // ÊM = Tử Phủ Đồng Lương.
  nen: (palaces, i) => {
    const chinh = chinhTinhXet(palaces, i);
    return {
      dong: uniq([
        ...chinh.filter((s: Sao) => SAT_PHA_THAM.has(s.ten)).map((s: Sao) => s.ten),
        ...starsOf(palaces[i]).filter((s: Sao) => s.hoa === 'Kỵ').map(nhan),
        ...starsOf(palaces[i]).filter((s: Sao) => ['Địa Không', 'Địa Kiếp', 'Thiên Hình'].includes(s.ten)).map((s: Sao) => s.ten),
      ]),
      on: chinh.filter((s: Sao) => ['Tử Vi', 'Thiên Phủ', 'Thiên Đồng', 'Thiên Lương'].includes(s.ten)).map((s: Sao) => s.ten),
      tenOn: 'Tử Phủ Đồng Lương',
    };
  },
  // C5.4: tiểu hạn có sao HỶ hoặc SÁT TINH (tọa thủ).
  hanDong: (palaces, h) => uniq(starsOf(palaces[h]).filter((s: Sao) => TT_HY.has(s.ten) || SAT_TINH.has(s.ten)).map((s: Sao) => s.ten)),
  tenHanDong: 'sao hỷ/sát tinh',
  bienDong: 'chuyện con cái biến động (tin vui sinh nở, hoặc lo lắng vì con)',
  luatBienDong: 'Tử Tức gốc có yếu tố động (Sát Phá Tham/Kỵ/Không Kiếp/Thiên Hình) + tiểu hạn có sao hỷ hoặc sát tinh',
  namTot: { ten: 'Năm có tin vui con cái', thieu: 'Thai/Thiên Hỷ/Hồng Loan/Long Phượng', hop: (s) => TT_HY.has(s.ten) },
  dongRieng: ({ palaces, i, yd }) => {
    const cung = ['Tử Tức (chính)', 'tam phương: Phụ Mẫu, Nô Bộc, Điền Trạch (xung)', 'Phúc Đức (phúc phần con cháu)'];
    if (yd.has('so-con') || yd.has('quyet-dinh')) cung.push('Phu Thê (đời sống vợ chồng, sinh nở)');
    const L = [`Cung đọc: ${cung.join('; ')}. Trọng số tọa thủ > xung chiếu > tam hợp.`];
    L.push('@NEN');
    if (yd.has('so-con') || yd.has('quan-he') || !yd.size) { const sc = dongSoCon(palaces[i]); if (sc) L.push(sc); }
    L.push('@NAM');
    if (yd.has('quyet-dinh')) {
      L.push('Hỏi CÓ NÊN SINH / SINH NĂM NÀO: trả lời ngắn theo năm có tin vui (nếu có danh sách), rồi gọi goi_y_cong_cu với tool_id "sinh-con" để chọn năm hợp tuổi cha mẹ.');
    }
    if (yd.has('ve-con')) {
      L.push('Hỏi VỀ CHÍNH ĐỨA CON (học hành, tính cách, nghề): lá số cha mẹ chỉ nói DUYÊN với con, không nói được về đứa trẻ — trả lời ngắn phần duyên, rồi gọi goi_y_cong_cu với tool_id "day-con" (tính cách, cách dạy) hoặc "huong-nghiep-tre" (nghề) để xem bằng NGÀY SINH của con.');
    }
    L.push('AN TOÀN: KHÔNG phán vô sinh, sảy thai, con mất, con tật bệnh; hỏi hiếm muộn thì nói duyên muộn và khuyên đi khám; KHÔNG đoán giới tính thai nhi / sinh trai hay gái.');
    return L;
  },
  tinhChat: {
    'Tử Vi': 'có chí, có vị thế', 'Thiên Phủ': 'hiền, giữ nếp', 'Vũ Khúc': 'cứng rắn, thực tế',
    'Thất Sát': 'cá tính mạnh, khó dạy', 'Phá Quân': 'bướng, hay đổi ý', 'Tham Lang': 'lanh, ham chơi',
    'Cự Môn': 'hay cãi, lý lẽ', 'Thiên Cơ': 'nhanh nhạy', 'Thiên Lương': 'hiền, có hiếu',
    'Thái Dương': 'sôi nổi, hướng ngoại', 'Thái Âm': 'dịu, tình cảm', 'Liêm Trinh': 'nguyên tắc, cứng đầu',
    'Thiên Đồng': 'hiền, dễ nuôi', 'Thiên Tướng': 'tử tế, biết điều',
  },
  tenTinhChat: 'Tính cách con',
  chiDanTinhChat: '',
  duoiTinhChat: 'Sát Phá Tham ở Tử Tức chủ cha mẹ – con cái va chạm, con khó dạy; Tử Phủ Đồng Lương chủ êm ấm.',
};

// ── GIA ĐẠO: CHA MẸ · ANH EM · HỌ HÀNG (G1–G7) ────────────────
// Ba chủ đề con cùng một luật năm (G5): cung gốc ĐỘNG (Sát Phá Tham tọa/mượn,
// Hóa Kỵ, Không Kiếp, Thiên Hình) + tiểu hạn có sát tinh hoặc sao TANG CHẾ ⇒ CAO.
const TANG_CHE = new Set(['Tang Môn', 'Bạch Hổ', 'Thiên Khốc', 'Thiên Hư']);
const gdNen = (palaces: Palace[], i: number) => {
  const chinh = chinhTinhXet(palaces, i);
  return {
    dong: uniq([
      ...chinh.filter((s: Sao) => SAT_PHA_THAM.has(s.ten)).map((s: Sao) => s.ten),
      ...starsOf(palaces[i]).filter((s: Sao) => s.hoa === 'Kỵ').map(nhan),
      ...starsOf(palaces[i]).filter((s: Sao) => ['Địa Không', 'Địa Kiếp', 'Thiên Hình'].includes(s.ten)).map((s: Sao) => s.ten),
    ]),
    on: chinh.filter((s: Sao) => ['Tử Vi', 'Thiên Phủ', 'Thiên Đồng', 'Thiên Lương'].includes(s.ten)).map((s: Sao) => s.ten),
    tenOn: 'Tử Phủ Đồng Lương',
  };
};
const gdHanDong = (palaces: Palace[], h: number) =>
  uniq(starsOf(palaces[h]).filter((s: Sao) => SAT_TINH.has(s.ten) || TANG_CHE.has(s.ten)).map((s: Sao) => s.ten));
const GD_QUYET_DINH = (cung: string) =>
  `Kiểu hỏi QUYẾT ĐỊNH: câu đầu trả lời có / không / chưa. Căn cứ theo thứ tự: nền ${cung} gốc (động hay êm) → năm nay hạn có chạm ${cung} không, gặp sát tinh/tang chế hay cát tinh.`;
const GD_LUAT = 'gốc có yếu tố động (Sát Phá Tham/Kỵ/Không Kiếp/Thiên Hình) + tiểu hạn có sát tinh hoặc sao tang chế';
const HUNG_CHUNG = ['Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp', 'Thiên Hình'];
const loaiTheo = (cat: string[], hung: string[], nhatNguyetMieu = false) => (s: Sao): LoaiSao | null => {
  if (s.hoa === 'Kỵ') return 'hung';
  if (s.hoa === 'Lộc' || s.hoa === 'Khoa') return 'cát';
  if (nhatNguyetMieu && (s.ten === 'Thái Dương' || s.ten === 'Thái Âm')) {
    return /Miếu|Vượng/.test(s.brightness || '') ? 'cát' : /Hãm/.test(s.brightness || '') ? 'hung' : null;
  }
  if (cat.includes(s.ten)) return 'cát';
  if (hung.includes(s.ten)) return 'hung';
  return null;
};
// Nhật chủ cha, Nguyệt chủ mẹ — đọc ở BẤT KỲ cung nào (G2, Henry chốt).
function dongNhatNguyet(palaces: Palace[]): string {
  const tim = (ten: string) => {
    for (const p of palaces) {
      const s = starsOf(p).find((x: Sao) => x.ten === ten);
      if (s) return `cung ${p.cungName} (${p.diaChi}), ${s.brightness || 'không rõ độ sáng'}${s.hoa ? `, Hóa ${s.hoa}` : ''}`;
    }
    return 'không thấy trong lá số';
  };
  return `Thái Dương (chủ CHA): ${tim('Thái Dương')}; Thái Âm (chủ MẸ): ${tim('Thái Âm')}. Miếu/vượng = cha/mẹ vững; hãm = cha/mẹ vất vả hoặc sớm xa cách.`;
}
const Y_DINH_CHA_ME: Record<string, string> = {
  'có nên|nên về|nên ở với|nên sống': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'sức khỏe|ốm đau|bệnh tật|tuổi thọ|sống lâu': 'suc-khoe',
  'nhờ được|được nhờ|thừa hưởng|của cải|tài sản': 'nho',
  'hợp không|bất hòa|xung khắc|mâu thuẫn|cãi nhau': 'quan-he',
};
const CHA_ME: ChuDe = {
  id: 'cha-me',
  ten: 'CHA MẸ',
  cung: 'Phụ Mẫu',
  nghia: 'chuyện cha mẹ',
  yDinh: matchers(Y_DINH_CHA_ME),
  tenNhomSao: 'sao về cha mẹ',
  loaiSao: loaiTheo(
    ['Tử Vi', 'Thiên Phủ', 'Thiên Lương', 'Tả Phụ', 'Hữu Bật', 'Thiên Khôi', 'Thiên Việt', 'Văn Xương', 'Văn Khúc'],
    [...HUNG_CHUNG, 'Tuần', 'Triệt', 'Tuần+Triệt'],
    true,
  ),
  nen: gdNen,
  hanDong: gdHanDong,
  tenHanDong: 'sát tinh/tang chế',
  bienDong: 'chuyện cha mẹ biến động (sức khỏe người lớn, xa cách, lo toan)',
  luatBienDong: `Phụ Mẫu ${GD_LUAT}`,
  dongRieng: ({ palaces, yd }) => [
    'Cung đọc: Phụ Mẫu (chính); tam phương: Nô Bộc, Tử Tức, Tật Ách (xung). Trọng số tọa thủ > xung chiếu > tam hợp.',
    '@NEN',
    dongNhatNguyet(palaces),
    '@NAM',
    ...(yd.has('quyet-dinh') ? [GD_QUYET_DINH('Phụ Mẫu')] : []),
    'AN TOÀN: KHÔNG phán cha mẹ mất hay năm nào mất; gặp sao tang chế chỉ nói năm cần lo sức khỏe người lớn trong nhà.',
  ],
  tinhChat: {},
  tenTinhChat: '',
  chiDanTinhChat: '',
  duoiTinhChat: '',
};

const Y_DINH_ANH_EM: Record<string, string> = {
  'có nên|nên góp vốn|nên chia|nên làm chung': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'mấy anh em|bao nhiêu anh|số anh em|anh chị em ruột|con một': 'so-anh-em',
  'tranh chấp|chia tài sản|chia gia tài|góp vốn|làm chung': 'tai-san',
  'hợp không|bất hòa|xung khắc|mâu thuẫn|nhờ được|giúp đỡ': 'quan-he',
};
function dongSoAnhEm(p: Palace): string {
  const sao = starsOf(p).map((s: Sao) => s.ten).find((t: string) => VONG_TRANG_SINH.includes(t));
  if (!sao) return '';
  const goc = bangVongTS('Huynh Đệ').get(sao);
  const muc = goc && { ...goc, tomTat: catTat(goc.tomTat) };
  if (!muc || (CO_TAT.test(goc.tomTat) && !/\b(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|\d+)\s+người/i.test(muc.tomTat))) return `Số anh chị em (vòng Tràng Sinh ở Huynh Đệ là ${sao}): sách Tân Biên KHÔNG ghi số cho sao này — KHÔNG tự đặt số.`;
  const coSo = /\b(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|\d+)\s+người/i.test(muc.tomTat);
  const cach = coSo
    ? 'Nói SỐ ANH CHỊ EM cụ thể theo câu này ("thêm N người" = ngoài đương số)'
    : 'Câu sách KHÔNG ghi số — nói đúng ý câu này, KHÔNG tự đặt số';
  return `Số anh chị em theo sách (vòng Tràng Sinh ở Huynh Đệ là ${sao}): "${muc.tomTat}". ${cach}; KHÔNG nhắc anh chị em mất hay mang tật.`;
}
const ANH_EM: ChuDe = {
  id: 'anh-em',
  ten: 'ANH CHỊ EM',
  cung: 'Huynh Đệ',
  nghia: 'chuyện anh em',
  yDinh: matchers(Y_DINH_ANH_EM),
  tenNhomSao: 'sao về anh em',
  loaiSao: loaiTheo(['Tả Phụ', 'Hữu Bật', 'Thiên Đồng', 'Thiên Lương', 'Thiên Phủ'], HUNG_CHUNG),
  nen: gdNen,
  hanDong: gdHanDong,
  tenHanDong: 'sát tinh/tang chế',
  bienDong: 'chuyện anh em biến động (va chạm, tranh chấp, chia tách)',
  luatBienDong: `Huynh Đệ ${GD_LUAT}`,
  dongRieng: ({ palaces, i, yd }) => {
    const L = ['Cung đọc: Huynh Đệ (chính); tam phương: Điền Trạch, Tật Ách, Nô Bộc (xung). Trọng số tọa thủ > xung chiếu > tam hợp.', '@NEN'];
    if (yd.has('so-anh-em') || !yd.size) { const sa = dongSoAnhEm(palaces[i]); if (sa) L.push(sa); }
    L.push('@NAM');
    if (yd.has('tai-san') || yd.has('quyet-dinh')) {
      L.push('Hỏi TÀI SẢN / GÓP VỐN với anh em: đọc thêm Tài Bạch; câu đầu trả lời có / không / chưa nếu là câu quyết định; nói nguy cơ và cách giữ hòa khí, KHÔNG xúi kiện.');
    }
    L.push('AN TOÀN: KHÔNG nói anh chị em mất hay mang tật.');
    return L;
  },
  tinhChat: {},
  tenTinhChat: '',
  chiDanTinhChat: '',
  duoiTinhChat: '',
};

const Y_DINH_HO_HANG: Record<string, string> = {
  'có nên|nên xây|nên sửa|nên bốc|nên cải táng': 'quyet-dinh',
  'bao giờ|khi nào|năm nào|lúc nào': 'thoi-diem',
  'mồ mả|mộ phần|cải táng|bốc mộ|nhà thờ họ|từ đường': 'mo-ma',
  'phúc đức|phúc phần|phúc ấm|tổ tiên|ông bà': 'phuc',
  'họ hàng giúp|nhờ họ hàng|tranh chấp|bà con|họ hàng ghét': 'quan-he',
};
const HO_HANG: ChuDe = {
  id: 'ho-hang',
  ten: 'HỌ HÀNG / DÒNG HỌ',
  cung: 'Phúc Đức',
  nghia: 'chuyện họ hàng',
  yDinh: matchers(Y_DINH_HO_HANG),
  tenNhomSao: 'sao về dòng họ',
  loaiSao: loaiTheo(['Tử Vi', 'Thiên Phủ', 'Thiên Lương', 'Lộc Tồn'], [...HUNG_CHUNG, 'Tuần', 'Triệt', 'Tuần+Triệt']),
  nen: gdNen,
  hanDong: gdHanDong,
  tenHanDong: 'sát tinh/tang chế',
  bienDong: 'chuyện họ hàng biến động (việc họ, tranh chấp, mồ mả)',
  luatBienDong: `Phúc Đức ${GD_LUAT}`,
  dongRieng: ({ yd }) => [
    'Cung đọc: Phúc Đức (chính — họ hàng, dòng họ, mồ mả, phúc ấm tổ tiên); tam phương: Thiên Di, Phu Thê, Tài Bạch (xung). Trọng số tọa thủ > xung chiếu > tam hợp.',
    '@NEN',
    '@NAM',
    ...(yd.has('quyet-dinh') ? [GD_QUYET_DINH('Phúc Đức')] : []),
  ],
  tinhChat: {},
  tenTinhChat: '',
  chiDanTinhChat: '',
  duoiTinhChat: '',
};

const CHU_DE: Record<string, ChuDe> = {
  'su-nghiep': SU_NGHIEP,
  'tinh-duyen': TINH_DUYEN,
  'tai-chinh': TAI_CHINH,
  'con-cai': CON_CAI,
  'cha-me': CHA_ME,
  'anh-em': ANH_EM,
  'ho-hang': HO_HANG,
};

const CON_TOI = /con (trai |gái )?tôi/;
const yDinhCua = (cd: ChuDe, q: string) => cd.yDinh.filter(([re]) => re.test(q)).map(([, y]) => y);

/**
 * Chủ đề của câu hỏi, hoặc null. Câu trúng NHIỀU cung chính thì phân xử:
 *  1. hỏi về ĐỨA CON ("con tôi…") hoặc có cụm riêng của con cái → con cái — nếu
 *     không, "con trai tôi có nên chuyển việc" sẽ đọc Quan Lộc của CHA MẸ;
 *  2. hỏi về người phối ngẫu ("vợ tôi"/"chồng tôi", không phải "vợ chồng tôi") → tình duyên;
 *  3. chủ đề khớp NHIỀU kiểu hỏi riêng hơn thắng; hòa → null, để `focusHint` cũ
 *     nêu đủ các cung thay vì chọn bừa một.
 */
export function chuDeCuaCauHoi(question: string): string | null {
  const hit = primaryPalacesStrict(question);
  const ds = Object.values(CHU_DE).filter((cd) => hit.has(cd.cung));
  if (ds.length <= 1) return ds[0]?.id ?? null;
  const q = norm(question);
  if (ds.includes(CON_CAI) && (CON_TOI.test(q) || yDinhCua(CON_CAI, q).some((y) => y === 'so-con' || y === 'quyet-dinh'))) return CON_CAI.id;
  if (ds.includes(TINH_DUYEN) && /(vợ|chồng) tôi/.test(q) && !/vợ chồng tôi/.test(q)) return TINH_DUYEN.id;
  const diem = ds.map((cd) => ({ id: cd.id, n: new Set(yDinhCua(cd, q)).size })).sort((a, b) => b.n - a.n);
  return diem[0].n > 0 && diem[0].n > diem[1].n ? diem[0].id : null;
}

/**
 * Khối chủ đề nhét vào CUỐI tin nhắn người dùng (thay `focusHint`). Trả '' nếu
 * câu hỏi không thuộc chủ đề nào đã dựng — lúc đó caller dùng `focusHint` cũ.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function khoiChuDe(question: string, ls: any, gioi: 'nam' | 'nu' | null = null): string {
  const id = chuDeCuaCauHoi(question);
  const cd = id ? CHU_DE[id] : null;
  if (!cd || !ls?.palaces) return '';
  const palaces = ls.palaces;
  const i = idxCung(palaces, cd.cung);
  if (i < 0) return '';
  const q = norm(question);
  const yd = new Set<string>();
  for (const [re, y] of cd.yDinh) if (re.test(q)) yd.add(y);
  // "con trai tôi có nên chuyển việc" — hỏi việc/tiền/tình CỦA ĐỨA CON: lá số cha mẹ
  // không trả lời được, phải chỉ sang tool xem bằng ngày sinh của con.
  if (cd === CON_CAI && CON_TOI.test(q) && [...relevantPalacesStrict(question)].some((c) => c !== 'Tử Tức' && c !== 'Mệnh')) yd.add('ve-con');

  const L: string[] = [`(Trọng tâm: ${cd.ten}.`];
  for (const d of cd.dongRieng({ palaces, i, yd, gioi })) {
    if (d === '@NEN') {
      L.push(`${cd.cung} gốc (${palaces[i].diaChi}): nền ${nhanNen(cd, palaces, i).nhan}; ${cd.tenNhomSao}: ${fmtSao(cd, palaces[i])}.`);
    } else if (d === '@NAM') {
      if (/năm|tháng/.test(q)) {
        L.push(`Hỏi theo NĂM/THÁNG: đọc cung hạn QUA ý nghĩa ${cd.nghia}; KHÔNG kể nghĩa gốc của cung hạn (nhà đất, con cái…) nếu không nối được sang ${cd.nghia}.`);
      }
    } else L.push(d);
  }
  if (yd.has('ban-chat')) { const tc = tinhChat(cd, palaces, i); if (tc) L.push(tc); }
  if (yd.has('thoi-diem')) { const qn = quetNam(cd, ls, i, currentNamXem()); if (qn) L.push(qn); }
  return L.join('\n') + ')';
}

/**
 * Lăng kính chủ đề cho kết quả `tra_tieu_van`: hạn năm có chạm cung chính gốc
 * không, yếu tố động / sao chủ đề ở hai cung hạn, và mức biến động theo luật
 * Henry chốt cho chủ đề đó (cung chính gốc có yếu tố động + tiểu hạn có yếu tố
 * của chủ đề ⇒ CAO).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lanKinhNam(chuDe: string | null, ls: any, tv: any): string {
  const cd = chuDe ? CHU_DE[chuDe] : null;
  const palaces = ls?.palaces || [];
  const c = cd ? idxCung(palaces, cd.cung) : -1;
  if (!cd || c < 0 || !tv) return '';
  const nen = nhanNen(cd, palaces, c);
  const out: string[] = [`── LĂNG KÍNH ${cd.ten} năm ${tv.nam} (server tính) ──`];
  out.push(`- ${cd.cung} gốc: nền ${nen.nhan}.`);
  let dongTieuHan: string[] = [];
  let coCham = false;
  for (const [tang, ten] of [['Tiểu hạn', tv.tieuHanCung], ['Lưu niên', tv.luuNienCung]] as const) {
    const h = idxCung(palaces, ten);
    if (h < 0) continue;
    const cham = cachCham(h, c, cd.cung);
    if (cham) coCham = true;
    const dong = cd.hanDong(palaces, h);
    if (tang === 'Tiểu hạn') dongTieuHan = dong;
    out.push(`- ${tang} ${ten}: ${cham ? `CHẠM ${cd.cung} (${cham})` : `không chạm ${cd.cung}`}; ${cd.tenHanDong}: ${dong.length ? dong.join(', ') : 'không'}; ${fmtSao(cd, palaces[h])}.`);
  }
  const muc = nen.dong.length && dongTieuHan.length ? 'CAO' : nen.dong.length || dongTieuHan.length ? 'VỪA' : 'THẤP';
  out.push(`- Khả năng ${cd.bienDong}: ${muc} — luật: ${cd.luatBienDong}.`);
  // Luật mức biến động KHÔNG đòi hạn chạm cung chính (nền gốc + tiểu hạn), nên
  // CAO mà không chạm là trường hợp có thật — đừng bảo "không phải tâm điểm".
  out.push(coCham
    ? `- Hai tầng hạn vẫn gọi tên, nhưng LUẬN QUA ý nghĩa ${cd.nghia}.`
    : muc === 'CAO'
      ? `- Không tầng nào chạm ${cd.cung}, nhưng mức biến động CAO do nền gốc + sao ở tiểu hạn ⇒ nói rõ ${cd.nghia} năm nay có sóng, song không đến từ chính cung ${cd.cung}; vẫn gọi tên hai cung hạn nhưng chỉ nói phần ảnh hưởng tới ${cd.nghia}.`
      : `- Không tầng nào chạm ${cd.cung} ⇒ nói rõ năm nay ${cd.nghia} KHÔNG phải tâm điểm biến động, chủ yếu đi theo nền gốc; vẫn gọi tên hai cung hạn nhưng chỉ nói phần ảnh hưởng tới ${cd.nghia}.`);
  return out.join('\n');
}
