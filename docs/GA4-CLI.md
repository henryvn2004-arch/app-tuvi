# Nối Google Analytics 4 vào phiên làm việc với Claude

Mục tiêu: để Claude (và cả Henry) **đọc thẳng số GA4 trong terminal** rồi phân tích —
nguồn traffic, trang nào kéo khách, thiết bị, sự kiện, so tuần này với tuần trước —
thay vì phải chụp màn hình dashboard GA4 dán vào chat.

Công cụ: `scripts/ga4.mjs` (thuần Node, không thêm dependency).
Quyền dùng: **CHỈ ĐỌC** (`analytics.readonly`) — không sửa được gì trong GA4.

Property của site: **`533053153`** (Measurement ID `G-F4XNRS2XT0`, khai trong `public/nav.js`).

---

## 1. Việc tay một lần (Henry làm, ~10 phút)

### Bước 1 — Bật API

Google Cloud Console → chọn project đang chứa service account của site →
**APIs & Services → Library** → tìm **"Google Analytics Data API"** → **Enable**.

### Bước 2 — Có sẵn service account thì dùng lại

Repo đã dùng service account cho Search Console + Indexing API
(`scripts/indexing-api.mjs`, `scripts/gsc-self-verify.mjs`) — file key JSON
Henry đang giữ ở máy (`tuvi-minh-bao-*.json`). **Dùng lại đúng key đó được**,
không cần tạo mới. Nếu muốn key riêng: IAM → Service Accounts → Create → Keys →
Add key → JSON.

### Bước 3 — Cấp quyền đọc property GA4

GA4 → **Admin** → cột Property → **Property Access Management** → nút `+` →
dán **email của service account** (dạng `...@....iam.gserviceaccount.com`,
nằm trong file JSON ở khoá `client_email`) → vai trò **Viewer** → Add.

> Bỏ bước này thì API trả **403** — script sẽ nói thẳng lý do và nhắc lại bước này.

### Bước 4 — Đưa credential vào chỗ Claude chạy được

Có 2 đường, chọn 1:

**A. Phiên Claude Code trên web (khuyên dùng — set 1 lần, phiên nào cũng đọc được).**
Vào cấu hình environment của Claude Code (nơi đang set `SUPABASE_SERVICE_KEY`,
`GA4_PROPERTY_ID`… cho session), thêm 2 biến:

| Biến | Giá trị |
|---|---|
| `GA4_PROPERTY_ID` | `533053153` |
| `GA4_SERVICE_ACCOUNT_JSON` | **toàn bộ nội dung** file JSON key (raw, hoặc base64 nếu chỗ nhập nuốt xuống dòng) |

**B. Chạy tại máy Henry** (không cần đưa key lên đâu cả):

```bash
node scripts/ga4.mjs traffic --sa "C:\Users\DELL\Desktop\tuvi-minh-bao-xxxx.json" --property 533053153
```

rồi dán output vào chat.

> ⚠️ **Đừng dán nội dung file JSON key thẳng vào khung chat.** Đó là private key,
> dán vào chat là nó nằm trong lịch sử hội thoại. Đưa qua env/file như trên.
> (Cùng lý do đã phải rotate service_role key Supabase hồi tháng 6.)

---

## 2. Dùng

```bash
node scripts/ga4.mjs help                 # xem toàn bộ preset + cú pháp

node scripts/ga4.mjs overview             # tổng quan 28 ngày
node scripts/ga4.mjs daily --from 90daysAgo
node scripts/ga4.mjs traffic              # nguồn/kênh
node scripts/ga4.mjs channels             # nhóm kênh mặc định (Organic/Direct/Social…)
node scripts/ga4.mjs campaigns            # chiến dịch UTM
node scripts/ga4.mjs pages --limit 40     # trang xem nhiều nhất
node scripts/ga4.mjs landing              # trang đáp
node scripts/ga4.mjs events               # sự kiện
node scripts/ga4.mjs devices | countries | referrers | realtime
```

Báo cáo tự chọn (bất kỳ dimension/metric nào GA4 có):

```bash
node scripts/ga4.mjs report \
  --dimensions date,sessionSource \
  --metrics sessions,newUsers,engagementRate \
  --from 2026-07-01 --to 2026-07-27 \
  --order -sessions --limit 50

node scripts/ga4.mjs metadata --q source   # tra tên dimension/metric hợp lệ
```

Cờ chung:

| Cờ | Ý nghĩa |
|---|---|
| `--from` / `--to` | `YYYY-MM-DD`, hoặc `28daysAgo` / `yesterday` / `today` (mặc định 28 ngày) |
| `--limit` | số dòng (mặc định 25) |
| `--order` | `-sessions` = giảm dần, `date` = tăng dần |
| `--filter` | `sessionSource==google` (khớp đúng) · `=~` (chứa) · `!=` (loại trừ), nhiều điều kiện cách nhau bởi `,` |
| `--json` | in JSON thô thay vì bảng |
| `--sa` / `--property` | ghi đè env, dùng khi chạy tại máy |

---

## 3. Chỗ này khác gì `lib/analytics/ga4.ts`

| | `lib/analytics/ga4.ts` | `scripts/ga4.mjs` |
|---|---|---|
| Chạy ở | server prod (Vercel), trong `admin-marketing` | terminal, phiên làm việc |
| Đọc được | ĐÚNG 1 số: tổng `sessions` để thay ô "Khách ghé" trên panel Funnel | bất kỳ dimension/metric nào |
| Env | `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` trên Vercel | cùng tên biến, nhưng ở môi trường phiên (hoặc `--sa`) |

Hai đường độc lập nhau — **cùng service account, cùng tên biến môi trường**, nên
làm xong bước 1–3 ở trên thì tiện set luôn cả trên Vercel để badge cạnh
"Khách ghé" trong panel Funnel đổi từ xám **"nội bộ"** sang xanh **"GA4"**.
