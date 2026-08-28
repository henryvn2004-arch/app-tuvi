-- ============================================================
-- CHIA PHẦN — laso/chu-trinh-cuoc-doi bán được TỪNG PHẦN, không chỉ trọn bó
-- ============================================================
-- Henry: 40 người/102 lượt trong 60 ngày qua chạy `luan-giai` — tool được MỞ
-- nhiều nhất áp đảo (tool đứng nhì: 8 người) — nhưng giá 150 Lượng trong khi
-- quà đăng ký chỉ 25-50. Route `/api/lasotuvi` ĐÃ sinh nội dung theo từng
-- `phan` riêng (13 lượt LLM độc lập cho laso, 11 cho chu-trinh-cuoc-doi) —
-- ranh giới kỹ thuật có sẵn từ trước, chỉ cổng thanh toán đang bán sỉ nguyên
-- bó. Xem docs/nhat-ky/2026-08.md (chưa ghi — PR này thêm mục mới).
--
-- Cột MỚI, additive-only, mặc định parts=1 (không chia) — an toàn với MỌI
-- tool khác, không đổi hành vi nếu code chưa đọc cột này. Chạy TRƯỚC deploy
-- được (không có câu BẬT tính năng nào ở đây, đúng luật "dữ liệu đi sau giao
-- diện" ngược lại — ở đây dữ liệu đi TRƯỚC code đọc nó, an toàn vì code cũ
-- không biết cột `parts`/`credits_per_part` tồn tại).
--
-- `credits_per_part` NULL nghĩa là "không bán lẻ", ngay cả khi parts>1 — tool
-- ra ảnh/vision (que-phuc-hy, chân dung, try-on...) KHÔNG set cột này dù có
-- nhiều lượt LLM bên trong, vì một phát ăn ngay không chia nhỏ có ý nghĩa.
--
-- Giá dưới đây khớp ĐÚNG bảng tool_pricing đang chạy prod lúc viết migration
-- (đọc lại qua Supabase MCP 2026-08-28: laso=150, chu-trinh-cuoc-doi=250,
-- van-han-nam=250) — KHÔNG phải giá trong _patches/migration-pricing-v2.sql,
-- file đó đã lỗi thời từ 2026-08-01 theo đúng chú thích của chính nó.
--
-- Làm tròn LÊN là CỐ Ý, không phải tai nạn: 13×12=156>150, 11×23=253>250,
-- 16×16=256>250 — mua lẻ đắt hơn mua trọn, thành chiết khấu gói tự nhiên đẩy
-- người muốn xem nhiều về mua nguyên bản.
--
-- van-han-nam: chỉ ghi DATA ở đây, KHÔNG đổi client/route của nó trong PR
-- này — TONG_PHAN = 4 + SO_THANG (lib/engine/van-han-12.ts, SO_THANG=12 hằng
-- số, không đổi theo ngày) nên 16 phần là ổn định, nhưng route
-- app/api/van-han-nam/route.ts chưa được audit cho per-part billing. Cột này
-- chỉ tài liệu hoá cấu trúc thật, để dành cho lượt sau.
-- ============================================================

begin;

alter table public.tool_pricing
  add column if not exists parts integer not null default 1,
  add column if not exists credits_per_part integer;

alter table public.tool_pricing
  drop constraint if exists tool_pricing_parts_positive;
alter table public.tool_pricing
  add constraint tool_pricing_parts_positive check (parts >= 1);

update public.tool_pricing
   set parts = 13, credits_per_part = 12, updated_at = now()
 where tool_id = 'laso';

update public.tool_pricing
   set parts = 11, credits_per_part = 23, updated_at = now()
 where tool_id = 'chu-trinh-cuoc-doi';

update public.tool_pricing
   set parts = 16, credits_per_part = 16, updated_at = now()
 where tool_id = 'van-han-nam';

commit;
