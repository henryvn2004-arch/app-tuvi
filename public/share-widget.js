// share-widget.js — Viral share bar for result pages
// Expose: window.showShareWidget(containerId, { url, title, text, tuoi, canChi })
(function () {
  var CSS_ID = 'share-widget-css';
  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = [
      '.sw-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px;background:#f9f8f4;border:1px solid #e0ddd6;border-radius:10px;margin:16px 0}',
      '.sw-label{font-size:12px;font-weight:700;color:#555;letter-spacing:.5px;white-space:nowrap;margin-right:4px}',
      '.sw-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:none;text-decoration:none;transition:opacity .15s}',
      '.sw-btn:hover{opacity:.85}',
      '.sw-share{background:#061A2E;color:#fff}',
      '.sw-copy{background:#fff;color:#333;border:1px solid #ccc!important}',
      '.sw-fb{background:#1877F2;color:#fff}',
      '.sw-zalo{background:#0068FF;color:#fff}',
      '.sw-copied{background:#1E6B3C!important;color:#fff!important}',
    ].join('');
    document.head.appendChild(s);
  }

  function utmUrl(base, medium) {
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    return base + sep + 'utm_source=share&utm_medium=' + medium + '&utm_campaign=laso';
  }

  function trackShare(medium) {
    try {
      if (window.gtag) window.gtag('event', 'share', { method: medium, content_type: 'laso' });
      if (window.fbq) window.fbq('track', 'Share', { content_type: 'laso', medium: medium });
    } catch (e) {}
    // Fire & forget to analytics endpoint (best effort)
    try { fetch('/api/share-event?m=' + medium, { method: 'POST', keepalive: true }); } catch (e) {}
  }

  window.showShareWidget = function (containerId, opts) {
    injectCss();
    var el = document.getElementById(containerId);
    if (!el) return;
    var pageUrl = opts.url || window.location.href.split('?')[0];
    var title   = opts.title || document.title || 'Lá số tử vi';
    var text    = opts.text  || title;
    var canShare = navigator.share && /Mobi|Android/i.test(navigator.userAgent);

    var fbUrl   = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(utmUrl(pageUrl, 'facebook'));
    var zaloUrl = 'https://zalo.me/share/?' + new URLSearchParams({ url: utmUrl(pageUrl, 'zalo'), title: title }).toString();

    var shareBtn = canShare
      ? '<button class="sw-btn sw-share" id="sw-native">&#8679; Chia sẻ</button>'
      : '';
    var copyBtn  = '<button class="sw-btn sw-copy" id="sw-copy">&#128279; Sao chép link</button>';
    var fbBtn    = '<a class="sw-btn sw-fb" href="' + fbUrl + '" target="_blank" rel="noopener" id="sw-fb">f Facebook</a>';
    var zaloBtn  = '<a class="sw-btn sw-zalo" href="' + zaloUrl + '" target="_blank" rel="noopener" id="sw-zalo">&#9993; Zalo</a>';

    el.innerHTML =
      '<div class="sw-bar">' +
        '<span class="sw-label">Chia sẻ lá số:</span>' +
        shareBtn + copyBtn + fbBtn + zaloBtn +
      '</div>';

    if (canShare) {
      document.getElementById('sw-native').addEventListener('click', function () {
        trackShare('webshare');
        navigator.share({ title: title, text: text, url: utmUrl(pageUrl, 'webshare') }).catch(function(){});
      });
    }

    document.getElementById('sw-copy').addEventListener('click', function () {
      var btn = this;
      trackShare('copy');
      var link = utmUrl(pageUrl, 'copy');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(function () {
          btn.textContent = '✓ Đã sao chép!';
          btn.classList.add('sw-copied');
          setTimeout(function () { btn.textContent = '🔗 Sao chép link'; btn.classList.remove('sw-copied'); }, 2500);
        }).catch(function(){});
      } else {
        var ta = document.createElement('textarea');
        ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch(e){}
        document.body.removeChild(ta);
        btn.textContent = '✓ Đã sao chép!';
        btn.classList.add('sw-copied');
        setTimeout(function () { btn.textContent = '🔗 Sao chép link'; btn.classList.remove('sw-copied'); }, 2500);
      }
    });

    document.getElementById('sw-fb').addEventListener('click', function () { trackShare('facebook'); });
    document.getElementById('sw-zalo').addEventListener('click', function () { trackShare('zalo'); });
  };
})();
