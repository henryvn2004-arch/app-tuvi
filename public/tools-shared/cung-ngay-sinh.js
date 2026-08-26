/* tools-shared/cung-ngay-sinh.js — Block "Ai Sinh Cùng Ngày Với Bạn"
   Nguồn DUY NHẤT cho mọi trang có form ngày–giờ sinh.
   window.CungNgaySinh = { mount }

   ── LUẬT CỦA KHỐI NÀY ───────────────────────────────────────
   1. MIỄN PHÍ, 0 token LLM. Không trừ Lượng, không đụng paywall.
   2. KHÔNG một chữ luận giải về người nổi tiếng — chỉ ảnh + tên + nghề + ngày
      giờ sinh + link. Vừa an toàn với người còn sống, vừa đúng mục tiêu: để
      người đọc TỰ đi tìm hiểu.
   3. BEST-EFFORT TUYỆT ĐỐI. Hỏng mạng / hỏng API / rỗng ⇒ khối tự ẩn, KHÔNG
      báo lỗi. Nó nằm CUỐI bản luận giải người ta vừa trả tiền — làm hỏng trang
      vì một mục phụ là đắt hơn nhiều so với việc lặng lẽ biến mất.
   4. Ảnh hỏng thì rơi về avatar chữ cái, không để ô vỡ.
   5. GHI CÔNG ảnh. Hotlink thì mình chỉ DẪN tới tác phẩm; từ khi kéo ảnh về
      Supabase Storage thì mình PHÂN PHỐI nó, nên CC BY-SA đòi ghi tác giả +
      license ngay trên trang. `anhTacGia`/`anhLicense` chưa có (chưa đồng bộ,
      hoặc Commons không trả extmetadata) thì lùi về link trang mô tả file —
      đó vẫn là cách ghi công được chấp nhận. */
(function (root) {
  var CHI_LABEL = {
    Tý: '23–01h', Sửu: '01–03h', Dần: '03–05h', Mão: '05–07h',
    Thìn: '07–09h', Tỵ: '09–11h', Ngọ: '11–13h', Mùi: '13–15h',
    Thân: '15–17h', Dậu: '17–19h', Tuất: '19–21h', Hợi: '21–23h',
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tzText(off) {
    if (off === null || off === undefined) return '';
    var s = off < 0 ? '−' : '+';
    var a = Math.abs(off);
    return 'UTC' + s + Math.floor(a / 60) + (a % 60 ? ':' + String(a % 60).padStart(2, '0') : '');
  }

  /* Ghi công ảnh — bắt buộc với CC BY-SA từ khi mình TỰ PHÂN PHỐI ảnh (kéo về
     Supabase Storage) thay vì chỉ hotlink Commons.
     Ba mức, rơi dần: tác giả + license → chỉ license → chỉ link trang file.
     Không có ảnh thì không ghi gì (avatar chữ cái không phải tác phẩm của ai). */
  function ghiCong(it) {
    if (!it.anh) return '';
    var phan = [];
    if (it.anhTacGia) phan.push(esc(it.anhTacGia));
    if (it.anhLicense) phan.push(esc(it.anhLicense));
    var chu = phan.join(' · ');
    if (!chu && !it.anhTrang) return '';
    var noi = it.anhTrang
      ? '<a href="' + esc(it.anhTrang) + '" target="_blank" rel="noopener noreferrer nofollow">' +
        (chu || 'Wikimedia Commons') + '</a>'
      : chu;
    return '<div class="cns-anh-nguon">Ảnh: ' + noi + '</div>';
  }

  function card(it) {
    var vang = it.tang === 't2';
    var bac = it.tang === 't2b';
    var initial = esc((it.ten || '?').trim().charAt(0).toUpperCase());
    // 🪤 KHÔNG dùng `onerror="..."` inline: chuỗi tên có dấu nháy sẽ ĐÓNG SỚM
    // giá trị thuộc tính và vỡ thẻ (đã vấp — 3 SyntaxError, ảnh hỏng không rơi
    // về avatar). Đánh dấu bằng data-attribute rồi gắn handler bằng JS sau khi
    // innerHTML xong. Đây đúng bẫy CLAUDE.md ghi ở mục Icon.
    var anh = it.anh
      ? '<img class="cns-anh" src="' + esc(it.anh) + '" alt="" loading="lazy" data-cns-chu="' + initial + '">'
      : '<div class="cns-anh cns-chu">' + initial + '</div>';

    var dong = [];
    if (it.nghe) dong.push(esc(it.nghe) + (it.quocGia ? ' · ' + esc(it.quocGia) : ''));
    var sinh = esc(it.ngaySinh);
    if (it.gioSinh) {
      sinh += ' · ' + esc(it.gioSinh) + (it.muiGio != null ? ' (' + tzText(it.muiGio) + ')' : '');
    }
    dong.push(sinh);
    if (it.canhGio) {
      dong.push(
        '<span class="cns-gio">giờ ' + esc(it.canhGio) +
          (CHI_LABEL[it.canhGio] ? ' (' + CHI_LABEL[it.canhGio] + ' giờ VN)' : '') + '</span>' +
          (it.doTinCayGio ? ' <span class="cns-rodden" title="Độ tin cậy giờ sinh theo thang Rodden">' + esc(it.doTinCayGio) + '</span>' : '')
      );
    }

    return (
      '<li class="cns-item' + (vang ? ' cns-vang' : bac ? ' cns-bac' : '') + '">' +
      anh +
      '<div class="cns-than">' +
      (vang || bac ? '<span class="cns-badge">' + esc(it.nhan) + '</span>' : '') +
      '<div class="cns-ten">' + esc(it.ten) + '</div>' +
      '<div class="cns-meta">' + dong.join('<br>') + '</div>' +
      (it.lienKet
        ? '<a class="cns-link" href="' + esc(it.lienKet) + '" target="_blank" rel="noopener noreferrer">Tìm hiểu thêm <span aria-hidden="true">→</span></a>'
        : '') +
      ghiCong(it) +
      '</div></li>'
    );
  }

  var CSS =
    '.cns{margin:28px 0 8px;border-top:1px solid var(--line,#e5e7eb);padding-top:20px}' +
    '.cns h3{font-size:17px;margin:0 0 4px;display:flex;align-items:center;gap:8px}' +
    '.cns-sub{font-size:13px;color:var(--muted,#6b7280);margin:0 0 14px}' +
    '.cns-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}' +
    '.cns-item{display:flex;gap:12px;align-items:flex-start;padding:10px;border:1px solid var(--line,#e5e7eb);border-radius:12px}' +
    '.cns-vang{border-color:#d4a017;background:linear-gradient(180deg,rgba(212,160,23,.10),transparent)}' +
    '.cns-bac{border-color:#9ca3af;background:linear-gradient(180deg,rgba(156,163,175,.10),transparent)}' +
    '.cns-anh{width:56px;height:56px;border-radius:10px;object-fit:cover;flex:0 0 56px;background:var(--bg2,#f3f4f6)}' +
    '.cns-chu{display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;color:var(--muted,#6b7280)}' +
    '.cns-than{min-width:0;flex:1}' +
    '.cns-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.02em;padding:2px 7px;border-radius:999px;background:#d4a017;color:#fff;margin-bottom:4px}' +
    '.cns-bac .cns-badge{background:#6b7280}' +
    '.cns-ten{font-weight:600;font-size:15px}' +
    '.cns-meta{font-size:12.5px;color:var(--muted,#6b7280);line-height:1.55;margin-top:2px}' +
    '.cns-gio{font-weight:600;color:var(--fg,#111827)}' +
    '.cns-rodden{font-size:10.5px;border:1px solid var(--line,#e5e7eb);border-radius:4px;padding:0 4px}' +
    '.cns-link{display:inline-block;margin-top:6px;font-size:12.5px;font-weight:600;color:#1455A4;text-decoration:none}' +
    '.cns-anh-nguon{font-size:10.5px;color:var(--muted,#6b7280);opacity:.75;margin-top:4px;line-height:1.4}' +
    '.cns-anh-nguon a{color:inherit;text-decoration:underline}' +
    '.cns-ghi{font-size:11.5px;color:var(--muted,#6b7280);margin-top:12px;line-height:1.5}';

  function injectCss() {
    if (document.getElementById('cns-css')) return;
    var st = document.createElement('style');
    st.id = 'cns-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /**
   * @param {HTMLElement|string} target
   * @param {{ngay:number,thang:number,nam:number,gioIdx?:number,gioitinh?:string}} d
   */
  function mount(target, d) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el || !d || !d.ngay || !d.thang || !d.nam) return;

    var qs =
      'd=' + d.ngay + '&m=' + d.thang + '&y=' + d.nam +
      (d.gioIdx != null && d.gioIdx >= 0 ? '&h=' + d.gioIdx : '') +
      (d.gioitinh ? '&g=' + encodeURIComponent(d.gioitinh) : '');

    fetch('/api/v1/cung-ngay-sinh?' + qs)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok || !j.items || !j.items.length) { el.innerHTML = ''; return; }
        injectCss();
        var coVang = j.items.some(function (i) { return i.tang === 't2'; });
        el.innerHTML =
          '<section class="cns">' +
          '<h3><span class="ic" data-icon="users"></span> Ai Sinh Cùng Ngày Với Bạn</h3>' +
          '<p class="cns-sub">' +
          (coVang
            ? 'Có người <b>trùng cả ngày lẫn canh giờ sinh</b> với bạn — an sao ra đúng một lá số.'
            : 'Những người nổi tiếng có ngày sinh trùng với bạn.') +
          '</p>' +
          '<ul class="cns-list">' + j.items.map(card).join('') + '</ul>' +
          '<p class="cns-ghi">Chỉ hiển thị dữ kiện ngày–giờ sinh, không luận giải về người khác. ' +
          'Giờ sinh đã quy về múi giờ Việt Nam để so sánh. ' +
          'Nguồn: Wikidata (CC0) · ảnh từ Wikimedia Commons (license ghi dưới từng ảnh) · giờ sinh từ Astro-Databank.</p>' +
          '</section>';
        // HTML dựng bằng innerHTML thì icon chưa được thay — mountIcons() chỉ tự
        // chạy MỘT lần lúc nav.js nạp.
        // Ảnh Commons thỉnh thoảng bị đổi tên/gỡ — rơi về avatar chữ cái chứ
        // không để ô vỡ (một ô vỡ làm cả khối trông hỏng).
        el.querySelectorAll('img[data-cns-chu]').forEach(function (img) {
          img.addEventListener('error', function () {
            var alt = document.createElement('div');
            alt.className = 'cns-anh cns-chu';
            alt.textContent = img.getAttribute('data-cns-chu') || '?';
            img.replaceWith(alt);
          });
          // Ảnh có thể đã hỏng TRƯỚC khi handler kịp gắn (cache) — bắt luôn.
          if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
        });
        if (root.mountIcons) root.mountIcons(el);
      })
      .catch(function () {
        // Best-effort: im lặng biến mất, KHÔNG làm hỏng bản luận giải phía trên.
        el.innerHTML = '';
      });
  }

  var API = { mount: mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CungNgaySinh = API;
})(typeof window !== 'undefined' ? window : globalThis);
