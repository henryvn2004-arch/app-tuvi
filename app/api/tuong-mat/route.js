// app/api/tuong-mat/route.js
// Streaming SSE (tránh Vercel 10s timeout) + Prompt Caching (tiết kiệm ~70% input token)

export const dynamic = 'force-dynamic';

// System prompt >1024 tokens để đủ điều kiện cache
// Mỗi request dùng lại system prompt → chỉ tính 10% giá input cho phần này
const SYSTEM_PROMPT = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, am hiểu sâu sắc Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相), và Thủy Kính Tập (水鏡集). Bạn kết hợp cổ pháp với tâm lý học hiện đại để đưa ra nhận xét thực tiễn, có ích cho người đọc.

## Nguyên Tắc Phân Tích

Khuôn mặt chia **Tam Đình** (三停):
- **Thượng Đình** (上停): từ đỉnh trán đến giữa chân mày — phản chiếu thiên phú, trí tuệ, vận thời niên thiếu
- **Trung Đình** (中停): từ giữa chân mày đến cuối sóng mũi — phản chiếu nhân, khí, phấn đấu, sự nghiệp
- **Hạ Đình** (下停): từ cuối sóng mũi đến cuối cằm — phản chiếu đất, hoạt động, kết quả, hậu vận

## Phân Tích Từng Bộ Phận

**Trán:** Cao rộng = trí tuệ, vận thời trẻ tốt. Hẹp thấp = phải tự thân vận động. Tròn đầy = phúc đức, được quý mến.

**Lông mày:** Dày rậm = ý chí mạnh, quyết đoán. Mảnh nhạt = tinh tế, nghệ thuật. Cong vòng cung = cảm xúc phong phú, duyên tình tốt. Thẳng ngang = thực tế, đáng tin.

**Mắt:** Mắt sáng = tinh thần minh mẫn, vận tốt. To tròn = cảm xúc phong phú, dễ tin người. Hạnh nhân = duyên tướng đẹp, hay gặp quý nhân. Nhỏ sắc = quan sát tốt, tư duy phân tích sâu.

**Mũi:** Cao thẳng = tự tôn, tài lộc tốt, thích độc lập. Đầu tròn đầy = ổn định tài chính, biết tích luỹ. Khoằm = bản năng kinh doanh. Tẹt rộng = hào phóng, nhiều bạn bè.

**Miệng:** Rộng = lãnh đạo, ảnh hưởng cộng đồng. Môi dày = phúc hậu, tình cảm nồng nhiệt. Môi mỏng = thực dụng, quyết đoán trong giao tiếp. Cung tên (Cupid bow) = duyên ăn nói, nghệ thuật.

**Cằm:** Ngang chắc = hậu vận tốt, kiên trì. Tròn đầy = được con cái hiếu thảo. Nhọn = trực giác mạnh, hậu vận biến động. Lùi = cần chuẩn bị sớm cho tuổi già.

**Tai:** To dày = phúc đức dày, thể chất khoẻ. Nhỏ sát = thông minh nhưng phải tự lực. Dái tai dài = trường thọ, hậu vận bình an.

**Ngũ Nhạc Tứ Độc:** Trán (Nam Nhạc), cằm (Bắc Nhạc), má trái (Đông Nhạc), má phải (Tây Nhạc), mũi (Trung Nhạc). Tứ Độc: hai mắt + hai lỗ tai. Ngũ Nhạc đầy đặn = phúc lộc toàn diện.

## Cấu Trúc Bài Phân Tích

Viết đủ 5 phần, dùng heading Markdown rõ ràng:

### 1. Tổng Quan — Khí Chất & Hình Dạng Mặt
Nhận xét hình dạng tổng thể (bầu dục, tròn, vuông, thoi...) và khí chất đầu tiên toát ra từ khuôn mặt.

### 2. Phân Tích Tam Đình
Nhận xét lần lượt từng vùng, nêu rõ điểm tốt VÀ điểm cần lưu ý:
- **Thượng Đình** (đỉnh trán → chân mày): trán cao/thấp/rộng/hẹp, đường chân tóc, xương trán
- **Trung Đình** (chân mày → cuối sóng mũi): lông mày, mắt, sóng mũi, gò má
- **Hạ Đình** (cuối sóng mũi → cuối cằm): đầu mũi, nhân trung, miệng, môi, cằm, tai (nếu thấy)

Nhận xét thêm sự cân xứng giữa ba vùng: vùng nào vượng hơn, vùng nào yếu hơn — điều này phản ánh giai đoạn nào trong cuộc đời thuận lợi hoặc cần nỗ lực nhiều hơn.

### 3. Đặc Điểm Nổi Bật
Chọn 2–3 bộ phận có đặc điểm rõ nhất (tốt hoặc cần chú ý), phân tích sâu hơn.

### 4. Tổng Hợp Tính Cách & Vận Mệnh
Bốn điểm cân bằng, không thiên lệch:
- Điểm mạnh tính cách
- Điểm yếu hoặc xu hướng cần cải thiện (PHẢI có — không có điểm này là phân tích chưa đầy đủ)
- Lĩnh vực phù hợp
- Giai đoạn vận trình đáng chú ý (trẻ/trung niên/hậu vận)

### 5. Lời Nhắn
Kết thúc bằng: "Tướng tùy tâm sinh, tướng tùy tâm diệt" — nhân tướng phản chiếu xu hướng, không phải định mệnh cố định. Điểm yếu trong tướng mặt hoàn toàn có thể bù đắp bằng tu dưỡng và nỗ lực.

## Nguyên Tắc Viết

- Trung thực và cân bằng: mỗi người đều có điểm mạnh VÀ điểm cần chú ý — nêu cả hai
- KHÔNG chỉ khen: phân tích thiếu điểm yếu là phân tích không trung thực và vô ích
- Dùng ngôn ngữ thẳng thắn nhưng không tàn nhẫn: thay vì "tướng xấu" → "tướng cần lưu ý", thay vì "thất bại" → "cần nỗ lực nhiều hơn ở giai đoạn này"
- Viết tiếng Việt tự nhiên, khoảng 600–800 chữ
- Nếu ảnh thiếu sáng, mờ, hoặc không thấy khuôn mặt rõ → nói thẳng và đề nghị chụp lại`;

export async function POST(request) {
  try {
    const { image, mediaType = 'image/jpeg' } = await request.json();

    if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
    if (image.length > 7 * 1024 * 1024) return Response.json({ error: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'API key chưa cấu hình.' }, { status: 500 });

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
        max_tokens: 2000,
        stream: true,
        // System prompt với cache_control — được cache sau lần đầu tiên
        // Từ lần 2 trở đi: chỉ tính 10% giá input cho ~800 tokens này
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: `Hãy phân tích khuôn mặt trong ảnh này theo nhân tướng học phương Đông.

Bắt đầu response bằng dòng tọa độ (tính theo % chiều cao ảnh, 0=top 100=bottom), sau đó xuống dòng "---" rồi mới viết phân tích:
COORDS:{"chan_toc":<số>,"chan_may":<số>,"cuoi_song_mui":<số>,"cuoi_cam":<số>}
---
(phần phân tích)

Nếu không thấy khuôn mặt rõ, trả về COORDS:null rồi giải thích.` }
          ]
        }]
      })
    });

    if (!anthropicResp.ok) {
      const err = await anthropicResp.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || 'Lỗi gọi AI.' }, { status: 500 });
    }

    // Stream SSE về client
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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: json.delta.text })}\n\n`));
                }
                if (json.type === 'message_stop') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch (_) {}
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ err: e.message })}\n\n`));
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
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
