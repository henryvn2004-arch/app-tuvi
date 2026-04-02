// public/chatbot.js
// Tử Vi Minh Bảo — Vấn Đáp Inline Chat
// Hỗ trợ: 1 lá số (index/luan-giai) hoặc 2 lá số so sánh (xem-tuoi/xem-lam-an)
//
// Cách dùng:
//   1. Đặt <div id="tuvi-chat-section"></div> sau phần luận giải
//   2. <script src="/chatbot.js"></script>
//   3. TuviChatbot.init({ getLasoData: () => ..., apiPath: '...' });
//
// Cho xem-tuoi/xem-lam-an, getLasoData trả về:
//   { ...lsA, _partnerLaso: lsB }

(function () {
  'use strict';

  const CSS = `
    /* ── Wrapper ── */
    .tvc-wrap {
      font-family: Arial, sans-serif;
      padding: 48px 0 64px;
      border-top: 2px solid #061A2E;
      margin-top: 8px;
    }

    /* ── Header ── */
    .tvc-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }
    .tvc-header-icon {
      width: 40px; height: 40px;
      background: #061A2E;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .tvc-header-title {
      font-size: 20px;
      font-weight: 700;
      color: #061A2E;
      line-height: 1.2;
      font-family: 'Noto Serif', Georgia, serif;
    }
    .tvc-header-sub {
      font-size: 12px;
      color: #777;
      margin-top: 3px;
      line-height: 1.4;
    }

    /* ── Context chips ── */
    .tvc-ctx-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
    }
    .tvc-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      border: 1.5px solid;
    }
    .tvc-chip-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Chat box ── */
    .tvc-box {
      border: 1.5px solid #CCCCCC;
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 4px 24px rgba(6,26,46,0.07);
    }

    /* ── Messages area ── */
    .tvc-messages {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 20px 20px 8px;
      min-height: 180px;
      max-height: 420px;
      overflow-y: auto;
      background: #FAFAF8;
    }
    .tvc-messages::-webkit-scrollbar { width: 4px; }
    .tvc-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }

    .tvc-msg {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      animation: tvc-in 0.18s ease;
      margin-bottom: 14px;
    }
    @keyframes tvc-in {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .tvc-msg.user { flex-direction: row-reverse; }

    .tvc-av {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 700;
    }
    .tvc-msg.bot  .tvc-av { background: #061A2E; color: #c9a84c; }
    .tvc-msg.user .tvc-av { background: #1455A4; color: #fff; }

    .tvc-bub {
      max-width: 72%;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.75;
      border-radius: 14px;
      position: relative;
    }
    .tvc-msg.bot .tvc-bub {
      background: #fff;
      color: #1a1a1a;
      border: 1px solid #E8E8E8;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .tvc-msg.user .tvc-bub {
      background: #061A2E;
      color: #F9F4EB;
      border-bottom-right-radius: 4px;
    }

    /* Typing dots */
    .tvc-msg.typing .tvc-bub {
      display: flex;
      gap: 5px;
      align-items: center;
      padding: 14px 16px;
    }
    .tvc-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #9A7B3A;
      animation: tvc-bounce 1.2s infinite;
    }
    .tvc-dot:nth-child(2) { animation-delay: 0.18s; }
    .tvc-dot:nth-child(3) { animation-delay: 0.36s; }
    @keyframes tvc-bounce {
      0%,60%,100% { transform:translateY(0); opacity:0.4; }
      30% { transform:translateY(-5px); opacity:1; }
    }

    /* ── Divider between messages area and input ── */
    .tvc-divider {
      height: 1px;
      background: #E8E8E8;
      margin: 0 16px;
    }

    /* ── Suggestions ── */
    .tvc-sugg-wrap {
      padding: 12px 16px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .tvc-sug {
      background: #F5F4F0;
      border: 1px solid #E0DDD8;
      border-radius: 16px;
      padding: 5px 13px;
      font-size: 12.5px;
      color: #1455A4;
      cursor: pointer;
      font-family: Arial, sans-serif;
      transition: all 0.13s;
      line-height: 1.4;
    }
    .tvc-sug:hover {
      background: #EBF3FF;
      border-color: #1455A4;
    }

    /* ── Input row ── */
    .tvc-input-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      padding: 12px 16px 14px;
    }
    .tvc-textarea {
      flex: 1;
      border: 1.5px solid #CCCCCC;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 14px;
      font-family: Arial, sans-serif;
      line-height: 1.5;
      resize: none;
      max-height: 110px;
      overflow-y: auto;
      background: #FAFAF8;
      color: #1a1a1a;
      outline: none;
      transition: border-color 0.15s;
    }
    .tvc-textarea:focus { border-color: #061A2E; background: #fff; }
    .tvc-textarea::placeholder { color: #bbb; }

    .tvc-send {
      width: 38px; height: 38px;
      border-radius: 9px;
      background: #061A2E;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.1s;
    }
    .tvc-send:hover:not(:disabled) { background: #0D3B5E; transform: scale(1.05); }
    .tvc-send:disabled { background: #C4C4C4; cursor: not-allowed; transform: none; }

    .tvc-hint {
      text-align: right;
      font-size: 10px;
      color: #C4C4C4;
      padding: 0 16px 10px;
      letter-spacing: 0.3px;
    }

    @media (max-width: 640px) {
      .tvc-bub { max-width: 85%; font-size: 13.5px; }
      .tvc-messages { max-height: 320px; }
    }
  `;

  // Suggestions theo loại
  const SUGG = {
    laso: [
      'Tài chính năm nay thế nào?',
      'Sự nghiệp có thăng tiến không?',
      'Tình duyên ra sao?',
      'Đại vận hiện tại của tôi',
      'Điểm mạnh và yếu trong lá số?',
    ],
    tuongHop: [
      'Hai người có hợp không?',
      'Điểm xung khắc lớn nhất?',
      'Tài chính chung ra sao?',
      'Giai đoạn khó khăn nào cần lưu ý?',
      'Cách hỗ trợ nhau tốt hơn?',
    ],
    general: [
      'Chính tinh là gì?',
      'Cách xem cung Tài Bạch',
      'Đại vận là gì?',
      'Tam phương tứ chính là gì?',
    ],
  };

  let _msgs   = [];
  let _busy   = false;
  let _cfg    = {
    containerId: 'tuvi-chat-section',
    getLasoData: null,
    apiPath: '/api/lasotuvi?action=chat',
  };
  let $msgs, $ta, $send, $sugg;

  // ── Helpers ──────────────────────────────────────────────────

  function getLaso()    { return _cfg.getLasoData ? _cfg.getLasoData() : null; }
  function getPartner() { const d = getLaso(); return d?._partnerLaso || null; }
  function getMode()    {
    const d = getLaso();
    if (!d) return 'general';
    return d._partnerLaso ? 'tuongHop' : 'laso';
  }

  // Build ngắn gọn context text của 1 lá số để hiển thị chip
  function lasoChipText(ls) {
    if (!ls) return '';
    const menh = ls.palaces?.find(p => p.isMenh);
    const chinh = (menh?.majorStars || []).map(s => s.ten).join(', ') || 'VCĐ';
    return `${ls.canChiNam || ''} · Mệnh ${ls.menhDC || ''} · ${chinh}`;
  }

  // Build full context string gửi lên API — gộp cả 2 lá số nếu có
  // Slim down 1 lá số thành object gọn cho API (~10KB thay vì ~500KB)
  function slimLaso(ls) {
    if (!ls) return null;
    const palaces = (ls.palaces || []).map(p => ({
      cungName:   p.cungName,
      diaChi:     p.diaChi,
      isMenh:     p.isMenh || false,
      isThan:     p.isThan || false,
      majorStars: (p.majorStars || []).map(s => ({
        ten: s.ten, brightness: s.brightness, hoa: s.hoa
      })),
      stars: (p.stars || []).slice(0, 12).map(s => ({
        ten: s.ten, nhom: s.nhom, hoa: s.hoa
      })),
      thaiTueNhom: p.thaiTueNhom ? {
        ten: p.thaiTueNhom.ten, yNghia: p.thaiTueNhom.yNghia
      } : null,
      cungScores: p.cungScores || null,
    }));

    const daiVans = (ls.daiVans || []).slice(0, 9).map(dv => ({
      diaChi: dv.diaChi, tuoiStart: dv.tuoiStart, tuoiEnd: dv.tuoiEnd,
      cungIdx: dv.cungIdx,
      scoring: dv.scoring ? { tong: dv.scoring.tong, flag: dv.scoring.flag } : null,
    }));

    const dvHT = ls.daiVanHienTai;
    return {
      canChiNam:     ls.canChiNam,
      napAm:         ls.napAm,
      napAmHanh:     ls.napAmHanh,
      menhDC:        ls.menhDC,
      thanDC:        ls.thanDC,
      tuoiXem:       ls.tuoiXem,
      cachCuc:       (ls.cachCuc || []).map(c => ({ ten: typeof c === 'object' ? c.ten : c })),
      palaces,
      daiVans,
      daiVanHienTai: dvHT ? {
        diaChi: dvHT.diaChi, tuoiStart: dvHT.tuoiStart, tuoiEnd: dvHT.tuoiEnd,
        cungIdx: dvHT.cungIdx,
        scoring: dvHT.scoring ? { tong: dvHT.scoring.tong, flag: dvHT.scoring.flag } : null,
      } : null,
    };
  }

  function buildLasoContext() {
    const lsA = getLaso();
    if (!lsA) return null;
    const lsB = getPartner();

    if (!lsB) {
      // Single lá số — slim down trước khi gửi
      return slimLaso(lsA);
    }

    // Dual lá số — gửi cả 2 slim objects
    return {
      _mode:  'tuongHop',
      _nameA: lsA._nameA || 'Người A',
      _nameB: lsA._nameB || 'Người B',
      _lsA:   slimLaso(lsA),
      _lsB:   slimLaso(lsB),
      // palaces của lsA để API detect hasLaso
      palaces: (lsA.palaces || []).slice(0, 1),
    };
  }

  // Tóm tắt ngắn 1 lá số thành text cho AI
  function summarizeLaso(ls, name) {
    if (!ls) return '';
    const menh  = ls.palaces?.find(p => p.isMenh);
    const chinh = (menh?.majorStars || []).map(s =>
      s.ten + (s.brightness ? `(${s.brightness})` : '') + (s.hoa ? `[Hóa ${s.hoa}]` : '')
    ).join(', ') || 'Vô chính diệu';
    const dvHT  = ls.daiVanHienTai;
    const cc    = (ls.cachCuc || []).map(c => c.ten).join(', ');

    const lines = [
      `=== ${name} ===`,
      `Năm sinh: ${ls.canChiNam || ''} | Bản mệnh: ${ls.napAm || ''} | Cục: ${ls.cuc || ''}`,
      `Cung Mệnh: ${ls.menhDC || ''} | Cung Thân: ${ls.thanDC || ''}`,
      `Chính tinh Mệnh: ${chinh}`,
      dvHT ? `Đại vận hiện tại: ${dvHT.diaChi} (${dvHT.tuoiStart}–${dvHT.tuoiEnd}t) · ${dvHT.scoring?.flag || ''} ${dvHT.scoring?.tong || ''}/10` : '',
      cc ? `Cách cục: ${cc}` : '',
    ];

    // Thêm các cung quan trọng
    const keyCungs = ['Phu Thê','Quan Lộc','Tài Bạch','Phúc Đức','Nô Bộc'];
    keyCungs.forEach(cungName => {
      const pal = ls.palaces?.find(p => p.cungName === cungName);
      if (pal) {
        const stars = (pal.majorStars || []).map(s => s.ten).join(', ') || 'VCĐ';
        lines.push(`${cungName}: ${pal.diaChi} · ${stars}`);
      }
    });

    return lines.filter(Boolean).join('\n');
  }

  function autoResize() {
    $ta.style.height = 'auto';
    $ta.style.height = Math.min($ta.scrollHeight, 110) + 'px';
  }

  function scrollToBottom() {
    if ($msgs) $msgs.scrollTop = $msgs.scrollHeight;
  }

  function renderSugg(mode, exclude) {
    const list = (SUGG[mode] || SUGG.general)
      .filter(s => s !== exclude)
      .slice(0, 4);
    $sugg.innerHTML = '';
    list.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tvc-sug';
      b.textContent = t;
      b.onclick = () => send(t);
      $sugg.appendChild(b);
    });
  }

  function appendMsg(role, content, isTyping) {
    const wrap = document.createElement('div');
    wrap.className = 'tvc-msg ' + role + (isTyping ? ' typing' : '');
    if (isTyping) wrap.id = '_tvc_typing';

    const av = document.createElement('div');
    av.className = 'tvc-av';
    av.textContent = role === 'bot' ? '✦' : 'Bạn';

    const bub = document.createElement('div');
    bub.className = 'tvc-bub';

    if (isTyping) {
      bub.innerHTML = '<span class="tvc-dot"></span><span class="tvc-dot"></span><span class="tvc-dot"></span>';
    } else {
      bub.innerHTML = content
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }

    wrap.appendChild(av);
    wrap.appendChild(bub);
    $msgs.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  // ── Send ──────────────────────────────────────────────────────

  async function send(text) {
    text = (text || $ta.value).trim();
    if (!text || _busy) return;

    $ta.value = '';
    autoResize();
    $send.disabled = true;
    $sugg.innerHTML = '';

    appendMsg('user', text);
    _msgs.push({ role: 'user', content: text });

    _busy = true;
    appendMsg('bot', '', true);

    try {
      const lasoData  = buildLasoContext();
      const mode      = getMode();

      const res = await fetch(_cfg.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: _msgs.slice(-12),
          lasoData,
          scenario: mode,
        }),
      });

      const typing = document.getElementById('_tvc_typing');
      if (typing) typing.remove();

      if (!res.ok) throw new Error(res.status);
      const data   = await res.json();
      const answer = data.answer || 'Xin lỗi, có lỗi xảy ra.';

      appendMsg('bot', answer);
      _msgs.push({ role: 'assistant', content: answer });
      renderSugg(mode, text);

    } catch (e) {
      const typing = document.getElementById('_tvc_typing');
      if (typing) typing.remove();
      appendMsg('bot', 'Xin lỗi, có lỗi kết nối. Vui lòng thử lại.');
      console.error('[TuviChatbot]', e);
    }

    _busy = false;
    $send.disabled = !$ta.value.trim();
    $ta.focus();
  }

  // ── Init ─────────────────────────────────────────────────────

  function init(opts) {
    Object.assign(_cfg, opts || {});
    _msgs = [];

    const container = document.getElementById(_cfg.containerId);
    if (!container) {
      console.warn('[TuviChatbot] Không tìm thấy #' + _cfg.containerId);
      return;
    }

    const lsA    = getLaso();
    const lsB    = getPartner();
    const mode   = getMode();

    // Build chips
    let chipsHTML = '';
    if (mode === 'tuongHop' && lsA && lsB) {
      const nameA = lsA._nameA || 'Người A';
      const nameB = lsA._nameB || 'Người B';
      chipsHTML = `
        <div class="tvc-ctx-chips">
          <div class="tvc-chip" style="background:#EBF3FF;border-color:#1455A4;color:#1455A4">
            <div class="tvc-chip-dot" style="background:#1455A4"></div>
            <span>${nameA} — ${lsA.canChiNam || ''} · Mệnh ${lsA.menhDC || ''}</span>
          </div>
          <div class="tvc-chip" style="background:#FFF3E0;border-color:#9A7B3A;color:#7a5a1a">
            <div class="tvc-chip-dot" style="background:#9A7B3A"></div>
            <span>${nameB} — ${lsB.canChiNam || ''} · Mệnh ${lsB.menhDC || ''}</span>
          </div>
          <div class="tvc-chip" style="background:#F0FFF4;border-color:#1E6B3C;color:#1E6B3C">
            <div class="tvc-chip-dot" style="background:#1E6B3C"></div>
            <span>Đang phân tích tương hợp 2 lá số</span>
          </div>
        </div>`;
    } else if (mode === 'laso' && lsA) {
      chipsHTML = `
        <div class="tvc-ctx-chips">
          <div class="tvc-chip" style="background:#EBF3FF;border-color:#1455A4;color:#1455A4">
            <div class="tvc-chip-dot" style="background:#1455A4"></div>
            <span>Lá số ${lsA.canChiNam || ''} · Mệnh ${lsA.menhDC || ''} · ${lsA.napAm || ''}</span>
          </div>
        </div>`;
    }

    // Sub text
    const subText = mode === 'tuongHop'
      ? 'Hỏi thêm về tương hợp, xung khắc và gợi ý cho 2 lá số'
      : mode === 'laso'
        ? 'Hỏi thêm về lá số vừa xem'
        : 'Hỏi bất cứ điều gì về Tử Vi Đẩu Số';

    // Welcome message
    const welcome = mode === 'tuongHop'
      ? `Tôi đã phân tích xong 2 lá số. Bạn muốn hỏi thêm điều gì về tương hợp, những điểm cần lưu ý, hay giai đoạn vận hạn chung?`
      : mode === 'laso'
        ? 'Tôi đã xem qua lá số của bạn. Bạn muốn tìm hiểu sâu hơn về cung vị, sao tinh, hay giai đoạn vận hạn nào?'
        : 'Chào bạn! Bạn có thể hỏi tôi về bất kỳ khái niệm, sao tinh hay cung vị nào trong Tử Vi Đẩu Số.';

    container.innerHTML = `
      <style>${CSS}</style>
      <div class="tvc-wrap">
        <div class="tvc-header">
          <div class="tvc-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div class="tvc-header-title">Vấn Đáp Tử Vi</div>
            <div class="tvc-header-sub">${subText}</div>
          </div>
        </div>

        ${chipsHTML}

        <div class="tvc-box">
          <div class="tvc-messages" id="_tvc_msgs"></div>
          <div class="tvc-divider"></div>
          <div class="tvc-sugg-wrap" id="_tvc_sugg"></div>
          <div class="tvc-input-row">
            <textarea id="_tvc_ta" class="tvc-textarea" rows="1" maxlength="600"
              placeholder="${mode === 'tuongHop' ? 'Hỏi về tương hợp 2 lá số...' : 'Hỏi về lá số của bạn...'}"></textarea>
            <button id="_tvc_send" class="tvc-send" disabled aria-label="Gửi">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div class="tvc-hint">Enter để gửi · Shift+Enter xuống dòng</div>
        </div>
      </div>
    `;

    $msgs = document.getElementById('_tvc_msgs');
    $ta   = document.getElementById('_tvc_ta');
    $send = document.getElementById('_tvc_send');
    $sugg = document.getElementById('_tvc_sugg');

    appendMsg('bot', welcome);
    _msgs.push({ role: 'assistant', content: welcome });
    renderSugg(mode);

    $ta.addEventListener('input', () => {
      autoResize();
      $send.disabled = !$ta.value.trim();
    });
    $ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!$send.disabled) send();
      }
    });
    $send.addEventListener('click', () => send());
  }

  function reset() {
    _msgs = [];
    if (!$msgs) return;
    const mode = getMode();
    $msgs.innerHTML = '';
    const welcome = mode === 'tuongHop'
      ? 'Lá số đã được cập nhật. Bạn muốn hỏi thêm điều gì về tương hợp?'
      : mode === 'laso'
        ? 'Lá số đã được cập nhật. Bạn muốn hỏi thêm điều gì?'
        : 'Chào bạn! Bạn có thể hỏi tôi về Tử Vi Đẩu Số.';
    appendMsg('bot', welcome);
    _msgs.push({ role: 'assistant', content: welcome });
    renderSugg(mode);
  }

  window.TuviChatbot = { init, reset };
})();
