// lib/nghiem-chung/types.ts
// ============================================================
// Hồ sơ "Nghiệm Chứng" — đối chiếu lá số Tử Vi của một người nổi tiếng với
// cuộc đời thật của họ.
//
// 🔴 HAI LỚP, KHÔNG TRỘN:
//   · SỐ LIỆU TỬ VI (cung, sao, điểm, đại vận, lưu niên) — route TÍNH LẠI từ
//     engine mỗi lần dựng trang. Hồ sơ KHÔNG chứa con số tử vi nào, nên không
//     có bản chép tay nào để trôi khỏi engine (luật "Engine là nguồn số duy
//     nhất", CLAUDE.md).
//   · BIÊN TẬP (đời thật + câu trích lá số + kết luận) — nằm ở đây, mỗi dòng
//     đời thật trỏ tới nguồn công khai trong `nguon`.
//
// Bảng tổng (khớp/trượt) ĐẾM từ `ketLuan` lúc render, không gõ tay — trang
// nói "5 khớp" thì bảng bên dưới phải có đúng 5 dòng khớp.
// ============================================================

/** Kết luận của một dòng đối chiếu. `chua-kiem-chung` = không có nguồn công khai. */
export type KetLuan = 'khop' | 'mot-phan' | 'truot' | 'chua-kiem-chung' | 'dang-dien-ra';

export interface DongBanMenh {
  /** Tên cung đúng như engine trả (`Mệnh`, `Quan Lộc`…) — route tra điểm cung theo tên này. */
  cung: string;
  /** Lá số nói gì — trích/diễn lại câu của engine, không tự thêm luận. */
  laSoNoi: string;
  doiThat: string;
  ketLuan: KetLuan;
  /** Chỉ số (0-based) vào `nguon`. */
  nguon?: number[];
  /** Mã câu engine (lib/nghiem-chung/engine-ref.ts) — BẮT BUỘC với hồ sơ sinh hàng loạt. */
  laSoRef?: string[];
  /** Đoạn trích NGUYÊN VĂN (ngôn ngữ gốc) từ bài Wikipedia làm chứng cho `doiThat`. */
  trich?: string;
}

export interface DongDaiVan {
  /** `thu_tu` của đại vận trong engine (1..12). */
  thuTu: number;
  doiThat: string;
  ketLuan: KetLuan;
  /** Ghi chú ngắn vì sao kết luận như vậy. */
  vi: string;
  nguon?: number[];
  laSoRef?: string[];
  trich?: string;
}

export interface NamMoc {
  nam: number;
  suKien: string;
  /** Lá số năm đó nói gì — diễn lại `blocks`/lưu tứ hóa của engine. */
  laSoNoi: string;
  ketLuan: KetLuan;
  nguon?: number[];
  laSoRef?: string[];
  trich?: string;
}

export interface GioRanhGioi {
  /** Giờ (0–23) đưa vào engine cho cách đọc thay thế. */
  gioThay: number;
  tenGioThay: string;
  /** Vì sao giờ sinh nằm sát ranh giới. */
  lyDo: string;
  /** Các đại vận dùng để so hai cách đọc (thu_tu). */
  soDaiVan: number[];
  ketLuan: string;
}

export interface Nguon {
  ten: string;
  url: string;
}

export interface GioDoan {
  chon: string;
  doTinCay: 'cao' | 'vua' | 'thap';
  giaiThich: string;
  bang: { gio: string; diem: number; lyDo: string; menh: string }[];
}

export interface HoSoNghiemChung {
  slug: string;
  ten: string;
  /** Wikidata QID — khoá về `celeb_births`. */
  qid: string;
  ngheNghiep: string;
  /** Một dòng dưới tên ở đầu trang. */
  moTaNgan: string;
  gioiTinh: 'nam' | 'nu';
  sinh: {
    /** YYYY-MM-DD dương lịch. */
    ngay: string;
    /** HH:MM giờ đồng hồ nơi sinh, đúng như hồ sơ gốc. */
    gio: string;
    /** Giờ (0–23) đưa vào engine — theo quy ước giờ đồng hồ của `TuviForm`. */
    gioEngine: number;
    noi: string;
    /** Xếp hạng Rodden của Astro-Databank (AA = có giấy khai sinh); 'doan' = giờ SUY ĐOÁN (xem `gioDoan`). */
    rodden: 'AA' | 'A' | 'doan';
  };
  /** Tên file trên Wikimedia Commons (cột `image_file`). */
  anhCommons?: string;
  sameAs: string[];
  /** Ô trả lời ngắn đầu trang — câu AEO. Viết SAU khi chốt bảng. */
  traLoiNgan: string;
  tieuSu: string[];
  banMenh: DongBanMenh[];
  daiVan: DongDaiVan[];
  namMoc: NamMoc[];
  gioRanhGioi?: GioRanhGioi;
  /** Người KHÔNG có giờ sinh công khai: bảng chấm 12 giờ, giờ chọn = giờ điểm cao nhất. */
  gioDoan?: GioDoan;
  ketLuanBienTap: string[];
  faq: { q: string; a: string }[];
  nguon: Nguon[];
  ngayDang: string;
  ngayCapNhat: string;
  /** Năm mất (nếu đã mất) — đại vận sau năm này không chấm; người còn sống chịu luật nội dung nhạy cảm. */
  namMat?: number;
  /** Bài Wikipedia làm nguồn chính (hồ sơ sinh hàng loạt). */
  wiki?: { lang: string; title: string; url: string };
  /** Hồ sơ sinh hàng loạt: chỉ hồ sơ `indexed` mới vào sitemap và không mang noindex. */
  indexed?: boolean;
}
