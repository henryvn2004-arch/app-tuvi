// app/api/v1/chat/route.ts
// ============================================================
// CỔNG AGENT DUY NHẤT — Contract v1 (xem lib/contract/v1.ts)
//
// Phase 0 / Sprint 0.1: SKELETON.
//   - Validate request theo contract.
//   - Trả SSE stream đúng khung 4-event: status → text → done.
//   - CHƯA gọi engine / Anthropic — sẽ wire ở Sprint 0.2 (tool layer).
//
// Route này TÁCH BIỆT hoàn toàn với /api/lasotuvi đang chạy —
// không đụng gì production. Lật ruột client sang đây ở Phase 1.
// ============================================================

import { NextRequest } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import {
  CONTRACT_VERSION,
  sse,
  validateChatRequest,
  type ChatRequestV1,
} from '@/lib/contract/v1';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Contract-Version': CONTRACT_VERSION,
};

export async function OPTIONS() {
  return options();
}

export async function GET() {
  // Health check / mô tả contract cho client dò version.
  return new Response(
    JSON.stringify({
      service: 'tuvi-chat-agent',
      contract: CONTRACT_VERSION,
      status: 'skeleton',
      note: 'Sprint 0.1 — SSE 4-event. Tool layer chưa wire (0.2).',
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('bad_request', 'Body không phải JSON hợp lệ', 400);
  }

  const parsed = validateChatRequest(body);
  if (!parsed.ok) {
    return jsonError('bad_request', parsed.error, 400);
  }

  const req: ChatRequestV1 = parsed.value;

  // ── SSE stream skeleton ──────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        const lastUser =
          [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

        send(sse.status({ text: 'Đang xử lý yêu cầu...' }));

        // TODO (Sprint 0.2): agent loop + tool-use (lap_la_so,
        // tinh_van_han, xem_ngay_tot, tra_cuu_tri_thuc) + Anthropic stream.
        const reply =
          'Cổng agent v1 đã sẵn sàng (skeleton). ' +
          'Bộ tool sẽ được nối ở Sprint 0.2.\n\n' +
          `Bạn vừa hỏi: "${lastUser.slice(0, 160)}"`;

        for (const piece of chunkText(reply, 48)) {
          send(sse.text({ delta: piece }));
        }

        send(
          sse.done({
            tools_used: [],
            paywall: { blocked: false },
          }),
        );
      } catch (e) {
        send(
          sse.error({
            code: 'internal',
            message: e instanceof Error ? e.message : 'Lỗi không xác định',
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}

// ── helpers ──────────────────────────────────────────────────
function jsonError(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** Cắt text thành mảnh nhỏ để mô phỏng stream từng phần. */
function chunkText(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}
