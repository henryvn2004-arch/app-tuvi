// lib/channels/charts.ts
// ============================================================
// SỔ LÁ SỐ THEO TÀI KHOẢN cho kênh chat — cùng bảng `user_charts` với web
// (`/api/charts`, `/app/so-la-so`). Lá số lưu trong Zalo thì mở web thấy ngay
// trong sổ, và ngược lại.
//
// Sổ cũ theo cuộc trò chuyện (`chat_profiles`) vẫn ĐỌC được (lá số đã lưu
// trước bản này không mất), nhưng ghi mới chỉ vào `user_charts`.
// ============================================================

import type { BirthParams } from '@/lib/contract/v1';
import { chartKey, normalizeLabel, type ChartBirth } from '@/lib/charts/key';
import { birthToWeb } from './handoff';
import type { ProfileStore } from './core';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

const num = (v: unknown) => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : undefined;
};

/** Shape web (TuviForm) → BirthParams của contract. */
export function webToBirth(b: ChartBirth, label: string): BirthParams | null {
  const day = num(b.ngay);
  const month = num(b.thang);
  const year = num(b.nam);
  if (!day || !month || !year) return null;
  let hourBranch = num(b.gioIdx);
  const h = num(b.gioHour);
  if (hourBranch == null && h != null) hourBranch = Math.floor(((h + 1) % 24) / 2);
  const lunar = b.isLunar === true || b.amlich === true || b.duongLich === false;
  return {
    day,
    month,
    year,
    hourBranch: hourBranch ?? -1,
    gender: b.gioitinh === 'nu' ? 'nu' : 'nam',
    ...(lunar ? { isLunar: true } : {}),
    ...((b.hoten as string) || label ? { name: String(b.hoten || label) } : {}),
  };
}

async function listCharts(userId: string): Promise<{ name: string; birth: BirthParams }[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_charts?user_id=eq.${encodeURIComponent(userId)}&label=neq.&select=label,birth&order=last_used_at.desc&limit=30`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as { label: string; birth: ChartBirth }[];
    const out: { name: string; birth: BirthParams }[] = [];
    for (const r of rows) {
      const b = webToBirth(r.birth, r.label);
      if (b) out.push({ name: r.label, birth: b });
    }
    return out;
  } catch {
    return [];
  }
}

/** Ghi một lá số vào sổ tài khoản (upsert theo chart_key, như `/api/charts`). */
export async function saveChart(userId: string, label: string, birth: BirthParams): Promise<boolean> {
  const web = birthToWeb(birth);
  if (!SUPABASE_URL || !SUPABASE_KEY || !web) return false;
  const clean = normalizeLabel(label);
  const now = new Date().toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_charts?on_conflict=user_id,chart_key`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        label: clean,
        birth: web,
        chart_key: chartKey(web as ChartBirth, clean),
        updated_at: now,
        last_used_at: now,
      }),
    });
    if (!res.ok) console.error('[chat-charts] lưu lá số lỗi', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('[chat-charts] lưu lá số lỗi mạng', e);
    return false;
  }
}

/**
 * ProfileStore cho người đã có tài khoản: đọc `user_charts` (+ sổ cũ theo
 * cuộc trò chuyện), ghi vào `user_charts`.
 */
export function accountProfiles(userId: string, legacy: ProfileStore): ProfileStore {
  const list = async (chatId: number | string) => {
    const [acc, old] = await Promise.all([listCharts(userId), legacy.list(chatId)]);
    const seen = new Set(acc.map((p) => p.name.toLowerCase()));
    return [...acc, ...old.filter((p) => !seen.has(p.name.toLowerCase()))];
  };
  return {
    list,
    get: async (chatId, name) => {
      const want = (name || '').trim().toLowerCase();
      if (!want) return null;
      return (await list(chatId)).find((p) => p.name.toLowerCase() === want) || null;
    },
    // Lá số ÂM lịch: sổ web chưa chở được (app_birth hiểu là ngày dương) → giữ
    // ở sổ cũ theo cuộc trò chuyện thay vì mất.
    save: async (chatId, name, birth) =>
      birth.isLunar ? legacy.save(chatId, name, birth) : saveChart(userId, name, birth),
  };
}
