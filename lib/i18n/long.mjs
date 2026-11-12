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

export const LONG_NS = [
  'kinh-dich-hao',
  'kinh-dich',
  'mai-hoa',
  'ky-mon',
  'than-so-hoc',
  'almanac',
  'tayphuong',
  'lucnham',
];
/** Module client nạp từng namespace (check:i18nlong soi: có gọi `loadLong('<ns>')`). */
export const LONG_MODULE = {
  'kinh-dich-hao': 'public/tools-shared/kinh-dich-hao.js',
  'kinh-dich': 'public/tools-shared/kinh-dich.js',
  'mai-hoa': 'public/tools-shared/mai-hoa.js',
  'ky-mon': 'public/tools-shared/ky-mon.js',
  'than-so-hoc': 'public/tools-shared/than-so-hoc.js',
  // VĂN ENGINE SERVER (W28): bảng do route trả chữ Việt + MÃ tra (`ma`, additive) — dịch ở chỗ VẼ của module.
  almanac: 'public/tools-shared/hoang-lich.js',
  tayphuong: 'public/tools-shared/ban-do-sao.js',
  // Lô E (W30e): Lục Nhâm vẽ ở module dùng chung (trang + rail shell).
  lucnham: 'public/tools-shared/dai-luc-nham.js',
};
/** Namespace là văn ENGINE SERVER (bảng TS) — check:i18nlong soi thêm: payload có mã tra cho mọi khoá. */
export const ENGINE_NS = {
  almanac: 'lib/almanac/terms.ts',
  tayphuong: 'lib/tayphuong/terms.ts',
  lucnham: 'lib/liuren/terms.ts',
};
/**
 * Ngôn ngữ ĐÃ dịch đủ văn dài ⇒ bộ dò đòi đủ 100% mục. Worker nào xong locale của mình thì thêm vào đây
 * (`zh-cn` đi theo `zh-tw`: thêm cả hai). Locale chưa liệt kê: file có thì vẫn bị soi hash/mồ côi, không đòi đủ.
 */
export const LONG_COMPLETE = ['ja', 'en', 'zh-tw', 'zh-cn', 'ko'];

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

  // 5) Thần số học (W25): nghĩa 12 số, nợ nghiệp, bài học thiếu, nghề, năm cá nhân, thử thách, 8 mũi tên + chữ khung (bảng UI)
  const { TABLES: T } = require(path.join(root, LONG_MODULE['than-so-hoc']));
  const ts5 = [];
  for (const n of Object.keys(T.MEANINGS)) {
    ts5.push({ k: `m.${n}.desc`, vi: T.MEANINGS[n].desc, ctx: `Số ${n} · nghĩa` });
    T.MEANINGS[n].kw.forEach((w, i) =>
      ts5.push({ k: `m.${n}.kw.${i}`, vi: w, ctx: `Số ${n} · từ khoá ${i + 1}` })
    );
  }
  for (const n of Object.keys(T.KARMIC_DEBT)) {
    ts5.push({ k: `kd.${n}.ten`, vi: T.KARMIC_DEBT[n].ten, ctx: `Nợ nghiệp quật ${n} · tên` });
    ts5.push({
      k: `kd.${n}.desc`,
      vi: T.KARMIC_DEBT[n].desc,
      ctx: `Nợ nghiệp quật ${n} · diễn giải`,
    });
  }
  for (const n of Object.keys(T.KARMIC_LESSON))
    ts5.push({
      k: `kl.${n}`,
      vi: T.KARMIC_LESSON[n],
      ctx: `Bài học còn thiếu: chữ số ${n} vắng trong tên`,
    });
  for (const n of Object.keys(T.CAREER))
    T.CAREER[n].forEach((c, i) =>
      ts5.push({ k: `ca.${n}.${i}`, vi: c, ctx: `Nghề hợp Số Đường Đời ${n}` })
    );
  for (const n of Object.keys(T.PERSONAL_YEAR))
    ts5.push({ k: `py.${n}`, vi: T.PERSONAL_YEAR[n], ctx: `Năm cá nhân ${n}/9` });
  for (const n of Object.keys(T.CHALLENGE))
    ts5.push({
      k: `ch.${n}`,
      vi: T.CHALLENGE[n],
      ctx: `Thử thách số ${n} (đi sau "Thử thách ${n}:")`,
    });
  T.ARROWS.forEach((a, i) => {
    const l = a.line.join('-');
    ts5.push({ k: `ar.${i}.manh`, vi: a.manh, ctx: `Mũi tên ${l} · tên khi ĐỦ 3 số` });
    ts5.push({ k: `ar.${i}.yeu`, vi: a.yeu, ctx: `Mũi tên ${l} · tên khi TRỐNG` });
    ts5.push({ k: `ar.${i}.mo`, vi: a.mo, ctx: `Mũi tên ${l} · nghĩa khi đủ (nối sau "—")` });
    ts5.push({ k: `ar.${i}.mv`, vi: a.mv, ctx: `Mũi tên ${l} · nghĩa khi trống` });
  });
  for (const [k, v] of Object.entries(T.UI))
    ts5.push({ k: `ui.${k}`, vi: v, ctx: `Chữ khung (giữ {token} nguyên)` });
  out['than-so-hoc'] = ts5;

  out.almanac = loadAlmanac(root);
  out.tayphuong = loadTayPhuong(root);
  out.lucnham = loadLucNham(root);
  return out;
}

// ── Văn ENGINE SERVER (W28) — đọc bảng TS bằng regex (CI chạy Node 20, không nạp .ts được) ─────────
// Mỗi bảng có SỐ MỤC CHỐT: bố cục file đổi mà regex đọc hụt thì ném lỗi, không lặng lẽ kiểm danh sách cụt.
function tsBlock(ts, name, file) {
  const m = new RegExp(`(?:export )?const ${name}\\b[^=]*=\\s*([\\[{])([\\s\\S]*?)\\n[\\]}];`).exec(
    ts
  );
  if (!m) throw new Error(`${file}: không thấy bảng ${name}`);
  return m[2];
}
function chot(arr, n, what) {
  if (arr.length !== n)
    throw new Error(
      `${what}: đọc được ${arr.length} mục, chờ ${n} — bố cục nguồn đổi ⇒ sửa loadSources`
    );
  return arr;
}
/** Bảng phiên Hán-Việt theo chữ của `lib/hanviet.ts` + `phienAm` (bản sao 4 dòng của hàm cùng tên). */
function hanViet(root) {
  const f = 'lib/hanviet.ts';
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const map = (name) => {
    const o = {};
    for (const e of tsBlock(ts, name, f).matchAll(/([\u3400-\u9fff]):\s*'([^']+)'/g))
      o[e[1]] = e[2];
    return o;
  };
  const HV = map('HAN_VIET');
  const CAN = map('CAN_HAN');
  const CHI = map('CHI_HAN');
  if (
    Object.keys(CAN).length !== 10 ||
    Object.keys(CHI).length !== 12 ||
    Object.keys(HV).length < 300
  )
    throw new Error(`${f}: đọc bảng phiên hụt — sửa hanViet() trong lib/i18n/long.mjs`);
  return (han) =>
    Array.from(String(han || ''))
      .map((c) => HV[c] || CAN[c] || CHI[c] || c)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
}

/** Hoàng lịch (`lib/almanac/terms.ts`). Khoá = MÃ HÁN của mingyu (route trả ở trường `ma`/`*Ma`). */
function loadAlmanac(root) {
  const f = ENGINE_NS.almanac;
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const out = [];
  const viec = [
    ...tsBlock(ts, 'VIEC', f).matchAll(
      /^\s*([^\s:{}/]+): \{ ten: '([^']+)', nghia: '([^']+)' \}/gm
    ),
  ];
  for (const [, han, ten, nghia] of chot(viec, 112, `${f} VIEC`)) {
    out.push({
      k: `viec.${han}.ten`,
      vi: ten,
      ctx: `Hoàng lịch · tên việc nghi/kỵ ${han} (nhãn ngắn)`,
    });
    out.push({
      k: `viec.${han}.nghia`,
      vi: nghia,
      ctx: `Hoàng lịch · nghĩa thường của ${han} "${ten}"`,
    });
  }
  // Thần sát: danh sách TRỌN của nguồn (tyme4ts God.NAMES — mingyu `lunarDay.getGods()`), không phải mẫu đo.
  const rieng = Object.fromEntries(
    [...tsBlock(ts, 'THAN_SAT_RIENG', f).matchAll(/([\u3400-\u9fff]+):\s*'([^']+)'/g)].map((e) => [
      e[1],
      e[2],
    ])
  );
  const phien = hanViet(root);
  // tyme4ts là phụ thuộc của mingyu-core (không khai ở gốc) ⇒ resolve từ thư mục mingyu-core.
  const myRequire = createRequire(path.join(root, 'node_modules/mingyu-core/package.json'));
  const gods = myRequire('tyme4ts').God.NAMES;
  if (!Array.isArray(gods) || gods.length < 140)
    throw new Error(`tyme4ts God.NAMES đọc được ${gods && gods.length} tên — sửa loadAlmanac`);
  for (const han of gods)
    out.push({
      k: `than.${han}`,
      vi: rieng[han] || phien(han),
      ctx: `Hoàng lịch · TÊN RIÊNG thần sát ${han}`,
    });
  for (const bang of ['BANH_TO_CAN', 'BANH_TO_CHI']) {
    const bt = [...tsBlock(ts, bang, f).matchAll(/^\s*([\u3400-\u9fff]+): '([^']+)'/gm)];
    for (const [, han, vi] of chot(bt, bang === 'BANH_TO_CAN' ? 10 : 12, `${f} ${bang}`))
      out.push({ k: `bt.${han}`, vi, ctx: `Bành Tổ bách kỵ · ${han}` });
  }
  const cuu = [...tsBlock(ts, 'CUU_TINH', f).matchAll(/([\u4e00-\u9fff]): \{ ten: '([^']+)'/g)];
  for (const [, han, vi] of chot(cuu, 9, `${f} CUU_TINH`))
    out.push({ k: `cuu.${han}`, vi, ctx: `Cửu tinh trực nhật (Huyền Không) số ${han}` });
  const ph = [...tsBlock(ts, 'PHUONG_HAN', f).matchAll(/([\u4e00-\u9fff]+): '([^']+)'/g)];
  for (const [, han, vi] of chot(ph, 21, `${f} PHUONG_HAN`))
    out.push({ k: `phuong.${han}`, vi, ctx: `Hướng (la bàn) ${han}` });
  const tn = [
    ...tsBlock(ts, 'THAN_NIEN', f).matchAll(
      /([\u4e00-\u9fff]+): \{ ten: '([^']+)', muc: '\w+', nghia: '([^']+)' \}/g
    ),
  ];
  // Chỉ TÊN: `nghia` của thần năm không vẽ ở đâu (chỉ vào rail, giữ Việt) — dịch chữ không ai thấy là chữ chết.
  for (const [, han, ten] of chot(tn, 12, `${f} THAN_NIEN`))
    out.push({ k: `nien.${han}.ten`, vi: ten, ctx: `Thần theo năm (thái tuế) ${han} · tên riêng` });
  return out;
}

/** Chiêm tinh Tây (`lib/tayphuong/terms.ts`): câu `nghia`. Tên đi glossary 'chiemtinh', không ở đây. */
function loadTayPhuong(root) {
  const f = ENGINE_NS.tayphuong;
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const out = [];
  const keyed = (bang, tien, n, re) => {
    const r = [...tsBlock(ts, bang, f).matchAll(re)];
    for (const [, k, vi] of chot(r, n, `${f} ${bang}`))
      out.push({ k: `${tien}.${k}`, vi, ctx: `Chiêm tinh Tây · ${bang} ${k} · nghĩa` });
  };
  const KEY = `(?:'([^']+)'|(\\w+))`;
  const two = (re) => ({
    [Symbol.matchAll]: (s) => [...s.matchAll(re)].map((m) => [m[0], m[1] || m[2], m[3]]).values(),
  });
  keyed(
    'HANH_TINH',
    'hanhtinh',
    19,
    two(new RegExp(`^\\s*${KEY}: \\{[^\\n]*?nghia: '([^']+)'`, 'gm'))
  );
  keyed('DIEM', 'diem', 6, two(new RegExp(`^\\s*${KEY}: \\{[^\\n]*?nghia: '([^']+)'`, 'gm')));
  // NHA (12 nhà) chưa vẽ nghĩa ở đâu ⇒ chưa vào nguồn dịch; vẽ thì thêm `keyed('NHA', 'nha', 12, …)`.
  keyed('GOC', 'goc', 11, two(new RegExp(`^\\s*${KEY}: \\{[^\\n]*?nghia: '([^']+)'`, 'gm')));
  keyed(
    'HINH_THE',
    'hinhthe',
    7,
    two(new RegExp(`^\\s*${KEY}: \\{[^\\n]*?nghia: '([^']+)'`, 'gm'))
  );
  return out;
}

/**
 * Đại Lục Nhâm (`lib/liuren/terms.ts`). Khoá = MÃ HÁN mingyu (route trả ở `ma`/`*Ma`, xem `lib/liuren/ke.ts`).
 * Chỉ bảng CÓ chỗ vẽ ở `dai-luc-nham.js`: `nghia` của thiên tướng/thần sát chỉ vào rail ⇒ không dịch.
 * Tên Sơ/Trung/Mạt truyền đi glossary `lucnham`, hành đi glossary `hanh` — không ở đây.
 */
function loadLucNham(root) {
  const f = ENGINE_NS.lucnham;
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const out = [];
  const KEY = `(?:'([^']+)'|([\\u3400-\\u9fff]+))`;
  const pick = (bang, n, re) =>
    chot(
      [...tsBlock(ts, bang, f).matchAll(re)].map((m) => [m[1] || m[2], m[3], m[4]]),
      n,
      `${f} ${bang}`
    );
  const tenNghia = new RegExp(`${KEY}: \\{[^\\n]*?ten: '([^']+)'[^\\n]*?nghia: '([^']+)'`, 'g');
  const phang = new RegExp(`${KEY}: '([^']+)'`, 'g');
  for (const [han, ten] of pick('THIEN_TUONG', 12, tenNghia))
    out.push({ k: `tuong.${han}`, vi: ten, ctx: `Lục Nhâm · TÊN thiên tướng ${han}` });
  for (const [han, ten, nghia] of pick('PHAP_THU_TRUYEN', 13, tenNghia)) {
    out.push({ k: `phap.${han}.ten`, vi: ten, ctx: `Lục Nhâm · tên phép thủ truyền ${han}` });
    out.push({ k: `phap.${han}.nghia`, vi: nghia, ctx: `Lục Nhâm · nghĩa phép ${han} "${ten}"` });
  }
  for (const [han, ten, nghia] of pick('DANG_TRUYEN', 4, tenNghia)) {
    out.push({ k: `dt.${han}.ten`, vi: ten, ctx: `Lục Nhâm · dạng tam truyền ${han}` });
    out.push({ k: `dt.${han}.nghia`, vi: nghia, ctx: `Lục Nhâm · nghĩa dạng truyền ${han} "${ten}"` });
  }
  for (const [han, ten] of pick('KHOA_THE', 40, phang))
    out.push({ k: `khoathe.${han}`, vi: ten, ctx: `Lục Nhâm · TÊN RIÊNG khóa thể ${han}` });
  for (const [han, ten] of pick('THAN_SAT', 13, tenNghia))
    out.push({ k: `thansat.${han}`, vi: ten, ctx: `Lục Nhâm · TÊN thần sát ${han}` });
  for (const [han, vi] of pick('VUONG_SUY', 5, phang))
    out.push({ k: `vs.${han}`, vi, ctx: `Lục Nhâm · vượng suy theo mùa ${han} (chữ thường)` });
  for (const [han, vi] of pick('KHOA_TEN', 4, phang))
    out.push({ k: `khoa.${han}`, vi, ctx: `Lục Nhâm · tên khóa trong Tứ Khóa ${han}` });
  for (const [han, vi] of pick('TRU_DEM', 2, phang))
    out.push({ k: `trudem.${han}`, vi, ctx: `Lục Nhâm · chiêm ngày/đêm ${han}` });
  const khuon = chot(
    [...tsBlock(ts, 'KHUON', f).matchAll(/^\s*(\w+): '([^']+)'/gm)],
    5,
    `${f} KHUON`
  );
  for (const [, k, vi] of khuon)
    out.push({
      k: `khuon.${k}`,
      vi,
      ctx: `Lục Nhâm · KHUÔN câu ghép (giữ {token}; {a}/{b} là tên hành hoặc câu nghĩa đã dịch, {tuong} là tên thiên tướng)`,
    });
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
