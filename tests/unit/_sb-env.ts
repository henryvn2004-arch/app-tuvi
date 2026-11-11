// Đặt env Supabase GIẢ trước khi nạp lib/portraits/cache.ts (module đọc env lúc nạp).
// Phải là import ĐẦU TIÊN của file test — import chạy theo thứ tự khai báo.
process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_KEY = 'k';
export {};
