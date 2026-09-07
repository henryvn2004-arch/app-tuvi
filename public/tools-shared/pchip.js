/**
 * pchip.js — Tử Vi Minh Bảo
 * Nội suy PCHIP (Piecewise Cubic Hermite, đơn điệu theo Fritsch-Carlson) từ vài
 * mốc điểm rời rạc (vd: điểm giữa mỗi đại vận) ra điểm ƯỚC TÍNH của từng năm.
 *
 * Vì sao KHÔNG dùng spline Catmull-Rom (chart.js `tension`) cho việc này: spline
 * thường có thể VỌT ra ngoài khoảng [min,max] của 2 mốc kề — một đoạn dốc đứng
 * (vd 6.5 → 3.4) dễ cho ra số âm hoặc vượt quá mốc cao hơn ở giữa đoạn, sai bản
 * chất "điểm/10". PCHIP đơn điệu từng đoạn: giá trị nội suy luôn nằm trong
 * khoảng 2 mốc kề, và tại một mốc mà 2 độ dốc hai bên trái dấu (đỉnh/đáy) thì tự
 * đặt đạo hàm = 0 — đúng hình chóp mượt chứ không đâm xuyên qua.
 *
 * Thuần toán, không phụ thuộc Chart.js — dùng lại được cho MỌI tool có chart vẽ
 * qua vài mốc rời rạc (đại vận Tử Vi, đại vận Bát Tự...), không chỉ đại vận.
 */
window.Pchip = (function () {
  'use strict';

  // Đạo hàm tại từng mốc (Fritsch-Carlson) — xs phải tăng dần, cùng độ dài ys.
  function slopes(xs, ys) {
    var n = xs.length;
    if (n < 2) return new Array(n).fill(0);
    var d = new Array(n - 1);
    for (var i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    var m = new Array(n);
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (var k = 1; k < n - 1; k++) {
      if (d[k - 1] === 0 || d[k] === 0 || (d[k - 1] > 0) !== (d[k] > 0)) {
        m[k] = 0; // đỉnh hoặc đáy — bằng phẳng tại mốc, không vọt qua
      } else {
        m[k] = (2 * d[k - 1] * d[k]) / (d[k - 1] + d[k]); // trung bình điều hoà có trọng số
      }
    }
    return m;
  }

  // Giá trị nội suy tại x bất kỳ. Ngoài [xs[0], xs[n-1]] thì giữ phẳng bằng mốc biên.
  function evalAt(xs, ys, ms, x) {
    var n = xs.length;
    if (n === 0) return null;
    if (n === 1 || x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    var i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    var h = xs[i + 1] - xs[i];
    var t = (x - xs[i]) / h;
    var t2 = t * t, t3 = t2 * t;
    var h00 = 2 * t3 - 3 * t2 + 1;
    var h10 = t3 - 2 * t2 + t;
    var h01 = -2 * t3 + 3 * t2;
    var h11 = t3 - t2;
    return h00 * ys[i] + h10 * h * ms[i] + h01 * ys[i + 1] + h11 * h * ms[i + 1];
  }

  /**
   * points: [{x,y}, ...] đã sort x tăng dần, x không trùng nhau.
   * opts.step: khoảng cách trục x giữa 2 điểm sinh ra (mặc định 1 = mỗi năm một điểm).
   * opts.round: số chữ số thập phân làm tròn y (mặc định 2, null = không làm tròn).
   * Trả mảng dày [{x,y}, ...] phủ từ x nhỏ nhất tới x lớn nhất, LUÔN giữ đúng
   * 2 mốc gốc đầu/cuối dù step không chia hết khoảng.
   */
  function pchipSeries(points, opts) {
    opts = opts || {};
    var step = opts.step || 1;
    var round = opts.round === undefined ? 2 : opts.round;
    if (!points || points.length === 0) return [];
    if (points.length < 2) return [{ x: points[0].x, y: points[0].y }];
    var xs = points.map(function (p) { return p.x; });
    var ys = points.map(function (p) { return p.y; });
    var ms = slopes(xs, ys);
    var out = [];
    var x0 = Math.ceil(xs[0] / step) * step;
    var x1 = xs[xs.length - 1];
    for (var x = x0; x <= x1 + 1e-9; x += step) {
      var y = evalAt(xs, ys, ms, x);
      out.push({
        x: Math.round(x * 1e6) / 1e6,
        y: round === null ? y : Math.round(y * Math.pow(10, round)) / Math.pow(10, round),
      });
    }
    if (out.length === 0 || out[0].x !== xs[0]) out.unshift({ x: xs[0], y: ys[0] });
    if (out[out.length - 1].x !== xs[xs.length - 1]) out.push({ x: xs[xs.length - 1], y: ys[xs.length - 1] });
    return out;
  }

  return { slopes: slopes, evalAt: evalAt, pchipSeries: pchipSeries };
})();
