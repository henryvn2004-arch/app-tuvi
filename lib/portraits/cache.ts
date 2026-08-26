// lib/portraits/cache.ts
// ============================================================
// CACHE KẾT QUẢ 2 TOOL CHÂN DUNG THEO LÁ SỐ
//
// Đầu vào của cả hai tool chỉ là LÁ SỐ (ngày/tháng/năm + giờ sinh + giới tính
// + lịch âm-dương). Cùng lá số thì mọi thứ engine tính ra đều y hệt — chức
// phận, nền văn minh, tên nhân vật, cung Phu Thê, hình thể. Phần duy nhất
// khác nhau giữa hai lượt chạy là chữ LLM viết và bức ảnh model vẽ, mà đó
// đúng là phần tốn ~$0.08–0.10 mỗi lượt.
//
// Ba luật Henry chốt (2026-07-29):
//   1. Cache DÙNG CHUNG TOÀN HỆ THỐNG. Ngoài tiền, cái được là nhất quán:
//      hai người cùng ngày giờ sinh mà ra hai nhân vật tiền kiếp khác nhau
//      thì lộ ngay ra là máy bịa.
//   2. Ai ĐÃ trả cho lá số đó rồi thì xem lại miễn phí; người chưa từng trả
//      vẫn trả đủ.
//   3. MỘT LÁ SỐ MỘT KẾT QUẢ — không có "vẽ lại". Ghi cache dùng
//      `resolution=ignore-duplicates`: bản đầu tiên thắng vĩnh viễn.
//
// MỌI THỨ Ở ĐÂY LÀ BEST-EFFORT: cache hỏng/mạng chập thì rơi về đường gen
// như cũ. Ngược lại thì một nhịp Supabase chớp là người dùng mất lượt đã trả
// tiền — đắt hơn nhiều so với việc lỡ gen lại một lần.
// ============================================================

import { createHash } from 'crypto';
import type { BirthParams } from '@/lib/contract/v1';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

/** Bảng lịch sử của từng tool — cũng là nơi tra "user này đã trả cho lá số nào". */
export const HISTORY_TABLE = {
  'chan-dung-vo-chong': 'spouse_portraits',
  'chan-dung-tien-kiep': 'past_life_portraits',
  'duyen-no-tien-kiep': 'past_life_bonds',
  'nguoi-khac': 'nguoi_khac_reports',
  'day-con': 'day_con_reports',
  'nhan-mach': 'nhan_mach_reports',
  'huong-nghiep-tre': 'huong_nghiep_tre_reports',
} as const;

export type PortraitToolId = keyof typeof HISTORY_TABLE;
/** `main` = tool vợ chồng (1 request). Tiền kiếp chạy 2 pha song song. */
export type PortraitPhase = 'main' | 'story' | 'image';

/**
 * Khoá canonical của một lá số.
 *
 * CỐ Ý BỎ `name`: engine không đọc tên (`computeLaso` bỏ qua, và cả
 * `pickCharacterName`/`pickEraForLaso` đều seed từ dữ liệu lá số) — tính tên
 * vào khoá thì hai người cùng lá số khác tên lại ra hai kết quả, đúng thứ luật
 * 1 muốn tránh, mà vẫn tốn thêm một lượt gen.
 *
 * CŨNG KHÔNG có năm xem: hai tool này không đọc số nào phụ thuộc năm hiện tại
 * (tuổi vẽ neo vào đại vận; mốc tuổi cưới là 22–31 giả định, không phải tuổi
 * thật) → kết quả không cũ đi theo thời gian, khoá không cần xoay theo năm.
 *
 * `extra` dành cho tham số THẬT SỰ đổi kết quả (hiện chỉ có `era` bị ép từ
 * client — chưa trang nào gửi, nhưng nếu gửi mà không tính vào khoá thì nền
 * văn minh khác nhau lại dùng chung một bản cache).
 */
export function lasoKey(birth: BirthParams, extra?: string): string {
  const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const canonical = [
    birth.isLunar ? 'AL' : 'DL',
    num(birth.year),
    num(birth.month),
    num(birth.day),
    `h${num(birth.hourBranch, -1)}`,
    birth.gender === 'nu' ? 'nu' : 'nam',
    extra || '',
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

/**
 * Dựng `BirthParams` từ query của endpoint `action=cache-status`.
 *
 * Chỉ nhận đúng những trường vào khoá lá số — client hỏi "lá số này có sẵn kết
 * quả chưa" thì không cần gửi gì hơn, và cũng không nên: endpoint này không
 * sinh gì cả.
 */
export function birthFromQuery(sp: URLSearchParams): BirthParams {
  const n = (k: string) => Number(sp.get(k) || 0);
  return {
    day: n('d'),
    month: n('m'),
    year: n('y'),
    hourBranch: sp.get('h') === null ? -1 : n('h'),
    gender: sp.get('g') === 'nu' ? 'nu' : 'nam',
    isLunar: sp.get('lunar') === '1',
  };
}

/**
 * Một dòng cache.
 *
 * `payload` = đúng thứ đã trả về cho người dùng ở lượt gen gốc.
 * `row`     = bộ cột để ghi vào bảng lịch sử cho NGƯỜI TRÚNG CACHE — họ phải
 *             có dòng của riêng mình thì mục "Lịch sử" mới thấy, và lần sau
 *             mới nhận diện được là "đã trả tiền cho lá số này".
 */
export interface CachedPortrait {
  payload: Record<string, unknown>;
  row: Record<string, unknown> | null;
}

/**
 * Kết quả đọc cache.
 *
 * 🔑 `cached` LÀ NULL KHI DÒNG ĐÃ CŨ — cố ý, và đây là chỗ quan trọng nhất của
 * cả thiết kế. Hai kiểu hỏng KHÔNG ngang nhau:
 *   · phục vụ dòng cũ ⇒ trang ẩn khối im lặng, người dùng đọc bản thiếu, KHÔNG
 *     lỗi nào bắn ra (đã cắn thật ở #465 và #475);
 *   · dựng lại mà quên `overwrite` ⇒ tốn thêm một lượt model, nội dung vẫn ĐÚNG.
 * Nên cái nguy hiểm bị chặn ở tầng thư viện, còn cái nhẹ hơn mới để route lo:
 * route bỏ qua `stale` thì chỉ phí tiền, không bao giờ hiện sai.
 */
export interface CacheRead {
  cached: CachedPortrait | null;
  /** Dòng cũ hơn `shape` đang khai — có tồn tại, nhưng KHÔNG dùng được. */
  stale: boolean;
}

function ready(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/**
 * Dòng ghi TRƯỚC khi tool cắm cơ chế shape thì không có `_shape`. Payload của
 * chúng chính là cấu trúc phiên bản 1 ⇒ đọc là 1, KHÔNG coi là hỏng. Coi chúng
 * là hỏng thì lượt bật cơ chế sẽ đốt lại toàn bộ cache đang đúng — với 2 tool
 * ảnh là ~1.100đ mỗi dòng, đổi lấy đúng con số 0.
 */
function docShape(payload: Record<string, unknown> | undefined | null): number {
  const v = (payload as { _shape?: unknown } | null | undefined)?._shape;
  return typeof v === 'number' ? v : 1;
}

/** Bản cache của (tool, pha, lá số) — `null` nếu chưa có hoặc tra hỏng. */
async function docCache(
  toolId: PortraitToolId,
  phase: PortraitPhase,
  key: string,
): Promise<CachedPortrait | null> {
  if (!ready() || !key) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/portrait_cache` +
        `?tool_id=eq.${encodeURIComponent(toolId)}` +
        `&phase=eq.${encodeURIComponent(phase)}` +
        `&laso_key=eq.${encodeURIComponent(key)}` +
        '&select=payload&limit=1',
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { payload?: CachedPortrait }[];
    const cached = rows?.[0]?.payload;
    if (!cached || typeof cached !== 'object' || !cached.payload) return null;
    return { payload: cached.payload, row: cached.row || null };
  } catch {
    return null;
  }
}

/**
 * Ghi bản gốc. `resolution=ignore-duplicates` = luật "một lá số một kết quả":
 * hai người cùng lá số bấm cùng lúc thì bản về đích trước thắng, bản sau bị bỏ
 * qua chứ KHÔNG ghi đè — nếu ghi đè thì người đầu tiên xem lại sẽ thấy kết quả
 * đã đổi.
 *
 * ⚠️ `overwrite` CHỈ dùng cho một việc: dòng cũ mang SHAPE payload đã lỗi thời
 * (tool đổi cấu trúc trả về) nên vừa được dựng lại. Không có nó thì lượt ghi bị
 * bỏ qua im lặng ⇒ mỗi lượt xem lại đốt thêm một lượt model mà dòng hỏng vẫn
 * nằm nguyên. KHÔNG dùng để "làm mới" nội dung — xem luật một-lá-số-một-kết-quả.
 */
async function ghiCache(
  toolId: PortraitToolId,
  phase: PortraitPhase,
  key: string,
  entry: CachedPortrait,
  userId: string,
  shape: number,
  overwrite: boolean,
): Promise<void> {
  if (!ready() || !key) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/portrait_cache`, {
      method: 'POST',
      headers: {
        ...SB_HEADERS,
        Prefer: `return=minimal,resolution=${overwrite ? 'merge' : 'ignore'}-duplicates`,
      },
      body: JSON.stringify({
        tool_id: toolId,
        phase,
        laso_key: key,
        // Đóng dấu shape TẠI ĐÂY, không để route tự nhớ: chỉ cần một route quên
        // là dòng nó ghi ra không bao giờ bị coi là cũ.
        payload: { ...entry, payload: { ...entry.payload, _shape: shape } },
        created_by: userId || null,
      }),
    });
  } catch {
    /* best-effort — không cache được thì lượt sau gen lại, không ai mất gì */
  }
}

/** Đếm lượt trúng cache (atomic, qua RPC) — chỗ duy nhất đo được cache có tiết kiệm thật không. */
function chamCache(toolId: PortraitToolId, phase: PortraitPhase, key: string): void {
  if (!ready() || !key) return;
  void fetch(`${SUPABASE_URL}/rest/v1/rpc/portrait_cache_touch`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify({ p_tool_id: toolId, p_phase: phase, p_laso_key: key }),
  }).catch(() => {});
}

/**
 * User này đã từng có kết quả cho ĐÚNG lá số này chưa.
 *
 * Đây là toàn bộ căn cứ cho luật 2 ("đã trả rồi thì xem lại free"): dòng trong
 * bảng lịch sử chỉ được ghi sau khi route chạy xong, mà route chỉ chạy sau khi
 * `toolPaymentDenied` cho qua — nên có dòng nghĩa là đã trả tiền.
 *
 * Lỗi mạng → trả `false` (coi như chưa trả). FAIL-CLOSED có chủ ý, ngược với
 * mọi chỗ khác trong file: đoán nhầm thành "đã trả" là phát không hàng.
 */
export async function userOwnsLaso(
  toolId: PortraitToolId,
  userId: string,
  key: string,
): Promise<boolean> {
  if (!ready() || !userId || !key) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${HISTORY_TABLE[toolId]}` +
        `?user_id=eq.${encodeURIComponent(userId)}` +
        `&laso_key=eq.${encodeURIComponent(key)}&limit=1&select=id`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

/** Ghi một dòng lịch sử (best-effort — không chặn response, giống code sẵn có). */
export function insertHistoryRow(toolId: PortraitToolId, row: Record<string, unknown>): void {
  if (!ready()) return;
  void fetch(`${SUPABASE_URL}/rest/v1/${HISTORY_TABLE[toolId]}`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  }).catch(() => {});
}

/**
 * Kết quả tra cache cho một pha, kèm phán quyết có được miễn phí không.
 *
 * `free` CHỈ đúng khi CÓ cache VÀ user đã sở hữu lá số này. Thiếu vế "có
 * cache" là mở đường gen thật miễn phí: ai từng vẽ một lá số sẽ vẽ lại được
 * vô hạn ở mọi pha còn thiếu cache.
 */
export interface CacheLookup extends CacheRead {
  key: string;
  owns: boolean;
  free: boolean;
}

/**
 * 🔑 CỬA DUY NHẤT vào `portrait_cache` — và `shape` là THAM SỐ BẮT BUỘC.
 *
 * VÌ SAO PHẢI LÀ CHỮ KÝ HÀM chứ không phải một lời dặn: `portrait_cache` khoá
 * theo LÁ SỐ, không theo shape. Đổi cấu trúc payload mà quên đóng dấu phiên bản
 * thì dòng cache cũ được trả nguyên trạng MÃI MÃI và trang ẩn khối im lặng —
 * không lỗi nào bắn ra. Lời dặn đã nằm sẵn trong mã mà vẫn bị quên **hai lần**
 * (#465 `day-con`, #475 `huong-nghiep-tre`, đo được trên prod một dòng `tuoi=43`
 * còn mang lứa của bản kẹp tuổi cũ). Nay không khai `shape` thì **không lấy được
 * cái tay cầm** ⇒ `tsc` từ chối biên dịch, hết cửa quên.
 *
 * Dùng: khai MỘT lần ở đầu route
 *   const SHAPE = 1;
 *   const CACHE = cacheFor(TOOL_ID, SHAPE);
 *
 * ⚠️ `shape` CỐ Ý không đi vào `lasoKey`: đổi khoá là mồ côi cả cache LẪN
 * `userOwnsLaso` ⇒ người đã trả tiền bị tính lại. Giữ khoá thì lượt dựng lại
 * vẫn miễn phí đúng cho họ.
 */
export function cacheFor(toolId: PortraitToolId, shape: number) {
  return {
    /** Bản cache của một pha. Dòng cũ ⇒ `cached: null` + `stale: true`. */
    async get(phase: PortraitPhase, key: string): Promise<CacheRead> {
      const c = await docCache(toolId, phase, key);
      if (!c) return { cached: null, stale: false };
      const stale = docShape(c.payload) < shape;
      return { cached: stale ? null : c, stale };
    },

    /**
     * Tra cache + quyền sở hữu trong một lượt, và chốt luôn `free`.
     *
     * ⚠️ `free` xét trên dòng THÔ (`c`), không xét `cached`: người này đã trả
     * tiền cho đúng lá số đó rồi, bắt trả lần nữa chỉ vì cấu trúc payload đổi
     * là sai. Dùng nhầm `cached` ở đây là thu tiền lần hai của chính họ.
     */
    async lookup(
      phase: PortraitPhase,
      userId: string,
      birth: BirthParams,
      extra?: string,
    ): Promise<CacheLookup> {
      const key = lasoKey(birth, extra);
      const [c, owns] = await Promise.all([
        docCache(toolId, phase, key),
        userOwnsLaso(toolId, userId, key),
      ]);
      const stale = Boolean(c) && docShape(c!.payload) < shape;
      return { key, cached: stale ? null : c, stale, owns, free: Boolean(c) && owns };
    },

    /**
     * Ghi bản gốc. `_shape` do chính hàm này đóng dấu, và nó TỰ quyết có ghi đè
     * hay không — chỗ gọi không phải biết gì về shape.
     *
     * 🔑 VÌ SAO TỰ QUYẾT chứ không nhận cờ `overwrite`: cờ đó phải luồn qua chữ
     * ký của `buildReport`/`handleStory`/`handleImage` ở 7 tool, tức 7 chỗ để
     * quên — mà quên thì lượt ghi bị bỏ qua IM LẶNG và mỗi lượt xem lại đốt
     * thêm một lượt model trong khi dòng hỏng vẫn nằm nguyên. Đổi lại chỉ tốn
     * một lượt SELECT, đứng sau một lượt gen vốn tốn ~1.100đ.
     *
     * Ba nhánh: chưa có dòng ⇒ chèn · dòng còn mới ⇒ BỎ QUA (luật một-lá-số-
     * một-kết-quả: bản về đích trước thắng) · dòng cũ hơn `shape` ⇒ ghi đè.
     */
    put(phase: PortraitPhase, key: string, entry: CachedPortrait, userId: string): void {
      void (async () => {
        const cu = await docCache(toolId, phase, key);
        const cuKy = Boolean(cu) && docShape(cu!.payload) < shape;
        await ghiCache(toolId, phase, key, entry, userId, shape, cuKy);
      })();
    },

    touch(phase: PortraitPhase, key: string): void {
      chamCache(toolId, phase, key);
    },
  };
}
