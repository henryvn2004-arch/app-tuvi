// app/api/reports/snapshot/route.ts
// POST — shell.js lưu bản chụp báo cáo đang hiện (payload nút Chia sẻ).
// GET ?id=<uuid> | ?id=lp:<slug> — trang Báo cáo mở một báo cáo để XEM.
// Cả hai đều theo user đã xác thực; bảng `report_snapshots` không có policy
// SELECT nên chỉ đọc được qua đây (service key, tự lọc user_id).
// Xem lib/reports/snapshots.ts về hai nguồn và hình dạng khối.
export const maxDuration = 15;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { classifyLuanGiaiSlug } from '@/lib/pdf/luan-giai-slug';
import { snapshotRow, saveSnapshot, legacyLuanBlocks, LEGACY_TOOL } from '@/lib/reports/snapshots';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);
  const b = await parseBody(request);

  const row = snapshotRow(auth.user.id, b);
  if (typeof row === 'string') return err(row, 400);
  const id = await saveSnapshot(row);
  if (!id) return err('Không lưu được báo cáo', 502);
  return ok({ saved: true, id });
}

export async function GET(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);
  const id = String(new URL(request.url).searchParams.get('id') || '');

  try {
    if (id.startsWith('lp:')) {
      const slug = id.slice(3);
      const tool = classifyLuanGiaiSlug(slug);
      if (!tool) return err('Không tìm thấy báo cáo', 404);
      const lpRes = await fetch(
        `${SUPABASE_URL}/rest/v1/laso_public?slug=eq.${encodeURIComponent(slug)}` +
          `&select=slug,user_id,person_name,ngay_sinh,thang_sinh,nam_sinh,luan_giai&limit=1`,
        { headers: SB_HEADERS, cache: 'no-store' },
      );
      const lp = lpRes.ok ? ((await lpRes.json()) as Record<string, unknown>[])[0] : null;
      if (!lp) return err('Không tìm thấy báo cáo', 404);
      // Sở hữu: lá số gắn user_id của mình, HOẶC mình đã trả tiền cho đúng slug
      // (user_reports) — cùng hai đường /api/reports dùng để liệt kê.
      if (lp.user_id !== auth.user.id) {
        const urRes = await fetch(
          `${SUPABASE_URL}/rest/v1/user_reports?user_id=eq.${encodeURIComponent(auth.user.id)}` +
            `&slug=eq.${encodeURIComponent(slug)}&select=slug&limit=1`,
          { headers: SB_HEADERS, cache: 'no-store' },
        );
        const owned = urRes.ok && ((await urRes.json()) as unknown[]).length > 0;
        if (!owned) return err('Không tìm thấy báo cáo', 404);
      }
      const blocks = legacyLuanBlocks(lp.luan_giai);
      if (!blocks.length) return err('Báo cáo này chưa được lưu nội dung', 404);
      const ngay = [lp.ngay_sinh, lp.thang_sinh, lp.nam_sinh].every((v) => v != null)
        ? `${lp.ngay_sinh}/${lp.thang_sinh}/${lp.nam_sinh}`
        : '';
      return ok({
        id,
        toolId: LEGACY_TOOL[tool].toolId,
        toolLabel: LEGACY_TOOL[tool].label,
        title: LEGACY_TOOL[tool].label,
        subtitle: [lp.person_name, ngay].filter(Boolean).join(' · '),
        imageUrl: null,
        blocks,
      });
    }

    if (!/^[0-9a-f-]{36}$/.test(id)) return err('Không tìm thấy báo cáo', 404);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/report_snapshots?id=eq.${id}&user_id=eq.${encodeURIComponent(auth.user.id)}` +
        `&select=id,tool_id,tool_label,title,subtitle,image_url,blocks,updated_at&limit=1`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) {
      console.error('[reports/snapshot] get', res.status);
      return err('Không đọc được báo cáo', 502);
    }
    const r = ((await res.json()) as Record<string, unknown>[])[0];
    if (!r) return err('Không tìm thấy báo cáo', 404);
    return ok({
      id: r.id,
      toolId: r.tool_id,
      toolLabel: r.tool_label,
      title: r.title,
      subtitle: r.subtitle,
      imageUrl: r.image_url,
      blocks: r.blocks,
      updatedAt: r.updated_at,
    });
  } catch (e: unknown) {
    console.error('[reports/snapshot] get', e);
    return err((e as Error).message);
  }
}
