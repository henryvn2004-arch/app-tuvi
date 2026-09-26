// lib/tools/registry.ts
// ============================================================
// TOOL LAYER cho /api/v1/chat. Nhóm vận-hạn/ngày-tốt DÙNG CHUNG
// lõi lib/agent/tools.ts (một bộ não — xem docs). Chỉ còn 2 tool
// đặc thù cổng v1 định nghĩa tại đây:
//
//   lap_la_so        → tính lá số SERVER-SIDE từ birth (lib/engine/laso)
//   tra_cuu_tri_thuc → RAG sách tử vi (OpenAI embed + Supabase)
//
// Nhóm dùng chung (từ lib/agent/tools):
//   tra_tieu_van · tra_nguyet_van · tra_nhat_van · xem_ngay_tot
// ============================================================

import { computeLaso, formatLasoContext, lasoSummary, clockToBranch, type Laso } from '@/lib/engine/laso';
import { buildTools, execLasoTool, toolLabel } from '@/lib/agent/tools';
import { computeTuBinh } from '@/lib/engine/tubinh';
import { computeCongSo, railDataDayDu, resolveTrangThai, TRANG_THAI_LABEL } from '@/lib/engine/cong-so';
import { computeThanSoHoc } from '@/lib/engine/than-so-hoc';
// Chỉ MỘT chiều import (registry → prompts) — prompts.ts KHÔNG import lại
// registry.ts, tránh vòng lặp. Định nghĩa tool `tra_van_nam_bat_tu` /
// `tra_van_nam_cong_so` / `tra_nam_ca_nhan_than_so` (JSON schema, không phụ
// thuộc gì) nằm ở prompts.ts cạnh CHAT_SYSTEM_TU_BINH / CHAT_SYSTEM_CONG_SO /
// CHAT_SYSTEM_THAN_SO; tên tool phải khớp TAY giữa hai file — đổi tên thì sửa
// CẢ HAI.
import { extractTuBinhContext, extractGenericContext } from '@/lib/agent/prompts';
import { lanKinhNam, lanKinhThang, lanKinhNgay } from '@/lib/agent/luan-chu-de';
import { personaVoice } from '@/lib/agent/personas';
import { lapKhoa, railData as railDataLucNham } from '@/lib/liuren/ke';
import type { BirthParams } from '@/lib/contract/v1';
import { SUGGEST_TOOL_DEF, SUGGEST_PRODUCT_TOOL_DEF, resolveToolSuggestion, type ToolSuggestion } from '@/lib/tools/suggest-tool';

type Rec = Record<string, unknown>;

// ── Sổ lá số (cài đặt ở tầng kênh, bind theo platform+chatId) ──
// Cho phép tool luu_la_so / mo_la_so / liet_ke_la_so thao tác sổ mà KHÔNG
// import Supabase trực tiếp (giữ tool layer trung lập). null = kênh không bật
// (vd web /api/v1/chat) → 3 tool sổ không được đăng ký.
export interface ProfilePort {
  list(): Promise<{ name: string; birth: BirthParams }[]>;
  get(name: string): Promise<{ name: string; birth: BirthParams } | null>;
  save(name: string, birth: BirthParams): Promise<boolean>;
}

/**
 * Cửa ghi hồ sơ "Thầy nhớ gì về con" (TẦNG 2). Cùng khuôn `ProfilePort`: lõi
 * tool KHÔNG biết Supabase, chỉ gọi qua port — nên test được và kênh nào chưa
 * có danh tính thì truyền null là tool tự tắt.
 *
 * ⚠️ Port LUÔN bind sẵn userId ở phía tạo (server). TUYỆT ĐỐI không nhận
 * userId qua tham số tool: model sẽ bịa ra id và một người ghi được vào hồ sơ
 * người khác.
 */
export interface MemoryPort {
  remember(loai: string, noiDung: string): Promise<boolean>;
  forget(idPrefix: string): Promise<boolean>;
}

// Trạng thái dùng chung trong MỘT request (lá số đã lập được
// chia sẻ cho các tool sau như tra_tieu_van).
export interface ToolContext {
  ls: Laso | null;
  // Birth của lá số ĐANG trong ngữ cảnh (seed từ req.birth, hoặc do lap_la_so/
  // mo_la_so set) → để luu_la_so biết lưu cái gì.
  birth: BirthParams | null;
  profiles: ProfilePort | null;
  // Cửa ghi hồ sơ người dùng (TẦNG 2). null = lượt anon / kênh chưa nối danh
  // tính → 2 tool ghi_nho/quen_di không được đăng ký.
  memory: MemoryPort | null;
  // Tool người dùng ĐANG mở — để không gợi ý lại chính nó.
  activeTool: string | null;
  // Thẻ gợi ý công cụ model vừa chọn trong lượt này (tối đa 1). runAgent đọc
  // rồi gắn vào event `done`.
  toolSuggestion: ToolSuggestion | null;
  // Tên lá số vừa mở/lưu trong lượt (để kênh hiển thị/ghi nhớ).
  activeProfile: string | null;
  // mo_la_so mở một lá số KHÁC → đổi chủ thể → kênh reset thread hội thoại.
  subjectSwitched: boolean;
  // Chủ đề câu hỏi lượt này (lib/agent/luan-chu-de.ts) — tra_tieu_van gắn thêm
  // lăng kính chủ đề vào kết quả (tối đa 2 khi câu hỏi có hai trọng tâm). [] = không chủ đề nào đã dựng.
  chuDe: string[];
  // "Mời thầy khác" (P0 2026-09-26, xem execMoiThayBatTu) — true nếu lượt này
  // ĐÃ mời một thầy khác vào phòng rồi. Cùng khuôn với `toolSuggestion`: chặn
  // model mời hai lần trong CÙNG một lượt.
  masterInvited: boolean;
}

export function newToolContext(
  seedLs: Laso | null = null,
  opts?: {
    profiles?: ProfilePort | null;
    birth?: BirthParams | null;
    memory?: MemoryPort | null;
    activeTool?: string | null;
  },
): ToolContext {
  return {
    ls: seedLs,
    birth: opts?.birth ?? null,
    profiles: opts?.profiles ?? null,
    memory: opts?.memory ?? null,
    activeTool: opts?.activeTool ?? null,
    toolSuggestion: null,
    activeProfile: null,
    subjectSwitched: false,
    chuDe: [],
    masterInvited: false,
  };
}

// Các tool cần lá số đã lập (guard nếu chưa có).
const LASO_TOOLS = new Set(['tra_tieu_van', 'tra_nguyet_van', 'tra_nhat_van']);

function currentYearVN(): number {
  return Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()),
  );
}

// ── Định nghĩa tool (Anthropic tool-use schema) ─────────────
// hasProfiles=true (kênh chat có sổ lá số) → thêm 3 tool quản lý sổ.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildToolDefs(hasProfiles = false, hasMemory = false): any[] {
  // TẦNG 2 — chỉ đăng ký khi có danh tính (đã đăng nhập). Lượt anon không có
  // hồ sơ để ghi, mà `client.anon_id` do client tự khai nên KHÔNG phải danh tính.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memoryTools: any[] = hasMemory
    ? [
        {
          name: 'ghi_nho',
          description:
            'Ghi vào hồ sơ riêng của người này MỘT điều đáng nhớ về HOÀN CẢNH SỐNG của họ, để những lần trò chuyện sau còn biết mà hỏi thăm cho trúng. ' +
            'CHỈ ghi thứ CÒN ĐÚNG SAU MỘT THÁNG: nghề nghiệp, tình trạng gia đình, con cái, mối lo đang đeo đẳng, điều họ đang tránh, tín ngưỡng nếu họ tự nói. ' +
            'TUYỆT ĐỐI KHÔNG ghi: tâm trạng nhất thời ("hôm nay buồn"), nội dung câu hỏi tử vi, thông tin lá số (hệ thống đã có), hay suy đoán của bạn về họ. ' +
            'Viết ngắn gọn ngôi thứ ba, một ý một mục (vd "Đang thất nghiệp từ tháng 6, tìm việc ngành xây dựng"). ' +
            'Gọi lặng lẽ trong lúc trò chuyện — KHÔNG thông báo "tôi đã ghi nhớ" trừ khi họ hỏi.',
          input_schema: {
            type: 'object',
            properties: {
              loai: {
                type: 'string',
                enum: ['hoan_canh', 'moi_lo', 'tinh_cach', 'tin_nguong', 'khac'],
                description:
                  'hoan_canh = nghề/gia đình/nơi ở · moi_lo = điều đang bận tâm · tinh_cach = tính nết, thói quen · tin_nguong = đạo họ theo · khac',
              },
              noi_dung: { type: 'string', description: 'Điều cần nhớ, tối đa 200 ký tự' },
            },
            required: ['loai', 'noi_dung'],
          },
        },
        {
          name: 'quen_di',
          description:
            'Xoá MỘT mục khỏi hồ sơ khi người dùng bảo quên đi, hoặc khi điều đó đã không còn đúng (vd đã tìm được việc thì mục "đang thất nghiệp" phải bỏ). ' +
            'Truyền đúng mã trong ngoặc vuông ở khối "THẦY ĐANG NHỚ GÌ VỀ NGƯỜI NÀY".',
          input_schema: {
            type: 'object',
            properties: { ma: { type: 'string', description: 'Mã 8 ký tự của mục, vd "a1b2c3d4"' } },
            required: ['ma'],
          },
        },
      ]
    : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileTools: any[] = hasProfiles
    ? [
        {
          name: 'luu_la_so',
          description:
            'Lưu lá số VỪA lập (hoặc đang xem) vào sổ với một TÊN do người dùng đặt, để lần sau gọi lại nhanh. Gọi sau khi đã lập lá số và người dùng cho tên (vd "anh Tony", "con gái"). Nếu người dùng không muốn đặt tên thì tự đặt tên gợi ý ngắn gọn (vd "Nam 2019").',
          input_schema: {
            type: 'object',
            properties: { ten: { type: 'string', description: 'Tên đặt cho lá số, vd "anh Tony"' } },
            required: ['ten'],
          },
        },
        {
          name: 'mo_la_so',
          description:
            'Mở lại một lá số ĐÃ LƯU trong sổ theo tên (vd người dùng nói "xem lá số Tony", "lá số con gái"). Trả về toàn bộ lá số để luận. CHỈ luận trên lá số vừa mở, không trộn với lá số khác.',
          input_schema: {
            type: 'object',
            properties: { ten: { type: 'string', description: 'Tên lá số cần mở' } },
            required: ['ten'],
          },
        },
        {
          name: 'liet_ke_la_so',
          description: 'Liệt kê các lá số đã lưu trong sổ của người dùng (khi họ hỏi "có những lá số nào", "danh sách lá số").',
          input_schema: { type: 'object', properties: {} },
        },
      ]
    : [];
  return [
    ...profileTools,
    ...memoryTools,
    SUGGEST_TOOL_DEF,
    SUGGEST_PRODUCT_TOOL_DEF,
    {
      name: 'lap_la_so',
      description:
        'Lập lá số Tử Vi Đẩu Số từ ngày sinh DƯƠNG lịch. Gọi NGAY khi đã biết đủ ngày/tháng/năm dương lịch, giờ sinh và giới tính. QUAN TRỌNG về giờ: nếu người dùng cho giờ kiểu ĐỒNG HỒ (vd "9h35 sáng", "2h chiều") thì truyền field "hour" (giờ 24h) — hệ thống TỰ đổi sang địa chi, TUYỆT ĐỐI không tự map giờ sang Tý/Sửu/…; chỉ dùng "hourBranch" khi người dùng nói thẳng GIỜ ÂM/ĐỊA CHI (vd "giờ Tỵ"). Thiếu thông tin thì HỎI, không đoán.',
      input_schema: {
        type: 'object',
        properties: {
          day: { type: 'integer', description: 'Ngày sinh dương lịch (1–31)' },
          month: { type: 'integer', description: 'Tháng sinh dương lịch (1–12)' },
          year: { type: 'integer', description: 'Năm sinh dương lịch, ví dụ 1998' },
          hour: {
            type: 'integer',
            description:
              'Giờ sinh theo ĐỒNG HỒ, hệ 24h (0–23) — CHỈ chép lại giờ người dùng nói, KHÔNG đổi sang địa chi. Quy đổi 12h→24h: 9h35 sáng→9, 12h trưa→12, 2h chiều→14, 9h tối→21, 11h đêm→23, 12h đêm/nửa đêm→0. Dùng field này khi có giờ đồng hồ.',
          },
          minute: { type: 'integer', description: 'Phút sinh (0–59), nếu biết — không bắt buộc.' },
          calendar: {
            type: 'string',
            enum: ['duong', 'am'],
            description:
              'Loại lịch của NGÀY/THÁNG/NĂM ở trên: "duong" nếu dương/tây lịch (mặc định), "am" nếu người dùng nói âm/ta lịch ("ÂL", "âm lịch", "lịch ta"). CHỈ gắn cờ — TUYỆT ĐỐI không tự đổi âm sang dương, hệ thống tự quy đổi.',
          },
          hourBranch: {
            type: 'integer',
            description:
              'CHỈ dùng khi người dùng cho GIỜ ĐỊA CHI/ÂM trực tiếp (vd "giờ Tỵ"): 0=Tý 1=Sửu 2=Dần 3=Mão 4=Thìn 5=Tỵ 6=Ngọ 7=Mùi 8=Thân 9=Dậu 10=Tuất 11=Hợi. Nếu đã truyền "hour" thì BỎ field này.',
          },
          gender: { type: 'string', enum: ['nam', 'nu'], description: 'Giới tính' },
        },
        required: ['day', 'month', 'year', 'gender'],
      },
    },
    // Nhóm vận-hạn/ngày-tốt: dùng CHUNG lõi lib/agent (hasLaso=true).
    ...buildTools(true),
    {
      name: 'tra_cuu_tri_thuc',
      description:
        'Tra cứu tri thức tử vi từ thư viện sách cổ (ý nghĩa sao, cách cục, luận đoán). Dùng khi cần dẫn chứng học thuật hoặc giải thích sâu một khái niệm.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Câu truy vấn tri thức, ví dụ "Cự Môn hóa Kỵ tại Mệnh"' },
        },
        required: ['query'],
      },
    },
    // "Mời thầy khác" — 2nd opinion (P0 2026-09-26). Chỉ một cặp cố định cho
    // vòng đầu: Tâm Kính (Bát Tự) đối chiếu vận NĂM — cùng năm/dữ liệu ngày
    // sinh, không tốn thêm thao tác của người dùng. Xem execMoiThayBatTu.
    {
      name: 'moi_thay_bat_tu',
      description:
        'Mời THẦY TÂM KÍNH (chuyên Bát Tự/Tử Bình) vào cùng trả lời, để người dùng nghe thêm góc ĐỐI CHIẾU từ một môn khác cho MỘT NĂM cụ thể đang hỏi. ' +
        'DÙNG RẤT DÈ: mặc định là KHÔNG gọi. Chỉ gọi khi cả bốn điều sau cùng đúng — ' +
        '(1) người dùng đang hỏi vận hạn của một NĂM cụ thể (không phải tháng/ngày, không phải hỏi chung chung); ' +
        '(2) bạn đã luận xong bằng Tử Vi TRƯỚC RỒI — đây là góc nhìn THÊM, không phải để né câu hỏi; ' +
        '(3) trong cả cuộc trò chuyện này bạn CHƯA gọi tool này lần nào; ' +
        '(4) không phải lúc người dùng đang buồn/bế tắc/kể chuyện riêng — lúc đó chỉ nên lắng nghe. ' +
        'Sau khi gọi, hệ thống tự đưa Tâm Kính vào nói bằng dữ liệu Bát Tự THẬT — bạn KHÔNG tự luận thay Tâm Kính, KHÔNG bịa số liệu Bát Tự, và KHÔNG nhắc trước trong lời văn rằng bạn "sắp mời" ai đó.',
      input_schema: {
        type: 'object',
        properties: {
          nam: { type: 'integer', description: 'Năm dương lịch cần đối chiếu — lấy ĐÚNG năm người dùng vừa hỏi.' },
          ly_do: { type: 'string', description: 'MỘT câu ngắn nói vì sao đáng nghe thêm góc Bát Tự cho năm này.' },
        },
        required: ['nam', 'ly_do'],
      },
    },
    // Cặp thứ hai (P1 2026-09-26): Linh Cơ (Đại Lục Nhâm) đối chiếu MỘT VIỆC
    // CỤ THỂ đang phân vân NGAY LÚC HỎI — khác Tâm Kính ở chỗ không cần năm/
    // ngày sinh, chỉ cần thời điểm hiện tại (`lapKhoa()` không tham số = giờ
    // chiêm = giờ hỏi). Cùng zero-friction: khách không phải nhập gì thêm.
    {
      name: 'moi_thay_luc_nham',
      description:
        'Mời THẦY LINH CƠ (chuyên Đại Lục Nhâm) vào cùng trả lời, để người dùng nghe thêm góc ĐỐI CHIẾU từ một môn khác cho MỘT VIỆC CỤ THỂ đang phân vân NGAY LÚC NÀY (thành/bại, nên tiến hay lui, chừng nào có kết quả) — KHÔNG dùng cho câu hỏi vận năm/tháng chung chung (đã có moi_thay_bat_tu cho việc đó). ' +
        'DÙNG RẤT DÈ: mặc định là KHÔNG gọi. Chỉ gọi khi cả bốn điều sau cùng đúng — ' +
        '(1) người dùng đang hỏi về MỘT VIỆC CỤ THỂ, có thể trả lời được ngay bây giờ (vd "có nên ký hợp đồng này", "việc này có thành không") — không phải hỏi vận hạn dài hạn; ' +
        '(2) bạn đã luận xong bằng Tử Vi TRƯỚC RỒI — đây là góc nhìn THÊM, không phải để né câu hỏi; ' +
        '(3) trong cả cuộc trò chuyện này bạn CHƯA gọi tool này (hay moi_thay_bat_tu) lần nào; ' +
        '(4) không phải lúc người dùng đang buồn/bế tắc/kể chuyện riêng — lúc đó chỉ nên lắng nghe. ' +
        'Sau khi gọi, hệ thống tự đưa Linh Cơ vào nói bằng khóa Lục Nhâm THẬT lập ngay lúc này — bạn KHÔNG tự luận thay Linh Cơ, KHÔNG bịa thiên tướng/tam truyền, và KHÔNG nhắc trước trong lời văn rằng bạn "sắp mời" ai đó.',
      input_schema: {
        type: 'object',
        properties: {
          ly_do: { type: 'string', description: 'MỘT câu ngắn nói vì sao đáng nghe thêm góc Lục Nhâm cho việc này.' },
        },
        required: ['ly_do'],
      },
    },
  ];
}

// ── Kết quả 1 lần chạy tool ─────────────────────────────────
export interface ToolRunResult {
  /** text trả lại model (đưa vào tool_result) */
  content: string;
  /** nhãn ngắn hiển thị cho client (event status) */
  label: string;
}

// ── Dispatcher ──────────────────────────────────────────────
export async function executeTool(name: string, input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (name === 'lap_la_so') return execLapLaSo(input, ctx);
  if (name === 'luu_la_so') return execLuuLaSo(input, ctx);
  if (name === 'mo_la_so') return execMoLaSo(input, ctx);
  if (name === 'liet_ke_la_so') return execLietKeLaSo(ctx);
  if (name === 'ghi_nho') return execGhiNho(input, ctx);
  if (name === 'quen_di') return execQuenDi(input, ctx);
  // `goi_y_san_pham` (giai đoạn 3 cross-sell, 2026-09-23) dùng CHUNG hàm này —
  // hai tool chỉ khác MÔ TẢ (lib/tools/suggest-tool.ts), hành vi hệt nhau:
  // tra `tool_pricing`, ghi CÙNG `ctx.toolSuggestion`, cùng trần 1 lần/hội thoại.
  if (name === 'goi_y_cong_cu' || name === 'goi_y_san_pham') return execGoiYCongCu(input, ctx);
  if (name === 'moi_thay_bat_tu') return execMoiThayBatTu(input, ctx);
  if (name === 'moi_thay_luc_nham') return execMoiThayLucNham(input, ctx);
  if (name === 'tra_van_nam_bat_tu') return execTraVanNamBatTu(input, ctx);
  if (name === 'tra_van_nam_cong_so') return execTraVanNamCongSo(input, ctx);
  if (name === 'tra_nam_ca_nhan_than_so') return execTraNamCaNhanThanSo(input);
  if (name === 'tra_cuu_tri_thuc') {
    return { content: await execTraCuu(input), label: 'Đang tra cứu sách cổ...' };
  }

  // Nhóm dùng chung lõi lib/agent.
  if (name === 'xem_ngay_tot' || LASO_TOOLS.has(name)) {
    if (LASO_TOOLS.has(name) && !ctx.ls) {
      return { content: 'Chưa có lá số. Hãy lập lá số (lap_la_so) trước khi tra vận hạn.', label: toolLabel(name) };
    }
    // Lưới an toàn: tra_tieu_van thiếu năm → mặc định năm hiện tại (VN).
    const arg = name === 'tra_tieu_van' && !input?.nam ? { ...input, nam: currentYearVN() } : input;
    let content = execLasoTool(name, ctx.ls, arg);
    if (name === 'tra_tieu_van' && ctx.chuDe.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tv = ((ctx.ls as any)?.tieuVanScores || []).find((t: any) => Number(t.nam) === Number(arg?.nam));
      for (const cd of tv ? ctx.chuDe : []) {
        const lk = lanKinhNam(cd, ctx.ls, tv);
        if (lk) content += '\n' + lk;
      }
    }
    // Tháng / ngày: cùng lăng kính, tầng chính là nguyệt hạn / nhật hạn.
    if ((name === 'tra_nguyet_van' || name === 'tra_nhat_van') && ctx.chuDe.length) {
      for (const cd of ctx.chuDe) {
        const lk = name === 'tra_nguyet_van' ? lanKinhThang(cd, ctx.ls, arg) : lanKinhNgay(cd, ctx.ls, arg);
        if (lk) content += '\n' + lk;
      }
    }
    return { content, label: toolLabel(name) };
  }

  return { content: 'Công cụ không tồn tại.', label: 'Công cụ lạ' };
}

// ── Chuẩn hóa input lá số SERVER-SIDE (LLM chỉ CHÉP, server SUY/ĐỔI) ──
// Mọi phép biến đổi dễ sai của LLM được dời về đây: giờ→địa chi, giới tính đồng
// nghĩa, năm 2 chữ số, âm/dương lịch. LLM chỉ cần trích đúng giá trị thô.

// Giải địa chi giờ: ƯU TIÊN giờ ĐỒNG HỒ (hour) → clockToBranch (server tự map,
// tránh LLM map sai); chỉ fallback hourBranch khi user cho giờ địa chi trực tiếp.
export function resolveHourBranch(input: Rec): number | null {
  if (input.hour != null && input.hour !== '') {
    const h = Number(input.hour);
    if (Number.isFinite(h)) return clockToBranch(h);
  }
  if (input.hourBranch != null && input.hourBranch !== '') {
    const b = Number(input.hourBranch);
    if (Number.isFinite(b) && b >= 0 && b <= 11) return b;
  }
  return null;
}

// Giới tính: chấp nhận đồng nghĩa (nữ/gái/female…) → 'nam'|'nu'. Mặc định nam.
function normGender(g: unknown): 'nam' | 'nu' {
  const s = String(g ?? '').toLowerCase().trim();
  if (/(^|[^a-z])(nu|nữ|gai|gái|female|girl|woman|f)([^a-z]|$)|con\s*gái/.test(s)) return 'nu';
  return 'nam';
}

// Năm: 2 chữ số → 4 chữ số (00–29 → 20xx, 30–99 → 19xx, hợp với năm sinh).
function normYear(y: unknown): number {
  let n = Number(y);
  if (!Number.isFinite(n)) return NaN;
  n = Math.floor(n);
  if (n >= 0 && n < 100) n = n >= 30 ? 1900 + n : 2000 + n;
  return n;
}

// Lịch âm? calendar='am' (hoặc isLunar=true) → ngày là ÂM lịch, computeLaso tự đổi.
function isLunarInput(input: Rec): boolean {
  if (input.isLunar === true) return true;
  return /^(am|âm|lunar|al|ÂL)$/i.test(String(input.calendar ?? '').trim());
}

// Dựng BirthParams chuẩn từ input tool. null nếu thiếu giờ/năm hợp lệ. Dùng CHUNG
// cho execLapLaSo và run.ts (capturedBirth) → một nguồn chuẩn hóa.
export function buildBirthFromInput(input: Rec): BirthParams | null {
  const hb = resolveHourBranch(input);
  if (hb == null) return null;
  const year = normYear(input.year);
  const day = Math.floor(Number(input.day));
  const month = Math.floor(Number(input.month));
  if (!Number.isFinite(year) || !Number.isFinite(day) || !Number.isFinite(month)) return null;
  return { day, month, year, hourBranch: hb, gender: normGender(input.gender), isLunar: isLunarInput(input) };
}

function execLapLaSo(input: Rec, ctx: ToolContext): ToolRunResult {
  const birth = buildBirthFromInput(input);
  if (!birth) {
    return {
      content:
        'Thiếu thông tin để lập lá số — cần đủ ngày, tháng, năm sinh, GIỜ (giờ đồng hồ như 9h35, hoặc giờ địa chi như giờ Tỵ) và giới tính.',
      label: 'Lỗi lập lá số',
    };
  }
  const res = computeLaso(birth);
  if (!res.ok || !res.ls) {
    return { content: 'Không lập được lá số: ' + (res.error || 'lỗi không rõ'), label: 'Lỗi lập lá số' };
  }
  ctx.ls = res.ls;
  ctx.birth = birth; // để luu_la_so lưu được lá số vừa lập
  return {
    content:
      'ĐÃ LẬP LÁ SỐ. Dữ liệu (chỉ luận trên đây, không bịa thêm):\n\n' +
      formatLasoContext(res.ls) +
      CARD_SHOWN_NOTE,
    label: 'Đang lập lá số — ' + (lasoSummary(res.ls) || '...'),
  };
}

// Lá số đã được render thành BẢNG gửi thẳng cho người dùng (thẻ deterministic ở
// kênh chat / lưới ở web). Nhắc model: chỉ LUẬN, đừng chép lại bảng → tránh
// model tự an cung sai khi liệt kê (lỗi Mệnh Dần đã gặp).
const CARD_SHOWN_NOTE =
  '\n\n(Lá số trên ĐÃ được hiển thị cho người dùng dưới dạng bảng. Bạn KHÔNG cần liệt kê lại 12 cung hay nhắc lại Mệnh/Thân nằm ở cung nào — chỉ LUẬN Ý NGHĨA theo câu hỏi, bám đúng nhãn cung trong dữ liệu.)';

// ── Sổ lá số: lưu / mở / liệt kê ────────────────────────────
function birthLabel(b: BirthParams): string {
  const g = b.gender === 'nu' ? 'Nữ' : 'Nam';
  return `${g} ${b.day}/${b.month}/${b.year}`;
}

async function execLuuLaSo(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  const ten = String(input?.ten || '').trim();
  if (!ctx.profiles) return { content: 'Kênh này chưa hỗ trợ lưu sổ lá số.', label: 'Lưu lá số' };
  if (!ten) return { content: 'Cần một TÊN để lưu (vd: anh Tony).', label: 'Lưu lá số' };
  if (!ctx.birth) return { content: 'Chưa có lá số nào để lưu — hãy lập lá số trước đã.', label: 'Lưu lá số' };
  const ok = await ctx.profiles.save(ten, ctx.birth);
  if (!ok) return { content: 'Lưu chưa thành công, thử lại sau giúp mình.', label: 'Lưu lá số' };
  ctx.activeProfile = ten;
  return {
    content: `Đã lưu lá số vào sổ với tên "${ten}". Lần sau chỉ cần nhắn "xem lá số ${ten}" là mở lại được.`,
    label: 'Lưu sổ — ' + ten,
  };
}

async function execMoLaSo(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  const ten = String(input?.ten || '').trim();
  if (!ctx.profiles) return { content: 'Kênh này chưa hỗ trợ sổ lá số.', label: 'Mở lá số' };
  if (!ten) return { content: 'Cần TÊN lá số cần mở.', label: 'Mở lá số' };
  const p = await ctx.profiles.get(ten);
  if (!p) {
    const all = await ctx.profiles.list();
    const names = all.map((x) => x.name).join(', ');
    return {
      content: `Trong sổ chưa có lá số tên "${ten}".` + (names ? ` Sổ hiện có: ${names}.` : ' Sổ đang trống.'),
      label: 'Mở lá số',
    };
  }
  const res = computeLaso(p.birth);
  if (!res.ok || !res.ls) {
    return { content: `Tìm thấy "${p.name}" nhưng lập lại lá số lỗi: ` + (res.error || 'không rõ'), label: 'Mở lá số' };
  }
  ctx.ls = res.ls;
  ctx.birth = p.birth;
  ctx.activeProfile = p.name;
  ctx.subjectSwitched = true; // đổi chủ thể → kênh reset thread
  return {
    content:
      `ĐÃ MỞ lá số "${p.name}" (${birthLabel(p.birth)}). CHỈ luận trên lá số này, KHÔNG trộn với lá số khác:\n\n` +
      formatLasoContext(res.ls) +
      CARD_SHOWN_NOTE,
    label: 'Mở sổ — ' + p.name,
  };
}

async function execLietKeLaSo(ctx: ToolContext): Promise<ToolRunResult> {
  if (!ctx.profiles) return { content: 'Kênh này chưa hỗ trợ sổ lá số.', label: 'Sổ lá số' };
  const all = await ctx.profiles.list();
  if (!all.length) {
    return { content: 'Sổ lá số đang trống. Lập một lá số rồi đặt tên để lưu nhé.', label: 'Sổ lá số' };
  }
  const lines = all.map((p) => `- ${p.name} (${birthLabel(p.birth)})`).join('\n');
  return { content: 'Các lá số đã lưu trong sổ:\n' + lines, label: 'Sổ lá số' };
}

// ── TẦNG 2: hồ sơ người dùng ────────────────────────────────
// Nhãn CỐ Ý trung tính ("Đang lắng nghe") thay vì "Đang ghi nhớ": nhãn tool
// hiện lên thanh trạng thái của rail, mà "đang ghi nhớ về bạn" nhảy ra giữa
// lúc người ta đang kể chuyện riêng thì đọc rất lạnh.
async function execGhiNho(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (!ctx.memory) return { content: 'Chưa đăng nhập nên chưa có hồ sơ để ghi.', label: 'Đang lắng nghe' };
  const ok = await ctx.memory.remember(String(input?.loai || 'khac'), String(input?.noi_dung || ''));
  return {
    content: ok
      ? 'Đã ghi vào hồ sơ. ĐỪNG thông báo cho người dùng, cứ tiếp tục câu chuyện tự nhiên.'
      : 'Không ghi được (nội dung rỗng hoặc quá ngắn). Bỏ qua, đừng nhắc tới.',
    label: 'Đang lắng nghe',
  };
}

async function execQuenDi(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (!ctx.memory) return { content: 'Chưa đăng nhập nên không có hồ sơ.', label: 'Đang lắng nghe' };
  const ok = await ctx.memory.forget(String(input?.ma || ''));
  return {
    content: ok ? 'Đã xoá khỏi hồ sơ.' : 'Không tìm thấy mục đó trong hồ sơ.',
    label: 'Đang lắng nghe',
  };
}

// ── Gợi ý công cụ (bước 4) ──────────────────────────────────
// Giữ ĐÚNG MỘT thẻ mỗi lượt: model gọi hai lần thì lần sau bị bỏ. Trần "một
// lần mỗi cuộc trò chuyện" thì client giữ (nó mới là bên có trạng thái phiên).
async function execGoiYCongCu(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (ctx.toolSuggestion) {
    return { content: 'Đã gợi ý một công cụ trong lượt này rồi. Đừng gợi ý thêm.', label: 'Đang tra danh mục' };
  }
  const s = await resolveToolSuggestion(input?.tool_id, input?.ly_do, ctx.activeTool);
  if (!s) {
    // Nói rõ là ĐÃ BỎ để model không tưởng thẻ đã hiện rồi viết "bạn bấm vào
    // thẻ bên dưới nhé" — câu đó trỏ vào một thứ không tồn tại.
    return {
      content: 'Không tìm thấy công cụ đó (mã sai, đang tắt, hoặc chính là công cụ đang mở). KHÔNG có thẻ nào hiện ra — đừng nhắc tới nó trong câu trả lời.',
      label: 'Đang tra danh mục',
    };
  }
  ctx.toolSuggestion = s;
  return {
    content: `Đã hiện thẻ "${s.label}" cho người dùng. Đừng nhắc lại trong lời văn, đừng nói giá, cứ trả lời tiếp tự nhiên.`,
    label: 'Đang tra danh mục',
  };
}

// ── Mời thầy khác — 2nd opinion (P0 2026-09-26) ─────────────────────────
// Tái dùng ĐÚNG engine + formatter của tra_van_nam_bat_tu (computeTuBinh +
// extractTuBinhContext) — không chép công thức lần hai. Khác ở chỗ đây
// KHÔNG trả số liệu thô cho CHÍNH thầy đang nói luận tiếp, mà đóng gói kèm
// giọng thật của Tâm Kính (lib/agent/personas.ts) và một chỉ dẫn tường
// thuật — mô hình VẪN LÀ MỘT lượt gọi model DUY NHẤT (không mở thêm lượt
// gọi provider nào), chỉ đổi giọng ngay trong phần còn lại của câu trả lời.
// `ctx.masterInvited`: chặn mời quá 1 lần/lượt, cùng khuôn `toolSuggestion`.
async function execMoiThayBatTu(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (ctx.masterInvited) {
    return { content: 'Đã mời một thầy khác trong lượt này rồi. Đừng mời thêm.', label: 'Mời Tâm Kính' };
  }
  if (!ctx.birth) {
    return { content: 'Chưa có ngày sinh trong ngữ cảnh — không mời được Tâm Kính. Đừng nhắc tới việc mời trong câu trả lời.', label: 'Mời Tâm Kính' };
  }
  const nam = Math.floor(Number(input?.nam));
  if (!Number.isFinite(nam)) {
    return { content: 'Thiếu năm cần xem — không mời được Tâm Kính.', label: 'Mời Tâm Kính' };
  }
  const res = computeTuBinh(ctx.birth, nam);
  if (!res.ok || !res.data) {
    return { content: 'Không tính được Bát Tự để mời Tâm Kính: ' + (res.error || 'lỗi không rõ') + '. Đừng nhắc tới việc mời trong câu trả lời.', label: 'Mời Tâm Kính' };
  }
  ctx.masterInvited = true;
  return {
    content:
      `— THẦY TÂM KÍNH (Bát Tự) VỪA VÀO PHÒNG, ĐÃ XEM XONG NĂM ${nam} —\n` +
      'Viết tiếp phần này bằng giọng THẬT của Tâm Kính (không phải giọng của bạn), mở một dòng riêng bằng "**Tâm Kính:**", CHỈ luận từ đúng dữ liệu Bát Tự dưới đây — không tự thêm số liệu ngoài đây:\n' +
      (personaVoice('tam-kinh') || '') +
      '\n\n' +
      extractTuBinhContext(res.data) +
      '\n\nLuận xong phần Tâm Kính thì có thể chốt lại MỘT câu ngắn bằng giọng của chính bạn để khép lại — không lặp lại số liệu Tâm Kính vừa nêu.',
    label: `Đang mời thầy Tâm Kính xem Bát Tự năm ${nam}...`,
  };
}

// ── Mời thầy khác — cặp thứ hai: Linh Cơ / Đại Lục Nhâm (P1 2026-09-26) ──
// Cùng khuôn execMoiThayBatTu, khác nguồn số: `lapKhoa()` không cần ngày sinh,
// chỉ cần THỜI ĐIỂM HỎI (chiêm thời = giờ hiện tại — đúng cổ pháp Lục Nhâm,
// không phải lỗi thiếu tham số). `railData()` đã PHẲNG sẵn cho rail
// (lib/liuren/ke.ts), đi thẳng qua `extractGenericContext` — đúng cách
// `toolType==='luc-nham'` đang dùng ở buildChatContext, không dựng lại.
async function execMoiThayLucNham(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (ctx.masterInvited) {
    return { content: 'Đã mời một thầy khác trong lượt này rồi. Đừng mời thêm.', label: 'Mời Linh Cơ' };
  }
  let khoa;
  try {
    khoa = lapKhoa();
  } catch (e) {
    return { content: 'Không lập được khóa Lục Nhâm: ' + (e instanceof Error ? e.message : 'lỗi không rõ') + '. Đừng nhắc tới việc mời trong câu trả lời.', label: 'Mời Linh Cơ' };
  }
  ctx.masterInvited = true;
  return {
    content:
      `— THẦY LINH CƠ (Đại Lục Nhâm) VỪA VÀO PHÒNG, ĐÃ LẬP KHÓA NGAY LÚC NÀY —\n` +
      'Viết tiếp phần này bằng giọng THẬT của Linh Cơ (không phải giọng của bạn), mở một dòng riêng bằng "**Linh Cơ:**", luận theo đúng trình tự tam truyền → tứ khóa → thiên tướng, CHỈ dựa vào khóa dưới đây — không tự lập lại hay đổi một chi nào:\n' +
      (personaVoice('linh-co') || '') +
      '\n\n' +
      extractGenericContext(railDataLucNham(khoa)) +
      '\n\nLuận xong phần Linh Cơ thì có thể chốt lại MỘT câu ngắn bằng giọng của chính bạn để khép lại — không lặp lại số liệu Linh Cơ vừa nêu.',
    label: 'Đang mời thầy Linh Cơ lập khóa Lục Nhâm...',
  };
}

// ── Tử Bình: tra vận NĂM KHÁC (pilot tool-as-agent, 2026-09-22) ─────────
// Trước đây scenario 'tu-binh' PROSE-TĨNH: `ctx.birth` seed sẵn từ req.birth
// (run.ts) nhưng không tool nào đọc lại nó để tính năm khác — hỏi "năm sau
// thế nào" thì model chỉ có dữ liệu năm đang xem, phải bịa hoặc từ chối.
// `computeTuBinh(birth, namXem)` (lib/engine/tubinh.ts) đã sẵn tham số năm —
// chỉ thiếu đúng một tool gọi lại nó giữa hội thoại.
async function execTraVanNamBatTu(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (!ctx.birth) {
    return { content: 'Chưa có ngày sinh trong ngữ cảnh để tính lại.', label: 'Tra Bát Tự' };
  }
  const nam = Math.floor(Number(input?.nam));
  if (!Number.isFinite(nam)) {
    return { content: 'Thiếu năm cần xem.', label: 'Tra Bát Tự' };
  }
  const res = computeTuBinh(ctx.birth, nam);
  if (!res.ok || !res.data) {
    return { content: 'Không tính được: ' + (res.error || 'lỗi không rõ'), label: 'Tra Bát Tự' };
  }
  return {
    content: `BÁT TỰ NĂM ${nam} (chỉ luận đại vận/lưu niên trên đây, Tứ Trụ/Nhật Can/Dụng Thần/Cách Cục không đổi theo năm):\n\n` +
      extractTuBinhContext(res.data),
    label: `Đang tính Bát Tự năm ${nam}...`,
  };
}

// ── Công Sở: tra vận NĂM KHÁC / đổi vị trí (tool-as-agent #2, 2026-09-22) ──
// Trước đây scenario 'cong-so' PROSE-TĨNH y hệt tu-binh: client tính một lần
// (`/api/cong-so` → `railDataDayDu`) rồi gửi qua `scenario.data`, model chỉ có
// đúng năm/vị trí lúc đó. `ctx.ls` KHÔNG được seed cho scenario (chỉ nhánh
// laso mới seed) nên phải tự computeLaso lại từ `ctx.birth` trước khi gọi
// computeCongSo — cùng thế execLapLaSo đang làm, không có gì lạ.
async function execTraVanNamCongSo(input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (!ctx.birth) {
    return { content: 'Chưa có ngày sinh trong ngữ cảnh để tính lại.', label: 'Công Sở' };
  }
  const nam = Math.floor(Number(input?.nam));
  if (!Number.isFinite(nam)) {
    return { content: 'Thiếu năm cần xem.', label: 'Công Sở' };
  }
  const lsRes = computeLaso(ctx.birth);
  if (!lsRes.ok || !lsRes.ls) {
    return { content: 'Không lập lại được lá số: ' + (lsRes.error || 'lỗi không rõ'), label: 'Công Sở' };
  }
  const trangThai = resolveTrangThai(input?.trang_thai as string | undefined);
  const profile = computeCongSo(lsRes.ls, trangThai, nam);
  return {
    content:
      `TỬ VI CÔNG SỞ NĂM ${nam} — vị trí "${TRANG_THAI_LABEL[trangThai]}" (chỉ luận trên đây, không bịa thêm):\n\n` +
      extractGenericContext(railDataDayDu(profile)),
    label: `Đang tính Công Sở năm ${nam}...`,
  };
}

// ── Thần Số Học: tra NĂM CÁ NHÂN của năm khác (tool-as-agent #3, 2026-09-22) ──
// KHÁC hai tool trên: trang `/than-so-hoc` KHÔNG gửi `birth` vào setContext
// (chỉ gửi `scenario.data` đã tính sẵn từ ThanSoTool.compute() chạy CLIENT-SIDE)
// nên `ctx.birth` luôn null ở đây — tool nhận thẳng dob/ten mà model copy lại
// NGUYÊN VĂN từ dữ liệu đã cho (đã dặn trong CHAT_SYSTEM_THAN_SO), không đọc ctx.
async function execTraNamCaNhanThanSo(input: Rec): Promise<ToolRunResult> {
  const dob = String(input?.dob || '').trim();
  const ten = String(input?.ten || '').trim();
  const namXem = Math.floor(Number(input?.nam_xem));
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dob);
  if (!m || !ten || !Number.isFinite(namXem)) {
    return { content: 'Thiếu hoặc sai định dạng ngày sinh (cần dd/mm/yyyy), tên, hoặc năm xem.', label: 'Thần Số Học' };
  }
  const res = computeThanSoHoc(Number(m[1]), Number(m[2]), Number(m[3]), ten, namXem);
  if (!res.ok || !res.data) {
    return { content: 'Không tính được: ' + (res.error || 'lỗi không rõ'), label: 'Thần Số Học' };
  }
  return {
    content:
      `THẦN SỐ HỌC NĂM XEM ${namXem} (chỉ Năm Cá Nhân + chặng hiện tại đổi theo năm; bốn số cốt lõi và biểu đồ GIỮ NGUYÊN như đã cho, không bịa lại):\n\n` +
      extractGenericContext(res.data),
    label: `Đang tính Năm Cá Nhân ${namXem}...`,
  };
}

// RAG: OpenAI embeddings + Supabase pgvector rpc (port từ app/api/search)
async function execTraCuu(input: Rec): Promise<string> {
  const query = String(input?.query || '').slice(0, 1000);
  if (!query) return 'Thiếu câu truy vấn.';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return 'Tra cứu tri thức tạm thời không khả dụng (thiếu cấu hình).';
  }
  try {
    const embResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ input: query, model: 'text-embedding-3-small', dimensions: 1024 }),
    });
    if (!embResp.ok) throw new Error('OpenAI error');
    const embedding = (await embResp.json()).data[0].embedding;

    const searchResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: 6, match_threshold: 0.55 }),
    });
    if (!searchResp.ok) throw new Error('Supabase error');
    const results = (await searchResp.json()) as { source: string; content: string }[];
    if (!results.length) return 'Không tìm thấy tài liệu liên quan trong thư viện.';
    return results.map((r) => `[${r.source}]\n${r.content}`).join('\n\n---\n\n');
  } catch (e) {
    return 'Lỗi tra cứu: ' + (e instanceof Error ? e.message : 'không rõ');
  }
}
