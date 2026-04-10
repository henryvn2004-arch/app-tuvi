import { describe, it, expect } from 'vitest';
import { anChinhTinh, lapCuc, dinhCungMenh, dinhCungThan } from '../../src/stars/chinh-tinh.js';
import { dcIdx } from '../../src/helpers.js';

// ─── lapCuc ──────────────────────────────────────────────────
describe('lapCuc', () => {
  it('Giáp + Tý → Thủy Nhị Cục', () => {
    expect(lapCuc('Giáp', 'Tý').cuc).toBe('Thủy Nhị Cục');
  });
  it('Giáp + Dần → Hỏa Lục Cục', () => {
    expect(lapCuc('Giáp', 'Dần').cuc).toBe('Hỏa Lục Cục');
  });
  it('Bính + Thân → Hỏa Lục Cục', () => {
    expect(lapCuc('Bính', 'Thân').cuc).toBe('Hỏa Lục Cục');
  });
  it('Kỷ + Dậu → Kim Tứ Cục', () => {
    expect(lapCuc('Kỷ', 'Dậu').cuc).toBe('Kim Tứ Cục');
  });
  it('Quý + Ngọ → Hỏa Lục Cục', () => {
    expect(lapCuc('Quý', 'Ngọ').cuc).toBe('Hỏa Lục Cục');
  });
});

// ─── dinhCungMenh / Thân ─────────────────────────────────────
describe('dinhCungMenh', () => {
  // Dần = idx 2 (T1 khởi Dần)
  // T1, Tý giờ → Dần = 2
  it('T1, Tý giờ (idx=0) → Dần (2)', () => {
    expect(dinhCungMenh(1, 0)).toBe(2); // mod12(2 + 0 - 0) = 2
  });
  it('T1, Sửu giờ (idx=1) → Tý (1) … Dần-1=Sửu', () => {
    // cungThang = mod12(2+0) = 2, result = mod12(2-1) = 1
    expect(dinhCungMenh(1, 1)).toBe(1);
  });
  it('T6, Ngọ giờ (idx=6) → correct', () => {
    // cungThang = mod12(2+5)=7, result = mod12(7-6)=1
    expect(dinhCungMenh(6, 6)).toBe(1);
  });
});

describe('dinhCungThan', () => {
  it('T1, Tý giờ → Dần (2)', () => {
    expect(dinhCungThan(1, 0)).toBe(2); // mod12(2+0)=2
  });
  it('T1, Ngọ giờ (idx=6) → Thân (8)', () => {
    expect(dinhCungThan(1, 6)).toBe(8); // mod12(2+6)=8
  });
});

// ─── anChinhTinh ─────────────────────────────────────────────
describe('anChinhTinh', () => {
  it('Thủy Nhị Cục, ngày 8 → Tử Vi tại Tỵ (5)', () => {
    const result = anChinhTinh(8, 'Thủy Nhị Cục');
    expect(result).not.toBeNull();
    expect(result!['Tử Vi']).toBe(dcIdx('Tỵ')); // 5
  });

  it('Mộc Tam Cục, ngày 4 → Tử Vi tại Tỵ (5)', () => {
    const result = anChinhTinh(4, 'Mộc Tam Cục');
    expect(result!['Tử Vi']).toBe(dcIdx('Tỵ'));
  });

  it('Hỏa Lục Cục, ngày 2 → Tử Vi tại Ngọ (6)', () => {
    const result = anChinhTinh(2, 'Hỏa Lục Cục');
    expect(result!['Tử Vi']).toBe(dcIdx('Ngọ'));
  });

  it('all 14 stars present', () => {
    const result = anChinhTinh(1, 'Kim Tứ Cục');
    expect(result).not.toBeNull();
    const expected = [
      'Tử Vi','Liêm Trinh','Thiên Đồng','Vũ Khúc','Thái Dương','Thiên Cơ',
      'Thiên Phủ','Thái Âm','Tham Lang','Cự Môn','Thiên Tướng','Thiên Lương',
      'Thất Sát','Phá Quân',
    ];
    for (const s of expected) {
      expect(result).toHaveProperty(s);
      expect(typeof result![s]).toBe('number');
    }
  });

  it('all 14 star indices are in 0–11', () => {
    const result = anChinhTinh(15, 'Thổ Ngũ Cục');
    for (const v of Object.values(result!)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(11);
    }
  });

  it('returns null for unknown cục', () => {
    expect(anChinhTinh(1, 'Unknown Cục')).toBeNull();
  });

  // Thiên Phủ relationship: should be in correct position relative to Tử Vi
  it('Thiên Phủ reflects across Ngọ-Tý axis from Tử Vi', () => {
    // When Tử Vi is at Tý (idx 0), Thiên Phủ should be at Thìn (idx 4)
    const result = anChinhTinh(22, 'Thủy Nhị Cục'); // Tý gets days 22,23
    if (result) {
      const tv  = result['Tử Vi'];
      const phu = result['Thiên Phủ'];
      // THIEN_PHU_FROM_TUVI['Tý'] = 'Thìn' = idx 4
      expect(tv).toBe(dcIdx('Tý'));
      expect(phu).toBe(dcIdx('Thìn'));
    }
  });
});
