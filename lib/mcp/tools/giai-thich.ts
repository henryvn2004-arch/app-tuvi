// lib/mcp/tools/giai-thich.ts
// ============================================================
// TOOL 3 — giai_thich_sao: định nghĩa/ý nghĩa ngắn của một sao (theo cung
// nếu có), lấy từ NỘI DUNG CÓ SẴN của site: public/cach_cuc_all.json (965
// mục, 307 mục 1-sao) — mỗi mục có tomTat/loai/cung/điều kiện. KHÔNG để LLM
// server generate; không có dữ liệu thì trả "chưa có dữ liệu".
// ============================================================

import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import { type McpTool, normVi } from './_shared';

type Rec = Record<string, unknown>;
interface CachCucRaw {
  ten?: string; sao?: string[]; saoPhuTro?: string[]; cung?: string;
  loai?: string; doManh?: number; tomTat?: string; dieuKien?: string;
}

let cache: CachCucRaw[] | null = null;
function loadCachCuc(): CachCucRaw[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(readFileSync(join(process.cwd(), 'public', 'cach_cuc_all.json'), 'utf-8')) as CachCucRaw[];
  } catch {
    cache = [];
  }
  return cache;
}

const schema = {
  sao: z.string().describe('Tên sao đầy đủ, ví dụ "Tử Vi", "Thất Sát", "Hóa Lộc", "Kình Dương"'),
  cung: z.string().optional().describe('Tên cung để lọc ý nghĩa theo cung (ví dụ "Mệnh", "Tài Bạch"). Bỏ trống để lấy chung.'),
};

export const giaiThichTool: McpTool = {
  name: 'giai_thich_sao',
  description:
    'Tra định nghĩa / ý nghĩa ngắn của một sao trong Tử Vi (tùy chọn theo cung), lấy từ kho nội dung có sẵn của tuviminhbao.com. Dùng khi người dùng hỏi "sao X là gì", "X ở cung Y nghĩa là sao". Trả về danh sách các nhận định ngắn (cách cục / ý nghĩa) liên quan tới sao đó. Nếu không có dữ liệu sẽ báo rõ.',
  schema,
  // Không giới hạn quota (tra cứu kiến thức).
  run: (args) => {
    const sao = String(args.sao || '').trim();
    if (!sao) return { error: 'Thiếu tên sao.' };
    const cung = args.cung ? String(args.cung).trim() : '';

    const all = loadCachCuc();
    // So khớp CHUẨN HÓA NFC (tránh lỗi "Tử Vi" NFD ≠ NFC trong data).
    const saoN = normVi(sao);
    const cungN = normVi(cung);
    const inSao = (c: CachCucRaw) => Array.isArray(c.sao) && c.sao.some((x) => normVi(x) === saoN);
    const inPhu = (c: CachCucRaw) => Array.isArray(c.saoPhuTro) && c.saoPhuTro.some((x) => normVi(x) === saoN);
    let hits = all.filter((c) => inSao(c) || inPhu(c));

    if (cung) {
      const byCung = hits.filter((c) => normVi(String(c.cung || '')) === cungN);
      if (byCung.length) hits = byCung; // lọc theo cung nếu có mục khớp, không thì giữ chung
    }

    if (!hits.length) {
      return { sao, cung: cung || null, ket_qua: [], message: `Chưa có dữ liệu định nghĩa cho sao "${sao}"${cung ? ` tại cung ${cung}` : ''}.` };
    }

    // Ưu tiên: sao chính (sao[]) trước phụ tinh; doManh cao trước; cắt gọn.
    const ranked = hits
      .map((c) => ({ c, score: (inSao(c) ? 100 : 0) + (Number(c.doManh) || 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ c }): Rec => ({
        ten: c.ten || null,
        loai: c.loai || null, // tốt | xấu | trung
        cung: c.cung || null,
        y_nghia: c.tomTat || null,
        dieu_kien: c.dieuKien || null,
      }));

    return { sao, cung: cung || null, ket_qua: ranked };
  },
};
