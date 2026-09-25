/* ============================================================
   tools-shared/luc-nham.js — chỉ còn kiểm ngày + dựng tiêu đề cho Lục Nhâm
   Giản. Nguồn DUY NHẤT: dùng chung /tools/luc-nham.html VÀ shell /app/luc-nham.
   Khóa Lục Nhâm thật (12 thần tướng, thiên/địa bàn) do `/api/liuren` lập,
   vẽ qua `dai-luc-nham.js` — xem chú thích đầu file đó về vì sao không tự
   tính "12 thần tướng" ở đây nữa (công thức cũ chưa verify được).
   API: LucNhamTool.compute(ngay,thang,nam,gioChi).
   ============================================================ */
(function () {
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var GIO_TIME = ['23–01h', '01–03h', '03–05h', '05–07h', '07–09h', '09–11h', '11–13h', '13–15h', '15–17h', '17–19h', '19–21h', '21–23h'];

  function compute(ngay, thang, nam, gioChi) {
    ngay = parseInt(ngay); thang = parseInt(thang); nam = parseInt(nam); gioChi = parseInt(gioChi) || 0;
    if (!ngay || ngay < 1 || ngay > 31 || !thang || !nam) return { ok: false, error: 'Vui lòng nhập ngày tháng năm.' };
    // Kiểm ngày không tồn tại (vd 31/2) ở đây — `/api/liuren` lập khóa theo
    // đúng ngày này, gửi ngày sai thì khóa cũng sai mà không ai báo.
    if (new Date(nam, thang - 1, ngay).getDate() !== ngay) {
      return { ok: false, error: 'Tháng ' + thang + '/' + nam + ' không có ngày ' + ngay + ' — vui lòng chọn lại.' };
    }
    // 🔴 `titleText`/`data.ngayDL`/`data.gio` dưới đây KHÔNG dùng can-chi ngày
    // hay vị trí thần tướng — phần đó (khóa Lục Nhâm thật) do `/api/liuren`
    // qua `dai-luc-nham.js` lập và vẽ thẳng vào `#activeBox`. `compute()` ở
    // đây từng tự tính thêm một bộ "12 thần tướng" bằng công thức
    // `startOffset=(canNgay*2)%12` — CLAUDE.md đã ghi rõ công thức đó CHƯA
    // VERIFY ĐƯỢC (xem đầu `dai-luc-nham.js`), nên đã bỏ hẳn, không sửa mò.
    return {
      ok: true,
      titleText: 'Ngày ' + ngay + '/' + thang + '/' + nam + ' — Giờ ' + CHI[gioChi] + ' (' + GIO_TIME[gioChi] + ')',
      data: { ngayDL: ngay + '/' + thang + '/' + nam, gio: CHI[gioChi] + ' (' + GIO_TIME[gioChi] + ')' }
    };
  }
  window.LucNhamTool = { compute: compute };
})();
