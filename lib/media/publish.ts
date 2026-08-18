// lib/media/publish.ts
// ============================================================
// M3 (track Media Pipeline) — ĐĂNG THẬT. Khâu cuối, thay cho hàng đợi duyệt tay.
//
// M2 cố ý dừng ở chỗ chờ người bấm duyệt. Henry chốt bỏ khâu đó: dựng xong đăng
// luôn. File này là phần còn thiếu để câu "publish luôn" có nghĩa — trước đây
// KHÔNG có dòng code nào đẩy `media_posts` đi đâu cả, nên `approved` là ngõ cụt.
//
// BỐN QUYẾT ĐỊNH, ba trong số đó chép thẳng bài học của `yt-drain.ts` — kho
// YouTube đã trả giá đúng những lỗi này rồi, không cần trả lần thứ hai:
//
//  1. **Lỗi CHẶN thì dừng cả lượt.** Token hết hạn / thiếu quyền / dính giới hạn
//     tần suất là trạng thái của CÁI CỬA, không phải của bài. 84 dòng `yt_error`
//     giống hệt nhau là hậu quả của việc cứ thử mãi một thứ đã hỏng: ghi đè dấu
//     vết, đốt hạn mức, và làm cảnh báo mất giá trị.
//
//  2. **Giành lượt bằng PATCH có điều kiện.** Đổi `queued → publishing` kèm bộ
//     lọc trạng thái rồi xem có trả về dòng nào không. Hai lượt cron chồng nhau
//     thì chỉ một lượt giành được — `media_posts` không có ràng buộc nào chặn
//     đăng lại cùng một dòng, nên chốt chặn phải nằm ở đây.
//
//  3. **Ngân sách thời gian, dừng giữa hai lượt.** Bị giết ngang để lại dòng
//     `publishing` treo; đếm và báo ra thay vì giấu.
//
//  4. **Công tắc `social.autopost_enabled` GIỮ NGUYÊN, chỉ đổi mặc định.** Bỏ
//     khâu duyệt không có nghĩa là bỏ luôn cái phanh: đây là đường duy nhất tắt
//     tự đăng mà không cần deploy, và nội dung đã lên trang công khai thì không
//     rút lại được như một dòng DB.
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';
import { GRAPH_BASE } from '@/lib/channels/meta';
import { tgSendPhoto, tgSendVideo } from '@/lib/channels/telegram';
import { getTiktokAccessToken } from '@/lib/media/tiktok-token';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

/** Trần cứng/lượt — chặn một cấu hình sai biến thành trận bom bài lên trang. */
const HARD_MAX = 10;
const DEFAULT_DAILY = 3;

/**
 * Lỗi thuộc nhóm này nghĩa là "cửa đang khoá", không phải "bài này hỏng". Khớp
 * theo chuỗi con vì Graph trả JSON thô chứ không phải mã lỗi sạch:
 *   190 token hết hạn/bị thu hồi · 200 & 10 thiếu quyền (`pages_manage_posts`)
 *   4 · 17 · 32 · 613 chạm giới hạn tần suất của app/page
 */
const BLOCKING_PATTERNS = [
  // Kênh chưa khai env là CỬA chưa mở, không phải bài hỏng. Không có dòng này
  // thì mỗi bài của kênh chưa cấu hình lại thành một dòng `error` riêng — với
  // 4 kênh là vài chục dòng lỗi mỗi sáng, và bài thì mất luôn khỏi hàng đợi.
  'thiếu env',
  // Dấu hiệu DÙNG CHUNG cho mọi adapter: cửa của kênh chưa mở (token chết,
  // chưa cấp lần đầu, không làm mới được). Đây là lỗi của CÁI CỬA chứ không
  // phải của bài — thử bài kế tiếp chỉ đẻ thêm một dòng lỗi giống hệt. Kênh
  // nào cần thì tự bọc lỗi bằng tiền tố này (xem `publishTiktok`).
  'cửa chưa mở',
  'oauthexception',
  'access token',
  'session has expired',
  'permission',
  'not authorized',
  'unauthorized',
  'rate limit',
  'request limit',
  'calls to this api have exceeded',
  'temporarily blocked',
];

export interface PublishedItem {
  id: string;
  channel: string;
  title: string;
  url?: string;
  error?: string;
}

export interface PublishResult {
  attempted: number;
  published: PublishedItem[];
  failed: PublishedItem[];
  /** Có giá trị khi lượt bị cắt ngang: lỗi chặn, tắt công tắc, hết giờ. */
  stoppedReason?: string;
  /** Số bài còn chờ đăng SAU lượt này. */
  remaining: number;
  /** Dòng kẹt `publishing` — dấu vết lượt bị giết ngang, cần người nhìn. */
  stuck: number;
  /** Kênh đã đóng cửa trong lượt này (token/quyền/rate-limit). */
  blockedChannels: string[];
}

function isBlocking(msg: string): boolean {
  const m = (msg || '').toLowerCase();
  return BLOCKING_PATTERNS.some((p) => m.includes(p));
}

async function countRows(filter: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/media_posts?${filter}&select=id`, {
    headers: { ...SB_HEADERS, Prefer: 'count=exact', Range: '0-0' },
    cache: 'no-store',
  });
  if (!res.ok) return 0;
  const total = (res.headers.get('content-range') || '').split('/')[1];
  return Number(total) || 0;
}

/** "Sẵn sàng đăng": chưa lên, chưa bị bỏ, chưa có ai đang cầm. */
const READY_FILTER = 'status=in.(queued,approved)';

interface QueueRow {
  id: string;
  channel: string;
  caption: string | null;
  hashtags: string[] | null;
  link_url: string | null;
  media_assets: { url: string; meta: Record<string, unknown> | null } | null;
}

interface AdapterOut {
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

/**
 * Trần độ dài phần chữ của từng kênh. Không phải chi tiết vụn: Threads cắt ở
 * **500 ký tự**, mà caption `build.ts` viết ra đã tới ~400 rồi cộng link + thẻ
 * — gửi thẳng là kênh đó lỗi mỗi ngày. `linkStyle` cũng theo kênh: Instagram
 * KHÔNG cho link bấm được trong caption, nên dán nguyên URL kèm UTM ở đó vừa
 * xấu vừa không đo được gì.
 */
interface CaptionStyle {
  maxLen: number;
  linkStyle: 'full' | 'bare';
}

const CAPTION_STYLE: Record<string, CaptionStyle> = {
  facebook: { maxLen: 5000, linkStyle: 'full' },
  instagram: { maxLen: 2200, linkStyle: 'bare' },
  threads: { maxLen: 500, linkStyle: 'full' },
  telegram: { maxLen: 1024, linkStyle: 'full' }, // trần caption của sendPhoto
  // TikTok không có link bấm được trong caption ⇒ dạng trần để người xem gõ lại.
  tiktok: { maxLen: 2200, linkStyle: 'bare' },
};

/** Bỏ query UTM, giữ host + đường dẫn — dạng người ta gõ lại được bằng tay. */
function bareLink(url: string): string {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/\/$/, '');
  } catch {
    return '';
  }
}

/**
 * Phần chữ đi kèm ảnh. Link mang sẵn UTM (dựng ở `build.ts`) — đó là thứ duy
 * nhất cho biết kênh nào thật sự kéo được người về.
 *
 * Khi phải cắt cho vừa trần, CẮT PHẦN CAPTION chứ không cắt đuôi: link và thẻ
 * là thứ mang lại giá trị đo được, còn caption thiếu một câu cuối thì vẫn đọc
 * được. Cắt từ cuối chuỗi gộp sẽ ăn mất đúng phần đáng giữ.
 */
function composeCaption(row: QueueRow, channel: string): string {
  const style = CAPTION_STYLE[channel] || { maxLen: 2000, linkStyle: 'full' as const };
  const rawLink = (row.link_url || '').trim();
  const link = style.linkStyle === 'bare' ? bareLink(rawLink) : rawLink;
  const tags = (row.hashtags || []).filter(Boolean).map((h) => '#' + String(h).replace(/^#/, ''));

  const tail = [link, tags.join(' ')].filter(Boolean).join('\n\n');
  const room = style.maxLen - (tail ? tail.length + 2 : 0);
  let body = (row.caption || '').trim();
  // Đuôi dài hơn cả trần (thẻ quá nhiều) → bỏ caption, giữ đuôi đã cắt.
  if (room <= 0) return tail.slice(0, style.maxLen);
  if (body.length > room) body = body.slice(0, room - 1).trimEnd() + '…';
  return [body, tail].filter(Boolean).join('\n\n');
}

const FB_PAGE_ID = (process.env.FB_PAGE_ID || process.env.MESSENGER_PAGE_ID || '').replace(/\D/g, '');
const FB_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';

/**
 * Facebook Page — đăng ẢNH KÈM CHỮ qua `/{page-id}/photos`.
 *
 * Gửi `url` chứ không upload nhị phân: ảnh do `/api/og/social` render on-demand,
 * URL công khai và ổn định, để Facebook tự tải về. Đây cũng chính là điều kiện
 * Instagram Graph API đòi hỏi sau này — cùng một asset dùng lại được.
 *
 * ⚠️ Cần quyền `pages_manage_posts` trên page token. App Meta của repo này dựng
 * cho Messenger (`pages_messaging`) và còn ở Development mode — nếu chưa xin
 * thêm quyền thì lượt đầu sẽ trả OAuthException và cả lượt dừng lại ở đó, kèm
 * hướng dẫn trong bản tin Telegram.
 */
async function publishFacebook(row: QueueRow): Promise<AdapterOut> {
  if (!FB_PAGE_ID) return { error: 'Thiếu env FB_PAGE_ID (hoặc MESSENGER_PAGE_ID)' };
  if (!FB_TOKEN) return { error: 'Thiếu env FB_PAGE_ACCESS_TOKEN (hoặc MESSENGER_PAGE_ACCESS_TOKEN)' };
  const imageUrl = row.media_assets?.url || '';
  if (!imageUrl) return { error: 'Asset không có URL' };
  if (isVideoAsset(imageUrl)) return publishFacebookVideo(row, imageUrl);

  try {
    const res = await fetch(`${GRAPH_BASE}/${FB_PAGE_ID}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption: composeCaption(row, 'facebook'),
        published: true,
        access_token: FB_TOKEN,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      post_id?: string;
      error?: { message?: string; code?: number; error_subcode?: number };
    };
    if (body.error) {
      const code = body.error.code ? ` (code ${body.error.code})` : '';
      return { error: `${body.error.message || 'Graph error'}${code}` };
    }
    if (!res.ok) return { error: `HTTP ${res.status}` };
    // post_id dạng "<pageid>_<postid>" mới là bài trên dòng thời gian; `id` chỉ
    // là id tấm ảnh, mở ra không phải bài đăng.
    const postId = body.post_id || body.id || '';
    if (!postId) return { error: 'Graph trả về rỗng, không có post_id' };
    return { externalId: postId, externalUrl: `https://www.facebook.com/${postId}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GraphBody {
  id?: string;
  permalink?: string;
  status_code?: string;
  status?: string;
  error?: { message?: string; code?: number };
  error_message?: string;
}

async function readGraph(res: Response | null): Promise<{ body: GraphBody; error?: string }> {
  if (!res) return { body: {}, error: 'không gọi được API (mạng hoặc thiếu token)' };
  const body = (await res.json().catch(() => ({}))) as GraphBody;
  if (body.error) {
    const code = body.error.code ? ` (code ${body.error.code})` : '';
    return { body, error: `${body.error.message || 'API error'}${code}` };
  }
  if (!res.ok) return { body, error: `HTTP ${res.status}` };
  return { body };
}

/**
 * Instagram và Threads đều đăng ẢNH theo HAI BƯỚC: tạo container rồi mới
 * publish. Container xử lý BẤT ĐỒNG BỘ — publish ngay khi vừa tạo sẽ trả lỗi
 * "media not ready" một cách ngẫu nhiên tuỳ lúc nền tảng tải ảnh nhanh hay
 * chậm. Nên hỏi trạng thái tới khi xong; hỏng thì trả lý do thật của nền tảng
 * thay vì để bước publish báo một lỗi khó hiểu.
 */
/**
 * Asset này là VIDEO hay ẢNH?
 *
 * 🔑 Đọc theo ĐUÔI FILE chứ không theo `variant` — đuôi là sự thật vật lý về
 * file, còn `variant` là quy ước đặt tên do người nộp tự khai (`clip-ingest`
 * nhận nó từ form). Và `QueueRow.media_assets` vốn chỉ select `url` + `meta`,
 * không có `variant` để mà đọc.
 */
function isVideoAsset(url: string): boolean {
  try {
    return /\.(mp4|mov|webm|m4v)$/i.test(new URL(url).pathname);
  } catch {
    return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
  }
}

/**
 * @param rounds số vòng hỏi. Mặc định 8 (~24s) đủ cho ẢNH; VIDEO phải nới hẳn —
 *   Instagram xử lý một Reel thường mất 30–90 giây, hết vòng là bài bị đánh
 *   `error` và phải vào Admin bấm thử lại. Đó là lý do nhánh video truyền 20
 *   vòng (~100s) chứ không dùng mặc định.
 */
async function waitContainer(
  base: string,
  containerId: string,
  token: string,
  field: 'status_code' | 'status',
  rounds = 8,
): Promise<string | undefined> {
  for (let i = 0; i < rounds; i++) {
    await sleep(i === 0 ? 1500 : 3000);
    const res = await fetch(
      `${base}/${containerId}?fields=${field},error_message&access_token=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    ).catch(() => null);
    const { body, error } = await readGraph(res);
    if (error) return error;
    const st = String(body[field] || '').toUpperCase();
    if (st === 'FINISHED') return undefined;
    if (st === 'PUBLISHED') return undefined;
    if (st === 'ERROR' || st === 'EXPIRED') {
      return body.error_message || `container ${st.toLowerCase()}`;
    }
  }
  return `chưa xử lý xong sau ~${Math.round((1.5 + (rounds - 1) * 3) / 1)}s — vào Admin bấm thử lại`;
}

/** Đường dẫn công khai của bài, hỏi riêng vì bước publish chỉ trả về id. */
async function permalinkOf(base: string, mediaId: string, token: string): Promise<string | undefined> {
  const res = await fetch(`${base}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  }).catch(() => null);
  const { body } = await readGraph(res);
  return body.permalink || undefined;
}

const IG_USER_ID = (process.env.IG_USER_ID || '').replace(/\D/g, '');
const IG_TOKEN = process.env.IG_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN || '';

/**
 * Instagram Business — `/{ig-user-id}/media` → `/media_publish`.
 *
 * Dùng LẠI nguyên asset của Facebook: Instagram Graph API bắt buộc ảnh phải có
 * URL công khai, mà `/api/og/social` vốn đã thoả điều kiện đó — đây chính là
 * lý do M2 chọn "URL là file" thay vì upload vào bucket.
 *
 * ⚠️ Cần `instagram_content_publish` và một tài khoản IG **Business** đã liên
 * kết với Page; token Page dùng chung được.
 */
async function publishInstagram(row: QueueRow): Promise<AdapterOut> {
  if (!IG_USER_ID) return { error: 'Thiếu env IG_USER_ID' };
  if (!IG_TOKEN) return { error: 'Thiếu env IG_ACCESS_TOKEN (hoặc FB_PAGE_ACCESS_TOKEN)' };
  const imageUrl = row.media_assets?.url || '';
  if (!imageUrl) return { error: 'Asset không có URL' };

  /*
   * Video đi ĐÚNG chuỗi hai bước như ảnh, chỉ đổi tham số container:
   * `media_type: 'REELS'` + `video_url`. Instagram KHÔNG còn nhận video dạng
   * bài thường qua API — mọi video đăng bằng Graph đều là Reel, nên đây không
   * phải lựa chọn mà là đường duy nhất.
   *
   * Và vì thế phải nới số vòng chờ: xử lý một Reel lâu hơn hẳn một tấm ảnh.
   */
  const isVideo = isVideoAsset(imageUrl);

  try {
    const created = await fetch(`${GRAPH_BASE}/${IG_USER_ID}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isVideo ? { media_type: 'REELS', video_url: imageUrl } : { image_url: imageUrl }),
        caption: composeCaption(row, 'instagram'),
        access_token: IG_TOKEN,
      }),
    }).catch(() => null);
    const { body, error } = await readGraph(created);
    if (error) return { error };
    const creationId = body.id;
    if (!creationId) return { error: 'Instagram không trả creation_id' };

    const waitErr = await waitContainer(GRAPH_BASE, creationId, IG_TOKEN, 'status_code', isVideo ? 20 : 8);
    if (waitErr) return { error: waitErr };

    const pub = await fetch(`${GRAPH_BASE}/${IG_USER_ID}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: IG_TOKEN }),
    }).catch(() => null);
    const done = await readGraph(pub);
    if (done.error) return { error: done.error };
    const mediaId = done.body.id;
    if (!mediaId) return { error: 'Instagram trả về rỗng, không có media id' };

    return { externalId: mediaId, externalUrl: await permalinkOf(GRAPH_BASE, mediaId, IG_TOKEN) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Facebook Page — đăng VIDEO qua `/{page-id}/videos` với `file_url`.
 *
 * ⚖️ CỐ Ý dùng `/videos` chứ KHÔNG dùng `/video_reels` dù clip đã đúng khổ 9:16
 * và Reels có reach tốt hơn hẳn: endpoint Reels bắt buộc chuỗi **ba bước**
 * (`start` → upload nhị phân theo phiên resumable → `finish`), tức phải tự tải
 * mp4 về runner rồi đẩy từng khúc — ba chỗ hỏng thay vì một, trong khi `/videos`
 * chỉ cần một request và để Facebook tự tải từ URL công khai (cùng cơ chế đã
 * chạy cho ảnh). Video dọc vẫn hiển thị bình thường trên dòng thời gian.
 * ⇒ Nếu sau này đo được reach của `/videos` quá thấp thì mới đáng dựng Reels.
 *
 * ⚠️ Quyền cần thêm so với ảnh: `pages_manage_posts` là đủ cho cả hai, nhưng
 * video phải qua bước xử lý phía Facebook nên `id` trả về NGAY còn bài thì hiện
 * sau vài chục giây. Không chờ ở đây — chờ nghĩa là chiếm ngân sách thời gian
 * của cả lượt cron cho một thứ Facebook chắc chắn sẽ làm xong.
 */
async function publishFacebookVideo(row: QueueRow, videoUrl: string): Promise<AdapterOut> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${FB_PAGE_ID}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: videoUrl,
        description: composeCaption(row, 'facebook'),
        published: true,
        access_token: FB_TOKEN,
      }),
    }).catch(() => null);
    const { body, error } = await readGraph(res);
    if (error) return { error };
    const videoId = body.id;
    if (!videoId) return { error: 'Graph trả về rỗng, không có video id' };
    return { externalId: videoId, externalUrl: `https://www.facebook.com/${FB_PAGE_ID}/videos/${videoId}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const THREADS_BASE = 'https://graph.threads.net/v1.0';
const THREADS_USER_ID = (process.env.THREADS_USER_ID || '').replace(/\D/g, '');
const THREADS_TOKEN = process.env.THREADS_ACCESS_TOKEN || '';

/**
 * Threads — cùng hình dạng hai bước như Instagram nhưng **host riêng**
 * (`graph.threads.net`) và **token riêng**: token Page của Facebook KHÔNG dùng
 * được ở đây, phải cấp qua Threads API.
 *
 * Chữ bị cắt ở 500 ký tự (xem CAPTION_STYLE) — đây là kênh chặt nhất.
 */
async function publishThreads(row: QueueRow): Promise<AdapterOut> {
  if (!THREADS_USER_ID) return { error: 'Thiếu env THREADS_USER_ID' };
  if (!THREADS_TOKEN) return { error: 'Thiếu env THREADS_ACCESS_TOKEN' };
  const imageUrl = row.media_assets?.url || '';
  if (!imageUrl) return { error: 'Asset không có URL' };
  const isVideo = isVideoAsset(imageUrl);

  try {
    const created = await fetch(`${THREADS_BASE}/${THREADS_USER_ID}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isVideo
          ? { media_type: 'VIDEO', video_url: imageUrl }
          : { media_type: 'IMAGE', image_url: imageUrl }),
        text: composeCaption(row, 'threads'),
        access_token: THREADS_TOKEN,
      }),
    }).catch(() => null);
    const { body, error } = await readGraph(created);
    if (error) return { error };
    const creationId = body.id;
    if (!creationId) return { error: 'Threads không trả creation_id' };

    const waitErr = await waitContainer(THREADS_BASE, creationId, THREADS_TOKEN, 'status', isVideo ? 20 : 8);
    if (waitErr) return { error: waitErr };

    const pub = await fetch(`${THREADS_BASE}/${THREADS_USER_ID}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: THREADS_TOKEN }),
    }).catch(() => null);
    const done = await readGraph(pub);
    if (done.error) return { error: done.error };
    const mediaId = done.body.id;
    if (!mediaId) return { error: 'Threads trả về rỗng, không có media id' };

    return { externalId: mediaId, externalUrl: await permalinkOf(THREADS_BASE, mediaId, THREADS_TOKEN) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const TG_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';

/**
 * Telegram channel — kênh DUY NHẤT chạy được ngay hôm nay: token bot đã có sẵn
 * trên Vercel từ track kênh chat, không phải xin quyền hay chờ Meta duyệt gì.
 * Việc tay chỉ là thêm bot làm admin của channel rồi khai `TELEGRAM_CHANNEL_ID`.
 *
 * Một bước, không container: `sendPhoto` với `photo` là URL để Telegram tự tải.
 */
async function publishTelegram(row: QueueRow): Promise<AdapterOut> {
  if (!TG_CHANNEL_ID) return { error: 'Thiếu env TELEGRAM_CHANNEL_ID' };
  const imageUrl = row.media_assets?.url || '';
  if (!imageUrl) return { error: 'Asset không có URL' };

  try {
    const send = isVideoAsset(imageUrl) ? tgSendVideo : tgSendPhoto;
    const { messageId, username } = await send(TG_CHANNEL_ID, imageUrl, composeCaption(row, 'telegram'));
    return {
      externalId: String(messageId),
      // Channel riêng tư không có username → không có link công khai để lưu,
      // nhưng bài vẫn đã lên kênh. Đừng bịa một URL mở ra 404.
      externalUrl: username ? `https://t.me/${username}/${messageId}` : undefined,
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const TIKTOK_BASE = 'https://open.tiktokapis.com/v2';

/**
 * TikTok — Content Posting API, `PULL_FROM_URL`.
 *
 * Cùng lối "đưa URL, để nền tảng tự tải" như Facebook/Instagram, nên tái dùng
 * đúng asset trong bucket `clips`. Hai bước: `/post/publish/video/init/` trả
 * `publish_id`, rồi hỏi `/post/publish/status/fetch/` cho tới khi xong.
 *
 * 🔴 BA ĐIỀU KIỆN PHẢI BIẾT TRƯỚC, cả ba đều là việc tay, không code thay được:
 *
 * 1. **Miền của URL phải được VERIFY** trong TikTok Developer Portal (URL
 *    Prefix ownership). Chưa verify thì `PULL_FROM_URL` trả
 *    `url_ownership_unverified` — không phải lỗi token. Miền cần verify ở đây
 *    là host Supabase Storage của bucket `clips`.
 * 2. **Quyền `video.publish`** phải qua duyệt của TikTok. Trước khi duyệt, app
 *    ở chế độ sandbox chỉ đăng được ở dạng **riêng tư** cho chính tài khoản dev.
 * 3. **Token TikTok hết hạn sau 24 giờ** và refresh token thì **XOAY mỗi lượt
 *    làm mới** — khác hẳn Facebook (token Page vĩnh viễn) lẫn YouTube (refresh
 *    token cố định để yên trong env). Khâu làm mới nằm ở
 *    `lib/media/tiktok-token.ts`, lưu cặp token trong `app_config` vì env
 *    không tự ghi lại được. Xem `docs/TIKTOK-TOKEN.md` cho lượt cấp đầu tiên.
 *
 * ⚠️ Caption TikTok trần 2200 ký tự và KHÔNG có link bấm được — dùng
 * `linkStyle: 'bare'` như Instagram để người xem còn gõ lại được địa chỉ.
 */
async function publishTiktok(row: QueueRow): Promise<AdapterOut> {
  const videoUrl = row.media_assets?.url || '';
  if (!videoUrl) return { error: 'Asset không có URL' };
  if (!isVideoAsset(videoUrl)) return { error: 'TikTok chỉ nhận video, asset này là ảnh' };

  // Lấy token TRƯỚC khi soi asset xong — nhưng SAU khi loại ảnh, để lượt asset
  // sai loại không tốn một vòng làm mới token.
  const tk = await getTiktokAccessToken();
  if (tk.error || !tk.token) {
    // Tiền tố `Cửa chưa mở` đưa lỗi này vào nhóm CHẶN ⇒ dừng cả kênh TikTok
    // thay vì đánh hỏng từng bài. Token chết là lỗi của CÁI CỬA.
    return { error: `Cửa chưa mở — ${tk.error || 'không lấy được token TikTok'}` };
  }
  if (tk.warn) console.warn(`[publish] TikTok: ${tk.warn}`);

  const H = {
    Authorization: `Bearer ${tk.token}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };

  try {
    const init = await fetch(`${TIKTOK_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        post_info: { title: composeCaption(row, 'tiktok').slice(0, 2200) },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
      }),
    }).catch(() => null);
    if (!init) return { error: 'Không gọi được TikTok' };
    const ib = (await init.json().catch(() => ({}))) as {
      data?: { publish_id?: string };
      error?: { code?: string; message?: string };
    };
    // TikTok trả error.code = 'ok' khi THÀNH CÔNG — kiểm `!== 'ok'` chứ không
    // kiểm sự tồn tại của `error`, nếu không lượt thành công cũng bị đọc là hỏng.
    if (ib.error && ib.error.code && ib.error.code !== 'ok') {
      return { error: `${ib.error.message || 'TikTok error'} (${ib.error.code})` };
    }
    const publishId = ib.data?.publish_id;
    if (!publishId) return { error: 'TikTok không trả publish_id' };

    // Chờ TikTok tải xong từ URL. Cùng ngân sách với Reels (~100s) vì đây cũng
    // là bước nền tảng tự tải file về rồi mã hoá lại.
    for (let i = 0; i < 20; i++) {
      await sleep(i === 0 ? 2000 : 5000);
      const st = await fetch(`${TIKTOK_BASE}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ publish_id: publishId }),
        cache: 'no-store',
      }).catch(() => null);
      const sb = (await st?.json().catch(() => ({}))) as {
        data?: { status?: string; fail_reason?: string };
      };
      const s = String(sb?.data?.status || '').toUpperCase();
      if (s === 'PUBLISH_COMPLETE') {
        // TikTok KHÔNG trả URL bài — chỉ có publish_id. Đừng bịa một link
        // mở ra 404; để trống, sổ vẫn tra ngược được bằng id.
        return { externalId: publishId };
      }
      if (s === 'FAILED') return { error: sb?.data?.fail_reason || 'TikTok báo FAILED' };
    }
    return { error: 'TikTok chưa xử lý xong sau ~100s — vào Admin bấm thử lại' };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const ADAPTERS: Record<string, (row: QueueRow) => Promise<AdapterOut>> = {
  facebook: publishFacebook,
  instagram: publishInstagram,
  threads: publishThreads,
  telegram: publishTelegram,
  tiktok: publishTiktok,
};

/** Kênh đã có adapter thật — dùng để cảnh báo cấu hình trỏ vào chỗ chưa có. */
export const SUPPORTED_CHANNELS = Object.keys(ADAPTERS);

/**
 * Giành lấy một bài để đăng. Trả về true nếu lượt này là lượt cầm nó.
 * PATCH có điều kiện = khoá lạc quan: hai cron chồng nhau chỉ một bên thắng.
 */
async function claim(id: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/media_posts?id=eq.${id}&status=in.(queued,approved)`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'publishing', updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return false;
  return ((await res.json()) as unknown[]).length > 0;
}

async function finish(id: string, patch: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/media_posts?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

/**
 * Đăng tối đa `limit` bài đang chờ, CŨ TRƯỚC. `deadlineMs` là mốc tuyệt đối —
 * hết giờ thì dừng sạch GIỮA hai lượt, không cắt ngang một lượt đang chạy.
 */
export async function publishQueue(opts: { limit?: number; deadlineMs?: number } = {}): Promise<PublishResult> {
  const result: PublishResult = {
    attempted: 0,
    published: [],
    failed: [],
    remaining: 0,
    stuck: 0,
    blockedChannels: [],
  };

  result.stuck = await countRows('status=eq.publishing');
  result.remaining = await countRows(READY_FILTER);

  // Phanh tay. Bỏ khâu duyệt KHÔNG phải bỏ luôn đường dừng khẩn.
  const enabled = await getConfigValue<boolean>('social.autopost_enabled', false);
  if (enabled !== true) {
    result.stoppedReason = 'social.autopost_enabled = false — tự đăng đang TẮT, bài nằm chờ';
    return result;
  }

  const configured = await getConfigValue<number>('social.publish_daily', DEFAULT_DAILY);
  const limit = Math.max(0, Math.min(opts.limit ?? configured, HARD_MAX));
  if (limit === 0) {
    result.stoppedReason = 'trần đăng/lượt = 0 (đã tắt qua app_config)';
    return result;
  }
  const deadlineMs = opts.deadlineMs ?? Date.now() + 120_000;

  const qs =
    `${READY_FILTER}&select=id,channel,caption,hashtags,link_url,media_assets(url,meta)` +
    `&order=created_at.asc&limit=${limit}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/media_posts?${qs}`, { headers: SB_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`media_posts: ${await res.text()}`);
  const rows = (await res.json()) as QueueRow[];

  /**
   * Kênh đã đóng cửa trong lượt này. Bài học `yt-drain` là "đừng thử mãi một
   * cánh cửa đã khoá" — nhưng khi có NHIỀU kênh, cánh cửa khoá là của MỘT kênh,
   * không phải của cả lượt. Dừng sạch ở đây nghĩa là token Instagram hết hạn
   * cũng chặn luôn Telegram đang sống.
   */
  const blocked = new Set<string>();

  for (const row of rows) {
    if (Date.now() > deadlineMs) {
      result.stoppedReason = 'hết ngân sách thời gian của lượt cron — phần còn lại để lượt sau';
      break;
    }
    // Bài của kênh đã khoá: để nguyên `queued` cho lượt sau, KHÔNG đánh dấu
    // lỗi. Ghi lỗi hàng loạt chỉ tổ ghi đè dấu vết và làm cảnh báo mất giá trị.
    if (blocked.has(row.channel)) continue;

    const meta = row.media_assets?.meta || {};
    const title = String(meta.title || '').trim() || '(không tiêu đề)';
    const adapter = ADAPTERS[row.channel];

    if (!adapter) {
      // Cấu hình trỏ vào kênh chưa có adapter. Ghi `error` chứ không im lặng bỏ
      // qua — im lặng thì bài nằm mãi ở `queued` mà không ai biết vì sao.
      await finish(row.id, { status: 'error', error: `Chưa có adapter cho kênh "${row.channel}"` });
      result.failed.push({ id: row.id, channel: row.channel, title, error: `chưa hỗ trợ kênh ${row.channel}` });
      continue;
    }

    if (!(await claim(row.id))) continue; // lượt khác đã cầm

    result.attempted++;
    const out = await adapter(row);

    if (out.externalId) {
      await finish(row.id, {
        status: 'live',
        external_id: out.externalId,
        external_url: out.externalUrl || null,
        published_at: new Date().toISOString(),
        error: null,
      });
      result.published.push({ id: row.id, channel: row.channel, title, url: out.externalUrl });
      continue;
    }

    const err = out.error || 'lỗi không rõ';
    const blocking = isBlocking(err);
    await finish(row.id, {
      // Lỗi CHẶN là trạng thái của cái cửa, nên bài KHÔNG hỏng: trả nó về hàng
      // đợi để lượt sau đăng lại, chỉ giữ dấu lỗi cho panel nói được vì sao nó
      // chưa đi. Đánh `error` ở đây là mất bài vĩnh viễn vì một cái token.
      status: blocking ? 'queued' : 'error',
      error: err.slice(0, 500),
    });
    result.failed.push({ id: row.id, channel: row.channel, title, error: err });

    if (blocking) {
      // Trạng thái của CÁI CỬA, không phải của bài → đóng kênh này lại, các
      // kênh khác vẫn chạy tiếp trong cùng lượt.
      blocked.add(row.channel);
    }
  }

  result.blockedChannels = [...blocked];
  if (blocked.size && !result.stoppedReason) {
    result.stoppedReason =
      `lỗi CHẶN ở kênh ${result.blockedChannels.join(', ')} — bài còn lại của (các) kênh đó ` +
      'giữ nguyên trạng thái chờ, sẽ thử lại ở lượt sau';
  }
  result.remaining = await countRows(READY_FILTER);
  return result;
}

/** Bản tin Telegram. Trả '' khi KHÔNG có gì đáng báo — im lặng là một kết quả. */
export function formatPublishReport(r: PublishResult): string {
  if (!r.attempted && !r.failed.length && !r.stuck && !r.stoppedReason) return '';

  const lines: string[] = [];
  if (r.published.length) {
    lines.push(`✅ Đã đăng ${r.published.length} bài:`);
    for (const it of r.published) lines.push(`  • [${it.channel}] ${it.title}\n    ${it.url || ''}`);
  }
  if (r.failed.length) {
    lines.push(`❌ Lỗi ${r.failed.length} bài:`);
    // 400 chứ không phải 200: lỗi Graph mở đầu bằng một câu dẫn dài dòng rồi
    // MỚI tới phần đáng đọc (mốc hết hạn, mã lỗi). Cắt ở 200 là cụt đúng chỗ
    // cần nhìn — đã xảy ra thật với "Session has expired on Tuesday, 11-Aug…".
    for (const it of r.failed) lines.push(`  • [${it.channel}] ${it.title} — ${(it.error || '').slice(0, 400)}`);
  }
  if (r.stoppedReason) lines.push(`⏸️ ${r.stoppedReason}`);
  if (r.stuck) lines.push(`⚠️ ${r.stuck} bài kẹt trạng thái "đang đăng" (dấu vết lượt bị giết ngang).`);
  if (r.remaining) lines.push(`📦 Còn chờ đăng: ${r.remaining} bài.`);

  // Nhắc nguyên nhân gốc NGAY TRONG cảnh báo — cùng lý do `yt-drain` phải làm
  // thế: không có dòng này thì phản xạ tự nhiên là đi cấp lại token, vá được
  // vài hôm rồi tắc y như cũ. Mỗi kênh một cửa riêng, nên hướng dẫn cũng phải
  // theo kênh chứ không thể chỉ nói về Facebook.
  for (const ch of r.blockedChannels) {
    const msgs = r.failed.filter((f) => f.channel === ch).map((f) => (f.error || '').toLowerCase());
    const fix = channelFix(ch, msgs);
    if (fix) lines.push(`\n🔑 ${ch}: ${fix}`);
  }
  return lines.join('\n');
}

/**
 * Hướng dẫn theo ĐÚNG loại lỗi, không phải một câu chung cho cả kênh.
 *
 * Vì sao phải tách: hàng đợi Facebook kẹt từ 02/08 qua HAI nguyên nhân nối
 * tiếp nhau (thiếu env → token hết hạn) mà bản tin nói y một câu "xin thêm
 * quyền `pages_manage_posts`" cho cả hai. Câu đó đúng cho ca đầu và lạc đề
 * cho ca sau, nên người đọc đi sửa nhầm chỗ rồi tưởng đã xong. 33 bài, 0 bài
 * từng đăng được — đúng cái giá của một lời khuyên chung chung.
 */
function channelFix(ch: string, msgs: string[]): string {
  const hit = (p: string) => msgs.some((m) => m.includes(p));
  if (ch === 'facebook' && (hit('session has expired') || hit('has expired'))) return FB_TOKEN_EXPIRED;
  if (ch === 'tiktok') {
    // 🔑 TikTok có BA cửa khác hẳn nhau, và nhầm cửa là đi sửa nhầm chỗ y hệt
    // ca Facebook: miền chưa verify KHÔNG phải chuyện token, mà lỗi của nó
    // cũng bay ra từ cùng một adapter.
    if (hit('url_ownership_unverified') || hit('url ownership')) return TT_URL_UNVERIFIED;
    if (hit('ghi vào app_config không được')) return TT_CHAIN_BROKEN;
    if (hit('invalid_grant') || hit('chưa có token')) return TT_TOKEN_DEAD;
  }
  return CHANNEL_SETUP[ch] || '';
}

/**
 * ⚠️ Token Page LẤY TỪ TOKEN USER NGẮN HẠN thì chết theo nó — đó là chuyện vừa
 * xảy ra. Chỉ token Page suy ra từ token USER DÀI HẠN mới không có hạn, nên
 * hướng dẫn phải nêu đủ cả chuỗi đổi token, và phải nêu bước KIỂM (`debug_token`
 * → `expires_at: 0`): thiếu bước đó thì không phân biệt được token vĩnh viễn với
 * một token ngắn hạn nữa, và lần sau lại tắc y hệt mà không ai biết trước.
 */
const FB_TOKEN_EXPIRED =
  'TOKEN HẾT HẠN (lỗi 190) — không phải thiếu quyền, đừng đi xin lại quyền. ' +
  'Token vừa dùng là loại NGẮN HẠN nên chết theo phiên. Muốn token Page KHÔNG hết hạn: ' +
  '(1) Graph API Explorer lấy user token có `pages_manage_posts` + `pages_read_engagement`; ' +
  '(2) đổi sang user token dài hạn: `GET /oauth/access_token?grant_type=fb_exchange_token' +
  '&client_id=<app-id>&client_secret=<app-secret>&fb_exchange_token=<token ngắn hạn>`; ' +
  '(3) dùng token dài hạn đó gọi `GET /me/accounts` — `access_token` của Page trả về là loại VĨNH VIỄN; ' +
  '(4) KIỂM ở `/debug_token`, phải thấy `expires_at: 0` (Never) mới đúng; ' +
  '(5) đặt FB_PAGE_ACCESS_TOKEN trên Vercel rồi Redeploy. ' +
  '⛔ Bước (2) cần ĐỌC App Secret — chỉ copy, TUYỆT ĐỐI không bấm Reset: ' +
  'MESSENGER_APP_SECRET và WHATSAPP_APP_SECRET đang dùng chính giá trị đó, reset là chết webhook cả hai kênh.';

/**
 * ⚠️ Ca này KHÔNG phải chuyện token, dù nó bay ra từ cùng adapter TikTok.
 * `PULL_FROM_URL` đòi miền chứa file phải được XÁC MINH SỞ HỮU trong Developer
 * Portal. Đi cấp lại token cho lỗi này là mất công vô ích — đúng cái bẫy
 * "một câu khuyên cho hai nguyên nhân" mà hàng đợi Facebook đã trả giá.
 */
const TT_URL_UNVERIFIED =
  'MIỀN CHƯA XÁC MINH — không phải lỗi token, đừng đi cấp lại token. `PULL_FROM_URL` đòi ' +
  'miền chứa file video phải được verify sở hữu. TikTok Developer Portal → app → ' +
  'Manage apps → URL properties → thêm URL prefix của host Supabase Storage (bucket `clips`) ' +
  'rồi làm bước xác minh. Verify xong mới đăng được, không cần đổi gì trong code.';

/**
 * 🔴 Ca NẶNG NHẤT và là lý do module token phải GHI TRƯỚC DÙNG SAU: refresh
 * token TikTok XOAY mỗi lượt làm mới, nên làm mới xong mà không lưu được cái
 * mới thì cái cũ đã chết và chuỗi đứt hẳn — không tự lành được.
 */
const TT_CHAIN_BROKEN =
  'CHUỖI TOKEN ĐỨT — đã làm mới được nhưng ghi vào `app_config` hỏng, nên refresh token mới ' +
  'không ai giữ còn cái cũ thì TikTok đã vô hiệu hoá. Không tự lành. Phải cấp lại bằng tay ' +
  '(xem docs/TIKTOK-TOKEN.md) rồi đặt TIKTOK_REFRESH_TOKEN trên Vercel. ' +
  'Kiểm luôn vì sao ghi hỏng: SUPABASE_SERVICE_KEY còn đúng không.';

/** Chưa cấp lần đầu, hoặc refresh token đã hết 365 ngày. Cùng một việc phải làm. */
const TT_TOKEN_DEAD =
  'CHƯA CÓ / HẾT HẠN refresh token. Access token TikTok sống 24 giờ và refresh token XOAY mỗi ' +
  'lượt làm mới, nên KHÔNG đặt tay một access token rồi để đó được. Làm theo docs/TIKTOK-TOKEN.md ' +
  '(cấp một lượt bằng tay → đặt TIKTOK_REFRESH_TOKEN + TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET ' +
  'trên Vercel → Redeploy). Từ lượt sau hệ thống tự làm mới và tự lưu vào `app_config`.';

/** Việc tay cần làm khi một kênh báo lỗi auth/quyền (ca chung). */
const CHANNEL_SETUP: Record<string, string> = {
  facebook:
    'page token phải có `pages_manage_posts` (app Meta của repo dựng cho Messenger với ' +
    '`pages_messaging` và còn ở Development mode). Meta App → Permissions xin thêm quyền, ' +
    'cấp lại page token, rồi đặt FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN trên Vercel.',
  instagram:
    'cần quyền `instagram_content_publish` và một tài khoản Instagram **Business** đã liên kết ' +
    'với Page. Đặt IG_USER_ID (id tài khoản IG Business, không phải username) + IG_ACCESS_TOKEN ' +
    '(dùng chung page token được) trên Vercel.',
  threads:
    'Threads có API và TOKEN RIÊNG — token Page của Facebook KHÔNG dùng được. Vào ' +
    'developers.facebook.com → Threads API, cấp token với `threads_basic` + ' +
    '`threads_content_publish`, rồi đặt THREADS_USER_ID + THREADS_ACCESS_TOKEN trên Vercel.',
  telegram:
    'thêm bot làm ADMIN của channel (quyền đăng bài), rồi đặt TELEGRAM_CHANNEL_ID trên Vercel ' +
    '(dạng `@ten_channel` hoặc id số `-100…`). Token bot dùng chung TELEGRAM_BOT_TOKEN đã có.',
  tiktok:
    'cần BA thứ, thiếu cái nào cũng không đăng được: (1) quyền `video.publish` đã qua duyệt ' +
    '(trước khi duyệt, app sandbox chỉ đăng RIÊNG TƯ cho chính tài khoản dev); (2) miền của ' +
    'bucket `clips` đã verify sở hữu trong Developer Portal (URL properties); (3) token — đặt ' +
    'TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET + TIKTOK_REFRESH_TOKEN trên Vercel, xem ' +
    'docs/TIKTOK-TOKEN.md.',
};
