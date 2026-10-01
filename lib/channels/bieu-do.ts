// Bảng ảnh biểu đồ kênh chat + bộ chọn ảnh TỰ gửi theo câu hỏi. Tách khỏi
// router.ts để kiểm được bằng node trần (router kéo theo cả PDF/billing).
import type { BirthParams } from '@/lib/contract/v1';
import type { ChartKind } from '@/lib/og/laso-image';
import type { GuestId } from './guests';
import { cacChuDe, cungChuDe } from '@/lib/agent/luan-chu-de';
import { chuanHoaDauThanh } from '@/lib/vn-text';

const norm = (s: string) => s.trim().toLowerCase();

/** Chủ đề của một câu hỏi — lỗi thì coi như không rõ chủ đề (không chặn lượt trả lời). */
export function chuDeCua(q: string): string[] {
  try {
    return cacChuDe(q);
  } catch (e) {
    console.error('[channel-router] cacChuDe lỗi', e);
    return [];
  }
}

// ── Ảnh biểu đồ (lib/og/laso-image.ts + app/api/og/<kind>) ──────────────
// Tên nút = câu khách gửi đi (không lộ "/"); nhận cả vài cách gõ tay thường gặp.
export const BIEU_DO: { kind: ChartKind; nut: string; cau: string[]; loi: string; thay?: GuestId }[] = [
  {
    kind: 'duong-doi',
    nut: 'Xem đường đời',
    cau: ['xem đường đời', 'đường đời', 'biểu đồ đường đời'],
    loi: 'Đường đời qua 9 đại vận của bạn — chấm là điểm từng đại vận, dải vàng là đại vận đang đi. Muốn thầy luận giai đoạn nào, cứ hỏi.',
  },
  {
    kind: 'radar-cung',
    nut: 'Điểm mạnh yếu',
    cau: ['điểm mạnh yếu', 'điểm mạnh yếu 12 cung', 'mạnh yếu 12 cung'],
    loi: 'Điểm mạnh yếu của 12 cung trong lá số — trục nào càng xa tâm, cung đó càng vượng. Hỏi thầy về cung nào cũng được.',
  },
  {
    kind: 'van-12-thang',
    nut: 'Vận 12 tháng',
    cau: ['vận 12 tháng', 'vận 12 tháng tới', 'xem vận 12 tháng'],
    loi: '12 tháng âm tới của bạn — mỗi dòng là cung nguyệt hạn cùng sao cát, sao sát của tháng đó. Nhờ thầy luận tháng nào thì nhắn tháng đó.',
  },
  {
    kind: 'van-ngay',
    nut: 'Vận hôm nay',
    cau: ['vận hôm nay', 'vận ngày', 'xem vận hôm nay', 'hôm nay thế nào'],
    loi: 'Vận hôm nay theo lá số của bạn — tính chất ngày, cung nhật hạn, giờ hoàng đạo, và 7 ngày tới (viền đỏ là ngày xung tuổi).',
  },
  {
    kind: 'dai-van',
    nut: 'Chi tiết đại vận',
    cau: ['chi tiết đại vận', 'điểm đại vận', 'chấm điểm đại vận', 'bảng đại vận'],
    loi: 'Chín đại vận của bạn — mỗi vận 10 năm chấm theo Thiên Thời, Địa Lợi, Nhân Hòa; nền vàng là vận đang đi. Muốn thầy luận vận nào, cứ nhắn tuổi đó.',
  },
  {
    kind: 'van-10-nam',
    nut: 'Mười năm tới',
    cau: ['mười năm tới', '10 năm tới', 'xem 10 năm tới', 'biến động 10 năm'],
    loi: 'Mười năm tới của bạn — chấm là điểm từng năm, thanh vàng càng dài thì năm đó càng nhiều biến động (Sát Phá Tham, Không Kiếp, Thiên Mã… trong tam phương tiểu hạn). Hỏi thầy về năm nào cũng được.',
  },
  {
    kind: 'bien-dong-thang',
    nut: 'Biến động 12 tháng',
    cau: ['biến động 12 tháng', 'biến động tháng', 'tháng nào biến động'],
    loi: '12 tháng âm năm nay của bạn — thanh vàng càng dài thì tháng đó càng nhiều biến động. Nhờ thầy luận tháng nào thì nhắn tháng đó.',
  },
  {
    kind: 'chu-de-dai-van',
    nut: 'Bốn chuyện lớn',
    cau: ['bốn chuyện lớn', '4 chuyện lớn', 'sự nghiệp tài lộc tình duyên sức khỏe', 'bốn chủ đề'],
    loi: 'Sự nghiệp, tài lộc, tình duyên, sức khỏe qua 9 đại vận — đường nào lên cao là chuyện đó thuận ở giai đoạn ấy. Muốn thầy luận kỹ chuyện nào, cứ hỏi.',
  },
  {
    kind: 'tu-tru',
    nut: 'Lá số Bát Tự',
    cau: ['lá số bát tự', 'bát tự', 'tứ trụ', 'xem tứ trụ', 'lá số tứ trụ'],
    loi: 'Tứ trụ Bát Tự của bạn — can chi năm, tháng, ngày, giờ; cột Ngày là Nhật chủ.',
    thay: 'tam-kinh',
  },
  {
    kind: 'bat-trach',
    nut: 'Hướng hợp tuổi',
    cau: ['hướng hợp tuổi', 'hướng nhà hợp tuổi', 'bát trạch', 'xem hướng nhà'],
    loi: 'Tám hướng theo cung mệnh của bạn — ô xanh là hướng tốt nên đặt cửa, giường, bàn làm việc; ô đỏ là hướng nên tránh.',
    thay: 'huyen-khong',
  },
  {
    kind: 'than-so',
    nut: 'Thần số học',
    cau: ['thần số học', 'xem thần số học', 'số chủ đạo', 'con số chủ đạo'],
    loi: 'Thần số học theo họ tên và ngày sinh của bạn — vòng tròn lớn là bốn con số lõi, lưới bên dưới là biểu đồ ngày sinh.',
    thay: 'thanh-hu',
  },
];

/** Thần số học cần họ tên (ngày âm đã tự đổi sang dương) — thiếu thì ẩn nút, bấm tay thì nhắc bổ sung. */
export const veDuoc = (kind: ChartKind, birth: BirthParams) => kind !== 'than-so' || !!String(birth.name || '').trim();
export const THIEU_TEN = 'Thần số học tính từ HỌ TÊN khai sinh. Nhắn thầy họ tên đầy đủ nhé, rồi bấm lại "Thần số học".';

/** Biểu đồ TỰ gửi kèm câu trả lời — chỉ khi câu hỏi khớp RÕ (cụm đủ nghĩa, không
 *  có đường lùi như `bieuDoHop`): khớp lơ mơ thì thà không gửi còn hơn gửi ảnh lạc đề. */
export const BD_GIAN = 8;
const BD_CUM: [ChartKind, string[]][] = [
  ['bat-trach', ['hướng nhà', 'hướng cửa', 'hướng bếp', 'hướng giường', 'hướng bàn làm việc', 'bát trạch', 'hướng hợp tuổi']],
  ['tu-tru', ['bát tự', 'tứ trụ', 'tử bình', 'nhật chủ', 'dụng thần']],
  ['than-so', ['thần số học', 'số chủ đạo', 'con số chủ đạo']],
  ['van-ngay', ['hôm nay', 'ngày mai', 'tuần này']],
  ['bien-dong-thang', ['tháng nào', 'tháng tới', 'sắp tới', 'thời gian tới', 'tháng này', 'tháng sau', 'các tháng', 'từng tháng', '12 tháng', 'mười hai tháng', 'biến động']],
  ['van-10-nam', ['10 năm tới', 'mười năm tới', 'vài năm tới', 'mấy năm tới', 'những năm tới', 'năm nay', 'năm tới', 'năm sau', 'sang năm']],
];
// Một trong bốn chuyện lớn + hỏi THEO THỜI GIAN đời người → "Bốn chuyện lớn qua 9 đại vận".
const BD_CHU_DE_CUNG = ['Quan Lộc', 'Tài Bạch', 'Phu Thê', 'Tật Ách'];
const BD_THOI_DOI = ['giai đoạn', 'tuổi nào', 'lúc nào', 'khi nào', 'bao giờ', 'thời kỳ', 'đại vận', 'cả đời', 'tương lai', 'sau này', 'về già', 'đỉnh cao', 'thăng hoa'];
const BD_DAI_VAN = ['đại vận', 'giai đoạn', 'vận 10 năm', 'chặng đời'];
const BD_DUONG_DOI = ['cuộc đời', 'đường đời', 'tương lai', 'sau này', 'về già', 'tuổi già', 'cả đời'];
const BD_MANH_YEU = ['điểm mạnh', 'điểm yếu', 'mạnh yếu', 'ưu điểm', 'nhược điểm', 'tổng quan lá số', 'tổng quan về lá số'];
const coCum = (t: string, ds: string[]) => ds.some((p) => t.includes(chuanHoaDauThanh(p)));

export function bieuDoTuGui(q: string, birth: BirthParams): { key: string; kind: ChartKind; nut: string; loi: string; cung?: string } | null {
  const t = chuanHoaDauThanh(norm(q));
  // Câu chứa NGÀY SINH ("sinh 3 tháng 5 năm 1990") — chữ "tháng"/"năm" là ngày, không phải hỏi vận.
  if (/\d+\s*(tháng|\/)\s*\d+/.test(t)) return null;
  const by = (k: ChartKind) => {
    const b = BIEU_DO.find((x) => x.kind === k)!;
    return veDuoc(k, birth) ? { key: k, kind: k, nut: b.nut, loi: b.loi } : null;
  };
  const cung = cungChuDe(chuDeCua(q)[0] || null);
  for (const [k, ds] of BD_CUM.slice(0, 3)) if (coCum(t, ds)) return by(k);
  if (cung && BD_CHU_DE_CUNG.includes(cung) && coCum(t, BD_THOI_DOI)) return by('chu-de-dai-van');
  // "tháng 7", "năm 2027" — hỏi đích danh một tháng/năm (ngày sinh đã loại ở trên).
  if (/tháng \d{1,2}\b/.test(t)) return by('bien-dong-thang');
  if (/năm 20\d\d\b/.test(t)) return by('van-10-nam');
  for (const [k, ds] of BD_CUM.slice(3)) if (coCum(t, ds)) return by(k);
  // Đúng một chủ đề mà không hỏi theo thời gian → ảnh chính cung đó (trước các ảnh "cả đời"
  // chung chung: "con cái tôi sau này" là chuyện Tử Tức, không phải đường đời).
  if (cung)
    return {
      key: `cung:${cung}`,
      kind: 'cung',
      nut: `Xem cung ${cung}`,
      cung,
      loi: `Cung ${cung} của bạn — ô đỏ là cung này, ô vàng là tam phương tứ chính, mũi tên là Tứ Hóa Phi Tinh bay đi.`,
    };
  if (coCum(t, BD_DAI_VAN)) return by('dai-van');
  if (coCum(t, BD_DUONG_DOI)) return by('duong-doi');
  if (coCum(t, BD_MANH_YEU)) return by('radar-cung');
  return null;
}
