// lib/pdf/luan-giai.tsx
// ============================================================
// Dựng PDF luận giải để gửi qua email — chạy thuần Node (@react-pdf/renderer,
// KHÔNG cần headless Chrome/Puppeteer), an toàn cho hàm serverless Vercel.
//
// Nội dung PDF là văn bản luận giải ĐÃ SINH RA (client gửi lên nguyên văn) —
// route này KHÔNG gọi lại LLM, KHÔNG tính lại lá số. Engine vẫn là nguồn số
// duy nhất; đây chỉ là một cách trình bày lại thứ đã hiển thị cho người dùng.
//
// 🔴 FONT — ĐỪNG bỏ `Font.register` dưới đây. Không đăng ký font thì
// @react-pdf/renderer rơi về Helvetica (Type1/WinAnsi chuẩn PDF, KHÔNG có
// glyph tiếng Việt) — bản trước lượt này chính xác đã hỏng kiểu đó: mọi PDF
// gửi qua `/api/luan-giai/email-pdf` từ trước tới giờ đọc ra "C ung M?nh"
// thay vì "Cung Mệnh" (đo bằng cách bóc content stream PDF thật — dấu mất
// hoàn toàn, không phải lỗi hiển thị của trình đọc). Route không throw,
// `email_log` vẫn ghi 'sent' — hỏng HOÀN TOÀN IM LẶNG, không ai báo.
// Đọc font trực tiếp từ đĩa (path string) qua fontkit — ĐÃ xác minh cách này
// chạy được (script Node độc lập, không qua Next): FontFile nhúng thật vào
// PDF, không còn `Helvetica` trong resource. Vercel cần
// `outputFileTracingIncludes` cho đúng route này để mang theo 2 file .ttf —
// xem next.config.mjs.
import React from 'react';
import { join } from 'path';
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';

const FONT_DIR = join(process.cwd(), 'public', 'fonts');
Font.register({
  family: 'BeVN',
  fonts: [
    { src: join(FONT_DIR, 'be-vietnam-pro-400.ttf'), fontWeight: 400 },
    { src: join(FONT_DIR, 'be-vietnam-pro-700.ttf'), fontWeight: 700 },
  ],
});
// @react-pdf/renderer tự động ngắt từ theo khoảng trắng — KHÔNG tự bật
// hyphenation cho tiếng Việt (không cần, từ tiếng Việt đơn âm tiết).
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 44, paddingHorizontal: 44, fontSize: 11, color: '#232323', lineHeight: 1.55, fontFamily: 'BeVN' },
  // ── Bìa ──
  coverPage: { padding: 56, fontFamily: 'BeVN', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' },
  coverTop: {},
  brandRow: { fontSize: 10, color: '#9A7B3A', letterSpacing: 3, marginBottom: 28, fontWeight: 700 },
  coverTitle: { fontSize: 26, color: '#061A2E', fontWeight: 700, marginBottom: 10, lineHeight: 1.3 },
  coverName: { fontSize: 15, color: '#061A2E', marginBottom: 16 },
  coverMetaRow: { fontSize: 10.5, color: '#6b6252', marginBottom: 3 },
  coverQuoteBlock: { marginTop: 40, paddingLeft: 16, borderLeft: '2pt solid #C9A84C' },
  // Be Vietnam Pro chỉ nhúng 2 file regular/bold (xem Font.register) — KHÔNG
  // có file italic, nên KHÔNG đặt `fontStyle:'italic'` ở đây: react-pdf tìm
  // đúng cặp (weight,style) đã đăng ký, thiếu variant nào là ném lỗi ngay lúc
  // render (đã bắt được lúc kiểm PDF thật). Tách bằng màu/cỡ chữ thay vì nghiêng.
  coverQuoteVi: { fontSize: 12, color: '#061A2E', fontWeight: 700, marginBottom: 6, lineHeight: 1.6 },
  coverQuoteViet: { fontSize: 10, color: '#6b6252', marginBottom: 4, lineHeight: 1.5 },
  coverQuoteSrc: { fontSize: 9, color: '#9A7B3A' },
  coverFoot: { fontSize: 9, color: '#999', textAlign: 'center' },
  // ── Mục lục ──
  tocTitle: { fontSize: 16, color: '#061A2E', fontWeight: 700, marginBottom: 18 },
  tocRow: { flexDirection: 'row', marginBottom: 9, fontSize: 11 },
  tocNum: { width: 24, color: '#9A7B3A', fontWeight: 700 },
  tocLabel: { flex: 1, color: '#232323' },
  // ── Nội dung ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottom: '1pt solid #E6DEC8', paddingBottom: 8 },
  // 🪤 `lineHeight` KHÔNG khai ở đây thì kế thừa `1.55` từ `page` — với box
  // cao CỐ ĐỊNH (22) + paddingTop, dòng chữ bị đẩy tràn khỏi khung và MẤT
  // HẲN (không phải mờ, biến mất — đã bắt bằng cách kiểm ảnh render thật, 3
  // biến thể so sánh). Khai `lineHeight` riêng, nhỏ hơn hẳn văn thường, để số
  // không bị kế thừa giá trị dành cho đoạn văn dài.
  sectionNum: { width: 22, height: 22, borderRadius: 5, backgroundColor: '#061A2E', color: '#C9A84C', fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.2, paddingTop: 6, marginRight: 8 },
  sectionTitle: { fontSize: 14, color: '#061A2E', fontWeight: 700 },
  para: { marginBottom: 8, textAlign: 'justify' },
  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, fontSize: 8, color: '#aaa', textAlign: 'center', borderTop: '0.5pt solid #eee', paddingTop: 6 },
});

export interface LuanGiaiPhan {
  title: string;
  text: string;
}

// Chỉ đúng 2 tool nay có nút "Gửi vào email" (xem plan productize, 2026-09):
// Luận Giải Tử Vi (laso, 13 phần) · Chu Trình Cuộc Đời (chu-trinh-cuoc-doi,
// 11 phần). Toolbox nào thêm sau tự vào allowlist ở route trước khi tới đây.
export type LuanGiaiToolId = 'laso' | 'chu-trinh-cuoc-doi';

export interface LuanGiaiPdfInput {
  toolId: LuanGiaiToolId;
  hoTen: string;
  ngaySinh: string; // đã format sẵn ở phía gọi, vd "12/03/1995 (Âm lịch: 21/2 Ất Hợi)"
  gioiTinh: string;
  phans: LuanGiaiPhan[];
}

// Tiêu đề + danh ngôn theo TỪNG TOOL — SAO CHÉP TỪ `BOOK_QUOTES` trong
// public/shell.js (bìa sách bản in trên trình duyệt), KHÔNG phải một nguồn
// công thức/cổ pháp nên không phạm luật "một nguồn số duy nhất" của
// CLAUDE.md — đây là văn bản trang trí tĩnh, hai nơi render bằng hai bộ máy
// khác hẳn nhau (React-PDF primitives vs HTML/CSS in trình duyệt) nên không
// thể dùng chung một hàm. Đổi quote thì sửa CẢ HAI chỗ.
const TOOL_META: Record<LuanGiaiToolId, { title: string; quoteVi: string; quoteViet: string; quoteSrc: string }> = {
  laso: {
    title: 'Luận Giải Lá Số',
    quoteVi: 'Tận kỳ tâm giả, tri kỳ tính dã; tri kỳ tính, tắc tri thiên hĩ.',
    quoteViet: 'Người thấu tận lòng mình thì biết được tính mình; biết tính mình thì biết được lẽ trời.',
    quoteSrc: 'Mạnh Tử · Tận Tâm thượng',
  },
  'chu-trinh-cuoc-doi': {
    title: 'Chu Trình Cuộc Đời',
    quoteVi: 'Tam thập nhi lập, tứ thập nhi bất hoặc, ngũ thập nhi tri thiên mệnh.',
    quoteViet: 'Ba mươi tuổi lập thân, bốn mươi tuổi hết nghi hoặc, năm mươi tuổi biết mệnh trời.',
    quoteSrc: 'Khổng Tử · Luận Ngữ, Vi Chính',
  },
};

function todayVi(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function LuanGiaiDoc({ input }: { input: LuanGiaiPdfInput }) {
  const meta = TOOL_META[input.toolId] || TOOL_META.laso;
  const ten = input.hoTen || 'Ẩn danh';
  return (
    <Document>
      {/* ── Trang bìa ── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTop}>
          {/* KHÔNG chèn "紫微明寶" (chữ Hán trang trí web dùng) — Be Vietnam Pro
              không có glyph CJK, và thiếu glyph làm react-pdf/fontkit ÂM THẦM
              đổi CẢ RUN chữ đó sang Helvetica-Bold (đã bắt được lúc kiểm PDF
              thật: /BaseFont Helvetica-Bold xuất hiện đúng ở trang bìa) — mất
              hệt tác dụng của Font.register bên trên cho riêng dòng này. */}
          <Text style={styles.brandRow}>TỬ VI MINH BẢO</Text>
          <Text style={styles.coverTitle}>{meta.title}</Text>
          <Text style={styles.coverName}>{ten}</Text>
          <Text style={styles.coverMetaRow}>Ngày sinh: {input.ngaySinh}</Text>
          <Text style={styles.coverMetaRow}>Giới tính: {input.gioiTinh}</Text>
          <Text style={styles.coverMetaRow}>Xuất bản: {todayVi()}</Text>
        </View>
        <View style={styles.coverQuoteBlock}>
          <Text style={styles.coverQuoteVi}>&ldquo;{meta.quoteVi}&rdquo;</Text>
          <Text style={styles.coverQuoteViet}>{meta.quoteViet}</Text>
          <Text style={styles.coverQuoteSrc}>— {meta.quoteSrc}</Text>
        </View>
        <Text style={styles.coverFoot}>tuviminhbao.com</Text>
      </Page>

      {/* ── Mục lục ── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>Mục lục</Text>
        {input.phans.map((phan, i) => (
          <View key={i} style={styles.tocRow}>
            <Text style={styles.tocNum}>{i + 1}</Text>
            <Text style={styles.tocLabel}>{phan.title}</Text>
          </View>
        ))}
        {/* 🪤 Footer KHÔNG dùng prop `render` (số trang động "trang X/Y") — đã
            kiểm bằng PDF thật: `render` trên <Text fixed> của bản
            @react-pdf/renderer 4.9.0 hiện cài KHÔNG xuất ra gì (không lỗi,
            không throw — chữ chỉ đơn giản BIẾN MẤT, cùng dạng hỏng-im-lặng
            như lỗi font ở trên). `fixed` với TEXT TĨNH (không `render`)
            render đúng — đổi ngược prop `render` là hồi quy về chữ trống. */}
        <Text style={styles.footer} fixed>tuviminhbao.com</Text>
      </Page>

      {/* ── Nội dung từng phần ── */}
      {input.phans.map((phan, i) => (
        <Page key={i} size="A4" style={styles.page} wrap>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNum}>{i + 1}</Text>
            <Text style={styles.sectionTitle}>{phan.title}</Text>
          </View>
          {phan.text.split(/\n{2,}/).map((para, j) => (
            <Text key={j} style={styles.para}>{para.trim()}</Text>
          ))}
          <Text style={styles.footer} fixed>tuviminhbao.com</Text>
        </Page>
      ))}
    </Document>
  );
}

export async function renderLuanGiaiPdf(input: LuanGiaiPdfInput): Promise<Buffer> {
  return renderToBuffer(<LuanGiaiDoc input={input} />);
}
