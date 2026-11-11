# Đa ngôn ngữ — Workplan (chốt 2026-11-11)

Hướng: **một site `tuviminhbao.com`, 6 ngôn ngữ**, nhắm khách bản địa Nhật · Hàn ·
Đài · Trung + tiếng Anh. Tiếng Việt giữ nguyên ở gốc (không tiền tố URL).

## Hợp đồng chung (mọi luồng việc phải theo)
- Danh sách ngôn ngữ: `lib/i18n/locales.ts` — `vi` `en` `ja` `ko` `zh-tw` `zh-cn`.
- URL: `/<locale>/<đường dẫn cũ>` (`vi` không tiền tố). Proxy bóc tiền tố, gắn
  header `x-tvmb-locale`; route đọc qua `localeFromHeaders()`.
- Bộ chọn ngôn ngữ: tên bản ngữ (日本語, 한국어…) + icon quả địa cầu từ `nav.js`,
  **không cờ** (luật icon cấm emoji màu; cờ cho tiếng Trung là chuyện chính trị).
- `zh-cn` SINH từ `zh-tw` bằng OpenCC (tất định, 0 token) — không dịch riêng.
- SEO: nội dung phải có trong HTML server trả về (không dịch phía client),
  `hreflang` đủ 6 ngôn ngữ + `x-default` → `vi`.
- Dịch nội dung: **Sonnet chạy trong gói subscription, từ từ** — không mua thêm
  API. Engine/LLM lúc chạy: sinh thẳng bằng ngôn ngữ đích (câu chỉ định ngôn ngữ
  đặt ở USER message để giữ cache `cachedSystemFor`).

## Lịch âm theo nơi sinh
Người dùng chỉ chọn **nơi sinh**; hệ thống tự làm hai việc:
1. Giờ địa phương → thời điểm tuyệt đối (múi giờ + giờ mùa hè lịch sử, đọc từ
   IANA tzdata qua `Intl`, không gõ tay).
2. Chọn **bảng lịch âm của truyền thống nơi đó**: VN (UTC+7, UTC+8 trước 1968) ·
   Trung/Đài/HK (UTC+8) · Hàn · Nhật (UTC+9). Bảng sinh bằng
   `scripts/gen-lunar-table.mjs` (đã nhận tham số `tz`), kiểm bằng oracle.
Lý do: ngày mùng 1 là ngày chứa thời điểm sóc **tính theo múi giờ của lịch đó**.
Sóc lúc 23:30 giờ VN = 00:30 giờ Bắc Kinh hôm sau ⇒ cùng một ngày sinh, lịch VN
nói mùng 1, lịch Trung nói 30 tháng trước ⇒ hai lá số khác. Người Đài so với app
bản địa sẽ thấy mình "sai".

## Luồng việc
| # | Việc | Model | Phụ thuộc |
|---|---|---|---|
| W1 | Gỡ lịch các cron SEO tiếng Việt + cron chết | Haiku | — |
| W2 | Sửa statement timeout (cmo-digest · anomaly-alerts) | Sonnet | — |
| W3 | Lịch âm theo truyền thống + nhập nơi sinh | Opus | — |
| W4 | Khung i18n: proxy, bộ chọn, từ điển, hreflang, font CJK, trang MVP | Sonnet | — |
| W5 | PayPal USD, bỏ VND | Opus | — |
| W6 | Nghiệm Chứng/Xác Định Giờ Sinh đa ngôn ngữ (bảng dịch, lọc Wikidata, route, công cụ hàng đợi dịch) | Sonnet | — |
| W7 | Dịch chữ giao diện (từ điển của W4) | Sonnet | W4 |
| W8 | Đầu ra LLM theo ngôn ngữ (prompt, giọng, thuật ngữ) | Sonnet | W4 |
| W9 | Phiên dịch định kỳ hồ sơ Nghiệm Chứng (scheduled task) | Sonnet | W6 |
| W10 | Cron SEO/GEO quốc tế: keyword-suggest theo ngôn ngữ + Naver, IndexNow, llms.txt | Sonnet | W4, W6 |
| W11 | Trang pháp lý theo nước (特商法…), 6 loại email | Sonnet | W4, W5 |

Đợt 1 (song song): W1–W6. Đợt 2: W7–W11 khi phụ thuộc đã merge.

## Cron — quyết định
- **Giữ, chạy tiếp và dịch ra**: `nghiem-chung`, `xac-dinh-gio-sinh` (tài sản GEO).
- **Gỡ lịch** (route giữ nguyên để bật lại được): `viral-seo-pages`,
  `cron-khao-luan`, `cron-master-write`, `cron-khao-luan-tamly`, `thu-vien-build`,
  `tu-dien-sao-moi`, `topic-topup`, `keyword-suggest`, `backlink-*` (4),
  `growth-accounts`, `growth-insights`, `autopilot-*` (3), `media-build`,
  `seeding-build`, `content-pack`, `yt-drain`, `content-metrics`,
  `cron/daily-push`, `email-reminder-idle`, `email-abandoned-checkout`;
  Actions `video-build` · `warm-ngay-tot` (bỏ `schedule`, giữ chạy tay);
  pg_cron `daily-auto-pipeline`.
- **Giữ**: canh gác/digest, `cron-push`, `chat-nudge`, `tien-tri-nhac`,
  `email-broadcast-drain`, `email-cross-sell`, `zalo-token`, `prune-anon-trial`,
  `ext-metrics`, `warm-isr`, `smoke-prod`, `indexing-api`.
