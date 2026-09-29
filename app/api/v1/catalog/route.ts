// app/api/v1/catalog/route.ts
// GET — danh mục công cụ cho client không phải web (Zalo Mini App, app native).
// Web tự đọc `tool_pricing` qua public/tool-prices.js; client khác KHÔNG chép số
// giá nên hỏi ở đây. Nhóm/thứ tự = `toolCatalog()` (cùng luật với /app/cong-cu),
// giá = `getToolPrice()` (đã áp khuyến mãi — đúng số sẽ bị trừ) quy ra VNĐ theo
// `vndPerCredit()`. Không đọc được giá ⇒ `price: null`, client hiện "…" chứ không đoán.
import { NextResponse } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import { toolCatalog } from '@/lib/channels/catalog';
import { getToolPrice } from '@/lib/billing/pricing';
import { vndPerCredit } from '@/lib/billing/packages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return options();
}

export async function GET() {
  const [groups, rate] = await Promise.all([toolCatalog(), vndPerCredit()]);
  const out = await Promise.all(
    groups.map(async (g) => ({
      key: g.key,
      title: g.title,
      tools: await Promise.all(
        g.tools.map(async (t) => {
          const credits = t.isFree ? 0 : await getToolPrice(t.toolId);
          return {
            toolId: t.toolId,
            label: t.label,
            path: t.path,
            description: t.description,
            free: t.isFree,
            // Làm tròn LÊN nghìn — cùng quy tắc `vndLabel()` của tool-prices.js.
            price:
              t.isFree || credits == null || credits <= 0
                ? null
                : { credits, vnd: Math.ceil((credits * rate) / 1000) * 1000 },
          };
        }),
      ),
    })),
  );
  return NextResponse.json(
    { groups: out },
    // Giá sửa trong Admin phải hiện ra nhanh: CDN giữ 2 phút, như cache của tool-prices.js.
    { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  );
}
