#!/usr/bin/env node
// scripts/gen-tiet-khi-table.mjs
// ============================================================
// SINH bảng THỜI ĐIỂM vào 12 TIẾT (節, kinh độ Mặt Trời 255°+30°·k — mốc đổi
// trụ THÁNG Bát Tự; Lập Xuân 315° cũng là mốc đổi trụ NĂM) cho
// public/tubinh-ansao-engine.js, khối `<TIET_KHI_TABLE>`.
//
//   node scripts/gen-tiet-khi-table.mjs           # in thống kê, không ghi
//   node scripts/gen-tiet-khi-table.mjs --write   # ghi đè khối trong engine
//
// Chỉ dùng cho lịch cn/kr/jp (i18n W3b, 2026-11): trụ tháng/năm quyết bằng
// THỜI ĐIỂM vào tiết so với thời điểm sinh tuyệt đối. Lịch vn vẫn theo NGÀY
// (`_findTietKhiJDN`) — nợ cũ, xem docs/luat/engine-cophap.md.
//
// Nguồn thiên văn: `astronomy-engine` (MIT, đối chứng JPL; có sẵn trong
// package-lock qua mingyu-core) — `SearchSunLongitude` = kinh độ hoàng đạo BIỂU
// KIẾN của Mặt Trời (có chương động + quang sai, đúng định nghĩa tiết khí), trả
// thời điểm UT (đã trừ ΔT). CHỈ dùng trong script này — engine/sản phẩm đọc bảng.
// Cùng nguồn W3 dùng cho trung khí ở scripts/gen-lunar-table.mjs.
//
// Chỉ 12 TIẾT, không 24: 12 trung khí (中氣) không đổi trụ nào nên không ship.
//
// Mã hoá (~2,4 KB):
//   • dãy theo thời gian, phần tử i là tiết kinh độ (255 + 30·i) mod 360:
//     i=0 Đại Tuyết 1899 · i=1 Tiểu Hàn 1900 · i=2 Lập Xuân 1900 · … ·
//     i=2413 Tiểu Hàn 2101 — phủ trọn 1900-01-01 → 2100-12-31 giờ mọi lịch;
//   • giá trị = số PHÚT UTC kể từ 1900-01-01T00:00Z, làm tròn tới phút (bảng
//     KASI/NAOJ/HKO đều công bố tới phút);
//   • 12 phần tử đầu ghi tuyệt đối (base36, có dấu), phần tử i ≥ 12 ghi
//     t[i] − t[i−12] − 525930 bằng MỘT ký tự base36 (năm chí tuyến ≈ 525949 phút,
//     thực tế dao động 525932…525962 phút suốt 1900–2100 ⇒ 2…32, vừa 0…35).
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

export const EPOCH_MS = Date.UTC(1900, 0, 1);
export const NAM_BASE = 525930;
export const SO_MOC = 1 + 201 * 12 + 1; // Đại Tuyết 1899 … Tiểu Hàn 2101

/** Tính lại toàn bộ mốc (phút UTC kể từ 1900) bằng astronomy-engine. */
export function tinhMoc() {
  const A = createRequire(import.meta.url)('astronomy-engine');
  const out = [];
  let tu = new A.AstroTime(new Date(Date.UTC(1899, 10, 20)));
  for (let i = 0; i < SO_MOC; i++) {
    const L = (255 + 30 * i) % 360;
    const t = A.SearchSunLongitude(L, tu, 40);
    if (!t) throw new Error(`không tìm được kinh độ ${L}° (mốc ${i})`);
    out.push(Math.round((t.date.getTime() - EPOCH_MS) / 60000));
    tu = t.AddDays(10);
  }
  return out;
}

export function maHoa(moc) {
  const goc = moc
    .slice(0, 12)
    .map((v) => v.toString(36))
    .join(',');
  let delta = '';
  for (let i = 12; i < moc.length; i++) {
    const d = moc[i] - moc[i - 12] - NAM_BASE;
    if (d < 0 || d > 35)
      throw new Error(`mốc ${i}: chênh năm ${d + NAM_BASE} phút ngoài tầm mã hoá`);
    delta += d.toString(36);
  }
  return { goc, delta };
}

const ENGINE = join(process.cwd(), 'public', 'tubinh-ansao-engine.js');
const MO = '// <TIET_KHI_TABLE>';
const DONG = '// </TIET_KHI_TABLE>';

if (import.meta.url === `file://${process.argv[1]}`) {
  const moc = tinhMoc();
  const { goc, delta } = maHoa(moc);
  const khoi =
    `${MO} — SINH bằng scripts/gen-tiet-khi-table.mjs --write, KHÔNG sửa tay.\n` +
    `const _TIET_KHI_GOC = '${goc}';\n` +
    `const _TIET_KHI_DELTA =\n` +
    delta
      .match(/.{1,96}/g)
      .map((s) => `  '${s}'`)
      .join(' +\n') +
    ';\n' +
    DONG;
  const iso = (m) => new Date(EPOCH_MS + m * 60000).toISOString().slice(0, 16);
  console.log(
    `${moc.length} mốc · ${iso(moc[0])}Z → ${iso(moc[moc.length - 1])}Z · ${khoi.length} byte`
  );
  if (process.argv.includes('--write')) {
    const src = readFileSync(ENGINE, 'utf-8');
    const a = src.indexOf(MO);
    const b = src.indexOf(DONG);
    if (a < 0 || b < a) throw new Error(`không thấy khối ${MO} … ${DONG} trong ${ENGINE}`);
    writeFileSync(ENGINE, src.slice(0, a) + khoi + src.slice(b + DONG.length));
    console.log('đã ghi', ENGINE);
  }
}
