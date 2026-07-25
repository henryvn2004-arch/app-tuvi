// ================================================================
// SHARE.JS — Share buttons component (nguồn DUY NHẤT, 2 kiểu hiển thị)
// Usage: ShareButtons.render(containerId, { url, title, text })
//          → hàng nút inline (Facebook/WhatsApp/Telegram/copy), dùng ở
//            blog/khao-luan/tai-lieu/contact/tu-binh.
//        ShareButtons.renderBar(containerId, { url, title, text, campaign })
//          → thanh nút nổi bật (Web Share API mobile/copy/Facebook/Zalo,
//            gắn UTM tự động), dùng ở trang ISR la-so/nghien-cuu — trước đây
//            là share-widget.js (đã gộp vào đây, xóa file cũ).
// ================================================================

window.ShareButtons = {
  render: function(containerId, opts) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const url   = encodeURIComponent(opts.url   || window.location.href);
    const title = encodeURIComponent(opts.title || document.title);
    const text  = encodeURIComponent(opts.text  || 'Xem lá số Tử Vi tại Tử Vi Minh Bảo');

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase">Chia sẻ:</span>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener"
           onclick="window.ShareButtons.track('facebook')"
           style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:5px;font-size:12px;text-decoration:none;background:#1877F2;color:#fff;transition:opacity 0.15s"
           onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook
        </a>
        <a href="https://wa.me/?text=${text}%20${url}" target="_blank" rel="noopener"
           onclick="window.ShareButtons.track('whatsapp')"
           style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:5px;font-size:12px;text-decoration:none;background:#25D366;color:#fff;transition:opacity 0.15s"
           onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
        <a href="https://t.me/share/url?url=${url}&text=${text}" target="_blank" rel="noopener"
           onclick="window.ShareButtons.track('telegram')"
           style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:5px;font-size:12px;text-decoration:none;background:#2CA5E0;color:#fff;transition:opacity 0.15s"
           onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          Telegram
        </a>
        <button onclick="ShareButtons.copyLink(this)" data-url="${decodeURIComponent(url)}"
           style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:5px;font-size:12px;background:#f0f0f0;color:#444;border:none;cursor:pointer;transition:background 0.15s"
           onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Sao chép link
        </button>
      </div>`;
  },

  renderBar: function(containerId, opts) {
    injectBarCss();
    const el = document.getElementById(containerId);
    if (!el) return;
    const pageUrl = opts.url || window.location.href.split('?')[0];
    const title = opts.title || document.title || 'Lá số tử vi';
    const text = opts.text || title;
    const campaign = opts.campaign || 'laso';
    const canShare = navigator.share && /Mobi|Android/i.test(navigator.userAgent);

    const utmUrl = (medium) => {
      const sep = pageUrl.indexOf('?') === -1 ? '?' : '&';
      return pageUrl + sep + 'utm_source=share&utm_medium=' + medium + '&utm_campaign=' + campaign;
    };

    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(utmUrl('facebook'));
    const zaloUrl = 'https://zalo.me/share/?' + new URLSearchParams({ url: utmUrl('zalo'), title: title }).toString();

    const shareBtn = canShare ? '<button class="sw-btn sw-share" id="sw-native">&#8679; Chia sẻ</button>' : '';
    const copyBtn  = '<button class="sw-btn sw-copy" id="sw-copy">&#128279; Sao chép link</button>';
    const fbBtn    = '<a class="sw-btn sw-fb" href="' + fbUrl + '" target="_blank" rel="noopener" id="sw-fb">f Facebook</a>';
    const zaloBtn  = '<a class="sw-btn sw-zalo" href="' + zaloUrl + '" target="_blank" rel="noopener" id="sw-zalo">&#9993; Zalo</a>';

    el.innerHTML =
      '<div class="sw-bar">' +
        '<span class="sw-label">Chia sẻ lá số:</span>' +
        shareBtn + copyBtn + fbBtn + zaloBtn +
      '</div>';

    if (canShare) {
      document.getElementById('sw-native').addEventListener('click', () => {
        window.ShareButtons.track('webshare');
        navigator.share({ title, text, url: utmUrl('webshare') }).catch(() => {});
      });
    }

    document.getElementById('sw-copy').addEventListener('click', function () {
      const btn = this;
      window.ShareButtons.track('copy');
      const link = utmUrl('copy');
      const done = () => {
        btn.textContent = '✓ Đã sao chép!';
        btn.classList.add('sw-copied');
        setTimeout(() => { btn.textContent = '🔗 Sao chép link'; btn.classList.remove('sw-copied'); }, 2500);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(done).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
        done();
      }
    });

    document.getElementById('sw-fb').addEventListener('click', () => window.ShareButtons.track('facebook'));
    document.getElementById('sw-zalo').addEventListener('click', () => window.ShareButtons.track('zalo'));
  },

  track: function(medium) {
    try { window.Track && window.Track.event && window.Track.event('share', { meta: { medium: medium } }); } catch (e) { /* ignore */ }
  },

  copyLink: function(btn) {
    window.window.ShareButtons.track('copy');
    const url = btn.dataset.url || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Đã sao chép!';
      btn.style.background = '#d4edda';
      btn.style.color = '#155724';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.background = '#f0f0f0';
        btn.style.color = '#444';
      }, 2000);
    });
  },
};

function injectBarCss() {
  const CSS_ID = 'share-widget-css';
  if (document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
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
