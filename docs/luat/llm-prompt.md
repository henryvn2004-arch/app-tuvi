# Tầng LLM & prompt — chi tiết

> Bản 1–3 dòng ở `CLAUDE.md`. Đây là phần "vì sao" và số đo.

## Cụm cache của prompt Luận Giải — `cachedSystemFor()`

`lib/agent/luan-giai-doc.ts` — prompt Luận Giải 24 phần (`buildPromptCached`,
qua `cachedSystemFor`). **`cachedSystemFor(laSoText, phan?)` là nguồn DUY NHẤT
cho `system` khi bật `cacheSystem`** — Luận Giải, Chu Trình Cuộc Đời LẪN Vận
Hạn 12 Tháng đều gọi hàm này; tự ghép chuỗi tay ở nơi khác là cache miss ngay
lượt đầu.

`phan` quyết định CỤM CACHE, và có đúng **3 cụm**:
- `phan` ≤ 13 → lá số đã bỏ chi tiết đại vận (`stripDaiVanDetail` — khối đó là
  47,7% lá số mà phần 1-13 không dùng);
- `phan` 14-24 → toàn văn;
- **bỏ trống** (đường `buildPromptThang` của van-han-nam) → toàn văn.

Bỏ trống = toàn văn là CỐ Ý: quên truyền thì tốn token, không thiếu dữ liệu.
`nhat-ky/2026-09.md` mục "Giá Gemini ghi bằng NỬA giá thật".

## Bảng giá model — `lib/agent/usage.ts`

⚠️ **Giá phải TRA bảng giá nhà cung cấp, cấm gõ từ trí nhớ** — dòng
`gemini-2.5-flash` từng ghi 0.15/1.25 (giá Gemini **2.0**) nên mọi `cost_vnd`
Gemini ghi bằng ĐÚNG MỘT NỬA suốt nhiều tháng, im lặng tuyệt đối vì model có
trong bảng nên không rơi vào nhánh fallback nào.

Sai số kiểu này luôn nghiêng về phía **thổi phồng biên LN**, nên đường
hụt-bảng-giá phải nghiêng ngược lại: fallback theo họ lấy mức **ĐẮT NHẤT** trong
họ, không trỏ vào một model cụ thể. Giá khuyến mãi có hạn (3.8 Flash ×2 từ
01/01/2027) phải ghi mốc ngay tại dòng đó.

🪤 `GEMINI_MODEL` có **HAI** dòng mặc định (`lib/llm/complete.ts` +
`lib/agent/providers/gemini.ts`) — sửa một chỗ là khi env trống hai nhánh chạy
hai model khác nhau, không có gì báo.

## `max_tokens` KHÔNG phải trần cho phần CHỮ

Opus 5 tự bật `thinking` và token nghĩ ăn CHUNG trần đó. `buildAnthropicBody`
không truyền `thinking`, mặc định của model là BẬT ⇒ mọi lượt trả về
`[thinking, text]`. Đo thật: phần 4 tốn 1160 token cho 920 chữ khi bật, 570
token cho 993 chữ khi tắt — phần nghĩ ăn ~500–900 token, trần hiệu dụng cho văn
chỉ còn **~40–55%** con số ghi trong code.

Đặt trần mới thì phải cộng `THINK_BUDGET` (xem `app/api/lasotuvi/route.ts`), và
**đừng đọc `max_tokens` như số chữ tối đa**. Đây là nguyên nhân gốc của 7,9%
phần luận bị cắt giữa câu trên hàng đã bán. `docs/nhat-ky/2026-09.md` "Token
NGHĨ ăn chung trần".

## `effort:'low'` cho route văn dài — CHỌN CÓ ĐO, đừng đổi mò

A/B mù 48 bản: `low` rẻ hơn 39% output token mà chữ ra NHIỀU hơn, 16 cặp chấm mù
không phân biệt được chất lượng. `effort` nằm TRONG `output_config`, đặt sai chỗ
thì API bỏ qua IM LẶNG.

⚠️ **Đừng đổi sang `thinking:{type:'disabled'}` cho rẻ thêm 2%** — Opus 5 tắt hẳn
thinking có thể RÒ THẺ `<thinking>` ra chính văn, mà văn này bán cho khách;
`disabled` còn bị 400 ở effort `xhigh`/`max`. Và `THINK_BUDGET` vẫn phải giữ:
7/16 lượt model vẫn nghĩ. `nhat-ky/2026-09.md` "A/B mù 48 bản".

## Ba họ prompt — mỗi prompt đúng MỘT nguồn bố cục

`lib/agent/prompts.ts`: `arcCore` (rail chat, mang bối cảnh "vừa đọc xong bản
luận", ngân sách 120–180 từ) · `arcDoc` (bản luận giải dài) · `arcGiong` (bản
trả JSON có schema — chỉ chở GIỌNG, đụng bố cục là phá schema). KHÔNG dùng lẫn.
`npm run check:prompt`.

- **Càng thêm luật thì luật càng mất tác dụng.** Đo được: 75% prompt từng là luật
  giọng, 12 lượt tranh quyền ưu tiên trong CÙNG một prompt. Khối mới phải **THAY**,
  không cộng dồn. Chạm trần `check:prompt` thì **CẮT chỗ khác**, đừng nới trần;
  nới thì phải ghi lý do.
- **Đổi công thức thì phải quét cả chỗ MÔ TẢ công thức** — prompt LLM không được
  typecheck bắt. Đã cắn với Kim Lâu (công thức sang mod 9 mà 3 chỗ vẫn nói "chu
  kỳ 5").
- **Giọng dạy bằng VÍ DỤ rẻ và ăn hơn dạy bằng LUẬT** — thấy giọng nhạt thì thêm
  một mẫu, đừng viết lại bảng khẩu ngữ.
- **`extractGenericContext` bỏ IM LẶNG mọi giá trị là object** ⇒ payload gửi rail
  phải PHẲNG. `npm run check:railfields` / `check:railwrap`.
- **Bản đang chạy phải khớp bản trong repo.** Edge function / RPC deploy xong phải
  **đọc ngược lại** rồi mới báo xong — đã cắn 4 lần (có lần chuỗi mô tả giao dịch
  gõ không dấu đi thẳng tới người dùng).

## Nợ đã ghi nhận

- `trimLaSo` / `buildPrompt` (bản không cache) là **code chết** — 0 route gọi.
