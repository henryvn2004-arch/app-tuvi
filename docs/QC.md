# QC & Testing — cấu hình đầy đủ

> Bảng workflow + lệnh local ở `CLAUDE.md`. Đây là phần cấu hình, giới hạn đã
> biết và cách dựng máy mới.

## Config files
- `eslint.config.js` — ESLint 10 flat config (migrated từ legacy `.eslintrc.json` sau khi bump 8→10)
- `.prettierrc` + `.prettierignore` — format style
- `.gitattributes` — chuẩn hoá LF (Windows ↔ Linux)
- `playwright.config.ts` — E2E full (cần auth, testIgnore `**/smoke/**`)
- `playwright.smoke.config.ts` — smoke prod (no auth)
- `lighthouserc.json` — Lighthouse assertions
- `.github/dependabot.yml` — weekly npm + actions updates

## Phiên bản gói — TRA `package.json`, đừng đọc ở đây
Bảng số phiên bản từng nằm trong `CLAUDE.md` đã **sai** sau vài đợt Dependabot
(nó ghi `next ^14.2.0` trong khi repo đã ở `^16.3.2`) — bảng chép tay thì luôn
trôi, mà trôi thì không có gì báo. Số thật ở `package.json` +
`tuvi-engine/package.json`. Chỉ giữ lại điều KHÔNG đọc được từ đó: **`pdf-parse`
phải ở v1** — v2 bỏ đường dẫn nội bộ `lib/pdf-parse.js` nên
`scripts/embed-tubinh.mjs:20` chết.

## Known limitations
- Prettier KHÔNG check HTML files, vanilla `public/*.js`, `app/api/tuong-mat/route.js`, `next.config.mjs`, `vercel.json` — bảo toàn alignment intentional + tránh diff cosmetic lớn
- ESLint disable `no-dupe-keys` + `no-redeclare` trong `public/tuvi-ansao-engine.js` — file có duplicate star keys cần audit (TODO line ~563)
- ESLint `no-useless-assignment` disabled — rule mới trong v9+ flag false positive ở vanilla files (pattern build-then-replace)
- Sentry alerts chưa setup (skip theo lựa chọn) — nếu cần, configure trong Sentry UI: New issue alert + Error rate spike (>10/5min) + Performance LCP P75 > 4s
- Playwright + Lighthouse SKIP trên Dependabot PR (`if: github.actor != 'dependabot[bot]'`) — Dependabot không có quyền dùng secrets

## Vercel preview cho Lighthouse
Config ghim URL prod. Đo preview: workflow_dispatch + `lhci_url_override=https://app-tuvi-git-<branch>.vercel.app/`.
⚠️ ĐỪNG sửa `collect.url` trong config rồi merge — đó đúng là cái bẫy "đo nhầm bản
đang chạy" đã phải vá 4 lần (smoke #463, E2E #466, Lighthouse desktop, mobile #691).

## Smoke test issue dedupe + label
`smoke-prod.yml` cần label `prod-down` (đã tạo). Chỉ tạo issue mới nếu chưa có open issue cùng label — lần fail sau comment vào issue cũ.

## Cross-machine setup
Sau khi clone trên máy mới:
```bash
npm ci
cd tuvi-engine && npm ci && cd ..
npx playwright install chromium
```
ESLint dùng flat config (`eslint.config.js`) nên VS Code cần extension version mới (ESLint v3+).

## Claude Code Remote environments (Henry's account, 2026-09-23)
Session mặc định (environment "Default") **không có** `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`
và **không ra được mạng** tới `tuviminhbao.com` (egress proxy chặn 403 ở CONNECT —
`curl` ra thẳng lỗi `connect_rejected`, không phải site sập). Việc cần sinh ảnh
(`scripts/gen-tool-avatars.mjs`, `gen-hero-banners.mjs`, …) hay kiểm layout/data
thật trên prod phải mở **session mới ở environment khác** — dùng
`mcp__Claude_Code_Remote__create_session` với `environment_id` đúng, checkout đúng
branch cần, giao việc rõ, rồi đọc kết quả qua `get_session`.

⚠️ **Đừng đoán environment nào có gì qua TÊN** — đã đoán sai 1 lần: environment tên
"app-tuvi + GA4" (`env_01JCqKCLu8YtHoFg5NFCNYPs`) **KHÔNG** có mạng ra
`tuviminhbao.com` (test thật ra `connect_rejected`, giống hệt Default). Environment
tên **"OpenAI Key"** (`env_01Khi54Dffp38bzpmjYSGrYg`) mới là nơi có CẢ HAI —
`OPENAI_API_KEY` **và** mạng ra `tuviminhbao.com` thật (đã xác nhận: sinh ảnh avatar
thật + audit layout 112 lượt tải trang trên prod, PR #1013/#1014). `list_environments`
liệt kê ID nhưng KHÔNG lộ policy mạng/key — phải thử thật (hoặc hỏi Henry) trước khi
giao việc, đừng tin tên.

⚠️ **Playwright trong container báo `ERR_CERT_AUTHORITY_INVALID` với MỌI host**
dù `curl` cùng URL trả `200` và README proxy nói NSS đã cấu hình — NSS db thật ra
TRỐNG (`certutil -L -d sql:/root/.pki/nssdb` không thấy CA nào). Vá:
```bash
apt-get install -y libnss3-tools   # nếu chưa có certutil
awk '/BEGIN CERT/{n++} {print > ("ca-" n ".pem")}' /root/.ccr/ca-bundle.crt
for f in ca-*.pem; do
  openssl x509 -in "$f" -noout -subject | grep -q 'O *= *Anthropic' &&
    certutil -A -d sql:/root/.pki/nssdb -t "C,," -n "anthropic-$f" -i "$f"
done
```
Đừng dùng `ignoreHTTPSErrors` (che triệu chứng, không phải vá gốc). Sau bước này
`scripts/ux/harness.mjs` vào được prod thật (agent `ux-tester` audit W1, 2026-09-26).
Chỉ cần làm MỘT LẦN mỗi container mới — mất khi session/container bị thu hồi.
