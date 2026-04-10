import { describe, it, expect } from 'vitest';
import { tinhDaiVan, tinhTieuHan, tinhLuuDaiHan } from '../src/van-han/index.js';
import { dcIdx } from '../src/helpers.js';

// ─── tinhDaiVan ───────────────────────────────────────────────
describe('tinhDaiVan', () => {
  it('Thủy Nhị Cục starts at tuổi 2', () => {
    const dvs = tinhDaiVan(0, 'Thủy Nhị Cục', 'dương', 'nam');
    expect(dvs[0]!.tuoiStart).toBe(2);
    expect(dvs[0]!.tuoiEnd).toBe(11);
  });

  it('Hỏa Lục Cục starts at tuổi 6', () => {
    const dvs = tinhDaiVan(0, 'Hỏa Lục Cục', 'dương', 'nam');
    expect(dvs[0]!.tuoiStart).toBe(6);
  });

  it('consecutive ranges don\'t overlap', () => {
    const dvs = tinhDaiVan(2, 'Mộc Tam Cục', 'dương', 'nam');
    for (let i = 0; i < dvs.length - 1; i++) {
      expect(dvs[i+1]!.tuoiStart).toBe(dvs[i]!.tuoiEnd + 1);
    }
  });

  it('each range spans 10 years', () => {
    const dvs = tinhDaiVan(0, 'Kim Tứ Cục', 'dương', 'nam');
    for (const dv of dvs) {
      expect(dv.tuoiEnd - dv.tuoiStart).toBe(9);
    }
  });

  it('returns 12 entries', () => {
    expect(tinhDaiVan(0, 'Thổ Ngũ Cục', 'dương', 'nam')).toHaveLength(12);
  });

  it('dương nam: cungIdx increases from menhIdx', () => {
    const menhIdx = 3;
    const dvs = tinhDaiVan(menhIdx, 'Kim Tứ Cục', 'dương', 'nam');
    expect(dvs[0]!.cungIdx).toBe(3);
    expect(dvs[1]!.cungIdx).toBe(4);
    expect(dvs[2]!.cungIdx).toBe(5);
  });

  it('âm nam: cungIdx decreases from menhIdx', () => {
    const menhIdx = 3;
    const dvs = tinhDaiVan(menhIdx, 'Kim Tứ Cục', 'âm', 'nam');
    expect(dvs[0]!.cungIdx).toBe(3);
    expect(dvs[1]!.cungIdx).toBe(2);
    expect(dvs[2]!.cungIdx).toBe(1);
  });

  it('cungIdx wraps around 0–11', () => {
    const dvs = tinhDaiVan(10, 'Kim Tứ Cục', 'dương', 'nam');
    expect(dvs[0]!.cungIdx).toBe(10);
    expect(dvs[1]!.cungIdx).toBe(11);
    expect(dvs[2]!.cungIdx).toBe(0);  // wraps
  });
});

// ─── tinhTieuHan ─────────────────────────────────────────────
describe('tinhTieuHan', () => {
  it('nam, chiNam=Tý, tuổi 1 → Tuất (10)', () => {
    // TIEU_HAN_KHOI['nam']['Tý'] = 'Tuất'
    // offset = (1-1)%12 = 0 → start
    expect(tinhTieuHan('Tý', 'nam', 1)).toBe(dcIdx('Tuất'));
  });

  it('nam, chiNam=Tý, tuổi 2 → Hợi (11)', () => {
    // Tuất(10)+1=11=Hợi
    expect(tinhTieuHan('Tý', 'nam', 2)).toBe(dcIdx('Hợi'));
  });

  it('nu, chiNam=Tý, tuổi 1 → Thìn (4)', () => {
    // TIEU_HAN_KHOI['nu']['Tý'] = 'Thìn'
    expect(tinhTieuHan('Tý', 'nu', 1)).toBe(dcIdx('Thìn'));
  });

  it('nu, chiNam=Tý, tuổi 2 → Mão (3)', () => {
    // Thìn(4)-1=3=Mão
    expect(tinhTieuHan('Tý', 'nu', 2)).toBe(dcIdx('Mão'));
  });

  it('cycles every 12 years', () => {
    for (let tuoi = 1; tuoi <= 24; tuoi++) {
      const r1 = tinhTieuHan('Ngọ', 'nam', tuoi);
      const r2 = tinhTieuHan('Ngọ', 'nam', tuoi + 12);
      expect(r1).toBe(r2);
    }
  });
});

// ─── tinhLuuDaiHan ───────────────────────────────────────────
describe('tinhLuuDaiHan', () => {
  // dương nam: map = [s, x, x-1, x, x+1, x+2, x+3, x+4, x+5, x+6]
  it('dương nam, ageIndex=0 → self', () => {
    expect(tinhLuuDaiHan(2, 0, 'dương', 'nam')).toBe(2);
  });

  it('dương nam, ageIndex=1 → xung (self+6)', () => {
    expect(tinhLuuDaiHan(2, 1, 'dương', 'nam')).toBe(8); // 2+6=8
  });

  it('dương nam, ageIndex=2 → xung-1', () => {
    expect(tinhLuuDaiHan(2, 2, 'dương', 'nam')).toBe(7); // 8-1=7
  });

  it('âm nam, ageIndex=0 → self', () => {
    expect(tinhLuuDaiHan(5, 0, 'âm', 'nam')).toBe(5);
  });

  it('âm nam, ageIndex=1 → xung', () => {
    expect(tinhLuuDaiHan(5, 1, 'âm', 'nam')).toBe(11); // 5+6=11
  });

  it('âm nam, ageIndex=2 → xung+1', () => {
    expect(tinhLuuDaiHan(5, 2, 'âm', 'nam')).toBe(0); // 11+1=12=0
  });

  it('wraps around 0–11', () => {
    const r = tinhLuuDaiHan(10, 1, 'dương', 'nam');
    expect(r).toBe(4); // 10+6=16→4
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(11);
  });
});
