// app/api/signup-signal/route.ts
// Beacon client gọi sau khi đăng nhập/đăng ký: ghi tín hiệu IP(băm)/thiết bị vào
// signup_signals (theo dõi lan truyền + lạm dụng) và ÁP CAP theo thiết bị — quá N
// lần nhận thưởng từ cùng device_id trong 24h thì THU HỒI quà lần vượt (claw-back).
// Idempotent theo user (PK signup_signals.user_id). IP chỉ lưu bản băm, KHÔNG cap
// theo IP (CGNAT di động dễ dính oan). Xem migration-signup-signals.sql.
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { ok, err, options, parseBody } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SALT = process.env.SIGNUP_SIGNAL_SALT || 'tvmb-signal-v1';

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return err('Unauthorized', 401);

  const b = (await parseBody(request)) as Record<string, unknown>;
  const fp = String(b.fp || '').slice(0, 120);

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: ures } = await sb.auth.getUser(token);
    const user = ures?.user;
    if (!user) return err('Unauthorized', 401);

    // Idempotent: đã ghi tín hiệu cho user này rồi → thôi (không xử lại/claw lại).
    const { data: existing } = await sb
      .from('signup_signals')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) return ok({ ok: true, already: true });

    // IP: chỉ lưu bản băm (riêng tư), không cap theo IP.
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const ipHash = ip ? createHash('sha256').update(SALT + ip).digest('hex').slice(0, 32) : null;

    // Số Lượng đã tặng lúc đăng ký (để biết thu hồi bao nhiêu).
    const { data: bt } = await sb
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'signup_bonus')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const bonusAmount = typeof bt?.amount === 'number' ? bt.amount : 0;

    // Cap theo thiết bị (config, mặc định 5; 0 = tắt).
    let cap = 5;
    const { data: cfg } = await sb
      .from('app_config')
      .select('value')
      .eq('key', 'credits.signup_bonus_device_cap')
      .maybeSingle();
    if (cfg && typeof cfg.value === 'number') cap = cfg.value;

    let willClaw = false;
    if (cap > 0 && fp && bonusAmount > 0) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await sb
        .from('signup_signals')
        .select('user_id', { count: 'exact', head: true })
        .eq('device_id', fp)
        .gte('created_at', since);
      if ((count ?? 0) >= cap) willClaw = true;
    }

    // Ghi tín hiệu. Nếu trùng PK (race 2 beacon) → coi như đã xử, KHÔNG claw lại.
    const { error: insErr } = await sb.from('signup_signals').insert({
      user_id: user.id,
      ip_hash: ipHash,
      device_id: fp || null,
      bonus_amount: bonusAmount,
      clawed: willClaw,
    });
    if (insErr) return ok({ ok: true, already: true });

    // Chỉ thu hồi SAU khi chèn tín hiệu thành công (đảm bảo 1 lần/user).
    if (willClaw) {
      await sb.rpc('revoke_signup_bonus', { p_user: user.id, p_amount: bonusAmount });
    }
    return ok({ ok: true, clawed: willClaw });
  } catch (e: unknown) {
    console.error('[signup-signal] exception', e);
    return ok({ ok: false }); // beacon không được làm hỏng luồng đăng nhập
  }
}
