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

// ── Helper: format 1 lá số thành text context cho AI ──────────────────────────
function fmtLaso(ls, label, q) {
  if (!ls) return '';
  const palaces = ls.palaces || [];

  const topics = {
    'tài chính|tài lộc|tiền|thu nhập|làm giàu|tài bạch': ['Tài Bạch', 'Phúc Đức'],
    'sự nghiệp|công việc|nghề|quan lộc|thăng tiến':       ['Quan Lộc', 'Mệnh'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm|phu thê':      ['Phu Thê', 'Mệnh'],
    'con cái|con cháu|tử tức':                             ['Tử Tức'],
    'sức khỏe|bệnh|thân thể|tật ách':                     ['Tật Ách'],
    'nhà đất|bất động sản|điền trạch':                    ['Điền Trạch'],
    'anh em|huynh đệ':                                     ['Huynh Đệ'],
    'bạn bè|nô bộc|nhân viên|đối tác':                    ['Nô Bộc'],
    'du lịch|di chuyển|thiên di|nước ngoài':               ['Thiên Di'],
    'cha mẹ|phụ mẫu':                                      ['Phụ Mẫu'],
    'đại vận|tiểu vận|vận hạn|vận trình':                 ['__daiVan__'],
  };
  const relevant = new Set(['Mệnh']);
  for (const [pattern, names] of Object.entries(topics)) {
    if (new RegExp(pattern, 'i').test(q)) names.forEach(n => relevant.add(n));
  }
  if (relevant.size === 1) {
    ['Quan Lộc', 'Tài Bạch', 'Phu Thê'].forEach(n => relevant.add(n));
  }

  const starFmt = s => {
    if (!s) return '';
    if (typeof s !== 'object') return String(s);
    let t = s.ten || '';
    if (s.brightness) t += '(' + s.brightness + ')';
    if (s.hoa)        t += '[Hóa ' + s.hoa + ']';
    return t;
  };
  const starName = s => (typeof s === 'object' ? s.ten || '' : s || '');

  let ctx = '\n=== ' + label + ' ===\n';
  ctx += 'Năm sinh: ' + (ls.canChiNam||'') + ' | Nạp Âm: ' + (ls.napAm||'') + ' (' + (ls.napAmHanh||ls.napAm||'') + ')\n';
  ctx += 'Cung Mệnh: ' + (ls.menhDC||'') + ' | Cung Thân: ' + (ls.thanDC||'') + '\n';
  if (ls.tuoiXem) ctx += 'Tuổi xem: ' + ls.tuoiXem + '\n';

  if (ls.cachCuc && ls.cachCuc.length) {
    const cc = ls.cachCuc.map(c => typeof c === 'object' ? c.ten : c).filter(Boolean);
    if (cc.length) ctx += 'Cách cục: ' + cc.join(', ') + '\n';
  }

  if (ls.daiVanHienTai) {
    const dv = ls.daiVanHienTai;
    const dvCung = palaces[dv.cungIdx] || {};
    ctx += 'Đại Vận hiện tại: ' + (dv.diaChi||'') + ' (' + (dv.tuoiStart||'') + '–' + (dv.tuoiEnd||'') + ' tuổi)';
    if (dvCung.cungName) ctx += ' — Cung ' + dvCung.cungName;
    const dvStars = (dvCung.majorStars||[]).map(starName).filter(Boolean);
    if (dvStars.length) ctx += ' — Sao: ' + dvStars.join(', ');
    if (dv.scoring && dv.scoring.tong != null) ctx += ' — Điểm vận: ' + dv.scoring.tong + '/10 ' + (dv.scoring.flag||'');
    ctx += '\n';
  }

  ctx += '\nCác cung liên quan:\n';
  for (const p of palaces) {
    const pName = p.cungName || '';
    if (!relevant.has(pName) && !p.isMenh && !p.isThan) continue;
    ctx += '\n  [' + pName + '] ' + (p.diaChi||'') + (p.isMenh?' ★MỆNH':'') + (p.isThan?' ◆THÂN':'') + '\n';
    const chinh = (p.majorStars||[]).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '    Chính tinh: ' + chinh.join(', ') + '\n';
    const phu = (p.stars||[]).filter(s => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(starFmt).filter(Boolean);
    if (phu.length) ctx += '    Phụ tinh: ' + phu.slice(0,8).join(', ') + '\n';
    if (p.thaiTueNhom && p.thaiTueNhom.ten) ctx += '    Thái Tuế: ' + p.thaiTueNhom.ten + ' — ' + (p.thaiTueNhom.yNghia||'') + '\n';
    if (p.cungScores) {
      const s = p.cungScores;
      ctx += '    Điểm: TN=' + (s.tiemNang||0) + ' BV=' + (s.benVung||0) + ' AT=' + (s.anToan||0) + ' QN=' + (s.quyNhan||0) + '\n';
    }
  }

  if (relevant.has('__daiVan__') && ls.daiVans && ls.daiVans.length) {
    ctx += '\nDanh sách Đại Vận:\n';
    ls.daiVans.slice(0,9).forEach(function(dv, i) {
      const dvP = palaces[dv.cungIdx] || {};
      const stars = (dvP.majorStars||[]).map(starName).filter(Boolean);
      ctx += '  ĐV' + (i+1) + ': ' + (dv.diaChi||'') + ' ' + dv.tuoiStart + '–' + dv.tuoiEnd + 't cung=' + (dvP.cungName||'?');
      if (stars.length) ctx += ' sao=' + stars.join(',');
      if (dv.scoring && dv.scoring.tong != null) ctx += ' điểm=' + dv.scoring.tong + '/10';
      ctx += '\n';
    });
  }

  return ctx;
}

function extractLasoContext(lasoData, question) {
  if (!lasoData) return null;
  const q = (question || '').toLowerCase();

  // Chế độ tương hợp 2 lá số
  if (lasoData._mode === 'tuongHop' || lasoData._partnerLaso) {
    const lsA = lasoData._lsA || lasoData;
    const lsB = lasoData._lsB || lasoData._partnerLaso;
    const nameA = lasoData._nameA || lsA._nameA || 'Người A';
    const nameB = lasoData._nameB || lsA._nameB || 'Người B';
    let ctx = 'CHẾ ĐỘ: So sánh tương hợp 2 lá số\n';
    ctx += fmtLaso(lsA, nameA, q);
    ctx += fmtLaso(lsB, nameB, q);
    return ctx;
  }

  // Chế độ 1 lá số thông thường
  return fmtLaso(lasoData, 'Lá Số', q);
}

async function handleChat(req, res) {
  const { messages, lasoData } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' });

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasLaso = !!(
    lasoData?.palaces?.length ||        // single laso
    lasoData?._lsA?.palaces?.length ||  // dual mode wrapped
    (lasoData?._partnerLaso && lasoData?.palaces?.length) // dual mode spread
  );

  const lasoCtx = hasLaso ? extractLasoContext(lasoData, lastQ) : null;
  const isTuongHop = !!(lasoData?._mode === 'tuongHop' || lasoData?._partnerLaso);

  let systemPrompt;
  if (hasLaso && isTuongHop) {
    systemPrompt = CHAT_SYSTEM_LASO(lasoCtx) + `

Lưu ý đặc biệt: Đây là chế độ so sánh tương hợp 2 lá số. Khi trả lời, hãy:
- Phân tích mối tương quan giữa 2 lá số, không chỉ 1 người
- Dẫn chứng cụ thể từ cả 2 cung vị liên quan
- Nêu rõ điểm tương hợp, xung khắc nếu có
- Gợi ý thực tiễn cho cả 2 người`;
  } else if (hasLaso) {
    systemPrompt = CHAT_SYSTEM_LASO(lasoCtx);
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
