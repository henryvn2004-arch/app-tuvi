// pwa-install.js — Smart PWA install prompt
// - Hiện banner khi visit lần ≥2 HOẶC sau khi hoàn thành 1 lá số
// - iOS Safari: hiện hướng dẫn "Chia sẻ → Thêm vào MH chính"
// - Dismiss → không hiện lại 14 ngày
(function () {
  var STORAGE_KEY = 'pwa_install';
  var DISMISS_DAYS = 14;

  function getState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function setState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {}
  }

  var state = getState();

  // Đã install → không làm gì
  if (state.installed) return;

  // Đã dismiss trong vòng 14 ngày → bỏ qua
  if (state.dismissedAt && Date.now() - state.dismissedAt < DISMISS_DAYS * 86400000) return;

  // Đếm visits
  var visits = (state.visits || 0) + 1;
  setState(Object.assign({}, state, { visits: visits }));

  var deferredPrompt = null;

  // Bắt beforeinstallprompt để dùng sau
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (visits >= 2 || state.completedLaso) {
      showInstallBanner();
    }
  });

  // Trigger từ bên ngoài (sau khi hoàn thành lá số)
  window.triggerPwaInstall = function () {
    var s = getState();
    setState(Object.assign({}, s, { completedLaso: true }));
    if (deferredPrompt) showInstallBanner();
    else if (isIosSafari()) showIosBanner();
  };

  function isIosSafari() {
    var ua = navigator.userAgent;
    return /iP(hone|ad|od)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
      && !window.navigator.standalone;
  }

  function dismiss() {
    setState(Object.assign({}, getState(), { dismissedAt: Date.now() }));
    var el = document.getElementById('pwa-banner');
    if (el) el.remove();
  }

  function showInstallBanner() {
    if (document.getElementById('pwa-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.innerHTML =
      '<div style="position:fixed;bottom:0;left:0;right:0;background:#061A2E;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;z-index:9999;box-shadow:0 -2px 12px rgba(0,0,0,.3);font-family:Arial,sans-serif">'
      + '<img src="/seal.webp" style="width:40px;height:40px;border-radius:8px;flex-shrink:0" alt="">'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:14px;font-weight:700;margin-bottom:2px">Tử Vi Minh Bảo</div>'
      + '<div style="font-size:12px;color:rgba(255,255,255,.7)">Thêm vào màn hình chính để tra cứu nhanh hơn</div>'
      + '</div>'
      + '<button id="pwa-install-btn" style="background:#9A7B3A;color:#fff;border:none;padding:9px 16px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">Thêm</button>'
      + '<button id="pwa-dismiss-btn" style="background:transparent;color:rgba(255,255,255,.5);border:none;font-size:20px;cursor:pointer;padding:4px;flex-shrink:0;line-height:1">×</button>'
      + '</div>';
    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (r) {
        if (r.outcome === 'accepted') setState(Object.assign({}, getState(), { installed: true }));
        deferredPrompt = null;
        dismiss();
      });
    });
    document.getElementById('pwa-dismiss-btn').addEventListener('click', dismiss);
  }

  function showIosBanner() {
    if (document.getElementById('pwa-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.innerHTML =
      '<div style="position:fixed;bottom:0;left:0;right:0;background:#061A2E;color:#fff;padding:14px 16px;z-index:9999;box-shadow:0 -2px 12px rgba(0,0,0,.3);font-family:Arial,sans-serif">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      + '<div style="font-size:14px;font-weight:700">Thêm vào màn hình chính</div>'
      + '<button id="pwa-dismiss-btn" style="background:transparent;color:rgba(255,255,255,.5);border:none;font-size:20px;cursor:pointer;padding:0;line-height:1">×</button>'
      + '</div>'
      + '<div style="font-size:13px;color:rgba(255,255,255,.8);line-height:1.6">'
      + 'Nhấn <strong style="color:#9A7B3A">⎙ Chia sẻ</strong> ở thanh dưới → chọn <strong style="color:#9A7B3A">"Thêm vào MH chính"</strong>'
      + '</div>'
      + '</div>';
    document.body.appendChild(banner);
    document.getElementById('pwa-dismiss-btn').addEventListener('click', dismiss);
  }

  // iOS: hiện khi visit ≥2 (không cần beforeinstallprompt)
  if (isIosSafari() && visits >= 2) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(showIosBanner, 2000); });
    } else {
      setTimeout(showIosBanner, 2000);
    }
  }
})();
