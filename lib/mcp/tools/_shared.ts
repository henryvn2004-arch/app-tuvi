// lib/mcp/tools/_shared.ts
// ============================================================
// Kiểu tool + helper dùng chung cho 3 tool MCP. Không import engine trực
// tiếp (engine nạp qua computeLaso / loadMcpEngine).
// ============================================================

import type { z } from 'zod';
import type { McpKeyInfo } from '../auth';

type Rec = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface McpTool {
  name: string;
  description: string;
  schema: z.ZodRawShape;
  /** Kiểm quota RIÊNG của tool (ngoài validate key). Trả message VN nếu chặn, null nếu cho qua. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quota?: (args: any, info: McpKeyInfo, key: string) => Promise<string | null> | string | null;
  /** Chạy tool, trả object JSON (sẽ được stringify vào content). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (args: any, info: McpKeyInfo) => Promise<Rec> | Rec;
}

// ── Địa chi / thiên can ──────────────────────────────────────
export const CHI_NAMES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const CAN_NAMES = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];

/** Năm (số) → Can/Chi. Khớp engine (parity 96/96, 1940–2035). */
export function yearCan(y: number): string {
  return CAN_NAMES[(((y + 6) % 10) + 10) % 10];
}
export function yearChi(y: number): string {
  return CHI_NAMES[(((y + 8) % 12) + 12) % 12];
}

/** Chuẩn hoá chuỗi tiếng Việt về NFC + lowercase — TRÁNH lỗi NFC/NFD khiến
 *  "Sửu" (từ input) không khớp "sửu" (hardcode). Bắt buộc cho mọi so khớp
 *  chuỗi tiếng Việt giữa INPUT người dùng và hằng số/dữ liệu của mình. */
export function normVi(s: string): string {
  return String(s || '').normalize('NFC').trim().toLowerCase();
}

// Bảng tên chi giờ (chấp nhận không dấu / biến thể Tị) → index 0..11.
// Key CHUẨN HÓA NFC lúc dựng map để khớp bất kể input NFC/NFD.
const _CHI_GIO_RAW: Record<string, number> = {
  ty: 0, tí: 0, tý: 0, suu: 1, sửu: 1, dan: 2, dần: 2, mao: 3, mão: 3,
  thin: 4, thìn: 4, ti: 5, tị: 5, tỵ: 5, ngo: 6, ngọ: 6, mui: 7, mùi: 7,
  than: 8, thân: 8, dau: 9, dậu: 9, tuat: 10, tuất: 10, hoi: 11, hợi: 11,
};
const CHI_GIO_ALIAS: Record<string, number> = Object.fromEntries(
  Object.entries(_CHI_GIO_RAW).map(([k, v]) => [k.normalize('NFC'), v]),
);

/** Giờ ĐỒNG HỒ (0–23) → index địa chi giờ (khối 2h, neo giờ lẻ; Tý=23–00:59). */
export function clockToBranchIdx(hour: number): number {
  const h = (((Math.floor(hour) % 24) + 24) % 24);
  return Math.floor(((h + 1) % 24) / 2) % 12;
}

/**
 * Chuẩn hoá `gio_sinh` (số 0–23 HOẶC tên giờ chi) → index địa chi 0..11.
 * Trả -1 nếu không hiểu.
 */
export function parseGioSinh(gio: number | string): number {
  if (typeof gio === 'number' && Number.isFinite(gio)) return clockToBranchIdx(gio);
  const raw = String(gio).trim();
  if (raw === '') return -1;
  // Thuần số dạng chuỗi "9", "13" → giờ đồng hồ.
  if (/^\d{1,2}$/.test(raw)) return clockToBranchIdx(Number(raw));
  // Tên chi (chuẩn hoá NFC, bỏ tiền tố "giờ/gio" nếu có).
  const key = normVi(raw).replace(/^gi[oờ]\s+/, '').trim();
  if (key in CHI_GIO_ALIAS) return CHI_GIO_ALIAS[key];
  return -1;
}

/** Parse "YYYY-MM-DD" → {day,month,year} | null. */
export function parseNgay(s: string): { day: number; month: number; year: number } | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month, year };
}

// ── Format sao ───────────────────────────────────────────────
export interface StarOut {
  ten: string;
  sang?: string; // độ sáng (miếu/vượng/hãm...)
  hoa?: string;  // Lộc/Quyền/Khoa/Kỵ
}

export function fmtStar(s: unknown): StarOut | null {
  if (!s) return null;
  if (typeof s !== 'object') return { ten: String(s) };
  const o = s as Rec;
  const ten = String(o.ten || '').trim();
  if (!ten) return null;
  const out: StarOut = { ten };
  if (o.brightness) out.sang = String(o.brightness);
  if (o.hoa) out.hoa = String(o.hoa);
  return out;
}

/** Chính tinh của 1 cung. */
export function majorStarsOf(p: Rec): StarOut[] {
  return ((p.majorStars as unknown[]) || []).map(fmtStar).filter(Boolean) as StarOut[];
}

/** Phụ tinh (không phải chính tinh) của 1 cung, cắt bớt cho gọn. */
export function minorStarsOf(p: Rec, cap = 12): StarOut[] {
  return ((p.stars as Rec[]) || [])
    .filter((s) => (typeof s === 'object' ? s.nhom !== 'chinh' : true))
    .map(fmtStar)
    .filter(Boolean)
    .slice(0, cap) as StarOut[];
}

/** Tất cả tên sao (chính + phụ) của 1 cung — cho luu_thai_tue / hạn. */
export function allStarNames(p: Rec | undefined): string[] {
  if (!p) return [];
  const major = ((p.majorStars as Rec[]) || []).map((s) => String(s?.ten || '')).filter(Boolean);
  const minor = ((p.stars as Rec[]) || [])
    .filter((s) => (typeof s === 'object' ? s.nhom !== 'chinh' : true))
    .map((s) => String(s?.ten || ''))
    .filter(Boolean);
  return [...major, ...minor];
}
