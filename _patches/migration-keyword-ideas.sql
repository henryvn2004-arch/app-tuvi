-- migration-keyword-ideas.sql  (bước 3 track "CMO skills" — AI SEO)
-- ============================================================
-- Kho TỪ KHOÁ dùng chung, nuôi bằng Google Suggest (autocomplete).
--
-- Vì sao cần: GSC 28 ngày chỉ đọc được tên của ĐÚNG 10 truy vấn (842 hiển thị
-- còn lại đều bị Google ẩn tên vì quá hiếm). Tức nguồn từ khoá nội bộ hiện có
-- gần như bằng không, không đủ để đặt title cho 516 trang group, càng không đủ
-- để chọn chủ đề content mới.
--
-- Suggest KHÔNG có volume — cố ý chấp nhận. Nó trả về CÁCH NGƯỜI VIỆT GÕ THẬT,
-- đó mới là thứ đang thiếu. Cột `volume` để NULL sẵn, sau này nối Google Ads
-- API (cần developer token, phải xin duyệt) thì đổ vào cùng bảng, không phải
-- dựng lại gì.
--
-- Kiến trúc: chạy trên VERCEL (container phiên Claude Code bị chặn mọi host
-- ngoài — đã thử, suggestqueries.google.com trả 403 qua proxy), cất kết quả
-- vào đây làm ASSET. Claude đọc qua Supabase MCP, pipeline content đọc để sinh
-- topic. Đúng nguyên tắc đã chốt: run-time đẻ asset, mọi thứ khác chỉ ĐỌC.
--
-- RLS: ghi qua service key (cron), đọc chỉ admin JWT — cùng pattern events /
-- autopilot_actions / content_qc_log.
-- Idempotent. Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

create table if not exists public.keyword_ideas (
  id            uuid primary key default gen_random_uuid(),
  -- Chuỗi truy vấn đã chuẩn hoá (thường, gọn khoảng trắng). UNIQUE để mỗi lượt
  -- chạy là UPSERT chứ không đẻ trùng — bảng này được quét lại hằng tuần.
  keyword       text not null unique,
  -- Gốc đã dùng để hỏi Suggest (vd 'tử vi tuổi'), giữ để biết cụm này đến từ
  -- nhánh nào khi về sau muốn cắt bớt/nới thêm gốc.
  seed          text,
  -- 'suggest' hôm nay; chừa sẵn 'gsc' | 'ads' | 'manual' cho các nguồn sau.
  source        text not null default 'suggest',
  -- Thứ hạng trong danh sách Suggest trả về (0 = Google gợi ý đầu tiên). Đây là
  -- tín hiệu độ phổ biến DUY NHẤT mà Suggest cho, dùng thay volume tạm thời.
  best_position int,
  -- Đếm số lượt chạy nhìn thấy cụm này. Cụm xuất hiện bền qua nhiều tuần đáng
  -- tin hơn cụm chỉ loé lên một lần.
  times_seen    int not null default 1,
  -- Volume để dành cho Google Ads API. NULL = chưa có số, ĐỪNG đoán.
  volume        int,
  volume_source text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists idx_keyword_ideas_seed on public.keyword_ideas (seed, best_position);
create index if not exists idx_keyword_ideas_last_seen on public.keyword_ideas (last_seen_at desc);
-- CỐ Ý KHÔNG có index trigram cho `keyword ILIKE '%…%'`: prod chưa cài `pg_trgm`,
-- và bảng này cỡ vài nghìn dòng nên quét tuần tự đã đủ nhanh. Bật cả một
-- extension chỉ để phục vụ một index chưa cần là đổi hạ tầng để lấy lợi ích
-- chưa đo được. Khi nào bảng lớn thật thì `create extension pg_trgm` rồi thêm.

alter table public.keyword_ideas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'keyword_ideas' and policyname = 'keyword_ideas_admin_read'
  ) then
    create policy keyword_ideas_admin_read on public.keyword_ideas for select
      using ((auth.jwt() ->> 'email') = 'admin@tuviminhbao.com');
  end if;
end $$;

-- ============================================================
-- Config — đổi gốc từ khoá / nhịp quét KHÔNG cần deploy.
--
-- seeds: gốc để hỏi Suggest. Bộ mặc định bám đúng thực trạng đo được:
--   - 10 truy vấn GSC đọc được tên đều xoay quanh kim lâu / ngày tốt / tử vi
--     <can chi> → 3 nhánh này chắc chắn có cầu thật, đưa vào trước.
--   - "tử vi tuổi", "tử vi năm" là đầu truy vấn của mọi trang đối thủ đang xếp
--     hạng (VietnamNet, tuvi.vn) — site đang dùng "vận hạn" là từ hẹp hơn nhiều.
-- expansions: hậu tố nối vào gốc để moi thêm nhánh (Suggest trả tối đa ~10 gợi
--   ý mỗi lượt hỏi, nên phải hỏi nhiều biến thể mới phủ được).
-- maxRequests: trần lượt gọi mỗi lần chạy — vừa để không vượt maxDuration 300s,
--   vừa để không nện endpoint không chính thức của Google.
-- ============================================================

insert into public.app_config (key, value)
values (
  'seo.keyword_suggest',
  '{
    "enabled": true,
    "hl": "vi",
    "gl": "vn",
    "maxRequests": 180,
    "delayMs": 350,
    "seeds": [
      "tử vi", "tử vi tuổi", "tử vi năm", "xem tử vi", "lá số tử vi",
      "vận hạn", "vận hạn tuổi", "sao chiếu mệnh", "hạn tam tai", "cúng sao",
      "kim lâu", "tuổi kim lâu", "xem ngày tốt", "ngày tốt", "xem ngày",
      "xem tuổi", "xem tuổi vợ chồng", "tuổi hợp làm ăn", "coi tuổi",
      "cung mệnh", "mệnh gì", "ngũ hành", "nạp âm",
      "tứ trụ", "bát tự", "phong thủy", "xem tướng", "đặt tên con"
    ],
    "expansions": [
      "", "2026", "2027", "là gì", "có tốt không", "cách tính",
      "nam", "nữ", "theo ngày sinh", "chi tiết"
    ]
  }'::jsonb
)
on conflict (key) do nothing;
