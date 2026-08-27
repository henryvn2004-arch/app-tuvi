/**
 * hook-facts.js — Tử Vi Minh Bảo
 * Hàm THUẦN suy fact hook từ dữ liệu engine đã tính sẵn (`ls` = kết quả
 * `anSaoLaSo()`/`computeLaso()`). Không đụng DOM, không gọi mạng, không tự
 * tính lại bất cứ điểm nào — chỉ ĐỌC và XẾP HẠNG cái engine đã chấm.
 *
 * QUY TẮC CỨNG (đúng `LASO_AUTHORITY_RULE` của repo): hàm ở đây không được
 * bịa hay ước lượng một con số nào. Thiếu dữ liệu (vd chưa có `census`) thì
 * trả `null` — phía gọi (`hook-layer.js`) tự ẩn khối tương ứng, KHÔNG hiện số
 * áng chừng.
 *
 * Test được thẳng bằng vitest trong `tuvi-engine/` vì chỉ nhận/trả object.
 */
window.HookFacts = (function () {
  'use strict';
  // Namespace theo HỌ engine — `tuvi` là họ đầu tiên (Pha 0-4 của workplan).
  // Họ khác (bazi, phong-thuy…) thêm `HookFacts.bazi = {...}` sau, KHÔNG đổi
  // tên các hàm đã có ở đây — tránh phải sửa lại mọi trang đã cắm rồi.

  // 6 chiều của `cungScores[cungTen]` — khoá field khớp THẲNG tên trong engine
  // (`thienVan, canCo, mayMan, phuTro, binhYen, benVung`), không đặt tên khác
  // để khỏi phải map hai lần. `tong` là điểm tổng riêng, KHÔNG phải trục thứ 7.
  var CUNG_DIM_LABELS = {
    thienVan: 'Thiên Văn', canCo: 'Căn Cơ', mayMan: 'May Mắn',
    phuTro: 'Phù Trợ', binhYen: 'Bình Yên', benVung: 'Bền Vững',
  };
  var CUNG_DIM_KEYS = ['thienVan', 'canCo', 'mayMan', 'phuTro', 'binhYen', 'benVung'];

  // Chỉ những đại vận ĐÃ được chấm (`scoring.tong` là số) — daiVans engine trả
  // có thể dài hơn tuổi thọ thường (>95t không chấm), lọc bỏ đúng bằng cách
  // đọc `scoring`, không đoán theo tuổi.
  function _scoredDaiVans(ls) {
    var arr = (ls && ls.daiVans) || [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var dv = arr[i];
      if (dv && dv.scoring && typeof dv.scoring.tong === 'number') out.push({ dv: dv, idx: i });
    }
    return out;
  }

  // Chặng HIỆN TẠI: `ls.daiVanHienTai` là CHÍNH đại vận object đó (không phải
  // index số — đã kiểm bằng dump thật, đoán nhầm ban đầu). Qua ranh giới JSON
  // (client nhận `ls` từ API bằng `fetch().json()`) thì object identity mất
  // sạch, `===` với phần tử trong `daiVans` luôn false — phải so THUỘC TÍNH
  // (`cungIdx`+`tuoiStart` định danh duy nhất một đại vận trong đời).
  function _currentIdx(ls) {
    var cur = ls && ls.daiVanHienTai;
    if (!cur) return null;
    var arr = (ls && ls.daiVans) || [];
    for (var i = 0; i < arr.length; i++) {
      var dv = arr[i];
      if (dv === cur || (dv && dv.tuoiStart === cur.tuoiStart && dv.cungIdx === cur.cungIdx)) return i;
    }
    return null;
  }

  function _tuoiNow(ls) {
    return typeof (ls && ls.tuoiXem) === 'number' ? ls.tuoiXem : null;
  }

  /** Mảng cho `HookCharts.lifeArc` — mỗi đại vận đã chấm, đánh dấu chặng hiện tại. */
  function daiVanSegments(ls) {
    var cur = _currentIdx(ls);
    return _scoredDaiVans(ls).map(function (e) {
      return {
        tuoiStart: e.dv.tuoiStart, tuoiEnd: e.dv.tuoiEnd,
        tong: e.dv.scoring.tong, flag: e.dv.scoring.flag,
        current: cur != null && e.idx === cur,
      };
    });
  }

  /** Đại vận điểm CAO NHẤT — "đỉnh đời". `null` nếu không có đại vận nào được chấm. */
  function daiVanDinh(ls) {
    var scored = _scoredDaiVans(ls);
    if (!scored.length) return null;
    var best = scored.reduce(function (a, b) { return b.dv.scoring.tong > a.dv.scoring.tong ? b : a; });
    return _daiVanFact(ls, best, 'good', 'Chặng mạnh nhất đời bạn');
  }

  /** Đại vận điểm THẤP NHẤT — "đáy đời". */
  function daiVanDay(ls) {
    var scored = _scoredDaiVans(ls);
    if (!scored.length) return null;
    var worst = scored.reduce(function (a, b) { return b.dv.scoring.tong < a.dv.scoring.tong ? b : a; });
    return _daiVanFact(ls, worst, 'bad', 'Chặng cần chú ý nhất đời bạn');
  }

  function _daiVanFact(ls, entry, tone, title) {
    var dv = entry.dv, cur = _currentIdx(ls), now = _tuoiNow(ls);
    var timing; // KHÔNG kết thúc bằng dấu chấm — `body` tự thêm đúng một dấu ở cuối
    if (cur != null && entry.idx === cur) timing = 'Bạn đang ở chặng này';
    else if (now != null && dv.tuoiStart > now) timing = 'Còn ' + (dv.tuoiStart - now) + ' năm nữa mới tới';
    else if (now != null && dv.tuoiEnd < now) timing = 'Đã qua ' + (now - dv.tuoiEnd) + ' năm';
    else timing = '';
    return {
      kind: tone === 'good' ? 'daivan-dinh' : 'daivan-day',
      tone: tone,
      title: title,
      body: 'Chặng ' + dv.tuoiStart + '–' + dv.tuoiEnd + ' tuổi chấm ' + dv.scoring.tong.toFixed(1) + '/10' +
        (timing ? ' — ' + timing : '') + '.',
      value: dv.scoring.tong, flag: dv.scoring.flag,
      tuoiStart: dv.tuoiStart, tuoiEnd: dv.tuoiEnd,
      source: 'engine · daiVans[' + entry.idx + '].scoring.tong',
    };
  }

  /** 6 trục cho `HookCharts.hexRadar`, đọc `cungScores[cungTen]`. `null` nếu cung không tồn tại. */
  function hexDimsForCung(ls, cungTen) {
    var sc = ls && ls.cungScores && ls.cungScores[cungTen];
    if (!sc) return null;
    return CUNG_DIM_KEYS.map(function (k) {
      return { key: k, label: CUNG_DIM_LABELS[k], value: typeof sc[k] === 'number' ? sc[k] : 0 };
    });
  }

  /** Cung điểm tổng THẤP nhất trong 12 cung — "cung yếu nhất". */
  function cungYeuNhat(ls) {
    return _cungExtreme(ls, false);
  }
  /** Cung điểm tổng CAO nhất — "cung mạnh nhất". */
  function cungManhNhat(ls) {
    return _cungExtreme(ls, true);
  }
  function _cungExtreme(ls, wantMax) {
    var m = ls && ls.cungScores;
    if (!m) return null;
    var bestName = null, bestVal = null;
    for (var name in m) {
      if (!Object.prototype.hasOwnProperty.call(m, name)) continue;
      var v = m[name] && m[name].tong;
      if (typeof v !== 'number') continue;
      if (bestVal == null || (wantMax ? v > bestVal : v < bestVal)) { bestVal = v; bestName = name; }
    }
    if (bestName == null) return null;
    return {
      kind: wantMax ? 'cung-manh' : 'cung-yeu',
      tone: wantMax ? 'good' : 'bad',
      title: (wantMax ? 'Cung mạnh nhất: ' : 'Cung cần bồi thêm: ') + bestName,
      body: 'Cung ' + bestName + ' chấm ' + bestVal.toFixed(1) + '/10 trên 6 chiều đánh giá.',
      value: bestVal, cungTen: bestName,
      source: 'engine · cungScores[\'' + bestName + '\'].tong',
    };
  }

  /**
   * Cách cục HIẾM nhất trong lá số, tra theo `census.cachCuc` — kết quả quét
   * hết 518.400 lá số (`public/laso-census.json`, do
   * `scripts/build-laso-census.mjs` sinh ra, xem Pha 1 workplan). `census` là
   * NGUYÊN file đó — `{ generatedAt, totalCharts, daiVan, cachCuc }` — cùng
   * một object truyền cho `percentileOfDaiVan` bên dưới, không phải map con
   * `cachCuc` tách riêng (hai hàm dùng CHUNG một biến `census` ở call site,
   * lệch shape giữa hai hàm là tự bẫy chính mình). Thiếu census hoặc không
   * khớp cách cục nào thì trả `null` — KHÔNG suy diễn tỉ lệ tạm.
   */
  function cachCucHiem(ls, census) {
    var list = (ls && ls.cachCuc) || [];
    var table = census && census.cachCuc;
    if (!list.length || !table) return null;
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var stat = table[c.ten];
      if (!stat || typeof stat.pct !== 'number') continue;
      if (!best || stat.pct < best.stat.pct) best = { c: c, stat: stat };
    }
    if (!best) return null;
    return {
      kind: 'cach-cuc-hiem', tone: 'neutral',
      title: best.c.ten,
      body: (best.c.moTa || '') + (best.c.cung ? ' — tại cung ' + best.c.cung + '.' : ''),
      pct: best.stat.pct, oneIn: best.stat.oneIn,
      caption: best.stat.oneIn ? '1 trong ' + best.stat.oneIn + ' lá số' : (best.stat.pct + '%'),
      source: 'laso-census.json · đếm hết 518.400 lá số',
    };
  }

  /**
   * Bách phân vị của một đại vận trong bảng tổng điều tra, tra theo
   * `census.daiVan[slotIndex]` (mảng 101 mốc phân vị p0..p100, xem
   * `scripts/build-laso-census.mjs`). `slotIndex` là vị trí đại vận trong đời
   * (0 = 6–15t, 1 = 16–25t, …) — KHÔNG dùng index thô của `ls.daiVans` vì
   * mảng đó còn kèm cả chặng >95 tuổi chưa được chấm.
   */
  function percentileOfDaiVan(entry, census, slotIndex) {
    if (!entry || !census || !census.daiVan || !census.daiVan[slotIndex]) return null;
    var buckets = census.daiVan[slotIndex]; // mảng điểm đã sort tăng dần, đại diện phân vị
    var v = entry.value;
    var below = 0;
    for (var i = 0; i < buckets.length; i++) { if (buckets[i] <= v) below++; else break; }
    var pct = Math.round((below / buckets.length) * 100);
    return { percentile: pct, value: v, caption: 'cao hơn ' + pct + '% lá số khác' };
  }

  /**
   * Gói tiện: 3 fact mặc định cho một trang tổng quan (đỉnh, đáy, cung yếu).
   * Cách cục hiếm KHÔNG nằm trong gói này vì cần `census` — trang tự thêm
   * bằng `cachCucHiem(ls, census)` khi bảng đã sẵn sàng (xem Pha 1).
   */
  function top3(ls) {
    return [daiVanDinh(ls), daiVanDay(ls), cungYeuNhat(ls)].filter(Boolean);
  }

  var tuvi = {
    CUNG_DIM_LABELS: CUNG_DIM_LABELS,
    daiVanSegments: daiVanSegments,
    daiVanDinh: daiVanDinh,
    daiVanDay: daiVanDay,
    hexDimsForCung: hexDimsForCung,
    cungYeuNhat: cungYeuNhat,
    cungManhNhat: cungManhNhat,
    cachCucHiem: cachCucHiem,
    percentileOfDaiVan: percentileOfDaiVan,
    top3: top3,
  };
  return { tuvi: tuvi };
})();
