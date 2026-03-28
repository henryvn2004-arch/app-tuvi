// footer.js — Shared footer component
// Include trước </body>: <script src="/footer.js"></script>

(function () {

  if (!document.getElementById('footer-css')) {
    var style = document.createElement('style');
    style.id = 'footer-css';
    style.textContent = '.site-footer{background:#1A1210;color:rgba(255,255,255,0.5);padding:36px 32px 24px;margin-top:auto}.footer-top{display:flex;justify-content:space-between;align-items:flex-start;gap:32px;flex-wrap:wrap;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px}.footer-brand{display:flex;align-items:center;gap:10px}.footer-brand img{width:36px;height:36px;object-fit:contain;border-radius:5px;opacity:0.9}.footer-brand-text .name{font-size:14px;font-weight:700;color:rgba(255,255,255,0.85);font-family:Georgia,serif}.footer-brand-text .zh{font-size:12px;color:#C9A84C}.footer-tagline{font-size:12px;margin-top:8px;color:rgba(255,255,255,0.35);line-height:1.6}.footer-bottom{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(255,255,255,0.25)}.footer-bottom img{width:20px;height:20px;object-fit:contain;opacity:0.3;border-radius:3px}.footer-link{font-size:12px;color:rgba(255,255,255,0.5);text-decoration:none;transition:color .15s}.footer-link:hover{color:#c9a84c}@media(max-width:700px){.site-footer{padding:28px 20px 20px}.footer-top{flex-direction:column;gap:24px}}';
    document.head.appendChild(style);
  }

  var H = [
    '<footer class="site-footer">',
    '<div class="footer-top">',
    '<div>',
    '<div class="footer-brand">',
    '<img src="/seal.webp" alt="">',
    '<div class="footer-brand-text">',
    '<div class="name">T\u1eed Vi Minh B\u1ea3o</div>',
    '<div class="zh">\u7d2b\u5fae\u660e\u5bf6</div>',
    '</div></div>',
    '<p class="footer-tagline">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh<br>K\u1ebft h\u1ee3p kinh \u0111i\u1ec3n &amp; c\u00f4ng ngh\u1ec7 hi\u1ec7n \u0111\u1ea1i.</p>',
    '</div>',
    '<div style="display:flex;gap:48px;flex-wrap:wrap">',

    '<div><div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:12px">C\u00f4ng C\u1ee5</div>',
    '<div style="display:flex;flex-direction:column;gap:8px">',
    '<a class="footer-link" href="/luan-giai.html">Lu\u1eadn Gi\u1ea3i L\u00e1 S\u1ed1</a>',
    '<a class="footer-link" href="/xem-tuoi.html">Xem Tu\u1ed5i V\u1ee3 Ch\u1ed3ng</a>',
    '<a class="footer-link" href="/xem-lam-an.html">Xem Tu\u1ed5i L\u00e0m \u0102n</a>',
    '</div></div>',

    '<div><div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:12px">Kh\u00e1m Ph\u00e1</div>',
    '<div style="display:flex;flex-direction:column;gap:8px">',
    '<a class="footer-link" href="/resources.html">Th\u01b0 vi\u1ec7n t\u00e0i li\u1ec7u</a>',
    '<a class="footer-link" href="/blog.html">V\u1ea5n \u0111\u00e1p</a>',
    '<a class="footer-link" href="/about.html">Gi\u1edbi thi\u1ec7u</a>',
    '<a class="footer-link" href="/contact.html">Li\u00ean h\u1ec7</a>',
    '</div></div>',

    '<div><div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:12px">Ch\u00ednh S\u00e1ch</div>',
    '<div style="display:flex;flex-direction:column;gap:8px">',
    '<a class="footer-link" href="/chinh-sach-bao-mat.html">Ch\u00ednh s\u00e1ch b\u1ea3o m\u1eadt</a>',
    '<a class="footer-link" href="/dieu-khoan-dich-vu.html">\u0110i\u1ec1u kho\u1ea3n d\u1ecbch v\u1ee5</a>',
    '<a class="footer-link" href="/huong-dan-thanh-toan.html">H\u01b0\u1edbng d\u1eabn thanh to\u00e1n</a>',
    '<a class="footer-link" href="/faqs.html">FAQs</a>',
    '</div></div>',

    '</div></div>',
    '<div class="footer-bottom">',
    '<span>&copy; 2026 tuviminhbao.com \u2014 All rights reserved</span>',
    '<img src="/seal.webp" alt="">',
    '</div>',
    '</footer>'
  ];

  var existing = document.querySelector('footer.site-footer');
  if (existing) existing.remove();

  var tmp = document.createElement('div');
  tmp.innerHTML = H.join('');
  document.body.appendChild(tmp.firstChild);

})();
