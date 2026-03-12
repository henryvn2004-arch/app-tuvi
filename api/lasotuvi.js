export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

const SYSTEM_BASE = process.env.SYSTEM_PROMPT || 'Bạn là nhà luận giải Tử Vi chuyên nghiệp.';

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
