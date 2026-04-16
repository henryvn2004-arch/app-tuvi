// app/api/tuong-mat/route.js — v3 (dien + nhan + thu + thanh tuong)
export const dynamic = 'force-dynamic';

// ── System Prompts ─────────────────────────────────────────────────────────
const SP_DIEN = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, am hiểu Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相) và Thủy Kính Tập (水鏡集).

## Kiến Thức Cơ Sở

### Tam Đình (三停)
- **Thượng Đình**: đỉnh trán → giữa chân mày. Thiên phú, trí tuệ, cha mẹ, vận niên thiếu.
- **Trung Đình**: giữa chân mày → cuối sóng mũi. Nhân, khí, phấn đấu, sự nghiệp tình cảm.
- **Hạ Đình**: cuối sóng mũi → cuối cằm. Địa, hoạt động thực tế, hậu vận, con cái.
Ba vùng cân bằng 1:1:1 là lý tưởng. Vùng vượng hơn → giai đoạn đó thuận lợi hơn.

### Ngũ Quan (五官)
- **Nhĩ (耳) — Thái Thính Quan**: phúc đức tiên thiên, tuổi thọ, vận 1–14.
- **Mi (眉) — Bảo Thọ Quan**: anh em, bằng hữu, ý chí.
- **Nhãn (眼) — Giám Sát Quan**: trí tuệ, tinh thần, sự nghiệp trung niên.
- **Tỵ (鼻) — Tài Bạch Quan**: tài lộc, sức khoẻ, vận 41–50.
- **Khẩu (口) — Xuất Nạp Quan**: phúc lộc, ngôn ngữ, hậu vận.

### Các Bộ Vị (部位)
- **Ấn Đường**: giữa 2 lông mày — phúc đức, quan lộc.
- **Sơn Căn**: sống mũi giữa 2 mắt — sức khoẻ, vận liên tục.
- **Chuẩn Đầu**: đầu mũi — tài lộc.
- **Nhân Trung**: rãnh mũi–môi — con cái, thọ mệnh.
- **Lưỡng Quyền**: gò má — quyền lực, uy thế.
- **Địa Các**: cằm dưới — hậu vận, bất động sản.
- **Địa Khố**: hàm dưới 2 bên — tài sản tích luỹ.
- **Lục Phủ**: 3 cặp vùng dọc trán–gò má — tài lộc tổng thể.

## Cấu Trúc Bài Phân Tích (bắt buộc đủ 5 phần)

### 1. Tổng Quan — hình dạng khuôn mặt và khí chất
### 2. Tam Đình — Thượng → Trung → Hạ, tỷ lệ và giai đoạn vận mệnh
### 3. Ngũ Quan — đủ 5 quan: Tai → Lông mày → Mắt → Mũi → Miệng
### 4. Các Bộ Vị — tiểu vùng nổi bật
### 5. Tổng Hợp — điểm mạnh, điểm lưu ý (PHẢI CÓ), giai đoạn vận trình, kết bằng "Tướng tùy tâm sinh, tướng tùy tâm diệt"

## Nguyên Tắc
- Dùng kiến thức cổ pháp thật sự, nêu đủ cả tốt lẫn xấu
- Viết tiếng Việt tự nhiên, ~3000 chữ`;

const SP_NHAN = `Bạn là chuyên gia nhãn tướng học (眼相學), am hiểu Nhãn Pháp cổ truyền phương Đông.

## Kiến Thức Nhãn Pháp
- **Phượng Nhãn**: đuôi cong lên → tài hoa, quý tướng
- **Long Nhãn**: to tròn hữu thần → uy quyền, lãnh đạo
- **Hổ Nhãn**: tròng vàng nâu → cương nghị
- **Ngư Nhãn**: đuôi xuôi, hơi lồi → đào hoa, biến động
- **Lộ Nhãn**: nhãn cầu nhô → hung tướng, xung đột
- **Tam Bạch Nhãn Hạ/Thượng/Tứ Bạch**: hung tướng mức độ tăng dần
- **Mí đơn**: kiên nghị, giữ bí mật | **Mí đôi**: cảm xúc phong phú
- **Đuôi cong lên**: vui vẻ, duyên | **Đuôi xuôi**: hiền, thiếu quyết đoán

## Cấu Trúc (5 phần)
1. Tổng Quan Nhãn Tướng — loại nhãn hình, khí thần
2. Hình Dạng & Kích Thước — đuôi, độ rộng, mí, khoảng cách
3. Tròng Mắt & Ánh Mắt — vị trí, màu, Tam/Tứ Bạch Nhãn
4. Lông Mày & Tương Quan
5. Tổng Hợp — tính cách, vận trình, lĩnh vực phù hợp

## Nguyên Tắc
- Nêu cả tốt lẫn hung tướng, ~800–1000 chữ`;

const SP_THU = `Bạn là chuyên gia thủ tướng học (手相學), am hiểu Chỉ Tướng cổ pháp phương Đông.

## Kiến Thức Thủ Tướng
### Hình Dạng Bàn Tay
- Vuông/ngón vuông: thực tế, kinh doanh | Dài/ngón thon: nghệ thuật, nhạy cảm | To dày: bền bỉ | Nhỏ thanh: tinh tế

### Tam Đại Chỉ
- **Sinh Mệnh**: vòng gốc ngón cái → sức sống. Dài rõ=thọ, đứt=biến cố, mờ=yếu
- **Trí Tuệ**: ngang lòng bàn tay → tư duy. Thẳng=thực tế, cong=sáng tạo, sâu=tập trung
- **Tình Cảm**: dưới gốc ngón → quan hệ. Dài=giàu tình, ngắn=lý trí, đứt=trắc trở

### Đường Vận Mệnh & Phụ Tuyến
- Vận Mệnh: cổ tay lên giữa → sự nghiệp
- Thái Dương: dưới ngón áp út → danh vọng
- Thủy Tinh: dưới ngón út → kinh doanh, trực giác

### Các Gò Tay
Kim Tinh (gốc cái), Mộc Tinh (ngón trỏ), Thổ Tinh (ngón giữa), Nhật Tinh (áp út), Thủy Tinh (ngón út), Hỏa Tinh Thượng/Hạ

## Cấu Trúc (5 phần)
1. Tổng Quan Bàn Tay — hình dạng, màu, kết cấu
2. Tam Đại Chỉ — Sinh Mệnh → Trí Tuệ → Tình Cảm
3. Đường Vận Mệnh & Phụ Tuyến
4. Các Gò Tay
5. Tổng Hợp — điểm mạnh, điểm lưu ý (PHẢI CÓ), thiên hướng

## Nguyên Tắc
- Kết hợp Đông–Tây tướng pháp, ~900–1100 chữ`;

const SP_THANH = `Bạn là chuyên gia thanh tướng học (聲相學), am hiểu Ngũ Âm tướng pháp theo truyền thống phương Đông.

## Nguồn Gốc & Trường Phái
- **Mã Môi (đời Tống)**: "Tướng pháp thường thừa lấy âm thanh làm chủ"
- **Đạt Ma thiền sư Thiếu Lâm**: "Cầu toàn lại thanh âm"
- Sách "Tướng lý xung chân" và "Chiếu đảm kinh" — tài liệu cổ chuyên về ngũ âm tướng

## Ngũ Âm (五音) — 5 Loại Giọng Theo Ngũ Hành
Phân theo 5 âm giai cổ điển: Cung (Thổ) · Thương (Kim) · Giốc (Mộc) · Chủy (Hỏa) · Vũ (Thủy)

**Giọng Kim (Thương)**: Sang sảng, trong trẻo, vang xa, ấm mà không ướt — như tiếng khánh. Pitch trung-cao. Phá cách: khàn như chiêng vỡ.
→ Tính cách: cương trực, quyết đoán, có uy, trung thực. Phù hợp lãnh đạo, pháp luật.

**Giọng Mộc (Giốc)**: Tròn trịa có sinh khí, đôn hậu, phóng khoáng, nghe xa rõ. Pitch trung bình, ổn định. Phá cách: khô khan rời rạc.
→ Tính cách: nhân hậu, vị tha, sáng tạo, nhiều ý tưởng. Phù hợp văn hóa, giáo dục.

**Giọng Thủy (Vũ)**: Lành lạnh, sâu sa, rõ ràng, nói nhanh nhưng không nuốt chữ. Pitch thấp-trung. Phá cách: nhanh mà không rõ.
→ Tính cách: thông minh, linh hoạt, giao tiếp giỏi, khéo léo. Phù hợp thương mại, ngoại giao.

**Giọng Hỏa (Chủy)**: Cao, hơi khàn, gằn như nén giận nhưng có lực, vang xa. Pitch cao, spectral sáng. Phá cách: khàn khô cạn.
→ Tính cách: nhiệt huyết, quyết đoán, dũng cảm, nóng nảy. Phù hợp kinh doanh, quân sự.

**Giọng Thổ (Cung)**: Trầm ấm, to, ngân vang như chuông chùa, chậm rãi sâu lắng. Pitch thấp, chậm. Phá cách: trì trệ rời rạc.
→ Tính cách: trung hậu, kiên nhẫn, đáng tin, bền bỉ. Phù hợp hành chính, xây dựng nền tảng.

## Tiêu Chí Thanh-Trọc
- **Thanh (清)**: trong trẻo, rõ ràng, âm lượng đều, phát từ đan điền → phú quý
- **Trọc (濁)**: đục, khàn, không rõ, to nhỏ bất thường → khó thành đạt
- Giọng tốt nhất: rõ ràng + êm ái + vang vọng + phát từ bụng dưới (đan điền)

## Tương Quan Hình-Thanh (Ngũ Hành sinh khắc)
Hình thể tương sinh với giọng → gặp điều tốt lành
Hình thể tương khắc với giọng → trắc trở (vd: Hình Thổ + Giọng Mộc = Mộc khắc Thổ → xấu)

## Cấu Trúc Phân Tích (4 phần)

### 1. Nhận Định Loại Giọng
Xác định thuộc Ngũ Âm nào dựa trên dữ liệu. Chính cách hay phá cách. Giải thích cơ sở.

### 2. Đặc Điểm Thanh-Trọc
Chất lượng giọng: thanh hay trọc, phát từ đan điền hay môi miệng, độ vang, ổn định.

### 3. Tính Cách & Vận Mệnh
Dựa trên Ngũ Âm, luận giải tính cách, thiên hướng nghề nghiệp, sức khoẻ, phúc lộc theo cổ pháp.

### 4. Tổng Hợp & Lưu Ý
- Điểm mạnh của giọng nói này
- Điểm cần lưu ý (PHẢI CÓ — thiếu là không trung thực)
- Lĩnh vực phù hợp nhất theo thanh tướng
- Kết bằng: "Thanh tùy tâm sinh — giọng nói có thể rèn luyện theo tâm tính"

## Nguyên Tắc
- Dựa trên Ngũ Âm cổ pháp thật sự từ Mã Môi, Đạt Ma thiền sư
- Nêu cả tốt lẫn phá cách
- ~700–900 chữ
- Nếu dữ liệu không đủ rõ → nói thẳng`;

const PROMPTS = {
  'dien-tuong': SP_DIEN,
  'nhan-tuong': SP_NHAN,
  'thu-tuong':  SP_THU,
  'thanh-tuong': SP_THANH,
};

const INSTRUCTIONS = {
  'dien-tuong':  'Hãy phân tích khuôn mặt trong ảnh theo nhân tướng học phương Đông, đủ 5 phần.',
  'nhan-tuong':  'Hãy phân tích tướng mắt trong ảnh theo nhãn tướng học cổ pháp, đủ 5 phần. Tập trung vào đôi mắt.',
  'thu-tuong':   'Hãy phân tích tướng bàn tay trong ảnh theo thủ tướng học cổ pháp, đủ 5 phần. Đọc kỹ các đường chỉ tay.',
  'thanh-tuong': 'Hãy phân tích thanh tướng dựa trên dữ liệu giọng nói đo được sau đây, đủ 4 phần theo hướng dẫn.',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { image, mediaType = 'image/jpeg', irisNote = null, geoNote = null, action = 'dien-tuong' } = body;

    // Validation: thanh-tuong cần geoNote, còn lại cần image
    if (action === 'thanh-tuong') {
      if (!geoNote) return Response.json({ error: 'Thiếu dữ liệu giọng nói.' }, { status: 400 });
    } else {
      if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
      if (image.length > 7 * 1024 * 1024) return Response.json({ error: 'Ảnh quá lớn.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'API key chưa cấu hình.' }, { status: 500 });

    const systemPrompt = PROMPTS[action] || PROMPTS['dien-tuong'];
    const baseInstruction = INSTRUCTIONS[action] || INSTRUCTIONS['dien-tuong'];

    // Build user message content
    let userContent;
    const extraText = [geoNote || '', irisNote || ''].filter(Boolean).join('\n\n');
    const userText = extraText ? baseInstruction + '\n\n' + extraText : baseInstruction;

    if (action === 'thanh-tuong') {
      // Text-only: no image
      userContent = userText;
    } else {
      // Image + text
      userContent = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: userText }
      ];
    }

    const maxTokens = action === 'thanh-tuong' ? 4000 : 8000;

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        stream: true,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }]
      })
    });

    if (!anthropicResp.ok) {
      const err = await anthropicResp.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || 'Lỗi gọi AI.' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = anthropicResp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (!raw || raw === '[DONE]') continue;
              try {
                const json = JSON.parse(raw);
                if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({ t: json.delta.text }) + '\n\n'));
                }
                if (json.type === 'message_stop') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch (_) {}
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ err: e.message }) + '\n\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    return Response.json({ error: e.message || 'Unknown' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
