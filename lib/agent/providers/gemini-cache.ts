// lib/agent/providers/gemini-cache.ts
// ============================================================
// CACHE TƯỜNG MINH (`cachedContents`) cho Gemini — vá lỗ hổng Sprint 0 phát
// hiện: rail chat route qua Gemini tốn TB 219k token/lượt (so với 4,9k bên
// Anthropic nhờ `cache_control ttl:1h` đã có sẵn — xem `run.ts:981`) vì
// KHÔNG hề tạo cache tường minh, chỉ trông chờ cache ngầm của Google (đo hit-
// rate thật ~7%, xem docs/nhat-ky/2026-09.md). CỐ Ý CHỈ cache `system` (giống
// hệt phạm vi cache bên Anthropic — `convo` KHÔNG cache ở cả hai phía).
//
// 🔴 SỰ THẬT ĐÃ TRA (KHÔNG đoán — ai.google.dev/cloud.google.com bị egress
// proxy chặn trong môi trường build, tra qua raw.githubusercontent.com của
// chính Google):
//   · Trần tối thiểu 2.048 token để tạo cache (mọi model).
//   · TTL mặc định 60 phút nếu không set.
//   · JSON wire format camelCase: `systemInstruction`/`ttl`/`model` lúc TẠO,
//     field `cachedContent` (string = tên resource) lúc THAM CHIẾU lại.
//   · Giảm giá cache-hit 90% (trả 10% giá input) — khớp công thức đã có sẵn
//     trong usage.ts (`cache_read_input_tokens * p.input * 0.1`), không cần
//     sửa gì ở đó.
//
// 🪤 CHƯA VERIFY được bằng lượt gọi thật: container build KHÔNG có
// GEMINI_API_KEY (cùng giới hạn với ANTHROPIC_API_KEY đã ghi trong CLAUDE.md)
// nên module này CHƯA từng chạm API thật. Toàn bộ hàm ở đây vì vậy PHẢI
// fail-soft tuyệt đối (không throw ra ngoài) — sai lệch trong hình dạng
// request chỉ làm MẤT tối ưu (rơi về gửi system đầy đủ như cũ), KHÔNG được
// phép làm hỏng lượt chat. Việc đầu tiên sau khi merge: đọc log
// `[gemini-cache]` trên prod xem có lỗi 400 lặp lại không (sai hình dạng)
// hay cache thật sự được tạo + tái dùng.
//
// 🔁 2026-09-22 — thêm nhánh CACHE-KÈM-TOOLS cho đường function-calling
// ('laso'). Google cấm `cachedContent` đi cùng `tools` trong CÙNG request,
// nhưng CHO PHÉP bake `tools` vào NGAY LÚC TẠO cache — nên với các vòng có
// tools (mọi vòng trừ vòng `forceAnswer` cuối), ta tạo cache MANG SẴN cả
// `systemInstruction` lẫn `tools`, rồi mọi request sau chỉ gửi `cachedContent`
// + `contents` (không set lại system/tools/tool_config — đúng ràng buộc).
// Vòng `forceAnswer` (hiếm — chỉ khi chạm trần `max_rounds`, cơ chế chống lặp
// tool vô hạn) CỐ Ý KHÔNG dùng cache này: nó cần tools=null để ép trả lời,
// mà cache đã bake tools thì không cách nào "tắt" lại — vòng đó tiếp tục gửi
// `system_instruction` trực tiếp, KHÔNG cache, y hệt hành vi trước đây (chi
// phí một vòng hiếm không đáng để dựng cache thứ hai).
// `tools` là tham số OPTIONAL trong `getOrCreateGeminiCache`/`createCache` —
// bỏ trống (đường prose, `streamGemini`) giữ NGUYÊN hash cũ 100%, không mồ
// côi cache đã tạo trước bản này.
// ============================================================

import { createHash } from 'crypto';
import { logGeminiCacheStorage } from '@/lib/agent/usage';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const CACHE_URL = 'https://generativelanguage.googleapis.com/v1beta/cachedContents';
// Khớp `ttl:'1h'` bên Anthropic (run.ts:981). MỘT nguồn — `createCache` lẫn
// `logGeminiCacheStorage` (ước lượng cost lưu trữ) đều đọc từ đây, không gõ
// tay '3600s'/3600 hai chỗ khác nhau (đúng bẫy CLAUDE.md cảnh báo — hai số
// phải đồng bộ tay mà không ai nhắc thì trôi).
const CACHE_TTL_SECONDS = 3600;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

function ready(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY && GEMINI_KEY);
}

// Trần 2.048 token thật (đã tra) — nhưng ta không đếm token, chỉ có ký tự.
// Tiếng Việt có dấu tổ hợp thường NẶNG hơn 1 token/ký tự ở biên an toàn, lấy
// mốc THẤP (2,5 ký tự/token — bảo thủ, thà bỏ qua cache oan còn hơn gọi API
// tạo cache RỚT 400 liên tục cho câu hỏi ngắn không đáng cache). Ngưỡng thật
// (`~5.120` ký tự) chỉ là ước lượng để KHÔNG gọi API vô ích cho system nhỏ
// (nhóm GEMINI_PROSE_SCENARIOS) — API tự từ chối đúng đắn nếu ước lượng sai,
// không phải nguồn sự thật.
const MIN_CACHE_CHARS = 5_200;

/** sha256(model|system[|tools]) — CÙNG Ý TƯỞNG `lasoKey()` (lib/portraits/cache.ts).
 * `tools` rỗng/undefined → khoá GIỮ NGUYÊN dạng cũ `model|system` (không mồ
 * côi cache prose đã tạo trước khi tham số này xuất hiện). Có tools → chèn
 * đoạn `tools:<json>` NGAY SAU model — hai cache cùng system nhưng khác bộ
 * tools (vd có/không `memoryPort`) không bao giờ trùng khoá. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function systemHash(model: string, system: string, tools?: any[] | null): string {
  const key = tools && tools.length ? `${model}|tools:${JSON.stringify(tools)}|${system}` : `${model}|${system}`;
  return createHash('sha256').update(key).digest('hex');
}

interface CacheRow {
  cache_name: string;
  expires_at: string;
}

/** Dòng CÒN DÙNG ĐƯỢC (chưa hết `expires_at`) khớp (system, model) — null nếu
 * chưa có/đã hết hạn/tra hỏng. Fail-soft: lỗi mạng → null, KHÔNG throw. */
async function lookupCache(hash: string, model: string): Promise<string | null> {
  if (!ready()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gemini_cache_registry` +
        `?system_hash=eq.${hash}&model=eq.${encodeURIComponent(model)}` +
        `&expires_at=gt.${encodeURIComponent(new Date().toISOString())}` +
        '&select=cache_name,expires_at&limit=1',
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as CacheRow[];
    return rows?.[0]?.cache_name || null;
  } catch {
    return null;
  }
}

/** Ghi dòng mới. `resolution=ignore-duplicates` (giống portrait_cache): race
 * 2 request cùng tạo cache cho cùng (system,model) → bản về đích trước thắng,
 * bản sau bị bỏ qua ở PHÍA SUPABASE — cache THẬT bên Google của bản thua vẫn
 * tồn tại, chỉ không ai nhớ tên nó (tự hết hạn theo TTL, không hỏng gì). */
async function saveCache(hash: string, model: string, cacheName: string, expiresAt: string, tokenCount: number | null): Promise<void> {
  if (!ready()) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/gemini_cache_registry`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal,resolution=ignore-duplicates' },
      body: JSON.stringify({
        system_hash: hash,
        model,
        cache_name: cacheName,
        expires_at: expiresAt,
        token_count: tokenCount,
      }),
    });
  } catch {
    /* best-effort — không lưu được thì lượt sau tạo cache mới, không ai mất gì */
  }
}

/** Gọi Google tạo cache thật. Trả `null` ở BẤT KỲ lỗi nào (request-time hay
 * non-200) — caller fallback về gửi `system_instruction` đầy đủ như trước
 * PR này, đúng hành vi cũ 100%. KHÔNG retry (khác `streamGemini`/
 * `streamGeminiTurn`): đây là lớp TỐI ƯU, không phải đường chính — retry ở
 * đây chỉ làm chậm lượt chat để đổi lấy một tối ưu có thể bỏ qua an toàn. */
async function createCache(
  model: string,
  system: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[] | null,
): Promise<{ name: string; expiresAt: string; tokenCount: number | null } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      model: `models/${model}`,
      systemInstruction: { parts: [{ text: system }] },
      ttl: `${CACHE_TTL_SECONDS}s`,
    };
    if (tools && tools.length) body.tools = tools;
    const res = await fetch(`${CACHE_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = (await res.text()).slice(0, 300);
      console.error(`[gemini-cache] tạo cache thất bại ${res.status}: ${t}`);
      return null;
    }
    const j = (await res.json()) as {
      name?: string;
      expireTime?: string;
      usageMetadata?: { totalTokenCount?: number };
    };
    if (!j.name || !j.expireTime) {
      console.error('[gemini-cache] response tạo cache thiếu name/expireTime:', JSON.stringify(j).slice(0, 300));
      return null;
    }
    return {
      name: j.name,
      expiresAt: j.expireTime,
      // KHÔNG đoán số khi Google không trả usageMetadata — để null, cost
      // lưu trữ sẽ bị BỎ QUA (xem logGeminiCacheStorage trong usage.ts) thay
      // vì bịa số làm sai biên LN im lặng.
      tokenCount: j.usageMetadata?.totalTokenCount ?? null,
    };
  } catch (e) {
    console.error('[gemini-cache] lỗi request tạo cache:', (e as Error).message);
    return null;
  }
}

/**
 * 🔑 CỬA DUY NHẤT — tra cache còn sống, tạo mới nếu chưa có/đã hết hạn.
 *
 * `tools` optional — truyền vào để bake CẢ tools lẫn system vào cache (đường
 * function-calling, xem chú thích 2026-09-22 đầu file); bỏ trống cho đường
 * prose thuần (`streamGemini`).
 *
 * Trả `null` ở MỌI trường hợp không cache được (system quá ngắn, thiếu env,
 * lỗi mạng, Google từ chối) — caller (`streamGemini`/`streamGeminiTurn`)
 * PHẢI coi `null` là "gửi system đầy đủ như cũ", không phải lỗi.
 */
export async function getOrCreateGeminiCache(
  model: string,
  system: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[] | null,
): Promise<string | null> {
  if (!ready() || system.length < MIN_CACHE_CHARS) return null;
  const hash = systemHash(model, system, tools);
  const existing = await lookupCache(hash, model);
  if (existing) return existing;
  const created = await createCache(model, system, tools);
  if (!created) return null;
  // Không await — ghi sổ không chặn lượt chat (giống mọi hàm `put`/log khác
  // trong repo, vd `insertHistoryRow`, `logLlmUsage`).
  void saveCache(hash, model, created.name, created.expiresAt, created.tokenCount);
  void logGeminiCacheStorage(model, created.tokenCount, CACHE_TTL_SECONDS);
  return created.name;
}
