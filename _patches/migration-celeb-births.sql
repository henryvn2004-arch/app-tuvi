-- ============================================================
-- "Ai Sinh Cùng Ngày Với Bạn" — kho ngày giờ sinh người nổi tiếng
--
-- Cuối mỗi bản luận giải hiện 5 người nổi tiếng cùng lá số. Chỉ DỮ KIỆN (tên ·
-- ngày · giờ · nơi sinh · nghề · ảnh · link), KHÔNG một chữ luận giải về họ —
-- vừa tránh rủi ro với người còn sống, vừa đúng mục tiêu để người dùng tự đi
-- tìm hiểu. 0 token LLM: đây là tra bảng, không phải sinh nội dung.
--
-- ── KHOÁ LÀ ÂM LỊCH, KHÔNG PHẢI NGÀY DƯƠNG ──────────────────
-- Đo trên chính engine của repo: an sao chỉ phụ thuộc (can chi năm · tháng ÂL ·
-- ngày ÂL · giờ · giới). SỐ năm âm KHÔNG vào an sao ⇒ lá số lặp đúng chu kỳ
-- 60 năm — Giáp Thân 1884/1944/2004 khác nhau 0/48 tổ hợp. Nhờ vậy người sinh
-- 1930 khớp THẲNG với người sinh 1990, và không gian khoá bị chặn ở ~21.545
-- thay vì ~40.500 ngày dương: càng gom nhiều người thì càng ĐẶC, không loãng.
-- ⚠️ `lasoKey()` của `lib/portraits/cache.ts` băm ngày DƯƠNG — KHÔNG tái dùng.
--
-- Giới tính PHẢI vào khoá T2: đo 912 lá số, nam vs nữ cùng ngày+giờ thì cung
-- Mệnh/Thân/Cục/nạp âm/14 chính tinh khác 0,0% nhưng PHỤ TINH khác 100% (vòng
-- Tràng Sinh + vòng Bác Sĩ đảo chiều theo âm dương nam nữ) và đại vận ngược
-- chiều. Bỏ giới ra thì được tầng T2b "cùng khung lá số" — nhãn vẫn trung thực.
--
-- ── GIỜ LƯU LÀ GIỜ ĐỊA PHƯƠNG NƠI SINH ──────────────────────
-- `birth_time` + `birth_tz_offset` giữ nguyên như nguồn ghi. `gio_idx` là kết
-- quả ĐÃ quy về giờ VN qua `public/tools-shared/vn-timezone.js` — CÙNG hàm mà
-- form người dùng chạy. Hai bên lệch hệ quy chiếu thì mọi phép so "trùng giờ
-- sinh" vô nghĩa mà canh giờ vẫn ra số trông hợp lệ (`npm run check:vntz`).
-- Không đọc được múi giờ ⇒ để `gio_idx` NULL, KHÔNG mặc định +7: đoán múi giờ
-- là đoán luôn canh giờ, mà canh giờ sai thì T2 cho ra "trùng lá số" GIẢ.
-- ============================================================

create table if not exists public.celeb_births (
  id            bigserial primary key,

  -- ── Danh tính ──
  -- Q-id Wikidata là khoá chống trùng DUY NHẤT đáng tin (tên trùng nhau nhiều).
  qid           text unique,
  name          text not null,
  occupation    text,
  country       text,                                   -- Q-id quốc tịch
  -- Nhóm để xếp hạng ưu tiên (Á > Mỹ > Âu > khác). Chuỗi tự do có kiểm ở tầng
  -- app — đặt enum ở DB thì thêm nhóm phải migrate.
  region        text not null default 'other',
  wiki_url      text,

  -- Ảnh Commons. P18 của Wikidata LUÔN trỏ tới Commons, mà Commons chỉ nhận
  -- ảnh license tự do ⇒ khỏi xét license từng cái. Lưu TÊN FILE, không lưu
  -- bytes: 100k ảnh × 40KB ≈ 4GB, quá tải. Serve qua upload.wikimedia.org.
  image_file    text,
  image_credit  text,                                   -- bắt buộc với CC BY-SA

  -- ── Sinh (dương lịch, GIỜ ĐỊA PHƯƠNG nơi sinh) ──
  birth_date    date not null,
  birth_time    time,                                   -- NULL = không rõ giờ
  birth_tz_off  int,                                    -- phút; NULL = không rõ
  birth_place   text,
  rodden        text,                                   -- AA/A/B/C/DD/X — độ tin cậy giờ

  -- ── Đã quy về VN + chạy qua engine (precompute, KHÔNG tính lúc chạy) ──
  gio_idx       smallint check (gio_idx between 0 and 11),
  gender        text check (gender in ('nam', 'nu')),
  key_t1        text not null,                          -- canChiNăm|thángAL|ngàyAL
  key_t2b       text,                                   -- key_t1|h<gioIdx>
  key_t2        text,                                   -- key_t2b|<gender>
  key_t0        text not null,                          -- 'MM-DD' dương lịch

  -- ── Xếp hạng nổi tiếng theo THỊ TRƯỜNG VIỆT ──
  -- pageviews vi.wikipedia là thước đo "người Việt có biết ông này không" —
  -- chính xác hơn mọi heuristic. Lấy TRUNG BÌNH 12 tháng: lấy 30 ngày thì ai
  -- đang dính scandal sẽ nhảy lên đầu.
  fame_score    real not null default 0,
  sitelinks     int,
  pv_vi         int,
  pv_en         int,
  pv_cjk        int,

  -- ── An toàn ──
  -- Chặn tay: tội phạm/độc tài/đang tai tiếng. "Bạn cùng lá số với Pol Pot" là
  -- thảm hoạ. Lọc theo nghề ở tầng nhập, cột này để rà tay phần còn sót.
  blocked       boolean not null default false,
  block_reason  text,

  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Bốn tầng tra, mỗi tầng một index. `blocked` vào index để hàng bị chặn không
-- phải quét tới; `fame_score desc` để lấy top-N khỏi phải sort.
create index if not exists celeb_births_t2_idx
  on public.celeb_births (key_t2, fame_score desc) where blocked = false;
create index if not exists celeb_births_t2b_idx
  on public.celeb_births (key_t2b, fame_score desc) where blocked = false;
create index if not exists celeb_births_t1_idx
  on public.celeb_births (key_t1, fame_score desc) where blocked = false;
create index if not exists celeb_births_t0_idx
  on public.celeb_births (key_t0, fame_score desc) where blocked = false;

-- Ảnh là điều kiện BẮT BUỘC của 5 slot hiển thị (Henry chốt), trừ ngoại lệ
-- T2/T2b — chúng hiếm (8,47%/16,27%) và là thứ đáng khoe nhất, không giấu đi
-- chỉ vì thiếu ảnh; nhánh đó dùng avatar chữ cái.
create index if not exists celeb_births_photo_idx
  on public.celeb_births (key_t1, fame_score desc)
  where blocked = false and image_file is not null;

alter table public.celeb_births enable row level security;

-- Dữ liệu công khai nhưng KHÔNG mở đường đọc trực tiếp: client đọc qua
-- `/api/v1/cung-ngay-sinh` để server áp được thứ tự ưu tiên + luật đa dạng
-- nghề. Mở select cho anon là biếu không cả kho cho người crawl.
-- Không policy nào = chỉ service key vào được.
