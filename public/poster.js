/* poster.js — dựng ảnh 9:16 (1080×1920) để người dùng đăng Story/TikTok.
 *
 * VÌ SAO CÓ FILE NÀY (V3 track Viral Loop): người Việt chia sẻ ẢNH lên Story/
 * TikTok nhiều hơn chia sẻ LINK. Trước đây nút "Tải Ảnh" trả về đúng file thô
 * model sinh ra (1024×1536, trần trụi) — ảnh lan đi mà không mang một dấu hiệu
 * nào dẫn ngược về site. Bản này ghép thêm: 1 câu đắt nhất trong kết quả +
 * triện + tuviminhbao.com, và cắt về đúng khung 9:16 mà Story/Reels/TikTok dùng.
 *
 * KHÔNG TỐN THÊM TIỀN MODEL — toàn bộ dựng bằng <canvas> ở máy người dùng,
 * không gọi thêm lượt sinh ảnh nào.
 *
 * HAI CHẾ ĐỘ CHO VÙNG NGHỆ THUẬT (phần trên, cao IMG_H):
 *   `imageUrl` — dán một bức ảnh vào (2 tool chân dung).
 *   `draw`     — GỌI LẠI hàm của trang để nó tự vẽ (tool bàn/quẻ).
 *
 * Vì sao có chế độ `draw`: ảnh do model sinh tốn 1.658đ/lượt và đang bị cầu dao
 * `viral.free_gen_daily_cap` phát khẩu phần — tức đúng lúc lan mạnh nhất là lúc
 * cửa đóng. Bàn Kỳ Môn, quẻ Mai Hoa, bàn Lục Hào thì vẽ được bằng chính canvas
 * này: 0đ, không cầu dao, chia sẻ vô hạn. Trước bản này KHÔNG có đường nào biến
 * một biểu đồ thành ảnh tải về được — nó đẹp trên màn hình rồi dừng ở đó.
 *
 * Dùng:
 *   Poster.download({ imageUrl, title, subtitle, quote, qrUrl }, 'ten-file.png')
 *   Poster.download({ draw: fn, title, subtitle, quote, qrUrl }, 'ten-file.png')
 *   Poster.build(opts) -> Promise<Blob>
 *   Poster.pickQuote([...nguồn theo thứ tự ưu tiên]) -> string
 *   Poster.downloadDay({ verdict, title, subtitle, quote, warn[], me, rows[][], qrUrl }, 'ten.png')
 *
 * `qrUrl` (chỉ chế độ vận ngày): vẽ mã QR ở chân trang. Đây là đường DUY NHẤT
 * đo được lượt chia sẻ bằng ẢNH — PNG không mang link bấm được, còn metadata
 * PNG thì mọi nền tảng đều bóc sạch lúc nén lại. Gắn sẵn utm + mã giới thiệu
 * vào URL trước khi truyền vào.
 *
 * Hợp đồng của `draw`: `draw(ctx, { x, y, w, h })` — vẽ ĐỒNG BỘ trong khung đó.
 * Nền navy đã tô sẵn, ctx đã `clip()` vào khung nên vẽ tràn cũng không phá phần
 * chữ bên dưới. Ném lỗi trong `draw` sẽ làm hỏng cả lượt dựng (đúng ý muốn: thà
 * rơi về nhánh dự phòng của trang còn hơn tải về một tấm ảnh trống).
 */
(function () {
  'use strict';

  var W = 1080,
    H = 1920;
  var IMG_H = 1240; // vùng ảnh chân dung, phần còn lại là khối chữ
  var FADE = 400; // dải chuyển ảnh → nền, nằm trong IMG_H
  var NAVY = '#061A2E';
  var GOLD = '#C9A84C';
  var GOLD_SOFT = '#E4D5A8';
  var PAD = 80;

  var SERIF = '"Noto Serif", Georgia, "Times New Roman", serif';
  var SANS = '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif';

  // ── nạp ảnh ──────────────────────────────────────────────────────────────
  function loadImage(src, cors) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      // crossOrigin CHỈ đặt cho ảnh khác origin: đặt bừa cho ảnh cùng origin
      // không sai nhưng thêm một đường thất bại không cần thiết.
      if (cors) img.crossOrigin = 'anonymous';
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('img_load_failed'));
      };
      img.src = src;
    });
  }

  // ── chữ ──────────────────────────────────────────────────────────────────
  function wrapAll(ctx, text, maxW) {
    var words = String(text == null ? '' : text)
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    var lines = [],
      cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (!cur || ctx.measureText(t).width <= maxW) cur = t;
      else {
        lines.push(cur);
        cur = words[i];
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function clampLines(ctx, lines, maxLines, maxW) {
    if (lines.length <= maxLines) return lines;
    var out = lines.slice(0, maxLines);
    var last = out[maxLines - 1];
    while (last && ctx.measureText(last + '…').width > maxW) {
      var cut = last.replace(/\s*\S+$/, '');
      if (cut === last) break;
      last = cut;
    }
    out[maxLines - 1] = last + '…';
    return out;
  }

  function drawLines(ctx, lines, x, y, lineH) {
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * lineH);
    return y + lines.length * lineH;
  }

  // Giãn chữ thủ công thay vì ctx.letterSpacing — thuộc tính đó Safari/Firefox
  // mới hỗ trợ gần đây, mà dòng nhãn thương hiệu thì phải ra đúng ở MỌI máy.
  function drawTracked(ctx, text, x, y, extra) {
    var s = String(text || '');
    var cx = x;
    for (var i = 0; i < s.length; i++) {
      ctx.fillText(s[i], cx, y);
      cx += ctx.measureText(s[i]).width + extra;
    }
    return cx - extra;
  }

  function drawCover(ctx, img, x, y, w, h, anchorY) {
    var s = Math.max(w / img.width, h / img.height);
    var dw = img.width * s,
      dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * anchorY, dw, dh);
  }

  // ── chọn "1 câu đắt nhất" ────────────────────────────────────────────────
  // CỐ Ý KHÔNG gọi LLM: thêm một lượt model cho mỗi lần bấm Tải Ảnh là chi phí
  // thật, trong khi thứ cần chỉ là một câu đọc lọt tai. Luật: lấy câu TRỌN VẸN
  // đầu tiên có độ dài vừa khung (quá ngắn thì cụt lủn, quá dài thì tràn 4 dòng),
  // ưu tiên theo thứ tự nguồn mà trang truyền vào.
  var QUOTE_MIN = 45,
    QUOTE_MAX = 155,
    QUOTE_IDEAL = 95;

  function sentences(text) {
    var s = String(text == null ? '' : text)
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return (s.match(/[^.!?…]+[.!?…]*/g) || []).map(function (x) {
      return x.trim();
    });
  }

  function pickQuote(sources) {
    var list = Array.isArray(sources) ? sources : [sources];
    for (var i = 0; i < list.length; i++) {
      var best = '',
        bestScore = Infinity;
      var ss = sentences(list[i]);
      for (var j = 0; j < ss.length; j++) {
        var len = ss[j].length;
        if (len < QUOTE_MIN || len > QUOTE_MAX) continue;
        var score = Math.abs(len - QUOTE_IDEAL);
        if (score < bestScore) {
          bestScore = score;
          best = ss[j];
        }
      }
      if (best) return best;
    }
    // Không nguồn nào có câu vừa khung → cắt gọn nguồn đầu tiên còn chữ.
    for (var k = 0; k < list.length; k++) {
      var raw = sentences(list[k]).join(' ');
      if (raw) return raw.length > QUOTE_MAX ? raw.slice(0, QUOTE_MAX).replace(/\s*\S+$/, '') + '…' : raw;
    }
    return '';
  }

  // ── QR (byte mode · mức sửa lỗi M · version 1–10) ────────────────────────
  // VÌ SAO TỰ CÀI: một file PNG KHÔNG mang được link bấm được, và metadata PNG
  // (tEXt/iTXt) thì Facebook/Instagram/TikTok đều nén lại và bóc sạch — nhúng
  // link vào đó là nhúng vào chỗ không ai đọc. QR là thứ DUY NHẤT trong tấm ảnh
  // mà người xem chạm tới được, nên cũng là đường DUY NHẤT đo được lượt ảnh
  // chia sẻ đẻ ra người thật.
  //
  // Vẽ THẲNG trên canvas: 0 lượt mạng, 0đ, không phụ thuộc dịch vụ QR ngoài
  // (dịch vụ ngoài chết là ảnh mất mã, mà lúc đó không ai hay).
  //
  // Verify: ma trận module KHỚP BYTE-FOR-BYTE với gói `qrcode` (npm) trên 420
  // chuỗi trải version 1→10, gồm cả chuỗi có dấu tiếng Việt (nhánh UTF-8).
  var QR = (function () {
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

    return { build: build };
  })();

  // Địa chỉ mã QR — MỘT nguồn cho mọi trang, đừng chép tay ở từng trang.
  // Trang /app có Shell → đi qua `Shell.viralUrl` để mã mang luôn `ref=` của
  // người tải ảnh (ai quét rồi đăng ký thì người chia sẻ được thưởng). Trang
  // standalone không có Shell → vẫn ra link chạy được và vẫn đo được bằng UTM,
  // chỉ là không quy về ai.
  function qrLink(toolId, path) {
    var base = 'https://tuviminhbao.com' + (path || '/app');
    try {
      if (window.Shell && window.Shell.viralUrl)
        return window.Shell.viralUrl(base, toolId, { source: 'poster', medium: 'image' });
    } catch (e) {
      /* rơi xuống bản không có mã giới thiệu */
    }
    return (
      base + '?utm_source=poster&utm_medium=image' + (toolId ? '&utm_campaign=' + encodeURIComponent(toolId) : '')
    );
  }

  // Ô QR ở chân trang poster CHÂN DUNG (poster vận ngày dùng cỡ riêng, to hơn,
  // vì nó không phải chừa chỗ cho vùng ảnh).
  // ⚠️ Cỡ ô quyết định BỀ DÀY MỘT MODULE, mà đó mới là thứ máy quét đọc được:
  // URL của tool chân dung dài hơn (đường dẫn + campaign + mã giới thiệu) nên
  // rơi vào version cao hơn, tức nhiều module hơn trên cùng bề ngang. Ở ô 160
  // mỗi module chỉ còn 2px — nền tảng nén lại một lượt là nhoè. 190 giữ được
  // 3px/module cho cả ca URL dài nhất.
  var QR_BOX = 190,
    QR_TOP = 1678;

  // Vẽ QR vào ô vuông `box` — nền SÁNG bắt buộc: máy quét đọc theo tương phản,
  // vẽ module tối lên nền navy là mã hầu như không bắt được.
  function drawQR(ctx, text, x, y, box) {
    var q = QR.build(text);
    if (!q) return false;
    var quiet = 4, // vùng lặng 4 module — thiếu nó là nhiều máy không nhận mã
      total = q.size + quiet * 2,
      cell = Math.floor(box / total),
      draw = cell * total,
      ox = x + Math.round((box - draw) / 2),
      oy = y + Math.round((box - draw) / 2);
    if (cell < 1) return false;
    ctx.fillStyle = '#FFFFFF';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, box, box, 12);
      ctx.fill();
    } else ctx.fillRect(x, y, box, box);
    ctx.fillStyle = '#06121F';
    for (var r = 0; r < q.size; r++)
      for (var c = 0; c < q.size; c++)
        if (q.modules[r][c]) ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
    return true;
  }

  // ── dựng ảnh ─────────────────────────────────────────────────────────────
  function ensureFonts(extra) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    // Nạp sẵn đúng các face sẽ vẽ. Face nghiêng của Noto Serif có thể chưa từng
    // được trang nào dùng tới → không tải sẵn thì canvas lặng lẽ rơi về Georgia.
    var want = ['700 62px ' + SERIF, 'italic 400 37px ' + SERIF, '600 24px ' + SANS, '400 30px ' + SANS];
    // Tool biểu đồ vẽ ở cỡ chữ riêng (tên quái to, nhãn cung nhỏ) — face nào
    // trang chưa từng dùng thì cũng phải nạp sẵn, cùng lý do với face nghiêng.
    if (Array.isArray(extra)) want = want.concat(extra);
    return Promise.all(
      want.map(function (f) {
        return document.fonts.load(f).catch(function () {});
      })
    ).catch(function () {});
  }

  function drawPoster(ctx, paintArt, seal, opts) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, H);

    // PHẢI clip cả hai chế độ. Ảnh: drawImage không tự cắt theo khung, ảnh dọc
    // 2:3 phủ đủ bề ngang 9:16 thì cao hơn IMG_H, không clip là nó tràn xuống
    // đè nền khối chữ — nền chữ đổi màu theo từng bức, có bức mất sạch tương phản.
    // Hàm vẽ của trang: clip là hàng rào để một lỗi toạ độ bên đó không bôi lên
    // phần chữ của poster.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, IMG_H);
    ctx.clip();
    paintArt(ctx, { x: 0, y: 0, w: W, h: IMG_H });
    ctx.restore();

    // Dải chuyển từ ảnh xuống nền để chữ có chỗ đứng, không cắt ngang phũ phàng.
    // CHỈ cho chế độ ảnh: hàm vẽ đã đứng trên chính nền navy này nên không có
    // mép nào để làm mềm, phủ gradient lên chỉ làm tối mất đáy bàn/quẻ.
    if (opts.fade !== false && !opts.draw) {
      var g = ctx.createLinearGradient(0, IMG_H - FADE, 0, IMG_H);
      g.addColorStop(0, 'rgba(6,26,46,0)');
      g.addColorStop(0.55, 'rgba(6,26,46,0.72)');
      g.addColorStop(1, NAVY);
      ctx.fillStyle = g;
      ctx.fillRect(0, IMG_H - FADE, W, FADE);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // Nhãn thương hiệu
    var y = 1310;
    ctx.fillStyle = GOLD;
    ctx.fillRect(PAD, y - 9, 56, 3);
    ctx.font = '600 24px ' + SANS;
    drawTracked(ctx, 'TỬ VI MINH BẢO', PAD + 78, y, 5);

    // Tiêu đề
    var maxW = W - PAD * 2;
    ctx.font = '700 62px ' + SERIF;
    ctx.fillStyle = '#FFFFFF';
    var titleLines = clampLines(ctx, wrapAll(ctx, opts.title, maxW), 2, maxW);
    y = drawLines(ctx, titleLines, PAD, 1394, 76) - 76;

    // Dòng phụ (danh xưng / nền văn minh / người vợ–chồng)
    if (opts.subtitle) {
      ctx.font = '400 30px ' + SANS;
      ctx.fillStyle = 'rgba(255,255,255,0.60)';
      y += 50;
      drawLines(ctx, clampLines(ctx, wrapAll(ctx, opts.subtitle, maxW), 1, maxW), PAD, y, 40);
    }

    // Câu trích
    if (opts.quote) {
      var qx = PAD + 34,
        qw = W - qx - PAD;
      ctx.font = 'italic 400 37px ' + SERIF;
      var qTop = y + 64;
      // Tối đa 3 dòng: dòng thứ 4 sẽ đụng triện ở chân trang khi tiêu đề dài 2
      // dòng. QUOTE_MAX (155 ký tự) chọn để 3 dòng gần như luôn đủ chỗ.
      // Có mã QR thì hạ trần theo chỗ còn lại — ca xấu nhất (tiêu đề 2 dòng +
      // dòng phụ + trích 3 dòng) đẩy dòng cuối xuống 1692, tức đè lên mã.
      var qMax = 3;
      if (opts.qrUrl) qMax = Math.max(1, Math.min(3, Math.floor((QR_TOP - 12 - qTop) / 54) + 1));
      var qLines = clampLines(ctx, wrapAll(ctx, opts.quote, qw), qMax, qw);
      ctx.fillStyle = 'rgba(201,168,76,0.55)';
      ctx.fillRect(PAD, qTop - 38, 4, qLines.length * 54 - 6);
      ctx.fillStyle = GOLD_SOFT;
      drawLines(ctx, qLines, qx, qTop, 54);
    }

    // Mã QR — đường DUY NHẤT một tấm ảnh dẫn ngược được về site và ĐO được.
    // Vẽ trước chân trang để biết còn bao nhiêu bề ngang cho dòng chữ.
    var hasQR = opts.qrUrl ? drawQR(ctx, opts.qrUrl, W - PAD - QR_BOX, QR_TOP, QR_BOX) : false;

    // Chân trang: triện + tên miền. Neo CỨNG ở đáy, không trôi theo độ dài chữ
    // trên — người ta nhìn góc dưới để biết ảnh từ đâu ra.
    var fy = 1802;
    var tx = PAD;
    if (seal) {
      var sh = 84,
        sw = (seal.width / seal.height) * sh;
      ctx.drawImage(seal, PAD, fy - 58, sw, sh);
      tx = PAD + sw + 22;
    }
    ctx.font = '600 32px ' + SANS;
    ctx.fillStyle = GOLD;
    ctx.fillText('tuviminhbao.com', tx, fy);
    if (hasQR) {
      ctx.font = '400 25px ' + SANS;
      ctx.fillStyle = 'rgba(255,255,255,0.46)';
      ctx.fillText(opts.qrCaption || 'Quét mã để tự xem', PAD, fy + 50);
    }
  }

  // ── Poster "Vận ngày" — KHÔNG có vùng nghệ thuật ─────────────────────────
  // Thẻ vận ngày không sinh ra bức ảnh nào VÀ cũng không có biểu đồ để vẽ, nên
  // bản này bày chữ trên TOÀN khung thay vì chia đôi ảnh/chữ. Dùng lại nguyên
  // bộ helper chữ + triện + chân trang để mọi ảnh ra ngoài đời cùng một nhà.
  //
  // ⚠️ CỐ Ý KHÔNG đi qua `build({draw})`: chế độ `draw` giữ nguyên bố cục
  // ảnh-trên-chữ-dưới (vùng nghệ thuật cao IMG_H rồi mới tới tiêu đề/câu
  // trích), hợp cho bàn Kỳ Môn / quẻ Mai Hoa. Vận ngày thì phần trên đó rỗng —
  // dùng `draw` là tự chừa 1240px trống rồi nhồi hết chữ xuống 1/3 dưới.
  var VERDICT_COLOR = { tốt: '#4C9A6A', xấu: '#C0563F', bình: '#8A7A45' };

  function drawDayPoster(ctx, seal, o) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, H);

    // Vầng sáng góc trên — cùng ngôn ngữ với thẻ trên web (.today-card .glow).
    var glow = ctx.createRadialGradient(W - 120, 90, 0, W - 120, 90, 620);
    glow.addColorStop(0, 'rgba(201,168,76,0.20)');
    glow.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 760);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    var maxW = W - PAD * 2;

    // Nhãn thương hiệu
    ctx.fillStyle = GOLD;
    ctx.fillRect(PAD, 223, 56, 3);
    ctx.font = '600 24px ' + SANS;
    drawTracked(ctx, 'TỬ VI MINH BẢO', PAD + 78, 232, 5);

    // Huy hiệu tốt/bình/xấu — đọc lướt 1 giây, giống hệt vai trò trên web.
    ctx.font = '600 30px ' + SANS;
    var label = o.verdictLabel || '';
    var bw = ctx.measureText(label).width + 56;
    ctx.fillStyle = VERDICT_COLOR[o.verdict] || VERDICT_COLOR['bình'];
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(PAD, 280, bw, 60, 30);
      ctx.fill();
    } else ctx.fillRect(PAD, 280, bw, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, PAD + 28, 320);

    /* ── Bố cục TRÔI (đo trước, vẽ sau) ────────────────────────────────────
       Bản đầu neo cứng từng toạ độ rồi căn giữa mỗi khối dữ kiện, nên hôm nào
       ít nội dung là hở một khoảng trống to đúng giữa ảnh, hôm nào nhiều thì
       đè lên chân trang. Nay: đo chiều cao TỪNG khối trước, khối nào không còn
       chỗ thì BỎ theo thứ tự ưu tiên (dữ kiện nên/kiêng/giờ giữ tới cùng),
       phần dư còn lại chia đều vào các khe — không bao giờ tràn, cũng không
       bao giờ hở một mảng trống. */
    var TOP = 400, // dưới huy hiệu
      BOT = 1596; // trên chân trang (chân trang + QR bắt đầu từ 1630)
    var blocks = [],
      total = 0;

    function push(h, fn) {
      blocks.push({ h: h, fn: fn });
      total += h;
    }
    function fits(h) {
      return total + h + blocks.length * 18 <= BOT - TOP;
    }

    // Ngày + can chi (BẮT BUỘC — không bao giờ bỏ)
    ctx.font = '700 68px ' + SERIF;
    var tLines = clampLines(ctx, wrapAll(ctx, o.title, maxW), 2, maxW);
    push(tLines.length * 82, function (y) {
      ctx.font = '700 68px ' + SERIF;
      ctx.fillStyle = '#FFFFFF';
      drawLines(ctx, tLines, PAD, y + 62, 82);
    });

    // Dòng dữ kiện tra cứu: âm lịch · hành · trực · sao · tú · màu · tài thần
    if (o.subtitle) {
      ctx.font = '400 30px ' + SANS;
      var sLines = clampLines(ctx, wrapAll(ctx, o.subtitle, maxW), 2, maxW);
      if (fits(sLines.length * 40 + 12))
        push(sLines.length * 40 + 12, function (y) {
          ctx.font = '400 30px ' + SANS;
          ctx.fillStyle = 'rgba(255,255,255,0.62)';
          drawLines(ctx, sLines, PAD, y + 40, 40);
        });
    }

    // Câu chốt của ngày
    if (o.quote) {
      ctx.font = 'italic 400 35px ' + SERIF;
      var qx = PAD + 34,
        qw = W - qx - PAD;
      var qLines = clampLines(ctx, wrapAll(ctx, o.quote, qw), 2, qw);
      if (fits(qLines.length * 50 + 26))
        push(qLines.length * 50 + 26, function (y) {
          ctx.font = 'italic 400 35px ' + SERIF;
          ctx.fillStyle = 'rgba(201,168,76,0.55)';
          ctx.fillRect(PAD, y + 12, 4, qLines.length * 50 - 4);
          ctx.fillStyle = GOLD_SOFT;
          drawLines(ctx, qLines, qx, y + 50, 50);
        });
    }

    // Khung cảnh báo (xung tuổi / ngày kỵ) — mục gọi tên trực tiếp một nhóm
    // người, nên nó phải theo tấm ảnh ra ngoài chứ không nằm lại trên web.
    var warn = (o.warn || []).filter(Boolean).join('  ·  ');
    if (warn) {
      ctx.font = '400 28px ' + SANS;
      var wLines = clampLines(ctx, wrapAll(ctx, warn, maxW - 96), 2, maxW - 96);
      var wh = wLines.length * 38 + 48;
      if (fits(wh))
        push(wh, function (y) {
          panel(ctx, y, wh, 'rgba(192,86,63,0.18)', 'rgba(192,86,63,0.42)');
          ctx.font = '600 30px ' + SANS;
          ctx.fillStyle = '#E6A08C';
          ctx.fillText('⚠', PAD + 26, y + 24 + 28);
          ctx.font = '400 28px ' + SANS;
          ctx.fillStyle = '#FFD9CF';
          drawLines(ctx, wLines, PAD + 72, y + 24 + 28, 38);
        });
    }

    // Khung "Vận riêng của bạn" — vế DUY NHẤT khiến tấm ảnh là của người này
    // chứ không phải tờ lịch bloc ai cũng có. Không có lá số thì không có khung
    // (cố ý: đừng lấp bằng câu chung chung).
    if (o.me) {
      ctx.font = '400 29px ' + SANS;
      var mLines = clampLines(ctx, wrapAll(ctx, o.me, maxW - 60), 3, maxW - 60);
      var mh = mLines.length * 42 + 78;
      if (fits(mh))
        push(mh, function (y) {
          panel(ctx, y, mh, 'rgba(201,168,76,0.10)', 'rgba(201,168,76,0.28)');
          ctx.font = '700 22px ' + SANS;
          ctx.fillStyle = GOLD;
          drawTracked(ctx, 'VẬN RIÊNG CỦA BẠN', PAD + 30, y + 44, 3);
          ctx.font = '400 29px ' + SANS;
          ctx.fillStyle = 'rgba(255,255,255,0.90)';
          drawLines(ctx, mLines, PAD + 30, y + 88, 42);
        });
    }

    // Dữ kiện nên / kiêng / giờ tốt — mỗi dòng một nhãn nhỏ + nội dung.
    var rows = (o.rows || []).filter(function (r) {
      return r && r[1];
    });
    for (var i = 0; i < rows.length; i++) {
      ctx.font = '400 33px ' + SANS;
      var raw = wrapAll(ctx, rows[i][1], maxW);
      // Cho xuống 2 dòng khi CÒN CHỖ, ép 1 dòng khi chật. Ép cứng 1 dòng thì
      // dòng "Giờ tốt" (4 khung giờ kèm việc nên làm) bị cắt mất đuôi — mà đó
      // là dữ kiện dùng được nhất trong cả thẻ.
      var n = raw.length >= 2 && fits(30 + 2 * 42 + 26) ? 2 : 1;
      if (!fits(30 + n * 42 + 26)) break;
      (function (row, lines) {
        push(30 + lines.length * 42 + 26, function (y) {
          ctx.font = '600 22px ' + SANS;
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          drawTracked(ctx, String(row[0]).toUpperCase(), PAD, y + 22, 3);
          ctx.font = '400 33px ' + SANS;
          ctx.fillStyle = '#FFFFFF';
          drawLines(ctx, lines, PAD, y + 72, 42);
        });
      })(rows[i], clampLines(ctx, raw, n, maxW));
    }

    // Chia phần dư vào các khe, trần 34px/khe để bố cục không loãng ra.
    var gaps = Math.max(1, blocks.length - 1);
    var gap = Math.min(34, Math.max(14, (BOT - TOP - total) / gaps));
    var cy = TOP;
    for (var b = 0; b < blocks.length; b++) {
      blocks[b].fn(cy);
      cy += blocks[b].h + gap;
    }

    // ── Chân trang: triện + tên miền bên trái, QR bên phải ──
    var qrBox = 208,
      qrX = W - PAD - qrBox,
      qrY = 1630;
    var hasQR = o.qrUrl ? drawQR(ctx, o.qrUrl, qrX, qrY, qrBox) : false;
    var fy = hasQR ? 1730 : 1802;
    var tx = PAD;
    if (seal) {
      var sh = 84,
        sw = (seal.width / seal.height) * sh;
      ctx.drawImage(seal, PAD, fy - 58, sw, sh);
      tx = PAD + sw + 22;
    }
    ctx.font = '600 32px ' + SANS;
    ctx.fillStyle = GOLD;
    ctx.fillText('tuviminhbao.com', tx, fy);
    if (hasQR) {
      ctx.font = '400 25px ' + SANS;
      ctx.fillStyle = 'rgba(255,255,255,0.46)';
      ctx.fillText(o.qrCaption || 'Quét mã để xem vận ngày của bạn', PAD, fy + 56);
    }
  }

  // Khung nền bo góc cho hai khối cảnh báo / vận riêng.
  function panel(ctx, y, h, fill, stroke) {
    var x = PAD,
      w = W - PAD * 2;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 14);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
  }

  function buildDay(opts) {
    var o = opts || {};
    return Promise.all([
      loadImage('/seal.webp', false).catch(function () {
        return null;
      }),
      ensureFonts(opts.fonts),
    ]).then(function (r) {
      var cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      drawDayPoster(cv.getContext('2d'), r[0], o);
      return new Promise(function (resolve, reject) {
        try {
          cv.toBlob(function (b) {
            b ? resolve(b) : reject(new Error('toBlob_null'));
          }, 'image/png');
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  function toBlob(opts, paintArt) {
    return Promise.all([
      loadImage('/seal.webp', false).catch(function () {
        return null;
      }),
      ensureFonts(opts.fonts),
    ]).then(function (r) {
      var cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      var ctx = cv.getContext('2d');
      drawPoster(ctx, paintArt, r[0], opts);
      return new Promise(function (resolve, reject) {
        // toBlob ném SecurityError nếu canvas bị "tainted" (ảnh khác origin nạp
        // mà thiếu header CORS) — nuốt lỗi ở đây thì nút Tải Ảnh im ru, nên để
        // nó vỡ ra ngoài cho build() đi đường vòng qua proxy.
        try {
          cv.toBlob(function (b) {
            b ? resolve(b) : reject(new Error('toBlob_null'));
          }, 'image/png');
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  // Chế độ ẢNH: nạp bức ảnh rồi phủ `cover` vào khung.
  function buildFromImage(opts, imgSrc, cors) {
    return loadImage(imgSrc, cors).then(function (img) {
      return toBlob(opts, function (ctx, box) {
        // Neo mép TRÊN (0): nhân vật đội mũ quan/mũ giáp, cắt từ giữa là cụt mũ —
        // thứ nhìn ra ngay là hỏng. Phần dư cắt hết ở dưới, nơi chỉ có thân/nền.
        drawCover(ctx, img, box.x, box.y, box.w, box.h, 0);
      });
    });
  }

  function build(opts) {
    if (!opts) return Promise.reject(new Error('no_opts'));
    // Chế độ VẼ: không chạm mạng, nên cũng không có nhánh dự phòng CORS nào.
    if (typeof opts.draw === 'function') return toBlob(opts, opts.draw);
    if (!opts.imageUrl) return Promise.reject(new Error('no_image'));
    return buildFromImage(opts, opts.imageUrl, true).catch(function () {
      // Ảnh Supabase Storage bình thường CÓ CORS nên đường thẳng chạy được;
      // đây là lối thoát khi không (hoặc canvas vẫn tainted): đi vòng qua proxy
      // cùng-origin, lúc đó chắc chắn không tainted.
      return buildFromImage(opts, '/api/portrait-image?u=' + encodeURIComponent(opts.imageUrl), false);
    });
  }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'tuviminhbao.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 4000);
  }

  function download(opts, filename) {
    return build(opts).then(function (b) {
      saveBlob(b, filename);
      return b;
    });
  }

  function downloadDay(opts, filename) {
    return buildDay(opts).then(function (b) {
      saveBlob(b, filename);
      return b;
    });
  }

  window.Poster = {
    build: build,
    download: download,
    buildDay: buildDay,
    downloadDay: downloadDay,
    pickQuote: pickQuote,
    qrLink: qrLink,
    saveBlob: saveBlob,
    // Mở ra để test đối chiếu ma trận QR với thư viện chuẩn — KHÔNG dùng ở trang.
    qrMatrix: QR.build,
    WIDTH: W,
    HEIGHT: H,
    // Bảng màu/chữ CỦA CHÍNH poster, mở ra để hàm `draw` của trang vẽ cùng tông.
    // Không mở thì mỗi tool tự chép mã màu, rồi navy của bàn quẻ lệch navy của
    // khối chữ ngay trong cùng một tấm ảnh.
    THEME: { NAVY: NAVY, GOLD: GOLD, GOLD_SOFT: GOLD_SOFT, SERIF: SERIF, SANS: SANS },
  };
})();
