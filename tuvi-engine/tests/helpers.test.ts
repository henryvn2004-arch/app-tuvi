import { describe, it, expect } from 'vitest';
import { mod12, dcIdx, isThuanChieu, getNapAm } from '../src/helpers.js';

describe('mod12', () => {
  it('handles 0–11 unchanged', () => {
    for (let i = 0; i < 12; i++) expect(mod12(i)).toBe(i);
  });
  it('wraps 12 → 0', () => expect(mod12(12)).toBe(0));
  it('wraps 13 → 1', () => expect(mod12(13)).toBe(1));
  it('wraps -1 → 11', () => expect(mod12(-1)).toBe(11));
  it('wraps -13 → 11', () => expect(mod12(-13)).toBe(11));
});

describe('dcIdx', () => {
  it('Tý = 0', () => expect(dcIdx('Tý')).toBe(0));
  it('Hợi = 11', () => expect(dcIdx('Hợi')).toBe(11));
  it('Ngọ = 6', () => expect(dcIdx('Ngọ')).toBe(6));
  it('throws on unknown', () => expect(() => dcIdx('XYZ')).toThrow());
});

describe('isThuanChieu', () => {
  it('dương nam = thuận', () => expect(isThuanChieu('dương','nam')).toBe(true));
  it('âm nữ = thuận',    () => expect(isThuanChieu('âm','nu')).toBe(true));
  it('âm nam = nghịch',  () => expect(isThuanChieu('âm','nam')).toBe(false));
  it('dương nữ = nghịch',() => expect(isThuanChieu('dương','nu')).toBe(false));
});

describe('getNapAm', () => {
  it('Giáp Tý = Kim',    () => expect(getNapAm('Giáp Tý')).toBe('Kim'));
  it('Bính Dần = Hỏa',  () => expect(getNapAm('Bính Dần')).toBe('Hỏa'));
  it('Nhâm Tuất = Thủy', () => expect(getNapAm('Nhâm Tuất')).toBe('Thủy'));
  it('unknown = null',   () => expect(getNapAm('X Y')).toBeNull());
});
