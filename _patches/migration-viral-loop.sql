-- ============================================================
-- migration-viral-loop.sql  (Viral Loop V2.4 — đo vòng lặp giới thiệu)
--
-- RPC viral_loop_funnel(p_from, p_to) → JSON cho panel admin "Vòng Lặp Viral".
-- KHÔNG tạo bảng mới: mọi mắt xích đã có chỗ ghi sẵn.
--   gen        ← events.tool_run           (tool tính ra kết quả = kích hoạt)
--   link tạo   ← shared_results            (1 dòng/link, nguồn CHUẨN)
--   share      ← events.share              (người dùng THẬT SỰ chọn kênh phát tán)
--   mở link    ← events.share_view         (mới: /ket-qua/[id] nay có track.js)
--   bấm CTA    ← events.cta_click meta.from='share'
--   đăng ký    ← events.referral_signup    (mới: /api/payment referral-register)
--
-- K-factor = số lượt giới thiệu ăn được ÷ số NGƯỜI đã tạo kết quả bằng tool đó.
-- Mẫu số là NGƯỜI (distinct user/anon) chứ không phải LƯỢT — một người vẽ 5 bức
-- vẫn là một người có thể đi mời bạn; lấy lượt làm mẫu số sẽ dìm K một cách giả.
--
-- Chi phí: events.llm_usage meta->>'cost_vnd' (đã gom sẵn cả LLM lẫn ảnh
-- gpt-image-1 theo tool_id — xem lib/agent/usage.ts).
-- ============================================================

CREATE OR REPLACE FUNCTION public.viral_loop_funnel(p_from timestamptz, p_to timestamptz)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    LEFT JOIN signups su ON su.tool_id = t.tool_id
    LEFT JOIN costs   co ON co.tool_id = t.tool_id
),
-- Tiền thưởng ĐÃ PHÁT cho người giới thiệu (cả 2 tầng: lúc referee đăng ký và
-- lúc referee nạp lần đầu) — quy 2.500đ/Lượng như phần còn lại của admin.
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
      'reward_vnd',       rewards.credits_awarded * 2500
    ) FROM refs, rewards)
);
$$;

GRANT EXECUTE ON FUNCTION public.viral_loop_funnel(timestamptz, timestamptz) TO service_role;
