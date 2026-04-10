// ============================================================
// JS ENGINE COMPAT SHIM
// Phase 1: Star placement is fully rewritten in TypeScript.
// The large rule-based analysis functions (phanTichCachCuc,
// phanTichCungYNghia, tinhCungScores, phanTichDaiVanRules,
// tinhTieuVanScores) are stubbed here and will be rewritten
// in TypeScript in Phase 2.
// ============================================================
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { Palace, CachCuc, CungYNghia, CungScores, DaiVan } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const require    = createRequire(import.meta.url);

// Path to original JS engine — adjust if needed
let _jsEngine: any = null;
function getJsEngine(): any {
  if (!_jsEngine) {
    try {
      const enginePath = resolve(__dirname, '../../../tuvi-ansao-engine.js');
      _jsEngine = require(enginePath);
    } catch {
      // Engine not found — return stub implementations
      _jsEngine = {
        phanTichCachCuc: () => [],
        phanTichCungYNghia: () => [],
        tinhCungScores: () => ({}),
        phanTichDaiVanRules: () => [],
        tinhTieuVanScores: () => [],
      };
    }
  }
  return _jsEngine;
}

// ─── Re-exported analysis functions ──────────────────────────

export interface LsContext {
  palaces: Palace[];
  menhDC: string;
  thanDC: string;
  amDuong: string;
  napAmHanh: string | null;
  chiNam: string;
  daiVans?: DaiVan[];
  daiVanHienTai?: DaiVan;
}

export function phanTichCachCuc(ls: LsContext, gioitinh: string): CachCuc[] {
  try { return getJsEngine().phanTichCachCuc?.(ls, gioitinh) ?? []; }
  catch { return []; }
}

export function phanTichCungYNghia(
  ls: LsContext,
  gioitinh: string,
  gioIdx: number,
  canNam: string,
  chiNam: string,
  tuoiXem: number,
): CungYNghia[] {
  try { return getJsEngine().phanTichCungYNghia?.(ls, gioitinh, gioIdx, canNam, chiNam, tuoiXem) ?? []; }
  catch { return []; }
}

export function tinhCungScores(
  ls: { palaces: Palace[]; cachCuc: CachCuc[]; cachCucTungCung: CungYNghia[] },
  napAmHanh: string | null,
  tuoiXem: number,
): Record<string, CungScores> {
  try { return getJsEngine().tinhCungScores?.(ls, napAmHanh, tuoiXem) ?? {}; }
  catch { return {}; }
}

export function phanTichDaiVanRules(
  dvPalace: Palace,
  menhPalace: Palace,
  ls: any,
): any[] {
  try { return getJsEngine().phanTichDaiVanRules?.(dvPalace, menhPalace, ls) ?? []; }
  catch { return []; }
}

export function tinhTieuVanScores(
  ls: { palaces: Palace[]; daiVans: DaiVan[] },
  gioitinh: string,
  amDuong: string,
  chiNam: string,
  namSinhDL: number,
): any[] {
  try { return getJsEngine().tinhTieuVanScores?.(ls, gioitinh, amDuong, chiNam, namSinhDL) ?? []; }
  catch { return []; }
}
