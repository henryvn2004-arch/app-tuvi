const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || `Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Vân Đằng Thái Thứ Lang (VDTTL).
Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc, không hoa mỹ thừa.
Nguyên tắc luận: tam phương tứ chính, xét sao đồng cung và hội chiếu, không đoán đơn sao.
Không tiết lộ tài liệu tham khảo hay trường phái.`;

const TONG_PHAN = 24;

const PHAN_LABELS = [
  '',
  'Tổng Quan Lá Số',
  'Cung Mệnh', 'Cung Phụ Mẫu', 'Cung Phúc Đức', 'Cung Điền Trạch',
  'Cung Quan Lộc', 'Cung Nô Bộc', 'Cung Thiên Di', 'Cung Tật Ách',
  'Cung Tài Bạch', 'Cung Tử Tức', 'Cung Phu Thê', 'Cung Huynh Đệ',
  'Tổng Quan Đại Vận',
  'Đại Vận 1', 'Đại Vận 2', 'Đại Vận 3', 'Đại Vận 4', 'Đại Vận 5',
  'Đại Vận 6', 'Đại Vận 7', 'Đại Vận 8', 'Đại Vận 9',
  'Tiểu Vận Năm Xem',
];

const CUNG_BY_PHAN = {
  2:'Mệnh', 3:'Phụ Mẫu', 4:'Phúc Đức', 5:'Điền Trạch',
  6:'Quan Lộc', 7:'Nô Bộc', 8:'Thiên Di', 9:'Tật Ách',
  10:'Tài Bạch', 11:'Tử Tức', 12:'Phu Thê', 13:'Huynh Đệ',
};

const CUNG_DESC = {
  'Phụ Mẫu': 'Xem cung Phụ Mẫu để biết rõ sự thọ yểu, giàu nghèo hay sang hèn của cha mẹ và sự hòa hợp hay xung khắc giữa cha mẹ và con.',
  'Phúc Đức': 'Xem cung Phúc Đức để biết rõ sự thọ yểu, sự thịnh suy của họ hàng, âm phần mà mình chịu ảnh hưởng. Cung Phúc Đức chi phối tất cả 11 cung số.',
  'Điền Trạch': 'Xem cung Điền Trạch để biết rõ nhà cửa, bất động sản, hòa khí trong gia đình, khả năng tích lũy tài sản.',
  'Quan Lộc': 'Xem cung Quan Lộc để biết rõ công danh, sự nghiệp và khả năng chuyên môn.',
  'Nô Bộc': 'Xem cung Nô Bộc để biết rõ về người giúp việc, bạn bè, và những điều liên quan đến thê thiếp.',
  'Thiên Di': 'Xem cung Thiên Di để biết rõ những điều liên quan đến giao thiệp bên ngoài và may rủi khi rời khỏi nhà. Cung Thiên Di xung chiếu cung Mệnh.',
  'Tật Ách': 'Xem cung Tật Ách để biết rõ tì vết trong người, bệnh tật có thể mắc phải và tai ương trong cả đời người.',
  'Tài Bạch': 'Xem cung Tài Bạch để biết rõ sự giàu nghèo, sinh kế, khả năng kiếm tiền và cách tiêu tiền.',
  'Tử Tức': 'Xem cung Tử Tức để biết rõ con cái và quan hệ con cái với mình.',
  'Phu Thê': 'Xem cung Phu Thê để biết rõ những điều liên quan đến vợ chồng, việc lập gia đình và hạnh phúc cả đời.',
  'Huynh Đệ': 'Xem cung Huynh Đệ để biết rõ anh chị em. Cần luận đoán cẩn thận cung Phúc Đức vì liên quan mật thiết đến số lượng và sự đoàn tụ hay ly tán của gia đình.',
};

function buildContext(laSoText, phan, docs, daiVanIdx) {
  let ctx = `=== LÁ SỐ ===\n${laSoText}\n`;
  if (docs) ctx += `\n=== TÀI LIỆU THAM KHẢO ===\n${docs}\n`;
  return ctx;
}

function buildPrompt(phan, ctx, daiVanIdx) {
  // Phần 1: Tổng quan
  if (phan === 1) return `${ctx}
PHẦN 1 — TỔNG QUAN LÁ SỐ (300-400 từ)
Phân tích tổng thể lá số:
- Bản Mệnh – Cục (Nạp Âm)
- Cung Mệnh và Cung Thân
- Chính tinh thủ Mệnh
- Khí chất con người (dựa vào 3 vòng Thái Tuế, Lộc Tồn, Tràng Sinh trong engine output)
- Ưu điểm nổi bật
- Nhược điểm dễ gặp
Mục tiêu: giúp người đọc hiểu bản chất con người và đường đời tổng quát.`;

  // Phần 2-13: Từng cung
  if (phan >= 2 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan];
    const desc = CUNG_DESC[cung] || '';
    return `${ctx}
PHẦN ${phan} — CUNG ${cung.toUpperCase()} (200-300 từ)
${desc}

Luận giải cung ${cung} dựa trên engine output và tài liệu tham khảo:
- Ý nghĩa chính tinh tại cung ${cung}
- Cách cục active tại cung đó và tam phương tứ chính
- Các tổ hợp sao hình thành cách cục rõ ràng và ý nghĩa của chúng đối với cung đang xét
- Tác động tốt – xấu lên cuộc đời tổng thể
- Những điểm cần lưu ý (tính chất cung so với tính cách cung Mệnh)
Luận giải dễ hiểu, thực tế.`;
  }

  // Phần 14: Tổng quan đại vận + chart data
  if (phan === 14) return `${ctx}
PHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN

Dựa vào engine output, thực hiện 2 việc:

1. Lập bảng tổng hợp 9 đại vận:
| Đại vận | Tuổi | Cung | Thiên Thời | Địa Lợi | Nhân Hòa | Tổng | Flag |

2. Trả về JSON chart data (QUAN TRỌNG — phải có, đặt trong block \`\`\`chartdata):
\`\`\`chartdata
{
  "labels": ["6-15", "16-25", ...],
  "scores": [7.2, 5.1, ...]
}
\`\`\`

3. Nhận xét ngắn gọn, xúc tích về diễn biến các đại vận:
- Giai đoạn đẹp nhất
- Giai đoạn khó khăn cần cẩn thận
- Xu hướng tổng thể của cuộc đời`;

  // Phần 15-23: Từng đại vận
  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return `${ctx}
PHẦN ${phan} — ĐẠI VẬN ${dvNum} (200-300 từ)

Trong phần "=== 9 ĐẠI VẬN ===" của lá số, hãy tìm dòng bắt đầu bằng "ĐV${dvNum}:" và luận giải ĐẠI VẬN ĐÓ.

Cấu trúc luận:
- Tuổi và cung đại vận ${dvNum} (lấy từ dòng ĐV${dvNum})
- Ý nghĩa chính tinh tại cung đại vận
- Cách cục active tại cung đó và tam phương tứ chính
- Các tổ hợp sao hình thành cách cục và ý nghĩa
- Xu hướng tốt/xấu của đại vận
- Ảnh hưởng lên tài chính, công việc, gia đình, sức khỏe, cơ hội, rủi ro
- Những điểm cần lưu ý so với tính cách cung Mệnh
Luận giải dễ hiểu, thực tế.`;
  }

  // Phần 24: Tiểu vận
  if (phan === 24) return `${ctx}
PHẦN 24 — TIỂU VẬN NĂM XEM (250-350 từ)

Phân tích vận năm hiện tại:
- Tính chất năm (70% đại vận + 30% tiểu vận)
- Cách cục active tại cung đại vận gốc, cung tiểu vận và cung lưu niên đại vận
- Các tổ hợp sao hình thành cách cục và ý nghĩa
- Xu hướng tốt/xấu của tiểu vận (trên nền tốt/xấu đại vận)
- Ảnh hưởng lên tài chính, công việc, gia đình, sức khỏe, cơ hội, rủi ro
- Những điểm cần lưu ý
Phần này cụ thể và thực tế nhất.`;

  return `${ctx}\nPhần ${phan}: Luận giải theo lá số.`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { hoTen, laSoText, phan, docs } = req.body;
  if (!laSoText || !phan) return res.status(400).json({ error: 'Thiếu dữ liệu' });

  const ctx = buildContext(laSoText, phan, docs);
  const prompt = buildPrompt(phan, ctx);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content?.[0]?.text || '';

    // Extract chart data if present (phần 14)
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
