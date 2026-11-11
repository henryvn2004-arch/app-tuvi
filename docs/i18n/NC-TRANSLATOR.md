# Dịch hồ sơ Nghiệm Chứng / Xác Định Giờ Sinh — hướng dẫn cho phiên dịch định kỳ (W9)

Mục tiêu: dịch văn xuôi hồ sơ sang `en` · `ja` · `ko` · `zh-tw` với **ít token nhất**. `zh-cn` KHÔNG dịch — `save` bản `zh-tw`
là tự sinh luôn `zh-cn` bằng OpenCC. Số liệu engine, điểm, kết luận khớp/trượt, nguồn đều giữ ở bản gốc; bạn chỉ dịch các trường
văn xuôi mà `next` đưa ra.

## Vòng làm việc (một lô)

```bash
export NODE_USE_ENV_PROXY=1      # fetch của Node không tự đi qua proxy container
# cần SUPABASE_URL + SUPABASE_SERVICE_KEY; không có thì thêm --source files --out-dir <thư mục> (chế độ thử)

node scripts/nc-i18n.mjs status --locale ja                 # còn bao nhiêu (đọc nhanh, 1 dòng JSON)
node scripts/nc-i18n.mjs next   --locale ja --n 4 > /tmp/lo.json     # lô cần dịch (JSON gọn, 1 dòng)
# → đọc /tmp/lo.json, viết bản dịch ra /tmp/lo.out.json (cùng cấu trúc, xem dưới)
node scripts/nc-i18n.mjs save   --file /tmp/lo.out.json              # kiểm rồi ghi
```

**Cỡ lô: 4 hồ sơ** (≈ 34k ký tự Việt vào, ≈ 20k ký tự ra). Tối đa 6 — hơn nữa thì file ra quá dài, hỏng một khoá là phải
viết lại cả lô. Hồ sơ nào lỗi thì `save` vẫn ghi các hồ sơ đạt; chỉ sửa lại hồ sơ lỗi rồi `save` lại (idempotent, ghi đè an toàn).

`next` đã xếp sẵn thứ tự ưu tiên: hồ sơ `indexed` trước → người được biết ở ngôn ngữ đó (có bài wiki ngôn ngữ đó, rồi nhiều
sitelink) → theo slug. Hồ sơ đã sửa sau khi dịch (văn xuôi gốc đổi) tự hiện lại với cờ `"da_sua":true`. Muốn có điểm ưu tiên
theo Wikidata: chạy `node scripts/nc-wikidata.mjs --source db` (một lần, nạp bù; 0 token).

## Định dạng đầu vào / đầu ra

Vào (`next`): `{"locale","quy_tac","glossary":{"Tử Vi":"紫微",…},"items":[{"slug","ten","goi_y_ten","ngheNghiep","f":{"tieuSu.0":"…"}}]}`
— `glossary` chỉ gồm thuật ngữ XUẤT HIỆN trong lô này; `goi_y_ten` là tên bản địa lấy từ Wikidata (có thì dùng đúng nó).

Ra: `{"locale":"ja","items":[{"slug","ten","ngheNghiep","f":{…ĐỦ MỌI khoá của f…}}]}` — `ten` là tên người đã dịch/phiên âm.
Đừng chép lại `goi_y_ten`, `da_sua`, `quy_tac`, `glossary`.

## Giọng văn và thuật ngữ

| ngôn ngữ | tên môn | giọng | ghi chú |
|---|---|---|---|
| `ja` | 紫微斗数 | です・ます調, trung tính | **新字体**: 禄 権 数 歳 徳 (glossary đã đổi sẵn — chép đúng chữ trong glossary). Ngày: 1912年6月23日. Tên nước ngoài: katakana theo `goi_y_ten`. |
| `ko` | 자미두수 | 합니다체 | Thuật ngữ theo Hangul trong glossary (đọc Hanja tất định từ Unihan, không đoán). Ngày: 1912년 6월 23일. |
| `zh-tw` | 紫微斗數 | 書面語, từ vựng Đài Loan | Chỉ viết phồn thể; cung viết đủ 宮 (命宮 官祿宮). Tên người theo `goi_y_ten`. |
| `en` | Zi Wei Dou Shu | plain, trung tính | Sao theo pinyin trong glossary ("Tian Ji"), cung theo glossary ("Career Palace"). Đang **chờ duyệt** bản en. |

Quy tắc chung:
- **Giữ mọi con số** (năm, điểm, %, tuổi). `450.000` viết `450,000` hay `45万`/`45만` đều được; thập phân phẩy hay chấm đều được.
- Tên cung/sao **phải** dùng đúng chữ trong `glossary` (bộ kiểm sẽ báo sai). Cung đơn âm viết "cung Mệnh" ở gốc → `命宮`.
- Tên tác phẩm/địa danh/tổ chức Latin (L'Étranger, Bletchley Park) được giữ nguyên hoặc dịch theo quy ước ngôn ngữ đích.
  **Không** để sót câu/từ tiếng Việt viết thường (không, của, và…) — `save` sẽ từ chối.
- Không thêm, không bớt ý; không giải thích thêm về Tử Vi. Giọng "lá số trúng/trượt" của gốc giữ nguyên tinh thần: nói thẳng chỗ khớp lẫn chỗ trượt.
- Người còn sống: giữ nguyên mức thận trọng của gốc, không thêm suy đoán đời tư.

## `save` kiểm gì (đỏ thì không ghi hồ sơ đó)

1. đủ MỌI khoá của `f`, không khoá lạ, có `ten`; 2. không còn chữ Việt viết thường; 3. không mất con số nào của gốc;
4. đúng thuật ngữ glossary (và `ja` không dùng chữ phồn thể thay 新字体); 5. tỉ lệ độ dài bản dịch/gốc hợp lý
(en 0.55–1.6 · ja 0.2–1.0 · ko 0.25–1.1 · zh 0.2–0.9) — bắt dịch thiếu ý hoặc dán nhầm.
`⚠` là cảnh báo (vẫn ghi). Trang chỉ hiện bản dịch có `status=ok` VÀ còn khớp `source_hash` của văn xuôi gốc; thiếu → 404
(không bao giờ lùi về chữ Việt).

## Số liệu nhịp dịch (đo trên 3 hồ sơ ja — xem PR)

Mỗi hồ sơ ≈ 8.400 ký tự Việt vào, ≈ 4.900 ký tự ja ra (JSON), 48–63 khoá. Phần thuật ngữ chung ≈ 1.000 ký tự/lô.
Ước lượng ≈ **7.000–7.500 token mỗi hồ sơ mỗi ngôn ngữ** (vào + ra) — đây là ước lượng theo ký tự, không phải đo bằng tokenizer;
W9 nên đối chiếu một lô thật với `/cost`.
