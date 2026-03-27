const Anthropic = require('@anthropic-ai/sdk');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, phan } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const client = new Anthropic();
    const msg = await client.messages.create({
      model: phan === 0 ? 'claude-sonnet-4-5' : 'claude-haiku-4-5-20251001',
      max_tokens: phan === 0 ? 1500 : 600,
      system: 'Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Viết văn xuôi, không dùng bullet. Không tiết lộ trường phái hay tài liệu.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content?.[0]?.text || '';
    return res.status(200).json({ luanGiai: text });
  } catch (e) {
    console.error('[xem-tuoi]', e);
    return res.status(500).json({ error: e.message });
  }
};
