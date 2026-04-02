// public/chatbot.js
// Tử Vi Minh Bảo — Chatbot Vấn Đáp
// Embed vào: index.html, xem-tuoi.html, xem-lam-an.html, blog.html, và bất kỳ page nào
//
// Cách dùng:
//   <script src="/chatbot.js"></script>
//   TuviChatbot.init({ scenario: 'laso', getLasoData: () => window._currentLasoData });
//   TuviChatbot.init({ scenario: 'general' });
//   TuviChatbot.init(); // auto-detect

(function () {
  'use strict';

  // ─── CSS ───────────────────────────────────────────────────────────────────

  const CSS = `
    #tuvi-chat-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9998;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #1455A4;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(20,85,164,0.38);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      outline: none;
    }
    #tuvi-chat-fab:hover {
      transform: scale(1.07);
      box-shadow: 0 6px 22px rgba(20,85,164,0.48);
    }
    #tuvi-chat-fab svg { pointer-events: none; }
    #tuvi-chat-fab .fab-badge {
      position: absolute;
      top: -3px; right: -3px;
      width: 14px; height: 14px;
      background: #9A7B3A;
      border-radius: 50%;
      border: 2px solid #fff;
      display: none;
    }
    #tuvi-chat-fab.has-unread .fab-badge { display: block; }

    #tuvi-chat-panel {
      position: fixed;
      bottom: 92px;
      right: 28px;
      z-index: 9999;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #fff;
      border: 1px solid #CCCCCC;
      border-radius: 14px;
      box-shadow: 0 8px 40px rgba(6,26,46,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(12px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    #tuvi-chat-panel.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* Header */
    #tuvi-chat-header {
      background: #061A2E;
      padding: 13px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #tuvi-chat-header .avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #1455A4;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #tuvi-chat-header .avatar svg { display: block; }
    #tuvi-chat-header .info { flex: 1; min-width: 0; }
    #tuvi-chat-header .info .name {
      font-family: 'Noto Serif', serif;
      color: #F9F4EB;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
    }
    #tuvi-chat-header .info .subtitle {
      color: #9A7B3A;
      font-size: 11px;
      margin-top: 1px;
    }
    #tuvi-chat-close {
      background: none; border: none; cursor: pointer;
      color: #777; padding: 4px;
      border-radius: 4px;
      line-height: 0;
      transition: color 0.15s;
    }
    #tuvi-chat-close:hover { color: #F9F4EB; }

    /* Context badge */
    #tuvi-chat-context {
      background: #F5F4F0;
      border-bottom: 1px solid #E8E8E8;
      padding: 7px 14px;
      font-size: 11px;
      color: #444;
      display: none;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
    }
    #tuvi-chat-context.visible { display: flex; }
    #tuvi-chat-context .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #1E6B3C;
      flex-shrink: 0;
    }

    /* Messages */
    #tuvi-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 14px 6px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    #tuvi-chat-messages::-webkit-scrollbar { width: 4px; }
    #tuvi-chat-messages::-webkit-scrollbar-thumb { background: #E8E8E8; border-radius: 2px; }

    .chat-msg {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      animation: msgIn 0.2s ease;
    }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .chat-msg.user { flex-direction: row-reverse; }

    .chat-msg .msg-avatar {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: #061A2E;
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px;
      color: #F9F4EB;
    }
    .chat-msg.user .msg-avatar { background: #1455A4; }

    .chat-msg .bubble {
      max-width: 82%;
      padding: 9px 12px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    .chat-msg.bot .bubble {
      background: #F5F4F0;
      border-bottom-left-radius: 4px;
    }
    .chat-msg.user .bubble {
      background: #1455A4;
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    /* Typing indicator */
    .chat-typing .bubble {
      display: flex; gap: 4px; align-items: center;
      padding: 12px 14px;
    }
    .chat-typing .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #9A7B3A;
      animation: typingBounce 1.2s infinite;
    }
    .chat-typing .dot:nth-child(2) { animation-delay: 0.2s; }
    .chat-typing .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typingBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    /* Suggestions */
    #tuvi-chat-suggestions {
      padding: 4px 14px 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex-shrink: 0;
    }
    .chat-suggestion {
      background: none;
      border: 1px solid #CCCCCC;
      border-radius: 20px;
      padding: 4px 11px;
      font-size: 12px;
      color: #1455A4;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .chat-suggestion:hover {
      background: #F5F4F0;
      border-color: #1455A4;
    }

    /* Input area */
    #tuvi-chat-input-area {
      padding: 10px 12px 12px;
      border-top: 1px solid #E8E8E8;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-shrink: 0;
      background: #fff;
    }
    #tuvi-chat-input {
      flex: 1;
      border: 1px solid #CCCCCC;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 13.5px;
      font-family: Arial, sans-serif;
      resize: none;
      outline: none;
      max-height: 100px;
      overflow-y: auto;
      line-height: 1.4;
      transition: border-color 0.15s;
    }
    #tuvi-chat-input:focus { border-color: #1455A4; }
    #tuvi-chat-input::placeholder { color: #aaa; }

    #tuvi-chat-send {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: #1455A4;
      border: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.15s;
    }
    #tuvi-chat-send:hover { background: #0D3B5E; transform: scale(1.05); }
    #tuvi-chat-send:disabled { background: #CCCCCC; cursor: not-allowed; transform: none; }

    /* Divider */
    .chat-divider {
      text-align: center;
      font-size: 11px;
      color: #aaa;
      margin: 4px 0;
      position: relative;
    }
    .chat-divider::before, .chat-divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 30%;
      height: 1px;
      background: #E8E8E8;
    }
    .chat-divider::before { left: 0; }
    .chat-divider::after { right: 0; }

    @media (max-width: 440px) {
      #tuvi-chat-panel {
        bottom: 0; right: 0;
        width: 100vw;
        max-width: 100vw;
        height: 85vh;
        border-radius: 14px 14px 0 0;
      }
      #tuvi-chat-fab { bottom: 20px; right: 16px; }
    }
  `;

  // ─── HTML template ────────────────────────────────────────────────────────

  const HTML = `
    <style>${CSS}</style>

    <!-- FAB -->
    <button id="tuvi-chat-fab" aria-label="Mở hộp thoại vấn đáp Tử Vi" title="Vấn Đáp Tử Vi">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="fab-badge"></span>
    </button>

    <!-- Panel -->
    <div id="tuvi-chat-panel" role="dialog" aria-label="Vấn Đáp Tử Vi Minh Bảo">
      <div id="tuvi-chat-header">
        <div class="avatar">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F9F4EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </div>
        <div class="info">
          <div class="name">Vấn Đáp Tử Vi</div>
          <div class="subtitle" id="tuvi-chat-subtitle">Hỏi bất cứ điều gì về Tử Vi Đẩu Số</div>
        </div>
        <button id="tuvi-chat-close" aria-label="Đóng">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div id="tuvi-chat-context">
        <span class="dot"></span>
        <span id="tuvi-chat-context-text">Đang dùng dữ liệu lá số của bạn</span>
      </div>

      <div id="tuvi-chat-messages"></div>

      <div id="tuvi-chat-suggestions"></div>

      <div id="tuvi-chat-input-area">
        <textarea id="tuvi-chat-input" placeholder="Hỏi về Tử Vi..." rows="1" maxlength="500"></textarea>
        <button id="tuvi-chat-send" disabled aria-label="Gửi">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // ─── State ─────────────────────────────────────────────────────────────────

  let _open = false;
  let _loading = false;
  let _messages = []; // {role, content}
  let _config = {
    scenario: 'auto', // 'laso' | 'general' | 'auto'
    getLasoData: null, // function returning lasoData object
    apiPath: '/api/chatbot',
  };

  // Suggestions per scenario
  const SUGGESTIONS_LASO = [
    'Tài chính của tôi thế nào?',
    'Sự nghiệp có thăng tiến không?',
    'Tình duyên ra sao?',
    'Vận hạn hiện tại của tôi',
    'Cung Mệnh của tôi có sao gì đặc biệt?',
  ];
  const SUGGESTIONS_GENERAL = [
    'Chính tinh là gì?',
    'Cách xem cung Tài Bạch',
    'Đại vận là gì?',
    'Thiên Đồng là sao gì?',
    'Sao Tử Vi có ý nghĩa gì?',
  ];

  // ─── DOM refs ─────────────────────────────────────────────────────────────

  let $fab, $panel, $messages, $input, $send, $suggestions, $context, $contextText, $subtitle;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function scrollToBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  function autoResize() {
    $input.style.height = 'auto';
    $input.style.height = Math.min($input.scrollHeight, 100) + 'px';
  }

  function renderSuggestions(scenario) {
    const list = scenario === 'laso' ? SUGGESTIONS_LASO : SUGGESTIONS_GENERAL;
    $suggestions.innerHTML = '';
    list.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'chat-suggestion';
      btn.textContent = text;
      btn.onclick = () => sendMessage(text);
      $suggestions.appendChild(btn);
    });
  }

  function appendMsg(role, content, isTyping = false) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg ' + role + (isTyping ? ' chat-typing' : '');
    if (isTyping) wrap.id = 'tuvi-typing';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    if (role === 'bot') {
      avatar.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3"/></svg>`;
    } else {
      avatar.textContent = '你';
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (isTyping) {
      bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    } else {
      // Format: newlines → <br>, **bold**
      bubble.innerHTML = content
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    $messages.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function removeTyping() {
    const el = document.getElementById('tuvi-typing');
    if (el) el.remove();
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  async function sendMessage(text) {
    text = (text || $input.value).trim();
    if (!text || _loading) return;

    $input.value = '';
    autoResize();
    $send.disabled = true;
    $suggestions.innerHTML = '';

    appendMsg('user', text);
    _messages.push({ role: 'user', content: text });

    _loading = true;
    appendMsg('bot', '', true);

    try {
      const lasoData = _config.getLasoData ? _config.getLasoData() : null;
      const scenario = _config.scenario === 'auto'
        ? (lasoData ? 'laso' : 'general')
        : _config.scenario;

      const res = await fetch(_config.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: _messages, lasoData, scenario }),
      });

      removeTyping();

      if (!res.ok) throw new Error('Server error ' + res.status);

      const data = await res.json();
      const answer = data.answer || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.';

      appendMsg('bot', answer);
      _messages.push({ role: 'assistant', content: answer });

      // Show suggestions again (fewer)
      const list = scenario === 'laso' ? SUGGESTIONS_LASO : SUGGESTIONS_GENERAL;
      const remaining = list.filter(s => s.toLowerCase() !== text.toLowerCase()).slice(0, 3);
      $suggestions.innerHTML = '';
      remaining.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'chat-suggestion';
        btn.textContent = s;
        btn.onclick = () => sendMessage(s);
        $suggestions.appendChild(btn);
      });

    } catch (err) {
      removeTyping();
      appendMsg('bot', 'Xin lỗi, có lỗi kết nối. Vui lòng thử lại.');
      console.error('Chatbot error:', err);
    }

    _loading = false;
    $send.disabled = false;
    $input.focus();
  }

  // ─── Open / Close ─────────────────────────────────────────────────────────

  function open() {
    _open = true;
    $panel.classList.add('open');
    $fab.classList.remove('has-unread');
    $input.focus();

    // Determine scenario
    const lasoData = _config.getLasoData ? _config.getLasoData() : null;
    const scenario = _config.scenario === 'auto'
      ? (lasoData ? 'laso' : 'general')
      : _config.scenario;

    // Context badge
    if (scenario === 'laso' && lasoData) {
      $context.classList.add('visible');
      $subtitle.textContent = 'Luận giải theo lá số của bạn';
      const canChi = lasoData.canChiNam || '';
      if (canChi) $contextText.textContent = `Đang dùng dữ liệu lá số ${canChi} của bạn`;
    } else {
      $context.classList.remove('visible');
      $subtitle.textContent = 'Hỏi bất cứ điều gì về Tử Vi Đẩu Số';
    }

    // First open: show welcome + suggestions
    if (_messages.length === 0) {
      const welcome = scenario === 'laso'
        ? 'Chào bạn! Tôi đang xem lá số của bạn và có thể giải đáp thêm về bất kỳ cung vị hay vấn đề nào bạn muốn tìm hiểu sâu hơn.'
        : 'Chào bạn! Tôi là trợ lý Tử Vi Đẩu Số của Tử Vi Minh Bảo. Bạn có thể hỏi về bất kỳ khái niệm, sao tinh, cung vị, hay phương pháp luận nào trong Tử Vi.';
      appendMsg('bot', welcome);
      _messages.push({ role: 'assistant', content: welcome });
      renderSuggestions(scenario);
    }
  }

  function close() {
    _open = false;
    $panel.classList.remove('open');
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init(opts = {}) {
    Object.assign(_config, opts);

    // Inject HTML
    const container = document.createElement('div');
    container.id = 'tuvi-chatbot-root';
    container.innerHTML = HTML;
    document.body.appendChild(container);

    // Cache refs
    $fab = document.getElementById('tuvi-chat-fab');
    $panel = document.getElementById('tuvi-chat-panel');
    $messages = document.getElementById('tuvi-chat-messages');
    $input = document.getElementById('tuvi-chat-input');
    $send = document.getElementById('tuvi-chat-send');
    $suggestions = document.getElementById('tuvi-chat-suggestions');
    $context = document.getElementById('tuvi-chat-context');
    $contextText = document.getElementById('tuvi-chat-context-text');
    $subtitle = document.getElementById('tuvi-chat-subtitle');

    // Events
    $fab.addEventListener('click', () => _open ? close() : open());
    document.getElementById('tuvi-chat-close').addEventListener('click', close);

    $input.addEventListener('input', () => {
      autoResize();
      $send.disabled = !$input.value.trim();
    });

    $input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!$send.disabled) sendMessage();
      }
    });

    $send.addEventListener('click', () => sendMessage());

    // Close on backdrop click (mobile)
    document.addEventListener('click', e => {
      if (_open && !$panel.contains(e.target) && e.target !== $fab) close();
    });

    // If there's laso data already available, show unread badge
    setTimeout(() => {
      const lasoData = _config.getLasoData ? _config.getLasoData() : null;
      if (lasoData && !_open) $fab.classList.add('has-unread');
    }, 3000);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  window.TuviChatbot = {
    init,
    open,
    close,
    // Reset conversation (e.g. when new lá số loaded)
    reset() {
      _messages = [];
      if ($messages) $messages.innerHTML = '';
      if ($suggestions) $suggestions.innerHTML = '';
      if ($fab) $fab.classList.remove('has-unread');
      // Show badge again after delay
      setTimeout(() => {
        const lasoData = _config.getLasoData ? _config.getLasoData() : null;
        if (lasoData && !_open && $fab) $fab.classList.add('has-unread');
      }, 1500);
    },
  };

})();
