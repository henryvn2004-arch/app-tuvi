// lib/marketing/email-broadcast.ts
// ============================================================
// Rút CHÍNH MỘT hàng đợi email_broadcast_queue mỗi lượt cron, gửi tối đa
// BATCH_PER_RUN người/lượt (xem _patches/migration-email-broadcast-queue.sql
// cho lý do tách nạp/gửi). Nội dung admin soạn KHÔNG tự chèn footer thương
// hiệu — `sendMarketingEmail` đã tự lo unsubscribe/link huỷ.
// ============================================================
import { sendMarketingEmail } from '../email/send';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const BATCH_PER_RUN = 200;
const CHUNK = 10; // gửi song song mỗi đợt nhỏ, tránh dội Resend

interface QueueRow {
  id: number;
  subject: string;
  html: string;
  recipients: { email: string; user_id?: string }[];
  total: number;
  cursor_pos: number;
  sent: number;
  failed: number;
}

async function fetchNextPending(): Promise<QueueRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/email_broadcast_queue?status=eq.pending&order=created_at.asc&limit=1`,
    { headers: SB_HEADERS, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const rows: QueueRow[] = await res.json();
  return rows[0] || null;
}

async function patchQueue(id: number, patch: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/email_broadcast_queue?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
}

export interface BroadcastDrainResult {
  ran: boolean;
  queueId: number | null;
  processed: number;
  sent: number;
  failed: number;
  done: boolean;
}

export async function drainEmailBroadcastQueue(): Promise<BroadcastDrainResult> {
  const row = await fetchNextPending();
  if (!row) return { ran: false, queueId: null, processed: 0, sent: 0, failed: 0, done: false };

  const batch = row.recipients.slice(row.cursor_pos, row.cursor_pos + BATCH_PER_RUN);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    const results = await Promise.allSettled(chunk.map((r) =>
      sendMarketingEmail({
        dedupeKey: `broadcast-${row.id}-${r.user_id || r.email}`,
        template: 'broadcast',
        to: r.email,
        subject: row.subject,
        html: row.html,
        userId: r.user_id,
      }),
    ));
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.ok) sent++;
      else failed++;
    }
  }

  const newCursor = row.cursor_pos + batch.length;
  const done = newCursor >= row.total;
  await patchQueue(row.id, {
    cursor_pos: newCursor,
    sent: row.sent + sent,
    failed: row.failed + failed,
    ...(done ? { status: 'done', finished_at: new Date().toISOString() } : {}),
  });

  return { ran: true, queueId: row.id, processed: batch.length, sent, failed, done };
}
