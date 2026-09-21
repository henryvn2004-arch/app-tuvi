-- ============================================================
-- ai_crawler_hits — đếm lượt AI crawler ghé /van-dap/* (GEO)
-- ============================================================
-- Henry hỏi "làm sao biết PR GEO có tác dụng" — trả lời bằng số ĐO ĐƯỢC, không
-- phải cảm giác. Đúng bài học docs/luat/bay.md: "log của bên GỬI không chứng
-- minh bên NHẬN hiện ra" — GA4/track.js chỉ thấy trình duyệt CHẠY JS, mà
-- GPTBot/PerplexityBot/ClaudeBot không chạy JS (chính lý do /van-dap phải SSR
-- ở PR trước). Không có bảng này thì AI có ghé đọc hay không mãi mãi là đoán.
--
-- Chỉ ghi được cho ROUTE ĐỘNG (app/van-dap/*.ts) — /phuong-phap là file tĩnh
-- phục vụ qua rewrite, KHÔNG chạy qua tay Node nên không log được bằng cách
-- này; cần Vercel Edge Config/Log Drain riêng nếu muốn đo trang đó, ngoài
-- phạm vi bảng này.
--
-- Bảng thô, KHÔNG RPC: chỉ service role (SUPABASE_SERVICE_KEY) ghi, chưa cần
-- SECURITY DEFINER. RLS bật + không policy nào ⇒ mặc định KHOÁ cho anon/
-- authenticated (đọc bằng service role hoặc SQL Editor), service role luôn
-- bỏ qua RLS nên không ảnh hưởng đường ghi thật.
create table if not exists public.ai_crawler_hits (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  bot text not null,
  path text not null
);

create index if not exists ai_crawler_hits_ts_idx on public.ai_crawler_hits (ts);
create index if not exists ai_crawler_hits_bot_idx on public.ai_crawler_hits (bot);

alter table public.ai_crawler_hits enable row level security;

-- ── Kiểm sau khi chạy ────────────────────────────────────────────────────────
-- select bot, count(*), max(ts) from ai_crawler_hits group by bot order by 2 desc;
