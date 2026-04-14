// app/api/tuong-mat/route.js — Next.js App Router Route Handler
export const maxDuration = 30;

const SYSTEM_PROMPT = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, kết hợp giữa Ma Y Thần Tướng cổ pháp và Mặt Học hiện đại.

Khi phân tích khuôn mặt, hãy:
1. Nhận xét từng bộ phận theo thứ tự: tổng quan khuôn mặt → trán → lông mày → mắt → mũi → miệng/môi → cằm → tai (nếu nhìn thấy)
2. Liên kết mỗi đặc điểm với ý nghĩa nhân tướng học cụ thể
3. Tổng hợp nhận xét về: tính cách, tài năng nổi bật, lĩnh vực phù hợp, điểm cần chú ý
4. Viết bằng tiếng Việt, giọng điệu tích cực nhưng trung thực, không quá khen hay quá chê
5. Kết thúc với lưu ý "Tướng tùy tâm sinh" — nhân tướng chỉ là xu hướng, không phải định mệnh cố định

Định dạng output bằng Markdown với các heading rõ ràng.
Không đề cập đến thông tin sức khoẻ cụ thể hay dự đoán tương lai chính xác.
Nếu ảnh không có khuôn mặt rõ ràng, hãy nói rõ không thể phân tích.`;

export async function POST(request) {
  try {
    const { image, mediaType = 'image/jpeg' } = await request.json();

    if (!image) {
      return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
    }

    // Validate size (~5MB max base64)
    if (image.length > 7 * 1024 * 1024) {
      return Response.json({ error: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key chưa được cấu hình.' }, { status: 500 });
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image }
            },
            {
              type: 'text',
              text: 'Hãy phân tích khuôn mặt trong ảnh này theo nhân tướng học phương Đông. Chỉ phân tích nếu nhìn thấy khuôn mặt rõ ràng.'
            }
          ]
        }]
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return Response.json(
        { error: err.error?.message || 'Lỗi gọi AI. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text || '';
    if (!text) return Response.json({ error: 'AI không trả về kết quả.' }, { status: 500 });

    return Response.json({ result: text });

  } catch (e) {
    console.error('tuong-mat error:', e);
    return Response.json({ error: 'Lỗi xử lý: ' + (e.message || 'Unknown') }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
