// app/api/cron/indexnow/route.ts — báo Bing + Naver (IndexNow) các URL đã dịch MỚI hoặc ĐÃ ĐỔI (W10).
// Nguồn: trang tĩnh trong i18n/availability.json + hồ sơ Nghiệm Chứng/Xác Định Giờ Sinh có bản dịch
// (nc_ho_so_i18n.updated_at). Idempotent nhờ sổ `indexnow_sent`; trần `maxPerRun` mỗi lượt, phần dư
// để lượt sau. Chạy hằng ngày 03:40 UTC (10:40 VN). Logic: lib/seo/indexnow.ts.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import {
  INDEXNOW_ENDPOINTS,
  keyFileOk,
  loadIndexNowConfig,
  loadSent,
  markSent,
  nghiemChungCandidates,
  staticCandidates,
  submit,
  type Candidate,
} from '@/lib/seo/indexnow';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('indexnow', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const cfg = await loadIndexNowConfig();
  if (!cfg.enabled) return NextResponse.json({ ok: true, skipped: 'đã tắt qua app_config' });

  try {
    if (!(await keyFileOk())) {
      return NextResponse.json({ ok: false, error: 'file key IndexNow không được phục vụ hoặc lệch hằng INDEXNOW_KEY' });
    }
    // Trang tĩnh trước (ít, quan trọng), rồi hồ sơ mới dịch nhất trước.
    const all: Candidate[] = [...staticCandidates(), ...(await nghiemChungCandidates())];
    const sent = await loadSent(); // lỗi ⇒ ném ⇒ KHÔNG gửi
    const pending = all.filter((c) => sent.get(c.url) !== c.hash);
    const batch = pending.slice(0, cfg.maxPerRun);
    if (!batch.length) return NextResponse.json({ ok: true, count: 0, note: `không có URL mới/đổi (${all.length} URL theo dõi)` });

    const urls = batch.map((c) => c.url);
    const codes: number[] = [];
    for (const ep of INDEXNOW_ENDPOINTS) codes.push(await submit(ep, urls));
    const accepted = codes.every((c) => c === 200 || c === 202);
    // Chỉ ghi sổ khi MỌI endpoint nhận — một cổng hụt thì lượt sau gửi lại (IndexNow chịu được gửi trùng).
    if (accepted) await markSent(batch);
    return NextResponse.json({
      ok: accepted,
      ...(accepted ? {} : { error: `IndexNow từ chối: ${INDEXNOW_ENDPOINTS.map((e, i) => `${new URL(e).host}=${codes[i]}`).join(' ')}` }),
      count: batch.length,
      note: `${batch.length} URL gửi / ${pending.length} chờ / ${all.length} theo dõi · ${codes.join(',')}`,
    });
  } catch (e) {
    console.error('[indexnow]', (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
