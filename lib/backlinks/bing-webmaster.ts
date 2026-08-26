// lib/backlinks/bing-webmaster.ts
// ============================================================
// Đọc backlink THẬT ĐANG SỐNG qua Bing Webmaster Tools — MIỄN PHÍ, và KHÁC
// HẲN Bing Web Search API (dịch vụ tìm kiếm chung, Microsoft đã khai tử
// 11/8/2025, xem prospecting.ts). Bing Webmaster Tools là sản phẩm quản trị
// site RIÊNG, vẫn sống, API vẫn miễn phí cho site đã xác minh chủ sở hữu.
//
// Vai trò: Bing tự crawl cả web và biết những site đang link tới mình mà
// HỆ THỐNG CHƯA TỪNG BIẾT (không qua track prospecting/content ở đây) — bù
// cho `tracker.ts` vốn chỉ re-fetch được những link ĐÃ CÓ SẴN trong bảng.
//
// VIỆC TAY MỘT LẦN của Henry: vào bing.com/webmasters, thêm site
// tuviminhbao.com, xác minh (thẻ meta hoặc bản ghi DNS, vài phút) → vào
// mục Cài đặt → Truy cập API lấy API key → dán vào env
// `BING_WEBMASTER_API_KEY`. Sau đó module này tự chạy.
//
// Chưa set key → configured:false, KHÔNG throw, KHÔNG chặn cron.
// ============================================================

import { sbGet, sbInsert } from './db';

const BING_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';
const API_KEY = process.env.BING_WEBMASTER_API_KEY || '';
const SITE_URL = 'https://www.tuviminhbao.com/';
/** Lịch sự — cùng nhịp 1 req/s Bing khuyến nghị. */
const REQUEST_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_TARGETS = 10;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BingLinkTarget {
  Url: string;
  Count: number;
}
interface BingLinkDetail {
  Url: string;
  AnchorText: string;
}

async function bingRequest<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams({ ...params, apikey: API_KEY });
  try {
    const res = await fetch(`${BING_BASE}/${endpoint}?${qs.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return {} as T;
    const data = JSON.parse(text) as { d?: T };
    return (data?.d ?? (data as unknown as T)) ?? null;
  } catch {
    return null;
  }
}

export interface BingDiscoverResult {
  configured: boolean;
  targetsScanned: number;
  newLinks: number;
  note?: string;
}

/**
 * Tìm backlink CHƯA có trong `backlink_links`, ghi thêm với status='unchecked'
 * — Bing không trả `rel` attribute nên để `tracker.ts` (cron hằng ngày) kiểm
 * lại rel/anchor chính xác ở lượt sau, module này chỉ có vai trò PHÁT HIỆN.
 */
export async function discoverBingBacklinks(): Promise<BingDiscoverResult> {
  if (!API_KEY) {
    return { configured: false, targetsScanned: 0, newLinks: 0, note: 'chưa cấu hình BING_WEBMASTER_API_KEY' };
  }

  const counts = await bingRequest<{ Links?: BingLinkTarget[] }>('GetLinkCounts', { siteUrl: SITE_URL, page: '0' });
  const targets = (counts?.Links || [])
    .filter((t) => t && t.Url)
    .sort((a, b) => (b.Count || 0) - (a.Count || 0))
    .slice(0, MAX_TARGETS);
  if (!targets.length) return { configured: true, targetsScanned: 0, newLinks: 0 };

  const knownRows = await sbGet<{ source_url: string }>('backlink_links?select=source_url&limit=2000');
  const known = new Set(knownRows.map((r) => r.source_url));

  let newLinks = 0;
  for (const t of targets) {
    await sleep(REQUEST_DELAY_MS);
    const detail = await bingRequest<{ Details?: BingLinkDetail[] }>('GetUrlLinks', {
      siteUrl: SITE_URL,
      link: t.Url,
      page: '0',
    });
    for (const d of detail?.Details || []) {
      if (!d?.Url || known.has(d.Url)) continue;
      const row = await sbInsert<{ id: string }>('backlink_links', {
        source_url: d.Url,
        target_url: SITE_URL,
        anchor_text: d.AnchorText || null,
        rel: 'unknown',
        status: 'unchecked',
        notes: 'Phát hiện qua Bing Webmaster Tools (site đã link, chưa từng biết tới trong hệ thống)',
      });
      if (row) {
        newLinks++;
        known.add(d.Url);
      }
    }
  }

  return { configured: true, targetsScanned: targets.length, newLinks };
}
