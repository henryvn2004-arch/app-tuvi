// app/api/chan-dung-tien-kiep/route.ts
// POST /api/chan-dung-tien-kiep                — 2 pha: phase='story' | 'image'
// GET  /api/chan-dung-tien-kiep?action=history — lịch sử đã sinh của user
//
// VÌ SAO TÁCH 2 PHA (thay vì 1 request như tool Chân Dung Vợ Chồng):
// viết truyện (~20s) và sinh ảnh (~60s) hoàn toàn ĐỘC LẬP — cả hai chỉ ăn dữ
// liệu deterministic từ computePastLife(). Gộp 1 request thì người dùng ngồi
// nhìn màn hình trắng cho tới khi ảnh xong. Tách ra, client gọi SONG SONG 2
// request: truyện hiện ra trước để đọc, ảnh chèn vào sau. Chi phí: lá số bị
// tính 2 lần (deterministic, vài chục ms — không đáng kể).

export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { toolPaymentDenied } from '@/lib/billing/credits';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage, logImageUsage, logLlmParseFail } from '@/lib/agent/usage';
import { railFreeGrant, railFreeTurnsPerGen } from '@/lib/billing/viral-budget';
import { computeLaso, type Laso } from '@/lib/engine/laso';
import { computePastLife, resolveEra, type PastLifeProfile } from '@/lib/engine/past-life';
import { computeMorphologyForPalace } from '@/lib/engine/portrait';
import {
  PAST_LIFE_STORY_SYSTEM_PROMPT,
  buildPastLifeStoryPrompt,
  PAST_LIFE_IMAGE_SYSTEM_PROMPT,
  buildPastLifeImagePrompt,
  buildFinalPastLifeImagePrompt,
} from '@/lib/agent/past-life-story';
import { generatePortraitImage } from '@/lib/image/openai-image';
import type { BirthParams } from '@/lib/contract/v1';
import { withToolOutcome } from '@/lib/ops/tool-outcome';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// ── Auth (cùng pattern app/api/chan-dung-vo-chong/route.ts) ─────────────
async function getUserFromToken(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ? u : null;
}

async function authUser(
  request: NextRequest,
): Promise<{ error: string; status: number } | { user: { id: string } }> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
  const user = await getUserFromToken(auth.slice(7));
  if (!user?.id) return { error: 'Unauthorized', status: 401 };
  return { user };
}

// Bóc JSON từ câu trả lời LLM.
//
// Bản cũ chỉ `JSON.parse(text.replace(fences).trim())` — giòn tới mức chỉ cần
// model thêm một câu dẫn ("Đây là câu chuyện:") hoặc một dòng ghi chú ở cuối là
// hỏng cả lượt, và người dùng nhận "Lỗi phân tích kết quả AI." dù model đã trả
// nội dung đầy đủ. Prompt truyện nay dài (~9k token đầu vào) nên Flash càng dễ
// thêm chữ ngoài JSON.
//
// Nay: gỡ fence → nếu parse thẳng không được thì CẮT LẤY KHỐI {...} cân bằng
// ngoài cùng rồi parse lại (bỏ mọi thứ trước/sau nó).
function parseJSON(text: string): unknown {
  const t = String(text || '').replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(t);
  } catch {
    /* thử cắt khối {...} bên dưới */
  }
  // Thử TỪNG khối {...} cân bằng, từ trái sang: khối đầu tiên parse được thì
  // lấy. Cố ý không dừng ở khối đầu tiên tìm thấy — model hay chèn ngoặc nhọn
  // trong lời dẫn ("{quan trọng}") và khối rác đó sẽ nuốt mất JSON thật.
  for (let i = t.indexOf('{'); i >= 0; i = t.indexOf('{', i + 1)) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let k = i; k < t.length; k++) {
      const c = t[k];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue; // ngoặc nhọn trong lời thoại không tính
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try {
          return JSON.parse(t.slice(i, k + 1));
        } catch {
          /* khối này không phải JSON ta cần → thử khối kế tiếp */
        }
        break;
      }
    }
  }
  return null;
}

/** Lập lá số + dựng hồ sơ nhân vật — dùng chung cho cả 2 pha. */
type BuiltProfile =
  | { ok: false; error: string }
  | { ok: true; ls: Laso; profile: PastLifeProfile };

function buildProfile(birth: BirthParams, eraId?: string): BuiltProfile {
  const lasoRes = computeLaso(birth);
  if (!lasoRes.ok || !lasoRes.ls) {
    return { ok: false, error: lasoRes.error || 'Không lập được lá số.' };
  }
  const gender = birth.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  // KHÔNG truyền era → computePastLife tự bốc nền văn minh từ chính lá số
  // (deterministic, cùng lá số luôn ra cùng nền). Chỉ khi client ÉP một nền cụ
  // thể mới dùng resolveEra — hiện không trang nào gửi, giữ lại vì pha `image`
  // gọi lại buildProfile sau pha `story` và phải ra ĐÚNG nền đó; nếu sau này
  // muốn cho phép sinh lại ở nền khác thì đường đã sẵn.
  const era = eraId ? resolveEra(eraId) : undefined;
  return { ok: true, ls: lasoRes.ls, profile: computePastLife(lasoRes.ls, gender, era) };
}

// ── Pha 1: truyện ───────────────────────────────────────────────────────
interface StoryAct {
  title?: string;
  text?: string;
}

// Schema ép ở TẦNG API (Gemini responseSchema) — khác hẳn việc dặn shape trong
// prompt: model không còn đường trả thiếu khoá hay kèm câu dẫn ngoài JSON.
// `title`/`text` để required vì thiếu một trong hai là hồi đó rỗng trên màn hình.
const STORY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    biDanh: { type: 'STRING' },
    moTaNhanVat: { type: 'STRING' },
    acts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, text: { type: 'STRING' } },
        required: ['title', 'text'],
      },
    },
    ketLuan: { type: 'STRING' },
  },
  required: ['biDanh', 'moTaNhanVat', 'acts', 'ketLuan'],
  propertyOrdering: ['biDanh', 'moTaNhanVat', 'acts', 'ketLuan'],
};

async function handleStory(birth: BirthParams, eraId?: string) {
  const built = buildProfile(birth, eraId);
  if (!built.ok) return err(built.error, 400);
  const { profile } = built;

  type StoryJson = {
    biDanh?: string;
    moTaNhanVat?: string;
    acts?: StoryAct[];
    ketLuan?: string;
  };
  // Type guard (không phải boolean thuần) để TS narrow được `parsed` sau khi
  // kiểm — nếu không thì mọi chỗ đọc parsed.acts phía dưới đều báo possibly null.
  //
  // CHỈ đòi `acts`: truyện là món hàng chính. moTaNhanVat thiếu thì giấu khối đó
  // đi (client đã xử lý) chứ KHÔNG vứt cả lượt đã trả tiền — trước đây thiếu nó
  // là người dùng mất Lượng mà không nhận được gì.
  const okShape = (v: StoryJson | null): v is StoryJson & { acts: StoryAct[] } =>
    Array.isArray(v?.acts) && v.acts.length > 0;

  const askStory = async (nudge: boolean): Promise<{ raw: string; model: string } | null> => {
    try {
      const llmRes = await llmTextFull({
        system: PAST_LIFE_STORY_SYSTEM_PROMPT,
        prompt:
          buildPastLifeStoryPrompt(profile) +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        // Ép JSON ở tầng API (xem STORY_SCHEMA) — chốt chặn thật, prompt chỉ là
        // lớp nhắc. parseJSON + lượt thử lại bên dưới vẫn giữ làm lưới an toàn
        // cho nhánh backup Anthropic (API không có JSON mode).
        json: true,
        jsonSchema: STORY_SCHEMA,
        // 5 hồi × 100-160 từ tiếng Việt + mô tả nhân vật + lời kết — 2600 quá
        // sát, hết chỗ là JSON cụt và parse hỏng.
        maxTokens: 4200,
      });
      void logLlmUsage('chan-dung-tien-kiep', llmRes.model, {
        input_tokens: llmRes.usage.input_tokens,
        output_tokens: llmRes.usage.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      });
      return { raw: llmRes.text, model: llmRes.model };
    } catch (e) {
      console.error('[chan-dung-tien-kiep] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  let res = await askStory(false);
  if (!res) return err('Lỗi AI khi viết câu chuyện. Vui lòng thử lại.', 500);
  let parsed = parseJSON(res.raw) as StoryJson | null;

  // Parse hỏng → THỬ LẠI MỘT LƯỢT. Trước đây fail là trả lỗi luôn, người dùng
  // mất Lượng mà không có gì. Log kèm độ dài + đầu/đuôi bản thô để lần sau
  // chẩn được ngay là model lạc định dạng hay bị cắt giữa chừng.
  if (!okShape(parsed)) {
    const t = String(res.raw || '');
    console.error(
      `[chan-dung-tien-kiep] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`,
    );
    void logLlmParseFail('chan-dung-tien-kiep', res.model, t, 1);
    res = await askStory(true);
    if (!res) return err('Lỗi AI khi viết câu chuyện. Vui lòng thử lại.', 500);
    parsed = parseJSON(res.raw) as StoryJson | null;
  }
  // biDanh (vế thơ) là phần TRANG TRÍ — thiếu vẫn hiển thị được vì danh xưng
  // chính (chức phận) do engine chốt, không phụ thuộc LLM. Chỉ moTaNhanVat + acts
  // là bắt buộc.
  if (!okShape(parsed)) {
    const t = String(res.raw || '');
    console.error(
      `[chan-dung-tien-kiep] parse hỏng LẦN 2 (len=${t.length}, đầu=${JSON.stringify(t.slice(0, 160))})`,
    );
    void logLlmParseFail('chan-dung-tien-kiep', res.model, t, 2);
    return err('Lỗi phân tích kết quả AI.', 500);
  }

  // Ghép nhãn giai đoạn/vai trò kịch (deterministic, do engine chốt) vào từng
  // hồi LLM viết — client hiển thị nhãn của ENGINE, không dùng nhãn LLM tự
  // nghĩ, để vị trí đỉnh cao/biến cố luôn khớp lá số.
  //
  // CỐ Ý không trả ageFrom/ageTo nữa (engine vẫn có): nhóm hồi cố định trên 9
  // đại vận cho ra CÙNG một dải tuổi ở mọi lá số, hồi cuối luôn 82–95 — hiển
  // thị lên thì lá số nào cũng thành người sống thọ ngoài tám mươi. Bỏ khỏi
  // payload luôn thay vì chỉ ẩn ở client, để không ai vô tình render lại.
  const acts = profile.arc.acts.map((a, i) => ({
    index: a.index,
    stage: a.stage,
    role: a.role,
    title: String(parsed.acts?.[i]?.title || a.stage),
    text: String(parsed.acts?.[i]?.text || ''),
  }));

  return ok({
    success: true,
    // Danh xưng chính = chức phận do BẢNG TRA chốt (Tể tướng / Thái y / Quan
    // án…) — ngắn, cụ thể, người dùng kể lại được. biDanh chỉ là vế phụ hiển
    // thị nhỏ bên dưới (Henry phản hồi: danh xưng dài kiểu mô tả thì đọc xong
    // không nhớ nổi để mà kể cho bạn bè).
    danhXung: profile.occupation.title,
    biDanh: String(parsed.biDanh || ''),
    characterName: profile.characterName,
    moTaNhanVat: String(parsed.moTaNhanVat || ''),
    acts,
    ketLuan: parsed.ketLuan || '',
    occupation: {
      title: profile.occupation.title,
      desc: profile.occupation.desc,
      star: profile.occupation.star,
      brightness: profile.occupation.brightness || '',
      borrowed: profile.occupation.borrowed,
      notes: profile.occupation.notes,
      tier: profile.occupation.tier,
      tierLabel: profile.occupation.tierLabel,
      tierBreakdown: profile.occupation.tierBreakdown,
      source: profile.occupation.source,
    },
    menh: profile.readouts.menh,
    thanCungName: profile.thanCungName,
    portraitAge: profile.arc.portraitAge,
    era: { id: profile.era.id, label: profile.era.label, ageLabel: profile.era.ageLabel },
  });
}

// ── Pha 2: ảnh ──────────────────────────────────────────────────────────
async function handleImage(userId: string, birth: BirthParams, eraId?: string) {
  const built = buildProfile(birth, eraId);
  if (!built.ok) return err(built.error, 400);
  const { ls, profile } = built;

  // Hình thể suy từ cung MỆNH (chính đương số) — cùng thuật toán rank/merge
  // sao mà tool Chân Dung Vợ Chồng dùng cho cung Phu Thê.
  const morph = computeMorphologyForPalace(ls, 'Mệnh');

  let faceDescriptionEn = '';
  try {
    const llmRes = await llmTextFull({
      system: PAST_LIFE_IMAGE_SYSTEM_PROMPT,
      prompt: buildPastLifeImagePrompt(profile, morph),
      json: true,
      jsonSchema: {
        type: 'OBJECT',
        properties: { imagePrompt: { type: 'STRING' } },
        required: ['imagePrompt'],
      },
      maxTokens: 600,
    });
    void logLlmUsage('chan-dung-tien-kiep', llmRes.model, {
      input_tokens: llmRes.usage.input_tokens,
      output_tokens: llmRes.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });
    const parsed = parseJSON(llmRes.text) as { imagePrompt?: string } | null;
    faceDescriptionEn = String(parsed?.imagePrompt || '').trim();
  } catch {
    /* best-effort — thiếu đoạn tả mặt vẫn vẽ được bằng phần khung server ghép */
  }

  const finalPrompt = buildFinalPastLifeImagePrompt(profile, faceDescriptionEn);

  let imageB64: string;
  try {
    const imgRes = await generatePortraitImage({ prompt: finalPrompt, size: '1024x1536' });
    imageB64 = imgRes.b64;
    void logImageUsage('chan-dung-tien-kiep', 'gpt-image-1', imgRes.usage);
  } catch (e) {
    return err('Lỗi sinh ảnh: ' + (e instanceof Error ? e.message : 'không rõ'), 500);
  }

  // Dùng chung bucket 'portraits' với tool Chân Dung Vợ Chồng (thư mục con
  // riêng để không lẫn lịch sử 2 tool).
  const path = `${userId}/past-life/${Date.now()}.png`;
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/portraits/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'image/png',
    },
    body: Buffer.from(imageB64, 'base64'),
  });
  if (!upRes.ok) {
    const t = await upRes.text().catch(() => '');
    return err('Lỗi lưu ảnh: ' + t.slice(0, 200), 500);
  }
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/portraits/${path}`;

  // Lịch sử — best-effort, không chặn response nếu lỗi ghi DB.
  fetch(`${SUPABASE_URL}/rest/v1/past_life_portraits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      gender: profile.gender,
      occupation_title: profile.occupation.title,
      occupation_star: profile.occupation.star,
      portrait_age: profile.arc.portraitAge,
      era: profile.era.id,
      image_url: imageUrl,
    }),
  }).catch(() => {});

  // Vẽ xong → tặng lượt rail miễn phí (V2.2). Người mới tiêu hết quà đăng ký
  // cho đúng lượt vẽ này, mà hỏi nhân vật qua rail mới là chỗ tool bán được —
  // hết sạch Lượng ngay lúc vừa xem xong ảnh là chặn đúng khúc quan trọng nhất.
  void railFreeTurnsPerGen().then((n) => railFreeGrant(userId, n)).catch(() => {});

  return ok({
    success: true,
    imageUrl,
    occupationTitle: profile.occupation.title,
    portraitAge: profile.arc.portraitAge,
    era: { id: profile.era.id, label: profile.era.label, ageLabel: profile.era.ageLabel },
  });
}

// ── History ─────────────────────────────────────────────────────────────
async function handleHistory(request: NextRequest) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/past_life_portraits?user_id=eq.${auth.user.id}` +
      '&select=id,created_at,image_url,occupation_title,occupation_star,portrait_age,era' +
      '&order=created_at.desc&limit=20',
    { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } },
  );
  if (!r.ok) return err('Lỗi tải lịch sử.', 500);
  return ok({ success: true, items: await r.json() });
}

// ── Routes ──────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return options();
}

async function runPost(request: NextRequest) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const body = await parseBody(request);
  const birth = body.birth as BirthParams | undefined;
  if (!birth) return err('Thiếu thông tin ngày sinh.', 400);

  // Chốt chặn thanh toán PHÍA SERVER (S0 track COO). Trước đây route chỉ kiểm
  // "user hợp lệ" rồi chạy luôn, còn việc trừ Lượng nằm hoàn toàn ở client —
  // nên gọi thẳng endpoint này là sinh ảnh + truyện miễn phí không giới hạn.
  // Dùng cùng quy ước slug với paywall nên hai pha story/image chạy song song
  // của CÙNG một lượt mua vẫn qua được.
  const denied = await toolPaymentDenied(
    'chan-dung-tien-kiep',
    auth.user.id,
    String(body.slug || ''),
  );
  if (denied) return err(denied, 402);

  const phase = String(body.phase || 'story');
  const eraId = body.era ? String(body.era) : undefined;
  if (phase === 'story') return handleStory(birth, eraId);
  if (phase === 'image') return handleImage(auth.user.id, birth, eraId);
  return err('phase không hợp lệ (story|image).', 400);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'history';
  if (action === 'history') return handleHistory(request);
  return err('Invalid action', 400);
}

// S1 (track COO) — bọc để tự ghi lượt chạy thành công/hỏng vào `events`.
// Chỉ QUAN SÁT: ngoại lệ vẫn ném lại nguyên vẹn, Response trả về không đổi.
export async function POST(request: NextRequest) {
  return withToolOutcome('chan-dung-tien-kiep', () => runPost(request));
}
