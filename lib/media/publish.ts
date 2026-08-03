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
 * Phần chữ đi kèm ảnh. Link mang sẵn UTM (dựng ở `build.ts`) — đó là thứ duy
 * nhất cho biết kênh nào thật sự kéo được người về, và bảng "Chiến dịch UTM"
 * trong admin đang trống vì chưa link nào gắn.
 */
function composeCaption(row: QueueRow): string {
  const parts = [(row.caption || '').trim()];
  if (row.link_url) parts.push(row.link_url);
  const tags = (row.hashtags || []).filter(Boolean).map((h) => '#' + String(h).replace(/^#/, ''));
  if (tags.length) parts.push(tags.join(' '));
  return parts.filter(Boolean).join('\n\n');
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
  if (!imageUrl) return { error: 'Asset không có URL ảnh' };

  try {
    const res = await fetch(`${GRAPH_BASE}/${FB_PAGE_ID}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption: composeCaption(row),
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

const ADAPTERS: Record<string, (row: QueueRow) => Promise<AdapterOut>> = {
  facebook: publishFacebook,
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
  const result: PublishResult = { attempted: 0, published: [], failed: [], remaining: 0, stuck: 0 };

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

  for (const row of rows) {
    if (Date.now() > deadlineMs) {
      result.stoppedReason = 'hết ngân sách thời gian của lượt cron — phần còn lại để lượt sau';
      break;
    }

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
    await finish(row.id, { status: 'error', error: err.slice(0, 500) });
    result.failed.push({ id: row.id, channel: row.channel, title, error: err });

    if (isBlocking(err)) {
      result.stoppedReason = `lỗi CHẶN — mọi bài còn lại sẽ hỏng y hệt, dừng lượt: ${err.slice(0, 300)}`;
      break;
    }
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
    for (const it of r.failed) lines.push(`  • [${it.channel}] ${it.title} — ${(it.error || '').slice(0, 200)}`);
  }
  if (r.stoppedReason) lines.push(`⏸️ ${r.stoppedReason}`);
  if (r.stuck) lines.push(`⚠️ ${r.stuck} bài kẹt trạng thái "đang đăng" (dấu vết lượt bị giết ngang).`);
  if (r.remaining) lines.push(`📦 Còn chờ đăng: ${r.remaining} bài.`);

  // Nhắc nguyên nhân gốc NGAY TRONG cảnh báo — cùng lý do `yt-drain` phải làm
  // thế: không có dòng này thì phản xạ tự nhiên là đi cấp lại token, vá được
  // vài hôm rồi tắc y như cũ.
  if (r.failed.some((f) => isBlocking(f.error || ''))) {
    lines.push(
      '\n🔑 Lỗi auth/quyền của Facebook: page token phải có `pages_manage_posts` ' +
        '(app Meta hiện dựng cho Messenger, quyền `pages_messaging`, và còn ở Development mode). ' +
        'Vào Meta App → Permissions xin thêm `pages_manage_posts`, cấp lại page token, ' +
        'rồi đặt FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN trên Vercel.',
    );
  }
  return lines.join('\n');
}
