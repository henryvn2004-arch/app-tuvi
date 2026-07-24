// app/api/chan-dung-vo-chong/route.ts
// POST /api/chan-dung-vo-chong           — sinh chân dung vợ/chồng từ lá số
// GET  /api/chan-dung-vo-chong?action=history — lịch sử đã sinh của user

export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { llmText } from '@/lib/llm/complete';
import { computeLaso } from '@/lib/engine/laso';
import { computeSpouseMorphology, formatMorphologyForLLM } from '@/lib/engine/portrait';
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

  // 1 lượt LLM: dịch + đánh bóng morphology đã rank sẵn (deterministic) thành
  // prompt ảnh tiếng Anh + đoạn mô tả tiếng Việt — KHÔNG để LLM tự bịa sao/field,
  // chỉ tổng hợp văn phong từ field đã merge (xem lib/engine/portrait.ts).
  const sys =
    'Bạn là chuyên gia mô tả chân dung (concept artist). Nhận bộ đặc điểm hình thể rời rạc (tiếng Việt) ' +
    'của MỘT người, nhiệm vụ:\n' +
    '1) "imagePrompt": MỘT đoạn tiếng ANH liền mạch (100-140 từ) mô tả khuôn mặt/vóc dáng/khí chất theo ' +
    'giọng "professional concept artist describing a real human face" — bán thực/concept art, KHÔNG nhắc ' +
    'chiêm tinh/tử vi/tên sao/tiếng Việt. Các đặc điểm KHÔNG được mâu thuẫn nhau (vd không vừa nói mặt tròn ' +
    'vừa nói mặt dài) — nếu input có vẻ mâu thuẫn, ưu tiên đặc điểm liệt kê trước.\n' +
    '2) "description": đoạn tiếng VIỆT (120-180 từ), văn xuôi tự nhiên mô tả khuôn mặt, hình dáng, phong thái ' +
    'và tính cách — KHÔNG nhắc tên sao/thuật ngữ tử vi, đọc như lời tả người thật.\n' +
    'CHỈ trả JSON hợp lệ: {"imagePrompt":"...","description":"..."}';

  const userMsg =
    `Giới tính: ${morph.spouseGender === 'nu' ? 'Nữ' : 'Nam'}, độ tuổi khoảng ${morph.spouseAge}.\n` +
    `Đặc điểm:\n${formatMorphologyForLLM(morph)}`;

  let raw: string;
  try {
    raw = await llmText({ system: sys, prompt: userMsg, maxTokens: 900 });
  } catch {
    return err('Lỗi AI mô tả chân dung. Vui lòng thử lại.', 500);
  }
  const parsed = parseJSON(raw) as { imagePrompt?: string; description?: string } | null;
  if (!parsed?.imagePrompt || !parsed?.description) return err('Lỗi phân tích kết quả AI.', 500);

  const genderWord = morph.spouseGender === 'nu' ? 'woman' : 'man';
  const finalPrompt =
    `Semi-realistic digital concept art portrait bust of a Vietnamese ${genderWord} in their ${morph.spouseAge}s, ` +
    `plain neutral studio background, soft even lighting. ${parsed.imagePrompt} ` +
    'Painterly realism, high detail, no text, no watermark, no signature.';

  let imageB64: string;
  try {
    imageB64 = await generatePortraitImage({ prompt: finalPrompt });
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
      spouse_gender: morph.spouseGender,
      spouse_age: morph.spouseAge,
      core_star: morph.coreStar,
      image_url: imageUrl,
      description: parsed.description,
    }),
  }).catch(() => {});

  return ok({
    success: true,
    imageUrl,
    description: parsed.description,
    spouseGender: morph.spouseGender,
    spouseAge: morph.spouseAge,
  });
}

// ── History ───────────────────────────────────────────────────────────
async function handleHistory(request: NextRequest) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/spouse_portraits?user_id=eq.${auth.user.id}&select=id,created_at,image_url,description,spouse_gender,spouse_age&order=created_at.desc&limit=20`,
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
