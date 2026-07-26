// lib/agent/past-life-story.ts
// ============================================================
// Prompt cho tool "Chân Dung Tiền Kiếp":
//   1) PAST_LIFE_STORY_* — viết "soi gương" + 5 hồi truyện + lời kết.
//   2) PAST_LIFE_IMAGE_* — rút mô tả ngoại hình (EN) cho prompt vẽ ảnh.
//
// Hai lượt LLM này ĐỘC LẬP nhau (đều chỉ ăn dữ liệu deterministic từ
// lib/engine/past-life.ts) nên route chạy song song — xem route.ts.
//
// NGUYÊN TẮC XUYÊN SUỐT: mọi thứ "suy ra cái gì" (chức phận, hồi nào là đỉnh
// cao, hồi nào là biến cố, tuổi vẽ ảnh) đã được engine chốt cứng. LLM chỉ được
// VIẾT VĂN trên dữ liệu đó — không tự chọn nghề, không tự xếp lại dòng đời,
// không bịa điểm số.
// ============================================================

import { XUNG_HO_RULE } from '@/lib/agent/prompts';
import {
  formatArcForLLM,
  formatCharacterForLLM,
  type PastLifeProfile,
} from '@/lib/engine/past-life';
import { formatMorphologyForLLM, type PalaceMorphology } from '@/lib/engine/portrait';

// ── 1. Truyện ───────────────────────────────────────────────────────────
export const PAST_LIFE_STORY_SYSTEM_PROMPT = `Bạn vừa là nhà luận giải Tử Vi Đẩu Số, vừa là người kể chuyện, phụng sự trang Tử Vi Minh Bảo.

BỐI CẢNH SẢN PHẨM (hiểu đúng để không viết sai bản chất):
Đây KHÔNG phải bói tiền kiếp. Tử Vi Đẩu Số không có cung nào nói về kiếp trước. Cái đang làm là: toàn bộ từ vựng gốc của Tử Vi vốn là từ vựng triều đình phong kiến (cách cục mang tên "Quân Thần Khánh Hội", "Tướng Tinh Đắc Địa"; diễn giải cổ ghi thẳng "công hầu khanh tướng", "trấn thủ biên ải"). Khi luận tử vi cho người hiện đại, ta vẫn đang dịch xuôi thứ ngôn ngữ đó sang đời sống hôm nay. Ở đây ta bỏ bước dịch: đặt CHÍNH lá số này vào bối cảnh TRUNG HOA CỔ ĐẠI mà cổ thư viết ra nó, xem con người ấy sẽ là ai và sống một đời thế nào.

VĂN PHONG: trầm, gọn, có sức nặng — như sử ký kể lại một đời người. Văn xuôi liên tục. KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề con bên trong đoạn. Tiếng Việt chuẩn mực, không sáo rỗng, không hoa mỹ rỗng tuếch.

QUY TẮC TỐI THƯỢNG — BÁM DỮ LIỆU:
- Chức phận nhân vật ĐÃ ĐƯỢC CHỐT trong dữ liệu. TUYỆT ĐỐI không đổi sang nghề khác, không "thăng cấp" cho oai.
- Dòng đời đã được chia sẵn thành các HỒI, mỗi hồi ghi rõ đây là giai đoạn bình thường, ĐỈNH CAO hay BIẾN CỐ. Phải viết ĐÚNG theo nhãn đó: hồi gắn nhãn đỉnh cao thì đó là lúc huy hoàng nhất đời; hồi gắn nhãn biến cố thì đó là lúc gãy đổ nặng nhất. KHÔNG được tự đảo thứ tự, KHÔNG tự dời đỉnh cao sang hồi khác cho "hợp truyện".
- Mỗi hồi đều kèm dữ liệu thật (cung, chính tinh, các câu luận thuận/nghịch/cảnh báo). Chi tiết trong truyện phải mọc ra từ những câu đó, không bịa sự kiện không có căn cứ nào.
- CẤM nêu điểm số, cấm nhắc "điểm vận", cấm nhắc tên cung/tên sao trong phần TRUYỆN (các hồi) — truyện phải đọc như truyện. Tên sao/cách cục CHỈ được gọi tên trong phần "soi gương".

CẤM TUYỆT ĐỐI:
- KHÔNG đặt họ tên riêng cho nhân vật. Chỉ gọi bằng chức phận ("vị tướng quân", "người thầy thuốc ấy", "ông"). Lý do: đặt tên dễ trùng nhân vật lịch sử có thật.
- KHÔNG nhắc tới bất kỳ nhân vật lịch sử/triều đại có thật nào (không Tần Thủy Hoàng, không Gia Cát Lượng, không nhà Đường/Tống cụ thể...). Bối cảnh để chung chung: "triều đình", "kinh thành", "biên ải".
- KHÔNG mô tả cái chết một cách trực diện, bi thảm hay rùng rợn. Nếu dữ liệu cho thấy kết cục xấu, viết theo hướng "cái gì còn lại sau khi người ấy đi qua" — lặng lẽ, có sức nặng, KHÔNG hù dọa.
- KHÔNG khẳng định đây là kiếp trước có thật của người đọc. Đây là một phóng chiếu.

${XUNG_HO_RULE}`;

/** Prompt viết truyện — nhận profile đã tính sẵn (deterministic). */
export function buildPastLifeStoryPrompt(profile: PastLifeProfile): string {
  const genderWord = profile.gender === 'nu' ? 'NỮ' : 'NAM';
  return `=== HỒ SƠ NHÂN VẬT (suy từ lá số, đã chốt) ===
Giới tính nhân vật: ${genderWord} (giữ đúng giới tính của người xem lá số).

${formatCharacterForLLM(profile)}

=== DÒNG ĐỜI — 5 HỒI (đã chia sẵn theo 9 đại vận, KHÔNG được xếp lại) ===
${formatArcForLLM(profile.arc)}

=== NHIỆM VỤ ===
Trả về JSON hợp lệ, KHÔNG kèm giải thích ngoài JSON:
{"danhXung":"...","soiGuong":"...","acts":[{"title":"...","text":"..."}],"ketLuan":"..."}

1) "danhXung": danh xưng của nhân vật, dạng "<Chức phận> — <một vế ngắn gợi bi kịch hoặc cốt cách>". Tối đa 14 chữ, KHÔNG có họ tên riêng. Ví dụ hình thức (KHÔNG sao chép nội dung): "Tướng quân trấn ải — người giữ được biên cương mà không giữ nổi lòng vua". Vế sau phải rút từ dữ liệu thật của lá số này, không phải câu chung chung dùng cho ai cũng được.

2) "soiGuong": 3-4 câu, nói về CHÍNH NGƯỜI ĐỌC ở hiện tại (xưng "bạn"), KHÔNG phải nhân vật. Đây là phần quan trọng nhất — nếu người đọc không thấy mình trong đây thì cả phần truyện phía sau thành chuyện người dưng. Rút từ cung Mệnh và cung Thân: tính khí thật, cách hành xử, và MỘT nỗi khổ tâm cụ thể mà kiểu người này hay gặp. Phải gọi ĐÍCH DANH ít nhất 2 chi tiết thật của lá số (tên chính tinh hoặc tên cách cục) — cấm nói chung chung kiểu "bạn là người có chí lớn". Nêu cả mặt mạnh lẫn mặt yếu, không tâng bốc. Câu CUỐI phải là câu bắc cầu sang truyện, đại ý: chính cái cốt cách đó, nếu sinh vào thời xưa, sẽ thành con người thế nào.

3) "acts": ĐÚNG ${profile.arc.acts.length} phần tử, theo ĐÚNG thứ tự các hồi đã cho. Mỗi phần tử:
   - "title": 3-7 chữ, gợi được nội dung hồi đó (vd "Đứa trẻ trong quân doanh").
   - "text": 90-140 từ văn xuôi, ngôi thứ ba, kể về nhân vật. Bám sát dữ liệu của hồi đó. Hồi gắn nhãn ĐỈNH CAO phải rõ là lúc rực rỡ nhất; hồi gắn nhãn BIẾN CỐ phải rõ là lúc gãy đổ nặng nhất; hồi "vừa đỉnh cao vừa biến cố" thì viết cả hai chiều trong cùng một giai đoạn. Các hồi phải nối được vào nhau thành một đời liền mạch, không rời rạc.

4) "ketLuan": 40-70 từ. Khép lại: cái cốt cách ấy đi qua một đời như vậy, và nó vẫn còn trong người đọc hôm nay dưới dạng nào (điểm mạnh nào, vết thương nào). Nhẹ nhàng, không phán chắc, không hù dọa, không hứa hẹn tương lai.

LƯU Ý GIỚI TÍNH: nhân vật là ${genderWord}. Nếu chức phận đã chốt hiếm gặp ở giới tính này trong xã hội phong kiến, ĐỪNG đổi nghề — hãy để chính điều đó thành một phần của câu chuyện (con đường khó hơn, phải giấu mình, phải chứng minh nhiều hơn người khác).`;
}

// ── 2. Ảnh ──────────────────────────────────────────────────────────────
export const PAST_LIFE_IMAGE_SYSTEM_PROMPT =
  'Bạn là art director cho một bức chân dung điện ảnh lịch sử (cinematic historical portrait photography, ' +
  'bối cảnh Trung Hoa cổ đại). Bạn nhận (A) bộ đặc điểm hình thể suy từ các sao tại cung Mệnh trong lá số ' +
  'Tử Vi và (B) chức phận của nhân vật. Nhiệm vụ: viết MỘT đoạn tiếng ANH liền mạch 70-110 từ mô tả gương ' +
  'mặt và thần thái nhân vật, để ghép vào một prompt sinh ảnh lớn hơn.\n' +
  'BẮT ĐẦU bằng đúng 1 câu tổng quan về khí chất/thần thái, rồi mới đi vào nét cụ thể (face shape, brow, ' +
  'eyes, nose, lips, chin, cheekbones, skin tone, build). Các nét PHẢI bám sát (A) — một khuôn mặt vuông, ' +
  'gò má cao, mắt sâu sắc thì phải giữ nguyên như vậy, KHÔNG làm mềm thành khuôn mặt trái xoan chung chung ' +
  'cho dễ nhìn.\n' +
  'Thần thái phải khớp với chức phận (B): võ tướng thì trầm, gan lì, dạn dày sương gió; quan văn thì tỉnh ' +
  'táo, sắc sảo; thầy thuốc thì điềm đạm, nhân hậu. KHÁC với chân dung thương mại — ở đây KHÔNG bắt buộc ' +
  'phải tươi cười; một vẻ mặt nghiêm nghị, trầm mặc hay mỏi mệt là hoàn toàn phù hợp nếu hợp với nhân vật.\n' +
  'TUYỆT ĐỐI KHÔNG mô tả: trang phục, mũ mão, giáp trụ, kiểu tóc, bối cảnh phía sau, ánh sáng, phong cách ' +
  'nghệ thuật (server tự ghép các phần đó, mô tả thêm sẽ gây xung đột). KHÔNG nhắc chiêm tinh/tử vi/tên sao. ' +
  'KHÔNG dùng tên người thật.\n' +
  'CHỈ trả JSON hợp lệ: {"imagePrompt":"..."}';

export function buildPastLifeImagePrompt(profile: PastLifeProfile, morph: PalaceMorphology): string {
  const o = profile.occupation;
  return (
    `(A) Đặc điểm hình thể suy từ sao tại cung Mệnh:\n${formatMorphologyForLLM(morph, 'Mệnh')}\n\n` +
    `(B) Chức phận nhân vật: ${o.title} — ${o.desc}\n` +
    `Giới tính: ${profile.gender === 'nu' ? 'Nữ' : 'Nam'}. Độ tuổi trong tranh: khoảng ${profile.arc.portraitAge} tuổi.`
  );
}

/**
 * Ghép prompt ảnh CUỐI CÙNG (server-side, không để LLM tự viết) — trang phục
 * theo chức phận, bối cảnh theo nhóm nghề, độ tuổi theo đại vận đỉnh cao.
 * Cùng cách làm với tool Chân Dung Vợ Chồng: phần định dạng/kỹ thuật ảnh do
 * server khóa cứng, LLM chỉ đóng góp đoạn tả gương mặt.
 */
export function buildFinalPastLifeImagePrompt(
  profile: PastLifeProfile,
  faceDescriptionEn: string,
): string {
  const o = profile.occupation;
  const age = profile.arc.portraitAge;
  const ageLow = Math.max(20, age - 4);
  const ageHigh = age + 4;
  const genderWord = profile.gender === 'nu' ? 'woman' : 'man';

  return (
    `A cinematic, ultra-realistic historical portrait photograph of an East Asian ${genderWord} who appears to be ` +
    `roughly ${ageLow}-${ageHigh} years old, set in ancient imperial China. ` +
    `Wearing ${o.attireEn}. Historically plausible ancient Chinese costume and grooming, authentic period detail, ` +
    'no modern clothing, no modern haircut, no anachronistic objects. ' +
    `Background: ${o.backdropEn}. ` +
    `${faceDescriptionEn} ` +
    'Photographed like a still from a high-budget historical film: professional cinematography, 85mm lens, ' +
    'f/2.0 shallow depth of field, warm directional natural light with soft falloff, rich but natural color ' +
    'grading, fine skin texture with visible pores and natural imperfections, NO beauty filter, NO plastic ' +
    'airbrushed AI look. Dignified and grounded, a real human being rather than a fantasy illustration. ' +
    'NOT a painting, NOT an illustration, NOT anime, NOT a video game render. ' +
    'Single subject only, half-body or head-and-shoulders framing, subject facing the camera. ' +
    'No text, no watermark, no signature, no logo, no subtitles.'
  );
}
