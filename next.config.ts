import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Serve HTML files from public/ at clean URLs via rewrites
  async rewrites() {
    return [
      // Main pages — map clean URLs to static HTML in public/
      { source: '/',              destination: '/index.html'         },
      { source: '/xem-tuoi',     destination: '/xem-tuoi.html'      },
      { source: '/xem-lam-an',   destination: '/xem-lam-an.html'    },
      { source: '/la-so',        destination: '/la-so.html'         },
      { source: '/menh-kho',     destination: '/menh-kho.html'      },
      { source: '/profile',      destination: '/profile.html'       },
      { source: '/about',        destination: '/about.html'         },
      { source: '/contact',      destination: '/contact.html'       },
      { source: '/resources',    destination: '/resources.html'     },
      { source: '/blog',         destination: '/blog.html'          },
      { source: '/payment-success', destination: '/payment-success.html' },
      { source: '/auth-callback',   destination: '/auth-callback.html'   },

      // Tai liệu
      { source: '/tai-lieu/:slug', destination: '/tai-lieu.html'    },
      { source: '/tai-lieu/sach/:slug', destination: '/sach-detail.html' },

      // Sitemap & khao luan (keep serving via API)
      { source: '/sitemap.xml',  destination: '/api/sitemap'        },
      { source: '/khao-luan/:slug', destination: '/api/khao-luan?slug=:slug' },
    ];
  },
};

export default nextConfig;
