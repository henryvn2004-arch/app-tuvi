// lib/api/tool-helpers.ts
// ============================================================
// Hai mảnh mà MỌI route tool "một pha" đều cần, gom về một chỗ.
//
// Trước PR này cả hai đang có 5 bản chép tay (`phong-thuy`, 2 chân dung,
// `duyen-no-tien-kiep`, `nguoi-khac`). Bản `parseJSON` giòn đã trả giá một lần
// trên prod (model thêm một câu dẫn là hỏng cả lượt ĐÃ TÍNH TIỀN), và cái giá
// đó phải trả lại từ đầu ở mỗi bản chép. Route mới đi qua đây.
//
// ⚠️ CỐ Ý CHƯA đổi 5 route cũ sang dùng chung trong cùng PR này: chúng đang
// chạy và đang bán, gom hết lại là trộn một refactor rủi ro vào một PR thêm
// tính năng. Bản ở đây là bản chuẩn để dọn dần.
// ============================================================

import type { NextRequest } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

/** Xác thực Bearer token qua GoTrue. `cache:'no-store'` là bắt buộc — Next bọc
 *  `fetch` toàn cục và nhớ kết quả, tức phiên đã huỷ vẫn qua cửa. */
export async function authUserFromRequest(
  request: NextRequest,
): Promise<{ error: string; status: number } | { user: { id: string } }> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SUPABASE_KEY },
    cache: 'no-store',
  });
  if (!res.ok) return { error: 'Unauthorized', status: 401 };
  const u = await res.json();
  if (!u?.id) return { error: 'Unauthorized', status: 401 };
  return { user: { id: u.id as string } };
}

/**
 * Bóc JSON từ câu trả lời LLM.
 *
 * Quét TỪNG khối `{...}` cân bằng từ trái sang, bỏ qua ngoặc nằm trong chuỗi
 * (lời thoại) và ký tự escape; khối đầu tiên parse được thì lấy.
 *
 * 🔑 CỐ Ý không dừng ở khối `{` đầu tiên tìm thấy: model hay chèn một `{...}`
 * trong lời dẫn, và khối rác đó nuốt mất JSON thật nếu chỉ thử một lần.
 */
export function parseLlmJson(text: string): unknown {
  const t = String(text || '')
    .replace(/```json|```/g, '')
    .trim();
  try {
    return JSON.parse(t);
  } catch {
    /* thử cắt khối {...} cân bằng bên dưới */
  }
  for (let i = t.indexOf('{'); i >= 0; i = t.indexOf('{', i + 1)) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let k = i; k < t.length; k++) {
      const c = t[k];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try {
          return JSON.parse(t.slice(i, k + 1));
        } catch {
          /* khối này không phải JSON ta cần → thử khối kế tiếp */
        }
        break;
      }
    }
  }
  return null;
}
