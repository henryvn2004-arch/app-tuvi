// app/shared-chat/[id]/route.ts
export const revalidate = 86400; // cache 24h

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SB_URL  = process.env.SUPABASE_URL!;
const SB_SERV = process.env.SUPABASE_SERVICE_KEY!;
const BASE    = 'https://tuviminhbao.com';

function esc(s: unknown) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function mdToHtml(text: string): string {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)$/gm,'<h3>$1</h3>')
    .replace(/\n{2,}/g,'</p><p>')
    .replace(/\n/g,'<br>');
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const sb = createClient(SB_URL, SB_SERV);
  const { data, error } = await sb
    .from('shared_chats')
    .select('id, created_at, tool_type, label, summary, messages, expires_at')
    .eq('id', id)
    .single();

  if (error || !data) return new NextResponse('Không tìm thấy hội thoại này.', { status: 404 });

  const expires = data.expires_at ? new Date(data.expires_at) : null;
  if (expires && expires < new Date()) {
    return new NextResponse('Liên kết này đã hết hạn.', { status: 410 });
  }

  type Msg = { role: string; content: string };
  const msgs: Msg[] = Array.isArray(data.messages) ? data.messages : [];
  const created = new Date(data.created_at).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
  const pageUrl = `${BASE}/shared-chat/${id}`;
  const title   = esc(data.label) + ' — Tử Vi Minh Bảo';
  const desc    = data.summary ? esc(data.summary) : 'Hội thoại tư vấn Tử Vi từ Tử Vi Minh Bảo.';

  const msgHtml = msgs.map(m => {
    if (m.role === 'user') {
      return `<div class="msg msg-user"><div class="bubble">${esc(m.content)}</div></div>`;
    }
    return `<div class="msg msg-ai"><div class="avatar">🔮</div><div class="bubble"><p>${mdToHtml(m.content)}</p></div></div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${BASE}/seal.webp">
<meta name="robots" content="noindex">
<link rel="canonical" href="${pageUrl}">
<link rel="icon" type="image/webp" href="/seal.webp">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--gold:#9A7B3A;--bg:#F5F4F0;--bg-card:#fff;--text:#1a1a1a;--text-lt:#666;--border:#E0DDD8}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
header{background:var(--navy);padding:14px 20px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}
header a{text-decoration:none;display:flex;align-items:center;gap:10px}
header img{width:32px;height:32px;border-radius:50%}
header .site{font-size:14px;font-weight:600;color:#fff;letter-spacing:.3px}
header .tag{font-size:11px;color:rgba(255,255,255,.5);margin-left:auto;white-space:nowrap}
.wrap{max-width:760px;margin:0 auto;padding:24px 16px 80px}
.chat-meta{padding:16px 0 20px;border-bottom:1px solid var(--border);margin-bottom:20px}
.chat-label{font-size:20px;font-weight:600;color:var(--navy);margin-bottom:6px}
.chat-sub{font-size:13px;color:var(--text-lt)}
.chat-summary{margin-top:10px;padding:12px 14px;background:#EEF3FB;border-left:3px solid #1455A4;border-radius:4px;font-size:14px;line-height:1.6;color:#1a3a6a}
.msgs{display:flex;flex-direction:column;gap:14px}
.msg{display:flex;gap:10px;align-items:flex-start}
.msg-user{flex-direction:row-reverse}
.msg-user .bubble{background:var(--navy);color:#fff;border-radius:18px 18px 4px 18px;white-space:pre-wrap;word-break:break-word}
.msg-ai .bubble{background:var(--bg-card);border:1px solid var(--border);border-radius:4px 18px 18px 18px}
.bubble{padding:12px 16px;font-size:15px;line-height:1.65;max-width:88%}
.bubble p{margin:.5em 0}.bubble p:first-child{margin-top:0}.bubble p:last-child{margin-bottom:0}
.bubble strong{font-weight:600}.bubble em{font-style:italic}.bubble h3{font-size:15px;font-weight:700;margin:.75em 0 .25em;color:var(--navy)}
.avatar{width:32px;height:32px;border-radius:50%;background:var(--navy);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;margin-top:4px}
.cta{margin-top:32px;padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;text-align:center}
.cta p{font-size:14px;color:var(--text-lt);margin-bottom:12px}
.cta a{display:inline-block;background:var(--navy);color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500}
.cta a:hover{background:#0d2a4a}
@media(max-width:500px){.bubble{font-size:14px;padding:10px 13px}.chat-label{font-size:17px}}
</style>
</head>
<body>
<header>
  <a href="${BASE}"><img src="${BASE}/seal.webp" alt="Tử Vi Minh Bảo"><span class="site">Tử Vi Minh Bảo</span></a>
  <span class="tag">Hội thoại được chia sẻ</span>
</header>
<div class="wrap">
  <div class="chat-meta">
    <div class="chat-label">${esc(data.label)}</div>
    <div class="chat-sub">${esc(data.tool_type ?? 'Tư vấn tử vi')} · ${created}</div>
    ${data.summary ? `<div class="chat-summary">${esc(data.summary)}</div>` : ''}
  </div>
  <div class="msgs">
${msgHtml}
  </div>
  <div class="cta">
    <p>Bắt đầu hội thoại tử vi của riêng bạn</p>
    <a href="${BASE}/tuvi-chat.html">Mở Tử Vi Chat →</a>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 's-maxage=86400, stale-while-revalidate' },
  });
}
