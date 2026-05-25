// Demo script: print sample ngày tốt output để verify với lịch vạn niên VN
// Usage: cd tuvi-engine && npm run build && node scripts/demo-ngay-tot.mjs
// (sau khi build, dist/ chứa .js đã compile)

import {
  computeNgayTot, computeMonth,
  scoreAllActivities, topDaysForActivity,
  ACTIVITY_META,
} from '../dist/ngay-tot/index.js';

function printDay(info) {
  const { duongLich: dl, amLich: al } = info;
  const kyList = [];
  if (info.kyTamNuong) kyList.push('Tam Nương');
  if (info.kyNguyetKy) kyList.push('Nguyệt Kỵ');
  if (info.kyDuongCong) kyList.push('Dương Công');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📅 ${info.thuTrongTuan}, ${dl.day}/${dl.month}/${dl.year} DL`);
  console.log(`   ÂL: ${al.day}/${al.month}/${al.year}${al.isLeap ? ' (nhuận)' : ''}`);
  console.log(`   Can chi ngày: ${info.canChiNgay} | Chi tháng: ${info.chiThang}`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`   Trực:  ${info.truc} (${info.trucTinhChat})`);
  console.log(`   Tú:    ${info.tu} (${info.tuTinhChat})`);
  console.log(`   Sao:   ${info.saoNgay} — ${info.saoYNghia} [${info.hoangDao ? 'HOÀNG ĐẠO' : 'hắc đạo'}]`);
  console.log(`   Kỵ:    ${kyList.length ? kyList.join(', ') : 'Không có'}`);
  console.log(`   Tính chất chung: ${info.overallTinhChat.toUpperCase()}`);
  console.log(`\n   Giờ hoàng đạo (${info.gioHoangDao.length}):`);
  for (const g of info.gioHoangDao) {
    console.log(`     • ${g.chi} (${g.range}) — ${g.sao}`);
  }
}

function printActivityScores(info) {
  const scores = scoreAllActivities(info);
  console.log(`\n   Điểm theo từng việc:`);
  for (const s of scores) {
    const bar = '█'.repeat(s.score) + '░'.repeat(10 - s.score);
    console.log(`     ${ACTIVITY_META[s.activity].name.padEnd(22)} ${bar} ${s.score}/10 (${s.level})`);
  }
}

function printTopDaysForMonth(year, month, activity) {
  console.log(`\n${'#'.repeat(70)}`);
  console.log(`# Top 5 ngày tốt ${ACTIVITY_META[activity].name.toUpperCase()} — tháng ${month}/${year}`);
  console.log(`${'#'.repeat(70)}`);

  const m = computeMonth(year, month);
  const top = topDaysForActivity(m, activity, 5);

  if (top.length === 0) {
    console.log(`\n  ⚠️  KHÔNG có ngày nào điểm ≥ 6 trong tháng này cho ${ACTIVITY_META[activity].name}`);
    return;
  }

  for (const { info, score } of top) {
    console.log(`\n  ★ ${info.thuTrongTuan}, ${info.duongLich.day}/${info.duongLich.month}/${info.duongLich.year} ` +
                `(ÂL ${info.amLich.day}/${info.amLich.month}) — ${score.score}/10 (${score.level})`);
    console.log(`    Trực ${info.truc} | Sao ${info.saoNgay} | Tú ${info.tu}`);
    if (score.reasons.length) console.log(`    ✓ ${score.reasons.join('; ')}`);
    if (score.warnings.length) console.log(`    ✗ ${score.warnings.join('; ')}`);
  }
}

// ─── RUN ─────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  DEMO ENGINE NGÀY TỐT — verify với lịch vạn niên VN                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

// Print 3 ngày: 1 ngày đẹp, 1 ngày kỵ, 1 ngày bình
console.log('\n\n────── PHẦN 1: 3 NGÀY CHI TIẾT ──────');

const samples = [
  [1, 6, 2026],   // 1/6/2026
  [13, 5, 2026],  // sample ngày kỵ tiềm năng (gần Tam Nương)
  [25, 12, 2026], // cuối năm
];

for (const [d, m, y] of samples) {
  const info = computeNgayTot(d, m, y);
  printDay(info);
  printActivityScores(info);
}

// Print top 5 ngày cho 3 activity, tháng 5/2026
console.log('\n\n────── PHẦN 2: TOP NGÀY CHO ACTIVITY ──────');
printTopDaysForMonth(2026, 5, 'cuoi-hoi');
printTopDaysForMonth(2026, 5, 'khai-truong');
printTopDaysForMonth(2026, 6, 'khoi-cong');

console.log('\n\n✅ Done. Hãy verify 3 ngày sample ở trên với lichvansu.wap.vn hoặc lichvannien.net\n');
