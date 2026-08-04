/**
 * lib/qimen/board.ts — dựng bàn Kỳ Môn Độn Giáp cho một thời điểm.
 *
 * VÌ SAO CHẠY Ở SERVER, KHÁC MỌI TOOL MIỄN PHÍ KHÁC:
 * Các tool free của site đều tính ở client (`public/tools-shared/*.js`). Kỳ Môn
 * thì không: định cục cần tiết khí thật (phải có ephemeris), rồi còn phù đầu,
 * thượng/trung/hạ nguyên, chuyển bàn thiên/địa/nhân/thần, tìm trực phù trực sử.
 * Chép tay sang vanilla JS là gần như chắc chắn sai ở đâu đó mà KHÔNG có cách
 * nào phát hiện — bàn vẫn ra, chỉ là ra sai. Nên dùng `mingyu-core` (MIT) làm
 * engine, đúng tiền lệ `lib/engine/laso.ts` nạp thẳng engine an sao.
 *
 * File này KHÔNG luận. Nó chỉ dựng bàn + dịch sang tiếng Việt; phần luận là
 * việc của rail, giống mọi tool khác.
 */
import { generateQimen } from 'mingyu-core/divination/qimen';
import { TimeManager } from 'mingyu-core/calendar';
import {
  CUA, SAO, THAN, CAN, TAM_KY, HANH, PHUONG, CUNG, TIET_KHI, NGUYEN,
  docReason, docViec, phienAm, canChiViet,
} from './terms';

/**
 * ⚠️ BẮT BUỘC. `mingyu-core` mặc định múi giờ +480 (Bắc Kinh). Để nguyên thì
 * mọi bàn dựng trong khung 23–24h giờ Việt Nam rơi sang CAN GIỜ của ngày hôm
 * sau — sai lệch âm thầm, bàn vẫn ra bình thường.
 */
TimeManager.setTimezoneOffsetMinutesOverride(420);

export type Muc = 'cat' | 'hung' | 'binh';

export interface CungBan {
  so: number;
  ten: string;
  huong: string;
  hanh: string;
  sao: { ten: string; muc: Muc; nghia: string } | null;
  cua: { ten: string; muc: Muc; nghia: string } | null;
  than: { ten: string; muc: Muc; nghia: string } | null;
  canThien: string | null;
  canDia: string | null;
  /** Ất/Bính/Đinh — trục cát lợi nhất của Kỳ Môn, đánh dấu riêng để nhìn ra ngay. */
  tamKy: string | null;
  /** Kết luận của engine cho phương này. */
  muc: Muc;
  viec: string;
  lyDo: { ten: string; muc: Muc }[];
  /** Điểm xếp hạng tương đối — xem `chamDiem`. */
  diem: number;
  /** 1 = đỡ nhất trong bàn. Chỉ để XẾP HẠNG, không phải phán cát hung. */
  hang: number;
}

export interface BanKyMon {
  ok: true;
  luc: string;
  tietKhi: string;
  nguyen: string;
  cuc: string;
  duong: boolean;
  canChi: { nam: string; thang: string; ngay: string; gio: string };
  trucPhu: string;
  trucSu: string;
  cungs: CungBan[];
  /** Thứ tự vẽ lưới 3×3 theo Lạc Thư, NAM Ở TRÊN (lối vẽ cổ). */
  luoi: number[];
  tomTat: { cat: number[]; hung: number[] };
}

/** Lạc Thư: 4-9-2 / 3-5-7 / 8-1-6. Nam (Ly 9) ở trên, đúng lối vẽ cổ pháp. */
const LUOI = [4, 9, 2, 3, 5, 7, 8, 1, 6];

const _d = (m: { muc: Muc } | null, cat: number) => (!m ? 0 : m.muc === 'cat' ? cat : m.muc === 'hung' ? -cat : 0);

/**
 * 🔑 THANG ĐIỂM XẾP HẠNG — vá một vấn đề ĐO ĐƯỢC, không phải trang trí.
 *
 * Đo trên 366 bàn trải cả năm: engine chỉ cho ra hướng tốt ở **26,5%** số bàn,
 * trung bình **7,45/9 cung bị đánh hung**. Lý do: nó gắn cờ hung cho bất kỳ
 * cung nào dính MỘT trong 123 hung cách — mà với ngần ấy cách thì gần như cung
 * nào cũng dính. Kết quả là 3 trên 4 lượt dùng, tool nói "không hướng nào tốt".
 * Đúng dữ liệu, nhưng người ta hỏi "nên đi hướng nào" mà nhận lại "đi đâu cũng
 * xấu" thì tool vô dụng.
 *
 * Nên thêm một thang XẾP HẠNG TƯƠNG ĐỐI, cân theo đúng thứ tự quan trọng của
 * cổ pháp: CỬA nặng nhất (八門 là trục chọn phương/giờ hành sự), rồi Tam Kỳ,
 * rồi sao và thần, cuối cùng mới đếm cách cục.
 *
 * ⚠️ Thang này KHÔNG ghi đè phán quyết cát/hung của engine — `muc` giữ nguyên.
 * Nó chỉ trả lời câu "trong chín cung thì cung nào đỡ nhất", và trang PHẢI nói
 * rõ đó là xếp hạng tương đối. Công thức để lộ ra ở đây để ai cũng soi lại được,
 * cố ý không giấu trong một con số bí ẩn.
 */
export function chamDiem(c: Omit<CungBan, 'diem' | 'hang'>): number {
  let d = 0;
  d += _d(c.cua, 3);
  d += _d(c.sao, 2);
  d += _d(c.than, 2);
  if (c.tamKy) d += 2;
  for (const l of c.lyDo) d += l.muc === 'cat' ? 1 : l.muc === 'hung' ? -1 : 0;
  return d;
}

export function dungBan(khi?: Date): BanKyMon {
  const d = khi || new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = generateQimen(d);

  // Gom kết luận phương của engine về theo số cung.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theoCung = new Map<number, any>();
  for (const k of ['goodDirections', 'avoidDirections'] as const) {
    for (const x of r.directions?.[k] || []) theoCung.set(x.gong, { ...x, tot: k === 'goodDirections' });
  }

  const tho: Omit<CungBan, 'diem' | 'hang'>[] = (r.jiuGongGe || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (g: any) => {
      const kl = theoCung.get(g.gong);
      const canThienHan: string | null = g.tianPan?.stem || null;
      const canDiaHan: string | null = g.diPan?.stem || null;
      // Tam Kỳ đọc ở THIÊN BÀN — đó là tầng "cái đang tới", tầng địa bàn là
      // nền cố định của cục. Đọc nhầm tầng là chỉ sai phương cho người ta.
      const tk = canThienHan && TAM_KY[canThienHan] ? TAM_KY[canThienHan] : null;
      return {
        so: g.gong,
        ten: CUNG[g.name] || phienAm(g.name),
        huong: PHUONG[g.direction] || phienAm(g.direction),
        hanh: HANH[g.element] || phienAm(g.element),
        sao: g.tianPan?.star ? SAO[g.tianPan.star] || null : null,
        cua: g.renPan?.door ? CUA[g.renPan.door] || null : null,
        than: g.shenPan?.god ? THAN[g.shenPan.god] || null : null,
        canThien: canThienHan ? CAN[canThienHan] || phienAm(canThienHan) : null,
        canDia: canDiaHan ? CAN[canDiaHan] || phienAm(canDiaHan) : null,
        tamKy: tk,
        muc: kl ? (kl.tot ? 'cat' : 'hung') : 'binh',
        viec: kl ? docViec(kl.use) : '',
        lyDo: kl ? (kl.reasons || []).map(docReason) : [],
      };
    }
  );

  // Trung cung (5) KHÔNG tham gia xếp hạng: nó không có cửa và cổ pháp không
  // chọn trung cung làm phương để đi — xếp nó vào bảng là gợi ý một hướng
  // không tồn tại.
  const xep = tho.filter((c) => c.so !== 5).map((c) => ({ so: c.so, diem: chamDiem(c) }));
  xep.sort((a, b) => b.diem - a.diem || a.so - b.so);
  const hangCua = new Map(xep.map((x, i) => [x.so, i + 1]));

  const cungs: CungBan[] = tho.map((c) => ({
    ...c,
    diem: chamDiem(c),
    hang: hangCua.get(c.so) ?? 0,
  }));

  const cat = cungs.filter((c) => c.muc === 'cat').map((c) => c.so);
  const hung = cungs.filter((c) => c.muc === 'hung').map((c) => c.so);

  return {
    ok: true,
    luc: d.toISOString(),
    tietKhi: TIET_KHI[r.timeInfo?.solarTerm] || phienAm(r.timeInfo?.solarTerm || ''),
    nguyen: NGUYEN[r.timeInfo?.epoch] || phienAm(r.timeInfo?.epoch || ''),
    cuc: (r.isYangDun ? 'Dương độn' : 'Âm độn') + ' cục ' + (r.juShu ?? '?'),
    duong: !!r.isYangDun,
    canChi: {
      nam: canChiViet(r.ganzhi?.year || ''),
      thang: canChiViet(r.ganzhi?.month || ''),
      ngay: canChiViet(r.ganzhi?.day || ''),
      gio: canChiViet(r.ganzhi?.hour || ''),
    },
    trucPhu: r.zhiFu ? SAO[r.zhiFu]?.ten || phienAm(r.zhiFu) : '',
    trucSu: r.zhiShi ? CUA[r.zhiShi]?.ten || phienAm(r.zhiShi) : '',
    cungs,
    luoi: LUOI,
    tomTat: { cat, hung },
  };
}

/** Dữ liệu thô cho rail. Chỉ chữ, không lồng object — rail đọc thẳng. */
export function railData(b: BanKyMon, cauHoi?: string) {
  const moTa = (c: CungBan) =>
    `${c.ten} (${c.huong}, ${c.hanh}): ${c.cua ? 'cửa ' + c.cua.ten : 'không cửa'}` +
    `${c.sao ? ', sao ' + c.sao.ten : ''}${c.than ? ', thần ' + c.than.ten : ''}` +
    `${c.canThien ? ', thiên bàn ' + c.canThien : ''}${c.canDia ? ', địa bàn ' + c.canDia : ''}` +
    `${c.tamKy ? ' [' + c.tamKy + ']' : ''}` +
    `${c.lyDo.length ? ' — ' + c.lyDo.map((l) => l.ten).join(', ') : ''}`;
  const doNhat = b.cungs.filter((c) => c.hang === 1)[0];
  return {
    cauHoi: cauHoi || '',
    cuc: b.cuc,
    tietKhi: b.tietKhi + ' · ' + b.nguyen,
    canChi: `năm ${b.canChi.nam}, tháng ${b.canChi.thang}, ngày ${b.canChi.ngay}, giờ ${b.canChi.gio}`,
    trucPhu: b.trucPhu,
    trucSu: b.trucSu,
    huongTot: b.cungs.filter((c) => c.muc === 'cat').map((c) => `${c.huong} — ${c.viec}`),
    huongTranh: b.cungs.filter((c) => c.muc === 'hung').map((c) => c.huong),
    // Luôn có một hướng để trả lời: 73,5% số bàn không có cung nào được engine
    // chấm cát, mà người hỏi thì vẫn cần biết đi đâu. Nói RÕ đây là xếp hạng
    // tương đối để rail không luận nhầm thành cát cách.
    huongDoNhat: doNhat
      ? `${doNhat.huong} (${doNhat.ten}) — xếp hạng TƯƠNG ĐỐI cao nhất trong bàn, không phải cát cách`
      : '',
    banCung: b.cungs.map(moTa),
  };
}
