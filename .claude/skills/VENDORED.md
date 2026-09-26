# claude-seo — bản vendor

**Nguồn:** https://github.com/AgriciDaniel/claude-seo · **Giấy phép:** MIT
(bản gốc giữ tại `.claude/skills/seo/LICENSE`)
**Vendor ngày:** 2026-07-31 · 25 skill + 18 agent

## Vì sao vendor chứ không cài qua `/plugin`

`claude-seo` là plugin **theo repo**, khác `brand-voice`/`marketing` (plugin Cowork của
claude.ai — file skill KHÔNG có trong container Claude Code, xem CLAUDE.md). Vendor thẳng
vào repo thì mọi phiên Claude Code sau đều dùng được ngay, không phụ thuộc cài đặt máy.

## Bố cục (theo đúng `install.sh` của upstream)

| Đường dẫn | Nội dung |
|---|---|
| `.claude/skills/seo/` | skill chính + `scripts/` · `schema/` · `pdf/` · `bin/` · `hooks/` |
| `.claude/skills/seo-*/` | 24 sub-skill, mỗi cái một thư mục |
| `.claude/agents/*.md` | 18 sub-agent |

Script Python được gọi bằng đường dẫn tương đối `scripts/*.py` **so với `.claude/skills/seo/`**
— đừng di chuyển thư mục đó, 22/25 skill sẽ gãy.

## Đã CỐ Ý bỏ

| Bỏ | Lý do |
|---|---|
| `screenshots/` (1,6M), `assets/`, `tests/`, `.devcontainer/`, `.github/` | không cần lúc chạy, chỉ làm phình repo |
| `extensions/` (516K) | DataForSEO · Firecrawl · Banana — đều cần API key bên thứ ba mà mình không có |

⚠️ Vì bỏ `extensions/`, hai script `scripts/edit.py` và `scripts/presets.py`
(thuộc `extensions/banana/`) không có mặt. Chúng chỉ được gọi bởi
`seo/scripts/consistency_check.py` — **không SKILL.md nào phụ thuộc**, nên không skill nào
gãy. `seo-image-gen` và `seo-dataforseo` cần extension tương ứng mới chạy đủ.

## ⚠️ Hook KHÔNG được kích hoạt — cố ý

`seo/hooks/hooks.json` khai một hook `PostToolUse` bắt **mọi** `Edit|Write`, chạy
`validate-schema.py`, và **exit 2 để CHẶN** khi thấy lỗi JSON-LD. Vendor dạng *skill* nên
`hooks.json` không tự nạp (chỉ plugin mới nạp) — đó là kết quả mong muốn: một validator
JSON-LD chặn mọi lần sửa file trong repo Next.js này sẽ cản trở hơn là giúp.

Muốn bật thì tự khai trong `.claude/settings.json`, và cần Python + `requirements.txt`.

## Cập nhật

Không có submodule/lockfile — muốn nâng cấp thì clone lại upstream rồi copy theo bố cục trên.
Kiểm sau khi nâng: mọi thư mục skill phải có `SKILL.md` với frontmatter `name` + `description`.

---

# Bộ skill thiết kế — bản vendor (2026-09-26)

| Skill | Nguồn (commit) | Giấy phép |
|---|---|---|
| `emil-design-eng` `review-animations` `improve-animations` `find-animation-opportunities` `animate` `animation-vocabulary` `mobile-native` | https://github.com/emilkowalski/skill (`d16ebe6`) | MIT — `emil-design-eng/LICENSE` |
| `impeccable` | https://github.com/pbakaus/impeccable, thư mục `plugin/skills/impeccable` (`9d715cc`, v4.4.0) | Apache 2.0 — `impeccable/LICENSE` + `NOTICE.md` |
| `taste-skill` `redesign-skill` | https://github.com/Leonxlnx/taste-skill (`c184364`) | MIT — `taste-skill/LICENSE` |

**Đã CỐ Ý bỏ:** Emil `write-swift` `animate-expo` (native) · `ask-sonner` `pick-ui-library`
`prototype` (React) · `apple-design`. Taste: các biến thể phong cách (`brutalist` `soft`
`minimalist` `stitch` `gpt-*` `v1`), `imagegen-*`, `image-to-code`, `brandkit`, `output-skill` —
site đã có bản sắc riêng, không cần skill đổi phong cách.

⚠️ **Luật repo thắng skill:** `CLAUDE.md` (cấm emoji màu, cấm khoe "AI", giá VNĐ chính,
bump `?v=`, CLS) đứng trên mọi gợi ý của các skill này. Taste/Impeccable khuyên "làm lại cho
khác" thì với site này chỉ áp ở chế độ TINH CHỈNH (refinement), không redesign.

`impeccable/scripts/impeccable context` chạy được trong container (tự tải binary lần đầu,
không ghi file vào repo). Chưa có `PRODUCT.md`/`DESIGN.md` — skill sẽ đề nghị `init`.
