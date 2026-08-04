/**
 * lib/almanac/day.ts — dựng một ngày hoàng lịch đầy đủ, tiếng Việt.
 *
 * 🔑 AI LÀ NGUỒN CHO CÁI GÌ — đọc trước khi sửa:
 *
 *  · 12 TRỰC · 28 TÚ · CAN CHI · GIỜ HOÀNG ĐẠO · NGÀY KỴ  → `tuvi-engine`
 *    (`computeNgayTot`). Engine này ĐANG chạy cho 8.958 trang `/ngay-tot/*` và
 *    thẻ "Vận hôm nay" ngoài trang chủ. Nếu file này lấy trực từ mingyu thì
 *    cùng một ngày site sẽ nói HAI trực khác nhau ở hai chỗ — đúng bệnh "hai
 *    engine trôi khỏi nhau" đã trả giá ở can chi ngày (#409). Một nguồn thôi.
 *
 *  · NGHI/KỴ · THẦN SÁT · BÀNH TỔ · CỬU TINH · XUNG SÁT · THẦN NIÊN → mingyu.
 *    Đây là phần repo KHÔNG có, và cũng là phần người ta thực sự tra hoàng lịch
 *    để đọc.
 *
 * ⚠️ VỨT ~95% payload của mingyu: `moonPhaseEvidence`, `hours`, `*Facts`,
 * `evidenceAnalysis` là văn bản KIỂM TOÁN TÍNH THIÊN VĂN bằng chữ Hán
 * (`求根残差`, `二分求根`…) — phiên Hán-Việt ra thì vô nghĩa với người đọc, khác
 * hẳn tên thần sát. Một ngày đầy đủ nặng 34,4 KB; bản dùng được là 1,3 KB.
 * Ngoại lệ DUY NHẤT giữ lại từ nhóm Facts: `godFacts[].classification` — đó là
 * chỗ duy nhất nói thần sát này cát hay hung.
 */
import { generateAlmanacSelection } from 'mingyu-core/divination/almanac';
import { TimeManager } from 'mingyu-core/calendar';
import { computeNgayTot } from '../../tuvi-engine/dist/ngay-tot/index.js';
import {
  docViec, docThanSat, docXungSat, docPhuong, canChiViet,
  BANH_TO_CAN, BANH_TO_CHI, CUU_TINH, THAN_NIEN, type Muc,
} from './terms';

/** ⚠️ BẮT BUỘC — mingyu mặc định +480 (Bắc Kinh). Xem `lib/qimen/board.ts`. */
TimeManager.setTimezoneOffsetMinutesOverride(420);

export interface NgayHoangLich {
  ngayDL: string;
  thu: string;
  amLich: { ngay: number; thang: number; nam: number; nhuan: boolean };
  canChiNgay: string;
  canChiThang: string;
  canChiNam: string;
  /** 12 trực + sao trực nhật + 28 tú — từ engine repo. */
  truc: { ten: string; muc: string };
  tu: { ten: string; muc: string };
  saoNgay: { ten: string; nghia: string; hoangDao: boolean };
  gioHoangDao: { chi: string; gio: string; sao: string }[];
  gioHacDao: { chi: string; gio: string; sao: string }[];
  ngayKy: string[];
  /** Từ mingyu — phần repo không có. */
  nen: { ten: string; nghia: string }[];
  kieng: { ten: string; nghia: string }[];
  thanSat: { ten: string; muc: Muc }[];
  banhTo: string[];
  cuuTinh: { ten: string; hanh: string } | null;
  tuoiXung: string;
  huongSat: string;
  huongNam: { ten: string; muc: Muc; nghia: string; huong: string }[];
  /** Xếp hạng thô của engine repo, giữ nguyên chữ. */
  tongQuan: string;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Dựng hoàng lịch cho một khoảng ngày. mingyu chỉ nhận tối đa 31 ngày/lượt.
 */
export function dungHoangLich(tuNgay: Date, denNgay: Date): NgayHoangLich[] {
  const raw = generateAlmanacSelection({
    topic: 'custom',
    startDate: iso(tuNgay),
    endDate: iso(denNgay),
  });

  return raw.days.map((d: Record<string, any>) => {
    const [Y, M, D] = String(d.date).split('-').map(Number) as [number, number, number];
    const me = computeNgayTot(D, M, Y);

    const ky: string[] = [];
    if (me.kyTamNuong) ky.push('Tam Nương');
    if (me.kyNguyetKy) ky.push('Nguyệt Kỵ');
    if (me.kyDuongCong) ky.push('Dương Công Kỵ Nhật');

    const xs = docXungSat(d.clash);
    const banhTo = [BANH_TO_CAN[d.pengZuGan], BANH_TO_CHI[d.pengZuZhi]].filter(
      (x): x is string => Boolean(x)
    );

    // Thần sát: gộp tên (`gods`) với phân loại cát/hung (`godFacts`). Dùng
    // `gods` làm danh sách chuẩn — `godFacts` có thể thiếu mục nếu mingyu chưa
    // tra được, nhưng thiếu PHÂN LOẠI thì vẫn nên hiện TÊN.
    const phanLoai = new Map<string, string>();
    for (const f of (d.godFacts || []) as { name: string; classification: string }[]) {
      phanLoai.set(f.name, f.classification);
    }
    const thanSat = ((d.gods || []) as string[]).map((g) => docThanSat(g, phanLoai.get(g)));

    return {
      ngayDL: `${D}/${M}/${Y}`,
      thu: me.thuTrongTuan,
      amLich: { ngay: me.amLich.day, thang: me.amLich.month, nam: me.amLich.year, nhuan: me.amLich.isLeap },
      canChiNgay: me.canChiNgay,
      canChiThang: canChiViet(d.ganzhi?.month || ''),
      canChiNam: canChiViet(d.ganzhi?.year || ''),
      truc: { ten: me.truc, muc: me.trucTinhChat },
      tu: { ten: me.tu, muc: me.tuTinhChat },
      saoNgay: { ten: me.saoNgay, nghia: me.saoYNghia, hoangDao: me.hoangDao },
      gioHoangDao: me.gioHoangDao.map((g) => ({ chi: g.chi, gio: g.range, sao: g.sao })),
      gioHacDao: me.gioHacDao.map((g) => ({ chi: g.chi, gio: g.range, sao: g.sao })),
      ngayKy: ky,
      nen: ((d.recommends || []) as string[]).map(docViec),
      kieng: ((d.avoids || []) as string[]).map(docViec),
      thanSat,
      banhTo,
      cuuTinh: CUU_TINH[d.nineStar] || null,
      tuoiXung: xs.tuoiXung,
      huongSat: xs.huongSat,
      huongNam: ((d.annualDirectionGods || []) as { god: string; direction: string }[])
        .map((g) => {
          const t = THAN_NIEN[g.god];
          return t ? { ...t, huong: docPhuong(g.direction) } : null;
        })
        .filter((x): x is { ten: string; muc: Muc; nghia: string; huong: string } => x !== null),
      tongQuan: me.overallTinhChat,
    };
  });
}

/** Một ngày. */
export function dungMotNgay(d: Date): NgayHoangLich {
  return dungHoangLich(d, d)[0]!;
}
