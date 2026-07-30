# Bộ Icon — luật dùng

> **Luật một câu:** UI **không dùng emoji màu**. Icon lấy từ bộ SVG dùng chung
> trong `public/nav.js` qua `data-icon="<tên>"`.

---

## 1. Vì sao không dùng emoji màu

| | Emoji màu (📊 💡 🔮 🏦) | Icon SVG (`data-icon`) |
|---|---|---|
| Hình dạng | **Mỗi hệ điều hành một hình** — Apple/Windows/Android vẽ khác nhau | Y hệt mọi nơi |
| Màu | Cố định, **không nhận `color`** | Ăn `currentColor` → tự đúng ở light/dark |
| Nét | Không điều khiển được | `stroke-width` khớp phần còn lại của trang |
| Cỡ | Theo font, hay lệch baseline | Theo `width`/`height`, canh được |

Đó là lý do kỹ thuật thật khiến trang trông lệch tông, không phải chuyện thẩm mỹ.

## 2. Ký tự ĐƯỢC PHÉP giữ

Không phải mọi ký tự lạ đều là emoji. Nhóm **đơn sắc, theo font** là **phần của
theme** — giữ nguyên, đừng đổi sang SVG:

```
→  ←  ↔  ↻  ⬇     mũi tên (đang có ~1.430 chỗ, hầu hết trong CTA "Xác Nhận →")
✦  ★  ☆           dấu hiệu thương hiệu
✓  ✗  ✕  ⚠  ☰     trạng thái / điều khiển
·  —  ×  “ ” ’     dấu chữ
```

Chúng nhận `color`, nhận `font-weight`, và đã nằm trong nhận diện. Đổi `→` sang
SVG là **phá** theme chứ không phải làm sạch theme.

## 3. Cách dùng

`nav.js` nạp trên gần như mọi trang và tự chạy `mountIcons()` khi load. Nó export:

| Export | Dùng để |
|---|---|
| `window.ICONS` | bản đồ `tên → chuỗi HTML <svg>` (85 icon) |
| `window.iconHtml(raw, fallback?)` | nhận **tên icon HOẶC emoji** → trả HTML `<svg>` |
| `window.EMOJI_TO_ICON` | bản đồ emoji → tên icon (159 mục), cho dữ liệu cũ |
| `window.mountIcons(root?)` | quét `[data-icon]` / `[data-icon-emoji]` rồi thay bằng SVG |

### HTML tĩnh — cách chuẩn

```html
<span class="ic" data-icon="landmark"></span>
```

`mountIcons()` tự điền SVG. Không cần JS riêng.

### HTML sinh động (innerHTML) — phải gọi lại `mountIcons`

`mountIcons()` chỉ chạy **một lần** lúc `nav.js` load. Nội dung dựng sau đó
KHÔNG tự có icon:

```js
el.innerHTML = rows.map(r => `<span class="ic" data-icon="${r.iconName}"></span>…`).join('');
if (window.mountIcons) window.mountIcons(el);   // ← BẮT BUỘC
```

Hoặc nhúng SVG thẳng lúc dựng chuỗi:

```js
el.innerHTML = '<div class="ic">' + window.iconHtml(r.icon) + '</div>';
```

### Dữ liệu từ DB còn là emoji

`tool_pricing.icon` đang lưu emoji (`🔮 💑 🤝 👶 📜 …`). **Đừng tự đổi cột đó
sang tên icon rồi sửa từng chỗ đọc** — cứ đưa qua `window.iconHtml(raw)`, nó
nhận cả hai dạng:

```js
iconHtml('🔮')       // → <svg> sparkles
iconHtml('sparkles') // → <svg> sparkles  (tên icon cũng chạy)
```

## 4. Thiếu icon thì làm gì

Thêm vào `ICONS` trong `public/nav.js`, **không nhét emoji tạm**:

1. Lấy path từ [Lucide](https://lucide.dev) (bộ đang dùng), giữ đúng khuôn:
   ```
   viewBox="0 0 24 24" fill="none" stroke="currentColor"
   stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
   ```
2. Chèn theo **thứ tự alphabet** (file đang xếp vậy).
3. Nếu icon thay cho một emoji còn tồn tại trong dữ liệu cũ → thêm mục vào
   `EMOJI_TO_ICON`.
4. **Bump `nav.js?v=` trên TẤT CẢ file** (`grep -rl "nav\.js?v=<cũ>" public/ app/`
   — hiện 89 file). Quên bump thì người dùng cache bản cũ và icon mới ra rỗng.

## 5. Không áp dụng cho

- **Prompt gửi LLM** (`lib/agent/prompts.ts`, `lib/marketing/*`): emoji trong đó
  là **chỉ dẫn định dạng cho model** (ví dụ prompt CMO Digest ép `📈 Điểm sáng /
  ⚠️ Điểm nghẽn`). Đổi là đổi hành vi model, không phải đổi UI.
- **Tin nhắn Telegram admin** (`🚨` cảnh báo, `🎖️` digest, `🧪` shadow-mode,
  `🤖` live): Telegram không render SVG; prefix emoji là cách phân biệt loại tin
  trong luồng chat. Giữ.
- **Dữ liệu engine** (`public/*-ansao-engine.js`): không phải UI.

## 6. Nợ kỹ thuật đã biết

**`public/shell.js` có bộ `ICONS` THỨ HAI** — 28 icon, khai trong closure nên
chỉ trang `/app/*` dùng được, và khuôn khác (`stroke-width="1.8"`, không
`stroke-linecap`). Chính vì nó không với ra ngoài mà các trang như `topup.html`
đành dùng emoji — đó là căn nguyên kỹ thuật của cả vụ này.

Chưa gộp vì shell.js đang chạy trên 27 trang, gộp phải thêm thẻ script + bump
version cả 27 → để một PR riêng. Khi gộp: giữ `svg(name, cls)` làm vỏ mỏng gọi
`window.ICONS`, và bù các icon shell có mà nav thiếu (`temple`, `yin`, `rows`,
`calcheck`, `bolt`, `wave`).

## 7. Còn bao nhiêu phải dọn

Đo ngày 2026-07-30: **1.865 emoji màu trong 132 file UI**.

| Đợt | Phạm vi | Trạng thái |
|---|---|---|
| 1 | `nav.js` (bộ icon) · `topup.html` · `cong-cu.html` | ✅ xong |
| 2 | `public/tools/*.html` (~700 lượt) — nặng nhất: `tarot` 95, `ban-lam-viec` 70, `cua-hang-phong-thuy` 68 | chưa |
| 3 | `luan-giai.html` 69 · `kien-thuc-tuvi.html` 54 · `related-tools.js` 45 · `app-*.html` | chưa |
| 4 | `admin*.html` (~171 lượt) — nội bộ, ưu tiên thấp nhất | chưa |

Đếm lại bất cứ lúc nào:

```bash
python3 - <<'PY'
import re,glob,collections
COLOR=re.compile('[\U0001F300-\U0001F9FF\U0001FA70-\U0001FAFF\U0001F000-\U0001F2FF]')
f=collections.Counter()
for p in ('public/**/*.html','public/**/*.js'):
    for x in glob.glob(p,recursive=True):
        n=len(COLOR.findall(open(x,encoding='utf-8',errors='ignore').read()))
        if n: f[x]=n
print("file:",len(f)," lượt:",sum(f.values()))
for k,v in f.most_common(15): print(f"{v:5d}  {k}")
PY
```
