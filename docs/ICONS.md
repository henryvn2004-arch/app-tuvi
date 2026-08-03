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

## 6. Nợ kỹ thuật đã biết — và một chẩn đoán SAI đã sửa

**`public/shell.js` có bộ `ICONS` THỨ HAI** — 28 icon, khai trong closure, khuôn
khác (`stroke-width="1.8"`, không `stroke-linecap`). 15 tên trùng với nav.js
nhưng path khác nhau; 13 tên chỉ shell có (`grid` `rows` `doc` `clock` `bolt`
`dot` `calcheck` `tag` `building` `wave` `yin` `image` `temple`).

> ⚠️ **Bản trước của mục này viết SAI:** *"chính vì shell.js không với ra ngoài
> mà `topup.html` đành dùng emoji — đó là căn nguyên kỹ thuật của cả vụ này."*
> Không phải. `topup.html` **vốn đã nạp `nav.js`** nên `data-icon` dùng được từ
> đầu; nó dùng emoji đơn giản vì chưa ai nối, không phải vì bị chặn.

**✅ ĐÃ GIẢI QUYẾT — chế độ chỉ-icon của `nav.js`.** Mục này trước đây kết luận
"chưa đáng gộp". Kết luận đó dựa trên giả định rằng trang shell chỉ còn vài
emoji trang trí. Sai: đo bằng trình duyệt thì **27 trang shell + 2 trang admin
không có `window.mountIcons`**, nên mọi span `[data-icon]` ở đó rơi về nội dung
dự phòng và **in emoji thô** — kể cả 23 icon trong khối pre-gen Bát Tự/Luận Giải
vốn đã có markup đúng từ lâu.

Cách vá KHÔNG phải là gộp hai bảng, mà là cho mấy trang đó nạp **chính `nav.js`**
kèm thuộc tính `data-icons-only`:

```html
<script src="/nav.js?v=22" data-icons-only></script>
```

Ở chế độ này `nav.js` CHỈ cấp `ICONS` / `iconHtml` / `mountIcons` /
`EMOJI_TO_ICON` + CSS icon rồi `return` — **không dựng thanh nav, không chèn
GA4, không chèn `conversion.js`, không chèn `auth.js`**. Cờ đọc qua
`document.currentScript` chứ không qua biến toàn cục: thẻ script là thứ duy nhất
chắc chắn tồn tại đúng lúc file chạy, không phụ thuộc trang có nhớ khai trước.

Nhờ vậy **một nguồn icon duy nhất cho cả site**, không đẻ bảng thứ hai, và
`public/icons.js` (~116 file) không cần tồn tại.

`shell.js` **vẫn giữ bộ 28 icon riêng** cho chrome của chính nó — cố ý: đó là
icon của sidebar shell, tên riêng, khuôn riêng, không ai khác dùng. Cái đã sửa
là *trang shell giờ với được tới bộ icon chung*, không phải gộp hai bộ.

## 7. Còn bao nhiêu phải dọn

Bắt đầu 2026-07-30 với **1.865 emoji màu / 132 file UI** → còn **1.148 / 83 file**.

| Đợt | Phạm vi | Trạng thái |
|---|---|---|
| 1 | `topup.html` · `cong-cu.html` · bộ icon `nav.js` | ✅ xong |
| 2 | `public/tools/*.html` — **113 chỗ / 26 file** | ✅ xong |
| 3 | trang gốc `public/*.html` — **25 chỗ / 15 file** | ✅ xong |
| 4 | `public/*.js` — chuỗi dựng động, phải thêm `mountIcons()` sau mỗi chỗ render | ✅ xong |
| 5 | `admin*.html` + 27 trang shell — qua chế độ `data-icons-only` | ✅ xong |

### KHÔNG dọn — cố ý, đừng “sửa” lại

| Chỗ | Vì sao giữ |
|---|---|
| `nav.js` 146 | Chính là **khoá** của bảng `EMOJI_TO_ICON`. Đổi là phá đúng công cụ dùng để bỏ emoji. |
| `tarot.html` 66 · `oracle.html` | `sym:'🌟'` là **ký hiệu lá bài** (lá "Kẻ Khờ"), tức nội dung. Đổi sang Lucide là gộp 78 lá khác nhau thành vài glyph giống hệt. |
| Map đồ vật phong thuỷ (`{mirror:'🪞', door:'🚪'…}`) | Cùng lý do: emoji là token của từng vật, không phải icon trang trí. |
| Chấm màu `🔴 🟡 🔵` | **Màu chính là thông điệp** (đèn báo tốt/vừa/xấu). Icon đơn sắc ăn `currentColor` sẽ xoá đúng phần mang nghĩa. |
| `alert()` / `confirm()` / `<title>` / `<meta>` | Không nhét được thẻ HTML vào. |
| `related-tools.js` · `tool-configs.js` (`icon:` trong dữ liệu) | Đã đi qua `window.iconHtml()` sẵn — đúng luật §3, không phải nợ. |

### Công cụ

Script quét nửa tự động ở `scripts/sweep-emoji.py` (dry-run mặc định, `--apply`
để ghi). Ba chốt an toàn nằm sẵn trong đó, đều là lỗi đã vấp phải thật:
1. **Bỏ qua vùng `<script>`/`<style>`** — thân script cũng nằm giữa `>` và `<`
   nên regex ngây thơ sẽ biến dữ liệu JS thành thẻ HTML.
2. **Bỏ qua file không nạp `nav.js`** — không có `mountIcons` thì `data-icon`
   nằm rỗng vĩnh viễn.
3. **Emoji chưa có trong `EMOJI_TO_ICON` thì để nguyên + báo cáo**, không đoán
   tên icon.
4. **KHÔNG đổi emoji nằm trong GIÁ TRỊ THUỘC TÍNH** (`placeholder="🔍 Tìm..."`).
   Chèn `<span>` vào đó làm **vỡ thẻ**: dấu nháy trong span đóng sớm thuộc tính,
   phần còn lại tràn ra thành text hiển thị. Đã vấp thật ở `admin-content.html`
   (ô tìm kiếm + mẫu mô tả YouTube) và chỉ lộ khi mở bằng trình duyệt, không lộ
   khi đọc diff.
5. **KHÔNG đổi emoji đi vào `textContent`** — sink đó in nguyên chuỗi HTML ra
   màn hình, tệ hơn hẳn emoji. Chỉ đổi khi đích là `innerHTML`.

**Bộ dò tái phát** (chạy được ở bất kỳ đâu):

```bash
grep -nE '\b[a-zA-Z-]+="[^"]*<span class="ic-inline"' public/**/*.html
```

Ra dòng nào tức là có span lọt vào thuộc tính — phải trả về emoji trần.

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
