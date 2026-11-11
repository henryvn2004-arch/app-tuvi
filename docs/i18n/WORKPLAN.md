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
| W7a / W7b | Dịch chữ giao diện: ja+ko / zh-tw+en (zh-cn sinh bằng OpenCC) | Sonnet | W4 |
| W8 | Đầu ra LLM theo ngôn ngữ (prompt, giọng, thuật ngữ, khoá cache) | Sonnet | W4 |
| W9 | Phiên dịch định kỳ hồ sơ Nghiệm Chứng (scheduled task) — pilot trước để đo nhịp | Sonnet | W6 |
| W10 | Cron SEO/GEO quốc tế: keyword-suggest theo ngôn ngữ + Naver, IndexNow, llms.txt | Sonnet | W4, W6 |
| W11 | Trang pháp lý theo nước (特商法…), 6 loại email | Sonnet | W4, W5 |
| W3b | Bát Tự: tiết khí theo thời điểm chính xác cho lịch cn/kr/jp (vn giữ nguyên) | Opus | W3 |
| W12 | Kênh chat: bỏ VNĐ/VietQR, chuyển sang link PayPal USD | Opus | W5 |

Đợt 1 (W1–W6) đã merge 2026-11-11: #1206–#1212. Đợt 2: W3b, W7–W11; W12 mở sau W11.

## Quyết định đã chốt (2026-11-11)
- **Giá gói (USD, PayPal):** Khởi Đầu 350 L $19 · Phổ Thông 800 L $39 · Cao Cấp 1.750 L $79 ·
  VIP 3.800 L $159. 1 Lượng ≈ $0,04875 (gói bậc hai). Đã áp lên prod sau deploy #1209.
  ⚠️ `amount_vnd` CHƯA định giá lại — phải sửa trước khi bật `billing.vnd_rails_enabled`.
- **Trần `nghiem-chung`:** giữ 50 hồ sơ/ngày (vẫn chạy bằng API, ~6,25 triệu đ/tháng).
- **Lịch VN lệch 1 ngày ở 4 tháng** (3/1939, 2N/1947, 4/2054, 3/2062): ghi treo, chưa sửa.
- **Tiết khí Bát Tự theo giờ:** sửa cho cn/kr/jp (W3b); vn giữ như cũ.
- **Thuật ngữ thương hiệu:**

| | ja | ko | zh-tw | en |
|---|---|---|---|---|
| Minh Bảo | 明宝 | 명보 | 明寶 | Minh Bao |
| Tử Vi Đẩu Số | 紫微斗数 | 자미두수 | 紫微斗數 | Zi Wei Dou Shu |
| Bát Tự | 四柱推命 | 사주 | 八字 | BaZi |
| Hỏi Thầy | 先生に聞く | 선생님께 묻기 | 問老師 | Ask the Master |
| Lượng | 両 | 냥 | 兩 | credits |

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
