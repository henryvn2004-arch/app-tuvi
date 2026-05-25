// scripts/tuvi-compat/compose-lamam.mjs
// Render markdown bài "Tương Hợp Làm Ăn" từ analysis result
import { NAP_AM_DESC } from './can-chi.mjs';
import { pick, hashStr } from './analyze.mjs';
import * as V from './variants.mjs';

export function composeLamAn(analysis, slug) {
  const {
    A, B, canA, canB, chiA, chiB, naA, naB,
    canRel, chiRel, naRel,
    score, verdict, tuoiAName, tuoiBName,
  } = analysis;

  const seed = hashStr(slug);
  const out = [];

  // ── Mở bài ────────────────────────────────────────────────────────────────
  out.push(`## Tương Hợp Làm Ăn ${tuoiAName} Và ${tuoiBName}`);
  out.push('');
  out.push(pick(V.INTRO, seed, 0));
  out.push('');
  out.push(`Bài này phân tích tương hợp kinh doanh và hợp tác làm ăn giữa **${tuoiAName}** (mệnh ${naA.napAm} — ${naA.napAmHanh}) và **${tuoiBName}** (mệnh ${naB.napAm} — ${naB.napAmHanh}), đi đủ ba tầng cổ pháp và đưa ra lời khuyên cụ thể về vai trò, rủi ro và phân chia lợi nhuận.`);
  out.push('');

  // ── 1. Phân Tích Thiên Can ────────────────────────────────────────────────
  out.push(`### 1. Phân Tích Thiên Can: ${canA.name} & ${canB.name}`);
  out.push('');
  out.push(`Thiên can ${canA.name} thuộc hành **${canA.hanh}** (${canA.am ? 'âm' : 'dương'}), ${canB.name} thuộc hành **${canB.hanh}** (${canB.am ? 'âm' : 'dương'}). Trong kinh doanh, thiên can phản ánh tư tưởng kinh doanh nền tảng, triết lý làm việc và phương châm xử lý quyết định lớn.`);
  out.push('');
  if (canRel.type === 'hop') {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_HOP_DESC, seed, 1)}, hợp hóa thành hành **${canRel.hoaHanh}**. Trong cộng tác kinh doanh, can hợp là yếu tố nền móng quý giá — hai bên có xu hướng nhìn vấn đề từ cùng góc độ, dễ thống nhất chiến lược dài hạn mà không cần tranh luận nhiều.`);
    out.push('');
    out.push(`Sách "Tử Bình Hạp Hôn" của các bậc thầy đời Tống ghi: "Lưỡng Can Tương Hợp, Đồng Tâm Đồng Đạo" — hai can hợp thì cùng tâm cùng đường. Trong hợp tác làm ăn, đây là yếu tố giảm thiểu xung đột nội bộ — vốn là nguyên nhân hàng đầu khiến các đối tác chia tay sớm.`);
  } else if (canRel.type === 'khac') {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_KHAC_DESC, seed, 1)}. ${canA.hanh} và ${canB.hanh} ở thế tương khắc theo ngũ hành.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, can xung là yếu tố cần đặc biệt lưu tâm — biểu hiện qua các bất đồng về phương châm điều hành, định hướng phát triển, cách phân bổ nguồn lực. Cổ pháp khuyên: nếu vẫn muốn hợp tác, cần văn bản hóa rõ ràng vai trò, quyền hạn, quy trình ra quyết định từ trước; đừng dựa vào sự "tự hiểu nhau" vì khí trời không thuận sẽ không đủ làm cầu nối khi va chạm cụ thể xảy ra.`);
  } else if (canRel.type === 'sinh') {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_SINH_DESC, seed, 1)}. Trong kinh doanh, can tương sinh tạo ra mối quan hệ "Tiền Bối – Hậu Bối" hoặc "Người Hướng Dẫn – Người Thực Thi" — một bên dìu dắt một bên về tầm nhìn, bên kia bù lại bằng sức làm và sự thực thi.`);
    out.push('');
    out.push(`Đây là cấu trúc khá lý tưởng cho hợp tác có chia vai rõ — không phải đồng đẳng tuyệt đối nhưng bổ sung tự nhiên. Phù hợp với mô hình founder + cofounder có vai trò khác nhau.`);
  } else if (canRel.type === 'tuong-dong') {
    out.push(`Hai bên cùng thiên can ${canA.name}, ${pick(V.CAN_DONG_DESC, seed, 1)}.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, cùng can có lợi ở việc đồng cảm nhanh nhưng có rủi ro "Mù Chung Một Hướng" — cả hai cùng nhìn vấn đề từ một góc, dễ bỏ sót các góc nhìn khác. Lời khuyên là cố tình mời thêm cố vấn hoặc nhân sự có tuổi khác hành để cân bằng góc nhìn trong các quyết định lớn.`);
  } else {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_BINHHOA_DESC, seed, 1)}. Trong kinh doanh, can bình hòa nghĩa là yếu tố thiên can không tạo ưu thế cũng không tạo cản trở; thành bại phụ thuộc vào hai tầng còn lại và kỹ năng cụ thể.`);
  }
  out.push('');

  // ── 2. Phân Tích Địa Chi ──────────────────────────────────────────────────
  out.push(`### 2. Phân Tích Địa Chi: ${chiA.name} & ${chiB.name}`);
  out.push('');
  out.push(`Địa chi ${chiA.name} mang hành **${chiA.hanh}** (mùa ${chiA.mua}), ${chiB.name} mang hành **${chiB.hanh}** (mùa ${chiB.mua}). Trong kinh doanh, địa chi phản ánh nhịp làm việc, môi trường, đối tượng khách hàng và phương thức vận hành cụ thể.`);
  out.push('');
  if (chiRel.type === 'tam-hop') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.TAMHOP_DESC, seed, 2)}, hóa **${chiRel.cucHanh}** cục.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, tam hợp địa chi là yếu tố quý hiếm — cổ pháp Tử Bình xem là "Tam Hợp Cục, Tài Lộc Đồng Hành". Biểu hiện thực tế: hai bên dễ ra quyết định chung mà không cần tranh luận dài; khách hàng và đối tác đến với cả hai cùng lúc; thị trường mở ra theo hướng cả hai cùng muốn. Đây là cấu trúc rất phù hợp cho mô hình startup hoặc liên doanh — nơi tốc độ ra quyết định quan trọng hơn sự cẩn trọng từng li.`);
  } else if (chiRel.type === 'luc-hop') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.LUCHOP_DESC, seed, 2)}, hóa **${chiRel.hoaHanh}**.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, lục hợp là cấu trúc bền bỉ — không bùng nổ nhanh như tam hợp nhưng đi đường dài rất tốt. Phù hợp với các mô hình kinh doanh dài hạn, kinh doanh truyền thống cần sự ổn định, hoặc các nghề đòi hỏi uy tín tích lũy qua nhiều năm.`);
  } else if (chiRel.type === 'tu-xung') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.TUXUNG_DESC, seed, 2)}.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, tứ xung địa chi là yếu tố cần cân nhắc rất kỹ. Cổ pháp khuyến cáo cặp tứ xung không nên hợp tác kiểu 50-50 vì khả năng cao sẽ chia tay trong vòng 3-5 năm đầu do va chạm về phương thức điều hành. Tuy nhiên có một số hình thức vẫn khả thi: (1) một bên là chủ đa số, bên còn lại là cố vấn hoặc cổ đông thiểu số; (2) hai bên hợp tác qua hợp đồng dự án ngắn hạn, không kết cấu thành công ty chung; (3) chia tách thị trường rõ — mỗi bên phụ trách một mảng không chồng chéo.`);
  } else if (chiRel.type === 'luc-hai') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.LUCHAI_DESC, seed, 2)}.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, lục hại biểu hiện qua những bất lợi ngầm — không xung đối mặt nhưng âm thầm tạo trở ngại. Thường gặp là: thông tin truyền không trọn vẹn giữa hai bên, người ngoài hiểu lầm về vai trò, cấp dưới chọn phe gây mất đoàn kết nội bộ. Cách hóa giải: thiết lập quy trình giao tiếp chính thức bằng văn bản, hạn chế các kênh thông tin riêng tư bên lề, công khai vai trò và quyền hạn của mỗi bên với toàn bộ nhân sự.`);
  } else if (chiRel.type === 'tu-hinh') {
    out.push(`Hai bên cùng chi ${chiA.name}, rơi vào tự hình.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, tự hình biểu hiện qua việc cả hai cùng có một điểm yếu giống nhau — ví dụ cùng dễ chán việc lâu dài, cùng dễ nóng vội, hoặc cùng hay trì hoãn. Khi điểm yếu chung này bộc phát, không ai bù được cho ai. Lời khuyên: thuê hoặc cộng tác với một bên thứ ba có tính cách bù trừ điểm yếu chung này — ví dụ thuê COO chuyên về vận hành nếu cả hai founder cùng thiên về sáng tạo.`);
  } else if (chiRel.type === 'tam-hinh') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.TAMHINH_DESC, seed, 2)}.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, tam hình thường biểu hiện qua trở ngại đến từ chính sự thân thiết — quá tin nhau dẫn đến không kiểm tra chéo các quyết định, hoặc che chở lẫn nhau khi có vấn đề thay vì xử lý dứt khoát. Lời khuyên: giữ tính chuyên nghiệp trong các vấn đề công việc dù quan hệ cá nhân thân thiết; áp dụng quy trình kiểm toán chéo cho các quyết định lớn về tài chính.`);
  } else if (chiRel.type === 'tuong-dong') {
    out.push(`Hai bên cùng chi ${chiA.name}, cùng hành và cùng âm/dương — "Đồng Chi" thuần.`);
    out.push('');
    out.push(`Trong kinh doanh, đồng chi mang lại sự đồng cảm tự nhiên nhưng cũng dẫn đến rủi ro "Quá Giống Nhau". Lời khuyên là tận dụng sự đồng điệu để xây dựng văn hóa nội bộ thống nhất, đồng thời cố tình tuyển nhân sự có nền tảng khác biệt để bổ sung góc nhìn.`);
  } else if (chiRel.type === 'chi-sinh') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_SINH_DESC, seed, 2)}.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, ngũ hành chi tương sinh giúp công việc thường ngày chạy trơn — phân công dễ, giao việc dễ, không có nhiều ma sát trong vận hành. Đây là cấu trúc tốt trung bình, phù hợp với hợp tác có chia vai rõ.`);
  } else if (chiRel.type === 'chi-khac') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_KHAC_DESC, seed, 2)}.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, chi khắc nhẹ biểu hiện qua khác biệt về nhịp làm việc — một bên thích nhanh, một bên thích chắc; một bên thích họp nhiều, một bên thích làm việc độc lập. Cần thống nhất quy ước về phương thức làm việc từ đầu để tránh va chạm vận hành.`);
  } else if (chiRel.type === 'chi-dong') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_DONG_DESC, seed, 2)}.`);
    out.push('');
    out.push(`Trong hợp tác kinh doanh, cùng hành địa chi tạo cảm thức tương đồng — dễ chọn cùng một loại thị trường, cùng kiểu khách hàng. Tốt cho sự thống nhất chiến lược nhưng cần bổ sung sự đa dạng để mở rộng được.`);
  } else {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_BINHHOA_DESC, seed, 2)}. Tầng địa chi trung tính.`);
  }
  out.push('');

  // ── 3. Phân Tích Nạp Âm ───────────────────────────────────────────────────
  out.push(`### 3. Phân Tích Nạp Âm Lục Thập Hoa Giáp: ${naA.napAm} & ${naB.napAm}`);
  out.push('');
  out.push(`${tuoiAName} mang nạp âm **${naA.napAm}** — ${NAP_AM_DESC[naA.napAm] || 'một dạng của hành ' + naA.napAmHanh}. ${tuoiBName} mang nạp âm **${naB.napAm}** — ${NAP_AM_DESC[naB.napAm] || 'một dạng của hành ' + naB.napAmHanh}.`);
  out.push('');
  out.push(`Trong kinh doanh, nạp âm phản ánh chất liệu cụ thể của mệnh — gắn với tài lộc, sức khỏe vận hành, và khả năng chịu đựng áp lực dài hạn.`);
  out.push('');
  if (naRel.type === 'a-sinh-b' || naRel.type === 'b-sinh-a') {
    const giver = naRel.type === 'a-sinh-b' ? tuoiAName : tuoiBName;
    const receiver = naRel.type === 'a-sinh-b' ? tuoiBName : tuoiAName;
    out.push(`Hai nạp âm ${naA.napAm} (${naA.napAmHanh}) và ${naB.napAm} (${naB.napAmHanh}) ${pick(V.NAPAM_SINH, seed, 3)}. **${giver}** là nguồn nuôi dưỡng cho **${receiver}** — tốt cho cấu trúc người cấp vốn / người vận hành, hoặc người mở thị trường / người sản xuất.`);
    out.push('');
    out.push(`Sách cổ có câu: "Nạp Âm Tương Sinh, Tài Lộc Lưỡng Hưng" — nạp âm tương sinh thì tài lộc cùng phát. Đây là cấu trúc rất tốt cho liên doanh dài hạn, nơi sự nâng đỡ qua lại giữa hai bên là cốt lõi của thành công.`);
  } else if (naRel.type === 'a-khac-b' || naRel.type === 'b-khac-a') {
    out.push(`Hai nạp âm ${naA.napAm} (${naA.napAmHanh}) và ${naB.napAm} (${naB.napAmHanh}) ${pick(V.NAPAM_KHAC, seed, 3)}.`);
    out.push('');
    out.push(`Trong kinh doanh, nạp âm xung khắc thường biểu hiện qua bất đồng về cách dùng tiền — một bên muốn tái đầu tư, một bên muốn rút lợi; một bên thích đầu tư an toàn, một bên thích đầu tư rủi ro cao. Cách hóa giải: tách bạch tài khoản hoạt động khỏi tài khoản đầu tư; thiết lập quy chế ra quyết định dựa trên ngưỡng giá trị (việc dưới X đồng quyết một mình, việc trên X phải hai bên đồng ý); và quan trọng nhất là sử dụng kế toán độc lập thay vì tự kế toán nội bộ.`);
  } else if (naRel.type === 'tuong-dong') {
    out.push(`Hai nạp âm cùng hành **${naA.napAmHanh}** ${pick(V.NAPAM_DONG, seed, 3)}.`);
    out.push('');
    out.push(`Trong kinh doanh, cùng nạp âm có lợi ở chỗ hai bên có cùng "khẩu vị" về thị trường và sản phẩm. Tuy nhiên rủi ro lớn nhất là cả hai cùng yếu một mặt nào đó — ví dụ cùng hành Hỏa thì cả hai dễ nóng vội ra quyết định lớn, cùng hành Thủy thì cả hai dễ trôi nổi không quyết đoán. Lời khuyên là chủ động nhận diện điểm yếu chung và thuê chuyên gia ngoài bù vào.`);
  } else {
    out.push(`Hai nạp âm ${naA.napAm} (${naA.napAmHanh}) và ${naB.napAm} (${naB.napAmHanh}) ${pick(V.NAPAM_BINHHOA, seed, 3)}.`);
    out.push('');
    out.push(`Trong kinh doanh, nạp âm bình hòa nghĩa là yếu tố vật chất trung tính — thành bại dựa vào kỹ năng cụ thể, quy trình rõ ràng và may mắn thị trường nhiều hơn là dựa vào "duyên mệnh" giữa hai bên.`);
  }
  out.push('');

  // ── 4. Tổng đánh giá ──────────────────────────────────────────────────────
  out.push(`### 4. Tổng Đánh Giá Tương Hợp Kinh Doanh: ${score}/100`);
  out.push('');
  out.push(pick(V.VERDICT[verdict], seed, 4));
  out.push('');
  out.push(`**Điểm tổng cộng: ${score}/100** — tính dựa trên ba tầng: Thiên Can (${canRel.desc}), Địa Chi (${chiRel.desc}), Nạp Âm (${naRel.desc}).`);
  out.push('');

  // ── 5. Chi tiết vai trò – rủi ro – lợi nhuận ──────────────────────────────
  out.push(`### 5. Phân Tích Chi Tiết Hợp Tác Kinh Doanh`);
  out.push('');
  out.push(`#### Phân chia vai trò`);
  out.push(pick(score >= 60 ? V.LA_VAITRO_HOP : V.LA_VAITRO_KHO, seed, 5));
  out.push('');
  out.push(`#### Quản trị rủi ro`);
  out.push(pick(score >= 60 ? V.LA_RUIRO_HOP : V.LA_RUIRO_KHO, seed, 6));
  out.push('');
  out.push(`#### Lợi nhuận và phân chia`);
  out.push(pick(score >= 60 ? V.LA_LOINHUAN_HOP : V.LA_LOINHUAN_KHO, seed, 7));
  out.push('');

  // ── 5b. Phương pháp hóa giải cổ pháp ──────────────────────────────────────
  out.push(`### 6. Phương Pháp Hóa Giải Theo Cổ Pháp`);
  out.push('');
  const hoaGiaiPool = score >= 65 ? V.HOAGIAI_HIGH_SCORE : V.HOAGIAI_LOW_SCORE;
  out.push(pick(hoaGiaiPool, seed, 10));
  out.push('');

  // ── 5c. FAQ ────────────────────────────────────────────────────────────────
  out.push(`### 7. Câu Hỏi Thường Gặp`);
  out.push('');
  out.push(pick(V.FAQ_INTRO, seed, 11));
  out.push('');
  const faqs = V.buildFaqLamAn(seed, score, verdict, tuoiAName, tuoiBName);
  for (const f of faqs) {
    out.push(`**${f.q}**`);
    out.push('');
    out.push(f.a);
    out.push('');
  }

  // ── 8. Lời khuyên ─────────────────────────────────────────────────────────
  out.push(`### 8. Lời Khuyên Cho Hai Đối Tác`);
  out.push('');
  let advicePool;
  if (verdict === 'rat-hop' || verdict === 'hop') advicePool = V.ADVICE_GOOD;
  else if (verdict === 'kha') advicePool = V.ADVICE_NEUTRAL;
  else advicePool = V.ADVICE_BAD;
  out.push(pick(advicePool, seed, 8));
  out.push('');

  // ── 7. CTA ────────────────────────────────────────────────────────────────
  out.push(`### Xem Thêm`);
  out.push('');
  out.push(pick(V.CTA, seed, 9));

  return out.join('\n');
}
