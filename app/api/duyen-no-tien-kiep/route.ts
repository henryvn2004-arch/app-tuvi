// app/api/duyen-no-tien-kiep/route.ts
// POST /api/duyen-no-tien-kiep                — 2 pha: phase='story' | 'image'
// GET  /api/duyen-no-tien-kiep?action=history — lịch sử đã sinh của user
//
// Tool "Duyên Nợ Tiền Kiếp": HAI lá số → một mối duyên ở kiếp trước (engine
// `lib/engine/past-life-bond.ts`, thuần deterministic, đã verify 950 cặp) + một
// bức tranh có CẢ HAI nhân vật trong cùng khung.
//
// Dựng theo đúng khuôn `app/api/chan-dung-tien-kiep/route.ts` (2 pha song song,
// cache theo lá số, chốt thanh toán phía server) — khác ba chỗ, đều ghi rõ tại
// chỗ: thứ tự hai lá số được CHUẨN HOÁ, ảnh có hai người, và rail bị chặn không
// cho luận sâu về người thứ hai.

export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { toolPaymentDenied } from '@/lib/billing/credits';
import { refundIfSystemFailure } from '@/lib/ops/refund';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage, logImageUsage, logLlmParseFail } from '@/lib/agent/usage';
import { railFreeGrant, railFreeTurnsPerGen } from '@/lib/billing/viral-budget';
import { computeLaso, type Laso } from '@/lib/engine/laso';
import { computePastLifeBond, type PastLifeBond } from '@/lib/engine/past-life-bond';
import { computeMorphologyForPalace } from '@/lib/engine/portrait';
import {
  BOND_ACTS,
  BOND_STORY_SYSTEM_PROMPT,
  buildBondStoryPrompt,
  BOND_IMAGE_SYSTEM_PROMPT,
  buildBondImagePrompt,
  buildFinalBondImagePrompt,
} from '@/lib/agent/past-life-bond-story';
import { generatePortraitImage } from '@/lib/image/openai-image';
import type { BirthParams } from '@/lib/contract/v1';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { normalizeBondPair, type BondPair } from '@/lib/portraits/bond-key';
import {
  putCachedPortrait,
  touchCache,
  insertHistoryRow,
  getCachedPortrait,
  userOwnsLaso,
  type PortraitPhase,
} from '@/lib/portraits/cache';

const TOOL_ID = 'duyen-no-tien-kiep';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// ── Auth (cùng pattern 2 tool chân dung) ────────────────────────────────
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

// Bóc JSON từ câu trả lời LLM — bản y hệt route Chân Dung Tiền Kiếp (đã trả giá
// một lần vì bản giòn: model thêm một câu dẫn là hỏng cả lượt đã tính tiền).
function parseJSON(text: string): unknown {
  const t = String(text || '').replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(t);
  } catch {
    /* thử cắt khối {...} bên dưới */
  }
  for (let i = t.indexOf('{'); i >= 0; i = t.indexOf('{', i + 1)) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let k = i; k < t.length; k++) {
      const c = t[k];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
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

// Thứ tự hai lá số được CHUẨN HOÁ ở `lib/portraits/bond-key.ts` — logic thuần,
// tách khỏi route để test gọi được chính hàm đó (nạp route là nạp cả
// `next/server`). Xem chú thích đầy đủ trong file đó.

type BuiltBond =
  | { ok: false; error: string }
  | { ok: true; lsA: Laso; lsB: Laso; bond: PastLifeBond };

function buildBond(pair: BondPair): BuiltBond {
  const rA = computeLaso(pair.birthA);
  if (!rA.ok || !rA.ls) return { ok: false, error: rA.error || 'Không lập được lá số người thứ nhất.' };
  const rB = computeLaso(pair.birthB);
  if (!rB.ok || !rB.ls) return { ok: false, error: rB.error || 'Không lập được lá số người thứ hai.' };
  const gA = pair.birthA.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  const gB = pair.birthB.gender === 'nu' ? ('nu' as const) : ('nam' as const);
  return { ok: true, lsA: rA.ls, lsB: rB.ls, bond: computePastLifeBond(rA.ls, gA, rB.ls, gB) };
}

/** Phần dữ liệu deterministic trả kèm ở CẢ hai pha — client dựng khung ngay
 *  khi pha nào về trước, không phải đợi đủ hai lượt. */
function bondMeta(bond: PastLifeBond) {
  return {
    bond: {
      kind: bond.type.kind,
      label: bond.type.label,
      gist: bond.type.gist,
      signals: bond.signals,
    },
    nhanVatA: {
      ten: bond.a.characterName,
      danhXung: bond.a.occupation.title,
      gioiTinh: bond.a.gender,
    },
    nhanVatB: {
      ten: bond.b.characterName,
      danhXung: bond.b.occupation.title,
      gioiTinh: bond.b.gender,
    },
    era: { id: bond.era.id, label: bond.era.label, ageLabel: bond.era.ageLabel },
  };
}

// ── Pha 1: truyện ───────────────────────────────────────────────────────
interface StoryAct {
  title?: string;
  text?: string;
}

const STORY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tuaDe: { type: 'STRING' },
    moTaMoiDuyen: { type: 'STRING' },
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
  required: ['tuaDe', 'moTaMoiDuyen', 'acts', 'ketLuan'],
  propertyOrdering: ['tuaDe', 'moTaMoiDuyen', 'acts', 'ketLuan'],
};

async function handleStory(pair: BondPair, userId: string) {
  const built = buildBond(pair);
  if (!built.ok) return err(built.error, 400);
  const { bond } = built;

  type StoryJson = {
    tuaDe?: string;
    moTaMoiDuyen?: string;
    acts?: StoryAct[];
    ketLuan?: string;
  };
  // CHỈ đòi `acts` — truyện là món hàng chính. Thiếu tựa đề hay mô tả thì giấu
  // khối đó đi chứ KHÔNG vứt cả lượt người ta đã trả tiền.
  const okShape = (v: StoryJson | null): v is StoryJson & { acts: StoryAct[] } =>
    Array.isArray(v?.acts) && v.acts.length > 0;

  const askStory = async (nudge: boolean): Promise<{ raw: string; model: string } | null> => {
    try {
      const llmRes = await llmTextFull({
        system: BOND_STORY_SYSTEM_PROMPT,
        prompt:
          buildBondStoryPrompt(bond, pair.nameA, pair.nameB) +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        json: true,
        jsonSchema: STORY_SCHEMA,
        // 4 hồi × 110–170 từ tiếng Việt + mô tả mối duyên + lời kết.
        maxTokens: 4200,
      });
      void logLlmUsage(TOOL_ID, llmRes.model, {
        input_tokens: llmRes.usage.input_tokens,
        output_tokens: llmRes.usage.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      });
      return { raw: llmRes.text, model: llmRes.model };
    } catch (e) {
      console.error('[duyen-no-tien-kiep] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  let res = await askStory(false);
  if (!res) return err('Lỗi AI khi viết câu chuyện. Vui lòng thử lại.', 500);
  let parsed = parseJSON(res.raw) as StoryJson | null;

  if (!okShape(parsed)) {
    const t = String(res.raw || '');
    console.error(
      `[duyen-no-tien-kiep] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`,
    );
    void logLlmParseFail(TOOL_ID, res.model, t, 1);
    res = await askStory(true);
    if (!res) return err('Lỗi AI khi viết câu chuyện. Vui lòng thử lại.', 500);
    parsed = parseJSON(res.raw) as StoryJson | null;
  }
  if (!okShape(parsed)) {
    const t = String(res.raw || '');
    console.error(
      `[duyen-no-tien-kiep] parse hỏng LẦN 2 (len=${t.length}, đầu=${JSON.stringify(t.slice(0, 160))})`,
    );
    void logLlmParseFail(TOOL_ID, res.model, t, 2);
    return err('Lỗi phân tích kết quả AI.', 500);
  }

  // Nhãn hồi lấy của BOND_ACTS (cố định) chứ không dùng nhãn LLM tự nghĩ — mọi
  // bản kết quả có cùng khung thì hai người so bản của nhau được.
  const acts = BOND_ACTS.map((a, i) => ({
    index: i + 1,
    stage: a.stage,
    title: String(parsed.acts?.[i]?.title || a.stage),
    text: String(parsed.acts?.[i]?.text || ''),
  }));

  const payload = {
    success: true,
    ...bondMeta(bond),
    tuaDe: String(parsed.tuaDe || ''),
    moTaMoiDuyen: String(parsed.moTaMoiDuyen || ''),
    acts,
    ketLuan: parsed.ketLuan || '',
  };
  // Pha `story` KHÔNG có dòng lịch sử riêng (chỉ pha `image` ghi) → `row: null`.
  void putCachedPortrait(TOOL_ID, 'story', pair.key, { payload, row: null }, userId);
  return ok(payload);
}

// ── Pha 2: ảnh (MỘT bức, HAI nhân vật) ──────────────────────────────────
async function handleImage(pair: BondPair, userId: string) {
  const built = buildBond(pair);
  if (!built.ok) return err(built.error, 400);
  const { lsA, lsB, bond } = built;

  const morphA = computeMorphologyForPalace(lsA, 'Mệnh');
  const morphB = computeMorphologyForPalace(lsB, 'Mệnh');

  let faceA = '';
  let faceB = '';
  try {
    const llmRes = await llmTextFull({
      system: BOND_IMAGE_SYSTEM_PROMPT,
      prompt: buildBondImagePrompt(bond, morphA, morphB, pair.nameA, pair.nameB),
      json: true,
      jsonSchema: {
        type: 'OBJECT',
        properties: { faceA: { type: 'STRING' }, faceB: { type: 'STRING' } },
        required: ['faceA', 'faceB'],
      },
      maxTokens: 900,
    });
    void logLlmUsage(TOOL_ID, llmRes.model, {
      input_tokens: llmRes.usage.input_tokens,
      output_tokens: llmRes.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });
    const parsed = parseJSON(llmRes.text) as { faceA?: string; faceB?: string } | null;
    faceA = String(parsed?.faceA || '').trim();
    faceB = String(parsed?.faceB || '').trim();
  } catch {
    /* best-effort — thiếu đoạn tả mặt vẫn vẽ được bằng phần khung server ghép */
  }

  const finalPrompt = buildFinalBondImagePrompt(bond, faceA, faceB);

  let imageB64: string;
  let imgModel = '';
  try {
    // Khổ NGANG (1536x1024) — khác hai tool chân dung một người (dọc 1024x1536).
    // Hai nhân vật đứng cạnh nhau cần bề ngang; ép vào khung dọc thì model hoặc
    // chồng hai người lên nhau, hoặc cắt mất một người.
    const imgRes = await generatePortraitImage({ prompt: finalPrompt, size: '1536x1024' });
    imageB64 = imgRes.b64;
    imgModel = imgRes.model;
    void logImageUsage(TOOL_ID, imgRes.model, imgRes.usage);
  } catch (e) {
    return err('Lỗi sinh ảnh: ' + (e instanceof Error ? e.message : 'không rõ'), 500);
  }
  void imgModel;

  // Dùng chung bucket 'portraits', thư mục con riêng để không lẫn lịch sử.
  const path = `${userId}/bond/${Date.now()}.png`;
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

  const historyRow = {
    bond_kind: bond.type.kind,
    bond_label: bond.type.label,
    character_a: bond.a.characterName,
    character_b: bond.b.characterName,
    occupation_a: bond.a.occupation.title,
    occupation_b: bond.b.occupation.title,
    era: bond.era.id,
    image_url: imageUrl,
  };
  insertHistoryRow(TOOL_ID, { ...historyRow, user_id: userId, laso_key: pair.key });

  void railFreeTurnsPerGen().then((n) => railFreeGrant(userId, n)).catch(() => {});

  const payload = { success: true, imageUrl, ...bondMeta(bond) };
  void putCachedPortrait(TOOL_ID, 'image', pair.key, { payload, row: historyRow }, userId);
  return ok(payload);
}

// ── History ─────────────────────────────────────────────────────────────
async function handleHistory(request: NextRequest) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/past_life_bonds?user_id=eq.${auth.user.id}` +
      '&select=id,created_at,image_url,bond_kind,bond_label,character_a,character_b,occupation_a,occupation_b,era' +
      '&order=created_at.desc&limit=20',
    { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } },
  );
  if (!r.ok) return err('Lỗi tải lịch sử.', 500);
  return ok({ success: true, items: await r.json() });
}

// ── Cache status ────────────────────────────────────────────────────────
// Đường miễn phí chỉ mở khi CẢ HAI pha có sẵn trong cache VÀ user đã từng trả
// cho đúng cặp lá số này. Thiếu một pha thì pha đó vẫn phải gen thật (tốn tiền
// model) nên vẫn tính tiền như thường.
function pairFromQuery(sp: URLSearchParams): BondPair {
  const n = (k: string) => Number(sp.get(k) || 0);
  const one = (p: string): BirthParams => ({
    day: n(p + 'd'),
    month: n(p + 'm'),
    year: n(p + 'y'),
    hourBranch: n(p + 'h'),
    isLunar: sp.get(p + 'l') === '1',
    gender: sp.get(p + 'g') === 'nu' ? 'nu' : 'nam',
  });
  return normalizeBondPair(one('a'), '', one('b'), '');
}

async function handleCacheStatus(request: NextRequest, sp: URLSearchParams) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const { key } = pairFromQuery(sp);
  const [story, image, owns] = await Promise.all([
    getCachedPortrait(TOOL_ID, 'story', key),
    getCachedPortrait(TOOL_ID, 'image', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  const cached = Boolean(story) && Boolean(image);
  return ok({ success: true, cached, free: cached && owns });
}

// ── Routes ──────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return options();
}

function validBirth(b: unknown): b is BirthParams {
  const x = b as BirthParams | undefined;
  return Boolean(x && Number(x.year) > 0 && Number(x.month) > 0 && Number(x.day) > 0);
}

async function runPost(request: NextRequest) {
  const auth = await authUser(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const body = await parseBody(request);
  const b1 = body.birthA as BirthParams | undefined;
  const b2 = body.birthB as BirthParams | undefined;
  if (!validBirth(b1)) return err('Thiếu thông tin ngày sinh của người thứ nhất.', 400);
  if (!validBirth(b2)) return err('Thiếu thông tin ngày sinh của người thứ hai.', 400);

  const phase = String(body.phase || 'story') as PortraitPhase;
  if (phase !== 'story' && phase !== 'image') return err('phase không hợp lệ (story|image).', 400);

  const pair = normalizeBondPair(b1, String(body.nameA || ''), b2, String(body.nameB || ''));

  // Tra cache RIÊNG từng pha — hai pha chạy song song, lượt gốc có thể hỏng
  // giữa chừng và chỉ một pha kịp vào cache; coi cả hai là một khối thì nửa còn
  // thiếu được phát miễn phí.
  const [cached, owns] = await Promise.all([
    getCachedPortrait(TOOL_ID, phase, pair.key),
    userOwnsLaso(TOOL_ID, auth.user.id, pair.key),
  ]);
  const free = Boolean(cached) && owns;

  if (!free) {
    // Chốt chặn thanh toán PHÍA SERVER — không có bước này thì gọi thẳng
    // endpoint là sinh ảnh + truyện miễn phí không giới hạn.
    const denied = await toolPaymentDenied(TOOL_ID, auth.user.id, String(body.slug || ''));
    if (denied) return err(denied, 402);
  }

  if (cached) {
    touchCache(TOOL_ID, phase, pair.key);
    if (phase === 'image' && !owns && cached.row) {
      insertHistoryRow(TOOL_ID, { ...cached.row, user_id: auth.user.id, laso_key: pair.key });
      void railFreeTurnsPerGen().then((n) => railFreeGrant(auth.user.id, n)).catch(() => {});
    }
    return ok({ ...cached.payload, cached: true, freeRerun: free });
  }

  const res =
    phase === 'story' ? await handleStory(pair, auth.user.id) : await handleImage(pair, auth.user.id);
  return refundIfSystemFailure(res, {
    toolId: TOOL_ID,
    userId: auth.user.id,
    slug: String(body.slug || ''),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'history';
  if (action === 'history') return handleHistory(request);
  if (action === 'cache-status') return handleCacheStatus(request, searchParams);
  return err('Invalid action', 400);
}

export async function POST(request: NextRequest) {
  return withToolOutcome(TOOL_ID, () => runPost(request));
}
