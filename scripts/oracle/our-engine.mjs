// scripts/oracle/our-engine.mjs
// ============================================================
// Nạp public/tuvi-ansao-engine.js (bản THẬT đang chạy production) cho mục
// đích ĐỐI CHIẾU. Cung cấp hai đường:
//
//   - anSaoLaSoFull(...)  : gọi ĐÚNG hàm anSaoLaSo() thật, đủ cách cục/
//                           scoring — CHẬM (~5-6ms/lần đo được, vì
//                           phanTichCachCuc quét ~960 dòng luật + 748 mẫu).
//                           Dùng để ĐỐI CHỨNG, không dùng để quét vét cạn.
//
//   - placeStarsFast(...) : CHỈ đặt sao (dòng 2312-2405 của anSaoLaSo thật),
//                           bỏ cachCuc/cungScores/tieuVanScores/nguyetVanScores
//                           — nhanh gấp hàng chục lần, dùng để quét 518.400
//                           tổ hợp trong check-ansao-exhaustive.mjs.
//
// ⚠️ placeStarsFast() là BẢN SAO tay của logic đặt sao trong anSaoLaSo thật
// (public/tuvi-ansao-engine.js:2311-2405) — sửa công thức đặt sao ở engine
// thật mà KHÔNG sửa lại đây là hai bản trôi khỏi nhau IM LẶNG. Vì vậy
// check-ansao-exhaustive.mjs LUÔN tự đối chứng placeStarsFast() với
// anSaoLaSoFull() thật trên một mẫu nhỏ mỗi lần chạy (xem hàm
// `selfCheckFastPathMatchesReal` ở đó) — lệch là báo đỏ NGAY, không lặng lẽ
// quét sai suốt 518.400 tổ hợp.
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
let cached = null;

export function loadOurEngine() {
  if (cached) return cached;

  const g = globalThis;
  g.window = g;
  if (!g.location) {
    g.location = { protocol: 'https:', hostname: 'tuviminhbao.com', href: 'https://tuviminhbao.com/' };
  }
  const src = readFileSync(join(ROOT, 'public', 'tuvi-ansao-engine.js'), 'utf-8');

  const INTERNALS = [
    'anSaoLaSo', // bản thật, đủ — dùng để đối chứng
    'DIA_CHI',
    'THIEN_CAN',
    'TEN_CUNG',
    'mod12',
    'dinhCungMenh',
    'dinhCungThan',
    'lapCuc',
    'anChinhTinh',
    'anThaiTue',
    'anLocTon',
    'anTrangSinh',
    'anLucSat',
    'anPhuTinh',
    'TU_HOA',
    'getTuanTriet',
    'getStarBrightness',
    'NAP_AM',
  ];
  const E = new Function('window', 'globalThis', src + `\nreturn {${INTERNALS.join(',')}};`)(g, g);
  cached = E;
  return E;
}

/**
 * Bản SAO TAY của phần đặt sao trong anSaoLaSo thật (dòng 2312-2405), bỏ
 * qua cachCuc/cungScores/tieuVan/nguyetVan. Trả về đúng shape tối giản cần
 * cho đối chiếu: canChiNam, napAm, cuc, menhIdx, thanIdx, palaces[] (idx,
 * diaChi, cungName, stars[]).
 */
export function placeStarsFast({ ngayAL, thangAL, canNam, chiNam, gioIdx, gioitinh }) {
  const E = loadOurEngine();
  const { DIA_CHI, TEN_CUNG, mod12: m12, dinhCungMenh, dinhCungThan, lapCuc, anChinhTinh, anThaiTue, anLocTon, anTrangSinh, anLucSat, anPhuTinh, TU_HOA, getTuanTriet, getStarBrightness, NAP_AM } = E;

  const amDuong = ['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm'].includes(canNam) ? 'dương' : 'âm';
  const canChiNam = `${canNam} ${chiNam}`;
  const napAm = NAP_AM[canChiNam] || '?';

  const menhIdx = dinhCungMenh(thangAL, gioIdx);
  const thanIdx = dinhCungThan(thangAL, gioIdx);
  const menhDC = DIA_CHI[menhIdx];
  const thanDC = DIA_CHI[thanIdx];

  const { cuc, canMenh } = lapCuc(canNam, menhDC);

  const chinhTinh = anChinhTinh(ngayAL, cuc);
  if (!chinhTinh) throw new Error(`Không tìm thấy bảng Tử Vi ngày ${ngayAL} cục ${cuc}`);

  const thaiTue = anThaiTue(chiNam);
  const locTon = anLocTon(canNam, amDuong, gioitinh);
  const trangSinh = anTrangSinh(cuc, amDuong, gioitinh);
  const locTonIdx = locTon['Lộc Tồn'];
  const lucSat = anLucSat(canNam, chiNam, gioIdx, locTonIdx, amDuong, gioitinh);
  const phuTinh = anPhuTinh(canNam, chiNam, thangAL, ngayAL, gioIdx, locTonIdx);

  const tuHoa = TU_HOA[canNam] || {};
  const tuanTriet = getTuanTriet(canChiNam, canNam);

  const allStars = { ...chinhTinh, ...thaiTue, ...locTon, ...trangSinh, ...lucSat, ...phuTinh };
  const tuHoaMap = {};
  for (const [hoa, star] of Object.entries(tuHoa)) tuHoaMap[star] = hoa;

  const palaces = DIA_CHI.map((dc, idx) => {
    const offset = m12(idx - menhIdx);
    const cungName = TEN_CUNG[offset];
    const stars = [];
    for (const [ten, cidx] of Object.entries(allStars)) {
      if (cidx === idx) {
        const hoa = tuHoaMap[ten];
        const nhom =
          chinhTinh[ten] !== undefined
            ? 'chinh'
            : thaiTue[ten] !== undefined
              ? 'thai_tue'
              : locTon[ten] !== undefined
                ? 'loc_ton'
                : trangSinh[ten] !== undefined
                  ? 'trang_sinh'
                  : lucSat[ten] !== undefined
                    ? 'luc_sat'
                    : 'phu';
        const brightness = getStarBrightness(ten, dc);
        stars.push({ ten, hoa: hoa || null, nhom, brightness });
      }
    }
    const hasTuan = tuanTriet.tuan.includes(idx);
    const hasTriet = tuanTriet.triet.includes(idx);
    if (hasTuan && hasTriet) stars.push({ ten: 'Tuần+Triệt', nhom: 'tuan_triet', brightness: '' });
    else if (hasTuan) stars.push({ ten: 'Tuần', nhom: 'tuan_triet', brightness: '' });
    else if (hasTriet) stars.push({ ten: 'Triệt', nhom: 'tuan_triet', brightness: '' });

    return { idx, diaChi: dc, cungName, isMenh: idx === menhIdx, isThan: idx === thanIdx, stars };
  });

  return { canChiNam, napAm, amDuong, cuc, canMenh, menhDC, thanDC, menhIdx, thanIdx, palaces };
}

/** Đường CHẬM, ĐỦ — chỉ dùng để đối chứng placeStarsFast() trên mẫu nhỏ. */
export function anSaoLaSoFull(args) {
  const E = loadOurEngine();
  return E.anSaoLaSo(args);
}
