// _patches/edge-tts-clip.deno.ts
// ============================================================
// Sinh GIỌNG ĐỌC cho từng cảnh của video ngắn (track dựng clip 9:16).
//
// 🔑 VÌ SAO LÀ HÀM RIÊNG, KHÔNG SỬA `tts` ĐANG CHẠY:
// hàm `tts` hiện có PATCH thẳng vào `van_dap?id=eq.<id>` và ghi kết quả vào cột
// `noi_dung` của bảng đó. Nó phục vụ pipeline vấn đáp chạy hằng ngày (144 file
// đã sinh, mới nhất hôm nay). Nhét thêm nhánh cho video vào đó là đụng đường
// sản xuất đang sống để đổi lấy một tiện lợi — đúng lớp rủi ro mà repo này đã
// trả giá nhiều lần. Hàm mới dùng CHUNG token Vbee (biến môi trường đã có sẵn
// trên project) nhưng KHÔNG chạm bảng nào của pipeline cũ.
//
// KHÁC BIỆT CỐT LÕI so với `tts`: hàm kia gộp cả bài thành MỘT đoạn đọc; ở đây
// mỗi lượt gọi là MỘT CẢNH. Nhờ vậy đo được thời lượng từng cảnh → Remotion
// tính đúng số khung hình → hình khớp tiếng, và phụ đề hiện đúng nhịp.
//
// 🔐 XÁC THỰC — hai lớp, lớp thứ hai hiện CHƯA BẬT:
//   1. `verify_jwt: true` (khác các hàm cùng project vốn để false): phải có key
//      Supabase hợp lệ mới gọi được. Hàm này tiêu quota Vbee thật.
//   2. `CLIP_TTS_SECRET` — nếu biến này được khai thì BẮT BUỘC gửi kèm header
//      `x-clip-secret` khớp. Chưa khai thì bỏ qua lớp này.
//
// ⚠️ Lớp 1 một mình là CHƯA ĐỦ: anon key vốn công khai (nằm trong mã client),
// nên ai đọc được nó đều gọi được hàm này. Trần 600 ký tự/lượt hạn chế thiệt
// hại, nhưng cách siết đúng là đặt `CLIP_TTS_SECRET` — việc tay một phút, và
// nên làm nếu hàm còn sống lâu dài.
// ============================================================

const VBEE = Deno.env.get('VBEE_TOKEN') ?? '';
const APP_ID = Deno.env.get('VBEE_APP_ID') ?? '';
const SECRET = Deno.env.get('CLIP_TTS_SECRET') ?? '';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clip-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const J = { ...CORS, 'Content-Type': 'application/json' };

/** Giọng mặc định: cùng giọng với kênh vấn đáp, giữ nhất quán thương hiệu. */
const DEFAULT_VOICE = Deno.env.get('VBEE_VOICE_TRA_LOI') ?? 's_sg_male_thientam_ytstable_vc';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  // Lớp 2 (tuỳ chọn): chỉ áp khi biến môi trường được khai. Khai rồi thì thiếu
  // header là chặn — fail-closed đúng hướng, vì đây là cửa tiêu quota.
  if (SECRET && req.headers.get('x-clip-secret') !== SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: J });
  }

  let body: { text?: string; voice?: string; speed?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: J });
  }

  const text = (body.text ?? '').trim();
  if (!text) return new Response(JSON.stringify({ error: 'missing text' }), { status: 400, headers: J });
  if (text.length > 600) {
    // Một CẢNH dài hơn 600 ký tự (~44 giây đọc) là kịch bản sai, không phải nhu
    // cầu thật — chặn ở đây để khỏi đốt quota cho một lượt chắc chắn bỏ đi.
    return new Response(JSON.stringify({ error: 'text too long for one scene' }), { status: 400, headers: J });
  }

  if (!VBEE || !APP_ID) {
    return new Response(JSON.stringify({ error: 'missing_env: VBEE_TOKEN / VBEE_APP_ID' }), {
      status: 500,
      headers: J,
    });
  }

  try {
    // `response_type: 'direct'` — Vbee trả thẳng link audio trong phản hồi, không
    // cần callback. Khác hàm `tts` (dùng 'indirect' vì bài dài vài phút). Cảnh
    // clip chỉ vài giây nên đường đồng bộ vừa đủ và đơn giản hơn hẳn: không bảng
    // trung gian, không hàm callback, không trạng thái treo.
    const r = await fetch('https://vbee.vn/api/v1/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + VBEE },
      body: JSON.stringify({
        app_id: APP_ID,
        response_type: 'direct',
        input_text: text,
        voice_code: body.voice || DEFAULT_VOICE,
        audio_type: 'mp3',
        bitrate: 128,
        speed_rate: body.speed || '0.9',
      }),
    });

    // 🔴 ĐỌC THÀNH CHỮ TRƯỚC, PHÂN TÍCH SAU — đừng gọi thẳng `r.json()`.
    //
    // Bản cũ làm `const data = await r.json()`. Khi Vbee trả một TRANG HTML
    // (`<!DOCTYPE …`) thay vì JSON — chuyện có thật, xem dưới — lượt phân tích
    // đó NÉM, rơi vào `catch` cuối hàm, và cả mã trạng thái lẫn nội dung trang
    // lỗi bị thay bằng đúng một câu: *"Unexpected token '<' … is not valid
    // JSON"*, kèm 500. Tức lỗi của NHÀ CUNG CẤP bị đóng gói thành thứ trông
    // như lỗi lập trình của mình, và bằng chứng duy nhất để chẩn thì mất sạch.
    //
    // Đo được trên GitHub Actions: lượt 10:13 sinh trót lọt 19 câu rồi chết,
    // lượt 10:24 (14 phút sau) chết ngay câu ĐẦU TIÊN — nhưng không lượt nào
    // đọc được Vbee thật sự nói gì, nên không phân biệt nổi hết hạn mức · token
    // chết · sự cố phía họ. Ba nguyên nhân đó cần ba việc làm khác hẳn nhau.
    //
    // 🔑 Cùng lớp bài học "log của bên gửi không chứng minh được bên nhận hiện
    // ra": chỗ nào bọc lỗi của bên ngoài thì phải GIỮ nguyên văn của họ.
    const raw = await r.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'vbee_not_json',
          status: r.status,
          // Cắt ngắn: đủ để đọc ra trang lỗi nói gì, không đủ để nhét cả trang
          // HTML vào log.
          body: raw.slice(0, 400),
        }),
        { status: 502, headers: J }
      );
    }
    if (!r.ok || data.status !== 1) {
      return new Response(JSON.stringify({ error: 'vbee_error', status: r.status, detail: data }), {
        status: 502,
        headers: J,
      });
    }

    const audioUrl: string | undefined = data.result?.audio_link ?? data.result?.audio_url;
    if (!audioUrl) {
      return new Response(JSON.stringify({ error: 'no_audio_link', detail: data.result }), {
        status: 502,
        headers: J,
      });
    }

    // Chép về Storage của mình: link Vbee có hạn, mà clip có thể dựng lại sau
    // nhiều ngày. Bỏ bước này thì file biến mất và lượt render sau chết lặng.
    let stored: string | null = null;
    if (SB_URL && SB_KEY && body.key) {
      try {
        const bin = await fetch(audioUrl).then((x) => x.arrayBuffer());
        const path = `clip-tts/${body.key}.mp3`;
        const up = await fetch(`${SB_URL}/storage/v1/object/van-dap-media/${path}`, {
          method: 'POST',
          headers: {
            apikey: SB_KEY,
            Authorization: 'Bearer ' + SB_KEY,
            'Content-Type': 'audio/mpeg',
            'x-upsert': 'true',
          },
          body: bin,
        });
        if (up.ok) stored = `${SB_URL}/storage/v1/object/public/van-dap-media/${path}`;
      } catch (_e) {
        // Chép hỏng thì vẫn trả link Vbee — có tiếng còn hơn không có gì.
        stored = null;
      }
    }

    return new Response(JSON.stringify({ success: true, audio_url: stored ?? audioUrl, stored: !!stored }), {
      headers: J,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: J });
  }
});
