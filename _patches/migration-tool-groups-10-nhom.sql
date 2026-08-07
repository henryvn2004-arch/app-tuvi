-- ============================================================================
-- LƯỢT 2 — đổi cách xếp công cụ: 6 nhóm cũ → 10 nhóm theo TÌNH HUỐNG
-- ----------------------------------------------------------------------------
-- 🔴 CHỈ CHẠY SAU KHI LƯỢT 1 ĐÃ DEPLOY (`_patches/migration-tool-groups.sql`
--    + PR "Ba bề mặt đọc chung một cách xếp công cụ"). Chạy trước là đẩy toàn
--    bộ công cụ vào nhóm "Khác" ngay lập tức, vì bản giao diện đang chạy còn
--    lọc theo 6 khoá cũ. Đã trả giá đúng chỗ đó một lần trong lúc làm.
--
-- ✅ THUẦN SQL — không deploy, không đụng một dòng code nào. Đó là cả lý do
--    tách hai lượt: nếu cách xếp mới đọc không xuôi trên máy thật thì lùi bằng
--    ĐÚNG MỘT lệnh (xem cuối file), không phải revert PR rồi chờ build.
--
-- Vì sao đổi: 6 nhóm cũ dồn 22/58 công cụ (38%) vào "Hiểu chính mình" — gom
-- Luận Giải 100 Lượng chung với Diện Tướng 8 Lượng và 10 công cụ miễn phí.
-- Nhóm to quá thì lại thành "tự mò đi", đúng bệnh mà việc phân nhóm sinh ra để
-- chữa. Panel Phễu Theo Tool còn cho thấy 3/4 công cụ có người mở đều nằm
-- trong nhóm đó — người ta vào rồi lạc.
--
-- 10 nhóm mới xếp theo TÌNH HUỐNG người dùng đang ở trong, không theo bộ môn.
-- Ba nhóm CỐ Ý không mở dù từng được nêu: Tài chính, Tâm lý, Sức khoẻ — không
-- có công cụ nào chuyên về chúng, mở ra là hứa thứ không giao. Riêng "Giải
-- trí" thì có hàng (tarot/oracle/bói bài) nhưng vẫn không mở: dán nhãn đó lên
-- Chân Dung Tiền Kiếp 25 Lượng và Duyên Nợ 30 Lượng là tự hạ giá hai món đang
-- bán đắt nhất. Chúng về "Hỏi nhanh một việc".
-- ============================================================================

begin;

-- ── 1. Thay bộ nhóm ─────────────────────────────────────────────────────────
-- Xoá sạch rồi chèn lại, KHÔNG upsert: 6 khoá cũ phải biến mất hẳn, nếu còn
-- sót thì công cụ nào vẫn mang tag cũ sẽ nằm ở một nhóm mồ côi mà không ai
-- nhìn thấy trên trang.
delete from public.tool_groups;

insert into public.tool_groups (key, title, subtitle, icon, sort_order, default_categories) values
  ('ban-than',  'Hiểu bản thân',             'Tính cách, điểm mạnh yếu, cả đời mình ra sao', 'user',          10, 'Luận Giải,Công Cụ Tử Vi,Mệnh Lý,Chiêm Tinh Tây'),
  ('su-nghiep', 'Sự nghiệp & đồng nghiệp',   'Đổi việc, thăng tiến, làm ăn chung, đội nhóm', 'briefcase',     20, null),
  ('tinh-cam',  'Tình cảm & hôn nhân',       'Hợp tuổi, bạn đời, duyên nợ',                  'heart',         30, null),
  ('con-cai',   'Con cái & nuôi dạy',        'Sinh con, đặt tên, dạy con kiểu nào thì vào',  'baby',          40, null),
  ('nha-cua',   'Nhà cửa & không gian sống', 'Hướng nhà, bố trí phòng, cửa hàng',            'home',          50, 'Phong Thủy'),
  ('chon-ngay', 'Chọn ngày & giờ tốt',       'Cưới hỏi, làm nhà, khai trương, ký kết',       'calendar-days', 60, 'Đặt Tên & Ngày,Lịch Số'),
  ('van-han',   'Vận hạn theo thời gian',    'Năm nay, tháng này, mười năm tới',             'trending-up',   70, null),
  ('hoi-nhanh', 'Hỏi nhanh một việc',        'Đang phân vân — gieo một quẻ, rút một lá',     'sparkles',      80, 'Huyền Học,Bói Bài'),
  ('tuong-mao', 'Tướng mạo & thần thái',     'Gương mặt, mắt, tay, giọng nói, sắc khí',      'smile',         90, 'Xem Tướng'),
  ('dien-mao',  'Diện mạo & phong cách',     'Màu hợp mệnh, tóc, trang điểm, trang phục',    'palette',      100, 'Phong Cách AI');

-- ── 2. Gán lại 58 công cụ ───────────────────────────────────────────────────
-- Công cụ đứng ở 2 nhóm khi nó thật sự trả lời hai câu hỏi khác nhau (Luận Giải
-- vừa là "hiểu mình" vừa là "sự nghiệp"), KHÔNG phải để lấp cho nhóm trông đầy.
-- Trần 2 nhóm giữ nguyên từ bản trước.
update public.tool_pricing t set need_tags = v.tags, updated_at = now()
from (values
  ('laso','ban-than,su-nghiep'), ('tu-binh','ban-than,su-nghiep'), ('tu-tru','ban-than'),
  ('an-sao','ban-than'), ('sao-nam','ban-than'), ('cach-cuc','ban-than'),
  ('nap-am','ban-than'), ('ngu-hanh-ten','ban-than'), ('than-so-hoc','ban-than'),
  ('ban-do-sao','ban-than'), ('chan-dung-tien-kiep','ban-than'),
  ('dien-tuong','tuong-mao'), ('nhan-tuong','tuong-mao'), ('thu-tuong','tuong-mao'),
  ('thanh-tuong','tuong-mao'), ('thanh-tuong-pro','tuong-mao'), ('khi-sac','tuong-mao'),
  ('cong-so','su-nghiep'), ('nhan-mach','su-nghiep'), ('nguoi-khac','su-nghiep'),
  ('xem-lam-an','su-nghiep'), ('dat-ten-dn','su-nghiep'),
  ('ban-lam-viec','su-nghiep,nha-cua'), ('cua-hang-phong-thuy','su-nghiep,nha-cua'),
  ('xem-tuoi','tinh-cam'), ('tuong-hop','tinh-cam'), ('chan-dung-vo-chong','tinh-cam'),
  ('duyen-no-tien-kiep','tinh-cam'),
  ('xem-tuoi-sinh-con','con-cai'), ('dat-ten-con','con-cai'), ('day-con','con-cai'),
  ('phong-thuy','nha-cua'), ('phong-thuy-render','nha-cua'), ('bat-trach','nha-cua'),
  ('chon-ngay-tot','chon-ngay'), ('ngay-tot','chon-ngay'), ('hoang-dao','chon-ngay'),
  ('kim-lau','chon-ngay,nha-cua'),
  ('han-nam','van-han'), ('van-thang','van-han'), ('dai-van','van-han,su-nghiep'),
  ('kinh-dich','hoi-nhanh'), ('mai-hoa','hoi-nhanh'), ('luc-nham','hoi-nhanh'),
  ('ky-mon','hoi-nhanh,su-nghiep'), ('tarot','hoi-nhanh'), ('oracle','hoi-nhanh'),
  ('boi-bai-tay','hoi-nhanh'),
  ('mau-sac-hop-menh','dien-mao,ban-than'), ('personal-color','dien-mao'),
  ('personal-color-tryon','dien-mao'), ('kieu-toc-phan-tich','dien-mao'),
  ('kieu-toc-tryon','dien-mao'), ('trang-diem-phan-tich','dien-mao'),
  ('trang-diem-tryon','dien-mao'), ('trang-phuc-theo-ngay','dien-mao'),
  ('trang-phuc-tryon','dien-mao'), ('da-lieu-ai','dien-mao')
) as v(id, tags)
where t.tool_id = v.id;

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- select count(*) from tool_groups where enabled;   -- 10
-- Khoá lạ (phải 0) và công cụ chưa gán (phải 0, trừ rail-message):
--   select count(*) from tool_pricing t,
--     lateral unnest(string_to_array(coalesce(t.need_tags,''),',')) x(tag)
--    where t.enabled and trim(x.tag)<>'' and trim(x.tag) not in (select key from tool_groups);
--   select count(*) from tool_pricing
--    where enabled and tool_id<>'rail-message' and coalesce(need_tags,'')='';
-- Không công cụ nào vào quá 2 nhóm:
--   select tool_id from tool_pricing t,
--     lateral unnest(string_to_array(coalesce(t.need_tags,''),',')) x(tag)
--    where t.enabled group by tool_id having count(*)>2;

-- ── LÙI VỀ 6 NHÓM CŨ ────────────────────────────────────────────────────────
-- Chạy lại `_patches/migration-tool-groups.sql` khối 1 + 3 (seed 6 nhóm +
-- default_categories) rồi khôi phục need_tags cũ. Bản need_tags cũ nằm trong
-- `_patches/migration-tool-needs.sql` và trong lịch sử git của file này.
