// lib/marketing/anomaly-alerts.ts
// ============================================================
// M0.3 (track Marketing Autopilot) — cảnh báo bất thường READ-ONLY: so số
// hiện tại với ngưỡng/baseline, bắn Telegram admin NGAY khi vượt (không đợi
// CMO Digest 1 lần/ngày, xem lib/marketing/cmo-digest.ts). Đọc lại CHÍNH các
// RPC marketing/dashboard đã có — không thêm RPC mới. Ngưỡng + trạng thái
// "đã báo lần cuối" lưu trong app_config (key marketing.anomaly_thresholds /
// marketing.anomaly_last_fired) — chỉnh không cần deploy, cooldown mỗi loại
// cảnh báo tránh spam lặp.
// Gọi bởi app/api/cron/anomaly-alerts/route.ts (Vercel cron, mỗi 3 giờ).
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function callRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`${fn}: ${await res.text()}`);
  return res.json();
}

async function getConfig<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: SB_HEADERS,
    });
    if (!res.ok) return fallback;
    const rows = await res.json();
    return rows?.[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

async function setConfig(key: string, value: unknown): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/app_config`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, value }),
    });
  } catch {
    /* best-effort — không chặn cron */
  }
}

interface Thresholds {
  channelErrorPct: number; // % lỗi 24h/kênh vượt thì cảnh báo (khớp ngưỡng "đỏ" trên card Sức Khỏe Kênh)
  channelMinSample: number; // tối thiểu số lượt trong 24h mới xét (né noise mẫu nhỏ)
  marginFloorVnd: number; // chỉ xét margin âm khi doanh thu chat trong ngày đủ lớn
  dauDropPct: number; // DAU hôm nay thấp hơn TB 7 ngày trước bao nhiêu % thì cảnh báo
  revenueDropPct: number; // doanh thu hôm nay thấp hơn TB/ngày 7 ngày trước bao nhiêu % thì cảnh báo
  cooldownHours: number; // tối thiểu giữa 2 lần cảnh báo CÙNG loại
  dayCheckHourVn: number; // giờ VN (24h) bắt đầu xét DAU/doanh thu sụt — đợi dữ liệu trong ngày tích đủ
  toolErrorPct: number; // % lỗi HỆ THỐNG 24h/tool vượt thì cảnh báo (khớp ngưỡng đỏ panel Sức Khỏe Tool)
  toolMinSample: number; // tối thiểu số lượt "lẽ ra phải chạy được" trong 24h mới xét
  toolHardFailSample: number; // tool hỏng SẠCH (100%) thì chỉ cần chừng này lượt là báo ngay
}

const THRESHOLD_DEFAULTS: Thresholds = {
  channelErrorPct: 8,
  channelMinSample: 20,
  marginFloorVnd: 50_000,
  dauDropPct: 30,
  revenueDropPct: 40,
  cooldownHours: 20,
  dayCheckHourVn: 20,
  toolErrorPct: 8,
  toolMinSample: 10,
  // Mẫu nhỏ hơn hẳn cho ca hỏng SẠCH: tool trả phí ít lượt (vd Chân Dung Tiền
  // Kiếp) có thể cả ngày chỉ vài lượt, đợi đủ 10 mẫu mới báo thì người thứ 3-4
  // đã mất tiền rồi. Hỏng 3/3 lượt gần như chắc chắn là hỏng thật, không phải noise.
  toolHardFailSample: 3,
};

function vnHourNow(): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(new Date()),
  );
}

// 00:00 giờ VN hôm nay, biểu diễn đúng dưới dạng Date UTC (VN = UTC+7 cố định, không DST).
function vnTodayStart(): Date {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 7 * 3600 * 1000);
}

interface FiredAlert {
  key: string;
  text: string;
}

export async function checkAnomalies(): Promise<{ fired: FiredAlert[]; checked: string[] }> {
  const th: Thresholds = {
    ...THRESHOLD_DEFAULTS,
    ...(await getConfig<Partial<Thresholds>>('marketing.anomaly_thresholds', {})),
  };
  const lastFired = await getConfig<Record<string, string>>('marketing.anomaly_last_fired', {});
  const now = Date.now();
  const cooldownMs = th.cooldownHours * 3600 * 1000;
  const inCooldown = (key: string) => {
    const t = lastFired[key];
    return t ? now - new Date(t).getTime() < cooldownMs : false;
  };

  const fired: FiredAlert[] = [];
  const checked: string[] = [];
  const todayStart = vnTodayStart();

  // ── Sức khỏe kênh chat — ratio 24h, không phụ thuộc giờ trong ngày ──
  checked.push('channel_error_rate');
  const channels = await callRpc<{ platform: string; total: number; errors: number; error_rate: number }[]>(
    'channel_error_rate',
    { p_hours: 24 },
  );
  for (const c of channels) {
    const key = `channel_error:${c.platform}`;
    if (c.total >= th.channelMinSample && c.error_rate > th.channelErrorPct && !inCooldown(key)) {
      fired.push({
        key,
        text: `Kênh ${c.platform}: lỗi ${c.error_rate}% (${c.errors}/${c.total} lượt, 24h qua) — vượt ngưỡng ${th.channelErrorPct}%`,
      });
    }
  }

  // ── Sức khỏe TOOL (track COO, S2) — canh trên lưu lượng THẬT ───────────
  // Đọc RPC tool_health, tức chính số nuôi panel "Sức Khỏe Tool" trong admin →
  // cảnh báo và bảng KHÔNG BAO GIỜ lệch nhau. Không dựng hệ cảnh báo thứ hai:
  // dùng lại nguyên ngưỡng/cooldown/đường gửi của M0.3.
  //
  // `attempts` đã loại lỗi người dùng (thiếu ngày sinh, chưa đăng nhập, chưa
  // thanh toán) khỏi cả tử số lẫn mẫu số — xem _patches/migration-tool-health.sql.
  //
  // ĐÁNH ĐỔI ĐÃ BIẾT: cách này bắt được mọi tool CÓ người dùng, nhưng phải có
  // user dính lỗi trước. Tool ít/không có lượt thì ở đây mù — đó là phần việc
  // của canary (chạy thử chủ động), làm sau vì tốn tiền thật mỗi lượt.
  checked.push('tool_health');
  const tools = await callRpc<
    { tool_id: string; attempts: number; errors: number; error_rate: number; last_error: string | null }[]
  >('tool_health', { p_hours: 24 });
  for (const t of tools) {
    if (!t.errors) continue;
    const hardFail = t.errors === t.attempts && t.attempts >= th.toolHardFailSample;
    const rateBreach = t.attempts >= th.toolMinSample && t.error_rate > th.toolErrorPct;
    const key = `tool_error:${t.tool_id}`;
    if (!(hardFail || rateBreach) || inCooldown(key)) continue;
    fired.push({
      key,
      text:
        `Tool ${t.tool_id}: ${hardFail ? 'HỎNG SẠCH' : 'lỗi'} ${t.error_rate}% ` +
        `(${t.errors}/${t.attempts} lượt, 24h qua)` +
        (t.last_error ? `\n   ↳ ${t.last_error}` : ''),
    });
  }

  // ── Biên lợi nhuận chat âm (từ đầu ngày VN tới giờ) ──
  checked.push('margin');
  const margin = await callRpc<{ chat_cost_vnd: number; chat_revenue_vnd: number }>('dashboard_margin', {
    p_from: todayStart.toISOString(),
    p_to: new Date().toISOString(),
  });
  if (margin.chat_revenue_vnd >= th.marginFloorVnd) {
    const marginVnd = margin.chat_revenue_vnd - margin.chat_cost_vnd;
    const marginPct = margin.chat_revenue_vnd > 0 ? (marginVnd / margin.chat_revenue_vnd) * 100 : 0;
    const key = 'margin_negative';
    if (marginVnd < 0 && !inCooldown(key)) {
      fired.push({
        key,
        text: `Biên LN chat ÂM hôm nay: doanh thu ${margin.chat_revenue_vnd.toLocaleString('vi-VN')}đ, chi phí ${margin.chat_cost_vnd.toLocaleString('vi-VN')}đ (${marginPct.toFixed(0)}%)`,
      });
    }
  }

  // ── DAU/doanh thu sụt so với baseline — chỉ xét sau dayCheckHourVn giờ VN,
  // tránh báo giả lúc đầu ngày khi dữ liệu trong ngày chưa tích đủ ──
  if (vnHourNow() >= th.dayCheckHourVn) {
    checked.push('dau_drop', 'revenue_drop');

    const engagement = await callRpc<{ days: { day: string; dau: number }[]; dau_today: number }>(
      'dashboard_engagement',
      { p_days: 8 },
    );
    const baselineDays = engagement.days.slice(0, -1).map((d) => d.dau);
    const dauBaseline = baselineDays.length ? baselineDays.reduce((a, b) => a + b, 0) / baselineDays.length : 0;
    if (dauBaseline >= 5) {
      const dropPct = ((dauBaseline - engagement.dau_today) / dauBaseline) * 100;
      const key = 'dau_drop';
      if (dropPct >= th.dauDropPct && !inCooldown(key)) {
        fired.push({
          key,
          text: `DAU hôm nay ${engagement.dau_today}, thấp hơn TB 7 ngày trước (${dauBaseline.toFixed(0)}) ${dropPct.toFixed(0)}%`,
        });
      }
    }

    const prevWeekStart = new Date(todayStart.getTime() - 7 * 864e5);
    const [revenueToday, revenuePrevWeek] = await Promise.all([
      callRpc<{ total_vnd: number }>('marketing_revenue', { p_from: todayStart.toISOString(), p_to: new Date().toISOString() }),
      callRpc<{ total_vnd: number }>('marketing_revenue', { p_from: prevWeekStart.toISOString(), p_to: todayStart.toISOString() }),
    ]);
    const revenueBaselinePerDay = revenuePrevWeek.total_vnd / 7;
    if (revenueBaselinePerDay >= 50_000) {
      const dropPct = ((revenueBaselinePerDay - revenueToday.total_vnd) / revenueBaselinePerDay) * 100;
      const key = 'revenue_drop';
      if (dropPct >= th.revenueDropPct && !inCooldown(key)) {
        fired.push({
          key,
          text: `Doanh thu hôm nay ${revenueToday.total_vnd.toLocaleString('vi-VN')}đ, thấp hơn TB/ngày 7 ngày trước (${Math.round(revenueBaselinePerDay).toLocaleString('vi-VN')}đ) ${dropPct.toFixed(0)}%`,
        });
      }
    }
  }

  if (fired.length) {
    const updated = { ...lastFired };
    for (const f of fired) updated[f.key] = new Date().toISOString();
    await setConfig('marketing.anomaly_last_fired', updated);
  }

  return { fired, checked };
}
