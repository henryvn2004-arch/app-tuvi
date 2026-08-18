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
 * 🔑 `tool` — GỌI ĐÍCH DANH tên công cụ. Tên phải khớp NGUYÊN VĂN
 * `tool_pricing.label` — nói một cái tên không tìm thấy trên site còn tệ hơn
 * không nói tên nào.
 *
 * 🔑 HÌNH DẠNG LÀ CÂU HỎI, KHÔNG PHẢI LỜI SAI BẢO. Bản trước mở bằng *"Mở X để
 * làm Y"* — đúng ngữ pháp nhưng là giọng ra lệnh, đặt ngay sau một đoạn vừa
 * chạm vào chuyện riêng của người xem thì đọc thành chuyển kênh sang bán hàng.
 * Câu hỏi thì nối liền mạch: cả clip đang là tự khám phá, câu kết chỉ mở thêm
 * một cánh cửa nữa cùng hướng. Vai "dùng để làm gì" do CHÍNH câu hỏi gánh, nên
 * bỏ luôn vế `de` — bớt một mệnh đề là bớt hai giây ở đúng chỗ người xem rơi.
 */
function cta(question: string, tool?: { ten: string; tenDoc?: string }) {
  // `tenDoc` — bản ĐỌC của tên công cụ, chỉ khai khi tên chứa ký tự bộ đọc xử
  // lý không chắc (`&` là ca đầu tiên: "Tử Vi Công Sở & Hướng Nghiệp"). Phụ đề
  // phải giữ NGUYÊN VĂN `tool_pricing.label` để người xem tìm đúng tên trên
  // site; đó là lý do không thể chỉ sửa một bản.
  const ten = tool?.ten ?? '';
  const tenDoc = tool?.tenDoc ?? ten;
  const noi = tool ? `${ten}, tại tuviminhbao.com.` : `Tra tại tuviminhbao.com.`;
  const noiDoc = tool
    ? `${tenDoc}, tại Tử Vi Minh Bảo chấm com.`
    : `Tra tại Tử Vi Minh Bảo chấm com.`;
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
      // 🔑 HOOK ĐẬP THẲNG VÀO MỘT NIỀM TIN. Bản trước mở bằng "có ba kiểu
      // người…" — đúng nhưng là một lời GIỚI THIỆU, người xem chưa mất gì nên
      // chưa có lý do ở lại. Đổi "tính cách" (thứ họ tự hào hoặc cam chịu)
      // thành "vết thương" là lấy đi một cách hiểu họ đang có, và chỗ trống đó
      // mới là thứ giữ họ xem tiếp.
      hook: 'Bạn tưởng đó là tính cách mình. Thật ra là vết thương.',
      scenes: [
        // ── MỞ TÒ MÒ: phải chạm cảm xúc, không chỉ nêu đề bài ──
        {
          text: 'Có ba kiểu phản ứng khi bị đau. Bạn không tự quyết mình kiểu nào.',
          visual: { kind: 'typo', accent: 'không tự quyết' },
        },
        {
          // Câu này gánh phần CẢM XÚC của đoạn mở. Không có nó thì đoạn mở chỉ
          // là thông tin, mà thông tin thì người xem lướt qua được.
          text: 'Xong rồi bạn nằm đó, ghét chính mình vì đã phản ứng như thế.',
          visual: { kind: 'typo', accent: 'ghét chính mình' },
        },
        // ── WHAT: LEO THANG, không liệt kê. Mỗi kiểu khó thừa nhận hơn kiểu
        // trước, nên người xem càng nghe càng thấy bị nói trúng. Ba kiểu ngang
        // hàng thì đọc thành một danh sách, mà danh sách thì không có cao trào.
        {
          text: 'Kiểu thứ nhất: bạn im. Không cãi, không giải thích, chỉ lặng đi.',
          visual: { kind: 'typo', accent: 'bạn im.' },
        },
        {
          text: 'Người ta tưởng bạn đã nguôi. Thật ra bạn vừa đóng một cánh cửa.',
          visual: { kind: 'typo', accent: 'đóng một cánh cửa.' },
        },
        {
          text: 'Kiểu thứ hai nặng hơn: bạn nói cho bằng hết.',
          visual: { kind: 'typo', accent: 'nặng hơn:' },
        },
        {
          text: 'Giọng to dần, không phải vì giận, mà vì sợ lại bị bỏ qua.',
          visual: { kind: 'typo', accent: 'sợ lại bị bỏ qua.' },
        },
        {
          text: 'Kiểu thứ ba ít ai dám nhận: bạn quay vào trong.',
          visual: { kind: 'typo', accent: 'ít ai dám nhận:' },
        },
        {
          text: 'Bạn nhận lỗi trước cả khi kịp giận. Vì như thế thì mọi thứ yên.',
          visual: { kind: 'typo', accent: 'trước cả khi kịp giận.' },
        },
        // ── INSIGHT ĐẨY LÊN SỚM ──
        // 🔑 Đây là cao trào, và nó CỐ Ý đứng ngay sau phần mô tả chứ không đợi
        // tới cuối. Người xem vừa nhận ra mình ở một trong ba kiểu — đúng lúc
        // đó mới là lúc câu này ăn. Để nó ở cuối là để cho người đã lướt đi rồi.
        {
          text: 'Nhưng cả ba đều không phản ứng với người trước mặt bạn.',
          visual: { kind: 'typo', accent: 'không phản ứng' },
        },
        {
          text: 'Bạn đang phản ứng với một ký ức.',
          visual: { kind: 'typo', accent: 'một ký ức.' },
        },
        // ── WHY: nói như người nói chuyện, không như người giảng bài ──
        // Tên và mốc năm đặt SAU khi đã nói xong ý — nêu tên trước thì câu
        // thành trích dẫn học thuật.
        //
        // 🔑 TÊN RIÊNG LATIN ĐI THẲNG VÀO BẢN ĐỌC, KHÔNG TÁCH `speech`. Bản
        // trước tách ra vì SỢ Vbee đánh vần từng chữ cái — một phỏng đoán chưa
        // hề kiểm chứng, và nó làm mất đúng phần authority mà cả đoạn WHY dựng
        // lên: phụ đề có tên mà tai không nghe thấy gì.
        // Đo thật (gửi hai chuỗi chỉ khác nhau ở chỗ có/không có tên, so độ dài
        // mp3): "Walter Cannon" +1,07s · "Pete Walker" +1,41s · "Sirois và
        // Pychyl" +0,65s. Đánh vần từng chữ thì phải mất 4–6 giây, nên con số
        // này nói nó ĐỌC THÀNH ÂM. Bản phiên âm tiếng Việt cũng chỉ +1,04s,
        // tức không hơn gì — thêm một bản chữ song song mà không được gì.
        //
        // ⚠️ SỐ TRÊN GẮN VỚI TỪNG CLIP, KHÔNG PHẢI VỚI CẢ KÊNH. `pickVoice`
        // (`scripts/tts-clip.mjs`) chọn giọng theo BĂM của id clip, nên mỗi
        // kịch bản một giọng khác nhau — chính bản này chạy giọng *nữ Hà Nội*
        // (Cannon/Walker), còn "Sirois và Pychyl" đo trên *nữ Sài Gòn* của
        // `vi-sao-hay-hoan-lai`. Bản ghi trước đây gộp cả ba vào "giọng nữ Hà
        // Nội" là SAI.
        //
        // Giọng thứ ba đã đo (*nam Hà Nội*, của `bon-buoc-truoc-khi-roi-di`),
        // lần này bằng phép THAY THẾ thay vì bỏ hẳn tên — thay "ông ấy" (6 ký
        // tự) bằng "John Gottman" (12 ký tự):
        //     65 kt 3,55s  vs  59 kt 3,13s   → +0,42s
        //     44 kt 2,56s  vs  38 kt 2,22s   → +0,34s
        // Ba kết cục phân biệt được rất rõ, nên phép đo này đủ kết luận:
        //   · đọc thành âm  → khoảng +0,4s   ← ĐÚNG cái đo được
        //   · đánh vần      → khoảng +4s
        //   · nuốt luôn tên → khoảng −0,35s (mất luôn chữ "ông ấy")
        // ⇒ Cả ba giọng đã đo đều ĐỌC tên Latin thành âm.
        // 🔑 Lượt "có tên" của cặp A lấy TỪ CACHE, tức chính file mp3 đang nằm
        // trong clip đã dựng — đo thẳng thứ đang phát, không phải một bản thế.
        //
        // ⇒ Thêm tên riêng Latin vào một kịch bản chạy giọng CHƯA đo thì phải
        // đo lại cho giọng đó, đừng suy từ bảng này. Giọng thứ tư (*nữ Sài
        // Gòn* thì đã đo, còn *nam Sài Gòn* của `VOICES[0]`) vẫn chưa có số.
        {
          text: 'Vì cơ thể bạn chỉ có bốn nút khi thấy nguy.',
          visual: { kind: 'typo', accent: 'bốn nút' },
        },
        {
          text: 'Đánh trả. Bỏ chạy. Đứng hình. Và chiều theo.',
          visual: { kind: 'typo', accent: 'Và chiều theo.' },
        },
        {
          text: 'Ba nút đầu y học gọi tên từ 1915, thời Walter Cannon.',
          visual: { kind: 'typo', accent: 'Walter Cannon.' },
        },
        {
          text: 'Nút thứ tư mãi 2013 mới có tên, do Pete Walker đặt.',
          visual: { kind: 'typo', accent: 'Nút thứ tư' },
        },
        {
          text: 'Chiều theo là: nhận lỗi, làm hoà, cho cơn giận kia hạ xuống.',
          visual: { kind: 'typo', accent: 'Chiều theo' },
        },
        {
          text: 'Ông bà mình gọi khác: dĩ hoà vi quý. Luận Ngữ dạy vậy.',
          visual: { kind: 'typo', accent: 'dĩ hoà vi quý.' },
        },
        {
          text: 'Nút nào bật là do hồi bé, nút nào từng cứu được bạn.',
          visual: { kind: 'typo', accent: 'từng cứu được bạn.' },
        },
        {
          text: 'Nhà hay cãi thì im là an toàn. Nhà bận thì phải ồn mới được nghe.',
          visual: { kind: 'typo', accent: 'im là an toàn.' },
        },
        // ── FOR WHAT ──
        {
          text: 'Biết nút của mình, bạn thôi ghét mình vì đã phản ứng như thế.',
          visual: { kind: 'typo', accent: 'thôi ghét mình' },
        },
        {
          text: 'Biết nút người kia, bạn hết đọc im lặng thành lạnh nhạt.',
          visual: { kind: 'typo', accent: 'thành lạnh nhạt.' },
        },
        {
          text: 'Và biết nút của con: đứa hay nhận lỗi không phải đứa ngoan.',
          visual: { kind: 'typo', accent: 'không phải đứa ngoan.' },
        },
        {
          text: 'Nó đang ở nút thứ tư. Nó học điều đó sớm hơn bạn tưởng.',
          visual: { kind: 'typo', accent: 'sớm hơn bạn tưởng.' },
        },
        // ── PAYOFF + TWIST ──
        // Twist: không hứa sửa được tính nết (hứa thế là hứa hụt), mà đổi mục
        // tiêu — chỉ cần NHÌN THẤY nó lúc đang chạy. Câu chốt vòng ngược về
        // "đứa trẻ" ở phần WHY nên cả clip khép lại thành một vòng.
        {
          text: 'Bạn không sửa được nút. Nhưng nhận ra được lúc nó đang bật.',
          visual: { kind: 'typo', accent: 'nhận ra được' },
        },
        {
          text: 'Lần tới khi đau, hỏi một câu: mình đang bảo vệ đứa trẻ nào?',
          visual: { kind: 'typo', accent: 'đứa trẻ nào?' },
        },
      ],
      ...cta('Còn lá số bạn nói gì về chuyện này?', { ten: 'Luận Giải Lá Số' }),
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
      // Hook đập vào đúng cái nhãn người ta tự dán cho mình. "Lười" là lời tự
      // kết án phổ biến nhất về chuyện này; lấy nó đi rồi thay bằng "sợ" là
      // vừa gây sốc vừa hé một nửa insight chính.
      hook: 'Bạn tưởng mình lười. Thật ra bạn đang sợ một cảm giác.',
      scenes: [
        // ── MỞ TÒ MÒ: câu thứ hai gánh phần cảm xúc ──
        {
          text: 'Việc thì nằm đó. Bạn biết rõ. Vẫn mở điện thoại lên.',
          visual: { kind: 'typo', accent: 'Bạn biết rõ.' },
        },
        {
          text: 'Rồi tối đến, bạn ghét chính mình vì đã để cả ngày trôi.',
          visual: { kind: 'typo', accent: 'ghét chính mình' },
        },
        // ── WHAT: leo thang từ việc nhỏ tới chỗ đau nhất ──
        {
          text: 'Đầu tiên bạn hoãn cái tin nhắn khó trả lời.',
          visual: { kind: 'typo', accent: 'khó trả lời.' },
        },
        {
          text: 'Rồi hoãn luôn việc quan trọng nhất, mà dọn nhà thì làm ngay.',
          visual: { kind: 'typo', accent: 'dọn nhà thì làm ngay.' },
        },
        {
          text: 'Càng gần hạn chót bạn càng chạy được, nên bạn tưởng mình cần áp lực.',
          visual: { kind: 'typo', accent: 'cần áp lực.' },
        },
        {
          text: 'Nhưng ngày thường thì nó vẫn nằm im. Và bạn vẫn thấy tệ.',
          visual: { kind: 'typo', accent: 'vẫn thấy tệ.' },
        },
        // ── INSIGHT ĐẨY LÊN SỚM ──
        // 🔑 Câu này là cả cái clip. Bản trước để tận cảnh 11, tức sau khi đã
        // giảng xong bốn cảnh cơ chế — người xem phải trả trước rồi mới được
        // nhận. Nay nó đứng ngay sau phần mô tả, đúng lúc họ vừa thấy mình.
        {
          text: 'Vì bạn không hoãn cái việc. Bạn hoãn cái cảm giác đi kèm nó.',
          visual: { kind: 'typo', accent: 'hoãn cái cảm giác' },
        },
        // ── WHY: giọng nói chuyện. Tên nghiên cứu đặt SAU khi đã nói xong ý ──
        {
          text: 'Việc nào làm bạn thấy lo, thấy chán, hay sợ làm dở, thì não né.',
          visual: { kind: 'typo', accent: 'thì não né.' },
        },
        {
          text: 'Né xong bạn nhẹ ngay. Nhẹ là phần thưởng. Não học rất nhanh.',
          visual: { kind: 'typo', accent: 'là phần thưởng.' },
        },
        {
          text: 'Nên càng cầu toàn càng hay hoãn. Sợ làm dở thì thà chưa làm.',
          visual: { kind: 'typo', accent: 'thà chưa làm.' },
        },
        {
          text: 'Đây không phải chuyện quản lý thời gian. Là chuyện cảm xúc.',
          visual: { kind: 'typo', accent: 'Là chuyện cảm xúc.' },
        },
        {
          text: 'Hai nhà tâm lý Sirois và Pychyl chỉ ra điều đó từ năm 2013.',
          visual: { kind: 'typo', accent: 'Sirois và Pychyl' },
        },
        {
          text: 'Còn ông bà mình gọi gọn hơn: nước đến chân mới nhảy.',
          visual: { kind: 'typo', accent: 'nước đến chân mới nhảy.' },
        },
        // ── FOR WHAT ──
        {
          text: 'Biết vậy rồi, bạn thôi mắng mình lười. Đó không phải lười.',
          visual: { kind: 'typo', accent: 'thôi mắng mình lười.' },
        },
        {
          text: 'Và thôi ép mình bằng kỷ luật. Kỷ luật không chữa được sợ.',
          visual: { kind: 'typo', accent: 'không chữa được sợ.' },
        },
        {
          text: 'Với con cũng thế: đứa ngồi mãi không làm bài là đứa đang sợ.',
          visual: { kind: 'typo', accent: 'là đứa đang sợ.' },
        },
        {
          text: 'Mắng nó lười chỉ làm cái sợ to thêm. Rồi nó hoãn lâu hơn.',
          visual: { kind: 'typo', accent: 'hoãn lâu hơn.' },
        },
        // ── PAYOFF + TWIST ──
        // 🔑 "Hai phút" là mẹo ai cũng nghe rồi, nên tự nó KHÔNG phải payoff.
        // Thứ mới nằm ở chỗ nói ĐÚNG nó dùng để làm gì: không phải để làm được
        // việc, mà để hạ mức đe doạ xuống dưới ngưỡng não bật nút né. Thiếu câu
        // đó thì đoạn kết chỉ là một lời khuyên cũ.
        {
          text: 'Cách gỡ không nằm ở ý chí. Nằm ở chỗ hạ bước đầu xuống thật thấp.',
          visual: { kind: 'typo', accent: 'hạ bước đầu' },
        },
        {
          text: 'Đạo Đức Kinh viết: đi ngàn dặm bắt đầu từ một bước chân.',
          visual: { kind: 'typo', accent: 'một bước chân.' },
        },
        {
          text: 'Nên bạn làm hai phút thôi.',
          visual: { kind: 'typo', accent: 'hai phút thôi.' },
        },
        {
          text: 'Hai phút đó không phải để làm xong. Là để lừa não rằng chưa có gì đáng sợ.',
          visual: { kind: 'typo', accent: 'để lừa não' },
        },
      ],
      ...cta('Còn lá số nói gì về cách bạn làm việc?', {
        ten: 'Tử Vi Công Sở & Hướng Nghiệp',
        tenDoc: 'Tử Vi Công Sở và Hướng Nghiệp',
      }),
      music: 'u-hoai.wav',
      // BA bức luân phiên, xếp theo đúng mạch nội dung chứ không theo thứ tự
      // tình cờ: Truân (kw03, khởi đầu rối như tơ vò) → Khốn (kw47, gắng mà
      // không thoát) → Càn (kw01, tiến, hành động). Ảnh cuối rơi vào đoạn
      // PAYOFF + câu kết — chỗ nội dung chuyển từ bế tắc sang bước đi được.
      backdrop: [QUE('17-kw03.png'), QUE('26-kw47.png'), QUE('63-kw01.png')],
      hashtags: ['trihoan', 'tamly', 'nangsuat', 'selfdiscovery'],
    },
  },

  // ── A4. PHÉP THỬ DẠNG THỨ BA — TRÌNH TỰ THEO THỜI GIAN ───────────────────
  //
  // 🔑 VÌ SAO CÓ KỊCH BẢN NÀY: hai bản trên mới chứng minh khung WHAT → WHY →
  // FOR WHAT gánh được hai DẠNG — phân loại ("ba kiểu") và giải thích một hiện
  // tượng ("vì sao"). Cả hai đều là ảnh chụp một trạng thái. Bản này thử dạng
  // thứ ba: **một chuỗi có THỨ TỰ**, mỗi bước nặng hơn bước trước.
  //
  // Dạng trình tự đắt hơn hẳn về mặt giữ chân: người xem đang ở bước 2 sẽ ở lại
  // để biết bước 3 và 4 là gì — thứ mà một danh sách ngang hàng không tạo ra
  // được. Đổi lại nó KHÓ hơn: sai thứ tự thì cả clip mất tính thuyết phục, nên
  // thứ tự phải lấy từ nguồn chứ không tự xếp cho xuôi tai.
  //
  // Nguồn (tra ra ngay, KHÔNG bịa):
  //   · John Gottman & Robert Levenson, "Love Lab" (Seattle, từ thập niên
  //     1970) — bốn kiểu giao tiếp báo trước đổ vỡ, đặt tên *Four Horsemen*:
  //     criticism · contempt · defensiveness · stonewalling. Khinh thường
  //     (contempt) là dấu hiệu MẠNH NHẤT.
  //   · Gottman: cặp bền vẫn cãi nhau nhiều như cặp tan — khác ở "repair
  //     attempts", tức có người hạ giọng giữa trận.
  //   · Ca dao Việt: *"Chồng giận thì vợ bớt lời / Cơm sôi nhỏ lửa một đời
  //     không khê"* — trùng khít với cơ chế repair ở trên.
  //
  // ⚠️ CỐ Ý KHÔNG NÊU CON SỐ ĐỘ CHÍNH XÁC (hay được dẫn là 90–94%). Con số đó
  // bị phê bình về phương pháp (khớp hậu nghiệm chứ không dự báo tiến cứu —
  // Heyman & Smith Slep 2001). Nói "xem mười lăm phút là đoán được" thì đúng
  // với thứ nghiên cứu mô tả, còn đọc lên một tỉ lệ đang bị tranh cãi thì đúng
  // là loại chi tiết người xem tra ra rồi quay lại bắt lỗi.
  //
  // Dẫn về `xem-tuoi` — mỗi clip mở một cánh cửa khác trong kho.
  {
    id: 'bon-buoc-truoc-khi-roi-di',
    topLabel: 'Trước khi một người rời đi',
    toolId: 'xem-tuoi',
    spec: {
      title: 'Bốn bước trước khi một người rời đi',
      // Hook CỐ Ý KHÔNG dùng khuôn "tưởng… thật ra…" của hai bản trước — dùng
      // ba lần là thành tật, và người xem lướt kênh sẽ nhận ra ngay. Ở đây
      // dùng "Hoá ra", và quan trọng hơn: *"bốn bước, theo thứ tự"* báo trước
      // đây là một chuỗi — chính lời hứa đó giữ người xem tới bước cuối.
      hook: 'Không ai rời đi đột ngột. Hoá ra có bốn bước, theo thứ tự.',
      scenes: [
        // ── MỞ TÒ MÒ ──
        {
          text: 'Bạn nghĩ đổ vỡ bắt đầu từ một trận cãi lớn. Không phải vậy.',
          visual: { kind: 'typo', accent: 'Không phải vậy.' },
        },
        {
          // Câu cảm xúc: cái đau ở đây là mình từng thấy mình ĐÚNG.
          text: 'Nó bắt đầu từ một câu rất nhỏ, mà lúc đó bạn thấy mình có lý.',
          visual: { kind: 'typo', accent: 'bạn thấy mình có lý.' },
        },
        // ── WHAT: bốn bước, mỗi bước 2 cảnh (hành vi + chỗ bị hiểu nhầm) ──
        {
          text: 'Bước một: bạn thôi nói về việc. Bạn nói về con người.',
          visual: { kind: 'typo', accent: 'Bạn nói về con người.' },
        },
        {
          text: 'Không còn là anh quên đón con. Thành ra anh lúc nào cũng thế.',
          visual: { kind: 'typo', accent: 'lúc nào cũng thế.' },
        },
        {
          text: 'Bước hai nặng nhất: bạn bắt đầu thấy người kia kém hơn mình.',
          visual: { kind: 'typo', accent: 'kém hơn mình.' },
        },
        {
          text: 'Một cái đảo mắt. Một tiếng cười khẽ. Người kia nhận ra hết.',
          visual: { kind: 'typo', accent: 'Người kia nhận ra hết.' },
        },
        {
          text: 'Bước ba: họ thôi nghe bạn. Họ chỉ còn đỡ đòn.',
          visual: { kind: 'typo', accent: 'chỉ còn đỡ đòn.' },
        },
        {
          text: 'Bạn nói một câu, họ đáp bằng một câu bạn từng sai năm ngoái.',
          visual: { kind: 'typo', accent: 'từng sai năm ngoái.' },
        },
        {
          text: 'Bước bốn im nhất, và cũng là bước cuối: họ thôi đáp.',
          visual: { kind: 'typo', accent: 'họ thôi đáp.' },
        },
        {
          text: 'Vẫn ngồi đó, vẫn ăn cơm với bạn. Nhưng đã đi từ lâu rồi.',
          visual: { kind: 'typo', accent: 'đã đi từ lâu rồi.' },
        },
        // ── INSIGHT ĐẨY LÊN SỚM, ngay sau khi người xem vừa soi thấy nhà mình ──
        {
          text: 'Người rời đi phần nhiều không hết thương bạn. Họ hết cách nói.',
          visual: { kind: 'typo', accent: 'Họ hết cách nói.' },
        },
        // ── WHY: giọng nói chuyện, tên đặt SAU khi đã nói xong ý ──
        {
          text: 'Vì cãi nhau không giết một mối quan hệ. Cách cãi mới giết.',
          visual: { kind: 'typo', accent: 'Cách cãi mới giết.' },
        },
        {
          text: 'Từ thập niên bảy mươi, John Gottman quay hàng nghìn cặp cãi nhau.',
          visual: { kind: 'typo', accent: 'John Gottman' },
        },
        {
          text: 'Xem mười lăm phút, ông đoán được cặp nào rồi sẽ chia tay.',
          visual: { kind: 'typo', accent: 'mười lăm phút,' },
        },
        {
          text: 'Nặng nhất vẫn là bước hai. Ba bước kia còn là đang đánh nhau.',
          visual: { kind: 'typo', accent: 'vẫn là bước hai.' },
        },
        {
          text: 'Bước hai là bạn xếp hạng xong rồi, và người kia đứng thấp hơn.',
          visual: { kind: 'typo', accent: 'xếp hạng xong rồi,' },
        },
        // ── FOR WHAT ──
        {
          text: 'Biết bốn bước, bạn thôi hỏi còn thương nhau không. Câu đó mơ hồ.',
          visual: { kind: 'typo', accent: 'Câu đó mơ hồ.' },
        },
        {
          text: 'Bạn hỏi câu đo được: tuần này nhà mình đang ở bước mấy?',
          visual: { kind: 'typo', accent: 'đang ở bước mấy?' },
        },
        {
          text: 'Trẻ con trong nhà cũng học cách cãi nhau từ đúng bốn bước này.',
          visual: { kind: 'typo', accent: 'từ đúng bốn bước này.' },
        },
        // ── PAYOFF + TWIST ──
        // Twist: ai cũng tin nhà êm là nhà ít cãi. Nghiên cứu nói ngược —
        // thứ khác biệt là có người chịu hạ giọng giữa trận, không phải số trận.
        {
          text: 'Điều lạ nhất ông tìm ra: cặp bền vẫn cãi y như cặp sắp tan.',
          visual: { kind: 'typo', accent: 'y như cặp sắp tan.' },
        },
        {
          text: 'Khác ở chỗ giữa trận, có một người chịu hạ giọng trước.',
          visual: { kind: 'typo', accent: 'chịu hạ giọng trước.' },
        },
        {
          text: 'Ông bà mình dạy rồi: cơm sôi nhỏ lửa, một đời không khê.',
          visual: { kind: 'typo', accent: 'cơm sôi nhỏ lửa,' },
        },
        {
          text: 'Nên đừng đếm số trận cãi. Đếm xem nhà bạn còn ai chịu hạ lửa.',
          visual: { kind: 'typo', accent: 'còn ai chịu hạ lửa.' },
        },
      ],
      ...cta('Còn lá số nói gì về cách bạn cãi nhau?', { ten: 'Xem Tuổi Vợ Chồng' }),
      music: 'lang-le.wav',
      // Ba bức xếp theo đúng mạch: Khuê (kw38 — hai bên nhìn nhau lệch, chia
      // lìa) → Bĩ (kw12 — trời đất không giao, tắc hẳn, đúng bước im lặng) →
      // Gia Nhân (kw37 — người trong nhà, rơi vào đoạn hạ lửa và câu kết).
      //
      // 🧪 ĐÃ RENDER THỬ với ảnh stock và bố cục chạy tốt. Đổi sang bằng ĐÚNG
      // một dòng — và nay chỉ còn MỘT bức cho cả clip, không rải ba nữa:
      //     backdrop: stockBackdrop('chia-xa', 'bon-buoc-truoc-khi-roi-di'),
      // ⛔ NHƯNG CHƯA ĐỔI, và lý do không phải thẩm mỹ: kho ảnh chưa đẩy lên
      // Storage nên `stockBackdrop` còn trả đường dẫn trong `remotion/public/
      // stock/` — thư mục NGOÀI git. Ghim vào đây thì lượt dựng trên Actions
      // (checkout sạch, không có thư mục đó) gãy ngay. Chạy
      // `scripts/stock-upload.mjs` xong thì manifest có `url` và dòng trên
      // chạy được ở mọi nơi.
      backdrop: [QUE('43-kw38.png'), QUE('56-kw12.png'), QUE('53-kw37.png')],
      hashtags: ['honnhan', 'tamly', 'giadinh', 'selfdiscovery'],
    },
  },

  // ── A5. PHÉP THỬ DẠNG THỨ TƯ — ĐỐI CHIẾU HAI NGƯỜI ───────────────────────
  //
  // 🔑 Dạng thứ tư: **hai người CÙNG đầu vào, khác kết quả**. Câu hỏi "khác ở
  // đâu" tự nó là một cái móc, và người xem lập tức tự xếp mình vào một trong
  // hai bên — tức phần "nói đúng mình" xảy ra sớm hơn cả ba dạng trên.
  //
  // Miền cũng mới: TIỀN BẠC. Ba bản trước đi vào cảm xúc · công việc · hôn
  // nhân; đây là miền có lượng tìm kiếm lớn nhất mà kênh chưa chạm.
  //
  // Nguồn (tra ra ngay, KHÔNG bịa):
  //   · Brickman, Coates & Janoff-Bulman, *Lottery Winners and Accident
  //     Victims: Is Happiness Relative?* (1978), Journal of Personality and
  //     Social Psychology 36(8), 917–927. 22 người trúng số lớn KHÔNG hạnh
  //     phúc hơn nhóm đối chứng, và — chỗ đắt nhất — họ thấy các niềm vui
  //     hàng ngày NHẠT HẲN đi. Đây là gốc của khái niệm "mức thích nghi".
  //   · Thành ngữ Việt: *"được voi đòi tiên"*.
  //   · *Tri túc* (知足) — biết đủ; khái niệm chung của Đạo gia và nhà Phật.
  //     CỐ Ý không gán chương/tác giả cụ thể: bản A3 đã dẫn Đạo Đức Kinh, dẫn
  //     lại là thành tật, mà gán sai một chương thì tệ hơn không gán.
  //
  // 🔑 CHI TIẾT LÀM CẢ CLIP nằm ở chỗ "niềm vui hàng ngày nhạt đi" — không
  // phải ở chỗ "trúng số không sướng hơn" (câu đó ai cũng nghe rồi). Nó nghịch
  // với trực giác, tra ra được, và giải thích đúng cảm giác người xem đang có.
  //
  // Dẫn về `tu-binh`: Tử Bình là hệ đọc TÀI TINH và thân vượng/nhược — tức
  // "giữ được của hay không", đúng câu hỏi của clip. Không dẫn về `laso` vì
  // bản A2 đã dùng cửa đó.
  {
    id: 'hai-nguoi-cung-luong',
    topLabel: 'Vì sao bạn không thấy đủ',
    toolId: 'tu-binh',
    spec: {
      title: 'Hai người cùng lương, một người dư một người thiếu',
      // Hook là một câu hỏi thật, không phải câu hỏi tu từ — và nó đặt ra một
      // bài toán người xem muốn biết đáp án. Cũng là hook duy nhất trong bốn
      // bản không mở bằng cách phủ định một niềm tin, nên đọc lên nghe khác hẳn.
      hook: 'Hai người cùng lương. Một người dư, một người thiếu. Khác ở đâu?',
      scenes: [
        // ── MỞ TÒ MÒ ──
        {
          text: 'Bạn từng nghĩ chỉ cần thêm vài triệu nữa là mọi thứ sẽ ổn.',
          visual: { kind: 'typo', accent: 'là mọi thứ sẽ ổn.' },
        },
        {
          text: 'Rồi lương lên thật. Ba tháng sau, bạn vẫn thấy thiếu y như cũ.',
          visual: { kind: 'typo', accent: 'thiếu y như cũ.' },
        },
        {
          // Câu cảm xúc: nỗi xấu hổ khi than mà biết mình đã hơn nhiều người.
          text: 'Và bạn không kể với ai, vì nghe như đang than khi đã đủ.',
          visual: { kind: 'typo', accent: 'than khi đã đủ.' },
        },
        // ── WHAT: đối chiếu, rồi lật lại chính cách hiểu thông thường ──
        {
          text: 'Người thứ nhất lương lên là đổi xe. Bạn thấy quen chứ?',
          visual: { kind: 'typo', accent: 'Bạn thấy quen chứ?' },
        },
        {
          text: 'Người thứ hai chưa đổi gì. Nửa năm sau, họ có khoản bạn chưa có.',
          visual: { kind: 'typo', accent: 'khoản bạn chưa có.' },
        },
        {
          text: 'Bạn nghĩ người thứ hai kỷ luật hơn mình. Cũng không hẳn.',
          visual: { kind: 'typo', accent: 'Cũng không hẳn.' },
        },
        {
          text: 'Người thứ nhất tiêu không phải vì tham. Vì thấy mình xứng đáng.',
          visual: { kind: 'typo', accent: 'thấy mình xứng đáng.' },
        },
        {
          text: 'Cái áo hôm qua bạn còn thấy sang, hôm nay thành áo mặc ở nhà.',
          visual: { kind: 'typo', accent: 'áo mặc ở nhà.' },
        },
        // ── INSIGHT ĐẨY LÊN SỚM ──
        {
          text: 'Cái ngưỡng đó chạy nhanh hơn lương của bạn. Luôn luôn nhanh hơn.',
          visual: { kind: 'typo', accent: 'nhanh hơn lương của bạn.' },
        },
        // ── WHY ──
        {
          text: 'Năm một chín bảy tám, ba nhà tâm lý hỏi hai nhóm rất khác nhau.',
          visual: { kind: 'typo', accent: 'hai nhóm rất khác nhau.' },
        },
        {
          text: 'Một nhóm vừa trúng số lớn. Một nhóm vừa liệt sau tai nạn.',
          visual: { kind: 'typo', accent: 'vừa liệt sau tai nạn.' },
        },
        {
          text: 'Nhóm trúng số không vui hơn bạn với tôi là bao nhiêu.',
          visual: { kind: 'typo', accent: 'không vui hơn bạn với tôi' },
        },
        {
          text: 'Chỗ lạ ở đây: mấy niềm vui hàng ngày của họ nhạt hẳn đi.',
          visual: { kind: 'typo', accent: 'nhạt hẳn đi.' },
        },
        {
          text: 'Bữa sáng, một cuộc gặp, một bài hát quen. Nhạt hơn hồi chưa trúng.',
          visual: { kind: 'typo', accent: 'Nhạt hơn hồi chưa trúng.' },
        },
        {
          // ⚠️ "Gọi là" chứ KHÔNG phải "họ gọi đó là": khái niệm mức thích
          // nghi (adaptation level) là khung của Helson 1964, nhóm Brickman
          // ÁP DỤNG chứ không đặt tên. Gán nhầm công cho một nhóm tác giả là
          // đúng loại chi tiết người xem tra ra rồi quay lại bắt lỗi.
          text: 'Nghiên cứu đó của Brickman, Coates và Janoff-Bulman.',
          visual: { kind: 'typo', accent: 'Brickman, Coates và Janoff-Bulman.' },
        },
        {
          text: 'Cơ chế này gọi là mức thích nghi. Được gì bạn quen ngay thứ đó.',
          visual: { kind: 'typo', accent: 'mức thích nghi.' },
        },
        {
          text: 'Ông bà mình gọi ngắn hơn nhiều: được voi đòi tiên.',
          visual: { kind: 'typo', accent: 'được voi đòi tiên.' },
        },
        // ── FOR WHAT ──
        {
          text: 'Biết vậy, bạn thôi hỏi bao nhiêu là đủ. Câu đó không có đáy.',
          visual: { kind: 'typo', accent: 'không có đáy.' },
        },
        {
          text: 'Bạn hỏi câu khác: tháng này mình giữ lại được mấy phần?',
          visual: { kind: 'typo', accent: 'giữ lại được mấy phần?' },
        },
        {
          text: 'Với con bạn cũng thế. Cho đều đặn thứ gì, thứ đó hết là thưởng.',
          visual: { kind: 'typo', accent: 'hết là phần thưởng.' },
        },
        // ── PAYOFF + TWIST ──
        // Twist: khoảng trống KHÔNG phải để dành dụm — nói thế thì nó chỉ là
        // một lời khuyên tiết kiệm ai cũng nghe rồi. Nó để cái ngưỡng chưa kịp
        // dời, tức đánh vào đúng cơ chế vừa giải thích ở phần WHY.
        {
          text: 'Cách gỡ không phải kiếm thêm. Cũng không phải nhịn cho khổ.',
          visual: { kind: 'typo', accent: 'Cũng không phải nhịn' },
        },
        {
          text: 'Là chừa một khoảng trống giữa lúc tiền về và lúc bạn tiêu nó.',
          visual: { kind: 'typo', accent: 'một khoảng trống' },
        },
        {
          text: 'Khoảng đó không để dành dụm. Là để cái ngưỡng chưa kịp dời lên.',
          visual: { kind: 'typo', accent: 'chưa kịp dời lên.' },
        },
        {
          text: 'Người xưa gọi là tri túc. Biết đủ, chứ không phải có đủ.',
          visual: { kind: 'typo', accent: 'Biết đủ, chứ không phải có đủ.' },
        },
      ],
      ...cta('Còn lá số nói gì về tiền của bạn?', { ten: 'Tử Bình Bát Tự' }),
      music: 'u-hoai.wav',
      // Ích (kw42 — thêm vào) → Tổn (kw41 — hao đi) → Tiết (kw60 — biết dừng,
      // rơi đúng đoạn payoff). Cặp Tổn/Ích là cặp quẻ kinh điển về được–mất.
      backdrop: [QUE('49-kw42.png'), QUE('35-kw41.png'), QUE('19-kw60.png')],
      hashtags: ['tienbac', 'tamly', 'tietkiem', 'selfdiscovery'],
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
      /*
       * 🔴 ĐÃ GỠ NHÂN VẬT SIGNATURE khỏi kịch bản này (18/08/2026).
       *
       * Henry xem bản render: *"vừa xấu vừa chả liên quan gì đến nội dung
       * script. Cho vào càng thêm confused."* Hai lỗi tách bạch, và lỗi thứ
       * hai mới là lỗi cấu trúc:
       *   · tư thế do TÔI gõ tay ở chính chỗ này — không có cơ chế nào nối nó
       *     với lời đọc, nên nó lệch là đương nhiên;
       *   · clip này có CHỮ CHẠY + GIỌNG ĐỌC, mà nhân vật cử động là một CHỦ
       *     THỂ ⇒ nó tranh mắt với chữ. Chính CLAUDE.md đã đo: *"ảnh đổi mỗi
       *     3 giây thì mắt chạy theo ảnh chứ không đọc chữ"*.
       *
       * ⚠️ `Character.tsx` / `Glyphs.tsx` CỐ Ý giữ nguyên trên đĩa — chúng vẫn
       * đúng cho loại clip KHÔNG có chữ dẫn dắt. Đừng xoá, cũng đừng bật lại ở
       * đây mà không đo lại bằng mắt trước.
       */
      /*
       * Cầu đêm, đèn thành phố phản chiếu mặt nước.
       *
       * ⚠️ Đoạn TRƯỚC ở đây là mưa trên cửa kính — tối hơn (L=18,6) nhưng đo ra
       * **1,99/giây**, tức đứng im, và Henry xem clip nói ngay *"ko thấy video
       * chi thấy hình tĩnh"*. Đoạn này L=41,4 (vẫn dưới trần 95) nhưng động
       * **11,77** — gấp 6 lần. Chọn theo ĐỘ ĐỘNG trước, độ tối sau: nền không
       * nhúc nhích thì cả lý do đổi từ ảnh sang video biến mất.
       *
       * 27s ⇒ ở tốc độ 1× phủ 810 khung, NGẮN hơn clip (963 khung) nên
       * `VideoBackdrop` tự bọc `<Loop>` — vì thế `backdropSeconds` là BẮT BUỘC
       * ở đây, bỏ trống là đoạn phim đứng ở khung cuối suốt phần còn lại.
       */
      backdropVideo: 'stock-video/tone/tinh-lang/3138.mp4',
      backdropSeconds: 27,
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
      music: 'lang-le.wav',
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
