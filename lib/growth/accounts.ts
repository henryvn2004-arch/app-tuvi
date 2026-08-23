// lib/growth/accounts.ts
// ============================================================
// SỔ TÀI KHOẢN & ENTITY — nguồn DUY NHẤT sinh JSON-LD `sameAs` cho cả site.
//
// Vì sao module này tồn tại (xem đầu _patches/migration-growth-accounts.sql):
// đo được 2026-08-23 là schema `Person` khai `sameAs: []` rỗng và
// `Organization` không có trường đó — schema có mà không mang tín hiệu nào.
//
// Ba việc, tách bạch:
//   1. seed  — nạp danh sách nền tảng vào sổ (chạy lại được, không đè dòng cũ)
//   2. check — ghé lại URL đã có, đánh dấu còn sống hay chết
//   3. sameAs— trả danh sách URL cho tầng schema
//
// ⚠️ KHÔNG tự đăng ký tài khoản ở đâu cả. Đăng ký là việc tay (captcha, xác
// minh email/điện thoại, điều khoản từng nền tảng) — cùng nguyên tắc đã chốt
// ở track backlink: máy làm phần tốn sức, người bấm nút cuối.
//
// Dùng lại helper REST của lib/backlinks/db.ts thay vì chép bản thứ hai —
// cùng Supabase, cùng service key, chép ra là hai bản trôi khỏi nhau.
// ============================================================

import { sbGet, sbInsert, sbPatch, sbConfigured } from '@/lib/backlinks/db';

const UA = 'TuviMinhBaoBacklinkBot/1.0 (+https://www.tuviminhbao.com/; kiem-tai-khoan)';
const FETCH_TIMEOUT_MS = 8000;

export type AccountCategory = 'entity' | 'social' | 'web2' | 'community' | 'registry';
export type AccountStatus = 'todo' | 'registered' | 'verified' | 'rejected' | 'skip';

export interface GrowthAccount {
  id: string;
  platform: string;
  label: string;
  category: AccountCategory;
  url: string | null;
  submit_url: string | null;
  handle: string | null;
  status: AccountStatus;
  priority: number;
  same_as: boolean;
  automation: string | null;
  notes: string | null;
  last_checked_at: string | null;
  last_ok: boolean | null;
  check_note: string | null;
}

interface SeedAccount {
  platform: string;
  label: string;
  category: AccountCategory;
  priority: 1 | 2 | 3;
  same_as: boolean;
  submit_url?: string;
  url?: string;
  status?: AccountStatus;
  automation?: string;
  notes?: string;
}

// ── Danh sách nền tảng ──────────────────────────────────────────────────────
// Chỉ dùng URL GỐC của nền tảng (chắc chắn tồn tại) — CỐ Ý không bịa đường
// dẫn form nộp sâu, vì mỗi nền tảng đổi đường dẫn một kiểu và một URL 404
// trong sổ còn tệ hơn không có URL. Ba mục đã có sẵn (`status: 'registered'`)
// lấy từ CLAUDE.md, cron kiểm-tra-sống sẽ tự xác nhận lại.
const SEED_ACCOUNTS: SeedAccount[] = [
  // ── entity: neo thực thể, Google Knowledge Graph đọc trực tiếp ──
  { platform: 'wikidata', label: 'Wikidata', category: 'entity', priority: 3, same_as: true,
    submit_url: 'https://www.wikidata.org/', automation: 'Tay 1 lần. Có API ghi nhưng tạo item mới nên làm tay.',
    notes: 'Neo thực thể mạnh nhất và miễn phí. Wikipedia thì CHƯA đủ điều kiện (cần nguồn báo chí độc lập) — làm sau khi có PR.' },
  { platform: 'crunchbase', label: 'Crunchbase', category: 'entity', priority: 2, same_as: true,
    submit_url: 'https://www.crunchbase.com/', automation: 'Tay 1 lần.' },
  { platform: 'linkedin-company', label: 'LinkedIn — Trang công ty', category: 'entity', priority: 2, same_as: true,
    submit_url: 'https://www.linkedin.com/company/setup/new/', automation: 'Tay 1 lần.' },
  { platform: 'google-business', label: 'Google Business Profile', category: 'entity', priority: 1, same_as: false,
    submit_url: 'https://business.google.com/', automation: 'Tay.',
    notes: 'CÓ THỂ KHÔNG ĐỦ ĐIỀU KIỆN — sản phẩm online thuần, không địa chỉ phục vụ khách. Kiểm trước khi tốn công.' },
  { platform: 'github-org', label: 'GitHub — tài khoản/tổ chức', category: 'entity', priority: 2, same_as: true,
    submit_url: 'https://github.com/', automation: 'Tay 1 lần; sau đó repo công khai đẩy bằng git.',
    notes: 'Cần cho mục #9 (MCP công khai) và #8 (nộp public-apis).' },

  // ── social: hồ sơ mạng xã hội ──
  { platform: 'facebook-page', label: 'Facebook Page', category: 'social', priority: 3, same_as: true,
    url: 'https://www.facebook.com/122097706839369476', status: 'registered',
    automation: 'Đăng bài ĐÃ tự động (lib/media/publish.ts).', notes: 'Page id lấy từ CLAUDE.md track Media Pipeline.' },
  { platform: 'youtube', label: 'YouTube — Tử Vi Minh Bảo', category: 'social', priority: 3, same_as: true,
    url: 'https://www.youtube.com/channel/UCyEf6daQ6taa4sFtFeTpCUA', status: 'registered',
    automation: 'Đăng video ĐÃ tự động (yt-drain).' },
  { platform: 'telegram-bot', label: 'Telegram — bot @tuviminhbao_bot', category: 'social', priority: 3, same_as: true,
    url: 'https://t.me/tuviminhbao_bot', status: 'registered', automation: 'Bot đã chạy thật.' },
  { platform: 'telegram-channel', label: 'Telegram — channel', category: 'social', priority: 2, same_as: true,
    submit_url: 'https://telegram.org/', automation: 'Đăng ĐÃ tự động sẵn, chỉ thiếu TELEGRAM_CHANNEL_ID.',
    notes: 'Việc tay: tạo channel, thêm bot làm admin, đặt env. Code đăng đã sẵn 100%.' },
  { platform: 'instagram', label: 'Instagram', category: 'social', priority: 2, same_as: true,
    submit_url: 'https://www.instagram.com/', automation: 'Adapter đăng ĐÃ có, thiếu IG_USER_ID + IG_ACCESS_TOKEN.' },
  { platform: 'threads', label: 'Threads', category: 'social', priority: 2, same_as: true,
    submit_url: 'https://www.threads.net/', automation: 'Adapter đăng ĐÃ có, cần token RIÊNG (không dùng chung Facebook).' },
  { platform: 'tiktok', label: 'TikTok', category: 'social', priority: 2, same_as: true,
    submit_url: 'https://www.tiktok.com/', automation: 'Adapter ĐÃ có; cần quyền video.publish + verify miền.' },
  { platform: 'pinterest', label: 'Pinterest', category: 'social', priority: 3, same_as: true,
    submit_url: 'https://www.pinterest.com/business/create/',
    automation: 'CÓ API tạo pin → tự động được (mục #12).',
    notes: 'Pinterest là CÔNG CỤ TÌM KIẾM, nội dung tử vi/tarot sống khoẻ, tiếng Việt gần như trống.' },
  { platform: 'x-twitter', label: 'X (Twitter)', category: 'social', priority: 2, same_as: true,
    submit_url: 'https://x.com/', automation: 'API ghi nay TRẢ PHÍ — coi như đăng tay.' },
  { platform: 'zalo-oa', label: 'Zalo Official Account', category: 'social', priority: 2, same_as: true,
    submit_url: 'https://oa.zalo.me/', automation: 'Có API sau khi duyệt OA.', notes: 'Cần CCCD/GPKD, duyệt vài ngày.' },
  { platform: 'reddit-user', label: 'Reddit — tài khoản', category: 'social', priority: 2, same_as: false,
    submit_url: 'https://www.reddit.com/register/',
    automation: '⛔ KHÔNG tự đăng — bot quảng cáo bị cấm vĩnh viễn. Chỉ dùng để người trả lời tay.',
    notes: 'Cần nuôi karma trước bằng bình luận thật, đừng đăng link ngay.' },
  { platform: 'quora', label: 'Quora', category: 'social', priority: 2, same_as: false,
    submit_url: 'https://www.quora.com/', automation: '⛔ Trả lời tay.' },
  { platform: 'linkedin-personal', label: 'LinkedIn — cá nhân (tác giả)', category: 'social', priority: 1, same_as: false,
    submit_url: 'https://www.linkedin.com/', automation: 'Tay.', notes: 'Dùng cho E-E-A-T: gắn tác giả thật vào schema Person.' },

  // ── web2: nền tảng tự xuất bản = backlink + phân phối ──
  { platform: 'blogger', label: 'Blogger (Blogspot)', category: 'web2', priority: 3, same_as: true,
    submit_url: 'https://www.blogger.com/', automation: 'CÓ Blogger API v3 (Google) → đăng tự động được.',
    notes: 'Google sở hữu, link dofollow. Ứng viên tự-động-hoá tốt nhất nhóm này.' },
  { platform: 'devto', label: 'Dev.to', category: 'web2', priority: 3, same_as: true,
    submit_url: 'https://dev.to/', automation: 'CÓ API (api-key header) → đăng tự động được.',
    notes: 'Hợp câu chuyện KỸ THUẬT (engine tất định + AI chỉ luận), không hợp bài tử vi.' },
  { platform: 'hashnode', label: 'Hashnode', category: 'web2', priority: 3, same_as: true,
    submit_url: 'https://hashnode.com/', automation: 'CÓ GraphQL API → đăng tự động được.' },
  { platform: 'medium', label: 'Medium', category: 'web2', priority: 2, same_as: true,
    submit_url: 'https://medium.com/', automation: '⚠️ CHƯA ĐO — Medium đã ngưng cấp integration token mới. Nhiều khả năng đăng tay.' },
  { platform: 'substack', label: 'Substack', category: 'web2', priority: 2, same_as: true,
    submit_url: 'https://substack.com/', automation: '⚠️ CHƯA ĐO. Kèm luôn kênh newsletter (site hiện KHÔNG có chỗ thu email nào).' },
  { platform: 'wordpress-com', label: 'WordPress.com', category: 'web2', priority: 2, same_as: false,
    submit_url: 'https://wordpress.com/', automation: 'CÓ REST API.' },
  { platform: 'tumblr', label: 'Tumblr', category: 'web2', priority: 1, same_as: false,
    submit_url: 'https://www.tumblr.com/', automation: 'CÓ API.' },
  { platform: 'spiderum', label: 'Spiderum (VN)', category: 'web2', priority: 2, same_as: true,
    submit_url: 'https://spiderum.com/', automation: 'Đăng tay.', notes: 'Medium phiên bản Việt, tệp đọc chịu đọc dài.' },
  { platform: 'tinhte', label: 'Tinh tế (VN)', category: 'web2', priority: 2, same_as: false,
    submit_url: 'https://tinhte.vn/', automation: 'Đăng tay.', notes: 'Hợp góc kỹ thuật; hồ sơ có chỗ gắn website.' },

  // ── community: nơi có sẵn người, KHÔNG tự đăng ──
  { platform: 'webtretho', label: 'Webtretho (VN)', category: 'community', priority: 3, same_as: false,
    submit_url: 'https://www.webtretho.com/', automation: '⛔ Trả lời tay.',
    notes: 'ĐÚNG TỆP nhất: xem tuổi, đặt tên con, xem ngày. Đáng ưu tiên hơn Reddit nhiều.' },
  { platform: 'lamchame', label: 'Làm Cha Mẹ (VN)', category: 'community', priority: 3, same_as: false,
    submit_url: 'https://www.lamchame.com/', automation: '⛔ Trả lời tay.' },
  { platform: 'reddit-vietnam', label: 'Reddit — r/VietNam', category: 'community', priority: 2, same_as: false,
    submit_url: 'https://www.reddit.com/r/VietNam/', automation: '⛔ Trả lời tay.' },
  { platform: 'reddit-astrology', label: 'Reddit — r/astrology', category: 'community', priority: 2, same_as: false,
    submit_url: 'https://www.reddit.com/r/astrology/', automation: '⛔ Trả lời tay.' },
  { platform: 'reddit-tarot', label: 'Reddit — r/tarot', category: 'community', priority: 1, same_as: false,
    submit_url: 'https://www.reddit.com/r/tarot/', automation: '⛔ Trả lời tay.' },
  { platform: 'voz', label: 'Voz (VN)', category: 'community', priority: 1, same_as: false,
    submit_url: 'https://voz.vn/', automation: '⛔ Trả lời tay.', notes: 'Tệp khó tính — vào sai giọng là phản tác dụng.' },
  { platform: 'discord', label: 'Discord — server riêng', category: 'community', priority: 1, same_as: false,
    submit_url: 'https://discord.com/', automation: 'Có webhook đẩy nội dung tự động.' },
  { platform: 'facebook-groups', label: 'Facebook Groups (seeding)', category: 'community', priority: 2, same_as: false,
    submit_url: 'https://www.facebook.com/groups/', automation: 'Soạn ĐÃ tự động (lib/media/seeding.ts); dán tay.' },

  // ── registry: danh bạ sản phẩm/API/MCP — vùng gần như không cạnh tranh ──
  { platform: 'smithery', label: 'Smithery (MCP registry)', category: 'registry', priority: 3, same_as: false,
    submit_url: 'https://smithery.ai/', automation: 'Đăng ký 1 lần.', notes: 'Cần MCP công khai (mục #9).' },
  { platform: 'mcp-so', label: 'mcp.so', category: 'registry', priority: 3, same_as: false,
    submit_url: 'https://mcp.so/', automation: 'Đăng ký 1 lần.' },
  { platform: 'pulsemcp', label: 'PulseMCP', category: 'registry', priority: 3, same_as: false,
    submit_url: 'https://www.pulsemcp.com/', automation: 'Đăng ký 1 lần.' },
  { platform: 'glama-mcp', label: 'Glama MCP Directory', category: 'registry', priority: 2, same_as: false,
    submit_url: 'https://glama.ai/mcp/servers', automation: 'Đăng ký 1 lần.' },
  { platform: 'mcp-servers-repo', label: 'GitHub — modelcontextprotocol/servers', category: 'registry', priority: 3, same_as: false,
    submit_url: 'https://github.com/modelcontextprotocol/servers', automation: 'Gửi PR 1 lần.',
    notes: 'Repo chính thức, DA rất cao. Đọc kỹ tiêu chí nhận trước khi gửi PR.' },
  { platform: 'public-apis', label: 'GitHub — public-apis/public-apis', category: 'registry', priority: 3, same_as: false,
    submit_url: 'https://github.com/public-apis/public-apis', automation: 'Gửi PR 1 lần.',
    notes: 'Cần API công khai trước (mục #8). Repo vài trăm nghìn sao, nhiều site mirror lại.' },
  { platform: 'rapidapi', label: 'RapidAPI Hub', category: 'registry', priority: 2, same_as: false,
    submit_url: 'https://rapidapi.com/', automation: 'Đăng ký 1 lần.' },
  { platform: 'gpt-store', label: 'OpenAI GPT Store', category: 'registry', priority: 2, same_as: false,
    submit_url: 'https://chatgpt.com/gpts', automation: 'Tạo tay 1 lần.',
    notes: 'GA4 đã thấy traffic tự nhiên từ chatgpt.com — cửa này vốn đã hé.' },
  { platform: 'producthunt', label: 'Product Hunt', category: 'registry', priority: 2, same_as: false,
    submit_url: 'https://www.producthunt.com/', automation: 'Tay.',
    notes: 'ĐÃ có trong seed-list.ts với vai "nơi nộp link"; ở đây là vai "tài khoản mình sở hữu".' },
  { platform: 'alternativeto', label: 'AlternativeTo', category: 'registry', priority: 2, same_as: false,
    submit_url: 'https://alternativeto.net/', automation: 'Tay.' },
  { platform: 'saashub', label: 'SaaSHub', category: 'registry', priority: 1, same_as: false,
    submit_url: 'https://www.saashub.com/', automation: 'Tay.' },
  { platform: 'betalist', label: 'BetaList', category: 'registry', priority: 1, same_as: false,
    submit_url: 'https://betalist.com/', automation: 'Tay.' },
];

export interface SeedAccountsResult {
  total: number;
  inserted: number;
  skipped: number;
}

/** Nạp nền tảng CHƯA CÓ vào sổ. Chạy lại được — trùng `platform` thì bỏ qua, KHÔNG đè. */
export async function runAccountsSeed(): Promise<SeedAccountsResult> {
  const result: SeedAccountsResult = { total: SEED_ACCOUNTS.length, inserted: 0, skipped: 0 };
  if (!sbConfigured()) return result;

  for (const a of SEED_ACCOUNTS) {
    // POST thuần: trùng `platform` (unique) → 409 → sbInsert trả null.
    // CỐ Ý không upsert — Henry có thể đã sửa tay trạng thái/URL của dòng đó.
    const row = await sbInsert<GrowthAccount>('growth_accounts', {
      platform: a.platform,
      label: a.label,
      category: a.category,
      url: a.url || null,
      submit_url: a.submit_url || null,
      status: a.status || 'todo',
      priority: a.priority,
      same_as: a.same_as,
      automation: a.automation || null,
      notes: a.notes || null,
    });
    if (row) result.inserted++;
    else result.skipped++;
  }
  return result;
}

export interface CheckAccountsResult {
  checked: number;
  alive: number;
  dead: number;
  deadList: string[];
}

/**
 * Ghé lại URL của những tài khoản ĐÃ CÓ url, đánh dấu còn sống hay chết.
 * Không có bước này thì 6 tháng sau `sameAs` vẫn trỏ vào một trang 404 mà
 * không ai hay — đúng loại hỏng im lặng repo này đã trả giá nhiều lần.
 */
export async function runAccountsHealthCheck(limit = 60): Promise<CheckAccountsResult> {
  const out: CheckAccountsResult = { checked: 0, alive: 0, dead: 0, deadList: [] };
  if (!sbConfigured()) return out;

  const rows = await sbGet<GrowthAccount>(
    'growth_accounts?select=id,platform,label,url,status' +
      '&url=not.is.null&status=in.(registered,verified)' +
      `&order=last_checked_at.asc.nullsfirst&limit=${limit}`,
  );

  for (const r of rows) {
    if (!r.url) continue;
    out.checked++;
    let ok = false;
    let note = '';
    try {
      const res = await fetch(r.url, {
        method: 'GET',
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      ok = res.ok;
      note = `HTTP ${res.status}`;
      // 403/429 của mạng xã hội thường là chặn bot, KHÔNG phải hồ sơ chết —
      // đánh dấu chết ở đây là báo động giả rồi Henry thôi đọc bảng này.
      if (!ok && (res.status === 403 || res.status === 429)) {
        ok = true;
        note = `HTTP ${res.status} (nền tảng chặn bot — không kết luận là chết)`;
      }
    } catch (e: unknown) {
      note = `không kết nối được: ${(e as Error).message}`.slice(0, 200);
    }
    if (ok) out.alive++;
    else {
      out.dead++;
      out.deadList.push(`${r.label} — ${note}`);
    }
    await sbPatch('growth_accounts', `id=eq.${r.id}`, {
      last_checked_at: new Date().toISOString(),
      last_ok: ok,
      check_note: note || null,
      updated_at: new Date().toISOString(),
    });
  }
  return out;
}

/**
 * URL cho JSON-LD `sameAs`. Chỉ lấy hồ sơ ĐÃ CÓ THẬT và chưa bị đánh dấu
 * chết — `last_ok` là `null` (chưa kiểm lần nào) vẫn tính, vì thà kê một hồ
 * sơ chưa kiểm còn hơn để `sameAs` rỗng như hiện tại.
 */
export async function getSameAsUrls(): Promise<string[]> {
  if (!sbConfigured()) return [];
  try {
    const rows = await sbGet<{ url: string | null; last_ok: boolean | null }>(
      'growth_accounts?select=url,last_ok&same_as=is.true&url=not.is.null' +
        '&status=in.(registered,verified)&order=priority.desc&limit=50',
    );
    return rows.filter((r) => r.url && r.last_ok !== false).map((r) => r.url as string);
  } catch {
    return []; // sameAs hỏng KHÔNG được kéo sập trang — trả rỗng như trước.
  }
}

export interface GrowthAccountsRunResult {
  seed: SeedAccountsResult;
  check: CheckAccountsResult;
}

export async function runGrowthAccounts(): Promise<GrowthAccountsRunResult> {
  const seed = await runAccountsSeed();
  const check = await runAccountsHealthCheck();
  return { seed, check };
}

/** Bản tin Telegram — im lặng khi không có gì bất thường. */
export function formatAccountsReport(r: GrowthAccountsRunResult): string | null {
  const lines: string[] = [];
  if (r.seed.inserted > 0) lines.push(`➕ Thêm ${r.seed.inserted} nền tảng mới vào sổ`);
  if (r.check.dead > 0) {
    lines.push(`🔴 ${r.check.dead}/${r.check.checked} hồ sơ KHÔNG truy cập được:`);
    for (const d of r.check.deadList.slice(0, 10)) lines.push(`  · ${d}`);
  }
  if (!lines.length) return null;
  return `🏷️ <b>Tài khoản & Entity</b>\n${lines.join('\n')}`;
}
