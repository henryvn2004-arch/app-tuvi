// api/chatbot.js
// Chatbot Vấn Đáp Tử Vi Minh Bảo
// Scenario 1: Hỏi thêm về lá số đang xem (có lasoData)
// Scenario 2: Hỏi chung chung về Tử Vi (không có lasoData)

export const config = { maxDuration: 60 };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── System prompts ───────────────────────────────────────────────────────────

const SYSTEM_BASE = `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, luận giải sâu sắc, ngôn từ trang nhã nhưng gần gũi. 
Bạn đang trả lời trên nền tảng Tử Vi Minh Bảo (tuviminhbao.com).

Nguyên tắc trả lời:
- Dùng tiếng Việt, trang nhã, không dùng emoji
- Ngắn gọn súc tích: 120-250 từ cho câu hỏi thông thường, tối đa 400 từ cho câu hỏi phức tạp
- Ưu tiên dẫn chứng sao tinh, cung vị, can chi cụ thể khi có dữ liệu lá số
- Nếu câu hỏi ngoài phạm vi Tử Vi, lịch sự hướng người dùng về chủ đề liên quan
- Không đoán mò, không hứa hẹn tuyệt đối về tương lai`;

const SYSTEM_LASO = (context) => `${SYSTEM_BASE}

=== DỮ LIỆU LÁ SỐ ĐANG XÉT ===
${context}

Khi trả lời, ưu tiên dùng dữ liệu lá số trên để luận giải cụ thể cho người dùng. 
Trích dẫn tên sao, cung vị, can chi cụ thể. Liên hệ câu hỏi với thực tế lá số của họ.`;

const SYSTEM_GENERAL = `${SYSTEM_BASE}

Bạn đang trả lời câu hỏi chung về Tử Vi Đẩu Số. Phong cách như bài viết Khảo Luận:
- Dẫn chiếu nguyên lý cổ pháp, kinh điển
- Giải thích rõ ràng cho người chưa hiểu sâu
- Nêu ví dụ cụ thể với sao tinh, cung vị khi minh họa
- Có thể nêu quan điểm khác nhau trong giới nghiên cứu nếu phù hợp`;

// ─── Extract relevant lá số context by topic ─────────────────────────────────

function extractLasoContext(lasoData, question) {
  if (!lasoData) return null;

  const q = question.toLowerCase();
  const palaces = lasoData.palaces || [];
  
  // Helper: find palace by name keywords
  const findPalace = (...keywords) =>
    palaces.find(p => keywords.some(k => (p.cungName || '').toLowerCase().includes(k)));

  // Detect topic from question
  const topics = {
    'tài chính|tài lộc|tiền|thu nhập|làm giàu|tài bạch': ['tài bạch', 'phúc đức'],
    'sự nghiệp|công việc|nghề nghiệp|quan lộc|thăng tiến': ['quan lộc', 'mệnh'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm|phu thê|phu quân': ['phu thê', 'mệnh'],
    'con cái|con cháu|tử tức': ['tử tức'],
    'sức khỏe|bệnh tật|thân thể': ['thân'],
    'nhà đất|bất động sản|điền sản|điền trạch': ['điền trạch'],
    'bạn bè|anh em|huynh đệ': ['huynh đệ'],
    'giao tiếp|xã hội|nô bộc|nhân viên': ['nô bộc'],
    'du lịch|di chuyển|thiên di|nước ngoài': ['thiên di'],
    'cha mẹ|phụ mẫu': ['phụ mẫu'],
    'mệnh|bản mệnh|tính cách|con người': ['mệnh'],
    'đại vận|tiểu vận|vận hạn|vận trình': null, // special: use daiVans
  };

  const relevantPalaceNames = new Set();
  
  for (const [pattern, palaceKeywords] of Object.entries(topics)) {
    if (new RegExp(pattern).test(q)) {
      if (palaceKeywords) palaceKeywords.forEach(k => relevantPalaceNames.add(k));
      else relevantPalaceNames.add('__daiVan__');
    }
  }

  // Always include Mệnh cung
  relevantPalaceNames.add('mệnh');

  // Build context string
  let ctx = '';

  // Basic info
  if (lasoData.canChiNam) ctx += `Can Chi: ${lasoData.canChiNam}\n`;
  if (lasoData.napAm) ctx += `Nạp Âm: ${lasoData.napAm} (${lasoData.napAmHanh})\n`;
  if (lasoData.menhDC) ctx += `Mệnh DC: ${lasoData.menhDC}\n`;
  if (lasoData.thanDC) ctx += `Thân DC: ${lasoData.thanDC}\n`;
  if (lasoData.tuoiXem) ctx += `Tuổi xem: ${lasoData.tuoiXem}\n`;
  if (lasoData.cachCuc?.length) ctx += `Cách cục: ${lasoData.cachCuc.join(', ')}\n`;
  
  // Đại vận hiện tại
  if (lasoData.daiVanHienTai) {
    const dv = lasoData.daiVanHienTai;
    ctx += `\nĐại Vận hiện tại: ${dv.can || ''}${dv.chi || ''} (${dv.startAge || ''}–${dv.endAge || ''} tuổi)\n`;
    if (dv.stars?.length) ctx += `  Sao đại vận: ${dv.stars.join(', ')}\n`;
  }

  // Relevant palaces
  ctx += '\n=== CÁC CUNG LIÊN QUAN ===\n';
  
  const addedPalaces = new Set();
  
  for (const palace of palaces) {
    const pName = (palace.cungName || '').toLowerCase();
    const shouldInclude = relevantPalaceNames.size === 0 
      || Array.from(relevantPalaceNames).some(k => {
          if (k === '__daiVan__') return false;
          return pName.includes(k);
        })
      || palace.isMenh;

    if (shouldInclude && !addedPalaces.has(palace.cungName)) {
      addedPalaces.add(palace.cungName);
      ctx += `\nCung ${palace.cungName} (${palace.diaChi || ''}):\n`;
      if (palace.majorStars?.length) ctx += `  Chính tinh: ${palace.majorStars.join(', ')}\n`;
      if (palace.stars?.length) ctx += `  Phụ tinh: ${palace.stars.join(', ')}\n`;
      if (palace.thaiTueNhom) ctx += `  Nhóm Thái Tuế: ${palace.thaiTueNhom}\n`;
      if (palace.cungScores) {
        const s = palace.cungScores;
        ctx += `  Điểm cung: Tiềm Năng ${s.tiemNang||0} · Bền Vững ${s.benVung||0} · An Toàn ${s.anToan||0}\n`;
      }
    }
  }

  // If question about đại vận, add full daiVans
  if (relevantPalaceNames.has('__daiVan__') && lasoData.daiVans?.length) {
    ctx += '\n=== ĐẠI VẬN ===\n';
    lasoData.daiVans.slice(0, 6).forEach(dv => {
      ctx += `${dv.can || ''}${dv.chi || ''} (${dv.startAge}–${dv.endAge} tuổi): ${(dv.stars || []).join(', ')}\n`;
    });
  }

  return ctx;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { messages, lasoData, scenario } = req.body;
    // messages: [{role, content}] — full conversation history
    // lasoData: lá số object từ engine (optional)
    // scenario: 'laso' | 'general' (optional, auto-detect nếu không có)

    if (!messages?.length) {
      return res.status(400).json({ error: 'Missing messages' });
    }

    const lastQuestion = messages[messages.length - 1]?.content || '';
    const hasLaso = !!(lasoData && lasoData.palaces?.length);
    const isLasoScenario = hasLaso && (scenario === 'laso' || scenario !== 'general');

    // Build system prompt
    let systemPrompt;
    if (isLasoScenario) {
      const ctx = extractLasoContext(lasoData, lastQuestion);
      systemPrompt = SYSTEM_LASO(ctx);
    } else {
      systemPrompt = SYSTEM_GENERAL;
    }

    // Limit history to last 10 messages to control tokens
    const trimmedMessages = messages.slice(-10).map(m => ({
      role: m.role,
      content: String(m.content).slice(0, 2000) // cap each message
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', // Sonnet for better quality
        max_tokens: 800,
        system: systemPrompt,
        messages: trimmedMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(500).json({ error: 'API error', detail: err });
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text || '';

    return res.status(200).json({
      answer,
      scenario: isLasoScenario ? 'laso' : 'general',
      usage: data.usage,
    });

  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: err.message });
  }
}
