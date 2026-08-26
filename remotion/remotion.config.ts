import { Config } from '@remotion/cli/config';

// ⚠️ CỐ Ý KHÔNG gọi `Config.setBrowserExecutable('/opt/pw-browsers/chromium')`.
// Đã thử và HỎNG: Chromium bản Playwright cài sẵn ở đây quá mới, đã gỡ hẳn chế
// độ headless cũ mà Remotion dùng → "Old Headless mode has been removed".
// Để trống thì Remotion tự tải `chrome-headless-shell` riêng của nó (bản dựng
// giữ đúng chế độ đó) và render chạy bình thường. Đừng "tối ưu" bằng cách trỏ
// lại vào Chromium của Playwright — sẽ vỡ y hệt.
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
