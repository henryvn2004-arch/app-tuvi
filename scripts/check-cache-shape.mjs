#!/usr/bin/env node
/**
 * scripts/check-cache-shape.mjs — canh đúng MỘT lớp lỗi, và nó đã cắn HAI lần.
 *
 * `portrait_cache` khoá theo LÁ SỐ, không theo shape. Nên đổi cấu trúc payload
 * mà quên bump `SHAPE` thì mọi dòng cache cũ vẫn được trả về nguyên trạng, mãi
 * mãi — và trang ẩn khối im lặng, KHÔNG lỗi nào bắn ra:
 *   · `day-con` (#465): khung mới lên prod, người chạy hôm trước mở lại thấy 4
 *     khối biến mất. Phải đo tay `portrait_cache` mới tìm ra.
 *   · `huong-nghiep-tre` (#475): lượt vá tuổi thêm `laTreEm` + `xungHo` + lứa
 *     `vaodoi` mà quên bump ⇒ đo được trên prod một dòng `tuoi=43` vẫn mang
 *     `lop:"lon"` của bản kẹp tuổi cũ. Chính chú thích ngay trên `SHAPE` đã
 *     dặn phải bump — đọc mà vẫn quên, nên lời dặn KHÔNG đủ, cần máy canh.
 *
 * CÁCH CANH: băm danh sách KHOÁ của payload trả tiền (2 tầng) rồi so với vân
 * tay khai ngay cạnh `SHAPE` trong route. Đổi cấu trúc ⇒ băm đổi ⇒ đỏ, buộc
 * người sửa phải bump `SHAPE` và cập nhật vân tay CÙNG LÚC.
 *
 * ⚠️ Băm theo KHOÁ, cố ý không băm giá trị: sửa CHỮ thì không phải bump (dòng
 * cache cũ trả chữ cũ — khó chịu, không vỡ), chỉ đổi/thêm/bớt KHOÁ mới vỡ.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();

if (!existsSync(join(ROOT, 'tuvi-engine/dist/lunar/convert.js'))) {
  console.error(
    '❌ Chưa có `tuvi-engine/dist` — bộ dò này gọi engine THẬT nên cần bản build.\n' +
      '   Chạy: cd tuvi-engine && npm ci && npm run build'
  );
  process.exit(1);
}

/**
 * Lá số mẫu CỐ ĐỊNH. Đổi lá số mẫu là đổi vân tay — đừng sửa chỉ vì thấy đỏ.
 *   `TRE`   trẻ em (2 tool viết cho cha mẹ đọc về con)
 *   `LON_N` / `LON_U` người trưởng thành, nam / nữ
 */
const TRE = { day: 9, month: 5, year: 2015, hourBranch: 1, gender: 'nam', isLunar: false };
const LON_N = { day: 3, month: 6, year: 1998, hourBranch: 1, gender: 'nam', isLunar: false };
const LON_U = { day: 22, month: 12, year: 1990, hourBranch: 7, gender: 'nu', isLunar: false };

/**
 * `coShape: false` = tool CHƯA cắm cơ chế `SHAPE`. Vẫn chốt vân tay: đổi payload
 * ⇒ đỏ, và câu hướng dẫn bảo cắm cơ chế TRƯỚC khi đổi — đó đúng là thời điểm
 * duy nhất còn kịp. Cắm sẵn `SHAPE` cho cả 5 tool ngay bây giờ thì phải đụng
 * đường trả tiền của chúng để đổi lấy một lợi ích chưa tới hạn.
 */
const TOOLS = [
  {
    id: 'huong-nghiep-tre',
    route: 'app/api/huong-nghiep-tre/route.ts',
    mod: 'lib/engine/huong-nghiep-tre.js',
    coShape: true,
    goi: `m.hoSoDayDu(m.computeHuongNghiepTre(ls(${JSON.stringify(TRE)}), 'nam', 'chon-duong'))`,
  },
  {
    id: 'day-con',
    route: 'app/api/day-con/route.ts',
    mod: 'lib/engine/day-con.js',
    coShape: true,
    // Route tự ghép payload từ `meta()`; băm trên hồ sơ engine — nguồn của nó.
    goi: `m.computeDayCon(ls(${JSON.stringify(TRE)}), 'nam', 'chon-duong')`,
  },
  {
    id: 'nguoi-khac',
    route: 'app/api/nguoi-khac/route.ts',
    mod: 'lib/engine/nguoi-khac.js',
    coShape: false,
    goi: `m.computeNguoiKhac(ls(${JSON.stringify(LON_N)}), 'nam', 'sep', null, 2026)`,
  },
  {
    id: 'nhan-mach',
    route: 'app/api/nhan-mach/route.ts',
    mod: 'lib/engine/nhan-mach.js',
    coShape: false,
    goi:
      `m.computeNhanMach([` +
      `{ten:'A',vai:'sep',ls:ls(${JSON.stringify(LON_N)}),gioiTinh:'nam'},` +
      `{ten:'B',vai:'dong-nghiep',ls:ls(${JSON.stringify(LON_U)}),gioiTinh:'nu'}` +
      `], null, 2026)`,
  },
  {
    id: 'duyen-no-tien-kiep',
    route: 'app/api/duyen-no-tien-kiep/route.ts',
    mod: 'lib/engine/past-life-bond.js',
    coShape: false,
    goi: `m.computePastLifeBond(ls(${JSON.stringify(LON_N)}), 'nam', ls(${JSON.stringify(LON_U)}), 'nu')`,
  },
  {
    id: 'chan-dung-tien-kiep',
    route: 'app/api/chan-dung-tien-kiep/route.ts',
    mod: 'lib/engine/past-life.js',
    coShape: false,
    goi: `m.computePastLife(ls(${JSON.stringify(LON_N)}), 'nam')`,
  },
  {
    id: 'chan-dung-vo-chong',
    route: 'app/api/chan-dung-vo-chong/route.ts',
    mod: 'lib/engine/portrait.js',
    coShape: false,
    goi: `m.computeSpouseMorphology(ls(${JSON.stringify(LON_N)}), 'nam')`,
  },
];

/** Danh sách khoá tới 2 tầng, sắp ổn định. Mảng lấy phần tử ĐẦU làm đại diện. */
function khoa(o, sau = 2, tien = '') {
  if (sau === 0 || o === null || typeof o !== 'object') return [];
  if (Array.isArray(o)) return o.length ? khoa(o[0], sau - 1, tien + '[]') : [tien + '[]:rỗng'];
  return Object.keys(o)
    .sort()
    .flatMap((k) => [tien + '.' + k, ...khoa(o[k], sau - 1, tien + '.' + k)]);
}

const out = mkdtempSync(join(tmpdir(), 'tvmb-shape-'));
let loi = 0;
try {
  writeFileSync(
    join(out, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        outDir: join(out, 'build'),
        rootDir: ROOT,
        skipLibCheck: true,
        esModuleInterop: true,
        noEmitOnError: false,
      },
      include: [join(ROOT, 'lib/engine/*.ts'), join(ROOT, 'lib/contract/*.ts')],
    })
  );
  try {
    execFileSync('npx', ['tsc', '-p', join(out, 'tsconfig.json')], { stdio: 'pipe' });
  } catch {
    /* tsc kêu về type dưới moduleResolution này — vẫn emit đủ. `npm run
       typecheck` mới là chỗ gác type. */
  }
  const build = join(out, 'build');
  writeFileSync(join(build, 'package.json'), '{"type":"module"}');
  execFileSync('ln', ['-sfn', join(ROOT, 'node_modules'), join(build, 'node_modules')]);
  execFileSync('ln', ['-sfn', join(ROOT, 'tuvi-engine'), join(build, 'tuvi-engine')]);
  // ⚠️ Đổi alias `@/` TRƯỚC rồi mới thêm đuôi `.js`. Alias của Next không tồn
  // tại ngoài bản dựng Next; đổi sau thì đường dẫn vừa sinh ra không có đuôi và
  // node ném ERR_MODULE_NOT_FOUND — đọc thành "engine hỏng" thay vì "harness
  // thiếu bước".
  const dsFile = execFileSync('bash', ['-c', `find ${build} -name '*.js'`], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  for (const f of dsFile) {
    const sau = f.slice(build.length + 1).split('/').length - 1;
    const len = '../'.repeat(sau) || './';
    const s = readFileSync(f, 'utf8');
    const t = s
      .replace(/(['"])@\/(?=[a-zA-Z])/g, `$1${len}`)
      // tsc không thêm đuôi cho import tương đối. Chỉ thêm khi CHƯA có đuôi —
      // `.json` mà bị nối `.js` là gãy, và thông điệp lỗi trỏ vào engine chứ
      // không trỏ vào harness.
      .replace(/(from\s+['"])(\.[^'"]*)(['"])/g, (_, a, p, b) => {
        // `.json` cần import attribute trong ESM; tsc không phát ra nó.
        if (p.endsWith('.json')) return a + p + b + " with { type: 'json' }";
        return /\.[a-z]+$/.test(p) ? a + p + b : a + p + '.js' + b;
      });
    if (t !== s) writeFileSync(f, t);
  }

  const kich = `
const out = {};
const { computeLaso } = await import('./lib/engine/laso.js');
const ls = (b) => {
  const r = computeLaso(b);
  if (!r.ok || !r.ls) throw new Error('không lập được lá số mẫu: ' + JSON.stringify(b));
  return r.ls;
};
${TOOLS.map(
  (t) => `
{
  const m = await import('./${t.mod}');
  out[${JSON.stringify(t.id)}] = ${t.goi};
}`
).join('\n')}
console.log('__KQ__' + JSON.stringify(out));
`;
  writeFileSync(join(build, 'shape.mjs'), kich);
  const raw = execFileSync('node', [join(build, 'shape.mjs')], {
    encoding: 'utf8',
    maxBuffer: 64e6,
  });
  const kq = JSON.parse(raw.slice(raw.indexOf('__KQ__') + 6));

  console.log('Vân tay CẤU TRÚC payload trả tiền:\n');
  for (const t of TOOLS) {
    const p = kq[t.id];
    const ks = khoa(p);
    // Đọc ra cấu trúc rỗng rồi báo xanh còn tệ hơn báo đỏ.
    if (!p || ks.length < 20) {
      console.error(
        `❌ ${t.id} — chỉ đọc được ${ks.length} khoá (chờ ≥ 20).\n` +
          '   Engine đổi chữ ký hàm ⇒ PHẢI sửa bộ dò, đừng bỏ qua.'
      );
      loi++;
      continue;
    }
    const van = createHash('sha256').update(ks.join('\n')).digest('hex').slice(0, 12);

    const src = readFileSync(join(ROOT, t.route), 'utf8');
    const m = /SHAPE_FINGERPRINT\s*=\s*'([0-9a-f]{12})'/.exec(src);
    const s = /const SHAPE = (\d+)/.exec(src);

    if (!m) {
      console.error(
        `❌ ${t.id} — thiếu \`SHAPE_FINGERPRINT\` trong ${t.route}.\n` +
          `   Khai:  const SHAPE_FINGERPRINT = '${van}';`
      );
      loi++;
      continue;
    }
    if (t.coShape && !s) {
      console.error(`❌ ${t.id} — có khai vân tay mà mất \`const SHAPE\` trong ${t.route}.`);
      loi++;
      continue;
    }

    if (m[1] !== van) {
      // Hai lối thoát KHÁC HẲN nhau — nói đúng việc phải làm, đừng nói chung chung.
      console.error(
        `❌ ${t.id} — CẤU TRÚC payload đã đổi (${ks.length} khoá).\n` +
          `   vân tay khai: ${m[1]}   ·   thực tế: ${van}\n` +
          (t.coShape
            ? `   ⇒ BUMP \`SHAPE\` (đang ${s[1]} → ${Number(s[1]) + 1}) rồi cập nhật\n` +
              `      SHAPE_FINGERPRINT = '${van}'  trong ${t.route}.`
            : `   ⚠️ Tool này CHƯA CÓ cơ chế \`SHAPE\` ⇒ dòng cache cũ sẽ trả cấu trúc\n` +
              `      CŨ vĩnh viễn. Phải cắm cơ chế TRƯỚC khi đổi payload:\n` +
              `        · \`const SHAPE = 1\` + \`shapeStale()\` (chép từ app/api/day-con/route.ts)\n` +
              `        · truyền cờ \`overwrite\` cho \`putCachedPortrait\` khi dựng lại\n` +
              `        · ⛔ TUYỆT ĐỐI không nhét SHAPE vào \`lasoKey\` — đổi khoá là mồ côi\n` +
              `          cả cache lẫn \`userOwnsLaso\`, người đã trả tiền bị tính lại\n` +
              `      rồi mới cập nhật SHAPE_FINGERPRINT = '${van}'.`) +
          '\n   Bỏ qua là hỏng IM LẶNG — trang ẩn khối, không lỗi nào bắn ra (#465, #475).'
      );
      loi++;
      continue;
    }
    console.log(
      `  ✅ ${t.id.padEnd(20)} — ${t.coShape ? `SHAPE ${s[1]}` : 'chưa có SHAPE'}` +
        `, ${ks.length} khoá, vân tay ${van}`
    );
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (loi) process.exit(1);
console.log('\n✅ Vân tay cấu trúc khớp SHAPE đang khai.');
