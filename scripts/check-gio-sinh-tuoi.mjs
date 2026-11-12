#!/usr/bin/env node
/**
 * scripts/check-gio-sinh-tuoi.mjs — canh bộ khảo sát "Xác Định Giờ Sinh" không
 * hỏi trẻ em những thứ chỉ người lớn mới có dữ liệu mà trả lời.
 *
 * ── LỖI NÓ SINH RA ĐỂ CHẶN (đo được, không phải lo hão) ──────
 * Bản đầu hỏi CÙNG MỘT BỘ cho mọi tuổi. Đo trên chính engine: một đứa **8 tuổi**
 * vẫn bị hỏi đủ, 100% số ca —
 *   · *"Về công việc, đường nào giống anh/chị nhất?"*
 *   · *"Về tiền bạc, mô tả nào đúng nhất?"*
 *   · *"Nhìn lại cả đời, khoảng bao nhiêu tuổi thì cuộc sống ĐỔI HƯỚNG rõ nhất?"*
 *     kèm đáp án *"Khoảng 25 tuổi"* cho một đứa lớp 3.
 * Và ngược lại **0 câu đại vận** cho tới 23 tuổi, nên chỗ giữ cứng cho tầng đời
 * sống bị chính câu mốc-đổi-vận vô nghĩa chiếm.
 *
 * ── VÌ SAO CẦN MÁY CANH, LỜI DẶN KHÔNG ĐỦ ────────────────────
 * Lỗi này IM LẶNG VỚI NGƯỜI SỬA MÃ: `tsc` xanh, không lỗi nào bắn ra, trang vẫn
 * chạy trọn — chỉ có phụ huynh đang trả 50 Lượng mới thấy. Ba đường tái phát:
 *   1. thêm cung vào `CUNG_HOI` mà quên khai `TUOI_CO_DU_LIEU`;
 *   2. sửa `tieuDeCung`/`hintCung` mà quên nhánh trẻ em;
 *   3. thêm/bớt sao trong `MENH_TRE_EM` · `PHUC_DUC_TRE_EM` · `PHU_MAU_TRE_EM`
 *      — thiếu một khoá thì `nhanCung` trả chuỗi RỖNG, `buildQuestionBank` lặng
 *      lẽ loại option đó, và nếu còn dưới 2 option thì loại luôn CẢ CÂU HỎI.
 *
 * ⚠️ Bộ dò gọi ENGINE THẬT (không đọc mã nguồn bằng regex) nên nó đo đúng thứ
 * người dùng nhận. Đổi lá số mẫu là đổi kết quả — đừng sửa chỉ vì thấy đỏ.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();

if (!existsSync(join(ROOT, 'tuvi-engine/dist/lunar/convert.js'))) {
  console.error(
    '❌ Chưa có `tuvi-engine/dist` — bộ dò này gọi engine THẬT nên cần bản build.\n' +
      '   Chạy: cd tuvi-engine && npm ci && npm run build'
  );
  process.exit(1);
}

/** 14 chính tinh — bảng nhãn nào của trẻ em cũng phải phủ ĐỦ, không thừa. */
const SAO14 = [
  'Tử Vi',
  'Thiên Cơ',
  'Thái Dương',
  'Vũ Khúc',
  'Thiên Đồng',
  'Liêm Trinh',
  'Thiên Phủ',
  'Thái Âm',
  'Tham Lang',
  'Cự Môn',
  'Thiên Tướng',
  'Thiên Lương',
  'Thất Sát',
  'Phá Quân',
];

/**
 * Từ vựng CHỈ có nghĩa với người đã đi làm. Lọt vào bộ của trẻ em là lỗi.
 *
 * 🪤 Hai lần dựng bộ dò này tôi đều tự bắt oan mình, ghi lại để người sau khỏi
 * mất công: (a) `"anh/chị"` — hint cung Phụ Mẫu CỐ Ý xưng "anh/chị" vì nó nói
 * VỚI phụ huynh về chính họ; (b) `"vị thế"` — *"bố mẹ có vị thế"* là tả cha mẹ,
 * hoàn toàn hợp lệ. Danh sách dưới đây đã bỏ cả hai. Bộ dò kêu oan thì người ta
 * tắt nó đi.
 */
const TU_NGUOI_LON = [
  'nhảy việc',
  'tích luỹ',
  'cơm áo',
  'tiền bạc',
  'cầm quyền',
  'tay nghề',
  'dưới trướng',
  'của cải',
  'hậu trường',
  'giao tế',
  'thuyết phục',
  'bày mưu',
  'sự nghiệp',
  'đứng mũi',
  'trợ thủ',
  'làm phó',
];
/** Chủ đề cấm — dò trên TIÊU ĐỀ câu hỏi. */
const CHU_DE_NGUOI_LON = ['công việc', 'tiền bạc', 'ĐỔI HƯỚNG'];

/** Ngày sinh mẫu CỐ ĐỊNH. Trẻ em / vị thành niên / người lớn (đối chứng). */
const MAU = [
  {
    ten: 'bé 9 tuổi',
    b: { day: 9, month: 5, year: 2017, gender: 'nam', isLunar: false },
    tre: true,
  },
  {
    ten: 'bé 4 tuổi',
    b: { day: 22, month: 11, year: 2022, gender: 'nu', isLunar: false },
    tre: true,
  },
  {
    ten: 'thiếu niên 15',
    b: { day: 3, month: 6, year: 2011, gender: 'nam', isLunar: false },
    tre: false,
  },
  {
    ten: 'người lớn 43',
    b: { day: 9, month: 5, year: 1984, gender: 'nam', isLunar: false },
    tre: false,
  },
];

const out = mkdtempSync(join(tmpdir(), 'tvmb-giosinh-'));
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
      include: [join(ROOT, 'lib/engine/**/*.ts'), join(ROOT, 'lib/contract/*.ts')],
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
  // ⚠️ Đổi alias `@/` TRƯỚC rồi mới thêm đuôi `.js` — đảo thứ tự thì đường dẫn
  // vừa sinh ra không có đuôi và node ném ERR_MODULE_NOT_FOUND, đọc thành
  // "engine hỏng" thay vì "harness thiếu bước".
  const dsFile = execFileSync('bash', ['-c', `find ${build} -name '*.js'`], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  for (const f of dsFile) {
    const sau = f.slice(build.length + 1).split('/').length - 1;
    const len = '../'.repeat(sau) || './';
    const s = readFileSync(f, 'utf8');
    const t = s
      .replace(/(['"])@\/(?=[a-zA-Z])/g, `$1${len}`)
      .replace(/(from\s+['"])(\.[^'"]*)(['"])/g, (_, a, p, b) => {
        if (p.endsWith('.json')) return a + p + b + " with { type: 'json' }";
        return /\.[a-z]+$/.test(p) ? a + p + b : a + p + '.js' + b;
      });
    if (t !== s) writeFileSync(f, t);
  }

  const kich = `
const { computeLaso } = await import('./lib/engine/laso.js');
const G = await import('./lib/engine/gio-sinh.js');
const D = await import('./lib/engine/data/gio-sinh-dauhieu.js');
const out = { bang: {}, mau: [] };
for (const k of ['MENH_TRE_EM', 'PHUC_DUC_TRE_EM', 'PHU_MAU_TRE_EM'])
  out.bang[k] = Object.keys(D[k] || {});
for (const m of ${JSON.stringify(MAU)}) {
  const set = G.buildHypotheses(m.b);
  if (!set) { out.mau.push({ ten: m.ten, loi: 'không lập được lá số' }); continue; }
  const bank = G.buildQuestionBank(set);
  out.mau.push({
    ten: m.ten, tre: m.tre, tuoi: set.tuoi,
    // W30f: mã tra additive + nhãn đáp án câu cung (để đối chiếu với bản dựng ở client)
    cung: bank.filter((q) => q.kind === 'cung').map((q) => ({
      id: q.id, cung: q.cung, treEm: G.publicQuestion(q).treEm, options: q.options.map((o) => ({ value: o.value, label: o.label })),
    })),
    ma: (() => {
      const cq = bank.filter((q) => q.kind === 'cung');
      const ans = cq.map((q) => ({ id: q.id, value: q.options[0].value }));
      const kq = G.scoreHours(set, bank, ans);
      return kq.tatCa.flatMap((r) => [['khop', r.khop, r.khopMa], ['lech', r.lech, r.lechMa]].map(([t, v, ma]) => ({ t, v, ma })));
    })(),
    cau: bank.map((q) => ({
      id: q.id, tieuDe: q.title, goiY: q.hint || '',
      nhan: q.options.map((o) => o.label),
    })),
  });
}
console.log('__KQ__' + JSON.stringify(out));
`;
  writeFileSync(join(build, 'gs.mjs'), kich);
  const raw = execFileSync('node', [join(build, 'gs.mjs')], { encoding: 'utf8', maxBuffer: 64e6 });
  const kq = JSON.parse(raw.slice(raw.indexOf('__KQ__') + 6));

  // ── 1) Ba bảng nhãn trẻ em phải phủ ĐÚNG 14 chính tinh ────
  for (const [ten, ks] of Object.entries(kq.bang)) {
    const thieu = SAO14.filter((s) => !ks.includes(s));
    const thua = ks.filter((k) => !SAO14.includes(k));
    if (thieu.length || thua.length) {
      console.error(
        `❌ ${ten} — thiếu [${thieu.join(', ')}] · thừa [${thua.join(', ')}]\n` +
          '   Thiếu một sao ⇒ nhãn RỖNG ⇒ option bị loại IM LẶNG, và nếu còn\n' +
          '   dưới 2 option thì mất luôn cả câu hỏi. Phải phủ đủ 14 chính tinh.'
      );
      loi++;
    }
  }

  // ── 2) Bộ câu của từng lá số mẫu ──────────────────────────
  let doiChungNguoiLon = 0;
  for (const m of kq.mau) {
    if (m.loi) {
      console.error(`❌ ${m.ten} — ${m.loi}`);
      loi++;
      continue;
    }
    const n = m.cau.length;
    // Sàn 4 câu (`SAN_CAU_HOI`) chỉ có nghĩa nếu ngân hàng luôn đủ để với tới.
    if (n < 4) {
      console.error(`❌ ${m.ten} (tuổi mụ ${m.tuoi}) — ngân hàng chỉ ${n} câu, sàn cần 4.`);
      loi++;
    }
    if (m.tre) {
      for (const q of m.cau) {
        for (const c of CHU_DE_NGUOI_LON)
          if (q.tieuDe.includes(c)) {
            console.error(
              `❌ ${m.ten} — câu \`${q.id}\` hỏi chủ đề người lớn ("${c}"):\n   ${q.tieuDe}\n` +
                '   ⇒ khai tuổi tối thiểu cho cung đó trong `TUOI_CO_DU_LIEU`.'
            );
            loi++;
            break;
          }
        if (!/cháu/i.test(q.tieuDe)) {
          console.error(
            `❌ ${m.ten} — câu \`${q.id}\` không xưng "cháu":\n   ${q.tieuDe}\n` +
              '   ⇒ bổ sung nhánh trẻ em trong `tieuDeCung`.'
          );
          loi++;
        }
        for (const nh of q.nhan)
          for (const t of TU_NGUOI_LON)
            if (nh.includes(t)) {
              console.error(
                `❌ ${m.ten} — NHÃN ĐÁP ÁN của \`${q.id}\` dùng từ người lớn ("${t}"):\n   ${nh}\n` +
                  '   ⇒ bảng nhãn trẻ em của cung đó chưa được đấu vào `nhanCung`.'
              );
              loi++;
              break;
            }
      }
    } else {
      // ĐỐI CHỨNG: người lớn PHẢI còn hỏi mấy chủ đề đó, nếu không thì bộ dò
      // đang xanh vì tool hỏng chứ không phải vì tool đúng.
      for (const q of m.cau)
        for (const c of CHU_DE_NGUOI_LON) if (q.tieuDe.includes(c)) doiChungNguoiLon++;
    }
    console.log(`  ${m.ten} (tuổi mụ ${m.tuoi}): ${n} câu — ${m.cau.map((q) => q.id).join(', ')}`);
  }
  if (doiChungNguoiLon === 0) {
    console.error(
      '❌ ĐỐI CHỨNG hỏng: KHÔNG lá số người lớn nào còn được hỏi về công việc /\n' +
        '   tiền bạc / mốc đổi hướng. Gate tuổi đang chặn nhầm cả người lớn —\n' +
        '   hoặc bộ dò đo trượt. Xanh kiểu này là xanh oan.'
    );
    loi++;
  }

  // ── 3) W30f — nhãn đáp án câu CUNG dựng ở client (ns `gio-sinh`) phải TRÙNG engine, từng byte ───────────
  // Chạy chính hàm `_gsCungLabel` trong trang với I18n giả trả CHỮ VIỆT NGUỒN theo khoá ⇒ nếu khoá/ghép/dấu nối sai
  // một chỗ thì nhãn dựng ≠ `label` của engine. Hụt khoá bị `null` (lùi về chữ Việt) nên PHẢI đòi "đã dựng được".
  const vm = await import('node:vm');
  const { loadSources } = await import('../lib/i18n/long.mjs');
  const viTheoKhoa = new Map(loadSources(ROOT)['gio-sinh'].map((e) => [e.k, e.vi]));
  const page = readFileSync(join(ROOT, 'public/app-gio-sinh.html'), 'utf8');
  const a = page.indexOf('function _gsLong(');
  const b = page.indexOf('// Tên sao của engine');
  if (a < 0 || b < a) {
    console.error('❌ app-gio-sinh.html: không thấy khối _gsLong…_gsEvid (đổi tên/di chuyển?)');
    loi++;
  } else {
    const ctx = vm.createContext({
      window: {
        I18n: {
          locale: 'xx',
          long: (ns, k, vi) => (ns === 'gio-sinh' && viTheoKhoa.has(k) ? viTheoKhoa.get(k) : vi),
        },
      },
      _tvmbG: (kind, v) => v,
    });
    ctx.I18n = ctx.window.I18n;
    vm.runInContext(page.slice(a, b), ctx);
    let dung = 0;
    for (const m of kq.mau) {
      if (m.loi) continue;
      for (const q of m.cung)
        for (const o of q.options) {
          const t =
            ctx.window.I18n &&
            vm.runInContext(
              `_gsCungLabel(${JSON.stringify(q.cung)}, ${JSON.stringify(o.value)}, ${!!q.treEm})`,
              ctx
            );
          // Mệnh NGƯỜI LỚN đọc `MENH_ROLE` (ns past-life) — chưa/ngoài ns này: null (giữ chữ Việt) là hợp lệ.
          if (q.cung === 'Mệnh' && !q.treEm && o.value !== 'VCD') continue;
          if (t !== o.label) {
            console.error(
              `❌ ${m.ten} — nhãn dựng ở client ≠ engine (${q.id} = ${o.value}):\n   engine: ${o.label}\n   client: ${t}`
            );
            loi++;
          } else dung++;
        }
      // mã bằng chứng: song song khop/lech, câu cung ⇒ {id,value[,t]}, và nhãn engine là TIỀN TỐ của nhãn dựng
      for (const { t, v, ma } of m.ma) {
        if (!Array.isArray(ma) || ma.length !== v.length) {
          console.error(
            `❌ ${m.ten} — ${t}Ma không song song với ${t} (${ma && ma.length} ≠ ${v.length})`
          );
          loi++;
          continue;
        }
        v.forEach((x, i) => {
          if (!ma[i]) return; // câu không phải cung: giữ chữ Việt
          const cung = String(ma[i].id).slice(2);
          const full = vm.runInContext(
            `_gsCungLabel(${JSON.stringify(cung)}, ${JSON.stringify(ma[i].value)}, ${ma[i].t === 1})`,
            ctx
          );
          if (full == null) return; // Mệnh người lớn — như trên
          const pre = cung + ': ';
          const got = x.startsWith(pre) ? x.slice(pre.length) : null;
          const ok =
            got !== null &&
            (got === full || (got.endsWith('…') && full.startsWith(got.slice(0, -1))));
          if (!ok) {
            console.error(
              `❌ ${m.ten} — dòng bằng chứng ${t}[${i}] không khớp mã:\n   ${x}\n   dựng từ mã: ${pre}${full}`
            );
            loi++;
          } else dung++;
        });
      }
    }
    if (dung < 100) {
      console.error(
        `❌ ĐỐI CHỨNG hỏng: chỉ ${dung} nhãn/dòng bằng chứng được so (cần ≥100) — bộ dò đang đo ít quá.`
      );
      loi++;
    } else console.log(`  nhãn đáp án + bằng chứng dựng ở client trùng engine: ${dung} mục`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (loi) {
  console.error(`\n❌ ${loi} lỗi.`);
  process.exit(1);
}
console.log('\n✅ Bộ khảo sát Giờ Sinh khớp tuổi: trẻ em 0 câu người lớn, đối chứng còn nguyên.');
