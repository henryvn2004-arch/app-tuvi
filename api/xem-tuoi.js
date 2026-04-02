// ─── CHATBOT handler ──────────────────────────────────────────────────────────

const CHAT_SYSTEM_LASO = (ctx) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, luận giải sâu sắc, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Bạn đang trả lời trên nền tảng Tử Vi Minh Bảo.

Nguyên tắc:
- Tiếng Việt, không dùng bullet, không dùng emoji
- 120-250 từ cho câu thông thường, tối đa 400 từ cho câu phức tạp
- Dẫn chứng sao tinh, cung vị, can chi cụ thể từ lá số
- Không hứa hẹn tuyệt đối về tương lai
- Không tiết lộ trường phái hay tài liệu

=== DỮ LIỆU LÁ SỐ ===
${ctx}`;

const CHAT_SYSTEM_GENERAL = `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, luận giải sâu sắc, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Bạn đang trả lời trên nền tảng Tử Vi Minh Bảo.

Nguyên tắc:
- Tiếng Việt, không dùng bullet, không dùng emoji
- 120-250 từ cho câu thông thường, tối đa 400 từ cho câu phức tạp
- Dẫn chiếu nguyên lý cổ pháp, nêu ví dụ sao tinh, cung vị cụ thể khi minh họa
- Không hứa hẹn tuyệt đối, không tiết lộ trường phái`;

function extractLasoContext(lasoData, question) {
  if (!lasoData) return null;
  const q = (question || '').toLowerCase();
  const palaces = lasoData.palaces || [];

  const topics = {
    'tài chính|tài lộc|tiền|thu nhập|làm giàu|tài bạch': ['Tài Bạch', 'Phúc Đức'],
    'sự nghiệp|công việc|nghề|quan lộc|thăng tiến': ['Quan Lộc', 'Mệnh'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm|phu thê': ['Phu Thê', 'Mệnh'],
    'con cái|con cháu|tử tức': ['Tử Tức'],
    'sức khỏe|bệnh|thân thể|tật ách': ['Tật Ách'],
    'nhà đất|bất động sản|điền|điền trạch': ['Điền Trạch'],
    'anh em|huynh đệ': ['Huynh Đệ'],
    'bạn bè|nô bộc|nhân viên|đối tác': ['Nô Bộc'],
    'du lịch|di chuyển|thiên di|nước ngoài': ['Thiên Di'],
    'cha mẹ|phụ mẫu': ['Phụ Mẫu'],
    'đại vận|tiểu vận|vận hạn|vận trình': ['__daiVan__'],
  };

  const relevant = new Set(['Mệnh']);
  for (const [pattern, names] of Object.entries(topics)) {
    if (new RegExp(pattern).test(q)) names.forEach(n => relevant.add(n));
  }

  let ctx = '';
  if (lasoData.canChiNam) ctx += `Can Chi: ${lasoData.canChiNam}\n`;
  if (lasoData.napAm)     ctx += `Nạp Âm: ${lasoData.napAm} (${lasoData.napAmHanh})\n`;
  if (lasoData.menhDC)    ctx += `Mệnh DC: ${lasoData.menhDC}\n`;
  if (lasoData.thanDC)    ctx += `Thân DC: ${lasoData.thanDC}\n`;
  if (lasoData.tuoiXem)   ctx += `Tuổi xem: ${lasoData.tuoiXem}\n`;
  if (lasoData.cachCuc?.length) ctx += `Cách cục: ${lasoData.cachCuc.join(', ')}\n`;

  if (lasoData.daiVanHienTai) {
    const dv = lasoData.daiVanHienTai;
    ctx += `\nĐại Vận hiện tại: ${dv.can||''}${dv.chi||''} (${dv.startAge||''}–${dv.endAge||''} tuổi)`;
    if (dv.stars?.length) ctx += ` — Sao: ${dv.stars.join(', ')}`;
    ctx += '\n';
  }

  ctx += '\n=== CUNG LIÊN QUAN ===\n';
  for (const p of palaces) {
    const pName = p.cungName || '';
    if (!relevant.has(pName) && !p.isMenh) continue;
    ctx += `\nCung ${pName} (${p.diaChi||''}):\n`;
    if (p.majorStars?.length) ctx += `  Chính tinh: ${p.majorStars.join(', ')}\n`;
    if (p.stars?.length)      ctx += `  Phụ tinh: ${p.stars.join(', ')}\n`;
    if (p.thaiTueNhom)        ctx += `  Nhóm Thái Tuế: ${p.thaiTueNhom}\n`;
    if (p.cungScores) {
      const s = p.cungScores;
      ctx += `  Điểm: Tiềm Năng ${s.tiemNang||0} · Bền Vững ${s.benVung||0} · An Toàn ${s.anToan||0}\n`;
    }
  }

  if (relevant.has('__daiVan__') && lasoData.daiVans?.length) {
    ctx += '\n=== ĐẠI VẬN ===\n';
    lasoData.daiVans.slice(0, 6).forEach(dv => {
      ctx += `${dv.can||''}${dv.chi||''} (${dv.startAge}–${dv.endAge} tuổi): ${(dv.stars||[]).join(', ')}\n`;
    });
  }

  // Context người B (xem-tuoi / xem-lam-an)
  if (lasoData._partnerLaso) {
    const b = lasoData._partnerLaso;
    ctx += '\n=== LÁ SỐ NGƯỜI KIA ===\n';
    if (b.canChiNam) ctx += `Can Chi: ${b.canChiNam}\n`;
    if (b.napAmHanh) ctx += `Nạp Âm Hành: ${b.napAmHanh}\n`;
    if (b.cachCuc?.length) ctx += `Cách cục: ${b.cachCuc.join(', ')}\n`;
    const menh = (b.palaces||[]).find(p => p.isMenh);
    if (menh) {
      ctx += `Cung Mệnh (${menh.diaChi||''}): ${(menh.majorStars||[]).map(s=>s.ten||s).join(', ')}\n`;
      if (menh.thaiTueNhom) ctx += `Nhóm Thái Tuế: ${JSON.stringify(menh.thaiTueNhom)}\n`;
    }
    if (b.daiVanHienTai) {
      const dv = b.daiVanHienTai;
      ctx += `Đại Vận hiện tại: ${dv.can||''}${dv.chi||''} (${dv.startAge||''}–${dv.endAge||''} tuổi)\n`;
    }
  }

  return ctx;
}

async function handleChat(req, res) {
  const { messages, lasoData } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' });

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasLaso = !!(lasoData?.palaces?.length);

  let systemPrompt;
  if (hasLaso) {
    const ctx = extractLasoContext(lasoData, lastQ);
    systemPrompt = CHAT_SYSTEM_LASO(ctx);
  } else {
    systemPrompt = CHAT_SYSTEM_GENERAL;
  }

  const trimmed = messages.slice(-10).map(m => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: trimmed,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return res.status(500).json({ error: 'API error', detail: err.slice(0, 200) });
  }

  const data = await resp.json();
  return res.status(200).json({
    answer: data.content?.[0]?.text || '',
    scenario: hasLaso ? 'laso' : 'general',
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');

  // Route chatbot
  if (req.query.action === 'chat') {
    return handleChat(req, res);
  }

  // Route xem tuổi / làm ăn gốc
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
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
