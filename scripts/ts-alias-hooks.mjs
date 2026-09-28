// ts-alias-hooks.mjs — hook nạp module để script Node chạy THẲNG mã TypeScript của
// app (không cần build, không cần node_modules): `@/…` → gốc repo, import không
// đuôi → `.ts`/`/index.ts`, và `tuvi-engine/dist/*.js` → `tuvi-engine/src/*.ts`
// (bản dist chỉ có sau `tsc`). Dùng kèm `--experimental-strip-types` (Node ≥22):
//   node --experimental-strip-types --import ./scripts/ts-alias-hooks.mjs <script>
// Tự đăng ký khi được `--import`.
import { register } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread } from 'node:worker_threads';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Hook chạy trong luồng loader riêng — chỉ đăng ký từ luồng chính, nếu không
// luồng loader nạp lại file này sẽ tự đăng ký chồng lên chính nó.
if (isMainThread) register(import.meta.url, import.meta.url);

const coDuoi = (s) => /\.[mc]?[jt]s$|\.json$/.test(s);

export async function resolve(spec, ctx, next) {
  let s = spec;
  if (s.startsWith('@/')) s = pathToFileURL(path.join(ROOT, s.slice(2))).href;
  if (s.includes('tuvi-engine/dist/')) s = s.replace('/dist/', '/src/').replace(/\.js$/, '.ts');
  const tuongDoi = s.startsWith('file:') || s.startsWith('.') || s.startsWith('/');
  if (tuongDoi && ctx.parentURL?.startsWith('file:')) {
    const abs = s.startsWith('file:')
      ? fileURLToPath(s)
      : path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), s);
    if (!coDuoi(abs)) {
      for (const ext of ['.ts', '/index.ts', '.js']) {
        if (existsSync(abs + ext)) return next(pathToFileURL(abs + ext).href, ctx);
      }
    } else if (abs.endsWith('.js') && !existsSync(abs) && existsSync(abs.slice(0, -3) + '.ts')) {
      // Quy ước NodeNext trong tuvi-engine: nguồn .ts import bằng đuôi .js.
      return next(pathToFileURL(abs.slice(0, -3) + '.ts').href, ctx);
    }
  }
  return next(s, ctx);
}
