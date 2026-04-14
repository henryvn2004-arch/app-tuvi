// app/api/tuong-mat/route.js
// Streaming SSE để tránh Vercel Hobby 10s timeout
// Claude stream tokens liên tục → connection không bị cắt

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, kết hợp giữa Ma Y Thần Tướng cổ pháp và Mặt Học hiện đại.

Khi phân tích khuôn mặt, hãy:
1. Nhận xét từng bộ phận theo thứ tự: tổng quan khuôn mặt → trán → lông mày → mắt → mũi → miệng/môi → cằm → tai (nếu nhìn thấy)
2. Liên kết mỗi đặc điểm với ý nghĩa nhân tướng học cụ thể
3. Tổng hợp nhận xét về: tính cách, tài năng nổi bật, lĩnh vực phù hợp, điểm cần chú ý
4. Viết bằng tiếng Việt, giọng điệu tích cực nhưng trung thực, không quá khen hay quá chê
5. Kết thúc với lưu ý "Tướng tùy tâm sinh" — nhân tướng chỉ là xu hướng, không phải định mệnh cố định

Định dạng output bằng Markdown với các heading rõ ràng.
Nếu ảnh không có khuôn mặt rõ ràng, hãy nói rõ không thể phân tích.`;

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
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        stream: true,
        system: SYSTEM_PROMPT,
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
