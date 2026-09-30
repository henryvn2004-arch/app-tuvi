import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import zaloMiniApp from 'zmp-vite-plugin';
import { webTools } from './web-tools-vite.mts';

// zmp-vite-plugin đọc ./app-config.json và build ra www/ (thư mục `zmp deploy` đẩy lên).
// webTools + import `../public/tools-shared/*.js`: công cụ chạy trong app dùng
// CHÍNH code tính + CSS kết quả của web (src/lib/web-tools.ts) ⇒ dev server phải
// được đọc thư mục cha.
export default defineConfig({
  plugins: [react(), zaloMiniApp(), webTools()],
  server: { fs: { allow: ['..'] } },
});
