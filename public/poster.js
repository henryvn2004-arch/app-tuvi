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
 * Dùng:
 *   Poster.download({ imageUrl, title, subtitle, quote }, 'ten-file.png')
 *   Poster.build(opts) -> Promise<Blob>
 *   Poster.pickQuote([...nguồn theo thứ tự ưu tiên]) -> string
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

  // ── dựng ảnh ─────────────────────────────────────────────────────────────
  function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    // Nạp sẵn đúng các face sẽ vẽ. Face nghiêng của Noto Serif có thể chưa từng
    // được trang nào dùng tới → không tải sẵn thì canvas lặng lẽ rơi về Georgia.
    var want = ['700 62px ' + SERIF, 'italic 400 37px ' + SERIF, '600 24px ' + SANS, '400 30px ' + SANS];
    return Promise.all(
      want.map(function (f) {
        return document.fonts.load(f).catch(function () {});
      })
    ).catch(function () {});
  }

  function drawPoster(ctx, img, seal, opts) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, W, H);

    // Ảnh chân dung. PHẢI clip: drawImage không tự cắt theo khung, ảnh dọc
    // 2:3 phủ đủ bề ngang 9:16 thì cao hơn IMG_H, không clip là nó tràn xuống
    // đè nền khối chữ — nền chữ đổi màu theo từng bức, có bức mất sạch tương phản.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, IMG_H);
    ctx.clip();
    // Neo mép TRÊN (0): nhân vật đội mũ quan/mũ giáp, cắt từ giữa là cụt mũ —
    // thứ nhìn ra ngay là hỏng. Phần dư cắt hết ở dưới, nơi chỉ có thân/nền.
    drawCover(ctx, img, 0, 0, W, IMG_H, 0);
    ctx.restore();

    // Dải chuyển từ ảnh xuống nền để chữ có chỗ đứng, không cắt ngang phũ phàng.
    var g = ctx.createLinearGradient(0, IMG_H - FADE, 0, IMG_H);
    g.addColorStop(0, 'rgba(6,26,46,0)');
    g.addColorStop(0.55, 'rgba(6,26,46,0.72)');
    g.addColorStop(1, NAVY);
    ctx.fillStyle = g;
    ctx.fillRect(0, IMG_H - FADE, W, FADE);

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
      // Tối đa 3 dòng: dòng thứ 4 sẽ đụng triện ở chân trang khi tiêu đề dài 2
      // dòng. QUOTE_MAX (155 ký tự) chọn để 3 dòng gần như luôn đủ chỗ.
      var qLines = clampLines(ctx, wrapAll(ctx, opts.quote, qw), 3, qw);
      var qTop = y + 64;
      ctx.fillStyle = 'rgba(201,168,76,0.55)';
      ctx.fillRect(PAD, qTop - 38, 4, qLines.length * 54 - 6);
      ctx.fillStyle = GOLD_SOFT;
      drawLines(ctx, qLines, qx, qTop, 54);
    }

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
  }

  function buildOnce(opts, imgSrc, cors) {
    return Promise.all([
      loadImage(imgSrc, cors),
      loadImage('/seal.webp', false).catch(function () {
        return null;
      }),
      ensureFonts(),
    ]).then(function (r) {
      var cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      var ctx = cv.getContext('2d');
      drawPoster(ctx, r[0], r[1], opts);
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

  function build(opts) {
    if (!opts || !opts.imageUrl) return Promise.reject(new Error('no_image'));
    return buildOnce(opts, opts.imageUrl, true).catch(function () {
      // Ảnh Supabase Storage bình thường CÓ CORS nên đường thẳng chạy được;
      // đây là lối thoát khi không (hoặc canvas vẫn tainted): đi vòng qua proxy
      // cùng-origin, lúc đó chắc chắn không tainted.
      return buildOnce(opts, '/api/portrait-image?u=' + encodeURIComponent(opts.imageUrl), false);
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

  window.Poster = {
    build: build,
    download: download,
    pickQuote: pickQuote,
    saveBlob: saveBlob,
    WIDTH: W,
    HEIGHT: H,
  };
})();
