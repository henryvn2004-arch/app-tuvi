// lib/api/calendar-public.ts
// ============================================================
// Bộ dựng payload cho `/api/public/v1/lunar` và `/api/public/v1/almanac`.
//
// 🔑 Ở LIB chứ không ở trong route vì trang tài liệu `/api-docs` phải in ra
// MẪU PHẢN HỒI THẬT. Cho trang đó tự gõ lại một mẫu JSON là hẹn ngày nó trôi
// khỏi API — người tích hợp đọc tài liệu rồi viết code theo một shape không
// còn tồn tại, và không có gì báo. (Next 16 cũng không cho route file export
// thứ gì ngoài handler, nên đây là chỗ duy nhất đặt được.)
// ============================================================

import { computeNgayTot, scoreAllActivities, ACTIVITY_META } from '../../tuvi-engine/dist/ngay-tot/index.js';
import { ccInfo } from '@/lib/engine/diachi';
import { isoOf, type Ymd } from './public';

/**
 * Con giáp bằng tiếng Anh, xếp theo THỨ TỰ ĐỊA CHI Tý→Hợi.
 *
 * Có mặt vì API này nhắm cả người tích hợp nước ngoài (danh bạ `public-apis`):
 * trả mỗi "Ngọ" thì với họ là một chuỗi vô nghĩa. ⚠️ Con giáp Việt khác Trung
 * ở ĐÚNG một chỗ — Mão là MÈO, không phải thỏ; dịch máy hay trả "Rabbit".
 */
const ANIMAL_EN = [
  'Rat', 'Ox', 'Tiger', 'Cat', 'Dragon', 'Snake',
  'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
];


export function buildLunar(v: Ymd) {
  const i = computeNgayTot(v.d, v.m, v.y);
  // Con giáp/nạp âm tra theo NĂM ÂM (`amLich.year`), không theo năm dương —
  // người sinh trước Tết thuộc con giáp năm trước, sai chỗ này là sai cả tuổi.
  const nam = ccInfo(i.amLich.year);
  return {
    date: isoOf(v),
    weekday: i.thuTrongTuan,
    lunar: {
      day: i.amLich.day,
      month: i.amLich.month,
      year: i.amLich.year,
      leapMonth: i.amLich.isLeap,
    },
    sexagenary: {
      day: i.canChiNgay,
      // Chi tháng TIẾT KHÍ (đầu vào của 12 trực), khác tháng âm lịch — nói rõ
      // ở tài liệu, đừng đọc thành "trụ tháng bát tự".
      monthBranch: i.chiThang,
      year: nam?.canChi ?? null,
    },
    zodiac: nam ? { branch: nam.chi, animal: ANIMAL_EN[nam.chiIdx] ?? null } : null,
    napAm: nam ? { name: nam.napAm, element: nam.hanh } : null,
    hours: i.gio.map((g) => ({ branch: g.chi, range: g.range, star: g.sao, auspicious: g.hoangDao })),
  };
}

export function buildAlmanac(v: Ymd) {
  const i = computeNgayTot(v.d, v.m, v.y);
  const taboos: string[] = [];
  if (i.kyTamNuong) taboos.push('Tam Nương');
  if (i.kyNguyetKy) taboos.push('Nguyệt Kỵ');
  if (i.kyDuongCong) taboos.push('Dương Công kỵ nhật');

  return {
    date: isoOf(v),
    lunar: { day: i.amLich.day, month: i.amLich.month, year: i.amLich.year, leapMonth: i.amLich.isLeap },
    sexagenaryDay: i.canChiNgay,
    overall: i.overallTinhChat,
    truc: { name: i.truc, nature: i.trucTinhChat },
    tu: { name: i.tu, nature: i.tuTinhChat },
    star: { name: i.saoNgay, meaning: i.saoYNghia, auspicious: i.hoangDao },
    taboos,
    auspiciousHours: i.gioHoangDao.map((g) => ({ branch: g.chi, range: g.range, star: g.sao })),
    activities: scoreAllActivities(i)
      .sort((a, b) => b.score - a.score)
      .map((s) => ({
        key: s.activity,
        name: ACTIVITY_META[s.activity].name,
        score: s.score,
        level: s.level,
        reasons: s.reasons,
        warnings: s.warnings,
      })),
  };
}
