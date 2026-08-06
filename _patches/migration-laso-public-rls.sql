-- migration-laso-public-rls.sql
-- Gỡ policy `laso_public anon update` — anon PATCH được MỌI dòng qua PostgREST.
--
-- Phát hiện bởi lượt chạy ĐẦU TIÊN của routine "Báo cáo COO hằng ngày" (khối
-- bảo mật 4c): policy `"laso_public anon update"` cấp cho role `public`,
-- cmd `UPDATE`, `qual = true`, KHÔNG có `WITH CHECK` ⇒ bất kỳ ai có anon key
-- (nó nằm sẵn trong mã nguồn mọi trang) đều sửa được bất kỳ dòng nào trong
-- bảng cache lá số công khai. Rủi ro: bôi bẩn nội dung trang SEO công khai.
--
-- ⚠️ THỨ TỰ BẮT BUỘC — DEPLOY CODE TRƯỚC, CHẠY SQL SAU.
-- Policy này ĐANG GÁNH VIỆC THẬT: `app/api/save-laso/route.ts` trước đây ghi
-- bằng `SUPABASE_ANON_KEY` và gọi `.update()` khi slug đã tồn tại. Chạy SQL này
-- trước khi bản vá code lên prod ⇒ MỌI lượt lưu đè lá số hỏng (la-so ·
-- luan-giai · bat-tu · tu-binh). Bản vá đổi route sang `SUPABASE_SERVICE_KEY`,
-- cùng lối `upload-laso-image/route.ts` vốn đã dùng service key trên CHÍNH
-- bảng này.
--
-- Đã đối chiếu trước khi gỡ: 4 chỗ client chạm `laso_public` qua PostgREST
-- (`la-so.html:399` · `luan-giai.html:1834` · `app-luan-giai.html:425` ·
-- `app-bat-tu.html:730`) đều là `select=` — KHÔNG chỗ nào ghi. Sau khi route
-- dùng service key thì không còn đường ghi hợp lệ nào cần policy này.

begin;

-- Kiểm TRƯỚC: phải thấy đúng dòng sắp gỡ.
select policyname, roles::text, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'laso_public'
 order by policyname;

drop policy if exists "laso_public anon update" on public.laso_public;

-- Kiểm SAU: không còn policy UPDATE nào cho anon/public trên bảng này.
select policyname, roles::text, cmd
  from pg_policies
 where schemaname = 'public' and tablename = 'laso_public'
 order by policyname;

commit;

-- CỐ Ý KHÔNG đụng 2 policy INSERT cho anon trên bảng này trong lượt vá này.
-- Sau khi route dùng service key thì về lý chúng cũng thừa, nhưng chưa dò hết
-- các đường ghi cũ (link chia sẻ, bản pregen) nên gỡ luôn là đổi hai thứ cùng
-- lúc rồi không biết cái nào làm gãy. Gỡ ở lượt sau, sau khi theo dõi vài ngày
-- thấy `save-laso` vẫn ghi bình thường.

-- CÒN LẠI, KHÔNG nằm trong file này: bảng `van_dap` có policy
-- `"anon full access for now"` (role `public`, cmd `ALL`, `qual = true`) —
-- anon xoá/sửa được mọi dòng. NẶNG HƠN lỗ này, nhưng KHÔNG gỡ thẳng được:
-- hai trang admin đang ghi `van_dap` bằng PostgREST và sống nhờ chính policy
-- đó. Phải đẩy đường ghi qua server action `verifyAdmin` + service key trước
-- (lối `apiPost` → `/api/payment` mà repo đã dùng cho mọi thứ khác), rồi mới
-- siết policy. Xem `docs/COO-ORCHESTRATOR-SCOPE.md`.
