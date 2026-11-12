#!/usr/bin/env node
/**
 * scripts/check-engine-ma.mjs — MÃ TRA của văn engine kết quả (W30d: Dạy Con–đánh giá · Duyên Nợ Tiền Kiếp ·
 * Sổ Nhân Mạch) phải trỏ ĐÚNG khoá nguồn của `lib/i18n/long.mjs`.
 *
 * Vì sao cần: client dịch tại chỗ vẽ bằng `I18n.long(ns, khoá-dựng-từ-mã, câuViệt)` (docs/i18n/QUY-UOC.md
 * "Văn engine server"). Route/engine thôi gửi `ma`/`id` (hay đổi dạng mã) thì client LẶNG LẼ lùi về chữ Việt ở
 * /ja… — không bộ dò nào khác thấy. Bộ dò này chạy ENGINE THẬT trên lá số mẫu rồi dựng đúng các khoá mà trang sẽ
 * tra, và đòi: (1) khoá có trong nguồn; (2) câu Việt trong payload == câu Việt của nguồn dịch (bản dịch thay đúng
 * thứ nó đã dịch); (3) mẫu đủ rộng để chạm hầu hết mã (không kiểm một danh sách cụt rồi báo xanh).
 * Cùng khuôn dựng engine với check-cache-shape.mjs.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
if (!existsSync(join(ROOT, 'tuvi-engine/dist/lunar/convert.js'))) {
  console.error('❌ Chưa có `tuvi-engine/dist` — chạy: cd tuvi-engine && npm ci && npm run build');
  process.exit(1);
}

const out = mkdtempSync(join(tmpdir(), 'tvmb-engma-'));
let loi = 0;
const bao = (ok, msg) => {
  if (ok) console.log('  ✅ ' + msg);
  else {
    console.error('❌ ' + msg);
    loi++;
  }
};
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
    /* tsc kêu về type dưới moduleResolution này — vẫn emit đủ; `npm run typecheck` mới gác type. */
  }
  const build = join(out, 'build');
  writeFileSync(join(build, 'package.json'), '{"type":"module"}');
  execFileSync('ln', ['-sfn', join(ROOT, 'node_modules'), join(build, 'node_modules')]);
  execFileSync('ln', ['-sfn', join(ROOT, 'tuvi-engine'), join(build, 'tuvi-engine')]);
  // `@/` đổi TRƯỚC rồi mới thêm đuôi `.js` (xem check-cache-shape.mjs).
  const files = execFileSync(
    'bash',
    ['-c', `find ${build} -name '*.js' -not -path '*/node_modules/*'`],
    {
      encoding: 'utf8',
    }
  )
    .split('\n')
    .filter(Boolean);
  for (const f of files) {
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

  writeFileSync(
    join(build, 'ma.mjs'),
    `
const { computeLaso } = await import('./lib/engine/laso.js');
const bond = await import('./lib/engine/past-life-bond.js');
const nm = await import('./lib/engine/nhan-mach.js');
const dc = await import('./lib/engine/day-con-assess.js');
let seed = 20261112;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const mk = () => ({ day: 1 + rnd(28), month: 1 + rnd(12), year: 1940 + rnd(80), hourBranch: rnd(12), gender: rnd(2) ? 'nam' : 'nu', isLunar: false });
const ls = (b) => { const r = computeLaso(b); if (!r.ok || !r.ls) throw new Error('lá số mẫu'); return r.ls; };
const out = { bond: [], nm: [], truc: [], khieu: [] };
// Duyên nợ: lưới đủ rộng để chạm hầu hết mã (loại hiếm như phu-the/oan-gia/doi-dau cần nhiều cặp)
for (let i = 0; i < 1500; i++) {
  const A = mk(), B = mk();
  const b = bond.computePastLifeBond(ls(A), A.gender, ls(B), B.gender);
  out.bond.push({ kind: b.type.kind, label: b.type.label, gist: b.type.gist, signals: b.signals });
}
// Nhân mạch
const vai = ['sep', 'dong-nghiep', 'cap-duoi', 'doi-tac'];
for (let i = 0; i < 120; i++) {
  const k = 2 + rnd(5);
  const ppl = Array.from({ length: k }, mk).map((b, j) => ({ ten: 'P' + j, vai: vai[j % 4], ls: ls(b), gioiTinh: b.gender }));
  const p = nm.computeNhanMach(ppl, null, 2026);
  out.nm.push({ cap: p.cap, kieu: p.thanhVien.map((t) => ({ id: t.kieu.id, ten: t.kieu.ten })) });
}
// Dạy con (đánh giá)
for (let i = 0; i < 400; i++) {
  const a = dc.assessChild(ls(mk()));
  out.truc.push(a.truc.map((t) => ({ id: t.id, ten: t.ten, cauHoi: t.cauHoi, nghieng: t.nghieng, nhanThap: t.nhanThap, nhanCao: t.nhanCao, cuc: t.cuc, canND: t.canND })));
  out.khieu.push(a.khieu.map((k) => ({ id: k.id, ten: k.ten, motCau: k.motCau, dauHieu: k.dauHieu, chuY: k.chuY, oLop: k.oLop })));
}
// GOLDEN: chữ Việt do engine TRƯỚC lô D dựng bằng chuỗi viết tay (scripts/fixtures/engine-ma-golden.json) — engine nay
// dựng từ bảng khuôn và phải giữ từng byte (chữ còn vào prompt LLM + portrait_cache).
const { readFileSync } = await import('node:fs');
const gold = JSON.parse(readFileSync(process.env.GOLDEN, 'utf8'));
out.golden = {
  bond: gold.bond.map((g) => { const b = bond.computePastLifeBond(ls(g.A), g.A.gender, ls(g.B), g.B.gender); return { A: g.A, B: g.B, type: b.type, signals: b.signals.map((s) => [s.label, s.detail]) }; }),
  nm: (() => { const vai = ['sep', 'dong-nghiep', 'cap-duoi', 'doi-tac']; const p = nm.computeNhanMach(gold.nm.people.map((b, j) => ({ ten: 'P' + j, vai: vai[j], ls: ls(b), gioiTinh: b.gender })), null, 2026); return p.cap.map((c) => [c.a, c.b, c.loai, c.vi]); })(),
};
console.log('__KQ__' + JSON.stringify(out));
`
  );
  const GOLD = join(ROOT, 'scripts/fixtures/engine-ma-golden.json');
  const raw = execFileSync('node', [join(build, 'ma.mjs')], {
    encoding: 'utf8',
    maxBuffer: 256e6,
    env: { ...process.env, GOLDEN: GOLD },
  });
  const kq = JSON.parse(raw.slice(raw.indexOf('__KQ__') + 6));

  const { loadSources } = await import('../lib/i18n/long.mjs');
  const src = loadSources(ROOT);
  const nguon = (ns) => new Map(src[ns].map((e) => [e.k, e.vi]));

  console.log('Mã tra của văn engine kết quả (W30d) ↔ nguồn dịch:\n');

  // ── Duyên nợ: bond.<kind>.label|gist · sig.<nhóm> · sigd.<ma>
  {
    const S = nguon('duyen-no');
    const dung = new Set();
    const sai = [];
    const lech = [];
    for (const b of kq.bond) {
      for (const [f, vi] of [
        ['label', b.label],
        ['gist', b.gist],
      ]) {
        const k = `bond.${b.kind}.${f}`;
        dung.add(k);
        if (!S.has(k)) sai.push(k);
        else if (S.get(k) !== vi) lech.push(k);
      }
      for (const s of b.signals) {
        if (!s.ma) {
          sai.push('(thiếu ma) ' + s.label);
          continue;
        }
        const kl = `sig.${s.ma.split('.')[0]}`;
        const kd = `sigd.${s.ma}`;
        dung.add(kl).add(kd);
        if (!S.has(kl)) sai.push(kl);
        else if (S.get(kl) !== s.label) lech.push(kl);
        if (!S.has(kd)) sai.push(kd);
        else {
          // câu khuôn thế biến == chữ Việt engine trả (client thay {x} ở câu dịch bằng CHÍNH bien này)
          const tpl = S.get(kd).replace(/\{(\w+)\}/g, (m, n) =>
            s.bien && s.bien[n] !== undefined ? s.bien[n] : m
          );
          if (tpl !== s.detail) lech.push(kd);
          for (const t of S.get(kd).matchAll(/\{(\w+)\}/g))
            if (!s.bien || s.bien[t[1]] === undefined) sai.push(`${kd}: thiếu biến {${t[1]}}`);
        }
      }
    }
    bao(
      sai.length === 0,
      `duyen-no — ${dung.size} khoá chạm bởi ${kq.bond.length} cặp mẫu, không trỏ trượt: ${[...new Set(sai)].slice(0, 5).join(', ') || 'không'}`
    );
    bao(
      lech.length === 0,
      `duyen-no — chữ Việt trong payload == nguồn dịch: ${[...new Set(lech)].slice(0, 5).join(', ') || 'khớp'}`
    );
    // phủ: 7 loại duyên + ≥ 14/18 câu dấu hiệu + 5 nhãn (phu-the/oan-gia/doi-dau hiếm nhưng 1500 cặp chạm được)
    const kinds = new Set(kq.bond.map((b) => b.kind));
    const nSig = [...dung].filter((k) => k.startsWith('sigd.')).length;
    bao(
      kinds.size >= 6 && nSig >= 14,
      `duyen-no — mẫu phủ ${kinds.size}/7 loại duyên, ${nSig}/18 câu dấu hiệu (cần ≥6 · ≥14)`
    );
  }

  // ── Nhân mạch: cap.<loai> + kieu.<id>.ten
  {
    const S = nguon('nhan-mach');
    const sai = [];
    const lech = [];
    const loai = new Set();
    for (const g of kq.nm) {
      for (const c of g.cap) {
        loai.add(c.loai);
        if (!S.has(`cap.${c.loai}`)) sai.push(`cap.${c.loai}`);
        if (!c.kieuA || !c.kieuB || !c.bien) {
          sai.push('(thiếu kieuA/kieuB/bien) ' + c.loai);
          continue;
        }
        for (const id of [c.kieuA, c.kieuB])
          if (!S.has(`kieu.${id}.ten`)) sai.push(`kieu.${id}.ten`);
        const tpl = (S.get(`cap.${c.loai}`) || '').replace(/\{(\w+)\}/g, (m, n) =>
          c.bien[n] !== undefined ? c.bien[n] : m
        );
        if (tpl !== c.vi) lech.push(`cap.${c.loai}`);
      }
      for (const k of g.kieu) {
        if (!S.has(`kieu.${k.id}.ten`)) sai.push(`kieu.${k.id}.ten`);
        else if (S.get(`kieu.${k.id}.ten`) !== k.ten) lech.push(`kieu.${k.id}.ten`);
      }
    }
    bao(
      sai.length === 0,
      `nhan-mach — ${kq.nm.length} nhóm mẫu, không trỏ trượt: ${[...new Set(sai)].slice(0, 5).join(', ') || 'không'}`
    );
    bao(
      lech.length === 0,
      `nhan-mach — chữ Việt trong payload == nguồn dịch: ${[...new Set(lech)].slice(0, 5).join(', ') || 'khớp'}`
    );
    bao(
      loai.size === 2,
      `nhan-mach — mẫu chạm cả 2 loại cặp (giam-chan · bu-nhau): ${[...loai].join(' · ')}`
    );
  }

  // ── Dạy con (đánh giá): truc.<id>.<…> · khieu.<id>.<…> — khoá DỰNG Y NHƯ app-day-con.html
  {
    const S = nguon('day-con-assess');
    const sai = [];
    const lech = [];
    const dung = new Set();
    const chk = (k, vi) => {
      dung.add(k);
      if (!S.has(k)) sai.push(k);
      else if (S.get(k) !== vi) lech.push(k);
    };
    for (const ds of kq.truc)
      for (const t of ds) {
        chk(`truc.${t.id}.ten`, t.ten);
        chk(`truc.${t.id}.cauHoi`, t.cauHoi);
        chk(`truc.${t.id}.thap.nhan`, t.nhanThap);
        chk(`truc.${t.id}.cao.nhan`, t.nhanCao);
        if (t.cuc)
          for (const f of ['bieuHien', 'dayThe', 'docNham'])
            chk(`truc.${t.id}.${t.nghieng}.${f}`, t.cuc[f]);
        else if (t.canND)
          for (const f of ['bieuHien', 'dayThe']) chk(`truc.${t.id}.can.${f}`, t.canND[f]);
        else sai.push(`trục ${t.id}: không có cuc lẫn canND`);
      }
    for (const ds of kq.khieu)
      for (const k of ds) {
        for (const f of ['ten', 'motCau', 'chuY', 'oLop']) chk(`khieu.${k.id}.${f}`, k[f]);
        k.dauHieu.forEach((d, i) => chk(`khieu.${k.id}.dau.${i}`, d));
      }
    bao(
      sai.length === 0,
      `day-con-assess — ${dung.size} khoá chạm bởi ${kq.truc.length} lá số mẫu, không trỏ trượt: ${[...new Set(sai)].slice(0, 5).join(', ') || 'không'}`
    );
    bao(
      lech.length === 0,
      `day-con-assess — chữ Việt trong payload == nguồn dịch: ${[...new Set(lech)].slice(0, 5).join(', ') || 'khớp'}`
    );
    bao(
      dung.size >= 100,
      `day-con-assess — mẫu chạm ${dung.size}/124 khoá (cần ≥100: cả hai cực + ca nằm giữa của 5 trục, 8 chất)`
    );
  }

  // ── GOLDEN: chữ Việt byte-giống engine cũ (nguồn độc lập với bảng khuôn)
  {
    const gold = JSON.parse(
      readFileSync(join(ROOT, 'scripts/fixtures/engine-ma-golden.json'), 'utf8')
    );
    const lechB = [];
    gold.bond.forEach((g, i) => {
      const n = kq.golden.bond[i];
      const a = JSON.stringify([g.type, g.signals]);
      const b = JSON.stringify([n.type, n.signals]);
      if (a !== b) lechB.push(`cặp #${i}`);
    });
    bao(
      gold.bond.length >= 10 && lechB.length === 0,
      `golden duyen-no — ${gold.bond.length} cặp (22 dạng câu) byte-giống engine cũ: ${lechB.join(', ') || 'khớp'}`
    );
    bao(
      JSON.stringify(gold.nm.cap) === JSON.stringify(kq.golden.nm),
      `golden nhan-mach — ${gold.nm.cap.length} câu cặp byte-giống engine cũ`
    );
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
if (loi) {
  console.error(`\n✗ check:enginema — ${loi} lỗi.`);
  process.exit(1);
}
console.log('\n✓ check:enginema — mã tra trong payload khớp nguồn dịch.');
