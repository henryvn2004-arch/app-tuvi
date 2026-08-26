// app/api/share-result/route.ts
// Tạo permalink CÔNG KHAI cho 1 kết quả ở khung giữa (workspace) app-shell —
// feature "Chia sẻ" dùng chung cho mọi tool (khác share-session vốn chỉ chia
// sẻ transcript rail, không mang ảnh). POST {toolId,kind,title,imageUrl?,text?,
// blocks?} → lưu shared_results → { id, url }. Render công khai:
// app/ket-qua/[id]/route.ts. `blocks` là DỮ LIỆU CÓ CẤU TRÚC (không phải HTML
// thô) để trang public render lại thành card y hệt layout workspace — KHÔNG
// bao giờ nhận/lưu HTML từ client (tránh biến /ket-qua thành host-HTML-tuỳ-ý).
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

  // blocks: mảng "thẻ" tùy chọn để trang /ket-qua render lại y hệt card
  // (.res-block) của workspace — mỗi phần tử chỉ mang TEXT/URL thô, được
  // escape khi render (không phải HTML). Giới hạn số lượng + độ dài để chống
  // nhồi rác qua endpoint công khai này.
  // Phân tích TRƯỚC hai nhánh kind vì nhánh `text` cần biết có blocks hay không
  // mới quyết định được là "rỗng thật" — xem ghi chú ngay dưới.
  let blocks: Array<{ header: string | null; image: string | null; text: string | null }> | null = null;
  if (Array.isArray(b.blocks) && b.blocks.length) {
    const parsed = (b.blocks as unknown[]).slice(0, 8).map((raw) => {
      const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const header = r.header ? String(r.header).slice(0, 120) : null;
      const imageRaw = r.image ? String(r.image).slice(0, 500) : '';
      const image = /^https:\/\//.test(imageRaw) ? imageRaw : null;
      const text = r.text ? String(r.text).trim().slice(0, 4000) : null;
      return { header, image, text };
    }).filter((blk) => blk.header || blk.image || blk.text);
    if (parsed.length) blocks = parsed;
  }

  const blocksHaveText = Boolean(blocks && blocks.some((blk) => blk.text || blk.header));

  let imageUrl: string | null = null;
  let textContent: string | null = null;
  if (kind === 'image') {
    imageUrl = String(b.imageUrl || '').slice(0, 500);
    if (!/^https:\/\//.test(imageUrl)) return err('imageUrl không hợp lệ', 400);
    // text đi kèm ảnh là TÙY CHỌN — mô tả/luận giải quanh kết quả (vd Chân Dung
    // Vợ Chồng: tính cách + hoàn cảnh gặp gỡ + luận giải cung Phu Thê), để trang
    // /ket-qua hiện ĐỦ nội dung workspace chứ không chỉ mỗi tấm ảnh.
    const t = String(b.text || '').trim().slice(0, 6000);
    if (t) textContent = t;
  } else {
    textContent = String(b.text || '').trim().slice(0, 4000) || null;
    // ⚠️ `blocks` MỘT MÌNH là nội dung hợp lệ — /ket-qua render blocks trước,
    // `text_content` chỉ là đường lùi. Trước đây nhánh này đòi bằng được `text`
    // nên tool nào chia sẻ bằng blocks mà không kèm text đều ăn 400. Đã cắn
    // thật: Duyên Nợ Tiền Kiếp lúc vẽ ảnh hỏng rơi về kind='text' + blocks,
    // và người dùng nhận "Không tạo được link chia sẻ" ngay sau khi đã trả tiền.
    if (!textContent && !blocksHaveText) return err('Chưa có nội dung để chia sẻ', 400);
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
        blocks,
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

/**
 * PATCH — chủ nhân của link tự đổi hai cờ hiển thị.
 *
 * `{ id, galleryOptOut?: boolean, revoked?: boolean }`
 *
 * 🔑 C3 — Henry chốt **auto opt-in**: mọi bản chia sẻ mặc định có mặt trong Thư
 * viện chung (`/thu-vien`), ai không muốn thì tự ẩn. Đây là đường "tự ẩn" đó.
 *
 * Nhân tiện mở luôn `revoked`: cột này có từ đầu và `/ket-qua` đã đọc nó để trả
 * 404, nhưng **CHƯA CÓ MỘT DÒNG CODE NÀO GHI VÀO** — tức người dùng chưa từng
 * có cách gỡ một link đã lỡ chia sẻ. Ẩn khỏi thư viện mà vẫn không gỡ được link
 * thì mới đi được nửa đường.
 *
 * ⚠️ Đòi Bearer token và chỉ sửa dòng có `owner_user_id` KHỚP. Link cũ tạo lúc
 * chưa đăng nhập có `owner_user_id = null` → không ai sửa được, kể cả chính họ:
 * đó là đánh đổi cố ý, vì cho phép sửa dòng vô chủ nghĩa là ai đoán được id thì
 * gỡ được link của người khác.
 */
export async function PATCH(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return err('Cần đăng nhập', 401);

  const b = (await parseBody(request)) as Record<string, unknown>;
  const id = String(b.id || '').trim();
  if (!/^[A-Za-z0-9]{6,16}$/.test(id)) return err('Mã chia sẻ không hợp lệ', 400);

  const patch: Record<string, boolean> = {};
  if (typeof b.galleryOptOut === 'boolean') patch.gallery_opt_out = b.galleryOptOut;
  if (b.revoked === true) patch.revoked = true; // chỉ cho GỠ, không cho bật lại
  if (!Object.keys(patch).length) return err('Không có gì để đổi', 400);

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: auth } = await sb.auth.getUser(token);
    const uid = auth?.user?.id;
    if (!uid) return err('Phiên đăng nhập không hợp lệ', 401);

    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!, {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data, error } = await admin
      .from('shared_results')
      .update(patch)
      .eq('id', id)
      .eq('owner_user_id', uid)
      .select('id');
    if (error) {
      console.error('[share-result] patch error', error.message);
      return err('Không đổi được thiết lập chia sẻ', 500);
    }
    // Không khớp chủ → nói "không tìm thấy", KHÔNG nói "không phải của bạn":
    // câu sau xác nhận cho người đoán id rằng id đó có thật.
    if (!data || !data.length) return err('Không tìm thấy bản chia sẻ này', 404);
    return ok({ id, ...patch });
  } catch (e: unknown) {
    console.error('[share-result] patch exception', e);
    return err((e as Error).message || 'Lỗi đổi thiết lập chia sẻ', 500);
  }
}
