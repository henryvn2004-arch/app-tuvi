// footer.js — dùng cho Next.js route pages (tu-dien/[slug], la-so/[slug], v.v.)
// Cấu trúc: Brand | Công Cụ | Kiến Thức | Thông Tin

(function () {
  if (!document.getElementById('footer-css')) {
    var style = document.createElement('style');
    style.id = 'footer-css';
    style.textContent = [
      '.site-footer{background:#1A1210;color:rgba(255,255,255,0.5);padding:48px 40px 24px;margin-top:auto}',
      '.ft-body{max-width:1100px;margin:0 auto}',
      '.ft-top{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;gap:40px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px}',
      '.ft-brand-row{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
      '.ft-brand-row img{width:36px;height:36px;object-fit:contain;border-radius:5px;opacity:0.9}',
      '.ft-brand-name{font-size:14px;font-weight:700;color:rgba(255,255,255,0.85);font-family:Georgia,serif;line-height:1.2}',
      '.ft-brand-zh{font-size:11px;color:#C9A84C}',
      '.ft-tagline{font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;max-width:240px;margin-top:4px}',
      '.ft-col-title{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9A7B3A;margin-bottom:14px}',
      '.ft-col a{display:block;font-size:13px;color:rgba(255,255,255,0.45)!important;text-decoration:none!important;margin-bottom:9px;transition:color .15s}',
      '.ft-col a:hover{color:rgba(255,255,255,0.85)!important}',
      '.ft-bottom{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(255,255,255,0.2);gap:16px;flex-wrap:wrap}',
      '.ft-bottom a{font-size:11px;color:rgba(255,255,255,0.2)!important;text-decoration:none!important}',
      '.ft-bottom a:hover{color:rgba(255,255,255,0.5)!important}',
      '.ft-bottom img{width:20px;height:20px;object-fit:contain;opacity:0.25;border-radius:3px}',
      '.ft-disclaimer{font-size:10px;color:rgba(255,255,255,0.15);line-height:1.6;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);text-align:center}',
      '@media(max-width:960px){.ft-top{grid-template-columns:1fr 1fr;gap:28px}.ft-brand{grid-column:1/-1}}',
      '@media(max-width:600px){.site-footer{padding:40px 20px 20px}.ft-top{grid-template-columns:1fr 1fr;gap:24px}.ft-brand{grid-column:1/-1}.ft-bottom{flex-direction:column;align-items:flex-start;gap:8px}}'
    ].join('');
    document.head.appendChild(style);
  }

  var H = [
    '<footer class="site-footer"><div class="ft-body"><div class="ft-top">',

    // Col 1 — Brand
    '<div class="ft-brand">',
    '<div class="ft-brand-row"><img src="/seal.webp" alt="">',
    '<div><div class="ft-brand-name">T\u1eed Vi Minh B\u1ea3o</div>',
    '<div class="ft-brand-zh">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh</div></div></div>',
    '<div class="ft-tagline">T\u1eed vi \u0111\u1ea9u s\u1ed1 theo c\u1ed5 ph\u00e1p,<br>lu\u1eadn gi\u1ea3i b\u1eb1ng AI \u2014 mi\u1ec5n ph\u00ed th\u1eed nghi\u1ec7m.</div>',
    '</div>',

    // Col 2 — Công Cụ (hub pages)
    '<div class="ft-col"><div class="ft-col-title">C\u00f4ng C\u1ee5</div>',
    '<a href="/luan-giai.html">Lu\u1eadn Gi\u1ea3i T\u1eed Vi</a>',
    '<a href="/xem-tuong.html">Xem T\u01b0\u1edbng</a>',
    '<a href="/phong-thuy.html">Phong Th\u1ee7y</a>',
    '<a href="/lam-dep.html">L\u00e0m \u0110\u1eb9p</a>',
    '<a href="/chon-ngay.html">Ch\u1ecdn Ng\u00e0y</a>',
    '<a href="/dat-ten.html">\u0110\u1eb7t T\u00ean</a>',
    '</div>',

    // Col 3 — Kiến Thức
    '<div class="ft-col"><div class="ft-col-title">Ki\u1ebfn Th\u1ee9c</div>',
    '<a href="/tu-dien">T\u1eeb \u0110i\u1ec3n</a>',
    '<a href="/resources.html">T\u00e0i Li\u1ec7u</a>',
    '<a href="/menh-kho.html">M\u1ec7nh Kh\u1ed1</a>',
    '<a href="/blog.html">Kh\u1ea3o Lu\u1eadn</a>',
    '<a href="/kien-thuc-tuvi.html">L\u00fd Thuy\u1ebft C\u1ed5 Ph\u00e1p</a>',
    '</div>',

    // Col 4 — Thông Tin
    '<div class="ft-col"><div class="ft-col-title">Th\u00f4ng Tin</div>',
    '<a href="/about.html">Gi\u1edbi Thi\u1ec7u</a>',
    '<a href="/contact.html">Li\u00ean H\u1ec7</a>',
    '<a href="/faqs.html">FAQs</a>',
    '<a href="/huong-dan-thanh-toan.html">H\u01b0\u1edbng D\u1eabn Thanh To\u00e1n</a>',
    '<a href="/chinh-sach-bao-mat.html">Ch\u00ednh S\u00e1ch B\u1ea3o M\u1eadt</a>',
    '<a href="/dieu-khoan-dich-vu.html">\u0110i\u1ec1u Kho\u1ea3n D\u1ecbch V\u1ee5</a>',
    '</div>',

    '</div>',
    '<div class="ft-bottom">',
    '<span>\u00a9 2025 T\u1eed Vi Minh B\u1ea3o \u2014 tuviminhbao.com</span>',
    '<div style="display:flex;gap:16px;align-items:center">',
    '<a href="/chinh-sach-bao-mat.html">B\u1ea3o M\u1eadt</a>',
    '<a href="/dieu-khoan-dich-vu.html">\u0110i\u1ec1u Kho\u1ea3n</a>',
    '<img src="/seal.webp" alt="">',
    '</div></div>',
    '<div class="ft-disclaimer">N\u1ed9i dung lu\u1eadn gi\u1ea3i mang t\u00ednh tham kh\u1ea3o, kh\u00f4ng th\u1ea3y th\u1ebf t\u01b0 v\u1ea5n chuy\u00ean m\u00f4n.</div>',
    '</div></footer>'
  ].join('');

  var el = document.createElement('div');
  el.innerHTML = H;
  var old = document.querySelector('footer.site-footer');
  if (old) old.remove();
  document.body.appendChild(el.firstChild);
})();
