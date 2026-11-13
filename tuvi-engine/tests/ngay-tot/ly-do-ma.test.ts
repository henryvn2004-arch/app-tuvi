// Mã tra (`reasonsMa`/`warningsMa`) đi SONG SONG với chữ Việt `reasons`/`warnings` (W33b): bản dịch /<locale>/ngay-tot
// dựa vào chúng — lệch một dòng là câu ngoại ngữ ghép sai biến hoặc mất dòng.
import { describe, it, expect } from 'vitest';
import { computeMonth } from '../../src/ngay-tot/engine.js';
import { LY_DO, scoreAllActivities } from '../../src/ngay-tot/activities.js';

describe('ngay-tot · mã lý do song song với chữ Việt', () => {
  it('mọi ngày 2026 × 10 việc: cùng độ dài, khoá ∈ LY_DO, đủ biến cho khuôn', () => {
    let n = 0;
    for (let m = 1; m <= 12; m++) {
      for (const info of computeMonth(2026, m)) {
        for (const s of scoreAllActivities(info)) {
          expect(s.reasonsMa).toHaveLength(s.reasons.length);
          expect(s.warningsMa).toHaveLength(s.warnings.length);
          for (const ma of [...s.reasonsMa, ...s.warningsMa]) {
            expect(Object.keys(LY_DO)).toContain(ma.k);
            const v = ma.v ?? {};
            const need = [...LY_DO[ma.k].matchAll(/\{(\w+)\}/g)].map((x) => x[1]!);
            // {y} (ý nghĩa thần) suy từ `sao`, không nằm trong `v`; mọi biến còn lại phải có mặt.
            for (const t of need) expect(t === 'y' ? v.sao : v[t]).toBeTruthy();
            n++;
          }
        }
      }
    }
    expect(n).toBeGreaterThan(10000);
  });
});
