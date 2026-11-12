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
      include: [
        join(ROOT, 'lib/engine/*.ts'),
        join(ROOT, 'lib/contract/*.ts'),
        join(ROOT, 'lib/i18n/long-server.ts'),
      ],
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
const PL = await import('./lib/engine/past-life.js');
const PLTen = await import('./lib/engine/past-life-ten.js');
const NN = await import('./lib/engine/nghe-nghiep.js');
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
// Past-life (W30f-3): chức phận lối cổ qua resolveCareerBase — lưới rộng để chạm hầu hết khoá bảng nghề.
out.pl = [];
for (let i = 0; i < 700; i++) {
  const c = PL.resolveCareerBase(ls(mk()));
  out.pl.push({ desc: c.desc, source: c.source, tierLabel: c.tierLabel, tierBreakdown: c.tierBreakdown, notes: c.notes, ma: c.ma });
}
// Tầng nhánh nghề (W30f-4): chonNhanh theo từng lĩnh vực × bậc trên lá số mẫu.
out.nn = [];
for (let i = 0; i < 150; i++) {
  const l = ls(mk());
  for (const dom of ['vo', 'van', 'quyen', 'thuong', 'y', 'nghe', 'tu']) {
    const tier = ['thap', 'giua', 'kha', 'cao'][rnd(4)];
    const r = NN.chonNhanh(l, dom, tier, 3);
    out.nn.push({ dom, goiY: r.goiY.map((g) => ({ id: g.id, ten: g.ten, chat: g.chat, viec: g.viec, vi: g.vi, viMa: g.viMa })), chatNguoi: r.chatNguoi, neTranh: r.neTranh });
  }
}
// Chân Dung Tiền Kiếp (W30f-7): payload THẬT của computePastLife (era + occupation) — khoá suy từ trường sẵn có.
out.tk = [];
for (let i = 0; i < 1200; i++) {
  const b = mk();
  const p = PL.computePastLife(ls(b), b.gender);
  const o = p.occupation;
  const srv = {};
  for (const l of ['en', 'ja', 'ko', 'zh-tw', 'zh-cn']) srv[l] = { n: PLTen.tenTheoNgonNgu(l, p.characterMa), t: PLTen.danhXungTheoNgonNgu(l, o.titleMa) };
  out.tk.push({
    era: { id: p.era.id, label: p.era.label, ageLabel: p.era.ageLabel },
    o: { star: o.star, tier: o.tier, tierLabel: o.tierLabel, desc: o.desc, source: o.source },
    name: p.characterName, nameMa: p.characterMa, title: o.title, titleMa: o.titleMa, gender: p.gender,
    srv, blockJa: PLTen.khoiTenTheoNgonNgu('ja', [p]), blockVi: PLTen.khoiTenTheoNgonNgu('vi', [p]),
  });
}
// Câu ý nghĩa từng cung (W30f-5): MỌI chuỗi trong ls.cachCucTungCung trên lưới lá số rộng (đủ tuổi để Tuần/Triệt bật + tắt).
out.cc = [];
for (let i = 0; i < 700; i++) {
  const l = ls(mk());
  for (const v of Object.values(l.cachCucTungCung || {})) for (const x of v) out.cc.push(x);
  // ls.cachCuc[] (cách cục có tên): hiện ten + moTa ở Chân Dung / Luận Giải
  for (const c of l.cachCuc || []) for (const x of [c.ten, c.moTa]) if (x) out.cc.push(x);
}
// GOLDEN: chữ Việt do engine TRƯỚC lô D dựng bằng chuỗi viết tay (scripts/fixtures/engine-ma-golden.json) — engine nay
// dựng từ bảng khuôn và phải giữ từng byte (chữ còn vào prompt LLM + portrait_cache).
const { readFileSync } = await import('node:fs');
const gold = JSON.parse(readFileSync(process.env.GOLDEN, 'utf8'));
out.golden = {
  pl: gold.pl.map((g) => { const c = PL.resolveCareerBase(ls(g.b)); return { desc: c.desc, source: c.source, tierLabel: c.tierLabel, tierBreakdown: c.tierBreakdown, notes: c.notes }; }),
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

  // ── Past-life (W30f-3): nghe.*/pair.* desc|src · tier.* · bd (khoản chấm) · note.* — khoá DỰNG Y NHƯ cong-so.js
  {
    const S = nguon('past-life');
    const sai = [];
    const lech = [];
    const dung = new Set();
    const chk = (k, vi) => {
      dung.add(k);
      if (!S.has(k)) sai.push(k);
      else if (S.get(k) !== vi) lech.push(k);
    };
    const tpl = (k, v) =>
      (S.get(k) || '').replace(/\{(\w+)\}/g, (m, n) => (v[n] !== undefined ? v[n] : m));
    for (const c of kq.pl) {
      chk(c.ma.desc, c.desc);
      chk(c.ma.src, c.source);
      chk(c.ma.tier, c.tierLabel);
      if (c.ma.bd.length !== c.tierBreakdown.length) sai.push('bd không song song tierBreakdown');
      c.ma.bd.forEach((m, i) => {
        const dau = (m.n > 0 ? '+' : '') + m.n + ' ';
        let vi;
        if (m.k === 'chinh') {
          vi = dau + (m.ten || S.get('bd.chinhtinh')) + (m.sang ? ' ' + m.sang : '');
          dung.add('bd.chinhtinh');
        } else if (m.k === 'hoa')
          (dung.add('bd.hoa'), (vi = dau + tpl('bd.hoa', { ten: m.ten, hoa: m.hoa })));
        else if (m.k === 'cach') (dung.add('bd.cach'), (vi = dau + tpl('bd.cach', { ten: m.ten })));
        else if (m.k === 'tuan-giai' || m.k === 'tuan-pha')
          (dung.add('bd.' + m.k), (vi = dau + S.get('bd.' + m.k)));
        else if (m.k === 'cat' || m.k === 'sat') vi = dau + m.ds.join('/');
        else sai.push('khoản chấm lạ ' + m.k);
        if (vi !== c.tierBreakdown[i]) lech.push(`bd[${m.k}] "${vi}" ≠ "${c.tierBreakdown[i]}"`);
      });
      if (c.ma.notes.length !== c.notes.length) sai.push('notes không song song');
      c.ma.notes.forEach((m, i) => {
        dung.add(m.k);
        if (!S.has(m.k)) return sai.push(m.k);
        const dau = m.ds ? m.ds.join('/') : tpl('bd.hoa', { ten: m.ten, hoa: m.k.split('.')[2] });
        if (dau + ' → ' + S.get(m.k) !== c.notes[i]) lech.push(`note ${m.k}`);
      });
    }
    bao(
      sai.length === 0,
      `past-life — ${dung.size} khoá chạm bởi ${kq.pl.length} lá số mẫu, không trỏ trượt: ${[...new Set(sai)].slice(0, 5).join(', ') || 'không'}`
    );
    bao(
      lech.length === 0,
      `past-life — chữ Việt trong payload == nguồn dịch: ${[...new Set(lech)].slice(0, 3).join(' | ') || 'khớp'}`
    );
    const nDesc = [...dung].filter((k) => k.endsWith('.desc')).length;
    bao(
      nDesc >= 90,
      `past-life — mẫu chạm ${nDesc}/153 câu chức phận (cần ≥90) + ${dung.size} khoá tổng`
    );
  }

  // ── Tầng nhánh nghề (W30f-4): nhanh.<lĩnh vực>.<id>.* · truc.<id>.* — khoá DỰNG Y NHƯ cong-so.js
  {
    const S = nguon('nghe-nghiep');
    const sai = [];
    const lech = [];
    const dung = new Set();
    const chk = (k, vi) => {
      dung.add(k);
      if (!S.has(k)) sai.push(k);
      else if (S.get(k) !== vi) lech.push(k);
    };
    for (const g of kq.nn)
      for (const n of g.goiY) {
        const p = `nhanh.${g.dom}.${n.id}`;
        chk(p + '.ten', n.ten);
        chk(p + '.chat', n.chat);
        n.viec.forEach((v, i) => chk(`${p}.viec.${i}`, v));
        if (!n.viMa || n.viMa.length !== n.vi.length) sai.push(p + ': viMa không song song vi');
        else
          n.viMa.forEach((id, i) => {
            chk(`truc.${id}.ten`, S.get(`truc.${id}.ten`));
            chk(`truc.${id}.cao`, S.get(`truc.${id}.cao`));
            if (`${S.get(`truc.${id}.ten`)} — ${S.get(`truc.${id}.cao`)}` !== n.vi[i])
              lech.push(`vi[${id}]`);
          });
      }
    for (const g of kq.nn) {
      for (const t of g.chatNguoi) {
        chk(`truc.${t.id}.ten`, t.ten);
        chk(`truc.${t.id}.cao`, t.cao);
      }
      for (const t of g.neTranh) {
        chk(`truc.${t.id}.ten`, t.ten);
        chk(`truc.${t.id}.thap`, t.thap);
      }
    }
    bao(
      sai.length === 0,
      `nghe-nghiep — ${dung.size} khoá chạm bởi ${kq.nn.length} lượt chọn nhánh, không trỏ trượt: ${[...new Set(sai)].slice(0, 5).join(', ') || 'không'}`
    );
    bao(
      lech.length === 0,
      `nghe-nghiep — chữ Việt trong payload == nguồn dịch: ${[...new Set(lech)].slice(0, 5).join(', ') || 'khớp'}`
    );
    const nNhanh = [...dung].filter((k) => k.endsWith('.ten') && k.startsWith('nhanh.')).length;
    bao(nNhanh >= 25, `nghe-nghiep — mẫu chạm ${nNhanh}/34 nhánh (cần ≥25)`);
  }

  // ── Chân Dung Tiền Kiếp (W30f-7): chạy CHÍNH public/tools-shared/past-life-t.js trên payload thật, I18n giả trả câu nguồn kèm \u0001.
  {
    const vm = await import('node:vm');
    const S = nguon('past-life');
    const I18n = {
      locale: 'xx',
      loadLong() {},
      long: (ns, k, vi) => (ns === 'past-life' && S.has(k) ? '\u0001' + S.get(k) : vi),
    };
    const ctx = vm.createContext({ window: { I18n } });
    ctx.I18n = I18n;
    vm.runInContext(readFileSync(join(ROOT, 'public/tools-shared/past-life-t.js'), 'utf8'), ctx);
    const T = ctx.window.TuviPastLife;
    const sai = [];
    const era = new Set();
    for (const g of kq.tk) {
      era.add(g.era.id);
      const dat = T.eraLine(g.era);
      if (dat !== '\u0001' + g.era.label + ' · \u0001' + g.era.ageLabel)
        sai.push('era ' + g.era.id);
      if (T.eraLabel(g.era) !== '\u0001' + g.era.label) sai.push('eraLabel ' + g.era.id);
      for (const [f, hs] of [
        ['tier', 'tierLabel'],
        ['desc', 'desc'],
        ['source', 'source'],
      ]) {
        const r = T[f](g.o);
        if (r !== '\u0001' + g.o[hs]) sai.push(`${f} ${g.o.star}/${g.o.tier}`);
      }
    }
    bao(
      sai.length === 0,
      `past-life-t — ${kq.tk.length} payload tiền kiếp thật, mọi era/bậc/chức phận/trích dẫn tra trúng khoá VÀ chữ Việt payload == nguồn dịch (so cả dấu marker): ${[...new Set(sai)].slice(0, 4).join(', ') || 'không hụt'}`
    );
    bao(era.size === 5, `past-life-t — mẫu chạm đủ ${era.size}/5 bối cảnh`);
    // vi byte-giống: helper không đổi chữ khi locale vi
    const cv = vm.createContext({
      window: { I18n: { locale: 'vi', long: (n, k, vi) => vi + '!' } },
    });
    vm.runInContext(readFileSync(join(ROOT, 'public/tools-shared/past-life-t.js'), 'utf8'), cv);
    const g0 = kq.tk[0];
    bao(
      cv.window.TuviPastLife.desc(g0.o) === g0.o.desc + '!',
      'past-life-t — đường tra đi qua I18n.long (vi dùng I18n gốc trả nguyên)'
    );
  }

  // ── Tên nhân vật + danh xưng (W30f-8): mã `characterMa`/`titleMa` của engine THẬT phải trỏ đúng khoá nguồn, chữ Việt ghép lại
  // bằng khuôn == `characterName`/`title` của engine, và CLIENT (past-life-ten.js) ra cùng chữ với SERVER (lib/engine/past-life-ten.ts)
  // trên bản dịch THẬT của cả 5 ngôn ngữ.
  {
    const vm = await import('node:vm');
    const S = nguon('past-life-ten');
    const nap = (file, ctx) => vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), ctx);
    const sai = [];
    // (1) mã ↔ nguồn: chỉ số bảng + chữ Việt
    const hit = { ho: new Set(), ten: new Set(), t: new Set(), s: new Set(), era: new Set() };
    for (const g of kq.tk) {
      const m = g.nameMa;
      const [ho, ...ten] = g.name.split(' ');
      if (S.get('name.' + m.ho) !== ho) sai.push('ho ' + m.ho);
      if (S.get('name.' + m.ten) !== ten.join(' ')) sai.push('ten ' + m.ten);
      if (m.ho.split('.')[0] !== g.era.id) sai.push('era≠nền ' + m.ho);
      if (!m.ten.startsWith(g.era.id + '.' + g.gender + '.')) sai.push('giới ' + m.ten);
      hit.ho.add(m.ho);
      hit.ten.add(m.ten);
      hit.era.add(g.era.id);
      const tm = g.titleMa;
      const base = S.get('title.' + tm.t);
      if (base === undefined) sai.push('title ' + tm.t);
      else {
        const suf = tm.s ? S.get('suf.' + tm.s) : null;
        if (tm.s && suf === undefined) sai.push('suf ' + tm.s);
        else if ((suf ? base + ' ' + suf : base) !== g.title) sai.push('ghép ' + tm.t + '|' + tm.s);
      }
      hit.t.add(tm.t);
      if (tm.s) hit.s.add(tm.s);
    }
    // (2) helper client với I18n giả (marker \u0001 chứng minh ĐÃ tra khoá) ⇒ chữ ghép == chữ Việt engine
    const fake = {
      locale: 'xx',
      loadLong() {},
      long: (ns, k, vi) => (ns === 'past-life-ten' && S.has(k) ? '\u0001' + S.get(k) : vi),
    };
    const cx = vm.createContext({ window: { I18n: fake } });
    nap('public/tools-shared/past-life-ten.js', cx);
    const H = cx.window.TuviPastLifeTen;
    for (const g of kq.tk) {
      const n = H.name(g.name, g.nameMa);
      const t = H.title(g.title, g.titleMa);
      if (!n.includes('\u0001') || n.replace(/\u0001/g, '') !== g.name)
        sai.push('client name ' + g.name);
      if (!t.includes('\u0001') || t.replace(/\u0001/g, '') !== g.title)
        sai.push('client title ' + g.title);
    }
    // thiếu mã (payload cũ/mẫu tĩnh) ⇒ nguyên chữ Việt
    if (H.name('A B', undefined) !== 'A B' || H.title('X', null) !== 'X')
      sai.push('thiếu mã không lùi về chữ Việt');
    // vi: không đụng chữ
    const cvi = vm.createContext({ window: { I18n: { locale: 'vi', long: () => 'SAI' } } });
    nap('public/tools-shared/past-life-ten.js', cvi);
    if (cvi.window.TuviPastLifeTen.name(kq.tk[0].name, kq.tk[0].nameMa) !== kq.tk[0].name)
      sai.push('vi đổi tên');
    if (cvi.window.TuviPastLifeTen.title(kq.tk[0].title, kq.tk[0].titleMa) !== kq.tk[0].title)
      sai.push('vi đổi danh xưng');
    bao(
      sai.length === 0,
      'past-life-ten — ' +
        kq.tk.length +
        ' nhân vật thật: mã trỏ đúng khoá nguồn, chữ Việt ghép lại == engine, client lùi đúng: ' +
        ([...new Set(sai)].slice(0, 4).join(', ') || 'khớp')
    );
    bao(hit.era.size === 5, 'past-life-ten — mẫu chạm đủ ' + hit.era.size + '/5 nền');
    bao(
      hit.ho.size >= 40 && hit.ten.size >= 40,
      'past-life-ten — mẫu chạm ' +
        hit.ho.size +
        ' họ · ' +
        hit.ten.size +
        ' tên (cần ≥40 mỗi loại)'
    );
    bao(
      hit.t.size >= 100 && hit.s.size >= 15,
      'past-life-ten — mẫu chạm ' +
        hit.t.size +
        ' danh xưng gốc (cần ≥100) · ' +
        hit.s.size +
        ' hậu tố (cần ≥15)'
    );
    // (3) bản dịch THẬT: client == server, đủ chữ, không còn dấu Việt
    const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
    for (const l of ['en', 'ja', 'ko', 'zh-tw', 'zh-cn']) {
      const d = {};
      vm.runInNewContext(
        readFileSync(
          join(ROOT, 'public/tools-shared/i18n-long/' + l + '/past-life-ten.js'),
          'utf8'
        ),
        {
          window: { I18n: { defineLong: (n, x) => Object.assign(d, x) } },
        }
      );
      const c2 = vm.createContext({
        window: { I18n: { locale: l, loadLong() {}, long: (ns, k, vi) => (d[k] ? d[k].t : vi) } },
      });
      nap('public/tools-shared/past-life-ten.js', c2);
      const T2 = c2.window.TuviPastLifeTen;
      const lech = [];
      for (const g of kq.tk) {
        const n = T2.name(g.name, g.nameMa);
        const t = T2.title(g.title, g.titleMa);
        const sv = g.srv[l];
        if (sv.n !== n)
          lech.push('tên ' + l + ' ' + g.name + ': client "' + n + '" ≠ server "' + sv.n + '"');
        if (sv.t !== t)
          lech.push(
            'danh xưng ' + l + ' ' + g.title + ': client "' + t + '" ≠ server "' + sv.t + '"'
          );
        if (VI.test(n) || VI.test(t)) lech.push('còn dấu Việt ' + l + ' ' + n + ' / ' + t);
        if (n === g.name && l !== 'en') lech.push('tên không đổi ' + l + ' ' + g.name);
        if (t === g.title) lech.push('danh xưng không đổi ' + l + ' ' + g.title);
      }
      bao(
        lech.length === 0,
        'past-life-ten ' +
          l +
          ' — client == server trên ' +
          kq.tk.length +
          ' nhân vật, đủ chữ, không dấu Việt: ' +
          (lech.slice(0, 2).join(' | ') || 'khớp')
      );
    }
    // (4) khối prompt: vi rỗng (byte-giống); ja nêu đúng tên + danh xưng đã dịch
    const g0 = kq.tk[0];
    bao(
      kq.tk.every((g) => g.blockVi === ''),
      'past-life-ten — prompt khách vi KHÔNG đổi một byte (khối rỗng)'
    );
    bao(
      kq.tk.every(
        (g) => g.blockJa.includes(g.name + ' → ' + g.srv.ja.n) && g.blockJa.includes(g.srv.ja.t)
      ),
      'past-life-ten — khối prompt ja chứa đúng tên + danh xưng hiển thị (' +
        g0.name +
        ' → ' +
        g0.srv.ja.n +
        ')'
    );
  }

  // ── Câu ý nghĩa cung (W30f-5): chạy CHÍNH hàm tra của trang (public/tools-shared/cach-cuc.js) với I18n giả trả câu Việt
  // nguồn (kèm dấu \u0001 để biết ĐÃ tra trúng khoá) ⇒ mọi câu engine thật sinh ra phải có khoá `s.<fnv>`/`t.<mẫu>` trong nguồn.
  {
    const vm = await import('node:vm');
    const S = nguon('cach-cuc');
    const I18n = {
      locale: 'xx',
      loadLong() {},
      long: (ns, k, vi) => (ns === 'cach-cuc' && S.has(k) ? '\u0001' + S.get(k) : vi),
    };
    const ctx = vm.createContext({ window: { I18n } });
    ctx.I18n = I18n;
    vm.runInContext(readFileSync(join(ROOT, 'public/tools-shared/cach-cuc.js'), 'utf8'), ctx);
    const cc = ctx.window.TuviCachCuc;
    const duy = [...new Set(kq.cc)];
    // câu có tiền tố `[Sao, Sao] …` ⇒ mong đợi từng tên đã tra `n.<tên>` và câu đã tra `s.<fnv>` (đều kèm dấu \u0001)
    const mongDoi = (x) => {
      const m = /^\[([^\]]+)\] ([\s\S]+)$/.exec(x);
      return m && !S.has(`s.${cc.fnv(x)}`)
        ? '[' +
            m[1]
              .split(', ')
              .map((n) => '\u0001' + n)
              .join(', ') +
            '] \u0001' +
            m[2]
        : '\u0001' + x;
    };
    const thieu = duy.filter((x) => cc.t(x) !== mongDoi(x));
    bao(
      thieu.length === 0,
      `cach-cuc — ${duy.length} câu khác nhau từ ${kq.cc.length} lượt (700 lá số), không câu nào hụt khoá: ${thieu.slice(0, 3).join(' | ') || 'không'}`
    );
    bao(
      duy.length >= 250,
      `cach-cuc — mẫu chạm ${duy.length} câu khác nhau (cần ≥250; nguồn có 1.116 câu + 8 mẫu Tuần/Triệt)`
    );
    const mauTrung = new Set(
      duy.filter((x) => /^(Tuần|Triệt)/.test(x)).map((x) => x.replace(/\(.+?\)/, '({dc})'))
    );
    bao(mauTrung.size >= 6, `cach-cuc — chạm ${mauTrung.size}/8 biến thể mẫu Tuần/Triệt (cần ≥6)`);
    // đối chứng: hash của trang == hash của nguồn (fnvVi) — nếu lệch thì mọi câu ở trên đã hụt, nhưng nói thẳng cho dễ chẩn đoán
    const { fnvVi } = await import('../lib/i18n/long.mjs');
    bao(
      cc.fnv('Tử Vi sáng: thân hình đẫy đà, thông minh, phúc thọ') ===
        fnvVi('Tử Vi sáng: thân hình đẫy đà, thông minh, phúc thọ'),
      'cach-cuc — fnv của trang == fnvVi của nguồn'
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
    {
      const lechP = [];
      gold.pl.forEach((g, i) => {
        const n = kq.golden.pl[i];
        for (const f of ['desc', 'source', 'tierLabel', 'tierBreakdown', 'notes'])
          if (JSON.stringify(g[f]) !== JSON.stringify(n[f])) lechP.push(`#${i}.${f}`);
      });
      bao(
        gold.pl.length >= 50 && lechP.length === 0,
        `golden past-life — ${gold.pl.length} lá số (mọi sao × bậc + mọi dạng khoản chấm/sắc thái) byte-giống engine cũ: ${lechP.slice(0, 5).join(', ') || 'khớp'}`
      );
    }
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
