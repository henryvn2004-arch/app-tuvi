import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { NOINDEX_FOLLOW, NOINDEX_NOFOLLOW } from '../../lib/seo/index-policy';

// `/la-so/[slug]` tính tại chỗ (họ ISR, ~587K trang) không được mời bot đi theo liên kết: khối "Xem thêm lá số
// liên quan" nối giờ/ngày/giới kề nhau nên một crawler bò hết đồ thị, mỗi trang một lần chạy engine.
// Route nạp engine nặng ở cấp module nên không import được trong bài thuần node: kiểm trên mã nguồn, theo từng hàm.
const SRC = readFileSync(join(__dirname, '../../app/la-so/[slug]/route.ts'), 'utf8');

/** Thân một hàm cấp module: từ `function <name>(` tới `function` kế tiếp. Dừng hẳn nếu không thấy mốc (tránh xanh oan). */
function body(name: string): string {
  const start = SRC.indexOf(`function ${name}(`);
  expect(start, `không thấy hàm ${name}`).toBeGreaterThan(-1);
  const next = SRC.indexOf('\nfunction ', start + 10);
  return SRC.slice(start, next === -1 ? undefined : next);
}

test('hằng số: NOFOLLOW khác FOLLOW ở đúng chữ nofollow', () => {
  expect(NOINDEX_NOFOLLOW).toBe('<meta name="robots" content="noindex, nofollow">');
  expect(NOINDEX_FOLLOW).toBe('<meta name="robots" content="noindex, follow">');
});

test('trang ISR tính tại chỗ: noindex, nofollow', () => {
  const isr = body('buildIsrHTML');
  expect(isr).toContain('${NOINDEX_NOFOLLOW}');
  expect(isr).not.toContain('${NOINDEX_FOLLOW}');
});

test('khối liên quan: mọi liên kết có rel="nofollow"', () => {
  const rel = body('buildRelatedLinks');
  expect(rel).toContain('<a href="${l.url}" rel="nofollow"');
  expect(rel.match(/<a /g)?.length).toBe(1); // một mẫu anchor duy nhất, không có liên kết lọt ngoài
});

test('trang dựng sẵn (pregen) giữ noindex, follow: cần được bò lại để Google đọc noindex', () => {
  const pre = body('buildPregenHTML');
  expect(pre).toContain('${NOINDEX_FOLLOW}');
  expect(pre).not.toContain('NOINDEX_NOFOLLOW');
});
