// app/api/admin/master-topics/route.ts
// Bulk import topics into topic_queue for the master writing system
// POST: JSON array or CSV body → inserts into topic_queue with type=master-article
// GET: Returns simple admin UI for pasting/uploading topics
export const maxDuration = 30;
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

// 15 master IDs for round-robin assignment
const MASTER_IDS = [
  'huyen-khong','tu-nguyen','linh-son','dau-nam','ngoc-tinh',
  'thien-an','thanh-hu','bac-minh','thai-hu','tam-kinh',
  'co-nguyet','linh-co','nhat-nguyen','dieu-khong','tinh-quang',
];

function auth(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

async function sbPost(path: string, body: unknown) {
  const res = await fetch(`${SB_URL}/rest/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer': 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? null : await res.text() };
}

// Parse CSV text → array of topic strings
function parseCsv(csv: string): string[] {
  return csv.split('\n')
    .map(line => line.replace(/^["']|["']$/g, '').replace(/^\d+[.,]\s*/, '').trim())
    .filter(t => t.length > 5 && !t.toLowerCase().startsWith('topic') && !t.toLowerCase().startsWith('chủ đề'));
}

// Build topic_queue rows from topic strings
function buildRows(topics: string[], masterIdOverride?: string, articleTypeOverride?: string) {
  return topics.map((topic, i) => ({
    topic: topic.slice(0, 500),
    type: 'master-article',
    priority: 5,
    status: 'pending',
    master_id: masterIdOverride || MASTER_IDS[i % MASTER_IDS.length],
    article_type: articleTypeOverride || 'hoc-thuat',
    subject_name: '',
  }));
}

export async function POST(request: NextRequest) {
  if (!auth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  let topics: string[] = [];
  let masterId: string | undefined;
  let articleType: string | undefined;

  try {
    if (contentType.includes('application/json')) {
      const body = await request.json() as {
        topics?: string[];
        csv?: string;
        master_id?: string;
        article_type?: string;
      };
      masterId    = body.master_id;
      articleType = body.article_type;

      if (Array.isArray(body.topics)) {
        topics = body.topics.map(t => String(t).trim()).filter(t => t.length > 5);
      } else if (typeof body.csv === 'string') {
        topics = parseCsv(body.csv);
      }
    } else {
      // Plain text / CSV body
      const text = await request.text();
      topics = parseCsv(text);
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: `Parse error: ${(e as Error).message}` }, { status: 400 });
  }

  if (!topics.length) {
    return NextResponse.json({ error: 'No valid topics found' }, { status: 400 });
  }

  // Insert in batches of 100
  const rows = buildRows(topics, masterId, articleType);
  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const r = await sbPost('/topic_queue', batch);
    if (r.ok) {
      inserted += batch.length;
    } else {
      errors.push(`Batch ${i / 100 + 1}: ${(r.body || '').slice(0, 100)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    parsed: topics.length,
    inserted,
    errors: errors.length ? errors : undefined,
    sample: topics.slice(0, 3),
  });
}

// Admin UI — simple HTML form for pasting topics
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || '';
  if (key !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized — add ?key=CRON_SECRET', { status: 401, headers: { 'Content-Type': 'text/plain' } });
  }

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Import Topics — Master Write System</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#f5f5f5;padding:40px 20px;color:#222}
.card{background:#fff;border-radius:10px;padding:32px;max-width:700px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{font-size:20px;font-weight:700;margin-bottom:4px;color:#061A2E}
.subtitle{font-size:13px;color:#777;margin-bottom:24px}
label{display:block;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;margin-bottom:6px}
textarea{width:100%;height:220px;border:1px solid #ddd;border-radius:6px;padding:12px;font-size:13px;font-family:monospace;resize:vertical;margin-bottom:16px}
select,input[type=text]{width:100%;border:1px solid #ddd;border-radius:6px;padding:8px 12px;font-size:13px;margin-bottom:16px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
button{background:#061A2E;color:#D4A843;border:none;border-radius:6px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;width:100%}
button:hover{background:#0D3B5E}
#result{margin-top:20px;padding:14px;border-radius:6px;font-size:13px;font-family:monospace;white-space:pre-wrap;display:none}
.ok{background:#e8f5e9;color:#1B5E20;border:1px solid #A5D6A7}
.err{background:#fce4ec;color:#880E4F;border:1px solid #F48FB1}
.hint{font-size:11px;color:#999;margin-top:-12px;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <h1>Master Topics Import</h1>
  <p class="subtitle">Dán danh sách chủ đề vào đây — mỗi dòng là 1 chủ đề, hoặc CSV có số thứ tự đầu dòng.</p>

  <label>CRON_SECRET</label>
  <input type="password" id="secret" placeholder="Bearer token từ env CRON_SECRET" style="margin-bottom:16px">
  <label>Danh Sách Chủ Đề (mỗi dòng 1 chủ đề)</label>
  <textarea id="topics" placeholder="Ý nghĩa sao Tử Vi trong cung Mệnh&#10;Cách luận Tứ Hóa khi Lộc nhập cung Tài Bạch&#10;..."></textarea>

  <div class="row">
    <div>
      <label>Loại Bài</label>
      <select id="article_type">
        <option value="hoc-thuat">Học Thuật (round-robin)</option>
        <option value="luan-la-so">Luận Lá Số</option>
        <option value="chiem-nghiem">Chiêm Nghiệm</option>
        <option value="ly-luan">Lý Luận</option>
        <option value="thuc-hanh">Thực Hành</option>
      </select>
    </div>
    <div>
      <label>Tác Giả (tuỳ chọn)</label>
      <input type="text" id="master_id" placeholder="huyen-khong (bỏ trống = round-robin)">
    </div>
  </div>

  <button onclick="submit()">Nhập Vào Hàng Đợi</button>
  <div id="result"></div>
</div>
<script>
async function submit() {
  const text = document.getElementById('topics').value.trim();
  const article_type = document.getElementById('article_type').value;
  const master_id = document.getElementById('master_id').value.trim() || undefined;
  const result = document.getElementById('result');
  if (!text) { alert('Vui lòng nhập chủ đề'); return; }
  result.style.display = 'none';
  try {
    const res = await fetch(location.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + document.getElementById('secret').value
      },
      body: JSON.stringify({ csv: text, article_type, ...(master_id ? { master_id } : {}) })
    });
    const data = await res.json();
    result.style.display = 'block';
    result.className = data.ok ? 'ok' : 'err';
    result.textContent = JSON.stringify(data, null, 2);
  } catch(e) {
    result.style.display = 'block';
    result.className = 'err';
    result.textContent = 'Lỗi: ' + e.message;
  }
}
</script>
</body></html>`;

  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
