-- ============================================================================
-- Springboard /app — thứ tự ưu tiên tool trên lưới Trang Chủ
-- ----------------------------------------------------------------------------
-- Vì sao: lưới springboard (public/app-home.html) hiện TOÀN BỘ tool đã bật
-- ngay trên màn hình đầu (thay cho nút "Xem tất cả công cụ" gập lại trước đây).
-- Thứ tự hiện phải là QUYẾT ĐỊNH SẢN PHẨM (Henry chọn), không phải suy ra từ
-- `sort_order`/`category` — hai cột đó phục vụ trang giá (Admin) và trang
-- `/cong-cu` theo NHU CẦU, xếp khác hẳn logic "cái gì hiện trước ở springboard".
--
-- home_rank — số nguyên, NHỎ hơn hiện TRƯỚC. NULL = chưa xếp hạng, rơi xuống
-- CUỐI danh sách theo `tool_groups` (không lọt vào khối "Công cụ chính" 24 ô
-- đầu). Sửa thứ tự = một câu UPDATE trong Admin/SQL, không cần deploy.
--
-- An toàn: cột NULLABLE, không đụng dòng nào khác, không đổi giá/tên/enabled.
-- ============================================================================

alter table public.tool_pricing
  add column if not exists home_rank integer;

comment on column public.tool_pricing.home_rank is
  'Thứ tự hiện trên lưới springboard /app — số nhỏ hiện trước. NULL = chưa xếp, rơi xuống cuối nhóm của nó (xem public/app-home.html renderSpringboard).';

-- ─── Gán thứ tự — ĐÚNG danh sách Henry chốt 2026-09-09 (46 tool) ───────────
update public.tool_pricing tp
   set home_rank = v.home_rank,
       updated_at = now()
  from (values
    ('laso',                 1),
    ('chu-trinh-cuoc-doi',   2),
    ('tu-binh',              3),
    ('than-so-hoc',          4),
    ('van-han-nam',          5),
    ('gio-sinh',             6),
    ('cong-so',              7),
    ('xem-tuoi',             8),
    ('xem-lam-an',           9),
    ('chan-dung-vo-chong',  10),
    ('day-con',             11),
    ('huong-nghiep-tre',    12),
    ('ban-do-sao',          13),
    ('chan-dung-tien-kiep', 14),
    ('nap-am',              15),
    ('ngu-hanh-ten',        16),
    ('so-dep',              17),
    ('nguoi-khac',          18),
    ('nhan-mach',           19),
    ('tuong-hop',           20),
    ('dat-ten-dn',          21),
    ('duyen-no-tien-kiep',  22),
    ('xem-tuoi-sinh-con',   23),
    ('dat-ten-con',         24),
    ('phong-thuy',          25),
    ('ban-lam-viec',        26),
    ('cua-hang-phong-thuy', 27),
    ('bat-trach',           28),
    ('chon-ngay-tot',       29),
    ('hoang-dao',           30),
    ('ngay-tot',            31),
    ('kim-lau',             32),
    ('luc-nham',            33),
    ('kinh-dich',           34),
    ('mai-hoa',             35),
    ('ky-mon',              36),
    ('tarot',               37),
    ('oracle',              38),
    ('boi-bai-tay',         39),
    ('but-tuong',           40),
    ('dien-tuong',          41),
    ('nhan-tuong',          42),
    ('thu-tuong',           43),
    ('thanh-tuong',         44),
    ('thanh-tuong-pro',     45),
    ('khi-sac',             46)
  ) as v(tool_id, home_rank)
 where tp.tool_id = v.tool_id;
