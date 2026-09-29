import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import zaloMiniApp from 'zmp-vite-plugin';

// zmp-vite-plugin đọc ./app-config.json và build ra www/ (thư mục `zmp deploy` đẩy lên).
export default defineConfig({
  plugins: [react(), zaloMiniApp()],
});
