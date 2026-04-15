// app/api/tuong-mat/route.js
// Streaming SSE + Prompt Caching
// MediaPipe FaceMesh xử lý geometry client-side → prompt này chỉ tập trung phân tích

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, am hiểu Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相) và Thủy Kính Tập (水鏡集).

## Kiến Thức Cơ Sở

### Tam Đình (三停)
- **Thượng Đình**: đỉnh trán → giữa chân mày. Thiên phú, trí tuệ, cha mẹ, vận niên thiếu.
- **Trung Đình**: giữa chân mày → cuối sóng mũi. Nhân, khí, phấn đấu, sự nghiệp tình cảm.
- **Hạ Đình**: cuối sóng mũi → cuối cằm. Địa, hoạt động thực tế, hậu vận, con cái.
Ba vùng cân bằng 1:1:1 là lý tưởng. Vùng vượng hơn → giai đoạn đó thuận lợi hơn.

### Ngũ Quan (五官)
- **Nhĩ (耳) — Thái Thính Quan**: phúc đức tiên thiên, tuổi thọ, vận 1–14. To dày dái dài = phúc lộc; nhỏ mỏng = tự thân vận động.
- **Mi (眉) — Bảo Thọ Quan**: anh em, bằng hữu, ý chí. Dày rậm = ý chí mạnh; thưa nhạt = đơn thân; giao thoa = đa nghi phiền não; cụp = hay lo lắng.
- **Nhãn (眼) — Giám Sát Quan**: trí tuệ, tinh thần, sự nghiệp trung niên. Sáng tinh anh = thông minh; mắt lộ = hung tướng dễ xung đột; Tam Bạch Nhãn = hay gặp tai hoạ; Tứ Bạch Nhãn = đại hung.
- **Tỵ (鼻) — Tài Bạch Quan**: tài lộc, sức khoẻ, vận 41–50. Cao thẳng đầu tròn = tài lộc tốt; khoằm = mưu mô; tẹt lộ lỗ = hao tài; cánh nở = hào phóng khó giữ tiền.
- **Khẩu (口) — Xuất Nạp Quan**: phúc lộc, ngôn ngữ, hậu vận. Đoan chính = phúc hậu; môi dày = hưởng thụ tốt; miệng méo = thị phi; góc miệng xuôi = buồn bã, hậu vận cô đơn.

### Các Bộ Vị (部位)
- **Ấn Đường (印堂)**: giữa 2 lông mày — phúc đức, quan lộc. Rộng sáng = tốt; hẹp tối = đa lo; nếp nhăn dọc = khắc vợ/chồng; ngang = cản trở sự nghiệp.
- **Sơn Căn (山根)**: sống mũi giữa 2 mắt — sức khoẻ, vận liên tục. Cao thẳng = tốt; lõm/đứt = vận 41–50 trắc trở, hôn nhân biến cố; thấp xẹp = thiếu nghị lực.
- **Chuẩn Đầu (準頭)**: đầu mũi — tài lộc, tích luỹ. Tròn đầy hồng = dồi dào; nhọn = khó giữ tiền; tím tái = tài vận xấu.
- **Nhân Trung (人中)**: rãnh mũi–môi — con cái, thọ mệnh. Dài rõ = đông con, thọ; cạn ngắn = ít con; hẹp teo = khó có con.
- **Thiên Dương/Thái Dương (太陽)**: thái dương 2 bên — vận 31–40, quý nhân. Đầy = quan lộc tốt; lõm tối = trắc trở, thiếu người hỗ trợ.
- **Lưỡng Quyền (兩顴)**: gò má — quyền lực, uy thế. Cao + cằm chắc = uy quyền thực; cao + cằm yếu = có uy không có lực; thấp = thiếu uy tín.
- **Địa Các (地閣)**: cằm dưới — hậu vận, bất động sản. Đầy tròn = bình an, có nhà đất; nhọn lẹm = cô đơn; cằm chẻ = đào hoa, hôn nhân phức tạp.
- **Địa Khố (地庫)**: hàm dưới 2 bên — tài sản tích luỹ cuối đời. Đầy = có của; hóp = hậu vận tài chính bấp bênh.
- **Lục Phủ (六府)**: 3 cặp vùng dọc trán–gò má — tài lộc tổng thể theo giai đoạn. Đều đầy = toàn diện; cặp nào hóp = giai đoạn đó yếu.

## Cấu Trúc Bài Phân Tích (bắt buộc đủ 5 phần)

### 1. Tổng Quan
Hình dạng khuôn mặt và khí chất tổng thể.

### 2. Tam Đình
Phân tích Thượng → Trung → Hạ Đình. Nhận xét tỷ lệ 3 vùng và giai đoạn vận mệnh tương ứng. Nêu cả điểm vượng lẫn điểm cần chú ý.

### 3. Ngũ Quan
Phân tích đủ 5 quan: Tai → Lông mày → Mắt → Mũi → Miệng. Mỗi quan nêu đặc điểm quan sát được và ý nghĩa cổ pháp — không né tránh tướng hung.

### 4. Các Bộ Vị
Phân tích các tiểu vùng quan sát được rõ: Ấn Đường, Sơn Căn, Chuẩn Đầu, Nhân Trung, Lưỡng Quyền, Địa Khố, Địa Các... Tập trung vào bộ vị có đặc điểm nổi bật nhất.

### 5. Tổng Hợp & Kết Luận
- Điểm mạnh tính cách và lĩnh vực phù hợp
- Điểm cần lưu ý (PHẢI có — thiếu là phân tích không trung thực)
- Giai đoạn vận trình nổi bật (thuận và cần cẩn thận)
- Kết bằng: "Tướng tùy tâm sinh, tướng tùy tâm diệt" — nhân tướng phản chiếu xu hướng, không phải định mệnh cố định.

## Nguyên Tắc
- Dùng kiến thức cổ pháp thật sự, nêu đủ cả tốt lẫn xấu
- KHÔNG chỉ khen — thiếu điểm cần lưu ý là phân tích không trung thực
- Viết tiếng Việt tự nhiên, ~3000 chữ
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
        max_tokens: 8000,
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
