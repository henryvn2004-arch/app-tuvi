#!/usr/bin/env node
// scripts/oracle/check-ansao-exhaustive.mjs
// ============================================================
// Quét VÉT CẠN toàn miền an sao — 60 cặp can-chi hợp lệ × 12 tháng ÂL ×
// 30 ngày ÂL × 12 giờ × 2 giới = 518.400 tổ hợp — so vị trí sao giữa engine
// hiện tại (public/tuvi-ansao-engine.js) và oracle (scripts/oracle/vendor/).
//
// KHÔNG sửa engine. Đây là công cụ ĐO cho P1-P4, và là cổng kiểm cho P0:
// mọi lệch NGOÀI 9 điểm đã biết (xem docs workplan) phải làm script này
// THOÁT KHÁC 0 — im lặng bỏ sót một lệch mới là đúng thứ P0 tồn tại để chặn.
//
// Cần scripts/oracle/vendor/ (không commit) — thiếu thì thoát 0 kèm cảnh
// báo, không phải lỗi cứng (đây là công cụ tuỳ chọn với người không có file).
// ============================================================

import { placeStarsFast, anSaoLaSoFull } from './our-engine.mjs';

let loadOracle, buildOracleChartFromCanChi;
try {
  ({ loadOracle, buildOracleChartFromCanChi } = await import('./load.mjs'));
} catch (e) {
  console.error('✗ Không nạp được scripts/oracle/load.mjs:', e.message);
  process.exit(1);
}
try {
  loadOracle();
} catch (e) {
  console.log('⚠ ' + e.message);
  console.log('  (bỏ qua check-ansao-exhaustive — công cụ tuỳ chọn, không gate CI)');
  process.exit(0);
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CUC_NUMBER = {
  'Thủy Nhị Cục': 2,
  'Mộc Tam Cục': 3,
  'Kim Tứ Cục': 4,
  'Thổ Ngũ Cục': 5,
  'Hỏa Lục Cục': 6,
};

// ── B1: tự đối chứng fast-path với bản thật (KHÔNG tin fast-path mù quáng) ──
function selfCheckFastPathMatchesReal() {
  const starSetOf = (palaces) => {
    const out = [];
    for (const p of palaces)
      for (const s of p.stars) out.push(`${p.idx}:${s.ten}:${s.hoa || ''}:${s.brightness}`);
    return out.sort().join('|');
  };
  let n = 0,
    bad = 0;
  for (let ci = 0; ci < 10; ci += 3) {
    for (let cj = ci % 2; cj < 12; cj += 5) {
      if (ci % 2 !== cj % 2) continue;
      for (let lm = 1; lm <= 12; lm += 4) {
        for (let ld = 1; ld <= 30; ld += 7) {
          for (let gi = 0; gi < 12; gi += 3) {
            for (const gender of ['nam', 'nu']) {
              const args = {
                ngayAL: ld,
                thangAL: lm,
                namAL: 1990,
                canNam: CAN[ci],
                chiNam: CHI[cj],
                gioIdx: gi,
                gioitinh: gender,
                namXem: 2020,
              };
              const full = anSaoLaSoFull(args);
              const fast = placeStarsFast(args);
              n++;
              if (
                starSetOf(full.palaces) !== starSetOf(fast.palaces) ||
                full.menhIdx !== fast.menhIdx ||
                full.thanIdx !== fast.thanIdx ||
                full.cuc !== fast.cuc
              ) {
                bad++;
              }
            }
          }
        }
      }
    }
  }
  if (bad) {
    console.error(
      `✗ FATAL: placeStarsFast() LỆCH với anSaoLaSo() thật trên ${bad}/${n} mẫu tự đối chứng.`
    );
    console.error(
      '  our-engine.mjs đã trôi khỏi public/tuvi-ansao-engine.js thật — SỬA our-engine.mjs trước khi tin kết quả quét vét cạn.'
    );
    process.exit(1);
  }
  console.log(`✓ Tự đối chứng: placeStarsFast() khớp anSaoLaSo() thật trên ${n}/${n} mẫu.`);
}
selfCheckFastPathMatchesReal();

// ── B2: chuẩn hoá tên sao để so hai nguồn ──────────────────────────
// Biến thể chính tả CÙNG MỘT SAO — không phải lệch vị trí.
const NAME_ALIAS = new Map([
  ['Lực Sĩ', 'Lực Sỹ'], // oracle dùng "Sĩ", ta dùng "Sỹ" — cùng vòng Bác Sĩ
  ['L.N. Văn Tinh', 'Lưu Niên Văn Tinh'], // oracle viết tắt, ta viết đủ — cùng một sao (đã xác minh 0 lệch vị trí sau khi gộp)
]);
const norm = (name) => NAME_ALIAS.get(name) || name;

// Sao CHỈ MỘT BÊN có, đã biết và có lý do — không phải lệch cần điều tra.
const OURS_ONLY_EXPECTED = new Set(['Thiên La', 'Địa Võng']); // oracle: chỉ là NHÃN của Đà La ở Thìn/Tuất, không phải sao độc lập
const ORACLE_ONLY_EXPECTED = new Set(['Bác Sỹ']); // ta an "Bác Sỹ" trong vòng Lộc Tồn cùng object với "Lộc Tồn" — kiểm riêng bên dưới, không qua vòng lặp tên

// 9 điểm lệch ĐÃ GHI trong workplan (đối chiếu công thức trước đó) — lệch ở
// đây là ĐÃ BIẾT, không phải regression. Bất kỳ tên nào NGOÀI danh sách này
// mà lệch vị trí mới là điều P0 cần bắt.
const KNOWN_DIVERGENT_STARS = new Set([
  'Kình Dương', // trường phái: ta cố định, họ đảo theo âm-dương×giới (P3)
  'Đà La',
  'Đào Hoa', // bảng tra sai ở tuổi Sửu (P2)
  'Thiên Quan', // bảng tra trượt bậc ở can Ất/Bính (P2)
  'Thiên Phúc',
  'Thiên Trù', // bảng tra sai ở can Canh (P2)
  'Lưu Hà', // bảng tra sai ở can Mậu (P2)
  'Hóa Khoa', // can Canh: ta gán Thái Âm, họ gán Thiên Đồng — hoán vị với Hóa Kỵ (P2)
  'Hóa Kỵ', // can Canh: ta gán Thiên Đồng, họ gán Thái Âm
]);

function starPositionMap(palaces, { includeHoa = false } = {}) {
  const map = new Map();
  for (const p of palaces) {
    for (const s of p.stars) {
      if (s.nhom === 'tuan_triet') continue;
      map.set(norm(s.ten), p.idx);
      if (includeHoa && s.hoa) map.set(`Hóa ${s.hoa}`, p.idx);
    }
  }
  return map;
}

// ── B3: quét vét cạn ──────────────────────────────────────────────
const GENDERS = [
  { our: 'nam', oracle: 'Nam' },
  { our: 'nu', oracle: 'Nữ' },
];

let total = 0;
const unexpected = []; // {ci,cj,lm,ld,gi,gender,detail}
const knownDivergenceCount = new Map(); // tên sao -> số lần lệch
const menhThanCucMismatch = [];
const tuanTrietMismatch = [];
const unknownNameOnOurSide = new Set();
const unknownNameOnOracleSide = new Set();

const t0 = Date.now();
for (let ci = 0; ci < 10; ci++) {
  for (let cj = 0; cj < 12; cj++) {
    if (ci % 2 !== cj % 2) continue; // chỉ 60 cặp can-chi hợp lệ trong lục thập hoa giáp
    for (let lm = 1; lm <= 12; lm++) {
      for (let ld = 1; ld <= 30; ld++) {
        for (let gi = 0; gi < 12; gi++) {
          for (const g of GENDERS) {
            total++;
            const ours = placeStarsFast({
              ngayAL: ld,
              thangAL: lm,
              canNam: CAN[ci],
              chiNam: CHI[cj],
              gioIdx: gi,
              gioitinh: g.our,
            });
            const oracle = buildOracleChartFromCanChi({
              canNam: ci + 1,
              chiNam: cj + 1,
              ld,
              lm,
              hourBranch: gi + 1,
              gender: g.oracle,
            });

            const ctx = { ci, cj, lm, ld, gi, gender: g.our };

            // Mệnh / Thân / Cục
            if (ours.menhIdx !== oracle.menh - 1 || ours.thanIdx !== oracle.than - 1) {
              menhThanCucMismatch.push({
                ...ctx,
                kind: 'menh/than',
                ours: [ours.menhIdx, ours.thanIdx],
                oracle: [oracle.menh - 1, oracle.than - 1],
              });
            }
            if (CUC_NUMBER[ours.cuc] !== oracle.cuc.number) {
              menhThanCucMismatch.push({
                ...ctx,
                kind: 'cuc',
                ours: ours.cuc,
                oracle: oracle.cuc.name,
              });
            }

            // Tuần / Triệt (oracle 1-indexed -> trừ 1 để so idx 0-indexed)
            const ourTuan = ours.palaces
              .filter((p) => p.stars.some((s) => s.ten === 'Tuần' || s.ten === 'Tuần+Triệt'))
              .map((p) => p.idx)
              .sort();
            const ourTriet = ours.palaces
              .filter((p) => p.stars.some((s) => s.ten === 'Triệt' || s.ten === 'Tuần+Triệt'))
              .map((p) => p.idx)
              .sort();
            const oracleTuan = [...oracle.marks.tuan].map((x) => x - 1).sort();
            const oracleTriet = [...oracle.marks.triet].map((x) => x - 1).sort();
            if (
              JSON.stringify(ourTuan) !== JSON.stringify(oracleTuan) ||
              JSON.stringify(ourTriet) !== JSON.stringify(oracleTriet)
            ) {
              tuanTrietMismatch.push({
                ...ctx,
                ours: { tuan: ourTuan, triet: ourTriet },
                oracle: { tuan: oracleTuan, triet: oracleTriet },
              });
            }

            // Vị trí sao — union tên hai bên, đã chuẩn hoá alias
            const ourPos = starPositionMap(ours.palaces, { includeHoa: true });
            const oraclePos = new Map();
            for (const [name, branch1] of Object.entries(oracle.positions))
              oraclePos.set(norm(name), branch1 - 1);

            const allNames = new Set([...ourPos.keys(), ...oraclePos.keys()]);
            for (const name of allNames) {
              const hasOurs = ourPos.has(name);
              const hasOracle = oraclePos.has(name);
              if (hasOurs && !hasOracle) {
                if (!OURS_ONLY_EXPECTED.has(name)) unknownNameOnOurSide.add(name);
                continue;
              }
              if (hasOracle && !hasOurs) {
                if (!ORACLE_ONLY_EXPECTED.has(name)) unknownNameOnOracleSide.add(name);
                continue;
              }
              if (ourPos.get(name) !== oraclePos.get(name)) {
                if (KNOWN_DIVERGENT_STARS.has(name)) {
                  knownDivergenceCount.set(name, (knownDivergenceCount.get(name) || 0) + 1);
                } else {
                  unexpected.push({
                    ...ctx,
                    star: name,
                    ours: ourPos.get(name),
                    oracle: oraclePos.get(name),
                  });
                }
              }
            }
          }
        }
      }
    }
  }
}
const ms = Date.now() - t0;

console.log(`\n=== Quét vét cạn an sao: ${total} tổ hợp trong ${(ms / 1000).toFixed(1)}s ===\n`);

console.log('-- Lệch ĐÃ BIẾT (P2/P3 sẽ sửa, không phải regression) --');
for (const [name, count] of [...knownDivergenceCount.entries()].sort()) {
  console.log(`  ${name}: ${count}/${total} (${((count / total) * 100).toFixed(1)}%)`);
}

let failed = false;

if (menhThanCucMismatch.length) {
  failed = true;
  console.error(
    `\n✗ Mệnh/Thân/Cục lệch ở ${menhThanCucMismatch.length} tổ hợp (KHÔNG nằm trong 9 điểm đã biết):`
  );
  for (const m of menhThanCucMismatch.slice(0, 5)) console.error('   ', JSON.stringify(m));
}
if (tuanTrietMismatch.length) {
  failed = true;
  console.error(`\n✗ Tuần/Triệt lệch ở ${tuanTrietMismatch.length} tổ hợp:`);
  for (const m of tuanTrietMismatch.slice(0, 5)) console.error('   ', JSON.stringify(m));
}
if (unknownNameOnOurSide.size) {
  failed = true;
  console.error(
    `\n✗ Tên sao CHỈ ta có, KHÔNG trong danh sách đã biết (${[...OURS_ONLY_EXPECTED].join(', ')}):`
  );
  console.error('   ', [...unknownNameOnOurSide].join(', '));
}
if (unknownNameOnOracleSide.size) {
  failed = true;
  console.error(
    `\n✗ Tên sao CHỈ oracle có, KHÔNG trong danh sách đã biết (${[...ORACLE_ONLY_EXPECTED].join(', ')}):`
  );
  console.error('   ', [...unknownNameOnOracleSide].join(', '));
}
if (unexpected.length) {
  failed = true;
  const byStar = new Map();
  for (const u of unexpected) byStar.set(u.star, (byStar.get(u.star) || 0) + 1);
  console.error(
    `\n✗ LỆCH VỊ TRÍ NGOÀI danh sách 9 điểm đã biết — ${unexpected.length} tổ hợp, ${byStar.size} tên sao:`
  );
  for (const [name, count] of byStar) console.error(`   ${name}: ${count}/${total}`);
  console.error('  Ví dụ:');
  for (const u of unexpected.slice(0, 8)) console.error('   ', JSON.stringify(u));
}

if (failed) {
  console.error(
    '\n✗ check-ansao-exhaustive: có lệch KHÔNG giải thích được — điều tra trước khi làm P1-P4.'
  );
  process.exit(1);
}
console.log(
  '\n✓ check-ansao-exhaustive: mọi lệch đều nằm trong 9 điểm đã biết. Không có regression bất ngờ.'
);
