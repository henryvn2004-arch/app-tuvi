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

VAI TRÒ: bạn đang VIẾT TRUYỆN, không phải luận giải lá số. Người đọc thừa biết nội dung dựng từ lá số của họ — nói lại điều đó trong lời văn chỉ làm hỏng truyện.

VĂN PHONG: trầm, gọn, có sức nặng — như một thiên truyện kể lại đời người. Văn xuôi liên tục. KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề con bên trong đoạn. Tiếng Việt chuẩn mực, không sáo rỗng.

CẤM TUYỆT ĐỐI MỌI THUẬT NGỮ TỬ VI TRONG PHẦN CHỮ TRẢ VỀ (đây là luật quan trọng nhất):
- Cấm nhắc tên sao (Thất Sát, Cự Môn, Tham Lang, Hóa Kỵ...), tên cung (cung Mệnh, Quan Lộc, Phúc Đức...), tên cách cục, "đại vận", "tiểu vận", "lá số", "tử vi", "mệnh lý", "chính tinh", "sát tinh".
- Cấm nêu điểm số dưới mọi hình thức.
- Dữ liệu lá số bên dưới là NGUYÊN LIỆU để bạn hiểu con người và dòng đời nhân vật — hãy CHUYỂN HÓA nó thành tính cách, hoàn cảnh, sự kiện. Ví dụ: thay vì "Cự Môn hãm nên hay gặp thị phi", hãy viết "lời nói của ông sắc tới mức mỗi lần mở miệng là thêm một kẻ ghi thù".

QUY TẮC BÁM DỮ LIỆU:
- TÊN và CHỨC PHẬN nhân vật ĐÃ ĐƯỢC CHỐT. Dùng ĐÚNG tên đã cho, KHÔNG đặt tên khác. TUYỆT ĐỐI không đổi sang nghề khác, không "thăng cấp" cho oai.
- Dòng đời đã chia sẵn thành các HỒI, mỗi hồi ghi rõ là giai đoạn bình thường, ĐỈNH CAO hay BIẾN CỐ. Viết ĐÚNG theo nhãn đó: hồi đỉnh cao là lúc huy hoàng nhất đời; hồi biến cố là lúc gãy đổ nặng nhất. KHÔNG tự đảo thứ tự, KHÔNG dời đỉnh cao sang hồi khác cho "hợp truyện".
- Chi tiết trong truyện phải mọc ra từ các câu luận thuận/nghịch/cảnh báo của hồi đó, không bịa sự kiện không có căn cứ nào.

ĐÂY LÀ MỘT ĐỜI NGƯỜI, KHÔNG PHẢI MỘT BẢN LÝ LỊCH CÔNG TÁC:
- Chức phận chỉ là cái khung. Một đời người còn có hôn nhân, con cái, anh em, cha mẹ, bạn bè và kẻ dưới quyền, những chuyến đi xa, bệnh tật mang trên thân, chốn ở, tiền bạc. Truyện chỉ kể chuyện làm quan/làm nghề là truyện hỏng.
- Phần dữ liệu bên dưới có khối "CÁC TUYẾN ĐỜI NGOÀI CÔNG DANH". MỖI tuyến trong đó phải hiện ra ít nhất một lần trong 5 hồi, bằng một CẢNH hoặc một NHÂN VẬT cụ thể — không phải một câu nhắc cho có. Tuyến nào có cách cục đặc biệt thì cho nó thành một mạch đáng kể của truyện, không phải một dòng đưa đẩy.
- Dữ liệu cổ pháp đôi khi được diễn đạt bằng vật/khái niệm hiện đại ("tai nạn xe cộ", "đầu tư", "bảo lãnh"). Chuyển sang tương đương của thời xưa (ngã ngựa, đắm thuyền; bỏ vốn buôn chuyến; đứng ra bảo lãnh cho người trong họ) — TUYỆT ĐỐI không để vật hiện đại lọt vào truyện.
- Rải các tuyến này ra nhiều hồi khác nhau theo lẽ thường của đời người (cha mẹ và anh em ở hồi đầu; hôn nhân, con cái, bạn bè, bệnh tật ở các hồi giữa và cuối) — đừng dồn hết vào một hồi.

BỐI CẢNH — PHẢI NHẤT QUÁN TỪ ĐẦU TỚI CUỐI:
- Bối cảnh cụ thể được chỉ định trong phần dữ liệu bên dưới. Trong bối cảnh đó, chọn MỘT khung duy nhất (vùng đất nào, đang thời bình hay loạn lạc) rồi GIỮ NGUYÊN suốt 5 hồi — cùng địa danh, cùng thể chế, cùng tuyến nhân vật phụ. Không được hồi này ở biên ải phương bắc, hồi sau nhảy sang phủ chúa phương nam mà không có lý do trong truyện.
- KHÔNG nhắc bất kỳ nhân vật lịch sử/triều đại CÓ THẬT nào.

ĐIỂM NHẤN — truyện phải có chỗ để nhớ:
- Mỗi hồi phải có ÍT NHẤT MỘT cảnh cụ thể, nhìn thấy được (một hành động, một vật, một câu nói, một hình ảnh) — không được chỉ tóm tắt suông kiểu "ông trải qua nhiều thăng trầm".
- Cả truyện phải có MỘT khoảnh khắc bước ngoặt rõ ràng, đặt đúng vào hồi đỉnh cao hoặc hồi biến cố, và các hồi sau phải vọng lại nó.
- Nên có một CHI TIẾT XUYÊN SUỐT (một vật, một người, một thói quen) xuất hiện lại ở nhiều hồi để nối cả đời người thành một khối.

CẤM TUYỆT ĐỐI:
- KHÔNG mô tả cái chết một cách trực diện, bi thảm hay rùng rợn. Nếu dữ liệu cho thấy kết cục xấu, viết theo hướng "cái gì còn lại sau khi người ấy đi qua" — lặng lẽ, có sức nặng, KHÔNG hù dọa.
- KHÔNG khẳng định đây là kiếp trước có thật của người đọc. Đây là một phóng chiếu.

${XUNG_HO_RULE}`;

/** Prompt viết truyện — nhận profile đã tính sẵn (deterministic). */
export function buildPastLifeStoryPrompt(profile: PastLifeProfile): string {
  const genderWord = profile.gender === 'nu' ? 'NỮ' : 'NAM';
  return `=== BỐI CẢNH (đã chốt, KHÔNG được đổi) ===
${profile.era.storySetting}

=== HỒ SƠ NHÂN VẬT (suy từ lá số, đã chốt) ===
Giới tính nhân vật: ${genderWord} (giữ đúng giới tính của người xem lá số).

${formatCharacterForLLM(profile)}

=== DÒNG ĐỜI — 5 HỒI (đã chia sẵn theo 9 đại vận, KHÔNG được xếp lại) ===
${formatArcForLLM(profile.arc)}

=== NHIỆM VỤ ===
Trả về JSON hợp lệ, KHÔNG kèm giải thích ngoài JSON:
{"biDanh":"...","soiGuong":"...","acts":[{"title":"...","text":"..."}],"ketLuan":"..."}

1) "biDanh": MỘT vế ngắn tối đa 12 chữ, đứng sau chức phận đã chốt để gợi bi kịch hoặc cốt cách riêng của nhân vật này. KHÔNG lặp lại tên chức phận, KHÔNG chứa tên nhân vật. Ví dụ hình thức (KHÔNG chép nội dung): "người giữ được biên ải mà không giữ nổi lòng vua". Phải rút từ dữ liệu thật của lá số này, không phải câu dùng cho ai cũng đúng.

2) "soiGuong": 3-4 câu nói về CHÍNH NGƯỜI ĐỌC ở hiện tại (xưng "bạn"), KHÔNG phải nhân vật. Đây là phần quan trọng nhất — nếu người đọc không thấy mình trong đây thì cả phần truyện phía sau thành chuyện người dưng. Mô tả cho ĐÚNG và CỤ THỂ: tính khí thật, một cách hành xử quen thuộc, và MỘT nỗi khổ tâm mà kiểu người này hay gặp; nêu cả mặt mạnh lẫn mặt yếu, không tâng bốc. Viết bằng NGÔN NGỮ ĐỜI THƯỜNG — TUYỆT ĐỐI không nhắc tên sao, tên cung, tên cách cục hay bất kỳ thuật ngữ tử vi nào (người đọc đã biết nguồn dữ liệu, nói ra chỉ làm đoạn văn thành bản luận giải). Câu CUỐI bắc cầu sang truyện, đại ý: chính cái cốt cách đó, nếu sinh vào thời xưa, sẽ thành con người thế nào.

3) "acts": ĐÚNG ${profile.arc.acts.length} phần tử, theo ĐÚNG thứ tự các hồi đã cho. Mỗi phần tử:
   - "title": 3-7 chữ, gợi được nội dung hồi đó (vd "Đứa trẻ trong quân doanh").
   - "text": 100-160 từ văn xuôi, ngôi thứ ba, gọi nhân vật bằng ĐÚNG tên đã chốt (dùng tên ở lần nhắc đầu mỗi hồi, sau đó có thể dùng đại từ). Bám dữ liệu của hồi đó nhưng CHUYỂN HÓA thành cảnh và sự kiện, không giải thích. Hồi gắn nhãn ĐỈNH CAO phải rõ là lúc rực rỡ nhất; hồi gắn nhãn BIẾN CỐ phải rõ là lúc gãy đổ nặng nhất; hồi "vừa đỉnh cao vừa biến cố" thì viết cả hai chiều trong cùng giai đoạn. Mỗi hồi phải có ít nhất một cảnh cụ thể nhìn thấy được. Các hồi nối vào nhau thành một đời liền mạch, cùng một bối cảnh, có một chi tiết xuyên suốt lặp lại.

4) "ketLuan": 40-70 từ. Khép lại: cái cốt cách ấy đi qua một đời như vậy, và nó còn lại trong người đọc hôm nay dưới dạng nào (điểm mạnh nào, vết thương nào). Ngôn ngữ đời thường, không thuật ngữ tử vi, không phán chắc, không hù dọa, không hứa hẹn tương lai.

LƯU Ý GIỚI TÍNH: nhân vật là ${genderWord}. Nếu chức phận đã chốt hiếm gặp ở giới tính này trong xã hội phong kiến, ĐỪNG đổi nghề — hãy để chính điều đó thành một phần của câu chuyện (con đường khó hơn, phải giấu mình, phải chứng minh nhiều hơn người khác).`;
}

// ── 2. Ảnh ──────────────────────────────────────────────────────────────
export const PAST_LIFE_IMAGE_SYSTEM_PROMPT =
  'Bạn là art director cho một bức MINH HOẠ cổ điển Á Đông (refined East Asian classical illustration, vẽ ' +
  'painterly mềm mại, KHÔNG phải ảnh chụp), bối cảnh Á Đông thời phong kiến. Bạn nhận (A) bộ đặc điểm hình ' +
  'thể suy từ các sao tại cung Mệnh trong lá số Tử Vi và (B) chức phận của nhân vật. Nhiệm vụ: viết MỘT ' +
  'đoạn tiếng ANH liền mạch 70-110 từ mô tả gương mặt và thần thái nhân vật, để ghép vào một prompt sinh ' +
  'ảnh lớn hơn.\n' +
  'BẮT ĐẦU bằng đúng 1 câu tổng quan về khí chất/thần thái, rồi mới đi vào nét cụ thể (face shape, brow, ' +
  'eyes, nose, lips, chin, cheekbones, skin tone, build). Các nét PHẢI bám sát (A) — một khuôn mặt vuông, ' +
  'gò má cao, mắt sâu sắc thì phải giữ nguyên như vậy, KHÔNG làm mềm thành khuôn mặt trái xoan chung chung ' +
  'cho dễ nhìn.\n' +
  'CẢNH BÁO RIÊNG CHO PHONG CÁCH NÀY: bức tranh được vẽ theo lối dịu, pastel, thanh thoát. Đó là quy định ' +
  'về CHẤT LIỆU VẼ và ÁNH SÁNG, TUYỆT ĐỐI không được dùng nó làm cớ để bào mòn cấu trúc gương mặt — không ' +
  'tự ý làm thon gọn hàm bạnh, hạ gò má cao, làm to mắt nhỏ, hay làm trắng nước da ngăm chỉ vì tổng thể ' +
  'trông cần mềm mại. Một khuôn mặt góc cạnh, rám nắng vẫn vẽ được bằng nét mềm và màu dịu.\n' +
  'Thần thái phải khớp với chức phận (B): võ tướng thì trầm, gan lì, dạn dày sương gió; quan văn thì tỉnh ' +
  'táo, sắc sảo; thầy thuốc thì điềm đạm, nhân hậu. KHÔNG bắt buộc phải tươi cười; một vẻ mặt nghiêm nghị, ' +
  'trầm mặc hay mỏi mệt là hoàn toàn phù hợp nếu hợp với nhân vật.\n' +
  'TUYỆT ĐỐI KHÔNG mô tả: trang phục, mũ mão, giáp trụ, kiểu tóc, bối cảnh phía sau, ánh sáng, bảng màu, ' +
  'phong cách nghệ thuật (server tự ghép các phần đó, mô tả thêm sẽ gây xung đột). KHÔNG nhắc chiêm tinh/' +
  'tử vi/tên sao. KHÔNG dùng tên người thật.\n' +
  'CHỈ trả JSON hợp lệ: {"imagePrompt":"..."}';

// ── Phong cách vẽ (áp CHUNG mọi bức) ───────────────────────────────────
// Xuất phát từ một prompt Henry đưa (ChatGPT đề xuất). Tao giữ phần PHONG
// CÁCH và bỏ/sửa 3 phần không dùng nguyên được:
//
//  1. Bản gốc là "ảnh chụp điện ảnh, KHÔNG phải tranh vẽ" — ngược hẳn. Nên
//     đây là THAY THẾ khối tả ảnh chụp cũ, không phải nối thêm (nối thêm thì
//     hai chỉ dẫn đánh nhau, kết quả hên xui).
//  2. Bản gốc trộn phong cách với NỘI DUNG ("elegant silk with floral
//     embroidery", "gardens, pavilions"). Tool này đã suy trang phục theo
//     chức phận và bối cảnh nền theo nhóm nghề từ lá số — áp đè thì Tướng
//     quân trấn ải mặc giáp sờn trận đứng trên thành biên ải sẽ thành người
//     mặc lụa thêu hoa trong vườn cảnh, mất đúng chỗ khiến bức tranh khớp với
//     câu chuyện. Nên khối này CHỈ nói về chất liệu vẽ / ánh sáng / không
//     khí, tuyệt đối không chạm tới trang phục và bối cảnh.
//  3. Bản gốc khoá cứng 5 màu (dusty pink, ivory, jade, pale cyan, peach).
//     14 chức phận đang có màu riêng (Vương gia tím thẫm kim tuyến, Quan án
//     đen viền đỏ, Tướng quân giáp sắt tối) — ép hết về một bảng màu thì mọi
//     bức nhìn như một. Nay giữ CÁCH XỬ LÝ pastel (dịu, tương phản thấp, phát
//     sáng nhẹ) nhưng cho màu gốc của trang phục đi xuyên qua ở sắc độ nhạt
//     hơn. Bỏ chữ "romantic" — hợp Quan nội đình, sai với Quan án/Tướng quân.
export const PORTRAIT_STYLE_EN =
  'Rendered as a refined East Asian classical illustration: soft painterly digital brushwork, smooth ' +
  'gradients and subtle watercolour-inspired texture. Gentle diffused lighting with a delicate bloom, ' +
  'luminous and airy. Keep overall contrast low — avoid harsh shadows, heavy black shading and ' +
  'over-saturated colour. Render the subject\u2019s own garment, armour and background colours in a muted, ' +
  'softened pastel register rather than replacing them, so each character still reads as their own rank ' +
  'and role; let ivory, dusty rose, jade green, pale cyan and soft peach sit underneath as supporting ' +
  'tones. Finely observed textile and material detail, with flowing drapery where the costume allows. ' +
  'Graceful, serene, dignified and timeless. ' +
  'Premium illustration quality. Not a photograph, no photographic realism, no 3D render, no anime or ' +
  'manga styling, no harsh digital outlines.';

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
  const era = profile.era;

  return (
    `A refined East Asian classical illustration, a painted half-body portrait of a ${genderWord} with ${era.ethnicityEn}, appearing ` +
    `roughly ${ageLow}-${ageHigh} years old, set in ${era.settingEn}. ` +
    `Wearing ${o.attireEn}. ${era.extraEn} Historically plausible pre-modern East Asian court costume and grooming, ` +
    'authentic period detail, no modern clothing, no modern haircut, no anachronistic objects. ' +
    `Background: ${o.backdropEn}, rendered with atmospheric perspective and kept secondary to the figure. ` +
    `${faceDescriptionEn} ` +
    `${PORTRAIT_STYLE_EN} ` +
    'Single subject only, half-body or head-and-shoulders framing, subject facing the viewer. ' +
    'No text, no watermark, no signature, no logo, no subtitles.'
  );
}
