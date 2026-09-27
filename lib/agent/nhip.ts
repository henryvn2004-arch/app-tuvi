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
    const pb = i === 0 && loai === 'doi-song' ? PHAN_BO_LUOT_DAU : PHAN_BO[loai];
    const muc: MucDai = lech(boc(pb, bam('muc|' + khoa), loai === 'xa-giao' ? undefined : truoc?.muc), l, loai);
    const duDieuKien = loai === 'vat' || loai === 'doi-song' || loai === 'giai-thich';
    // Không có thầy ⇒ không có "kiểu câu đinh" nào để chêm.
    const dinh: boolean = coThay && duDieuKien && !truoc?.dinh && muc !== 'mot-cau' && bam('dinh|' + khoa) < XAC_SUAT_DINH;
    truoc = { loai, muc, dinh };
  }
  return truoc || { loai: 'doi-song', muc: 'vua', dinh: false };
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
  return `[NHỊP LƯỢT NÀY: ${doDai}${ghiChuBeTac}; ${dinh}${xung}. Không lặp lại phần đã nói ở lượt trước.]`;
}
