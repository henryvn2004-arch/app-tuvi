-- Đợt 2 ghim search_path cho SECURITY DEFINER: 44 hàm còn lại + xoá 1 hàm chết
-- (Đợt 1 — 7 hàm để TRỐNG hẳn — xem _patches/migration-secdef-search-path.sql)
--
-- ⚠️ ĐỌC TRƯỚC KHI VIỆN DẪN: đây KHÔNG phải lỗ đang hở.
--    Đo ACL: 0/44 hàm này anon/authenticated gọi được (chỉ postgres + service_role).
--    Đây là gia cố phòng thủ theo chiều sâu. Đừng thổi thành sự cố.
--
-- 🔑 VÌ SAO ĐỢT NÀY AN TOÀN HƠN HẲN ĐỢT 1:
--    Đợt 1 đi từ TRỐNG → 'public, pg_temp' ⇒ có thể LÀM MẤT schema mà hàm đang cần,
--    nên bắt buộc phải đọc trọn thân cả 7 hàm trước khi ghim.
--    Đợt này đi từ 'public' → 'public, pg_temp' ⇒ phép CHỈ THÊM: pg_temp VỐN ĐÃ ngầm
--    nằm ở ĐẦU search_path, nêu tường minh chỉ DỜI nó xuống CUỐI. Không hàm nào mất
--    quyền tìm thấy thứ gì. Hàm chỉ hỏng nếu nó CỐ Ý dựa vào bảng TẠM che bảng thật —
--    đã đo: 0/44 hàm dùng bảng tạm.
--
-- 🔑 VÌ SAO PHẢI NÊU pg_temp TƯỜNG MINH: Postgres tìm pg_temp TRƯỚC TIÊN trừ khi nó
--    được nêu ở vị trí khác. Để 'public' trần là vẫn còn cửa che bảng thật bằng bảng
--    TẠM cùng tên. Đó là lý do 44 hàm này đang YẾU HƠN 7 hàm đã vá ở đợt 1.
--
-- Đo trước khi vá (44 hàm):
--   · 4 hàm chạm schema ngoài public — CẢ 4 đều NÊU TÊN SCHEMA tường minh
--     (dashboard_at_risk · marketing_signup_truth · promo_code_redeem → auth.* ;
--      ops_pgcron_runs → cron.*) ⇒ thêm pg_temp không đụng gì.
--   · 0 hàm dùng bảng tạm.
--   · 0 hàm gọi hàm extension (uuid_generate_v4/crypt/digest/unaccent…) không nêu schema.
--
-- ⚠️ ops_pgcron_runs PHẢI GIỮ 'cron' — nó đọc cron.job_run_details.
--    Ghim 'public, pg_temp' trần cho nó là LÀM HỎNG panel Cron của admin.

-- ── 43 hàm đang ở 'public' trần ──────────────────────────────────────────────
alter function public.admin_seo_stats()                                                   set search_path = public, pg_temp;
alter function public.anon_rail_hits_prune()                                              set search_path = public, pg_temp;
alter function public.anon_rail_trial_consume(text, text)                                 set search_path = public, pg_temp;
alter function public.anon_rail_trial_status(text)                                        set search_path = public, pg_temp;
alter function public.bot_anon_ids(timestamptz, timestamptz)                              set search_path = public, pg_temp;
alter function public.bot_ua_fleets(integer, integer, numeric)                            set search_path = public, pg_temp;
alter function public.channel_error_rate(integer)                                         set search_path = public, pg_temp;
alter function public.content_catalog_list(text, text, text, text, integer, integer, text, text) set search_path = public, pg_temp;
alter function public.content_catalog_stats()                                             set search_path = public, pg_temp;
alter function public.content_metrics_overview(integer)                                   set search_path = public, pg_temp;
alter function public.credit_vnd()                                                        set search_path = public, pg_temp;
alter function public.dashboard_at_risk(integer, integer, integer)                        set search_path = public, pg_temp;
alter function public.dashboard_content_revenue(timestamptz, timestamptz)                 set search_path = public, pg_temp;
alter function public.dashboard_engagement(integer)                                       set search_path = public, pg_temp;
alter function public.dashboard_margin(timestamptz, timestamptz)                          set search_path = public, pg_temp;
alter function public.dau_human_daily(integer)                                            set search_path = public, pg_temp;
alter function public.handle_new_user_signup()                                            set search_path = public, pg_temp;
alter function public.incr_shared_counter(text, text)                                     set search_path = public, pg_temp;
alter function public.incr_shared_result_view(text)                                       set search_path = public, pg_temp;
alter function public.marketing_acquisition(timestamptz, timestamptz)                     set search_path = public, pg_temp;
alter function public.marketing_campaigns(timestamptz, timestamptz)                       set search_path = public, pg_temp;
alter function public.marketing_cohorts(integer)                                          set search_path = public, pg_temp;
alter function public.marketing_funnel(timestamptz, timestamptz)                          set search_path = public, pg_temp;
alter function public.marketing_revenue(timestamptz, timestamptz)                         set search_path = public, pg_temp;
alter function public.marketing_signup_truth(timestamptz, timestamptz)                    set search_path = public, pg_temp;
alter function public.marketing_sources(timestamptz, timestamptz)                         set search_path = public, pg_temp;
alter function public.marketing_traffic(timestamptz, timestamptz)                         set search_path = public, pg_temp;
alter function public.onboarding_task_claim(uuid, text, integer)                          set search_path = public, pg_temp;
alter function public.payment_reconcile(integer)                                          set search_path = public, pg_temp;
alter function public.portrait_cache_touch(text, text, text)                              set search_path = public, pg_temp;
alter function public.process_referral_reward(uuid)                                       set search_path = public, pg_temp;
alter function public.process_referral_signup(uuid)                                       set search_path = public, pg_temp;
alter function public.promo_code_redeem(uuid, text)                                       set search_path = public, pg_temp;
alter function public.rail_free_consume(uuid)                                             set search_path = public, pg_temp;
alter function public.rail_free_grant(uuid, integer)                                      set search_path = public, pg_temp;
alter function public.revoke_signup_bonus(uuid, integer)                                  set search_path = public, pg_temp;
alter function public.security_audit(integer, integer, integer)                           set search_path = public, pg_temp;
alter function public.tool_funnel(timestamptz, timestamptz)                               set search_path = public, pg_temp;
alter function public.tool_funnel_lac(timestamptz, timestamptz)                           set search_path = public, pg_temp;
alter function public.tool_health(integer)                                                set search_path = public, pg_temp;
alter function public.traffic_quality(timestamptz, timestamptz)                           set search_path = public, pg_temp;
alter function public.viral_free_gen_gate(uuid, text)                                     set search_path = public, pg_temp;
alter function public.viral_loop_funnel(timestamptz, timestamptz)                         set search_path = public, pg_temp;

-- ── 1 hàm cần GIỮ schema cron ────────────────────────────────────────────────
alter function public.ops_pgcron_runs(integer)                                            set search_path = public, cron, pg_temp;

-- ── XOÁ hàm chết: handle_new_user_credits ────────────────────────────────────
-- Tàn dư của bản quà đăng ký 10 Lượng. Bản ĐANG SỐNG là handle_new_user_signup
-- (25 Lượng) gắn ở trigger on_auth_user_created trên auth.users.
-- Đo trước khi xoá: 0 trigger dùng nó · 0 phụ thuộc (view/hàm/rule) ·
-- auth.users chỉ có đúng 1 trigger là on_auth_user_created -> handle_new_user_signup.
-- Để nó nằm đó là một cái bẫy: hai hàm signup, người sau không biết cái nào sống.
--
-- Đường ĐẢO (nếu cần dựng lại — md5 thân cũ d31c2d322e5401ade9dcf6668b544b01, 347 ký tự):
--   create or replace function public.handle_new_user_credits() returns trigger
--     language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
--   BEGIN
--     PERFORM add_credits(NEW.id, 10);
--     INSERT INTO credit_transactions (user_id, amount, type, description)
--     VALUES (NEW.id, 10, 'signup_bonus', 'Credits miễn phí khi đăng ký');
--     RETURN NEW;
--   EXCEPTION WHEN OTHERS THEN
--     RETURN NEW;
--   END;
--   $fn$;
drop function if exists public.handle_new_user_credits();

-- ── SIẾT BỘ DÒ: security_audit() phải phân biệt 'public' TRẦN với 'public, pg_temp' ──
--
-- 🔴 Đợt 1 thêm mục thứ 6 `ham_thieu_search_path` nhưng điều kiện là `p.proconfig is null`
--    — tức nó CHỈ bắt hàm để TRỐNG hẳn, và MÙ với hàm ở 'public' trần.
--    Đối chứng đo được TRƯỚC khi vá: dựng một probe SECURITY DEFINER, ACL đã siết,
--    search_path = public trần ⇒ ham_thieu_search_path = [] VÀ ham_ho_cho_anon = []
--    ⇒ không mục nào của bộ dò nhìn thấy nó.
--
-- 🔑 Mà lỗ này CÓ THẬT, không phải lo hão. Red-team đo trực tiếp:
--      · hàm set search_path = public         → đọc phải bảng TẠM che bảng thật (trả 999)
--      · hàm set search_path = public, pg_temp → đọc đúng bảng thật (trả 1)
--    Postgres tìm pg_temp TRƯỚC TIÊN trừ khi nó được nêu tường minh ở vị trí khác.
--
-- ⇒ Đổi điều kiện từ "để trống" sang "KHÔNG nêu pg_temp":
--      cũ : where ... and p.prosecdef and p.proconfig is null
--      mới: where ... and p.prosecdef
--             and coalesce(array_to_string(p.proconfig, ','), '') !~ 'pg_temp'
--
-- Cách áp: KHÔNG gõ lại thân hàm (2.798 ký tự — chép tay là mở cửa cho bản đang chạy
-- lệch khỏi bản repo, bệnh đã cắn hai lần). Đọc pg_get_functiondef của bản ĐANG CHẠY,
-- replace đúng một điều kiện + một cụm chú thích, có 4 chốt assert dừng hẳn nếu không
-- khớp, rồi execute. Thân sau khi vá: md5 cf96df9b7682d75ffa499136c182c8c4 / 2.798 ký tự.
--
-- Red-team SAU khi vá (cùng probe): ham_thieu_search_path = ["__rt_baretran"]
-- và ham_ho_cho_anon = [] ⇒ ĐỎ VÌ ĐÚNG CÁI ĐANG ĐO, không lọt nhầm mục cũ.
-- Gỡ probe → về []. 0 hàm/bảng probe còn sót.
do $outer$
declare def text; def2 text;
begin
  def := pg_get_functiondef('public.security_audit'::regproc);
  if position($q$and p.prosecdef and p.proconfig is null$q$ in def) = 0 then
    raise exception 'DỪNG: không thấy điều kiện cũ — đọc lại thân hàm, đừng chạy mù';
  end if;
  if position($q$để TRỐNG search_path$q$ in def) = 0 then
    raise exception 'DỪNG: không thấy chú thích cũ';
  end if;

  def2 := replace(def,
    $q$and p.prosecdef and p.proconfig is null$q$,
    $q$and p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') !~ 'pg_temp'$q$);
  def2 := replace(def2,
    $q$để TRỐNG search_path$q$,
    $q$KHÔNG nêu pg_temp trong search_path (để trống, hoặc chỉ 'public' trần)$q$);

  if def2 = def then raise exception 'DỪNG: thay xong mà không đổi gì'; end if;
  if position($q$pg_temp'$q$ in def2) = 0 then raise exception 'DỪNG: bản mới không mang điều kiện pg_temp'; end if;

  execute def2;
end $outer$;

-- Verify sau khi chạy trọn file:
--   select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.prosecdef
--      and coalesce(array_to_string(p.proconfig,','),'') !~ 'pg_temp';   -- phải = 0
--   select security_audit(500,5,10)->>'ham_thieu_search_path';           -- phải = []
