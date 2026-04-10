// ============================================================
// MAIN ENGINE — anSaoLaSo
// ============================================================
import { DIA_CHI, TEN_CUNG, TU_HOA, TAM_PHUONG_TU_CHINH } from './constants.js';
import { mod12, dcIdx, getNapAm } from './helpers.js';
import { dinhCungMenh, dinhCungThan, lapCuc, anChinhTinh } from './stars/chinh-tinh.js';
import { anThaiTue, anLocTon, anTrangSinh } from './stars/thai-tue-loc-ton.js';
import { anLucSat } from './stars/luc-sat.js';
import { anPhuTinh } from './stars/phu-tinh.js';
import { getStarBrightness, getTuanTriet } from './stars/star-data.js';
import { tinhDaiVan, tinhTieuHan, tinhLuuDaiHan } from './van-han/index.js';
import { tinhScoringAllDaiVan } from './scoring/index.js';
import {
  phanTichCachCuc,
  phanTichCungYNghia,
  tinhCungScores,
  phanTichDaiVanRules,
  tinhTieuVanScores,
} from './compat/js-engine.js';
import {
  THAI_TUE_SEQ, THAI_TUE_NHOM, THAI_TUE_NHOM_Y_NGHIA,
} from './constants.js';
import type {
  AnSaoParams, LasoResult, Palace, Star, DaiVan,
  ThienCan, DiaChi, AmDuong, StarGroup, Brightness,
} from './types.js';

// ─── Build palace array ───────────────────────────────────────
function buildPalaces(
  allStars: Record<string, number>,
  chinhTinh: Record<string, number>,
  thaiTue: Record<string, number>,
  locTon: Record<string, number>,
  trangSinh: Record<string, number>,
  lucSat: Record<string, number>,
  tuHoaMap: Record<string, string>,
  tuanTriet: { tuan: number[]; triet: number[] },
  menhIdx: number,
  thanIdx: number,
  daiVans: DaiVan[],
): Palace[] {
  return DIA_CHI.map((dc, idx) => {
    const offset   = mod12(idx - menhIdx);
    const cungName = TEN_CUNG[offset]!;
    const stars: Star[] = [];

    for (const [ten, cidx] of Object.entries(allStars)) {
      if (cidx !== idx) continue;
      const hoa = tuHoaMap[ten] ?? null;
      const nhom: StarGroup =
        chinhTinh[ten] !== undefined ? 'chinh' :
        thaiTue[ten]   !== undefined ? 'thai_tue' :
        locTon[ten]    !== undefined ? 'loc_ton' :
        trangSinh[ten] !== undefined ? 'trang_sinh' :
        lucSat[ten]    !== undefined ? 'luc_sat' : 'phu';
      const brightness: Brightness = getStarBrightness(ten, dc);
      stars.push({ ten, hoa: hoa as Star['hoa'], nhom, brightness });
    }

    // Tuần / Triệt
    const hasTuan  = tuanTriet.tuan.includes(idx);
    const hasTriet = tuanTriet.triet.includes(idx);
    if (hasTuan && hasTriet) stars.push({ ten:'Tuần+Triệt', hoa:null, nhom:'tuan_triet', brightness:'' });
    else if (hasTuan)  stars.push({ ten:'Tuần',  hoa:null, nhom:'tuan_triet', brightness:'' });
    else if (hasTriet) stars.push({ ten:'Triệt', hoa:null, nhom:'tuan_triet', brightness:'' });

    const van = daiVans[offset];

    return {
      idx, diaChi: dc, cungName,
      isMenh: idx === menhIdx,
      isThan: idx === thanIdx,
      isBodyPalace: idx === thanIdx,
      stars,
      majorStars:    stars.filter(s => s.nhom === 'chinh'),
      minorStars:    stars.filter(s => ['loc_ton','luc_sat','phu'].includes(s.nhom)),
      adjectiveStars: stars.filter(s => ['thai_tue','trang_sinh','tuan_triet'].includes(s.nhom)),
      decadal: van ? { range: [van.tuoiStart, van.tuoiEnd] as [number,number] } : null,
      earthlyBranch: dc,
      name: cungName,
    };
  });
}

// ─── Attach tam phương tứ chính refs ─────────────────────────
function attachTamPhuong(palaces: Palace[]): void {
  for (const p of palaces) {
    const tp = TAM_PHUONG_TU_CHINH[p.cungName];
    if (!tp) continue;
    p.tamHopCungs    = tp.tamHop.map(n => palaces.find(x => x.cungName === n)).filter(Boolean) as Palace[];
    p.xungChieuCung  = palaces.find(x => x.cungName === tp.xung) ?? null;
    p.tuChinhStars   = [p, ...p.tamHopCungs, p.xungChieuCung]
      .filter(Boolean).flatMap((c: any) => c.majorStars) as Star[];
  }
}

// ─── Attach Thái Tuế nhóm ────────────────────────────────────
function attachThaiTueNhom(palaces: Palace[], chiNam: DiaChi): void {
  const startIdx = dcIdx(chiNam);
  for (const p of palaces) {
    const offset = mod12(dcIdx(p.diaChi) - startIdx);
    const sao    = THAI_TUE_SEQ[offset]!;
    const nhom   = THAI_TUE_NHOM[sao];
    if (nhom !== undefined) {
      p.thaiTueNhom = { sao, nhom, ...THAI_TUE_NHOM_Y_NGHIA[nhom] };
    }
  }
}

// ─── MAIN FUNCTION ───────────────────────────────────────────
export function anSaoLaSo({
  ngayAL, thangAL, namAL, canNam, chiNam, gioIdx, gioitinh, namXem,
}: AnSaoParams): LasoResult {

  // 1. âm dương bản mệnh
  const DUONG_CAN = new Set<ThienCan>(['Giáp','Bính','Mậu','Canh','Nhâm']);
  const amDuong: AmDuong = DUONG_CAN.has(canNam) ? 'dương' : 'âm';
  const canChiNam = `${canNam} ${chiNam}`;
  const napAm     = (getNapAm(canChiNam) as string) ?? '?';

  // 2. Cung Mệnh & Thân
  const menhIdx = dinhCungMenh(thangAL, gioIdx);
  const thanIdx  = dinhCungThan(thangAL, gioIdx);
  const menhDC   = DIA_CHI[menhIdx]!;
  const thanDC   = DIA_CHI[thanIdx]!;

  // 3. Lập cục
  const { cuc: cucStr } = lapCuc(canNam, menhDC);
  const cuc = cucStr ?? 'Thủy Nhị Cục';

  // 4. An sao
  const chinhTinh = anChinhTinh(ngayAL, cuc);
  if (!chinhTinh) throw new Error(`Không tìm thấy bảng Tử Vi ngày ${ngayAL} cục ${cuc}`);

  const thaiTue  = anThaiTue(chiNam);
  const locTon   = anLocTon(canNam, amDuong, gioitinh);
  const trangSinh = anTrangSinh(cuc, amDuong, gioitinh);
  const locTonIdx = locTon['Lộc Tồn']!;
  const lucSat   = anLucSat(canNam, chiNam, gioIdx, locTonIdx, amDuong, gioitinh);
  const phuTinh  = anPhuTinh(canNam, chiNam, thangAL, ngayAL, gioIdx, locTonIdx);

  // 5. Tứ hóa
  const tuHoaRaw  = TU_HOA[canNam] ?? {};
  // tuHoaMap: starName → hoaLabel (Lộc/Quyền/Khoa/Kỵ)
  const tuHoaMap: Record<string, string> = {};
  for (const [hoa, star] of Object.entries(tuHoaRaw)) tuHoaMap[star] = hoa;

  // 6. Tuần Triệt
  const tuanTriet = getTuanTriet(canChiNam, canNam);

  // 7. Đại vận
  const daiVansRaw = tinhDaiVan(menhIdx, cuc, amDuong, gioitinh);

  // 8. Tuổi xem
  const namSinhDL  = namAL;
  const tuoiXem    = namXem - namSinhDL + 1;
  const chiNamXem  = DIA_CHI[(namXem + 8) % 12]!;
  const tieuHanIdx = tinhTieuHan(chiNam, gioitinh, tuoiXem);

  const daiVanHienTaiRaw = daiVansRaw.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd);
  const ageIndex   = daiVanHienTaiRaw ? tuoiXem - daiVanHienTaiRaw.tuoiStart : 0;
  const luuNienDaiHanIdx = daiVanHienTaiRaw
    ? tinhLuuDaiHan(daiVanHienTaiRaw.cungIdx, ageIndex, amDuong, gioitinh)
    : 0;

  // 9. Build palaces
  const allStars = { ...chinhTinh, ...thaiTue, ...locTon, ...trangSinh, ...lucSat, ...phuTinh };
  const palaces  = buildPalaces(
    allStars, chinhTinh, thaiTue, locTon, trangSinh, lucSat,
    tuHoaMap, tuanTriet, menhIdx, thanIdx, daiVansRaw,
  );

  // 10. Tam phương tứ chính & Thái Tuế nhóm
  attachTamPhuong(palaces);
  attachThaiTueNhom(palaces, chiNam);

  // 11. Mệnh Thái Tuế
  const menhPalaceRef = palaces.find(p => p.isMenh);
  let menhThaiTue: LasoResult['menhThaiTue'] = null;
  if (menhPalaceRef) {
    const saoTT = menhPalaceRef.stars.find(s => s.nhom === 'thai_tue');
    if (saoTT) {
      const nhom = THAI_TUE_NHOM[saoTT.ten];
      if (nhom !== undefined) {
        menhThaiTue = { sao: saoTT.ten, nhom, y_nghia: THAI_TUE_NHOM_Y_NGHIA[nhom]?.yNghia };
      }
    }
  }

  // 12. Scoring đại vận
  const napAmHanh = getNapAm(canChiNam);
  const daiVansScored = tinhScoringAllDaiVan(
    daiVansRaw, palaces, canChiNam, chiNam, napAmHanh, chiNam,
    phanTichDaiVanRules,
  );

  // 13. Cách cục & phân tích
  const lsCtx = {
    palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam,
    daiVans: daiVansScored,
    daiVanHienTai: daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd),
  };

  const cachCuc = phanTichCachCuc(lsCtx, gioitinh);

  const cachCucTungCung = phanTichCungYNghia(
    { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam },
    gioitinh, gioIdx, canNam, chiNam, tuoiXem,
  );

  const cungScores = tinhCungScores(
    { palaces, cachCuc, cachCucTungCung },
    napAmHanh, tuoiXem,
  );

  const tieuVanScores = tinhTieuVanScores(
    { palaces, daiVans: daiVansScored },
    gioitinh, amDuong, chiNam, namSinhDL,
  );

  const daiVanHienTai = daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd);

  return {
    canChiNam, napAm, napAmHanh, amDuong,
    cuc: cucStr as any,
    canMenh: canNam,
    menhDC, thanDC, menhIdx, thanIdx,
    fiveElementsClass: cucStr as any,
    earthlyBranchOfSoulPalace: menhDC,
    earthlyBranchOfBodyPalace: thanDC,
    chineseDate: canChiNam,
    palaces,
    daiVans: daiVansScored,
    daiVanHienTai,
    tieuHanIdx, tuoiXem, chiNamXem, luuNienDaiHanIdx,
    menhThaiTue,
    cachCuc,
    cachCucTungCung,
    cungScores,
    tieuVanScores,
  };
}
