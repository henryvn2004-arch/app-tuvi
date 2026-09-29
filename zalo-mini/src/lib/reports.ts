// Báo cáo đã có — cùng API với trang Báo cáo của web (/app/bao-cao):
//   danh sách  GET /api/reports?list=1
//   một bản    GET /api/reports/snapshot?id=   → các khối {header, image, text}
import { api } from './session';

export interface ReportItem {
  id: string;
  toolId: string;
  toolLabel: string | null;
  title: string;
  subtitle: string | null;
  updatedAt: string;
}

export interface ReportBlock {
  header: string | null;
  image: string | null;
  text: string | null;
}

export interface Report extends Omit<ReportItem, 'updatedAt'> {
  imageUrl: string | null;
  blocks: ReportBlock[];
}

export async function listReports(): Promise<ReportItem[]> {
  return (await api<{ items: ReportItem[] }>('/api/reports?list=1')).items || [];
}

export async function getReport(id: string): Promise<Report> {
  return api<Report>(`/api/reports/snapshot?id=${encodeURIComponent(id)}`);
}
