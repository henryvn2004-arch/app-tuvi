// app/api/v1/chat/route.ts
// ============================================================
// CỔNG AGENT DUY NHẤT — Contract v1 (xem lib/contract/v1.ts)
//
// Phase 0 / Sprint 0.3: CONFIG RUNTIME + PAYWALL hợp nhất.
//   - Prompt / model / max_rounds / max_tokens / giá Lượng đọc từ
//     bảng app_config (lib/config/appConfig.ts) — sửa ở DB, không deploy.
//   - Paywall/Lượng gộp về đây (lib/billing/credits.ts): pre-check
//     auth + số dư TRƯỚC khi stream; trừ Lượng SAU khi trả lời xong.
//   - Agent loop tách ra lib/agent/run.ts (dùng CHUNG với adapter kênh
//     khác: Telegram, Zalo OA...). Engine tool-use chạy SERVER-SIDE.
//   - Stream SSE 5-event: status → tool_call → text → done | error.
//
// Tách biệt /api/lasotuvi đang chạy. Lật ruột client sang đây ở Phase 1.
// ============================================================

import { NextRequest } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import {
  CONTRACT_VERSION,
  sse,
  validateChatRequest,
  type ChatRequestV1,
  type DoneEvent,
} from '@/lib/contract/v1';
import { buildToolDefs } from '@/lib/tools/registry';
import { runAgent } from '@/lib/agent/run';
import { getChatConfig } from '@/lib/config/appConfig';
import { getToolPrice } from '@/lib/billing/pricing';
import { chatLogOutcome } from '@/lib/channels/store';
import {
  paywallDisabled,
  extractToken,
  getUserFromToken,
  getBalance,
  deductCredits,
  logTransaction,
} from '@/lib/billing/credits';
import { railFreeRemaining, railFreeConsume } from '@/lib/billing/viral-budget';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const SSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
  'X-Contract-Version': CONTRACT_VERSION,
};

export async function OPTIONS() {
  return options();
}

export async function GET() {
  return new Response(
    JSON.stringify({
      service: 'tuvi-chat-agent',
      contract: CONTRACT_VERSION,
      status: 'live',
      tools: buildToolDefs().map((t) => t.name),
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
  if (!parsed.ok) return jsonError('bad_request', parsed.error, 400);
  if (!ANTHROPIC_API_KEY) return jsonError('internal', 'Thiếu cấu hình ANTHROPIC_API_KEY', 500);

  const req: ChatRequestV1 = parsed.value;
  const cfg = await getChatConfig();

  // ── Paywall pre-check (trước khi mở stream) ───────────────────
  // Chỉ tính phí khi paywall bật VÀ giá cấu hình > 0. Trừ Lượng SAU
  // khi trả lời xong (giữ userId ở đây để dùng lại trong stream).
  let chargeUserId: string | null = null;
  let freeTurnLeft = 0;
  // Giá rail = tool_pricing['rail-message'] (nguồn thật, admin sửa được);
  // fallback cfg.cost (app_config 'chat.cost') nếu chưa có row / đọc hụt.
  const railPrice = await getToolPrice('rail-message');
  const cost = railPrice != null ? railPrice : cfg.cost;
  if (!paywallDisabled() && cost > 0) {
    const token = extractToken(request);
    if (!token) return jsonError('unauthorized', 'Cần đăng nhập để dùng tính năng này', 401);
    const user = await getUserFromToken(token);
    if (!user) return jsonError('unauthorized', 'Phiên đăng nhập không hợp lệ', 401);
    // Lượt rail TẶNG (sau khi vẽ chân dung xong) tiêu trước Lượng — nếu còn
    // lượt tặng thì không chặn dù ví rỗng. Đây đúng là tình huống nó sinh ra
    // để cứu: quà đăng ký vừa đủ 1 lượt vẽ, vẽ xong là ví về 0.
    freeTurnLeft = await railFreeRemaining(user.id);
    const balance = await getBalance(user.id);
    if (freeTurnLeft <= 0 && balance < cost) {
      // Trả kèm `price` để client dịch được sang "còn N câu hỏi" / "cần thêm N
      // câu" — nói bằng CÂU thì người dùng hiểu ngay, nói bằng Lượng thì không.
      return jsonError('paywall', `Không đủ Lượng (cần ${cost}, còn ${balance})`, 402, { balance, price: cost });
    }
    chargeUserId = user.id;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      try {
        const { toolsUsed, suggestions } = await runAgent(req, cfg, send);

        // ── Trừ Lượng sau khi trả lời thành công ──────────────────
        let paywall: DoneEvent['paywall'] = { blocked: false };
        if (chargeUserId && cost > 0) {
          // Tiêu lượt TẶNG trước, và chỉ khi thật sự còn (kiểm tra lại atomic ở
          // DB — số đọc lúc pre-check có thể đã cũ nếu người dùng mở 2 tab).
          const usedFreeTurn = freeTurnLeft > 0 && (await railFreeConsume(chargeUserId));
          if (usedFreeTurn) {
            // KHÔNG ghi credit_transactions: không có Lượng nào đổi chủ, ghi
            // giao dịch 0 đồng chỉ làm bẩn báo cáo doanh thu/chi phí.
            paywall = {
              blocked: false,
              balance: await getBalance(chargeUserId),
              price: cost,
              freeTurns: await railFreeRemaining(chargeUserId),
            };
          } else {
            const newBal = await deductCredits(chargeUserId, cost);
            if (newBal != null) {
              await logTransaction({
                userId: chargeUserId,
                amount: -cost,
                type: 'chat',
                description: 'Lượt luận giải /api/v1/chat',
              });
              paywall = { blocked: false, balance: newBal, price: cost, freeTurns: freeTurnLeft };
            }
          }
        } else if (cost > 0) {
          // Paywall tắt / chưa đăng nhập nhưng vẫn nên cho client biết giá, để
          // đồng hồ đếm câu không phải đoán.
          paywall = { blocked: false, price: cost };
        }
        send(sse.done({ tools_used: toolsUsed, paywall, suggestions }));
        void chatLogOutcome('web', req.session_id, true);
      } catch (e) {
        send(sse.error({ code: 'internal', message: e instanceof Error ? e.message : 'Lỗi không xác định' }));
        void chatLogOutcome('web', req.session_id, false, e instanceof Error ? e.message.slice(0, 200) : 'unknown_exception');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}

// ── helpers ──────────────────────────────────────────────────
function jsonError(code: string, message: string, status: number, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ code, message, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
