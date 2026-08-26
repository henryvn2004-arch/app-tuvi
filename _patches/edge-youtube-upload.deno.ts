// youtube-upload v4 — upload MP4 video (ưu tiên video_url, fallback audio)
//
// ⚠️ ĐÂY LÀ BẢN NGUỒN CỦA EDGE FUNCTION `youtube-upload` ĐANG CHẠY TRÊN SUPABASE.
// Trước v4 nó CHỈ tồn tại trên dashboard Supabase, không ai đọc lại được lúc đi
// tìm nguyên nhân — đúng bệnh đã phải vá một lần với `send-daily-push`. Sửa ở
// đây rồi deploy, và deploy xong phải ĐỌC NGƯỢC lại bản đang chạy để chốt khớp.
//
// ── v4 thêm gì: CHỐT KÊNH ────────────────────────────────────────────────────
// 11/08 lượt `yt-drain` đăng 3 video CÔNG KHAI lên kênh CÁ NHÂN của chủ site
// thay vì kênh thương hiệu. Không có dòng nào sai: YouTube Data API `videos.insert`
// đăng vào kênh mà REFRESH TOKEN gắn với, và một tài khoản Google có nhiều kênh
// (kênh cá nhân + các Brand Account). Lúc cấp lại quyền, Google hỏi "chọn kênh"
// — chọn nhầm là mọi video sau đó đi nhầm chỗ.
//
// 🔑 Đây là loại hỏng IM LẶNG tệ nhất trong pipeline này: không lỗi nào bắn ra,
// `yt_status` vẫn `live`, dòng DB vẫn đẹp — chỉ có video nằm sai kênh, công khai,
// dưới tên một người thay vì một thương hiệu. Và nó tự nhân lên: 83 video còn
// trong kho sẽ theo nhau đi nhầm mỗi ngày mà không ai hay.
//
// ⇒ FAIL-CLOSED: chưa khai `YOUTUBE_CHANNEL_ID` thì KHÔNG đăng. Ngược hẳn với
// mấy cầu dao "fail-open" khác trong repo, và ngược có lý do: bên kia chặn oan
// người đã trả tiền là tệ nhất, còn ở đây ĐĂNG NHẦM mới là tệ nhất — đăng rồi
// thì phải đi gỡ tay, và trong lúc chưa gỡ thì nó đã công khai.
//
// ── v4 gỡ luôn: CLIENT_ID/SECRET VIẾT CỨNG ───────────────────────────────────
// Tới v3 hai giá trị này nằm thẳng trong source làm giá trị mặc định — ai đọc
// được function là biết mật khẩu của app. Nợ bảo mật đã ghi sổ từ 01/08.
//
// Chỗ ép phải xử ngay: GitHub push protection CHẶN commit mang client id/secret
// của Google, nên không thể vừa đưa nguồn vào repo vừa giữ giá trị viết cứng —
// phải chọn một. Chọn gỡ, và gỡ ĐÚNG LÚC NÀY là rẻ nhất: chốt kênh phía dưới
// vốn đã làm đường upload đứng im, nên yêu cầu thêm hai env không làm hỏng
// thêm thứ gì đang chạy.
//
// ⚠️ Thứ tự bắt buộc khi ROTATE (đừng đảo): đặt env bằng giá trị HIỆN TẠI →
// deploy bản này → mới đổi secret ở Google rồi cập nhật env. Đảo lại là có một
// quãng function cầm giá trị đã chết.
const SB_URL        = Deno.env.get('SUPABASE_URL') ?? '';
const SB_KEY        = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CLIENT_ID     = Deno.env.get('YOUTUBE_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('YOUTUBE_CLIENT_SECRET') ?? '';
const REFRESH_TOKEN = Deno.env.get('YOUTUBE_REFRESH_TOKEN') ?? '';
/** Kênh DUY NHẤT được phép nhận video. Bỏ trống = chặn hẳn (xem chú thích trên). */
const EXPECT_CHANNEL = (Deno.env.get('YOUTUBE_CHANNEL_ID') ?? '').trim();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const H = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };

async function getAccessToken(): Promise<{ token: string; scope: string }> {
  // Thiếu env thì nói THẲNG tên biến còn thiếu. Không có bước này, Google trả
  // `invalid_client` và người đọc log lại đi tìm nhầm sang phía refresh token —
  // đúng cái vòng đã tốn một lượt chẩn hồi 16/07. Tiền tố `missing_env` là mã
  // máy đọc: `lib/media/yt-drain.ts` coi đây là lỗi CHẶN.
  const thieu = [
    ['YOUTUBE_CLIENT_ID', CLIENT_ID],
    ['YOUTUBE_CLIENT_SECRET', CLIENT_SECRET],
    ['YOUTUBE_REFRESH_TOKEN', REFRESH_TOKEN],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (thieu.length) {
    throw new Error(
      'missing_env: thiếu env ' + thieu.join(', ') + ' trong Supabase Edge Function Secrets. ' +
      'Đặt xong chạy lại; không có chúng thì không đăng được gì.'
    );
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token',
    }).toString(),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Cannot get access token: ' + JSON.stringify(d));
  // Trả kèm SCOPE ĐÃ ĐƯỢC CẤP. Màn consent của Google có ô tick cho từng quyền;
  // bỏ tick một ô thì token vẫn sống nhưng thiếu scope, và `channels.list` trả
  // 200 với danh sách RỖNG — nhìn y hệt ca "tài khoản không có kênh nào". Không
  // in scope ra thì hai ca đó không phân biệt được, và người sửa phải đoán.
  return { token: d.access_token, scope: String(d.scope || '(Google không trả scope)') };
}

/**
 * Chốt: token này đang trỏ tới ĐÚNG kênh chứ?
 *
 * Tiền tố `channel_mismatch` là MÃ MÁY ĐỌC — `lib/media/yt-drain.ts` khớp chuỗi
 * đó để coi đây là lỗi CHẶN (dừng cả lượt, không thử bài kế tiếp). Đừng đổi tiền
 * tố mà quên đổi bên đó; phần tiếng Việt phía sau thì sửa thoải mái.
 *
 * `channels.list` tốn 1 đơn vị quota, so với 1.600 cho một lượt upload — rẻ tới
 * mức không đáng cân nhắc bỏ qua.
 */
async function assertChannel(accessToken: string, grantedScope: string): Promise<void> {
  const r = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { headers: { 'Authorization': 'Bearer ' + accessToken } }
  );
  if (!r.ok) {
    throw new Error('channel_mismatch: không đọc được kênh của token (HTTP ' + r.status + '): ' + await r.text());
  }
  const d = await r.json();
  const ch = d?.items?.[0];
  if (!ch?.id) {
    // Danh sách RỖNG có ĐÚNG HAI nguyên nhân, và chúng cần hai cách sửa khác
    // hẳn nhau — nên phải nêu bằng chứng để phân biệt, đừng bắt người đọc đoán:
    //   (a) thiếu scope `…/auth/youtube` (bỏ tick một ô ở màn consent)
    //   (b) tài khoản/kênh vừa chọn KHÔNG có kênh YouTube nào
    // Cẩn thận khi dò: `…/auth/youtube.upload` CHỨA `…/auth/youtube` nên phải
    // xét ranh giới (dấu cách hoặc cuối chuỗi), không thì scope hẹp cũng đọc
    // thành scope đủ và bản chẩn đoán chỉ sai đường.
    const scopes = grantedScope.split(/\s+/).filter(Boolean);
    const coScope = scopes.includes('https://www.googleapis.com/auth/youtube');
    const biet = scopes.length > 0;
    throw new Error(
      'channel_mismatch: token không thấy kênh YouTube nào (channels.list trả rỗng). ' +
      'Scope đã cấp: [' + grantedScope + ']. ' +
      (!biet
        ? 'Không đọc được scope nên chưa loại trừ được nguyên nhân — thử cấp lại quyền, ' +
          'TICK HẾT ô quyền, và chọn đúng kênh thương hiệu.'
        : coScope
          ? 'Scope ĐỦ ⇒ tài khoản vừa chọn không sở hữu kênh YouTube nào. Cấp lại quyền và ở màn ' +
            '"Choose a channel" chọn đúng kênh thương hiệu (Brand Account), đừng chọn tài khoản trống.'
          : 'THIẾU scope ".../auth/youtube" ⇒ lúc cấp quyền có ô tick bị bỏ. Cấp lại và ' +
            'TICK HẾT các ô quyền trên màn consent của Google.')
    );
  }
  const id    = String(ch.id);
  const title = String(ch.snippet?.title ?? '?');

  if (!EXPECT_CHANNEL) {
    throw new Error(
      'channel_mismatch: chưa khai env YOUTUBE_CHANNEL_ID nên KHÔNG đăng (fail-closed). ' +
      'Token đang trỏ tới kênh "' + title + '" (' + id + '). ' +
      'Nếu ĐÚNG đó là kênh muốn đăng thì đặt YOUTUBE_CHANNEL_ID=' + id + ' rồi chạy lại. ' +
      'Nếu SAI thì cấp lại refresh token và chọn đúng kênh ở bước "Choose a channel".'
    );
  }
  if (id !== EXPECT_CHANNEL) {
    throw new Error(
      'channel_mismatch: token trỏ tới kênh "' + title + '" (' + id + ') ' +
      'chứ KHÔNG phải kênh đã khai (' + EXPECT_CHANNEL + '). Không đăng gì cả. ' +
      'Cấp lại refresh token và chọn đúng kênh ở bước "Choose a channel".'
    );
  }
  console.log('Kênh đích OK:', title, id);
}

async function getItem(id: string) {
  const r = await fetch(SB_URL + '/rest/v1/van_dap?id=eq.' + id + '&select=*', { headers: H });
  return (await r.json())?.[0] ?? null;
}

async function updateYT(id: string, body: any) {
  await fetch(SB_URL + '/rest/v1/van_dap?id=eq.' + id, {
    method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify(body)
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const { id } = body;
  if (!id) return new Response(JSON.stringify({ error: 'missing id' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const item = await getItem(id);
  if (!item) return new Response(JSON.stringify({ error: 'item not found' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });

  // Ưu tiên video MP4 đã mix, fallback về audio
  const fileUrl     = item.video_url || item.audio_final_url || item.audio_hoi_url;
  const isVideo     = !!(item.video_url || item.audio_final_url?.endsWith('.mp4'));
  const contentType = isVideo ? 'video/mp4' : 'video/*';

  if (!fileUrl) return new Response(JSON.stringify({ error: 'no video/audio file — run Mix first' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

  await updateYT(id, { yt_status: 'uploading' });

  try {
    const { token: accessToken, scope: grantedScope } = await getAccessToken();
    // Chốt kênh TRƯỚC khi tải file về: sai kênh thì không việc gì phải kéo cả
    // một video MP4 qua mạng để rồi vứt đi.
    await assertChannel(accessToken, grantedScope);

    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) throw new Error('Cannot download file: ' + fileResp.status);
    const fileBuffer = await fileResp.arrayBuffer();
    console.log('File size:', fileBuffer.byteLength, 'type:', contentType);

    const title       = (item.yt_title || item.title || 'Tu Vi Van Dap').substring(0, 100);
    const description = (item.yt_description || item.title || '').substring(0, 5000);
    const tags        = (item.yt_tags || item.tags || []).slice(0, 30);

    const metadata = {
      snippet: { title, description, tags, categoryId: '22' },
      status:  { privacyStatus: 'public', selfDeclaredMadeForKids: false }
    };

    const initResp = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization':           'Bearer ' + accessToken,
          'Content-Type':            'application/json',
          'X-Upload-Content-Type':   contentType,
          'X-Upload-Content-Length': String(fileBuffer.byteLength),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResp.ok) throw new Error('YT init failed: ' + await initResp.text());
    const uploadUrl = initResp.headers.get('location');
    if (!uploadUrl) throw new Error('No upload URL from YouTube');

    const uploadResp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': contentType },
      body: fileBuffer,
    });

    if (!uploadResp.ok) throw new Error('YT upload failed: ' + await uploadResp.text());

    const result  = await uploadResp.json();
    const videoId = result.id;
    const ytUrl   = 'https://www.youtube.com/watch?v=' + videoId;

    await updateYT(id, {
      yt_status: 'live', yt_video_id: videoId, yt_url: ytUrl,
      yt_published_at: new Date().toISOString(), publish_status: 'published',
    });

    console.log('Uploaded:', ytUrl);
    return new Response(JSON.stringify({ success: true, video_id: videoId, url: ytUrl }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('upload error:', e.message);
    await updateYT(id, { yt_status: 'error', yt_error: e.message });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
