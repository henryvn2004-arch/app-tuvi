const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || `Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Vân Đằng Thái Thứ Lang (VDTTL).
Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc, không hoa mỹ thừa.
Nguyên tắc luận: tam phương tứ chính, xét sao đồng cung và hội chiếu, không đoán đơn sao.
Không tiết lộ tài liệu tham khảo hay trường phái.`;

const CUNG_DESC = {
  'Mệnh': '',
  'Phụ Mẫu': 'Xem cung Phụ Mẫu để biết sự thọ yểu, giàu nghèo, sang hèn của cha mẹ và sự hòa hợp hay xung khắc giữa cha mẹ và con. Kết hợp ảnh hưởng Nhật Nguyệt trên bản đồ 12 cung.',
  'Phúc Đức': 'Xem cung Phúc Đức để biết sự thọ yểu, thịnh suy của họ hàng và âm phần mình chịu ảnh hưởng. Cung Phúc Đức chi phối tất cả 11 cung còn lại.',
  'Điền Trạch': 'Xem cung Điền Trạch để biết nhà cửa, bất động sản, hòa khí gia đình, khả năng tích lũy tài sản.',
  'Quan Lộc': 'Xem cung Quan Lộc để biết công danh, sự nghiệp và khả năng chuyên môn.',
  'Nô Bộc': 'Xem cung Nô Bộc để biết người giúp việc, bạn bè và những điều liên quan đến thê thiếp.',
  'Thiên Di': 'Xem cung Thiên Di để biết giao thiệp bên ngoài và may rủi khi rời nhà. Cung này xung chiếu cung Mệnh, cần xét rất cẩn thận.',
  'Tật Ách': 'Xem cung Tật Ách để biết tì vết trong người, bệnh tật có thể mắc và tai ương trong cả đời.',
  'Tài Bạch': 'Xem cung Tài Bạch để biết sự giàu nghèo, sinh kế, khả năng và cách kiếm tiền, tiêu tiền.',
  'Tử Tức': 'Xem cung Tử Tức để biết con cái và quan hệ con cái với mình.',
  'Phu Thê': 'Xem cung Phu Thê để biết những điều liên quan đến vợ chồng, lập gia đình và hạnh phúc cả đời.',
  'Huynh Đệ': 'Xem cung Huynh Đệ để biết anh chị em. Cần luận đoán kỹ cung Phúc Đức vì liên quan mật thiết đến số lượng anh chị em và sự đoàn tụ hay ly tán gia đình.',
};

const CUNG_BY_PHAN = {
  2:'Mệnh', 3:'Phụ Mẫu', 4:'Phúc Đức', 5:'Điền Trạch',
  6:'Quan Lộc', 7:'Nô Bộc', 8:'Thiên Di', 9:'Tật Ách',
  10:'Tài Bạch', 11:'Tử Tức', 12:'Phu Thê', 13:'Huynh Đệ',
};

function buildPrompt(phan, laSoText, docs) {
  const ctx = `=== LÁ SỐ ===\n${laSoText}${docs ? '\n\n=== TÀI LIỆU ===\n' + docs : ''}`;

  if (phan === 1) return `${ctx}

PHẦN 1 — TỔNG QUAN LÁ SỐ (250-350 từ)
- Thuận lý âm dương mệnh và cung an mệnh
- Bản Mệnh – Cục (Nạp Âm)
- Cung Mệnh và Cung Thân
- Chính tinh thủ Mệnh
- Khí chất con người (3 vòng Thái Tuế, Lộc Tồn, Tràng Sinh)
- Ưu điểm nổi bật & nhược điểm dễ gặp`;

  if (phan >= 2 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan];
    const desc = CUNG_DESC[cung] || '';
    return `${ctx}

PHẦN ${phan} — CUNG ${cung.toUpperCase()} (150-200 từ)
${desc}
- Ý nghĩa chính tinh tại cung ${cung}
- Cách cục bộ sao tại cung đó và tam phương tứ chính
- Các tổ hợp sao và ý nghĩa đối với cung đang xét
- Tác động tốt/xấu & những điểm cần lưu ý`;
  }

  if (phan === 14) return `${ctx}

PHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN

Bước 1 — Xuất JSON chart data NGAY ĐẦU TIÊN (bắt buộc):
```chartdata
{"labels":["ĐV1","ĐV2","ĐV3","ĐV4","ĐV5","ĐV6","ĐV7","ĐV8","ĐV9"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}
```
Thay s1-s9 bằng điểm tổng thực tế từng đại vận.

Bước 2 — Bảng tổng hợp:
| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |

Bước 3 — Nhận xét ngắn (80-100 từ): giai đoạn đẹp, khó khăn, xu hướng.\`;

  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return `${ctx}

PHẦN ${phan} — ĐẠI VẬN ${dvNum} (150-200 từ)
Tìm dòng "ĐV${dvNum}:" trong phần 9 ĐẠI VẬN và luận giải đại vận đó:
- Thiên Thời / Địa Lợi / Nhân Hòa → điểm và flag
- Ý nghĩa chính tinh tại cung đại vận
- Cách cục bộ sao và tam phương tứ chính
- Xu hướng tốt/xấu & ảnh hưởng
- Những điểm cần lưu ý`;
  }

  if (phan === 24) return `${ctx}

PHẦN 24 — TIỂU VẬN NĂM XEM (150-200 từ)
- Tính chất năm (70% đại vận + 30% tiểu vận)
- Cách cục bộ sao tại cung đại vận gốc, cung tiểu vận và cung lưu niên đại vận
- Tổ hợp sao và ý nghĩa
- Xu hướng tốt/xấu & ảnh hưởng
- Cơ hội & rủi ro cụ thể`;

  return `${ctx}\nPhần ${phan}: Luận giải theo lá số.`;
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: phan === 14 ? 1500 : 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content?.[0]?.text || '';

    // Extract chart data nếu có (phần 14)
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
