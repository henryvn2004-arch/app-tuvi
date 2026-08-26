// lib/agent/nguoi-khac-prompt.ts
// ============================================================
// Prompt cho tool "Lá số người khác" — cẩm nang ứng xử (T1).
//
// ⚠️ ĐỌC PHẦN LUẬT ĐẠO ĐỨC TRƯỚC KHI SỬA BẤT CỨ GÌ Ở ĐÂY.
// Tool này đọc lá số của một người KHÔNG CÓ MẶT và không đồng ý. Khung duy
// nhất được phép là HIỂU ĐỂ SỐNG CHUNG. Mọi câu chữ hướng tới "khai thác điểm
// yếu", "cách khiến họ nghe lời", "chỗ dễ bị lung lay" đều bị cấm — không phải
// vì nghe xấu, mà vì đó là biến một bản mô tả tính cách thành công cụ dùng lên
// người khác sau lưng họ.
//
// Ràng buộc thứ hai nằm ở TẦNG DỮ LIỆU chứ không ở đây: `lib/engine/nguoi-khac.ts`
// CỐ Ý không trả về cung Tật Ách / Tài Bạch / Phu Thê / Tử Tức / Điền Trạch của
// người đó. Model không có gì để luận về sức khoẻ, tiền riêng, hôn nhân của họ
// kể cả khi bị dụ. Hai lớp, vì một lớp lời dặn thì lách được.
// ============================================================

import type { NguoiKhacProfile } from '@/lib/engine/nguoi-khac';
import { ARC_GIONG_NGUOI } from '@/lib/agent/prompts';
import { vanNamLine, LUAT_VAN_NAM_AN_CUNG } from '@/lib/engine/cong-so';
import { matDocBlock } from '@/lib/agent/rail-blocks';

export const NGUOI_KHAC_SYSTEM_PROMPT = `Bạn là một người xem tử vi lâu năm, đang viết một BẢN CẨM NANG ỨNG XỬ cho người đến hỏi.

Người đến hỏi mang tới lá số của MỘT NGƯỜI KHÁC — sếp, đồng nghiệp, cấp dưới, đối tác, cha mẹ, con cái, bạn đời hoặc bạn bè. Họ không hỏi "người này sướng khổ ra sao". Họ hỏi: LÀM SAO SỐNG CHUNG / LÀM VIỆC ĐƯỢC VỚI NGƯỜI NÀY.

== KHUNG DUY NHẤT ĐƯỢC PHÉP ==
HIỂU ĐỂ SỐNG CHUNG. Không phải hiểu để điều khiển.
- CẤM mọi câu mang nghĩa thao túng: "cách khiến họ phải nghe", "điểm yếu để tấn công", "chỗ dễ lung lay", "khai thác", "nắm thóp", "dắt mũi", "lợi dụng".
- Nói về chỗ mạnh chỗ yếu thì nói theo lối MÔ TẢ KHÁC BIỆT: người này hợp cách làm nào, không hợp cách nào, nên đưa việc tới họ kiểu gì cho êm. Đó là thông tin để hai bên đỡ va nhau, không phải vũ khí.
- CẤM phán giá trị con người: không "người này tệ / khó ưa / ích kỷ". Tính cách không tốt cũng không xấu — chỉ hợp hoặc không hợp bối cảnh.
- Người được xem KHÔNG có mặt. CẤM viết như thể bạn đã gặp họ, đã quan sát họ, hay biết chuyện đời họ. Bạn chỉ đang đọc một lá số.

== CẤM TUYỆT ĐỐI (nội dung) ==
- CẤM nói về SỨC KHOẺ, BỆNH TẬT, TAI NẠN của người này.
- CẤM nói về TIỀN BẠC riêng, HÔN NHÂN, CHUYỆN CON CÁI của họ — trừ khi chính người hỏi là bạn đời hoặc là cha mẹ, và cũng chỉ ở mức cách cư xử với nhau.
- CẤM đoán ngoại hình.
- CẤM dự đoán chuyện xấu sẽ xảy đến với họ.
- CẤM gọi đây là "trắc nghiệm tính cách", "khoa học", "đã kiểm định", "thống kê trên N người". CẤM đối chiếu với DISC / MBTI / Big Five. Không có nghiên cứu nào đứng sau nó — đây là MỘT KHUNG ĐỌC theo cổ pháp Tử Vi, nói vậy là đủ và vẫn đáng đọc.

== BÁM DỮ LIỆU ==
- Chỉ dùng số liệu trong phần DỮ KIỆN bên dưới. CẤM bịa thêm sao, cung, cách cục, điểm số.
- CẤM đọc thô tên sao/tên cung như bùa chú ("vì Thất Sát ở Mệnh nên..."). Được nêu tên sao MỘT-HAI lần cho có gốc, còn lại phải nói bằng tiếng người: việc gì, tình huống nào, nói câu gì.
- Chỉ ĐẠI VẬN mới có điểm/10 thật. CẤM bịa điểm cho cung hay cho năm.
- Chỗ nào dữ kiện ghi "mượn xung chiếu" thì đó là cung trống phải mượn — được dùng, nhưng đừng nói chắc như cung có sao thật.

== GIỌNG ==
Viết cho người Việt đi làm đọc trong 3 phút. Câu ngắn, cụ thể, nói thẳng. Không rào đón "có thể / nhìn chung / tương đối". Không dùng "bạn" để gọi người được xem — gọi là "người này" hoặc theo vai (sếp, đồng nghiệp, con...). Người đọc thì xưng "bạn".
${ARC_GIONG_NGUOI}

Phần NÊN NÓI / TRÁNH NÓI là phần người ta trả tiền để lấy — mỗi mục phải là một việc LÀM ĐƯỢC NGAY, kèm một ví dụ câu nói thật, không phải lời khuyên chung chung kiểu "hãy tôn trọng họ".`;

const TIER = (n: number | null) => (n == null ? 'chưa chấm' : `${n}/10`);

export function buildNguoiKhacPrompt(p: NguoiKhacProfile, ten: string): string {
  const who = ten ? `"${ten}"` : 'người này';
  const L: string[] = [];

  L.push(`NGƯỜI ĐƯỢC XEM: ${who} · ${p.gioiTinh === 'nu' ? 'Nữ' : 'Nam'}`);
  L.push(`QUAN HỆ VỚI NGƯỜI HỎI: ${p.quanHe.label}`);
  L.push(`ĐIỀU NGƯỜI HỎI THẬT SỰ CẦN: ${p.quanHe.nhuCau}`);
  L.push(`VIỆC NGƯỜI HỎI ĐANG CẦN LÀM: ${p.viec.label}`);
  L.push(`THỨ HỌ CẦN NGHE CHO ĐÚNG VIỆC ĐÓ: ${p.viec.can}`);
  L.push('');

  L.push('— KIỂU NGƯỜI (suy từ chính tinh cung Mệnh và cung Quan Lộc) —');
  L.push(`Kiểu: ${p.kieu.ten} (${p.kieu.tuTuong}) — ${p.kieu.motCau}`);
  if (p.phan.lai && p.kieuPhu) {
    L.push(
      `⚠️ Lá số này nằm SÁT RANH GIỚI giữa hai kiểu: ${p.kieu.ten} và ${p.kieuPhu.ten}. ` +
        `Phải nói ra là người này pha hai kiểu, ĐỪNG ép về một nhãn — nói chắc điều mình không chắc là chỗ mất uy tín nhanh nhất.`,
    );
    L.push(`Kiểu phụ: ${p.kieuPhu.ten} — ${p.kieuPhu.motCau}`);
  }
  L.push(`Động lực gốc: ${p.kieu.dongLuc}`);
  L.push(`Đạt chất (nhận ra ngay ở chỗ làm): ${p.kieu.datChat}`);
  L.push(`Câu hỏi chạy ngầm trong đầu họ trước mỗi quyết định: ${p.kieu.cauHoi.join(' · ')}`);
  L.push(`Khi được giao quyền, họ dẫn người kiểu: ${p.kieu.kieuDan}`);
  L.push(`Mạnh ở: ${p.kieu.manh}`);
  L.push(`Chỗ dễ hụt: ${p.kieu.yeu}`);
  L.push(`Hợp môi trường: ${p.kieu.moiTruongHop}`);
  L.push(`Kỵ môi trường: ${p.kieu.moiTruongKy}`);
  if (p.phan.vaiTro) L.push(`Vai trò theo cung Mệnh: ${p.phan.vaiTro.role}`);
  L.push('');

  L.push('— CÁC MẶT ĐỌC ĐƯỢC TRONG LÁ SỐ —');
  for (const m of p.matDoc) {
    const sao = m.sao.length ? m.sao.join(', ') : '(không có chính tinh)';
    L.push(
      `• ${m.nhan} (cung ${m.cung}${m.muon ? ', MƯỢN xung chiếu' : ''}): ${sao}` +
        (m.cachCuc.length ? `\n   Cách cục: ${m.cachCuc.join('; ')}` : '') +
        `\n   Dùng để nói về: ${m.y}`,
    );
  }
  if (p.than) L.push(`• Cung an Thân: ${p.than.cung} — ${p.than.y}`);
  L.push('');

  L.push('— LÚC NÀY HỌ ĐANG Ở ĐÂU TRONG ĐỜI —');
  // 🔑 CỐ Ý KHÔNG nêu TÊN CUNG mà đại vận / tiểu hạn đang đóng — chỉ nêu điểm
  // và đà. Cung hạn rất hay rơi vào Tật Ách / Tài Bạch / Điền Trạch, tức đúng
  // những cung mà `KHONG_DOC` vừa chặn ở tầng dữ liệu; đưa tên cung vào đây là
  // mở lại đúng cánh cửa đó qua ngõ sau. Phần "thời điểm" chỉ cần biết họ đang
  // thuận hay đang căng, mà điểm/đà đã nói đủ.
  if (p.daiVan) {
    L.push(
      `Đại vận đang chạy: ${p.daiVan.tuoiStart}–${p.daiVan.tuoiEnd} tuổi` +
        (p.daiVan.sao.length ? `, sao ${p.daiVan.sao.join(', ')}` : '') +
        ` — điểm ${TIER(p.daiVan.diem)}`,
    );
  } else {
    L.push('Không đọc được đại vận đang chạy — ĐỪNG bịa, bỏ qua phần thời điểm hoặc nói theo vận năm.');
  }
  if (p.vanNam) {
    // 🐞 `anCung` BẮT BUỘC ở đây. Trước đây dòng này gọi `vanNamLine` trơn nên
    // in ra "tiểu hạn cung Tật Ách" / "lưu niên cung Tài Bạch" — tức chính cái
    // ngõ sau mà chú thích ngay phía trên đã cảnh báo, và nó mở thật: đo trên
    // `git HEAD` là **23/48 lá số (~48%)** lọt tên cung cấm vào prompt.
    L.push(`Vận năm ${vanNamLine(p.vanNam, { anCung: true })}`);
    L.push(LUAT_VAN_NAM_AN_CUNG);
  }
  L.push('');

  if (p.voiBan) {
    L.push('— NGƯỜI NÀY TRONG LÁ SỐ CỦA CHÍNH NGƯỜI HỎI —');
    L.push(
      `Theo cổ pháp, hạng người này ứng với cung ${p.voiBan.cung} trong lá số người hỏi. ` +
        `Cung đó có: ${p.voiBan.sao.length ? p.voiBan.sao.join(', ') : '(không có chính tinh)'}` +
        `${p.voiBan.muon ? ' (mượn xung chiếu)' : ''}, nghiêng kiểu ${p.voiBan.kieuTen}.`,
    );
    L.push(
      p.voiBan.cungTinh
        ? 'Hai bên CÙNG tính âm/dương → cùng một cách phản ứng, nên dễ va vào nhau ở đúng chỗ giống nhau.'
        : 'Hai bên KHÁC tính âm/dương → một bên xông một bên giữ, dễ bù cho nhau nếu chia đúng việc.',
    );
    L.push('Viết mục "voiBan" dựa trên đây. Nói về CÁCH HAI BÊN VA VÀ BÙ NHAU, không phán ai đúng ai sai.');
    L.push('');
  } else {
    L.push('KHÔNG có lá số của người hỏi → BỎ TRỐNG mục "voiBan" (trả chuỗi rỗng). ĐỪNG viết chung chung cho có.');
    L.push('');
  }

  // 🔑 Khối `keHoach` là thứ DUY NHẤT trong cả bản luận không suy được từ lá số
  // — nó cần dữ kiện do chính người hỏi cấp. Trước khi có ô "việc cần làm",
  // prompt này nhận đúng cùng một hồ sơ với bản tính thử miễn phí, nên bản trả
  // tiền về mặt cấu trúc chỉ có thể diễn đạt lại thứ người ta đã đọc.
  if (p.viec.id !== 'hieu-them') {
    L.push('— VIỆC NGƯỜI HỎI ĐANG VƯỚNG (phần đáng tiền nhất, viết kỹ nhất) —');
    L.push(
      `Người hỏi không đọc chơi. Họ đang phải: "${p.viec.label}". ` +
        `Mục "keHoach" phải trả lời ĐÚNG việc đó cho ĐÚNG người này — bám kiểu người, động lực gốc, ` +
        `chỗ dễ hụt và giai đoạn vận đã nêu ở trên. CẤM viết lời khuyên giao tiếp chung chung ` +
        `("hãy chân thành", "nên lắng nghe") — thứ đó đúng với mọi người nên không đáng tiền. ` +
        `Phải nêu được: mở lời thế nào, thứ tự trình bày ra sao, chỗ nào là bẫy với riêng người này.`,
    );
    L.push('');
  }

  L.push('— VIỆC CỦA BẠN —');
  L.push(`Viết bản cẩm nang ứng xử với ${who} trong vai trò "${p.quanHe.label}", trả về ĐÚNG một object JSON:`);
  L.push(`{
  ${
    p.viec.id !== 'hieu-them'
      ? `"keHoach":   "4–6 câu: cách đi cụ thể cho việc \\"${p.viec.label}\\" với RIÊNG người này. Mở lời ra sao, trình bày theo thứ tự nào, tránh bẫy nào. Phải khác hẳn một lời khuyên chung — đọc xong là làm được ngay.",`
      : `"keHoach":   "",`
  }
  "tinhKhi":   "3–4 câu tả con người này vận hành thế nào. Ngôi thứ ba. Cụ thể tới mức người quen họ đọc là gật đầu.",
  "chamNoc":   "2–3 câu: điều gì làm người này khó chịu, và vì sao — theo đúng động lực gốc ở trên. Mô tả, KHÔNG phải chỉ dẫn cách chọc.",
  "coiTrong":  "2–3 câu: họ coi trọng cái gì, và sợ mất cái gì. Đây là chỗ quyết định mọi cách nói chuyện bên dưới.",
  "nenNoi":    [{"viec":"việc làm được ngay, 1 câu","vidu":"một câu nói thật, đặt trong ngoặc kép"}],
  "tranhNoi":  [{"viec":"việc nên tránh, 1 câu","vidu":"một câu KHÔNG nên nói, đặt trong ngoặc kép"}],
  "thoiDiem":  "2–3 câu: giai đoạn này của họ đang thuận hay đang căng, nên đưa việc lớn tới lúc nào. Bám đại vận/vận năm ở trên, KHÔNG bịa số.",
  "voiBan":    "3–4 câu về chỗ hai bên dễ va và chỗ bù được — CHỈ viết khi có dữ kiện lá số người hỏi, không có thì trả chuỗi rỗng.",
  "motCau":    "MỘT câu chốt đáng nhớ, đọc xong kể lại được cho người khác nghe."
}`);
  L.push('`nenNoi` và `tranhNoi` mỗi mảng ĐÚNG 3 mục.');
  if (p.viec.id === 'hieu-them') {
    L.push('Người hỏi KHÔNG nêu việc cụ thể nào → trả `keHoach` là chuỗi RỖNG. Đừng viết chung chung cho có.');
  }
  L.push('Không thêm khoá nào khác. Không viết chữ nào ngoài JSON.');

  return L.join('\n');
}

export const NGUOI_KHAC_SCHEMA = {
  type: 'OBJECT',
  properties: {
    // Cố ý KHÔNG nằm trong `required` — cùng lối `voiBan`: có ca hợp lệ mà mục
    // này phải rỗng (người hỏi chọn "chỉ muốn hiểu thêm"), ép required thì model
    // buộc phải bịa ra một kế hoạch cho một việc không tồn tại.
    keHoach: { type: 'STRING' },
    tinhKhi: { type: 'STRING' },
    chamNoc: { type: 'STRING' },
    coiTrong: { type: 'STRING' },
    nenNoi: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { viec: { type: 'STRING' }, vidu: { type: 'STRING' } },
        required: ['viec', 'vidu'],
      },
    },
    tranhNoi: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { viec: { type: 'STRING' }, vidu: { type: 'STRING' } },
        required: ['viec', 'vidu'],
      },
    },
    thoiDiem: { type: 'STRING' },
    voiBan: { type: 'STRING' },
    motCau: { type: 'STRING' },
  },
  required: ['tinhKhi', 'chamNoc', 'coiTrong', 'nenNoi', 'tranhNoi', 'thoiDiem', 'motCau'],
  propertyOrdering: [
    'keHoach',
    'tinhKhi',
    'chamNoc',
    'coiTrong',
    'nenNoi',
    'tranhNoi',
    'thoiDiem',
    'voiBan',
    'motCau',
  ],
};

/**
 * Khối đóng vai nối vào system của rail khi người dùng hỏi tiếp về người này.
 *
 * Cùng lối `pastLifeRailWrapper`: CHỈ THÊM, không sửa/bớt phần lá số vốn có —
 * rail vẫn giữ nguyên toàn bộ khả năng luận lá số, chỉ đổi GÓC NHÌN.
 */
/**
 * Chi tiết KIỂU NGƯỜI cho rail.
 *
 * Vì sao cần: bản TRẢ TIỀN dựng đoạn văn từ chính mấy trường này (xem
 * `buildNguoiKhacPrompt` — `Động lực gốc`, `Đạt chất`, `Hợp/Kỵ môi trường`).
 * Người dùng ĐỌC đoạn đó rồi hỏi rail *"vì sao anh ấy kỵ môi trường kia?"* —
 * trước đây rail chỉ có nhãn kiểu + một câu, nên phải luận chay. Đúng họ lỗi
 * `thapThan` của Bát Tự: engine tính, người dùng đọc, model mù.
 *
 * Bảng KIỂU là quy chiếu TỰ ĐẶT của trang, model không suy lại được từ lá số —
 * nên không gửi là mất hẳn, khác với mấy cung vốn có sẵn trong lá số.
 */
function kieuBlock(k: {
  dongLuc?: string;
  datChat?: string;
  kieuDan?: string;
  moiTruongHop?: string;
  moiTruongKy?: string;
  manh?: string;
  yeu?: string;
}): string {
  const row = (nhan: string, v?: string) => (v ? `  ${nhan}: ${v}\n` : '');
  const s =
    row('Động lực gốc', k.dongLuc) +
    row('Nhận ra ngay ở chỗ làm', k.datChat) +
    row('Khi có quyền thì dẫn người kiểu', k.kieuDan) +
    row('Hợp môi trường', k.moiTruongHop) +
    row('Kỵ môi trường', k.moiTruongKy) +
    row('Mạnh', k.manh) +
    row('Chỗ hay vấp', k.yeu);
  return s ? `--- CHI TIẾT KIỂU NGƯỜI (dùng đúng mấy dòng này, đừng tự nghĩ thêm) ---\n${s}` : '';
}

/**
 * Mặt "với bạn" — cung trong lá số NGƯỜI XEM nói về hạng người này.
 *
 * 🔑 Đây là thứ rail KHÔNG có đường nào suy lại: nó bắc qua lá số THỨ HAI (của
 * chính người đang chat), mà rail chỉ nạp được lá số đang xem. Trang thì hiện
 * hẳn khối này. Không gửi ⇒ hỏi *"tôi với người này hợp nhau chỗ nào"* là model
 * luận chay trên đúng câu hỏi tool sinh ra để trả lời.
 */
function voiBanBlock(v: NguoiKhacProfile['voiBan']): string {
  if (!v) return '';
  let s = `--- ĐỐI CHIẾU VỚI LÁ SỐ NGƯỜI ĐANG CHAT (họ có đưa lá số của mình) ---\n`;
  s += `  Cung ${v.cung} trong lá số NGƯỜI ĐANG CHAT nói về hạng người này`;
  s += v.muon ? ' (vô chính diệu — mượn xung chiếu)' : '';
  s += v.sao && v.sao.length ? `: ${v.sao.join(', ')}` : '';
  s += '\n';
  if (v.kieuTen) s += `  Cung đó mô tả một người kiểu: ${v.kieuTen}\n`;
  if (v.khop != null)
    s += v.khop
      ? '  → TRÙNG kiểu của người trong lá số: thứ họ mong gặp đúng là thứ người kia vốn có.\n'
      : '  → KHÁC kiểu của người trong lá số: chỗ lệch giữa cái họ mong và người thật.\n';
  s += v.cungTinh
    ? '  Hai kiểu CÙNG tính âm/dương → phản ứng giống nhau nên dễ va nhau.\n'
    : '  Hai kiểu KHÁC tính âm/dương → dễ bù cho nhau hơn là va nhau.\n';
  return s;
}

export function nguoiKhacRailWrapper(p: NguoiKhacProfile, tenRaw: string): string {
  // Tên do người dùng gõ → chỉ đi vào system sau khi bóc hết ký tự có thể dùng
  // để bẻ prompt (xuống dòng, ngoặc nhọn, backtick) và cắt ngắn. Cùng lối phòng
  // thủ với việc `wrap` là ENUM chứ không phải chuỗi tự do.
  const ten = String(tenRaw || '')
    .replace(/[\r\n`{}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  const who = ten ? `"${ten}"` : 'người này';
  return `

=== ĐANG XEM LÁ SỐ CỦA NGƯỜI KHÁC — ĐỌC KỸ, KHỐI NÀY ĐÈ LÊN MỌI LUẬT Ở TRÊN ===
Lá số ở trên KHÔNG phải của người đang chat. Đó là lá số của ${who}, quan hệ với người chat: ${p.quanHe.label}.

- ⚠️ ĐÈ LÊN LUẬT XƯNG HÔ: dòng "Người xem" (nếu có ở trên) mô tả NGƯỜI TRONG LÁ SỐ, KHÔNG phải người đang chat. TUYỆT ĐỐI không suy giới tính của người đang chat từ lá số này. Gọi người đang chat là "quý vị".
- Người trong lá số gọi là "${ten || p.quanHe.label}" hoặc theo vai (sếp, đồng nghiệp, con...).
- Mọi câu trả lời phải quy về CÂU HỎI THẬT: làm sao sống chung / làm việc được với người này. Không luận đời họ như luận cho chính chủ.
- Khung DUY NHẤT: hiểu để sống chung, KHÔNG phải hiểu để điều khiển. CẤM ngôn ngữ thao túng ("nắm thóp", "khai thác điểm yếu", "cách khiến họ phải nghe").
- CẤM luận SỨC KHOẺ, BỆNH TẬT, TIỀN RIÊNG, HÔN NHÂN của người này${p.quanHe.id === 'ban-doi' ? ' (riêng chuyện hai người với nhau thì được, ở mức cách cư xử)' : ''}. Người đó không có mặt để đồng ý.
- CẤM phán giá trị ("người này tệ/khó ưa"). Tính cách chỉ hợp hoặc không hợp bối cảnh.
- Kiểu người theo khung này: ${p.kieu.ten} — ${p.kieu.motCau}${p.phan.lai && p.kieuPhu ? ` (SÁT RANH GIỚI với kiểu ${p.kieuPhu.ten}, phải nói rõ là pha, đừng ép nhãn)` : ''}.${p.viec.id === 'hieu-them' ? '' : `
- Việc người chat đang vướng: ${p.viec.label}. Câu hỏi mơ hồ thì kéo về đúng việc đó, đừng luận lan man.`}
${kieuBlock(p.kieu)}${matDocBlock(p.matDoc, 'CÁC MẶT TOOL NÀY ĐỌC (đúng mấy cung này, đúng vai này)')}${voiBanBlock(p.voiBan)}
- CẤM gọi đây là trắc nghiệm/khoa học/đã kiểm định, CẤM đối chiếu DISC/MBTI.
=== HẾT KHỐI NGƯỜI KHÁC ===`;
}
