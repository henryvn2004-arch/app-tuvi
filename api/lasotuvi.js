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

PHẦN 1 — TỔNG QUAN LÁ SỐ

Phân tích tổng thể lá số, bao gồm:
- Bản Mệnh – Cục
- Cung Mệnh và Cung Thân
- Chính tinh thủ Mệnh
- Khí chất con người
- Ưu điểm nổi bật
- Nhược điểm dễ gặp
- Xu hướng cuộc đời (an ổn, biến động, bôn ba, phú quý, v.v.)

Mục tiêu: giúp người đọc hiểu bản chất con người và đường đời tổng quát. Không đi quá chi tiết từng cung.`,

  2: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 2 — LUẬN GIẢI 12 CUNG

Luận giải lần lượt 12 cung theo thứ tự: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ.

Với mỗi cung phân tích:
- Ý nghĩa chính của cung đó trong lá số
- Tính chất các sao chính
- Tác động tốt – xấu
- Những khuynh hướng dễ xảy ra trong đời

Luận giải dễ hiểu, thực tế, không dùng quá nhiều thuật ngữ khó.`,

  3: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 3 — ĐẠI VẬN TOÀN ĐỜI

Lập bảng so sánh tốt/xấu theo thang điểm 10 cho từng đại vận (tính toán scoring theo Thiên Thời / Địa Lợi / Nhân Hòa).

## Bảng Đại Vận
| Đại vận | Tuổi | Cung | Thiên Thời | Địa Lợi | Nhân Hòa | Tổng /10 | Flag |
|---------|------|------|-----------|---------|---------|---------|------|

Sau bảng, với mỗi đại vận nêu:
- Xu hướng vận trình (tốt / trung bình / thử thách)
- Công việc, tài chính, tình cảm, sức khỏe
- Cơ hội và điều cần thận trọng

Mục tiêu: giúp người đọc nhìn được dòng chảy cuộc đời theo từng giai đoạn.`,

  4: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 4 — ĐẠI VẬN & TIỂU VẬN HIỆN TẠI

Xác định đại vận (10 năm) và tiểu vận (1 năm) đang đi dựa trên năm xem. Phân tích bao gồm:
- Xu hướng vận khí năm nay
- Công việc – tài chính
- Quan hệ – gia đình
- Sức khỏe
- Những điều nên làm
- Những điều nên tránh

Phần này cụ thể và thực tế hơn các phần trước.`,

  5: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

PHẦN 5 — TỔNG KẾT & LỜI KHUYÊN

Tổng hợp lại toàn bộ lá số:
- Những điểm mạnh lớn của cuộc đời
- Những thử thách nghiệp duyên
- Bài học nhân sinh cần hiểu

Sau đó đưa ra lời khuyên theo tinh thần Phật giáo: sống thiện, buông chấp, tích phúc, tu tâm dưỡng tính, làm việc thiện.

Giọng văn nhẹ nhàng, mang tính khai mở nhận thức, không gây sợ hãi.`,
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
    const { hoTen = 'Bạn', nam, gioiTinh, namXem, laSoText, phan = 1, docs = '' } = body;

    const apiKey = ANTHROPIC_API_KEY;
    if (!apiKey) { setHeaders(res); return res.status(500).json({ error: 'Thiếu ANTHROPIC_API_KEY.' }); }
    if (!laSoText) { setHeaders(res); return res.status(400).json({ error: 'Không có dữ liệu lá số.' }); }

    const gioi = gioiTinh === 'nam' ? 'nam' : 'nữ';
    const ctx = `Lá số của: ${hoTen}, sinh năm ${nam}, ${gioi}, năm xem: ${namXem || new Date().getFullYear()}.\n\nDỮ LIỆU LÁ SỐ:\n${laSoText}`;

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
