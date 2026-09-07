#!/usr/bin/env node
// Canh BỘ DÒ CHỦ ĐỀ CÂU HỎI của 3 bề mặt (rail lá số · Tử Bình · Xem Tuổi).
//
// 🔴 Vì sao có bộ dò này: mẫu là ÂM TIẾT ĐƠN thì khớp oan hàng loạt, vì tiếng
// Việt viết RỜI từng âm tiết — 'quan' khớp "tổng quan"/"quan hệ"/"liên quan",
// 'sao' khớp "tại sao"/"vì sao"/"làm sao"/"ra sao". Và hỏng theo kiểu tệ nhất:
// KHÔNG phải thừa một mục mà là CƯỚP MẤT nhánh mặc định — câu mở đáng ra nhận
// đủ bộ mục thì chỉ nhận đúng một mục lạc đề, model luận chay phần còn lại.
// Không lỗi nào bắn ra.
//
// Lớp lỗi này đã tái phát 3 lần: `\bcon\b` khớp "con vật" · 'quan' khớp
// "tổng quan" · 'sao' khớp "vì sao".
//
// ⛔ Và ĐỪNG vá bằng biên từ (\b) — đo rồi, 0/20: trong "tổng quan" thì "quan"
// THẬT SỰ là âm tiết đứng riêng nên biên từ vẫn khớp. Biên từ chỉ cứu ngôn ngữ
// viết liền. Cách vá đúng là dùng CỤM ĐỦ NGHĨA ('quan lộc', 'sao xấu').
//
// ⚠️ Từng là BA BẢN CHÉP TAY — 2026-09 gộp 2/3: FOCUS_TOPICS (prompts.ts) và
// `topics` cũ ở app/api/xem-tuoi/route.ts dùng CÙNG khoá (tên cung) và đã trôi
// khỏi nhau thật (thiếu '|đối tác', thiếu điều kiện năm → __daiVan__) — nay
// xem-tuoi import thẳng `relevantPalaces` từ prompts.ts, không còn bảng riêng.
// `topicMap` ở app/api/tubinh/route.ts CỐ Ý còn đứng riêng: nó trả KHOÁ khác
// hẳn ('suckhoe' vs 'Tật Ách') vì Tử Bình không map theo 12 cung — gộp vào sẽ
// đổi ý nghĩa, không phải dọn trùng lặp. Bộ dò canh CẢ HAI để chúng không trôi
// khỏi nhau ở đúng chỗ đã cắn.
import fs from 'node:fs';

// Âm tiết đơn PHỔ BIẾN trong ngữ cảnh khác hẳn chủ đề nó định dò.
// Giữ danh sách HẸP và có lý do — bộ dò kêu oan là bộ dò bị tắt đi.
const AM_TIET_NGUY = {
  quan: 'tổng quan · quan hệ · quan tâm · liên quan · quan điểm · khách quan',
  sao: 'tại sao · vì sao · làm sao · ra sao',
  chức: 'tổ chức · chức năng',
  con: 'con vật · con số · con đường',
  cung: 'cung cấp · cung ứng',
  hạn: 'giới hạn · hạn chế',
  thân: 'thân thiết · bản thân · thân mật',
  sát: 'sát cánh · gần sát',
  tài: 'tài liệu · nhân tài · tài năng',
  vận: 'vận chuyển · vận động · may mắn',
};

const BANG = [
  [
    'lib/agent/prompts.ts',
    'FOCUS_TOPICS',
    /const FOCUS_TOPICS: Record<string, string\[\]> = \{([\s\S]*?)\n\};/,
  ],
  [
    'app/api/tubinh/route.ts',
    'topicMap',
    /const topicMap: Record<string, string\[\]> = \{([\s\S]*?)\n {2}\};/,
  ],
];

let loi = 0;
let tongMau = 0;

for (const [file, ten, re] of BANG) {
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    console.error(`❌ DỪNG: không đọc được ${file}.`);
    console.error(`   Bảng chủ đề đã dời chỗ? Sửa scripts/check-topic-patterns.mjs cho khớp.`);
    process.exit(1);
  }
  const m = src.match(re);
  if (!m) {
    // Đọc hụt rồi báo xanh còn tệ hơn báo đỏ — DỪNG HẲN (bài học check:motifs).
    console.error(`❌ DỪNG: không bóc được bảng \`${ten}\` trong ${file}.`);
    console.error(`   Đổi tên biến hay đổi bố cục? Sửa bộ dò TRƯỚC khi tin kết quả xanh.`);
    process.exit(1);
  }
  const mau = [];
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^\s*'([^']+)'\s*:/);
    if (mm) mau.push(mm[1]);
  }
  if (mau.length < 5) {
    console.error(
      `❌ DỪNG: bóc được ${mau.length} mẫu trong \`${ten}\` (${file}) — quá ít, nhiều khả năng bộ dò đọc hụt.`
    );
    process.exit(1);
  }
  tongMau += mau.length;

  for (const p of mau) {
    for (const alt of p.split('|')) {
      const a = alt.trim().toLowerCase();
      if (AM_TIET_NGUY[a]) {
        loi++;
        console.error(`❌ ${file} · \`${ten}\``);
        console.error(`   mẫu: '${p}'`);
        console.error(`   ↳ '${a}' là ÂM TIẾT ĐƠN, khớp oan: ${AM_TIET_NGUY[a]}`);
        console.error(
          `   ↳ thay bằng CỤM đủ nghĩa (vd 'quan lộc', 'sao xấu'), ĐỪNG thêm biên từ \\b.`
        );
      }
    }
  }
}

if (loi) {
  console.error(`\n${loi} mẫu âm-tiết-đơn trên ${BANG.length} bảng chủ đề.`);
  process.exit(1);
}
console.log(`✅ check:topics — ${tongMau} mẫu / ${BANG.length} bảng, 0 mẫu âm-tiết-đơn.`);
