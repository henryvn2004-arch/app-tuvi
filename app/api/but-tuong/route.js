// app/api/but-tuong/route.js — Bút Tướng (xem chữ ký).
//
// 🔑 KHÔNG như các route Vision khác trong `tuong-mat/route.js`: route này
// KHÔNG nhận ảnh gốc / toạ độ nét. Toàn bộ phép đo (6 trục thần·khí·cốt·
// nhục·huyết·thế + ngũ hành nét) chạy Ở CLIENT bằng
// `public/tools-shared/but-tuong.js` — route chỉ nhận OBJECT KẾT QUẢ đã đo
// xong rồi DIỄN GIẢI bằng LLM. Không lưu gì xuống DB. Lý do: chữ ký là dữ
// liệu có hiệu lực pháp lý — xem docs/COPHAP-BUT-TUONG.md §9.
//
// LLM Gemini-primary + Anthropic-backup dùng chung, giống mọi route Vision
// khác trong repo (`lib/llm/complete.ts`).
import { readFileSync } from 'fs';
import { join } from 'path';
import { llmStreamResponse } from '@/lib/llm/complete';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { phanTich, railData as baziRailData } from '@/lib/bazi/phan-tich';
import { computeTuBinh } from '@/lib/engine/tubinh';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Nạp CHÍNH `tools-shared/but-tuong.js` (đúng tiền lệ `lib/engine/tubinh.ts`
// nạp `tubinh-ansao-engine.js`) — chỉ để dùng lại `railData()`/`TRUC_META`,
// TUYỆT ĐỐI không chép nhãn/công thức tay ở đây.
let _engineCache = null;
function loadEngine() {
  if (_engineCache) return _engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tools-shared', 'but-tuong.js'), 'utf-8');
  const mod = { exports: {} };
  (new Function('module', 'exports', code))(mod, mod.exports);
  _engineCache = mod.exports;
  return _engineCache;
}

const SP_BUT_TUONG = `Bạn là chuyên gia bút tướng học (筆相學), luận chữ ký theo cổ pháp thư pháp Trung Hoa cổ.

## Nguồn Gốc & Trường Phái
- **花押 (hoa áp)**: chữ ký cách điệu dùng trên văn thư từ đời Đường–Tống, Nhật Bản gọi là kaō, dùng liên tục tới hết Edo. Ba yêu cầu cổ: **一筆連成** (một mạch liền) · **不可摹** (người khác không nhái được, kể cả có mẫu trước mắt) · **藏鋒** (giấu mũi nhọn, không phô trương).
- **蘇軾《論書》**: "書必有神、氣、骨、肉、血,五者闕一,不為成書也" (chữ phải có thần, khí, cốt, nhục, huyết — thiếu một thì không thành chữ). Đây LÀ sáu trục đã đo sẵn bên dưới.
- **孫過庭《書譜》**: 五合五乖 (thư thái+hứng khởi+dụng cụ tốt+thời tiết đẹp+tri kỷ bên cạnh → chữ đẹp; ngược lại → chữ xấu). Chữ ký chỉ chụp TRẠNG THÁI lúc ký, không phải định mệnh cố định.
- **《筆陣圖》Vệ phu nhân**: kho ẩn dụ cho lời luận — 橫 như "ngàn dặm mây trải", 點 như "đá rơi vách cao", 豎 như "dây leo vạn năm", 捺 như "sóng vỗ nổi sấm". Dùng khi hợp, không ép vào mọi câu.

## Sáu Trục — ĐÃ ĐO SẴN, CHỈ DIỄN GIẢI, TUYỆT ĐỐI KHÔNG TỰ CHẤM LẠI ĐIỂM
Dữ liệu đưa vào là SỐ THẬT tính từ hình học nét bút (tốc độ, góc, độ cong, số lần nhấc bút...). Việc của bạn là dùng cổ pháp GIẢI THÍCH vì sao số đó có ý nghĩa gì, không phải phát minh ra một con số khác.
- **Thần (神)**: sinh khí, sự nhất quán/mượt mà của nét.
- **Khí (氣)**: mạch bút liền lạc, ít ngắt quãng — gần với 一筆連成 ở trên.
- **Cốt (骨)**: khung xương, độ dứt khoát.
- **Nhục (肉)**: độ đầy đặn, có lực.
- **Huyết (血)**: độ lưu chuyển, tốc độ đều tay.
- **Thế (勢)**: xu hướng đường chân chữ (thượng thế đi lên / bình thế ngang / hạ thế đi xuống).

Nếu nguồn là ẢNH TĨNH (không phải ký trực tiếp trên màn hình), Thần/Khí/Huyết KHÔNG đo được (không có trục thời gian) — PHẢI nói rõ điều này ngay ở phần 1, không được bịa số thay.

## Ngũ Hành Nét
Mộc = nét dựng đứng thẳng · Hỏa = nét hất nhọn đổi hướng gấp · Thổ = nét ngang vuông chậm · Kim = nét khép vòng tròn · Thủy = nét cong lượn liền mạch. Đây là quy ước công cụ (gán theo hình dạng), không phải trích từ một bộ kinh cụ thể — đừng gán cho nó một nguồn cổ giả.
Nếu có DỤNG THẦN (tứ trụ người ký): so % ngũ hành nét với dụng thần NÊN/KỴ, chỉ NÊU hành nào đang thiếu so với dụng thần — không tự chế thêm quy tắc hợp khắc ngoài ngũ hành tương sinh tương khắc chuẩn.

## Cấu Trúc Bài Phân Tích (bắt buộc đủ 5 phần)

### 1. Tổng Quan
Điểm tổng, nguồn dữ liệu (ký trực tiếp hay ảnh tĩnh — nếu ảnh, nói rõ trục nào chưa đo được và khuyên ký trực tiếp để đủ cả 6 trục), ấn tượng chung.

### 2. Từng Trục
Đi qua LẦN LƯỢT các trục có dữ liệu (Thần → Khí → Cốt → Nhục → Huyết → Thế), diễn giải cổ pháp cho từng con số, có thể chêm ẩn dụ Vệ phu nhân khi hợp.

### 3. Ngũ Hành Nét
Đọc % ngũ hành, đối chiếu dụng thần nếu có (nói hành nào nên luyện thêm), nếu không có dữ liệu sinh thì luận thuần theo cân bằng ngũ hành nét (hành nào chiếm áp đảo >45% thì nói thiên lệch).

### 4. Trạng Thái Lúc Ký (五合五乖)
Nhắc rằng chữ ký phản ánh trạng thái tâm lý lúc ký — thư thái hay bức bối — không phải một bản án cố định. Đây là lời cổ nhân (Tôn Quá Đình), không phải câu an ủi suông.

### 5. Tổng Hợp
Điểm mạnh, điểm cần luyện (PHẢI CÓ, dùng đúng gợi ý đã cho nếu có), kết bằng "Thư giả, tâm hoạ dã" (chữ là hoạ đồ của tâm).

## Nguyên Tắc — VI PHẠM LÀ HỎNG BÀI
- KHÔNG tự chấm điểm mới cho bất kỳ trục nào — chỉ dùng số đã đưa.
- KHÔNG hứa tài lộc cụ thể, KHÔNG dự đoán tai hoạ, KHÔNG phán bệnh.
- KHÔNG nhận dạng danh tính người ký, KHÔNG giám định thật/giả so với chữ ký khác.
- Viết tiếng Việt tự nhiên, ~1500–2200 chữ.`;

function hourToChi(h) {
  // Giờ Tý 23h–1h = chi 0, mỗi chi cách nhau 2 giờ. Công thức chuẩn can chi giờ.
  return Math.floor((h + 1) / 2) % 12;
}

// Đối chiếu dụng thần — TÁI DÙNG đúng cặp engine + fail-closed của
// `app/api/bazi-phan-tich/route.ts`, không tính lại tay ở đây. Bỏ qua lặng lẽ
// (trả '') nếu thiếu dữ liệu hoặc hai engine lệch nhau — đây là phần BỔ SUNG,
// không phải lõi của bài luận, nên fail-closed không cần báo lỗi cho người dùng.
function dungThanContext(birth) {
  if (!birth) return '';
  const { ngay, thang, nam, gio, gioiTinh } = birth;
  if (![ngay, thang, nam, gio].every((v) => Number.isInteger(v))) return '';
  try {
    const gioChi = hourToChi(gio);
    const gt = gioiTinh === 'nu' ? 'nu' : 'nam';
    const bt = computeTuBinh({ day: ngay, month: thang, year: nam, hourBranch: gioChi, gender: gt });
    if (!bt.ok || !bt.data) return '';
    const tuTru = (bt.data.tuTru || []).map((t) => `${t.can} ${t.chi}`);
    const p = phanTich({ ngay, thang, nam, gioChi, gioiTinh: gt });
    const khop = p.tuTruCheck.every((x, i) => x === tuTru[i]);
    if (!khop) return '';
    const r = baziRailData(p);
    if (!r.dungThanNen && !r.dungThanKy) return '';
    return `\n\n[DỤNG THẦN người ký — CHỈ dùng để đối chiếu ngũ hành nét, KHÔNG tự tính lại tứ trụ]\nDụng thần nên có: ${r.dungThanNen || 'không rõ'}\nDụng thần nên kỵ: ${r.dungThanKy || 'không rõ'}`;
  } catch (e) {
    console.error('[api/but-tuong] dungThanContext hỏng:', e);
    return '';
  }
}

async function runPost(request) {
  try {
    const body = await request.json();
    const { metrics, birth = null } = body;
    if (!metrics || !metrics.truc) {
      return Response.json({ error: 'Thiếu số đo chữ ký.' }, { status: 400 });
    }

    const engine = loadEngine();
    const flat = engine.railData(metrics);
    if (!flat || !flat.sauTrucBuTuong) {
      return Response.json({ error: 'Số đo chữ ký không hợp lệ.' }, { status: 400 });
    }

    const lines = [
      `Nguồn dữ liệu: ${metrics.nguon === 'anh-tinh' ? 'ảnh tĩnh (tải lên)' : `ký trực tiếp (${metrics.soLanKy || 1} lần)`}`,
      `Sáu trục: ${flat.sauTrucBuTuong}`,
      `Trục chưa đo được: ${flat.trucThieu}`,
      `Ngũ hành nét: ${flat.nguHanhNet}`,
      `Điểm tổng: ${flat.tongDiem}/100`,
      `Độ ổn định giữa các lần ký: ${flat.doOnDinh}`,
    ];
    if (flat.the) lines.push(`Thế: ${flat.the}`);
    if (metrics.goiY) lines.push(`Gợi ý đã tính sẵn (trục yếu nhất — ${metrics.goiY.ten}): ${metrics.goiY.loi}`);

    const userText = `Hãy luận bút tướng cho chữ ký sau đây theo cổ pháp, đủ 5 phần.\n\n${lines.join('\n')}${dungThanContext(birth)}`;

    return await llmStreamResponse(
      { system: SP_BUT_TUONG, prompt: userText, images: [], maxTokens: 4500 },
      'delta',
    );
  } catch (e) {
    return Response.json({ error: e.message || 'Unknown' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request) {
  return withToolOutcome('but-tuong', () => runPost(request));
}
