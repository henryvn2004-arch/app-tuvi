// lib/agent/past-life-bond-story.ts
// ============================================================
// Prompt cho tool "Duyên Nợ Tiền Kiếp" (2 lá số → 1 mối duyên):
//   1) BOND_STORY_*  — viết mô tả mối duyên + 4 hồi + lời kết.
//   2) BOND_IMAGE_*  — rút mô tả gương mặt (EN) cho CẢ HAI nhân vật.
//
// QUAN HỆ VỚI TOOL CHÂN DUNG TIỀN KIẾP: dùng lại nguyên `PORTRAIT_STYLE_EN`
// (phong cách vẽ) và `XUNG_HO_RULE`. CỐ Ý import chứ không chép — hai bản phong
// cách vẽ song song thì chúng trôi khỏi nhau, và ảnh của hai tool ra ngoài đời
// sẽ trông như hai nhà khác nhau. Mọi luật ĐẶC THÙ cho cảnh hai người thì viết
// mới ở đây.
//
// KHÁC BIỆT CỐT LÕI với tool một người:
//   • Truyện kể về MỐI QUAN HỆ, không phải về một đời người ⇒ 4 hồi theo nhịp
//     của mối duyên (gặp → ràng buộc → bước ngoặt → dư âm), KHÔNG phải 5 hồi
//     theo 9 đại vận của một lá số. Ép cấu trúc đại vận vào đây là biến câu
//     chuyện đôi thành tiểu sử của người thứ nhất, người thứ hai thành vai phụ.
//   • Ảnh là MỘT bức có HAI người trong CÙNG một khung — chỗ khó nhất của tool
//     này, xem BOND_SCENE_EN và buildFinalBondImagePrompt.
// ============================================================

import { XUNG_HO_RULE } from '@/lib/agent/prompts';
import { formatCharacterForLLM } from '@/lib/engine/past-life';
import type { PastLifeBond, BondKind, GroupBond, BondSignal } from '@/lib/engine/past-life-bond';
import { formatBondForLLM } from '@/lib/engine/past-life-bond';
import { formatMorphologyForLLM, type PalaceMorphology } from '@/lib/engine/portrait';
import { PORTRAIT_STYLE_EN } from '@/lib/agent/past-life-story';

// ── Nhịp 4 hồi (deterministic, engine không quyết phần này) ─────────────
// Nhãn hồi do TA chốt chứ không để LLM tự nghĩ — cùng lý do với tool một
// người: client hiển thị nhãn cố định thì mọi bản kết quả có cùng khung, người
// đọc so được bản của mình với bản bạn gửi cho.
export const BOND_ACTS = [
  { stage: 'Gặp gỡ', hint: 'Hai người gặp nhau lần đầu — trong hoàn cảnh nào, ai chủ động, ấn tượng đầu ra sao.' },
  { stage: 'Ràng buộc', hint: 'Mối duyên thành hình: họ làm gì cùng nhau, dựa vào nhau chỗ nào, mắc kẹt vào nhau chỗ nào.' },
  { stage: 'Bước ngoặt', hint: 'Biến cố làm mối duyên đổi chiều — theo đúng bản chất mối duyên đã chốt, không tự đổi sang chiều khác.' },
  { stage: 'Dư âm', hint: 'Hai người rời nhau ra sao, và cái gì còn lại sau đó.' },
] as const;

// ── Đếm bằng chữ ────────────────────────────────────────────────────────
// Trần số người do ENGINE sở hữu — re-export chứ KHÔNG khai bản thứ hai, nếu
// không thì hai con số trôi khỏi nhau và tầng chặn nào đó tin nhầm.
export { MAX_BOND_MEMBERS } from '@/lib/engine/past-life-bond';
const SO_VI = ['không', 'một', 'hai', 'ba', 'bốn', 'năm'];
const SO_EN = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
const soVi = (n: number) => SO_VI[n] || String(n);
const soEn = (n: number) => SO_EN[n] || String(n);

/**
 * System prompt cho pha viết truyện.
 *
 * 🔑 `n === 2` PHẢI ra chuỗi Y HỆT bản trước khi có tính năng nhóm — đây là
 * đường đang bán và phần lớn lượt dùng; đổi một chữ trong system prompt là đổi
 * chất lượng đầu ra của tool chính mà không ai đặt hàng. Có test so byte với
 * bản lấy từ git.
 */
export function bondStorySystemPrompt(n: number): string {
  const vaiTro =
    n === 2
      ? `VAI TRÒ: bạn đang VIẾT TRUYỆN về MỘT MỐI QUAN HỆ. Đây là điểm khác quan trọng nhất — truyện không phải tiểu sử của người thứ nhất có người thứ hai đi ngang qua. HAI nhân vật phải cân nhau: cả hai đều có ý chí riêng, đều làm chuyện gì đó khiến mối duyên đổi chiều. Nếu xoá tên một người mà truyện vẫn đứng được thì truyện hỏng.`
      : `VAI TRÒ: bạn đang VIẾT TRUYỆN về MỘT NHÓM ${soVi(n).toUpperCase()} NGƯỜI và những mối duyên ràng buộc họ. Đây là điểm khác quan trọng nhất — truyện không phải tiểu sử của một người có mấy người khác đi ngang qua.
- Dữ liệu bên dưới chỉ ra MỘT mối duyên TRUNG TÂM. Đó là trục của truyện: biến cố lớn nhất phải xoay quanh hai người ấy.
- Nhưng cả ${soVi(n)} nhân vật đều phải CÓ MẶT VÀ CÓ HÀNH ĐỘNG, không ai được thành cái bóng đứng xem. Mỗi người phải có ít nhất một cảnh mà chính họ làm thay đổi điều gì đó.
- Các mối duyên còn lại trong lưới bên dưới là chất liệu thật: dùng chúng để giải thích vì sao người này đứng về phía người kia, vì sao hai người nọ không nhìn mặt nhau. Đừng bịa thêm quan hệ nào ngoài lưới đã cho.
- Nếu xoá tên một người mà truyện vẫn đứng được thì truyện hỏng.`;

  const boiCanh =
    n === 2
      ? `BỐI CẢNH — MỘT THẾ GIỚI DUY NHẤT CHO CẢ HAI:
- Hai nhân vật sống trong CÙNG một nền văn minh, cùng một thời, và phải GẶP ĐƯỢC NHAU một cách hợp lý. Nếu hai chức phận vốn khó gặp nhau (một người ở biên ải, một người trong nội phủ), thì chính việc họ gặp được nhau phải là một chi tiết của truyện — đừng lờ đi.
- Chọn MỘT khung duy nhất (vùng đất nào, thời bình hay loạn) rồi giữ nguyên suốt 4 hồi.`
      : `BỐI CẢNH — MỘT THẾ GIỚI DUY NHẤT CHO CẢ ${soVi(n).toUpperCase()}:
- Cả ${soVi(n)} nhân vật sống trong CÙNG một nền văn minh, cùng một thời, và phải GẶP ĐƯỢC NHAU một cách hợp lý. Nếu vài chức phận vốn khó gặp nhau (người ở biên ải, người trong nội phủ), thì chính việc họ gặp được nhau phải là một chi tiết của truyện — đừng lờ đi.
- CẦN MỘT CỚ CHUNG để cả nhóm ở cùng một chỗ (một cuộc hành quân, một vụ án, một chuyến buôn, một kỳ thi, một tang lễ trong họ). Dựng cớ ấy ở hồi đầu rồi giữ nguyên.
- Chọn MỘT khung duy nhất (vùng đất nào, thời bình hay loạn) rồi giữ nguyên suốt 4 hồi.`;

  return `Bạn vừa là nhà luận giải Tử Vi Đẩu Số, vừa là người kể chuyện, phụng sự trang Tử Vi Minh Bảo.

BỐI CẢNH SẢN PHẨM (hiểu đúng để không viết sai bản chất):
Đây KHÔNG phải bói tiền kiếp. Tử Vi Đẩu Số không có cung nào nói về kiếp trước. Cái đang làm là: toàn bộ từ vựng gốc của Tử Vi vốn là từ vựng triều đình phong kiến. Ở đây ta lấy quan hệ THẬT giữa ${n === 2 ? 'hai' : 'các'} lá số theo cổ pháp (địa chi cung Mệnh hợp/xung/hình, ngũ hành nạp âm sinh khắc, tương quan chính tinh) rồi kể lại bằng chính thứ ngôn ngữ đó: ${n === 2 ? 'hai' : soVi(n)} con người ấy, đặt vào một thế giới phong kiến Á châu, đã là gì của nhau.

${vaiTro}

VĂN PHONG: trầm, gọn, có sức nặng. Văn xuôi liên tục, ngôi thứ ba. KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề con bên trong đoạn. Tiếng Việt chuẩn mực, không sáo rỗng.

CẤM TUYỆT ĐỐI MỌI THUẬT NGỮ TỬ VI TRONG PHẦN CHỮ TRẢ VỀ (đây là luật quan trọng nhất):
- Cấm nhắc tên sao, tên cung, tên cách cục, "đại vận", "lá số", "tử vi", "mệnh lý", "chính tinh", "sát tinh", "nạp âm", "địa chi", "lục hợp", "tam hợp", "tam hình", "tứ xung".
- Cấm nêu điểm số dưới mọi hình thức.
- Khối "CƠ SỞ TRONG ${n === 2 ? 'HAI' : 'CÁC'} LÁ SỐ" bên dưới là NGUYÊN LIỆU để bạn hiểu bản chất mối duyên — CHUYỂN HÓA nó thành hoàn cảnh và sự việc. Ví dụ: thay vì "Mệnh hai người phạm Tam Hình", hãy viết "mỗi lần hai người ngồi lại với nhau là thêm một vết mà cả hai đều giả vờ không thấy".

BÁM ĐÚNG LOẠI DUYÊN ĐÃ CHỐT — luật cứng:
- Loại duyên nợ đã được chốt ở phần dữ liệu (duyên phu thê / nghĩa kim lan / ơn cứu mạng / nghĩa thầy trò / nợ chưa trả / hai bờ chiến tuyến / duyên tao ngộ). TUYỆT ĐỐI không đổi sang loại khác, không "nâng cấp" một mối tao ngộ thành tình yêu lớn cho hay chuyện.
- Nếu dữ liệu ghi rõ BÊN CHO / BÊN TRÊN trong mối duyên (ân nhân, người thầy), thì chiều đó phải giữ nguyên: đúng người ấy là người ra tay, người kia là người nhận. Đảo chiều là nói sai điều lá số nói.
- Mối duyên là ĐAU thì viết cho ra đau, đừng bẻ về đoàn viên cho êm. Mối duyên là nhạt thì đừng thổi lên thành sinh tử.

TÊN VÀ CHỨC PHẬN ĐÃ CHỐT:
- Dùng ĐÚNG tên và ĐÚNG chức phận của từng nhân vật như dữ liệu đã cho. Không đặt tên khác, không đổi nghề, không thăng cấp cho oai.
- Chênh lệch vị thế giữa ${n === 2 ? 'hai người' : 'các nhân vật'} (nếu có) là chất liệu tốt — hãy để nó tạo ra sức ép thật trong truyện, đừng làm phẳng đi.

${boiCanh}

NEO VÀO MỐC CÓ THẬT — người đọc phải biết chuyện xảy ra Ở ĐÂU và VÀO THỜI NÀO:
- Phần dữ liệu có khối "ĐỊA DANH CÓ THẬT" và "THỜI KỲ CÓ THẬT". PHẢI dùng ngay từ hồi đầu: ${n === 2 ? 'hai người' : 'cả nhóm'} gặp nhau ở đâu (địa danh có thật), dưới triều nào, đời vua nào — nêu THẲNG TÊN.
- Được chú "(nay thuộc ...)" cho địa danh. KHÔNG chú cho niên đại.
- PHÂN BIỆT HAI TẦNG: tầng BỐI CẢNH là lịch sử THẬT (địa danh, triều đại, vua chúa, chiến tranh) — người đọc tra mạng ra được, đó chính là cái làm truyện đáng đọc. Tầng NHÂN VẬT là HƯ CẤU: ${n === 2 ? 'hai' : 'những'} người bình thường sống trong thời đó, KHÔNG phải người có tên trong sử sách, KHÔNG giữ vị trí độc nhất của một triều.
- Người có thật là NỀN, không phải bạn diễn: được nhắc như "vua đang trị vì", "quân của tướng X vừa đi qua". KHÔNG dựng cảnh họ trò chuyện hay kết thân với nhân vật.
- KHÔNG nêu năm dương lịch hay niên hiệu kèm số. Muốn nói rõ hơn thì "đầu/giữa/cuối thời <triều đại>".

NỀN VĂN MINH PHẢI NHẬN RA ĐƯỢC:
- Khối "CHẤT LIỆU VĂN HÓA" liệt kê thiết chế, đồ vật, không gian, tập tục đặc trưng của nền này. Dùng ÍT NHẤT BA thứ, rải ra các hồi khác nhau, thành chi tiết sống trong cảnh chứ không phải liệt kê.
- TUYỆT ĐỐI không mượn chi tiết đặc trưng của nền khác.
- Dữ liệu cổ pháp đôi khi diễn đạt bằng vật hiện đại ("tai nạn xe cộ", "đầu tư", "bảo lãnh") — chuyển sang tương đương thời xưa (ngã ngựa, bỏ vốn buôn chuyến, đứng ra bảo lãnh cho người trong họ).

ĐIỂM NHẤN:
- Mỗi hồi phải có ÍT NHẤT MỘT cảnh cụ thể nhìn thấy được — một hành động, một vật, một câu nói — không tóm tắt suông.
- Nên có MỘT chi tiết xuyên suốt (một vật trao tay, một câu nói, một chỗ hẹn) trở đi trở lại ở nhiều hồi để nối ${n === 2 ? 'cả mối duyên' : 'cả nhóm'} thành một khối.
- TUỔI TÁC: không nêu tuổi bằng con số. Diễn đạt bằng chặng đời và bằng cảnh.

CẤM TUYỆT ĐỐI:
- KHÔNG mô tả cái chết trực diện, bi thảm hay rùng rợn. Kết cục xấu thì viết theo hướng "cái gì còn lại sau khi người ấy đi qua".
- KHÔNG khẳng định đây là kiếp trước có thật của ${n === 2 ? 'hai' : 'những'} người đọc. Đây là một phóng chiếu từ ${n === 2 ? 'hai' : 'các'} lá số.
- KHÔNG dựng cảnh thân mật thể xác. Duyên phu thê thì viết bằng đời sống chung, bằng sự gắn bó, không bằng cảnh giường chiếu.

${XUNG_HO_RULE}`;
}

/** Bản 2 người — giữ tên cũ để route và mọi chỗ khác không phải đổi. */
export const BOND_STORY_SYSTEM_PROMPT = bondStorySystemPrompt(2);

export function buildBondStoryPrompt(bond: PastLifeBond, nameA: string, nameB: string): string {
  const era = bond.era;
  return `=== BỐI CẢNH (đã chốt, KHÔNG được đổi) ===
Nền văn minh: ${era.label} — ${era.ageLabel}.
${era.storySetting}

CHẤT LIỆU VĂN HÓA của nền này (dùng ít nhất BA thứ, rải ra các hồi, thành cảnh sống chứ không phải liệt kê):
${era.cultureVi}

ĐỊA DANH CÓ THẬT (chọn vài cái hợp nhau về địa lý rồi dùng xuyên suốt; được chú "(nay thuộc ...)"):
${era.geographyVi}

TRIỀU ĐẠI & ĐỜI VUA CÓ THẬT (chọn ĐÚNG MỘT, nêu THẲNG TÊN, giữ nguyên cả truyện; KHÔNG nêu năm dương lịch hay niên hiệu kèm số):
${era.periodVi}

=== MỐI DUYÊN VÀ HAI NHÂN VẬT (suy từ hai lá số, đã chốt) ===
${formatBondForLLM(bond, nameA, nameB)}

=== NHIỆM VỤ ===
Trả về JSON hợp lệ, KHÔNG kèm giải thích ngoài JSON:
{"tuaDe":"...","moTaMoiDuyen":"...","acts":[{"title":"...","text":"..."}],"ketLuan":"..."}

1) "tuaDe": 4-8 chữ, đặt tên cho chính mối duyên này. Phải rút từ nội dung thật của hai lá số, không phải câu dùng cho cặp nào cũng đúng. KHÔNG chứa tên hai nhân vật, KHÔNG lặp lại nguyên văn nhãn loại duyên.

2) "moTaMoiDuyen": 3-4 câu, ngôi thứ ba, giới thiệu HAI người và mối ràng buộc giữa họ. Gọi đúng cả hai tên đã chốt. Nói rõ mỗi người là hạng người nào và họ đứng ở vị trí nào so với nhau. Đoạn này đứng ngay cạnh bức tranh vẽ cả hai, nên phải làm người xem hình dung ra QUAN HỆ, không phải hai lý lịch đặt cạnh nhau. KHÔNG mô tả ngũ quan, vóc dáng, trang phục (bức tranh đã lo). KHÔNG nhắc thuật ngữ tử vi.

3) "acts": ĐÚNG ${BOND_ACTS.length} phần tử, theo ĐÚNG thứ tự và ĐÚNG nhịp sau:
${BOND_ACTS.map((a, i) => `   Hồi ${i + 1} — ${a.stage}: ${a.hint}`).join('\n')}
   Mỗi phần tử:
   - "title": 3-7 chữ, gợi được nội dung hồi đó.
   - "text": 110-170 từ văn xuôi, ngôi thứ ba, gọi hai nhân vật bằng ĐÚNG tên đã chốt. CẢ HAI phải có mặt và có hành động trong mỗi hồi — không được hồi nào biến một người thành cái bóng. Bám bản chất mối duyên đã chốt, chuyển hóa thành cảnh và sự kiện, không giải thích.

4) "ketLuan": 40-70 từ. Khép lại: mối duyên ấy còn vọng lại giữa hai người hôm nay dưới dạng nào — họ dễ hợp nhau ở đâu, dễ va nhau ở đâu. Ngôn ngữ đời thường, không thuật ngữ tử vi, không phán chắc, không hù dọa, không hứa hẹn tương lai. KHÔNG khuyên họ nên hay không nên gắn bó với nhau.`;
}

// ── 1b. Truyện cho NHÓM 3–5 người ───────────────────────────────────────
// CỐ Ý để riêng khỏi `buildBondStoryPrompt`: đường 2 người là đường đang bán,
// giữ nguyên byte thì không có cách nào một thay đổi cho nhóm làm hỏng nó. Phần
// dùng chung thật sự (khối nền văn minh, `formatCharacterForLLM`) vẫn là một
// nguồn — chỉ những câu THỰC SỰ khác giữa cặp và nhóm mới viết riêng.

const THU_TU = ['THỨ NHẤT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM'];

/** Khối dữ liệu mối duyên cho một NHÓM. */
export function formatGroupBondForLLM(group: GroupBond, names: string[]): string {
  const nameOf = (i: number) => group.profiles[i].characterName;
  const sp = group.spine;
  const giverName = sp.giver ? nameOf(sp.giver === 'i' ? sp.i : sp.j) : '';
  const others = group.pairs.filter((p) => p !== sp);
  return [
    `MỐI DUYÊN TRUNG TÂM (trục của truyện) — giữa ${nameOf(sp.i)} và ${nameOf(sp.j)}: ${sp.type.label}`,
    sp.type.gist,
    giverName ? `Bên cho / bên trên trong mối duyên này: ${giverName}` : '',
    '',
    others.length
      ? 'CÁC MỐI DUYÊN CÒN LẠI TRONG NHÓM (đều có thật, dùng làm chất liệu; KHÔNG bịa thêm quan hệ nào ngoài danh sách này):'
      : '',
    ...others.map((p) => {
      const g = p.giver ? ` (bên cho: ${nameOf(p.giver === 'i' ? p.i : p.j)})` : '';
      return `  • ${nameOf(p.i)} — ${nameOf(p.j)}: ${p.type.label}${g}. ${p.type.gist}`;
    }),
    '',
    'CƠ SỞ TRONG CÁC LÁ SỐ cho mối duyên trung tâm (dùng để hiểu bản chất, KHÔNG nêu thuật ngữ này trong truyện):',
    ...sp.signals.map((s) => `  • ${s.label}: ${s.detail}`),
    '',
    `NỀN VĂN MINH CHUNG: ${group.era.label}${group.era.ageLabel ? ' — ' + group.era.ageLabel : ''}`,
    '',
    ...group.profiles.flatMap((p, i) => [
      `════ NHÂN VẬT ${THU_TU[i] || 'THỨ ' + (i + 1)} (từ lá số của ${names[i] || 'người thứ ' + (i + 1)}) ════`,
      formatCharacterForLLM(p),
      '',
    ]),
  ]
    .filter((x) => x !== '')
    .join('\n');
}

export function buildGroupStoryPrompt(group: GroupBond, names: string[]): string {
  const era = group.era;
  const n = group.profiles.length;
  const tenList = group.profiles.map((p) => p.characterName).join(', ');
  return `=== BỐI CẢNH (đã chốt, KHÔNG được đổi) ===
Nền văn minh: ${era.label} — ${era.ageLabel}.
${era.storySetting}

CHẤT LIỆU VĂN HÓA của nền này (dùng ít nhất BA thứ, rải ra các hồi, thành cảnh sống chứ không phải liệt kê):
${era.cultureVi}

ĐỊA DANH CÓ THẬT (chọn vài cái hợp nhau về địa lý rồi dùng xuyên suốt; được chú "(nay thuộc ...)"):
${era.geographyVi}

TRIỀU ĐẠI & ĐỜI VUA CÓ THẬT (chọn ĐÚNG MỘT, nêu THẲNG TÊN, giữ nguyên cả truyện; KHÔNG nêu năm dương lịch hay niên hiệu kèm số):
${era.periodVi}

=== NHÓM ${soVi(n).toUpperCase()} NHÂN VẬT VÀ CÁC MỐI DUYÊN (suy từ ${soVi(n)} lá số, đã chốt) ===
${formatGroupBondForLLM(group, names)}

=== NHIỆM VỤ ===
Trả về JSON hợp lệ, KHÔNG kèm giải thích ngoài JSON:
{"tuaDe":"...","moTaMoiDuyen":"...","acts":[{"title":"...","text":"..."}],"ketLuan":"..."}

1) "tuaDe": 4-8 chữ, đặt tên cho chính mối duyên trung tâm của nhóm này. Phải rút từ nội dung thật của các lá số, không phải câu dùng cho nhóm nào cũng đúng. KHÔNG chứa tên nhân vật, KHÔNG lặp lại nguyên văn nhãn loại duyên.

2) "moTaMoiDuyen": 4-6 câu, ngôi thứ ba, giới thiệu ĐỦ ${soVi(n)} người và cách họ ràng buộc với nhau. Gọi đúng cả ${soVi(n)} tên đã chốt (${tenList}). Nói rõ mỗi người là hạng người nào và ai đứng ở đâu so với ai. Đoạn này đứng ngay cạnh bức tranh vẽ cả nhóm, nên phải làm người xem hình dung ra MẠNG QUAN HỆ, không phải ${soVi(n)} lý lịch đặt cạnh nhau. KHÔNG mô tả ngũ quan, vóc dáng, trang phục (bức tranh đã lo). KHÔNG nhắc thuật ngữ tử vi.

3) "acts": ĐÚNG ${BOND_ACTS.length} phần tử, theo ĐÚNG thứ tự và ĐÚNG nhịp sau:
${BOND_ACTS.map((a, i) => `   Hồi ${i + 1} — ${a.stage}: ${a.hint}`).join('\n')}
   Mỗi phần tử:
   - "title": 3-7 chữ, gợi được nội dung hồi đó.
   - "text": ${120 + n * 15}-${180 + n * 20} từ văn xuôi, ngôi thứ ba, gọi nhân vật bằng ĐÚNG tên đã chốt. CẢ ${soVi(n).toUpperCase()} người phải xuất hiện trong mỗi hồi và ít nhất một nửa trong số họ phải LÀM một việc gì đó ở hồi ấy — không được hồi nào biến ai thành cái bóng đứng xem. Trục vẫn là mối duyên trung tâm; các mối duyên còn lại là lực đẩy quanh trục ấy.

4) "ketLuan": 50-90 từ. Khép lại: những mối duyên ấy còn vọng lại giữa ${soVi(n)} người hôm nay dưới dạng nào — nhóm này dễ hợp nhau ở đâu, dễ va nhau ở đâu. Ngôn ngữ đời thường, không thuật ngữ tử vi, không phán chắc, không hù dọa, không hứa hẹn tương lai. KHÔNG khuyên ai nên hay không nên gắn bó với ai.`;
}

// ── 2. Ảnh — MỘT bức, HAI nhân vật ─────────────────────────────────────
export function bondImageSystemPrompt(n: number): string {
  return (
  'Bạn là art director cho một bức MINH HOẠ cổ điển (vẽ painterly mềm mại, KHÔNG phải ảnh chụp), bối cảnh ' +
  `một nền văn minh Á châu thời phong kiến. Bức này có ĐÚNG ${soVi(n).toUpperCase()} nhân vật trong cùng một khung.\n` +
  'Bạn nhận, cho MỖI nhân vật: (A) bộ đặc điểm hình thể suy từ các sao tại cung Mệnh và (B) chức phận. ' +
  `Nhiệm vụ: viết ${soVi(n).toUpperCase()} đoạn tiếng ANH riêng biệt, mỗi đoạn 55-85 từ, mô tả gương mặt và thần thái của từng ` +
  'người, để ghép vào một prompt sinh ảnh lớn hơn.\n' +
  'Mỗi đoạn BẮT ĐẦU bằng đúng 1 câu tổng quan về khí chất, rồi mới đi vào nét cụ thể (face shape, brow, ' +
  'eyes, nose, lips, chin, cheekbones, skin tone, build). Các nét PHẢI bám sát (A) — khuôn mặt vuông, gò má ' +
  'cao, mắt sâu thì giữ nguyên như vậy, KHÔNG làm mềm thành khuôn mặt trái xoan chung chung cho dễ nhìn.\n' +
  `${n === 2 ? 'HAI' : soVi(n).toUpperCase()} GƯƠNG MẶT PHẢI PHÂN BIỆT ĐƯỢC RÕ RÀNG — đây là luật riêng của bức ${n === 2 ? 'hai' : 'nhiều'} người: nếu dữ liệu ${n === 2 ? 'hai bên' : 'vài người'} ` +
  'giống nhau ở vài nét, hãy bám vào những nét KHÁC nhau và nói rõ chúng khác ra sao, để người xem không ' +
  `thấy ${n === 2 ? 'hai anh em sinh đôi' : 'một dàn người na ná nhau'}. Nếu ${n === 2 ? 'hai người' : 'họ'} chênh nhau về tuổi hoặc vị thế, cho điều đó hiện lên gương mặt.\n` +
  'CẢNH BÁO RIÊNG CHO PHONG CÁCH NÀY: bức tranh vẽ theo lối dịu, pastel, thanh thoát. Đó là quy định về ' +
  'CHẤT LIỆU VẼ và ÁNH SÁNG, TUYỆT ĐỐI không dùng nó làm cớ để bào mòn cấu trúc gương mặt.\n' +
  'TUYỆT ĐỐI KHÔNG mô tả: trang phục, mũ mão, giáp trụ, kiểu tóc, bối cảnh phía sau, tư thế, khoảng cách ' +
  `giữa ${n === 2 ? 'hai người' : 'các nhân vật'}, ánh sáng, bảng màu, phong cách nghệ thuật (server tự ghép, mô tả thêm sẽ gây xung đột). ` +
  'KHÔNG nhắc chiêm tinh/tử vi/tên sao. KHÔNG dùng tên người thật.\n' +
  (n === 2
    ? 'CHỈ trả JSON hợp lệ: {"faceA":"...","faceB":"..."}'
    : `CHỈ trả JSON hợp lệ, mảng "faces" đúng ${n} phần tử theo ĐÚNG thứ tự nhân vật đã cho: {"faces":["...","..."]}`)
  );
}

/** Bản 2 người — giữ tên cũ để route và mọi chỗ khác không phải đổi. */
export const BOND_IMAGE_SYSTEM_PROMPT = bondImageSystemPrompt(2);

export function buildBondImagePrompt(
  bond: PastLifeBond,
  morphA: PalaceMorphology,
  morphB: PalaceMorphology,
  nameA: string,
  nameB: string,
): string {
  const g = (x: 'nam' | 'nu') => (x === 'nu' ? 'Nữ' : 'Nam');
  return (
    `NHÂN VẬT A — ${bond.a.characterName} (từ lá số của ${nameA || 'người thứ nhất'})\n` +
    `Giới tính: ${g(bond.a.gender)}. Độ tuổi trong tranh: khoảng ${bond.a.arc.portraitAge} tuổi.\n` +
    `(A) Đặc điểm hình thể suy từ sao tại cung Mệnh:\n${formatMorphologyForLLM(morphA, 'Mệnh')}\n` +
    `(B) Chức phận: ${bond.a.occupation.title} — ${bond.a.occupation.desc}\n\n` +
    `NHÂN VẬT B — ${bond.b.characterName} (từ lá số của ${nameB || 'người thứ hai'})\n` +
    `Giới tính: ${g(bond.b.gender)}. Độ tuổi trong tranh: khoảng ${bond.b.arc.portraitAge} tuổi.\n` +
    `(A) Đặc điểm hình thể suy từ sao tại cung Mệnh:\n${formatMorphologyForLLM(morphB, 'Mệnh')}\n` +
    `(B) Chức phận: ${bond.b.occupation.title} — ${bond.b.occupation.desc}\n\n` +
    `Bối cảnh chung: ${bond.era.label}. Mối duyên giữa hai người: ${bond.type.label}.`
  );
}

/** Bản NHÓM của `buildBondImagePrompt` — mô tả N nhân vật theo ĐÚNG thứ tự sẽ
 *  đứng trong tranh, để `faces[i]` ghép đúng người. */
export function buildGroupImagePrompt(
  group: GroupBond,
  morphs: PalaceMorphology[],
  names: string[],
): string {
  const g = (x: 'nam' | 'nu') => (x === 'nu' ? 'Nữ' : 'Nam');
  const sp = group.spine;
  return (
    group.profiles
      .map(
        (p, i) =>
          `NHÂN VẬT ${i + 1} — ${p.characterName} (từ lá số của ${names[i] || 'người thứ ' + (i + 1)})\n` +
          `Giới tính: ${g(p.gender)}. Độ tuổi trong tranh: khoảng ${p.arc.portraitAge} tuổi.\n` +
          `(A) Đặc điểm hình thể suy từ sao tại cung Mệnh:\n${formatMorphologyForLLM(morphs[i], 'Mệnh')}\n` +
          `(B) Chức phận: ${p.occupation.title} — ${p.occupation.desc}\n\n`,
      )
      .join('') +
    `Bối cảnh chung: ${group.era.label}. Mối duyên trung tâm của nhóm: ` +
    `${group.profiles[sp.i].characterName} — ${group.profiles[sp.j].characterName}: ${sp.type.label}.`
  );
}

// ── Dàn cảnh theo LOẠI DUYÊN ────────────────────────────────────────────
// Đây là thứ khiến bức tranh là "duyên nợ" chứ không phải hai bức chân dung dán
// cạnh nhau — cùng một cặp nhân vật, đứng khác nhau thì kể chuyện khác nhau.
//
// Viết bằng "the figure on the left / on the right" vì prompt luôn đặt A bên
// TRÁI, B bên PHẢI (xem buildFinalBondImagePrompt). Với hai loại duyên có bên
// cho / bên nhận (ân nhân, thầy trò) thì chuỗi được chọn theo `bond.giver`, nếu
// không thì vai vế trên tranh sẽ ngược với truyện.
const BOND_SCENE_EN: Record<BondKind, string> = {
  'phu-the':
    'The two stand close together as husband and wife, shoulders almost touching, turned slightly toward ' +
    'each other but both faces visible to the viewer. Quiet, settled intimacy — no embrace, no romantic ' +
    'clichés, simply two people who have shared a household through many years.',
  'kim-lan':
    'The two stand side by side as sworn equals, one clasping the other’s forearm in an old gesture of ' +
    'oath, both squared toward the viewer with the same steady bearing.',
  'an-nhan':
    'One figure steadies the other: the rescuer stands a half-step forward with a supporting hand offered, ' +
    'the one who was saved slightly behind and turned toward them in acknowledgement. Both faces visible.',
  'thay-tro':
    'Master and disciple: the elder stands a half-step ahead and composed, the younger a respectful pace ' +
    'behind and angled toward the elder, hands lowered. Both faces visible to the viewer.',
  'oan-gia':
    'The two stand within the same frame but turned partly away from one another, gazes not meeting, a ' +
    'visible gap of empty air between them. Unresolved tension, no violence, no weapons drawn.',
  'doi-dau':
    'The two face each other across a clear distance, each holding their own ground, bodies squared and ' +
    'unyielding, both faces visible in profile-to-three-quarter view. Opposed but dignified — no combat, ' +
    'no drawn weapons, no blood.',
  'ban-huu':
    'A chance meeting on the road: the two pause a courteous distance apart, one about to continue on, ' +
    'both faces turned toward the viewer. Brief and unhurried, nothing binding between them.',
};

/** Đảo trái/phải cho hai loại duyên có bên trên — bên dưới (bức HAI người). */
function sceneForKind(kind: BondKind, giverSide: 'left' | 'right'): string {
  const base = BOND_SCENE_EN[kind];
  if (kind !== 'an-nhan' && kind !== 'thay-tro') return base;
  // `giver` = người CHO (ân nhân / người thầy). A luôn ở bên trái.
  const otherSide = giverSide === 'left' ? 'right' : 'left';
  const who = kind === 'an-nhan' ? 'the rescuer' : 'the elder master';
  const other = kind === 'an-nhan' ? 'the one who was saved' : 'the younger disciple';
  return `${base} Placement is fixed: ${who} is the figure on the ${giverSide}, ${other} is the figure on the ${otherSide}.`;
}

/**
 * Ghép prompt ảnh CUỐI CÙNG (server-side, không để LLM tự viết).
 *
 * Khác tool một người ở BA chỗ, và cả ba đều là chỗ dễ hỏng:
 *  1. Phải nói THẲNG là đúng hai người, không ai khác trong khung — model rất
 *     hay thêm tuỳ tùng, lính gác, người qua đường vào cảnh có hai nhân vật.
 *  2. Mỗi người giữ NGUYÊN cấp bậc và trang phục của chức phận riêng. Gộp một
 *     câu tả trang phục chung là hai người mặc như nhau, mất luôn chênh lệch
 *     vị thế mà truyện đang dựa vào.
 *  3. Bối cảnh là MỘT nơi chung theo mối duyên, KHÔNG lấy `backdropEn` của
 *     người nào. Hai chức phận thường có hai phông rất khác nhau (thành biên
 *     ải vs nội phủ) — nhét cả hai vào một khung thì cảnh vô lý, mà chọn một
 *     bên thì người kia thành khách trong ảnh của người này.
 */
export function buildFinalBondImagePrompt(
  bond: PastLifeBond,
  faceA: string,
  faceB: string,
): string {
  return buildFinalFigureImagePrompt({
    era: bond.era,
    figures: [bond.a, bond.b],
    faces: [faceA, faceB],
    spineKind: bond.type.kind,
    spineIdx: [0, 1],
    giverIdx: bond.giver === 'a' ? 0 : bond.giver === 'b' ? 1 : null,
  });
}

/** Bản NHÓM — cùng một hàm dựng, chỉ khác dữ liệu đưa vào. */
export function buildFinalGroupImagePrompt(group: GroupBond, faces: string[]): string {
  const sp = group.spine;
  return buildFinalFigureImagePrompt({
    era: group.era,
    figures: group.profiles,
    faces,
    spineKind: sp.type.kind,
    spineIdx: [sp.i, sp.j],
    giverIdx: sp.giver === 'i' ? sp.i : sp.giver === 'j' ? sp.j : null,
  });
}

// Dàn cảnh khi có TỪ BA người trở lên. Khác hẳn `BOND_SCENE_EN`: ở đó hai người
// chiếm trọn khung nên tư thế của họ LÀ bố cục; ở đây bố cục là một bức chân
// dung nhóm, còn mối duyên trung tâm chỉ là điểm nhấn bên trong nhóm. Bê nguyên
// tư thế hai người vào cảnh năm người là model dựng ra một cặp ở giữa và ba
// người thừa đứng nhìn.
const GROUP_SCENE_EN: Record<BondKind, string> = {
  'phu-the': 'they stand together as husband and wife, shoulders almost touching, settled and unhurried',
  'kim-lan': 'they stand as sworn equals, one clasping the other’s forearm in an old gesture of oath',
  'an-nhan': 'one of them stands a half-step forward with a steadying hand offered to the other',
  'thay-tro': 'the elder of them stands composed a half-step ahead, the younger angled respectfully toward them',
  'oan-gia': 'they are turned partly away from one another, gazes not meeting, a visible gap of empty air between them',
  'doi-dau': 'they hold their own ground facing one another, bodies squared and unyielding, but dignified',
  'ban-huu': 'they stand a courteous distance apart, as two who met by chance and are about to part again',
};

interface FigureSpec {
  era: PastLifeBond['era'];
  figures: PastLifeBond['a'][];
  faces: string[];
  spineKind: BondKind;
  /** Chỉ số hai người của mối duyên trung tâm, trong CHÍNH mảng `figures`. */
  spineIdx: [number, number];
  giverIdx: number | null;
}

/**
 * Ghép prompt ảnh CUỐI CÙNG cho 2–5 người.
 *
 * 🔑 `figures.length === 2` PHẢI ra chuỗi Y HỆT bản trước khi có tính năng
 * nhóm. Đó là đường đang bán và là phần lớn lượt dùng; dàn cảnh hai người
 * (`BOND_SCENE_EN`) đã được chỉnh theo từng loại duyên, đổi một chữ là đổi bức
 * tranh của tool chính mà không ai đặt hàng. Có test so byte với bản lấy từ git.
 *
 * Vì sao MỘT hàm chứ không hai: bảy phần tám nội dung (luật trang phục, luật
 * bối cảnh, phong cách vẽ, danh sách cấm) là chung. Hai bản song song thì sớm
 * muộn cũng trôi khỏi nhau — đúng bài học đã trả giá vài lần trong repo này.
 */
function buildFinalFigureImagePrompt(spec: FigureSpec): string {
  const { era, figures, faces, spineKind, spineIdx, giverIdx } = spec;
  const n = figures.length;
  const two = n === 2;
  const w = (x: 'nam' | 'nu') => (x === 'nu' ? 'woman' : 'man');
  const ageBand = (a: number) => `${Math.max(20, a - 4)}-${a + 4}`;
  // Nhãn vị trí: hai người thì trái/phải như cũ; đông hơn thì đánh số kèm mốc
  // hai đầu, vì "figure 3 of 5" không nói cho model biết nó đứng ở đâu.
  const label = (i: number) =>
    two
      ? i === 0
        ? 'LEFT FIGURE'
        : 'RIGHT FIGURE'
      : `FIGURE ${i + 1}${i === 0 ? ' (leftmost)' : i === n - 1 ? ' (rightmost)' : ''}`;

  const figureBlock = (i: number) => {
    const f = figures[i];
    const oc = f.occupation;
    return (
      `${label(i)}: a ${w(f.gender)} appearing roughly ${ageBand(f.arc.portraitAge)} years old; ` +
      `rank and role: ${oc.attireEn}. ` +
      (oc.propEn ? `Carried or worn by this figure: ${oc.propEn}. ` : '') +
      (oc.markEn ? `${oc.markEn[0].toUpperCase()}${oc.markEn.slice(1)}. ` : '') +
      `Their face: ${faces[i] || ''} `
    );
  };

  // Dàn cảnh. Hai người: giữ nguyên `sceneFor`. Đông hơn: chân dung nhóm, mối
  // duyên trung tâm là điểm nhấn, và bên CHO được chỉ đích danh theo số hiệu
  // (không dùng trái/phải nữa vì ở nhóm nó không định vị được ai).
  let composition: string;
  if (two) {
    composition =
      `COMPOSITION: ${sceneForKind(spineKind, giverIdx === 1 ? 'right' : 'left')} ` +
      'Three-quarter or half-body framing that comfortably contains both figures, with clear separation ' +
      'between them and both faces fully visible and unobstructed. The two must be clearly distinguishable ' +
      'from each other. ';
  } else {
    const giverNote =
      giverIdx !== null && (spineKind === 'an-nhan' || spineKind === 'thay-tro')
        ? `Of those two, FIGURE ${giverIdx + 1} is the one who gives or leads. `
        : '';
    composition =
      `COMPOSITION: a group portrait of all ${soEn(n)} figures standing together in one shared scene, ` +
      'evenly spaced from left to right in exactly the order described above, every face turned toward ' +
      'the viewer and fully visible, none overlapping or hidden behind another. Within the group, the ' +
      `relationship between FIGURE ${spineIdx[0] + 1} and FIGURE ${spineIdx[1] + 1} is the one that defines ` +
      `the gathering: ${GROUP_SCENE_EN[spineKind]}. ${giverNote}` +
      'The others stand as people of the same world who belong in this moment, not as onlookers. ' +
      'Half-body or three-quarter framing wide enough to contain everyone comfortably. No violence, no ' +
      'drawn weapons, no blood. Each figure must be clearly distinguishable from the others. ';
  }

  return (
    `A refined classical illustration in the manner of ${era.artTraditionEn}, a single painted scene showing ` +
    `EXACTLY ${soEn(n)} figures together, set in ${era.settingEn}. ` +
    `${two ? 'Both figures' : 'All figures'} have ${era.ethnicityEn}. ` +
    figures.map((_, i) => figureBlock(i)).join('') +
    // Luật trang phục — nêu SAU tất cả để nó phủ lên mọi người trong khung
    `COSTUME RULE — this is ${era.label} and the clothing of ${two ? 'BOTH' : 'ALL'} figures must read ` +
    `unmistakably as such: ${era.costumeGrammarEn} Each figure keeps the dress of their OWN rank as ` +
    'described above; do not give them matching or interchangeable costumes. Historically plausible ' +
    `pre-modern ${era.regionEn} costume and grooming, authentic period detail, no modern clothing, no ` +
    'modern haircut, no anachronistic objects, and no costume elements borrowed from a neighbouring ' +
    'culture. ' +
    composition +
    `SETTING RULE: ${era.sceneGrammarEn} The background is one shared location suited to their meeting, ` +
    `rendered with atmospheric perspective and kept secondary to the ${two ? 'two figures' : 'figures'}. ` +
    `${PORTRAIT_STYLE_EN} ` +
    `EXACTLY ${soEn(n)} PEOPLE in the image — no attendants, no guards, no bystanders, no crowd, no ` +
    'children, no additional faces anywhere including the background. ' +
    'No text, no watermark, no signature, no logo, no subtitles.'
  );
}

// ── 3. Lớp đóng vai cho RAIL ───────────────────────────────────────────
// Cùng cơ chế với `pastLifeRailWrapper`: người xem vừa đọc xong chuyện hai
// nhân vật, phản ứng tự nhiên là hỏi tiếp về họ. Khác một chỗ QUAN TRỌNG: rail
// chỉ nạp được lá số của MỘT người (người đang đăng nhập), nên tuyệt đối không
// được để model luận sâu về người thứ hai như thể có lá số của họ trong tay.
/**
 * Dấu hiệu cổ pháp dẫn tới loại duyên — thứ trang hiện thẳng dưới nhãn
 * "cơ sở trong hai lá số".
 *
 * 🔑 Rail KHÔNG có đường nào suy lại được mấy dòng này: chúng bắc qua HAI lá
 * số (địa chi cung Mệnh, ngũ hành nạp âm, chính tinh cung Mệnh của cả đôi),
 * mà system chỉ nạp được lá số của người đang ngồi trước máy. Không gửi ⇒ hỏi
 * "vì sao lại là oan gia?" là model buộc phải bịa — đúng trên câu hỏi mà chính
 * trang mời người ta đặt.
 */
function signalBlock(signals: BondSignal[] | null | undefined): string {
  if (!Array.isArray(signals) || !signals.length) return '';
  return (
    '\nCƠ SỞ TRONG HAI LÁ SỐ (engine tra — CHÉP đúng, KHÔNG tự suy lại):\n' +
    signals.map((s) => `  • ${s.label}: ${s.detail}\n`).join('')
  );
}

/**
 * Chiều "ai cho ai" của các duyên lệch (ân nhân / thầy trò).
 *
 * ⚠️ Đây là chỗ đã trả giá một lần: `hanhRelation` từng bị đọc ngược khiến
 * truyện và bức tranh dựng NGƯỢC VAI (người được cứu thành người ra tay). Vỏ
 * rail mà không nói rõ chiều thì model tự đoán, và nó đoán sai được y hệt.
 */
function giverLine(giver: 'a' | 'b' | null, nameA: string, nameB: string): string {
  if (!giver) return '  Duyên NGANG HÀNG — không bên nào là bên "cho". Đừng dựng ra vai ân nhân.\n';
  const cho = giver === 'a' ? nameA : nameB;
  const nhan = giver === 'a' ? nameB : nameA;
  return `  Bên CHO là ${cho}, bên NHẬN là ${nhan}. TUYỆT ĐỐI không đảo hai vai này.\n`;
}

export function bondRailWrapper(bond: PastLifeBond, selfIsA: boolean): string {
  const me = selfIsA ? bond.a : bond.b;
  const other = selfIsA ? bond.b : bond.a;
  return `
=== LỚP ĐÓNG VAI: TRẢ LỜI QUA MỐI DUYÊN TIỀN KIẾP ===
Người xem vừa đọc xong bản phác hoạ "duyên nợ tiền kiếp" dựng từ HAI lá số. Trong đó:
- Nhân vật của CHÍNH người xem (lá số đang có ở trên): ${me.characterName} — ${me.occupation.title}
- Nhân vật của người kia: ${other.characterName} — ${other.occupation.title}
- Mối duyên đã chốt: ${bond.type.label}. ${bond.type.gist}
${giverLine(bond.giver, bond.a.characterName, bond.b.characterName)}- Bối cảnh: ${bond.era.label}${bond.era.ageLabel ? ' — ' + bond.era.ageLabel : ''}
${signalBlock(bond.signals)}
CÁCH TRẢ LỜI:
- Hỏi về ${me.characterName} hoặc về mối duyên → luận đúng như luận cho người xem, nhưng ĐẶT LỜI vào đời nhân vật. Bám ĐÚNG dữ liệu lá số ở trên; vỏ bọc chỉ đổi cách nói, không đổi kết luận.
- Giữ đúng bối cảnh đã chốt. Không để vật hiện đại lọt vào.
- Trong lời kể qua nhân vật thì KHÔNG dùng thuật ngữ tử vi. Nhưng khi người xem hỏi "vì sao", "dựa vào đâu" thì ĐƯỢC PHÉP và NÊN nói thẳng cơ sở trong lá số, xong rồi quay lại giọng kể.
- Người xem xưng "tôi", "đời tôi" → bỏ vỏ bọc, luận trực tiếp theo luật thường.

🔴 GIỚI HẠN CỨNG VỀ NGƯỜI THỨ HAI — đọc kỹ:
- Bạn CHỈ có lá số của người xem. Lá số của ${other.characterName} KHÔNG nằm trong dữ liệu ở trên.
- Vì vậy: được nói về ${other.characterName} ở mức mối duyên và chức phận đã chốt, và nói về QUAN HỆ giữa hai người. TUYỆT ĐỐI KHÔNG luận vận hạn, tính cách chi tiết, tiền bạc, sức khoẻ, hôn nhân hay tương lai của người kia — không có cơ sở nào để nói những điều đó.
- Bị hỏi thẳng về người kia thì nói thật là bản này chỉ dựng phần mối duyên, muốn luận riêng cho người ấy thì cần lập lá số của chính họ.

KHÔNG khẳng định đây là kiếp trước có thật. Đây là một phóng chiếu từ hai lá số — nếu được hỏi thẳng, nói đúng như vậy.`;
}

/**
 * Bản NHÓM của `bondRailWrapper`.
 *
 * ⚠️ Giới hạn cứng phải phủ TẤT CẢ những người còn lại, không chỉ một. Rail vẫn
 * chỉ nạp được lá số của người đang ngồi trước máy; nhóm càng đông thì càng dễ
 * bị hỏi sâu về người khác, và mỗi câu trả lời như thế là bịa về một người
 * không có mặt.
 */
export function groupRailWrapper(group: GroupBond, selfIndex: number): string {
  const me = group.profiles[selfIndex];
  const others = group.profiles.map((p, i) => ({ p, i })).filter((x) => x.i !== selfIndex);
  const nameOf = (i: number) => group.profiles[i].characterName;
  const mine = group.pairs.filter((p) => p.i === selfIndex || p.j === selfIndex);
  const rest = group.pairs.filter((p) => p.i !== selfIndex && p.j !== selfIndex);
  return `
=== LỚP ĐÓNG VAI: TRẢ LỜI QUA MỐI DUYÊN TIỀN KIẾP (NHÓM ${soVi(group.profiles.length).toUpperCase()} NGƯỜI) ===
Người xem vừa đọc xong bản phác hoạ "duyên nợ tiền kiếp" dựng từ ${soVi(group.profiles.length)} lá số. Trong đó:
- Nhân vật của CHÍNH người xem (lá số đang có ở trên): ${me.characterName} — ${me.occupation.title}
- Những người còn lại: ${others.map((x) => `${x.p.characterName} — ${x.p.occupation.title}`).join(' · ')}
- Bối cảnh: ${group.era.label}${group.era.ageLabel ? ' — ' + group.era.ageLabel : ''}
- Mối duyên trung tâm của nhóm: ${nameOf(group.spine.i)} — ${nameOf(group.spine.j)}: ${group.spine.type.label}
- Mối duyên của người xem với từng người:
${mine
  .map(
    (p) =>
      `  • ${nameOf(p.i)} — ${nameOf(p.j)}: ${p.type.label}. ${p.type.gist}\n` +
      // Chiều cho/nhận + cơ sở CHỈ in cho cặp DÍNH tới người xem. Nhóm 5 người
      // có 10 cặp × 3 dấu hiệu — in hết là ~1,5K ký tự context cho phần lớn là
      // duyên giữa hai người khác, mà giới hạn cứng ngay dưới lại cấm luận sâu
      // về họ. Gửi thứ model bị cấm dùng là vừa tốn vừa mời nó phá luật.
      `  ${giverLine(p.giver === 'i' ? 'a' : p.giver === 'j' ? 'b' : null, nameOf(p.i), nameOf(p.j)).trimStart()}` +
      (p.signals || []).map((s) => `    – ${s.label}: ${s.detail}\n`).join('')
  )
  .join('')}
${rest.length ? '- Mối duyên giữa những người còn lại với nhau:\n' + rest.map((p) => `  • ${nameOf(p.i)} — ${nameOf(p.j)}: ${p.type.label}`).join('\n') : ''}

CÁCH TRẢ LỜI:
- Hỏi về ${me.characterName} hoặc về các mối duyên → luận đúng như luận cho người xem, nhưng ĐẶT LỜI vào đời nhân vật. Bám ĐÚNG dữ liệu lá số ở trên; vỏ bọc chỉ đổi cách nói, không đổi kết luận.
- Giữ đúng bối cảnh đã chốt. Không để vật hiện đại lọt vào.
- Trong lời kể qua nhân vật thì KHÔNG dùng thuật ngữ tử vi. Nhưng khi người xem hỏi "vì sao", "dựa vào đâu" thì ĐƯỢC PHÉP và NÊN nói thẳng cơ sở trong lá số, xong rồi quay lại giọng kể.
- Người xem xưng "tôi", "đời tôi" → bỏ vỏ bọc, luận trực tiếp theo luật thường.

🔴 GIỚI HẠN CỨNG VỀ NHỮNG NGƯỜI CÒN LẠI — đọc kỹ:
- Bạn CHỈ có lá số của người xem. Lá số của ${others.map((x) => x.p.characterName).join(', ')} KHÔNG nằm trong dữ liệu ở trên.
- Vì vậy: được nói về họ ở mức loại duyên và chức phận đã chốt, và nói về QUAN HỆ giữa họ với nhau hoặc với người xem. TUYỆT ĐỐI KHÔNG luận vận hạn, tính cách chi tiết, tiền bạc, sức khoẻ, hôn nhân hay tương lai của bất kỳ ai trong số họ — không có cơ sở nào để nói những điều đó.
- Bị hỏi thẳng về một người trong nhóm thì nói thật là bản này chỉ dựng phần mối duyên, muốn luận riêng cho người ấy thì cần lập lá số của chính họ.
- KHÔNG xếp hạng các thành viên, không nói ai "hợp nhất" hay "nên tránh ai" — bản này không có cơ sở để phán điều đó, và đó là chuyện có thể làm hỏng quan hệ thật giữa những người đang cùng đọc.

KHÔNG khẳng định đây là kiếp trước có thật. Đây là một phóng chiếu từ các lá số — nếu được hỏi thẳng, nói đúng như vậy.`;
}
