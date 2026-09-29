// `npm run deploy` — build rồi đẩy www/ lên Zalo.
//
// `zmp deploy` chạy thẳng ở thư mục này thì hỏi "This is not a ZMP Project" và,
// chọn "Deploy your existing project", đọc app-config.json GỐC (listSyncJS rỗng)
// ⇒ "No asset defined". Bản có tên file đã băm là www/app-config.json do
// zmp-vite-plugin sinh ra ⇒ phải deploy với cwd = www/. CLI lại đọc APP_ID +
// ZMP_TOKEN từ `<cwd>/.env` ⇒ chép .env sang www/ trong lúc deploy rồi xoá ngay
// (Zalo bỏ qua đuôi .env khi upload, nhưng đừng để nó nằm lại).
// Tham số thêm được chuyển thẳng cho CLI: `npm run deploy -- -p -m "mô tả"`.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';

const shell = process.platform === 'win32';
const run = (args, cwd) => spawnSync('npx', args, { cwd, stdio: 'inherit', shell }).status ?? 1;

if (!existsSync('.env')) {
  console.error('Chưa đăng nhập Zalo — chạy `npm run login` trước.');
  process.exit(1);
}
if (run(['vite', 'build']) !== 0) process.exit(1);

copyFileSync('.env', 'www/.env');
let status = 1;
try {
  status = run(['-y', 'zmp-cli@4.0.3', 'deploy', '-e', '-o', '.', ...process.argv.slice(2)], 'www');
} finally {
  rmSync('www/.env', { force: true });
}
process.exit(status);
