// lib/video/gate-audience.ts
// ============================================================
// CỔNG 2 — HỘI ĐỒNG NGƯỜI XEM GIẢ LẬP ("giả lập thuật toán TikTok").
//
// 🔑 QUYẾT ĐỊNH THIẾT KẾ QUAN TRỌNG NHẤT CỦA CẢ TRACK:
//
// KHÔNG hỏi model "clip này có viral không?" — đó là câu nó không trả lời được,
// và nó sẽ bịa ra một con số 8/10 nghe rất thuyết phục mà không dựa trên gì.
// Cùng lớp sai với "tra RAG trước khi nói là thiếu nguồn": hỏi sai câu thì câu
// trả lời có tự tin đến mấy cũng vô nghĩa.
//
// Thay vào đó cho model ĐÓNG VAI NGƯỜI XEM và hỏi một câu nó trả lời được:
//     "Bạn lướt qua ở giây thứ mấy, và vì sao?"
//
// Từ 7 điểm dừng → dựng ĐƯỜNG CONG GIỮ CHÂN mô phỏng → ra tỉ lệ xem hết dự báo
// và giây rơi rụng nặng nhất. Đây chính là tín hiệu mà TikTok/Reels xếp hạng
// mạnh nhất, và là con số DÙNG ĐƯỢC (biết đích danh chỗ phải sửa) thay vì một
// điểm số trang trí.
//
// ⚠️ GIỚI HẠN, đọc trước khi viện dẫn bất kỳ con số nào ở đây:
// đây là mô phỏng bằng model ngôn ngữ, KHÔNG phải thuật toán TikTok thật. Nó
// bắt được clip dở; nó KHÔNG chứng minh được clip sẽ nổi. Nhạc trending, giờ
// đăng, chủ đề đang hot, may mắn — nằm ngoài tầm đo. Vì thế mọi tên biến ở đây
// đều mang chữ "duBao"/"moPhong", cố ý không đặt tên kiểu `viralScore` để người
// đọc sau không nâng cấp nó thành một lời hứa.
// ============================================================

import { llmTextFull } from '@/lib/llm/complete';
import { parseLlmJson } from '@/lib/api/tool-helpers';
import { type ScriptSpec, estimateSpeechSeconds } from './script-spec';
import type { GateIssue } from './gate-machine';

/**
 * Bảy chân dung người lướt TikTok Việt.
 *
 * 🔑 Chân dung số 7 là chốt quan trọng nhất và CỐ Ý không phải khách hàng mục
 * tiêu: phần lớn lưu lượng TikTok đến từ người lướt vô định. Clip chỉ giữ được
 * nhóm đã quan tâm tử vi thì cùng lắm phục vụ tốt tệp sẵn có — muốn lan ra
 * ngoài thì phải giữ được người số 7. Bỏ persona này đi là tự đặt một cái
 * ngưỡng dễ, rồi clip nào cũng qua.
 */
export const VIEWER_PERSONAS = [
  { id: 'sv-22', desc: 'Nữ 22 tuổi, sinh viên TP.HCM. Tò mò tử vi nhưng chưa tin sâu, xem cho vui lúc rảnh.' },
  { id: 'vp-35', desc: 'Nam 35 tuổi, nhân viên văn phòng Hà Nội. Hoài nghi chuyện bói toán, xem để bắt lỗi hơn là để tin.' },
  { id: 'tin-45', desc: 'Nữ 45 tuổi, buôn bán nhỏ. Tin tử vi, hay đi xem thầy, tìm lời khuyên dùng được cho việc thật.' },
  { id: 'cuoi-28', desc: 'Nữ 28 tuổi, sắp cưới. Đang thật sự đi tìm hiểu chuyện xem tuổi vợ chồng.' },
  { id: 'kd-42', desc: 'Nam 42 tuổi, chủ cửa hàng. Quan tâm chọn ngày khai trương, hướng làm ăn.' },
  { id: 'me-33', desc: 'Nữ 33 tuổi, mẹ hai con nhỏ. Quan tâm chuyện dạy con, tương lai con.' },
  { id: 'luot-vo-dinh', desc: 'Người lướt vô định lúc 11h đêm, KHÔNG quan tâm tử vi, chỉ lướt cho hết giờ. Ngón tay rất nhanh.' },
] as const;

export interface ViewerVerdict {
  id: string;
  /** Giây người này lướt đi. `null` = xem hết clip. */
  boQuaOGiay: number | null;
  lyDo: string;
  muonLuu: boolean;
  muonGuiChoAiDo: boolean;
  binhLuan: string | null;
}

export interface AudienceGateResult {
  pass: boolean;
  /** Tỉ lệ persona xem hết — DỰ BÁO mô phỏng, không phải số đo thật. */
  tiLeXemHetDuBao: number;
  tiLeMuonLuu: number;
  tiLeMuonChiaSe: number;
  /** Giây bị bỏ nhiều nhất — chỗ đáng sửa trước tiên. */
  giayRoiRungNang: number | null;
  viewers: ViewerVerdict[];
  issues: GateIssue[];
  /** Chỉ dẫn sửa, đưa thẳng vào vòng viết lại. */
  goiYSua: string;
  /** Ghi lại để đối chiếu chi phí. */
  meta: { provider: string; model: string; durationMs: number };
}

/** Ngưỡng qua cổng. Xem chú thích cuối file về việc hiệu chỉnh. */
export const AUDIENCE_THRESHOLDS = {
  /** Số persona (trên 7) phải xem hết. */
  minXemHet: 5,
  /** Số persona phải muốn lưu HOẶC gửi cho ai đó. */
  minLuuHoacChiaSe: 2,
} as const;

/**
 * Dựng bảng thời gian có mốc giây để model biết "giây thứ mấy" là chỗ nào.
 * Không có mốc này thì câu trả lời về điểm dừng chỉ là số bịa.
 */
function buildTimeline(spec: ScriptSpec): string {
  const lines: string[] = [];
  let t = 0;

  const push = (label: string, text: string, visual: string) => {
    const d = estimateSpeechSeconds(text);
    lines.push(
      `[${t.toFixed(1)}s–${(t + d).toFixed(1)}s] ${label}\n` +
        `   NGHE THẤY: "${text}"\n` +
        `   NHÌN THẤY: ${visual}`
    );
    t += d;
  };

  push('MỞ ĐẦU', spec.hook, 'Chữ lớn hiện ngay giữa màn hình trên nền xanh đậm.');

  spec.scenes.forEach((sc, i) => {
    let visual: string;
    if (sc.visual.kind === 'screen') {
      visual = `Quay màn hình thật của công cụ trên điện thoại${sc.visual.label ? ` — ${sc.visual.label}` : ''}.`;
    } else if (sc.visual.kind === 'image') {
      visual = `Ảnh: ${sc.visual.caption ?? sc.visual.src}`;
    } else if (sc.visual.kind === 'typo') {
      // Hội đồng người xem chấm theo thứ họ NHÌN THẤY — mô tả sai loại cảnh
      // là họ chấm một clip khác với clip sắp render.
      visual = 'Chữ lớn phủ giữa màn hình, sáng dần theo nhịp đọc, nền xanh đậm.';
    } else {
      visual = `Thẻ chữ: ${sc.visual.heading ?? ''} ${sc.visual.body ?? ''}`.trim();
    }
    const d = sc.forceSeconds ?? estimateSpeechSeconds(sc.text);
    lines.push(
      `[${t.toFixed(1)}s–${(t + d).toFixed(1)}s] CẢNH ${i + 1}\n` +
        `   NGHE THẤY: "${sc.text}"\n` +
        `   NHÌN THẤY: ${visual}`
    );
    t += d;
  });

  push('KẾT', spec.cta, 'Thẻ chữ kèm logo và tên miền.');

  lines.push(`\n(Toàn clip dài ${t.toFixed(1)} giây. Có phụ đề chạy suốt. ${spec.music ? 'Có nhạc nền nhẹ dưới giọng đọc.' : 'KHÔNG có nhạc nền.'})`);
  return lines.join('\n\n');
}

const SYSTEM = `Bạn đang mô phỏng hành vi của người dùng TikTok Việt Nam.

Bạn KHÔNG phải nhà phê bình, KHÔNG chấm điểm nghệ thuật, KHÔNG khen chê tác giả.
Việc duy nhất của bạn: với MỖI chân dung người xem được đưa ra, hãy trả lời trung
thực như chính người đó đang cầm điện thoại lướt — họ lướt qua clip này ở giây
thứ mấy, và vì sao.

LUẬT BẮT BUỘC:
1. Phần lớn người lướt TikTok bỏ đi trong 3 giây đầu nếu không có gì níu lại.
   Đừng tử tế quá mức — hãy khắc nghiệt đúng như đời thật.
2. "Xem hết" là chuyện HIẾM, không phải mặc định. Chỉ trả boQuaOGiay=null khi
   clip thật sự có cớ giữ người đó tới cuối.
3. Chân dung "luot-vo-dinh" KHÔNG quan tâm tử vi. Người này chỉ ở lại nếu clip
   có gì đó thú vị với BẤT KỲ AI, không phụ thuộc chủ đề.
4. muonLuu chỉ đúng khi clip cho một thông tin cụ thể dùng lại được sau này.
   muonGuiChoAiDo chỉ đúng khi họ nghĩ ra ĐÍCH DANH một người sẽ thấy hợp.
   Xem thấy hay nhưng không có lý do lưu/gửi thì cả hai đều false.
5. lyDo phải nêu ĐÍCH DANH chi tiết trong clip khiến họ ở lại hay bỏ đi. Cấm
   nói chung chung kiểu "nội dung chưa hấp dẫn".
6. goiYSua phải là một chỉ dẫn CỤ THỂ, viết lại được ngay — nêu rõ sửa câu nào,
   sửa thành đại ý gì. Cấm lời khuyên chung chung như "làm hook hấp dẫn hơn".

Trả về ĐÚNG JSON theo schema, không thêm lời dẫn.`;

const SCHEMA = {
  type: 'object',
  properties: {
    viewers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          boQuaOGiay: { type: 'number', nullable: true },
          lyDo: { type: 'string' },
          muonLuu: { type: 'boolean' },
          muonGuiChoAiDo: { type: 'boolean' },
          binhLuan: { type: 'string', nullable: true },
        },
        required: ['id', 'lyDo', 'muonLuu', 'muonGuiChoAiDo'],
      },
    },
    giayRoiRungNang: { type: 'number', nullable: true },
    goiYSua: { type: 'string' },
  },
  required: ['viewers', 'goiYSua'],
};

export async function runAudienceGate(spec: ScriptSpec): Promise<AudienceGateResult> {
  const timeline = buildTimeline(spec);
  const personas = VIEWER_PERSONAS.map((p) => `- ${p.id}: ${p.desc}`).join('\n');

  const res = await llmTextFull({
    system: SYSTEM,
    prompt:
      `BẢY NGƯỜI XEM:\n${personas}\n\n` +
      `CLIP (dọc 9:16, xem trên điện thoại):\n\n${timeline}\n\n` +
      `Với mỗi người trong bảy người trên, trả lời: họ lướt đi ở giây thứ mấy ` +
      `(boQuaOGiay, để null nếu xem hết), vì sao (lyDo), có muốn lưu lại không ` +
      `(muonLuu), có muốn gửi cho ai đó không (muonGuiChoAiDo), và họ sẽ bình ` +
      `luận gì nếu có (binhLuan, null nếu không bình luận gì).\n\n` +
      `Sau đó cho biết giây nào bị nhiều người bỏ đi nhất (giayRoiRungNang) và ` +
      `một chỉ dẫn sửa cụ thể (goiYSua).`,
    json: true,
    jsonSchema: SCHEMA,
    maxTokens: 2600,
    temperature: 0.7,
  });

  const parsed = parseLlmJson(res.text) as {
    viewers?: ViewerVerdict[];
    giayRoiRungNang?: number | null;
    goiYSua?: string;
  } | null;

  const viewers: ViewerVerdict[] = Array.isArray(parsed?.viewers) ? parsed!.viewers : [];
  const issues: GateIssue[] = [];

  // Model không trả đủ 7 ý kiến ⇒ KHÔNG suy ra tỉ lệ từ mẫu thiếu rồi cho qua.
  // Fail-CLOSED có chủ đích: cổng này gác đầu ra công khai, đoán bừa theo hướng
  // dễ dãi là đúng thứ nó sinh ra để chặn.
  if (viewers.length < VIEWER_PERSONAS.length) {
    issues.push({
      level: 'block',
      code: 'audience.incomplete',
      message: `Hội đồng chỉ trả về ${viewers.length}/${VIEWER_PERSONAS.length} ý kiến — không đủ mẫu để kết luận.`,
      fix: 'Chạy lại cổng 2. Lặp lại nhiều lần thì xem lại prompt hoặc hạ số persona.',
    });
  }

  const n = viewers.length || 1;
  const xemHet = viewers.filter((v) => v.boQuaOGiay === null || v.boQuaOGiay === undefined).length;
  const luu = viewers.filter((v) => v.muonLuu).length;
  const chiaSe = viewers.filter((v) => v.muonGuiChoAiDo).length;
  const luuHoacChiaSe = viewers.filter((v) => v.muonLuu || v.muonGuiChoAiDo).length;

  if (viewers.length === VIEWER_PERSONAS.length) {
    if (xemHet < AUDIENCE_THRESHOLDS.minXemHet) {
      const som = viewers
        .filter((v) => typeof v.boQuaOGiay === 'number')
        .sort((a, b) => (a.boQuaOGiay ?? 0) - (b.boQuaOGiay ?? 0))
        .slice(0, 3)
        .map((v) => `${v.id} bỏ ở ${v.boQuaOGiay}s (${v.lyDo})`)
        .join(' · ');
      issues.push({
        level: 'block',
        code: 'audience.low-completion',
        message: `Chỉ ${xemHet}/${VIEWER_PERSONAS.length} người xem hết (cần ${AUDIENCE_THRESHOLDS.minXemHet}). Bỏ sớm nhất: ${som}`,
        fix: parsed?.goiYSua || 'Viết lại câu mở đầu và cắt phần giữa.',
      });
    }
    if (luuHoacChiaSe < AUDIENCE_THRESHOLDS.minLuuHoacChiaSe) {
      issues.push({
        level: 'block',
        code: 'audience.no-save-share',
        message: `Chỉ ${luuHoacChiaSe}/${VIEWER_PERSONAS.length} người muốn lưu hoặc gửi cho ai đó — clip thiếu lý do để lan đi.`,
        fix: 'Thêm một thông tin cụ thể đáng lưu lại, hoặc một điểm khiến người xem nghĩ tới một người quen cụ thể.',
      });
    }
    // Người lướt vô định bỏ rất sớm là dấu hiệu clip chỉ phục vụ được tệp sẵn có.
    const voDinh = viewers.find((v) => v.id === 'luot-vo-dinh');
    if (voDinh && typeof voDinh.boQuaOGiay === 'number' && voDinh.boQuaOGiay <= 3) {
      issues.push({
        level: 'warn',
        code: 'audience.niche-only',
        message: `Người lướt vô định bỏ ngay ở ${voDinh.boQuaOGiay}s — clip khó ra khỏi tệp đã quan tâm tử vi.`,
      });
    }
  }

  return {
    pass: !issues.some((i) => i.level === 'block'),
    tiLeXemHetDuBao: Number((xemHet / n).toFixed(2)),
    tiLeMuonLuu: Number((luu / n).toFixed(2)),
    tiLeMuonChiaSe: Number((chiaSe / n).toFixed(2)),
    giayRoiRungNang: parsed?.giayRoiRungNang ?? null,
    viewers,
    issues,
    goiYSua: parsed?.goiYSua || '',
    meta: { provider: res.provider, model: res.model, durationMs: res.durationMs },
  };
}

// ── Về việc hiệu chỉnh ngưỡng ─────────────────────────────────────────────
// `minXemHet = 5/7` và `minLuuHoacChiaSe = 2/7` hiện là PHỎNG ĐOÁN BAN ĐẦU,
// chưa đo phân bố. Trước khi tin vào chúng phải chạy cổng trên vài chục kịch
// bản mẫu (cả tốt lẫn cố ý dở) rồi xem phân bố: nếu gần như cái nào cũng qua
// thì ngưỡng vô nghĩa, nếu cái nào cũng trượt thì nó chỉ là một cái cổng bị
// tắt. Đây đúng cách đã làm với thang điểm Ngũ Hành Tên (đo trên lưới 11.200
// ca trước khi chốt mức).
