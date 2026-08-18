#!/usr/bin/env node
// Dựng danh sách URL cho Lighthouse khi đo một bản PREVIEW.
//
// Giữ đúng các ĐƯỜNG DẪN khai trong lighthouserc.json nhưng ghép sang host vừa
// deploy. Đọc thẳng từ file đó, KHÔNG chép tay danh sách sang workflow — chép là
// hai bản sẽ trôi khỏi nhau rồi Lighthouse âm thầm đo thiếu trang.
//
// 🔑 Vé qua Vercel Authentication gắn vào QUERY, cố ý KHÔNG dùng `extraHeaders`
// của Lighthouse: header lạ áp lên cả request KHÁC ORIGIN sẽ bị CORS chặn
// (đã trả giá ở #466 với fonts.gstatic.com) — mà font hỏng thì chính con số
// Lighthouse đang đo cũng sai theo.
//
// In ra một dòng, các URL cách nhau bằng dấu cách.
// Env: TARGET_URL (bắt buộc) · BYPASS (tuỳ chọn) · LHCI_RC (tuỳ chọn, để test).

import { readFileSync } from 'node:fs';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) {
  console.error('Thiếu TARGET_URL');
  process.exit(1);
}

const rcPath = process.env.LHCI_RC || 'lighthouserc.json';
const rc = JSON.parse(readFileSync(rcPath, 'utf8'));
const urls = rc?.ci?.collect?.url;
if (!Array.isArray(urls) || urls.length === 0) {
  console.error(`${rcPath} không khai ci.collect.url`);
  process.exit(1);
}

const base = new URL(targetUrl);
const bypass = process.env.BYPASS;

const out = urls.map((u) => {
  const target = new URL(new URL(u).pathname, base.origin);
  if (bypass) {
    target.searchParams.set('x-vercel-protection-bypass', bypass);
    target.searchParams.set('x-vercel-set-bypass-cookie', 'true');
  }
  return target.toString();
});

console.log(out.join(' '));
