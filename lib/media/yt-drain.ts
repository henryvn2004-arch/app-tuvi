// lib/media/yt-drain.ts
// ============================================================
// M1 (track Media Pipeline) — XẢ KHO video đã render nhưng chưa lên YouTube.
//
// VÌ SAO CẦN: đo prod 01/08 thấy `van_dap` có **86 bài video render xong mà
// yt_status='error'**, trong đó 84 bài lỗi CÙNG một `invalid_grant` — tức toàn
// bộ kho bị chặn bởi đúng một nguyên nhân, không phải 86 sự cố riêng lẻ. Đây là
// nội dung đã sản xuất và trả tiền rồi, chỉ đang bị khoá ngoài cửa.
//
// ⚠️ ĐÂY KHÔNG PHẢI CHỖ SỬA NGUYÊN NHÂN GỐC. `invalid_grant` lặp lại hai lần
// (22/04 và 16/07) là dấu hiệu OAuth consent screen còn ở chế độ *Testing* trong
// Google Cloud — refresh token loại đó hết hạn sau 7 ngày. Cấp token mới rồi
// chạy file này sẽ xả được vài ngày rồi tắc lại. Phải PUBLISH app trước.
// (docs/MEDIA-PIPELINE-PLAN.md §6)
//
// BA QUYẾT ĐỊNH THIẾT KẾ, đều rút từ chính vết thương của kho này:
//
//  1. **Gặp lỗi CHẶN thì dừng cả lượt, không thử tiếp.** 84 dòng `yt_error`
//     giống hệt nhau là bằng chứng của việc cứ thử mãi một thứ đã hỏng: mỗi lượt
//     thử lại ghi đè `yt_error`, đốt quota, và làm loãng dấu vết. Auth chết thì
//     bài nào cũng chết — biết sau bài đầu là đủ.
//
//  2. **Nhỏ giọt, không dồn.** Kho đã dính `uploadLimitExceeded` 2 lần hồi
//     tháng 4 — YouTube có ngưỡng chống spam riêng, tách khỏi quota API. Đổ 85
//     video một lượt là cách chắc chắn nhất để bị chặn kênh.
//
//  3. **Có ngân sách thời gian.** Mỗi lượt upload tải nguyên file MP4 về edge
//     rồi đẩy lên YouTube; ba lượt dễ vượt `maxDuration` của Vercel. Hết giờ thì
//     DỪNG SẠCH và để lượt sau — bị giết ngang giữa chừng sẽ để lại dòng
//     `yt_status='uploading'` treo vĩnh viễn (edge đặt cờ đó TRƯỚC khi upload).
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

/** Trần cứng/lượt. Quota YouTube 10.000 đơn vị/ngày ÷ 1.600 mỗi upload = 6. */
const HARD_MAX = 6;
/** Mặc định 3/ngày → 85 video xả hết trong ~4 tuần, dưới xa ngưỡng chống spam. */
const DEFAULT_DAILY = 3;

/**
 * Lỗi thuộc nhóm này nghĩa là "cửa đang khoá", không phải "bài này hỏng" — thử
 * bài kế tiếp chắc chắn ra cùng kết quả. Khớp theo chuỗi con, không phân biệt
 * hoa thường, vì thông điệp là JSON thô của Google chứ không phải mã lỗi sạch.
 */
const BLOCKING_PATTERNS = [
  'invalid_grant', // refresh token hết hạn/bị thu hồi — 84/86 bài đang mắc ở đây
  'cannot get access token',
  // Token trỏ SAI KÊNH (edge `youtube-upload` v4 tự chốt trước khi đăng). Đây là
  // lỗi của CÁI TOKEN chứ không phải của bài, nên thử bài kế tiếp chỉ tổ đăng
  // nhầm thêm — 11/08 đã có 3 video công khai lên nhầm kênh cá nhân trước khi
  // chốt này tồn tại. Tiền tố `channel_mismatch` do edge function phát ra; đổi
  // bên đó thì phải đổi cả ở đây.
  'channel_mismatch',
  // Thiếu env của edge function (`youtube-upload` v4 gỡ giá trị viết cứng nên
  // CLIENT_ID/SECRET nay bắt buộc). Cửa chưa mở thì bài nào cũng như bài nào.
  'missing_env',
  'uploadlimitexceeded', // ngưỡng chống spam của YouTube (đã dính 2 lần)
  'quotaexceeded',
  'dailylimitexceeded',
  'forbidden',
  'unauthorized',
];

export interface DrainedItem {
  id: string;
  title: string;
  url?: string;
  error?: string;
}

export interface DrainResult {
  /** Số bài THỰC SỰ đã thử trong lượt này. */
  attempted: number;
  uploaded: DrainedItem[];
  failed: DrainedItem[];
  /** Có giá trị khi lượt bị cắt ngang: lỗi chặn, hoặc hết ngân sách thời gian. */
  stoppedReason?: string;
  /** Số bài còn nằm kho SAU lượt này (đã trừ phần vừa lên). */
  remaining: number;
  /** Bài kẹt `uploading` — dấu vết của lượt bị giết ngang, cần người nhìn. */
  stuck: number;
}

function isBlocking(msg: string): boolean {
  const m = (msg || '').toLowerCase();
  return BLOCKING_PATTERNS.some((p) => m.includes(p));
}

async function countRows(filter: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/van_dap?${filter}&select=id`, {
    headers: { ...SB_HEADERS, Prefer: 'count=exact', Range: '0-0' },
    cache: 'no-store',
  });
  if (!res.ok) return 0;
  // content-range: "0-0/123" — phần sau dấu / là tổng.
  const total = (res.headers.get('content-range') || '').split('/')[1];
  return Number(total) || 0;
}

/** Bộ lọc "sẵn sàng lên YouTube": đã có file video thật, chưa live. */
const READY_FILTER = 'video_status=eq.done&video_url=not.is.null&yt_status=in.(pending,error)';

interface QueueRow {
  id: string;
  title: string | null;
}

/**
 * Đẩy tối đa `limit` video lên YouTube, CŨ TRƯỚC (xả tồn kho theo thứ tự sản
 * xuất). `deadlineMs` là mốc thời gian tuyệt đối (Date.now() + ngân sách) —
 * hết giờ thì dừng sạch giữa hai lượt, không cắt ngang một lượt đang chạy.
 */
export async function drainYouTubeQueue(opts: { limit?: number; deadlineMs?: number } = {}): Promise<DrainResult> {
  const configured = await getConfigValue<number>('youtube.drain_daily', DEFAULT_DAILY);
  const limit = Math.max(0, Math.min(opts.limit ?? configured, HARD_MAX));
  const deadlineMs = opts.deadlineMs ?? Date.now() + 240_000;

  const result: DrainResult = { attempted: 0, uploaded: [], failed: [], remaining: 0, stuck: 0 };

  result.stuck = await countRows('yt_status=eq.uploading');
  if (limit === 0) {
    result.remaining = await countRows(READY_FILTER);
    result.stoppedReason = 'trần ngày = 0 (đã tắt qua app_config)';
    return result;
  }

  const qs = `${READY_FILTER}&select=id,title&order=created_at.asc&limit=${limit}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/van_dap?${qs}`, { headers: SB_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`van_dap: ${await res.text()}`);
  const rows = (await res.json()) as QueueRow[];

  for (const row of rows) {
    // Kiểm TRƯỚC mỗi lượt: một lượt upload có thể chạy hàng chục giây, khởi
    // động nó khi sắp hết giờ là tự chuốc lấy dòng `uploading` treo.
    if (Date.now() > deadlineMs) {
      result.stoppedReason = 'hết ngân sách thời gian của lượt cron — phần còn lại để lượt sau';
      break;
    }

    const title = (row.title || '').trim() || '(không tiêu đề)';
    result.attempted++;

    let payload: { success?: boolean; url?: string; error?: string } = {};
    let httpErr = '';
    try {
      const up = await fetch(`${SUPABASE_URL}/functions/v1/youtube-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      payload = (await up.json().catch(() => ({}))) as typeof payload;
      if (!up.ok && !payload.error) httpErr = `HTTP ${up.status}`;
    } catch (e) {
      httpErr = (e as Error).message;
    }

    if (payload.success && payload.url) {
      result.uploaded.push({ id: row.id, title, url: payload.url });
      continue;
    }

    const err = payload.error || httpErr || 'lỗi không rõ';
    result.failed.push({ id: row.id, title, error: err });

    if (isBlocking(err)) {
      result.stoppedReason = `lỗi CHẶN — mọi bài còn lại sẽ hỏng y hệt, dừng lượt: ${err.slice(0, 300)}`;
      break;
    }
  }

  result.remaining = await countRows(READY_FILTER);
  return result;
}

/** Bản tin Telegram. Trả '' khi KHÔNG có gì đáng báo — im lặng là một kết quả. */
export function formatDrainReport(r: DrainResult): string {
  if (!r.attempted && !r.stoppedReason && !r.stuck) return '';

  const lines: string[] = [];
  if (r.uploaded.length) {
    lines.push(`✅ Đã lên YouTube ${r.uploaded.length} video:`);
    for (const it of r.uploaded) lines.push(`  • ${it.title}\n    ${it.url}`);
  }
  if (r.failed.length) {
    lines.push(`❌ Lỗi ${r.failed.length} bài:`);
    for (const it of r.failed) lines.push(`  • ${it.title} — ${(it.error || '').slice(0, 200)}`);
  }
  if (r.stoppedReason) lines.push(`⏸️ ${r.stoppedReason}`);
  if (r.stuck) lines.push(`⚠️ ${r.stuck} bài kẹt trạng thái "uploading" (dấu vết lượt bị giết ngang).`);

  lines.push(`📦 Còn trong kho: ${r.remaining} video đã render, chưa lên.`);

  // Nhắc nguyên nhân gốc NGAY TRONG cảnh báo. Không có dòng này thì phản xạ tự
  // nhiên là đi cấp lại refresh token — vá được vài ngày rồi tắc y như cũ.
  if (r.failed.some((f) => isBlocking(f.error || ''))) {
    lines.push(
      '\n🔑 Lỗi auth: cấp lại token là vá triệu chứng. Google Cloud → OAuth consent screen → PUBLISH APP (đang ở chế độ Testing thì refresh token chỉ sống 7 ngày), rồi mới chạy lại youtube-auth.',
    );
  }
  return lines.join('\n');
}
