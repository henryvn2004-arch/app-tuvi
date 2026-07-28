# Nối Google Analytics 4 vào phiên làm việc với Claude

Mục tiêu: để Claude (và cả Henry) **đọc thẳng số GA4 trong terminal** rồi phân tích —
nguồn traffic, trang nào kéo khách, thiết bị, sự kiện, so tuần này với tuần trước —
thay vì phải chụp màn hình dashboard GA4 dán vào chat.

Công cụ: `scripts/ga4.mjs` (thuần Node, không thêm dependency).
Quyền dùng: **CHỈ ĐỌC** (`analytics.readonly`) — không sửa được gì trong GA4.

Property của site: **`533053153`** (Measurement ID `G-F4XNRS2XT0`, khai trong `public/nav.js`).

---

## 1. Phần đã làm rồi (đừng làm lại)

Bước 1–3 dưới đây **Henry đã làm xong hồi D4** (track "Dashboard revamp", mục
Full Funnel nối GA4) — CLAUDE.md ghi rõ *"việc tay Henry: service account GCP +
GA4 Data API + Viewer property `533053153` — ĐÃ XONG"*. Giữ lại ở đây làm hồ sơ
tham chiếu, phòng khi phải tạo key mới hoặc đổi service account:

<details>
<summary>Bước 1–3 (đã xong — bấm để xem lại)</summary>

**Bước 1 — Bật API.** Google Cloud Console → project chứa service account của site
→ **APIs & Services → Library** → **"Google Analytics Data API"** → **Enable**.

**Bước 2 — Service account.** Repo đã dùng service account cho Search Console +
Indexing API (`scripts/indexing-api.mjs`, `scripts/gsc-self-verify.mjs`) — file key
JSON Henry giữ ở máy (`tuvi-minh-bao-*.json`). Dùng lại đúng key đó được, không cần
tạo mới. Muốn key riêng: IAM → Service Accounts → Create → Keys → Add key → JSON.

**Bước 3 — Cấp quyền đọc property.** GA4 → **Admin** → cột Property →
**Property Access Management** → `+` → dán email service account (khoá
`client_email` trong file JSON) → vai trò **Viewer** → Add.

> Thiếu bước này thì API trả **403** — script nói thẳng lý do và nhắc lại đúng bước này.

</details>

---

## 2. Phần CÒN LẠI — chỉ mỗi bước 4

Việc mày đã làm ở D4 là cấp quyền cho **service account** và (nhiều khả năng) đặt env
trên **Vercel** — đó là để code prod (`lib/analytics/ga4.ts`) đọc được GA4.
**Container của phiên Claude Code là môi trường KHÁC**, không thấy env của Vercel.
Kiểm chứng: quét 127 biến env trong phiên, **không có biến nào tên GA4/GOOGLE/
SERVICE_ACCOUNT** — nên `scripts/ga4.mjs` chưa chạy được, dù phía Google đã sẵn sàng.

Chọn 1 trong 2 đường:

**A. Đặt env cho environment của Claude Code** (khuyên dùng — set 1 lần, phiên nào
cũng đọc được). Vào cấu hình environment của Claude Code (xem
https://code.claude.com/docs/en/claude-code-on-the-web), thêm 2 biến — **giá trị y
hệt cái đã đặt trên Vercel, copy sang là xong, không đụng gì tới Google nữa**:

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

## 3. Dùng

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

## 4. Chỗ này khác gì `lib/analytics/ga4.ts`

| | `lib/analytics/ga4.ts` | `scripts/ga4.mjs` |
|---|---|---|
| Chạy ở | server prod (Vercel), trong `admin-marketing` | terminal, phiên làm việc |
| Đọc được | ĐÚNG 1 số: tổng `sessions` để thay ô "Khách ghé" trên panel Funnel | bất kỳ dimension/metric nào |
| Env | `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` trên Vercel | cùng tên biến, nhưng ở môi trường phiên (hoặc `--sa`) |

Hai đường **độc lập nhau** — cùng service account, cùng tên biến, nhưng env phải
đặt ở CẢ HAI nơi vì đó là hai môi trường khác nhau. Đặt trên Vercel không làm
terminal đọc được, và ngược lại.

Cách tự kiểm phía Vercel (không có tool đọc env Vercel): mở admin → panel Funnel
→ nhìn badge cạnh **"Khách ghé (visit)"** — xanh **"GA4"** là env đã set và số đang
lấy thật từ GA4; xám **"nội bộ"** là chưa set (hoặc API lỗi) và số đang suy từ
`page_view` của `track.js`.
