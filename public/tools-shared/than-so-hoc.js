/* tools-shared/than-so-hoc.js — Module DÙNG CHUNG tool Thần Số Học.
   Nguồn DUY NHẤT cho standalone /tools/than-so-hoc.html + shell /app/than-so-hoc.
   Hệ Pythagoras. window.ThanSoTool = { compute, vnYear }

   ── 2026-08 — VÁ 3 LỖI + MỞ 4 → 11 CHỈ SỐ ───────────────────────────────
   1. 🔴 SỐ ĐƯỜNG ĐỜI tính SAI quy ước. Bản cũ cộng TẤT CẢ chữ số một lượt
      (`(dd+mm+yyyy).split('')`). Nguồn thần số học Việt — và Hans Decoz mà
      chúng dẫn lại — đều dạy: rút gọn NGÀY, THÁNG, NĂM RIÊNG (giữ 11/22/33
      ở từng phần) rồi mới cộng. Đo 28.124 ngày 1950–2026: **lệch 12,06%**,
      trong đó **2.469 ngày được cấp số Master GIẢ** (riêng 33 phát nhầm
      1.134 lần trong khi 33 thật chỉ có 42 ngày — sai gấp ~27 lần) và 922
      ngày MẤT Master thật. Nay dùng `lifePath()` = rút gọn từng phần.
      ⚠️ Cộng-một-lượt KHÔNG phải "biến thể cổ pháp" — nó phá chính cấu trúc
      3 Chu Kỳ (Period Cycle) mà Đỉnh Cao/Thử Thách bên dưới dựng lên.
   2. 🔴 TÊN TIẾNG VIỆT bị XOÁ chữ chứ không phải bỏ dấu. `[^A-Z ]` xoá thẳng
      ký tự có dấu: "Lê Đình Đức" → "L NH C" (mất 5/9 chữ cái), "Đỗ Thuỳ
      Dương" → " THU DNG" (bay mất cả họ) ⇒ 3/4 chỉ số sai với gần như mọi
      người Việt gõ đúng chính tả, mà KHÔNG báo lỗi (chuỗi còn ký tự nên qua
      được validate). Nay `boDau()` chuẩn hoá NFD + đ/Đ→d/D TRƯỚC khi lọc.
   3. 🔴 Mất hết nguyên âm → Linh Hồn = 0: vòng tròn KHÔNG màu, hiện số "0",
      nhưng in nguyên văn diễn giải của SỐ 9 (`MEANINGS[0]` undefined →
      fallback `MEANINGS[9]`). Nay 0 là trạng thái RIÊNG, nói thật là không
      tính được, KHÔNG mượn nghĩa số khác.

   🔑 QUY ƯỚC DỮ LIỆU — `data` phải PHẲNG.
   `extractGenericContext` (lib/agent/prompts.ts) **bỏ qua mọi giá trị là
   object/mảng**. Chỉ số nào là danh sách thì phải dẹp thành CHUỖI ở đây,
   nếu không rail nhận thiếu và luận chay mà không có gì báo. */
(function (root) {
  var NUM_COLORS = ['', '#C0392B', '#E67E22', '#F1C40F', '#2ECC71', '#1455A4', '#8E44AD', '#1ABC9C', '#E91E63', '#2C3E50', '#c9a84c', '#5FA8D3', '#1E6B3C'];
  var VOWELS = new Set('AEIOU');
  var CHAR_VAL = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };

  // Màu nền "tài liệu" — CỐ ĐỊNH sáng ở cả 2 trang (shell khai rõ res-block
  // nền trắng). Dùng inline style cho khối MỚI để không phải giữ đồng bộ hai
  // khối CSS trong 2 file HTML.
  var C_NAVY = '#061A2E', C_TEXT = '#444', C_LINE = '#E8E8E8', C_SOFT = '#F5F4F0', C_LT = '#8A8F98';

  function vnYear() {
    try { return parseInt(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date())); }
    catch (e) { return new Date().getFullYear(); }
  }

  // Rút gọn GIỮ số Master (11/22/33) — dùng cho các chỉ số cốt lõi.
  function reduce(n) { while (n > 9 && n !== 11 && n !== 22 && n !== 33) { var s = 0; while (n > 0) { s += n % 10; n = Math.floor(n / 10); } n = s; } return n; }
  // Rút gọn VỀ MỘT CHỮ SỐ — Thử Thách và Năm Cá Nhân là vòng 1–9/0, số Master
  // không có nghĩa ở đó; giữ 11 lại sẽ làm hiệu |a−b| và chu kỳ 9 năm sai.
  function reduce1(n) { while (n > 9) { var s = 0; while (n > 0) { s += n % 10; n = Math.floor(n / 10); } n = s; } return n; }

  // Số Đường Đời — rút gọn NGÀY, THÁNG, NĂM riêng rồi cộng (xem ghi chú (1)).
  function lifePath(d, m, y) { return reduce(reduce(d) + reduce(m) + reduce(y)); }

  /* Bỏ dấu tiếng Việt về chữ Latin gốc. PHẢI chạy TRƯỚC bộ lọc [^A-Z]:
     - NFD tách "ế" thành "e" + dấu tổ hợp, rồi xoá dải dấu U+0300–U+036F;
     - đ/Đ KHÔNG tách được bằng NFD (nó là chữ cái riêng, không phải d + dấu)
       nên phải đổi tay — bỏ bước này là "Đức" mất luôn chữ đầu. */
  function boDau(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toUpperCase()
      .replace(/[^A-Z ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Tổng THÔ của tên (chưa rút gọn) — cần nguyên vẹn để dò Nợ Nghiệp Quật.
  function sumName(name, vowelOnly, consonantOnly) {
    var s = 0, up = name.toUpperCase();
    for (var i = 0; i < up.length; i++) {
      var c = up[i];
      if (!/[A-Z]/.test(c)) continue;
      var isV = VOWELS.has(c);
      if (vowelOnly && !isV) continue;
      if (consonantOnly && isV) continue;
      s += CHAR_VAL[c] || 0;
    }
    return s;
  }
  // Danh sách giá trị 1–9 của từng chữ cái — nuôi Bài Học Còn Thiếu + Đam Mê Tiềm Ẩn.
  function nameDigits(name) {
    var out = [], up = name.toUpperCase();
    for (var i = 0; i < up.length; i++) { var c = up[i]; if (/[A-Z]/.test(c)) out.push(CHAR_VAL[c]); }
    return out;
  }

  var MEANINGS = {
    1: { kw: ['Lãnh đạo', 'Tiên phong', 'Độc lập', 'Ý chí mạnh'], desc: 'Số 1 mang năng lượng của khởi đầu và lãnh đạo. Bạn có xu hướng độc lập, quyết đoán và muốn đứng đầu. Thích mở đường, ghét bị kiểm soát. Điểm yếu: cứng đầu, khó nhượng bộ.' },
    2: { kw: ['Hợp tác', 'Ngoại giao', 'Nhạy cảm', 'Trực giác'], desc: 'Số 2 là năng lượng của sự hài hòa và đối tác. Bạn nhạy cảm, có khả năng ngoại giao, thích làm việc cùng người khác hơn là đơn độc. Điểm yếu: thiếu quyết đoán, phụ thuộc vào người khác.' },
    3: { kw: ['Sáng tạo', 'Biểu đạt', 'Lạc quan', 'Giao tiếp'], desc: 'Số 3 là năng lượng của sáng tạo và biểu đạt. Bạn vui vẻ, tài năng nghệ thuật, khả năng giao tiếp xuất sắc. Điểm yếu: thiếu tập trung, hay phân tán sức lực.' },
    4: { kw: ['Kỷ luật', 'Ổn định', 'Chăm chỉ', 'Thực tế'], desc: 'Số 4 mang năng lượng của nền tảng và kỷ luật. Bạn đáng tin cậy, có tổ chức, kiên nhẫn xây dựng từng bước. Điểm yếu: cứng nhắc, khó thích nghi với thay đổi.' },
    5: { kw: ['Tự do', 'Phiêu lưu', 'Thay đổi', 'Đa tài'], desc: 'Số 5 là năng lượng của tự do và biến đổi. Bạn thích trải nghiệm mới, linh hoạt và đa tài. Điểm yếu: thiếu kiên định, dễ chán nản và bỏ cuộc giữa chừng.' },
    6: { kw: ['Yêu thương', 'Trách nhiệm', 'Chữa lành', 'Gia đình'], desc: 'Số 6 mang năng lượng của tình yêu và trách nhiệm. Bạn quan tâm, muốn chăm lo cho người khác, coi trọng gia đình và cộng đồng. Điểm yếu: hay lo lắng thái quá, can thiệp việc người khác.' },
    7: { kw: ['Trí tuệ', 'Nội tâm', 'Tâm linh', 'Phân tích'], desc: 'Số 7 là năng lượng của trí tuệ và tâm linh. Bạn có chiều sâu nội tâm, thích phân tích và tìm kiếm sự thật. Điểm yếu: hướng nội quá mức, khó mở lòng với người khác.' },
    8: { kw: ['Quyền lực', 'Thịnh vượng', 'Tham vọng', 'Thực tế'], desc: 'Số 8 mang năng lượng của vật chất và quyền lực. Bạn có tham vọng, khả năng tổ chức và bản năng kinh doanh. Điểm yếu: quá tập trung vào vật chất, có thể cứng nhắc và kiểm soát.' },
    9: { kw: ['Nhân ái', 'Lý tưởng', 'Hy sinh', 'Trí tuệ cao'], desc: 'Số 9 là năng lượng của sự hoàn chỉnh và nhân ái. Bạn có tầm nhìn rộng, muốn cống hiến cho nhân loại. Điểm yếu: quá lý tưởng hóa, có thể bị tổn thương khi thực tế không như mong đợi.' },
    11: { kw: ['Trực giác cao', 'Truyền cảm hứng', 'Nhạy cảm', 'Thiên khiếu'], desc: 'Số 11 là số Master — trực giác cực cao và khả năng truyền cảm hứng mạnh. Bạn nhạy cảm với năng lượng xung quanh và có sứ mệnh soi sáng cho người khác. Điểm yếu: dễ lo âu, áp lực nội tâm lớn.' },
    22: { kw: ['Kiến trúc sư vĩ đại', 'Thực tế', 'Lý tưởng', 'Xây dựng'], desc: 'Số 22 là số Master Builder — kết hợp tầm nhìn của số 11 với tính thực tế của số 4. Bạn có khả năng biến giấc mơ lớn thành hiện thực. Điểm yếu: gánh chịu quá nhiều trách nhiệm, dễ kiệt sức.' },
    33: { kw: ['Thầy giáo tâm linh', 'Yêu thương', 'Hy sinh', 'Chữa lành'], desc: 'Số 33 là Master Teacher — đỉnh cao của số 6, mang tình yêu vô điều kiện. Bạn có thiên hướng hướng dẫn và chữa lành. Điểm yếu: có thể ôm đồm quá mức, cần học cách tự chăm sóc bản thân.' },
  };

  // Nợ Nghiệp Quật — 4 con số cổ điển. Chỉ nhận khi TỔNG THÔ (trước khi rút
  // gọn) đúng bằng 13/14/16/19; rút gọn xong thì dấu vết biến mất.
  var KARMIC_DEBT = {
    13: { ten: 'Nợ 13/4', desc: 'Kiếp này phải trả bằng LAO ĐỘNG. Việc gì cũng lâu hơn người khác, hay gặp cảm giác "làm mãi không tới". Lối ra không phải là làm nhiều hơn mà là làm CÓ TRẬT TỰ và không bỏ ngang giữa chừng — mọi lần bỏ ngang đều quay lại từ đầu.' },
    14: { ten: 'Nợ 14/5', desc: 'Bài học về TIẾT ĐỘ và tự do có kỷ luật. Dễ sa vào hưởng thụ quá đà, đổi hướng liên tục, lạm dụng chất kích thích hoặc các mối quan hệ chớp nhoáng. Lối ra là tự đặt giới hạn cho chính mình trước khi hoàn cảnh đặt giúp.' },
    16: { ten: 'Nợ 16/7', desc: 'Nặng nhất trong bốn nợ. Đời hay có những cú sập đột ngột phá vỡ cái tôi đang dựng lên — danh tiếng, tình cảm hoặc niềm tin. Mỗi lần sập là một lần buộc phải dựng lại trên nền thật hơn. Lối ra là buông kiêu mạn và sống thành thật, đừng chờ tới lúc bị buộc.' },
    19: { ten: 'Nợ 19/1', desc: 'Bài học "đứng một mình". Hay rơi vào cảnh phải tự xoay trong khi tưởng sẽ có người đỡ, hoặc quá độc lập tới mức không ai giúp nổi. Lối ra là học XIN GIÚP và học cho đi — độc lập không có nghĩa là đơn độc.' },
  };

  // Bài Học Còn Thiếu (Karmic Lesson) — chữ số 1–9 KHÔNG xuất hiện trong tên.
  var KARMIC_LESSON = {
    1: 'Thiếu 1 — khó tự khẳng định, hay chờ người khác quyết. Cần luyện nói "tôi muốn" mà không thấy có lỗi.',
    2: 'Thiếu 2 — vụng trong phối hợp và nhún nhường; dễ làm phật lòng người khác vì thẳng quá. Cần học lắng nghe trước khi phản biện.',
    3: 'Thiếu 3 — khó diễn đạt cảm xúc, hay tự chê mình không có khiếu. Cần một kênh biểu đạt đều đặn (viết, nói, vẽ, hát).',
    4: 'Thiếu 4 — ngại việc tỉ mỉ, kế hoạch hay đứt gánh. Cần một hệ thống bên ngoài (lịch, quy trình) thay cho ý chí.',
    5: 'Thiếu 5 — sợ thay đổi, bám vào cái quen dù đã hết hợp. Cần chủ động tạo trải nghiệm mới trước khi bị hoàn cảnh ép đổi.',
    6: 'Thiếu 6 — né trách nhiệm với người thân, hoặc gánh mà trong lòng oán. Cần học cam kết có giới hạn rõ.',
    7: 'Thiếu 7 — ít khi ngồi yên tự soi mình, hay quyết theo cảm tính. Cần dành khoảng lặng để nghĩ trước khi làm.',
    8: 'Thiếu 8 — lúng túng với tiền bạc và quyền lực, hay bán rẻ công sức. Cần học định giá bản thân và đàm phán.',
    9: 'Thiếu 9 — khó nhìn xa hơn lợi ích trước mắt, dễ tính toán chi ly. Cần một việc cho đi mà không tính công.',
  };

  // Năm Cá Nhân — vòng 9 năm. Đây là chỉ số DUY NHẤT đổi theo thời gian, và
  // là lý do người ta quay lại tool mỗi năm.
  var PERSONAL_YEAR = {
    1: 'Năm MỞ ĐẦU. Gieo hạt cho cả chu kỳ 9 năm tới: đổi việc, khởi sự, dọn chỗ ở. Việc quyết trong năm nay còn ảnh hưởng rất lâu — đừng để trôi.',
    2: 'Năm CHỜ và KẾT NỐI. Việc gieo năm ngoái chưa ra quả, sốt ruột là hỏng. Năm của hợp tác, đối tác, chuyện tình cảm; nên nhẫn và giữ quan hệ.',
    3: 'Năm BIỂU ĐẠT. Giao tiếp, sáng tạo, mở rộng quan hệ đều thuận; hợp làm truyền thông, học nói, ra mắt sản phẩm. Coi chừng tiêu tán sức vào quá nhiều việc.',
    4: 'Năm XÂY NỀN. Nặng nhọc, ít hào nhoáng, nhưng là năm dựng móng: giấy tờ, kỷ luật, sức khỏe, tích lũy. Đốt cháy giai đoạn năm nay là trả giá về sau.',
    5: 'Năm BIẾN ĐỘNG. Thay đổi, đi lại, cơ hội bất ngờ, cũng dễ xáo trộn. Nắm cơ hội nhưng đừng ký kết dài hạn khi đang phấn khích.',
    6: 'Năm GIA ĐÌNH và TRÁCH NHIỆM. Cưới hỏi, sinh con, mua nhà, chăm người thân. Sự nghiệp có thể phải nhường chỗ — đó là đúng nhịp, không phải chậm tiến.',
    7: 'Năm NHÌN VÀO TRONG. Học, nghiên cứu, chữa lành, rút bớt việc. Ép mình bung ra kiếm tiền trong năm này thường mệt mà không tới đâu.',
    8: 'Năm GẶT về vật chất. Tiền bạc, thăng tiến, quyền hành rõ nhất trong cả chu kỳ. Nhưng chỉ gặt được đúng phần đã gieo từ năm 1 tới nay.',
    9: 'Năm KẾT THÚC và BUÔNG. Dứt việc cũ, cắt quan hệ đã cạn, dọn dẹp. Đừng khởi sự lớn — để dành cho năm 1 ngay sau đó.',
  };

  /* Thử Thách — hiệu tuyệt đối nên chạy 0–8. Số 0 là ca riêng, không phải "không có".
     ⚠️ Các mục dưới CỐ Ý không mang tiền tố "Thử thách N —": phần render đã in
     nhãn đó rồi, để cả hai thì ra "Thử thách 2: Thử thách 2 — ..." ở cả 4 chặng. */
  var CHALLENGE = {
    0: '"thử thách của lựa chọn". Không thiếu năng lực nào rõ rệt, nên khó khăn nằm ở chỗ tự chọn hướng và tự chịu trách nhiệm, không đổ được cho ai.',
    1: 'bị lấn át, khó giữ chính kiến trước người mạnh hơn. Học đứng vững mà không cần gây hấn.',
    2: 'quá nhạy cảm với lời người khác, sợ va chạm. Học chịu được sự khác biệt mà không co lại.',
    3: 'tự phê phán, thấy mình nói/làm gì cũng chưa đủ hay. Học biểu đạt dù chưa hoàn hảo.',
    4: 'ngại kỷ luật và việc dài hơi, hay bỏ dở. Học đi hết một việc trước khi mở việc mới.',
    5: 'bốc đồng, ham cái mới, khó ngồi yên. Học chọn ít mà sâu.',
    6: 'tiêu chuẩn quá cao với mình và người thân, dễ thành kiểm soát. Học chấp nhận cái chưa hoàn hảo.',
    7: 'hoài nghi, khó tin ai, hay giấu mình. Học mở lòng có chọn lọc.',
    8: 'quan hệ giằng co với tiền và quyền: hoặc né tránh, hoặc bị nó cuốn. Học dùng nguồn lực mà không bị nó định nghĩa mình.',
  };

  /* Biểu Đồ Ngày Sinh — lưới 3×3 theo bố cục Pythagoras dùng phổ biến ở VN:
        3 6 9
        2 5 8
        1 4 7
     Mũi tên = một hàng/cột/đường chéo có ĐỦ 3 số (mạnh) hoặc TRỐNG cả 3 (yếu). */
  var ARROWS = [
    { line: [3, 6, 9], manh: 'Mũi tên Trí Tuệ', yeu: 'Mũi tên Trí Nhớ Kém', mo: 'tư duy sắc, nhớ lâu, học nhanh', mv: 'hay quên chi tiết, cần ghi chép thay vì tin trí nhớ' },
    { line: [2, 5, 8], manh: 'Mũi tên Cân Bằng Cảm Xúc', yeu: 'Mũi tên Nhạy Cảm', mo: 'vững vàng trước biến động, ít bị cuốn theo cảm xúc', mv: 'dễ tổn thương vì lời nói, cần môi trường ôn hòa' },
    { line: [1, 4, 7], manh: 'Mũi tên Thực Tế', yeu: 'Mũi tên Vụng Việc Tay', mo: 'giỏi việc cụ thể, làm bằng tay, tổ chức đời sống vật chất', mv: 'ngại việc tay chân/chi tiết, nên giao cho người khác' },
    { line: [1, 2, 3], manh: 'Mũi tên Kế Hoạch', yeu: 'Mũi tên Thiếu Trật Tự', mo: 'nghĩ có đầu có cuối, lên kế hoạch tự nhiên', mv: 'làm tới đâu hay tới đó, cần công cụ bên ngoài để giữ trật tự' },
    { line: [4, 5, 6], manh: 'Mũi tên Ý Chí', yeu: 'Mũi tên Dễ Nản', mo: 'lì đòn, đã quyết là theo tới cùng', mv: 'dễ buông khi gặp cản, cần người đồng hành thúc' },
    { line: [7, 8, 9], manh: 'Mũi tên Hoạt Động', yeu: 'Mũi tên Trì Hoãn', mo: 'bắt tay vào việc nhanh, không lê la', mv: 'hay để đó mai tính, cần deadline từ bên ngoài' },
    { line: [1, 5, 9], manh: 'Mũi tên Quyết Tâm', yeu: 'Mũi tên Do Dự', mo: 'đặt mục tiêu là đi tới cùng, khó lay chuyển', mv: 'khó ra quyết định, hay đổi ý phút chót' },
    { line: [3, 5, 7], manh: 'Mũi tên Tâm Linh', yeu: 'Mũi tên Hoài Nghi', mo: 'trực giác mạnh, nhạy với điều chưa nói ra', mv: 'chỉ tin cái thấy được, khó chấp nhận điều mơ hồ' },
  ];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function circle(n, size) {
    var sz = size || 64, fs = Math.round(sz * 0.44);
    return '<div style="width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:' + fs + 'px;font-weight:700;flex-shrink:0;color:#fff;background:' + (NUM_COLORS[Math.min(n, 12)] || C_LT) + '">' + n + '</div>';
  }
  function sectionTitle(t, sub) {
    return '<div style="padding:16px 24px 8px;border-top:1px solid ' + C_LINE + '"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + C_LT + '">' + esc(t) + '</div>' +
      (sub ? '<div style="font-size:12px;color:' + C_TEXT + ';margin-top:3px;line-height:1.6">' + esc(sub) + '</div>' : '') + '</div>';
  }
  // Thẻ số dùng lại class .num-card có sẵn ở CẢ 2 trang.
  function numCard(n, title, sub, desc, kws) {
    return '<div class="num-card">' + circle(n) +
      '<div class="num-content"><div class="num-title">' + esc(title) + (sub ? ' <span style="font-weight:400;color:' + C_LT + '">' + esc(sub) + '</span>' : '') + '</div>' +
      '<div class="num-desc">' + esc(desc) + '</div>' +
      (kws && kws.length ? '<div class="num-keywords">' + kws.map(function (k) { return '<span class="num-kw">' + esc(k) + '</span>'; }).join('') + '</div>' : '') +
      '</div></div>';
  }

  /**
   * compute(ngay, thang, nam, tenRaw, [namXem])
   *   → { ok, error?, resultHTML, data }
   * `data` PHẲNG tuyệt đối (xem ghi chú đầu file).
   */
  function compute(ngay, thang, nam, tenRaw, namXem) {
    ngay = parseInt(ngay, 10); thang = parseInt(thang, 10); nam = parseInt(nam, 10);
    if (!ngay || !thang || !nam) return { ok: false, error: 'Vui lòng nhập ngày tháng năm sinh.' };
    if (ngay < 1 || ngay > 31 || thang < 1 || thang > 12 || nam < 1000 || nam > 9999) {
      return { ok: false, error: 'Ngày tháng năm sinh không hợp lệ.' };
    }
    var ten = boDau(tenRaw);
    if (!ten) return { ok: false, error: 'Vui lòng nhập tên (có dấu hay không dấu đều được).' };

    var namHienTai = namXem || vnYear();

    // ── Cốt lõi ──────────────────────────────────────────────────────────
    var duongDoi = lifePath(ngay, thang, nam);
    var rawDinhMenh = sumName(ten), rawLinhHon = sumName(ten, true, false), rawSuMenh = sumName(ten, false, true);
    var dinhMenh = reduce(rawDinhMenh), linhHon = reduce(rawLinhHon), suMenh = reduce(rawSuMenh);

    // ── Phái sinh ────────────────────────────────────────────────────────
    var ngaySinh = reduce(ngay);                              // Số Ngày Sinh
    var thaiDo = reduce(reduce(ngay) + reduce(thang));        // Số Thái Độ
    var truongThanh = dinhMenh ? reduce(duongDoi + dinhMenh) : 0; // Số Trưởng Thành
    var namCaNhan = reduce1(reduce(ngay) + reduce(thang) + reduce(namHienTai));

    // ── Nợ Nghiệp Quật — dò trên TỔNG THÔ ────────────────────────────────
    var noList = [];
    [[reduce(ngay) + reduce(thang) + reduce(nam), 'Đường Đời'], [rawDinhMenh, 'Định Mệnh'],
     [rawLinhHon, 'Linh Hồn'], [rawSuMenh, 'Sứ Mệnh'], [ngay, 'Ngày Sinh']].forEach(function (p) {
      if (KARMIC_DEBT[p[0]] && noList.indexOf(p[0] + '|' + p[1]) < 0) noList.push(p[0] + '|' + p[1]);
    });

    // ── Biểu Đồ Ngày Sinh ────────────────────────────────────────────────
    var grid = {}; for (var g = 1; g <= 9; g++) grid[g] = 0;
    (String(ngay) + String(thang) + String(nam)).split('').forEach(function (c) { var v = parseInt(c, 10); if (v >= 1 && v <= 9) grid[v]++; });
    var thieuBD = [], coBD = [];
    for (var i2 = 1; i2 <= 9; i2++) { if (grid[i2] === 0) thieuBD.push(i2); else coBD.push(i2 + '×' + grid[i2]); }
    var mtManh = [], mtTrong = [];
    ARROWS.forEach(function (a) {
      if (a.line.every(function (n) { return grid[n] > 0; })) mtManh.push(a);
      else if (a.line.every(function (n) { return grid[n] === 0; })) mtTrong.push(a);
    });

    // ── Bài Học Còn Thiếu + Đam Mê Tiềm Ẩn (từ TÊN) ──────────────────────
    var nd = nameDigits(ten), cnt = {};
    for (var k2 = 1; k2 <= 9; k2++) cnt[k2] = 0;
    nd.forEach(function (v) { cnt[v]++; });
    var baiHoc = [], maxC = 0;
    for (var k3 = 1; k3 <= 9; k3++) { if (cnt[k3] === 0) baiHoc.push(k3); if (cnt[k3] > maxC) maxC = cnt[k3]; }
    var damMe = [];
    for (var k4 = 1; k4 <= 9; k4++) if (maxC > 0 && cnt[k4] === maxC) damMe.push(k4);

    /* ── Đỉnh Cao & Thử Thách ────────────────────────────────────────────
       Dựng trên ngày/tháng/năm ĐÃ rút gọn — đúng cấu trúc 3 Chu Kỳ mà phép
       tính Đường Đời từng phần ở trên tạo ra. Mốc tuổi: đỉnh 1 kéo tới
       36 − ĐườngĐời (rút về 1 chữ số), mỗi đỉnh sau 9 năm. */
    var rd = reduce1(ngay), rm = reduce1(thang), ry = reduce1(nam);
    var p1 = reduce(rm + rd), p2 = reduce(rd + ry), p3 = reduce(reduce1(rm + rd) + reduce1(rd + ry)), p4 = reduce(rm + ry);
    var c1 = Math.abs(rm - rd), c2 = Math.abs(rd - ry), c3 = Math.abs(c1 - c2), c4 = Math.abs(rm - ry);
    var end1 = 36 - reduce1(duongDoi);
    var moc = [[0, end1], [end1 + 1, end1 + 9], [end1 + 10, end1 + 18], [end1 + 19, null]];
    var tuoiHienTai = namHienTai - nam;
    function mocLabel(i) { var a = moc[i]; return a[1] == null ? (a[0] + ' tuổi trở đi') : (a[0] + '–' + a[1] + ' tuổi'); }
    function dangO(i) { var a = moc[i]; return tuoiHienTai >= a[0] && (a[1] == null || tuoiHienTai <= a[1]); }
    var dinhCaoArr = [p1, p2, p3, p4], thuThachArr = [c1, c2, c3, c4];
    var idxHienTai = -1; for (var q = 0; q < 4; q++) if (dangO(q)) { idxHienTai = q; break; }

    // ── Render ───────────────────────────────────────────────────────────
    var html = '';

    // 4 số cốt lõi (giữ nguyên bố cục cũ)
    var core = [
      { n: duongDoi, t: 'Số Đường Đời', s: '(từ ngày sinh)' },
      { n: dinhMenh, t: 'Số Định Mệnh', s: '(từ tên đầy đủ)' },
      { n: linhHon, t: 'Số Linh Hồn', s: '(từ nguyên âm)' },
      { n: suMenh, t: 'Số Sứ Mệnh', s: '(từ phụ âm)' },
    ];
    html += core.map(function (c) {
      /* 0 = tên không có nguyên âm (hoặc phụ âm) nào. KHÔNG mượn nghĩa số
         khác — bản cũ fallback sang MEANINGS[9] nên hiện số "0" kèm nguyên
         văn diễn giải của số 9, tự mâu thuẫn ngay trên màn hình. */
      if (!c.n) {
        return '<div class="num-card"><div style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0;color:' + C_LT + ';border:2px dashed ' + C_LINE + '">—</div>' +
          '<div class="num-content"><div class="num-title">' + esc(c.t) + ' <span style="font-weight:400;color:' + C_LT + '">' + esc(c.s) + '</span></div>' +
          '<div class="num-desc">Không tính được từ tên đã nhập (tên không chứa ' + (c.t === 'Số Linh Hồn' ? 'nguyên âm' : 'phụ âm') + ' nào sau khi bỏ dấu). Hãy nhập đầy đủ họ và tên khai sinh.</div></div></div>';
      }
      var m = MEANINGS[c.n];
      return numCard(c.n, c.t, c.s, m.desc, m.kw);
    }).join('');

    // Nhóm phái sinh
    html += sectionTitle('Ba chỉ số bổ sung', 'Ba lớp nữa của cùng một lá số: cách bạn bước vào đời, cách người khác gặp bạn lần đầu, và con người bạn trở thành ở nửa sau cuộc đời.');
    html += numCard(ngaySinh, 'Số Ngày Sinh', '(ngày ' + ngay + ')', 'Món quà bẩm sinh — tài lẻ có sẵn không cần học, thường lộ ra rất sớm. ' + MEANINGS[ngaySinh].desc.replace(/^Số \d+ (là|mang) /, 'Ở đây nó là '), MEANINGS[ngaySinh].kw);
    html += numCard(thaiDo, 'Số Thái Độ', '(ngày + tháng)', 'Ấn tượng đầu tiên bạn tạo ra và phản xạ của bạn khi bị dồn — mạnh nhất trong khoảng 30–35 năm đầu, và thường KHÁC hẳn con người thật bên trong. ' + MEANINGS[thaiDo].desc, MEANINGS[thaiDo].kw);
    if (truongThanh) {
      html += numCard(truongThanh, 'Số Trưởng Thành', '(Đường Đời + Định Mệnh)', 'Đích đến của nửa sau cuộc đời, thường phát huy rõ từ khoảng 35–40 tuổi trở đi, khi hai dòng năng lượng lớn nhất trong lá số hòa vào nhau. ' + MEANINGS[truongThanh].desc, MEANINGS[truongThanh].kw);
    }

    // Năm cá nhân
    html += sectionTitle('Năm cá nhân ' + namHienTai, 'Chỉ số duy nhất đổi theo thời gian — mỗi năm rơi vào một bậc trong vòng 9 năm.');
    html += numCard(namCaNhan, 'Năm Cá Nhân ' + namCaNhan + '/9', '(năm ' + namHienTai + ')', PERSONAL_YEAR[namCaNhan], []);

    // Biểu đồ ngày sinh
    html += sectionTitle('Biểu đồ ngày sinh', 'Các chữ số có trong ' + String(ngay).padStart(2, '0') + '/' + String(thang).padStart(2, '0') + '/' + nam + ' xếp vào lưới Pythagoras. Ô đậm là năng lượng sẵn có, ô mờ là phần còn thiếu.');
    html += '<div style="padding:4px 24px 18px"><div style="display:grid;grid-template-columns:repeat(3,52px);gap:6px">';
    [[3, 6, 9], [2, 5, 8], [1, 4, 7]].forEach(function (row) {
      row.forEach(function (n) {
        var has = grid[n] > 0;
        html += '<div style="height:52px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid ' + C_LINE + ';background:' + (has ? C_SOFT : 'transparent') + ';color:' + (has ? C_NAVY : '#CFCFCF') + '">' +
          '<div style="font-size:17px;font-weight:700;line-height:1">' + (has ? String(n).repeat(Math.min(grid[n], 4)) : n) + '</div>' +
          '<div style="font-size:9px;color:' + (has ? C_LT : '#CFCFCF') + ';margin-top:2px">' + (has ? '×' + grid[n] : 'trống') + '</div></div>';
      });
    });
    html += '</div>';
    if (mtManh.length) {
      html += '<div style="margin-top:14px;font-size:12.5px;color:' + C_TEXT + ';line-height:1.75"><b style="color:' + C_NAVY + '">Mũi tên mạnh:</b> ' +
        mtManh.map(function (a) { return '<b>' + esc(a.manh) + '</b> (' + esc(a.line.join('-')) + ') — ' + esc(a.mo); }).join('; ') + '.</div>';
    }
    if (mtTrong.length) {
      html += '<div style="margin-top:8px;font-size:12.5px;color:' + C_TEXT + ';line-height:1.75"><b style="color:' + C_NAVY + '">Mũi tên trống:</b> ' +
        mtTrong.map(function (a) { return '<b>' + esc(a.yeu) + '</b> (' + esc(a.line.join('-')) + ') — ' + esc(a.mv); }).join('; ') + '.</div>';
    }
    if (!mtManh.length && !mtTrong.length) {
      html += '<div style="margin-top:14px;font-size:12.5px;color:' + C_LT + ';line-height:1.7">Ngày sinh này không tạo thành mũi tên đủ 3 số nào, cũng không có hàng nào trống hẳn — năng lượng trải khá đều, không có thái cực rõ rệt.</div>';
    }
    html += '</div>';

    // Bài học còn thiếu / đam mê tiềm ẩn
    html += sectionTitle('Bài học còn thiếu & đam mê tiềm ẩn', 'Đọc từ TÊN: chữ số nào vắng mặt là bài học phải học trong đời, chữ số lặp nhiều nhất là thứ bạn bị cuốn vào mà không cưỡng được.');
    html += '<div style="padding:4px 24px 18px;font-size:12.5px;color:' + C_TEXT + ';line-height:1.75">';
    if (baiHoc.length) {
      html += '<div><b style="color:' + C_NAVY + '">Bài học còn thiếu (' + baiHoc.join(', ') + '):</b></div><ul style="margin:6px 0 0;padding-left:18px">' +
        baiHoc.map(function (n) { return '<li style="margin-bottom:4px">' + esc(KARMIC_LESSON[n]) + '</li>'; }).join('') + '</ul>';
    } else {
      html += '<div>Tên của bạn chứa đủ cả 9 chữ số — <b>không có bài học còn thiếu</b>. Trường hợp khá hiếm: không mảng nào bị bỏ trống, nhưng cũng không có mảng nào được nhấn mạnh sẵn, mọi thứ đều phải tự chọn mà rèn.</div>';
    }
    if (damMe.length) {
      html += '<div style="margin-top:12px"><b style="color:' + C_NAVY + '">Đam mê tiềm ẩn (' + damMe.join(', ') + '):</b> ' +
        damMe.map(function (n) { return esc(MEANINGS[n].kw.join(' · ')); }).join(' | ') +
        ' — đây là thứ bạn quay về mãi dù có chuyển nghề bao nhiêu lần; mạnh quá thì thành lệch, cần chỗ xả lành mạnh.</div>';
    }
    html += '</div>';

    // Nợ nghiệp quật
    html += sectionTitle('Nợ nghiệp quật', 'Bốn con số 13 · 14 · 16 · 19 — chỉ hiện khi TỔNG THÔ (trước lúc rút gọn) rơi đúng vào chúng.');
    html += '<div style="padding:4px 24px 18px;font-size:12.5px;color:' + C_TEXT + ';line-height:1.75">';
    if (noList.length) {
      html += noList.map(function (s) {
        var p = s.split('|'), kd = KARMIC_DEBT[parseInt(p[0], 10)];
        return '<div style="margin-bottom:10px"><b style="color:' + C_NAVY + '">' + esc(kd.ten) + '</b> <span style="color:' + C_LT + '">(ở chỉ số ' + esc(p[1]) + ')</span><br>' + esc(kd.desc) + '</div>';
      }).join('');
    } else {
      html += 'Lá số này <b>không mang nợ nghiệp quật</b> nào trong bốn con số 13/14/16/19. Không có nghĩa là đời không có thử thách — phần đó nằm ở mục Thử Thách bên dưới.';
    }
    html += '</div>';

    // Đỉnh cao & thử thách
    html += sectionTitle('Đỉnh cao & thử thách theo giai đoạn', 'Bốn chặng đời, mỗi chặng có một Đỉnh Cao (cơ hội nổi bật) đi kèm một Thử Thách (bài học phải trả). Mốc tuổi suy từ Số Đường Đời ' + reduce1(duongDoi) + ' (36 − ' + reduce1(duongDoi) + ' = ' + end1 + ').');
    html += '<div style="padding:4px 24px 18px">';
    for (var s2 = 0; s2 < 4; s2++) {
      var here = s2 === idxHienTai;
      html += '<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:8px;margin-bottom:6px;border:1px solid ' + (here ? '#c9a84c' : C_LINE) + ';background:' + (here ? '#FBF7EC' : 'transparent') + '">' +
        circle(dinhCaoArr[s2], 40) +
        '<div style="flex:1;font-size:12.5px;color:' + C_TEXT + ';line-height:1.7">' +
        '<div style="font-weight:700;color:' + C_NAVY + '">Chặng ' + (s2 + 1) + ' · ' + esc(mocLabel(s2)) + (here ? ' <span style="color:#a8863a">— bạn đang ở đây</span>' : '') + '</div>' +
        '<div style="margin-top:3px"><b>Đỉnh cao ' + dinhCaoArr[s2] + ':</b> ' + esc(MEANINGS[dinhCaoArr[s2]].kw.join(' · ')) + '.</div>' +
        '<div style="margin-top:2px"><b>Thử thách ' + thuThachArr[s2] + ':</b> ' + esc(CHALLENGE[thuThachArr[s2]]) + '</div>' +
        '</div></div>';
    }
    html += '</div>';

    // ── data PHẲNG cho rail ──────────────────────────────────────────────
    var dinhCaoStr = [0, 1, 2, 3].map(function (i) { return 'Chặng ' + (i + 1) + ' (' + mocLabel(i) + '): đỉnh ' + dinhCaoArr[i] + ' / thử thách ' + thuThachArr[i]; }).join(' · ');

    return {
      ok: true,
      resultHTML: html,
      data: {
        dob: (ngay < 10 ? '0' + ngay : ngay) + '/' + (thang < 10 ? '0' + thang : thang) + '/' + nam,
        ten: ten,
        soDuongDoi: duongDoi,
        soDinhMenh: dinhMenh,
        soLinhHon: linhHon,
        soSuMenh: suMenh,
        soNgaySinh: ngaySinh,
        soThaiDo: thaiDo,
        soTruongThanh: truongThanh || '',
        namXemThanSo: namHienTai,
        tuoiHienTai: tuoiHienTai,
        namCaNhan: namCaNhan,
        bieuDoCo: coBD.join(', ') || '(không có)',
        bieuDoThieu: thieuBD.join(', ') || '(đủ cả 9 số)',
        muiTenManh: mtManh.map(function (a) { return a.manh + ' (' + a.line.join('-') + ')'; }).join(', ') || '(không có)',
        muiTenTrong: mtTrong.map(function (a) { return a.yeu + ' (' + a.line.join('-') + ')'; }).join(', ') || '(không có)',
        baiHocConThieu: baiHoc.join(', ') || '(không thiếu số nào)',
        damMeTiemAn: damMe.join(', ') || '(không xác định)',
        noNghiepQuat: noList.map(function (s) { var p = s.split('|'); return KARMIC_DEBT[parseInt(p[0], 10)].ten + ' ở ' + p[1]; }).join(', ') || '(không có)',
        dinhCaoThuThach: dinhCaoStr,
        changHienTai: idxHienTai >= 0 ? ('Chặng ' + (idxHienTai + 1) + ' — ' + mocLabel(idxHienTai)) : '',
      },
    };
  }

  var API = { compute: compute, vnYear: vnYear };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ThanSoTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
