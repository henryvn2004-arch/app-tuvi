// lib/engine/laso.ts
// ============================================================
// Engine wrapper — tính lá số SERVER-SIDE (Sprint 0.2).
//
// Tái dùng đúng pattern loadEngine() đã chạy production ở
// app/luan-giai/[slug] và app/la-so/[slug]: nạp engine vanilla
// public/tuvi-ansao-engine.js qua new Function, có mock
// globalThis.location ở MODULE LEVEL (bắt buộc — engine set
// globalThis.window = globalThis làm Next.js crash khi parse URL
// nếu thiếu location). Xem CLAUDE.md.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import type { BirthParams } from '@/lib/contract/v1';
import { currentNamXem } from '@/lib/engine/namxem';

type Rec = Record<string, unknown>;

// ── Mock location ở module level (TRƯỚC khi engine chạy) ─────
{
  const g = globalThis as Rec;
  if (!g.location) {
    g.location = {
      protocol: 'https:',
      hostname: 'tuviminhbao.com',
      host: 'tuviminhbao.com',
      port: '',
      href: 'https://tuviminhbao.com/',
      pathname: '/',
      search: '',
      hash: '',
    };
  }
}

// Giờ sinh: index địa chi (0=Tý..11=Hợi) → giờ đại diện
const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

// ── Engine loader (singleton) ───────────────────────────────
let engineCache: {
  convertDuongToAm: (...a: unknown[]) => unknown;
  anSaoLaSo: (...a: unknown[]) => unknown;
} | null = null;

function loadEngine() {
  if (engineCache) return engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Rec;
  g.window = g;
  if (!g.location) {
    g.location = { protocol: 'https:', hostname: 'tuviminhbao.com', host: 'tuviminhbao.com', port: '', href: 'https://tuviminhbao.com/', pathname: '/', search: '', hash: '' };
  }
  engineCache = (new Function('window', 'globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};'))(g, g) as typeof engineCache;
  return engineCache!;
}

export type Laso = Rec;

export interface ComputeLasoResult {
  ok: boolean;
  error?: string;
  ls?: Laso;
}

/**
 * Tính lá số từ tham số sinh. Hiện hỗ trợ ngày DƯƠNG lịch.
 * (isLunar = true chưa hỗ trợ chuyển ngược — sẽ bổ sung sau.)
 */
export function computeLaso(birth: BirthParams, namXem?: number): ComputeLasoResult {
  const { day, month, year, hourBranch, gender, isLunar } = birth;

  if (!day || !month || !year) {
    return { ok: false, error: 'Thiếu ngày/tháng/năm sinh dương lịch.' };
  }
  if (hourBranch == null || hourBranch < 0 || hourBranch > 11) {
    return { ok: false, error: 'Thiếu hoặc sai giờ sinh (cần địa chi giờ 0=Tý..11=Hợi).' };
  }
  if (gender !== 'nam' && gender !== 'nu') {
    return { ok: false, error: 'Thiếu giới tính (nam/nu).' };
  }
  if (isLunar) {
    return { ok: false, error: 'Hiện chỉ hỗ trợ ngày dương lịch; vui lòng cung cấp ngày dương.' };
  }

  try {
    const { convertDuongToAm, anSaoLaSo } = loadEngine();
    const hour = GIO_HOURS[hourBranch];
    const conv = convertDuongToAm(day, month, year, hour) as Rec;
    if (!conv?.amLich) return { ok: false, error: 'Không chuyển được sang âm lịch.' };
    const al = conv.amLich as Rec;

    const view = namXem ?? currentNamXem();
    const ls = (anSaoLaSo as (o: object) => Rec)({
      ngayAL: al.day,
      thangAL: al.month,
      // namAL = năm ÂM lịch (al.year), KHÔNG phải năm dương input. Người
      // sinh tháng 1 trước Tết có năm âm = năm trước → tuổi mụ (tuoiXem)
      // và tiểu vận phụ thuộc vào đây. Phải khớp client (anSaoLaSo dùng
      // conv.amLich.year) để lá số/tuổi y hệt mọi nền tảng.
      namAL: al.year,
      canNam: conv.canNam,
      chiNam: conv.chiNam,
      gioIdx: hourBranch,
      gioitinh: gender,
      namXem: view,
    });
    if (!ls) return { ok: false, error: 'Engine không trả về lá số.' };
    return { ok: true, ls };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi engine' };
  }
}

// ── Format context lá số cho LLM (đầy đủ 12 cung) ───────────
// LLM CHỈ luận trên context này — không tự bịa số liệu.
function starFmt(s: unknown): string {
  if (!s) return '';
  if (typeof s !== 'object') return String(s);
  const o = s as Rec;
  let t = String(o.ten || '');
  if (o.brightness) t += '(' + o.brightness + ')';
  if (o.hoa) t += '[Hóa ' + o.hoa + ']';
  return t;
}
function starName(s: unknown): string {
  return typeof s === 'object' && s ? String((s as Rec).ten || '') : String(s || '');
}

export function formatLasoContext(ls: Laso): string {
  const palaces = (ls.palaces as Rec[]) || [];
  let ctx = '';

  if (ls.canChiNam) ctx += 'Can Chi năm sinh: ' + ls.canChiNam + '\n';
  if (ls.napAm) ctx += 'Nạp Âm: ' + ls.napAm + ' (' + (ls.napAmHanh || '') + ')\n';
  if (ls.menhDC) ctx += 'Mệnh (địa chi): ' + ls.menhDC + '\n';
  if (ls.thanDC) ctx += 'Thân (địa chi): ' + ls.thanDC + '\n';
  if (ls.tuoiXem) ctx += 'Tuổi xem: ' + ls.tuoiXem + '\n';

  if (Array.isArray(ls.cachCuc) && ls.cachCuc.length) {
    const cc = (ls.cachCuc as Rec[])
      .map((c) => (typeof c === 'object' ? c.ten + (c.loai ? ` (${c.loai})` : '') : c))
      .filter(Boolean);
    if (cc.length) ctx += 'Cách cục toàn cục: ' + cc.join(', ') + '\n';
  }

  if (ls.daiVanHienTai) {
    const dv = ls.daiVanHienTai as Rec;
    const dvCung = (palaces[dv.cungIdx as number] || {}) as Rec;
    ctx += '\nĐại Vận hiện tại: ' + (dv.diaChi || '') + ' (' + (dv.tuoiStart || '') + '–' + (dv.tuoiEnd || '') + ' tuổi)';
    if (dvCung.cungName) ctx += ' — Cung ' + dvCung.cungName;
    const dvStars = (((dvCung.tuChinhStars as unknown[]) || (dvCung.majorStars as unknown[]) || []) as unknown[]).map(starName).filter(Boolean);
    if (dvStars.length) ctx += ' — Sao: ' + dvStars.join(', ');
    const sc = dv.scoring as Rec | undefined;
    if (sc?.tong != null) ctx += ' — Điểm vận: ' + sc.tong + '/10 ' + (sc.flag || '');
    ctx += '\n';
  }

  ctx += '\n=== 12 CUNG ===\n';
  for (const p of palaces) {
    const pName = String(p.cungName || '');
    ctx += '\nCung ' + pName + ' (' + (p.diaChi || '') + ')' + (p.isMenh ? ' ★MỆNH' : '') + (p.isThan ? ' ◆THÂN' : '') + ':\n';
    const sc = (ls.cungScores as Rec)?.[pName] as Rec | undefined;
    if (sc?.tong != null) ctx += '  Điểm cung: ' + sc.tong + '/10\n';
    const chinh = ((p.majorStars as unknown[]) || []).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '  Chính tinh: ' + chinh.join(', ') + '\n';
    const phu = ((p.stars as Rec[]) || [])
      .filter((s) => (typeof s === 'object' ? s.nhom !== 'chinh' : true))
      .map(starFmt)
      .filter(Boolean);
    if (phu.length) ctx += '  Phụ tinh: ' + phu.slice(0, 8).join(', ') + '\n';
    if (Array.isArray(p.cachCuc) && p.cachCuc.length) {
      (p.cachCuc as Rec[]).forEach((c) => {
        const ten = c.ten || c;
        const mota = c.moTa ? ': ' + c.moTa : '';
        ctx += '  Cách cục — ' + ten + mota + '\n';
      });
    }
  }

  if (Array.isArray(ls.daiVans) && ls.daiVans.length) {
    ctx += '\n=== ĐẠI VẬN ===\n';
    (ls.daiVans as Rec[]).slice(0, 10).forEach((dv, i) => {
      const dvP = (palaces[dv.cungIdx as number] || {}) as Rec;
      const stars = (((dvP.tuChinhStars as unknown[]) || (dvP.majorStars as unknown[]) || []) as unknown[]).map(starName).filter(Boolean);
      ctx += 'ĐV' + (i + 1) + ': ' + (dv.diaChi || '') + ' (' + dv.tuoiStart + '–' + dv.tuoiEnd + 't) cung=' + (dvP.cungName || '?');
      if (stars.length) ctx += ' sao=' + stars.join(',');
      const dsc = dv.scoring as Rec | undefined;
      if (dsc?.tong != null) ctx += ' điểm=' + dsc.tong + '/10';
      ctx += '\n';
    });
  }

  return ctx;
}

/** Tóm tắt 1 dòng để hiển thị nhãn tool_call cho client. */
export function lasoSummary(ls: Laso): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const menh = palaces.find((p) => p.isMenh) as Rec | undefined;
  const menhStars = (((menh?.majorStars as unknown[]) || []) as unknown[]).map(starName).filter(Boolean);
  return [
    ls.canChiNam ? String(ls.canChiNam) : '',
    menh ? 'Mệnh ' + (menhStars.join(', ') || menh.diaChi) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
