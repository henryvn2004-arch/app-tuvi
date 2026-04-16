// nav.js — Shared navigation component v5 (+ Xem Tướng dropdown)
(function () {
  var path = window.location.pathname;

  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path === href || path.startsWith(href.replace('.html', ''));
  }

  function navLink(href, label) {
    var cls = 'nav-link' + (isActive(href) ? ' active' : '');
    return '<a class="' + cls + '" href="' + href + '">' + label + '</a>';
  }

  function ddItem(href, icon, label) {
    var active = path === href ? ' active' : '';
    return '<a class="nav-dd-item' + active + '" href="' + href + '"><span>' + icon + '</span> ' + label + '</a>';
  }

  function ddSection(label) {
    return '<div class="nav-dd-section">' + label + '</div>';
  }

  var isLuanGiai = ['/luan-giai.html','/xem-tuoi.html','/xem-lam-an.html'].indexOf(path) >= 0;
  var isTuong    = ['/tools/tuong-mat-ai.html','/tools/nhan-tuong-ai.html','/tools/thu-tuong-ai.html','/tools/thanh-tuong-ai.html'].indexOf(path) >= 0;
  var isTool     = path.indexOf('/tools/') === 0 && !isTuong;

  // ── CSS ──────────────────────────────────────────────────────────────────
  var css = [
    '.topnav{position:sticky;top:0;z-index:200;background:#061A2E;display:flex;align-items:center;height:60px;padding:0 40px;gap:32px}',
    '.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}',
    '.nav-logo img{width:38px;height:38px;object-fit:contain;border-radius:5px}',
    '.nav-logo .name{font-size:16px;font-weight:700;color:#CC2200;font-family:Georgia,serif}',
    '.nav-logo .url{font-size:10px;color:#aaa;letter-spacing:.07em;text-transform:uppercase}',
    '.nav-links{display:flex;align-items:center;gap:4px}',
    '.nav-link{color:#8BAACC;font-size:13px;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all .15s;white-space:nowrap;cursor:pointer}',
    '.nav-link:hover{color:#fff;background:rgba(255,255,255,.07)}',
    '.nav-link.active{color:#c9a84c}',
    '.nav-hamburger{display:none;background:none;border:none;color:#8BAACC;cursor:pointer;padding:8px;font-size:20px;z-index:400;position:relative}',
    // Dropdown
    '.nav-dd{position:relative;display:flex;align-items:center}',
    '.nav-dd-menu{display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #ccc;border-top:3px solid #c9a84c;min-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500;max-height:80vh;overflow-y:auto}',
    '.nav-dd:hover .nav-dd-menu{display:block}',
    '.nav-dd-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13px;color:#1a1a1a;text-decoration:none;border-bottom:1px solid #f0f0f0;transition:background .12s}',
    '.nav-dd-item:last-child{border-bottom:none}',
    '.nav-dd-item:hover{background:#F5F4F0;color:#061A2E}',
    '.nav-dd-item.active{color:#9A7B3A;font-weight:600}',
    '.nav-dd-section{padding:8px 16px 4px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9A7B3A;background:#fdfaf5;border-bottom:1px solid #efe8d8;margin-top:2px}',
    '.nav-dd-section:first-child{margin-top:0}',
    // Mobile
    '@media(max-width:700px){',
    '.topnav{padding:0 16px}',
    '.nav-links{display:none;position:absolute;top:60px;left:0;right:0;background:#061A2E;flex-direction:column;padding:8px 0 16px;gap:0;border-bottom:1px solid #1a2a3a;z-index:199;overflow-y:auto;max-height:calc(100vh - 60px)}',
    '.nav-links.open{display:flex}',
    '.nav-link{padding:10px 24px;border-radius:0;width:100%;display:block}',
    '.nav-hamburger{display:block;margin-left:auto}',
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

  // ── Conversion (Social Proof + Popup) ─────────────────────────────────
  if (!document.getElementById('cv-script')) {
    var cv = document.createElement('script');
    cv.id = 'cv-script';
    cv.src = '/conversion.js';
    document.body.appendChild(cv);
  }

  // ── Google Analytics 4 ─────────────────────────────────────────────────
  if (!document.getElementById('gtag-js')) {
    var ga = document.createElement('script');
    ga.id = 'gtag-js'; ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-F4XNRS2XT0';
    document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'G-F4XNRS2XT0');
  }

  if (!document.getElementById('nav-css')) {
    var s = document.createElement('style');
    s.id = 'nav-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Build HTML ────────────────────────────────────────────────────────
  var lgActive    = isLuanGiai ? ' active' : '';
  var tuongActive = isTuong    ? ' active' : '';
  var toolActive  = isTool     ? ' active' : '';

  // DD1 — Luận Giải
  var luanGiaiDD = '<div class="nav-dd" id="nav-dd">'
    + '<span class="nav-link' + lgActive + '" id="nav-dd-toggle" role="button" tabindex="0">Lu\u1eadn Gi\u1ea3i \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd-menu">'
    + ddItem('/luan-giai.html',  '\ud83d\udd2e', 'Lu\u1eadn Gi\u1ea3i L\u00e1 S\u1ed1')
    + ddItem('/xem-tuoi.html',   '\ud83d\udc91', 'Xem Tu\u1ed5i V\u1ee3 Ch\u1ed3ng')
    + ddItem('/xem-lam-an.html', '\ud83e\udd1d', 'Xem Tu\u1ed5i L\u00e0m \u0102n')
    + '</div></div>';

  // DD2 — Xem Tướng (NEW — ngay sau Luận Giải)
  var xemTuongDD = '<div class="nav-dd" id="nav-dd2">'
    + '<span class="nav-link' + tuongActive + '" id="nav-dd2-toggle" role="button" tabindex="0">Xem T\u01b0\u1edbng \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd2-menu">'
    + ddItem('/tools/tuong-mat-ai.html', '\ud83d\ude42', 'Di\u1ec7n T\u01b0\u1edbng \u2014 Xem T\u01b0\u1edbng M\u1eb7t')
    + ddItem('/tools/nhan-tuong-ai.html', '\ud83d\udc41', 'Nh\u00e3n T\u01b0\u1edbng \u2014 Xem T\u01b0\u1edbng M\u1eaft')
    + ddItem('/tools/thu-tuong-ai.html',  '\u270b', 'Th\u1ee7 T\u01b0\u1edbng \u2014 Xem Ch\u1ec9 Tay')
    + ddItem('/tools/thanh-tuong-ai.html', '\ud83c\udfa4', 'Thanh T\u01b0\u1edbng \u2014 Xem T\u01b0\u1edbng Gi\u1ecdng N\u00f3i')
    + '</div></div>';

  // DD3 — Công Cụ (tuong-mat-ai đã tách ra rồi, không còn trong đây)
  var congCuDD = '<div class="nav-dd" id="nav-dd3">'
    + '<span class="nav-link' + toolActive + '" id="nav-dd3-toggle" role="button" tabindex="0">C\u00f4ng C\u1ee5 \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd3-menu">'

    + ddSection('T\u1eed Vi \u0110\u1ea9u S\u1ed1')
    + ddItem('/tools/an-sao.html',    '\ud83d\udcca', 'An Sao L\u00e1 S\u1ed1')
    + ddItem('/tools/sao-nam.html',   '\u2609',       'T\u1ed5ng Quan L\u00e1 S\u1ed1')
    + ddItem('/tools/cach-cuc.html',  '\u26e7',       'C\u00e1ch C\u1ee5c & C\u00e1c Cung')
    + ddItem('/tools/dai-van.html',   '\ud83d\udcc8', '\u0110\u1ea1i V\u1eadn & V\u1eadn Tr\u00ecnh')
    + ddItem('/tools/van-thang.html', '\ud83d\uddd3', 'V\u1eadn Th\u00e1ng')

    + ddSection('L\u1ecbch S\u1ed1 & Ng\u00e0y Gi\u1edd')
    + ddItem('/tools/hoang-dao.html', '\u2600\ufe0f',  'Gi\u1edd Ho\u00e0ng \u0110\u1ea1o')
    + ddItem('/tools/ngay-tot.html',  '\ud83d\udcc5',  'Ng\u00e0y T\u1ed1t Trong Th\u00e1ng')
    + ddItem('/tools/luc-nham.html',  '\u26b8',        'L\u1ee5c Nh\u00e2m Gi\u1ea3n')
    + ddItem('/tools/han-nam.html',   '\ud83d\udd04',  'H\u1ea1n N\u0103m')

    + ddSection('M\u1ec7nh L\u00fd & Phong Th\u1ee7y')
    + ddItem('/tools/bat-trach.html',    '\ud83e\uddad', 'H\u01b0\u1edbng B\u00e1t Tr\u1ea1ch')
    + ddItem('/tools/nap-am.html',       '\ud83c\udf00', 'N\u1ea1p \u00c2m Ng\u0169 H\u00e0nh')
    + ddItem('/tools/tuong-hop.html',    '\u2764\ufe0f', 'T\u01b0\u01a1ng H\u1ee3p Tu\u1ed5i')
    + ddItem('/tools/kim-lau.html',      '\ud83c\udfe0', 'Kim L\u00e2u & Tam Tai')
    + ddItem('/tools/ngu-hanh-ten.html', '\u270d\ufe0f', 'Ng\u0169 H\u00e0nh T\u00ean')
    + ddItem('/tools/tu-tru.html',       '\ud83d\udcdc', 'T\u1ee9 Tr\u1ee5 B\u00e1t T\u1ef1')

    + ddSection('Huy\u1ec1n H\u1ecdc & Ph\u01b0\u01a1ng T\u00e2y')
    + ddItem('/tools/kinh-dich.html',   '\u262f',       'Kinh D\u1ecbch 64 Qu\u1ebb')
    + ddItem('/tools/than-so-hoc.html', '\ud83d\udd22', 'Th\u1ea7n S\u1ed1 H\u1ecdc')

    + ddSection('B\u00f3i B\u00e0i & Huy\u1ec1n H\u1ecdc')
    + ddItem('/tools/tarot.html',       '\ud83c\udccf', 'Tarot 78 L\u00e1')
    + ddItem('/tools/oracle.html',      '\u2728',       'Oracle Ph\u01b0\u01a1ng \u0110\u00f4ng')
    + ddItem('/tools/boi-bai-tay.html', '\ud83c\udca0', 'B\u00f3i B\u00e0i T\u00e2y')

    + '</div></div>';

  var html = '<nav class="topnav">'
    + '<a class="nav-logo" href="/"><img src="/seal.webp" alt="">'
    + '<div><div class="name">T\u1eed Vi Minh B\u1ea3o</div><div class="url">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh</div></div></a>'
    + '<div class="nav-links" id="nav-links">'
    + navLink('/', 'Trang Ch\u1ee7')
    + luanGiaiDD
    + xemTuongDD
    + congCuDD
    + navLink('/about.html',     'Gi\u1edbi Thi\u1ec7u')
    + navLink('/resources.html', 'T\u00e0i Li\u1ec7u')
    + navLink('/blog.html',      'Kh\u1ea3o Lu\u1eadn')
    + navLink('/menh-kho.html',  'M\u1ec7nh Kh\u1ed1')
    + navLink('/contact.html',   'Li\u00ean H\u1ec7')
    + '</div>'
    + '<div id="nav-auth-area"></div>'
    + '<button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">\u2630</button>'
    + '</nav>';

  // Inject
  var old = document.querySelector('nav.topnav');
  if (old) old.remove();
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  document.body.insertBefore(tmp.firstChild, document.body.firstChild);

  // ── Events ─────────────────────────────────────────────────────────────
  var ddMenu1 = document.getElementById('nav-dd-menu');
  var ddMenu2 = document.getElementById('nav-dd2-menu');
  var ddMenu3 = document.getElementById('nav-dd3-menu');

  function closeAll() {
    ddMenu1.classList.remove('open');
    ddMenu2.classList.remove('open');
    ddMenu3.classList.remove('open');
  }

  // Hamburger
  document.getElementById('nav-hamburger').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('nav-links').classList.toggle('open');
  });

  // DD1: Luận Giải (mobile toggle)
  var _dd1Busy = false;
  document.getElementById('nav-dd-toggle').addEventListener('click', function(e) {
    if (window.innerWidth <= 700) {
      e.preventDefault(); e.stopPropagation();
      if (_dd1Busy) return; _dd1Busy = true; setTimeout(function(){_dd1Busy=false;},300);
      var was = ddMenu1.classList.contains('open');
      closeAll();
      if (!was) ddMenu1.classList.add('open');
    }
  });

  // DD2: Xem Tướng (mobile toggle)
  var _dd2Busy = false;
  document.getElementById('nav-dd2-toggle').addEventListener('click', function(e) {
    if (window.innerWidth <= 700) {
      e.preventDefault(); e.stopPropagation();
      if (_dd2Busy) return; _dd2Busy = true; setTimeout(function(){_dd2Busy=false;},300);
      var was = ddMenu2.classList.contains('open');
      closeAll();
      if (!was) ddMenu2.classList.add('open');
    }
  });

  // DD3: Công Cụ (mobile toggle)
  var _dd3Busy = false;
  document.getElementById('nav-dd3-toggle').addEventListener('click', function(e) {
    if (window.innerWidth <= 700) {
      e.preventDefault(); e.stopPropagation();
      if (_dd3Busy) return; _dd3Busy = true; setTimeout(function(){_dd3Busy=false;},300);
      var was = ddMenu3.classList.contains('open');
      closeAll();
      if (!was) ddMenu3.classList.add('open');
    }
  });

  // Click outside → đóng tất cả
  document.addEventListener('click', closeAll);

})();
