// nav.js — Shared navigation component v4
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

  var isLuanGiai = ['/luan-giai.html','/xem-tuoi.html','/xem-lam-an.html'].indexOf(path) >= 0;
  var isCongCu   = path.startsWith('/tools/');

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
    // Dropdown desktop
    '.nav-dd{position:relative}',
    '.nav-dd-menu{display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #ccc;border-top:3px solid #c9a84c;min-width:210px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500}',
    '.nav-dd:hover .nav-dd-menu{display:block}',
    '.nav-dd-item{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13px;color:#1a1a1a;text-decoration:none;border-bottom:1px solid #f0f0f0;transition:background .12s}',
    '.nav-dd-item:last-child{border-bottom:none}',
    '.nav-dd-item:hover{background:#F5F4F0;color:#061A2E}',
    '.nav-dd-item.active{color:#9A7B3A;font-weight:600}',
    // Mobile
    '@media(max-width:700px){',
    '.topnav{padding:0 16px}',
    '.nav-links{display:none;position:absolute;top:60px;left:0;right:0;background:#061A2E;flex-direction:column;padding:8px 0 16px;gap:0;border-bottom:1px solid #1a2a3a;z-index:199}',
    '.nav-links.open{display:flex}',
    '.nav-link{padding:10px 24px;border-radius:0;width:100%;display:block}',
    '.nav-hamburger{display:block;margin-left:auto}',
    '.nav-dd{width:100%}',
    '.nav-dd:hover .nav-dd-menu{display:none}',
    '.nav-dd-menu{position:static;border:none;box-shadow:none;background:rgba(255,255,255,.06);width:100%}',
    '.nav-dd-menu.open{display:block !important}',
    '.nav-dd-item{color:#8BAACC;padding:9px 36px;border-bottom:1px solid rgba(255,255,255,.05)}',
    '.nav-dd-item:hover{background:rgba(255,255,255,.05);color:#fff}',
    '.nav-dd-item.active{color:#c9a84c}',
    '}'
  ].join('');

  if (!document.getElementById('nav-css')) {
    var s = document.createElement('style');
    s.id = 'nav-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── HTML ─────────────────────────────────────────────────────────────────
  var ddActiveClass   = isLuanGiai ? ' active' : '';
  var dd2ActiveClass  = isCongCu   ? ' active' : '';

  var html = '<nav class="topnav">'
    + '<a class="nav-logo" href="/"><img src="/seal.webp" alt="">'
    + '<div><div class="name">T\u1eed Vi Minh B\u1ea3o</div><div class="url">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh</div></div></a>'
    + '<div class="nav-links" id="nav-links">'
    + navLink('/', 'Trang Ch\u1ee7')

    // ── Luận Giải dropdown ──
    + '<div class="nav-dd" id="nav-dd">'
    + '<span class="nav-link' + ddActiveClass + '" id="nav-dd-toggle" role="button" tabindex="0">Lu\u1eadn Gi\u1ea3i \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd-menu">'
    + '<a class="nav-dd-item' + (path==='/luan-giai.html'?' active':'') + '" href="/luan-giai.html"><span>\ud83d\udd2e</span> Lu\u1eadn Gi\u1ea3i L\u00e1 S\u1ed1</a>'
    + '<a class="nav-dd-item' + (path==='/xem-tuoi.html'?' active':'') + '" href="/xem-tuoi.html"><span>\ud83d\udc91</span> Xem Tu\u1ed5i V\u1ee3 Ch\u1ed3ng</a>'
    + '<a class="nav-dd-item' + (path==='/xem-lam-an.html'?' active':'') + '" href="/xem-lam-an.html"><span>\ud83e\udd1d</span> Xem Tu\u1ed5i L\u00e0m \u0102n</a>'
    + '</div></div>'

    // ── Công Cụ dropdown ──
    + '<div class="nav-dd" id="nav-dd2">'
    + '<span class="nav-link' + dd2ActiveClass + '" id="nav-dd2-toggle" role="button" tabindex="0">C\u00f4ng C\u1ee5 \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd2-menu">'
    + '<a class="nav-dd-item' + (path==='/tools/nap-am.html'?' active':'') + '" href="/tools/nap-am.html"><span>\ud83d\udd51</span> N\u1ea1p \u00c2m &amp; Can Chi</a>'
    + '<a class="nav-dd-item' + (path==='/tools/dai-van.html'?' active':'') + '" href="/tools/dai-van.html"><span>\ud83d\udcc5</span> Xem \u0110\u1ea1i V\u1eadn</a>'
    + '<a class="nav-dd-item' + (path==='/tools/sao-nam.html'?' active':'') + '" href="/tools/sao-nam.html"><span>\u2b50</span> Sao N\u0103m Hi\u1ec7n T\u1ea1i</a>'
    + '<a class="nav-dd-item' + (path==='/tools/cach-cuc.html'?' active':'') + '" href="/tools/cach-cuc.html"><span>\ud83c\udfc6</span> C\u00e1ch C\u1ee5c \u0110\u1eb7c Bi\u1ec7t</a>'
    + '<a class="nav-dd-item' + (path==='/tools/tuong-hop.html'?' active':'') + '" href="/tools/tuong-hop.html"><span>\ud83d\udc95</span> T\u01b0\u01a1ng H\u1ee3p Tu\u1ed5i</a>'
    + '<a class="nav-dd-item' + (path==='/tools/kim-lau.html'?' active':'') + '" href="/tools/kim-lau.html"><span>\ud83c\udfe0</span> Kim L\u00e2u / Tam Tai</a>'
    + '<a class="nav-dd-item' + (path==='/tools/tu-tru.html'?' active':'') + '" href="/tools/tu-tru.html"><span>\ud83d\udcdc</span> T\u1ee9 Tr\u1ee5 B\u00e1t T\u1ef1</a>'
    + '</div></div>'

    + navLink('/about.html', 'Gi\u1edbi Thi\u1ec7u')
    + navLink('/resources.html', 'T\u00e0i Li\u1ec7u')
    + navLink('/blog.html', 'V\u1ea5n \u0110\u00e1p')
    + navLink('/menh-kho.html', 'M\u1ec7nh Kh\u1ed1')
    + navLink('/contact.html', 'Li\u00ean H\u1ec7')
    + '</div>'
    + '<div id="nav-auth-area"></div>'
    + '<button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">\u2630</button>'
    + '</nav>';

  // Xóa nav cũ, inject mới
  var old = document.querySelector('nav.topnav');
  if (old) old.remove();
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  document.body.insertBefore(tmp.firstChild, document.body.firstChild);

  // ── Events ───────────────────────────────────────────────────────────────
  // Hamburger
  document.getElementById('nav-hamburger').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('nav-links').classList.toggle('open');
  });

  // Helper: setup dropdown toggle (mobile only)
  function setupDropdown(toggleId, menuId) {
    var toggle = document.getElementById(toggleId);
    var menu   = document.getElementById(menuId);
    toggle.addEventListener('click', function(e) {
      if (window.innerWidth <= 700) {
        e.preventDefault();
        e.stopPropagation();
        // Đóng dropdown khác trước
        document.querySelectorAll('.nav-dd-menu').forEach(function(m) {
          if (m !== menu) m.classList.remove('open');
        });
        menu.classList.toggle('open');
      }
    });
    toggle.style.cursor = 'pointer';
    toggle.style.webkitTapHighlightColor = 'transparent';
    toggle.setAttribute('ontouchstart', '');
  }

  setupDropdown('nav-dd-toggle',  'nav-dd-menu');
  setupDropdown('nav-dd2-toggle', 'nav-dd2-menu');

  // Click ngoài thì đóng tất cả
  document.addEventListener('click', function() {
    document.querySelectorAll('.nav-dd-menu').forEach(function(m) {
      m.classList.remove('open');
    });
  });

})();
