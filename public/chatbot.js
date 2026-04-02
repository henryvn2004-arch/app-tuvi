// public/chatbot.js
// Tử Vi Minh Bảo — Vấn Đáp Inline Chat
// Nhúng thành section ở cuối page, không phải FAB popup
//
// Cách dùng:
//   1. Đặt <div id="tuvi-chat-section"></div> ở cuối page (sau phần luận giải)
//   2. <script src="/chatbot.js"></script>
//   3. TuviChatbot.init({ getLasoData: () => window._lasoResult, apiPath: '/api/lasotuvi?action=chat' });

(function () {
  'use strict';

  const CSS = `
    .tuvi-chat-wrap {
      max-width: 860px;
      margin: 0 auto;
      padding: 0 0 80px;
      font-family: Arial, sans-serif;
    }
    .tuvi-chat-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 40px 0 20px;
      border-top: 2px solid #061A2E;
      margin-bottom: 4px;
    }
    .tuvi-chat-header-icon {
      width: 36px; height: 36px;
      background: #061A2E;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .tuvi-chat-header-text .title {
      font-family: 'Noto Serif', serif;
      font-size: 20px;
      font-weight: 600;
      color: #061A2E;
      line-height: 1.2;
    }
    .tuvi-chat-header-text .sub {
      font-size: 12px;
      color: #777;
      margin-top: 3px;
    }
    .tuvi-context-bar {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: #F5F4F0;
      border: 1px solid #E8E8E8;
      border-radius: 6px;
      font-size: 12px;
      color: #444;
      margin-bottom: 20px;
    }
    .tuvi-context-bar.visible { display: flex; }
    .tuvi-context-bar .dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #1E6B3C;
      flex-shrink: 0;
    }
    .tuvi-chat-messages {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }
    .tuvi-msg {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      animation: tuvi-in 0.18s ease;
    }
    @keyframes tuvi-in {
      from { opacity:0; transform:translateY(5px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .tuvi-msg.user { flex-direction: row-reverse; }
    .tuvi-msg-av {
      width: 30px; height: 30px;
      border-radius: 50%;
      background: #061A2E;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .tuvi-msg.user .tuvi-msg-av { background: #1455A4; }
    .tuvi-msg-bub {
      max-width: 76%;
      padding: 11px 15px;
      border-radius: 12px;
      font-size: 14.5px;
      line-height: 1.75;
      color: #1a1a1a;
    }
    .tuvi-msg.bot .tuvi-msg-bub {
      background: #F5F4F0;
      border-bottom-left-radius: 4px;
    }
    .tuvi-msg.user .tuvi-msg-bub {
      background: #061A2E;
      color: #F9F4EB;
      border-bottom-right-radius: 4px;
    }
    .tuvi-msg.typing .tuvi-msg-bub {
      display: flex; gap: 5px; align-items: center;
      padding: 14px 16px;
    }
    .tuvi-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #9A7B3A;
      animation: tuvi-bounce 1.2s infinite;
    }
    .tuvi-dot:nth-child(2) { animation-delay: 0.2s; }
    .tuvi-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes tuvi-bounce {
      0%,60%,100% { transform:translateY(0); opacity:0.5; }
      30% { transform:translateY(-5px); opacity:1; }
    }
    .tuvi-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .tuvi-sug {
      background: #fff;
      border: 1px solid #CCCCCC;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 13px;
      color: #1455A4;
      cursor: pointer;
      font-family: Arial, sans-serif;
      transition: background 0.15s, border-color 0.15s;
      line-height: 1.4;
    }
    .tuvi-sug:hover { background: #F5F4F0; border-color: #1455A4; }
    .tuvi-input-wrap {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      border: 1px solid #CCCCCC;
      border-radius: 10px;
      padding: 10px 12px;
      background: #fff;
      transition: border-color 0.15s;
    }
    .tuvi-input-wrap:focus-within { border-color: #061A2E; }
    .tuvi-textarea {
      flex: 1;
      border: none;
      outline: none;
      resize: none;
      font-size: 14.5px;
      font-family: Arial, sans-serif;
      line-height: 1.5;
      max-height: 120px;
      overflow-y: auto;
      background: transparent;
      color: #1a1a1a;
    }
    .tuvi-textarea::placeholder { color: #bbb; }
    .tuvi-send {
      width: 34px; height: 34px;
      border-radius: 8px;
      background: #061A2E;
      border: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .tuvi-send:hover { background: #0D3B5E; }
    .tuvi-send:disabled { background: #CCCCCC; cursor: not-allowed; }
    .tuvi-hint {
      font-size: 11px;
      color: #bbb;
      margin-top: 8px;
      text-align: right;
    }
    @media (max-width: 640px) {
      .tuvi-msg-bub { max-width: 88%; font-size: 14px; }
    }
  `;

  const SUGG_LASO = [
    'Tài chính của tôi năm nay thế nào?',
    'Sự nghiệp có thăng tiến không?',
    'Tình duyên ra sao?',
    'Đại vận hiện tại của tôi',
    'Điểm mạnh và yếu trong lá số?',
  ];
  const SUGG_GEN = [
    'Chính tinh là gì?',
    'Cách xem cung Tài Bạch',
    'Đại vận là gì?',
    'Thiên Đồng có ý nghĩa gì?',
    'Tam phương tứ chính là gì?',
  ];

  let _msgs = [];
  let _busy = false;
  let _cfg = {
    containerId: 'tuvi-chat-section',
    getLasoData: null,
    apiPath: '/api/lasotuvi?action=chat',
  };
  let $msgs, $ta, $send, $sugg, $ctxBar, $ctxTxt;

  function getLaso() { return _cfg.getLasoData ? _cfg.getLasoData() : null; }
  function getScenario() { return getLaso() ? 'laso' : 'general'; }

  function autoResize() {
    $ta.style.height = 'auto';
    $ta.style.height = Math.min($ta.scrollHeight, 120) + 'px';
  }

  function renderSugg(scenario, exclude) {
    const list = (scenario === 'laso' ? SUGG_LASO : SUGG_GEN)
      .filter(s => s !== exclude).slice(0, 4);
    $sugg.innerHTML = '';
    list.forEach(t => {
      const b = document.createElement('button');
      b.className = 'tuvi-sug';
      b.textContent = t;
      b.onclick = () => send(t);
      $sugg.appendChild(b);
    });
  }

  function appendMsg(role, content, isTyping) {
    const wrap = document.createElement('div');
    wrap.className = 'tuvi-msg ' + role + (isTyping ? ' typing' : '');
    if (isTyping) wrap.id = '_tuvi_typing';

    const av = document.createElement('div');
    av.className = 'tuvi-msg-av';
    av.innerHTML = role === 'bot'
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F9F4EB" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F9F4EB" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    const bub = document.createElement('div');
    bub.className = 'tuvi-msg-bub';
    if (isTyping) {
      bub.innerHTML = '<span class="tuvi-dot"></span><span class="tuvi-dot"></span><span class="tuvi-dot"></span>';
    } else {
      bub.innerHTML = content
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }

    wrap.appendChild(av);
    wrap.appendChild(bub);
    $msgs.appendChild(wrap);
    return wrap;
  }

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
      const lasoData = getLaso();
      const scenario = lasoData ? 'laso' : 'general';

      const res = await fetch(_cfg.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: _msgs.slice(-10),
          lasoData,
          scenario,
        }),
      });

      const typing = document.getElementById('_tuvi_typing');
      if (typing) typing.remove();

      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const answer = data.answer || 'Xin lỗi, có lỗi xảy ra.';

      appendMsg('bot', answer);
      _msgs.push({ role: 'assistant', content: answer });
      renderSugg(scenario, text);

    } catch (e) {
      const typing = document.getElementById('_tuvi_typing');
      if (typing) typing.remove();
      appendMsg('bot', 'Xin lỗi, có lỗi kết nối. Vui lòng thử lại.');
      console.error('[TuviChatbot]', e);
    }

    _busy = false;
    $send.disabled = !$ta.value.trim();
    $ta.focus();
  }

  function init(opts) {
    Object.assign(_cfg, opts || {});

    const container = document.getElementById(_cfg.containerId);
    if (!container) {
      console.warn('[TuviChatbot] Không tìm thấy #' + _cfg.containerId);
      return;
    }

    const scenario = getScenario();
    const laso = getLaso();
    const ctxText = laso?.canChiNam
      ? `Đang luận giải theo lá số ${laso.canChiNam} của bạn`
      : 'Đang dùng dữ liệu lá số của bạn';
    const subText = scenario === 'laso'
      ? 'Hỏi thêm về lá số vừa xem'
      : 'Hỏi bất cứ điều gì về Tử Vi Đẩu Số';

    container.innerHTML = `
      <style>${CSS}</style>
      <div class="tuvi-chat-wrap">
        <div class="tuvi-chat-header">
          <div class="tuvi-chat-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F9F4EB" stroke-width="2" stroke-linecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="tuvi-chat-header-text">
            <div class="title">Vấn Đáp Tử Vi</div>
            <div class="sub">${subText}</div>
          </div>
        </div>
        <div class="tuvi-context-bar ${scenario === 'laso' ? 'visible' : ''}" id="_tuvi_ctx">
          <span class="dot"></span>
          <span id="_tuvi_ctx_txt">${ctxText}</span>
        </div>
        <div class="tuvi-chat-messages" id="_tuvi_msgs"></div>
        <div class="tuvi-suggestions" id="_tuvi_sugg"></div>
        <div class="tuvi-input-wrap">
          <textarea id="_tuvi_ta" class="tuvi-textarea" rows="1" maxlength="500"
            placeholder="Hỏi về lá số của bạn..."></textarea>
          <button id="_tuvi_send" class="tuvi-send" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div class="tuvi-hint">Enter để gửi · Shift+Enter xuống dòng</div>
      </div>
    `;

    $msgs  = document.getElementById('_tuvi_msgs');
    $ta    = document.getElementById('_tuvi_ta');
    $send  = document.getElementById('_tuvi_send');
    $sugg  = document.getElementById('_tuvi_sugg');
    $ctxBar = document.getElementById('_tuvi_ctx');
    $ctxTxt = document.getElementById('_tuvi_ctx_txt');

    const welcome = scenario === 'laso'
      ? 'Chào bạn! Tôi đã xem qua lá số của bạn và sẵn sàng giải đáp thêm về bất kỳ cung vị, vấn đề hay giai đoạn nào bạn muốn tìm hiểu sâu hơn.'
      : 'Chào bạn! Bạn có thể hỏi tôi về bất kỳ khái niệm, sao tinh, cung vị hay phương pháp luận nào trong Tử Vi Đẩu Số.';
    appendMsg('bot', welcome);
    _msgs.push({ role: 'assistant', content: welcome });
    renderSugg(scenario);

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

    const laso = getLaso();
    const scenario = laso ? 'laso' : 'general';

    if ($ctxBar) {
      scenario === 'laso'
        ? $ctxBar.classList.add('visible')
        : $ctxBar.classList.remove('visible');
      if ($ctxTxt && laso?.canChiNam)
        $ctxTxt.textContent = `Đang luận giải theo lá số ${laso.canChiNam} của bạn`;
    }

    $msgs.innerHTML = '';
    const welcome = scenario === 'laso'
      ? 'Lá số đã được cập nhật. Bạn muốn hỏi thêm điều gì?'
      : 'Chào bạn! Bạn có thể hỏi tôi về bất kỳ khái niệm nào trong Tử Vi Đẩu Số.';
    appendMsg('bot', welcome);
    _msgs.push({ role: 'assistant', content: welcome });
    renderSugg(scenario);
  }

  window.TuviChatbot = { init, reset };
})();
