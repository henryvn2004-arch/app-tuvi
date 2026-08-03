-- Brand memory: lưu brand voice guideline làm ASSET design-time.
-- Pipeline run-time (Vercel Cron + Gemini) chỉ ĐỌC bảng này, không ghi.
--
-- Vì sao bảng RIÊNG chứ không nhét vào tuvi_docs: tuvi_docs là tri thức TỬ VI
-- (cổ thư, dùng để luận). Brand voice là luật VIẾT (dùng để kiểm văn phong).
-- Trộn chung thì RAG luận giải sẽ kéo nhầm luật văn phong vào câu trả lời tử vi.
--
-- Chiều 1024 khớp `text-embedding-3-small` + dimensions:1024 mà lib/tools/registry.ts
-- đang dùng cho search_tuvi_docs — để dùng chung một đường sinh embedding.

create table if not exists public.brand_voice_docs (
  id          bigserial primary key,
  doc_key     text        not null default 'brand-voice',
  version     text        not null,
  kind        text        not null check (kind in ('full', 'section')),
  section     text,
  content     text        not null,
  embedding   vector(1024),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Mỗi (doc_key, version, kind, section) chỉ một dòng → nạp lại không đẻ bản trùng.
create unique index if not exists brand_voice_docs_uniq
  on public.brand_voice_docs (doc_key, version, kind, coalesce(section, ''));

create index if not exists brand_voice_docs_version_idx
  on public.brand_voice_docs (doc_key, version);

-- RLS bật, KHÔNG policy = chỉ service key chạm được (cùng khuôn cron_runs).
-- Brand voice là tài sản nội bộ, không phơi cho anon.
alter table public.brand_voice_docs enable row level security;

-- Tra ngữ nghĩa từng luật. Mirror chữ ký search_tuvi_docs để client dùng lại được đường cũ.
create or replace function public.search_brand_voice(
  query_embedding vector(1024),
  match_count     int   default 6,
  match_threshold float default 0.55
)
returns table (section text, content text, similarity float)
language sql stable
as $$
  select b.section,
         b.content,
         1 - (b.embedding <=> query_embedding) as similarity
  from public.brand_voice_docs b
  where b.kind = 'section'
    and b.embedding is not null
    and 1 - (b.embedding <=> query_embedding) > match_threshold
  order by b.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.search_brand_voice(vector, int, float) from public, anon, authenticated;
grant   execute on function public.search_brand_voice(vector, int, float) to service_role;

-- Lấy trọn guideline để CHÈN THẲNG vào system prompt.
-- Style guide phải vào nguyên khối: RAG lấy 6 mảnh rời sẽ ra "luật 7 và luật 12"
-- mà thiếu luật 1 — tệ hơn là không có gì.
create or replace function public.get_brand_voice(p_version text default null)
returns text
language sql stable
as $$
  select b.content
  from public.brand_voice_docs b
  where b.doc_key = 'brand-voice'
    and b.kind = 'full'
    and (p_version is null or b.version = p_version)
  order by b.version desc
  limit 1;
$$;

revoke execute on function public.get_brand_voice(text) from public, anon, authenticated;
grant   execute on function public.get_brand_voice(text) to service_role;
