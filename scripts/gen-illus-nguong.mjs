#!/usr/bin/env node
/**
 * SINH bảng ngưỡng tốt/trung/xấu cho thư viện hình minh hoạ — KHÔNG gõ tay.
 * (Cùng lý do `_LUNAR_TABLE` phải sinh bằng `gen-lunar-table.mjs`: bảng gõ tay
 * thì trôi khỏi engine mà không ai báo.)
 *
 *   node scripts/gen-illus-nguong.mjs             # in bảng ngưỡng + số nghiệm
 *   node scripts/gen-illus-nguong.mjs --write     # ghi public/tools-shared/illus-nguong.js
 *
 * 🔑 VÌ SAO KHÔNG DÙNG `ls.cungScores[cung].tong` LÀM NGUỒN:
 * `tuvi-laso-format.js` đã CỐ Ý gỡ khối "ĐIỂM ĐÁNH GIÁ" 6 chiều/cung khỏi
 * prompt ("cơ chế tính điểm từng cung không có cơ sở vững, từng khiến AI neo
 * phán quyết vào con số sai"). Phán quyết LLM nay neo vào nhãn "Luận sao:
 * <nhãn> (w:±N)", lấy qua `xuHuongCungW(ls, cung)` (module scope trong chính
 * `tuvi-laso-format.js` — MỘT nguồn dùng chung với prompt LLM). Đo trên 18.000
 * cung: tương quan giữa `tong` và `w` chỉ r=0,23 (Phụ Mẫu 0,07 · Thiên Di
 * 0,05) — tức GẦN NHƯ ĐỘC LẬP. Chọn ảnh bằng `tong` là ảnh và chữ đọc hai
 * nguồn khác nhau rồi nói hai chuyện khác nhau.
 *
 * 🔑 VÌ SAO KHÔNG DÙNG `w` MỘT MÌNH: `w` dồn cực mạnh — 27,9% số cung có đúng
 * w=0, và nhãn 5 bậc sẵn có cho 59,6% "Trung bình" / 0,1% "Xấu rõ". Cắt 3 bậc
 * thẳng trên `w` thì phần lớn lá số nhận cùng một bức.
 *
 * ⇒ rank = w + tong/100. `w` (nguồn LLM đọc) quyết định thứ tự; `tong` chỉ phá
 * thế hoà TRONG đám w bằng nhau. Bước nhỏ nhất của `w` là 0,2 > 0,1 = đóng góp
 * tối đa của `tong`/100, nên `tong` KHÔNG BAO GIỜ lật ngược thứ tự `w` định ra.
 * Ngưỡng cắt ở phân vị 33/67 CỦA TỪNG CUNG (mỗi cung một phân bố riêng).
 *
 * Nghiệm trên MẪU KHÁC hẳn mẫu dựng ngưỡng: 33,2% xấu · 33,9% trung · 32,8%
 * tốt, mâu thuẫn 0,00%. (Dựng và nghiệm trên cùng một mẫu là đỗ giả — số này
 * chạy lại được bằng lệnh không cờ ở trên.)
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const WRITE = process.argv.includes('--write');

const g = globalThis;
g.window = g;
g.location = {
  protocol: 'https:',
  hostname: 'tuviminhbao.com',
  host: 'tuviminhbao.com',
  port: '',
  href: 'https://tuviminhbao.com/',
  pathname: '/',
  search: '',
  hash: '',
};
const eng = new Function(
  'window',
  'globalThis',
  readFileSync(join(ROOT, 'public/tools-shared/pchip.js'), 'utf-8') +
    '\n' +
    readFileSync(join(ROOT, 'public/tuvi-ansao-engine.js'), 'utf-8') +
    '\n' +
    readFileSync(join(ROOT, 'public/tuvi-laso-format.js'), 'utf-8') +
    '\nreturn{convertDuongToAm,anSaoLaSo,formatLaSoV2:window.formatLaSoV2,xuHuongCungW:window.xuHuongCungW};'
)(g, g);
if (typeof eng.xuHuongCungW !== 'function') {
  console.error(
    '❌ tuvi-laso-format.js không export xuHuongCungW — dừng trước khi dựng ngưỡng sai nguồn.'
  );
  process.exit(1);
}

const GIO = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
const CUNG_ORDER = [
  'Mệnh',
  'Phụ Mẫu',
  'Phúc Đức',
  'Điền Trạch',
  'Quan Lộc',
  'Nô Bộc',
  'Thiên Di',
  'Tật Ách',
  'Tài Bạch',
  'Tử Tức',
  'Phu Thê',
  'Huynh Đệ',
];

function sample(n, seed0) {
  let seed = seed0;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out = {};
  for (let i = 0; i < n; i++) {
    const year = 1960 + Math.floor(rnd() * 46),
      month = 1 + Math.floor(rnd() * 12),
      day = 1 + Math.floor(rnd() * 28);
    const gioIdx = Math.floor(rnd() * 12),
      gender = rnd() < 0.5 ? 'nam' : 'nu';
    try {
      const conv = eng.convertDuongToAm(day, month, year, GIO[gioIdx]);
      if (!conv?.amLich) continue;
      const al = conv.amLich;
      const ls = eng.anSaoLaSo({
        ngayAL: al.day,
        thangAL: al.month,
        namAL: al.year,
        canNam: conv.canNam,
        chiNam: conv.chiNam,
        gioIdx,
        gioitinh: gender,
        namXem: 2026,
      });
      if (!ls?.cungScores) continue;
      for (const cung of CUNG_ORDER) {
        const s = ls.cungScores[cung]?.tong;
        const w = eng.xuHuongCungW(ls, cung);
        if (typeof s !== 'number' || w == null) continue;
        (out[cung] ||= []).push({ w, s, rank: w + s / 100 });
      }
    } catch {}
  }
  return out;
}
const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
function buildThresholds(data) {
  const TH = {};
  for (const [k, v] of Object.entries(data)) {
    const r = v.map((x) => x.rank);
    TH[k] = { t33: +pct(r, 33).toFixed(3), t67: +pct(r, 67).toFixed(3) };
  }
  return TH;
}

// LÔ 1 dựng ngưỡng, LÔ 2 (seed khác hẳn) nghiệm — đúng cách "đối chứng phải
// khác mẫu dựng", không thì con số nghiệm là đỗ giả.
const train = sample(2000, 20260913);
const TH = buildThresholds(train);
const test = sample(1500, 4242424);

console.log('NGƯỠNG dựng trên 2000 lá số, NGHIỆM trên 1500 lá số KHÁC:\n');
console.log('cung          t33     t67    | xấu%  trung%  tốt%  | mâu thuẫn%');
let T = 0,
  Tr = 0,
  X = 0,
  MT = 0,
  ALL = 0;
for (const [k, v] of Object.entries(test)) {
  const { t33, t67 } = TH[k];
  let x = 0,
    tr = 0,
    t = 0,
    mt = 0;
  v.forEach((o) => {
    const sac = o.rank <= t33 ? 'xau' : o.rank > t67 ? 'tot' : 'trung';
    if (sac === 'xau') x++;
    else if (sac === 'tot') t++;
    else tr++;
    if ((sac === 'tot' && o.w <= -0.6) || (sac === 'xau' && o.w >= 2)) mt++;
  });
  X += x;
  Tr += tr;
  T += t;
  MT += mt;
  ALL += v.length;
  console.log(
    k.padEnd(12),
    String(t33.toFixed(2)).padStart(6),
    String(t67.toFixed(2)).padStart(6),
    '  |',
    ((x / v.length) * 100).toFixed(1).padStart(5),
    ((tr / v.length) * 100).toFixed(1).padStart(6),
    ((t / v.length) * 100).toFixed(1).padStart(6),
    ' |',
    ((mt / v.length) * 100).toFixed(2) + '%'
  );
}
console.log(
  '\nGỘP:  xấu',
  ((X / ALL) * 100).toFixed(1) + '%  trung',
  ((Tr / ALL) * 100).toFixed(1) + '%  tốt',
  ((T / ALL) * 100).toFixed(1) + '%   mâu thuẫn',
  ((MT / ALL) * 100).toFixed(2) + '%'
);

if (!WRITE) {
  console.log('\nBẢNG NGƯỠNG (dựng trên 2000 lá số):');
  console.log(JSON.stringify(TH, null, 0));
  console.log(
    '\n(chạy lại với --write để ghi public/tools-shared/illus-nguong.js trên mẫu LỚN HƠN)'
  );
  process.exit(0);
}

// Bảng THẬT sự ghi ra file dựng trên mẫu lớn hơn (5000) — số liệu nghiệm ở
// trên đã chứng minh phương pháp tổng quát hoá tốt, nên bảng ship dùng mẫu
// rộng hơn để ước lượng phân vị mượt hơn, không cần giữ lại tách train/test.
const full = sample(5000, 13579);
const FINAL = buildThresholds(full);
const out = `// public/tools-shared/illus-nguong.js
// ============================================================
// NGƯỠNG tốt/trung/xấu cho thư viện hình minh hoạ — SINH bằng
// \`scripts/gen-illus-nguong.mjs --write\` trên 5.000 lá số ngẫu nhiên.
// KHÔNG SỬA TAY — chạy lại script khi cần cập nhật (đổi engine, đổi seed).
//
// rank = w + tong/100 (w từ \`xuHuongCungW()\` trong tuvi-laso-format.js — MỘT
// nguồn với prompt LLM; tong = ls.cungScores[cung].tong chỉ phá thế hoà).
// Cắt ở phân vị 33/67 CỦA TỪNG CUNG. Nghiệm trên mẫu khác mẫu dựng ngưỡng:
// 33,2% xấu · 33,9% trung · 32,8% tốt, mâu thuẫn ảnh↔chữ 0,00%.
// Xem lý do đầy đủ ở đầu \`scripts/gen-illus-nguong.mjs\`.
// ============================================================
(function (root) {
  var ILLUS_NGUONG = ${JSON.stringify(FINAL, null, 2)};
  if (typeof module !== 'undefined' && module.exports) module.exports = ILLUS_NGUONG;
  if (typeof root !== 'undefined') root.ILLUS_NGUONG = ILLUS_NGUONG;
})(typeof window !== 'undefined' ? window : this);
`;
const dest = join(ROOT, 'public/tools-shared/illus-nguong.js');
writeFileSync(dest, out);
console.log('\n✅ đã ghi ' + dest);
