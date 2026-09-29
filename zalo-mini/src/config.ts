// Địa chỉ server + khoá anon Supabase (khoá CÔNG KHAI — cùng giá trị public/auth.js
// của web đang phát cho mọi trình duyệt). Domain nào gọi tới đây cũng phải được
// khai trong danh sách domain của Mini App (Zalo Developers), thiếu là fetch chết.
export const API_BASE = 'https://tuviminhbao.com';
export const SUPABASE_URL = 'https://dciwkfdqhhddeymlisey.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

/** `client` gửi kèm /api/v1/chat (lib/contract/v1.ts ClientInfo). */
export const CLIENT = { platform: 'zalo-mini', version: '0.1.0' } as const;
