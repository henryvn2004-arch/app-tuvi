// lib/video/sources/insight.ts
// ============================================================
// ADAPTER NGUỒN: clip LAYER 1 — "insight về chính người xem".
//
// Khác `tool-demo.ts` ở đúng một chỗ, nhưng là chỗ căn bản: loại clip này
// KHÔNG quay màn hình. Nội dung kiểu *"có ba kiểu người khi bị tổn thương"*
// không có giao diện nào để quay — mà theo chiến lược kênh thì nó chiếm 70%
// lượng clip. Vì thế nó cần template riêng (`remotion/src/InsightClip.tsx`)
// và một `sourceType` riêng (`quote`) để cổng máy không đòi cảnh quay màn
// hình (luật `visual.no-screen` chỉ áp cho `tool-demo`).
//
// 🔑 ĐỊNH VỊ, quyết định mọi câu chữ bên dưới: mặt tiền là CON NGƯỜI (tính
// cách, cảm xúc, quan hệ), cổ học chỉ là cơ chế phía sau. Không mở clip bằng
// "tử vi nói rằng…" — mở bằng một điều bất thường về chính người xem.
//
// ⚠️ HAI CÁI BẪY của cổng 1 khi sửa mấy dòng này (đã vấp thật):
//  1. Chữ **`chọn`** nằm trong danh sách động từ THAO TÁC bị chặn ở hook và
//     nửa đầu số cảnh. "Kiểu thứ nhất *chọn* im lặng" trượt thẳng — phải viết
//     "Kiểu thứ nhất im lặng".
//  2. Phải có ≥ `ceil(số cảnh × 0,8)` lần nhắc người xem (`bạn · mình · tôi`)
//     trên toàn bộ hook + cảnh + câu kết.
// ============================================================

import type { ScriptSpec } from '../script-spec';

/** Kho ảnh công khai — 64 bức tranh quẻ đã sinh sẵn, dùng lại 0đ. */
const QUE = (file: string) =>
  `https://dciwkfdqhhddeymlisey.supabase.co/storage/v1/object/public/portraits/que-phuc-hy/${file}`;

export interface InsightSource {
  id: string;
  /** Nhãn nhỏ trên đỉnh clip — CHỦ ĐỀ, không phải tên công cụ. */
  topLabel: string;
  /** Công cụ mà clip này dẫn về. Dùng cho khâu đo chuyển đổi về sau. */
  toolId: string;
  spec: Omit<ScriptSpec, 'sourceType' | 'sourceId'>;
}

/**
 * Câu kết dùng chung — chỉ đúng MỘT lời mời, không chào hàng.
 *
 * 🔑 ĐÃ CẮT HAI LẦN, và cả hai lần đều theo một hướng: BỚT ĐI.
 *   · bản 1: câu hỏi + nơi tra + tên miền + mã khuyến mãi (bốn mẩu tin, 12s);
 *   · bản 2: bỏ câu hỏi vì cảnh cuối đã hỏi rồi;
 *   · bản 3 (bản này): Henry cắt tiếp *"một trong hơn 50 công cụ cổ học"* và
 *     *"Nhập mã TUVIMINHBAO nhận 100 lượng"* — **nghe giống bán hàng**.
 *
 * Đó là đánh đổi có ý thức: mất một chỗ quảng bá mã khuyến mãi và mất câu nói
 * về bề rộng kho công cụ, đổi lấy một đoạn kết không làm người xem tụt cảm xúc
 * ngay sau phần họ vừa thấy đúng về mình. Clip này bán bằng NỘI DUNG, không bán
 * bằng lời chào hàng ở giây cuối.
 *
 * ⚠️ Đừng nhét mã/khuyến mãi trở lại vì "để đo chuyển đổi". Muốn đo thì đo bằng
 * `utm` ở phần mô tả và bằng cột phễu theo tool, đừng đo bằng cách đọc mã lên.
 *
 * 🔴 BẢN ĐỌC PHẢI CÓ ĐỦ DẤU. Vbee đọc `tuviminhbao.com` thành một khối vô
 * nghĩa; mà tiếng Việt KHÔNG dấu thì bộ đọc không tách được thành từ (đã sai
 * một lần với `tu vi minh bảo`). Viết như TÊN RIÊNG: `Tử Vi Minh Bảo`.
 *
 * 🔑 `tool` — GỌI ĐÍCH DANH tên công cụ + NÓI RÕ DÙNG NÓ ĐỂ LÀM GÌ. Người xem
 * vừa nghe một điều mới về chính họ; câu kết phải nối thẳng vào phần *for what*
 * ngay trên nó, nếu không thì họ về trang chủ rồi lạc giữa 55 công cụ. Tên phải
 * khớp NGUYÊN VĂN `tool_pricing.label` — nói một cái tên không tìm thấy trên
 * site còn tệ hơn không nói tên nào.
 */
function cta(question: string, tool?: { ten: string; tenDoc?: string; de: string }) {
  // `tenDoc` — bản ĐỌC của tên công cụ, chỉ khai khi tên chứa ký tự bộ đọc xử
  // lý không chắc (`&` là ca đầu tiên: "Tử Vi Công Sở & Hướng Nghiệp"). Phụ đề
  // phải giữ NGUYÊN VĂN `tool_pricing.label` để người xem tìm đúng tên trên
  // site; đó là lý do không thể chỉ sửa một bản.
  const ten = tool?.ten ?? '';
  const tenDoc = tool?.tenDoc ?? ten;
  const noi = tool ? `Mở ${ten} ${tool.de}, tại tuviminhbao.com.` : `Tra tại tuviminhbao.com.`;
  const noiDoc = tool
    ? `Mở ${tenDoc} ${tool.de}, tại Tử Vi Minh Bảo chấm com.`
    : `Tra tại Tử Vi Minh Bảo chấm com.`;
  // `question` để RỖNG được — dùng khi chính cảnh cuối đã là câu hỏi, hỏi thêm
  // lần nữa ở câu kết là hỏi hai lần và đội thêm ~2 giây vào đúng đoạn người
  // xem rơi nhiều nhất. Cổng vẫn tính là có mời tương tác vì `viral.no-invite`
  // xét CẢ cảnh cuối lẫn câu kết.
  const ghep = (...v: string[]) => v.filter(Boolean).join(' ');
  return { cta: ghep(question, noi), ctaSpeech: ghep(question, noiDoc) };
}

const SOURCES: InsightSource[] = [
  // ── A2. BẢN ĐẦY ĐỦ — WHAT → WHY → FOR WHAT ──────────────────────────────
  //
  // 🔑 VÌ SAO CÓ BẢN NÀY, và vì sao nó ĐÃ VIẾT LẠI MỘT LẦN:
  //
  // Bản 25 giây ở dưới chỉ vừa đủ HOOK rồi hết — người xem chưa học được gì nên
  // nó đọc thành một mẩu quảng cáo. Bản đầy đủ đầu tiên chữa được độ dài nhưng
  // vẫn hụt đúng chỗ quan trọng nhất: nó **mô tả ba kiểu rồi mời đi tra**, tức
  // trả lời WHAT mà bỏ trống WHY và FOR WHAT. Phần "vì sao" khi đó chỉ là ba
  // câu cùng một khuôn *"đứa trẻ ngày xưa học được rằng…"* — nghe như văn kể,
  // người xem không mang đi được gì; còn "biết rồi thì dùng vào việc gì" thì
  // không có câu nào.
  //
  // Cấu trúc chốt (Henry duyệt):
  //   HOOK → CURIOSITY → **WHAT** (ba kiểu, mỗi kiểu 2 cảnh: hành vi + chỗ
  //   người ngoài hiểu nhầm) → **WHY** (cơ chế thật, kiến thức mang đi được)
  //   → **FOR WHAT** (dùng vào ba việc có thật) → PAYOFF → CTA gọi ĐÍCH DANH
  //   tên công cụ.
  //
  // 🔑 PHẦN WHY CỐ Ý KHÔNG BÁM TỬ VI. Đây là quyết định định vị, không phải
  // thiếu sót: mặt tiền là CON NGƯỜI, cổ học chỉ là cơ chế phía sau. Một lời
  // giải thích tra ngược được (bốn phản ứng của hệ thần kinh trước đe doạ —
  // đánh · chạy · đứng hình · chiều theo) thì người xem kiểm chứng được ở chỗ
  // khác, và chính vì thế nó làm site đáng tin hơn là tự khép kín trong bộ môn.
  //
  // 🔑 CHỖ NGƯỜI XEM HỌC ĐƯỢC CÁI MỚI nằm ở phản ứng THỨ TƯ. Ba cái đầu ai cũng
  // nghe rồi; "chiều theo" thì hiếm người biết là một phản xạ có tên — mà nó
  // đúng là kiểu phổ biến nhất trong gia đình Việt. Bỏ nó đi thì clip chỉ còn
  // nhắc lại thứ người ta đã biết, và đó là clip bị lướt.
  //
  // ⚠️ Cần chạy với trần độ dài nới ra (`--max-seconds`), xem `GateOptions`.
  //
  // ⚠️ TRÁNH HẲN CHỮ `bấm` trong cả kịch bản, dù nói về "nút" thì đó là từ tự
  // nhiên nhất. `bấm` nằm trong `HOW_TO_VERBS` và bị chặn ở NỬA ĐẦU số cảnh —
  // viết "nút nào bật lên" / "đang ở nút nào" thì đúng ở mọi vị trí, không phải
  // phụ thuộc vào việc sau này ai thêm bớt cảnh làm dịch mất ranh giới nửa đầu.
  {
    id: 'ba-kieu-ton-thuong-day-du',
    topLabel: 'Bạn là kiểu người nào',
    // Đúng `tool_pricing.tool_id` (KHÔNG phải `luan-giai` — đó là tên ở hệ
    // `events`). Ba hệ tên tool trong repo này vốn đã lệch nhau một lần và
    // suýt làm panel phễu đọc ra "24 người mở, 0 người mua".
    toolId: 'laso',
    spec: {
      title: 'Ba kiểu người khi bị tổn thương (bản đầy đủ)',
      hook: 'Có ba kiểu người khi bị tổn thương. Thật ra bạn không tự quyết.',
      scenes: [
        // ── CURIOSITY: vì sao chuyện này đáng nghe hết ──
        {
          text: 'Cách bạn phản ứng lúc đau không phải tính cách. Nó là một phản xạ.',
          visual: { kind: 'typo', accent: 'một phản xạ.' },
        },
        {
          text: 'Mà phản xạ thì có nguyên nhân. Biết nguyên nhân rồi, bạn nhìn khác hẳn.',
          visual: { kind: 'typo', accent: 'có nguyên nhân.' },
        },
        // ── WHAT · kiểu 1 ──
        {
          text: 'Kiểu thứ nhất: rút lui. Bạn không cãi, không giải thích, chỉ lặng đi.',
          visual: { kind: 'typo', accent: 'rút lui.' },
        },
        {
          text: 'Người ngoài tưởng bạn đã nguôi. Thật ra bạn vừa đóng một cánh cửa.',
          visual: { kind: 'typo', accent: 'đóng một cánh cửa.' },
        },
        // ── WHAT · kiểu 2 ──
        {
          text: 'Kiểu thứ hai: nói cho bằng hết. Bạn cần được nghe hơn là cần thắng.',
          visual: { kind: 'typo', accent: 'cần được nghe' },
        },
        {
          text: 'Giọng bạn to dần, không phải vì giận, mà vì sợ bị bỏ qua lần nữa.',
          visual: { kind: 'typo', accent: 'sợ bị bỏ qua' },
        },
        // ── WHAT · kiểu 3 ──
        {
          text: 'Kiểu thứ ba: quay vào trong. Bạn tự trách mình trước khi kịp giận ai.',
          visual: { kind: 'typo', accent: 'quay vào trong.' },
        },
        {
          text: 'Bạn nhận phần sai rất nhanh, vì như thế thì mọi thứ yên trở lại.',
          visual: { kind: 'typo', accent: 'yên trở lại.' },
        },
        // ── WHY: cơ chế thật, CÓ NGUỒN TRA ĐƯỢC ─────────────────────────────
        //
        // 🔴 LUẬT CỨNG CHO PHẦN NÀY: chỉ nêu tên/mốc nào KIỂM CHỨNG ĐƯỢC. Một
        // cái tên bịa thì người xem search không ra, và mất tin ngay ở đúng chỗ
        // clip đang xây uy tín — mà video đã đăng thì nằm đó vĩnh viễn, không
        // sửa được như một dòng DB. Ba nguồn dưới đây đều tra ra ngay:
        //   · Walter Cannon (1871–1945), sinh lý học Harvard — đặt tên phản xạ
        //     "fight-or-flight" năm 1915, sách *Bodily Changes in Pain, Hunger,
        //     Fear and Rage*.
        //   · Pete Walker — nhà trị liệu, đặt tên phản xạ thứ tư "fawn" trong
        //     *Complex PTSD: From Surviving to Thriving* (2013).
        //   · *Luận Ngữ*, thiên Học Nhi: 禮之用，和為貴 — "Lễ chi dụng, hoà vi
        //     quý", gốc của thành ngữ "dĩ hoà vi quý".
        //
        // ⚠️ KHÔNG nói "dĩ hoà vi quý CHÍNH LÀ phản xạ chiều theo". Luận Ngữ dạy
        // giữ hoà khí như một ĐỨC, còn fawn là một phản xạ tổn thương — đánh
        // đồng hai thứ là bóp méo cổ thư. Nói đúng: nền văn hoá dạy nhường nhịn
        // thì cái nút ấy được củng cố sớm hơn và mạnh hơn.
        {
          text: 'Ba kiểu này không phải ba tính cách. Chúng là ba nút của hệ thần kinh.',
          visual: { kind: 'typo', accent: 'ba nút' },
        },
        {
          // `speech` bỏ tên riêng Latin: Vbee đọc chuỗi tiếng Anh rất dễ thành
          // đánh vần từng chữ. Phụ đề GIỮ NGUYÊN tên — đó mới là chỗ người xem
          // đọc và gõ lại vào ô tìm kiếm. Cùng lý do đã phải tách bản đọc cho
          // tên miền và mã khuyến mãi.
          text: 'Năm 1915, nhà sinh lý học Walter Cannon ở Harvard gọi tên hai nút đầu.',
          speech: 'Năm 1915, một nhà sinh lý học người Mỹ gọi tên hai nút đầu.',
          visual: { kind: 'typo', accent: 'Walter Cannon' },
        },
        {
          text: 'Đánh trả, hoặc bỏ chạy. Sau đó y học thêm nút thứ ba: đứng hình.',
          visual: { kind: 'typo', accent: 'đứng hình.' },
        },
        {
          text: 'Ba nút đó bạn nghe rồi. Nhưng còn một nút thứ tư, ít ai biết tên.',
          visual: { kind: 'typo', accent: 'nút thứ tư,' },
        },
        {
          text: 'Mãi năm 2013, nhà trị liệu Pete Walker mới đặt tên: phản xạ chiều theo.',
          speech: 'Mãi năm 2013, một nhà trị liệu người Mỹ mới đặt tên: phản xạ chiều theo.',
          visual: { kind: 'typo', accent: 'chiều theo.' },
        },
        {
          text: 'Chiều theo: nhận lỗi, làm hoà, để cơn giận của người kia hạ xuống.',
          visual: { kind: 'typo', accent: 'Chiều theo:' },
        },
        {
          text: 'Phương Đông thì biết nút này từ lâu. Luận Ngữ đã dạy: dĩ hoà vi quý.',
          visual: { kind: 'typo', accent: 'dĩ hoà vi quý.' },
        },
        {
          text: 'Lớn lên giữa lời dạy đó, nút chiều theo của bạn được củng cố rất sớm.',
          visual: { kind: 'typo', accent: 'củng cố rất sớm.' },
        },
        {
          text: 'Nút nào bật lên là do nút nào từng có tác dụng, hồi bạn còn rất nhỏ.',
          visual: { kind: 'typo', accent: 'từng có tác dụng,' },
        },
        {
          text: 'Nhà hay cãi thì im là an toàn. Nhà bận rộn thì phải ồn mới được nghe.',
          visual: { kind: 'typo', accent: 'im là an toàn.' },
        },
        // ── FOR WHAT: biết rồi thì dùng vào việc gì ──
        {
          text: 'Biết nút của mình, bạn thôi tự trách vì đã phản ứng như thế.',
          visual: { kind: 'typo', accent: 'thôi tự trách' },
        },
        {
          text: 'Biết nút của người kia, bạn hết đọc im lặng thành lạnh nhạt.',
          visual: { kind: 'typo', accent: 'thành lạnh nhạt.' },
        },
        {
          text: 'Và biết nút của con: đứa trẻ hay nhận lỗi không phải là đứa ngoan.',
          visual: { kind: 'typo', accent: 'không phải là đứa ngoan.' },
        },
        {
          text: 'Nó đang ở nút thứ tư, để nhà mình yên. Nó học điều đó rất sớm.',
          visual: { kind: 'typo', accent: 'nút thứ tư,' },
        },
        // ── PAYOFF + cầu nối sang câu kết ──
        // Cảnh áp chót CỐ Ý nhắc lại đúng ba hướng dùng của phần *for what* để
        // câu kết có chỗ neo. Không có nó thì tên công cụ ở câu kết rơi vào
        // khoảng không: người xem vừa nghe xong một điều hay, rồi bị mời mua
        // một thứ chưa nối vào điều vừa nghe.
        {
          text: 'Điều bạn học được thì bạn học lại được. Không cần đổi tính nết.',
          visual: { kind: 'typo', accent: 'học lại được.' },
        },
        {
          text: 'Muốn biết nút của mình, của con, hay của người bạn hay va chạm?',
          visual: { kind: 'typo', accent: 'của con,' },
        },
      ],
      ...cta('', { ten: 'Luận Giải Lá Số', de: 'để soi chính mình' }),
      music: 'tram-tinh.wav',
      // MỘT bức cho cả clip. Quẻ Khảm (kw29) — nước chồng nước, hiểm nối hiểm:
      // hợp đúng nội dung "cái vòng phòng vệ lặp lại". Chọn theo NGHĨA chứ
      // không lấy bừa một bức cho có tranh.
      backdrop: [QUE('18-kw29.png')],
      hashtags: ['tinhcach', 'tamly', 'chualanh', 'selfdiscovery'],
    },
  },

  // ── A3. PHÉP THỬ CÔNG THỨC — chủ đề khác miền, dạng khác ─────────────────
  //
  // 🔑 VÌ SAO CÓ KỊCH BẢN NÀY: bản "ba kiểu tổn thương" chạy được không chứng
  // minh được CÔNG THỨC chạy được — nó mới chứng minh một chủ đề chạy được.
  // Kịch bản này cố ý khác hai chiều cùng lúc:
  //   · khác MIỀN: chuyện làm việc, không phải chuyện quan hệ;
  //   · khác DẠNG: giải thích MỘT hiện tượng, không phân loại "ba kiểu".
  // Nếu khung WHAT → WHY → FOR WHAT gánh được cả hai thì nó mới là khuôn dùng
  // lại được cho 30–50 ý tưởng mỗi tuần.
  //
  // 🔑 HOOK ĐẢO NGƯỢC NHẬN THỨC PHỔ THÔNG. Ai cũng tin trì hoãn là lười hoặc
  // kém quản lý thời gian; khoa học nói ngược lại. Chỗ người xem học được cái
  // mới nằm đúng ở chỗ đó — và đó cũng là chỗ đáng chia sẻ nhất.
  //
  // Nguồn (đều tra ra ngay, KHÔNG bịa):
  //   · Fuschia Sirois & Timothy Pychyl, *Procrastination and the Priority of
  //     Short-Term Mood Regulation* (2013), Social and Personality Psychology
  //     Compass — trì hoãn là vấn đề điều tiết CẢM XÚC, không phải thời gian.
  //   · *Đạo Đức Kinh*, chương 64: 千里之行，始於足下 — "Thiên lý chi hành,
  //     thuỷ ư túc hạ" (đi ngàn dặm bắt đầu từ một bước chân). Khớp đúng cách
  //     gỡ mà nghiên cứu chỉ ra: hạ ngưỡng bước đầu, không tăng ý chí.
  //   · "Nước đến chân mới nhảy" — thành ngữ Việt.
  //
  // Dẫn về `cong-so` chứ không `laso`: mỗi clip nên mở một cánh cửa khác trong
  // kho, và trì hoãn đúng là chuyện CÁCH LÀM VIỆC — thứ công cụ đó đọc.
  {
    id: 'vi-sao-hay-hoan-lai',
    topLabel: 'Vì sao bạn hay hoãn',
    toolId: 'cong-so',
    spec: {
      title: 'Vì sao bạn hay hoãn lại',
      hook: 'Bạn không lười. Trì hoãn thật ra không phải chuyện thời gian.',
      scenes: [
        // ── CURIOSITY ──
        {
          text: 'Bạn biết rõ việc phải làm. Vẫn mở điện thoại ra. Rồi thấy tệ.',
          visual: { kind: 'typo', accent: 'Rồi thấy tệ.' },
        },
        {
          text: 'Càng thấy tệ lại càng hoãn. Vòng đó quay tới sát hạn mới thôi.',
          visual: { kind: 'typo', accent: 'càng hoãn.' },
        },
        // ── WHAT: hiện tượng, tả bằng thứ ai cũng nhận ra ở mình ──
        {
          text: 'Bạn hoãn cái tin nhắn khó trả lời, mà dọn nhà thì làm ngay.',
          visual: { kind: 'typo', accent: 'dọn nhà thì làm ngay.' },
        },
        {
          text: 'Bạn hoãn đúng việc quan trọng nhất, rồi làm xong sạch việc vặt.',
          visual: { kind: 'typo', accent: 'việc vặt.' },
        },
        {
          text: 'Càng gần hạn chót bạn càng chạy được. Nên bạn tưởng mình cần áp lực.',
          visual: { kind: 'typo', accent: 'cần áp lực.' },
        },
        {
          text: 'Nhưng ngày thường thì việc đó vẫn nằm im, không nhúc nhích.',
          visual: { kind: 'typo', accent: 'vẫn nằm im,' },
        },
        // ── WHY: cốt lõi, có nguồn tra được ──
        {
          text: 'Vì trì hoãn không phải lỗi quản lý thời gian. Nó là chuyện cảm xúc.',
          visual: { kind: 'typo', accent: 'chuyện cảm xúc.' },
        },
        {
          // Tên riêng Latin: phụ đề giữ nguyên để người xem gõ lại tra được,
          // bản đọc nói vòng — cùng lý do đã áp cho Walter Cannon.
          text: 'Năm 2013, hai nhà tâm lý Fuschia Sirois và Tim Pychyl chỉ ra điều đó.',
          speech: 'Năm 2013, hai nhà tâm lý học đã chỉ ra điều đó.',
          visual: { kind: 'typo', accent: 'Sirois và Tim Pychyl' },
        },
        {
          text: 'Việc nào làm bạn thấy lo, thấy chán, hay sợ làm dở, thì não né việc đó.',
          visual: { kind: 'typo', accent: 'não né việc đó.' },
        },
        {
          text: 'Né xong bạn nhẹ người ngay. Đó là phần thưởng, nên não học rất nhanh.',
          visual: { kind: 'typo', accent: 'phần thưởng,' },
        },
        {
          text: 'Nên bạn không hoãn cái việc. Bạn đang hoãn cảm giác đi kèm nó.',
          visual: { kind: 'typo', accent: 'hoãn cảm giác' },
        },
        {
          text: 'Vì thế người càng cầu toàn càng hay hoãn. Sợ làm dở thì thà chưa làm.',
          visual: { kind: 'typo', accent: 'càng hay hoãn.' },
        },
        {
          text: 'Cái vòng này người Việt gọi tên từ lâu: nước đến chân mới nhảy.',
          visual: { kind: 'typo', accent: 'nước đến chân mới nhảy.' },
        },
        // ── FOR WHAT ──
        {
          text: 'Biết vậy rồi, bạn thôi tự mắng mình lười. Đó không phải tính lười.',
          visual: { kind: 'typo', accent: 'thôi tự mắng mình lười.' },
        },
        {
          text: 'Và thôi ép mình bằng kỷ luật. Kỷ luật không chữa được cảm xúc.',
          visual: { kind: 'typo', accent: 'không chữa được cảm xúc.' },
        },
        {
          text: 'Với con cũng vậy: đứa trẻ ngồi mãi không làm bài thường là đang sợ.',
          visual: { kind: 'typo', accent: 'đang sợ.' },
        },
        {
          text: 'Mắng nó lười chỉ làm cái sợ to thêm. Rồi nó hoãn lâu hơn nữa.',
          visual: { kind: 'typo', accent: 'hoãn lâu hơn nữa.' },
        },
        // ── PAYOFF ──
        {
          text: 'Cách gỡ không nằm ở ý chí. Nó nằm ở chỗ hạ thấp bước đầu tiên.',
          visual: { kind: 'typo', accent: 'hạ thấp bước đầu tiên.' },
        },
        {
          text: 'Đạo Đức Kinh viết: đi ngàn dặm bắt đầu từ một bước chân.',
          visual: { kind: 'typo', accent: 'một bước chân.' },
        },
        {
          text: 'Bạn thử làm hai phút thôi. Qua hai phút đó, cái sợ thường tự hạ.',
          visual: { kind: 'typo', accent: 'hai phút thôi.' },
        },
        // ── CẦU NỐI sang câu kết ──
        {
          // ⚠️ Câu hỏi phải để chữ "bạn" GẦN dấu hỏi. Bản đầu viết "Muốn biết
          // bạn hay né loại việc nào, và hợp cách làm việc ra sao?" — cách nhau
          // 49 ký tự nên `viral.no-invite` kêu đúng: một câu dài lê thê thì
          // người xem không đọc ra là đang được hỏi, và cũng không trả lời.
          text: 'Cách làm việc nào hợp bạn, và loại việc nào bạn hay né?',
          visual: { kind: 'typo', accent: 'loại việc nào bạn hay né?' },
        },
      ],
      ...cta('', {
        ten: 'Tử Vi Công Sở & Hướng Nghiệp',
        tenDoc: 'Tử Vi Công Sở và Hướng Nghiệp',
        de: 'để soi cách bạn làm việc',
      }),
      music: 'sang-sua.wav',
      // BA bức luân phiên, xếp theo đúng mạch nội dung chứ không theo thứ tự
      // tình cờ: Truân (kw03, khởi đầu rối như tơ vò) → Khốn (kw47, gắng mà
      // không thoát) → Càn (kw01, tiến, hành động). Ảnh cuối rơi vào đoạn
      // PAYOFF + câu kết — chỗ nội dung chuyển từ bế tắc sang bước đi được.
      backdrop: [QUE('17-kw03.png'), QUE('26-kw47.png'), QUE('63-kw01.png')],
      hashtags: ['trihoan', 'tamly', 'nangsuat', 'selfdiscovery'],
    },
  },

  // ── A. Motion typography thuần — 0 asset, 0đ ────────────────────────────
  {
    id: 'ba-kieu-ton-thuong',
    topLabel: 'Bạn là kiểu người nào',
    toolId: 'luan-giai',
    spec: {
      title: 'Ba kiểu người khi bị tổn thương',
      hook: 'Có ba kiểu người khi bị tổn thương.',
      scenes: [
        {
          text: 'Kiểu thứ nhất im lặng. Bạn không cãi, chỉ lặng lẽ rút đi.',
          visual: { kind: 'typo', accent: 'im lặng.' },
        },
        {
          text: 'Người ngoài tưởng bạn ổn. Thật ra bạn vừa đóng một cánh cửa.',
          visual: { kind: 'typo', accent: 'đóng một cánh cửa.' },
        },
        {
          text: 'Kiểu thứ hai nói cho bằng hết. Bạn cần được nghe, không cần thắng.',
          visual: { kind: 'typo', accent: 'được nghe,' },
        },
        {
          text: 'Kiểu thứ ba quay vào trong, tự trách mình trước khi kịp giận ai.',
          visual: { kind: 'typo', accent: 'tự trách mình' },
        },
        {
          text: 'Không kiểu nào sai. Bạn chỉ học cách tự vệ từ rất sớm.',
          visual: { kind: 'typo', accent: 'tự vệ từ rất sớm.' },
        },
      ],
      ...cta('Bạn là kiểu nào?'),
      music: 'tram-tinh.wav',
      hashtags: ['tinhcach', 'tamly', 'selfdiscovery', 'tuvi'],
    },
  },

  // ── B. Dùng lại 64 bức tranh quẻ đã sinh sẵn ────────────────────────────
  {
    id: 'ba-the-be-tac',
    topLabel: 'Bạn đang ở đâu',
    toolId: 'kinh-dich',
    spec: {
      title: 'Ba tình thế bế tắc trong Kinh Dịch',
      hook: 'Người xưa vẽ ba tình thế bế tắc.',
      scenes: [
        {
          text: 'Truân: bạn mới bắt đầu, và mọi thứ còn rối như tơ vò.',
          visual: { kind: 'image', src: QUE('17-kw03.png'), accent: 'Truân:' },
        },
        {
          text: 'Kiển: đường trước mặt nghẽn, mà quay lại thì không cam.',
          visual: { kind: 'image', src: QUE('20-kw39.png'), accent: 'Kiển:' },
        },
        {
          text: 'Khốn: bạn vẫn gắng, nhưng nói ra thì không ai hiểu.',
          visual: { kind: 'image', src: QUE('26-kw47.png'), accent: 'Khốn:' },
        },
        {
          text: 'Khảm: hết lớp này tới lớp khác, tới mức bạn quen dần.',
          visual: { kind: 'image', src: QUE('18-kw29.png'), accent: 'Khảm:' },
        },
        {
          text: 'Cổ nhân không gọi đó là số phận của bạn. Chỉ là một giai đoạn.',
          visual: { kind: 'image', src: QUE('63-kw01.png'), accent: 'một giai đoạn.' },
        },
      ],
      ...cta('Bạn đang ở tình thế nào?'),
      music: 'cang-thang.wav',
      hashtags: ['kinhdich', 'bettac', 'coHoc', 'tuvi'],
    },
  },
];

export function getInsightSource(id: string): InsightSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function listInsightIds(): string[] {
  return SOURCES.map((s) => s.id);
}

export function buildInsightSpec(id: string): ScriptSpec | undefined {
  const src = getInsightSource(id);
  if (!src) return undefined;
  // `quote` chứ không `tool-demo`: cổng máy dùng chính trường này để quyết định
  // có đòi cảnh quay màn hình hay không.
  return { sourceType: 'quote', sourceId: src.id, ...src.spec };
}
