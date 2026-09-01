import { describe, it, expect } from 'vitest';
import { solarToLunar, hourToChi, yearCanChi, convertDuongToAm, isLunarSupported, LUNAR_MIN_YMD, LUNAR_MAX_YMD } from '../src/lunar/convert.js';

// NOTE: The full LUNAR_TABLE in convert.ts currently only has a few sample rows
// for illustration. These tests will pass once the full table is integrated
// (copy from the original engine's _LUNAR_TABLE).
// For now, tests validate the algorithm logic with known dates.

describe('hourToChi', () => {
  it('hour 23 → Tý', () => expect(hourToChi(23)).toBe('Tý'));   // 23: (23+1)/2=12→0=Tý
  it('hour 0 → Tý',  () => expect(hourToChi(0)).toBe('Tý'));    // (0+1)/2=0→0
  it('hour 1 → Sửu', () => expect(hourToChi(1)).toBe('Sửu'));   // (1+1)/2=1
  it('hour 3 → Dần', () => expect(hourToChi(3)).toBe('Dần'));   // (3+1)/2=2
  it('hour 11 → Ngọ', () => expect(hourToChi(11)).toBe('Ngọ')); // (11+1)/2=6
  it('hour 12 → Ngọ', () => expect(hourToChi(12)).toBe('Ngọ')); // (12+1)/2=6
  it('hour 13 → Mùi', () => expect(hourToChi(13)).toBe('Mùi')); // (13+1)/2=7
});

describe('yearCanChi', () => {
  // year 2024: (2024+6)%10=0=Giáp, (2024+8)%12=4=Thìn → Giáp Thìn
  it('2024 → Giáp Thìn', () => expect(yearCanChi(2024)).toBe('Giáp Thìn'));
  // year 2000: (2006)%10=6=Canh, (2008)%12=4=Thìn → wait
  // 2000: (2000+6)%10=6=Canh, (2000+8)%12=0=Tý → Canh Tý? Let me verify:
  // _CAN[6] = 'Canh', _CHI[0] = 'Tý' → Canh Tý? 
  // Actually 2000 is Canh Thìn historically. Let me recheck:
  // (2000+6)%10 = 2006%10 = 6 → _CAN[6] = 'Canh' ✓ (Canh is index 6 in ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh',...])
  // (2000+8)%12 = 2008%12 = 4 → _CHI[4] = 'Thìn' ✓
  it('2000 → Canh Thìn', () => expect(yearCanChi(2000)).toBe('Canh Thìn'));
  // 1990: (1996)%10=6=Canh, (1998)%12=6=Ngọ → Canh Ngọ
  it('1990 → Canh Ngọ', () => expect(yearCanChi(1990)).toBe('Canh Ngọ'));
  // 1985: (1991)%10=1=Ất, (1993)%12=1=Sửu → Ất Sửu
  it('1985 → Ất Sửu', () => expect(yearCanChi(1985)).toBe('Ất Sửu'));
});

describe('solarToLunar', () => {
  // These test against the full LUNAR_TABLE when available.
  // When table is incomplete, they'll still test the binary search algorithm.

  it('returns an object with day, month, year', () => {
    const r = solarToLunar(15, 1, 2024);
    expect(typeof r.day).toBe('number');
    expect(typeof r.month).toBe('number');
    expect(typeof r.year).toBe('number');
    expect(typeof r.isLeap).toBe('boolean');
  });

  it('day is between 1 and 30', () => {
    const r = solarToLunar(1, 7, 2023);
    expect(r.day).toBeGreaterThanOrEqual(1);
    expect(r.day).toBeLessThanOrEqual(30);
  });

  it('month is between 1 and 12', () => {
    const r = solarToLunar(1, 7, 2023);
    expect(r.month).toBeGreaterThanOrEqual(1);
    expect(r.month).toBeLessThanOrEqual(12);
  });
});

describe('solarToLunar — biên bảng âm lịch', () => {
  // 🔴 Hồi quy cho bug ĐÃ ĐO: bản cũ có `if (idx < 0) return {day:1,month:1,
  // year:yy}` nên MỌI ngày dương trước 1900 quy về CÙNG một ngày âm —
  // 1/1/1898, 15/6/1898 và 31/12/1898 đều ra "AL 1/1/1898". Im lặng, không lỗi.
  it('biên suy từ bảng, không gõ tay', () => {
    expect(LUNAR_MIN_YMD).toBe(19000101);
    expect(LUNAR_MAX_YMD).toBe(21001231);
  });

  it('ném RangeError khi TRƯỚC biên (không bịa mùng 1 tháng 1)', () => {
    expect(() => solarToLunar(1, 1, 1898)).toThrow(RangeError);
    expect(() => solarToLunar(15, 6, 1899)).toThrow(RangeError);
    expect(() => solarToLunar(31, 12, 1899)).toThrow(RangeError); // ngay trước mốc đầu
  });

  it('ném RangeError khi SAU biên', () => {
    expect(() => solarToLunar(1, 1, 2101)).toThrow(RangeError);
  });

  it('chạy bình thường ở đúng hai mốc biên', () => {
    expect(solarToLunar(31, 1, 1900).day).toBe(1);
    expect(() => solarToLunar(31, 12, 2100)).not.toThrow();
  });

  it('isLunarSupported khớp với biên', () => {
    expect(isLunarSupported(31, 12, 1899)).toBe(false);
    expect(isLunarSupported(31, 1, 1900)).toBe(true);
    expect(isLunarSupported(31, 12, 2100)).toBe(true);
    expect(isLunarSupported(1, 1, 2101)).toBe(false);
  });

  // Triệu chứng gốc: 365 ngày dương liên tiếp phải ra 365 ngày âm PHÂN BIỆT
  // (tính cả cờ nhuận). Gộp lại là hàm đang bịa.
  it('365 ngày dương → 365 ngày âm phân biệt (kể cả năm có tháng nhuận)', () => {
    for (const year of [1950, 1990]) {          // 1950 không nhuận, 1990 có
      const seen = new Set<string>();
      const dt = new Date(Date.UTC(year, 0, 1));
      while (dt.getUTCFullYear() === year) {
        const r = solarToLunar(dt.getUTCDate(), dt.getUTCMonth() + 1, year);
        seen.add(`${r.day}/${r.month}/${r.isLeap ? 'N' : ''}/${r.year}`);
        dt.setUTCDate(dt.getUTCDate() + 1);
      }
      expect(seen.size).toBe(365);
    }
  });
});

describe('convertDuongToAm', () => {
  it('returns correct shape', () => {
    const r = convertDuongToAm(15, 3, 1990, 10);
    expect(r).toHaveProperty('amLich');
    expect(r).toHaveProperty('canNam');
    expect(r).toHaveProperty('chiNam');
    expect(r).toHaveProperty('gioIdx');
    expect(r).toHaveProperty('gioChi');
    expect(r).toHaveProperty('amDuongNam');
  });

  it('gioIdx is in 0–11', () => {
    for (const hour of [0, 3, 7, 11, 13, 23]) {
      const r = convertDuongToAm(1, 1, 2000, hour);
      expect(r.gioIdx).toBeGreaterThanOrEqual(0);
      expect(r.gioIdx).toBeLessThanOrEqual(11);
    }
  });

  it('amDuongNam is âm or dương', () => {
    const r = convertDuongToAm(1, 1, 2000, 0);
    expect(['âm','dương']).toContain(r.amDuongNam);
  });

  // NOTE: Chinese New Year 2000 = Feb 5. Dates in Jan 2000 are still lunar year 1999 (Kỷ Mão).
  // Use March 10, 2000 to test Canh Thìn (lunar year 2000).
  it('canNam for 2000 (Canh Thìn) is Canh — date after CNY', () => {
    const r = convertDuongToAm(10, 3, 2000, 10); // March 10, 2000 = lunar year 2000
    expect(r.canNam).toBe('Canh');
  });

  it('chiNam for 2000 (Canh Thìn) is Thìn — date after CNY', () => {
    const r = convertDuongToAm(10, 3, 2000, 10);
    expect(r.chiNam).toBe('Thìn');
  });

  it('2000 is dương (Canh = dương can) — date after CNY', () => {
    const r = convertDuongToAm(10, 3, 2000, 10);
    expect(r.amDuongNam).toBe('dương');
  });

  // Chinese New Year 1985 = Feb 20. Use March 1, 1985.
  it('1985 is âm (Ất = âm can) — date after CNY', () => {
    const r = convertDuongToAm(1, 3, 1985, 10); // March 1, 1985 = lunar year 1985
    expect(r.amDuongNam).toBe('âm');
    expect(r.canNam).toBe('Ất');
  });
});
