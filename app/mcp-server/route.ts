// app/mcp-server/route.ts
// ============================================================
// TRANG GIỚI THIỆU MCP CÔNG KHAI — mục #9/14 (growth hack GH3b).
//
// Vì sao TÁCH khỏi /api-docs dù cùng "dành cho lập trình viên": mọi registry
// MCP đều đòi MỘT URL tài liệu riêng cho mỗi listing (`websiteUrl` trong
// server.json), người đọc ở đây dán config vào Claude/Cursor chứ không viết
// code gọi HTTP, và "MCP server tử vi" là cầu tìm kiếm riêng. Gộp vào một
// trang là vừa mất chỗ nộp vừa trộn hai tệp người đọc khác hẳn nhau.
//
// 📏 ĐỊNH VỊ ĐÃ ĐO (registry chính thức, 23/08/2026): `tuvi` 0 kết quả,
// `zodiac` 0, `astrology` 5 nhưng CẢ 5 đều Vedic. ⚠️ Còn "lịch âm Việt Nam"
// thì ĐÃ CÓ `com.am-lich/vietnamese-calendar` — nên trang này CỐ Ý không tự
// nhận là server lịch âm đầu tiên, chỉ nói đúng thứ mình khác họ: lập trọn lá
// số Tử Vi, không phải đổi ngày dương↔âm.
// ============================================================
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { TOOLS } from '@/lib/mcp/server';
import { SEO_BASE } from '@/lib/seo/entity';
import { orgNode } from '@/lib/seo/same-as';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MCP_URL = `${SEO_BASE}/mcp`;

const CLIENTS = [
  {
    name: 'Claude Code / Claude Desktop',
    body: `claude mcp add --transport http tuviminhbao ${MCP_URL}`,
    lang: 'bash',
  },
  {
    name: 'Cursor · Windsurf · client dùng khoá mcpServers',
    body: JSON.stringify({ mcpServers: { tuviminhbao: { type: 'http', url: MCP_URL } } }, null, 2),
    lang: 'json',
  },
  {
    name: 'VS Code (.vscode/mcp.json)',
    body: JSON.stringify({ servers: { tuviminhbao: { type: 'http', url: MCP_URL } } }, null, 2),
    lang: 'json',
  },
];

export async function GET() {
  // Bảng tool đọc THẲNG từ `TOOLS` — cùng nguồn với server. Gõ tay danh sách
  // ở đây là hẹn ngày trang nói có tool mà server không có (hoặc ngược lại).
  const toolRows = TOOLS.map((t) => `<tr>
      <td><code>${esc(t.name)}</code></td>
      <td>${esc(t.description)}</td>
      <td>${Object.keys(t.schema).map((k) => `<code>${esc(k)}</code>`).join(' ')}</td>
    </tr>`).join('');

  const clientBlocks = CLIENTS.map((c) => `
    <h3>${esc(c.name)}</h3>
    <pre>${esc(c.body)}</pre>`).join('');

  const schema = [
    await orgNode({ standalone: true }),
    {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication',
      name: 'Tử Vi Minh Bảo MCP Server',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      description: 'Free public MCP (Model Context Protocol) server for Vietnamese/Chinese astrology — Tử Vi Đẩu Số natal charts, luck cycles, compatibility and star meanings. No API key.',
      url: `${SEO_BASE}/mcp-server`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND' },
      publisher: { '@id': `${SEO_BASE}/bao-chi#organization` },
    },
  ];

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MCP Server Tử Vi Miễn Phí — Vietnamese Astrology MCP</title>
<meta name="description" content="MCP server tử vi miễn phí, không cần API key: lập lá số Tử Vi Đẩu Số, vận hạn theo năm, tương hợp hai người, tra ý nghĩa sao — dùng ngay trong Claude, Cursor, VS Code. Free Vietnamese Zi Wei Dou Shu MCP server.">
<link rel="canonical" href="${SEO_BASE}/mcp-server">
<meta property="og:title" content="MCP Server Tử Vi Miễn Phí — Vietnamese Astrology MCP">
<meta property="og:description" content="Lập lá số Tử Vi ngay trong Claude/Cursor. Không cần key, không cần cài gì.">
<meta property="og:url" content="${SEO_BASE}/mcp-server">
<meta property="og:image" content="${SEO_BASE}/seal.webp">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border-lt:#E8E8E8;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;color:var(--text);font-size:16px;line-height:1.6;background:#fff}
a{color:var(--blue)}
.page{max-width:880px;margin:0 auto;padding:0 40px 80px}
.hero{padding:48px 0 28px;border-bottom:2px solid var(--navy)}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
h1{font-size:32px;font-weight:400;color:var(--navy);margin-bottom:10px}
h1 em{font-style:italic;color:var(--gold)}
section{padding:28px 0;border-bottom:1px solid var(--border-lt)}
h2{font-size:19px;font-weight:400;color:var(--navy);margin-bottom:8px}
h3{font-size:13px;font-weight:600;color:var(--navy);margin:16px 0 6px}
p{color:var(--text-mid);margin-bottom:8px}
p.en{color:var(--text-lt);font-size:14px;font-style:italic}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;background:var(--bg-soft);padding:2px 6px;border-radius:4px}
pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.5;padding:12px;border:1px solid var(--border-lt);border-radius:8px;background:var(--bg-soft);overflow-x:auto}
.table-wrap{overflow-x:auto;margin-top:8px}
table{width:100%;min-width:420px;border-collapse:collapse;font-size:14px}
th,td{border:1px solid var(--border-lt);padding:6px 9px;text-align:left;vertical-align:top}
th{background:var(--bg-soft);font-weight:600;color:var(--navy)}
ul{margin:0 0 10px 20px;color:var(--text-mid)}li{margin-bottom:5px}
.note{background:var(--bg-soft);border-left:3px solid var(--gold);padding:12px 14px;font-size:14px;margin-top:12px}
@media(max-width:700px){.page{padding-left:16px;padding-right:16px}h1{font-size:25px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Free MCP server · No API key</div>
    <h1>MCP Server <em>Tử Vi</em></h1>
    <p>Cắm vào Claude, Cursor hay VS Code là hỏi thẳng về lá số — máy lập lá số bằng engine cổ pháp rồi đưa số liệu cho trợ lý của bạn luận. <b>Không cần API key, không cài đặt gì.</b></p>
    <p class="en">Free public MCP server for Tử Vi Đẩu Số (Zi Wei Dou Shu) — the Vietnamese/Chinese natal chart system. Deterministic engine, no LLM on our side, no key.</p>
  </div>

  <section>
    <h2>Cắm vào · Install</h2>
    ${clientBlocks}
    <div class="note">
      Bất kỳ client MCP nào nói được <b>Streamable HTTP</b> đều dùng được — chỉ cần URL
      <code>${MCP_URL}</code>. Server chạy <b>không phiên</b> (stateless), không lưu gì về bạn.
    </div>
  </section>

  <section>
    <h2>Có gì · Tools</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Tool</th><th>Làm gì</th><th>Tham số</th></tr></thead>
      <tbody>${toolRows}</tbody>
    </table></div>
    <p style="margin-top:10px">Mọi tool đều <b>tra bảng thuần</b> — engine tính, server <b>không gọi mô hình ngôn ngữ nào</b>. Số liệu trả về là dữ kiện; phần luận là trợ lý của bạn viết.</p>
  </section>

  <section>
    <h2>Hạn mức · Limits</h2>
    <ul>
      <li>Lập lá số, tương hợp, tra sao, và vận hạn <b>năm hiện tại trở về quá khứ</b>: không giới hạn.</li>
      <li>Vận hạn <b>năm tương lai</b> cần key riêng — lấy trong <a href="/profile.html">hồ sơ tài khoản</a>, rồi đổi URL thành <code>${SEO_BASE}/mcp/&lt;key&gt;</code>.</li>
      <li>Không SLA. Đây là dịch vụ tặng kèm. <span class="en">No SLA.</span></li>
      <li>Tử Vi là tra cứu văn hoá, không phải lời khuyên y tế/tài chính/pháp lý.</li>
    </ul>
  </section>

  <section style="border-bottom:none">
    <h2>Xem thêm</h2>
    <ul>
      <li><a href="/api-docs">API âm lịch REST miễn phí</a> — nếu bạn muốn gọi HTTP thẳng thay vì qua MCP.</li>
      <li><a href="/nhung">Nhúng công cụ vào website</a> · <a href="/bao-chi">Thông tin báo chí</a></li>
      <li>Hỏng hoặc thiếu gì: <a href="mailto:contact@tuviminhbao.com">contact@tuviminhbao.com</a></li>
    </ul>
  </section>
</div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=26" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
