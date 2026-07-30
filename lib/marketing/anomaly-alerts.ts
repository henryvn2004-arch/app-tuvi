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
  dauDropPct: number; // DAU hôm nay thấp hơn MEDIAN 7 ngày trước bao nhiêu % thì cảnh báo
  dauMinBaseline: number; // baseline dưới mức này thì bỏ qua — mẫu quá nhỏ, ±50% là nhiễu
  dauMinBaselineDays: number; // cần bấy nhiêu ngày ĐÃ ĐO ĐƯỢC bot mới dám so
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
  // 30% là quá nhạy cho cỡ mẫu này. Chuỗi DAU 8 ngày đo được (21·123·64·86·98·
  // 111·74·47) dao động ±50% giữa hai ngày liền kề mà không có sự cố nào —
  // ngưỡng 30% nghĩa là kêu gần như mỗi ngày, và một bộ dò kêu mỗi ngày thì
  // chẳng mấy chốc bị ngó lơ, hỏng y như khi nó im lặng.
  dauDropPct: 40,
  dauMinBaseline: 20,
  dauMinBaselineDays: 5,
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

/**
 * MEDIAN thay trung bình cộng — để một ngày dị thường chỉ còn là một phiếu.
 * (23/07 phồng lên 123 uniq / 1.233 page_view vì Playwright còn chạy E2E thẳng
 * vào prod, 407 `topup_start` từ đúng 1 anon_id.)
 *
 * ⚠️ ĐO RỒI MỚI BIẾT: median MỘT MÌNH KHÔNG dập được ca 29/07. Với đúng chuỗi
 * baseline của prod [21·123·64·86·98·111·74] và hôm nay 47:
 *     trung bình cộng = 82,4 → đọc thành sụt 43%
 *     median          = 86   → đọc thành sụt 45%   ← NẶNG HƠN
 * Vì ngày 21 (ngày bật tracking, chỉ có dữ liệu nửa ngày) kéo TB xuống, còn
 * median thì đứng yên ở giữa. Đổi sang median là đúng về nguyên tắc nhưng KHÔNG
 * phải thứ chặn được cảnh báo giả này — đừng đọc lại chỗ này rồi tưởng đã xong.
 * Cửa chặn thật là `belowWindowMin` bên dưới.
 */
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

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

  // ── Job quá hạn / skip liên tiếp + env bắt buộc thiếu (track COO, S4) ────
  // Ba loại hỏng ÂM THẦM — không sinh ra dòng lỗi nào nên mọi dashboard vẫn
  // xanh. Đây đúng là bộ ba đã để CMO Digest chết 14 ngày mà không ai biết.
  checked.push('job_health', 'env_preflight');
  try {
    const { evaluateJobs, fetchPgcronRuns } = await import('@/lib/ops/jobs');
    const { missingCriticalEnv } = await import('@/lib/ops/preflight');

    const runsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cron_runs?select=job_key,status,started_at,note` +
        `&order=started_at.desc&limit=300`,
      { headers: SB_HEADERS },
    );
    if (runsRes.ok) {
      // Gộp cả lịch sử pg_cron: job `auto-pipeline` không đi qua withCronLog nên
      // vắng mặt hoàn toàn trong cron_runs, chỉ dựa vào đó thì nó "chưa hề chạy"
      // vĩnh viễn và bắn cảnh báo sai mỗi ngày.
      const allRuns = [...(await runsRes.json()), ...(await fetchPgcronRuns())];
      for (const j of evaluateJobs(allRuns)) {
        // Lượt chạy bị GIẾT NGANG: dòng nhịp tim `running` còn treo quá lâu
        // (lib/cron/log.ts). Trước bản này, ca đó không để lại dòng nào trong
        // cron_runs nên nó đội lốt "QUÁ HẠN" — hai lượt 500 thật ngày 29/07
        // (anomaly-alerts 09:00Z, cron-master-write 10:00Z) đúng là ca này.
        // Phân biệt được mới chẩn đúng: trượt lịch là việc của nhà cung cấp,
        // chết giữa lượt là việc của mình.
        if (j.stuck && !inCooldown(`job_stuck:${j.key}`)) {
          fired.push({
            key: `job_stuck:${j.key}`,
            text:
              `Job "${j.label}" CHẾT GIỮA LƯỢT — bắt đầu ${Math.round((Date.now() - new Date(j.lastRun!).getTime()) / 60000)} phút trước ` +
              `mà chưa chốt (hết maxDuration / hết bộ nhớ / nền tảng 500). Soi runtime log Vercel quanh mốc đó.`,
          });
        }
        // Lượt gần nhất kết thúc bằng lỗi. Đây từng là lỗ IM LẶNG HOÀN TOÀN:
        // job bắn đúng lịch mà lượt nào cũng `error` thì `overdue` không kêu
        // (có log mới) và `skipStreak` cũng không (error ≠ skip).
        if (j.failing && !inCooldown(`job_failed:${j.key}`)) {
          fired.push({
            key: `job_failed:${j.key}`,
            text: `Job "${j.label}" lượt gần nhất LỖI — lịch ${j.schedule}`,
          });
        }
        // `!j.stuck`: một lượt treo quá 1.5× chu kỳ sẽ thoả CẢ HAI điều kiện.
        // Bắn hai tin cho cùng một sự cố là cách nhanh nhất làm người ta mất
        // tin vào bộ dò. `stuck` cụ thể hơn nên nó thắng.
        if (j.overdue && !j.stuck && !inCooldown(`job_overdue:${j.key}`)) {
          fired.push({
            key: `job_overdue:${j.key}`,
            text: j.lastRun
              ? `Job "${j.label}" QUÁ HẠN — lịch ${j.schedule}, lần chạy cuối cách đây ${Math.round((Date.now() - new Date(j.lastRun).getTime()) / 3600000)} giờ`
              : `Job "${j.label}" CHƯA HỀ có lượt chạy nào được ghi log — lịch ${j.schedule}`,
          });
        }
        // 3 lượt skip liên tiếp = job đang không làm được việc, chỉ im lặng
        // thay vì báo lỗi. `skip` KHÔNG phải trạng thái bình thường.
        if (j.skipStreak >= 3 && !inCooldown(`job_skip:${j.key}`)) {
          fired.push({
            key: `job_skip:${j.key}`,
            text: `Job "${j.label}" đã SKIP ${j.skipStreak} lượt liên tiếp — chạy đều nhưng không làm được việc gì`,
          });
        }
      }
    }

    const missing = missingCriticalEnv();
    if (missing.length && !inCooldown('env_missing')) {
      fired.push({
        key: 'env_missing',
        text:
          `Thiếu ${missing.length} biến môi trường BẮT BUỘC:\n` +
          missing.map((e) => `   ↳ ${e.key} — ${e.feature}`).join('\n'),
      });
    }
  } catch {
    /* không để phần này làm hỏng các check khác */
  }

  // ── Bảo mật & lạm dụng (track COO, S6) ──────────────────────────────────
  // Đây là hàng phòng thủ THẬT cho lớp quyền RPC, không phải thứ trang trí:
  // thực nghiệm trong migration-revoke-secdef-sweep.sql cho thấy KHÔNG chặn
  // được hở-mặc-định ở tầng Postgres (quyền EXECUTE cho PUBLIC là dựng sẵn,
  // ALTER DEFAULT PRIVILEGES không gỡ nổi). Nên mỗi migration tương lai vẫn có
  // thể vô tình đẻ ra một hàm hở, và cách duy nhất còn lại là đo lại đều đặn.
  checked.push('security_audit');
  try {
    const audit = await callRpc<{
      ham_ho_cho_anon: string[];
      bom_su_kien: { anon_id: string; events_24h: number }[];
      thiet_bi_cay: { anon_id: string; so_tai_khoan: number }[];
      referral_bat_thuong: { referrer: string; so_nguoi_7d: number }[];
      lech_so_du: { user_id: string; so_du: number; tong_so: number }[];
    }>('security_audit', {});

    if (audit.ham_ho_cho_anon?.length && !inCooldown('sec_exposed_fn')) {
      fired.push({
        key: 'sec_exposed_fn',
        text:
          `🔓 ${audit.ham_ho_cho_anon.length} hàm SECURITY DEFINER đang cho anon gọi ` +
          `(tức ai mở trang web cũng gọi được):\n` +
          audit.ham_ho_cho_anon.map((f) => `   ↳ ${f}`).join('\n') +
          `\n   Vá: revoke execute on function <tên> from public, anon, authenticated;`,
      });
    }

    // Lệch số dư = tiền tự sinh ra mà không có dòng giao dịch nào giải thích.
    // Đúng dấu vết của loại lỗ đã vá ở S0. Không có ngưỡng — một dòng cũng phải báo.
    if (audit.lech_so_du?.length && !inCooldown('sec_credit_drift')) {
      fired.push({
        key: 'sec_credit_drift',
        text:
          `🚨 ${audit.lech_so_du.length} ví có số dư LỆCH khỏi sổ giao dịch — điều tra ngay:\n` +
          audit.lech_so_du
            .slice(0, 5)
            .map((d) => `   ↳ ${d.user_id}: số dư ${d.so_du} vs sổ ${d.tong_so}`)
            .join('\n'),
      });
    }

    if (audit.bom_su_kien?.length && !inCooldown('sec_track_flood')) {
      fired.push({
        key: 'sec_track_flood',
        text:
          `${audit.bom_su_kien.length} nguồn bơm sự kiện bất thường vào /api/track ` +
          `(số liệu này nuôi autopilot M0.6):\n` +
          audit.bom_su_kien.slice(0, 5).map((f) => `   ↳ ${f.anon_id}: ${f.events_24h} event/24h`).join('\n'),
      });
    }

    if (audit.thiet_bi_cay?.length && !inCooldown('sec_device_farm')) {
      fired.push({
        key: 'sec_device_farm',
        text:
          `${audit.thiet_bi_cay.length} thiết bị gắn nhiều tài khoản — nghi cày quà đăng ký:\n` +
          audit.thiet_bi_cay.slice(0, 5).map((d) => `   ↳ ${d.anon_id}: ${d.so_tai_khoan} tài khoản`).join('\n'),
      });
    }

    if (audit.referral_bat_thuong?.length && !inCooldown('sec_referral')) {
      fired.push({
        key: 'sec_referral',
        text:
          `${audit.referral_bat_thuong.length} người giới thiệu có lượt mời tăng vọt trong 7 ngày:\n` +
          audit.referral_bat_thuong
            .slice(0, 5)
            .map((r) => `   ↳ ${r.referrer}: ${r.so_nguoi_7d} người`)
            .join('\n'),
      });
    }
  } catch {
    /* không để phần này làm hỏng các check khác */
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
    checked.push('revenue_drop');

    // ── DAU sụt — đếm NGƯỜI THẬT, so bằng median, có sàn mẫu ──────────────
    //
    // Bản trước so `dashboard_engagement.dau_today` (đếm cả bot) với TRUNG BÌNH
    // CỘNG 7 ngày trước (gồm mấy ngày CI bơm số). Cả ba vế đều mục — xem
    // _patches/migration-dau-human.sql để có số đo.
    //
    // ⚠️ CỬA CHẶN QUAN TRỌNG NHẤT ở đây là `bot_flag_since`. Cột `is_bot` mới có
    // dữ liệu thật từ 18:39 giờ VN 29/07, nên nếu đem DAU-người của hôm nay so
    // với những ngày CHƯA lọc bot thì mẫu số bị thổi lên ~20% một phía và cảnh
    // báo sẽ kêu MẠNH HƠN trước chứ không phải bớt đi. Chưa đủ ngày đã đo thì
    // THÀ IM: một cảnh báo mà mình biết chắc là so sai thì không có giá trị nào.
    const botFlagSince = await getConfig<string>('ops.bot_flag_since', '');
    const eng = await callRpc<{ days: { day: string; dau_all: number; dau_human: number }[] }>(
      'dau_human_daily',
      { p_days: 8 },
    );
    const today = eng.days[eng.days.length - 1];
    // So chuỗi 'YYYY-MM-DD' — cùng định dạng nên so từ điển là so ngày.
    const usable = eng.days.slice(0, -1).filter((d) => !botFlagSince || d.day >= botFlagSince);

    if (!today) {
      checked.push('dau_drop(bỏ qua: RPC không trả ngày nào)');
    } else if (usable.length < th.dauMinBaselineDays) {
      checked.push(
        `dau_drop(bỏ qua: chỉ có ${usable.length}/${th.dauMinBaselineDays} ngày đã đo được bot, từ ${botFlagSince || '?'})`,
      );
    } else {
      const baseline = median(usable.map((d) => d.dau_human));
      if (baseline < th.dauMinBaseline) {
        checked.push(`dau_drop(bỏ qua: baseline ${baseline} < sàn ${th.dauMinBaseline} — mẫu quá nhỏ)`);
      } else {
        checked.push('dau_drop');
        const dropPct = ((baseline - today.dau_human) / baseline) * 100;
        // ĐIỀU KIỆN THỨ HAI, và là cửa chặn thật sự: hôm nay phải thấp hơn CẢ
        // NGÀY THẤP NHẤT trong cửa sổ.
        //
        // Lý do đến từ số đo, không phải từ lý thuyết: chuỗi baseline thật
        // [21·123·64·86·98·111·74] đã tự dao động từ 21 tới 123 mà không có sự
        // cố nào. Báo động cho con số 47 trong khi chuỗi đó từng xuống 21 là
        // báo sai theo đúng định nghĩa — 47 nằm gọn trong khoảng đã thấy. Chỉ
        // khi hôm nay xuyên qua đáy của cửa sổ thì "sụt" mới là một điều mới.
        //
        // Với 7 ngày baseline, ngưỡng này tương đương ~1/8 khả năng kêu do nhiễu
        // thuần — đủ chặt để tin, đủ lỏng để một sự cố thật không lọt.
        const windowMin = Math.min(...usable.map((d) => d.dau_human));
        const belowWindowMin = today.dau_human < windowMin;
        const key = 'dau_drop';
        if (dropPct >= th.dauDropPct && belowWindowMin && !inCooldown(key)) {
          const botsToday = today.dau_all - today.dau_human;
          fired.push({
            key,
            // Nói rõ "người thật" ngay trong câu: panel DAU/WAU/MAU của admin
            // vẫn đếm cả bot (cố ý, xem migration), nên không ghi rõ thì đọc
            // chéo hai bên sẽ tưởng một trong hai đang sai.
            text:
              `DAU người thật hôm nay ${today.dau_human}, thấp hơn median ${usable.length} ngày trước ` +
              `(${baseline}) ${dropPct.toFixed(0)}% VÀ thấp hơn cả ngày thấp nhất trong cửa sổ (${windowMin})` +
              (botsToday > 0 ? ` — đã loại ${botsToday} nguồn bot khỏi con số hôm nay` : ''),
          });
        } else if (dropPct >= th.dauDropPct) {
          // Vượt ngưỡng % nhưng vẫn nằm trong khoảng đã thấy. Ghi lại để lần sau
          // đọc log biết cửa chặn đã làm việc, chứ không phải check bị tắt.
          checked.push(
            `dau_drop(nén: sụt ${dropPct.toFixed(0)}% nhưng ${today.dau_human} chưa dưới đáy cửa sổ ${windowMin})`,
          );
        }
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

  // CỐ Ý KHÔNG đóng dấu cooldown ở đây — xem commitAnomalyCooldown() bên dưới.
  return { fired, checked };
}

/**
 * Đóng dấu cooldown cho các cảnh báo ĐÃ ĐẨY ĐI THÀNH CÔNG.
 *
 * Tách khỏi checkAnomalies() sau khi dính đúng cái bẫy mà cả track COO đi vá:
 * bản trước đóng dấu ngay trong hàm PHÁT HIỆN, nên một lượt chạy lúc chưa có
 * ADMIN_TELEGRAM_CHAT_ID vẫn ghi "đã báo" cho 2 cảnh báo nó không gửi được cho
 * ai — bịt miệng chúng trọn 20 giờ sau đó, kể cả khi Telegram đã thông. Cảnh
 * báo bị nuốt trông y hệt cảnh báo không tồn tại.
 *
 * Cooldown sinh ra để khỏi làm phiền người nhận cùng một chuyện nhiều lần, nên
 * mốc đúng của nó là lúc người nhận THẬT SỰ nhận được. Chưa đẩy được thì lượt
 * sau (3 giờ nữa) phải thử lại — cảnh báo chưa tới tai ai thì phải còn ồn.
 *
 * Đọc lại config ngay trước khi ghi thay vì dùng bản đã đọc đầu lượt: giữa hai
 * mốc đó là toàn bộ phần gọi RPC + gửi Telegram, đủ lâu để một lượt cron khác
 * xen vào, và ghi đè bằng bản cũ sẽ xoá mất dấu vừa đóng của nó.
 */
export async function commitAnomalyCooldown(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const current = await getConfig<Record<string, string>>('marketing.anomaly_last_fired', {});
  const stamp = new Date().toISOString();
  const updated = { ...current };
  for (const k of keys) updated[k] = stamp;
  await setConfig('marketing.anomaly_last_fired', updated);
}
