-- migration-dashboard-engagement-rollup.sql  (2026-11-11, W2)
--
-- VÌ SAO: `cmo-digest` chạy 55–62 s trên trần `maxDuration = 60` (08/11→10/11 đều
-- sát trần; lượt 11/11 treo "đang chạy…") và `anomaly-alerts` 9–15 s trên trần 30 s.
-- Đo trên prod 2026-11-11 (EXPLAIN ANALYZE, CHỈ đọc, role postgres):
--   dashboard_engagement(14)  31,0 s   2.148.268 buffer hit, temp written=51.359 khối
--   bot_anon_ids(7 ngày)      10,6 s   (nguội: read=9.308)
--   bot_ua_fleets()            0,44 s
--   bot_phantom_anon_ids(7d)   0,008 s
-- `dashboard_engagement` là hàm đắt nhất và là cái quyết định độ dài của cả digest
-- (digest gọi 16 RPC SONG SONG → chạy bằng cái chậm nhất). Gốc của nó: CTE `ev` là
-- MỘT dòng cho MỖI EVENT của 60 ngày (~600k dòng), rồi bị `count(distinct who)`
-- đọc lại 13 lần (dau/wau/mau × thô/người × kỳ này/kỳ trước + daily). CTE dùng
-- nhiều lần thì Postgres vật hoá nó ra đĩa (temp written) rồi sort lại 13 lần.
--
-- SỬA: đẩy phép gom xuống mức (ngày, người) — MỘT lần quét `events`, kết quả là
-- vài chục nghìn dòng thay vì 600k — rồi mọi chỉ số DAU/WAU/MAU đọc từ đó. Đơn vị
-- đếm là `who` phân biệt trong khoảng NGÀY, nên đếm trên (ngày, who) cho ĐÚNG số cũ:
--   · `ts >= current_date - N` ⇔ `day >= current_date - N` (cùng múi giờ phiên).
--   · "người thật" = có ÍT NHẤT MỘT event không-máy trong khoảng ⇔ `bool_or(not
--     is_machine)` theo ngày, rồi `count(distinct who) filter (where human)`.
-- Chữ ký, kiểu trả về (json), SECURITY DEFINER, search_path, quyền: GIỮ NGUYÊN.
-- Bộ lọc bot vẫn là `bot_anon_ids()` — KHÔNG đổi định nghĩa "máy" (xem
-- migration-bot-phantom-detection.sql), nên con số ra giống hệt bản cũ.
--
-- HOÀN TÁC: chạy lại `public.dashboard_engagement` từ migration-dashboard-v2.sql /
-- migration-bot-phantom-detection.sql (bản trước).
--
-- ⚠️ Đối chiếu SAU KHI ÁP: so JSON với bản cũ trên cùng một thời điểm (xem mục
-- "Kiểm" cuối file) — phải trùng từng trường.

create or replace function public.dashboard_engagement(p_days integer)
returns json
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with bots as materialized (
    select b as anon_id
    from public.bot_anon_ids(current_date - 59, current_date + 1) b
  ),
  -- Một dòng cho mỗi (ngày, người). `human` = ngày đó người này có ≥1 event KHÔNG
  -- thuộc anon_id máy. Đây là lần quét `events` DUY NHẤT của hàm.
  ud as materialized (
    select e.ts::date as day,
           coalesce(e.user_id::text, e.anon_id) as who,
           bool_or(not (e.anon_id is not null and e.anon_id in (select anon_id from bots))) as human
    from public.events e
    where e.ts >= current_date - 59 and e.ts < current_date + 1
    group by 1, 2
  ),
  daily as (
    select day,
           count(distinct who) as dau,
           count(distinct who) filter (where human) as dau_human
    from ud
    where day >= current_date - (p_days - 1)
    group by 1
  ),
  days_series as (
    select gs::date as day
    from generate_series(current_date - (p_days - 1), current_date, interval '1 day') gs
  ),
  filled as (
    select ds.day, coalesce(d.dau, 0) as dau, coalesce(d.dau_human, 0) as dau_human
    from days_series ds
    left join daily d on d.day = ds.day
    order by ds.day
  )
  select json_build_object(
    'days', (select coalesce(json_agg(json_build_object(
               'day', day, 'dau', dau, 'dau_human', dau_human) order by day), '[]'::json)
             from filled),
    'dau_today',     (select count(distinct who) from ud where day >= current_date),
    'dau_yesterday', (select count(distinct who) from ud where day >= current_date - 1 and day < current_date),
    'wau',           (select count(distinct who) from ud where day >= current_date - 6),
    'wau_prev',      (select count(distinct who) from ud where day >= current_date - 13 and day < current_date - 6),
    'mau',           (select count(distinct who) from ud where day >= current_date - 29),
    'mau_prev',      (select count(distinct who) from ud where day >= current_date - 59 and day < current_date - 29),
    'dau_today_human',     (select count(distinct who) filter (where human) from ud where day >= current_date),
    'dau_yesterday_human', (select count(distinct who) filter (where human) from ud where day >= current_date - 1 and day < current_date),
    'wau_human',           (select count(distinct who) filter (where human) from ud where day >= current_date - 6),
    'wau_prev_human',      (select count(distinct who) filter (where human) from ud where day >= current_date - 13 and day < current_date - 6),
    'mau_human',           (select count(distinct who) filter (where human) from ud where day >= current_date - 29),
    'mau_prev_human',      (select count(distinct who) filter (where human) from ud where day >= current_date - 59 and day < current_date - 29)
  );
$$;

-- CREATE OR REPLACE giữ ACL; ghi lại cho chắc (REVOKE đứng TRƯỚC GRANT).
revoke all on function public.dashboard_engagement(integer) from public, anon, authenticated;
grant execute on function public.dashboard_engagement(integer) to service_role;

-- ── Kiểm (chạy tay sau khi áp; cả hai phải ra true) ─────────────────────────
-- 1) Thời gian — trước ~31 s, kỳ vọng vài giây:
--      explain (analyze, buffers, timing off) select public.dashboard_engagement(14);
-- 2) ACL không hở:
--      select proacl, prosecdef, proconfig from pg_proc where proname = 'dashboard_engagement';
--      -- proacl = {postgres=X/postgres,service_role=X/postgres}
