// scripts/tuvi-compat/compose-honnhan.mjs
// Render markdown bài "Tương Hợp Hôn Nhân" từ analysis result
import { NAP_AM_DESC } from './can-chi.mjs';
import { pick, hashStr } from './analyze.mjs';
import * as V from './variants.mjs';

export function composeHonNhan(analysis, slug) {
  const {
    A, B, canA, canB, chiA, chiB, naA, naB,
    canRel, chiRel, naRel,
    score, verdict, tuoiAName, tuoiBName,
  } = analysis;

  const seed = hashStr(slug);
  const out = [];

  // ── Mở bài ────────────────────────────────────────────────────────────────
  out.push(`## Tương Hợp Hôn Nhân ${tuoiAName} Và ${tuoiBName}`);
  out.push('');
  out.push(pick(V.INTRO, seed, 0));
  out.push('');
  out.push(`Bài này phân tích tương hợp hôn nhân giữa **${tuoiAName}** (mệnh ${naA.napAm} — ${naA.napAmHanh}) và **${tuoiBName}** (mệnh ${naB.napAm} — ${naB.napAmHanh}), đi đủ ba tầng cổ pháp và đưa ra lời khuyên cụ thể về tình cảm, tài chính và con cái.`);
  out.push('');

  // ── 1. Phân Tích Thiên Can ────────────────────────────────────────────────
  out.push(`### 1. Phân Tích Thiên Can: ${canA.name} & ${canB.name}`);
  out.push('');
  out.push(`Thiên can ${canA.name} thuộc hành **${canA.hanh}** (${canA.am ? 'âm' : 'dương'}), trong khi ${canB.name} thuộc hành **${canB.hanh}** (${canB.am ? 'âm' : 'dương'}). Theo cổ pháp, thiên can phản ánh khí trời — tức tầng nguyên khí thượng tầng, ảnh hưởng đến cá tính bản nguyên và phương châm sống của mỗi người.`);
  out.push('');
  if (canRel.type === 'hop') {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_HOP_DESC, seed, 1)}, hợp hóa thành hành **${canRel.hoaHanh}**. Trong cổ pháp Tử Bình, đây là một trong "Ngũ Hợp" của thiên can — gồm Giáp-Kỷ hóa Thổ, Ất-Canh hóa Kim, Bính-Tân hóa Thủy, Đinh-Nhâm hóa Mộc, Mậu-Quý hóa Hỏa. Khi gặp can hợp, hai bên có xu hướng nghĩ giống nhau ở những việc lớn, dễ thống nhất quyết định và cùng hướng về một mục tiêu.`);
    out.push('');
    out.push(`Trong hôn nhân, can hợp được xem là yếu tố nền móng cho sự đồng tâm — không phải lúc nào cũng tránh được tranh luận, nhưng khi tranh luận xong cả hai vẫn quay về một hướng chung. Đây là điểm khá quan trọng để duy trì hôn nhân dài lâu.`);
  } else if (canRel.type === 'khac') {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_KHAC_DESC, seed, 1)}. Cụ thể, ${canA.hanh} và ${canB.hanh} ở thế tương khắc theo ngũ hành sinh khắc — Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim. Khi hai can rơi vào tương khắc, biểu hiện ra đời sống là sự khác biệt về tư tưởng nền, lối tư duy và phương châm xử thế.`);
    out.push('');
    out.push(`Trong hôn nhân, can xung không phải là điểm chết — nhiều cặp can xung vẫn sống bền nếu địa chi và nạp âm hỗ trợ tốt. Tuy nhiên cả hai cần ý thức rằng những bất đồng quan điểm sẽ xuất hiện thường xuyên hơn so với các cặp can hợp, và sự kiên nhẫn lắng nghe là cần thiết.`);
  } else if (canRel.type === 'sinh') {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_SINH_DESC, seed, 1)}. Quan hệ tương sinh giữa hai can có nghĩa một bên là nguồn nuôi dưỡng cho bên kia — ví dụ Mộc sinh Hỏa thì người mang can Mộc dìu dắt người mang can Hỏa về tinh thần.`);
    out.push('');
    out.push(`Trong hôn nhân, can tương sinh là yếu tố tốt trung bình — không quá nồng nàn như can hợp nhưng cũng không gây xung đột như can khắc. Đây là thế ấm áp, hợp với những cặp đôi yêu thích sự bình yên hơn là đam mê cường độ cao.`);
  } else if (canRel.type === 'tuong-dong') {
    out.push(`Hai bên cùng thiên can ${canA.name}, ${pick(V.CAN_DONG_DESC, seed, 1)}. Cùng can có nghĩa cùng hành ${canA.hanh} và cùng âm/dương; cổ pháp gọi là "Đồng Tâm Đồng Khí" — tốt ở chỗ đồng cảm nhanh, nhưng cũng có rủi ro thiếu sự bù trừ.`);
    out.push('');
    out.push(`Trong hôn nhân, cùng can đôi khi dẫn đến cảm giác "như đang sống với chính mình" — quá quen thuộc đến mức mất đi sự mới mẻ. Vì vậy cả hai cần ý thức về việc giữ nét riêng của mỗi người, không hòa lẫn đến mức triệt tiêu cá tính.`);
  } else {
    out.push(`Hai can ${canA.name}–${canB.name} ${pick(V.CAN_BINHHOA_DESC, seed, 1)}. Tức ở tầng thiên can, yếu tố này không phải điểm cộng cũng không phải điểm trừ trong cấu trúc tương hợp tổng thể.`);
    out.push('');
    out.push(`Trong trường hợp này, các tầng địa chi và nạp âm sẽ giữ vai trò quyết định chính. Thiên can bình hòa nghĩa là khí trời không can dự — mọi việc phụ thuộc vào tương quan ở các tầng dưới.`);
  }
  out.push('');

  // ── 2. Phân Tích Địa Chi ──────────────────────────────────────────────────
  out.push(`### 2. Phân Tích Địa Chi: ${chiA.name} & ${chiB.name}`);
  out.push('');
  out.push(`Địa chi ${chiA.name} mang hành **${chiA.hanh}** (${chiA.am ? 'âm' : 'dương'}, mùa ${chiA.mua}), trong khi ${chiB.name} mang hành **${chiB.hanh}** (${chiB.am ? 'âm' : 'dương'}, mùa ${chiB.mua}). Địa chi đại diện cho tầng địa lý — biểu hiện cụ thể, đời sống hằng ngày, không gian sinh hoạt và môi trường thực tế của mỗi người.`);
  out.push('');
  if (chiRel.type === 'tam-hop') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.TAMHOP_DESC, seed, 2)}. Cụ thể đây là tam hợp hóa **${chiRel.cucHanh}**, một trong bốn cục tam hợp lớn nhất của địa chi: Thân-Tý-Thìn (Thủy cục), Tỵ-Dậu-Sửu (Kim cục), Dần-Ngọ-Tuất (Hỏa cục), và Hợi-Mão-Mùi (Mộc cục).`);
    out.push('');
    out.push(`Tam hợp địa chi là quan hệ mạnh nhất giữa các chi — cổ pháp xếp ngang hàng với "Lưỡng Tinh Hội Chiếu" trong Tử Vi Đẩu Số. Trong hôn nhân, đây là yếu tố quý hiếm: hai bên có xu hướng đồng cảm sâu sắc, cùng nhịp sinh hoạt, cùng cảm thức về thời gian và không gian. Sách "Tam Mệnh Thông Hội" của Vạn Dân Anh có câu: "Tam hợp tương ngộ, sự sự hài hòa" — gặp được người tam hợp, mọi việc đều hòa thuận.`);
  } else if (chiRel.type === 'luc-hop') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.LUCHOP_DESC, seed, 2)}. Cụ thể là lục hợp hóa **${chiRel.hoaHanh}**. Sáu cặp lục hợp trong cổ pháp gồm: Tý-Sửu hóa Thổ, Dần-Hợi hóa Mộc, Mão-Tuất hóa Hỏa, Thìn-Dậu hóa Kim, Tỵ-Thân hóa Thủy, và Ngọ-Mùi tượng trưng cho Thái Dương–Thái Âm tương ngộ.`);
    out.push('');
    out.push(`Lục hợp dịu hơn tam hợp nhưng có sức bền vô cùng đáng quý. Trong hôn nhân, lục hợp được ví như "Phu Thê Đồng Mệnh" — không phải sự cuồng nhiệt nồng cháy mà là sự thấu hiểu lẳng lặng, càng sống chung càng thấy hợp. Đây là yếu tố lý tưởng cho hôn nhân vì hôn nhân vốn cần sự bền lâu hơn là cường độ.`);
  } else if (chiRel.type === 'tu-xung') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.TUXUNG_DESC, seed, 2)}. Sáu cặp tứ hành xung gồm: Tý-Ngọ, Sửu-Mùi, Dần-Thân, Mão-Dậu, Thìn-Tuất và Tỵ-Hợi — các cặp này nằm đối diện nhau trên bàn la kinh 12 cung.`);
    out.push('');
    out.push(`Trong hôn nhân, tứ xung là yếu tố cổ pháp lưu ý nhiều nhất. Sách "Hiệp Kỷ Biện Phương Thư" viết: "Lục Xung Tương Phùng, Cần Tu Hóa Giải" — gặp lục xung, cần phải hóa giải. Tuy nhiên hóa giải không có nghĩa là không cưới được; có nhiều phương pháp: chọn ngày cưới hợp với cả hai, sinh con ở tuổi hợp một trong hai bên, chọn hướng nhà hợp với cả hai cung mệnh, hoặc đeo phong thủy hóa giải. Quan trọng nhất vẫn là sự thấu hiểu và chủ động giao tiếp giữa hai vợ chồng.`);
  } else if (chiRel.type === 'luc-hai') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.LUCHAI_DESC, seed, 2)}. Sáu cặp lục hại gồm: Tý-Mùi, Sửu-Ngọ, Dần-Tỵ, Mão-Thìn, Thân-Hợi và Dậu-Tuất. Khác với lục xung là va đối diện, lục hại là sự bất lợi âm thầm — không xung mặt nhưng bào mòn dần dần.`);
    out.push('');
    out.push(`Trong hôn nhân, lục hại không phải là yếu tố chí mạng nhưng cần được nhận diện sớm. Biểu hiện thường là những bất đồng nhỏ tích tụ — chuyện không lớn nhưng cứ lặp lại hoài đến mức thành thói quen. Cách hóa giải là cả hai cùng học cách "tha thứ vĩnh viễn" cho những sai lầm nhỏ, đừng để chúng tích lũy.`);
  } else if (chiRel.type === 'tu-hinh') {
    out.push(`Hai bên cùng chi ${chiA.name}, ${pick(V.TUHINH_DESC, seed, 2)}. Bốn chi tự hình theo cổ pháp là Thìn, Ngọ, Dậu và Hợi — khi hai bên cùng một trong các chi này, khí của họ cộng hưởng quá mạnh dẫn đến mất cân bằng nội tại.`);
    out.push('');
    out.push(`Trong hôn nhân, tự hình biểu hiện qua việc cả hai cùng có một điểm yếu giống nhau và không ai có thể là điểm tựa cho người kia khi điểm yếu đó bộc phát. Lời khuyên là cần có bạn bè và mạng lưới xã hội đa dạng bên ngoài quan hệ vợ chồng để không bị "cộng hưởng âm" khi cả hai cùng rơi vào tâm trạng tiêu cực.`);
  } else if (chiRel.type === 'tam-hinh') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.TAMHINH_DESC, seed, 2)}. Tam hình theo cổ pháp gồm ba nhóm: Dần-Tỵ-Thân (vô ân chi hình — hình thương không lý do), Sửu-Tuất-Mùi (hữu ân chi hình — hình từ sự gần gũi), và Tý-Mão (tương hình thuần).`);
    out.push('');
    out.push(`Trong hôn nhân, tam hình biểu hiện qua những trở ngại đến từ chính sự gần gũi — càng yêu càng dễ làm tổn thương nhau bằng những lời nói vô ý. Lời khuyên là học cách giữ khoảng cách lành mạnh, không chia sẻ mọi thứ với nhau ngay lập tức, để mỗi người có không gian riêng tự xử lý cảm xúc trước.`);
  } else if (chiRel.type === 'tuong-dong') {
    out.push(`Hai bên cùng chi ${chiA.name}, cùng hành ${chiA.hanh} và cùng âm/dương. Trong cổ pháp, hai chi giống hệt không thuộc tự hình thì đơn giản là "Đồng Chi" — không xung không khắc nhưng cũng không có hiệu ứng hợp đặc biệt.`);
    out.push('');
    out.push(`Trong hôn nhân, đồng chi mang ý nghĩa "Giống Nhau Quá" — hai bên có thể đồng thuận về sở thích, lối sống, nhưng cũng dễ thiếu yếu tố mới mẻ. Cần ý thức tìm kiếm sự khác biệt qua các sở thích cá nhân, công việc khác nhau để cuộc sống chung không trở nên đơn điệu.`);
  } else if (chiRel.type === 'chi-sinh') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_SINH_DESC, seed, 2)}. Ở tầng địa chi, dù không thuộc tam hợp hay lục hợp chính danh, ngũ hành tương sinh vẫn tạo ra dòng khí thuận giữa hai bên.`);
    out.push('');
    out.push(`Trong hôn nhân, đây là yếu tố tốt trung bình. Cuộc sống thường ngày sẽ ổn định, không có những bất đồng lớn, các sinh hoạt như ăn uống, ngủ nghỉ, làm việc nhà dễ thống nhất.`);
  } else if (chiRel.type === 'chi-khac') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_KHAC_DESC, seed, 2)}. Tương khắc địa chi ở mức nhẹ — không nằm trong tứ xung hay lục hại nhưng vẫn tạo ra sự bất hợp về nhịp sống.`);
    out.push('');
    out.push(`Trong hôn nhân, biểu hiện qua việc hai bên có thói quen sinh hoạt khác nhau — giờ giấc khác, sở thích khác, thậm chí khẩu vị ăn uống khác. Không phải vấn đề lớn nếu cả hai chủ động dung hòa.`);
  } else if (chiRel.type === 'chi-dong') {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_DONG_DESC, seed, 2)}. Cùng hành nhưng khác chi cụ thể, hai bên có nét giống nhau nhưng không trùng khít.`);
    out.push('');
    out.push(`Trong hôn nhân, cùng hành địa chi mang lại sự tương đồng dễ chịu — hai bên hiểu nhanh các giá trị của nhau, không cần giải thích nhiều. Tuy nhiên nên có ý thức bổ sung sự đa dạng để cuộc sống không bị bó hẹp.`);
  } else {
    out.push(`Hai chi ${chiA.name}–${chiB.name} ${pick(V.CHI_BINHHOA_DESC, seed, 2)}. Ở tầng địa chi, hai bên không có quan hệ đặc biệt — không hợp, không xung, không hại, không hình.`);
    out.push('');
    out.push(`Trong hôn nhân, tầng địa chi trung tính nghĩa là yếu tố quyết định nằm ở thiên can và nạp âm. Quan hệ sẽ ổn định nếu hai tầng còn lại hỗ trợ tốt.`);
  }
  out.push('');

  // ── 3. Phân Tích Nạp Âm ───────────────────────────────────────────────────
  out.push(`### 3. Phân Tích Nạp Âm Lục Thập Hoa Giáp: ${naA.napAm} & ${naB.napAm}`);
  out.push('');
  out.push(`${tuoiAName} mang nạp âm **${naA.napAm}** — ${NAP_AM_DESC[naA.napAm] || 'một dạng của hành ' + naA.napAmHanh}. ${tuoiBName} mang nạp âm **${naB.napAm}** — ${NAP_AM_DESC[naB.napAm] || 'một dạng của hành ' + naB.napAmHanh}.`);
  out.push('');
  out.push(`Nạp âm là tầng thứ ba và là tầng cụ thể nhất — đại diện cho chất liệu vật cụ thể của mỗi mệnh. Trong khi Thiên Can là khí trời thượng tầng, Địa Chi là tầng đất biểu hiện, thì Nạp Âm là tầng vật chất — gắn liền với đời sống vật cụ thể, sức khỏe, kinh tế và hành xử trong việc thực tế.`);
  out.push('');
  if (naRel.type === 'a-sinh-b' || naRel.type === 'b-sinh-a') {
    const giver = naRel.type === 'a-sinh-b' ? tuoiAName : tuoiBName;
    const receiver = naRel.type === 'a-sinh-b' ? tuoiBName : tuoiAName;
    out.push(`Hai nạp âm ${naA.napAm} (${naA.napAmHanh}) và ${naB.napAm} (${naB.napAmHanh}) ${pick(V.NAPAM_SINH, seed, 3)}. Cụ thể, **${giver}** là nguồn nuôi dưỡng cho **${receiver}** — đây là thế "tương sinh ngược" trong nạp âm, cổ pháp xem là rất tốt cho mọi quan hệ dài hạn vì có chiều cho nhận rõ ràng.`);
    out.push('');
    out.push(`Trong hôn nhân, nạp âm tương sinh là một trong những yếu tố quý nhất theo Tử Bình. Sách cổ có câu: "Nạp Âm Tương Sinh, Phu Thê Đắc Lực" — nạp âm tương sinh thì vợ chồng nâng đỡ nhau hiệu quả. Biểu hiện ra đời sống thực tế là khi một người gặp khó, người kia tự nhiên có sức hỗ trợ; tiền bạc và sự nghiệp thường thuận, ít gặp đại tai họa cùng lúc.`);
  } else if (naRel.type === 'a-khac-b' || naRel.type === 'b-khac-a') {
    out.push(`Hai nạp âm ${naA.napAm} (${naA.napAmHanh}) và ${naB.napAm} (${naB.napAmHanh}) ${pick(V.NAPAM_KHAC, seed, 3)}. Đây là yếu tố cổ pháp xem là trừ điểm — nạp âm là tầng vật chất nên khắc ở tầng này gây ra va chạm trong sinh hoạt thực tế.`);
    out.push('');
    out.push(`Trong hôn nhân, nạp âm xung khắc biểu hiện qua bất đồng về tiền bạc, sở thích ăn uống, cách bài trí nhà cửa, lựa chọn nơi sống, cách dạy con — những việc tưởng nhỏ nhưng tích lại có thể bào mòn quan hệ. Cách hóa giải: lập quy ước rõ ràng cho các quyết định lớn (mua nhà, đầu tư, dạy con), tôn trọng vùng riêng của nhau (ngăn riêng tiền cá nhân, không gian riêng trong nhà), và sử dụng phong thủy bù trừ (chọn hướng nhà hợp một trong hai mệnh).`);
  } else if (naRel.type === 'tuong-dong') {
    out.push(`Hai nạp âm cùng hành **${naA.napAmHanh}** — ${tuoiAName} (${naA.napAm}) và ${tuoiBName} (${naB.napAm}) ${pick(V.NAPAM_DONG, seed, 3)}. Dù hai biến thể của hành ${naA.napAmHanh} là khác nhau, về căn bản cả hai vẫn cùng chất.`);
    out.push('');
    out.push(`Trong hôn nhân, cùng nạp âm là yếu tố tốt trung bình — không phải tương sinh mạnh mẽ nhưng cũng không xung khắc. Hai bên có cảm thức tương đồng về vật chất, sở thích sinh hoạt, có thể cùng theo đuổi mục tiêu kinh tế chung. Cần lưu ý: cùng hành đôi khi dẫn đến "thiếu sự bổ sung" — nếu cả hai cùng yếu một mặt nào đó thì không ai bù cho ai được.`);
  } else {
    out.push(`Hai nạp âm ${naA.napAm} (${naA.napAmHanh}) và ${naB.napAm} (${naB.napAmHanh}) ${pick(V.NAPAM_BINHHOA, seed, 3)}.`);
    out.push('');
    out.push(`Trong hôn nhân, nạp âm bình hòa nghĩa là tầng vật chất không can dự đáng kể vào tương hợp. Mọi quyết định về sinh hoạt thực tế phụ thuộc vào sự thỏa thuận có chủ ý giữa hai vợ chồng, không có lực hấp dẫn tự nhiên nào dẫn dắt.`);
  }
  out.push('');

  // ── 4. Tổng đánh giá ──────────────────────────────────────────────────────
  out.push(`### 4. Tổng Đánh Giá Tương Hợp: ${score}/100`);
  out.push('');
  out.push(pick(V.VERDICT[verdict], seed, 4));
  out.push('');
  out.push(`**Điểm tổng cộng: ${score}/100** — tính dựa trên ba tầng: Thiên Can (${canRel.desc}), Địa Chi (${chiRel.desc}), Nạp Âm (${naRel.desc}).`);
  out.push('');

  // ── 5. Chi tiết tình cảm – tài chính – con cái ────────────────────────────
  out.push(`### 5. Phân Tích Chi Tiết Hôn Nhân`);
  out.push('');
  out.push(`#### Tình cảm`);
  out.push(pick(score >= 60 ? V.HN_TINHCAM_GOOD : V.HN_TINHCAM_BAD, seed, 5));
  out.push('');
  out.push(`#### Tài chính`);
  out.push(pick(score >= 60 ? V.HN_TAICHINH_GOOD : V.HN_TAICHINH_BAD, seed, 6));
  out.push('');
  out.push(`#### Con cái`);
  out.push(pick(score >= 60 ? V.HN_CONCAI_GOOD : V.HN_CONCAI_NEUTRAL, seed, 7));
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
  const faqs = V.buildFaqHonNhan(seed, score, verdict, tuoiAName, tuoiBName);
  for (const f of faqs) {
    out.push(`**${f.q}**`);
    out.push('');
    out.push(f.a);
    out.push('');
  }

  // ── 8. Lời khuyên ─────────────────────────────────────────────────────────
  out.push(`### 8. Lời Khuyên Cho Cặp Đôi`);
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
