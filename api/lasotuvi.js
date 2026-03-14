const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'Bạn là nhà luận giải Tử Vi chuyên nghiệp.';

// Query để tìm tài liệu liên quan cho từng phần
const QUERIES = {
  1: (laSoText) => `lục thập hoa giáp tinh hệ tổng quan mệnh cục chính tinh khí chất cách cục pre-check`,
  2: (laSoText) => `luận giải 12 cung mệnh phụ mẫu phúc đức điền trạch quan lộc tài bạch phu thê tử tức tật ách`,
  3: (laSoText) => `đại vận thiên thời địa lợi nhân hòa scoring vận hạn VDTTL giai đoạn`,
  4: (laSoText) => `vận hiện tại tiểu hạn lưu niên lưu thái tuế lưu lộc sao lưu động`,
  5: (laSoText) => `tổng kết cuộc đời đại vận tốt xấu khuyến nghị hành động phúc đức`,
};

const PROMPTS = {
  1: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 1 — TỔNG QUAN LÁ SỐ (300-400 từ)

Phân tích tổng thể lá số, bao gồm:
- Bản Mệnh – Cục (Nạp Âm)
- Cung Mệnh và Cung Thân
- Chính tinh thủ Mệnh
- Khí chất con người (dựa vào 3 vòng Thái Tuế, Lộc Tồn, Tràng Sinh nếu có trong engine output)
- Ưu điểm nổi bật
- Nhược điểm dễ gặp

Mục tiêu: giúp người đọc hiểu bản chất con người và đường đời tổng quát.`,

  2: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 2 — CUNG MỆNH (200-300 từ)

Luận giải cung Mệnh dựa trên engine output và tài liệu tham khảo:
- Ý nghĩa chính tinh tại cung Mệnh
- Cách cục active tại cung Mệnh và tam phương tứ chính
- Tác động tốt – xấu lên cuộc đời tổng thể
- Khuynh hướng tính cách và số phận

Luận giải dễ hiểu, thực tế.`,

  3: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 3 — CUNG PHỤ MẪU (200-300 từ)

Luận giải cung Phụ Mẫu:
- Ý nghĩa sao tại cung
- Cách cục active
- Mối quan hệ với cha mẹ, người bề trên, thầy cô
- Khuynh hướng dễ xảy ra`,

  4: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 4 — CUNG PHÚC ĐỨC (200-300 từ)

Luận giải cung Phúc Đức:
- Ý nghĩa sao tại cung
- Cách cục active
- Phúc khí, tâm linh, đức hạnh tổ tiên để lại
- Đời sống tinh thần, tín ngưỡng`,

  5: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 5 — CUNG ĐIỀN TRẠCH (200-300 từ)

Luận giải cung Điền Trạch:
- Ý nghĩa sao tại cung
- Cách cục active
- Nhà đất, bất động sản, tài sản cố định
- Khả năng tích lũy và giữ tài sản`,

  6: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 6 — CUNG QUAN LỘC (200-300 từ)

Luận giải cung Quan Lộc:
- Ý nghĩa sao tại cung
- Cách cục active
- Sự nghiệp, công danh, nghề nghiệp phù hợp
- Cơ hội thăng tiến và thách thức`,

  7: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 7 — CUNG NÔ BỘC (200-300 từ)

Luận giải cung Nô Bộc:
- Ý nghĩa sao tại cung
- Cách cục active
- Bạn bè, đồng nghiệp, nhân viên, đối tác
- Khả năng được giúp đỡ hay bị phản`,

  8: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 8 — CUNG THIÊN DI (200-300 từ)

Luận giải cung Thiên Di:
- Ý nghĩa sao tại cung
- Cách cục active
- Xuất ngoại, xa nhà, di chuyển
- Vận may khi ở xa, quý nhân nơi xa`,

  9: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 9 — CUNG TẬT ÁCH (200-300 từ)

Luận giải cung Tật Ách:
- Ý nghĩa sao tại cung
- Cách cục active
- Sức khỏe, bệnh tật dễ gặp
- Những điều cần chú ý để bảo vệ sức khỏe`,

  10: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 10 — CUNG TÀI BẠCH (200-300 từ)

Luận giải cung Tài Bạch:
- Ý nghĩa sao tại cung
- Cách cục active
- Khả năng kiếm tiền, tích lũy
- Nguồn thu nhập và rủi ro tài chính`,

  11: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 11 — CUNG TỬ TỨC (200-300 từ)

Luận giải cung Tử Tức:
- Ý nghĩa sao tại cung
- Cách cục active
- Con cái, học trò, người dưới
- Duyên con cái và mối quan hệ`,

  12: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 12 — CUNG PHU THÊ (200-300 từ)

Luận giải cung Phu Thê:
- Ý nghĩa sao tại cung
- Cách cục active
- Hôn nhân, vợ/chồng, tình duyên
- Duyên phận và những điều cần lưu ý`,

  13: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 13 — CUNG HUYNH ĐỆ (200-300 từ)

Luận giải cung Huynh Đệ:
- Ý nghĩa sao tại cung
- Cách cục active
- Anh chị em, bạn bè thân thiết
- Mối quan hệ huynh đệ và hỗ trợ`,

  14: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 14 — CÁC ĐẠI VẬN TOÀN ĐỜI (300-400 từ)

Dựa vào engine output (scoring Thiên Thời / Địa Lợi / Nhân Hòa từng đại vận), lập bảng tổng hợp:

| Đại vận | Tuổi | Cung | Thiên Thời | Địa Lợi | Nhân Hòa | Tổng | Flag |
|---------|------|------|-----------|---------|---------|------|------|

Sau bảng, luận ngắn gọn 3 đại vận quan trọng nhất (tốt nhất hoặc xấu nhất).
Mục tiêu: người đọc nhìn được dòng chảy vận trình toàn đời.`,

  15: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 15 — VẬN HIỆN TẠI (300-400 từ)

Dựa vào engine output, phân tích chi tiết:

1. Đại vận hiện tại (10 năm):
   - Thiên Thời / Địa Lợi / Nhân Hòa
   - Bản chất vận, cơ hội và thách thức
   - Công việc, tài chính, gia đình, sức khỏe

2. Tiểu vận năm xem (1 năm):
   - Tính chất năm (70% đại vận + 30% tiểu vận)
   - Những điều nên làm
   - Những điều nên tránh

Phần này cụ thể và thực tế nhất.`,
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const setHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  };

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { hoTen = 'Bạn', nam, gioiTinh, namXem, laSoText, phan = 1, docs = '', engineResult = '' } = body;

    const apiKey = ANTHROPIC_API_KEY;
    if (!apiKey) { setHeaders(res); return res.status(500).json({ error: 'Thiếu ANTHROPIC_API_KEY.' }); }
    if (!laSoText) { setHeaders(res); return res.status(400).json({ error: 'Không có dữ liệu lá số.' }); }

    const gioi = gioiTinh === 'nam' ? 'nam' : 'nữ';
    const ctx = `Lá số của: ${hoTen}, sinh năm ${nam}, ${gioi}, năm xem: ${namXem || new Date().getFullYear()}.

DỮ LIỆU LÁ SỐ:
${laSoText}${engineResult ? '\n\n' + engineResult : ''}`;

    const promptFn = PROMPTS[phan] || PROMPTS[1];
    const userPrompt = promptFn(ctx, docs || '(Không có tài liệu tham khảo)');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      if (err.includes('overloaded')) setHeaders(res); return res.status(503).json({ error: 'Claude đang bận, thử lại sau 30 giây.' });
      setHeaders(res); return res.status(500).json({ error: `Lỗi Claude API: ${err.slice(0, 200)}` });
    }

    const data = await resp.json();
    setHeaders(res); return res.status(200).json({ luanGiai: data.content[0].text });

  } catch (e) {
    setHeaders(res); return res.status(500).json({ error: `Lỗi server: ${e.message}` });
  }
}
