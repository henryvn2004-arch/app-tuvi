# MCP Server — tuviminhbao.com

Remote MCP server (Streamable HTTP) chạy ngay trong project Next.js. User kết
nối từ Claude / ChatGPT / Gemini… của họ; token luận giải là của user. Server
chỉ trả **dữ liệu tính toán deterministic + block có sẵn**, không bao giờ dump
quy tắc an sao.

- **URL:** `https://www.tuviminhbao.com/mcp/<key>` (key nhúng trong path).
- **Transport:** Streamable HTTP (không dùng SSE cũ).
- **Package:** [`mcp-handler`](https://www.npmjs.com/package/mcp-handler) (Vercel) + `zod`.

## Tools

| Tool | Khi nào dùng | Quota (free) |
|---|---|---|
| `an_sao` | Có ngày/giờ/giới tính sinh → lập lá số (12 cung, chính/phụ tinh, tứ hóa, đại vận). | **Không giới hạn** (hook). |
| `van_han` | Vận hạn một NĂM (thêm `thang` → hạn tháng; thêm `thang`+`ngay` → hạn ngày): tuổi mụ, lưu Thái Tuế, lưu đại vận, tiểu hạn, tứ hóa, đại vận + điểm, blocks. | Chỉ năm **quá khứ**, tối đa `backtest_years` năm. Tương lai → mời nâng cấp. |
| `luan_giai` | Phân tích chi tiết (24 mục): điểm từng cung, cung mạnh/yếu, cách cục, tứ hóa, thần sát, tuần/triệt, đại vận. | Không giới hạn. |
| `tuong_hop` | So 2 lá số — hôn nhân (`loai=vo-chong`) hoặc làm ăn (`loai=lam-an`) + quan hệ địa chi năm sinh. | Không giới hạn. |
| `giai_thich_sao` | Hỏi ý nghĩa một sao (tùy chọn theo cung), kèm tướng mạo/hình dáng nếu có. Nguồn: `public/cach_cuc_all.json` (cách cục) + `public/tuong_mao_sao.json` (tướng mạo, trích Tử Vi Đẩu Số Tân Biên - Thái Thứ Lang). | Không giới hạn. |

`master` tier bỏ mọi giới hạn.

## Kiến trúc (2 thư mục mới — xóa đi là app về nguyên trạng)

```
app/mcp/[key]/route.ts     # mount mcp-handler; streamableHttpEndpoint = /mcp/<key>
lib/mcp/engine.ts          # loader riêng: lấy TU_HOA từ engine (không sửa laso.ts)
lib/mcp/auth.ts            # validate key + tier/quota (mcp_keys, service key)
lib/mcp/usage.ts           # log mcp_usage + đếm distinct năm van_han (quota)
lib/mcp/tools/_shared.ts   # kiểu McpTool + helper (parse giờ/ngày, format sao)
lib/mcp/tools/an-sao.ts    # tool 1
lib/mcp/tools/van-han.ts   # tool 2
lib/mcp/tools/giai-thich.ts# tool 3
```

Nguồn lá số DUY NHẤT là engine deterministic `public/tuvi-ansao-engine.js` (qua
`computeLaso` trong `lib/engine/laso.ts`) — cùng engine web dùng, parity tuyệt
đối. Vận hạn tái dùng Phụ lục A đã có sẵn trong engine (`tinhTieuHan`,
`tinhLuuDaiHan`, `TU_HOA`) — đã verify khớp 100% test case 1984-05-09.

## Việc tay để chạy thật

1. Chạy `_patches/migration-mcp.sql` trong Supabase SQL Editor (tạo `mcp_keys`,
   `mcp_usage` + RLS + seed 1 key free `mcp_free_test_000000000001` và 1 key
   master `mcp_master_test_00000000001`).
2. Không cần env mới — dùng `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` sẵn có.
3. Cấp key cho user: `insert into mcp_keys (key, tier, label) values ('<24 ký tự url-safe>', 'paid', 'email user');`

## Cách người dùng kết nối

### Claude (Desktop / Web)
Settings → **Connectors** → **Add custom connector** → dán URL:
```
https://www.tuviminhbao.com/mcp/<key-của-bạn>
```
Không cần auth thêm (key nằm trong URL). Sau khi kết nối, 3 tool xuất hiện; hỏi
"lập lá số cho nam sinh 9/5/1984 lúc 1h45" → Claude gọi `an_sao`.

### ChatGPT
Bật **Developer mode / Connectors** → Add MCP server → Streamable HTTP → dán
cùng URL trên.

### Kiểm thử (MCP Inspector)
```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP
# URL: http://localhost:3000/mcp/mcp_free_test_000000000001
```
Hoặc curl trực tiếp:
```bash
curl -s -X POST http://localhost:3000/mcp/<key> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Test case nghiệm thu (đã pass 100%)

Nam, dương lịch **1984-05-09 01:45** (giờ Sửu):
- `an_sao` → Mệnh **Thìn** (Tử Vi + Thiên Tướng), Thân **Ngọ**, **Mộc Tam Cục**,
  dương nam thuận, đại vận **43–52 tại Thân**.
- `van_han` 2026 → lưu Thái Tuế **Ngọ**, lưu đại vận **Thân**, tiểu hạn **Thìn**.
- `van_han` 2027 → lưu Thái Tuế **Mùi**, lưu đại vận **Dần**, tiểu hạn **Tỵ**.
