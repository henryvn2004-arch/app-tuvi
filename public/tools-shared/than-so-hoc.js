/* tools-shared/than-so-hoc.js — Module DÙNG CHUNG tool Thần Số Học.
   Nguồn DUY NHẤT cho standalone /tools/than-so-hoc.html + shell /app/than-so-hoc.
   Logic + chuỗi render PORT NGUYÊN XI từ bản inline cũ (Pythagoras: 4 số Đường
   Đời / Định Mệnh / Linh Hồn / Sứ Mệnh + MEANINGS). API thuần dữ liệu + HTML.
   window.ThanSoTool = { compute } */
(function (root) {
  var NUM_COLORS = ['', '#C0392B', '#E67E22', '#F1C40F', '#2ECC71', '#1455A4', '#8E44AD', '#1ABC9C', '#E91E63', '#2C3E50', '#c9a84c', '#5FA8D3', '#1E6B3C'];
  var VOWELS = new Set('AEIOU');
  var CHAR_VAL = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };
  function reduce(n) { while (n > 9 && n !== 11 && n !== 22 && n !== 33) { var s = 0; while (n > 0) { s += n % 10; n = Math.floor(n / 10); } n = s; } return n; }
  function sumName(name, vowelOnly, consonantOnly) {
    var s = 0;
    var up = name.toUpperCase();
    for (var i = 0; i < up.length; i++) {
      var c = up[i];
      if (!/[A-Z]/.test(c)) continue;
      var isV = VOWELS.has(c);
      if (vowelOnly && !isV) continue;
      if (consonantOnly && isV) continue;
      s += CHAR_VAL[c] || 0;
    }
    return s;
  }
  var MEANINGS = {
    1: { kw: ['Lãnh đạo', 'Tiên phong', 'Độc lập', 'Ý chí mạnh'], desc: 'Số 1 mang năng lượng của khởi đầu và lãnh đạo. Bạn có xu hướng độc lập, quyết đoán và muốn đứng đầu. Thích mở đường, ghét bị kiểm soát. Điểm yếu: cứng đầu, khó nhượng bộ.' },
    2: { kw: ['Hợp tác', 'Ngoại giao', 'Nhạy cảm', 'Trực giác'], desc: 'Số 2 là năng lượng của sự hài hòa và đối tác. Bạn nhạy cảm, có khả năng ngoại giao, thích làm việc cùng người khác hơn là đơn độc. Điểm yếu: thiếu quyết đoán, phụ thuộc vào người khác.' },
    3: { kw: ['Sáng tạo', 'Biểu đạt', 'Lạc quan', 'Giao tiếp'], desc: 'Số 3 là năng lượng của sáng tạo và biểu đạt. Bạn vui vẻ, tài năng nghệ thuật, khả năng giao tiếp xuất sắc. Điểm yếu: thiếu tập trung, hay phân tán sức lực.' },
    4: { kw: ['Kỷ luật', 'Ổn định', 'Chăm chỉ', 'Thực tế'], desc: 'Số 4 mang năng lượng của nền tảng và kỷ luật. Bạn đáng tin cậy, có tổ chức, kiên nhẫn xây dựng từng bước. Điểm yếu: cứng nhắc, khó thích nghi với thay đổi.' },
    5: { kw: ['Tự do', 'Phiêu lưu', 'Thay đổi', 'Đa tài'], desc: 'Số 5 là năng lượng của tự do và biến đổi. Bạn thích trải nghiệm mới, linh hoạt và đa tài. Điểm yếu: thiếu kiên định, dễ chán nản và bỏ cuộc giữa chừng.' },
    6: { kw: ['Yêu thương', 'Trách nhiệm', 'Chữa lành', 'Gia đình'], desc: 'Số 6 mang năng lượng của tình yêu và trách nhiệm. Bạn quan tâm, muốn chăm lo cho người khác, coi trọng gia đình và cộng đồng. Điểm yếu: hay lo lắng thái quá, can thiệp việc người khác.' },
    7: { kw: ['Trí tuệ', 'Nội tâm', 'Tâm linh', 'Phân tích'], desc: 'Số 7 là năng lượng của trí tuệ và tâm linh. Bạn có chiều sâu nội tâm, thích phân tích và tìm kiếm sự thật. Điểm yếu: hướng nội quá mức, khó mở lòng với người khác.' },
    8: { kw: ['Quyền lực', 'Thịnh vượng', 'Tham vọng', 'Thực tế'], desc: 'Số 8 mang năng lượng của vật chất và quyền lực. Bạn có tham vọng, khả năng tổ chức và bản năng kinh doanh. Điểm yếu: quá tập trung vào vật chất, có thể cứng nhắc và kiểm soát.' },
    9: { kw: ['Nhân ái', 'Lý tưởng', 'Hy sinh', 'Trí tuệ cao'], desc: 'Số 9 là năng lượng của sự hoàn chỉnh và nhân ái. Bạn có tầm nhìn rộng, muốn cống hiến cho nhân loại. Điểm yếu: quá lý tưởng hóa, có thể bị tổn thương khi thực tế không như mong đợi.' },
    11: { kw: ['Trực giác cao', 'Truyền cảm hứng', 'Nhạy cảm', 'Thiên khiếu'], desc: 'Số 11 là số Master — trực giác cực cao và khả năng truyền cảm hứng mạnh. Bạn nhạy cảm với năng lượng xung quanh và có sứ mệnh soi sáng cho người khác. Điểm yếu: dễ lo âu, áp lực nội tâm lớn.' },
    22: { kw: ['Kiến trúc sư vĩ đại', 'Thực tế', 'Lý tưởng', 'Xây dựng'], desc: 'Số 22 là số Master Builder — kết hợp tầm nhìn của số 11 với tính thực tế của số 4. Bạn có khả năng biến giấc mơ lớn thành hiện thực. Điểm yếu: gánh chịu quá nhiều trách nhiệm, dễ kiệt sức.' },
    33: { kw: ['Thầy giáo tâm linh', 'Yêu thương', 'Hy sinh', 'Chữa lành'], desc: 'Số 33 là Master Teacher — đỉnh cao của số 6, mang tình yêu vô điều kiện. Bạn có thiên hướng hướng dẫn và chữa lành. Điểm yếu: có thể ôm đồm quá mức, cần học cách tự chăm sóc bản thân.' },
  };
  var NUM_LABELS = ['Số Đường Đời', 'Số Định Mệnh', 'Số Linh Hồn', 'Số Sứ Mệnh'];
  var NUM_SUBS = ['(từ ngày sinh)', '(từ tên đầy đủ)', '(từ nguyên âm)', '(từ phụ âm)'];

  // compute(ngay,thang,nam,tenRaw) → { ok, error?, resultHTML, data }. resultHTML
  // = CHÍNH chuỗi innerHTML bản cũ sinh cho #numResults (byte-khớp).
  function compute(ngay, thang, nam, tenRaw) {
    var ten = String(tenRaw || '').trim().toUpperCase().replace(/[^A-Z ]/g, '');
    if (!ngay || !thang || !nam) return { ok: false, error: 'Vui lòng nhập ngày tháng năm sinh.' };
    if (!ten) return { ok: false, error: 'Vui lòng nhập tên (ký tự A–Z, không dấu).' };

    var allDigits = (String(ngay) + String(thang) + String(nam)).split('').reduce(function (s, c) { return s + parseInt(c); }, 0);
    var dd = reduce(allDigits);
    var dinhMenh = reduce(sumName(ten));
    var linhHon = reduce(sumName(ten, true, false));
    var suMenh = reduce(sumName(ten, false, true));

    var nums = [dd, dinhMenh, linhHon, suMenh];
    var resultHTML = nums.map(function (n, i) {
      var m = MEANINGS[n] || MEANINGS[9];
      return `<div class="num-card">
      <div class="num-circle" style="background:${NUM_COLORS[Math.min(n, 12)]}">
        ${n}
      </div>
      <div class="num-content">
        <div class="num-title">${NUM_LABELS[i]} ${NUM_SUBS[i]}</div>
        <div class="num-desc">${m.desc}</div>
        <div class="num-keywords">${m.kw.map(function (k) { return `<span class="num-kw">${k}</span>`; }).join('')}</div>
      </div>
    </div>`;
    }).join('');

    return {
      ok: true,
      resultHTML: resultHTML,
      data: {
        dob: (ngay < 10 ? '0' + ngay : ngay) + '/' + (thang < 10 ? '0' + thang : thang) + '/' + nam,
        ten: ten,
        soDuongDoi: dd,
        soDinhMenh: dinhMenh,
        soLinhHon: linhHon,
        soSuMenh: suMenh,
      },
    };
  }

  var API = { compute: compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ThanSoTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
