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
import { describeImage } from './stock-catalog';
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
  /**
   * Thuật toán có ĐẨY clip này tới người đó không — tức chủ đề có nằm trong
   * vùng quan tâm của họ không. Xem chú thích ở `AUDIENCE_THRESHOLDS`.
   */
  trongTepMucTieu?: boolean;
}

/** Trần ký tự cổng 1 sẽ chấm — hội đồng phải viết gợi ý NẰM TRONG mức này. */
export interface AudienceBudget {
  hookMaxChars: number;
  sceneMaxChars: number;
}

export interface AudienceGateResult {
  pass: boolean;
  /** Số người nằm trong tệp chủ đề — mẫu số THẬT của phép chấm giữ chân. */
  soTrongTep: number;
  soXemHetTrongTep: number;
  /** Tỉ lệ persona xem hết trên CẢ BẢY — giữ lại để đối chiếu, không dùng để chấm. */
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

/**
 * Ngưỡng qua cổng — tính trên TỆP MỤC TIÊU, không trên cả bảy người.
 *
 * 🔴 ĐÂY LÀ BẢN VÁ CỦA MỘT NGƯỠNG BẤT KHẢ THI, đo trên lượt khảo sát 24 kịch bản.
 *
 * Ngưỡng cũ là `5/7 xem hết`. Nhưng ba chân dung `cuoi-28` (sắp cưới) ·
 * `kd-42` (chọn ngày khai trương) · `me-33` (dạy con) có mối quan tâm LOẠI TRỪ
 * NHAU — một clip 30 giây không thể vừa nói chuyện cưới xin vừa nói chuyện khai
 * trương vừa nói chuyện dạy con. Đọc lý do bỏ trong log thì thấy rõ: cả ba đều
 * bỏ vì *"nội dung không liên quan đến điều tôi đang tìm"*, không phải vì clip
 * dở. Cộng thêm `luot-vo-dinh` vốn cố ý khó giữ ⇒ trần thực tế của một clip chủ
 * đề hẹp là **4/7**, tức ngưỡng 5/7 KHÔNG THỂ ĐẠT dù hook có hay tới đâu.
 *
 * Bằng chứng ngược: đúng hai clip qua được cổng trong lượt đó là `nap-am` (mệnh
 * nạp âm — ai cũng có) và `vi-sao-hay-hoan-lai` (thói trì hoãn — ai cũng dính).
 * Cả hai đều là chủ đề PHỔ QUÁT. Tức cổng đang đo ĐỘ RỘNG CHỦ ĐỀ chứ không đo
 * chất lượng clip — mà độ rộng chủ đề là việc của thuật toán phân phối, không
 * phải thứ viết lại hook sửa được.
 *
 * ⚠️ Đây là sửa PHÉP ĐO, không phải hạ chuẩn — đúng lối đã dùng cho
 * `viral.no-invite` khi nó kêu oan 11/17 (*"nới bằng một tính chất ĐO ĐƯỢC"*).
 * Chấm lại toàn bộ 24 kịch bản của lượt khảo sát bằng luật mới thì **đúng MỘT
 * clip đổi kết luận** (`tuong-hop`: 4/7 thô → 4/5 trong tệp → qua); 21 clip
 * trượt vẫn trượt. Nó không biến cổng thành thủ tục trang trí.
 *
 * 🔑 Hai chốt giữ cho luật này không tự tắt đi:
 *   · `luot-vo-dinh` LUÔN tính là trong tệp — ép ở tầng mã, không hỏi model.
 *     Đó là phép thử hook nguội duy nhất; miễn cho nó là bỏ luôn cái cổng.
 *   · Tệp mục tiêu dưới `minTrongTep` ⇒ báo `audience.too-narrow` chứ không cho
 *     qua. Chủ đề hẹp tới mức không ai chấm được là một kết luận CÓ THẬT.
 */
export const AUDIENCE_THRESHOLDS = {
  /** Tỉ lệ người TRONG TỆP phải xem hết. 0,7 × 7 = 5 — giữ đúng mức cũ khi cả bảy đều trong tệp. */
  tiLeXemHetTrongTep: 0.7,
  /** Sàn tuyệt đối: dưới ngần này người xem hết thì tỉ lệ đẹp cũng vô nghĩa. */
  minXemHetTuyetDoi: 3,
  /** Tệp mục tiêu nhỏ hơn mức này thì mẫu quá mỏng để kết luận. */
  minTrongTep: 4,
  /** Số người (trong tệp) phải muốn lưu HOẶC gửi cho ai đó. */
  minLuuHoacChiaSe: 2,
} as const;

/** Số người trong tệp phải xem hết, suy từ cỡ tệp. */
export function soXemHetCanCo(soTrongTep: number): number {
  return Math.max(
    AUDIENCE_THRESHOLDS.minXemHetTuyetDoi,
    Math.ceil(soTrongTep * AUDIENCE_THRESHOLDS.tiLeXemHetTrongTep)
  );
}

/**
 * Dựng bảng thời gian có mốc giây để model biết "giây thứ mấy" là chỗ nào.
 * Không có mốc này thì câu trả lời về điểm dừng chỉ là số bịa.
 */
function buildTimeline(spec: ScriptSpec): string {
  const lines: string[] = [];
  let t = 0;

  /**
   * NỀN CLIP — trước đây KHÔNG hề được nhắc trong bảng thời gian.
   *
   * 🔴 Đây là bug nặng nhất của cổng 2, không phải chuyện thiếu chi tiết: 4/6
   * kịch bản insight có `backdrop`, tức hội đồng đã chấm chúng NHƯ THỂ clip
   * chỉ có chữ trên nền phẳng — rồi than đúng câu đó. Lời than "chỉ có chữ
   * trên nền xanh" phần lớn là do bảng thời gian nói vậy, không phải do clip.
   */
  const bg = spec.backdrop ?? [];
  const bgDesc = bg.map((src) => describeImage(src));
  const hasBg = bg.length > 0;
  if (hasBg) {
    lines.push(
      `NỀN CHẠY SUỐT CLIP — ${bg.length} bức ảnh chụp thật, luân phiên chậm, ` +
        `có hiệu ứng phóng nhẹ (Ken Burns), phủ một lớp tối mỏng cho chữ đọc được:\n` +
        bgDesc.map((d, i) => `   ${i + 1}. ${d}`).join('\n')
    );
  }

  /** Nền của MỘT cảnh chữ — phụ thuộc clip có ảnh nền hay không. */
  const typoBase = hasBg
    ? 'Chữ lớn giữa màn hình, sáng dần theo nhịp đọc, đặt trên một khối nền mờ ' +
      'viền vàng nổi trên bức ảnh nền đang chạy.'
    : 'Chữ lớn phủ giữa màn hình, sáng dần theo nhịp đọc, nền xanh đậm phẳng.';

  /** `accent` = cụm chữ được tô VÀNG. Trước đây không bao giờ tới hội đồng. */
  const withAccent = (base: string, accent?: string) =>
    accent ? `${base} Cụm "${accent}" tô vàng nổi bật.` : base;

  const push = (label: string, text: string, visual: string) => {
    const d = estimateSpeechSeconds(text);
    lines.push(
      `[${t.toFixed(1)}s–${(t + d).toFixed(1)}s] ${label}\n` +
        `   NGHE THẤY: "${text}"\n` +
        `   NHÌN THẤY: ${visual}`
    );
    t += d;
  };

  push(
    'MỞ ĐẦU',
    spec.hook,
    hasBg
      ? `Chữ lớn hiện ngay, trên khối nền mờ đặt giữa bức ảnh nền (${bgDesc[0]}).`
      : 'Chữ lớn hiện ngay giữa màn hình trên nền xanh đậm.'
  );

  spec.scenes.forEach((sc, i) => {
    let visual: string;
    if (sc.visual.kind === 'screen') {
      visual = `Quay màn hình thật của công cụ trên điện thoại${sc.visual.label ? ` — ${sc.visual.label}` : ''}.`;
    } else if (sc.visual.kind === 'image') {
      visual = withAccent(
        `Ảnh chụp chiếm cả khung, phóng chậm: ${describeImage(sc.visual.src, sc.visual.caption)}.`,
        sc.visual.accent
      );
    } else if (sc.visual.kind === 'typo') {
      // Hội đồng người xem chấm theo thứ họ NHÌN THẤY — mô tả sai loại cảnh
      // là họ chấm một clip khác với clip sắp render.
      visual = withAccent(typoBase, sc.visual.accent);
    } else {
      visual = withAccent(
        `Thẻ chữ: ${sc.visual.heading ?? ''} ${sc.visual.body ?? ''}`.trim(),
        sc.visual.accent
      );
    }
    const d = sc.forceSeconds ?? estimateSpeechSeconds(sc.text);
    lines.push(
      `[${t.toFixed(1)}s–${(t + d).toFixed(1)}s] CẢNH ${i + 1}\n` +
        `   NGHE THẤY: "${sc.text}"\n` +
        `   NHÌN THẤY: ${visual}`
    );
    t += d;
  });

  push(
    'KẾT',
    spec.cta,
    hasBg
      ? 'Thẻ chữ kèm logo và tên miền, vẫn trên bức ảnh nền.'
      : 'Thẻ chữ kèm logo và tên miền.'
  );

  lines.push(
    `\n(Toàn clip dài ${t.toFixed(1)} giây. Có phụ đề chạy suốt. ` +
      `${spec.music ? 'Có nhạc nền nhẹ dưới giọng đọc.' : 'KHÔNG có nhạc nền.'})`
  );
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
7. trongTepMucTieu — TÁCH BẠCH hai chuyện khác hẳn nhau:
   · Người này bỏ đi vì clip DỞ (mở đầu nhạt, khó hiểu, không tin, lê thê)
     → trongTepMucTieu = true. Đây là lỗi của clip.
   · Người này bỏ đi vì CHỦ ĐỀ không thuộc mối quan tâm của họ (đang tìm chuyện
     cưới xin mà clip nói chuyện khai trương) → trongTepMucTieu = false. Thuật
     toán sẽ không đẩy clip này tới họ, nên đây KHÔNG phải lỗi của clip.
   Xem hết clip ⇒ luôn true. Chân dung "luot-vo-dinh" ⇒ LUÔN true, không có
   ngoại lệ: người đó là phép thử "clip có giữ được người dưng không".
8. 🔴 goiYSua PHẢI NẰM TRONG NGÂN SÁCH KÝ TỰ ghi ở cuối phần đề bài. Câu bạn đề
   nghị sẽ được đưa thẳng cho người viết lại dùng gần như nguyên văn, rồi bị một
   bộ đếm máy chấm lại. Đề nghị một câu mở đầu dài hơn trần là bạn vừa ra lệnh
   cho họ trượt — và cả lượt sửa đó mất trắng. Cần hay thì cắt CHỮ, đừng cắt Ý.

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
          trongTepMucTieu: { type: 'boolean' },
        },
        required: ['id', 'lyDo', 'muonLuu', 'muonGuiChoAiDo', 'trongTepMucTieu'],
      },
    },
    giayRoiRungNang: { type: 'number', nullable: true },
    goiYSua: { type: 'string' },
  },
  required: ['viewers', 'goiYSua'],
};

export async function runAudienceGate(
  spec: ScriptSpec,
  budget?: AudienceBudget
): Promise<AudienceGateResult> {
  const timeline = buildTimeline(spec);
  const personas = VIEWER_PERSONAS.map((p) => `- ${p.id}: ${p.desc}`).join('\n');

  const res = await llmTextFull({
    system: SYSTEM,
    prompt:
      `BẢY NGƯỜI XEM:\n${personas}\n\n` +
      `CLIP (dọc 9:16, xem trên điện thoại):\n\n${timeline}\n\n` +
      `Với mỗi người trong bảy người trên, trả lời: họ lướt đi ở giây thứ mấy ` +
      `(boQuaOGiay, để null nếu xem hết), vì sao (lyDo), chủ đề có thuộc mối ` +
      `quan tâm của họ không (trongTepMucTieu), có muốn lưu lại không ` +
      `(muonLuu), có muốn gửi cho ai đó không (muonGuiChoAiDo), và họ sẽ bình ` +
      `luận gì nếu có (binhLuan, null nếu không bình luận gì).\n\n` +
      `Sau đó cho biết giây nào bị nhiều người bỏ đi nhất (giayRoiRungNang) và ` +
      `một chỉ dẫn sửa cụ thể (goiYSua).` +
      (budget
        ? `\n\n🔴 NGÂN SÁCH KÝ TỰ — goiYSua PHẢI tôn trọng, đây là trần máy sẽ chấm:\n` +
          `· câu mở đầu bạn đề nghị: TỐI ĐA ${budget.hookMaxChars} ký tự\n` +
          `· mỗi câu trong cảnh bạn đề nghị: TỐI ĐA ${budget.sceneMaxChars} ký tự\n` +
          `Đề nghị dài hơn mức này thì lượt sửa mất trắng, và clip trượt đúng chỗ ` +
          `bạn vừa bảo họ sửa.`
        : ''),
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
    // Chặn thì đúng, nhưng chặn mà IM thì lần sau vẫn phải đi chẩn lại từ đầu.
    // Lượt khảo sát 24 kịch bản có đúng một clip rơi vào đây (`xem-tuoi-sinh-con`,
    // 0/7 ý kiến) và không có gì để lần: mất mạng? model trả rỗng? bị cắt vì
    // chạm `maxTokens`? Ba nguyên nhân đó cần ba cách sửa khác hẳn nhau.
    console.error(
      `[gate-audience] hội đồng trả ${viewers.length}/${VIEWER_PERSONAS.length} ý kiến ` +
        `(provider=${res.provider}, model=${res.model}, ${res.durationMs}ms). ` +
        `Bản thô ${res.text.length} ký tự, ` +
        `mở đầu: ${JSON.stringify(res.text.slice(0, 200))}, ` +
        `đuôi: ${JSON.stringify(res.text.slice(-120))}`
    );
    issues.push({
      level: 'block',
      code: 'audience.incomplete',
      message: `Hội đồng chỉ trả về ${viewers.length}/${VIEWER_PERSONAS.length} ý kiến — không đủ mẫu để kết luận.`,
      fix: 'Chạy lại cổng 2. Lặp lại nhiều lần thì xem lại prompt hoặc hạ số persona.',
    });
  }

  const daXemHet = (v: ViewerVerdict) => v.boQuaOGiay === null || v.boQuaOGiay === undefined;

  // Trong tệp = model nói có, HOẶC xem hết, HOẶC là người lướt vô định (ép ở
  // tầng mã — xem chú thích `AUDIENCE_THRESHOLDS`). Thiếu trường thì coi như
  // TRONG tệp: đoán theo hướng NGHIÊM khắc, model quên khai không được thành
  // đường lách.
  const trongTep = viewers.filter(
    (v) => v.id === 'luot-vo-dinh' || daXemHet(v) || v.trongTepMucTieu !== false
  );
  const ngoaiTep = viewers.filter((v) => !trongTep.includes(v));

  const n = viewers.length || 1;
  const xemHet = viewers.filter(daXemHet).length;
  const luu = viewers.filter((v) => v.muonLuu).length;
  const chiaSe = viewers.filter((v) => v.muonGuiChoAiDo).length;

  const xemHetTrongTep = trongTep.filter(daXemHet).length;
  const luuHoacChiaSe = trongTep.filter((v) => v.muonLuu || v.muonGuiChoAiDo).length;
  const can = soXemHetCanCo(trongTep.length);

  if (viewers.length === VIEWER_PERSONAS.length) {
    if (trongTep.length < AUDIENCE_THRESHOLDS.minTrongTep) {
      // KHÔNG cho qua. Chủ đề hẹp tới mức chỉ còn vài người chấm được là một
      // kết luận có thật, và là thứ phải sửa ở NGUỒN kịch bản chứ không phải ở
      // câu mở đầu — nên nói thẳng thay vì để nó lẫn vào lỗi giữ chân.
      issues.push({
        level: 'block',
        code: 'audience.too-narrow',
        message:
          `Chỉ ${trongTep.length}/${VIEWER_PERSONAS.length} người nằm trong tệp chủ đề ` +
          `(cần ≥${AUDIENCE_THRESHOLDS.minTrongTep}) — clip nói với một nhóm quá hẹp để đo được.`,
        fix: 'Mở rộng góc tiếp cận: bắt đầu từ một câu hỏi ai cũng tự hỏi, rồi mới thu về chủ đề riêng.',
      });
    } else if (xemHetTrongTep < can) {
      const som = trongTep
        .filter((v) => typeof v.boQuaOGiay === 'number')
        .sort((a, b) => (a.boQuaOGiay ?? 0) - (b.boQuaOGiay ?? 0))
        .slice(0, 3)
        .map((v) => `${v.id} bỏ ở ${v.boQuaOGiay}s (${v.lyDo})`)
        .join(' · ');
      issues.push({
        level: 'block',
        code: 'audience.low-completion',
        message:
          `Chỉ ${xemHetTrongTep}/${trongTep.length} người TRONG TỆP xem hết (cần ${can})` +
          (ngoaiTep.length
            ? ` — đã trừ ${ngoaiTep.length} người ngoài tệp chủ đề (${ngoaiTep.map((v) => v.id).join(', ')})`
            : '') +
          `. Bỏ sớm nhất: ${som}`,
        fix: parsed?.goiYSua || 'Viết lại câu mở đầu và cắt phần giữa.',
      });
    }
    if (
      trongTep.length >= AUDIENCE_THRESHOLDS.minTrongTep &&
      luuHoacChiaSe < AUDIENCE_THRESHOLDS.minLuuHoacChiaSe
    ) {
      issues.push({
        level: 'block',
        code: 'audience.no-save-share',
        message: `Chỉ ${luuHoacChiaSe}/${trongTep.length} người trong tệp muốn lưu hoặc gửi cho ai đó — clip thiếu lý do để lan đi.`,
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
    soTrongTep: trongTep.length,
    soXemHetTrongTep: xemHetTrongTep,
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
// ĐÃ ĐO MỘT LƯỢT (24 kịch bản, khảo sát `gate_only` trên Actions). Phân bố tỉ lệ
// xem hết THÔ khi đó: 0% ×9 · 14% ×4 · 29% ×4 · 43% ×4 · 57% ×1 · 71% ×1 · 86% ×1
// ⇒ ngưỡng cũ 5/7 (71%) chỉ có 2/24 clip với tới. Đọc lý do bỏ thì thấy phần lớn
// là *"chủ đề không liên quan tới tôi"* — tức cổng đang đo độ rộng chủ đề, không
// đo chất lượng clip. Đó là lý do có `trongTepMucTieu`.
//
// ⚠️ Phân bố trên đo lúc VÒNG VIẾT LẠI CÒN HỎNG (model luôn trả thừa 1 cảnh nên
// gần như mọi bản sửa bị vứt). Nó nói đúng về ngưỡng, nhưng ĐỪNG dùng nó làm mốc
// so cho lượt sau — lượt sau vòng lặp chạy thật, phân bố sẽ dịch.
//
// Việc còn phải làm: sau vài lượt chạy thật, đếm lại xem `audience.too-narrow`
// có kêu oan không. Nếu nó bắt cả những clip chủ đề bình thường thì lỗi nằm ở
// chỗ model phân loại `trongTepMucTieu` quá tay, không phải ở ngưỡng 4.
