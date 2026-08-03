-- _patches/migration-media-autopost.sql
-- ============================================================
-- M3 (track Media Pipeline) — BẬT tự đăng, bỏ khâu duyệt tay.
--
-- M2 cố ý dựng hàng đợi rồi dừng lại chờ người bấm (tiền lệ shadow-mode M0.6).
-- Henry chốt bỏ khâu đó: "gen xong post publish luôn". File này lật đúng một
-- công tắc và thêm một trần riêng cho khâu đăng.
--
-- VÌ SAO GIỮ LẠI `social.autopost_enabled` thay vì xoá hẳn: bỏ khâu duyệt không
-- phải bỏ luôn cái phanh. Đây là đường DUY NHẤT dừng tự đăng mà không cần
-- deploy, và nội dung đã lên trang công khai thì không rút lại được như một
-- dòng DB. Muốn dừng khẩn:
--   update app_config set value='false'::jsonb where key='social.autopost_enabled';
--
-- VÌ SAO `social.publish_daily` TÁCH khỏi `social.build_daily`: hai con số trả
-- lời hai câu khác nhau — dựng bao nhiêu bài mới mỗi ngày, và đẩy ra ngoài bao
-- nhiêu bài mỗi lượt. Để chung thì không xả được backlog: hôm nào dựng 0 bài
-- cũng là hôm không đăng bài nào, dù trong kho còn hàng.
-- ============================================================

update public.app_config
   set value = 'true'::jsonb
 where key = 'social.autopost_enabled';

-- Mặc định 3/lượt = đúng nhịp dựng bài, và đủ để backlog rút dần khi có tồn.
-- Trần cứng trong code là 10 (lib/media/publish.ts) — con số ở đây chỉ hạ được
-- xuống, không nâng vượt lên trên.
insert into public.app_config (key, value)
values ('social.publish_daily', '3'::jsonb)
on conflict (key) do nothing;
