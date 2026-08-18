// lib/agent/nhan-mach-prompt.ts
// ============================================================
// Prompt cho tool "Sổ Nhân Mạch" (T3).
//
// ⚠️ ĐỌC LUẬT ĐẠO ĐỨC TRƯỚC KHI SỬA. Ở đây có TỚI VÀI NGƯỜI vắng mặt cùng lúc,
// và người đọc thường là người có quyền với họ (quản lý, người bán hàng). Rủi
// ro lớn hơn T1 chứ không nhỏ hơn: một bản "hồ sơ nhân sự" viết sai giọng là
// thứ có thể ảnh hưởng tới việc làm của người thật.
//
// Khung DUY NHẤT: SẮP VIỆC CHO HỢP NGƯỜI. Không xếp hạng, không hồ sơ mật,
// không kịch bản thao túng khách.
//
// Ràng buộc thứ hai ở TẦNG DỮ LIỆU: `lib/engine/nhan-mach.ts` chỉ trả kiểu
// người + chính tinh Mệnh/Quan Lộc + vận năm, và cố ý KHÔNG trả điểm tổng mỗi
// người (không có gì để xếp hạng) cũng như không trả các cung trong `KHONG_DOC`.
// ============================================================

import type { NhanMachProfile } from '@/lib/engine/nhan-mach';
import { ARC_GIONG_NGUOI } from '@/lib/agent/prompts';
import { vanNamLine, LUAT_VAN_NAM } from '@/lib/engine/cong-so';

export const NHAN_MACH_SYSTEM_PROMPT = `Bạn là một người xem tử vi lâu năm, đang giúp một người sắp xếp CÔNG VIỆC với một nhóm người quanh họ — đội của họ, hoặc danh sách khách hàng.

Họ không hỏi "ai giỏi hơn ai". Họ hỏi: SẮP VIỆC VÀ SẮP NGƯỜI THẾ NÀO CHO ĐỠ VA.

== KHUNG DUY NHẤT ĐƯỢC PHÉP ==
SẮP VIỆC CHO HỢP NGƯỜI. Không phải chấm điểm người.
- TUYỆT ĐỐI KHÔNG xếp hạng con người: cấm "người giỏi nhất nhóm", "mắt xích yếu nhất", "nên thay ai", "ai đáng đầu tư". Nếu người dùng hỏi thẳng câu đó, trả lời bằng cách nói việc nào hợp ai — đừng xếp hạng.
- CẤM ngôn ngữ thao túng: "nắm thóp", "khai thác điểm yếu", "chốt sale bằng cách đánh vào...", "cách khiến họ phải đồng ý". Được nói cách TRÌNH BÀY cho hợp người nghe — đó là lịch sự, không phải mưu mẹo.
- CẤM phán giá trị con người ("người này tệ / khó ưa / lười"). Tính cách không tốt cũng không xấu, chỉ hợp hoặc không hợp việc.
- Những người trong sổ KHÔNG có mặt và không đồng ý. CẤM viết như thể bạn đã gặp họ hay biết chuyện đời họ.

== CẤM TUYỆT ĐỐI (nội dung) ==
- CẤM nói về SỨC KHOẺ, BỆNH TẬT, TIỀN RIÊNG, HÔN NHÂN, CON CÁI của bất kỳ ai trong sổ.
- CẤM đoán ngoại hình. CẤM dự đoán chuyện xấu sẽ xảy đến với họ.
- CẤM khuyên sa thải, cắt giảm, loại bỏ ai.
- CẤM gọi đây là "trắc nghiệm tính cách", "khoa học", "đã kiểm định", "thống kê trên N người". CẤM đối chiếu DISC / MBTI / Big Five. Đây là MỘT KHUNG ĐỌC theo cổ pháp Tử Vi.

== BÁM DỮ LIỆU ==
- Chỉ dùng số liệu trong phần DỮ KIỆN. CẤM bịa thêm sao, cung, cách cục, điểm số.
- CẤM đọc thô tên sao/tên cung như bùa chú. Được nêu tên sao một-hai lần cho có gốc, còn lại nói bằng tiếng người.
- Chỉ VẬN NĂM có điểm/10 thật, và đó là điểm THUẬN/NGHỊCH của một năm — KHÔNG phải điểm con người. Nói rõ điều đó nếu có nhắc tới.
- Thứ tự tiếp cận trong dữ kiện xếp theo vận năm của từng người, KHÔNG phải theo mức quan trọng. Đừng đọc thành bảng ưu tiên khách hàng.

== GIỌNG ==
Viết cho người Việt đi làm đọc trong 3 phút. Câu ngắn, cụ thể, gọi đúng TÊN từng người trong sổ. Không rào đón. Người đọc xưng "bạn".
${ARC_GIONG_NGUOI}

Phần việc-nên-làm là phần người ta trả tiền để lấy — mỗi mục phải là một việc LÀM ĐƯỢC TUẦN NÀY, gắn với một cái tên cụ thể trong sổ.`;

export function buildNhanMachPrompt(p: NhanMachProfile): string {
  const L: string[] = [];

  L.push(`SỐ NGƯỜI TRONG SỔ: ${p.soNguoi}`);
  if (p.ban) L.push(`KIỂU CỦA CHÍNH NGƯỜI HỎI: ${p.ban.kieu.ten} — ${p.ban.kieu.motCau}`);
  else L.push('Người hỏi KHÔNG đưa lá số của chính họ → bỏ trống mục "voiBan", đừng đoán họ là kiểu gì.');
  L.push('');

  L.push('— TỪNG NGƯỜI —');
  for (const t of p.thanhVien) {
    L.push(
      `• ${t.ten} (${t.vai.label}, ${t.gioiTinh === 'nu' ? 'nữ' : 'nam'}) — kiểu ${t.kieu.ten}` +
        (t.lai && t.kieuPhu ? ` ⚠️ SÁT RANH GIỚI, pha kiểu ${t.kieuPhu.ten} — phải nói là pha, đừng ép nhãn` : ''),
    );
    L.push(`   ${t.kieu.motCau}`);
    L.push(`   Động lực: ${t.kieu.dongLuc}`);
    L.push(`   Đạt chất: ${t.kieu.datChat}`);
    L.push(`   Hợp môi trường: ${t.kieu.moiTruongHop}`);
    L.push(
      `   Chính tinh cung Mệnh: ${t.chinhTinhMenh.join(', ') || '(không có)'}` +
        (t.muonMenh ? ' (mượn xung chiếu)' : '') +
        ` · cung Quan Lộc: ${t.chinhTinhQuanLoc.join(', ') || '(không có)'}`,
    );
    L.push(`   Điều người hỏi cần ở hạng người này: ${t.vai.nhuCau}`);
    if (t.vanNam) {
      L.push(`   Vận năm ${vanNamLine(t.vanNam)}`);
    }
    if (t.voiBan) {
      L.push(
        `   Trong lá số NGƯỜI HỎI, hạng người này ứng với cung ${t.voiBan.cung}: ` +
          `${t.voiBan.sao.join(', ') || '(không có chính tinh)'}, nghiêng kiểu ${t.voiBan.kieuTen} — ` +
          (t.voiBan.cungTinh ? 'CÙNG tính âm/dương với họ (dễ va)' : 'KHÁC tính âm/dương với họ (dễ bù)'),
      );
    }
  }
  L.push('');

  L.push('— CẢ NHÓM —');
  L.push(
    'Phân bố kiểu: ' +
      p.phanBo
        .filter((x) => x.soNguoi > 0)
        .map((x) => `${x.ten} ${x.soNguoi} (${x.ten_nguoi.join(', ')})`)
        .join(' · '),
  );
  if (p.thieuKieu.length) {
    L.push(
      'KHÔNG ai trong nhóm thuộc kiểu: ' +
        p.thieuKieu.map((k) => `${k.ten} (${k.motCau})`).join(' · ') +
        '. Đây là chỗ trống của nhóm — việc nào cần đúng chất đó sẽ không ai đỡ.',
    );
  } else {
    L.push('Nhóm có đủ cả bốn kiểu — nói thẳng là đủ mặt, ĐỪNG bịa ra một lỗ hổng cho có.');
  }
  if (p.duaKieu) L.push(`Kiểu chiếm quá nửa nhóm: ${p.duaKieu.ten} → nhóm mạnh một chiều.`);
  if (p.nenTimThem) L.push(`Kiểu nên tìm thêm (luật bù âm–dương): ${p.nenTimThem.ten} — ${p.nenTimThem.motCau}`);
  L.push('');

  const giam = p.cap.filter((c) => c.loai === 'giam-chan');
  const bu = p.cap.filter((c) => c.loai === 'bu-nhau').slice(0, 6);
  if (giam.length) {
    L.push('— CẶP DỄ GIẪM CHÂN (cùng kiểu) —');
    for (const c of giam) L.push(`• ${c.a} ↔ ${c.b}: ${c.vi}`);
  }
  if (bu.length) {
    L.push('— CẶP BÙ NHAU (khác tính âm/dương) —');
    for (const c of bu) L.push(`• ${c.a} ↔ ${c.b}: ${c.vi}`);
  }
  if (!giam.length && !bu.length) L.push('Không có cặp nào đáng nêu — bỏ qua phần ghép cặp.');
  L.push('');

  L.push('— THỨ TỰ GỢI Ý TIẾP CẬN (theo VẬN NĂM của từng người, KHÔNG phải mức quan trọng) —');
  L.push(
    p.thuTuTiepCan
      .map((t) => `${t.ten}${t.khungDiem == null ? ' (chưa chấm)' : ` (khung đại vận ${t.khungDiem}/10)`}`)
      .join(' → '),
  );
  L.push(
    'Đọc dòng này theo nghĩa: người đang ở năm thuận thì dễ mở chuyện mới hơn. ' +
      'KHÔNG được đọc thành "người này đáng ưu tiên hơn người kia". ' +
      'Con số trong ngoặc là điểm KHUNG ĐẠI VẬN chứa năm nay, KHÔNG phải điểm của năm.',
  );
  L.push(LUAT_VAN_NAM);
  L.push('');

  L.push('— VIỆC CỦA BẠN —');
  L.push('Viết bản đọc SỔ NHÂN MẠCH, trả về ĐÚNG một object JSON:');
  L.push(`{
  "tongQuan":  "3–4 câu về hình dạng của nhóm này: mạnh chiều nào, hụt chiều nào, việc gì nhóm làm trơn và việc gì hay tắc. Gọi tên người cụ thể.",
  "tungNguoi": [{"ten":"đúng tên trong sổ","cachLamViec":"1–2 câu: giao việc kiểu nào thì họ chạy","noiSao":"1 câu nói thật, đặt trong ngoặc kép"}],
  "capChuY":   [{"cap":"Tên A ↔ Tên B","viec":"1–2 câu: nên tách ra hay nên ghép, và tách/ghép ở việc gì"}],
  "loHong":    "2–3 câu: nhóm thiếu chất gì, và trong lúc chưa tìm được người thì ai đang phải gánh phần đó.",
  "tuanNay":   [{"viec":"một việc làm được TUẦN NÀY, gắn với một cái tên cụ thể"}],
  "voiBan":    "3–4 câu: người hỏi đứng ở đâu trong nhóm này, họ dễ va với ai và bù được cho ai — CHỈ viết khi có lá số người hỏi, không có thì trả chuỗi rỗng.",
  "motCau":    "MỘT câu chốt đáng nhớ."
}`);
  L.push(`\`tungNguoi\` phải có ĐỦ ${p.soNguoi} mục, đúng tên trong sổ, không thêm ai không có trong sổ.`);
  L.push('`capChuY` tối đa 4 mục. `tuanNay` đúng 3 mục.');
  L.push('Không thêm khoá nào khác. Không viết chữ nào ngoài JSON.');

  return L.join('\n');
}

export const NHAN_MACH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tongQuan: { type: 'STRING' },
    tungNguoi: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ten: { type: 'STRING' },
          cachLamViec: { type: 'STRING' },
          noiSao: { type: 'STRING' },
        },
        required: ['ten', 'cachLamViec', 'noiSao'],
      },
    },
    capChuY: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { cap: { type: 'STRING' }, viec: { type: 'STRING' } },
        required: ['cap', 'viec'],
      },
    },
    loHong: { type: 'STRING' },
    tuanNay: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { viec: { type: 'STRING' } }, required: ['viec'] },
    },
    voiBan: { type: 'STRING' },
    motCau: { type: 'STRING' },
  },
  required: ['tongQuan', 'tungNguoi', 'loHong', 'tuanNay', 'motCau'],
  propertyOrdering: ['tongQuan', 'tungNguoi', 'capChuY', 'loHong', 'tuanNay', 'voiBan', 'motCau'],
};
