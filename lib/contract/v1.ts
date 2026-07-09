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
}

// ── Kịch bản phi-lá-số (additive — Sprint 1.2) ──────────────
// Các công cụ KHÔNG dựa trên lá số tử vi (tương hợp, tử bình, sinh
// con, chọn ngày, đặt tên). `data` là context ĐÃ TÍNH SẴN (deterministic)
// — client tính bây giờ, sau này có thể chuyển server-side, contract
// không đổi. Bộ não dùng chung buildChatContext để chọn prompt + tool.
export type ScenarioType =
  | 'xem-tuoi'
  | 'xem-lam-an'
  | 'tu-binh'
  | 'xem-tuoi-sinh-con'
  | 'chon-ngay-tot'
  | 'dat-ten-con';

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
  };
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

  if (b.scenario != null) {
    const s = b.scenario as Record<string, unknown>;
    const types: ScenarioType[] = ['xem-tuoi', 'xem-lam-an', 'tu-binh', 'xem-tuoi-sinh-con', 'chon-ngay-tot', 'dat-ten-con'];
    if (!types.includes(s.type as ScenarioType)) {
      return { ok: false, error: 'scenario.type không hợp lệ' };
    }
    if (!s.data || typeof s.data !== 'object') {
      return { ok: false, error: 'scenario.data phải là object' };
    }
  }

  return { ok: true, value: b as unknown as ChatRequestV1 };
}
