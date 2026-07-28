/**
 * GA4 CLI — đọc thẳng Google Analytics 4 từ terminal.
 *
 * Vì sao có file này: `lib/analytics/ga4.ts` chỉ lấy ĐÚNG 1 con số (sessions) để
 * vá ô "Khách ghé" trên dashboard admin. Còn muốn Claude (hoặc Henry) ngồi phân
 * tích GA4 tự do — nguồn traffic, trang nào kéo khách, thiết bị, sự kiện, so
 * tuần này với tuần trước — thì cần một cửa đọc BẤT KỲ dimension/metric nào.
 * Đây là cửa đó. THUẦN ĐỌC (scope analytics.readonly), không ghi gì vào GA4.
 *
 * Setup 1 lần (xem thêm docs/GA4-CLI.md):
 *   1. Google Cloud Console → enable "Google Analytics Data API"
 *   2. Service account → download JSON key (dùng lại được key GSC/Indexing đang có)
 *   3. GA4 Admin → Property Access Management → add email service account, quyền Viewer
 *   4. Đặt env: GA4_PROPERTY_ID + GA4_SERVICE_ACCOUNT_JSON (raw JSON hoặc base64)
 *      — hoặc chạy kèm: --sa <đường-dẫn-file.json> --property <id>
 *
 * Dùng:
 *   node scripts/ga4.mjs overview                      # tổng quan 28 ngày
 *   node scripts/ga4.mjs traffic --from 30daysAgo      # nguồn/kênh traffic
 *   node scripts/ga4.mjs pages --limit 30              # trang hút khách nhất
 *   node scripts/ga4.mjs landing                       # trang đáp (landing page)
 *   node scripts/ga4.mjs daily                         # theo ngày
 *   node scripts/ga4.mjs events                        # sự kiện
 *   node scripts/ga4.mjs devices | countries | realtime
 *   node scripts/ga4.mjs report --dimensions date,sessionSource --metrics sessions,newUsers
 *   node scripts/ga4.mjs report ... --filter "sessionSource=~google" --order -sessions
 *   node scripts/ga4.mjs metadata                      # liệt kê dimension/metric có sẵn
 *   thêm --json để lấy JSON thô, --from/--to nhận YYYY-MM-DD | NdaysAgo | today | yesterday
 */

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

// GA4_API_BASE chỉ để test cục bộ (trỏ vào stub) — chạy thật luôn dùng mặc định.
const DATA_API = process.env.GA4_API_BASE || 'https://analyticsdata.googleapis.com/v1beta';

// ─── Args ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'overview';
const getArg = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const hasFlag = (name) => argv.includes(`--${name}`);

const FROM = getArg('from', '28daysAgo');
const TO = getArg('to', 'today');
const LIMIT = Number(getArg('limit', '25')) || 25;
const AS_JSON = hasFlag('json');

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

// ─── Auth (service-account JWT tự ký → OAuth token) ───────────────────────────

function loadServiceAccount() {
  const file = getArg('sa') || process.env.GA4_SERVICE_ACCOUNT_FILE;
  if (file) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      die(`❌ Không đọc được file service account "${file}": ${e.message}`);
    }
  }
  let raw = process.env.GA4_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  raw = raw.trim();
  if (!raw.startsWith('{')) {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      /* để JSON.parse bên dưới báo lỗi */
    }
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    die(`❌ GA4_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ: ${e.message}`);
  }
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  // Key dán qua env hay bị nuốt xuống dòng thật → trả lại \n cho OpenSSL.
  const key = String(sa.private_key || '').replace(/\\n/g, '\n');
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const jwt = `${unsigned}.${base64url(signer.sign(key))}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    die(`❌ Lấy access token thất bại (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ─── Gọi API ──────────────────────────────────────────────────────────────────

async function callApi(path, token, body) {
  const res = await fetch(`${DATA_API}/properties/${PROPERTY}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    if (res.status === 403) {
      die(
        `❌ 403 — service account chưa có quyền đọc property ${PROPERTY}.\n` +
          `   Vào GA4 Admin → Property Access Management → thêm email service account với quyền Viewer.\n   ${msg}`
      );
    }
    die(`❌ GA4 API lỗi ${res.status}: ${msg}`);
  }
  return data;
}

// ─── Preset ───────────────────────────────────────────────────────────────────
// Mỗi preset chỉ là bộ dimensions/metrics dựng sẵn cho câu hỏi hay gặp; bất cứ
// thứ gì ngoài danh sách này dùng `report` với --dimensions/--metrics.

const PRESETS = {
  overview: {
    desc: 'Tổng quan lưu lượng',
    dimensions: [],
    metrics: [
      'sessions',
      'totalUsers',
      'newUsers',
      'screenPageViews',
      'engagementRate',
      'averageSessionDuration',
    ],
  },
  daily: {
    desc: 'Theo ngày',
    dimensions: ['date'],
    metrics: ['sessions', 'totalUsers', 'newUsers', 'screenPageViews'],
    order: 'date',
    limit: 90,
  },
  traffic: {
    desc: 'Nguồn / kênh traffic',
    dimensions: ['sessionSource', 'sessionMedium'],
    metrics: ['sessions', 'totalUsers', 'newUsers', 'engagementRate'],
  },
  channels: {
    desc: 'Nhóm kênh mặc định',
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: ['sessions', 'totalUsers', 'newUsers', 'engagementRate'],
  },
  campaigns: {
    desc: 'Chiến dịch UTM',
    dimensions: ['sessionCampaignName', 'sessionSource', 'sessionMedium'],
    metrics: ['sessions', 'totalUsers', 'newUsers'],
  },
  pages: {
    desc: 'Trang xem nhiều nhất',
    dimensions: ['pagePath'],
    metrics: ['screenPageViews', 'totalUsers', 'userEngagementDuration'],
    order: '-screenPageViews',
  },
  landing: {
    desc: 'Trang đáp (landing page)',
    dimensions: ['landingPage'],
    metrics: ['sessions', 'newUsers', 'engagementRate', 'bounceRate'],
  },
  events: {
    desc: 'Sự kiện',
    dimensions: ['eventName'],
    metrics: ['eventCount', 'totalUsers'],
    order: '-eventCount',
  },
  devices: {
    desc: 'Thiết bị',
    dimensions: ['deviceCategory', 'operatingSystem'],
    metrics: ['sessions', 'totalUsers', 'engagementRate'],
  },
  countries: {
    desc: 'Quốc gia / thành phố',
    dimensions: ['country', 'city'],
    metrics: ['sessions', 'totalUsers'],
  },
  referrers: {
    desc: 'Trang giới thiệu (referrer)',
    dimensions: ['pageReferrer'],
    metrics: ['sessions', 'totalUsers'],
  },
  realtime: {
    desc: 'Thời gian thực (30 phút gần nhất)',
    realtime: true,
    dimensions: ['unifiedScreenName'],
    metrics: ['activeUsers'],
  },
};

// ─── Dựng request ─────────────────────────────────────────────────────────────

function parseFilters(spec) {
  // "sessionSource=~google,deviceCategory==mobile" → andGroup của stringFilter
  const exprs = spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([\w.]+)\s*(==|=~|!=)\s*(.+)$/);
      if (!m)
        die(
          `❌ --filter sai cú pháp ở "${part}". Dùng dạng dimension==giá-trị hoặc dimension=~chứa-chuỗi.`
        );
      const [, field, op, value] = m;
      const filter = {
        fieldName: field,
        stringFilter: {
          matchType: op === '=~' ? 'CONTAINS' : 'EXACT',
          value,
          caseSensitive: false,
        },
      };
      return op === '!=' ? { notExpression: { filter } } : { filter };
    });
  // GA4 cho phép lọc theo dimension KHÔNG nằm trong request → không kiểm chéo với
  // --dimensions, cứ dựng thẳng expression.
  if (!exprs.length) die('❌ --filter rỗng.');
  return exprs.length === 1 ? exprs[0] : { andGroup: { expressions: exprs } };
}

function buildBody(preset) {
  const dimensions = (getArg('dimensions') || preset.dimensions.join(','))
    .split(',')
    .filter(Boolean);
  const metrics = (getArg('metrics') || preset.metrics.join(',')).split(',').filter(Boolean);
  if (!metrics.length) die('❌ Cần ít nhất 1 metric (--metrics sessions,totalUsers).');

  const body = {
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit: Number(getArg('limit', preset.limit || LIMIT)) || LIMIT,
  };
  if (!preset.realtime) body.dateRanges = [{ startDate: FROM, endDate: TO }];

  const order = getArg('order', preset.order || (dimensions.length ? `-${metrics[0]}` : null));
  if (order) {
    const desc = order.startsWith('-');
    const field = desc ? order.slice(1) : order;
    body.orderBys = [
      metrics.includes(field)
        ? { metric: { metricName: field }, desc }
        : { dimension: { dimensionName: field }, desc },
    ];
  }

  const filter = getArg('filter');
  if (filter) body.dimensionFilter = parseFilters(filter);

  return body;
}

// ─── In ra ────────────────────────────────────────────────────────────────────

function fmtNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Number.isInteger(n)) return n.toLocaleString('vi-VN');
  return n.toFixed(2);
}

function printTable(resp) {
  const dimHeaders = (resp.dimensionHeaders || []).map((h) => h.name);
  const metHeaders = (resp.metricHeaders || []).map((h) => h.name);
  const headers = [...dimHeaders, ...metHeaders];
  const rows = (resp.rows || []).map((r) => [
    ...(r.dimensionValues || []).map((d) => d.value ?? ''),
    ...(r.metricValues || []).map((m) => fmtNum(m.value)),
  ]);

  if (!rows.length) {
    console.log('(không có dữ liệu trong khoảng này)');
    return;
  }

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length))
  );
  const line = (cells) =>
    cells
      .map((c, i) => {
        const s = String(c ?? '');
        // Cột dimension canh trái, cột metric canh phải cho dễ so số.
        return i < dimHeaders.length ? s.padEnd(widths[i]) : s.padStart(widths[i]);
      })
      .join('  ');

  console.log(line(headers));
  console.log(widths.map((w) => '─'.repeat(w)).join('  '));
  rows.forEach((r) => console.log(line(r)));

  const totals = resp.totals?.[0]?.metricValues;
  if (totals && rows.length > 1) {
    console.log(widths.map((w) => '─'.repeat(w)).join('  '));
    console.log(
      line([
        ...dimHeaders.map((_, i) => (i === 0 ? 'TỔNG' : '')),
        ...totals.map((m) => fmtNum(m.value)),
      ])
    );
  }
  if (resp.rowCount != null && resp.rowCount > rows.length) {
    console.log(`\n… hiển thị ${rows.length}/${resp.rowCount} dòng (tăng --limit để xem thêm)`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const sa = loadServiceAccount();
const PROPERTY = getArg('property') || process.env.GA4_PROPERTY_ID;

if (cmd === 'help' || hasFlag('help')) {
  console.log(
    readFileSync(new URL(import.meta.url), 'utf8')
      .split('*/')[0]
      .replace(/^\/\*\*?|^ \* ?/gm, '')
  );
  console.log('Preset có sẵn:');
  Object.entries(PRESETS).forEach(([k, v]) => console.log(`  ${k.padEnd(12)} ${v.desc}`));
  process.exit(0);
}

if (!sa) {
  die(
    '❌ Chưa có credential GA4.\n' +
      '   Cách 1: đặt env GA4_SERVICE_ACCOUNT_JSON (nội dung file JSON key, raw hoặc base64)\n' +
      '   Cách 2: chạy kèm --sa <đường-dẫn-file-key.json>\n' +
      '   Xem docs/GA4-CLI.md để biết cách tạo key + cấp quyền.'
  );
}
if (!PROPERTY) {
  die(
    '❌ Thiếu property id. Đặt env GA4_PROPERTY_ID (vd 533053153) hoặc chạy kèm --property 533053153.'
  );
}

const token = await accessToken(sa);

if (cmd === 'metadata') {
  const meta = await callApi('/metadata', token);
  if (AS_JSON) {
    console.log(JSON.stringify(meta, null, 2));
  } else {
    const q = (getArg('q') || '').toLowerCase();
    const pick = (arr) =>
      (arr || [])
        .filter((x) => !q || `${x.apiName} ${x.uiName}`.toLowerCase().includes(q))
        .map((x) => `  ${x.apiName.padEnd(34)} ${x.uiName}`);
    console.log(`DIMENSIONS (${PROPERTY})`);
    console.log(pick(meta.dimensions).join('\n'));
    console.log(`\nMETRICS (${PROPERTY})`);
    console.log(pick(meta.metrics).join('\n'));
  }
  process.exit(0);
}

const preset =
  PRESETS[cmd] ||
  (cmd === 'report' ? { dimensions: [], metrics: [], desc: 'Báo cáo tự chọn' } : null);
if (!preset) {
  die(`❌ Không biết lệnh "${cmd}". Chạy \`node scripts/ga4.mjs help\` để xem danh sách.`);
}

const body = buildBody(preset);
const resp = await callApi(preset.realtime ? ':runRealtimeReport' : ':runReport', token, body);

if (AS_JSON) {
  console.log(JSON.stringify(resp, null, 2));
} else {
  const range = preset.realtime ? '30 phút gần nhất' : `${FROM} → ${TO}`;
  console.log(`\n📊 ${preset.desc} · property ${PROPERTY} · ${range}\n`);
  printTable(resp);
  console.log('');
}
