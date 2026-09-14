// lib/pdf/luan-giai.tsx
// ============================================================
// Dựng PDF luận giải để gửi qua email — chạy thuần Node (@react-pdf/renderer,
// KHÔNG cần headless Chrome/Puppeteer), an toàn cho hàm serverless Vercel.
//
// Nội dung PDF là văn bản luận giải ĐÃ SINH RA (client gửi lên nguyên văn) —
// route này KHÔNG gọi lại LLM, KHÔNG tính lại lá số. Engine vẫn là nguồn số
// duy nhất; đây chỉ là một cách trình bày lại thứ đã hiển thị cho người dùng.
// ============================================================
import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: '#222', lineHeight: 1.5 },
  header: { marginBottom: 20, borderBottom: '1pt solid #C9A84C', paddingBottom: 12 },
  brand: { fontSize: 10, color: '#C9A84C', letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 18, color: '#061A2E', marginBottom: 6 },
  meta: { fontSize: 10, color: '#666', marginBottom: 2 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 13, color: '#061A2E', marginBottom: 6, fontWeight: 700 },
  para: { marginBottom: 6 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
});

export interface LuanGiaiPhan {
  title: string;
  text: string;
}

export interface LuanGiaiPdfInput {
  hoTen: string;
  ngaySinh: string; // đã format sẵn ở phía gọi, vd "12/03/1995 (Âm lịch: 21/2 Ất Hợi)"
  gioiTinh: string;
  phans: LuanGiaiPhan[];
}

function LuanGiaiDoc({ input }: { input: LuanGiaiPdfInput }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.brand}>紫微明寶 · TỬ VI MINH BẢO</Text>
          <Text style={styles.title}>Luận Giải Lá Số — {input.hoTen || 'Ẩn danh'}</Text>
          <Text style={styles.meta}>Ngày sinh: {input.ngaySinh}</Text>
          <Text style={styles.meta}>Giới tính: {input.gioiTinh}</Text>
        </View>
        {input.phans.map((phan, i) => (
          <View key={i} style={styles.section} wrap>
            <Text style={styles.sectionTitle}>{phan.title}</Text>
            {phan.text.split(/\n{2,}/).map((para, j) => (
              <Text key={j} style={styles.para}>{para.trim()}</Text>
            ))}
          </View>
        ))}
        <Text style={styles.footer} fixed
          render={({ pageNumber, totalPages }) => `tuviminhbao.com — trang ${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  );
}

export async function renderLuanGiaiPdf(input: LuanGiaiPdfInput): Promise<Buffer> {
  return renderToBuffer(<LuanGiaiDoc input={input} />);
}
