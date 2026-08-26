-- ============================================================
-- Hai con số của track hiệu ứng tâm lý CHƯA có bề mặt nào vẽ ra, nên tới giờ
-- muốn đọc là phải gõ SQL tay:
--
--   • `invite_shown`  — lời mời giới thiệu có BAO GIỜ đủ điều kiện hiện ra
--                       không. Bằng 0 nghĩa là điều kiện không bao giờ thoả
--                       (phải nới), KHÁC HẲN với "hiện mà không ai bấm" (lỗi
--                       câu chữ). Gộp hai ca đó lại thì cả hai đọc thành một
--                       con số 0 giống nhau.
--   • `cta_click` với `meta.from = 'share_form'` — ô nhập ngày sinh trên trang
--                       chia sẻ (B2) có ai dùng không.
--
-- 🔴 VÀ ĐÂY LÀ PHẦN KHÔNG NẰM TRONG ĐỀ BÀI: `viral_loop_funnel` đang đếm CTA
-- bằng ĐÚNG một điều kiện `meta->>'from' = 'share'` — tức bậc "Bấm CTA" của nó
-- HOÀN TOÀN MÙ với đường B2. B2 đã THAY nút đăng ký bằng ô nhập ngày sinh trên
-- 3 tool chân dung/luận giải, nên với đúng mấy tool đó bậc CTA đọc ra 0 trong
-- khi người dùng vẫn đang đi qua. Đây không phải "thiếu một cột" — nó là một
-- con số đang ĐẾM HỤT.
--
-- ⚠️ Hai nguồn CỐ Ý để RIÊNG, không cộng vào `cta_clicks`: `share` là nút đăng
-- ký cũ, `share_form` là ô nhập mới. Cộng lại thì lúc số nhúc nhích không biết
-- đường nào ra người thật — mà đó chính là câu hỏi B2 sinh ra để trả lời.
-- ============================================================

-- ── 1. tool_funnel: thêm cột "lời mời" ─────────────────────────
-- Đổi kiểu trả về nên PHẢI drop trước; `create or replace` không đổi được
-- return type của hàm trả TABLE.
drop function if exists public.tool_funnel(timestamptz, timestamptz);

create or replace function public.tool_funnel(p_from timestamptz, p_to timestamptz)
returns table (
  tool_id text,
  nhan text,
  gia int,
  mo bigint,
  chay bigint,
  thu bigint,
  bam_mo bigint,
  loi_moi bigint,
  mua bigint,
  luot_mua bigint,
  luong bigint
)
language sql security definer set search_path = public as $$
  with ev as (
    select tool_canon(e.tool_id) as tool_id,
           e.event_type,
           coalesce(e.user_id::text, e.anon_id) as ai
      from events e
     where e.ts >= p_from and e.ts < p_to
       and e.tool_id is not null
       and coalesce(e.user_id::text, e.anon_id) is not null
       and e.event_type in ('tool_open', 'tool_run', 'preview_shown', 'unlock_click', 'invite_shown')
  ),
  tra as (
    select tool_canon(c.type) as tool_id, c.user_id::text as ai, c.amount
      from credit_transactions c
     where c.created_at >= p_from and c.created_at < p_to
       and c.amount < 0
       and (c.type like 'use\_%' or c.type = 'chat')
  ),
  ds as (
    select p.tool_id, p.label, p.credits
      from tool_pricing p
     where p.tool_id in (select tool_id from ev union select tool_id from tra)
  )
  select d.tool_id, d.label, d.credits,
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_open'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_run'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'preview_shown'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'unlock_click'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'invite_shown'),
         (select count(distinct ai) from tra where tra.tool_id = d.tool_id),
         (select count(*) from tra where tra.tool_id = d.tool_id),
         (select coalesce(sum(-amount), 0)::bigint from tra where tra.tool_id = d.tool_id)
    from ds d
   order by 4 desc nulls last, 11 desc;
$$;

-- Bộ dò tên lệch phải nhìn CÙNG tập event mà panel đọc — nếu không, một tool
-- bắn `invite_shown` bằng id lạ sẽ đọc ra 0 và không có gì kêu.
create or replace function public.tool_funnel_lac(p_from timestamptz, p_to timestamptz)
returns table (tool_id text, nguon text, so_luot bigint)
language sql security definer set search_path = public as $$
  select tool_canon(e.tool_id), 'events'::text, count(*)
    from events e
   where e.ts >= p_from and e.ts < p_to and e.tool_id is not null
     and e.event_type in ('tool_open','tool_run','preview_shown','unlock_click','invite_shown')
     and tool_canon(e.tool_id) not in (select tool_id from tool_pricing)
   group by 1
  union all
  select tool_canon(c.type), 'credit_transactions'::text, count(*)
    from credit_transactions c
   where c.created_at >= p_from and c.created_at < p_to and c.amount < 0
     and (c.type like 'use\_%' or c.type = 'chat')
     and tool_canon(c.type) not in (select tool_id from tool_pricing)
   group by 1
   order by 3 desc;
$$;

revoke all on function public.tool_funnel(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.tool_funnel_lac(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.tool_funnel(timestamptz, timestamptz) to service_role;
grant execute on function public.tool_funnel_lac(timestamptz, timestamptz) to service_role;

-- ── 2. viral_loop_funnel: tách `cta_form` khỏi `cta_clicks` ─────
-- Hàm này trả JSON nên thêm khoá là TƯƠNG THÍCH NGƯỢC — bản admin cũ còn trong
-- cache trình duyệt vẫn đọc được, chỉ là không vẽ khoá mới.
create or replace function public.viral_loop_funnel(p_from timestamptz, p_to timestamptz)
returns json
language sql security definer set search_path = public, pg_temp as $$
WITH gen AS (
  SELECT tool_id,
         count(*)                                        AS gen_runs,
         count(DISTINCT coalesce(user_id::text, anon_id)) AS gen_users
    FROM events
   WHERE event_type = 'tool_run' AND ts >= p_from AND ts < p_to AND tool_id IS NOT NULL
   GROUP BY tool_id
),
links AS (
  SELECT tool_id,
         count(*)                       AS share_links,
         count(DISTINCT owner_user_id)  AS sharers
    FROM shared_results
   WHERE created_at >= p_from AND created_at < p_to
   GROUP BY tool_id
),
shares AS (
  SELECT tool_id, count(*) AS share_acts
    FROM events
   WHERE event_type = 'share' AND ts >= p_from AND ts < p_to AND tool_id IS NOT NULL
   GROUP BY tool_id
),
views AS (
  SELECT tool_id, count(*) AS share_views
    FROM events
   WHERE event_type = 'share_view' AND ts >= p_from AND ts < p_to AND tool_id IS NOT NULL
   GROUP BY tool_id
),
ctas AS (
  SELECT tool_id, count(*) AS cta_clicks
    FROM events
   WHERE event_type = 'cta_click' AND ts >= p_from AND ts < p_to
     AND tool_id IS NOT NULL AND meta->>'from' = 'share'
   GROUP BY tool_id
),
-- B2 — ô nhập ngày sinh ngay trên trang chia sẻ. ĐỨNG RIÊNG, xem chú thích đầu file.
forms AS (
  SELECT tool_id, count(*) AS cta_form
    FROM events
   WHERE event_type = 'cta_click' AND ts >= p_from AND ts < p_to
     AND tool_id IS NOT NULL AND meta->>'from' = 'share_form'
   GROUP BY tool_id
),
signups AS (
  SELECT coalesce(tool_id, '(không rõ tool)') AS tool_id,
         count(*)                                            AS ref_signups,
         count(*) FILTER (WHERE meta->>'rewarded' = 'true')   AS ref_rewarded
    FROM events
   WHERE event_type = 'referral_signup' AND ts >= p_from AND ts < p_to
   GROUP BY 1
),
costs AS (
  SELECT tool_id, coalesce(sum((meta->>'cost_vnd')::numeric), 0)::bigint AS cost_vnd
    FROM events
   WHERE event_type = 'llm_usage' AND ts >= p_from AND ts < p_to AND tool_id IS NOT NULL
   GROUP BY tool_id
),
tools AS (
  SELECT tool_id FROM gen
  UNION SELECT tool_id FROM links
  UNION SELECT tool_id FROM shares
  UNION SELECT tool_id FROM views
  UNION SELECT tool_id FROM ctas
  UNION SELECT tool_id FROM forms
  UNION SELECT tool_id FROM signups
),
rows AS (
  SELECT t.tool_id,
         coalesce(g.gen_runs, 0)      AS gen_runs,
         coalesce(g.gen_users, 0)     AS gen_users,
         coalesce(l.share_links, 0)   AS share_links,
         coalesce(l.sharers, 0)       AS sharers,
         coalesce(s.share_acts, 0)    AS share_acts,
         coalesce(v.share_views, 0)   AS share_views,
         coalesce(c.cta_clicks, 0)    AS cta_clicks,
         coalesce(f.cta_form, 0)      AS cta_form,
         coalesce(su.ref_signups, 0)  AS ref_signups,
         coalesce(su.ref_rewarded, 0) AS ref_rewarded,
         coalesce(co.cost_vnd, 0)     AS cost_vnd,
         CASE WHEN coalesce(g.gen_users, 0) > 0
              THEN round(coalesce(su.ref_signups, 0)::numeric / g.gen_users, 3)
              ELSE NULL END           AS k_factor
    FROM tools t
    LEFT JOIN gen     g  ON g.tool_id  = t.tool_id
    LEFT JOIN links   l  ON l.tool_id  = t.tool_id
    LEFT JOIN shares  s  ON s.tool_id  = t.tool_id
    LEFT JOIN views   v  ON v.tool_id  = t.tool_id
    LEFT JOIN ctas    c  ON c.tool_id  = t.tool_id
    LEFT JOIN forms   f  ON f.tool_id  = t.tool_id
    LEFT JOIN signups su ON su.tool_id = t.tool_id
    LEFT JOIN costs   co ON co.tool_id = t.tool_id
),
rewards AS (
  SELECT coalesce(sum(amount), 0)::bigint AS credits_awarded
    FROM credit_transactions
   WHERE type LIKE 'referral%' AND amount > 0
     AND created_at >= p_from AND created_at < p_to
),
refs AS (
  SELECT count(*)::bigint AS referrals_created,
         count(*) FILTER (WHERE signup_rewarded_at IS NOT NULL)::bigint AS referrals_rewarded
    FROM referrals
   WHERE created_at >= p_from AND created_at < p_to
)
SELECT json_build_object(
  'by_tool', coalesce((SELECT json_agg(r ORDER BY r.gen_runs DESC, r.tool_id) FROM rows r), '[]'::json),
  'totals', (SELECT json_build_object(
      'gen_runs',    coalesce(sum(gen_runs), 0),
      'gen_users',   coalesce(sum(gen_users), 0),
      'share_links', coalesce(sum(share_links), 0),
      'share_acts',  coalesce(sum(share_acts), 0),
      'share_views', coalesce(sum(share_views), 0),
      'cta_clicks',  coalesce(sum(cta_clicks), 0),
      'cta_form',    coalesce(sum(cta_form), 0),
      'ref_signups', coalesce(sum(ref_signups), 0),
      'cost_vnd',    coalesce(sum(cost_vnd), 0),
      'k_factor',    CASE WHEN coalesce(sum(gen_users), 0) > 0
                          THEN round(coalesce(sum(ref_signups), 0)::numeric / sum(gen_users), 3)
                          ELSE NULL END,
      'cost_per_signup_vnd', CASE WHEN coalesce(sum(ref_signups), 0) > 0
                          THEN round(coalesce(sum(cost_vnd), 0)::numeric / sum(ref_signups))
                          ELSE NULL END
    ) FROM rows),
  'referral', (SELECT json_build_object(
      'created',          refs.referrals_created,
      'rewarded',         refs.referrals_rewarded,
      'credits_awarded',  rewards.credits_awarded,
      'reward_vnd',       rewards.credits_awarded * credit_vnd()
    ) FROM refs, rewards)
);
$$;

revoke all on function public.viral_loop_funnel(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.viral_loop_funnel(timestamptz, timestamptz) to service_role;
