/* tools-shared/noi-sinh.js — NƠI SINH → (lịch âm của truyền thống nơi đó, giờ dân sự của lịch đó).
   Nguồn DUY NHẤT cho: `public/tuvi-form.js` (form ngày sinh dùng chung của Tử Vi + Bát Tự)
   và `scripts/lunar-lich.mjs` (quy tắc múi giờ khi SINH bảng cn/kr/jp — đọc `GIO_LICH` ở đây).
   window.NoiSinh = { LICH_MAC_DINH, NUOC, GIO_LICH, lichCuaNoiSinh, vungCuaNuoc, quyDoi, offsetPhut }

   ── VÌ SAO ─────────────────────────────────────────────────
   Mùng 1 là ngày chứa thời điểm sóc TÍNH THEO GIỜ CỦA LỊCH. Lịch Trung/Đài/HK
   (UTC+8), Hàn, Nhật (UTC+9) có ngày/tháng khác lịch VN (Tết 1985: VN 21/01,
   Trung 20/02). Người dùng chỉ chọn NƠI SINH; hàm `quyDoi` tự:
     1. giờ đồng hồ nơi sinh → thời điểm tuyệt đối: múi giờ + giờ mùa hè LỊCH SỬ
        (Nhật 1948–51, Hàn 1987–88, Đài nhiều năm…) đọc từ IANA tzdata qua `Intl`
        — KHÔNG gõ tay bảng offset dân sự;
     2. chọn lịch theo truyền thống nơi sinh (`LICH_THEO_NUOC`, còn lại → `LICH_MAC_DINH`);
     3. đổi thời điểm sang giờ của lịch đó ⇒ ngày dương + giờ đưa vào engine an sao
        cùng tham số `lich` (`convertDuongToAm(d,m,y,h,lich)`).
   ⚠️ Sinh ở VIỆT NAM KHÔNG đi qua `quyDoi` — form giữ NGUYÊN đường cũ
   (`VnTimezone.toVnHour(…, 420, …)`) để lá số người VN y hệt trước đây.

   ── Giờ CỦA LỊCH (không phải giờ dân sự nơi sinh) ─────────
   cn: UTC+8 (HKO) · jp: UTC+9 · kr: UTC+8 trước 1912, UTC+9 từ 1912 (ICU dangical.cpp,
   dẫn KASI; giờ chuẩn Hàn 1954–61 là +8:30 nhưng lịch âm KHÔNG theo — xem
   scripts/lunar-lich.mjs). Giờ mùa hè KHÔNG thuộc giờ của lịch ⇒ người sinh giờ
   mùa hè được trừ giờ mùa hè ra, đúng lệ của các lịch vạn niên bản địa.
   vn (nơi sinh nước ngoài không có truyền thống lịch riêng): giờ VN tại thời
   điểm đó theo bảng lịch sử `VnTimezone.getVnUtcOffset` — cùng hệ quy chiếu đường
   "Sinh ở ngoài Việt Nam" cũ (chỉ khác: nay có giờ mùa hè + đổi được cả NGÀY khi
   qua nửa đêm). Chưa áp giờ MẶT TRỜI thật (lệ một số thầy Hàn trừ ~30 phút) —
   đó là chuyện trường phái, chưa có quyết định. */
(function (root) {
  /** Nơi sinh không thuộc truyền thống lịch nào dưới đây → dùng lịch này. Đổi một chỗ là đủ. */
  var LICH_MAC_DINH = 'vn';

  /** Mã quốc gia (ISO 3166-1) → lịch âm theo truyền thống. */
  var LICH_THEO_NUOC = { VN: 'vn', CN: 'cn', TW: 'cn', HK: 'cn', MO: 'cn', KR: 'kr', JP: 'jp' };

  /** Giờ của lịch (phút so với UTC) tại ngày yyyymmdd — nguồn ở chú thích đầu file. */
  var GIO_LICH = {
    cn: function () { return 480; },
    kr: function (ymd) { return ymd < 19120101 ? 480 : 540; },
    jp: function () { return 540; },
  };

  /** [mã, tên tiếng Việt, [múi IANA, nhãn vùng]…] — nhiều múi thì người dùng chọn vùng. */
  var NUOC = [
    ['VN', 'Việt Nam', [['Asia/Ho_Chi_Minh', '']]],
    ['CN', 'Trung Quốc', [['Asia/Shanghai', '']]],
    ['TW', 'Đài Loan', [['Asia/Taipei', '']]],
    ['HK', 'Hồng Kông', [['Asia/Hong_Kong', '']]],
    ['MO', 'Ma Cao', [['Asia/Macau', '']]],
    ['KR', 'Hàn Quốc', [['Asia/Seoul', '']]],
    ['JP', 'Nhật Bản', [['Asia/Tokyo', '']]],
    ['US', 'Hoa Kỳ', [
      ['America/New_York', 'Miền Đông (New York, Washington, Florida)'],
      ['America/Chicago', 'Miền Trung (Chicago, Texas)'],
      ['America/Denver', 'Miền núi (Denver, Utah)'],
      ['America/Phoenix', 'Arizona'],
      ['America/Los_Angeles', 'Miền Tây (California, Washington, Nevada)'],
      ['America/Anchorage', 'Alaska'],
      ['Pacific/Honolulu', 'Hawaii'],
    ]],
    ['CA', 'Canada', [
      ['America/Toronto', 'Ontario, Québec (Toronto, Montréal)'],
      ['America/Vancouver', 'British Columbia (Vancouver)'],
      ['America/Edmonton', 'Alberta (Calgary, Edmonton)'],
      ['America/Winnipeg', 'Manitoba (Winnipeg)'],
      ['America/Regina', 'Saskatchewan'],
      ['America/Halifax', 'Nova Scotia, New Brunswick'],
      ['America/St_Johns', 'Newfoundland'],
    ]],
    ['AU', 'Úc', [
      ['Australia/Sydney', 'New South Wales, ACT (Sydney, Canberra)'],
      ['Australia/Melbourne', 'Victoria (Melbourne)'],
      ['Australia/Brisbane', 'Queensland (Brisbane)'],
      ['Australia/Adelaide', 'Nam Úc (Adelaide)'],
      ['Australia/Darwin', 'Lãnh thổ Bắc Úc (Darwin)'],
      ['Australia/Perth', 'Tây Úc (Perth)'],
      ['Australia/Hobart', 'Tasmania (Hobart)'],
    ]],
    ['RU', 'Nga', [
      ['Europe/Moscow', 'Moskva, Saint Petersburg'],
      ['Europe/Kaliningrad', 'Kaliningrad'],
      ['Europe/Samara', 'Samara'],
      ['Asia/Yekaterinburg', 'Yekaterinburg'],
      ['Asia/Omsk', 'Omsk'],
      ['Asia/Novosibirsk', 'Novosibirsk'],
      ['Asia/Krasnoyarsk', 'Krasnoyarsk'],
      ['Asia/Irkutsk', 'Irkutsk'],
      ['Asia/Yakutsk', 'Yakutsk'],
      ['Asia/Vladivostok', 'Vladivostok'],
      ['Asia/Magadan', 'Magadan'],
      ['Asia/Kamchatka', 'Kamchatka'],
    ]],
    ['BR', 'Brasil', [
      ['America/Sao_Paulo', 'São Paulo, Rio de Janeiro, Brasília'],
      ['America/Manaus', 'Amazonas (Manaus)'],
      ['America/Fortaleza', 'Đông Bắc (Fortaleza, Recife)'],
      ['America/Cuiaba', 'Mato Grosso (Cuiabá)'],
      ['America/Rio_Branco', 'Acre (Rio Branco)'],
      ['America/Noronha', 'Fernando de Noronha'],
    ]],
    ['MX', 'Mexico', [
      ['America/Mexico_City', 'Thành phố Mexico'],
      ['America/Cancun', 'Quintana Roo (Cancún)'],
      ['America/Chihuahua', 'Chihuahua'],
      ['America/Hermosillo', 'Sonora'],
      ['America/Tijuana', 'Baja California (Tijuana)'],
    ]],
    ['ID', 'Indonesia', [
      ['Asia/Jakarta', 'Tây Indonesia (Jakarta, Sumatra)'],
      ['Asia/Makassar', 'Trung Indonesia (Bali, Sulawesi)'],
      ['Asia/Jayapura', 'Đông Indonesia (Papua)'],
    ]],
    ['NZ', 'New Zealand', [['Pacific/Auckland', '']]],
    ['LA', 'Lào', [['Asia/Vientiane', '']]],
    ['KH', 'Campuchia', [['Asia/Phnom_Penh', '']]],
    ['TH', 'Thái Lan', [['Asia/Bangkok', '']]],
    ['MM', 'Myanmar', [['Asia/Yangon', '']]],
    ['MY', 'Malaysia', [['Asia/Kuala_Lumpur', '']]],
    ['SG', 'Singapore', [['Asia/Singapore', '']]],
    ['PH', 'Philippines', [['Asia/Manila', '']]],
    ['BN', 'Brunei', [['Asia/Brunei', '']]],
    ['MN', 'Mông Cổ', [['Asia/Ulaanbaatar', '']]],
    ['IN', 'Ấn Độ', [['Asia/Kolkata', '']]],
    ['PK', 'Pakistan', [['Asia/Karachi', '']]],
    ['BD', 'Bangladesh', [['Asia/Dhaka', '']]],
    ['NP', 'Nepal', [['Asia/Kathmandu', '']]],
    ['LK', 'Sri Lanka', [['Asia/Colombo', '']]],
    ['AE', 'Các Tiểu vương quốc Ả Rập Thống nhất', [['Asia/Dubai', '']]],
    ['SA', 'Ả Rập Xê Út', [['Asia/Riyadh', '']]],
    ['QA', 'Qatar', [['Asia/Qatar', '']]],
    ['IL', 'Israel', [['Asia/Jerusalem', '']]],
    ['TR', 'Thổ Nhĩ Kỳ', [['Europe/Istanbul', '']]],
    ['GB', 'Anh', [['Europe/London', '']]],
    ['IE', 'Ireland', [['Europe/Dublin', '']]],
    ['FR', 'Pháp', [['Europe/Paris', '']]],
    ['DE', 'Đức', [['Europe/Berlin', '']]],
    ['NL', 'Hà Lan', [['Europe/Amsterdam', '']]],
    ['BE', 'Bỉ', [['Europe/Brussels', '']]],
    ['CH', 'Thụy Sĩ', [['Europe/Zurich', '']]],
    ['AT', 'Áo', [['Europe/Vienna', '']]],
    ['IT', 'Ý', [['Europe/Rome', '']]],
    ['ES', 'Tây Ban Nha', [['Europe/Madrid', '']]],
    ['PT', 'Bồ Đào Nha', [['Europe/Lisbon', '']]],
    ['SE', 'Thụy Điển', [['Europe/Stockholm', '']]],
    ['NO', 'Na Uy', [['Europe/Oslo', '']]],
    ['DK', 'Đan Mạch', [['Europe/Copenhagen', '']]],
    ['FI', 'Phần Lan', [['Europe/Helsinki', '']]],
    ['PL', 'Ba Lan', [['Europe/Warsaw', '']]],
    ['CZ', 'Séc', [['Europe/Prague', '']]],
    ['SK', 'Slovakia', [['Europe/Bratislava', '']]],
    ['HU', 'Hungary', [['Europe/Budapest', '']]],
    ['RO', 'Romania', [['Europe/Bucharest', '']]],
    ['BG', 'Bulgaria', [['Europe/Sofia', '']]],
    ['GR', 'Hy Lạp', [['Europe/Athens', '']]],
    ['UA', 'Ukraina', [['Europe/Kyiv', '']]],
    ['BY', 'Belarus', [['Europe/Minsk', '']]],
    ['KZ', 'Kazakhstan', [['Asia/Almaty', 'Almaty, Astana'], ['Asia/Aqtobe', 'Tây Kazakhstan (Aktobe)']]],
    ['ZA', 'Nam Phi', [['Africa/Johannesburg', '']]],
    ['EG', 'Ai Cập', [['Africa/Cairo', '']]],
    ['NG', 'Nigeria', [['Africa/Lagos', '']]],
    ['KE', 'Kenya', [['Africa/Nairobi', '']]],
    ['AR', 'Argentina', [['America/Argentina/Buenos_Aires', '']]],
    ['CL', 'Chile', [['America/Santiago', '']]],
    ['CO', 'Colombia', [['America/Bogota', '']]],
    ['PE', 'Peru', [['America/Lima', '']]],
    ['CU', 'Cuba', [['America/Havana', '']]],
    // Không có trong danh sách: chọn thẳng múi giờ IANA (danh sách đầy đủ của trình duyệt).
    ['XX', 'Nơi khác (chọn múi giờ)', null],
  ];

  // ── Hiển thị theo ngôn ngữ trang (i18n W26) — CHỈ để HIỂN THỊ ─────────────
  // GIÁ TRỊ gửi server (mã nước ISO, múi IANA) giữ nguyên; chỉ chữ người dùng NHÌN đổi.
  // Tên nước: Intl.DisplayNames của locale trang; thiếu Intl thì bảng tiếng Anh dưới đây; vi giữ tên Việt trong NUOC.
  var BCP47 = { en: 'en', ja: 'ja', ko: 'ko', 'zh-tw': 'zh-TW', 'zh-cn': 'zh-CN' };
  var EN_NAME = { CN: 'China', TW: 'Taiwan', HK: 'Hong Kong', MO: 'Macao', KR: 'South Korea', JP: 'Japan', US: 'United States', CA: 'Canada', AU: 'Australia', RU: 'Russia', BR: 'Brazil', MX: 'Mexico', ID: 'Indonesia', NZ: 'New Zealand', LA: 'Laos', KH: 'Cambodia', TH: 'Thailand', MM: 'Myanmar', MY: 'Malaysia', SG: 'Singapore', PH: 'Philippines', BN: 'Brunei', MN: 'Mongolia', IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', NP: 'Nepal', LK: 'Sri Lanka', AE: 'United Arab Emirates', SA: 'Saudi Arabia', QA: 'Qatar', IL: 'Israel', TR: 'Türkiye', GB: 'United Kingdom', IE: 'Ireland', FR: 'France', DE: 'Germany', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria', IT: 'Italy', ES: 'Spain', PT: 'Portugal', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', CZ: 'Czechia', SK: 'Slovakia', HU: 'Hungary', RO: 'Romania', BG: 'Bulgaria', GR: 'Greece', UA: 'Ukraine', BY: 'Belarus', KZ: 'Kazakhstan', ZA: 'South Africa', EG: 'Egypt', NG: 'Nigeria', KE: 'Kenya', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru', CU: 'Cuba', VN: 'Vietnam' };
  function _loc() { var I = root.I18n; return (I && I.locale) || 'vi'; }
  function _tv(key, vi) { var I = root.I18n; return I && I.tv ? I.tv(key, vi) : vi; }
  var _dn = {};
  /** Tên nước theo ngôn ngữ trang: tenNuoc('JP', 'Nhật Bản') → 日本 (ja) · Japan (en) · Nhật Bản (vi). */
  function tenNuoc(ma, vi) {
    var loc = _loc();
    if (loc === 'vi') return vi;
    if (ma === 'XX') return _tv('js.noisinh.noi-khac', vi);
    try {
      var d = _dn[loc] || (_dn[loc] = new Intl.DisplayNames([BCP47[loc] || 'en'], { type: 'region' }));
      var r = d.of(ma);
      if (r && r !== ma) return r;
    } catch (e) { /* không có Intl.DisplayNames ⇒ bảng */ }
    return EN_NAME[ma] || vi;
  }
  /** Nhãn vùng/múi của một nước (đã có trong NUOC bằng tiếng Việt) theo ngôn ngữ trang; khoá theo múi IANA. */
  function tenVung(tz, nhan) {
    if (!nhan || _loc() === 'vi') return nhan;
    return _tv('js.noisinh.vung-' + String(tz).toLowerCase().replace(/[^a-z0-9]+/g, '-'), nhan);
  }

  function lichCuaNoiSinh(ma) {
    return Object.prototype.hasOwnProperty.call(LICH_THEO_NUOC, ma) ? LICH_THEO_NUOC[ma] : LICH_MAC_DINH;
  }

  /** Các vùng/múi của một nước: [[tz, nhãn]…]. 'XX' → mọi múi IANA trình duyệt biết. */
  function vungCuaNuoc(ma) {
    for (var i = 0; i < NUOC.length; i++) {
      if (NUOC[i][0] !== ma) continue;
      if (NUOC[i][2]) return NUOC[i][2];
      var all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
      return all.map(function (z) { return [z, z.replace(/_/g, ' ')]; });
    }
    return [];
  }

  var _fmt = {};
  /** Offset (phút) của múi IANA `tz` tại thời điểm `ms` (UTC) — đọc tzdata qua Intl, gồm giờ mùa hè + LMT. */
  function offsetPhut(tz, ms) {
    var f = _fmt[tz] || (_fmt[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }));
    var p = {};
    f.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    var y = +p.year;
    // Năm < 100 thì Date.UTC tự cộng 1900 — ngoài tầm lịch âm (1900+) nên không gặp.
    var wall = Date.UTC(y, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((wall - Math.floor(ms / 1000) * 1000) / 60000);
  }

  /** Giờ đồng hồ tại `tz` → mốc UTC (ms). Giờ "không tồn tại" lúc chuyển giờ mùa hè lấy offset trước đó. */
  function wallToUtc(nam, thang, ngay, gio, phut, tz) {
    var guess = Date.UTC(nam, thang - 1, ngay, gio, phut);
    var o1 = offsetPhut(tz, guess - 0);
    var t = guess - o1 * 60000;
    var o2 = offsetPhut(tz, t);
    return o2 === o1 ? t : guess - o2 * 60000;
  }

  /**
   * Giờ sinh tại NƠI SINH → giờ dân sự CỦA LỊCH ÂM nơi đó.
   * @param b  { ngay, thang, nam, gio, phut } — giờ đồng hồ người dùng nhập
   * @param ma mã nước (ISO); @param tz múi IANA (bỏ trống ⇒ múi đầu tiên của nước)
   * @returns { ngay, thang, nam, gio, phut, lich } — đưa thẳng vào engine kèm `lich`
   */
  function quyDoi(b, ma, tz) {
    var lich = lichCuaNoiSinh(ma);
    var zone = tz || ((vungCuaNuoc(ma)[0] || [])[0]);
    if (!zone) throw new Error('NoiSinh.quyDoi: không biết múi giờ của nơi sinh ' + ma);
    var utc = wallToUtc(b.nam, b.thang, b.ngay, b.gio || 0, b.phut || 0, zone);
    var ymdUtc = function (ms) { var d = new Date(ms); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };
    var off;
    if (lich === 'vn') {
      var VT = root.VnTimezone || (typeof require === 'function' ? require('./vn-timezone.js') : null);
      if (!VT) throw new Error('NoiSinh.quyDoi: thiếu tools-shared/vn-timezone.js — nạp nó TRƯỚC file này.');
      var u = new Date(utc + 7 * 3600000); // ngày VN xấp xỉ để tra bảng lịch sử (đổi múi theo ngày)
      off = VT.getVnUtcOffset(u.getUTCDate(), u.getUTCMonth() + 1, u.getUTCFullYear());
    } else {
      off = GIO_LICH[lich](ymdUtc(utc + 480 * 60000));
    }
    var c = new Date(utc + off * 60000);
    return {
      ngay: c.getUTCDate(), thang: c.getUTCMonth() + 1, nam: c.getUTCFullYear(),
      gio: c.getUTCHours(), phut: c.getUTCMinutes(), lich: lich,
    };
  }

  var API = {
    LICH_MAC_DINH: LICH_MAC_DINH,
    LICH_THEO_NUOC: LICH_THEO_NUOC,
    NUOC: NUOC,
    GIO_LICH: GIO_LICH,
    lichCuaNoiSinh: lichCuaNoiSinh,
    vungCuaNuoc: vungCuaNuoc,
    tenNuoc: tenNuoc,
    tenVung: tenVung,
    offsetPhut: offsetPhut,
    quyDoi: quyDoi,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NoiSinh = API;
})(typeof window !== 'undefined' ? window : globalThis);
