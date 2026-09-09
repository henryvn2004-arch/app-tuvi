-- ============================================================================
-- Sổ lá số (user_charts, U4) — thêm nhóm quan hệ
-- ----------------------------------------------------------------------------
-- Sidebar mới gom "Lá số đã lưu" theo nhóm (Gia đình / Bạn bè / Đồng nghiệp /
-- Khác) thay vì liệt kê phẳng. Trước đây `user_charts` chỉ có `label` tự do
-- (vd "Tôi", "Vợ", "Sếp"), không có trường nào để xếp nhóm.
--
-- Cột để TEXT tự do (không enum) — API validate 4 giá trị hợp lệ, giữ đường
-- mở rộng thêm nhóm sau này không cần migration. NULL = chưa phân loại, sidebar
-- và trang /app/so-la-so gộp NULL vào nhóm "Khác" khi đếm/hiển thị.
-- ============================================================================

alter table public.user_charts
  add column if not exists relation text;

comment on column public.user_charts.relation is
  'Nhom quan he nguoi dung tu gan: gia_dinh | ban_be | dong_nghiep | khac. NULL = chua phan loai (gop vao "Khac" khi hien).';
