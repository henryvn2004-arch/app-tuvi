// Công cụ chạy NGAY trong Mini App — không mở trang web: chính sách Zalo cấm dẫn
// người dùng ra website ngoài. Tính bằng CHÍNH module dùng chung của web
// (`public/tools-shared/*.js`, UMD: ngoài CommonJS thì tự gắn lên `window`), CSS
// kết quả đọc lúc build từ trang web (web-tools-vite.mts). Engine là nguồn số duy
// nhất — ở đây chỉ gọi và hiện, không tính lại gì.
//
// Web sửa một module ⇒ build + deploy lại Mini App mới có bản mới (code được đóng
// gói vào app lúc build, không tải từ web lúc chạy).
import '../../../public/tools-shared/kim-lau.js';
import '../../../public/tools-shared/bat-trach.js';
import '../../../public/tools-shared/nap-am.js';
import '../../../public/tools-shared/xem-tuoi-sinh-con.js';
import '../../../public/tools-shared/than-so-hoc.js';
import '../../../public/tools-shared/kinh-dich-hao.js';
import '../../../public/tools-shared/kinh-dich-doc.js';
import '../../../public/tools-shared/kinh-dich.js';
import 'virtual:web-tools.css';

type Html = string;
type Fail = { ok: false; error: string };
type Data = Record<string, unknown>;

interface Globals {
  KimLauTool: {
    vnYear(): number;
    compute(by: number, cur: number): Fail | { ok: true; resTitleText: string; currentBoxHTML: Html; rowsHTML: Html; data: Data };
  };
  BatTrachTool: {
    compute(year: number, gender: 'nam' | 'nu'): Fail | { ok: true; resTitleText: string; resInfoHTML: Html; compassHTML: Html; huongRowsHTML: Html; data: Data };
  };
  NapAmTool: {
    compute(y: number): Fail | { ok: true; eyebrowText: string; resultHTML: Html; data: Data & { hanh: string; canChi: string; napAm: string } };
    ungDung(hanh: string): Record<string, string> | null;
    ungDungHTML(data: Data, opts: { shell: boolean }): Html;
  };
  XemTuoiSinhConTool: {
    compute(namBo: number, namMe: number): Fail | {
      ok: true;
      resultTitle: string;
      tableRowsHTML: Html;
      topRecommendHTML: Html;
      previewBo: { canChi: string; napAm: string; hanh: string };
      previewMe: { canChi: string; napAm: string; hanh: string };
      data: Data;
    };
  };
  ThanSoTool: {
    compute(ngay: number, thang: number, nam: number, ten: string): Fail | { ok: true; resultHTML: Html; data: Data };
  };
  KinhDichTool: {
    resolve(lines: HaoLine[]): { que: { n: string; zh: string }; cQue: { n: string } | null };
    gridHTML(r: unknown): Html;
    anhHTML(r: unknown, lines: HaoLine[]): Html;
    docHTML(r: unknown, lines: HaoLine[]): Html;
    railData(r: unknown, cauHoi: string, lines: HaoLine[]): Data;
  };
}

export interface HaoLine {
  val: number;
  yang: boolean;
  changing: boolean;
}

export const web = window as unknown as Globals;

/** Ngữ cảnh "Hỏi Thầy về kết quả này" — `scenario` của /api/v1/chat (lib/contract/v1.ts),
 *  `data` PHẲNG như web gửi (`extractGenericContext` bỏ im lặng giá trị object). */
export interface Scenario {
  type: string;
  data: Data;
  label: string;
  chips: string[];
}

/** Link ngoài trong HTML kết quả (vd "xem thêm" sang trang web khác) ⇒ chữ thường:
 *  bấm là rời Mini App, vi phạm chính sách Zalo. */
export const noLinks = (html: Html): Html =>
  html.replace(/<a\b[^>]*>/gi, '<span>').replace(/<\/a>/gi, '</span>');

/** Gieo một hào bằng 3 đồng xu — y như trang web (public/app-kinh-dich.html `toss`):
 *  mỗi đồng ngửa 3 / sấp 2, tổng 6–9. */
export function gieoHao(): HaoLine {
  const val = [0, 1, 2].reduce((s) => s + (Math.random() < 0.5 ? 3 : 2), 0);
  return { val, yang: val === 7 || val === 9, changing: val === 6 || val === 9 };
}

export const vnYear = (): number => web.KimLauTool.vnYear();
