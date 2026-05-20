// nav.js — Shared navigation component v11 (Lucide line icons, replaces emoji)
(function () {
  var path = window.location.pathname;

  // Auto-generated from lucide-static v1.16.0 — 39 icons
  var ICONS = {
    'aperture': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m14.31 8 5.74 9.94" /><path d="M9.69 8h11.48" /><path d="m7.38 12 5.74-9.94" /><path d="M9.69 16 3.95 6.06" /><path d="M14.31 16H2.83" /><path d="m16.62 12-5.74 9.94" /></svg>',
    'baby': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M15 12h.01" /><path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" /><path d="M9 12h.01" /></svg>',
    'building-2': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h4" /><path d="M10 8h4" /><path d="M14 21v-3a2 2 0 0 0-4 0v3" /><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" /><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /></svg>',
    'calendar-days': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>',
    'calendar': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>',
    'chevron-down': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>',
    'circle-dot': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="1" /></svg>',
    'compass': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /></svg>',
    'eye': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>',
    'file-text': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>',
    'gem': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 3 8 9l4 13 4-13-2.5-6" /><path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z" /><path d="M2 9h20" /></svg>',
    'hand': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>',
    'handshake': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></svg>',
    'hash': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg>',
    'heart-handshake': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762" /></svg>',
    'heart': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" /></svg>',
    'home': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>',
    'layout-grid': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>',
    'menu': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" /></svg>',
    'message-circle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></svg>',
    'mic': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19v3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><rect x="9" y="2" width="6" height="13" rx="3" /></svg>',
    'monitor': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>',
    'music': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>',
    'palette': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
    'pen-line': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 21h8" /><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /></svg>',
    'pin': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>',
    'rotate-cw': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>',
    'scissors': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>',
    'scroll-text': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></svg>',
    'smile': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>',
    'spade': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18v4" /><path d="M2 14.499a5.5 5.5 0 0 0 9.591 3.675.6.6 0 0 1 .818.001A5.5 5.5 0 0 0 22 14.5c0-2.29-1.5-4-3-5.5l-5.492-5.312a2 2 0 0 0-3-.02L5 8.999c-1.5 1.5-3 3.2-3 5.5" /></svg>',
    'sparkles': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>',
    'store': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" /></svg>',
    'sun': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>',
    'sunrise': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 6 4-4 4 4" /><path d="M16 18a4 4 0 0 0-8 0" /></svg>',
    'tornado': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H3" /><path d="M18 8H6" /><path d="M19 12H9" /><path d="M16 16h-6" /><path d="M11 20H9" /></svg>',
    'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></svg>',
    'user': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>',
    'wallet-cards': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" /><path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21" /></svg>'
  };

  var CHEV = ICONS['chevron-down'];

  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path === href || path.startsWith(href.replace('.html', ''));
  }
  function navLink(href, label) {
    return '<a class="nav-link' + (isActive(href) ? ' active' : '') + '" href="' + href + '">' + label + '</a>';
  }
  function ddItem(href, iconKey, label) {
    var icon = ICONS[iconKey] || '';
    return '<a class="nav-dd-item' + (path === href ? ' active' : '') + '" href="' + href + '"><span class="nav-ic">' + icon + '</span> ' + label + '</a>';
  }
  function ddSection(label) {
    return '<div class="nav-dd-section">' + label + '</div>';
  }

  // Active state detection
  var TUVI_PATHS   = ['/', '/luan-giai.html','/xem-tuoi.html','/xem-lam-an.html','/tools/xem-tuoi-sinh-con.html','/tools/an-sao.html','/tools/sao-nam.html','/tools/cach-cuc.html','/tools/dai-van.html','/tools/van-thang.html'];
  var TUONG_PATHS  = ['/tools/tuong-mat-ai.html','/tools/nhan-tuong-ai.html','/tools/thu-tuong-ai.html','/tools/thanh-tuong-ai.html','/tools/thanh-tuong-pro.html','/tools/khi-sac-ai.html'];
  var LAM_DEP_PATHS = ['/tools/kieu-toc-ai.html','/tools/mau-sac-hop-menh.html'];
  var PHONG_PATHS  = ['/tools/phong-thuy.html','/tools/ban-lam-viec.html','/tools/cua-hang-phong-thuy.html','/tools/bat-trach.html','/tools/kim-lau.html'];
  var NGAY_PATHS   = ['/tools/hoang-dao.html','/tools/ngay-tot.html','/tools/luc-nham.html','/tools/han-nam.html','/tools/chon-ngay-tot.html'];
  var TENCHU_PATHS  = ['/tools/dat-ten-con.html','/tools/dat-ten-doanh-nghiep.html'];
  var BAIVIET_PATHS = ['/blog.html','/nghien-cuu','/tac-gia'];

  function anyActive(arr) { return arr.some(function(p){ return path === p || path.startsWith(p + '/') || path.startsWith(p); }); }

  var css = [
    '.topnav{position:sticky;top:0;z-index:200;background:#061A2E;display:flex;align-items:center;height:60px;padding:0 40px;gap:28px}',
    '.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0}',
    '.nav-logo img{width:38px;height:38px;object-fit:contain;border-radius:5px}',
    '.nav-logo .name{font-size:16px;font-weight:700;color:#CC2200;font-family:Georgia,serif}',
    '.nav-logo .url{font-size:10px;color:#aaa;letter-spacing:.07em;text-transform:uppercase}',
    '.nav-links{display:flex;align-items:center;gap:2px;flex:1;overflow:visible}',
    '.nav-link{color:#8BAACC;font-size:13px;text-decoration:none;padding:6px 10px;border-radius:6px;transition:all .15s;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:4px}',
    '.nav-link:hover{color:#fff;background:rgba(255,255,255,.07)}',
    '.nav-link.active{color:#c9a84c}',
    '.nav-link svg{width:11px;height:11px;opacity:.7;flex-shrink:0}',
    '.nav-hamburger{display:none;background:none;border:none;color:#8BAACC;cursor:pointer;padding:8px;z-index:400;position:relative}',
    '.nav-hamburger svg{width:22px;height:22px;display:block}',
    '.nav-dd{position:relative;display:flex;align-items:center}',
    '.nav-dd-menu{display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #ccc;border-top:3px solid #c9a84c;min-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500;max-height:80vh;overflow-y:auto}',
    '.nav-dd:hover .nav-dd-menu{display:block}',
    '.nav-dd-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13px;color:#1a1a1a;text-decoration:none;border-bottom:1px solid #f0f0f0;transition:background .12s}',
    '.nav-dd-item:last-child{border-bottom:none}',
    '.nav-dd-item:hover{background:#F5F4F0;color:#061A2E}',
    '.nav-dd-item.active{color:#9A7B3A;font-weight:600}',
    '.nav-dd-item .nav-ic{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;color:#9A7B3A}',
    '.nav-dd-item .nav-ic svg{width:16px;height:16px;display:block}',
    '.nav-dd-section{padding:8px 16px 4px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9A7B3A;background:#fdfaf5;border-bottom:1px solid #efe8d8;margin-top:2px}',
    '.nav-dd-section:first-child{margin-top:0}',
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
    '.nav-dd-item .nav-ic{color:#c9a84c}',
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
    + '<span class="nav-link' + (anyActive(TUVI_PATHS)?' active':'') + '" id="nav-dd1-toggle" role="button" tabindex="0">Tử Vi ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd1-menu">'
    + ddSection('Luận Giải')
    + ddItem('/luan-giai.html',              'sparkles',        'Luận Giải Lá Số')
    + ddItem('/xem-tuoi.html',               'heart-handshake', 'Xem Tuổi Vợ Chồng')
    + ddItem('/xem-lam-an.html',             'handshake',       'Xem Tuổi Làm Ăn')
    + ddItem('/tools/xem-tuoi-sinh-con.html','baby',            'Xem Tuổi Sinh Con — Miễn Phí')
    + ddSection('Công Cụ Tử Vi')
    + ddItem('/tools/an-sao.html',    'layout-grid',   'An Sao Lá Số')
    + ddItem('/tools/sao-nam.html',   'sun',           'Tổng Quan Lá Số')
    + ddItem('/tools/cach-cuc.html',  'gem',           'Cách Cục & Các Cung')
    + ddItem('/tools/dai-van.html',   'trending-up',   'Đại Vận & Vận Trình')
    + ddItem('/tools/van-thang.html', 'calendar-days', 'Vận Tháng')
    + '</div></div>';

  // DD2 — Xem Tướng
  var dd2 = '<div class="nav-dd" id="nav-dd2">'
    + '<span class="nav-link' + (anyActive(TUONG_PATHS)?' active':'') + '" id="nav-dd2-toggle" role="button" tabindex="0">Xem Tướng ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd2-menu">'
    + ddItem('/tools/tuong-mat-ai.html',   'smile',   'Diện Tướng — Xem Mặt')
    + ddItem('/tools/nhan-tuong-ai.html',  'eye',     'Nhãn Tướng — Xem Mắt')
    + ddItem('/tools/thu-tuong-ai.html',   'hand',    'Thủ Tướng — Chỉ Tay')
    + ddItem('/tools/thanh-tuong-ai.html', 'mic',     'Thanh Tướng — Giọng Nói')
    + ddItem('/tools/thanh-tuong-pro.html','music',   'Thanh Tướng Pro')
    + ddItem('/tools/khi-sac-ai.html',     'sunrise', 'Khí Sắc — Vận Khí 1–3 Tháng')

    + '</div></div>';

  // DD3 — Phong Thủy
  var dd3 = '<div class="nav-dd" id="nav-dd3">'
    + '<span class="nav-link' + (anyActive(PHONG_PATHS)?' active':'') + '" id="nav-dd3-toggle" role="button" tabindex="0">Phong Thủy ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd3-menu">'
    + ddSection('Phân Tích Không Gian')
    + ddItem('/tools/phong-thuy.html',           'compass', 'Phong Thủy Nội Thất')
    + ddItem('/tools/ban-lam-viec.html',          'monitor', 'Phong Thủy Bàn Làm Việc')
    + ddItem('/tools/cua-hang-phong-thuy.html',   'store',   'Phong Thủy Cửa Hàng & VP')
    + ddSection('Mệnh Lý & Phong Thủy')
    + ddItem('/tools/bat-trach.html',             'compass', 'Hướng Bát Trạch')
    + ddItem('/tools/kim-lau.html',               'home',    'Kim Lâu & Tam Tai')

    + '</div></div>';


  // DD_LAM_DEP — Làm Đẹp
  var dd_dep = '<div class="nav-dd" id="nav-dd-dep">'
    + '<span class="nav-link' + (anyActive(LAM_DEP_PATHS)?' active':'') + '" id="nav-dd-dep-toggle" role="button" tabindex="0">Làm Đẹp ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd-dep-menu">'
    + ddSection('Tư Vấn Ngoại Hình')
    + ddItem('/tools/kieu-toc-ai.html',       'scissors', 'Kiểu Tóc Hợp Tướng Mặt')
    + ddItem('/tools/mau-sac-hop-menh.html',  'palette',  'Màu Sắc & Thử Trang Phục')
    + '</div></div>';

  // DD4 — Chọn Ngày
  var dd4 = '<div class="nav-dd" id="nav-dd4">'
    + '<span class="nav-link' + (anyActive(NGAY_PATHS)?' active':'') + '" id="nav-dd4-toggle" role="button" tabindex="0">Chọn Ngày ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd4-menu">'
    + ddItem('/tools/hoang-dao.html',  'sun',         'Giờ Hoàng Đạo')
    + ddItem('/tools/ngay-tot.html',   'calendar',    'Ngày Tốt Trong Tháng')
    + ddItem('/tools/chon-ngay-tot.html', 'pin',      'Chọn Ngày Tốt')
    + ddItem('/tools/luc-nham.html',   'circle-dot',  'Lục Nhâm Giản')
    + ddItem('/tools/han-nam.html',    'rotate-cw',   'Hạn Năm')
    + '</div></div>';

  // DD5 — Đặt Tên
  var dd5 = '<div class="nav-dd" id="nav-dd5">'
    + '<span class="nav-link' + (anyActive(TENCHU_PATHS)?' active':'') + '" id="nav-dd5-toggle" role="button" tabindex="0">Đặt Tên ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd5-menu">'
    + ddItem('/tools/dat-ten-con.html',          'baby',       'Đặt Tên Con Theo Ngũ Hành')
    + ddItem('/tools/dat-ten-doanh-nghiep.html', 'building-2', 'Đặt Tên Doanh Nghiệp')
    + '</div></div>';

  // DD_BAIVIET — Bài Viết
  var dd_baiviet = '<div class="nav-dd" id="nav-dd-baiviet">'
    + '<span class="nav-link' + (anyActive(BAIVIET_PATHS)?' active':'') + '" id="nav-dd-baiviet-toggle" role="button" tabindex="0">Bài Viết ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd-baiviet-menu">'
    + ddItem('/nghien-cuu',  'file-text',      'Nghiên Cứu Tử Vi')
    + ddItem('/tac-gia',     'user',           'Tác Giả')
    + ddItem('/blog.html',   'message-circle', 'Khảo Luận')
    + '</div></div>';

  // DD6 — Công Cụ (còn lại)
  var dd6 = '<div class="nav-dd" id="nav-dd6">'
    + '<span class="nav-link" id="nav-dd6-toggle" role="button" tabindex="0">Công Cụ ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd6-menu">'
    + ddSection('Mệnh Lý')
    + ddItem('/tools/nap-am.html',       'tornado',     'Nạp Âm Ngũ Hành')
    + ddItem('/tools/tuong-hop.html',    'heart',       'Tương Hợp Tuổi')
    + ddItem('/tools/ngu-hanh-ten.html', 'pen-line',    'Ngũ Hành Tên')
    + ddItem('/tools/tu-tru.html',       'scroll-text', 'Tứ Trụ Bát Tự')
    + ddSection('Huyền Học')
    + ddItem('/tools/kinh-dich.html',   'aperture', 'Kinh Dịch 64 Quẻ')
    + ddItem('/tools/than-so-hoc.html', 'hash',     'Thần Số Học')
    + ddSection('Bói Bài')
    + ddItem('/tools/tarot.html',       'wallet-cards', 'Tarot 78 Lá')
    + ddItem('/tools/oracle.html',      'sparkles',     'Oracle Phương Đông')
    + ddItem('/tools/boi-bai-tay.html', 'spade',        'Bói Bài Tây')
    + '</div></div>';

  var html = '<nav class="topnav">'
    + '<a class="nav-logo" href="/"><img src="/seal.webp" alt="">'
    + '<div><div class="name">Tử Vi Minh Bảo</div><div class="url">Tri mệnh lý – Thuận thế hành</div></div></a>'
    + '<div class="nav-links" id="nav-links">'
    + navLink('/', 'Trang Chủ')
    + dd1
    + navLink('/tu-binh.html', 'Tử Bình')
    + dd2 + dd3 + dd_dep + dd4 + dd5 + dd6
    + dd_baiviet
    + '</div>'
    + '<div id="nav-auth-area"></div>'
    + '<button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">' + ICONS.menu + '</button>'
    + '</nav>';

  var old = document.querySelector('nav.topnav');
  if (old) old.remove();
  var tmp = document.createElement('div'); tmp.innerHTML = html;
  var ph = document.getElementById('nav-ph');
  if (ph) ph.replaceWith(tmp.firstChild);
  else document.body.insertBefore(tmp.firstChild, document.body.firstChild);

  // ── Mobile dropdown events ─────────────────────────────────────
  var menus = ['nav-dd1-menu','nav-dd2-menu','nav-dd3-menu','nav-dd-dep-menu','nav-dd4-menu','nav-dd5-menu','nav-dd6-menu','nav-dd-baiviet-menu'];
  function closeAll() { menus.forEach(function(id){ var m=document.getElementById(id); if(m)m.classList.remove('open'); }); }

  document.getElementById('nav-hamburger').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('nav-links').classList.toggle('open');
  });

  ['nav-dd1-toggle','nav-dd2-toggle','nav-dd3-toggle','nav-dd-dep-toggle','nav-dd4-toggle','nav-dd5-toggle','nav-dd6-toggle','nav-dd-baiviet-toggle'].forEach(function(tid, idx) {
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
      + '<div class="ft-brand"><div class="ft-brand-row"><img src="/seal.webp" alt=""><div><div class="ft-brand-name">Tử Vi Minh Bảo</div><div class="ft-brand-zh">Tri mệnh lý – Thuận thế hành</div></div></div><div class="ft-tagline">Tử vi đẩu số theo cổ pháp, luận giải bằng AI.</div></div>'
      + '<div class="ft-col"><div class="ft-col-title">Tử Vi</div>'
      + '<a href="/luan-giai.html">Luận Giải Lá Số</a>'
      + '<a href="/tu-binh.html">Tử Bình Bát Tự</a>'
      + '<a href="/xem-tuoi.html">Xem Tuổi Vợ Chồng</a>'
      + '<a href="/tools/an-sao.html">An Sao Lá Số</a>'
      + '<a href="/nghien-cuu">Nghiên Cứu Tử Vi</a>'
      + '<a href="/tac-gia">Tác Giả</a>'
      + '<a href="/blog.html">Khảo Luận</a></div>'
      + '<div class="ft-col"><div class="ft-col-title">Phong Thủy & Xem Tướng</div>'
      + '<a href="/tools/phong-thuy.html">Phong Thủy Nội Thất</a>'
      + '<a href="/tools/bat-trach.html">Hướng Bát Trạch</a>'
      + '<a href="/tools/tuong-mat-ai.html">Xem Tướng Mặt</a>'
      + '<a href="/tools/kieu-toc-ai.html">Kiểu Tóc Hợp Tướng</a>'
      + '<a href="/tools/mau-sac-hop-menh.html">Màu Sắc & Thử Trang Phục</a></div>'
      + '<div class="ft-col"><div class="ft-col-title">Về Chúng Tôi</div>'
      + '<a href="/about.html">Giới Thiệu</a>'
      + '<a href="/resources.html">Tài Liệu</a>'
      + '<a href="/menh-kho.html">Mệnh Khố</a>'
      + '<a href="/contact.html">Liên Hệ</a></div>'
      + '</div>'
      + '<div class="ft-bottom"><span>© 2025 Tử Vi Minh Bảo — tuviminhbao.com</span><img src="/seal.webp" alt=""></div>'
      + '<div class="ft-disclaimer">Nội dung luận giải mang tính tham khảo, không thảy thế tư vấn chuyên môn.</div>'
      + '</div></footer>';
    var ft=document.createElement('div'); ft.innerHTML=f; document.body.appendChild(ft.firstChild);
  }

  function runFooter() { var o=document.querySelector('footer.site-footer'); if(o)o.remove(); injectFooter(); }
  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded',function(){setTimeout(runFooter,0);}); }
  else { setTimeout(runFooter,0); }

})();
