// app/api/share-session/route.ts
// Tạo SNAPSHOT phiên Luận Đường để chia sẻ (share full session như link ChatGPT).
// POST { toolId, title, ctxLabel, thay, messages } → lưu shared_sessions → { id, url }.
// Render công khai: app/luan-duong/[id]/route.ts.
export const maxDuration = 30;
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options, parseBody } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

// slug ngắn base62 (~10 ký tự) từ Web Crypto — đủ chống đoán, gọn cho URL.
function makeId(len = 10): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
}

export async function OPTIONS() { return options(); }

// GET /api/share-session?id=<slug> — trả SNAPSHOT để NỐI PHIÊN (người nhận bấm
// "Hỏi thầy tiếp"): khung giữa (restore) + transcript + thầy. RLS cho select công
// khai khi revoked=false. KHÔNG lộ owner_user_id.
export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[A-Za-z0-9]{6,16}$/.test(id)) return err('id không hợp lệ', 400);
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data } = await sb
      .from('shared_sessions')
      .select('tool_id,title,ctx_label,thay,messages,restore,revoked')
      .eq('id', id)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any;
    if (!row || row.revoked) return err('Phiên không tồn tại', 404);
    return ok({
      id,
      toolId: row.tool_id,
      title: row.title,
      ctxLabel: row.ctx_label || '',
      thay: row.thay || null,
      messages: Array.isArray(row.messages) ? row.messages : [],
      restore: row.restore || null,
    });
  } catch (e: unknown) {
    console.error('[share-session GET] exception', e);
    return err('Lỗi tải phiên chia sẻ', 500);
  }
}

export async function POST(request: NextRequest) {
  const b = (await parseBody(request)) as Record<string, unknown>;
  const rawMsgs = Array.isArray(b.messages) ? b.messages : [];
  if (!rawMsgs.length) return err('Phiên chưa có nội dung để chia sẻ', 400);

  // Chuẩn hoá messages: chỉ giữ role + content (bỏ ảnh base64 nặng), cắt độ dài.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = rawMsgs
    .map((m: any) => ({
      role: m && m.role === 'user' ? 'user' : 'assistant',
      content: String((m && m.content) || '').slice(0, 6000),
    }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-60); // tối đa 60 tin gần nhất
  if (!messages.length) return err('Phiên chưa có nội dung để chia sẻ', 400);

  const toolId = String(b.toolId || 'laso').slice(0, 40);
  const title = String(b.title || 'Luận Đường').slice(0, 160);
  const ctxLabel = b.ctxLabel ? String(b.ctxLabel).slice(0, 200) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thayIn = (b.thay || {}) as any;
  const thay = { id: String(thayIn.id || '').slice(0, 40), name: String(thayIn.name || 'Thầy Luận Đường').slice(0, 80) };
  // restore: payload dựng lại khung giữa (lá số/kịch bản) để người nhận nối phiên
  // hỏi tiếp. Chỉ giữ nếu là object gọn (JSON < ~8KB) — chống nhồi rác.
  let restore: unknown = null;
  if (b.restore && typeof b.restore === 'object') {
    try {
      const j = JSON.stringify(b.restore);
      if (j.length <= 8000) restore = JSON.parse(j);
    } catch {
      /* bỏ qua nếu không serialize được */
    }
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    let userId: string | null = null;
    const authToken = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (authToken) {
      const { data } = await sb.auth.getUser(authToken);
      if (data?.user) userId = data.user.id;
    }

    // Sinh id, thử lại nếu trùng (hiếm).
    let id = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      id = makeId(10);
      const { error } = await sb.from('shared_sessions').insert({
        id,
        owner_user_id: userId,
        tool_id: toolId,
        title,
        ctx_label: ctxLabel,
        thay,
        messages,
        restore,
      });
      if (!error) {
        return ok({ id, url: `/luan-duong/${id}` });
      }
      if (!String(error.message || '').match(/duplicate|unique/i)) {
        console.error('[share-session] insert error', error.message);
        return err('Không lưu được phiên chia sẻ', 500);
      }
    }
    return err('Không tạo được mã chia sẻ, thử lại', 500);
  } catch (e: unknown) {
    console.error('[share-session] exception', e);
    return err((e as Error).message || 'Lỗi tạo link chia sẻ', 500);
  }
}
