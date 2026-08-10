// lib/engine/tuong-hop.ts
// ============================================================
// Cầu nối SERVER cho bảng điểm tương hợp 8 chiều.
//
// Vì sao cần: trang `/app/{xem-tuoi,xem-lam-an,tuong-hop}` vẽ bảng 8 tiêu chí
// (Xét Tuổi · Ngũ Hành · Tư Tưởng · Tính Cách · Quan Hệ · Con Cái · Tài Chính ·
// Vận Hành) kèm điểm từng bên và TỔNG /100 — nhưng client chỉ gửi
// `{birthA,birthB,nameA,nameB}` lên rail, nên `extractCompatContext` chưa bao
// giờ nhìn thấy bảng đó. Người dùng đọc "Vận Hành: A 8.8 vs B 3.6" rồi hỏi vì
// sao lệch → rail luận chay. Đúng họ lỗi `thapThan` của Bát Tự.
// 🔑 Lố nhất: câu chào của chính rail nói "hoà hợp 57.6/100" — một con số mà
// rail không hề có trong context.
//
// KHÔNG chép lại công thức. Nạp thẳng `public/tuong-hop.js` — cùng file trình
// duyệt đang chạy — nên bảng trên màn hình, bản chia sẻ và prompt rail không
// thể trôi khỏi nhau. Cùng tiền lệ `lib/engine/kim-lau.ts` và `laso.ts`.
//
// Tính ở SERVER chứ không bắt client gửi kèm: bản JS cũ còn trong cache trình
// duyệt vẫn chỉ gửi 4 khoá kia, mà đường này phải đúng ngay cho họ.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

/** Một tiêu chí trong bảng 8 chiều. Chỉ khai phần rail thực sự đọc. */
export interface TuongHopItem {
  label: string;
  score: number;
  /** Trọng số (0–1) — quyết định tiêu chí nào kéo tổng điểm nhiều nhất. */
  w: number;
  detail?: string;
  a?: string;
  b?: string;
}

export interface TuongHopResult {
  items: TuongHopItem[];
  /** Tổng hoà hợp thang /100 — chính con số trang in to nhất. */
  total: number;
  naA?: string;
  naB?: string;
}

interface TuongHopApi {
  calcTuongHop(lsA: unknown, lsB: unknown, nameA: string, nameB: string): TuongHopResult;
}

let cache: TuongHopApi | null = null;

function loadApi(): TuongHopApi {
  if (cache) return cache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuong-hop.js'), 'utf-8');
  // File tự phát hiện CommonJS ở cuối (`module.exports = API`) — cấp cho nó một
  // `module` là lấy được API, không cần DOM (module này thuần logic).
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  cache = mod.exports as unknown as TuongHopApi;
  return cache;
}

/**
 * Bảng điểm tương hợp cho hai lá số.
 *
 * FAIL-SOFT: nạp hụt module → trả `null`, `extractCompatContext` rơi về bản
 * tóm tắt cũ. Rail là đường nóng — thà thiếu bảng điểm còn hơn 500 cả lượt.
 */
export function tuongHopScores(
  lsA: unknown,
  lsB: unknown,
  nameA: string,
  nameB: string
): TuongHopResult | null {
  try {
    const r = loadApi().calcTuongHop(lsA, lsB, nameA, nameB);
    if (!r || !Array.isArray(r.items) || typeof r.total !== 'number') return null;
    return r;
  } catch (e) {
    console.error('[tuong-hop] không tính được bảng điểm — rail rơi về bản gọn:', (e as Error)?.message);
    return null;
  }
}
