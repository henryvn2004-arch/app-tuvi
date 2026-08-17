// scripts/video-lib.mjs
// ============================================================
// Nạp phần TypeScript của khâu dựng clip (`lib/video/**` và những gì nó kéo
// theo) vào một script Node thuần, rồi chạy cổng 2.
//
// 🪤 VÌ SAO PHẢI HOOK `Module._resolveFilename`:
// `tsc` KHÔNG viết lại alias `@/` khi emit — bài học đã ghi trong CLAUDE.md và
// vấp thật một lần ở harness khác. `viral-loop.ts` import `@/lib/llm/complete`
// nên bản JS emit ra vẫn `require('@/lib/llm/complete')`, Node không hiểu.
// Cách sửa ĐÚNG là hook lúc chạy, KHÔNG phải sửa alias trong file nguồn: sửa
// nguồn thì mã chạy ở đây khác mã chạy trên web, tức lại đẻ ra hai bản.
//
// Cây phụ thuộc đo được là 10 file (viral-loop → gate-audience → llm/complete →
// config/appConfig → agent/companion · agent/providers/gemini → contract/v1 →
// api/tool-helpers). `tsc` tự đi theo import nên chỉ cần nêu điểm vào.
// ============================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);

/** Điểm vào luôn cần, bất kể loại clip. */
const CORE = ['lib/video/script-spec.ts', 'lib/video/gate-machine.ts', 'lib/video/viral-loop.ts'];

/**
 * Biên dịch cây TS rồi trả về hàm nạp module.
 *
 * 🪤 Vì sao SINH tsconfig tạm chứ không nêu file trên dòng lệnh như hai script
 * trước vẫn làm: nêu file thì phải kèm `--ignoreConfig` (nếu không tsc báo
 * TS5112), mà `--ignoreConfig` cũng vứt luôn `paths` — nên `@/lib/llm/complete`
 * hỏng NGAY TỪ LÚC BIÊN DỊCH, không đợi tới lúc chạy. Đã vấp thật ở lượt đầu.
 * Một tsconfig riêng giải cả hai: không TS5112, và có `paths`.
 *
 * ⚠️ `rootDir` trỏ GỐC REPO là cố ý: không khai thì `tsc` tự suy thư mục chung
 * của mọi file (kể cả file nó kéo theo), nên chỉ cần thêm một import mới là bố
 * cục đầu ra đổi và mọi đường dẫn `load()` gãy im lặng. Neo cứng thì đầu ra
 * luôn soi gương repo: `<outDir>/lib/video/...`.
 *
 * @param {string[]} extra đường dẫn TS thêm, tương đối gốc repo.
 */
export function compileVideoLib(extra = []) {
  const outDir = mkdtempSync(join(tmpdir(), 'videolib-'));
  const cfg = join(outDir, 'tsconfig.json');
  writeFileSync(
    cfg,
    JSON.stringify({
      compilerOptions: {
        // ⚠️ `node16` chứ không phải `node`: TS 6 đã khai tử `moduleResolution:
        // node10` VÀ `baseUrl` (TS5107 / TS5101, lỗi chứ không phải cảnh báo).
        // Nên `paths` ở đây ghi ĐƯỜNG TUYỆT ĐỐI — không có `baseUrl` thì nó
        // neo theo vị trí tsconfig, mà tsconfig này nằm trong thư mục tạm.
        module: 'node16',
        moduleResolution: 'node16',
        target: 'es2022',
        lib: ['es2022', 'dom'],
        skipLibCheck: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        paths: { '@/*': [join(ROOT, '*')] },
        rootDir: ROOT,
        outDir,
      },
      files: [...CORE, ...extra].map((f) => join(ROOT, f)),
    })
  );
  execFileSync(join(ROOT, 'node_modules/.bin/tsc'), ['-p', cfg], { stdio: 'inherit' });

  // Đặt SAU khi emit xong, và chỉ bắt đúng tiền tố `@/` — đừng đụng lượt
  // resolve nào khác, node_modules vẫn phải đi đường của nó.
  const truoc = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (typeof request === 'string' && request.startsWith('@/')) {
      return truoc.call(this, join(outDir, request.slice(2)), ...rest);
    }
    return truoc.call(this, request, ...rest);
  };

  return { outDir, load: (rel) => require_(join(outDir, 'lib', rel)) };
}

/**
 * Chạy cổng 2 (hội đồng người xem) và in kết quả.
 *
 * Trả về `{ pass, spec }` — `spec` có thể là BẢN ĐÃ VIẾT LẠI, nên phía gọi
 * PHẢI dùng giá trị trả về cho các bước sau (giọng đọc, render). Dùng lại bản
 * cũ thì vòng lặp chạy cho vui: clip vẫn mang đúng câu chữ vừa bị chấm trượt.
 *
 * @param {(spec: object, opts: object) => Promise<object>} runViralLoop
 * @param {object} spec
 * @param {{ skip?: boolean, gate?: object, maxRounds?: number }} opts
 */
export async function chayCong2(runViralLoop, spec, opts = {}) {
  if (opts.skip) {
    console.log('\n── CỔNG 2 · BỎ QUA (--no-audience) ──────────');
    console.log('   ⚠️ Clip chưa qua hội đồng người xem — chỉ dùng để duyệt bố cục.');
    return { pass: true, spec };
  }

  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error('\n── CỔNG 2 · hội đồng người xem ──────────────');
    console.error('   ❌ Thiếu GEMINI_API_KEY và ANTHROPIC_API_KEY trong môi trường chạy.');
    console.error('   Đặt một trong hai, hoặc --no-audience để bỏ qua CÓ CHỦ ĐÍCH.');
    return { pass: false, spec };
  }

  console.log('\n── CỔNG 2 · hội đồng người xem ──────────────');
  const kq = await runViralLoop(spec, { skipAudience: false, gate: opts.gate });

  for (const r of kq.rounds) {
    const a = r.audience;
    if (!a) {
      // Vòng này trượt ngay cổng 1 ⇒ chưa tốn lượt LLM nào cho hội đồng.
      const block = r.machine.issues.filter((i) => i.level === 'block');
      console.log(`   vòng ${r.round}: cổng 1 trượt — ${block.map((i) => i.code).join(', ')}`);
      continue;
    }
    // In CẢ HAI mẫu số: phần chấm điểm là `trong tệp`, còn `/7` giữ lại để đối
    // chiếu — nhìn hai số cạnh nhau là biết ngay clip trượt vì DỞ hay vì CHỦ ĐỀ
    // hẹp, hai chuyện cần hai cách sửa khác hẳn nhau.
    console.log(
      `   vòng ${r.round}: ${a.pass ? '✅ QUA' : '❌ TRƯỢT'}  ·  xem hết ${a.soXemHetTrongTep}/${a.soTrongTep} trong tệp` +
        ` (thô ${Math.round(a.tiLeXemHetDuBao * 100)}%) · lưu ${Math.round(a.tiLeMuonLuu * 100)}% · gửi ${Math.round(a.tiLeMuonChiaSe * 100)}%` +
        (a.giayRoiRungNang != null ? ` · rơi nặng ở ${a.giayRoiRungNang}s` : '')
    );
    for (const i of a.issues) console.log(`      [${i.level}] ${i.code}: ${i.message}`);
    if (r.rewriteHint) console.log(`      → viết lại theo: ${r.rewriteHint}`);
  }

  if (!kq.pass) {
    // ⚠️ Nói ĐÚNG số vòng đã chạy, đừng nói "đã thử viết lại" cho oai. Lượt
    // chạy thật đầu tiên dừng sau 1/3 vòng vì bản viết lại bị từ chối, mà câu
    // báo cũ khiến người đọc tưởng đã thử đủ ba lần.
    console.error(`\n❌ Dừng: kịch bản không qua cổng 2 sau ${kq.rounds.length} vòng.`);
    if (opts.maxRounds && kq.rounds.length < opts.maxRounds) {
      console.error(
        `   (dừng sớm — trần là ${opts.maxRounds} vòng. Bản viết lại bị từ chối; lý do in ở dòng [viral-loop] phía trên.)`
      );
    }
    for (const i of kq.remainingIssues) console.error(`   [${i.level}] ${i.code}: ${i.message}`);
    console.error('   Sửa kịch bản trong lib/video/sources/ rồi chạy lại.');
    return { pass: false, spec: kq.spec };
  }

  // Chỉ báo khi THỰC SỰ có sửa — im lặng đổi chữ rồi render là kiểu thay đổi
  // không ai biết mà rà.
  if (kq.rounds.length > 1 || kq.spec.hook !== spec.hook) {
    console.log(`   ✏️  kịch bản ĐÃ ĐƯỢC VIẾT LẠI qua ${kq.rounds.length} vòng.`);
    console.log(`      hook: "${kq.spec.hook}"`);
  }
  return { pass: true, spec: kq.spec };
}
