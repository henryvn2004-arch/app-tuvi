import { describe, it, expect } from 'vitest';
import { anLocTon, anTrangSinh, anThaiTue } from '../../src/stars/thai-tue-loc-ton.js';
import { dcIdx } from '../../src/helpers.js';

// ─── anLocTon ─────────────────────────────────────────────────
describe('anLocTon', () => {
  it('Giáp dương nam: Lộc tại Dần (idx 2)', () => {
    const r = anLocTon('Giáp', 'dương', 'nam');
    expect(r['Lộc Tồn']).toBe(dcIdx('Dần'));
  });

  it('Canh dương nam: Lộc tại Thân (idx 8)', () => {
    const r = anLocTon('Canh', 'dương', 'nam');
    expect(r['Lộc Tồn']).toBe(dcIdx('Thân'));
  });

  it('Nhâm dương nam: Lộc tại Hợi (idx 11)', () => {
    const r = anLocTon('Nhâm', 'dương', 'nam');
    expect(r['Lộc Tồn']).toBe(dcIdx('Hợi'));
  });

  it('Quý âm nam: Lộc tại Tý (idx 0)', () => {
    // âm nam = nghịch → Lộc Tồn same start, sequence runs backward
    const r = anLocTon('Quý', 'âm', 'nam');
    expect(r['Lộc Tồn']).toBe(dcIdx('Tý')); // start position unchanged
  });

  it('dương nam: sequence is thuận (ascending)', () => {
    const r = anLocTon('Giáp', 'dương', 'nam');
    // Giáp starts at Dần(2), next should be Mão(3), Thìn(4)...
    const keys = ['Lộc Tồn','Lực Sỹ','Thanh Long','Tiểu Hao'];
    for (let i = 0; i < keys.length - 1; i++) {
      const curr = r[keys[i]!]!;
      const next = r[keys[i+1]!]!;
      expect((next - curr + 12) % 12).toBe(1);
    }
  });

  it('âm nam: sequence is nghịch (descending)', () => {
    const r = anLocTon('Giáp', 'âm', 'nam');
    const keys = ['Lộc Tồn','Lực Sỹ','Thanh Long'];
    for (let i = 0; i < keys.length - 1; i++) {
      const curr = r[keys[i]!]!;
      const next = r[keys[i+1]!]!;
      expect((curr - next + 12) % 12).toBe(1);
    }
  });

  it('returns all 12 Lộc Tồn stars', () => {
    const r = anLocTon('Bính', 'dương', 'nam');
    const expected = [
      'Lộc Tồn','Lực Sỹ','Thanh Long','Tiểu Hao','Tướng Quân',
      'Tấu Thư','Phi Liêm','Hỷ Thần','Bệnh Phù','Đại Hao','Phục Binh','Quan Phủ',
    ];
    expect(Object.keys(r)).toEqual(expect.arrayContaining(expected));
  });
});

// ─── anTrangSinh ──────────────────────────────────────────────
describe('anTrangSinh', () => {
  it('Thủy Nhị Cục dương nam: Tràng Sinh tại Thân (8)', () => {
    const r = anTrangSinh('Thủy Nhị Cục', 'dương', 'nam');
    expect(r['Tràng Sinh']).toBe(dcIdx('Thân'));
  });

  it('Mộc Tam Cục dương nam: Tràng Sinh tại Hợi (11)', () => {
    const r = anTrangSinh('Mộc Tam Cục', 'dương', 'nam');
    expect(r['Tràng Sinh']).toBe(dcIdx('Hợi'));
  });

  it('Hỏa Lục Cục âm nữ: Tràng Sinh tại Dần (2)', () => {
    // Âm nữ = thuận (same as dương nam)
    const r = anTrangSinh('Hỏa Lục Cục', 'âm', 'nu');
    expect(r['Tràng Sinh']).toBe(dcIdx('Dần'));
  });

  it('returns all 12 Tràng Sinh stars', () => {
    const r = anTrangSinh('Kim Tứ Cục', 'dương', 'nam');
    const expected = [
      'Tràng Sinh','Mộc Dục','Quan Đới','Lâm Quan','Đế Vượng',
      'Suy','Bệnh','Tử','Mộ','Tuyệt','Thai','Dưỡng',
    ];
    expect(Object.keys(r)).toEqual(expect.arrayContaining(expected));
  });

  it('dương nam / nghịch cục: Đế Vượng = Tràng Sinh + 4', () => {
    const r = anTrangSinh('Kim Tứ Cục', 'dương', 'nam');
    const ts  = r['Tràng Sinh']!;
    const dev = r['Đế Vượng']!;
    expect((dev - ts + 12) % 12).toBe(4);
  });
});

// ─── anThaiTue ────────────────────────────────────────────────
describe('anThaiTue', () => {
  it('Tý: Thái Tuế tại Tý (0)', () => {
    const r = anThaiTue('Tý');
    expect(r['Thái Tuế']).toBe(dcIdx('Tý'));
  });

  it('Tý: 12 stars placed sequentially from Tý', () => {
    const r = anThaiTue('Tý');
    const seq = [
      'Thái Tuế','Thiếu Dương','Tang Môn','Thiếu Âm','Quan Phù',
      'Tử Phù','Tuế Phá','Long Đức','Bạch Hổ','Phúc Đức','Điếu Khách','Trực Phù',
    ];
    for (let i = 0; i < seq.length; i++) {
      expect(r[seq[i]!]).toBe(i % 12);
    }
  });

  it('Ngọ: Thái Tuế tại Ngọ (6)', () => {
    const r = anThaiTue('Ngọ');
    expect(r['Thái Tuế']).toBe(dcIdx('Ngọ'));
    expect(r['Thiếu Dương']).toBe(dcIdx('Mùi'));
    expect(r['Trực Phù']).toBe(dcIdx('Tỵ')); // mod12(6+11)=5=Tỵ
  });
});
