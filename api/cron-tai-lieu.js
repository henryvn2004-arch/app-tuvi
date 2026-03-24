// api/cron-tai-lieu.js
// Vercel Cron Job — chạy 4 lần/ngày từ 21:00 VN (14:00 UTC), cách nhau 15 phút
// Mỗi lần xử lý 3–5 bài → tổng ~12–20 bài/ngày
// Thêm vào vercel.json:
//   "crons": [
//     { "path": "/api/cron-tai-lieu", "schedule": "0 14 * * *" },
//     { "path": "/api/cron-tai-lieu", "schedule": "15 14 * * *" },
//     { "path": "/api/cron-tai-lieu", "schedule": "30 14 * * *" },
//     { "path": "/api/cron-tai-lieu", "schedule": "45 14 * * *" }
//   ]

const COHOC_BASE = 'https://tuvi.cohoc.net';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // dùng service key để insert
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// Tổng số trang list trên cohoc.net
const TOTAL_PAGES = 846;
// Số bài xử lý mỗi lần cron trigger
const BATCH_SIZE = 4;

// ── Supabase helpers ──────────────────────────────────────────────

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

// Lấy cursor hiện tại (trang nào đang crawl đến)
async function getCursor() {
  const r = await supabaseFetch('/cron_state?key=eq.tailieu_cursor&select=value&limit=1');
  if (r.ok && r.body && r.body.length > 0) {
    return parseInt(r.body[0].value) || 1;
  }
  return 1;
}

// Lưu cursor mới
async function saveCursor(page) {
  await supabaseFetch('/cron_state', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ key: 'tailieu_cursor', value: String(page) }),
  });
}

// Kiểm tra slug đã tồn tại chưa (tránh duplicate)
async function slugExists(slug) {
  const r = await supabaseFetch(`/tai_lieu?slug=eq.${slug}&select=slug&limit=1`);
  return r.ok && r.body && r.body.length > 0;
}

// Insert bài vào tai_lieu
async function insertArticle(article) {
  return await supabaseFetch('/tai_lieu', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      tags: article.tags,
      content: article.content,
      created_at: new Date().toISOString(),
    }),
  });
}

// ── Crawl helpers ─────────────────────────────────────────────────

async function fetchHtml(url) {
  // Dùng proxy để bypass firewall cohoc.net
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.text();
    } catch(e) { /* try next */ }
  }
  throw new Error(`All proxies failed for: ${url}`);
}

function parseListPage(html) {
  // Extract h3 > a links từ list page
  const links = [];
  const regex = /<h3[^>]*><a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1].trim();
    const title = m[2].trim();
    if (href.includes('-nid-')) {
      const url = href.startsWith('http') ? href : `${COHOC_BASE}/${href.replace(/^\//, '')}`;
      links.push({ url, title });
    }
  }
  return links;
}

function parseArticleContent(html) {
  // Strip tags, lấy nội dung text
  const noScript = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  const noStyle = noScript.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Try get main content block
  const contentMatch = noStyle.match(/<div[^>]+class="[^"]*(?:article|content|entry|post)[^"]*"[^>]*>([\s\S]+?)<\/div>/i);
  let raw = contentMatch ? contentMatch[1] : noStyle;
  // Strip remaining tags
  raw = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return raw.slice(0, 5000);
}

// ── Claude Haiku rewrite ──────────────────────────────────────────

async function rewriteWithHaiku(title, rawContent) {
  const prompt = `Bạn là biên tập viên từ điển Tử Vi "Tử Vi Minh Bảo". Rewrite bài sau thành entry từ điển dễ hiểu cho người mới, giọng thân thiện, cấu trúc rõ ràng.

Tiêu đề gốc: ${title}
Nội dung gốc:
${rawContent.slice(0, 3000)}

Trả về JSON thuần (KHÔNG markdown, KHÔNG backtick):
{
  "title": "Tiêu đề SEO-friendly tiếng Việt",
  "slug": "slug-khong-dau-ngan-gon",
  "excerpt": "Tóm tắt 1-2 câu dưới 155 ký tự",
  "category": "một trong: sao-chinh|sao-phu|cung|cach-cuc|van-han|luan-giai|khai-niem",
  "tags": ["tag1","tag2","tag3"],
  "content": "Nội dung rewrite markdown, tối thiểu 200 từ, chia heading rõ ràng"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude ${res.status}`);
  }

  const data = await res.json();
  const text = data.content[0].text.trim()
    .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(text);
}

// ── Main handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  // Bảo vệ endpoint: chỉ Vercel Cron mới gọi được
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { processed: 0, saved: 0, skipped: 0, errors: [] };
  const startTime = Date.now();

  try {
    // 1. Lấy cursor — trang list hiện tại
    let cursor = await getCursor();
    if (cursor > TOTAL_PAGES) cursor = 1; // reset khi hết

    console.log(`[cron-tai-lieu] Cursor: trang ${cursor}`);

    // 2. Fetch trang list
    const listUrl = cursor === 1
      ? `${COHOC_BASE}/hoc-tu-vi.html`
      : `${COHOC_BASE}/hoc-tu-vi-${cursor}.html`;

    let listHtml;
    try {
      listHtml = await fetchHtml(listUrl);
    } catch (e) {
      console.error(`[cron-tai-lieu] Fetch list page lỗi: ${e.message}`);
      // Advance cursor và bail
      await saveCursor(cursor + 1);
      return res.status(200).json({ message: 'List page fetch failed, advanced cursor', cursor });
    }

    const articles = parseListPage(listHtml);
    console.log(`[cron-tai-lieu] Tìm được ${articles.length} bài ở trang ${cursor}`);

    // 3. Random shuffle + lấy BATCH_SIZE bài
    const shuffled = articles.sort(() => Math.random() - 0.5).slice(0, BATCH_SIZE);

    // 4. Xử lý từng bài tuần tự (tránh timeout do parallel)
    for (const item of shuffled) {
      // Check timeout: còn < 3s thì dừng
      if (Date.now() - startTime > 7000) {
        console.log('[cron-tai-lieu] Near timeout, stopping early');
        break;
      }

      try {
        // Check duplicate
        const tempSlug = item.title
          .toLowerCase()
          .replace(/[àáạảãăắặẳẵâấậẩẫ]/g, 'a')
          .replace(/[èéẹẻẽêếệểễ]/g, 'e')
          .replace(/[ìíịỉĩ]/g, 'i')
          .replace(/[òóọỏõôốộổỗơớợởỡ]/g, 'o')
          .replace(/[ùúụủũưứựửữ]/g, 'u')
          .replace(/[ỳýỵỷỹ]/g, 'y')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim().replace(/\s+/g, '-').slice(0, 60);

        if (await slugExists(tempSlug)) {
          console.log(`[cron-tai-lieu] Skip duplicate: ${tempSlug}`);
          results.skipped++;
          continue;
        }

        // Fetch bài
        const articleHtml = await fetchHtml(item.url);
        const rawContent = parseArticleContent(articleHtml);

        if (rawContent.length < 100) {
          results.skipped++;
          continue;
        }

        // Rewrite
        const rewritten = await rewriteWithHaiku(item.title, rawContent);

        // Save
        const saveResult = await insertArticle(rewritten);
        if (saveResult.ok) {
          results.saved++;
          console.log(`[cron-tai-lieu] ✅ Saved: ${rewritten.title}`);
        } else {
          results.errors.push(`DB error: ${JSON.stringify(saveResult.body).slice(0, 100)}`);
        }

        results.processed++;

      } catch (e) {
        console.error(`[cron-tai-lieu] Bài lỗi: ${e.message}`);
        results.errors.push(e.message.slice(0, 100));
      }
    }

    // 5. Advance cursor sang trang tiếp theo
    await saveCursor(cursor + 1);
    console.log(`[cron-tai-lieu] Done. Saved: ${results.saved}, next cursor: ${cursor + 1}`);

  } catch (e) {
    console.error(`[cron-tai-lieu] Fatal: ${e.message}`);
    return res.status(500).json({ error: e.message, results });
  }

  return res.status(200).json({
    message: 'OK',
    duration_ms: Date.now() - startTime,
    ...results,
  });
}
