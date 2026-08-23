// lib/backlinks/prospecting.ts
// ============================================================
// TÌM CƠ HỘI backlink — BA NGUỒN ĐỘC LẬP, mỗi nguồn tự chịu lỗi riêng (một
// nguồn hỏng/chưa cấu hình không được kéo sập nguồn khác):
//
//  - runSeedListProspecting (seed-list.ts) — danh sách tĩnh, 0 key, LUÔN chạy.
//  - runAlertsRssProspecting (alerts-rss.ts) — Google Alerts RSS, 0 key
//    (chỉ cần Henry set env một lần), LUÔN chạy khi đã cấu hình.
//  - runBraveProspecting (dưới đây) — Brave Search API, TUỲ CHỌN.
//
// VÌ SAO BRAVE, KHÔNG PHẢI GOOGLE/BING (đã cân nhắc trước khi chọn, kiểm lại
// 2026-08-19): Google Custom Search JSON API đóng cho khách hàng MỚI từ
// 2025, tắt hẳn 1/1/2027 — repo này chưa từng có key cũ nên không xin được
// key mới. Bing Web Search API (dịch vụ tìm kiếm chung) Microsoft đã khai tử
// HẲN từ 11/8/2025, không còn cách đăng ký. Brave còn sống, có gói $5 free
// credit ban đầu (~1.000 lượt) rồi trả rất rẻ theo lượt.
//
// NHƯNG Brave KHÔNG CÒN LÀ NGUỒN DUY NHẤT NỮA — đây là bài học rút ra từ
// chính lần đầu ráp module này: một nguồn duy nhất cần key trả phí biến
// "tự động 80-90%" thành "tự động khi nào có key, không thì gõ tay", đúng
// ngược lại yêu cầu ban đầu. Hai nguồn kia (seed-list, alerts-rss) không
// cần một đồng nào để chạy đều — hệ thống tự động THẬT NGAY TỪ ĐẦU, Brave
// chỉ là lớp mở rộng thêm khi Henry cấp key.
//
// ⚠️ Cả ba nguồn CHỈ TÌM, KHÔNG TỰ VÀO TỪNG TRANG XÁC MINH. Kết quả tìm kiếm
// là GỢI Ý cho người/AI content duyệt tiếp, không phải bằng chứng "đây chắc
// chắn là chỗ đáng nộp hồ sơ" — mọi cơ hội tìm ra đều vào `status='new'`,
// không tự nhảy lên 'content_ready'.
// ============================================================

import { sbConfigured, sbInsert } from './db';
import type { Prospect, ProspectKind } from './content';
import { runSeedListProspecting, type SeedListResult } from './seed-list';
import { runAlertsRssProspecting, type AlertsRssResult } from './alerts-rss';

const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY || '';
const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search';
const SITE_HOST = 'tuviminhbao.com';

/** Xoay theo tuần trong năm — cùng mẹo `keyword-suggest.ts` để không lặp mãi một truy vấn. */
function weekOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - start.getTime()) / 604_800_000);
}

interface QuerySpec {
  q: string;
  guessKind: ProspectKind;
}

const DIRECTORY_QUERIES: QuerySpec[] = [
  { q: 'submit AI tool directory astrology horoscope app', guessKind: 'directory' },
  { q: 'AI tools directory submit listing 2026', guessKind: 'directory' },
  { q: 'danh bạ công cụ web Việt Nam đăng ký giới thiệu sản phẩm', guessKind: 'directory' },
  { q: 'startup directory Vietnam submit your product', guessKind: 'directory' },
  { q: 'công cụ tử vi trực tuyến miễn phí tổng hợp danh sách', guessKind: 'resource_page' },
  { q: 'best astrology tools resources useful links blog', guessKind: 'resource_page' },
];

// ── Guest post: tầng đắt nhất của cả module ────────────────────────────────
// Đây là chỗ hạ tầng ĐÃ CÓ SẴN từ trước mà chưa nguồn nào nuôi: `content.ts`
// vốn đã có `draftGuestPitch`/`draftBlogPitch` và các `kind` tương ứng, chỉ
// thiếu đúng bước TÌM RA cơ hội. Thêm mấy truy vấn dưới đây là nối nốt một
// nửa đã dựng, không phải làm mới từ đầu.
//
// `guessKind` để 'guest_post', nhưng loại THẬT quyết ở `refineGuestKind()`
// theo dấu hiệu trong chính trang — blog cá nhân và toà soạn cần hai kiểu thư
// khác hẳn nhau (xem đầu _patches/migration-backlinks-guest.sql).
const GUEST_QUERIES: QuerySpec[] = [
  { q: '"viết bài cộng tác" tử vi OR phong thủy OR tâm linh', guessKind: 'guest_post' },
  { q: '"nhận bài viết" OR "đóng góp bài viết" blog tử vi tướng số', guessKind: 'guest_post' },
  { q: '"cộng tác viên viết bài" website tâm linh phong thủy', guessKind: 'guest_post' },
  { q: '"gửi bài" blog chiêm tinh tử vi hướng dẫn', guessKind: 'guest_post' },
  { q: 'intitle:"write for us" astrology OR horoscope', guessKind: 'guest_post' },
  { q: '"guest post" astrology blog submit guidelines', guessKind: 'guest_post' },
  { q: '"contribute" spirituality blog submission guidelines', guessKind: 'guest_post' },
  { q: 'blog cá nhân tử vi tướng số chia sẻ kinh nghiệm', guessKind: 'guest_blog' },
];

/**
 * Toà soạn hay blog cá nhân? Đọc dấu hiệu trong tiêu đề + mô tả.
 *
 * ⚠️ Không rõ thì trả 'guest_blog' — CỐ Ý nghiêng về tầng NHẸ. Gửi thư ngắn
 * cho một toà soạn thì tệ nhất là bị bỏ qua; gửi thư trang trọng "kính gửi
 * ban biên tập" cho một người viết blog cá nhân thì đọc ra ngay là thư hàng
 * loạt, và mất luôn cơ hội đó.
 */
function refineGuestKind(host: string, title: string, desc: string): ProspectKind {
  const t = `${title} ${desc}`.toLowerCase();
  const bienTap = /ban biên tập|toà soạn|tòa soạn|editorial team|our editors|editorial guidelines|submission guidelines|tạp chí|chuyên trang/;
  if (bienTap.test(t)) return 'guest_post';
  // Tên miền con của nền tảng blog miễn phí ⇒ gần như chắc chắn là blog cá nhân.
  if (/\.(blogspot|wordpress|tumblr|medium|substack|hashnode|blogger)\.[a-z.]+$/.test(host)) return 'guest_blog';
  return 'guest_blog';
}

const MENTION_QUERIES: QuerySpec[] = [
  { q: `"tuviminhbao.com" -site:tuviminhbao.com`, guessKind: 'unlinked_mention' },
  { q: `"tử vi minh bảo" -site:tuviminhbao.com`, guessKind: 'unlinked_mention' },
];

/** Domain không đáng lưu làm cơ hội — nền tảng lớn, kết quả gần như luôn là noise. */
const SKIP_HOSTS = new Set([
  'google.com', 'facebook.com', 'twitter.com', 'x.com', 'youtube.com',
  'instagram.com', 'tiktok.com', 'wikipedia.org', 'pinterest.com', SITE_HOST,
]);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

interface BraveResult {
  title?: string;
  url?: string;
  description?: string;
}

async function braveSearch(query: string): Promise<BraveResult[]> {
  const res = await fetch(`${BRAVE_URL}?q=${encodeURIComponent(query)}&count=10`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': BRAVE_KEY },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Brave Search ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { web?: { results?: BraveResult[] } };
  return data.web?.results || [];
}

export interface BraveProspectingResult {
  configured: boolean;
  queries: string[];
  found: number;
  inserted: number;
  skipped: number;
  note?: string;
}

async function runBraveProspecting(limitPerRun = 15): Promise<BraveProspectingResult> {
  if (!BRAVE_KEY || !sbConfigured()) {
    return { configured: false, queries: [], found: 0, inserted: 0, skipped: 0, note: 'chưa cấu hình BRAVE_SEARCH_API_KEY' };
  }

  // Xoay: 4/8 truy vấn directory/resource mỗi tuần + cả 2 truy vấn mention
  // (mention rẻ, chạy đều đặn để bắt sớm những nhắc-tên-mới).
  const wk = weekOfYear();
  const dQueries = DIRECTORY_QUERIES.filter((_, i) => i % 2 === wk % 2);
  // Guest post cũng xoay nửa/tuần, cùng lý do: 8 truy vấn chạy hết mỗi tuần
  // là đốt lượt gọi API cho những kết quả gần như y hệt tuần trước.
  const gQueries = GUEST_QUERIES.filter((_, i) => i % 2 === wk % 2);
  const specs = [...dQueries, ...gQueries, ...MENTION_QUERIES];

  let found = 0;
  let inserted = 0;
  let skipped = 0;
  const usedQueries: string[] = [];

  for (const spec of specs) {
    if (inserted >= limitPerRun) break;
    usedQueries.push(spec.q);
    let results: BraveResult[] = [];
    try {
      results = await braveSearch(spec.q);
    } catch {
      continue; // một truy vấn lỗi không được kéo sập cả lượt
    }
    for (const r of results) {
      if (inserted >= limitPerRun) break;
      const url = (r.url || '').trim();
      if (!url || !/^https?:\/\//i.test(url)) continue;
      const host = hostOf(url);
      if (!host || SKIP_HOSTS.has(host)) continue;
      found++;

      const title = (r.title || host).trim().slice(0, 200);
      const desc = (r.description || '').toLowerCase();
      let kind: ProspectKind = spec.guessKind;
      // Với truy vấn directory/resource, tinh chỉnh lại theo chính nội dung
      // snippet — truy vấn chỉ là mồi, không quyết được loại thật của trang.
      if (spec.guessKind === 'directory' || spec.guessKind === 'resource_page') {
        if (/submit|add your|add a listing|directory|nộp|đăng ký công cụ/.test(desc)) kind = 'directory';
        else if (/resource|useful link|recommended|tài nguyên|công cụ hữu ích/.test(desc)) kind = 'resource_page';
      } else if (spec.guessKind === 'guest_post' || spec.guessKind === 'guest_blog') {
        kind = refineGuestKind(host, title, r.description || '');
      }

      // POST thuần (không upsert): trùng `url` (unique) → 409 → sbInsert trả
      // null → tính là skipped. CỐ Ý không upsert-merge — một cơ hội đã có
      // có thể đang ở 'content_ready'/'submitted' hoặc đã bị Henry sửa tay;
      // ghi đè bằng kết quả tìm lại tuần này sẽ xoá mất việc người đã làm.
      const row = await sbInsert<Prospect>('backlink_prospects', {
        kind,
        name: title,
        url,
        topic: null,
        notes: (r.description || '').slice(0, 500) || null,
        status: 'new',
        source: 'search',
      });
      if (row) inserted++;
      else skipped++;
    }
  }

  return { configured: true, queries: usedQueries, found, inserted, skipped };
}

export interface ProspectingResult {
  seedList: SeedListResult;
  alertsRss: AlertsRssResult;
  brave: BraveProspectingResult;
  totalInserted: number;
}

/** Chạy CẢ BA nguồn — song song, độc lập, không nguồn nào chặn nguồn khác. */
export async function runProspecting(limitPerRun = 15): Promise<ProspectingResult> {
  const [seedList, alertsRss, brave] = await Promise.all([
    runSeedListProspecting().catch(
      (): SeedListResult => ({ total: 0, inserted: 0, skipped: 0 }),
    ),
    runAlertsRssProspecting(limitPerRun).catch(
      (): AlertsRssResult => ({ configured: false, feeds: 0, found: 0, inserted: 0, skipped: 0, note: 'lỗi khi đọc feed' }),
    ),
    runBraveProspecting(limitPerRun).catch(
      (): BraveProspectingResult => ({ configured: false, queries: [], found: 0, inserted: 0, skipped: 0, note: 'lỗi gọi Brave Search' }),
    ),
  ]);
  return { seedList, alertsRss, brave, totalInserted: seedList.inserted + alertsRss.inserted + brave.inserted };
}
