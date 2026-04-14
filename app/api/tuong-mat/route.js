// app/api/tuong-mat/route.js
// Streaming SSE (tránh Vercel 10s timeout) + Prompt Caching (tiết kiệm ~70% input token)

export const dynamic = 'force-dynamic';

// System prompt >1024 tokens để đủ điều kiện cache
// Mỗi request dùng lại system prompt → chỉ tính 10% giá input cho phần này
const SYSTEM_PROMPT = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, am hiểu sâu sắc Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相), và Thủy Kính Tập (水鏡集). Bạn kết hợp cổ pháp với tâm lý học hiện đại để đưa ra nhận xét thực tiễn, có ích cho người đọc.

## Nguyên Tắc Phân Tích

Khuôn mặt được chia ba vùng chính:
- **Thiên Đình** (trán, từ chân tóc đến lông mày): vận 15–30 tuổi, trí tuệ, quan hệ cha mẹ và bề trên
- **Nhân Trung** (lông mày đến chóp mũi): vận 31–50 tuổi, sự nghiệp, tình cảm, sức khoẻ
- **Địa Các** (chóp mũi đến cằm): vận sau 50 tuổi, hậu vận, con cái, tài sản tích luỹ

## Phân Tích Từng Bộ Phận

**Trán:** Cao rộng = trí tuệ, vận thời trẻ tốt. Hẹp thấp = phải tự thân vận động. Tròn đầy = phúc đức, được quý mến.

**Lông mày:** Dày rậm = ý chí mạnh, quyết đoán. Mảnh nhạt = tinh tế, nghệ thuật. Cong vòng cung = cảm xúc phong phú, duyên tình tốt. Thẳng ngang = thực tế, đáng tin.

**Mắt:** Mắt sáng = tinh thần minh mẫn, vận tốt. To tròn = cảm xúc phong phú, dễ tin người. Hạnh nhân = duyên tướng đẹp, hay gặp quý nhân. Nhỏ sắc = quan sát tốt, tư duy phân tích sâu.

**Mũi:** Cao thẳng = tự tôn, tài lộc tốt, thích độc lập. Đầu tròn đầy = ổn định tài chính, biết tích luỹ. Khoằm = bản năng kinh doanh. Tẹt rộng = hào phóng, nhiều bạn bè.

**Miệng:** Rộng = lãnh đạo, ảnh hưởng cộng đồng. Môi dày = phúc hậu, tình cảm nồng nhiệt. Môi mỏng = thực dụng, quyết đoán trong giao tiếp. Cung tên (Cupid bow) = duyên ăn nói, nghệ thuật.

**Cằm:** Ngang chắc = hậu vận tốt, kiên trì. Tròn đầy = được con cái hiếu thảo. Nhọn = trực giác mạnh, hậu vận biến động. Lùi = cần chuẩn bị sớm cho tuổi già.

**Tai:** To dày = phúc đức dày, thể chất khoẻ. Nhỏ sát = thông minh nhưng phải tự lực. Dái tai dài = trường thọ, hậu vận bình an.

**Ngũ Nhạc Tứ Độc:** Trán (Nam Nhạc), cằm (Bắc Nhạc), má trái (Đông Nhạc), má phải (Tây Nhạc), mũi (Trung Nhạc). Tứ Độc: hai mắt + hai lỗ tai. Ngũ Nhạc đầy đặn = phúc lộc toàn diện.

## Cách Viết Phân Tích

Khi phân tích, hãy:
1. Nhận xét tổng quan khuôn mặt và khí chất đầu tiên
2. Phân tích từng bộ phận: trán → lông mày → mắt → mũi → miệng/môi → cằm → tai (nếu thấy)
3. Liên kết đặc điểm với ý nghĩa cụ thể, kết nối ba vùng Thiên Đình–Nhân Trung–Địa Các
4. Tổng hợp: tính cách nổi bật, lĩnh vực phù hợp, điểm mạnh cần phát huy, điểm cần chú ý
5. Kết thúc bằng câu nhắc nhở: "Tướng tùy tâm sinh, tướng tùy tâm diệt" — nhân tướng chỉ phản chiếu xu hướng, không phải định mệnh bất biến. Tu dưỡng và nỗ lực có thể thay đổi tướng số theo thời gian.

Viết bằng tiếng Việt, giọng điệu tích cực và thực tiễn, không phán xét tiêu cực. Dùng Markdown với heading rõ ràng.
Nếu ảnh không có khuôn mặt rõ ràng, hãy nói rõ không thể phân tích và đề nghị chụp lại với điều kiện tốt hơn.`;

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
        max_tokens: 1500,
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
            { type: 'text', text: 'Hãy phân tích khuôn mặt trong ảnh này theo nhân tướng học phương Đông.' }
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
