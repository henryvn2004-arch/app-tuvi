import { describe, it, expect } from 'vitest';
import { anPhuTinh } from '../../src/stars/phu-tinh.js';
import { dcIdx } from '../../src/helpers.js';

describe('anPhuTinh', () => {
  // canNam=Giáp, chiNam=Tý, thangAL=1, ngayAL=1, gioIdx=0, locTonIdx=2(Dần)
  const base = () => anPhuTinh('Giáp', 'Tý', 1, 1, 0, 2);

  it('Tả Phụ: Thìn=T1 thuận → T1 = Thìn (4)', () => {
    // mod12(dcIdx('Thìn') + 1 - 1) = 4
    expect(base()['Tả Phụ']).toBe(dcIdx('Thìn'));
  });

  it('Hữu Bật: Tuất=T1 nghịch → T1 = Tuất (10)', () => {
    expect(base()['Hữu Bật']).toBe(dcIdx('Tuất'));
  });

  it('Văn Xương: Tuất=Tý nghịch → giờ Tý(0) = Tuất (10)', () => {
    // mod12(dcIdx('Tuất') - 0) = 10
    expect(base()['Văn Xương']).toBe(dcIdx('Tuất'));
  });

  it('Văn Khúc: Thìn=Tý thuận → giờ Tý(0) = Thìn (4)', () => {
    expect(base()['Văn Khúc']).toBe(dcIdx('Thìn'));
  });

  it('Thiên Không: Tý=Tý thuận → giờ Tý(0) = Tý (0)', () => {
    expect(base()['Thiên Không']).toBe(dcIdx('Tý'));
  });

  it('Thiên Không: giờ Ngọ(6) → Ngọ (6)', () => {
    const r = anPhuTinh('Giáp', 'Tý', 1, 1, 6, 2);
    expect(r['Thiên Không']).toBe(dcIdx('Ngọ')); // mod12(0+6)=6
  });

  it('Thiên Khôi (Giáp): Sửu (1)', () => {
    // KHOI['Giáp'] = 'Sửu'
    expect(base()['Thiên Khôi']).toBe(dcIdx('Sửu'));
  });

  it('Thiên Việt (Giáp): Mùi (7)', () => {
    expect(base()['Thiên Việt']).toBe(dcIdx('Mùi'));
  });

  it('Đào Hoa chiNam=Tý: Dậu (9)', () => {
    // DAO_HOA['Tý'] = 'Dậu'
    expect(base()['Đào Hoa']).toBe(dcIdx('Dậu'));
  });

  it('Thiên Mã chiNam=Tý: Dần (2)', () => {
    // THIEN_MA['Tý'] = 'Dần'
    expect(base()['Thiên Mã']).toBe(dcIdx('Dần'));
  });

  it('Lưu Hà (Giáp): Dậu (9)', () => {
    // LUU_HA['Giáp'] = 'Dậu'
    expect(base()['Lưu Hà']).toBe(dcIdx('Dậu'));
  });

  it('Thiên La: always Thìn (4)', () => {
    expect(base()['Thiên La']).toBe(dcIdx('Thìn'));
  });

  it('Địa Võng: always Tuất (10)', () => {
    expect(base()['Địa Võng']).toBe(dcIdx('Tuất'));
  });

  it('Bác Sỹ = Lộc Tồn position', () => {
    // Bác Sỹ = locTonIdx = 2
    expect(base()['Bác Sỹ']).toBe(2);
  });

  it('all returned values in 0–11', () => {
    const r = base();
    for (const [k, v] of Object.entries(r)) {
      expect(v, k).toBeGreaterThanOrEqual(0);
      expect(v, k).toBeLessThanOrEqual(11);
    }
  });

  it('returns 40+ stars', () => {
    expect(Object.keys(base()).length).toBeGreaterThanOrEqual(40);
  });
});
