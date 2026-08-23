// lib/growth/embeds.ts
// ============================================================
// WIDGET NHÚNG — mục #7/14 (growth hack GH1), vòng lặp TỰ NUÔI duy nhất
// trong cả track: mỗi lượt nhúng vừa là kênh phân phối, vừa tự khai ra một
// mối quan hệ ấm, vừa (nếu họ giữ dòng ghi nguồn) là một backlink THẬT.
//
// 🔴 ĐÍNH CHÍNH MỘT NIỀM TIN PHỔ BIẾN — đọc trước khi quảng cáo tính năng này:
// IFRAME KHÔNG PHẢI BACKLINK. Link nằm trong tài liệu của iframe, tức thuộc
// domain CỦA MÌNH, không nằm trên trang của họ — Google không tính cho họ
// trỏ sang mình. `docs/GROWTH-BRAINSTORM.md` (Cược B) ghi "mỗi widget là một
// backlink thật"; vế đó SAI về mặt SEO và tôi đã dựng theo cách khác.
//
// Thứ THẬT SỰ thành backlink là dòng ghi nguồn `<a>` nằm NGOÀI iframe, trong
// chính HTML trang họ. Nên mã nhúng cấp cho người ta LUÔN gồm hai phần
// (iframe + <a>), và cron sẽ ghé lại kiểm xem họ có giữ dòng đó không:
//   - còn  → ghi vào backlink_links, thành backlink đã xác minh
//   - mất  → thành cơ hội ẤM trong backlink_prospects (họ đang dùng đồ của
//            mình, xin thêm một dòng ghi nguồn là lời đề nghị dễ nhất có thể)
//
// Cái iframe vẫn đáng giá độc lập: lưu lượng người thật + nhận diện thương
// hiệu. Chỉ đừng gọi nó là backlink.
// ============================================================

import { sbGet, sbInsert, sbPatch, sbConfigured } from '@/lib/backlinks/db';
import { SEO_BASE } from '@/lib/seo/entity';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const UA = 'TuviMinhBaoBacklinkBot/1.0 (+https://www.tuviminhbao.com/; kiem-ghi-nguon)';
const FETCH_TIMEOUT_MS = 8000;

export interface EmbedTool {
  slug: string;
  label: string;
  desc: string;
  /** File trong public/tools-shared/ mà widget nạp. */
  script: string;
  /** Chiều cao gợi ý của iframe (px) — đặt trong mã nhúng. */
  height: number;
  /** Trang đầy đủ trên site, dùng cho dòng ghi nguồn. */
  fullPath: string;
}

/**
 * NGUỒN DUY NHẤT của danh sách widget — route `/embed/[tool]` và trang tự
 * phục vụ `/nhung` đều đọc từ đây. Chép danh sách ra hai chỗ là hai chỗ trôi
 * khỏi nhau, đúng lỗi `CRON_TRIGGERS` đã trả giá ba lần trong repo này.
 *
 * Tiêu chí chọn: tra bảng THUẦN (0 lượt LLM, 0đ), không đăng nhập, không
 * tường phí, dữ liệu vào gọn (1–3 ô). Tool nào tốn tiền model thì KHÔNG mở —
 * cho nhúng miễn phí một thứ tốn tiền mỗi lượt là mở van đốt ngân sách.
 */
export const EMBED_TOOLS: EmbedTool[] = [
  {
    slug: 'kim-lau',
    label: 'Xem tuổi làm nhà (Kim Lâu · Hoang Ốc · Tam Tai)',
    desc: 'Nhập năm sinh → biết năm nào phạm Kim Lâu, Hoang Ốc, Tam Tai.',
    script: 'kim-lau.js',
    height: 620,
    fullPath: '/kim-lau',
  },
  {
    slug: 'nap-am',
    label: 'Tra mệnh nạp âm theo năm sinh',
    desc: 'Nhập năm sinh → can chi, nạp âm, ngũ hành và cách dùng.',
    script: 'nap-am.js',
    height: 560,
    fullPath: '/tools/nap-am.html',
  },
];

// ⚠️ `than-so-hoc` CỐ Ý CHƯA mở: module của nó trả dữ liệu thô (và còn đòi
// thêm ô Tên), không trả sẵn chuỗi HTML như hai tool trên. Nhúng nó đồng
// nghĩa phải viết bản render THỨ HAI trong widget — rồi hai bản trôi khỏi
// nhau, đúng lỗi repo đã trả giá. Mở khi nào module đó có hàm render dùng chung.

export function findEmbedTool(slug: string): EmbedTool | null {
  return EMBED_TOOLS.find((t) => t.slug === slug) || null;
}

/** Tên miền của trang ĐANG nhúng, lấy từ Referer. Rỗng = mở trực tiếp. */
export function hostFromReferer(referer: string | null): string {
  if (!referer) return '';
  try {
    const h = new URL(referer).hostname.replace(/^www\./, '');
    if (!h || h === 'tuviminhbao.com' || h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return '';
    return h;
  } catch {
    return '';
  }
}

// Chống nện DB: một cặp domain+tool chỉ ghi lại tối đa 1 lần/giờ trên mỗi
// instance. Widget phổ biến có thể được tải hàng nghìn lượt/ngày, mà thứ cần
// biết chỉ là "ai đang nhúng", không phải đếm từng lượt xem.
const seen = new Map<string, number>();
const THROTTLE_MS = 60 * 60 * 1000;

export async function logEmbedHit(domain: string, tool: string): Promise<void> {
  if (!domain || !sbConfigured()) return;
  const key = `${domain}|${tool}`;
  const now = Date.now();
  const last = seen.get(key) || 0;
  if (now - last < THROTTLE_MS) return;
  seen.set(key, now);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/embed_hit_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ p_domain: domain, p_tool: tool }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Ghi sổ hỏng KHÔNG được làm hỏng widget của người ta. Mất một dòng
    // thống kê nhẹ hơn nhiều so với một khung trắng trên trang đối tác.
  }
}

/** Mã nhúng cấp cho người dùng — iframe + dòng ghi nguồn (phần THẬT SỰ là backlink). */
export function embedSnippet(t: EmbedTool): string {
  return (
    `<iframe src="${SEO_BASE}/embed/${t.slug}" width="100%" height="${t.height}" ` +
    `style="border:1px solid #e5e5e5;border-radius:10px;max-width:520px" ` +
    `loading="lazy" title="${t.label}"></iframe>\n` +
    `<p style="font-size:13px"><a href="${SEO_BASE}${t.fullPath}" target="_blank">${t.label}</a> ` +
    `— công cụ bởi <a href="${SEO_BASE}">Tử Vi Minh Bảo</a></p>`
  );
}

export interface EmbedHit {
  id: string;
  domain: string;
  tool: string;
  hits: number;
  attribution_ok: boolean | null;
  attribution_url: string | null;
  last_checked_at: string | null;
  check_note: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface EmbedCheckResult {
  checked: number;
  withLink: number;
  withoutLink: number;
  newProspects: number;
  newLinks: number;
}

/**
 * Ghé lại trang đang nhúng, xem dòng ghi nguồn còn không.
 *
 * ⚠️ CHỈ đọc HTML công khai, khai đúng danh tính bot trong User-Agent — cùng
 * nguyên tắc tracker.ts/broken-links.ts.
 */
export async function runEmbedCheck(limit = 20): Promise<EmbedCheckResult> {
  const out: EmbedCheckResult = { checked: 0, withLink: 0, withoutLink: 0, newProspects: 0, newLinks: 0 };
  if (!sbConfigured()) return out;

  const rows = await sbGet<EmbedHit>(
    `embed_hits?select=id,domain,tool,hits,attribution_ok,last_checked_at&order=last_checked_at.asc.nullsfirst&limit=${limit}`,
  );

  for (const r of rows) {
    out.checked++;
    let html = '';
    let note = '';
    let found: string | null = null;
    try {
      const res = await fetch(`https://${r.domain}/`, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      note = `HTTP ${res.status}`;
      if (res.ok) html = (await res.text()).slice(0, 400_000);
    } catch (e: unknown) {
      note = `không đọc được: ${(e as Error).message}`.slice(0, 200);
    }

    if (html) {
      // Chỉ tính <a href> THẬT trỏ về site — CỐ Ý không nhận chuỗi
      // "tuviminhbao.com" trần trong văn bản: nhắc tên không phải backlink,
      // và đếm nhầm nó là tự báo cáo một con số không tồn tại.
      const m = html.match(/<a\b[^>]*href=["']((?:https?:)?\/\/(?:www\.)?tuviminhbao\.com[^"']*)["'][^>]*>/i);
      if (m) found = m[1].startsWith('//') ? 'https:' + m[1] : m[1];
    }

    out[found ? 'withLink' : 'withoutLink']++;

    await sbPatch('embed_hits', `id=eq.${r.id}`, {
      attribution_ok: html ? Boolean(found) : null,
      attribution_url: found,
      last_checked_at: new Date().toISOString(),
      check_note: note || null,
    });

    if (found) {
      // Backlink ĐÃ XÁC MINH — ghi vào sổ link đang theo dõi. Trùng
      // (source_url, target_url) → 409 → sbInsert trả null, tính là đã có.
      const row = await sbInsert('backlink_links', {
        source_url: `https://${r.domain}/`,
        target_url: found,
        anchor_text: null,
        rel: 'unknown',
        status: 'alive',
        notes: `Tự phát hiện từ widget nhúng (${r.tool}).`,
      });
      if (row) out.newLinks++;
    } else if (html) {
      // Đang dùng widget mà KHÔNG giữ dòng ghi nguồn → cơ hội ẤM nhất có thể:
      // họ đã chủ động lấy đồ của mình về dùng rồi.
      const row = await sbInsert('backlink_prospects', {
        kind: 'other',
        name: r.domain,
        url: `https://${r.domain}/`,
        topic: 'Đang nhúng widget của site',
        notes: `Trang này nhúng widget "${r.tool}" nhưng chưa có dòng ghi nguồn. Liên hệ xin thêm một dòng credit — họ đã dùng đồ của mình nên đây là lời đề nghị dễ nhất.`,
        status: 'new',
        source: 'manual',
      });
      if (row) out.newProspects++;
    }
  }
  return out;
}

export function formatEmbedReport(r: EmbedCheckResult): string | null {
  if (!r.checked) return null;
  const lines = [`🧩 <b>Widget nhúng</b> — soi ${r.checked} trang`];
  if (r.newLinks) lines.push(`✅ ${r.newLinks} backlink mới đã xác minh`);
  if (r.newProspects) lines.push(`💬 ${r.newProspects} trang dùng widget mà chưa ghi nguồn → cơ hội ấm`);
  if (!r.newLinks && !r.newProspects) return null;
  return lines.join('\n');
}
