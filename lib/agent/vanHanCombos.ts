// lib/agent/vanHanCombos.ts
// ============================================================
// MATCHER TỔ HỢP SAO CHÉO TẦNG VẬN (cross-layer cách cục)
//
// Ý tưởng (Henry, 2026-06-24): một cách cục có thể hình thành khi các sao
// thành phần RẢI across nhiều tầng vận — ví dụ Thiên Mã ở đại vận + Thiên
// Khốc ở tiểu vận + Điếu Khách ở nguyệt vận → "Mã Khốc Khách". Gộp sao của
// các cung hạn đang xét (theo MỨC CÂU HỎI: năm = đại vận+tiểu hạn+lưu niên;
// tháng = +nguyệt hạn; ngày = +nhật hạn), nếu đủ bộ sao của một cách cục thì
// kích hoạt → luận giải rõ ràng hơn.
//
// Nguồn combo: public/cach_cuc_all.json (958 cách cục). CHỈ lấy combo ĐA-SAO
// (≥2 sao) và KHÔNG kèm điều kiện natal (địa chi / mệnh-vị / tuổi) — vì các
// điều kiện đó không áp dụng được cho vận, fire ra sẽ sai nghĩa.
//
// Tính DETERMINISTIC ở server rồi truyền vào phần luận giải (tool van hạn) —
// LLM không tự đoán tổ hợp. Đặt ở lớp tool (không nhét vào engine vanilla
// dùng chung client) để tránh phình payload + rủi ro parity biểu đồ.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

// Alias sao: tên ngắn trong cach_cuc_all.json → tên đầy đủ engine.
// Trích từ CACH_CUC_STAR_ALIAS trong public/tuvi-ansao-engine.js (giữ đồng bộ).
const STAR_ALIAS: Record<string, string[]> = {
  'Kỵ': ['Hóa Kỵ'], 'Khoa': ['Hóa Khoa'], 'Quyền': ['Hóa Quyền'],
  'Lộc': ['Hóa Lộc', 'Lộc Tồn'], 'Tử': ['Tử Vi'], 'Cơ': ['Thiên Cơ'],
  'Nhật': ['Thái Dương'], 'Nguyệt': ['Thái Âm'], 'Phủ': ['Thiên Phủ'],
  'Đồng': ['Thiên Đồng'], 'Lương': ['Thiên Lương'], 'Sát': ['Thất Sát'],
  'Tham': ['Tham Lang'], 'Phá': ['Phá Quân'], 'Cự': ['Cự Môn'],
  'Liêm': ['Liêm Trinh'], 'Tướng': ['Thiên Tướng'], 'Vũ': ['Vũ Khúc'],
  'Kình': ['Kình Dương'], 'Đà': ['Đà La'], 'Hỏa': ['Hỏa Tinh'],
  'Linh': ['Linh Tinh'], 'Không': ['Địa Không'], 'Kiếp': ['Địa Kiếp'],
  'Tả': ['Tả Phụ'], 'Hữu': ['Hữu Bật'], 'Phù': ['Tả Phụ'], 'Bật': ['Hữu Bật'],
  'Khúc': ['Văn Khúc'], 'Xương': ['Văn Xương'], 'Khôi': ['Thiên Khôi'],
  'Việt': ['Thiên Việt'], 'Mã': ['Thiên Mã'], 'Hổ': ['Bạch Hổ'],
  'Hình': ['Thiên Hình'], 'Hư': ['Thiên Hư'], 'Khốc': ['Thiên Khốc'],
  'Riêu': ['Thiên Riêu'], 'Hao': ['Đại Hao', 'Tiểu Hao'],
  'Song Hao': ['Đại Hao', 'Tiểu Hao'], 'Hồng': ['Hồng Loan'], 'Đào': ['Đào Hoa'],
  'Cô': ['Cô Thần'], 'Tang': ['Tang Môn'], 'Binh': ['Phục Binh'],
  'Bệnh': ['Bệnh Phù'], 'Tấu': ['Tấu Thư'], 'Quả': ['Quả Tú'], 'Tuế': ['Thái Tuế'],
  'Long': ['Long Trì'], 'Tả Phù': ['Tả Phụ'], 'Thiên Phụ': ['Tả Phụ'],
  'Thiên Bật': ['Hữu Bật'], 'Dương Nhận': ['Kình Dương'],
  'La Võng': ['Thiên La', 'Địa Võng'], 'Lực Sĩ': ['Lực Sỹ'], 'Ấn': ['Quốc Ấn'],
  'Quý': ['Thiên Quý'], 'Vượng': ['Đế Vượng'], 'Hỉ': ['Hỷ Thần'], 'Mộ': ['Mộ'],
};

function resolveStar(name: string): string[] {
  return STAR_ALIAS[name] || [name];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawCombo = { ten?: string; sao?: string[]; dieuKien?: string; loai?: string; tomTat?: string; doManh?: number };
interface Combo { ten: string; sao: string[]; loai: string; tomTat: string; doManh: number }

// ── Nạp combo 1 lần (singleton) ──────────────────────────────
let comboCache: Combo[] | null = null;
function loadCombos(): Combo[] {
  if (comboCache) return comboCache;
  let raw: RawCombo[] = [];
  try {
    const txt = readFileSync(join(process.cwd(), 'public', 'cach_cuc_all.json'), 'utf-8');
    raw = JSON.parse(txt) as RawCombo[];
  } catch {
    raw = [];
  }
  comboCache = raw
    // CHỈ combo đa-sao (≥2) và KHÔNG kèm điều kiện natal → gộp chéo tầng được ngay
    .filter((c) => Array.isArray(c.sao) && c.sao.length >= 2 && (!c.dieuKien || !c.dieuKien.trim()))
    .map((c) => ({
      ten: String(c.ten || ''),
      sao: c.sao as string[],
      loai: String(c.loai || 'trung'),
      tomTat: String(c.tomTat || ''),
      doManh: Number(c.doManh) || 0,
    }));
  return comboCache;
}

// ── Cung của 1 tầng vận ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LayerCung { label: string; palace: any }

export interface ComboHit {
  ten: string;
  loai: string;
  tomTat: string;
  sao: string[];
  layers: string[]; // các tầng vận góp sao cho tổ hợp này
}

// Tên hiển thị: nhiều `ten` trong data là mã (vd "VONG_THAI_TUE__...") → khi đó
// dùng danh sách sao làm nhãn cho dễ đọc.
function displayName(ten: string, sao: string[]): string {
  if (!ten || /_{2,}|^[A-Z0-9_]+$/.test(ten)) return sao.join(' + ');
  return ten;
}

/**
 * Khớp tổ hợp sao chéo tầng. `layers` là các cung hạn đang xét (đã lọc theo
 * mức câu hỏi). Trả về tối đa `cap` cách cục, ưu tiên trải NHIỀU TẦNG + nhiều
 * sao (đặc trưng hơn). Mỗi hit ghi rõ tầng nào góp sao.
 */
export function matchVanHanCombos(layers: LayerCung[], cap = 6): ComboHit[] {
  const live = layers.filter((l) => l.palace && Array.isArray(l.palace.stars));
  if (!live.length) return [];

  // pool: tên sao engine → tập nhãn tầng chứa nó
  const pool = new Map<string, Set<string>>();
  for (const l of live) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of l.palace.stars as any[]) {
      const ten = s && s.ten;
      if (!ten) continue;
      if (!pool.has(ten)) pool.set(ten, new Set());
      pool.get(ten)!.add(l.label);
    }
  }
  if (!pool.size) return [];

  const hits: ComboHit[] = [];
  for (const combo of loadCombos()) {
    const layerSet = new Set<string>();
    let ok = true;
    for (const name of combo.sao) {
      const cands = resolveStar(name);
      let found = false;
      for (const cand of cands) {
        const labels = pool.get(cand);
        if (labels) {
          labels.forEach((x) => layerSet.add(x));
          found = true;
          break;
        }
      }
      if (!found) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    hits.push({
      ten: displayName(combo.ten, combo.sao),
      loai: combo.loai,
      tomTat: combo.tomTat,
      sao: combo.sao,
      layers: Array.from(layerSet),
    });
  }

  // Dedup theo BỘ SAO chuẩn hóa (gộp "Khốc,Hư" với "Thiên Khốc,Thiên Hư"...).
  // Trong cùng bộ sao, giữ bản giàu nghĩa nhất: ưu tiên loai ≠ 'trung', rồi tomTat dài hơn.
  const comboKey = (sao: string[]) =>
    Array.from(new Set(sao.map((n) => resolveStar(n)[0]))).sort().join('|');
  const best = new Map<string, ComboHit>();
  for (const h of hits) {
    const k = comboKey(h.sao);
    const cur = best.get(k);
    if (!cur) { best.set(k, h); continue; }
    const better =
      (h.loai !== 'trung' && cur.loai === 'trung') ||
      (h.loai !== 'trung' === (cur.loai !== 'trung') && h.tomTat.length > cur.tomTat.length);
    if (better) best.set(k, h);
  }
  // ưu tiên trải nhiều tầng → nhiều sao
  return Array.from(best.values())
    .sort((a, b) => b.layers.length - a.layers.length || b.sao.length - a.sao.length)
    .slice(0, cap);
}

/**
 * Định dạng các tổ hợp khớp thành dòng cho tool van hạn. Trả '' nếu không có.
 */
export function formatComboLines(hits: ComboHit[]): string {
  if (!hits.length) return '';
  let out = '- TỔ HỢP SAO trong các cung hạn (cách cục vận — nếu có, ƯU TIÊN luận theo đây vì ý nghĩa rõ hơn; vẫn đặt trong khung điểm đại vận):\n';
  for (const h of hits) {
    const span = h.layers.length > 1 ? ` [chéo tầng: ${h.layers.join(' + ')}]` : ` [${h.layers.join('')}]`;
    out += `  • [${h.loai}] ${h.ten} (${h.sao.join(', ')})${span} — ${h.tomTat}\n`;
  }
  return out;
}
