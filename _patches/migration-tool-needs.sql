-- ============================================================================
-- M1 + M2 — đóng gói công cụ theo NHU CẦU (nỗi lo) + đặt tên theo CÂU HỎI
-- ----------------------------------------------------------------------------
-- Vì sao: `/cong-cu` đang xếp theo BỘ MÔN (Tử Vi · Bát Tự · Kỳ Môn…) — tức theo
-- "môn học là gì" chứ không theo "người mua cần gì". Người vào phải tự biết mình
-- cần môn nào mới bấm được, trong khi câu họ thực sự gõ là "năm nay có nên nghỉ
-- việc không". Đối chiếu: click108 (Đài Loan, cùng bộ môn, 26 năm) xếp theo
-- `Tài vận 10 năm` · `Chuyển việc` · `Duyên phận` · `Con cái học hành`.
--
-- Hai cột này là DỮ LIỆU, không phải code: sửa cách gọi tên / xếp nhóm cho một
-- công cụ = một câu UPDATE trong Admin, không cần deploy.
--
--   need_tags — DANH SÁCH khoá nhóm, phân cách bằng dấu phẩy. Cho phép nhiều
--               nhóm vì một công cụ có thể trả lời hai nỗi lo khác nhau
--               (Đại Vận vừa là "công việc & tiền bạc" vừa là "hiểu chính mình").
--               ⚠️ Tối đa 2 nhóm/công cụ — nhét vào mọi nhóm thì nhóm nào cũng
--               loãng và lời hứa "đúng thứ bạn đang lo" mất nghĩa.
--               Khoá hợp lệ (khớp NEED_GROUPS trong public/cong-cu.html):
--                 cong-viec · tinh-duyen · viec-lon · hom-nay · hieu-minh · dang-ve
--               Rỗng/NULL ⇒ rơi vào nhóm "Khác", KHÔNG biến mất khỏi trang.
--
--   question  — CÂU HỎI người ta thực sự gõ, dùng làm tiêu đề thẻ ở lối xem
--               theo nhu cầu (tên bộ môn tụt xuống dòng phụ). Đây cũng chính là
--               từ khoá tìm kiếm ⇒ ăn thêm SEO. Rỗng ⇒ thẻ tự lùi về `label`.
--
-- An toàn: cả hai cột NULLABLE, không đụng dòng nào đang có, không đổi `tool_id`,
-- không đổi giá. Trang cũ (lối xem theo bộ môn) chạy y như trước.
-- ============================================================================

alter table public.tool_pricing
  add column if not exists need_tags text,
  add column if not exists question  text;

comment on column public.tool_pricing.need_tags is
  'Nhóm nhu cầu, phân cách dấu phẩy (cong-viec,tinh-duyen,viec-lon,hom-nay,hieu-minh,dang-ve). Tối đa 2. Rỗng = nhóm "Khác".';
comment on column public.tool_pricing.question is
  'Câu hỏi người dùng thực sự gõ — tiêu đề thẻ ở lối xem theo nhu cầu. Rỗng = dùng label.';

-- ─── Gán nhóm + câu hỏi ─────────────────────────────────────────────────────
-- CỐ Ý viết dưới dạng bảng values rồi update một lượt: đọc được cả 53 dòng cạnh
-- nhau nên soát được ngay công cụ nào bị bỏ sót hoặc bị nhét nhầm nhóm.

update public.tool_pricing tp
   set need_tags = v.need_tags,
       question  = v.question,
       updated_at = now()
  from (values
    -- ── Công việc & tiền bạc ──────────────────────────────────────────────
    ('laso',                 'hieu-minh,cong-viec', 'Cả đời tôi mạnh ở đâu, yếu ở đâu?'),
    ('tu-binh',              'cong-viec,hieu-minh', 'Năm nay nên giữ chỗ cũ hay đổi việc?'),
    ('dai-van',              'cong-viec,hieu-minh', 'Mười năm tới của tôi thế nào?'),
    ('xem-lam-an',           'cong-viec',           'Làm ăn chung với người này có được không?'),
    ('dat-ten-dn',           'cong-viec',           'Đặt tên công ty sao cho hợp tuổi chủ?'),
    ('ban-lam-viec',         'cong-viec',           'Bàn làm việc đặt sao cho thuận đường thăng tiến?'),
    ('cua-hang-phong-thuy',  'cong-viec',           'Cửa hàng bày sao cho đông khách?'),
    ('ky-mon',               'hom-nay,cong-viec',   'Hôm nay nên đi hướng nào, gặp ai?'),

    -- ── Tình duyên & gia đạo ──────────────────────────────────────────────
    ('xem-tuoi',             'tinh-duyen',          'Hai đứa có hợp tuổi để cưới không?'),
    ('tuong-hop',            'tinh-duyen',          'Tuổi tôi và tuổi người ấy có hợp không?'),
    ('chan-dung-vo-chong',   'tinh-duyen',          'Người bạn đời của tôi trông thế nào?'),
    ('xem-tuoi-sinh-con',    'tinh-duyen',          'Sinh con năm nào hợp tuổi bố mẹ?'),
    ('dat-ten-con',          'tinh-duyen',          'Đặt tên gì cho con hợp mệnh?'),

    -- ── Việc lớn sắp làm ──────────────────────────────────────────────────
    ('chon-ngay-tot',        'viec-lon',            'Ngày nào tốt để cưới, làm nhà, khai trương?'),
    ('kim-lau',              'viec-lon',            'Tuổi này làm nhà, cưới hỏi có phạm không?'),
    ('bat-trach',            'viec-lon',            'Nhà tôi nên quay hướng nào?'),
    ('phong-thuy',           'viec-lon',            'Bố trí nhà thế nào cho thuận?'),
    ('phong-thuy-render',    'viec-lon',            'Sửa phòng theo phong thuỷ thì trông ra sao?'),

    -- ── Hôm nay & sắp tới ─────────────────────────────────────────────────
    ('hoang-dao',            'hom-nay,viec-lon',    'Hôm nay giờ nào làm việc hệ trọng?'),
    ('ngay-tot',             'hom-nay,viec-lon',    'Tháng này ngày nào tốt?'),
    ('van-thang',            'hom-nay',             'Tháng này của tôi ra sao?'),
    ('han-nam',              'hom-nay,hieu-minh',   'Năm nay tôi có hạn gì không?'),
    ('luc-nham',             'hom-nay',             'Việc đang lo, hỏi một quẻ xem sao?'),
    ('mai-hoa',              'hom-nay',             'Gieo một quẻ cho việc đang phân vân?'),
    ('kinh-dich',            'hom-nay',             'Chuyện này nên tiến hay nên lui?'),
    ('tarot',                'hom-nay',             'Rút một lá xem chuyện này ra sao?'),
    ('oracle',               'hom-nay',             'Xin một lời chỉ dẫn cho hôm nay?'),
    ('boi-bai-tay',          'hom-nay',             'Lá bài nói gì về chuyện đang vướng?'),

    -- ── Hiểu chính mình ───────────────────────────────────────────────────
    ('an-sao',               'hieu-minh',           'Lá số của tôi trông ra sao?'),
    ('sao-nam',              'hieu-minh',           'Tổng quan lá số tôi nói lên điều gì?'),
    ('cach-cuc',             'hieu-minh',           'Lá số tôi có cách cục gì đặc biệt?'),
    ('tu-tru',               'hieu-minh',           'Bát tự của tôi gồm những gì?'),
    ('nap-am',               'hieu-minh',           'Tôi mệnh gì, hợp màu gì?'),
    ('ngu-hanh-ten',         'hieu-minh',           'Tên tôi hợp hay khắc mệnh?'),
    ('than-so-hoc',          'hieu-minh',           'Con số ngày sinh nói gì về tôi?'),
    ('ban-do-sao',           'hieu-minh',           'Bản đồ sao lúc tôi chào đời nói gì?'),
    ('chan-dung-tien-kiep',  'hieu-minh',           'Kiếp trước tôi là ai?'),
    ('dien-tuong',           'hieu-minh',           'Gương mặt tôi nói lên điều gì?'),
    ('nhan-tuong',           'hieu-minh',           'Đôi mắt tiết lộ tính cách gì?'),
    ('thu-tuong',            'hieu-minh',           'Bàn tay tôi báo trước điều gì?'),
    ('thanh-tuong',          'hieu-minh',           'Giọng nói của tôi hợp nghề gì?'),
    ('thanh-tuong-pro',      'hieu-minh',           'Giọng nói nói gì về vận khí của tôi?'),
    ('khi-sac',              'hieu-minh',           'Dạo này sắc mặt tôi báo hiệu gì?'),

    -- ── Dáng vẻ & phong cách ──────────────────────────────────────────────
    ('mau-sac-hop-menh',     'dang-ve,hieu-minh',   'Màu nào hợp mệnh tôi?'),
    ('trang-phuc-theo-ngay', 'dang-ve,hom-nay',     'Hôm nay nên mặc gì cho hợp vận?'),
    ('da-lieu-ai',           'dang-ve',             'Da tôi đang gặp vấn đề gì?'),
    ('kieu-toc-phan-tich',   'dang-ve',             'Khuôn mặt tôi hợp kiểu tóc nào?'),
    ('kieu-toc-tryon',       'dang-ve',             'Thử kiểu tóc mới lên mặt tôi xem sao?'),
    ('personal-color',       'dang-ve',             'Tông màu nào hợp với da tôi?'),
    ('personal-color-tryon', 'dang-ve',             'Thử tông màu lên chính ảnh của tôi?'),
    ('trang-diem-phan-tich', 'dang-ve',             'Tôi hợp lối trang điểm nào?'),
    ('trang-diem-tryon',     'dang-ve',             'Thử lớp trang điểm này lên mặt tôi?'),
    ('trang-phuc-tryon',     'dang-ve',             'Thử bộ đồ này lên người tôi?')
  ) as v(tool_id, need_tags, question)
 where tp.tool_id = v.tool_id;

-- `rail-message` CỐ Ý không gán: nó là đơn giá mỗi tin nhắn của rail, không phải
-- một công cụ có trang riêng. Trang `/cong-cu` nay tự ẩn mọi dòng không có URL.
