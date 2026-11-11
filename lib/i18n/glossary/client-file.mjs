// lib/i18n/glossary/client-file.mjs — dựng NỘI DUNG `public/tools-shared/glossary.js` từ bảng thuật ngữ (W15).
//
// Một nguồn: `scripts/gen-glossary.mjs` gọi hàm này với đúng mảng nó vừa sinh ra cho
// `terms.generated.mjs` rồi ghi file client; `scripts/check-glossary.mjs` gọi lại với
// `GENERATED_TERMS` và so từng byte với file đang commit (lệch ⇒ đỏ). Không sửa tay file client.
//
// Client chỉ đổi lớp HIỂN THỊ: engine (`tuvi-ansao-engine.js`) giữ tên tiếng Việt làm khoá nội bộ,
// chuỗi gửi LLM giữ tiếng Việt. Ngôn ngữ đọc từ `window.I18n.locale` (public/tools-shared/i18n.js) —
// không đọc locale thứ hai.

/** Thứ tự cột trong dữ liệu client (vi là khoá, không nằm trong mảng). */
export const CLIENT_COLS = ['en', 'zh-tw', 'zh-cn', 'ja', 'ko'];

export function clientGlossaryJs(terms) {
  const data = {};
  for (const t of terms) {
    (data[t.k] ||= {})[t.vi] = CLIENT_COLS.map((c) => t[c]);
  }
  const rows = Object.entries(data)
    .map(
      ([k, m]) =>
        `    ${JSON.stringify(k)}: {\n` +
        Object.entries(m)
          .map(([vi, v]) => `      ${JSON.stringify(vi)}: ${JSON.stringify(v)},`)
          .join('\n') +
        '\n    },'
    )
    .join('\n');
  return `// public/tools-shared/glossary.js — SINH bằng scripts/gen-glossary.mjs (lib/i18n/glossary/client-file.mjs)
// từ lib/i18n/glossary/tuvi-terms.ts — ĐỪNG sửa tay; check:glossary so file này với nguồn.
//
// Tra thuật ngữ Tử Vi (tên sao/cung/can chi…) cho LỚP HIỂN THỊ bảng lá số:
//   TuviGlossary.term('ja', 'chinh', 'Thiên Cơ')  → '天機'   (thiếu ⇒ trả nguyên tiếng Việt)
//   TuviGlossary.t(['chinh', 'sao'], s.ten)       → theo I18n.locale; 'vi' trả NGUYÊN chuỗi vào
//   TuviGlossary.t('chi', 'Tý', { short: true })  → bản ngắn cho ô hẹp (en bỏ "(Rat)", " Palace")
//   TuviGlossary.t('sang', 'Miếu', { abbr: true }) → chữ tắt trong ô: Hán/Hàn giữ nguyên (1 chữ), en lấy chữ cái đầu
// Engine giữ tên tiếng Việt làm KHOÁ; chuỗi gửi LLM giữ tiếng Việt — chỉ gọi file này ở chỗ VẼ.
(function () {
  'use strict';

  var COLS = ${JSON.stringify(CLIENT_COLS)};
  var T = {
${rows}
  };
  var miss = {};

  function locale() {
    var l = window.I18n && window.I18n.locale;
    return l && COLS.indexOf(l) >= 0 ? l : 'vi';
  }

  function shortOf(loc, s) {
    if (loc !== 'en') return s;
    return s.replace(/\\s*\\([^)]*\\)$/, '').replace(/\\s+Palace$/, '');
  }

  // kind: một loại hoặc mảng loại thử lần lượt (chính tinh rồi phụ tinh…).
  function term(loc, kind, vi, opts) {
    if (loc === 'vi' || vi == null || vi === '') return vi;
    var col = COLS.indexOf(loc);
    if (col < 0) return vi;
    var kinds = typeof kind === 'string' ? [kind] : kind;
    for (var i = 0; i < kinds.length; i++) {
      var row = T[kinds[i]] && T[kinds[i]][vi];
      if (!row) continue;
      var v = opts && (opts.short || opts.abbr) ? shortOf(loc, row[col]) : row[col];
      return opts && opts.abbr && loc === 'en' ? v.charAt(0).toUpperCase() : v;
    }
    var key = kinds.join('/') + '|' + vi;
    if (!miss[key]) {
      miss[key] = 1;
      try {
        console.warn('[glossary] thiếu thuật ngữ ' + key + ' (' + loc + ')');
      } catch (e) {
        /* console không có: bỏ qua */
      }
    }
    return vi;
  }

  window.TuviGlossary = {
    locale: locale,
    term: term,
    t: function (kind, vi, opts) {
      return term(locale(), kind, vi, opts);
    },
    missing: function () {
      return Object.keys(miss);
    },
  };
})();
`;
}
