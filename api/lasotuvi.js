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

Thực hiện PHẦN 1 — TỔNG QUAN LÁ SỐ (~400-500 từ).
Trình bày: bảng tóm tắt + đoạn văn giải thích.

## Bảng PRE-CHECK
| Mục | Kết quả | Đánh giá |
|-----|---------|---------|
| Thuận/Nghịch lý | ... | ... |
| Ngũ hành chuỗi | ... | ... |
| Mệnh vs Cục | ... | ... |
| Chính tinh Mệnh | ... | ... |
| Cung Phúc Đức | ... | ... |

## Khí chất & Tinh hệ
Dựa trên Lục Thập Hoa Giáp, viết 1 đoạn văn ~200 từ về bản chất, khí chất, ưu khuyết cố hữu của tinh hệ này.

## Cách cục nổi bật
Liệt kê ngắn gọn (nếu có).`,

  2: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

Thực hiện PHẦN 2 — LUẬN GIẢI 12 CUNG (~400-500 từ).
Trình bày: bảng tóm tắt 12 cung + đoạn văn phân tích 3 cung quan trọng nhất.

## Bảng 12 Cung
| Cung | Chính tinh | Đánh giá nhanh |
|------|-----------|----------------|
(liệt kê đủ 12 cung, đánh giá 1-3 từ: Rất tốt / Tốt / Trung / Kém / Xấu)

## Phân tích chi tiết 3 cung quan trọng nhất
Chọn 3 cung ảnh hưởng lớn nhất → mỗi cung 1 đoạn ngắn ~50 từ, luận hệ thống 4 cung.`,

  3: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

Thực hiện PHẦN 3 — ĐẠI VẬN TOÀN ĐỜI (~400-500 từ).
Trình bày: bảng scoring tất cả vận + đoạn văn luận 3 vận đáng chú ý nhất.

## Bảng Đại Vận
| Vận | Tuổi | Cung | Thiên Thời | Địa Lợi | Nhân Hòa | Tổng | Flag |
|-----|------|------|-----------|---------|---------|------|------|
(chạy đủ scoring engine cho từng vận theo system prompt)

## Luận 3 vận đáng chú ý
Chọn 3 vận quan trọng nhất (tốt nhất hoặc xấu nhất) → mỗi vận 1 đoạn ~60 từ, kết hợp Lục Thập Hoa Giáp.`,

  4: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

Thực hiện PHẦN 4 — VẬN HIỆN TẠI & SẮP TỚI (~400-500 từ).
Trình bày: bảng tóm tắt + đoạn văn phân tích chi tiết.

## Bảng Vận Đang Đi
| Mục | Chi tiết | Đánh giá |
|-----|---------|---------|
| Đại vận hiện tại | ... | ... |
| Tiểu hạn năm xem | ... | ... |
| Lưu Thái Tuế | ... | ... |
| Sao lưu động đáng chú ý | ... | ... |

## Phân tích chi tiết
Viết 1 đoạn văn ~250 từ về vận đang đi: cơ hội, thách thức, khuyến nghị hành động cụ thể.`,

  5: (ctx, docs) => `${ctx}

=== TÀI LIỆU THAM KHẢO ===
${docs}

Thực hiện PHẦN 5 — TỔNG KẾT (~400-500 từ).
Trình bày: bảng so sánh + đoạn văn tổng kết.

## Bảng Tổng Kết Vận Trình
| Giai đoạn | Tuổi | Tính chất | Khuyến nghị |
|-----------|------|-----------|------------|
| Tốt nhất | ... | ... | ... |
| Khó nhất | ... | ... | ... |
| Bước ngoặt | ... | ... | ... |

## Tổng kết cuộc đời
Viết 1 đoạn văn ~250 từ theo lối kể chuyện: vận trình tổng thể, điểm sáng, thách thức lớn, lời khuyên sống.`,
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
    const body = req.body;
    const { hoTen = 'Bạn', nam, gioiTinh, namXem, laSoText, phan = 1, docs = '' } = body;

    const apiKey = ANTHROPIC_API_KEY;
    if (!apiKey) { setHeaders(res); return res.status(500).json({ error: 'Thiếu ANTHROPIC_API_KEY.' }); }
    if (!laSoText) setHeaders(res); return res.status(400).json({ error: 'Không có dữ liệu lá số.' });

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
