// lib/engine/laso.ts
// ============================================================
// Engine wrapper — tính lá số SERVER-SIDE (Sprint 0.2).
//
// Tái dùng đúng pattern loadEngine() đã chạy production ở
// app/luan-giai/[slug] và app/la-so/[slug]: nạp engine vanilla
// public/tuvi-ansao-engine.js qua new Function, có mock
// globalThis.location ở MODULE LEVEL (bắt buộc — engine set
// globalThis.window = globalThis làm Next.js crash khi parse URL
// nếu thiếu location). Xem CLAUDE.md.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import type { BirthParams } from '@/lib/contract/v1';
import { currentNamXem } from '@/lib/engine/namxem';

type Rec = Record<string, unknown>;

// ── Mock location ở module level (TRƯỚC khi engine chạy) ─────
{
  const g = globalThis as Rec;
  if (!g.location) {
    g.location = {
      protocol: 'https:',
      hostname: 'tuviminhbao.com',
      host: 'tuviminhbao.com',
      port: '',
      href: 'https://tuviminhbao.com/',
      pathname: '/',
      search: '',
      hash: '',
    };
  }
}

// Giờ sinh: index địa chi (0=Tý..11=Hợi) → giờ đại diện
const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

// Tên 12 địa chi theo index (cho nhãn giờ trong thẻ lá số).
const CHI_NAMES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

/**
 * Giờ ĐỒNG HỒ (24h) → index địa chi giờ (0=Tý..11=Hợi) — DETERMINISTIC, server
 * tự tính để KHÔNG để LLM map (đã gặp lỗi LLM chọn 9h35→Thìn thay vì Tỵ).
 * Tý=23:00–00:59, Sửu=01:00–02:59, … Tỵ=09:00–10:59 … (khối 2 giờ, neo giờ lẻ).
 * Phút không đổi khối nên bỏ qua. Ví dụ: 9→Tỵ(5), 13→Mùi(7), 23→Tý(0), 0→Tý(0).
 */
export function clockToBranch(hour: number): number {
  const h = (((Math.floor(hour) % 24) + 24) % 24);
  return Math.floor(((h + 1) % 24) / 2) % 12;
}

// ── Engine loader (singleton) ───────────────────────────────
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
    g.location = { protocol: 'https:', hostname: 'tuviminhbao.com', host: 'tuviminhbao.com', port: '', href: 'https://tuviminhbao.com/', pathname: '/', search: '', hash: '' };
  }
  engineCache = (new Function('window', 'globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};'))(g, g) as typeof engineCache;
  return engineCache!;
}

/**
 * Âm lịch → Dương lịch (DETERMINISTIC). Engine chỉ có chiều dương→âm, nên dò
 * ngược: quét ngày dương trong [ly .. ly+1], lấy ngày mà convertDuongToAm ra
 * đúng (ngày,tháng,năm) âm cần. Dùng CHÍNH convertDuongToAm của engine → parity
 * tuyệt đối với cách anSaoLaSo hiểu ngày. Lấy match ĐẦU TIÊN (bỏ qua tháng nhuận).
 * Trả null nếu không tìm thấy (ngày âm không hợp lệ).
 */
function lunarToSolar(ld: number, lm: number, ly: number): { day: number; month: number; year: number } | null {
  const { convertDuongToAm } = loadEngine();
  for (let yy = ly; yy <= ly + 1; yy++) {
    for (let mm = 1; mm <= 12; mm++) {
      const dim = new Date(yy, mm, 0).getDate(); // số ngày của tháng dương mm
      for (let dd = 1; dd <= dim; dd++) {
        const al = (convertDuongToAm(dd, mm, yy, 12) as Rec)?.amLich as Rec | undefined;
        if (al && Number(al.day) === ld && Number(al.month) === lm && Number(al.year) === ly) {
          return { day: dd, month: mm, year: yy };
        }
      }
    }
  }
  return null;
}

export type Laso = Rec;

export interface ComputeLasoResult {
  ok: boolean;
  error?: string;
  ls?: Laso;
}

/**
 * Tính lá số từ tham số sinh. Hiện hỗ trợ ngày DƯƠNG lịch.
 * (isLunar = true chưa hỗ trợ chuyển ngược — sẽ bổ sung sau.)
 */
export function computeLaso(birth: BirthParams, namXem?: number): ComputeLasoResult {
  const { day, month, year, hourBranch, gender, isLunar } = birth;

  if (!day || !month || !year) {
    return { ok: false, error: 'Thiếu ngày/tháng/năm sinh dương lịch.' };
  }
  if (hourBranch == null || hourBranch < 0 || hourBranch > 11) {
    return { ok: false, error: 'Thiếu hoặc sai giờ sinh (cần địa chi giờ 0=Tý..11=Hợi).' };
  }
  if (gender !== 'nam' && gender !== 'nu') {
    return { ok: false, error: 'Thiếu giới tính (nam/nu).' };
  }
  try {
    const { convertDuongToAm, anSaoLaSo } = loadEngine();
    // Ngày ÂM lịch → quy đổi sang DƯƠNG trước (server tự làm, KHÔNG để LLM đổi).
    let dd = day,
      mm = month,
      yy = year;
    if (isLunar) {
      const solar = lunarToSolar(day, month, year);
      if (!solar) {
        return { ok: false, error: 'Không đổi được ngày âm lịch sang dương — kiểm tra lại ngày/tháng/năm âm.' };
      }
      dd = solar.day;
      mm = solar.month;
      yy = solar.year;
    }
    const hour = GIO_HOURS[hourBranch];
    const conv = convertDuongToAm(dd, mm, yy, hour) as Rec;
    if (!conv?.amLich) return { ok: false, error: 'Không chuyển được sang âm lịch.' };
    const al = conv.amLich as Rec;

    const view = namXem ?? currentNamXem();
    const ls = (anSaoLaSo as (o: object) => Rec)({
      ngayAL: al.day,
      thangAL: al.month,
      // namAL = năm ÂM lịch (al.year), KHÔNG phải năm dương input. Người
      // sinh tháng 1 trước Tết có năm âm = năm trước → tuổi mụ (tuoiXem)
      // và tiểu vận phụ thuộc vào đây. Phải khớp client (anSaoLaSo dùng
      // conv.amLich.year) để lá số/tuổi y hệt mọi nền tảng.
      namAL: al.year,
      canNam: conv.canNam,
      chiNam: conv.chiNam,
      gioIdx: hourBranch,
      gioitinh: gender,
      namXem: view,
      // Chat hỏi tiểu/nguyệt/nhật vận nhiều năm → server nới cửa sổ ±10 năm
      // (client/biểu đồ nến giữ mặc định ±5). Không tốn token LLM: mảng này
      // chỉ dùng server-side cho tool tra_*, KHÔNG nhồi vào prompt.
      tieuVanWindow: 10,
    });
    if (!ls) return { ok: false, error: 'Engine không trả về lá số.' };
    return { ok: true, ls };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi engine' };
  }
}

// ── Format context lá số cho LLM (đầy đủ 12 cung) ───────────
// LLM CHỈ luận trên context này — không tự bịa số liệu.
function starFmt(s: unknown): string {
  if (!s) return '';
  if (typeof s !== 'object') return String(s);
  const o = s as Rec;
  let t = String(o.ten || '');
  if (o.brightness) t += '(' + o.brightness + ')';
  if (o.hoa) t += '[Hóa ' + o.hoa + ']';
  return t;
}
function starName(s: unknown): string {
  return typeof s === 'object' && s ? String((s as Rec).ten || '') : String(s || '');
}

// Luật tối thượng: model phải ĐỌC nhãn cung engine, KHÔNG tự an lại. Đặt NGAY
// đầu khối dữ liệu (cả tool_result lẫn embedded) — đã gặp lỗi model tự suy cung
// Mệnh bằng cách quy đổi tháng dương↔âm SAI (dùng tháng 6 dương thay tháng 5 âm)
// → dán Mệnh lệch 1 cung dù sao theo địa chi vẫn đúng.
export const LASO_AUTHORITY_RULE =
  '⚠️ DỮ LIỆU LÁ SỐ DƯỚI ĐÂY DO ENGINE AN SẴN — CHÍNH XÁC TUYỆT ĐỐI, KHÔNG ĐƯỢC TÍNH LẠI:\n' +
  '• Cung Mệnh (nhãn ★MỆNH), Cung Thân (◆THÂN) và vị trí MỌI sao đã được engine an đúng (ngày DƯƠNG đã quy đổi ÂM LỊCH chuẩn rồi). TUYỆT ĐỐI KHÔNG tự an sao, KHÔNG tự suy/tính lại cung Mệnh–Thân, KHÔNG tự quy đổi tháng dương sang tháng âm để đoán cung.\n' +
  '• Khi cần nói "Mệnh nằm cung nào / có chính tinh gì", ĐỌC ĐÚNG cung gắn nhãn ★MỆNH trong bảng — KHÔNG dịch sang cung bên cạnh. Nếu trí nhớ/suy luận của bạn khác bảng thì BẢNG ĐÚNG, bạn SAI.\n\n';

export function formatLasoContext(ls: Laso): string {
  const palaces = (ls.palaces as Rec[]) || [];
  let ctx = LASO_AUTHORITY_RULE;

  // Khóa cứng kết luận an sao ngay đầu — anchor crisp để model không tự dời Mệnh.
  const menhP = palaces.find((p) => p.isMenh);
  const thanP = palaces.find((p) => p.isThan);
  if (menhP) {
    const ms =
      ((menhP.majorStars as unknown[]) || []).map(starName).filter(Boolean).join(', ') || 'vô chính diệu';
    ctx += `KẾT LUẬN AN SAO (khóa cứng — luận ĐÚNG theo đây): Mệnh tại cung ${menhP.diaChi} — chính tinh ${ms}.`;
    if (thanP) ctx += ` Thân tại cung ${thanP.diaChi}.`;
    ctx += '\n\n';
  }

  if (ls.canChiNam) ctx += 'Can Chi năm sinh: ' + ls.canChiNam + '\n';
  if (ls.napAm) ctx += 'Nạp Âm: ' + ls.napAm + ' (' + (ls.napAmHanh || '') + ')\n';
  if (ls.menhDC) ctx += 'Mệnh (địa chi): ' + ls.menhDC + '\n';
  if (ls.thanDC) ctx += 'Thân (địa chi): ' + ls.thanDC + '\n';
  if (ls.tuoiXem) ctx += 'Tuổi xem: ' + ls.tuoiXem + '\n';

  if (Array.isArray(ls.cachCuc) && ls.cachCuc.length) {
    const cc = (ls.cachCuc as Rec[])
      .map((c) =>
        typeof c === 'object'
          ? `${c.ten}${c.cung ? ` [Cung ${c.cung}]` : ''}${c.loai ? ` (${c.loai})` : ''}`
          : c,
      )
      .filter(Boolean);
    if (cc.length) ctx += 'Cách cục toàn cục: ' + cc.join('; ') + '\n';
  }

  // CỐ Ý KHÔNG đưa đại vận vào bản kê cấu trúc này. Đại vận là tầng THỜI
  // GIAN, chỉ MƯỢN cung làm chỗ đứng — đưa kèm theo cung khiến LLM lấy điểm
  // đại vận chấm cho cung khi luận cung (lỗi đã gặp). Khi user hỏi về
  // năm/vận hạn, LLM gọi tool tra_tieu_van/tra_nguyet_van/tra_nhat_van —
  // các tool đó trả đại vận đầy đủ (kèm cung nó đóng). Bản kê này CHỈ mô tả
  // CẤU TRÚC tĩnh của lá số (12 cung + cách cục) để luận cung cho sạch.

  // Cách cục đặc biệt gắn THEO CUNG (engine trả mảng global ls.cachCuc, mỗi
  // phần tử có trường .cung) + ý nghĩa từng cung (ls.cachCucTungCung). Trước
  // đây hàm đọc p.cachCuc (engine KHÔNG set per-palace) nên cách cục như
  // "Nhật Nguyệt Chiếu Bích" của cung Điền không bao giờ hiện trong block cung
  // → LLM bỏ sót. Nay filter đúng cung, kèm moTa/chiTiet.
  const cachCucList = (Array.isArray(ls.cachCuc) ? ls.cachCuc : []) as Rec[];
  const ynByCung = ((ls.cachCucTungCung as Record<string, string[]>) || {});

  ctx += '\n=== 12 CUNG ===\n';
  for (const p of palaces) {
    const pName = String(p.cungName || '');
    ctx += '\nCung ' + pName + ' (' + (p.diaChi || '') + ')' + (p.isMenh ? ' ★MỆNH' : '') + (p.isThan ? ' ◆THÂN' : '') + ':\n';
    const chinh = ((p.majorStars as unknown[]) || []).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '  Chính tinh: ' + chinh.join(', ') + '\n';
    const phu = ((p.stars as Rec[]) || [])
      .filter((s) => (typeof s === 'object' ? s.nhom !== 'chinh' : true))
      .map(starFmt)
      .filter(Boolean);
    if (phu.length) ctx += '  Phụ tinh: ' + phu.slice(0, 8).join(', ') + '\n';
    // Chỉ cách cục gắn ĐÍCH DANH cung này (hoặc Thân nếu đây là cung Thân).
    // Cách cục toàn cục (cung==='') đã nằm ở dòng "Cách cục toàn cục" phía
    // trên → không lặp vào từng cung cho đỡ rối/tốn token.
    // LƯU Ý: cách phủ ≥2 cung được engine gán cung GHÉP "X/Y" (vd Triệt Đáo
    // Kim Cung = "Quan Lộc/Nô Bộc"). Phải TÁCH '/' rồi kiểm tra thành viên,
    // không so khớp chính xác — nếu không cách đó không neo vào cung nào.
    const ccThis = cachCucList.filter((c) => {
      const parts = String(c.cung || '').split('/');
      return parts.includes(pName) || (p.isThan && parts.includes('Thân'));
    });
    ccThis.forEach((c) => {
      const mota = c.moTa ? ': ' + c.moTa : '';
      const chiTiet = c.chiTiet ? ' — ' + c.chiTiet : '';
      ctx += '  Cách cục — ' + (c.ten || '') + (c.loai ? ' (' + c.loai + ')' : '') + mota + chiTiet + '\n';
    });
    const ynThis = ynByCung[pName] || [];
    if (ynThis.length) ctx += '  Ý nghĩa: ' + ynThis.slice(0, 6).join(' | ') + '\n';
  }

  // (Danh sách 9 đại vận CỐ Ý không đưa vào đây — xem ghi chú trên. Đại vận
  // đến qua tool tra_* khi user hỏi về thời gian/vận hạn.)

  return ctx;
}

/**
 * Thẻ lá số DETERMINISTIC để GỬI THẲNG cho người dùng (kênh chat không có lưới
 * trực quan như web). Đây là NGUỒN SỰ THẬT người dùng nhận — engine render,
 * LLM KHÔNG đụng vào → dù LLM luận có lệch nhãn cung thì thẻ này vẫn đúng.
 * Chỉ liệt kê chính tinh + tứ hóa (bộ khung); phụ tinh để LLM luận.
 */
export function renderLasoCard(ls: Laso, birth?: BirthParams | null): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const menh = palaces.find((p) => p.isMenh) as Rec | undefined;
  const than = palaces.find((p) => p.isThan) as Rec | undefined;
  const menhStars =
    ((menh?.majorStars as unknown[]) || []).map(starFmt).filter(Boolean).join(', ') || 'Vô chính diệu';

  let s = '🗂 LÁ SỐ (hệ thống lập tự động — số liệu chuẩn xác):\n';
  const bits: string[] = [];
  if (birth) {
    bits.push(birth.gender === 'nu' ? 'Nữ' : 'Nam');
    bits.push(`${birth.day}/${birth.month}/${birth.year} DL`);
    if (birth.hourBranch != null && birth.hourBranch >= 0 && birth.hourBranch < 12) {
      bits.push('giờ ' + CHI_NAMES[birth.hourBranch]);
    }
  }
  if (ls.canChiNam) bits.push(String(ls.canChiNam));
  if (ls.cuc) bits.push(String(ls.cuc));
  if (bits.length) s += bits.join(' · ') + '\n';
  if (ls.napAm) {
    const na = String(ls.napAm);
    const hanh = ls.napAmHanh ? String(ls.napAmHanh) : '';
    s += 'Nạp âm: ' + na + (hanh && hanh !== na ? ` (hành ${hanh})` : '') + '\n';
  }
  s += `★ Mệnh ${menh?.diaChi || '?'}: ${menhStars}` + (than ? ` · ◆ Thân ${than.diaChi}` : '') + '\n\n';

  for (const p of palaces) {
    const stars =
      ((p.majorStars as unknown[]) || []).map(starFmt).filter(Boolean).join(', ') || 'Vô chính diệu';
    const mark = p.isMenh ? '★' : p.isThan ? '◆' : '·';
    s += `${mark} ${p.cungName || ''} (${p.diaChi || ''}): ${stars}\n`;
  }
  return s.trimEnd();
}

/** Tóm tắt 1 dòng để hiển thị nhãn tool_call cho client. */
export function lasoSummary(ls: Laso): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const menh = palaces.find((p) => p.isMenh) as Rec | undefined;
  const menhStars = (((menh?.majorStars as unknown[]) || []) as unknown[]).map(starName).filter(Boolean);
  return [
    ls.canChiNam ? String(ls.canChiNam) : '',
    menh ? 'Mệnh ' + (menhStars.join(', ') || menh.diaChi) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
