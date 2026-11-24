import './_sb-env';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { checkRouteRate, rateLimitedResponse, requestIp, _resetRateState } from '../../lib/ops/rate-limit';

// Giới hạn theo route cho endpoint công khai tốn tiền (`/api/search`, `/api/tubinh`).
// Thuần node: không gọi mạng, không cần Supabase.

test.beforeEach(() => _resetRateState());

test('cho qua đủ ngưỡng, lượt vượt bị chặn', () => {
  for (let i = 1; i <= 3; i++) expect(checkRouteRate('t', 'ip:1', 3).allowed).toBe(true);
  const over = checkRouteRate('t', 'ip:1', 3);
  expect(over.allowed).toBe(false);
  expect(over.count).toBe(4);
  expect(over.limit).toBe(3);
});

test('mỗi route và mỗi IP có xô riêng', () => {
  for (let i = 0; i < 3; i++) checkRouteRate('a', 'ip:1', 3);
  expect(checkRouteRate('a', 'ip:1', 3).allowed).toBe(false);
  expect(checkRouteRate('b', 'ip:1', 3).allowed).toBe(true); // route khác
  expect(checkRouteRate('a', 'ip:2', 3).allowed).toBe(true); // IP khác
});

test('hết cửa sổ thì đếm lại từ đầu', () => {
  const real = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  try {
    for (let i = 0; i < 3; i++) checkRouteRate('w', 'ip:1', 3, 60_000);
    expect(checkRouteRate('w', 'ip:1', 3, 60_000).allowed).toBe(false);
    now += 60_001;
    expect(checkRouteRate('w', 'ip:1', 3, 60_000).allowed).toBe(true);
  } finally {
    Date.now = real;
  }
});

test('429 có Retry-After và CORS', () => {
  const res = rateLimitedResponse();
  expect(res.status).toBe(429);
  expect(res.headers.get('Retry-After')).toBe('60');
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
});

test('requestIp lấy IP đầu của x-forwarded-for, rồi x-real-ip, rồi unknown', () => {
  expect(requestIp(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }))).toBe('1.2.3.4');
  expect(requestIp(new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } }))).toBe('5.6.7.8');
  expect(requestIp(new Request('http://x'))).toBe('unknown');
});

// `/api/embed` từng cho ai cũng ghi được vào `tuvi_docs` bằng service key. Việc nạp tài liệu đi qua
// `/api/embed-tai-lieu` (có CRON_SECRET) hoặc `run_embed.py`; đừng dựng lại route không xác thực.
test('không có route /api/embed không xác thực', () => {
  expect(existsSync(join(__dirname, '../../app/api/embed/route.ts'))).toBe(false);
});
