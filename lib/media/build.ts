// lib/media/build.ts
// ============================================================
// M2 (track Media Pipeline) — dựng hàng đợi bài đăng từ kho nội dung đã có.
//
// Kho nguyên liệu KHÔNG phải sản xuất mới: 324 khảo luận + 310 nghiên cứu đã
// nằm sẵn trong DB, gần như không ai đọc. Việc ở đây là cắt ra thứ đăng được.
//
// BỐN QUYẾT ĐỊNH:
//
//  1. **Trích câu bằng LUẬT, không bằng LLM.** Thêm một lượt model cho mỗi bài
//     là chi phí thật, trong khi thứ cần chỉ là một câu đọc lọt tai. Dùng lại
//     đúng luật đã chạy ở `poster.js`: câu TRỌN VẸN có độ dài gần 95 ký tự nhất
//     trong khoảng 45–155 (ngắn quá thì cụt lủn, dài quá thì tràn khung ảnh).
//
//  2. **Caption đi qua cổng brand-check (#356).** Caption là văn bản đối ngoại
//     do LLM viết — đúng loại mà cổng đó sinh ra để chặn. Bài trượt gate thì BỎ
//     QUA, không đăng bừa: một caption sai giọng trên trang công khai không rút
//     lại được như một dòng DB. Từ khi bỏ khâu duyệt tay, đây là lớp QC DUY NHẤT
//     còn đứng giữa LLM và trang công khai — đừng nới nó ra.
//
//  3. **Hai hồ sơ giọng, không phải một.** `khao_luan` là ngôi thứ ba, còn
//     `master_articles` là tuỳ bút ngôi thứ nhất ký tên thầy (đo trên prod:
//     300/306 bài dùng "tôi"). Áp luật Khảo Luận sang Nghiên Cứu sẽ chặn gần
//     hết output — bài học đã trả giá một lần ở #356.
//
//  4. **Mọi link mang UTM.** Bảng "Chiến dịch UTM" trong admin đang trống rỗng;
//     đây là thứ làm nó có số, và là cách duy nhất biết kênh nào đáng làm tiếp.
// ============================================================

import { llmText } from '@/lib/llm/complete';
import { brandCheck, type BrandProfile } from '@/lib/content/brand-check';
import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const SITE = 'https://www.tuviminhbao.com';
const DEFAULT_DAILY = 3;
const HARD_MAX = 10;

/** Khoảng độ dài câu trích đọc lọt tai; ngoài khoảng này thì bỏ. */
const QUOTE_MIN = 45;
const QUOTE_MAX = 155;
const QUOTE_IDEAL = 95;

interface SourceSpec {
  /** Khoá dùng trong media_assets.source_type */
  type: 'khao_luan' | 'nghien_cuu';
  table: string;
  /** Đường dẫn công khai của bài, để dựng link có UTM */
  path: string;
  profile: BrandProfile;
  kicker: string;
}

const SOURCES: SourceSpec[] = [
  { type: 'khao_luan', table: 'khao_luan', path: 'khao-luan', profile: 'khao-luan', kicker: 'Khảo Luận' },
  { type: 'nghien_cuu', table: 'master_articles', path: 'nghien-cuu', profile: 'nghien-cuu', kicker: 'Nghiên Cứu' },
];

interface ArticleRow {
  id: string | number;
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  content: string | null;
}

export interface BuiltPost {
  assetId: string;
  sourceType: string;
  title: string;
  quote: string;
  caption: string;
  hashtags: string[];
  imageUrl: string;
  linkUrl: string;
  channels: string[];
}

export interface BuildResult {
  built: BuiltPost[];
  skipped: { title: string; reason: string }[];
}

/** Gỡ markdown về văn xuôi trần — cùng cách `auto-pipeline` làm sạch cho TTS. */
function stripMarkdown(md: string): string {
  return (md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+.+$/gm, ' ')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chọn MỘT câu đắt nhất. Chỉ nhận câu trọn vẹn (kết bằng . ! ? …) để cắt ra
 * đứng riêng vẫn có nghĩa; trong số đó lấy câu gần 95 ký tự nhất.
 */
export function pickQuote(...sources: (string | null | undefined)[]): string {
  for (const src of sources) {
    const text = stripMarkdown(src || '');
    if (!text) continue;

    const sentences = text.match(/[^.!?…]+[.!?…]+/g) || [];
    let best = '';
    let bestGap = Infinity;
    for (const raw of sentences) {
      const s = raw.trim();
      if (s.length < QUOTE_MIN || s.length > QUOTE_MAX) continue;
      // Câu mở đầu bằng liên từ nối lại ý trước → tách ra đọc sẽ hụt ngữ cảnh.
      if (/^(nhưng|và|còn|vì vậy|do đó|tuy nhiên|ngoài ra|bởi vậy)\b/i.test(s)) continue;
      const gap = Math.abs(s.length - QUOTE_IDEAL);
      if (gap < bestGap) {
        best = s;
        bestGap = gap;
      }
    }
    if (best) return best;
  }
  return '';
}

const CAPTION_SYSTEM = `Bạn viết caption mạng xã hội cho tuviminhbao.com — trang Tử Vi Đẩu Số của người Việt.

Nhận một câu trích và tiêu đề bài viết. Viết caption cho bài đăng Facebook/Instagram.

Định dạng trả về: JSON thuần, KHÔNG bọc trong markdown.
{"caption": "...", "hashtags": ["...", "..."]}

LUẬT:
- caption 2–4 câu, tối đa 400 ký tự. Câu đầu phải khiến người lướt dừng lại.
- CHỈ dùng ý CÓ trong câu trích và tiêu đề. Tuyệt đối không bịa thêm luận điểm,
  con số, hay dẫn chứng cổ thư nào không được đưa.
- KHÔNG hứa hẹn bói toán chính xác, không phán "vận mệnh của bạn chắc chắn…".
- KHÔNG lặp lại nguyên văn câu trích (nó đã nằm trên ảnh rồi).
- Kết bằng một câu mời đọc tiếp tự nhiên, KHÔNG dán link (link gắn riêng).
- 4–6 hashtag tiếng Việt không dấu cách, không kèm dấu #.
- Tiếng Việt đời thường, không sáo rỗng, không dùng emoji quá 2 cái.`;

interface CaptionOut {
  caption: string;
  hashtags: string[];
}

async function writeCaption(title: string, quote: string): Promise<CaptionOut | null> {
  try {
    const raw = await llmText({
      system: CAPTION_SYSTEM,
      prompt: JSON.stringify({ tieu_de: title, cau_trich: quote }),
      maxTokens: 700,
    });
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as Partial<CaptionOut>;
    const caption = (parsed.caption || '').trim();
    if (!caption) return null;
    const hashtags = (parsed.hashtags || [])
      .map((h) => String(h).replace(/^#/, '').trim())
      .filter(Boolean)
      .slice(0, 6);
    return { caption, hashtags };
  } catch {
    return null;
  }
}

/** URL ảnh = công thức dựng lại bức ảnh. Không lưu file ở đâu cả. */
export function assetUrl(variant: 'quote' | 'story', kicker: string, quote: string, title: string): string {
  const p = new URLSearchParams({ v: variant, k: kicker, q: quote, t: title });
  return `${SITE}/api/og/social?${p.toString()}`;
}

function linkWithUtm(path: string, slug: string, channel: string, sourceType: string): string {
  const p = new URLSearchParams({
    utm_source: channel,
    utm_medium: 'social',
    utm_campaign: sourceType,
  });
  return `${SITE}/${path}/${slug}?${p.toString()}`;
}

async function sbGet<T>(qs: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${qs}`, { headers: SB_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`${qs}: ${await res.text()}`);
  return (await res.json()) as T[];
}

/** Bài đã từng dựng asset — chống làm lại, kể cả khi cron chạy lặp. */
async function usedSourceIds(sourceType: string): Promise<Set<string>> {
  const rows = await sbGet<{ source_id: string }>(
    `media_assets?source_type=eq.${sourceType}&select=source_id&limit=5000`,
  );
  return new Set(rows.map((r) => String(r.source_id)));
}

/**
 * Dựng tối đa `limit` bài đăng mới vào hàng đợi, trạng thái `queued` = CHỜ ĐĂNG
 * (không còn nghĩa "chờ người duyệt" — khâu duyệt tay đã bỏ, xem `publish.ts`).
 * Hàm này vẫn KHÔNG tự đăng: việc đó do `publishQueue()` làm ngay sau đó trong
 * cùng lượt cron. Tách hai bước để một backlog còn tồn vẫn được xả ở lượt sau
 * kể cả hôm đó không dựng thêm bài nào.
 */
export async function buildMediaQueue(opts: { limit?: number } = {}): Promise<BuildResult> {
  const configured = await getConfigValue<number>('social.build_daily', DEFAULT_DAILY);
  const limit = Math.max(0, Math.min(opts.limit ?? configured, HARD_MAX));
  const channels = await getConfigValue<string[]>('social.channels', ['facebook']);

  const result: BuildResult = { built: [], skipped: [] };
  if (limit === 0 || !channels.length) return result;

  for (const spec of SOURCES) {
    if (result.built.length >= limit) break;

    const used = await usedSourceIds(spec.type);
    // Lấy dư rồi lọc trong bộ nhớ: nhét cả trăm id vào `not.in.(…)` sẽ phình URL.
    const rows = await sbGet<ArticleRow>(
      `${spec.table}?select=id,slug,title,excerpt,content&order=created_at.desc&limit=60`,
    );

    for (const row of rows) {
      if (result.built.length >= limit) break;
      if (!row.slug || used.has(String(row.id))) continue;

      const title = (row.title || '').trim();
      const quote = pickQuote(row.excerpt, row.content);
      if (!quote) {
        result.skipped.push({ title: title || String(row.id), reason: 'không trích được câu vừa khung' });
        continue;
      }

      const written = await writeCaption(title, quote);
      if (!written) {
        result.skipped.push({ title, reason: 'LLM không trả caption dùng được' });
        continue;
      }

      // Cổng brand-check chạy trên caption — phần chữ sẽ hiện công khai.
      const gate = await brandCheck({
        content: written.caption,
        title,
        slug: row.slug,
        profile: spec.profile,
        payload: { source: spec.type, sourceId: row.id, quote },
      });
      if (!gate.pass) {
        result.skipped.push({ title, reason: 'caption bị brand-check chặn' });
        continue;
      }
      const caption = gate.content;

      const imageUrl = assetUrl('quote', spec.kicker, quote, title);
      const assetIns = await fetch(`${SUPABASE_URL}/rest/v1/media_assets`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify({
          source_type: spec.type,
          source_id: String(row.id),
          variant: 'quote_4x5',
          url: imageUrl,
          width: 1080,
          height: 1350,
          meta: { slug: row.slug, quote, title },
        }),
      });
      if (!assetIns.ok) {
        // 409 = ràng buộc duy nhất: bài này đã có asset, coi như đã làm rồi.
        result.skipped.push({ title, reason: `không tạo được asset (${assetIns.status})` });
        continue;
      }
      const asset = ((await assetIns.json()) as { id: string }[])[0];

      const posts = channels.map((ch) => ({
        asset_id: asset.id,
        channel: ch,
        caption,
        hashtags: written.hashtags,
        link_url: linkWithUtm(spec.path, row.slug!, ch, spec.type),
        status: 'queued',
        meta: { source_type: spec.type, source_id: String(row.id) },
      }));
      await fetch(`${SUPABASE_URL}/rest/v1/media_posts`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal,resolution=ignore-duplicates' },
        body: JSON.stringify(posts),
      });

      result.built.push({
        assetId: asset.id,
        sourceType: spec.type,
        title,
        quote,
        caption,
        hashtags: written.hashtags,
        imageUrl,
        linkUrl: posts[0].link_url,
        channels,
      });
    }
  }

  return result;
}
