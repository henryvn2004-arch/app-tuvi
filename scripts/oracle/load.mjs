// scripts/oracle/load.mjs
// ============================================================
// Bộ nạp TRỌNG TÀI đối chiếu — chạy "An Sao - Tử Vi Thiên Lương" (mã của
// người khác, KHÔNG commit vào repo — xem scripts/oracle/vendor/README.md)
// trong Node bằng cách stub DOM tối thiểu, giống hệt cách môi trường trình
// duyệt của họ được giả lập để chạy `new Function` (mẫu đã dùng và kiểm
// chứng thật trong phiên đối chiếu công thức trước khi viết workplan).
//
// CHỈ dùng trong scripts/oracle/check-*.mjs. KHÔNG import từ lib/ hay app/.
// Không sửa công thức của họ ở đây — mọi hiệu chỉnh khác biệt trường phái
// nằm ở PHÍA GỌI (ví dụ: đưa quy tắc múi giờ lịch sử VN vào tham số `tz`).
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VENDOR_DIR = join(__dirname, 'vendor');

// Bóc thẻ <script>…</script> nếu file còn nguyên (bản chép từ HTML gốc hay
// giữ nguyên thẻ bọc ngoài) — chấp nhận cả khi không có, để idempotent.
function stripScriptTags(src) {
  return src.replace(/^\s*<script[^>]*>\s*/i, '').replace(/\s*<\/script>\s*$/i, '');
}

function readVendorSource() {
  const jsPath = join(VENDOR_DIR, 'an-sao-thien-luong.js');
  const htmlPath = join(VENDOR_DIR, 'an-sao-thien-luong.html');
  if (existsSync(jsPath)) return stripScriptTags(readFileSync(jsPath, 'utf-8'));
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf-8');
    const m = html.match(/<script>([\s\S]*?)<\/script>\s*(?:<\/body>)?\s*(?:<\/html>)?\s*$/);
    if (m) return m[1];
    throw new Error(
      `scripts/oracle/vendor/an-sao-thien-luong.html không tìm thấy khối <script> cuối file.`
    );
  }
  throw new Error(
    'Thiếu file oracle: scripts/oracle/vendor/an-sao-thien-luong.{js,html}.\n' +
      'Đây là công cụ ĐỐI CHIẾU tuỳ chọn (không phải nguồn của sản phẩm) — xem\n' +
      'scripts/oracle/vendor/README.md để lấy file. check:laso-golden KHÔNG cần file này.'
  );
}

function noop() {}
function mkEl() {
  const el = {
    value: '',
    checked: false,
    textContent: '',
    innerHTML: '',
    style: {},
    classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
    dataset: {},
    children: [],
    parentNode: null,
    addEventListener: noop,
    removeEventListener: noop,
    appendChild: noop,
    setAttribute: noop,
    getAttribute: () => null,
    querySelector: () => mkEl(),
    querySelectorAll: () => [],
    closest: () => null,
    remove: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
  };
  return el;
}

let cached = null;

/**
 * Nạp oracle, trả về API sạch. Ném lỗi rõ ràng nếu thiếu file — KHÔNG âm
 * thầm trả object rỗng (thà đỏ to tiếng, xem check-laso-markers.mjs).
 */
export function loadOracle() {
  if (cached) return cached;

  const src = readVendorSource();

  const document = {
    querySelector: () => mkEl(),
    querySelectorAll: () => [],
    getElementById: () => mkEl(),
    createElement: () => mkEl(),
    addEventListener: noop,
    body: mkEl(),
    documentElement: mkEl(),
    head: mkEl(),
    readyState: 'complete',
  };
  const window = {
    addEventListener: noop,
    removeEventListener: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    location: { href: 'https://x/', search: '' },
    localStorage: { getItem: () => null, setItem: noop },
    devicePixelRatio: 1,
    innerWidth: 1024,
    innerHeight: 768,
    requestAnimationFrame: noop,
    setTimeout: noop,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  };
  const navigator = { userAgent: 'node-oracle', clipboard: null };

  // Danh sách export: đúng tên hàm/hằng trong mã gốc của họ — không đổi tên,
  // không viết lại logic. Bổ sung hàm thì thêm vào cuối danh sách return.
  const EXPORTS = [
    'solarToLunar',
    'lunarToSolar',
    'jdFromDate',
    'dayStemBranch',
    'hourBranchFrom24',
    'hourStem',
    'yearStem',
    'yearBranch',
    'wrap1',
    'mod',
    'stemYang',
    'branchYang',
    'genderSign',
    'polarityGenderDirection',
    'menhThan',
    'findCuc',
    'napAm',
    'buildStars',
    'locate',
    'houseCan',
    'kinhDaPlacement',
    'findTriet',
    'decadeAt',
    'distanceHouse',
    'tieuHanStartByBirthBranch',
    'tieuHanDirection',
    'tieuHanBranch',
    'luuDaiHanBranch',
    'lunarMonthCanChi',
    'amDuongThuanLy',
    'CAN',
    'CHI',
    'STATUS',
    'THIEN_LUONG_TU_HOA',
    'LOC_TON',
    'LOC_RING',
    'THAI_TUE',
    'TRANG_SINH',
    'CUC_INFO',
    'STAR_ELEMENT',
    'MAJOR_META',
    'lunarDeltaTSeconds',
  ];

  const fn = new Function(
    'document',
    'window',
    'navigator',
    'alert',
    'requestAnimationFrame',
    'setTimeout',
    'getComputedStyle',
    src + `\nreturn {${EXPORTS.join(',')}};`
  );

  let oracle;
  // Dòng cuối file gốc của họ tự gọi render() ngay khi script chạy — trong
  // Node không có input DOM thật nên nó ném "Vui lòng nhập đủ Ngày..." và TỰ
  // BẮT lỗi đó bằng console.error nội bộ (không throw ra ngoài — đã verify:
  // hàm vẫn trả về object đầy đủ). Tắt tạm console.error để log sạch; đây
  // KHÔNG che lỗi thật của bộ nạp — lỗi thật (script hỏng) văng ra ở catch
  // bên dưới qua exception, không qua console.error.
  const realConsoleError = console.error;
  console.error = () => {};
  try {
    oracle = fn(
      document,
      window,
      navigator,
      noop,
      (f) => 0,
      (f) => 0,
      window.getComputedStyle
    );
  } catch (e) {
    throw new Error(
      `Nạp oracle thất bại (mã của họ ném lỗi khi eval): ${e.message}\n` +
        `Kiểm scripts/oracle/vendor/an-sao-thien-luong.js còn nguyên vẹn không.`,
      { cause: e }
    );
  } finally {
    console.error = realConsoleError;
  }

  cached = oracle;
  return oracle;
}

/**
 * Dựng một lá số oracle từ CAN/CHI NĂM trực tiếp (1..10 / 1..12) — dùng cho
 * quét vét cạn toàn miền. An sao KHÔNG phụ thuộc số năm âm thật (chỉ phụ
 * thuộc can chi năm · tháng ÂL · ngày ÂL · giờ · giới — xem CLAUDE.md mục
 * "lá số lặp đúng chu kỳ 60 năm"), nên không cần năm dương thật ở đây.
 *
 * @param {object} p
 * @param {number} p.canNam 1..10 (1=Giáp)
 * @param {number} p.chiNam 1..12 (1=Tý)
 * @param {number} p.ld ngày âm 1..30
 * @param {number} p.lm tháng âm 1..12
 * @param {number} p.hourBranch giờ chi 1..12 (1=Tý)
 * @param {'Nam'|'Nữ'} p.gender
 */
let canChiToYearCache = null;
/**
 * `buildStars()` của họ tự suy `can`/`chi` LẠI từ `ly` (bỏ qua canNam/chiNam
 * truyền ngoài) — nên phải tìm đúng năm dương mà yearStem/yearBranch trả ra
 * đúng cặp can-chi mong muốn, KHÔNG được đoán bằng công thức tay (rủi ro sai
 * số học). Dò vét cạn 60 năm liên tiếp, cache lại vì chỉ có 60 cặp.
 */
function findYearForCanChi(canNam, chiNam) {
  const O = loadOracle();
  if (!canChiToYearCache) {
    canChiToYearCache = new Map();
    for (let y = 1900; y < 1960; y++) {
      const key = `${O.yearStem(y)}-${O.yearBranch(y)}`;
      if (!canChiToYearCache.has(key)) canChiToYearCache.set(key, y);
    }
  }
  const y = canChiToYearCache.get(`${canNam}-${chiNam}`);
  if (y == null)
    throw new Error(`Không tìm được năm dương cho can=${canNam} chi=${chiNam} trong 60 năm dò`);
  return y;
}

export function buildOracleChartFromCanChi({ canNam, chiNam, ld, lm, hourBranch, gender }) {
  const O = loadOracle();
  const mt = O.menhThan(lm, hourBranch);
  const cuc = O.findCuc(mt.menh, canNam);
  const banMenh = O.napAm(canNam, chiNam);
  const ly = findYearForCanChi(canNam, chiNam);
  const star = O.buildStars({
    ld,
    lm,
    ly,
    hourBranch,
    gender,
    menh: mt.menh,
    than: mt.than,
    cuc,
    banMenh,
  });
  return { canNam, chiNam, menh: mt.menh, than: mt.than, cuc, banMenh, ...star };
}

/**
 * Dựng một lá số oracle từ NĂM DƯƠNG thật (dùng khi cần khớp với ngày dương
 * cụ thể, ví dụ đối chiếu lịch âm P1). `ly` ở đây PHẢI là năm ÂM LỊCH thật.
 */
export function buildOracleChart({ ld, lm, ly, hourBranch, gender }) {
  const O = loadOracle();
  const canNam = O.yearStem(ly);
  const chiNam = O.yearBranch(ly);
  return buildOracleChartFromCanChi({ canNam, chiNam, ld, lm, hourBranch, gender });
}
