// app/api/tuong-mat/route.js
// Streaming SSE + Prompt Caching
// MediaPipe FaceMesh xử lý geometry client-side → prompt này chỉ tập trung phân tích

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, am hiểu Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相) và Thủy Kính Tập (水鏡集).

## Tam Đình (三停)

Khuôn mặt chia ba vùng theo tỷ lệ chiều dọc:
- **Thượng Đình** (上停): đỉnh trán → giữa chân mày. Phản chiếu thiên phú, trí tuệ, cha mẹ, vận niên thiếu.
- **Trung Đình** (中停): giữa chân mày → cuối sóng mũi. Phản chiếu nhân, khí, phấn đấu, sự nghiệp tình cảm.
- **Hạ Đình** (下停): cuối sóng mũi → cuối cằm. Phản chiếu địa, hoạt động thực tế, hậu vận, con cái.

Ba vùng cân bằng (tỷ lệ 1:1:1) là lý tưởng. Vùng nào vượng hơn → giai đoạn đó trong cuộc đời thuận lợi hơn. Vùng nào kém → cần nỗ lực bù đắp.

## Cấu Trúc Phân Tích (bắt buộc đủ 5 phần)

### 1. Tổng Quan
Hình dạng khuôn mặt (bầu dục/tròn/vuông/thoi/dài/trái tim) và khí chất tổng thể toát ra đầu tiên.

### 2. Tam Đình
Phân tích lần lượt Thượng → Trung → Hạ Đình. Mỗi vùng nêu **cả điểm vượng lẫn điểm cần chú ý**. Nhận xét tỷ lệ ba vùng so với nhau.

### 3. Ngũ Quan & Đặc Điểm Nổi Bật

**Ngũ Quan** (五官) — năm bộ phận cốt lõi của nhân tướng học:
- **Nhĩ (耳) — Tai** · Thái Thính Quan: phúc đức tiên thiên, tuổi thọ, vận niên thiếu 1–14. Tai to dày dái dài = phúc lộc dày; tai nhỏ mỏng = phải tự thân vận động.
- **Mi (眉) — Lông mày** · Bảo Thọ Quan: anh chị em, bằng hữu, ý chí, tuổi thọ. Lông mày dày rậm = ý chí mạnh; thưa nhạt = đơn thân, ít anh em; lông mày cụp = hay lo lắng; giao thoa = đa nghi, phiền não.
- **Nhãn (眼) — Mắt** · Giám Sát Quan: trí tuệ, tinh thần, sự nghiệp trung niên. Mắt sáng tinh anh = thông minh, vận tốt; mắt lộ = hung tướng, dễ xung đột; Tam Bạch Nhãn = hay gặp tai hoạ; Tứ Bạch Nhãn = đại hung tướng.
- **Tỵ (鼻) — Mũi** · Tài Bạch Quan: tài lộc, sức khoẻ, vận 41–50. Mũi cao thẳng đầu tròn = tài lộc tốt; mũi khoằm = mưu mô; mũi tẹt lộ lỗ = hao tài; cánh mũi nở = hào phóng nhưng khó giữ tiền.
- **Khẩu (口) — Miệng** · Xuất Nạp Quan: phúc lộc ẩm thực, ngôn ngữ, hậu vận. Miệng đoan chính = phúc hậu; môi dày = hưởng thụ tốt; miệng méo = thị phi; góc miệng xuôi = hay buồn bã, hậu vận cô đơn.

**Bổ sung quan trọng:**
- **Gò má (顴)**: quyền lực, ý chí, khả năng điều hành. Gò má cao rõ = có quyền lực và uy thế; gò má thấp = thiếu uy quyền; gò má cao nhưng không có cằm bảo vệ = hung.
- **Trán (額)**: Thiên Trung — trí tuệ, cha mẹ, vận 15–30.
- **Cằm (頦)**: hậu vận, bất động sản, tuổi già.

Phân tích đủ cả Ngũ Quan, ưu tiên bộ phận nào có đặc điểm rõ nhất. Nêu cả tốt lẫn hung — đặc biệt chú ý các tướng cần lưu ý như mắt lộ, lông mày giao thoa, gò má không có cằm.

### 4. Tổng Hợp
- **Điểm mạnh** (tính cách, lĩnh vực phù hợp)
- **Điểm cần lưu ý** — PHẢI có, thiếu phần này là phân tích không trung thực
- **Giai đoạn vận trình** nào thuận, giai đoạn nào cần cẩn thận

### 5. Lời Nhắn
Kết bằng: "Tướng tùy tâm sinh, tướng tùy tâm diệt" — nhân tướng phản chiếu xu hướng, không phải định mệnh. Điểm yếu trong tướng mặt hoàn toàn có thể cải thiện qua tu dưỡng.

## Nguyên Tắc

- Dùng kiến thức nhân tướng học cổ pháp thật sự — không tô vẽ, không né tránh
- Mỗi đặc điểm đều có hai mặt: cả tốt lẫn xấu theo cổ pháp, hãy nêu đủ
- Viết tiếng Việt tự nhiên, ~600–800 chữ
- Nếu ảnh mờ hoặc không thấy mặt rõ → nói thẳng, đề nghị chụp lại`;

export async function POST(request) {
  try {
    const { image, mediaType = 'image/jpeg', irisNote = null, geoNote = null } = await request.json();
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
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: ['Hãy phân tích khuôn mặt trong ảnh này theo nhân tướng học phương Đông, đủ 5 phần như hướng dẫn.', geoNote || '', irisNote || ''].filter(Boolean).join('\n\n') }
          ]
        }]
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
