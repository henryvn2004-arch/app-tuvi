// lib/i18n/long.mjs — VĂN DÀI theo chỉ số (W16a): hào từ, lời khuyên quẻ, luận Thể–Dụng, nghĩa sao/thần.
// Node thuần; dùng chung cho scripts/i18n/long.mjs (next/save/status) và scripts/check-i18nlong.mjs.
//
// Vì sao KHÔNG nhét vào i18n/<locale>.json: 613 chuỗi (~46,8k ký tự) × 5 ngôn ngữ sẽ kéo vào MỌI trang nạp
// `js.shellui`. Bản dịch ở file riêng theo locale, mỗi file một namespace (= một module nguồn):
//   public/tools-shared/i18n-long/<locale>/<ns>.js   →  I18n.defineLong('<ns>', { "<khoá>": { t, h } })
// Khoá = CHỈ SỐ ổn định trong bảng nguồn (số quẻ King Wen, số hào, `ma` quan hệ, số quái, tên sao/thần),
// KHÔNG phải chuỗi Việt. `h` = hashVi(câu Việt nguồn) như từ điển — nguồn đổi thì biết bản dịch cũ.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { hashVi } from './core.mjs';

export const LONG_NS = ['kinh-dich-hao', 'kinh-dich', 'mai-hoa', 'ky-mon'];
/** Module client nạp từng namespace (check:i18nlong soi: có gọi `loadLong('<ns>')`). */
export const LONG_MODULE = {
  'kinh-dich-hao': 'public/tools-shared/kinh-dich-hao.js',
  'kinh-dich': 'public/tools-shared/kinh-dich.js',
  'mai-hoa': 'public/tools-shared/mai-hoa.js',
  'ky-mon': 'public/tools-shared/ky-mon.js',
};
/**
 * Ngôn ngữ ĐÃ dịch đủ văn dài ⇒ bộ dò đòi đủ 100% mục. Worker nào xong locale của mình thì thêm vào đây
 * (`zh-cn` đi theo `zh-tw`: thêm cả hai). Locale chưa liệt kê: file có thì vẫn bị soi hash/mồ côi, không đòi đủ.
 */
export const LONG_COMPLETE = ['ja'];

export const longDir = (root) => path.join(root, 'public/tools-shared/i18n-long');
export const longFile = (root, locale, ns) => path.join(longDir(root), locale, `${ns}.js`);

// ── Nguồn ────────────────────────────────────────────────────────────────────
/**
 * Mọi câu Việt cần dịch, theo thứ tự ổn định: { ns: [{ k, vi, ctx? }] }.
 * `ctx` chỉ để người dịch có ngữ cảnh (tên quẻ, câu Hán) — KHÔNG vào hash.
 */
export function loadSources(root) {
  const require = createRequire(path.join(root, 'package.json'));
  const out = {};

  // 1) hào từ: lời quẻ (qv) + 6 hào (hv) + Dụng Cửu/Lục — phần Hán KHÔNG dịch
  const { HAO } = require(path.join(root, LONG_MODULE['kinh-dich-hao']));
  const { QUE } = require(path.join(root, LONG_MODULE['kinh-dich']));
  const hao = [];
  HAO.forEach((d, i) => {
    const kw = i + 1;
    const ten = QUE[i]?.n || `#${kw}`;
    hao.push({
      k: `hao.${kw}.q`,
      vi: d.qv,
      ctx: `Quẻ ${kw} ${ten} ${QUE[i]?.zh || ''} · lời quẻ · Hán: ${d.q}`,
    });
    (d.hv || []).forEach((v, j) =>
      hao.push({
        k: `hao.${kw}.${j + 1}`,
        vi: v,
        ctx: `Quẻ ${kw} ${ten} · hào ${j + 1} · Hán: ${d.h[j]}`,
      })
    );
    if (d.dung)
      hao.push({
        k: `hao.${kw}.dung`,
        vi: d.dung.v,
        ctx: `Quẻ ${kw} ${ten} · dụng · Hán: ${d.dung.h}`,
      });
  });
  out['kinh-dich-hao'] = hao;

  // 2) lời khuyên `g` + nghĩa ngắn `m` của 64 quẻ
  const kd = [];
  QUE.forEach((q, i) => {
    kd.push({ k: `que.${i + 1}.m`, vi: q.m, ctx: `Quẻ ${i + 1} ${q.n} ${q.zh} · nghĩa ngắn` });
    kd.push({ k: `que.${i + 1}.g`, vi: q.g, ctx: `Quẻ ${i + 1} ${q.n} ${q.zh} · lời khuyên` });
  });
  out['kinh-dich'] = kd;

  // 3) Mai Hoa: nghĩa bát quái + 5 quan hệ Thể–Dụng (liệt kê bằng chính hàm quanHe, không chép tay)
  const MH = require(path.join(root, LONG_MODULE['mai-hoa']));
  const mh = [];
  MH.BAT_QUAI.forEach((q) =>
    mh.push({
      k: `quai.${q.so}.nghia`,
      vi: q.nghia,
      ctx: `Bát quái ${q.so} ${q.n} ${q.zh} · ${q.tuong}`,
    })
  );
  const hanh = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
  const qh = new Map();
  for (const a of hanh)
    for (const b of hanh)
      if (!qh.has(MH.quanHe(a, b).ma)) qh.set(MH.quanHe(a, b).ma, MH.quanHe(a, b));
  for (const [ma, r] of [...qh].sort((x, y) => x[0].localeCompare(y[0]))) {
    mh.push({ k: `qh.${ma}.tomTat`, vi: r.tomTat, ctx: `Quan hệ Thể–Dụng "${r.ten}" · tóm tắt` });
    mh.push({ k: `qh.${ma}.luan`, vi: r.luan, ctx: `Quan hệ Thể–Dụng "${r.ten}" · luận` });
  }
  out['mai-hoa'] = mh;

  // 4) Kỳ Môn: nghĩa 9 sao + 8 thần (đọc bảng TS bằng regex — CI chạy Node 20, không nạp .ts được)
  const ts = fs.readFileSync(path.join(root, 'lib/qimen/terms.ts'), 'utf8');
  const km = [];
  for (const [bang, tien] of [
    ['SAO', 'sao'],
    ['THAN', 'than'],
  ]) {
    const m = new RegExp(`export const ${bang}:[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(ts);
    if (!m) throw new Error(`lib/qimen/terms.ts: không thấy bảng ${bang}`);
    const re = /ten:\s*'([^']+)'[^}]*?nghia:\s*'([^']+)'/g;
    let e;
    while ((e = re.exec(m[1])))
      km.push({
        k: `${tien}.${e[1]}`,
        vi: e[2],
        ctx: `Kỳ Môn ${bang === 'SAO' ? 'sao' : 'thần'} ${e[1]}`,
      });
  }
  out['ky-mon'] = km;
  return out;
}

// ── File bản dịch ────────────────────────────────────────────────────────────
/** Đọc một file bản dịch bằng cách CHẠY nó trong sandbox có I18n giả. Không có file ⇒ null. */
export function readLong(root, locale, ns) {
  const f = longFile(root, locale, ns);
  if (!fs.existsSync(f)) return null;
  let got = null;
  const sandbox = {
    window: {
      I18n: {
        defineLong(n, data) {
          if (n !== ns)
            throw new Error(`${f}: defineLong('${n}') nhưng file thuộc namespace '${ns}'`);
          got = data;
        },
      },
    },
  };
  vm.runInNewContext(fs.readFileSync(f, 'utf8'), sandbox, { filename: f, timeout: 2000 });
  if (!got) throw new Error(`${f}: không gọi I18n.defineLong`);
  return got;
}

/** Ghi file theo thứ tự nguồn (mục không còn trong nguồn đứng cuối — để bộ dò bắt mồ côi, không im lặng xoá). */
export function writeLong(root, locale, ns, data, order) {
  const keys = Object.keys(data);
  const pos = new Map(order.map((k, i) => [k, i]));
  keys.sort(
    (a, b) =>
      (pos.has(a) ? pos.get(a) : 1e9) - (pos.has(b) ? pos.get(b) : 1e9) || a.localeCompare(b)
  );
  const lines = keys.map(
    (k) => `${JSON.stringify(k)}:${JSON.stringify({ t: data[k].t, h: data[k].h })}`
  );
  const body =
    `// SINH bởi npm run i18n:long (docs/i18n/QUY-UOC.md "Văn dài") — KHÔNG sửa tay. ns=${ns} locale=${locale}\n` +
    `window.I18n&&window.I18n.defineLong(${JSON.stringify(ns)},{\n${lines.join(',\n')}\n});\n`;
  const f = longFile(root, locale, ns);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}

/** 'fresh' | 'stale' | 'missing' cho một mục nguồn. */
export function longState(entry, dict) {
  const e = dict && Object.prototype.hasOwnProperty.call(dict, entry.k) ? dict[entry.k] : null;
  if (!e || typeof e.t !== 'string' || !e.t) return 'missing';
  return e.h === hashVi(entry.vi) ? 'fresh' : 'stale';
}
