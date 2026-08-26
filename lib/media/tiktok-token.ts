// lib/media/tiktok-token.ts
// ============================================================
// TOKEN TIKTOK — đọc, làm mới, lưu lại.
//
// 🔴 VÌ SAO PHẢI CÓ MODULE RIÊNG, không bắt chước YouTube được:
// `edge-youtube-upload.deno.ts` giữ `YOUTUBE_REFRESH_TOKEN` trong env và dùng
// mãi một giá trị. TikTok thì **XOAY refresh token mỗi lượt làm mới** — lượt
// refresh trả về một `refresh_token` MỚI và vô hiệu hoá cái cũ. Nghĩa là:
//
//   · Để refresh token trong env là **hỏng sau đúng một lượt** — env không tự
//     ghi lại được, nên lượt sau gửi lên một chuỗi đã chết.
//   · Chỗ lưu phải GHI ĐƯỢC lúc chạy ⇒ `app_config` (đã có sẵn, service key
//     ghi được, RLS chỉ cho admin đọc — client không chạm tới).
//
// ⚠️ CHUỖI TOKEN ĐỨT LÀ ĐỨT HẲN. Làm mới xong mà không ghi lại được thì cái
// refresh token vừa dùng đã chết, cái mới thì không ai giữ ⇒ phải cấp lại bằng
// tay. Vì thế thứ tự bắt buộc là **GHI TRƯỚC, DÙNG SAU**, và ghi hỏng thì báo
// lỗi to chứ KHÔNG lặng lẽ dùng token trong bộ nhớ rồi để lần sau chết.
//
// 📄 Access token sống 24 giờ, refresh token 365 ngày.
// ============================================================

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const CONFIG_KEY = 'tiktok.token';

/** Làm mới sớm 30 phút — cron chạy thưa, đừng để token chết giữa một lượt đăng. */
const REFRESH_MARGIN_MS = 30 * 60 * 1000;

/** Còn dưới ngần này là kêu: refresh token sắp hết đời, phải cấp lại bằng tay. */
const REFRESH_TOKEN_WARN_MS = 14 * 24 * 60 * 60 * 1000;

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';

/**
 * Mồi ban đầu, DÙNG ĐÚNG MỘT LẦN. Khi `app_config` chưa có gì thì lấy chuỗi
 * này để làm mới lượt đầu, rồi cặp token mới ghi thẳng xuống DB và từ đó DB là
 * nguồn duy nhất. Sau lượt đó env này thành CHUỖI CHẾT — cứ để nguyên cũng
 * không sao (code không đọc tới khi DB đã có), nhưng đừng tưởng nó còn dùng được.
 */
const SEED_REFRESH = process.env.TIKTOK_REFRESH_TOKEN || '';

/**
 * Cửa thoát cho lượt thử TAY: khai thẳng access token vừa lấy từ trang OAuth
 * của TikTok. Có giá trị thì bỏ qua toàn bộ đường làm mới. Chỉ dùng để thử
 * adapter, KHÔNG dùng cho chạy tự động (24 giờ sau là chết).
 */
const MANUAL_TOKEN = process.env.TIKTOK_ACCESS_TOKEN || '';

interface StoredToken {
  access_token: string;
  refresh_token: string;
  /** Mốc hết hạn access token, epoch ms. */
  expires_at: number;
  /** Mốc hết hạn refresh token, epoch ms. */
  refresh_expires_at: number;
  updated_at: string;
}

export interface TokenOut {
  token?: string;
  error?: string;
  /** Cảnh báo không chặn — vd refresh token sắp hết đời. */
  warn?: string;
}

// Một tiến trình serverless đăng nhiều clip trong CÙNG một lượt `publishQueue`.
// Không khoá thì mỗi clip tự gọi làm mới, mà mỗi lượt làm mới lại XOAY refresh
// token ⇒ hai lượt song song tự giết nhau. Khoá bằng promise dùng chung.
let inFlight: Promise<TokenOut> | null = null;
let cached: StoredToken | null = null;

async function readStored(): Promise<StoredToken | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.${encodeURIComponent(CONFIG_KEY)}&select=value`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { value?: StoredToken }[];
    const v = rows?.[0]?.value;
    return v && v.refresh_token ? v : null;
  } catch {
    return null;
  }
}

/**
 * Ghi cặp token xuống `app_config`. Thử lại 2 lượt — đây là chỗ mà hỏng đồng
 * nghĩa với đứt chuỗi vĩnh viễn, đắt hơn hẳn một lượt mạng thừa.
 */
async function writeStored(v: StoredToken): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config?on_conflict=key`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify([{ key: CONFIG_KEY, value: v }]),
      });
      if (res.ok) return true;
    } catch {
      /* thử lại */
    }
    if (i < 2) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return false;
}

async function refresh(refreshToken: string): Promise<TokenOut> {
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    return { error: 'Thiếu env TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET' };
  }

  let res: Response | null = null;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      cache: 'no-store',
    });
  } catch (e) {
    return { error: `Không gọi được TikTok oauth: ${(e as Error).message}` };
  }

  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !body.access_token || !body.refresh_token) {
    const ma = body.error || String(res.status);
    const mo = body.error_description || '';
    // `invalid_grant` = refresh token đã chết (hết 365 ngày, hoặc đã bị xoay ở
    // một lượt khác mà không ghi lại được). Nêu thẳng việc phải làm, đừng để
    // người đọc đi mò như đợt YouTube.
    const them =
      ma === 'invalid_grant'
        ? ' — refresh token đã chết. Phải cấp lại bằng tay (xem docs/TIKTOK-TOKEN.md) rồi đặt TIKTOK_REFRESH_TOKEN.'
        : '';
    return { error: `TikTok từ chối làm mới token: ${ma} ${mo}${them}`.trim() };
  }

  const now = Date.now();
  const next: StoredToken = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: now + (body.expires_in ?? 86400) * 1000,
    refresh_expires_at: now + (body.refresh_expires_in ?? 365 * 86400) * 1000,
    updated_at: new Date(now).toISOString(),
  };

  // 🔑 GHI TRƯỚC, DÙNG SAU. Refresh token cũ đã chết ngay khi TikTok trả lời;
  // không giữ được cái mới thì chuỗi đứt, và lúc đó thà báo lỗi to còn hơn để
  // lượt này đăng được rồi ngày mai chết không rõ vì sao.
  const ok = await writeStored(next);
  if (!ok) {
    return {
      error:
        'ĐÃ làm mới token nhưng GHI VÀO app_config KHÔNG ĐƯỢC — chuỗi token TikTok đã đứt. ' +
        'Phải cấp lại bằng tay (xem docs/TIKTOK-TOKEN.md).',
    };
  }

  cached = next;
  const conLai = next.refresh_expires_at - now;
  return {
    token: next.access_token,
    warn:
      conLai < REFRESH_TOKEN_WARN_MS
        ? `Refresh token TikTok còn ${Math.round(conLai / 86400000)} ngày — cấp lại trước khi hết.`
        : undefined,
  };
}

/**
 * Lấy access token TikTok còn hạn.
 *
 * Thứ tự nguồn: env thủ công → bộ nhớ tiến trình → `app_config` → làm mới →
 * mồi `TIKTOK_REFRESH_TOKEN` (chỉ khi DB trống).
 */
export async function getTiktokAccessToken(): Promise<TokenOut> {
  if (MANUAL_TOKEN) return { token: MANUAL_TOKEN };
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<TokenOut> => {
    const now = Date.now();

    if (cached && cached.expires_at - now > REFRESH_MARGIN_MS) {
      return { token: cached.access_token };
    }

    const stored = await readStored();
    if (stored && stored.expires_at - now > REFRESH_MARGIN_MS) {
      cached = stored;
      return { token: stored.access_token };
    }

    const rt = stored?.refresh_token || SEED_REFRESH;
    if (!rt) {
      return {
        error:
          'Chưa có token TikTok. Cấp lần đầu rồi đặt env TIKTOK_REFRESH_TOKEN ' +
          '(xem docs/TIKTOK-TOKEN.md).',
      };
    }
    return refresh(rt);
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** CHỈ dùng cho bài kiểm — xoá bộ nhớ tiến trình giữa hai ca. */
export function __resetTiktokTokenCache(): void {
  cached = null;
  inFlight = null;
}
