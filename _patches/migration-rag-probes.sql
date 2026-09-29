-- migration-rag-probes.sql — RAG `search_tuvi_docs` quét ĐỦ cụm ivfflat (2026-09-29)
--
-- 🔴 Lỗi: `tuvi_docs_embedding_idx` là ivfflat (lists=100) trên ~1.250 dòng, mà
-- `ivfflat.probes` mặc định = 1 ⇒ mỗi lượt tra chỉ quét 1/100 cụm (~12 dòng) RỒI
-- mới lọc `match_threshold`. Đo thật: 3 câu hỏi thử (hạn nặng, đám tang, sao lưu)
-- qua đúng đường /api/search ⇒ 0 dòng ở ngưỡng 0,55; câu "đám tang" ra 0 dòng cả ở
-- ngưỡng 0. Tức RAG của Luận Giải/Chu Trình/Vận Hạn/Xem Tuổi/rail gần như luôn rỗng.
-- Kiểm: lấy embedding đoạn 5.2 (đám tang) làm câu hỏi — probes=1 bỏ sót láng giềng
-- 0,69/0,61/0,60 mà probes=100 tìm ra.
--
-- Vá: đặt `ivfflat.probes = 100` (= số lists ⇒ quét hết, kết quả CHÍNH XÁC) bằng
-- `set_config(..., true)` NGAY ĐẦU thân hàm — chỉ sống trong transaction của lượt
-- gọi. ⚠️ KHÔNG dùng `alter function … set ivfflat.probes` được: Supabase trả 42501
-- "permission denied to set parameter". Với ~1.250 dòng, quét hết chỉ vài ms; bảng
-- lớn lên nhiều (>50k) mới cần dựng lại index với lists hợp lý.
-- Thân hàm còn lại GIỮ NGUYÊN từng dòng so với bản đang chạy (đọc bằng
-- pg_get_functiondef trước khi sửa).
create or replace function public.search_tuvi_docs(
  query_embedding vector,
  match_count integer default 5,
  match_threshold double precision default 0.3
)
returns table(id bigint, content text, source text, similarity double precision)
language plpgsql
as $function$
BEGIN
  PERFORM set_config('ivfflat.probes', '100', true);
  RETURN QUERY
  SELECT t.id, t.content, t.source,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM tuvi_docs t
  WHERE 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;
