const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'Bạn là nhà luận giải Tử Vi Đẩu Số theo trường phái Tử Vi Minh Bảo. Văn phong: trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Nguyên tắc: tam phương tứ chính, không đoán đơn sao. Không tiết lộ tài liệu hay trường phái. Quan trọng: dữ liệu sao, cách cục, luận đoán đã được tính sẵn trong [CÁCH CỤC], [Ý NGHĨA], [LUẬN ĐOÁN] — không mô tả lại, không liệt kê lại, chỉ diễn giải và kết nối ý nghĩa thành văn xuôi súc tích.';

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
    'bạn bè|nô bộc|nhân viên': ['Nô Bộc'],
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
      'x-api-key': ANTHROPIC_API_KEY,
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

// ─── Luận giải handler (logic gốc) ───────────────────────────────────────────

function buildPrompt(phan, laSoText, docs) {
  function trimLaSo(text, phan) {
    if (!text) return text;
    const lines = text.split('\n');
    const dvIdx  = lines.findIndex(l => l.includes('=== 9 ĐẠI VẬN ==='));
    const ccIdx  = lines.findIndex(l => l.includes('=== CÁCH CỤC & NHẬN ĐỊNH'));
    const cungIdx = lines.findIndex(l => l.includes('=== 12 CUNG ==='));
    const headerLines = cungIdx > 0 ? lines.slice(0, cungIdx) : lines.slice(0, 8);

    if (phan === 1) {
      const end = dvIdx > 0 ? dvIdx : (ccIdx > 0 ? ccIdx : lines.length);
      return lines.slice(0, end).join('\n');
    }
    if (phan === 2) {
      const end = dvIdx > 0 ? dvIdx : (ccIdx > 0 ? ccIdx : lines.length);
      return lines.slice(0, end).join('\n');
    }
    if (phan >= 3 && phan <= 13) {
      const CUNG_NAME = ['','','Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc',
        'Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'][phan];
      const result = [...headerLines, ''];
      const cutEnd = dvIdx > 0 ? dvIdx : (ccIdx > 0 ? ccIdx : lines.length);
      const cungLines = lines.slice(cungIdx > 0 ? cungIdx : 0, cutEnd);
      const startI = cungLines.findIndex(l => l.startsWith(`[${CUNG_NAME}]`));
      if (startI >= 0) {
        const endI = cungLines.findIndex((l, i) => i > startI && l.startsWith('[') && !l.startsWith('[CÁCH') && !l.startsWith('[Ý') && !l.startsWith('[LUẬN'));
        const block = endI > 0 ? cungLines.slice(startI, endI) : cungLines.slice(startI, startI + 25);
        return result.concat(block).join('\n');
      }
      return lines.slice(0, cutEnd).join('\n');
    }
    if (phan === 14) {
      if (dvIdx > 0) {
        const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
        return headerLines.join('\n') + '\n' + lines.slice(dvIdx, dvEnd).join('\n');
      }
    }
    if (phan >= 15 && phan <= 23) {
      const dvNum = phan - 14;
      if (dvIdx > 0) {
        const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
        const dvLines = lines.slice(dvIdx, dvEnd);
        const target = 'ĐV' + dvNum + ':';
        const startI = dvLines.findIndex(l => l.startsWith(target));
        if (startI >= 0) {
          const endI = dvLines.findIndex((l, i) => i > startI && /^ĐV\d+:/.test(l));
          const dvBlock = endI > 0 ? dvLines.slice(startI, endI) : dvLines.slice(startI, startI + 20);
          return headerLines.join('\n') + '\n\n' + dvBlock.join('\n');
        }
      }
    }
    if (phan === 24) {
      if (dvIdx > 0) {
        const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
        return headerLines.join('\n') + '\n' + lines.slice(dvIdx, dvEnd).join('\n');
      }
    }
    return text;
  }

  const trimmedLaSo = trimLaSo(laSoText, phan);
  const ctx = '=== LÁ SỐ ===\n' + trimmedLaSo + (docs ? '\n\n=== TÀI LIỆU ===\n' + docs : '');
  buildPrompt._lastCtx = ctx;

  if (phan === 1) {
    return ctx + '\n\nPHẦN 1 — TỔNG QUAN LÁ SỐ (200-250 từ)\nViết văn xuôi, không dùng bullet. KHÔNG đề cập đến đại vận trong phần này.\n1. Bản mệnh & khí chất: cục, thuận/nghịch lý, vị trí cung Mệnh trong vòng Tràng Sinh (Trường Sinh/Mộc Dục/Quan Đới...), vị trí trong vòng Lộc Tồn, nhóm Thái Tuế Mệnh vs Thân\n2. Cung Mệnh: dựa trên [CÁCH CỤC] và [Ý NGHĨA] — diễn giải, không liệt kê lại\n3. Một câu nhận định tổng: điểm mạnh/yếu nổi bật nhất';
  }
  if (phan === 2) {
    const cung = CUNG_BY_PHAN[phan];
    const desc = CUNG_DESC[cung] || '';
    return ctx + '\n\nPHẦN 2 — CUNG MỆNH (200-250 từ)\n' + desc + '\nDựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — viết văn xuôi súc tích: bản chất chính tinh, cách cục nổi bật, điểm mạnh/yếu, khí chất và tác động thực tế lên cuộc đời. Không liệt kê lại data.';
  }
  if (phan >= 3 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan];
    const desc = CUNG_DESC[cung] || '';
    return ctx + '\n\nPHẦN ' + phan + ' — CUNG ' + cung.toUpperCase() + ' (80-120 từ)\n' + desc + '\nDựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — viết 2-3 đoạn văn xuôi súc tích: ý nghĩa chính, điểm nổi bật tốt/xấu, tác động thực tế. Không liệt kê lại data.';
  }
  if (phan === 14) {
    return ctx + '\n\nPHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN\n\nDựa vào phần === 9 ĐẠI VẬN ===, tính điểm TẤT CẢ 9 đại vận:\n- TT (Thiên Thời) 0-5: ngũ hành địa chi cung ĐV vs chi năm sinh\n- ĐL (Địa Lợi) 0-1: ngũ hành cung ĐV vs nạp âm bản mệnh\n- NH (Nhân Hòa) 0-4: bộ sao Mệnh vs bộ ĐV + sát tinh TPTC\nCông thức: Tổng = NH + (NH/4)×ĐL + (NH/4)×TT (max 10)\n\nBảng tổng hợp ĐV1 đến ĐV9:\n| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |\n\nJSON chart (BẮT BUỘC, đủ 9 điểm):\n```chartdata\n{"labels":["ĐV1 x-y","ĐV2 x-y","ĐV3 x-y","ĐV4 x-y","ĐV5 x-y","ĐV6 x-y","ĐV7 x-y","ĐV8 x-y","ĐV9 x-y"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}\n```\nThay x-y bằng khung tuổi thực tế, s1-s9 bằng điểm Tổng.\n\nNhận xét ngắn (100-150 từ): giai đoạn đẹp nhất, khó khăn nhất, xu hướng tổng thể. Súc tích, không giải thích công thức scoring.';
  }
  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return ctx + '\n\nPHẦN ' + phan + ' — ĐẠI VẬN ' + dvNum + ' (100-130 từ)\nTìm dòng "ĐV' + dvNum + ':" trong === 9 ĐẠI VẬN ===. Dựa trên [LUẬN ĐOÁN] và [CẢNH BÁO] đã có — viết văn xuôi súc tích: tính chất đại vận, xu hướng tốt/xấu, 1-2 điểm cần lưu ý quan trọng nhất. Không liệt kê lại data.';
  }
  if (phan === 24) {
    return ctx + '\n\nPHẦN 24 — TIỂU VẬN NĂM XEM (150-200 từ)\nViết văn xuôi, cụ thể, thực tế nhất:\n- Tính chất năm: đại vận làm nền (70%), tiểu vận điều chỉnh (30%)\n- Xu hướng tốt/xấu nổi bật nhất của năm\n- 1-2 cơ hội và 1-2 điểm cần cẩn thận cụ thể\nKhông giải thích lý thuyết, không liệt kê sao.';
  }
  return ctx + '\nPhần ' + phan + ': Luận giải theo lá số.';
}

// ─── Main export ──────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');

  // Route chatbot
  if (req.query.action === 'chat') {
    return handleChat(req, res);
  }

  // Route luận giải gốc
  const { laSoText, phan, docs } = req.body;
  if (!laSoText || !phan) return res.status(400).json({ error: 'Thiếu dữ liệu' });

  let prompt;
  try {
    prompt = buildPrompt(phan, laSoText, docs);
  } catch(e) {
    return res.status(500).json({ error: 'buildPrompt error: ' + e.message });
  }

  try {
    const model = (phan === 1 || phan === 14)
      ? 'claude-sonnet-4-5'
      : 'claude-haiku-4-5-20251001';
    const maxTok = phan === 1 ? 2000
      : phan === 14 ? 3000
      : phan === 24 ? 1200
      : phan >= 2 && phan <= 13 ? 1000
      : phan >= 15 && phan <= 23 ? 1100
      : 1000;

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
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }] }],
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
