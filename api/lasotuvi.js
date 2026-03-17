const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Nguyên tắc: tam phương tứ chính, không đoán đơn sao. Không tiết lộ tài liệu hay trường phái.';

const CUNG_BY_PHAN = {
  2:'Mệnh', 3:'Phụ Mẫu', 4:'Phúc Đức', 5:'Điền Trạch',
  6:'Quan Lộc', 7:'Nô Bộc', 8:'Thiên Di', 9:'Tật Ách',
  10:'Tài Bạch', 11:'Tử Tức', 12:'Phu Thê', 13:'Huynh Đệ',
};

const CUNG_DESC = {
  'Mệnh': '',
  'Phụ Mẫu': 'Xem cung Phụ Mẫu để biết sự thọ yểu, giàu nghèo của cha mẹ và sự hòa hợp hay xung khắc giữa cha mẹ và con. Kết hợp nhận định ảnh hưởng Nhật Nguyệt trên bản đồ 12 cung.',
  'Phúc Đức': 'Xem cung Phúc Đức để biết sự thọ yểu, thịnh suy của họ hàng và âm phần mình chịu ảnh hưởng. Cung Phúc Đức chi phối tất cả 11 cung còn lại.',
  'Điền Trạch': 'Xem cung Điền Trạch để biết nhà cửa, bất động sản, hòa khí gia đình, khả năng tích lũy tài sản.',
  'Quan Lộc': 'Xem cung Quan Lộc để biết công danh, sự nghiệp và khả năng chuyên môn.',
  'Nô Bộc': 'Xem cung Nô Bộc để biết người giúp việc, bạn bè và những điều liên quan đến thê thiếp.',
  'Thiên Di': 'Xem cung Thiên Di để biết giao thiệp bên ngoài và may rủi khi rời nhà. Cung này xung chiếu cung Mệnh — cần xét rất cẩn thận.',
  'Tật Ách': 'Xem cung Tật Ách để biết tì vết trong người, bệnh tật và tai ương có thể xảy đến trong cả một đời.',
  'Tài Bạch': 'Xem cung Tài Bạch để biết sự giàu nghèo, sinh kế, khả năng và cách kiếm tiền, tiêu tiền.',
  'Tử Tức': 'Xem cung Tử Tức để biết con cái và quan hệ con cái với mình.',
  'Phu Thê': 'Xem cung Phu Thê để biết những điều liên quan đến vợ chồng, lập gia đình và hạnh phúc cả đời.',
  'Huynh Đệ': 'Xem cung Huynh Đệ để biết anh chị em. Cần luận đoán kỹ cung Phúc Đức vì liên quan mật thiết đến số lượng anh chị em và sự đoàn tụ hay ly tán gia đình.',
};

function buildPrompt(phan, laSoText, docs) {
  const ctx = '=== LÁ SỐ ===\n' + laSoText + (docs ? '\n\n=== TÀI LIỆU ===\n' + docs : '');

  if (phan === 1) {
    return ctx + '\n\nPHẦN 1 — TỔNG QUAN LÁ SỐ (250-350 từ)\n1. Bản mệnh & cục: thuận/nghịch lý âm dương; sinh/vượng/bại/tuyệt địa\n2. Cung Mệnh: chính tinh (vô chính diệu?), Mệnh Thân đồng cung?\n3. Khí chất: so sánh nhóm Thái Tuế Mệnh vs Thân (nội tâm vs biểu hiện); Lộc Tồn tại Mệnh; Tràng Sinh\n4. Cách cục: liệt kê tất cả từ CÁCH CỤC & NHẬN ĐỊNH (tốt/xấu, cung nào) — dùng trực tiếp, không tính lại\n5. Nhận định chung: ưu/nhược điểm nổi bật';
  }

  if (phan >= 2 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan];
    const desc = CUNG_DESC[cung] || '';
    return ctx + '\n\nPHẦN ' + phan + ' — CUNG ' + cung.toUpperCase() + ' (120-180 từ)\n' + desc + '\nLuận: chính tinh (Miếu/Vượng/Đắc/Bình/Hãm) + tam phương tứ chính → cách cục, ý nghĩa. [CÁCH CỤC] đã liệt kê → dùng luôn. Điểm tốt/xấu chính.';
  }

  if (phan === 14) {
    return ctx + '\n\nPHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN\n\nDựa vào phần === 9 ĐẠI VẬN === trong lá số, tính điểm cho TẤT CẢ 9 đại vận (không bỏ sót đại vận nào):\n- TT (Thiên Thời) 0-5: dựa vào chính tinh và ngũ hành cung\n- ĐL (Địa Lợi) 0-2: sao tốt nhiều/ít\n- NH (Nhân Hòa) 0-3: sao xấu ít/nhiều\n\nBước 1 — Bảng tổng hợp ĐV1 đến ĐV9:\n| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |\n\nBước 2 — JSON chart (BẮT BUỘC, đủ 9 điểm):\n```chartdata\n{"labels":["ĐV1 x-y","ĐV2 x-y","ĐV3 x-y","ĐV4 x-y","ĐV5 x-y","ĐV6 x-y","ĐV7 x-y","ĐV8 x-y","ĐV9 x-y"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}\n```\nThay x-y bằng khung tuổi thực tế, s1-s9 bằng điểm Tổng tương ứng.\n\nBước 3 — Nhận xét ngắn (80-100 từ): giai đoạn đẹp, khó khăn, xu hướng tổng thể.';
  }

  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return ctx + '\n\nPHẦN ' + phan + ' — ĐẠI VẬN ' + dvNum + ' (150-200 từ)\nTìm dòng "ĐV' + dvNum + ':" trong phần === 9 ĐẠI VẬN === và luận giải đại vận đó:\n- Ý nghĩa chính tinh tại cung đại vận\n- Tổ hợp các sao tại cung và tam phương tứ chính → xác định cách cục và ý nghĩa\n- Xu hướng tốt/xấu, cơ hội/rủi ro & những điểm cần lưu ý';
  }

  if (phan === 24) {
    return ctx + '\n\nPHẦN 24 — TIỂU VẬN NĂM XEM (150-200 từ)\n- Tính chất năm (70% đại vận + 30% tiểu vận)\n- Tổ hợp toàn bộ sao tại cung đại vận gốc, cung tiểu vận và cung lưu niên đại vận → xác định cách cục và ý nghĩa\n- Xu hướng tốt/xấu của tiểu vận trên nền đại vận & ảnh hưởng\n- Cơ hội & rủi ro cụ thể\nPhần này cụ thể và thực tế nhất.';
  }

  return ctx + '\nPhần ' + phan + ': Luận giải theo lá số.';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { laSoText, phan, docs } = req.body;
  if (!laSoText || !phan) return res.status(400).json({ error: 'Thiếu dữ liệu' });

  const prompt = buildPrompt(phan, laSoText, docs);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: phan === 14 ? 2000 : 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(500).json({ error: 'API error: ' + errText.slice(0, 200) });
    }

    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content?.[0]?.text || '';

    let chartData = null;
    const chartMatch = text.match(/```chartdata\s*([\s\S]*?)```/);
    if (chartMatch) {
      try { chartData = JSON.parse(chartMatch[1].trim()); } catch(e) {}
    }
    const luanGiai = text.replace(/```chartdata[\s\S]*?```/, '').trim();

    return res.status(200).json({ luanGiai, chartData, phan });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
