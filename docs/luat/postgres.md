# Postgres / RPC — chi tiết

> Bản 1–3 dòng ở `CLAUDE.md`. Đây là phần "vì sao" và số đo.

- **Hàm `RETURNS TABLE` thì MỌI cột trong thân phải ghi kèm tên bảng** — trùng
  tên OUT param ⇒ `42702 ambiguous` ⇒ hàm chết hoàn toàn. Đã cắn 2 lần
  (`promo_code_redeem`, `process_referral_signup` — đường thưởng chết 6 ngày).
- **`UPDATE user_credits … WHERE user_id` phải UPSERT + soát `ROW_COUNT`** — ăn 0
  dòng vẫn chạy tiếp ⇒ **sổ nói đã trả, ví không tăng**. 9 tài khoản thật không
  có dòng ví.
- **Hàm SECURITY DEFINER mới LUÔN sinh ra hở**: EXECUTE cho PUBLIC là dựng sẵn
  của Postgres. Phải `REVOKE ALL FROM public, anon, authenticated` +
  `SET search_path = public, pg_temp` (nêu `pg_temp` tường minh, nếu không nó
  đứng đầu và che được bảng thật bằng bảng TẠM cùng tên).

  ⚠️ **Vá bằng `ALTER FUNCTION` chạy thẳng trên DB mà KHÔNG sửa lại
  `CREATE OR REPLACE` trong file migration nguồn là vá NỬA VỜI** — nó thay
  TOÀN BỘ `proconfig`, không cộng dồn với ALTER trước đó, nên deploy lại đúng
  file migration là hồi quy về `search_path` trần mà không ai để ý. Đã cắn:
  `tool_funnel`/`tool_funnel_lac` được vá ở đợt 2 rồi hồi quy, bắt lại ở đợt 3
  (`_patches/migration-secdef-search-path-batch3.sql`).
- **`} catch {}` rỗng trên đường tiền là cấm** — best-effort thì đúng, nhưng phải
  `console.error`, nếu không lỗi bay ra rồi bị nuốt trọn.
