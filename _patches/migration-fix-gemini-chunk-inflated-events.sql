-- migration-fix-gemini-chunk-inflated-events.sql
-- ============================================================
-- SỬA TẬN GỐC dữ liệu `events.llm_usage` bị lỗi "sổ token Gemini nhân theo
-- SỐ CHUNK" (vá code 2026-09-22, xem docs/nhat-ky/2026-09.md "Sổ token Gemini
-- bị nhân theo SỐ CHUNK"). KHÔNG chỉ vá từng RPC đọc — null hoá field sai
-- NGAY TẠI NGUỒN để MỌI `sum((meta->>'cost_vnd')::numeric)` (RPC hiện có lẫn
-- báo cáo tương lai chưa viết) tự động bỏ qua các dòng này, không ai phải nhớ
-- thêm điều kiện loại trừ.
--
-- PHẠM VI ĐÃ XÁC MINH (không suy đoán):
--   · CHỈ tool_id='chat' — so sánh input_tokens theo NGÀY của các tool_id
--     khác (laso, chu-trinh-cuoc-doi, tu-binh, van-han-nam…) trong CÙNG
--     khoảng thời gian: ổn định 1k–20k, KHÔNG nhảy vọt theo output length như
--     'chat'. Đối chứng thêm: cost_vnd của 'laso' suy ngược ra input token
--     THÔ khớp đúng con số trước/sau vá — tool đó không đi qua nhánh bị lỗi
--     (rail chat dùng nhiều vòng tool-use + hội thoại dài ⇒ nhiều chunk SSE
--     hơn hẳn một report một lượt).
--   · Mốc chuyển từ SAI → ĐÚNG là 2026-09-22 08:19:40 UTC (dòng
--     `input_tokens` rơi từ hàng trăm nghìn xuống hàng chục — soi TỪNG DÒNG
--     quanh mốc, không suy từ trung bình theo ngày, vì một ngày có thể trộn
--     cả hai pha trước/sau deploy).
--   · Dòng ĐẦU TIÊN của tool_id='chat' model gemini là 2026-09-08 16:40:08 UTC
--     (trước đó KHÔNG có dòng nào — bản vá "ghi log" trước bản vá này).
--   · Xác nhận trước khi chạy: 204 dòng, tổng cost_vnd sai 1.008.561đ.
--
-- KHÔNG PHỤC HỒI được số liệu đúng — Gemini không trả lại raw chunk trail,
-- và promptTokenCount/candidatesTokenCount thật của MỖI request không suy
-- ngược được từ tổng đã cộng dồn sai (số chunk mỗi request khác nhau, không
-- lưu riêng). Theo luật CLAUDE.md "cấm bịa số — đường hụt-bảng-giá phải
-- nghiêng về tính DƯ, không tính THIẾU": thà để trống còn hơn đoán một công
-- thức phục hồi chưa verify. XOÁ field sai (không giữ số đoán), KHÔNG xoá cả
-- dòng — giữ nguyên request count để vẫn đếm được tần suất dùng thật.
-- Giá trị sai được lưu lại vào `meta.gemini_chunk_bug` để truy vết khi cần,
-- không mất dấu vết lịch sử.
--
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- KHÔNG idempotent theo nghĩa chạy lại vô hại về mặt số liệu (chạy 2 lần
-- không đổi gì thêm vì `where meta ? 'cost_vnd'` sẽ không còn khớp sau lần
-- đầu — WHERE tự bảo vệ khỏi chạy trùng).
-- ============================================================

update events
set meta = (meta - 'cost_vnd' - 'input_tokens' - 'output_tokens'
                 - 'cache_read_input_tokens' - 'cache_creation_input_tokens')
           || jsonb_build_object(
                'gemini_chunk_bug', jsonb_build_object(
                  'reason', 'Sổ token Gemini bị nhân theo số chunk SSE (vá 2026-09-22) — số dưới đây SAI, giữ lại chỉ để truy vết, KHÔNG dùng để tính chi phí',
                  'wrong_cost_vnd', meta->'cost_vnd',
                  'wrong_input_tokens', meta->'input_tokens',
                  'wrong_output_tokens', meta->'output_tokens',
                  'wrong_cache_read_input_tokens', meta->'cache_read_input_tokens'
                )
              )
where event_type = 'llm_usage'
  and tool_id = 'chat'
  and meta->>'model' ilike 'gemini%'
  and ts < '2026-09-22 08:19:40.821169+00'
  and meta ? 'cost_vnd';
