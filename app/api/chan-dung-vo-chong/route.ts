// app/api/chan-dung-vo-chong/route.ts
// POST /api/chan-dung-vo-chong           — sinh chân dung vợ/chồng từ lá số
// GET  /api/chan-dung-vo-chong?action=history — lịch sử đã sinh của user

export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { llmText } from '@/lib/llm/complete';
import { computeLaso } from '@/lib/engine/laso';
import {
  computeSpouseMorphology,
  formatMorphologyForLLM,
  getPhuTheReadout,
  formatPhuTheForLLM,
} from '@/lib/engine/portrait';
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

  // 1 lượt LLM: nhận CẢ (a) morphology đã rank sẵn từ sao (deterministic) LẪN
  // (b) diễn giải cách cục/ý nghĩa Phu Thê engine đã tính sẵn (hôn nhân muộn,
  // chênh lệch tuổi, xa cách, đa tình...). (b) là dữ liệu ƯU TIÊN CAO NHẤT
  // (Henry yêu cầu) — LLM chỉ ĐỌC văn bản có sẵn để rút tín hiệu, KHÔNG được
  // tự bịa cách cục không có trong danh sách.
  const sys =
    'Bạn là art director cho một bức tranh minh họa chân dung (painterly illustration) ẤM ÁP, TƯƠI SÁNG, phong ' +
    'cách gouache/storybook hiện đại (như tranh minh họa sách/editorial đương đại — KHÔNG phải tranh sơn dầu tối ' +
    'màu cổ điển kiểu Rembrandt), kiêm luận giải Tử Vi. Nhận (A) bộ đặc điểm hình thể suy từ sao tại Phu Thê, và ' +
    '(B) cách cục/ý nghĩa cổ pháp tại Phu Thê (engine đã tính sẵn — ĐÂY LÀ NGUỒN ƯU TIÊN CAO NHẤT, cao hơn (A), ' +
    'vì phản ánh đúng cổ pháp chứ không chỉ suy diễn hình thể). Nhiệm vụ:\n' +
    '1) "imagePrompt": MỘT đoạn tiếng ANH liền mạch (80-120 từ). BẮT ĐẦU bằng ĐÚNG 1 câu tổng quan/khái quát ' +
    '(overall gestalt — ấn tượng chung: vóc dáng, khí chất, độ trẻ trung, tươi sáng) rồi MỚI đi vào liệt kê đặc ' +
    'điểm cụ thể (face shape, eyes, nose, lips, hair style và màu tóc tự nhiên, tông da tự nhiên, trang phục ' +
    'thời trang châu Á hiện đại...) — KHÔNG liệt kê chi tiết ngay câu đầu, tránh cảm giác rời rạc như ráp từng ' +
    'mảnh. LUÔN mô tả theo hướng TRẺ TRUNG, TƯƠI SÁNG, RẠNG RỠ, ẤM ÁP như tranh minh họa mùa hè nắng đẹp — biểu ' +
    'cảm BẮT BUỘC là nụ cười nhẹ nhàng, ấm áp, ánh mắt sáng vui vẻ. Dù (A)/(B) gợi ý tính cách mạnh mẽ/nghiêm ' +
    'nghị/lạnh lùng/ít cười thì đó CHỈ là cá tính nội tâm — KHÔNG được chuyển thành biểu cảm lạnh/nghiêm/ít cười ' +
    'hay tông màu tối/u ám trên khuôn mặt; cá tính mạnh CHỈ thể hiện qua ÁNH MẮT tự tin trong khi biểu cảm và ' +
    'ánh sáng tổng thể VẪN sáng sủa, ấm áp, dễ gần. TUYỆT ĐỐI CẤM các từ/ý: "cold", "stern", "serious", ' +
    '"intense", "unsmiling", "rarely smiles", "menacing", "hardened", "mysterious", "enigmatic", "dark", ' +
    '"moody", "somber", "shadowy", "muted", "dim" — và CẤM từ ngữ gợi già dặn/khắc khổ/phong trần/nhiều nếp ' +
    'nhăn (cấm "mature", "weathered", "aged", "world-worn"). KHÔNG tự thêm mô tả phong cách nghệ thuật/ánh sáng/' +
    'chủng tộc (phần đó server tự ghép), KHÔNG nhắc chiêm tinh/tử vi/tên sao. Các đặc điểm KHÔNG được mâu thuẫn ' +
    'nhau — nếu (A) và (B) mâu thuẫn, ưu tiên (B) nhưng vẫn giữ tinh thần trẻ trung, tươi sáng nói trên.\n' +
    '2) "description": đoạn tiếng VIỆT (120-180 từ), văn xuôi tự nhiên mô tả khuôn mặt, hình dáng, phong thái, ' +
    'tính cách VÀ (nếu (B) có gợi ý) hoàn cảnh hôn nhân (vd duyên muộn, gặp nhau nơi xa, tính cách vui vẻ/trầm ' +
    'lặng...) — KHÔNG nhắc tên sao/thuật ngữ tử vi, đọc như lời tả người thật.\n' +
    '3) "meetingContext": đoạn tiếng VIỆT NGẮN (30-60 từ) luận riêng về HOÀN CẢNH GẶP GỠ nhiều khả năng nhất ' +
    '(vd qua công việc/học tập, qua bạn bè/người thân giới thiệu, tình cờ gặp gỡ, ở nơi xa quê hương/công tác/' +
    'du học, quen biết lâu mới nên duyên, qua mai mối...). ƯU TIÊN bám sát gợi ý CỤ THỂ trong (B) nếu có (vd ' +
    'Thiên Mã/Tuần/Triệt tại Phu Thê → gặp/thành hôn ở nơi xa; Phục Binh → quen biết, qua lại một thời gian rồi ' +
    'mới cưới; Cự Môn gặp Hỏa/Linh → qua nhiều lần mai mối mới thành; Tả Phù Hữu Bật sáng sủa → có người thân/' +
    'bạn bè mai mối, giúp đỡ). Nếu (B) KHÔNG có gợi ý cụ thể về cách gặp gỡ, chọn 1 hoàn cảnh phổ biến, tự ' +
    'nhiên, hợp lý và diễn đạt như một khả năng nhẹ nhàng ("có thể", "nhiều khả năng") chứ không khẳng định ' +
    'chắc chắn — KHÔNG bịa cách cục sao không có trong (B), KHÔNG nhắc tên sao/thuật ngữ tử vi.\n' +
    '4) "ageAdjustYears": số nguyên (-10..15, mặc định 0) — CHỈ khác 0 nếu (B) có câu chữ RÕ RÀNG gợi ý chênh ' +
    'lệch tuổi với bạn đời (vd "nên lấy người lớn tuổi hơn" → số dương; "nên chênh lệch tuổi" mà không rõ ' +
    'chiều → vẫn có thể để 0 nếu không chắc). Không suy diễn nếu (B) không nhắc gì tới tuổi tác.\n' +
    '5) "foreignHint": true CHỈ nếu (B) có gợi ý rõ ràng về việc kết hôn xa xứ/nơi xa (vd sao Thiên Mã "gặp ' +
    'nhau nơi xa, kết hôn xa quê") — nếu không có gợi ý này, để false.\n' +
    '6) "sameSexHint": true CHỈ nếu (B) có câu chữ rõ ràng gợi ý bạn đời cùng giới tính — trong tuyệt đại đa số ' +
    'trường hợp sẽ là false (dữ liệu cổ pháp hiếm khi nói rõ điều này), KHÔNG tự suy diễn.\n' +
    'CHỈ trả JSON hợp lệ: {"imagePrompt":"...","description":"...","meetingContext":"...","ageAdjustYears":0,"foreignHint":false,"sameSexHint":false}';

  const userMsg =
    `Giới tính mặc định (đối lập lá số gốc): ${morph.spouseGender === 'nu' ? 'Nữ' : 'Nam'}, tuổi hiện tại của lá số gốc: ${morph.baseAge}.\n\n` +
    `(A) Đặc điểm hình thể suy từ sao:\n${formatMorphologyForLLM(morph)}\n\n` +
    `(B) Cách cục / ý nghĩa cổ pháp tại Phu Thê (ƯU TIÊN CAO NHẤT):\n${formatPhuTheForLLM(phuThe)}`;

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
    sameSexHint?: boolean;
  } | null;
  if (!parsed?.imagePrompt || !parsed?.description) return err('Lỗi phân tích kết quả AI.', 500);

  // Cách cục (LLM đọc từ (B)) ưu tiên hơn heuristic sao thuần túy (starAgeOffset)
  // — chỉ fallback về sao khi cách cục KHÔNG có gợi ý tuổi tác rõ ràng.
  const llmAgeAdjust = Math.max(-10, Math.min(15, Math.round(Number(parsed.ageAdjustYears) || 0)));
  const finalOffset = llmAgeAdjust !== 0 ? llmAgeAdjust : morph.starAgeOffset;
  const spouseAge = Math.max(18, Math.min(80, morph.baseAge + finalOffset));
  const spouseGender = parsed.sameSexHint ? userGender : morph.spouseGender;

  // Style — warm, SUNLIT gouache/storybook illustration (THAY bản "painterly + mysterious"
  // trước — bản đó ra tranh tối màu kiểu sơn dầu cổ điển/Rembrandt (nền tối, ánh sáng
  // chiaroscuro, tông nâu trầm) vì "mysterious/moody atmospheric" bị model hiểu thành
  // tranh cổ điển tối/nghiêm — TỆ hơn cả bản photoreal trước đó. Henry gửi ảnh mẫu tham
  // chiếu: tranh gouache/minh họa hiện đại kiểu sách thiếu nhi/editorial — SÁNG, ấm, nắng
  // vàng xuyên tán lá xanh, màu tươi. Bỏ HẲN "mysterious" (đã cấm luôn trong sys prompt)
  // — chỉ giữ "painterly illustration" làm KỸ THUẬT vẽ, còn KHÔNG KHÍ phải sáng/ấm/vui.
  // Tuổi: vẫn dùng RANGE lệch xuống dưới spouseAge (giữ nguyên cơ chế từ bản trước, ổn).
  const ageHigh = Math.max(20, spouseAge - 2);
  const ageLow = Math.max(18, ageHigh - 6);
  // "female"/"male" (thay vì "woman"/"man") — từ trung tính tuổi tác hơn, đỡ bị
  // model liên tưởng phụ nữ/đàn ông trưởng thành/lớn tuổi.
  const genderWord = spouseGender === 'nu' ? 'female' : 'male';
  // Luôn neo gốc Việt Nam/Đông Nam Á — người dùng phần lớn là Việt, bỏ neo này
  // dễ ra khuôn mặt "lạ" (Tây/lai không rõ vùng) dù chỉ vì sao kiểu Thiên Mã gợi ý
  // "xa cách/xa quê". foreignHint CHỈ thêm sắc thái đa văn hóa, KHÔNG đổi hẳn chủng tộc.
  const ethnicityLine = parsed.foreignHint
    ? 'The person has Vietnamese Southeast Asian facial features, with a subtle hint of well-traveled or mixed heritage — as if the couple met while one of them was living or traveling far from home.'
    : 'The person has classic Vietnamese Southeast Asian facial features.';
  // Nhắc "sáng, ấm, tươi" CẢ TRƯỚC LẪN SAU đoạn imagePrompt (bracket kỹ thuật) — vì
  // (A)/(B) hay mang cá tính lạnh/ít cười (vd sao Thất Sát/Liêm Trinh/Tham Lang), LLM có
  // thể lỡ nhét chữ "cold/serious/dark" vào dù đã cấm ở sys prompt; nhắc lại 2 lần để chỉ
  // định thị giác THẮNG cá tính nội tâm khi ra ảnh.
  const finalPrompt =
    `A warm, sunlit gouache-style painterly illustration (like a modern storybook or editorial illustration — ` +
    `NOT a photograph, NOT a dark classical oil painting, NOT a stock-photo look) of a ${genderWord} who ` +
    `appears to be roughly ${ageLow}-${ageHigh} years old, no older. ${ethnicityLine} Wearing stylish, modern ` +
    'Asian fashion clothing. Soft visible brushstrokes, warm golden sunlight streaming through a softly ' +
    'blurred green foliage background, bright warm highlights on the hair and skin, a light, dreamy, cheerful ' +
    'mood — BRIGHT and warm in tone throughout, NEVER dark, shadowy, muted, brown-toned, somber, or moody; ' +
    'avoid heavy chiaroscuro or dim/dramatic lighting entirely. The subject has a warm, gentle, soft smile and ' +
    'a bright, fresh, approachable expression — relaxed and happy, NEVER cold, stern, unsmiling, or serious. ' +
    `The subject looks youthful and vibrant, with smooth soft skin appropriate for someone between ${ageLow} ` +
    `and ${ageHigh} years old — not older, no heavy wrinkles or tired features. ${parsed.imagePrompt} ` +
    'Regardless of the above, the overall image must stay BRIGHT, warm and cheerful — a soft warm-toned color ' +
    'palette full of light, never dark or somber; keep the expression warm and the skin youthful. Rich, ' +
    'evocative painterly illustration quality, soft-focus background, half-body or head-and-shoulders framing. ' +
    'No text, no watermark, no signature.';

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
    }),
  }).catch(() => {});

  return ok({
    success: true,
    imageUrl,
    description: parsed.description,
    meetingContext: parsed.meetingContext || '',
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
    `${SUPABASE_URL}/rest/v1/spouse_portraits?user_id=eq.${auth.user.id}&select=id,created_at,image_url,description,meeting_context,spouse_gender,spouse_age&order=created_at.desc&limit=20`,
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
