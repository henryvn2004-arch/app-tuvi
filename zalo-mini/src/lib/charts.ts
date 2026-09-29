// Sổ lá số — /api/charts của web (cùng bảng `user_charts`, nên lá số lưu ở web
// hiện ở đây và ngược lại). "Lá số của tôi" chỉ là id ghi nhớ trên máy, giống
// web giữ `app_birth` ở localStorage — server không có khái niệm này.
import { api } from './session';
import { load, save } from './storage';
import type { Chart, ChartBirth } from './birth';

const MINE_KEY = 'tvmb.myChartId';

export async function listCharts(): Promise<Chart[]> {
  const d = await api<{ items: Chart[] }>('/api/charts');
  return d.items || [];
}

export async function saveChart(
  label: string,
  birth: ChartBirth,
  relation?: string
): Promise<Chart> {
  const body: Record<string, unknown> = { label, birth };
  if (relation) body.relation = relation;
  const d = await api<{ item: Chart }>('/api/charts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return d.item;
}

export async function deleteChart(id: number): Promise<void> {
  await api(`/api/charts?id=${id}`, { method: 'DELETE' });
  if (myChartId() === id) setMyChartId(null);
}

export const myChartId = (): number | null => load<number>(MINE_KEY);
export const setMyChartId = (id: number | null): void => save(MINE_KEY, id);

/** Lá số "của tôi" trong Sổ (null nếu chưa chọn hoặc đã bị xoá ở nơi khác). */
export async function loadMyChart(): Promise<Chart | null> {
  const id = myChartId();
  if (id == null) return null;
  return (await listCharts()).find((c) => c.id === id) || null;
}
