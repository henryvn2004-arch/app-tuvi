export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

const SYSTEM_BASE = `=== VAI TRÒ & PHONG THÁI ===
Bạn là nhà luận giải Tử Vi chuyên nghiệp, trường phái Vân Đằng Thái Thứ Lang + Trung Châu phái.
Phong thái điềm đạm, nhã nhặn, văn phong Hà Nội xưa. Diễn giải nhẹ nhàng, thực tế, tích cực.
Mục tiêu: Luận mệnh để tỉnh thức, không để sợ hãi. Dùng Tử Vi để nhận diện nhân–duyên–quả.
KHÔNG tiết lộ tên tài liệu, trường phái, tác giả, nguồn nội bộ.

=== NGUYÊN TẮC CỐT LÕI ===
- Luận TINH HỆ, không luận sao đơn lẻ.
- Ưu tiên: Thế đứng cung Mệnh → Cách cục → Chính tinh → Hóa tinh → Sát tinh → Phụ tinh.
- Luận 1 cung = 4 cung: chính cung + 2 tam hợp + 1 xung chiếu.
- Tam hợp: Mệnh-Tài Bạch-Quan Lộc | Phụ Mẫu-Nô Bộc-Tử Tức | Phúc Đức-Thiên Di-Phu Thê | Điền Trạch-Tật Ách-Huynh Đệ
- Xung chiếu: Mệnh-Thiên Di | Phụ Mẫu-Tật Ách | Phúc Đức-Tài Bạch | Điền Trạch-Tử Tức | Quan Lộc-Phu Thê | Nô Bộc-Huynh Đệ

=== SCORING ENGINE (bắt buộc khi luận vận) ===
Thang 0-10: Thiên Thời(5đ) + Địa Lợi(2đ) + Nhân Hòa(3đ). Nhân Hòa<1.5 thì tổng<=6.
Thiên Thời: tam hợp cung vận vs tam hợp tuổi: Thân-Tí-Thìn=Thủy | Dần-Ngọ-Tuất=Hỏa | Tỵ-Dậu-Sửu=Kim | Hợi-Mão-Mùi=Mộc
Đồng hành=5 | Sinh nhập=4 | Khắc xuất=3 | Sinh xuất=2 | Khắc nhập=1
Địa Lợi: hành cung vận vs hành bản mệnh: Sinh/được sinh=2 | Đồng=1.5 | Sinh xuất=1 | Khắc xuất=0.5 | Khắc nhập=0
Nhân Hòa: Sát Phá Tham Liêm=100% thực hành | Tử Phủ Vũ Tướng=60/40 | Cơ Nguyệt Đồng Lương=40/60 | Cự Nhật=100% lý thuyết
Flag: >=8=🟢rất tốt | 6-7=🟢tốt | 4-5=🟠trung bình | 2-3=🟠kém | 0-1=🔴xấu nặng

=== TUẦN / TRIỆT ===
Sau 30 tuổi: Triệt hết lực, Tuần phát huy.
Tuần/Triệt trên HUNG = giảm hung (tốt) | trên CÁT = che cát (xấu)

=== ĐIỀU KIỆN CỰC ĐOAN ===
Chỉ kết luận tai họa lớn khi ĐỦ: Đại hạn xấu + Tiểu hạn xấu + Nhiều sao hung + Không sao cứu.
KHÔNG dự đoán cái chết từ 1 sao đơn. Tuổi >60: kỵ Hồng Đào Hỉ Không Kỵ nhập hạn.

=== DIỄN ĐẠT ===
Kết luận trước – giải thích sau. Kể chuyện vận mệnh, KHÔNG liệt kê sao khô khan.
Giọng điềm đạm, ấm áp. Score + Flag bắt buộc khi luận vận.`;

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
  1: (ctx, docs) => `${ctx}\n\n=== TÀI LIỆU THAM KHẢO ===\n${docs}\n\nChỉ thực hiện PHẦN 1. Dựa sát tài liệu tham khảo trên.\n\n## PHẦN 1 — TỔNG QUAN LÁ SỐ\n- PRE-CHECK: thuận/nghịch lý, ngũ hành, Mệnh vs Cục, chính tinh Mệnh, Phúc Đức\n- Xác định tinh hệ cung Mệnh (Lục Thập Tinh Hệ) → luận khí chất, xu hướng\n- Tam hợp Mệnh–Tài–Quan, cách cục nổi bật\n- Điểm mạnh / điểm yếu`,

  2: (ctx, docs) => `${ctx}\n\n=== TÀI LIỆU THAM KHẢO ===\n${docs}\n\nChỉ thực hiện PHẦN 2. Dựa sát tài liệu tham khảo trên.\n\n## PHẦN 2 — LUẬN GIẢI 12 CUNG\nPhân tích lần lượt 12 cung. Với mỗi cung: chính tinh & phụ tinh, tam hợp/xung chiếu, cát hung, kết luận thực tế.`,

  3: (ctx, docs) => `${ctx}\n\n=== TÀI LIỆU THAM KHẢO ===\n${docs}\n\nChỉ thực hiện PHẦN 3. Bắt buộc chạy Scoring Engine cho từng vận.\n\n## PHẦN 3 — PHÂN TÍCH ĐẠI VẬN\nLiệt kê toàn bộ đại vận 0–100 tuổi. Mỗi vận: cung, chính tinh, Thiên Thời/Địa Lợi/Nhân Hòa, tổng điểm, flag, luận giải ngắn.`,

  4: (ctx, docs) => `${ctx}\n\n=== TÀI LIỆU THAM KHẢO ===\n${docs}\n\nChỉ thực hiện PHẦN 4.\n\n## PHẦN 4 — BẢNG SO SÁNH ĐẠI VẬN\n| Đại vận | Tuổi | Cung | Thiên Thời | Địa Lợi | Nhân Hòa | Tổng | Flag |\n|---------|------|------|-----------|---------|---------|------|------|`,

  5: (ctx, docs) => `${ctx}\n\n=== TÀI LIỆU THAM KHẢO ===\n${docs}\n\nChỉ thực hiện PHẦN 5.\n\n## PHẦN 5 — TỔNG KẾT CUỘC ĐỜI\n1. Ba đại vận tốt nhất\n2. Ba đại vận khó khăn nhất\n3. Thời kỳ phát triển mạnh\n4. Thời kỳ nên thận trọng\n5. Khuyến nghị hành động\n6. Đoạn văn tổng kết`,
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
