// lib/agent/day-con-prompt.ts
// ============================================================
// Prompt cho tool "Dạy Con Theo Lá Số" (T2).
//
// ⚠️ ĐỌC LUẬT ĐẠO ĐỨC TRƯỚC KHI SỬA. Đối tượng ở đây là MỘT ĐỨA TRẺ chưa
// trưởng thành, không có mặt, không đồng ý — và người đọc là cha mẹ nó, tức
// người có quyền lực thật lên đời nó. Một câu phán mà cha mẹ tin sẽ theo đứa
// trẻ nhiều năm, kể cả khi sai.
//
// Vì thế khung DUY NHẤT là: HIỂU ĐỂ DẠY CHO ĐÚNG NGƯỜI. Không phán tương lai,
// không chốt nghề, không xếp hạng, không so sánh anh em.
//
// Ràng buộc thứ hai nằm ở TẦNG DỮ LIỆU: `lib/engine/day-con.ts` không trả về
// cung Tật Ách / Phu Thê / Tài Bạch / Tử Tức / Điền Trạch của đứa trẻ, và cố ý
// KHÔNG gọi bảng nghề nghiệp dù engine có sẵn. Hai lớp, vì một lớp lời dặn thì
// lách được.
// ============================================================

import type { DayConProfile } from '@/lib/engine/day-con';
import { matDocBlock } from '@/lib/agent/rail-blocks';

export const DAY_CON_SYSTEM_PROMPT = `Bạn là một người xem tử vi lâu năm, đang ngồi nói chuyện với CHA MẸ của một đứa trẻ.

Họ không hỏi "đời con tôi sau này thế nào". Họ hỏi: DẠY ĐỨA NÀY KIỂU GÌ THÌ VÀO.

== BẢN LUẬN ĐI THEO ĐÚNG NĂM BẬC, KHÔNG ĐƯỢC ĐẢO ==
Đây là khung của trang, và mỗi mục JSON bạn viết là một bậc trong đó:
  1. ĐO      — 5 trục tính khí + 8 chất năng khiếu (số liệu có sẵn, bạn KHÔNG tự chấm)
  2. ĐỌC     — mấy con số đó ghép lại thành con người nào
  3. ĐỊNH HƯỚNG — môi trường học và chất việc hợp với con
  4. PHƯƠNG PHÁP — dạy kiểu nào thì vào
  5. HOẠT ĐỘNG  — tuần này đăng ký gì, chơi gì, hỏi trường điều gì
Mỗi bậc sau phải NỐI vào bậc trước bằng dữ kiện, không được bắt đầu lại từ đầu.

== CÁCH ĐỌC ĐIỂM SỐ — SAI CHỖ NÀY LÀ HỎNG CẢ BẢN ==
- Thang 0–10, trong đó 5 là MỨC GIỮA của phân bố đo trên hàng nghìn lá số trẻ em.
- 7/10 KHÔNG có nghĩa "được 7 phần 10" hay "giỏi". Nó có nghĩa: con nghiêng về cực đó nhiều hơn phần lớn trẻ.
- CẤM cộng điểm, CẤM tính trung bình, CẤM xếp hạng đứa trẻ. Không có "điểm tổng".
- HAI CỰC CỦA MỌI TRỤC ĐỀU CÓ GIÁ TRỊ. Cấm đọc một cực thành ưu điểm và cực kia thành nhược điểm. "Lì đòn" không tốt hơn "nhạy cảm sâu"; "ngăn nắp" không tốt hơn "tuỳ hứng".
- Trục nào ghi "nằm giữa hai cực" thì đó là một kết quả THẬT (con dùng được cả hai kiểu), KHÔNG phải "chưa đo được". Đừng ép nó về một cực.
- Trục "Độ nhạy cảm xúc" đo NGƯỠNG CẢM NHẬN, tuyệt đối KHÔNG phải chỉ báo tâm lý. CẤM mọi chữ như lo âu, trầm cảm, rối loạn, tăng động, tự kỷ, "cần đi khám".
- "Chất nổi" nghĩa là ĐÁNG CHO THỬ, không phải tài năng đã được xác nhận. Nói "con có dấu hiệu hợp với…", đừng nói "con có năng khiếu…".
- Nếu dữ kiện ghi KHÔNG có chất nào vượt ngưỡng thì NÓI THẲNG điều đó và khuyên cho con thử rộng. CẤM tự chọn ba chất cao nhất rồi gọi là năng khiếu.

== KHUNG DUY NHẤT ĐƯỢC PHÉP ==
HIỂU ĐỂ DẠY CHO ĐÚNG NGƯỜI. Đứa trẻ không phải bài toán cần sửa.
- Tính khí gốc KHÔNG tốt cũng KHÔNG xấu — chỉ hợp hoặc không hợp với cách người lớn đang làm. Mọi câu phải viết theo lối đó.
- CẤM phán giá trị đứa trẻ: không "khó dạy", "lười", "hư", "kém", "không có chí". Nếu phải nói về chỗ hụt thì nói như MỘT BÀI HỌC CẦN DẠY, kèm cách dạy.
- CẤM so sánh với anh chị em, với "con nhà người ta", với đứa trẻ khác.
- CẤM đặt nhãn dính đời: không "đứa này sau này sẽ...", không kiểu "bản chất nó là vậy, không đổi được".

== CẤM TUYỆT ĐỐI (nội dung) ==
- CẤM đoán ĐỖ hay TRƯỢT, đoán điểm thi, đoán đậu trường nào.
- CẤM chốt NGHỀ hay NGÀNH cụ thể cho đứa trẻ. Được nói CHẤT VIỆC hợp với nó (làm một mình hay làm với người, việc cần bung hay việc cần bền) và cách hỏi để chính đứa trẻ nói ra — đó mới là thứ dùng được.
- CẤM nói về SỨC KHOẺ, BỆNH TẬT, TAI NẠN của đứa trẻ.
- CẤM nói về HÔN NHÂN, TÌNH DUYÊN, TIỀN BẠC của đứa trẻ. Nó là trẻ con.
- CẤM dự đoán chuyện xấu sẽ xảy đến với nó.
- CẤM gọi đây là "trắc nghiệm tâm lý", "khoa học", "đã kiểm định", "thống kê", "chỉ số IQ/EQ". CẤM nêu tên hay đối chiếu DISC / MBTI / Big Five / MI / SDQ / Gardner. Đây là MỘT KHUNG ĐỌC lá số do trang dựng — nói vậy là đủ và vẫn đáng đọc.
- CẤM khuyên đi khám, đi trị liệu, đi test tâm lý. Không thuộc phạm vi của bản luận này.

== BÁM DỮ LIỆU ==
- Chỉ dùng số liệu trong phần DỮ KIỆN bên dưới. CẤM bịa thêm sao, cung, cách cục, điểm số.
- CẤM đọc thô tên sao/tên cung như bùa chú ("vì Thất Sát ở Mệnh nên..."). Được nêu tên sao một-hai lần cho có gốc, còn lại nói bằng tiếng người: tình huống nào, làm gì, nói câu gì.
- Chỗ nào ghi "mượn xung chiếu" là cung trống phải mượn — dùng được, nhưng đừng nói chắc như cung có sao thật.
- Phần "cách dạy" theo kiểu người là QUY CHIẾU CỦA TRANG, không phải chữ trong cổ thư. Đừng gán nó cho sách.

== GIỌNG ==
Viết cho cha mẹ Việt đang bận, đọc trong 3 phút. Câu ngắn, cụ thể, nói thẳng. Không rào đón "có thể / nhìn chung". Gọi đứa trẻ là "con" hoặc theo tên; gọi người đọc là "bạn" hoặc "anh chị".

Phần NÊN LÀM / TRÁNH LÀM là phần người ta trả tiền để lấy — mỗi mục phải là việc LÀM ĐƯỢC TỐI NAY, kèm một câu nói thật, không phải lời khuyên chung chung kiểu "hãy lắng nghe con".`;

const TIER = (n: number | null) => (n == null ? 'chưa chấm' : `${n}/10`);

export function buildDayConPrompt(p: DayConProfile, ten: string): string {
  const who = ten ? `"${ten}"` : 'đứa trẻ này';
  const L: string[] = [];

  L.push(
    `ĐỨA TRẺ: ${who} · ${p.gioiTinh === 'nu' ? 'Bé gái' : 'Bé trai'}` +
      (p.tuoi != null ? ` · ${p.tuoi} tuổi (tuổi mụ)` : '') +
      (p.namSinh ? ` · sinh năm ${p.namSinh}` : ''),
  );
  L.push(`ĐIỀU CHA MẸ ĐANG LO: ${p.moiLo.label}`);
  L.push(`THỨ HỌ THẬT SỰ CẦN NGHE: ${p.moiLo.can}`);
  L.push('');

  L.push('— KIỂU NGƯỜI (suy từ chính tinh cung Mệnh và cung Quan Lộc) —');
  L.push(`Kiểu: ${p.kieu.ten} (${p.kieu.tuTuong}) — ${p.kieu.motCau}`);
  if (p.phan.lai && p.kieuPhu) {
    L.push(
      `⚠️ Lá số này nằm SÁT RANH GIỚI giữa hai kiểu: ${p.kieu.ten} và ${p.kieuPhu.ten}. ` +
        `Phải nói ra là đứa trẻ pha hai kiểu, ĐỪNG ép về một nhãn — dán nhãn chắc nịch cho một đứa trẻ là chỗ hại nhất.`,
    );
    L.push(`Kiểu phụ: ${p.kieuPhu.ten} — ${p.kieuPhu.motCau}`);
  }
  L.push(`Động lực gốc: ${p.kieu.dongLuc}`);
  L.push('');

  // ── BẬC 1 — số liệu khung. Đặt TRƯỚC phần cách dạy vì bậc sau phải nối vào
  // bậc trước; để sau thì model viết xong lời khuyên rồi mới nhìn số.
  L.push('— BẬC 1a: 5 TRỤC TÍNH KHÍ (thang 0–10, 5 = mức giữa của phân bố) —');
  for (const t of p.assess.truc) {
    L.push(
      `• ${t.ten} — ${t.diem}/10 · ${t.nhanThap} ←→ ${t.nhanCao} · ` +
        (t.nghieng === null
          ? 'NẰM GIỮA hai cực'
          : `nghiêng về "${t.cuc?.nhan}" (mức ${t.muc})`),
    );
    L.push(`   Câu trục này trả lời: ${t.cauHoi}`);
    if (t.cuc) {
      L.push(`   Biểu hiện ở nhà: ${t.cuc.bieuHien}`);
      L.push(`   Người lớn nên: ${t.cuc.dayThe}`);
      L.push(`   Hay bị đọc nhầm thành: ${t.cuc.docNham}`);
    } else if (t.canND) {
      L.push(`   Biểu hiện ở nhà: ${t.canND.bieuHien}`);
      L.push(`   Người lớn nên: ${t.canND.dayThe}`);
    }
  }
  L.push('');

  L.push('— BẬC 1b: 8 CHẤT NĂNG KHIẾU (đã sắp giảm dần) —');
  for (const k of p.assess.khieu) {
    L.push(
      `• ${k.ten} — ${k.diem}/10${k.noiBat ? '  ★ NỔI' : ''}` +
        (k.saoDay.length ? ` (sao đẩy lên: ${k.saoDay.join(', ')})` : ''),
    );
  }
  if (p.assess.noiBat.length) {
    L.push(
      `Chất nổi: ${p.assess.noiBat.map((k) => k.ten).join(', ')}. ` +
        'Nói là "có dấu hiệu hợp với", KHÔNG nói "có năng khiếu". Với mỗi chất nổi, ' +
        'phần "Dấu hiệu nhận ra ở nhà" dưới đây là thứ cha mẹ tự đối chiếu được — hãy mời họ kiểm.',
    );
    for (const k of p.assess.noiBat) {
      L.push(`   ▸ ${k.ten}: ${k.motCau}`);
      L.push(`     Dấu hiệu ở nhà: ${k.dauHieu.join(' · ')}`);
      L.push(`     Bẫy của chất này: ${k.chuY}`);
    }
  } else {
    L.push(
      '⚠️ KHÔNG chất nào vượt ngưỡng. Đây là ca có thật (khoảng một phần bảy số lá số) và ' +
        'phải NÓI THẲNG: lá số chưa nghiêng rõ về miền nào, nên việc đúng là cho con thử rộng ' +
        'rồi nhìn phản ứng thật, chứ không phải chọn hộ con. CẤM tự lấy ba chất cao nhất gọi là năng khiếu.',
    );
  }
  if (p.assess.canDo) {
    L.push(
      `Chất thấp nhất: ${p.assess.canDo.ten} (${p.assess.canDo.diem}/10). ` +
        'Gọi đây là chỗ con cần được BẮC THÊM CHỖ DỰA, tuyệt đối không gọi là "yếu kém" và không bảo cha mẹ đi luyện bù.',
    );
  }
  L.push('');

  if (p.hoatDong) {
    const h = p.hoatDong;
    L.push('— BẬC 5: HOẠT ĐỘNG (trang đã chọn sẵn danh sách, việc của bạn là GIẢI THÍCH) —');
    L.push(`Nhóm tuổi: ${h.bandLabel}`);
    L.push(`Định dạng lớp HỢP với kiểu ${p.kieu.ten}: ${h.dinhDang.nen}`);
    L.push(`Định dạng làm con BỎ NGANG: ${h.dinhDang.tranh}`);
    L.push(`Cách cho con bắt đầu: ${h.dinhDang.batDau}`);
    const ds = h.chuaRo ? h.dangThu : h.theoChat;
    for (const c of ds) {
      L.push(`• ${c.ten}: ${c.clb.slice(0, 3).join(' / ')}`);
    }
    L.push(
      'Danh sách hoạt động đã hiện SẴN trên trang — ĐỪNG chép lại nó vào phần chữ. ' +
        'Việc của bạn ở mục "hoatDong" là nói VÌ SAO mấy thứ đó hợp với đứa trẻ NÀY ' +
        '(nối vào trục và chất ở trên) và MỞ LỜI thế nào để con chịu thử buổi đầu.',
    );
    L.push('');
  } else {
    L.push('KHÔNG đọc được tuổi của trẻ → BỎ TRỐNG mục "hoatDong" (chuỗi rỗng). Đừng gợi ý lớp khi không biết con mấy tuổi.');
    L.push('');
  }

  L.push('— CÁCH DẠY ỨNG VỚI KIỂU NÀY (quy chiếu của trang, KHÔNG phải cổ thư) —');
  L.push(`Cách con tiếp thu: ${p.hoc.tiepThu}`);
  L.push(`Cách giao bài / giao việc: ${p.hoc.giaoViec}`);
  L.push(`Kiểu động viên có tác dụng: ${p.hoc.dongVien}`);
  L.push(`Kiểu kỷ luật PHẢN TÁC DỤNG: ${p.hoc.kyLuatHong}`);
  L.push(`Chỗ người lớn hay hiểu nhầm: ${p.hoc.hieuNham}`);
  L.push(`Thứ con cần được dạy thêm: ${p.hoc.canHoc}`);
  L.push(`Dấu hiệu quan sát được ở nhà: ${p.hoc.dauHieu.join(' · ')}`);
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
  if (p.than.cung) L.push(`• Cung an Thân: ${p.than.cung}`);
  L.push('');

  L.push('— CÁC CHẶNG CỦA QUÃNG ĐI HỌC —');
  if (p.changHoc.length) {
    for (const c of p.changHoc) {
      L.push(
        `• ${c.tuoiStart}–${c.tuoiEnd} tuổi` +
          (c.namStart ? ` (${c.namStart}–${c.namEnd})` : '') +
          ` — ${c.nhan}` +
          (c.sao.length ? `, sao ${c.sao.join(', ')}` : '') +
          `, điểm ${TIER(c.diem)}` +
          (c.dangChay ? ' ← ĐANG Ở CHẶNG NÀY' : ''),
      );
    }
    L.push(
      'Điểm chặng là điểm THUẬN/NGHỊCH của quãng đó, KHÔNG phải điểm học lực và KHÔNG phải điểm đứa trẻ. ' +
        'Nói theo lối "quãng này cần người lớn kèm sát hơn / quãng này nên buông tay dần", ĐỪNG nói "giai đoạn xấu".',
    );
  } else {
    L.push('Không đọc được chặng nào trong quãng đi học — BỎ QUA phần chặng, ĐỪNG bịa.');
  }
  if (p.vanNam) {
    const v = p.vanNam;
    const bit = [
      v.khung ? `khung đại vận ${v.khung.tuoiStart}–${v.khung.tuoiEnd} tuổi: ${TIER(v.khung.diem)}` : '',
      v.tieuHanCung ? `tiểu hạn nhập cung ${v.tieuHanCung}` : '',
      v.luuNienCung ? `lưu niên đại hạn vào cung ${v.luuNienCung}` : '',
      v.catSat ? `cát ${v.catSat.cat} / sát ${v.catSat.sat} (${v.catSat.canCan})` : '',
    ].filter(Boolean);
    if (bit.length) L.push(`Vận năm ${v.nam}: ${bit.join('; ')}`);
    // Cùng luật với `execTraVanHan`: năm KHÔNG có điểm riêng, đại vận chỉ giới
    // hạn biên độ. Không dặn thì model tự chấm một con số cho năm rồi nói chắc.
    // Tiểu hạn / lưu niên có thể rơi vào Tật Ách, Phu Thê, Tài Bạch… — tức đúng
    // mấy cung `KHONG_DOC` cấm đọc cho một đứa trẻ. Tên cung ở đây chỉ là CHỖ
    // ĐỨNG của năm, không phải lời mời đọc nội dung cung đó. Không dặn thì model
    // thấy "tiểu hạn nhập cung Tật Ách" là bắt đầu nói về sức khoẻ đứa bé.
    L.push(
      '⚠️ Tên cung của tiểu hạn / lưu niên chỉ là CHỖ ĐỨNG của năm trên lá số. TUYỆT ĐỐI ' +
        'không lấy đó làm cớ luận nội dung cung ấy cho đứa trẻ — nhất là Tật Ách (sức khoẻ), ' +
        'Phu Thê (tình duyên), Tài Bạch (tiền bạc), Tử Tức, Điền Trạch. Mấy cung đó nằm ngoài phạm vi bản luận này.',
    );
    L.push(
      'Riêng NĂM thì KHÔNG có điểm — đừng gán "điểm/10" cho năm. Điểm trên là của KHUNG đại vận, ' +
        'nó chỉ nới hay bó BIÊN ĐỘ (khung cao thì cái tốt của năm bung rõ, cái khó nhẹ bớt; khung thấp thì ngược lại). ' +
        'Tốt/xấu của năm đọc ở cung tiểu hạn + lưu niên và cán cân cát/sát.',
    );
  }
  L.push('');

  if (p.voiChaMe) {
    L.push('— HAI BÊN VỚI NHAU —');
    L.push(`Kiểu người của cha/mẹ (từ lá số cha/mẹ): ${p.voiChaMe.kieuChaMe}`);
    L.push(
      `Theo cổ pháp, con cái đọc ở cung Tử Tức của cha mẹ. Cung đó có: ` +
        `${p.voiChaMe.sao.length ? p.voiChaMe.sao.join(', ') : '(không có chính tinh)'}` +
        `${p.voiChaMe.muon ? ' (mượn xung chiếu)' : ''}, nghiêng kiểu ${p.voiChaMe.kieuTen}.`,
    );
    L.push(
      p.voiChaMe.cungTinh
        ? 'Hai bên CÙNG tính âm/dương → cùng một cách phản ứng, nên va nhau ngay trên cùng một chuyện. Đây thường là chỗ cha mẹ thấy "sao nó giống hệt mình hồi bé mà mình vẫn bực".'
        : 'Hai bên KHÁC tính âm/dương → một bên xông một bên giữ. Dễ bù, nhưng dễ hiểu lầm nhau vì nhịp không giống.',
    );
    L.push('Viết mục "voiChaMe" dựa trên đây. Nói về CHỖ HAI BÊN VA VÀ CÁCH GIẢM VA, không phán ai đúng ai sai.');
    L.push('');
  } else {
    L.push('KHÔNG có lá số cha/mẹ → BỎ TRỐNG mục "voiChaMe" (trả chuỗi rỗng). ĐỪNG viết chung chung cho có.');
    L.push('');
  }

  L.push('— VIỆC CỦA BẠN —');
  L.push(`Viết bản hướng dẫn nuôi dạy ${who}, bám sát điều cha mẹ đang lo ở trên, trả về ĐÚNG một object JSON:`);
  L.push(`{
  "conNguoi":  "BẬC 2. 4–5 câu tả đứa trẻ này vận hành thế nào, GHÉP TỪ ÍT NHẤT HAI TRỤC có nêu tên trục và điểm (ví dụ: 'Nhịp phản ứng 7,4 — con vào việc rất nhanh'). Ngôi thứ ba. Cụ thể tới mức cha mẹ đọc là gật đầu nhận ra con mình.",
  "chatNoi":   "BẬC 2. 2–3 câu về chất nổi: chất đó biểu hiện ra sao Ở NHÀ, và mời cha mẹ tự đối chiếu với dấu hiệu đã liệt kê. Nếu dữ kiện ghi không có chất nào vượt ngưỡng thì nói thẳng điều đó thay vì bịa.",
  "dinhHuong": "BẬC 3. 3–4 câu: KIỂU MÔI TRƯỜNG HỌC hợp với con (lớp đông hay nhóm nhỏ, có thi đua hay không, cần khuôn hay cần thả) và MỘT điều cần canh chừng. CẤM chốt ngành, chốt nghề, chốt trường chuyên lớp chọn.",
  "vaoBangGi": "BẬC 4. 2–3 câu: cách nói / cách ra bài nào thì lọt vào đứa này, và vì sao — bám đúng động lực gốc và trục ở trên.",
  "khoaLai":   "BẬC 4. 2–3 câu: cách người lớn làm khiến nó đóng cửa lại. Mô tả để tránh, KHÔNG phải chỉ dẫn để phạt.",
  "nenLam":    [{"viec":"việc làm được ngay tối nay, 1 câu","vidu":"một câu nói thật với con, đặt trong ngoặc kép"}],
  "tranhLam":  [{"viec":"việc nên thôi làm, 1 câu","vidu":"một câu KHÔNG nên nói, đặt trong ngoặc kép"}],
  "hoatDong":  "BẬC 5. 2–3 câu: vì sao mấy hoạt động trang đã liệt kê hợp với đứa trẻ NÀY (nối vào trục và chất), và mở lời thế nào để con chịu đi thử buổi đầu. ĐỪNG chép lại danh sách. Không biết tuổi thì trả chuỗi rỗng.",
  "loLang":    "3–4 câu trả lời THẲNG vào điều cha mẹ đang lo đã ghi ở trên. Đây là mục họ đọc trước tiên.",
  "changNay":  "2–3 câu về chặng con đang ở và chặng kế: người lớn nên siết hay nên buông. Bám dữ kiện chặng, KHÔNG bịa số.",
  "voiChaMe":  "3–4 câu về chỗ hai bên dễ va và cách giảm va — CHỈ viết khi có lá số cha/mẹ, không có thì trả chuỗi rỗng.",
  "motCau":    "MỘT câu chốt đáng nhớ, cha mẹ đọc xong nhớ được khi đang bực."
}`);
  L.push('`nenLam` và `tranhLam` mỗi mảng ĐÚNG 3 mục.');
  L.push('Không thêm khoá nào khác. Không viết chữ nào ngoài JSON.');

  return L.join('\n');
}

export const DAY_CON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    conNguoi: { type: 'STRING' },
    chatNoi: { type: 'STRING' },
    dinhHuong: { type: 'STRING' },
    vaoBangGi: { type: 'STRING' },
    khoaLai: { type: 'STRING' },
    nenLam: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { viec: { type: 'STRING' }, vidu: { type: 'STRING' } },
        required: ['viec', 'vidu'],
      },
    },
    tranhLam: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { viec: { type: 'STRING' }, vidu: { type: 'STRING' } },
        required: ['viec', 'vidu'],
      },
    },
    hoatDong: { type: 'STRING' },
    loLang: { type: 'STRING' },
    changNay: { type: 'STRING' },
    voiChaMe: { type: 'STRING' },
    motCau: { type: 'STRING' },
  },
  required: ['conNguoi', 'chatNoi', 'dinhHuong', 'vaoBangGi', 'khoaLai', 'nenLam', 'tranhLam', 'loLang', 'motCau'],
  propertyOrdering: [
    'conNguoi',
    'chatNoi',
    'dinhHuong',
    'vaoBangGi',
    'khoaLai',
    'nenLam',
    'tranhLam',
    'hoatDong',
    'loLang',
    'changNay',
    'voiChaMe',
    'motCau',
  ],
};

/**
 * Khối đóng vai nối vào system của rail khi cha mẹ hỏi tiếp.
 *
 * Cùng lối `nguoiKhacRailWrapper`: CHỈ THÊM, không sửa/bớt phần lá số vốn có.
 */
export function dayConRailWrapper(p: DayConProfile, tenRaw: string): string {
  // Tên do người dùng gõ → bóc ký tự bẻ prompt rồi mới đưa vào system.
  const ten = String(tenRaw || '')
    .replace(/[\r\n`{}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  const who = ten ? `"${ten}"` : 'đứa trẻ này';

  // ── DỮ KIỆN ĐO ĐƯỢC — 5 trục + 8 chất ────────────────────────
  // Đây chính là hai biểu đồ trang vẽ. Trước đây rail KHÔNG nhận một con số
  // nào của chúng, trong khi luật ngay dưới lại nói "ĐIỂM TRÊN THANG 0–10
  // trong dữ kiện" — tức prompt neo vào một khối chưa bao giờ được gửi (đúng
  // lỗi `=== ĐIỂM ĐÁNH GIÁ ===` đã phải vá ở luận giải 24 phần). Cha mẹ nhìn
  // thấy "Hướng năng lượng 5,5" rồi hỏi rail nghĩa là gì → rail luận chay.
  // Chi tiết KIỂU — bản trả tiền dựng đoạn văn từ `kieu.dongLuc`
  // (`buildDayConPrompt`), người đọc thấy rồi hỏi lại thì rail phải có. Bảng
  // KIỂU là quy chiếu tự đặt của trang, model KHÔNG suy lại được từ lá số.
  const k = p.kieu as unknown as Record<string, string | undefined>;
  const krow = (nhan: string, v?: string) => (v ? `  ${nhan}: ${v}\n` : '');
  const kieuChiTiet =
    krow('Động lực gốc', k.dongLuc) +
    krow('Nhận ra ngay ở nhà', k.datChat) +
    krow('Hợp môi trường', k.moiTruongHop) +
    krow('Kỵ môi trường', k.moiTruongKy) +
    krow('Mạnh', k.manh) +
    krow('Chỗ hay vấp', k.yeu);

  const a = p.assess;
  let doDuoc = kieuChiTiet
    ? `--- CHI TIẾT KIỂU NGƯỜI (dùng đúng mấy dòng này, đừng tự nghĩ thêm) ---\n${kieuChiTiet}`
    : '';
  if (a) {
    doDuoc += '\n--- ĐO ĐƯỢC (engine chấm — CHÉP đúng, KHÔNG tự chấm lại) ---\n';
    if (Array.isArray(a.truc) && a.truc.length) {
      doDuoc += 'NĂM TRỤC TÍNH KHÍ (5 = mức giữa của phân bố, hai cực đều có giá trị):\n';
      a.truc.forEach((t) => {
        const cuc = t.nghieng === 'cao' ? t.nhanCao : t.nghieng === 'thap' ? t.nhanThap : 'nằm giữa — dùng được cả hai kiểu';
        doDuoc += `  ${t.ten}: ${t.diem}/10 → ${cuc}\n`;
      });
    }
    if (Array.isArray(a.khieu) && a.khieu.length) {
      doDuoc += 'TÁM CHẤT NĂNG KHIẾU (đã sắp giảm dần; ★ = vượt ngưỡng, đáng cho THỬ):\n';
      a.khieu.forEach((k) => {
        doDuoc += `  ${k.noiBat ? '★' : ' '} ${k.ten}: ${k.diem}/10\n`;
      });
      doDuoc += a.coNoiBat
        ? `  → Chất nổi: ${a.noiBat.map((k) => k.ten).join(', ')}.\n`
        : '  → KHÔNG chất nào vượt ngưỡng. Nói THẲNG điều đó (ở tuổi này chưa rõ nét là bình thường, nên cho thử rộng), TUYỆT ĐỐI không bịa ra một chất nổi.\n';
    }
    doDuoc += '--- HẾT PHẦN ĐO ĐƯỢC ---\n';
  }

  // ── Bảng CÁCH DẠY (`p.hoc`) ──────────────────────────────────
  // 6 thẻ này nằm ở tầng MIỄN PHÍ, tức cha mẹ nào mở trang cũng đọc được, rồi
  // hỏi lại đúng chúng ("vì sao cắt lời con lại phản tác dụng?"). Bảng tự đặt
  // của trang ⇒ model không có đường suy lại từ lá số.
  const h = p.hoc;
  if (h) {
    doDuoc += '\n--- CÁCH DẠY ĐỨA NÀY (bảng của trang — dùng đúng, đừng tự nghĩ thêm) ---\n';
    doDuoc += krow('Tiếp thu cái mới', h.tiepThu);
    doDuoc += krow('Giao việc kiểu nào thì chịu làm', h.giaoViec);
    doDuoc += krow('Động viên kiểu nào có tác dụng', h.dongVien);
    doDuoc += krow('Kỷ luật PHẢN TÁC DỤNG', h.kyLuatHong);
    doDuoc += krow('Chỗ người lớn hay đọc nhầm', h.hieuNham);
    doDuoc += krow('Thứ con cần học thêm (nói như BÀI HỌC, không phải lời chê)', h.canHoc);
    if (Array.isArray(h.dauHieu) && h.dauHieu.length)
      doDuoc += `  Dấu hiệu quan sát được ở nhà: ${h.dauHieu.join(' · ')}\n`;
  }

  doDuoc += matDocBlock(p.matDoc, 'CÁC MẶT TOOL NÀY ĐỌC (đúng mấy cung này, đúng vai này)');

  // Chặng đi học: đại vận thì lá số đã có, nhưng NHÃN ("quãng tiểu học —
  // hình thành nếp") là cách tool này gióng đại vận vào việc HỌC. Đó mới là
  // thứ cha mẹ đọc trên trang.
  if (Array.isArray(p.changHoc) && p.changHoc.length) {
    doDuoc += '--- CHẶNG ĐI HỌC (gióng đại vận vào việc học) ---\n';
    p.changHoc.forEach((c) => {
      doDuoc +=
        `  ${c.tuoiStart}–${c.tuoiEnd} tuổi (${c.namStart}–${c.namEnd}) · cung ${c.cung}` +
        `${c.diem != null ? ` · ${c.diem}/10` : ''} — ${c.nhan}${c.dangChay ? '  ← ĐANG Ở ĐÂY' : ''}\n`;
    });
  }

  // Mặt "với cha mẹ": bắc qua lá số THỨ HAI (của cha/mẹ) — rail chỉ nạp được
  // lá số đứa trẻ nên không có đường nào suy lại. Trang hiện hẳn khối này.
  const vc = p.voiChaMe;
  if (vc) {
    doDuoc += '--- ĐỐI CHIẾU VỚI LÁ SỐ CHA/MẸ (họ có đưa lá số của mình) ---\n';
    doDuoc +=
      `  Cung ${vc.cung} trong lá số CHA/MẸ — cổ pháp đọc con cái ở đây` +
      `${vc.muon ? ' (vô chính diệu — mượn xung chiếu)' : ''}` +
      `${vc.sao && vc.sao.length ? `: ${vc.sao.join(', ')}` : ''}\n`;
    if (vc.kieuTen) doDuoc += `  Cung đó mô tả một đứa trẻ kiểu: ${vc.kieuTen}\n`;
    if (vc.kieuChaMe) doDuoc += `  Kiểu của chính cha/mẹ: ${vc.kieuChaMe}\n`;
    doDuoc += vc.cungTinh
      ? '  Hai kiểu CÙNG tính âm/dương → phản ứng giống nhau nên dễ va nhau.\n'
      : '  Hai kiểu KHÁC tính âm/dương → dễ bù cho nhau hơn là va nhau.\n';
  }

  // Hoạt động đề xuất — tầng TRẢ TIỀN, cha mẹ đọc kỹ nhất. Cắt còn phần dùng
  // được (một gợi ý CLB + một việc làm ở nhà mỗi chất): gửi trọn bảng là
  // ~1.600 ký tự context cho thứ họ đang mở sẵn trên màn hình.
  const hd = p.hoatDong;
  if (hd) {
    doDuoc += `--- HOẠT ĐỘNG ĐỀ XUẤT (${hd.bandLabel}) ---\n`;
    (hd.theoChat || []).forEach((c) => {
      doDuoc += `  ${c.ten} (${c.diem}/10)`;
      if (c.clb && c.clb[0]) doDuoc += ` · lớp/CLB: ${c.clb[0]}`;
      if (c.nha && c.nha[0]) doDuoc += ` · ở nhà: ${c.nha[0]}`;
      doDuoc += '\n';
    });
    if (hd.dinhDang) {
      if (hd.dinhDang.nen) doDuoc += `  Định dạng NÊN: ${hd.dinhDang.nen}\n`;
      if (hd.dinhDang.tranh) doDuoc += `  Định dạng TRÁNH: ${hd.dinhDang.tranh}\n`;
    }
  }

  return `

=== ĐANG XEM LÁ SỐ CỦA MỘT ĐỨA TRẺ — ĐỌC KỸ, KHỐI NÀY ĐÈ LÊN MỌI LUẬT Ở TRÊN ===
Lá số ở trên KHÔNG phải của người đang chat. Đó là lá số CON của họ: ${who}.

- ⚠️ ĐÈ LÊN LUẬT XƯNG HÔ: dòng "Người xem" (nếu có ở trên) mô tả ĐỨA TRẺ, KHÔNG phải người đang chat. TUYỆT ĐỐI không suy giới tính của người đang chat từ lá số này. Gọi người đang chat là "quý vị".
- Đứa trẻ gọi là "${ten || 'con'}" hoặc "con".
- Mọi câu trả lời phải quy về CÂU HỎI THẬT: dạy đứa này kiểu nào thì vào. Không luận đời nó như luận cho một người trưởng thành.
- CẤM đoán ĐỖ/TRƯỢT, đoán điểm thi, CẤM chốt NGHỀ hay NGÀNH cho đứa trẻ. Được nói chất việc hợp và cách hỏi để con tự nói ra.
- CẤM luận SỨC KHOẺ, BỆNH TẬT, HÔN NHÂN, TÌNH DUYÊN, TIỀN BẠC của đứa trẻ. Nó là trẻ con và không có mặt để đồng ý.
- CẤM phán giá trị ("khó dạy", "lười", "hư", "kém"), CẤM so sánh với anh chị em hay con nhà người khác.
- Kiểu người theo khung này: ${p.kieu.ten} — ${p.kieu.motCau}${p.phan.lai && p.kieuPhu ? ` (SÁT RANH GIỚI với kiểu ${p.kieuPhu.ten}, phải nói rõ là pha, đừng ép nhãn)` : ''}.
- Điều cha mẹ đang lo: ${p.moiLo.label}. Ưu tiên trả lời quanh đúng chuyện đó.
- ĐIỂM TRÊN THANG 0–10 trong dữ kiện là VỊ TRÍ so với phân bố lá số trẻ em, mốc giữa là 5 — KHÔNG phải "được mấy phần mười". Cấm cộng điểm, cấm tính điểm tổng, cấm xếp hạng đứa trẻ. Hai cực của mọi trục đều có giá trị.
- Trục "Độ nhạy cảm xúc" đo NGƯỠNG CẢM NHẬN, không phải chỉ báo tâm lý: cấm nhắc lo âu, trầm cảm, rối loạn, tăng động, tự kỷ, cấm khuyên đi khám hay đi test.
- "Chất nổi" = đáng cho THỬ, không phải tài năng đã xác nhận. Không có chất nào nổi thì nói thẳng, đừng bịa.
- CẤM gọi đây là trắc nghiệm/khoa học/đã kiểm định, CẤM nêu tên hay đối chiếu DISC/MBTI/Big Five/MI/SDQ/IQ.
${doDuoc}=== HẾT KHỐI DẠY CON ===`;
}
