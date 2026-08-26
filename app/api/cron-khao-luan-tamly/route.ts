// app/api/cron-khao-luan-tamly/route.ts
// ============================================================
// Lớp VỎ MỎNG (đọc header, gọi nghiệp vụ, bọc NextResponse) — TOÀN BỘ nghiệp
// vụ thật (chủ đề, prompt, gate, ghi DB) nằm ở `./logic.ts`, tách riêng vì file
// đó CỐ Ý không import `next/server` (nợ đã ghi: biên dịch `next/server` ngoài
// runtime Next thật từng làm V8 OOM lúc harness test chạy trần bằng tsc+node —
// track CMO Digest). Đọc chú thích đầu `logic.ts` để biết đầy đủ thiết kế
// (Kimi override, ranh giới an toàn, trần tuần).
export const maxDuration = 300;
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { withCronLog } from '@/lib/cron/log';
import { processOneRun } from './logic';

export async function OPTIONS() {
  return options();
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return err('Unauthorized', 401);
  const { message, results } = await processOneRun();
  return ok({ message, ...results });
}

export async function GET(request: NextRequest) {
  return withCronLog('cron-khao-luan-tamly', 'vercel', () => handle(request));
}
export async function POST(request: NextRequest) {
  return handle(request);
}
