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
  // Trim laSoText theo phan để giảm token input
  function trimLaSo(text, phan) {
    if (!text) return text;
    const lines = text.split('\n');
    // Phan 1-13: chỉ cần phần đầu (bản mệnh + 12 cung + cách cục), bỏ đại vận
    if (phan >= 1 && phan <= 13) {
      const dvIdx = lines.findIndex(l => l.includes('=== 9 ĐẠI VẬN ==='));
      if (dvIdx > 0) return lines.slice(0, dvIdx).join('\n');
    }
    // Phan 14: chỉ cần đại vận section
    if (phan === 14) {
      const dvIdx = lines.findIndex(l => l.includes('=== 9 ĐẠI VẬN ==='));
      if (dvIdx > 0) return lines.slice(0, 30).join('\n') + '\n' + lines.slice(dvIdx).join('\n');
    }
    // Phan 15-23: phần đầu ngắn + section đại vận + chỉ ĐVn liên quan
    if (phan >= 15 && phan <= 23) {
      const dvNum = phan - 14;
      const dvIdx = lines.findIndex(l => l.includes('=== 9 ĐẠI VẬN ==='));
      const header = lines.slice(0, 20).join('\n'); // bản mệnh cơ bản
      if (dvIdx > 0) {
        const dvLines = lines.slice(dvIdx);
        // Lấy chỉ ĐVn và ĐVn±1 cho context
        const target = 'ĐV' + dvNum + ':';
        const targetIdx = dvLines.findIndex(l => l.startsWith(target));
        if (targetIdx >= 0) {
          // Lấy từ ĐVn đến ĐVn+1 (khoảng 10 dòng)
          const nextDvIdx = dvLines.findIndex((l, i) => i > targetIdx && /^ĐV\d+:/.test(l));
          const dvSection = nextDvIdx > 0
            ? dvLines.slice(0, 2).concat(dvLines.slice(targetIdx, nextDvIdx)).join('\n')
            : dvLines.slice(0, 2).concat(dvLines.slice(targetIdx, targetIdx + 15)).join('\n');
          return header + '\n' + dvSection;
        }
        return header + '\n' + dvLines.join('\n');
      }
    }
    // Phan 24: tiểu vận — phần đầu + toàn bộ đại vận
    if (phan === 24) {
      const dvIdx = lines.findIndex(l => l.includes('=== 9 ĐẠI VẬN ==='));
      if (dvIdx > 0) return lines.slice(0, 25).join('\n') + '\n' + lines.slice(dvIdx).join('\n');
    }
    return text;
  }

  const trimmedLaSo = trimLaSo(laSoText, phan);
  const ctx = '=== LÁ SỐ ===\n' + trimmedLaSo + (docs ? '\n\n=== TÀI LIỆU ===\n' + docs : '');
  // Export ctx for caching
  buildPrompt._lastCtx = ctx;

  if (phan === 1) {
    return ctx + '\n\nPHẦN 1 — TỔNG QUAN LÁ SỐ (350-450 từ)\n1. Bản mệnh & cục: thuận/nghịch lý âm dương; sinh/vượng/bại/tuyệt địa\n2. Khí chất: so sánh nhóm Thái Tuế Mệnh vs Thân (nội tâm vs biểu hiện); Lộc Tồn tại Mệnh; Tràng Sinh\n3. Cách cục & ý nghĩa cung Mệnh: liệt kê tất cả từ [CÁCH CỤC] và [Ý NGHĨA] tại cung Mệnh — dùng trực tiếp, không tính lại\n4. Nhận định chung: ưu/nhược điểm nổi bật';
  }

  if (phan >= 2 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan];
    const desc = CUNG_DESC[cung] || '';
    return ctx + '\n\nPHẦN ' + phan + ' — CUNG ' + cung.toUpperCase() + ' (120-180 từ)\n' + desc + '\nLuận:\n- [CÁCH CỤC] đã liệt kê → dùng trực tiếp, không tính lại\n- [Ý NGHĨA] đã liệt kê → kết quả rule-based pre-computed, dùng làm nền luận giải, diễn giải súc tích theo văn phong trí thức — không chép lại nguyên văn\n- Điểm tốt/xấu chính, kết hợp tam phương tứ chính nếu có ảnh hưởng đáng kể';
  }

  if (phan === 14) {
    return ctx + '\n\nPHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN\n\nDựa vào phần === 9 ĐẠI VẬN ===, tính điểm TẤT CẢ 9 đại vận:\n- TT (Thiên Thời) 0-5: ngũ hành địa chi cung ĐV vs chi năm sinh\n- ĐL (Địa Lợi) 0-1: ngũ hành cung ĐV vs nạp âm bản mệnh\n- NH (Nhân Hòa) 0-4: bộ sao Mệnh vs bộ ĐV + sát tinh TPTC\nCông thức: Tổng = NH + (NH/4)×ĐL + (NH/4)×TT (max 10)\n\nBảng tổng hợp ĐV1 đến ĐV9:\n| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |\n\nJSON chart (BẮT BUỘC, đủ 9 điểm):\n```chartdata\n{"labels":["ĐV1 x-y","ĐV2 x-y","ĐV3 x-y","ĐV4 x-y","ĐV5 x-y","ĐV6 x-y","ĐV7 x-y","ĐV8 x-y","ĐV9 x-y"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}\n```\nThay x-y bằng khung tuổi thực tế, s1-s9 bằng điểm Tổng.\n\nNhận xét (350-450 từ tổng cả bảng lẫn nhận xét): giai đoạn đẹp, khó khăn, xu hướng tổng thể.';
  }

    if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return ctx + '\n\nPHẦN ' + phan + ' — ĐẠI VẬN ' + dvNum + ' (150-200 từ)\nTìm dòng "ĐV' + dvNum + ':" trong phần === 9 ĐẠI VẬN === và luận giải đại vận đó:\n- [LUẬN ĐOÁN] và [CẢNH BÁO] đã liệt kê → đây là kết quả rule-based pre-computed, dùng trực tiếp làm nền luận giải, không tính lại, không chép nguyên văn — diễn giải súc tích theo văn phong trí thức\n- Ý nghĩa chính tinh tại cung đại vận (sáng/mờ, hóa nếu có)\n- Xu hướng tốt/xấu tổng thể, cơ hội & những điểm cần lưu ý';
  }

  if (phan === 24) {
    return ctx + '\n\nPHẦN 24 — TIỂU VẬN NĂM XEM (300-400 từ)\n- Tính chất năm (70% đại vận + 30% tiểu vận)\n- Tổ hợp sao cung đại vận gốc, cung tiểu vận, cung lưu niên đại vận → cách cục và ý nghĩa\n- Xu hướng tốt/xấu\n- Cơ hội & rủi ro\nPhần này cụ thể và thực tế nhất.';
  }

  return ctx + '\nPhần ' + phan + ': Luận giải theo lá số.';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { laSoText, phan, docs } = req.body;
  if (!laSoText || !phan) return res.status(400).json({ error: 'Thiếu dữ liệu' });

  let prompt;
  try {
    prompt = buildPrompt(phan, laSoText, docs);
  } catch(e) {
    return res.status(500).json({ error: 'buildPrompt error: ' + e.message });
  }

  try {
    // Model: Sonnet cho phần tổng quan/đại vận, Haiku cho từng cung
    const useHaiku = (phan >= 2 && phan <= 13) || (phan >= 15 && phan <= 23);
    const model = useHaiku ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-5';
    const maxTok = phan === 1 ? 1800
      : phan === 14 ? 1800
      : phan === 24 ? 1500
      : useHaiku && phan >= 2 && phan <= 13 ? 700
      : useHaiku && phan >= 15 && phan <= 23 ? 900
      : 1200;

    // Prompt caching: cache system prompt + laSoText (lặp lại 24 lần)
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTok,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildPrompt._lastCtx || '',
              cache_control: { type: 'ephemeral' },
            },
            {
              type: 'text',
              text: prompt.replace(buildPrompt._lastCtx || '', '').trim(),
            },
          ],
        }],
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
    const luanGiai = text ? text.replace(/```chartdata[\s\S]*?```/, '').trim() : '';

    return res.status(200).json({ luanGiai, chartData, phan });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
