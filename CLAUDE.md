# CLAUDE.md — Context cho Claude Code

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 14, Supabase, Vercel)

---

## 🔴 ĐANG LÀM — ISR Lá Số SEO (438K pages)

**Branch:** `claude/serene-elion-e060cc`  
**Status:** 24-section template DONE (commit c5dbc8a), sẵn sàng deploy + test

### Slug format
```
/la-so/{can-chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi-tinh}-{namXem}
ví dụ: /la-so/canh-ngo-03-06-1998-gio-suu-nam-2027
```

### Kiến trúc: ISR compute on-demand
- `app/la-so/[slug]/route.ts`: parse slug → loadEngine() → compute → HTML → cache CDN vĩnh viễn
- Priority: laso_public → laso_pregen → **ISR compute** → redirect
- Fix quan trọng: module-level `globalThis.location` mock (3 files) để tránh Next.js URL crash sau khi engine set `globalThis.window = globalThis`

### Discovery path
```
Homepage → /menh-kho.html → /menh-kho/[year] → /menh-kho/[year]/[mm-dd] → /la-so/[slug]
```

### Files đã làm trên branch
- `app/la-so/[slug]/route.ts` — ISR compute (parseIsrSlug + loadEngine + renderGrid + renderTextBlocks + buildIsrHTML)
- `app/menh-kho/[year]/route.ts` — Calendar hub 50 năm (1960–2010)
- `app/menh-kho/[year]/[day]/route.ts` — Day hub, 24 cards (12 giờ × 2 giới)
- `app/van-han/route.ts` — Hub page 12 chi × 3 năm
- `app/van-han/[slug]/route.ts` — Level 1 (tuoi-[chi]-nam-[year]) + Level 2 (can-chi-nam-year)
- `app/api/og/laso/route.tsx` — Enhanced OG image edge (1200×630)
- `app/api/admin/sample-laso/route.ts` — Admin preview page
- `public/llms.txt` — AEO: describe tool for LLM crawlers
- `public/robots.txt` — Allow AI bots (GPTBot, ClaudeBot, PerplexityBot...)
- `public/index.html` — SoftwareApplication JSON-LD schema

### ✅ DONE: 24-section template content (commit c5dbc8a)
Đã thêm `render24Sections(ls, params)` vào route.ts — 420 lines template logic.

**Sections đã build:**
```
1.  Tổng quan (cung mệnh, nạp âm, cục, cách cục tóm tắt)
2-13. 12 cung (major stars, sat tinh, cachCucTungCung tags, miniScoreBars)
14. Cách cục chi tiết (moTa per cach cuc)
15. Đại vận hiện tại (scoring + DV timeline)
16. Tiểu vận năm namXem (mainScore, direction, satCount)
17. Điểm mạnh (top 3 cung by avg score)
18. Điểm cần cải thiện (bot 3 cung by avg score)
19. Tứ Hóa phân tích (Lộc/Quyền/Khoa/Kỵ position)
20. Thần sát (Kình/Đà/Hỏa/Linh/Không/Kiếp per cung)
21. Tuần/Triệt ảnh hưởng
22. Vận năm namXem tổng hợp (DV + TV combined)
23. Dự phóng năm namXem+1
24. Tổng kết và lời khuyên
```

### 🔴 Bước tiếp theo: Deploy + test
1. Deploy branch lên Vercel
2. Test `/la-so/canh-ngo-03-06-1998-gio-suu-nam-2027` — verify 24 sections render
3. Check word count: mỗi page có ≥3000 chữ unique

### Test case
- `/la-so/canh-ngo-03-06-1998-gio-suu-nam-2027` ✅ đang work trên localhost:3000
- Engine output: Mậu Dần, Cung Mệnh Cự Môn, điểm 7.3/10, 4 cách cục

### NAM_XEM
- Hardcode 2027 trong `menh-kho/[year]/[day]/route.ts` (line: `const NAM_XEM = 2027`)
- Update hằng năm thủ công

---

## QC & Testing

5 lớp QC chạy trên GitHub Actions. Mọi workflow đều free quota.

### Workflows
| File | Trigger | Mục đích |
|---|---|---|
| `lint.yml` | push/PR vào main/dev | ESLint + Prettier check |
| `unit-test.yml` | push/PR vào main/dev | `tuvi-engine/` vitest + typecheck + coverage |
| `playwright.yml` | push/PR vào main/dev | E2E full suite (16 specs, có auth) |
| `smoke-prod.yml` | deployment_status (prod) + cron 6h + manual | Smoke test trên prod URL, tạo issue `prod-down` khi fail |
| `lighthouse.yml` | PR vào main + manual | Lighthouse trên 4 URL chính, assert Perf/A11y/SEO/LCP/CLS/TBT |

### Lệnh local
```bash
npm run lint              # ESLint
npm run lint:fix          # ESLint auto-fix
npm run format            # Prettier write
npm run format:check      # Prettier check
npm run test:e2e          # Playwright full
npm run test:smoke        # Playwright smoke (PROD_URL=...)
npm run lhci              # Lighthouse local (cần Chrome)

cd tuvi-engine && npm test            # Vitest engine
cd tuvi-engine && npm run test:coverage
```

### Config files
- `eslint.config.js` — ESLint 10 flat config (migrated từ legacy `.eslintrc.json` sau khi bump 8→10)
- `.prettierrc` + `.prettierignore` — format style
- `.gitattributes` — chuẩn hoá LF (Windows ↔ Linux)
- `playwright.config.ts` — E2E full (cần auth, testIgnore `**/smoke/**`)
- `playwright.smoke.config.ts` — smoke prod (no auth)
- `lighthouserc.json` — Lighthouse assertions
- `.github/dependabot.yml` — weekly npm + actions updates

### Dependency versions (sau khi merge Dependabot tháng 5/2026)
- next: `^14.2.0` (chưa upgrade lên 16 — xem "Open PRs" bên dưới)
- @supabase/supabase-js: `^2.106.1`
- pdf-parse: `^1.1.1` (KHÔNG bump lên v2 — break `scripts/embed-tubinh.mjs`, xem "Open PRs")
- eslint: `^10.4.0` (flat config)
- @playwright/test: `^1.60.0`
- prettier: `^3.8.3`
- @types/node: `^25.9.1` (root + engine)
- vitest + @vitest/coverage-v8: `^4.1.7` (engine)
- GHA actions: checkout@v6, setup-node@v6, upload-artifact@v7

### Known limitations
- Prettier KHÔNG check HTML files, vanilla `public/*.js`, `app/api/tuong-mat/route.js`, `next.config.mjs`, `vercel.json` — bảo toàn alignment intentional + tránh diff cosmetic lớn
- ESLint disable `no-dupe-keys` + `no-redeclare` trong `public/tuvi-ansao-engine.js` — file có duplicate star keys cần audit (TODO line ~563)
- ESLint `no-useless-assignment` disabled — rule mới trong v9+ flag false positive ở vanilla files (pattern build-then-replace)
- Sentry alerts chưa setup (skip theo lựa chọn) — nếu cần, configure trong Sentry UI: New issue alert + Error rate spike (>10/5min) + Performance LCP P75 > 4s
- Playwright + Lighthouse SKIP trên Dependabot PR (`if: github.actor != 'dependabot[bot]'`) — Dependabot không có quyền dùng secrets

### Open Dependabot PRs (chưa xử lý — cần decision)
- **#13 next 14→16** ⚠️ — local build fail do thiếu env vars, không verify được. Risk cao: Next 15 thay đổi async params/cookies/headers, route handlers cần await. Khuyên: review release notes trên branch riêng trước
- **#11 pdf-parse 1→2** — v2 bỏ internal path `lib/pdf-parse.js` → break `scripts/embed-tubinh.mjs:20`. Khuyên: close PR, hoặc rewrite script trước khi merge
- **#1, #2 Vercel bot** (Speed Insights + Web Analytics) — không phải Dependabot, merge nếu muốn analytics

### Vercel preview cho Lighthouse
Hiện tại Lighthouse chạy trên prod URLs hardcoded. Để chạy trên Vercel preview của PR:
- Trigger workflow_dispatch + truyền `lhci_url_override=https://app-tuvi-git-<branch>.vercel.app/`
- Hoặc edit `lighthouserc.json` collect.url thành preview URL trước khi merge

### Smoke test issue dedupe + label
`smoke-prod.yml` cần label `prod-down` (đã tạo). Chỉ tạo issue mới nếu chưa có open issue cùng label — lần fail sau comment vào issue cũ.

### Cross-machine setup
Sau khi clone trên máy mới:
```bash
npm ci
cd tuvi-engine && npm ci && cd ..
npx playwright install chromium
```
ESLint dùng flat config (`eslint.config.js`) nên VS Code cần extension version mới (ESLint v3+).
