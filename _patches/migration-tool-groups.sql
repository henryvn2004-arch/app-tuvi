-- ============================================================================
-- MASTER GROUPING — một nguồn chuẩn cho cách xếp công cụ, dùng ở MỌI nơi
-- ----------------------------------------------------------------------------
-- Vì sao: trước bản này cách xếp công cụ nằm ở BA mảng chép tay khác nhau và
-- chúng KHÔNG khớp nhau:
--
--   public/cong-cu.html   NEED_GROUPS   6 nhóm theo NHU CẦU   58 công cụ
--   public/app-home.html  GROUPS        8 nhóm theo BỘ MÔN    34 công cụ
--   public/shell.js       TOOLS         8 nhóm theo BỘ MÔN    34 công cụ
--
-- Tức cùng một sản phẩm nói hai kiểu với cùng một người, và thêm một công cụ
-- mới là phải sửa tay ba chỗ — quên một chỗ thì công cụ đó tàng hình mà không
-- có gì báo. (Đã xảy ra: `Tử Vi Công Sở` không có `need_tags` nên rơi khỏi mọi
-- nhóm trên /cong-cu, dù nó là công cụ MIỄN PHÍ đầu phễu.)
--
-- Sau bản này:
--   `tool_groups`             — ĐỊNH NGHĨA nhóm: tên, phụ đề, icon, thứ tự.
--   `tool_pricing.need_tags`  — công cụ nào thuộc nhóm nào (tối đa 2 nhóm).
--   `tool_pricing.app_path`   — trang trong Luận Đường (/app/...), NULL = chưa có.
--   `tool_pricing.page_path`  — trang độc lập (/tools/...), NULL = chưa có.
--   `app_config['tools.category_default_group']`
--                             — nhóm MẶC ĐỊNH suy từ `category`, để công cụ mới
--                               thêm vào là tự có nhóm thay vì rơi ra ngoài.
--
-- Mọi trang đọc chung bộ dữ liệu này qua `public/tool-prices.js`. Đổi cách xếp
-- = một câu UPDATE trong Admin, KHÔNG cần deploy, và cả ba bề mặt đổi theo.
--
-- ⚠️ Luật giữ nguyên từ bản trước: **tối đa 2 nhóm cho một công cụ**. Nhét vào
--    mọi nhóm thì nhóm nào cũng loãng và lời hứa "đúng thứ bạn đang lo" mất
--    nghĩa. Công cụ không khai `need_tags` KHÔNG biến mất — nó rơi về nhóm mặc
--    định của `category`, và nếu `category` cũng lạ thì vào nhóm "Khác" ở cuối.
-- ============================================================================

begin;

-- ── 1. Bảng định nghĩa nhóm ─────────────────────────────────────────────────
create table if not exists public.tool_groups (
  key         text primary key,
  title       text not null,
  subtitle    text,
  icon        text,
  sort_order  int  not null default 100,
  enabled     boolean not null default true,
  updated_at  timestamptz default now()
);

alter table public.tool_groups enable row level security;

-- Cùng khuôn với `tool_pricing`: ai cũng ĐỌC được (đây là danh mục công khai,
-- trang /cong-cu đọc bằng anon key), chỉ admin GHI.
drop policy if exists tool_groups_public_read on public.tool_groups;
create policy tool_groups_public_read on public.tool_groups
  for select using (true);

drop policy if exists tool_groups_admin_write on public.tool_groups;
create policy tool_groups_admin_write on public.tool_groups
  for all using (public.is_admin((auth.jwt() ->> 'email')));

-- 10 nhóm theo TÌNH HUỐNG NGƯỜI DÙNG, không theo bộ môn.
-- `icon` phải là khoá có thật trong bảng ICONS của public/nav.js — icon lạ thì
-- giao diện rơi về icon dự phòng chứ không vỡ, nhưng vẫn là sai thầm lặng.
insert into public.tool_groups (key, title, subtitle, icon, sort_order) values
  ('ban-than',  'Hiểu bản thân',             'Tính cách, điểm mạnh yếu, cả đời mình ra sao',      'user',          10),
  ('su-nghiep', 'Sự nghiệp & đồng nghiệp',   'Đổi việc, thăng tiến, làm ăn chung, đội nhóm',      'briefcase',     20),
  ('tinh-cam',  'Tình cảm & hôn nhân',       'Hợp tuổi, bạn đời, duyên nợ',                       'heart',         30),
  ('con-cai',   'Con cái & nuôi dạy',        'Sinh con, đặt tên, dạy con kiểu nào thì vào',        'baby',          40),
  ('nha-cua',   'Nhà cửa & không gian sống', 'Hướng nhà, bố trí phòng, cửa hàng',                  'home',          50),
  ('chon-ngay', 'Chọn ngày & giờ tốt',       'Cưới hỏi, làm nhà, khai trương, ký kết',             'calendar-days', 60),
  ('van-han',   'Vận hạn theo thời gian',    'Năm nay, tháng này, mười năm tới',                   'trending-up',   70),
  ('hoi-nhanh', 'Hỏi nhanh một việc',        'Đang phân vân — gieo một quẻ, rút một lá',           'sparkles',      80),
  ('tuong-mao', 'Tướng mạo & thần thái',     'Gương mặt, mắt, tay, giọng nói, sắc khí',            'smile',         90),
  ('dien-mao',  'Diện mạo & phong cách',     'Màu hợp mệnh, tóc, trang điểm, trang phục',          'palette',      100)
on conflict (key) do update
  set title = excluded.title, subtitle = excluded.subtitle,
      icon = excluded.icon, sort_order = excluded.sort_order,
      enabled = true, updated_at = now();

-- ── 2. Đường dẫn trang — để giao diện khỏi chép tay ─────────────────────────
-- Trước đây `/cong-cu` giữ một map `TOOL_URLS` chép tay và **ẩn công cụ nào
-- thiếu trong map đó**; shell thì giữ href trong mảng của riêng nó. Nghĩa là
-- thêm công cụ trong Admin xong nó vẫn không hiện ở đâu cả cho tới khi có người
-- sửa hai file. Nay đường dẫn là DỮ LIỆU.
alter table public.tool_pricing add column if not exists app_path  text;
alter table public.tool_pricing add column if not exists page_path text;

comment on column public.tool_pricing.app_path is
  'Trang trong Luận Đường, dạng /app/<slug>. NULL = chưa dựng trang shell ⇒ công cụ không hiện trong /app (đúng thiết kế, không phải sót).';
comment on column public.tool_pricing.page_path is
  'Trang độc lập ngoài shell (thường /tools/*.html). NULL = chưa có ⇒ /cong-cu sẽ trỏ về app_path.';

update public.tool_pricing t set app_path = v.app, page_path = v.page
from (values
  ('an-sao',null,'/tools/an-sao.html'),
  ('ban-do-sao','/app/ban-do-sao',null),
  ('ban-lam-viec',null,'/tools/ban-lam-viec.html'),
  ('bat-trach','/app/bat-trach','/tools/bat-trach.html'),
  ('boi-bai-tay',null,'/tools/boi-bai-tay.html'),
  ('cach-cuc',null,'/tools/cach-cuc.html'),
  ('chan-dung-tien-kiep','/app/chan-dung-tien-kiep','/tools/chan-dung-tien-kiep.html'),
  ('chan-dung-vo-chong','/app/chan-dung-vo-chong','/tools/chan-dung-vo-chong.html'),
  ('chon-ngay-tot','/app/chon-ngay','/tools/chon-ngay-tot.html'),
  ('cong-so','/app/cong-so',null),
  ('cua-hang-phong-thuy',null,'/tools/cua-hang-phong-thuy.html'),
  ('da-lieu-ai',null,'/tools/da-lieu-ai.html'),
  ('dai-van',null,'/tools/dai-van.html'),
  ('dat-ten-con','/app/dat-ten','/tools/dat-ten-con.html'),
  ('dat-ten-dn','/app/dat-ten-dn','/tools/dat-ten-doanh-nghiep.html'),
  ('day-con','/app/day-con',null),
  ('dien-tuong','/app/dien-tuong','/tools/tuong-mat-ai.html'),
  ('duyen-no-tien-kiep','/app/duyen-no-tien-kiep',null),
  ('han-nam',null,'/tools/han-nam.html'),
  ('hoang-dao','/app/hoang-dao','/tools/hoang-dao.html'),
  ('khi-sac',null,'/tools/khi-sac-ai.html'),
  ('kieu-toc-phan-tich',null,'/tools/kieu-toc-ai.html'),
  ('kieu-toc-tryon',null,'/tools/kieu-toc-ai.html'),
  ('kim-lau','/app/kim-lau','/kim-lau'),
  ('kinh-dich','/app/kinh-dich','/tools/kinh-dich.html'),
  ('ky-mon','/app/ky-mon','/tools/ky-mon.html'),
  ('laso','/app/luan-giai','/luan-giai.html'),
  ('luc-nham','/app/luc-nham','/tools/luc-nham.html'),
  ('mai-hoa','/app/mai-hoa','/tools/mai-hoa.html'),
  ('mau-sac-hop-menh',null,'/tools/mau-sac-hop-menh.html'),
  ('nap-am','/app/nap-am','/tools/nap-am.html'),
  ('ngay-tot','/app/ngay-tot','/tools/ngay-tot.html'),
  ('ngu-hanh-ten','/app/ngu-hanh-ten','/tools/ngu-hanh-ten.html'),
  ('nguoi-khac','/app/nguoi-khac',null),
  ('nhan-mach','/app/nhan-mach',null),
  ('nhan-tuong','/app/nhan-tuong','/tools/nhan-tuong-ai.html'),
  ('oracle',null,'/tools/oracle.html'),
  ('personal-color',null,'/tools/personal-color.html'),
  ('personal-color-tryon',null,'/tools/personal-color.html'),
  ('phong-thuy','/app/phong-thuy','/tools/phong-thuy.html'),
  ('phong-thuy-render',null,'/tools/phong-thuy-render.html'),
  ('sao-nam',null,'/tools/sao-nam.html'),
  ('tarot',null,'/tools/tarot.html'),
  ('than-so-hoc','/app/than-so-hoc','/tools/than-so-hoc.html'),
  ('thanh-tuong','/app/thanh-tuong','/tools/thanh-tuong-ai.html'),
  ('thanh-tuong-pro','/app/thanh-tuong-pro','/tools/thanh-tuong-pro.html'),
  ('thu-tuong','/app/thu-tuong','/tools/thu-tuong-ai.html'),
  ('trang-diem-phan-tich',null,'/tools/trang-diem-ai.html'),
  ('trang-diem-tryon',null,'/tools/trang-diem-ai.html'),
  ('trang-phuc-theo-ngay',null,'/tools/trang-phuc-theo-ngay.html'),
  ('trang-phuc-tryon',null,'/tools/trang-phuc-tryon.html'),
  ('tu-binh','/app/bat-tu','/tu-binh.html'),
  ('tu-tru',null,'/tools/tu-tru.html'),
  ('tuong-hop','/app/tuong-hop','/tools/tuong-hop.html'),
  ('van-thang',null,'/tools/van-thang.html'),
  ('xem-lam-an','/app/xem-lam-an','/xem-lam-an.html'),
  ('xem-tuoi','/app/xem-tuoi','/xem-tuoi.html'),
  ('xem-tuoi-sinh-con','/app/sinh-con','/tools/xem-tuoi-sinh-con.html')
) as v(id, app, page)
where t.tool_id = v.id;

-- ── 3. Gán nhóm cho 58 công cụ đang bật ─────────────────────────────────────
-- 🔴 KHỐI NÀY CHỈ ĐƯỢC CHẠY SAU KHI GIAO DIỆN MỚI ĐÃ DEPLOY.
--
-- Đã trả giá một lần: chạy nó trước, trong khi prod vẫn phục vụ bản `/cong-cu`
-- lọc theo 6 khoá CŨ (`cong-viec` · `tinh-duyen` · `viec-lon` · `hom-nay` ·
-- `hieu-minh` · `dang-ve`), thì `needsOf()` không khớp khoá nào ⇒ **toàn bộ 58
-- công cụ rơi vào nhóm "Khác"** ngay lập tức. Bảng `tool_groups` và hai cột
-- đường dẫn ở trên thì AN TOÀN chạy trước — chúng chỉ THÊM, bản cũ không đọc.
--
-- ⇒ Thứ tự đúng: (1) + (2) + (4) chạy trước → merge & deploy giao diện → mới
--    chạy (3). Khoá phải khớp `tool_groups.key`. Công cụ đứng ở 2 nhóm khi nó
--    thật sự trả lời hai câu hỏi khác nhau (Luận Giải vừa là "hiểu mình" vừa là
--    "sự nghiệp"), KHÔNG phải để lấp cho nhóm trông đầy.
update public.tool_pricing t set need_tags = v.tags
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

-- ── 4. Công cụ MỚI tự có nhóm ───────────────────────────────────────────────
-- Máy KHÔNG đọc được "use case" của một công cụ mới. Thứ làm được chắc chắn:
-- suy nhóm từ `category` — cột người thêm công cụ vẫn phải khai. Khai
-- `need_tags` thì cái đó THẮNG; không khai thì rơi vào nhóm mặc định dưới đây;
-- `category` cũng lạ nốt thì vào "Khác" ở cuối trang VÀ hiện trong bộ dò của
-- panel admin — cố ý không để nó biến mất, vì một công cụ tàng hình thì không
-- ai phát hiện ra là đã gán sai.
insert into public.app_config (key, value, updated_at) values (
  'tools.category_default_group',
  jsonb_build_object(
    'Bói Bài',        'hoi-nhanh',
    'Chiêm Tinh Tây', 'ban-than',
    'Công Cụ Tử Vi',  'ban-than',
    'Đặt Tên & Ngày', 'chon-ngay',
    'Huyền Học',      'hoi-nhanh',
    'Lịch Số',        'chon-ngay',
    'Luận Giải',      'ban-than',
    'Mệnh Lý',        'ban-than',
    'Phong Cách AI',  'dien-mao',
    'Phong Thủy',     'nha-cua',
    'Xem Tướng',      'tuong-mao'
  ),
  now()
) on conflict (key) do update set value = excluded.value, updated_at = now();

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- select count(*) from tool_groups where enabled;                       -- 10
-- select count(*) from tool_pricing where enabled and need_tags is null; -- 0 (trừ rail-message)
-- Công cụ mang khoá nhóm KHÔNG có trong tool_groups (phải rỗng):
--   select t.tool_id, x.tag from tool_pricing t,
--     lateral unnest(string_to_array(t.need_tags, ',')) as x(tag)
--    where t.enabled and trim(x.tag) not in (select key from tool_groups);
