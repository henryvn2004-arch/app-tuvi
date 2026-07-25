// app/api/share-result/route.ts
// Tạo permalink CÔNG KHAI cho 1 kết quả ở khung giữa (workspace) app-shell —
// feature "Chia sẻ" dùng chung cho mọi tool (khác share-session vốn chỉ chia
// sẻ transcript rail, không mang ảnh). POST {toolId,kind,title,imageUrl?,text?}
// → lưu shared_results → { id, url }. Render công khai: app/ket-qua/[id]/route.ts.
export const maxDuration = 15;
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options, parseBody } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

function makeId(len = 10): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
}

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const b = (await parseBody(request)) as Record<string, unknown>;

  const kind = b.kind === 'image' ? 'image' : b.kind === 'text' ? 'text' : null;
  if (!kind) return err('kind phải là "image" hoặc "text"', 400);

  const toolId = String(b.toolId || 'app').slice(0, 40);
  const title = String(b.title || 'Kết quả Luận Đường').slice(0, 160);

  let imageUrl: string | null = null;
  let textContent: string | null = null;
  if (kind === 'image') {
    imageUrl = String(b.imageUrl || '').slice(0, 500);
    if (!/^https:\/\//.test(imageUrl)) return err('imageUrl không hợp lệ', 400);
  } else {
    textContent = String(b.text || '').trim().slice(0, 4000);
    if (!textContent) return err('Chưa có nội dung để chia sẻ', 400);
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    let userId: string | null = null;
    const authToken = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (authToken) {
      const { data } = await sb.auth.getUser(authToken);
      if (data?.user) userId = data.user.id;
    }

    let id = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      id = makeId(10);
      const { error } = await sb.from('shared_results').insert({
        id,
        owner_user_id: userId,
        tool_id: toolId,
        kind,
        title,
        image_url: imageUrl,
        text_content: textContent,
      });
      if (!error) {
        return ok({ id, url: `/ket-qua/${id}` });
      }
      if (!String(error.message || '').match(/duplicate|unique/i)) {
        console.error('[share-result] insert error', error.message);
        return err('Không lưu được kết quả chia sẻ', 500);
      }
    }
    return err('Không tạo được mã chia sẻ, thử lại', 500);
  } catch (e: unknown) {
    console.error('[share-result] exception', e);
    return err((e as Error).message || 'Lỗi tạo link chia sẻ', 500);
  }
}
