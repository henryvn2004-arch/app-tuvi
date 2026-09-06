/**
 * tuvi-paywall.js — Tử Vi Minh Bảo
 * Uses window.Auth (from auth.js) for session management.
 * Must be loaded AFTER auth.js.
 */
const TuviPaywall = (() => {
  // NHÃN hiển thị của từng công cụ. CỐ Ý KHÔNG có giá ở đây.
  //
  // Giá đọc từ `tool_pricing` qua ToolPrices (public/tool-prices.js) — nguồn
  // DUY NHẤT, admin sửa không cần deploy. Map này từng mang thêm `cost` làm
  // "bản dự phòng", và chính nó trôi khỏi DB rồi báo sai giá cho người dùng.
  // Không đọc được giá thì HỎI LẠI, đừng đoán — xem _price().
  const PRODUCTS = {
    'tuvi-chat':           { title: 'Tử Vi Chat' },
    'laso':                { title: 'Luận Giải Lá Số' },
    'tu-binh':             { title: 'Tử Bình Bát Tự' },
    'xem-tuoi':            { title: 'Xem Tuổi Vợ Chồng' },
    'xem-lam-an':          { title: 'Xem Tuổi Làm Ăn' },
    'dien-tuong':          { title: 'Diện Tướng AI' },
    'nhan-tuong':          { title: 'Nhãn Tướng AI' },
    'thu-tuong':           { title: 'Thủ Tướng AI' },
    'thanh-tuong':         { title: 'Thanh Tướng AI' },
    'thanh-tuong-pro':     { title: 'Thanh Tướng Pro' },
    'khi-sac':             { title: 'Khí Sắc — Vận Khí' },
    'phong-thuy':          { title: 'Phong Thủy Nội Thất' },
    'ban-lam-viec':        { title: 'Phong Thủy Bàn Làm Việc' },
    'cua-hang-phong-thuy': { title: 'Phong Thủy Cửa Hàng & VP' },
    'mau-sac-hop-menh':    { title: 'Màu Sắc Hợp Mệnh' },
    'kieu-toc-phan-tich':  { title: 'Phân Tích Kiểu Tóc AI' },
    'kieu-toc-tryon':      { title: 'Thử Kiểu Tóc AI' },
    'trang-phuc-tryon':    { title: 'Thử Trang Phục AI' },
    'phong-thuy-render':   { title: 'Render Phòng Phong Thủy AI' },
    'trang-diem-phan-tich':{ title: 'Phân Tích Trang Điểm AI' },
    'trang-diem-tryon':    { title: 'Thử Trang Điểm AI' },
    'trang-phuc-theo-ngay':{ title: 'Trang Phục Theo Ngày' },
    'da-lieu-ai':          { title: 'Da Liệu AI Toàn Diện' },
    'personal-color':      { title: 'Personal Color AI' },
    'personal-color-tryon':{ title: 'Personal Color Try-on' },
    'dat-ten-con':         { title: 'Đặt Tên Con' },
    'dat-ten-dn':          { title: 'Đặt Tên Doanh Nghiệp' },
    'chon-ngay-tot':       { title: 'Chọn Ngày Tốt' },
    'chan-dung-vo-chong':  { title: 'Chân Dung Vợ Chồng' },
    'chan-dung-tien-kiep': { title: 'Chân Dung Tiền Kiếp' },
    'duyen-no-tien-kiep': { title: 'Duyên Nợ Tiền Kiếp' },
    'nguoi-khac': { title: 'Lá Số Người Khác' },
    'day-con': { title: 'Dạy Con Theo Lá Số' },
    'huong-nghiep-tre': { title: 'Hướng Nghiệp Sớm Cho Con' },
    'gio-sinh': { title: 'Xác Định Giờ Sinh' },
    'nhan-mach': { title: 'Sổ Nhân Mạch' },
    'van-han-nam': { title: 'Vận Hạn 12 Tháng Tới' },
    'chu-trinh-cuoc-doi': { title: 'Chu Trình Cuộc Đời' },
  };

  const TOOL_TYPE = {
    'tuvi-chat': 'use_tuvi_chat',
    'laso': 'use_laso', 'tu-binh': 'use_tubinh',
    'xem-tuoi': 'use_xem_tuoi', 'xem-lam-an': 'use_xem_lam_an',
    'dien-tuong': 'use_dien_tuong', 'nhan-tuong': 'use_nhan_tuong',
    'thu-tuong': 'use_thu_tuong', 'thanh-tuong': 'use_thanh_tuong',
    'thanh-tuong-pro': 'use_thanh_tuong_pro', 'khi-sac': 'use_khi_sac',
    'phong-thuy': 'use_phong_thuy', 'ban-lam-viec': 'use_ban_lam_viec',
    'cua-hang-phong-thuy': 'use_cua_hang_phong_thuy', 'mau-sac-hop-menh': 'use_mau_sac',
    'kieu-toc-phan-tich': 'use_kieu_toc_phan_tich', 'kieu-toc-tryon': 'use_kieu_toc_tryon',
    'trang-phuc-tryon': 'use_trang_phuc_tryon',
    'phong-thuy-render': 'use_phong_thuy_render',
    'trang-diem-phan-tich': 'use_trang_diem_phan_tich',
    'trang-diem-tryon': 'use_trang_diem_tryon',
    'trang-phuc-theo-ngay': 'use_trang_phuc_theo_ngay',
    'da-lieu-ai': 'use_da_lieu_ai',
    'personal-color': 'use_personal_color',
    'personal-color-tryon': 'use_personal_color_tryon',
    'dat-ten-con': 'use_dat_ten_con', 'dat-ten-dn': 'use_dat_ten_dn',
    'chon-ngay-tot': 'use_chon_ngay_tot',
    'chan-dung-vo-chong': 'use_chan_dung_vo_chong',
    'chan-dung-tien-kiep': 'use_chan_dung_tien_kiep',
    'duyen-no-tien-kiep': 'use_duyen_no_tien_kiep',
    'nguoi-khac': 'use_nguoi_khac',
    'day-con': 'use_day_con',
    'huong-nghiep-tre': 'use_huong_nghiep_tre',
    'gio-sinh': 'use_gio_sinh',
    'nhan-mach': 'use_nhan_mach',
    'van-han-nam': 'use_van_han_nam',
    'chu-trinh-cuoc-doi': 'use_chu_trinh_cuoc_doi',
  };

  let _cfg        = null;
  let _priceCache = null;

  // ── Ý định mở khoá TRƯỚC khi rời trang đi nạp Lượng ─────────────
  // Đo trên Chu Trình Cuộc Đời (2026-08-30): 12 lượt bấm mở khoá → 1 signup →
  // 0 thanh toán. Đường cũ tới `/topup.html` không mang theo BIẾT đang mua gì
  // (khách tự đoán gói) và không có đường VỀ (trả tiền xong phải tự nhớ quay
  // lại trang cũ rồi bấm mở khoá LẦN NỮA). `sessionStorage` sống qua được cả
  // lượt điều hướng sang PayPal/PayOS và quay về (cùng tab, cùng gốc site) nên
  // dùng nó làm cầu nối thay vì cố nhét vào querystring qua domain thứ ba.
  const PENDING_KEY = 'tpw_pending_unlock';
  const PENDING_TTL_MS = 30 * 60 * 1000;

  /**
   * Gọi ở trang TOOL sau khi đã dựng lại nút/tường mở khoá — nếu vừa quay về
   * từ một lượt nạp Lượng THÀNH CÔNG cho ĐÚNG sản phẩm này (`?tpwResume=1` +
   * ý định còn khớp), tự gọi lại `requireCredits` thay vì bắt bấm nút lần nữa.
   * An toàn kể cả đoán sai: `requireCredits` tự kiểm đăng nhập/giá/số dư lại
   * từ đầu, đoán hụt thì chỉ hiện lại đúng tường cũ, không có gì để mất.
   */
  function resumeIfPending(slug, callback) {
    let url;
    try { url = new URL(location.href); } catch (e) { return false; }
    const resume = url.searchParams.get('tpwResume') === '1';
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch (e) { /* ignore */ }
    // Dọn NGAY — ý định chỉ dùng được một lần, kể cả khi hoá ra không khớp,
    // để lỡ tải lại trang không tự bấm lại vô hạn.
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ }
    if (resume) {
      url.searchParams.delete('tpwResume');
      try { history.replaceState({}, '', url.pathname + url.search + url.hash); } catch (e) { /* ignore */ }
    }
    if (!resume || !pending) return false;
    const product = (_cfg && _cfg.product) || '';
    if (pending.product !== product) return false;
    if (Date.now() - (Number(pending.ts) || 0) > PENDING_TTL_MS) return false;
    requireCredits(slug, callback);
    return true;
  }

  // ── CSS injection ─────────────────────────────────────────────
  function _css() {
    if (document.getElementById('tpw-css')) return;
    const s = document.createElement('style');
    s.id = 'tpw-css';
    s.textContent = `
.tpw-overlay{position:fixed;inset:0;background:rgba(6,26,46,.72);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;animation:tpw-fade .2s ease}
@keyframes tpw-fade{from{opacity:0}to{opacity:1}}
@keyframes tpw-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.tpw-box{background:#fff;border-radius:14px;width:100%;max-width:400px;box-shadow:0 24px 60px rgba(6,26,46,.3);animation:tpw-up .22s ease;overflow:hidden}
.tpw-hd{background:#061A2E;padding:18px 22px}
.tpw-hd-t{font-family:'Noto Serif',Georgia,serif;font-size:15px;color:#fff;font-weight:700;margin-bottom:3px}
.tpw-hd-s{font-size:11.5px;color:rgba(255,255,255,.5)}
.tpw-bd{padding:18px 22px}
.tpw-r{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f5f5f5;font-size:13px}
.tpw-r:last-of-type{border-bottom:none}
.tpw-rl{color:#666}
.tpw-rv{font-family:'Noto Serif',Georgia,serif;font-weight:700;font-size:14px}
.tpw-rv.r{color:#C0392B}
.tpw-rv.g{color:#1E6B3C}
.tpw-rv.o{color:#9A7B3A}
hr.tpw-div{border:none;border-top:1.5px solid #f0f0f0;margin:3px 0}
.tpw-ft{display:flex;gap:10px;padding:14px 22px;border-top:1px solid #f0f0f0}
.tpw-btn{flex:1;padding:10px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
.tpw-btn.cancel{background:#fff;border:1.5px solid #ddd;color:#666}
.tpw-btn.cancel:hover{background:#f5f5f5}
.tpw-btn.ok{flex:2;background:#061A2E;border:none;color:#c9a84c}
.tpw-btn.ok:hover{background:#0D3B5E}
.tpw-btn.ok:disabled{opacity:.5;cursor:not-allowed}
.tpw-btn.topup{background:#9A7B3A;border:none;color:#fff;display:inline-block;text-decoration:none;padding:10px 28px;border-radius:7px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer}
.tpw-btn.topup:hover{background:#7d6230}
.tpw-msg{font-size:13px;color:#444;line-height:1.65;margin-bottom:14px}
.tpw-center{padding:18px 22px;text-align:center}
.tpw-banner{position:fixed;top:72px;left:50%;transform:translateX(-50%);background:#1E6B3C;color:#fff;padding:9px 22px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.18);white-space:nowrap;pointer-events:none;animation:tpw-fade .25s ease}
.tpw-hint{margin-top:7px;font-size:12.5px;line-height:1.55;color:#6b6b6b;font-family:inherit}
.tpw-hint b{color:#061A2E;font-weight:700}
.tpw-hint.low{color:#8a3a2c}
.tpw-hint.low b{color:#C0392B}
.tpw-hint a{color:#9A7B3A;font-weight:700;text-decoration:none;border-bottom:1px solid rgba(154,123,58,.45);cursor:pointer}
.tpw-hint a:hover{border-bottom-color:#9A7B3A}
/* 🔑 TẤM KHOÁ TỰ CAO THEO NỘI DUNG — đọc trước khi sửa lại bố cục này.
   Bản đầu để .tpw-lock-veil ở position:absolute + inset:0, tức TOÀN BỘ chữ
   thật (tiêu đề · danh sách khối khoá · số dư · NÚT) nằm NGOÀI luồng, và chiều
   cao khung do mấy vạch mờ TRANG TRÍ quyết định. Danh sách dài hơn mấy vạch đó
   là tràn ra, overflow:hidden cắt mất đúng cái NÚT, mà absolute thì cũng
   không cuộn được — người dùng nhìn thấy một tấm khoá không có đường mở.
   Đã vá một lần bằng cách nới padding vạch mờ; thêm một dòng item là vỡ lại.
   Nay ngược lại: vạch mờ là dải trang trí có chiều cao RIÊNG, lớp chữ nằm
   TRONG luồng và là thứ quyết định chiều cao. Không ca nội dung nào cắt được nữa. */
.tpw-lock{position:relative;margin-top:14px;border:1px solid #e7e0d0;border-radius:12px;overflow:hidden;background:#fff;animation:tpw-up .25s ease}
.tpw-lock-blur{height:106px;box-sizing:border-box;padding:18px 20px 0;overflow:hidden;user-select:none;pointer-events:none;filter:blur(4px);opacity:.5}
.tpw-lock-blur i{display:block;height:11px;border-radius:6px;background:linear-gradient(90deg,#cfc7b4,#ece6da);margin-bottom:10px}
/* Chồng lên ĐUÔI dải mờ để vẫn ra cảm giác "có chữ bị che", nhưng phần chồng
   chỉ là lớp phủ trắng dần — chữ thật bắt đầu ở chỗ nền ĐÃ đặc, nên tiêu đề và
   danh sách không bao giờ nằm trên vạch mờ. */
.tpw-lock-veil{position:relative;margin-top:-52px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:52px 18px 20px;background:linear-gradient(180deg,rgba(255,255,255,.25) 0,#fff 46px)}
.tpw-lock-t{font-family:'Noto Serif',Georgia,serif;font-size:15px;font-weight:700;color:#061A2E;margin-bottom:4px}
.tpw-lock-s{font-size:12.5px;color:#666;margin-bottom:13px;line-height:1.55}
.tpw-lock .tpw-btn{max-width:100%}
.tpw-lock-x{background:none;border:none;color:#999;font-size:12px;font-family:inherit;cursor:pointer;margin-top:9px;text-decoration:underline}
.tpw-lock-x:hover{color:#666}
/* W1 — tường "đã tính thử": liệt kê ĐÚNG tên khối đang khoá, nên nó cao hơn
   tường từ chối và chính nó là ca làm vỡ bố cục cũ. */
.tpw-prev .tpw-lock-veil{padding-top:56px}
.tpw-prev .tpw-lock-t{font-size:16px;margin-bottom:9px}
.tpw-prev-list{list-style:none;margin:0 auto 14px;padding:11px 16px;font-size:12.5px;line-height:1.9;color:#4a4234;text-align:left;max-width:400px;background:#FBF8F1;border:1px solid #EFE7D6;border-radius:9px}
.tpw-prev-list li{position:relative;padding-left:17px}
.tpw-prev-list li::before{content:'⊙';position:absolute;left:0;color:#C9A84C;font-size:11px}
.tpw-prev .tpw-btn{min-width:240px;padding-left:26px;padding-right:26px}
@media(max-width:520px){.tpw-prev .tpw-btn{min-width:0;width:100%}}
/* B1 — đường mời bạn, chèn NGAY DƯỚI nút mở. Nằm TRONG luồng như lớp chữ (xem
   chú thích bố cục ở trên), nên nó chỉ làm khung cao thêm chứ không đè lên nút. */
.tpw-inv{margin:14px auto 0;padding-top:13px;border-top:1px dashed #E0DBCC;max-width:420px;width:100%}
.tpw-inv-d{font-size:12.5px;color:#4a4a4a;line-height:1.6;margin-bottom:9px}
.tpw-inv-d b{color:#8a6d2f}
.tpw-inv-row{display:flex;gap:7px;flex-wrap:wrap;align-items:center;justify-content:center}
.tpw-inv-in{flex:1;min-width:150px;font-size:11.5px;padding:7px 9px;border:1px solid #E6E3DC;border-radius:7px;background:#fff;color:#1a1a1a;font-family:ui-monospace,Menlo,monospace}
.tpw-inv-b{border:1.5px solid #061A2E;background:#fff;color:#061A2E;cursor:pointer;font-weight:700;font-size:12.5px;padding:7px 14px;border-radius:7px;font-family:inherit}
.tpw-inv-b:hover{background:#F9F4EB}
@media(max-width:520px){.tpw-inv-in{min-width:0;flex-basis:100%}.tpw-inv-b{flex:1}}
/* ── Khoá NỘI DUNG THẬT đã dựng (khác .tpw-lock-blur — cái đó là vạch giả
   trang trí bên trong tấm khoá quảng cáo). Dùng khi trang đã tính xong phần
   deterministic cho khách chưa đăng ký, muốn cho THẤY CÓ CẤU TRÚC (tiêu đề,
   hình dạng nội dung) nhưng làm mờ chữ thật — không được phép hiện ra chữ
   đọc được. KHÔNG dùng .tpw-real-lock cho phần chưa có gì để làm mờ (ảnh/
   truyện AI chưa sinh) — lúc đó dùng lockPreview() như cũ. */
.tpw-real-lock{filter:blur(5px);opacity:.65;user-select:none;pointer-events:none}
.tpw-lock-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#9A7B3A;border:1px solid #9A7B3A;border-radius:20px;padding:2px 9px}
.tpw-lock-badge .ic-inline{width:.9em;height:.9em}
/* ── Khoá NHỎ trong TỪNG PHẦN (tool nhiều mục: luận giải/bát tự/xem tuổi) ──
   Khác lockPreview (một bức tường đứng MỘT chỗ, dễ bị cuộn qua khỏi màn
   hình) — đây là một dòng gọn, lặp lại ở MỖI phần đang khoá, đứng cạnh đúng
   khối chữ AI còn trống. Cùng ngôn ngữ "xác nhận" navy+vàng với .tpw-btn.ok,
   cố ý KHÁC màu với .ask (viền vàng đứt, nền nhạt) của nút "Hỏi trợ lý" cạnh
   nó — hai nút đứng sát nhau mà cùng màu thì không ai phân biệt được đâu là
   miễn phí, đâu là trả tiền. */
.tpw-seclock{display:none;align-items:center;gap:9px;margin-top:11px;padding:9px 13px;border-radius:8px;background:#061A2E;color:#F3E7C6;cursor:pointer;font-size:12.5px;line-height:1.4;transition:background .15s}
.tpw-seclock:hover{background:#0D3B5E}
.tpw-seclock-i{flex:0 0 auto;color:#C9A84C;font-size:13px}
.tpw-seclock-t{flex:1;min-width:0}
.tpw-seclock-p{flex:0 0 auto;font-weight:700;color:#C9A84C;white-space:nowrap}
@media(max-width:480px){.tpw-seclock{flex-wrap:wrap}.tpw-seclock-p{width:100%;text-align:right}}`;
    document.head.appendChild(s);
  }

  // ── Pricing ───────────────────────────────────────────────────
  // Trả { cost, title }. `cost = null` nghĩa là CHƯA BIẾT GIÁ (đọc hụt) — nơi
  // gọi phải dừng lại và nói thật, tuyệt đối không thay bằng số phỏng đoán.
  // Bản cũ rơi về `PRODUCTS['dien-tuong']` khi product lạ, nên một id gõ sai là
  // âm thầm tính tiền theo giá tool khác.
  async function _price() {
    const p = _cfg?.product;
    const title = _cfg?.title || PRODUCTS[p]?.title || p || 'Công cụ';
    if (_cfg?.cost) return { cost: _cfg.cost, title };
    await _ensurePrices();
    if (window.ToolPrices) await window.ToolPrices.load();
    const cost = window.ToolPrices ? window.ToolPrices.get(p) : null;
    return { cost, title };
  }

  // Điền giá vào [data-tvp-price] — uỷ quyền cho ToolPrices (nguồn duy nhất).
  // Giữ hàm này vì nhiều trang đã gọi TuviPaywall.fillPriceSlots().
  async function fillPriceSlots(root) {
    await _ensurePrices();
    if (window.ToolPrices) await window.ToolPrices.fillSlots(root);
  }

  // Tự nạp tool-prices.js nếu trang chưa có. CỐ Ý làm ở đây thay vì đi thêm
  // thẻ <script> vào 40+ trang: thêm tay thì sẽ sót, mà sót ở trang nào là
  // trang đó mất giá.
  function _ensurePrices() {
    if (window.ToolPrices) return Promise.resolve();
    return new Promise((resolve) => {
      let el = document.getElementById('_tvmb_prices_js');
      if (!el) {
        el = document.createElement('script');
        el.id = '_tvmb_prices_js';
        el.src = '/tool-prices.js?v=5';
        document.head.appendChild(el);
      }
      el.addEventListener('load', () => resolve());
      el.addEventListener('error', () => resolve()); // nạp hỏng → coi như chưa biết giá
    });
  }

  /** Giá của một product bất kỳ (không phụ thuộc _cfg). null = chưa biết. */
  async function _priceOf(product) {
    await _ensurePrices();
    if (window.ToolPrices) await window.ToolPrices.load();
    return window.ToolPrices ? window.ToolPrices.get(product) : null;
  }

  // Chưa đọc được bảng giá. CỐ Ý không chạy tiếp bằng một con số phỏng đoán:
  // thà bảo người ta thử lại còn hơn trừ Lượng ở mức họ chưa từng thấy.
  function _priceUnknown() {
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Chưa đọc được bảng giá</div><div class="tpw-hd-s">Chưa trừ Lượng nào của bạn</div></div>' +
      '<div class="tpw-center"><div class="tpw-msg">Kết nối tới máy chủ giá đang trục trặc. Bạn thử lại sau giây lát nhé — chúng tôi không chạy công cụ khi chưa hiện được giá chính xác.</div></div>' +
      '<div class="tpw-ft"><button class="tpw-btn cancel" onclick="TuviPaywall._close()">Đóng</button></div>'
    );
  }

  // ── Overlay helper ────────────────────────────────────────────
  let _ov = null;
  function _open(inner) {
    _close();
    _closeLock();  // không bày hai kiểu "chưa mở được" cùng lúc
    _css();
    _ov = document.createElement('div');
    _ov.className = 'tpw-overlay';
    _ov.innerHTML = '<div class="tpw-box">' + inner + '</div>';
    _ov.addEventListener('click', e => { if (e.target === _ov) _close(); });
    document.body.appendChild(_ov);
    document.body.style.overflow = 'hidden';
  }
  function _close() {
    if (_ov) { _ov.remove(); _ov = null; }
    document.body.style.overflow = '';
  }

  // ── W3: dòng "còn bao nhiêu · tốn bao nhiêu" ngay dưới nút ────────────
  //
  // Bám vào các ô giá `[data-tvp-price]` VỐN ĐÃ nằm trong nút chạy tool, nên
  // không phải rải markup vào 42 trang, và chỗ gắn đúng ngay nơi mắt người
  // dùng đang nhìn ở giây trước khi bấm.
  //
  // CHỈ bám vào <button>. Ô giá nằm trong LINK CHÉO ("Xem Tuổi Vợ Chồng (15
  // lượng) →" trỏ sang trang khác) mà cũng treo số dư thì vừa nhiễu vừa nói về
  // một hành động không sắp xảy ra.
  const _hintAnchors = {};   // product → nút chạy tool đó trên trang này

  function mountCostHints(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-tvp-price]').forEach((slot) => {
      const product = slot.getAttribute('data-tvp-price');
      if (!product) return;
      const btn = slot.closest('button');
      if (!btn || btn.hasAttribute('data-tvp-nohint') || !btn.parentNode) return;
      _hintAnchors[product] = btn;
      if (!btn._tpwHint || !btn._tpwHint.isConnected) {
        const el = document.createElement('div');
        el.className = 'tpw-hint';
        el.style.display = 'none';
        btn._tpwHint = el;
        btn.insertAdjacentElement('afterend', el);
      }
    });
    return refreshCostHints();
  }

  /** Vẽ lại mọi dòng gợi ý theo số dư hiện tại. Gọi được bất cứ lúc nào. */
  async function refreshCostHints() {
    const products = Object.keys(_hintAnchors);
    if (!products.length) return;
    let balance = null;
    try { balance = await getBalance(); } catch (e) { balance = null; }
    for (const p of products) {
      const btn  = _hintAnchors[p];
      const hint = btn && btn._tpwHint;
      if (!hint || !hint.isConnected) continue;
      let cost = null;
      try { cost = await _priceOf(p); } catch (e) { cost = null; }
      // Đọc hụt giá → KHÔNG hiện gì. Cùng luật fail-closed với _priceUnknown:
      // một ô trống thì người ta chờ, một con số đoán thì người ta tin.
      if (cost == null) { hint.style.display = 'none'; hint.innerHTML = ''; continue; }
      hint.style.display = '';
      if (balance == null) {
        hint.className = 'tpw-hint';
        hint.innerHTML = 'Thao tác này tốn <b>' + cost + ' Lượng</b> · ' +
          '<a onclick="TuviPaywall._login()">đăng nhập</a> để xem số dư';
      } else if (balance < cost) {
        hint.className = 'tpw-hint low';
        hint.innerHTML = 'Bạn còn <b>' + balance + ' Lượng</b> · thao tác này tốn <b>' + cost +
          '</b> — thiếu ' + (cost - balance) + ', ' +
          '<a href="/topup.html" onclick="' + _topupClick('hint', cost - balance) + '">nạp thêm →</a>';
      } else {
        hint.className = 'tpw-hint';
        hint.innerHTML = 'Bạn còn <b>' + balance + ' Lượng</b> · thao tác này tốn <b>' + cost + '</b>';
      }
    }
  }

  function _login() {
    if (window.showAuthModal) window.showAuthModal(() => refreshCostHints());
    else if (window.Auth?.require) window.Auth.require(() => refreshCostHints());
  }

  // `window.refreshNavCredits` là tín hiệu "số dư vừa đổi" dùng chung cả site
  // (auth.js gọi sau khi đăng nhập, paywall gọi sau khi trừ). Nối vào đó là có
  // MỘT điểm duy nhất, khỏi rải lời gọi refresh khắp nơi rồi sót chỗ.
  //
  // Dùng accessor chứ không gán đè: thứ tự nạp script giữa các trang KHÔNG
  // giống nhau (có trang auth.js đứng sau paywall) — gán đè thì trang đó mất
  // hook mà không có gì báo.
  let _hooked = false;
  function _hookBalanceRefresh() {
    if (_hooked) return;
    _hooked = true;
    let inner = window.refreshNavCredits;
    try {
      Object.defineProperty(window, 'refreshNavCredits', {
        configurable: true,
        get() {
          return function () {
            try { if (typeof inner === 'function') inner.apply(this, arguments); } catch (e) {}
            refreshCostHints().catch(() => {});
          };
        },
        set(fn) { inner = fn; },
      });
    } catch (e) { /* trình duyệt chặn → vẫn còn lượt refresh theo mốc thời gian */ }
  }

  // ── W2: khoá MỀM tại chỗ, thay hộp thoại chặn màn hình ────────────────
  //
  // Cùng một sự từ chối, hai cảm giác khác hẳn: modal phủ kín màn hình là
  // "cửa đóng"; mấy dòng chữ mờ ngay chỗ kết quả sắp hiện là "sắp lấy được rồi".
  //
  // ⚠️ KHÔNG phát không gì cả — mấy thanh mờ là CHỮ GIẢ, tool vẫn chưa chạy.
  // "Tính thử miễn phí" thật là việc khác (W1 trong backlog), tốn công gấp mấy
  // lần và phải đụng từng tool một.
  //
  // Không tìm được chỗ neo → trả false, nơi gọi rơi về modal như cũ. Đây là
  // lý do không trang nào trong 42 trang gãy vì thay đổi này.
  let _lockEl = null;
  function _closeLock() { if (_lockEl) { _lockEl.remove(); _lockEl = null; } }

  function _softLock(inner) {
    const declared = document.querySelector('[data-tvp-lock]');
    const btn = _hintAnchors[(_cfg && _cfg.product) || ''] || null;
    const after = btn && (btn._tpwHint && btn._tpwHint.isConnected ? btn._tpwHint : btn);
    if (!declared && (!after || !after.parentNode)) return false;
    _css();
    _closeLock();
    _lockEl = document.createElement('div');
    _lockEl.className = 'tpw-lock';
    _lockEl.innerHTML =
      '<div class="tpw-lock-blur" aria-hidden="true">' +
        '<i style="width:96%"></i><i style="width:88%"></i><i style="width:93%"></i>' +
        '<i style="width:70%"></i><i style="width:91%"></i><i style="width:58%"></i>' +
      '</div>' +
      '<div class="tpw-lock-veil">' + inner + '</div>';
    if (declared) declared.appendChild(_lockEl);
    else after.insertAdjacentElement('afterend', _lockEl);
    try { _lockEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    return true;
  }

  // ── W1: tường "ĐÃ tính thử" ──────────────────────────────────────────
  //
  // Khác `_softLock` ở đúng một điểm, và điểm đó là cả W1: `_softLock` là lời
  // TỪ CHỐI (thiếu Lượng / chạm trần) nên mấy thanh mờ sau nó chỉ là chữ giả
  // cho có. Ở đây người dùng CHƯA bị từ chối gì — tool đã chạy thật, phần cấu
  // trúc đã bày ra trên màn hình, và tấm khoá này chỉ đứng trên phần CHỮ.
  //
  // Vì thế nó liệt kê ĐÚNG TÊN những khối đang khoá (`items`) thay vì mấy vạch
  // mờ vô nghĩa: người ta thấy chính xác cái gì còn ở sau tường.
  //
  // Fail-closed y như mọi đường khác: đọc hụt bảng giá → KHÔNG dựng tường, báo
  // "chưa đọc được giá". Dựng một cái tường ghi giá đoán còn tệ hơn không dựng.
  /**
   * B1 — ĐƯỜNG MỜI ngay trên tấm tường, chèn SAU khi tường đã dựng.
   *
   * 🔑 VÌ SAO ĐẶT Ở ĐÂY chứ không ở cuối trang: đây là khoảnh khắc DUY NHẤT
   * người ta đang nhìn thẳng vào danh sách những thứ mình chưa được đọc, nêu
   * đích danh. Vòng tò mò đang mở to nhất thì lời mời mới có sức.
   *
   * 🔑 VÌ SAO KHÔNG DỰNG CƠ CHẾ THƯỞNG MỚI: đo trên prod, thưởng mời (15 Lượng)
   * ĐÃ BẰNG ĐÚNG giá tool này (15) ⇒ **mời 1 người = đúng 1 lượt**. Phần thưởng
   * vốn đã đủ; cái thiếu là không ai biết, và nó chưa bao giờ xuất hiện đúng
   * lúc người ta thèm. Thêm một loại voucher nữa chỉ là dựng lại thứ đã có.
   *
   * ⚠️ CÂU CHỮ PHẢI ĐÚNG SỰ THẬT: thưởng chỉ về khi người được mời **ĐĂNG KÝ**,
   * không phải khi bấm gửi link. CẤM viết "mời 1 người → mở NGAY" — đó là hứa
   * hụt, và hứa hụt ở đúng bậc cuối phễu là chỗ đắt nhất để mất niềm tin.
   *
   * KHÔNG hiện gì khi: chưa đăng nhập (không có mã) · thưởng = 0 · đã chạm trần
   * mời trong 30 ngày · **hoặc số dư đã đủ trả** (còn tiền thì để người ta mua,
   * chen lời mời vào đó chỉ làm chậm một lượt đã bán được).
   */
  // `from`: 'lock' = tường tính thử (`lockPreview`) · 'thieu' = tường TỪ CHỐI
  // ("Còn thiếu N Lượng"). Tách nguồn vì hai chỗ hỏng theo hai kiểu khác nhau —
  // gộp lại thì lúc `invite_shown` ra số cũng không biết tường nào đang chạy.
  async function _inviteRow(veil, product, cost, balance, from) {
    try {
      if (!veil || !document.body.contains(veil)) return;
      if (balance == null || (cost > 0 && balance >= cost)) return;

      const s = window.Auth && window.Auth.getSession && window.Auth.getSession();
      const tk = (s && s.access_token) || null;
      if (!tk) return;

      const r = await fetch('/api/payment?action=my-referral&tool=' + encodeURIComponent(product), {
        headers: { Authorization: 'Bearer ' + tk },
      });
      const d = await r.json();
      if (!d || !d.code) return;
      // Tường có thể đã bị gỡ trong lúc chờ mạng (người dùng bấm mở, hoặc quay
      // về form) — chèn vào một node mồ côi là hiện một thẻ trôi nổi.
      if (!document.body.contains(veil)) return;

      const reward = Number(d.rewardPerInvite) || 0;
      const capLeft = Math.max(0, (Number(d.cap) || 0) - (Number(d.rewardedRecent) || 0));
      if (reward <= 0 || capLeft <= 0) return;

      const need = Math.max(0, cost - balance);
      const invites = Math.ceil(need / reward);
      // Cần nhiều lượt hơn trần còn lại thì KHÔNG hứa — nói con số không với tới
      // được cũng là một kiểu hứa hụt.
      if (invites > capLeft) return;

      const url = window.location.origin + '/app/' + product +
        '?ref=' + encodeURIComponent(d.code) +
        '&utm_source=invite&utm_medium=referral&utm_campaign=' + encodeURIComponent(product);

      const box = document.createElement('div');
      box.className = 'tpw-inv';
      box.innerHTML =
        '<div class="tpw-inv-d">Chưa muốn nạp? <b>Mời ' + invites + ' người</b> — ' +
          'bạn ấy <b>đăng ký</b> là bạn được <b>+' + invites * reward + ' Lượng</b>, ' +
          'vừa đủ mở đúng bản này.</div>' +
        '<div class="tpw-inv-row">' +
          '<input class="tpw-inv-in" readonly value="' + _esc(url) + '">' +
          '<button class="tpw-inv-b" type="button">Chép link mời</button>' +
        '</div>';
      veil.appendChild(box);

      try {
        if (window.Track) window.Track.event('invite_shown', { tool_id: product, meta: { from: from || 'lock', invites: invites } });
      } catch (e) { /* đo hỏng không được chặn gì */ }

      const inp = box.querySelector('.tpw-inv-in');
      box.querySelector('.tpw-inv-b').addEventListener('click', function (e) {
        const b = e.currentTarget;
        const done = function () {
          b.textContent = 'Đã chép ✓';
          setTimeout(function () { b.textContent = 'Chép link mời'; }, 1600);
        };
        try { inp.select(); } catch (e2) { /* ignore */ }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(done, function () {
            try { document.execCommand('copy'); done(); } catch (e3) { /* ignore */ }
          });
        } else {
          try { document.execCommand('copy'); done(); } catch (e3) { /* ignore */ }
        }
        try {
          if (window.Track) window.Track.event('cta_click', { tool_id: product, meta: { from: 'lock_invite' } });
        } catch (e4) { /* ignore */ }
      });
    } catch (e) {
      // Lời mời hỏng KHÔNG được kéo theo tấm tường — tường là đường bán hàng.
    }
  }

  async function lockPreview(o) {
    const host = o && o.host;
    if (!host) return false;
    _css();
    _closeLock();

    const product = (_cfg && _cfg.product) || '';
    let cost = null;
    try { cost = await _priceOf(product); } catch (e) { cost = null; }
    if (cost == null) { _priceUnknown(); return false; }
    let balance = null;
    try { balance = await getBalance(); } catch (e) { balance = null; }

    let money;
    if (balance == null) {
      // Khách CHƯA đăng nhập: bấm nút là trả tiền và đọc luôn (guest checkout,
      // xem `requireCredits` — tự mở một phiên ẩn danh, KHÔNG đăng ký, KHÔNG
      // quà chào mừng vì chưa phải tài khoản thật). Đường lùi "Đăng nhập" dành
      // riêng cho ai ĐÃ có tài khoản/số dư từ trước — thiếu link này thì họ bị
      // đẩy vào một phiên ẩn danh MỚI (0 Lượng) thay vì số dư thật đang có.
      // 🔴 PHẢI NÓI GIÁ ở đây (hard paywall 2026-09-06). Bản cũ chỉ viết "bấm
      // mở là trả tiền và đọc ngay" — với khách đã đăng nhập thì nhánh dưới có
      // con số, còn khách VÔ DANH (đúng nhóm đến từ quảng cáo, và nay là nhóm
      // gặp tường ĐÔNG NHẤT vì hard paywall chặn mọi người) thì bị mời "trả
      // tiền" mà không biết bao nhiêu. Giá đọc từ `tool_pricing` như mọi chỗ
      // khác; đọc hụt thì hàm này đã dừng từ trên (`_priceUnknown`), nên tới
      // được đây là chắc chắn có số thật, không phải số đoán.
      money = 'Mở đầy đủ tốn <b>' + cost + ' Lượng</b> · bấm mở là trả tiền và đọc ngay, ' +
        'không cần đăng ký trước. <a onclick="TuviPaywall._login()">Đã có tài khoản? Đăng nhập</a>';
    } else if (balance < cost) {
      money = 'Bạn còn <b>' + balance + '</b> · cần <b>' + cost + '</b> — thiếu ' + (cost - balance) +
        ', <a href="/topup.html" onclick="' + _topupClick('preview', cost - balance) + '">nạp thêm →</a>';
    } else {
      money = 'Bạn còn <b>' + balance + ' Lượng</b> · mở đầy đủ tốn <b>' + cost + '</b>';
    }

    const items = (o.items || []).map((t) => '<li>' + _esc(t) + '</li>').join('');

    _lockEl = document.createElement('div');
    _lockEl.className = 'tpw-lock tpw-prev';
    _lockEl.innerHTML =
      '<div class="tpw-lock-blur" aria-hidden="true">' +
        '<i style="width:96%"></i><i style="width:88%"></i><i style="width:93%"></i>' +
        '<i style="width:70%"></i><i style="width:91%"></i><i style="width:58%"></i>' +
      '</div>' +
      '<div class="tpw-lock-veil">' +
        '<div class="tpw-lock-t">' + _esc(o.title || 'Bản luận đầy đủ') + '</div>' +
        (items ? '<ul class="tpw-prev-list">' + items + '</ul>' : '') +
        '<div class="tpw-lock-s">' + money + '</div>' +
        '<button class="tpw-btn topup" type="button">' + _esc(o.cta || 'Mở bản đầy đủ') + '</button>' +
      '</div>';
    host.appendChild(_lockEl);

    // Đo lượt tường HIỆN — bậc trước cả "bấm mở" của phễu. Thiếu dòng này thì
    // không tính được tỉ lệ tường-hiện → bấm-mở (0 chỗ nào bắn preview_shown
    // trước khi có dòng này, dù type đã nằm sẵn trong allowlist api/track).
    try { if (window.Track) window.Track.event('preview_shown', { tool_id: product, meta: { from: 'wall' } }); } catch (e) { /* đo hỏng không được chặn hiện tường */ }

    // Nút dùng listener chứ không phải chuỗi onclick: nó phải giữ được closure
    // `onUnlock` của trang. Đường trả tiền vẫn là `requireCredits` như cũ —
    // W1 KHÔNG mở thêm đường nào để lấy phần chữ.
    const slug = typeof o.slug === 'function' ? o.slug() : o.slug || '';
    const runUnlock = function () { return o.onUnlock(); };
    const btn = _lockEl.querySelector('button.tpw-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        // D1 — bậc "bấm mở" của phễu theo tool. Đặt Ở ĐÂY chứ không ở từng
        // trang: mọi tool dựng tường qua hàm này là tự có bậc đó, không phải
        // nhớ rải thêm một lời gọi mỗi lần thêm tool.
        try {
          if (window.Track) window.Track.event('unlock_click', { tool_id: product, meta: { cost: cost } });
        } catch (e) { /* đo hỏng không được chặn lượt mua */ }
        requireCredits(slug, runUnlock);
      });
    }

    // Vừa quay về từ một lượt nạp Lượng THÀNH CÔNG cho đúng sản phẩm này (xem
    // `resumeIfPending`) → tự chạy tiếp, khách không phải bấm "Mở bản đầy đủ"
    // lần thứ hai. Đặt SAU khi đã wire nút — nếu resume thất bại (đoán hụt,
    // hết hạn) thì tường vẫn đứng nguyên, bấm tay vẫn hoạt động bình thường.
    resumeIfPending(slug, runUnlock);

    // B1 — chèn SAU khi tường đã dựng và KHÔNG `await`: lời mời phải là phần
    // cộng thêm, không được đứng chắn giữa người dùng và tấm tường. Mạng chậm
    // hay `my-referral` hỏng thì tường vẫn hiện đủ và đúng như cũ.
    void _inviteRow(_lockEl.querySelector('.tpw-lock-veil'), product, cost, balance, 'lock');
    return true;
  }

  // ── Khoá theo TỪNG PHẦN — dùng cho tool nhiều mục (luận giải/bát tự/xem
  // tuổi): mỗi phần free đã tính sẵn thường CÒN kèm một đoạn luận riêng do AI
  // viết, nhưng đoạn đó nằm ẩn sau ĐÚNG MỘT banner mở khoá ở đầu trang. Cuộn
  // qua khỏi banner là quên mất có phần trả tiền — người dùng chỉ còn thấy nút
  // "Hỏi trợ lý" (rail, miễn phí) cạnh đó nên bấm nhầm sang đó.
  //
  // `sectionLockHtml` trả một khối NHỎ (một dòng, cỡ ngang nút `.ask` cạnh nó)
  // để nhét vào MỖI phần đang khoá — không phải một bức tường như `lockPreview`.
  // Mặc định `display:none`: trang tự biết lúc nào phần đó ĐÃ khoá (sau khi
  // gọi API kiểm tra quyền truy cập) rồi mới bật hiện, tránh loé chữ "chưa mở"
  // rồi biến mất ngay nếu hoá ra đã có cache.
  // `o.part` (số) → khoá-mini này mở ĐÚNG MỘT phần, không phải cả tool. Giá
  // hiện ra đọc `credits_per_part` (qua `data-tvp-price-part`) thay vì
  // `credits` (`data-tvp-price`) — hai thuộc tính khác nhau, ToolPrices.fillSlots
  // tự phân biệt. `wireSectionLocks` đọc lại `data-tpw-part` để biết gọi
  // `onUnlock` cho phần nào; KHÔNG có `o.part` thì hành vi y hệt trước đây
  // (mở cả tool), mọi tool đơn-phần đang dùng chung không đổi gì.
  function sectionLockHtml(o) {
    o = o || {};
    const id = o.id ? ' id="' + _esc(o.id) + '"' : '';
    const part = o.part != null ? ' data-tpw-part="' + Number(o.part) + '"' : '';
    const label = o.label || 'AI luận sâu phần này';
    const cta = o.cta || 'Mở bản đầy đủ';
    const product = _esc(o.product || (_cfg && _cfg.product) || '');
    const priceAttr = o.part != null ? 'data-tvp-price-part' : 'data-tvp-price';
    return '<div class="tpw-seclock"' + id + part + ' data-tpw-seclock role="button" tabindex="0">' +
      '<span class="tpw-seclock-i" aria-hidden="true">✦</span>' +
      '<span class="tpw-seclock-t">' + _esc(label) + '</span>' +
      '<span class="tpw-seclock-p">' + _esc(cta) +
        (product ? ' · <span ' + priceAttr + '="' + product + '">…</span> Lượng' : '') + ' →</span>' +
    '</div>';
  }

  // Đo lượt khoá-mini THỰC SỰ HIỆN RA cho người dùng — khác `unlock_click`
  // (bấm). CSS mặc định `.tpw-seclock{display:none}`, trang tự bật bằng
  // `el.style.display='flex'` khi biết chắc phần đó chưa mở (`_paintSecLocks`
  // ở luan-giai, tương tự ở các trang khác) — nên "đã dựng trong DOM" KHÔNG
  // chứng minh "đã hiện"; phải đọc computed style. `MutationObserver` bắt cả
  // lượt bật SAU (đổi ngày sinh → renderLuan tính lại, `innerHTML` thay mới)
  // mà không cần trang nào gọi tay. Đếm 1 lần/phần tử qua `seen` — sửa ngày
  // sinh dựng lại DOM thì các phần tử CŨ (đã tính) tự rụng khỏi WeakSet, phần
  // tử MỚI được quét lại từ đầu, đúng ý "hiện lại thì tính lại lượt hiện".
  //
  // ⚠️ `_paintSecLocks(true)` (tool nhiều phần, vd Chu Trình Cuộc Đời) bật
  // display CẢ 11 phần trong MỘT vòng lặp đồng bộ — không debounce thì mỗi
  // phần tử bắn RIÊNG một preview_shown, biến MỘT lượt tường-hiện thành 11
  // (đo được: 764 event / 47 người ở 48h đầu chạy ads). Gộp mọi phần tử mới
  // lộ ra trong CÙNG một tick thành đúng MỘT event, giữ số lượng thật ở
  // `meta.count` để không mất thông tin.
  function _watchSecShown(root) {
    const seen = new WeakSet();
    let pending = 0, flushTimer = null;
    const flush = () => {
      flushTimer = null;
      if (pending <= 0) return;
      const n = pending; pending = 0;
      try {
        if (window.Track) window.Track.event('preview_shown', { tool_id: (_cfg && _cfg.product) || '', meta: { from: 'section', count: n } });
      } catch (e) { /* đo hỏng không được chặn hiện tường */ }
    };
    const scan = () => {
      root.querySelectorAll('[data-tpw-seclock]').forEach((el) => {
        if (seen.has(el) || getComputedStyle(el).display === 'none') return;
        seen.add(el);
        pending++;
      });
      if (pending > 0 && !flushTimer) flushTimer = setTimeout(flush, 0);
    };
    scan();
    new MutationObserver(scan).observe(root, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true });
  }

  // Gắn ĐÚNG MỘT listener uỷ quyền cho mọi `[data-tpw-seclock]` trong `root`,
  // kể cả phần chèn thêm SAU (ví dụ lúc mở khoá và render nốt các phần còn
  // lại) — không phải tìm-và-gắn-tay từng khối mỗi lần `innerHTML` đổi.
  // Gọi lại nhiều lần an toàn (trang có thể tính lại toàn bộ kết quả khi sửa
  // ngày sinh) nhờ cờ `_tpwSecWired` neo vào chính `root`.
  // `onUnlock(part)` — `part` là số của khối vừa bấm nếu nó khai `o.part` lúc
  // dựng (`sectionLockHtml`), hoặc `undefined` (mở cả tool, hành vi CŨ giữ
  // nguyên) nếu không. Callback cũ khai `function(){...}` (0 tham số) không
  // bị ảnh hưởng — JS bỏ qua tham số thừa.
  function wireSectionLocks(root, onUnlock) {
    if (!root || root._tpwSecWired) return;
    root._tpwSecWired = true;
    _watchSecShown(root);
    const trigger = (e) => {
      const box = e.target.closest('[data-tpw-seclock]');
      if (!box || !root.contains(box)) return;
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (e.type === 'keydown') e.preventDefault();
      const partAttr = box.getAttribute('data-tpw-part');
      const part = partAttr != null ? Number(partAttr) : undefined;
      // Cùng bậc "bấm mở" của phễu theo tool như `lockPreview` — chỉ khác
      // nguồn (`from:'section'`) để tách đếm được xem người ta bấm mở từ
      // banner đầu trang hay từ chính trong lòng một phần.
      try {
        if (window.Track) window.Track.event('unlock_click', { tool_id: (_cfg && _cfg.product) || '', meta: { from: 'section', part: part } });
      } catch (err) { /* đo hỏng không được chặn lượt mua */ }
      onUnlock(part);
    };
    root.addEventListener('click', trigger);
    root.addEventListener('keydown', trigger);
  }

  // Chuỗi onclick dùng chung cho mọi nút nạp — trước đây chép tay ở 2 chỗ và
  // đã lệch nhau (chỗ đóng modal, chỗ không).
  function _topupClick(from, need) {
    return "try{window.Track&&window.Track.event&&window.Track.event('topup_start'," +
      "{meta:{from:'" + from + "'" + (need != null ? ',need:' + need : '') + "}})}catch(e){};" +
      'TuviPaywall._close();TuviPaywall._closeLock()';
  }

  // ── Insufficient ──────────────────────────────────────────────
  function _insufficient(cost, balance, slug) {
    const need = cost - balance;
    // Ghi Ý ĐỊNH trước khi khách rời trang đi nạp — xem `resumeIfPending`.
    // `returnUrl` chụp CHÍNH XÁC url hiện tại (kể cả birth params trên URL nếu
    // trang đó dùng) để quay lại đúng chỗ, không phải trang tool trần.
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({
        product: (_cfg && _cfg.product) || '',
        slug: slug || '',
        need, cost,
        returnUrl: location.href,
        ts: Date.now(),
      }));
    } catch (e) { /* sessionStorage đầy/bị chặn — vẫn hiện tường như cũ, chỉ mất phần tự-quay-lại */ }
    const shown =
      _softLock(
        '<div class="tpw-lock-t">⊙ Còn thiếu ' + need + ' Lượng</div>' +
        '<div class="tpw-lock-s">Bạn còn <b>' + balance + '</b> · thao tác này tốn <b>' + cost + '</b>' +
        '<br>Nạp thêm là mở ra ngay.</div>' +
        '<a class="tpw-btn topup" href="/topup.html" onclick="' + _topupClick('paywall', need) + '">Nạp Lượng →</a>' +
        '<button class="tpw-lock-x" onclick="TuviPaywall._closeLock()">Để sau</button>'
      );
    if (shown) {
      refreshCostHints().catch(() => {});
      // B1 — lời mời phải có ở CẢ tấm tường TỪ CHỐI này, không riêng
      // `lockPreview`.
      //
      // 🔴 Thiếu chỗ này là vì sao `invite_shown` = 0 suốt từ lúc ship: người
      // hết Lượng gặp HAI tấm tường, mà lời mời chỉ nằm ở một. Đường
      // khoá-theo-phần (`wireSectionLocks` → `onUnlock` → `requireCredits` →
      // đây) KHÔNG bao giờ đi qua `lockPreview` — mà đó đúng là đường của
      // `luan-giai`, tool đắt nhất và cũng là chỗ người ta hay hết Lượng nhất.
      //
      // Ở đây `balance < cost` là ĐỊNH NGHĨA của tấm tường, nên điều kiện im
      // lặng "số dư đã đủ trả" tự thoả — không phải nới luật nào.
      void _inviteRow(
        _lockEl && _lockEl.querySelector('.tpw-lock-veil'),
        (_cfg && _cfg.product) || '',
        cost,
        balance,
        'thieu',
      );
      return;
    }
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Không đủ Lượng</div><div class="tpw-hd-s">Cần thêm ' + need + ' lượng</div></div>' +
      '<div class="tpw-center">' +
        '<div class="tpw-msg">Số dư: <strong>' + balance + ' lượng</strong> · Cần: <strong>' + cost + ' lượng</strong><br>' +
        '<span style="font-size:12px;color:#999">Nạp thêm credits để tiếp tục.</span></div>' +
        '<a class="tpw-btn topup" href="/topup.html" onclick="' + _topupClick('paywall', need) + '">Nạp Credits →</a>' +
      '</div>' +
      '<div class="tpw-ft"><button class="tpw-btn cancel" onclick="TuviPaywall._close()">Đóng</button></div>'
    );
  }

  // ── Banner ────────────────────────────────────────────────────
  function _banner(msg) {
    const o = document.getElementById('_tpw_banner');
    if (o) o.remove();
    const el = document.createElement('div');
    el.id = '_tpw_banner'; el.className = 'tpw-banner'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = '0'; }, 2500);
    setTimeout(() => el.remove(), 3100);
  }

  // ── Slug generator ────────────────────────────────────────────
  function generateToolSlug(product) {
    const uid = (window.Auth?.getUser()?.id || 'g').slice(0, 8);
    return product + '-' + uid + '-' + Date.now();
  }

  // ── MAIN: requireCredits ──────────────────────────────────────
  async function requireCredits(slug, callback) {
    _css();
    _closeLock();  // lượt bấm mới → gỡ tấm khoá mềm của lượt trước

    // 1. Login check — use window.Auth from auth.js
    if (!window.Auth?.isLoggedIn()) {
      // Guest checkout: thử mở một phiên ẨN DANH âm thầm trước — khách chỉ
      // muốn trả tiền đọc MỘT lần không nên bị chặn bởi màn hình đăng ký. Chưa
      // bật "Allow anonymous sign-ins" ở Supabase (hoặc lỗi mạng) thì hàm này
      // trả `false`, rơi thẳng về đường cũ bên dưới — không có gì để hỏng.
      const anon = window.Auth?.signInAnonymously ? await window.Auth.signInAnonymously() : false;
      if (anon) { await requireCredits(slug, callback); return; }
      if (window.showAuthModal) {
        window.showAuthModal(async () => { await requireCredits(slug, callback); });
      } else if (window.Auth?.require) {
        window.Auth.require(async () => { await requireCredits(slug, callback); });
      } else {
        alert('Vui lòng đăng nhập để tiếp tục.');
      }
      return;
    }

    const userId  = window.Auth.getUser()?.id || '';
    const token   = await _freshToken();

    if (!token) {
      alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      window.Auth?.signOut?.();
      return;
    }

    // 2. Giá — chưa biết thì DỪNG. Bỏ hộp thoại xác nhận rồi nên con số trên
    // nút là thứ cuối cùng người dùng đọc; chạy tiếp bằng một giá đoán là trừ
    // Lượng cho một mức họ chưa từng nhìn thấy.
    const { cost, title } = await _price();
    if (cost == null) { _priceUnknown(); return; }

    // 3. Re-access check (same slug = already paid)
    if (slug) {
      try {
        const r = await fetch('/api/payment?action=check&slug=' + encodeURIComponent(slug) + '&userId=' + encodeURIComponent(userId));
        const d = await r.json();
        if (d.hasAccess) { await callback(); return; }
      } catch(e) {}
    }

    // 4. Balance check
    let balance = 0;
    try {
      const r = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
      const d = await r.json();
      balance = d.balance ?? 0;
    } catch(e) {}

    if (balance < cost) { _insufficient(cost, balance, slug); return; }

    // 5. Trừ → callback. KHÔNG hỏi xác nhận: giá đã ghi sẵn trên chính nút bấm
    // và trong danh sách công cụ (và cả hai nay đọc từ `tool_pricing`, xem
    // _fillPriceSlots) — hộp thoại chỉ lặp lại con số người dùng vừa đọc.
    // Hộp thoại DUY NHẤT còn giữ là lúc KHÔNG ĐỦ Lượng (_insufficient, ở trên)
    // và lúc chạm trần lượt tặng (_capReached) — hai ca người dùng cần biết vì
    // sao không chạy được và đi đâu để nạp.
    try {
      const res = await fetch('/api/payment?action=deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          amount: cost,
          product: _cfg?.product || '',
          toolType: TOOL_TYPE[_cfg?.product] || ('use_' + (_cfg?.product || 'unknown')),
          slug: slug || '',
          description: title,
        }),
      });
      const data = await res.json();

      if (data.success || data.alreadyPaid) {
        window.refreshNavCredits && window.refreshNavCredits();
        _banner('✓ Đã trừ ' + cost + ' lượng · Còn lại ' + (data.balance ?? (balance - cost)) + ' lượng');
        await callback();
        return;
      }
      if (data.insufficientBalance) { _insufficient(cost, balance, slug); return; }
      // Chạm trần lượt dùng thử miễn phí trong ngày (cầu dao ngân sách ảnh
      // free). KHÔNG phải lỗi và KHÔNG mất Lượng — server chặn trước khi trừ
      // — nên nói tử tế, đừng ném alert 'Lỗi:' làm người ta tưởng hỏng.
      if (data.capReached) { _capReached(data.message); return; }
      alert('Lỗi: ' + (data.error || 'Vui lòng thử lại.'));
    } catch(e) {
      alert('Lỗi kết nối: ' + e.message);
    }
  }

  // ── Lượt XEM LẠI miễn phí (2 tool chân dung cache theo lá số) ─────────
  //
  // Hai tool chân dung lưu kết quả theo LÁ SỐ: cùng ngày/tháng/năm + giờ sinh
  // + giới tính thì kết quả y hệt, nên lượt sau chỉ là đọc lại bản đã có,
  // KHÔNG tốn tiền model. Ai đã từng trả cho đúng lá số đó thì xem lại miễn
  // phí — hỏi server trước để khỏi hiện hộp thoại đòi tiền cho một lượt vốn
  // không mất gì.
  //
  // FAIL-CLOSED: mạng lỗi / chưa đăng nhập / server trả lạ → coi như PHẢI trả
  // tiền và đi đường paywall như cũ. Đoán nhầm sang "miễn phí" thì server cũng
  // chặn lại bằng 402, người dùng lãnh một lỗi khó hiểu — thà hỏi tiền rồi
  // server tự bỏ qua còn hơn.
  // Hỏi endpoint xem lượt này có phải XEM LẠI thứ user đã trả tiền không.
  // Tách phần "gửi query" ra khỏi phần "dựng query" vì tool nhận HAI lá số
  // (Duyên Nợ Tiền Kiếp) không mô tả được bằng một object `birth`.
  //
  // ── Token cho mọi lượt gọi có TIỀN ────────────────────────────────────
  // `getSession().access_token` là ẢNH CHỤP: nó trả cả token ĐÃ HẾT HẠN (access
  // token Supabase sống ~1 giờ) nên server 401 với đúng người đang đăng nhập —
  // ở file này 401 nghĩa là trừ tiền hụt, hoặc tệ hơn là tính tiền lần hai.
  // `Auth.getFreshToken()` kiểm hạn và tự xoay trước khi gửi.
  // Rơi về ảnh chụp nếu trình duyệt còn cache bản auth.js cũ (chưa có hàm này).
  async function _freshToken() {
    try {
      if (window.Auth?.getFreshToken) return (await window.Auth.getFreshToken()) || '';
    } catch (e) { /* ignore */ }
    return window.Auth?.getSession()?.access_token || '';
  }

  // FAIL-CLOSED ở mọi nhánh: mạng lỗi / chưa đăng nhập / server trả lạ → coi
  // như PHẢI TRẢ. Đoán nhầm thành "đã trả" là phát không hàng.
  async function _isFreeRerunQ(endpoint, query) {
    try {
      let token = await _freshToken();
      if (!token || !query) return false;
      const url = endpoint + '?action=cache-status&' + query;
      let r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      // 🔴 401 ở ĐÂY là ca đắt nhất của cả file: fail-closed đọc thành "chưa
      // trả" nên người đã mua bị TÍNH TIỀN LẦN HAI cho đúng thứ họ đang xem
      // lại. Token hết hạn không phải câu trả lời "chưa trả" — xoay rồi hỏi lại
      // một lượt trước khi chịu thua.
      if (r.status === 401 && window.Auth?.refresh) {
        const t2 = await window.Auth.refresh().catch(() => null);
        if (t2 && t2 !== token) {
          token = t2;
          r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
        }
      }
      if (!r.ok) return false;
      const d = await r.json();
      return !!(d && d.free);
    } catch (e) { return false; }
  }

  async function _isFreeRerun(endpoint, birth) {
    if (!birth) return false;
    const q =
      'd=' + (birth.day || 0) + '&m=' + (birth.month || 0) + '&y=' + (birth.year || 0) +
      '&h=' + (birth.hourBranch == null ? -1 : birth.hourBranch) +
      '&g=' + (birth.gender === 'nu' ? 'nu' : 'nam') +
      '&lunar=' + (birth.isLunar ? '1' : '0');
    return _isFreeRerunQ(endpoint, q);
  }

  /**
   * Như `requireCredits`, nhưng bỏ qua hộp thoại trừ Lượng khi lượt này là
   * XEM LẠI một lá số người dùng đã trả tiền từ trước.
   * `callback(freeRerun)` — cờ để trang biết mình đang đi đường miễn phí, và
   * quay lại đường trả phí nếu server vẫn đòi (402).
   */
  async function requireCreditsCached(endpoint, birth, slug, callback) {
    return _cachedFlow(_isFreeRerun(endpoint, birth), slug, callback,
      '✓ Bạn đã tạo kết quả cho lá số này — mở lại, không trừ Lượng');
  }

  /**
   * "Lượt này có miễn phí không" — dùng cho luồng W1, nơi trang phải BIẾT
   * TRƯỚC để quyết định dựng tường hay mở thẳng. Cùng một `_isFreeRerunQ` với
   * `requireCreditsCachedQuery`; mở ra thay vì để trang tự hỏi `cache-status`
   * là để hai bên không bao giờ trả lời khác nhau cho cùng một lá số.
   */
  async function isFreeRerun(endpoint, query) {
    return _isFreeRerunQ(endpoint, query);
  }

  /** Bản nhận QUERY tự dựng — cho tool có nhiều hơn một lá số. */
  async function requireCreditsCachedQuery(endpoint, query, slug, callback, banner) {
    return _cachedFlow(_isFreeRerunQ(endpoint, query), slug, callback,
      banner || '✓ Bạn đã tạo kết quả cho cặp lá số này — mở lại, không trừ Lượng');
  }

  async function _cachedFlow(freeP, slug, callback, bannerText) {
    if (await freeP) {
      _css();
      _banner(bannerText);
      await callback(true);
      return;
    }
    return requireCredits(slug, function () { return callback(false); });
  }

  // Dùng lại đúng khung modal của _insufficient (tpw-*) — cùng cảm giác, không
  // đẻ thêm bộ class/CSS riêng cho một thông báo.
  function _capReached(msg) {
    const text = msg || 'Hôm nay số lượt dùng thử miễn phí đã hết. Bạn quay lại vào ngày mai nhé.';
    const topup = '<a class="tpw-btn topup" href="/topup.html" onclick="' + _topupClick('free_cap') + '">Nạp Lượng →</a>';
    if (_softLock(
      '<div class="tpw-lock-t">⊙ Hết lượt tặng hôm nay</div>' +
      '<div class="tpw-lock-s">' + _esc(text) + '<br>Chưa trừ Lượng nào của bạn.</div>' +
      topup +
      '<button class="tpw-lock-x" onclick="TuviPaywall._closeLock()">Để mai</button>'
    )) return;
    _open(
      '<div class="tpw-hd"><div class="tpw-hd-t">⊙ Hết lượt tặng hôm nay</div><div class="tpw-hd-s">Chưa trừ Lượng nào của bạn</div></div>' +
      '<div class="tpw-center">' +
        '<div class="tpw-msg">' + _esc(text) + '</div>' + topup +
      '</div>' +
      '<div class="tpw-ft"><button class="tpw-btn cancel" onclick="TuviPaywall._close()">Để mai</button></div>'
    );
  }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Silent flow (cho chat: trừ ngầm, KHÔNG confirm modal) ─────
  async function _balanceFor(userId) {
    try {
      const r = await fetch('/api/payment?action=balance&userId=' + encodeURIComponent(userId));
      return (await r.json()).balance ?? 0;
    } catch (e) { return 0; }
  }

  // Lấy số dư hiện tại (null nếu chưa đăng nhập)
  async function getBalance() {
    if (!window.Auth?.isLoggedIn()) return null;
    return await _balanceFor(window.Auth.getUser()?.id || '');
  }

  // Gate trước khi gửi: kiểm tra đăng nhập + đủ Lượng (KHÔNG trừ, KHÔNG confirm).
  // reason: 'login' | 'insufficient'. Khi insufficient sẽ tự mở modal nạp.
  async function ensureCredits(opts) {
    opts = opts || {};
    const product = opts.product;
    const cost = opts.cost != null ? opts.cost : await _priceOf(product);
    if (cost == null) { _css(); _priceUnknown(); return { ok: false, reason: 'price_unknown' }; }
    _css();
    if (!window.Auth?.isLoggedIn()) return { ok: false, reason: 'login' };
    const userId = window.Auth.getUser()?.id || '';
    const token  = await _freshToken();
    if (!token) return { ok: false, reason: 'login' };
    const balance = await _balanceFor(userId);
    if (balance < cost) { _insufficient(cost, balance); return { ok: false, reason: 'insufficient', balance }; }
    return { ok: true, balance };
  }

  // Trừ Lượng ngầm (gọi SAU khi có kết quả). Trả { ok, balance }.
  async function deductSilent(opts) {
    opts = opts || {};
    const product = opts.product;
    const cost = opts.cost != null ? opts.cost : await _priceOf(product);
    if (cost == null) return { ok: false, reason: 'price_unknown' };
    if (!window.Auth?.isLoggedIn()) return { ok: false, reason: 'login' };
    const token = await _freshToken();
    if (!token) return { ok: false, reason: 'login' };
    try {
      const res = await fetch('/api/payment?action=deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          amount: cost,
          product: product || '',
          toolType: TOOL_TYPE[product] || ('use_' + (product || 'unknown')),
          slug: '',  // rỗng = luôn trừ (mỗi câu một lần)
          description: PRODUCTS[product]?.title || product || 'Tử Vi Chat',
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.refreshNavCredits && window.refreshNavCredits();
        return { ok: true, balance: data.balance ?? null };
      }
      if (data.insufficientBalance) { _insufficient(cost, data.balance ?? 0); return { ok: false, reason: 'insufficient', balance: data.balance ?? 0 }; }
      return { ok: false, reason: 'error', error: data.error };
    } catch (e) { return { ok: false, reason: 'error', error: e.message }; }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init(config) {
    _cfg = config;
    _css();
    _price().catch(() => {}); // prefetch
    fillPriceSlots().catch(() => {});
    mountCostHints().catch(() => {});
    _hookBalanceRefresh();
    // auth.js khôi phục phiên không đồng bộ với init của trang → lượt vẽ đầu
    // có thể rơi vào nhánh "chưa đăng nhập". Vẽ lại một lượt cho chắc.
    setTimeout(() => { refreshCostHints().catch(() => {}); }, 1500);
  }

  // Badge nhỏ "🔒 Khoá" gắn cạnh tiêu đề một khối đã dựng thật nhưng đang bị
  // làm mờ bằng .tpw-real-lock — dùng chung để nhiều trang không tự vẽ mỗi
  // nơi một kiểu. `mountIcons` (nav.js) phải chạy lại sau khi chèn (span
  // data-icon chỉ tự dựng lúc nạp trang).
  function lockBadge(text) {
    _css();
    return '<span class="tpw-lock-badge"><span class="ic-inline" data-icon="lock"></span>' + (text || 'Khoá') + '</span>';
  }

  /** Tool id của trang này (`init({product})`). null = chưa init.
   *  Có để feedback.js gắn lá phiếu 👍/👎 vào ĐÚNG tool mà paywall vừa tính
   *  tiền — một nguồn, nên không thể lệch giữa "trừ Lượng của tool A" và
   *  "chê tool B". */
  function getProduct() { return (_cfg && _cfg.product) || null; }

  return {
    init, getProduct, requireCredits, requireCreditsCached, requireCreditsCachedQuery,
    generateToolSlug, ensureCredits, deductSilent, getBalance, fillPriceSlots,
    mountCostHints, refreshCostHints, lockPreview, isFreeRerun, lockBadge,
    sectionLockHtml, wireSectionLocks, resumeIfPending,
    _banner, _close, _closeLock, _login,
  };
})();

// Export to global window so cross-script checks (e.g. tu-binh.html line 1537) work
window.TuviPaywall = TuviPaywall;
