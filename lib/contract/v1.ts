// lib/contract/v1.ts
// ============================================================
// CONTRACT v1 — biên giới giữa "bộ não" (server) và mọi client
// (web, Zalo, TikTok, Android, iOS, bot chat).
//
// NGUYÊN TẮC: chỉ THÊM, không PHÁ (additive-only).
// App native đã cài trên máy user không hot-update được — mọi
// thay đổi phải tương thích ngược. Thêm field optional / thêm
// loại event mới thì OK; đổi nghĩa / xóa field thì KHÔNG.
//
// Xem docs/KIEN-TRUC-VA-LO-TRINH.md mục 2.
// ============================================================

export const CONTRACT_VERSION = 'v1' as const;

// Phiên bản client tối thiểu được phục vụ. Client cũ hơn → server
// có thể trả event 'error' code 'client_too_old' để ép cập nhật.
export const MIN_SUPPORTED_CLIENT = '0.0.0' as const;

// ── Nền tảng client ─────────────────────────────────────────
export type ClientPlatform =
  | 'web'
  | 'pwa'
  | 'zalo-mini'
  | 'zalo-oa'
  | 'tiktok-mini'
  | 'android'
  | 'ios'
  | 'telegram'
  | 'messenger'
  | 'whatsapp';

// ── Ảnh đính kèm tin nhắn (additive — tướng mặt / phong thủy) ──
// base64 KHÔNG kèm tiền tố "data:...;base64," (chỉ phần dữ liệu).
// Chỉ áp dụng cho message role 'user'. Client cũ không gửi field này.
export interface ChatImage {
  data: string;
  /** 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' */
  mediaType: string;
}

// ── Tin nhắn hội thoại (client gửi role + content [+ images]) ──
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Ảnh đính kèm (vision) — additive, optional, chỉ role 'user'. */
  images?: ChatImage[];
}

// ── Tham số sinh (để engine lập lá số server-side) ──────────
// Client thu thập rồi gửi lên; server tính. Không bắt buộc —
// agent có thể hỏi lại nếu thiếu (slot-filling).
export interface BirthParams {
  /** Ngày sinh dương lịch */
  day?: number;
  month?: number;
  year?: number;
  /** Giờ sinh: 0..11 theo địa chi Tý..Hợi, hoặc -1 nếu không rõ */
  hourBranch?: number;
  /** 'nam' | 'nu' */
  gender?: 'nam' | 'nu';
  /** true nếu day/month/year đã là ÂM lịch (mặc định false = dương) */
  isLunar?: boolean;
  /** Tên hiển thị (tùy chọn) */
  name?: string;
}

// ── Thông tin client kèm mỗi request ────────────────────────
export interface ClientInfo {
  platform: ClientPlatform;
  /** semver, ví dụ "1.0.0" */
  version: string;
  /**
   * Định danh khách CHƯA ĐĂNG NHẬP (localStorage `tvmb_anon`, do track.js sinh).
   * Dùng để cấp vài lượt rail dùng thử trước khi bắt đăng ký.
   *
   * KHÔNG phải danh tính đáng tin — client tự khai và xoá localStorage là có mã
   * mới. Nó chỉ là lớp trần THÂN THIỆN (đếm đúng cho người dùng bình thường);
   * lớp chống lạm dụng thật là trần theo IP/ngày + trần toàn hệ thống/ngày ở
   * server. Đừng bao giờ dùng field này cho quyền hạn hay tính phí.
   */
  anon_id?: string;
}

// ── Kịch bản phi-lá-số (additive — Sprint 1.2) ──────────────
// Các công cụ KHÔNG dựa trên lá số tử vi (tương hợp, tử bình, sinh
// con, chọn ngày, đặt tên). `data` là context ĐÃ TÍNH SẴN (deterministic)
// — client tính bây giờ, sau này có thể chuyển server-side, contract
// không đổi. Bộ não dùng chung buildChatContext để chọn prompt + tool.
export type ScenarioType =
  | 'xem-tuoi'
  | 'xem-lam-an'
  | 'tuong-hop'
  | 'tu-binh'
  | 'xem-tuoi-sinh-con'
  | 'chon-ngay-tot'
  | 'dat-ten-con'
  | 'dat-ten-dn'
  | 'xem-tuong'
  | 'phong-thuy'
  | 'nap-am'
  | 'kim-lau'
  | 'ngu-hanh-ten'
  | 'than-so-hoc'
  | 'bat-trach'
  | 'kinh-dich'
  | 'mai-hoa'
  | 'ky-mon'
  | 'hoang-dao'
  | 'ngay-tot'
  | 'ban-do-sao'
  | 'cong-so'
  | 'nhan-mach'
  | 'luc-nham';

export interface ScenarioInput {
  type: ScenarioType;
  /** Context kịch bản đã tính (shape tùy type — khớp buildChatContext). */
  data: Record<string, unknown>;
  /** Tài liệu RAG kèm theo (tùy chọn — kịch bản không có tool tra cứu). */
  docs?: string;
  /** Persona tác giả (tùy chọn). */
  authorName?: string;
  authorStyle?: string;
}

// ── REQUEST: POST /api/v1/chat ──────────────────────────────
export interface ChatRequestV1 {
  /** Định danh phiên để lưu/nối hội thoại. Client tự sinh uuid. */
  session_id: string;
  messages: ChatMessage[];
  /** true → SSE stream; false → JSON một lần. Mặc định true. */
  stream?: boolean;
  /** Tham số sinh nếu đã có (đỡ phải hỏi lại) — luồng LÁ SỐ. */
  birth?: BirthParams;
  /** Kịch bản phi-lá-số (loại trừ với birth). */
  scenario?: ScenarioInput;
  /** Persona tác giả cho luồng LÁ SỐ (birth). Với scenario, đặt trong scenario. */
  authorName?: string;
  authorStyle?: string;
  /**
   * "Vỏ bọc" kể chuyện cho luồng LÁ SỐ — KHÔNG đổi dữ liệu, chỉ đổi cách nói.
   *
   * `past-life`: rail của tool Chân Dung Tiền Kiếp. Người dùng vừa đọc xong
   * truyện về một nhân vật dựng từ chính lá số của họ, nên câu hỏi tiếp theo
   * bật ra tự nhiên là hỏi VỀ NHÂN VẬT ("ông ấy có giàu không?", "lấy vợ thế
   * nào?") — mà bản chất chính là luận lá số của họ. Cờ này bật lớp đóng vai,
   * KHÔNG đụng tới lá số nạp vào system (vẫn full như tool Luận Giải).
   *
   * CỐ Ý là ENUM chứ không phải chuỗi tự do: nếu cho client gửi prose để ghép
   * vào system thì mở toang cửa prompt-injection. Nội dung nhân vật do SERVER
   * tự tính lại từ birth (computePastLife deterministic) — vừa an toàn, vừa
   * chắc chắn trùng nhân vật đang hiện trên màn hình.
   */
  wrap?: 'past-life' | 'past-life-bond' | 'nguoi-khac' | 'day-con' | 'huong-nghiep-tre';
  /**
   * Quan hệ với người trong lá số — chỉ dùng với `wrap: 'nguoi-khac'`.
   *
   * Vẫn là ENUM: server chạy qua `resolveQuanHe` (danh sách trắng 8 giá trị),
   * chuỗi lạ rơi về mặc định. Không có đường nào cho client đẩy prose vào
   * system, đúng như chú thích của `wrap` ở trên.
   */
  wrapQuanHe?: string;
  /**
   * Điều cha mẹ đang lo — chỉ dùng với `wrap: 'day-con'`.
   *
   * Cũng là ENUM (`resolveMoiLo`, danh sách trắng 6 giá trị). Cố ý KHÔNG gộp
   * vào `wrapQuanHe`: hai trường hai danh sách trắng khác nhau, gộp lại là sớm
   * muộn có giá trị của bên này lọt qua cửa của bên kia.
   */
  wrapMoiLo?: string;
  /**
   * Lá số của NGƯỜI THỨ HAI — chỉ dùng với `wrap: 'past-life-bond'`.
   *
   * Vì sao phải có: mối duyên (và nền văn minh chung của cả hai) suy từ QUAN HỆ
   * giữa hai lá số. Thiếu lá số này thì rail chỉ tính được nhân vật một người,
   * mà nền văn minh của bản một người do `pickEraForLaso` bốc riêng — tức rail
   * sẽ kể một thế giới KHÁC với thế giới đang hiện trên màn hình. Người dùng
   * nhìn ra ngay, và đó là loại mâu thuẫn phá sạch lòng tin vào cả tool.
   *
   * Vẫn chỉ là DỮ LIỆU LÁ SỐ (ngày/tháng/năm/giờ/giới), không phải prose — cửa
   * prompt-injection vẫn đóng như chú thích của `wrap` ở trên.
   */
  wrapBirthB?: BirthParams;
  /**
   * Lá số của NHỮNG NGƯỜI CÒN LẠI — chỉ dùng với `wrap: 'past-life-bond'` khi
   * lượt đó có từ 3 người trở lên. `wrapBirthB` vẫn chạy như cũ cho lượt 2
   * người, nên bản client cũ còn trong cache trình duyệt không gãy.
   *
   * Cũng chỉ là DỮ LIỆU LÁ SỐ, không phải prose — cửa prompt-injection vẫn đóng.
   * Server tự chặn ở `MAX_BOND_MEMBERS`, không tin số lượng client gửi lên.
   */
  wrapBirths?: BirthParams[];
  client: ClientInfo;
}

// ── SSE EVENTS (server → client) ────────────────────────────
// Mọi nền tảng đọc chung 5 loại event. Client cũ gặp event lạ
// thì BỎ QUA (forward-compatible).

export type SSEEventName = 'status' | 'tool_call' | 'text' | 'done' | 'error';

/** event: status — tiến trình cho UX ("Đang lập lá số...") */
export interface StatusEvent {
  text: string;
}

/** event: tool_call — minh bạch agent đang gọi tool gì */
export interface ToolCallEvent {
  name: string;
  /** tham số tool (đã rút gọn, an toàn để hiển thị) */
  args?: Record<string, unknown>;
}

/** event: text — luận giải, stream từng mảnh */
export interface TextEvent {
  delta: string;
}

/** event: done — kết thúc lượt */
export interface DoneEvent {
  usage?: { input_tokens?: number; output_tokens?: number };
  tools_used?: string[];
  /** thông tin paywall nếu bị chặn/cảnh báo hết lượt */
  paywall?: {
    blocked: boolean;
    reason?: string;
    balance?: number;
    /**
     * Giá MỘT lượt rail (Lượng) và số lượt TẶNG còn lại — additive, thêm để
     * client đếm được "còn N câu hỏi" thay vì hiện số Lượng trừu tượng.
     * Không có hai số này thì client phải tự đoán giá, và đoán sai là nói sai
     * với người dùng ngay trên đồng hồ đếm.
     */
    price?: number;
    freeTurns?: number;
    /**
     * Số câu DÙNG THỬ còn lại của khách chưa đăng nhập. Chỉ có ở lượt anon —
     * người đã đăng nhập thì field này vắng mặt (đừng suy ra 0 là "hết lượt").
     */
    anonTrialLeft?: number;
  };
  /** gợi ý câu hỏi tiếp theo do LLM sinh, bám câu trả lời vừa rồi (chip động) */
  suggestions?: string[];
}

/** event: error — lỗi có mã để client xử lý */
export interface ErrorEvent {
  code:
    | 'bad_request'
    | 'unauthorized'
    | 'client_too_old'
    | 'rate_limited'
    | 'paywall'
    | 'internal';
  message: string;
}

// ── Serialize 1 event SSE đúng khung ────────────────────────
// Định dạng SSE: "event: <name>\ndata: <json>\n\n"
export function sseEvent(name: SSEEventName, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Tiện ích tạo từng loại event (giữ type-safe ở chỗ gọi)
export const sse = {
  status: (d: StatusEvent) => sseEvent('status', d),
  toolCall: (d: ToolCallEvent) => sseEvent('tool_call', d),
  text: (d: TextEvent) => sseEvent('text', d),
  done: (d: DoneEvent) => sseEvent('done', d),
  error: (d: ErrorEvent) => sseEvent('error', d),
};

// ── Validate request tối thiểu (server dùng) ────────────────
export function validateChatRequest(body: unknown):
  | { ok: true; value: ChatRequestV1 }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body phải là JSON object' };
  const b = body as Record<string, unknown>;

  if (typeof b.session_id !== 'string' || !b.session_id) {
    return { ok: false, error: 'Thiếu session_id' };
  }
  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { ok: false, error: 'Thiếu messages' };
  }
  for (const m of b.messages) {
    const mm = m as Record<string, unknown>;
    if (mm.role !== 'user' && mm.role !== 'assistant') {
      return { ok: false, error: 'messages.role không hợp lệ' };
    }
    if (typeof mm.content !== 'string') {
      return { ok: false, error: 'messages.content phải là string' };
    }
    // images optional (additive) — nếu có phải là mảng {data, mediaType}.
    if (mm.images != null) {
      if (!Array.isArray(mm.images)) {
        return { ok: false, error: 'messages.images phải là mảng' };
      }
      for (const im of mm.images) {
        const ii = im as Record<string, unknown>;
        if (typeof ii.data !== 'string' || !ii.data) {
          return { ok: false, error: 'images.data phải là base64 string' };
        }
        if (ii.mediaType != null && typeof ii.mediaType !== 'string') {
          return { ok: false, error: 'images.mediaType phải là string' };
        }
      }
    }
  }
  const client = b.client as Record<string, unknown> | undefined;
  if (!client || typeof client.platform !== 'string' || typeof client.version !== 'string') {
    return { ok: false, error: 'Thiếu client.platform / client.version' };
  }

  // 🪤 Thêm giá trị `wrap` mới thì PHẢI thêm cả ở đây, không chỉ ở kiểu union
  // phía trên — kiểu chỉ chặn lúc biên dịch, còn cửa thật là hàm này. Đã vấp
  // một lần: hai tool vision thiếu trong danh sách và rail của chúng ăn 400.
  if (
    b.wrap != null &&
    b.wrap !== 'past-life' &&
    b.wrap !== 'past-life-bond' &&
    b.wrap !== 'nguoi-khac' &&
    b.wrap !== 'day-con' &&
    b.wrap !== 'huong-nghiep-tre'
  ) {
    return { ok: false, error: 'wrap không hợp lệ' };
  }
  if (b.wrapQuanHe != null && typeof b.wrapQuanHe !== 'string') {
    return { ok: false, error: 'wrapQuanHe không hợp lệ' };
  }
  if (b.wrapMoiLo != null && typeof b.wrapMoiLo !== 'string') {
    return { ok: false, error: 'wrapMoiLo không hợp lệ' };
  }
  if (b.wrapBirthB != null && typeof b.wrapBirthB !== 'object') {
    return { ok: false, error: 'wrapBirthB không hợp lệ' };
  }
  if (b.wrapBirths != null && !Array.isArray(b.wrapBirths)) {
    return { ok: false, error: 'wrapBirths không hợp lệ' };
  }

  if (b.scenario != null) {
    const s = b.scenario as Record<string, unknown>;
    // NGUỒN DUY NHẤT phải khớp ScenarioType union trên — xưa thiếu xem-tuong/
    // phong-thuy nên rail 2 tool vision bị chặn 400. Giữ đủ mọi type ở đây.
    const types: ScenarioType[] = ['xem-tuoi', 'xem-lam-an', 'tuong-hop', 'tu-binh', 'xem-tuoi-sinh-con', 'chon-ngay-tot', 'dat-ten-con', 'dat-ten-dn', 'xem-tuong', 'phong-thuy', 'nap-am', 'kim-lau', 'ngu-hanh-ten', 'than-so-hoc', 'bat-trach', 'kinh-dich', 'mai-hoa', 'ky-mon', 'hoang-dao', 'ngay-tot', 'luc-nham', 'ban-do-sao', 'cong-so', 'nhan-mach'];
    if (!types.includes(s.type as ScenarioType)) {
      return { ok: false, error: 'scenario.type không hợp lệ' };
    }
    if (!s.data || typeof s.data !== 'object') {
      return { ok: false, error: 'scenario.data phải là object' };
    }
  }

  return { ok: true, value: b as unknown as ChatRequestV1 };
}
