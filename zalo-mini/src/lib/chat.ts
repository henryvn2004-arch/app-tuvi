// Hỏi Thầy — POST /api/v1/chat (Contract v1), đọc SSE: text{delta} · status ·
// done{suggestions,paywall} · error. `historyMode:'delta'`: chỉ gửi tin MỚI,
// server ghép lịch sử đã lưu theo `session_id` (giống web, public/shell.js).
import { CLIENT } from '../config';
import { authFetch } from './session';
import type { BirthParams } from './birth';

export interface ChatHandlers {
  onStatus?: (text: string) => void;
  onText: (delta: string) => void;
  onDone?: (d: {
    suggestions?: string[];
    paywall?: { blocked?: boolean; reason?: string };
  }) => void;
}

export function newSessionId(): string {
  return `zm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function dispatch(block: string, h: ChatHandlers): void {
  let name = 'message';
  let data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) name = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return;
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(data);
  } catch {
    return;
  }
  if (name === 'text' && typeof d.delta === 'string') h.onText(d.delta);
  else if (name === 'status' && typeof d.text === 'string') h.onStatus?.(d.text);
  else if (name === 'done') h.onDone?.(d as Parameters<NonNullable<ChatHandlers['onDone']>>[0]);
  else if (name === 'error')
    throw new Error(String(d.message || 'Thầy chưa trả lời được, thử lại sau.'));
  // event lạ: bỏ qua (contract forward-compatible)
}

export async function askThay(
  sessionId: string,
  text: string,
  birth: BirthParams | null,
  h: ChatHandlers
): Promise<void> {
  const res = await authFetch('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      stream: true,
      historyMode: 'delta',
      messages: [{ role: 'user', content: text }],
      ...(birth ? { birth } : {}),
      client: CLIENT,
    }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || d.error || `Lỗi máy chủ (${res.status})`);
  }
  // Webview không có stream đọc được thì đọc trọn rồi tách event một lần.
  const reader = res.body?.getReader?.();
  if (!reader) {
    for (const block of (await res.text()).split('\n\n')) dispatch(block, h);
    return;
  }
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      dispatch(buf.slice(0, i), h);
      buf = buf.slice(i + 2);
    }
  }
  if (buf.trim()) dispatch(buf, h);
}
