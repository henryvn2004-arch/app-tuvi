// related-tools.js — Tử Vi Minh Bảo
// Inject "Công Cụ Liên Quan" section vào tool pages và khảo luận articles
(function () {

  var BASE = 'https://www.tuviminhbao.com';

  // ── Tool catalog ─────────────────────────────────────────────
  var TOOLS = [
    // Tử Vi
    { id:'luan-giai',    url:'/',                              icon:'🔮', name:'Luận Giải Lá Số',          cat:['tuvi'],                         tags:['tử vi','lá số','luận giải','đại vận','tiểu vận'] },
    { id:'xem-tuoi',     url:'/xem-tuoi.html',                 icon:'💑', name:'Xem Tuổi Vợ Chồng',        cat:['tuvi','hon-nhan','tinh-cach'],   tags:['hôn nhân','vợ chồng','tình duyên','tương hợp'] },
    { id:'xem-lam-an',   url:'/xem-lam-an.html',              icon:'🤝', name:'Xem Tuổi Làm Ăn',          cat:['tuvi','cong-viec','tai-chinh'],  tags:['làm ăn','hợp tác','kinh doanh','đối tác'] },
    { id:'an-sao',       url:'/tools/an-sao.html',             icon:'📊', name:'An Sao Lá Số',             cat:['tuvi'],                         tags:['an sao','108 sao','lá số'] },
    { id:'sao-nam',      url:'/tools/sao-nam.html',            icon:'☀', name:'Tổng Quan Lá Số',           cat:['tuvi','van-han'],               tags:['sao năm','tổng quan','lá số'] },
    { id:'cach-cuc',     url:'/tools/cach-cuc.html',           icon:'⚗', name:'Cách Cục & Các Cung',       cat:['tuvi'],                         tags:['cách cục','12 cung','cung mệnh'] },
    { id:'dai-van',      url:'/tools/dai-van.html',            icon:'📈', name:'Đại Vận & Vận Trình',       cat:['tuvi','van-han'],               tags:['đại vận','vận trình','tiểu hạn'] },
    { id:'van-thang',    url:'/tools/van-thang.html',          icon:'🗓', name:'Vận Tháng',                 cat:['tuvi','van-han'],               tags:['vận tháng','tiểu hạn tháng'] },
    { id:'han-nam',      url:'/tools/han-nam.html',            icon:'🔄', name:'Hạn Năm',                  cat:['tuvi','van-han'],               tags:['hạn năm','vận hạn','sao hạn'] },
    { id:'nap-am',       url:'/tools/nap-am.html',             icon:'🌀', name:'Nạp Âm Ngũ Hành',          cat:['tuvi','tinh-cach'],             tags:['nạp âm','ngũ hành','bản mệnh'] },
    // Xem Tướng
    { id:'tuong-mat',    url:'/tools/tuong-mat-ai.html',       icon:'😊', name:'Xem Tướng Mặt',            cat:['tuong','tinh-cach'],            tags:['tướng mặt','nhân tướng','khuôn mặt'] },
    { id:'nhan-tuong',   url:'/tools/nhan-tuong-ai.html',      icon:'👁', name:'Nhãn Tướng — Xem Mắt',     cat:['tuong','tinh-cach'],            tags:['tướng mắt','nhãn tướng','đôi mắt'] },
    { id:'thu-tuong',    url:'/tools/thu-tuong-ai.html',       icon:'✋', name:'Thủ Tướng — Chỉ Tay',      cat:['tuong','tinh-cach'],            tags:['chỉ tay','thủ tướng','bàn tay'] },
    { id:'thanh-tuong',  url:'/tools/thanh-tuong-ai.html',     icon:'🎤', name:'Thanh Tướng — Giọng Nói',  cat:['tuong','tinh-cach'],            tags:['giọng nói','thanh tướng'] },
    { id:'khi-sac',      url:'/tools/khi-sac-ai.html',         icon:'🌅', name:'Khí Sắc — Vận Khí',        cat:['tuong','van-han'],              tags:['khí sắc','vận khí','khuôn mặt'] },
    // Phong Thủy
    { id:'phong-thuy',   url:'/tools/phong-thuy.html',         icon:'🧭', name:'Phong Thủy Nội Thất',      cat:['phongthu','gia-dinh'],          tags:['phong thủy','nội thất','bố trí phòng'] },
    { id:'ban-lam-viec', url:'/tools/ban-lam-viec.html',       icon:'🖥', name:'Phong Thủy Bàn Làm Việc',  cat:['phongthu','cong-viec'],         tags:['phong thủy','bàn làm việc','văn phòng'] },
    { id:'cua-hang',     url:'/tools/cua-hang-phong-thuy.html',icon:'🏪', name:'Phong Thủy Cửa Hàng',      cat:['phongthu','cong-viec','tai-chinh'], tags:['phong thủy','cửa hàng','kinh doanh'] },
    { id:'bat-trach',    url:'/tools/bat-trach.html',           icon:'🧿', name:'Hướng Bát Trạch',          cat:['phongthu','gia-dinh'],          tags:['bát trạch','hướng nhà','phong thủy'] },
    { id:'kim-lau',      url:'/tools/kim-lau.html',             icon:'🏠', name:'Kim Lâu & Tam Tai',        cat:['phongthu','gia-dinh'],          tags:['kim lâu','tam tai','làm nhà','xây nhà'] },
    { id:'mau-sac',      url:'/tools/mau-sac-hop-menh.html',   icon:'🎨', name:'Màu Sắc Hợp Mệnh',         cat:['phongthu','tinh-cach'],         tags:['màu sắc','ngũ hành','trang phục'] },
    // Chọn Ngày
    { id:'hoang-dao',    url:'/tools/hoang-dao.html',           icon:'⚡', name:'Giờ Hoàng Đạo',            cat:['ngaytot'],                      tags:['giờ hoàng đạo','giờ tốt','xuất hành'] },
    { id:'ngay-tot',     url:'/tools/ngay-tot.html',            icon:'📅', name:'Ngày Tốt Trong Tháng',     cat:['ngaytot'],                      tags:['ngày tốt','lịch vạn niên','ngày lành'] },
    { id:'chon-ngay',    url:'/tools/chon-ngay-tot.html',       icon:'📌', name:'Chọn Ngày Tốt',            cat:['ngaytot'],                      tags:['chọn ngày tốt','khai trương','cưới hỏi','động thổ'] },
    { id:'luc-nham',     url:'/tools/luc-nham.html',            icon:'⚖', name:'Lục Nhâm Giản',            cat:['ngaytot'],                      tags:['lục nhâm','bói toán'] },
    // Đặt Tên
    { id:'dat-ten-con',  url:'/tools/dat-ten-con.html',         icon:'👶', name:'Đặt Tên Con',              cat:['daten','gia-dinh','con-cai'],   tags:['đặt tên con','tên hay','ngũ hành tên'] },
    { id:'dat-ten-dn',   url:'/tools/dat-ten-doanh-nghiep.html',icon:'🏢', name:'Đặt Tên Doanh Nghiệp',    cat:['daten','cong-viec'],            tags:['tên công ty','thương hiệu','kinh doanh'] },
    // Huyền Học
    { id:'tuong-hop',    url:'/tools/tuong-hop.html',           icon:'❤', name:'Tương Hợp Tuổi',           cat:['tuvi','hon-nhan'],              tags:['tương hợp','hợp khắc','tuổi'] },
    { id:'tu-tru',       url:'/tools/tu-tru.html',              icon:'📜', name:'Tứ Trụ Bát Tự',            cat:['tuvi','tinh-cach'],             tags:['tứ trụ','bát tự','nhật chủ'] },
    { id:'than-so',      url:'/tools/than-so-hoc.html',         icon:'🔢', name:'Thần Số Học',              cat:['tinh-cach'],                    tags:['thần số học','numerology','số chủ đạo'] },
    { id:'kinh-dich',    url:'/tools/kinh-dich.html',           icon:'☯', name:'Kinh Dịch 64 Quẻ',         cat:['tuvi'],                         tags:['kinh dịch','quẻ','bói toán'] },
    { id:'tarot',        url:'/tools/tarot.html',               icon:'🃏', name:'Tarot 78 Lá',              cat:['tinh-cach'],                    tags:['tarot','rút bài','tình duyên'] },
    { id:'ngu-hanh-ten', url:'/tools/ngu-hanh-ten.html',        icon:'✍', name:'Ngũ Hành Tên',             cat:['daten','tinh-cach'],            tags:['ngũ hành tên','phân tích tên'] },
    { id:'xem-sinh-con', url:'/tools/xem-tuoi-sinh-con.html',   icon:'🍼', name:'Xem Tuổi Sinh Con',        cat:['tuvi','gia-dinh','con-cai'],    tags:['sinh con','tuổi sinh con','năm sinh'] },
  ];

  // ── Category → tool mapping for khao-luan ────────────────────
  var CAT_MAP = {
    'hon-nhan':   ['xem-tuoi','tuong-hop','tuong-mat','hoang-dao','chon-ngay'],
    'gia-dinh':   ['xem-tuoi','dat-ten-con','kim-lau','bat-trach','xem-sinh-con'],
    'tai-chinh':  ['luan-giai','xem-lam-an','cua-hang','bat-trach','ngay-tot'],
    'cong-viec':  ['luan-giai','xem-lam-an','ban-lam-viec','cua-hang','dat-ten-dn'],
    'tinh-cach':  ['luan-giai','tuong-mat','nhan-tuong','thu-tuong','than-so'],
    'van-han':    ['luan-giai','dai-van','van-thang','han-nam','sao-nam'],
    'dien-san':   ['kim-lau','bat-trach','phong-thuy','chon-ngay','hoang-dao'],
    'quan-he':    ['xem-tuoi','tuong-hop','tuong-mat','thanh-tuong','khi-sac'],
    'benh-tat':   ['luan-giai','khi-sac','nap-am','mau-sac','hoang-dao'],
    'con-cai':    ['dat-ten-con','xem-sinh-con','luan-giai','tuong-mat','nap-am'],
  };

  // ── CSS ───────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('rt-css')) return;
    var s = document.createElement('style');
    s.id = 'rt-css';
    s.textContent = [
      '.rt-section{padding:48px 0;border-top:1px solid var(--border,#E8E8E8);margin-top:0}',
      '.rt-inner{max-width:960px;margin:0 auto;padding:0 40px}',
      '@media(max-width:700px){.rt-inner{padding:0 20px}}',
      '.rt-eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--text-lt,#777);display:flex;align-items:center;gap:16px;margin-bottom:24px}',
      '.rt-eyebrow::after{content:"";flex:1;height:1px;background:var(--border,#E8E8E8)}',
      '.rt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}',
      '@media(max-width:500px){.rt-grid{grid-template-columns:1fr 1fr}}',
      '.rt-card{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg,#fff);border:1px solid var(--border-lt,#E8E8E8);border-radius:9px;text-decoration:none;transition:border-color .15s,box-shadow .15s;color:inherit}',
      '.rt-card:hover{border-color:var(--navy,#061A2E);box-shadow:0 2px 8px rgba(6,26,46,.08);text-decoration:none}',
      '.rt-icon{font-size:20px;flex-shrink:0}',
      '.rt-name{font-size:12px;font-weight:600;color:var(--navy,#061A2E);line-height:1.3}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── Detect context ────────────────────────────────────────────
  function getContext() {
    var path = window.location.pathname.toLowerCase();

    // Khảo luận article page
    if (path.includes('/khao-luan/') && path.length > '/khao-luan/'.length) {
      return { type: 'khao-luan' };
    }

    // Tool page — detect which tool
    for (var i = 0; i < TOOLS.length; i++) {
      var t = TOOLS[i];
      var tpath = t.url.replace('https://www.tuviminhbao.com', '').toLowerCase();
      if (path === tpath || path.endsWith(tpath)) {
        return { type: 'tool', toolId: t.id };
      }
    }

    // Main pages
    if (path === '/' || path.endsWith('index.html')) return { type: 'tool', toolId: 'luan-giai' };
    if (path.includes('xem-tuoi')) return { type: 'tool', toolId: 'xem-tuoi' };
    if (path.includes('xem-lam-an')) return { type: 'tool', toolId: 'xem-lam-an' };

    return null;
  }

  // ── Get related tools for a tool page ────────────────────────
  function getRelatedForTool(toolId) {
    var current = TOOLS.find(function(t) { return t.id === toolId; });
    if (!current) return [];

    // Score other tools by category/tag overlap
    var scored = TOOLS
      .filter(function(t) { return t.id !== toolId; })
      .map(function(t) {
        var score = 0;
        current.cat.forEach(function(c) { if (t.cat.includes(c)) score += 3; });
        current.tags.forEach(function(tg) { if (t.tags.includes(tg)) score += 1; });
        return { tool: t, score: score };
      })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, 6)
      .map(function(x) { return x.tool; });

    // Fallback nếu không đủ 4
    if (scored.length < 4) {
      var sameCat = current.cat[0];
      TOOLS.forEach(function(t) {
        if (t.id !== toolId && !scored.find(function(s) { return s.id === t.id; }) && t.cat.includes(sameCat)) {
          scored.push(t);
        }
      });
    }

    return scored.slice(0, 6);
  }

  // ── Get related tools for khao-luan ──────────────────────────
  function getRelatedForArticle(category, tags) {
    var cat = (category || '').toLowerCase().replace(/\s/g, '-');
    var ids = CAT_MAP[cat] || [];

    // Also check tags
    if (ids.length < 4 && tags && tags.length) {
      TOOLS.forEach(function(t) {
        tags.forEach(function(tag) {
          var tl = (tag || '').toLowerCase();
          t.tags.forEach(function(ttag) {
            if (tl.includes(ttag) || ttag.includes(tl)) {
              if (!ids.includes(t.id)) ids.push(t.id);
            }
          });
        });
      });
    }

    // Fallback: default set
    if (ids.length < 3) ids = ['luan-giai', 'xem-tuoi', 'tuong-mat', 'phong-thuy', 'ngay-tot', 'dat-ten-con'];

    return ids.slice(0, 6).map(function(id) {
      return TOOLS.find(function(t) { return t.id === id; });
    }).filter(Boolean);
  }

  // ── Build HTML ────────────────────────────────────────────────
  function buildSection(tools, title) {
    if (!tools || !tools.length) return '';
    var cards = tools.map(function(t) {
      return '<a class="rt-card" href="' + t.url + '">'
        + '<span class="rt-icon">' + t.icon + '</span>'
        + '<span class="rt-name">' + t.name + '</span>'
        + '</a>';
    }).join('');
    return '<section class="rt-section" id="rt-section">'
      + '<div class="rt-inner">'
      + '<div class="rt-eyebrow">' + (title || 'Công Cụ Liên Quan') + '</div>'
      + '<div class="rt-grid">' + cards + '</div>'
      + '</div>'
      + '</section>';
  }

  // ── Inject for tool pages ─────────────────────────────────────
  function injectForTool(toolId) {
    var related = getRelatedForTool(toolId);
    if (!related.length) return;
    var html = buildSection(related, 'Công Cụ Liên Quan');
    // Insert before testimonials or footer
    var rv = document.getElementById('rv-section');
    var footer = document.querySelector('footer.site-footer');
    var target = rv || footer;
    if (target) {
      target.insertAdjacentHTML('beforebegin', html);
    } else {
      document.body.insertAdjacentHTML('beforeend', html);
    }
  }

  // ── Inject for khao-luan — wait for article to load ──────────
  function injectForKhaoLuan() {
    // Poll for article data — khao-luan.html sets window._articleData after fetch
    var tries = 0;
    var timer = setInterval(function() {
      tries++;
      var data = window._articleData;
      if (data) {
        clearInterval(timer);
        var related = getRelatedForArticle(data.category, data.tags);
        var html = buildSection(related, 'Công Cụ Hỗ Trợ Cho Chủ Đề Này');
        // Insert after article-body, before article-nav
        var body = document.getElementById('article-body');
        var nav  = document.querySelector('.article-nav');
        if (nav) {
          nav.insertAdjacentHTML('beforebegin', html);
        } else if (body) {
          body.insertAdjacentHTML('afterend', html);
        }
      }
      if (tries > 30) clearInterval(timer); // timeout 3s
    }, 100);
  }

  // ── Main ─────────────────────────────────────────────────────
  function run() {
    injectCSS();
    var ctx = getContext();
    if (!ctx) return;
    if (ctx.type === 'tool') injectForTool(ctx.toolId);
    if (ctx.type === 'khao-luan') injectForKhaoLuan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

})();
