-- migration-rail-pricing.sql
-- ============================================================
-- Đưa GIÁ RAIL (trợ lý Luận Đường, mỗi tin /api/v1/chat) vào tool_pricing —
-- gộp về MỘT nguồn giá. Server đọc qua lib/billing/pricing.getToolPrice('rail-message');
-- fallback app_config 'chat.cost' nếu thiếu row. Admin sửa ngay trong trang Pricing.
-- Idempotent. Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

INSERT INTO public.tool_pricing (tool_id, credits, label, enabled, category, is_free, sort_order, description, updated_at)
VALUES ('rail-message', 5, 'Trợ lý Luận Đường — mỗi tin nhắn', true, 'chat', false, 5,
        'Giá mỗi lượt hỏi trợ lý (rail /api/v1/chat). Nguồn thật thay cho app_config chat.cost.', now())
ON CONFLICT (tool_id) DO UPDATE
  SET credits = EXCLUDED.credits, label = EXCLUDED.label, category = EXCLUDED.category,
      description = EXCLUDED.description, updated_at = now();
