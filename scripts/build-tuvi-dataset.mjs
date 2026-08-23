#!/usr/bin/env node
// scripts/build-tuvi-dataset.mjs
// ============================================================
// DỰNG BỘ DỮ LIỆU THỐNG KÊ TỬ VI — mục #10/14 (growth hack GH2).
//
// Vì sao đây là nước đi tăng trưởng chứ không phải một file JSON cho vui:
// chưa ai công bố "chính tinh nào hay đóng cung Mệnh nhất", "cục nào hiếm",
// "cách cục nào bao nhiêu phần trăm". Nhà báo, blogger, sinh viên viết về tử
// vi đều cần MỘT con số có nguồn — và giấy phép CC BY 4.0 buộc họ ghi nguồn.
// Tức backlink không đến từ việc đi xin, mà đến từ ĐIỀU KIỆN SỬ DỤNG.
//
// 🔑 BA QUYẾT ĐỊNH PHƯƠNG PHÁP, đọc trước khi đổi lưới:
//
// 1. LƯỚI PHỦ ĐÚNG MỘT VÒNG 60 NĂM (1950–2009). Không phải chọn cho đẹp:
//    can chi năm lặp theo chu kỳ 60, nên phủ trọn một vòng thì ảnh hưởng của
//    thiên can/địa chi năm được CÂN BẰNG THEO CẤU TRÚC, không cần trọng số.
//    Lấy 50 năm hay 61 năm là tự tạo lệch rồi phải giải thích.
//
// 2. ĐÂY LÀ PHÂN BỐ TRÊN KHÔNG GIAN GIỜ SINH, KHÔNG PHẢI PHÂN BỐ DÂN SỐ.
//    Mình không có dữ liệu giờ sinh thật của người Việt (mùa sinh và giờ sinh
//    đều lệch trong đời thực). Nói "X% người Việt mệnh Tử Vi" là bịa. Câu đúng
//    là "trong các thời điểm sinh có thể có, X% cho ra cung Mệnh có Tử Vi".
//    Câu này in ngay trong file dữ liệu để không ai trích sai.
//
// 3. LẤY MẪU MỖI 6 NGÀY, cả 12 giờ, cả hai giới. Ngày dương lịch trượt đều
//    qua mọi ngày âm lịch nên bước 6 không rơi trúng chu kỳ nào; 12 giờ và 2
//    giới thì lấy TRỌN, không lấy mẫu — chúng chỉ có 24 tổ hợp và ảnh hưởng
//    trực tiếp tới vị trí cung Mệnh.
//
// Chạy: node scripts/build-tuvi-dataset.mjs [--out public/data]
// Cần: cd tuvi-engine && npm run build (script nạp engine đã dựng).
// ============================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : join(ROOT, 'public', 'data');

const NAM_DAU = 1950;
const NAM_CUOI = 2009; // trọn 60 năm
const BUOC_NGAY = 6;
const VERSION = '1.0.0';

// `computeLaso` nạp từ bản ĐÃ BIÊN DỊCH (biến môi trường ENGINE_OUT) chứ
// không tự dựng lại engine vanilla trong sandbox: con số công bố ra ngoài
// phải là CHÍNH con số người dùng thấy trên site, không phải một bản dựng
// song song có thể trôi khỏi nhau.
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);

function pct(n, total) {
  return Math.round((n / total) * 100000) / 1000;
}

function tally(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function toSorted(map, total) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ value: k, count: n, percent: pct(n, total) }));
}

async function main() {
  // Dùng CHÍNH computeLaso của site (đã build sang JS) để con số trong dữ
  // liệu công bố khớp tuyệt đối với con số người dùng thấy trên trang.
  const OUTDIR = process.env.ENGINE_OUT;
  if (!OUTDIR) {
    console.error('Cần ENGINE_OUT=<thư mục lib đã biên dịch>. Xem chú thích đầu file.');
    process.exit(1);
  }
  const Module = require('node:module');
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (r, ...a) {
    if (r.startsWith('@/')) return orig.call(this, join(OUTDIR, r.slice(2)), ...a);
    return orig.call(this, r, ...a);
  };
  const { computeLaso } = require(join(OUTDIR, 'lib/engine/laso.js'));

  const menhStar = new Map();
  const menhStarCount = new Map();
  const cuc = new Map();
  const napAm = new Map();
  const napAmHanh = new Map();
  const menhChi = new Map();
  const cachCuc = new Map();
  const cachCucLoai = new Map();
  const thanCung = new Map();

  let total = 0;
  let voChinhDieu = 0;
  const t0 = Date.now();

  for (let y = NAM_DAU; y <= NAM_CUOI; y++) {
    for (let m = 1; m <= 12; m++) {
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d = 1; d <= dim; d += BUOC_NGAY) {
        for (let h = 0; h < 12; h++) {
          for (const gender of ['nam', 'nu']) {
            const r = computeLaso({
              day: d,
              month: m,
              year: y,
              hourBranch: h,
              gender,
              isLunar: false,
            });
            const ls = r && r.ls;
            if (!ls || !Array.isArray(ls.palaces)) continue;
            total++;
            const p = ls.palaces[ls.menhIdx];
            const majors = (p && p.majorStars) || [];
            if (!majors.length) voChinhDieu++;
            for (const s of majors) tally(menhStar, s.ten);
            tally(menhStarCount, String(majors.length));
            if (ls.cuc) tally(cuc, ls.cuc);
            if (ls.napAm) tally(napAm, ls.napAm);
            if (ls.napAmHanh) tally(napAmHanh, ls.napAmHanh);
            if (p && p.diaChi) tally(menhChi, p.diaChi);
            const tp = ls.palaces[ls.thanIdx];
            if (tp && tp.cungName) tally(thanCung, tp.cungName);
            for (const c of ls.cachCuc || []) {
              tally(cachCuc, c.ten);
              if (c.loai) tally(cachCucLoai, c.loai);
            }
          }
        }
      }
    }
    if ((y - NAM_DAU) % 10 === 9) {
      process.stderr.write(
        `  …${y - NAM_DAU + 1}/60 năm, ${total} lá số, ${Math.round((Date.now() - t0) / 1000)}s\n`
      );
    }
  }

  const data = {
    $schema: 'https://www.tuviminhbao.com/data/tuvi-dataset.schema.json',
    name: 'Bộ dữ liệu thống kê Tử Vi Đẩu Số',
    nameEn: 'Zi Wei Dou Shu (Vietnamese astrology) statistics dataset',
    version: VERSION,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Tử Vi Minh Bảo — https://www.tuviminhbao.com/du-lieu',
    generatedAt: new Date().toISOString().slice(0, 10),
    method: {
      vi: `Lập ${total.toLocaleString('vi-VN')} lá số bằng engine cổ pháp của tuviminhbao.com, phủ trọn một vòng can chi 60 năm (${NAM_DAU}–${NAM_CUOI}), lấy mẫu mỗi ${BUOC_NGAY} ngày dương lịch, đủ 12 giờ sinh và cả hai giới.`,
      en: `${total} charts cast with the tuviminhbao.com engine, covering one complete 60-year sexagenary cycle (${NAM_DAU}–${NAM_CUOI}), sampled every ${BUOC_NGAY} solar days, all 12 birth hours and both genders.`,
    },
    // 🔴 Câu này phải đi KÈM mọi con số — xem quyết định 2 ở đầu script.
    caveat: {
      vi: 'Đây là phân bố trên KHÔNG GIAN THỜI ĐIỂM SINH, không phải phân bố dân số. Không có dữ liệu giờ sinh thật của người Việt, nên KHÔNG được đọc thành "X% người Việt có …". Câu đúng: "trong các thời điểm sinh có thể có, X% cho ra …".',
      en: 'This is a distribution over the SPACE OF POSSIBLE BIRTH TIMES, not over a population. Real births are not uniform across dates and hours, so these figures must not be read as "X% of Vietnamese people have …".',
    },
    totals: { charts: total, yearsCovered: NAM_CUOI - NAM_DAU + 1, dayStep: BUOC_NGAY },
    distributions: {
      menhMajorStar: {
        label: 'Chính tinh đóng cung Mệnh',
        note: 'Một cung Mệnh có thể có 0, 1 hoặc 2 chính tinh — nên tổng phần trăm KHÔNG bằng 100.',
        items: toSorted(menhStar, total),
      },
      menhMajorStarCount: {
        label: 'Số chính tinh tại cung Mệnh',
        items: toSorted(menhStarCount, total),
      },
      menhVoChinhDieu: {
        label: 'Mệnh vô chính diệu',
        count: voChinhDieu,
        percent: pct(voChinhDieu, total),
      },
      menhBranch: { label: 'Địa chi cung Mệnh', items: toSorted(menhChi, total) },
      cuc: { label: 'Cục', items: toSorted(cuc, total) },
      napAm: { label: 'Nạp âm mệnh (60 hoa giáp)', items: toSorted(napAm, total) },
      napAmElement: { label: 'Ngũ hành nạp âm', items: toSorted(napAmHanh, total) },
      thanPalace: { label: 'Cung an Thân', items: toSorted(thanCung, total) },
      cachCucType: {
        label: 'Nhóm cách cục',
        note: 'Một lá số thường thuộc nhiều nhóm cách cục — tổng phần trăm KHÔNG bằng 100.',
        items: toSorted(cachCucLoai, total),
      },
      cachCuc: {
        label: 'Cách cục',
        note: 'Một lá số thường có nhiều cách cục — tổng phần trăm KHÔNG bằng 100.',
        items: toSorted(cachCuc, total),
      },
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'tuvi-dataset-v1.json'), JSON.stringify(data, null, 2) + '\n');

  // CSV phẳng — nhà báo/sinh viên mở Excel được ngay, đó mới là tệp dùng nhiều.
  const rows = [['distribution', 'value', 'count', 'percent']];
  for (const [k, v] of Object.entries(data.distributions)) {
    for (const it of v.items || []) rows.push([k, it.value, it.count, it.percent]);
  }
  const csv = rows
    .map((r) =>
      r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')
    )
    .join('\n');
  writeFileSync(join(OUT_DIR, 'tuvi-dataset-v1.csv'), csv + '\n');

  console.log(`✅ ${total} lá số · ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log(`   ${join(OUT_DIR, 'tuvi-dataset-v1.json')}`);
  console.log(`   ${join(OUT_DIR, 'tuvi-dataset-v1.csv')} (${rows.length - 1} dòng)`);
}

main();
