# Đa ngôn ngữ — quy ước kỹ thuật (W4)

Hợp đồng ngôn ngữ ở `lib/i18n/locales.ts` · kế hoạch ở `WORKPLAN.md`. File này: **cách chạy** và **luật cho W6/W7/W8**.

## Luồng một request `/ja/app/bat-tu`
1. `proxy.ts` bóc `/ja`, gắn header `x-tvmb-locale: ja`, rewrite nội bộ → `app/i18n-render/[locale]/[[...path]]`.
2. Route fetch NỘI BỘ `/app/bat-tu` (đi qua đủ rewrites/redirects/route SSR — không chép bảng URL), rồi `lib/i18n/render.mjs` thay chữ theo từ điển **trên server**.
3. Trang dịch ĐỦ → canonical tự trỏ, `hreflang` đủ bản + `x-default`→vi, `<html lang>`. Trang CHƯA đủ → `noindex` (meta + `X-Robots-Tag`), không canonical/hreflang, không vào sitemap.
4. URL `vi` đi nguyên trạng; proxy chỉ gắn header `Link: …hreflang…` cho trang đã có bản dịch. `/vi/…` → 308 về không tiền tố. Không redirect theo Accept-Language/cookie (crawler thấy URL ổn định).
5. Client (`public/i18n.js`): bộ chọn ngôn ngữ (quả địa cầu + tên bản ngữ, không cờ), thanh gợi ý "View in 日本語?" (cookie `tvmb_locale`, chỉ khi trang đích đã dịch), `TVMB_I18N.t()` cho chữ JS. **Không dịch trang ở client.**

## Đánh dấu chữ
- HTML tĩnh: `data-i18n="khoá"` (thay innerHTML) · `data-i18n-attr="placeholder:khoá;title:khoá2"` · `<title data-i18n>` · meta `content:khoá`. Chữ Việt giữ trong HTML làm fallback.
- Chữ do JS dựng: `T('js.<ns>.<khoá>', 'chữ Việt')` (`var T = …TVMB_I18N.t` ở đầu file). Khoá `js.*` được server nhúng vào trang. Namespace tự nhận: `shell` (trang nạp `shell.js`), `nav` (`nav.js` bản đầy đủ).
- **W13:** `window.I18n.tv(khoá, chữViệt, {biến})` (`tools-shared/i18n.js`, server chèn vào `<head>` trang `/<locale>/`) đọc CÙNG từ điển nhúng; `I18n.href('/x')` cho link do JS dựng (`href="/…"` trong mảnh đã dịch được tự đổi). `auth.js`/`topup.html` gọi qua `_tvmbT`/`_tvmbHref` toàn cục. Namespace MỀM (`SOFT_NS` trong `render.mjs`: `shellui` `paywall` `auth` `prices`, + `js.<ns>` nội tuyến của trang) được nhúng nhưng KHÔNG chặn độ đủ/hreflang của trang. Bọc theo vùng dòng: `npm run i18n:tag-js -- public/x.js --prefix js.ns --lines 100-200,…`.
- Rút tự động: `npm run i18n:tag -- public/x.html --prefix tiền-tố` · `npm run i18n:tag-js -- public/x.js --prefix js.ns --calls hàm:thứTự`. **Đọc diff** trước khi commit. Câu Y HỆT dùng lại khoá (HTML chỉ dùng lại khoá không phải `js.*`).
- Trang HTML mới có chữ cần dịch: tag xong chạy `npm run i18n:pages`.

## Từ điển
- `i18n/vi.json` `{khoá: câu gốc}` = NGUỒN. `i18n/<locale>.json` `{khoá:{t,h}}`, `h` = hash câu gốc → biết câu nào đổi (stale: vẫn hiển thị, `i18n:next` đưa lại).
- `zh-cn.json` **SINH** từ `zh-tw.json` bằng `opencc-js` (twp→cn). Không sửa tay (`check:i18n` bắt).
- `i18n/pages.json`, `availability.json` **SINH** (`npm run i18n:pages`, `i18n:save` tự chạy). Conflict merge → chạy lại, đừng gộp tay.
- Trang "đã dịch" = mọi khoá của trang (+ khoá `js.*` của namespace nó nạp) có bản dịch.

## Dành cho W7 (người dịch)
```bash
npm run i18n:status [-- --pages]                     # còn thiếu/cũ bao nhiêu, trang nào sắp đủ
npm run i18n:next -- --locale ja --n 200 [--page /app]  # lô JSON chỉ gồm khoá thiếu/cũ (thứ tự: shell → trang ưu tiên → còn lại)
npm run i18n:save -- --locale ja --file lo.json      # {"khoá":"bản dịch"} hoặc [{"k","t","same":true?}]; stdin cũng được
```
`save` kiểm: khoá tồn tại · thẻ HTML + `{token}` khớp câu gốc · không chép nguyên câu gốc (tên riêng/email giữ nguyên → `"same":true`) · CJK không còn nhiều chữ Việt. Câu tốt vẫn lưu, câu hỏng in lý do, exit 1. Lưu `zh-tw` tự sinh lại `zh-cn`. KHÔNG dịch `zh-cn`. Thứ tự ưu tiên trang: `i18n/priority.json` (mảng đường dẫn, tuỳ chọn).

## Route tự dịch từ DB (tự quản SEO)
Route tự render đúng ngôn ngữ và tự xuất robots/canonical/hreflang theo từng bản ghi (hiện: `/nghiem-chung`, `/xac-dinh-gio-sinh`) đăng ký ở **`lib/i18n/self-managed.mjs`** (`SELF_MANAGED_PREFIXES`, một chỗ duy nhất). Với `/<locale>/<prefix>…` proxy bóc tiền tố + gắn `x-tvmb-locale` rồi rewrite THẲNG tới route, KHÔNG qua `i18n-render`, KHÔNG noindex tự động; route đọc `localeFromHeaders()` và tự quyết (bản chưa dịch → 404). Các prefix này không nằm trong `availability.json`; `check:i18n` cấm đăng ký chồng.

## Trang chỉ MỘT ngôn ngữ
Trang không có bản dịch và không có bản vi (vd `public/tokushoho.html`, tiếng Nhật) đăng ký ở `lib/i18n/single-locale.mjs` (`SINGLE_LOCALE_PAGES`) **và** tự khai `<meta name="tvmb-single-locale" content="ja">`. Proxy: `/ja/<path>` phục vụ nguyên file (trang tự lo canonical/robots; không chèn hreflang), `/en/<path>` → 404, `/<path>` không tiền tố → 308 về `/ja/<path>`. Không vào `availability.json` ⇒ không hreflang chéo, không lên sitemap ngôn ngữ khác. Link nội bộ từ trang đã dịch trỏ thẳng bản có tiền tố. `check:i18n` soi hai chiều (meta ↔ danh sách) và cấm trang này có `data-i18n`.

## Ngôn ngữ lúc đăng ký
`public/auth.js` gắn ngôn ngữ hiện tại (tiền tố URL, rồi cookie `tvmb_locale`) vào **`user_metadata.locale`** (`data.locale` của body `POST /auth/v1/signup` và `PUT /auth/v1/user` của `claimAccount`) để email/hoá đơn đúng ngôn ngữ. Không biết ngôn ngữ ⇒ không gửi trường (như cũ). Đăng nhập Google/Facebook và phiên ẩn danh KHÔNG mang trường này (OAuth không cho truyền metadata) — bên gửi email nên rơi về bảng `user_locale` của W11 rồi mới về tiếng Việt. Bump `auth.js?v=` khi đổi.

## Dành cho W6 / W8
- Route SSR/handler đọc ngôn ngữ qua `localeFromHeaders(req.headers)` — proxy đã gắn header, nhưng trang SSR (không phải HTML tĩnh) hiện chỉ được phục vụ dưới `/<locale>/…` ở dạng `noindex` (không có khoá data-i18n) cho tới khi tự chịu trách nhiệm bản dịch. Muốn index: render sẵn chữ đúng ngôn ngữ trong route VÀ đăng ký trang (đưa vào `availability`) — trao đổi với W4.
- Prompt LLM: câu chỉ định ngôn ngữ đặt ở USER message (giữ cache `cachedSystemFor`). Chi tiết ở mục "Ngôn ngữ đầu ra của LLM (W8)" dưới đây.
- `?v=` bump: đã bump `nav.js`→48, `shell.js`→140, `shell.css`→79 ở mọi nơi TRỪ `public/topup.html` (W5) và `lib/nghiem-chung/trang-hub.ts`, `trang-ho-so.ts` (W6) — **W5/W6 tự bump ba chỗ đó** (`nav.js?v=48`).

## Ngôn ngữ đầu ra của LLM (W8)
Lõi: `lib/llm/locale.ts`. Khách `vi` giữ NGUYÊN từng byte prompt và khoá cache.
- **Lấy ngôn ngữ request bằng `requestLocale(req)`** — KHÔNG tự parse URL/cookie. Thứ tự: header `x-tvmb-locale` → `Referer` cùng nguồn có tiền tố `/<locale>/` → `vi`. Vì `fetch('/api/…')` của JS trang không đi qua proxy nên không có header; `Referer` là URL trang. Cookie `tvmb_locale` **không dùng** (chỉ nhớ lựa chọn, có thể lệch trang). App native/bên gọi khác gửi header `x-tvmb-locale`. `ChatRequestV1.locale` (contract, additive) do SERVER điền, đè giá trị client gửi; kênh chat (Telegram/Zalo/Messenger) không đặt ⇒ luôn Việt.
- **Câu chỉ định ngôn ngữ nối vào CUỐI tin user** bằng `withLang(userText, locale, [văn bản lá số], opts)` (`opts.json` cho tool JSON, `opts.rail` cho rail có dòng `SUGGEST:`). KHÔNG bao giờ vào system (giữ cache `cachedSystemFor`). Khối chỉ chứa: chỉ định ngôn ngữ · THAY luật xưng hô/khẩu ngữ/Hán-Việt bằng MỘT mẫu giọng · tên thương hiệu/bộ môn · thuật ngữ của đúng cung/sao có trong lá số (glossary, trần 90).
- **Khoá cache:** `vi` giữ khoá cũ; ngôn ngữ khác thêm `localeKeySuffix(locale)` (`|loc:ja`). Đã nối ở `previewKey` và khoá `hook-narrative`. `portrait_cache` (7 tool chân dung/cẩm nang, W18): `cacheFor` nhận `locale` BẮT BUỘC ở `get/lookup/put/touch` — ngôn ngữ chỉ đổi khoá DÒNG cache (`cacheRowKey` = `lasoKey|loc:ja`), **KHÔNG truyền hậu tố qua `extra`** (`extra` vào `lasoKey` = đổi khoá SỞ HỮU ⇒ người đã trả ở vi bị tính lại ở /ja). Pha ảnh truyền `KHONG_THEO_NGON_NGU` (một ảnh mọi ngôn ngữ). `_shape` vẫn KHÔNG vào khoá.
- **`laso_public.luan_giai` chỉ giữ tiếng Việt:** `save-laso` bỏ chữ luận khi ngôn ngữ ≠ `vi`; ai đọc lại luận đã lưu (`van-han-nam`, PDF, `/la-so/<slug>`) hiểu đó là tiếng Việt. Muốn lưu luận đa ngôn ngữ cần kho khoá theo `(slug, locale)` — việc kèm lúc dịch trang luận.
- Thêm ngôn ngữ/đổi tên thương hiệu: sửa bảng `VOICE` trong `lib/llm/locale.ts` (khớp bảng W7). Thuật ngữ lấy từ `lib/i18n/glossary/`.

## Font CJK
**PDF (W18) dùng font RIÊNG:** 4 TTF tĩnh `data/pdf-fonts/` (`npm run pdf:fonts` trong prebuild, `lib/pdf/cjk-font.ts`) — KHÔNG dùng lát woff2 dưới đây (font biến thiên cùng tên PostScript ⇒ react-pdf in trang trắng). Route PDF mới phải mang `PDF_FONT_FILES` (`next.config.mjs`).

`@fontsource-variable/noto-sans-{jp,kr,tc,sc}` (devDependencies) → `npm run i18n:fonts` (chạy trong `prebuild`) sinh `public/fonts/cjk/*.woff2` + `public/fonts/i18n-<locale>.css` (gitignore). Chỉ trang `/<locale>` CJK được chèn `<link>`; unicode-range theo lát nên chỉ tải lát có chữ. CLS: `font-display:swap`, 'Be Vietnam Pro' đứng đầu ngăn xếp (Latin giữ nét), sau đó Noto rồi font hệ thống CJK (glyph rộng 1em nên đổi font ít xô dòng). Tiêu đề dùng lớp riêng (vd Noto Serif) giữ nguyên font — CJK trong đó rơi về font hệ thống.

## Văn dài theo chỉ số (W16a)
Hào từ · lời khuyên/nghĩa 64 quẻ · luận Thể–Dụng · nghĩa sao/thần (613 chuỗi, ~46,8k ký tự) KHÔNG vào `i18n/<locale>.json` (sẽ kéo vào mọi trang nạp `js.shellui`). Bản dịch ở file riêng, tra theo **chỉ số** trong bảng nguồn:
`public/tools-shared/i18n-long/<locale>/<ns>.js` → `I18n.defineLong('<ns>', {"<khoá>":{"t":"…","h":"hash câu Việt"}})`. Namespace = module nguồn: `kinh-dich-hao` (`hao.<quẻ>.q|1-6|dung`) · `kinh-dich` (`que.<quẻ>.m|g`) · `mai-hoa` (`quai.<số>.nghia`, `qh.<ma>.tomTat|luan`) · `ky-mon` (`sao.<tên>`, `than.<tên>`).
- **Nạp:** module tự gọi `I18n.loadLong('<ns>')` ở đầu file — vi không nạp gì; locale khác chỉ nạp file của mình, chỉ ở trang dùng module. Tra: `I18n.long(ns, khoá, câuViệt)` (thiếu ⇒ câu Việt, không vỡ). **Chỉ ở chỗ vẽ** — `railData`/prompt/`viet` do `layLoi` trả giữ chữ Việt (luật SERVER_BOUND).
- **Dịch một locale (ko · zh-tw · en · tương tự ja):** `npm run i18n:long -- status` → lặp `npm run i18n:long -- next --locale <loc> --n 100` (JSON `{k:"<ns>/<khoá>", vi, ctx}`; `ctx` có tên quẻ + câu Hán) → viết `{"<ns>/<khoá>":"bản dịch"}` → `npm run i18n:long -- save --locale <loc> --file lo.json` → commit mỗi lô. `save` kiểm không rỗng · không chép nguyên · không còn dấu Việt. **Xong locale thì thêm nó vào `LONG_COMPLETE` trong `lib/i18n/long.mjs`** (bộ dò mới đòi đủ 100%); zh-tw và zh-cn đi cùng nhau — `save --locale zh-tw` tự sinh zh-cn bằng OpenCC (`i18n:long -- zhcn` sinh lại), KHÔNG dịch/lưu zh-cn.
- **Nguồn đổi chữ ⇒** `check:i18nlong` đỏ ("hash lệch nguồn") cho tới khi `next` + `save` lại câu đó. Nguồn thêm/bớt mục (quẻ, sao…) ⇒ mục mồ côi/thiếu bị bắt. Namespace/khoá mới: thêm vào `loadSources()` trong `lib/i18n/long.mjs` + `LONG_NS`/`LONG_MODULE`, module gọi `loadLong` và tra bằng `_long(`.
- **Chỗ vẽ chưa có UI** (đã dịch, sẵn hàm tra): `MaiHoaTool.nghiaQuai/tomTatQuanHe`, `KyMonTool.nghiaSao/nghiaThan`.

## Bộ dò
`npm run check:i18n` (trong lint CI; văn dài có bộ dò riêng `check:i18nlong`, xem trên): khoá có trong vi.json · pages/availability không cũ · zh-cn = OpenCC(zh-tw) · mô phỏng render từng trang×ngôn ngữ (đủ → hreflang đúng tập; thiếu → noindex, không hreflang) · không hreflang tĩnh viết tay cho bản chưa có · hằng số `i18n.js`/`links.mjs` khớp `locales.ts` · `?v=` của `/i18n.js` đồng nhất · matcher proxy phủ trang.

## Chưa làm (cố ý, ngoài MVP)
Chữ còn lại trong `shell.js` (rail chat, cmd-K, toast… hàng trăm chuỗi) và JS riêng từng trang — dùng `i18n:tag-js`/`T()`. Nội dung màn `/app` do JS dựng chưa dịch. `app/i18n-render` phục vụ HTML; route SSR có chữ trong code chưa có cơ chế dịch.
