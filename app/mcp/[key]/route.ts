// app/mcp/[key]/route.ts
// ============================================================
// MCP endpoint (Streamable HTTP) — remote MCP server chạy trong Next.js.
// URL: https://tuviminhbao.com/mcp/<key>  (key nhúng trong path).
//
// mcp-handler v1.1.0 khớp endpoint bằng SO KHỚP CHÍNH XÁC url.pathname ===
// streamableHttpEndpoint. Vì key động, ta dựng handler THEO REQUEST với
// streamableHttpEndpoint = đúng pathname (/mcp/<key>). disableSse: không
// dùng transport SSE cũ (spec: chỉ Streamable HTTP).
//
// Cả 3 tool: validate key → hết quota/sai key trả message tiếng Việt →
// log usage → chạy. Không tool nào để LLM server sinh nội dung.
// ============================================================

import { createMcpHandler } from 'mcp-handler';
import { validateKey, HUONG_DAN_LAY_KEY } from '@/lib/mcp/auth';
import { logUsage } from '@/lib/mcp/usage';
import type { McpTool } from '@/lib/mcp/tools/_shared';
import { anSaoTool } from '@/lib/mcp/tools/an-sao';
import { vanHanTool } from '@/lib/mcp/tools/van-han';
import { giaiThichTool } from '@/lib/mcp/tools/giai-thich';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TOOLS: McpTool[] = [anSaoTool, vanHanTool, giaiThichTool];

const INSTRUCTIONS = [
  'Máy chủ Tử Vi Đẩu Số của tuviminhbao.com. CHỈ diễn giải dựa trên dữ liệu và block do tool trả về;',
  'TUYỆT ĐỐI không tự bịa quy tắc an sao, không tự tính lại cung/sao/tứ hóa, không tự suy vị trí sao.',
  'Khi người dùng đưa ngày sinh → gọi an_sao trước. Khi hỏi một năm cụ thể (năm nay, năm sau, "năm 2027"…)',
  'LUÔN gọi van_han(nam_xem) thay vì tự suy. Khi hỏi ý nghĩa một sao → gọi giai_thich_sao.',
  'Mọi con số (cung, sao, đại vận, tiểu hạn, tứ hóa) là chính xác tuyệt đối — hãy luận giải, đừng tính lại.',
].join(' ');

// ── Kết quả MCP ──────────────────────────────────────────────
function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}
function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function buildHandler(key: string, pathname: string) {
  return createMcpHandler(
    (server) => {
      for (const t of TOOLS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        server.tool(t.name, t.description, t.schema as any, async (args: any) => {
          const v = await validateKey(key);
          if (!v.ok || !v.info) return textResult(v.error || HUONG_DAN_LAY_KEY);
          if (t.quota) {
            const blocked = await t.quota(args, v.info, key);
            if (blocked) return textResult(blocked);
          }
          await logUsage(key, t.name, args);
          const data = await t.run(args, v.info);
          return jsonResult(data);
        });
      }
    },
    {
      serverInfo: { name: 'tuviminhbao', version: '1.0.0' },
      instructions: INSTRUCTIONS,
    },
    {
      streamableHttpEndpoint: pathname, // khớp chính xác /mcp/<key>
      disableSse: true,
      verboseLogs: false,
      maxDuration: 60,
    },
  );
}

async function handle(req: Request, params: { key: string } | Promise<{ key: string }>) {
  const { key } = await params;
  const pathname = new URL(req.url).pathname;
  const handler = buildHandler(key, pathname);
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
