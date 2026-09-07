/**
 * daivan-chart.js — Tử Vi Minh Bảo
 * Dựng config Chart.js cho MỌI chart "9 đại vận — điểm số" của bộ tool tử vi
 * (Chu Trình Cuộc Đời, Luận Giải, Vận Hạn 12 Tháng Tới qua luan-giai-core.js;
 * Bát Tự qua bat-tu-core.js; Xem Tuổi Vợ Chồng / Xem Tuổi Làm Ăn qua
 * renderDvOverlay; tool Đại Vận độc lập) — MỘT nguồn, không chép tay Chart.js
 * config sang từng trang (xem CLAUDE.md "Engine là nguồn số duy nhất").
 *
 * Trước đây mỗi trang tự vẽ line chart 9 điểm categorical rồi để chart.js
 * spline (`tension`) nối — spline đó có thể vọt ra ngoài [min,max] 2 mốc kề.
 * Ở đây: 2 dataset chồng lên nhau, chia sẻ TRỤC X TUYẾN TÍNH theo tuổi thật
 * (không phải category rời rạc — an toàn cả khi đại vận đầu/cuối không tròn
 * 10 năm):
 *   - "curve": điểm/NĂM nội suy bằng pchip.js (đơn điệu, không vọt), vẽ đường
 *     mượt liền mạch, không chấm — đúng cái user hỏi "biết điểm từng năm".
 *   - "markers": 9 chấm to đúng tại điểm/đại-vận THẬT do engine chấm, giữ
 *     nguyên tooltip chi tiết (cung, sao...) như trước.
 * Phụ thuộc `window.Pchip` (pchip.js) — phải nạp TRƯỚC file này.
 */
window.DaiVanChart = (function () {
  'use strict';

  function midAge(dv) { return (dv.tuoiStart + dv.tuoiEnd) / 2; }

  function defaultGetScore(dv) {
    if (dv && dv.scoring && typeof dv.scoring.tong === 'number') return dv.scoring.tong;
    if (typeof dv?.score === 'number') return dv.score;
    return null;
  }

  // daiVans -> { markers:[{x,y,dv,idx}], curve:[{x,y}] } — dùng chung cho 1 và 2 chuỗi.
  function buildSeries(daiVans, getScore) {
    var markers = [];
    (daiVans || []).forEach(function (dv, i) {
      var y = getScore(dv, i);
      if (typeof y === 'number' && !isNaN(y) && dv && dv.tuoiStart != null && dv.tuoiEnd != null) {
        markers.push({ x: midAge(dv), y: Math.round(y * 100) / 100, dv: dv, idx: i });
      }
    });
    var curve = window.Pchip
      ? window.Pchip.pchipSeries(markers.map(function (m) { return { x: m.x, y: m.y }; }), { step: 1 })
      : markers.map(function (m) { return { x: m.x, y: m.y }; });
    return { markers: markers, curve: curve };
  }

  /**
   * 1 chuỗi (đang dùng ở luan-giai-core.js, bat-tu-core.js, tools/dai-van.html).
   * opts: getScore(dv,i), lineColor, fillColor, markerColor(dv,i)|string,
   *       activeColor, isCurrent(dv,i), tooltipExtra(dv,i)->string[],
   *       title, titleColor, xTitle, yTitle, maintainAspectRatio.
   */
  function buildSingle(daiVans, opts) {
    opts = opts || {};
    var getScore = opts.getScore || defaultGetScore;
    var series = buildSeries(daiVans, getScore);
    var markers = series.markers, curve = series.curve;
    var lineColor = opts.lineColor || '#2F5BEA';
    var fillColor = opts.fillColor || 'rgba(20,85,164,0.08)';
    var markerColorFn;
    if (typeof opts.markerColor === 'function') markerColorFn = opts.markerColor;
    else if (typeof opts.markerColor === 'string') markerColorFn = function () { return opts.markerColor; };
    else markerColorFn = function (dv) { var s = getScore(dv); return s >= 7 ? '#1FA3D6' : s >= 5 ? '#1A3A5C' : '#C0392B'; };
    var activeColor = opts.activeColor || '#C0392B';
    var isCurrent = opts.isCurrent || function () { return false; };
    var tooltipExtra = opts.tooltipExtra || function () { return []; };

    return {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Điểm ước tính theo năm',
            data: curve,
            borderColor: lineColor,
            backgroundColor: fillColor,
            fill: true,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 3,
            borderWidth: 2,
            order: 2,
          },
          {
            label: 'Điểm đại vận',
            data: markers.map(function (m) { return { x: m.x, y: m.y }; }),
            showLine: false,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: markers.map(function (m) { return isCurrent(m.dv, m.idx) ? activeColor : markerColorFn(m.dv, m.idx); }),
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: opts.maintainAspectRatio !== undefined ? opts.maintainAspectRatio : true,
        interaction: { mode: 'nearest', intersect: true },
        scales: {
          y: Object.assign(
            { min: 0, max: 10, ticks: { stepSize: 2, font: { size: 11 } } },
            opts.yTitle ? { title: { display: true, text: opts.yTitle } } : {}
          ),
          x: Object.assign(
            {
              type: 'linear',
              min: markers.length ? markers[0].x - 5 : undefined,
              max: markers.length ? markers[markers.length - 1].x + 5 : undefined,
              ticks: { stepSize: 10, font: { size: opts.xTickSize || 10 }, callback: function (v) { return v + 't'; } },
            },
            opts.xTitle ? { title: { display: true, text: opts.xTitle } } : {}
          ),
        },
        plugins: {
          legend: { display: false },
          title: opts.title
            ? { display: true, text: opts.title, font: { size: 15, weight: 'bold' }, color: opts.titleColor || '#061A2E' }
            : { display: false },
          tooltip: {
            callbacks: {
              title: function (items) {
                var item = items[0];
                if (item.datasetIndex === 1) {
                  var m = markers[item.dataIndex];
                  return 'ĐV' + (m.idx + 1) + ' (' + m.dv.tuoiStart + '-' + m.dv.tuoiEnd + 't)';
                }
                return 'Tuổi ' + Math.round(item.parsed.x);
              },
              label: function (item) {
                if (item.datasetIndex === 1) {
                  var m = markers[item.dataIndex];
                  return ['Điểm: ' + m.y + '/10'].concat(tooltipExtra(m.dv, m.idx));
                }
                return 'Điểm ước tính (nội suy): ' + item.parsed.y.toFixed(1) + '/10';
              },
            },
          },
        },
      },
    };
  }

  /**
   * 2 chuỗi đối chiếu (Xem Tuổi Vợ Chồng, Xem Tuổi Làm Ăn) — mỗi người 1 đường
   * cong nội suy (không chấm) + 1 lớp chấm đại vận thật, tô 2 màu theo CSS var
   * đang dùng sẵn ở 2 trang đó (--color-a / --color-b).
   */
  function buildOverlay(daiVansA, daiVansB, opts) {
    opts = opts || {};
    var getScore = opts.getScore || function (dv) { return dv && dv.scoring ? dv.scoring.tong : 5; };
    var sA = buildSeries(daiVansA, getScore);
    var sB = buildSeries(daiVansB, getScore);
    var colorA = opts.colorA || 'var(--color-a)';
    var colorB = opts.colorB || 'var(--color-b)';
    var nameA = opts.nameA || 'A';
    var nameB = opts.nameB || 'B';
    var allX = sA.markers.concat(sB.markers).map(function (m) { return m.x; });

    return {
      type: 'line',
      data: {
        datasets: [
          { label: nameA + ' (nội suy)', data: sA.curve, borderColor: colorA, backgroundColor: 'transparent', tension: 0, pointRadius: 0, borderWidth: 2, order: 2 },
          { label: nameB + ' (nội suy)', data: sB.curve, borderColor: colorB, backgroundColor: 'transparent', tension: 0, pointRadius: 0, borderWidth: 2, order: 2 },
          { label: nameA, data: sA.markers.map(function (m) { return { x: m.x, y: m.y }; }), showLine: false, pointRadius: 5, pointBackgroundColor: colorA, order: 1 },
          { label: nameB, data: sB.markers.map(function (m) { return { x: m.x, y: m.y }; }), showLine: false, pointRadius: 5, pointBackgroundColor: colorB, order: 1 },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: 'nearest', intersect: true },
        plugins: {
          legend: { display: true, labels: { filter: function (item) { return !/\(nội suy\)$/.test(item.text); } } },
          title: { display: true, text: opts.title || 'Vận Trình Toàn Đời — Đối Chiếu', font: { size: 13, weight: 'bold' } },
          tooltip: {
            callbacks: {
              label: function (item) {
                var isCurve = /\(nội suy\)$/.test(item.dataset.label);
                var nm = item.dataset.label.replace(' (nội suy)', '');
                return nm + ': ' + item.parsed.y.toFixed(1) + '/10' + (isCurve ? ' (ước tính)' : '');
              },
            },
          },
        },
        scales: {
          y: { min: 0, max: 10 },
          x: {
            type: 'linear',
            min: allX.length ? Math.min.apply(null, allX) - 5 : undefined,
            max: allX.length ? Math.max.apply(null, allX) + 5 : undefined,
            ticks: { stepSize: 10, callback: function (v) { return v + 't'; } },
          },
        },
      },
    };
  }

  return { buildSingle: buildSingle, buildOverlay: buildOverlay, buildSeries: buildSeries };
})();
