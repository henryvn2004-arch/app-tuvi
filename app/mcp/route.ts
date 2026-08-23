// app/mcp/route.ts
// ============================================================
// MCP CÔNG KHAI — mục #9/14 (growth hack GH3b). URL: /mcp, KHÔNG cần key.
//
// 🔑 VÌ SAO MỞ ĐƯỢC MÀ KHÔNG SỢ ĐỐT TIỀN: cả 5 tool MCP đều DETERMINISTIC —
// engine tra bảng, 0 lượt gọi model. `luan_giai` nghe như tốn tiền nhưng nó
// chỉ trả BỘ PHÂN TÍCH thô để AI phía người dùng tự viết; server không luận
// chữ nào. Nên chi phí thật chỉ là CPU, cùng hạng với `/embed` và
// `/api/public/v1/*`. Đã kiểm từng tool trước khi mở, đừng mở thêm tool nào
// khác mà chưa kiểm lại điều này.
//
// 🔑 HẠN MỨC = GÓI MIỄN PHÍ, DÙNG LẠI y nguyên `t.quota` sẵn có, không viết
// cổng thứ hai. Hai con số chọn có lý do:
//   · `backtest_years: -1` — quá khứ vô hạn. Hạn mức backtest đếm THEO KEY, mà
//     cả thiên hạ dùng chung một key sentinel ⇒ để số hữu hạn thì vài người
//     đầu tiên đốt sạch hạn mức của mọi người sau. Mà tra quá khứ vốn 0đ.
//   · `future_years: 0` — GIỮ. Năm tương lai đúng là thứ người ta trả tiền, và
//     thông điệp từ chối sẵn có đã trỏ về trang lấy key. Đó là cả cái phễu.
//
// 📏 CHỖ TRỐNG — ĐO THẬT trên registry chính thức (23/08/2026), không phỏng đoán:
//   · `tuvi` → 0 kết quả · `zodiac` → 0
//   · `astrology` → 5, và CẢ 5 đều là Vedic (Ấn Độ). Không có Trung/Việt.
//   · ⚠️ NHƯNG `vietnam` → đã có `com.am-lich/vietnamese-calendar`.
// ⇒ Định vị PHẢI là "tử vi / chiêm tinh Trung–Việt", KHÔNG phải "lịch âm Việt
// Nam" — ô đó đã có người ngồi, và tự nhận là người đầu tiên ở đó thì vừa sai
// vừa dễ bị bác ngay khi ai đó tra. (Bản nháp đầu của tôi viết đúng câu sai
// đó; đo rồi mới sửa.) Server này khác họ về BẢN CHẤT: họ đổi ngày dương↔âm,
// còn đây lập trọn lá số + phân tích + tương hợp + vận hạn.
//
// Mỗi listing là một backlink từ tên miền mạnh. Theo dõi đã nộp chỗ nào ở
// panel "Tài Khoản & Entity" nhóm `registry`.
// ============================================================

import type { McpKeyInfo } from '@/lib/mcp/auth';
import { buildMcpHandler } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Khoá sentinel — PHẢI tồn tại thật trong `mcp_keys` vì `mcp_usage.key` có FK
 * trỏ sang đó. Xem `_patches/migration-mcp-public.sql`: thiếu dòng đó thì mọi
 * lượt ghi usage vi phạm FK rồi bị `logUsage` nuốt im lặng, và panel sẽ báo
 * "không ai dùng" trong khi thật ra là "không ghi được".
 */
const PUBLIC_KEY = '__public__';

const PUBLIC_INFO: McpKeyInfo = {
  key: PUBLIC_KEY,
  tier: 'free',
  label: 'Endpoint công khai',
  charts_allowed: 1,
  backtest_years: -1,
  future_years: 0,
  active: true,
};

const handler = buildMcpHandler(async () => ({ info: PUBLIC_INFO }), PUBLIC_KEY);

export async function GET(req: Request) {
  return handler(req);
}
export async function POST(req: Request) {
  return handler(req);
}
export async function DELETE(req: Request) {
  return handler(req);
}
