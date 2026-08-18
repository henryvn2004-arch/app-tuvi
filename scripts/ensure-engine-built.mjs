#!/usr/bin/env node
/**
 * Bảo đảm `tuvi-engine/dist` đã được dựng TRƯỚC khi chạy dev/typecheck.
 *
 * 🔴 Vì sao cần: `npm run build` đã tự dựng engine qua `prebuild`, nhưng
 * `npm run dev` thì KHÔNG có hook nào — nên máy vừa clone chạy
 * `npm ci && npm run dev` sẽ có một dev server mà mọi route đi qua
 * `lib/agent/tools.ts` (import thẳng `../../tuvi-engine/dist/**`) đều hỏng.
 *
 * 🪤 Và nó hỏng theo kiểu ĐÁNH LỪA — đã tốn một lượt chẩn sai:
 *   1. Route THẬT SỰ hỏng là `/api/payment`, báo đúng nguyên nhân
 *      (`Can't resolve '../../tuvi-engine/dist/lunar/convert.js'`);
 *   2. nhưng Next dev sau đó trả 500 cho cả những route KHÔNG liên quan
 *      (`/api/cong-so`, `/api/auth/session`) — đo được, không phải suy đoán;
 *   3. và bộ overlay lỗi của Next dev ném `ReferenceError: document is not
 *      defined` trong ngữ cảnh Node, đè lên dòng nguyên nhân thật.
 * Người đọc log thấy "document is not defined" ở một route không dính dáng gì
 * ⇒ đi tìm nhầm chỗ. Kêu SỚM bằng một câu rõ ràng rẻ hơn nhiều.
 *
 * Đường nhanh là một lượt `stat`: đã dựng rồi thì thoát ngay, không tốn gì.
 */
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = join(ROOT, 'tuvi-engine');

// Canh ĐÚNG file mà `lib/agent/tools.ts` import, không canh mỗi thư mục `dist`:
// một lượt build hỏng nửa chừng vẫn để lại `dist` rỗng.
const SENTINEL = join(ENGINE, 'dist', 'lunar', 'convert.js');

if (existsSync(SENTINEL)) process.exit(0);

console.log('\n⚙️  tuvi-engine chưa được dựng — đang dựng (chỉ lần đầu)…\n');

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: ENGINE,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return r.status === 0;
}

const deps = existsSync(join(ENGINE, 'node_modules')) || run('npm', ['ci']);
if (!deps || !run('npm', ['run', 'build']) || !existsSync(SENTINEL)) {
  console.error(
    '\n🔴 Dựng tuvi-engine THẤT BẠI.\n' +
      '   Chạy tay rồi thử lại:\n' +
      '       cd tuvi-engine && npm ci && npm run build\n' +
      '\n   Bỏ qua bước này thì dev server vẫn LÊN, nhưng mọi route đi qua\n' +
      '   lib/agent/tools.ts sẽ 500 — và Next dev còn kéo theo cả những route\n' +
      '   không liên quan, kèm "ReferenceError: document is not defined" che\n' +
      '   mất nguyên nhân thật.\n'
  );
  process.exit(1);
}

console.log('\n✓ tuvi-engine đã dựng xong.\n');
