// lib/backlinks/broken-links.ts
// ============================================================
// QUÉT LINK CHẾT trên các trang roundup/tài nguyên trong danh sách tĩnh
// (seed-list.ts) — cách backlink WHITE HAT nhất trong cả module: chỉ ra một
// lỗi THẬT trên trang người khác (link họ liệt kê đã chết), không xin gì cả.
// 0 API key, 0đ mãi mãi.
//
// Đúng nguyên tắc `tracker.ts`: chỉ ĐỌC trang công khai, UA tự khai danh —
// việc này không cần né ai, cần được nhận ra là một bot đọc thật.
//
// CHỈ báo link chết ĐÚNG NGÁCH tử vi/tarot/chiêm tinh/phong thủy — link
// chết của một sản phẩm không liên quan thì không có lý do gì mình biết
// hay quan tâm, và báo bừa là đúng loại "broken-link-building spam blast"
// Google gọi thẳng tên (xem SPAM_PHRASES trong content.ts).
// ============================================================

import { sbGet, sbInsert, sbPatch } from './db';
import { seedResourcePages } from './seed-list';

const UA = 'TuviMinhBaoBacklinkBot/1.0 (+https://www.tuviminhbao.com/; kiem-tra-backlink)';
const FETCH_TIMEOUT_MS = 6000;
const MAX_LINKS_PER_PAGE = 30;
/** Trần cứng thời gian một lượt — dừng giữa chừng còn hơn chạm maxDuration của route rồi bị giết ngang. */
const TIME_BUDGET_MS = 70_000;

const NICHE_KEYWORDS = [
  'tarot', 'tử vi', 'tu vi', 'chiêm tinh', 'chiem tinh', 'astrology', 'horoscope',
  'bói', 'boi toan', 'phong thủy', 'phong thuy', 'lá số', 'la so', 'cung hoàng đạo',
  'cung hoang dao', 'zodiac', 'xem tuổi', 'xem tuoi', 'xem ngày', 'xem ngay',
  'bát tự', 'bat tu', 'thần số học', 'than so hoc', 'đẩu số', 'dau so',
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

interface PageLink {
  url: string;
  anchorText: string;
}

/** Bóc mọi `<a href>` TRỎ RA NGOÀI `ownHost` — ngược `findLinksToHost` của tracker.ts (nó lọc TỚI một host, cái này lọc TRÁNH một host). */
function extractOutboundLinks(html: string, ownHost: string): PageLink[] {
  const out: PageLink[] = [];
  const seen = new Set<string>();
  const tagRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    if (out.length >= MAX_LINKS_PER_PAGE) break;
    const attrs = m[1] || '';
    const hrefM = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
    const href = hrefM ? hrefM[1] : '';
    if (!href || !/^https?:\/\//i.test(href)) continue;
    const host = hostOf(href);
    if (!host || host === ownHost || seen.has(href)) continue;
    seen.add(href);
    const anchorText = (m[2] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    out.push({ url: href, anchorText });
  }
  return out;
}

function isNicheRelevant(text: string): boolean {
  const low = text.toLowerCase();
  return NICHE_KEYWORDS.some((k) => low.includes(k));
}

/** `true` = link chết. Không throw — nghi ngờ (mất kết nối/timeout/DNS lỗi) cũng đọc thành chết, người tự kiểm tay nếu nghi oan. */
async function isDeadLink(url: string): Promise<boolean> {
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    // Một số server từ chối HEAD dù trang sống thật — thử lại bằng GET đúng MỘT lần.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    }
    return res.status === 404 || res.status === 410 || res.status >= 500;
  } catch {
    return true;
  }
}

export interface BrokenLinkScanResult {
  pagesScanned: number;
  linksChecked: number;
  deadFound: number;
  inserted: number;
  enriched: number;
  skipped: number;
  stoppedReason?: string;
}

export async function runBrokenLinkScan(): Promise<BrokenLinkScanResult> {
  const result: BrokenLinkScanResult = {
    pagesScanned: 0, linksChecked: 0, deadFound: 0, inserted: 0, enriched: 0, skipped: 0,
  };
  const pages = seedResourcePages();
  if (!pages.length) return result;

  const t0 = Date.now();
  for (const page of pages) {
    if (Date.now() - t0 > TIME_BUDGET_MS) {
      result.stoppedReason = `hết ngân sách thời gian — còn ${pages.length - result.pagesScanned} trang chờ lượt sau`;
      break;
    }

    let html = '';
    try {
      const res = await fetch(page.url, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      result.pagesScanned++;
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (ct && !ct.includes('html')) continue;
      html = await res.text();
    } catch {
      result.pagesScanned++;
      continue;
    }

    const ownHost = hostOf(page.url);
    const links = extractOutboundLinks(html, ownHost);
    const deadOnThisPage: PageLink[] = [];

    for (const l of links) {
      if (Date.now() - t0 > TIME_BUDGET_MS) break;
      // Chỉ tốn lượt fetch cho link ĐÚNG NGÁCH — bỏ qua ngay từ đầu, không
      // phải chờ isDeadLink() trả về rồi mới lọc.
      if (!isNicheRelevant(l.anchorText) && !isNicheRelevant(l.url)) continue;
      result.linksChecked++;
      if (await isDeadLink(l.url)) {
        result.deadFound++;
        deadOnThisPage.push(l);
      }
    }
    if (!deadOnThisPage.length) continue;

    const notes = deadOnThisPage
      .slice(0, 5)
      .map((l) => `Link chết: ${l.url}${l.anchorText ? ` (anchor: "${l.anchorText}")` : ''}`)
      .join('\n');

    // Trùng `url` với một prospect CÓ SẴN (rất có thể chính seed-list.ts đã
    // thêm trang này trước, ở dạng 'resource_page' chưa có ghi chú cụ thể)
    // → NÂNG CẤP nó thành 'broken_link' kèm ghi chú, KHÔNG chèn dòng mới.
    // Chỉ nâng cấp khi còn 'new' VÀ chưa có ghi chú — admin đã đụng vào rồi
    // thì không ghi đè (cùng kỷ luật "không upsert" của db.ts).
    const existing = await sbGet<{ id: string; status: string; notes: string | null }>(
      `backlink_prospects?url=eq.${encodeURIComponent(page.url)}&select=id,status,notes&limit=1`,
    );
    if (existing.length) {
      const row = existing[0];
      if (row.status === 'new' && !row.notes) {
        const patched = await sbPatch('backlink_prospects', `id=eq.${row.id}`, {
          kind: 'broken_link',
          notes,
          updated_at: new Date().toISOString(),
        });
        if (patched) result.enriched++;
        else result.skipped++;
      } else {
        result.skipped++;
      }
    } else {
      const row = await sbInsert<{ id: string }>('backlink_prospects', {
        kind: 'broken_link',
        name: page.name,
        url: page.url,
        topic: page.topic || null,
        notes,
        status: 'new',
        source: 'broken_link_scan',
      });
      if (row) result.inserted++;
      else result.skipped++;
    }
  }

  return result;
}
