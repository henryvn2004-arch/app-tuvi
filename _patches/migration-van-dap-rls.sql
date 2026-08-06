-- migration-van-dap-rls.sql
-- Gỡ policy `van_dap: "anon full access for now"` — anon xoá/sửa được MỌI dòng.
--
-- Phát hiện bởi lượt chạy đầu tiên của routine "Báo cáo COO hằng ngày" (khối
-- bảo mật 4c), cùng lượt với lỗ `laso_public` (xem
-- `migration-laso-public-rls.sql`). Đây là lỗ NẶNG HƠN: policy cấp cho role
-- `public`, cmd `ALL`, `qual = true`, `with_check = true` ⇒ bất kỳ ai có anon
-- key (nó nằm sẵn trong mã nguồn mọi trang) đều INSERT/UPDATE/**DELETE** được
-- mọi dòng của `van_dap` — kho Khảo Luận + pipeline video.
--
-- ⚠️ THỨ TỰ BẮT BUỘC — DEPLOY CODE TRƯỚC, CHẠY SQL SAU.
--
-- 🔑 VÀ NÓ GÁNH CẢ ĐƯỜNG ĐỌC, KHÔNG CHỈ ĐƯỜNG GHI. Policy còn lại
-- (`anon read published`) chỉ cho đọc bài ĐÃ XUẤT BẢN, nên trang Nội Dung mất
-- sạch bản nháp/bản chờ nếu chỉ chuyển phần ghi mà quên phần đọc. Bản vá vì
-- vậy gom CẢ 5 lượt chạm `van_dap` của `admin.html` (3 đọc + 2 ghi) về
-- `/api/payment` (`admin-van-dap` GET, `admin-van-dap-save` POST — verifyAdmin
-- + service key). Sau khi deploy, không còn client nào chạm PostgREST:
-- `grep -n "rest/v1/van_dap" public/` phải rỗng.
--
-- Trang `public/admin-content.html` — chỗ DUY NHẤT ghi `van_dap` bằng anon
-- THUẦN — đã xoá ở cùng nhánh (trang mồ côi, không file nào link tới, code bị
-- chép trùng nguyên khối trong `admin.html`).

begin;

-- Kiểm TRƯỚC: phải thấy đúng 3 policy, trong đó có dòng ALL/public sắp gỡ.
select policyname, roles::text, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'van_dap'
 order by policyname;

drop policy if exists "anon full access for now" on public.van_dap;

-- Kiểm SAU: chỉ còn `anon read published` (SELECT có điều kiện) và
-- `service_role full access`. KHÔNG còn policy nào cấp quyền GHI cho
-- anon/public.
select policyname, roles::text, cmd
  from pg_policies
 where schemaname = 'public' and tablename = 'van_dap'
 order by policyname;

commit;

-- SAU KHI CHẠY, kiểm bằng tay trên trang Admin → Nội Dung:
--   1. Bảng hiện đủ bài (gồm cả `draft`/`ready`, không chỉ `published`).
--   2. Sửa một bài rồi Lưu → không báo lỗi.
--   3. Tạo bài mới → không báo lỗi.
-- Cả 3 đều đi qua service key nên KHÔNG phụ thuộc policy nào nữa. Nếu bước 1
-- chỉ ra bài `published`, nghĩa là bản vá code CHƯA lên prod — chạy SQL sớm
-- quá; deploy rồi tải lại trang.
