/**
 * tuvi-form.js — Shared input form cho Tử Vi Minh Bảo
 *
 * Single person (luan-giai):
 *   TuviForm.render('container', { onSubmit, submitLabel })
 *   TuviForm.getData()
 *   TuviForm.setData(d)
 *
 * Multi-person (xem-tuoi) — prefix mode:
 *   TuviForm.render('container-a', { prefix:'a', mode:'person', label:'Người A', gioitinh:'nam' })
 *   TuviForm.render('container-b', { prefix:'b', mode:'person', label:'Người B', gioitinh:'nu' })
 *   TuviForm.getData('a')  → { hoten, ngay, thang, nam, gioIdx, gioHour, gioPhut, gioitinh }
 *   TuviForm.getData('b')
 *   TuviForm.setData(d, 'a')
 *
 * Compact (app-shell "/app/*" — chỉ các trường người, KHÔNG có form-grid/cột/
 * nút submit riêng). Mặc định vẽ khối "1 màn hình" (ô bo góc + icon dẫn đầu):
 *   TuviForm.render('container', { prefix:'', mode:'compact', gioitinh:'nam' })
 *   TuviForm.getData()  → cùng shape với person/full ở trên
 *   Truyền { pretty:false } để lùi về khối `.frow/.fg` cũ (tái dùng CSS có
 *   sẵn của trang gọi) — van an toàn, không phải cách dùng khuyến nghị.
 */

// Nạp lại lần hai (vd `shell.js` `ensureScripts` xin `?v=` khác với thẻ <script>
// của trang ⇒ khác URL ⇒ chạy lại file) KHÔNG được thay closure đang giữ
// `_updaters` của các form đã vẽ — giữ bản đã có nếu nó cùng thế hệ (có `_noiSinh`).
window.TuviForm = (window.TuviForm && window.TuviForm._noiSinh) ? window.TuviForm : (() => {
  // i18n (docs/i18n/QUY-UOC.md): T(khoá, chữViệt, {biến}) CHỈ để HIỂN THỊ. Giá trị gửi server (value="nam"/"nu", họ tên, số) giữ nguyên.
  const T = (k, d, v) => {
    const I = window.I18n;
    if (I && I.tv) return I.tv(k, d, v);
    return v ? String(d).replace(/\{(\w+)\}/g, (x, n) => (v[n] !== undefined ? v[n] : x)) : d;
  };
  // Địa chi do ENGINE trả (khoá tra) → hiển thị qua TuviGlossary (W15); không có thì chữ gốc.
  const G = (kind, v) => { const g = window.TuviGlossary; return g && v ? g.t(kind, v) : v; };
  const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const _updaters = {}; // prefix → update fn
  let _introShown = false; // renderChat() có thể gọi lại nhiều lần (2 người) — chỉ chào 1 lần/trang
  // `tuvi-form.js` là script DÙNG CHUNG, không tải lại khi soft-nav đổi trang
  // (`shell-soft-nav.js` chỉ nạp lại script CHƯA có trong `loadedSrc`) — thiếu
  // `_resetIntro()` thì "1 lần/trang" ở trên thành "1 lần/tab trình duyệt":
  // bấm sang tool chat-first thứ hai trong cùng tab sẽ KHÔNG có bong bóng
  // giới thiệu. Gọi từ `shell-soft-nav.js` NGAY khi script cờ của trang đích
  // chạy (cùng chỗ gọi `Shell._resyncTool()`) — TRƯỚC khi trang đích gọi
  // `renderChat()`. Không dùng sự kiện `tvmb:softnav` (bắn SAU khi script
  // trang đích đã chạy xong, tức SAU cả `renderChat()`) vì sai thứ tự: cờ chỉ
  // kịp reset cho lượt điều hướng KẾ TIẾP, không phải lượt vừa xong.

  // ── Helpers ──────────────────────────────────────────────────
  function pid(id, prefix) { return prefix ? `${prefix}-${id}` : id; }
  function gel(id, prefix) { return document.getElementById(pid(id, prefix)); }

  // ── Múi giờ: NGUỒN DUY NHẤT là tools-shared/vn-timezone.js ──
  // Ba hàm này trước nằm ngay đây, trong closure, KHÔNG export ra
  // `window.TuviForm` — nên `scripts/import-celeb-births.mjs` (nhập ngày giờ
  // sinh người nổi tiếng) không gọi được, mà chép sang thì hai bản trôi khỏi
  // nhau IM LẶNG: canh giờ vẫn ra một con số trông hợp lệ, chỉ là sai hệ quy
  // chiếu. Người dùng và người nổi tiếng BẮT BUỘC đi qua cùng một phép quy đổi
  // thì phép so "trùng giờ sinh" mới có nghĩa. `npm run check:vntz` canh.
  // Thẻ <script src="/tools-shared/vn-timezone.js"> phải đứng TRƯỚC file này.
  if (!window.VnTimezone) {
    // Thà đỏ to tiếng còn hơn âm thầm tính sai canh giờ cho mọi lá số.
    throw new Error('tuvi-form.js: thiếu /tools-shared/vn-timezone.js — nạp nó TRƯỚC file này.');
  }
  const { toVnHour, hourMinToGioIdx } = window.VnTimezone;

  // ── Nơi sinh: NGUỒN DUY NHẤT là tools-shared/noi-sinh.js ──
  // Sinh ở VN (mặc định, ô "Sinh ở ngoài Việt Nam?" bỏ trống) → đi NGUYÊN đường
  // cũ `toVnHour(…, 420, …)`, lá số y hệt trước đây. Sinh ở nước khác → đổi giờ
  // đồng hồ nơi sinh (múi + giờ mùa hè lịch sử từ IANA) sang giờ của LỊCH ÂM nơi
  // đó (VN · Trung/Đài/HK · Hàn · Nhật), kèm `lich` cho engine. Thẻ
  // <script src="/tools-shared/noi-sinh.js"> nên đứng TRƯỚC file này. KHÔNG ném lỗi
  // khi thiếu (khác vn-timezone.js): `shell.js` nạp lười file này mà chưa biết
  // noi-sinh.js — thiếu thì tự chèn script, trong lúc chờ ô nơi sinh chỉ có "—"
  // nên mọi lá số đi đường VN như cũ (an toàn), nạp xong thì đổ danh sách nước.
  const NOI_SINH_SRC = '/tools-shared/noi-sinh.js?v=2';
  const nsApi = () => window.NoiSinh;
  if (!window.NoiSinh && !document.querySelector('script[src^="/tools-shared/noi-sinh.js"]')) {
    const sc = document.createElement('script');
    sc.src = NOI_SINH_SRC;
    sc.onload = () => {
      document.querySelectorAll('select[id$="tvf-noisinh"]').forEach((sel) => {
        if (sel.options.length <= 1) sel.innerHTML = noiSinhOptions();
      });
    };
    document.head.appendChild(sc);
  }
  const TEN_LICH = {
    vn: T('js.tuviform.lich-vn','giờ VN'),
    cn: T('js.tuviform.lich-cn','giờ lịch Trung Hoa'),
    kr: T('js.tuviform.lich-kr','giờ lịch Hàn'),
    jp: T('js.tuviform.lich-jp','giờ lịch Nhật'),
  };

  /** {ma, tz} của nơi sinh đang chọn, hoặc null = sinh ở VN (đường cũ). */
  function noiSinhOf(prefix = '') {
    if (!gel('tvf-foreign', prefix)?.checked) return null;
    const ma = gel('tvf-noisinh', prefix)?.value || '';
    if (!ma || ma === 'VN' || !nsApi()) return null;
    const tz = gel('tvf-vung', prefix)?.value || (nsApi().vungCuaNuoc(ma)[0] || [])[0];
    return tz ? { ma, tz } : null;
  }

  /**
   * Giờ đồng hồ người dùng nhập → ngày/giờ đưa vào engine.
   * VN: đúng phép cũ (chỉ đổi giờ, không đổi ngày). Nước ngoài: đổi cả NGÀY khi
   * qua nửa đêm và trả kèm `lich` · `noiSinh` · `goc` (giờ gốc để setData khôi phục).
   */
  function quyDoiGio(ns, ngay, thang, nam, hh, mm) {
    if (!ns || !ngay || !thang || !nam) {
      const vn = toVnHour(hh, mm, 420, ngay, thang, nam);
      return { ngay, thang, nam, gioHour: vn.h, gioPhut: vn.m };
    }
    const q = nsApi().quyDoi({ ngay, thang, nam, gio: hh, phut: mm }, ns.ma, ns.tz);
    return {
      ngay: q.ngay, thang: q.thang, nam: q.nam, gioHour: q.gio, gioPhut: q.phut,
      lich: q.lich, noiSinh: ns.ma, noiSinhTz: ns.tz,
      goc: { ngay, thang, nam, gioHour: hh, gioPhut: mm },
    };
  }

  /** Đổ danh sách vùng của nước đang chọn vào ô `tvf-vung` (ẩn khi nước chỉ một múi). */
  function fillVung(prefix = '', chon) {
    const sel = gel('tvf-vung', prefix);
    if (!sel) return;
    const ma = gel('tvf-noisinh', prefix)?.value || '';
    const vung = ma && nsApi() ? nsApi().vungCuaNuoc(ma) : [];
    sel.innerHTML = vung.map(([tz, ten]) => `<option value="${tz}">${nsApi().tenVung(tz, ten) || tz}</option>`).join('');
    if (chon) sel.value = chon;
    sel.style.display = vung.length > 1 ? '' : 'none';
    const wrap = sel.closest('.tvf-ibox');
    if (wrap) wrap.style.display = sel.style.display;
  }

  // Dropdown "Ngày" liệt kê cố định 1-31 bất kể tháng nào đang chọn — chọn
  // được 31/2 thì lá số tính SAI ÂM THẦM (JD vẫn ra một ngày khác, không báo
  // lỗi). Disable option quá số ngày của tháng NGAY khi tháng/năm đổi, giống
  // <input type=date> gốc, để không bao giờ chọn được ngày không tồn tại —
  // chặn từ gốc thay vì bắt lỗi sau khi submit như mode chat (tuvi-form.js
  // renderChat `err2`). Áp dụng cho MỌI mode dùng <select> ngày/tháng/năm
  // (full/person/compact) vì cả ba đều gọi `_update` qua oninput chung.
  //
  // 🐞 CHỈ disable option, KHÔNG ghi đè `.value` ở đây — trang gọi thường
  // render Ngày→Tháng→Năm theo đúng thứ tự đó, nên chọn Ngày=29 rồi Tháng=2
  // (lúc Năm còn giữ mặc định KHÔNG nhuận) sẽ làm hàm này tính maxDay=28 và
  // GHI ĐÈ ngay lập tức — mất trắng lựa chọn 29, và khi người dùng đổi Năm
  // sang năm nhuận NGAY SAU ĐÓ thì giá trị 29 đã không còn để phục hồi (bắt
  // thật ở /app/van-han-nam, /app/huong-nghiep-tre — ux-tester đợt 3,
  // 2026-09-25). Chốt giá trị cuối cùng ở `getData()` — nơi đọc đủ CẢ BA
  // trường cùng lúc — thay vì chốt sớm mỗi lần một trường đổi.
  function clampNgayForMonth(prefix = '') {
    const thangEl = gel('thang', prefix);
    const namEl   = gel('nam', prefix);
    const ngayEl  = gel('ngay', prefix);
    if (!thangEl || !namEl || !ngayEl) return;
    const thang  = parseInt(thangEl.value) || 1;
    const nam    = parseInt(namEl.value) || new Date().getFullYear();
    const maxDay = new Date(nam, thang, 0).getDate(); // ngày cuối tháng đó, tự xét năm nhuận
    for (const o of ngayEl.options) o.disabled = parseInt(o.value) > maxDay;
  }

  function updateGioAmDisplay(prefix = '') {
    clampNgayForMonth(prefix);
    const hh     = parseInt(gel('tvf-gio', prefix)?.value) || 0;
    const mm     = parseInt(gel('tvf-phut', prefix)?.value) || 0;
    const ngay   = parseInt(gel('ngay', prefix)?.value) || 1;
    const thang  = parseInt(gel('thang', prefix)?.value) || 1;
    const nam    = parseInt(gel('nam', prefix)?.value) || 0;
    const ns     = noiSinhOf(prefix);
    const q      = quyDoiGio(ns, ngay, thang, nam, hh, mm);
    const idx    = hourMinToGioIdx(q.gioHour, q.gioPhut);
    const el     = gel('tvf-gio-am', prefix);
    const elVn   = gel('tvf-gio-vn', prefix);
    if (el)  el.textContent = T('js.tuviform.gio-am','Giờ âm: {chi}',{chi:G('chi',CHI[idx])});
    if (elVn) {
      if (ns && q.lich) {
        const p2 = (n) => String(n).padStart(2,'0');
        elVn.textContent = `→ ${p2(q.ngay)}/${p2(q.thang)} ${p2(q.gioHour)}:${p2(q.gioPhut)} (${TEN_LICH[q.lich] || q.lich})`;
        elVn.style.display = 'block';
      } else {
        elVn.style.display = 'none';
      }
    }
  }

  function toggleUtc(prefix = '') {
    const cb   = gel('tvf-foreign', prefix);
    const wrap = gel('tvf-utc-wrap', prefix);
    if (wrap) wrap.style.display = cb?.checked ? 'block' : 'none';
    if (!cb?.checked) {
      const sel = gel('tvf-noisinh', prefix);
      if (sel) sel.value = '';
    }
    fillVung(prefix);
    updateGioAmDisplay(prefix);
  }

  // Chạm-để-mở tooltip "Giờ sinh" trên mobile — CSS chỉ có :hover, vô dụng trên
  // cảm ứng. iconEl và hộp nội dung là hai con liền kề của .tvf-tooltip-wrap.
  function toggleTip(iconEl) {
    const box = iconEl && iconEl.nextElementSibling;
    if (!box || !box.classList || !box.classList.contains('tvf-tooltip-box')) return;
    const willOpen = !box.classList.contains('tvf-open');
    // Đóng MỌI hộp khác đang mở — hai hộp chồng lên nhau trên màn hình hẹp là
    // không đọc được cái nào.
    document.querySelectorAll('.tvf-tooltip-box.tvf-open').forEach((b) => b.classList.remove('tvf-open'));
    if (willOpen) box.classList.add('tvf-open');
  }
  if (!window.__tvfTipDocBound) {
    window.__tvfTipDocBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.tvf-tooltip-box.tvf-open').forEach((b) => b.classList.remove('tvf-open'));
    });
  }

  // ── Option lists ─────────────────────────────────────────────
  // Ô "Nơi sinh" (thay ô "Múi giờ nơi sinh" UTC cố định cũ — cái đó không biết
  // giờ mùa hè, cũng không biết nơi sinh dùng lịch âm nào). VN không nằm ở đây:
  // bỏ trống ô "Sinh ở ngoài Việt Nam?" chính là VN.
  function noiSinhOptions() {
    const N = nsApi();
    return '<option value="">' + T('js.tuviform.chon-noi-sinh','— Chọn nơi sinh —') + '</option>' +
      (N ? N.NUOC.filter((n) => n[0] !== 'VN').map((n) => `<option value="${n[0]}">${N.tenNuoc(n[0], n[1])}</option>`).join('') : '');
  }

  const TOOLTIP_CONTENT = `<div class="tvf-tooltip-box">
    <div class="tvf-tooltip-title"><span class="ic" data-icon="clock"></span> ${T('js.tuviform.tip-title','Lịch sử múi giờ Việt Nam')}</div>
    <p>${T('js.tuviform.tip-intro','Giờ gốc theo cổ pháp: giờ <b>Tý</b> = 23:00–00:59. Tuy nhiên trong lịch sử, VN đã nhiều lần thay đổi múi giờ:')}</p>
    <ul>
      <li>${T('js.tuviform.tip-li1','<b>1942–09/3/1944</b> (UTC+8): giờ Tý = 00:00–01:59')}</li>
      <li>${T('js.tuviform.tip-li2','<b>09/3/1944–02/9/1945</b> (UTC+9): giờ Tý = 01:00–02:59')}</li>
      <li>${T('js.tuviform.tip-li3','<b>02/9/1945–18/12/1946</b> (UTC+7): giờ Tý = 23:00–00:59')}</li>
      <li>${T('js.tuviform.tip-li4','<b>19/12/1946–30/6/1955</b> (UTC+8): giờ Tý = 00:00–01:59')}</li>
      <li>${T('js.tuviform.tip-li5','<b>01/7/1955–31/12/1959</b> (UTC+7): giờ Tý = 23:00–00:59')}</li>
      <li>${T('js.tuviform.tip-li6','<b>01/1/1960–30/4/1975</b> (UTC+8, miền Nam): giờ Tý = 00:00–01:59')}</li>
      <li>${T('js.tuviform.tip-li7','<b>Từ 01/5/1975</b> (UTC+7): giờ Tý = 23:00–00:59')}</li>
    </ul>
    <p style="color:#888;font-size:11px;margin-top:8px">${T('js.tuviform.tip-auto','Hệ thống tự động điều chỉnh dựa trên ngày tháng năm sinh đã nhập.')}</p>
    <p style="margin-top:10px;padding-top:10px;border-top:1px solid #eee">
      ${T('js.tuviform.tip-khong-nho','<b>Không nhớ giờ sinh?</b> Rất nhiều người không nhớ chính xác — giờ sinh\n      lại quyết định đúng nhiều tool khác trên trang này.\n      <a href="/app/gio-sinh" target="_blank" style="color:#1455A4;font-weight:600">Xác định giờ sinh của bạn →</a>')}
    </p>
  </div>`;

  // ── Shared CSS (injected once) ────────────────────────────────
  let _cssInjected = false;
  function injectCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    const style = document.createElement('style');
    // `id` là dấu hiệu DUY NHẤT `shell-soft-nav.js` dùng để nhận ra đây là
    // style DÙNG CHUNG (đừng gỡ khi đổi trang) chứ không phải khối `<style>`
    // riêng của MỘT app-*.html — thiếu id này soft-nav gỡ mất CSS `.tvf-ic`/
    // `.tvf-chev`/`.tvf-pretty` ở lần đổi trang thứ hai, icon phình to bằng
    // kích thước SVG gốc (thiếu `width/height`) và form vỡ layout.
    style.id = 'tvf-css';
    style.textContent = `
.tvf-gio-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.tvf-gio-row select { flex:1; min-width:60px; }
.tvf-gio-am-wrap { display:flex; flex-direction:column; gap:2px; }
.tvf-gio-am { font-size:12px; color:var(--text-lt); white-space:nowrap; }
.tvf-gio-vn { font-size:11px; color:#1455A4; display:none; }
.tvf-err { font-size:12.5px; color:#B3261E; margin-top:6px; }
.tvf-err:empty { display:none; }
.tvf-tooltip-wrap { position:relative; display:inline-flex; align-items:center; margin-left:4px; cursor:help; }
.tvf-tooltip-icon { width:16px;height:16px;border-radius:50%;background:#e8e0d0;color:#9A7B3A;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1px solid #c9a84c;flex-shrink:0; }
.tvf-tooltip-box { display:none;position:absolute;left:0;top:22px;width:340px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:12px;line-height:1.7;color:var(--text-mid);box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:999; }
.tvf-tooltip-box ul { padding-left:16px; margin:6px 0; }
.tvf-tooltip-box li { margin-bottom:3px; }
.tvf-tooltip-title { font-weight:700; color:var(--navy); margin-bottom:8px; }
.tvf-tooltip-wrap:hover .tvf-tooltip-box { display:block; }
/* Chạm-để-mở cho mobile — hover không tồn tại trên cảm ứng, mà đa số lượt ghé
   là mobile. Lớp .tvf-open do TuviForm._toggleTip() gắn/gỡ khi bấm vào icon. */
.tvf-tooltip-box.tvf-open { display:block; }
@media(max-width:700px){.tvf-tooltip-box{left:auto;right:0;width:280px;}}
/* ── mode:'compact' (app-shell) — chỉ style phần KHÔNG có sẵn trong .frow/.fg của trang gọi ── */
.tvf-compact-foreign { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--text-mid); cursor:pointer; white-space:nowrap; padding-bottom:8px; }
.tvf-compact-foreign input { cursor:pointer; margin:0; }
.tvf-compact-utc { min-width:220px; }
/* ── mode:'compact' — khối form "1 màn hình" (Henry 2026-09-09, mẫu iPhone:
   ô bo góc có icon dẫn đầu). Đây là mặc định MỚI của mode:'compact' — áp
   dụng cho mọi trang /app/* gọi TuviForm ở chế độ này. Truyền pretty:false
   để lùi về khối .frow/.fg cũ (van an toàn, không xoá hẳn). ── */
.tvf-pretty { display:flex; flex-direction:column; gap:13px; margin-bottom:2px; }
.tvf-pretty .tvf-row { display:flex; gap:10px; flex-wrap:wrap; }
.tvf-pretty .tvf-col { flex:1; min-width:88px; display:flex; flex-direction:column; gap:5px; }
.tvf-pretty label.tvf-lb { font-size:10.5px; font-weight:600; color:var(--text-lt); letter-spacing:.04em; text-transform:uppercase; }
.tvf-pretty .tvf-ibox { position:relative; display:flex; align-items:center; }
.tvf-pretty .tvf-ibox .tvf-ic { position:absolute; left:10px; width:15px; height:15px; color:var(--text-lt); pointer-events:none; display:flex; }
.tvf-pretty .tvf-ibox .tvf-ic svg { width:100%; height:100%; }
.tvf-pretty .tvf-ibox input[type=text], .tvf-pretty .tvf-ibox input[type=number] { width:100%; border:1px solid var(--line-2); border-radius:9px; padding:9px 12px 9px 32px; font-size:13.5px; font-family:inherit; color:var(--text); background:var(--paper); outline:none; }
.tvf-pretty .tvf-ibox select { width:100%; appearance:none; -webkit-appearance:none; -moz-appearance:none; border:1px solid var(--line-2); border-radius:9px; padding:9px 26px 9px 32px; font-size:13.5px; font-family:inherit; color:var(--text); background:var(--paper); outline:none; }
.tvf-pretty .tvf-ibox.no-ic select, .tvf-pretty .tvf-ibox.no-ic input { padding-left:12px; }
.tvf-pretty .tvf-ibox .tvf-chev { position:absolute; right:9px; width:13px; height:13px; color:var(--text-lt); pointer-events:none; display:flex; }
.tvf-pretty .tvf-ibox input:focus, .tvf-pretty .tvf-ibox select:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(20,85,164,.12); }
.tvf-pretty .tvf-gio-chip { flex:0 0 auto; align-self:flex-end; border:1px solid var(--gold-soft); background:var(--gold-lt); color:var(--gold-soft); border-radius:9px; padding:8.5px 12px; font-size:12px; font-weight:600; white-space:nowrap; display:flex; align-items:center; gap:5px; margin-bottom:0; }
.tvf-pretty .tvf-gio-vn { flex-basis:100%; }
.tvf-pretty .tvf-foreign-label { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text); cursor:pointer; }
.tvf-pretty .tvf-foreign-label input { width:16px; height:16px; cursor:pointer; margin:0; }
.tvf-pretty .tvf-foreign-hint { font-size:11.5px; color:var(--text-lt); margin:2px 0 0 24px; }
/* Sổ lá số trong chat (renderChat) — bong bóng "Con hỏi cho ai?", mỗi mục
   một lá số đã lưu + một chip "Người mới" luôn đứng cuối. */
.tvf-saved-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
.tvf-saved-chip { display:flex; flex-direction:column; align-items:flex-start; gap:2px; border:1px solid var(--line-2); background:var(--white); border-radius:10px; padding:7px 12px; font-family:inherit; font-size:13px; color:var(--text); cursor:pointer; text-align:left; }
.tvf-saved-chip:hover { border-color:var(--gold-soft); color:var(--gold-soft); }
.tvf-saved-chip span { font-size:11px; color:var(--text-lt); }
.tvf-saved-chip.tvf-saved-new { border-style:dashed; color:var(--text-lt); }
`;
    document.head.appendChild(style);
  }

  // ── Build option strings (shared) ───────────────────────────
  // Năm sinh: 1900–2070, mặc định 1985 nằm ĐÚNG GIỮA danh sách (85 năm mỗi
  // bên) — thao tác một tay trên điện thoại thì mở dropdown là thấy ngay giá
  // trị mặc định ở giữa màn, không phải cuộn tìm.
  const NAM_MIN = 1900, NAM_MAX = 2070, NAM_DEFAULT = 1985;
  function buildOptions() {
    let gioOpts = '', phutOpts = '', ngayOpts = '<option value="">' + T('js.tuviform.ngay','Ngày') + '</option>', thangOpts = '<option value="">' + T('js.tuviform.thang','Tháng') + '</option>', namOpts = '';
    for (let i = 0; i <= 23; i++) gioOpts  += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    for (let i = 0; i <= 59; i++) phutOpts += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    for (let i = 1; i <= 31; i++) ngayOpts  += `<option value="${i}">${i}</option>`;
    for (let i = 1; i <= 12; i++) thangOpts += `<option value="${i}">${i}</option>`;
    for (let i = NAM_MIN; i <= NAM_MAX; i++) namOpts += `<option value="${i}"${i===NAM_DEFAULT?' selected':''}>${i}</option>`;
    const utcOpts = noiSinhOptions();
    return { gioOpts, phutOpts, ngayOpts, thangOpts, namOpts, utcOpts };
  }

  // ── Person fields block (dùng chung cho cả full và person mode) ──
  function buildPersonFields(prefix, opts, defaultGioitinh = 'nam', showNameYear = true) {
    const { gioOpts, phutOpts, ngayOpts, thangOpts, namOpts, utcOpts } = opts;
    const pf = prefix ? `'${prefix}'` : "''";
    return `
    ${showNameYear ? `
    <div class="form-group">
      <label class="form-label">${T('js.tuviform.ho-ten','Họ và tên')}</label>
      <input class="form-input" type="text" id="${pid('hoten',prefix)}" placeholder="${T('js.tuviform.ten-mau','Nguyễn Văn A')}" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label">${T('js.tuviform.gioi-tinh','Giới tính')}</label>
      <select class="form-input" id="${pid('gioitinh',prefix)}">
        <option value="nam"${defaultGioitinh==='nam'?' selected':''}>${T('js.tuviform.gt-nam','Nam')}</option>
        <option value="nu"${defaultGioitinh==='nu'?' selected':''}>${T('js.tuviform.gt-nu','Nữ')}</option>
      </select>
    </div>` : ''}
    <div class="form-group">
      <label class="form-label">${T('js.tuviform.ngay-thang-nam-sinh','Ngày / Tháng / Năm sinh')}</label>
      <div class="form-row-3">
        <select class="form-input" id="${pid('ngay',prefix)}" oninput="TuviForm._update(${pf})">${ngayOpts}</select>
        <select class="form-input" id="${pid('thang',prefix)}" oninput="TuviForm._update(${pf})">${thangOpts}</select>
        <select class="form-input" id="${pid('nam',prefix)}" oninput="TuviForm._update(${pf})">${namOpts}</select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="${pid('tvf-foreign',prefix)}" onchange="TuviForm._toggleUtc(${pf})" style="cursor:pointer">
        <span>${T('js.tuviform.ngoai-vn','Sinh ở ngoài Việt Nam?')}</span>
      </label>
      <div id="${pid('tvf-utc-wrap',prefix)}" style="display:none;margin-top:6px">
        <label class="form-label">${T('js.tuviform.noi-sinh','Nơi sinh')}</label>
        <select class="form-input" id="${pid('tvf-noisinh',prefix)}" oninput="TuviForm._noiSinh(${pf})">${utcOpts}</select>
        <select class="form-input" id="${pid('tvf-vung',prefix)}" oninput="TuviForm._update(${pf})" style="display:none;margin-top:6px"></select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:4px">
        ${T('js.tuviform.gio-sinh','Giờ sinh')}
        <span class="tvf-tooltip-wrap">
          <span class="tvf-tooltip-icon" onclick="event.stopPropagation();TuviForm._toggleTip(this)">?</span>
          ${TOOLTIP_CONTENT}
        </span>
      </label>
      <div class="tvf-gio-row">
        <select class="form-input" id="${pid('tvf-gio',prefix)}" oninput="TuviForm._update(${pf})">${gioOpts}</select>
        <select class="form-input" id="${pid('tvf-phut',prefix)}" oninput="TuviForm._update(${pf})">${phutOpts}</select>
        <div class="tvf-gio-am-wrap">
          <span class="tvf-gio-am" id="${pid('tvf-gio-am',prefix)}">${T('js.tuviform.gio-am','Giờ âm: {chi}',{chi:G('chi','Tý')})}</span>
          <span class="tvf-gio-vn" id="${pid('tvf-gio-vn',prefix)}"></span>
        </div>
      </div>
    </div>`;
  }

  // ── Compact fields (dùng .frow/.fg/.tooltip đã có sẵn của trang app-shell gọi) ──
  function buildCompactPersonFields(prefix, opts, defaultGioitinh = 'nam', showName = true, showNamXem = false) {
    const { gioOpts, phutOpts, ngayOpts, thangOpts, namOpts, utcOpts } = opts;
    const pf = prefix ? `'${prefix}'` : "''";
    const namXemDefault = new Date().getFullYear();
    return `
    <div class="frow">
      ${showName ? `<div class="fg" style="flex:2;min-width:150px"><label>${T('js.tuviform.ho-ten','Họ và tên')}</label><input type="text" id="${pid('hoten',prefix)}" placeholder="${T('js.tuviform.ten-mau','Nguyễn Văn A')}" autocomplete="off"></div>` : ''}
      <div class="fg" style="width:90px"><label>${T('js.tuviform.gioi-tinh','Giới tính')}</label>
        <select id="${pid('gioitinh',prefix)}">
          <option value="nam"${defaultGioitinh==='nam'?' selected':''}>${T('js.tuviform.gt-nam','Nam')}</option>
          <option value="nu"${defaultGioitinh==='nu'?' selected':''}>${T('js.tuviform.gt-nu','Nữ')}</option>
        </select>
      </div>
      ${showNamXem ? `<div class="fg" style="width:90px"><label>${T('js.tuviform.nam-xem-van','Năm xem vận')}</label><input type="number" id="${pid('namXem',prefix)}" value="${namXemDefault}" min="1900" max="2100"></div>` : ''}
    </div>
    <div class="frow">
      <div class="fg" style="width:74px"><label>${T('js.tuviform.ngay','Ngày')}</label><select id="${pid('ngay',prefix)}" oninput="TuviForm._update(${pf})">${ngayOpts}</select></div>
      <div class="fg" style="width:82px"><label>${T('js.tuviform.thang','Tháng')}</label><select id="${pid('thang',prefix)}" oninput="TuviForm._update(${pf})">${thangOpts}</select></div>
      <div class="fg" style="width:90px"><label>${T('js.tuviform.nam','Năm')}</label><select id="${pid('nam',prefix)}" oninput="TuviForm._update(${pf})">${namOpts}</select></div>
      <div class="fg" style="width:70px"><label style="display:flex;align-items:center;gap:3px">${T('js.tuviform.gio','Giờ')}<span class="tvf-tooltip-wrap"><span class="tvf-tooltip-icon" onclick="event.stopPropagation();TuviForm._toggleTip(this)">?</span>${TOOLTIP_CONTENT}</span></label><select id="${pid('tvf-gio',prefix)}" oninput="TuviForm._update(${pf})">${gioOpts}</select></div>
      <div class="fg" style="width:70px"><label>${T('js.tuviform.phut','Phút')}</label><select id="${pid('tvf-phut',prefix)}" oninput="TuviForm._update(${pf})">${phutOpts}</select></div>
      <div class="tvf-gio-am-wrap"><span class="tvf-gio-am" id="${pid('tvf-gio-am',prefix)}">${T('js.tuviform.gio-am','Giờ âm: {chi}',{chi:G('chi','Tý')})}</span><span class="tvf-gio-vn" id="${pid('tvf-gio-vn',prefix)}"></span></div>
    </div>
    <div class="frow" style="align-items:flex-start">
      <label class="tvf-compact-foreign">
        <input type="checkbox" id="${pid('tvf-foreign',prefix)}" onchange="TuviForm._toggleUtc(${pf})">
        ${T('js.tuviform.ngoai-vn','Sinh ở ngoài Việt Nam?')}
      </label>
      <div class="fg tvf-compact-utc" id="${pid('tvf-utc-wrap',prefix)}" style="display:none">
        <label>${T('js.tuviform.noi-sinh','Nơi sinh')}</label>
        <select id="${pid('tvf-noisinh',prefix)}" oninput="TuviForm._noiSinh(${pf})">${utcOpts}</select>
        <select id="${pid('tvf-vung',prefix)}" oninput="TuviForm._update(${pf})" style="display:none;margin-top:6px"></select>
      </div>
    </div>`;
  }

  // ── Compact fields, bản "1 màn hình" (mode:'compact', pretty:true) ──
  // Ô bo góc + icon dẫn đầu (mockup Henry 2026-09-09). Giới tính GIỮ dropdown
  // như bản cũ (Henry chốt 2026-09-09, bỏ bản thử 2 nút Nam/Nữ) — chỉ đổi vỏ
  // ngoài sang cùng khuôn `.tvf-ibox` với các ô khác cho đồng bộ hình.
  function buildPrettyCompactFields(prefix, opts, defaultGioitinh = 'nam', showName = true, showNamXem = false) {
    const { gioOpts, phutOpts, ngayOpts, thangOpts, namOpts, utcOpts } = opts;
    const pf = prefix ? `'${prefix}'` : "''";
    const isNam = defaultGioitinh !== 'nu';
    const namXemDefault = new Date().getFullYear();
    return `
    <div class="tvf-pretty">
      <div class="tvf-row">
        ${showName ? `<div class="tvf-col" style="flex:1.6;min-width:150px">
          <label class="tvf-lb">${T('js.tuviform.ho-ten','Họ và tên')}</label>
          <div class="tvf-ibox"><span class="tvf-ic" data-icon="user"></span><input type="text" id="${pid('hoten',prefix)}" placeholder="${T('js.tuviform.ten-mau-vd','Ví dụ: Nguyễn Văn A')}" autocomplete="off"></div>
        </div>` : ''}
        <div class="tvf-col" style="flex:0 0 110px">
          <label class="tvf-lb">${T('js.tuviform.gioi-tinh','Giới tính')}</label>
          <div class="tvf-ibox no-ic">
            <select id="${pid('gioitinh',prefix)}">
              <option value="nam"${isNam?' selected':''}>${T('js.tuviform.gt-nam','Nam')}</option>
              <option value="nu"${isNam?'':' selected'}>${T('js.tuviform.gt-nu','Nữ')}</option>
            </select>
            <span class="tvf-chev" data-icon="chevron-down"></span>
          </div>
        </div>
        ${showNamXem ? `<div class="tvf-col" style="flex:0 0 110px">
          <label class="tvf-lb">${T('js.tuviform.nam-xem-van','Năm xem vận')}</label>
          <div class="tvf-ibox no-ic"><input type="number" id="${pid('namXem',prefix)}" value="${namXemDefault}" min="1900" max="2100"></div>
        </div>` : ''}
      </div>
      <div class="tvf-row">
        <div class="tvf-col"><label class="tvf-lb">${T('js.tuviform.ngay-sinh','Ngày sinh')}</label><div class="tvf-ibox"><span class="tvf-ic" data-icon="calendar"></span><select id="${pid('ngay',prefix)}" oninput="TuviForm._update(${pf})">${ngayOpts}</select><span class="tvf-chev" data-icon="chevron-down"></span></div></div>
        <div class="tvf-col"><label class="tvf-lb">${T('js.tuviform.thang-sinh','Tháng sinh')}</label><div class="tvf-ibox"><span class="tvf-ic" data-icon="calendar"></span><select id="${pid('thang',prefix)}" oninput="TuviForm._update(${pf})">${thangOpts}</select><span class="tvf-chev" data-icon="chevron-down"></span></div></div>
        <div class="tvf-col"><label class="tvf-lb">${T('js.tuviform.nam-sinh','Năm sinh')}</label><div class="tvf-ibox"><span class="tvf-ic" data-icon="calendar"></span><select id="${pid('nam',prefix)}" oninput="TuviForm._update(${pf})">${namOpts}</select><span class="tvf-chev" data-icon="chevron-down"></span></div></div>
      </div>
      <div class="tvf-row">
        <div class="tvf-col" style="flex:0 0 96px"><label class="tvf-lb">${T('js.tuviform.gio-sinh','Giờ sinh')}</label><div class="tvf-ibox"><span class="tvf-ic" data-icon="clock"></span><select id="${pid('tvf-gio',prefix)}" oninput="TuviForm._update(${pf})">${gioOpts}</select><span class="tvf-chev" data-icon="chevron-down"></span></div></div>
        <div class="tvf-col" style="flex:0 0 88px"><label class="tvf-lb">${T('js.tuviform.phut','Phút')}</label><div class="tvf-ibox no-ic"><select id="${pid('tvf-phut',prefix)}" oninput="TuviForm._update(${pf})">${phutOpts}</select><span class="tvf-chev" data-icon="chevron-down"></span></div></div>
        <div class="tvf-gio-chip">
          <span id="${pid('tvf-gio-am',prefix)}">${T('js.tuviform.gio-am','Giờ âm: {chi}',{chi:G('chi','Tý')})}</span>
          <span class="tvf-tooltip-wrap" style="margin-left:0"><span class="tvf-tooltip-icon" onclick="event.stopPropagation();TuviForm._toggleTip(this)">?</span>${TOOLTIP_CONTENT}</span>
        </div>
        <span class="tvf-gio-vn" id="${pid('tvf-gio-vn',prefix)}"></span>
      </div>
      <div class="tvf-row">
        <div style="display:flex;flex-direction:column;gap:5px;width:100%">
          <label class="tvf-foreign-label">
            <input type="checkbox" id="${pid('tvf-foreign',prefix)}" onchange="TuviForm._toggleUtc(${pf})">
            <span>${T('js.tuviform.ngoai-vn','Sinh ở ngoài Việt Nam?')}</span>
          </label>
          <span class="tvf-foreign-hint">${T('js.tuviform.ngoai-goi-y','Chọn nếu bạn sinh tại nước ngoài — hệ thống tự tính múi giờ, giờ mùa hè và lịch âm của nơi sinh.')}</span>
          <div class="tvf-col" id="${pid('tvf-utc-wrap',prefix)}" style="display:none;margin:6px 0 0 24px;max-width:280px">
            <label class="tvf-lb">${T('js.tuviform.noi-sinh','Nơi sinh')}</label>
            <div class="tvf-ibox no-ic"><select id="${pid('tvf-noisinh',prefix)}" oninput="TuviForm._noiSinh(${pf})">${utcOpts}</select><span class="tvf-chev" data-icon="chevron-down"></span></div>
            <div class="tvf-ibox no-ic" style="display:none;margin-top:6px"><select id="${pid('tvf-vung',prefix)}" oninput="TuviForm._update(${pf})"></select><span class="tvf-chev" data-icon="chevron-down"></span></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── render() ─────────────────────────────────────────────────
  function render(containerId, options = {}) {
    injectCss();
    const {
      onSubmit,
      submitLabel   = T('js.tuviform.luan-giai-la-so','Luận Giải Lá Số →'),
      prefix        = '',
      mode          = 'full',     // 'full' | 'person' | 'compact'
      label         = mode === 'person' ? T('js.tuviform.thong-tin','Thông Tin') : T('js.tuviform.ca-nhan','Cá Nhân'),
      gioitinh      = 'nam',
      showSample    = true,
      showName      = true,       // mode:'compact' only — false nếu tool không cần Họ và tên
      showNamXem    = false,      // mode:'compact' only — true nếu tool cần Năm xem vận (khớp field mode:'full')
      pretty        = true,       // mode:'compact' only — mặc định khối "1 màn hình" (ô bo góc + icon); false = khối .frow/.fg cũ
    } = options;

    const namXemDefault = new Date().getFullYear();
    const opts = buildOptions();
    const pf = prefix ? `'${prefix}'` : "''";

    let html = '';

    if (mode === 'compact') {
      // ── App-shell: chỉ trường người, tái dùng .frow/.fg/.btn-go sẵn có của trang gọi ──
      html = pretty
        ? buildPrettyCompactFields(prefix, opts, gioitinh, showName, showNamXem)
        : buildCompactPersonFields(prefix, opts, gioitinh, showName, showNamXem);
    } else if (mode === 'person') {
      // ── Compact: chỉ 1 cột — dùng cho xem-tuoi (2 người cạnh nhau) ──
      html = `<div class="form-col" style="border-right:1px solid var(--border)">
        <div class="form-col-title">${label}</div>
        ${buildPersonFields(prefix, opts, gioitinh, true)}
      </div>`;
    } else {
      // ── Full: 3-column layout — dùng cho luan-giai ──
      html = `<div class="form-grid">
        <div class="form-col">
          <div class="form-col-title">${T('js.tuviform.ca-nhan','Cá Nhân')}</div>
          <div class="form-group">
            <label class="form-label">${T('js.tuviform.ho-ten','Họ và tên')}</label>
            <input class="form-input" type="text" id="${pid('hoten',prefix)}" placeholder="${T('js.tuviform.ten-mau','Nguyễn Văn A')}" autocomplete="name" />
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label class="form-label">${T('js.tuviform.gioi-tinh','Giới tính')}</label>
              <select class="form-input" id="${pid('gioitinh',prefix)}">
                <option value="nam">${T('js.tuviform.gt-nam','Nam')}</option>
                <option value="nu">${T('js.tuviform.gt-nu','Nữ')}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${T('js.tuviform.nam-xem-van','Năm xem vận')}</label>
              <input class="form-input" type="number" id="${pid('namXem',prefix)}" value="${namXemDefault}" min="1900" max="2100" />
            </div>
          </div>
        </div>

        <div class="form-col">
          <div class="form-col-title">${T('js.tuviform.ngay-sinh-duong','Ngày Sinh Dương Lịch')}</div>
          ${buildPersonFields(prefix, opts, gioitinh, false)}
        </div>

        <div class="form-col">
          <div class="form-col-title">${T('js.tuviform.thuc-thi','Thực Thi')}</div>
          <p style="font-size:14px;color:var(--text-lt);line-height:1.7;margin-bottom:28px;font-style:italic">
            ${T('js.tuviform.dien-day-du','Điền đầy đủ thông tin bên trái — ngày tháng năm sinh dương lịch và giờ sinh — rồi bấm luận giải.')}
          </p>
          <div class="btn-group-submit">
            <button class="btn-submit" id="${pid('tvf-submit-btn',prefix)}">${submitLabel}</button>
            ${showSample ? `<div style="text-align:center;margin-top:10px">
              <a href="/tai-mau/mau-luan-giai-la-so.pdf"
                 target="_blank" rel="noopener"
                 style="font-size:12px;color:var(--gold);text-decoration:none;display:inline-flex;align-items:center;gap:5px;opacity:0.8;transition:opacity 0.15s"
                 onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                <span class="ic" data-icon="chevron-down"></span><span>${T('js.tuviform.xem-mau-pdf','Xem mẫu luận giải PDF')}</span>
              </a>
            </div>` : ''}
          </div>
        </div>
      </div>`;
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
      // Icon trong TOOLTIP_CONTENT/liên kết mẫu PDF được dựng bằng `<span
      // data-icon>` chứ không nội suy trực tiếp `window.iconHtml()` — file này
      // (const TOOLTIP_CONTENT ở top-level) chạy TRƯỚC khi nav.js kịp thực thi
      // ở nhiều trang (tuvi-form.js nạp sớm hơn nav.js trong HTML), nên gọi
      // `iconHtml` ngay lúc parse module sẽ luôn ra rỗng. Mount LẠI ở đây, sau
      // khi DOM đã tồn tại thật, để không phụ thuộc thứ tự nạp script.
      if (window.mountIcons) window.mountIcons(container);
      // 🔑 Form TỰ KHAI mình là form lá số, kèm prefix. `user-charts.js` dò theo
      // dấu này để gắn thanh "Sổ lá số".
      //
      // Trước đây nó dò theo TÊN id (`/formhost/i`) — mà tên là thứ mỗi trang tự
      // đặt, nên `app-xem-tuoi` (id `a-fields`/`b-fields`) dùng đúng khuôn
      // TuviForm mà vẫn KHÔNG có sổ, và không có gì báo. Chú thích của chính bộ
      // dò cũ đã lo đúng chuyện đó ("trang nào quên là trang đó âm thầm không có
      // sổ") rồi lại dò theo tên — tức tái tạo đúng cái hố nó muốn tránh.
      //
      // Đặt SAU `innerHTML`: dấu chỉ xuất hiện khi các field đã tồn tại thật.
      container.setAttribute('data-tvf-form', prefix);
      const btn = document.getElementById(pid('tvf-submit-btn', prefix));
      if (btn && onSubmit) btn.addEventListener('click', onSubmit);
      _updaters[prefix] = () => updateGioAmDisplay(prefix);
      updateGioAmDisplay(prefix);
    }
  }

  // ── getData(prefix) ──────────────────────────────────────────
  function getData(prefix = '') {
    const hh     = parseInt(gel('tvf-gio', prefix)?.value) || 0;
    const mm     = parseInt(gel('tvf-phut', prefix)?.value) || 0;
    let   ngay   = parseInt(gel('ngay', prefix)?.value) || 0;
    const thang  = parseInt(gel('thang', prefix)?.value) || 0;
    const nam    = parseInt(gel('nam', prefix)?.value) || 0;
    // Chốt "Ngày" hợp lệ TẠI ĐÂY — đọc đủ cả ba trường cùng lúc, không chốt
    // sớm như `clampNgayForMonth` (chỉ disable option, xem chú thích ở đó).
    if (ngay && thang && nam) {
      const maxDay = new Date(nam, thang, 0).getDate();
      if (ngay > maxDay) ngay = maxDay;
    }
    // Sinh ở VN: shape y như cũ. Nước ngoài: ngay/thang/nam/gio* là giờ CỦA LỊCH
    // nơi sinh, kèm `lich` (đưa vào engine + API) · `noiSinh` · `noiSinhTz` · `goc`.
    const q = quyDoiGio(noiSinhOf(prefix), ngay, thang, nam, hh, mm);
    const out = {
      hoten:    (gel('hoten', prefix)?.value || '').trim(),
      ngay:     q.ngay, thang: q.thang, nam: q.nam,
      gioIdx:   hourMinToGioIdx(q.gioHour, q.gioPhut),
      gioHour:  q.gioHour,
      gioPhut:  q.gioPhut,
      gioitinh: gel('gioitinh', prefix)?.value || 'nam',
      namXem:   parseInt(gel('namXem', prefix)?.value) || new Date().getFullYear(),
    };
    if (q.lich) Object.assign(out, { lich: q.lich, noiSinh: q.noiSinh, noiSinhTz: q.noiSinhTz, goc: q.goc });
    return out;
  }

  // ── setData(d, prefix) ───────────────────────────────────────
  function setData(d, prefix = '') {
    if (!d) return;
    const s = (id, val) => { const el = gel(id, prefix); if (el && val !== undefined) el.value = val; };
    // Bản ghi từ nơi sinh nước ngoài: khôi phục GIỜ GỐC + nơi sinh (không thì
    // getData lần sau đổi múi giờ LẦN HAI). Bản ghi cũ / sinh ở VN: như trước.
    const cb = gel('tvf-foreign', prefix);
    if (d.goc && d.noiSinh && d.noiSinh !== 'VN') {
      d = Object.assign({}, d, d.goc);
      if (cb) cb.checked = true;
      const wrap = gel('tvf-utc-wrap', prefix);
      if (wrap) wrap.style.display = 'block';
      s('tvf-noisinh', d.noiSinh);
      fillVung(prefix, d.noiSinhTz);
    } else if (cb && cb.checked && d.ngay !== undefined) {
      cb.checked = false;
      toggleUtc(prefix);
    }
    s('hoten',    d.hoten);
    s('ngay',     d.ngay);
    s('thang',    d.thang);
    s('nam',      d.nam);
    s('gioitinh', d.gioitinh);
    s('namXem',   d.namXem);
    if (d.gioHour !== undefined) {
      s('tvf-gio',  d.gioHour);
      s('tvf-phut', d.gioPhut ?? 0);
    } else if (d.gioIdx !== undefined) {
      // 🐞 Bản cũ dùng `gioIdx*2 + 1` → LỆCH ĐÚNG MỘT CHI, im lặng: địa chi k phủ
      // khung giờ [2k−1, 2k+1) (Tý = 23–01, Sửu = 01–03), nên giờ đại diện là
      // 2k, không phải 2k+1. Với k=0 nó điền 01:00 → hourMinToGioIdx trả 1 = Sửu.
      // Nhánh này lâu nay KHÔNG có ai đi vào (mọi nơi gọi setData đều truyền
      // gioHour) nên lỗi nằm im — `xem-tuoi.html` khi phải tự quy đổi cũng viết
      // `gioA*2`, tức đúng công thức này.
      s('tvf-gio',  (d.gioIdx * 2) % 24);
      s('tvf-phut', 0);
    }
    updateGioAmDisplay(prefix);
  }

  // Xoá NGƯỜI, giữ NGÀY LUẬN (namXem) — namXem là thiết lập của trang (năm
  // đang xem), không phải dữ kiện của người đang nhập, đổi chủ thể không nên
  // đụng vào. Dùng khi form cần trống để nhập một người KHÁC (vd tool đang
  // xem xong lá số vợ, giờ nhập tiếp cho bố mẹ).
  function clear(prefix = '') {
    setData({ hoten: '', ngay: '', thang: '', nam: '', gioitinh: 'nam', gioHour: 0, gioPhut: 0 }, prefix);
  }

  // ── renderChat(options) — Bước 6: hội thoại từng bước thay form-card ──
  // Dựng 3 bong bóng hỏi-đáp (tên+giới tính[+năm luận] / ngày sinh / giờ
  // sinh) NGAY trong #chat, dùng id RIÊNG (prefix 'c'+prefix, KHÔNG đụng các
  // field thật của `render()`) — lý do giống hệt bước 5 (app-than-so-hoc):
  // `Shell.setContext()` → `greet()` ghi đè `chat.innerHTML` toàn bộ lúc
  // chào, di chuyển thẳng field thật vào đó sẽ làm chúng biến mất vĩnh viễn.
  // Nộp xong mới quy đổi giờ sinh sang VN (cùng `toVnHour` mà getData() dùng)
  // rồi `setData()` vào field thật (prefix gốc, thường đang ẩn trong
  // `#birthPanel`) — trang gọi `onDone()` rồi tự chạy hàm tính TOÁN CŨ,
  // không đổi gì ở tầng đó. Field thật vẫn là nguồn cho `getData()`/"Sửa".
  function renderChat(options = {}) {
    injectCss();
    const {
      prefix     = '',
      gioitinh   = 'nam',
      showName   = true,
      showGender = true,
      showNamXem = false,
      skipHour   = false, // than-so-hoc: không cần giờ sinh — dừng sau bước 2
      requireName = false, // than-so-hoc: tính TỪ họ tên, trống là trang báo lỗi vào #birthPanel đang ẩn ⇒ kẹt
      submitLabel = T('js.tuviform.tiep-tuc','Tiếp tục →'),
      // false = không đắp bong bóng "Con hỏi cho ai?" từ Sổ lá số. Luồng mời
      // thêm lá số NGƯỜI NHÀ (shell.js) cần một người MỚI, và bấm chip ở đó còn
      // gọi `Shell.rememberBirth` — đổi luôn lá số đang nhớ của chính người hỏi.
      savedPicker = true,
      q1 = showName
        ? (showGender ? T('js.tuviform.q1-ten-gt','Cho thầy xin họ tên và giới tính của con nhé.') : T('js.tuviform.q1-ten','Cho thầy xin họ tên đầy đủ của con nhé.'))
        : T('js.tuviform.q1-gt','Giới tính của con là gì?'),
      q2 = T('js.tuviform.q2','Ngày sinh dương lịch của con là ngày nào?'),
      q3 = T('js.tuviform.q3','Giờ sinh của con là mấy giờ?'),
      onDone: onDoneRaw,
    } = options;
    const chat = document.getElementById('chat');
    if (!chat) return;
    // Form gõ tay và bong bóng "sổ lá số" chạy SONG SONG (xem chú thích dưới)
    // — người dùng có thể lý thuyết hoàn tất cả hai (gõ xong step3 ĐÚNG lúc
    // sổ vừa tải xong và họ bấm một lá số cũ). Khoá lại còn ĐÚNG MỘT lần gọi.
    let _done = false;
    const onDone = onDoneRaw ? (data) => { if (_done) return; _done = true; onDoneRaw(data); } : undefined;
    const empty = document.getElementById('railEmpty');
    if (empty) empty.style.display = 'none';
    // Câu mở đầu (Henry 2026-09-23: bấm tool/nút Chat rồi thấy thẳng cái form
    // xin họ tên, không biết đang dùng tool gì) — LẤY NGUYÊN chữ đã có sẵn ở
    // box giới thiệu tĩnh `#introHost .intro-t/.intro-d` (shell.js `introOnce`
    // đã dựng xong TRƯỚC dòng này chạy, xem thứ tự DOMContentLoaded trong
    // shell.js) thay vì viết một bản chép tay thứ hai — đúng luật "một nguồn
    // chữ" trong CLAUDE.md. Chỉ hiện 1 lần/trang dù renderChat() gọi lại cho
    // người thứ hai (xem-tuoi, tương hợp…).
    if (!_introShown) {
      _introShown = true;
      const introT = document.querySelector('#introHost .intro-t');
      const introD = document.querySelector('#introHost .intro-d');
      const title = introT ? introT.textContent.trim() : '';
      const desc = introD ? introD.textContent.trim() : '';
      if (title || desc) {
        const av = () => { const a = document.querySelector('.rail-ava'); return a ? a.src : '/authors/thai-hu.jpg'; };
        const el = document.createElement('div');
        el.className = 'msg a';
        el.innerHTML = '<img class="msg-ava" src="' + av() + '" alt="">' +
          '<div class="msg-body"><p>' + (title ? '<b>' + esc(title) + '</b><br>' : '') + esc(desc) + '</p></div>';
        chat.appendChild(el);
      }
    }
    const cp = 'c' + (prefix || 'x'); // prefix RIÊNG cho field ảo trong chat — không trùng field thật
    // Draft nháp qua reload (audit W1 J5, 2026-09-26): reload giữa chừng
    // trước đây mất TOÀN BỘ đã gõ, quay lại step 1 không cảnh báo. Lưu vào
    // `sessionStorage` (mất khi đóng tab — không phải dữ liệu cần giữ lâu),
    // khoá theo TRANG + `cp` nên hai renderChat() khác `prefix` trên cùng
    // trang (vd tương hợp 2 người) không đụng nhau. Chỉ lưu SAU khi qua được
    // validate của từng bước — không lưu dữ liệu chưa hợp lệ.
    const draftKey = 'tvf_draft_' + cp + '_' + location.pathname;
    const draft = (() => {
      try { const d = JSON.parse(sessionStorage.getItem(draftKey) || 'null'); return d && typeof d === 'object' ? d : null; }
      catch (e) { return null; }
    })();
    const saveDraft = (step, data) => { try { sessionStorage.setItem(draftKey, JSON.stringify({ step, ...data })); } catch (e) { /* ignore */ } };
    const clearDraft = () => { try { sessionStorage.removeItem(draftKey); } catch (e) { /* ignore */ } };
    const opts = buildOptions();
    const namXemDefault = new Date().getFullYear();
    const av = () => { const a = document.querySelector('.rail-ava'); return a ? a.src : '/authors/thai-hu.jpg'; };
    const bubble = (id, html) => {
      const el = document.createElement('div');
      el.className = 'msg a'; el.id = id;
      el.innerHTML = '<img class="msg-ava" src="' + av() + '" alt="">' + '<div class="msg-body">' + html + '</div>';
      chat.appendChild(el); chat.scrollTop = chat.scrollHeight;
      return el;
    };
    const collapse = (el, html) => {
      el.innerHTML = '<img class="msg-ava" src="' + av() + '" alt="">' + '<div class="msg-body">' + html + '</div>';
    };

    const collapsedS1Html = (hoten, gioitinhV, namXemV) => {
      const parts = [];
      if (hoten) parts.push('<b>' + esc(hoten) + '</b>');
      if (showGender) parts.push(gioitinhV === 'nam' ? T('js.tuviform.gt-nam','Nam') : T('js.tuviform.gt-nu','Nữ'));
      if (namXemV) parts.push(T('js.tuviform.xem-van-nam','xem vận năm {n}',{n:namXemV}));
      return '<p>' + parts.join(' · ') + ' ✓</p>';
    };

    // ── Sổ lá số trong chat (Henry 2026-09-26) ──────────────────────────────
    // Form gõ tay (startManual) LUÔN dựng NGAY — hành vi cũ không đổi, kể cả
    // khi có sổ (test `mobile.spec.ts` "bước hỏi tên/giới tính" đợi #cx-hoten
    // hiện gần như ngay lập tức, không đợi mạng). Sổ lá số (nếu đăng nhập và
    // có mục) chỉ ĐẮP THÊM một bong bóng "Con hỏi cho ai?" đứng SAU, cho bấm
    // tắt thay vì gõ lại — best-effort, tới muộn/hỏng thì thôi, không chặn gì.
    let manualBubbles = []; // bong bóng của flow gõ tay/khôi phục draft — ẩn hết nếu chọn từ sổ
    function birthShort(b) {
      if (!b) return '';
      const g = b.gioitinh === 'nu' ? T('js.tuviform.gt-nu','Nữ') : T('js.tuviform.gt-nam','Nam');
      return g + ' · ' + (b.ngay || '?') + '/' + (b.thang || '?') + '/' + (b.nam || '?');
    }
    function finishWithBirth(birth) {
      if (showNamXem) { askNamXem(birth); return; }
      setData(birth, prefix);
      if (onDone) onDone(Object.assign({}, birth));
    }
    function askNamXem(birth) {
      const s = bubble('chatStep-' + cp + '-namxem', '<p>' + T('js.tuviform.con-muon-xem-nam','Con muốn xem vận năm nào?') + '</p>' +
        '<div class="frow"><div class="fg" style="width:90px"><label>' + T('js.tuviform.nam-xem-van','Năm xem vận') + '</label>' +
        `<input type="number" id="${cp}-namxem-only" value="${namXemDefault}" min="1900" max="2100"></div></div>` +
        `<button class="btn-go" type="button" id="${cp}-namxem-next" style="width:auto;padding:9px 16px;font-size:13px">${submitLabel}</button>`);
      document.getElementById(cp + '-namxem-next').addEventListener('click', () => {
        const namXemV = parseInt(document.getElementById(cp + '-namxem-only').value) || namXemDefault;
        collapse(s, '<p>' + T('js.tuviform.xem-van-nam-ok','Xem vận năm <b>{n}</b> ✓',{n:namXemV}) + '</p>');
        const birthWithYear = Object.assign({}, birth, { namXem: namXemV });
        setData(birthWithYear, prefix);
        if (onDone) onDone(birthWithYear);
      });
    }
    function renderSavedPicker(items) {
      const el = bubble('chatStep-' + cp + '-saved', '<p>' + T('js.tuviform.con-hoi-cho-ai','Con hỏi cho ai?') + '</p>' +
        '<div class="tvf-saved-chips">' +
        items.map((it) => {
          const name = esc(it.label || (it.birth && it.birth.hoten) || T('js.tuviform.khong-ten','Không tên'));
          const sub = esc(birthShort(it.birth));
          return `<button type="button" class="tvf-saved-chip" data-id="${esc(it.id)}">${name}<span>${sub}</span></button>`;
        }).join('') +
        '<button type="button" class="tvf-saved-chip tvf-saved-new" data-id="">' + T('js.tuviform.nguoi-moi','+ Người mới') + '</button>' +
        '</div>');
      el.querySelector('.tvf-saved-chips').addEventListener('click', (e) => {
        const btn = e.target.closest('.tvf-saved-chip');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        // Form gõ tay đã hiện sẵn — "+ Người mới" chỉ cần dẹp bong bóng này đi.
        if (!id) { collapse(el, '<p>' + T('js.tuviform.nguoi-moi-nhe','Người mới nhé.') + '</p>'); return; }
        const it = items.find((x) => String(x.id) === id);
        if (!it || !it.birth) return;
        const name = it.label || it.birth.hoten || '';
        collapse(el, '<p>' + T('js.tuviform.hoi-cho','Hỏi cho <b>{ten}</b> ✓',{ten:esc(name)}) + '</p>');
        // Ẩn MỌI bong bóng gõ tay/khôi phục draft đang dở (không chỉ bước 1 —
        // reload giữa chừng có thể đã resume tới bước 2/3 trước khi bấm đây).
        manualBubbles.forEach((b) => { if (b) b.style.display = 'none'; });
        clearDraft();
        try { if (window.Shell && window.Shell.rememberBirth) window.Shell.rememberBirth(it.birth); } catch (e2) { /* ignore */ }
        finishWithBirth(it.birth);
      });
    }
    function offerFrom(uc) {
      uc.list().then((items) => {
        if (items && items.length) renderSavedPicker(items);
      }).catch(() => { /* best-effort — im lặng bỏ qua */ });
    }
    function tryOfferSaved() {
      if (window.UserCharts && typeof window.UserCharts.list === 'function') { offerFrom(window.UserCharts); return; }
      // `user-charts.js` được `shell.js` nạp LƯỜI (async) ngay lúc boot — nếu
      // renderChat() (script CUỐI trang) chạy trước khi tải xong thì đợi đúng
      // một lượt 'load' của thẻ script đó (id `tvmb-charts-js`, xem
      // ensureUserChartsJs() trong shell.js), tối đa 1,5s. Không có thẻ (chưa
      // đăng nhập, `ensureUserChartsJs()` thoát sớm) → thôi, form gõ tay đã
      // hiện sẵn rồi (startManual() gọi độc lập, không đợi cái này).
      const tag = document.getElementById('tvmb-charts-js');
      if (!tag) return;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (window.UserCharts && typeof window.UserCharts.list === 'function') offerFrom(window.UserCharts);
      };
      tag.addEventListener('load', finish, { once: true });
      setTimeout(finish, 1500);
    }

    function startManual() {
      // Khôi phục draft nếu có (audit W1 J5, 2026-09-26) — nhảy thẳng tới
      // đúng bước còn dang dở, KHÔNG hỏi lại từ đầu. `draft.ngay` có nghĩa là
      // bước 2 (ngày sinh) đã xong, đủ điều kiện nhảy thẳng vào bước 3.
      if (draft && draft.ngay && draft.thang && draft.nam) {
        manualBubbles.push(bubble('chatStep-' + cp + '-1', collapsedS1Html(draft.hoten, draft.gioitinh, draft.namXem)));
        manualBubbles.push(bubble('chatStep-' + cp + '-2', '<p>' + T('js.tuviform.ngay-sinh-ok','Ngày sinh: <b>{d}/{m}/{y}</b> ✓',{d:draft.ngay,m:draft.thang,y:draft.nam}) + '</p>'));
        step3(draft.hoten, draft.gioitinh, draft.namXem, draft.ngay, draft.thang, draft.nam);
        return;
      }
      if (draft && draft.step >= 1) {
        manualBubbles.push(bubble('chatStep-' + cp + '-1', collapsedS1Html(draft.hoten, draft.gioitinh, draft.namXem)));
        step2(draft.hoten, draft.gioitinh, draft.namXem);
        return;
      }

      const s1 = bubble('chatStep-' + cp + '-1', '<p>' + q1 + '</p>' +
        '<div class="frow">' +
          (showName ? `<div class="fg" style="flex:1.6;min-width:150px"><label>${T('js.tuviform.ho-ten','Họ và tên')}</label><input type="text" id="${pid('hoten', cp)}" placeholder="${T('js.tuviform.ten-mau','Nguyễn Văn A')}" autocomplete="off"></div>` : '') +
          (showGender ? `<div class="fg" style="width:90px"><label>${T('js.tuviform.gioi-tinh','Giới tính')}</label><select id="${pid('gioitinh', cp)}"><option value="nam"${gioitinh === 'nam' ? ' selected' : ''}>${T('js.tuviform.gt-nam','Nam')}</option><option value="nu"${gioitinh === 'nu' ? ' selected' : ''}>${T('js.tuviform.gt-nu','Nữ')}</option></select></div>` : '') +
          (showNamXem ? `<div class="fg" style="width:90px"><label>${T('js.tuviform.nam-xem-van','Năm xem vận')}</label><input type="number" id="${pid('namXem', cp)}" value="${namXemDefault}" min="1900" max="2100"></div>` : '') +
        '</div>' +
        `<button class="btn-go" type="button" id="${cp}-next1" style="width:auto;padding:9px 16px;font-size:13px">${T('js.tuviform.tiep-tuc','Tiếp tục →')}</button>` +
        `<div class="err tvf-err" id="${cp}-err1" role="alert"></div>`);
      manualBubbles.push(s1);
      const focusFirst = () => { const f = document.getElementById(pid('hoten', cp)) || document.getElementById(pid('gioitinh', cp)); if (f) f.focus(); };
      focusFirst();
      document.getElementById(cp + '-next1').addEventListener('click', function () {
        const hoten = showName ? (document.getElementById(pid('hoten', cp))?.value || '').trim() : '';
        const gioitinhV = showGender ? (document.getElementById(pid('gioitinh', cp))?.value || 'nam') : gioitinh;
        const namXemV = showNamXem ? (parseInt(document.getElementById(pid('namXem', cp))?.value) || namXemDefault) : undefined;
        const err1 = document.getElementById(cp + '-err1');
        if (requireName && !hoten) { err1.textContent = T('js.tuviform.nhap-ho-ten','Vui lòng nhập họ tên.'); return; }
        err1.textContent = '';
        collapse(s1, collapsedS1Html(hoten, gioitinhV, namXemV));
        saveDraft(1, { hoten, gioitinh: gioitinhV, namXem: namXemV });
        step2(hoten, gioitinhV, namXemV);
      });

      function step2(hoten, gioitinhV, namXemV) {
        const s2 = bubble('chatStep-' + cp + '-2', '<p>' + q2 + '</p>' +
          '<div class="frow">' +
            `<div class="fg" style="width:74px"><label>${T('js.tuviform.ngay','Ngày')}</label><select id="${pid('ngay', cp)}">${opts.ngayOpts}</select></div>` +
            `<div class="fg" style="width:82px"><label>${T('js.tuviform.thang','Tháng')}</label><select id="${pid('thang', cp)}">${opts.thangOpts}</select></div>` +
            `<div class="fg" style="width:90px"><label>${T('js.tuviform.nam','Năm')}</label><select id="${pid('nam', cp)}">${opts.namOpts}</select></div>` +
          '</div>' +
          `<button class="btn-go" type="button" id="${cp}-next2" style="width:auto;padding:9px 16px;font-size:13px">${skipHour ? submitLabel : T('js.tuviform.tiep-tuc','Tiếp tục →')}</button>` +
          `<div class="err tvf-err" id="${cp}-err2" role="alert"></div>`);
        manualBubbles.push(s2);
        document.getElementById(cp + '-next2').addEventListener('click', function () {
          const ngay = +document.getElementById(pid('ngay', cp)).value;
          const thang = +document.getElementById(pid('thang', cp)).value;
          const nam = +document.getElementById(pid('nam', cp)).value;
          // Chặn NGAY ở bước này: trước đây ngày trống đi tiếp thành "0/0/1985 ✓"
          // rồi trang gọi alert + khoá nút vĩnh viễn; còn 31/2 thì Date tự lăn
          // sang 3/3 và lập lá số SAI không báo gì.
          const err = document.getElementById(cp + '-err2');
          if (!ngay || !thang || !nam) { err.textContent = T('js.tuviform.chon-du-ngay','Vui lòng chọn đủ ngày, tháng, năm sinh.'); return; }
          if (new Date(nam, thang - 1, ngay).getDate() !== ngay) { err.textContent = T('js.tuviform.thang-khong-co-ngay','Tháng {m}/{y} không có ngày {d} — vui lòng chọn lại.',{m:thang,y:nam,d:ngay}); return; }
          err.textContent = '';
          collapse(s2, '<p>' + T('js.tuviform.ngay-sinh-ok','Ngày sinh: <b>{d}/{m}/{y}</b> ✓',{d:ngay,m:thang,y:nam}) + '</p>');
          if (skipHour) {
            const data = { hoten, gioitinh: gioitinhV, ngay, thang, nam };
            if (namXemV !== undefined) data.namXem = namXemV;
            clearDraft();
            setData(data, prefix);
            if (onDone) onDone(data);
            return;
          }
          saveDraft(2, { hoten, gioitinh: gioitinhV, namXem: namXemV, ngay, thang, nam });
          step3(hoten, gioitinhV, namXemV, ngay, thang, nam);
        });
      }

      function step3(hoten, gioitinhV, namXemV, ngay, thang, nam) {
        const s3 = bubble('chatStep-' + cp + '-3', '<p>' + q3 + '</p>' +
          '<div class="frow" style="margin-bottom:8px">' +
            `<div class="fg" style="width:74px"><label>${T('js.tuviform.gio','Giờ')}</label><select id="${pid('tvf-gio', cp)}">${opts.gioOpts}</select></div>` +
            `<div class="fg" style="width:74px"><label>${T('js.tuviform.phut','Phút')}</label><select id="${pid('tvf-phut', cp)}">${opts.phutOpts}</select></div>` +
            `<div class="tvf-gio-am-wrap"><span class="tvf-gio-am" id="${pid('tvf-gio-am', cp)}">${T('js.tuviform.gio-am','Giờ âm: {chi}',{chi:G('chi','Tý')})}</span><span class="tvf-gio-vn" id="${pid('tvf-gio-vn', cp)}"></span></div>` +
          '</div>' +
          '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-mid);cursor:pointer;margin-bottom:6px">' +
            `<input type="checkbox" id="${pid('tvf-foreign', cp)}"> ${T('js.tuviform.ngoai-vn','Sinh ở ngoài Việt Nam?')}` +
          '</label>' +
          `<div id="${pid('tvf-utc-wrap', cp)}" style="display:none;margin-bottom:8px"><select id="${pid('tvf-noisinh', cp)}">${opts.utcOpts}</select>` +
          `<select id="${pid('tvf-vung', cp)}" style="display:none;margin-top:6px"></select></div>` +
          `<p style="font-size:11.5px;margin-bottom:8px"><a href="/app/gio-sinh" target="_blank" style="color:#1455A4;font-weight:600">${T('js.tuviform.khong-nho-chinh-xac','Không nhớ giờ sinh chính xác? Xác định giờ sinh →')}</a></p>` +
          `<button class="btn-go" type="button" id="${cp}-next3" style="width:auto;padding:9px 16px;font-size:13px">${submitLabel}</button>` +
          `<div class="err" id="${cp}-err3"></div>`);
        manualBubbles.push(s3);
        const upd = () => updateGioAmDisplay(cp);
        document.getElementById(pid('tvf-gio', cp)).addEventListener('input', upd);
        document.getElementById(pid('tvf-phut', cp)).addEventListener('input', upd);
        document.getElementById(pid('tvf-noisinh', cp)).addEventListener('input', function () { fillVung(cp); upd(); });
        document.getElementById(pid('tvf-vung', cp)).addEventListener('input', upd);
        document.getElementById(pid('tvf-foreign', cp)).addEventListener('change', function () { toggleUtc(cp); });
        _updaters[cp] = upd; upd();
        document.getElementById(cp + '-next3').addEventListener('click', function () {
          const hh = parseInt(document.getElementById(pid('tvf-gio', cp)).value) || 0;
          const mm = parseInt(document.getElementById(pid('tvf-phut', cp)).value) || 0;
          const q = quyDoiGio(noiSinhOf(cp), ngay, thang, nam, hh, mm);
          collapse(s3, '<p>' + T('js.tuviform.gio-sinh-ok','Giờ sinh: <b>{hm}</b> ✓',{hm:String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0')}) + '</p>');
          const data = { hoten, gioitinh: gioitinhV, ngay: q.ngay, thang: q.thang, nam: q.nam, gioHour: q.gioHour, gioPhut: q.gioPhut };
          if (q.lich) Object.assign(data, { lich: q.lich, noiSinh: q.noiSinh, noiSinhTz: q.noiSinhTz, goc: q.goc });
          if (namXemV !== undefined) data.namXem = namXemV;
          clearDraft();
          setData(data, prefix);
          if (onDone) onDone(data);
        });
      }
    }
    startManual();
    if (savedPicker) tryOfferSaved();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ── Public API ───────────────────────────────────────────────
  return {
    render,
    renderChat,
    getData,
    setData,
    clear,
    _update:    (prefix = '') => { (_updaters[prefix] || _updaters[''] || (() => {}))(); },
    _toggleUtc: (prefix = '') => toggleUtc(prefix),
    _noiSinh:   (prefix = '') => { fillVung(prefix); (_updaters[prefix] || _updaters[''] || (() => {}))(); },
    _toggleTip: (iconEl) => toggleTip(iconEl),
    // xem chú thích ở khai báo `_introShown` phía trên
    _resetIntro: () => { _introShown = false; },
  };
})();
