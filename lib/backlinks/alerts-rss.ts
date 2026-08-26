// lib/backlinks/alerts-rss.ts
// ============================================================
// Đọc Google Alerts qua RSS — MIỄN PHÍ, KHÔNG CẦN API KEY — để tìm nơi vừa
// nhắc tên site mà chưa gắn link. Mạnh hơn Brave Search cho việc này: dùng
// đúng bộ máy tìm kiếm + chỉ mục full-text của chính Google, tốt hơn hẳn
// cho nội dung tiếng Việt, và Google không hề bán một API tìm kiếm chung
// còn nhận khách mới (xem prospecting.ts) — đây là đường vòng hợp lệ để
// vẫn dùng được sức mạnh tìm kiếm của Google mà không cần trả tiền.
//
// VIỆC TAY MỘT LẦN của Henry: vào google.com/alerts, tạo 2 alert —
//   - "tuviminhbao.com"
//   - "tử vi minh bảo"
// Chọn nguồn "Tự động" (hoặc "Web"), tần suất "Mỗi tuần một lần" (đỡ dồn
// dập), giao hàng chọn "Nguồn cấp RSS" (KHÔNG chọn Email) → bấm "Tạo cảnh
// báo" → mở nguồn cấp đó ra, copy URL. Dán CẢ HAI URL vào env
// `GOOGLE_ALERTS_RSS_URLS`, cách nhau dấu phẩy. Sau đó module này tự chạy,
// không cần làm gì thêm.
//
// Chưa set env → configured:false, KHÔNG throw, KHÔNG chặn cron — cùng lối
// prospecting.ts đã áp cho Brave.
// ============================================================

import { sbInsert } from './db';
import type { Prospect } from './content';

const FEED_URLS = (process.env.GOOGLE_ALERTS_RSS_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const SITE_HOST = 'tuviminhbao.com';
const SKIP_HOSTS = new Set(['google.com', SITE_HOST]);
const FETCH_TIMEOUT_MS = 8000;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** Bóc URL thật khỏi lớp bọc chuyển hướng của Google Alerts (`google.com/url?q=<url>&...`). */
function unwrapGoogleRedirect(raw: string): string {
  try {
    const u = new URL(raw);
    if (hostOf(raw) === 'google.com' && u.pathname === '/url') {
      const q = u.searchParams.get('q') || u.searchParams.get('url');
      if (q) return q;
    }
  } catch {
    /* raw không phải URL hợp lệ — trả nguyên văn, lượt lọc phía dưới sẽ bỏ */
  }
  return raw;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

interface FeedEntry {
  title: string;
  link: string;
  summary: string;
}

/**
 * Bóc entry từ Atom feed — REGEX, không phải parser XML đầy đủ. Đủ dùng vì
 * hình dạng feed Google Alerts rất cố định (mỗi `<entry>` không lồng
 * `<entry>` khác trong nó) — cùng mẹo `tracker.ts` đã dùng cho `<a>`.
 */
function parseAtomEntries(xml: string): FeedEntry[] {
  const out: FeedEntry[] = [];
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  for (const block of entries) {
    const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkM = block.match(/<link\b[^>]*href=["']([^"']*)["'][^>]*\/?>/i);
    const summaryM = block.match(/<(?:summary|content)[^>]*>([\s\S]*?)<\/(?:summary|content)>/i);
    const rawLink = linkM ? decodeEntities(linkM[1]) : '';
    if (!rawLink) continue;
    out.push({
      title: decodeEntities((titleM?.[1] || '').replace(/<[^>]+>/g, '').trim()).slice(0, 200),
      link: unwrapGoogleRedirect(rawLink),
      summary: decodeEntities((summaryM?.[1] || '').replace(/<[^>]+>/g, '').trim()).slice(0, 500),
    });
  }
  return out;
}

async function fetchFeed(url: string): Promise<FeedEntry[]> {
  const res = await fetch(url, {
    headers: { Accept: 'application/atom+xml, application/rss+xml, text/xml' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Alerts RSS ${res.status}`);
  return parseAtomEntries(await res.text());
}

export interface AlertsRssResult {
  configured: boolean;
  feeds: number;
  found: number;
  inserted: number;
  skipped: number;
  note?: string;
}

export async function runAlertsRssProspecting(limitPerRun = 15): Promise<AlertsRssResult> {
  if (!FEED_URLS.length) {
    return { configured: false, feeds: 0, found: 0, inserted: 0, skipped: 0, note: 'chưa cấu hình GOOGLE_ALERTS_RSS_URLS' };
  }

  let found = 0;
  let inserted = 0;
  let skipped = 0;

  for (const feedUrl of FEED_URLS) {
    if (inserted >= limitPerRun) break;
    let entries: FeedEntry[] = [];
    try {
      entries = await fetchFeed(feedUrl);
    } catch {
      continue; // một feed lỗi không được kéo sập feed còn lại
    }
    for (const e of entries) {
      if (inserted >= limitPerRun) break;
      if (!/^https?:\/\//i.test(e.link)) continue;
      const host = hostOf(e.link);
      if (!host || SKIP_HOSTS.has(host)) continue;
      found++;

      // POST thuần (không upsert) — trùng `url` → 409 → skipped, cùng lý do db.ts.
      const row = await sbInsert<Prospect>('backlink_prospects', {
        kind: 'unlinked_mention',
        name: e.title || host,
        url: e.link,
        topic: null,
        notes: e.summary || null,
        status: 'new',
        source: 'alert_rss',
      });
      if (row) inserted++;
      else skipped++;
    }
  }

  return { configured: true, feeds: FEED_URLS.length, found, inserted, skipped };
}
