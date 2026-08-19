// lib/backlinks/tracker.ts
// ============================================================
// THEO DÕI LINK — re-fetch trang MANG backlink, xác nhận link còn sống,
// đọc dofollow/nofollow + anchor text.
//
// Đây là phần TỰ ĐỘNG ĐƯỢC HOÀN TOÀN AN TOÀN của cả module: chỉ đọc trang
// công khai, không đăng/gửi/ghi gì lên site người khác. Khác `prospecting.ts`
// (gọi 1 API tìm kiếm) ở chỗ nó chạm trực tiếp vào site thứ ba — nên identify
// đúng danh tính bot trong User-Agent, KHÔNG giả trình duyệt (cùng nguyên tắc
// `keyword-suggest.ts` đã áp cho Google Suggest): việc này không cần né ai,
// việc này CẦN được nhận ra là một bot đọc thật.
// ============================================================

import { sbGet, sbPatch } from './db';
import { getConfigValue } from '@/lib/config/appConfig';

const UA = 'TuviMinhBaoBacklinkBot/1.0 (+https://www.tuviminhbao.com/; kiem-tra-backlink)';
const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_CAP = 40;
const HARD_MAX = 150;
/** Trần cứng thời gian một lượt — dừng giữa chừng còn hơn chạm maxDuration của route rồi bị giết ngang. */
const TIME_BUDGET_MS = 90_000;

export interface TrackedLink {
  id: string;
  prospect_id: string | null;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  rel: 'dofollow' | 'nofollow' | 'unknown';
  status: 'unchecked' | 'alive' | 'dead';
  last_checked_at: string | null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** Bóc mọi thẻ <a> trỏ tới `targetHost` từ HTML — regex, không phải parser đầy đủ (đủ dùng: đa số trang không lồng thẻ <a> trong nhau). */
function findLinksToHost(html: string, targetHost: string): { rel: string; anchorText: string }[] {
  const out: { rel: string; anchorText: string }[] = [];
  const tagRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const attrs = m[1] || '';
    const hrefM = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
    const href = hrefM ? hrefM[1] : '';
    if (!href || !href.toLowerCase().includes(targetHost)) continue;
    const relM = attrs.match(/rel\s*=\s*["']([^"']*)["']/i);
    const anchorText = (m[2] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    out.push({ rel: (relM ? relM[1] : '').toLowerCase(), anchorText });
  }
  return out;
}

function classifyRel(rel: string): 'dofollow' | 'nofollow' {
  return /nofollow|sponsored|ugc/.test(rel) ? 'nofollow' : 'dofollow';
}

export interface CheckOneResult {
  status: 'alive' | 'dead';
  rel: 'dofollow' | 'nofollow' | 'unknown';
  anchorText: string | null;
}

/** Kiểm MỘT link. Không bao giờ throw — mọi lỗi mạng/parse đọc thành 'dead' (thận trọng: nghi ngờ thì coi là mất, người vẫn thấy dòng đó để tự kiểm tay). */
export async function checkTrackedLink(l: TrackedLink): Promise<CheckOneResult> {
  const targetHost = hostOf(l.target_url) || 'tuviminhbao.com';
  try {
    const res = await fetch(l.source_url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { status: 'dead', rel: 'unknown', anchorText: null };
    const ct = res.headers.get('content-type') || '';
    if (ct && !ct.includes('html')) return { status: 'dead', rel: 'unknown', anchorText: null };
    const html = await res.text();
    const hits = findLinksToHost(html, targetHost);
    if (!hits.length) return { status: 'dead', rel: 'unknown', anchorText: null };
    const rel = classifyRel(hits[0].rel);
    return { status: 'alive', rel, anchorText: hits[0].anchorText || null };
  } catch {
    return { status: 'dead', rel: 'unknown', anchorText: null };
  }
}

export interface RunCheckResult {
  checked: number;
  alive: number;
  dead: number;
  newlyDead: string[]; // source_url của link VỪA chuyển alive/unchecked → dead — đáng báo riêng
  stoppedReason?: string;
}

/** Kiểm lô link CŨ NHẤT (chưa kiểm bao giờ được ưu tiên trước). */
export async function runLinkCheck(): Promise<RunCheckResult> {
  const cap = Math.max(0, Math.min(await getConfigValue('backlinks.check_daily_cap', DEFAULT_CAP), HARD_MAX));
  const result: RunCheckResult = { checked: 0, alive: 0, dead: 0, newlyDead: [] };
  if (cap === 0) {
    result.stoppedReason = 'backlinks.check_daily_cap = 0 — đang tắt';
    return result;
  }

  const links = await sbGet<TrackedLink>(
    'backlink_links?select=id,prospect_id,source_url,target_url,anchor_text,rel,status,last_checked_at' +
      '&order=last_checked_at.asc.nullsfirst&limit=' + cap,
  );
  if (!links.length) return result;

  const t0 = Date.now();
  for (const l of links) {
    if (Date.now() - t0 > TIME_BUDGET_MS) {
      result.stoppedReason = `hết ngân sách thời gian — ${links.length - result.checked} link còn lại chờ lượt sau`;
      break;
    }
    const before = l.status;
    const r = await checkTrackedLink(l);
    await sbPatch('backlink_links', `id=eq.${l.id}`, {
      status: r.status,
      rel: r.rel === 'unknown' ? l.rel : r.rel, // giữ rel cũ nếu lượt này không đọc được (trang lỗi tạm)
      anchor_text: r.anchorText || l.anchor_text,
      last_checked_at: new Date().toISOString(),
    });
    result.checked++;
    if (r.status === 'alive') result.alive++;
    else {
      result.dead++;
      if (before !== 'dead') result.newlyDead.push(l.source_url);
    }
  }
  return result;
}
