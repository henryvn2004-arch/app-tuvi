// api/embed-tai-lieu.js
// Tự động embed các bài tai_lieu mới vào pgvector
// Chạy sau Bot 1 — thêm vào vercel.json:
//   { "path": "/api/embed-tai-lieu", "schedule": "30 15 * * *" }  ← 22:30 VN

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY      = process.env.OPENAI_API_KEY;
const BATCH_SIZE      = 10; // số bài embed mỗi lần chạy

async function sbFetch(path, options = {}) {
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

// Lấy các bài chưa có embedding
async function fetchUnembedded() {
  const r = await sbFetch(
    `/tai_lieu?embedding=is.null&select=id,slug,title,excerpt,content&limit=${BATCH_SIZE}`
  );
  return r.ok ? (r.body || []) : [];
}

// Embed 1 text bằng OpenAI
async function embedText(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // max token safety
    }),
  });
  if (!res.ok) throw new Error(`OpenAI embed failed: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// Update embedding vào Supabase
async function saveEmbedding(id, embedding) {
  return await sbFetch(`/tai_lieu?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ embedding: JSON.stringify(embedding) }),
  });
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
  }

  const results = { embedded: 0, skipped: 0, errors: [] };
  const startTime = Date.now();

  try {
    const articles = await fetchUnembedded();
    console.log(`[embed-tai-lieu] ${articles.length} bài chưa có embedding`);

    for (const article of articles) {
      // Timeout safety
      if (Date.now() - startTime > 50000) {
        console.log('[embed-tai-lieu] Near timeout, stopping');
        break;
      }

      try {
        // Tạo text để embed: title + excerpt + content (đầu)
        const text = [
          article.title,
          article.excerpt || '',
          (article.content || '').slice(0, 4000),
        ].filter(Boolean).join('\n\n');

        const embedding = await embedText(text);
        const saved = await saveEmbedding(article.id, embedding);

        if (saved.ok) {
          results.embedded++;
          console.log(`[embed-tai-lieu] ✅ ${article.slug}`);
        } else {
          results.errors.push(`DB error for ${article.slug}`);
        }

        // Rate limit buffer
        await new Promise(r => setTimeout(r, 200));

      } catch (e) {
        console.error(`[embed-tai-lieu] ❌ ${article.slug}: ${e.message}`);
        results.errors.push(`${article.slug}: ${e.message}`);
        results.skipped++;
      }
    }

  } catch (e) {
    return res.status(500).json({ error: e.message, results });
  }

  return res.status(200).json({
    message: 'OK',
    duration_ms: Date.now() - startTime,
    ...results,
  });
}
