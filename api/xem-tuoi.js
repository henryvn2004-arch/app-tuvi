module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, phan } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const model = phan === 0 ? 'claude-sonnet-4-5' : 'claude-haiku-4-5-20251001';
    const max_tokens = phan === 0 ? 1500 : 600;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system: 'Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Viết văn xuôi, không dùng bullet. Không tiết lộ trường phái hay tài liệu.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await resp.json();
    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ luanGiai: text });
  } catch (e) {
    console.error('[xem-tuoi]', e);
    return res.status(500).json({ error: e.message });
  }
};
