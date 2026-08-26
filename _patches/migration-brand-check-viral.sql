-- _patches/migration-brand-check-viral.sql
-- ============================================================
-- NỚI LUẬT XƯNG HÔ của gate brand-check cho hai bề mặt BÀI VIẾT.
--
-- 🔴 VÌ SAO PHẢI CÓ FILE NÀY — không chạy thì cả PR vô tác dụng ở tầng gate.
-- `lib/content/brand-check.ts` khai `DEFAULT_CONFIG` làm bản DỰ PHÒNG, nhưng
-- `app_config['content.brand_check']` GHI ĐÈ nó. Prod đang giữ
-- `readerAddress: 'none'` (khao-luan) và `'quy-vi'` (nghien-cuu) — hai luật cấm
-- THẲNG việc gọi người đọc, tức đối đầu trực diện với viral core vừa đưa vào
-- prompt. Sửa TS mà quên DB là prompt dạy một đằng, gate chấm một nẻo, và mỗi
-- bài trượt còn tốn thêm một lượt LLM viết lại kéo ngược về giọng cũ.
--
-- Henry chốt (2026-08-18): viral core là luật về NỘI DUNG, không chi tiết tới
-- mức cấm đại từ ⇒ 'free' = không ép ngôi nào. Luật `mixed-address` (cấm TRỘN
-- hai lối trong một bài) GIỮ NGUYÊN, và `allowSelfRef` cũng giữ nguyên — nới
-- đúng chỗ cản, không nới bừa.
--
-- ⚠️ Dùng jsonb_set lồng nhau chứ KHÔNG ghi đè cả object: object này còn chở
-- `mode` / `enabled` / `llmTier` / dải độ dài. Đè cả cục là mất chúng rồi gate
-- lặng lẽ rơi về mặc định TS mà không ai hay.
--
-- Lùi lại: đổi '"free"' thành '"none"' / '"quy-vi"' rồi chạy lại.
-- ============================================================

update public.app_config
   set value = jsonb_set(
                 jsonb_set(value, '{profiles,khao-luan,readerAddress}', '"free"'),
                 '{profiles,nghien-cuu,readerAddress}', '"free"'
               )
 where key = 'content.brand_check';

-- Kiểm: cả hai phải ra 'free', và `mode` phải CÒN NGUYÊN 'warn'.
select value->'profiles'->'khao-luan'->>'readerAddress'  as khao_luan,
       value->'profiles'->'nghien-cuu'->>'readerAddress' as nghien_cuu,
       value->>'mode'    as mode,
       value->>'enabled' as enabled,
       value->>'llmTier' as llm_tier
  from public.app_config
 where key = 'content.brand_check';
