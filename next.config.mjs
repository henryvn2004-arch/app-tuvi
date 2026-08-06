/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async rewrites() {
    return [
      { source: '/',                    destination: '/index.html'           },
      { source: '/app',                 destination: '/app-home.html'        },
      { source: '/app/la-so',           destination: '/app-luan-giai.html'   },
      { source: '/app/luan-giai',       destination: '/app-luan-giai.html'   },
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
      { source: '/app/thanh-tuong',     destination: '/app-thanh-tuong.html' },
      { source: '/app/thanh-tuong-pro', destination: '/app-thanh-tuong-pro.html' },
      { source: '/app/phong-thuy',      destination: '/app-phong-thuy.html'  },
      { source: '/app/bat-trach',       destination: '/app-bat-trach.html'   },
      { source: '/app/nap-am',          destination: '/app-nap-am.html'      },
      { source: '/app/than-so-hoc',     destination: '/app-than-so-hoc.html' },
      { source: '/app/kinh-dich',       destination: '/app-kinh-dich.html'   },
      { source: '/app/mai-hoa',         destination: '/app-mai-hoa.html'     },
      { source: '/app/ky-mon',          destination: '/app-ky-mon.html'      },
      { source: '/app/ban-do-sao',      destination: '/app-ban-do-sao.html'  },
      { source: '/app/tai-khoan',       destination: '/app-tai-khoan.html'   },
      { source: '/app/hoang-dao',       destination: '/app-hoang-dao.html'   },
      { source: '/app/ngay-tot',        destination: '/app-ngay-tot.html'    },
      { source: '/app/luc-nham',        destination: '/app-luc-nham.html'    },
      { source: '/app/chan-dung-vo-chong', destination: '/app-chan-dung-vo-chong.html' },
      { source: '/app/chan-dung-tien-kiep', destination: '/app-chan-dung-tien-kiep.html' },
      { source: '/app/duyen-no-tien-kiep', destination: '/app-duyen-no-tien-kiep.html' },
      { source: '/xem-tuoi',            destination: '/xem-tuoi.html'        },
      { source: '/xem-lam-an',          destination: '/xem-lam-an.html'      },
      { source: '/la-so',               destination: '/la-so.html'           },
      { source: '/la-so-v2',            destination: '/la-so-v2.html'        },
      { source: '/menh-kho',            destination: '/menh-kho.html'        },
      { source: '/cong-cu',             destination: '/cong-cu.html'         },
      { source: '/profile',             destination: '/profile.html'         },
      { source: '/about',               destination: '/about.html'           },
      { source: '/contact',             destination: '/contact.html'         },
      { source: '/resources',           destination: '/resources.html'       },
      { source: '/blog',                destination: '/blog.html'            },
      { source: '/payment-success',     destination: '/payment-success.html' },
      { source: '/auth-callback',       destination: '/auth-callback.html'   },
      { source: '/tai-lieu/:slug',      destination: '/tai-lieu.html'        },
      { source: '/tai-lieu/sach/:slug', destination: '/sach-detail.html'     },
      { source: '/sitemap.xml',         destination: '/api/sitemap'          },
      { source: '/sitemap-ngay-tot.xml', destination: '/sitemap-ngay-tot'    },
      { source: '/sitemap-hubs.xml',    destination: '/sitemap-hubs'         },
      { source: '/sitemap-pregen.xml',  destination: '/sitemap-pregen'       },
      { source: '/khao-luan/:slug',     destination: '/api/khao-luan?slug=:slug' },
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
    ];
  },
};

export default nextConfig;
