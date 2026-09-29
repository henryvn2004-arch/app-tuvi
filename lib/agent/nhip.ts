// lib/agent/nhip.ts
// ============================================================
// NHỊP từng lượt trả lời — độ dài + có được chêm "câu đinh" hay không.
//
// 🔴 Vì sao server bốc, không giao cho model: model rất tệ khoản ngẫu nhiên —
// bảo "thỉnh thoảng trả lời ngắn" thì nó ngắn ĐỀU ĐỀU; bảo "rắc câu có vần thưa
// thưa" thì nó rắc MỌI lượt (không đếm được qua các lượt). Luật cũ "câu nối tiếp
// 40–90 từ" quyết độ dài theo THỨ TỰ LƯỢT nên đọc lên vẫn rập khuôn (Henry
// 2026-09-27). Người thật nói dài ngắn theo SỨC NẶNG câu hỏi.
//
// Ba lớp: (1) loại câu hỏi → phân bố độ dài · (2) bốc có trọng số, KHÔNG lặp một
// mức hai lượt liền · (3) thầy lệch trục (`PERSONAS[*].nhipLech`).
// Câu đinh + dấu riêng của thầy (câu mở cửa miệng, ẩn dụ đặc trưng — 2026-09-29):
// chỉ ở câu đời sống/vặt/giải thích, ~1/3 số lượt đủ điều kiện, KHÔNG
// hai lượt liền, KHÔNG BAO GIỜ khi khách bế tắc hoặc chỉ nói câu xã giao.
// Kiểu câu đinh + chiêu bốc từ kho CHUNG `lib/agent/chieu.ts` theo ngữ cảnh, không
// lặp trong 3 lượt; chiêu có cổng riêng (khách đang đau vẫn được chiêu đỡ người).
//
// Tất định: "ngẫu nhiên" băm từ chính chữ các câu hỏi ⇒ gọi lại cùng hội thoại
// (retry, fallback nhà cung cấp) ra cùng nhịp, và dựng lại được nhịp các lượt
// TRƯỚC mà không phải lưu gì — đủ để luật "không lặp hai lượt liền".
//
// Kết quả là MỘT dòng nối vào CUỐI tin user (cùng kỹ thuật `focusHintText`),
// không đụng system ⇒ prompt cache không vỡ.
// ============================================================

import { chuanHoaDauThanh } from '@/lib/vn-text';
import { PERSONAS } from '@/lib/agent/personas';
import { KIEU_DINH, CHIEU, type Chieu, type NguCanh } from '@/lib/agent/chieu';

export type LoaiCau = 'xa-giao' | 'hoi-thuong' | 'vat' | 'doi-song' | 'giai-thich' | 'be-tac';
/** "Câu hỏi đằng sau câu hỏi" — người ta hỏi để tìm gì. Xem `nhuCau()`. */
export type NhuCau = 'giai-dap' | 'an-ui' | 'cong-nhan' | 'hy-vong' | 'phe-minh';
export type MucDai = 'mot-cau' | 'ngan' | 'vua' | 'dai';

const MUC: MucDai[] = ['mot-cau', 'ngan', 'vua', 'dai'];

const LOI_MUC: Record<MucDai, string> = {
  'mot-cau': 'đúng MỘT câu, không thêm gì',
  ngan: '2–3 câu, dưới ~50 từ — chỉ lớp ① và ⑤',
  vua: 'khoảng 80–140 từ',
  dai: 'khoảng 180–260 từ, được đi đủ 5 lớp',
};

// Mẫu là CỤM ĐỦ NGHĨA (CLAUDE.md "Tiếng Việt"), so trên chuỗi đã chuẩn hoá dấu.
const norm = (x: string) => chuanHoaDauThanh(String(x || '').toLowerCase().normalize('NFC'));
const cum = (xs: string[]) => xs.map(norm);
const BE_TAC = cum([
  'bế tắc', 'mệt mỏi quá', 'mệt quá', 'chán nản', 'chán quá', 'buông xuôi', 'tuyệt vọng', 'khổ quá',
  'sao khổ', 'không biết phải làm sao', 'không biết làm gì', 'không biết phải làm gì', 'trầm cảm',
  'cô đơn quá', 'muốn chết', 'không muốn sống', 'bất lực', 'áp lực quá', 'kiệt sức',
]);
const GIAI_THICH = cum([
  'giải thích', 'chi tiết', 'phân tích kỹ', 'nói kỹ', 'kỹ hơn', 'cụ thể hơn', 'vì sao', 'tại sao',
  'lập bảng', 'so sánh', 'liệt kê',
]);
const XA_GIAO = cum([
  'cảm ơn', 'cám ơn', 'thanks', 'ok', 'oke', 'vâng', 'dạ', 'ừ', 'thật à', 'thật không', 'vậy à', 'thế à',
  'hay quá', 'đúng rồi', 'chuẩn', 'haha', 'hihi',
]);
// Hỏi về chính cuộc trò chuyện — không phải câu xin luận. Không bắt thì rơi vào
// 'doi-song' ⇒ 80–260 từ + dấu riêng cho câu "đang xem lá số của ai đó?"
// (Henry 2026-09-29: thầy trả lời bằng một đoạn bóc tính cách).
const HOI_THUONG = cum([
  'lá số của ai', 'xem cho ai', 'đang xem ai', 'xem của ai', 'lá số này là của', 'đang xem lá số nào',
  'thầy là ai', 'bạn là ai', 'mày là ai', 'ai đang trả lời', 'thầy tên gì', 'bạn tên gì',
]);
const KHONG_KHOP = cum(['không đúng', 'chưa đúng', 'sai rồi', 'không khớp', 'không chuẩn', 'sai bét']);
const VAT = cum([
  'có nên', 'nên không', 'được không', 'có được', 'có hợp', 'hợp không', 'có tốt không', 'mấy giờ',
  'ngày nào', 'tháng nào', 'năm nào', 'khi nào', 'bao giờ',
]);

// ── NHU CẦU ẨN (Henry 2026-09-27) ────────────────────────────────────────
// Người vừa thất tình hỏi "tại sao anh ấy từ chối em" KHÔNG tìm lời giải — trả
// "vì số chị có sao X nên hay bị vậy" là quy lỗi cho chính họ, nghe như án phạt.
// Họ cần: được ghi nhận → được bình thường hoá → được mở góc nhìn → được chỉ chỗ
// sáng. `companion.ts` đã lo ca KỂ LỂ mà không hỏi; lớp này lo ca HỎI mà thật ra
// cần thứ khác. Mẫu là CỤM ĐỦ NGHĨA; lời nhắc gửi model luôn ghi "máy đoán — tự
// kiểm lại theo câu chữ" vì đoán nhầm một câu rẻ hơn bỏ sót người đang đau.
// Thứ tự xét CÓ NGHĨA: "có nên chia tay" là xin công nhận, không phải vừa bị bỏ.
const CONG_NHAN = cum([
  'có nên chia tay', 'có nên ly hôn', 'có nên bỏ', 'có nên nghỉ việc', 'có nên buông', 'có nên dừng',
  'có sai không', 'có ích kỷ không', 'tôi có quá đáng', 'em có quá đáng', 'mình có quá đáng', 'có ổn không nếu',
]);
const AN_UI = cum([
  'thất tình', 'bị từ chối', 'từ chối em', 'từ chối tôi', 'từ chối mình', 'anh ấy từ chối', 'cô ấy từ chối',
  'người ta từ chối', 'crush từ chối', 'tỏ tình mà', 'tỏ tình bị', 'tỏ tình thất bại', 'từ chối lời', 'chia tay rồi', 'mới chia tay',
  'vừa chia tay', 'bị bỏ rơi', 'bỏ em rồi', 'bỏ tôi rồi', 'không yêu em', 'không yêu tôi', 'không thích em',
  'không thích tôi', 'phản bội', 'cắm sừng', 'ngoại tình', 'bị đá', 'mất việc', 'bị đuổi việc', 'bị sa thải',
  'cho nghỉ việc', 'trượt phỏng vấn', 'thi trượt', 'thi rớt', 'rớt đại học', 'trượt đại học', 'bị lừa',
  'mất hết tiền', 'vỡ nợ', 'phá sản', 'sảy thai', 'mới mất', 'vừa mất', 'qua đời',
]);
const HY_VONG = cum([
  'bao giờ tôi mới', 'bao giờ em mới', 'bao giờ mình mới', 'bao giờ mới', 'liệu tôi có', 'liệu em có',
  'liệu mình có', 'có còn cơ hội', 'có ế không', 'bị ế', 'lấy được chồng', 'lấy được vợ', 'có lấy chồng',
  'có lấy vợ', 'có con được không', 'có khá lên', 'có thoát được', 'bao giờ hết khổ', 'có đổi đời',
]);
const PHE_MINH = cum([
  'chèn ép', 'bắt nạt', 'coi thường', 'xem thường', 'khinh thường', 'đối xử tệ', 'đổ lỗi cho',
  'nói xấu', 'có quá đáng không', 'có phải tệ không', 'có đáng không', 'bạc bẽo', 'lợi dụng',
]);

export function nhuCau(question: string): NhuCau {
  const q = norm(question);
  if (CONG_NHAN.some((c) => q.includes(c))) return 'cong-nhan';
  if (AN_UI.some((c) => q.includes(c))) return 'an-ui';
  if (PHE_MINH.some((c) => q.includes(c))) return 'phe-minh';
  if (HY_VONG.some((c) => q.includes(c))) return 'hy-vong';
  return 'giai-dap';
}

const LOI_NHU_CAU: Record<Exclude<NhuCau, 'giai-dap'>, string> = {
  'an-ui':
    'người xem vừa bị tổn thương — câu "vì sao/tại sao" ở đây thường là tìm AN ỦI hơn tìm lời giải. Thứ tự: (1) câu ĐẦU gọi đúng tên cảm giác họ đang chịu (hụt hẫng, tủi thân, mất mặt, hoang mang…) bằng chi tiết họ kể — TRƯỚC khi an ủi hay khen; (2) bình thường hoá — chuyện này người đời ai cũng qua vài lần, không phải vì họ kém; (3) mở góc nhìn — họ đang nhìn cả thế giới qua một người/một việc, ngoài kia còn rộng; (4) dùng lá số để chỉ CHỖ SÁNG: điểm mạnh của họ, mốc duyên/vận tốt hơn có thật trong dữ liệu. KHÔNG dùng lá số để giải thích vì sao họ bị vậy, không nói kiểu "số anh có sao X nên hay bị". Không phân tích lỗi của họ lượt này',
  'cong-nhan':
    'có vẻ người xem đã nghiêng về một quyết định và cần được CÔNG NHẬN rằng cảm giác của họ có lý. Nói điều đó trước, rồi mới nêu thời điểm/rủi ro từ dữ liệu; quyền quyết là của họ, đừng quyết thay',
  'hy-vong':
    'câu hỏi xuất phát từ LO LẮNG về tương lai, thường kèm tự ti. Câu đầu trả lời có/không cho RÕ (đừng để treo), đưa MỐC có thật trong dữ liệu, rồi một việc trong tầm tay. Dữ liệu nói muộn/khó thì nói như một mốc đáng chờ ("duyên chín muộn", "quả ngọt về sau"), KHÔNG như khuyết điểm, không đổ cho tính cách hay "số buộc phải vậy"; không doạ, không hứa điều dữ liệu không nói',
  'phe-minh':
    'người xem đang kể mình bị đối xử không đúng. ĐỨNG VỀ PHÍA họ trước — công nhận điều đó không ổn — rồi mới (nếu cần) gợi góc nhìn còn lại; không mở đầu bằng "lỗi ở cả hai phía", không bênh người kia',
};

export function loaiCau(question: string): LoaiCau {
  const q = norm(question).trim();
  const soTu = q.split(/\s+/).filter(Boolean).length;
  if (BE_TAC.some((c) => q.includes(c))) return 'be-tac';
  if (GIAI_THICH.some((c) => q.includes(c))) return 'giai-thich';
  // Xã giao = câu RẤT ngắn chứa cụm xã giao; "ok vậy tháng 7 có nên ký không" không phải xã giao,
  // "thầy nói không đúng rồi" cũng không (chứa "đúng rồi" nhưng là cãi lại — cần chiêu kiểm giờ sinh).
  if (soTu <= 5 && !KHONG_KHOP.some((c) => q.includes(c)) && XA_GIAO.some((c) => q === c || q.startsWith(c + ' ') || q.endsWith(' ' + c) || q.startsWith(c + ',')))
    return 'xa-giao';
  if (soTu <= 12 && HOI_THUONG.some((c) => q.includes(c))) return 'hoi-thuong';
  if (soTu <= 14 && VAT.some((c) => q.includes(c))) return 'vat';
  return 'doi-song';
}

// Phân bố độ dài theo loại câu (trọng số, cộng = 100).
const PHAN_BO: Record<LoaiCau, Partial<Record<MucDai, number>>> = {
  'xa-giao': { 'mot-cau': 100 },
  'hoi-thuong': { 'mot-cau': 50, ngan: 50 },
  vat: { 'mot-cau': 25, ngan: 60, vua: 15 },
  'doi-song': { ngan: 25, vua: 55, dai: 20 },
  'giai-thich': { vua: 30, dai: 70 },
  'be-tac': { ngan: 30, vua: 70 },
};
// Lượt MỞ phiên với câu đời sống: người ta vừa đưa lá số, chưa nên cụt lủn.
const PHAN_BO_LUOT_DAU: Partial<Record<MucDai, number>> = { vua: 60, dai: 40 };
const PHAN_BO_AN_UI: Partial<Record<MucDai, number>> = { ngan: 35, vua: 65 };

// Mức này CỐ Ý dày (~48% lượt có câu đinh hoặc chiêu, đo 4.000 lượt giả lập) — Henry
// 2026-09-29: khách free chỉ có ~10 lượt, phải thấy "chất thầy" ngay trong đó để bị hook.
// Đã thử hạ xuống ~19% (nghỉ 2 lượt, 0,2/0,2) và Henry thấy quá ít — đừng hạ lại mà không hỏi.
const XAC_SUAT_DINH = 0.35;
const XAC_SUAT_CHIEU = 0.4;
/** Không bốc lại kiểu câu đinh / chiêu đã dùng trong ngần này lượt gần nhất. */
const KHONG_LAP = 3;
// Người đang đau / cần được công nhận: chỉ các chiêu đỡ người, không chiêu dò/doạ/đoán.
const CHIEU_KHI_DAU = ['go-toi', 'truy-vet'];
const CHIEU_KHI_BE_TAC = ['go-toi', 'truy-vet', 'duyen-no'];

/** FNV-1a 32-bit → [0,1). Tất định theo chuỗi. */
function bam(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

function boc(pb: Partial<Record<MucDai, number>>, r: number, tru?: MucDai): MucDai {
  const muc = MUC.filter((m) => (pb[m] || 0) > 0 && m !== tru);
  if (!muc.length) return tru || 'vua'; // phân bố chỉ có đúng mức vừa bị loại ⇒ đành lặp
  const tong = muc.reduce((s, m) => s + (pb[m] || 0), 0);
  let x = r * tong;
  for (const m of muc) {
    x -= pb[m] || 0;
    if (x < 0) return m;
  }
  return muc[muc.length - 1];
}

function lech(m: MucDai, l: number | undefined, loai: LoaiCau): MucDai {
  if (!l || loai === 'xa-giao' || loai === 'hoi-thuong') return m;
  if (l === -2) return MUC.indexOf(m) > MUC.indexOf('ngan') ? 'ngan' : m;
  const i = Math.min(MUC.length - 1, Math.max(0, MUC.indexOf(m) + l));
  // Lệch lên không được biến câu hỏi vặt thành bài dài, lệch xuống không được
  // biến câu đời sống thành một câu cụt.
  // Lệch LÊN chỉ kéo "ngắn" thành "vừa" — cho phép lên thẳng "dài" thì thầy kể
  // chuyện ra dài quá nửa số lượt (đo trên 10 câu mẫu: 5/10), thành nhàm.
  if (l > 0) return m === 'ngan' ? 'vua' : m;
  if (l < 0 && loai !== 'vat') return MUC[Math.max(i, MUC.indexOf('ngan'))];
  return MUC[i];
}

export interface NhipLuot {
  loai: LoaiCau;
  nhuCau: NhuCau;
  muc: MucDai;
  dinh: boolean;
  /** Kiểu câu đinh đã bốc (`KIEU_DINH[].id`) khi `dinh`. */
  kieu?: string;
  /** Tối đa hai chiêu hợp ngữ cảnh (`CHIEU[].id`) — model chọn một hoặc bỏ. */
  chieu?: string[];
}

/** Bốc đều một phần tử theo `r` ∈ [0,1). */
const bocDeu = <T,>(xs: T[], r: number): T | undefined => xs[Math.floor(r * xs.length)];

/**
 * Nhịp cho lượt CUỐI của `cauHoi` (danh sách câu user theo thứ tự, câu mới nhất
 * ở cuối). Dựng lại nhịp các lượt trước để không lặp mức / không chêm đinh hai
 * lượt liền.
 */
export function tinhNhip(
  cauHoi: string[],
  authorId?: string | null,
  /** `cacChuDe` (lib/agent/luan-chu-de.ts) — truyền từ run.ts để nhip.ts không kéo theo engine. */
  chuDeCua: (q: string) => string[] = () => [],
): NhipLuot {
  const coThay = !!(authorId && PERSONAS[authorId]);
  const l = coThay ? PERSONAS[authorId as string].nhipLech : undefined;
  // `as` chứ không khai kiểu: TS thu hẹp `null` ở lần gán đầu thành `never` trong vòng lặp.
  let truoc = null as NhipLuot | null;
  const daDung: string[][] = []; // kiểu + chiêu từng lượt, dựng lại tất định để không lặp
  for (let i = 0; i < cauHoi.length; i++) {
    const q = cauHoi[i] || '';
    const loai = loaiCau(q);
    const khoa = `${i}|${q}`;
    const nc = nhuCau(q);
    // Người đang đau không đọc nổi một bài dài — kể cả khi câu có chữ "tại sao".
    const pb =
      nc === 'an-ui' ? PHAN_BO_AN_UI : i === 0 && loai === 'doi-song' ? PHAN_BO_LUOT_DAU : PHAN_BO[loai];
    const muc: MucDai = lech(boc(pb, bam('muc|' + khoa), loai === 'xa-giao' || loai === 'hoi-thuong' ? undefined : truoc?.muc), l, loai);
    const duDieuKien = loai === 'vat' || loai === 'doi-song' || loai === 'giai-thich';
    // Không có thầy ⇒ không có "kiểu câu đinh" nào để chêm.
    // Câu đinh (có vần, bóc, trêu) chỉ hợp lượt tra cứu thuần — chêm vào lượt
    // người ta cần an ủi/công nhận là đùa đúng chỗ đau.
    const dinh: boolean = coThay && nc === 'giai-dap' && duDieuKien && !truoc?.dinh && muc !== 'mot-cau' && bam('dinh|' + khoa) < XAC_SUAT_DINH;
    const ganDay = new Set(daDung.slice(-KHONG_LAP).flat());
    let chuDe: string[] = [];
    try {
      chuDe = chuDeCua(q);
    } catch {
      chuDe = []; // chủ đề chỉ để lọc kiểu — hỏng thì bốc trên cả kho, không chặn lượt trả lời
    }
    const ctx: NguCanh = { q: norm(q), loai, nhuCau: nc, chuDe, luot: i };
    const kieu = dinh
      ? bocDeu(
          KIEU_DINH.filter((k) => !ganDay.has(k.id) && (!k.chuDe || k.chuDe.some((c) => chuDe.includes(c)))),
          bam(`kieu|${authorId}|${khoa}`),
        )?.id
      : undefined;
    // Chiêu: có thầy, không phải câu xã giao/hỏi thường; ngữ cảnh RẤT hợp thì bật luôn,
    // không thì bốc xác suất và không hai lượt liền.
    let chieu: string[] | undefined;
    if (coThay && loai !== 'xa-giao' && loai !== 'hoi-thuong') {
      const choPhep =
        loai === 'be-tac' ? CHIEU_KHI_BE_TAC : nc === 'an-ui' || nc === 'phe-minh' || nc === 'cong-nhan' ? CHIEU_KHI_DAU : null;
      const hop = CHIEU.filter((c) => !ganDay.has(c.id) && (!choPhep || choPhep.includes(c.id)) && c.khi(ctx));
      const manh = hop.filter((c) => c.manh?.(ctx));
      const bat = manh.length > 0 || (hop.length > 0 && !truoc?.chieu && bam(`chieu|${authorId}|${khoa}`) < XAC_SUAT_CHIEU);
      if (bat) {
        const r = bam(`chieu-chon|${authorId}|${khoa}`);
        const con = hop.filter((c) => !manh.includes(c));
        const dau = manh.length ? manh : con;
        const a = bocDeu(dau, r);
        const b = bocDeu((manh.length ? [...manh, ...con] : con).filter((c) => c !== a), bam(`chieu-2|${authorId}|${khoa}`));
        chieu = [a, b].filter((c): c is Chieu => !!c).map((c) => c.id);
      }
    }
    daDung.push([...(kieu ? [kieu] : []), ...(chieu || [])]);
    truoc = { loai, nhuCau: nc, muc, dinh, kieu, chieu };
  }
  return truoc || { loai: 'doi-song', nhuCau: 'giai-dap', muc: 'vua', dinh: false };
}

/** Dòng nối vào CUỐI tin user. */
export function nhipHint(n: NhipLuot, authorId?: string | null): string {
  const doDai = `độ dài ${LOI_MUC[n.muc]} (ghi đè NGÂN SÁCH mặc định; khách yêu cầu rõ độ dài thì theo khách)`;
  const ghiChuBeTac = n.loai === 'be-tac' ? '; khách đang nặng lòng: chậm lại, ít phân tích, có thể hỏi lại một câu' : '';
  const ghiChuThuong =
    n.loai === 'hoi-thuong' ? '; đây là câu hỏi thường về cuộc trò chuyện: đáp thẳng đúng điều được hỏi, không luận tính cách/vận số' : '';
  // Không cho phép thì cấm cả CHIÊU RIÊNG (câu mở cửa miệng, ẩn dụ đặc trưng), không chỉ câu đinh —
  // chỉ cấm câu đinh thì thầy vẫn mở MỌI lượt bằng "Nói thật nhé:" (Henry 2026-09-29).
  const kd = n.kieu ? KIEU_DINH.find((k) => k.id === n.kieu) : undefined;
  const dinh = n.dinh
    ? `lượt này ĐƯỢC dùng dấu riêng của thầy và chêm đúng MỘT câu đinh kiểu ${kd ? `"${kd.ten}" — vd ${kd.vd}; tự đặt câu MỚI về đúng chuyện của người xem, không chép ví dụ` : 'của thầy'}`
    : 'lượt này KHÔNG dùng dấu riêng: không câu mở cửa miệng, không ẩn dụ đặc trưng, không câu đinh/câu vần — trả lời thẳng như người thường, giọng thầy chỉ ở xưng hô và chọn chữ';
  const xung =
    authorId && PERSONAS[authorId]?.xung === 'co-cau' ? '; gọi người xem là "cậu" (nam) / "cô" (nữ), KHÔNG gọi anh/chị' : '';
  const ds = (n.chieu || []).map((id) => CHIEU.find((c) => c.id === id)).filter((c): c is Chieu => !!c);
  const chieu = ds.length
    ? `\n[CHIÊU lượt này (máy lọc theo ngữ cảnh — chọn MỘT cái hợp nhất với đoạn đang chat, không hợp thì bỏ; lồng vào lời thầy, không gọi tên chiêu): ${ds.map((c, i) => `(${i + 1}) ${c.ten}: ${c.cach}`).join(' ')}]`
    : '';
  const nhip = `[NHỊP LƯỢT NÀY: ${doDai}${ghiChuBeTac}${ghiChuThuong}; ${dinh}${xung}. Không lặp lại phần đã nói ở lượt trước.]${chieu}`;
  return n.nhuCau === 'giai-dap'
    ? nhip
    : `${nhip}\n[NHU CẦU ẨN (máy đoán — tự kiểm lại theo câu chữ, không khớp thì bỏ qua): ${LOI_NHU_CAU[n.nhuCau]}. Lượt này giữ giọng thầy ở cách dùng chữ, nhưng KHÔNG bóc, vặn, trêu hay chê người xem, và bỏ câu mở cửa miệng kiểu bác bỏ/bóc mẽ ("Sai câu hỏi rồi", "Nói thật nhé").]`;
}
