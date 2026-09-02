// Flat config (ESLint v9+). Migrated từ .eslintrc.json sau khi bump ESLint 8 → 10.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const projectGlobals = {
  computeTuvi: 'writable',
  computeTubinh: 'writable',
  AnSao: 'writable',
  anSao: 'writable',
  anSaoLaSo: 'writable',
  anSaoTuBinh: 'writable',
  CACH_CUC_ALL: 'writable',
  STAR_DATA: 'writable',
  // public/tuvi-ansao-engine.js — dùng bởi public/tuvi-laso-format.js (khối
  // Tứ Hóa Phi Tinh), cùng cách STAR_DATA đã dùng ở trên.
  THIEN_CAN: 'writable',
  DIA_CHI: 'writable',
  TU_HOA: 'writable',
  menhTamPhuong: 'writable',
  domainScores: 'writable',
  tubinhCachCucSpecial: 'writable',
  TuviForm: 'writable',
  renderNav: 'writable',
  renderFooter: 'writable',
  Auth: 'writable',
  supabase: 'writable',
  marked: 'readonly',
  convertDuongToAm: 'readonly',
  paypal: 'readonly',
  gtag: 'readonly',
  dataLayer: 'readonly',
  fbq: 'readonly',
  Sentry: 'readonly',
  lucide: 'readonly',
  // public/tool-prices.js — nguồn danh mục + giá dùng chung, nạp động ở nhiều
  // trang (shell.js và tuvi-paywall.js tự chèn thẻ script khi trang chưa có).
  ToolPrices: 'readonly',
};

const sharedRules = {
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-prototype-builtins': 'off',
  'no-control-regex': 'off',
  'no-useless-escape': 'off',
  'no-inner-declarations': 'off',
  'no-async-promise-executor': 'warn',
  'no-undef': 'error',
  'no-constant-condition': ['error', { checkLoops: false }],
  // Strict rule mới trong ESLint 9+ — flag false positive trên kiểu pattern
  // build-then-replace-then-output ở vanilla JS. Bật lại sau khi audit.
  'no-useless-assignment': 'off',
};

export default [
  // Global ignores — same content as old .eslintignore
  {
    ignores: [
      'node_modules/',
      '.next/',
      '.vercel/',
      '.claude/',
      'dist/',
      'build/',
      'out/',
      'coverage/',
      'playwright-report/',
      'playwright-report-smoke/',
      'test-results/',
      '.lighthouseci/',
      '*.min.js',
      '**/*.ts',
      '**/*.tsx',
      'tuvi-engine/',
      // Sub-package riêng (React + JSX + tsconfig riêng) — cùng lý do với
      // `tuvi-engine/`: nó tự lint/typecheck bằng cấu hình của chính nó.
      'remotion/',
      'public/cach_cuc_all.json',
      'chunks_all.json',
      'sach/',
      'authors/',
      'sample-laso-*.html',
      '_patches/',
      'patch-*.js',
      '*.py',
      'payos-integration/',
      'payos-v2/',
      'run_embed.py',
      'setup_playwright.sh',
      // Mã CỦA NGƯỜI KHÁC (xem scripts/oracle/vendor/README.md) — bản gốc,
      // không sửa, không lint theo luật của repo mình. Cùng lý do với
      // `tuvi-engine/`/`remotion/`.
      'scripts/oracle/vendor/',
    ],
  },

  js.configs.recommended,

  // Base config cho browser JS
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...projectGlobals,
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
      },
    },
    rules: sharedRules,
  },

  // Node scripts
  {
    files: ['scripts/**/*.{js,mjs,cjs}', '*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node, ...projectGlobals },
    },
  },

  // Vanilla public scripts (IIFE / script tag style)
  {
    files: ['public/**/*.js'],
    languageOptions: {
      sourceType: 'script',
    },
  },

  // Next.js API routes (Node env)
  {
    files: ['app/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node, ...projectGlobals },
    },
  },

  // Legacy engine file — duplicate star keys + intentional UMD re-export
  {
    files: ['public/tuvi-ansao-engine.js'],
    rules: {
      'no-dupe-keys': 'off',
      'no-redeclare': 'off',
    },
  },

  // Disable rules that conflict with Prettier
  prettier,
];
