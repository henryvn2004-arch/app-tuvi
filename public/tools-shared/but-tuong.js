/* tools-shared/but-tuong.js — Module DÙNG CHUNG tool Bút Tướng (xem chữ ký).
   Nguồn DUY NHẤT cho /tools/but-tuong-ai.html + /app/but-tuong (app-but-tuong.html).
   Xem cổ pháp + xuất xứ từng công thức ở docs/COPHAP-BUT-TUONG.md — ĐỪNG sửa
   ngưỡng/hệ số ở đây mà không cập nhật file đó.

   window.BuTuongTool = {
     analyzeStrokes(strokeSets) → { truc, nguHanh, tongDiem, doOnDinh, goiY, docTrangThai }
     analyzeImageData(imageData) → { truc (chỉ cot/nhuc/the), nguHanh, tongDiem, ... , thieu:[...] }
     classifyThe(angleDeg), TRUC_META, NGU_HANH_META, railData(result)
   }

   🔑 CHỦ Ý THIẾT KẾ: mọi phép đo ở đây chạy TRÊN TRÌNH DUYỆT của người dùng.
   Toạ độ nét / pixel ảnh KHÔNG rời máy — trang gọi module này rồi chỉ gửi
   OBJECT KẾT QUẢ (số + nhãn) lên server để LLM diễn giải. Xem lý do ở
   docs/COPHAP-BUT-TUONG.md §5 (chữ ký là dữ liệu có hiệu lực pháp lý).

   Sáu trục theo 蘇軾《論書》: "書必有神、氣、骨、肉、血,五者闕一,不為成書也"
   (chữ phải có thần, khí, cốt, nhục, huyết — thiếu một thì không thành chữ),
   cộng thêm 勢 (thế — xu hướng đường chân chữ) theo 筆勢 cổ pháp thư pháp.
   Engine CHỈ đo — không tự phán "tốt/xấu" bằng lời, đó là việc của LLM ở tầng
   luận giải (`app/api/but-tuong/route.js`), engine chỉ trả SỐ + nhãn ngắn. */
(function (root) {
  'use strict';

  // ── Hình học cơ bản ───────────────────────────────────────────────────
  function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

  function strokeLength(stroke) {
    let L = 0;
    for (let i = 1; i < stroke.length; i++) L += dist(stroke[i - 1], stroke[i]);
    return L;
  }

  function totalLength(strokes) { return strokes.reduce((s, st) => s + strokeLength(st), 0); }

  function boundingBox(strokes) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const st of strokes) for (const p of st) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1, w: 1, h: 1, diag: 1 };
    const w = Math.max(1e-6, maxX - minX), h = Math.max(1e-6, maxY - minY);
    return { minX, minY, maxX, maxY, w, h, diag: Math.hypot(w, h) };
  }

  // Hồi quy tuyến tính y~x, trọng số theo độ dài đoạn (đoạn dài ảnh hưởng
  // nhiều hơn tới "thế" tổng thể — đúng trực giác thư pháp: một nét dài đi
  // xuống nặng hơn một chấm nhỏ đi lên).
  function weightedLinReg(points) {
    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    for (const p of points) {
      const w = p.w || 1;
      sw += w; swx += w * p.x; swy += w * p.y;
      swxx += w * p.x * p.x; swxy += w * p.x * p.y;
    }
    if (sw < 1e-9) return { slope: 0, intercept: 0 };
    const denom = sw * swxx - swx * swx;
    if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: swy / sw };
    const slope = (sw * swxy - swx * swy) / denom;
    const intercept = (swy - slope * swx) / sw;
    return { slope, intercept };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }

  // ── 勢 Thế — xu hướng đường chân chữ ─────────────────────────────────
  // Toạ độ canvas: y tăng xuống dưới ⇒ slope ÂM = đi LÊN (thượng thế).
  // Góc lý tưởng theo thư pháp cổ: hơi hất lên (~6°) — "khí thế đi lên".
  const THE_IDEAL_DEG = -6;

  function classifyThe(angleDeg) {
    if (angleDeg <= -3) return { key: 'thuong', label: 'Thượng thế (đi lên)' };
    if (angleDeg >= 3) return { key: 'ha', label: 'Hạ thế (đi xuống)' };
    return { key: 'binh', label: 'Bình thế (ngang)' };
  }

  function scoreThe(angleDeg) {
    const d = Math.abs(angleDeg - THE_IDEAL_DEG);
    return clamp(round1(100 - d * 2.2), 5, 100);
  }

  // ── Ngũ hành nét — phân loại từng đoạn theo hướng + độ cong ──────────
  // Quyết định theo thứ tự: hất nhọn (Hỏa) → khép vòng (Kim) → ngang phẳng
  // (Thổ) → dựng đứng (Mộc) → còn lại là cong lượn liền (Thủy, mặc định).
  const HANH_ORDER = ['hoa', 'kim', 'tho', 'moc', 'thuy'];
  const NGU_HANH_META = {
    hoa: { ten: 'Hỏa', net: 'nét hất nhọn, đổi hướng gấp', mau: '#c0392b' },
    kim: { ten: 'Kim', net: 'nét khép vòng, móc tròn', mau: '#b8860b' },
    tho: { ten: 'Thổ', net: 'nét ngang, vuông, chậm', mau: '#8d6e3a' },
    moc: { ten: 'Mộc', net: 'nét dựng đứng, thẳng', mau: '#2e7d32' },
    thuy: { ten: 'Thủy', net: 'nét cong lượn liền mạch', mau: '#1565c0' },
  };

  function classifySegmentHanh(seg, sharpTurn, inLoop) {
    if (sharpTurn) return 'hoa';
    if (inLoop) return 'kim';
    const abs = Math.abs(seg.angleDeg);
    // Ngang: gần 0°/180°. Dựng: gần 90°/-90°. Ngưỡng 22.5° chia đều 4 góc phần tư.
    const nearHoriz = abs <= 22.5 || abs >= 157.5;
    const nearVert = Math.abs(abs - 90) <= 22.5;
    if (nearHoriz && seg.curvature < 0.35) return 'tho';
    if (nearVert && seg.curvature < 0.35) return 'moc';
    return 'thuy';
  }

  // Dựng danh sách đoạn (segment) với góc + độ cong cục bộ + đánh dấu
  // "sharpTurn" (nét hất) và "inLoop" (đang trong một vòng khép kín) cho
  // TOÀN BỘ nét vẽ. Dùng chung cho cot/nhuc/huyet/nguHanh để khỏi lặp code.
  function buildSegments(strokes) {
    const segs = [];
    for (const stroke of strokes) {
      // Phát hiện vòng khép: điểm sau quay lại gần một điểm trước đó (trong
      // cùng nét) trong khi đã đi được một quãng đủ dài — đúng nghĩa "khép".
      const loopFlags = new Array(stroke.length).fill(false);
      const bb = boundingBox([stroke]);
      const loopRadius = Math.max(2, bb.diag * 0.06);
      let cum = 0;
      const cumAt = [0];
      for (let i = 1; i < stroke.length; i++) { cum += dist(stroke[i - 1], stroke[i]); cumAt.push(cum); }
      for (let i = 0; i < stroke.length; i++) {
        for (let j = i + 1; j < stroke.length; j++) {
          if (cumAt[j] - cumAt[i] < loopRadius * 3) continue; // phải đi đủ xa mới tính là "khép", không phải run tay
          if (dist(stroke[i], stroke[j]) <= loopRadius) {
            for (let k = i; k <= j; k++) loopFlags[k] = true;
            break;
          }
        }
      }

      let prevAngle = null;
      for (let i = 1; i < stroke.length; i++) {
        const a = stroke[i - 1], b = stroke[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) continue;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * 180 / Math.PI;
        let turn = 0;
        if (prevAngle != null) {
          turn = Math.abs(angleDeg - prevAngle);
          if (turn > 180) turn = 360 - turn;
        }
        prevAngle = angleDeg;
        segs.push({
          len, angleDeg, turnDeg: turn,
          curvature: clamp(turn / 90, 0, 1),
          sharp: turn >= 55,
          inLoop: loopFlags[i - 1] || loopFlags[i],
          t0: a.t, t1: b.t, p0: a.p, p1: b.p,
        });
      }
    }
    return segs;
  }

  function nguHanhFromSegments(segs) {
    const totals = { hoa: 0, kim: 0, tho: 0, moc: 0, thuy: 0 };
    let sum = 0;
    for (const s of segs) {
      const hanh = classifySegmentHanh(s, s.sharp, s.inLoop);
      totals[hanh] += s.len; sum += s.len;
    }
    if (sum < 1e-6) return { hoa: 20, kim: 20, tho: 20, moc: 20, thuy: 20 };
    const pct = {};
    let acc = 0;
    HANH_ORDER.forEach((k, i) => {
      if (i === HANH_ORDER.length - 1) { pct[k] = round1(100 - acc); return; }
      const v = round1((totals[k] / sum) * 100);
      pct[k] = v; acc += v;
    });
    return pct;
  }

  // ── 6 trục — mô tả + nguồn cổ pháp, dùng để render UI + prompt LLM ────
  const TRUC_META = {
    than: { ten: 'Thần', han: '神', ynghia: 'sinh khí, sự nhất quán của nét bút' },
    khi: { ten: 'Khí', han: '氣', ynghia: 'mạch bút liền lạc, ít ngắt quãng' },
    cot: { ten: 'Cốt', han: '骨', ynghia: 'khung xương, độ dứt khoát của nét' },
    nhuc: { ten: 'Nhục', han: '肉', ynghia: 'độ đầy đặn, lực nét' },
    huyet: { ten: 'Huyết', han: '血', ynghia: 'độ lưu chuyển, tốc độ đều' },
    the: { ten: 'Thế', han: '勢', ynghia: 'xu hướng đường chân chữ' },
  };

  // ── Khí (氣) — mạch liền ────────────────────────────────────────────
  function scoreKhi(strokes) {
    const total = totalLength(strokes);
    if (total < 1e-6) return { score: 0, strokeCount: strokes.length, longestRatio: 0 };
    const lens = strokes.map(strokeLength);
    const longest = Math.max(...lens);
    const longestRatio = longest / total;
    const strokeCount = strokes.length;
    // Nhấc bút càng nhiều, khí càng đứt — nhưng KHÔNG tuyến tính vô hạn:
    // giảm dần ảnh hưởng từ lần nhấc thứ 5 trở đi (đằng nào cũng đã đứt rõ).
    const liftPenalty = Math.min(70, (strokeCount - 1) * 16);
    const score = clamp(round1(100 * longestRatio - liftPenalty * 0.5), 3, 100);
    return { score, strokeCount, longestRatio: round1(longestRatio * 100) };
  }

  // ── Cốt (骨) — khung xương ─────────────────────────────────────────
  function scoreCot(segs, bb) {
    if (!segs.length) return { score: 0, cornerDensity: 0, aspect: 1 };
    const totalLen = segs.reduce((s, x) => s + x.len, 0);
    const sharpLen = segs.filter((s) => s.sharp).reduce((s, x) => s + x.len, 0);
    const cornerDensity = totalLen > 0 ? sharpLen / totalLen : 0; // tỉ lệ độ dài nằm ở khúc gãy góc
    // Vùng khoẻ: 8%–28% độ dài là khúc gãy rõ — đủ để có "khung", không tới
    // mức vụn nát. Ngoài vùng đó, điểm giảm dần về hai phía.
    let score;
    if (cornerDensity < 0.08) score = 55 + (cornerDensity / 0.08) * 30; // quá mềm, thiếu khung
    else if (cornerDensity <= 0.28) score = 85 + (1 - Math.abs(cornerDensity - 0.18) / 0.10) * 15;
    else score = clamp(85 - (cornerDensity - 0.28) * 140, 5, 85); // quá vụn, loạn cốt
    const aspect = bb.w > bb.h ? bb.w / bb.h : bb.h / bb.w;
    return { score: clamp(round1(score), 0, 100), cornerDensity: round1(cornerDensity * 100), aspect: round1(aspect) };
  }

  // ── Nhục (肉) — đầy đặn ────────────────────────────────────────────
  function scoreNhuc(strokes, segs) {
    const pressures = [];
    for (const st of strokes) for (const p of st) if (typeof p.p === 'number') pressures.push(p.p);
    const hasRealPressure = pressures.length > 4 && (Math.max(...pressures) - Math.min(...pressures)) > 0.08;
    if (hasRealPressure) {
      const avg = pressures.reduce((a, b) => a + b, 0) / pressures.length;
      return { score: clamp(round1(avg * 100), 5, 100), source: 'pressure', avgPressure: round1(avg * 100) };
    }
    // Không có cảm biến lực thật (chuột, hoặc thiết bị không báo áp lực) →
    // suy nhục từ TỐC ĐỘ: nét chậm mô phỏng nét "dày" trong thư pháp bút
    // lông, nét vội mô phỏng nét "mảnh". Dùng tốc độ trung vị cho bền với
    // vài điểm nhiễu đầu/cuối nét.
    const speeds = [];
    for (const s of segs) {
      const dt = (s.t1 - s.t0) || 1;
      speeds.push(s.len / dt);
    }
    if (!speeds.length) return { score: 50, source: 'khong-du-du-lieu', avgPressure: null };
    speeds.sort((a, b) => a - b);
    const median = speeds[Math.floor(speeds.length / 2)];
    // Ngưỡng hiệu chỉnh theo thực nghiệm trên canvas 1x (px/ms): 0.15 = chậm
    // rãi (dày), 0.9 = vội (mảnh). Ngoài khoảng thì kẹp lại.
    const t = clamp((0.9 - median) / (0.9 - 0.15), 0, 1);
    return { score: clamp(round1(30 + t * 65), 5, 100), source: 'toc-do', avgPressure: null };
  }

  // ── Huyết (血) — lưu chuyển ────────────────────────────────────────
  function scoreHuyet(segs) {
    const speeds = segs.map((s) => s.len / ((s.t1 - s.t0) || 1)).filter((v) => isFinite(v));
    if (speeds.length < 3) return { score: 50, cv: 0, heTri: 0 };
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    if (mean < 1e-6) return { score: 50, cv: 0, heTri: 0 };
    const variance = speeds.reduce((a, b) => a + (b - mean) * (b - mean), 0) / speeds.length;
    const cv = Math.sqrt(variance) / mean; // hệ số biến thiên tốc độ
    // Đếm chỗ "trệ" (đọng bút giữa chừng): tốc độ tụt xuống dưới 15% tốc độ
    // trung bình mà KHÔNG phải điểm đầu/cuối của nét.
    let heTri = 0;
    for (let i = 1; i < speeds.length - 1; i++) if (speeds[i] < mean * 0.15) heTri++;
    const score = clamp(round1(100 - cv * 55 - heTri * 6), 5, 100);
    return { score, cv: round1(cv * 100), heTri };
  }

  // ── Thần (神) — nhất quán / mượt ───────────────────────────────────
  // 1 lần ký: đo độ mượt qua "giật" (jerk xấp xỉ bằng sai phân bậc 2 của
  // tốc độ). Nhiều lần ký: đo độ NHẤT QUÁN giữa các lần — đúng tinh thần cổ
  // pháp 花押 "bất khả mô" (chữ ký thật khó nhái được CHÍNH MÌNH giống hệt,
  // nhưng vẫn phải cùng một "khí" — dao động thấp mới là thần vượng).
  function resample(strokes, n) {
    const bb = boundingBox(strokes);
    const scale = bb.diag > 1e-6 ? 1 / bb.diag : 1;
    const pts = [];
    for (const st of strokes) for (const p of st) pts.push({ x: (p.x - bb.minX) * scale, y: (p.y - bb.minY) * scale });
    if (pts.length < 2) return pts;
    const cum = [0];
    let tot = 0;
    for (let i = 1; i < pts.length; i++) { tot += dist(pts[i - 1], pts[i]); cum.push(tot); }
    if (tot < 1e-6) return pts;
    const out = [];
    for (let i = 0; i < n; i++) {
      const target = (tot * i) / (n - 1);
      let j = 1; while (j < cum.length && cum[j] < target) j++;
      j = Math.min(j, cum.length - 1);
      const segStart = cum[j - 1], segEnd = cum[j];
      const frac = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
      const a = pts[j - 1], b = pts[j];
      out.push({ x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac });
    }
    return out;
  }

  function scoreThanSingle(segs) {
    const speeds = segs.map((s) => s.len / ((s.t1 - s.t0) || 1)).filter((v) => isFinite(v));
    if (speeds.length < 4) return { score: 55, jerk: 0 };
    let jerkSum = 0, n = 0;
    for (let i = 2; i < speeds.length; i++) {
      const j = speeds[i] - 2 * speeds[i - 1] + speeds[i - 2];
      jerkSum += Math.abs(j); n++;
    }
    const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length || 1;
    const jerk = n ? (jerkSum / n) / meanSpeed : 0;
    const score = clamp(round1(100 - jerk * 40), 10, 100);
    return { score, jerk: round1(jerk * 100) };
  }

  function scoreThanMulti(strokeSets) {
    const N = 48;
    const resampled = strokeSets.map((s) => resample(s, N));
    let sumDist = 0, pairs = 0;
    for (let i = 0; i < resampled.length; i++) for (let j = i + 1; j < resampled.length; j++) {
      let d = 0;
      for (let k = 0; k < N; k++) d += dist(resampled[i][k], resampled[j][k]);
      sumDist += d / N; pairs++;
    }
    const avgDist = pairs ? sumDist / pairs : 0; // đơn vị: phần của đường chéo hộp bao (đã chuẩn hoá)
    const score = clamp(round1(100 - avgDist * 220), 10, 100);
    return { score, avgDist: round1(avgDist * 100) };
  }

  // ── Gợi ý — bám vào trục ĐIỂM THẤP NHẤT, không phải mẫu câu chung chung ──
  const GOI_Y = {
    than: 'Ký chậm lại một nhịp và tập ký LẶP LẠI cùng một chữ ký 5–10 lần mỗi ngày — thần vượng lên nhờ sự nhất quán, không phải nhờ ký nhanh.',
    khi: 'Nét đang bị ngắt nhiều lần. Thử gom chữ ký về ÍT nét nhấc bút hơn — một mạch dài liền tay tốt hơn nhiều nét ngắn rời rạc.',
    cot: 'Chữ ký đang thiếu điểm dừng dứt khoát (hoặc ngược lại, quá nhiều góc vụn). Thêm MỘT nét thẳng làm trục chính, các nét còn lại tựa vào đó.',
    nhuc: 'Nét đang mảnh/vội. Ký chậm hơn ở đoạn giữa chữ ký — không cần nhấn mạnh cả chữ, chỉ 1–2 đoạn then chốt là đủ.',
    huyet: 'Tốc độ đang lên xuống thất thường, có chỗ đọng bút. Tập ký theo một nhịp đều — coi như đang vẽ một đường cong chứ không phải viết chữ.',
    the: 'Đường chân chữ đang chúc xuống. Thử kết thúc chữ ký bằng một nét hất nhẹ lên — đúng "thượng thế" trong thư pháp cổ.',
  };

  function pickGoiY(truc) {
    let worstKey = null, worstScore = 101;
    for (const k of Object.keys(TRUC_META)) {
      const v = truc[k] && truc[k].score;
      if (typeof v === 'number' && v < worstScore) { worstScore = v; worstKey = k; }
    }
    if (!worstKey) return null;
    return { truc: worstKey, ten: TRUC_META[worstKey].ten, loi: GOI_Y[worstKey] };
  }

  // ── API chính: ký trên canvas (đủ 6 trục) ─────────────────────────
  // strokeSets: mảng CÁC LẦN KÝ, mỗi lần ký là mảng strokes, mỗi stroke là
  // mảng điểm {x,y,t,p}. Ký 1 lần → strokeSets.length === 1.
  function analyzeStrokes(strokeSets) {
    if (!Array.isArray(strokeSets) || !strokeSets.length) return null;
    const strokes = strokeSets[0];
    if (!strokes || !strokes.length) return null;
    const bb = boundingBox(strokes);
    const segs = buildSegments(strokes);

    const khi = scoreKhi(strokes);
    const cot = scoreCot(segs, bb);
    const nhuc = scoreNhuc(strokes, segs);
    const huyet = scoreHuyet(segs);
    const than = strokeSets.length >= 2 ? scoreThanMulti(strokeSets) : scoreThanSingle(segs);

    // Thế: hồi quy trên TOÀN BỘ điểm gốc, trọng số theo độ dài đoạn.
    const regPts = [];
    for (const stroke of strokes) for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1], b = stroke[i];
      const w = dist(a, b);
      regPts.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w });
    }
    const reg = weightedLinReg(regPts);
    const angleDeg = Math.atan2(reg.slope * bb.w, bb.w) * 180 / Math.PI;
    const theClass = classifyThe(angleDeg);
    const the = { score: scoreThe(angleDeg), angleDeg: round1(angleDeg), class: theClass.key, label: theClass.label };

    const truc = {
      than: { score: than.score, detail: than },
      khi: { score: khi.score, detail: khi },
      cot: { score: cot.score, detail: cot },
      nhuc: { score: nhuc.score, detail: nhuc },
      huyet: { score: huyet.score, detail: huyet },
      the,
    };

    const nguHanh = nguHanhFromSegments(segs);
    const tongDiem = Math.round(Object.keys(truc).reduce((s, k) => s + truc[k].score, 0) / 6);
    const doOnDinh = strokeSets.length >= 2 ? than.score : null;

    return {
      nguon: 'ky-truc-tiep',
      soLanKy: strokeSets.length,
      truc, nguHanh, tongDiem, doOnDinh,
      goiY: pickGoiY(truc),
      thieu: [], // đủ cả 6 trục khi ký trực tiếp
    };
  }

  // ── API phụ: ảnh tĩnh (chỉ Cốt / Nhục / Thế đo được — không có trục thời gian) ──
  // imageData: ImageData chuẩn (từ canvas.getContext('2d').getImageData(...)).
  // Giả định mực SẪM trên nền SÁNG — ghi rõ giới hạn này ở UI, đừng lặng im.
  function analyzeImageData(imageData) {
    const { data, width: W, height: H } = imageData;
    const THRESH = 140; // luma < ngưỡng = mực
    const ink = new Uint8Array(W * H);
    let minX = W, minY = H, maxX = -1, maxY = -1, inkCount = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const isInk = luma < THRESH && data[i + 3] > 40;
      if (isInk) {
        ink[y * W + x] = 1; inkCount++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (inkCount < 20) return null;
    const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    const coverage = inkCount / (w * h);

    // Nhục ≈ độ phủ mực trong hộp bao (chữ dày choán nhiều diện tích hơn).
    const nhucScore = clamp(round1(20 + coverage * 260), 5, 100);

    // Cốt ≈ tỉ lệ khung (chữ ký quá "béo tròn" hay quá "dẹt" đều lệch khung
    // lý tưởng ~1.4–2.6 bề ngang/bề cao của một cụm chữ ký thường gặp).
    const aspect = w > h ? w / h : h / w;
    const idealLo = 1.4, idealHi = 2.6;
    let cotScore;
    if (aspect >= idealLo && aspect <= idealHi) cotScore = 85;
    else cotScore = clamp(round1(85 - Math.abs(aspect - clamp(aspect, idealLo, idealHi)) * 18), 20, 85);

    // Thế: hồi quy y~x trên mọi pixel mực (mẫu thưa để nhanh).
    const regPts = [];
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));
    for (let y = minY; y <= maxY; y += step) for (let x = minX; x <= maxX; x += step) {
      if (ink[y * W + x]) regPts.push({ x, y, w: 1 });
    }
    const reg = weightedLinReg(regPts);
    const angleDeg = Math.atan2(reg.slope * w, w) * 180 / Math.PI;
    const theClass = classifyThe(angleDeg);
    const the = { score: scoreThe(angleDeg), angleDeg: round1(angleDeg), class: theClass.key, label: theClass.label };

    // Ngũ hành nét từ ảnh: hướng gradient cục bộ (Sobel rút gọn) trên viền
    // mực, cộng số vòng khép phát hiện qua flood-fill vùng nền bị mực bao
    // kín (đúng cách đếm "lỗ" trong xử lý ảnh nhị phân — proxy cho Kim).
    const nguHanh = nguHanhFromImage(ink, W, H, minX, minY, maxX, maxY);

    const truc = {
      cot: { score: cotScore, detail: { aspect: round1(aspect) } },
      nhuc: { score: nhucScore, detail: { coverage: round1(coverage * 100) } },
      the,
    };
    const measured = ['cot', 'nhuc', 'the'];
    const tongDiem = Math.round(measured.reduce((s, k) => s + truc[k].score, 0) / measured.length);

    return {
      nguon: 'anh-tinh',
      truc, nguHanh, tongDiem, doOnDinh: null,
      goiY: null,
      thieu: ['than', 'khi', 'huyet'],
    };
  }

  function nguHanhFromImage(ink, W, H, minX, minY, maxX, maxY) {
    let gh = 0, gv = 0, gd = 0, edgeCount = 0;
    for (let y = minY + 1; y < maxY; y++) for (let x = minX + 1; x < maxX; x++) {
      if (!ink[y * W + x]) continue;
      const gx = (ink[y * W + x + 1] || 0) - (ink[y * W + x - 1] || 0);
      const gy = (ink[(y + 1) * W + x] || 0) - (ink[(y - 1) * W + x] || 0);
      if (gx === 0 && gy === 0) continue;
      edgeCount++;
      if (Math.abs(gx) > Math.abs(gy) * 1.8) gh++;
      else if (Math.abs(gy) > Math.abs(gx) * 1.8) gv++;
      else gd++;
    }
    // Đếm "lỗ" (vòng khép) bằng flood-fill nền từ mép ảnh; vùng nền KHÔNG
    // chạm được từ mép = bị mực bao kín = một vòng khép (Kim).
    const bg = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) { stack.push(x); stack.push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { stack.push(y * W); stack.push(y * W + W - 1); }
    while (stack.length) {
      const idx = stack.pop();
      if (idx < 0 || idx >= W * H || bg[idx] || ink[idx]) continue;
      bg[idx] = 1;
      const x = idx % W, y = (idx / W) | 0;
      if (x > 0) stack.push(idx - 1);
      if (x < W - 1) stack.push(idx + 1);
      if (y > 0) stack.push(idx - W);
      if (y < H - 1) stack.push(idx + W);
    }
    let enclosed = 0;
    for (let i = 0; i < W * H; i++) if (!ink[i] && !bg[i]) enclosed++;
    const totalBg = W * H - edgeCount - enclosed || 1;
    const kimShare = clamp(enclosed / (totalBg * 0.05), 0, 1); // chuẩn hoá thô — chỉ để xếp hạng tương đối

    const sum = gh + gv + gd || 1;
    let tho = (gh / sum) * 100, moc = (gv / sum) * 100, thuy = (gd / sum) * 100;
    let kim = kimShare * 25;
    let hoa = 0; // không tách được "hất nhọn" đáng tin từ raster tĩnh — gộp vào Thủy, ghi rõ ở UI
    const scale = 100 / (tho + moc + thuy + kim + hoa || 1);
    tho *= scale; moc *= scale; thuy *= scale; kim *= scale; hoa *= scale;
    return { hoa: round1(hoa), kim: round1(kim), tho: round1(tho), moc: round1(moc), thuy: round1(100 - hoa - kim - tho - moc) };
  }

  // ── Ngữ cảnh PHẲNG cho LLM/rail — `extractGenericContext` bỏ qua object ──
  function railData(r) {
    if (!r) return {};
    const t = r.truc;
    const line = (k) => t[k] ? `${TRUC_META[k].ten} (${TRUC_META[k].han}) ${t[k].score}/100` : `${TRUC_META[k].ten}: không đo được từ ảnh tĩnh`;
    return {
      nguon: r.nguon,
      sauTrucBuTuong: Object.keys(TRUC_META).map(line).join(' · '),
      trucThieu: r.thieu.length ? r.thieu.map((k) => TRUC_META[k].ten).join(', ') : 'không thiếu',
      nguHanhNet: HANH_ORDER.map((k) => `${NGU_HANH_META[k].ten} ${r.nguHanh[k]}%`).join(' · '),
      tongDiem: r.tongDiem,
      doOnDinh: r.doOnDinh == null ? 'chỉ ký 1 lần, chưa đo được độ ổn định' : `${r.doOnDinh}/100 (so giữa ${r.soLanKy} lần ký)`,
      the: t.the ? `${t.the.label} (góc ${t.the.angleDeg}°)` : '',
    };
  }

  const API = {
    analyzeStrokes, analyzeImageData, classifyThe, railData,
    TRUC_META, NGU_HANH_META, HANH_ORDER,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BuTuongTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
