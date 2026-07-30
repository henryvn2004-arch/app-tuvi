-- ============================================================
-- PRICING V2 — "cho thêm Lượng" thay vì đổi mức tiền VNĐ
-- ============================================================
-- Chẩn đoán dẫn tới thay đổi này (đo trên prod 2026-07-30):
--
--   30 ngày: 618 khách ghé → 6 đăng ký (0,97%) → 3 kích hoạt → 0 TRẢ TIỀN.
--   Tổng đời app: 57 user, 3 người từng nạp.
--
-- Căn nguyên KHÔNG phải "bắt đăng ký sớm" mà là: đăng ký rồi VẪN KHÔNG MUA NỔI.
--   quà đăng ký 25 Lượng · Luận Giải 150 Lượng · gói rẻ nhất 99.000đ = 50 Lượng
--   → đường ngắn nhất chạm sản phẩm chủ lực = 99.000đ × 3 = 297.000đ.
--   Tệ hơn: mua gói 199.000đ (120 Lượng) + 25 tặng = 145 < 150 → VẪN BỊ CHẶN.
-- Mà toàn bộ 438K trang SEO đều CTA về `/app/luan-giai` — tức 100% lưu lượng
-- miễn phí đang dồn về đúng món không ai đủ tiền mua.
--
-- Vốn thật (đo từ events.meta.cost_vnd): LLM chữ 35đ/lượt rail · truyện dài
-- ~600đ · ảnh gpt-image-1 1.658đ. Luận Giải bán ~214.000đ với vốn vài trăm
-- đồng — markup ~300x. Giá cũ KHÔNG bảo vệ biên, nó chỉ chặn người dùng.
--
-- HAI ĐÒN CÙNG LÚC (mỗi đòn riêng lẻ không giải được):
--   (1) gấp đôi Lượng/gói, GIỮ NGUYÊN 4 mức VNĐ (Henry chốt: mức tiền đang ok)
--   (2) hạ giá tool — vì chỉ làm (1) thì gói 99.000đ = 100 Lượng vẫn < 150.
--
-- NEO THIẾT KẾ: quà đăng ký 25 Lượng = ĐÚNG 1 bản Luận Giải đầy đủ.
-- Reverse trial không cần hạ tầng mới — dùng đúng cơ chế quà signup đang chạy
-- (`credits.signup_bonus_variants=[25]`), KHÔNG thêm bảng đếm lượt free.
-- ============================================================

begin;

-- ── 1. Giá tool ───────────────────────────────────────────────
-- CHỈ hạ nhóm tool CHỮ (vốn ~600đ/lượt). Nhóm ẢNH (chân dung, try-on,
-- phong-thuy-render) GIỮ NGUYÊN số Lượng có chủ đích: đó là món DUY NHẤT có
-- vốn thật đáng kể (1.658đ/ảnh), và việc gấp đôi Lượng/gói đã tự hạ giá thực
-- của chúng một nửa rồi. Hạ tiếp là bào vào đúng chỗ tốn tiền.
update public.tool_pricing set credits = 2,  updated_at = now() where tool_id = 'rail-message';   -- 5  → 2  (12 câu cho người mới thay vì 4-5)
update public.tool_pricing set credits = 25, updated_at = now() where tool_id = 'laso';           -- 150→ 25 (= đúng quà đăng ký)
update public.tool_pricing set credits = 20, updated_at = now() where tool_id = 'tu-binh';        -- 100→ 20
update public.tool_pricing set credits = 15, updated_at = now() where tool_id in ('xem-tuoi', 'xem-lam-an');  -- 50 → 15
update public.tool_pricing set credits = 8,  updated_at = now() where tool_id in ('dien-tuong', 'nhan-tuong', 'thu-tuong');  -- 10 → 8

-- ── 2. Gói nạp: GIỮ amount_vnd, gấp đôi credits ───────────────
-- đ/Lượng mới: 990 · 829 · 713 · 624 (giảm dần theo bậc — không bậc nào
-- ngược, để người mua gói to luôn có lợi hơn).
update public.credit_packages set credits = 100,  updated_at = now() where package_id = '50';   -- 99.000đ  → 990đ/Lượng  = 4 lá số
update public.credit_packages set credits = 240,  updated_at = now() where package_id = '120';  -- 199.000đ → 829đ/Lượng  = 9 lá số
update public.credit_packages set credits = 700,  updated_at = now() where package_id = '350';  -- 499.000đ → 713đ/Lượng  = 28 lá số
update public.credit_packages set credits = 1600, updated_at = now() where package_id = '800';  -- 999.000đ → 624đ/Lượng  = 64 lá số

-- Nhãn bonus cũ (+25%/+50%/+75%/+100%) mô tả mức bonus so với neo 2.500đ CŨ →
-- nay sai. Diễn đạt lại theo thứ người ta thật sự quan tâm: mua được mấy lá số.
update public.credit_packages set bonus_label = '4 lá số',  updated_at = now() where package_id = '50';
update public.credit_packages set bonus_label = '9 lá số',  updated_at = now() where package_id = '120';
update public.credit_packages set bonus_label = '28 lá số', updated_at = now() where package_id = '350';
update public.credit_packages set bonus_label = '64 lá số', updated_at = now() where package_id = '800';

-- ── 3. Neo giá trị 1 Lượng ────────────────────────────────────
-- Trước đây 2.500đ/Lượng nằm rải rác ở 8 chỗ (client, server, RPC báo cáo).
-- Gấp đôi Lượng/gói làm neo đó sai GẤP ĐÔI → nếu bỏ sót, panel Biên Lợi Nhuận
-- báo doanh thu chat cao gấp 2, và `autopilot-price` (đọc `dashboard_margin`
-- để quyết có tự tăng giá rail) sẽ thấy margin luôn dương nên không bao giờ
-- kích hoạt. Đặt một nguồn tra được ở đây để lần sau đổi giá không phải đi dò.
insert into public.app_config (key, value, note)
values ('credits.vnd_per_credit', to_jsonb(1000),
        'Neo quy đổi 1 Lượng ≈ VNĐ, dùng cho BÁO CÁO (doanh thu quy đổi từ Lượng đã tiêu) và gói nạp tùy chỉnh. Suy từ gói vào cửa 99.000đ/100 Lượng = 990đ. KHÔNG dùng cho topup lịch sử — các dòng đó có amount_vnd thật, hoặc rơi về ×2500 đúng với giá lúc chúng phát sinh.')
on conflict (key) do update set value = excluded.value, note = excluded.note;

-- Một chỗ tra duy nhất cho mọi RPC báo cáo. Có hàm này thì lần sau đổi neo chỉ
-- cần UPDATE app_config, không phải đi sửa từng function.
create or replace function public.credit_vnd()
returns numeric language sql stable security definer set search_path = 'public' as $$
  select coalesce((select (value #>> '{}')::numeric from app_config where key = 'credits.vnd_per_credit'), 1000);
$$;

grant execute on function public.credit_vnd() to service_role;

-- ── 4. Giá rail: đồng bộ fallback trong app_config ────────────
-- `/api/v1/chat` đọc tool_pricing['rail-message'] TRƯỚC, chỉ rơi về
-- app_config['chat.cost'] khi đọc hụt. Để lệch thì lúc Supabase chớp một nhịp
-- người dùng bị trừ 5 thay vì 2 — đúng loại lỗi không ai phát hiện được.
update public.app_config set value = to_jsonb(2) where key = 'chat.cost';

-- ── 5. RPC báo cáo: đổi neo notional 2500 → 1000 ──────────────
-- Đây là doanh thu SUY từ số Lượng đã TIÊU (không phải tiền vào ví thật) nên
-- phải theo neo mới. Các chỗ dùng coalesce(amount_vnd, amount*2500) cho dòng
-- TOPUP thì GIỮ NGUYÊN 2500 — dòng cũ thật sự đã bán ở giá đó, đổi là viết lại
-- lịch sử.
-- GIỮ NGUYÊN chữ ký (timestamptz, timestamptz) returns json và toàn bộ thân
-- hàm — chỉ đổi DUY NHẤT hằng số 2500 → tra app_config. Đổi chữ ký sẽ tạo hàm
-- OVERLOAD thứ hai chứ không thay thế bản cũ, và caller có thể bind vào bản sai.
create or replace function public.dashboard_margin(p_from timestamp with time zone, p_to timestamp with time zone)
returns json language sql security definer set search_path = 'public' as $function$
  select json_build_object(
    'chat_cost_vnd', (
      select coalesce(sum((meta->>'cost_vnd')::numeric), 0)
      from events
      where event_type = 'llm_usage' and tool_id = 'chat' and ts >= p_from and ts < p_to
    ),
    'chat_revenue_vnd', (
      select coalesce(sum(-amount), 0) * credit_vnd()
      from credit_transactions
      where type = 'chat' and amount < 0 and created_at >= p_from and created_at < p_to
    ),
    'by_tool', (
      select coalesce(json_agg(t order by t.cost_vnd desc), '[]'::json) from (
        select tool_id, count(*)::bigint as requests, sum((meta->>'cost_vnd')::numeric)::bigint as cost_vnd
        from events
        where event_type = 'llm_usage' and ts >= p_from and ts < p_to
        group by tool_id
      ) t
    )
  );
$function$;

grant execute on function public.dashboard_margin(timestamp with time zone, timestamp with time zone) to service_role;

-- ── 6. viral_loop_funnel: reward_vnd cũng dùng neo mới ────────
-- Thân hàm GIỮ NGUYÊN VERBATIM bản đang chạy trên prod (lấy qua
-- pg_get_functiondef), đổi DUY NHẤT `rewards.credits_awarded * 2500`
-- → `* credit_vnd()`. Panel "Vòng Lặp Viral" hiển thị "Lượng thưởng đã phát
-- ≈ X đ"; để 2500 thì con số đó phóng đại gấp 2,5 lần chi phí thật.
CREATE OR REPLACE FUNCTION public.viral_loop_funnel(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'reward_vnd',       rewards.credits_awarded * credit_vnd()
    ) FROM refs, rewards)
);
$function$;

GRANT EXECUTE ON FUNCTION public.viral_loop_funnel(timestamp with time zone, timestamp with time zone) TO service_role;

commit;
