// nav.js — Shared navigation component
// Include trước </body> trong tất cả pages: <script src="/nav.js"></script>
// Nav tự detect active link dựa trên window.location.pathname

(function () {
  var path = window.location.pathname;

  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path === href || path.startsWith(href.replace('.html', ''));
  }

  function a(href, label, extra) {
    var cls = 'nav-link' + (isActive(href) ? ' active' : '');
    return '<a class="' + cls + '" href="' + href + '"' + (extra || '') + '>' + label + '</a>';
  }

  var isLuanGiai = path === '/luan-giai.html' || path === '/xem-tuoi.html' || path === '/xem-lam-an.html';
  var luanGiaiActive = isLuanGiai ? ' active' : '';

  var navHTML = '\
<nav class="topnav">\
  <a class="nav-logo" href="/">\
    <img src="/seal.webp" alt="T\u1eed Vi Minh B\u1ea3o">\
    <div>\
      <div class="name">T\u1eed Vi Minh B\u1ea3o</div>\
      <div class="url">Tri m\u1ec7nh l\u00fd \u2013 Thu\u1eadn th\u1ebf h\u00e0nh</div>\
    </div>\
  </a>\
  <div class="nav-links" id="nav-links">\
    ' + a('/', 'Trang Ch\u1ee7') + '\
    <div class="nav-dropdown">\
      <a class="nav-link' + luanGiaiActive + '" href="#" id="nav-luan-giai-toggle">Lu\u1eadn Gi\u1ea3i \u25be</a>\
      <div class="nav-dropdown-menu" id="nav-luan-giai-menu">\
        <a class="nav-dropdown-item' + (path === '/luan-giai.html' ? ' active' : '') + '" href="/luan-giai.html">\
          <span>\ud83d\udd2e</span> Lu\u1eadn Gi\u1ea3i L\u00e1 S\u1ed1\
        </a>\
        <a class="nav-dropdown-item' + (path === '/xem-tuoi.html' ? ' active' : '') + '" href="/xem-tuoi.html">\
          <span>\ud83d\udc91</span> Xem Tu\u1ed5i V\u1ee3 Ch\u1ed3ng\
        </a>\
        <a class="nav-dropdown-item' + (path === '/xem-lam-an.html' ? ' active' : '') + '" href="/xem-lam-an.html">\
          <span>\ud83e\udd1d</span> Xem Tu\u1ed5i L\u00e0m \u0102n\
        </a>\
      </div>\
    </div>\
    ' + a('/about.html', 'Gi\u1edbi Thi\u1ec7u') + '\
    ' + a('/resources.html', 'T\u00e0i Li\u1ec7u') + '\
    ' + a('/blog.html', 'Kh\u1ea3o Lu\u1eadn') + '\
    ' + a('/menh-kho.html', 'M\u1ec7nh Kh\u1ed1') + '\
    ' + a('/contact.html', 'Li\u00ean H\u1ec7') + '\
  </div>\
  <div id="nav-auth-area"></div>\
  <button class="nav-hamburger" id="nav-hamburger-btn">\u2630</button>\
</nav>';

  // Inject CSS nếu chưa có
  if (!document.getElementById('nav-css')) {
    var style = document.createElement('style');
    style.id = 'nav-css';
    style.textContent = '\
.topnav{position:sticky;top:0;z-index:200;background:#061A2E;display:flex;align-items:center;height:60px;padding:0 40px;gap:32px}\
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}\
.nav-logo img{width:38px;height:38px;object-fit:contain;border-radius:5px}\
.nav-logo .name{font-size:16px;font-weight:700;color:#CC2200;font-family:Georgia,serif}\
.nav-logo .url{font-size:10px;color:#aaa;letter-spacing:.07em;text-transform:uppercase}\
.nav-links{display:flex;align-items:center;gap:4px}\
.nav-link{color:#8BAACC;font-size:13px;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all .15s;white-space:nowrap}\
.nav-link:hover{color:#fff;background:rgba(255,255,255,.07)}\
.nav-link.active{color:#c9a84c}\
.nav-hamburger{display:none;background:none;border:none;color:#8BAACC;cursor:pointer;padding:8px;font-size:20px;position:relative;z-index:400}\
.nav-dropdown{position:relative}\
.nav-dropdown-menu{display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #ccc;border-top:3px solid #c9a84c;min-width:210px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500}\
.nav-dropdown:hover .nav-dropdown-menu{display:block}\
.nav-dropdown-item{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13px;color:#1a1a1a;text-decoration:none;border-bottom:1px solid #f0f0f0;transition:background .12s}\
.nav-dropdown-item:last-child{border-bottom:none}\
.nav-dropdown-item:hover,.nav-dropdown-item.active{background:#F5F4F0;color:#061A2E}\
@media(max-width:700px){\
  .topnav{padding:0 16px}\
  .nav-links{display:none;position:absolute;top:60px;left:0;right:0;background:#061A2E;flex-direction:column;padding:8px 0 16px;gap:0;border-bottom:1px solid #1a2a3a;z-index:199}\
  .nav-links.open{display:flex}\
  .nav-link{padding:10px 24px;border-radius:0;width:100%}\
  .nav-hamburger{display:block;margin-left:auto}\
  .nav-dropdown{width:100%}\
  .nav-dropdown>.nav-link{width:100%;display:block}\
  .nav-dropdown-menu{position:static;border:none;box-shadow:none;background:rgba(255,255,255,.05);display:none;width:100%}\
  .nav-dropdown-menu.open{display:block}\
  .nav-dropdown:hover .nav-dropdown-menu{display:none}\
  .nav-dropdown-item{color:#8BAACC;padding:9px 32px;border-bottom:1px solid rgba(255,255,255,.05)}\
  .nav-dropdown-item:hover,.nav-dropdown-item.active{background:rgba(255,255,255,.05);color:#fff}\
}';
    document.head.appendChild(style);
  }

  // Xóa nav cũ nếu có, inject nav mới
  var existing = document.querySelector('nav.topnav');
  if (existing) existing.remove();

  var tmp = document.createElement('div');
  tmp.innerHTML = navHTML;
  var navEl = tmp.firstChild;
  document.body.insertBefore(navEl, document.body.firstChild);

  // Hamburger toggle
  document.getElementById('nav-hamburger-btn').addEventListener('click', function () {
    document.getElementById('nav-links').classList.toggle('open');
  });

  // Mobile dropdown toggle
  var ddToggle = document.getElementById('nav-luan-giai-toggle');
  var ddMenu   = document.getElementById('nav-luan-giai-menu');
  var touched  = false;

  ddToggle.addEventListener('touchend', function(e) {
    if (window.innerWidth <= 700) {
      e.preventDefault();
      e.stopPropagation();
      touched = true;
      ddMenu.classList.toggle('open');
    }
  });

  ddToggle.addEventListener('click', function(e) {
    if (window.innerWidth <= 700) {
      if (touched) { touched = false; return; } // đã xử lý bởi touchend
      e.preventDefault();
      e.stopPropagation();
      ddMenu.classList.toggle('open');
    }
  });

})();
