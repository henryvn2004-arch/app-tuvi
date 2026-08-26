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

// Tên 12 địa chi theo index (cho nhãn giờ trong thẻ lá số). EXPORT để các route
// khác cần gán nhãn giờ (vd tra `laso_public` theo slug) dùng CHUNG, không tự
// chép một bảng thứ hai rồi trôi khỏi nhau.
export const CHI_NAMES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CAN_NAMES = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];

// Năm ÂM lịch → Can/Chi (parity với engine đã verify 96/96, 1940–2035). Dùng khi
// người dùng NHẬP SẴN ngày âm → an sao thẳng, không cần vòng qua dương lịch.
function yearCan(y: number): string {
  return CAN_NAMES[(((y + 6) % 10) + 10) % 10];
}
function yearChi(y: number): string {
  return CHI_NAMES[(((y + 8) % 12) + 12) % 12];
}

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
// Nạp CHUNG tuvi-ansao-engine.js + tuvi-laso-format.js trong CÙNG một
// new Function scope (nối chuỗi source rồi chạy 1 lần) — formatLaSoV2 tham
// chiếu STAR_DATA như biến tự do (free variable), phải cùng closure với
// engine mới resolve đúng (STAR_DATA là `const` top-level trong engine, KHÔNG
// phải property của window/globalThis nếu load riêng qua 2 lần new Function).
let engineCache: {
  convertDuongToAm: (...a: unknown[]) => unknown;
  anSaoLaSo: (...a: unknown[]) => unknown;
  formatLaSoV2: (...a: unknown[]) => unknown;
  buildDaiVanLines: (...a: unknown[]) => unknown;
} | null = null;

function loadEngine() {
  if (engineCache) return engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const formatCode = readFileSync(join(process.cwd(), 'public', 'tuvi-laso-format.js'), 'utf-8');
  const g = globalThis as Rec;
  g.window = g;
  if (!g.location) {
    g.location = { protocol: 'https:', hostname: 'tuviminhbao.com', host: 'tuviminhbao.com', port: '', href: 'https://tuviminhbao.com/', pathname: '/', search: '', hash: '' };
  }
  engineCache = (new Function(
    'window',
    'globalThis',
    code + '\n' + formatCode +
      '\nreturn{convertDuongToAm,anSaoLaSo,formatLaSoV2:window.formatLaSoV2,buildDaiVanLines:window.buildDaiVanLines};',
  ))(g, g) as typeof engineCache;
  return engineCache!;
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
    const view = namXem ?? currentNamXem();

    // An sao VỐN dùng ÂM lịch. Hai đường vào cho ra cùng bộ tham số (ngayAL,
    // thangAL, namAL, canNam, chiNam):
    let ngayAL: number, thangAL: number, namAL: number, canNam: string, chiNam: string;
    if (isLunar) {
      // Người dùng NHẬP SẴN âm lịch → an THẲNG, KHÔNG vòng qua dương lịch rồi đổi
      // ngược (vô ích + thừa rủi ro). Can/chi năm suy trực tiếp từ năm âm.
      ngayAL = Math.floor(day);
      thangAL = Math.floor(month);
      namAL = Math.floor(year);
      if (thangAL < 1 || thangAL > 12 || ngayAL < 1 || ngayAL > 30) {
        return { ok: false, error: 'Ngày/tháng âm lịch không hợp lệ (tháng 1–12, ngày 1–30).' };
      }
      canNam = yearCan(namAL);
      chiNam = yearChi(namAL);
    } else {
      // Người dùng nhập DƯƠNG → engine quy đổi sang âm. namAL = năm ÂM (al.year),
      // KHÔNG phải năm dương: người sinh tháng 1 trước Tết có năm âm = năm trước
      // → tuổi mụ (tuoiXem) + tiểu vận phụ thuộc vào đây (khớp client mọi nền tảng).
      const conv = convertDuongToAm(day, month, year, GIO_HOURS[hourBranch]) as Rec;
      if (!conv?.amLich) return { ok: false, error: 'Không chuyển được sang âm lịch.' };
      const al = conv.amLich as Rec;
      ngayAL = al.day as number;
      thangAL = al.month as number;
      namAL = al.year as number;
      canNam = conv.canNam as string;
      chiNam = conv.chiNam as string;
    }

    const ls = (anSaoLaSo as (o: object) => Rec)({
      ngayAL,
      thangAL,
      namAL,
      canNam,
      chiNam,
      gioIdx: hourBranch,
      gioitinh: gender,
      namXem: view,
    });
    if (!ls) return { ok: false, error: 'Engine không trả về lá số.' };
    // `anSaoLaSo` KHÔNG re-expose `chiNam` ở cấp 1 (nó chỉ dùng nội bộ để an
    // sao). Client vá tay đúng chỗ này — `app-xem-tuoi.html` có dòng
    // `ls.chiNam = conv.chiNam` kèm chú thích y hệt — còn server thì chưa, nên
    // bản server thiếu địa chi năm.
    // 🔑 Hậu quả đo được: `chiRelation(chiNamA, chiNamB)` của `tuong-hop.js`
    // nhận HAI CHUỖI RỖNG → `dc1 === dc2` → trả "Cùng chi" 8/10 cho MỌI cặp.
    // Gắn lại ở đây để server và trình duyệt cùng một lá số; thêm trường là
    // thay đổi CỘNG THÊM, không đụng consumer nào đang chạy.
    if (!ls.chiNam) ls.chiNam = chiNam;
    return { ok: true, ls };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi engine' };
  }
}

/**
 * Text đầy đủ "=== LÁ SỐ TỬ VI ===...=== 12 CUNG ===...=== 9 ĐẠI VẬN ===
 * ...=== CÁCH CỤC & NHẬN ĐỊNH ===" — ĐÚNG format `formatLaSoV2()` mà
 * luan-giai.html dùng client-side (tam phương/tứ chiếu, cách cục toàn cục,
 * nhãn "Luận sao" xu hướng...). Dùng để tái sử dụng NGUYÊN flow luận giải
 * 24-mục (`/api/lasotuvi` mode=phan) cho các route server-side khác cần
 * luận 1 cung cụ thể (vd chân dung vợ chồng → luận Phu Thê).
 */
export function formatLaSoV2(ls: Laso): string {
  const { formatLaSoV2: fn } = loadEngine();
  return String((fn as (o: unknown) => unknown)(ls) || '');
}

/**
 * Khối text của MỘT đại vận (0-based) — CHÍNH hàm `buildDaiVanLines` mà
 * `formatLaSoV2` dùng, không phải bản chép lại. Rail (`lib/agent/prompts.ts`)
 * gọi cái này để nói cùng một thứ với trang luận giải.
 *
 * Trước đây rail tự dựng một dòng gọn `ĐVn: … sao=… điểm=…` → thiếu hẳn
 * [LUẬN ĐOÁN]/[CẢNH BÁO]/[TAM PHƯƠNG TỨ CHÍNH]/Tuần-Triệt, nên hỏi rail về một
 * giai đoạn thì nó luận chay theo tên chính tinh.
 *
 * FAIL-SOFT: engine nạp hụt → trả `[]`, chỗ gọi giữ nguyên bản gọn cũ. Rail là
 * đường nóng, chết vì đọc file là đổi một bản luận nhạt lấy một lượt chat hỏng.
 */
export function daiVanLines(ls: Laso, index: number, opts?: { compact?: boolean }): string[] {
  try {
    const { buildDaiVanLines: fn } = loadEngine();
    if (typeof fn !== 'function') return [];
    const out = (fn as (a: unknown, b: number, c: unknown) => unknown)(ls, index, opts || {});
    return Array.isArray(out) ? (out as string[]) : [];
  } catch (e) {
    console.error('[laso] daiVanLines lỗi — rail rơi về bản gọn:', e instanceof Error ? e.message : e);
    return [];
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
    // RANK theo độ quyết đoán: cách "tốt"/"xấu" (phán mạnh) lên trước, "trung"
    // xuống sau → cái nặng ký nằm đầu, gắn nhãn [nặng ký] để LLM biết chỗ neo phán quyết.
    const ccWeight = (c: Rec): number => {
      const l = String(c.loai || '').toLowerCase();
      // Bộ loai engine phanTichCachCuc: quý/phú/bần tiện cục = phán mạnh (nặng
      // ký); thân cư / tạp cục = vừa; mệnh cơ bản = nền tảng. (+ tốt/xấu/trung
      // của cach_cuc_all.json cho path khác — vô hại.)
      if (l === 'quy_cuc' || l === 'phu_cuc' || l === 'ban_tien_cuc' || l === 'tốt' || l === 'xấu') return 2;
      if (l === 'than_cu' || l === 'tap_cuc' || l === 'trung') return 1;
      return 0;
    };
    [...ccThis].sort((a, b) => ccWeight(b) - ccWeight(a)).forEach((c) => {
      const mota = c.moTa ? ': ' + c.moTa : '';
      const chiTiet = c.chiTiet ? ' — ' + c.chiTiet : '';
      const mark = ccWeight(c) === 2 ? '[nặng ký] ' : '';
      ctx += '  Cách cục — ' + mark + (c.ten || '') + (c.loai ? ' (' + c.loai + ')' : '') + mota + chiTiet + '\n';
    });
    const ynThis = ynByCung[pName] || [];
    if (ynThis.length) ctx += '  Ý nghĩa: ' + ynThis.slice(0, 10).join(' | ') + '\n';
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
    bits.push(`${birth.day}/${birth.month}/${birth.year} ${birth.isLunar ? 'ÂL' : 'DL'}`);
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

/**
 * Slug NHẬN DIỆN một lá số trong bảng `laso_public` — NGUỒN DUY NHẤT (port từ
 * `app/api/save-laso/route.ts`, nguyên văn, không đổi một ký tự nào). Trước đây
 * hàm này CHỈ sống trong route đó (không export được — Next chặn export lạ
 * trong file `route.ts`); nay `app/api/van-han-nam/route.ts` cũng cần đúng
 * công thức này để tra lại lá số đã có sẵn Luận Giải. Hai route tự chép hàm
 * này thì slug sẽ trôi khỏi nhau lúc nào không biết — đúng bệnh CLAUDE.md đã
 * ghi nhiều lần.
 *
 * `toolType` (vd 'tu-binh') thêm TIỀN TỐ để mỗi sản phẩm lưu vào slug RIÊNG,
 * tránh đè lẫn nhau khi CÙNG một lá số (canChiNam+ngày sinh+giờ) được dùng cho
 * nhiều tool khác nhau (`laso_public` dùng chung 1 bảng cho mọi tool). Bỏ
 * trống hoặc `'laso'` = KHÔNG tiền tố — tương thích ngược với slug/link Luận
 * Giải 24 phần đang chia sẻ ngoài kia.
 */
export function makeLasoSlug(
  canChiNam: string,
  gioiTinh: string,
  ngaySinh: string,
  thangSinh: string,
  namSinh: string,
  gioChi: string,
  toolType?: string,
): string {
  const rm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, '-');
  const dd = ngaySinh ? String(ngaySinh).padStart(2, '0') : '';
  const mm = thangSinh ? String(thangSinh).padStart(2, '0') : '';
  const base = [
    rm(canChiNam || ''),
    dd,
    mm,
    namSinh || '',
    gioiTinh === 'nu' ? 'nu' : 'nam',
    gioChi ? 'gio-' + rm(gioChi) : '',
  ]
    .filter(Boolean)
    .join('-');
  if (toolType && toolType !== 'laso') return rm(toolType) + '-' + base;
  return base;
}
