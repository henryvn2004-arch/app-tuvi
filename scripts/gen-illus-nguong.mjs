#!/usr/bin/env node
/**
 * SINH bảng ngưỡng tốt/trung/xấu cho thư viện hình minh hoạ — KHÔNG gõ tay.
 * (Cùng lý do `_LUNAR_TABLE` phải sinh bằng `gen-lunar-table.mjs`: bảng gõ tay
 * thì trôi khỏi engine mà không ai báo.)
 *
 *   node scripts/gen-illus-nguong.mjs        # in bảng ngưỡng + số nghiệm
 *
 * 🔑 VÌ SAO KHÔNG DÙNG `ls.cungScores[cung].tong` LÀM NGUỒN:
 * `tuvi-laso-format.js` đã CỐ Ý gỡ khối "ĐIỂM ĐÁNH GIÁ" 6 chiều/cung khỏi
 * prompt ("cơ chế tính điểm từng cung không có cơ sở vững, từng khiến AI neo
 * phán quyết vào con số sai"). Phán quyết LLM nay neo vào nhãn "Luận sao:
 * <nhãn> (w:±N)". Đo trên 18.000 cung: tương quan giữa `tong` và `w` chỉ
 * r=0,23 (Phụ Mẫu 0,07 · Thiên Di 0,05) — tức GẦN NHƯ ĐỘC LẬP. Chọn ảnh bằng
 * `tong` là ảnh và chữ đọc hai nguồn khác nhau rồi nói hai chuyện khác nhau.
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
 * tốt, mâu thuẫn 0,00%. (Dựng và nghiệm trên cùng một mẫu là đỗ giả.)
 */
// thế hoà trong đám w=0 (28% số ca). Bước w nhỏ nhất là 0.2 > 0.1 = đóng góp
// tối đa của score ⇒ score KHÔNG BAO GIỜ lật ngược thứ tự do w định ra.
import { readFileSync } from 'fs';
import { join } from 'path';
const ROOT = '/home/user/app-tuvi';
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
    '\nreturn{convertDuongToAm,anSaoLaSo,formatLaSoV2:window.formatLaSoV2};'
)(g, g);
const GIO = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
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
      const txt = eng.formatLaSoV2(ls);
      if (!txt || !ls.cungScores) continue;
      const re = /\[([^\]]+)\][^\n|]*\| Luận sao: ([^(]+)\(w:([+-]?[\d.]+)\)/g;
      let m;
      while ((m = re.exec(txt))) {
        const cung = m[1].trim(),
          w = parseFloat(m[3]),
          s = ls.cungScores[cung]?.tong;
        if (typeof s !== 'number') continue;
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
// LÔ 1: dựng ngưỡng
const train = sample(2000, 20260913);
const TH = {};
for (const [k, v] of Object.entries(train)) {
  const r = v.map((x) => x.rank);
  TH[k] = { t33: +pct(r, 33).toFixed(3), t67: +pct(r, 67).toFixed(3) };
}
// LÔ 2: MẪU KHÁC HẲN để nghiệm — ngưỡng dựng trên lô 1 phải còn đúng ở lô 2
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
console.log('\nBẢNG NGƯỠNG (dán vào code):');
console.log(JSON.stringify(TH, null, 0));
