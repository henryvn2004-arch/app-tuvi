// Gộp tài khoản web — POST /api/channels/zalo-mini/link-email: {email} gửi mã 6 số
// vào email đó, {code} gộp (ví Lượng + sổ lá số của tài khoản Zalo chuyển sang
// tài khoản web). Gộp xong phải đăng nhập lại: id Mini App đã trỏ sang tài khoản web.
import { api, relogin } from './session';

export async function requestLinkCode(email: string): Promise<void> {
  await api('/api/channels/zalo-mini/link-email', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

/** Trả email (đã che) của tài khoản web vừa gộp. */
export async function confirmLinkCode(code: string): Promise<string> {
  const d = await api<{ email: string }>('/api/channels/zalo-mini/link-email', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim() }),
  });
  await relogin();
  return d.email;
}
