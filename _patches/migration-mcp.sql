-- ============================================================
-- MIGRATION: MCP Server cho tuviminhbao.com (bảng MỚI, prefix mcp_)
-- Chạy TAY trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- KHÔNG ALTER bảng nào đang có. Xóa 2 bảng này = MCP về nguyên trạng.
-- ============================================================

-- ── Khóa API (nhúng trong URL /mcp/{key}) ───────────────────
create table if not exists mcp_keys (
  key            text primary key,               -- random 24 ký tự url-safe
  tier           text not null default 'free',   -- 'free' | 'paid' | 'master'
  label          text,                           -- ghi chú (email/zalo user)
  charts_allowed int  default 1,                 -- số lá số được lưu/tra
  backtest_years int  default 1,                 -- free: 1 năm quá khứ; paid/master: -1 = vô hạn
  future_years   int  default 0,                 -- free: 0; paid: 10
  created_at     timestamptz default now(),
  active         boolean default true
);

-- ── Log usage (đếm quota + phân tích) ───────────────────────
create table if not exists mcp_usage (
  id         bigint generated always as identity primary key,
  key        text references mcp_keys(key),
  tool       text not null,
  input      jsonb,
  created_at timestamptz default now()
);

create index if not exists mcp_usage_key_tool_idx on mcp_usage (key, tool);

-- ── RLS: chỉ service role đọc/ghi (MCP route dùng service key) ─
alter table mcp_keys  enable row level security;
alter table mcp_usage enable row level security;

-- Không tạo policy nào cho anon/authenticated → mọi truy cập qua
-- service_role (bypass RLS). Client KHÔNG bao giờ chạm 2 bảng này.

-- ── Seed: 1 key test free + 1 key master (để nghiệm thu) ─────
-- Đổi/để nguyên tùy ý; đây là key demo trong README.
insert into mcp_keys (key, tier, label, charts_allowed, backtest_years, future_years)
values
  ('mcp_free_test_000000000001', 'free',   'key test free (nghiệm thu)',   1, 1, 0),
  ('mcp_master_test_00000000001','master', 'key test master (nghiệm thu)', 99, -1, 100)
on conflict (key) do nothing;
