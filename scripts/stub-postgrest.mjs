#!/usr/bin/env node
/**
 * stub-postgrest — máy chủ giả tối thiểu để `next build` chạy được trong CI.
 *
 * VÌ SAO CẦN:
 * `next build` prerender 63 trang, trong đó nhiều trang đọc Supabase ngay lúc
 * dựng. Không có endpoint nào trả lời thì build chết ở `getaddrinfo ENOTFOUND`
 * và ta KHÔNG phân biệt được "mã hỏng" với "thiếu env" — đúng cái bẫy CLAUDE.md
 * đã ghi. Trỏ `SUPABASE_URL` vào đây thì mọi lượt đọc trả mảng RỖNG, build đi
 * trọn 63/63 trang, và mã thoát nói đúng về MÃ chứ không về hạ tầng.
 *
 * ⚠️ ĐÂY KHÔNG PHẢI BỘ KIỂM NỘI DUNG. Nó cố ý trả rỗng cho mọi thứ — trang
 * dựng ra sẽ trống. Việc của nó là chứng minh **bản dựng còn sống**, không phải
 * chứng minh trang hiện đúng chữ. Đừng nới nó thành một bản Supabase giả đầy
 * đủ: càng giả giống thật thì càng dễ nuốt mất một lỗi thật.
 *
 * ⛔ CẤM dùng ở bất kỳ đường nào chạm dữ liệu thật. Chỉ cho `next build` trong CI.
 *
 * Chạy: node scripts/stub-postgrest.mjs [port]   (mặc định 54321)
 */
import http from 'node:http';

const PORT = Number(process.argv[2] || process.env.STUB_PGRST_PORT || 54321);

const srv = http.createServer((req, res) => {
  // `.single()` của supabase-js gửi `Accept: application/vnd.pgrst.object+json`
  // và chờ MỘT object. Trả 406 = "không có dòng nào" — đúng thứ PostgREST trả
  // khi `.single()` không khớp dòng nào, nên phía gọi đi vào nhánh "không có
  // dữ liệu" thay vì vỡ vì shape lạ (bẫy đã vấp một lần khi stub trả mảng).
  const single = String(req.headers.accept || '').includes('vnd.pgrst.object');
  res.writeHead(single ? 406 : 200, {
    'Content-Type': 'application/json',
    'Content-Range': '*/0',
  });
  res.end(single ? '{}' : '[]');
});

srv.listen(PORT, '127.0.0.1', () => {
  console.log(`stub-postgrest: 127.0.0.1:${PORT} — mọi lượt đọc trả rỗng`);
});
