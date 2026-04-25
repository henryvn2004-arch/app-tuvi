// nav.js — Shared navigation component v8
(function () {
  var path = window.location.pathname;

  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path === href || path.startsWith(href.replace('.html', ''));
  }
  function navLink(href, label) {
    return '<a class="nav-link' + (isActive(href) ? ' active' : '') + '" href="' + href + '">' + label + '</a>';
  }
  function ddItem(href, icon, label) {
    return '<a class="nav-dd-item' + (path === href ? ' active' : '') + '" href="' + href + '"><span>' + icon + '</span> ' + label + '</a>';
  }
  function ddSection(label) {
    return '<div class="nav-dd-section">' + label + '</div>';
  }

  // Active state detection
  var TUVI_PATHS   = ['/', '/luan-giai.html','/xem-tuoi.html','/xem-lam-an.html','/tools/xem-tuoi-sinh-con.html','/tools/an-sao.html','/tools/sao-nam.html','/tools/cach-cuc.html','/tools/dai-van.html','/tools/van-thang.html'];
  var TUONG_PATHS  = ['/tools/tuong-mat-ai.html','/tools/nhan-tuong-ai.html','/tools/thu-tuong-ai.html','/tools/thanh-tuong-ai.html','/tools/thanh-tuong-pro.html','/tools/khi-sac-ai.html'];
  var PHONG_PATHS  = ['/tools/phong-thuy.html','/tools/ban-lam-viec.html','/tools/cua-hang-phong-thuy.html','/tools/bat-trach.html','/tools/kim-lau.html','/tools/mau-sac-hop-menh.html'];
  var NGAY_PATHS   = ['/tools/hoang-dao.html','/tools/ngay-tot.html','/tools/luc-nham.html','/tools/han-nam.html','/tools/chon-ngay-tot.html'];
  var TENCHU_PATHS = ['/tools/dat-ten-con.html','/tools/dat-ten-doanh-nghiep.html'];

  function anyActive(arr) { return arr.indexOf(path) >= 0; }

  var css = [
    '.topnav{position:sticky;top:0;z-index:200;background:#061A2E;display:flex;align-items:center;height:60px;padding:0 40px;gap:28px}',
    '.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0}',
    '.nav-logo img{width:38px;height:38px;object-fit:contain;border-radius:5px}',
    '.nav-logo .name{font-size:16px;font-weight:700;color:#CC2200;font-family:Georgia,serif}',
    '.nav-logo .url{font-size:10px;color:#aaa;letter-spacing:.07em;text-transform:uppercase}',
    '.nav-links{display:flex;align-items:center;gap:2px;flex:1;overflow:hidden}',
    '.nav-link{color:#8BAACC;font-size:13px;text-decoration:none;padding:6px 10px;border-radius:6px;transition:all .15s;white-space:nowrap;cursor:pointer}',
    '.nav-link:hover{color:#fff;background:rgba(255,255,255,.07)}',
    '.nav-link.active{color:#c9a84c}',
    '.nav-hamburger{display:none;background:none;border:none;color:#8BAACC;cursor:pointer;padding:8px;font-size:20px;z-index:400;position:relative}',
    '.nav-dd{position:relative;display:flex;align-items:center}',
    '.nav-dd-menu{display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #ccc;border-top:3px solid #c9a84c;min-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500;max-height:80vh;overflow-y:auto}',
    '.nav-dd:hover .nav-dd-menu{display:block}',
    '.nav-dd-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13px;color:#1a1a1a;text-decoration:none;border-bottom:1px solid #f0f0f0;transition:background .12s}',
    '.nav-dd-item:last-child{border-bottom:none}',
    '.nav-dd-item:hover{background:#F5F4F0;color:#061A2E}',
    '.nav-dd-item.active{color:#9A7B3A;font-weight:600}',
    '.nav-dd-section{padding:8px 16px 4px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9A7B3A;background:#fdfaf5;border-bottom:1px solid #efe8d8;margin-top:2px}',
    '.nav-dd-section:first-child{margin-top:0}',
    '.nav-right-btns{display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0}',
    '.nav-topup-btn{background:#9A7B3A;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:6px;text-decoration:none;white-space:nowrap;transition:background .15s}',
    '.nav-topup-btn:hover{background:#7d6230}',
    '@media(max-width:900px){.topnav{padding:0 16px;gap:0}.nav-links{gap:0}}',
    '@media(max-width:700px){',
    '.nav-links{display:none;position:absolute;top:60px;left:0;right:0;background:#061A2E;flex-direction:column;padding:8px 0 16px;gap:0;border-bottom:1px solid #1a2a3a;z-index:199;overflow-y:auto;max-height:calc(100vh - 60px)}',
    '.nav-links.open{display:flex}',
    '.nav-link{padding:10px 24px;border-radius:0;width:100%;display:block}',
    '.nav-hamburger{display:block}',
    '.nav-dd{width:100%;display:block}',
    '.nav-dd:hover .nav-dd-menu{display:none}',
    '.nav-dd-menu{position:static;border:none;box-shadow:none;background:rgba(255,255,255,.06);width:100%;max-height:60vh;overflow-y:auto}',
    '.nav-dd-menu.open{display:block !important}',
    '.nav-dd-item{color:#8BAACC;padding:9px 36px;border-bottom:1px solid rgba(255,255,255,.05)}',
    '.nav-dd-item:hover{background:rgba(255,255,255,.05);color:#fff}',
    '.nav-dd-item.active{color:#c9a84c}',
    '.nav-dd-section{background:rgba(201,168,76,.1);color:#c9a84c;padding:7px 24px 4px}',
    '}'
  ].join('');

  // GA4
  if (!document.getElementById('gtag-js')) {
    var ga = document.createElement('script'); ga.id='gtag-js'; ga.async=true;
    ga.src='https://www.googletagmanager.com/gtag/js?id=G-F4XNRS2XT0'; document.head.appendChild(ga);
    window.dataLayer=window.dataLayer||[]; function gtag(){dataLayer.push(arguments);} window.gtag=gtag;
    gtag('js',new Date()); gtag('config','G-F4XNRS2XT0');
  }
  // Conversion script
  if (!document.getElementById('cv-script')) {
    var cv=document.createElement('script'); cv.id='cv-script'; cv.src='/conversion.js'; document.body.appendChild(cv);
  }
  if (!document.getElementById('nav-css')) {
    var s=document.createElement('style'); s.id='nav-css'; s.textContent=css; document.head.appendChild(s);
  }
  if (!document.getElementById('auth-js-tag') && typeof window.Auth==='undefined') {
    var authScript=document.createElement('script'); authScript.id='auth-js-tag'; authScript.src='/auth.js'; document.head.appendChild(authScript);
  }

  // ── Build dropdowns ───────────────────────────────────────────

  // DD1 — Tử Vi
  var dd1 = '<div class="nav-dd" id="nav-dd1">'
    + '<span class="nav-link' + (anyActive(TUVI_PATHS)?' active':'') + '" id="nav-dd1-toggle" role="button" tabindex="0">T\u1eed Vi \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd1-menu">'
    + ddSection('Lu\u1eadn Gi\u1ea3i')
    + ddItem('/luan-giai.html',              '\ud83d\udd2e', 'Lu\u1eadn Gi\u1ea3i L\u00e1 S\u1ed1')
    + ddItem('/xem-tuoi.html',               '\ud83d\udc91', 'Xem Tu\u1ed5i V\u1ee3 Ch\u1ed3ng')
    + ddItem('/xem-lam-an.html',             '\ud83e\udd1d', 'Xem Tu\u1ed5i L\u00e0m \u0102n')
    + ddItem('/tools/xem-tuoi-sinh-con.html','\ud83d\udc76', 'Xem Tu\u1ed5i Sinh Con \u2014 Mi\u1ec5n Ph\u00ed')
    + ddSection('C\u00f4ng C\u1ee5 T\u1eed Vi')
    + ddItem('/tools/an-sao.html',    '\ud83d\udcca', 'An Sao L\u00e1 S\u1ed1')
    + ddItem('/tools/sao-nam.html',   '\u2609',       'T\u1ed5ng Quan L\u00e1 S\u1ed1')
    + ddItem('/tools/cach-cuc.html',  '\u26e7',       'C\u00e1ch C\u1ee5c & C\u00e1c Cung')
    + ddItem('/tools/dai-van.html',   '\ud83d\udcc8', '\u0110\u1ea1i V\u1eadn & V\u1eadn Tr\u00ecnh')
    + ddItem('/tools/van-thang.html', '\ud83d\uddd3', 'V\u1eadn Th\u00e1ng')
    + '</div></div>';

  // DD2 — Xem Tướng
  var dd2 = '<div class="nav-dd" id="nav-dd2">'
    + '<span class="nav-link' + (anyActive(TUONG_PATHS)?' active':'') + '" id="nav-dd2-toggle" role="button" tabindex="0">Xem T\u01b0\u1edbng \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd2-menu">'
    + ddItem('/tools/tuong-mat-ai.html',   '\ud83d\ude42', 'Di\u1ec7n T\u01b0\u1edbng \u2014 Xem M\u1eb7t')
    + ddItem('/tools/nhan-tuong-ai.html',  '\ud83d\udc41', 'Nh\u00e3n T\u01b0\u1edbng \u2014 Xem M\u1eaft')
    + ddItem('/tools/thu-tuong-ai.html',   '\u270b',       'Th\u1ee7 T\u01b0\u1edbng \u2014 Ch\u1ec9 Tay')
    + ddItem('/tools/thanh-tuong-ai.html', '\ud83c\udfa4', 'Thanh T\u01b0\u1edbng \u2014 Gi\u1ecdng N\u00f3i')
    + ddItem('/tools/thanh-tuong-pro.html','\ud83c\udfbc', 'Thanh T\u01b0\u1edbng Pro')
    + ddItem('/tools/khi-sac-ai.html',     '\ud83c\udf05', 'Kh\u00ed S\u1eafc \u2014 V\u1eadn Kh\u00ed 1\u20133 Th\u00e1ng')
    + '</div></div>';

  // DD3 — Phong Thủy
  var dd3 = '<div class="nav-dd" id="nav-dd3">'
    + '<span class="nav-link' + (anyActive(PHONG_PATHS)?' active':'') + '" id="nav-dd3-toggle" role="button" tabindex="0">Phong Th\u1ee7y \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd3-menu">'
    + ddSection('Ph\u00e2n T\u00edch Kh\u00f4ng Gian')
    + ddItem('/tools/phong-thuy.html',           '\ud83e\udded', 'Phong Th\u1ee7y N\u1ed9i Th\u1ea5t')
    + ddItem('/tools/ban-lam-viec.html',          '\ud83d\udda5', 'Phong Th\u1ee7y B\u00e0n L\u00e0m Vi\u1ec7c')
    + ddItem('/tools/cua-hang-phong-thuy.html',   '\ud83c\udfea', 'Phong Th\u1ee7y C\u1eeda H\u00e0ng & VP')
    + ddSection('M\u1ec7nh L\u00fd & Phong Th\u1ee7y')
    + ddItem('/tools/bat-trach.html',             '\ud83e\uddad', 'H\u01b0\u1edbng B\u00e1t Tr\u1ea1ch')
    + ddItem('/tools/kim-lau.html',               '\ud83c\udfe0', 'Kim L\u00e2u & Tam Tai')
    + ddItem('/tools/mau-sac-hop-menh.html',      '\ud83c\udfa8', 'M\u00e0u S\u1eafc H\u1ee3p M\u1ec7nh')
    + '</div></div>';

  // DD4 — Chọn Ngày
  var dd4 = '<div class="nav-dd" id="nav-dd4">'
    + '<span class="nav-link' + (anyActive(NGAY_PATHS)?' active':'') + '" id="nav-dd4-toggle" role="button" tabindex="0">Ch\u1ecdn Ng\u00e0y \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd4-menu">'
    + ddItem('/tools/hoang-dao.html',  '\u2600\ufe0f', 'Gi\u1edd Ho\u00e0ng \u0110\u1ea1o')
    + ddItem('/tools/ngay-tot.html',   '\ud83d\udcc5', 'Ng\u00e0y T\u1ed1t Trong Th\u00e1ng')
    + ddItem('/tools/chon-ngay-tot.html', '\ud83d\udccc', 'Ch\u1ecdn Ng\u00e0y T\u1ed1t')
    + ddItem('/tools/luc-nham.html',   '\u26b8',       'L\u1ee5c Nh\u00e2m Gi\u1ea3n')
    + ddItem('/tools/han-nam.html',    '\ud83d\udd04',  'H\u1ea1n N\u0103m')
    + '</div></div>';

  // DD5 — Đặt Tên
  var dd5 = '<div class="nav-dd" id="nav-dd5">'
    + '<span class="nav-link' + (anyActive(TENCHU_PATHS)?' active':'') + '" id="nav-dd5-toggle" role="button" tabindex="0">\u0110\u1eb7t T\u00ean \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd5-menu">'
    + ddItem('/tools/dat-ten-con.html',          '\ud83d\udc76', '\u0110\u1eb7t T\u00ean Con Theo Ng\u0169 H\u00e0nh')
    + ddItem('/tools/dat-ten-doanh-nghiep.html', '\ud83c\udfe2', '\u0110\u1eb7t T\u00ean Doanh Nghi\u1ec7p')
    + '</div></div>';

  // DD6 — Công Cụ (còn lại)
  var dd6 = '<div class="nav-dd" id="nav-dd6">'
    + '<span class="nav-link" id="nav-dd6-toggle" role="button" tabindex="0">C\u00f4ng C\u1ee5 \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd6-menu">'
    + ddSection('M\u1ec7nh L\u00fd')
    + ddItem('/tools/nap-am.html',       '\ud83c\udf00', 'N\u1ea1p \u00c2m Ng\u0169 H\u00e0nh')
    + ddItem('/tools/tuong-hop.html',    '\u2764\ufe0f', 'T\u01b0\u01a1ng H\u1ee3p Tu\u1ed5i')
    + ddItem('/tools/ngu-hanh-ten.html', '\u270d\ufe0f', 'Ng\u0169 H\u00e0nh T\u00ean')
    + ddItem('/tools/tu-tru.html',       '\ud83d\udcdc', 'T\u1ee9 Tr\u1ee5 B\u00e1t T\u1ef1')
    + ddSection('Huy\u1ec1n H\u1ecdc')
    + ddItem('/tools/kinh-dich.html',   '\u262f',       'Kinh D\u1ecbch 64 Qu\u1ebb')
    + ddItem('/tools/than-so-hoc.html', '\ud83d\udd22', 'Th\u1ea7n S\u1ed1 H\u1ecdc')
    + ddSection('B\u00f3i B\u00e0i')
    + ddItem('/tools/tarot.html',       '\ud83c\udccf', 'Tarot 78 L\u00e1')
    + ddItem('/tools/oracle.html',      '\u2728',       'Oracle Ph\u01b0\u01a1ng \u0110\u00f4ng')
    + ddItem('/tools/boi-bai-tay.html', '\ud83c\udca0', 'B\u00f3i B\u00e0i T\u00e2y')
    + '</div></div>';

  var html = '<nav class="topnav">'
    + '<a class="nav-logo" href="/"><img src="/seal.webp" alt="">'
    + '<div><div class="name">T\u1eed Vi Minh B\u1ea3o</div><div class="url">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh</div></div></a>'
    + '<div class="nav-links" id="nav-links">'
    + navLink('/', 'Trang Ch\u1ee7')
    + dd1 + dd2 + dd3 + dd4 + dd5 + dd6
    + navLink('/blog.html', 'Kh\u1ea3o Lu\u1eadn')
    + '</div>'
    + '<div class="nav-right-btns">'
    + '<div id="nav-auth-area"></div>'
    + '<a class="nav-topup-btn" href="/topup.html">N\u1ea1p L\u01b0\u1ee3ng</a>'
    + '</div>'
    + '<button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">\u2630</button>'
    + '</nav>';

  var old = document.querySelector('nav.topnav');
  if (old) old.remove();
  var tmp = document.createElement('div'); tmp.innerHTML = html;
  document.body.insertBefore(tmp.firstChild, document.body.firstChild);

  // ── Mobile dropdown events ─────────────────────────────────────
  var menus = ['nav-dd1-menu','nav-dd2-menu','nav-dd3-menu','nav-dd4-menu','nav-dd5-menu','nav-dd6-menu'];
  function closeAll() { menus.forEach(function(id){ var m=document.getElementById(id); if(m)m.classList.remove('open'); }); }

  document.getElementById('nav-hamburger').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('nav-links').classList.toggle('open');
  });

  ['nav-dd1-toggle','nav-dd2-toggle','nav-dd3-toggle','nav-dd4-toggle','nav-dd5-toggle','nav-dd6-toggle'].forEach(function(tid, idx) {
    var busy = false;
    var el = document.getElementById(tid);
    if (!el) return;
    el.addEventListener('click', function(e) {
      if (window.innerWidth > 700) return;
      e.preventDefault(); e.stopPropagation();
      if (busy) return; busy=true; setTimeout(function(){busy=false;},300);
      var menuId = menus[idx];
      var menu = document.getElementById(menuId);
      var was = menu && menu.classList.contains('open');
      closeAll();
      if (!was && menu) menu.classList.add('open');
    });
  });

  document.addEventListener('click', closeAll);

  // ── Footer ────────────────────────────────────────────────────
  var footerCss = [
    '.site-footer{background:#1A1210;color:rgba(255,255,255,0.5);padding:48px 40px 24px;margin-top:auto}',
    '.ft-body{max-width:1100px;margin:0 auto}',
    '.ft-top{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:40px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px}',
    '.ft-brand-row{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
    '.ft-brand-row img{width:36px;height:36px;object-fit:contain;border-radius:5px;opacity:0.9}',
    '.ft-brand-name{font-size:14px;font-weight:700;color:rgba(255,255,255,0.85);font-family:Georgia,serif;line-height:1.2}',
    '.ft-brand-zh{font-size:11px;color:#C9A84C}',
    '.ft-tagline{font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;max-width:240px}',
    '.ft-col-title{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9A7B3A;margin-bottom:14px}',
    '.ft-col a{display:block;font-size:13px;color:rgba(255,255,255,0.45)!important;text-decoration:none!important;margin-bottom:9px;transition:color .15s;background:none!important;border:none!important;padding:0!important}',
    '.ft-col a:hover{color:rgba(255,255,255,0.85)!important}',
    '.ft-bottom{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(255,255,255,0.2);gap:16px;flex-wrap:wrap}',
    '.ft-bottom img{width:20px;height:20px;object-fit:contain;opacity:0.25;border-radius:3px}',
    '.ft-disclaimer{font-size:10px;color:rgba(255,255,255,0.15);line-height:1.6;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);text-align:center}',
    '@media(max-width:900px){.ft-top{grid-template-columns:1fr 1fr;gap:28px}.ft-brand{grid-column:1/-1}}',
    '@media(max-width:600px){.site-footer{padding:40px 20px 20px}.ft-top{grid-template-columns:1fr 1fr;gap:24px}.ft-brand{grid-column:1/-1}.ft-bottom{flex-direction:column;align-items:flex-start;gap:4px}}'
  ].join('');

  if (!document.getElementById('footer-css')) {
    var fs=document.createElement('style'); fs.id='footer-css'; fs.textContent=footerCss; document.head.appendChild(fs);
  }

  function injectFooter() {
    var f = '<footer class="site-footer"><div class="ft-body"><div class="ft-top">'
      + '<div class="ft-brand"><div class="ft-brand-row"><img src="/seal.webp" alt=""><div><div class="ft-brand-name">T\u1eed Vi Minh B\u1ea3o</div><div class="ft-brand-zh">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh</div></div></div><div class="ft-tagline">T\u1eed vi \u0111\u1ea9u s\u1ed1 theo c\u1ed5 ph\u00e1p, lu\u1eadn gi\u1ea3i b\u1eb1ng AI.</div></div>'
      + '<div class="ft-col"><div class="ft-col-title">T\u1eed Vi</div>'
      + '<a href="/luan-giai.html">Lu\u1eadn Gi\u1ea3i L\u00e1 S\u1ed1</a>'
      + '<a href="/xem-tuoi.html">Xem Tu\u1ed5i V\u1ee3 Ch\u1ed3ng</a>'
      + '<a href="/tools/an-sao.html">An Sao L\u00e1 S\u1ed1</a>'
      + '<a href="/blog.html">Kh\u1ea3o Lu\u1eadn</a></div>'
      + '<div class="ft-col"><div class="ft-col-title">Phong Th\u1ee7y & Xem T\u01b0\u1edbng</div>'
      + '<a href="/tools/phong-thuy.html">Phong Th\u1ee7y N\u1ed9i Th\u1ea5t</a>'
      + '<a href="/tools/bat-trach.html">H\u01b0\u1edbng B\u00e1t Tr\u1ea1ch</a>'
      + '<a href="/tools/tuong-mat-ai.html">Xem T\u01b0\u1edbng M\u1eb7t</a>'
      + '<a href="/tools/mau-sac-hop-menh.html">M\u00e0u S\u1eafc H\u1ee3p M\u1ec7nh</a></div>'
      + '<div class="ft-col"><div class="ft-col-title">V\u1ec1 Ch\u00fang T\u00f4i</div>'
      + '<a href="/about.html">Gi\u1edbi Thi\u1ec7u</a>'
      + '<a href="/resources.html">T\u00e0i Li\u1ec7u</a>'
      + '<a href="/menh-kho.html">M\u1ec7nh Kh\u1ed1</a>'
      + '<a href="/contact.html">Li\u00ean H\u1ec7</a></div>'
      + '</div>'
      + '<div class="ft-bottom"><span>\u00a9 2025 T\u1eed Vi Minh B\u1ea3o \u2014 tuviminhbao.com</span><img src="/seal.webp" alt=""></div>'
      + '<div class="ft-disclaimer">N\u1ed9i dung lu\u1eadn gi\u1ea3i mang t\u00ednh tham kh\u1ea3o, kh\u00f4ng th\u1ea3y th\u1ebf t\u01b0 v\u1ea5n chuy\u00ean m\u00f4n.</div>'
      + '</div></footer>';
    var ft=document.createElement('div'); ft.innerHTML=f; document.body.appendChild(ft.firstChild);
  }

  function runFooter() { var o=document.querySelector('footer.site-footer'); if(o)o.remove(); injectFooter(); }
  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded',function(){setTimeout(runFooter,0);}); }
  else { setTimeout(runFooter,0); }

})();
