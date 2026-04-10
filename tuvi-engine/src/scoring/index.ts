// ============================================================
// SCORING ENGINE — Thiên Thời, Địa Lợi, Nhân Hòa
// ============================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TAM_HOP_HANH, DC_HANH, NGU_HANH_SINH, NGU_HANH_KHAC,
} from '../constants.js';
import type { Palace, DaiVan, NguHanh } from '../types.js';

const BO_CHINH_TINH: Record<string, string[]> = {
  'TPVT': ['Tử Vi','Thiên Phủ','Vũ Khúc','Thiên Tướng'],
  'CNDL': ['Thiên Cơ','Thái Âm','Thiên Đồng','Thiên Lương'],
  'SPT':  ['Thất Sát','Phá Quân','Tham Lang','Liêm Trinh'],
  'CN':   ['Cự Môn','Thái Dương'],
};

function soSanhHanh(hanhA: string, hanhB: string): string {
  if (!hanhA || !hanhB) return 'unknown';
  if (hanhA === hanhB) return 'dong_hanh';
  if (NGU_HANH_SINH[hanhB as NguHanh] === hanhA) return 'sinh_nhap';
  if (NGU_HANH_SINH[hanhA as NguHanh] === hanhB) return 'sinh_xuat';
  if (NGU_HANH_KHAC[hanhA as NguHanh] === hanhB) return 'khac_xuat';
  if (NGU_HANH_KHAC[hanhB as NguHanh] === hanhA) return 'khac_nhap';
  return 'unknown';
}

export function tinhThienThoi(daiVanDC: string, chiNamSinh: string): any {
  const hDV  = (TAM_HOP_HANH as Record<string,string>)[daiVanDC];
  const hNS  = (TAM_HOP_HANH as Record<string,string>)[chiNamSinh];
  const qh   = soSanhHanh(hNS, hDV);
  const scoreMap: Record<string, number> = {
    dong_hanh:5, sinh_nhap:4, khac_xuat:2, sinh_xuat:1, khac_nhap:0, unknown:0,
  };
  return { score: scoreMap[qh] ?? 0, qh, hDV, hNS };
}

export function tinhDiaLoi(daiVanDC: string, napAmHanh: NguHanh | null): any {
  const DC_HANH_ANY = DC_HANH as Record<string, NguHanh>;
  const hCung = DC_HANH_ANY[daiVanDC];
  const hMenh = napAmHanh;
  if (!hCung || !hMenh) return { score: 0.5, qh: 'unknown' };
  let score: number, qh: string;
  const NH_SINH = NGU_HANH_SINH as Record<string, string>;
  const NH_KHAC = NGU_HANH_KHAC as Record<string, string>;
  if (hCung === hMenh)                    { score=0.75; qh='dong_hanh'; }
  else if (NH_SINH[hCung] === hMenh)      { score=1;    qh='cung_sinh_menh'; }
  else if (NH_SINH[hMenh] === hCung)      { score=0.5;  qh='menh_sinh_cung'; }
  else if (NH_KHAC[hMenh] === hCung)      { score=0.25; qh='menh_khac_cung'; }
  else if (NH_KHAC[hCung] === hMenh)      { score=0;    qh='cung_khac_menh'; }
  else                                     { score=0.5;  qh='unknown'; }
  return { score, qh, hCung, hMenh };
}

function getBoSao(palaceStars: { ten: string }[]): string | null {
  const names = palaceStars.map(s => s.ten);
  for (const [bo, list] of Object.entries(BO_CHINH_TINH)) {
    if (list.some(s => names.includes(s))) return bo;
  }
  return null;
}

export function tinhNhanHoa(
  menhStars: { ten: string }[],
  vanStars: { ten: string }[],
  dvPalace: Palace | undefined,
  dvTuoiStart: number,
  dvTuoiEnd: number,
): any {
  const boMenh = getBoSao(menhStars);
  const boVan  = getBoSao(vanStars);
  const SCORE_BO: Record<string, number> = {
    'TPVT:TPVT':2,'CNDL:CNDL':2,'SPT:SPT':2,'CN:CN':2,
    'TPVT:SPT':1.5,'SPT:TPVT':1.5,
    'TPVT:CNDL':1,'CNDL:TPVT':1.5,
    'TPVT:CN':0,'CN:TPVT':1,
    'CNDL:SPT':0.5,'SPT:CNDL':0.5,
    'CNDL:CN':0.5,'CN:CNDL':1.5,
    'SPT:CN':0,'CN:SPT':0,
  };
  const key = boMenh && boVan ? boMenh + ':' + boVan : null;
  const scoreBo = key ? (SCORE_BO[key] ?? 1) : 1;

  const SAT_TINH  = ['Địa Không','Địa Kiếp','Kình Dương','Đà La','Linh Tinh','Hỏa Tinh'];
  const BAI_TINH  = ['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
  const ALL_BAD   = [...SAT_TINH, ...BAI_TINH];

  let scoreSat = 2;
  if (dvPalace) {
    const dvHasTriet = dvPalace.stars.some(s => s.ten === 'Triệt');
    const dvHasTuan  = dvPalace.stars.some(s => s.ten === 'Tuần');
    const trietActive = dvHasTriet && dvTuoiEnd != null && dvTuoiEnd <= 30;
    const tuanActive  = dvHasTuan  && dvTuoiStart != null && dvTuoiStart >= 30;

    let allStars: string[];
    if (trietActive) {
      allStars = dvPalace.stars.map(s => s.ten);
    } else {
      allStars = [dvPalace, ...(dvPalace.tamHopCungs||[]), dvPalace.xungChieuCung]
        .filter(Boolean).flatMap((c: any) => c.stars.map((s: any) => s.ten));
    }
    let badCount = ALL_BAD.filter(s => allStars.includes(s)).length;
    const dc = dvPalace.diaChi;
    if ((tuanActive && (dc === 'Tỵ' || dc === 'Ngọ')) ||
        (trietActive && (dc === 'Thân' || dc === 'Dậu'))) {
      badCount = Math.floor(badCount / 2);
    }
    scoreSat = Math.max(0, 2 - badCount * 0.15);
    scoreSat = Math.round(scoreSat * 100) / 100;
  }

  const total = Math.round((scoreBo + scoreSat) * 100) / 100;
  return { score: total, scoreBo, scoreSat, boMenh, boVan };
}

export function scoreDaiVan(tt: any, dl: any, nh: any): any {
  const nhRatio = nh.score / 4;
  const total   = nh.score + nhRatio * dl.score + nhRatio * tt.score;
  const flag    = total >= 7 ? '🟢' : total >= 4 ? '🟡' : '🔴';
  return {
    thienThoi: { score: tt.score, qh: tt.qh },
    diaLoi:    { score: dl.score, qh: dl.qh },
    nhanHoa:   { score: nh.score, scoreBo: nh.scoreBo, scoreSat: nh.scoreSat, boMenh: nh.boMenh, boVan: nh.boVan },
    tong: Math.round(total * 10) / 10, flag,
  };
}

export function tinhScoringAllDaiVan(
  daiVans: DaiVan[],
  palaces: Palace[],
  canChiNam: string,
  chiNam: string,
  napAm: NguHanh | null,
  chiNamSinh: string,
  phanTichDaiVanRulesFn: (dvPalace: Palace, menhPalace: Palace, ls: any) => any[],
): DaiVan[] {
  const menhPalace = palaces.find(p => p.isMenh);
  if (!menhPalace) return daiVans;
  const ls_ctx = { palaces, napAmHanh: napAm, chiNamSinh };
  const menhStars = (menhPalace as any).tuChinhStars || menhPalace.majorStars;

  return daiVans.map((dv, i) => {
    if (i >= 9) return dv;
    const dvPalace = palaces[dv.cungIdx];
    if (!dvPalace) return dv;
    const dvStars = (dvPalace as any).tuChinhStars || dvPalace.majorStars;
    const tt = tinhThienThoi(dv.diaChi, chiNam);
    const dl = tinhDiaLoi(dv.diaChi, napAm);
    const nh = tinhNhanHoa(menhStars, dvStars, dvPalace, dv.tuoiStart, dv.tuoiEnd);
    const sc = scoreDaiVan(tt, dl, nh);
    const dvRules = phanTichDaiVanRulesFn(dvPalace, menhPalace, { ...ls_ctx, napAmHanh: napAm });
    return { ...dv, scoring: sc, rules: dvRules } as DaiVan;
  });
}
