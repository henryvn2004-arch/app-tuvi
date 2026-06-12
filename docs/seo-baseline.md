# SEO Baseline Audit — tuviminhbao.com
> Ngày audit: 2026-06-12

## 1. Robots.txt
- **Status: PASS**
- Allow all (`User-agent: *`, `Allow: /`)
- AI crawlers explicitly allowed: GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, GoogleExtended, cohere-ai
- Disallow: `/api/`, auth pages, payment success (đúng — không cần index)
- 4 sitemaps đăng ký: sitemap.xml, sitemap-hubs.xml, sitemap-pregen.xml, sitemap-ngay-tot.xml

## 2. Canonical Tags
- **Status: PASS (tất cả 4 route)**
- `app/la-so/[slug]/route.ts` — 3 builders (public/pregen/ISR) đều self-canonical với URL đầy đủ
- `app/luan-giai/[slug]/route.ts` — self-canonical
- `app/menh-kho/[year]/route.ts` — self-canonical
- `app/menh-kho/[year]/[day]/route.ts` — self-canonical

## 3. Structured Data / Schema
- **la-so ISR:** Article + BreadcrumbList + FAQPage ✅
- **khao-luan:** Article + BreadcrumbList ✅ (FAQPage chưa có)
- **menh-kho/[year]:** CollectionPage + BreadcrumbList ✅
- **luan-giai:** cần kiểm tra thêm
- **about.html:** Organization schema ✅

## 4. Sitemap Coverage
| Content type | Sitemap | Trạng thái |
|---|---|---|
| Static pages (60 URLs) | sitemap.xml | ✅ |
| laso_public (DB rows) | sitemap.xml | ✅ |
| laso_pregen (DB rows) | sitemap.xml + sitemap-pregen.xml | ✅ |
| tu_dien (DB rows) | sitemap.xml | ✅ |
| khao_luan (DB rows) | sitemap.xml | ✅ |
| menh-kho hubs (50 năm + ~18K days) | sitemap-hubs.xml | ✅ |
| ISR-computed la-so (438K) | **Không có sitemap** — chỉ discover qua menh-kho hub links | ⚠️ |

**Ghi chú ISR discovery path:**
```
Homepage → /menh-kho.html → /menh-kho/{year} → /menh-kho/{year}/{mm-dd} → /la-so/{slug}
```
Google sẽ crawl la-so ISR pages qua hub links. Nhưng 438K pages chưa được warm-up hết.

## 5. Internal Linking
- **la-so ISR → related la-so:** `buildRelatedLinks()` tạo 12+ links ✅
- **la-so ISR → tu-dien (inline):** `starLink()` map sao tên → /tu-dien/sao-* ✅
- **menh-kho/[year] → la-so:** 365 ngày × 24 lá số = 8,760 links/page ✅
- **la-so → khao_luan:** ❌ THIẾU — không có cross-link giữa ISR pages và editorial content
- **menh-kho/[year] → khao_luan:** ❌ THIẾU — không có "bài viết liên quan"

## 6. Content Quality — ISR Pages
- **la-so ISR:** 24 sections phân tích, grid 12 cung, FAQ, schema → KHÔNG THIN ✅
- **Hero section:** hiện chỉ có tags, **THIẾU prose "direct answer"** (workplan Phase 4)
- **menh-kho/[year]:** hero paragraph generic (1 câu), cần mở rộng với content cụ thể

## 7. Entity Page
- **about.html** có Organization schema + mô tả phương pháp luận ✅
- URL `/about.html` rewrite từ `/about` ✅
- Có thể bổ sung thêm description về methodology ở footer (Phase 4)

## 8. Ahrefs Baseline
> TODO: Cần kết nối Ahrefs MCP để lấy số liệu:
> - Organic keywords count
> - Indexed pages count (từ Ahrefs Site Explorer)
> - Referring domains count
> - Top pages by traffic

## 9. GSC Data (cần Henry export)
> TODO: Mở GSC → Pages report → export "Not indexed" reasons
> Phân nhóm theo: Discovered/not indexed, Crawled/not indexed, Excluded by noindex

## Kết luận — Issues cần fix
| Priority | Issue | Phase |
|---|---|---|
| HIGH | ISR pages không có "direct answer" prose block | 4 |
| HIGH | Không có cross-link la-so ↔ khao_luan/master_articles | 1.2 |
| MEDIUM | khao_luan thiếu FAQPage schema | 4 |
| MEDIUM | menh-kho/[year] hero paragraph generic | 4 |
| LOW | Chưa có Ahrefs baseline số liệu | 1.1 |
| WAITING | GSC "Not indexed" reasons — cần Henry export | 1.1 |
