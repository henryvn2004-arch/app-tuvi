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
Hiện tại Lighthouse chạy trên prod URLs hardcoded. Để chạy trên Vercel preview của PR:
- Trigger workflow_dispatch + truyền `lhci_url_override=https://app-tuvi-git-<branch>.vercel.app/`
- Hoặc edit `lighthouserc.json` collect.url thành preview URL trước khi merge

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
