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
--   `tool_groups.default_categories`
--                             — nhóm MẶC ĐỊNH suy từ `category`, để công cụ mới
--                               thêm vào là tự có nhóm thay vì rơi ra ngoài.
--
-- 🔁 HAI LƯỢT DEPLOY (Henry chốt):
--   LƯỢT 1 = file này. Đổi NGUỒN ĐỌC, giữ nguyên 6 nhóm người dùng đang thấy.
--   LƯỢT 2 = `_patches/migration-tool-groups-10-nhom.sql`. Đổi sang 10 nhóm
--            theo tình huống — THUẦN SQL, không deploy, lùi bằng một câu lệnh.
--   Chạy ngược thứ tự là đẩy toàn bộ công cụ vào nhóm "Khác" ngay lập tức;
--   đã trả giá đúng chỗ đó một lần.
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

-- ⚠️ LƯỢT 1 seed đúng 6 nhóm mà bản `NEED_GROUPS` chép tay ĐANG dùng — cách
-- xếp người dùng thấy KHÔNG đổi một chữ nào ở lượt này, chỉ đổi NGUỒN ĐỌC.
-- Việc đổi sang 10 nhóm theo tình huống là LƯỢT 2, nằm ở
-- `_patches/migration-tool-groups-10-nhom.sql` — thuần SQL, không deploy, lùi
-- được bằng một câu lệnh.
--
-- `icon` phải là khoá có thật trong bảng ICONS của public/nav.js — icon lạ thì
-- giao diện rơi về icon dự phòng chứ không vỡ, nhưng vẫn là sai thầm lặng.
insert into public.tool_groups (key, title, subtitle, icon, sort_order) values
  ('cong-viec',  'Công việc & tiền bạc', 'Đổi việc, làm ăn, đường thăng tiến', 'briefcase', 10),
  ('tinh-duyen', 'Tình duyên & gia đạo', 'Cưới hỏi, bạn đời, con cái',         'heart',     20),
  ('viec-lon',   'Việc lớn sắp làm',     'Chọn ngày, làm nhà, khai trương',    'calendar',  30),
  ('hom-nay',    'Hôm nay & sắp tới',    'Vận ngày, vận tháng, gieo một quẻ',  'sun',       40),
  ('hieu-minh',  'Hiểu chính mình',      'Lá số, bát tự, tướng mạo, con số',   'user',      50),
  ('dang-ve',    'Dáng vẻ & phong cách', 'Màu hợp mệnh, tóc, trang phục',      'sparkles',  60)
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

-- ── 3. Công cụ MỚI tự có nhóm ───────────────────────────────────────────────
-- Máy KHÔNG đọc được "use case" của một công cụ mới. Thứ làm được chắc chắn:
-- suy nhóm từ `category` — cột người thêm công cụ vẫn phải khai. Khai
-- `need_tags` thì cái đó THẮNG; không khai thì rơi vào nhóm mặc định dưới đây;
-- `category` cũng lạ nốt thì vào "Khác" ở cuối trang VÀ hiện trong bộ dò của
-- panel admin — cố ý không để nó biến mất, vì một công cụ tàng hình thì không
-- ai phát hiện ra là đã gán sai.
--
-- ⚠️ Luật này phải nằm ở bảng CÔNG KHAI. Bản đầu tao đặt vào `app_config` và
-- sai: bảng đó chỉ có policy đọc cho admin (`app_config_admin_read`), nên trình
-- duyệt người dùng không bao giờ đọc được — luật chạy đúng ở server mà chết ở
-- đúng nơi cần nó là giao diện.
alter table public.tool_groups add column if not exists default_categories text;

comment on column public.tool_groups.default_categories is
  'Danh sách `tool_pricing.category` (phân cách dấu phẩy) rơi vào nhóm này khi công cụ CHƯA khai need_tags. need_tags khai rõ thì luôn thắng. Một category chỉ nên xuất hiện ở MỘT nhóm.';

update public.tool_groups set default_categories = v.cats
from (values
  ('viec-lon',  'Phong Thủy,Đặt Tên & Ngày'),
  ('hom-nay',   'Huyền Học,Bói Bài,Lịch Số'),
  ('hieu-minh', 'Luận Giải,Công Cụ Tử Vi,Mệnh Lý,Chiêm Tinh Tây,Xem Tướng'),
  ('dang-ve',   'Phong Cách AI')
) as v(key, cats)
where tool_groups.key = v.key;

commit;

-- ── Verify (đã chạy trên prod) ──────────────────────────────────────────────
-- select count(*) from tool_groups where enabled;                        -- 6
-- Khoá need_tags không khớp tool_groups (phải 0):
--   select count(*) from tool_pricing t,
--     lateral unnest(string_to_array(coalesce(t.need_tags,''),',')) x(tag)
--    where t.enabled and trim(x.tag)<>'' and trim(x.tag) not in (select key from tool_groups);
-- Category chưa có nhóm mặc định (phải rỗng ⇒ công cụ mới không rơi ra ngoài):
--   select distinct category from tool_pricing where enabled and tool_id<>'rail-message'
--     and category not in (select trim(c) from tool_groups g,
--       lateral unnest(string_to_array(coalesce(g.default_categories,''),',')) c where trim(c)<>'');
