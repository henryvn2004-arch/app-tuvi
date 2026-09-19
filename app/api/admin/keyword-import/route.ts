// app/api/admin/keyword-import/route.ts
// ============================================================
// Nạp TỪ KHOÁ CÓ VOLUME THẬT vào `keyword_ideas` — Google Ads Keyword Planner
// và TikTok Creative Center. Hai nguồn này KHÔNG gọi được từ cron: Keyword
// Planner cần developer token phải xin duyệt + OAuth refresh token (không
// dùng được service account), Creative Center không có API công khai — cả
// hai chỉ xuất ra được bằng CSV tải tay từ trình duyệt đã đăng nhập tài khoản
// thật. Route này là CỬA NẠP TAY: Henry tải CSV, dán vào đây một lần, phần
// còn lại (parse, upsert, feed vào `topic-topup.ts`) chạy tự động — không cần
// sửa code cho mỗi lượt nạp mới.
//
// KHÔNG phải "nguồn thứ tư" của `topic-topup.ts` — vẫn ghi vào ĐÚNG bảng
// `keyword_ideas` mà `keyword-suggest.ts` (nguồn 2) đã dùng, chỉ đổ thêm vào
// cột `volume`/`volume_source` mà bảng đã chừa sẵn từ migration đầu
// (`_patches/migration-keyword-ideas.sql`: "Volume để dành cho Google Ads
// API"). `fromSuggest()` đã đổi sang ưu tiên `volume` khi có — xem chú thích
// ở đó.
//
// Định dạng cột KHÔNG hard-code: Keyword Planner (VI lẫn EN) và Creative
// Center không có một schema cố định mình xác nhận được, nên parser dò HEADER
// ROW bằng tên cột (khớp mẫu tiếng Việt lẫn tiếng Anh) thay vì đếm vị trí cột.
// Dán đúng bảng có cột "từ khoá"/"keyword" + một cột số lượng là chạy được,
// không cần đúng khuôn của riêng Google hay riêng TikTok.
// ============================================================
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;

function auth(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

// ── Parse CSV/TSV ────────────────────────────────────────────────────────────

/** Tách một dòng CSV/TSV tôn trọng dấu ngoặc kép (số có phân cách nghìn nằm
 * trong ngoặc, vd `"1,900"`, không được tách nhầm thành hai cột). */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === delim && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

const KEYWORD_COL = /^(keyword|từ khoá|từ khóa|search term|hashtag|query|top keyword)s?$/i;
const VOLUME_COL = /(avg.*monthly.*search|monthly search|lượt tìm kiếm|search volume|^volume$|popularity|search index|video views|posts)/i;

/**
 * Đọc "10K", "1,9 nghìn", "1.900", "1K - 10K"… thành một số nguyên.
 *
 * Số lượt tìm kiếm LUÔN là số nguyên — không ai báo "1,9 lượt tìm kiếm" trừ
 * khi có hậu tố K/M/nghìn/triệu. Nên: có hậu tố thì dấu `,`/`.` là THẬP PHÂN;
 * không có hậu tố thì mọi dấu `,`/`.` là NGĂN CÁCH NGHÌN, bỏ thẳng — cách này
 * tránh được hẳn việc phải đoán quy ước VN (nghìn=`.`) hay US (nghìn=`,`).
 * Không parse nổi thì trả `null`, KHÔNG đoán liều — dòng vẫn được nạp, chỉ
 * thiếu volume, còn hơn ghi một số bịa.
 */
function parseVolume(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  const range = s.match(/^([\d.,\s]+)\s*(k|m|nghìn|ngàn|triệu|tr)?\s*[-–—]\s*([\d.,\s]+)\s*(k|m|nghìn|ngàn|triệu|tr)?$/i);
  if (range) {
    const lo = parseVolume(`${range[1]}${range[2] || ''}`);
    const hi = parseVolume(`${range[3]}${range[4] || ''}`);
    if (lo == null || hi == null) return null;
    return Math.round((lo + hi) / 2);
  }

  const suffixed = s.match(/^([\d.,]+)\s*(k|m|nghìn|ngàn|triệu|tr)$/i);
  if (suffixed) {
    const n = parseFloat(suffixed[1].replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    const unit = suffixed[2].toLowerCase();
    const mult = unit === 'k' || unit === 'nghìn' || unit === 'ngàn' ? 1_000 : 1_000_000;
    return Math.round(n * mult);
  }

  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeKeyword(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

interface ImportRow {
  keyword: string;
  volume: number | null;
}

/** Dò dòng tiêu đề trong 8 dòng đầu (Keyword Planner hay có 1-2 dòng mở đầu
 * kiểu "Kế hoạch từ khoá của…" trước bảng thật) rồi đọc theo tên cột. */
function parseKeywordCsv(text: string): { rows: ImportRow[]; keywordCol: string; volumeCol: string | null } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return { rows: [], keywordCol: '', volumeCol: null };

  const delim = (lines[0].match(/\t/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? '\t' : ',';

  let headerIdx = -1;
  let cells: string[] = [];
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const c = splitLine(lines[i], delim);
    if (c.some(h => KEYWORD_COL.test(h))) { headerIdx = i; cells = c; break; }
  }
  if (headerIdx === -1) return { rows: [], keywordCol: '', volumeCol: null };

  const kwIdx = cells.findIndex(h => KEYWORD_COL.test(h));
  const volIdx = cells.findIndex(h => VOLUME_COL.test(h));

  const rows: ImportRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const c = splitLine(lines[i], delim);
    const kw = normalizeKeyword(c[kwIdx] || '');
    if (kw.length < 3 || kw.length > 120) continue;
    if (/https?:|www\.|@/.test(kw)) continue;
    if (/^(total|tổng|tong)/i.test(kw)) continue;
    rows.push({ keyword: kw, volume: volIdx >= 0 ? parseVolume(c[volIdx] || '') : null });
  }
  return { rows, keywordCol: cells[kwIdx], volumeCol: volIdx >= 0 ? cells[volIdx] : null };
}

// ── Upsert `keyword_ideas` ────────────────────────────────────────────────────

/**
 * Cùng khuôn với `upsertKeywords` ở `keyword-suggest.ts`: đọc trước dòng đã
 * có để KHÔNG ghi đè `first_seen_at`, và không xoá `volume` cũ của cụm không
 * có volume trong lượt nạp này (dòng TikTok không phải lúc nào cũng có số).
 */
async function upsertVolumes(
  rows: ImportRow[],
  source: string,
  volumeSource: string,
): Promise<{ inserted: number; updated: number; withVolume: number }> {
  if (!SB_URL || !SB_KEY || !rows.length) return { inserted: 0, updated: 0, withVolume: 0 };

  const nowIso = new Date().toISOString();
  let inserted = 0;
  let updated = 0;
  let withVolume = 0;

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const keywords = chunk.map(r => r.keyword);
    const q = keywords.map(k => `"${k.replace(/"/g, '\\"')}"`).join(',');

    let existing: Record<string, { times_seen: number; best_position: number | null; volume: number | null }> = {};
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/keyword_ideas?keyword=in.(${encodeURIComponent(q)})&select=keyword,times_seen,best_position,volume`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: 'no-store' },
      );
      if (res.ok) {
        const r = (await res.json()) as { keyword: string; times_seen: number; best_position: number | null; volume: number | null }[];
        existing = Object.fromEntries(r.map(x => [x.keyword, x]));
      }
    } catch {
      /* đọc hụt thì coi như toàn bộ là mới — chỉ sai số báo cáo */
    }

    const body = chunk.map(row => {
      const prev = existing[row.keyword];
      if (prev) updated++; else inserted++;
      const volume = row.volume ?? prev?.volume ?? null;
      if (volume != null) withVolume++;
      return {
        keyword: row.keyword,
        seed: null,
        source,
        best_position: prev?.best_position ?? null,
        volume,
        volume_source: volume != null ? volumeSource : null,
        times_seen: (prev?.times_seen ?? 0) + 1,
        last_seen_at: nowIso,
      };
    });

    try {
      await fetch(`${SB_URL}/rest/v1/keyword_ideas?on_conflict=keyword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.warn('[keyword-import] ghi lô hỏng:', (e as Error)?.message?.slice(0, 120));
    }
  }

  return { inserted, updated, withVolume };
}

// ── Điểm vào ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!auth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { csv?: string; source?: string; label?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch (e: unknown) {
    return NextResponse.json({ error: `Parse error: ${(e as Error).message}` }, { status: 400 });
  }

  const csv = typeof body.csv === 'string' ? body.csv : '';
  const source = body.source === 'tiktok' ? 'tiktok' : 'ads';
  const label = (body.label || '').trim() ||
    `${source === 'tiktok' ? 'TikTok Creative Center' : 'Google Ads Keyword Planner'} — ${new Date().toISOString().slice(0, 10)}`;

  if (!csv.trim()) {
    return NextResponse.json({ error: 'Thiếu dữ liệu CSV/TSV đã dán' }, { status: 400 });
  }

  const { rows, keywordCol, volumeCol } = parseKeywordCsv(csv);
  if (!rows.length) {
    return NextResponse.json(
      { error: 'Không tìm được cột từ khoá (dò theo tên cột "keyword"/"từ khoá"…) trong dữ liệu đã dán' },
      { status: 400 },
    );
  }

  const r = await upsertVolumes(rows, source, label);

  return NextResponse.json({
    ok: true,
    parsed: rows.length,
    keywordCol,
    volumeCol: volumeCol || '(không tìm thấy cột volume — vẫn nạp từ khoá, không có số)',
    ...r,
    sample: rows.slice(0, 5),
  });
}

// Admin UI — dán CSV/TSV tải từ Keyword Planner / Creative Center.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || '';
  if (key !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized — thêm ?key=CRON_SECRET', { status: 401, headers: { 'Content-Type': 'text/plain' } });
  }

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Nạp Từ Khoá Có Volume — Tử Vi Minh Bảo</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#f5f5f5;padding:40px 20px;color:#222}
.card{background:#fff;border-radius:10px;padding:32px;max-width:760px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{font-size:20px;font-weight:700;margin-bottom:4px;color:#061A2E}
.subtitle{font-size:13px;color:#777;margin-bottom:24px;line-height:1.6}
label{display:block;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;margin-bottom:6px}
textarea{width:100%;height:260px;border:1px solid #ddd;border-radius:6px;padding:12px;font-size:12px;font-family:monospace;resize:vertical;margin-bottom:16px}
select,input[type=text],input[type=password]{width:100%;border:1px solid #ddd;border-radius:6px;padding:8px 12px;font-size:13px;margin-bottom:16px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
button{background:#061A2E;color:#D4A843;border:none;border-radius:6px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;width:100%}
button:hover{background:#0D3B5E}
#result{margin-top:20px;padding:14px;border-radius:6px;font-size:12px;font-family:monospace;white-space:pre-wrap;display:none}
.ok{background:#e8f5e9;color:#1B5E20;border:1px solid #A5D6A7}
.err{background:#fce4ec;color:#880E4F;border:1px solid #F48FB1}
.hint{font-size:11px;color:#999;margin-top:-12px;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <h1>Nạp Từ Khoá Có Volume</h1>
  <p class="subtitle">Tải file .csv xuất từ Google Ads Keyword Planner (ideas → export) hoặc TikTok Creative Center
    (Keyword Insights → export), mở bằng Sheets/Excel rồi copy toàn bộ bảng — dán nguyên vào ô dưới, giữ tiêu đề
    cột. Không cần đúng khuôn của Google hay TikTok: hệ thống tự dò cột "từ khoá" và cột số lượng. Sau khi nạp,
    <code>topic-topup.ts</code> (chạy tự động hằng tuần) tự ưu tiên các cụm có volume thật khi chọn chủ đề —
    không cần làm gì thêm.</p>

  <label>CRON_SECRET</label>
  <input type="password" id="secret" placeholder="Bearer token từ env CRON_SECRET" style="margin-bottom:16px">

  <div class="row">
    <div>
      <label>Nguồn</label>
      <select id="source">
        <option value="ads">Google Ads Keyword Planner</option>
        <option value="tiktok">TikTok Creative Center</option>
      </select>
    </div>
    <div>
      <label>Ghi chú nguồn (tuỳ chọn)</label>
      <input type="text" id="label" placeholder="vd: Ads VN 19/09/2026">
    </div>
  </div>

  <label>Dữ liệu đã dán (CSV/TSV, giữ dòng tiêu đề)</label>
  <textarea id="csv" placeholder="Keyword,Avg. monthly searches,...&#10;tử vi 2027,12100,...&#10;..."></textarea>
  <p class="hint">Dán cả dòng tiêu đề — parser dò cột theo tên, không theo thứ tự.</p>

  <button onclick="submit()">Nạp Vào keyword_ideas</button>
  <div id="result"></div>
</div>
<script>
async function submit() {
  const csv = document.getElementById('csv').value;
  const source = document.getElementById('source').value;
  const label = document.getElementById('label').value.trim() || undefined;
  const result = document.getElementById('result');
  if (!csv.trim()) { alert('Dán dữ liệu CSV/TSV trước đã'); return; }
  result.style.display = 'none';
  try {
    const res = await fetch(location.pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + document.getElementById('secret').value
      },
      body: JSON.stringify({ csv, source, label })
    });
    const data = await res.json();
    result.style.display = 'block';
    result.className = res.ok && data.ok ? 'ok' : 'err';
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
