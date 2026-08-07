// pwa-push.js — bật thông báo "Vận hôm nay" (Web Push).
// Expose: window.askPushPermission(namSinh, canChi)
//
// ⚠️ THAM SỐ THỨ NHẤT LÀ NĂM SINH, KHÔNG PHẢI TUỔI. Tên cột dưới DB là `tuoi`
// nhưng giá trị đang lưu là năm sinh (2 dòng trên prod: 1998 / 1984, kèm can chi
// "Mậu Dần" / "Giáp Tý" — khớp năm, không khớp tuổi). Không đổi tên cột vì làm
// vậy phải đụng cả edge function đang chạy để lấy vài chữ; ghi rõ ở đây là đủ.
//
// 🔴 Vì sao file này phải TỰ đăng ký service worker: trang `/app` nạp `nav.js`
// ở chế độ `data-icons-only`, mà chế độ đó `return` sớm — TRƯỚC đoạn đăng ký SW
// ở cuối nav.js. Nên trên toàn bộ khu vực /app không có SW nào được đăng ký, và
// `navigator.serviceWorker.ready` là một Promise KHÔNG BAO GIỜ resolve khi chưa
// có đăng ký nào. Bản trước `await` thẳng vào đó → treo im lặng, không lỗi,
// không thông báo, không có gì để lần ra.
(function () {
  var VAPID_PUBLIC = 'BItThXRYGZSPIpuySbpiBAHC93H0IFqil6ZLHXEiylF_fwy2OuGK-tuqEUKuCkbz6b2r8s6i61M2OOlbPU-h-HU';
  var ASKED_KEY = 'push_asked_at';
  var SYNCED_KEY = 'push_synced_at';
  var ASKED_DAYS = 30;
  var READY_TIMEOUT_MS = 8000;

  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  function track(type, meta) {
    try {
      if (window.Track && window.Track.event) window.Track.event(type, { tool_id: 'van-ngay', meta: meta || {} });
    } catch (e) { /* ignore */ }
  }

  function authToken() {
    try {
      var s = JSON.parse(lget('tuvi_session') || 'null');
      return (s && s.access_token) || null;
    } catch (e) { return null; }
  }

  function b64ToUint8(b64) {
    var pad = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (pad.length % 4) pad += '=';
    var raw = atob(pad);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  // Đăng ký SW nếu chưa có, rồi chờ nó sẵn sàng — KÈM HẠN GIỜ. Không có hạn giờ
  // thì mọi trình duyệt chặn SW (chế độ riêng tư, doanh nghiệp khoá) làm hàm gọi
  // treo vĩnh viễn.
  function swReady() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    try { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}); } catch (e) { /* ignore */ }
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise(function (res) { setTimeout(function () { res(null); }, READY_TIMEOUT_MS); }),
    ]).catch(function () { return null; });
  }

  function saveToServer(sub, namSinh, canChi) {
    var json = sub.toJSON();
    var body = { endpoint: json.endpoint, keys: json.keys };
    if (namSinh) body.tuoi = namSinh;
    if (canChi) body.can_chi = canChi;
    var headers = { 'Content-Type': 'application/json' };
    // Gắn token khi đã đăng nhập → dòng đăng ký thuộc về TÀI KHOẢN chứ không chỉ
    // thuộc về trình duyệt. Cả 2 dòng đang có trên prod đều `user_id` NULL, tức
    // đổi máy là mất, và không nối được với bảng giữ chân nào.
    var t = authToken();
    if (t) headers.Authorization = 'Bearer ' + t;
    return fetch('/api/push-subscribe', { method: 'POST', headers: headers, body: JSON.stringify(body) });
  }

  function showOptIn(canChi, onAccept, onDismiss) {
    if (document.getElementById('push-optin')) return false;
    var label = canChi ? 'Nhắc vận mỗi sáng cho tuổi ' + canChi : 'Nhắc vận hôm nay mỗi sáng';
    var el = document.createElement('div');
    el.id = 'push-optin';
    el.innerHTML =
      '<div role="dialog" aria-label="Bật nhắc vận hằng ngày" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);width:min(360px,calc(100vw - 32px));background:#fff;color:#061A2E;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.24);padding:20px;z-index:9998;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif">' +
      '<div style="font-size:22px;margin-bottom:8px">🔔</div>' +
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px">' + label + '</div>' +
      '<div style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.5">Mỗi sáng 7h: ngày tốt hay xấu, trực gì, hợp việc gì — và ngày nào xung tuổi bạn. Tắt lúc nào cũng được.</div>' +
      '<div style="display:flex;gap:10px">' +
      '<button type="button" id="push-accept" style="flex:1;background:#061A2E;color:#fff;border:none;padding:11px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Bật nhắc</button>' +
      '<button type="button" id="push-decline" style="flex:1;background:#f0f0f0;color:#444;border:none;padding:11px;border-radius:8px;font-size:14px;cursor:pointer">Để sau</button>' +
      '</div></div>';
    document.body.appendChild(el);

    document.getElementById('push-accept').addEventListener('click', function () {
      el.remove();
      onAccept();
    });
    document.getElementById('push-decline').addEventListener('click', function () {
      el.remove();
      onDismiss();
    });
    return true;
  }

  window.askPushPermission = async function (namSinh, canChi) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    // iOS Safari ở tab thường KHÔNG có `Notification` (chỉ có khi đã thêm vào
    // màn hình chính). Bản trước đọc thẳng `Notification.permission` → ném
    // TypeError, và vì nó nằm trong luồng render của trang nên kéo theo cả phần
    // chạy sau nó.
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') return;

    var reg = await swReady();
    if (!reg || !reg.pushManager) return;

    var existing = null;
    try { existing = await reg.pushManager.getSubscription(); } catch (e) { /* ignore */ }
    if (existing) {
      // Đã bật rồi → KHÔNG hỏi lại. Nhưng đồng bộ lại tối đa 1 lần/ngày: dòng
      // dưới DB bị xoá khi trình duyệt trả 404/410 (edge function tự dọn), và
      // người dùng đăng nhập SAU khi đăng ký thì `user_id` vẫn đang NULL. Không
      // có bước này thì họ im lặng ngừng nhận mà không ai biết.
      var last = parseInt(lget(SYNCED_KEY) || '0', 10);
      if (!last || Date.now() - last > 86400000) {
        lset(SYNCED_KEY, String(Date.now()));
        try { await saveToServer(existing, namSinh, canChi); } catch (e) { /* ignore */ }
      }
      return;
    }

    // Đã hỏi gần đây → im. Đặt SAU bước kiểm đăng ký để người đã bật vẫn được
    // đồng bộ ở trên.
    var askedAt = parseInt(lget(ASKED_KEY) || '0', 10);
    if (askedAt && Date.now() - askedAt < ASKED_DAYS * 86400000) return;

    var shown = showOptIn(canChi, async function () {
      lset(ASKED_KEY, String(Date.now()));
      var res = 'error';
      try {
        var perm = await Notification.requestPermission();
        if (perm === 'granted') {
          var sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64ToUint8(VAPID_PUBLIC),
          });
          await saveToServer(sub, namSinh, canChi);
          lset(SYNCED_KEY, String(Date.now()));
          res = 'granted';
        } else {
          res = perm; // 'denied' | 'default' (đóng hộp thoại của trình duyệt)
        }
      } catch (e) {
        res = 'error';
      }
      // Ghi CẢ ca hỏng: "bấm Bật rồi vẫn không nhận được" là ca cần thấy nhất,
      // mà nó không tự lộ ra ở đâu.
      track('push_optin_result', { result: res });
    }, function () {
      lset(ASKED_KEY, String(Date.now()));
      track('push_optin_result', { result: 'dismissed' });
    });

    if (shown) track('push_optin_shown', {});
  };
})();
