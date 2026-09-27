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
}

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
      out.push({ id: Number(row.id), ten, birth: { ...b, name: ten } });
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
