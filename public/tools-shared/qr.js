// public/tools-shared/qr.js
// ============================================================
// Bộ mã hoá QR (byte mode · mức sửa lỗi M · version 1–10), vẽ thẳng trên
// canvas — 0 lượt mạng, không phụ thuộc dịch vụ QR ngoài.
//
// ⚠️ NGUỒN THỨ HAI của cùng một thuật toán — `public/poster.js` giữ bản gốc
// (đã verify khớp byte-for-byte với gói `qrcode` npm trên 420 chuỗi). File
// này tách riêng để `shell.js` nạp ĐỘNG lúc xuất PDF mà không phải kéo theo
// toàn bộ poster.js (canvas 9:16, font, v.v — không liên quan tới PDF).
// Nợ kỹ thuật đã ghi nhận: hai bản đang trùng nhau, chưa gộp về một nguồn vì
// đổi `import` của poster.js chạm 8 trang đang dùng nó cho tính năng khác
// (ảnh viral) — rủi ro không tương xứng với việc PDF cần thêm. Sửa công thức
// QR thì PHẢI sửa cả hai chỗ.
//
// window.QR.build(text) → { size, modules[][] } | null (chuỗi dài quá version 10)
// ============================================================
(function () {
  'use strict';
  var EXP = new Uint8Array(512),
    LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b) {
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
  }

  // [tổng codeword, ec/block, số block nhóm 1, data/block nhóm 1, số block nhóm 2, data/block nhóm 2]
  var VER = [
    null,
    [26, 10, 1, 16, 0, 0],
    [44, 16, 1, 28, 0, 0],
    [70, 26, 1, 44, 0, 0],
    [100, 18, 2, 32, 0, 0],
    [134, 24, 2, 43, 0, 0],
    [172, 16, 4, 27, 0, 0],
    [196, 18, 4, 31, 0, 0],
    [242, 22, 2, 38, 2, 39],
    [292, 22, 3, 36, 2, 37],
    [346, 26, 4, 43, 1, 44],
  ];
  var ALIGN = [
    null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  ];

  function bitLen(x) {
    var n = 0;
    while (x) {
      n++;
      x >>>= 1;
    }
    return n;
  }
  // Phần dư BCH — dùng cho cả format (15 bit) lẫn version (18 bit).
  function bch(val, poly, shift) {
    var d = val << shift,
      gLen = bitLen(poly);
    while (bitLen(d) >= gLen) d ^= poly << (bitLen(d) - gLen);
    return d;
  }

  function ecPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var q = [];
      for (var k = 0; k <= p.length; k++) q[k] = 0;
      for (var j = 0; j < p.length; j++) {
        q[j] ^= p[j];
        q[j + 1] ^= mul(p[j], EXP[i]);
      }
      p = q;
    }
    return p;
  }

  function ecBytes(data, n) {
    var g = ecPoly(n),
      res = [],
      i;
    for (i = 0; i < data.length + n; i++) res[i] = i < data.length ? data[i] : 0;
    for (i = 0; i < data.length; i++) {
      var f = res[i];
      if (!f) continue;
      for (var j = 0; j < g.length; j++) res[i + j] ^= mul(g[j], f);
    }
    return res.slice(data.length);
  }

  // UTF-8 qua encodeURIComponent — không cần TextEncoder (Safari cũ).
  function utf8(s) {
    var out = [],
      e = encodeURIComponent(String(s));
    for (var i = 0; i < e.length; i++) {
      if (e[i] === '%') {
        out.push(parseInt(e.substr(i + 1, 2), 16));
        i += 2;
      } else out.push(e.charCodeAt(i));
    }
    return out;
  }

  function maskAt(k, r, c) {
    switch (k) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r * c) % 3) + ((r + c) % 2)) % 2 === 0;
    }
  }

  function penalty(g, size) {
    var p = 0, i, j, run, dark = 0;
    for (i = 0; i < size; i++) {
      run = 1;
      for (j = 1; j < size; j++) {
        if (g[i][j] === g[i][j - 1]) run++;
        else {
          if (run >= 5) p += run - 2;
          run = 1;
        }
      }
      if (run >= 5) p += run - 2;
      run = 1;
      for (j = 1; j < size; j++) {
        if (g[j][i] === g[j - 1][i]) run++;
        else {
          if (run >= 5) p += run - 2;
          run = 1;
        }
      }
      if (run >= 5) p += run - 2;
    }
    for (i = 0; i < size - 1; i++)
      for (j = 0; j < size - 1; j++) {
        var s = g[i][j] + g[i][j + 1] + g[i + 1][j] + g[i + 1][j + 1];
        if (s === 0 || s === 4) p += 3;
      }
    // Mẫu tỉ lệ 1:1:3:1:1 kèm 4 module sáng — quét bằng cửa sổ trượt 11 bit.
    for (i = 0; i < size; i++) {
      var br = 0, bc = 0;
      for (j = 0; j < size; j++) {
        br = ((br << 1) & 0x7ff) | g[i][j];
        bc = ((bc << 1) & 0x7ff) | g[j][i];
        if (j >= 10) {
          if (br === 0x5d0 || br === 0x05d) p += 40;
          if (bc === 0x5d0 || bc === 0x05d) p += 40;
        }
      }
    }
    for (i = 0; i < size; i++) for (j = 0; j < size; j++) if (g[i][j]) dark++;
    p += Math.abs(Math.ceil((dark * 100) / (size * size) / 5) - 10) * 10;
    return p;
  }

  function writeFormat(g, fmt, size) {
    for (var i = 0; i < 15; i++) {
      var bit = (fmt >> i) & 1;
      // bản dọc (cột 8)
      if (i < 6) g[i][8] = bit;
      else if (i < 8) g[i + 1][8] = bit;
      else g[size - 15 + i][8] = bit;
      // bản ngang (hàng 8)
      if (i < 8) g[8][size - 1 - i] = bit;
      else if (i === 8) g[8][7] = bit;
      else g[8][14 - i] = bit;
    }
    g[size - 8][8] = 1; // module tối cố định
  }

  // Trả { size, modules[][] } hoặc null nếu chuỗi dài quá version 10.
  function build(text) {
    var bytes = utf8(text),
      v = 1,
      t = null,
      dataCw = 0;
    for (; v <= 10; v++) {
      t = VER[v];
      dataCw = t[2] * t[3] + t[4] * t[5];
      if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= dataCw * 8) break;
    }
    if (v > 10) return null;

    var bits = [];
    function put(val, n) {
      for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }
    put(4, 4); // chế độ byte
    put(bytes.length, v < 10 ? 8 : 16);
    for (var bi0 = 0; bi0 < bytes.length; bi0++) put(bytes[bi0], 8);
    var cap = dataCw * 8;
    for (var z = 0; z < 4 && bits.length < cap; z++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var pad = [0xec, 0x11],
      pi = 0;
    while (bits.length < cap) put(pad[pi++ % 2], 8);
    var cw = [];
    for (var b = 0; b < bits.length; b += 8) {
      var byteV = 0;
      for (var q = 0; q < 8; q++) byteV = (byteV << 1) | bits[b + q];
      cw.push(byteV);
    }

    // chia block → sinh EC → ĐAN XEN theo cột
    var blocks = [], ecb = [], off = 0, gi;
    for (gi = 0; gi < t[2]; gi++) { blocks.push(cw.slice(off, off + t[3])); off += t[3]; }
    for (gi = 0; gi < t[4]; gi++) { blocks.push(cw.slice(off, off + t[5])); off += t[5]; }
    for (gi = 0; gi < blocks.length; gi++) ecb.push(ecBytes(blocks[gi], t[1]));
    var maxD = Math.max(t[3], t[5]), out = [], c;
    for (c = 0; c < maxD; c++)
      for (gi = 0; gi < blocks.length; gi++) if (c < blocks[gi].length) out.push(blocks[gi][c]);
    for (c = 0; c < t[1]; c++) for (gi = 0; gi < ecb.length; gi++) out.push(ecb[gi][c]);

    // ── ma trận + hoa văn cố định ──
    var size = 17 + 4 * v, m = [], rsv = [], r;
    for (r = 0; r < size; r++) {
      m.push(new Array(size).fill(0));
      rsv.push(new Array(size).fill(0));
    }
    function setF(rr, cc, val) {
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) return;
      m[rr][cc] = val;
      rsv[rr][cc] = 1;
    }
    function finder(fr, fc) {
      for (var dr = -1; dr <= 7; dr++)
        for (var dc = -1; dc <= 7; dc++) {
          var on = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
            (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setF(fr + dr, fc + dc, on ? 1 : 0);
        }
    }
    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);
    for (var ti = 8; ti < size - 8; ti++) {
      setF(6, ti, ti % 2 === 0 ? 1 : 0);
      setF(ti, 6, ti % 2 === 0 ? 1 : 0);
    }
    var ac = ALIGN[v];
    for (var a1 = 0; a1 < ac.length; a1++)
      for (var a2 = 0; a2 < ac.length; a2++) {
        var ar = ac[a1], acx = ac[a2];
        // Bỏ 3 ô chồng lên finder — chồng vào là hỏng hoa văn định vị.
        if ((ar <= 8 && acx <= 8) || (ar <= 8 && acx >= size - 9) || (ar >= size - 9 && acx <= 8)) continue;
        for (var dr2 = -2; dr2 <= 2; dr2++)
          for (var dc2 = -2; dc2 <= 2; dc2++)
            setF(ar + dr2, acx + dc2, Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1 ? 1 : 0);
      }
    setF(size - 8, 8, 1);
    for (var f1 = 0; f1 <= 8; f1++) {
      if (f1 !== 6) { rsv[8][f1] = 1; rsv[f1][8] = 1; }
    }
    for (var f2 = 0; f2 < 8; f2++) {
      rsv[8][size - 1 - f2] = 1;
      rsv[size - 1 - f2][8] = 1;
    }
    if (v >= 7) {
      var vinfo = (v << 12) | bch(v, 0x1f25, 12);
      for (var i4 = 0; i4 < 18; i4++) {
        var vb = (vinfo >> i4) & 1;
        setF(Math.floor(i4 / 3), size - 11 + (i4 % 3), vb);
        setF(size - 11 + (i4 % 3), Math.floor(i4 / 3), vb);
      }
    }

    // ── rải dữ liệu theo đường zigzag từ góc phải dưới ──
    var bi = 0, up = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col = 5; // cột timing không mang dữ liệu
      for (var n = 0; n < size; n++) {
        var row = up ? size - 1 - n : n;
        for (var s2 = 0; s2 < 2; s2++) {
          var cc2 = col - s2;
          if (rsv[row][cc2]) continue;
          m[row][cc2] = bi < out.length * 8 ? (out[bi >> 3] >> (7 - (bi & 7))) & 1 : 0;
          bi++;
        }
      }
      up = !up;
    }

    // ── chọn mask có điểm phạt thấp nhất (chấm trên symbol ĐÃ ghi format) ──
    var best = null, bestP = Infinity;
    for (var k = 0; k < 8; k++) {
      var g = [];
      for (var r2 = 0; r2 < size; r2++) {
        g.push(m[r2].slice());
        for (var c3 = 0; c3 < size; c3++) if (!rsv[r2][c3] && maskAt(k, r2, c3)) g[r2][c3] ^= 1;
      }
      var data5 = (0 << 3) | k; // mức sửa lỗi M = 00
      writeFormat(g, (((data5 << 10) | bch(data5, 0x537, 10)) ^ 0x5412) >>> 0, size);
      var p = penalty(g, size);
      if (p < bestP) { bestP = p; best = g; }
    }
    return { size: size, modules: best };
  }

  // Vẽ QR vào ô vuông `box` tại (x,y) trên context canvas 2D — nền SÁNG bắt
  // buộc: máy quét đọc theo tương phản, vẽ module tối lên nền màu là mã hầu
  // như không bắt được.
  function draw(ctx, text, x, y, box) {
    var q = build(text);
    if (!q) return false;
    var quiet = 4, // vùng lặng 4 module — thiếu nó là nhiều máy không nhận mã
      total = q.size + quiet * 2,
      cell = Math.floor(box / total),
      d = cell * total,
      ox = x + Math.round((box - d) / 2),
      oy = y + Math.round((box - d) / 2);
    if (cell < 1) return false;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, box, box);
    ctx.fillStyle = '#06121F';
    for (var r = 0; r < q.size; r++)
      for (var c = 0; c < q.size; c++)
        if (q.modules[r][c]) ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
    return true;
  }

  window.QR = { build: build, draw: draw };
})();
