# `docs/luat/` — phần CHI TIẾT của các luật trong `CLAUDE.md`

`CLAUDE.md` được nạp vào **mọi lượt**, nên ở đó mỗi luật chỉ được 1–3 dòng:
câu lệnh + hậu quả + con trỏ. "Vì sao", số đo, cách vá, bằng chứng — nằm ở đây.
**KHÔNG nạp tự động**, tra khi đụng đúng vùng đó:

```bash
grep -n 'từ khoá' docs/luat/*.md
sed -n '40,80p' docs/luat/tien.md      # đọc đúng đoạn, đừng cat cả file
```

| File | Chứa |
|---|---|
| `tien.md` | giá Lượng · giá trị 1 Lượng · guest checkout · dùng thử anon · chống trùng đường tiền · cache kết quả |
| `llm-prompt.md` | cụm cache prompt · bảng giá model · `max_tokens`/thinking/`effort` · ba họ prompt |
| `engine-cophap.md` | bảng âm lịch · khoá "cùng lá số" · Bát Trạch · cổ pháp đang treo |
| `postgres.md` | `RETURNS TABLE` · UPSERT ví · SECURITY DEFINER · `catch {}` rỗng |
| `bay.md` | phương pháp đo · shell · Playwright · CI · CLS · overlay · tiếng Việt |
| `chu-hien-thi.md` | KHÔNG nhắc "AI" trong chữ hiển thị · bộ từ thay thế · ngoại lệ pháp lý |
| `../ICONS.md` | luật icon đầy đủ |
| `../QC.md` | cấu hình QC, giới hạn đã biết, dựng máy mới |

**Luật ghi vào đây:** chi tiết mới viết ở file này, `CLAUDE.md` chỉ nhận thêm
**một dòng** trỏ về. Nếu một mục ở `CLAUDE.md` phình quá 3 dòng → chuyển thân
xuống đây, giữ lại con trỏ. Đó là cách file gốc không phình lại.
