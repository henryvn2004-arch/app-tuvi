-- ============================================================================
-- master_profiles — mở rộng cho trang "Các Thầy" (hellobot-ui-redesign, Đợt 3)
-- ----------------------------------------------------------------------------
-- Bảng này trước giờ CHỈ phục vụ SEO/E-E-A-T (/tac-gia, byline bài viết) —
-- xem app/tac-gia/route.ts. Đợt 1 dựng `/app/thay` bằng dữ liệu TĨNH
-- (AUTHOR_ROSTER trong shell.js). Đợt 3 nối hai thứ lại: cùng 15 thầy, cùng
-- bảng, giờ có thêm phần app cần mà SEO không cần.
--
-- Cột mới:
--   discipline  — môn chuyên (nhãn ngắn, hiện trên thẻ /app/thay)
--   tagline     — câu cửa miệng (thẻ + modal "Chọn thầy" của rail)
--   greeting    — câu chào mở đầu khi bắt đầu hội thoại với thầy đó
--   tool_ids    — công cụ (tool_pricing.tool_id) thầy đứng tên, TỐI ĐA không
--                 giới hạn nhưng mỗi công cụ chỉ thuộc MỘT thầy (ràng buộc ở
--                 tầng ứng dụng, không phải DB — xem check bên dưới)
--   sort_order  — thứ tự hiển thị trên lưới /app/thay
--   i18n        — bản dịch discipline/tagline/greeting theo locale, CHUẨN BỊ
--                 cho app đa ngôn ngữ (chưa dùng — {} là an toàn)
--
-- Tên 3 thầy từng lệch giữa shell.js và bio /tac-gia (Linh Cổ/Tam Kinh/Thiên
-- An) — Henry chốt 2026-09-24: theo shell.js (Linh Cơ/Tâm Kính/Thiên Ẩn).
-- `display_name` trong bảng này ĐÃ ĐÚNG từ trước; chỉ bio text ở
-- app/tac-gia/[slug]/route.ts bị lệch, sửa ở PR code, không sửa DB.
-- ============================================================================

begin;

alter table public.master_profiles
  add column if not exists discipline  text,
  add column if not exists tagline     text,
  add column if not exists greeting    text,
  add column if not exists tool_ids    text[] not null default '{}',
  add column if not exists sort_order  int not null default 100,
  add column if not exists i18n        jsonb not null default '{}';

-- Một công cụ chỉ thuộc MỘT thầy — quét ngược mảng tool_ids của cả 15 dòng,
-- báo lỗi rõ ràng thay vì âm thầm cho 2 thầy cùng "đứng tên" một công cụ.
do $$
declare dup text;
begin
  select t.tool_id into dup
  from public.master_profiles m, unnest(m.tool_ids) as t(tool_id)
  group by t.tool_id
  having count(*) > 1
  limit 1;
  if dup is not null then
    raise exception 'tool_id % được gán cho nhiều hơn 1 thầy', dup;
  end if;
end $$;

update public.master_profiles set
  discipline = v.discipline, tagline = v.tagline, greeting = v.greeting,
  tool_ids = v.tool_ids, sort_order = v.sort_order
from (values
  ('co-nguyet', 'Tử Vi gốc & Luận giải',
   'Xem kỹ cái gốc trước khi luận cái ngọn.',
   'Ta là Cổ Nguyệt. Đưa ngày giờ sinh ra đây, ta lập lá số rồi cùng con soi cho kỹ gốc rễ.',
   array['laso','gio-sinh','nap-am','nguoi-khac'], 10),

  ('tu-nguyen', 'Đại vận & Chu trình cuộc đời',
   'Một câu, chốt luôn — không giải thích thêm.',
   'Tử Nguyên đây. Nói đại vận thì đừng vòng vo — đưa lá số, ta chốt một câu.',
   array['chu-trinh-cuoc-doi'], 20),

  ('nhat-nguyen', 'Vận ngắn hạn & Chọn ngày',
   'Còn bao lâu nữa? Đếm ngược cho con luôn.',
   'Nhật Nguyên đây. Việc gấp thì hỏi ngay — ta tính mốc thời gian cho con trước khi con quên mất.',
   array['van-han-nam','chon-ngay-tot','ngay-tot','hoang-dao','kim-lau','xem-tuoi-sinh-con'], 30),

  ('dau-nam', 'Tình duyên & Hôn nhân',
   'Sự thật khó nghe, nhưng con cần nghe.',
   'Đẩu Nam đây. Chuyện tình cảm thì đừng ngại kể thật — ta nói thẳng, nhưng luôn vì con.',
   array['xem-tuoi','chan-dung-vo-chong'], 40),

  ('ngoc-tinh', 'Tương hợp & Duyên nợ',
   'So sánh với một điều con không ngờ tới.',
   'Ngọc Tinh đây. Duyên nợ giữa hai người, để ta kể cho con nghe theo một câu chuyện khác hẳn.',
   array['tuong-hop','chan-dung-tien-kiep','duyen-no-tien-kiep'], 50),

  ('dieu-khong', 'Sự nghiệp & Tiền bạc',
   'Đang lãng phí tài năng ở đúng chỗ này.',
   'Diệu Không đây. Chuyện tiền bạc, công việc — nói thẳng luôn cho nhanh, ta không vòng vo.',
   array['cong-so','xem-lam-an'], 60),

  ('tam-kinh', 'Bát Tự & Kỳ Môn',
   'Đối chiếu ba hệ thống để tìm điểm hội tụ.',
   'Tâm Kính đây. Đưa giờ sinh, ta soi bằng cả Bát Tự lẫn Kỳ Môn rồi nói cho con nghe điều chúng cùng chỉ tới.',
   array['tu-binh','ky-mon'], 70),

  ('huyen-khong', 'Phong Thủy',
   'Nhà cửa đặt sai hướng, người trong nhà mệt mà không biết vì sao.',
   'Huyền Không đây. Không gian con đang sống, để ta xem có đang hợp với con không.',
   array['bat-trach','phong-thuy','ban-lam-viec','cua-hang-phong-thuy'], 80),

  ('bac-minh', 'Xem Tướng',
   'Gương mặt không giấu được điều gì với người biết nhìn.',
   'Bắc Minh đây. Gửi ảnh hoặc tả cho ta nghe gương mặt, dáng đi — ta xem tướng cho con.',
   array['dien-tuong','nhan-tuong','thu-tuong','thanh-tuong','thanh-tuong-pro','but-tuong','khi-sac'], 90),

  ('linh-son', 'Sự nghiệp cạnh tranh & Nhân mạch',
   'Ai giúp được con, ai chỉ đang ngáng đường — nhìn lá số là biết.',
   'Linh Sơn đây. Vòng quan hệ của con, để ta xem ai đáng giữ, ai nên buông.',
   array['nhan-mach'], 100),

  ('thien-an', 'Đặt Tên & Dạy Con',
   'Ít lời, nhưng mỗi lời đều có cân nhắc.',
   'Thiên Ẩn đây. Chuyện con cái, tên tuổi — con cứ hỏi, ta trả lời từ tốn.',
   array['dat-ten-con','dat-ten-dn','ngu-hanh-ten','day-con','huong-nghiep-tre'], 110),

  ('linh-co', 'Kinh Dịch & Mai Hoa',
   'Một quẻ, một hình ảnh, một câu trả lời.',
   'Linh Cơ đây. Đang phân vân điều gì thì gieo một quẻ — ta đọc quẻ cho con.',
   array['kinh-dich','mai-hoa','luc-nham','oracle'], 120),

  ('thanh-hu', 'Tarot & Thần Số',
   'Rút một lá, xem con đang thật sự muốn nghe điều gì.',
   'Thanh Hư nè! Rút một lá bài hay hỏi con số may mắn, mình cùng xem nha.',
   array['tarot','boi-bai-tay','than-so-hoc','so-dep'], 130),

  ('thai-hu', 'Hỏi nhanh, phản biện',
   'Vấn đề không phải ở chỗ con tưởng.',
   'Thái Hư đây. Trước khi trả lời, ta hỏi lại con một câu đã — con có chắc đang hỏi đúng điều mình cần không?',
   array[]::text[], 140),

  ('tinh-quang', 'Chiêm tinh Tây',
   'Nhìn cả bầu trời để hiểu một con người.',
   'Tinh Quang đây. Ta nhìn lá số theo cách của thiên văn phương Tây — con muốn bắt đầu từ đâu?',
   array['ban-do-sao'], 150)
) as v(id, discipline, tagline, greeting, tool_ids, sort_order)
where master_profiles.id = v.id;

commit;

-- ============================================================================
-- FOLLOW-UP (cùng ngày) — master_profiles bật RLS nhưng KHÔNG có policy nào
-- từ trước tới giờ. Phát hiện qua get_advisors(security) sau migration trên:
-- "master_profiles has RLS enabled, but no policies exist". Mọi lượt SELECT
-- qua anon key (tool-prices.js, Đợt 3) trả về RỖNG dù bảng có dữ liệu thật —
-- KHÔNG có lỗi gì báo, chỉ lặng lẽ trống. `/tac-gia` đọc được vì nó dùng
-- SUPABASE_SERVICE_KEY (bỏ qua RLS), nên chưa ai để ý.
-- Vá cùng khuôn tool_groups/tool_pricing/home_banners: public đọc, admin ghi.
-- Đã kiểm bằng curl thật với anon key sau khi áp dụng — trả về đúng dữ liệu.
-- ============================================================================
begin;

drop policy if exists master_profiles_public_read on public.master_profiles;
create policy master_profiles_public_read on public.master_profiles
  for select using (true);

drop policy if exists master_profiles_admin_write on public.master_profiles;
create policy master_profiles_admin_write on public.master_profiles
  for all using (public.is_admin((auth.jwt() ->> 'email')));

commit;
