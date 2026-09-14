-- ============================================================
-- Pha 0 (vá phễu conversion 2026-09) — mục 4/4: `tool_funnel()` đang gộp
-- CẢ lượt `tool_run` tự động (`?auto=1`, khách quen có lá số nhớ sẵn —
-- xem `Shell.autoRun()` trong shell.js) LẪN lượt khách MỚI vừa tự gõ ngày
-- sinh. Trên laso, cột "chạy" thô 30 ngày đo được 421 — nhưng ~287 trong đó
-- là `?auto=1` của khách quen quay lại, còn khách MỚI nhập form chỉ ~150.
-- Panel Marketing đang hiện con số gộp, làm laso trông khoẻ hơn hẳn thật —
-- đúng kiểu sai "xanh oan nguy hơn đỏ oan" CLAUDE.md đã ghi.
--
-- Thêm cột MỚI `chay_moi` (additive, không đổi Ý NGHĨA của `chay` cũ — nơi
-- khác có thể đang đọc `chay` là tổng lượt chạy, đổi nghĩa ngầm dưới chân là
-- một lớp bug khác). `chay` giữ nguyên = tổng mọi lượt tool_run (cũ + mới),
-- `chay_moi` = tổng trừ đi lượt mang `?auto=1` trong `path`.
--
-- Đổi kiểu trả về nên PHẢI drop trước; `create or replace` không đổi được
-- return type của hàm trả TABLE (bài học lặp lại từ migration trước).
-- ============================================================

drop function if exists public.tool_funnel(timestamptz, timestamptz);

create or replace function public.tool_funnel(p_from timestamptz, p_to timestamptz)
returns table (
  tool_id text, nhan text, gia integer,
  mo bigint, chay bigint, chay_moi bigint,
  thu bigint, bam_mo bigint, loi_moi bigint,
  mua bigint, luot_mua bigint, luong bigint
)
language sql security definer set search_path = public, pg_temp as $$
  with ev as (
    select tool_canon(e.tool_id) as tool_id, e.event_type, e.path as path,
           coalesce(e.user_id::text, e.anon_id) as ai
      from events e
     where e.ts >= p_from and e.ts < p_to and e.tool_id is not null
       and coalesce(e.user_id::text, e.anon_id) is not null
       and e.event_type in ('tool_open','tool_run','preview_shown','unlock_click','invite_shown')
  ),
  tra as (
    select tool_canon(c.type) as tool_id, c.user_id::text as ai, c.amount
      from credit_transactions c
     where c.created_at >= p_from and c.created_at < p_to and c.amount < 0
       and (c.type like 'use\_%' or c.type = 'chat')
  ),
  ds as (
    select p.tool_id, p.label, p.credits from tool_pricing p
     where p.tool_id in (select tool_id from ev union select tool_id from tra)
  )
  select d.tool_id, d.label, d.credits,
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_open'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_run'),
         -- `chay_moi`: loại lượt mang `?auto=1` — quy ước DUY NHẤT của
         -- `Shell.autoRun()` cho "trang tự chạy lại lá số đã nhớ sẵn", dùng
         -- chung mọi tool qua shell.js. `path is null` (event cũ trước khi
         -- cột này được ghi, hoặc lỗi client) tính là MỚI — không đoán bừa
         -- theo hướng loại trừ, thà đếm dư còn hơn đếm hụt khách thật.
         (select count(distinct ai) from ev
            where ev.tool_id = d.tool_id and event_type = 'tool_run'
              and (ev.path is null or ev.path !~ '(\?|&)auto=1(&|$)')),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'preview_shown'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'unlock_click'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'invite_shown'),
         (select count(distinct ai) from tra where tra.tool_id = d.tool_id),
         (select count(*) from tra where tra.tool_id = d.tool_id),
         (select coalesce(sum(-amount), 0)::bigint from tra where tra.tool_id = d.tool_id)
    from ds d
   order by 4 desc nulls last, 11 desc;
$$;

revoke all on function public.tool_funnel(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.tool_funnel(timestamptz, timestamptz) to service_role;
