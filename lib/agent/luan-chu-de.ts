// lib/agent/luan-chu-de.ts
// ============================================================
// KỸ NĂNG LUẬN THEO CHỦ ĐỀ — hỏi chuyện gì thì nhìn cung nào, sao nào, đọc
// tầng thời gian ra sao. Nội dung cổ pháp do Henry duyệt từng mục (2026-09-25):
// SỰ NGHIỆP (S1–S7), TÌNH DUYÊN (T1–T7), TÀI CHÍNH (F1–F7). Thêm chủ đề = thêm MỘT `ChuDe` vào
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

import { relevantPalacesStrict } from '@/lib/agent/prompts';
import { currentNamXem } from '@/lib/engine/namxem';
import { chuanHoaDauThanh } from '@/lib/vn-text';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Palace = any;
type Sao = Palace;

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
  loaiSao: (s: Sao) => 'cát' | 'hung' | 'đào hoa' | null;
  // Nền cung chính: yếu tố ĐỘNG + yếu tố ỔN (đã xét mượn chính tinh).
  nen: (palaces: Palace[], i: number) => { dong: string[]; on: string[]; tenOn: string };
  // Yếu tố ở TIỂU HẠN dùng cho luật mức biến động (Henry chốt từng chủ đề).
  hanDong: (palaces: Palace[], h: number) => string[];
  tenHanDong: string;
  bienDong: string; // "công việc biến động (đổi chỗ, đi xa, đi nhiều)"
  luatBienDong: string;
  // Năm "tốt" để quét khi hỏi bao giờ: sao cần có trong chùm tam phương cung hạn.
  namTot: { ten: string; thieu: string; hop: (s: Sao) => boolean };
  // Các dòng riêng của chủ đề (cung đọc theo kiểu hỏi, luật riêng…).
  dongRieng: (x: { palaces: Palace[]; i: number; yd: Set<string>; gioi: 'nam' | 'nu' | null }) => string[];
  tinhChat: Record<string, string>;
  tenTinhChat: string; // "Tính chất việc hợp"
  chiDanTinhChat: string; // chen giữa tên và danh sách
  duoiTinhChat: string;
}

function fmtSao(cd: ChuDe, p: Palace): string {
  const nhom: Record<string, string[]> = { cát: [], hung: [], 'đào hoa': [] };
  for (const s of starsOf(p)) {
    const l = cd.loaiSao(s);
    if (l) nhom[l].push(nhan(s));
  }
  const parts = (['cát', 'hung', 'đào hoa'] as const)
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
      const tot = uniq([h, xung(h), ...tamHop(h)].flatMap((j) => starsOf(palaces[j]).filter(cd.namTot.hop).map(nhan)));
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
    ? `${cd.namTot.ten} (${khoang}, server đã quét — CHỈ nêu các năm này, không tự suy thêm):\n` + hits.map((h) => '  ' + h).join('\n')
    : `${soNam} năm tới (${khoang}) KHÔNG có năm nào hạn chạm ${cd.cung} kèm ${cd.namTot.thieu} — nói thẳng, đừng bịa năm.`;
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
const tdLoai = (s: Sao): 'cát' | 'hung' | 'đào hoa' | null => {
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

const CHU_DE: Record<string, ChuDe> = { 'su-nghiep': SU_NGHIEP, 'tinh-duyen': TINH_DUYEN, 'tai-chinh': TAI_CHINH };

/**
 * Chủ đề của câu hỏi, hoặc null. Câu trúng CẢ HAI cung chính (vd "vợ chồng cùng
 * mở công ty") → null, để `focusHint` cũ nêu đủ cả hai cung thay vì chọn bừa một.
 */
export function chuDeCuaCauHoi(question: string): string | null {
  const hit = relevantPalacesStrict(question);
  const ids = Object.values(CHU_DE).filter((cd) => hit.has(cd.cung)).map((cd) => cd.id);
  return ids.length === 1 ? ids[0] : null;
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
  if (yd.has('thoi-diem')) L.push(quetNam(cd, ls, i, currentNamXem()));
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
