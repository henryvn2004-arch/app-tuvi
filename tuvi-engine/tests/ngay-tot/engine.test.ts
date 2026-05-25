import { describe, it, expect } from 'vitest';
import {
  computeNgayTot, computeMonth,
  scoreActivity, scoreAllActivities, topDaysForActivity,
  ACTIVITY_LIST, TRUC_LIST,
} from '../../src/ngay-tot/index.js';

describe('computeNgayTot — basic shape', () => {
  const info = computeNgayTot(25, 5, 2026);

  it('has solar date matching input', () => {
    expect(info.duongLich).toEqual({ day: 25, month: 5, year: 2026 });
  });

  it('has lunar date set', () => {
    expect(info.amLich.day).toBeGreaterThan(0);
    expect(info.amLich.month).toBeGreaterThan(0);
  });

  it('has can chi ngày as 2-word string', () => {
    expect(info.canChiNgay.split(' ').length).toBe(2);
  });

  it('truc is one of 12 valid', () => {
    expect(TRUC_LIST as readonly string[]).toContain(info.truc);
  });

  it('produces 12 hour entries', () => {
    expect(info.gio.length).toBe(12);
  });

  it('hoàng/hắc đạo partitions sum to 12', () => {
    expect(info.gioHoangDao.length + info.gioHacDao.length).toBe(12);
  });

  it('overall is one of 3 values', () => {
    expect(['tốt', 'xấu', 'bình']).toContain(info.overallTinhChat);
  });
});

describe('Trực rule sanity', () => {
  // Trực Kiến phải rơi vào ngày có chi == chi tháng
  it('Trực Kiến tại ngày có chi == chi tháng (rules invariant)', () => {
    // Quét 60 ngày liên tiếp, đảm bảo bất kỳ ngày nào có chi == chi tháng thì là Kiến
    for (let d = 1; d <= 60; d++) {
      const info = computeNgayTot(d, 1, 2026);
      if (info.chiNgay === info.chiThang) {
        expect(info.truc).toBe('Kiến');
      }
    }
  });
});

describe('Tam Nương / Nguyệt Kỵ', () => {
  // Quét 1 năm âm — đảm bảo flag khớp ngày âm lịch
  it('kyTamNuong true khi và chỉ khi ngày âm ∈ {3,7,13,18,22,27}', () => {
    const m = computeMonth(2026, 1);
    const tamNuong = new Set([3,7,13,18,22,27]);
    for (const info of m) {
      expect(info.kyTamNuong).toBe(tamNuong.has(info.amLich.day));
    }
  });

  it('kyNguyetKy true khi và chỉ khi ngày âm ∈ {5,14,23}', () => {
    const m = computeMonth(2026, 5);
    const nguyetKy = new Set([5,14,23]);
    for (const info of m) {
      expect(info.kyNguyetKy).toBe(nguyetKy.has(info.amLich.day));
    }
  });
});

describe('Fixtures verified via xemlicham.com (2026-05-25)', () => {
  // 9 ngày sample, mỗi ngày kèm: can chi, trực, 28 tú, 6 giờ hoàng đạo
  const fixtures = [
    { d: 1,  m: 6,  y: 2026, canChi: 'Bính Ngọ', truc: 'Trừ', tu: 'Tâm', gio: ['Tý','Sửu','Mão','Ngọ','Thân','Dậu'] },
    { d: 25, m: 12, y: 2026, canChi: 'Quý Dậu',  truc: 'Thu', tu: 'Lâu', gio: ['Tý','Dần','Mão','Ngọ','Mùi','Dậu'] },
    { d: 2,  m: 5,  y: 2026, canChi: 'Bính Tý',                 gio: ['Tý','Sửu','Mão','Ngọ','Thân','Dậu'] },
    { d: 3,  m: 5,  y: 2026, canChi: 'Đinh Sửu',                gio: ['Dần','Mão','Tỵ','Thân','Tuất','Hợi'] },
    { d: 4,  m: 5,  y: 2026, canChi: 'Mậu Dần',                 gio: ['Tý','Sửu','Thìn','Tỵ','Mùi','Tuất'] },
    { d: 5,  m: 5,  y: 2026, canChi: 'Kỷ Mão',                  gio: ['Tý','Dần','Mão','Ngọ','Mùi','Dậu'] },
    { d: 6,  m: 5,  y: 2026, canChi: 'Canh Thìn',               gio: ['Dần','Thìn','Tỵ','Thân','Dậu','Hợi'] },
    { d: 7,  m: 5,  y: 2026, canChi: 'Tân Tỵ',                  gio: ['Sửu','Thìn','Ngọ','Mùi','Tuất','Hợi'] },
    { d: 15, m: 5,  y: 2026, canChi: 'Kỷ Sửu',                  gio: ['Dần','Mão','Tỵ','Thân','Tuất','Hợi'] },
  ] as const;

  for (const f of fixtures) {
    const info = computeNgayTot(f.d, f.m, f.y);
    const label = `${f.d}/${f.m}/${f.y}`;

    it(`${label} → can chi ngày khớp`, () => {
      expect(info.canChiNgay).toBe(f.canChi);
    });

    if (f.truc) {
      it(`${label} → trực khớp`, () => {
        expect(info.truc).toBe(f.truc);
      });
    }

    if (f.tu) {
      it(`${label} → 28 tú khớp`, () => {
        expect(info.tu).toBe(f.tu);
      });
    }

    it(`${label} → giờ hoàng đạo khớp 6 chi`, () => {
      const gens = info.gioHoangDao.map(g => g.chi).sort();
      const expected = [...f.gio].sort();
      expect(gens).toEqual(expected);
    });
  }
});

describe('computeMonth length', () => {
  it('Tháng 2/2026 có 28 ngày', () => {
    expect(computeMonth(2026, 2).length).toBe(28);
  });
  it('Tháng 2/2024 có 29 ngày (nhuận)', () => {
    expect(computeMonth(2024, 2).length).toBe(29);
  });
  it('Tháng 5/2026 có 31 ngày', () => {
    expect(computeMonth(2026, 5).length).toBe(31);
  });
});

describe('scoreActivity', () => {
  const info = computeNgayTot(25, 5, 2026);

  it('returns score in [0, 10]', () => {
    const s = scoreActivity(info, 'cuoi-hoi');
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(10);
  });

  it('has level matching score range', () => {
    const s = scoreActivity(info, 'cuoi-hoi');
    if (s.score >= 8) expect(s.level).toBe('rất tốt');
    if (s.score >= 6 && s.score < 8) expect(s.level).toBe('tốt');
  });

  it('returns reasons + warnings arrays', () => {
    const s = scoreActivity(info, 'khai-truong');
    expect(Array.isArray(s.reasons)).toBe(true);
    expect(Array.isArray(s.warnings)).toBe(true);
  });
});

describe('scoreAllActivities returns 10 scores', () => {
  it('one per ACTIVITY_LIST entry', () => {
    const info = computeNgayTot(25, 5, 2026);
    const all = scoreAllActivities(info);
    expect(all.length).toBe(ACTIVITY_LIST.length);
    expect(new Set(all.map(s => s.activity)).size).toBe(ACTIVITY_LIST.length);
  });
});

describe('topDaysForActivity', () => {
  it('returns at most N days, sorted desc', () => {
    const m = computeMonth(2026, 5);
    const top = topDaysForActivity(m, 'cuoi-hoi', 5);
    expect(top.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i-1]!.score.score).toBeGreaterThanOrEqual(top[i]!.score.score);
    }
  });

  it('all returned days have score ≥ 6', () => {
    const m = computeMonth(2026, 5);
    const top = topDaysForActivity(m, 'khai-truong', 10);
    for (const t of top) {
      expect(t.score.score).toBeGreaterThanOrEqual(6);
    }
  });
});
