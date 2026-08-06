/**
 * user-charts.js — SỔ LÁ SỐ theo tài khoản (U4)
 *
 * 🔴 VÁ MỘT LỖI MẤT DỮ LIỆU, không phải thêm tính năng.
 * `Shell.getRememberedBirth()` đọc `localStorage['app_birth']` ⇒ lá số nhớ theo
 * MÁY chứ không theo TÀI KHOẢN. Đổi máy / ẩn danh / xoá cache là mất sạch, kể
 * cả người đã đăng nhập và đã trả tiền. Và chỉ giữ được MỘT lá số.
 *
 * ══ HAI NGUYÊN TẮC KHÔNG ĐƯỢC PHÁ ══════════════════════════════════════════
 *
 * 1. CHƯA ĐĂNG NHẬP → FILE NÀY KHÔNG LÀM GÌ CẢ. Không gọi mạng, không dựng UI,
 *    không đụng localStorage. Luồng của khách vãng lai phải y hệt hôm qua.
 *
 * 2. KHÔNG BAO GIỜ CHẶN LUỒNG TOOL. `prefillForm()` của Shell chạy ĐỒNG BỘ lúc
 *    trang vừa mở và đọc localStorage — giữ nguyên. Sổ trên server tới sau, và
 *    chỉ được điền vào form khi form CÒN TRỐNG (xem `_maybeSeedForm`): điền đè
 *    lên thứ người ta đang gõ là lỗi tệ hơn hẳn lỗi đang đi vá.
 *
 * Mọi lỗi mạng ở đây đều nuốt im lặng — sổ hỏng thì trang vẫn chạy như trước
 * khi có sổ.
 */
window.UserCharts = (function () {
  'use strict';

  var API = '/api/charts';
  var _cache = null; // danh sách đã tải trong phiên trang này
  var _byId = {};    // id → mục, chụp lúc dựng bộ chọn (nguồn cho lượt bấm)
  var _mounted = false;

  function token() {
    try {
      return (window.Auth && window.Auth.getSession && window.Auth.getSession().access_token) || '';
    } catch (e) {
      return '';
    }
  }
  function loggedIn() {
    return !!token();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Gọi API ──────────────────────────────────────────────────────────────
  function list() {
    if (!loggedIn()) return Promise.resolve([]);
    return fetch(API, { headers: { Authorization: 'Bearer ' + token() } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { _cache = (d && d.items) || []; return _cache; })
      .catch(function () { return []; });
  }

  /** Lưu / cập nhật. Bắn-và-quên: nơi gọi KHÔNG được await để chặn luồng. */
  function save(birth, label) {
    if (!loggedIn() || !birth) return Promise.resolve(null);
    if (!birth.ngay || !birth.thang || !birth.nam) return Promise.resolve(null);
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      body: JSON.stringify({ birth: birth, label: label || '' }),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      // ⚠️ KHÔNG xoá `_cache` ở đây. `Shell.rememberBirth` gọi save() kiểu
      // bắn-và-quên ở MỌI lượt chạy tool, nên xoá cache tại đây là ngay sau khi
      // dựng xong bộ chọn thì danh sách bị rỗng và bấm chip không còn tác dụng —
      // hỏng im lặng, không lỗi console nào. Danh sách chỉ tải lại ở những chỗ
      // THẬT SỰ đổi nó (onAdd / onRemove, qua refresh()).
      .then(function (d) { return (d && d.item) || null; })
      .catch(function () { return null; });
  }

  function remove(id) {
    if (!loggedIn()) return Promise.resolve(false);
    return fetch(API + '?id=' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token() },
    })
      .then(function (r) { _cache = null; return r.ok; })
      .catch(function () { return false; });
  }

  // ── Dò form trên trang ───────────────────────────────────────────────────
  // CỐ Ý dò động thay vì liệt kê id từng trang: 7 trang đang dùng 4 id host
  // khác nhau (`tuviFormHost`, `tmeFormHost`, `formHostA`, `formHostB`), và
  // trang mới sẽ đặt id mới. Liệt kê tay thì trang nào quên là trang đó âm thầm
  // không có sổ — mà không có gì báo.
  function findForms() {
    var out = [];
    var all = document.querySelectorAll('[id]');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!/formhost/i.test(el.id)) continue;
      // Prefix suy từ chính field bên trong: TuviForm đặt id `<prefix>-ngay`
      // (xem pid() trong tuvi-form.js). Không có field ngày ⇒ chưa render xong
      // hoặc không phải form lá số → bỏ qua.
      var day = el.querySelector('[id$="ngay"]');
      if (!day) continue;
      var prefix = day.id === 'ngay' ? '' : day.id.replace(/-?ngay$/, '');
      out.push({ host: el, prefix: prefix });
    }
    return out;
  }

  function formIsEmpty(prefix) {
    try {
      var d = window.TuviForm.getData(prefix);
      return !d.ngay || !d.thang || !d.nam;
    } catch (e) {
      return false; // đọc không được thì coi như CÓ dữ liệu → không đụng vào
    }
  }

  // ── Bộ chọn ──────────────────────────────────────────────────────────────
  function css() {
    if (document.getElementById('uc-css')) return;
    var s = document.createElement('style');
    s.id = 'uc-css';
    s.textContent =
      '.uc-bar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px;font-size:12.5px}' +
      '.uc-lbl{color:var(--text-lt,#777);font-weight:600;font-size:11px;letter-spacing:.04em;text-transform:uppercase}' +
      '.uc-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line-2,#ddd);' +
      'background:var(--paper,#fff);border-radius:999px;padding:4px 10px;cursor:pointer;' +
      'font-family:inherit;font-size:12.5px;color:var(--text,#222);transition:all .13s}' +
      '.uc-chip:hover{border-color:var(--gold-bright,#c9a84c);background:var(--gold-lt,#F9F4EB)}' +
      '.uc-chip .uc-x{color:var(--text-lt,#999);font-size:13px;line-height:1;padding:0 1px}' +
      '.uc-chip .uc-x:hover{color:var(--red,#C0392B)}' +
      '.uc-chip .uc-sub{color:var(--text-lt,#999);font-size:11px}' +
      '.uc-add{border-style:dashed;color:var(--text-lt,#777)}';
    document.head.appendChild(s);
  }

  function birthShort(b) {
    if (!b) return '';
    var g = b.gioitinh === 'nu' ? 'Nữ' : 'Nam';
    return g + ' · ' + (b.ngay || '?') + '/' + (b.thang || '?') + '/' + (b.nam || '?');
  }

  function renderBar(bar, items, prefix) {
    var html = '<span class="uc-lbl">Sổ lá số</span>';
    items.forEach(function (it) {
      _byId[String(it.id)] = it;
      var name = it.label || (it.birth && it.birth.hoten) || birthShort(it.birth);
      html +=
        '<span class="uc-chip" data-id="' + it.id + '">' +
        '<span class="uc-pick" title="' + esc(birthShort(it.birth)) + '">' + esc(name) + '</span>' +
        '<span class="uc-sub">' + esc(birthShort(it.birth)) + '</span>' +
        '<span class="uc-x" title="Xoá khỏi sổ">✕</span></span>';
    });
    html += '<button type="button" class="uc-chip uc-add">＋ Lưu lá số đang nhập</button>';
    bar.innerHTML = html;

    bar.onclick = function (e) {
      var add = e.target.closest('.uc-add');
      if (add) return onAdd(prefix);
      var chip = e.target.closest('.uc-chip');
      if (!chip || !chip.dataset.id) return;
      if (e.target.closest('.uc-x')) return onRemove(chip.dataset.id, prefix);
      onPick(chip.dataset.id, prefix);
    };
  }

  function onPick(id, prefix) {
    // Đọc từ `_byId` — bản chụp gắn liền với lượt dựng bộ chọn, KHÔNG phụ thuộc
    // `_cache` (biến đó còn bị các lượt gọi khác đụng vào). Bộ chọn đang hiện
    // cái gì thì bấm ra đúng cái đó.
    var it = _byId[String(id)];
    if (!it || !it.birth) return;
    try {
      window.TuviForm.setData(it.birth, prefix);
    } catch (e) { /* form chưa sẵn sàng — không làm gì thêm */ }
    // Chọn từ sổ cũng là "đang dùng lá số này" ⇒ cập nhật lớp đệm localStorage
    // để các tool khác trong shell nhận được, đúng như khi gõ tay.
    try {
      if (window.Shell && window.Shell.rememberBirth) window.Shell.rememberBirth(it.birth);
    } catch (e) { /* ignore */ }
  }

  function onRemove(id, prefix) {
    if (!window.confirm('Xoá lá số này khỏi sổ?')) return;
    remove(id).then(function () { refresh(prefix); });
  }

  function onAdd(prefix) {
    var b;
    try {
      b = window.TuviForm.getData(prefix);
    } catch (e) {
      return;
    }
    if (!b || !b.ngay || !b.thang || !b.nam) {
      window.alert('Nhập đủ ngày tháng năm sinh rồi mới lưu được vào sổ.');
      return;
    }
    var label = window.prompt('Đặt tên cho lá số này (vd: Tôi, Vợ, Sếp):', b.hoten || '');
    if (label === null) return; // bấm Huỷ
    save(b, label).then(function () { refresh(prefix); });
  }

  function refresh(prefix) {
    return list().then(function (items) {
      findForms().forEach(function (f) {
        var bar = f.host.parentNode && f.host.parentNode.querySelector('.uc-bar[data-prefix="' + f.prefix + '"]');
        if (bar) renderBar(bar, items, f.prefix);
      });
      void prefix;
      return items;
    });
  }

  // Form còn TRỐNG và sổ có mục → điền mục dùng gần nhất. Đây chính là chỗ vá
  // "đổi máy là mất": localStorage trống nhưng tài khoản vẫn còn lá số.
  //
  // ⚠️ HAI GIỚI HẠN, cả hai đều đã suýt gây lỗi:
  //  1. CHỈ điền khi form còn TRỐNG — đè lên thứ người ta đang gõ dở là lỗi tệ
  //     hơn hẳn lỗi đang đi vá.
  //  2. CHỈ điền form ĐẦU TIÊN. Bản trước điền MỌI form, nên trang hai lá số
  //     (Duyên Nợ Tiền Kiếp) bị đổ cùng một người vào cả hai ô ⇒ người dùng bấm
  //     luôn là xem duyên nợ của mình với CHÍNH MÌNH. Sổ chỉ biết "lá số của
  //     bạn"; ô thứ hai là người khác, không có gì để đoán.
  //  3. Form mang `data-uc-noseed` thì KHÔNG mồi. Tool "Lá Số Người Khác" có ô
  //     chính là lá số NGƯỜI KHÁC — mồi lá số của chính người dùng vào đó rồi
  //     họ bấm luôn là ra bản cẩm nang ứng xử với chính mình. Vẫn cho BẤM chọn
  //     từ sổ (đó đúng là tính năng: chọn "Sếp Hùng" là điền xong), chỉ không
  //     TỰ điền.
  function _maybeSeedForm(items) {
    if (!items.length) return;
    var first = findForms()[0];
    if (first && first.host.hasAttribute('data-uc-noseed')) first = null;
    if (first && formIsEmpty(first.prefix)) {
      try {
        window.TuviForm.setData(items[0].birth, first.prefix);
      } catch (e) { /* ignore */ }
    }
    try {
      if (window.Shell && window.Shell.getRememberedBirth && !window.Shell.getRememberedBirth()) {
        window.Shell.rememberBirth(items[0].birth);
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * Gắn sổ vào mọi form lá số trên trang. Gọi được nhiều lần (tự bỏ qua lượt
   * thứ hai). Không đăng nhập → thoát ngay, KHÔNG chạm mạng.
   */
  function mount() {
    if (_mounted || !loggedIn()) return Promise.resolve([]);
    if (typeof window.TuviForm === 'undefined') return Promise.resolve([]);
    var forms = findForms();
    if (!forms.length) return Promise.resolve([]);
    _mounted = true;
    css();

    forms.forEach(function (f) {
      if (f.host.parentNode.querySelector('.uc-bar[data-prefix="' + f.prefix + '"]')) return;
      var bar = document.createElement('div');
      bar.className = 'uc-bar';
      bar.setAttribute('data-prefix', f.prefix);
      f.host.parentNode.insertBefore(bar, f.host);
    });

    return list().then(function (items) {
      forms.forEach(function (f) {
        var bar = f.host.parentNode.querySelector('.uc-bar[data-prefix="' + f.prefix + '"]');
        if (bar) renderBar(bar, items, f.prefix);
      });
      // Sổ TRỐNG mà máy đang nhớ một lá số → đưa nó vào sổ. Đây là lượt chuyển
      // tiếp cho người đã dùng site từ trước khi có sổ: lá số của họ không tự
      // nhiên biến mất khi đăng nhập trên máy mới.
      if (!items.length) {
        var local = null;
        try {
          local = window.Shell && window.Shell.getRememberedBirth ? window.Shell.getRememberedBirth() : null;
        } catch (e) { /* ignore */ }
        if (local) return save(local, '').then(function () { return refresh(''); });
      } else {
        _maybeSeedForm(items);
      }
      return items;
    });
  }

  return { mount: mount, list: list, save: save, remove: remove, refresh: refresh, _findForms: findForms };
})();
