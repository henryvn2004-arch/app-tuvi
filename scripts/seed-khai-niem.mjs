#!/usr/bin/env node
// Gieo bộ sưu tập 'khai-niem' cho thu_vien_muc.
//
// KHÁC scripts/gen-thu-vien-index.mjs: bộ 'sao-cung'/'nap-am' trích XƯƠNG TẤT
// ĐỊNH từ engine; bộ 'khai-niem' này KHÔNG có nguồn engine tương ứng — glossary
// dưới đây do Claude Code dựng thủ công (đối chiếu keyword_ideas để sắp ưu tiên,
// loại trừ 4 mục đã có sẵn trong tu_dien: Tứ Hóa/Cách Cục/Đại Vận-Tiểu Vận/Vận
// Hạn Lưu Niên), ĐÃ ĐƯỢC HENRY DUYỆT danh sách 2026-09-19. Sửa danh sách thì sửa
// Ở ĐÂY, không sửa SQL đã sinh ra.
//
// `xuong.nhom` chỉ là thẻ phân nhóm cho trang hub sau này — không phải dữ kiện
// tất định. `tra_loi_ngan`/`than`/`hoi_dap`/`ten_han` để trống, chờ cron đắp văn
// qua cửa chất lượng rồi mới publish_status='published'.

import { writeFileSync } from 'node:fs';

const KHAI_NIEM = [
  // Cấu trúc lá số
  ['cung-menh-la-gi', 'Cung Mệnh Là Gì', 'Cấu trúc lá số'],
  ['cung-than-la-gi', 'Cung Thân Là Gì', 'Cấu trúc lá số'],
  ['tam-phuong-tu-chinh', 'Tam Phương Tứ Chính Là Gì', 'Cấu trúc lá số'],
  ['nhi-hop-cung', 'Nhị Hợp (Cung) Là Gì', 'Cấu trúc lá số'],
  ['xung-chieu-la-gi', 'Xung Chiếu Là Gì', 'Cấu trúc lá số'],
  ['dong-cung-la-gi', 'Đồng Cung Là Gì', 'Cấu trúc lá số'],
  ['vo-chinh-dieu', 'Vô Chính Diệu Là Gì', 'Cấu trúc lá số'],

  // Phân loại sao
  ['chinh-tinh-la-gi', 'Chính Tinh Là Gì', 'Phân loại sao'],
  ['phu-tinh-la-gi', 'Phụ Tinh Là Gì', 'Phân loại sao'],
  ['sat-tinh-la-gi', 'Sát Tinh Là Gì', 'Phân loại sao'],
  ['mieu-vuong-dac-ham', 'Miếu Vượng Đắc Hãm Là Gì', 'Phân loại sao'],
  ['luc-cat-tinh', 'Lục Cát Tinh Là Gì', 'Phân loại sao'],
  ['luc-sat-tinh', 'Lục Sát Tinh Là Gì', 'Phân loại sao'],

  // Vận hạn
  ['vong-truong-sinh', 'Vòng Trường Sinh Là Gì', 'Vận hạn'],
  ['thai-tue-la-gi', 'Thái Tuế Là Gì', 'Vận hạn'],
  ['tuan-triet-la-gi', 'Tuần Triệt Là Gì', 'Vận hạn'],
  ['han-cung-la-gi', 'Hạn Cung Là Gì', 'Vận hạn'],

  // Can Chi / Ngũ Hành / Âm Dương
  ['thien-can-la-gi', 'Thiên Can Là Gì', 'Can Chi Ngũ Hành Âm Dương'],
  ['dia-chi-la-gi', 'Địa Chi Là Gì', 'Can Chi Ngũ Hành Âm Dương'],
  ['ngu-hanh-la-gi', 'Ngũ Hành Là Gì', 'Can Chi Ngũ Hành Âm Dương'],
  ['am-duong-la-gi', 'Âm Dương Là Gì', 'Can Chi Ngũ Hành Âm Dương'],
  ['tuong-sinh-la-gi', 'Ngũ Hành Tương Sinh Là Gì', 'Can Chi Ngũ Hành Âm Dương'],
  ['tuong-khac-la-gi', 'Ngũ Hành Tương Khắc Là Gì', 'Can Chi Ngũ Hành Âm Dương'],
  ['ban-menh-la-gi', 'Bản Mệnh Là Gì', 'Can Chi Ngũ Hành Âm Dương'],

  // Cục trong Tử Vi
  ['cuc-trong-tu-vi', 'Cục Trong Tử Vi Là Gì', 'Cục trong Tử Vi'],
  ['thuy-nhi-cuc', 'Thủy Nhị Cục Là Gì', 'Cục trong Tử Vi'],
  ['moc-tam-cuc', 'Mộc Tam Cục Là Gì', 'Cục trong Tử Vi'],
  ['kim-tu-cuc', 'Kim Tứ Cục Là Gì', 'Cục trong Tử Vi'],
  ['tho-ngu-cuc', 'Thổ Ngũ Cục Là Gì', 'Cục trong Tử Vi'],
  ['hoa-luc-cuc', 'Hỏa Lục Cục Là Gì', 'Cục trong Tử Vi'],

  // Bát Tự / Tử Bình — 'Tứ Trụ' gộp vào 'Bát Tự' (đồng nghĩa, không tách trang)
  ['bat-tu-la-gi', 'Bát Tự (Tứ Trụ) Là Gì', 'Bát Tự Tử Bình'],
  ['tu-binh-la-gi', 'Tử Bình Là Gì', 'Bát Tự Tử Bình'],
  ['nhat-chu-la-gi', 'Nhật Chủ Là Gì', 'Bát Tự Tử Bình'],
  ['thap-than-la-gi', 'Thập Thần Là Gì', 'Bát Tự Tử Bình'],
  ['dung-than-la-gi', 'Dụng Thần Là Gì', 'Bát Tự Tử Bình'],
  ['dai-van-bat-tu', 'Đại Vận Trong Bát Tự Là Gì', 'Bát Tự Tử Bình'],
  ['than-sat-la-gi', 'Thần Sát Là Gì', 'Bát Tự Tử Bình'],

  // Kỳ Môn / Lục Nhâm / Dịch
  ['ky-mon-don-giap', 'Kỳ Môn Độn Giáp Là Gì', 'Kỳ Môn Lục Nhâm Dịch'],
  ['cuu-cung-la-gi', 'Cửu Cung Là Gì', 'Kỳ Môn Lục Nhâm Dịch'],
  ['bat-mon-la-gi', 'Bát Môn Là Gì', 'Kỳ Môn Lục Nhâm Dịch'],
  ['luc-nham-la-gi', 'Lục Nhâm Là Gì', 'Kỳ Môn Lục Nhâm Dịch'],
  ['mai-hoa-dich-so', 'Mai Hoa Dịch Số Là Gì', 'Kỳ Môn Lục Nhâm Dịch'],
  ['que-dich-bat-quai', 'Quẻ Dịch, Bát Quái Là Gì', 'Kỳ Môn Lục Nhâm Dịch'],

  // Hoàng lịch / Chiêm tinh
  ['ngay-hoang-dao', 'Ngày Hoàng Đạo Là Gì', 'Hoàng lịch Chiêm tinh'],
  ['ngay-hac-dao', 'Ngày Hắc Đạo Là Gì', 'Hoàng lịch Chiêm tinh'],
  ['nhi-thap-bat-tu', 'Nhị Thập Bát Tú Là Gì', 'Hoàng lịch Chiêm tinh'],
  ['thap-nhi-truc', '12 Trực (Kiến Trừ) Là Gì', 'Hoàng lịch Chiêm tinh'],
  ['gio-hoang-dao', 'Giờ Hoàng Đạo Là Gì', 'Hoàng lịch Chiêm tinh'],
  ['cung-hoang-dao-tay', 'Cung Hoàng Đạo (Tây Phương) Là Gì', 'Hoàng lịch Chiêm tinh'],
  ['12-con-giap', '12 Con Giáp Là Gì', 'Hoàng lịch Chiêm tinh'],

  // Địa chi nâng cao
  ['luc-hai-dia-chi', 'Lục Hại Là Gì', 'Địa chi nâng cao'],
  ['hinh-xung-khac-hai', 'Hình Xung Khắc Hại Là Gì', 'Địa chi nâng cao'],
  ['tam-hop-cuc-dia-chi', 'Tam Hợp Cục (Địa Chi) Là Gì', 'Địa chi nâng cao'],
  ['giap-cung-la-gi', 'Giáp Cung Là Gì', 'Địa chi nâng cao'],
];

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function buildSeedSql() {
  const escSql = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const lines = [
    '-- Gieo thu_vien_muc bo_suu_tap=khai-niem (draft) — SINH TỰ ĐỘNG bởi scripts/seed-khai-niem.mjs.',
    "-- publish_status giữ mặc định 'draft' — KHÔNG public cho tới khi cron đắp văn qua cửa chất lượng.",
    'begin;',
  ];
  for (const [slug, ten, nhom] of KHAI_NIEM) {
    const xuong = { nhom };
    lines.push(
      `insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values (${escSql(slug)}, 'khai-niem', ${escSql(ten)}, ${escSql(JSON.stringify(xuong))}::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;`
    );
  }
  lines.push('commit;');
  return lines.join('\n');
}

function main() {
  console.log(`Tổng: ${KHAI_NIEM.length} khái niệm.`);
  const bySlug = new Set();
  for (const [slug] of KHAI_NIEM) {
    if (bySlug.has(slug)) {
      console.error(`Trùng slug: ${slug}`);
      process.exit(1);
    }
    bySlug.add(slug);
  }
  const seedOutPath = arg('seed-out');
  if (seedOutPath) {
    const sql = buildSeedSql();
    writeFileSync(seedOutPath, sql);
    const n = (sql.match(/^insert /gm) || []).length;
    console.log(`Đã ghi SQL gieo khai-niem (${n} dòng INSERT, draft): ${seedOutPath}`);
  }
}

main();
