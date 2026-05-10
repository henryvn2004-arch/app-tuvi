# CLAUDE.md — Context cho Claude Code

## Project
**tuviminhbao.com** — Tử Vi Đẩu Số app (Next.js 14, Supabase, Vercel)

---

## 🔴 ĐANG LÀM — Pre-gen Lá Số SEO (438K pages)

**Branch:** `claude/charming-swartz-a756cb`  
**Status:** Plan xong, CHƯA BUILD

### Mục tiêu
438K pre-generated SEO pages targeting long-tail:
> "lá số tử vi canh ngọ sinh 03/05/1990 giờ sửu nam 2027"

Scale: 50 năm (1960–2010) × 365 ngày × 12 giờ × 2 giới × namXem=2027

### Slug format đã thống nhất
```
/la-so/{can-chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi-tinh}-{namXem}
ví dụ: /la-so/canh-ngo-03-05-1990-gio-suu-nam-2027
```

### Code đã push trên branch
- `app/api/admin/gen-pregen-date/route.ts` — gen full-date records
- `app/la-so/[slug]/route.ts` — buildPregenHTML với grid 4×4 + 24 phần

### Kiến trúc đã thống nhất: ISR (không dùng DB cho pre-gen)
- Compute on-demand (~80ms), cache CDN vĩnh viễn
- Supabase chỉ cho laso_public (user submissions)
- Lý do: 438K rows × 20KB = ~8.7GB, vượt Supabase free (500MB) và Pro (8GB)

### Thứ tự build (9 bước)
1. [ ] Refactor `[slug]/route.ts`: ISR compute on-demand (bỏ DB lookup cho pre-gen)
2. [ ] Update slug: thêm namXem vào cuối
3. [ ] Trim tieuVanScores: chỉ lưu data của namXem (không cần 90 năm)
4. [ ] Test 10 records (`preview=1` API)
5. [ ] Tạo hub pages `/menh-kho/[year]` — QUAN TRỌNG cho Google crawl
6. [ ] Related links trên mỗi lá số page (~15 links)
7. [ ] Sitemap routes `/api/sitemap/pregen/[year].xml`
8. [ ] GitHub Actions warm-up cron (1 năm/đêm, 50 đêm xong)
9. [ ] Run full 438K

### Internal linking (quan trọng nhất)
```
Homepage → Mệnh Khố → /menh-kho/[year] → /la-so/[slug]
```
Mỗi lá số page có ~15 related links (cùng ngày/giờ khác, cùng ngày/giới khác)

### Test case
- Nam, 03/05/1990, 1h30 sáng = giờ Sửu (index 1), namXem 2026
- API test: `/api/admin/gen-pregen-date?secret=tuvi2024admin&preview=1&day=3&month=5&year=1990&gio=1&gt=nam&namXem=2026`
