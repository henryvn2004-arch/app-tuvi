// app/api/pulse/route.ts
// Tracker "đang online / lượt hỏi hôm nay" hiện trên sidebar `/app` (ngay trên
// ô "Tìm công cụ, lệnh…" — public/shell.js loadPulse()). Số THẬT qua RPC
// pulse_stats() (_patches/migration-pulse-tracker.sql), KHÔNG mô phỏng — xem
// ghi chú "KHÔNG bịa số" ở đó.
//
// Cache trong-tiến-trình vài giây: sidebar dựng lại trên MỌI trang /app (35
// trang) và client poll định kỳ, nhiều người mở cùng lúc dễ dội trùng RPC vào
// đúng giây đó. TTL ngắn nên vẫn "gần thời gian thực", không phải số đứng yên.
export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_SERV = process.env.SUPABASE_SERVICE_KEY!;

const CACHE_MS = 10_000;
let cached: { online: number; promptsToday: number } | null = null;
let cachedAt = 0;

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }));
}

export async function GET() {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cors(NextResponse.json(cached));
  }
  try {
    const supabase = createClient(SB_URL, SB_SERV);
    const { data, error } = await supabase.rpc('pulse_stats');
    if (error || !data) throw error || new Error('empty pulse_stats');
    cached = {
      online: Number(data.online) || 0,
      promptsToday: Number(data.prompts_today) || 0,
    };
    cachedAt = Date.now();
    return cors(NextResponse.json(cached));
  } catch (e: any) {
    // Best-effort, không bịa số khi hỏng: client đọc lỗi này và ẨN ô tracker
    // thay vì hiện số cũ/số 0 giả — xem loadPulse() trong shell.js.
    return cors(NextResponse.json({ error: e?.message || 'pulse_stats failed' }, { status: 500 }));
  }
}
