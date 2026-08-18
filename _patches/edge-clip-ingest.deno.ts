// clip-ingest v2 — nhận một clip 9:16 từ GitHub Actions, cất vào Storage, ghi
// một dòng vào `media_assets`, và (SAU MỘT CÁI VAN) xếp hàng đăng.
//
// v1 → v2: nhận `width`/`height` do người nộp khai (clip nay giao ra 720×1280,
// viết cứng 1080×1920 là sổ nói sai về chính file trong kho) và thêm bước xếp
// hàng `media_posts` sau cờ `social.clip_autopost` — xem khối cuối file.
//
// 🔑 VÌ SAO LÀ MỘT HÀM EDGE chứ không để Actions tự ghi thẳng vào Supabase:
// ghi thẳng thì runner phải cầm `SUPABASE_SERVICE_KEY` — khoá mở toang toàn bộ
// DB, trong một môi trường CI mà bất kỳ workflow nào cũng đọc được biến môi
// trường. Khoá đó đã phải XOAY MỘT LẦN vì lộ. Ở đây runner chỉ cầm
// `CLIP_INGEST_SECRET`: làm được đúng một việc là nộp clip, xoay lại là một
// dòng lệnh, và nếu lộ thì thiệt hại tối đa là vài clip rác trong kho.
//
// ⚠️ XẾP HÀNG ĐĂNG NẰM SAU MỘT CÁI VAN, mặc định ĐÓNG (`social.clip_autopost`
// = false). Biến một clip thành bài đăng là quyết định NỘI DUNG — nên van do
// người mở, không phải mặc định bật. Van đóng thì hàm này chỉ CẤT + GHI SỔ
// (`media_assets`) đúng như bản v1.
//
// 🪤 Và kênh phải lấy từ `social.channels`, đừng khai một danh sách ở đây:
// chèn `media_posts` với `channel` chưa có adapter thì `publishQueue` quét
// trúng rồi đánh dấu `error` cho cả lô (nó lọc theo TRẠNG THÁI, không lọc theo
// kênh) — tức tự tay làm hỏng hàng đợi của chính mình.
//
// 🧷 Nguồn nằm TRONG repo, không chỉ trên dashboard Supabase. Bài học đã trả
// giá hai lần (`send-daily-push`, `youtube-upload`): bản đang chạy khác bản
// trong repo thì lúc đi tìm nguyên nhân không ai đọc lại được.
//
// Deploy: Supabase → Edge Functions → clip-ingest (verify_jwt: FALSE — hàm tự
// xác thực bằng `x-clip-secret`; bật verify_jwt là buộc runner cầm thêm anon
// key mà chẳng thêm được lớp bảo vệ nào).
//
// Biến môi trường: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · CLIP_INGEST_SECRET

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SECRET = Deno.env.get('CLIP_INGEST_SECRET') ?? '';
const BUCKET = 'clips';

const H = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-clip-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Chỉ nhận tên an toàn: đường dẫn Storage ghép thẳng từ đây. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // 🪤 ĐO ĐƯỢC, GHI ĐỂ KHỎI ĐI CHẨN LẠI: từ chối một request 100KB trả lời
  // trong 0,7s, nhưng CÙNG nhánh từ chối đó với body 4MB thì **treo 150 giây
  // rồi 504** — hàm trả lời xong mà cổng không đóng vòng lại được. Đã thử huỷ
  // luồng body trước khi trả lời (`req.body.cancel()`): KHÔNG ăn thua, nên đây
  // là hành vi của cổng chứ không sửa được từ trong hàm.
  //
  // ⇒ Chốt nằm ở PHÍA GỬI: `scripts/publish-clips.mjs` hỏi `?ping=1` (body
  // rỗng) để soát khoá TRƯỚC, rồi mới nộp file. Sai khoá thì hỏng trong một
  // giây kèm lý do, thay vì treo 150 giây rồi báo một con số 504 vô nghĩa.
  if (!SECRET) return json({ error: 'missing_env: CLIP_INGEST_SECRET' }, 500);
  if (req.headers.get('x-clip-secret') !== SECRET) return json({ error: 'unauthorized' }, 401);
  if (!SB_URL || !SB_KEY) return json({ error: 'missing_env: SUPABASE_URL/SERVICE_ROLE_KEY' }, 500);

  // Soát khoá mà không kèm file — xem chú thích ngay trên.
  if (new URL(req.url).searchParams.get('ping')) return json({ ok: true });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'cần multipart/form-data' }, 400);
  }

  const toolId = String(form.get('tool_id') ?? '');
  const file = form.get('file');
  if (!SLUG.test(toolId)) return json({ error: 'tool_id không hợp lệ' }, 400);
  if (!(file instanceof File)) return json({ error: 'thiếu file' }, 400);

  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(String(form.get('meta') ?? '{}'));
  } catch {
    return json({ error: 'meta không phải JSON' }, 400);
  }

  const variant = String(form.get('variant') ?? 'clip-9x16');
  if (!SLUG.test(variant)) return json({ error: 'variant không hợp lệ' }, 400);

  // Tên file mang DẤU THỜI GIAN, không ghi đè bản cũ: đổi kịch bản rồi dựng lại
  // thì hai bản cùng tồn tại và so được với nhau. Kho video vốn rẻ.
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const path = `${toolId}/${stamp}.mp4`;

  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'video/mp4', 'x-upsert': 'true' },
    body: await file.arrayBuffer(),
  });
  if (!up.ok) return json({ error: `storage: ${await up.text()}` }, 502);

  const url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  // `media_assets` có UNIQUE (source_type, source_id, variant) ⇒ nộp lại cùng
  // một công cụ thì CẬP NHẬT dòng cũ, trỏ sang file mới. Sổ luôn chỉ vào bản
  // mới nhất, còn file cũ vẫn nằm trong kho để đối chiếu.
  // Khổ do NGƯỜI NỘP khai — clip nay giao ra 720×1280 (xem `--scale` trong
  // `gen-insight.mjs`), viết cứng 1080×1920 là sổ nói sai về chính file trong kho.
  const width = Number(form.get('width')) || 1080;
  const height = Number(form.get('height')) || 1920;

  const row = {
    source_type: 'tool-demo',
    source_id: toolId,
    variant,
    url,
    width,
    height,
    meta: { ...meta, path, bytes: file.size, ingested_at: new Date().toISOString() },
  };

  const ins = await fetch(
    `${SB_URL}/rest/v1/media_assets?on_conflict=source_type,source_id,variant`,
    {
      method: 'POST',
      headers: {
        ...H,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    }
  );
  if (!ins.ok) return json({ error: `media_assets: ${await ins.text()}` }, 502);

  const saved = (await ins.json())[0] ?? {};

  /*
   * ── XẾP HÀNG ĐĂNG — SAU MỘT CÁI VAN, mặc định ĐÓNG ───────────────────────
   *
   * 🔴 VÌ SAO PHẢI CÓ VAN RIÊNG chứ không dùng luôn `social.autopost_enabled`:
   * cờ đó đang BẬT trên prod cho đường ẢNH (bài trích từ `khao_luan`, có
   * brand-check gác trước khi vào kho). Clip video KHÔNG đi qua brand-check —
   * nó qua cổng 1 + hội đồng cổng 2. Hai cổng đó gác CHỮ và nhịp, **không ai
   * gác phần HÌNH**: chưa phép đo nào nói được đoạn phim nền có ăn nhập với lời
   * đọc không. Dùng chung cờ nghĩa là một clip CHƯA AI NHÌN tự lên trang công
   * khai ngay lượt cron kế tiếp.
   * ⇒ `social.clip_autopost` mặc định **false**: đường nối xong, van do người mở.
   *
   * 🔑 Và CỐ Ý không giữ danh sách kênh ở đây. Chép `SUPPORTED_CHANNELS` sang
   * Deno là dựng bản thứ hai rồi trôi khỏi nhau — đúng lớp lỗi repo đã trả giá
   * nhiều lần. Kênh lấy TRỌN từ `social.channels`; kênh nào chưa có adapter thì
   * `publishQueue` báo lỗi và panel admin đã có sẵn cảnh báo cho đúng ca đó.
   */
  const queued: string[] = [];
  if (saved.id) {
    const cfg = await fetch(
      `${SB_URL}/rest/v1/app_config?key=in.("social.clip_autopost","social.channels")&select=key,value`,
      { headers: H }
    )
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    const byKey: Record<string, unknown> = {};
    for (const r of cfg as { key: string; value: unknown }[]) byKey[r.key] = r.value;

    if (byKey['social.clip_autopost'] === true) {
      const channels = Array.isArray(byKey['social.channels'])
        ? (byKey['social.channels'] as string[])
        : [];
      const caption = String(form.get('caption') ?? '').slice(0, 5000);
      const hashtags = String(form.get('hashtags') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      const linkUrl = String(form.get('link') ?? '') || null;

      for (const ch of channels) {
        // UNIQUE (asset_id, channel) ⇒ nộp lại cùng clip KHÔNG đẻ dòng trùng,
        // và `ignore-duplicates` giữ nguyên dòng cũ (kể cả dòng đã `live`) —
        // đè lên là đăng lại một bài đã lên trang.
        const q = await fetch(`${SB_URL}/rest/v1/media_posts?on_conflict=asset_id,channel`, {
          method: 'POST',
          headers: {
            ...H,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
          },
          body: JSON.stringify({
            asset_id: saved.id,
            channel: ch,
            caption,
            hashtags,
            link_url: linkUrl,
            status: 'queued',
          }),
        });
        if (q.ok) queued.push(ch);
      }
    }
  }

  return json({ success: true, asset_id: saved.id, url, path, queued });
});
