// ============================================================
// TYPES — Tử Vi Đẩu Số Engine
// ============================================================

// ─── Primitive aliases ───────────────────────────────────────
export type DiaChi =
  | 'Tý' | 'Sửu' | 'Dần' | 'Mão' | 'Thìn' | 'Tỵ'
  | 'Ngọ' | 'Mùi' | 'Thân' | 'Dậu' | 'Tuất' | 'Hợi';

export type ThienCan =
  | 'Giáp' | 'Ất' | 'Bính' | 'Đinh' | 'Mậu'
  | 'Kỷ'  | 'Canh' | 'Tân' | 'Nhâm' | 'Quý';

export type NguHanh = 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';

export type AmDuong = 'âm' | 'dương';
export type Gioitinh = 'nam' | 'nu';

export type HoaLoai = 'Hóa Khoa' | 'Hóa Quyền' | 'Hóa Lộc' | 'Hóa Kỵ';

export type Brightness =
  | 'Miếu' | 'Vượng' | 'Đắc' | 'Bình' | 'Hãm' | '';

export type StarGroup =
  | 'chinh' | 'thai_tue' | 'loc_ton' | 'trang_sinh'
  | 'luc_sat' | 'phu' | 'tuan_triet';

// ─── Star ────────────────────────────────────────────────────
export interface Star {
  ten: string;
  hoa: HoaLoai | null;
  nhom: StarGroup;
  brightness: Brightness;
}

// ─── Palace ──────────────────────────────────────────────────
export interface Palace {
  idx: number;
  diaChi: DiaChi;
  cungName: string;
  isMenh: boolean;
  isThan: boolean;
  isBodyPalace: boolean;
  stars: Star[];
  majorStars: Star[];
  minorStars: Star[];
  adjectiveStars: Star[];
  decadal: { range: [number, number] } | null;
  earthlyBranch: DiaChi;
  name: string;
  // Populated after palace build
  tamHopCungs?: Palace[];
  xungChieuCung?: Palace | null;
  tuChinhStars?: Star[];
  thaiTueNhom?: ThaiTueNhomInfo;
  // Scoring
  cungScores?: CungScores;
}

// ─── Thái Tuế ────────────────────────────────────────────────
export interface ThaiTueNhomInfo {
  sao: string;
  nhom: number;
  tenNhom?: string;
  tinhCach?: string;
  diemManh?: string;
  diemYeu?: string;
}

// ─── Đại Vận ─────────────────────────────────────────────────
export interface DaiVan {
  cungIdx: number;
  diaChi: DiaChi;
  tuoiStart: number;
  tuoiEnd: number;
  // Scoring (added by tinhScoringAllDaiVan)
  score?: number;
  thienThoiScore?: number;
  diaLoiScore?: number;
  nhanHoaScore?: number;
  label?: string;
}

// ─── Cung Scores ─────────────────────────────────────────────
export interface CungScores {
  tiemNang: number;
  benVung: number;
  anToan: number;
  quyNhan: number;
  minhBach: number;
  tuongHop: number;
}

// ─── Cách Cục ────────────────────────────────────────────────
export interface CachCuc {
  ten: string;
  moTa: string;
  loai: 'cát' | 'hung' | 'trung bình';
}

// ─── Cung Ý Nghĩa ────────────────────────────────────────────
export interface CungYNghia {
  cungName: string;
  tomTat: string;
  chiTiet: string[];
  luuY?: string[];
}

// ─── Main result of anSaoLaSo ────────────────────────────────
export interface LasoResult {
  canChiNam: string;
  napAm: string;
  napAmHanh: NguHanh | null;
  amDuong: AmDuong;
  cuc: number;
  canMenh: ThienCan;
  menhDC: DiaChi;
  thanDC: DiaChi;
  menhIdx: number;
  thanIdx: number;
  // Aliases for compatibility
  fiveElementsClass: number;
  earthlyBranchOfSoulPalace: DiaChi;
  earthlyBranchOfBodyPalace: DiaChi;
  chineseDate: string;
  palaces: Palace[];
  daiVans: DaiVan[];
  daiVanHienTai: DaiVan | undefined;
  tieuHanIdx: number;
  tuoiXem: number;
  chiNamXem: DiaChi;
  luuNienDaiHanIdx: number;
  menhThaiTue: {
    sao: string;
    nhom: number;
    y_nghia?: string;
  } | null;
  cachCuc: CachCuc[];
  cachCucTungCung: CungYNghia[];
  cungScores: Record<string, CungScores>;
  tieuVanScores?: unknown[];
}

// ─── Input params ────────────────────────────────────────────
export interface AnSaoParams {
  ngayAL: number;
  thangAL: number;
  namAL: number;
  canNam: ThienCan;
  chiNam: DiaChi;
  gioIdx: number;   // 0–11 (Tý=0, Sửu=1, …)
  gioitinh: Gioitinh;
  namXem: number;   // dương lịch
}

export interface ConvertDuongToAmResult {
  amLich: {
    ngayAL: number;
    thangAL: number;
    namAL: number;
    isLeap: boolean;
  };
  canNam: ThienCan;
  chiNam: DiaChi;
  gioIdx: number;
  gioChi: DiaChi;
}

// ─── Star data ───────────────────────────────────────────────
export interface StarPositions {
  mien?: DiaChi[];
  vuong?: DiaChi[];
  dac?: DiaChi[];
  binh?: DiaChi[];
  ham?: DiaChi[];
}

export interface StarDataEntry {
  type: string;
  element?: NguHanh | string;
  weight?: number;
  traits?: string[];
  positions?: StarPositions;
}
