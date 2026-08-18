/**
 * KÉO SỐ LIỆU NỀN TẢNG — view · like · comment · subscriber.
 *
 * Trước file này site không đo được một số liệu nào: 15 video YouTube đang live
 * mà chưa bao giờ biết được bao nhiêu view.
 *
 * 🔑 QUYẾT ĐỊNH ĐÁNG NHỚ — YouTube đi bằng API KEY, KHÔNG dùng OAuth đang có.
 * Đường upload (`youtube-upload` edge function) chạy OAuth với refresh token,
 * mà app đó còn ở chế độ **Testing** trong Google Cloud ⇒ refresh token chết
 * sau 7 ngày (86 video đang `invalid_grant` vì đúng chuyện này). Buộc số liệu
 * vào cùng cái token đó là nó chết theo. `videos.list?part=statistics` và
 * `channels.list?part=statistics` cho nội dung CÔNG KHAI chỉ cần API key —
 * không hết hạn, không cần publish app, không cần scope mới.
 * ⚠️ Đánh đổi: API key chỉ cho số CÔNG KHAI (view/like/comment/subscriber).
 * Watch-time, retention, nguồn traffic thì phải YouTube Analytics API + OAuth.
 * Đừng đọc bảng này rộng hơn thế.
 *
 * 🔑 SỐ LÀ TÍCH LUỸ, KHÔNG PHẢI THEO NGÀY: nền tảng trả tổng từ lúc đăng. Ta
 * lưu snapshot mỗi ngày; muốn "hôm nay thêm bao nhiêu" thì lấy hiệu hai ngày.
 *
 * Ba chốt chép thẳng bài học của `yt-drain`/`publish.ts` — kho YouTube đã trả
 * giá rồi:
 *   1. Lỗi CHẶN (thiếu key, key sai, hết quota) → dừng CẢ KÊNH đó, kênh khác
 *      chạy tiếp. Cứ thử mãi một cái cửa đã khoá chỉ đốt quota.
 *   2. Ngân sách thời gian, dừng giữa hai lượt.
 *   3. Báo cáo nêu THẲNG nguyên nhân gốc + việc phải làm, để lần sau không đi
 *      chẩn lại từ đầu.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SB_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

/** Trần thời gian một lượt chạy (ms) — dưới `maxDuration` của route. */
const TIME_BUDGET_MS = 240_000;

export type MetricRow = {
  channel: string;
  external_id: string;
  stat_date: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  source_table: string | null;
  source_id: string | null;
  meta?: Record<string, unknown>;
};

type Target = {
  channel: string;
  external_id: string;
  source_table: string | null;
  source_id: string | null;
};

type ChannelStat = {
  channel: string;
  stat_date: string;
  followers: number | null;
  total_views: number | null;
  item_count: number | null;
  meta?: Record<string, unknown>;
};

type FetchOut = {
  rows: MetricRow[];
  channelStat?: ChannelStat | null;
  /** Có giá trị = kênh này đóng cửa; nêu thẳng việc phải làm. */
  blocked?: string;
};

export type CollectReport = {
  ok: boolean;
  perChannel: { channel: string; targets: number; saved: number; blocked?: string }[];
  channelStats: number;
  skipped: string[];
  ms: number;
};

/** Ngày theo giờ VN — mốc `stat_date` phải khớp cách cả repo đọc "hôm nay". */
function vnDate(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ────────────────────────────────────────────────────────────
// YouTube — API key, nội dung công khai
// ────────────────────────────────────────────────────────────
async function fetchYouTube(targets: Target[]): Promise<FetchOut> {
  const key = process.env.YOUTUBE_API_KEY || '';
  if (!key) {
    return {
      rows: [],
      blocked:
        'Thiếu env YOUTUBE_API_KEY. Google Cloud → APIs & Services → Credentials → Create API key, ' +
        'bật "YouTube Data API v3", rồi đặt biến đó trên Vercel và Redeploy. ' +
        'KHÔNG cần publish OAuth app cho bước này.',
    };
  }

  const today = vnDate();
  const rows: MetricRow[] = [];
  let channelId = '';

  // Data API nhận tối đa 50 id mỗi lượt.
  for (let i = 0; i < targets.length; i += 50) {
    const batch = targets.slice(i, i + 50);
    const url =
      'https://www.googleapis.com/youtube/v3/videos' +
      `?part=statistics,snippet&id=${batch.map(t => encodeURIComponent(t.external_id)).join(',')}&key=${key}`;
    const r = await fetch(url, { cache: 'no-store' });
    const body = await r.text();
    if (!r.ok) {
      // 400/403 ở đây gần như luôn là key sai / API chưa bật / hết quota —
      // đều là lỗi của CÁI CỬA, thử tiếp batch sau chỉ tốn quota.
      return { rows, blocked: `YouTube API ${r.status}: ${body.slice(0, 300)}` };
    }
    let parsed: { items?: { id: string; statistics?: Record<string, string>; snippet?: { channelId?: string } }[] };
    try {
      parsed = JSON.parse(body);
    } catch {
      return { rows, blocked: `YouTube trả về không phải JSON: ${body.slice(0, 200)}` };
    }
    for (const it of parsed.items || []) {
      if (!channelId && it.snippet?.channelId) channelId = it.snippet.channelId;
      const t = batch.find(x => x.external_id === it.id);
      const s = it.statistics || {};
      rows.push({
        channel: 'youtube',
        external_id: it.id,
        stat_date: today,
        views: num(s.viewCount),
        likes: num(s.likeCount),
        comments: num(s.commentCount),
        shares: null,
        source_table: t?.source_table ?? null,
        source_id: t?.source_id ?? null,
      });
    }
  }

  // Subscriber của cả kênh. Lấy channelId từ chính video vừa đọc nên không
  // phải khai thêm một env nữa (một env nữa là một chỗ để quên).
  let channelStat: ChannelStat | null = null;
  if (channelId) {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${key}`,
      { cache: 'no-store' },
    );
    if (r.ok) {
      const d = (await r.json()) as { items?: { statistics?: Record<string, string> }[] };
      const s = d.items?.[0]?.statistics;
      if (s) {
        channelStat = {
          channel: 'youtube',
          stat_date: today,
          followers: num(s.subscriberCount),
          total_views: num(s.viewCount),
          item_count: num(s.videoCount),
          meta: { channel_id: channelId, hidden_subscriber_count: s.hiddenSubscriberCount === 'true' },
        };
      }
    }
  }

  return { rows, channelStat };
}

// ────────────────────────────────────────────────────────────
// Facebook Page — like/comment/share của từng bài
// ────────────────────────────────────────────────────────────
// CỐ Ý dùng `fields=likes.summary(true)...` chứ không dùng `/insights`:
// insights đòi thêm quyền `read_insights`, mà app hiện còn chưa xin xong
// `pages_manage_posts`. Đổi lấy: không có impressions/reach, chỉ có tương tác.
async function fetchFacebook(targets: Target[]): Promise<FetchOut> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';
  if (!token) {
    return {
      rows: [],
      blocked:
        'Thiếu env FB_PAGE_ACCESS_TOKEN. Cùng token đang cần cho đường đăng bài — ' +
        'đặt nó trên Vercel là cả hai việc cùng chạy.',
    };
  }

  const ver = process.env.META_GRAPH_VERSION || 'v21.0';
  const today = vnDate();
  const rows: MetricRow[] = [];

  for (const t of targets) {
    const url =
      `https://graph.facebook.com/${ver}/${encodeURIComponent(t.external_id)}` +
      `?fields=likes.summary(true).limit(0),comments.summary(true).limit(0),shares&access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { cache: 'no-store' });
    const body = await r.text();
    if (!r.ok) {
      // Token hết hạn / thiếu quyền → đóng cả kênh. Bài lẻ không đọc được thì
      // bỏ qua bài đó thôi, nhưng hai loại này phân biệt được bằng mã lỗi.
      if (/OAuthException|access token|permission/i.test(body)) {
        return { rows, blocked: `Facebook token/quyền: ${body.slice(0, 300)}` };
      }
      continue;
    }
    let d: {
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    };
    try {
      d = JSON.parse(body);
    } catch {
      continue;
    }
    rows.push({
      channel: 'facebook',
      external_id: t.external_id,
      stat_date: today,
      views: null,
      likes: num(d.likes?.summary?.total_count),
      comments: num(d.comments?.summary?.total_count),
      shares: num(d.shares?.count),
      source_table: t.source_table,
      source_id: t.source_id,
    });
  }

  return { rows };
}

/**
 * Kênh nào có bộ đọc thật. Kênh nằm ngoài đây thì bỏ qua CÓ BÁO (`skipped`) —
 * im lặng bỏ qua là đúng kiểu hỏng mà không ai biết.
 */
const FETCHERS: Record<string, (t: Target[]) => Promise<FetchOut>> = {
  youtube: fetchYouTube,
  facebook: fetchFacebook,
};

export const METRIC_CHANNELS = Object.keys(FETCHERS);

async function sbSelect<T>(path: string): Promise<T[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: SB_HEADERS, cache: 'no-store' });
  if (!r.ok) throw new Error(`select ${path}: ${await r.text()}`);
  return (await r.json()) as T[];
}

async function sbUpsert(table: string, rows: unknown[], onConflict: string): Promise<number> {
  if (!rows.length) return 0;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`upsert ${table}: ${await r.text()}`);
  return rows.length;
}

export async function collectContentMetrics(): Promise<CollectReport> {
  const t0 = Date.now();
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY');

  const targets = await sbSelect<Target>(
    'content_distribution?status=eq.live&external_id=not.is.null&select=channel,external_id,source_table,source_id',
  );

  const byChannel = new Map<string, Target[]>();
  const skipped: string[] = [];
  for (const t of targets) {
    if (!t.external_id) continue;
    if (!FETCHERS[t.channel]) {
      if (!skipped.includes(t.channel)) skipped.push(t.channel);
      continue;
    }
    const arr = byChannel.get(t.channel) || [];
    arr.push(t);
    byChannel.set(t.channel, arr);
  }

  const perChannel: CollectReport['perChannel'] = [];
  let channelStats = 0;

  for (const [channel, items] of byChannel) {
    if (Date.now() - t0 > TIME_BUDGET_MS) {
      perChannel.push({ channel, targets: items.length, saved: 0, blocked: 'Hết ngân sách thời gian lượt này' });
      continue;
    }
    try {
      const out = await FETCHERS[channel](items);
      const saved = await sbUpsert('content_metrics', out.rows, 'channel,external_id,stat_date');
      if (out.channelStat) {
        await sbUpsert('channel_stats', [out.channelStat], 'channel,stat_date');
        channelStats++;
      }
      perChannel.push({ channel, targets: items.length, saved, blocked: out.blocked });
    } catch (e) {
      // Một kênh vỡ KHÔNG được kéo theo kênh khác — bài học từ đợt mở
      // `publish.ts` từ 1 lên 4 kênh.
      perChannel.push({ channel, targets: items.length, saved: 0, blocked: (e as Error).message.slice(0, 300) });
    }
  }

  return {
    ok: perChannel.every(c => !c.blocked),
    perChannel,
    channelStats,
    skipped,
    ms: Date.now() - t0,
  };
}

/** Tin nhắn Telegram cho admin. Im lặng khi không có gì để nói. */
export function formatCollectReport(r: CollectReport): string | null {
  const lines: string[] = [];
  for (const c of r.perChannel) {
    lines.push(
      c.blocked
        ? `⚠️ ${c.channel}: ${c.targets} bài, KHÔNG đọc được — ${c.blocked}`
        : `✅ ${c.channel}: ${c.saved}/${c.targets} bài`,
    );
  }
  if (r.channelStats) lines.push(`📡 ${r.channelStats} kênh cập nhật follower/subscriber`);
  if (r.skipped.length) lines.push(`⏭️ Chưa có bộ đọc: ${r.skipped.join(', ')}`);
  if (!lines.length) return null;
  return `📊 Số liệu nội dung\n\n${lines.join('\n')}\n\n(${Math.round(r.ms / 1000)}s)`;
}
