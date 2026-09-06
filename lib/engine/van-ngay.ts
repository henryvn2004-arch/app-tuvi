// lib/engine/van-ngay.ts
// ============================================================
// VẬN NGÀY — gom TOÀN BỘ số liệu một ngày về MỘT nguồn.
//
// Trước đây thẻ "Vận hôm nay" ở trang /app tự tính bằng
// `public/tools-shared/hoang-dao.js` và chỉ lấy được 3 thứ: can chi ngày,
// hành của thiên can, 4 giờ hoàng đạo. Trong khi `tuvi-engine/src/ngay-tot`
// (đã có test, đã chạy cho /ngay-tot/* và tool `xem_ngay_tot`) tính sẵn 12
// trực · 28 tú · sao hoàng/hắc đạo · ngày kỵ cổ truyền · điểm từng loại việc.
// File này KHÔNG tính lại gì — nó chỉ GỌI engine đó rồi bổ sung 3 bảng tra
// mà engine chưa có (xung tuổi · phương vị cát thần · màu theo hành ngày).
//
// ⚠️ Vì sao là module SERVER chứ không phải file trong `public/`: engine
// ngày-tốt là TypeScript đã biên dịch (`tuvi-engine/dist`), 664 dòng luật.
// Port sang trình duyệt = bản thứ hai của cùng bộ luật, và hai bản sẽ trôi
// khỏi nhau (bài học `tools-shared` + giá Lượng). Trang gọi qua
// `/api/van-ngay`, kết quả cache theo NGÀY nên gần như luôn ăn CDN.
// ============================================================

import {
  computeNgayTot,
  scoreAllActivities,
  ACTIVITY_META,
  type NgayTotInfo,
  type ActivityScore,
  type ActivityKey,
} from '../../tuvi-engine/dist/ngay-tot/index.js';
import { tinhNguyetHan, tinhNhatHan } from '../../tuvi-engine/dist/van-han/index.js';
import { solarToLunar } from '../../tuvi-engine/dist/lunar/convert.js';

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CAN_HANH = ['Mộc', 'Mộc', 'Hỏa', 'Hỏa', 'Thổ', 'Thổ', 'Kim', 'Kim', 'Thủy', 'Thủy'];

// ─── Màu theo NGŨ HÀNH ────────────────────────────────────────
// Quy ước ngũ sắc cổ điển. CỐ Ý gọi là "màu hợp hành ngày" chứ KHÔNG phải
// "màu may mắn của bạn": bảng này chỉ đọc hành của THIÊN CAN NGÀY — nó giống
// nhau với mọi người trong cùng một ngày. Muốn màu riêng từng người thì phải
// so hành ngày với nạp âm mệnh của họ (xem `mauCaNhan` ở khối cá nhân).
const HANH_MAU: Record<string, string[]> = {
  Mộc: ['xanh lá', 'xanh ngọc'],
  Hỏa: ['đỏ', 'hồng', 'cam'],
  Thổ: ['vàng đất', 'nâu'],
  Kim: ['trắng', 'ghi bạc', 'ánh kim'],
  Thủy: ['xanh dương', 'đen'],
};
// Ngũ hành tương sinh: Mộc→Hỏa→Thổ→Kim→Thủy→Mộc
const HANH_SINH: Record<string, string> = {
  Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc',
};
// Ngũ hành tương khắc: Mộc→Thổ→Thủy→Hỏa→Kim→Mộc
const HANH_KHAC: Record<string, string> = {
  Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc',
};
// Hành nào SINH ra hành X (đảo HANH_SINH) — hành "được nuôi" bởi nó.
const HANH_DUOC_SINH: Record<string, string> = Object.fromEntries(
  Object.entries(HANH_SINH).map(([a, b]) => [b, a]),
);

// ─── Phương vị cát thần theo THIÊN CAN NGÀY ───────────────────
// Hai bảng dưới là ca quyết cổ, chép đúng nguyên văn để đời sau kiểm được —
// KHÔNG suy diễn. Cả hai đều tra theo can NGÀY (không phải can năm).
//
// Hỷ thần: "Giáp Kỷ tại Cấn, Ất Canh tại Càn, Bính Tân tại Khôn,
//           Đinh Nhâm tại Ly, Mậu Quý tại Tốn."
const HY_THAN: string[] = [
  'Đông Bắc', // Giáp — Cấn
  'Tây Bắc',  // Ất   — Càn
  'Tây Nam',  // Bính — Khôn
  'Nam',      // Đinh — Ly
  'Đông Nam', // Mậu  — Tốn
  'Đông Bắc', // Kỷ   — Cấn
  'Tây Bắc',  // Canh — Càn
  'Tây Nam',  // Tân  — Khôn
  'Nam',      // Nhâm — Ly
  'Đông Nam', // Quý  — Tốn
];
// Tài thần: "Giáp Ất Đông Bắc thị Tài thần / Bính Đinh hướng tại Tây Nam tầm /
//            Mậu Kỷ chính Bắc tọa phương vị / Canh Tân chính Đông khứ an thân /
//            Nhâm Quý nguyên lai chính Nam tọa."
// ⚠️ Có một dị bản (Giáp-Cấn, Ất-Khôn, Bính Đinh-Đoài...) lưu hành song song.
// Chọn bản ca quyết trên vì đây là bản các bộ lịch vạn niên phổ thông dùng.
const TAI_THAN: string[] = [
  'Đông Bắc', 'Đông Bắc', // Giáp, Ất
  'Tây Nam', 'Tây Nam',   // Bính, Đinh
  'Bắc', 'Bắc',           // Mậu, Kỷ
  'Đông', 'Đông',         // Canh, Tân
  'Nam', 'Nam',           // Nhâm, Quý
];

// ─── Lục xung địa chi ─────────────────────────────────────────
// Tý–Ngọ · Sửu–Mùi · Dần–Thân · Mão–Dậu · Thìn–Tuất · Tỵ–Hợi (chi cách nhau 6).
// CỐ Ý chỉ nêu xung ở tầng CHI ("tuổi Dậu"). Nhiều lịch còn lọc tiếp theo
// thiên can ra 2–3 tuổi cụ thể, nhưng luật lọc đó có nhiều dị bản — nêu tên
// một tuổi cụ thể mà sai thì tệ hơn hẳn nêu đúng ở mức chi.
function chiXung(chiIdx: number): number {
  return (chiIdx + 6) % 12;
}

/** Các năm sinh (dương lịch) mang địa chi này, trong khoảng còn sống thực tế. */
function namSinhTheoChi(chiIdx: number, nowYear: number): number[] {
  // Năm 1984 = Giáp Tý → chi index của năm Y = (Y - 1984) mod 12.
  const out: number[] = [];
  for (let y = nowYear - 84; y <= nowYear; y++) {
    if ((((y - 1984) % 12) + 12) % 12 === chiIdx) out.push(y);
  }
  return out.slice(-7);
}

// ─── Giờ hoàng đạo: gắn VIỆC NÊN LÀM ──────────────────────────
// Giờ tốt mà không nói để làm gì thì người đọc không dùng được. Ý nghĩa lấy
// theo tính chất của chính vị thần đóng giờ đó (cùng hệ 12 thần với engine).
const SAO_GIO_VIEC: Record<string, string> = {
  'Thanh Long': 'ký kết, cầu tài, việc trọng đại',
  'Minh Đường': 'gặp gỡ, nhờ vả, xin ý kiến',
  'Kim Quỹ': 'thu tiền, chốt đơn, việc tiền bạc',
  'Thiên Đức': 'cầu phúc, hòa giải, việc gia đạo',
  'Ngọc Đường': 'thi cử, phỏng vấn, ra mắt',
  'Tư Mệnh': 'khởi sự, xuất hành, việc lâu dài',
};

export interface VanNgayGio {
  chi: string;
  range: string;
  sao: string;
  hoangDao: boolean;
  viec?: string;
}

export interface VanNgayCaNhan {
  cungNhatHan: string;
  diaChiNhatHan: string;
  chinhTinh: string[];
  cungNguyetHan: string;
  tuoi: number;
  /** Quan hệ hành ngày ↔ nạp âm mệnh — 'sinh' | 'duoc-sinh' | 'khac' | 'bi-khac' | 'hoa' */
  quanHeHanh: 'sinh' | 'duoc-sinh' | 'khac' | 'bi-khac' | 'hoa' | null;
  napAmHanh: string | null;
  mauCaNhan: string[];
  /** Ngày có xung với chi năm sinh của chính người này không. */
  bixung: boolean;
  /**
   * Can chi NĂM SINH ("Mậu Dần"). Trang dùng để lưu kèm lượt đăng ký nhận nhắc,
   * nhờ đó kênh gửi biết ngày nào xung tuổi người này mà không phải lập lại lá
   * số cho từng người. CỐ Ý lấy từ đây chứ không để trang tự suy từ năm sinh:
   * quy đổi năm → can chi là cổ pháp, có bản thứ hai ở client là có ngày hai
   * bản trôi khỏi nhau.
   */
  canChiNam: string;
}

export interface VanNgayResult {
  ngay: {
    duong: string;          // "4/8/2026"
    am: string;             // "21/6 ÂL"
    thu: string;            // "Thứ Ba"
    canChi: string;         // "Tân Mão"
    canHanh: string;        // "Kim"
  };
  danhGia: {
    tinhChat: 'tốt' | 'xấu' | 'bình';
    nhan: string;           // câu chốt ngắn
  };
  truc: { ten: string; tinhChat: string };
  tu: { ten: string; tinhChat: string };
  saoNgay: { ten: string; yNghia: string; hoangDao: boolean };
  ngayKy: string[];         // Tam Nương / Nguyệt Kỵ / Dương Công
  xung: { chi: string; namSinh: number[] };
  gio: VanNgayGio[];
  gioTot: VanNgayGio[];
  nen: Array<{ ten: string; diem: number; vi: string }>;
  kieng: Array<{ ten: string; diem: number; vi: string }>;
  mau: { hanh: string; list: string[] };
  huong: { hyThan: string; taiThan: string };
  tuan?: VanNgayTuanItem[];
  caNhan?: VanNgayCaNhan;
}

/** Ngày hôm nay theo giờ VN (nguồn duy nhất cho mọi chỗ hiển thị "hôm nay"). */
export function todayVN(): { y: number; m: number; d: number } {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const mm = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (mm) return { y: +mm[1]!, m: +mm[2]!, d: +mm[3]! };
  const t = new Date();
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/**
 * Tháng/năm ÂM LỊCH của HÔM NAY (giờ VN) — mốc cho rail chat quy đổi câu hỏi
 * kiểu "tháng Giêng", "tháng 7 âm lịch": model không có phép đổi ÂM→DƯƠNG
 * (repo không có hàm đó — xem `lunarMonthsFrom`), nhưng biết hôm nay đang ở
 * tháng ÂM nào thì suy được XẤP XỈ tháng dương tương ứng để gọi `tra_nguyet_van`,
 * và tool sẽ tự chốt lại đúng ranh giới tháng âm dù mốc đưa vào hơi lệch.
 */
export function todayVNLunar(): { thangAL: number; namAL: number; isLeap: boolean } {
  const t = todayVN();
  const l = solarToLunar(t.d, t.m, t.y);
  return { thangAL: l.month, namAL: l.year, isLeap: !!l.isLeap };
}

function canIdxOfDay(canChiNgay: string): number {
  const i = CAN.indexOf(canChiNgay.split(' ')[0] || '');
  return i < 0 ? 0 : i;
}

/**
 * Câu chốt cho thẻ. CỐ Ý viết bằng LUẬT (trực + sao ngày + ngày kỵ) chứ không
 * nhờ LLM: thẻ này hiện với mọi người mỗi ngày, một lượt model mỗi lượt xem là
 * chi phí thật, mà thứ cần nói ra chỉ là tổng hợp mấy tín hiệu đã có.
 */
function nhanDanhGia(info: NgayTotInfo): string {
  const ky = [
    info.kyTamNuong ? 'Tam Nương' : '',
    info.kyNguyetKy ? 'Nguyệt Kỵ' : '',
    info.kyDuongCong ? 'Dương Công kỵ nhật' : '',
  ].filter(Boolean);
  if (ky.length) return `Ngày ${ky.join(' + ')} — hoãn việc trọng đại, việc thường vẫn làm bình thường.`;
  if (info.overallTinhChat === 'tốt') {
    return `Trực ${info.truc} · sao ${info.saoNgay} — ngày thuận, nên chốt việc đã ấp ủ.`;
  }
  if (info.overallTinhChat === 'xấu') {
    return `Trực ${info.truc} · sao ${info.saoNgay} — nên giữ nhịp cũ, đừng khởi sự mới.`;
  }
  return `Trực ${info.truc} · sao ${info.saoNgay} — ngày bình, việc nhỏ thuận, việc lớn nên chọn giờ.`;
}

/**
 * 🐞 Bắt được khi ĐỌC output, không phải khi đo: `overallTinhChat` của engine
 * chấm Tam Nương chỉ −2, nên một ngày trực cát + sao hoàng đạo vẫn ra "tốt"
 * dù đang là Tam Nương → thẻ hiện huy hiệu "Ngày tốt" ngay bên trên câu
 * "hoãn việc trọng đại" (4/8/2026 là một ca như vậy). Ngày kỵ cổ truyền là
 * luật KIÊNG KHỞI SỰ, không phải một điểm trừ cộng dồn ⇒ hạ trần xuống "bình".
 *
 * NGUỒN DUY NHẤT của phép hạ trần này — thẻ, dải 7 ngày và tin push đều gọi
 * vào đây, nếu không thì ô thứ nhất của dải sẽ tô màu khác huy hiệu ngay bên
 * trên nó, trong cùng một màn hình.
 */
function tinhChatNgay(info: NgayTotInfo): 'tốt' | 'xấu' | 'bình' {
  return info.overallTinhChat === 'tốt' && (info.kyTamNuong || info.kyNguyetKy || info.kyDuongCong)
    ? 'bình'
    : info.overallTinhChat;
}

/**
 * Tầng NGÀY — deterministic, giống nhau với mọi người, cache được theo ngày.
 */
export function computeVanNgay(dd: number, mm: number, yy: number): VanNgayResult {
  const info = computeNgayTot(dd, mm, yy);
  const canIdx = canIdxOfDay(info.canChiNgay);
  const canHanh = CAN_HANH[canIdx]!;
  const chiIdx = CHI.indexOf(info.chiNgay);
  const xungIdx = chiXung(chiIdx < 0 ? 0 : chiIdx);
  const tinhChat = tinhChatNgay(info);

  const scores = scoreAllActivities(info);
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const pick = (s: ActivityScore, reasons: boolean) => ({
    ten: ACTIVITY_META[s.activity as ActivityKey]?.name || String(s.activity),
    diem: s.score,
    vi: (reasons ? s.reasons[0] : s.warnings[0]) || '',
  });

  const gio: VanNgayGio[] = info.gio.map((g) => ({
    chi: g.chi,
    range: g.range,
    sao: g.sao,
    hoangDao: g.hoangDao,
    viec: SAO_GIO_VIEC[g.sao],
  }));

  // Màu: hành ngày + hành SINH ra nó (được nuôi → thuận). Không đưa hành bị
  // khắc vào danh sách "nên mặc".
  const hanhNuoi = HANH_DUOC_SINH[canHanh];
  const mauList = [...(HANH_MAU[canHanh] || []), ...(hanhNuoi ? HANH_MAU[hanhNuoi] || [] : [])];

  return {
    ngay: {
      duong: `${dd}/${mm}/${yy}`,
      am: `${info.amLich.day}/${info.amLich.month}${info.amLich.isLeap ? ' nhuận' : ''} ÂL`,
      // Engine trả "Thứ ba"; thẻ vốn hiển thị "Thứ Ba" và đường lùi client cũng
      // vậy — chuẩn hoá ở đây để hai đường không hiện hai kiểu chữ.
      thu: info.thuTrongTuan.replace(/\s(\S)/, (_, c: string) => ' ' + c.toUpperCase()),
      canChi: info.canChiNgay,
      canHanh,
    },
    danhGia: { tinhChat, nhan: nhanDanhGia(info) },
    truc: { ten: info.truc, tinhChat: info.trucTinhChat },
    tu: { ten: info.tu, tinhChat: info.tuTinhChat },
    saoNgay: { ten: info.saoNgay, yNghia: info.saoYNghia, hoangDao: info.hoangDao },
    ngayKy: [
      info.kyTamNuong ? 'Tam Nương' : '',
      info.kyNguyetKy ? 'Nguyệt Kỵ' : '',
      info.kyDuongCong ? 'Dương Công kỵ nhật' : '',
    ].filter(Boolean),
    xung: { chi: CHI[xungIdx]!, namSinh: namSinhTheoChi(xungIdx, yy) },
    gio,
    gioTot: gio.filter((g) => g.hoangDao),
    // Ngưỡng 6, KHÔNG phải 7. Đo trên 365 ngày của 2026 bằng chính engine này:
    //   >= 7 → ô "Nên làm" TRỐNG 201/365 ngày (55%)
    //   >= 6 → trống 159/365 (44%), trung bình 2,67 việc/ngày có việc
    //   >= 5 → trống  79/365 (22%)
    // Chọn 6 là một đánh đổi CÓ ĐO: 5 lấp được ô nhiều nhất nhưng gọi một việc
    // 5/10 là "nên làm" thì thẻ đang khuyên quá tay. Vì thế thẻ hiện KÈM ĐIỂM —
    // người đọc tự thấy 6/10 khác 10/10, chứ không phải nhận một danh sách
    // phẳng như nhau.
    // ⚠️ Đổi số này là đổi CẢ tin nhắc hằng ngày lẫn thẻ. `lib/push/daily-message.ts`
    // CỐ Ý lọc lại >= 7 cho riêng nó — xem chú thích ở đó.
    // ⚠️ `app/ngay-tot/lich/[year]/[m]/route.ts` có bản >= 7 RIÊNG (nó gọi thẳng
    // `scoreAllActivities`, không qua đây) và CỐ Ý giữ nguyên: lịch SEO trả lời
    // "ngày nào tốt để cưới hỏi" nên phải giữ bar cao, khác việc thẻ trả lời
    // "hôm nay làm được gì".
    nen: sorted.filter((s) => s.score >= 6).slice(0, 3).map((s) => pick(s, true)),
    // Nên 3 / kiêng 2: thẻ là khối ĐẦU trang chủ, dài thêm một dòng là đẩy
    // danh sách công cụ xuống dưới màn hình đầu tiên trên máy 390px.
    kieng: sorted.filter((s) => s.score <= 3).slice(-2).reverse().map((s) => pick(s, false)),
    mau: { hanh: canHanh, list: mauList },
    huong: { hyThan: HY_THAN[canIdx]!, taiThan: TAI_THAN[canIdx]! },
  };
}

// ─── Dải 7 ngày tới ───────────────────────────────────────────

export interface VanNgayTuanItem {
  d: number;
  m: number;
  y: number;
  iso: string;            // YYYY-MM-DD — client bấm vào là xin đúng ngày này
  thu: string;            // "T4" / "CN"
  canChi: string;
  tinhChat: 'tốt' | 'xấu' | 'bình';
  ngayKy: boolean;
  /** Ngày này xung CHÍNH tuổi người đang xem (chỉ có ở lượt POST kèm lá số). */
  bixung?: boolean;
}

const THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Dải ngày để người ta lướt thấy tuần tới ra sao — móc quay lại rẻ nhất: nhìn
 * một cái là biết hôm nào nên hẹn việc, và bấm vào là xem được ngày đó.
 *
 * CỐ Ý chỉ trả tính chất + can chi, KHÔNG trả trọn `computeVanNgay` cho cả 7
 * ngày: dải này chỉ để tô màu, còn chi tiết thì bấm vào ngày đó mới xin —
 * nhét cả 7 ngày đầy đủ vào payload làm nó phình ~7 lần cho phần gần như
 * không ai đọc.
 *
 * @param chiNamSinh chi năm sinh người xem (để đánh dấu ngày xung tuổi họ)
 */
export function computeTuan(
  dd: number, mm: number, yy: number,
  days = 7,
  chiNamSinh?: string,
): VanNgayTuanItem[] {
  const out: VanNgayTuanItem[] = [];
  for (let i = 0; i < days; i++) {
    // Cộng ngày bằng Date UTC để không dính lệch múi giờ / giờ mùa hè.
    const dt = new Date(Date.UTC(yy, mm - 1, dd));
    dt.setUTCDate(dt.getUTCDate() + i);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const info = computeNgayTot(d, m, y);
    const chiIdx = CHI.indexOf(info.chiNgay);
    const xung = CHI[chiXung(chiIdx < 0 ? 0 : chiIdx)]!;
    out.push({
      d, m, y,
      iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      thu: THU_NGAN[dt.getUTCDay()]!,
      canChi: info.canChiNgay,
      tinhChat: tinhChatNgay(info),
      ngayKy: info.kyTamNuong || info.kyNguyetKy || info.kyDuongCong,
      ...(chiNamSinh ? { bixung: chiNamSinh === xung } : {}),
    });
  }
  return out;
}

// ─── Tầng CÁ NHÂN ─────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

/**
 * Cung nguyệt hạn cho MỘT THÁNG ÂM LỊCH cụ thể (`namAL` = năm ÂM LỊCH dùng để
 * tra `nguyetVanScores` — CÙNG quy ước với `tieuVanScores[].nam`, xem `findTieuVan`).
 * Ưu tiên bảng `nguyetVanScores` pre-computed; fallback tính trực tiếp qua
 * `tinhNguyetHan` khi lá số có mang `thangSinhAL`/`gioSinhIdx`.
 *
 * Tách riêng để DÙNG CHUNG giữa `resolveNhatHanIdx` (đọc lunar theo NGÀY cụ
 * thể) và `resolveNguyetHanSegments` (đọc lunar theo ĐOẠN trong tháng dương)
 * — cả hai chỉ khác nhau ở chỗ lấy `thangAL` từ đâu, phần tra cứu là một.
 */
function nguyetHanIdxForThangAL(
  lasoData: AnyRec,
  namAL: number,
  tieuHanIdx: number,
  thangAL: number,
): number | null {
  const preMonths = (lasoData.nguyetVanScores || []).find((e: AnyRec) => Number(e.nam) === namAL)?.months;
  if (Array.isArray(preMonths) && preMonths[thangAL - 1] != null) {
    return Number(preMonths[thangAL - 1]);
  }
  const thangSinhAL = Number(lasoData.thangSinhAL);
  const gioSinhIdx = lasoData.gioSinhIdx != null ? Number(lasoData.gioSinhIdx) : -1;
  if (!thangSinhAL || gioSinhIdx === -1) return null;
  return ((tinhNguyetHan(tieuHanIdx, thangSinhAL, gioSinhIdx).cach1 + thangAL - 1) % 12 + 12) % 12;
}

/**
 * Tra dòng tiểu vận của MỘT NĂM ÂM LỊCH.
 *
 * 🔴 Vì sao phải là năm ÂM chứ không phải năm dương (vá 2026-08-19): engine đặt
 * `tieuVanScores[].nam = namAL_sinh + tuoiMu - 1` — tức trường `nam` đó là NĂM
 * ÂM, vì tuổi mụ nhảy ở Tết chứ không nhảy ở 1/1. Bản cũ tra bằng năm DƯƠNG của
 * ngày được hỏi nên mọi ngày từ 1/1 tới trước Tết (~37 ngày/năm ≈ 10%) lấy nhầm
 * tiểu hạn của năm ÂM SAU, lệch đúng một cung.
 * Đo được trên lá số Nam 3/6/1998 giờ Sửu: 15/1/2027 dương = ÂL 8/12/2026 →
 * tiểu hạn đúng là Điền Trạch (năm ÂL 2026); bản cũ tra nam=2027 ra Quan Lộc.
 */
function findTieuVan(lasoData: AnyRec, namAL: number): { ok: true; tv: AnyRec } | { ok: false; error: string } {
  const tvs = lasoData?.tieuVanScores;
  if (!Array.isArray(tvs) || !tvs.length) return { ok: false, error: 'Lá số này chưa có dữ liệu tiểu vận theo năm.' };
  const tv = tvs.find((t: AnyRec) => Number(t.nam) === namAL);
  if (!tv) {
    const yrs = tvs.map((t: AnyRec) => Number(t.nam));
    return { ok: false, error: `Năm ${namAL} ngoài phạm vi lá số (chỉ có ${Math.min(...yrs)}–${Math.max(...yrs)}).` };
  }
  return { ok: true, tv };
}

/**
 * Cung nhật hạn của MỘT lá số cho MỘT ngày dương lịch.
 *
 * 🔑 Đây là NGUỒN DUY NHẤT của phép "ngày này rơi vào cung nào" — `execTraNhatVan`
 * (đường của rail chat) gọi chính hàm này. Trước đây phép tính nằm gọn trong
 * tools.ts; tách ra vì thẻ Vận Ngày cần KẾT QUẢ CÓ CẤU TRÚC chứ không phải
 * chuỗi text cho model đọc, và hai bản tính song song thì sớm muộn trôi khỏi nhau.
 *
 * Quy đổi lunar bằng ĐÚNG ngày được hỏi (không neo ngày 1) → luôn ra đúng
 * tháng âm mà ngày đó thật sự thuộc về, kể cả khi tháng dương lịch chứa ngày
 * đó bị một tháng âm khác "cắt ngang" ở giữa.
 */
export function resolveNhatHanIdx(
  lasoData: AnyRec,
  ngay: number,
  thang: number,
  nam: number,
): { ok: true; nhatHanIdx: number; nguyetHanIdx: number; tieuHanIdx: number; tv: AnyRec; ngayAL: number; thangAL: number }
  | { ok: false; error: string } {
  const lunar = solarToLunar(ngay, thang, nam);
  const ngayAL = lunar.day, thangAL = lunar.month, namAL = lunar.year;

  // Tra theo năm ÂM của CHÍNH ngày được hỏi — xem `findTieuVan`.
  const rt = findTieuVan(lasoData, namAL);
  if (!rt.ok) return rt;
  const tv = rt.tv;

  const palaces: AnyRec[] = lasoData.palaces || [];
  const tieuHanIdx = palaces.findIndex((p) => p.cungName === tv.tieuHanCung);
  if (tieuHanIdx === -1) return { ok: false, error: `Không tìm thấy cung tiểu hạn "${tv.tieuHanCung}" trong lá số.` };

  const nguyetHanIdx = nguyetHanIdxForThangAL(lasoData, namAL, tieuHanIdx, thangAL);
  if (nguyetHanIdx == null) return { ok: false, error: 'Lá số thiếu dữ liệu tháng sinh / giờ sinh.' };
  return { ok: true, nhatHanIdx: tinhNhatHan(nguyetHanIdx, ngayAL), nguyetHanIdx, tieuHanIdx, tv, ngayAL, thangAL };
}

/** Số ngày của một tháng DƯƠNG lịch (28–31). */
function daysInSolarMonth(thang: number, nam: number): number {
  return new Date(Date.UTC(nam, thang, 0)).getUTCDate();
}

/** Cộng n ngày (UTC) — tránh lệch múi giờ / giờ mùa hè. */
function addDaysUTC(dt: Date, n: number): Date {
  const x = new Date(dt.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function ymdOf(dt: Date): { d: number; m: number; y: number } {
  return { d: dt.getUTCDate(), m: dt.getUTCMonth() + 1, y: dt.getUTCFullYear() };
}
function lunarOf(dt: Date) {
  const q = ymdOf(dt);
  return solarToLunar(q.d, q.m, q.y);
}

/**
 * Mùng 1 của tháng âm KẾ TIẾP, tính từ mùng 1 của tháng âm hiện tại.
 *
 * Tháng âm là tháng sóc vọng nên chỉ dài 29 hoặc 30 ngày — hỏi đúng hai mốc đó
 * là xong. Vòng dò 27–32 chỉ là lưới đỡ: thà ném lỗi còn hơn trả một ngày sai
 * rồi cả khung 12 tháng lệch mà không gì báo.
 */
function nextLunarMonthStart(mung1: Date): Date {
  for (const len of [29, 30, 27, 28, 31, 32]) {
    const c = addDaysUTC(mung1, len);
    if (lunarOf(c).day === 1) return c;
  }
  throw new Error('Không dò được mùng 1 của tháng âm kế tiếp.');
}

/** MỘT tháng âm lịch, kèm khoảng ngày DƯƠNG mà nó phủ. */
export interface LunarMonthSpan {
  thangAL: number;
  namAL: number;
  isLeap: boolean;
  /** Ngày dương của mùng 1 âm. */
  tu: { d: number; m: number; y: number };
  /** Ngày dương của ngày cuối tháng âm. */
  den: { d: number; m: number; y: number };
  /** 29 hoặc 30. */
  soNgay: number;
  /** Tháng âm này đang chứa "hôm nay" (giờ VN). */
  dangDienRa: boolean;
}

/**
 * `count` tháng ÂM LỊCH liên tiếp, bắt đầu từ tháng âm CHỨA ngày dương dd/mm/yy.
 *
 * 🔑 Vì sao duyệt bằng NGÀY DƯƠNG chứ không cộng số tháng: lịch âm có tháng
 * NHUẬN (năm nhuận 13 tháng) và mỗi tháng dài 29 hoặc 30 ngày — không có phép
 * cộng nào đúng cho cả hai. `solarToLunar` là nguồn DUY NHẤT biết ranh giới đó,
 * nên hỏi thẳng nó thay vì tự dựng bản lịch âm thứ hai.
 */
export function lunarMonthsFrom(dd: number, mm: number, yy: number, count: number): LunarMonthSpan[] {
  const l0 = solarToLunar(dd, mm, yy);
  // Lùi về mùng 1 của chính tháng âm đang chứa ngày này.
  let cur = addDaysUTC(new Date(Date.UTC(yy, mm - 1, dd)), -(l0.day - 1));
  const t = todayVN();
  const todayMs = Date.UTC(t.y, t.m - 1, t.d);

  const out: LunarMonthSpan[] = [];
  for (let i = 0; i < count; i++) {
    const lc = lunarOf(cur);
    const nxt = nextLunarMonthStart(cur);
    const den = addDaysUTC(nxt, -1);
    out.push({
      thangAL: lc.month,
      namAL: lc.year,
      isLeap: !!lc.isLeap,
      tu: ymdOf(cur),
      den: ymdOf(den),
      soNgay: Math.round((nxt.getTime() - cur.getTime()) / 86400000),
      dangDienRa: todayMs >= cur.getTime() && todayMs <= den.getTime(),
    });
    cur = nxt;
  }
  return out;
}

/**
 * '15/2/2026' — dạng ngày người Việt đọc, KHÔNG pad số 0.
 *
 * Dời từ `van-han-12.ts` sang đây (2026-08-19, vá `tra_nguyet_van` của rail):
 * cả `tools.ts` lẫn `van-han-12.ts` đều cần nhãn này mà `tools.ts` không được
 * import ngược `van-han-12.ts` (nó vốn đã import `describeHanCungRich` FROM
 * `tools.ts` — import ngược lại là vòng lặp). `van-ngay.ts` không phụ thuộc
 * cả hai nên là chỗ đứng chung an toàn duy nhất.
 */
export function dmy(x: { d: number; m: number; y: number }): string {
  return `${x.d}/${x.m}/${x.y}`;
}

/** 'Tháng 6 nhuận ÂL' — nhãn ngắn. */
export function nhanThangAL(s: Pick<LunarMonthSpan, 'thangAL' | 'isLeap'>): string {
  return `Tháng ${s.thangAL}${s.isLeap ? ' nhuận' : ''} ÂL`;
}

/**
 * 'Tháng 1 ÂL (15/2/2026 – 13/3/2026)'.
 *
 * 🔑 Khoảng ngày dương KHÔNG phải trang trí: người đọc sống theo lịch dương, nói
 * "tháng 1 âm" trơ trọi là bắt họ tự đi tra. Đây là nguồn DUY NHẤT dựng nhãn —
 * trang, mục lục, prompt của tool 12 tháng LẪN câu trả lời rail đều đọc nó nên
 * không bề mặt nào nói lệch nhau.
 */
export function nhanThangALDay(s: LunarMonthSpan): string {
  return `${nhanThangAL(s)} (${dmy(s.tu)} – ${dmy(s.den)})`;
}

/**
 * Nguyệt hạn + nền năm cho MỘT THÁNG ÂM LỊCH.
 *
 * Khác `resolveNguyetHanSegments` (hỏi theo tháng DƯƠNG nên phải cắt đoạn): một
 * tháng âm nằm TRỌN trong một năm âm ⇒ đúng MỘT tiểu hạn, MỘT nguyệt hạn, không
 * có gì để chẻ. Cả hai đường đi qua cùng `findTieuVan` + `nguyetHanIdxForThangAL`
 * nên không thể nói khác nhau về cùng một tháng.
 */
export function resolveNguyetHanForLunarMonth(
  lasoData: AnyRec,
  thangAL: number,
  namAL: number,
): { ok: true; nguyetHanIdx: number; tieuHanIdx: number; luuNienIdx: number; tv: AnyRec }
  | { ok: false; error: string } {
  const palaces: AnyRec[] = lasoData.palaces || [];
  const rt = findTieuVan(lasoData, namAL);
  if (!rt.ok) return rt;
  const tv = rt.tv;
  const tieuHanIdx = palaces.findIndex((p) => p.cungName === tv.tieuHanCung);
  if (tieuHanIdx === -1) return { ok: false, error: `Không tìm thấy cung tiểu hạn "${tv.tieuHanCung}" trong lá số.` };
  const idx = nguyetHanIdxForThangAL(lasoData, namAL, tieuHanIdx, thangAL);
  if (idx == null) return { ok: false, error: 'Lá số thiếu dữ liệu tháng sinh / giờ sinh để tính nguyệt hạn.' };
  return {
    ok: true,
    nguyetHanIdx: idx,
    tieuHanIdx,
    luuNienIdx: palaces.findIndex((p) => p.cungName === tv.luuNienCung),
    tv,
  };
}

export interface NguyetHanSegment {
  /** Ngày dương lịch bắt đầu đoạn (trong tháng đang tra). */
  tuNgay: number;
  /** Ngày dương lịch kết thúc đoạn. */
  denNgay: number;
  thangAL: number;
  isLeap: boolean;
  nguyetHanIdx: number;
  /** Đoạn có chứa "hôm nay" không — chỉ có ý nghĩa khi tra đúng tháng/năm hiện tại. */
  isCurrent: boolean;
  /**
   * Năm ÂM LỊCH của đoạn — và vì thế cả tiểu hạn/lưu niên đi kèm. Tháng dương
   * chứa Tết bị cắt thành HAI đoạn thuộc HAI năm âm khác nhau ⇒ hai đoạn đó có
   * tiểu hạn KHÁC nhau. Gộp một tiểu hạn cho cả tháng là sai đúng chỗ giao thừa.
   */
  namAL: number;
  tv: AnyRec;
  tieuHanIdx: number;
  luuNienIdx: number;
}

/**
 * Nguyệt hạn cho MỘT THÁNG DƯƠNG LỊCH — trả về 1 hoặc 2 ĐOẠN.
 *
 * 🔴 Bài học vá 2026-08-13 (Henry test 13/8 dương = 1/7 âm): tháng âm lịch dài
 * ~29,5 ngày nên KHÔNG khớp ranh giới tháng dương lịch — hầu hết một tháng
 * dương bị CẮT NGANG bởi 2 tháng âm khác nhau (vd 8/2026: ngày 1–12 còn tháng
 * 6 ÂL, từ ngày 13 đã sang tháng 7 ÂL — chiếm 19/31 ngày, tức ĐA SỐ). Bản cũ
 * neo cứng vào NGÀY 1 để suy "tháng âm của cả tháng dương" → với các tháng bị
 * cắt ngang, ngày 1 hay rơi vào ĐOẠN THIỂU SỐ/đã hết hạn, nên hỏi "tháng này"
 * đúng lúc vừa bước sang tháng âm mới lại ra kết quả của tháng âm CŨ.
 *
 * ⇒ Hàm này dò MỌI điểm chuyển giao trong tháng dương, trả đủ các đoạn kèm
 * khoảng ngày dương + tháng âm của từng đoạn, và đánh dấu đoạn nào đang chứa
 * "hôm nay" (theo giờ VN) để caller ưu tiên luận đúng hạn đang áp dụng.
 */
export function resolveNguyetHanSegments(
  lasoData: AnyRec,
  thang: number,
  nam: number,
): { ok: true; tieuHanIdx: number; luuNienIdx: number; tv: AnyRec; segments: NguyetHanSegment[] }
  | { ok: false; error: string } {
  const palaces: AnyRec[] = lasoData.palaces || [];
  const lastDay = daysInSolarMonth(thang, nam);
  const l1 = solarToLunar(1, thang, nam);
  const lEnd = solarToLunar(lastDay, thang, nam);

  const today = todayVN();
  const isCurrentMonth = today.m === thang && today.y === nam;

  // Điểm chuyển giao xét CẢ tháng âm LẪN năm âm: tháng dương chứa Tết đổi năm
  // âm (12 → 1) nên nếu chỉ so tháng thì vẫn bắt được, nhưng so cả hai cho rõ ý.
  const sameLunarBlock = l1.month === lEnd.month && !!l1.isLeap === !!lEnd.isLeap && l1.year === lEnd.year;
  const bounds: { tuNgay: number; denNgay: number; thangAL: number; isLeap: boolean; namAL: number }[] = [];
  if (sameLunarBlock) {
    bounds.push({ tuNgay: 1, denNgay: lastDay, thangAL: l1.month, isLeap: !!l1.isLeap, namAL: l1.year });
  } else {
    // Dò NGÀY ĐẦU TIÊN mà tháng âm khác ngày 1 — đó là điểm chuyển giao.
    let cut = lastDay;
    for (let d = 2; d <= lastDay; d++) {
      const l = solarToLunar(d, thang, nam);
      if (l.month !== l1.month || !!l.isLeap !== !!l1.isLeap || l.year !== l1.year) { cut = d; break; }
    }
    bounds.push({ tuNgay: 1, denNgay: cut - 1, thangAL: l1.month, isLeap: !!l1.isLeap, namAL: l1.year });
    bounds.push({ tuNgay: cut, denNgay: lastDay, thangAL: lEnd.month, isLeap: !!lEnd.isLeap, namAL: lEnd.year });
  }

  // Mỗi đoạn tra tiểu hạn theo NĂM ÂM CỦA CHÍNH NÓ. Tháng dương chứa Tết có hai
  // đoạn thuộc hai năm âm ⇒ hai tiểu hạn khác nhau; dùng chung một tv là sai.
  const segments: NguyetHanSegment[] = [];
  for (const b of bounds) {
    const rs = resolveNguyetHanForLunarMonth(lasoData, b.thangAL, b.namAL);
    if (!rs.ok) return rs;
    segments.push({
      ...b,
      nguyetHanIdx: rs.nguyetHanIdx,
      isCurrent: isCurrentMonth && today.d >= b.tuNgay && today.d <= b.denNgay,
      tv: rs.tv,
      tieuHanIdx: rs.tieuHanIdx,
      luuNienIdx: rs.luuNienIdx,
    });
  }

  // Ba trường cấp 1 giữ lại cho caller cũ — lấy theo đoạn ĐANG DIỄN RA, không
  // thì đoạn đầu. Caller nào luận theo TỪNG đoạn thì đọc `segments[].tv`.
  const act = segments.find((x) => x.isCurrent) || segments[0]!;
  return { ok: true, tieuHanIdx: act.tieuHanIdx, luuNienIdx: act.luuNienIdx, tv: act.tv, segments };
}

/**
 * Khối cá nhân của thẻ: cung nhật hạn + chính tinh + quan hệ ngũ hành ngày ↔
 * nạp âm mệnh + có bị xung tuổi không.
 *
 * ⚠️ CỐ Ý KHÔNG chấm điểm/10 cho ngày. Luật đã chốt trong repo: chỉ ĐẠI VẬN có
 * điểm thật; nguyệt/nhật hạn luận theo cung + chính tinh, gán điểm là bịa.
 */
export function computeVanNgayCaNhan(
  lasoData: AnyRec,
  day: VanNgayResult,
  dd: number, mm: number, yy: number,
): VanNgayCaNhan | null {
  const r = resolveNhatHanIdx(lasoData, dd, mm, yy);
  if (!r.ok) return null;
  const palaces: AnyRec[] = lasoData.palaces || [];
  const p = palaces[r.nhatHanIdx];
  if (!p) return null;

  const chinhTinh: string[] = ((p.majorStars as AnyRec[]) || [])
    .map((s) => (typeof s === 'object' && s ? String(s.ten || '') : String(s || '')))
    .filter(Boolean);

  const napAmHanh: string | null = lasoData.napAmHanh ? String(lasoData.napAmHanh) : null;
  let quanHeHanh: VanNgayCaNhan['quanHeHanh'] = null;
  let mauCaNhan: string[] = [];
  if (napAmHanh && HANH_MAU[napAmHanh]) {
    const dayHanh = day.mau.hanh;
    if (dayHanh === napAmHanh) quanHeHanh = 'hoa';
    else if (HANH_SINH[dayHanh] === napAmHanh) quanHeHanh = 'duoc-sinh';
    else if (HANH_SINH[napAmHanh] === dayHanh) quanHeHanh = 'sinh';
    else if (HANH_KHAC[dayHanh] === napAmHanh) quanHeHanh = 'bi-khac';
    else if (HANH_KHAC[napAmHanh] === dayHanh) quanHeHanh = 'khac';
    // Màu riêng: hành mệnh + hành sinh ra mệnh (nuôi mệnh).
    const nuoi = HANH_DUOC_SINH[napAmHanh];
    mauCaNhan = [...(HANH_MAU[napAmHanh] || []), ...(nuoi ? HANH_MAU[nuoi] || [] : [])];
  }

  const chiNamSinh = String(lasoData.canChiNam || '').split(' ')[1] || '';

  return {
    cungNhatHan: String(p.cungName || ''),
    diaChiNhatHan: String(p.diaChi || ''),
    chinhTinh,
    cungNguyetHan: String(palaces[r.nguyetHanIdx]?.cungName || ''),
    tuoi: Number(r.tv.tuoi) || 0,
    quanHeHanh,
    napAmHanh,
    mauCaNhan,
    bixung: !!chiNamSinh && chiNamSinh === day.xung.chi,
    canChiNam: String(lasoData.canChiNam || ''),
  };
}
