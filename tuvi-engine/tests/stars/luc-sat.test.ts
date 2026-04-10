import { describe, it, expect } from 'vitest';
import { anLucSat } from '../../src/stars/luc-sat.js';
import { anLocTon } from '../../src/stars/thai-tue-loc-ton.js';
import { dcIdx } from '../../src/helpers.js';

// ─── Helper: get Lộc Tồn index for a given can ────────────────
function locTonFor(can: string): number {
  const locTon = anLocTon(can as any, 'dương', 'nam');
  return locTon['Lộc Tồn']!;
}

// ─── BUG TEST: Kình Dương / Đà La swap ───────────────────────
// Original JS had:  kinhDuong = locTonIdx - 1  ← WRONG (swapped with Đà La)
//                   daLa      = locTonIdx + 1  ← WRONG
// Fixed TypeScript: kinhDuong = locTonIdx + 1  ← CORRECT (after Lộc)
//                   daLa      = locTonIdx - 1  ← CORRECT (before Lộc)
//
// Classical rule: Lộc Tồn — Kình Dương (after, thuận) — Đà La (before, nghịch)
// Example: Giáp năm → Lộc Tồn = Dần (idx 2)
//          Kình Dương = Mão (idx 3) = 2+1 ✓
//          Đà La      = Sửu (idx 1) = 2-1 ✓
// ─────────────────────────────────────────────────────────────
describe('Kình Dương / Đà La — BUG FIX (swap corrected)', () => {
  it('Giáp: Lộc tại Dần(2), Kình tại Mão(3), Đà tại Sửu(1)', () => {
    const ltIdx = locTonFor('Giáp'); // Dần = 2
    expect(ltIdx).toBe(dcIdx('Dần'));

    const result = anLucSat('Giáp', 'Tý', 0, ltIdx, 'dương', 'nam');
    expect(result['Kình Dương']).toBe(dcIdx('Mão'));  // Dần+1 = Mão
    expect(result['Đà La']).toBe(dcIdx('Sửu'));       // Dần-1 = Sửu
  });

  it('Ất: Lộc tại Mão(3), Kình tại Thìn(4), Đà tại Dần(2)', () => {
    const ltIdx = locTonFor('Ất'); // Mão = 3
    expect(ltIdx).toBe(dcIdx('Mão'));

    const result = anLucSat('Ất', 'Tý', 0, ltIdx, 'âm', 'nam');
    expect(result['Kình Dương']).toBe(dcIdx('Thìn'));
    expect(result['Đà La']).toBe(dcIdx('Dần'));
  });

  it('Canh: Lộc tại Thân(8), Kình tại Dậu(9), Đà tại Mùi(7)', () => {
    const ltIdx = locTonFor('Canh'); // Thân = 8
    expect(ltIdx).toBe(dcIdx('Thân'));

    const result = anLucSat('Canh', 'Tý', 0, ltIdx, 'dương', 'nam');
    expect(result['Kình Dương']).toBe(dcIdx('Dậu'));
    expect(result['Đà La']).toBe(dcIdx('Mùi'));
  });

  it('Quý: Lộc tại Tý(0), Kình tại Sửu(1), Đà tại Hợi(11)', () => {
    const ltIdx = locTonFor('Quý'); // Tý = 0
    expect(ltIdx).toBe(dcIdx('Tý'));

    const result = anLucSat('Quý', 'Tý', 0, ltIdx, 'âm', 'nam');
    expect(result['Kình Dương']).toBe(dcIdx('Sửu'));
    expect(result['Đà La']).toBe(dcIdx('Hợi'));
  });

  it('Kình Dương và Đà La không được cùng index', () => {
    for (const can of ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']) {
      const ltIdx = locTonFor(can);
      const r = anLucSat(can as any, 'Tý', 0, ltIdx, 'dương', 'nam');
      expect(r['Kình Dương']).not.toBe(r['Đà La']);
    }
  });

  it('Kình Dương không được bằng Lộc Tồn', () => {
    for (const can of ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']) {
      const ltIdx = locTonFor(can);
      const r = anLucSat(can as any, 'Tý', 0, ltIdx, 'dương', 'nam');
      expect(r['Kình Dương']).not.toBe(ltIdx);
      expect(r['Đà La']).not.toBe(ltIdx);
    }
  });
});

// ─── Địa Không / Địa Kiếp ────────────────────────────────────
describe('Địa Không / Địa Kiếp', () => {
  // Địa Kiếp:  Hợi(11) + gioIdx (thuận)
  // Địa Không: Hợi(11) - gioIdx (nghịch)
  it('giờ Tý (idx=0): Không = Kiếp = Hợi (11)', () => {
    const r = anLucSat('Giáp', 'Tý', 0, 0, 'dương', 'nam');
    expect(r['Địa Kiếp']).toBe(dcIdx('Hợi'));
    expect(r['Địa Không']).toBe(dcIdx('Hợi'));
  });

  it('giờ Sửu (idx=1): Kiếp=Tý(0), Không=Tuất(10)', () => {
    const r = anLucSat('Giáp', 'Tý', 1, 0, 'dương', 'nam');
    expect(r['Địa Kiếp']).toBe(dcIdx('Tý'));   // 11+1=12=0
    expect(r['Địa Không']).toBe(dcIdx('Tuất')); // 11-1=10
  });

  it('giờ Ngọ (idx=6): both Kiếp and Không at Tỵ(5)', () => {
    // mod12(11+6)=5=Tỵ, mod12(11-6)=5=Tỵ — same cung at this giờ
    const r = anLucSat('Giáp', 'Tý', 6, 0, 'dương', 'nam');
    expect(r['Địa Kiếp']).toBe(dcIdx('Tỵ'));   // mod12(11+6)=5
    expect(r['Địa Không']).toBe(dcIdx('Tỵ'));   // mod12(11-6)=5
    expect(r['Địa Kiếp']).toBe(r['Địa Không']); // both = Tỵ at gioIdx=6
  });

  it('all indices 0–11', () => {
    for (let gioIdx = 0; gioIdx < 12; gioIdx++) {
      const r = anLucSat('Giáp', 'Tý', gioIdx, 2, 'dương', 'nam');
      expect(r['Địa Không']).toBeGreaterThanOrEqual(0);
      expect(r['Địa Không']).toBeLessThanOrEqual(11);
      expect(r['Địa Kiếp']).toBeGreaterThanOrEqual(0);
      expect(r['Địa Kiếp']).toBeLessThanOrEqual(11);
    }
  });
});

// ─── Hỏa Tinh / Linh Tinh ────────────────────────────────────
describe('Hỏa Tinh / Linh Tinh — dương nam/âm nữ (thuận)', () => {
  // Dần/Ngọ/Tuất: Hỏa khởi Sửu, Linh khởi Thìn
  // Dương nam/Âm nữ: Hỏa thuận (+gioIdx), Linh nghịch (-gioIdx)
  it('chiNam=Dần, giờ Tý(0): Hỏa=Sửu(1), Linh=Thìn(4)', () => {
    const r = anLucSat('Giáp', 'Dần', 0, 2, 'dương', 'nam');
    expect(r['Hỏa Tinh']).toBe(dcIdx('Sửu'));  // Sửu+0=Sửu
    expect(r['Linh Tinh']).toBe(dcIdx('Thìn')); // Thìn-0=Thìn
  });

  it('chiNam=Dần, giờ Sửu(1): Hỏa=Dần(2), Linh=Mão(3)', () => {
    const r = anLucSat('Giáp', 'Dần', 1, 2, 'dương', 'nam');
    expect(r['Hỏa Tinh']).toBe(dcIdx('Dần'));  // Sửu+1=Dần
    expect(r['Linh Tinh']).toBe(dcIdx('Mão')); // Thìn-1=Mão
  });

  it('chiNam=Thân, giờ Tý(0): Hỏa=Dần(2), Linh=Tuất(10)', () => {
    // Thân/Tý/Thìn: Hỏa khởi Dần, Linh khởi Tuất
    const r = anLucSat('Giáp', 'Thân', 0, 8, 'dương', 'nam');
    expect(r['Hỏa Tinh']).toBe(dcIdx('Dần'));  // Dần+0
    expect(r['Linh Tinh']).toBe(dcIdx('Tuất')); // Tuất-0
  });
});

describe('Hỏa Tinh / Linh Tinh — âm nam (nghịch) — TODO: verify classical rule', () => {
  // KNOWN OPEN ISSUE: correct behavior for âm nam/dương nữ is disputed
  // Current impl: Hỏa nghịch (-gioIdx), Linh thuận (+gioIdx)
  // Some classical texts say ALL cases Hỏa thuận, Linh nghịch
  // These tests document CURRENT behavior (not necessarily correct)
  it('chiNam=Dần, giờ Sửu(1), âm nam: current behavior documented', () => {
    const r = anLucSat('Ất', 'Dần', 1, 3, 'âm', 'nam');
    // Current: Hỏa nghịch = mod12(1-1)=0=Tý, Linh thuận = mod12(4+1)=5=Tỵ
    // If classical (all thuận/nghịch): Hỏa = mod12(1+1)=2=Dần, Linh = mod12(4-1)=3=Mão
    // Document current:
    const hoaCurrent  = r['Hỏa Tinh'];
    const linhCurrent = r['Linh Tinh'];
    expect(typeof hoaCurrent).toBe('number');
    expect(typeof linhCurrent).toBe('number');
    // TODO: once classical rule confirmed, add:
    // expect(hoaCurrent).toBe(dcIdx('Dần'));   // thuận version
    // expect(linhCurrent).toBe(dcIdx('Mão'));  // nghịch version
  });

  // Placeholder test — to be replaced when âm nam rule is confirmed
  it.todo('âm nam: Hỏa/Linh follow correct classical rule');
});

// ─── All 6 sao returned ──────────────────────────────────────
describe('anLucSat completeness', () => {
  it('returns all 6 keys', () => {
    const r = anLucSat('Giáp', 'Tý', 0, 2, 'dương', 'nam');
    expect(Object.keys(r)).toEqual(
      expect.arrayContaining([
        'Kình Dương','Đà La','Địa Kiếp','Địa Không','Hỏa Tinh','Linh Tinh',
      ])
    );
  });

  it('all values in 0–11', () => {
    const r = anLucSat('Nhâm', 'Ngọ', 5, 11, 'dương', 'nam');
    for (const v of Object.values(r)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(11);
    }
  });
});
