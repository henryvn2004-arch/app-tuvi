-- ============================================================
-- laso: TẮT bán-theo-phần ở tầng SERVER (2026-09-08)
-- ============================================================
-- Bối cảnh: `migration-tool-parts.sql` (2026-08-28) đặt laso parts=13,
-- credits_per_part=12 với bất biến CỐ Ý "mua lẻ đắt hơn mua trọn"
-- (13×12=156 > 150 lúc đó). Từ đó Admin đã nâng giá TRỌN BÓ của laso
-- 150→250 (qua admin.html, KHÔNG qua migration nào — không có bản ghi
-- trong `list_migrations`) mà KHÔNG đụng credits_per_part. Bất biến vỡ:
-- 13×12=156 < 250 — mua từng phần rẻ hơn mua trọn tới 94 Lượng (~62.500đ).
--
-- Client đã bỏ nút "mua từng phần" của laso (và chu-trinh-cuoc-doi/
-- van-han-nam) trong `public/app-luan-giai.html` cùng ngày — mọi CTA giờ
-- gọi thẳng `initiateLuanGiaiChuyenSau()`, `_unlockOnePart`/`_partSlug` chỉ
-- còn là code chết giữ lại phòng roll-back. Nhưng `/api/payment?action=deduct`
-- vẫn nhận tham số `part=` và tính giá theo `tool_pricing.credits_per_part`
-- (xem `getToolParts()` — lib/billing/pricing.ts) bất kể UI có nút hay không
-- — gọi thẳng API (không qua nút) vẫn mua được 13 phần với giá 156 Lượng.
--
-- Sửa: đặt credits_per_part = NULL cho laso — theo đúng ngữ nghĩa đã ghi ở
-- `lib/billing/pricing.ts`: NULL nghĩa "không bán lẻ" dù `parts>1`.
-- `getToolParts('laso')` trả null → `/api/payment?action=deduct` từ chối
-- THẲNG mọi request có `part=` cho laso ("Tool này không bán theo phần.").
--
-- KHÔNG đổi cột `parts` (giữ 13) — cột đó còn được dùng để mô tả cấu trúc
-- sinh nội dung (13 lượt LLM độc lập, `app/api/lasotuvi/route.ts`), tách
-- biệt khỏi ý nghĩa billing.
--
-- CHƯA áp cho chu-trinh-cuoc-doi (11×23=253>250) / van-han-nam (16×16=256>250)
-- — hai tool đó KHÔNG có khe hở giá (mua lẻ vẫn đắt hơn mua trọn), dù UI đã
-- bỏ nút mua-từng-phần cùng quyết định. Cân nhắc dọn nốt cho nhất quán ở
-- lượt sau nếu Henry xác nhận.
-- ============================================================

begin;

update public.tool_pricing
   set credits_per_part = null, updated_at = now()
 where tool_id = 'laso';

commit;
