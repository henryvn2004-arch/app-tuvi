// pwa-push.js — Web Push opt-in, gọi sau khi user xem kết quả lá số/xem ngày
// Expose: window.askPushPermission(tuoi, canChi)
(function () {
  var VAPID_PUBLIC = 'BItThXRYGZSPIpuySbpiBAHC93H0IFqil6ZLHXEiylF_fwy2OuGK-tuqEUKuCkbz6b2r8s6i61M2OOlbPU-h-HU';
  var ASKED_KEY = 'push_asked_at';
  var ASKED_DAYS = 30;

  function b64ToUint8(b64) {
    var pad = b64.replace(/-/g,'+').replace(/_/g,'/');
    while (pad.length % 4) pad += '=';
    var raw = atob(pad);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function subscribe(tuoi, canChi) {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8(VAPID_PUBLIC)
    });
    var json = sub.toJSON();
    var body = { endpoint: json.endpoint, keys: json.keys };
    if (tuoi) body.tuoi = tuoi;
    if (canChi) body.can_chi = canChi;
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return sub;
  }

  function showOptIn(tuoi, canChi, onAccept, onDismiss) {
    if (document.getElementById('push-optin')) return;
    var label = tuoi ? 'Nhận vận hạn mỗi sáng cho tuổi ' + (canChi || tuoi) : 'Nhận thông báo vận hạn mỗi sáng';
    var el = document.createElement('div');
    el.id = 'push-optin';
    el.innerHTML =
      '<div style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);width:min(360px,calc(100vw - 32px));background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.18);padding:20px;z-index:9998;font-family:Arial,sans-serif">'
      + '<div style="font-size:20px;margin-bottom:8px">🔔</div>'
      + '<div style="font-size:15px;font-weight:700;color:#061A2E;margin-bottom:6px">' + label + '</div>'
      + '<div style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.5">Tử Vi Minh Bảo sẽ gửi luận giải vận hạn ngắn mỗi sáng 7h.</div>'
      + '<div style="display:flex;gap:10px">'
      + '<button id="push-accept" style="flex:1;background:#061A2E;color:#fff;border:none;padding:10px;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer">Đồng ý nhận</button>'
      + '<button id="push-decline" style="flex:1;background:#f0f0f0;color:#444;border:none;padding:10px;border-radius:7px;font-size:14px;cursor:pointer">Không cần</button>'
      + '</div></div>';
    document.body.appendChild(el);

    document.getElementById('push-accept').addEventListener('click', function () {
      el.remove();
      onAccept();
    });
    document.getElementById('push-decline').addEventListener('click', function () {
      el.remove();
      onDismiss();
    });
  }

  window.askPushPermission = async function (tuoi, canChi) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    // Đã hỏi gần đây → bỏ qua
    var askedAt = parseInt(localStorage.getItem(ASKED_KEY) || '0', 10);
    if (askedAt && Date.now() - askedAt < ASKED_DAYS * 86400000) return;

    // Đã subscribe rồi → bỏ qua
    var reg = await navigator.serviceWorker.ready;
    var existing = await reg.pushManager.getSubscription();
    if (existing) return;

    showOptIn(tuoi, canChi, async function () {
      localStorage.setItem(ASKED_KEY, Date.now().toString());
      try {
        var perm = await Notification.requestPermission();
        if (perm === 'granted') {
          await subscribe(tuoi, canChi);
        }
      } catch (e) { /* silent */ }
    }, function () {
      localStorage.setItem(ASKED_KEY, Date.now().toString());
    });
  };
})();
