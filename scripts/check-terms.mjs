#!/usr/bin/env node
/**
 * scripts/check-terms.mjs — canh các BẢNG DỊCH phủ đủ nguồn của chúng.
 *
 * VÌ SAO CÓ FILE NÀY: cùng một lỗi đã tái phát BA LẦN trong track dùng
 * `mingyu-core`, và lần nào cũng chỉ lộ ra khi gọi engine thật:
 *   · Kỳ Môn (#408) — bảng dựng từ chữ trong TÊN CÁCH CỤC nên thiếu hẳn địa chi
 *     và tiết khí ⇒ giao diện ra `"Bính 午"`, `"Đại 暑"`.
 *   · Lục Nhâm — `docPhap` chỉ tách tiền tố `返吟` nên `遥克比用` / `遥克涉害`
 *     lọt nguyên chữ Hán ra trang.
 *   · Bản đồ sao — `True North Node` / `Mean Lilith` không nằm trong danh sách
 *     `planets` mà chỉ xuất hiện trong khía cạnh và hình thế ⇒ lọt chữ Anh.
 *
 * 🔑 BÀI HỌC CHUNG: bảng dịch dựng từ MỘT nguồn thì chỉ phủ đúng nguồn đó.
 * Script này gọi ENGINE THẬT trên một lưới mẫu rồi quét chữ Hán / chữ Anh còn
 * sót trong payload đã dịch — thứ mà `tsc` và `eslint` không bao giờ bắt được,
 * vì về mặt kiểu dữ liệu thì một chữ Hán lọt ra vẫn là `string` hợp lệ.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// `lib/almanac/day.ts` nạp `tuvi-engine/dist` (thư mục gitignore). Thiếu nó thì
// node ném `ERR_MODULE_NOT_FOUND` với đường dẫn trong /tmp — đọc xong vẫn không
// biết phải làm gì. Nói thẳng ra.
if (!existsSync(join(process.cwd(), 'tuvi-engine/dist/ngay-tot/index.js'))) {
  console.error(
    '❌ Chưa có `tuvi-engine/dist` — bộ dò này gọi engine THẬT nên cần bản build.\n' +
      '   Chạy: cd tuvi-engine && npm ci && npm run build'
  );
  process.exit(1);
}

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/**
 * 🐞 KHÔNG dò chữ Anh bằng "từ viết hoa chữ ASCII" — bản đầu của script này làm
 * thế và báo `Thanh`, `Long`, `Kim`, `Nam` là tiếng Anh, trong khi đó là tiếng
 * VIỆT không dấu. Cùng họ dương tính giả với bộ dò mojibake từng bắt nhầm
 * `Â`/`Ã` (chữ Việt hợp lệ).
 *
 * Cách đúng: đối chiếu với ĐÚNG bộ từ vựng tiếng Anh của nguồn (`celestine`).
 * Chỉ tool chiêm tinh Tây có nguồn tiếng Anh; các tool Á Đông nguồn là chữ Hán.
 */
const ANH_NGUON = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'North Node',
  'South Node',
  'Mean Lilith',
  'True Lilith',
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
  'conjunction',
  'opposition',
  'trine',
  'square',
  'sextile',
  'quincunx',
  'semisextile',
  'semisquare',
  'sesquiquadrate',
  'quintile',
  'biquintile',
  'Ascendant',
  'Midheaven',
  'Descendant',
  'Imum Coeli',
  'Domicile',
  'Exaltation',
  'Detriment',
  'Fall',
  'Peregrine',
  'Grand Trine',
  'T-Square',
  'Grand Cross',
  'Stellium',
  'Yod',
  'fire',
  'earth',
  'air',
  'water',
  'cardinal',
  'fixed',
  'mutable',
];

let loi = 0;
const bao = (ok, msg) => {
  console.log(`  ${ok ? '✅' : '❌'} ${msg}`);
  if (!ok) loi++;
};

// Biên dịch các module TS cần dùng ra NGOÀI cây repo.
// ⚠️ `outDir` PHẢI nằm ngoài repo: chạy tsc với outDir bên trong từng làm emit
// 30 file .js lẫn vào `lib/` và đẩy lint lên 119 lỗi (cảnh báo TS5011).
const out = mkdtempSync(join(tmpdir(), 'tvmb-terms-'));
try {
  writeFileSync(
    join(out, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        outDir: join(out, 'build'),
        rootDir: process.cwd(),
        skipLibCheck: true,
        esModuleInterop: true,
        noEmitOnError: false,
      },
      include: [
        join(process.cwd(), 'lib/hanviet.ts'),
        join(process.cwd(), 'lib/qimen/*.ts'),
        join(process.cwd(), 'lib/liuren/*.ts'),
        join(process.cwd(), 'lib/almanac/*.ts'),
        join(process.cwd(), 'lib/bazi/*.ts'),
        join(process.cwd(), 'lib/tayphuong/*.ts'),
      ],
    })
  );
  try {
    execFileSync('npx', ['tsc', '-p', join(out, 'tsconfig.json')], { stdio: 'pipe' });
  } catch {
    /* tsc kêu về type của mingyu-core dưới moduleResolution này — vẫn emit đủ,
       và `npm run typecheck` mới là chỗ gác type. Bỏ qua có chủ đích. */
  }

  const build = join(out, 'build');
  writeFileSync(join(build, 'package.json'), '{"type":"module"}');
  execFileSync('ln', ['-sfn', join(process.cwd(), 'node_modules'), join(build, 'node_modules')]);
  execFileSync('ln', ['-sfn', join(process.cwd(), 'tuvi-engine'), join(build, 'tuvi-engine')]);
  // tsc không thêm đuôi .js cho import tương đối
  execFileSync('bash', [
    '-c',
    `find ${build} -name '*.js' -exec sed -i -E "s#(from '\\.[^']*)'#\\1.js'#g; s#(from '\\.[^']*\\.js)\\.js'#\\1'#g" {} +`,
  ]);

  const kich = `
import { createRequire } from 'node:module';
const { TimeManager } = await import('mingyu-core/calendar');
TimeManager.setTimezoneOffsetMinutesOverride(420);
const out = {};
function quet(ten, obj) {
  const s = JSON.stringify(obj);
  const han = s.match(${HAN.source ? '/[\\u3400-\\u4dbf\\u4e00-\\u9fff]/g' : '/x/'}) || [];
  out[ten] = { han: [...new Set(han)], raw: s };
}
const { dungBan, railData: qmRail } = await import('./lib/qimen/board.js');
quet('ky-mon', [0, 90, 180, 270].map(i => { const b = dungBan(new Date(Date.UTC(2026, 0, 1 + i, 5))); return [b, qmRail(b)]; }));

const { lapKhoa, railData: lnRail } = await import('./lib/liuren/ke.js');
quet('luc-nham', [0, 60, 150, 240, 330].flatMap(i => [1, 9, 17].map(h => { const k = lapKhoa(new Date(Date.UTC(2026, 0, 1 + i, h - 7))); return [k, lnRail(k)]; })));

const { dungHoangLich } = await import('./lib/almanac/day.js');
quet('hoang-lich', [0, 3, 6, 9].map(m => dungHoangLich(new Date(Date.UTC(2026, m, 1)), new Date(Date.UTC(2026, m, 20)))));

const { phanTich, railData: bzRail } = await import('./lib/bazi/phan-tich.js');
quet('bat-tu', [[3,6,1998,1],[17,11,1975,7],[28,2,2004,11]].map(([d,m,y,g]) => { const p = phanTich({ngay:d,thang:m,nam:y,gioChi:g,gioiTinh:'nam'}); return [p, bzRail(p)]; }));

const { lapBanDo, railData: bdRail } = await import('./lib/tayphuong/natal.js');
quet('ban-do-sao', [[3,6,1998,1,30],[22,12,1980,18,5]].map(([d,m,y,h,mi]) => { const b = lapBanDo({ngay:d,thang:m,nam:y,gio:h,phut:mi,vido:21.03,kinhdo:105.83,muiGio:7}); return [b, bdRail(b)]; }));

/* ─── PHỦ TRỌN TỪ VỰNG, không phải phủ mẫu ────────────────────────────────
   Quét mẫu ở trên chỉ chứng minh được thứ mà mẫu CHẠM TỚI. Đo thật: lưới cũ
   (3 lá số) bỏ lọt 4 tên; nới lên 352 lá số vẫn bỏ lọt thêm 10 tên nữa —
   chúng hiếm tới mức không lá nào trong lưới sinh ra. Nên với nguồn nào
   LIỆT KÊ ĐƯỢC danh sách tên, phải đối chiếu trọn danh sách đó. */
const HANR = /[\\u3400-\\u4dbf\\u4e00-\\u9fff]/;
const goc = (o, ra = new Set()) => {
  if (typeof o === 'string') { if (HANR.test(o)) ra.add(o); return ra; }
  if (Array.isArray(o)) { o.forEach(v => goc(v, ra)); return ra; }
  if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => { if (HANR.test(k)) ra.add(k); goc(v, ra); });
  return ra;
};
// ⚠️ Bọc try/catch để nguồn dời/đổi bố cục thì rơi về \`n: 0\` — chốt ngưỡng ở
// phía dưới mới in được câu hướng dẫn. Không bọc thì lượt chạy chết bằng một
// bãi ERR_MODULE_NOT_FOUND, đọc xong vẫn không biết phải sửa gì.
try {
  const { docThanSat: bzDoc } = await import('./lib/bazi/terms.js');
  // Nạp bằng đường dẫn TUYỆT ĐỐI: bảng này không nằm trong \`exports\` của
  // \`mingyu-core\` nên gọi theo tên gói sẽ bị chặn.
  const bzData = await import(${JSON.stringify(
    'file://' + join(process.cwd(), 'node_modules/mingyu-core/dist/bazi/baziShenShaData.js')
  )});
  const bzTen = goc(bzData.shenShaTypes);
  out['tuvung-bat-tu'] = { n: bzTen.size, sot: [...bzTen].filter(s => HANR.test(bzDoc(s).ten)) };
} catch (e) {
  out['tuvung-bat-tu'] = { n: 0, sot: [], loi: String(e && e.message || e) };
}

try {
  const { docThanSat: hlDoc } = await import('./lib/almanac/terms.js');
  const { listHuangliShenshaNames } = await import('mingyu-core/shensha');
  const hlTen = listHuangliShenshaNames();
  out['tuvung-hoang-lich'] = { n: hlTen.length, sot: hlTen.filter(s => HANR.test(hlDoc(s).ten)) };
} catch (e) {
  out['tuvung-hoang-lich'] = { n: 0, sot: [], loi: String(e && e.message || e) };
}

console.log('__KQ__' + JSON.stringify(out));
`;
  writeFileSync(join(build, 'check.mjs'), kich);
  const raw = execFileSync('node', [join(build, 'check.mjs')], {
    encoding: 'utf8',
    maxBuffer: 64e6,
  });
  const kq = JSON.parse(raw.slice(raw.indexOf('__KQ__') + 6));

  console.log('Quét chữ chưa dịch trong payload của các tool:\n');
  for (const [ten, r] of Object.entries(kq)) {
    // Hai mục `tuvung-*` không phải payload — chúng đối chiếu TRỌN danh sách
    // tên của nguồn, xử riêng ở dưới.
    if (ten.startsWith('tuvung-')) continue;
    bao(r.han.length === 0, `${ten.padEnd(12)} — chữ Hán lọt: ${r.han.join('') || 'không'}`);

    // 🐞 Loại lỗi THỨ HAI, khác hẳn chữ chưa dịch: giá trị hỏng bị NỘI SUY vào
    // chuỗi rail. Payload rail phải PHẲNG (`extractGenericContext` bỏ qua mọi
    // object) nên nó toàn `${...}` — một trường sai kiểu là ra thẳng
    // "Bắc (trên) undefined" trong prompt gửi LLM, mà `tsc` không bắt được vì
    // nội suy chấp nhận mọi kiểu.
    //   · ĐÃ BẮT THẬT: `summary.hemispheres` của celestine trả SỐ trong khi
    //     `elements`/`modalities` trả MẢNG ⇒ đếm `.length` ra `undefined`.
    //   · Cùng họ với bug `extractTuBinhContext` từng đẩy `[object Object]`
    //     vào ngữ cảnh Tử Bình.
    const hong = ['undefined', 'NaN', '[object Object]'].filter((w) => r.raw.includes(w));
    bao(
      hong.length === 0,
      `${ten.padEnd(12)} — giá trị hỏng lọt chuỗi: ${hong.join(', ') || 'không'}`
    );
    if (ten === 'ban-do-sao') {
      const sot = ANH_NGUON.filter((w) =>
        new RegExp(`\\b${w.replace(/[-]/g, '\\$&')}\\b`).test(r.raw)
      );
      bao(
        sot.length === 0,
        `${ten.padEnd(12)} — thuật ngữ Anh của celestine còn sót: ${sot.join(', ') || 'không'}`
      );
    }
  }

  console.log('\nĐối chiếu TRỌN danh sách tên của nguồn:\n');
  for (const [ten, nguong] of [
    ['tuvung-bat-tu', 150],
    ['tuvung-hoang-lich', 120],
  ]) {
    const r = kq[ten];
    // Đọc ra danh sách RỖNG rồi báo xanh còn tệ hơn báo đỏ — cùng chốt đã dựng
    // trong `check-que-motifs.mjs`. Bảng thần sát Bát Tự lấy qua đường dist nội
    // bộ của `mingyu-core` (không có trong `exports`) nên lượt bump có thể dời
    // nó; ngưỡng dưới đây làm chuông báo thay vì để bộ dò câm.
    if (!r || r.n < nguong) {
      console.error(
        `❌ ${ten} — chỉ đọc được ${r ? r.n : 0} tên (chờ ≥ ${nguong}).\n` +
          (r?.loi ? `   Lỗi khi đọc nguồn: ${r.loi}\n` : '') +
          '   Nguồn đã đổi bố cục ⇒ PHẢI sửa bộ dò. Đừng bỏ qua: đọc hụt danh ' +
          'sách thì mục này xanh mà không kiểm gì cả.'
      );
      loi++;
      continue;
    }
    bao(
      r.sot.length === 0,
      `${ten.padEnd(18)} — ${r.n} tên, còn chữ Hán: ${r.sot.join(', ') || 'không'}`
    );
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (loi) {
  console.error(
    `\n❌ ${loi} mục không đạt.\n` +
      '· Chữ chưa dịch → bổ sung vào `lib/hanviet.ts` hoặc bảng riêng của tool.\n' +
      '· Giá trị hỏng → sửa chỗ DỰNG chuỗi rail, đừng lọc chuỗi ở đầu ra: ' +
      '`undefined` ở đó nghĩa là một trường đọc sai kiểu từ engine nguồn.\n' +
      'ĐỪNG nới bộ dò — nó đã bắt được 5 lỗi thật.'
  );
  process.exit(1);
}
console.log('\n✅ Mọi bảng dịch phủ đủ nguồn của chúng.');
