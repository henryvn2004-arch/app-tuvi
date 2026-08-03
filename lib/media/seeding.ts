// lib/media/seeding.ts
// ============================================================
// TRỢ LÝ SEEDING GROUP — soạn sẵn bài cho từng group, dừng trước cú bấm Đăng.
//
// Yêu cầu ban đầu là bot tự tìm group rồi tự đăng 20–30 bài/ngày. Không làm
// được, và lý do là kỹ thuật chứ không phải ngại: Meta gỡ Groups API khỏi mọi
// phiên bản từ 22/04/2024 cùng permission `publish_to_groups` — Buffer,
// Hootsuite, Sprinklr đều mất tính năng này. Đường còn lại duy nhất là lái tài
// khoản cá nhân bằng trình duyệt giả lập người thật, tức lách chính biện pháp
// chống spam. Cái mất khi bị bắt không phải một tài khoản mà là `tuviminhbao.com`
// bị gắn cờ ở tầng TÊN MIỀN: Page, Instagram và mọi link người thật share đều
// chết theo. Nên file này làm hết phần tốn sức — chọn bài, trích câu, dựng ảnh,
// viết caption riêng cho từng group — và dừng lại đúng một cú bấm.
//
// BỐN QUYẾT ĐỊNH:
//
//  1. **Mỗi group một `angle` riêng, caption viết lại từ đầu cho từng group.**
//     Người sinh hoạt ở hai group cùng lúc là người nhận ra spam đầu tiên. Đây
//     là lý do không dựng một caption rồi rải — tốn thêm lượt LLM nhưng đó đúng
//     là thứ tiền mua được sự khác biệt.
//
//  2. **Nhịp mặc định 7 ngày/group.** 20–30 bài/ngày là mức spam kể cả khi đăng
//     tay; admin group ban trong vài ngày và thứ mất đi là uy tín tên miền ở
//     đúng tập người cần tiếp cận. Trần `seeding.daily_cap` chỉ nên bằng số
//     group tới lượt trong ngày.
//
//  3. **Group đang còn bài chưa dán thì KHÔNG soạn thêm.** Không có chốt này
//     thì mỗi sáng lại chồng thêm một bài cho group người ta chưa kịp đăng, vài
//     hôm là hàng đợi thành đống rác không ai đọc.
//
//  4. **Caption đi qua brand-check (#356) như mọi văn bản đối ngoại khác.** Bài
//     đăng vào group người khác còn khó rút lại hơn bài trên trang nhà.
// ============================================================

import { llmText } from '@/lib/llm/complete';
import { brandCheck, type BrandProfile } from '@/lib/content/brand-check';
import { getConfigValue } from '@/lib/config/appConfig';
import { pickQuote, assetUrl } from '@/lib/media/build';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const SITE = 'https://www.tuviminhbao.com';
const DEFAULT_CAP = 5;
/** Trần cứng — chặn một cấu hình sai biến thành đợt rải bài hàng loạt. */
const HARD_MAX = 15;

interface SourceSpec {
  type: 'khao_luan' | 'nghien_cuu';
  table: string;
  path: string;
  profile: BrandProfile;
  kicker: string;
}

const SOURCES: SourceSpec[] = [
  { type: 'khao_luan', table: 'khao_luan', path: 'khao-luan', profile: 'khao-luan', kicker: 'Khảo Luận' },
  { type: 'nghien_cuu', table: 'master_articles', path: 'nghien-cuu', profile: 'nghien-cuu', kicker: 'Nghiên Cứu' },
];

export interface SeedingGroup {
  id: string;
  name: string;
  url: string;
  platform: string;
  topic: string | null;
  angle: string | null;
  every_days: number;
  last_posted_at: string | null;
}

interface ArticleRow {
  id: string | number;
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  content: string | null;
}

export interface SeedingBuilt {
  groupName: string;
  groupUrl: string;
  title: string;
  caption: string;
}

export interface SeedingResult {
  built: SeedingBuilt[];
  skipped: { group: string; reason: string }[];
  /** Group tới lượt hôm nay (trước khi cắt theo trần). */
  due: number;
  /** Bài đã soạn còn chờ người dán, tính CẢ lượt này. */
  pending: number;
  stoppedReason?: string;
}

async function sbGet<T>(qs: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${qs}`, { headers: SB_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`${qs}: ${await res.text()}`);
  return (await res.json()) as T[];
}

/** Nhãn UTM cho một group — dấu vết duy nhất cho biết group nào kéo được người thật. */
export function groupSlug(name: string): string {
  const s = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'group';
}

function linkWithUtm(path: string, slug: string, campaign: string): string {
  const p = new URLSearchParams({
    utm_source: 'fbgroup',
    utm_medium: 'social',
    utm_campaign: campaign,
  });
  return `${SITE}/${path}/${slug}?${p.toString()}`;
}

/**
 * Giọng ở đây KHÁC hẳn caption đăng lên trang nhà: trong group, một bài nghe
 * như quảng cáo bị admin gỡ và bị thành viên báo cáo. Cái đi lọt là một người
 * chia sẻ thứ mình thấy hay, có chỗ cho người khác cãi lại.
 */
const SEED_CAPTION_SYSTEM = `Bạn viết bài chia sẻ để đăng vào một NHÓM (group) Facebook về tử vi / phong thuỷ / tâm linh của người Việt.

Nhận: tiêu đề bài viết, một câu trích trong bài, tên nhóm, và góc tiếp cận riêng cho nhóm đó.

Định dạng trả về: JSON thuần, KHÔNG bọc trong markdown.
{"caption": "...", "hashtags": ["...", "..."]}

LUẬT:
- Viết như MỘT THÀNH VIÊN đang chia sẻ thứ mình đọc được và thấy đáng bàn — KHÔNG phải giọng thương hiệu, KHÔNG phải quảng cáo.
- Bám đúng "góc tiếp cận" được đưa: đó là lý do bài này hợp với nhóm này chứ không phải nhóm khác.
- caption 3–6 câu, 350–700 ký tự. Câu đầu nêu thẳng vấn đề, không rào đón.
- CHỈ dùng ý CÓ trong câu trích và tiêu đề. Tuyệt đối không bịa thêm luận điểm, con số, hay dẫn chứng cổ thư nào không được đưa.
- KẾT bằng một câu hỏi mở mời mọi người trong nhóm nói ý kiến. Đây là phần quan trọng nhất: bài không có chỗ cho người khác bàn vào thì là quảng cáo.
- KHÔNG mời mua, KHÔNG nhắc giá, KHÔNG hứa xem bói chính xác, KHÔNG viết "inbox mình".
- KHÔNG dán link trong caption (link được gắn riêng bên dưới).
- 3–5 hashtag tiếng Việt không dấu cách, không kèm dấu #.
- Tiếng Việt đời thường, tối đa 2 emoji.`;

interface CaptionOut {
  caption: string;
  hashtags: string[];
}

async function writeSeedCaption(
  title: string,
  quote: string,
  group: SeedingGroup,
): Promise<CaptionOut | null> {
  try {
    const raw = await llmText({
      system: SEED_CAPTION_SYSTEM,
      prompt: JSON.stringify({
        tieu_de: title,
        cau_trich: quote,
        ten_nhom: group.name,
        chu_de_nhom: group.topic || '(không ghi rõ)',
        goc_tiep_can: group.angle || '(không ghi rõ — viết chung, bám sát câu trích)',
      }),
      maxTokens: 800,
    });
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as Partial<CaptionOut>;
    const caption = (parsed.caption || '').trim();
    if (!caption) return null;
    const hashtags = (parsed.hashtags || [])
      .map((h) => String(h).replace(/^#/, '').trim())
      .filter(Boolean)
      .slice(0, 5);
    return { caption, hashtags };
  } catch {
    return null;
  }
}

/** Group tới lượt chưa? `null` = chưa seed lần nào → tới lượt ngay. */
function isDue(g: SeedingGroup, now: number): boolean {
  if (!g.last_posted_at) return true;
  const last = Date.parse(g.last_posted_at);
  if (Number.isNaN(last)) return true;
  return now - last >= Math.max(1, g.every_days) * 86_400_000;
}

/**
 * Soạn tối đa `limit` bài mới, mỗi group nhiều nhất MỘT bài trong một lượt.
 * Hàm này KHÔNG đăng đi đâu cả — không có adapter nào ở đây, và đó là chủ đích.
 */
export async function buildSeedingDrafts(opts: { limit?: number } = {}): Promise<SeedingResult> {
  const result: SeedingResult = { built: [], skipped: [], due: 0, pending: 0 };

  const configured = await getConfigValue<number>('seeding.daily_cap', DEFAULT_CAP);
  const limit = Math.max(0, Math.min(opts.limit ?? configured, HARD_MAX));

  const groups = await sbGet<SeedingGroup>(
    'seeding_groups?enabled=eq.true&select=id,name,url,platform,topic,angle,every_days,last_posted_at' +
      '&order=last_posted_at.asc.nullsfirst&limit=200',
  );
  // Chưa khai group nào thì không có gì để làm — im lặng, đây là trạng thái
  // bình thường của ngày đầu chứ không phải lỗi.
  if (!groups.length) return result;

  const drafts = await sbGet<{ group_id: string; source_type: string; source_id: string; status: string }>(
    'seeding_drafts?select=group_id,source_type,source_id,status&limit=5000',
  );
  const pendingGroups = new Set(drafts.filter((d) => d.status === 'ready').map((d) => d.group_id));
  result.pending = pendingGroups.size;

  /** Bài nào đã từng soạn cho group nào — chống đăng lại cùng bài vào cùng group. */
  const usedByGroup = new Map<string, Set<string>>();
  for (const d of drafts) {
    if (!usedByGroup.has(d.group_id)) usedByGroup.set(d.group_id, new Set());
    usedByGroup.get(d.group_id)!.add(`${d.source_type}:${d.source_id}`);
  }

  const now = Date.now();
  // Group còn bài chưa dán thì bỏ qua: chồng thêm bài cho hàng đợi chưa ai đụng
  // chỉ làm nó thành đống rác.
  const due = groups.filter((g) => isDue(g, now) && !pendingGroups.has(g.id));
  result.due = due.length;
  if (!due.length) return result;
  if (limit === 0) {
    result.stoppedReason = 'seeding.daily_cap = 0 — đang tắt, không soạn bài nào';
    return result;
  }

  // Nạp kho bài MỘT lần rồi dùng cho mọi group trong lượt.
  const pool = new Map<string, ArticleRow[]>();
  for (const spec of SOURCES) {
    pool.set(
      spec.type,
      await sbGet<ArticleRow>(`${spec.table}?select=id,slug,title,excerpt,content&order=created_at.desc&limit=120`),
    );
  }

  /** Bài đã dùng TRONG LƯỢT NÀY — hai group cùng sáng nhận cùng một bài là thứ lộ ngay. */
  const usedThisRun = new Set<string>();

  for (let i = 0; i < due.length; i++) {
    if (result.built.length >= limit) {
      result.stoppedReason = `chạm trần ${limit} bài/lượt — ${due.length - result.built.length} group còn lại chờ lượt sau`;
      break;
    }
    const group = due[i];
    const used = usedByGroup.get(group.id) || new Set<string>();

    // Xoay điểm bắt đầu theo thứ tự group để hai group không cùng ăn một nguồn.
    const specs = i % 2 === 0 ? SOURCES : [...SOURCES].reverse();
    let made = false;

    for (const spec of specs) {
      if (made) break;
      for (const row of pool.get(spec.type) || []) {
        if (!row.slug) continue;
        const key = `${spec.type}:${row.id}`;
        if (used.has(key) || usedThisRun.has(key)) continue;

        const title = (row.title || '').trim();
        const quote = pickQuote(row.excerpt, row.content);
        if (!quote) continue; // bài không cắt được câu vừa khung — thử bài kế

        const written = await writeSeedCaption(title, quote, group);
        if (!written) {
          result.skipped.push({ group: group.name, reason: 'LLM không trả caption dùng được' });
          made = true;
          break;
        }

        const gate = await brandCheck({
          content: written.caption,
          title,
          slug: row.slug,
          profile: spec.profile,
          payload: { source: spec.type, sourceId: row.id, quote, group: group.name, surface: 'seeding' },
        });
        if (!gate.pass) {
          result.skipped.push({ group: group.name, reason: 'caption bị brand-check chặn' });
          made = true;
          break;
        }

        const ins = await fetch(`${SUPABASE_URL}/rest/v1/seeding_drafts`, {
          method: 'POST',
          headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({
            group_id: group.id,
            source_type: spec.type,
            source_id: String(row.id),
            title,
            quote,
            caption: gate.content,
            hashtags: written.hashtags,
            link_url: linkWithUtm(spec.path, row.slug, groupSlug(group.name)),
            image_url: assetUrl('quote', spec.kicker, quote, title),
            status: 'ready',
            meta: { slug: row.slug },
          }),
        });
        if (!ins.ok) {
          // 409 = ràng buộc duy nhất: bài này đã soạn cho group này rồi.
          result.skipped.push({ group: group.name, reason: `không lưu được bài (${ins.status})` });
          made = true;
          break;
        }

        usedThisRun.add(key);
        result.built.push({ groupName: group.name, groupUrl: group.url, title, caption: gate.content });
        result.pending++;
        made = true;
        break;
      }
    }

    if (!made) {
      result.skipped.push({ group: group.name, reason: 'hết bài chưa từng đăng vào group này' });
    }
  }

  return result;
}

/** Bản tin Telegram. Trả '' khi không có gì đáng báo — im lặng là một kết quả. */
export function formatSeedingReport(r: SeedingResult): string {
  if (!r.built.length && !r.skipped.length && !r.stoppedReason) return '';

  const lines: string[] = [];
  if (r.built.length) {
    lines.push(`✍️ Đã soạn ${r.built.length} bài seeding, chờ dán:`);
    for (const b of r.built) lines.push(`  • ${b.groupName} — ${b.title}`);
  }
  if (r.skipped.length) {
    lines.push(`⚠️ Bỏ qua ${r.skipped.length} group:`);
    for (const s of r.skipped) lines.push(`  • ${s.group} — ${s.reason}`);
  }
  if (r.stoppedReason) lines.push(`⏸️ ${r.stoppedReason}`);
  if (r.pending) {
    lines.push(
      `\n📋 Tổng ${r.pending} bài đang chờ dán. Mở Admin → Marketing → “Seeding Group”: ` +
        'mỗi bài có nút Copy và nút Mở group.',
    );
  }
  return lines.join('\n');
}
