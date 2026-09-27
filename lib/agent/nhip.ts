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
// Câu đinh: chỉ ở câu đời sống/vặt/giải thích, ~1/3 số lượt đủ điều kiện, KHÔNG
// hai lượt liền, KHÔNG BAO GIỜ khi khách bế tắc hoặc chỉ nói câu xã giao.
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

export type LoaiCau = 'xa-giao' | 'vat' | 'doi-song' | 'giai-thich' | 'be-tac';
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
  // Xã giao = câu RẤT ngắn chứa cụm xã giao; "ok vậy tháng 7 có nên ký không" không phải xã giao.
  if (soTu <= 5 && XA_GIAO.some((c) => q === c || q.startsWith(c + ' ') || q.endsWith(' ' + c) || q.startsWith(c + ',')))
    return 'xa-giao';
  if (soTu <= 14 && VAT.some((c) => q.includes(c))) return 'vat';
  return 'doi-song';
}

// Phân bố độ dài theo loại câu (trọng số, cộng = 100).
const PHAN_BO: Record<LoaiCau, Partial<Record<MucDai, number>>> = {
  'xa-giao': { 'mot-cau': 100 },
  vat: { 'mot-cau': 25, ngan: 60, vua: 15 },
  'doi-song': { ngan: 25, vua: 55, dai: 20 },
  'giai-thich': { vua: 30, dai: 70 },
  'be-tac': { ngan: 30, vua: 70 },
};
// Lượt MỞ phiên với câu đời sống: người ta vừa đưa lá số, chưa nên cụt lủn.
const PHAN_BO_LUOT_DAU: Partial<Record<MucDai, number>> = { vua: 60, dai: 40 };
const PHAN_BO_AN_UI: Partial<Record<MucDai, number>> = { ngan: 35, vua: 65 };

const XAC_SUAT_DINH = 0.35;

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
  if (!l || loai === 'xa-giao') return m;
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
}

/**
 * Nhịp cho lượt CUỐI của `cauHoi` (danh sách câu user theo thứ tự, câu mới nhất
 * ở cuối). Dựng lại nhịp các lượt trước để không lặp mức / không chêm đinh hai
 * lượt liền.
 */
export function tinhNhip(cauHoi: string[], authorId?: string | null): NhipLuot {
  const coThay = !!(authorId && PERSONAS[authorId]);
  const l = coThay ? PERSONAS[authorId as string].nhipLech : undefined;
  // `as` chứ không khai kiểu: TS thu hẹp `null` ở lần gán đầu thành `never` trong vòng lặp.
  let truoc = null as NhipLuot | null;
  for (let i = 0; i < cauHoi.length; i++) {
    const q = cauHoi[i] || '';
    const loai = loaiCau(q);
    const khoa = `${i}|${q}`;
    const nc = nhuCau(q);
    // Người đang đau không đọc nổi một bài dài — kể cả khi câu có chữ "tại sao".
    const pb =
      nc === 'an-ui' ? PHAN_BO_AN_UI : i === 0 && loai === 'doi-song' ? PHAN_BO_LUOT_DAU : PHAN_BO[loai];
    const muc: MucDai = lech(boc(pb, bam('muc|' + khoa), loai === 'xa-giao' ? undefined : truoc?.muc), l, loai);
    const duDieuKien = loai === 'vat' || loai === 'doi-song' || loai === 'giai-thich';
    // Không có thầy ⇒ không có "kiểu câu đinh" nào để chêm.
    // Câu đinh (có vần, bóc, trêu) chỉ hợp lượt tra cứu thuần — chêm vào lượt
    // người ta cần an ủi/công nhận là đùa đúng chỗ đau.
    const dinh: boolean = coThay && nc === 'giai-dap' && duDieuKien && !truoc?.dinh && muc !== 'mot-cau' && bam('dinh|' + khoa) < XAC_SUAT_DINH;
    truoc = { loai, nhuCau: nc, muc, dinh };
  }
  return truoc || { loai: 'doi-song', nhuCau: 'giai-dap', muc: 'vua', dinh: false };
}

/** Dòng nối vào CUỐI tin user. */
export function nhipHint(n: NhipLuot, authorId?: string | null): string {
  const doDai = `độ dài ${LOI_MUC[n.muc]} (ghi đè NGÂN SÁCH mặc định; khách yêu cầu rõ độ dài thì theo khách)`;
  const ghiChuBeTac = n.loai === 'be-tac' ? '; khách đang nặng lòng: chậm lại, ít phân tích, có thể hỏi lại một câu' : '';
  const dinh = n.dinh
    ? 'lượt này ĐƯỢC chêm đúng MỘT câu đinh theo kiểu của thầy'
    : 'lượt này KHÔNG chêm câu đinh/câu vần';
  const xung =
    authorId && PERSONAS[authorId]?.xung === 'co-cau' ? '; gọi người xem là "cậu" (nam) / "cô" (nữ), KHÔNG gọi anh/chị' : '';
  const nhip = `[NHỊP LƯỢT NÀY: ${doDai}${ghiChuBeTac}; ${dinh}${xung}. Không lặp lại phần đã nói ở lượt trước.]`;
  return n.nhuCau === 'giai-dap'
    ? nhip
    : `${nhip}\n[NHU CẦU ẨN (máy đoán — tự kiểm lại theo câu chữ, không khớp thì bỏ qua): ${LOI_NHU_CAU[n.nhuCau]}. Lượt này giữ giọng thầy ở cách dùng chữ, nhưng KHÔNG bóc, vặn, trêu hay chê người xem, và bỏ câu mở cửa miệng kiểu bác bỏ/bóc mẽ ("Sai câu hỏi rồi", "Nói thật nhé").]`;
}
