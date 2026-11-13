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
  'hntre',
  'cong-so',
  // Lô D (W30d): văn engine kết quả của Dạy Con (đánh giá) · Duyên Nợ Tiền Kiếp · Sổ Nhân Mạch.
  'day-con-assess',
  'duyen-no',
  'nhan-mach',
  'daycon',
  'lucnham',
  'giosinh',
  'nguoikhac',
  'giosinh-sao',
  'past-life',
  'nghe-nghiep',
  'cach-cuc',
  // W30f-8: tên nhân vật + danh xưng nghề của Chân Dung / Duyên Nợ Tiền Kiếp (tách khỏi `past-life` để Công Sở/Giờ Sinh không nạp thừa).
  'past-life-ten',
  // W32A: luật đại vận `phanTichDaiVanRules` (khối "Luận đoán vận hạn" của Luận Giải · Chu Trình · Vận Hạn 12 Tháng).
  'dv-rules',
  // W32A-2: tổ hợp sao chéo tầng cung hạn (Vận Hạn 12 Tháng, `public/cach_cuc_all.json`) — tên + tóm tắt chưa có ở `cach-cuc`.
  'to-hop',
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
  // W30a: Hướng Nghiệp Sớm Cho Con — chỗ vẽ nằm ngay trong trang (script nội tuyến), không có module riêng.
  hntre: 'public/app-huong-nghiep-tre.html',
  'cong-so': 'public/tools-shared/cong-so.js',
  // Lô D: JS vẽ kết quả nằm NỘI TUYẾN trong trang (không có module riêng) — trang CHÍNH LÀ module.
  'day-con-assess': 'public/app-day-con.html',
  'duyen-no': 'public/app-duyen-no-tien-kiep.html',
  'nhan-mach': 'public/app-nhan-mach.html',
  // W30c: chữ hiển thị của Dạy Con do engine viết — trang dựng bằng JS nội tuyến.
  daycon: 'public/app-day-con.html',
  // Lô E (W30e): Lục Nhâm vẽ ở module dùng chung (trang + rail shell); Giờ Sinh/Người Khác vẽ ngay trong trang.
  lucnham: 'public/tools-shared/dai-luc-nham.js',
  giosinh: 'public/app-gio-sinh.html',
  nguoikhac: 'public/app-nguoi-khac.html',
  // W30f: nhãn đáp án khảo sát giờ sinh — trang dựng bằng JS nội tuyến.
  'giosinh-sao': 'public/app-gio-sinh.html',
  // W30f-3: chức phận cổ (resolveCareerBase) + tư cách Mệnh (MENH_ROLE) — vẽ ở Công Sở (module dùng chung).
  'past-life': 'public/tools-shared/cong-so.js',
  // W30f-4: tầng nhánh nghề (trả phí) — cùng module Công Sở.
  'nghe-nghiep': 'public/tools-shared/cong-so.js',
  // W30f-5: câu ý nghĩa từng cung do engine lõi sinh (cachCucTungCung) — hàm tra dùng chung cho Công Sở · Người Khác · Hướng Nghiệp Trẻ · Dạy Con.
  'cach-cuc': 'public/tools-shared/cach-cuc.js',
  // W30f-8: tên nhân vật + danh xưng nghề tiền kiếp — hàm tra dùng chung cho Chân Dung Tiền Kiếp + Duyên Nợ Tiền Kiếp.
  'past-life-ten': 'public/tools-shared/past-life-ten.js',
  'dv-rules': 'public/tools-shared/dv-rules.js',
  'to-hop': 'public/tools-shared/to-hop.js',
};
/** Namespace là văn ENGINE SERVER (bảng TS) — check:i18nlong soi thêm: payload có mã tra cho mọi khoá. */
export const ENGINE_NS = {
  almanac: 'lib/almanac/terms.ts',
  tayphuong: 'lib/tayphuong/terms.ts',
  hntre: 'lib/engine/huong-nghiep-tre.ts',
  'cong-so': 'lib/engine/cong-so-terms.ts',
  'day-con-assess': 'lib/engine/day-con-assess.ts',
  'duyen-no': 'lib/engine/past-life-bond-terms.ts',
  'nhan-mach': 'lib/engine/nhan-mach-terms.ts',
  daycon: 'lib/engine/day-con.ts',
  lucnham: 'lib/liuren/terms.ts',
  giosinh: 'lib/engine/gio-sinh.ts',
  nguoikhac: 'lib/engine/nguoi-khac.ts',
  'giosinh-sao': 'lib/engine/data/gio-sinh-dauhieu.ts',
  'past-life': 'lib/engine/past-life.ts',
  'nghe-nghiep': 'lib/engine/nghe-nghiep.ts',
  'cach-cuc': 'public/tuvi-ansao-engine.js',
  'past-life-ten': 'lib/engine/past-life.ts',
  'dv-rules': 'public/tuvi-ansao-engine.js',
  'to-hop': 'public/cach_cuc_all.json',
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
  out.hntre = loadHuongNghiepTre(root);
  out['cong-so'] = loadCongSo(root);
  out['day-con-assess'] = loadDayConAssess(root);
  out['duyen-no'] = loadDuyenNo(root);
  out['nhan-mach'] = loadNhanMach(root);
  out.daycon = loadDayCon(root);
  out.lucnham = loadLucNham(root);
  out.giosinh = loadKhuon(root, 'giosinh', 'GS_VAN', 60, 'Xác Định Giờ Sinh · khảo sát');
  out.nguoikhac = loadNguoiKhac(root);
  out['giosinh-sao'] = loadGioSinh(root);
  out['past-life'] = loadPastLife(root);
  out['nghe-nghiep'] = loadNgheNghiep(root);
  out['cach-cuc'] = loadCachCuc(root);
  out['dv-rules'] = loadDvRules(root);
  out['to-hop'] = loadToHop(root, out['cach-cuc']);
  out['past-life-ten'] = loadPastLifeTen(root);
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

// ── Lô D (W30d): văn engine KẾT QUẢ — đọc bảng TS bằng regex, SỐ MỤC CHỐT ─────────────────────────
const STR = String.raw`'((?:[^'\\]|\\.)*)'`;
const unq = (t) => t.replace(/\\(.)/g, '$1');
/** Phần thân của `export const <name> … = { … };` (kết thúc ở `};` đầu dòng). */
function tsBody(ts, name, file) {
  const a = ts.indexOf(`export const ${name}`);
  if (a < 0) throw new Error(`${file}: không thấy bảng ${name}`);
  const b = ts.indexOf('\n};', a);
  if (b < 0) throw new Error(`${file}: bảng ${name} không đóng ở đầu dòng`);
  return ts.slice(a, b);
}
/** Bảng phẳng `'khoá': 'chuỗi',` → [[khoá, chuỗi]]. */
function flatTable(ts, name, file, n) {
  const re = new RegExp(String.raw`^\s*'?([\w.-]+)'?:\s*` + STR + ',?$', 'gm');
  const body = tsBody(ts, name, file).split('\n').slice(1).join('\n');
  return chot(
    [...body.matchAll(re)].map((m) => [m[1], unq(m[2])]),
    n,
    `${file} ${name}`
  );
}

/** Dạy Con — phần ĐÁNH GIÁ: 5 trục tính khí (TRUC) + 8 chất năng khiếu (KHIEU) của `day-con-assess.ts`. */
function loadDayConAssess(root) {
  const f = ENGINE_NS['day-con-assess'];
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const out = [];
  // TRUC — máy trạng thái theo dòng: id (2 space) → mục (4 space: thap/cao/can) → trường (chuỗi cùng dòng hoặc dòng sau)
  const SEC = { thap: 'cực ĐIỂM THẤP (0)', cao: 'cực ĐIỂM CAO (10)', can: 'ca nằm GIỮA' };
  const TR = {};
  let id = null;
  let sec = null;
  let key = null;
  const lines = tsBody(ts, 'TRUC', f).split('\n').slice(1);
  for (const ln of lines) {
    let m;
    if ((m = /^ {2}(\w+): \{$/.exec(ln))) {
      id = m[1];
      sec = null;
      key = null;
      TR[id] = [];
    } else if ((m = /^ {4}(thap|cao|can): \{$/.exec(ln))) sec = m[1];
    else if (/^ {4}\},?$/.test(ln)) sec = null;
    else if ((m = new RegExp(String.raw`^\s+(\w+):\s*` + STR + ',?$').exec(ln))) {
      if (m[1] !== 'id') TR[id].push([sec ? `${sec}.${m[1]}` : m[1], unq(m[2])]);
      key = null;
    } else if ((m = /^\s+(\w+):$/.exec(ln))) key = m[1];
    else if (key && (m = new RegExp(String.raw`^\s+` + STR + ',?$').exec(ln))) {
      TR[id].push([sec ? `${sec}.${key}` : key, unq(m[1])]);
      key = null;
    }
  }
  chot(Object.keys(TR), 5, `${f} TRUC (số trục)`);
  const tenTruc = {};
  for (const [tid, es] of Object.entries(TR)) {
    chot(es, 13, `${f} TRUC.${tid} (số chuỗi)`);
    tenTruc[tid] = es.find((e) => e[0] === 'ten')[1];
    // `nguon` (cung nào) không vẽ ở trang — chỉ vào prompt; dịch chữ không ai thấy là chữ chết ⇒ không vào nguồn.
    for (const [k, vi] of es.filter((e) => e[0] !== 'nguon'))
      out.push({
        k: `truc.${tid}.${k}`,
        vi,
        ctx: `Dạy Con · trục tính khí "${tenTruc[tid]}" · ${k.includes('.') ? SEC[k.split('.')[0]] + ' · ' + k.split('.')[1] : k} (cha mẹ đọc về con)`,
      });
  }
  // KHIEU — 8 chất: ten · motCau · dauHieu[4] · chuY · oLop
  const KH = {};
  id = null;
  key = null;
  let inArr = false;
  for (const ln of tsBody(ts, 'KHIEU', f).split('\n').slice(1)) {
    let m;
    if ((m = /^ {2}'([\w-]+)': \{$/.exec(ln))) {
      id = m[1];
      KH[id] = [];
      key = null;
      inArr = false;
    } else if (/^ {4}dauHieu: \[$/.test(ln)) inArr = true;
    else if (inArr && /^ {4}\],?$/.test(ln)) inArr = false;
    else if (inArr && (m = new RegExp(String.raw`^\s+` + STR + ',?$').exec(ln)))
      KH[id].push([`dau.${KH[id].filter((e) => e[0].startsWith('dau.')).length}`, unq(m[1])]);
    else if ((m = new RegExp(String.raw`^\s+(\w+):\s*` + STR + ',?$').exec(ln))) {
      if (m[1] !== 'id') KH[id].push([m[1], unq(m[2])]);
      key = null;
    } else if ((m = /^\s+(\w+):$/.exec(ln))) key = m[1];
    else if (key && (m = new RegExp(String.raw`^\s+` + STR + ',?$').exec(ln))) {
      KH[id].push([key, unq(m[1])]);
      key = null;
    }
  }
  chot(Object.keys(KH), 8, `${f} KHIEU (số chất)`);
  for (const [kid, es] of Object.entries(KH)) {
    chot(es, 8, `${f} KHIEU.${kid} (số chuỗi)`);
    const ten = es.find((e) => e[0] === 'ten')[1];
    for (const [k, vi] of es)
      out.push({
        k: `khieu.${kid}.${k}`,
        vi,
        ctx: `Dạy Con · chất năng khiếu "${ten}" · ${k === 'ten' ? 'tên chất' : k} (cha mẹ đọc về con)`,
      });
  }
  return out;
}

/** Duyên Nợ Tiền Kiếp (`lib/engine/past-life-bond-terms.ts`): 7 loại duyên + 5 nhãn + 18 câu dấu hiệu cổ pháp. */
function loadDuyenNo(root) {
  const f = ENGINE_NS['duyen-no'];
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const out = [];
  for (const [k, vi] of flatTable(ts, 'BOND_LABEL', f, 7))
    out.push({
      k: `bond.${k}.label`,
      vi,
      ctx: `Duyên nợ tiền kiếp · nhãn loại duyên "${k}" (ngắn, người ta chụp màn hình gửi nhau)`,
    });
  for (const [k, vi] of flatTable(ts, 'BOND_GIST', f, 7))
    out.push({
      k: `bond.${k}.gist`,
      vi,
      ctx: `Duyên nợ tiền kiếp · một câu mô tả bản chất loại duyên "${k}"`,
    });
  for (const [k, vi] of flatTable(ts, 'SIGNAL_LABEL', f, 5))
    out.push({
      k: `sig.${k}`,
      vi,
      ctx: `Duyên nợ tiền kiếp · nhãn "dấu hiệu cổ pháp" trong lá số (${k})`,
    });
  for (const [k, vi] of flatTable(ts, 'SIGNAL_DETAIL', f, 18))
    out.push({
      k: `sigd.${k}`,
      vi,
      ctx: `Duyên nợ tiền kiếp · dấu hiệu cổ pháp ${k} (giữ {x} nguyên: tên nhân vật/hành/danh xưng)`,
    });
  return out;
}

/** Sổ Nhân Mạch: 2 câu khuôn "cặp trong nhóm" + 4 tên kiểu (đọc từ KIEU của cong-so.ts — cùng chữ với trang Công Sở). */
function loadNhanMach(root) {
  const f = ENGINE_NS['nhan-mach'];
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const out = [];
  for (const [k, vi] of flatTable(ts, 'CAP_MAU', f, 2))
    out.push({
      k: `cap.${k}`,
      vi,
      ctx: `Sổ Nhân Mạch · khối "Các Cặp Trong Nhóm" · loại "${k}" (giữ {a} {b} = tên kiểu nguyên)`,
    });
  // Bảng KIEU nằm ở `cong-so-terms.ts` từ W30b (cong-so.ts chỉ re-export).
  const cs = fs.readFileSync(path.join(root, 'lib/engine/cong-so-terms.ts'), 'utf8');
  const kieu = [
    ...tsBody(cs, 'KIEU', 'lib/engine/cong-so-terms.ts').matchAll(
      /^ {2}'([\w-]+)': \{\n {4}id: '[\w-]+',\n {4}ten: '([^']+)'/gm
    ),
  ];
  for (const [, id, ten] of chot(kieu, 4, 'lib/engine/cong-so-terms.ts KIEU'))
    out.push({
      k: `kieu.${id}.ten`,
      vi: ten,
      ctx: `Sổ Nhân Mạch · tên kiểu "${id}" — DÙNG ĐÚNG chữ của trang Công Sở (ja 開拓/リーダー/サポート/協調 · ko 개척/리더/지원/협력 · zh-tw 開創/領導/支援/協作 · en Pioneer/Leader/Support/Collaborator)`,
    });
  return out;
}

/**
 * Hướng Nghiệp Sớm Cho Con (`lib/engine/huong-nghiep-tre.ts`, W30a). Bảng nằm GIỮA mã (không có file `terms` riêng,
 * và chép sang file khác là đổi dữ liệu) ⇒ đọc bằng AST của TypeScript: chỉ chấp nhận literal (chuỗi, `+` nối chuỗi,
 * mảng, object, số) — gặp biểu thức lạ thì ném lỗi chứ không đọc hụt. Khoá = id của CHÍNH bảng (không phải câu Việt).
 */
function tsLiteral(root, file, names) {
  const ts = createRequire(path.join(root, 'package.json'))('typescript');
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true);
  const val = (n) => {
    if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) return val(n.expression);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.MinusToken)
      return -val(n.operand);
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return String(val(n.left)) + String(val(n.right));
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(val);
    if (ts.isObjectLiteralExpression(n)) {
      const o = {};
      for (const p of n.properties) {
        if (!ts.isPropertyAssignment(p))
          throw new Error(
            `${file}: thuộc tính không phải literal ở "${p.getText(sf).slice(0, 40)}"`
          );
        const k = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : null;
        if (k === null) throw new Error(`${file}: khoá lạ "${p.name.getText(sf)}"`);
        o[k] = val(p.initializer);
      }
      return o;
    }
    throw new Error(`${file}: biểu thức không phải literal "${n.getText(sf).slice(0, 40)}"`);
  };
  const out = {};
  sf.forEachChild((st) => {
    if (!ts.isVariableStatement(st)) return;
    for (const d of st.declarationList.declarations)
      if (ts.isIdentifier(d.name) && names.includes(d.name.text) && d.initializer)
        out[d.name.text] = val(d.initializer);
  });
  for (const n of names) if (!(n in out)) throw new Error(`${file}: không thấy bảng ${n}`);
  return out;
}

/**
 * Xác Định Giờ Sinh (`lib/engine/data/gio-sinh-dauhieu.ts`, W30f): nhãn ĐÁP ÁN của câu khảo sát theo cung. Bảng thuần
 * literal ⇒ `tsLiteral`. Khoá = chính tinh (không phải câu Việt); client ghép nhãn một câu cung từ `value` ('A+B') của
 * đáp án: `tat.<sao>` · `net.<cung>.<sao>` · `mtre|pdtre|pmtre.<sao>` · `trong.<id>`. `nguon` (trích Tân Biên) KHÔNG vẽ
 * ở đâu ⇒ không vào nguồn dịch. Cung Mệnh người lớn đọc `MENH_ROLE` (ns `past-life`, W30f-3).
 */
function loadGioSinh(root) {
  const f = ENGINE_NS['giosinh-sao'];
  const T = tsLiteral(root, f, [
    'TAT_ACH_DAU_HIEU',
    'TAT_ACH_VCD',
    'CUNG_NET',
    'MENH_TRE_EM',
    'PHUC_DUC_TRE_EM',
    'PHU_MAU_TRE_EM',
  ]);
  const out = [];
  for (const [sao, d] of chot(Object.entries(T.TAT_ACH_DAU_HIEU), 14, `${f} TAT_ACH_DAU_HIEU`))
    out.push({
      k: `tat.${sao}`,
      vi: d.dau,
      ctx: `Giờ sinh · cung Tật Ách · ${sao} · dấu hiệu quan sát`,
    });
  out.push({ k: 'tat.vcd', vi: T.TAT_ACH_VCD.dau, ctx: 'Giờ sinh · cung Tật Ách vô chính diệu' });
  const nho = (m, n, what) => chot(Object.entries(m), n, `${f} ${what}`);
  for (const [cung, m] of nho(T.CUNG_NET, 5, 'CUNG_NET'))
    for (const [sao, vi] of nho(m, 14, `CUNG_NET.${cung}`))
      out.push({
        k: `net.${cung}.${sao}`,
        vi,
        ctx: `Giờ sinh · cung ${cung} · ${sao} · nét quan sát (người lớn)`,
      });
  for (const [pre, bang, ten] of [
    ['mtre', 'MENH_TRE_EM', 'cung Mệnh — lời người ngoài nhận xét đứa trẻ'],
    ['pdtre', 'PHUC_DUC_TRE_EM', 'cung Phúc Đức — nếp ăn ngủ/tính khí nền của đứa trẻ'],
    ['pmtre', 'PHU_MAU_TRE_EM', 'cung Phụ Mẫu — về cha mẹ (người đang trả lời) và không khí nhà'],
  ])
    for (const [sao, vi] of nho(T[bang], 14, bang))
      out.push({ k: `${pre}.${sao}`, vi, ctx: `Giờ sinh · BẢN TRẺ EM · ${ten} · ${sao}` });
  return out;
}

/**
 * Chức phận cổ + tư cách Mệnh (`lib/engine/past-life.ts`, W30f-3). Bảng literal nằm lẫn trong file 180 KB có import lạ ⇒
 * `tsLiteral` (AST). Khoá = id CHÍNH bảng: `nghe.<sao>.<bậc>.desc|src` · `pair.<cặp>.<bậc>.desc|src` ·
 * `nghe.default.desc|src` · `note.mod.<chỉ số>` · `note.hoa.<hóa>` · `tier.<bậc>` · `menh.<sao>.role`. Chỉ chữ có CHỖ VẼ
 * (Công Sở: bậc · chức phận lối cổ · trích dẫn · tư cách Mệnh · sắc thái; Chân Dung Tiền Kiếp: era · bậc · chức phận · trích dẫn); `attireEn`/`titleNam`/`domain` KHÔNG vào đây.
 */
function loadPastLife(root) {
  const f = ENGINE_NS['past-life'];
  const T = tsLiteral(root, f, [
    'OCCUPATION_TABLE',
    'PAIR_OCCUPATION_TABLE',
    'DEFAULT_OCCUPATION',
    'CAREER_MODIFIERS',
    'HOA_NOTES',
    'TIER_LABEL',
    'MENH_ROLE',
    'BD_MAU',
    'ERAS',
  ]);
  const out = [];
  const TIERS = ['kha', 'cao', 'giua', 'thap'];
  const bang = (pre, tab, n, ten) => {
    for (const [id, tiers] of chot(Object.entries(tab), n, `${f} ${ten}`)) {
      for (const t of TIERS) {
        const o = tiers[t];
        if (!o) throw new Error(`${f} ${ten}.${id} thiếu bậc ${t}`);
        out.push({
          k: `${pre}.${id}.${t}.desc`,
          vi: o.desc,
          ctx: `Chức phận lối cổ · ${ten} ${id} · bậc ${t}`,
        });
        out.push({
          k: `${pre}.${id}.${t}.src`,
          vi: o.source,
          ctx: `Trích dẫn Tân Biên · ${ten} ${id} · bậc ${t}`,
        });
      }
    }
  };
  bang('nghe', T.OCCUPATION_TABLE, 14, 'OCCUPATION_TABLE');
  bang('pair', T.PAIR_OCCUPATION_TABLE, 24, 'PAIR_OCCUPATION_TABLE');
  out.push({
    k: 'nghe.default.desc',
    vi: T.DEFAULT_OCCUPATION.desc,
    ctx: 'Chức phận lối cổ · vô chính diệu không mượn được sao',
  });
  out.push({
    k: 'nghe.default.src',
    vi: T.DEFAULT_OCCUPATION.source,
    ctx: 'Trích dẫn Tân Biên · vô chính diệu',
  });
  chot(T.CAREER_MODIFIERS, 9, `${f} CAREER_MODIFIERS`).forEach((m, i) =>
    out.push({
      k: `note.mod.${i}`,
      vi: m.note,
      ctx: `Sắc thái nghề · phụ tinh ${m.stars.join('/')}`,
    })
  );
  for (const [h, vi] of chot(Object.entries(T.HOA_NOTES), 4, `${f} HOA_NOTES`))
    out.push({ k: `note.hoa.${h}`, vi, ctx: `Sắc thái nghề · Hóa ${h} tại Quan Lộc` });
  for (const [t, vi] of chot(Object.entries(T.TIER_LABEL), 4, `${f} TIER_LABEL`))
    out.push({ k: `tier.${t}`, vi, ctx: `Bậc chức phận (${t}) — một từ cổ` });
  for (const [k, vi] of chot(Object.entries(T.BD_MAU), 5, `${f} BD_MAU`))
    out.push({
      k: `bd.${k}`,
      vi,
      ctx: `Khoản chấm bậc chức phận · khuôn${/\{\w+\}/.test(vi) ? ' (giữ {token})' : ''}`,
    });
  // Nền văn minh của truyện (`era`): chỉ `label`/`ageLabel` HIỆN ở Chân Dung Tiền Kiếp (tiêu đề + poster); phần còn lại của `ERAS`
  // (mô tả cho prompt ảnh/truyện) KHÔNG dịch. Khoá theo `era.id` có sẵn trong payload ⇒ không đổi cấu trúc `portrait_cache`.
  for (const [id, e] of chot(Object.entries(T.ERAS), 5, `${f} ERAS`)) {
    out.push({
      k: `era.${id}.label`,
      vi: e.label,
      ctx: `Bối cảnh tiền kiếp ${id} · tên (tiêu đề ảnh/poster)`,
    });
    out.push({
      k: `era.${id}.age`,
      vi: e.ageLabel,
      ctx: `Bối cảnh tiền kiếp ${id} · cụm thời kỳ (viết thường, sau dấu ·)`,
    });
  }
  for (const [sao, d] of chot(Object.entries(T.MENH_ROLE), 14, `${f} MENH_ROLE`))
    out.push({ k: `menh.${sao}.role`, vi: d.role, ctx: `Tư cách theo cung Mệnh · ${sao}` });
  return out;
}

/**
 * Tên nhân vật + danh xưng nghề tiền kiếp (`lib/engine/past-life.ts`, W30f-8). Khoá = CHỈ SỐ trong bảng nguồn, khớp mã engine
 * trả (`characterMa` · `danhXungMa` / `tenMa` · `danhXungMa`): `name.<era>.ho|nam|nu.<chỉ số>` (NAME_POOLS) · `title.<khoá bản gốc>.<nam|nu>`
 * (OCCUPATION_TABLE · PAIR_OCCUPATION_TABLE · DEFAULT_OCCUPATION) · `suf.<cung Thân>.<nhóm nghề>.<f|s>` (THAN_ASPECT, bỏ ô rỗng) +
 * khuôn ghép `fmt.title` (danh xưng + hậu tố) và `fmt.name.<era>` (họ + tên — dấu nối tuỳ chữ viết từng ngôn ngữ).
 */
function loadPastLifeTen(root) {
  const f = ENGINE_NS['past-life-ten'];
  const T = tsLiteral(root, f, [
    'NAME_POOLS',
    'OCCUPATION_TABLE',
    'PAIR_OCCUPATION_TABLE',
    'DEFAULT_OCCUPATION',
    'THAN_ASPECT',
    'ERAS',
  ]);
  const out = [];
  const POOL = { ho: 12, nam: 8, nu: 8 };
  const VAI = { ho: 'HỌ', nam: 'TÊN ĐỆM-TÊN nam', nu: 'TÊN ĐỆM-TÊN nữ' };
  for (const [era, pool] of chot(Object.entries(T.NAME_POOLS), 5, `${f} NAME_POOLS`)) {
    const eraLabel = T.ERAS[era]?.label || era;
    for (const part of ['ho', 'nam', 'nu']) {
      chot(pool[part], POOL[part], `${f} NAME_POOLS.${era}.${part}`).forEach((vi, i) =>
        out.push({
          k: `name.${era}.${part}.${i}`,
          vi,
          ctx: `Tên nhân vật tiền kiếp · nền ${era} (${eraLabel}) · ${VAI[part]} · phiên theo chữ viết của ngôn ngữ đích`,
        })
      );
    }
  }
  for (const era of Object.keys(T.NAME_POOLS))
    out.push({
      k: `fmt.name.${era}`,
      vi: '{ho} {ten}',
      ctx: `Khuôn ghép họ + tên nền ${era}: chỉ viết dấu nối đúng thông lệ ngôn ngữ đích cho tên kiểu này (giữ {ho} {ten})`,
    });
  const TIERS = ['kha', 'cao', 'giua', 'thap'];
  const bang = (pre, tab, n, ten) => {
    for (const [id, tiers] of chot(Object.entries(tab), n, `${f} ${ten}`))
      for (const t of TIERS)
        for (const [g, fld] of [
          ['nam', 'titleNam'],
          ['nu', 'titleNu'],
        ])
          out.push({
            k: `title.${pre}.${id}.${t}.${g}`,
            vi: tiers[t][fld],
            ctx: `Danh xưng nghề cổ · ${ten} ${id} · bậc ${t} · ${g === 'nu' ? 'nữ' : 'nam'} · nhóm ${tiers[t].domain} · ${tiers[t].desc}`,
          });
  };
  bang('nghe', T.OCCUPATION_TABLE, 14, 'OCCUPATION_TABLE');
  bang('pair', T.PAIR_OCCUPATION_TABLE, 24, 'PAIR_OCCUPATION_TABLE');
  for (const [g, fld] of [
    ['nam', 'titleNam'],
    ['nu', 'titleNu'],
  ])
    out.push({
      k: `title.nghe.default.${g}`,
      vi: T.DEFAULT_OCCUPATION[fld],
      ctx: `Danh xưng nghề cổ · vô chính diệu · ${g === 'nu' ? 'nữ' : 'nam'} · ${T.DEFAULT_OCCUPATION.desc}`,
    });
  out.push({
    k: 'fmt.title',
    vi: '{t} {s}',
    ctx: 'Khuôn ghép danh xưng + hậu tố mảng đời (giữ {t} {s}); vd "Tuần phủ" + "ngoài trận" → viết dấu ngoặc/dấu nối đúng thông lệ',
  });
  const DOMAIN = {
    vo: 'võ',
    van: 'văn',
    quyen: 'quyền',
    thuong: 'thương',
    y: 'y',
    nghe: 'nghề',
    tu: 'tu',
  };
  for (const [cung, a] of Object.entries(T.THAN_ASPECT))
    for (const [m, fld, ten] of [
      ['f', 'suffix', 'đầy đủ'],
      ['s', 'suffixShort', 'ngắn'],
    ])
      for (const [dom, vi] of Object.entries(a[fld]))
        if (vi)
          out.push({
            k: `suf.${cung}.${dom}.${m}`,
            vi,
            ctx: `Hậu tố danh xưng (bản ${ten}) · Thân cư ${cung} · nhóm ${DOMAIN[dom] || dom} — cụm bổ nghĩa đặt SAU danh xưng, nói mảng đời nhân vật; mảng đời: ${a.aspect}`,
          });
  return out;
}

/**
 * Tầng nhánh nghề (`lib/engine/nghe-nghiep.ts`, W30f-4, trả phí): `TRUC` (21 trục × ten/cao/thap) + `NHANH` (nhánh nghề ×
 * ten/chat/viec[]). Khoá = id CHÍNH bảng; id nhánh chỉ duy nhất TRONG lĩnh vực (`hoc-thuat` có ở hai lĩnh vực) nên khoá có
 * lĩnh vực: `truc.<id>.ten|cao|thap` · `nhanh.<lĩnh vực>.<id>.ten|chat|viec.<i>`. `hinh`/`bac`/`phoThong` là dữ liệu chấm — không dịch.
 */
function loadNgheNghiep(root) {
  const f = ENGINE_NS['nghe-nghiep'];
  const T = tsLiteral(root, f, ['TRUC', 'NHANH']);
  const out = [];
  for (const [id, d] of chot(Object.entries(T.TRUC), 21, `${f} TRUC`))
    for (const [fld, ctx] of [
      ['ten', 'nhãn trục'],
      ['cao', 'mặt CAO — "nghề này đòi hỏi…"'],
      ['thap', 'mặt THẤP — chỉ đọc là "nghề KHÔNG đòi hỏi", KHÔNG BAO GIỜ là "bạn thiếu"'],
    ])
      out.push({ k: `truc.${id}.${fld}`, vi: d[fld], ctx: `Trục tính khí nghề ${id} · ${ctx}` });
  const seen = new Set();
  for (const [dom, ds] of chot(Object.entries(T.NHANH), 7, `${f} NHANH`))
    for (const n of ds) {
      if (seen.has(`${dom}.${n.id}`)) throw new Error(`${f}: id nhánh trùng ${dom}.${n.id}`);
      seen.add(`${dom}.${n.id}`);
      const c = `Nhánh nghề "${n.id}" (lĩnh vực ${dom})`;
      out.push({ k: `nhanh.${dom}.${n.id}.ten`, vi: n.ten, ctx: `${c} · tên` });
      out.push({ k: `nhanh.${dom}.${n.id}.chat`, vi: n.chat, ctx: `${c} · một câu tả chất việc` });
      n.viec.forEach((v, i) =>
        out.push({
          k: `nhanh.${dom}.${n.id}.viec.${i}`,
          vi: v,
          ctx: `${c} · việc cụ thể ở Việt Nam (bày ra làm ví dụ)`,
        })
      );
    }
  chot([...seen], 34, `${f} số nhánh`);
  return out;
}

/**
 * FNV-1a 32-bit của câu Việt → 8 hex. KHOÁ của ns `cach-cuc` (W30f-5): engine lõi `tuvi-ansao-engine.js` là JS thuần KHÔNG có id
 * cho từng câu và không được sửa (mọi lá số đi qua nó) ⇒ khoá = hash ổn định của CHÍNH câu nguồn (ngoại lệ có chủ đích của
 * quy ước "khoá = id"). Đồng bộ với `public/tools-shared/cach-cuc.js::fnv` (bộ dò `check:enginema` chạy hàm của trang).
 * KHÔNG dùng `hashVi` (sha1) — trình duyệt không có sha1 đồng bộ. Đổi câu nguồn ⇒ khoá đổi ⇒ bản dịch cũ thành mồ côi và câu
 * mới thiếu bản dịch: bộ dò đỏ cả hai chiều, đúng như mong muốn.
 */
export function fnvVi(text) {
  let h = 0x811c9dc5;
  const t = String(text);
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Luật đại vận (`phanTichDaiVanRules` trong `public/tuvi-ansao-engine.js`, W32A) → `dv.rules[].text`, hiện ở khối "Luận đoán vận
 * hạn". Cùng lối W30f-5 (engine lõi không id, không sửa): khoá `s.<fnv câu Việt>`. 3 mẫu có biến `${menhBo}`/`${dvBo}` nhận MÃ bộ
 * sao hữu hạn (TPVT · CNDL · CN — `BO_MAP` của hàm) ⇒ liệt kê đủ mọi biến thể bằng vm, client tra như câu literal. SỐ MỤC CHỐT.
 */
function loadDvRules(root) {
  const f = ENGINE_NS['dv-rules'];
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const ts = createRequire(path.join(root, 'package.json'))('typescript');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  let fn = null;
  sf.forEachChild((n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.name.text === 'phanTichDaiVanRules') fn = n;
  });
  if (!fn) throw new Error(`${f}: không thấy phanTichDaiVanRules`);
  const out = [];
  const seen = new Set();
  const add = (vi, ctx) => {
    const k = `s.${fnvVi(vi)}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ k, vi, ctx });
  };
  const BO = ['TPVT', 'CNDL', 'CN']; // bộ KHÔNG phải Sát Phá Tham (mẫu nào có biến thì biến ∈ đây — xem nhánh isM_TPVT_CN/isV_TPVT_CN)
  let nAdd = 0;
  let nMau = 0;
  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'add') {
      nAdd++;
      const arg = n.arguments[0];
      const loai =
        n.arguments[1] && ts.isStringLiteral(n.arguments[1]) ? n.arguments[1].text : 'trung';
      const ctx = `Luật đại vận (cổ pháp, rule-based) — một câu "Luận đoán vận hạn", loại ${loai}`;
      if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) add(arg.text, ctx);
      else if (ts.isTemplateExpression(arg)) {
        nMau++;
        const m = arg.getText(sf).slice(1, -1);
        const bien = [...m.matchAll(/\$\{(\w+)\}/g)].map((x) => x[1]);
        if (bien.some((b) => !['menhBo', 'dvBo'].includes(b)))
          throw new Error(`${f}: mẫu luật có biến lạ: ${m.slice(0, 70)}`);
        for (const menhBo of BO)
          for (const dvBo of BO)
            add(
              vm.runInNewContext('`' + m + '`', { menhBo, dvBo }),
              ctx + ' (TPVT/CNDL/CN là mã bộ sao — giữ nguyên)'
            );
      } else throw new Error(`${f}: đối số add() không đọc được: ${arg.getText(sf).slice(0, 70)}`);
    }
    ts.forEachChild(n, walk);
  };
  walk(fn);
  chot(Array(nAdd), DV_RULES_NADD, `${f} lệnh add() trong phanTichDaiVanRules`);
  chot(Array(nMau), 3, `${f} mẫu luật có biến \${menhBo}/\${dvBo}`);
  chot(out, DV_RULES_N, `${f} câu luật đại vận duy nhất (gồm biến thể mẫu)`);
  return out;
}
const DV_RULES_NADD = 171;

/**
 * Tổ hợp sao chéo tầng (W32A-2): `lib/agent/vanHanCombos.ts` `matchVanHanCombos` đọc `public/cach_cuc_all.json`, lấy combo ≥2 sao,
 * trả `{ten: displayName(ten, sao), loai, tomTat}` → `toHop[]` của khung 12 tháng (`/api/van-han-nam?action=khung`). Chữ đó lấy
 * NGUYÊN từ file nên liệt kê trọn được: `ten.<fnv>` = mọi tên hiển thị (tên mã `A__B` → `sao.join(' + ')`, đúng `displayName`),
 * `s.<fnv>` = `tomTat` CHƯA có trong ns `cach-cuc` (client tra `cach-cuc` trước — cùng câu với `CACH_CUC_DATA`). SỐ MỤC CHỐT.
 */
function loadToHop(root, cachCuc) {
  const f = ENGINE_NS['to-hop'];
  const raw = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  const combos = raw.filter((c) => Array.isArray(c.sao) && c.sao.length >= 2);
  chot(combos, TO_HOP_COMBO, `${f} combo ≥2 sao (loadCombos)`);
  const daCo = new Set(cachCuc.map((e) => e.vi));
  const out = [];
  const seen = new Set();
  const add = (k, vi, ctx) => {
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ k, vi, ctx });
  };
  for (const c of combos) {
    const ten = String(c.ten || '');
    const hien = !ten || /_{2,}|^[A-Z0-9_]+$/.test(ten) ? c.sao.join(' + ') : ten;
    add(`ten.${fnvVi(hien)}`, hien, `Tên tổ hợp sao (cách cục) — sao: ${c.sao.join(', ')}; giữ ngắn như một nhãn`);
  }
  for (const c of combos) {
    const t = String(c.tomTat || '');
    if (t && !daCo.has(t))
      add(`s.${fnvVi(t)}`, t, `Tóm tắt tổ hợp sao "${c.ten}" (${c.loai}) — sao: ${c.sao.join(', ')}`);
  }
  chot(out.filter((e) => e.k.startsWith('ten.')), TO_HOP_TEN, `${f} tên tổ hợp hiển thị duy nhất`);
  chot(out.filter((e) => e.k.startsWith('s.')), TO_HOP_TT, `${f} tóm tắt chưa có ở cach-cuc`);
  return out;
}
const TO_HOP_COMBO = 643;
const TO_HOP_TEN = 584;
const TO_HOP_TT = 162;
const DV_RULES_N = 183;

/**
 * Câu ý nghĩa từng cung (`phanTichCungYNghia` trong `public/tuvi-ansao-engine.js`, W30f-5): ~375 literal `out.push('…')` /
 * `notes.push('…')` + 4 mẫu template (Tuần/Triệt, mỗi mẫu 2 biến thể "đang/chưa tác dụng", có biến `{dc}` = địa chi). Khoá
 * `s.<fnv>` cho literal, `t.<tên>.<on|off>` cho mẫu. Trích bằng regex trên ĐÚNG thân hàm, mẫu template thì ĐÁNH GIÁ bằng vm
 * (không chép tay). SỐ MỤC CHỐT — đọc hụt (engine đổi bố cục) ⇒ ném lỗi chứ không kiểm danh sách cụt.
 */
const CACH_CUC_NLIT = 383; // đo trên engine: 379 lệnh push (có nhánh ?:) → 383 câu literal duy nhất
function loadCachCuc(root) {
  const f = ENGINE_NS['cach-cuc'];
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const ts = createRequire(path.join(root, 'package.json'))('typescript');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  let fn = null;
  sf.forEachChild((n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.name.text === 'phanTichCungYNghia') fn = n;
  });
  if (!fn) throw new Error(`${f}: không thấy phanTichCungYNghia`);
  const out = [];
  const seen = new Map();
  const add = (k, vi, ctx) => {
    if (seen.has(k) && seen.get(k) !== vi)
      throw new Error(`${f}: trùng khoá ${k} cho hai câu khác nhau`);
    if (seen.has(k)) return;
    seen.set(k, vi);
    out.push({ k, vi, ctx });
  };
  // Mọi nhánh chuỗi của đối số `out.push(...)`/`notes.push(...)`: literal · `c ? 'A' : 'B'` · nối `+`. Gặp biểu thức lạ ⇒ ném lỗi
  // (không đọc hụt). Template có `${…}` (mẫu Tuần/Triệt) xử lý riêng bên dưới bằng vm.
  const variants = (n) => {
    if (ts.isParenthesizedExpression(n)) return variants(n.expression);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return [n.text];
    if (ts.isConditionalExpression(n)) return [...variants(n.whenTrue), ...variants(n.whenFalse)];
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return variants(n.left).flatMap((x) => variants(n.right).map((y) => x + y));
    throw new Error(
      `${f}: đối số push không đọc được (${ts.SyntaxKind[n.kind]}): ${n.getText(sf).slice(0, 70)}`
    );
  };
  const mau = [];
  let nPush = 0;
  let nTheoBang = 0;
  const walk = (n) => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === 'push' &&
      ts.isIdentifier(n.expression.expression) &&
      ['out', 'notes'].includes(n.expression.expression.text)
    ) {
      const arg = n.arguments[0];
      if (arg && ts.isTemplateExpression(arg)) mau.push(arg.getText(sf).slice(1, -1));
      else if (arg && ts.isIdentifier(arg) && ['t', 'n'].includes(arg.text))
        nTheoBang++; // t = bảng CACH_CUC_DATA, n = tuanTrietNote (mẫu) — đọc ở dưới
      else {
        nPush++;
        for (const vi of variants(arg))
          add(`s.${fnvVi(vi)}`, vi, 'Ý nghĩa cung (cổ pháp, rule-based) — một câu do engine sinh');
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(fn);
  chot(Array(nTheoBang), 24, `${f} lệnh push dữ liệu bảng/mẫu (đối số t hoặc n)`);
  chot(Array(nPush), 379, `${f} lệnh out.push/notes.push (không tính 4 template)`);
  chot(
    out.filter((e) => e.k.startsWith('s.')),
    CACH_CUC_NLIT,
    `${f} câu literal duy nhất trong phanTichCungYNghia`
  );
  const TEN = ['tuan-hoa', 'triet-kim', 'tuan-an', 'triet-an'];
  chot(mau, 4, `${f} mẫu template notes.push`);
  const THU_TU = ['Tuần lâm hỏa địa', 'Tuần án ngữ', 'Triệt đáo kim cung', 'Triệt án ngữ'];
  mau.forEach((m, i) => {
    if (!m.startsWith(THU_TU[i]))
      throw new Error(`${f}: mẫu #${i} không bắt đầu bằng "${THU_TU[i]}" — thứ tự đổi`);
    const ten = m.startsWith('Tuần lâm')
      ? 'tuan-hoa'
      : m.startsWith('Triệt đáo')
        ? 'triet-kim'
        : m.startsWith('Tuần án')
          ? 'tuan-an'
          : 'triet-an';
    for (const [on, active] of [
      ['on', true],
      ['off', false],
    ]) {
      const vi = vm.runInNewContext('`' + m + '`', { dc: '{dc}', active });
      add(
        `t.${ten}.${on}`,
        vi,
        `Tuần/Triệt tại cung — ${on === 'on' ? 'đang tác dụng' : 'chưa/hết tác dụng'}${/\{dc\}/.test(vi) ? ' (giữ {dc} = địa chi)' : ''}`
      );
    }
  });
  void TEN;
  // Bảng mẫu cách cục `CACH_CUC_DATA` (748 mẫu JSON một dòng): `matchCachCucData` trả `"[" + s.join(", ") + "] " + t`. Câu `t`
  // (725 câu duy nhất) → `s.<fnv>`; tên sao trong ngoặc (138 tên, nhiều tên VIẾT TẮT như Quyền/Kỵ/Cơ/Đồng — glossary không có)
  // → `n.<tên>` để client dịch tiền tố độc lập với câu.
  // ── `phanTichCachCuc` (ls.cachCuc[]): `add(loai, ten, moTa, chiTiet, cung)` — HIỆN `ten` + `moTa` (Chân Dung Tiền Kiếp/Vợ
  // Chồng, Luận Giải); `chiTiet` toàn mẫu có biến chỉ để đối chiếu/prompt ⇒ không dịch. `ten` luôn là literal; `moTa` literal
  // (có 4 nhánh `?:`) hoặc 3 mẫu có biến (địa chi/cung) ⇒ `t.<tên>`.
  let fnCC = null;
  sf.forEachChild((n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.name.text === 'phanTichCachCuc') fnCC = n;
  });
  if (!fnCC) throw new Error(`${f}: không thấy phanTichCachCuc`);
  let nAdd = 0;
  const mauCC = [];
  const walkCC = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'add') {
      nAdd++;
      const [, ten, moTa] = n.arguments;
      for (const vi of variants(ten))
        add(`s.${fnvVi(vi)}`, vi, 'Cách cục có tên (ls.cachCuc[]) — TÊN cách cục');
      if (ts.isTemplateExpression(moTa)) mauCC.push(moTa.getText(sf).slice(1, -1));
      else
        for (const vi of variants(moTa))
          add(`s.${fnvVi(vi)}`, vi, 'Cách cục có tên (ls.cachCuc[]) — một câu mô tả');
    }
    ts.forEachChild(n, walkCC);
  };
  walkCC(fnCC);
  chot(Array(nAdd), 107, `${f} lệnh add() trong phanTichCachCuc`);
  chot(mauCC, 3, `${f} mẫu moTa có biến trong phanTichCachCuc`);
  const TEN_CC = ['triet-thuong', 'tuan-thuong', 'hoaky-sat'];
  const KHOI_DAU = ['Triệt đóng thường trú', 'Tuần đóng thường trú', 'Hóa Kỵ đóng cùng'];
  mauCC.forEach((m, i) => {
    if (!m.startsWith(KHOI_DAU[i]))
      throw new Error(`${f}: mẫu moTa #${i} không bắt đầu bằng "${KHOI_DAU[i]}" — thứ tự đổi`);
    const vi = vm.runInNewContext('`' + m + '`', {
      dcListTK: '{dc}',
      dcListTH: '{dc}',
      hoaKyPalace: { cungName: '{cung}' },
    });
    add(
      `t.${TEN_CC[i]}`,
      vi,
      'Cách cục có tên — mẫu mô tả có biến (giữ {dc} = danh sách địa chi, {cung} = tên cung)'
    );
  });
  const dm = /const CACH_CUC_DATA = (\[.*\]);\n/.exec(src);
  if (!dm) throw new Error(`${f}: không thấy CACH_CUC_DATA`);
  const data = JSON.parse(dm[1]);
  chot(data, 748, `${f} CACH_CUC_DATA`);
  const tenSao = new Set();
  for (const p of data) {
    add(`s.${fnvVi(p.t)}`, p.t, `Cách cục (bảng CACH_CUC_DATA, ${p.c}) — một câu tóm tắt`);
    for (const n of p.s || []) tenSao.add(n);
  }
  chot([...tenSao], 138, `${f} tên sao trong CACH_CUC_DATA`);
  for (const n of tenSao)
    add(
      `n.${n}`,
      n,
      'Tên sao (có thể VIẾT TẮT) trong ngoặc đầu câu cách cục — nhãn ngắn, dịch theo tên đầy đủ trong glossary; tên tắt mơ hồ (Lộc, Quyền, Kỵ) thì chọn nhãn chung'
    );
  return out;
}

function loadHuongNghiepTre(root) {
  const f = ENGINE_NS.hntre;
  const T = tsLiteral(root, f, [
    'LOP',
    'XUNG_HO_NGUOI_LON',
    'MOI_LO',
    'THIEN_HUONG',
    'CHAT_KHONG_DOI_HOI',
    'MAT_DOC',
  ]);
  const out = [];
  for (const [id, d] of chot(Object.entries(T.LOP), 4, `${f} LOP`)) {
    out.push({
      k: `lop.${id}.ten`,
      vi: d.ten,
      ctx: `Lứa tuổi ${id} · tên lứa (huy hiệu đầu trang)`,
    });
    out.push({ k: `lop.${id}.tuoi`, vi: d.tuoi, ctx: `Lứa tuổi ${id} · khoảng tuổi (tuổi mụ)` });
    out.push({
      k: `lop.${id}.vaiChaMe`,
      vi: d.vaiChaMe,
      ctx: `Lứa tuổi ${id} · việc của người lớn (dòng dưới tên)`,
    });
    out.push({
      k: `lop.${id}.xungho`,
      vi: d.xungHo,
      ctx: `Lứa tuổi ${id} · cách gọi đứa trẻ, thế vào {ai} ("cháu"/"con" ≈ đứa trẻ này)`,
    });
  }
  out.push({
    k: 'xungho.nguoi-lon',
    vi: T.XUNG_HO_NGUOI_LON,
    ctx: 'Cách gọi khi lá số KHÔNG còn là trẻ em, thế vào {ai} (ngôi trung tính)',
  });
  for (const [id, d] of chot(Object.entries(T.MOI_LO), 6, `${f} MOI_LO`))
    out.push({
      k: `moilo.${id}.label`,
      vi: d.label,
      ctx: 'Điều cha mẹ đang lo · nhãn (tiêu đề khối)',
    });
  for (const [id, h] of chot(Object.entries(T.THIEN_HUONG), 9, `${f} THIEN_HUONG`)) {
    const c = `Thiên hướng "${h.ten}" (${id})`;
    out.push({ k: `huong.${id}.ten`, vi: h.ten, ctx: `${c} · tên` });
    out.push({ k: `huong.${id}.chat`, vi: h.chat, ctx: `${c} · một câu tả đứa trẻ` });
    h.dauHieu.forEach((v, i) =>
      out.push({
        k: `huong.${id}.dauHieu.${i}`,
        vi: v,
        ctx: `${c} · dấu hiệu quan sát ở nhà (chip)`,
      })
    );
    for (const l of Object.keys(T.LOP))
      h.hoatDong[l].forEach((v, i) =>
        out.push({
          k: `huong.${id}.hd.${l}.${i}`,
          vi: v,
          ctx: `${c} · hoạt động cho lứa ${l} (${T.LOP[l].tuoi})`,
        })
      );
    out.push({ k: `huong.${id}.chaMeNen`, vi: h.chaMeNen, ctx: `${c} · việc người lớn NÊN làm` });
    out.push({
      k: `huong.${id}.chaMeTranh`,
      vi: h.chaMeTranh,
      ctx: `${c} · việc người lớn nên TRÁNH`,
    });
    out.push({
      k: `huong.${id}.deBiHieuNham`,
      vi: h.deBiHieuNham,
      ctx: `${c} · chỗ hay bị hiểu nhầm`,
    });
    out.push({
      k: `huong.${id}.chatViec`,
      vi: h.chatViec,
      ctx: `${c} · chất việc về sau (không nêu tên nghề)`,
    });
    h.ngheViDu.forEach((v, i) =>
      out.push({
        k: `huong.${id}.nghe.${i}`,
        vi: v,
        ctx: `${c} · nghề ví dụ (chip, chỉ để hình dung)`,
      })
    );
  }
  for (const [id, vi] of chot(Object.entries(T.CHAT_KHONG_DOI_HOI), 8, `${f} CHAT_KHONG_DOI_HOI`))
    out.push({
      k: `kdh.${id}`,
      vi,
      ctx: `Việc hợp với đứa trẻ KHÔNG đòi hỏi chiều "${id}" — câu KHUÔN, giữ nguyên token {ai}`,
    });
  for (const m of chot(T.MAT_DOC, 4, `${f} MAT_DOC`))
    out.push({ k: `matdoc.${m.ma}.nhan`, vi: m.nhan, ctx: `Cơ sở lá số · mặt đọc cung ${m.cung}` });
  return out;
}

/**
 * Công Sở (`lib/engine/cong-so.ts`, W30b). Bảng nằm LẪN trong file engine (import laso/past-life…) nên không nạp được
 * bằng Node 20 ⇒ đọc bằng AST TypeScript (`typescript` là devDependency) và ĐÁNH GIÁ literal — chính xác hơn regex.
 * Chỉ lấy chữ có CHỖ VẼ (vd `nacY` không ai thấy ⇒ không vào). Mỗi bảng có SỐ MỤC CHỐT.
 */
function loadCongSo(root) {
  const f = ENGINE_NS['cong-so'];
  const require = createRequire(path.join(root, 'package.json'));
  const ts = require('typescript');
  const src = ts.createSourceFile(
    f,
    fs.readFileSync(path.join(root, f), 'utf8'),
    ts.ScriptTarget.ES2022,
    true
  );
  const ev = (n) => {
    if (ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) return ev(n.expression);
    if (ts.isStringLiteralLike(n)) return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(ev);
    if (ts.isObjectLiteralExpression(n)) {
      const o = {};
      for (const p of n.properties) {
        if (!ts.isPropertyAssignment(p)) throw new Error(`${f}: thuộc tính lạ trong literal`);
        o[ts.isStringLiteralLike(p.name) || ts.isIdentifier(p.name) ? p.name.text : '?'] = ev(
          p.initializer
        );
      }
      return o;
    }
    throw new Error(
      `${f}: biểu thức không phải literal (${ts.SyntaxKind[n.kind]}) — sửa loadCongSo`
    );
  };
  const bang = (name) => {
    let v;
    src.forEachChild((st) => {
      if (!ts.isVariableStatement(st)) return;
      for (const d of st.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer) v = ev(d.initializer);
    });
    if (v === undefined) throw new Error(`${f}: không thấy bảng ${name}`);
    return v;
  };
  const out = [];
  const add = (k, vi, ctx) => out.push({ k, vi, ctx });
  const nKeys = (o, n, what) => chot(Object.keys(o), n, `${f} ${what}`);

  const KIEU = bang('KIEU');
  for (const id of nKeys(KIEU, 4, 'KIEU')) {
    const d = KIEU[id];
    for (const fld of [
      'tuTuong',
      'motCau',
      'dongLuc',
      'datChat',
      'kieuDan',
      'moiTruongHop',
      'moiTruongKy',
      'manh',
      'yeu',
      'source',
    ])
      add(`kieu.${id}.${fld}`, d[fld], `Công Sở · kiểu "${d.ten}" · ${fld}`);
    for (const fld of ['cauHoi', 'baiHoc']) {
      chot(d[fld], 4, `${f} KIEU.${id}.${fld}`).forEach((v, i) =>
        add(`kieu.${id}.${fld}.${i}`, v, `Công Sở · kiểu "${d.ten}" · ${fld} #${i + 1}`)
      );
    }
  }
  const TT = bang('TRANG_THAI_LABEL');
  for (const k of nKeys(TT, 5, 'TRANG_THAI_LABEL'))
    add(`tt.${k}`, TT[k], `Công Sở · tình trạng nghề nghiệp (nhãn ô chọn)`);
  const LOI = bang('LOI_THEO_TRANG_THAI');
  for (const tt of nKeys(LOI, 5, 'LOI_THEO_TRANG_THAI'))
    for (const k of nKeys(LOI[tt], 4, `LOI.${tt}`))
      add(
        `loi.${tt}.${k}`,
        LOI[tt][k],
        `Công Sở · lời khuyên cho "${TT[tt]}" × kiểu "${KIEU[k].ten}"`
      );
  for (const r of chot(bang('RADAR_CUNG'), 12, `${f} RADAR_CUNG`)) {
    add(`radar.${r.cung}.nhan`, r.nhan, `Công Sở · radar 12 mặt · nhãn của cung ${r.cung}`);
    add(`radar.${r.cung}.y`, r.y, `Công Sở · radar 12 mặt · "nó nói về" của cung ${r.cung}`);
  }
  chot(bang('NAC_NGHE'), 4, `${f} NAC_NGHE`).forEach((n, i) =>
    add(`nac.${i + 1}`, n.ten, `Công Sở · tên chặng đời nghề thứ ${i + 1}/4`)
  );
  for (const v of chot(bang('VAI_CUNG'), 3, `${f} VAI_CUNG`))
    add(`doi.${v.cung}`, v.vai, `Công Sở · ghép đội · vai ứng cung ${v.cung}`);
  const DN = bang('DOMAIN_NGANH');
  for (const dm of nKeys(DN, 7, 'DOMAIN_NGANH')) {
    add(`nganh.${dm}.linhVuc`, DN[dm].linhVuc, `Công Sở · lĩnh vực nhóm "${dm}" · tên`);
    add(`nganh.${dm}.chatViec`, DN[dm].chatViec, `Công Sở · lĩnh vực nhóm "${dm}" · chất việc`);
    chot(DN[dm].nganh, 6, `${f} DOMAIN_NGANH.${dm}.nganh`).forEach((v, i) =>
      add(`nganh.${dm}.n.${i}`, v, `Công Sở · ngành nghề gợi ý nhóm "${dm}" #${i + 1}`)
    );
  }
  const VK = bang('VAI_THEO_KIEU');
  for (const k of nKeys(VK, 4, 'VAI_THEO_KIEU'))
    add(`vai.${k}`, VK[k], `Công Sở · vai nên nhận trong ngành · kiểu "${KIEU[k].ten}"`);
  const QM = bang('QUY_MO_THEO_BAC');
  for (const k of nKeys(QM, 4, 'QUY_MO_THEO_BAC'))
    add(`quymo.${k}`, QM[k], `Công Sở · quy mô gánh được · bậc "${k}"`);
  const LN = bang('LUAN_NAC');
  for (const k of nKeys(LN, 5, 'LUAN_NAC'))
    add(
      `luan.${k}`,
      LN[k],
      `Công Sở · luận một chặng đại vận (khuôn; {nac} = tên chặng viết thường)`
    );
  const GH = bang('GHEP');
  for (const k of nKeys(GH, 7, 'GHEP'))
    add(
      `ghep.${k}`,
      GH[k],
      `Công Sở · gợi ý ghép đội (khuôn; {kieu} = kiểu người của cung, {nen} = kiểu nên tìm để bù — viết thường)`
    );
  return out;
}

/**
 * Dạy Con (W30c) — chữ HIỂN THỊ do `lib/engine/day-con.ts` + `day-con-hoat-dong.ts` viết. Khoá = MÃ có sẵn trong payload
 * (`band`, `kieu.id`/`hoc.kieu`, `moiLo.id`, `matDoc[].cung`, `changHoc[].nhanMa`, chỉ số `dauHieu`) — engine KHÔNG đổi chữ.
 * CỐ Ý ngoài nguồn: `HOAT_DONG` (192 tên lớp/trò chơi — trang chỉ hiện SỐ LƯỢNG, tên chỉ vào prompt), `MOI_LO.can`,
 * `MAT_DOC.y` (chỉ vào rail/prompt) — dịch chữ không ai thấy là chữ chết. `oLop`/`chuY`/`dauHieu` của 8 chất là của ns assess.
 */
function loadDayCon(root) {
  const fh = 'lib/engine/day-con-hoat-dong.ts';
  const fd = ENGINE_NS.daycon;
  const th = fs.readFileSync(path.join(root, fh), 'utf8');
  const td = fs.readFileSync(path.join(root, fd), 'utf8');
  const S = `'((?:[^'\\\\]|\\\\.)*)'`; // literal '…' một dòng (có \' )
  const un = (lit) => vm.runInNewContext(`'${lit}'`);
  const out = [];
  const push = (k, vi, ctx) => out.push({ k, vi: un(vi), ctx });

  // BAND_LABEL — nhóm tuổi (id = `h.band`)
  const band = [
    ...tsBlock(th, 'BAND_LABEL', fh).matchAll(new RegExp(`'([\\w-]+)':\\s*${S},`, 'g')),
  ];
  for (const [, id, vi] of chot(band, 4, `${fh} BAND_LABEL`))
    push(`band.${id}`, vi, `Dạy Con · nhóm tuổi hoạt động ${id}`);

  // DINH_DANG — 3 câu × 4 kiểu (id kiểu = `kieu.id`)
  let kieu = null;
  let nDd = 0;
  const reDd = new RegExp(`^  '([\\w-]+)': \\{|^    (nen|tranh|batDau):\\s*${S},`, 'gm');
  for (const m of tsBlock(th, 'DINH_DANG', fh).matchAll(reDd)) {
    if (m[1]) kieu = m[1];
    else {
      nDd++;
      push(`dd.${kieu}.${m[2]}`, m[3], `Dạy Con · cách tham gia · kiểu ${kieu} · ${m[2]}`);
    }
  }
  chot(Array(nDd), 12, `${fh} DINH_DANG`);

  // MOI_LO.label — "điều bạn đang lo" (chỉ nhãn; `can` chỉ vào prompt)
  const lo = [
    ...tsBlock(td, 'MOI_LO', fd).matchAll(
      new RegExp(`^  '([\\w-]+)': \\{\\s*\\n\\s*id: '[^']+',\\s*\\n\\s*label:\\s*${S},`, 'gm')
    ),
  ];
  for (const [, id, vi] of chot(lo, 6, `${fd} MOI_LO`))
    push(`moilo.${id}.label`, vi, `Dạy Con · điều cha mẹ đang lo ${id} (tiêu đề khối)`);

  // KIEU_HOC — 6 thẻ cách dạy + 4 dấu hiệu, × 4 kiểu
  kieu = null;
  let nHoc = 0;
  let nDh = 0;
  const reHoc = new RegExp(
    `^  '([\\w-]+)': \\{|^    (tiepThu|giaoViec|dongVien|kyLuatHong|hieuNham|canHoc):\\s*${S},|^    dauHieu: \\[([\\s\\S]*?)\\n    \\],`,
    'gm'
  );
  for (const m of tsBlock(td, 'KIEU_HOC', fd).matchAll(reHoc)) {
    if (m[1]) kieu = m[1];
    else if (m[2]) {
      nHoc++;
      push(`hoc.${kieu}.${m[2]}`, m[3], `Dạy Con · cách dạy · kiểu ${kieu} · thẻ ${m[2]}`);
    } else {
      [...m[4].matchAll(new RegExp(`^\\s+${S},`, 'gm'))].forEach((e, i) => {
        nDh++;
        push(`hoc.${kieu}.dh.${i}`, e[1], `Dạy Con · dấu hiệu ở nhà ${i + 1} · kiểu ${kieu}`);
      });
    }
  }
  chot(Array(nHoc), 24, `${fd} KIEU_HOC (6 thẻ × 4 kiểu)`);
  chot(Array(nDh), 16, `${fd} KIEU_HOC dauHieu (4 × 4 kiểu)`);

  // MAT_DOC.nhan — nhãn 5 mặt đọc (khoá = tên cung; `y` chỉ vào rail)
  const mat = [
    ...tsBlock(td, 'MAT_DOC', fd).matchAll(new RegExp(`\\{ cung: '([^']+)', nhan: ${S},`, 'g')),
  ];
  for (const [, cung, vi] of chot(mat, 5, `${fd} MAT_DOC`))
    push(`mat.${cung}.nhan`, vi, `Dạy Con · mặt đọc cung ${cung} (nhãn)`);

  // NHAN_CHANG — nhãn chặng đi học (khoá = `changHoc[].nhanMa`)
  const mc = /const NHAN_CHANG = \{([\s\S]*?)\n\} as const;/.exec(td);
  if (!mc) throw new Error(`${fd}: không thấy bảng NHAN_CHANG`);
  const ch = [...mc[1].matchAll(new RegExp(`'([\\w-]+)':\\s*${S},`, 'g'))];
  for (const [, id, vi] of chot(ch, 4, `${fd} NHAN_CHANG`))
    push(`chang.${id}`, vi, `Dạy Con · nhãn chặng đi học ${id}`);
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
    out.push({
      k: `dt.${han}.nghia`,
      vi: nghia,
      ctx: `Lục Nhâm · nghĩa dạng truyền ${han} "${ten}"`,
    });
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

/**
 * Bảng KHUÔN phẳng `{ 'khoá': 'câu', … }` của một engine (W28 loại b — engine dựng chữ Việt bằng chính bảng này).
 * Khoá giữ nguyên làm khoá dịch. `vi` có `{x}` ⇒ bản dịch phải giữ đủ token (check:i18nlong).
 */
function loadKhuon(root, ns, bang, n, ctx) {
  const f = ENGINE_NS[ns];
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const r = chot(
    [...tsBlock(ts, bang, f).matchAll(/^\s*'([^']+)': '([^']*)',?$/gm)],
    n,
    `${f} ${bang}`
  );
  return r.map(([, k, vi]) => ({
    k,
    vi,
    ctx: `${ctx} · ${k}${/\{\w+\}/.test(vi) ? ' (giữ {token})' : ''}${/\.tre\b/.test(k) ? ' · nói với PHỤ HUYNH về đứa trẻ' : ''}`,
  }));
}

/**
 * Lá Số Người Khác (`lib/engine/nguoi-khac.ts`): CHỈ chữ engine có chỗ vẽ — nhãn 5 mặt đọc (`mat.<cung>`), tiêu đề
 * khối khoá (`NK_VAN`) + nhãn việc rút gọn mà tiêu đề "Cách đi cho việc" lồng vào (`viec.<id>`). `y` của mặt đọc,
 * `nhuCau`/`can`, `THAN_Y` chỉ vào prompt/rail ⇒ KHÔNG dịch. Nhãn quan hệ/việc ĐẦY ĐỦ đã dịch ở trang (`js.nguoikhac`).
 */
function loadNguoiKhac(root) {
  const f = ENGINE_NS.nguoikhac;
  const ts = fs.readFileSync(path.join(root, f), 'utf8');
  const out = [];
  const mat = chot(
    [...tsBlock(ts, 'MAT_DOC', f).matchAll(/\{ cung: '([^']+)', nhan: '([^']+)'/g)],
    5,
    `${f} MAT_DOC`
  );
  for (const [, cung, nhan] of mat)
    out.push({
      k: `mat.${cung}`,
      vi: nhan,
      ctx: `Lá Số Người Khác · nhãn mặt đọc (cung ${cung}), cũng viết thường trong câu`,
    });
  // Cùng phép rút gọn với `khoiKhoa` (bỏ "Sắp |Phải |Cần |Muốn " đầu nhãn). 'hieu-them' không có khối kế hoạch.
  const viec = chot(
    [
      ...tsBlock(ts, 'VIEC_CAN_LAM', f).matchAll(
        /^\s*'?([a-z-]+)'?: \{\n\s*id: '[a-z-]+',\n\s*label: '([^']+)'/gm
      ),
    ],
    10,
    `${f} VIEC_CAN_LAM`
  );
  for (const [, id, label] of viec)
    if (id !== 'hieu-them')
      out.push({
        k: `viec.${id}`,
        vi: label.replace(/^Sắp |^Phải |^Cần |^Muốn /, ''),
        ctx: `Lá Số Người Khác · việc người hỏi cần làm, dạng RÚT GỌN lồng sau "Cách đi cho việc:"`,
      });
  return out.concat(
    loadKhuon(root, 'nguoikhac', 'NK_VAN', 10, 'Lá Số Người Khác · tiêu đề khối đang khoá')
  );
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
    (k) =>
      `${JSON.stringify(k)}:${JSON.stringify(
        // `same` = CHỦ Ý giữ nguyên chữ gốc (tên riêng Latin ở bản en…) — bộ dò không coi là "chưa dịch".
        data[k].same ? { t: data[k].t, h: data[k].h, same: 1 } : { t: data[k].t, h: data[k].h }
      )}`
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
