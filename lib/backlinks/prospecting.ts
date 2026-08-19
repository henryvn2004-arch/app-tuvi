// lib/backlinks/prospecting.ts
// ============================================================
// TÌM CƠ HỘI backlink bằng search API — TUỲ CHỌN, KHÔNG BẮT BUỘC.
//
// Dùng Brave Search API (`BRAVE_SEARCH_API_KEY`), không phải Google Custom
// Search hay Bing: cả hai đã kiểm tra và loại — Google Custom Search JSON API
// đóng cửa với khách mới từ 2025, ngừng hẳn 01/2027; Bing Web Search API bị
// Microsoft khai tử 08/2026, không còn cách đăng ký mới. Brave vẫn đang bán,
// có gói $5 credit miễn phí ban đầu (~1.000 lượt) rồi trả theo lượt rất rẻ —
// với nhịp tìm hằng tuần của module này (≈15-20 lượt/tuần) gần như không tốn gì.
//
// ⚠️ CHỈ TÌM, KHÔNG TỰ VÀO TỪNG TRANG XÁC MINH. Kết quả tìm kiếm là GỢI Ý cho
// người/AI content duyệt tiếp, không phải bằng chứng "đây chắc chắn là chỗ
// đáng nộp hồ sơ" — mọi cơ hội tìm ra đều vào `status='new'`, không tự nhảy
// lên 'content_ready'. Đây KHÔNG phải một con bot crawl hàng loạt trang thứ
// ba (rủi ro động chạm robots.txt/ToS của từng site) — chỉ gọi ĐÚNG MỘT API
// tìm kiếm chính chủ, tôn trọng rate limit của họ.
//
// Chưa cấu hình key → trả configured:false, KHÔNG throw, KHÔNG chặn cron —
// cơ hội vẫn thêm được bằng tay qua admin. Cùng lối `keyword-suggest.ts`.
// ============================================================

import { sbConfigured, sbInsert } from './db';
import type { Prospect, ProspectKind } from './content';

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

export interface ProspectingResult {
  configured: boolean;
  queries: string[];
  found: number;
  inserted: number;
  skipped: number;
  note?: string;
}

export async function runProspecting(limitPerRun = 15): Promise<ProspectingResult> {
  if (!BRAVE_KEY || !sbConfigured()) {
    return { configured: false, queries: [], found: 0, inserted: 0, skipped: 0, note: 'chưa cấu hình BRAVE_SEARCH_API_KEY' };
  }

  // Xoay: 4/8 truy vấn directory/resource mỗi tuần + cả 2 truy vấn mention
  // (mention rẻ, chạy đều đặn để bắt sớm những nhắc-tên-mới).
  const wk = weekOfYear();
  const dQueries = DIRECTORY_QUERIES.filter((_, i) => i % 2 === wk % 2);
  const specs = [...dQueries, ...MENTION_QUERIES];

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
