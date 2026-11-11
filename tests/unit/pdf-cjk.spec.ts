import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderLuanGiaiPdf, renderReportPdf } from '../../lib/pdf/luan-giai';
import { cjkFamiliesFor } from '../../lib/pdf/cjk-font';
import { FRAME, TOOL_META_I18N, phanTitle, birthLine } from '../../lib/pdf/i18n';
import { Converter } from 'opencc-js';

// i18n W18 — PDF luận giải/báo cáo theo ngôn ngữ người đọc.
// 🔴 Hỏng ở vùng này là hỏng IM LẶNG: thiếu glyph thì react-pdf đổi run chữ sang Helvetica, route
// vẫn trả PDF, email vẫn 'sent'. Nên kiểm trên PDF THẬT: font nhúng (`pdffonts`) + chữ bóc lại
// (`pdftotext`) + vẽ trang ra ảnh (`pdftoppm`) đếm điểm mực — `pdftotext` xanh mà trang in ra TRẮNG
// là đúng kiểu hỏng đã gặp với lát woff2 (scripts/pdf-fonts.mjs). Cần `npm run pdf:fonts` — thiếu
// font thì ca CJK đỏ, đúng ý.

const HAS_POPPLER = (() => {
  try {
    execFileSync('pdffonts', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

function inspect(buf: Buffer, inkPage = 3): { fonts: string; text: string; ink: number } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfcjk-'));
  const f = path.join(dir, 'x.pdf');
  fs.writeFileSync(f, buf);
  // Tỉ lệ điểm ảnh có MỰC của một trang (ảnh xám 40 dpi). Trang văn thân CJK in đúng ⇒ vài %;
  // glyph rỗng ⇒ gần 0 dù `pdftotext` vẫn bóc ra đủ chữ.
  const p = String(inkPage);
  execFileSync('pdftoppm', ['-f', p, '-l', p, '-r', '40', '-gray', '-singlefile', f, path.join(dir, 'pg')]);
  const pgm = fs.readFileSync(path.join(dir, 'pg.pgm'));
  const hdr = /^P5\s+(\d+)\s+(\d+)\s+\d+\s/.exec(pgm.subarray(0, 40).toString('latin1'))!;
  const px = pgm.subarray(hdr[0].length);
  let dark = 0;
  for (const v of px) if (v < 160) dark++;
  return {
    fonts: execFileSync('pdffonts', [f]).toString(),
    text: execFileSync('pdftotext', ['-enc', 'UTF-8', f, '-']).toString(),
    ink: dark / px.length,
  };
}

const JA_TEXT =
  'あなたの命宮には紫微星が座しています。責任感が強く、周囲から頼られる存在です。' +
  'ただし一人で抱え込みすぎる傾向があるので、信頼できる人に任せることを覚えましょう。'.repeat(20);
const KO_TEXT = '명궁에 자미성이 자리하고 있습니다. 책임감이 강하고 주변에서 의지하는 사람입니다. '.repeat(20);

test.describe('PDF đa ngôn ngữ (W18)', () => {
  test('văn bản thuần Việt KHÔNG kéo font CJK nào', () => {
    expect(cjkFamiliesFor('Cung Mệnh có Tử Vi — “đế tinh” tọa thủ.', 'vi')).toEqual([]);
  });

  test('chọn font: theo ngôn ngữ đọc, thêm KR khi có Hangul', () => {
    expect(cjkFamiliesFor(JA_TEXT, 'ja')).toEqual(['Noto-ja']);
    expect(cjkFamiliesFor('紫微斗數', 'zh-tw')).toEqual(['Noto-zh-tw']);
    expect(cjkFamiliesFor('命宮 · 명궁', 'ja')).toEqual(['Noto-ja', 'Noto-ko']);
    expect(cjkFamiliesFor('命宮', 'en')).toEqual(['Noto-zh-tw']);
  });

  test('nhãn khung: vi giữ nguyên, ngôn ngữ khác dịch, zh-cn = OpenCC(zh-tw)', () => {
    expect(phanTitle('vi', 'Cung Mệnh')).toBe('Cung Mệnh');
    expect(phanTitle('ja', 'Cung Mệnh')).toBe('命宮');
    expect(phanTitle('en', 'Tổng Quan')).toBe('Overview');
    expect(phanTitle('ja', 'Tiêu đề lạ')).toBe('Tiêu đề lạ');
    expect(birthLine('vi', 3, 6, 1998, 'Tý')).toBe('3/6/1998, giờ Tý');
    expect(birthLine('ja', 3, 6, 1998, 'Tý')).toBe('3/6/1998, 子の刻');
    const cn = Converter({ from: 'twp', to: 'cn' });
    expect(cn(JSON.stringify(FRAME['zh-tw']))).toBe(JSON.stringify(FRAME['zh-cn']));
    expect(cn(JSON.stringify(TOOL_META_I18N['zh-tw']))).toBe(JSON.stringify(TOOL_META_I18N['zh-cn']));
  });

  test.describe('render thật', () => {
    // CI KHÔNG được bỏ qua (xanh oan): thiếu poppler ở CI thì đỏ, máy dev thiếu thì bỏ qua.
    test.skip(!HAS_POPPLER && !process.env.CI, 'cần poppler-utils (pdffonts/pdftotext/pdftoppm)');

    test('vi: chỉ Be Vietnam Pro, khung tiếng Việt như cũ', async () => {
      const { fonts, text } = inspect(
        await renderLuanGiaiPdf({
          toolId: 'laso',
          hoTen: 'Minh Anh',
          ngaySinh: '3/6/1998, giờ Tý',
          gioiTinh: 'Nữ',
          phans: [{ title: 'Cung Mệnh', text: 'Cung Mệnh có Tử Vi tọa thủ.' }],
        }),
      );
      expect(fonts).toMatch(/BeVietnamPro/i);
      expect(fonts).not.toMatch(/Helvetica|Noto/i);
      expect(text).toContain('TỬ VI MINH BẢO');
      expect(text).toContain('Mục lục');
      expect(text).toContain('Cung Mệnh có Tử Vi tọa thủ.');
    });

    test('ja: nhúng Noto JP, chữ bóc lại đúng, không rơi về Helvetica', async () => {
      const { fonts, text, ink } = inspect(
        await renderLuanGiaiPdf({
          toolId: 'laso',
          locale: 'ja',
          hoTen: '山田花子',
          ngaySinh: birthLine('ja', 3, 6, 1998, 'Tý'),
          gioiTinh: 'Nữ',
          phans: [{ title: 'Cung Mệnh', text: JA_TEXT }],
        }),
      );
      expect(fonts).toMatch(/NotoSansJP/i);
      expect(fonts).not.toMatch(/Helvetica/i);
      console.log('ink ja trang 3 =', ink);
      expect(ink).toBeGreaterThan(0.01);
      // Ngắt dòng giữa hai chữ Nhật KHÔNG được chèn '-' (textkit coi là ngắt âm tiết) — văn mẫu không có '-'.
      expect(text).not.toContain('-');
      const flat = text.replace(/\s+/g, '');
      for (const s of ['明宝紫微斗数', '命盤鑑定', '目次', '命宮', '山田花子', '女性', '子の刻', 'あなたの命宮には紫微星が座しています。']) {
        expect(flat).toContain(s);
      }
    });

    test('ko: Hangul nhúng Noto KR', async () => {
      const { fonts, text, ink } = inspect(
        await renderReportPdf({ locale: 'ko', title: '명반 풀이', subtitle: '김민지', sections: [{ header: '명궁', text: KO_TEXT }] }),
        2,
      );
      console.log('ink ko trang 2 =', ink);
      expect(ink).toBeGreaterThan(0.01);
      expect(fonts).toMatch(/NotoSansKR/i);
      expect(fonts).not.toMatch(/Helvetica/i);
      expect(text).toContain('명보 자미두수');
      expect(text.replace(/\s+/g, '')).toContain('명궁에자미성이자리하고있습니다.');
    });
  });
});
