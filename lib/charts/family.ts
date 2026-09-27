// lib/charts/family.ts
// ============================================================
// "Cả nhà mình" (docs/DAC-TRUNG-PLAN.md) — đọc các lá số NGƯỜI NHÀ trong Sổ
// Lá Số (`user_charts.relation = 'gia_dinh'`) cho rail chat.
//
// Chỉ ĐỌC. Ghi/sửa nhóm vẫn đi qua `app/api/charts` như cũ — một cửa ghi.
// userId LUÔN do server truyền (đã xác thực), không bao giờ lấy từ tham số
// tool: model bịa id là đọc được sổ của người khác.
// ============================================================

import type { BirthParams } from '@/lib/contract/v1';
import type { ChartBirth } from '@/lib/charts/key';
import { birthParamsFromChart } from '@/lib/reports/chartMatch';

export interface FamilyMember {
  /** `user_charts.id` — khoá mà `addressMember` (lib/contract/v1.ts) trỏ tới. */
  id: number;
  /** Tên gọi trong sổ ("Anh Tuấn", "Bé An"). */
  ten: string;
  birth: BirthParams;
  /** Vai trong nhà — thẻ mời trong chat ghi vào `birth.vaiTro`; mục lưu từ
   *  nơi khác thì suy từ tên gọi ("Chồng", "Mẹ"…), không suy được là null. */
  vaiTro: VaiTro | null;
}

export type VaiTro = 'chong' | 'vo' | 'con' | 'bo' | 'me';
const VAI_TRO: VaiTro[] = ['chong', 'vo', 'con', 'bo', 'me'];

/** Trần số người nhà đọc vào MỘT lượt — mỗi người là một lá số phải an sao. */
export const MAX_FAMILY = 6;

/**
 * Người nhà của `userId`, mới dùng trước. Đọc hụt → [] (rail chạy như chưa
 * có sổ — mất tính năng một lượt còn hơn chặn cả câu trả lời).
 * `owner` = lá số đang xem ở rail: trùng ngày sinh + giới thì bỏ ra, để người
 * hỏi tự lưu mình vào nhóm "Gia đình" không bị đọc thành "người nhà".
 */
export async function listFamily(userId: string, owner?: BirthParams | null): Promise<FamilyMember[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || !userId) return [];
  try {
    const r = await fetch(
      `${url}/rest/v1/user_charts?user_id=eq.${encodeURIComponent(userId)}&relation=eq.gia_dinh` +
        `&select=id,label,birth&order=last_used_at.desc&limit=${MAX_FAMILY + 1}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!r.ok) {
      console.error('[family] đọc sổ người nhà hỏng:', r.status);
      return [];
    }
    const rows = (await r.json()) as { id: number; label: string | null; birth: ChartBirth }[];
    const out: FamilyMember[] = [];
    for (const row of rows) {
      const b = birthParamsFromChart(row.birth || {});
      if (!b) continue;
      if (owner && sameBirth(b, owner)) continue;
      const ten = String(row.label || row.birth?.hoten || '').trim() || `Người nhà ${b.year}`;
      const vt = VAI_TRO.includes(row.birth?.vaiTro as VaiTro) ? (row.birth.vaiTro as VaiTro) : vaiTroTuTen(ten);
      out.push({ id: Number(row.id), ten, birth: { ...b, name: ten }, vaiTro: vt });
      if (out.length >= MAX_FAMILY) break;
    }
    return out;
  } catch (e) {
    console.error('[family] đọc sổ người nhà lỗi:', (e as Error)?.message);
    return [];
  }
}

function sameBirth(a: BirthParams, b: BirthParams): boolean {
  return (
    Number(a.day) === Number(b.day) &&
    Number(a.month) === Number(b.month) &&
    Number(a.year) === Number(b.year) &&
    (a.gender || 'nam') === (b.gender || 'nam')
  );
}

/** Gấp dấu để so tên gõ tay với tên trong sổ ("anh tuan" ≈ "Anh Tuấn"). */
function fold(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tìm người nhà theo tên model truyền: trùng hẳn trước, rồi mới chứa nhau. */
export function findMember(list: FamilyMember[], ten: unknown): FamilyMember | null {
  const q = fold(String(ten || '').replace(/^@/, ''));
  if (!q) return null;
  return (
    list.find((m) => fold(m.ten) === q) ||
    list.find((m) => fold(m.ten).includes(q) || q.includes(fold(m.ten))) ||
    null
  );
}

/** "Chồng" / "Mẹ Hoa" / "Bé An" → vai. Chỉ khớp TỪ ĐẦU tên gọi, GIỮ dấu —
 *  gấp dấu thì "Bà ngoại" thành "ba" = bố. */
function vaiTroTuTen(ten: string): VaiTro | null {
  const t = String(ten || '').toLowerCase().normalize('NFC').trim();
  const dau = (re: string) => new RegExp(`^(${re})(\\s|$)`).test(t);
  if (dau('chồng|ông xã|anh xã')) return 'chong';
  if (dau('vợ|bà xã')) return 'vo';
  if (dau('con|bé')) return 'con';
  if (dau('bố|ba|cha')) return 'bo';
  if (dau('mẹ|má')) return 'me';
  return null;
}

/**
 * Người hỏi nhắc tới ai trong nhà ở câu này? Chỉ bắt CỤM ĐỦ NGHĨA — "con" đứng
 * một mình là cách khách tự xưng với thầy ("con muốn hỏi…"), không phải con cái.
 * "vợ chồng tôi" là chuyện hai người, không phải hỏi về một người ⇒ bỏ qua.
 */
export function vaiTroTrongCau(q: string): VaiTro | null {
  const t = String(q || '').toLowerCase().normalize('NFC');
  if (/vợ chồng/.test(t)) return null;
  const ai = '(tôi|em|mình|con|cháu|chị|tớ|tui)';
  if (new RegExp(`(chồng|ông xã) ${ai}(\\s|$|[,.?!])`).test(t) || /(^|\s)(ông xã|anh xã)(\s|$|[,.?!])/.test(t)) return 'chong';
  if (new RegExp(`(vợ|bà xã) ${ai}(\\s|$|[,.?!])`).test(t) || /(^|\s)bà xã(\s|$|[,.?!])/.test(t)) return 'vo';
  if (new RegExp(`(^|\\s)(bố|ba|cha) ${ai}(\\s|$|[,.?!])`).test(t)) return 'bo';
  if (new RegExp(`(^|\\s)(mẹ|má) ${ai}(\\s|$|[,.?!])`).test(t)) return 'me';
  // Con cái xét SAU bố/mẹ: "mẹ con tôi" là mẹ của người hỏi (tự xưng "con").
  if (/(con (trai|gái)|đứa con|bé nhà|con của (tôi|em|mình))/.test(t) || new RegExp(`(^|\\s)con (tôi|em|mình|chị)(\\s|$|[,.?!])`).test(t)) return 'con';
  return null;
}

/**
 * Có nên mời thêm lá số người này không (GĐ2 "Cả nhà mình")? Chỉ mời khi chắc
 * sổ CHƯA có: có người nhà nào không rõ vai (lưu từ chỗ khác, tên không nói
 * vai) thì IM — có thể chính là người đó, mời trùng là làm phiền.
 */
export function canMoiThem(vai: VaiTro | null, family: FamilyMember[]): boolean {
  if (!vai) return false;
  if (family.some((m) => m.vaiTro === null)) return false;
  // "con" thì nhà có thể có nhiều con — đã có một đứa thì thôi, không đoán.
  return !family.some((m) => m.vaiTro === vai);
}
