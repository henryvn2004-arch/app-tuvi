import { describe, it, expect } from 'vitest';
import { anSaoLaSo } from '../src/engine.js';
import { dcIdx } from '../src/helpers.js';
import type { AnSaoParams } from '../src/types.js';

// ─── Known test case: male born Giáp Tý year ─────────────────
// Giáp Tý 1984, tháng 1 AL, ngày 1, giờ Tý, nam
const CASE_GIAP_TY: AnSaoParams = {
  ngayAL: 1, thangAL: 1, namAL: 1984,
  canNam: 'Giáp', chiNam: 'Tý',
  gioIdx: 0,  // Tý giờ
  gioitinh: 'nam',
  namXem: 2024,
};

// ─── Known test case: female born Bính Dần year ──────────────
const CASE_BINH_DAN: AnSaoParams = {
  ngayAL: 15, thangAL: 6, namAL: 1986,
  canNam: 'Bính', chiNam: 'Dần',
  gioIdx: 4,  // Thìn giờ
  gioitinh: 'nu',
  namXem: 2024,
};

describe('anSaoLaSo — output shape', () => {
  it('returns all required top-level fields', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    expect(ls).toHaveProperty('palaces');
    expect(ls).toHaveProperty('daiVans');
    expect(ls).toHaveProperty('cachCuc');
    expect(ls).toHaveProperty('canChiNam');
    expect(ls).toHaveProperty('napAm');
    expect(ls).toHaveProperty('menhDC');
    expect(ls).toHaveProperty('thanDC');
    expect(ls).toHaveProperty('tuoiXem');
  });

  it('palaces has exactly 12 entries', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    expect(ls.palaces).toHaveLength(12);
  });

  it('exactly one Mệnh cung', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    expect(ls.palaces.filter(p => p.isMenh)).toHaveLength(1);
  });

  it('exactly one Thân cung (may coincide with Mệnh)', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    expect(ls.palaces.filter(p => p.isThan)).toHaveLength(1);
  });

  it('all 12 palace names are from TEN_CUNG', () => {
    const TEN_CUNG = [
      'Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc',
      'Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ',
    ];
    const ls = anSaoLaSo(CASE_GIAP_TY);
    for (const p of ls.palaces) {
      expect(TEN_CUNG).toContain(p.cungName);
    }
    // All 12 names present
    for (const name of TEN_CUNG) {
      expect(ls.palaces.some(p => p.cungName === name)).toBe(true);
    }
  });

  it('all palace indices unique 0–11', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    const indices = ls.palaces.map(p => p.idx);
    expect(new Set(indices).size).toBe(12);
  });

  it('daiVans has 12 entries', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    expect(ls.daiVans).toHaveLength(12);
  });

  it('canChiNam correct for Giáp Tý', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    expect(ls.canChiNam).toBe('Giáp Tý');
  });
});

describe('anSaoLaSo — star placement correctness', () => {
  it('Tử Vi appears exactly once across all palaces', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    const count = ls.palaces.flatMap(p => p.stars).filter(s => s.ten === 'Tử Vi').length;
    expect(count).toBe(1);
  });

  it('all 14 chính tinh appear exactly once', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    const allStars = ls.palaces.flatMap(p => p.stars);
    const chinhTinh = [
      'Tử Vi','Liêm Trinh','Thiên Đồng','Vũ Khúc','Thái Dương','Thiên Cơ',
      'Thiên Phủ','Thái Âm','Tham Lang','Cự Môn','Thiên Tướng','Thiên Lương',
      'Thất Sát','Phá Quân',
    ];
    for (const star of chinhTinh) {
      const count = allStars.filter(s => s.ten === star).length;
      expect(count, `${star} should appear exactly once`).toBe(1);
    }
  });

  it('majorStars in each palace only contains chính tinh', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    for (const p of ls.palaces) {
      for (const s of p.majorStars) {
        expect(s.nhom).toBe('chinh');
      }
    }
  });

  // ── Kình Dương / Đà La bug fix verification ──────────────────
  it('Kình Dương is NOT at Lộc Tồn position', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    const allStars = ls.palaces.flatMap(p =>
      p.stars.map(s => ({ ...s, palaceIdx: p.idx }))
    );
    const locTon  = allStars.find(s => s.ten === 'Lộc Tồn')!;
    const kinh    = allStars.find(s => s.ten === 'Kình Dương')!;
    const daLa    = allStars.find(s => s.ten === 'Đà La')!;
    expect(kinh.palaceIdx).not.toBe(locTon.palaceIdx);
    expect(daLa.palaceIdx).not.toBe(locTon.palaceIdx);
    expect(kinh.palaceIdx).not.toBe(daLa.palaceIdx);
  });

  it('Kình Dương is 1 step AFTER Lộc Tồn (fixed bug)', () => {
    // Giáp năm: Lộc Tồn = Dần(2), Kình = Mão(3), Đà = Sửu(1)
    const ls = anSaoLaSo(CASE_GIAP_TY);
    const allStars = ls.palaces.flatMap(p =>
      p.stars.map(s => ({ ...s, palaceIdx: p.idx }))
    );
    const locTon = allStars.find(s => s.ten === 'Lộc Tồn')!;
    const kinh   = allStars.find(s => s.ten === 'Kình Dương')!;
    const daLa   = allStars.find(s => s.ten === 'Đà La')!;
    // Kình should be +1 from Lộc
    expect((kinh.palaceIdx - locTon.palaceIdx + 12) % 12).toBe(1);
    // Đà should be -1 from Lộc
    expect((locTon.palaceIdx - daLa.palaceIdx + 12) % 12).toBe(1);
  });

  it('Thái Tuế at same diaChi as chiNam', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    const thaiTue = ls.palaces.flatMap(p => p.stars).find(s => s.ten === 'Thái Tuế')!;
    const thaiTuePalace = ls.palaces.find(p => p.stars.some(s => s.ten === 'Thái Tuế'))!;
    expect(thaiTuePalace.diaChi).toBe('Tý'); // chiNam = Tý
  });
});

describe('anSaoLaSo — tuổi xem', () => {
  it('tuoiXem = namXem - namAL + 1', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    expect(ls.tuoiXem).toBe(2024 - 1984 + 1); // 41
  });

  it('daiVanHienTai covers tuoiXem', () => {
    const ls = anSaoLaSo(CASE_GIAP_TY);
    if (ls.daiVanHienTai) {
      expect(ls.tuoiXem).toBeGreaterThanOrEqual(ls.daiVanHienTai.tuoiStart);
      expect(ls.tuoiXem).toBeLessThanOrEqual(ls.daiVanHienTai.tuoiEnd);
    }
  });
});

describe('anSaoLaSo — female case', () => {
  it('different menhIdx than male with same data', () => {
    const maleCase = { ...CASE_BINH_DAN, gioitinh: 'nam' as const };
    const male = anSaoLaSo(maleCase);
    const female = anSaoLaSo(CASE_BINH_DAN);
    // Mệnh cung same (determined by thangAL + gioIdx, not gender)
    expect(female.menhDC).toBe(male.menhDC);
    // But đại vận direction differs → daiVan[1].cungIdx differs
    const maleDv1  = male.daiVans[1]!.cungIdx;
    const femDv1   = female.daiVans[1]!.cungIdx;
    // Bính = dương → female (dương nữ) = nghịch, male (dương nam) = thuận
    expect(femDv1).not.toBe(maleDv1);
  });
});

describe('anSaoLaSo — throws on bad input', () => {
  it('throws when ngayAL has no matching cục entry', () => {
    // ngayAL=99 won't exist in any cục table
    expect(() => anSaoLaSo({ ...CASE_GIAP_TY, ngayAL: 99 })).toThrow();
  });
});
