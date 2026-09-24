/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  // @react-pdf/renderer (PDF luận giải qua email, lib/pdf/luan-giai.tsx) dựng
  // font chuẩn qua subpath import map (`#standard-fonts/Helvetica`) — bundler
  // của Next KHÔNG resolve đúng map đó (đã đo: bundle bằng esbuild ném
  // `Cannot find module '#standard-fonts/Helvetica'`), trong khi resolver gốc
  // của Node đọc đúng `exports` trong package.json. Để NGOÀI bundle thì route
  // gọi thẳng `require()`/`import` lúc chạy, y hệt Node chạy trực tiếp — đã
  // xác minh bằng bản transpile-only (không bundle) chạy ra PDF thật.
  serverExternalPackages: ['@react-pdf/renderer'],
  // PDF luận giải nhúng font Be Vietnam Pro (đọc thẳng từ đĩa bằng đường dẫn
  // fs, xem lib/pdf/luan-giai.tsx) — không có dòng này thì lượt dò file của
  // Next có thể KHÔNG mang 2 file .ttf vào gói hàm serverless (chúng nằm
  // trong `public/`, phục vụ tĩnh qua CDN, không mặc định có mặt trong FS lúc
  // hàm chạy). Thiếu font ⇒ rơi về Helvetica ⇒ mất dấu tiếng Việt HOÀN TOÀN,
  // đúng lỗi đã cắn (xem docs/nhat-ky/2026-09.md, "PDF câm dấu").
  outputFileTracingIncludes: {
    '/api/luan-giai/email-pdf': ['./public/fonts/be-vietnam-pro-400.ttf', './public/fonts/be-vietnam-pro-700.ttf'],
  },
  async rewrites() {
    return [
      { source: '/',                    destination: '/index-sample-v3.html' },
      { source: '/app',                 destination: '/app-home.html'        },
      { source: '/app/la-so',           destination: '/app-luan-giai.html'   },
      { source: '/app/luan-giai',       destination: '/app-luan-giai.html'   },
      { source: '/app/chu-trinh-cuoc-doi', destination: '/app-chu-trinh-cuoc-doi.html' },
      { source: '/app/van-han-nam',     destination: '/app-van-han-nam.html' },
      { source: '/app/bat-tu',          destination: '/app-bat-tu.html'      },
      { source: '/app/xem-tuoi',        destination: '/app-xem-tuoi.html'    },
      { source: '/app/xem-lam-an',      destination: '/app-xem-tuoi.html'    },
      { source: '/app/tuong-hop',       destination: '/app-xem-tuoi.html'    },
      { source: '/app/sinh-con',        destination: '/app-sinh-con.html'    },
      { source: '/app/dat-ten',         destination: '/app-dat-ten.html'     },
      { source: '/app/dat-ten-dn',      destination: '/app-dat-ten-dn.html'  },
      { source: '/app/ngu-hanh-ten',    destination: '/app-ngu-hanh-ten.html'},
      { source: '/app/chon-ngay',       destination: '/app-chon-ngay.html'   },
      { source: '/app/kim-lau',         destination: '/app-kim-lau.html'     },
      { source: '/app/dien-tuong',      destination: '/app-dien-tuong.html'  },
      { source: '/app/nhan-tuong',      destination: '/app-nhan-tuong.html'  },
      { source: '/app/thu-tuong',       destination: '/app-thu-tuong.html'   },
      { source: '/app/but-tuong',       destination: '/app-but-tuong.html'   },
      { source: '/app/thanh-tuong',     destination: '/app-thanh-tuong.html' },
      { source: '/app/thanh-tuong-pro', destination: '/app-thanh-tuong-pro.html' },
      { source: '/app/phong-thuy',      destination: '/app-phong-thuy.html'  },
      { source: '/app/ban-lam-viec',    destination: '/app-ban-lam-viec.html' },
      { source: '/app/cua-hang-phong-thuy', destination: '/app-cua-hang-phong-thuy.html' },
      { source: '/app/bat-trach',       destination: '/app-bat-trach.html'   },
      { source: '/app/nap-am',          destination: '/app-nap-am.html'      },
      { source: '/app/so-dep',          destination: '/app-so-dep.html'      },
      { source: '/app/than-so-hoc',     destination: '/app-than-so-hoc.html' },
      { source: '/app/kinh-dich',       destination: '/app-kinh-dich.html'   },
      { source: '/app/mai-hoa',         destination: '/app-mai-hoa.html'     },
      { source: '/app/ky-mon',          destination: '/app-ky-mon.html'      },
      { source: '/app/ban-do-sao',      destination: '/app-ban-do-sao.html'  },
      { source: '/app/cong-so',         destination: '/app-cong-so.html'     },
      { source: '/app/tai-khoan',       destination: '/app-tai-khoan.html'   },
      { source: '/app/so-la-so',        destination: '/app-so-la-so.html'    },
      // hellobot-ui-redesign (2026-09-24): 5 đích của tabbar/sidebar mới.
      // /app/ho-so và /app/tai-khoan CÙNG một file — app-tai-khoan.html đã tự
      // khai SHELL_ACTIVE='ho-so' từ trước, không cần fork trang.
      { source: '/app/ho-so',           destination: '/app-tai-khoan.html'   },
      { source: '/app/thay',            destination: '/app-thay.html'        },
      { source: '/app/tro-chuyen',      destination: '/app-tro-chuyen.html'  },
      // Nạp Lượng dùng LẠI topup.html (đã là trang chốt gói/thanh toán chuẩn,
      // không nạp shell.js) — tránh fork một nguồn giá thứ hai. Bọc nó vào
      // khung sidebar/tabbar là việc của đợt sau (topup.html hiện đứng riêng,
      // giống hệt cách "Nạp thêm" trong rail vẫn trỏ thẳng /topup.html).
      { source: '/app/nap-luong',       destination: '/topup.html'           },
      { source: '/app/hoang-dao',       destination: '/app-hoang-dao.html'   },
      { source: '/app/ngay-tot',        destination: '/app-ngay-tot.html'    },
      { source: '/app/luc-nham',        destination: '/app-luc-nham.html'    },
      { source: '/app/chan-dung-vo-chong', destination: '/app-chan-dung-vo-chong.html' },
      { source: '/app/chan-dung-tien-kiep', destination: '/app-chan-dung-tien-kiep.html' },
      { source: '/app/duyen-no-tien-kiep', destination: '/app-duyen-no-tien-kiep.html' },
      { source: '/app/nguoi-khac', destination: '/app-nguoi-khac.html' },
      { source: '/app/day-con', destination: '/app-day-con.html' },
      { source: '/app/huong-nghiep-tre', destination: '/app-huong-nghiep-tre.html' },
      { source: '/app/gio-sinh', destination: '/app-gio-sinh.html' },
      { source: '/app/nhan-mach', destination: '/app-nhan-mach.html' },
      { source: '/app/da-lieu-ai', destination: '/app-da-lieu-ai.html' },
      { source: '/app/kieu-toc', destination: '/app-kieu-toc.html' },
      { source: '/app/mau-sac-hop-menh', destination: '/app-mau-sac-hop-menh.html' },
      { source: '/app/personal-color', destination: '/app-personal-color.html' },
      { source: '/app/trang-diem', destination: '/app-trang-diem.html' },
      { source: '/app/trang-phuc-theo-ngay', destination: '/app-trang-phuc-theo-ngay.html' },
      { source: '/app/tarot', destination: '/app-tarot.html' },
      { source: '/app/oracle', destination: '/app-oracle.html' },
      { source: '/app/boi-bai-tay', destination: '/app-boi-bai-tay.html' },
      { source: '/app/khi-sac', destination: '/app-khi-sac.html' },
      { source: '/la-so',               destination: '/la-so.html'           },
      { source: '/la-so-v2',            destination: '/la-so-v2.html'        },
      { source: '/menh-kho',            destination: '/menh-kho.html'        },
      { source: '/cong-cu',             destination: '/cong-cu.html'         },
      { source: '/profile',             destination: '/profile.html'         },
      { source: '/about',               destination: '/about.html'           },
      { source: '/contact',             destination: '/contact.html'         },
      { source: '/resources',           destination: '/resources.html'       },
      { source: '/phuong-phap',         destination: '/phuong-phap.html'     },
      { source: '/payment-success',     destination: '/payment-success.html' },
      { source: '/auth-callback',       destination: '/auth-callback.html'   },
      { source: '/tai-lieu/:slug',      destination: '/tai-lieu.html'        },
      { source: '/tai-lieu/sach/:slug', destination: '/sach-detail.html'     },
      // /sitemap.xml nay là SITEMAPINDEX trỏ 6 file con ngay dưới đây — chia
      // theo nhóm để LỌC ĐƯỢC trong GSC, không phải để crawl nhanh hơn.
      { source: '/sitemap.xml',         destination: '/api/sitemap'          },
      { source: '/sitemap-trang.xml',   destination: '/sitemap-trang'        },
      { source: '/sitemap-noi-dung.xml', destination: '/sitemap-noi-dung'    },
      { source: '/sitemap-seo.xml',     destination: '/sitemap-seo'          },
      { source: '/sitemap-van-han.xml', destination: '/sitemap-van-han'      },
      { source: '/sitemap-la-so.xml',   destination: '/sitemap-la-so'        },
      { source: '/sitemap-la-so-pregen.xml', destination: '/sitemap-la-so-pregen' },
      { source: '/sitemap-ngay-tot.xml', destination: '/sitemap-ngay-tot'    },
      { source: '/sitemap-hubs.xml',    destination: '/sitemap-hubs'         },
      { source: '/sitemap-pregen.xml',  destination: '/sitemap-pregen'       },
      { source: '/khao-luan/:slug',     destination: '/api/khao-luan?slug=:slug' },
      // Link "Tải PDF" mẫu — proxy qua domain riêng để không lộ project ref Supabase.
      { source: '/tai-mau/:file',       destination: '/api/tai-mau?file=:file'   },
      { source: '/tu-vi/:slug',         destination: '/api/tu-vi?slug=:slug'     },
      { source: '/phong-thuy',          destination: '/api/tu-vi-hub?cat=phong-thuy'   },
      { source: '/xem-tuong',           destination: '/api/tu-vi-hub?cat=xem-tuong'    },
      { source: '/chon-ngay',           destination: '/api/tu-vi-hub?cat=chon-ngay'    },
      { source: '/lam-dep',             destination: '/api/tu-vi-hub?cat=lam-dep'      },
      { source: '/dat-ten',             destination: '/api/tu-vi-hub?cat=dat-ten'      },
      { source: '/kien-thuc-tuvi',      destination: '/api/tu-vi-hub?cat=kien-thuc-tuvi' },
      // Phân trang hub theo ĐƯỜNG DẪN, không dùng ?page=N.
      // Lý do là độ chắc chắn, không phải thẩm mỹ: dạng này dùng ĐÚNG cơ chế
      // "destination mang sẵn query" mà `/tu-vi/:slug` đã chứng minh chạy trên
      // prod. Còn `?page=N` phải trông vào việc Next merge query TỪ NGOÀI vào
      // destination — hành vi tôi không kiểm được từ container (prod chặn
      // mạng, preview khoá sau SSO, và `next dev` thì bỏ luôn query của
      // destination nên không dùng để kết luận được). Hỏng kiểu đó lại còn im
      // lặng: mọi trang cứ hiện trang 1, không báo lỗi gì.
      { source: '/phong-thuy/trang/:page',     destination: '/api/tu-vi-hub?cat=phong-thuy&page=:page'     },
      { source: '/xem-tuong/trang/:page',      destination: '/api/tu-vi-hub?cat=xem-tuong&page=:page'      },
      { source: '/chon-ngay/trang/:page',      destination: '/api/tu-vi-hub?cat=chon-ngay&page=:page'      },
      { source: '/lam-dep/trang/:page',        destination: '/api/tu-vi-hub?cat=lam-dep&page=:page'        },
      { source: '/dat-ten/trang/:page',        destination: '/api/tu-vi-hub?cat=dat-ten&page=:page'        },
      { source: '/kien-thuc-tuvi/trang/:page', destination: '/api/tu-vi-hub?cat=kien-thuc-tuvi&page=:page' },
    ];
  },
  async redirects() {
    return [
      { source: '/app/xem-tuong', destination: '/app/dien-tuong', permanent: false },
      // Gộp cụm kim lâu về MỘT URL. Trang trụ /kim-lau chứa đủ công cụ + công
      // thức + bảng tra + hoá giải; để /tools/kim-lau.html sống song song là tự
      // dựng lại đúng cặp URL triệt nhau vừa phải gỡ ở #358.
      { source: '/tools/kim-lau.html', destination: '/kim-lau', permanent: true },
      // Trang cũ 24-phần (public/luan-giai.html) → bản đang bán thật (13 phần,
      // /app/luan-giai) — quyết định của Henry (2026-09-14, xem plan productize
      // luận giải). `permanent:true` ⇒ Next trả 308 (không phải 301 thô — Next
      // dùng 307/308 để giữ nguyên method của request gốc, xem docs), search
      // engine coi 308 tương đương 301 khi gộp tín hiệu index/backlink.
      // Redirects chạy TRƯỚC filesystem/`/public` (docs Next), nên rule này
      // chặn hẳn `public/luan-giai.html` — file đó xoá luôn trong cùng lượt
      // này, không để lại 4200+ dòng chết không ai đọc được.
      { source: '/luan-giai.html', destination: '/app/luan-giai', permanent: true },
      // Retire 3 trang standalone giàu nội dung (xem-tuoi.html, xem-lam-an.html,
      // tu-binh.html) — Henry, 2026-09-19. Cùng khuôn với /luan-giai.html: 308,
      // chặn TRƯỚC filesystem nên an toàn xoá file .html cùng lượt. Redirect cả
      // path .html LẪN path đẹp cũ (rewrite '/xem-tuoi'→'/xem-tuoi.html' đã gỡ ở
      // rewrites() phía trên, không còn ai phục vụ '/xem-tuoi' nếu thiếu dòng này).
      { source: '/xem-tuoi.html',   destination: '/app/xem-tuoi',   permanent: true },
      { source: '/xem-tuoi',        destination: '/app/xem-tuoi',   permanent: true },
      { source: '/xem-lam-an.html', destination: '/app/xem-lam-an', permanent: true },
      { source: '/xem-lam-an',      destination: '/app/xem-lam-an', permanent: true },
      { source: '/tu-binh.html',    destination: '/app/bat-tu',     permanent: true },
      // Trang DNA "Cách hệ thống hoạt động" — dọn về URL sạch để nộp sitemap
      // + llms.txt + JSON-LD (canonical/og:url dùng /phuong-phap, không còn
      // .html). Link cũ trỏ .html vẫn còn ở vài nơi ngoài site (backlink,
      // social) nên giữ redirect 308 thay vì xoá thẳng.
      { source: '/phuong-phap.html', destination: '/phuong-phap',    permanent: true },
      // `/blog.html` (client fetch, 0 link cho AI crawler thấy — xem
      // app/van-dap/route.ts) → hub SSR mới. GSC 28 ngày cả site chỉ 16 nhấp
      // (11 về trang chủ) nên gần như không có equity để mất; `/blog` (rewrite
      // cũ trỏ .html) cũng dọn về cùng đích, khỏi còn hai đường vào một nội
      // dung đã xoá.
      { source: '/blog.html', destination: '/van-dap', permanent: true },
      { source: '/blog',      destination: '/van-dap', permanent: true },
      // `khao-luan.html` (bản client-render CŨ, không lọc publish_status —
      // đã bị SSR route `/api/khao-luan` thay thế từ trước nhưng file tĩnh
      // vẫn còn phục vụ được thẳng ở `/khao-luan.html`) — xoá file, chặn
      // bằng redirect trước filesystem, cùng khuôn các dòng trên.
      { source: '/khao-luan.html', destination: '/van-dap', permanent: true },
    ];
  },
};

export default nextConfig;
