-- ============================================================
-- MIGRATION: self-serve MCP key — gắn key với tài khoản user.
-- Bổ sung cột user_id vào mcp_keys (bảng của chính MCP, additive, an toàn).
-- Chạy TAY trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

alter table mcp_keys add column if not exists user_id uuid;

create index if not exists mcp_keys_user_idx on mcp_keys (user_id) where user_id is not null;

-- Mỗi user chỉ giữ 1 key active tại một thời điểm (self-serve tạo/thu hồi).
-- Không ràng buộc unique cứng (cho phép nhiều key inactive lịch sử), logic
-- idempotent nằm ở lib/mcp/userKey.ts.
