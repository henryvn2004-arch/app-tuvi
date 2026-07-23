-- _patches/migration-seo-stats.sql
-- Admin SEO panel (Command Center S4): tổng hợp seo_pages + laso_pregen
-- (8958 + 1444 rows, group by/count không tiện qua REST filter thường) →
-- 1 RPC JSON duy nhất. security definer + grant service_role (đọc bằng
-- SUPABASE_SERVICE_KEY từ /api/payment?action=admin-seo, verifyAdmin trước).
CREATE OR REPLACE FUNCTION admin_seo_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'seo_pages_total', (SELECT count(*) FROM seo_pages),
    'seo_pages_7d', (SELECT count(*) FROM seo_pages WHERE created_at > now() - interval '7 days'),
    'seo_pages_by_category', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT category, count(*) AS count FROM seo_pages GROUP BY category ORDER BY count(*) DESC
      ) t
    ),
    'laso_pregen_total', (SELECT count(*) FROM laso_pregen),
    'laso_pregen_7d', (SELECT count(*) FROM laso_pregen WHERE created_at > now() - interval '7 days')
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_seo_stats() TO service_role;
