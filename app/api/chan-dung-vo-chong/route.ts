// app/api/chan-dung-vo-chong/route.ts
// POST /api/chan-dung-vo-chong           — sinh chân dung vợ/chồng từ lá số
// GET  /api/chan-dung-vo-chong?action=history — lịch sử đã sinh của user

export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { llmText } from '@/lib/llm/complete';
import { computeLaso, formatLaSoV2 } from '@/lib/engine/laso';
import {
  computeSpouseMorphology,
  formatMorphologyForLLM,
  getPhuTheReadout,
  formatPhuTheForLLM,
} from '@/lib/engine/portrait';
import { PHU_THE_LUAN_GIAI_SYSTEM_PROMPT, buildPhuTheLuanGiaiPrompt } from '@/lib/agent/phu-the-luan-giai';
import { generatePortraitImage } from '@/lib/image/openai-image';
import type { BirthParams } from '@/lib/contract/v1';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// ── Auth (giống pattern authUser trong app/api/phong-thuy/route.ts) ──────
async function getUserFromToken(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ? u : null;
}

async function authUser(request: NextRequest): Promise<{ error: string; status: number } | { user: { id: string } }> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  const user = await getUserFromToken(auth.slice(7));
  if (!user?.id) return { error: 'Unauthorized', status: 401 };
  return { user };
}

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
}

// ── Generate ──────────────────────────────────────────────────────────
async function handleGenerate(request: NextRequest, body: Record<string, unknown>) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const birth = body.birth as BirthParams | undefined;
  if (!birth) return err('Thiếu thông tin ngày sinh.', 400);

  const lasoRes = computeLaso(birth);
  if (!lasoRes.ok || !lasoRes.ls) return err(lasoRes.error || 'Không lập được lá số.', 400);

  const userGender = birth.gender === 'nu' ? 'nu' : 'nam';
  const morph = computeSpouseMorphology(lasoRes.ls, userGender);
  const phuThe = getPhuTheReadout(lasoRes.ls);

  // Lượt LLM RIÊNG: luận giải cung Phu Thê ĐẦY ĐỦ, ĐÚNG flow/văn phong tool
  // luan-giai (mode=phan, phan=12 — xem lib/agent/phu-the-luan-giai.ts) —
  // hiển thị cho user bên dưới chân dung, và làm nguồn CHÍNH XÁC hơn cho việc
  // suy đoán chênh lệch tuổi bạn đời (thay vì chỉ dựa danh sách cách cục thô
  // (B) bên dưới). Best-effort: lỗi thì bỏ qua, không chặn luồng vẽ ảnh.
  let phuTheLuanGiai = '';
  try {
    const laSoText = formatLaSoV2(lasoRes.ls);
    phuTheLuanGiai = (
      await llmText({
        system: PHU_THE_LUAN_GIAI_SYSTEM_PROMPT,
        prompt: buildPhuTheLuanGiaiPrompt(laSoText, undefined, userGender),
        maxTokens: 900,
      })
    ).trim();
  } catch {
    /* best-effort — không chặn vẽ ảnh nếu luận giải lỗi */
  }

  // 1 lượt LLM: nhận CẢ (a) morphology đã rank sẵn từ sao (deterministic) LẪN
  // (b) diễn giải cách cục/ý nghĩa Phu Thê engine đã tính sẵn (hôn nhân muộn,
  // chênh lệch tuổi, xa cách, đa tình...) VÀ (c) đoạn luận giải Phu Thê ĐẦY ĐỦ
  // (văn xuôi, vừa tính ở trên) — (c) là nguồn CHÍNH XÁC NHẤT cho câu hỏi tuổi
  // tác vì đã tổng hợp cả tam phương/tứ chiếu, không chỉ danh sách cách cục
  // rời rạc. (b)/(c) là dữ liệu ƯU TIÊN CAO NHẤT (Henry yêu cầu) — LLM chỉ ĐỌC
  // văn bản có sẵn để rút tín hiệu, KHÔNG được tự bịa cách cục không có trong
  // danh sách/đoạn luận giải.
  const sys =
    'Bạn là art director cho một bức ẢNH chân dung editorial cao cấp (ultra-realistic premium editorial lifestyle ' +
    'portrait photography, phong cách Vietnamese luxury editorial — "quiet luxury", ấm áp, tinh tế, tự nhiên, KHÔNG ' +
    'phải tranh vẽ/minh họa/phác họa, KHÔNG đơn sắc), kiêm luận giải Tử Vi. Nhận (A) bộ đặc điểm hình thể suy từ sao tại Phu Thê, (B) cách cục/ý nghĩa cổ pháp tại ' +
    'Phu Thê (engine đã tính sẵn), và (C) đoạn luận giải Phu Thê đầy đủ (văn xuôi, đã phân tích tam phương/tứ ' +
    'chiếu) NẾU CÓ — (B) và (C) là NGUỒN ƯU TIÊN CAO NHẤT, cao hơn (A), vì phản ánh đúng cổ pháp chứ ' +
    'không chỉ suy diễn hình thể; RIÊNG câu hỏi tuổi tác (mục 4) ưu tiên đọc (C) trước vì đầy đủ ngữ cảnh hơn. Nhiệm vụ:\n' +
    '1) "imagePrompt": MỘT đoạn tiếng ANH liền mạch (80-120 từ). BẮT ĐẦU bằng ĐÚNG 1 câu tổng quan/khái quát ' +
    '(overall gestalt — ấn tượng chung: vóc dáng, khí chất, độ trẻ trung, tươi sáng) rồi MỚI đi vào liệt kê đặc ' +
    'điểm cụ thể (face shape, eyes, nose, lips, hair style và màu tóc tự nhiên, tông da tự nhiên...) — KHÔNG mô ' +
    'tả trang phục/quần áo (phần đó server tự chọn riêng, tránh xung đột) — KHÔNG liệt kê chi tiết ngay câu đầu, tránh cảm giác rời rạc như ráp từng ' +
    'mảnh. LUÔN mô tả theo hướng TRẺ TRUNG, TƯƠI SÁNG, RỰC RỠ, SỐNG ĐỘNG, MÀU SẮC BÃO HÒA như tranh minh họa mùa ' +
    'hè nắng đẹp — biểu cảm BẮT BUỘC là nụ cười nhẹ nhàng, ấm áp, ánh mắt sáng vui vẻ. Dù (A)/(B) gợi ý tính ' +
    'cách mạnh mẽ/nghiêm nghị/lạnh lùng/ít cười thì đó CHỈ là cá tính nội tâm — KHÔNG được chuyển thành biểu cảm ' +
    'lạnh/nghiêm/ít cười hay tông màu tối/u ám/nhạt nhòa trên khuôn mặt; cá tính mạnh CHỈ thể hiện qua ÁNH MẮT ' +
    'tự tin trong khi biểu cảm và màu sắc tổng thể VẪN sáng sủa, rực rỡ, ấm áp, dễ gần. TUYỆT ĐỐI CẤM các từ/ý: ' +
    '"cold", "stern", "serious", "intense", "unsmiling", "rarely smiles", "menacing", "hardened", "mysterious", ' +
    '"enigmatic", "dark", "moody", "somber", "shadowy", "muted", "dim", "monochrome", "desaturated" — và CẤM từ ' +
    'ngữ gợi già dặn/khắc khổ/phong trần/nhiều nếp nhăn (cấm "mature", "weathered", "aged", "world-worn"). ' +
    'KHÔNG tự thêm mô tả phong cách nghệ thuật/ánh sáng/chủng tộc/trang phục (phần đó server tự ghép), KHÔNG nhắc chiêm ' +
    'tinh/tử vi/tên sao. Các đặc điểm KHÔNG được mâu thuẫn nhau — nếu (A) và (B) mâu thuẫn, ưu tiên (B) nhưng ' +
    'vẫn giữ tinh thần trẻ trung, rực rỡ nói trên.\n' +
    '2) "description": đoạn tiếng VIỆT (120-180 từ), văn xuôi tự nhiên mô tả khuôn mặt, hình dáng, phong thái, ' +
    'tính cách VÀ (nếu (B) có gợi ý) hoàn cảnh hôn nhân (vd duyên muộn, gặp nhau nơi xa, tính cách vui vẻ/trầm ' +
    'lặng...) — KHÔNG nhắc tên sao/thuật ngữ tử vi, KHÔNG ước lượng hay nêu số tuổi/số năm chênh lệch cụ thể với ' +
    'bạn đời, đọc như lời tả người thật.\n' +
    '3) "meetingContext": đoạn tiếng VIỆT NGẮN (30-60 từ) luận riêng về HOÀN CẢNH GẶP GỠ nhiều khả năng nhất ' +
    '(vd qua công việc/học tập, qua bạn bè/người thân giới thiệu, tình cờ gặp gỡ, ở nơi xa quê hương/công tác/' +
    'du học, quen biết lâu mới nên duyên, qua mai mối...). ƯU TIÊN bám sát gợi ý CỤ THỂ trong (B) nếu có (vd ' +
    'Thiên Mã/Tuần/Triệt tại Phu Thê → gặp/thành hôn ở nơi xa; Phục Binh → quen biết, qua lại một thời gian rồi ' +
    'mới cưới; Cự Môn gặp Hỏa/Linh → qua nhiều lần mai mối mới thành; Tả Phù Hữu Bật sáng sủa → có người thân/' +
    'bạn bè mai mối, giúp đỡ). Nếu (B) KHÔNG có gợi ý cụ thể về cách gặp gỡ, chọn 1 hoàn cảnh phổ biến, tự ' +
    'nhiên, hợp lý và diễn đạt như một khả năng nhẹ nhàng ("có thể", "nhiều khả năng") chứ không khẳng định ' +
    'chắc chắn — KHÔNG bịa cách cục sao không có trong (B), KHÔNG nhắc tên sao/thuật ngữ tử vi.\n' +
    '4) "ageAdjustYears": số nguyên (-15..15, mặc định 0). ĐỌC KỸ (C) trước — nếu (C) có 1 câu RÕ RÀNG nói bạn ' +
    'đời LỚN TUỔI HƠN hay NHỎ TUỔI HƠN kèm mức độ, chọn số nguyên tương ứng: chênh nhẹ → ±2-4, chênh vừa → ' +
    '±5-8, chênh nhiều → ±9-15 (dấu DƯƠNG = bạn đời LỚN tuổi hơn lá số gốc, dấu ÂM = NHỎ tuổi hơn). Nếu (C) ' +
    'không có gợi ý rõ, xét tiếp (B) (vd "nên lấy người lớn tuổi hơn" → số dương). Nếu CẢ (B) VÀ (C) đều không ' +
    'nhắc gì rõ ràng tới tuổi tác, để 0 — không tự suy diễn.\n' +
    '5) "foreignHint": true CHỈ nếu (B)/(C) có gợi ý rõ ràng về việc kết hôn xa xứ/nơi xa, hai người ở xa nhau ' +
    'nhiều (vd sao Thiên Mã "gặp nhau nơi xa, kết hôn xa quê") — ĐÂY LÀ TÍN HIỆU ĐỊA LÝ (xa quê), KHÔNG PHẢI ' +
    'quốc tịch/dân tộc, người này vẫn có thể là người Việt. Nếu không có gợi ý này, để false.\n' +
    '6) "foreignSpouseHint": true CHỈ nếu (B) hoặc (C) có nội dung RÕ RÀNG nói bạn đời là NGƯỜI NƯỚC NGOÀI/NGOẠI ' +
    'QUỐC (khác quốc tịch, khác dân tộc/chủng tộc với đương số — vd chữ hoặc ý rõ ràng như "người nước ngoài", ' +
    '"ngoại quốc", "khác quốc tịch", "Tây", "nước khác") — KHÁC với mục 5 (mục 5 chỉ là "xa quê" về ĐỊA LÝ, vẫn ' +
    'có thể là người Việt xa xứ). CHỈ để true khi có tín hiệu cụ thể về QUỐC TỊCH/CHỦNG TỘC khác, không suy diễn ' +
    'từ riêng "xa quê"/"di chuyển nhiều". Nếu không có, để false.\n' +
    '7) "sameSexHint": true CHỈ nếu (B) có câu chữ rõ ràng gợi ý bạn đời cùng giới tính — trong tuyệt đại đa số ' +
    'trường hợp sẽ là false (dữ liệu cổ pháp hiếm khi nói rõ điều này), KHÔNG tự suy diễn.\n' +
    'CHỈ trả JSON hợp lệ: {"imagePrompt":"...","description":"...","meetingContext":"...","ageAdjustYears":0,"foreignHint":false,"foreignSpouseHint":false,"sameSexHint":false}';

  const userMsg =
    `Giới tính mặc định (đối lập lá số gốc): ${morph.spouseGender === 'nu' ? 'Nữ' : 'Nam'}, tuổi hiện tại của lá số gốc: ${morph.baseAge}.\n\n` +
    `(A) Đặc điểm hình thể suy từ sao:\n${formatMorphologyForLLM(morph)}\n\n` +
    `(B) Cách cục / ý nghĩa cổ pháp tại Phu Thê:\n${formatPhuTheForLLM(phuThe)}` +
    (phuTheLuanGiai ? `\n\n(C) Đoạn luận giải Phu Thê đầy đủ (ƯU TIÊN CAO NHẤT cho câu hỏi tuổi tác):\n${phuTheLuanGiai}` : '');

  let raw: string;
  try {
    raw = await llmText({ system: sys, prompt: userMsg, maxTokens: 900 });
  } catch {
    return err('Lỗi AI mô tả chân dung. Vui lòng thử lại.', 500);
  }
  const parsed = parseJSON(raw) as {
    imagePrompt?: string;
    description?: string;
    meetingContext?: string;
    ageAdjustYears?: number;
    foreignHint?: boolean;
    foreignSpouseHint?: boolean;
    sameSexHint?: boolean;
  } | null;
  if (!parsed?.imagePrompt || !parsed?.description) return err('Lỗi phân tích kết quả AI.', 500);

  // Cách cục (LLM đọc từ (B)/(C), ưu tiên (C) — luận giải Phu Thê đầy đủ) ưu
  // tiên hơn heuristic sao thuần túy (starAgeOffset) — chỉ fallback về sao khi
  // không có gợi ý tuổi tác rõ ràng. Range đối xứng ±15 (trước lệch -10..15) —
  // chênh "nhỏ tuổi hơn nhiều" cũng cần biên độ ngang "lớn tuổi hơn nhiều".
  const llmAgeAdjust = Math.max(-15, Math.min(15, Math.round(Number(parsed.ageAdjustYears) || 0)));
  const finalOffset = llmAgeAdjust !== 0 ? llmAgeAdjust : morph.starAgeOffset;
  const spouseAge = Math.max(18, Math.min(80, morph.baseAge + finalOffset));
  const spouseGender = parsed.sameSexHint ? userGender : morph.spouseGender;

  // Style — chuyển hẳn từ tranh minh họa (illustration) SANG ảnh chụp editorial cao cấp
  // (Henry gửi 1 ảnh mẫu tham chiếu dạng "premium editorial portrait board" — luxury
  // editorial phong cách Việt Nam (đổi từ Korean theo yêu cầu), quiet luxury, ảnh chụp
  // DSLR 85mm f/1.8, ánh sáng cửa sổ tự nhiên,
  // bảng màu be/kem trung tính, KHÔNG beauty filter/KHÔNG giả AI). Bản gốc Henry gửi là
  // layout NHIỀU ảnh (1 ảnh chính + 8-10 ảnh phụ khác góc/pose) cho 1 "character sheet" —
  // KHÔNG áp dụng phần layout đó vì tool chỉ sinh 1 ảnh/lượt; chỉ lấy phần STYLE/
  // PHOTOGRAPHY/WARDROBE/MOOD/QUALITY áp cho 1 chân dung đơn.
  // Tuổi: vẫn dùng RANGE lệch xuống dưới spouseAge (giữ nguyên cơ chế từ bản trước, ổn).
  const ageHigh = Math.max(20, spouseAge - 2);
  const ageLow = Math.max(18, ageHigh - 6);
  // "female"/"male" (thay vì "woman"/"man") — từ trung tính tuổi tác hơn, đỡ bị
  // model liên tưởng phụ nữ/đàn ông trưởng thành/lớn tuổi.
  const genderWord = spouseGender === 'nu' ? 'female' : 'male';
  // Mặc định neo gốc Việt Nam/Đông Nam Á — người dùng phần lớn là Việt, bỏ neo này
  // dễ ra khuôn mặt "lạ" (Tây/lai không rõ vùng) dù chỉ vì sao kiểu Thiên Mã gợi ý
  // "xa cách/xa quê" (foreignHint — CHỈ thêm sắc thái đa văn hóa, KHÔNG đổi hẳn chủng
  // tộc). RIÊNG khi luận giải có tín hiệu RÕ RÀNG về bạn đời là người NGOẠI QUỐC
  // (foreignSpouseHint — Henry yêu cầu), mới thực sự đổi hẳn sang diện mạo nước ngoài.
  const ethnicityLine = parsed.foreignSpouseHint
    ? 'The person has a foreign (non-Vietnamese) appearance, as the astrological reading points to a spouse of a different nationality/ethnicity — a natural, believable international look, still warm and approachable.'
    : parsed.foreignHint
      ? 'The person has Vietnamese Southeast Asian facial features, with a subtle hint of well-traveled or mixed heritage — as if the couple met while one of them was living or traveling far from home.'
      : 'The person has classic Vietnamese Southeast Asian facial features.';
  // Trang phục — TRƯỚC đây khóa cứng "cream/ivory/beige" cho MỌI lượt (cả nam lẫn nữ)
  // → Henry phản hồi ảnh nào cũng na ná màu áo. Nay RANDOM 1 outfit mỗi lượt gen (server
  // chọn, KHÔNG để LLM tự chọn) từ pool riêng theo giới tính — nữ có THÊM áo dài truyền
  // thống Việt Nam màu tươi sáng (Henry yêu cầu) xen giữa các lựa chọn casual thường
  // ngày; nam giữ casual thuần. Palette "be/kem/trung tính" tách riêng — CHỈ áp cho
  // NỀN/ánh sáng (chống tối/xỉn màu), KHÔNG còn ép trang phục theo màu đó nữa.
  const FEMALE_OUTFITS = [
    'a simple white blouse and straight-leg jeans, relaxed everyday style',
    'a soft pastel-pink knit sweater, casual everyday style',
    'a mint-green casual blouse, relaxed everyday style',
    'a light-blue denim jacket over a plain white T-shirt, casual street style',
    'a flowing casual dress in a warm terracotta tone',
    'a traditional Vietnamese áo dài in a vivid, bright coral color, elegant flowing silhouette',
    'a traditional Vietnamese áo dài in a vivid, bright turquoise color, elegant flowing silhouette',
    'a traditional Vietnamese áo dài in a bright, sunny yellow color, elegant flowing silhouette',
    'a traditional Vietnamese áo dài in a vivid fuchsia color, elegant flowing silhouette',
  ];
  const MALE_OUTFITS = [
    'a simple white or light-blue button-up shirt with jeans, relaxed everyday style',
    'a casual navy bomber jacket over a plain T-shirt, casual street style',
    'a relaxed olive-green button-up shirt with sleeves rolled up',
    'a soft moss-green knit sweater, casual everyday style',
    'a casual grey or charcoal polo shirt',
    'a light denim jacket over a plain white T-shirt, casual street style',
    'a warm mustard-yellow casual shirt',
  ];
  const outfitPool = spouseGender === 'nu' ? FEMALE_OUTFITS : MALE_OUTFITS;
  const wardrobeLine = `Wearing ${outfitPool[Math.floor(Math.random() * outfitPool.length)]}, no logos, no flashy accessories.`;
  // Nhắc "rực rỡ, sống động" CẢ TRƯỚC LẪN SAU đoạn imagePrompt (bracket kỹ thuật) — vì
  // (A)/(B) hay mang cá tính lạnh/ít cười (vd sao Thất Sát/Liêm Trinh/Tham Lang), LLM có
  // thể lỡ nhét chữ "cold/serious/dark/muted" vào dù đã cấm ở sys prompt; nhắc lại 2 lần
  // để chỉ định thị giác THẮNG cá tính nội tâm khi ra ảnh.
  const finalPrompt =
    `An ultra-realistic, premium editorial lifestyle portrait photograph of a ${genderWord} who appears to be ` +
    `roughly ${ageLow}-${ageHigh} years old, no older — Vietnamese luxury editorial aesthetic, "quiet luxury", warm, ` +
    'elegant, refined and timeless, Apple/Muji-inspired minimalism, natural and authentic premium feeling (NOT ' +
    'a painting, NOT an illustration, NOT a sketch, NOT monochrome or grayscale, NOT a dark or moody image). ' +
    `${ethnicityLine} Professional DSLR photography, 85mm portrait lens, f/1.8 shallow depth of field, soft ` +
    'natural window light, diffused warm daylight, soft gentle shadows, cinematic but natural — ultra-realistic ' +
    'skin texture, NO beauty filter, NO exaggerated AI look, NO plastic or airbrushed skin. Warm, softly lit ' +
    'background with a gentle neutral tone; BRIGHT and warm in tone throughout, NEVER dark, shadowy, muted, ' +
    `dull, desaturated, or somber; avoid heavy chiaroscuro or dim/flat lighting entirely. ${wardrobeLine} Bright ` +
    'modern warm-neutral home interior, softly blurred background, natural window lighting, no clutter. The ' +
    'subject has a warm, gentle, natural smile and a bright, approachable, trustworthy expression — relaxed and ' +
    'happy, NEVER cold, stern, unsmiling, or serious. The subject looks youthful and vibrant, with smooth soft ' +
    `natural skin appropriate for someone between ${ageLow} and ${ageHigh} years old — not older, no heavy ` +
    `wrinkles or tired features. ${parsed.imagePrompt} Regardless of the above, the overall image must stay ` +
    'BRIGHT, warm and natural — soft, gentle light throughout, never dull or dark; keep the expression warm ' +
    'and gentle, the skin youthful, natural and photorealistic (no beauty filter, no AI-plastic look). ' +
    'High-end magazine quality, 8K, extremely detailed, natural skin texture, no artifacts, no distorted ' +
    'anatomy, single portrait only, half-body or head-and-shoulders framing. No text, no watermark, no signature.';

  let imageB64: string;
  try {
    imageB64 = await generatePortraitImage({ prompt: finalPrompt, size: '1024x1536' });
  } catch (e) {
    return err('Lỗi sinh ảnh: ' + (e instanceof Error ? e.message : 'không rõ'), 500);
  }

  // Upload Supabase Storage (bucket public 'portraits')
  const path = `${auth.user.id}/${Date.now()}.png`;
  const bytes = Buffer.from(imageB64, 'base64');
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/portraits/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'image/png',
    },
    body: bytes,
  });
  if (!upRes.ok) {
    const t = await upRes.text().catch(() => '');
    return err('Lỗi lưu ảnh: ' + t.slice(0, 200), 500);
  }
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/portraits/${path}`;

  // Lưu lịch sử — best-effort, không chặn response nếu lỗi ghi DB.
  fetch(`${SUPABASE_URL}/rest/v1/spouse_portraits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: auth.user.id,
      user_gender: userGender,
      spouse_gender: spouseGender,
      spouse_age: spouseAge,
      core_star: morph.coreStar,
      image_url: imageUrl,
      description: parsed.description,
      meeting_context: parsed.meetingContext || null,
      phu_the_luan_giai: phuTheLuanGiai || null,
    }),
  }).catch(() => {});

  return ok({
    success: true,
    imageUrl,
    description: parsed.description,
    meetingContext: parsed.meetingContext || '',
    phuTheLuanGiai: phuTheLuanGiai || '',
    spouseGender,
    spouseAge,
    phuThe,
  });
}

// ── History ───────────────────────────────────────────────────────────
async function handleHistory(request: NextRequest) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/spouse_portraits?user_id=eq.${auth.user.id}&select=id,created_at,image_url,description,meeting_context,phu_the_luan_giai,spouse_gender,spouse_age&order=created_at.desc&limit=20`,
    { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } },
  );
  if (!r.ok) return err('Lỗi tải lịch sử.', 500);
  const items = await r.json();
  return ok({ success: true, items });
}

// ── Routes ────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request);
  return handleGenerate(request, body);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'history';
  if (action === 'history') return handleHistory(request);
  return err('Invalid action', 400);
}
