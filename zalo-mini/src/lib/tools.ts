// Danh mục công cụ — /api/v1/catalog (nhóm + giá do server tính; client KHÔNG
// chép số giá). Mở một công cụ = mở trang web của nó trong webview Zalo, ĐÃ
// đăng nhập đúng tài khoản (link một lần /api/channels/handoff/new) và nạp sẵn
// "lá số của tôi" nếu có.
import { openWebview } from 'zmp-sdk';
import { API_BASE } from '../config';
import { api } from './session';
import { insideZalo } from './storage';
import type { BirthParams } from './birth';

export interface ToolItem {
  toolId: string;
  label: string;
  path: string;
  description: string | null;
  free: boolean;
  price: { credits: number; vnd: number } | null;
}

export interface ToolGroup {
  key: string;
  title: string;
  tools: ToolItem[];
}

export async function fetchCatalog(): Promise<ToolGroup[]> {
  const res = await fetch(`${API_BASE}/api/v1/catalog`);
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(d.groups)) throw new Error('Chưa tải được danh sách công cụ');
  return d.groups as ToolGroup[];
}

/** VNĐ là giá chính, Lượng trong ngoặc (luật giá của web). Không có giá ⇒ "…", không đoán. */
export function priceText(t: ToolItem): string {
  if (t.free) return 'Miễn phí';
  if (!t.price) return '…';
  return `~${t.price.vnd.toLocaleString('vi-VN')}đ (${t.price.credits} Lượng)`;
}

export async function openTool(t: ToolItem, birth: BirthParams | null): Promise<void> {
  const d = await api<{ url: string }>('/api/channels/handoff/new', {
    method: 'POST',
    body: JSON.stringify({ next: t.path, ...(birth ? { birth } : {}) }),
  });
  // Ngoài Zalo `openWebview` không mở gì mà cũng không báo lỗi ⇒ tự mở tab mới.
  if (insideZalo()) await openWebview({ url: d.url });
  else window.open(d.url, '_blank');
}
