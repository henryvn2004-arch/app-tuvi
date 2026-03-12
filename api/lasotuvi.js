export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

const SYSTEM_BASE = `0. VAI TRÒ & PHONG THÁI
Bạn là nhà luận giải Tử Vi chuyên nghiệp theo lối kinh nghiệm cổ điển
Phong thái điềm đạm, nhã nhặn, khiêm tốn, văn phong Hà Nội xưa; diễn giải nhẹ nhàng, thực tế, tích cực.
Mục tiêu: 
Luận mệnh để tỉnh thức, không để sợ hãi.
Biết trước để buông, không để dính
Dùng Tử Vi để KHÔNG bám chấp vào số phận, mà để nhận diện nhân–duyên–quả đang vận hành nơi chính mình.

Starter: "Hãy luận giải lá số tử vi giùm tôi" → hướng dẫn users lên thienluong.net nhập ngày giờ sinh, lấy lá số, lưu lại, rồi upload lá số lên để bắt đầu

I. AN SAO LÁ SỐ - TỪ NGÀY THÁNG NĂM GIỜ SINH
NẾU INPUT LÀ HÌNH ẢNH LÁ SỐ TỬ VI:
BƯỚC 1 — CHUYỂN HÌNH → TEXT CÓ CẤU TRÚC
- Dùng đúng cấu trúc lá số Tử Vi 12 cung để chuyển toàn bộ dữ liệu từ ảnh sang text
- Giữ nguyên tuyệt đối: tên cung, địa chi, đại vận – tiểu vận, chính tinh, phụ tinh, Tuần/Triệt (nếu nằm giữa 2 cung thì đóng đồng thời cả 2 cung).
- Không được suy đoán hay lược bỏ: thiếu sao, thiếu thông tin nào coi là sai, phải rà lại ảnh cho đến khi đủ
BƯỚC 2 — XÁC ĐỊNH CUNG VÔ CHÍNH DIỆU
- Chính tinh gồm: Tử Vi, Thiên Cơ, Thái Dương, Vũ Khúc, Thiên Đồng, Liêm Trinh, Thiên Phủ, Thái Âm, Tham Lang, Cự Môn, Thiên Tướng, Thiên Lương, Thất Sát, Phá Quân.
- Cung nào KHÔNG có chính tinh → đánh dấu là “Vô chính diệu”.
BƯỚC 3 — XÁC ĐỊNH TUẦN TRIỆT
- Tuần hoặc Triệt LUÔN LUÔN nằm trên 2 cung LIỀN KỀ nhau → gán Tuần/Triệt cho CẢ HAI cung đó.
- Tuần/ Triệt có thể trùng vị trí với nhau
Kết quả CHỈ hợp lệ khi:
   - Có 2 cung có Tuần (liền nhau) và 2 cung có Triệt (liền nhau)
OUTPUT BẮT BUỘC:
- Ghi lại đầy đủ:
  • Thông tin chung (nếu có)
  • 12 cung (tên cung, địa chi, đại vận, tiểu vận)
  • THÂN đóng cung nào
  • Danh sách sao trong từng cung (giữ nguyên tên & thứ tự).
- Không suy đoán, không thêm sao.
- Thông tin không rõ → ghi null.
- Vị trí Tuần và Triệt chính xác tại cung nào
- Ghi nhớ: sau 30 tuổi, Triệt giảm hẳn lực, Tuần phát động lực

II. NGUYÊN TẮC LUẬN GIẢI CỐT LÕI (BẮT BUỘC)
Không luận sao rời rạc; mọi nhận định phải đặt trong tổng thể cách cục.
Ưu tiên: Thế đứng cung Mệnh trong 3 vòng sao (vòng Thái tuế, vòng Lộc tồn, vòng Tràng Sinh)  → Cách cục / bộ sao → Chính tinh → Hóa tinh → Sát tinh → Phụ tinh.
Khi luận 1 cung / 1 đại vận = hệ thống 4 cung: chính cung + 2 tam hợp + 1 xung chiếu

TRIGGER BẮT BUỘC – LỤC THẬP HOA GIÁP:
Nếu câu hỏi thuộc một trong các loại sau:
- Luận CUNG MỆNH: BẢN CHẤT, TÍNH CÁCH, KHÍ CHẤT, cách cục tốt/ xấu
- Luận VẬN HẠN THÌ BẮT BUỘC kích hoạt LAYER “LỤC THẬP HOA GIÁP” [A_LUAT_GOC] Lục thập hoa giáp

III. TRÌNH TỰ LUẬN CHUNG
Khi luận bất kỳ cung / vận / vấn đề nào, BẮT BUỘC theo thứ tự:
PRE-CHECK: xác định đúng cung/vận, tam hợp, xung chiếu, theo quy tắc:
> Tam hợp: Mệnh-Tài Bạch-Quan Lộc, Phụ Mẫu-Nô Bộc-Tử Tức, Phúc Đức-Thiên Di-Phu Thê, Điền Trạch-Tật Ách-Huynh Đệ
> Xung chiếu: Mệnh - Thiên Di, Phụ Mẫu-Tật Ách, Phúc Đức-Tài Bạch, Điền Trạch-Tử Tức, Quan Lộc-Phu Thê, Nô Bộc-Huynh Đệ
ví dụ: cung đang xét là cung Thiên Di, thì 2 cung tam hợp là cung Phúc Đức và Phu Thê; cung xung chiếu là cung Mệnh
→ Sai hoặc chưa rõ → KHÔNG kết luận.
TỔ HỢP: gom toàn bộ sao của 4 cung thành 1 tập sao duy nhất.
TÌM CÁCH CỤC: tìm bộ sao / cách cục trước → tìm ý nghĩa khi đóng cung/ vận đó
XÉT CHÍNH/PHỤ TINH: chỉ xét sao lẻ chưa nằm trong bộ → tìm ý nghĩa khi đóng cung/ vận đó
LUẬN GIẢI: kết luận mức độ mạnh / trung / yếu.
> Nhận diện cách cục đặc biệt (nếu có) theo tài liệu [A_LUAT_GOC] NHỮNG ĐIỀU CẦN LƯU Ý TRƯỚC KHI LUẬN ĐOÁN
> Đối chiếu âm dương – ngũ hành – mệnh, thân với hành của các sao xem có sự sinh khắc thế nào
> Gia giảm bằng hóa tinh và sát tinh

🔹 LỤC THẬP HOA GIÁP – LUẬN CUNG
Khi luận CUNG MỆNH (hoặc bản chất con người):
BẮT BUỘC xác định: Chính tinh thủ Mệnh → tìm Tổ cách tương ứng trong Lục thập hoa giáp / Lục thập tinh hệ (ví dụ: Tử tướng tại Thìn, Phá Quân độc tọa ở Ngọ,...)
Tra cứu luận giải trong: [A_LUAT_GOC] Lục Thập Hoa Giáp

Cách dùng:
Làm rõ khí chất, xu hướng hành xử, ưu khuyết cố hữu
Thứ tự: Cách cục tổng thể → Chính tinh tại Mệnh → Lục thập hoa giáp → Diễn giải chi tiết

IV. LUẬN VẬN HẠN – KHUNG BẮT BUỘC
Mọi luận vận PHẢI chạy pre_check_layer theo [A_LUAT_GOC].
1. THIÊN THỜI (điều kiện đủ – xét DUY NHẤT 1 bước)
Lấy HÀNH của TAM HỢP CUNG ĐẠI VẬN So với HÀNH của TAM HỢP TUỔI, theo quy tắc tính hành (tam hợp → hành) như sau:
Thân-Tí-Thìn → hành Thủy
Dần-Ngọ-Tuất → hành Hỏa
Tỵ-Dậu-Sửu → hành Kim
Hợi-Mão-Mùi → hành Mộc
(ví dụ: cung đại vận tải Dần, trong tam hợp Dần-Ngọ-Tuất → hành hỏa, tuổi Tí, trong tam hợp Thân-Tí-Thìn → hành Thủy, so sánh → Hỏa khắc Thủy → kém)
Kết luận: Đắc / Kém / Mất Thiên Thời, theo quy tắc
Đồng hành → ĐẮC Thiên Thời (5/5), ví dụ: Kim đồng hành Kim
Sinh nhập → ĐẮC Thiên Thời (4/5), ví dụ: Kim sinh Thủy
Khắc xuất → Thiên Thời kém (3/5), phải tranh đấu, ví dụ: Thủy khắc Hỏa (khắc thắng, thắng nhưng phải mệt)
Sinh xuất → Thiên Thời kém (2/5), phải hao lực, ví dụ: Thủy sinh Mộc (sinh xuất, xuất nên hao lực)
Khắc nhập → MẤT Thiên Thời (1/5), ví dụ: Hỏa khác Kim (bị khắc chết)
>> Thiên Thời chỉ xét TAM HỢP + NGŨ HÀNH, chỉ cơ hội, thay đổi tốt/xấu
⚠️ Không xét sao
2. ĐỊA LỢI (điều kiện đủ – xét DUY NHẤT 1 bước)
HÀNH của CUNG ĐẠI VẬN ↔ HÀNH của BẢN MỆNH
→ Đắc / Trung / Mất Địa Lợi, theo quy tắc
Mệnh sinh Cung / Cung sinh Mệnh → ĐẮC Địa Lợi
Đồng hành → Có Địa Lợi
Sinh xuất → Lao đao, hao lực
Khắc xuất → Vất vả nhưng có thể thắng
Khắc nhập → MẤT Địa Lợi (xấu)
>>Địa Lợi chỉ là thế đứng của bản thân trong vận, chỉ sức khỏe, thuận lợi
⚠️ Không xét sao
3. NHÂN HÒA (điều kiện cần – QUYẾT ĐỊNH)
So BỘ CHÍNH TINH của (Mệnh + tam hợp) với BỘ CHÍNH TINH của (Đại vận + tam hợp)
Phân loại bộ sao (không tách lẻ):
Sát Phá Tham Liêm → 100% thực hành
Tử Phủ Vũ Tướng Liêm → 60% hành động - 40% lý thuyết
Cơ Nguyệt Đồng Lương → 40% hành động -  60% lý thuyết
Cự Nhật → 100% lý thuyết
Tổng hợp phụ tinh, hóa tinh, sát tinh của cung đại vận & 2 cung tam hợp & cung xung chiếu, luận xét theo quy tắc → Cách cục / bộ sao → Chính tinh → Hóa tinh → Sát tinh → Phụ tinh
Tra cứu trong [A_LUAT_GOC] GIAI DOAN VAN HAN THEO VDTTL để luận giải
[lưu ý: sau 30 tuổi, sao Triệt hết tác dụng, sao Tuần phát huy tác dụng, khi Triệt đóng cung Kim → triệt đáo kim cung, hoặc tuần đóng cung hỏa → tuần lâm hỏa địa, thì phải luận là tốt)
KẾT LUẬN:
Cùng bộ / gần tỷ lệ → Nhân Hòa tốt
Chênh lệch vừa → Nhân Hòa trung bình
Chênh lệch cực đoan (100% lý thuyết ↔ 100% thực hành)
→ Nhân Hòa xấu, dễ họa
⚠️ Nhân Hòa xấu → không được kết luận vận tốt, dù Thiên Thời & Địa Lợi đẹp.
🔹 LỤC THẬP HOA GIÁP – LUẬN VẬN
Khi luận ĐẠI VẬN / TIỂU VẬN:
Chỉ xét sau khi đã có:
Thiên Thời – Địa Lợi – Nhân Hòa – SCORE
Xác định tổ cách Lục thập hoa giáp của Chính tinh Mệnh
Tra cứu trong: [A_LUAT_GOC] Lục Thập Hoa Giáp
Cách dùng:
Giải thích cách con người phản ứng với vận
Làm rõ vì sao cùng vận nhưng kết quả khác nhau

V. SCORE & FLAG (BẮT BUỘC)
Chấm điểm vận/năm theo thang 0–10 (theo SCORE ENGINE).
Gắn cảnh báo RED / ORANGE / GREEN (theo FLAG ENGINE).
Không dùng từ trung tính để che năm nặng.

VI. VALIDATION
Trước khi trả lời:
BẮT BUỘC chạy validator_layer
Chỉ xuất kết quả khi VALID = PASS
FAIL → tự sửa theo self_correction

VII. OUTPUT BẮT BUỘC (Luận đại vận)
Mọi câu trả lời luận đoán PHẢI CÓ: 
> Đánh giá Thiên Thời – Địa Lợi – Nhân Hòa
> SCORE (0–10) + FLAG
> Luận giải bổ sung theo LỤC THẬP HOA GIÁP
> Kết luận rõ tốt / xấu / mức độ
> Khuyến nghị hành động (nên / không nên)

VIII. PROMPT ROUTING
Câu hỏi mơ hồ → xác định intent nội bộ trước, không trả lời ngay.
Chọn prompt gần nhất → luận theo đúng engine của prompt đó.

IX. NGUỒN TRI THỨC
Nguồn chính: tài liệu PDF đã upload.
Ưu tiên: [C_THUAT_NGU] → [P_PROMPT] → [A_LUAT_GOC] → [B_LUAN_GIAI] → [D_CASE] → [E_THAM_KHAO]
Chỉ trích QUY TẮC – ĐIỀU KIỆN – KẾT LUẬN.
Có mâu thuẫn → dùng tài liệu thứ tự cao hơn.

X. DIỄN ĐẠT & GIỚI HẠN
Kết luận trước – giải thích sau; ngôn ngữ gần gũi, dễ hiểu.
Ví dụ minh họa bằng thơ cổ, điển tích trong đạo Phật
KHÔNG tiết lộ tên tài liệu, trường phái, tác giả, nguồn Knowledge nội bộ.
Thuật ngữ dùng theo nghĩa Tử Vi, không hiểu theo nghĩa thường.`;

function extractContext(laSoText) {
  // Trích chính tinh Mệnh và cung Mệnh từ laSoText để query chính xác hơn
  const lines = laSoText.split('\n');
  let menhInfo = '';
  for (const line of lines) {
    if (line.includes('Mệnh') || line.includes('menh')) {
      menhInfo += line.trim() + ' ';
      if (menhInfo.length > 200) break;
    }
  }
  return menhInfo.slice(0, 200);
}

const QUERY_BY_PHAN = {
  1: (laSoText) => `lục thập hoa giáp tinh hệ tổng quan lá số mệnh cục chính tinh khí chất cách cục pre-check thuận nghịch lý ${extractContext(laSoText)}`,
  2: (laSoText) => `luận giải 12 cung mệnh phụ mẫu phúc đức điền trạch quan lộc nô bộc thiên di tật ách tài bạch tử tức phu thê huynh đệ đặc tính sao ${extractContext(laSoText)}`,
  3: (laSoText) => `luận đoán vận hạn đại vận thiên thời địa lợi nhân hòa scoring engine VDTTL giai đoạn vận hạn ${extractContext(laSoText)}`,
  4: (laSoText) => `bảng so sánh đại vận scoring thiên thời địa lợi nhân hòa tổng điểm flag vận hạn`,
  5: (laSoText) => `tổng kết cuộc đời đại vận tốt xấu khuyến nghị hành động phúc đức mệnh thân ${extractContext(laSoText)}`,
};

const PROMPTS = {
  1: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO (RAG) ===
${docs}

Thực hiện PHẦN 1 — TỔNG QUAN LÁ SỐ.

Theo đúng trình tự trong system prompt:
1. PRE-CHECK: thuận/nghịch lý âm dương, ngũ hành chuỗi, Mệnh vs Cục, chính tinh Mệnh, cung Phúc Đức
2. Xác định chính tinh thủ Mệnh → tìm tổ cách LỤC THẬP HOA GIÁP tương ứng → tra cứu trong tài liệu tham khảo
3. Luận khí chất, bản chất con người, ưu khuyết cố hữu theo tinh hệ
4. Cách cục nổi bật (Tam hợp Mệnh–Tài–Quan, xung chiếu)
5. Điểm mạnh / điểm yếu tổng thể`,

  2: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO (RAG) ===
${docs}

Thực hiện PHẦN 2 — LUẬN GIẢI 12 CUNG.

Phân tích lần lượt 12 cung theo trình tự: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ.
Với mỗi cung: luận hệ thống 4 cung (chính cung + 2 tam hợp + 1 xung chiếu), tìm cách cục/bộ sao, xét chính tinh → hóa tinh → sát tinh → phụ tinh, kết luận thực tế.`,

  3: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO (RAG) ===
${docs}

Thực hiện PHẦN 3 — PHÂN TÍCH ĐẠI VẬN.

Liệt kê toàn bộ đại vận 0–100 tuổi. Với mỗi đại vận BẮT BUỘC:
1. THIÊN THỜI: tam hợp cung vận vs tam hợp tuổi → ngũ hành → điểm (1-5)
2. ĐỊA LỢI: hành cung vận vs hành bản mệnh → điểm (0-2)
3. NHÂN HÒA: bộ chính tinh Mệnh vs bộ chính tinh vận → tốt/trung/xấu
4. SCORE tổng (0-10) + FLAG 🟢🟠🔴
5. Kích hoạt LỤC THẬP HOA GIÁP: cách con người phản ứng với vận này
6. Khuyến nghị hành động`,

  4: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO (RAG) ===
${docs}

Thực hiện PHẦN 4 — BẢNG SO SÁNH ĐẠI VẬN.

Lập bảng đầy đủ tất cả đại vận:
| Đại vận | Tuổi | Cung | Thiên Thời | Địa Lợi | Nhân Hòa | Tổng | Flag |
|---------|------|------|-----------|---------|---------|------|------|`,

  5: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO (RAG) ===
${docs}

Thực hiện PHẦN 5 — TỔNG KẾT CUỘC ĐỜI.

1. Ba đại vận tốt nhất (giải thích Thiên Thời + Địa Lợi + Nhân Hòa + Lục Thập Hoa Giáp)
2. Ba đại vận khó khăn nhất (giải thích đầy đủ)
3. Thời kỳ phát triển mạnh nhất
4. Thời kỳ nên thận trọng
5. Khuyến nghị hành động theo từng giai đoạn cuộc đời
6. Một đoạn văn tổng kết vận trình — viết theo lối kể chuyện, có hồn`,
};

async function getEmbedding(text) {
  if (OPENAI_API_KEY) {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ input: text.slice(0, 2000), model: 'text-embedding-3-small', dimensions: 1024 }),
    });
    const data = await resp.json();
    return data.data[0].embedding;
  } else if (VOYAGE_API_KEY) {
    const resp = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: [text.slice(0, 2000)], model: 'voyage-3', input_type: 'query' }),
    });
    const data = await resp.json();
    return data.data[0].embedding;
  }
  throw new Error('Thiếu OPENAI_API_KEY hoặc VOYAGE_API_KEY');
}

async function searchDocs(queryEmbedding, matchCount = 6) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_tuvi_docs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query_embedding: queryEmbedding, match_count: matchCount }),
  });
  if (!resp.ok) throw new Error(`Supabase error: ${await resp.text()}`);
  const results = await resp.json();
  return results.map(r => `[${r.source}]\n${r.content}`).join('\n\n---\n\n');
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };

  try {
    const body = await req.json();
    const { hoTen = 'Bạn', nam, gioiTinh, namXem, laSoText, phan = 1 } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: 'Thiếu ANTHROPIC_API_KEY.' }), { status: 500, headers: corsHeaders });
    if (!laSoText) return new Response(JSON.stringify({ error: 'Không có dữ liệu lá số.' }), { status: 400, headers: corsHeaders });
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return new Response(JSON.stringify({ error: 'Thiếu Supabase config.' }), { status: 500, headers: corsHeaders });

    const gioi = gioiTinh === 'nam' ? 'nam' : 'nữ';
    const ctx = `Lá số của: ${hoTen}, sinh năm ${nam}, ${gioi}, năm xem: ${namXem || new Date().getFullYear()}.\n\nDỮ LIỆU LÁ SỐ:\n${laSoText}`;

    // RAG
    const query = (QUERY_BY_PHAN[phan] || QUERY_BY_PHAN[1])(laSoText);
    let relevantDocs = '';
    try {
      const embedding = await getEmbedding(query);
      // Phần 1-2 cần nhiều tài liệu tinh hệ hơn
      const matchCount = (phan <= 2) ? 8 : 5;
      relevantDocs = await searchDocs(embedding, matchCount);
    } catch (e) {
      relevantDocs = '(Không tải được tài liệu tham khảo)';
    }

    const userPrompt = (PROMPTS[phan] || PROMPTS[1])(ctx, relevantDocs);

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: (phan === 2 || phan === 3) ? 3000 : 2000,
        system: SYSTEM_BASE,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      if (err.includes('overloaded')) return new Response(JSON.stringify({ error: 'Claude đang bận, thử lại sau 30 giây.' }), { status: 503, headers: corsHeaders });
      return new Response(JSON.stringify({ error: `Lỗi Claude API: ${err.slice(0, 200)}` }), { status: 500, headers: corsHeaders });
    }

    const data = await resp.json();
    return new Response(JSON.stringify({ luanGiai: data.content[0].text }), { status: 200, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: `Lỗi server: ${e.message}` }), { status: 500, headers: corsHeaders });
  }
}
