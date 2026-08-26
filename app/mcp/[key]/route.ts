// app/mcp/[key]/route.ts
// ============================================================
// MCP endpoint CÓ KEY (Streamable HTTP) — hạn mức theo gói của từng key.
// URL: https://tuviminhbao.com/mcp/<key>
//
// Bản CÔNG KHAI không key nằm ở `app/mcp/route.ts` (mục #9/14); phần dùng
// chung — danh sách tool, INSTRUCTIONS, cách bọc kết quả — ở `lib/mcp/server.ts`.
// Khác nhau DUY NHẤT là cách lấy `McpKeyInfo`.
//
// mcp-handler v2 trả về một hàm web chuẩn `(Request) => Response` PHỤC VỤ MỌI
// request nó nhận — định tuyến là việc của Next. Vẫn dựng handler theo request
// vì `key` nằm trong path và closure của tool phải bắt đúng key của lượt đó.
// ============================================================

import { validateKey, HUONG_DAN_LAY_KEY } from '@/lib/mcp/auth';
import { buildMcpHandler } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(req: Request, params: { key: string } | Promise<{ key: string }>) {
  const { key } = await params;
  const handler = buildMcpHandler(async () => {
    const v = await validateKey(key);
    if (!v.ok || !v.info) return { error: v.error || HUONG_DAN_LAY_KEY };
    return { info: v.info };
  }, key);
  return handler(req);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: Request, ctx: any) {
  return handle(req, ctx.params);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: Request, ctx: any) {
  return handle(req, ctx.params);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(req: Request, ctx: any) {
  return handle(req, ctx.params);
}
