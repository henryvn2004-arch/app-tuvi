// lib/mcp/engine.ts
// ============================================================
// Loader RIÊNG cho MCP — nạp public/tuvi-ansao-engine.js để LẤY LẠI
// những hằng số/hàm đã có sẵn trong engine mà lib/engine/laso.ts KHÔNG
// export (để khỏi phải SỬA laso.ts — nguyên tắc "không đụng file cũ").
//
// Hiện chỉ cần bảng TU_HOA (tứ hóa theo can — Phụ lục A.4): DÙNG LẠI của
// engine, KHÔNG hardcode bản mới. Dùng đúng pattern new Function + mock
// globalThis.location như laso.ts (engine set window=globalThis).
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

type Rec = Record<string, unknown>;

// Bảng tứ hóa: can → { Lộc, Quyền, Khoa, Kỵ } = tên chính tinh được hóa.
export type TuHoaBang = Record<string, Record<'Lộc' | 'Quyền' | 'Khoa' | 'Kỵ', string>>;

let cache: { TU_HOA: TuHoaBang } | null = null;

export function loadMcpEngine(): { TU_HOA: TuHoaBang } {
  if (cache) return cache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Rec;
  g.window = g;
  if (!g.location) {
    g.location = {
      protocol: 'https:', hostname: 'tuviminhbao.com', host: 'tuviminhbao.com',
      port: '', href: 'https://tuviminhbao.com/', pathname: '/', search: '', hash: '',
    };
  }
  cache = (new Function('window', 'globalThis', code + '\nreturn { TU_HOA };'))(g, g) as {
    TU_HOA: TuHoaBang;
  };
  return cache!;
}
