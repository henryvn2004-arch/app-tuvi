// lib/channels/core.ts
// ============================================================
// LÕI KÊNH CHAT — điều phối 1 LƯỢT hội thoại dùng CHUNG cho mọi
// nền tảng webhook (Telegram, Zalo OA, Messenger, WhatsApp, Viber…).
//
// "Một bộ não" (runAgent) đã chung; file này chung nốt phần ĐIỀU PHỐI
// quanh nó: thanh tiến trình + typing, tải ảnh, nạp/lưu phiên (nhớ lá
// số), gọi runAgent, chốt câu trả lời, tính phí. Mỗi nền tảng chỉ cần
// cài 2 interface mỏng:
//   • ChannelIO   — I/O đặc thù nền tảng (gửi/sửa tin, typing, tải ảnh)
//   • SessionStore — đọc/ghi phiên (messages + birth)
// rồi gọi runConversation(). KHÔNG còn chép logic giữa các kênh.
//
// File này TRUNG LẬP nền tảng: KHÔNG import Telegram/Supabase trực tiếp.
// ============================================================

import {
  type ChatRequestV1,
  type ChatMessage,
  type ChatImage,
  type BirthParams,
  type ClientPlatform,
} from '@/lib/contract/v1';
import { runAgent } from '@/lib/agent/run';
import { type ChatConfig } from '@/lib/config/appConfig';

// id của tin "tiến trình" để edit dần — kiểu tùy nền tảng (Telegram: number).
export type ProgressId = number | string | null;

// ── I/O đặc thù nền tảng (adapter cài đặt) ──────────────────
export interface ChannelIO {
  /** Nền tảng (đi vào ChatRequestV1.client.platform + session_id). */
  platform: ClientPlatform;
  /** Giới hạn ký tự 1 tin nhắn (Telegram 4096). */
  msgLimit: number;
  /** Số ảnh tối đa xử lý mỗi lượt (≤ MAX_IMAGES_PER_MSG của runAgent). */
  maxImages: number;
  /** Báo "đang soạn" (Telegram sendChatAction). No-op nếu nền tảng không có. */
  typing(chatId: number | string): Promise<void>;
  /** Gửi 1 tin (tự cắt nếu quá dài). */
  sendText(chatId: number | string, text: string): Promise<void>;
  /** Gửi tin "tiến trình", trả id để edit dần (null nếu không hỗ trợ). */
  sendProgress(chatId: number | string, text: string): Promise<ProgressId>;
  /** Sửa tin tiến trình. */
  editText(chatId: number | string, id: ProgressId, text: string): Promise<void>;
  /** Tải ảnh người dùng gửi (ref đặc thù nền tảng) → base64. */
  fetchImage(ref: string): Promise<ChatImage | null>;
}

// ── Lưu phiên (adapter cài đặt — bảng tùy nền tảng) ─────────
export interface SessionStore {
  load(chatId: number | string): Promise<{ messages: ChatMessage[]; birth: BirthParams | null }>;
  save(chatId: number | string, messages: ChatMessage[], birth: BirthParams | null): Promise<void>;
}

// ── Cổng tính phí (adapter quyết, core chỉ gọi commit khi thành công) ──
export interface AccessGate {
  allowed: boolean;
  message?: string;
  commit?: () => Promise<void>;
}

// ── Tin đến đã chuẩn hóa (adapter parse từ webhook) ─────────
export interface IncomingTurn {
  chatId: number | string;
  /** Câu hỏi (text thường hoặc caption của ảnh). */
  text: string;
  /** Ref ảnh đặc thù nền tảng (rỗng nếu không có ảnh). */
  imageRefs: string[];
}

const WAIT_LASO = '🔮 Đang xem lá số của bạn, chờ một chút…';
const WAIT_IMAGE = '🔮 Đang xem ảnh của bạn, chờ một chút…';
const DEFAULT_IMG_Q = 'Nhờ thầy xem giúp ảnh này.';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Điều phối 1 lượt (dùng chung mọi kênh) ──────────────────
// gateCommit: gọi SAU khi trả lời thành công (trừ Lượng / tăng lượt free).
// Cổng từ chối (allowed=false) do adapter xử lý TRƯỚC khi gọi hàm này.
export async function runConversation(
  io: ChannelIO,
  store: SessionStore,
  incoming: IncomingTurn,
  cfg: ChatConfig,
  errMsg: string,
  gateCommit?: () => Promise<void>,
): Promise<void> {
  const { chatId } = incoming;
  const hasImage = incoming.imageRefs.length > 0;

  await io.typing(chatId);
  const progressId = await io.sendProgress(chatId, hasImage ? WAIT_IMAGE : WAIT_LASO);

  // Tải ảnh (nếu có) → base64. Lỗi tải thì bỏ qua, vẫn luận theo chữ.
  const images: ChatImage[] = [];
  if (hasImage) {
    for (const ref of incoming.imageRefs.slice(0, io.maxImages)) {
      const img = await io.fetchImage(ref);
      if (img) images.push(img);
    }
  }

  const session = await store.load(chatId);
  // Tin lượt này gửi runAgent KÈM ảnh. Chỉ ảnh, không caption → mồi câu hỏi.
  const userMsg: ChatMessage = { role: 'user', content: incoming.text || DEFAULT_IMG_Q };
  if (images.length) userMsg.images = images;
  const messages: ChatMessage[] = [...session.messages, userMsg];

  // Giữ "typing…" sống suốt quá trình (nền tảng tự tắt sau ~5s).
  let working = true;
  const keepTyping = (async () => {
    while (working) {
      await sleep(4000);
      if (working) await io.typing(chatId);
    }
  })();

  // Edit thanh tiến trình theo status agent (throttle 2.5s tránh rate-limit).
  let lastEdit = Date.now();
  const onStatus = (status: string) => {
    const now = Date.now();
    if (progressId != null && now - lastEdit > 2500) {
      lastEdit = now;
      void io.editText(chatId, progressId, '🔮 ' + status);
    }
  };

  try {
    const req: ChatRequestV1 = {
      session_id: `${io.platform}-${chatId}`,
      messages,
      stream: true,
      // Đã có lá số từ phiên trước → truyền thẳng, không hỏi lại ngày sinh.
      ...(session.birth ? { birth: session.birth } : {}),
      client: { platform: io.platform, version: '1.0.0' },
    };
    const collector = createSSECollector(onStatus);
    const { birth: agentBirth } = await runAgent(req, cfg, collector.send);
    working = false;

    const err = collector.getError();
    const answer = collector.getText().trim();
    if (err || !answer) {
      await deliver(io, chatId, progressId, errMsg);
      return;
    }
    await deliver(io, chatId, progressId, answer);
    // Trả lời thành công → CHỐT tính phí (lỗi thì không tính, đã return trên).
    if (gateCommit) await gateCommit();

    // Lưu lịch sử + lá số đã lập. KHÔNG lưu base64 ảnh (phình DB + gửi lại
    // ảnh cũ mỗi lượt). Giữ dấu vết "[ảnh] <caption>".
    const savedUserMsg: ChatMessage = {
      role: 'user',
      content: images.length ? (incoming.text ? `[ảnh] ${incoming.text}` : '[Đã gửi ảnh]') : incoming.text,
    };
    await store.save(
      chatId,
      [...session.messages, savedUserMsg, { role: 'assistant', content: answer }],
      agentBirth,
    );
  } catch {
    working = false;
    await deliver(io, chatId, progressId, errMsg);
  } finally {
    working = false;
    await keepTyping.catch(() => {});
  }
}

// Chốt nội dung vào tin tiến trình (edit); phần dư > msgLimit gửi tin mới.
async function deliver(io: ChannelIO, chatId: number | string, progressId: ProgressId, text: string): Promise<void> {
  if (progressId == null) {
    await io.sendText(chatId, text);
    return;
  }
  const parts = splitText(text, io.msgLimit);
  await io.editText(chatId, progressId, parts[0]);
  for (const p of parts.slice(1)) await io.sendText(chatId, p);
}

// ── Tiện ích chung mọi kênh ─────────────────────────────────

/** Cắt chuỗi dài thành nhiều phần ≤ max, ưu tiên cắt ở newline. */
export function splitText(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  const out: string[] = [];
  let rest = s;
  while (rest.length > max) {
    // cắt ở newline gần nhất trước max để câu không gãy giữa chừng
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = max; // không có newline hợp lý → cắt cứng
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, '');
  }
  if (rest) out.push(rest);
  return out;
}

// ── Gom event 'text' từ runAgent (send nhận chuỗi SSE) ──────
// runAgent gọi send(sse.text({delta})) / send(sse.error({...})). Ta bóc
// các delta thành 1 chuỗi, và bắt error nếu có. Dùng chung mọi adapter.
export function createSSECollector(onStatus?: (status: string) => void) {
  let text = '';
  let error: string | null = null;
  let lastStatus = '';
  const send = (chunk: string) => {
    // mỗi chunk: "event: <name>\ndata: <json>\n\n"
    const nl = chunk.indexOf('\n');
    if (nl < 0) return;
    const name = chunk.slice(0, nl).replace(/^event:\s*/, '').trim();
    const dataLine = chunk.slice(nl + 1).replace(/^data:\s*/, '').trim();
    let data: unknown;
    try {
      data = JSON.parse(dataLine);
    } catch {
      return;
    }
    if (name === 'text') {
      text += (data as { delta?: string }).delta || '';
    } else if (name === 'status') {
      lastStatus = (data as { text?: string }).text || '';
      if (lastStatus && onStatus) onStatus(lastStatus);
    } else if (name === 'tool_call') {
      // Nhãn tool đã tới qua status kèm theo; tool_call để dành nếu cần.
    } else if (name === 'error') {
      error = (data as { message?: string }).message || 'Lỗi không xác định';
    }
  };
  return {
    send,
    getText: () => text,
    getError: () => error,
    getLastStatus: () => lastStatus,
  };
}
