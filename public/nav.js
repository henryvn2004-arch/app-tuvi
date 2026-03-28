// nav.js — Shared navigation component v3
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
    // QUAN TRỌNG: tắt hover trên mobile
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
  var ddActiveClass = isLuanGiai ? ' active' : '';
  var html = '<nav class="topnav">'
    + '<a class="nav-logo" href="/"><img src="/seal.webp" alt="">'
    + '<div><div class="name">T\u1eed Vi Minh B\u1ea3o</div><div class="url">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh</div></div></a>'
    + '<div class="nav-links" id="nav-links">'
    + navLink('/', 'Trang Ch\u1ee7')
    + '<div class="nav-dd" id="nav-dd">'
    + '<span class="nav-link' + ddActiveClass + '" id="nav-dd-toggle" role="button" tabindex="0">Lu\u1eadn Gi\u1ea3i \u25be</span>'
    + '<div class="nav-dd-menu" id="nav-dd-menu">'
    + '<a class="nav-dd-item' + (path==='/luan-giai.html'?' active':'') + '" href="/luan-giai.html"><span>\ud83d\udd2e</span> Lu\u1eadn Gi\u1ea3i L\u00e1 S\u1ed1</a>'
    + '<a class="nav-dd-item' + (path==='/xem-tuoi.html'?' active':'') + '" href="/xem-tuoi.html"><span>\ud83d\udc91</span> Xem Tu\u1ed5i V\u1ee3 Ch\u1ed3ng</a>'
    + '<a class="nav-dd-item' + (path==='/xem-lam-an.html'?' active':'') + '" href="/xem-lam-an.html"><span>\ud83e\udd1d</span> Xem Tu\u1ed5i L\u00e0m \u0102n</a>'
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

  // Dropdown toggle — chỉ hoạt động trên mobile (<=700px)
  var ddToggle = document.getElementById('nav-dd-toggle');
  var ddMenu   = document.getElementById('nav-dd-menu');

  ddToggle.addEventListener('click', function(e) {
    if (window.innerWidth <= 700) {
      e.preventDefault();
      e.stopPropagation();
      ddMenu.classList.toggle('open');
    }
  });

  // iPhone Safari: cần pointer-events và cursor
  ddToggle.style.cursor = 'pointer';
  ddToggle.style.webkitTapHighlightColor = 'transparent';
  // Safari iOS fix: thêm empty ontouchstart để element nhận click
  ddToggle.setAttribute('ontouchstart', '');

  // Click ngoài thì đóng
  document.addEventListener('click', function() {
    ddMenu.classList.remove('open');
  });

})();
