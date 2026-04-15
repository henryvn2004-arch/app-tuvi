// conversion.js — Tăng conversion: Loss Aversion Popup + Social Proof Notifications
// Include trên tất cả pages: <script src="/conversion.js"></script>
// Tự động detect page và kích hoạt đúng feature

(function () {
'use strict';

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const CFG = {
  // Social proof: khoảng cách giữa các notification (ms)
  notifInterval: [18000, 35000], // random giữa 18–35s
  notifDuration: 5500,           // hiển thị bao lâu
  notifDelay: 8000,              // delay trước notification đầu tiên
  // Popup: hiện sau bao nhiêu ms kể từ khi page load
  popupDelay: 45000,             // 45s — đủ thời gian đọc xong phần miễn phí
  // Popup: không hiện lại trong N ngày
  popupCooldown: 2,              // ngày
};

// ═══════════════════════════════════════════════════════════
// SOCIAL PROOF DATA
// ═══════════════════════════════════════════════════════════
const ACTIONS = [
  { action: 'vừa mở khóa luận giải lá số', page: '/' },
  { action: 'vừa xem tuổi vợ chồng', page: '/xem-tuoi.html' },
  { action: 'vừa xem tuổi làm ăn', page: '/xem-lam-an.html' },
  { action: 'vừa mở khóa luận giải lá số', page: '/' },
  { action: 'vừa xem tướng mặt AI', page: '/tools/tuong-mat-ai.html' },
  { action: 'vừa đọc khảo luận về mệnh Thuỷ', page: '/blog.html' },
  { action: 'vừa mở khóa phân tích đại vận', page: '/' },
  { action: 'vừa xem tuổi hợp tác kinh doanh', page: '/xem-lam-an.html' },
];

const NAMES = [
  ['Anh Minh','TP.HCM'], ['Chị Thủy','Hà Nội'], ['Anh Tuấn','Sydney'],
  ['Chị Lan','Melbourne'], ['Anh Hùng','TP.HCM'], ['Chị Mai','Đà Nẵng'],
  ['Anh Phúc','California'], ['Chị Ngọc','Hà Nội'], ['Anh Dũng','Singapore'],
  ['Chị Hà','TP.HCM'], ['Anh Khoa','Toronto'], ['Chị Linh','Hải Phòng'],
  ['Anh Việt','Perth'], ['Chị Trang','Cần Thơ'], ['Anh Nam','London'],
  ['Chị Vy','TP.HCM'], ['Anh Long','Hà Nội'], ['Chị Thu','Auckland'],
  ['Anh Đức','TP.HCM'], ['Chị Hương','Nha Trang'], ['Anh Tú','Paris'],
  ['Chị Yến','Đà Lạt'], ['Anh Bảo','Hà Nội'], ['Chị Châu','TP.HCM'],
];

// ═══════════════════════════════════════════════════════════
// LOSS AVERSION POPUP DATA (theo từng page)
// ═══════════════════════════════════════════════════════════
const POPUP_DATA = {
  '/': {
    icon: '⚠️',
    headline: 'Lá số của bạn có thể đang ở giai đoạn chuyển vận quan trọng',
    body: 'Nhiều người bỏ qua dấu hiệu này và hối tiếc về sau. Bài luận giải đầy đủ sẽ chỉ ra chính xác <strong>những đại hạn cần chuẩn bị trong 5 năm tới</strong> — và cách thuận thế để không bỏ lỡ.',
    cta: 'Mở Khóa Luận Giải Đầy Đủ — $19',
    ctaHref: '#payment-section',
    secondary: 'Không, tôi chấp nhận bỏ lỡ',
    urgency: '🔒 Phân tích cá nhân hoá · Không lưu ảnh · Bảo mật tuyệt đối',
  },
  '/xem-tuoi.html': {
    icon: '💑',
    headline: 'Tuổi tác ảnh hưởng lớn hơn bạn nghĩ đến hôn nhân',
    body: 'Nhiều cặp đôi gặp xung đột không giải thích được chỉ vì bỏ qua yếu tố tuổi. Bài phân tích đầy đủ sẽ chỉ ra <strong>mức độ tương hợp thực sự và những giai đoạn cần lưu ý</strong> trong cuộc hôn nhân.',
    cta: 'Xem Phân Tích Đầy Đủ — $9',
    ctaHref: '#payment-section',
    secondary: 'Thôi, tôi tự xử lý được',
    urgency: '⚡ Kết quả ngay · Dựa trên lá số thực · Không phán chung chung',
  },
  '/xem-lam-an.html': {
    icon: '🤝',
    headline: 'Hợp tác sai người có thể tiêu tốn nhiều năm nỗ lực',
    body: 'Tuổi tác hợp làm ăn không chỉ là "hợp hay không" — mà còn là <strong>thời điểm nào thuận, giai đoạn nào cần cẩn thận</strong> và ai là người phù hợp dài hạn.',
    cta: 'Xem Phân Tích Đầy Đủ — $9',
    ctaHref: '#payment-section',
    secondary: 'Không cần, tôi đã quyết rồi',
    urgency: '⚡ Kết quả ngay · Dựa trên lá số thực · Không phán chung chung',
  },
};

// Fallback cho các page khác
const POPUP_DEFAULT = {
  icon: '✦',
  headline: 'Khám phá thêm về mệnh lý của bạn',
  body: 'Lá số Tử Vi phân tích toàn diện: tính cách, vận trình, tình duyên, tài lộc và những đại hạn quan trọng sắp tới.',
  cta: 'Xem Lá Số Cá Nhân — $19',
  ctaHref: '/luan-giai.html',
  secondary: 'Để sau vậy',
  urgency: '🔒 Phân tích cá nhân hoá · Thanh toán an toàn qua PayPal',
};

// ═══════════════════════════════════════════════════════════
// CSS INJECT
// ═══════════════════════════════════════════════════════════
function injectCSS() {
  if (document.getElementById('cv-css')) return;
  const s = document.createElement('style');
  s.id = 'cv-css';
  s.textContent = `
/* ── Social Proof Toast ── */
.cv-toast-wrap {
  position: fixed; bottom: 24px; left: 24px; z-index: 9999;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}
.cv-toast {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #c9a84c;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  min-width: 260px; max-width: 320px;
  pointer-events: auto;
  cursor: default;
  animation: cv-slide-in .35s cubic-bezier(.4,0,.2,1) forwards;
}
.cv-toast.hide {
  animation: cv-slide-out .3s ease forwards;
}
.cv-toast-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #061A2E, #1455A4);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0; color: #c9a84c;
}
.cv-toast-body { flex: 1; min-width: 0; }
.cv-toast-name { font-size: 13px; font-weight: 700; color: #061A2E; }
.cv-toast-action { font-size: 12px; color: #666; margin-top: 2px; line-height: 1.4; }
.cv-toast-time { font-size: 10px; color: #aaa; margin-top: 3px; }
@keyframes cv-slide-in {
  from { opacity: 0; transform: translateX(-100%); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes cv-slide-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-110%); }
}

/* ── Loss Aversion Popup ── */
.cv-popup-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(6,26,46,.7);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: cv-fade-in .25s ease;
}
.cv-popup-overlay.hide {
  animation: cv-fade-out .2s ease forwards;
}
.cv-popup {
  background: #fff;
  border-radius: 14px;
  max-width: 440px; width: 100%;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,.3);
  animation: cv-pop-in .3s cubic-bezier(.34,1.56,.64,1);
}
.cv-popup-top {
  background: linear-gradient(135deg, #061A2E 0%, #0D3B5E 100%);
  padding: 24px 24px 20px;
  text-align: center;
  position: relative;
}
.cv-popup-icon { font-size: 40px; margin-bottom: 10px; display: block; }
.cv-popup-headline {
  font-size: 17px; font-weight: 700; color: #F9F4EB; line-height: 1.45;
  font-family: 'Noto Serif', Georgia, serif;
}
.cv-popup-close {
  position: absolute; top: 12px; right: 14px;
  background: none; border: none; color: rgba(255,255,255,.5);
  font-size: 20px; cursor: pointer; line-height: 1;
  padding: 4px 6px; transition: color .15s;
}
.cv-popup-close:hover { color: #fff; }
.cv-popup-body { padding: 20px 24px 24px; }
.cv-popup-text {
  font-size: 14px; color: #444; line-height: 1.75; margin-bottom: 20px;
}
.cv-popup-cta {
  display: block; width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #9A7B3A, #c9a84c);
  color: #fff; font-size: 15px; font-weight: 700;
  border: none; border-radius: 8px; cursor: pointer;
  font-family: inherit; text-align: center; text-decoration: none;
  transition: opacity .15s; letter-spacing: .3px;
  box-shadow: 0 4px 12px rgba(154,123,58,.4);
}
.cv-popup-cta:hover { opacity: .92; }
.cv-popup-secondary {
  display: block; text-align: center; margin-top: 12px;
  font-size: 12px; color: #aaa; cursor: pointer;
  background: none; border: none; font-family: inherit;
  text-decoration: underline;
}
.cv-popup-secondary:hover { color: #888; }
.cv-popup-urgency {
  font-size: 11px; color: #888; text-align: center;
  margin-top: 14px; line-height: 1.6;
}
@keyframes cv-fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes cv-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes cv-pop-in {
  from { transform: scale(.88); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@media (max-width: 480px) {
  .cv-toast-wrap { left: 12px; right: 12px; bottom: 16px; }
  .cv-toast { max-width: 100%; }
  .cv-popup { border-radius: 10px; }
  .cv-popup-headline { font-size: 15px; }
}`;
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════
// SOCIAL PROOF TOASTS
// ═══════════════════════════════════════════════════════════
let _toastWrap = null;
let _notifTimer = null;
let _usedPairs = [];

function getToastWrap() {
  if (!_toastWrap) {
    _toastWrap = document.createElement('div');
    _toastWrap.className = 'cv-toast-wrap';
    document.body.appendChild(_toastWrap);
  }
  return _toastWrap;
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function relativeTime() {
  const mins = Math.floor(Math.random() * 12) + 1;
  return mins === 1 ? 'vừa xong' : mins + ' phút trước';
}

function showToast() {
  // Pick name + action, avoid repeating same pair consecutively
  let pair, action;
  let tries = 0;
  do {
    pair = pickRandom(NAMES);
    action = pickRandom(ACTIONS);
    tries++;
  } while (_usedPairs.includes(pair[0] + action.action) && tries < 10);
  _usedPairs.push(pair[0] + action.action);
  if (_usedPairs.length > 6) _usedPairs.shift();

  const wrap = getToastWrap();
  const el = document.createElement('div');
  el.className = 'cv-toast';
  // Emoji avatar based on gender hint
  const emoji = pair[0].startsWith('Anh') ? '👨' : '👩';
  el.innerHTML = `
    <div class="cv-toast-avatar">${emoji}</div>
    <div class="cv-toast-body">
      <div class="cv-toast-name">${pair[0]}</div>
      <div class="cv-toast-action">${action.action}</div>
      <div class="cv-toast-time">📍 ${pair[1]} · ${relativeTime()}</div>
    </div>`;
  wrap.appendChild(el);

  // Auto-hide
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 350);
  }, CFG.notifDuration);

  // Schedule next
  const next = CFG.notifInterval[0] + Math.random() * (CFG.notifInterval[1] - CFG.notifInterval[0]);
  _notifTimer = setTimeout(showToast, next);
}

function startSocialProof() {
  setTimeout(showToast, CFG.notifDelay);
}

// ═══════════════════════════════════════════════════════════
// LOSS AVERSION POPUP
// ═══════════════════════════════════════════════════════════
function popupCooldownKey() { return 'cv_popup_' + location.pathname.replace(/\//g,'_'); }

function hasSeenPopup() {
  try {
    const raw = localStorage.getItem(popupCooldownKey());
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < CFG.popupCooldown * 86400000;
  } catch(_) { return false; }
}

function markPopupSeen() {
  try { localStorage.setItem(popupCooldownKey(), Date.now().toString()); } catch(_) {}
}

function closePopup(overlay) {
  overlay.classList.add('hide');
  setTimeout(() => overlay.remove(), 250);
}

function showPopup() {
  if (hasSeenPopup()) return;
  // Don't show if paywall already unlocked
  if (location.search.includes('unlocked=1')) return;

  const path = location.pathname.replace(/index\.html$/, '').replace(/\/$/,'/') || '/';
  const data = POPUP_DATA[path] || POPUP_DEFAULT;

  const overlay = document.createElement('div');
  overlay.className = 'cv-popup-overlay';
  overlay.innerHTML = `
    <div class="cv-popup" role="dialog" aria-modal="true">
      <div class="cv-popup-top">
        <button class="cv-popup-close" aria-label="Đóng">✕</button>
        <span class="cv-popup-icon">${data.icon}</span>
        <div class="cv-popup-headline">${data.headline}</div>
      </div>
      <div class="cv-popup-body">
        <div class="cv-popup-text">${data.body}</div>
        <a class="cv-popup-cta" href="${data.ctaHref}">${data.cta}</a>
        <button class="cv-popup-secondary">${data.secondary}</button>
        <div class="cv-popup-urgency">${data.urgency}</div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  markPopupSeen();

  // Close on overlay click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closePopup(overlay);
  });
  overlay.querySelector('.cv-popup-close').addEventListener('click', () => closePopup(overlay));
  overlay.querySelector('.cv-popup-secondary').addEventListener('click', () => closePopup(overlay));

  // CTA click — scroll to section or navigate
  overlay.querySelector('.cv-popup-cta').addEventListener('click', e => {
    const href = data.ctaHref;
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) { closePopup(overlay); setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 150); }
    } else {
      // external navigate — let default happen
    }
  });
}

function startPopup() {
  // Không hiện popup trên các trang không có paywall
  const paywalledPages = ['/', '/index.html', '/xem-tuoi.html', '/xem-lam-an.html', '/luan-giai.html'];
  const path = location.pathname;
  const isPaywalled = paywalledPages.some(p => path === p || path.endsWith(p));
  if (!isPaywalled) return;
  // Không hiện nếu đã unlock
  if (location.search.includes('unlocked=1')) return;

  setTimeout(showPopup, CFG.popupDelay);
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
function init() {
  injectCSS();
  startSocialProof();
  startPopup();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose để có thể trigger popup thủ công nếu cần
window._cvShowPopup = showPopup;
window._cvShowToast = showToast;

})();
