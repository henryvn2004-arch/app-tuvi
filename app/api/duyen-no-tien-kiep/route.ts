// app/api/duyen-no-tien-kiep/route.ts
// POST /api/duyen-no-tien-kiep                — 2 pha: phase='story' | 'image'
// GET  /api/duyen-no-tien-kiep?action=history — lịch sử đã sinh của user
//
// Tool "Duyên Nợ Tiền Kiếp": 2–5 lá số → mối duyên ở kiếp trước (engine
// `lib/engine/past-life-bond.ts`, thuần deterministic) + một bức tranh có TẤT CẢ
// nhân vật trong cùng khung. Mặc định 2 người; thêm người là tuỳ chọn.
//
// 🔑 ĐƯỜNG 2 NGƯỜI PHẢI KHÔNG ĐỔI. Đó là đường đang bán và là phần lớn lượt
// dùng, nên n === 2 vẫn đi qua đúng các hàm dựng prompt cũ và ra prompt trùng
// khít từng byte (có test A/B với bản trên main). Nhóm ≥3 rẽ nhánh riêng.
//
// Dựng theo đúng khuôn `app/api/chan-dung-tien-kiep/route.ts` (2 pha song song,
// cache theo lá số, chốt thanh toán phía server) — khác ba chỗ, đều ghi rõ tại
// chỗ: thứ tự các lá số được CHUẨN HOÁ, ảnh có nhiều người, và rail bị chặn
// không cho luận sâu về những người còn lại.

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
import { computeGroupBond, groupPairAsBond, type GroupBond } from '@/lib/engine/past-life-bond';
import { computeMorphologyForPalace } from '@/lib/engine/portrait';
import {
  BOND_ACTS,
  MAX_BOND_MEMBERS,
  bondStorySystemPrompt,
  buildBondStoryPrompt,
  buildGroupStoryPrompt,
  bondImageSystemPrompt,
  buildBondImagePrompt,
  buildGroupImagePrompt,
  buildFinalBondImagePrompt,
  buildFinalGroupImagePrompt,
} from '@/lib/agent/past-life-bond-story';
import { generatePortraitImage } from '@/lib/image/openai-image';
import type { BirthParams } from '@/lib/contract/v1';
import { authUserFromRequest, parseLlmJson } from '@/lib/api/tool-helpers';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { normalizeBondGroup, type BondGroup } from '@/lib/portraits/bond-key';
import {
  cacheFor,
  insertHistoryRow,
  userOwnsLaso,
  type PortraitPhase,
} from '@/lib/portraits/cache';



const TOOL_ID = 'duyen-no-tien-kiep';

/**
 * 🔴 PHIÊN BẢN CẤU TRÚC payload. BUMP mỗi khi thêm/đổi/bớt khoá mà TRANG cần để
 * dựng đủ màn hình. Đổi CHỮ thì không bump (dòng cache cũ trả chữ cũ — khó
 * chịu, không vỡ); đổi KHOÁ mà quên bump thì trang ẩn khối IM LẶNG.
 *
 * Mở màn ở 1: payload hiện tại CHÍNH LÀ phiên bản 1, và dòng cache ghi trước
 * lượt cắm cơ chế (không có `_shape`) được đọc là 1 nên KHÔNG bị dựng lại oan.
 *
 * ⚠️ Cố ý KHÔNG nhét vào `lasoKey`: đổi khoá là mồ côi cả cache LẪN
 * `userOwnsLaso` ⇒ người đã trả tiền bị tính lại.
 */
const SHAPE = 1;

/** Vân tay CẤU TRÚC — `npm run check:cacheshape` canh khớp với `SHAPE` ở trên. */
const SHAPE_FINGERPRINT = '7e1e42a5757a';

/** Cửa DUY NHẤT vào cache của tool này; `shape` khai một lần tại đây. */
const CACHE = cacheFor(TOOL_ID, SHAPE);

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// Thứ tự các lá số được CHUẨN HOÁ ở `lib/portraits/bond-key.ts` — logic thuần,
// tách khỏi route để test gọi được chính hàm đó (nạp route là nạp cả
// `next/server`). Xem chú thích đầy đủ trong file đó.

type BuiltBond =
  | { ok: false; error: string }
  | { ok: true; lasos: Laso[]; group: GroupBond };

function buildBond(grp: BondGroup): BuiltBond {
  const lasos: Laso[] = [];
  for (let i = 0; i < grp.members.length; i++) {
    const r = computeLaso(grp.members[i].birth);
    if (!r.ok || !r.ls) return { ok: false, error: r.error || `Không lập được lá số người thứ ${i + 1}.` };
    lasos.push(r.ls);
  }
  const group = computeGroupBond(
    grp.members.map((m, i) => ({
      ls: lasos[i],
      gender: m.birth.gender === 'nu' ? ('nu' as const) : ('nam' as const),
    })),
  );
  return { ok: true, lasos, group };
}

/**
 * Lá số nào đẻ ra nhân vật nào — client cần để nói THẲNG cho người đọc.
 *
 * 🔑 Không suy được từ thứ tự nhập: `normalizeBondPair` sắp lại hai lá số nên
 * `nhanVatA` là người nhập thứ hai ở khoảng một nửa số lượt. Trang chỉ bày hai
 * thẻ nhân vật cạnh nhau thì người đọc mặc định thẻ đầu là mình — và sai một
 * nửa số lần.
 *
 * ⚠️ CỐ Ý KHÔNG kèm TÊN người nhập: payload này nằm trong `portrait_cache`
 * DÙNG CHUNG toàn hệ thống, tên của người chạy trước sẽ hiện ra cho người chạy
 * sau. Ngày sinh thì không rò gì — muốn chạm tới dòng cache đó phải tự nhập
 * đúng cả hai lá số, tức đã có sẵn thông tin này trong tay.
 */
function birthRef(b: BirthParams) {
  return {
    day: Number(b.day),
    month: Number(b.month),
    year: Number(b.year),
    hourBranch: Number(b.hourBranch ?? -1),
    isLunar: Boolean(b.isLunar),
    gender: b.gender === 'nu' ? 'nu' : 'nam',
  };
}

/**
 * Gắn `laSo` vào từng nhân vật của một payload.
 *
 * Dùng cho CẢ payload vừa dựng LẪN payload lấy từ cache: dòng cache ghi trước
 * bản này không có trường đó, mà `grp` đã chuẩn hoá nên lá số thứ i luôn là
 * nhân vật thứ i — gắn lại ở đây là bản cũ cũng có mapping, không phải chờ hết
 * hạn cache.
 */
function withLaso(payload: Record<string, unknown>, grp: BondGroup): Record<string, unknown> {
  const one = (nv: unknown, b: BirthParams | undefined) =>
    nv && typeof nv === 'object' && b
      ? { ...(nv as Record<string, unknown>), laSo: birthRef(b) }
      : nv;
  const out: Record<string, unknown> = { ...payload };
  if (Array.isArray(payload.nhanVats)) {
    out.nhanVats = (payload.nhanVats as unknown[]).map((nv, i) => one(nv, grp.members[i]?.birth));
  }
  // Hai trường cũ vẫn được gắn: dòng cache sinh TRƯỚC bản nhóm chỉ có chúng.
  out.nhanVatA = one(payload.nhanVatA, grp.members[0]?.birth);
  out.nhanVatB = one(payload.nhanVatB, grp.members[1]?.birth);
  return out;
}

/** Phần dữ liệu deterministic trả kèm ở CẢ hai pha — client dựng khung ngay
 *  khi pha nào về trước, không phải đợi đủ hai lượt.
 *
 *  `bond` là mối duyên TRUNG TÂM (cặp trục). Với nhóm 2 người thì đó là cặp duy
 *  nhất, nên payload của tool cũ không đổi nghĩa. `nhanVatA`/`nhanVatB` giữ lại
 *  cho bản client cũ còn trong cache trình duyệt; bản mới đọc `nhanVats`. */
function bondMeta(group: GroupBond) {
  const sp = group.spine;
  const nv = (i: number) => ({
    ten: group.profiles[i].characterName,
    danhXung: group.profiles[i].occupation.title,
    gioiTinh: group.profiles[i].gender,
  });
  return {
    bond: {
      kind: sp.type.kind,
      label: sp.type.label,
      gist: sp.type.gist,
      signals: sp.signals,
      // Hai người của mối duyên trung tâm — client cần để nói "giữa X và Y".
      a: sp.i,
      b: sp.j,
    },
    nhanVats: group.profiles.map((_, i) => nv(i)),
    // Lưới đủ N(N−1)/2 cặp cho khối "cơ sở". Deterministic, 0 lượt LLM.
    capDuyen: group.pairs.map((p) => ({
      a: p.i,
      b: p.j,
      kind: p.type.kind,
      label: p.type.label,
      gist: p.type.gist,
      signals: p.signals,
      truc: p === sp,
    })),
    nhanVatA: nv(0),
    nhanVatB: group.profiles.length > 1 ? nv(1) : undefined,
    era: { id: group.era.id, label: group.era.label, ageLabel: group.era.ageLabel },
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

async function handleStory(grp: BondGroup, userId: string) {
  const built = buildBond(grp);
  if (!built.ok) return err(built.error, 400);
  const { group } = built;
  const n = group.profiles.length;
  const names = grp.members.map((m) => m.name);
  // n === 2 đi ĐÚNG đường cũ (prompt trùng khít từng byte, có test canh) — đó
  // là đường đang bán và là phần lớn lượt dùng, không để tính năng nhóm chạm vào.
  const storyPrompt = () =>
    n === 2
      ? buildBondStoryPrompt(groupPairAsBond(group, group.spine), names[0], names[1])
      : buildGroupStoryPrompt(group, names);

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
        system: bondStorySystemPrompt(n),
        prompt:
          storyPrompt() +
          (nudge
            ? '\n\nLƯU Ý: lượt trước bạn trả về không đúng định dạng. Lần này CHỈ trả về đúng một object JSON hợp lệ, bắt đầu bằng { và kết thúc bằng }, KHÔNG kèm bất kỳ chữ nào ngoài JSON.'
            : ''),
        json: true,
        jsonSchema: STORY_SCHEMA,
        // 4 hồi × 110–170 từ tiếng Việt + mô tả mối duyên + lời kết. Nhóm
        // đông thì mỗi hồi dài hơn và có thêm khối mô tả — nới theo số người.
        // Cả hai số hạng nâng 50% cùng đợt (Henry chốt 2026-08-20).
        maxTokens: 6300 + (n - 2) * 1350,
      });
      void logLlmUsage(TOOL_ID, llmRes.model, {
        input_tokens: llmRes.usage.input_tokens,
        output_tokens: llmRes.usage.output_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }, llmRes.durationMs);
      return { raw: llmRes.text, model: llmRes.model };
    } catch (e) {
      console.error('[duyen-no-tien-kiep] LLM lỗi:', (e as Error)?.message);
      return null;
    }
  };

  let res = await askStory(false);
  if (!res) return err('Lỗi AI khi viết câu chuyện. Vui lòng thử lại.', 500);
  let parsed = parseLlmJson(res.raw) as StoryJson | null;

  if (!okShape(parsed)) {
    const t = String(res.raw || '');
    console.error(
      `[duyen-no-tien-kiep] parse hỏng (len=${t.length}, đuôi=${JSON.stringify(t.slice(-60))}) — thử lại`,
    );
    void logLlmParseFail(TOOL_ID, res.model, t, 1);
    res = await askStory(true);
    if (!res) return err('Lỗi AI khi viết câu chuyện. Vui lòng thử lại.', 500);
    parsed = parseLlmJson(res.raw) as StoryJson | null;
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

  const payload = withLaso(
    {
      success: true,
      ...bondMeta(group),
      tuaDe: String(parsed.tuaDe || ''),
      moTaMoiDuyen: String(parsed.moTaMoiDuyen || ''),
      acts,
      ketLuan: parsed.ketLuan || '',
    },
    grp,
  );
  // Pha `story` KHÔNG có dòng lịch sử riêng (chỉ pha `image` ghi) → `row: null`.
  CACHE.put('story', grp.key, { payload, row: null }, userId);
  return ok(payload);
}

// ── Pha 2: ảnh (MỘT bức, TẤT CẢ nhân vật) ───────────────────────────────
async function handleImage(grp: BondGroup, userId: string) {
  const built = buildBond(grp);
  if (!built.ok) return err(built.error, 400);
  const { lasos, group } = built;
  const n = group.profiles.length;
  const names = grp.members.map((m) => m.name);

  const morphs = lasos.map((ls) => computeMorphologyForPalace(ls, 'Mệnh'));

  // n === 2 giữ NGUYÊN đường cũ (schema faceA/faceB, prompt trùng khít). Nhóm
  // đông dùng mảng `faces` — chỉ số phải khớp thứ tự nhân vật, nếu không thì
  // gương mặt của người này ghép vào người kia.
  let faces: string[] = [];
  try {
    const llmRes = await llmTextFull({
      system: bondImageSystemPrompt(n),
      prompt:
        n === 2
          ? buildBondImagePrompt(
              groupPairAsBond(group, group.spine),
              morphs[0],
              morphs[1],
              names[0],
              names[1],
            )
          : buildGroupImagePrompt(group, morphs, names),
      json: true,
      jsonSchema:
        n === 2
          ? {
              type: 'OBJECT',
              properties: { faceA: { type: 'STRING' }, faceB: { type: 'STRING' } },
              required: ['faceA', 'faceB'],
            }
          : {
              type: 'OBJECT',
              properties: { faces: { type: 'ARRAY', items: { type: 'STRING' } } },
              required: ['faces'],
            },
      maxTokens: 1350 + (n - 2) * 630, // nâng 50% cùng đợt (Henry chốt 2026-08-20)
    });
    void logLlmUsage(TOOL_ID, llmRes.model, {
      input_tokens: llmRes.usage.input_tokens,
      output_tokens: llmRes.usage.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }, llmRes.durationMs);
    const parsed = parseLlmJson(llmRes.text) as
      | { faceA?: string; faceB?: string; faces?: unknown[] }
      | null;
    faces =
      n === 2
        ? [String(parsed?.faceA || '').trim(), String(parsed?.faceB || '').trim()]
        : (Array.isArray(parsed?.faces) ? parsed.faces : []).map((x) => String(x || '').trim());
  } catch {
    /* best-effort — thiếu đoạn tả mặt vẫn vẽ được bằng phần khung server ghép */
  }
  // Model trả thiếu/thừa phần tử thì phần thiếu để rỗng chứ KHÔNG dồn lên: dồn
  // là gán mặt người này cho người khác, sai còn tệ hơn thiếu.
  while (faces.length < n) faces.push('');

  const finalPrompt =
    n === 2
      ? buildFinalBondImagePrompt(groupPairAsBond(group, group.spine), faces[0], faces[1])
      : buildFinalGroupImagePrompt(group, faces);

  let imageB64: string;
  let imgModel = '';
  try {
    // Khổ NGANG (1536x1024) — khác hai tool chân dung một người (dọc 1024x1536).
    // Hai nhân vật đứng cạnh nhau cần bề ngang; ép vào khung dọc thì model hoặc
    // chồng hai người lên nhau, hoặc cắt mất một người.
    const imgRes = await generatePortraitImage({ prompt: finalPrompt, size: '1536x1024' });
    imageB64 = imgRes.b64;
    imgModel = imgRes.model;
    void logImageUsage(TOOL_ID, imgRes.model, imgRes.usage, imgRes.durationMs);
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

  // Bảng lịch sử chỉ có chỗ cho HAI nhân vật — CỐ Ý không mở cột: nhóm ghi cặp
  // TRỤC, tức đúng mối duyên định nghĩa lượt đó. Thêm cột cho tới 5 người là một
  // migration + việc tay cho Henry, đổi lấy vài chữ trên dải ảnh nhỏ ở cuối trang.
  const sp = group.spine;
  const historyRow = {
    bond_kind: sp.type.kind,
    bond_label: sp.type.label,
    character_a: group.profiles[sp.i].characterName,
    character_b: group.profiles[sp.j].characterName,
    occupation_a: group.profiles[sp.i].occupation.title,
    occupation_b: group.profiles[sp.j].occupation.title,
    era: group.era.id,
    image_url: imageUrl,
  };
  insertHistoryRow(TOOL_ID, { ...historyRow, user_id: userId, laso_key: grp.key });

  void railFreeTurnsPerGen().then((k) => railFreeGrant(userId, k)).catch(() => {});

  const payload = withLaso({ success: true, imageUrl, ...bondMeta(group) }, grp);
  CACHE.put('image', grp.key, { payload, row: historyRow }, userId);
  return ok(payload);
}

// ── History ─────────────────────────────────────────────────────────────
async function handleHistory(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/past_life_bonds?user_id=eq.${auth.user.id}` +
      '&select=id,created_at,image_url,bond_kind,bond_label,character_a,character_b,occupation_a,occupation_b,era' +
      '&order=created_at.desc&limit=20',
    { cache: 'no-store', headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } },
  );
  if (!r.ok) return err('Lỗi tải lịch sử.', 500);
  return ok({ success: true, items: await r.json() });
}

// ── Cache status ────────────────────────────────────────────────────────
// Đường miễn phí chỉ mở khi CẢ HAI pha có sẵn trong cache VÀ user đã từng trả
// cho đúng cặp lá số này. Thiếu một pha thì pha đó vẫn phải gen thật (tốn tiền
// model) nên vẫn tính tiền như thường.
// Tiền tố lá số trên query: a, b, c, d, e (tối đa MAX_BOND_MEMBERS).
const Q_PREFIX = ['a', 'b', 'c', 'd', 'e'];

function pairFromQuery(sp: URLSearchParams): BondGroup {
  const n = (k: string) => Number(sp.get(k) || 0);
  const one = (p: string): BirthParams => ({
    day: n(p + 'd'),
    month: n(p + 'm'),
    year: n(p + 'y'),
    hourBranch: n(p + 'h'),
    isLunar: sp.get(p + 'l') === '1',
    gender: sp.get(p + 'g') === 'nu' ? 'nu' : 'nam',
  });
  // Chỉ nhận những lá số THẬT SỰ có trên query — bản client cũ chỉ gửi a/b.
  const list = Q_PREFIX.filter((p) => n(p + 'y') > 0).map((p) => ({ birth: one(p), name: '' }));
  return normalizeBondGroup(list.length >= 2 ? list : [one('a'), one('b')].map((b) => ({ birth: b, name: '' })));
}

async function handleCacheStatus(request: NextRequest, sp: URLSearchParams) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const { key } = pairFromQuery(sp);
  const [story, image, owns] = await Promise.all([
    CACHE.get('story', key),
    CACHE.get('image', key),
    userOwnsLaso(TOOL_ID, auth.user.id, key),
  ]);
  // ⚠️ `story`/`image` là OBJECT `{cached, stale}` — đọc thẳng chúng như boolean
  // thì lúc nào cũng "có cache" và client bỏ luôn bước trả tiền.
  const cached = Boolean(story.cached) && Boolean(image.cached);
  const coDong = (story.cached || story.stale) && (image.cached || image.stale);
  return ok({ success: true, cached, free: Boolean(coDong) && owns });
}

// ── Routes ──────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return options();
}

function validBirth(b: unknown): b is BirthParams {
  const x = b as BirthParams | undefined;
  return Boolean(x && Number(x.year) > 0 && Number(x.month) > 0 && Number(x.day) > 0);
}

/**
 * Lượt TÍNH THỬ — chạy `buildBond()` (thuần deterministic, `lib/engine/
 * past-life-bond.ts`) rồi dừng. Cùng khuôn `runPreview` của
 * app/api/chan-dung-vo-chong/route.ts: KHÔNG `toolPaymentDenied`, KHÔNG
 * `llmTextFull`/`generatePortraitImage`, KHÔNG đòi đăng nhập.
 *
 * Chỉ trả `bond.kind/label/gist` (mối duyên TRUNG TÂM) + tên hai nhân vật đó
 * để viết được câu "giữa X và Y" — KHÔNG trả `capDuyen` (lưới đủ N(N−1)/2 cặp)
 * hay `era`: đó là nguyên liệu của khối "Cơ Sở Trong Lá Số" đang bán.
 */
async function runPreview(request: NextRequest) {
  const body = await parseBody(request);
  const rawBirths: unknown[] = Array.isArray(body.births)
    ? (body.births as unknown[])
    : [body.birthA, body.birthB];
  const rawNames: unknown[] = Array.isArray(body.names)
    ? (body.names as unknown[])
    : [body.nameA, body.nameB];
  if (rawBirths.length < 2) return err('Cần ít nhất hai lá số.', 400);
  if (rawBirths.length > MAX_BOND_MEMBERS)
    return err(`Tối đa ${MAX_BOND_MEMBERS} lá số một lượt.`, 400);
  for (let i = 0; i < rawBirths.length; i++) {
    if (!validBirth(rawBirths[i])) return err(`Thiếu thông tin ngày sinh của người thứ ${i + 1}.`, 400);
  }

  const grp = normalizeBondGroup(
    rawBirths.map((b, i) => ({ birth: b as BirthParams, name: String(rawNames[i] || '') })),
  );
  const built = buildBond(grp);
  if (!built.ok) return err(built.error, 400);

  const meta = bondMeta(built.group);
  return ok({
    success: true,
    preview: true,
    bond: meta.bond,
    nhanVats: meta.nhanVats,
  });
}

async function runPost(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);

  const body = await parseBody(request);
  // Bản mới gửi `births` + `names` (2–5 người); bản cũ gửi birthA/birthB. Giữ cả
  // hai: trang cũ còn trong cache trình duyệt vẫn phải chạy sau khi deploy.
  const rawBirths: unknown[] = Array.isArray(body.births)
    ? (body.births as unknown[])
    : [body.birthA, body.birthB];
  const rawNames: unknown[] = Array.isArray(body.names)
    ? (body.names as unknown[])
    : [body.nameA, body.nameB];
  if (rawBirths.length < 2) return err('Cần ít nhất hai lá số.', 400);
  if (rawBirths.length > MAX_BOND_MEMBERS)
    return err(`Tối đa ${MAX_BOND_MEMBERS} lá số một lượt.`, 400);
  for (let i = 0; i < rawBirths.length; i++) {
    if (!validBirth(rawBirths[i])) return err(`Thiếu thông tin ngày sinh của người thứ ${i + 1}.`, 400);
  }

  const phase = String(body.phase || 'story') as PortraitPhase;
  if (phase !== 'story' && phase !== 'image') return err('phase không hợp lệ (story|image).', 400);

  const pair = normalizeBondGroup(
    rawBirths.map((b, i) => ({ birth: b as BirthParams, name: String(rawNames[i] || '') })),
  );

  // Tra cache RIÊNG từng pha — hai pha chạy song song, lượt gốc có thể hỏng
  // giữa chừng và chỉ một pha kịp vào cache; coi cả hai là một khối thì nửa còn
  // thiếu được phát miễn phí.
  const [{ cached, stale }, owns] = await Promise.all([
    CACHE.get(phase, pair.key),
    userOwnsLaso(TOOL_ID, auth.user.id, pair.key),
  ]);
  // `free` xét cả dòng CŨ: đã trả tiền cho đúng cặp lá số đó rồi. `cached` thì
  // `CACHE.get` đã lọc — dòng cũ không bao giờ được phục vụ.
  const free = Boolean(cached || stale) && owns;

  if (!free) {
    // Chốt chặn thanh toán PHÍA SERVER — không có bước này thì gọi thẳng
    // endpoint là sinh ảnh + truyện miễn phí không giới hạn.
    const denied = await toolPaymentDenied(TOOL_ID, auth.user.id, String(body.slug || ''));
    if (denied) return err(denied, 402);
  }

  if (cached) {
    CACHE.touch(phase, pair.key);
    if (phase === 'image' && !owns && cached.row) {
      insertHistoryRow(TOOL_ID, { ...cached.row, user_id: auth.user.id, laso_key: pair.key });
      void railFreeTurnsPerGen().then((n) => railFreeGrant(auth.user.id, n)).catch(() => {});
    }
    return ok({ ...withLaso(cached.payload, pair), cached: true, freeRerun: free });
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
  const url = new URL(request.url);
  if (url.searchParams.get('preview') === '1') return runPreview(request);
  return withToolOutcome(TOOL_ID, () => runPost(request));
}
