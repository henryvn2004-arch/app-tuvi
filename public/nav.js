// nav.js — Shared navigation component v14 (Lucide icons + iconHtml + EMOJI_TO_ICON map)
(function () {
  var path = window.location.pathname;

  // Auto-generated from lucide-static v1.16.0 — 88 icons
  var ICONS = {
    'alert-triangle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>',
    'anchor': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v16" /><path d="m19 13 2-1a9 9 0 0 1-18 0l2 1" /><path d="M9 11h6" /><circle cx="12" cy="4" r="2" /></svg>',
    'aperture': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m14.31 8 5.74 9.94" /><path d="M9.69 8h11.48" /><path d="m7.38 12 5.74-9.94" /><path d="M9.69 16 3.95 6.06" /><path d="M14.31 16H2.83" /><path d="m16.62 12-5.74 9.94" /></svg>',
    'award': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" /><circle cx="12" cy="8" r="6" /></svg>',
    'baby': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" /><path d="M15 12h.01" /><path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" /><path d="M9 12h.01" /></svg>',
    'bar-chart-3': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>',
    'book-open': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>',
    'briefcase': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></svg>',
    'building-2': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h4" /><path d="M10 8h4" /><path d="M14 21v-3a2 2 0 0 0-4 0v3" /><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" /><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /></svg>',
    'cake': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20" /><path d="M7 8v3" /><path d="M12 8v3" /><path d="M17 8v3" /><path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" /></svg>',
    'calendar': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>',
    'calendar-days': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>',
    'camera': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" /><circle cx="12" cy="13" r="3" /></svg>',
    'check': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>',
    'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" /></svg>',
    'chevron-down': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>',
    'circle-dot': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="1" /></svg>',
    'clipboard': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>',
    'clock': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>',
    'compass': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /></svg>',
    'credit-card': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>',
    'crown': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></svg>',
    'dollar-sign': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>',
    'door-open': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20H2" /><path d="M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z" /><path d="M11 4H8a2 2 0 0 0-2 2v14" /><path d="M14 12h.01" /><path d="M22 20h-3" /></svg>',
    'droplet': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>',
    'dumbbell': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /><path d="m2.5 21.5 1.4-1.4" /><path d="m20.1 3.9 1.4-1.4" /><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /><path d="m9.6 14.4 4.8-4.8" /></svg>',
    'eye': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>',
    'file-text': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>',
    'flame': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /></svg>',
    'flower': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" /><path d="M12 7.5V9" /><path d="M7.5 12H9" /><path d="M16.5 12H15" /><path d="M12 16.5V15" /><path d="m8 8 1.88 1.88" /><path d="M14.12 9.88 16 8" /><path d="m8 16 1.88-1.88" /><path d="M14.12 14.12 16 16" /></svg>',
    'gem': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 3 8 9l4 13 4-13-2.5-6" /><path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z" /><path d="M2 9h20" /></svg>',
    'gift': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" /></svg>',
    'folder': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>',
    'glasses': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="15" r="4" /><circle cx="18" cy="15" r="4" /><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2" /><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2" /><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2" /></svg>',
    'globe': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>',
    'hand': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>',
    'handshake': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></svg>',
    'hash': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg>',
    'heart': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" /></svg>',
    'heart-handshake': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762" /></svg>',
    'home': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>',
    'hourglass': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></svg>',
    'image': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.8" /><path d="m21 15-5-5-9 9" /></svg>',
    'info': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>',
    'lamp': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12v6" /><path d="M4.077 10.615A1 1 0 0 0 5 12h14a1 1 0 0 0 .923-1.385l-3.077-7.384A2 2 0 0 0 15 2H9a2 2 0 0 0-1.846 1.23Z" /><path d="M8 20a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" /></svg>',
    'landmark': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" /></svg>',
    'layout-grid': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>',
    'leaf': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>',
    'lightbulb': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>',
    'link': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>',
    'lock': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>',
    'mail': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg>',
    'menu': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" /></svg>',
    'message-circle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></svg>',
    'mic': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19v3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><rect x="9" y="2" width="6" height="13" rx="3" /></svg>',
    'monitor': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>',
    'moon': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>',
    'music': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>',
    'package': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" /></svg>',
    'palette': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
    'pen-line': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 21h8" /><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /></svg>',
    'pin': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>',
    'qr-code': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>',
    'rainbow': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a10 10 0 0 0-20 0" /><path d="M6 17a6 6 0 0 1 12 0" /><path d="M10 17a2 2 0 0 1 4 0" /></svg>',
    'rotate-cw': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>',
    'scale': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>',
    'scissors': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>',
    'scroll-text': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></svg>',
    'search': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></svg>',
    'settings': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></svg>',
    'share-2': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>',
    'shield-check': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>',
    'shirt': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" /></svg>',
    'smile': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>',
    'spade': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18v4" /><path d="M2 14.499a5.5 5.5 0 0 0 9.591 3.675.6.6 0 0 1 .818.001A5.5 5.5 0 0 0 22 14.5c0-2.29-1.5-4-3-5.5l-5.492-5.312a2 2 0 0 0-3-.02L5 8.999c-1.5 1.5-3 3.2-3 5.5" /></svg>',
    'sparkles': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>',
    'star': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>',
    'store': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" /></svg>',
    'sun': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>',
    'sunrise': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 6 4-4 4 4" /><path d="M16 18a4 4 0 0 0-8 0" /></svg>',
    'temple': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 5H4z" /><path d="M3 8h18" /><path d="M6 8v9M18 8v9" /><path d="M10 17v-5h4v5" /><path d="M3 21h18" /></svg>',
    'tornado': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H3" /><path d="M18 8H6" /><path d="M19 12H9" /><path d="M16 16h-6" /><path d="M11 20H9" /></svg>',
    'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></svg>',
    'trophy': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" /><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" /><path d="M18 9h1.5a1 1 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" /><path d="M6 9H4.5a1 1 0 0 1 0-5H6" /></svg>',
    'user': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>',
    'users': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>',
    'wallet-cards': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" /><path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21" /></svg>',
    'wallet': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></svg>',
    'waves': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12q2.5 2 5 0t5 0 5 0 5 0" /><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0" /><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0" /></svg>',
    'x': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>',
    'x-circle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>',
    'zap': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>',
    'volume-2': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" /></svg>',
    'inbox': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>',
    'pencil': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>',
    'save': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></svg>',
    'film': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18" /><path d="M3 7.5h4" /><path d="M3 12h18" /><path d="M3 16.5h4" /><path d="M17 3v18" /><path d="M17 7.5h4" /><path d="M17 16.5h4" /></svg>',
    'siren': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 1 1 10 0v6" /><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" /><path d="M21 12h1" /><path d="M18.5 4.5 18 5" /><path d="M2 12h1" /><path d="M12 2v1" /><path d="m4.929 4.929.707.707" /><path d="M12 12v6" /></svg>',
    'trash-2': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>',
    'stethoscope': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2" /><path d="M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" /></svg>',
    'bot': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>',
    'flask-conical': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" /><path d="M6.453 15h11.094" /><path d="M8.5 2h7" /></svg>',
  };

  function mountIcons(root) {
    var scope = root || document;
    // Pass 1: explicit data-icon="key"
    var nodes = scope.querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.firstElementChild && el.firstElementChild.tagName.toLowerCase() === 'svg') continue;
      var key = el.getAttribute('data-icon');
      if (ICONS[key]) el.innerHTML = ICONS[key];
    }
    // Pass 2: data-icon-emoji="🔮" (legacy emoji-based)
    var enodes = scope.querySelectorAll('[data-icon-emoji]');
    for (var j = 0; j < enodes.length; j++) {
      var eel = enodes[j];
      if (eel.firstElementChild && eel.firstElementChild.tagName.toLowerCase() === 'svg') continue;
      var emoji = eel.getAttribute('data-icon-emoji');
      var ekey = EMOJI_TO_ICON[emoji];
      if (ekey && ICONS[ekey]) eel.innerHTML = ICONS[ekey];
      else eel.textContent = emoji;
    }
  }
  window.ICONS = ICONS;
  window.mountIcons = mountIcons;

  // Map common emoji → Lucide key for runtime translation of legacy data
  var EMOJI_TO_ICON = {
    '🔮':'sparkles','✨':'sparkles','🔯':'sparkles','💑':'heart-handshake','🤝':'handshake',
    '📊':'bar-chart-3','📈':'trending-up','📉':'trending-up','☀':'sun','☀️':'sun','⚡':'zap',
    '⚗':'gem','💎':'gem','🗓':'calendar-days','📅':'calendar','📌':'pin','🔄':'rotate-cw','🌀':'tornado',
    '😊':'smile','🙂':'smile','😀':'smile','👁':'eye','👁️':'eye','✋':'hand','🎤':'mic','🎙':'mic','🌅':'sunrise',
    '🧭':'compass','🧿':'compass','🖥':'monitor','🖥️':'monitor','💻':'monitor','🏪':'store','🏠':'home','🏢':'building-2',
    '🎨':'palette','💄':'palette','🖌':'palette','🖌️':'palette','💋':'palette',
    '👗':'shirt','👔':'shirt','👚':'shirt','🧥':'shirt','🧴':'droplet','💧':'droplet',
    // Ký hiệu chiêm tinh/thiên văn dùng làm `tool_pricing.icon` — không phải emoji
    // nên không có trong bảng nào ở trên, mà thiếu thì trang Công Cụ + bảng chi phí
    // đổ ra đúng glyph thô (chính là thứ đang muốn dẹp).
    '☉':'sun','⧇':'layout-grid','⚸':'circle-dot','🖼':'image','🖼️':'image','🏯':'temple','⚖':'scale','⚖️':'scale',
    '👶':'baby','🍼':'baby','❤':'heart','❤️':'heart','💖':'heart','💕':'heart','💚':'heart','💛':'heart','💙':'heart','💜':'heart','🖤':'heart','🤍':'heart','🤎':'heart',
    '📜':'scroll-text','📖':'book-open','📚':'book-open','🔢':'hash','#️⃣':'hash','☯':'aperture','☯️':'aperture',
    '🃏':'wallet-cards','🂠':'spade','✍':'pen-line','✍️':'pen-line','📝':'file-text','📄':'file-text','📃':'file-text',
    '💇':'scissors','✂':'scissors','✂️':'scissors',
    '⚙':'settings','⚙️':'settings','🔍':'search','🔎':'search','🔗':'link','📋':'clipboard','📎':'clipboard',
    '🎂':'cake','💼':'briefcase','💰':'dollar-sign','💵':'dollar-sign','💸':'dollar-sign','💳':'wallet',
    '⚠':'alert-triangle','⚠️':'alert-triangle','❌':'x-circle','✕':'x','❎':'x-circle',
    '✓':'check','✔':'check','✔️':'check','✅':'check-circle',
    '💡':'lightbulb','💬':'message-circle','💭':'message-circle','🗯':'message-circle','🔒':'lock','🔓':'lock','🔐':'lock',
    '🌟':'star','⭐':'star','🌸':'flower','🌺':'flower','🌹':'flower','🌷':'flower','🌻':'flower','🌼':'flower',
    '🌿':'leaf','🍀':'leaf','🌱':'leaf','🌲':'leaf','🌳':'leaf','🍃':'leaf',
    '🔥':'flame','📷':'camera','📸':'camera','🎥':'camera',
    '🚪':'door-open','🌊':'waves','📦':'package','🛍':'package','🛍️':'package','📤':'package','📥':'package',
    '🏮':'lamp','🏆':'trophy','🥇':'trophy','🏅':'award','🎖':'award','🎖️':'award',
    '👑':'crown','🌙':'moon','🌐':'globe','✉':'mail','✉️':'mail','👓':'glasses','💪':'dumbbell','🌈':'rainbow','⚓':'anchor',
    '🎵':'music','🎶':'music','🎼':'music',
    '➡':'chevron-down','➡️':'chevron-down','⬆':'chevron-down','⬇':'chevron-down','⬅':'chevron-down','↗':'chevron-down','↘':'chevron-down','↙':'chevron-down','↖':'chevron-down',
    '🏦':'landmark','🏛':'landmark','🏛️':'landmark','🎁':'gift','🎀':'gift','🎉':'gift','🎊':'gift',
    // Bổ sung cho đợt quét admin. 🧧 (lì xì) không có icon Lucide tương đương
    // nên dùng chung 'gift' — cùng nghĩa quà tặng.
    '🔊':'volume-2','🔉':'volume-2','🔈':'volume-2','📭':'inbox','📬':'inbox','📪':'inbox',
    '✏️':'pencil','✏':'pencil','💾':'save','🎬':'film','🚨':'siren',
    '🗑':'trash-2','🗑️':'trash-2','🩺':'stethoscope','🤖':'bot','🧪':'flask-conical','🧧':'gift',
    '⏳':'hourglass','⌛':'hourglass','⏰':'hourglass','⏱':'hourglass',
    '👥':'users','👪':'users','👨‍👩‍👧':'users','ℹ':'info','ℹ️':'info','💠':'info',
    '👤':'user','👦':'user','👧':'user','👕':'shirt','🎽':'shirt','🪄':'sparkles',
    '🚫':'x-circle','📁':'folder','🗂':'folder','📂':'folder','📍':'pin','📺':'monitor',
    '📱':'monitor','🖱':'monitor','📒':'book-open','🚿':'droplet',
    // CỐ Ý KHÔNG map 🔴 🟡 🔵 (và các chấm màu khác): ở đó MÀU chính là thông
    // điệp (đèn báo tốt/vừa/xấu). Đổi sang icon đơn sắc ăn currentColor là xoá
    // đúng phần mang nghĩa, đổi xong trông gọn hơn mà đọc không ra gì nữa.
    // Còn sót lại sau đợt chuyển sang Lucide — quét `data-icon-emoji` toàn repo ra
    // 23 glyph chưa có trong bảng, tức mountIcons rơi về nhánh `textContent = emoji`
    // và người dùng vẫn thấy emoji thô trên 15 trang. Bổ sung nốt cho khớp ngữ cảnh
    // dùng thật của từng chỗ (đã đọc câu chữ đứng cạnh, không gán bừa theo hình).
    '📐':'bar-chart-3','💞':'heart-handshake','📆':'calendar-days','🛡':'shield-check','🛡️':'shield-check',
    '⚔':'zap','⚔️':'zap','🔲':'layout-grid','📗':'book-open','📕':'book-open','📘':'book-open',
    '🪑':'briefcase','🎯':'circle-dot','🔧':'settings','🛠':'settings','🛠️':'settings','🛒':'store',
    '🔬':'search','🪴':'leaf','✗':'x','✘':'x','🪮':'scissors','🗺':'compass','🗺️':'compass',
    '💍':'gem','🪞':'aperture','🎭':'palette'
  };

  function iconHtml(raw, fallback) {
    if (!raw) return fallback || ICONS['sparkles'] || '';
    if (ICONS[raw]) return ICONS[raw];
    var key = EMOJI_TO_ICON[raw];
    if (key && ICONS[key]) return ICONS[key];
    if (String(raw).charAt(0) === '<') return raw; // đã là SVG dựng sẵn
    // Glyph lạ (icon mới thêm dưới DB mà bảng trên chưa biết) → trả về ICON dự
    // phòng chứ KHÔNG trả glyph thô: `tool_pricing.icon` do admin gõ tay nên
    // luôn có thể xuất hiện ký tự mới, và mỗi lần như vậy trước đây là một con
    // emoji lọt thẳng ra giao diện.
    return fallback || ICONS['sparkles'] || '';
  }
  window.EMOJI_TO_ICON = EMOJI_TO_ICON;
  window.iconHtml = iconHtml;




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
  var TUONG_PATHS  = ['/tools/tuong-mat-ai.html','/tools/nhan-tuong-ai.html','/tools/thu-tuong-ai.html','/tools/thanh-tuong-ai.html','/tools/thanh-tuong-pro.html','/tools/khi-sac-ai.html'];
  var LAM_DEP_PATHS = ['/tools/kieu-toc-ai.html','/tools/mau-sac-hop-menh.html'];
  var PHONG_PATHS  = ['/tools/phong-thuy.html','/tools/ban-lam-viec.html','/tools/cua-hang-phong-thuy.html','/tools/bat-trach.html','/kim-lau'];
  var NGAY_PATHS   = ['/ngay-tot','/tools/hoang-dao.html','/tools/ngay-tot.html','/tools/luc-nham.html','/tools/han-nam.html','/tools/chon-ngay-tot.html'];
  var TENCHU_PATHS  = ['/tools/dat-ten-con.html','/tools/dat-ten-doanh-nghiep.html'];
  var BAIVIET_PATHS = ['/blog.html','/nghien-cuu','/tac-gia'];
  var KP_PATHS = ['/cong-cu','/menh-kho','/ngay-tot','/thu-vien'].concat(TUONG_PATHS, PHONG_PATHS, NGAY_PATHS, TENCHU_PATHS, LAM_DEP_PATHS);

  function anyActive(arr) { return arr.some(function(p){ return path === p || path.startsWith(p + '/') || path.startsWith(p); }); }

  var css = [
    // Khung icon dùng chung — bơm MỘT lần ở đây thay vì lặp
    // style="display:inline-flex;width:1em;height:1em;…" ở từng chỗ dùng (mẫu
    // di sản `ic-inline` đang lặp chuỗi đó hàng trăm lần). Kích thước theo 1em
    // nên icon tự khớp cỡ chữ xung quanh; màu theo currentColor nên tự đúng ở
    // cả light lẫn dark. Markup mới chỉ cần:
    //     <span class="ic" data-icon="wallet"></span>
    '.ic,.ic-inline{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:-.125em}',
    '.ic>svg,.ic-inline>svg{width:1em;height:1em;display:block}',
    '.topnav{position:sticky;top:0;z-index:200;background:#061A2E;display:flex;align-items:center;height:60px;padding:0 40px;gap:28px}',
    '.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0}',
    '.nav-logo img{width:38px;height:38px;object-fit:contain;border-radius:5px}',
    '.nav-logo .name{font-size:16px;font-weight:700;color:#CC2200;font-family:Georgia,serif}',
    '.nav-logo .url{font-size:10px;color:#aaa;letter-spacing:.07em;text-transform:uppercase}',
    '.nav-links{display:flex;align-items:center;gap:2px;flex:1;overflow:visible}',
    '.nav-link{color:#8BAACC;font-size:13px;text-decoration:none;padding:6px 10px;border-radius:6px;transition:all .15s;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:4px}',
    '.nav-link:hover{color:#fff;background:rgba(255,255,255,.07)}',
    '.nav-link.active{color:#c9a84c}',
    '.nav-cta-ld{background:#c9a84c;color:#061A2E!important;font-weight:700;padding:7px 15px;margin-right:6px}',
    '.nav-cta-ld:hover{background:#d8bd6a;color:#061A2E!important}',
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

  // ── CHẾ ĐỘ CHỈ-ICON ────────────────────────────────────────────
  // 27 trang shell và 2 trang admin CỐ Ý không nạp nav.js: nav.js tự chèn thanh
  // nav lên đầu <body>, mà mấy trang đó có chrome riêng. Hệ quả là chúng không
  // có bộ icon nào cả — mọi span [data-icon] rơi về nội dung dự phòng và IN
  // EMOJI THÔ ra màn hình.
  //
  // Thay vì đẻ bảng icon thứ hai trong shell.js (28 icon, tên khác hẳn, thiếu
  // 11/15 icon cần dùng — đúng cái "hai bảng trôi khỏi nhau" đã cảnh báo),
  // mấy trang đó nạp CHÍNH file này kèm `data-icons-only`:
  //     <script src="/nav.js?v=23" data-icons-only></script>
  // Lúc đó nav.js CHỈ cấp ICONS/iconHtml/mountIcons/EMOJI_TO_ICON + CSS icon,
  // rồi dừng — KHÔNG dựng thanh nav, KHÔNG chèn GA4, KHÔNG chèn conversion.js,
  // KHÔNG chèn auth.js. Một nguồn icon duy nhất cho cả site.
  //
  // Đọc qua `document.currentScript` chứ không qua biến toàn cục: thẻ script là
  // thứ duy nhất chắc chắn đã tồn tại đúng lúc file này chạy, không phụ thuộc
  // trang có nhớ khai cờ trước hay không.
  var _self = document.currentScript;
  if (_self && _self.hasAttribute('data-icons-only')) {
    if (!document.getElementById('nav-css')) {
      var s0 = document.createElement('style');
      s0.id = 'nav-css';
      s0.textContent = css;
      document.head.appendChild(s0);
    }
    // Cùng lý do như lượt quét kép ở cuối file: script chạy trước khi thân trang
    // được parse, nên phải quét lại khi DOM đóng.
    mountIcons();
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', function () { mountIcons(); });
    return;
  }

  // GA4 — bỏ qua trình duyệt tự động (navigator.webdriver). Bộ E2E Playwright
  // chạy THẲNG vào prod mỗi lần push/PR nên mỗi lượt CI đổ hàng chục phiên vào
  // GA4: kênh dồn hết vào Direct (không referrer) và top landing page biến thành
  // đúng danh sách URL trong tests/. D6 đã chặn chuyện này cho track.js nhưng bỏ
  // sót GA4 — hệ quả là hai nguồn đếm hai tập khách khác nhau, khiến "% đo được"
  // trên panel GA4 vs Nội Bộ thấp giả.
  if (!document.getElementById('gtag-js') && !navigator.webdriver) {
    var ga = document.createElement('script'); ga.id='gtag-js'; ga.async=true;
    ga.src='https://www.googletagmanager.com/gtag/js?id=G-F4XNRS2XT0'; document.head.appendChild(ga);
    window.dataLayer=window.dataLayer||[]; function gtag(){dataLayer.push(arguments);} window.gtag=gtag;
    gtag('js',new Date()); gtag('config','G-F4XNRS2XT0');
  }
  // Conversion script — skip on chat page (social proof popup conflicts with chat UX)
  var _noConv = ['/tuvi-chat.html'];
  if (!document.getElementById('cv-script') && _noConv.indexOf(location.pathname) === -1) {
    var cv=document.createElement('script'); cv.id='cv-script'; cv.src='/conversion.js?v=3'; document.body.appendChild(cv);
  }
  if (!document.getElementById('nav-css')) {
    var s=document.createElement('style'); s.id='nav-css'; s.textContent=css; document.head.appendChild(s);
  }
  if (!document.getElementById('auth-js-tag') && typeof window.Auth==='undefined') {
    var authScript=document.createElement('script'); authScript.id='auth-js-tag'; authScript.src='/auth.js'; document.head.appendChild(authScript);
  }

  // ── Build dropdowns ───────────────────────────────────────────

  // Khám phá — công cụ lẻ + tra cứu (gộp catalog + SEO hub)
  var dd_kp = '<div class="nav-dd" id="nav-dd-kp">'
    + '<span class="nav-link' + (anyActive(KP_PATHS)?' active':'') + '" id="nav-dd-kp-toggle" role="button" tabindex="0">Khám phá ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd-kp-menu">'
    + ddSection('Công cụ')
    // ⚠️ KHÔNG chép số lượng công cụ hay chữ "miễn phí" vào đây: nav.js nạp trên
    // ~89 trang nên một con số cũ sẽ nói dối ở khắp nơi (bản trước ghi "47" trong
    // khi `tool_pricing` đang có 55 tool bật). Giá và trạng thái free chỉ nêu ở
    // trang tool / tool trong shell, nơi đọc thẳng `tool_pricing`.
    + ddItem('/cong-cu',                'layout-grid', 'Tất cả công cụ')
    + ddItem('/tools/tuong-mat-ai.html','smile',       'Xem tướng qua ảnh')
    + ddItem('/tools/phong-thuy.html',  'compass',     'Phong thủy qua ảnh')
    + ddSection('Tra cứu')
    + ddItem('/menh-kho.html', 'gem',           'Mệnh Khố — 438K lá số')
    + ddItem('/ngay-tot',      'calendar-days', 'Ngày Tốt — Lịch vạn niên')
    // C3 — đường vào thư viện. Trước đó `/thu-vien` chỉ tới được từ CHÂN TRANG
    // `/ket-qua`, tức chỉ ai đã mở một link chia sẻ mới thấy — gần như không ai
    // tìm ra. Đặt ở nav là bề mặt duy nhất phủ được toàn site.
    + ddItem('/thu-vien',      'image',         'Thư Viện — bản luận đã chia sẻ')
    + '</div></div>';

  // Cẩm nang — nghiên cứu, tác giả, khảo luận
  var dd_cn = '<div class="nav-dd" id="nav-dd-cn">'
    + '<span class="nav-link' + (anyActive(BAIVIET_PATHS)?' active':'') + '" id="nav-dd-cn-toggle" role="button" tabindex="0">Cẩm nang ' + CHEV + '</span>'
    + '<div class="nav-dd-menu" id="nav-dd-cn-menu">'
    + ddItem('/nghien-cuu', 'file-text',      'Nghiên Cứu Tử Vi')
    + ddItem('/tac-gia',    'user',           'Tác Giả')
    + ddItem('/blog.html',  'message-circle', 'Khảo Luận')
    + '</div></div>';

  var html = '<nav class="topnav">'
    + '<a class="nav-logo" href="/"><img src="/seal.webp" alt="">'
    + '<div><div class="name">Tử Vi Minh Bảo</div><div class="url">Tri mệnh lý – Thuận thế hành</div></div></a>'
    + '<div class="nav-links" id="nav-links">'
    + '<a class="nav-link nav-cta-ld' + (isActive('/app')?' active':'') + '" href="/app" title="Lập lá số và hỏi trợ lý AI — vào đây để dùng công cụ">✦ Luận Đường</a>'
    + dd_kp
    + dd_cn
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

  // Auto-swap any [data-icon] elements present on the page (incl. those outside nav)
  mountIcons();

  // …nhưng script này chạy ở ĐẦU <body>, lúc phần thân trang CHƯA được parse —
  // nên lượt quét trên chỉ với tới nav. Mọi span [data-icon] / [data-icon-emoji]
  // nằm trong markup bên dưới đều trượt, rồi rơi về nhánh dự phòng in thẳng
  // emoji ra màn hình. Đó chính là lý do emoji vẫn còn đầy trên site dù đã có
  // một đợt chuyển sang Lucide. Quét lại một lượt khi DOM đóng — mountIcons bỏ
  // qua phần tử đã có <svg> nên chạy hai lần không tốn gì.
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { mountIcons(); });
  else mountIcons();

  // ── Mobile dropdown events ─────────────────────────────────────
  var menus = ['nav-dd-kp-menu','nav-dd-cn-menu'];
  function closeAll() { menus.forEach(function(id){ var m=document.getElementById(id); if(m)m.classList.remove('open'); }); }

  document.getElementById('nav-hamburger').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('nav-links').classList.toggle('open');
  });

  ['nav-dd-kp-toggle','nav-dd-cn-toggle'].forEach(function(tid, idx) {
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
    '.ft-legal{font-size:11px;color:rgba(255,255,255,0.3);line-height:1.7;max-width:260px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.05)}',
    '.ft-legal strong{color:rgba(255,255,255,0.5);font-weight:600}',
    '.ft-disclaimer{font-size:10px;color:rgba(255,255,255,0.15);line-height:1.6;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);text-align:center}',
    '@media(max-width:900px){.ft-top{grid-template-columns:1fr 1fr;gap:28px}.ft-brand{grid-column:1/-1}}',
    '@media(max-width:600px){.site-footer{padding:40px 20px 20px}.ft-top{grid-template-columns:1fr 1fr;gap:24px}.ft-brand{grid-column:1/-1}.ft-bottom{flex-direction:column;align-items:flex-start;gap:4px}}'
  ].join('');

  if (!document.getElementById('footer-css')) {
    var fs=document.createElement('style'); fs.id='footer-css'; fs.textContent=footerCss; document.head.appendChild(fs);
  }

  function injectFooter() {
    var f = '<footer class="site-footer"><div class="ft-body"><div class="ft-top">'
      + '<div class="ft-brand"><div class="ft-brand-row"><img src="/seal.webp" alt=""><div><div class="ft-brand-name">Tử Vi Minh Bảo</div><div class="ft-brand-zh">Tri mệnh lý – Thuận thế hành</div></div></div><div class="ft-tagline">Tử vi đẩu số theo cổ pháp, luận giải bằng AI.</div>'
      // Mã số doanh nghiệp CHƯA có trong hồ sơ được cung cấp — KHÔNG bịa số.
      // Bổ sung dòng "MST: ..." ngay khi có, theo Nghị định 52/2013.
      + '<div class="ft-legal"><strong>Công ty TNHH Kira Tech</strong><br>(Kira Tech Company Limited)<br>'
      + 'Điện thoại: 0343.848.795<br>'
      + 'Email: contact@tuviminhbao.com<br>'
      + 'Địa chỉ: 901 Lê Đức Thọ, Phường An Hội Đông, Thành phố Hồ Chí Minh, Việt Nam</div>'
      + '</div>'
      + '<div class="ft-col"><div class="ft-col-title">Tử Vi</div>'
      + '<a href="/tuvi-chat.html">Tử Vi Chat</a>'
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
      + '<div class="ft-bottom"><span>© 2026 Tử Vi Minh Bảo — tuviminhbao.com</span>'
      + '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">'
      + '<a href="/san-pham-dich-vu.html">Sản Phẩm &amp; Dịch Vụ</a>'
      + '<a href="/chinh-sach-bao-mat.html">Chính Sách Bảo Mật</a>'
      + '<a href="/dieu-khoan-dich-vu.html">Điều Khoản Sử Dụng</a>'
      + '<a href="/huong-dan-thanh-toan.html">Hướng Dẫn Thanh Toán</a>'
      + '<a href="/mien-tru-trach-nhiem.html">Miễn Trừ Trách Nhiệm</a>'
      + '<img src="/seal.webp" alt="">'
      + '</div></div>'
      + '<div class="ft-disclaimer">Nội dung luận giải mang tính tham khảo, không thay thế tư vấn chuyên môn. <a href="/mien-tru-trach-nhiem.html" style="color:inherit;text-decoration:underline">Xem chi tiết</a>.</div>'
      + '</div></footer>';
    var ft=document.createElement('div'); ft.innerHTML=f; document.body.appendChild(ft.firstChild);
  }

  function runFooter() { var o=document.querySelector('footer.site-footer'); if(o)o.remove(); injectFooter(); }
  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded',function(){setTimeout(runFooter,0);}); }
  else { setTimeout(runFooter,0); }

  // PWA: inject manifest link if not already present
  if (!document.querySelector('link[rel="manifest"]')) {
    var ml = document.createElement('link');
    ml.rel = 'manifest'; ml.href = '/manifest.json';
    document.head.appendChild(ml);
  }

  // PWA: register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
  }

  // PWA: smart install prompt (deferred load)
  window.addEventListener('load', function () {
    var s = document.createElement('script');
    s.src = '/pwa-install.js';
    document.head.appendChild(s);
  });

})();
